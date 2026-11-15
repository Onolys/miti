import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Execute the same unmodified source that the owner pastes into Apps Script.
const codePath = new URL('../Code.gs', import.meta.url);

export function createAppsScriptHarness({
  rows = [], sheetExists = true, waitLockError,
  activeSpreadsheet = false, configured = true, maxRows: initialMaxRows = 1000, spreadsheetId = 'test-spreadsheet-id',
} = {}) {
  const cells = rows.map((row) => [...row]);
  const events = [];
  const outputs = [];
  const formats = [];
  const writes = [];
  let existingSheet = sheetExists;
  let maxRows = Math.max(initialMaxRows, cells.length);

  const sheet = {
    getLastRow() {
      return cells.reduce((last, row, index) => row.some(isPopulated) ? index + 1 : last, 0);
    },
    getLastColumn() {
      return cells.reduce((last, row) => row.reduce(
        (column, value, index) => isPopulated(value) ? Math.max(column, index + 1) : column,
        last,
      ), 0);
    },
    getMaxRows: () => maxRows,
    insertRowsAfter(after, howMany) {
      if (!Number.isInteger(after) || after < 0 || after > maxRows || !Number.isInteger(howMany) || howMany < 1) {
        throw new Error('Invalid insertRowsAfter arguments');
      }
      maxRows += howMany;
      return sheet;
    },
    getMaxColumns: () => Math.max(26, sheet.getLastColumn()),
    getRange(row, column, numRows = 1, numColumns = 1) {
      if (![row, column, numRows, numColumns].every((value) => Number.isInteger(value) && value > 0)) {
        throw new Error('Range coordinates and dimensions must be positive integers');
      }
      if (row + numRows - 1 > maxRows || column + numColumns - 1 > sheet.getMaxColumns()) {
        throw new Error('The coordinates of the range are outside the dimensions of the sheet.');
      }
      const range = {
        getValues() {
          return Array.from({ length: numRows }, (_, rowOffset) =>
            Array.from({ length: numColumns }, (_, columnOffset) =>
              cells[row - 1 + rowOffset]?.[column - 1 + columnOffset] ?? '',
            ),
          );
        },
        getValue() {
          return range.getValues()[0][0];
        },
        setValues(values) {
          if (values.length !== numRows || values.some((valuesRow) => valuesRow.length !== numColumns)) {
            throw new Error('Values must match the range dimensions');
          }
          writes.push({ row, column, numRows, numColumns });
          values.forEach((valuesRow, rowOffset) => {
            const target = cells[row - 1 + rowOffset] ??= [];
            valuesRow.forEach((value, columnOffset) => {
              target[column - 1 + columnOffset] = value;
            });
          });
          return range;
        },
        setValue(value) {
          return range.setValues(Array.from({ length: numRows }, () => Array(numColumns).fill(value)));
        },
        setNumberFormat(format) {
          formats.push({ row, column, numRows, numColumns, format });
          return range;
        },
      };
      return range;
    },
    getDataRange() {
      return sheet.getRange(1, 1, Math.max(1, sheet.getLastRow()), Math.max(1, sheet.getLastColumn()));
    },
    appendRow(values) {
      if (sheet.getLastRow() + 1 > maxRows) maxRows = sheet.getLastRow() + 1; // appendRow auto-grows in Apps Script
      cells[sheet.getLastRow()] = [...values];
      return sheet;
    },
  };
  const spreadsheet = {
    getId: () => spreadsheetId,
    getSheetByName(name) {
      return name === 'signups' && existingSheet ? sheet : null;
    },
    insertSheet(name) {
      if (name !== 'signups' || existingSheet) throw new Error('Unexpected or duplicate sheet');
      existingSheet = true;
      return sheet;
    },
  };
  const SpreadsheetApp = {
    // Web apps have no active container; opt in only for editor setup tests.
    getActiveSpreadsheet: () => activeSpreadsheet ? spreadsheet : null,
    openById(id) {
      if (id !== spreadsheetId) throw new Error('Spreadsheet not found or access denied');
      return spreadsheet;
    },
    flush() {
      events.push('flush');
    },
  };
  const properties = new Map(configured ? [['SIGNUP_SPREADSHEET_ID', spreadsheetId]] : []);
  const scriptProperties = {
    getProperty: (key) => properties.get(key) ?? null,
    setProperty(key, value) {
      properties.set(key, String(value));
      return scriptProperties;
    },
    deleteProperty(key) {
      properties.delete(key);
      return scriptProperties;
    },
  };
  const PropertiesService = { getScriptProperties: () => scriptProperties };
  const lock = {
    waitLock(timeout) {
      events.push({ type: 'waitLock', timeout });
      if (waitLockError) throw waitLockError;
    },
    releaseLock() {
      events.push('releaseLock');
    },
  };
  const LockService = { getScriptLock: () => lock };
  const ContentService = {
    MimeType: { JSON: 'application/json' },
    createTextOutput(content) {
      let mimeType = 'text/plain';
      const output = {
        getContent: () => content,
        getMimeType: () => mimeType,
        setMimeType(value) {
          mimeType = value;
          return output;
        },
      };
      outputs.push(output);
      return output;
    },
  };
  const context = vm.createContext({ SpreadsheetApp, PropertiesService, LockService, ContentService });
  vm.runInContext(readFileSync(codePath, 'utf8'), context, { filename: 'Code.gs' });

  return { context, sheet, spreadsheet, lock, scriptProperties, SpreadsheetApp, PropertiesService, LockService, ContentService, events, outputs, formats, writes };
}

function isPopulated(value) {
  return value !== '' && value !== null && value !== undefined;
}
