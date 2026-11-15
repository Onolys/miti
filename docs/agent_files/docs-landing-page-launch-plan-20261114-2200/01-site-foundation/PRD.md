---
status: approved
summary: Astro skeleton for both pages: layout, tokens, CTA/popup-open contract, src/page/track helpers, Team section, Firebase hosting + domain redirect, test and CI scaffolding
date: 2026-11-15
---

# PRD: SP01 Site foundation

Repo/branch: `miti`, `docs/landing-page-launch-plan` (existing worktree) · Depends on: none (Phase 1) · Owns: everything under "Owns" below; SP02-05 add to it, never restructure it.

**Owns:** `package.json`, `astro.config.mjs`, `tsconfig.json`, `.env.example`, `src/layouts/Base.astro`, `src/components/{TopBar,Footer,Section,CtaButton,TeamSection,Seo,Analytics}.astro`, `src/data/team.ts`, `src/styles/{tokens,global}.css`, `src/lib/{context,track,popup,config}.ts`, `src/pages/{index,enterprise}.astro` (shells), `src/assets/team/*`, `firebase.json`, `.firebaserc`, `redirect/index.html`, `scripts/check-env.mjs`, `playwright.config.ts`, `vitest.config.ts`, `.github/workflows/ci.yml`.

## TL;DR
Static Astro site, two page shells, shared layout and components, one teal design-token file. Three small contracts for SP03: a popup-open DOM event, a `getPage()/getSrc()` helper, and a `track()` helper. Firebase Hosting serves `dist/`; a second Hosting site on `onolys.com`/`www` does the 301 to `miti.onolys.com`. Vitest + Playwright + GitHub Actions CI in place before any feature code.

## Problem
Four other sub-projects build into the same site. Without a fixed skeleton and agreed interfaces they will collide on layout, tokens, popup wiring, analytics and hosting. SP01 ships that skeleton so SP02-05 can work independently.

## Goals / Non-Goals
| Goals | Non-Goals |
|---|---|
| Both routes build and deploy-ready, with top bar, footer, Team section | Page copy, mockups, compare tables (SP04/05) |
| Stable popup / src / page / track contracts | The dialog, forms, POST logic (SP03); Apps Script (SP02) |
| Hosting, redirect, headers, caching in config | DNS (owner step); first live deploy runs via CI deploy job |
| Test runners and CI wired and green on an empty-ish site | Writing sign-up e2e tests (SP03) |
| No server code, no cookies, no localStorage | Prices, FAQ, policy pages, link from `/` to `/enterprise` |

## Requirements
**R1 Project and layout**
- Astro (current stable major, verify at scaffold; pinned via lockfile), npm, TypeScript, plain CSS (no Tailwind), `output: 'static'`.
- `Base.astro` props: `title`, `description`, `page: 'learner' | 'enterprise'`, `noindex?`. Renders `<html lang="en">`, Seo, Analytics, TopBar, `<main>`, Footer; sets `<body data-page="{page}">`.
- TopBar: "Onolys" wordmark (text, links to current page top) + "Get early access" button. Footer: exact brief text, email as mailto, no policy links, no "not used to train models" line.
- `Section.astro`: props `id`, `heading?`, `cta` (default true). Renders content slot, then a trailing `CtaButton`. Team section sets `cta={false}` (it carries its own).
- Shells: `index.astro` and `enterprise.astro` each = Base + marked slot comment (`<!-- SP04 sections -->` / `<!-- SP05 sections -->`) + `TeamSection` last. SP04 edits only `index.astro`, SP05 only `enterprise.astro`.

**R2 Design tokens** (`tokens.css`, CSS custom properties): white bg, near-black text, one deep teal accent (target about `#0B5F5A`; must hit AA 4.5:1 on white for text and buttons, verify), neutral grays, score-chip colors (good/fair/low; always paired with text, never color alone), spacing and type scale, 16px mobile gutter. Inter self-hosted via `@fontsource-variable/inter` (latin subset, `font-display: swap`). Mobile first; no horizontal scroll at 360px.

**R3 Popup-open contract** (SP03 implements the dialog; SP01 only emits)
- Every CTA is `<button type="button" data-open-popup data-trigger="topbar|section:<id>|team|hero">`.
- `src/lib/popup.ts` (loaded once by Base) delegates clicks on `[data-open-popup]` and dispatches `document.dispatchEvent(new CustomEvent('miti:open-popup', { detail: { trigger, email: '' } }))`.
- SP03 listens for `miti:open-popup`; the hero form dispatches the same event with `email` set. With no listener the click is a harmless no-op. SP01 does not fire `popup_open`; SP03 does, on handling the event.

**R4 Context helper** (`src/lib/context.ts`)
- `getPage(): 'learner' | 'enterprise'` reads `body[data-page]`.
- `getSrc(): string` reads `?src=` once on load, trims, restricts to `[A-Za-z0-9_.-]`, max 64 chars, returns `''` if absent. Kept in module memory only (no storage).

**R5 Analytics** (`Analytics.astro`, `src/lib/track.ts`)
- If `PUBLIC_GA_ID` is set, inject gtag.js async + config (`anonymize_ip` not needed; no consent banner). If unset, no script, no network call.
- `window.gtag` is always defined as a stub that pushes to `window.dataLayer`, so `track()` never throws and e2e can assert on `dataLayer`.
- `track(event: string, params?: object)` merges `{ page: getPage(), src: getSrc() }` into params and calls `gtag('event', ...)`. Event names used by SP03: `popup_open`, `signup_step1`, `signup_step2`.
- `/enterprise`: `<meta name="robots" content="noindex, nofollow">` plus `X-Robots-Tag: noindex` header in `firebase.json`. No `robots.txt` Disallow (crawler must see noindex). No sitemap.

**R6 Team section** (`TeamSection.astro` + `src/data/team.ts`)
- 3 equal cards: photo, name, bio, LinkedIn icon link. No title labels. Content verbatim from brief: Tejit Pabari; Gitika Bose (she/her); Frédérique Escudier, Ph.D., Psy.D. with the small accent badge "Neuropsychologist".
- Photos: `src/assets/team/{tejit,git,fred}.jpg`, rendered with `astro:assets` `<Image>` (square crop, webp, width/height set, hashed output). Alt: "Photo of <name>". LinkedIn: inline SVG icon, `aria-label="<name> on LinkedIn"`, `target="_blank" rel="noopener noreferrer"`.
- Below cards: partner line (exact brief text), then `CtaButton` + "Questions?" `mailto:tejitpabari99@gmail.com`.
- Photo acquisition (one-time, committed to repo, not fetched at build): download by Drive file ID (tejit 1sjQMHBZBA_qcW7fK38y8i8hpflFBxZSD, git 1PiU3LMFQrqHqlz19iDWLR_dkSXAzWweI, fred 1rOOgrmGph9B90LGa1YvPqjR3783JhkaW) via the Google Drive MCP `download_file_content`, if the executing agent has it; else owner drops files into `src/assets/team/`. Until then a generated initials placeholder keeps the build green.

**R7 Hosting config**
- `firebase.json` `hosting` as an array of two sites: (a) `miti` target: `public: dist`, `cleanUrls: true`, `trailingSlash: false`; (b) `redirect` target: `public: redirect` (one stub file), `redirects: [{ source: "**", destination: "https://miti.onolys.com", type: 301 }]`. `.firebaserc` maps targets to site IDs; project ID is a placeholder until the owner creates it.
- Headers: `/_astro/**` and `/fonts/**` `Cache-Control: public, max-age=31536000, immutable`; HTML (`**/*.html` and extensionless routes) `no-cache`; `/enterprise` adds `X-Robots-Tag: noindex`; baseline security headers (`X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`). No CSP in v1 (inline gtag snippet; revisit).
- `npm run deploy` = `build:prod` + `firebase deploy --only hosting`. `build:prod` runs `scripts/check-env.mjs`, which fails if `PUBLIC_SIGNUP_URL` or `PUBLIC_GA_ID` is missing or malformed (`G-` prefix; URL starts `https://script.google.com/`), so a broken sign-up never ships silently. Plain `build` stays tolerant (CI, dev).

**R8 Tests and CI**
- Vitest (node env, jsdom for DOM helpers); `include` covers `src/**` and `apps-script/**` so SP02's logic tests run in the same runner. Unit tests here: `getSrc` sanitization, `getPage`, `track` merge + no-throw without GA, `check-env`.
- Playwright config: `testDir: e2e`, Chromium only, desktop + mobile (Pixel 5) projects, `webServer: npm run build && npm run preview` on 4321, `launchOptions.executablePath` from `PW_CHROMIUM_PATH` if set (local preinstalled Chromium; no `playwright install` locally). One smoke e2e: both routes load, top bar CTA exists and dispatches `miti:open-popup`, `/enterprise` has noindex, Team shows 3 cards.
- CI (`ci.yml`, on push and PR): checkout, setup-node (LTS, npm cache), `npm ci`, `astro check`, `vitest run`, `npm run build` with `PUBLIC_SIGNUP_URL=https://script.google.com/macros/s/TEST/exec` and `PUBLIC_GA_ID=G-TEST000000` set as plain workflow `env` (neither is a secret; real values live in repo Variables for later deploy use), `npx playwright install --with-deps chromium`, `playwright test`. e2e aborts requests to googletagmanager.com. Upload Playwright report on failure.
- CI deploy job (`ci.yml`): runs on push to `main` only and `needs` the test job (tests green). Builds with real `PUBLIC_SIGNUP_URL`, `PUBLIC_GA_ID`, `PUBLIC_SIGNUP_PLAN` from GitHub repo variables/secrets (via `build:prod`, so check-env guards it), then deploys both Hosting sites (`miti`, `redirect`) using the official Firebase deploy action or firebase-tools with the service-account secret (e.g. `FIREBASE_SERVICE_ACCOUNT`).

## Architecture
```
src/
  layouts/Base.astro  -> Seo, Analytics, TopBar, <slot/>, Footer
  pages/index.astro | enterprise.astro  (shells; SP04 / SP05 fill)
  components/ Section CtaButton TeamSection ...
  lib/ context.ts (getPage,getSrc)  track.ts  popup.ts
  data/team.ts   assets/team/*.jpg   styles/tokens.css global.css
dist/ -> Firebase site "miti"  (miti.onolys.com)
redirect/ -> Firebase site "redirect" (onolys.com, www.onolys.com -> 301 miti.onolys.com)
```
Build-time env: `PUBLIC_*` are inlined by Astro/Vite via `import.meta.env`; `.env.example` documents them, real `.env*` is gitignored. Only Base reads `PUBLIC_GA_ID`; SP03 reads `PUBLIC_SIGNUP_URL` (exported from `src/lib/config.ts`, SP01 creates it).
- `Base.astro` mounts `<SignupDialog/>` (component owned by SP03; inert until SP03 lands) and `.env.example` lists `PUBLIC_SIGNUP_URL`, `PUBLIC_GA_ID` and `PUBLIC_SIGNUP_PLAN` (check-env ignores the plan). SP03 adds the `SIGNUP_PLAN` export to `config.ts`.

Interface summary for SP03:
```ts
// event on document: 'miti:open-popup' detail { trigger: string; email: string }
getPage(): 'learner' | 'enterprise'   // values are the sheet's `page` column
getSrc(): string
track(event: string, params?: Record<string, unknown>): void // adds page+src
```

## Decisions
| # | Decision | Choice | Alternatives considered | Why |
|---|---|---|---|---|
| 1 | Package manager | npm + lockfile | pnpm, bun | Zero extra install in CI and on this machine |
| 2 | Styling | Plain CSS + tokens | Tailwind | Two small pages; fewer deps, tokens are the whole system |
| 3 | Fonts | Self-host Inter via fontsource | Google Fonts | No third-party request, no cookie/privacy surprise, faster first paint |
| 4 | Popup signal | `data-open-popup` + delegated `miti:open-popup` CustomEvent | Direct import of a popup module; global `window.openPopup()` | Decouples SP01 from SP03; works before SP03 exists; hero form reuses the same event |
| 5 | src storage | In-memory, read at load | sessionStorage/localStorage | Brief forbids local sign-up state; single-page flow needs none |
| 6 | Page IDs | `learner` / `enterprise` | `/`, `home` | Readable sheet column; SP02 must accept exactly these |
| 7 | GA | gtag.js from `PUBLIC_GA_ID`; stub keeps `track` safe; dataLayer testable | Firebase JS SDK analytics | GA4 measurement ID is all that is needed; SDK adds weight |
| 8 | Domain redirect | Second Firebase Hosting site on `onolys.com` + `www` with `redirects` 301 `**` | Namecheap URL redirect; Console "redirect" option; single site + client JS | firebase.json cannot match by host, so a separate site is the only in-repo, reproducible way. Namecheap URL redirect does not serve HTTPS on the source, so `https://onolys.com` would error. Console redirect is an acceptable fallback (no repo config) |
| 9 | Photos | Commit optimized files in repo via `astro:assets` | Fetch from Drive at build | Build must not depend on Drive auth; hashed, long-cached |
| 10 | Prod env guard | `build:prod` fails on missing/malformed PUBLIC_* | Silent empty defaults | Silent no-op would lose all sign-ups |
| 11 | e2e target | Production build via `astro preview` | `astro dev` | Tests what ships, including env inlining |
| 12 | CI env | Dummy PUBLIC_* inline in workflow for tests; real values from repo variables in the deploy job | GitHub Secrets for all | Values are public by design; fake values keep e2e hermetic |
| 13 | Deploy | GitHub Actions deploy job on push to main after green tests, service-account secret | Owner-run `npm run deploy` only | Owner decision: automatic, repeatable; `npm run deploy` stays as manual fallback |

## Manual steps (owner-only)
- Create Firebase project; add two Hosting sites (`miti`, `redirect`); enable GA4 and send the measurement ID; create the Firebase project if the implementer lacks CLI auth.
- Connect custom domains in Hosting: `miti.onolys.com` to site `miti`; `onolys.com` and `www.onolys.com` to site `redirect`. Add the A/TXT records Firebase shows at Namecheap.
- Add the Firebase service-account secret (`FIREBASE_SERVICE_ACCOUNT`) and the `PUBLIC_SIGNUP_URL` / `PUBLIC_GA_ID` / `PUBLIC_SIGNUP_PLAN` repo variables in GitHub (implementer may create the service account if CLI auth exists).
- Supply the real `PUBLIC_SIGNUP_URL` (from SP02's Apps Script deploy) and `PUBLIC_GA_ID`.
- If Drive access is unavailable to the agent: place the 3 team photos in `src/assets/team/`.

### Owner configuration evidence — 2026-11-15

The owner reports Namecheap, Firebase, GitHub, Sheet/Apps Script and GA4 setup completed. Supplied public configuration: `PUBLIC_SIGNUP_URL=https://script.google.com/macros/s/AKfycbyxcPSPdCvgwXYV9fhEIaEMqWE9_2ZxT_gZyJeykddALa4r_7jMv6jbs1HSNLi6HNKfyQ/exec`, `PUBLIC_GA_ID=G-BDWQM4BQLM`. Preliminary independent checks confirmed the expected GitHub secret name and matching public repo variables, and A records resolving to `199.36.158.100` for `miti.onolys.com`, `onolys.com` and `www.onolys.com`. This does not verify secret contents or a successful deploy. Custom-domain HTTPS currently fails certificate validation; live checks are ongoing. Production deployment, redirects and GA event delivery are not yet accepted. These are implementation evidence notes; the approved manual steps and acceptance requirements remain unchanged.

## Risks / Open Questions
- [RESOLVED: implementer downloads tejit.jpg, git.jpg, fred.jpg from the Drive folder via the Google Drive connector (file IDs in brief); if access fails, ask owner for files; initials placeholders meanwhile] Agent access to the Drive folder (MCP download by file ID) is unverified; folder may be private.
- [RESOLVED: nothing to keep on onolys.com or www; point both at the redirect site; never touch MX records] Does `onolys.com` currently host a site or have A/CNAME records (and `www`) that must be replaced? MX/email records must not be touched.
- [RESOLVED: create a new Firebase project named "Onolys" (project ID `onolys`, or `onolys-<suffix>` if taken) at implementation if Firebase/gcloud CLI auth is available on the machine; otherwise owner creates it and sends the ID] Firebase project ID and the two site IDs (placeholders in `.firebaserc` until the project exists).
- [RESOLVED: auto deploy from GitHub Actions on push to main (after tests pass), using a Firebase service-account secret] Deploy method: owner-run `firebase deploy` vs a GitHub Actions deploy with a service-account secret.
- [DEFERRED: verify at implementation] Path of the preinstalled Chromium on this machine for `PW_CHROMIUM_PATH` (Playwright may find it by default; verify at scaffold).
- [DEFERRED: verify at implementation] Final teal hex and contrast check against buttons and chip backgrounds.
- [RESOLVED: second Hosting site with `redirects` rule; Namecheap URL redirect rejected] Host-based redirect.
- [RESOLVED: gtag stub + `dataLayer`] Behavior of `track()` when GA ID unset.
- [DEFERRED] CSP header, consent banner (revisit if GA4 shows real EU share, per brief).
- Risk: `cleanUrls` + Astro directory output can cause trailing-slash redirect loops; smoke-test `/enterprise` on the Firebase emulator or preview channel before go-live.

## Acceptance Criteria
- `npm ci && npm run build` succeeds; `dist/` contains `/` and `/enterprise` with top bar, Team section (3 cards, correct bios, links, alt text), footer with exact brief text.
- `/enterprise` HTML has noindex meta; `firebase.json` sends `X-Robots-Tag` for it; `/` has neither.
- Clicking any `[data-open-popup]` dispatches `miti:open-popup` with a `trigger`; no console errors with no listener.
- `getSrc()` returns sanitized `?src=` (or `''`); `getPage()` returns the right ID on each route; `track()` pushes to `dataLayer` with `page` + `src` and never throws when `PUBLIC_GA_ID` is unset; no gtag network request in that case.
- `build:prod` exits non-zero with either PUBLIC_* missing or malformed.
- `firebase.json` validates (`firebase emulators:start --only hosting` or `firebase hosting:channel:deploy` dry run): two sites, clean URLs, immutable caching on `/_astro/**`, HTML no-cache, redirect site 301s any path to `https://miti.onolys.com`.
- `vitest run` and `playwright test` (desktop + mobile smoke) pass locally and in GitHub Actions on push/PR.
- A push to `main` with green tests triggers the deploy job, which builds with real PUBLIC_* values and deploys both Hosting sites; a push with failing tests, or a PR, does not deploy.
- No localStorage/sessionStorage/cookie writes by site code; layout has no horizontal scroll at 360px.
