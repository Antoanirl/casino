/**
 * Credits are stored as integer "minor units": 100 minor units = 1 credit.
 * Safe to use on both client and server.
 */

export const MINOR_UNITS_PER_CREDIT = 100;

/** Credits every new account receives. */
export const STARTING_BALANCE_CREDITS = 1_000;
export const STARTING_BALANCE = STARTING_BALANCE_CREDITS * MINOR_UNITS_PER_CREDIT;

/** Upper bound for a single ledger amount (1 million credits), guards against overflow bugs. */
export const MAX_LEDGER_AMOUNT = 1_000_000 * MINOR_UNITS_PER_CREDIT;

/** Converts whole or fractional credits (e.g. 12.5) to minor units, rejecting sub-unit precision. */
export function creditsToMinor(credits: number): number {
  const minor = Math.round(credits * MINOR_UNITS_PER_CREDIT);
  if (!Number.isFinite(credits) || Math.abs(minor - credits * MINOR_UNITS_PER_CREDIT) > 1e-6) {
    throw new RangeError(`Invalid credit amount: ${credits}`);
  }
  return minor;
}

/** Formats minor units for display, e.g. 150050 -> "1,500.50". Whole amounts drop the decimals. */
export function formatCredits(minor: number): string {
  const credits = minor / MINOR_UNITS_PER_CREDIT;
  const hasFraction = minor % MINOR_UNITS_PER_CREDIT !== 0;
  return credits.toLocaleString("en-US", {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  });
}
