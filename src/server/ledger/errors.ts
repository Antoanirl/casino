export class InsufficientFundsError extends Error {
  constructor(
    readonly requested: number,
    readonly available: number,
  ) {
    super(`Insufficient funds: requested ${requested}, available ${available}`);
    this.name = "InsufficientFundsError";
  }
}

/** The same idempotency key was reused for a different operation. */
export class IdempotencyConflictError extends Error {
  constructor(readonly idempotencyKey: string) {
    super(`Idempotency key "${idempotencyKey}" was already used for a different ledger entry`);
    this.name = "IdempotencyConflictError";
  }
}

export class WalletNotFoundError extends Error {
  constructor(readonly userId: string) {
    super(`No wallet for user ${userId}`);
    this.name = "WalletNotFoundError";
  }
}

export class InvalidLedgerAmountError extends Error {
  constructor(readonly amount: number) {
    super(`Invalid ledger amount: ${amount}`);
    this.name = "InvalidLedgerAmountError";
  }
}
