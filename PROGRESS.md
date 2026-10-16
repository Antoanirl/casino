# Progress

Where the project stands, so work can be picked up from any point.

**Current phase:** 2. Database, accounts and ledger (2b written, waiting on checks)
**Next step:** run the 2b checks below; when they pass, Phase 2 is done and Phase 3 (design system and homepage) is next.

## Roadmap

- [x] Phase 1: Foundation + CI/deploy (live on Vercel, CI green)
- [ ] **Phase 2: Database, accounts and ledger**
  - [x] 2a: PostgreSQL + Prisma, ledger service, secure RNG, idempotency, concurrency tests
  - [ ] 2b: Registration, login, logout, sessions, real balance in the header
- [ ] Phase 3: Design system and homepage
- [ ] Phase 4: Blackjack (server-side round state)
- [ ] Phase 5: Roulette
- [ ] Phase 6: Slot engine + Classic Slots (with RTP simulation test)
- [ ] Phase 7: Gem Slots and Adventure Slots (configs on the same engine)
- [ ] Phase 8: Dashboard and statistics
- [ ] Phase 9: Hardening and QA (audit, rate limiting, e2e, accessibility, provably fair)
- [ ] Phase 10: Portfolio packaging (monitoring, docs, screenshots, demo video)

## Phase 2b checklist

Code (written):

- [x] Shared Zod validation for email, username and password (`src/lib/validation/auth.ts`)
- [x] scrypt password hashing with constant-time verification (`src/server/auth/password.ts`)
- [x] Database sessions storing only hashed tokens; HttpOnly, Secure, SameSite=Lax cookie
- [x] Registration: user + wallet + 1,000-credit bonus in one transaction
- [x] Login that doesn't reveal whether an email is registered
- [x] Logout that deletes the session
- [x] Login and sign-up pages with inline errors (`useActionState`)
- [x] Header shows username and real balance when signed in
- [x] Dashboard requires login and shows the balance
- [x] Unit tests: password hashing, validation rules
- [x] Database tests: registration, duplicates, login, session expiry and logout

Checks (on your machine):

- [ ] `npm run format`, then `npm run check` passes
- [ ] `npm run dev`: sign up, see 1,000 credits in the header, log out, log back in
- [ ] Wrong password shows "Invalid email or password"
- [ ] `/dashboard` while logged out sends you to the login page
- [ ] Commit and push; CI green
- [ ] Same flow works on the live site

## Phase 2a checklist (done)

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

- [x] Create the Neon database in Vercel (Storage) and copy both connection strings into `.env`
- [x] Update `.github/workflows/ci.yml` by hand (remote tools can't write into `.github`)
- [x] `npm install`
- [x] `npx prisma migrate dev --name init` (creates the tables and the `prisma/migrations` folder)
- [x] `npm run format`, then `npm run check` passes
- [x] Commit and push; CI green, including the database tests
- [x] Live `/api/health` shows `"database":"ok"`

## Phase 1 (done)

Next.js 16 + TypeScript (strict), Tailwind v4, ESLint + Prettier, validated env, layout and navigation, all routes as placeholders, game catalogue with tests, Vitest, GitHub Actions CI, README and architecture doc, deployed on Vercel.

## Notes

- Brand name "Lucky Ledger" is a working title; change it in `src/lib/site.ts` (and the README) during Phase 3.
- Slots navigation decision: one "Slots" hub page, not three nav entries.
- Local development and production currently share one Neon database. Later improvement: a separate Neon branch for development.
