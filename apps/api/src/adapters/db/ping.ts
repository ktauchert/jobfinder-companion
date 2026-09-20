import postgres from "postgres";

import { withTimeout } from "../lib/with-timeout.js";

export async function pingDatabase(databaseUrl: string, timeoutMs: number): Promise<boolean> {
  const sql = postgres(databaseUrl, {
    max: 1,
    connect_timeout: Math.ceil(timeoutMs / 1000),
    idle_timeout: 1,
  });
  try {
    await withTimeout(sql`select 1`, timeoutMs);
    return true;
  } finally {
    await sql.end({ timeout: 1 });
  }
}
