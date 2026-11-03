import { describe, expect, it } from "vitest";
import { randomInt } from "@/server/rng";
import {
  InvalidSlotBetError,
  evaluateLine,
  evaluateSpin,
  theoreticalRtp,
  validateConfig,
  type SlotConfig,
} from "@/server/games/slots/engine";
import { classicSlots } from "@/server/games/slots/games/classic";
import { slotConfigs } from "@/server/games/slots/games";

/** Mean pays (in multiples of the bet) and hit rate over every possible combination of stops. */
function enumerate(config: SlotConfig) {
  let total = 0;
  let hits = 0;
  let count = 0;
  const stops = new Array<number>(config.reels.length).fill(0);
  const visit = (reel: number) => {
    if (reel === config.reels.length) {
      const pays = evaluateSpin(config, stops, config.bets[0]!).pays;
      total += pays;
      if (pays > 0) hits++;
      count++;
      return;
    }
    for (let stop = 0; stop < config.reels[reel]!.length; stop++) {
      stops[reel] = stop;
      visit(reel + 1);
    }
  };
  visit(0);
  return { rtp: total / count / 100, hitRate: hits / count };
}

/** A tiny game with a wild and a scatter, to test the rules Classic Slots doesn't use. */
const toy: SlotConfig = {
  slug: "toy",
  name: "Toy",
  rows: 3,
  symbols: [
    { id: "a", name: "A", kind: "normal" },
    { id: "b", name: "B", kind: "normal" },
    { id: "w", name: "Wild", kind: "wild" },
    { id: "s", name: "Scatter", kind: "scatter" },
  ],
  reels: [
    ["a", "b", "w", "s", "a", "b", "a", "b"],
    ["b", "a", "s", "w", "a", "b", "b", "a"],
    ["a", "s", "b", "a", "w", "b", "a", "b"],
  ],
  paylines: [
    [1, 1, 1],
    [0, 0, 0],
    [2, 2, 2],
  ],
  linePays: { a: { 3: 300 }, b: { 2: 50, 3: 200 }, w: { 3: 1_000 } },
  scatterPays: { 2: 100, 3: 2_000 },
  bets: [100, 500],
};

describe("slot configs", () => {
  it.each(Object.values(slotConfigs).map((c) => [c.slug, c] as const))(
    "%s is internally consistent",
    (_slug, config) => {
      expect(validateConfig(config)).toEqual([]);
    },
  );

  it("Classic Slots returns exactly 95.70% with a 25.6% hit rate", () => {
    const rtp = theoreticalRtp(classicSlots);
    expect(rtp).toBeGreaterThan(0.94);
    expect(rtp).toBeLessThan(0.97);
    expect(rtp.toFixed(4)).toBe("0.9570");

    // The fast formula must agree with brute force over all 32,768 stop combinations.
    const exact = enumerate(classicSlots);
    expect(Math.abs(exact.rtp - rtp)).toBeLessThan(1e-12);
    expect(exact.hitRate.toFixed(3)).toBe("0.256");
  });
});

describe("line rules", () => {
  it("pays matching symbols from the left only", () => {
    expect(evaluateLine(toy, ["a", "a", "a"])).toEqual({ symbol: "a", count: 3, pays: 300 });
    expect(evaluateLine(toy, ["b", "b", "a"])).toEqual({ symbol: "b", count: 2, pays: 50 });
    expect(evaluateLine(toy, ["a", "b", "b"])).toBeNull();
  });

  it("lets a wild stand in for a normal symbol", () => {
    expect(evaluateLine(toy, ["w", "a", "a"])).toEqual({ symbol: "a", count: 3, pays: 300 });
    expect(evaluateLine(toy, ["a", "w", "w"])).toEqual({ symbol: "a", count: 3, pays: 300 });
  });

  it("pays a run of wilds as wilds when that is worth more", () => {
    expect(evaluateLine(toy, ["w", "w", "w"])).toEqual({ symbol: "w", count: 3, pays: 1_000 });
  });

  it("never lets a scatter take part in a line", () => {
    expect(evaluateLine(toy, ["s", "a", "a"])).toBeNull();
    expect(evaluateLine(toy, ["a", "s", "a"])).toBeNull();
    expect(evaluateLine(toy, ["w", "s", "a"])).toBeNull();
  });

  it("pays scatters anywhere on screen", () => {
    // These stops put an "s" in the window of every reel.
    const outcome = evaluateSpin(toy, [1, 1, 0], 100);
    expect(outcome.window.map((column) => column.includes("s"))).toEqual([true, true, true]);
    expect(outcome.scatterWin).toMatchObject({ symbol: "s", count: 3, pays: 2_000 });
  });

  it("computes the exact RTP with wilds and scatters too", () => {
    const exact = enumerate(toy);
    expect(Math.abs(exact.rtp - theoreticalRtp(toy))).toBeLessThan(1e-12);
  });
});

describe("spins", () => {
  it("pays three sevens on the middle line at 100x the bet", () => {
    // Sevens sit at index 3, 6 and 11 on the three reels; the middle row is stop + 1.
    const outcome = evaluateSpin(classicSlots, [2, 5, 10], 500);
    expect(outcome.window.map((column) => column[1])).toEqual(["seven", "seven", "seven"]);
    expect(outcome.lineWins).toContainEqual({
      line: 0,
      symbol: "seven",
      count: 3,
      pays: 10_000,
      cells: [
        [0, 1],
        [1, 1],
        [2, 1],
      ],
    });
    expect(outcome.payout).toBe((500 * outcome.pays) / 100);
    expect(outcome.payout).toBeGreaterThanOrEqual(50_000);
  });

  it("rejects bets and stops that aren't allowed", () => {
    expect(() => evaluateSpin(classicSlots, [0, 0, 2], 150)).toThrow(InvalidSlotBetError);
    expect(() => evaluateSpin(classicSlots, [0, 0, 32], 100)).toThrow(RangeError);
    expect(() => evaluateSpin(classicSlots, [0, 0], 100)).toThrow(RangeError);
  });

  it("always pays a whole number of minor units", () => {
    for (let i = 0; i < 2_000; i++) {
      const stops = classicSlots.reels.map((strip) => randomInt(0, strip.length));
      for (const bet of classicSlots.bets) {
        expect(Number.isInteger(evaluateSpin(classicSlots, stops, bet).payout)).toBe(true);
      }
    }
  });
});

describe("simulation", () => {
  it("1,000,000 random spins return what the maths says, within statistical error", () => {
    const n = 1_000_000;
    const rtp = theoreticalRtp(classicSlots);
    let sum = 0;
    let sumSquares = 0;
    for (let i = 0; i < n; i++) {
      const stops = classicSlots.reels.map((strip) => randomInt(0, strip.length));
      const x = evaluateSpin(classicSlots, stops, 100).pays / 100;
      sum += x;
      sumSquares += x * x;
    }
    const mean = sum / n;
    const sd = Math.sqrt(sumSquares / n - mean * mean);
    // Five standard errors: a correct engine fails this about once in 3.5 million runs.
    expect(Math.abs(mean - rtp)).toBeLessThan((5 * sd) / Math.sqrt(n));
  }, 60_000);
});
