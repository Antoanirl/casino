import { describe, expect, it } from "vitest";
import { STARTING_BALANCE, creditsToMinor, formatCredits } from "@/lib/money";

describe("money", () => {
  it("converts credits to integer minor units", () => {
    expect(creditsToMinor(1)).toBe(100);
    expect(creditsToMinor(12.5)).toBe(1250);
    expect(creditsToMinor(0.29)).toBe(29); // 0.29 * 100 is 28.999... in floating point
  });

  it("rejects amounts finer than one minor unit", () => {
    expect(() => creditsToMinor(0.001)).toThrow(RangeError);
    expect(() => creditsToMinor(Number.NaN)).toThrow(RangeError);
    expect(() => creditsToMinor(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });

  it("formats balances for display", () => {
    expect(formatCredits(100_000)).toBe("1,000");
    expect(formatCredits(150_050)).toBe("1,500.50");
    expect(formatCredits(150)).toBe("1.50");
    expect(formatCredits(0)).toBe("0");
  });

  it("gives new accounts 1,000 credits", () => {
    expect(formatCredits(STARTING_BALANCE)).toBe("1,000");
  });
});
