// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  window.history.replaceState({}, '', '/');
  document.body.removeAttribute('data-page');
});

it.each([
  ['', ''],
  ['?other=source', ''],
  ['?src=%20%20Campaign_A-1.example%20%20', 'Campaign_A-1.example'],
  ['?src=%3Cscript%3E%20bad!%2F%F0%9F%98%80', 'scriptbad'],
  [`?src=${'a'.repeat(80)}`, 'a'.repeat(64)],
])('sanitizes the initial query %s', async (query, expected) => {
  window.history.replaceState({}, '', `/${query}`);
  const { getSrc } = await import('./context');
  expect(getSrc()).toBe(expected);
});

it('retains the initial source in memory after the URL changes', async () => {
  window.history.replaceState({}, '', '/?src=first');
  const { getSrc } = await import('./context');
  window.history.replaceState({}, '', '/?src=second');
  expect(getSrc()).toBe('first');
});

it('reads the current page marker and defaults to learner', async () => {
  const { getPage } = await import('./context');
  expect(getPage()).toBe('learner');
  document.body.dataset.page = 'enterprise';
  expect(getPage()).toBe('enterprise');
  document.body.dataset.page = 'learner';
  expect(getPage()).toBe('learner');
});
