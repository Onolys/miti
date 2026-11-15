---
status: draft
summary: 8 tasks - QC data + pinning test, Benefits, enterprise compare data, QcMockup, page assembly, noindex/isolation, e2e, final gates
date: 2026-11-15
---
# Tasks: SP05 Enterprise page `/enterprise`

Source of truth: /root/projects/onolys/miti/.worktrees/docs/landing-page-launch-plan/docs/agent_files/docs-landing-page-launch-plan-20261114-2200/05-enterprise-page/PRD.md. Built on `docs/landing-page-launch-plan`. Composes SP04 parts unchanged; SP05 edits only the `enterprise.astro` slot and its own files. Depends on SP01 (T1 Vitest, T3 Base `noindex`/`Section`/`CtaButton`, T4 `TeamSection`, T5 `firebase.json`, T7 Playwright, T8 CI runs every test here; no CI task in this SP), SP03 T3 (`HeroForm`) and SP04 T2 (roleplay), T1 (`summarize`), T3 (`highlight.ts`, `TranscriptPane`), T4 (Complete/Feedback mockups), T5 (`FeatureTabs`), T6 (`EvaluatesSection`), T7 (`CompareTable`). Tests are written first. All open items are resolved; no [OPEN] remain.

| # | Task | Depends on | Status |
|---|---|---|---|
| 1 | QC data (`roleplay.qc.ts`) and its pinning test | SP04 T1, SP04 T2 | done |
| 2 | Benefits data and `BenefitsSection` | SP01 T3 | done |
| 3 | Enterprise compare data | SP04 T7 | done |
| 4 | `QcMockup` | 1, SP04 T3 | in-progress |
| 5 | `enterprise.astro` assembly | 2, 3, 4, SP04 T5, SP04 T6, SP01 T4, SP03 T3 | todo |
| 6 | noindex and isolation checks | 5, SP01 T5 | todo |
| 7 | Enterprise e2e spec | 5, 6, SP01 T7, SP03 T4 | todo |
| 8 | Final gates and `/` regression | 7, SP01 T8 | todo |

## Task 1 — QC data (`roleplay.qc.ts`) and its pinning test
What it is / what it means: The coder's invented scores plus our flags, derived from the shared role-play so flags can never contradict the transcript (R4; decisions 1-3; resolved items 1, 2, 8).
What changes at a high level: `src/data/roleplay.qc.ts` imports `roleplay` and `summarize()` (never mutates them) and exports `QcData`: coder globals CCT 3, SST 4, Partnership 4, Empathy 5; `coderCRCount` 7; `coderExtraCR` [59]; two flags. Empathy flag: coder 5, supported read from `roleplay.globals` (4), range derived as the CR-free gap around line 58 (53-66), `missed` [58], note exactly "No complex reflections at lines 53-66; line 58 concern missed." (range rendered from data). CR flag: coder 7, supported 6 from `summarize()`, cites [59], note "Line 59 counted as a complex reflection; the session shows none there." Supported values are read, not retyped.
Done when: `roleplay.qc.test.ts` passes: range equals (previous CR line + 1, next CR line - 1) around 58, i.e. [53, 66], with no CR inside; `missed` 58 is a client line in range; `supported` equals `roleplay.globals` and `summarize()` (Empathy 4, CR 6); coder values differ from supported only on the two flagged rows; `coderExtraCR` are counselor lines not coded CR and `coderCRCount - 6 = coderExtraCR.length`; all `cites` exist; note text derives from data.

## Task 2 — Benefits data and `BenefitsSection`
What it is / what it means: The three benefit cards (R3).
What changes at a high level: `src/data/benefits.ts` holds three headline/line pairs verbatim: Bulk evaluations, Quality control, Fast turnaround, with the PRD sentences exactly ("Volume pricing" wording only, no numbers). `BenefitsSection.astro` renders 3 equal cards inside SP01's `Section` (`id="benefits"`, trailing CTA `section:benefits`), US spelling, no `$`, no replace-the-coder wording (R8).
Done when: Vitest tests assert exactly 3 cards, exact headline and line text, section `id`, and a `data-open-popup` button with `data-trigger="section:benefits"`; text contains no `$`, "accura" or "replace".

## Task 3 — Enterprise compare data
What it is / what it means: The two-column table content, rendered by SP04's parameterized `CompareTable` (R6).
What changes at a high level: `src/data/compare.enterprise.ts` with columns "Second human coder" and "Onolys evidence check" and four rows: Checks every score (Yes / Yes); Points to the lines (Sometimes / Yes, linked lines); Turnaround (Days / Minutes); Scales with volume (Needs more coders / Yes). Highlight index points to the Onolys column. No edit to `CompareTable`.
Done when: Vitest tests assert exact columns, rows and values, the highlight index, and that the dataset renders through `CompareTable` with the Onolys cells emphasized and `th scope` attributes intact.

## Task 4 — `QcMockup`
What it is / what it means: The coder-QC view that fills FeatureTabs' Evidence slot (R5; decisions 4, 7, 8; resolved item 5).
What changes at a high level: `src/components/mockups/QcMockup.astro` takes the QC data and role-play. Scorecard on the left/top with a header "3 supported, 2 flagged for review" and footnote "Flags are for human review. The coder decides." Rows show label, "Coder N", a text-plus-color chip ("Supported" good / "Not supported" low) and "Session supports N" on flagged rows. Flagged rows are buttons with `data-highlight-lines` (Empathy 53-66 with 58 marked, CR 59) driven by SP04's `highlight.ts` and its attributes and live region; Empathy pre-selected on load. Right/bottom reuses SP04's `TranscriptPane`. No new script, no hand-typed numbers.
Done when: render tests pass: header count text, footnote, five rows with chip text, "Coder 5" and "Session supports 4" on Empathy, the exact quoted Empathy note, flagged rows are buttons with the right `data-highlight-lines`, Empathy has `aria-pressed=true` initially, all transcript lines present; changing the QC data changes the output.

## Task 5 — `enterprise.astro` assembly
What it is / what it means: The page in the required order (R1, R2; decisions 5, 6; resolved items 4, 6, 7).
What changes at a high level: Fill only the SP05 slot of the SP01 shell (Base `page="enterprise"` and `noindex`). Inline hero (single h1 "Quality-check your MITI coding. Every score, backed by the session.", the sub verbatim, SP03's `<HeroForm />`, and the learner small line "Role-play or de-identified transcripts. For practice and preparation, not official MITI coding."), no trailing CTA; remove SP03's temporary shell `HeroForm`. Then `BenefitsSection`, features (`FeatureTabs` with `idPrefix="ent"`, `QcMockup` in `evidence`, SP04 Complete and Feedback mockups, trailing CTA `section:features`, no "Results in minutes" line), `EvaluatesSection` unchanged, compare section (heading "How it compares", id `compare`, CTA `section:compare`), then `TeamSection` with its own CTA; footer from Base.
Done when: build-output tests assert section ids in order `hero, benefits, features, evaluates, compare, team`, one h1, verbatim hero copy, tab label "Evidence", no `$`, "accura" or "replace" in `main`; `npm run build` and `astro check` pass.

## Task 6 — noindex and isolation checks
What it is / what it means: The page stays hidden from learners and search engines (R7).
What changes at a high level: Verify SP01 T5's `firebase.json` already has `X-Robots-Tag: noindex` for `/enterprise` (do not duplicate it; fix only if the entry is missing). Confirm no robots.txt Disallow, no sitemap entry, no `canonical` to elsewhere. Add build-output checks that the built `/` HTML has no `href` containing `enterprise` anywhere (topbar, hero, team, footer).
Done when: tests pass: `/enterprise` HTML has `<meta name="robots" content="noindex, nofollow">` and no `canonical`; `/` HTML has no `href` containing `enterprise` (raw HTML scan); `firebase.json` has the `X-Robots-Tag: noindex` header for `/enterprise` exactly once.

## Task 7 — Enterprise e2e spec
What it is / what it means: Browser proof on the production build, desktop and Pixel 5 (Acceptance Criteria; SP01 T7 config, no config changes).
What changes at a high level: `e2e/enterprise.spec.ts` covering structure, QC interaction, tabs, compare, popup, noindex/isolation and mobile, requests mocked as in SP03 T5.
Done when: tests pass on both projects: section order; h1, sub and 3 benefit cards verbatim; 3 trailing CTAs with `data-trigger="section:<id>"`; QC mockup shows Empathy "Coder 5", "Not supported" and the exact line "Empathy 5: not supported. No complex reflections at lines 53-66; line 58 concern missed."; Empathy click state highlights 53-66 (`aria-pressed`), CR row highlights 59, second click clears; Complete and Feedback tabs show SP04 content; compare exact columns/rows; no `$`, "accura", "replace" in `main`; meta robots contains `noindex` and `/` has no `enterprise` anchor (rendered DOM); any CTA opens the dialog with Organization and Samples per month, no "How often", and a step-2 POST with `page:'enterprise'`; at 360px with each tab active `scrollWidth <= clientWidth` and compare reads as cards.

## Task 8 — Final gates and `/` regression
What it is / what it means: Close-out proof that nothing else moved (Acceptance Criteria last line).
What changes at a high level: No new features. Run `npm run build`, `astro check`, `vitest run`, and push so SP01 T8's CI runs the SP05 tests. Confirm `/` output is unchanged and no SP04 file, `roleplay.ts`, tokens or popup fields were edited by SP05 (git diff scope check).
Done when: build, `astro check`, `vitest run` and the CI workflow pass on the branch including `roleplay.qc.test.ts` and `enterprise.spec.ts`; a diff of built `/` HTML against pre-SP05 shows no change; the SP05 diff touches only files in the PRD's Owns list.

## Owner steps
- Have one MI coder/trainer review the QC mockup (the invented coder scores, the flags and their wording) before launch; the implementer may not self-certify.
- Share the `/enterprise` link directly with organizations; there is deliberately no link from `/`.
