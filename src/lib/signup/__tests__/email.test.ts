import { describe, expect, it } from 'vitest';
import { isValidEmail } from '../body';
import { createAppsScriptHarness } from '../../../../apps-script/__tests__/harness.js';

describe('isValidEmail', () => {
  it.each([
    ['  Person+tag@Example.com \n', true],
    ['1@b.co', true],
    ['=a@b.co', false],
    ['+a@b.co', false],
    ['-a@b.co', false],
    ['_a@b.co', false],
    ['a@localhost', false],
    ['a@b.c', false],
    ['a @b.co', false],
    ['a@@b.co', false],
    ['', false],
    ['a'.repeat(249) + '@b.co', true],
    ['a'.repeat(250) + '@b.co', false],
  ])('validates %j consistently with SP02 (%s)', (email, expected) => {
    expect(isValidEmail(email)).toBe(expected);
    const result = createAppsScriptHarness().context.parseAndValidate(JSON.stringify({
      step: 1, page: 'learner', email,
    }));
    expect(result.ok).toBe(expected);
  });
});
