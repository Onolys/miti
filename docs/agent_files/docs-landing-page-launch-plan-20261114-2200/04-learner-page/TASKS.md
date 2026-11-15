---
status: draft
summary: 9 tasks - MITI math, role-play dataset, evidence/complete/feedback mockups, tabs, evaluates, compare, page assembly, e2e
date: 2026-11-15
---
# Tasks: SP04 Learner page `/`

Source of truth: /root/projects/onolys/miti/.worktrees/docs/landing-page-launch-plan/docs/agent_files/docs-landing-page-launch-plan-20261114-2200/04-learner-page/PRD.md. Built on branch `docs/landing-page-launch-plan`. Depends on SP01 (Vitest SP01 T1, `Section`/`CtaButton`/layout SP01 T3, `TeamSection` SP01 T4, Playwright SP01 T7, CI SP01 T8 runs every test here; no CI task in this SP) and SP03's `HeroForm` (SP03 T3). All tests are written first. SP05 reuses most outputs, so keep everything parameterized.

| # | Task | Depends on | Status |
|---|---|---|---|
| 1 | MITI formulas and reference levels (`miti.ts`) | SP01 T1 | done |
| 2 | Role-play dataset (`roleplay.ts`) and its locking test | 1 | done |
| 3 | Highlight behavior, TranscriptPane, EvidenceMockup | 2, SP01 T3 | done |
| 4 | CompleteMockup and FeedbackMockup | 2, SP01 T1 | done |
| 5 | Tab behavior and FeatureTabs | 3, 4 | done |
| 6 | EvaluatesSection and card data | SP01 T3 | in-progress |
| 7 | CompareTable and learner data | SP01 T3 | todo |
| 8 | Hero and `index.astro` assembly | 5, 6, 7, SP01 T4, SP03 T3 | todo |
| 9 | Learner e2e spec | 8, SP01 T7 | todo |

## Task 1 — MITI formulas and reference levels
What it is / what it means: The pure math module that keeps all mockups consistent (R3; decisions 2, 3, 4).
What changes at a high level: `src/lib/miti.ts` exports the `Code` type, `CODE_LABELS`, `REFERENCE_LEVELS` (Technical 3/4, Relational 3.5/4, %CR 40/50, R:Q 1/2), `levelFor` (Good / Fair / Below fair on raw values), and `summarize(rp)` returning counts by code, lines by code, the six metrics and chip levels. Technical and Relational are averages of the globals; %CR and R:Q return `null` on zero denominators; non-adherent is Confront + Persuade only. Resolve the [DEFERRED] item here: verify the reference levels against the MITI 4.2.1 manual and note the result in a code comment.
Done when: `miti.test.ts` (separate small fixtures, not the real role-play) passes for each formula, Persuade with Permission not counted as non-adherent, null on SR+CR=0 and Q=0, and chip boundaries at exactly 3, 4, 3.5, 40, 50, 1, 2.

## Task 2 — Role-play dataset and its locking test
What it is / what it means: The single source of truth for four mockups, with the brief's fixed numbers (R2; decisions 1, 3, 4, 7).
What changes at a high level: `src/data/roleplay.ts` exports typed `roleplay` (68-72 contiguous numbered lines, fictional exercise-goal topic, `changeGoal`). Codes only on counselor lines at fixed counts (GI 5, P 1, PwP 1, Q 7, SR 5, CR 6, AF 3, SC 2, EA 2, CO 0). CRs at exactly 12, 19, 31, 44, 52, 67; line 58 is a client worry with `missedLines: [58]`, and 59-60 carry no CR/SR. The range 53-66 stays CR-free (binding for SP05's QC wording). Four globals (3, 4, 4, 4) with rationale and cited lines; Empathy cites 12, 31, 44. Two strengths and two next-time items with `cites`/`citesCode`, using the plain Persuade line and the separate PwP line.
Done when: `roleplay.test.ts` passes every R2/Acceptance assertion: contiguity, codes only on counselor lines, exact counts, exact CR lines, no CR in 53-66, line 58 client, 59-60 uncoded for CR/SR, all line refs exist and `citesCode` matches, feedback 2+2, and summary equals Technical 3.5, Relational 4.0, %CR 54.5, R:Q 1.57, adherent 7, non-adherent 1 with chips Fair/Good/Good/Fair.

## Task 3 — Highlight behavior, TranscriptPane, EvidenceMockup
What it is / what it means: The interactive Evidence view (R5 Evidence; decisions 5, 7). `TranscriptPane` must be exposed as its own component because SP05's QcMockup reuses it.
What changes at a high level: Generic `src/lib/highlight.ts` driven only by `data-highlight-lines` / `data-line` attributes: single active row, `aria-pressed` toggle, second click clears, scrolls the pane (not the page) to the first line, shows a code tag beside highlighted lines, updates a polite live region. `TranscriptPane.astro` renders all numbered, speaker-labelled lines in a focusable labelled region (max ~45vh on mobile). `EvidenceMockup.astro` takes `{roleplay, summary}`, renders the scorecard rows (4 globals plus codes with count >= 1, text from data such as "Complex reflections 6 (lines ...)"), Complex reflections pre-selected, Empathy row shows rationale and "not picked up" for 58.
Done when: jsdom unit tests for `highlight.ts` pass (toggle, single active, clear, live-region text, no data knowledge); build renders the mockup with all line numbers present; interaction e2e is covered in Task 9.

## Task 4 — CompleteMockup and FeedbackMockup
What it is / what it means: The other two Features views (R5 Complete/Feedback; decision 2). Both reused by SP05.
What changes at a high level: `CompleteMockup.astro` shows the 4 globals (1-5), all 10 behavior counts, and a summary block with the six metrics; four chips use color plus text with SP01 token colors; Totals/globals get no chip; legend reads "Reference levels from MITI 4.2.1 (fair / good). Not pass marks." `FeedbackMockup.astro` shows 2 strengths and 2 "next time" items, each with its line references as text. Both take `{roleplay, summary}` props and render only at build time; no hand-typed numbers.
Done when: component render tests (Vitest with Astro container or build-output check) assert chip text Fair/Good/Good/Fair for the default data, the exact legend string, 10 behavior counts displayed, 4 feedback items each with a line reference, and that changing the prop data changes the rendered values.

## Task 5 — Tab behavior and FeatureTabs
What it is / what it means: The Features section frame (R4; decisions 6, 10). SP05 swaps only the `evidence` slot.
What changes at a high level: `FeatureTabs.astro` with slots `evidence`, `complete`, `feedback` and an `idPrefix` prop. Three single-word tabs. Vertical left tablist at >= 768px; horizontal tab row above the mockup on mobile. ARIA tablist/tab/tabpanel with `aria-selected`, `aria-controls`, `aria-labelledby`, `aria-orientation` following layout, roving `tabindex`. `tabs.ts` handles arrows (both axes), Home, End, activation, sets `data-enhanced`. Without JS all panels stack visibly. Evidence is default.
Done when: jsdom tests for `tabs.ts` pass (ArrowDown/Right/Up/Left wrap, Home, End, one panel visible, roving tabindex, enhancement flag, two instances with different `idPrefix` do not clash); no-JS markup has all three panels visible.

## Task 6 — EvaluatesSection and card data
What it is / what it means: The six-card grid (R6; brief card text; resolved card 6 line).
What changes at a high level: `src/data/evaluates.ts` holds six headline/line pairs: cards 1-5 split the brief's text at the colon; card 6 is "Minutes, not weeks" with "Feedback while the session is still fresh." `EvaluatesSection.astro` is self-contained (heading "What it evaluates", `Section` with `id=evaluates` and the trailing CTA `section:evaluates`) so SP05 can reuse it unchanged. US spelling, no `$` or accuracy claims.
Done when: Vitest tests assert exactly 6 cards, exact headline/line text for each, the card 6 line, and the rendered section has the heading and a `data-open-popup` button with `data-trigger="section:evaluates"`.

## Task 7 — CompareTable and learner data
What it is / what it means: The "How it compares" table with mobile card layout (R7; decision 8). Parameterized for SP05.
What changes at a high level: `compare.learner.ts` holds columns Human MITI coding / AI practice chatbots / Onolys and the four brief rows exactly. `CompareTable.astro` takes `columns`, `rows`, `highlight` index; renders a real `<table>` with `<th scope>`; below 640px each row becomes a card via CSS plus explicit `role` attributes preserving table semantics; the highlighted (Onolys) cell is accent-colored and bold. No horizontal scroll at any width. Section wrapper with heading "How it compares", id `compare`, CTA `section:compare`.
Done when: Vitest tests assert the exact rows/columns/Onolys values, `th scope` attributes, highlight cell emphasis, and a different dataset renders through the same component; the 360px layout is checked in Task 9.

## Task 8 — Hero and `index.astro` assembly
What it is / what it means: Putting the page together in the required order (R1, R8; decision 9).
What changes at a high level: `Hero.astro` with the single `<h1>`, sub, SP03's `<HeroForm />` (no props beyond a wrapper; if SP03 has not merged, use a stub at the exact path with the same props that SP03 overwrites) and the small disclaimer line, all copy verbatim from the brief. `index.astro` fills the SP04 slot: hero, features (visually hidden "Features" heading, `FeatureTabs` with the three mockups, the "Results in minutes, not the 1 to 2 weeks human coding takes." line, trailing CTA `section:features`), evaluates, compare, then `TeamSection` with `cta={false}`, footer from Base. No link to `/enterprise`.
Done when: build output tests/script assert section ids in order `hero, features, evaluates, compare, team`, one `<h1>`, verbatim hero copy, no `$` in page text, no "official" outside the disclaimers, no `/enterprise` link; `npm run build` and `astro check` pass; `/enterprise` build output unchanged.

## Task 9 — Learner e2e spec
What it is / what it means: Browser proof of the whole page on desktop and Pixel 5 (Acceptance Criteria; SP01's Playwright config).
What changes at a high level: `e2e/learner.spec.ts` covering structure, Evidence interaction, tab keyboard behavior, Complete/Feedback contents and mobile layout. Add nothing to the SP01 config.
Done when: the spec passes on both projects: sections in order with footer last; features/evaluates/compare each have a `data-open-popup` button with the right `data-trigger`; 6 cards; compare rows exact; Complex reflections click highlights exactly lines 12, 19, 31, 44, 52, 67 with `aria-pressed=true`, a second click clears; Empathy highlights 12, 31, 44 and shows "not picked up"; ArrowDown/ArrowRight/Home/End move focus and show the matching single panel; Complete shows Fair/Good chip text and the "not pass marks" legend; Feedback shows 4 items with a line ref; at 360px with each tab active `scrollWidth <= clientWidth` and compare renders as cards; no console errors.

## Owner steps
- Have one MI trainer/coder read the role-play and its coding for plausibility before launch (the implementer may not self-certify).