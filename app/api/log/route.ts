import { ok, preflight } from "@/lib/api";
import { readLog } from "@/lib/request-log";

export const dynamic = "force-dynamic";

/**
 * GET /api/log — the last 50 mutation attempts, newest first.
 *
 * The point of this route is to distinguish two failures that look identical
 * from the dashboard: an agent whose requests are being rejected (entries with
 * a 4xx status and the reason) versus an agent that never calls at all (no
 * entries). `userAgent` shows who called; `body` shows exactly what they sent.
 */
export async function GET() {
  const entries = await readLog();
  return ok({
    ok: true,
    count: entries.length,
    hint:
      entries.length === 0
        ? "No mutation requests recorded yet. If your agent should have called, it never reached this app — check the action's URL and whether it actually fired."
        : "Newest first. A 4xx status means the request arrived but was rejected; `result` says why.",
    entries,
  });
}

export async function OPTIONS() {
  return preflight();
}
