import { describe, expect, it } from 'vitest';
import { CODE_LABELS, REFERENCE_LEVELS, levelFor, summarize, type Code, type GlobalKey, type Roleplay } from './miti';

// Synthetic fixtures isolate the formulas from the landing page's role-play.
function fixture(codes: Code[] = [], scores = [3, 4, 4, 4]): Roleplay {
  const keys: GlobalKey[] = ['CCT', 'SST', 'PARTNERSHIP', 'EMPATHY'];
  return {
    id: 'formula-fixture', title: 'Formula fixture', changeGoal: 'Exercise more',
    lines: [
      { n: 1, speaker: 'client', text: 'I want to exercise more.' },
      { n: 2, speaker: 'counselor', text: 'Welcome.' },
      ...codes.map((code, index) => ({ n: index + 3, speaker: 'counselor' as const, text: 'Fixture', code })),
    ],
    globals: keys.map((key, index) => ({ key, score: scores[index] as 1|2|3|4|5, rationale: 'Fixture', lines: [2] })),
    feedback: [],
  };
}

describe('MITI summary', () => {
  it('computes all six metrics and levels from independent code and global fixtures', () => {
    const codes: Code[] = [
      ...Array<Code>(5).fill('GI'), 'P', 'PwP', ...Array<Code>(7).fill('Q'),
      ...Array<Code>(5).fill('SR'), ...Array<Code>(6).fill('CR'),
      ...Array<Code>(3).fill('AF'), 'SC', 'SC', 'EA', 'EA',
    ];
    const result = summarize(fixture(codes));
    expect(result.counts).toEqual({ GI: 5, P: 1, PwP: 1, Q: 7, SR: 5, CR: 6, AF: 3, SC: 2, EA: 2, CO: 0 });
    expect(result.linesByCode.CR).toEqual([22, 23, 24, 25, 26, 27]);
    expect(result.linesByCode.CO).toEqual([]);
    expect(result.metrics).toEqual({ technical: 3.5, relational: 4, percentCR: 6 / 11, reflectionQuestionRatio: 11 / 7, adherent: 7, nonAdherent: 1 });
    expect(result.chips).toEqual({ technical: 'Fair', relational: 'Good', percentCR: 'Good', reflectionQuestionRatio: 'Fair', adherent: null, nonAdherent: null });
  });

  it('averages the named globals regardless of their ordering', () => {
    const rp = fixture([], [1, 4, 2, 5]);
    rp.globals.reverse();
    expect(summarize(rp).metrics).toMatchObject({ technical: 2.5, relational: 3.5 });
  });

  it('returns null ratios and chips for zero denominators', () => {
    expect(summarize(fixture()).metrics).toMatchObject({ percentCR: null, reflectionQuestionRatio: null });
    expect(summarize(fixture()).chips).toMatchObject({ percentCR: null, reflectionQuestionRatio: null });
    expect(summarize(fixture(['Q'])).metrics).toMatchObject({ percentCR: null, reflectionQuestionRatio: 0 });
    expect(summarize(fixture(['CR'])).metrics).toMatchObject({ percentCR: 1, reflectionQuestionRatio: null });
  });

  it('excludes Persuade with Permission from non-adherent behavior', () => {
    expect(summarize(fixture(['PwP', 'PwP'])).metrics.nonAdherent).toBe(0);
    expect(summarize(fixture(['P', 'CO', 'PwP'])).metrics.nonAdherent).toBe(2);
  });

  it('does not mutate its input or share counts and line arrays between summaries', () => {
    const rp = fixture(['CR', 'Q']);
    const before = structuredClone(rp);
    const first = summarize(rp);
    first.counts.CR = 99;
    first.linesByCode.CR.push(99);
    expect(summarize(rp).counts.CR).toBe(1);
    expect(summarize(rp).linesByCode.CR).toEqual([3]);
    expect(rp).toEqual(before);
  });

  it('reports a missing global instead of returning an invalid average', () => {
    const rp = fixture();
    rp.globals = rp.globals.filter(({ key }) => key !== 'SST');
    expect(() => summarize(rp)).toThrow('Missing MITI global rating: SST');
  });

  it('provides a label, count, and line list for every behavior code', () => {
    const result = summarize(fixture());
    expect(Object.keys(CODE_LABELS)).toHaveLength(10);
    for (const code of Object.keys(CODE_LABELS) as Code[]) {
      expect(CODE_LABELS[code].length).toBeGreaterThan(0);
      expect(result.counts[code]).toBe(0);
      expect(result.linesByCode[code]).toEqual([]);
    }
  });
});

describe('reference levels', () => {
  it('uses raw proportions for percentCR (40% and 50%)', () => {
    expect(REFERENCE_LEVELS).toEqual({
      technical: { fair: 3, good: 4 }, relational: { fair: 3.5, good: 4 },
      percentCR: { fair: 0.4, good: 0.5 }, reflectionQuestionRatio: { fair: 1, good: 2 },
    });
  });

  it.each([
    ['technical', 3, 4], ['relational', 3.5, 4],
    ['percentCR', 0.4, 0.5], ['reflectionQuestionRatio', 1, 2],
  ] as const)('classifies %s at exact raw boundaries without rounding', (metric, fair, good) => {
    expect(levelFor(metric, fair - 0.000001)).toBe('Below fair');
    expect(levelFor(metric, fair)).toBe('Fair');
    expect(levelFor(metric, good - 0.000001)).toBe('Fair');
    expect(levelFor(metric, good)).toBe('Good');
    expect(levelFor(metric, good + 0.000001)).toBe('Good');
    expect(levelFor(metric, null)).toBeNull();
  });
});
