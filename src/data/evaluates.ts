export interface EvaluationCard {
  headline: string;
  line: string;
}

export const evaluates = [
  {
    headline: 'Full MITI 4.2.1',
    line: '4 global ratings (1 to 5) and 10 behavior codes, not just counts.',
  },
  {
    headline: 'Traceable',
    line: 'every code and rating links to its transcript lines.',
  },
  {
    headline: 'Benchmarked',
    line: '% complex reflections, reflection-to-question ratio and technical/relational averages, each against MITI fair/good levels.',
  },
  {
    headline: 'Change-goal aware',
    line: 'scored against the target behavior you name, as MITI requires.',
  },
  {
    headline: 'Your own session',
    line: 'your real transcript, not a chat with a simulated client.',
  },
  {
    headline: 'Minutes, not weeks',
    line: 'Feedback while the session is still fresh.',
  },
] as const satisfies readonly EvaluationCard[];
