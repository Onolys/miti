import { JSDOM } from 'jsdom';
import { describe, expect, it, vi } from 'vitest';
import { initHighlights } from './highlight';

function fixture() {
  const markup = `<section data-highlight-root>
    <button data-highlight-lines="12,19" data-highlight-label="Complex reflections" aria-pressed="true">Complex reflections</button>
    <button data-highlight-lines="12" data-highlight-missed-lines="58" data-highlight-label="Empathy" aria-pressed="false">Empathy</button>
    <button data-highlight-lines="53-54" data-highlight-label="Review range" aria-pressed="false">Review range</button>
    <div data-transcript-pane tabindex="0" role="region" aria-label="Transcript">
      ${[12, 19, 53, 54, 58].map((n) => `<p data-line="${n}"><span>Line ${n}</span><span data-line-tag hidden>Evidence code</span><span data-missed-tag hidden>not picked up</span></p>`).join('')}
    </div>
    <p data-highlight-status aria-live="polite"></p>
  </section>`;
  const dom = new JSDOM(markup + markup);
  const roots = Array.from(dom.window.document.querySelectorAll<HTMLElement>('[data-highlight-root]'));
  const scrolls = roots.map((root) => {
    const pane = root.querySelector<HTMLElement>('[data-transcript-pane]')!;
    pane.scrollTop = 10;
    const scrollTo = vi.fn();
    Object.defineProperty(pane, 'scrollTo', { value: scrollTo });
    pane.getBoundingClientRect = () => ({ top: 100 }) as DOMRect;
    for (const row of root.querySelectorAll<HTMLElement>('[data-line]')) {
      row.getBoundingClientRect = () => ({ top: 100 + Number(row.dataset.line) * 20 }) as DOMRect;
    }
    return scrollTo;
  });
  const pageScroll = vi.spyOn(dom.window, 'scrollTo');
  initHighlights(dom.window.document);
  return { dom, roots, scrolls, pageScroll };
}

const highlighted = (root: HTMLElement) => Array.from(root.querySelectorAll<HTMLElement>('[data-line][data-highlighted="true"]')).map((row) => Number(row.dataset.line));
const buttonAt = (root: HTMLElement, index: number) => root.querySelectorAll<HTMLButtonElement>('button')[index];

describe('transcript highlighting', () => {
  it('initializes the preselected row, reveals text tags, and announces its evidence without scrolling', () => {
    const { roots, scrolls } = fixture();
    expect(highlighted(roots[0])).toEqual([12, 19]);
    expect(roots[0].querySelector('[data-highlight-status]')?.textContent).toBe('2 lines highlighted: 12, 19.');
    expect(roots[0].querySelector<HTMLElement>('[data-line="12"] [data-line-tag]')?.hidden).toBe(false);
    expect(roots[0].querySelector<HTMLElement>('[data-line="58"] [data-line-tag]')?.hidden).toBe(true);
    expect(scrolls[0]).not.toHaveBeenCalled();
  });

  it('toggles the active button off, clears tags, and announces the cleared state', () => {
    const { roots, scrolls } = fixture();
    buttonAt(roots[0], 0).click();
    expect(highlighted(roots[0])).toEqual([]);
    expect(buttonAt(roots[0], 0).getAttribute('aria-pressed')).toBe('false');
    expect(roots[0].querySelector<HTMLElement>('[data-line="12"] [data-line-tag]')?.hidden).toBe(true);
    expect(roots[0].querySelector('[data-highlight-status]')?.textContent).toBe('Highlights cleared.');
    expect(scrolls[0]).not.toHaveBeenCalled();
  });

  it('keeps one active button and marks missed evidence with accessible text', () => {
    const { roots } = fixture();
    buttonAt(roots[0], 1).click();
    expect(highlighted(roots[0])).toEqual([12]);
    expect(roots[0].querySelectorAll('[aria-pressed="true"]')).toHaveLength(1);
    expect(buttonAt(roots[0], 0).getAttribute('aria-pressed')).toBe('false');
    const missed = roots[0].querySelector<HTMLElement>('[data-line="58"]')!;
    expect(missed.dataset.missed).toBe('true');
    expect(missed.querySelector<HTMLElement>('[data-missed-tag]')?.hidden).toBe(false);
    expect(roots[0].querySelector('[data-highlight-status]')?.textContent).toBe('1 line highlighted: 12. 1 line not picked up: 58.');
    buttonAt(roots[0], 2).click();
    expect(missed.querySelector<HTMLElement>('[data-missed-tag]')?.hidden).toBe(true);
    expect(missed.hasAttribute('data-missed')).toBe(false);
  });

  it('scrolls only the transcript pane to the first selected line', () => {
    const { roots, scrolls, pageScroll } = fixture();
    buttonAt(roots[0], 1).click();
    expect(scrolls[0]).toHaveBeenCalledExactlyOnceWith({ top: 250, behavior: 'auto' });
    expect(pageScroll).not.toHaveBeenCalled();
    expect(scrolls[1]).not.toHaveBeenCalled();
  });

  it('supports inclusive ranges and scopes identical line numbers to each instance', () => {
    const { roots } = fixture();
    buttonAt(roots[0], 2).click();
    expect(highlighted(roots[0])).toEqual([53, 54]);
    expect(highlighted(roots[1])).toEqual([12, 19]);
    expect(buttonAt(roots[1], 0).getAttribute('aria-pressed')).toBe('true');
  });

  it('can initialize a single root repeatedly without adding duplicate click handlers', () => {
    const { roots } = fixture();
    initHighlights(roots[0]);
    initHighlights(roots[0]);
    buttonAt(roots[0], 0).click();
    expect(highlighted(roots[0])).toEqual([]);
  });
});
