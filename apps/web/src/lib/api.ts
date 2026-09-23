import type {
  HideJobResponse,
  JobResponse,
  IngestionStatusResponse,
  ProfileResponse,
  SearchJobsQuery,
  SearchJobsResponse,
  SkillsSearchResponse,
  SourcesResponse,
  StartIngestionRequest,
  StartIngestionResponse,
  StopIngestionResponse,
  UpdateProfileRequest,
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

function toSearchParams(query: SearchJobsQuery): string {
  const params = new URLSearchParams();
  if (query.cursor) {
    params.set("cursor", query.cursor);
  }
  if (query.limit != null) {
    params.set("limit", String(query.limit));
  }
  if (query.q) {
    params.set("q", query.q);
  }
  if (query.maxAgeDays != null) {
    params.set("maxAgeDays", String(query.maxAgeDays));
  }
  if (query.includeHidden != null) {
    params.set("includeHidden", String(query.includeHidden));
  }
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
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

export function fetchProfile(): Promise<ProfileResponse> {
  return apiFetch("/api/profile");
}

export function updateProfile(body: UpdateProfileRequest): Promise<ProfileResponse> {
  return apiFetch("/api/profile", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function fetchJob(id: string): Promise<JobResponse> {
  return apiFetch(`/api/jobs/${id}`);
}

export function fetchJobs(query: SearchJobsQuery = {}): Promise<SearchJobsResponse> {
  return apiFetch(`/api/jobs${toSearchParams(query)}`);
}

export function hideJob(id: string): Promise<HideJobResponse> {
  return apiFetch(`/api/jobs/${id}/hide`, { method: "POST", body: "{}" });
}

export function unhideJob(id: string): Promise<HideJobResponse> {
  return apiFetch(`/api/jobs/${id}/hide`, { method: "DELETE" });
}

export function searchSkills(q: string, limit = 8): Promise<SkillsSearchResponse> {
  const params = new URLSearchParams({ q, limit: String(limit) });
  return apiFetch(`/api/skills?${params.toString()}`);
}
