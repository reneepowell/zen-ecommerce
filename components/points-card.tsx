"use client";

import { useState } from "react";
import { ChevronRight, History, Star } from "lucide-react";
import { useRewards } from "./rewards-provider";
import { ProgressBar } from "./progress-bar";
import { cn, formatMoney, formatPoints, formatRelativeTime, progressPercent } from "@/lib/utils";

function PointsHistory() {
  const { customer } = useRewards();

  if (customer.activity.length === 0) {
    return (
      <p className="mt-4 rounded-xl bg-paper px-4 py-6 text-center text-sm text-ink-muted">
        No activity yet. Earn points below to get started.
      </p>
    );
  }

  return (
    <ul className="mt-4 divide-y divide-hairline border-t border-hairline">
      {customer.activity.map((entry) => {
        const value = entry.points ?? entry.amount ?? 0;
        const isMoney = entry.amount !== undefined;
        const positive = value >= 0;

        return (
          <li key={entry.id} className="flex items-center gap-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-ink">{entry.label}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink-muted">
                <span>{formatRelativeTime(entry.at)}</span>
                {entry.source === "webhook" || entry.source === "api" ? (
                  <span className="rounded bg-smoke-100 px-1 py-px font-mono text-[10px] uppercase text-smoke-600">
                    {entry.source}
                  </span>
                ) : null}
              </p>
            </div>
            <span
              className={cn(
                "tabular shrink-0 text-sm font-semibold",
                positive ? "text-mint" : "text-red-600",
              )}
            >
              {positive ? "+" : "−"}
              {isMoney ? formatMoney(Math.abs(value)) : formatPoints(Math.abs(value))}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function PointsCard() {
  const { customer, goals } = useRewards();
  const [showHistory, setShowHistory] = useState(false);

  const percent = progressPercent(customer.points, goals.points);
  const remaining = Math.max(0, goals.points - customer.points);

  return (
    <section className="rounded-2xl border border-hairline bg-surface p-6 shadow-xs">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-ink-muted">
            <Star className="size-4 text-gold" aria-hidden />
            My Points
          </h2>
          <p className="mt-3 flex items-baseline gap-2">
            <span className="tabular text-4xl font-semibold tracking-tight text-ink">
              {formatPoints(customer.points)}
            </span>
            <span className="text-sm text-ink-muted">points</span>
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowHistory((v) => !v)}
          aria-expanded={showHistory}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-hairline px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:border-smoke-300 hover:text-ink"
        >
          <History className="size-3.5" aria-hidden />
          Points History
          <ChevronRight
            className={cn("size-3.5 transition", showHistory && "rotate-90")}
            aria-hidden
          />
        </button>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-baseline justify-between text-xs">
          <span className="text-ink-soft">
            {remaining > 0 ? (
              <>
                <span className="tabular font-semibold text-ink">{formatPoints(remaining)}</span>{" "}
                points to your next reward
              </>
            ) : (
              <span className="font-semibold text-mint">Next reward unlocked</span>
            )}
          </span>
          <span className="tabular text-ink-muted">{formatPoints(goals.points)}</span>
        </div>
        <ProgressBar percent={percent} label="Progress toward next reward" />
      </div>

      {showHistory ? <PointsHistory /> : null}
    </section>
  );
}
