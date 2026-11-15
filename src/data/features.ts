export interface FeatureTab {
  heading: string;
  line: string;
}

export interface Suggestion {
  icon: 'reflect' | 'question' | 'affirm';
  title: string;
  text: string;
}

export interface QcRow {
  criterion: string;
  coded: number;
  supported: number;
  status: 'Supported' | 'Unsupported';
  lines?: string;
}

export const learnerTabs = [
  { heading: 'See your full MITI score', line: "Global ratings, behavior counts and summary scores, like a human coder's report." },
  { heading: 'Know why each score was given', line: 'Every rating links to the exact transcript lines behind it.' },
  { heading: 'Learn what to improve next', line: 'Concrete suggestions for your next session.' },
] as const satisfies readonly FeatureTab[];

export const enterpriseTabs = [
  { heading: 'See the full MITI score', line: 'Global ratings, behavior counts and summary scores for every sample.' },
  { heading: "Flag scores the session doesn't support", line: 'Each coded score is checked against the transcript, with line references.' },
  { heading: 'Show coders where they drift', line: 'Patterns across samples help new coders calibrate.' },
] as const satisfies readonly FeatureTab[];

export const globalRatings = [
  { label: 'Cultivating change talk', value: 3.0 },
  { label: 'Softening sustain talk', value: 3.5 },
  { label: 'Partnership', value: 4.0 },
  { label: 'Empathy', value: 4.0 },
] as const;

export const summaryScores = [
  { label: '% complex reflections', value: '42%', tag: 'Fair' },
  { label: 'Reflection-to-question', value: '1.2', tag: 'Good' },
  { label: 'Technical', value: '3.3' },
  { label: 'Relational', value: '4.0' },
] as const;

export const evidenceScores = [
  { label: 'Empathy', value: '4/5', top: 26 },
  { label: 'Partnership', value: '4/5', top: 104 },
  { label: 'Change talk', value: '3/5', top: 156 },
] as const;

export const evidenceQuotes = [
  { line: 'L12', text: "“Sounds like you're worried about stopping.”" },
  { line: 'L27', text: "“You've done a lot to keep this going.”" },
  { line: 'L18', text: "“Let's work out the next step together.”" },
  { line: 'L41', text: '“Part of me does want to cut back.”' },
] as const;

export const evidenceCaption = 'Every score points to the lines behind it.';

export const learnerSuggestions = [
  { icon: 'reflect', title: 'Try a complex reflection after L18', text: 'Add meaning or a guess about feeling instead of repeating the words.' },
  { icon: 'question', title: 'Ask fewer closed questions', text: 'Turn L22 and L30 into open questions about what matters to them.' },
  { icon: 'affirm', title: 'Affirm effort when they share a step', text: 'Name the strength you hear, as you did at L12.' },
] as const satisfies readonly Suggestion[];

export const qcRows: readonly QcRow[] = [
  { criterion: 'Empathy', coded: 5, supported: 4, status: 'Unsupported', lines: 'L12, L27' },
  { criterion: 'Partnership', coded: 4, supported: 4, status: 'Supported' },
  { criterion: 'Change talk', coded: 3, supported: 3, status: 'Supported' },
];

export const driftSuggestions = [
  { icon: 'reflect', title: 'Empathy rated high without complex reflections', text: '3 of 10 samples' },
  { icon: 'question', title: 'Closed questions counted as open', text: '2 of 10 samples' },
  { icon: 'affirm', title: 'Reflection-to-question ratio consistent with second coder', text: 'Calibrated' },
] as const satisfies readonly Suggestion[];
