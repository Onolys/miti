import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import FeatureTabs from './FeatureTabs.astro';

async function render(idPrefix?: string) {
  const container = await AstroContainer.create();
  return container.renderToString(FeatureTabs, {
    props: idPrefix ? { idPrefix } : {},
    slots: {
      evidence: '<p>Evidence example</p>',
      complete: '<p>Complete example</p>',
      feedback: '<p>Feedback example</p>',
    },
  });
}

describe('FeatureTabs markup', () => {
  it('keeps all three slotted panels visible before enhancement', async () => {
    const doc = new JSDOM(await render('learner')).window.document;
    const root = doc.querySelector('[data-feature-tabs]')!;
    expect(root.hasAttribute('data-enhanced')).toBe(false);
    const tabs = Array.from(root.querySelectorAll('[role="tab"]'));
    const panels = Array.from(root.querySelectorAll<HTMLElement>('[role="tabpanel"]'));
    expect(tabs.map((tab) => tab.textContent)).toEqual(['Evidence', 'Complete', 'Feedback']);
    expect(panels).toHaveLength(3);
    expect(panels.every((panel) => !panel.hidden)).toBe(true);
    expect(panels.map((panel) => panel.textContent)).toEqual(['Evidence example', 'Complete example', 'Feedback example']);
    expect(tabs.map((tab) => tab.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false']);
    expect(tabs.map((tab) => tab.getAttribute('tabindex'))).toEqual(['0', '-1', '-1']);
    tabs.forEach((tab, index) => {
      expect(tab.getAttribute('aria-controls')).toBe(panels[index].id);
      expect(panels[index].getAttribute('aria-labelledby')).toBe(tab.id);
    });
    expect(root.querySelector('[role="tablist"]')?.getAttribute('aria-label')).toBe('Product features');
  });

  it('uses the provided idPrefix to keep explicit instances separate', async () => {
    const doc = new JSDOM(await render('learner') + await render('enterprise')).window.document;
    const ids = Array.from(doc.querySelectorAll('[id]')).map((element) => element.id);
    expect(ids).toHaveLength(12);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.filter((id) => id.startsWith('learner-'))).toHaveLength(6);
    expect(ids.filter((id) => id.startsWith('enterprise-'))).toHaveLength(6);
  });

  it('also creates unique IDs for multiple instances with default props', async () => {
    const doc = new JSDOM(await render() + await render()).window.document;
    const ids = Array.from(doc.querySelectorAll('[id]')).map((element) => element.id);
    expect(ids).toHaveLength(12);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
