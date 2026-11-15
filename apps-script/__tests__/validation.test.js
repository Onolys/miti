import { describe, expect, it } from 'vitest';
import { createAppsScriptHarness } from './harness.js';

const valid = { step: 1, email: 'a@b.co', page: 'learner' };
const fields = ['role', 'how_often', 'feedback_today', 'pay', 'anything_else', 'organization', 'org_type', 'team_size', 'samples_per_month'];

function parse(body) {
  return createAppsScriptHarness().context.parseAndValidate(body);
}

function validate(payload) {
  return parse(JSON.stringify(payload));
}

describe('parseAndValidate', () => {
  it('normalizes a valid step 1 without touching Google services', () => {
    const harness = createAppsScriptHarness();
    expect(harness.context.parseAndValidate(JSON.stringify({
      ...valid, email: '  A@B.CO  ', src: '  newsletter  ',
    }))).toEqual({
      ok: true,
      record: { step: 1, email: 'a@b.co', page: 'learner', src: 'newsletter', honeypot: false },
    });
    expect(harness.events).toEqual([]);
    expect(harness.outputs).toEqual([]);
    expect(harness.sheet.getLastRow()).toBe(0);
  });

  it.each([1, 2])('accepts step %s and enterprise page with arbitrary answer options', (step) => {
    const result = validate({ ...valid, step, page: 'enterprise', role: 'a new option' });
    expect(result.ok).toBe(true);
    expect(result.record.role).toBe('a new option');
  });

  it.each(['{broken', '', undefined, null, 5])('rejects invalid raw JSON body %s', (body) => {
    expect(parse(body)).toEqual({ ok: false, error: 'bad_request' });
  });

  it.each([null, [], 7, true, 'a string'])('rejects non-object JSON %j', (payload) => {
    expect(validate(payload)).toEqual({ ok: false, error: 'bad_request' });
  });

  it.each([{}, { step: '1' }, { step: 0 }, { step: 3 }, { page: '' }, { page: 'Learner' }, { page: '/enterprise' }])('rejects invalid required step/page %j', (patch) => {
    const payload = Object.keys(patch).length ? { ...valid, ...patch } : { email: valid.email };
    expect(validate(payload)).toEqual({ ok: false, error: 'bad_request' });
  });

  it.each([undefined, null, '', '  '])('reports missing email %s as bad_request', (email) => {
    expect(validate({ ...valid, email })).toEqual({ ok: false, error: 'bad_request' });
  });

  it.each(['no-at-sign', 'a@@b.co', 'a@b.c', 'a @b.co', '=a@b.co', '+a@b.co', '-a@b.co', '@a@b.co', 'a@b. co', 123, {}, 'a'.repeat(250) + '@b.co'])('rejects invalid email %j', (email) => {
    expect(validate({ ...valid, email })).toEqual({ ok: false, error: 'invalid_email' });
  });

  it('accepts the 254-character email boundary', () => {
    expect(validate({ ...valid, email: 'a'.repeat(249) + '@b.co' }).ok).toBe(true);
  });

  it('rejects bodies over 10 KB and accepts exactly 10 KB', () => {
    const base = JSON.stringify({ ...valid, ignored: '' });
    const boundary = JSON.stringify({ ...valid, ignored: 'x'.repeat(10240 - base.length) });
    expect(parse(boundary).ok).toBe(true);
    expect(parse(boundary + ' ')).toEqual({ ok: false, error: 'too_large' });
    expect(parse(' '.repeat(10241))).toEqual({ ok: false, error: 'too_large' });
  });

  it('measures body size in UTF-8 bytes rather than JavaScript characters', () => {
    const body = JSON.stringify({ ...valid, ignored: '😀'.repeat(2600) });
    expect(body.length).toBeLessThan(10240);
    expect(parse(body)).toEqual({ ok: false, error: 'too_large' });
  });

  it('drops unknown keys, including prototype-like keys', () => {
    const result = parse('{"step":1,"email":"a@b.co","page":"learner","unexpected":"junk","__proto__":{"polluted":true},"constructor":"bad"}');
    expect(Object.keys(result.record).sort()).toEqual(['email', 'honeypot', 'page', 'src', 'step']);
    expect(result.record.polluted).toBeUndefined();
  });

  it('truncates every allowed answer and trimmed src to their limits', () => {
    const payload = { ...valid, src: '  ' + 's'.repeat(110) + '  ' };
    fields.forEach((field) => { payload[field] = 'x'.repeat(field === 'anything_else' ? 2001 : 201); });
    const result = validate(payload);
    expect(result.record.src).toHaveLength(100);
    fields.forEach((field) => {
      expect(result.record[field]).toHaveLength(field === 'anything_else' ? 2000 : 200);
    });
  });

  it('coerces numeric and boolean optional values and drops objects/null', () => {
    const result = validate({ ...valid, src: 12, pay: false, team_size: 0, role: {}, organization: [], org_type: null });
    expect(result.record).toEqual({ ...valid, src: '12', honeypot: false, pay: 'false', team_size: '0' });
  });

  it.each(['=SUM(A1)', '+123', '-123', '@name', '\tformula', '\rformula', '  normal text  '])('retains answer prefixes for the later storage guard: %j', (role) => {
    expect(validate({ ...valid, role }).record.role).toBe(role);
  });

  it.each(['bot', ' ', 0, false, {}, ['bot'], { toString: null }])('flags any non-empty honeypot %j', (honeypot) => {
    expect(validate({ ...valid, honeypot }).record.honeypot).toBe(true);
  });

  it.each([undefined, null, ''])('leaves an empty honeypot unflagged: %j', (honeypot) => {
    expect(validate({ ...valid, honeypot }).record.honeypot).toBe(false);
  });
});
