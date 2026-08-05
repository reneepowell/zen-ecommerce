"use client";

import { Crown } from "lucide-react";
import { useRewards } from "./rewards-provider";
import { ProgressBar } from "./progress-bar";
import { formatMoney, progressPercent } from "@/lib/utils";

const VIP_PERKS = ["Free express shipping", "Early access drops", "2× points weekends"];

export function VipCard() {
  const { customer, goals } = useRewards();

  const isVip = customer.tier === "VIP";
  const percent = progressPercent(customer.spend, goals.vipSpend);
  const remaining = Math.max(0, goals.vipSpend - customer.spend);

  return (
    <section className="rounded-2xl border border-hairline bg-surface p-6 shadow-xs">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-ink-muted">
            <Crown className="size-4 text-gold" aria-hidden />
            {isVip ? "VIP Status" : "Become a VIP"}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            {isVip
              ? "You're a VIP. Perks are active on every order."
              : `Spend ${formatMoney(goals.vipSpend)} in a year to unlock VIP perks.`}
          </p>
        </div>
        {isVip ? (
          <span className="shrink-0 rounded-full bg-gold/12 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gold">
            Active
          </span>
        ) : null}
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-baseline justify-between text-xs">
          <span className="tabular font-semibold text-ink">{formatMoney(customer.spend)}</span>
          <span className="tabular text-ink-muted">{formatMoney(goals.vipSpend)}</span>
        </div>
        <ProgressBar
          percent={percent}
          label="Progress toward VIP status"
          barClassName={isVip ? "from-gold to-[#8f6528]" : undefined}
        />
        <p className="mt-2 text-xs text-ink-muted">
          {remaining > 0
            ? `${formatMoney(remaining)} of spend to go`
            : "Spend goal met for this year"}
        </p>
      </div>

      <ul className="mt-5 flex flex-wrap gap-1.5 border-t border-hairline pt-4">
        {VIP_PERKS.map((perk) => (
          <li
            key={perk}
            className="rounded-full bg-paper-deep px-2.5 py-1 text-[11px] text-ink-soft"
          >
            {perk}
          </li>
        ))}
      </ul>
    </section>
  );
}
