# Progress

Where the project stands, so work can be picked up from any point.

**Current phase:** 9. Hardening and QA (9a written)
**Next step:** apply the migration, update CI by hand, push 9a. Then 9b: provably fair outcomes.

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
- [x] Phase 5: Roulette (playable on the live site)
  - [x] 5a: Rules engine, spins in the database through the ledger, server actions, tests
  - [x] 5b: The table: betting layout, wheel, results
- [x] Phase 6: Slot engine + Classic Slots (playable on the live site)
  - [x] 6a: Config-driven engine, exact RTP, Classic Slots, 1M-spin simulation, spins on the server
  - [x] 6b: The machine: reels, bet picker, paytable, wins highlighted
- [x] Phase 7: Gem Slots and Adventure Slots (playable on the live site)
  - [x] 7a: Engine: wild multipliers and free spins; Gem and Adventure configs with exact RTP; free-spin rounds on the server
  - [x] 7b: The machines: symbol art, free-spins sequence, paytable notes, games opened in the lobby
- [x] Phase 8: Dashboard and statistics (live)
  - [x] 8a: Server: per-game statistics, balance history, filtered and paged ledger history, with tests
  - [x] 8b: The dashboard page
- [ ] **Phase 9: Hardening and QA**
  - [ ] 9a: Security: rate limits, security headers, session cleanup, threat model
  - [ ] 9b: Provably fair outcomes (server seed commitment, client seed, verification page)
  - [ ] 9c: End-to-end browser tests and accessibility checks
- [ ] Phase 10: Portfolio packaging (monitoring, docs, screenshots, demo video)

## Phase 9a checklist

Code (written):

- [x] Rate limits stored in PostgreSQL (`RateLimit` table): sign-in per IP and per account, sign-up per IP, bets and moves per player
- [x] Security headers on every response: Content Security Policy, HSTS, no framing, nosniff, referrer and permissions policies
- [x] Expired sessions removed on each sign-in
- [x] `docs/security.md`: threats and the defence for each
- [x] Unit tests: headers, rate-limit helpers. Integration tests: limits per window, per id, and under 10 simultaneous requests

Setup (on your machine):

- [ ] `npx prisma migrate dev` (applies the new `rate_limits` migration)
- [ ] Update `.github/workflows/ci.yml` by hand: `actions/checkout@v6` and `actions/setup-node@v6` (CI's Node 20 warning)
- [ ] `npm run format`, then `npm run check` passes
- [ ] Commit and push; CI green
- [ ] Live site sends the new headers

## Phase 8b checklist (done)

Code (written):

- [x] Account summary: rounds, staked, net result, return, biggest win, balance
- [x] Balance chart: server-rendered SVG on ledger rules, starting balance marked, text summary for screen readers
- [x] Results by game, totalled under a double rule; game names open that game's entries
- [x] Every entry: game and kind filters as links, 25 per page with older/newer links, shareable URLs
- [x] Ledger page component: empty-state text and closing balance can be set per use

Checks (on your machine):

- [x] Check the dashboard on localhost (desktop and phone width)
- [x] `npm run format`, then `npm run check` passes
- [x] Commit and push; CI green

## Phase 8a checklist (done)

Code (written):

- [x] Ledger filters in the URL (`?game=gems&kind=wins&page=2`): parsing, links, and what each filter matches (`src/lib/ledger-filters.ts`)
- [x] Per-game statistics from the round tables: rounds, staked, returned, net, return %, rounds won, biggest win (`src/server/stats/`)
- [x] Balance history: the balance after each of the latest 200 ledger entries
- [x] Ledger history: filtered by game and kind of entry, 25 per page, newest first
- [x] Unit tests: filters, statistics maths
- [x] Integration tests: statistics across all three round tables, balance history, paging and filters

Checks (on your machine):

- [x] `npm run format`, then `npm run check` passes
- [x] Commit and push; CI green (the new database tests run there)

## Phase 7b checklist (done)

Code (written):

- [x] Symbol drawings for Gem Slots (seven gems, each with its own shape) and Adventure Slots (boots, rope, lantern, compass, idol, map)
- [x] Five-reel machine sized for phones
- [x] Free spins play out on the reels one by one, with a banner, a running total and "Skip to the total"; reduced motion jumps straight to the result
- [x] Win lines mention when the prism doubled a win
- [x] Paytable notes for the wild multiplier and free spins
- [x] Gem and Adventure Slots open in the lobby, with updated rules

Checks (on your machine):

- [x] Play-test both games on localhost (desktop and phone width), including a free-spins round
- [x] `npm run format`, then `npm run check` passes
- [x] Commit and push; CI green; both games live

## Phase 7a checklist (done)

Code (written):

- [x] Engine: wilds can carry a multiplier (applied once per winning line)
- [x] Engine: free spins: enough scatters on a paid spin start N free spins at the same bet, every win multiplied, no retriggers; `settleRound()` settles the paid spin plus its free spins
- [x] Exact RTP now includes the free-spins bonus; checked against brute force on a toy game
- [x] Gem Slots config: 5 reels, 10 paylines, 2x prism wild, **RTP 95.70%**
- [x] Adventure Slots config: 5 reels, 10 paylines, map scatter, 8/12/20 free spins at 2x, **RTP 96.10%**
- [x] Simulations: 500,000 Gem spins and 300,000 Adventure rounds must agree with the maths
- [x] Server: a round's stops (paid spin + free spins) stored on one row, one payout for the round; old spins still readable
- [x] Integration tests: free-spin round through the ledger, reading old rows

Checks (on your machine):

- [x] `npx prisma generate` (only comments changed in the schema; no migration needed)
- [x] `npm run format`, then `npm run check` passes
- [x] Commit and push; CI green

## Phase 6b checklist (done)

Code (written):

- [x] Slot symbols drawn as icons (`src/components/slots/symbol-art.tsx`), reel spin and stop animations
- [x] Generic slot machine driven by the config: reels stop left to right on the server's stops, winning lines drawn, wins explained, bet picker (`slot-machine.tsx`)
- [x] Paytable built from the config, with the exact return to player and top win (`paytable.tsx`)
- [x] Play-test fixes: plural symbol names, compact bet buttons on phones
- [x] Classic Slots page for players; Classic marked playable; payline names in the config

Checks (on your machine):

- [x] `npm run format`, then `npm run check` passes
- [x] `npm run dev`: spin a few times at different bets; try a narrow window
- [x] Commit and push; CI green

## Phase 6a checklist (done)

Code (written):

- [x] Slot engine: configs, reel stops, paylines, wilds, scatters, exact RTP (`src/server/games/slots/engine.ts`)
- [x] Classic Slots config: 3 reels, 5 paylines, RTP 95.70%, hit rate 25.6% (`games/classic.ts`)
- [x] 12 engine tests including brute-force RTP checks and a 1,000,000-spin simulation (already run here: all pass, about 4 seconds)
- [x] `SlotSpin` table and spin service: one transaction per spin, repeated spins return the original (`service.ts`)
- [x] Server action for the machines (`src/app/actions/slots.ts`)
- [x] 6 database tests: win and loss through the ledger, repeated and simultaneous spins, unknown game, bad and unaffordable bets, recent spins

Checks (on your machine):

- [x] `npx prisma migrate dev --name slot_spins`
- [x] `npm run format`, then `npm run check` passes
- [x] Commit and push (including the new migration); CI green, including the database tests

## Phase 5b checklist (done)

Code (written):

- [x] Roulette wheel: SVG in European order, spins to the drawn pocket, no spin with reduced motion (`src/components/roulette/roulette-wheel.tsx`)
- [x] Roulette table: chip values, number grid with dozens, columns and outside bets, undo and clear, spin, winning spots highlighted, last 12 numbers (`roulette-table.tsx`)
- [x] Phone layout: the table turned upright in three columns
- [x] Play-test fixes: chips centred on their spot, steady layout when the result appears, outlined felt spots, wheel scrolls into view on phones
- [x] Roulette marked playable

Checks (on your machine):

- [x] `npm run format`, then `npm run check` passes
- [x] `npm run dev`: place several bets, spin, try undo and clear, and a narrow window
- [x] Commit and push; CI green

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
