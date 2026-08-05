import { SignJWT } from "jose";
import type { Customer } from "./types";

/**
 * Zendesk messaging authentication ("Authenticated visitors").
 *
 * The widget proves who the visitor is by handing Zendesk a short-lived JWT
 * signed with a shared secret. Signing happens server-side only — the secret is
 * NOT a `NEXT_PUBLIC_` var, because anyone holding it could impersonate any
 * customer in your Zendesk instance.
 *
 * Both values come from Zendesk Admin Center → Channels → Messaging → your
 * widget → Authentication (create a key; you get a Key ID and a secret shown
 * once).
 */
export function jwtConfig(): { keyId: string; secret: string } | null {
  const keyId = process.env.ZENDESK_JWT_KEY_ID;
  const secret = process.env.ZENDESK_JWT_SECRET;
  if (!keyId || !secret) return null;
  return { keyId, secret };
}

/** Tokens are short-lived; the widget requests a fresh one when it needs it. */
const TTL_SECONDS = 10 * 60;

/**
 * Signs a messaging JWT for a customer.
 *
 * `external_id` is what ties this browser session to a Zendesk end user, so it
 * must be stable per person — we use the demo profile id (e.g. `carol_foster`).
 * Zendesk creates or matches the end user on that value, which is why the
 * agent workspace shows "Carol Foster" rather than an anonymous visitor.
 */
export async function signZendeskJwt(customer: Customer): Promise<string> {
  const config = jwtConfig();
  if (!config) throw new Error("Zendesk JWT is not configured");

  const issuedAt = Math.floor(Date.now() / 1000);

  return new SignJWT({
    external_id: customer.id,
    name: customer.name,
    email: customer.email,
    // Zendesk treats an unverified email as untrusted; this claim is what makes
    // the identity authoritative rather than user-supplied.
    email_verified: true,
    scope: "user",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT", kid: config.keyId })
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + TTL_SECONDS)
    .sign(new TextEncoder().encode(config.secret));
}
