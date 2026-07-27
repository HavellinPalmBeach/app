/**
 * Havellin Palm Beach — Referral Partners directory backend (Google Apps Script)
 * ---------------------------------------------------------------------------
 * A standalone web app bound to its own Google Sheet — the same pattern as the
 * Vendor Directory. It keeps the referral-partner network (attorneys, realtors,
 * trust officers) walled off from the jobs/estimates sheet.
 *
 * SETUP (one time):
 *  1. Create a new Google Sheet (e.g. "Havellin — Referral Partners").
 *  2. Extensions → Apps Script. Paste this whole file in, replacing the default.
 *  3. Run `setupSheet` once (Run menu) to create the "Partners" tab + header row.
 *  4. Deploy → New deployment → Web app.
 *       - Execute as: Me
 *       - Who has access: Anyone
 *  5. Copy the /exec URL, then in the Havellin app open Settings and paste it into
 *     "Referral Partners — Apps Script URL", and Save.
 *
 * The app frontend talks to this via:
 *   GET  ?action=loadPartners                     -> { partners: [ {...fields, _row} ] }
 *   POST { type:'addPartner',    payload:{ fields } }              -> { ok:true, _row }
 *   POST { type:'updatePartner', payload:{ _row, partner_name, fields } } -> { ok:true }
 */

var SHEET_NAME = 'Partners';
// Base identity/lifecycle columns come first (unchanged, so existing deployments keep
// their layout); the richer prospecting-intel columns are appended after 'notes'.
var COLUMNS = [
  'first_name', 'last_name', 'partner_name', 'partner_type', 'firm', 'primary_contact',
  'phone', 'email', 'website', 'status', 'owner', 'last_contacted', 'notes',
  'title', 'street', 'suite', 'city', 'state', 'zip', 'phone_type',
  'credentials', 'board_cert', 'actec', 'council', 'council_role', 'email_status',
  'channel', 'priority', 'warm_path',
  // CRM sync foundation — APPEND ONLY, never reorder (the backend reads by position).
  'uid', 'updated_at', 'source'
];

function setupSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  sh.getRange(1, 1, 1, COLUMNS.length).setValues([COLUMNS]).setFontWeight('bold');
  sh.setFrozenRows(1);
}

function _sheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) { sh = ss.insertSheet(SHEET_NAME); sh.getRange(1, 1, 1, COLUMNS.length).setValues([COLUMNS]); }
  return sh;
}

function _json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || '';
    if (action === 'loadPartners') {
      var sh = _sheet();
      var last = sh.getLastRow();
      var partners = [];
      if (last >= 2) {
        // Read only as many columns as the sheet actually has, so a sheet not yet
        // extended with the appended CRM columns can't throw a range-bounds error.
        var nCols = Math.min(COLUMNS.length, sh.getLastColumn());
        var values = sh.getRange(2, 1, last - 1, nCols).getValues();
        for (var i = 0; i < values.length; i++) {
          var row = values[i];
          if (String(row[0]).trim() === '') continue; // skip blank rows (no first_name)
          var rec = { _row: i + 2 };
          for (var c = 0; c < COLUMNS.length; c++) rec[COLUMNS[c]] = (c < row.length ? row[c] : '');
          partners.push(rec);
        }
      }
      return _json({ partners: partners });
    }
    return _json({ error: 'unknown action' });
  } catch (err) {
    return _json({ error: String(err) });
  }
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var type = body.type;
    var payload = body.payload || {};
    var sh = _sheet();

    if (type === 'addPartner') {
      var fields = payload.fields || {};
      // CRM sync foundation: stable id + recency + origin on every new row.
      if (!fields.uid) fields.uid = Utilities.getUuid();
      fields.updated_at = new Date().toISOString();
      fields.source = payload.source || fields.source || 'app';
      var rowVals = COLUMNS.map(function (k) { return fields[k] != null ? fields[k] : ''; });
      sh.appendRow(rowVals);
      return _json({ ok: true, _row: sh.getLastRow(), uid: fields.uid });
    }

    if (type === 'updatePartner') {
      var r = parseInt(payload._row, 10);
      if (!r || r < 2) return _json({ ok: false, error: 'invalid _row' });
      var patch = payload.fields || {};
      delete patch.uid;                              // id is immutable
      patch.updated_at = new Date().toISOString();   // recency for conflict resolution
      patch.source = payload.source || 'app';        // origin, so the CRM skips its own echoes
      for (var c = 0; c < COLUMNS.length; c++) {
        var key = COLUMNS[c];
        if (Object.prototype.hasOwnProperty.call(patch, key)) {
          sh.getRange(r, c + 1).setValue(patch[key]);
        }
      }
      return _json({ ok: true });
    }

    // Permanently remove a partner by CLEARING its row (not deleteRow) so other
    // partners' _row references stay stable and the blank row is skipped on load.
    // Verifies the partner_name column so a stale _row can't clear the wrong partner;
    // a mismatch or out-of-range row returns ok (idempotent — already gone).
    if (type === 'deletePartner') {
      var dr = parseInt(payload._row, 10);
      if (!dr || dr < 2 || dr > sh.getLastRow()) return _json({ ok: true, already: true });
      if (payload.partner_name) {
        var pnCol = COLUMNS.indexOf('partner_name') + 1; // 1-based column of partner_name
        var cur = String(sh.getRange(dr, pnCol).getValue()).trim();
        if (cur !== String(payload.partner_name).trim()) return _json({ ok: true, already: true });
      }
      sh.getRange(dr, 1, 1, COLUMNS.length).clearContent();
      return _json({ ok: true });
    }

    return _json({ ok: false, error: 'unknown type' });
  } catch (err) {
    return _json({ ok: false, error: String(err) });
  }
}

// ── CRM SYNC BACKFILL (one-time) ─────────────────────────────────────────────
// Run ONCE from the Apps Script editor (Run ▸ backfillIds) after deploying this
// version. Writes the uid / updated_at / source header cells (appended columns) and
// gives every existing partner a stable uid plus a baseline recency/origin. Safe to
// re-run — it only fills blanks, never overwrites an existing uid. Not exposed over HTTP.
function backfillIds() {
  var sh = _sheet();
  var last = sh.getLastRow();
  if (last < 2) return 'empty';
  var uidC = COLUMNS.indexOf('uid') + 1;
  var updC = COLUMNS.indexOf('updated_at') + 1;
  var srcC = COLUMNS.indexOf('source') + 1;
  var emailC = COLUMNS.indexOf('email') + 1;
  var pnC = COLUMNS.indexOf('partner_name') + 1;
  sh.getRange(1, uidC).setValue('uid');
  sh.getRange(1, updC).setValue('updated_at');
  sh.getRange(1, srcC).setValue('source');
  var now = new Date().toISOString(), n = 0;
  for (var r = 2; r <= last; r++) {
    var first = String(sh.getRange(r, 1).getValue()).trim();
    var pname = String(sh.getRange(r, pnC).getValue()).trim();
    var email = String(sh.getRange(r, emailC).getValue()).trim();
    if (!first && !pname && !email) continue;   // skip fully-blank padding rows
    if (!String(sh.getRange(r, uidC).getValue()).trim()) { sh.getRange(r, uidC).setValue(Utilities.getUuid()); n++; }
    if (!String(sh.getRange(r, updC).getValue()).trim()) sh.getRange(r, updC).setValue(now);
    if (!String(sh.getRange(r, srcC).getValue()).trim()) sh.getRange(r, srcC).setValue('app');
  }
  return 'backfilled ' + n + ' uid(s)';
}
