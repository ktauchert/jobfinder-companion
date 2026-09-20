import { withTimeout } from "../lib/with-timeout.js";

export async function pingOllama(ollamaBaseUrl: string, timeoutMs: number): Promise<boolean> {
  const url = new URL("/api/tags", ollamaBaseUrl);
  const response = await withTimeout(
    fetch(url, { signal: AbortSignal.timeout(timeoutMs) }),
    timeoutMs,
  );
  return response.ok;
}
