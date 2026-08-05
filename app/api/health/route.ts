import { ok, preflight } from "@/lib/api";
import { storageMode } from "@/lib/db";
import { jwtConfig, jwtConfigProblem } from "@/lib/zendesk-jwt";

export const dynamic = "force-dynamic";

/**
 * GET /api/health — reports which storage backend is active.
 *
 * `"memory"` in a serverless deployment means balance writes will be lost when
 * instances recycle; set the Redis env vars to fix it.
 */
export async function GET() {
  const storage = storageMode();
  const problem = jwtConfigProblem();

  return ok({
    ok: true,
    storage,
    durable: storage === "redis",
    hint:
      storage === "redis"
        ? "Writes persist across instances and restarts."
        : "In-memory store: fine locally, but writes are lost on serverless instance recycling.",
    zendeskAuth: {
      configured: jwtConfig() !== null,
      // Surfacing the key id is safe (it travels in every JWT header); the
      // secret is never included.
      keyId: process.env.ZENDESK_JWT_KEY_ID?.trim() ?? null,
      problem,
      hint:
        problem ??
        (jwtConfig()
          ? "Visitors are authenticated as the selected demo profile."
          : "Not configured — the widget loads anonymously, so the agent can't identify the customer."),
    },
  });
}

export async function OPTIONS() {
  return preflight();
}
