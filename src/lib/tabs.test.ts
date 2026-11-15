import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { initTabs } from './tabs';

function fixture() {
  const markup = (prefix: string) => `<div data-feature-tabs>
    <div role="tablist" aria-label="Features" aria-orientation="horizontal">
      ${['evidence', 'complete', 'feedback'].map((name, index) => `<button role="tab" id="${prefix}-${name}-tab" aria-controls="${prefix}-${name}-panel" aria-selected="${index === 0}" tabindex="${index === 0 ? '0' : '-1'}">${name}</button>`).join('')}
    </div>
    ${['evidence', 'complete', 'feedback'].map((name) => `<div role="tabpanel" id="${prefix}-${name}-panel" aria-labelledby="${prefix}-${name}-tab">${name} content</div>`).join('')}
  </div>`;
  const dom = new JSDOM(markup('learner') + markup('enterprise'));
  let matches = false;
  const listeners = new Set<() => void>();
  Object.defineProperty(dom.window, 'matchMedia', { value: () => ({
    get matches() { return matches; },
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
  }) });
  const roots = Array.from(dom.window.document.querySelectorAll<HTMLElement>('[data-feature-tabs]'));
  initTabs(dom.window.document);
  const resize = (desktop: boolean) => { matches = desktop; listeners.forEach((listener) => listener()); };
  const key = (root: HTMLElement, value: string) => {
    const active = root.querySelector<HTMLButtonElement>('[role="tab"][aria-selected="true"]')!;
    const event = new dom.window.KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true });
    active.dispatchEvent(event);
    return event;
  };
  return { dom, roots, resize, key };
}

function assertSelected(root: HTMLElement, index: number) {
  const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  const panels = Array.from(root.querySelectorAll<HTMLElement>('[role="tabpanel"]'));
  expect(tabs.map((tab) => tab.getAttribute('aria-selected'))).toEqual(tabs.map((_, i) => String(i === index)));
  expect(tabs.map((tab) => tab.tabIndex)).toEqual(tabs.map((_, i) => i === index ? 0 : -1));
  expect(panels.map((panel) => panel.hidden)).toEqual(panels.map((_, i) => i !== index));
}

describe('feature tabs', () => {
  it('enhances each instance with Evidence selected and exactly one visible panel', () => {
    const { roots } = fixture();
    for (const root of roots) {
      expect(root.dataset.enhanced).toBe('true');
      assertSelected(root, 0);
    }
  });

  it.each([
    ['ArrowDown', 2], ['ArrowRight', 2], ['ArrowUp', 0], ['ArrowLeft', 0], ['Home', 0], ['End', 2],
  ] as const)('handles %s with focus, automatic activation, and roving tabindex', (value, expected) => {
    const { dom, roots, key } = fixture();
    roots[0].querySelectorAll<HTMLButtonElement>('[role="tab"]')[1].click();
    expect(key(roots[0], value).defaultPrevented).toBe(true);
    assertSelected(roots[0], expected);
    expect(dom.window.document.activeElement).toBe(roots[0].querySelectorAll('[role="tab"]')[expected]);
  });

  it('wraps in both directions and leaves Tab available for normal navigation', () => {
    const { roots, key } = fixture();
    key(roots[0], 'ArrowLeft');
    assertSelected(roots[0], 2);
    key(roots[0], 'ArrowDown');
    assertSelected(roots[0], 0);
    expect(key(roots[0], 'Tab').defaultPrevented).toBe(false);
    assertSelected(roots[0], 0);
  });

  it('changes panels by click without affecting a second instance', () => {
    const { roots } = fixture();
    roots[0].querySelectorAll<HTMLButtonElement>('[role="tab"]')[2].click();
    assertSelected(roots[0], 2);
    assertSelected(roots[1], 0);
  });

  it('updates orientation when the desktop media query changes', () => {
    const { roots, resize } = fixture();
    expect(roots[0].querySelector('[role="tablist"]')?.getAttribute('aria-orientation')).toBe('horizontal');
    resize(true);
    expect(roots[0].querySelector('[role="tablist"]')?.getAttribute('aria-orientation')).toBe('vertical');
    resize(false);
    expect(roots[0].querySelector('[role="tablist"]')?.getAttribute('aria-orientation')).toBe('horizontal');
  });

  it('initializes a single root idempotently', () => {
    const { roots, key } = fixture();
    initTabs(roots[0]);
    initTabs(roots[0]);
    key(roots[0], 'ArrowRight');
    assertSelected(roots[0], 1);
  });
});
