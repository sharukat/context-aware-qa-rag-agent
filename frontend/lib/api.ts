import { config } from "./config";

/**
 * Uploads files to the backend.
 */
export async function uploadFiles(files: File[]): Promise<{ message?: string; files?: string[]; count?: number; error?: string }> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append("files", file);
  });

  try {
    const response = await fetch(`${config.API_URL}:8004/v1/file-upload`, {
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
 * Send question to the backend to use stock tools via MCP server tools
 */
export async function streamMcpAnswer(question: string, port: string, endpoint: string, chatId?: string) {
  const response = await fetch(`${config.API_URL}:${port}${endpoint}`, {
    method: "POST",
    mode: "cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, chatId }),
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