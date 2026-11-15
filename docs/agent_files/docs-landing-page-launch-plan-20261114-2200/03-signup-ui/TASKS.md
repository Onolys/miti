---
status: draft
summary: 7 tasks - field config and body builder, network client with Plan A/B, HeroForm, SignupDialog, e2e flows, a11y and CI verification
date: 2026-11-15
---
# Tasks: SP03 Sign-up UI

Source of truth: /root/projects/onolys/miti/.worktrees/docs/landing-page-launch-plan/docs/agent_files/docs-landing-page-launch-plan-20261114-2200/03-signup-ui/PRD.md. Built on `docs/landing-page-launch-plan`. Vanilla TS, native `<dialog>`, no framework. Depends on SP01 (T1 config.ts, T2 getPage/getSrc/track/popup, T3 Base.astro and shells, T7 Playwright, T8 CI) and SP02's frozen request/response contract. CI is SP01 T8; no CI task here.

| # | Task | Depends on | Status |
|---|---|---|---|
| 1 | Field config and body builder + unit tests | SP01 T2 | done |
| 2 | Network client, Plan A/B switch + unit tests | 1, SP01 T1 | done |
| 3 | HeroForm, honeypot, temporary shell placement | 2, SP01 T3 | done |
| 4 | SignupDialog and Base mount | 1, 2, 3, SP01 T3 | done |
| 5 | Playwright flows (desktop + Pixel 5) | 3, 4, SP01 T7 | in-progress |
| 6 | Accessibility, storage and dev-mode checks | 5 | todo |
| 7 | Green CI and deferred verifications | 6, SP01 T8 | todo |

## Task 1 — Field config and body builder + unit tests
What it is / what it means: The data and pure logic everything else reads (R3, R5 body; decision 3 keys; resolved open item 4).
What changes at a high level: `signup-fields.ts` holds a typed array per page (`learner`, `enterprise`) with the key order, labels and exact option strings from the PRD table and the brief; keys are SP02's allow-list verbatim; enterprise has no `how_often`. `body.ts` exports a pure `buildBody` that returns the JSON string: step, trimmed email, `getPage()`, `getSrc()`, `honeypot`, plus non-empty fields only. Also exports the shared email check using SP02's regex, trim, 254 max. Tests written first.
Done when: Vitest tests pass for buildBody (page/src/honeypot present, email trimmed, empty fields omitted, unknown keys not added), the email validator (valid, no leading alphanumeric, no TLD, over 254), and a config test that every field key is in the SP02 allow-list and enterprise lacks `how_often`.

## Task 2 — Network client, Plan A/B switch + unit tests
What it is / what it means: The single function that owns the POST (R5; decisions 7, 9; resolved items 1, 9).
What changes at a high level: `config.ts` (shipped by SP01) gains the `SIGNUP_PLAN` export, read from `PUBLIC_SIGNUP_PLAN`, default `A`; `.env.example` lists it. `client.ts` exports `postSignup(step, data)`: `fetch` text/plain only, `redirect:'follow'`, 10 s abort timeout. Plan A succeeds on `res.ok` and `json.ok===true`, non-JSON is `bad_response`, `busy` retried once after about 1 s, network error/timeout fails with no auto-retry. Plan B uses `mode:'no-cors'`, resolve means `ok:true, confirmed:false`, reject means failure. URL unset: dev warns once, logs body, resolves ok after 300 ms; non-dev returns `not_configured`. Write tests first.
Done when: Vitest tests pass with mocked fetch for Plan A success, `ok:false`, non-JSON, timeout, `busy` retried exactly once, Plan B resolve and reject, unset URL dev vs non-dev, and request headers containing only `Content-Type: text/plain`.

## Task 3 — HeroForm, honeypot, temporary shell placement
What it is / what it means: The hero email capture that SP04/05 will embed (R1, R4; decisions 6, 8, 10; resolved items 3, 5).
What changes at a high level: `HeroForm.astro` with props `id` and `label` only (no `page`), `<form novalidate>`, hidden "Email" label, email input with autocomplete/inputmode, `aria-invalid` and `aria-describedby` error region using the Task 1 validator. `hero.ts` guards in-flight (disabled, `aria-busy`, repeat Enter ignored), calls `postSignup(1)`; success fires `signup_step1` and shows the `role=status` thanks text; success or failure dispatches `miti:open-popup` `{trigger:'hero', email}`; failure shows no inline error. Honeypot wrapper is off-screen, `aria-hidden`, `inert`, tabindex -1, name `company_website`, sent as `honeypot`. `signup.css` styles it. A temporary `<HeroForm/>` sits in each shell under the SP04/05 slot comment.
Done when: Vitest/DOM tests pass for the validation block with no request, in-flight guard sending one request, thanks text on success, event dispatched on both success and failure, and honeypot attributes; both routes build.

## Task 4 — SignupDialog and Base mount
What it is / what it means: The one popup per page (R2, R6; decisions 1, 2, 4, 5, 10; resolved items 1, 2, 4).
What changes at a high level: `SignupDialog.astro` native `<dialog aria-labelledby>` with title "Get early access", the intro copy, and a labelled Close button. `dialog.ts` listens for `miti:open-popup`, fires `popup_open` `{trigger}`, resets to a fresh form each open, prefills email, focuses email if empty else the first optional field, `showModal()`. Fields render from `signup-fields.ts`; choices are `<select>` with an empty "Select…"; email required with the same validator. Submit disables with "Sending…" and calls `postSignup(2)`. Success fires `signup_step2` and swaps to "Thank you for signing up." with the heading focused and a Close button. Failure shows the `role=alert` copy with the mailto link, keeps values and re-enables; `invalid_email` shows a field error. No backdrop-click close; Esc via `cancel`; focus returns to the invoker, else `<main>`; body scroll locked. At 640px and up a centered ~480px modal; below that a full-screen `100dvh` sheet with sticky header and submit, 16px inputs. `Base.astro` mounts it, replacing SP01's placeholder.
Done when: DOM tests pass for fresh reset on reopen, prefill and focus rules, empty-field omission, success swap, failure copy with mailto and retained values, `invalid_email` field error, no GA payload containing email or answers; build passes.

## Task 5 — Playwright flows (desktop + Pixel 5)
What it is / what it means: Browser proof of the full flow against a mocked endpoint (Acceptance Criteria; R1-R6).
What changes at a high level: `e2e/signup.spec.ts` uses `page.route` with the Plan A response shape on both SP01 projects, using SP01 T7's config.
Done when: tests pass for hero success then thanks then popup prefilled then step 2 "Thank you for signing up."; hero failure still opens the prefilled popup; top bar and section CTAs open an empty popup with email focused; empty/invalid email blocked with message and no request; step-2 failure shows copy with mailto and keeps values; a second click in flight sends one request; Esc closes and returns focus to the invoker; Tab stays inside the dialog; mobile popup fills the viewport; `/enterprise` renders enterprise fields without `how_often` and posts `page:'enterprise'`; honeypot key sent empty and hidden from keyboard and the a11y tree; `?src=x` in both requests; `dataLayer` has `popup_open{trigger}`, `signup_step1`, `signup_step2` with page and src and no email.

## Task 6 — Accessibility, storage and dev-mode checks
What it is / what it means: The cross-cutting criteria not covered by flow tests (Acceptance Criteria; decision 5).
What changes at a high level: Add an axe-style check (or a recorded manual pass if axe is not available offline) on the open dialog; a spec that reopens after success and inspects storage; a dev-server run with no GA ID and no signup URL.
Done when: the open dialog passes labelled controls, visible focus, 4.5:1 text and 44px mobile touch targets; reopening after success shows the form again; localStorage, sessionStorage and cookies stay empty; dev run shows no console errors and the fake-success path works.

## Task 7 — Green CI and deferred verifications
What it is / what it means: Close out the work and the [DEFERRED] items (open items 6, 7, 10; decision 7).
What changes at a high level: No new features. Run build and push so SP01's CI runs SP03 tests. Record, in the code log or handoff, the Pixel 5 dialog Esc behavior from Task 5 (deferred item 7). Confirm both plans are covered by config-driven tests (item 6) and note the Plan A/B outcome from the SP02 probe if the owner has supplied it; otherwise leave the default `A`. Do not add `signup_error` or extra validation (item 10).
Done when: `npm run build` and the SP01 CI workflow pass on the branch with all SP03 Vitest and Playwright tests included, and the deferred-item outcomes are written down.

## Owner steps
- Provide the deployed `PUBLIC_SIGNUP_URL` (SP02 handoff) and run and record the SP02 probe so `PUBLIC_SIGNUP_PLAN` is set to A or B (repo variable).
- One real-device pass (iOS Safari, Android Chrome) of the popup sheet and keyboard before launch.
