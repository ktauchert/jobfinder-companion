import type {
  IngestionStatusResponse,
  SourcesResponse,
  StartIngestionRequest,
  StartIngestionResponse,
  StopIngestionResponse,
  UpdateSourceRequest,
} from "@jobfinder/types";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    throw new Error(body?.error?.message ?? `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function fetchSources(): Promise<SourcesResponse> {
  return apiFetch("/api/sources");
}

export function updateSource(key: string, body: UpdateSourceRequest): Promise<SourcesResponse> {
  return apiFetch(`/api/sources/${key}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function fetchIngestionStatus(): Promise<IngestionStatusResponse> {
  return apiFetch("/api/ingest/status");
}

export function startIngestion(body: StartIngestionRequest = {}): Promise<StartIngestionResponse> {
  return apiFetch("/api/ingest/start", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function stopIngestion(): Promise<StopIngestionResponse> {
  return apiFetch("/api/ingest/stop", { method: "POST", body: "{}" });
}
