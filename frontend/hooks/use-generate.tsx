import { useReducer, useCallback, useRef, useEffect } from "react";
import { Message, History } from "../lib/typings";
import { addToast } from "@heroui/react";
import { streamMcpAnswer } from '../lib/api';
import { addAssistantMessage, updateLastMessage, streamAndUpdate } from "@/lib/utils";

// State and actions for useReducer
interface State {
  input: string;
  messages: Message[];
  isLoading: boolean;
  history: History[];
  historyIds: Set<string>;
  selectedService: string;
}

export type Action =
  | { type: 'SET_INPUT'; input: string }
  | { type: 'SET_MESSAGES'; messages: Message[] }
  | { type: 'SET_LOADING'; isLoading: boolean }
  | { type: 'SET_HISTORY'; history: History[] }
  | { type: 'SET_HISTORY_IDS'; historyIds: Set<string> }
  | { type: 'RESET_MESSAGES' }
  | { type: 'ADD_MESSAGE'; message: Message }
  | { type: 'SET_SELECTED_SERVICE'; service: string };

const initialState: State = {
  input: "",
  messages: [],
  isLoading: false,
  history: [],
  historyIds: new Set(),
  selectedService: "tools",
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
    case 'SET_SELECTED_SERVICE':
      return { ...state, selectedService: action.service };
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

  const generateAnswer = useCallback(async (currentMessages: Message[], service: string, chatId?: string): Promise<void> => {
    console.log(chatId)
    dispatch({ type: 'SET_LOADING', isLoading: true });
    const lastMessage = currentMessages[currentMessages.length - 1].content;
    try {
      switch (service) {
        case "rag":
          const rag_response = await streamMcpAnswer(lastMessage, "/v1/api/rag",  chatId);

          // Add initial empty message for the role "assistant"
          addAssistantMessage(dispatch, service)

          // Extract the citations and update the message with content while streaming
          const { citations: rag_citations } = await streamAndUpdate({
            stream: rag_response.textStream(),
            onContent: (content: string) => updateLastMessage(dispatch, messagesRef, { content }),
            service: service
          }) as { citations: { title: string; citation: string }[] };

          // Update the message with resource citations
          if (rag_citations && rag_citations.length > 0) {
            updateLastMessage(dispatch, messagesRef, {
              references: rag_citations.map(item => ({
                title: item.title,
                citation: item.citation,
              })),
            });
          }
          break

          case "search":
            const search_response = await streamMcpAnswer(lastMessage, "/v1/api/search", chatId);
  
            // Add initial empty message for the role "assistant"
            addAssistantMessage(dispatch, service)
  
            // Extract the citations and update the message with content while streaming
            const { citations } = await streamAndUpdate({
              stream: search_response.textStream(),
              onContent: (content: string) => updateLastMessage(dispatch, messagesRef, { content }),
              service: service
            }) as { citations: { title: string; citation: string }[] };
  
            // Update the message with resource citations
            if (citations.length > 0) {
              updateLastMessage(dispatch, messagesRef, {
                references: citations.map(item => ({
                  title: item.title,
                  citation: item.citation,
                })),
              });
            }
            break

        case "tools":
          const tool_response = await streamMcpAnswer(lastMessage, "/v1/api/stocks", chatId);

          // Add initial empty message for the role "assistant"
          addAssistantMessage(dispatch, service)

          // Update the message with content while streaming
          await streamAndUpdate({
            stream: tool_response.textStream(),
            onContent: (content: string) => updateLastMessage(dispatch, messagesRef, { content }),
            service: service
          })
          break

        default:
          console.log("Default")
      }

      addToast({ title: "Answer Generation Successful", color: "success" });
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

  const setSelectedService = useCallback((service: string) => {
    dispatch({ type: 'SET_SELECTED_SERVICE', service });
  }, []);

  return {
    ...state,
    dispatch,
    messagesRef,
    generateAnswer,
    addToHistory,
    updateHistory,
    setSelectedService,
  };
};