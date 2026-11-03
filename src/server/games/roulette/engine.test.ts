import { describe, expect, it } from "vitest";
import {
  InvalidBetsError,
  LIMITS,
  POCKET_COUNT,
  WHEEL_ORDER,
  normalizeBets,
  payoutRatio,
  pocketColor,
  settleSpin,
  spotWins,
  type Bet,
  type BetSpot,
} from "@/server/games/roulette/engine";

const ONE = 100; // 1 credit in minor units
const pockets = Array.from({ length: POCKET_COUNT }, (_, i) => i);

const allSpots: BetSpot[] = [
  ...pockets.map((number) => ({ kind: "straight" as const, number })),
  { kind: "red" },
  { kind: "black" },
  { kind: "odd" },
  { kind: "even" },
  ...([1, 2, 3] as const).map((dozen) => ({ kind: "dozen" as const, dozen })),
  ...([1, 2, 3] as const).map((column) => ({ kind: "column" as const, column })),
];

describe("the wheel", () => {
  it("has every pocket exactly once", () => {
    expect([...WHEEL_ORDER].sort((a, b) => a - b)).toEqual(pockets);
  });

  it("has 18 red, 18 black and one green pocket", () => {
    const colors = pockets.map(pocketColor);
    expect(colors.filter((c) => c === "red")).toHaveLength(18);
    expect(colors.filter((c) => c === "black")).toHaveLength(18);
    expect(colors.filter((c) => c === "green")).toEqual(["green"]);
    expect(pocketColor(0)).toBe("green");
    expect(pocketColor(1)).toBe("red");
    expect(pocketColor(2)).toBe("black");
  });

  it("alternates red and black around the wheel", () => {
    for (let i = 1; i < WHEEL_ORDER.length - 1; i++) {
      expect(pocketColor(WHEEL_ORDER[i]!)).not.toBe(pocketColor(WHEEL_ORDER[i + 1]!));
    }
  });
});

describe("which spots win", () => {
  it("covers each number exactly once with dozens and once with columns", () => {
    for (const pocket of pockets.slice(1)) {
      const dozens = ([1, 2, 3] as const).filter((dozen) =>
        spotWins({ kind: "dozen", dozen }, pocket),
      );
      const columns = ([1, 2, 3] as const).filter((column) =>
        spotWins({ kind: "column", column }, pocket),
      );
      expect(dozens).toHaveLength(1);
      expect(columns).toHaveLength(1);
    }
    expect(spotWins({ kind: "dozen", dozen: 1 }, 12)).toBe(true);
    expect(spotWins({ kind: "dozen", dozen: 2 }, 13)).toBe(true);
    expect(spotWins({ kind: "column", column: 1 }, 34)).toBe(true);
    expect(spotWins({ kind: "column", column: 3 }, 36)).toBe(true);
  });

  it("makes every outside bet lose on zero", () => {
    for (const spot of allSpots.filter((s) => s.kind !== "straight")) {
      expect(spotWins(spot, 0)).toBe(false);
    }
    expect(spotWins({ kind: "straight", number: 0 }, 0)).toBe(true);
  });

  it("treats odd and even by the number, not the colour", () => {
    expect(spotWins({ kind: "even" }, 2)).toBe(true);
    expect(spotWins({ kind: "odd" }, 35)).toBe(true);
    expect(spotWins({ kind: "odd" }, 36)).toBe(false);
  });
});

describe("payouts", () => {
  it("pays 35 to 1 on a number, 2 to 1 on dozens and columns, 1 to 1 on the rest", () => {
    expect(
      settleSpin([{ spot: { kind: "straight", number: 17 }, amount: ONE }], 17).totalPayout,
    ).toBe(36 * ONE);
    expect(settleSpin([{ spot: { kind: "dozen", dozen: 2 }, amount: ONE }], 17).totalPayout).toBe(
      3 * ONE,
    );
    expect(settleSpin([{ spot: { kind: "black" }, amount: ONE }], 17).totalPayout).toBe(2 * ONE);
    expect(settleSpin([{ spot: { kind: "red" }, amount: ONE }], 17).totalPayout).toBe(0);
  });

  it("settles several bets at once", () => {
    const bets: Bet[] = [
      { spot: { kind: "straight", number: 0 }, amount: 2 * ONE },
      { spot: { kind: "red" }, amount: 10 * ONE },
      { spot: { kind: "column", column: 2 }, amount: 5 * ONE },
    ];
    const zero = settleSpin(bets, 0);
    expect(zero.color).toBe("green");
    expect(zero.totalStake).toBe(17 * ONE);
    expect(zero.totalPayout).toBe(72 * ONE); // only the 0 wins: 2 x 36
    expect(zero.results.map((r) => r.won)).toEqual([true, false, false]);
  });

  it("gives the house exactly 1/37 on every kind of bet", () => {
    // Over all 37 equally likely pockets, each bet returns 36/37 of its stake on average.
    for (const spot of allSpots) {
      const returned = pockets.reduce(
        (sum, pocket) => sum + settleSpin([{ spot, amount: 37 * ONE }], pocket).totalPayout,
        0,
      );
      expect(returned / POCKET_COUNT).toBe(36 * ONE);
      expect(payoutRatio(spot)).toBeGreaterThan(0);
    }
  });
});

describe("table limits", () => {
  it("merges chips placed on the same spot", () => {
    const bets = normalizeBets([
      { spot: { kind: "red" }, amount: 5 * ONE },
      { spot: { kind: "straight", number: 7 }, amount: ONE },
      { spot: { kind: "red" }, amount: 10 * ONE },
    ]);
    expect(bets).toEqual([
      { spot: { kind: "red" }, amount: 15 * ONE },
      { spot: { kind: "straight", number: 7 }, amount: ONE },
    ]);
  });

  it.each<[string, Bet[]]>([
    ["no bets", []],
    ["a fraction of a credit", [{ spot: { kind: "red" }, amount: 150 }]],
    ["a negative amount", [{ spot: { kind: "red" }, amount: -ONE }]],
    ["number 37", [{ spot: { kind: "straight", number: 37 }, amount: ONE }]],
    ["dozen 4", [{ spot: { kind: "dozen", dozen: 4 as 1 }, amount: ONE }]],
    ["an unknown spot", [{ spot: { kind: "high" } as unknown as BetSpot, amount: ONE }]],
    ["over 500 on one spot", [{ spot: { kind: "red" }, amount: LIMITS.maxBet + ONE }]],
    [
      "over 1,000 in total",
      [
        { spot: { kind: "red" }, amount: LIMITS.maxBet },
        { spot: { kind: "black" }, amount: LIMITS.maxBet },
        { spot: { kind: "odd" }, amount: ONE },
      ],
    ],
  ])("rejects %s", (_name, bets) => {
    expect(() => normalizeBets(bets)).toThrow(InvalidBetsError);
  });

  it("rejects a pocket that doesn't exist", () => {
    expect(() => settleSpin([{ spot: { kind: "red" }, amount: ONE }], 37)).toThrow(RangeError);
  });
});
