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

function doGet() {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, service: 'miti-signup' }))
    .setMimeType(ContentService.MimeType.JSON);
}
