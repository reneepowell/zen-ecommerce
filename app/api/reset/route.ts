import { ok, preflight } from "@/lib/api";
import { listCustomers, resetStore } from "@/lib/db";

export const dynamic = "force-dynamic";

/** POST /api/reset — restore all profiles to seed values between demos. */
export async function POST() {
  resetStore();
  return ok({ ok: true, reset: true, customers: listCustomers() });
}

export async function OPTIONS() {
  return preflight();
}
