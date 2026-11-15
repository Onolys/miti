export type Code = 'GI' | 'P' | 'PwP' | 'Q' | 'SR' | 'CR' | 'AF' | 'SC' | 'EA' | 'CO';
export type GlobalKey = 'CCT' | 'SST' | 'PARTNERSHIP' | 'EMPATHY';

export interface Line {
  n: number;
  speaker: 'counselor' | 'client';
  text: string;
  code?: Code;
}

export interface GlobalRating {
  key: GlobalKey;
  score: 1 | 2 | 3 | 4 | 5;
  rationale: string;
  lines: number[];
  missedLines?: number[];
}

export interface FeedbackItem {
  kind: 'strength' | 'next';
  text: string;
  cites: number[];
  citesCode?: Code;
}

export interface Roleplay {
  id: string;
  title: string;
  changeGoal: string;
  lines: Line[];
  globals: GlobalRating[];
  feedback: FeedbackItem[];
}

export const CODE_LABELS: Readonly<Record<Code, string>> = {
  GI: 'Giving information',
  P: 'Persuade',
  PwP: 'Persuade with permission',
  Q: 'Questions',
  SR: 'Simple reflections',
  CR: 'Complex reflections',
  AF: 'Affirm',
  SC: 'Seeking collaboration',
  EA: 'Emphasizing autonomy',
  CO: 'Confront',
};

// MITI 4.2.1 manual, printed pp. 32–33: summary formulas and fair/good
// reference levels. These are reference levels, not pass marks.
// https://casaa.unm.edu/assets/docs/miti4_21.pdf
// percentCR is a raw fraction everywhere in this API: 0.4/0.5 = 40%/50%.
// Multiply by 100 only for display; classify all metrics before rounding.
export const REFERENCE_LEVELS = {
  technical: { fair: 3, good: 4 },
  relational: { fair: 3.5, good: 4 },
  percentCR: { fair: 0.4, good: 0.5 },
  reflectionQuestionRatio: { fair: 1, good: 2 },
} as const;

export type ReferenceMetric = keyof typeof REFERENCE_LEVELS;
export type Level = 'Good' | 'Fair' | 'Below fair';

export function levelFor(metric: ReferenceMetric, raw: number | null): Level | null {
  if (raw === null) return null;
  const { fair, good } = REFERENCE_LEVELS[metric];
  return raw >= good ? 'Good' : raw >= fair ? 'Fair' : 'Below fair';
}

export interface SummaryMetrics {
  technical: number;
  relational: number;
  /** Raw proportion (0..1), or null when there are no reflections. */
  percentCR: number | null;
  reflectionQuestionRatio: number | null;
  adherent: number;
  nonAdherent: number;
}

export interface Summary {
  counts: Record<Code, number>;
  linesByCode: Record<Code, number[]>;
  metrics: SummaryMetrics;
  chips: Record<ReferenceMetric, Level | null> & { adherent: null; nonAdherent: null };
}

export function summarize(rp: Roleplay): Summary {
  const codes = Object.keys(CODE_LABELS) as Code[];
  const counts = Object.fromEntries(codes.map((code) => [code, 0])) as Record<Code, number>;
  const linesByCode = Object.fromEntries(codes.map((code) => [code, [] as number[]])) as Record<Code, number[]>;

  for (const line of rp.lines) {
    if (line.speaker === 'counselor' && line.code) {
      counts[line.code] += 1;
      linesByCode[line.code].push(line.n);
    }
  }

  const globalScore = (key: GlobalKey): number => {
    const rating = rp.globals.find((global) => global.key === key);
    if (!rating) throw new Error(`Missing MITI global rating: ${key}`);
    return rating.score;
  };
  const reflections = counts.SR + counts.CR;
  const metrics: SummaryMetrics = {
    technical: (globalScore('CCT') + globalScore('SST')) / 2,
    relational: (globalScore('PARTNERSHIP') + globalScore('EMPATHY')) / 2,
    percentCR: reflections === 0 ? null : counts.CR / reflections,
    reflectionQuestionRatio: counts.Q === 0 ? null : reflections / counts.Q,
    adherent: counts.SC + counts.AF + counts.EA,
    nonAdherent: counts.CO + counts.P,
  };

  return {
    counts,
    linesByCode,
    metrics,
    chips: {
      technical: levelFor('technical', metrics.technical),
      relational: levelFor('relational', metrics.relational),
      percentCR: levelFor('percentCR', metrics.percentCR),
      reflectionQuestionRatio: levelFor('reflectionQuestionRatio', metrics.reflectionQuestionRatio),
      adherent: null,
      nonAdherent: null,
    },
  };
}
