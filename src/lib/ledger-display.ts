import { games } from "@/lib/games";
import { formatCredits } from "@/lib/money";

/** Display helpers for ledger entries. Shared by the homepage ledger and, later, the dashboard. */

export type LedgerEntryKind = "SIGNUP_BONUS" | "BET" | "PAYOUT" | "REFUND" | "ADJUSTMENT";

export interface LedgerRow {
  id: string;
  type: LedgerEntryKind;
  /** Signed minor units. */
  amount: number;
  /** Minor units. */
  balanceAfter: number;
  /** "blackjack", "roulette", "slots:classic"... */
  game?: string | null;
  createdAt: Date;
}

const typeLabels: Record<LedgerEntryKind, string> = {
  SIGNUP_BONUS: "Signup bonus",
  BET: "Bet",
  PAYOUT: "Win",
  REFUND: "Refund",
  ADJUSTMENT: "Adjustment",
};

export function gameName(game: string | null | undefined): string | undefined {
  if (!game) return undefined;
  const slug = game.startsWith("slots:") ? game.slice("slots:".length) : game;
  return games.find((g) => g.slug === slug)?.name;
}

/** "Blackjack bet", "Roulette win", "Signup bonus". */
export function entryLabel(row: Pick<LedgerRow, "type" | "game">): string {
  const name = gameName(row.game);
  const label = typeLabels[row.type];
  return name ? `${name} ${label.toLowerCase()}` : label;
}

/** Signed amount with a real minus sign, e.g. "+50", "−25.50". */
export function formatSignedCredits(minor: number): string {
  const sign = minor < 0 ? "−" : "+";
  return `${sign}${formatCredits(Math.abs(minor))}`;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Short ledger-style date: "Just now", "12 min ago", "3 h ago", "14 Oct". */
export function formatEntryDate(date: Date, now: Date = new Date()): string {
  const diff = now.getTime() - date.getTime();
  if (diff < MINUTE) return "Just now";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)} min ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)} h ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

/** Example page shown to visitors who aren't signed in. Amounts in minor units. */
export function sampleLedger(now: Date = new Date()): LedgerRow[] {
  const at = (minutesAgo: number) => new Date(now.getTime() - minutesAgo * MINUTE);
  const rows: Omit<LedgerRow, "balanceAfter">[] = [
    { id: "s1", type: "SIGNUP_BONUS", amount: 100_000, createdAt: at(52) },
    { id: "s2", type: "BET", game: "blackjack", amount: -2_500, createdAt: at(41) },
    { id: "s3", type: "PAYOUT", game: "blackjack", amount: 6_250, createdAt: at(40) },
    { id: "s4", type: "BET", game: "roulette", amount: -1_000, createdAt: at(23) },
    { id: "s5", type: "BET", game: "slots:gems", amount: -200, createdAt: at(9) },
    { id: "s6", type: "PAYOUT", game: "slots:gems", amount: 1_600, createdAt: at(9) },
  ];
  let balance = 0;
  return rows.map((row) => {
    balance += row.amount;
    return { ...row, balanceAfter: balance };
  });
}
