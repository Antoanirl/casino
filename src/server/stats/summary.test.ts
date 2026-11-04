import { describe, expect, it } from "vitest";
import { formatRate, ledgerGames, summarise } from "@/server/stats/summary";

describe("statistics summary", () => {
  it("lists every game, in catalogue order, even before any play", () => {
    const { games, total } = summarise([]);
    expect(games.map((g) => g.game)).toEqual(ledgerGames.map((g) => g.game));
    expect(games.map((g) => g.game)).toEqual([
      "blackjack",
      "roulette",
      "slots:classic",
      "slots:gems",
      "slots:adventure",
    ]);
    expect(games.every((g) => g.rounds === 0 && g.returnRate === null && g.winRate === null)).toBe(
      true,
    );
    expect(total).toMatchObject({ rounds: 0, net: 0, returnRate: null, name: "All games" });
  });

  it("works out net result, return and win rate per game and overall", () => {
    const { games, total } = summarise([
      {
        game: "roulette",
        rounds: 4,
        staked: 4_000,
        returned: 3_600,
        roundsWon: 1,
        biggestWin: 2_600,
      },
      {
        game: "slots:gems",
        rounds: 10,
        staked: 1_000,
        returned: 1_500,
        roundsWon: 3,
        biggestWin: 900,
      },
    ]);
    const roulette = games.find((g) => g.game === "roulette")!;
    expect(roulette).toMatchObject({ name: "Roulette", net: -400, returnRate: 0.9, winRate: 0.25 });
    const gems = games.find((g) => g.game === "slots:gems")!;
    expect(gems).toMatchObject({ name: "Gem Slots", net: 500, returnRate: 1.5, winRate: 0.3 });

    expect(total).toMatchObject({
      rounds: 14,
      staked: 5_000,
      returned: 5_100,
      net: 100,
      roundsWon: 4,
      biggestWin: 2_600,
    });
    expect(Math.abs(total.returnRate! - 1.02)).toBeLessThan(1e-12);
  });

  it("ignores games that aren't in the catalogue", () => {
    const { games, total } = summarise([
      { game: "poker", rounds: 1, staked: 100, returned: 0, roundsWon: 0, biggestWin: 0 },
    ]);
    expect(games.some((g) => g.game === "poker")).toBe(false);
    expect(total.rounds).toBe(0);
  });

  it("formats rates for display", () => {
    expect(formatRate(null)).toBe("—");
    expect(formatRate(0.961)).toBe("96.1%");
    expect(formatRate(1.5)).toBe("150.0%");
  });
});
