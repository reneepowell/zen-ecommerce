export type Tier = "Member" | "VIP";

export type UpdateAction = "add" | "set";

export type ActivitySource = "seed" | "ui" | "api" | "webhook";

export interface ActivityEntry {
  id: string;
  label: string;
  /** Signed change in points, when the entry touched the points balance. */
  points?: number;
  /** Signed change in wallet dollars, when the entry touched the wallet. */
  amount?: number;
  at: string;
  source: ActivitySource;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  initials: string;
  points: number;
  wallet: number;
  tier: Tier;
  joined: string;
  /** Lifetime spend in dollars. Drives progress toward VIP status. */
  spend: number;
  activity: ActivityEntry[];
}

/** Lightweight shape used to populate the profile switcher. */
export interface CustomerSummary {
  id: string;
  name: string;
  initials: string;
  tier: Tier;
}
