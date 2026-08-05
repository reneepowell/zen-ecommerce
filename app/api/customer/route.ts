import { fail, ok, preflight } from "@/lib/api";
import {
  DEFAULT_CUSTOMER_ID,
  POINTS_GOAL,
  VIP_SPEND_GOAL,
  getCustomer,
  listCustomers,
} from "@/lib/db";

export const dynamic = "force-dynamic";

/** GET /api/customer?id=carol_foster — omit `id` to get the default profile. */
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id") ?? DEFAULT_CUSTOMER_ID;
  const customer = await getCustomer(id);

  if (!customer) {
    return fail(`Unknown customer id: ${id}`, 404, {
      available: (await listCustomers()).map((c) => c.id),
    });
  }

  return ok({
    ok: true,
    customer,
    goals: { points: POINTS_GOAL, vipSpend: VIP_SPEND_GOAL },
  });
}

export async function OPTIONS() {
  return preflight();
}
