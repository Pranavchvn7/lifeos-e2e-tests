# API and security tests

Two new groups of tests, both tagged `@regression` so the nightly and manual runs pick them up automatically
(the quick pull-request gate still runs only `@smoke`). Run them alone with `npm run test:api` or `npm run test:security`.

## Why they exist
| Group | What it adds over the browser tests | Speed |
|---|---|---|
| **API** (`tests/api`) | Talks to the server directly (no browser), so it checks the server's own rules: what it refuses, what it never reveals. | ~1 s per test |
| **Security** (`tests/security`) | Checks that private data stays private: who may read it, what leaves the server, what a script can reach. | a few seconds each |

## How the API tests work
- `src/helpers/api.ts` — site address, the `Origin` header a browser would send, and `authPost()`, which waits and retries when the server answers 429 (too many requests).
- `src/fixtures/api.ts` — `apiAccount`: **one real account per worker**, created through the sign-up endpoint and deleted at the end through the app's own "Delete account" button. All API tests in that worker share it, so the suite makes very few sign-ups.
- `src/data/api-cases.ts` — the list of bad sign-up requests (data-driven: add a row, get a test).

## The tests
**API**
1. Sign-up refuses: an email without `@`, no email, a too-short password, no password (4 tests from one table) — a clear 400/422, no crash, no stack trace in the answer.
2. A wrong password and an unknown email get the *same* answer — otherwise the form reveals which emails have accounts.
3. Without a session, `get-session` says nobody is signed in.
4. Signed in, `get-session` returns the user and never the password.
5. Signing out ends the session on the server.
6. The diagnostics page shows only yes/no flags — no connection string, no database host.

**Security**
7. The session cookie is `HttpOnly`, `Secure`, `SameSite=Lax`; a script cannot read it; after logout a *copied* token no longer works.
8. The app's data request works for the owner, **fails without a session**, and **fails when it claims to come from another website** (the app's cross-site guard).
9. Private text (one-liner, journal, task, email) is not in any response the share page downloads — stronger than checking the screen, because text can be sent and merely hidden.
10. A share name containing HTML (`<img src=x onerror=…>`) is shown as text and never runs.
11. The share page carries `noindex`.
12. Five malformed share links (too short, path-escape, SQL-looking, script-looking, 300 characters) all show "not available", never an error.

## Added in the security audit (tests 13–16)
13. **Sensitive files are not downloadable** — 15 addresses (`/.env`, `/.git/config`, `/package.json`, `/src/lib/auth/server.ts`, `/migrations/…`, the personal spreadsheet…) must be refused or answered with the ordinary web page, never the file (data-driven list in `src/data/security-cases.ts`).
14. **Malformed requests get a clean answer** — 5 attacker-style requests (not JSON, wrong types, 500 KB name, bad URL escape, unknown address) must return a 4xx and no stack trace, connection string or secret name.
15. **Security headers** — `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy` on pages and API answers. This fails until the app's new `vercel.json` is deployed.
16. **Rate limit (manual, tag `@ratelimit`)** — 15 quick wrong sign-ins; expects a 429 where the limit should be ON (production) and none where it is OFF (staging). Start it from Actions → E2E tests → Run workflow → `suite = ratelimit`. Never part of the nightly run, because it blocks the runner's IP for a few seconds.

## Added in the checklist review (tests 17–19)
17. **Saving is refused without a session and from another website** — the app's own save request is replayed with no cookie, and with the owner's cookie claiming to come from another site; both must fail.
18. **Two accounts never see each other's data** — two browsers, two accounts, a unique text in each; neither text appears on the other's screen or in any server response.
19. **The browser code contains no secrets and no source maps** — every JavaScript file the site sends is scanned for connection strings and secret names, and each `.js.map` address must not serve a source map.
20. **The login page loads no scripts from other websites** — reads the served HTML and lists every `<script src>` that points elsewhere; only Vercel's preview toolbar is allowed. (Fails until the grok.com script fix is deployed.)
Likeliest first-run surprises: #17 finds no POST (the save request is named differently — check the Network tab), #19 flags a harmless string (look at the file named in the message).

## If one fails on its first run — read this first
These tests were written from reading the app's code and could not be run against the live site while writing them. Most likely places for a wrong assumption:
- **#1** the server answers with a different 4xx number than 400/422 — widen the list in the test.
- **#7** a cookie attribute differs (for example `SameSite`) — the message shows the real value; decide whether the app or the test is wrong.
- **#8** step 1 (the owner gets their data) fails: the app may load its data differently than "GET request from the browser". Look at the Network tab and adjust the filter in the test. Steps 2 and 3 are the security checks; only trust them once step 1 passes.
- **#6** the `cache-control` header can be rewritten by Vercel; if only that line fails, relax it.
A *real* security failure looks different: a request that should be refused returns 200, or the secret text shows up in a body. Treat that as an app bug, not a test bug.

## Interview talking points
- "API tests share one account per worker, created through the API and cleaned up through the UI — fast, and no leftover data."
- "A security test needs a sanity check first (the owner *can* read the data); otherwise a refusal could be passing for the wrong reason."
- "I assert on what the server sends, not only on what the page shows."
