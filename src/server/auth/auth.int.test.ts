import { PrismaClient } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { STARTING_BALANCE } from "@/lib/money";
import { registerSchema } from "@/lib/validation/auth";
import { AccountTakenError, authenticateUser, registerUser } from "@/server/auth/accounts";
import {
  createSession,
  hashSessionToken,
  invalidateSession,
  validateSessionToken,
} from "@/server/auth/sessions";
import { getBalance } from "@/server/ledger";

// Real PostgreSQL. DELETES ALL ROWS: point DATABASE_URL_TEST at a throwaway database.
const url = process.env.DATABASE_URL_TEST;

describe.skipIf(!url)("accounts and sessions (database)", () => {
  const db = new PrismaClient({ datasourceUrl: url });

  const input = (overrides: Partial<Record<"email" | "username" | "password", string>> = {}) =>
    registerSchema.parse({
      email: "player@example.com",
      username: "player_one",
      password: "a-good-password",
      ...overrides,
    });

  beforeEach(async () => {
    await db.ledgerEntry.deleteMany();
    await db.wallet.deleteMany();
    await db.session.deleteMany();
    await db.user.deleteMany();
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("registers a user with a wallet holding the starting balance", async () => {
    const user = await registerUser(db, input());
    expect(user.email).toBe("player@example.com");
    expect(await getBalance(db, user.id)).toBe(STARTING_BALANCE);

    const stored = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(stored.passwordHash).not.toContain("a-good-password");
  });

  it("rejects a duplicate email or username without creating anything", async () => {
    await registerUser(db, input());

    await expect(registerUser(db, input({ username: "someone_else" }))).rejects.toMatchObject({
      field: "email",
    });
    await expect(registerUser(db, input({ email: "other@example.com" }))).rejects.toBeInstanceOf(
      AccountTakenError,
    );
    // Case-insensitive: emails are normalised before they reach the database.
    await expect(
      registerUser(db, input({ email: "PLAYER@example.com", username: "third" })),
    ).rejects.toBeInstanceOf(AccountTakenError);

    expect(await db.user.count()).toBe(1);
    expect(await db.wallet.count()).toBe(1);
  });

  it("authenticates with the right password only", async () => {
    const user = await registerUser(db, input());
    const ok = await authenticateUser(db, {
      email: "player@example.com",
      password: "a-good-password",
    });
    expect(ok?.id).toBe(user.id);

    expect(
      await authenticateUser(db, { email: "player@example.com", password: "wrong" }),
    ).toBeNull();
    expect(await authenticateUser(db, { email: "nobody@example.com", password: "x" })).toBeNull();
  });

  it("creates, validates and invalidates sessions", async () => {
    const user = await registerUser(db, input());
    const { token } = await createSession(db, user.id);

    // Only the hash is stored, never the token itself.
    const row = await db.session.findFirstOrThrow({ where: { userId: user.id } });
    expect(row.id).toBe(hashSessionToken(token));
    expect(row.id).not.toBe(token);

    expect((await validateSessionToken(db, token))?.user.id).toBe(user.id);

    await invalidateSession(db, token);
    expect(await validateSessionToken(db, token)).toBeNull();
  });

  it("rejects expired, unknown and malformed tokens", async () => {
    const user = await registerUser(db, input());
    const { token } = await createSession(db, user.id);
    await db.session.update({
      where: { id: hashSessionToken(token) },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    expect(await validateSessionToken(db, token)).toBeNull();
    expect(await db.session.count()).toBe(0); // expired session cleaned up
    expect(await validateSessionToken(db, "f".repeat(64))).toBeNull();
    expect(await validateSessionToken(db, "not-a-token")).toBeNull();
  });
});
