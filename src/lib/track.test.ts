// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('PUBLIC_GA_ID', undefined);
  Reflect.deleteProperty(window, 'gtag');
  Reflect.deleteProperty(window, 'dataLayer');
  document.body.dataset.page = 'enterprise';
  window.history.replaceState({}, '', '/enterprise?src=campaign');
});

afterEach(() => vi.unstubAllEnvs());

it('installs a queueing gtag stub and tracks without a GA ID', async () => {
  const { track } = await import('./track');
  expect(window.gtag).toBeTypeOf('function');
  expect(() => track('popup_open')).not.toThrow();
  expect(Array.from(window.dataLayer[0] as ArrayLike<unknown>)).toEqual([
    'event', 'popup_open', { page: 'enterprise', src: 'campaign' },
  ]);
});

it('merges canonical page/source with parameters without mutating them', async () => {
  const gtag = vi.fn();
  window.gtag = gtag;
  const existingQueue = ['existing'];
  window.dataLayer = existingQueue;
  const { track } = await import('./track');
  const params = { trigger: 'hero', page: 'wrong', src: 'wrong' };
  track('signup_step1', params);
  expect(gtag).toHaveBeenCalledWith('event', 'signup_step1', {
    trigger: 'hero', page: 'enterprise', src: 'campaign',
  });
  expect(params).toEqual({ trigger: 'hero', page: 'wrong', src: 'wrong' });
  expect(window.dataLayer).toBe(existingQueue);
});

it('uses no persistent storage or cookie writes', async () => {
  const storage = vi.spyOn(Storage.prototype, 'setItem');
  const cookies = vi.spyOn(document, 'cookie', 'set');
  try {
    const { track } = await import('./track');
    track('signup_step2');
    expect(storage).not.toHaveBeenCalled();
    expect(cookies).not.toHaveBeenCalled();
  } finally {
    storage.mockRestore();
    cookies.mockRestore();
  }
});
