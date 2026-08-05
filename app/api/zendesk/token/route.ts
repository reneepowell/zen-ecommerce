import { fail, ok, preflight } from "@/lib/api";
import { DEFAULT_CUSTOMER_ID, getCustomer } from "@/lib/db";
import { jwtConfig, signZendeskJwt } from "@/lib/zendesk-jwt";

// Tokens are per-customer and short-lived — never cache this.
export const dynamic = "force-dynamic";

/**
 * GET /api/zendesk/token?id=carol_foster
 *
 * Mints a messaging JWT so the widget can prove which customer is browsing.
 * The widget calls this from its `loginUser` callback.
 *
 * In a real storefront the id would come from the session cookie, not a query
 * param — here the demo lets you switch profiles, so the selected profile is
 * the identity. That is also why this endpoint is safe to leave open in this
 * demo but would be an impersonation hole in production.
 */
export async function GET(request: Request) {
  if (!jwtConfig()) {
    return fail(
      "Zendesk JWT is not configured. Set ZENDESK_JWT_KEY_ID and ZENDESK_JWT_SECRET.",
      501,
    );
  }

  const id = new URL(request.url).searchParams.get("id") ?? DEFAULT_CUSTOMER_ID;
  const customer = await getCustomer(id);
  if (!customer) return fail(`Unknown customer id: ${id}`, 404);

  try {
    return ok({ ok: true, token: await signZendeskJwt(customer) });
  } catch (error) {
    console.error("[zendesk] failed to sign JWT:", error);
    return fail("Could not sign the Zendesk JWT.", 500);
  }
}

export async function OPTIONS() {
  return preflight();
}
