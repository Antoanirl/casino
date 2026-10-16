# src/server

Server-only code. Every module here imports `server-only`, so importing one from a client component fails the build.

- `env.ts`: validated server secrets (`DATABASE_URL`), checked on first use
- `db.ts`: shared Prisma client (`getDb()`)
- `rng.ts`: cryptographically secure randomness for every game outcome (`randomInt`, `shuffle`, `pick`, `randomToken`)
- `ledger/`: the only code allowed to change a balance
  - `postLedgerEntry(db, entry)`: one standalone, idempotent balance change
  - `applyLedgerEntry(tx, entry)`: the same, inside a transaction a game already opened
  - `createWallet(tx, userId)`: new wallet plus the starting-balance entry
  - `verifyWallet(db, userId)`: checks balance = sum of ledger entries

- `auth/`: accounts and sessions
  - `password.ts`: scrypt hashing with per-password salt, constant-time verification
  - `sessions.ts`: database sessions; the cookie holds a random token, the database only its SHA-256 hash
  - `accounts.ts`: `registerUser` (user + wallet + signup bonus in one transaction), `authenticateUser`
  - `current-user.ts`: cookie handling, `getCurrentUser()`, `requireUser()`

Planned: `games/` (Phase 4 onward).
