/**
 * Havellin Vendor Directory Sync  —  READ-ONLY (v1)
 * ---------------------------------------------------------------------------
 * A STANDALONE web app bound ONLY to the Vendor Directory spreadsheet.
 * It has no reference to the Jobs/Estimates sheet, so anyone who can reach this
 * endpoint can never read, edit, or delete a job or estimate. That separation is
 * the whole point of keeping the directory in its own document.
 *
 * It mirrors the conventions of the main jobs/estimates Apps Script:
 *   - jsonOut() helper
 *   - { ok, success } response shape
 *   - ?action=... on GET
 *   - simple (CORS-friendly) responses
 *
 * DEPLOY
 *   1. Open the Vendor Directory sheet ▸ Extensions ▸ Apps Script
 *      (or create a new standalone Apps Script project).
 *   2. Paste this file in, Save.
 *   3. Deploy ▸ New deployment ▸ Web app
 *        Execute as:        Me
 *        Who has access:    Anyone
 *   4. Copy the /exec URL into the app:  Settings ▸ Vendor Directory URL.
 *
 * Write-back (add vendor / update performance score from the app) is intentionally
 * NOT included yet — v1 is read-only so it can never alter your directory. The
 * write handlers come with the in-app add/score UI in the next step.
 */

// The Vendor Directory spreadsheet ID (from its URL) and the tab to read.
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

// Turn a header label ("Performance Score") into a stable object key
// ("performance_score") so the app reads predictable fields even if columns move.
function vendorKey(header) {
  return String(header).trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// Read every vendor row into an object keyed by header. Rows with no Vendor Name
// are skipped (blank trailing rows). _row is the 1-based sheet row, kept as a
// stable handle for future write-back.
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
