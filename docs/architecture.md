# Architecture

This document grows with the project. It records how the app is structured and why.

## Stack

- **Next.js (App Router) + TypeScript (strict)**: one codebase and one deployment for UI and API (route handlers / server actions).
- **Tailwind CSS v4**: design tokens live in `src/app/globals.css` under `@theme`.
- **Zod**: validates environment variables now, and every request body from Phase 2.
- **Vitest**: unit tests for game rules, payouts and the ledger.
- **PostgreSQL + Prisma** (Phase 2): accounts, balances, game rounds and transactions.

## Folder structure

```
src/
  app/            Routes (pages, layouts, API route handlers)
  components/
    layout/       Header, footer, navigation
    ui/           Reusable presentational components
  lib/            Code safe for both client and server (game catalogue, config, env)
  server/         Server-only code: database, ledger, RNG, game engines
docs/             Architecture notes and design decisions
```

## Routes

| Route                 | Purpose                  | Phase |
| --------------------- | ------------------------ | ----- |
| `/`                   | Lobby / homepage         | 3     |
| `/blackjack`          | Blackjack                | 4     |
| `/roulette`           | European roulette        | 5     |
| `/slots`              | Slots hub                | 6     |
| `/slots/[slug]`       | classic, gems, adventure | 6–7   |
| `/dashboard`          | Balance, history, stats  | 8     |
| `/login`, `/register` | Accounts                 | 2     |
| `/api/health`         | Liveness check           | 1     |

Unknown slot slugs return 404 (`dynamicParams = false`).

## Core rules (apply from Phase 2 on)

1. **The server decides every outcome.** The browser only sends the player's intent (bet, hit, spin); it never sends results or balances.
2. **One ledger.** All balance changes go through a single service that runs inside a database transaction and writes a transaction record. No other code updates a balance.
3. **Idempotent bets.** Each bet request carries a unique key, so a retried or replayed request can't be charged or paid twice.
4. **Secure randomness.** Outcomes use `node:crypto`, never `Math.random()`.

## Data model (Phase 2)

Defined in `prisma/schema.prisma`.

- **User**: email, username, password hash.
- **Session**: login sessions; stores only the SHA-256 hash of the cookie token.
- **Wallet**: one per user, holds `balance`.
- **LedgerEntry**: append-only record of every balance change (signed `amount`, `balanceAfter`, `idempotencyKey`, game and round reference).

**Money is stored as integers**: 100 minor units = 1 credit. No floating-point rounding errors, and a 3:2 blackjack payout on an odd stake is still exact.

**Invariant:** a wallet's `balance` always equals the sum of its ledger entries. `verifyWallet()` checks this, and the integration tests assert it after concurrent bets.

### How the ledger prevents double-spending

1. A debit is a single conditional update: `UPDATE wallet SET balance = balance - x WHERE user_id = ? AND balance >= x`. If no row matches, the bet is rejected. PostgreSQL locks the row, so a second concurrent bet re-checks the condition against the first bet's result.
2. The balance change and its `LedgerEntry` are written in one transaction: both happen or neither does.
3. `(userId, idempotencyKey)` is unique. A repeated request (double click, network retry) hits the constraint, its transaction rolls back, and the original entry is returned instead.

### Testing

- `npm test`: unit tests, no database (game catalogue, money helpers, RNG uniformity).
- `npm run test:db`: integration tests against a real PostgreSQL database, including 20 simultaneous bets on one wallet and 5 simultaneous duplicate requests. CI runs them against a throwaway Postgres container on every push.

## Decisions log

- **2026-10-15: Slots as a hub page.** Navigation has a single "Slots" entry leading to `/slots`, which lists the three games. Keeps the header short and matches the shared-engine design.
- **2026-10-15: Single Next.js app instead of a separate backend.** One deploy, shared types between client and server, and route handlers are enough for this scale.
- **2026-10-16: Neon for PostgreSQL.** Free tier, serverless, connects to Vercel directly. The app uses the pooled connection (`DATABASE_URL`); migrations use the direct one (`DATABASE_URL_UNPOOLED`).
- **2026-10-16: Prisma 6.** Mature, typed queries, built-in migrations. Pinned to v6 to avoid the v7 configuration changes for now.
- **2026-10-16: Hand-rolled session auth (coming in 2b).** Password hashing with `node:crypto` scrypt and database sessions. No third-party auth service, no native modules to compile on Windows, and every security decision is visible in the code.
