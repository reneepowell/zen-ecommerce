import type {
  ActivityEntry,
  ActivitySource,
  Customer,
  CustomerSummary,
  UpdateAction,
} from "./types";

/** Points needed for the next rewards unlock. */
export const POINTS_GOAL = 2500;
/** Lifetime spend needed to reach VIP. */
export const VIP_SPEND_GOAL = 500;

export const DEFAULT_CUSTOMER_ID = "carol_foster";

function seed(): Customer[] {
  return [
    {
      id: "carol_foster",
      name: "Carol Foster",
      email: "carol.foster@example.com",
      initials: "CF",
      points: 2328,
      wallet: 150.0,
      tier: "Member",
      joined: "4/2/2024",
      spend: 412,
      activity: [
        {
          id: "carol_foster-seed-1",
          label: "Order #10428 — 3% back in points",
          points: 128,
          at: "2026-07-28T16:20:00.000Z",
          source: "seed",
        },
        {
          id: "carol_foster-seed-2",
          label: "Wrote a product review",
          points: 100,
          at: "2026-07-14T13:05:00.000Z",
          source: "seed",
        },
        {
          id: "carol_foster-seed-3",
          label: "Store credit issued",
          amount: 25,
          at: "2026-06-30T09:45:00.000Z",
          source: "seed",
        },
      ],
    },
    {
      id: "nancy_drew",
      name: "Nancy Drew",
      email: "nancy.drew@example.com",
      initials: "ND",
      points: 1850,
      wallet: 45.0,
      tier: "Member",
      joined: "1/15/2025",
      spend: 268,
      activity: [
        {
          id: "nancy_drew-seed-1",
          label: "Order #10391 — 3% back in points",
          points: 96,
          at: "2026-07-19T11:30:00.000Z",
          source: "seed",
        },
        {
          id: "nancy_drew-seed-2",
          label: "Completed profile",
          points: 50,
          at: "2026-05-02T18:10:00.000Z",
          source: "seed",
        },
      ],
    },
    {
      id: "alex_morgan",
      name: "Alex Morgan",
      email: "alex.morgan@example.com",
      initials: "AM",
      points: 3400,
      wallet: 210.5,
      tier: "VIP",
      joined: "11/10/2023",
      spend: 728,
      activity: [
        {
          id: "alex_morgan-seed-1",
          label: "VIP tier bonus",
          points: 500,
          at: "2026-07-01T08:00:00.000Z",
          source: "seed",
        },
        {
          id: "alex_morgan-seed-2",
          label: "Refund to wallet — Order #10233",
          amount: 60.5,
          at: "2026-06-11T15:22:00.000Z",
          source: "seed",
        },
      ],
    },
    {
      id: "jordan_lee",
      name: "Jordan Lee",
      email: "jordan.lee@example.com",
      initials: "JL",
      points: 450,
      wallet: 0.0,
      tier: "Member",
      joined: "6/20/2025",
      spend: 74,
      activity: [
        {
          id: "jordan_lee-seed-1",
          label: "Welcome bonus",
          points: 250,
          at: "2026-06-20T10:00:00.000Z",
          source: "seed",
        },
      ],
    },
    {
      id: "sam_taylor",
      name: "Sam Taylor",
      email: "sam.taylor@example.com",
      initials: "ST",
      points: 4900,
      wallet: 320.0,
      tier: "VIP",
      joined: "8/05/2023",
      spend: 1140,
      activity: [
        {
          id: "sam_taylor-seed-1",
          label: "Order #10402 — 3% back in points",
          points: 214,
          at: "2026-07-25T20:14:00.000Z",
          source: "seed",
        },
        {
          id: "sam_taylor-seed-2",
          label: "Birthday reward",
          points: 300,
          at: "2026-08-05T07:00:00.000Z",
          source: "seed",
        },
      ],
    },
  ];
}

/**
 * The store lives on globalThis so it survives dev-server hot reloads and is
 * shared across route handler module instances. A demo app has no real
 * persistence layer — restarting the server resets everyone to seed values.
 */
interface Store {
  customers: Map<string, Customer>;
  counter: number;
}

const globalStore = globalThis as typeof globalThis & {
  __zenEcommerceStore?: Store;
};

function getStore(): Store {
  if (!globalStore.__zenEcommerceStore) {
    globalStore.__zenEcommerceStore = {
      customers: new Map(seed().map((c) => [c.id, c])),
      counter: 0,
    };
  }
  return globalStore.__zenEcommerceStore;
}

/** Deep-ish clone so callers can never mutate the store by holding a reference. */
function clone(customer: Customer): Customer {
  return { ...customer, activity: customer.activity.map((a) => ({ ...a })) };
}

function nextId(prefix: string): string {
  const store = getStore();
  store.counter += 1;
  return `${prefix}-${store.counter}`;
}

/** Money is rounded to cents to keep float drift out of the UI. */
function toCents(value: number): number {
  return Math.round(value * 100) / 100;
}

export function listCustomers(): CustomerSummary[] {
  return [...getStore().customers.values()].map(({ id, name, initials, tier }) => ({
    id,
    name,
    initials,
    tier,
  }));
}

export function getCustomer(id?: string | null): Customer | undefined {
  const customer = getStore().customers.get(id?.trim() || DEFAULT_CUSTOMER_ID);
  return customer ? clone(customer) : undefined;
}

function record(customer: Customer, entry: Omit<ActivityEntry, "id" | "at">) {
  customer.activity.unshift({
    ...entry,
    id: nextId(`${customer.id}-act`),
    at: new Date().toISOString(),
  });
  // Keep the demo timeline short enough to read at a glance.
  customer.activity = customer.activity.slice(0, 12);
}

export interface UpdateResult {
  customer: Customer;
  /** Signed delta actually applied, useful for toast copy. */
  delta: number;
  previous: number;
}

export function updatePoints(
  id: string,
  action: UpdateAction,
  points: number,
  options: { label?: string; source?: ActivitySource } = {},
): UpdateResult | undefined {
  const customer = getStore().customers.get(id?.trim() || DEFAULT_CUSTOMER_ID);
  if (!customer) return undefined;

  const previous = customer.points;
  // Balances never go negative, even if an agent sends an oversized deduction.
  const next = Math.max(0, Math.round(action === "add" ? previous + points : points));
  customer.points = next;

  const delta = next - previous;
  const { label, source = "api" } = options;
  record(customer, {
    label: label ?? (action === "set" ? "Points balance set" : "Points adjusted"),
    points: delta,
    source,
  });

  return { customer: clone(customer), delta, previous };
}

export function updateWallet(
  id: string,
  action: UpdateAction,
  amount: number,
  options: { label?: string; source?: ActivitySource } = {},
): UpdateResult | undefined {
  const customer = getStore().customers.get(id?.trim() || DEFAULT_CUSTOMER_ID);
  if (!customer) return undefined;

  const previous = customer.wallet;
  const next = Math.max(0, toCents(action === "add" ? previous + amount : amount));
  customer.wallet = next;

  const delta = toCents(next - previous);
  const { label, source = "api" } = options;
  record(customer, {
    label: label ?? (action === "set" ? "Wallet balance set" : "Wallet adjusted"),
    amount: delta,
    source,
  });

  return { customer: clone(customer), delta, previous };
}

/** Restores every profile to its seed values. Used by the demo drawer. */
export function resetStore(): void {
  const store = getStore();
  store.customers = new Map(seed().map((c) => [c.id, c]));
  store.counter = 0;
}
