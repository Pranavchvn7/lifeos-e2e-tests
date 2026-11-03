# LifeOS E2E Tests

![E2E](https://github.com/<your-username>/lifeos-e2e/actions/workflows/e2e.yml/badge.svg)

End-to-end tests for **LifeOS** (<https://YOUR-APP.vercel.app>) — Playwright + TypeScript, Page Object Model,
custom fixtures, data-driven cases, GitHub Actions CI.

**Start with [docs/FRAMEWORK-AND-CICD-EXPLAINED.md](docs/FRAMEWORK-AND-CICD-EXPLAINED.md)** (how every part connects) and [docs/STAGING-SETUP.md](docs/STAGING-SETUP.md) (preview + staging database + merge gate). Also: [docs/FRAMEWORK-GUIDE.md](docs/FRAMEWORK-GUIDE.md) (and [docs/CI-CD-SETUP.md](docs/CI-CD-SETUP.md) for branch protection, run-after-deploy and the Allure report) — it explains the structure, how a test runs, the
CI/CD pipeline, setup, debugging and interview talking points.

## Quick start

```bash
npm install
npx playwright install --with-deps chromium
cp .env.example .env           # set BASE_URL if you test another deployment
npm run test:smoke             # fast checks (desktop + mobile)
npm run test:regression        # full regression
npm run report                 # open the HTML report
```

| Script | Purpose |
|---|---|
| `npm run test:smoke` | `@smoke` tests on desktop and phone viewport |
| `npm run test:regression` | `@regression` tests |
| `npm run test:ui` | Playwright UI mode (best for learning/debugging) |
| `npm run test:headed` | Watch the browser |
| `npm run typecheck` | TypeScript check |

## CI

**Allure report:** `https://<your-username>.github.io/lifeos-e2e/` (after the one-time Pages setup).

`.github/workflows/e2e.yml` runs **smoke** on every push/PR, the **full regression nightly** (03:00 IST) and **on demand**
(Actions → *E2E tests* → *Run workflow*). Set the repository variable `E2E_BASE_URL` to choose the site under test.
Reports, screenshots, videos and traces are uploaded as artifacts.

## Layout

```
src/pages/      Page Objects        src/fixtures/   custom `test` (account create/cleanup)
src/helpers/    dates, persist, files, user factory     src/data/   data-driven tables
tests/smoke/    must-never-break checks                 tests/regression/   deeper checks
```
