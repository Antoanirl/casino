# src/server

Server-only code. Nothing in this folder may be imported from a client component.

Planned contents (Phase 2 onward):

- `db.ts`: Prisma client singleton
- `env.ts`: validated server secrets (`DATABASE_URL`, `AUTH_SECRET`)
- `ledger/`: the only code allowed to change a balance; every change runs in a DB transaction and writes a transaction record
- `rng.ts`: cryptographically secure randomness for all game outcomes
- `games/`: server-side game engines (blackjack rounds, roulette spins, slot engine)
