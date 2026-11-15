import { describe, expect, it, vi } from 'vitest';
import { summarize } from '../lib/miti';
import { roleplay } from './roleplay';
import { qcData } from './roleplay.qc';

const summary = summarize(roleplay);
const empathy = qcData.flags.find(({ kind }) => kind === 'global')!;
const complexReflections = qcData.flags.find(({ kind }) => kind === 'code')!;
const lineAt = (n: number) => roleplay.lines.find((line) => line.n === n);

describe('coder quality-check example', () => {
  it('flags only the approved Empathy and complex-reflection discrepancies', () => {
    expect(qcData.coderGlobals).toEqual({ CCT: 3, SST: 4, PARTNERSHIP: 4, EMPATHY: 5 });
    expect(qcData.flags).toHaveLength(2);
    expect(new Set(qcData.flags.map(({ id }) => id)).size).toBe(2);
    expect(empathy).toMatchObject({ label: 'Empathy', coder: 5, supported: 4, status: 'flagged' });
    expect(complexReflections).toMatchObject({ label: 'Complex reflections', coder: 7, supported: 6, status: 'flagged' });
    expect(empathy.coder).toBe(qcData.coderGlobals.EMPATHY);
    expect(empathy.supported).toBe(roleplay.globals.find(({ key }) => key === 'EMPATHY')!.score);
    expect(complexReflections.coder).toBe(qcData.coderCRCount);
    expect(complexReflections.supported).toBe(summary.counts.CR);
    for (const global of roleplay.globals) {
      if (global.key === 'EMPATHY') expect(qcData.coderGlobals[global.key]).not.toBe(global.score);
      else expect(qcData.coderGlobals[global.key]).toBe(global.score);
    }
  });

  it('pins the full CR-free gap around the missed client concern', () => {
    expect(empathy.range).toEqual([53, 66]);
    expect(empathy.missed).toEqual([58]);
    const [start, end] = empathy.range!;
    const [missed] = empathy.missed!;
    expect(lineAt(missed)).toMatchObject({ speaker: 'client' });
    expect(lineAt(missed)!.text).toMatch(/worried.*work/);
    expect(missed).toBeGreaterThanOrEqual(start);
    expect(missed).toBeLessThanOrEqual(end);
    expect(summary.linesByCode.CR.filter((n) => n >= start && n <= end)).toEqual([]);
    expect(start).toBe(Math.max(...summary.linesByCode.CR.filter((n) => n < missed)) + 1);
    expect(end).toBe(Math.min(...summary.linesByCode.CR.filter((n) => n > missed)) - 1);
    expect(empathy.cites).toEqual(roleplay.lines.filter(({ n }) => n >= start && n <= end).map(({ n }) => n));
    expect(empathy.note).toBe('No complex reflections at lines 53-66; line 58 concern missed.');
  });

  it('accounts for the extra CR using an actual counselor line without a CR code', () => {
    expect(qcData.coderExtraCR).toEqual([59]);
    expect(qcData.coderCRCount - summary.counts.CR).toBe(qcData.coderExtraCR.length);
    expect(qcData.coderExtraCR).toHaveLength(1);
    expect(complexReflections.cites).toEqual(qcData.coderExtraCR);
    for (const n of qcData.coderExtraCR) {
      expect(lineAt(n)?.speaker).toBe('counselor');
      expect(lineAt(n)?.code).not.toBe('CR');
    }
    expect(complexReflections.note).toBe('Line 59 counted as a complex reflection; the session shows none there.');
  });

  it('references existing transcript lines in every citation, range, and missed concern', () => {
    for (const flag of qcData.flags) {
      expect(flag.cites.length).toBeGreaterThan(0);
      expect(flag.coder).not.toBe(flag.supported);
      for (const n of [...flag.cites, ...(flag.range ?? []), ...(flag.missed ?? [])]) {
        expect(lineAt(n)).toBeDefined();
      }
    }
  });

  it('reads supported scores and evidence boundaries from the source without mutating it', async () => {
    const source = structuredClone(roleplay);
    // Move the surrounding CRs and concern to prove the displayed evidence follows
    // the source, rather than merely repeating the approved example's numbers.
    source.globals.find(({ key }) => key === 'EMPATHY')!.score = 3;
    source.globals.find(({ key }) => key === 'EMPATHY')!.missedLines = [57];
    source.lines.find(({ n }) => n === 52)!.code = undefined;
    source.lines.find(({ n }) => n === 50)!.code = 'CR';
    source.lines.find(({ n }) => n === 67)!.code = undefined;
    source.lines.find(({ n }) => n === 69)!.code = 'CR';
    source.lines.find(({ n }) => n === 12)!.code = undefined;
    const before = structuredClone(source);
    vi.resetModules();
    vi.doMock('./roleplay', () => ({ roleplay: source }));
    try {
      const { qcData: derived } = await import('./roleplay.qc');
      expect(derived.flags[0]).toMatchObject({
        supported: 3, range: [51, 68], missed: [57],
        note: 'No complex reflections at lines 51-68; line 57 concern missed.',
      });
      expect(derived.flags[1].supported).toBe(summarize(source).counts.CR);
      expect(source).toEqual(before);
    } finally {
      vi.doUnmock('./roleplay');
      vi.resetModules();
    }
  });
});
