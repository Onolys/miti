import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { roleplay } from '../../data/roleplay';
import { CODE_LABELS, summarize } from '../../lib/miti';
import CompleteMockup from './CompleteMockup.astro';
import FeedbackMockup from './FeedbackMockup.astro';

async function render(component: typeof CompleteMockup | typeof FeedbackMockup, props = {}) {
  const container = await AstroContainer.create();
  return new JSDOM(await container.renderToString(component, { props })).window.document;
}

describe('Complete mockup', () => {
  it('renders all four globals and all ten behavior counts, including zero confrontations', async () => {
    const doc = await render(CompleteMockup);
    expect(doc.querySelectorAll('[data-global]')).toHaveLength(4);
    for (const global of roleplay.globals) {
      const row = doc.querySelector(`[data-global="${global.key}"]`)!;
      expect(row.querySelector('[data-value]')?.textContent).toBe(`${global.score.toFixed(1)} / 5`);
      expect(row.querySelector('[data-level]')).toBeNull();
    }
    expect(doc.querySelectorAll('[data-behavior-code]')).toHaveLength(10);
    for (const [code, count] of Object.entries(summarize(roleplay).counts)) {
      const row = doc.querySelector(`[data-behavior-code="${code}"]`)!;
      expect(row.textContent).toContain(CODE_LABELS[code as keyof typeof CODE_LABELS]);
      expect(row.querySelector('[data-value]')?.textContent).toBe(String(count));
      expect(row.querySelector('[data-level]')).toBeNull();
    }
  });

  it('formats all six computed metrics and gives exactly the four reference metrics text chips', async () => {
    const doc = await render(CompleteMockup);
    const expected = {
      technical: ['3.5', 'Fair'], relational: ['4.0', 'Good'],
      percentCR: ['55%', 'Good'], reflectionQuestionRatio: ['1.57', 'Fair'],
      adherent: ['7', null], nonAdherent: ['1', null],
    };
    expect(doc.querySelectorAll('[data-metric]')).toHaveLength(6);
    expect(doc.querySelectorAll('[data-level]')).toHaveLength(4);
    for (const [key, [value, chip]] of Object.entries(expected)) {
      const row = doc.querySelector(`[data-metric="${key}"]`)!;
      expect(row.querySelector('[data-value]')?.textContent).toBe(value);
      expect(row.querySelector('[data-level]')?.textContent ?? null).toBe(chip);
    }
    expect(doc.body.textContent).toContain('Reference levels from MITI 4.2.1 (fair / good). Not pass marks.');
  });

  it('derives a fresh summary from an incoming roleplay and safely renders undefined ratios', async () => {
    const alternate = structuredClone(roleplay);
    alternate.lines = alternate.lines.map(({ code, ...line }) => line);
    alternate.globals.forEach((global) => { global.score = 2; });
    const doc = await render(CompleteMockup, { roleplay: alternate });
    expect(doc.querySelector('[data-metric="technical"] [data-value]')?.textContent).toBe('2.0');
    expect(doc.querySelector('[data-metric="technical"] [data-level]')?.textContent).toBe('Below fair');
    expect(doc.querySelector('[data-behavior-code="CR"] [data-value]')?.textContent).toBe('0');
    for (const key of ['percentCR', 'reflectionQuestionRatio']) {
      const row = doc.querySelector(`[data-metric="${key}"]`)!;
      expect(row.querySelector('[data-value]')?.textContent).toBe('—');
      expect(row.querySelector('[data-value]')?.getAttribute('aria-label')).toBe('Not available');
      expect(row.querySelector('[data-level]')).toBeNull();
    }
    expect(doc.body.textContent).not.toMatch(/NaN|Infinity/);
  });

  it('accepts an explicitly supplied computed summary', async () => {
    const summary = summarize(roleplay);
    summary.counts.GI = 8;
    summary.metrics.adherent = 10;
    const doc = await render(CompleteMockup, { summary });
    expect(doc.querySelector('[data-behavior-code="GI"] [data-value]')?.textContent).toBe('8');
    expect(doc.querySelector('[data-metric="adherent"] [data-value]')?.textContent).toBe('10');
  });
});

describe('Feedback mockup', () => {
  it('renders two strengths and two next-time items with every line citation as readable text', async () => {
    const doc = await render(FeedbackMockup);
    expect(doc.querySelectorAll('[data-feedback-kind="strength"]')).toHaveLength(2);
    expect(doc.querySelectorAll('[data-feedback-kind="next"]')).toHaveLength(2);
    roleplay.feedback.forEach((item) => {
      const row = Array.from(doc.querySelectorAll('[data-feedback-kind]')).find((element) => element.textContent?.includes(item.text))!;
      expect(row).toBeDefined();
      expect(row.querySelector('[data-citations]')?.textContent).toBe(`Lines ${item.cites.join(', ')}`);
    });
    expect(doc.body.textContent).toContain('Strengths');
    expect(doc.body.textContent).toContain('Next time');
  });

  it('uses incoming feedback and derives its code counts from the incoming roleplay', async () => {
    const alternate = structuredClone(roleplay);
    alternate.lines[11].code = 'Q';
    alternate.feedback[0].text = 'A different learning observation.';
    alternate.feedback[0].cites = [19, 31];
    const doc = await render(FeedbackMockup, { roleplay: alternate });
    expect(doc.body.textContent).toContain('A different learning observation.');
    expect(doc.body.textContent).not.toContain(roleplay.feedback[0].text);
    expect(doc.querySelector('[data-feedback-code="CR"]')?.textContent).toBe('Complex reflections (5)');
    expect(doc.querySelector('[data-citations]')?.textContent).toBe('Lines 19, 31');
  });
});
