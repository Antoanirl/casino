import { describe, expect, it } from "vitest";
import { hashPassword, verifyAgainstDummy, verifyPassword } from "@/server/auth/password";

describe("password hashing", () => {
  it("verifies the right password and rejects a wrong one", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(await verifyPassword("correct horse battery staple", hash)).toBe(true);
    expect(await verifyPassword("correct horse battery stapl", hash)).toBe(false);
    expect(await verifyPassword("", hash)).toBe(false);
  });

  it("never stores the password and salts every hash", async () => {
    const a = await hashPassword("same-password");
    const b = await hashPassword("same-password");
    expect(a).not.toContain("same-password");
    expect(a).not.toBe(b);
    expect(a).toMatch(/^scrypt\$32768\$8\$1\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/);
  });

  it("rejects malformed or tampered hashes instead of crashing", async () => {
    const hash = await hashPassword("secret-password");
    const parts = hash.split("$");
    parts[5] = Buffer.alloc(64).toString("base64");
    expect(await verifyPassword("secret-password", parts.join("$"))).toBe(false);
    expect(await verifyPassword("secret-password", "not-a-hash")).toBe(false);
    expect(await verifyPassword("secret-password", "bcrypt$1$2$3$4$5")).toBe(false);
    expect(await verifyPassword("secret-password", "scrypt$x$8$1$abc$def")).toBe(false);
  });

  it("dummy verification always fails", async () => {
    expect(await verifyAgainstDummy("dummy-password-for-timing")).toBe(false);
  });
});
