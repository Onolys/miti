# Miti sign-up backend

`Code.gs` is the complete pasteable backend. Its exact source runs in Node tests through `__tests__/harness.js`; there is no build, export wrapper, hardcoded Sheet ID, or secret. One editor-run setup captures the bound Sheet ID automatically. `probe.html` checks whether a browser can read a deployed response from a different origin.

## Deploy and connect

1. Using the owner's personal Google account, create a Google Sheet. Open **Extensions → Apps Script** so the script is bound to that Sheet.
2. Replace the default editor file with the complete contents of `Code.gs` and save.
3. Select **setupSignup** in the editor's function selector and click **Run**. Authorize access when prompted. The execution log should say **Miti signup spreadsheet configured. You can deploy the web app.** The function returns `{"ok":true}` and saves the bound Sheet's ID as `SIGNUP_SPREADSHEET_ID` in Script Properties; no ID needs copying into source. If setup reports that it must run from the Sheet-bound editor, return to **Extensions → Apps Script** in the intended Sheet and run it there. Failed setup leaves prior configuration unchanged.
4. Select **Deploy → New deployment → Web app**. Set **Execute as: Me** and **Who has access: Anyone**. Authorize the requested Sheet access when prompted. A Workspace account may restrict anonymous access; the agreed owner is a personal Gmail account.
5. Copy the deployed URL ending in `/exec`. Visit it and expect exactly:
   ```json
   {"ok":true,"service":"miti-signup"}
   ```
6. Give the deployed `/exec` URL to the site maintainer to configure `PUBLIC_SIGNUP_URL`. Complete the browser probe below before deciding whether the client needs Plan B.

Only editor setup uses `SpreadsheetApp.getActiveSpreadsheet()`. Web-app requests read the saved property and call `SpreadsheetApp.openById()` because active-container methods are unavailable in web apps. The `signups` tab is created on the first valid POST. A missing configuration or inaccessible Sheet returns `{"ok":false,"error":"server"}`. The healthcheck does not check storage configuration, so verify setup and run the POST probe too. Setup normally runs once; rerun it from the intended bound Sheet editor if you need to restore the saved configuration.

Saving an editor change does **not** update the live web app. To update it, choose **Deploy → Manage deployments → edit the existing deployment → Version: New version → Deploy**. This preserves the `/exec` URL. Creating another deployment creates a different URL.

## Browser probe

No deployed URL is included in this repository. An owner must deploy the Sheet-bound script before a real probe can run. Local automated checks mock the endpoint; they do not establish Google's cross-origin behavior.

From the repository root, serve the probe using a separate static server:

```bash
python3 -m http.server 4322 --bind 127.0.0.1 --directory apps-script
```

Open `http://127.0.0.1:4322/probe.html` in a browser. Astro does not serve `apps-script/` through its public directory. Enter the actual `/exec` URL and a throwaway email you control. Click **Send probe**, confirm the displayed HTTP status, response type and parsed JSON, then inspect the Sheet. A readable `{"ok":true}` plus one new row is the first check. Click again with the same email: the row count must stay unchanged and `updated` must change while `first_seen` remains fixed. Delete the probe rows afterward.

The probe uses Plan A: POST with only `Content-Type: text/plain`, a JSON-string body, and `redirect: 'follow'`. Do not use `application/json` or add custom headers: those can require an OPTIONS preflight the web app cannot answer.

Record the tested origin, date, outcome, and **Plan A or Plan B** in SP02's PRD and hand the result to SP03. If the response is unreadable, first check the URL, access settings, and network. Plan B is only for confirmed unreadable cross-origin responses: the site sends with `mode: 'no-cors'`, treats a resolved opaque response as sent but unconfirmed, and treats rejection as failure. The probe intentionally stays on Plan A so it can diagnose readability. Repeat the browser probe from the production `https://miti.onolys.com` origin after deployment; localhost success does not verify that origin. Serve the probe from that origin through the site's authorized deploy process for the production check.

A command-line request checks the script and redirects, **not browser CORS**:

```bash
SIGNUP_URL='https://script.google.com/macros/s/REPLACE_WITH_DEPLOYMENT_ID/exec'
curl -L \
  -H 'Content-Type: text/plain' \
  --data-raw '{"step":1,"email":"YOUR_THROWAWAY_EMAIL","page":"learner","src":"probe","honeypot":""}' \
  "$SIGNUP_URL"
```

Replace the URL and email before running. `--data-raw` selects POST initially; omit `-X POST` so curl can follow the ContentService redirect with a GET. Curl success alone cannot select Plan A. Inspect and delete this probe row too.

## Contract and operation

Requests are text/plain JSON objects, at most 10 KB in UTF-8, with numeric `step` 1 or 2, `email`, and `page` (`learner` or `enterprise`). Email is trimmed, lowercased, limited to 254 characters, and validated. Optional `src` is trimmed and limited to 100 characters. Answers are allow-listed: `role`, `how_often`, `feedback_today`, `pay`, `anything_else`, `organization`, `org_type`, `team_size`, and `samples_per_month`. Each permits 200 characters, except `anything_else` permits 2000. String, numeric, and boolean answer values are accepted; objects and null are dropped. Dropdown options are not validated server-side. Unknown keys are ignored.

A filled `honeypot` silently returns success without a lock or write. Valid submissions upsert by normalized email plus page under a script lock. Step 2 can create a row without step 1. Repeated submissions preserve `first_seen`, first non-empty `src`, and any answers for which the new value is blank or absent. Timestamps are ISO UTC strings. Missing schema columns are appended without changing existing column order; owner columns remain intact. Values are stored as plain text and dangerous formula prefixes receive a leading apostrophe.

All application responses are HTTP 200 JSON: saved/honeypot → `{"ok":true}`; otherwise `{"ok":false,"error":"CODE"}`. Codes are `bad_request`, `invalid_email`, `too_large`, `busy` (10-second lock timeout), and `server`. Clients must inspect the JSON `ok`, not only HTTP status. SP03 may retry `busy` once; upserts make retries safe.

Check the Sheet daily during launch week 1 for junk emails and unexpected rows. Honeypot hits leave no row. Verify apostrophe display in Sheets and formula safety on the first real injection probe. Confirm applicable Apps Script quotas before launch; live deployment, cross-origin response readability, and cell rendering require the owner's deployed URL.

Run the backend tests locally with the project's supported Node version:

```bash
npm test -- apps-script
```
