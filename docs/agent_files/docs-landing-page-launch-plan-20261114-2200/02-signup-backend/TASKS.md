---
status: draft
summary: 6 tasks to build, test, document and probe the Apps Script sign-up backend (Code.gs) against a frozen contract
date: 2026-11-15
---
# Tasks: Sign-up backend (Apps Script)
Source of truth: /root/projects/onolys/miti/.worktrees/docs/landing-page-launch-plan/docs/agent_files/docs-landing-page-launch-plan-20261114-2200/02-signup-backend/PRD.md. One pasteable `Code.gs` plus Node tests that load the real file in a `vm` context with mocked Google services. Tests run under SP01's Vitest runner and CI (no separate CI task here); this SP only adds its test files.

| # | Task | Depends on | Status |
|---|---|---|---|
| 1 | Test harness (vm + mocks) | SP01 T-Vitest (test runner) | todo |
| 2 | Validation and sanitizing | 1 | todo |
| 3 | Sheet header, upsert, formula guard | 2 | todo |
| 4 | doPost / doGet, lock, error mapping | 3 | todo |
| 5 | README and probe page | 4 | todo |
| 6 | Deploy, probe, quota check, handoff | 5, owner steps | todo |

## Task 1 — Test harness (vm + mocks)
What it is / what it means: The way tests exercise the exact file the owner pastes (Decision 1), with no module exports, build step or drift.
What changes at a high level: Add a helper under `apps-script/__tests__/` that reads `Code.gs`, runs it in `vm.runInContext`, and supplies in-memory mock `SpreadsheetApp` (sheet with header-aware rows), `LockService` (records acquire/release, can throw on `waitLock`) and `ContentService` (captures JSON output). Needs a stub `Code.gs` so the harness loads. Must be picked up by SP01's Vitest config and CI.
Done when: a smoke test loads the stub file, calls a mocked `doGet`, and is discovered and passed by SP01's Vitest runner (SP01 test setup task); the CI workflow runs it.

## Task 2 — Validation and sanitizing
What it is / what it means: The pure `parseAndValidate` layer that turns a raw body into a clean record or a named error.
What changes at a high level: In `Code.gs`, implement the request contract: 10 KB limit (`too_large`), JSON parse, object check, step 1/2, page `learner|enterprise`, email trim/lowercase/254 max/regex, `src` trim and 100 truncation, field allow-list with 200 chars (2000 for `anything_else`), non-string coercion or drop, honeypot flag. No enum checks on dropdown values (Decision 4).
Done when: tests (written first) cover valid step 1, bad JSON, non-object body, bad step, bad page, missing email, invalid email variants, oversize body, unknown keys dropped, length truncation, case/whitespace email normalization, non-string handling, honeypot detection.

## Task 3 — Sheet header, upsert, formula guard
What it is / what it means: The storage logic: one row per email+page, step 2 filling the row without ever blanking it, safe in Sheets and Excel (Decisions 3, 6, 9).
What changes at a high level: Implement `ensureHeader` (full header on empty sheet; append missing schema columns at right; never reorder; plain-text `@` format; all access by header name) and `upsert` (match on lower/trimmed email + page reading only those columns, first match wins; append with `first_seen = updated = now` or update with `updated` only; write non-empty values only; `src` first-touch; step used for validation only). Add the injection guard: leading `'` for strings starting with `= + - @ \t \r`, emails exempt. Timestamps ISO UTC.
Done when: tests cover step 1 creates a row; step 2 updates the same row (no second row, `first_seen` unchanged, `updated` changed); step 2 with no prior row creates one; same email on both pages gives two rows; email case/whitespace variants hit one row; blank or absent step-2 fields keep step-1 data; `src` first-touch kept; header on empty sheet; missing column appended without reordering; owner-reordered columns map correctly; each of `= + - @ \t \r` prefixed and normal text untouched.

## Task 4 — doPost / doGet, lock, error mapping
What it is / what it means: The public entry points that tie validation and upsert to the frozen response contract SP03 codes against (Decisions 5, 7).
What changes at a high level: `doPost` wraps everything in try/catch: parse and validate, honeypot returns `{ok:true}` before any lock or write, `getScriptLock().waitLock(10000)`, ensureHeader, upsert, flush, release in `finally`; always HTTP 200 JSON via `ContentService`. Map errors to `bad_request`, `invalid_email`, `too_large`, `busy` (lock timeout), `server` (any throw). `doGet` returns `{"ok":true,"service":"miti-signup"}`. No secrets, no hardcoded Sheet ID; container-bound via `getActiveSpreadsheet`, tab `signups` auto-created.
Done when: tests cover saved reply `{ok:true}`; honeypot returns `ok:true`, writes nothing and never touches the lock; each error code; lock acquired and released in `finally` even when the write throws; `waitLock` throwing gives `busy`; a thrown error gives `server` as valid JSON; `doGet` JSON; `signups` tab auto-created.

## Task 5 — README and probe page
What it is / what it means: Owner-facing instructions and the early cross-origin probe that settles Plan A vs Plan B.
What changes at a high level: Write `apps-script/README.md` covering paste, web-app deploy (Execute as Me, Anyone), the `/exec` check, the redeploy gotcha (Manage deployments, New version, keeps URL), the `curl -L` check (script only, not CORS), daily Sheet check in week 1, and the contract summary. Add `apps-script/probe.html`: a static page doing the Plan A fetch with `src:"probe"` and a throwaway email, printing status, response type and parsed body, runnable from `http://localhost:4321` or any local static server.
Done when: README contains every step above, verified by reading it against the PRD Manual steps; `probe.html` loads locally, shows its output for a failing URL (sanity check), and sends the exact Plan A request shape (`text/plain`, no extra headers).

## Task 6 — Deploy, probe, quota check, handoff
What it is / what it means: Verification against the real deployment, closing every [DEFERRED] item with evidence, no invented answers. Blocked until the owner supplies the URL.
What changes at a high level: After the owner deploys (personal Gmail account, which owns the Sheet and script) and sends the URL, run the probe from localhost, then again from `miti.onolys.com` after SP01 deploy: confirm a readable `{ok:true}`, a new row, and a repeat click updating the same row. Send an injection-prefixed test row and check whether the apostrophe is visibly ugly in the plain-text cell; if so fall back to format-only or prefix-only and update tests. Check current Apps Script quotas for the owner's account type. Record the Plan A or B outcome in the PRD open questions and hand it to SP03; delete probe rows.
Done when: Plan A/B outcome, apostrophe result and quota numbers are recorded in the PRD; SP03 has the outcome; probe rows removed; any apostrophe change is covered by updated Task 3 tests passing in CI.

## Owner steps
- Create the Sheet in the personal Gmail account, paste `Code.gs` via Extensions, Apps Script, deploy as web app (Execute as: Me, Access: Anyone), authorize the Sheet scope.
- Visit the `/exec` URL, confirm the `doGet` JSON, send the URL (becomes `PUBLIC_SIGNUP_URL`).
- Run or witness the probe, then delete probe rows.
- After any code change: Manage deployments, edit existing, New version, Deploy (never "New deployment").
- Week 1: check the Sheet daily for junk rows.
