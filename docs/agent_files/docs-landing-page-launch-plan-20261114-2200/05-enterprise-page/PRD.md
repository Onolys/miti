---
status: draft
summary: /enterprise page (noindex, unlinked): QC hero, Benefits, coder-QC mockup in the Evidence tab built from the shared role-play, enterprise compare table; reuses SP04 pieces
date: 2026-11-15
---
# PRD: SP05 Enterprise page `/enterprise`

Repo/branch: `miti`, `feat/landing-page` · Depends on: SP01 (shell, Base `noindex`, Section, CtaButton, Team), SP03 (`<HeroForm/>`, enterprise popup fields), SP04 (roleplay, miti, FeatureTabs, mockups, EvaluatesSection, CompareTable, highlight.ts)
**Owns:** `src/pages/enterprise.astro` (SP05 slot only), `src/components/{BenefitsSection}.astro`, `src/components/mockups/QcMockup.astro`, `src/data/{benefits,roleplay.qc,compare.enterprise}.ts`, `src/data/roleplay.qc.test.ts`, `e2e/enterprise.spec.ts`. Does not edit `roleplay.ts`, SP04 components, tokens, popup fields.

## TL;DR
Compose `/enterprise` from SP04 parts. New: enterprise hero copy, Benefits (3 cards), a coder-QC mockup (human coder's scores beside our flags, with line refs) in FeatureTabs' `evidence` slot, and the enterprise compare table. QC data is derived from `roleplay.ts`, so flags can never contradict the transcript; a unit test pins that. One brief example is false against the shared role-play and is corrected (see [OPEN] 1).

## Problem
Orgs need to see "we check your coder's score against the session." The brief's example line contradicts the shared role-play (CRs at 44 and 52 sit inside "lines 40-60"). MI-literate reviewers would catch it. The page must also stay hidden from learners and from search engines.

## Goals / Non-Goals
| Goals | Non-Goals |
|---|---|
| Brief copy exact: hero, benefits, compare | Popup fields, HeroForm internals (SP03) |
| QC mockup consistent with role-play, tested | Real coder data, accuracy figures, any price/number claims ("volume pricing" wording only) |
| noindex + no inbound link from `/` | New tab/mockup frameworks, edits to SP04 files (except [OPEN] 5) |
| Anti-goals: no copy implying replacement of coders or MINT trainers | Reducing the tool to pass/fail on coders |

## Requirements
**R1 Order** (`enterprise.astro`: Base `page="enterprise" noindex`, then sections, then `TeamSection`, footer from Base)
| # | id | Content | Trailing CTA |
|---|---|---|---|
| 1 | `hero` | h1 + sub + `<HeroForm />` + small line | none (form is CTA) |
| 2 | `benefits` | 3 cards | `section:benefits` |
| 3 | `features` | `FeatureTabs`: Evidence slot = `QcMockup`; Complete, Feedback = SP04 mockups | `section:features` |
| 4 | `evaluates` | `EvaluatesSection` unchanged | `section:evaluates` |
| 5 | `compare` | `CompareTable` enterprise | `section:compare` |
| 6 | `team` | SP01, own CTA | own |

**R2 Hero** (inline in `enterprise.astro`; does not depend on `Hero.astro`'s props, see [OPEN] 4). h1: "Quality-check your MITI coding. Every score, backed by the session." Sub: "We read each coded sample against its transcript and flag the scores the session doesn't support, with line references." Small line: same as `/` ("Role-play or de-identified transcripts. For practice and preparation, not official MITI coding.") [OPEN] 6.

**R3 Benefits** (`benefits.ts`, `BenefitsSection.astro`; 3 equal cards, headline + line, verbatim)
- Bulk evaluations: "Volume pricing for evaluating many samples across your team or program."
- Quality control: "Check each coded sample against its transcript. Unsupported scores are flagged with lines, which also shows new coders where they drift."
- Fast turnaround: "Flags arrive in minutes, so second coding focuses only on disputed scores."

**R4 QC data** (`roleplay.qc.ts`, imports `roleplay`; never mutates it)
```ts
interface QcData {
  coderGlobals: Record<GlobalKey, 1|2|3|4|5>;       // coder's scores
  coderCRCount: number;                              // coder's complex-reflection tally
  coderExtraCR: number[];                            // lines coder tagged CR that session does not support
  flags: QcFlag[];
}
interface QcFlag { id: string; kind: 'global'|'code'; label: string; coder: number; supported: number;
  status: 'flagged'; note: string; cites: number[]; range?: [number, number]; missed?: number[] }
```
Chosen content (all consistent with SP04: Empathy 4, CR = 12,19,31,44,52,67, client worry line 58, lines 59-60 no CR/SR):
| Row | Coder | Session supports | Status | Evidence text |
|---|---|---|---|---|
| Cultivating Change Talk | 3 | 3 | Supported | (none) |
| Softening Sustain Talk | 4 | 4 | Supported | (none) |
| Partnership | 4 | 4 | Supported | (none) |
| **Empathy** | **5** | **4** | **Not supported** | "No complex reflections at lines 53-66; line 58 concern missed." (highlights 53-66; 58 marked) |
| **Complex reflections** | **7** | **6** | **Not supported** | "Line 59 counted as a complex reflection; the session shows none there." (highlights 59; session's 6 lines shown as context) |
Header summary: "3 supported, 2 flagged for review". Footnote microcopy: "Flags are for human review. The coder decides." Behavior counts other than CR are not shown (no new numbers to keep consistent). The range text and counts render from data; the supported values are read from `roleplay.globals` / `summarize()`, not retyped.

**R5 QcMockup** (`mockups/QcMockup.astro`)
- Layout matches SP04 Evidence: scorecard (left/top) + scrollable numbered transcript (right/bottom).
- Scorecard rows: label, "Coder N", chip (text + color: "Supported" good, "Not supported" low), "Session supports N" for flagged rows. Flagged rows are buttons with `data-highlight-lines`; click highlights via SP04's generic `highlight.ts` (same attributes `data-highlight-lines`, `data-line`, `aria-pressed`, live region). Empathy flag pre-selected on load.
- Transcript pane: all role-play lines. Reuse SP04's transcript markup if it is a component, else duplicate the few lines of markup ([OPEN] 5).
- Tab label stays "Evidence" ([OPEN] 3).

**R6 Compare** (`compare.enterprise.ts` into `CompareTable`, `highlight` = Onolys column). Columns: Second human coder | Onolys evidence check. Rows: Checks every score (Yes / Yes); Points to the lines (Sometimes / Yes, linked lines); Turnaround (Days / Minutes); Scales with volume (Needs more coders / Yes).

**R7 noindex and isolation**
- `<meta name="robots" content="noindex, nofollow">` via Base `noindex`; `X-Robots-Tag` from SP01's `firebase.json` (verify entry exists, do not duplicate). No robots.txt Disallow, no sitemap.
- Built `/` HTML has no `href` to `/enterprise` (topbar, hero, team, footer included). No `canonical` pointing elsewhere.

**R8 Copy guards:** US spelling; no `$` in page content (the popup's pay options do contain `$`; they are outside `main`); no accuracy figures; "official" only in disclaimers; no wording like "replace", "instead of coders/trainers".

## Architecture
```
roleplay.ts ──> miti.ts summarize() ──> CompleteMockup, FeedbackMockup (SP04, unchanged)
     └──> roleplay.qc.ts (coder scores, flags) ──> QcMockup ──> FeatureTabs[evidence]
highlight.ts (SP04, generic) drives QcMockup rows <-> transcript
enterprise.astro: hero(HeroForm) → BenefitsSection → FeatureTabs → EvaluatesSection → CompareTable → TeamSection
```
`idPrefix="ent"` on FeatureTabs avoids ID clashes.

## Decisions
| # | Decision | Choice | Alternatives considered | Why |
|---|---|---|---|---|
| 1 | Range in coder-QC example | "lines 53-66" (exactly the CR-free gap between CR 52 and 67) | Keep 40-60; drop range; edit roleplay | 40-60 is false (44, 52); roleplay is shared by 4 mockups and locked by SP04 |
| 2 | Coder score deltas | Empathy 5 vs 4, CR 7 vs 6 | Only Empathy; many flags | Two flags show both a global and a count kind, stay few, keep math derivable |
| 3 | QC data location | `roleplay.qc.ts` importing roleplay | Hand-typed in the component; edit `roleplay.ts` | SP04 forbids edits; drift is test-caught |
| 4 | Tab label | Keep "Evidence" | "Quality check" | Brief's three words stand; the mockup still shows evidence per score |
| 5 | Hero markup | Inline in `enterprise.astro` | Reuse `Hero.astro` | SP04 owns its props; avoid coupling |
| 6 | Features line "Results in minutes, not the 1 to 2 weeks..." | Omit | Show | It is a learner line (cites human coding weeks; enterprise compare says "Days"); Benefits already cover speed |
| 7 | Reuse highlight.ts | Yes, same data attributes | New script | Generic by design |
| 8 | Chips | Text + color ("Supported"/"Not supported") | Color only; "Wrong" | A11y rule; "wrong" overreaches, brief says "doesn't support" |

## Risks / Open Questions
1. [OPEN] **Needs Tejit's OK:** change the brief's coder-QC example to exactly: "Empathy 5: not supported. No complex reflections at lines 53-66; line 58 concern missed." (brief says 40-60). Default adopted: 53-66.
2. [OPEN] Coder's invented scores (CCT 3, SST 4, Partnership 4, Empathy 5, CR 7, extra CR at line 59) are Claude's content; brief gives only the Empathy example. Confirm; MI trainer should read it (owner step).
3. [RESOLVED: keep "Evidence"] Tab label "Evidence" vs "Quality check". Default Evidence.
4. [RESOLVED: inline hero in enterprise.astro] If `Hero.astro` accepts headline/sub props and a form slot, SP05 may reuse it. Default inline.
5. [RESOLVED: SP04 exposes src/components/TranscriptPane.astro; QcMockup reuses it] Ask SP04 to expose its transcript pane as a component (`TranscriptPane.astro`) so QcMockup reuses it. Fallback: duplicate markup.
6. [RESOLVED: reuse learner line, brief says same as /] Hero small line reuses the learner one ("For practice and preparation, not official MITI coding"); brief says "Same as `/`" so default kept.
7. [RESOLVED: HeroForm; PRD 04 updated] SP04's PRD names `HeroSignup page=`; superseded by SP03 `<HeroForm/>` (no page prop). SP05 uses HeroForm.
8. [RESOLVED: SR/CR facts reused from SP04] Line 58 is a client worry; 59-60 carry no CR/SR.
9. [DEFERRED] Real coder data, per-coder report view, "export flags".

## Manual steps (owner-only)
- Approve [OPEN] 1-2 wording; have one MI coder/trainer review the QC mockup before launch (brief risk).
- Share `/enterprise` link directly with orgs (no link from `/`).

## Acceptance Criteria
- Unit (`roleplay.qc.test.ts`): flagged range equals (previous CR line + 1, next CR line - 1) around line 58, i.e. [53, 66], and no CR in it; `missed` 58 is a client line inside range; `supported` values equal `roleplay.globals` and `summarize()` (Empathy 4, CR 6); coder values differ from supported only on flagged rows; `coderExtraCR` lines are counselor lines not coded CR and `coderCRCount - 6 = coderExtraCR.length`; all `cites` exist; rendered note text derives from data.
- e2e (`enterprise.spec.ts`, desktop + Pixel 5): sections `hero, benefits, features, evaluates, compare, team` in order; h1, sub and 3 benefit cards verbatim; 3 trailing CTAs `data-trigger="section:<id>"`; QC mockup shows Empathy "Coder 5", "Not supported", the exact [OPEN] 1 line; clicking flagged Empathy row highlights lines 53-66 (`aria-pressed`), CR row highlights 59, second click clears; Complete and Feedback tabs render SP04 content; compare table exact columns/rows; no `$`, "accura", "replace" in `main`.
- e2e noindex/isolation: `<meta name="robots">` contains `noindex`; `/` has no anchor whose href contains `enterprise` (checked on rendered DOM and raw HTML); `firebase.json` has `X-Robots-Tag: noindex` for `/enterprise`.
- e2e popup: any CTA on `/enterprise` opens the dialog with enterprise fields (Organization, Samples per month present; "How often" absent) and a step-2 POST with `page:'enterprise'`.
- e2e mobile 360px, each tab active: `scrollWidth <= clientWidth`; compare readable as cards.
- `npm run build`, `astro check`, `vitest run` pass; `/` unchanged.
