import { ok, preflight } from "@/lib/api";
import { listCustomers } from "@/lib/db";

export const dynamic = "force-dynamic";

/** GET /api/customers — profile summaries for the switcher. */
export async function GET() {
  return ok({ ok: true, customers: listCustomers() });
}

export async function OPTIONS() {
  return preflight();
}
