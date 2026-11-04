import { games } from "@/lib/games";

/**
 * Filters for the full ledger history on the dashboard. They live in the URL
 * (?game=gems&kind=wins&page=2), so a filtered view can be bookmarked or shared and
 * works without JavaScript. Safe to use on both client and server.
 */

export interface FilterOption<T extends string> {
  value: T;
  label: string;
}

/** "all", "blackjack", "roulette", "slots" (every slot game), or one slot game's slug. */
export type GameFilter = string;

export type KindFilter = "all" | "bets" | "wins" | "bonuses";

export const gameFilters: readonly FilterOption<GameFilter>[] = [
  { value: "all", label: "All games" },
  ...games
    .filter((game) => game.category !== "slots")
    .map((game) => ({ value: game.slug, label: game.name })),
  { value: "slots", label: "All slots" },
  ...games
    .filter((game) => game.category === "slots")
    .map((game) => ({ value: game.slug, label: game.name })),
];

export const kindFilters: readonly FilterOption<KindFilter>[] = [
  { value: "all", label: "Everything" },
  { value: "bets", label: "Bets" },
  { value: "wins", label: "Wins and refunds" },
  { value: "bonuses", label: "Bonuses" },
];

export interface LedgerFilters {
  game: GameFilter;
  kind: KindFilter;
  /** 1-based. */
  page: number;
}

export const defaultFilters: LedgerFilters = { game: "all", kind: "all", page: 1 };

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Reads filters from URL search params. Anything unknown or malformed falls back to the default. */
export function parseLedgerFilters(params: SearchParams): LedgerFilters {
  const game = first(params.game);
  const kind = first(params.kind);
  const page = Number(first(params.page));
  return {
    game: gameFilters.some((f) => f.value === game) ? game! : defaultFilters.game,
    kind: kindFilters.some((f) => f.value === kind) ? (kind as KindFilter) : defaultFilters.kind,
    page: Number.isSafeInteger(page) && page >= 1 ? page : defaultFilters.page,
  };
}

/** Dashboard URL for a set of filters, leaving out anything at its default. */
export function ledgerFilterHref(filters: Partial<LedgerFilters>, base = "/dashboard"): string {
  const query = new URLSearchParams();
  const merged = { ...defaultFilters, ...filters };
  if (merged.game !== defaultFilters.game) query.set("game", merged.game);
  if (merged.kind !== defaultFilters.kind) query.set("kind", merged.kind);
  if (merged.page !== defaultFilters.page) query.set("page", String(merged.page));
  const search = query.toString();
  return search ? `${base}?${search}` : base;
}

/** The `game` values a filter matches in the ledger ("slots:gems"), or a prefix for all slots. */
export function ledgerGameMatch(
  game: GameFilter,
): { equals: string } | { startsWith: string } | null {
  if (game === "all") return null;
  if (game === "slots") return { startsWith: "slots:" };
  const entry = games.find((g) => g.slug === game);
  if (!entry) return null;
  return { equals: entry.category === "slots" ? `slots:${entry.slug}` : entry.slug };
}

/** Ledger entry types a kind filter matches; null means every type. */
export function ledgerTypesFor(kind: KindFilter): string[] | null {
  switch (kind) {
    case "bets":
      return ["BET"];
    case "wins":
      return ["PAYOUT", "REFUND"];
    case "bonuses":
      return ["SIGNUP_BONUS", "ADJUSTMENT"];
    default:
      return null;
  }
}
