import { getPage, getSrc } from './context';

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

function ensureGtag(): void {
  window.dataLayer ??= [];
  window.gtag ??= function () {
    // Use the standard gtag arguments queue, also consumed by gtag.js if enabled.
    window.dataLayer.push(arguments);
  };
}

if (typeof window !== 'undefined') {
  ensureGtag();
}

export function track(event: string, params: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined') return;
  ensureGtag();
  window.gtag('event', event, { ...params, page: getPage(), src: getSrc() });
}
