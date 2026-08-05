"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { MessageCircle, Send, X } from "lucide-react";
import { useRewards } from "./rewards-provider";
import { notifySupportOpened, onOpenSupport } from "@/lib/support-bus";
import { cn, formatMoney, formatPoints } from "@/lib/utils";

/**
 * Support widget, pinned bottom-right.
 *
 * When `NEXT_PUBLIC_ZENDESK_KEY` is set we load the real Zendesk Web Widget
 * (Web Widget "Classic"/messaging snippet) and render nothing ourselves — the
 * Zendesk script draws its own launcher in that corner.
 *
 * Without a key we render a self-contained placeholder panel so the demo still
 * shows a working support entry point, seeded with the customer's live balances
 * to illustrate the context an agent would receive.
 */
export function SupportWidget() {
  const zendeskKey = process.env.NEXT_PUBLIC_ZENDESK_KEY;

  if (zendeskKey) return <ZendeskWidget zendeskKey={zendeskKey} />;
  return <PlaceholderWidget />;
}

function ZendeskWidget({ zendeskKey }: { zendeskKey: string }) {
  const [failed, setFailed] = useState(false);

  // If the snippet can't load (offline demo, bad key), fall back to the panel
  // rather than leaving the corner empty.
  if (failed) return <PlaceholderWidget />;

  return (
    <Script
      id="ze-snippet"
      src={`https://static.zdassets.com/ekr/snippet.js?key=${encodeURIComponent(zendeskKey)}`}
      strategy="lazyOnload"
      onError={() => setFailed(true)}
    />
  );
}

const QUICK_PROMPTS = [
  "Where is my order?",
  "How do I redeem points?",
  "I was charged twice",
];

function PlaceholderWidget() {
  const { customer } = useRewards();
  const [open, setOpen] = useState(false);

  // Let other components (e.g. the sidebar "Need help?" card) open the panel.
  useEffect(() => onOpenSupport(() => setOpen(true)), []);

  // Announce opening so the demo drawer can step aside on narrow screens.
  useEffect(() => {
    if (open) notifySupportOpened();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {open ? (
        <div className="flex h-[26rem] w-[min(21rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-hairline bg-surface shadow-2xl shadow-smoke-900/20">
          <div className="flex items-center justify-between gap-3 bg-linear-to-r from-smoke-700 to-smoke-900 px-4 py-3 text-white">
            <div>
              <p className="text-sm font-semibold tracking-tight">Zen Support</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-white/70">
                <span className="size-1.5 rounded-full bg-emerald-400" aria-hidden />
                Typically replies in a few minutes
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
              aria-label="Close support chat"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-paper px-4 py-4">
            <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-surface px-3.5 py-2.5 shadow-xs">
              <p className="text-[13px] leading-relaxed text-ink">
                Hi {customer.name.split(" ")[0]}, how can we help today?
              </p>
            </div>
            <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-surface px-3.5 py-2.5 shadow-xs">
              <p className="text-[13px] leading-relaxed text-ink-soft">
                I can see your account: {formatPoints(customer.points)} points and{" "}
                {formatMoney(customer.wallet)} in your wallet.
              </p>
            </div>

            <div className="flex flex-wrap justify-end gap-1.5 pt-1">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="rounded-full border border-smoke-200 bg-surface px-2.5 py-1 text-[11px] text-smoke-700 transition hover:border-smoke-300 hover:bg-smoke-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 border-t border-hairline bg-surface px-3 py-2.5">
            <input
              type="text"
              placeholder="Write a message…"
              className="min-w-0 flex-1 bg-transparent px-1 text-[13px] text-ink outline-none placeholder:text-ink-muted"
            />
            <button
              type="button"
              className="grid size-8 shrink-0 place-items-center rounded-full bg-smoke-800 text-white transition hover:bg-smoke-700"
              aria-label="Send message"
            >
              <Send className="size-3.5" aria-hidden />
            </button>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Close support chat" : "Open support chat"}
        className={cn(
          "grid size-14 place-items-center rounded-full bg-linear-to-br from-smoke-700 to-smoke-900 text-white shadow-xl shadow-smoke-900/30 transition hover:scale-105 hover:shadow-2xl active:scale-100",
          open && "hidden",
        )}
      >
        <MessageCircle className="size-6" aria-hidden />
      </button>
    </div>
  );
}
