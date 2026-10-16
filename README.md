# Lucky Ledger

A play-money online casino built as a portfolio project: Blackjack, European Roulette and three slot games on a shared slot engine, with server-side outcomes, a transactional credit ledger and a player dashboard.

> **Virtual credits only.** No real money can be deposited, wagered, won or withdrawn, and credits cannot be bought.

_Status: Phase 2 (database, accounts and ledger). See [PROGRESS.md](./PROGRESS.md) for the roadmap and current state._

## Tech stack

Next.js (App Router) · TypeScript · Tailwind CSS · PostgreSQL (Neon) · Prisma · Zod · Vitest · GitHub Actions · Vercel.

## Getting started

Requirements: Node.js 20.9 or newer (22 recommended, see `.nvmrc`).

```bash
npm install
cp .env.example .env         # Windows PowerShell: Copy-Item .env.example .env
# fill in DATABASE_URL and DATABASE_URL_UNPOOLED
npx prisma migrate dev
npm run dev
```

Open http://localhost:3000.

## Scripts

| Command                | What it does                            |
| ---------------------- | --------------------------------------- |
| `npm run dev`          | Start the dev server                    |
| `npm run build`        | Production build                        |
| `npm start`            | Serve the production build              |
| `npm run lint`         | ESLint                                  |
| `npm run format`       | Format all files with Prettier          |
| `npm run format:check` | Check formatting without changing files |
| `npm run typecheck`    | Generate route types and run `tsc`      |
| `npm test`             | Run unit tests (Vitest)                 |
| `npm run test:db`      | Run database integration tests          |
| `npm run db:migrate`   | Create/apply database migrations        |
| `npm run db:studio`    | Browse the database in Prisma Studio    |
| `npm run check`        | Lint, format check, typecheck and tests |

## Project structure

See [docs/architecture.md](./docs/architecture.md) for folder layout, routes, core rules and design decisions.

## Continuous integration

Every push to `main` and every pull request runs lint, format check, typecheck, unit tests, database tests against a throwaway PostgreSQL container, and a production build (`.github/workflows/ci.yml`).
