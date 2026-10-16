import "server-only";
import { randomBytes, randomInt as cryptoRandomInt } from "node:crypto";

/**
 * Every game outcome must come from this module. It uses the operating
 * system's cryptographically secure generator (node:crypto), never Math.random().
 */

/** Uniform random integer in [min, max), like crypto.randomInt. Unbiased. */
export function randomInt(min: number, max: number): number {
  if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || max <= min) {
    throw new RangeError(`randomInt needs safe integers with min < max, got [${min}, ${max})`);
  }
  return cryptoRandomInt(min, max);
}

/** Returns a new array in uniformly random order (Fisher–Yates). The input is not modified. */
export function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

/** Picks one element uniformly at random. */
export function pick<T>(items: readonly T[]): T {
  if (items.length === 0) throw new RangeError("Cannot pick from an empty array");
  return items[randomInt(0, items.length)]!;
}

/** Random hex string, for secrets such as session tokens and server seeds. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}
