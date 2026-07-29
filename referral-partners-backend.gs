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
 *
 * It also carries the Quo contact sync (see syncQuoContacts near the bottom), which is
 * deliberately NOT exposed over HTTP yet — it's run from the Apps Script editor while
 * the endpoint constants are still unconfirmed.
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
  'uid', 'updated_at', 'source',
  // Contact-logging note — owned by the card's ☎ Log outreach action (mirrors Vendors).
  'last_contact_note',
  // Quo contact id, written back by the contact sync below. Owning the id locally is
  // what makes the sync deterministic — see the note above syncQuoContacts.
  'quo_contact_id'
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

// ── QUO CONTACT SYNC ─────────────────────────────────────────────────────────
// Pushes partners into Quo so the office line shows a name on caller ID. One way:
// the sheet is the source of truth and Quo is a downstream mirror, because a
// two-way sync would have a Quo edit and an app edit fight over the same record.
//
// Determinism comes from owning the Quo id locally. Each partner already carries a
// stable `uid`, which goes up as Quo's `externalId`; the id Quo returns is written
// back to `quo_contact_id`. A row with an id is PATCHed, a row without is POSTed.
// That branch is ours, so it holds regardless of whether Quo's POST happens to
// dedupe on externalId — a behaviour that isn't worth depending on either way.
//
// SETUP: Apps Script ▸ Project Settings ▸ Script Properties ▸ add QUO_API_KEY.
// Never put the key in havellin.html — that file is served from public GitHub Pages.
//
// USAGE: Run ▸ dryRunQuoSync first and read the log. Nothing is written to Quo
// until you run pushQuoSync.

// UNVERIFIED — confirm both against the Authentication doc before the first live run.
// quo.com is blocked from the machine this was written on, so these are the
// pre-rebrand OpenPhone values. If the base URL moved to api.quo.com, or the header
// wants a 'Bearer ' prefix, this is the only place either needs changing.
var QUO_API_BASE = 'https://api.openphone.com/v1';
var QUO_AUTH_BEARER = false;   // OpenPhone took the raw key, with no 'Bearer ' prefix.

var QUO_SOURCE = 'Havellin';
var QUO_THROTTLE_MS = 250;     // polite spacing; well inside the 6-min execution limit
var QUO_MAX_RETRIES = 4;

function _quoKey() {
  var k = PropertiesService.getScriptProperties().getProperty('QUO_API_KEY');
  if (!k) throw new Error('QUO_API_KEY is not set in Script Properties.');
  return k;
}

// Retries on 429 and on 5xx with exponential backoff. Returns { code, body }.
function _quoFetch(method, path, payload) {
  var opts = {
    method: method,
    muteHttpExceptions: true,
    contentType: 'application/json',
    headers: { Authorization: (QUO_AUTH_BEARER ? 'Bearer ' : '') + _quoKey() }
  };
  if (payload) opts.payload = JSON.stringify(payload);

  var wait = 1000;
  for (var attempt = 0; attempt <= QUO_MAX_RETRIES; attempt++) {
    var res = UrlFetchApp.fetch(QUO_API_BASE + path, opts);
    var code = res.getResponseCode();
    if (code !== 429 && code < 500) {
      var text = res.getContentText();
      var parsed = null;
      try { parsed = text ? JSON.parse(text) : null; } catch (e) { parsed = { raw: text }; }
      return { code: code, body: parsed };
    }
    if (attempt === QUO_MAX_RETRIES) return { code: code, body: { error: 'retries exhausted' } };
    Utilities.sleep(wait);
    wait *= 2;
  }
}

// US/Canada-centric E.164. Returns '' when there aren't enough digits to dial, which
// is the signal to skip the row rather than push an unusable number.
function _e164(raw) {
  var s = String(raw == null ? '' : raw).trim();
  if (!s) return '';
  if (s.charAt(0) === '+') {
    var kept = '+' + s.slice(1).replace(/\D/g, '');
    return kept.length >= 8 ? kept : '';
  }
  var d = s.replace(/\D/g, '');
  if (d.length === 11 && d.charAt(0) === '1') return '+' + d;
  if (d.length === 10) return '+1' + d;
  return '';
}

// Quo wants a name; a firm with no named contact still deserves a caller-ID hit, so
// fall back to the firm rather than dropping the row.
function _partnerToQuo(rec) {
  var first = String(rec.first_name || '').trim();
  var last = String(rec.last_name || '').trim();
  if (!first && !last) first = String(rec.firm || rec.partner_name || '').trim();

  var fields = { firstName: first, lastName: last };
  var company = String(rec.firm || rec.partner_name || '').trim();
  var role = String(rec.title || rec.partner_type || '').trim();
  if (company) fields.company = company;
  if (role) fields.role = role;

  var phone = _e164(rec.phone);
  if (phone) fields.phoneNumbers = [{ name: 'Work', value: phone }];
  var email = String(rec.email || '').trim();
  if (email) fields.emails = [{ name: 'Work', value: email }];

  return { defaultFields: fields, externalId: String(rec.uid || ''), source: QUO_SOURCE };
}

// dryRun true  -> returns the plan, writes nothing to Quo and nothing to the sheet.
// dryRun false -> creates/updates in Quo and writes each id back to quo_contact_id.
function syncQuoContacts(dryRun) {
  var sh = _sheet();
  var last = sh.getLastRow();
  var idCol = COLUMNS.indexOf('quo_contact_id') + 1;
  sh.getRange(1, idCol).setValue('quo_contact_id');   // no-op once the header exists
  if (last < 2) return { ok: true, dryRun: !!dryRun, create: [], update: [], skip: [] };

  var nCols = Math.max(COLUMNS.length, sh.getLastColumn());
  var values = sh.getRange(2, 1, last - 1, nCols).getValues();
  var plan = { ok: true, dryRun: !!dryRun, create: [], update: [], skip: [], shared: [], failed: [] };

  // Several partners at one firm often list the same switchboard. Outbound is fine —
  // you pick the person, not the number — but INBOUND caller ID resolves by number, so
  // a call from that switchboard will surface whichever contact Quo matches first.
  // Flag them rather than skip: whether that's acceptable is a judgement about the
  // directory, not something this sync should quietly decide.
  var phoneCount = {};
  for (var p = 0; p < values.length; p++) {
    var pc = COLUMNS.indexOf('phone');
    var pe = _e164(pc < values[p].length ? values[p][pc] : '');
    if (pe) phoneCount[pe] = (phoneCount[pe] || 0) + 1;
  }

  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    var rec = {};
    for (var c = 0; c < COLUMNS.length; c++) rec[COLUMNS[c]] = (c < row.length ? row[c] : '');
    if (String(rec.first_name).trim() === '' && String(rec.firm).trim() === '') continue;

    var label = (String(rec.first_name || '') + ' ' + String(rec.last_name || '')).trim() ||
                String(rec.firm || '(unnamed)');

    if (!_e164(rec.phone)) { plan.skip.push({ row: i + 2, name: label, why: 'no dialable phone' }); continue; }
    if (!String(rec.uid || '').trim()) { plan.skip.push({ row: i + 2, name: label, why: 'no uid — run backfillIds first' }); continue; }

    var existingId = String(rec.quo_contact_id || '').trim();
    var entry = { row: i + 2, name: label, phone: _e164(rec.phone), company: String(rec.firm || '') };
    if (phoneCount[entry.phone] > 1) plan.shared.push(entry);

    if (dryRun) {
      (existingId ? plan.update : plan.create).push(entry);
      continue;
    }

    var payload = _partnerToQuo(rec);
    var res = existingId
      ? _quoFetch('patch', '/contacts/' + encodeURIComponent(existingId), payload)
      : _quoFetch('post', '/contacts', payload);

    if (res.code >= 200 && res.code < 300) {
      var newId = res.body && (res.body.id || (res.body.data && res.body.data.id));
      if (newId && newId !== existingId) sh.getRange(i + 2, idCol).setValue(newId);
      (existingId ? plan.update : plan.create).push(entry);
    } else {
      entry.code = res.code;
      entry.error = res.body && (res.body.message || res.body.error || JSON.stringify(res.body).slice(0, 200));
      plan.failed.push(entry);
    }
    Utilities.sleep(QUO_THROTTLE_MS);
  }
  return plan;
}

function _logQuoPlan(p) {
  Logger.log((p.dryRun ? 'DRY RUN — nothing written.' : 'LIVE — pushed to Quo.') +
    '  create=' + p.create.length + '  update=' + p.update.length +
    '  skip=' + p.skip.length + '  failed=' + p.failed.length);
  if (p.shared.length) Logger.log('  ' + p.shared.length + ' contact(s) share a switchboard — inbound caller ID will be ambiguous:');
  p.shared.forEach(function (e) { Logger.log('    SHARED  ' + e.phone + '  ' + e.name + '  ' + e.company); });
  p.create.forEach(function (e) { Logger.log('  CREATE  ' + e.name + '  ' + e.phone + '  ' + e.company); });
  p.update.forEach(function (e) { Logger.log('  UPDATE  ' + e.name + '  ' + e.phone + '  ' + e.company); });
  p.skip.forEach(function (e) { Logger.log('  SKIP    row ' + e.row + '  ' + e.name + '  — ' + e.why); });
  p.failed.forEach(function (e) { Logger.log('  FAILED  ' + e.name + '  HTTP ' + e.code + '  ' + e.error); });
  return p;
}

// Run these from the Apps Script editor. Dry run first, always.
function dryRunQuoSync() { return _logQuoPlan(syncQuoContacts(true)); }
function pushQuoSync() { return _logQuoPlan(syncQuoContacts(false)); }

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
  var lcnC = COLUMNS.indexOf('last_contact_note') + 1;
  var emailC = COLUMNS.indexOf('email') + 1;
  var pnC = COLUMNS.indexOf('partner_name') + 1;
  sh.getRange(1, uidC).setValue('uid');
  sh.getRange(1, updC).setValue('updated_at');
  sh.getRange(1, srcC).setValue('source');
  sh.getRange(1, lcnC).setValue('last_contact_note');
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
