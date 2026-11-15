import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import Learner from '../pages/index.astro';

async function render() {
  const container = await AstroContainer.create();
  return new JSDOM(await container.renderToString(Learner)).window.document;
}

describe('learner landing page', () => {
  it('assembles sections in order with one hero headline and the footer after the team', async () => {
    const doc = await render();
    const main = doc.querySelector('main')!;
    expect(Array.from(main.querySelectorAll(':scope > section')).map((section) => section.id)).toEqual(['hero', 'features', 'evaluates', 'compare', 'team']);
    expect(doc.querySelectorAll('h1')).toHaveLength(1);
    expect(doc.querySelector('h1')?.textContent).toBe('Get your MI session evaluated. See the evidence for every score.');
    expect(main.querySelector('#hero')?.textContent).toContain('A full MITI 4.2.1 evaluation of your transcript: global ratings, behavior counts, summary scores and feedback, each linked to the exact lines.');
    expect(main.querySelector('#hero')?.textContent).not.toMatch(/not official MITI coding/i);
    expect(main.querySelector('.hero-limits')).toBeNull();
    expect(main.querySelectorAll('#hero [data-hero-signup]')).toHaveLength(1);
    expect(main.querySelectorAll('[data-hero-signup]')).toHaveLength(1);
    expect(main.nextElementSibling?.tagName).toBe('FOOTER');
    expect(main.lastElementChild?.id).toBe('team');
  });

  it('provides every section CTA, all three feature panels, and the exact turnaround line', async () => {
    const doc = await render();
    for (const id of ['features', 'evaluates', 'compare']) {
      expect(doc.querySelectorAll(`#${id} [data-open-popup]`)).toHaveLength(1);
      expect(doc.querySelector(`#${id} .cta-row > [data-open-popup]`)?.getAttribute('data-trigger')).toBe(`section:${id}`);
    }
    expect(doc.querySelector('#hero [data-open-popup]')).toBeNull();
    expect(doc.querySelector('#features h2')?.textContent).toBe('Features');
    expect(doc.querySelector('#features h2')?.classList.contains('visually-hidden')).toBe(true);
    expect(doc.querySelector('#features')?.textContent).toContain('Results in minutes, not the 1 to 2 weeks human coding takes.');
    const panels = Array.from(doc.querySelectorAll('#features [role="tabpanel"]'));
    expect(panels.map((panel) => panel.id)).toEqual(['learner-features-panel-0', 'learner-features-panel-1', 'learner-features-panel-2']);
    expect(Array.from(doc.querySelectorAll('#features [role="tab"] .h')).map((h) => h.textContent)).toEqual(['See your full MITI score', 'Know why each score was given', 'Learn what to improve next']);
    expect(doc.querySelector('#evaluates')?.querySelectorAll('article')).toHaveLength(6);
    expect(doc.querySelector('#compare h2')?.textContent).toBe('Where Onolys fits');
    expect(doc.querySelector('#compare .compare-intro')?.textContent).toBe('Practice simulators help you build skills; Onolys evaluates the sessions you run.');
    expect(doc.querySelector('#compare table')).not.toBeNull();
  });

  it('keeps learner copy within the approved limits and links', async () => {
    const doc = await render();
    const main = doc.querySelector('main')!;
    expect(doc.querySelector('#compare')?.textContent).toContain('$40–$80 per session');
    expect(main.querySelector('a[href="/enterprise"]')).toBeNull();
    const officialText = Array.from(doc.querySelectorAll('p')).filter((p) => /official/i.test(p.textContent ?? '')).map((p) => p.textContent);
    expect(officialText).toEqual([]);
  });
});
