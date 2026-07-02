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
 * READ  (GET):  ?action=loadVendors             → { ok, vendors: [...] }
 * WRITE (POST): { type:'rateVendor',   payload } → updates ONE vendor's score
 *               { type:'addVendor',    payload } → appends a new vendor row
 *               { type:'updateVendor', payload } → overwrites curated fields
 *
 * rateVendor is surgical: it finds the row by _row (verified by vendor name, with a
 * name search fallback) and sets ONLY Performance Score, Last Used, Jobs Rated,
 * and appends to a Performance Log column. It never touches your curated columns.
 * Performance Score / Jobs Rated are computed in the app (rolling average of the
 * last few jobs) and passed in; this script just records them.
 *
 * addVendor / updateVendor power the in-app Vendors tab (intake + vetting). They
 * write the curated columns (contact, pricing, lead time, status, last contacted,
 * etc.) but updateVendor deliberately skips the rating-owned columns above, so a
 * vetting edit can never wipe post-job performance history. Both create any missing
 * column, so new intake fields land safely even on an older sheet layout.
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
    if (data.type === 'addVendor') {
      return jsonOut(addVendor(data.payload || {}));
    }
    if (data.type === 'updateVendor') {
      return jsonOut(updateVendor(data.payload || {}));
    }
    return jsonOut({ ok: false, success: false, error: 'Unknown type: ' + data.type });
  } catch (error) {
    Logger.log('doPost error: ' + error.toString());
    return jsonOut({ ok: false, success: false, error: error.toString() });
  }
}

// Columns owned by the post-job rating flow (rateVendor). Intake/vetting writes
// must never overwrite these, so a mid-vetting edit can't wipe performance history.
var RATING_OWNED_KEYS = ['performance_score', 'last_used', 'jobs_rated', 'performance_log'];

// Append a brand-new vendor row. `p.fields` is an object keyed by column-key
// (e.g. { vendor_name:'Acme', category:'Painting', estimate_cost:2, ... }).
// Missing columns are created (with a de-slugged header) so new intake fields
// like lead_time / rate_detail land in real columns even on an older sheet.
function addVendor(p) {
  var fields = p.fields || p;   // tolerate a bare fields object
  if (!fields.vendor_name || !String(fields.vendor_name).trim()) {
    return { ok: false, success: false, error: 'Vendor Name is required' };
  }
  var ss = SpreadsheetApp.openById(VENDOR_SHEET_ID);
  var sheet = ss.getSheetByName(VENDOR_TAB);
  if (!sheet) return { ok: false, success: false, error: 'Tab "' + VENDOR_TAB + '" not found' };
  var values = sheet.getDataRange().getValues();
  var headers = (values[0] || []).map(vendorKey);

  // Ensure a column exists for every field being written; remember original labels.
  var origHeaders = values[0] || [];
  Object.keys(fields).forEach(function(key){
    if (!key) return;
    if (headers.indexOf(key) === -1) {
      headers.push(key);
      var label = key.replace(/_/g, ' ').replace(/\b\w/g, function(m){ return m.toUpperCase(); });
      var c = headers.length;
      sheet.getRange(1, c).setValue(label);
      origHeaders.push(label);
    }
  });

  // Find the first truly empty row (by Vendor Name) so we reuse blank rows the
  // sheet is padded with, instead of always appending past them.
  var nameCol = headers.indexOf('vendor_name');
  var targetRow = -1;
  for (var r = 1; r < values.length; r++) {
    if (!String((values[r][nameCol] != null ? values[r][nameCol] : '')).trim()) { targetRow = r + 1; break; }
  }
  if (targetRow === -1) targetRow = values.length + 1;

  headers.forEach(function(key, c){
    if (key && Object.prototype.hasOwnProperty.call(fields, key)) {
      sheet.getRange(targetRow, c + 1).setValue(fields[key]);
    }
  });
  return { ok: true, success: true, _row: targetRow };
}

// Overwrite curated fields on an existing vendor. Resolves the row by _row
// (verified by name) or by name search, then writes only the keys present in
// `p.fields`, skipping the rating-owned columns. Creates missing columns.
function updateVendor(p) {
  var fields = p.fields || {};
  var ss = SpreadsheetApp.openById(VENDOR_SHEET_ID);
  var sheet = ss.getSheetByName(VENDOR_TAB);
  if (!sheet) return { ok: false, success: false, error: 'Tab "' + VENDOR_TAB + '" not found' };
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return { ok: false, success: false, error: 'Empty sheet' };
  var headers = values[0].map(vendorKey);
  var nameCol = headers.indexOf('vendor_name');

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
  if (rowIdx === -1) return { ok: false, success: false, error: 'Vendor row not found' };

  function ensureCol(key) {
    var c = headers.indexOf(key);
    if (c === -1) {
      c = headers.length; headers.push(key);
      var label = key.replace(/_/g, ' ').replace(/\b\w/g, function(m){ return m.toUpperCase(); });
      sheet.getRange(1, c + 1).setValue(label);
    }
    return c;
  }
  var rowNum = rowIdx + 1, wrote = 0;
  Object.keys(fields).forEach(function(key){
    if (!key || RATING_OWNED_KEYS.indexOf(key) !== -1) return;   // never clobber rating columns
    var c = ensureCol(key);
    sheet.getRange(rowNum, c + 1).setValue(fields[key]);
    wrote++;
  });
  return { ok: true, success: true, _row: rowNum, wrote: wrote };
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
