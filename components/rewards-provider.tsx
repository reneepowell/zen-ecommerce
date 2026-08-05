"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Customer, CustomerSummary, UpdateAction } from "@/lib/types";
import { formatMoney, formatPoints } from "@/lib/utils";

export interface Toast {
  id: number;
  title: string;
  detail?: string;
  variant: "points" | "wallet" | "info" | "error";
}

interface RewardsContextValue {
  customer: Customer;
  customers: CustomerSummary[];
  activeId: string;
  goals: { points: number; vipSpend: number };
  /** True while a mutation the user triggered is in flight. */
  pending: boolean;
  /** Set when the last poll or mutation failed, so the UI can show a banner. */
  error: string | null;
  toasts: Toast[];
  selectCustomer: (id: string) => void;
  addPoints: (points: number, label?: string) => Promise<void>;
  addWallet: (amount: number, label?: string) => Promise<void>;
  simulateWebhook: () => Promise<void>;
  resetDemo: () => Promise<void>;
  dismissToast: (id: number) => void;
}

const RewardsContext = createContext<RewardsContextValue | null>(null);

/** How often we re-read the profile to pick up out-of-band agent writes. */
const POLL_MS = 2500;

export function RewardsProvider({
  initialCustomer,
  initialCustomers,
  goals,
  children,
}: {
  initialCustomer: Customer;
  initialCustomers: CustomerSummary[];
  goals: { points: number; vipSpend: number };
  children: React.ReactNode;
}) {
  const [customer, setCustomer] = useState(initialCustomer);
  const [customers] = useState(initialCustomers);
  const [activeId, setActiveId] = useState(initialCustomer.id);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toastSeq = useRef(0);
  /**
   * Balances the UI has already reflected. Compared against poll results to
   * detect changes that originated outside this tab (e.g. an AI agent).
   */
  const known = useRef({ points: initialCustomer.points, wallet: initialCustomer.wallet });
  /** Guards against a switch mid-flight applying the previous customer's data. */
  const activeIdRef = useRef(initialCustomer.id);
  /**
   * Set when switching profiles: the next applied payload belongs to a different
   * person, so diffing it against the previous balances would toast nonsense.
   */
  const skipNextAnnounce = useRef(false);

  const pushToast = useCallback((toast: Omit<Toast, "id">) => {
    toastSeq.current += 1;
    const id = toastSeq.current;
    setToasts((prev) => [...prev.slice(-3), { ...toast, id }]);
    return id;
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /** Applies a fresh profile, announcing any balance drift we didn't initiate. */
  const applyCustomer = useCallback(
    (next: Customer, { announce }: { announce: boolean }) => {
      if (next.id !== activeIdRef.current) return;

      // First payload after a profile switch establishes a baseline silently.
      if (skipNextAnnounce.current) {
        skipNextAnnounce.current = false;
        known.current = { points: next.points, wallet: next.wallet };
        setCustomer(next);
        return;
      }

      if (announce) {
        const dPoints = next.points - known.current.points;
        const dWallet = Math.round((next.wallet - known.current.wallet) * 100) / 100;

        if (dPoints !== 0) {
          pushToast({
            variant: "points",
            title: `${dPoints > 0 ? "+" : "−"}${formatPoints(Math.abs(dPoints))} points`,
            detail: `Balance is now ${formatPoints(next.points)} · updated via API`,
          });
        }
        if (dWallet !== 0) {
          pushToast({
            variant: "wallet",
            title: `${dWallet > 0 ? "+" : "−"}${formatMoney(Math.abs(dWallet))} wallet`,
            detail: `Balance is now ${formatMoney(next.wallet)} · updated via API`,
          });
        }
      }

      known.current = { points: next.points, wallet: next.wallet };
      setCustomer(next);
    },
    [pushToast],
  );

  // Poll for out-of-band updates so agent writes land without a refresh.
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function poll() {
      try {
        const res = await fetch(`/api/customer?id=${encodeURIComponent(activeId)}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const data = await res.json();
        if (cancelled || !data?.customer) return;
        applyCustomer(data.customer, { announce: true });
        setError(null);
      } catch (err) {
        if (cancelled || controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Could not reach the rewards API.");
      }
    }

    const timer = setInterval(poll, POLL_MS);
    void poll();

    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(timer);
    };
  }, [activeId, applyCustomer]);

  const selectCustomer = useCallback((id: string) => {
    if (id === activeIdRef.current) return;
    activeIdRef.current = id;
    skipNextAnnounce.current = true;
    setActiveId(id);
  }, []);

  /** Shared POST helper: mutates, applies the response, and toasts the delta. */
  const mutate = useCallback(
    async (
      endpoint: "update-points" | "update-wallet",
      body: Record<string, unknown>,
      describe: (delta: number, next: Customer) => Omit<Toast, "id"> | null,
    ) => {
      setPending(true);
      try {
        const res = await fetch(`/api/customer/${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: activeIdRef.current, ...body }),
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok || !data?.ok) throw new Error(data?.error ?? `Request failed (${res.status})`);

        // Apply without announcing, then emit our own richer toast.
        applyCustomer(data.customer, { announce: false });
        const toast = describe(data.delta, data.customer);
        if (toast) pushToast(toast);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Update failed.";
        setError(message);
        pushToast({ variant: "error", title: "Update failed", detail: message });
      } finally {
        setPending(false);
      }
    },
    [applyCustomer, pushToast],
  );

  const addPoints = useCallback(
    (points: number, label?: string) =>
      mutate(
        "update-points",
        { action: "add" satisfies UpdateAction, points, label },
        (delta, next) => ({
          variant: "points",
          title: `${delta >= 0 ? "+" : "−"}${formatPoints(Math.abs(delta))} points`,
          detail: `${label ?? "Points added"} · balance ${formatPoints(next.points)}`,
        }),
      ),
    [mutate],
  );

  const addWallet = useCallback(
    (amount: number, label?: string) =>
      mutate(
        "update-wallet",
        { action: "add" satisfies UpdateAction, amount, label },
        (delta, next) => ({
          variant: "wallet",
          title: `${delta >= 0 ? "+" : "−"}${formatMoney(Math.abs(delta))} wallet`,
          detail: `${label ?? "Wallet credited"} · balance ${formatMoney(next.wallet)}`,
        }),
      ),
    [mutate],
  );

  /** Mimics an agent resolving a ticket: goodwill points plus a wallet credit. */
  const simulateWebhook = useCallback(async () => {
    await mutate(
      "update-points",
      {
        action: "add" satisfies UpdateAction,
        points: 250,
        label: "AI agent: goodwill for delayed order",
        source: "webhook",
      },
      (delta, next) => ({
        variant: "points",
        title: "AI agent webhook received",
        detail: `+${formatPoints(Math.abs(delta))} points · balance ${formatPoints(next.points)}`,
      }),
    );
    await mutate(
      "update-wallet",
      {
        action: "add" satisfies UpdateAction,
        amount: 10,
        label: "AI agent: shipping refund",
        source: "webhook",
      },
      (delta, next) => ({
        variant: "wallet",
        title: "AI agent issued a refund",
        detail: `+${formatMoney(Math.abs(delta))} · balance ${formatMoney(next.wallet)}`,
      }),
    );
  }, [mutate]);

  const resetDemo = useCallback(async () => {
    setPending(true);
    try {
      const res = await fetch("/api/reset", { method: "POST", cache: "no-store" });
      if (!res.ok) throw new Error(`Reset failed (${res.status})`);

      const profile = await fetch(`/api/customer?id=${encodeURIComponent(activeIdRef.current)}`, {
        cache: "no-store",
      }).then((r) => r.json());

      if (profile?.customer) applyCustomer(profile.customer, { announce: false });
      pushToast({ variant: "info", title: "Demo reset", detail: "All profiles back to seed values." });
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Reset failed.";
      setError(message);
      pushToast({ variant: "error", title: "Reset failed", detail: message });
    } finally {
      setPending(false);
    }
  }, [applyCustomer, pushToast]);

  const value = useMemo<RewardsContextValue>(
    () => ({
      customer,
      customers,
      activeId,
      goals,
      pending,
      error,
      toasts,
      selectCustomer,
      addPoints,
      addWallet,
      simulateWebhook,
      resetDemo,
      dismissToast,
    }),
    [
      customer,
      customers,
      activeId,
      goals,
      pending,
      error,
      toasts,
      selectCustomer,
      addPoints,
      addWallet,
      simulateWebhook,
      resetDemo,
      dismissToast,
    ],
  );

  return <RewardsContext.Provider value={value}>{children}</RewardsContext.Provider>;
}

export function useRewards() {
  const ctx = useContext(RewardsContext);
  if (!ctx) throw new Error("useRewards must be used inside <RewardsProvider>.");
  return ctx;
}
