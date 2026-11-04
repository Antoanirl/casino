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

## Accounts and sessions (Phase 2b)

- **Passwords** are hashed with scrypt (`node:crypto`, N=2^15, r=8, p=1, 16-byte random salt). The parameters are stored in the hash string, so they can be raised later without breaking existing accounts. Verification uses a constant-time comparison.
- **Login doesn't leak which accounts exist:** an unknown email and a wrong password return the same message, and an unknown email still runs one full hash so both take the same time.
- **Sessions** live in the database. The cookie holds a random 256-bit token; the `Session` table stores only its SHA-256 hash, so a database leak can't be replayed as a login. Logging out deletes the row.
- **Cookie flags:** `HttpOnly` (page scripts can't read it), `Secure` in production (HTTPS only), `SameSite=Lax` (not sent with cross-site form posts), 30-day expiry.
- **Server actions** handle register, login and logout. Next.js rejects action calls from other origins, and every input is validated again on the server with the same Zod schemas the forms use (`src/lib/validation/auth.ts`).
- **Registration is one transaction:** user, wallet and the 1,000-credit signup ledger entry are created together or not at all.
- Rate limiting for login and registration is planned for Phase 9.

## Design system (Phase 3)

**Direction: an honest bookkeeper's casino.** The project's strength is that every credit is accounted for, so the look comes from accounting ledgers instead of the usual neon-casino style.

| Token                | Value                 | Used for                                         |
| -------------------- | --------------------- | ------------------------------------------------ |
| `paper`              | `#eef2e6`             | Page background (green-tinted ledger paper)      |
| `paper-deep`         | `#e2e9d8`             | Footer, hover fills                              |
| `sheet`              | `#f8faf3`             | Ledger pages, inputs, balance chip               |
| `rule`               | `#b9c9b0`             | Ledger ruling, borders                           |
| `ink`                | `#1d2b3a`             | Text, primary buttons                            |
| `ink-soft`           | `#4a5a6a`             | Secondary text                                   |
| `stamp`              | `#b3261e`             | Negative amounts, errors and the stamp logo only |
| `felt` / `felt-deep` | `#0f4d3a` / `#0a3628` | Game surfaces only                               |
| `brass`              | `#c8a04a`             | Illustrations and badges on felt only            |

- **Type:** Libre Caslon Display for headlines (the face of old ledger books), Public Sans for text. Amounts use tabular figures (`.figures`) so columns line up. Both fonts are self-hosted by `next/font`.
- **Signature element:** `LedgerPage` (`src/components/ledger/`), a ruled ledger page with a red margin rule and red negatives. Logged-out visitors see an example; signed-in players see their real latest entries.
- **Components:** `Button` / `ButtonLink` (`primary`, `secondary`, `quiet`), `Logo` and `StampMark`, `GameCard` with line illustrations (`GameArt`).
- **Accessibility floor:** visible focus outlines (ink on paper, brass on felt), skip link, reduced motion respected, colour never the only signal (negative amounts also carry a minus sign).

## Blackjack (Phase 4)

The rules engine lives in `src/server/games/blackjack/` and is pure: it takes an already shuffled shoe and the player's actions and returns new state, never touching the database, the clock or randomness. That makes every rule testable with rigged shoes, and lets the server replay a round exactly.

**House rules**

- 6 decks, shuffled fresh for every round with the secure RNG.
- Dealer stands on all 17s, including soft 17.
- Blackjack pays 3 to 2. The dealer checks for blackjack straight after the deal; if either side has it, the round ends there. No insurance, no surrender.
- Double down on any first two cards, including after a split.
- Split pairs (any two ten-value cards count as a pair) up to 4 hands. Split aces get one card each and can't be split again. 21 after a split pays 1 to 1, not 3 to 2.
- Bets are whole credits from 1 to 500, so every payout is a whole number of minor units.

**What the browser sees:** `toPublicView()` strips the remaining shoe and, until the round ends, the dealer's hole card. The full state never leaves the server.

**Money flow:** doubling and splitting each need another stake equal to the hand's bet (`additionalStake()`); the server takes it through the ledger before applying the move. When the round settles, the total payout is credited in one ledger entry.

**Tests:** hand values, every rule above with rigged shoes, immutability of state, the public view, and 3,000 randomly shuffled rounds checking that every card is accounted for and every payout matches its result.

**Rounds on the server (4b):** `src/server/games/blackjack/service.ts` stores each round in the `BlackjackRound` table (full engine state as JSON, a `version` number, the deal key, and stake/payout totals).

- Every blackjack request runs in one transaction that first locks the player's wallet row (`SELECT ... FOR UPDATE`). Requests from the same player can't interleave; the second waits and then sees the first one's result.
- **Deal:** the bet is debited through the ledger in the same transaction that creates the round. If the player can't cover it, nothing is created. A repeated deal key returns the round it already created. Only one unfinished round per player.
- **Moves:** each move names the round `version` it was made from. A double click sends the same version twice; the second is rejected with the current round (`StaleRoundError`) instead of drawing another card. Double and split debit their extra stake before the card is drawn.
- **Settlement:** when a round ends, its payout is credited in the same transaction (`PAYOUT`, or `REFUND` when exactly the stake comes back). Losses write no entry: the bet entry already recorded them.
- **Ledger keys:** `blackjack:<round>:deal`, `blackjack:<round>:v<version>:<move>`, `blackjack:<round>:payout`, so no step of a round can be charged or paid twice.
- **Server actions** (`src/app/actions/blackjack.ts`): `dealBlackjack`, `playBlackjack`, `currentBlackjackRound`. They validate input with Zod, accept bets in whole credits, and turn known errors into messages for the table.

## Roulette (Phase 5)

Rules engine in `src/server/games/roulette/engine.ts`, pure like blackjack's: the server draws the pocket with the secure RNG (`randomInt(0, 37)`) and passes it in.

**Table:** European, single zero (37 pockets). Straight number pays 35 to 1; red/black and odd/even pay 1 to 1; dozens and columns pay 2 to 1. Every bet except a straight-up 0 loses on zero. Each spot takes 1 to 500 whole credits; a spin carries at most 1,000 credits. Chips on the same spot are merged.

**Spin = one transaction** (`service.ts`): validate bets, draw the pocket, save a `RouletteSpin` row, debit the total stake (`BET`), credit any winnings (`PAYOUT`). If the stake can't be covered, the whole spin rolls back and no row is saved. `(userId, spinKey)` is unique: a repeated request gets the original spin back and can't re-roll the pocket.

**Tests:** every pocket against every bet type, including an exact check that each bet type returns 36/37 of its stake over the 37 pockets (house edge exactly 1/37); wheel order and colours; table limits; and database tests for payouts, losses, repeated and simultaneous spins, and unaffordable stakes.

## Slots (Phase 6)

**One engine, many games.** `src/server/games/slots/engine.ts` knows nothing about fruit or gems. A game is a `SlotConfig` (`src/server/games/slots/games/`): its symbols (normal, wild or scatter), one reel strip per reel, paylines, a line paytable and an optional scatter paytable, and the bets it accepts. Adding a game means adding a config.

- **Spin:** the server picks a stop on every reel with the secure RNG; the window shows 3 rows from each stop. Each payline pays the best left-to-right run (a wild stands in for normal symbols, a scatter breaks a line); scatters pay anywhere on screen.
- **Pays are multiples of the total bet**, written in hundredths (`10000` = 100x), and bets are whole credits, so every payout is a whole number of minor units.
- **Exact return to player:** `theoreticalRtp()` computes it from the strips and paytables without simulation. Every stop is equally likely, so on any single row each reel shows each symbol with its strip frequency, independently of the other reels; every payline therefore has the same expected pay. Scatter pays use the distribution of scatter counts in each reel's window, combined across reels.
- **Classic Slots:** 3 reels, 5 paylines, 32-symbol strips. **Return to player 95.70%**, hit frequency 25.6%, top win 100x the bet.

**Tests** (`slots.test.ts`): every config passes `validateConfig()`; the RTP formula matches brute force over all 32,768 stop combinations exactly (and over a toy game with wilds and scatters); line, wild and scatter rules; and a **1,000,000-spin simulation** whose average return must land within five standard errors of the theoretical figure.

**Server:** `SlotSpin` rows store the game, bet and reel stops (the outcome is fully determined by them). A spin is one transaction (save the spin, debit the bet, credit the win), with the same `(userId, spinKey)` replay protection as roulette. Ledger entries use the game name `slots:<slug>`.

## Slots: wild multipliers and free spins (Phase 7)

Both new features are config fields, so Gem and Adventure Slots are just two more files in `games/`.

- **Wild multipliers:** a wild may carry `multiplier` (a whole number). A line win that uses at least one multiplying wild pays that many times over, once per line with the largest multiplier in the run. A line made only of wilds pays the wild's own price, unmultiplied.
- **Free spins:** `freeSpins: { triggers, multiplier }`. A paid spin showing enough scatters awards that many free spins at the same bet; every free-spin win (line and scatter) is multiplied, and free spins can't retrigger.
- **One round, one payout:** the server draws the free spins' stops right after seeing the award, stores the whole round's stops on the same `SlotSpin` row (`stops` is a list of stop lists; Phase 6 rows hold one flat list and are still read), and credits the round's total win as a single `PAYOUT` entry. The browser only plays the round back.
- **Exact RTP with the bonus:** a free spin is an ordinary spin with its wins multiplied, so it is worth `multiplier x E[spin]`. The return is `E[spin] + sum over k of P(k scatters) x spins awarded for k x multiplier x E[spin]`. A test checks this against brute force on a toy game with a 3x wild and free spins.

| Game            | Reels x rows | Paylines | Feature                           | RTP    | Top win                          |
| --------------- | ------------ | -------- | --------------------------------- | ------ | -------------------------------- |
| Classic Slots   | 3 x 3        | 5        | none                              | 95.70% | 100x                             |
| Gem Slots       | 5 x 3        | 10       | prism wild, 2x                    | 95.70% | 100x (five prisms)               |
| Adventure Slots | 5 x 3        | 10       | 3+ maps: 8/12/20 free spins at 2x | 96.10% | 55x per line, more in free spins |

## Dashboard and statistics (Phase 8)

Read-only queries in `src/server/stats/`; nothing there changes a balance.

- **Per-game statistics come from the round tables** (`BlackjackRound`, `RouletteSpin`, `SlotSpin`), one SQL query with `UNION ALL` and `GROUP BY`. A round's stake and payout are what a player thinks of as one game; the ledger splits the same money into bet, payout and refund entries (a blackjack push is a refund). Unfinished blackjack hands are left out and shown separately as "in play".
- **Figures:** rounds, staked, returned (stakes included), net (returned − staked), return % (returned ÷ staked), rounds won (paid back more than staked) and biggest win (largest single-round profit). The maths is a pure function (`summary.ts`) with unit tests.
- **Balance history** is the `balanceAfter` of the latest 200 ledger entries.
- **Ledger history** is paged (25 per page, newest first) and filtered by game and kind of entry. Filters live in the URL (`/dashboard?game=gems&kind=wins&page=2`), so a filtered view can be bookmarked and works without JavaScript; unknown values fall back to the defaults.

## Security (Phase 9)

See [security.md](./security.md) for the threat model. In short: rate limits in PostgreSQL (`src/server/rate-limit.ts`) on sign-in, sign-up and every bet; security headers on every response (`src/lib/security-headers.ts`); expired sessions removed on each sign-in.

## Decisions log

- **2026-10-15: Slots as a hub page.** Navigation has a single "Slots" entry leading to `/slots`, which lists the three games. Keeps the header short and matches the shared-engine design.
- **2026-10-15: Single Next.js app instead of a separate backend.** One deploy, shared types between client and server, and route handlers are enough for this scale.
- **2026-10-16: Neon for PostgreSQL.** Free tier, serverless, connects to Vercel directly. The app uses the pooled connection (`DATABASE_URL`); migrations use the direct one (`DATABASE_URL_UNPOOLED`).
- **2026-10-16: Prisma 6.** Mature, typed queries, built-in migrations. Pinned to v6 to avoid the v7 configuration changes for now.
- **2026-10-16: Hand-rolled session auth (coming in 2b).** Password hashing with `node:crypto` scrypt and database sessions. No third-party auth service, no native modules to compile on Windows, and every security decision is visible in the code.
- **2026-11-03: Ledger-paper visual identity.** A light, accounting-inspired theme instead of the dark felt-and-gold casino default: it matches the name, makes the ledger the hero, and keeps felt for the game tables where it belongs.
- **2026-11-03: Fresh shuffle every blackjack round.** Rounds are independent, card counting is pointless, and a round's full state is just its shoe and the player's actions, which keeps storage and replay simple.
- **2026-11-03: Slot pays as multiples of the total bet.** Rather than a per-line bet, every pay is a multiple of the whole bet in hundredths. Players choose one number, payouts stay whole minor units, and the RTP formula stays simple.
- **2026-11-04: Free spins settled with the paid spin.** The server plays the whole bonus at once and pays it in one ledger entry, instead of the browser requesting each free spin. Nothing can be left half-finished, and there is no free-spin state to protect from replays.
- **2026-11-04: Statistics from round tables, history from the ledger.** Rounds answer "how did I do at roulette?"; the ledger answers "where did every credit go?". Both are stored already, so the dashboard needs no new tables.
- **2026-11-04: Rate limits in PostgreSQL.** Serverless instances share no memory, so counters need shared storage. The database is already there; Redis would add a service and a secret for a few writes a second.
