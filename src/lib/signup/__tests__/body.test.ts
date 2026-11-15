// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  window.history.replaceState({}, '', '/');
  document.body.dataset.page = 'learner';
});

describe('buildBody', () => {
  it.each([1, 2] as const)('serializes step %s, email, page, attribution and an empty honeypot', async (step) => {
    window.history.replaceState({}, '', '/enterprise?src=partner_launch');
    document.body.dataset.page = 'enterprise';
    const { buildBody } = await import('../body');
    const body = buildBody(step, { email: '  Person@Example.com \n' });
    expect(typeof body).toBe('string');
    expect(JSON.parse(body)).toEqual({
      step, email: 'Person@Example.com', page: 'enterprise', src: 'partner_launch', honeypot: '',
    });
  });

  it('uses the learner default and preserves a filled honeypot for server filtering', async () => {
    const { buildBody } = await import('../body');
    expect(JSON.parse(buildBody(1, { email: 'a@b.co', honeypot: ' bot ' }))).toEqual({
      step: 1, email: 'a@b.co', page: 'learner', src: '', honeypot: ' bot ',
    });
  });

  it('omits blank answers and unknown keys without allowing fields to overwrite request metadata', async () => {
    const { buildBody } = await import('../body');
    const fields = {
      role: 'Researcher', how_often: '', feedback_today: ' \n\t ', pay: '$5 to 10',
      anything_else: '  Keep my answer as entered.  ', unexpected: 'ignored',
      email: 'attacker@b.co', step: '2', page: 'enterprise', src: 'override', honeypot: 'override',
      constructor: 'ignored',
    };
    const data = { email: 'a@b.co', fields };
    expect(JSON.parse(buildBody(2, data))).toEqual({
      step: 2, email: 'a@b.co', page: 'learner', src: '', honeypot: '',
      role: 'Researcher', pay: '$5 to 10', anything_else: '  Keep my answer as entered.  ',
    });
    expect(data.fields).toEqual(fields);
  });
});

