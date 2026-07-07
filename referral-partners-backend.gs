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
var COLUMNS = [
  'partner_name', 'partner_type', 'firm', 'primary_contact', 'phone', 'email',
  'website', 'status', 'owner', 'internal_external', 'last_contacted', 'notes'
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
        var values = sh.getRange(2, 1, last - 1, COLUMNS.length).getValues();
        for (var i = 0; i < values.length; i++) {
          var row = values[i];
          if (String(row[0]).trim() === '') continue; // skip blank rows (no partner_name)
          var rec = { _row: i + 2 };
          for (var c = 0; c < COLUMNS.length; c++) rec[COLUMNS[c]] = row[c];
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
      var rowVals = COLUMNS.map(function (k) { return fields[k] != null ? fields[k] : ''; });
      sh.appendRow(rowVals);
      return _json({ ok: true, _row: sh.getLastRow() });
    }

    if (type === 'updatePartner') {
      var r = parseInt(payload._row, 10);
      if (!r || r < 2) return _json({ ok: false, error: 'invalid _row' });
      var patch = payload.fields || {};
      for (var c = 0; c < COLUMNS.length; c++) {
        var key = COLUMNS[c];
        if (Object.prototype.hasOwnProperty.call(patch, key)) {
          sh.getRange(r, c + 1).setValue(patch[key]);
        }
      }
      return _json({ ok: true });
    }

    return _json({ ok: false, error: 'unknown type' });
  } catch (err) {
    return _json({ ok: false, error: String(err) });
  }
}
