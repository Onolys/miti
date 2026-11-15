// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

it('exports the configured public signup endpoint for the browser UI', async () => {
  vi.stubEnv('PUBLIC_SIGNUP_URL', 'https://script.google.com/macros/s/TEST/exec');
  const { SIGNUP_URL } = await import('./config');
  expect(SIGNUP_URL).toBe('https://script.google.com/macros/s/TEST/exec');
});

it('keeps an unconfigured development build usable', async () => {
  vi.stubEnv('PUBLIC_SIGNUP_URL', undefined);
  const { SIGNUP_URL } = await import('./config');
  expect(SIGNUP_URL).toBe('');
});

it.each([
  [undefined, 'A'], ['A', 'A'], ['B', 'B'], ['b', 'A'], ['invalid', 'A'],
])('selects signup plan %s as %s', async (configured, expected) => {
  vi.stubEnv('PUBLIC_SIGNUP_PLAN', configured);
  const { SIGNUP_PLAN } = await import('./config');
  expect(SIGNUP_PLAN).toBe(expected);
});
