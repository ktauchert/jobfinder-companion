const BA_BASE = "https://rest.arbeitsagentur.de/jobboerse/jobsuche-service";

export interface BaClient {
  searchJobs(params: URLSearchParams): Promise<unknown>;
  fetchJobDetails(referenznummer: string): Promise<unknown>;
}

export interface BaClientOptions {
  apiKey: string;
  fetchFn?: typeof fetch;
}

export function createBaClient(options: BaClientOptions): BaClient {
  const fetchFn = options.fetchFn ?? fetch;
  const headers = { "X-API-Key": options.apiKey };

  return {
    async searchJobs(params: URLSearchParams): Promise<unknown> {
      const url = `${BA_BASE}/pc/v6/jobs?${params.toString()}`;
      const response = await fetchFn(url, { headers });
      if (!response.ok) {
        throw new Error(`BA search failed: HTTP ${response.status}`);
      }
      return response.json();
    },

    async fetchJobDetails(referenznummer: string): Promise<unknown> {
      const encoded = Buffer.from(referenznummer, "utf8").toString("base64");
      const url = `${BA_BASE}/pc/v4/jobdetails/${encoded}`;
      const response = await fetchFn(url, { headers });
      if (!response.ok) {
        throw new Error(`BA detail failed: HTTP ${response.status}`);
      }
      return response.json();
    },
  };
}
