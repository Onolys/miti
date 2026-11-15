import { describe, expect, it, vi } from 'vitest';
import { createAppsScriptHarness } from './harness.js';

const propertyKey = 'SIGNUP_SPREADSHEET_ID';
const event = { postData: { contents: JSON.stringify({ step: 1, email: 'a@b.co', page: 'learner' }) } };

function post(harness) {
  const output = harness.context.doPost(event);
  expect(output.getMimeType()).toBe(harness.ContentService.MimeType.JSON);
  return JSON.parse(output.getContent());
}

describe('Apps Script spreadsheet configuration', () => {
  it('saves a valid web POST with no active spreadsheet context', () => {
    const harness = createAppsScriptHarness();
    const active = vi.spyOn(harness.SpreadsheetApp, 'getActiveSpreadsheet');
    const open = vi.spyOn(harness.SpreadsheetApp, 'openById');
    expect(harness.SpreadsheetApp.getActiveSpreadsheet()).toBeNull();
    active.mockClear();

    expect(post(harness)).toEqual({ ok: true });
    expect(open).toHaveBeenCalledExactlyOnceWith('test-spreadsheet-id');
    expect(active).not.toHaveBeenCalled();
    expect(harness.sheet.getLastRow()).toBe(2);
    expect(harness.events).toEqual([{ type: 'waitLock', timeout: 10000 }, 'flush', 'releaseLock']);
  });

  it('captures the bound spreadsheet ID in an editor-run setup', () => {
    const harness = createAppsScriptHarness({ activeSpreadsheet: true, configured: false, spreadsheetId: 'owner-bound-sheet' });
    expect(harness.scriptProperties.getProperty(propertyKey)).toBeNull();
    expect(harness.context.setupSignup()).toEqual({ ok: true });
    expect(harness.scriptProperties.getProperty(propertyKey)).toBe('owner-bound-sheet');
    expect(harness.sheet.getLastRow()).toBe(0);
  });

  it('fails setup clearly when not run from a bound editor, preserving existing configuration', () => {
    const harness = createAppsScriptHarness({ configured: false });
    harness.scriptProperties.setProperty(propertyKey, 'existing-valid-id');
    expect(() => harness.context.setupSignup()).toThrow(/bound.*editor/i);
    expect(harness.scriptProperties.getProperty(propertyKey)).toBe('existing-valid-id');
  });

  it.each(['', '  ', null])('refuses an invalid bound spreadsheet ID %j without overwriting configuration', (id) => {
    const harness = createAppsScriptHarness({ activeSpreadsheet: true });
    vi.spyOn(harness.spreadsheet, 'getId').mockReturnValue(id);
    expect(() => harness.context.setupSignup()).toThrow(/valid.*ID/i);
    expect(harness.scriptProperties.getProperty(propertyKey)).toBe('test-spreadsheet-id');
  });

  it.each([null, '', '  '])('returns server and releases the lock when configuration is missing: %j', (id) => {
    const harness = createAppsScriptHarness({ configured: false });
    if (id !== null) harness.scriptProperties.setProperty(propertyKey, id);
    const open = vi.spyOn(harness.SpreadsheetApp, 'openById');
    expect(post(harness)).toEqual({ ok: false, error: 'server' });
    expect(open).not.toHaveBeenCalled();
    expect(harness.events).toEqual([{ type: 'waitLock', timeout: 10000 }, 'releaseLock']);
    expect(harness.sheet.getLastRow()).toBe(0);
  });

  it('returns server and releases the lock when the configured spreadsheet cannot open', () => {
    const harness = createAppsScriptHarness();
    harness.scriptProperties.setProperty(propertyKey, 'inaccessible-id');
    expect(post(harness)).toEqual({ ok: false, error: 'server' });
    expect(harness.events).toEqual([{ type: 'waitLock', timeout: 10000 }, 'releaseLock']);
  });

  it('keeps doGet independent of spreadsheet configuration', () => {
    const harness = createAppsScriptHarness({ configured: false });
    expect(JSON.parse(harness.context.doGet().getContent())).toEqual({ ok: true, service: 'miti-signup' });
    expect(harness.events).toEqual([]);
  });
});
