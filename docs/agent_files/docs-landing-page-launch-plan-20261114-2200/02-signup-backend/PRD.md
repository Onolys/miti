---
status: draft
summary: Pasteable Apps Script web app that upserts two-step sign-ups into a Google Sheet, with a fixed JSON contract for SP03 and Node unit tests
date: 2026-11-15
---
# PRD: Sign-up backend (Apps Script)

Repo/branch: miti, `feat/landing-page` · Depends on: nothing (Phase 1) · Owns: `apps-script/Code.gs`, `apps-script/README.md` (deploy + probe steps), `apps-script/probe.html`, `apps-script/__tests__/*` (test runner itself is SP01's)

## TL;DR
One `Code.gs` file the owner pastes into a Sheet-bound Apps Script and deploys as a web app. `doPost` takes a text/plain JSON body, silently drops honeypot hits, locks, and upserts one row per email+page. Step 2 fills the row step 1 made, never blanking it. Tested in Node by loading the real file into a `vm` context with mocked Google services. Biggest unknown: whether a browser can read the response cross-origin. An early probe settles it.

## Problem
No server of our own. The Sheet must capture every hero email even if the popup is abandoned, hold one row per person per page, and be safe to open in Excel. SP03 needs a frozen contract to code and mock against before the real URL exists.

## Goals / Non-Goals
| Goals | Non-Goals |
|---|---|
| Frozen request/response contract (below) | CAPTCHA, rate limiting, auth |
| Idempotent upsert (retries are safe) | Email sending or notifications |
| Formula-injection safe Sheet | Option-list enforcement (dropdown values are stored as sent) |
| Local unit tests, no Google account needed | Reading data back out, dashboards |
| Early cross-origin probe | A build step or clasp |

## Requirements
**Request** (`POST`, header `Content-Type: text/plain`, body is a JSON string; no other headers, so no preflight):
```json
{"step":1|2, "email":"a@b.co", "page":"learner|enterprise", "src":"", "honeypot":"", "...fields":"step 2 only"}
```
- `step` must be 1 or 2. `email` required, trimmed and lowercased, max 254, must match `^[A-Za-z0-9][^\s@]*@[^\s@]+\.[^\s@]{2,}$`. The leading alphanumeric also keeps emails out of the injection guard.
- `page` must be `learner` or `enterprise`. `src` optional, trimmed, truncated to 100.
- Field allow-list (anything else is ignored): `role, how_often, feedback_today, pay, anything_else, organization, org_type, team_size, samples_per_month`. Max 200 chars each, `anything_else` 2000. Learner pages simply omit enterprise keys. Non-string values are coerced to string or dropped. Body over 10 KB gives `too_large`.
- Honeypot: key `honeypot`, any non-empty value counts as filled.

**Response** (always HTTP 200 JSON, since Apps Script cannot set status codes):
| Case | Body |
|---|---|
| Saved | `{"ok":true}` |
| Honeypot filled | `{"ok":true}`, nothing written |
| Bad JSON, bad step/page, missing field | `{"ok":false,"error":"bad_request"}` |
| Bad email | `{"ok":false,"error":"invalid_email"}` |
| Over 10 KB | `{"ok":false,"error":"too_large"}` |
| Lock timeout | `{"ok":false,"error":"busy"}` (SP03 may retry once) |
| Any thrown error | `{"ok":false,"error":"server"}` (whole `doPost` is in try/catch; an uncaught throw returns an HTML page SP03 cannot parse) |

`doGet` returns `{"ok":true,"service":"miti-signup"}` so the owner can check a deploy by visiting the URL.

**Sheet**: container-bound script, tab `signups` (auto-created). Columns, in order: `first_seen, updated, page, src, email, role, how_often, feedback_today, pay, anything_else, organization, org_type, team_size, samples_per_month`. Timestamps are ISO UTC strings.

## Architecture
Flow: `doPost(e)` → `parseAndValidate(body)` (pure) → honeypot check → `waitLock(10000)` → `ensureHeader(sheet)` → `upsert(sheet, rec, now)` → `flush` → `releaseLock` (in `finally`) → JSON via `ContentService`.

Upsert algorithm (under lock):
1. Header: empty sheet gets the full header. For a non-empty sheet, any schema column missing from row 1 is appended at the right. Columns are never reordered or removed. Reads and writes go by header name, so owner-added columns or reordering do not break it. Columns set to plain-text format (`@`).
2. Find the row by reading only the `email` and `page` columns and matching `lower(trim(email))` + `page`. First match wins.
3. No match (step 1 or 2): append a row with `first_seen = updated = now`, `src`, `email`, `page`, plus any fields given.
4. Match: `first_seen` untouched, `updated = now`. A field is written only if the incoming value is non-empty, so step 2 never blanks step-1 data and a repeat submit cannot erase answers. `src` is first-touch and is set only if the cell is empty. A user therefore cannot clear a field via the form; accepted.
5. Step 1 with fields (should not happen) is treated like step 2. Step is used for validation only, never for branching storage.

Formula guard: any string value (not email) whose first char is `= + - @ \t \r` is stored with a leading `'`. Combined with the `@` plain-text column format, so formulas are not evaluated in Sheets and the apostrophe protects CSV/Excel export. Emails cannot trip the guard (regex above), so key matching is unaffected.

Code sharing: one file, `Code.gs`, with pure functions on top and `doPost`/`doGet` below. Tests read the real file and run it in `vm.runInContext` with mock `SpreadsheetApp`, `LockService`, `ContentService`. No build, no drift between tested and pasted code, one paste for the owner.

**CORS reality** (from known Apps Script behavior, not yet verified by us): a POST to `/exec` returns a 302 to `script.googleusercontent.com`. The script runs before the redirect. With a simple request (text/plain, no custom headers) the browser follows the redirect and the final ContentService response normally carries `Access-Control-Allow-Origin: *`, so `fetch` can read `{ok:true}`. `application/json` triggers an OPTIONS preflight that Apps Script cannot answer, so it fails. SP03 contract:
- Plan A (default): `fetch(url,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(p),redirect:'follow'})`; success means `res.ok` and `json.ok===true`; `ok:false` means failure UI.
- Plan B (only if the probe shows the response is unreadable): same call with `mode:'no-cors'`. The response is opaque, so a resolved promise means "sent, unconfirmed" and SP03 shows success. A rejected promise means failure. Safe because the upsert is idempotent.
- SP03 mocks the endpoint with Plan A's shape; the plan switch is one function.

**Quotas and spam**: expect Apps Script daily trigger/runtime and concurrent-execution limits and the Sheet 10M-cell cap to be far above launch traffic [OPEN: confirm current numbers for the owner's account type]. Spam shows as junk emails, since honeypot hits are silent and leave no trace. Owner checks the Sheet daily in week 1 per the brief's risk table.

## Decisions
| # | Decision | Choice | Alternatives considered | Why |
|---|---|---|---|---|
| 1 | Code layout | Single `Code.gs`, tested via `vm` | Separate logic module with `module.exports` guard; build/bundle step; clasp | One paste, no drift, no build |
| 2 | Container | Script bound to the Sheet, `getActiveSpreadsheet` | Standalone script with Sheet ID | Fewer owner steps, no ID to leak |
| 3 | Columns | Fixed schema in code, missing ones auto-appended, matched by header name | Fully dynamic columns from request keys | Allow-list stops junk columns; owner can add own columns |
| 4 | Enum validation | None, lengths only | Server-side option lists | UI option edits need no redeploy; avoids silently dropping data |
| 5 | Honeypot reply | `{ok:true}`, no write | Error | Do not tip off bots |
| 6 | Non-empty-only overwrite | Blank never overwrites | Last write wins | Anti-goal: never lose hero data |
| 7 | Concurrency | `getScriptLock().waitLock(10000)`, `busy` on timeout | No lock; retry loop server-side | Prevents duplicate rows from step 1 and step 2 racing |
| 8 | `page` values | `learner` / `enterprise` | URL paths | Stable keys independent of routing |
| 9 | Injection guard | `'` prefix + plain-text column format | Prefix only; strip chars | Safe in Sheets and in exports; keeps data intact |

## Manual steps (owner-only)
1. Create a Google Sheet. Extensions → Apps Script. Paste `Code.gs` over the default file. Save.
2. Deploy → New deployment → Web app. Execute as: Me. Who has access: Anyone. Authorize the Sheet scope on first run.
3. Visit the `/exec` URL (expect the `doGet` JSON). Send the URL to Claude, which sets it as `PUBLIC_SIGNUP_URL`.
4. Run the early probe (below), then delete the probe rows.
5. **Redeploy gotcha**: saving the editor does not update the live URL. After any code change: Deploy → Manage deployments → edit the existing deployment → Version: New version → Deploy. This keeps the URL. "New deployment" creates a different URL.
6. Week 1: look at the Sheet daily; watch for junk rows.

**Early probe** (owner-dependent, needs the URL): `apps-script/probe.html`, served from the local Astro dev origin (`http://localhost:4321`, or any local static server), does the Plan A fetch with `src:"probe"` and a throwaway email, and prints status, response type and parsed body. Pass means a readable `{ok:true}`, a new Sheet row, and a repeat click updating that row instead of adding one. If unreadable, switch SP03 to Plan B. `curl -L -X POST -H 'Content-Type: text/plain' -d '...' URL` checks the script but not CORS.

## Risks / Open Questions
- [DEFERRED: verify at implementation] Is the Plan A response readable from localhost and from `miti.onolys.com`? Probe on both origins (localhost early, production after deploy). — needs owner's deployed URL
- [OPEN] Which Google account hosts the script? A Workspace account can block "Anyone" access; use a personal account if so.
- [DEFERRED: verify at implementation] Current Apps Script quotas for that account type (see above).
- [DEFERRED: verify at implementation] Does the apostrophe show visibly in a plain-text-formatted cell? Verify on the first injection test row; if ugly, drop to format-only or prefix-only.
- [RESOLVED: lock + non-blank-only update makes order irrelevant] Hero submit and popup submit can overlap; the lock covers the race. Fire-and-forget by SP03 is acceptable, but request ordering is not guaranteed, and since the update is non-blank-only the final row is correct either way.
- [RESOLVED: lock timeout returns `busy`, client may retry once, upsert is idempotent]
- [DEFERRED] Per-email throttling (`CacheService`), CAPTCHA, spam kill-switch. Revisit only if junk appears in week 1.
- [DEFERRED] Data deletion/retention policy (brief's open risk).

## Acceptance Criteria
- `Code.gs` contains no secrets and no hardcoded Sheet ID; it works unmodified after paste.
- Contract above is implemented exactly, and every response is valid JSON, including on thrown errors.
- Unit tests (Node, mocks) pass and cover: valid step 1 creates a row; step 2 updates the same row (no second row, `first_seen` unchanged, `updated` changed); step 2 with no prior row creates one; same email on `learner` and `enterprise` gives two rows; email case/whitespace variants match one row; blank or absent step-2 fields do not erase step-1 data; `src` first-touch preserved; honeypot returns `ok:true` and writes nothing, and never touches the lock; invalid email, bad step/page, bad JSON, non-object body, oversize body; unknown keys dropped; length truncation; each of `= + - @ \t \r` prefixed with `'` and normal text untouched; header created on empty sheet, a missing column appended without reordering, owner-reordered columns still map correctly; lock acquired and released in `finally` even when the write throws; `waitLock` throwing gives `busy`; thrown error gives `server`; `doGet` JSON.
- Probe run once against a deployed URL with the outcome (Plan A or B) recorded in this PRD's open questions and handed to SP03.
- README documents deploy and redeploy steps.
