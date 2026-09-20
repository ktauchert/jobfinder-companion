import { createServer, type Server } from "node:http";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const fixturesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../adapters/sources/ba/fixtures",
);

export async function startFixtureBaServer(): Promise<{ url: string; close: () => Promise<void> }> {
  const listBody = readFileSync(join(fixturesDir, "jobs-list-v6.json"), "utf8");
  const detailBody = readFileSync(join(fixturesDir, "job-details-v4.json"), "utf8");

  const server: Server = createServer((req, res) => {
    if (req.url?.includes("/pc/v6/jobs")) {
      const page = Number(new URL(req.url, "http://127.0.0.1").searchParams.get("page") ?? "1");
      if (page > 1) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ergebnisliste: [], maxErgebnisse: 2, page }));
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(listBody);
      return;
    }
    if (req.url?.includes("/pc/v4/jobdetails/")) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(detailBody);
      return;
    }
    res.writeHead(404);
    res.end();
  });

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to bind fixture BA server");
  }

  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}
