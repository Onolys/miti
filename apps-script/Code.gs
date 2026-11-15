// Minimal entry point for the Apps Script harness; sign-up handling follows separately.
function doGet() {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, service: 'miti-signup' }))
    .setMimeType(ContentService.MimeType.JSON);
}
