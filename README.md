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

State lives in an in-memory store (`lib/db.ts`) attached to `globalThis`, so it
survives dev-server hot reloads and is shared across route handlers. The
dashboard polls `GET /api/customer` every 2.5s; when a balance changes from a
source other than the current tab, a toast announces the delta. **Restarting the
server resets every profile to its seed values.**

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

## Demo controls

The collapsible drawer in the bottom-right corner drives the same public API,
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
  page.tsx                               dashboard (server component)
components/
  rewards-provider.tsx   client state, polling, toast dispatch
  site-header.tsx        brand, nav, live counters, profile dropdown
  sidebar.tsx            user card, nav, chat affordance
  points-card.tsx        balance, progress, collapsible history
  vip-card.tsx           spend progress toward VIP
  earn-points-grid.tsx   serif callout + 5 earn-points cards
  demo-drawer.tsx        live demo controls
  toaster.tsx            toast notifications
lib/
  db.ts                  in-memory store + mutations
  api.ts                 CORS, validation, JSON helpers
  utils.ts               cn(), formatting, progress math
  types.ts               shared types
```
