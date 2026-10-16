# Progress

Where the project stands, so work can be picked up from any point.

**Current phase:** 2. Database, accounts and ledger (part 2a done in code, waiting on setup)
**Next step:** finish the 2a setup list below, then start 2b (registration, login, logout).

## Roadmap

- [x] Phase 1: Foundation + CI/deploy (live on Vercel, CI green)
- [ ] **Phase 2: Database, accounts and ledger**
  - [ ] 2a: PostgreSQL + Prisma, ledger service, secure RNG, idempotency, concurrency tests
  - [ ] 2b: Registration, login, logout, sessions, real balance in the header
- [ ] Phase 3: Design system and homepage
- [ ] Phase 4: Blackjack (server-side round state)
- [ ] Phase 5: Roulette
- [ ] Phase 6: Slot engine + Classic Slots (with RTP simulation test)
- [ ] Phase 7: Gem Slots and Adventure Slots (configs on the same engine)
- [ ] Phase 8: Dashboard and statistics
- [ ] Phase 9: Hardening and QA (audit, rate limiting, e2e, accessibility, provably fair)
- [ ] Phase 10: Portfolio packaging (monitoring, docs, screenshots, demo video)

## Phase 2a checklist

Code (written):

- [x] Prisma schema: User, Session, Wallet, LedgerEntry (`prisma/schema.prisma`)
- [x] Money stored as integer minor units, 100 = 1 credit (`src/lib/money.ts`)
- [x] Lazy-validated server env and shared Prisma client (`src/server/env.ts`, `src/server/db.ts`)
- [x] Ledger service: atomic conditional debits, idempotency keys, consistency check (`src/server/ledger/`)
- [x] Wallet creation with a 1,000-credit signup bonus recorded in the ledger
- [x] Secure RNG module (`src/server/rng.ts`)
- [x] Unit tests: money helpers, RNG range, uniformity and shuffle
- [x] Integration tests: concurrent bets, duplicate requests, insufficient funds, key conflicts
- [x] `/api/health` now checks the database
- [x] CI: throwaway Postgres service, migrations, database tests

Setup (on your machine):

- [ ] Create the Neon database in Vercel (Storage) and copy both connection strings into `.env`
- [ ] Update `.github/workflows/ci.yml` by hand (remote tools can't write into `.github`)
- [ ] `npm install`
- [ ] `npx prisma migrate dev --name init` (creates the tables and the `prisma/migrations` folder)
- [ ] `npm run format`, then `npm run check` passes
- [ ] Commit and push; CI green, including the database tests
- [ ] Live `/api/health` shows `"database":"ok"`

## Phase 1 (done)

Next.js 16 + TypeScript (strict), Tailwind v4, ESLint + Prettier, validated env, layout and navigation, all routes as placeholders, game catalogue with tests, Vitest, GitHub Actions CI, README and architecture doc, deployed on Vercel.

## Notes

- Brand name "Lucky Ledger" is a working title; change it in `src/lib/site.ts` (and the README) during Phase 3.
- Slots navigation decision: one "Slots" hub page, not three nav entries.
- Local development and production currently share one Neon database. Later improvement: a separate Neon branch for development.
