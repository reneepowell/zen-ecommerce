import { notFound } from "next/navigation";
import {
  DEFAULT_CUSTOMER_ID,
  POINTS_GOAL,
  VIP_SPEND_GOAL,
  getCustomer,
  listCustomers,
} from "@/lib/db";
import { RewardsProvider } from "@/components/rewards-provider";
import { SiteHeader } from "@/components/site-header";
import { Sidebar } from "@/components/sidebar";
import { PointsCard } from "@/components/points-card";
import { VipCard } from "@/components/vip-card";
import { EarnPointsGrid } from "@/components/earn-points-grid";
import { DemoDrawer } from "@/components/demo-drawer";
import { SupportWidget } from "@/components/support-widget";
import { Toaster } from "@/components/toaster";

// Balances live in memory and change out of band, so never prerender this.
export const dynamic = "force-dynamic";

export default function Home() {
  const customer = getCustomer(DEFAULT_CUSTOMER_ID);
  if (!customer) notFound();

  return (
    <RewardsProvider
      initialCustomer={customer}
      initialCustomers={listCustomers()}
      goals={{ points: POINTS_GOAL, vipSpend: VIP_SPEND_GOAL }}
    >
      <SiteHeader />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
          <Sidebar />

          <div className="min-w-0">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold tracking-tight text-ink">
                Zen Ecommerce Rewards
              </h1>
              <p className="mt-1.5 text-sm text-ink-muted">
                Earn points on everything you do, then spend them however you like.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <PointsCard />
              <VipCard />
            </div>

            <EarnPointsGrid />
          </div>
        </div>
      </main>

      <footer className="border-t border-hairline py-6">
        <p className="mx-auto max-w-7xl px-4 text-xs text-ink-muted sm:px-6">
          Zen Ecommerce — demo environment. Balances reset when the server restarts.
        </p>
      </footer>

      {/* Demo drawer sits bottom-left; the support widget owns bottom-right. */}
      <DemoDrawer />
      <SupportWidget />
      <Toaster />
    </RewardsProvider>
  );
}
