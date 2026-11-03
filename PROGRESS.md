# Progress

Where the project stands, so work can be picked up from any point.

**Current phase:** 5. Roulette (5b written, waiting on checks)
**Next step:** run the 5b checks below and play a few spins; then Phase 5 is done and Phase 6 (slot engine + Classic Slots) is next.

## Roadmap

- [x] Phase 1: Foundation + CI/deploy (live on Vercel, CI green)
- [x] Phase 2: Database, accounts and ledger
  - [x] 2a: PostgreSQL + Prisma, ledger service, secure RNG, idempotency, concurrency tests
  - [x] 2b: Registration, login, logout, sessions, real balance in the header
- [x] Phase 3: Design system and homepage
  - [x] 3a: Tokens, fonts, logo, buttons, ledger page, game cards, homepage, restyle of every page
  - [x] 3b: Loading and empty states, game-page shells, mobile review
- [x] Phase 4: Blackjack (playable on the live site)
  - [x] 4a: Rules engine (deal, hit, stand, double, split, dealer play, payouts) with tests
  - [x] 4b: Server: rounds in the database, bets and payouts through the ledger, actions API
  - [x] 4c: The table: cards, chips, buttons, animations
- [ ] **Phase 5: Roulette**
  - [x] 5a: Rules engine, spins in the database through the ledger, server actions, tests
  - [ ] 5b: The table: betting layout, wheel, results
- [ ] Phase 6: Slot engine + Classic Slots (with RTP simulation test)
- [ ] Phase 7: Gem Slots and Adventure Slots (configs on the same engine)
- [ ] Phase 8: Dashboard and statistics
- [ ] Phase 9: Hardening and QA (audit, rate limiting, e2e, accessibility, provably fair)
- [ ] Phase 10: Portfolio packaging (monitoring, docs, screenshots, demo video)

## Phase 5b checklist

Code (written):

- [x] Roulette wheel: SVG in European order, spins to the drawn pocket, no spin with reduced motion (`src/components/roulette/roulette-wheel.tsx`)
- [x] Roulette table: chip values, number grid with dozens, columns and outside bets, undo and clear, spin, winning spots highlighted, last 12 numbers (`roulette-table.tsx`)
- [x] Phone layout: the table turned upright in three columns
- [x] Roulette marked playable

Checks (on your machine):

- [ ] `npm run format`, then `npm run check` passes
- [ ] `npm run dev`: place several bets, spin, try undo and clear, and a narrow window
- [ ] Commit and push; CI green

## Phase 5a checklist (done)

Code (written):

- [x] Roulette engine: pockets and colours, wheel order, bet spots, payouts, table limits (`src/server/games/roulette/engine.ts`)
- [x] 19 engine tests, including an exact 1/37 house edge for every bet type (already run here: all pass)
- [x] `RouletteSpin` table and spin service: stake, pocket and payout in one transaction; repeated spins return the original (`service.ts`)
- [x] Server actions for the table: spin, recent results (`src/app/actions/roulette.ts`)
- [x] 7 database tests: straight win, all-lose spin, repeated and simultaneous spins, unaffordable stake, limits, recent spins

Checks (on your machine):

- [x] `npx prisma migrate dev --name roulette_spins`
- [x] `npm run format`, then `npm run check` passes
- [x] Commit and push (including the new migration); CI green, including the database tests

## Phase 4c checklist (done)

Code (written):

- [x] Playing cards (paper face, red hearts and diamonds, brass-patterned back) with a deal-in animation (`src/components/blackjack/playing-card.tsx`)
- [x] Blackjack table: chips and deal, only the allowed moves, split hands with the active one highlighted, results per hand and a round summary (`blackjack-table.tsx`)
- [x] Header balance refreshes after every bet and payout; an unfinished round comes back after a reload
- [x] Play-test fixes: moves sit on the table under the cards, clicks are ignored briefly after the table changes (no double-click moves), notes explain split aces and automatic stands
- [x] Blackjack marked playable; the logged-out page says the table is open and offers log in or sign up

Checks (on your machine):

- [x] `npm run format`, then `npm run check` passes
- [x] `npm run dev`: play several rounds; try double, a split if you get a pair, and reload mid-hand
- [x] Commit and push; CI green
- [x] Play-test on the live site at phone and desktop width

## Phase 4b checklist (done)

Code (written):

- [x] `BlackjackRound` table: engine state, version, deal key, stake and payout (`prisma/schema.prisma`)
- [x] Round service: wallet lock per player, bet and deal in one transaction, version check on every move, payout at settlement (`src/server/games/blackjack/service.ts`)
- [x] Server actions for the table: deal, play a move, resume the current round (`src/app/actions/blackjack.ts`)
- [x] Database tests: deal and payout, blackjack at the deal, push refund, double, repeated and simultaneous deals, double clicks, unaffordable moves, other players' rounds

Checks (on your machine):

- [x] `npx prisma migrate dev --name blackjack_rounds` (creates the new table in Neon and a migration file)
- [x] `npm run format`, then `npm run check` passes
- [x] Commit and push (including the new `prisma/migrations` folder); CI green, including the database tests

## Phase 4a checklist (done)

Code (written):

- [x] Cards, shoe and hand values (`src/server/games/blackjack/cards.ts`)
- [x] Rules engine: deal, blackjack check, hit, stand, double, split (up to 4 hands), split aces, dealer stands on soft 17, payouts (`engine.ts`)
- [x] Public view that hides the shoe and the hole card
- [x] 33 tests including 3,000 random rounds (already run here: all pass)
- [x] House rules documented in `docs/architecture.md`

Checks (on your machine):

- [x] `npm run format`, then `npm run check` passes
- [x] Commit and push; CI green

## Phase 3b checklist (done)

Code (written):

- [x] Game page shells: closed felt table, rules, opening phase, balance or sign-up prompt (`GameShell`)
- [x] Opening phase and rules for every game in `src/lib/games.ts`, with tests
- [x] Loading states: page skeleton (`src/app/loading.tsx`) and ledger skeleton on the dashboard
- [x] Empty ledger state
- [x] Ledger margin rule limited to the entry rows; footer gap trimmed (re-applied: the first fix didn't make it into the commit)

Checks (on your machine):

- [x] Delete the unused placeholder: `git rm src/components/ui/page-placeholder.tsx`
- [x] `npm run format`, then `npm run check` passes
- [x] Commit and push; CI green
- [x] Reviewed game pages, sign-up and login at phone width on the live site; game pages now show the title and rules before the table on phones

## Phase 3a checklist (done)

Code (written):

- [x] Design tokens in `src/app/globals.css` (ledger paper, ink, stamp red, felt, brass)
- [x] Fonts: Libre Caslon Display + Public Sans via `next/font`
- [x] Stamp logo, `Button`/`ButtonLink`, `GameCard` with line illustrations
- [x] `LedgerPage` component and display helpers (`src/lib/ledger-display.ts`) with unit tests
- [x] Homepage: ledger hero (your real entries when signed in), the tables, house rules
- [x] Header with responsive nav, footer with source link
- [x] Restyled: auth forms, dashboard (now shows your latest 20 entries), slots hub, placeholders, error and 404 pages

Checks (on your machine):

- [x] `npm run format`, then `npm run check` passes
- [x] `npm run dev`: homepage logged out (example ledger) and logged in (your entries)
- [x] Header and homepage look right on a narrow window (phone width)
- [x] Commit and push; CI green; live site updated
- [x] Reviewed live at phone and desktop width
- [x] Vercel deployment protection turned off so the live site is public

## Phase 2b checklist (done)

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

- [x] `npm run format`, then `npm run check` passes
- [x] `npm run dev`: sign up, see 1,000 credits in the header, log out, log back in
- [x] Wrong password shows "Invalid email or password"
- [x] `/dashboard` while logged out sends you to the login page
- [x] Commit and push; CI green
- [x] Same flow works on the live site

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

- Brand name "Lucky Ledger" is now part of the design (stamp logo, ledger theme). It is set in `src/lib/site.ts`.
- Slots navigation decision: one "Slots" hub page, not three nav entries.
- Local development and production currently share one Neon database. Later improvement: a separate Neon branch for development.
- A QA test account (`qa_7cd7d6`) was created on the shared database while play-testing blackjack.
