# miti

Landing page for Onolys.

## Production deployment

GitHub Actions tests every push and pull request. After tests pass, a push to `main` builds with production configuration and deploys both Firebase Hosting targets in project `onolys`: `miti` → site `onolys`, and `redirect` → site `onolys-redirect`. Feature branches and pull requests skip deployment.

Before the first production deployment, configure **Settings → Secrets and variables → Actions** in this repository:

| Repository variable | Value |
| --- | --- |
| `PUBLIC_SIGNUP_URL` | The deployed Apps Script HTTPS endpoint on `script.google.com` |
| `PUBLIC_GA_ID` | The real GA4 measurement ID, beginning with `G-` |
| `PUBLIC_SIGNUP_PLAN` | The discovery plan label; leave unset if no label is needed |

Create a dedicated deployment service account in Google Cloud project `onolys`, then grant it **Firebase Hosting Admin** (`roles/firebasehosting.admin`) and **API Keys Viewer** (`roles/serviceusage.apiKeysViewer`). These are the [Firebase-documented roles for Hosting deployment through the CLI](https://firebase.google.com/docs/projects/iam/roles-predefined-product#firebase-hosting-roles); project Owner or Editor access is unnecessary. Create a JSON key for that account in its **Keys** tab and save the complete JSON as the repository secret `FIREBASE_SERVICE_ACCOUNT`. The implementation has not created this account or generated a key.

The workflow validates production values before deployment, writes credentials only to a private file in the runner's temporary directory, and removes that file after success or failure. No credential file is uploaded as an artifact. The real Apps Script deployment and GA4 setup remain prerequisites; custom domains still require their separate owner setup.

For local production builds, copy `.env.example` to `.env.local` and fill in the public values, then run `npm run build:prod`. `npm run deploy` performs that guarded build before deploying both Hosting targets with your local Firebase authentication. `npm run build` remains available without production configuration.
