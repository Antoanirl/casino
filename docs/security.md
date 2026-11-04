# Security

Lucky Ledger uses play money only, but it is built as if the credits were real: the threats
below are the ones a real-money site faces, and each has a concrete defence in the code.

## Threats and defences

| Threat                                                      | Defence                                                                                                                                                                                                                                 | Where                                                 |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Changing a bet's result or a balance from the browser       | The server decides every outcome; the browser sends only intent (bet, hit, spin). Inputs are validated with Zod on the server.                                                                                                          | `src/app/actions/`, `src/server/games/`               |
| Spending the same credits twice with parallel requests      | Debits are one conditional `UPDATE ... WHERE balance >= x`; PostgreSQL locks the row. Tested with 20 simultaneous bets.                                                                                                                 | `src/server/ledger/ledger.ts`                         |
| Replaying a request (double click, retry, captured request) | Every bet carries a unique key; `(userId, key)` is unique, so a repeat returns the original result instead of charging again. Blackjack moves also carry the round's version.                                                           | ledger, game services                                 |
| Predictable outcomes                                        | `node:crypto` randomness only, never `Math.random()`, for cards, pockets and reel stops.                                                                                                                                                | `src/server/rng.ts`                                   |
| Password theft from a database leak                         | scrypt with a per-password salt; constant-time comparison.                                                                                                                                                                              | `src/server/auth/password.ts`                         |
| Session theft                                               | The cookie holds a random 256-bit token; the database stores only its SHA-256 hash. Cookie is `HttpOnly`, `Secure` in production, `SameSite=Lax`. Logging out deletes the session everywhere it was used. Expired sessions are removed. | `src/server/auth/sessions.ts`                         |
| Cross-site request forgery                                  | Server actions only accept requests whose `Origin` matches the site (Next.js), plus `SameSite=Lax` cookies.                                                                                                                             | Next.js, session cookie                               |
| Password guessing                                           | Sign-ins limited to 20 per IP address per 10 minutes and 10 per account per 15 minutes, with the same message whether or not the account exists.                                                                                        | `src/server/rate-limit.ts`, `src/app/actions/auth.ts` |
| Account enumeration                                         | Login always answers "Invalid email or password"; registration says a name or email is taken (unavoidable for sign-up, and rate limited).                                                                                               | `src/app/actions/auth.ts`                             |
| Farming sign-up bonuses                                     | New accounts limited to 5 per IP address per hour.                                                                                                                                                                                      | rate limits                                           |
| Flooding the game servers                                   | Bets and moves limited to 120 per player per minute, far above what the tables' animations allow.                                                                                                                                       | rate limits                                           |
| Cross-site scripting                                        | React escapes all output and the app renders no user-written HTML. The Content Security Policy only allows scripts, styles, fonts and images from the site itself.                                                                      | `src/lib/security-headers.ts`                         |
| Clickjacking                                                | `frame-ancestors 'none'` and `X-Frame-Options: DENY`.                                                                                                                                                                                   | security headers                                      |
| Leaking secrets                                             | Server code imports `server-only`; the database URL is read only on the server and validated at first use. `.env` is git-ignored.                                                                                                       | `src/server/`                                         |
| Exposing the shuffled shoe                                  | The blackjack round's full state stays on the server; the browser gets a view without the undealt cards or the dealer's hole card.                                                                                                      | `toPublicView` in the blackjack service               |

## Rate limiting

Counters live in PostgreSQL (`RateLimit` table), not in memory: on Vercel every request may run
on a different serverless instance, so an in-memory counter would reset constantly. Each check is
a single atomic upsert that either opens a new fixed window or adds one to the current window, so
simultaneous requests can't both slip under the limit (tested with 10 at once). Keys are the rule
name plus a SHA-256 hash of the email, IP address or user id, so no address is stored in clear.

If the counter can't be reached, the check lets the request through and logs the error: the
action needs the same database and would fail on its own anyway, and a broken limiter shouldn't
lock every player out.

**Trade-off:** the per-account sign-in limit means someone who knows a player's email can lock
them out for up to 15 minutes. A real-money site would add a CAPTCHA or email-based unlock;
for a play-money portfolio project the short lockout is acceptable.

**Client IP:** taken from `x-forwarded-for`, which Vercel sets itself (a value sent by the client
is overwritten). Locally every request shares one bucket.

## Security headers

Sent on every response (`next.config.ts`):

- `Content-Security-Policy`: everything from `'self'` only; `object-src 'none'`,
  `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`, `upgrade-insecure-requests`.
  `script-src` includes `'unsafe-inline'` because Next.js streams pages with small inline
  scripts; a nonce-based policy would force every page to render dynamically, and the app never
  renders user-written HTML.
- `Strict-Transport-Security` (two years), `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, and a
  `Permissions-Policy` that turns off camera, microphone, location, payment and USB.

## Not covered (yet)

- Proving to players that results weren't changed after the bet: Phase 9b (provably fair).
- Email verification and password reset: no email is sent anywhere in this project.
