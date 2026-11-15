export type Page = 'learner' | 'enterprise';

// Capture attribution once per page load; it never leaves module memory here.
const source = typeof window === 'undefined'
  ? ''
  : (new URLSearchParams(window.location.search).get('src') ?? '')
      .trim()
      .replace(/[^A-Za-z0-9_.-]/g, '')
      .slice(0, 64);

export function getSrc(): string {
  return source;
}

export function getPage(): Page {
  return typeof document !== 'undefined' && document.body?.dataset.page === 'enterprise'
    ? 'enterprise'
    : 'learner';
}
