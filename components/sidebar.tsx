"use client";

import Link from "next/link";
import {
  Gift,
  Heart,
  MapPin,
  MessageCircle,
  Package,
  Settings,
  Sparkles,
  User,
} from "lucide-react";
import { useRewards } from "./rewards-provider";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Zen Ecommerce Rewards", icon: Sparkles, active: true },
  { label: "My Orders", icon: Package, active: false },
  { label: "Wishlist", icon: Heart, active: false },
  { label: "Addresses", icon: MapPin, active: false },
  { label: "Gift Cards", icon: Gift, active: false },
  { label: "Account Details", icon: User, active: false },
  { label: "Settings", icon: Settings, active: false },
];

export function Sidebar() {
  const { customer } = useRewards();

  return (
    <aside className="lg:sticky lg:top-24 lg:h-fit">
      <div className="rounded-2xl border border-hairline bg-surface p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-linear-to-br from-smoke-500 to-smoke-800 text-sm font-semibold text-white">
            {customer.initials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold tracking-tight text-ink">
              Hi, {customer.name}
            </p>
            <p className="mt-0.5 text-xs text-ink-muted">Member Since {customer.joined}</p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 border-t border-hairline pt-4">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
              customer.tier === "VIP"
                ? "bg-gold/12 text-gold"
                : "bg-smoke-100 text-smoke-700",
            )}
          >
            {customer.tier}
          </span>
          <span className="font-mono text-[11px] text-ink-muted">{customer.id}</span>
        </div>
      </div>

      <nav className="mt-4 rounded-2xl border border-hairline bg-surface p-2 shadow-xs">
        {NAV_ITEMS.map(({ label, icon: Icon, active }) => (
          <Link
            key={label}
            href="/"
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
              active
                ? "bg-linear-to-r from-smoke-700 to-smoke-800 font-semibold text-white shadow-sm"
                : "text-ink-soft hover:bg-paper hover:text-ink",
            )}
          >
            <Icon className={cn("size-4 shrink-0", active ? "text-white" : "text-ink-muted")} aria-hidden />
            <span className="truncate">{label}</span>
          </Link>
        ))}
      </nav>

      {/* Support entry point — the "floating" chat affordance for the sidebar. */}
      <button
        type="button"
        className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-hairline bg-surface p-4 text-left shadow-xs transition hover:border-smoke-300 hover:shadow-sm"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-linear-to-br from-smoke-600 to-smoke-900 text-white">
          <MessageCircle className="size-4.5" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-medium text-ink">Need help?</span>
          <span className="block text-xs text-ink-muted">Chat with our team</span>
        </span>
      </button>
    </aside>
  );
}
