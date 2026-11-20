# miti

Landing page for Onolys.

## CI and deployment

GitHub Actions handles three flows:

- Every push and pull request runs Astro/TypeScript checks, unit tests, a static build, and browser smoke tests.
- After tests pass, each pull request from this repository deploys the `miti` Hosting target to its own Firebase preview channel, `pr-<PR number>`. The Firebase action posts or updates a PR comment with the temporary URL. New commits update the same URL and reset its seven-day expiry; newer preview jobs cancel older ones for that PR. Fork pull requests run tests but skip previews so they never receive deployment credentials.
- After tests pass, a merge into `main` (or any other push to `main`) builds with production configuration and deploys both Firebase Hosting targets in project `onolys`: `miti` → site `onolys`, and `redirect` → site `onolys-redirect`.

Preview builds use the same configured signup backend and analytics as production. Test submissions can therefore reach the real signup store and analytics property. Previews deploy only the landing-page target; the production redirect target is excluded.

Before the first production deployment, configure **Settings → Secrets and variables → Actions** in this repository:

| Repository variable | Value |
| --- | --- |
| `PUBLIC_SIGNUP_URL` | The deployed Apps Script HTTPS endpoint on `script.google.com` |
| `PUBLIC_GA_ID` | The real GA4 measurement ID, beginning with `G-` |
| `PUBLIC_SIGNUP_PLAN` | Transport switch: `A` (default) reads the fetch response; `B` uses `no-cors` and treats a resolved opaque response as sent, unconfirmed. Choose from the SP02 browser probe on both local and production origins. |

Both deployment jobs use the repository secret `FIREBASE_SERVICE_ACCOUNT`. To recreate the deployment account, create a dedicated service account in Google Cloud project `onolys`, then grant it **Firebase Hosting Admin** (`roles/firebasehosting.admin`) and **API Keys Viewer** (`roles/serviceusage.apiKeysViewer`). These are the [Firebase-documented roles for Hosting deployment through the CLI](https://firebase.google.com/docs/projects/iam/roles-predefined-product#firebase-hosting-roles); project Owner or Editor access is unnecessary. Create a JSON key for that account in its **Keys** tab and save the complete JSON as the repository secret `FIREBASE_SERVICE_ACCOUNT`.

Both deployment jobs validate the public configuration before building. The production job writes credentials only to a private file in the runner's temporary directory and removes that file after success or failure. The preview job uses the official Firebase Hosting action pinned to an immutable commit and Firebase CLI `15.36.0`; only that job receives permission to publish its check and PR comment. No credential file is uploaded as an artifact. The real Apps Script deployment and GA4 setup remain prerequisites; custom domains still require their separate owner setup.

For local production builds, copy `.env.example` to `.env.local` and fill in the public values, then run `npm run build:prod`. `npm run deploy` performs that guarded build before deploying both Hosting targets with your local Firebase authentication. `npm run build` remains available without production configuration.

## Claude Code skills (thepass)

Open this repo in Claude Code and trust the folder: it prompts to install the `thepass` marketplace and plugin (declared in `.claude/settings.json`).

Manual fallback:

```
/plugin marketplace add tejitpabari99/thepass
/plugin install thepass@thepass
```
