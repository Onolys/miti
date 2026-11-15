import { describe, expect, it } from 'vitest';
import { createAppsScriptHarness } from './harness.js';

describe('Apps Script test harness', () => {
  it('loads the pasteable Code.gs and calls doGet through ContentService', () => {
    const harness = createAppsScriptHarness();

    const output = harness.context.doGet();

    expect(JSON.parse(output.getContent())).toEqual({ ok: true, service: 'miti-signup' });
    expect(output.getMimeType()).toBe(harness.ContentService.MimeType.JSON);
    expect(harness.outputs).toEqual([output]);
  });

  it('preserves reordered headers and owner columns in sheet range reads and writes', () => {
    const harness = createAppsScriptHarness({
      rows: [['owner_note', 'email', 'page'], ['keep', 'a@b.co', 'learner']],
    });
    const sheet = harness.spreadsheet.getSheetByName('signups');
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const emailColumn = headers.indexOf('email') + 1;

    sheet.getRange(2, emailColumn).setValue('next@b.co');
    sheet.getRange(1, 4).setValue('updated');
    sheet.getRange(2, 4).setNumberFormat('@').setValues([['now']]);
    sheet.appendRow(['note', 'new@b.co', 'enterprise', 'later']);

    expect(sheet.getDataRange().getValues()).toEqual([
      ['owner_note', 'email', 'page', 'updated'],
      ['keep', 'next@b.co', 'learner', 'now'],
      ['note', 'new@b.co', 'enterprise', 'later'],
    ]);
    expect(harness.formats).toEqual([{ row: 2, column: 4, numRows: 1, numColumns: 1, format: '@' }]);
    harness.SpreadsheetApp.flush();
    expect(harness.events).toEqual(['flush']);
  });

  it('creates an absent sheet and keeps empty range cells blank', () => {
    const harness = createAppsScriptHarness({ sheetExists: false });
    const spreadsheet = harness.spreadsheet;

    expect(spreadsheet.getSheetByName('signups')).toBeNull();
    const sheet = spreadsheet.insertSheet('signups');
    expect(sheet.getLastRow()).toBe(0);
    expect(sheet.getLastColumn()).toBe(0);
    expect(sheet.getRange(1, 1, 1, 2).getValues()).toEqual([['', '']]);
    expect(spreadsheet.getSheetByName('signups')).toBe(sheet);
  });

  it('records lock acquisition and release, and can throw on waitLock', () => {
    const harness = createAppsScriptHarness();
    const lock = harness.LockService.getScriptLock();
    lock.waitLock(5000);
    lock.releaseLock();
    expect(harness.events).toEqual([
      { type: 'waitLock', timeout: 5000 },
      'releaseLock',
    ]);

    const timeout = new Error('Lock timed out');
    const busyHarness = createAppsScriptHarness({ waitLockError: timeout });
    expect(() => busyHarness.LockService.getScriptLock().waitLock(5000)).toThrow(timeout);
    expect(busyHarness.events).toEqual([{ type: 'waitLock', timeout: 5000 }]);
  });

  it('isolates sheet state between executions', () => {
    const rows = [['email'], ['a@b.co']];
    const first = createAppsScriptHarness({ rows });
    const second = createAppsScriptHarness({ rows });
    first.sheet.getRange(2, 1).setValue('changed@b.co');

    expect(second.sheet.getRange(2, 1).getValue()).toBe('a@b.co');
    expect(rows[1][0]).toBe('a@b.co');
  });
});
