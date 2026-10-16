import "server-only";
import { Prisma, type LedgerEntry, type LedgerEntryType, type PrismaClient } from "@prisma/client";
import { MAX_LEDGER_AMOUNT } from "@/lib/money";
import {
  IdempotencyConflictError,
  InsufficientFundsError,
  InvalidLedgerAmountError,
  WalletNotFoundError,
} from "@/server/ledger/errors";

/**
 * The ledger is the ONLY code allowed to change a wallet balance.
 *
 * Guarantees:
 * - Atomic: the balance update and its LedgerEntry are written in one database transaction.
 * - No overspending: debits use a conditional UPDATE ("... WHERE balance >= amount"), so two
 *   concurrent bets can never both spend the same credits. Postgres row locks make the
 *   second request re-check the condition against the first request's result.
 * - Idempotent: (userId, idempotencyKey) is unique. Repeating a request with the same key
 *   returns the original entry instead of charging or paying twice.
 */

/** A Prisma client or an open interactive transaction. */
export type Db = PrismaClient | Prisma.TransactionClient;

export interface LedgerEntryInput {
  userId: string;
  type: LedgerEntryType;
  /** Signed minor units. Negative = debit (bet), positive = credit (payout, bonus). Never 0. */
  amount: number;
  idempotencyKey: string;
  game?: string;
  reference?: string;
  metadata?: Prisma.InputJsonValue;
}

export interface LedgerResult {
  entry: LedgerEntry;
  balance: number;
  /** True when the idempotency key had already been used and the original result was returned. */
  replayed: boolean;
}

function validate(input: LedgerEntryInput): void {
  const { amount } = input;
  if (!Number.isSafeInteger(amount) || amount === 0 || Math.abs(amount) > MAX_LEDGER_AMOUNT) {
    throw new InvalidLedgerAmountError(amount);
  }
  if (input.idempotencyKey.trim().length === 0 || input.idempotencyKey.length > 200) {
    throw new RangeError("idempotencyKey must be 1–200 characters");
  }
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

/** Same operation = same type, amount and user. Anything else under a reused key is a conflict. */
function assertSameOperation(existing: LedgerEntry, input: LedgerEntryInput): void {
  if (existing.type !== input.type || existing.amount !== input.amount) {
    throw new IdempotencyConflictError(input.idempotencyKey);
  }
}

/**
 * Applies one entry using an existing transaction client. Use this when a game must change the
 * balance and write its own rows (e.g. a blackjack round) atomically:
 *
 *   await db.$transaction(async (tx) => {
 *     const round = await tx.blackjackRound.create(...);
 *     await applyLedgerEntry(tx, { ..., reference: round.id });
 *   });
 *
 * Must be called inside a transaction. A reused idempotency key throws a unique-constraint error
 * here; `postLedgerEntry` handles that case for standalone entries.
 */
export async function applyLedgerEntry(tx: Prisma.TransactionClient, input: LedgerEntryInput) {
  validate(input);
  const { userId, amount } = input;

  if (amount < 0) {
    const debit = -amount;
    const updated = await tx.wallet.updateMany({
      where: { userId, balance: { gte: debit } },
      data: { balance: { decrement: debit } },
    });
    if (updated.count === 0) {
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) throw new WalletNotFoundError(userId);
      throw new InsufficientFundsError(debit, wallet.balance);
    }
  } else {
    const updated = await tx.wallet.updateMany({
      where: { userId },
      data: { balance: { increment: amount } },
    });
    if (updated.count === 0) throw new WalletNotFoundError(userId);
  }

  // Read back inside the same transaction: the row is locked by our UPDATE,
  // so this is exactly the balance our change produced.
  const { balance } = await tx.wallet.findUniqueOrThrow({ where: { userId } });

  const entry = await tx.ledgerEntry.create({
    data: {
      userId,
      type: input.type,
      amount,
      balanceAfter: balance,
      idempotencyKey: input.idempotencyKey,
      game: input.game,
      reference: input.reference,
      metadata: input.metadata,
    },
  });

  return { entry, balance };
}

/**
 * Posts a single standalone entry in its own transaction, with idempotent replay.
 * This is what most callers want (sign-up bonus, simple bets and payouts).
 */
export async function postLedgerEntry(
  db: PrismaClient,
  input: LedgerEntryInput,
): Promise<LedgerResult> {
  validate(input);

  try {
    const { entry, balance } = await db.$transaction((tx) => applyLedgerEntry(tx, input));
    return { entry, balance, replayed: false };
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;

    // The key was used before (possibly by a concurrent duplicate request that won the race).
    // The failed transaction rolled back, so nothing was charged twice. Return the original.
    const existing = await db.ledgerEntry.findUniqueOrThrow({
      where: {
        userId_idempotencyKey: { userId: input.userId, idempotencyKey: input.idempotencyKey },
      },
    });
    assertSameOperation(existing, input);
    const wallet = await db.wallet.findUniqueOrThrow({ where: { userId: input.userId } });
    return { entry: existing, balance: wallet.balance, replayed: true };
  }
}

export async function getBalance(db: Db, userId: string): Promise<number> {
  const wallet = await db.wallet.findUnique({ where: { userId } });
  if (!wallet) throw new WalletNotFoundError(userId);
  return wallet.balance;
}

/**
 * Consistency check used by tests and later by an admin health check:
 * the wallet balance must equal the sum of all ledger entries.
 */
export async function verifyWallet(db: Db, userId: string) {
  const [wallet, sum] = await Promise.all([
    db.wallet.findUnique({ where: { userId } }),
    db.ledgerEntry.aggregate({ where: { userId }, _sum: { amount: true } }),
  ]);
  if (!wallet) throw new WalletNotFoundError(userId);
  const ledgerTotal = sum._sum.amount ?? 0;
  return { balance: wallet.balance, ledgerTotal, consistent: wallet.balance === ledgerTotal };
}
