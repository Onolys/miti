// Pure validation helpers: this same file is pasted into the Sheet-bound script.
function parseAndValidate(rawBody) {
  if (typeof rawBody !== 'string') return { ok: false, error: 'bad_request' };
  if (utf8ByteLength(rawBody) > 10 * 1024) return { ok: false, error: 'too_large' };

  var payload;
  try {
    payload = JSON.parse(rawBody);
  } catch (error) {
    return { ok: false, error: 'bad_request' };
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { ok: false, error: 'bad_request' };
  }
  if ((payload.step !== 1 && payload.step !== 2) ||
      (payload.page !== 'learner' && payload.page !== 'enterprise')) {
    return { ok: false, error: 'bad_request' };
  }
  if (payload.email == null || (typeof payload.email === 'string' && !payload.email.trim())) {
    return { ok: false, error: 'bad_request' };
  }
  if (typeof payload.email !== 'string') return { ok: false, error: 'invalid_email' };
  var email = payload.email.trim().toLowerCase();
  if (email.length > 254 || !/^[A-Za-z0-9][^\s@]*@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return { ok: false, error: 'invalid_email' };
  }

  var record = {
    step: payload.step,
    email: email,
    page: payload.page,
    src: optionalText(payload.src).trim().slice(0, 100),
    honeypot: payload.honeypot != null && payload.honeypot !== ''
  };
  var fields = ['role', 'how_often', 'feedback_today', 'pay', 'anything_else',
    'organization', 'org_type', 'team_size', 'samples_per_month'];
  fields.forEach(function (field) {
    if (typeof payload[field] === 'string' || typeof payload[field] === 'number' ||
        typeof payload[field] === 'boolean') {
      // Retain leading tab/CR and other prefixes for the storage formula guard.
      record[field] = optionalText(payload[field]).slice(0, field === 'anything_else' ? 2000 : 200);
    }
  });
  return { ok: true, record: record };
}

function optionalText(value) {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
    ? String(value) : '';
}

function utf8ByteLength(value) {
  var bytes = 0;
  for (var character of value) {
    var point = character.codePointAt(0);
    bytes += point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4;
  }
  return bytes;
}

var SIGNUP_COLUMNS = ['first_seen', 'updated', 'page', 'src', 'email', 'role',
  'how_often', 'feedback_today', 'pay', 'anything_else', 'organization',
  'org_type', 'team_size', 'samples_per_month'];

function ensureHeader(sheet) {
  var width = sheet.getLastColumn();
  var headers = width ? sheet.getRange(1, 1, 1, width).getValues()[0] : [];
  var missing = SIGNUP_COLUMNS.filter(function (name) { return headers.indexOf(name) === -1; });
  if (missing.length) {
    sheet.getRange(1, headers.length + 1, 1, missing.length).setValues([missing]);
    headers = headers.concat(missing);
    // Plain-text format only when columns were just created; not on every request.
    sheet.getRange(1, 1, sheet.getMaxRows(), headers.length).setNumberFormat('@');
  }
  return headers;
}

// Caller holds the script lock. Optional headers avoid repeating ensureHeader in doPost.
function upsert(sheet, record, now, headers) {
  headers = headers || ensureHeader(sheet);
  var timestamp = new Date(now).toISOString();
  var count = sheet.getLastRow() - 1;
  var matchedRow = 0;
  if (count > 0) {
    var emails = sheet.getRange(2, headers.indexOf('email') + 1, count, 1).getValues();
    var pages = sheet.getRange(2, headers.indexOf('page') + 1, count, 1).getValues();
    for (var index = 0; index < count; index++) {
      if (String(emails[index][0]).trim().toLowerCase() === record.email &&
          pages[index][0] === record.page) {
        matchedRow = index + 2;
        break;
      }
    }
  }
  if (!matchedRow) {
    var values = headers.map(function (name) {
      if (name === 'first_seen' || name === 'updated') return timestamp;
      if (SIGNUP_COLUMNS.indexOf(name) === -1 || record[name] == null) return '';
      return name === 'email' ? record[name] : formulaSafe(record[name]);
    });
    sheet.appendRow(values);
    return;
  }

  // One read and one write for the whole row; blank values never overwrite.
  var range = sheet.getRange(matchedRow, 1, 1, headers.length);
  var row = range.getValues()[0];
  row[headers.indexOf('updated')] = timestamp;
  SIGNUP_COLUMNS.forEach(function (name) {
    if (name === 'first_seen' || name === 'updated' ||
        record[name] == null || record[name] === '') return;
    var column = headers.indexOf(name);
    if (name === 'src' && row[column] !== '') return;
    row[column] = name === 'email' ? record[name] : formulaSafe(record[name]);
  });
  range.setValues([row]);
}

function formulaSafe(value) {
  return typeof value === 'string' && /^[=+@\-\t\r]/.test(value) ? "'" + value : value;
}

// Run once from the bound script editor before deploying the web app.
function setupSignup() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('Run setupSignup from the Sheet-bound script editor.');
  var id = spreadsheet.getId();
  if (typeof id !== 'string' || !id.trim()) throw new Error('The bound spreadsheet must have a valid ID.');
  PropertiesService.getScriptProperties().setProperty('SIGNUP_SPREADSHEET_ID', id);
  console.log('Miti signup spreadsheet configured. You can deploy the web app.');
  return { ok: true };
}

function jsonResponse(body) {
  return ContentService.createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(event) {
  try {
    var parsed = parseAndValidate(event && event.postData && event.postData.contents);
    if (!parsed.ok) return jsonResponse({ ok: false, error: parsed.error });
    if (parsed.record.honeypot) return jsonResponse({ ok: true });

    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(5000);
    } catch (timeout) {
      return jsonResponse({ ok: false, error: 'busy' });
    }
    try {
      var id = PropertiesService.getScriptProperties().getProperty('SIGNUP_SPREADSHEET_ID');
      if (!id || !id.trim()) throw new Error('Run setupSignup from the Sheet-bound script editor first.');
      var spreadsheet = SpreadsheetApp.openById(id);
      var sheet = spreadsheet.getSheetByName('signups') || spreadsheet.insertSheet('signups');
      var headers = ensureHeader(sheet);
      upsert(sheet, parsed.record, new Date().toISOString(), headers);
      SpreadsheetApp.flush();
    } finally {
      lock.releaseLock();
    }
    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse({ ok: false, error: 'server' });
  }
}

function doGet() {
  return jsonResponse({ ok: true, service: 'miti-signup' });
}
