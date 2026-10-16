import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema, toFieldErrors } from "@/lib/validation/auth";

const valid = { email: "Player@Example.com ", username: "Lucky_7", password: "longenough" };

describe("registerSchema", () => {
  it("normalises email and username to trimmed lowercase", () => {
    const result = registerSchema.parse(valid);
    expect(result.email).toBe("player@example.com");
    expect(result.username).toBe("lucky_7");
    expect(result.password).toBe("longenough");
  });

  it.each([
    ["email", "not-an-email"],
    ["username", "ab"],
    ["username", "has space"],
    ["username", "emoji😀"],
    ["username", "a".repeat(21)],
    ["password", "short"],
    ["password", "x".repeat(129)],
  ])("rejects an invalid %s: %s", (field, value) => {
    const result = registerSchema.safeParse({ ...valid, [field]: value });
    expect(result.success).toBe(false);
    if (!result.success) expect(toFieldErrors(result.error)[field]).toBeTruthy();
  });

  it("does not trim passwords", () => {
    expect(registerSchema.parse({ ...valid, password: "  spaces  " }).password).toBe("  spaces  ");
  });
});

describe("loginSchema", () => {
  it("accepts any non-empty password", () => {
    expect(loginSchema.safeParse({ email: "a@b.co", password: "x" }).success).toBe(true);
    expect(loginSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
  });
});
