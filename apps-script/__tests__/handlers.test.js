import { describe, expect, it, vi } from 'vitest';
import { createAppsScriptHarness } from './harness.js';

const payload = { step: 1, email: 'a@b.co', page: 'learner', src: 'test' };

function post(harness, body = JSON.stringify(payload)) {
  const output = harness.context.doPost({ postData: { contents: body } });
  expect(output.getMimeType()).toBe(harness.ContentService.MimeType.JSON);
  return JSON.parse(output.getContent());
}

describe('Apps Script request handlers', () => {
  it('returns saved JSON and flushes before releasing the acquired lock', () => {
    const harness = createAppsScriptHarness();
    expect(post(harness)).toEqual({ ok: true });
    expect(harness.events).toEqual([{ type: 'waitLock', timeout: 10000 }, 'flush', 'releaseLock']);
    expect(harness.sheet.getLastRow()).toBe(2);
    const values = harness.sheet.getDataRange().getValues();
    const saved = Object.fromEntries(values[0].map((header, column) => [header, values[1][column]]));
    expect(saved).toMatchObject({ email: 'a@b.co', page: 'learner', src: 'test' });
    expect(new Date(saved.first_seen).toISOString()).toBe(saved.first_seen);
    expect(saved.updated).toBe(saved.first_seen);
  });

  it('creates the bound spreadsheet signups tab when absent', () => {
    const harness = createAppsScriptHarness({ sheetExists: false });
    const create = vi.spyOn(harness.spreadsheet, 'insertSheet');
    expect(post(harness)).toEqual({ ok: true });
    expect(create).toHaveBeenCalledExactlyOnceWith('signups');
    expect(harness.spreadsheet.getSheetByName('signups').getLastRow()).toBe(2);
  });

  it.each(['bot', 0, false, { toString: null }])('silently accepts honeypot %j before touching lock or spreadsheet', (honeypot) => {
    const harness = createAppsScriptHarness();
    const lock = vi.spyOn(harness.LockService, 'getScriptLock');
    const spreadsheet = vi.spyOn(harness.SpreadsheetApp, 'getActiveSpreadsheet');
    expect(post(harness, JSON.stringify({ ...payload, honeypot }))).toEqual({ ok: true });
    expect(lock).not.toHaveBeenCalled();
    expect(spreadsheet).not.toHaveBeenCalled();
    expect(harness.events).toEqual([]);
    expect(harness.sheet.getLastRow()).toBe(0);
  });

  it.each([
    ['{', 'bad_request'],
    ['null', 'bad_request'],
    [JSON.stringify({ ...payload, step: 9 }), 'bad_request'],
    [JSON.stringify({ ...payload, page: 'invalid' }), 'bad_request'],
    [JSON.stringify({ step: 1, page: 'learner' }), 'bad_request'],
    [JSON.stringify({ ...payload, email: 'invalid' }), 'invalid_email'],
    [' '.repeat(10241), 'too_large'],
  ])('returns named validation error case %# without a lock', (body, error) => {
    const harness = createAppsScriptHarness();
    const lock = vi.spyOn(harness.LockService, 'getScriptLock');
    expect(post(harness, body)).toEqual({ ok: false, error });
    expect(lock).not.toHaveBeenCalled();
    expect(harness.sheet.getLastRow()).toBe(0);
  });

  it.each([undefined, null, {}, { postData: {} }])('handles missing request body %j as JSON bad_request', (event) => {
    const harness = createAppsScriptHarness();
    const output = harness.context.doPost(event);
    expect(JSON.parse(output.getContent())).toEqual({ ok: false, error: 'bad_request' });
    expect(harness.events).toEqual([]);
  });

  it('maps waitLock timeout to busy without releasing an unacquired lock', () => {
    const harness = createAppsScriptHarness({ waitLockError: new Error('timed out') });
    const spreadsheet = vi.spyOn(harness.SpreadsheetApp, 'getActiveSpreadsheet');
    expect(post(harness)).toEqual({ ok: false, error: 'busy' });
    expect(harness.events).toEqual([{ type: 'waitLock', timeout: 10000 }]);
    expect(spreadsheet).not.toHaveBeenCalled();
  });

  it('maps write failure to server and releases the lock in finally', () => {
    const harness = createAppsScriptHarness();
    vi.spyOn(harness.sheet, 'appendRow').mockImplementation(() => { throw new Error('write failed'); });
    expect(post(harness)).toEqual({ ok: false, error: 'server' });
    expect(harness.events).toEqual([{ type: 'waitLock', timeout: 10000 }, 'releaseLock']);
  });

  it('maps flush failure to server and still releases the lock', () => {
    const harness = createAppsScriptHarness();
    vi.spyOn(harness.SpreadsheetApp, 'flush').mockImplementation(() => { throw new Error('flush failed'); });
    expect(post(harness)).toEqual({ ok: false, error: 'server' });
    expect(harness.events).toEqual([{ type: 'waitLock', timeout: 10000 }, 'releaseLock']);
  });

  it('catches releaseLock failure and returns valid server JSON', () => {
    const harness = createAppsScriptHarness();
    const release = vi.spyOn(harness.lock, 'releaseLock').mockImplementation(() => { throw new Error('release failed'); });
    expect(post(harness)).toEqual({ ok: false, error: 'server' });
    expect(release).toHaveBeenCalledOnce();
  });

  it('maps lock service errors to server rather than busy', () => {
    const harness = createAppsScriptHarness();
    vi.spyOn(harness.LockService, 'getScriptLock').mockImplementation(() => { throw new Error('service unavailable'); });
    expect(post(harness)).toEqual({ ok: false, error: 'server' });
    expect(harness.events).toEqual([]);
  });

  it('catches unexpected validation errors in the outer handler', () => {
    const harness = createAppsScriptHarness();
    harness.context.parseAndValidate = () => { throw new Error('unexpected'); };
    expect(post(harness)).toEqual({ ok: false, error: 'server' });
    expect(harness.events).toEqual([]);
  });

  it('releases the lock when the bound spreadsheet throws', () => {
    const harness = createAppsScriptHarness();
    vi.spyOn(harness.SpreadsheetApp, 'getActiveSpreadsheet').mockImplementation(() => { throw new Error('spreadsheet unavailable'); });
    expect(post(harness)).toEqual({ ok: false, error: 'server' });
    expect(harness.events).toEqual([{ type: 'waitLock', timeout: 10000 }, 'releaseLock']);
  });

  it('returns the exact healthcheck JSON', () => {
    const harness = createAppsScriptHarness();
    const output = harness.context.doGet();
    expect(JSON.parse(output.getContent())).toEqual({ ok: true, service: 'miti-signup' });
    expect(output.getMimeType()).toBe(harness.ContentService.MimeType.JSON);
    expect(harness.events).toEqual([]);
  });
});
