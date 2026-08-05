import { fail, ok, parseAction, parseAmount, preflight, readJson } from "@/lib/api";
import { DEFAULT_CUSTOMER_ID, listCustomers, updatePoints } from "@/lib/db";
import type { ActivitySource } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/customer/update-points
 * Body: { user_id: string, action: "add" | "set", points: number, label?: string }
 */
export async function POST(request: Request) {
  const body = await readJson(request);
  if (!body) return fail("Request body must be valid JSON.", 400);

  const userId = typeof body.user_id === "string" ? body.user_id : DEFAULT_CUSTOMER_ID;
  const action = parseAction(body.action);
  const points = parseAmount(body.points);

  if (!action) {
    return fail('`action` must be either "add" or "set".', 400);
  }
  if (points === undefined) {
    return fail("`points` must be a finite number.", 400);
  }

  const source: ActivitySource = body.source === "webhook" ? "webhook" : "api";
  const label = typeof body.label === "string" && body.label.trim() ? body.label.trim() : undefined;

  const result = updatePoints(userId, action, points, { label, source });
  if (!result) {
    return fail(`Unknown customer id: ${userId}`, 404, {
      available: listCustomers().map((c) => c.id),
    });
  }

  return ok({
    ok: true,
    field: "points" as const,
    action,
    previous: result.previous,
    delta: result.delta,
    balance: result.customer.points,
    customer: result.customer,
  });
}

export async function OPTIONS() {
  return preflight();
}
