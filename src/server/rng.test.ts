import { describe, expect, it } from "vitest";
import { pick, randomInt, randomToken, shuffle } from "@/server/rng";

describe("rng", () => {
  it("stays within [min, max)", () => {
    for (let i = 0; i < 10_000; i++) {
      const n = randomInt(0, 37);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(37);
    }
  });

  it("rejects invalid ranges", () => {
    expect(() => randomInt(5, 5)).toThrow(RangeError);
    expect(() => randomInt(1.5, 3)).toThrow(RangeError);
  });

  it("is roughly uniform (chi-squared test over 37 roulette pockets)", () => {
    const pockets = 37;
    const samples = 370_000;
    const counts = new Array<number>(pockets).fill(0);
    for (let i = 0; i < samples; i++) counts[randomInt(0, pockets)]!++;

    const expected = samples / pockets;
    const chiSquared = counts.reduce((sum, c) => sum + (c - expected) ** 2 / expected, 0);
    // 36 degrees of freedom: the 99.99th percentile is about 76.
    // A fair generator fails this less than once in 10,000 runs.
    expect(chiSquared).toBeLessThan(76);
  });

  it("shuffle returns a permutation and leaves the input untouched", () => {
    const deck = Array.from({ length: 52 }, (_, i) => i);
    const shuffled = shuffle(deck);
    expect(shuffled).toHaveLength(52);
    expect([...shuffled].sort((a, b) => a - b)).toEqual(deck);
    expect(deck[0]).toBe(0);
    expect(shuffled).not.toEqual(deck); // 1 in 52! chance of a false failure
  });

  it("pick returns an element and rejects empty arrays", () => {
    expect(["a", "b", "c"]).toContain(pick(["a", "b", "c"]));
    expect(() => pick([])).toThrow(RangeError);
  });

  it("generates unique hex tokens", () => {
    const token = randomToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(randomToken()).not.toBe(token);
  });
});
