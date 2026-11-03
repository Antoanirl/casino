import { describe, expect, it } from "vitest";
import {
  entryLabel,
  formatEntryDate,
  formatSignedCredits,
  gameName,
  sampleLedger,
} from "@/lib/ledger-display";

describe("ledger display", () => {
  it("names entries by game and type", () => {
    expect(entryLabel({ type: "SIGNUP_BONUS" })).toBe("Signup bonus");
    expect(entryLabel({ type: "BET", game: "blackjack" })).toBe("Blackjack bet");
    expect(entryLabel({ type: "PAYOUT", game: "slots:gems" })).toBe("Gem Slots win");
    expect(entryLabel({ type: "BET", game: "unknown-game" })).toBe("Bet");
    expect(gameName("slots:classic")).toBe("Classic Slots");
  });

  it("signs amounts with a real minus sign", () => {
    expect(formatSignedCredits(5_000)).toBe("+50");
    expect(formatSignedCredits(-2_550)).toBe("−25.50");
  });

  it("formats dates relative to now, then as a short date", () => {
    const now = new Date("2026-11-03T12:00:00Z");
    expect(formatEntryDate(new Date("2026-11-03T11:59:30Z"), now)).toBe("Just now");
    expect(formatEntryDate(new Date("2026-11-03T11:48:00Z"), now)).toBe("12 min ago");
    expect(formatEntryDate(new Date("2026-11-03T09:00:00Z"), now)).toBe("3 h ago");
    expect(formatEntryDate(new Date("2026-10-14T09:00:00Z"), now)).toBe("14 Oct");
  });

  it("builds a sample page whose running balance adds up", () => {
    const rows = sampleLedger();
    let balance = 0;
    for (const row of rows) {
      balance += row.amount;
      expect(row.balanceAfter).toBe(balance);
    }
    expect(balance).toBeGreaterThan(0);
  });
});
