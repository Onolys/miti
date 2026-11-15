// @vitest-environment jsdom
import { beforeAll, beforeEach, expect, it, vi } from 'vitest';

beforeAll(async () => {
  await import('./popup');
});

beforeEach(() => {
  document.body.innerHTML = '<button type="button" data-open-popup data-trigger="section:features"><span>Join</span></button><button id="unrelated">Other</button>';
});

it('delegates nested CTA clicks to the popup event with an empty email', () => {
  const listener = vi.fn();
  document.addEventListener('miti:open-popup', listener);
  try {
    document.querySelector<HTMLSpanElement>('span')!.click();
    expect(listener).toHaveBeenCalledTimes(1);
    expect((listener.mock.calls[0][0] as CustomEvent).detail).toEqual({
      trigger: 'section:features', email: '',
    });
    document.querySelector<HTMLButtonElement>('#unrelated')!.click();
    expect(listener).toHaveBeenCalledTimes(1);
  } finally {
    document.removeEventListener('miti:open-popup', listener);
  }
});

it('is harmless without a dialog listener and does not track popup_open', () => {
  const gtag = vi.fn();
  window.gtag = gtag;
  const errors = vi.fn();
  window.addEventListener('error', errors);
  try {
    expect(() => document.querySelector<HTMLButtonElement>('[data-open-popup]')!.click()).not.toThrow();
    expect(errors).not.toHaveBeenCalled();
    expect(gtag).not.toHaveBeenCalled();
  } finally {
    window.removeEventListener('error', errors);
  }
});
