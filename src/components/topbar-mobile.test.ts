import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import TopBar from './TopBar.astro';

async function render(page: 'learner' | 'enterprise') {
  const container = await AstroContainer.create();
  return new JSDOM(await container.renderToString(TopBar, { props: { page } })).window.document;
}

describe('TopBar mobile nav', () => {
  it('renders an accessible hamburger button before the brand', async () => {
    const doc = await render('learner');
    const button = doc.querySelector('button.menu-toggle') as HTMLButtonElement;
    expect(button).not.toBeNull();
    expect(button.getAttribute('aria-label')).toBeTruthy();
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(button.getAttribute('aria-controls')).toBe('mobile-nav');
    expect(button.compareDocumentPosition(doc.querySelector('.brand')!) & 4).toBeTruthy();
  });

  it('renders a closed side panel with only the section links', async () => {
    const doc = await render('learner');
    const panel = doc.getElementById('mobile-nav')!;
    expect(panel).not.toBeNull();
    expect(panel.getAttribute('aria-hidden')).toBe('true');
    expect(panel.hasAttribute('inert')).toBe(true);
    expect(panel.getAttribute('tabindex')).toBe('-1');
    const links = [...panel.querySelectorAll('a')].map((a) => [a.textContent?.trim(), a.getAttribute('href')]);
    expect(links).toEqual([
      ['Features', '#features'],
      ['Evaluation', '#evaluates'],
      ['Comparison', '#compare'],
      ['Team', '#team'],
    ]);
    expect(doc.querySelector('.menu-backdrop')).not.toBeNull();
  });

  it('keeps the secondary link in the top bar, just before the CTA, and out of the panel', async () => {
    for (const [page, label, href] of [['learner', 'Enterprise', '/enterprise'], ['enterprise', 'Individuals', '/']] as const) {
      const doc = await render(page);
      const secondary = doc.querySelector('header .secondary')!;
      expect(secondary.textContent?.trim()).toBe(label);
      expect(secondary.getAttribute('href')).toBe(href);
      expect(secondary.nextElementSibling?.classList.contains('cta')).toBe(true);
      expect(doc.querySelector('#mobile-nav .panel-secondary')).toBeNull();
      expect([...doc.querySelectorAll('#mobile-nav a')].map((a) => a.textContent?.trim())).not.toContain(label);
    }
  });
});
