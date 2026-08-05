import { Redis } from "@upstash/redis";

/**
 * Records every mutation attempt so you can tell "my AI agent isn't working"
 * apart from "my AI agent never called the API".
 *
 * Without this, a silent agent and a broken endpoint look identical from the
 * dashboard: the balance just doesn't change. Reads back via GET /api/log.
 */
const LOG_KEY = "zen:requests:v1";
const MAX_ENTRIES = 50;

export interface LogEntry {
  at: string;
  route: string;
  status: number;
  userAgent: string;
  /** Raw request body, so a wrong field name is visible rather than guessed at. */
  body: string;
  result: string;
}

function client(): Redis | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

const memoryLog: LogEntry[] = [];

export async function logRequest(entry: LogEntry): Promise<void> {
  const redis = client();
  if (!redis) {
    memoryLog.unshift(entry);
    memoryLog.length = Math.min(memoryLog.length, MAX_ENTRIES);
    return;
  }
  try {
    // Newest first, trimmed — the log is a debugging aid, not an audit trail.
    await redis.lpush(LOG_KEY, JSON.stringify(entry));
    await redis.ltrim(LOG_KEY, 0, MAX_ENTRIES - 1);
  } catch (error) {
    console.error("[log] write failed:", error);
  }
}

export async function readLog(): Promise<LogEntry[]> {
  const redis = client();
  if (!redis) return memoryLog;
  try {
    const raw = await redis.lrange<string | LogEntry>(LOG_KEY, 0, MAX_ENTRIES - 1);
    return raw.map((item) => (typeof item === "string" ? JSON.parse(item) : item));
  } catch (error) {
    console.error("[log] read failed:", error);
    return [];
  }
}
