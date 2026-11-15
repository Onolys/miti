const initialized = new WeakSet<HTMLElement>();
const ROOT = '[data-highlight-root]';

// Accept individual line numbers and inclusive ranges, for example "12,31,53-66".
// Resolve against rendered rows so a malformed or missing reference cannot select
// another mockup or create an unbounded range of numbers.
function matchesReference(raw: string | undefined, n: number): boolean {
  return (raw ?? '').split(',').some((part) => {
    const match = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(part.trim());
    if (!match) return false;
    const start = Number(match[1]);
    const end = Number(match[2] ?? match[1]);
    return start > 0 && n >= start && n <= end;
  });
}

function initializeRoot(root: HTMLElement): void {
  if (initialized.has(root)) return;
  initialized.add(root);
  const local = <T extends HTMLElement>(selector: string): T[] =>
    Array.from(root.querySelectorAll<T>(selector)).filter((element) => element.closest(ROOT) === root);
  const controls = local<HTMLButtonElement>('button[data-highlight-lines]');
  const rows = local<HTMLElement>('[data-line]');
  const pane = local<HTMLElement>('[data-transcript-pane]')[0];
  const status = local<HTMLElement>('[data-highlight-status]')[0];
  let active: HTMLButtonElement | null = null;

  function apply(control: HTMLButtonElement | null, scroll: boolean): void {
    active = control;
    for (const button of controls) button.setAttribute('aria-pressed', String(button === control));
    const selected: HTMLElement[] = [];
    const missed: HTMLElement[] = [];
    for (const row of rows) {
      const n = Number(row.dataset.line);
      const highlighted = !!control && matchesReference(control.dataset.highlightLines, n);
      const notPickedUp = !!control && matchesReference(control.dataset.highlightMissedLines, n);
      if (highlighted) {
        row.dataset.highlighted = 'true';
        selected.push(row);
      } else delete row.dataset.highlighted;
      if (notPickedUp) {
        row.dataset.missed = 'true';
        missed.push(row);
      } else delete row.dataset.missed;
      const tag = row.querySelector<HTMLElement>('[data-line-tag]');
      if (tag) {
        tag.hidden = !highlighted;
        if (!tag.textContent?.trim()) tag.textContent = control?.dataset.highlightLabel || 'Evidence';
      }
      const missedTag = row.querySelector<HTMLElement>('[data-missed-tag]');
      if (missedTag) missedTag.hidden = !notPickedUp;
    }
    if (status) {
      const pickedText = selected.length
        ? `${selected.length} ${selected.length === 1 ? 'line' : 'lines'} highlighted: ${selected.map((row) => row.dataset.line).join(', ')}.`
        : 'Highlights cleared.';
      const missedText = missed.length
        ? ` ${missed.length} ${missed.length === 1 ? 'line' : 'lines'} not picked up: ${missed.map((row) => row.dataset.line).join(', ')}.`
        : '';
      status.textContent = pickedText + missedText;
    }
    const first = selected[0] ?? missed[0];
    if (scroll && pane && first && pane.contains(first)) {
      const top = Math.max(0, pane.scrollTop + first.getBoundingClientRect().top - pane.getBoundingClientRect().top - pane.clientTop);
      // scrollIntoView can move the containing page. Move only this pane instead.
      if (typeof pane.scrollTo === 'function') pane.scrollTo({ top, behavior: 'auto' });
      else pane.scrollTop = top;
    }
  }

  apply(controls.find((button) => button.getAttribute('aria-pressed') === 'true') ?? null, false);
  root.addEventListener('click', (event) => {
    const target = event.target as Element | null;
    const button = target?.closest<HTMLButtonElement>('button[data-highlight-lines]');
    if (!button || !controls.includes(button) || button.disabled) return;
    apply(active === button ? null : button, true);
  });
}

/** Enhance each independent evidence/QC container; safe to call after navigation. */
export function initHighlights(scope: ParentNode = document): void {
  if ('matches' in scope && typeof scope.matches === 'function' && scope.matches(ROOT)) {
    initializeRoot(scope as HTMLElement);
  }
  for (const root of scope.querySelectorAll<HTMLElement>(ROOT)) initializeRoot(root);
}
