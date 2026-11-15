---
status: draft
summary: Hero email form and native-dialog early-access popup for both pages, with a tested Apps Script network client, GA events and Playwright e2e
date: 2026-11-15
---
# PRD: SP03 Sign-up UI

Repo/branch: `miti`, `feat/landing-page` · Depends on: SP01 (CTA/event/helpers/test setup), SP02 (request/response contract) · Owns: `src/components/{HeroForm,SignupDialog}.astro`, `src/lib/signup/{client,body,dialog,hero}.ts`, `src/data/signup-fields.ts`, `src/styles/signup.css`, `src/lib/signup/__tests__/*`, `e2e/signup.spec.ts`. Small edits to SP01 files: mount `<SignupDialog/>` in `Base.astro`; add `PUBLIC_SIGNUP_PLAN` to `.env.example`; `src/lib/config.ts` (see [OPEN] 1).

## TL;DR
Vanilla TS, no framework. `HeroForm` (embedded by SP04/05) posts step 1, shows thanks, then fires `miti:open-popup` with the email. One `SignupDialog` per page (native `<dialog>`) listens for that event, renders the per-page field set from a config file, posts step 2, and swaps to "Thank you for signing up." A small `client.ts` owns the POST (text/plain, timeout, one `busy` retry, Plan A/B switch). GA via SP01's `track()`.

## Problem
The hero email must survive an abandoned or failed popup. Two forms hit one idempotent endpoint whose browser readability is still unproven. Needs: accessible modal, mobile sheet, no stored state, and e2e proof that the flow works against a mocked endpoint.

## Goals / Non-Goals
| Goals | Non-Goals |
|---|---|
| Hero + popup flow exactly as the brief's "Sign-up flow" | Copy/layout of hero section (SP04/05), Apps Script (SP02) |
| One popup implementation, per-page field config | Option-list enforcement, CAPTCHA, retries beyond `busy` |
| a11y: Esc, close button, focus trap/return, labelled fields, live regions | Remembering sign-ups (no localStorage/cookies), "already signed up" state |
| Swappable Plan A / Plan B behind one function | A `signup_error` GA event or any PII in GA |
| Vitest for body/client; Playwright for flows | Cross-browser matrix (Chromium only, per SP01) |

## Requirements
**R1 Hero form** (`<HeroForm />`)
- Props: `id?` (default `hero-signup`), `label?` (button text, default "Get early access"). No `page` prop: page comes from `getPage()` at runtime so there is one source of truth. SP04/05 own the headline, sub, small print; they place `<HeroForm />` in their Hero section.
- `<form novalidate>`; visually-hidden `<label>` "Email"; `type=email autocomplete=email inputmode=email`; invalid state sets `aria-invalid`, message in `aria-describedby` region. Client check uses SP02's regex `^[A-Za-z0-9][^\s@]*@[^\s@]+\.[^\s@]{2,}$` after trim, max 254, so client and server never disagree.
- Submit: guard against in-flight (button disabled + `aria-busy`, Enter-repeat ignored) → `postSignup(1, {email})`.
  - Success: `track('signup_step1')`; replace the form row with `role=status` text "Thanks. We'll reach out with early access information in a few weeks."; dispatch `miti:open-popup` `{trigger:'hero', email}`.
  - Failure: no thanks text, form stays usable, still dispatch the same event (brief rule). No inline error (popup carries the save). See [OPEN] 3.
- Includes the honeypot (R4).

**R2 Popup** (`<SignupDialog />`, mounted once in Base)
- Native `<dialog aria-labelledby>` opened with `showModal()`. Gives inert background, focus trap, Esc (`cancel` event), and focus return to the invoking element for free. Return focus manually to `document.activeElement` captured at open if the invoker was removed (hero form replaced by thanks) → fall back to `<main>`.
- Open handler: `popup_open` `{trigger}` via `track`; reset to a fresh form every time (also after success; no state kept); set email from `detail.email`; focus email if empty, else the first optional field.
- Header: title "Get early access", close button (`aria-label="Close"`). No backdrop-click close (avoids losing typed answers). Close while a request is in flight is allowed; the response is then ignored by the UI.
- Layout: ≥640px centered modal, max-width ~480px; <640px full-screen sheet (`100dvh`, header sticky, body scrolls, submit sticky at bottom, inputs 16px to stop iOS zoom). Body scroll locked while open.
- Fields from `signup-fields.ts`, rendered in order, email first and `required` (own validation, same regex, `aria-invalid`). Choice fields are `<select>` with an empty "Select…" first option; everything else optional. Option text stored as sent (brief's exact strings). Empty values are omitted from the body.
- Submit: disable button + `aria-busy`, label "Sending…"; `postSignup(2, …)`.
  - Success: `track('signup_step2')`; content replaced by "Thank you for signing up." (heading gets focus, `tabindex=-1`) and a Close button.
  - Failure: `role=alert` "Something went wrong. Try again, or email <a href="mailto:tejitpabari99@gmail.com">tejitpabari99@gmail.com</a>." Form kept with values, button re-enabled. Server `invalid_email` shows a field-level email error instead.
- Heading/intro copy not in brief: default "Get early access" + "Tell us a bit about you. Everything except email is optional."

**R3 Field config** (`src/data/signup-fields.ts`): typed array per page; each entry `{key, label, type:'select'|'text'|'textarea', options?}`. Keys are SP02's allow-list verbatim.
| Page | Keys in order |
|---|---|
| learner | `role`, `how_often`, `feedback_today`, `pay` ("What would you pay per evaluation"), `anything_else` |
| enterprise | `role` (enterprise list), `organization`, `org_type`, `team_size` ("Number of coders or learners"), `samples_per_month`, `feedback_today`, `pay` ("per checked sample"), `anything_else` |
Option strings copied exactly from the brief. Enterprise has no `how_often`. [OPEN] 4 on enterprise field order.

**R4 Honeypot**: wrapper div with `aria-hidden="true"` and `inert`, positioned off-screen (not `display:none`, which simple bots skip), input `type=text name=company_website tabindex=-1 autocomplete=off`, no visible label. Sent as body key `honeypot` (SP02 name). Present on both forms. Browser autofill extensions may fill it: accepted risk, honeypot hit still returns ok:true so humans see success.

**R5 Network client** (`client.ts`)
```ts
postSignup(step: 1|2, data: {email: string; fields?: Record<string,string>}):
  Promise<{ok:true; confirmed:boolean} | {ok:false; error:string}>
```
- Body (`body.ts`, pure): `{step, email: trimmed, page: getPage(), src: getSrc(), honeypot, ...nonEmptyFields}`; JSON string.
- `fetch(PUBLIC_SIGNUP_URL, {method:'POST', headers:{'Content-Type':'text/plain'}, body, redirect:'follow'})` and nothing else (no preflight). 10 s `AbortController` timeout.
- Plan A (default): success iff `res.ok` and parsed `json.ok===true`; non-JSON → `bad_response`. `error==='busy'` → wait ~1 s, retry once; otherwise fail. Network error/timeout: fail, no auto-retry (user has a Try again button; upsert is idempotent).
- Plan B (`PUBLIC_SIGNUP_PLAN=B`, default `A`, read in `config.ts`): same call with `mode:'no-cors'`; resolved = `{ok:true, confirmed:false}`; rejected = failure. UI treats both as success.
- URL unset: in `import.meta.env.DEV`, `console.warn` once, log the body, resolve ok after 300 ms (UI usable without a backend). Outside dev, resolve `{ok:false,error:'not_configured'}` (prod is protected by SP01's `check-env`).
- Per-submit: only one in-flight request per form.

**R6 GA**: `popup_open` `{trigger}`, `signup_step1`, `signup_step2` via `track()` (adds page+src). Fired on confirmed success only (Plan B: on resolve). Never send email or answers to GA.

## Architecture
```
CtaButton[data-open-popup] ─▶ popup.ts (SP01) ─▶ CustomEvent miti:open-popup {trigger,email}
HeroForm ── postSignup(1) ─▶ thanks ─▶ same event {trigger:'hero', email}
SignupDialog (listens) ── track(popup_open) ── form from signup-fields[page] ── postSignup(2)
client.ts ─ fetch text/plain ─▶ Apps Script (Plan A readable | Plan B no-cors)
```
Upsert key is email+page, lowercased by the server. Sequence for a hero visitor: row from step 1 (email only), step 2 fills the same row. If the popup email differs from the hero email, step 2 creates a second row; the hero-only row stays (anti-goal "lose a hero email" is satisfied; see [OPEN] 2). Hero-fail then popup-success also works: SP02 creates the row on step 2.

## Decisions
| # | Decision | Choice | Alternatives considered | Why |
|---|---|---|---|---|
| 1 | Dialog | Native `<dialog>` + `showModal()` | Custom div + trap lib; `inert` hand-rolled | Free focus trap, Esc, inert, top-layer; supported in all current browsers; less code and bugs |
| 2 | Framework | Vanilla TS modules | Astro island with Preact | Two small forms; zero runtime added |
| 3 | Email edit in popup | Treat popup email as authoritative; may create a second row | Lock email field when prefilled; send `prev_email` | Locking blocks typo fixes; `prev_email` needs a SP02 change; extra row is cheap to dedupe in the Sheet |
| 4 | Backdrop click | Does not close | Closes | Prevents losing a half-filled form on mobile |
| 5 | Re-open after success | Fresh empty/prefilled form, no state | localStorage "signed up" flag | Brief: seeing the form again is fine; upsert never blanks data |
| 6 | Double-submit | UI in-flight guard + server idempotence | Debounce only | Two layers; duplicate rows impossible by design |
| 7 | Plan switch | Build-time `PUBLIC_SIGNUP_PLAN` | Runtime detect; code edit | One-line flip after SP02 probe; no UI change |
| 8 | Hero failure | Popup opens anyway; no inline error | Inline error blocks popup | Brief rule; user still can sign up |
| 9 | Unset URL | Fake success in dev; failure in prod build | Always throw | Dev usable; prod can't silently succeed |
| 10 | Honeypot hiding | Off-screen + `aria-hidden` + `inert` + tabindex -1 | `display:none` | Bots still fill it; invisible and unreachable to people and AT |

## Manual steps (owner-only)
- Provide the deployed `PUBLIC_SIGNUP_URL` (SP02 handoff) and run/record the SP02 probe so `PUBLIC_SIGNUP_PLAN` is set correctly.
- One real-device pass (iOS Safari and Android Chrome) of the popup sheet and keyboard before launch.

## Risks / Open Questions
1. [RESOLVED: SP01 owns and ships src/lib/config.ts and the <SignupDialog/> mount point in Base.astro plus PUBLIC_SIGNUP_PLAN in .env.example; SP03 adds SIGNUP_PLAN export] SP01 R3/Architecture says SP01 creates `src/lib/config.ts` (exports `PUBLIC_SIGNUP_URL`) but it is missing from SP01's "Owns" list. SP03 adds `SIGNUP_PLAN` there; confirm SP01 ships the file first. Also `Base.astro` (SP01) must mount `<SignupDialog/>`, and `.env.example` gets `PUBLIC_SIGNUP_PLAN` (check-env ignores it).
2. [OPEN] Popup email differing from hero email yields two rows (hero-only row orphaned). Accept for discovery, or ask SP02 for `prev_email` merge.
3. [RESOLVED: none; popup opens and its save carries the row] Brief defines no hero-failure inline copy. Default: none (popup opens, its save retries).
4. [RESOLVED: defaults in R2/R3] Enterprise field order and popup heading/intro copy are unspecified in the brief; defaults in R2/R3.
5. [RESOLVED: accepted; SP04/05 move it into their hero] SP04/05 not built when SP03 tests run: SP03 temporarily places `<HeroForm/>` in each shell under the SP04/05 slot comment; they move it into their Hero section. Confirm that overlap is OK.
6. [DEFERRED: verify at implementation] Plan A vs B pending SP02 probe (both origins). Tests cover both via config.
7. [DEFERRED: verify at implementation] Whether `<dialog>` `closedby`/Esc behave identically in Pixel 5 emulation (verify in e2e).
8. [RESOLVED: server regex reused client-side] Email format mismatch risk.
9. [RESOLVED: `busy` retried once after ~1 s] Lock contention.
10. [DEFERRED] Per-field validation beyond email, autofill-honeypot tuning, `signup_error` event.

## Acceptance Criteria
- Vitest: `buildBody` (page/src/honeypot/trim, empty fields omitted, unknown keys not added); client: Plan A success, `ok:false`, non-JSON, timeout, `busy` retried exactly once, Plan B resolve/reject, unset URL dev vs non-dev; request has only `Content-Type: text/plain`.
- Playwright (`page.route` mock; desktop + Pixel 5): hero success → thanks text → popup open with email prefilled → step 2 success shows "Thank you for signing up."; hero failure still opens popup with email prefilled; section CTA/top bar opens an empty popup, email focused; submit with empty/invalid email blocked with message and no request; step-2 failure shows copy with mailto and keeps values; second click during in-flight sends one request; Esc closes and focus returns to invoker; Tab cycles within dialog; mobile viewport popup fills the viewport; `/enterprise` renders enterprise fields (no `how_often`) and posts `page:'enterprise'`; honeypot key is sent (empty) and hidden from keyboard and a11y tree; `?src=x` appears in both requests; GA `dataLayer` gets `popup_open{trigger}`, `signup_step1`, `signup_step2` with page+src and no email.
- Re-opening after success shows the form again; nothing in localStorage/sessionStorage/cookies.
- Axe-style check (or manual) passes for the open dialog: labelled controls, visible focus, 4.5:1 text, 44px touch targets on mobile.
- `npm run build` and CI pass; no console errors with no GA ID and no signup URL in dev.
