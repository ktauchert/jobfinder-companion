export interface OllamaChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OllamaClientOptions {
  baseUrl: string;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
}

export class OllamaClient {
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;
  private readonly timeoutMs: number;

  constructor(options: OllamaClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.fetchFn = options.fetchFn ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 120_000;
  }

  async chat(options: {
    model: string;
    messages: OllamaChatMessage[];
    format?: "json";
    temperature?: number;
  }): Promise<string> {
    const response = await this.request("/api/chat", {
      model: options.model,
      messages: options.messages,
      stream: false,
      format: options.format,
      options: { temperature: options.temperature ?? 0 },
    });

    const body = (await response.json()) as { message?: { content?: string } };
    const content = body.message?.content;
    if (!content) {
      throw new Error("Ollama chat returned empty content");
    }
    return content;
  }

  async embed(model: string, input: string | string[]): Promise<number[][]> {
    const response = await this.request("/api/embed", {
      model,
      input,
    });

    const body = (await response.json()) as { embeddings?: number[][] };
    if (!body.embeddings?.length) {
      throw new Error("Ollama embed returned no embeddings");
    }
    return body.embeddings;
  }

  private async request(path: string, body: unknown): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchFn(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (response.status === 404) {
        throw new Error(
          `Ollama model or endpoint not found — run \`ollama pull\` for the configured model`,
        );
      }

      if (!response.ok) {
        throw new Error(`Ollama request failed: HTTP ${response.status}`);
      }

      return response;
    } finally {
      clearTimeout(timer);
    }
  }
}
