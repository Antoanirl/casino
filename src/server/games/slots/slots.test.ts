import { describe, expect, it } from "vitest";
import { randomInt } from "@/server/rng";
import {
  InvalidSlotBetError,
  evaluateLine,
  evaluateSpin,
  freeSpinsChance,
  settleRound,
  theoreticalRtp,
  validateConfig,
  type SlotConfig,
} from "@/server/games/slots/engine";
import { adventureSlots } from "@/server/games/slots/games/adventure";
import { classicSlots } from "@/server/games/slots/games/classic";
import { gemSlots } from "@/server/games/slots/games/gems";
import { slotConfigs } from "@/server/games/slots/games";

/** Mean pays (in multiples of the bet) and hit rate over every possible combination of stops. */
function enumerate(config: SlotConfig, freeSpin = false) {
  let total = 0;
  let hits = 0;
  let count = 0;
  let awarded = 0;
  const stops = new Array<number>(config.reels.length).fill(0);
  const visit = (reel: number) => {
    if (reel === config.reels.length) {
      const outcome = evaluateSpin(config, stops, config.bets[0]!, freeSpin);
      const pays = outcome.pays;
      awarded += outcome.freeSpinsAwarded;
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
  return { rtp: total / count / 100, hitRate: hits / count, meanFreeSpins: awarded / count };
}

/** Runs n random paid rounds (base spin plus any free spins) and checks the mean against the maths. */
function simulate(config: SlotConfig, n: number) {
  const draw = () => config.reels.map((strip) => randomInt(0, strip.length));
  let sum = 0;
  let sumSquares = 0;
  for (let i = 0; i < n; i++) {
    const first = draw();
    const awarded = evaluateSpin(config, first, 100).freeSpinsAwarded;
    const stops = [first, ...Array.from({ length: awarded }, draw)];
    const x = settleRound(config, stops, 100).payout / 100;
    sum += x;
    sumSquares += x * x;
  }
  const mean = sum / n;
  const sd = Math.sqrt(sumSquares / n - mean * mean);
  return { mean, standardError: sd / Math.sqrt(n) };
}

/** Stops that show the scatter on the top row of the given reels and none anywhere else. */
function stopsWithScatters(
  config: SlotConfig,
  scatter: string,
  reels: readonly number[],
): number[] {
  return config.reels.map((strip, r) => {
    const shows = (stop: number) =>
      Array.from({ length: config.rows }, (_, row) => strip[(stop + row) % strip.length]);
    const stop = strip.findIndex((_, i) =>
      reels.includes(r)
        ? strip[i] === scatter && shows(i).filter((id) => id === scatter).length === 1
        : !shows(i).includes(scatter),
    );
    if (stop < 0) throw new Error(`no suitable stop on reel ${r}`);
    return stop;
  });
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

/** The toy game with a 3x wild and a free-spins bonus. */
const toyBonus: SlotConfig = {
  ...toy,
  slug: "toy-bonus",
  symbols: toy.symbols.map((s) => (s.id === "w" ? { ...s, multiplier: 3 } : s)),
  freeSpins: { triggers: { 2: 1, 3: 4 }, multiplier: 2 },
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

  it("Gem Slots returns exactly 95.70%", () => {
    expect(theoreticalRtp(gemSlots).toFixed(4)).toBe("0.9570");
  });

  it("Adventure Slots returns exactly 96.10%, free spins included", () => {
    expect(theoreticalRtp(adventureSlots).toFixed(4)).toBe("0.9610");
    // About one paid round in 40 starts free spins.
    expect(1 / freeSpinsChance(adventureSlots)).toBeGreaterThan(38);
    expect(1 / freeSpinsChance(adventureSlots)).toBeLessThan(41);
  });
});

describe("line rules", () => {
  it("pays matching symbols from the left only", () => {
    expect(evaluateLine(toy, ["a", "a", "a"])).toEqual({
      symbol: "a",
      count: 3,
      pays: 300,
      wildMultiplier: 1,
    });
    expect(evaluateLine(toy, ["b", "b", "a"])).toEqual({
      symbol: "b",
      count: 2,
      pays: 50,
      wildMultiplier: 1,
    });
    expect(evaluateLine(toy, ["a", "b", "b"])).toBeNull();
  });

  it("lets a wild stand in for a normal symbol", () => {
    expect(evaluateLine(toy, ["w", "a", "a"])).toEqual({
      symbol: "a",
      count: 3,
      pays: 300,
      wildMultiplier: 1,
    });
    expect(evaluateLine(toy, ["a", "w", "w"])).toEqual({
      symbol: "a",
      count: 3,
      pays: 300,
      wildMultiplier: 1,
    });
  });

  it("pays a run of wilds as wilds when that is worth more", () => {
    expect(evaluateLine(toy, ["w", "w", "w"])).toEqual({
      symbol: "w",
      count: 3,
      pays: 1_000,
      wildMultiplier: 1,
    });
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

describe("wild multipliers", () => {
  it("multiplies a win the wild takes part in, once per line", () => {
    expect(evaluateLine(toyBonus, ["w", "a", "a"])).toEqual({
      symbol: "a",
      count: 3,
      pays: 900,
      wildMultiplier: 3,
    });
    expect(evaluateLine(toyBonus, ["a", "w", "w"])).toEqual({
      symbol: "a",
      count: 3,
      pays: 900,
      wildMultiplier: 3,
    });
    expect(evaluateLine(toyBonus, ["a", "a", "a"])).toEqual({
      symbol: "a",
      count: 3,
      pays: 300,
      wildMultiplier: 1,
    });
  });

  it("pays a run of wilds alone at the wild's own price, unmultiplied", () => {
    expect(evaluateLine(toyBonus, ["w", "w", "w"])).toEqual({
      symbol: "w",
      count: 3,
      pays: 1_000,
      wildMultiplier: 1,
    });
  });

  it("doubles Gem Slots wins that use a prism", () => {
    expect(evaluateLine(gemSlots, ["prism", "ruby", "ruby", "topaz", "topaz"])).toEqual({
      symbol: "ruby",
      count: 3,
      pays: 130,
      wildMultiplier: 2,
    });
    expect(evaluateLine(gemSlots, ["prism", "prism", "prism", "prism", "diamond"])).toEqual({
      symbol: "diamond",
      count: 5,
      pays: 8_000,
      wildMultiplier: 2,
    });
    expect(evaluateLine(gemSlots, ["prism", "prism", "prism", "prism", "prism"])).toMatchObject({
      symbol: "prism",
      pays: 10_000,
    });
  });
});

describe("free spins", () => {
  it("awards free spins for enough scatters on a paid spin only", () => {
    const stops = stopsWithScatters(toyBonus, "s", [0, 1, 2]);
    expect(evaluateSpin(toyBonus, stops, 100).freeSpinsAwarded).toBe(4);
    expect(evaluateSpin(toyBonus, stops, 100, true).freeSpinsAwarded).toBe(0);
    expect(evaluateSpin(toyBonus, stopsWithScatters(toyBonus, "s", []), 100).freeSpinsAwarded).toBe(
      0,
    );
  });

  it("multiplies every free-spin win, line and scatter alike", () => {
    for (let i = 0; i < 500; i++) {
      const stops = toyBonus.reels.map((strip) => randomInt(0, strip.length));
      const paid = evaluateSpin(toyBonus, stops, 100);
      const free = evaluateSpin(toyBonus, stops, 100, true);
      expect(free.pays).toBe(paid.pays * 2);
      expect(free.payout).toBe(paid.payout * 2);
    }
  });

  it("settles a round as one paid spin plus exactly the spins it awarded", () => {
    const first = stopsWithScatters(toyBonus, "s", [0, 1, 2]);
    const extra = [
      [0, 0, 0],
      [1, 2, 3],
      [2, 4, 6],
      [first[0]!, first[1]!, first[2]!],
    ];
    const round = settleRound(toyBonus, [first, ...extra], 500);
    expect(round.freeSpins).toHaveLength(4);
    expect(round.freeSpins.every((s) => s.freeSpinsAwarded === 0)).toBe(true);
    expect(round.payout).toBe(
      round.base.payout + round.freeSpins.reduce((sum, s) => sum + s.payout, 0),
    );

    expect(() => settleRound(toyBonus, [first], 500)).toThrow(RangeError);
    expect(() => settleRound(toyBonus, [first, ...extra, [0, 0, 0]], 500)).toThrow(RangeError);
    const quiet = stopsWithScatters(toyBonus, "s", []);
    expect(() => settleRound(toyBonus, [quiet, [1, 1, 1]], 500)).toThrow(RangeError);
    expect(settleRound(toyBonus, [quiet], 500).freeSpins).toEqual([]);
    expect(() => settleRound(toyBonus, [], 500)).toThrow(RangeError);
  });

  it("starts Adventure free spins on three maps", () => {
    const first = stopsWithScatters(adventureSlots, "map", [0, 1, 2]);
    const base = evaluateSpin(adventureSlots, first, 100);
    expect(base.scatterWin).toMatchObject({ symbol: "map", count: 3, pays: 170 });
    expect(base.freeSpinsAwarded).toBe(8);
  });

  it("computes the exact RTP with multipliers and free spins, matching brute force", () => {
    // Expected round = E[paid spin] + E[spins awarded] x E[free spin], all enumerated directly.
    const paid = enumerate(toyBonus);
    const free = enumerate(toyBonus, true);
    const exact = paid.rtp + paid.meanFreeSpins * free.rtp;
    expect(paid.meanFreeSpins).toBeGreaterThan(0);
    expect(Math.abs(exact - theoreticalRtp(toyBonus))).toBeLessThan(1e-12);
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
      wildMultiplier: 1,
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

  it("500,000 Gem Slots spins agree with the maths", () => {
    const { mean, standardError } = simulate(gemSlots, 500_000);
    expect(Math.abs(mean - theoreticalRtp(gemSlots))).toBeLessThan(5 * standardError);
  }, 120_000);

  it("300,000 Adventure Slots rounds, free spins included, agree with the maths", () => {
    const { mean, standardError } = simulate(adventureSlots, 300_000);
    expect(Math.abs(mean - theoreticalRtp(adventureSlots))).toBeLessThan(5 * standardError);
  }, 120_000);
});
