# Zen Ecommerce — Rewards Demo

A live-demo customer rewards dashboard. An external AI agent can update loyalty
points and digital wallet balances over HTTP, and the dashboard reflects the
change within a couple of seconds without a refresh.

Built with Next.js 16 (App Router), TypeScript, Tailwind CSS v4, and lucide-react.

## Running it

```bash
npm install
npm run dev      # http://localhost:3000
```

```bash
npm run build && npm start   # production
```

> Node.js 20.9+ is required by Next.js 16.

## How the live updates work

The dashboard polls `GET /api/customer` every 2.5s; when a balance changes from a
source other than the current tab, a toast announces the delta.

## Storage — read this before deploying

`lib/db.ts` has two backends, chosen at runtime. Check which one is live with
`GET /api/health`.

| Backend | When | Behavior |
| --- | --- | --- |
| **Redis** | Redis env vars present | Writes persist across instances and restarts |
| **In-memory** | no env vars | Fine locally; **writes are lost on serverless** |

**In-memory does not work on Vercel.** Each request can hit a different instance
with its own memory, and instances are recycled when idle — so an agent's write
lands on one instance and disappears seconds later. This was reproduced on a real
deployment: a `+500` write read back correctly while warm, then reverted to the
seed value after ~75s idle.

To fix it, provision a Redis store and set these (Vercel Marketplace → Upstash
adds `KV_REST_API_*` automatically):

```bash
KV_REST_API_URL=...
KV_REST_API_TOKEN=...
# UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN also work
```

Local development needs no env vars — it uses the in-memory store, where a single
long-lived process makes writes stick. If Redis is configured but unreachable,
the store logs a warning and degrades to memory instead of erroring.

Mutations are read-modify-write against one JSON blob, not per-field atomic ops.
Two writes in the same millisecond could interleave — acceptable for a demo
driven by one agent and one presenter.

## Demo profiles

| Name | `user_id` | Points | Wallet | Tier | Joined |
| --- | --- | --- | --- | --- | --- |
| Carol Foster (default) | `carol_foster` | 2,328 | $150.00 | Member | 4/2/2024 |
| Nancy Drew | `nancy_drew` | 1,850 | $45.00 | Member | 1/15/2025 |
| Alex Morgan | `alex_morgan` | 3,400 | $210.50 | VIP | 11/10/2023 |
| Jordan Lee | `jordan_lee` | 450 | $0.00 | Member | 6/20/2025 |
| Sam Taylor | `sam_taylor` | 4,900 | $320.00 | VIP | 8/05/2023 |

## API

All routes send permissive CORS headers and answer `OPTIONS` preflight, so an
agent can call them from anywhere.

### `GET /api/customer?id=carol_foster`

Returns the profile. Omit `id` to get the default (`carol_foster`). Responds
`404` with the list of valid ids if the customer is unknown.

```json
{
  "ok": true,
  "customer": { "id": "carol_foster", "points": 2328, "wallet": 150, "tier": "Member", "...": "..." },
  "goals": { "points": 2500, "vipSpend": 500 }
}
```

### `POST /api/customer/update-points`

```json
{ "user_id": "carol_foster", "action": "add", "points": 100 }
```

`action` is `"add"` (relative) or `"set"` (absolute). Optional `label` shows up
in the Points History timeline; optional `"source": "webhook"` tags the entry as
agent-driven in the UI.

```bash
curl -X POST http://localhost:3000/api/customer/update-points \
  -H "Content-Type: application/json" \
  -d '{"user_id":"carol_foster","action":"add","points":100}'
```

### `POST /api/customer/update-wallet`

Identical, but the value field is `amount` (dollars):

```bash
curl -X POST http://localhost:3000/api/customer/update-wallet \
  -H "Content-Type: application/json" \
  -d '{"user_id":"carol_foster","action":"add","amount":25}'
```

### Response shape for both mutations

```json
{
  "ok": true,
  "field": "points",
  "action": "add",
  "previous": 2328,
  "delta": 100,
  "balance": 2428,
  "customer": { "...": "..." }
}
```

### Supporting routes

- `GET /api/customers` — profile summaries for the switcher.
- `POST /api/reset` — restore all profiles to seed values between demos.

### Behavior worth knowing

- Numeric strings are accepted (`"points": "100"`), since agents often send them.
- Balances clamp at zero; an oversized deduction floors instead of going negative.
- Wallet amounts round to cents, so repeated adds don't accumulate float drift.
- Invalid `action`, non-numeric values, and malformed JSON return `400`.

## Support widget

Pinned bottom-right. Out of the box it renders a self-contained placeholder
chat panel, seeded with the customer's live points and wallet balance to show
the context an agent would receive.

To load the **real Zendesk Web Widget** instead, set a key and restart:

```bash
# .env.local
NEXT_PUBLIC_ZENDESK_KEY=your-widget-key
```

The key is the value from your Zendesk snippet's
`static.zdassets.com/ekr/snippet.js?key=…` URL (Admin Center → Channels →
Messaging, or Widget → Installation). With it set, the Zendesk script draws its
own launcher and the placeholder is skipped; if the script fails to load, the
placeholder comes back so the corner is never empty.

The sidebar "Need help?" card opens whichever widget is active — it calls the
real widget's `zE('messenger', 'open')` when available.

If the snippet is blocked (ad blocker, VPN, corporate proxy on
`static.zdassets.com`) the corner shows a short notice naming the blocked
domain. It deliberately does **not** substitute the mock panel — a look-alike
made a network failure indistinguishable from a working-but-disconnected widget.

### Authenticated visitors (JWT)

Without auth the widget treats every visitor as anonymous, so an agent can't
tell it's talking to Carol Foster. Set these to sign a messaging JWT
(Admin Center → Channels → Messaging → your widget → **Authentication**, then
create a key — the secret is shown once):

```bash
ZENDESK_JWT_KEY_ID=your-key-id
ZENDESK_JWT_SECRET=your-shared-secret
```

Both are **server-side only** — no `NEXT_PUBLIC_` prefix. Anyone holding the
secret can impersonate any end user in your instance.

With them set, the widget calls `zE('messenger','loginUser')` and fetches a
token from `GET /api/zendesk/token?id=<user_id>`, signed HS256 with `kid` in the
header and a 10-minute expiry. Claims sent: `external_id` (the profile id, which
is what Zendesk matches an end user on), `name`, `email`, `email_verified`, and
`scope: "user"`. The agent workspace then shows the real customer instead of a
visitor.

Switching profiles calls `logoutUser` before re-authenticating, so Nancy's
conversation doesn't inherit Carol's thread. Unset the vars and the widget still
loads — just anonymously — and `/api/zendesk/token` returns `501`.

In this demo the identity comes from the selected profile (a query param). A
real storefront must derive it from the session cookie instead; taking it from
the client would let anyone mint a token as anyone.

## Demo controls

The collapsible drawer in the bottom-left corner drives the same public API,
not internal state — so anything it does, an agent can do:

- **+100 pts** / **+$25 wallet** quick actions
- **Profile switcher** (also in the header dropdown)
- **Simulate AI Agent Webhook** — adds 250 points and a $10 refund, tagged `webhook`
- **Copyable cURL snippet**, pre-filled with the selected `user_id`
- **Reset all profiles**

## Layout

```
app/
  api/customer/route.ts                  GET    profile
  api/customer/update-points/route.ts    POST   points
  api/customer/update-wallet/route.ts    POST   wallet
  api/customers/route.ts                 GET    summaries
  api/reset/route.ts                     POST   reseed
  api/health/route.ts                    GET    active storage backend
  api/zendesk/token/route.ts             GET    signed messaging JWT
  page.tsx                               dashboard (server component)
components/
  rewards-provider.tsx   client state, polling, toast dispatch
  site-header.tsx        brand, nav, live counters, profile dropdown
  sidebar.tsx            user card, nav, chat affordance
  points-card.tsx        balance, progress, collapsible history
  vip-card.tsx           spend progress toward VIP
  earn-points-grid.tsx   serif callout + 5 earn-points cards
  demo-drawer.tsx        live demo controls (bottom-left)
  support-widget.tsx     Zendesk widget / placeholder chat (bottom-right)
  toaster.tsx            toast notifications
lib/
  db.ts                  storage adapter (Redis or in-memory) + mutations
  seed.ts                canonical profile seed data + goal constants
  api.ts                 CORS, validation, JSON helpers
  support-bus.ts         open-the-widget event bus
  zendesk-jwt.ts         signs messaging JWTs (server-side secret)
  utils.ts               cn(), formatting, progress math
  types.ts               shared types
```
