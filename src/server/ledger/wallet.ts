import "server-only";
import type { Prisma } from "@prisma/client";
import { STARTING_BALANCE } from "@/lib/money";
import { applyLedgerEntry } from "@/server/ledger/ledger";

/**
 * Creates a user's wallet and credits the starting balance through the ledger,
 * so even the very first credits have a matching LedgerEntry.
 * Call inside the same transaction that creates the user (Phase 2b registration).
 */
export async function createWallet(tx: Prisma.TransactionClient, userId: string) {
  await tx.wallet.create({ data: { userId, balance: 0 } });
  return applyLedgerEntry(tx, {
    userId,
    type: "SIGNUP_BONUS",
    amount: STARTING_BALANCE,
    idempotencyKey: `signup:${userId}`,
  });
}
