import { describe, expect, it } from "vitest";
import { describeWait, rateLimitKey, rateLimits, secondsUntilReset } from "@/server/rate-limit";

describe("rate limit helpers", () => {
  it("keys counters by rule and a hash of the id, never the id itself", () => {
    const key = rateLimitKey(rateLimits.loginByEmail, "someone@example.com");
    expect(key).toMatch(/^login-email:[0-9a-f]{64}$/);
    expect(key).not.toContain("someone");
    expect(rateLimitKey(rateLimits.loginByEmail, "someone@example.com")).toBe(key);
    expect(rateLimitKey(rateLimits.loginByIp, "someone@example.com")).not.toBe(key);
  });

  it("counts down to the end of the window", () => {
    const rule = { name: "t", limit: 1, windowSeconds: 60 };
    const start = new Date("2026-01-01T10:00:00Z");
    expect(secondsUntilReset(rule, start, new Date("2026-01-01T10:00:00Z"))).toBe(60);
    expect(secondsUntilReset(rule, start, new Date("2026-01-01T10:00:59.200Z"))).toBe(1);
    expect(secondsUntilReset(rule, start, new Date("2026-01-01T10:05:00Z"))).toBe(0);
  });

  it("describes the wait in plain words", () => {
    expect(describeWait(1)).toBe("in 1 second");
    expect(describeWait(40)).toBe("in 40 seconds");
    expect(describeWait(60)).toBe("in 1 minute");
    expect(describeWait(61)).toBe("in 2 minutes");
    expect(describeWait(0)).toBe("in 1 second");
  });
});
