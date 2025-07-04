import { useReducer, useCallback, useRef, useEffect } from "react";
import { Message, History } from "../lib/typings";
import { v4 } from 'uuid';
import { addToast } from "@heroui/react";
import { generateHydeText, fetchContext, streamAnswer, streamMcpAnswer } from '../lib/api';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// State and actions for useReducer
interface State {
  input: string;
  messages: Message[];
  isLoading: boolean;
  history: History[];
  historyIds: Set<string>;
}

export type Action =
  | { type: 'SET_INPUT'; input: string }
  | { type: 'SET_MESSAGES'; messages: Message[] }
  | { type: 'SET_LOADING'; isLoading: boolean }
  | { type: 'SET_HISTORY'; history: History[] }
  | { type: 'SET_HISTORY_IDS'; historyIds: Set<string> }
  | { type: 'RESET_MESSAGES' }
  | { type: 'ADD_MESSAGE'; message: Message };

const initialState: State = {
  input: "",
  messages: [],
  isLoading: false,
  history: [],
  historyIds: new Set(),
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_INPUT':
      return { ...state, input: action.input };
    case 'SET_MESSAGES':
      return { ...state, messages: action.messages };
    case 'SET_LOADING':
      return { ...state, isLoading: action.isLoading };
    case 'SET_HISTORY':
      return { ...state, history: action.history };
    case 'SET_HISTORY_IDS':
      return { ...state, historyIds: action.historyIds };
    case 'RESET_MESSAGES':
      return { ...state, messages: [] };
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.message] };
    default:
      return state;
  }
}

/**
 * Custom hook for answer generation, chat state, and history management.
 * Handles user input, message streaming, and chat history.
 */
export const useAnswerGeneration = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const messagesRef = useRef<Message[]>([]);

  useEffect(() => {
    messagesRef.current = state.messages;
  }, [state.messages]);

  const generateAnswer = useCallback(async (currentMessages: Message[], service: string): Promise<void> => {
    dispatch({ type: 'SET_LOADING', isLoading: true });
    const lastMessage = currentMessages[currentMessages.length - 1].content;
    try {
      switch (service) {
        case "rag":
          // HyDE Generation
          const hydeText = await generateHydeText(lastMessage);

          // Context Retrieval
          let context = "No relevant context found.";
          let rag_urls: {title: string, citation: string}[] = [];
          try {
            const contextData = await fetchContext(hydeText);
            context = contextData.context;
            rag_urls = contextData.citations || [];
          } catch {
            addToast({ title: "Failed to get response from server" });
          }

          // LLM Streaming
          const response = streamAnswer({
            messages: state.messages,
            context,
            lastMessage,
          });

          const assistantMessage: Message = { role: "assistant", content: "", service: service };
          dispatch({ type: 'ADD_MESSAGE', message: assistantMessage });

          let fullResponse = "";
          for await (const chunk of response.textStream) {
            fullResponse += chunk;
            await delay(30);
            dispatch({
              type: 'SET_MESSAGES', messages: messagesRef.current.map((msg, index) =>
                index === messagesRef.current.length - 1 ? { ...msg, content: fullResponse } : msg
              )
            });
          }
          console.log(rag_urls)

          // Add references if URLs are available
          if (rag_urls.length > 0) {
            const references = rag_urls.map(item => ({
              title: item.title,
              citation: item.citation
            }));
            
            dispatch({
              type: 'SET_MESSAGES', messages: messagesRef.current.map((msg, index) =>
                index === messagesRef.current.length - 1 ? { ...msg, references } : msg
              )
            });
          }
          break

        case "tools":
          const tool_response = await streamMcpAnswer(lastMessage, "/mcp/stocks");

          const assistMessage: Message = { role: "assistant", content: "", service: service };
          dispatch({ type: 'ADD_MESSAGE', message: assistMessage });

          let full_response = "";
          for await (const chunk of tool_response.textStream()) {
            let parsed: any;
            try {
              parsed = JSON.parse(chunk);
            } catch {
              parsed = {};
            }
            if (parsed.content) {
              full_response += parsed.content;
              await delay(30);
              dispatch({
                type: 'SET_MESSAGES', messages: messagesRef.current.map((msg, index) =>
                  index === messagesRef.current.length - 1 ? { ...msg, content: full_response } : msg
                )
              });
            }
          }

          break
        case "search":
          const search_response = await streamMcpAnswer(lastMessage, "/mcp/search");

          const assist_Message: Message = { role: "assistant", content: "", service: service };
          dispatch({ type: 'ADD_MESSAGE', message: assist_Message });

          let full_Response = "";
          let urls: { title: string, citation: string }[] = [];
          for await (const chunk of search_response.textStream()) {
            let parsed: any;
            try {
              parsed = JSON.parse(chunk);
            } catch {
              parsed = {};
            }

            if (parsed.citations) {
              console.log(parsed.citation)
              urls = parsed.citations;
              // Optionally, update state/UI with URLs here
            } else if (parsed.content) {
              full_Response += parsed.content;
              await delay(30);
              dispatch({
                type: 'SET_MESSAGES', messages: messagesRef.current.map((msg, index) =>
                  index === messagesRef.current.length - 1 ? { ...msg, content: full_Response } : msg
                )
              });
            }
          }

          // Fetch titles for URLs and update the message with references
          if (urls.length > 0) {
            try {
              const references = urls.map(item => ({
                title: item.title,
                citation: item.citation
              }));
              dispatch({
                type: 'SET_MESSAGES', messages: messagesRef.current.map((msg, index) =>
                  index === messagesRef.current.length - 1 ? { ...msg, references } : msg
                )
              });
            } catch (error) {
              console.error('Error fetching titles for URLs:', error);
            }
          }

          console.log("Final URLs:", urls);
          break
        default:
          console.log("Default")
      }

      addToast({ title: "Answer Generation Successful" });
    } catch (error) {
      console.error("Submission error:", error);
    } finally {
      dispatch({ type: 'SET_LOADING', isLoading: false });
      dispatch({ type: 'SET_INPUT', input: "" });
    }
  }, [state.messages]);

  const addToHistory = useCallback((chatId: string) => {
    if (!chatId) return; // Don't add if no chatId
    if (!state.historyIds.has(chatId)) {
      const timestamp = Date.now();
      const id = chatId;
      const messagesItem: History = {
        id,
        input: messagesRef.current[messagesRef.current.length - 2]?.content || "",
        timestamp,
        messages: messagesRef.current,
      };

      dispatch({ type: 'SET_HISTORY', history: [...state.history, messagesItem] });
      dispatch({ type: 'SET_HISTORY_IDS', historyIds: new Set(state.historyIds).add(id) });
    }
    dispatch({ type: 'RESET_MESSAGES' });
  }, [state.historyIds, state.history]);

  const updateHistory = useCallback((activeChatId: string) => {
    const index = state.history.findIndex(item => item.id === activeChatId);
    dispatch({
      type: 'SET_HISTORY', history: state.history.map((item, i) =>
        i === index ? {
          ...item,
          input: messagesRef.current[messagesRef.current.length - 2].content,
          messages: messagesRef.current,
          timestamp: Date.now(),
        } : item
      )
    });
  }, [state.history]);

  return {
    ...state,
    dispatch,
    messagesRef,
    generateAnswer,
    addToHistory,
    updateHistory,
  };
};