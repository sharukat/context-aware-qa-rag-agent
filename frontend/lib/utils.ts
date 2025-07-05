import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Message } from "./typings";
import { Dispatch, RefObject } from "react";
import { Action } from "../hooks/use-generate"; // or wherever Action is defined

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function addAssistantMessage(
  dispatch: Dispatch<Action>,
  service: string
) {
  const assistantMessage: Message = { role: "assistant", content: "", service };
  dispatch({ type: 'ADD_MESSAGE', message: assistantMessage });
}

export function updateLastMessage(
  dispatch: Dispatch<Action>,
  messagesRef: RefObject<Message[]>,
  update: Partial<Message>
) {
  dispatch({
    type: 'SET_MESSAGES',
    messages: messagesRef.current!.map((msg, idx) =>
      idx === messagesRef.current!.length - 1 ? { ...msg, ...update } : msg
    ),
  });
}

export async function streamAndUpdate({
  stream,
  onContent,
  service
}: {
  stream: AsyncIterable<string>;
  onContent: (content: string) => void;
  service: string;
}) {
  let fullContent = "";
  let citations: { title: string, citation: string }[] = [];

  for await (const chunk of stream) {
    let parsed: any;
    try {
      parsed = JSON.parse(chunk);
    } catch {
      parsed = {};
    }

    if (parsed.citations) {
      citations = parsed.citations;
    } else if (parsed.content) {
      fullContent += parsed.content;
      await delay(30);
      onContent(fullContent);
    } else if (service === "rag") {
      fullContent += chunk;
      await delay(30);
      onContent(fullContent);
    }
  }
  return { citations };
}