"use client";

import { useEffect, useState } from "react";
import {
  Check,
  ChevronDown,
  Copy,
  CreditCard,
  RotateCcw,
  Star,
  Terminal,
  Webhook,
  Wrench,
} from "lucide-react";
import { useRewards } from "./rewards-provider";
import { cn } from "@/lib/utils";

function CurlSnippet({ userId }: { userId: string }) {
  const [copied, setCopied] = useState(false);

  /**
   * This subtree only mounts once the user opens the drawer, i.e. after
   * hydration, so reading `window` here can't cause a markup mismatch.
   */
  const origin = typeof window === "undefined" ? "http://localhost:3000" : window.location.origin;

  const snippet = `curl -X POST ${origin}/api/customer/update-points \\
  -H "Content-Type: application/json" \\
  -d '{"user_id":"${userId}","action":"add","points":100}'`;

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
    } catch {
      // Clipboard is unavailable outside secure contexts; the text stays selectable.
      setCopied(false);
    }
  }

  return (
    <div className="rounded-lg border border-smoke-700 bg-smoke-900/70">
      <div className="flex items-center justify-between border-b border-smoke-700 px-2.5 py-1.5">
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-smoke-300">
          <Terminal className="size-3" aria-hidden />
          Agent request
        </span>
        <button
          type="button"
          onClick={() => void copy()}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-smoke-200 transition hover:bg-smoke-700 hover:text-white"
        >
          {copied ? (
            <>
              <Check className="size-3" aria-hidden /> Copied
            </>
          ) : (
            <>
              <Copy className="size-3" aria-hidden /> Copy
            </>
          )}
        </button>
      </div>
      {/* Wrapped rather than scrolled, so the whole payload is readable on a projector. */}
      <pre className="whitespace-pre-wrap break-all px-2.5 py-2 font-mono text-[10.5px] leading-relaxed text-smoke-100">
        {snippet}
      </pre>
    </div>
  );
}

export function DemoDrawer() {
  const {
    customer,
    customers,
    selectCustomer,
    addPoints,
    addWallet,
    simulateWebhook,
    resetDemo,
    pending,
    error,
  } = useRewards();

  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 sm:bottom-6 sm:right-6">
      {open ? (
        <div className="w-[min(23rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-smoke-700 bg-smoke-800 text-white shadow-2xl shadow-smoke-900/40">
          <div className="flex items-center justify-between border-b border-smoke-700 px-4 py-3">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold tracking-tight">
                <Wrench className="size-4 text-smoke-300" aria-hidden />
                Demo Controls
              </p>
              <p className="mt-0.5 text-[11px] text-smoke-300">
                Drives the same API an AI agent calls
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-smoke-300 transition hover:bg-smoke-700 hover:text-white"
              aria-label="Collapse demo controls"
            >
              <ChevronDown className="size-4" aria-hidden />
            </button>
          </div>

          <div className="space-y-4 p-4">
            <div>
              <label
                htmlFor="demo-profile"
                className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-smoke-300"
              >
                Active profile
              </label>
              <select
                id="demo-profile"
                value={customer.id}
                onChange={(event) => selectCustomer(event.target.value)}
                className="w-full appearance-none rounded-lg border border-smoke-600 bg-smoke-900 px-3 py-2 text-sm text-white transition focus:border-smoke-400 focus:outline-none"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.tier}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-smoke-300">
                Quick actions
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => void addPoints(100, "Demo control: +100 points")}
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-smoke-600 px-3 py-2 text-xs font-semibold transition hover:bg-smoke-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Star className="size-3.5 text-gold" aria-hidden />
                  +100 pts
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => void addWallet(25, "Demo control: +$25 wallet")}
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-smoke-600 px-3 py-2 text-xs font-semibold transition hover:bg-smoke-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CreditCard className="size-3.5 text-mint" aria-hidden />
                  +$25 wallet
                </button>
              </div>
            </div>

            <button
              type="button"
              disabled={pending}
              onClick={() => void simulateWebhook()}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-linear-to-r from-smoke-400 to-smoke-300 px-3 py-2.5 text-xs font-bold text-smoke-900 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Webhook className="size-4" aria-hidden />
              Simulate AI Agent Webhook
            </button>

            <CurlSnippet userId={customer.id} />

            {error ? (
              <p className="rounded-lg bg-red-500/15 px-2.5 py-2 text-[11px] leading-relaxed text-red-200">
                {error}
              </p>
            ) : null}

            <button
              type="button"
              disabled={pending}
              onClick={() => void resetDemo()}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-smoke-600 px-3 py-2 text-[11px] font-medium text-smoke-200 transition hover:bg-smoke-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RotateCcw className="size-3.5" aria-hidden />
              Reset all profiles
            </button>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          "flex items-center gap-2 rounded-full bg-smoke-800 px-4 py-3 text-sm font-semibold text-white shadow-xl shadow-smoke-900/30 transition hover:bg-smoke-700",
          open && "hidden",
        )}
      >
        <Wrench className="size-4" aria-hidden />
        Demo Controls
      </button>
    </div>
  );
}
