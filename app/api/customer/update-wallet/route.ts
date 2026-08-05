import { fail, ok, parseAction, parseAmount, preflight, withLogging } from "@/lib/api";
import { DEFAULT_CUSTOMER_ID, listCustomers, updateWallet } from "@/lib/db";
import type { ActivitySource } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/customer/update-wallet
 * Body: { user_id: string, action: "add" | "set", amount: number, label?: string }
 */
export const POST = withLogging("update-wallet", async (body) => {
  if (!body) return fail("Request body must be valid JSON.", 400);

  const userId = typeof body.user_id === "string" ? body.user_id : DEFAULT_CUSTOMER_ID;
  const action = parseAction(body.action);
  const amount = parseAmount(body.amount);

  if (!action) {
    return fail('`action` must be either "add" or "set".', 400);
  }
  if (amount === undefined) {
    return fail("`amount` must be a finite number.", 400);
  }

  const source: ActivitySource = body.source === "webhook" ? "webhook" : "api";
  const label = typeof body.label === "string" && body.label.trim() ? body.label.trim() : undefined;

  const result = await updateWallet(userId, action, amount, { label, source });
  if (!result) {
    return fail(`Unknown customer id: ${userId}`, 404, {
      available: (await listCustomers()).map((c) => c.id),
    });
  }

  return ok({
    ok: true,
    field: "wallet" as const,
    action,
    previous: result.previous,
    delta: result.delta,
    balance: result.customer.wallet,
    customer: result.customer,
  });
});

export async function OPTIONS() {
  return preflight();
}
