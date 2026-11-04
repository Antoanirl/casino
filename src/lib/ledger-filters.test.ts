import { describe, expect, it } from "vitest";
import {
  defaultFilters,
  gameFilters,
  ledgerFilterHref,
  ledgerGameMatch,
  ledgerTypesFor,
  parseLedgerFilters,
} from "@/lib/ledger-filters";

describe("ledger filters", () => {
  it("offers every game, all slots, and all games", () => {
    expect(gameFilters.map((f) => f.value)).toEqual([
      "all",
      "blackjack",
      "roulette",
      "slots",
      "classic",
      "gems",
      "adventure",
    ]);
  });

  it("reads valid filters from the URL", () => {
    expect(parseLedgerFilters({ game: "gems", kind: "wins", page: "3" })).toEqual({
      game: "gems",
      kind: "wins",
      page: 3,
    });
    expect(parseLedgerFilters({ game: ["roulette", "gems"] }).game).toBe("roulette");
  });

  it("falls back to defaults for anything unknown or malformed", () => {
    expect(parseLedgerFilters({})).toEqual(defaultFilters);
    expect(parseLedgerFilters({ game: "poker", kind: "jackpots", page: "0" })).toEqual(
      defaultFilters,
    );
    for (const page of ["-1", "2.5", "abc", "1e400", ""]) {
      expect(parseLedgerFilters({ page }).page).toBe(1);
    }
  });

  it("builds links that leave out defaults", () => {
    expect(ledgerFilterHref({})).toBe("/dashboard");
    expect(ledgerFilterHref({ game: "all", kind: "all", page: 1 })).toBe("/dashboard");
    expect(ledgerFilterHref({ game: "gems", page: 2 })).toBe("/dashboard?game=gems&page=2");
    expect(ledgerFilterHref({ kind: "bets" })).toBe("/dashboard?kind=bets");
  });

  it("round-trips through the URL", () => {
    const filters = { game: "adventure", kind: "bonuses" as const, page: 4 };
    const query = Object.fromEntries(new URL(ledgerFilterHref(filters), "http://x").searchParams);
    expect(parseLedgerFilters(query)).toEqual(filters);
  });

  it("maps filters to ledger game names and entry types", () => {
    expect(ledgerGameMatch("all")).toBeNull();
    expect(ledgerGameMatch("blackjack")).toEqual({ equals: "blackjack" });
    expect(ledgerGameMatch("gems")).toEqual({ equals: "slots:gems" });
    expect(ledgerGameMatch("slots")).toEqual({ startsWith: "slots:" });
    expect(ledgerTypesFor("all")).toBeNull();
    expect(ledgerTypesFor("wins")).toEqual(["PAYOUT", "REFUND"]);
  });
});
