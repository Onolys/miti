import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { roleplay } from '../../data/roleplay';
import { CODE_LABELS, summarize } from '../../lib/miti';
import EvidenceMockup from './EvidenceMockup.astro';
import TranscriptPane from '../TranscriptPane.astro';

async function render(props = {}) {
  const container = await AstroContainer.create();
  return new JSDOM(await container.renderToString(EvidenceMockup, { props })).window.document;
}

describe('Evidence mockup', () => {
  it('renders the complete numbered and speaker-labeled transcript inside a focusable region', async () => {
    const doc = await render();
    const pane = doc.querySelector('[data-transcript-pane]')!;
    expect(pane.getAttribute('role')).toBe('region');
    expect(pane.getAttribute('tabindex')).toBe('0');
    expect(pane.getAttribute('aria-label')).toMatch(/transcript/i);
    const rows = Array.from(pane.querySelectorAll<HTMLElement>('[data-line]'));
    expect(rows).toHaveLength(70);
    roleplay.lines.forEach((line, index) => {
      expect(rows[index].dataset.line).toBe(String(line.n));
      expect(rows[index].textContent).toContain(line.text);
      expect(rows[index].textContent).toContain(line.speaker === 'counselor' ? 'Counselor' : 'Client');
    });
  });

  it('derives four global rows and all nonzero code counts and citations from the data', async () => {
    const doc = await render();
    const summary = summarize(roleplay);
    expect(doc.querySelectorAll('[data-global]')).toHaveLength(4);
    for (const rating of roleplay.globals) {
      const row = doc.querySelector(`[data-global="${rating.key}"]`)!;
      expect(row.textContent).toContain(String(rating.score));
      expect(row.textContent).toContain(rating.rationale);
      expect(row.querySelector('button')?.getAttribute('data-highlight-lines')).toBe(rating.lines.join(','));
    }
    expect(doc.querySelectorAll('[data-behavior-code]')).toHaveLength(9);
    for (const [code, count] of Object.entries(summary.counts)) {
      const row = doc.querySelector(`[data-behavior-code="${code}"]`);
      if (count === 0) expect(row).toBeNull();
      else {
        expect(row?.textContent).toContain(`${CODE_LABELS[code as keyof typeof CODE_LABELS]} ${count}`);
        expect(row?.textContent).toContain(`lines ${summary.linesByCode[code as keyof typeof CODE_LABELS].join(', ')}`);
      }
    }
  });

  it('preselects only complex reflections and renders text tags and a polite live region before JS', async () => {
    const doc = await render();
    const selected = doc.querySelectorAll('[data-highlight-lines][aria-pressed="true"]');
    expect(selected).toHaveLength(1);
    expect(selected[0].getAttribute('data-highlight-lines')).toBe('12,19,31,44,52,67');
    const highlighted = Array.from(doc.querySelectorAll<HTMLElement>('[data-line][data-highlighted="true"]'));
    expect(highlighted.map(({ dataset }) => Number(dataset.line))).toEqual([12, 19, 31, 44, 52, 67]);
    expect(highlighted.every((row) => row.querySelector<HTMLElement>('[data-line-tag]')?.hidden === false)).toBe(true);
    expect(highlighted[0].querySelector('[data-line-tag]')?.textContent).toBe('Complex reflections');
    expect(doc.querySelector('[data-highlight-status]')?.getAttribute('aria-live')).toBe('polite');
    expect(doc.querySelector('[data-highlight-status]')?.textContent).toContain('6 lines highlighted: 12, 19, 31, 44, 52, 67');
    const empathy = doc.querySelector('[data-global="EMPATHY"]')!;
    expect(empathy.querySelector('button')?.getAttribute('data-highlight-missed-lines')).toBe('58');
    expect(empathy.textContent).toContain('58 not picked up');
  });

  it('computes the default summary from an incoming roleplay prop', async () => {
    const alternate = structuredClone(roleplay);
    alternate.lines[11].code = 'Q';
    alternate.lines[11].text = 'What does making time for yourself mean to you?';
    alternate.globals[3].score = 2;
    const doc = await render({ roleplay: alternate });
    expect(doc.querySelector('[data-behavior-code="CR"]')?.textContent).toContain('Complex reflections 5');
    expect(doc.querySelector('[data-behavior-code="Q"]')?.textContent).toContain('Questions 8');
    expect(doc.querySelector('[data-global="EMPATHY"] button')?.textContent).toContain('Empathy 2');
    expect(doc.querySelector('[data-line="12"]')?.textContent).toContain(alternate.lines[11].text);
    expect(doc.querySelector('[data-line="12"]')?.hasAttribute('data-highlighted')).toBe(false);
  });

  it('lets another mockup reuse TranscriptPane with its own label and missed lines', async () => {
    const container = await AstroContainer.create();
    const doc = new JSDOM(await container.renderToString(TranscriptPane, {
      props: { label: 'QC transcript', highlightedLines: [12], missedLines: [58] },
    })).window.document;
    expect(doc.querySelector('[data-transcript-pane]')?.getAttribute('aria-label')).toBe('QC transcript');
    expect(doc.querySelector<HTMLElement>('[data-line="58"] [data-missed-tag]')?.hidden).toBe(false);
    expect(doc.querySelector('[data-line="58"]')?.textContent).toContain('not picked up');
  });
});
