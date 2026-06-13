/**
 * Havellin Vendor Directory Sync  —  READ + post-job WRITE-BACK (v2)
 * ---------------------------------------------------------------------------
 * A STANDALONE web app bound ONLY to the Vendor Directory spreadsheet.
 * It has no reference to the Jobs/Estimates sheet, so anyone who can reach this
 * endpoint can never read, edit, or delete a job or estimate.
 *
 * Mirrors the main jobs/estimates script's conventions: jsonOut(), { ok, success }
 * shape, ?action= on GET, simple (CORS-friendly) responses.
 *
 * READ  (GET):  ?action=loadVendors           → { ok, vendors: [...] }
 * WRITE (POST): { type:'rateVendor', payload } → updates ONE vendor row's score
 *
 * The write is surgical: it finds the row by _row (verified by vendor name, with a
 * name search fallback) and sets ONLY Performance Score, Last Used, Jobs Rated,
 * and appends to a Performance Log column. It never touches your curated columns.
 * Performance Score / Jobs Rated are computed in the app (rolling average of the
 * last few jobs) and passed in; this script just records them.
 *
 * DEPLOY (or re-deploy after pasting this v2):
 *   Vendor Directory sheet ▸ Extensions ▸ Apps Script ▸ paste ▸ Save
 *   Deploy ▸ Manage deployments ▸ ✏️ Edit ▸ Version: New version ▸ Deploy
 *   (Execute as: Me · Who has access: Anyone). The /exec URL stays the same.
 */

var VENDOR_SHEET_ID = '1z6z2XMdtYkoV3ihQJdU9LoUBHFWV8wtLTwcHDul9jNE';
var VENDOR_TAB      = 'Vendor Directory';

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  try {
    var action = e.parameter.action;
    if (action === 'loadVendors') {
      return jsonOut({ ok: true, success: true, vendors: getVendorsFromSheet() });
    }
    return jsonOut({ ok: false, success: false, error: 'Unknown action' });
  } catch (error) {
    Logger.log('doGet error: ' + error.toString());
    return jsonOut({ ok: false, success: false, error: error.toString() });
  }
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    if (data.type === 'rateVendor') {
      return jsonOut(rateVendor(data.payload || {}));
    }
    return jsonOut({ ok: false, success: false, error: 'Unknown type: ' + data.type });
  } catch (error) {
    Logger.log('doPost error: ' + error.toString());
    return jsonOut({ ok: false, success: false, error: error.toString() });
  }
}

// Turn a header label ("Performance Score") into a stable object key
// ("performance_score") so the app reads predictable fields even if columns move.
function vendorKey(header) {
  return String(header).trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// Read every vendor row into an object keyed by header. Rows with no Vendor Name
// are skipped. _row is the 1-based sheet row, a stable handle for write-back.
function getVendorsFromSheet() {
  var ss = SpreadsheetApp.openById(VENDOR_SHEET_ID);
  var sheet = ss.getSheetByName(VENDOR_TAB);
  if (!sheet) throw new Error('Tab "' + VENDOR_TAB + '" not found in the vendor spreadsheet');
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0].map(vendorKey);
  var nameIdx = headers.indexOf('vendor_name');
  var out = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    if (nameIdx === -1 || !String(row[nameIdx] || '').trim()) continue;
    var obj = { _row: r + 1 };
    for (var c = 0; c < headers.length; c++) {
      if (!headers[c]) continue;
      var v = (c < row.length) ? row[c] : '';
      obj[headers[c]] = (v === null || v === undefined) ? '' : v;
    }
    out.push(obj);
  }
  return out;
}

// Post-job write-back. payload: { _row, vendor_name, performance_score,
// jobs_rated, last_used, note }. Updates only the score/used/rated/log columns.
function rateVendor(p) {
  var ss = SpreadsheetApp.openById(VENDOR_SHEET_ID);
  var sheet = ss.getSheetByName(VENDOR_TAB);
  if (!sheet) return { ok: false, error: 'Tab "' + VENDOR_TAB + '" not found' };
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return { ok: false, error: 'Empty sheet' };
  var headers = values[0].map(vendorKey);
  var nameCol = headers.indexOf('vendor_name');

  // Resolve the row: prefer _row (verify the name matches), else search by name.
  var rowIdx = -1;
  if (p._row && p._row >= 2 && p._row <= values.length) {
    var r0 = p._row - 1;
    if (!p.vendor_name || nameCol < 0 ||
        String(values[r0][nameCol]).trim() === String(p.vendor_name).trim()) {
      rowIdx = r0;
    }
  }
  if (rowIdx === -1 && p.vendor_name && nameCol >= 0) {
    for (var i = 1; i < values.length; i++) {
      if (String(values[i][nameCol]).trim() === String(p.vendor_name).trim()) { rowIdx = i; break; }
    }
  }
  if (rowIdx === -1) return { ok: false, error: 'Vendor row not found' };

  // Find a column by header, creating it (with a friendly label) if missing.
  function ensureCol(label) {
    var key = vendorKey(label);
    var c = headers.indexOf(key);
    if (c === -1) { c = headers.length; headers.push(key); sheet.getRange(1, c + 1).setValue(label); }
    return c;
  }
  var scoreCol = ensureCol('Performance Score');
  var usedCol  = ensureCol('Last Used');
  var jobsCol  = ensureCol('Jobs Rated');
  var logCol   = ensureCol('Performance Log');
  var rowNum = rowIdx + 1;

  if (p.performance_score !== undefined && p.performance_score !== null) sheet.getRange(rowNum, scoreCol + 1).setValue(p.performance_score);
  if (p.last_used)  sheet.getRange(rowNum, usedCol + 1).setValue(p.last_used);
  if (p.jobs_rated !== undefined && p.jobs_rated !== null) sheet.getRange(rowNum, jobsCol + 1).setValue(p.jobs_rated);
  if (p.note) {
    var existing = sheet.getRange(rowNum, logCol + 1).getValue();
    var entry = '[' + (p.last_used || new Date().toISOString().slice(0, 10)) + '] ' + p.note;
    sheet.getRange(rowNum, logCol + 1).setValue(existing ? (existing + '\n' + entry) : entry);
  }
  return { ok: true, success: true };
}
