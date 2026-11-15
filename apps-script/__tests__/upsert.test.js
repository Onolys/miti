import { describe, expect, it, vi } from 'vitest';
import { createAppsScriptHarness } from './harness.js';

const schema = ['first_seen', 'updated', 'page', 'src', 'email', 'role', 'how_often', 'feedback_today', 'pay', 'anything_else', 'organization', 'org_type', 'team_size', 'samples_per_month'];
const first = '2026-11-14T10:00:00.000Z';
const later = '2026-11-15T11:00:00.000Z';
const signup = { step: 1, email: 'a@b.co', page: 'learner', src: 'newsletter' };

function record(harness, row = 2) {
  const values = harness.sheet.getDataRange().getValues();
  return Object.fromEntries(values[0].map((header, index) => [header, values[row - 1][index]]));
}

function save(harness, payload, now = first) {
  const validated = harness.context.parseAndValidate(JSON.stringify(payload));
  expect(validated.ok).toBe(true);
  harness.context.upsert(harness.sheet, validated.record, now);
}

describe('Sheet header and upsert', () => {
  it('creates the full header on an empty sheet and formats columns as plain text', () => {
    const harness = createAppsScriptHarness();
    expect(harness.context.ensureHeader(harness.sheet)).toEqual(schema);
    expect(harness.sheet.getDataRange().getValues()).toEqual([schema]);
    expect(harness.formats).toContainEqual({ row: 1, column: 1, numRows: 1000, numColumns: schema.length, format: '@' });
  });

  it('appends missing headers without moving owner columns or existing rows', () => {
    const harness = createAppsScriptHarness({ rows: [['owner_note', 'email', 'page'], ['keep', 'a@b.co', 'learner']] });
    const expected = ['owner_note', 'email', 'page', ...schema.filter((column) => !['email', 'page'].includes(column))];
    expect(harness.context.ensureHeader(harness.sheet)).toEqual(expected);
    expect(harness.sheet.getRange(2, 1, 1, 3).getValues()).toEqual([['keep', 'a@b.co', 'learner']]);
    expect(harness.context.ensureHeader(harness.sheet)).toEqual(expected);
  });

  it('creates step 1 with matching ISO timestamps', () => {
    const harness = createAppsScriptHarness();
    save(harness, signup);
    expect(harness.sheet.getLastRow()).toBe(2);
    expect(record(harness)).toMatchObject({ first_seen: first, updated: first, page: 'learner', email: 'a@b.co', src: 'newsletter', role: '' });
  });

  it('updates step 2 without a second row or changing first_seen', () => {
    const harness = createAppsScriptHarness();
    save(harness, signup);
    save(harness, { ...signup, step: 2, role: 'teacher', anything_else: 'hello' }, later);
    expect(harness.sheet.getLastRow()).toBe(2);
    expect(record(harness)).toMatchObject({ first_seen: first, updated: later, role: 'teacher', anything_else: 'hello' });
  });

  it('creates step 2 without a prior row and stores step 1 answers too', () => {
    const harness = createAppsScriptHarness();
    save(harness, { ...signup, step: 2, role: 'student' });
    save(harness, { ...signup, email: 'other@b.co', role: 'teacher' });
    expect(harness.sheet.getLastRow()).toBe(3);
    expect(record(harness)).toMatchObject({ role: 'student', first_seen: first });
    expect(record(harness, 3)).toMatchObject({ role: 'teacher', first_seen: first });
  });

  it('uses both email and page as identity, normalizing existing Sheet email', () => {
    const harness = createAppsScriptHarness({ rows: [schema, [first, first, 'learner', 'original', '  A@B.CO  ']] });
    save(harness, { ...signup, email: ' A@B.Co ', role: 'updated' }, later);
    save(harness, { ...signup, page: 'enterprise', organization: 'Org' }, later);
    expect(harness.sheet.getLastRow()).toBe(3);
    expect(record(harness)).toMatchObject({ page: 'learner', role: 'updated', first_seen: first });
    expect(record(harness, 3)).toMatchObject({ page: 'enterprise', email: 'a@b.co', organization: 'Org' });
  });

  it('never blanks prior fields and keeps src first-touch', () => {
    const harness = createAppsScriptHarness();
    save(harness, { ...signup, role: 'teacher', pay: 'yes', organization: 'Org' });
    save(harness, { ...signup, step: 2, src: 'replacement', role: '', pay: null, anything_else: 'new' }, later);
    expect(record(harness)).toMatchObject({ src: 'newsletter', role: 'teacher', pay: 'yes', organization: 'Org', anything_else: 'new', updated: later });
  });

  it('fills an empty src once', () => {
    const harness = createAppsScriptHarness();
    save(harness, { ...signup, src: '' });
    save(harness, { ...signup, src: 'first-nonempty' }, later);
    save(harness, { ...signup, src: 'replacement' }, later);
    expect(record(harness).src).toBe('first-nonempty');
  });

  it('preserves owner columns with reordered schema during update and append', () => {
    const headers = ['owner_note', ...schema.toReversed()];
    const old = { first_seen: first, updated: first, email: 'a@b.co', page: 'learner', owner_note: '=ownerFormula()', role: 'old' };
    const harness = createAppsScriptHarness({ rows: [headers, headers.map((header) => old[header] ?? '')] });
    save(harness, { ...signup, role: 'new' }, later);
    save(harness, { ...signup, email: 'new@b.co' }, later);
    expect(harness.sheet.getRange(1, 1, 1, headers.length).getValues()).toEqual([headers]);
    expect(record(harness)).toMatchObject({ owner_note: '=ownerFormula()', first_seen: first, updated: later, role: 'new', email: 'a@b.co' });
    expect(record(harness, 3)).toMatchObject({ owner_note: '', first_seen: later, email: 'new@b.co' });
  });

  it('matches the first duplicate and reads only email/page columns to find it', () => {
    const harness = createAppsScriptHarness({ rows: [schema,
      [first, first, 'learner', '', 'a@b.co', 'first'],
      [first, first, 'learner', '', 'a@b.co', 'second'],
    ] });
    const ranges = vi.spyOn(harness.sheet, 'getRange');
    save(harness, { ...signup, role: 'updated' }, later);
    // The only multi-row data ranges used for matching are the two key columns.
    expect(ranges.mock.calls.filter(([, , rows]) => rows === 2)).toEqual([
      [2, schema.indexOf('email') + 1, 2, 1],
      [2, schema.indexOf('page') + 1, 2, 1],
    ]);
    expect(record(harness).role).toBe('updated');
    expect(record(harness, 3).role).toBe('second');
  });

  it.each(['=', '+', '-', '@', '\t', '\r'])('guards dangerous %j prefixes on new and existing rows', (prefix) => {
    const harness = createAppsScriptHarness();
    save(harness, { ...signup, role: prefix + 'first' });
    expect(record(harness).role).toBe("'" + prefix + 'first');
    save(harness, { ...signup, role: prefix + 'second' }, later);
    expect(record(harness).role).toBe("'" + prefix + 'second');
    expect(record(harness).email).toBe('a@b.co');
  });

  it('guards every answer and src while preserving ordinary text', () => {
    const harness = createAppsScriptHarness();
    const fields = schema.slice(5);
    const payload = { ...signup, src: '  =campaign  ' };
    fields.forEach((field) => { payload[field] = '@formula'; });
    save(harness, payload);
    fields.forEach((field) => { expect(record(harness)[field]).toBe("'@formula"); });
    expect(record(harness).src).toBe("'=campaign");
    save(harness, { ...signup, role: '  ordinary text  ', anything_else: 'normal' }, later);
    expect(record(harness)).toMatchObject({ role: '  ordinary text  ', anything_else: 'normal' });
  });
});
