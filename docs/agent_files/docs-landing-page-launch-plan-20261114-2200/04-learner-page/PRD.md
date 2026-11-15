---
status: approved
summary: Learner page `/` content (Hero, Features tabs, What it evaluates, Compare) plus reusable Evidence/Complete/Feedback mockups driven by one role-play dataset whose MITI 4.2.1 summary scores are computed and unit-tested
date: 2026-11-15
---

# PRD: SP04 Learner page `/`

Repo/branch: `miti`, `docs/landing-page-launch-plan` · Depends on: SP01 (layout, `Section`, `CtaButton`, tokens, Team shell); SP03 (`HeroForm`, interface below) · Consumed by: SP05 (`/enterprise`)

**Owns:** `src/pages/index.astro` (SP04 slot only), `src/data/{roleplay,evaluates,compare.learner}.ts`, `src/lib/{miti,tabs,highlight}.ts`, `src/components/{Hero,FeatureTabs,EvaluatesSection,CompareTable,TranscriptPane}.astro` (`TranscriptPane` is used by EvidenceMockup and reused by SP05 QcMockup), `src/components/mockups/{Evidence,Complete,Feedback}Mockup.astro`, `src/**/*.test.ts` for these, `e2e/learner.spec.ts`. Does not touch tokens, `Section`, `TeamSection`, `enterprise.astro`.

## TL;DR
Fill `/` with Hero, Features, What it evaluates, How it compares, then SP01's Team, then footer; Early Access CTA after each section. All three product mockups render from ONE typed role-play module (`roleplay.ts`, ~70 numbered lines, one behavior code per coded counselor line). Summary scores are computed by `miti.ts` from the codes, never hand-typed; a unit test locks them and the brief's example numbers. Mockups, tabs, evaluates grid and compare table are parameterized so SP05 reuses them.

## Problem
The page must show the product credibly before it exists, to MI-literate visitors who will notice inconsistent math (the brief's top risk). Hand-typed mockup numbers drift; three mockups plus SP05's must agree. One computed source of truth fixes that.

## Goals / Non-Goals
| Goals | Non-Goals |
|---|---|
| Brief copy exact: hero, features, 6 cards, compare table | Sign-up form/popup (SP03), Team (SP01), enterprise sections (SP05) |
| One role-play drives Evidence, Complete, Feedback | Real data (MI-TAGS/AnnoMI), a real upload/evaluation |
| Math is MITI 4.2.1-correct, computed, tested | Accuracy claims, prices, "official MITI" wording, FAQ |
| Accessible, keyboard-operable, no horizontal scroll at 360px | Animations, charts libraries, client framework |

## Requirements

**R1 Section order** (in `index.astro`, then `TeamSection`, then footer from Base)

| # | id | Content | Trailing CTA |
|---|---|---|---|
| 1 | `hero` | h1, sub, `<HeroForm />`, small line (copy verbatim from brief) | none (form has its own button; trigger `hero`) |
| 2 | `features` | `FeatureTabs` + line "Results in minutes, not the 1 to 2 weeks human coding takes." | `section:features` |
| 3 | `evaluates` | heading "What it evaluates", 6 cards | `section:evaluates` |
| 4 | `compare` | heading "How it compares", table | `section:compare` |
| 5 | `team` | SP01, `cta={false}` | its own |

Features has a visually hidden heading ("Features") so the heading outline is complete. One `<h1>` (hero).

**R2 Role-play dataset** (`src/data/roleplay.ts`, typed, exported as `roleplay`)
- ~70 lines (68-72), numbered `n` 1..N contiguous, speaker `counselor|client`. Fictional, de-identified, no real names; topic low-risk (suggest: client wants to get more exercise; counselor is a practicing MI learner). A `changeGoal` string is included (supports card 4).
- Only counselor lines carry a `code` (one of the 10 behavior codes); some counselor lines are uncoded (greeting, "mm-hm"). Client lines never carry codes.
- Target counts (fixed; implementer writes text to fit): GI 5, Persuade 1, Persuade with Permission 1, Question 7, Simple Reflection 5, Complex Reflection 6, Affirm 3, Seeking Collaboration 2, Emphasizing Autonomy 2, Confront 0 (= 32 codes).
- Globals: CCT 3, SST 4, Partnership 4, Empathy 4, each with `rationale` and cited `lines`.
- Fixed constraints from the brief: CR at exactly lines **12, 19, 31, 44, 52, 67**; Empathy 4 rationale cites CRs at 12, 31, 44; **line 58 is a client worry about work** and counselor lines 59-60 do not reflect it (stored as `missedLines: [58]`). No CR in lines 53-66.
- Persuade (one line) must be a plain Persuade; the Persuade with Permission line is a different line. Feedback cites both.
- Feedback: 2 `strength`, 2 `next` items, each with `cites: number[]` (>=1) and optional `citesCode`. Suggested: strengths = complex reflections (12, 31, 44) and affirm/autonomy lines; next = pick up the worry at line 58, and ask permission before the Persuade line.

**R3 Formulas** (`src/lib/miti.ts`, pure functions, no DOM)
| Metric | Formula |
|---|---|
| Technical | (CCT + SST) / 2 |
| Relational | (Partnership + Empathy) / 2 |
| %CR | CR / (SR + CR); `null` if SR+CR = 0 |
| R:Q | (SR + CR) / Q; `null` if Q = 0 |
| MI-adherent | Seeking Collaboration + Affirm + Emphasizing Autonomy |
| MI-non-adherent | Confront + Persuade (Persuade with Permission NOT included) |

`summarize(rp)` returns counts by code, lines by code, the six metrics, and a chip level per metric. Expected values for the dataset: Technical 3.5, Relational 4.0, %CR 54.5% (SR 5, CR 6), R:Q 1.57 (11/7), adherent 7, non-adherent 1.
`REFERENCE_LEVELS` = Technical 3/4, Relational 3.5/4, %CR 40/50, R:Q 1/2 (fair/good). `levelFor(metric, raw)`: raw >= good -> "Good", >= fair -> "Fair", else "Below fair". Compare on raw values, display rounded (1 decimal; %CR whole). Expected chips: Technical Fair, Relational Good, %CR Good, R:Q Fair. Totals and globals get no chip. Legend text: "Reference levels from MITI 4.2.1 (fair / good). Not pass marks."

**R4 Features tabs** (`FeatureTabs.astro`, slots `evidence`, `complete`, `feedback`)
- Desktop (>= 768px): left vertical tablist with three single words, right active mockup. Mobile: tabs become a horizontal row above the mockup (word, then mockup).
- Semantics: `role=tablist` (`aria-orientation` follows layout), `role=tab` with `aria-selected`/`aria-controls`, `role=tabpanel` with `aria-labelledby`, roving `tabindex`. Arrow keys (both axes), Home, End move and activate. Evidence selected by default. Progressive enhancement: without JS all three panels stack visibly; script (`tabs.ts`) sets `data-enhanced` and hides inactive panels. `idPrefix` prop avoids id clashes.

**R5 Mockups** (props `{ roleplay = roleplay, summary = summarize(roleplay) }`; build-time rendering only)
- **Evidence:** left/top scorecard rows (4 globals + codes with count >= 1), right/bottom scrollable transcript pane (all lines, numbered, speaker-labelled, `tabindex=0`, labelled region, max ~45vh on mobile). Row buttons carry `data-highlight-lines="12,19,..."`; transcript rows `data-line="n"`. Click toggles highlight (single active, `aria-pressed`), scrolls the pane (not the page) to the first line, shows a code tag beside highlighted lines (not color alone), and updates a polite live region ("6 lines highlighted: ..."). Second click clears. Initial state: Complex reflections pre-selected. Row text from data, e.g. "Complex reflections 6 (lines 12, 19, 31, 44, 52, 67)". Empathy row shows its rationale and marks 58 as "not picked up". Behavior lives in generic `highlight.ts` (data-attribute driven; no knowledge of the data).
- **Complete:** 4 globals (1-5), 10 behavior counts, summary block with chips (color + text, tokens from SP01), legend from R3.
- **Feedback:** 2 strengths, 2 "next time", each with line references as text.

**R6 What it evaluates** (`EvaluatesSection.astro`, self-contained incl. `Section` and CTA): 6 cards = headline + one line, data in `evaluates.ts`. Cards 1-5 split the brief's text at the colon (e.g. "Full MITI 4.2.1" / "4 global ratings (1 to 5) and 10 behavior codes, not just counts."). Card 6 "Minutes, not weeks" + one short line (see Risks).

**R7 Compare** (`CompareTable.astro`, props `columns`, `rows`, `highlight` index; data in `compare.learner.ts`): exact brief columns/rows. Real `<table>` with `<th scope>`. Below 640px each row renders as a card (criterion as heading, three labeled values) via CSS plus explicit `role` attributes to keep table semantics; Onolys cell emphasized with accent (also bold text). No horizontal scrolling at any width.

**R8 Copy guards:** US spelling; no `$`, no accuracy/precision figures, no "official" except in the disclaimer lines; no link to `/enterprise`.

## Architecture
```
roleplay.ts --(lines+codes+globals)--> miti.ts summarize() --> { counts, metrics, chips }
                                              |                         |
                    EvidenceMockup  CompleteMockup  FeedbackMockup  (props: roleplay, summary)
                                  \       |       /
                              FeatureTabs (slots) <-- SP05 swaps `evidence` slot
index.astro: Hero, FeatureTabs, EvaluatesSection, CompareTable(Section wrapped), TeamSection
```
```ts
type Code = 'GI'|'P'|'PwP'|'Q'|'SR'|'CR'|'AF'|'SC'|'EA'|'CO';
interface Line { n: number; speaker: 'counselor'|'client'; text: string; code?: Code }
interface GlobalRating { key: 'CCT'|'SST'|'PARTNERSHIP'|'EMPATHY'; score: 1|2|3|4|5;
  rationale: string; lines: number[]; missedLines?: number[] }
interface FeedbackItem { kind: 'strength'|'next'; text: string; cites: number[]; citesCode?: Code }
interface Roleplay { id: string; title: string; changeGoal: string; lines: Line[];
  globals: GlobalRating[]; feedback: FeedbackItem[] }
```
All client JS is vanilla TS (`tabs.ts`, `highlight.ts`), bundled by Astro, a few KB.

**Cross-SP interfaces**
- **From SP03 [RESOLVED: HeroForm per 03-signup-ui PRD]:** `src/components/HeroForm.astro`, props `{ id?, label? }` (no `page` prop; page comes from `getPage()` at runtime); renders the email input and "Get early access" button; dispatches `miti:open-popup` with `trigger: 'hero'` and `email`. SP04 passes no other props and does not style the form beyond a wrapper. Merge order: SP03 before SP04; if SP04 lands first, a stub at that exact path (same props) is used and SP03 overwrites it.
- **To SP05:** `roleplay` data; `summarize`, `REFERENCE_LEVELS`, `levelFor`, `CODE_LABELS` from `miti.ts`; `CompleteMockup`, `FeedbackMockup`; `FeatureTabs` (SP05 fills `evidence` with its coder-QC mockup); `EvaluatesSection`; `CompareTable` + `highlight.ts` (reusable for QC rows). SP05 may add its coder scores in its own file (e.g. `roleplay.qc.ts`) importing `roleplay`; it must not edit `roleplay.ts`.

## Decisions
| # | Decision | Choice | Alternatives considered | Why |
|---|---|---|---|---|
| 1 | Dataset form | Typed TS module | JSON, MDX, hand-written HTML | Types + one import for tests and four mockups |
| 2 | Summary scores | Computed from codes at build; unit test pins them | Hand-typed numbers | Impossible to drift; MI experts will check the math |
| 3 | Coding granularity | One code per counselor line, client lines uncoded | Multi-code lines, client change/sustain talk | Keeps formulas and line refs unambiguous; client codes aren't in the brief |
| 4 | Metrics and chips | SR 5 / CR 6 / Q 7 giving a Fair R:Q and Good %CR | All "Good" | Shows chips actually discriminate; looks like a real session |
| 5 | Interactivity | Vanilla TS, data-attribute driven | React/Preact island | No framework for two small behaviors; reusable by SP05 |
| 6 | Mobile Features | Horizontal tab row, then mockup | Accordion (word, mockup, word, mockup) | Shorter scroll, same tab semantics as desktop |
| 7 | Evidence transcript | Full transcript in scroll pane | Short excerpt | Lines 12-67 must all exist; pane keeps height bounded |
| 8 | Compare on mobile | Row -> card via CSS, table semantics kept | Horizontal scroll wrapper | Scroll hides the Onolys column; only 3x4 short cells |
| 9 | Hero CTA | No section CTA; the form is the CTA | Duplicate button | Brief's hero already has "Get early access" |
| 10 | No-JS | All panels visible stacked | Hidden until JS | Content still readable if script fails |

## Manual steps (owner-only)
- Have one MI trainer/coder read the role-play and its coding for plausibility before launch (brief risk "mockups look fake"). Implementer may not self-certify.

## Risks / Open Questions
- [RESOLVED: use lines 53-66] **Brief conflict:** the enterprise QC example says "No complex reflections at lines 40-60" but the brief also puts CRs at 44 and 52. Data keeps the brief's CR lines; proposed SP05 wording is "lines 53-66" (a test asserts no CR there). Needs owner OK.
- [RESOLVED: "Feedback while the session is still fresh."] Card 6 has no second line in the brief. Proposed: "Feedback while the session is still fresh." Confirm.
- [RESOLVED: horizontal tab row] Mobile Features interpretation (tab row vs accordion), default tab row; low impact.
- [RESOLVED: HeroForm per 03-signup-ui PRD] SP03 `HeroForm` path and props.
- [DEFERRED: verify at implementation] Reference levels (3/4, 3.5/4, 40/50, 1:1/2:1) are the brief's; verify against the MITI 4.2.1 manual when writing the legend.
- [RESOLVED: SR 5, CR 6, Q 7] Fixed counts above give the brief's CR=6 with a plausible R:Q.
- [RESOLVED: Persuade with Permission excluded] Non-adherent = Confront + Persuade only.
- [DEFERRED] Automated a11y audit (axe); visual regression; copy-to-clipboard of transcript.

## Acceptance Criteria
- Unit (`roleplay.test.ts`): lines contiguous 1..N (68-72); codes only on counselor lines; counts equal the R2 table; CR lines are exactly [12, 19, 31, 44, 52, 67]; Empathy 4; line 58 is a client line and lines 59-60 carry no CR/SR; no CR in 53-66; every `lines`/`cites`/`missedLines` ref exists and `citesCode` matches; 2 strengths + 2 next; summary equals Technical 3.5, Relational 4.0, %CR 54.5, R:Q 1.57, adherent 7, non-adherent 1; chips Fair/Good/Good/Fair.
- Unit (`miti.test.ts`, separate fixtures): each formula; Persuade with Permission not counted as non-adherent; SR+CR=0 and Q=0 return null; chip boundaries at exactly fair and good (3, 4, 3.5, 40, 50, 1, 2).
- e2e (desktop + Pixel 5): sections `hero, features, evaluates, compare, team` in order, footer last; each of features/evaluates/compare has a `data-open-popup` button with `data-trigger="section:<id>"`; hero copy verbatim; 6 cards; compare shows exact rows and Onolys values; page text has no `$`.
- e2e Evidence: clicking the Complex reflections row highlights exactly lines 12, 19, 31, 44, 52, 67 (`aria-pressed=true`); a second click clears; Empathy row highlights 12, 31, 44 and marks 58 "not picked up".
- e2e tabs: ArrowDown/ArrowRight/Home/End move focus and show the matching panel; one panel visible; roving tabindex; Complete shows chips with text (Fair/Good) and the "not pass marks" legend; Feedback shows 4 items each with a line ref.
- e2e mobile (360px, each tab active): `scrollWidth <= clientWidth`; compare readable as cards.
- `npm run build` and `astro check` pass; no console errors; `/enterprise` unaffected.
