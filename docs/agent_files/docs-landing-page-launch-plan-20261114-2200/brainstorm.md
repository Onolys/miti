---
status: approved
summary: Two no-price discovery pages (/ for learners, /enterprise for coder QC) on Firebase at miti.onolys.com, sign-ups to a Google Sheet
date: 2026-11-14
---

# miti landing page: brainstorm brief

## TL;DR
Two static pages on Firebase Hosting at `miti.onolys.com`, with `onolys.com` redirecting there. `/` is for MI learners and free evaluators. `/enterprise` is for organisations that want quality control (QC) of their human MITI coders. There is one offer: we evaluate a session you upload, with a full MITI 4.2.1 evaluation where every score is linked to its evidence. There are no prices and no FAQ. The only goal is customer discovery: email sign-ups plus optional answers, saved to a Google Sheet through a Google Apps Script web app. Built with Astro.

## Problem
Customer discovery for the Onolys MI evaluation (launch plan, Jira ONOLYS-72). Before the product exists we need to learn: who wants their own sessions evaluated, how often, how they get feedback today, what they would pay, and whether organisations want QC of their coders. Source docs are `landing-page.md` and `launch-plan.md` in this folder. **Where they differ, this brief wins.** Dropped from them: all prices, the $5 question and pre-order, the FAQ, the "send a transcript for a free first evaluation" link, the "Who it is for" and "How it works" sections, the coding-services strip, and the Price and Official result rows of the compare table.

## Decision log
| Decision | Alternative rejected | Why |
|---|---|---|
| Two pages: `/` (learners/free evaluators) and `/enterprise` (shareable with orgs) | One page with a coding-services strip | Tejit: separate offer and audience |
| One offer only: we evaluate an uploaded sample | Free-transcript offer, $5 pre-order | Tejit |
| No prices anywhere | Showing $5 | Tejit: customer discovery only |
| No FAQ, no privacy policy or terms page | Doc's FAQ | Tejit |
| Hero sign-up saves twice: email first, then the popup answers | One form | Tejit: capture the email even if the popup is abandoned |
| Early Access button after every section opens the same popup | Hero only | Tejit |
| No local storage of sign-up state | Remember signed-up visitors | Tejit: seeing the form again is fine |
| Features: Evidence, Complete, Feedback; "minutes" is a one-line mention | "Fast" as a feature | Tejit picked from Claude's proposal |
| What it evaluates: 6 high-level, more technical cards | Listing each MITI code | Tejit asked for high level plus a technical angle; card wording is Claude's |
| Learner compare table without Price and Official result rows | Doc's full table | Tejit |
| Enterprise compare: Second human coder vs Onolys evidence check | Reuse the learner table | Claude's default, accepted |
| Enterprise benefits: Bulk evaluations, Quality control (includes coder training), Fast turnaround | Coder training as its own card | Tejit |
| Popup fields as listed below, including a "what would you pay" range | No pay question | Claude's default, accepted; it asks, it does not offer a price |
| Limits and privacy go in the footer; "Questions?" mailto next to the bottom CTA; footer line with email | Separate trust section | Tejit |
| Cut "Who it's for", "How it works", coding strip; no link from `/` to `/enterprise` | Keep them | Claude's default, accepted |
| Storage: Google Sheet through an Apps Script web app | Formspree/Tally, serverless + DB, Firestore | Tejit: free |
| The popup save updates the hero save's row (upsert by email + page) | Two rows per person | Claude's call |
| Honeypot field as spam guard | CAPTCHA | Claude's call: no friction |
| On save failure: show error with mailto fallback | Silently show thanks | Claude's call |
| Astro static site | Plain HTML, Next.js | Claude's call (Tejit: "whatever is good") |
| Firebase Hosting, new Firebase project; DNS stays at Namecheap; `onolys.com` redirects to `miti.onolys.com` | Vercel; Cloudflare DNS | Claude's call after Tejit offered Firebase; Cloudflare proxy can break Firebase SSL verification |
| GA4 via the Firebase project, no cookie banner | Vercel Analytics, Plausible | Tejit wants GA; no banner is Claude's call (US-focused discovery) |
| Headlines as below | Doc options 2 to 4 | Claude's default, accepted |
| Mockups are coded HTML built from a role-play we write | Real or licensed data | Claude's call: MI-TAGS/AnnoMI licences unconfirmed |
| Pass/stop: under 2% sign-up after 300 visitors means rethink headline and example; 5%+ sign-up with half naming $5 or more is a pass; judge 30 Nov 2026 | Other thresholds | Tejit, from launch plan |

## Design

### Shared
- Layout: top bar with the "Onolys" wordmark and a "Get early access" button (it opens the popup). Mobile first, loads fast, no stock photos.
- Style: white background, dark text, one deep-teal accent, Inter throughout. Score chips use colour plus text.
- After every section's content: a "Get early access" button that opens the popup.
- Final CTA band: "Get early access" button with a "Questions?" link beside it (`mailto:tejitpabari99@gmail.com`).
- Footer: "Not official MITI coding and cannot be submitted as one. Use it to practise and prepare. Role-play or de-identified transcripts only. Uploads are not used to train models." Then "Questions? Reach out to tejitpabari99@gmail.com", with the email as a mailto link. No policy links.
- `?src=` tag in the URL is captured and sent with every save.

### `/` (learners)
1. **Hero.** Headline: "Get your MI session evaluated. See the evidence for every score." Sub: "A full MITI 4.2.1 evaluation of your transcript: global ratings, behaviour counts, summary scores and feedback, each linked to the exact lines." Email box + "Get early access" button. Small line: "Role-play or de-identified transcripts. For practice and preparation, not official MITI coding."
2. **Features.** Left: three single words (Evidence, Complete, Feedback). Right: a mockup of the selected one. On mobile they stack as word, then mockup.
   - Evidence: transcript excerpt beside a scorecard. Clicking "Complex reflections 6 (lines 12, 19, 31, 44, 52, 67)" highlights those lines. Example rating: "Empathy 4. Complex reflections at lines 12, 31 and 44 show understanding of the client's view; the worry about work at line 58 was not picked up."
   - Complete: scorecard with the 4 globals (Cultivating Change Talk, Softening Sustain Talk, Partnership, Empathy; 1 to 5), the 10 behaviour codes (Giving Information, Persuade, Persuade with Permission, Question, Simple Reflection, Complex Reflection, Affirm, Seeking Collaboration, Emphasizing Autonomy, Confront), and summary scores (technical and relational averages, % complex reflections, reflection-to-question ratio, MI-adherent and non-adherent totals) marked against MITI 4.2.1 fair/good reference levels. Label these as reference levels, not pass marks.
   - Feedback: two strengths and two things to try next time, each with line references.
   - One line under the section: "Results in minutes, not the 1 to 2 weeks human coding takes."
3. **What it evaluates.** 6 cards, headline plus one short line each:
   1. Full MITI 4.2.1: 4 global ratings (1 to 5) and 10 behaviour codes, not just counts.
   2. Traceable: every code and rating links to its transcript lines.
   3. Benchmarked: % complex reflections, reflection-to-question ratio and technical/relational averages, each against MITI fair/good levels.
   4. Change-goal aware: scored against the target behaviour you name, as MITI requires.
   5. Your own session: your real transcript, not a chat with a simulated client.
   6. Minutes, not weeks.
4. **How it compares.** Columns: Human MITI coding | AI practice chatbots | Onolys. Rows: Your own session (Yes / No, a simulated chat / Yes); Full MITI 4.2.1 incl. global ratings (Yes / Usually "MITI-informed" / Yes); Evidence for every score (Sometimes / Rarely / Yes, linked lines); Turnaround (About 1 to 2 weeks / Instant / Minutes).
5. **Final CTA band**, then the footer.

### `/enterprise`
Same as `/`, with these differences:
- Hero headline: "Quality-check your MITI coding. Every score, backed by the session." Sub: "We read each coded sample against its transcript and flag the scores the session doesn't support, with line references."
- **Benefits** section right after the hero, 3 cards:
  - Bulk evaluations: "Volume pricing for evaluating many samples across your team or program." No numbers.
  - Quality control: "Check each coded sample against its transcript. Unsupported scores are flagged with lines, which also shows new coders where they drift."
  - Fast turnaround: "Flags arrive in minutes, so second coding focuses only on disputed scores."
- Features and What it evaluates: the same as `/`.
- Compare columns: Second human coder | Onolys evidence check. Rows: Checks every score (Yes / Yes); Points to the lines (Sometimes / Yes, linked lines); Turnaround (Days / Minutes); Scales with volume (Needs more coders / Yes).

### Sign-up flow
- **Hero submit:** check the email format, then POST `{step:1, email, page, src, honeypot}`. Show inline: "Thanks. We'll reach out with early access information in a few weeks." Then open the popup with the email filled in.
- **Section CTA:** opens the popup with an empty email field, which comes first and is required.
- **Popup submit:** POST `{step:2, email, page, src, honeypot, ...fields}`. Success: the popup content changes to "Thank you for signing up." Failure: "Something went wrong. Try again, or email tejitpabari99@gmail.com."
- Popup: accessible dialog (Esc and close button, focus trap), full-screen sheet on mobile. Dropdowns for choice fields. Everything except email is optional.
- **Learner fields:** Role (Student learning MI; Practitioner learning MI; Preparing a work sample for coding; MI trainer or supervisor; Coding service; Researcher; Other) · How often would you want a session evaluated (Once; A few times; Monthly; Weekly; For a whole course or team) · How do you get feedback today (Supervisor or trainer; Paid MITI coding; AI practice tool; None; Other) · What would you pay per evaluation (Under $5; $5 to 10; $10 to 20; $20+; Not sure) · Anything else (free text).
- **Enterprise fields:** the learner fields minus "How often", plus Organisation (text) · Organisation type (Coding service; University or training program; Health or treatment org; Research; Other) · Number of coders or learners (1 to 5; 6 to 20; 21 to 100; 100+) · Samples per month (Under 10; 10 to 50; 50 to 200; 200+).
- **Apps Script:** `doPost` parses the body, drops requests with the honeypot filled, takes a `LockService` lock, and upserts a row keyed by email + page. Columns: first_seen, updated, page, src, email, then one column per field. It returns JSON. The page sends `Content-Type: text/plain` to avoid a CORS preflight. The script lives in the repo, for Tejit to paste in.
- Config at build time: `PUBLIC_SIGNUP_URL` (Apps Script web app URL) and `PUBLIC_GA_ID` (GA4 measurement ID).

### Hosting and analytics
New Firebase project with Hosting, and GA4 linked. Both `miti.onolys.com` and `onolys.com` are connected; `onolys.com` redirects to `miti.onolys.com`. DNS records are added at Namecheap. Deploy with `firebase deploy` from the Astro build output.

### Owner-only (Tejit)
- Create the Google Sheet, paste the script, deploy it as a web app (Execute as: Me, Access: Anyone), and send the URL.
- Create the Firebase project, enable GA4, and send the measurement ID. Give deploy access or run the deploy.
- Add the Firebase DNS records for both domains at Namecheap.

## Goals, non-goals, anti-goals
- **Goals:** capture emails plus discovery answers from both audiences, tagged by source; work well on mobile; show the product credibly through mockups; give visitor counts per page for the pass/stop numbers.
- **Non-goals:** prices, payments, a real upload or evaluation, accounts, FAQ, policy pages, A/B tests, storing sign-up state in the browser, a link from `/` to `/enterprise`.
- **Anti-goals:** any accuracy number or "official MITI" implication; copy that reads as replacing MINT trainers or coders; losing a hero email because the popup failed or was closed.

## Open risks
| Risk | Cheapest test |
|---|---|
| Apps Script endpoint is spammed or hits its quotas | Honeypot now; check the Sheet daily in week 1 |
| Cross-origin POST to Apps Script fails or the response can't be read | Try one request from a local build before the UI is finished |
| GA4 without consent upsets EU visitors | Check the GA4 country split after week 1; add a banner if the EU share is real |
| Mockups look fake or wrong to MI experts | Show the Evidence mockup to one MI trainer before launch |
| Learners guess `/enterprise` and are confused | Low impact; same offer framing |
| Data deletion period not stated (doc proposed 30 days) | Decide before the real upload exists; footer makes no deletion claim for now |
