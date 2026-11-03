# Staging setup — test every pull request BEFORE it reaches production

*This is the "do this" document: clicks and values, in order. The "understand this" document is
`FRAMEWORK-AND-CICD-EXPLAINED.md`. Replace `<you>` with `Pranavchvn7`.*

## What you are building

```
pull request ──► Vercel builds a PREVIEW ──► uses the STAGING database ──► e2e smoke tests run on that preview
                                                                              │
              merge button stays blocked until  "e2e / smoke (preview)"  is green ◄┘
merge to main ──► Vercel deploys PRODUCTION ──► e2e smoke runs once more ──► "e2e / smoke (production)"
```

Why: today the tests run **after** the code is already live, and they create/delete throw-away users in your **real**
database. After this setup a bad change is stopped at the pull request, and production data is never touched by tests.

**Time:** about 45 minutes. **Order matters** — do A → G.

---

## A. Create the staging database (Neon)

1. Go to <https://console.neon.tech> → **New Project** → name it `lifeos-staging`, region close to Vercel's (same as your
   production project is fine).
2. **Do not copy or branch your production database** — that would copy real users' data. A new project starts empty. ✔
3. Open the project → **Connect** → copy the connection string (starts with `postgresql://…` and ends with
   `?sslmode=require`). Keep it for step B.

You do **not** need to create tables. Every deployment runs `npm run db:migrate` during its build (`npm run build` =
`vite build && npm run db:migrate`), so the first preview build creates them in the staging database.

## B. Give Vercel different settings for Preview and Production

Vercel → your project → **Settings → Environment Variables**. For each row below, the goal is: *Production keeps its
current value; Preview gets its own.*

How to do it for a variable that currently applies to **all** environments:
1. Click **⋯ → Edit** on the existing variable and **untick Preview** (keep Production, and Development if it is
   ticked). Save.
2. Click **Add New** → same *Key*, the *staging value*, tick **only Preview**. Save.
   (Vercel allows the same key once per environment.)

| Key | Production | Preview (staging) |
|---|---|---|
| `DATABASE_URL` | existing production Neon URL | **the staging URL from step A** |
| `BETTER_AUTH_SECRET` | existing value | **a different random value** (e.g. `openssl rand -hex 32`) |
| `BETTER_AUTH_URL` | `https://YOUR-APP.vercel.app` | **leave unset** (each preview uses its own address) |
| `AUTH_RATE_LIMIT` | *(do not set)* | `off` |

Tick **Sensitive** on the database URL and the secret. Environment-variable changes apply only to **new** deployments, so
the next preview will pick them up.

> Why `AUTH_RATE_LIMIT=off` on Preview only? The login library limits sign-ups to about 3 per 10 seconds per IP. Tests
> create many accounts, so on staging we switch the limit off. The app ignores this setting when `VERCEL_ENV` is
> `production`, so it cannot weaken production even by mistake.

## C. Let the tests through Vercel's preview password

Vercel protects preview URLs with a login ("Deployment Protection"). Keep that on — and give the tests a key:

1. Vercel → **Settings → Deployment Protection**.
2. Find **Protection Bypass for Automation** → **Add secret / Generate** → copy the secret value.
3. Keep it for step D (it becomes `VERCEL_BYPASS_SECRET`).

The framework sends this secret **only** to the site under test, never to third-party sites.

## D. GitHub settings (secrets and variables)

Where: repo → **Settings → Secrets and variables → Actions**. Secrets tab for secrets, Variables tab for variables.

### App repo (`<you>/LifeOS`)
| Kind | Name | Value | Status |
|---|---|---|---|
| Secret | `E2E_DISPATCH_TOKEN` | token that may start the e2e repo | already done |
| Variable | `E2E_REPO` | `<you>/lifeos-e2e` | already done |
| Variable | `E2E_PROD_URL` | `https://YOUR-APP.vercel.app` (no trailing `/`) | already done |
| Variable | `E2E_ON_PREVIEW` | `true` | **set this now** |

### E2E repo (`<you>/lifeos-e2e`)
| Kind | Name | Value | Status |
|---|---|---|---|
| Secret | `VERCEL_BYPASS_SECRET` | the value from step C | **new** |
| Secret | `APP_STATUS_TOKEN` | a second token, see below | **new — required for the merge gate** |
| Variable | `E2E_NIGHTLY_URL` | *(optional)* a stable URL for the nightly full run, see step H | optional |
| Variable | `ALLURE_PAGES` | leave unset (Allure publishing stays off) | — |

**Creating `APP_STATUS_TOKEN`:** GitHub → profile photo → **Settings → Developer settings → Personal access tokens →
Fine-grained tokens → Generate new token** → name `lifeos-e2e-status`, expiration 90 days →
**Repository access: only select repositories → your app repo `LifeOS`** →
**Permissions → Repository → Commit statuses: Read and write** → Generate → copy.
This token lets the e2e repo write the ✅/❌ onto the app's commits and pull requests (nothing else).

## E. Put the code changes in place

| File bundle | Goes to | What it does |
|---|---|---|
| `app-patch-v4.3.zip` (`src/lib/auth/server.ts`, `DEPLOY.md`) | **App repo** (upload, same paths) | adds the staging-only rate-limit switch |
| `e2e-fix-4.zip` (`.github/workflows/e2e.yml`, `docs/CI-CD-SETUP.md`) | **E2E repo** (upload, same paths) | per-environment status names (`e2e / smoke (preview)` and `(production)`), optional nightly URL, Allure off by default |
| `app-repo-trigger.zip` (`.github/workflows/trigger-e2e.yml`) | App repo — **already in place** | unchanged; it already sends Preview deployments when `E2E_ON_PREVIEW=true` |

Wait for Vercel to finish deploying the app patch to production before continuing.

## F. Dry run with a test pull request (do this BEFORE turning on the gate)

1. In the **app repo**, create a branch (for example `test-staging`) and change something harmless (add a line to
   `README.md`). Open a **pull request**.
2. Vercel adds a comment with a **Preview** link. Open it (you'll log in to Vercel) and check
   `<preview-url>/api/auth/diagnostics`. You want: `"database": "connected"`, `"authTablesComplete": true`,
   `"BETTER_AUTH_SECRET": true`.
3. App repo → **Actions** → *Trigger E2E tests after deploy* → green; the log says **GitHub accepted the message … Preview**.
4. E2E repo → **Actions** → a run named `E2E (repository_dispatch · Preview · abc1234)`.
5. Back on the PR page → **Checks / statuses** → **`e2e / smoke (preview)`** goes *pending → success*.
6. Prove the isolation: Neon → `lifeos-staging` → **Tables**/SQL editor → the tables exist there; your **production**
   Neon project did not get any test users.

If all of that works, the setup is correct. Details for each failure are in the table at the end.

## G. Turn on the gate

App repo → **Settings → Branches → Add branch protection rule** (or *Rulesets*):
- Branch name pattern: `main`
- ✔ **Require a pull request before merging**
- ✔ **Require status checks to pass before merging** → search and add **`e2e / smoke (preview)`**
  (it only appears in the list after step F has reported it once).
- Save.

From now on: **branch → pull request → preview + staging DB → smoke tests → green → merge → production**. The
production deployment then reports **`e2e / smoke (production)`** (informational; do *not* make it required, it runs
after the merge).

## H. Optional: a stable staging address for the nightly full run

Per-PR preview URLs change every time, so the nightly full regression still runs against **production** by default
(`E2E_BASE_URL`). To run it on staging instead:
1. In the app repo create a long-lived branch `staging` (from `main`).
2. Vercel gives that branch a stable address like `https://life-git-staging-<team>.vercel.app`.
3. In the e2e repo set variable `E2E_NIGHTLY_URL` to that address (no trailing `/`).
4. Keep the branch current (merge `main` into `staging` after releases).

## Troubleshooting

| Symptom | Cause → fix |
|---|---|
| No e2e run for the PR | App repo variable `E2E_ON_PREVIEW` is not exactly `true`; or the *Trigger E2E* run shows "Preview deployment skipped". |
| e2e run fails at *Wait until the site answers*, HTTP 401 | `VERCEL_BYPASS_SECRET` missing/wrong in the e2e repo, or created before you turned protection on — re-copy it. |
| `database: FAILED` on the preview | Preview `DATABASE_URL` missing/wrong (step B). The preview *build* fails at the migration step too — check the Vercel build log. |
| `BETTER_AUTH_SECRET: false` in diagnostics | Add the Preview `BETTER_AUTH_SECRET` (step B) and redeploy. |
| Tests fail with "Too many requests" | Preview `AUTH_RATE_LIMIT=off` missing, or the deployment is older than the variable — push a new commit. |
| `Invalid origin` when signing up on a preview | `BETTER_AUTH_URL` is set for Preview — unset it for Preview only. |
| PR shows "Expected — Waiting for status to be reported" forever | The e2e run did not start (see first row), or `APP_STATUS_TOKEN` is missing/expired so the status could not be written. |
| Status exists but the PR doesn't wait for it | Branch protection lists a different name; it must be exactly `e2e / smoke (preview)`. |
| Smoke fails only on a PR that changed the UI | The tests run from the e2e repo's `main`. If a PR changes screens/test ids, update the e2e repo first (or at the same time). |
| `e2e / smoke (production)` fails after a merge | Production is broken **now** — open the run, read the report, roll back in Vercel (Deployments → previous → *Promote to Production*) if needed. |

## Undo / pause
- Pause the gate: untick the required status in branch protection.
- Stop testing previews: delete the app repo variable `E2E_ON_PREVIEW` (production runs continue).
- The staging database can be deleted any time in Neon; nothing in production depends on it.
