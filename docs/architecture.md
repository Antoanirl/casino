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

## Decisions log

- **2026-10-15: Slots as a hub page.** Navigation has a single "Slots" entry leading to `/slots`, which lists the three games. Keeps the header short and matches the shared-engine design.
- **2026-10-15: Single Next.js app instead of a separate backend.** One deploy, shared types between client and server, and route handlers are enough for this scale.
