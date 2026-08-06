import { Redis } from "@upstash/redis";
import type {
  ActivityEntry,
  ActivitySource,
  Customer,
  CustomerSummary,
  UpdateAction,
} from "./types";
import { DEFAULT_CUSTOMER_ID, POINTS_GOAL, VIP_SPEND_GOAL, seed } from "./seed";

export { DEFAULT_CUSTOMER_ID, POINTS_GOAL, VIP_SPEND_GOAL };

/**
 * Storage has two backends:
 *
 * - **Redis** (when `KV_REST_API_URL`/`KV_REST_API_TOKEN` or the `UPSTASH_*`
 *   equivalents are set). Required in serverless, where each request may hit a
 *   different instance and instances are recycled when idle — in-memory writes
 *   silently vanish there.
 * - **In-memory**, kept on `globalThis` so it survives dev hot reloads. Fine for
 *   local development and resets whenever the process restarts.
 *
 * Mutations are read-modify-write against a single JSON blob rather than
 * per-field atomic ops, so concurrent writes are serialized with a Redis lock —
 * see applyUpdate. Keeping one blob makes the whole store trivially
 * inspectable, which is worth more here than per-field atomicity.
 */

const REDIS_KEY = "zen:customers:v1";

function redisClient(): Redis | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

/** Which backend is active, for the /api/health readout. */
export function storageMode(): "redis" | "memory" {
  return redisClient() ? "redis" : "memory";
}

const globalStore = globalThis as typeof globalThis & {
  __zenEcommerceStore?: Customer[];
};

function memoryRead(): Customer[] {
  if (!globalStore.__zenEcommerceStore) globalStore.__zenEcommerceStore = seed();
  return globalStore.__zenEcommerceStore;
}

async function readAll(): Promise<Customer[]> {
  const redis = redisClient();
  if (!redis) return memoryRead();

  try {
    // The REST client returns parsed JSON, so this is already an object.
    const stored = await redis.get<Customer[]>(REDIS_KEY);
    if (Array.isArray(stored) && stored.length > 0) return stored;

    // First run against a fresh Redis: plant the seed.
    const fresh = seed();
    await redis.set(REDIS_KEY, fresh);
    return fresh;
  } catch (error) {
    // Never take the demo down over a storage hiccup; degrade to memory.
    console.error("[db] Redis read failed, falling back to memory:", error);
    return memoryRead();
  }
}

async function writeAll(customers: Customer[]): Promise<void> {
  const redis = redisClient();
  if (!redis) {
    globalStore.__zenEcommerceStore = customers;
    return;
  }

  try {
    await redis.set(REDIS_KEY, customers);
  } catch (error) {
    console.error("[db] Redis write failed, falling back to memory:", error);
    globalStore.__zenEcommerceStore = customers;
  }
}

function clone(customer: Customer): Customer {
  return { ...customer, activity: customer.activity.map((a) => ({ ...a })) };
}

/** Money is rounded to cents to keep float drift out of the UI. */
function toCents(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function listCustomers(): Promise<CustomerSummary[]> {
  const customers = await readAll();
  return customers.map(({ id, name, initials, tier }) => ({ id, name, initials, tier }));
}

export async function getCustomer(id?: string | null): Promise<Customer | undefined> {
  const wanted = id?.trim() || DEFAULT_CUSTOMER_ID;
  const customer = (await readAll()).find((c) => c.id === wanted);
  return customer ? clone(customer) : undefined;
}

function record(customer: Customer, entry: Omit<ActivityEntry, "id" | "at">) {
  customer.activity.unshift({
    ...entry,
    // Random suffix keeps ids unique without a shared counter across instances.
    id: `${customer.id}-act-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
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

/** Unguarded read-modify-write. Correct only when nothing else can write. */
async function applyUpdateUnlocked(
  wanted: string,
  mutate: (customer: Customer) => { previous: number; delta: number },
): Promise<UpdateResult | undefined> {
  const customers = await readAll();
  const target = customers.find((c) => c.id === wanted);
  if (!target) return undefined;

  const { previous, delta } = mutate(target);
  await writeAll(customers);
  return { customer: clone(target), delta, previous };
}

/**
 * Shared read-modify-write path for both balance fields.
 *
 * Plain read-then-write loses concurrent updates: two requests read the same
 * balance, both add to it, and the second write overwrites the first. Measured
 * at 4–5 lost writes out of 10 concurrent requests against the deployment.
 *
 * Serialized with a short-lived Redis lock. `SET NX` only succeeds for the first
 * caller, so whoever takes the lock does its read and write with no one else
 * interleaving; the rest wait their turn. The `PX` expiry means a crashed holder
 * can't wedge the store — the lock frees itself.
 *
 * An earlier attempt used an INCR'd version counter as a claim check, which was
 * worse than no guard at all (9–10 of 10 writes lost): every retry bumped the
 * counter, so contending writers invalidated each other forever.
 */
const LOCK_KEY = "zen:customers:lock";
const LOCK_TTL_MS = 5000;
const LOCK_MAX_WAIT_MS = 4000;
const LOCK_RETRY_MS = 40;

async function applyUpdate(
  id: string,
  mutate: (customer: Customer) => { previous: number; delta: number },
): Promise<UpdateResult | undefined> {
  const wanted = id?.trim() || DEFAULT_CUSTOMER_ID;
  const redis = redisClient();

  // Single-process memory store: one event loop, so no interleaving to guard.
  if (!redis) return applyUpdateUnlocked(wanted, mutate);

  const deadline = Date.now() + LOCK_MAX_WAIT_MS;
  let held = false;

  try {
    while (Date.now() < deadline) {
      const acquired = await redis.set(LOCK_KEY, "1", { nx: true, px: LOCK_TTL_MS });
      if (acquired) {
        held = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, LOCK_RETRY_MS));
    }

    if (!held) {
      // Rather than drop the write, proceed unguarded: a slightly racy update
      // beats telling the agent its credit failed.
      console.warn("[db] lock wait timed out; applying update unguarded");
    }

    return await applyUpdateUnlocked(wanted, mutate);
  } catch (error) {
    console.error("[db] locked write failed, applying unguarded:", error);
    return applyUpdateUnlocked(wanted, mutate);
  } finally {
    if (held) {
      try {
        await redis.del(LOCK_KEY);
      } catch {
        // Left to expire via PX; the next writer waits at most LOCK_TTL_MS.
      }
    }
  }
}

export function updatePoints(
  id: string,
  action: UpdateAction,
  points: number,
  options: { label?: string; source?: ActivitySource } = {},
): Promise<UpdateResult | undefined> {
  const { label, source = "api" } = options;

  return applyUpdate(id, (customer) => {
    const previous = customer.points;
    // Balances never go negative, even if an agent sends an oversized deduction.
    const next = Math.max(0, Math.round(action === "add" ? previous + points : points));
    customer.points = next;

    const delta = next - previous;
    record(customer, {
      label: label ?? (action === "set" ? "Points balance set" : "Points adjusted"),
      points: delta,
      source,
    });
    return { previous, delta };
  });
}

export function updateWallet(
  id: string,
  action: UpdateAction,
  amount: number,
  options: { label?: string; source?: ActivitySource } = {},
): Promise<UpdateResult | undefined> {
  const { label, source = "api" } = options;

  return applyUpdate(id, (customer) => {
    const previous = customer.wallet;
    const next = Math.max(0, toCents(action === "add" ? previous + amount : amount));
    customer.wallet = next;

    const delta = toCents(next - previous);
    record(customer, {
      label: label ?? (action === "set" ? "Wallet balance set" : "Wallet adjusted"),
      amount: delta,
      source,
    });
    return { previous, delta };
  });
}

/** Restores every profile to its seed values. Used by the demo drawer. */
export async function resetStore(): Promise<void> {
  await writeAll(seed());

  // Drop any held lock so a stuck writer can't restore a pre-reset balance.
  const redis = redisClient();
  if (redis) {
    try {
      await redis.del(LOCK_KEY);
    } catch (error) {
      console.error("[db] could not clear lock on reset:", error);
    }
  }
}
