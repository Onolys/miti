---
status: draft
summary: 9 tasks - Astro skeleton, shared contracts, layout, Team section, Firebase hosting + redirect, env guard, tests, CI and auto-deploy
date: 2026-11-15
---
# Tasks: SP01 Site foundation

Source of truth: /root/projects/onolys/miti/.worktrees/docs/landing-page-launch-plan/docs/agent_files/docs-landing-page-launch-plan-20261114-2200/01-site-foundation/PRD.md. Built on branch `feat/landing-page` off main. Repo has no code and no `.github/` yet, so everything is fresh. SP02-05 add to this skeleton, never restructure it.

| # | Task | Depends on | Status |
|---|---|---|---|
| 1 | Project scaffold, tokens, Vitest | none | todo |
| 2 | Context, track, popup helpers + unit tests | 1 | todo |
| 3 | Layout, shared components, page shells | 1, 2 | todo |
| 4 | Team section and photos | 3 | todo |
| 5 | Firebase hosting config and redirect site | 1 | todo |
| 6 | Env guard, build:prod, deploy script | 1 | todo |
| 7 | Playwright config and smoke e2e | 3, 4 | todo |
| 8 | CI workflow: tests on push and PR | 6, 7 | todo |
| 9 | CI deploy job on push to main | 5, 6, 8 | todo |

## Task 1 — Project scaffold, tokens, Vitest
What it is / what it means: The empty repo becomes a buildable static Astro project (R1, R2; decisions 1-3).
What changes at a high level: Astro (current stable, verified at scaffold), npm lockfile, TypeScript, `output: 'static'`, `.env.example` listing the three PUBLIC_* vars, gitignored real env files. `config.ts` exports the sign-up URL for SP03. `tokens.css` holds the teal accent (contrast-checked at 4.5:1 on white), grays, score-chip colors, spacing/type scale, 16px gutter; `global.css` imports self-hosted Inter (latin, swap). Vitest config (node + jsdom) covering `src/**` and `apps-script/**`.
Done when: `npm ci && npm run build` succeeds; `vitest run` runs (a trivial token/config test passes); chosen teal hex and its measured contrast ratio are recorded in a comment.

## Task 2 — Context, track, popup helpers + unit tests
What it is / what it means: The three small contracts SP03 depends on (R3, R4, R5; decisions 4-7).
What changes at a high level: `getPage()` reads `body[data-page]`; `getSrc()` reads `?src=` once, trims, allows `[A-Za-z0-9_.-]`, caps 64 chars, memory only. `track()` merges page + src and calls `gtag`; `window.gtag` is always a stub pushing to `dataLayer`, never throws. `popup.ts` delegates clicks on `[data-open-popup]` and dispatches `miti:open-popup` with `{trigger, email: ''}`; no listener is a no-op and it does not fire `popup_open`. Write tests first.
Done when: Vitest tests pass for getSrc sanitization (absent, bad chars, over-length), getPage, track merge, track no-throw without GA, popup event dispatch with and without a listener; no storage or cookie writes.

## Task 3 — Layout, shared components, page shells
What it is / what it means: The shared page frame both routes use (R1, R3, R5).
What changes at a high level: `Base.astro` (props title, description, page, noindex?) renders `lang="en"`, Seo, Analytics, TopBar, main, Footer, sets `body[data-page]`, loads popup.ts once, and mounts SP03's SignupDialog (a minimal inert placeholder if SP03 has not landed). Analytics injects gtag only when `PUBLIC_GA_ID` is set. TopBar has the "Onolys" wordmark plus "Get early access" CtaButton. Footer carries the exact brief text, mailto, no policy links. `Section.astro` renders slot then trailing CtaButton (`cta` default true). `index.astro` and `enterprise.astro` shells hold the SP04/SP05 slot comment; enterprise gets the noindex meta.
Done when: build output has both routes; Vitest/DOM tests prove CtaButton markup (`data-open-popup`, `data-trigger`), Section cta toggle, and Analytics omission of gtag with no GA ID; `/enterprise` HTML has noindex meta and `/` does not.

## Task 4 — Team section and photos
What it is / what it means: The shared Team block at the foot of both pages (R6; decision 9).
What changes at a high level: `team.ts` holds verbatim content for Tejit Pabari, Gitika Bose (she/her), Frédérique Escudier (Neuropsychologist badge). `TeamSection.astro` renders 3 equal cards, LinkedIn inline-SVG links with aria-label and noopener, partner line, CtaButton (trigger `team`) and "Questions?" mailto. Photos `tejit.jpg`, `git.jpg`, `fred.jpg` downloaded once from Drive by file ID via the Drive connector, committed, rendered with `astro:assets`; initials placeholders until real files exist. Section uses `cta={false}`.
Done when: tests assert 3 cards, names, badge, alt text "Photo of <name>", LinkedIn aria-labels and rel/target, partner line, mailto; build stays green with placeholders; photos committed if Drive access worked (else logged for owner).

## Task 5 — Firebase hosting config and redirect site
What it is / what it means: Hosting for the two sites (R7; decision 8).
What changes at a high level: `firebase.json` hosting array: `miti` target (`dist`, cleanUrls, no trailing slash) and `redirect` target (`redirect/` stub, 301 `**` to `https://miti.onolys.com`). Headers: immutable cache on `/_astro/**` and `/fonts/**`, HTML no-cache, `X-Robots-Tag: noindex` on `/enterprise`, nosniff and referrer-policy baseline; no CSP. `.firebaserc` targets. Create Firebase project "Onolys" (id `onolys` or suffixed) if CLI auth exists, else placeholder and log owner step. Never touch MX records.
Done when: a config test parses `firebase.json` and asserts two sites, headers, 301 rule and noindex only on enterprise; emulator (or dry run) serves `/enterprise` without a trailing-slash redirect loop and the redirect site 301s any path.

## Task 6 — Env guard, build:prod, deploy script
What it is / what it means: A broken sign-up must never ship silently (R7; decision 10).
What changes at a high level: `scripts/check-env.mjs` fails when `PUBLIC_SIGNUP_URL` is missing or not starting `https://script.google.com/`, or `PUBLIC_GA_ID` missing or without `G-` prefix; plan var is ignored. `build:prod` runs it before build; plain `build` stays tolerant. `npm run deploy` = `build:prod` + `firebase deploy --only hosting` as manual fallback.
Done when: Vitest tests for check-env pass for valid, missing and malformed values of each var; `build:prod` exits non-zero on each bad case and zero on valid.

## Task 7 — Playwright config and smoke e2e
What it is / what it means: Browser-level proof on the production build (R8; decision 11).
What changes at a high level: `playwright.config.ts` with `testDir: e2e`, Chromium only, desktop and Pixel 5 projects, webServer `npm run build && npm run preview` on 4321, optional `PW_CHROMIUM_PATH` executable (path verified locally). One smoke spec; requests to googletagmanager.com aborted.
Done when: smoke e2e passes on both projects: both routes load, top bar CTA dispatches `miti:open-popup` with a trigger and no console errors, `/enterprise` has noindex and `/` does not, Team shows 3 cards, `getSrc`/`track` push to `dataLayer`, no horizontal scroll at 360px, no storage/cookie writes.

## Task 8 — CI workflow: tests on push and PR
What it is / what it means: CI exists before any feature code lands (R8; decision 12). SP01 owns it.
What changes at a high level: `.github/workflows/ci.yml` test job on push and PR: checkout, setup-node LTS with npm cache, `npm ci`, `astro check`, `vitest run`, `npm run build` with dummy `PUBLIC_SIGNUP_URL` and `PUBLIC_GA_ID` as plain workflow env, `playwright install --with-deps chromium`, `playwright test`, upload report on failure.
Done when: workflow YAML lints; a push to `feat/landing-page` runs it and Vitest plus both Playwright projects pass green in GitHub Actions.

## Task 9 — CI deploy job on push to main
What it is / what it means: Automatic deploy after green tests (R8; decision 13).
What changes at a high level: A second job in `ci.yml`, `needs` the test job, gated to push on `main` only (never PRs). Builds via `build:prod` with real `PUBLIC_SIGNUP_URL`, `PUBLIC_GA_ID`, `PUBLIC_SIGNUP_PLAN` from repo variables, then deploys both sites (`miti`, `redirect`) with the Firebase deploy action or firebase-tools using the `FIREBASE_SERVICE_ACCOUNT` secret. Create the service account if CLI auth exists.
Done when: a workflow-condition test or reviewed YAML confirms the job runs only on `refs/heads/main` push after tests and fails via check-env if vars are missing; first real deploy is verified after owner steps below.

## Owner steps
- If no Firebase CLI auth: create project "Onolys", two Hosting sites (`miti`, `redirect`), send project ID; enable GA4 and send measurement ID.
- Connect domains in Hosting: `miti.onolys.com` to `miti`; `onolys.com` and `www` to `redirect`; add Firebase's A/TXT records at Namecheap, leave MX untouched.
- Add GitHub secret `FIREBASE_SERVICE_ACCOUNT` and repo variables `PUBLIC_SIGNUP_URL` (from SP02), `PUBLIC_GA_ID`, `PUBLIC_SIGNUP_PLAN` (if not created by implementer).
- If Drive access fails: drop the 3 team photos into `src/assets/team/`.
