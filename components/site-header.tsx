"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, CreditCard, Search, ShoppingBag, Star } from "lucide-react";
import { useRewards } from "./rewards-provider";
import { cn, formatMoney, formatPoints } from "@/lib/utils";

function ProfileMenu() {
  const { customer, customers, selectCustomer } = useRewards();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape, the usual dropdown affordances.
  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-hairline bg-surface py-1 pl-1 pr-2.5 text-sm transition hover:border-smoke-300 hover:shadow-sm"
      >
        <span className="grid size-7 place-items-center rounded-full bg-linear-to-br from-smoke-500 to-smoke-700 text-[11px] font-semibold text-white">
          {customer.initials}
        </span>
        <span className="hidden font-medium text-ink sm:inline">{customer.name}</span>
        <ChevronDown
          className={cn("size-4 text-ink-muted transition", open && "rotate-180")}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-hairline bg-surface shadow-xl shadow-smoke-900/10"
        >
          <p className="border-b border-hairline px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            Switch demo profile
          </p>
          {customers.map((c) => {
            const active = c.id === customer.id;
            return (
              <button
                key={c.id}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  selectCustomer(c.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition hover:bg-paper",
                  active && "bg-paper-deep",
                )}
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-smoke-100 text-[11px] font-semibold text-smoke-700">
                  {c.initials}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-ink">{c.name}</span>
                  <span className="block font-mono text-[11px] text-ink-muted">{c.id}</span>
                </span>
                {c.tier === "VIP" ? (
                  <span className="rounded-full bg-gold/12 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-gold">
                    VIP
                  </span>
                ) : null}
                {active ? <Check className="size-4 shrink-0 text-mint" aria-hidden /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function SiteHeader() {
  const { customer } = useRewards();

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-linear-to-br from-smoke-600 to-smoke-900 text-white shadow-sm">
            <ShoppingBag className="size-4" aria-hidden />
          </span>
          <span className="whitespace-nowrap text-[17px] font-semibold tracking-tight text-ink">
            Zen Ecommerce
          </span>
        </Link>

        <nav className="ml-6 hidden items-center gap-5 text-sm text-ink-soft lg:flex">
          {["Shop", "New In", "Collections", "Rewards"].map((item) => (
            <Link
              key={item}
              href="/"
              className={cn(
                "transition hover:text-ink",
                item === "Rewards" && "font-medium text-ink",
              )}
            >
              {item}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {/* Live counters — these tick up when the API is called. */}
          <div
            className="flex items-center gap-1.5 rounded-full border border-hairline bg-surface px-3 py-1.5 text-sm shadow-xs"
            title="Points balance"
          >
            <Star className="size-4 text-gold" aria-hidden />
            <span className="tabular font-semibold text-ink">{formatPoints(customer.points)}</span>
            <span className="sr-only">points</span>
          </div>
          <div
            className="flex items-center gap-1.5 rounded-full border border-hairline bg-surface px-3 py-1.5 text-sm shadow-xs"
            title="Wallet balance"
          >
            <CreditCard className="size-4 text-mint" aria-hidden />
            <span className="tabular font-semibold text-ink">{formatMoney(customer.wallet)}</span>
            <span className="sr-only">wallet balance</span>
          </div>

          <button
            type="button"
            className="hidden rounded-full border border-hairline bg-surface p-2 text-ink-soft transition hover:text-ink sm:block"
            aria-label="Search"
          >
            <Search className="size-4" aria-hidden />
          </button>

          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}
