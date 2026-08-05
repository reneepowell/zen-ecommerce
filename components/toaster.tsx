"use client";

import { useEffect } from "react";
import { AlertCircle, CreditCard, Info, Star, X } from "lucide-react";
import { useRewards, type Toast } from "./rewards-provider";
import { cn } from "@/lib/utils";

const TOAST_MS = 4200;

const ICONS = {
  points: Star,
  wallet: CreditCard,
  info: Info,
  error: AlertCircle,
} as const;

const ACCENTS = {
  points: "text-gold",
  wallet: "text-mint",
  info: "text-smoke-500",
  error: "text-red-600",
} as const;

function ToastCard({ toast }: { toast: Toast }) {
  const { dismissToast } = useRewards();
  const Icon = ICONS[toast.variant];

  useEffect(() => {
    const timer = setTimeout(() => dismissToast(toast.id), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast.id, dismissToast]);

  return (
    <div
      className="animate-toast-in flex w-80 items-start gap-3 rounded-xl border border-hairline bg-surface/95 p-3.5 shadow-lg shadow-smoke-900/10 backdrop-blur"
      role="status"
    >
      <Icon className={cn("mt-0.5 size-5 shrink-0", ACCENTS[toast.variant])} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold tracking-tight text-ink">{toast.title}</p>
        {toast.detail ? (
          <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{toast.detail}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => dismissToast(toast.id)}
        className="rounded-md p-1 text-ink-muted transition hover:bg-paper-deep hover:text-ink"
        aria-label="Dismiss notification"
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}

export function Toaster() {
  const { toasts } = useRewards();

  return (
    <div
      /* Sits below the header so the live points/wallet counters stay visible. */
      className="pointer-events-none fixed left-1/2 top-20 z-60 flex -translate-x-1/2 flex-col items-center gap-2 sm:left-auto sm:right-6 sm:translate-x-0 sm:items-end"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastCard toast={toast} />
        </div>
      ))}
    </div>
  );
}
