---
status: approved
summary: Index of the miti landing page design - 5 sub-project PRDs, contracts, locked decisions, open owner questions
date: 2026-11-15
---

# miti landing page — design index

**TL;DR.** Two static Astro pages (`/` learners, `/enterprise` orgs) on Firebase Hosting at `miti.onolys.com`. Sign-ups go through a Google Apps Script web app into a Google Sheet; no server. Purpose is customer discovery only. [brainstorm.md](brainstorm.md) is the approved brief and the source of truth. Code goes on branch `feat/landing-page` off `main`.

## Sub-projects

| # | Folder | Scope (one line) | Depends on | Phase |
|---|---|---|---|---|
| 01 | [01-site-foundation](01-site-foundation/PRD.md) | Astro scaffold, layout, tokens, team, Firebase + redirect site, CI, test setup | none | 1 |
| 02 | [02-signup-backend](02-signup-backend/PRD.md) | Apps Script `Code.gs`: validate, upsert by email+page, Sheet, honeypot, tests | none | 1 |
| 03 | [03-signup-ui](03-signup-ui/PRD.md) | HeroForm, SignupDialog, client POST, per-page fields, GA events | 01, 02 | 2 |
| 04 | [04-learner-page](04-learner-page/PRD.md) | `/` content: hero, feature tabs, mockups, evaluates, compare, role-play data | 01, 03 | 3 |
| 05 | [05-enterprise-page](05-enterprise-page/PRD.md) | `/enterprise` content: benefits, QC mockup, compare | 04 | 4 |

## Dependency graph

```
01 ─┐
    ├─> 03 ─> 04 ─> 05
02 ─┘
```

## Cross-SP contracts

- CTA: `<button data-open-popup data-trigger="topbar|section:<id>|team|hero">` (01); `popup.ts` dispatches `miti:open-popup` with `{trigger, email}`; SP03 `SignupDialog` listens.
- `getPage(): 'learner' | 'enterprise'` (reads `body[data-page]`, = sheet `page` column); `getSrc()` (sanitized `?src=`, memory only); `track(event, params?)` adds page+src. Events: `popup_open`, `signup_step1`, `signup_step2`.
- `src/lib/config.ts` (SP01 ships; SP03 adds `SIGNUP_PLAN`). Env: `PUBLIC_SIGNUP_URL`, `PUBLIC_GA_ID`, `PUBLIC_SIGNUP_PLAN` (A default, B = no-cors). `check-env` guards URL + GA ID on `build:prod`.
- Apps Script (02 → 03): POST `text/plain` JSON `{step, email, page, src, honeypot, ...nonEmptyFields}`, no preflight. Reply `{ok:true}` or `{"ok":false,"error":"bad_request|invalid_email|too_large|busy|server"}`; `doGet` returns `{ok:true,service:"miti-signup"}`. Plan A reads reply; Plan B opaque = success.
- `<HeroForm/>` (SP03, no `page` prop): SP04/SP05 place it in their own hero; SP03 puts a temporary one in each shell.
- Content data: `roleplay.ts` + `miti.ts` `summarize()` (SP04); mockups `Evidence/Complete/Feedback` plus reusable `TranscriptPane.astro` (SP04), reused by SP05 `QcMockup`.
- `Base.astro` mounts `<SignupDialog/>`; `.env.example` lists the PUBLIC_* vars.

## Locked decisions (from brief decision log)

- No prices anywhere; customer discovery only; no FAQ/privacy/terms pages.
- Two pages: `/` and `/enterprise`; no link from `/` to `/enterprise`; `/enterprise` is noindex.
- Hero saves email first, popup saves answers second; one row per email+page (upsert); honeypot, no CAPTCHA; error + mailto fallback on failure.
- Storage: Google Sheet via Apps Script web app (free); no local sign-up state.
- Astro static site on Firebase Hosting; DNS stays at Namecheap; second Hosting site 301s `onolys.com`/`www` to `miti.onolys.com`.
- GA4 via the Firebase project, no cookie banner.
- US spelling; no accuracy numbers, no "official MITI" implication.
- All mockups come from one fake role-play (single source in `roleplay.ts`).
- Tests: Vitest unit + Playwright e2e (desktop + Pixel 5), CI on push/PR; GitHub Actions auto-deploys to Firebase on push to main after tests pass.
- Done = deployed and live, not just merged.

## Resolved owner decisions

- 01 Drive photos: implementer downloads tejit.jpg, git.jpg, fred.jpg via Google Drive connector (file IDs in brief); if access fails, ask owner; initials placeholders meanwhile.
- 01 onolys.com/www: nothing to keep; point both at redirect site; never touch MX.
- 01 Firebase project: create new project "Onolys" (ID `onolys`, or `onolys-<suffix>`) at implementation if CLI auth exists; else owner creates and sends ID.
- 01 Deploy: auto deploy from GitHub Actions on push to main after tests pass, Firebase service-account secret.
- 02 Google account: personal Gmail (tejitpabari99@gmail.com) owns Sheet and script.
- 03 Popup email differs from hero email: accept two rows; no merge.
- 04 Brief conflict 40-60 vs 53-66: use lines 53-66.
- 04 Card 6 copy: "Feedback while the session is still fresh."
- 05 QC wording approved exactly: "Empathy 5: not supported. No complex reflections at lines 53-66; line 58 concern missed."
- 05 Coder scores approved: CCT 3, SST 4, Partnership 4, Empathy 5, CR 7, extra CR at line 59.

Deferred to implementation (verify then): Chromium path, teal hex contrast, Plan A readability probe, Apps Script quotas, apostrophe visibility, Plan A vs B, dialog Esc in Pixel 5, MITI 4.2.1 reference levels.

## Owner-only manual steps

- Create the Google Sheet, paste the script, deploy as web app (Execute as: Me, Access: Anyone), send the URL.
- Create the Firebase project, enable GA4, send the measurement ID (implementer may create the project if CLI auth exists); add the Firebase service-account secret and PUBLIC_* repo variables in GitHub.
- Add the Firebase DNS records for both domains at Namecheap.
- Have one MI trainer/coder review the mockups (esp. the QC mockup) (wording items already approved).
