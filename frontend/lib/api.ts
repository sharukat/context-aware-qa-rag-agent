import { Message } from "./typings";
import { config } from "./config";
import { createGroq } from '@ai-sdk/groq';
import { generateText, streamText } from 'ai';

const groq = createGroq({ apiKey: config.GROQ_API_KEY });

/**
 * Uploads files to the backend.
 */
export async function uploadFiles(files: File[]): Promise<{ message?: string; files?: string[]; count?: number; error?: string }> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append("files", file);
  });

  try {
    const response = await fetch(`${config.API_URL}/api/upload`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || `HTTP error! Status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Fetches context for a given question from the backend.
 */
export async function fetchContext(question: string, signal?: AbortSignal): Promise<{context: string, urls?: {title: string, url: string}[]}> {
  const response = await fetch(`${config.API_URL}/api/getdocuments`, {
    method: "POST",
    mode: "cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
    signal,
  });
  if (!response.ok) throw new Error("Failed to fetch context");
  const data = await response.json();
  if (data.response) {
    return {
      context: data.response,
      urls: data.urls || []
    };
  }
  throw new Error("No relevant context found");
}

/**
 * Send question to the backend to use stock tools via MCP server tools
 */
export async function streamMcpAnswer(question: string, endpoint: string) {
  const response = await fetch(`${config.API_URL}${endpoint}`, {
    method: "POST",
    mode: "cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  if (!response.ok) throw new Error("Failed to generate the response");
  if (!response.body) throw new Error("No response body");
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');

  return {
    async *textStream() {
      let partial = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        partial += decoder.decode(value, { stream: true });
        let parts = partial.split('\n\n');
        partial = parts.pop() || '';
        for (const part of parts) {
          if (part.startsWith('data:')) {
            // Yield the raw JSON string for parsing in the hook
            yield part.replace('data: ', '').replace('data:', '');
          }
        }
      }
      if (partial) yield partial;
    }
  };
}

/**
 * Generates a HyDE (Hypothetical Document Embeddings) answer for a question.
 */
export async function generateHydeText(question: string): Promise<string> {
  const hyde = await generateText({
    model: groq('llama-3.3-70b-versatile'),
    temperature: 0,
    system: `You are an expert in question answering.\nImagine you are given the resource mentioned within the question.Provide a concise answer assuming you are provided with the mentioned document.`,
    prompt: `Question:\n${question}`,
  });
  return hyde.text;
}

/**
 * Streams an answer from the LLM based on the conversation and context.
 */
export function streamAnswer({
  messages,
  context,
  lastMessage,
}: {
  messages: Message[],
  context: string,
  lastMessage: string,
}) {
  const model = groq('llama-3.3-70b-versatile');
  return streamText({
    model,
    temperature: 0,
    maxRetries: 5,
    system: `You are an expert in question answering.\nFirst, analyze the question carefully and think step by step.\nProvide accurate, factual answers based only on the context information.\nIf unsure about any details, clearly state that information might be inaccurate.`,
    prompt: `Current conversation:\n${JSON.stringify(messages)}\n\nContext:\n${context}\n\nQuestion:\n${lastMessage}`,
  });
}

// Add more API functions as needed, e.g., for answer generation 