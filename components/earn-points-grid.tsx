"use client";

import { CalendarCheck, Cake, PenLine, QrCode, UserCircle2, type LucideIcon } from "lucide-react";
import { useRewards } from "./rewards-provider";
import { formatPoints } from "@/lib/utils";

interface EarnAction {
  key: string;
  title: string;
  copy: string;
  cta: string;
  points: number;
  icon: LucideIcon;
  /** Wide cards get the full-width slot at the end of the grid. */
  wide?: boolean;
}

const ACTIONS: EarnAction[] = [
  {
    key: "birthday",
    title: "Add your birthday",
    copy: "Tell us the date and we'll send a reward every year.",
    cta: "Add birthday",
    points: 250,
    icon: Cake,
  },
  {
    key: "profile",
    title: "Complete your profile",
    copy: "Sizes and style preferences make your feed sharper.",
    cta: "Finish profile",
    points: 50,
    icon: UserCircle2,
  },
  {
    key: "checkin",
    title: "Daily check-in",
    copy: "Open the app once a day for a small points top-up.",
    cta: "Check in",
    points: 10,
    icon: CalendarCheck,
  },
  {
    key: "review",
    title: "Write a review",
    copy: "Share how something fits and help other shoppers.",
    cta: "Write review",
    points: 100,
    icon: PenLine,
  },
  {
    key: "app",
    title: "Get the mobile app",
    copy: "Scan the code to download and claim a one-time bonus.",
    cta: "Show QR code",
    points: 500,
    icon: QrCode,
    wide: true,
  },
];

function EarnCard({ action }: { action: EarnAction }) {
  const { addPoints, pending } = useRewards();
  const Icon = action.icon;

  return (
    <article
      className={
        "group relative flex flex-col overflow-hidden rounded-2xl bg-linear-to-br from-smoke-500 via-smoke-700 to-smoke-900 p-5 text-white shadow-md shadow-smoke-900/15" +
        (action.wide ? " sm:col-span-2" : "")
      }
    >
      {/* Soft highlight to keep the gradient from reading flat. */}
      <div
        className="pointer-events-none absolute -right-12 -top-12 size-32 rounded-full bg-white/10 blur-2xl"
        aria-hidden
      />

      <div className="flex items-start justify-between gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-white/15 ring-1 ring-white/20 backdrop-blur-sm">
          <Icon className="size-5" aria-hidden />
        </span>
        <span className="tabular rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold ring-1 ring-white/20">
          +{formatPoints(action.points)} pts
        </span>
      </div>

      <h3 className="mt-4 text-[15px] font-semibold tracking-tight">{action.title}</h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-white/75">{action.copy}</p>

      <button
        type="button"
        disabled={pending}
        onClick={() => void addPoints(action.points, action.title)}
        className="mt-4 w-fit rounded-full bg-white px-4 py-2 text-xs font-semibold text-smoke-800 transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {action.cta}
      </button>
    </article>
  );
}

export function EarnPointsGrid() {
  return (
    <section aria-labelledby="earn-heading">
      <div className="py-10 text-center">
        <h2
          id="earn-heading"
          className="font-serif text-3xl font-normal italic tracking-tight text-ink sm:text-4xl"
        >
          Want free points? It&rsquo;s easy
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-muted">
          Small actions, real rewards. Every one of these adds points to your balance instantly.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {ACTIONS.map((action) => (
          <EarnCard key={action.key} action={action} />
        ))}
      </div>
    </section>
  );
}
