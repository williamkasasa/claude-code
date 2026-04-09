import type { AppSettings, Message } from "./types";

const getApiUrl = () =>
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export interface StreamChunk {
  type: "text" | "tool_use" | "tool_result" | "done" | "error";
  content?: string;
  tool?: {
    id: string;
    name: string;
    input?: Record<string, unknown>;
    result?: string;
    is_error?: boolean;
  };
  error?: string;
}

export interface ChatRequestSettings
  extends Pick<
    AppSettings,
    | "provider"
    | "apiUrl"
    | "apiKey"
    | "streamingEnabled"
    | "systemPrompt"
    | "temperature"
    | "maxTokens"
  > {}

export async function* streamChat(
  messages: Pick<Message, "role" | "content">[],
  model: string,
  settings: ChatRequestSettings,
  signal?: AbortSignal
): AsyncGenerator<StreamChunk> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages,
      model,
      stream: settings.streamingEnabled,
      settings,
    }),
    signal,
  });

  if (!response.ok) {
    const err = await response.text();
    yield { type: "error", error: err };
    return;
  }

  const contentType = response.headers.get("Content-Type") ?? "";
  if (!contentType.includes("text/event-stream")) {
    const raw = (await response.text()).trim();
    if (!raw) {
      yield { type: "done" };
      return;
    }

    try {
      const payload = JSON.parse(raw) as { type?: StreamChunk["type"]; content?: string; error?: string };
      if (payload.error) {
        yield { type: "error", error: payload.error };
      } else if (payload.type === "text" || typeof payload.content === "string") {
        yield { type: payload.type ?? "text", content: payload.content ?? "" };
      } else {
        yield { type: "text", content: raw };
      }
    } catch {
      yield { type: "text", content: raw };
    }

    yield { type: "done" };
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    yield { type: "error", error: "No response body" };
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6).trim();
          if (data === "[DONE]") {
            yield { type: "done" };
            return;
          }
          try {
            const chunk = JSON.parse(data) as StreamChunk;
            yield chunk;
          } catch {
            // skip malformed chunks
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  yield { type: "done" };
}

export async function fetchHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${getApiUrl()}/health`, { cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}
