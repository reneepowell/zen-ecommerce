import { ok, preflight } from "@/lib/api";
import { storageMode } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/health — reports which storage backend is active.
 *
 * `"memory"` in a serverless deployment means balance writes will be lost when
 * instances recycle; set the Redis env vars to fix it.
 */
export async function GET() {
  const storage = storageMode();
  return ok({
    ok: true,
    storage,
    durable: storage === "redis",
    hint:
      storage === "redis"
        ? "Writes persist across instances and restarts."
        : "In-memory store: fine locally, but writes are lost on serverless instance recycling.",
  });
}

export async function OPTIONS() {
  return preflight();
}
