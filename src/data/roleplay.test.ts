import { describe, expect, it } from 'vitest';
import { CODE_LABELS, summarize } from '../lib/miti';
import { roleplay } from './roleplay';

const expectedLinesByCode = {
  GI: [23, 37, 50, 60, 62],
  P: [59],
  PwP: [41],
  Q: [5, 14, 21, 27, 35, 46, 54],
  SR: [7, 16, 29, 48, 56],
  CR: [12, 19, 31, 44, 52, 67],
  AF: [9, 33, 64],
  SC: [3, 39],
  EA: [25, 66],
  CO: [],
};

const lineAt = (n: number) => roleplay.lines.find((line) => line.n === n)!;

describe('fictional exercise role-play', () => {
  it('provides one titled exercise scenario with 68–72 contiguous numbered lines', () => {
    expect(roleplay.id).toBe('exercise-small-start');
    expect(roleplay.title).toMatch(/fictional/i);
    expect(roleplay.changeGoal).toMatch(/exercise|walk/i);
    expect(roleplay.lines.length).toBeGreaterThanOrEqual(68);
    expect(roleplay.lines.length).toBeLessThanOrEqual(72);
    expect(roleplay.lines.map(({ n }) => n)).toEqual(
      Array.from({ length: roleplay.lines.length }, (_, index) => index + 1),
    );
    for (const line of roleplay.lines) {
      expect(['client', 'counselor']).toContain(line.speaker);
      expect(line.text.trim().length).toBeGreaterThan(0);
      if (line.code !== undefined) {
        expect(line.speaker).toBe('counselor');
        expect(Object.keys(CODE_LABELS)).toContain(line.code);
        expect(typeof line.code).toBe('string');
      }
      if (line.speaker === 'client') expect(line).not.toHaveProperty('code');
    }
    expect(roleplay.lines.some((line) => line.speaker === 'counselor' && !line.code)).toBe(true);
  });

  it('locks every coded counselor line and all ten behavior counts', () => {
    const summary = summarize(roleplay);
    expect(summary.linesByCode).toEqual(expectedLinesByCode);
    expect(summary.counts).toEqual({ GI: 5, P: 1, PwP: 1, Q: 7, SR: 5, CR: 6, AF: 3, SC: 2, EA: 2, CO: 0 });
    expect(roleplay.lines.filter(({ code }) => code)).toHaveLength(32);
  });

  it('preserves the missed work worry and the gap without complex reflections', () => {
    expect(lineAt(58)).toMatchObject({ speaker: 'client' });
    expect(lineAt(58).text).toMatch(/worr/i);
    expect(lineAt(58).text).toMatch(/work/i);
    for (const n of [59, 60]) {
      expect(lineAt(n).speaker).toBe('counselor');
      expect(['SR', 'CR']).not.toContain(lineAt(n).code);
    }
    expect(roleplay.lines.filter(({ n, code }) => n >= 53 && n <= 66 && code === 'CR')).toEqual([]);
  });

  it('provides four unique global ratings with rationale and valid evidence', () => {
    expect(roleplay.globals.map(({ key, score }) => [key, score])).toEqual([
      ['CCT', 3], ['SST', 4], ['PARTNERSHIP', 4], ['EMPATHY', 4],
    ]);
    for (const global of roleplay.globals) {
      expect(global.rationale.trim().length).toBeGreaterThan(0);
      expect(global.lines.length).toBeGreaterThan(0);
      for (const n of [...global.lines, ...(global.missedLines ?? [])]) expect(lineAt(n)).toBeDefined();
    }
    expect(roleplay.globals.find(({ key }) => key === 'EMPATHY')).toMatchObject({
      score: 4, lines: [12, 31, 44], missedLines: [58],
    });
  });

  it('offers two strengths and two next steps with valid line and code citations', () => {
    expect(roleplay.feedback.filter(({ kind }) => kind === 'strength')).toHaveLength(2);
    expect(roleplay.feedback.filter(({ kind }) => kind === 'next')).toHaveLength(2);
    for (const item of roleplay.feedback) {
      expect(item.text.trim().length).toBeGreaterThan(0);
      expect(item.cites.length).toBeGreaterThan(0);
      for (const n of item.cites) {
        expect(lineAt(n)).toBeDefined();
        if (item.citesCode) expect(lineAt(n).code).toBe(item.citesCode);
      }
    }
    const strengths = roleplay.feedback.filter(({ kind }) => kind === 'strength');
    expect(strengths.some(({ citesCode, cites }) => citesCode === 'CR' && [12, 31, 44].every((n) => cites.includes(n)))).toBe(true);
    const next = roleplay.feedback.filter(({ kind }) => kind === 'next');
    expect(next.some(({ cites }) => cites.includes(58))).toBe(true);
    const permission = next.find(({ cites }) => cites.includes(59) && cites.includes(41));
    expect(permission?.text).toMatch(/ask permission/i);
    expect(lineAt(59).code).toBe('P');
    expect(lineAt(41).code).toBe('PwP');
  });

  it('computes the same raw summary and reference chips for every consumer', () => {
    const summary = summarize(roleplay);
    expect(summary.metrics).toEqual({
      technical: 3.5, relational: 4, percentCR: 6 / 11,
      reflectionQuestionRatio: 11 / 7, adherent: 7, nonAdherent: 1,
    });
    expect(summary.metrics.percentCR! * 100).toBeCloseTo(54.5, 1);
    expect(summary.metrics.reflectionQuestionRatio).toBeCloseTo(1.57, 2);
    expect(summary.chips).toEqual({
      technical: 'Fair', relational: 'Good', percentCR: 'Good',
      reflectionQuestionRatio: 'Fair', adherent: null, nonAdherent: null,
    });
  });
});
