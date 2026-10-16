import "server-only";
import { Prisma, type PrismaClient } from "@prisma/client";
import type { LoginInput, RegisterInput } from "@/lib/validation/auth";
import { hashPassword, verifyAgainstDummy, verifyPassword } from "@/server/auth/password";
import { createWallet } from "@/server/ledger";

export class AccountTakenError extends Error {
  constructor(readonly field: "email" | "username") {
    super(`That ${field} is already registered`);
    this.name = "AccountTakenError";
  }
}

/**
 * Creates the user and their wallet (with the starting balance) in ONE transaction:
 * there is never a user without a wallet, or a wallet without its signup ledger entry.
 * Input must already be validated with registerSchema.
 */
export async function registerUser(db: PrismaClient, input: RegisterInput) {
  // Hash before opening the transaction: hashing is slow and shouldn't hold a DB connection.
  const passwordHash = await hashPassword(input.password);

  try {
    return await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email: input.email, username: input.username, passwordHash },
        select: { id: true, email: true, username: true },
      });
      await createWallet(tx, user.id);
      return user;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = JSON.stringify(error.meta?.target ?? "");
      throw new AccountTakenError(target.includes("username") ? "username" : "email");
    }
    throw error;
  }
}

/** Returns the user if the email and password match, otherwise null. Never says which one was wrong. */
export async function authenticateUser(db: PrismaClient, input: LoginInput) {
  const user = await db.user.findUnique({
    where: { email: input.email },
    select: { id: true, email: true, username: true, passwordHash: true },
  });

  if (!user) {
    await verifyAgainstDummy(input.password);
    return null;
  }

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) return null;

  return { id: user.id, email: user.email, username: user.username };
}
