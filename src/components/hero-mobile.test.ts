import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

it('hides the hero visual on phones only', () => {
  const src = readFileSync(new URL('./Hero.astro', import.meta.url), 'utf8');
  const css = src.slice(src.indexOf('<style>'));
  const mobile = css.slice(css.indexOf('@media (max-width: 47.5rem)'));
  expect(mobile).toMatch(/:global\(\.hero-vis\)\s*{\s*display:\s*none/);
  // The base (desktop) rules must not hide it.
  expect(css.slice(0, css.indexOf('@media'))).not.toMatch(/hero-vis/);
});
