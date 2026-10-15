# Progress

Where the project stands, so work can be picked up from any point.

**Current phase:** 1. Foundation + CI/deploy
**Next step:** finish the "To do on your machine" list below, then start Phase 2.

## Roadmap

- [ ] **Phase 1: Foundation + CI/deploy**
- [ ] Phase 2: Database, accounts and ledger (PostgreSQL + Prisma, auth, ledger service, secure RNG, idempotency)
- [ ] Phase 3: Design system and homepage
- [ ] Phase 4: Blackjack (server-side round state)
- [ ] Phase 5: Roulette
- [ ] Phase 6: Slot engine + Classic Slots (with RTP simulation test)
- [ ] Phase 7: Gem Slots and Adventure Slots (configs on the same engine)
- [ ] Phase 8: Dashboard and statistics
- [ ] Phase 9: Hardening and QA (audit, rate limiting, e2e, accessibility, provably fair)
- [ ] Phase 10: Portfolio packaging (monitoring, docs, screenshots, demo video)

## Phase 1 checklist

- [x] Next.js + TypeScript (strict) project
- [x] Tailwind CSS v4, ESLint (flat config), Prettier with Tailwind class sorting
- [x] Folder structure (`app`, `components`, `lib`, `server`, `docs`)
- [x] Validated environment variables (`src/lib/env.ts`, `.env.example`)
- [x] Root layout, header navigation with active state, footer disclaimer
- [x] Routes: `/`, `/blackjack`, `/roulette`, `/slots`, `/slots/[classic|gems|adventure]`, `/dashboard`, `/login`, `/register`, `/api/health`, 404 and error pages
- [x] Game catalogue as a single source of truth, with unit tests
- [x] Vitest setup
- [x] GitHub Actions CI (lint, format, typecheck, test, build)
- [x] README, architecture doc, this progress file
- [ ] **To do on your machine:**
  - [ ] `npm install` (creates `package-lock.json`, which CI needs)
  - [ ] `npm run format` once, then `npm run check` and `npm run build` all pass
  - [ ] `npm run dev` and click through every route
  - [ ] `git init`, first commit, push to a new GitHub repo, confirm CI is green
  - [ ] Import the repo into Vercel and confirm the live URL loads

## Notes

- Brand name "Lucky Ledger" is a working title; change it in `src/lib/site.ts` (and the README) during Phase 3.
- Slots navigation decision: one "Slots" hub page, not three nav entries.
