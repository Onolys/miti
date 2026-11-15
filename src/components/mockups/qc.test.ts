import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { qcData } from '../../data/roleplay.qc';
import { roleplay } from '../../data/roleplay';
import { initHighlights } from '../../lib/highlight';
import { summarize } from '../../lib/miti';
import QcMockup from './QcMockup.astro';

async function render(props = {}) {
  const container = await AstroContainer.create();
  return new JSDOM(await container.renderToString(QcMockup, { props })).window.document;
}

describe('coder quality-check mockup', () => {
  it('renders five score rows with explicit supported and flagged status text', async () => {
    const doc = await render();
    expect(doc.body.textContent).toContain('3 supported, 2 flagged for review');
    expect(doc.body.textContent).toContain('Flags are for human review. The coder decides.');
    expect(doc.querySelectorAll('[data-qc-row]')).toHaveLength(5);
    expect(Array.from(doc.querySelectorAll('[data-qc-status]')).map((chip) => chip.textContent)).toEqual([
      'Supported', 'Supported', 'Supported', 'Not supported', 'Not supported',
    ]);
    for (const global of roleplay.globals) {
      const row = doc.querySelector(`[data-qc-row="${global.key}"]`)!;
      expect(row.textContent).toContain(`Coder ${qcData.coderGlobals[global.key]}`);
    }
    const empathy = doc.querySelector('[data-qc-row="EMPATHY"]')!;
    expect(empathy.textContent).toContain('Session supports 4');
    expect(empathy.textContent).toContain('Empathy 5: not supported. No complex reflections at lines 53-66; line 58 concern missed.');
    const cr = doc.querySelector('[data-qc-row="CR"]')!;
    expect(cr.textContent).toContain('Coder 7');
    expect(cr.textContent).toContain('Session supports 6');
    expect(cr.textContent).toContain(qcData.flags[1].note);
    const summary = summarize(roleplay);
    expect(cr.textContent).toContain(`Session complex reflections: ${summary.counts.CR} (lines ${summary.linesByCode.CR.join(', ')}).`);
  });

  it('preselects the Empathy gap and missed concern using the shared highlight protocol', async () => {
    const doc = await render();
    const buttons = Array.from(doc.querySelectorAll('button[data-highlight-lines]'));
    expect(buttons).toHaveLength(2);
    expect(buttons[0].getAttribute('data-highlight-lines')).toBe('53-66');
    expect(buttons[0].getAttribute('data-highlight-missed-lines')).toBe('58');
    expect(buttons[0].getAttribute('aria-pressed')).toBe('true');
    expect(buttons[1].getAttribute('data-highlight-lines')).toBe('59');
    expect(buttons[1].getAttribute('aria-pressed')).toBe('false');
    expect(Array.from(doc.querySelectorAll<HTMLElement>('[data-line][data-highlighted="true"]')).map(({ dataset }) => Number(dataset.line))).toEqual(qcData.flags[0].cites);
    expect(doc.querySelector('[data-line="58"]')?.getAttribute('data-missed')).toBe('true');
    expect(doc.querySelector<HTMLElement>('[data-line="58"] [data-missed-tag]')?.hidden).toBe(false);
    expect(doc.querySelector('[data-highlight-status]')?.getAttribute('aria-live')).toBe('polite');
    expect(doc.querySelector('[data-highlight-status]')?.textContent).toContain('1 line not picked up: 58.');
  });

  it('renders all numbered source lines in the shared scrollable transcript region', async () => {
    const doc = await render();
    const pane = doc.querySelector('[data-transcript-pane]')!;
    expect(pane.getAttribute('role')).toBe('region');
    expect(pane.getAttribute('tabindex')).toBe('0');
    const lines = Array.from(pane.querySelectorAll<HTMLElement>('[data-line]'));
    expect(lines).toHaveLength(70);
    roleplay.lines.forEach((line, index) => {
      expect(lines[index].dataset.line).toBe(String(line.n));
      expect(lines[index].textContent).toContain(line.text);
    });
  });

  it('lets the shared enhancer select the CR line and clear it on a second click', async () => {
    const doc = await render();
    const pane = doc.querySelector<HTMLElement>('[data-transcript-pane]')!;
    pane.scrollTo = () => {};
    initHighlights(doc);
    const button = doc.querySelector<HTMLButtonElement>('[data-qc-row="CR"] button')!;
    button.click();
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(Array.from(doc.querySelectorAll<HTMLElement>('[data-line][data-highlighted="true"]')).map(({ dataset }) => Number(dataset.line))).toEqual([59]);
    expect(doc.querySelector('[data-line][data-missed="true"]')).toBeNull();
    button.click();
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(doc.querySelector('[data-line][data-highlighted="true"]')).toBeNull();
    expect(doc.querySelector('[data-highlight-status]')?.textContent).toBe('Highlights cleared.');
  });

  it('renders incoming QC data and computes transcript context from the incoming role-play', async () => {
    const changed = structuredClone(qcData);
    changed.coderGlobals.EMPATHY = 2;
    changed.flags[0] = { ...changed.flags[0], coder: 2, supported: 3, note: 'Alternate evidence.', range: [54, 57], cites: [54, 55, 56, 57], missed: [57] };
    changed.coderCRCount = 8;
    changed.flags[1] = { ...changed.flags[1], coder: 8, supported: 5 };
    const alternate = structuredClone(roleplay);
    alternate.lines[11].code = undefined;
    alternate.lines[0].text = 'Alternate transcript opening.';
    const doc = await render({ qcData: changed, roleplay: alternate });
    expect(doc.querySelector('[data-qc-row="EMPATHY"]')?.textContent).toContain('Empathy 2: not supported. Alternate evidence.');
    expect(doc.querySelector('[data-qc-row="EMPATHY"]')?.textContent).toContain('Session supports 3');
    expect(doc.querySelector('[data-qc-row="EMPATHY"] button')?.getAttribute('data-highlight-lines')).toBe('54-57');
    expect(doc.querySelector('[data-qc-row="CR"]')?.textContent).toContain('Coder 8');
    expect(doc.querySelector('[data-qc-row="CR"]')?.textContent).toContain('Session complex reflections: 5 (lines 19, 31, 44, 52, 67).');
    expect(doc.querySelector('[data-line="1"]')?.textContent).toContain('Alternate transcript opening.');
  });
});
