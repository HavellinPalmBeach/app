/**
 * Havellin Palm Beach — Quo contact sync (Google Apps Script)
 * ---------------------------------------------------------------------------
 * Pushes the whole callable directory — referral partners, vendors, and clients —
 * into Quo, so the office line resolves a name on caller ID instead of a number.
 *
 * WHERE THIS LIVES: as a SECOND FILE inside the Referral Partners script project
 * (the one already holding QUO_API_KEY). Apps Script shares global scope across
 * files in a project, so this sits alongside the partners backend rather than
 * replacing it. Add it with the + next to Files, name it `Quo`.
 *
 * It reaches the other two sheets by id, so there is one key, one project, and one
 * run — rather than three copies of this logic drifting apart in three projects.
 *
 *   Run ▸ testQuoAuth           proves the key + host, touches nothing
 *   Run ▸ testQuoTags           proves the tag payload on ONE contact
 *   Run ▸ dryRunQuoAll          prints the plan, writes nothing
 *   Run ▸ pushQuoAll            the only one that writes
 *
 * ── Design notes ───────────────────────────────────────────────────────────
 * ONE CONTACT PER NUMBER, ACROSS ALL THREE SOURCES. Grouping is global, not
 * per-sheet: a number that appears as both a vendor and a client is still one
 * number, and two contacts holding it would make inbound caller ID ambiguous —
 * exactly the problem the firm collapse exists to prevent.
 *
 * NO WRITE-BACK. An earlier version stored each Quo id in the source sheet. That
 * works for partners but not for jobs, whose fields live inside a JSON blob owned
 * by main-sync. Instead the run begins by reading back everything already in Quo
 * under our sources and building externalId -> id. The mapping is derived, so it
 * cannot drift from what Quo actually holds, and no source sheet is written to.
 */

// ── Endpoints ────────────────────────────────────────────────────────────────
// Confirmed 2026-07-28 against the Authentication doc:
//   curl --request GET --url https://api.quo.com/v1/phone-numbers \
//        --header 'Authorization: YOUR_API_KEY'
// The host moved to api.quo.com in the rebrand, and the header takes the raw key
// with no 'Bearer ' prefix. Either one wrong is a 401, which reads like a bad key.
var QUO_API_BASE = 'https://api.quo.com/v1';
var QUO_AUTH_BEARER = false;
var QUO_THROTTLE_MS = 250;
var QUO_MAX_RETRIES = 4;

// ── Sources ──────────────────────────────────────────────────────────────────
// `source` is set per entity type because list-contacts can filter on it, which
// makes it a segment that works even before tags are wired.
var QUO_SRC_PARTNER = 'Havellin Referral Partner';
var QUO_SRC_VENDOR  = 'Havellin Vendor';
var QUO_SRC_CLIENT  = 'Havellin Client';
// The original single-source value, kept so the 63 partner contacts already in Quo
// are found and updated rather than duplicated under the new source name.
var QUO_SRC_LEGACY  = 'Havellin';
function _quoAllSources() {
  return [QUO_SRC_PARTNER, QUO_SRC_VENDOR, QUO_SRC_CLIENT, QUO_SRC_LEGACY];
}

// ── Sheets ───────────────────────────────────────────────────────────────────
// Partners are the active spreadsheet (this project is bound to them); the other
// two are opened by id.
var QUO_PARTNER_TAB   = 'Partners';
var QUO_VENDOR_ID     = '1z6z2XMdtYkoV3ihQJdU9LoUBHFWV8wtLTwcHDul9jNE';
var QUO_VENDOR_TAB    = 'Vendor Directory';
var QUO_JOBS_ID       = '16Z3yiRYbhYLsia0aG4v5znWo_O2eDRnB0dcldECjAJM';
var QUO_JOBS_TAB      = 'Jobs';

// ── Tags ─────────────────────────────────────────────────────────────────────
// Clients are PLUMBED BUT NOT LIVE. The jobs sheet still holds dummy records while
// the app is being tuned, and a test client in the dialer is worse than no client.
// Flip to true once real jobs are flowing (planned October 2026) — no other change
// is needed; the collector, name splitting and grouping are already built and tested.
var QUO_SYNC_CLIENTS = false;

// The workspace "Tags" custom property, read off a live contact 2026-07-29. It is an
// opaque id rather than the display name, so renaming the property in the Quo app
// will not break this. Its type is multi-select, which is why the value goes as a list.
// Blank it to turn tagging off without changing anything else.
var QUO_TAGS_FIELD_KEY = '6a6a05ce6910765c2ebc68b6';

function _quoKey() {
  var k = PropertiesService.getScriptProperties().getProperty('QUO_API_KEY');
  if (!k) throw new Error('QUO_API_KEY is not set in Script Properties.');
  return k;
}

// Retries on 429 and 5xx with exponential backoff. Returns { code, body }.
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
      var text = res.getContentText(), parsed = null;
      try { parsed = text ? JSON.parse(text) : null; } catch (e) { parsed = { raw: text }; }
      return { code: code, body: parsed };
    }
    if (attempt === QUO_MAX_RETRIES) return { code: code, body: { error: 'retries exhausted' } };
    Utilities.sleep(wait);
    wait *= 2;
  }
}

// US/Canada-centric E.164. '' means "not dialable", which is the signal to skip.
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

function _normKey(h) {
  return String(h).trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

// partner_type is stored sentence-case ('Estate attorney'); vendor categories are
// already title-case ('Wine Appraiser'). Tags from both sit in one list, so they are
// normalised to match rather than reading as two different conventions.
function _titleCase(s) {
  return String(s == null ? '' : s).trim().toLowerCase().replace(/\b[a-z]/g, function (m) {
    return m.toUpperCase();
  });
}

// Tag lists are built from several fields, any of which can be blank or repeat the
// one before it. Blank tags and duplicates are both noise on a contact card.
function _tags() {
  var out = [], seen = {};
  for (var i = 0; i < arguments.length; i++) {
    var t = String(arguments[i] == null ? '' : arguments[i]).trim();
    if (!t || seen[t.toLowerCase()]) continue;
    seen[t.toLowerCase()] = 1;
    out.push(t);
  }
  return out;
}

// Read a tab into objects keyed by its own header row, so a column added or moved
// in any of the three sheets can't silently shift the field this sync reads.
function _readTab(ss, tabName) {
  var sh = ss.getSheetByName(tabName);
  if (!sh) return [];
  var last = sh.getLastRow();
  if (last < 2) return [];
  var values = sh.getRange(1, 1, last, sh.getLastColumn()).getValues();
  var head = values[0].map(_normKey);
  var out = [];
  for (var i = 1; i < values.length; i++) {
    var rec = { _row: i + 1 };
    for (var c = 0; c < head.length; c++) if (head[c]) rec[head[c]] = values[i][c];
    out.push(rec);
  }
  return out;
}

// Generational and post-nominal suffixes. A trailing 'III' is part of the surname,
// not the surname itself — this directory is full of them (Pressly Jr., Hennessey
// III, Baldovin Jr.), and splitting on the last token alone gets every one wrong.
var QUO_NAME_SUFFIXES = {
  jr: 1, sr: 1, ii: 1, iii: 1, iv: 1, v: 1, vi: 1,
  esq: 1, md: 1, cpa: 1, phd: 1, jd: 1, llm: 1
};

function _splitName(full) {
  var s = String(full == null ? '' : full).trim().replace(/\s+/g, ' ');
  if (!s) return { first: '', last: '' };
  // Trailing-comma form ("Smith, Jane") reverses. Only the FIRST comma splits, so
  // "Smith, Jane, Esq." keeps the suffix with the surname rather than losing it.
  var ci = s.indexOf(',');
  if (ci > -1) {
    var lastPart = s.slice(0, ci).trim();
    var rest = s.slice(ci + 1).trim();
    rest = rest.replace(/,/g, ' ').trim().replace(/\s+/g, ' ');
    var restTokens = rest.split(' ');
    var tail = restTokens[restTokens.length - 1];
    if (restTokens.length > 1 && QUO_NAME_SUFFIXES[tail.toLowerCase().replace(/\./g, '')]) {
      lastPart += ' ' + tail;
      rest = restTokens.slice(0, -1).join(' ');
    }
    return { first: rest, last: lastPart };
  }
  var parts = s.split(' ');
  if (parts.length === 1) return { first: parts[0], last: '' };
  var n = parts.length;
  // Pull a trailing suffix onto the surname, provided a first name survives it.
  if (n > 2 && QUO_NAME_SUFFIXES[parts[n - 1].toLowerCase().replace(/\./g, '')]) {
    return { first: parts.slice(0, n - 2).join(' '), last: parts[n - 2] + ' ' + parts[n - 1] };
  }
  return { first: parts.slice(0, n - 1).join(' '), last: parts[n - 1] };
}

// ── Collectors — each returns uniform records ────────────────────────────────
// { extId, label, first, last, company, role, phone, email, src, tags[] }

function _collectPartners() {
  var rows = _readTab(SpreadsheetApp.getActiveSpreadsheet(), QUO_PARTNER_TAB);
  var out = [];
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    var first = String(r.first_name || '').trim(), lastN = String(r.last_name || '').trim();
    var firm = String(r.firm || r.partner_name || '').trim();
    if (!first && !lastN && !firm) continue;
    if (!String(r.uid || '').trim()) continue;   // backfillIds has not run for this row
    out.push({
      extId: String(r.uid).trim(),
      label: (first + ' ' + lastN).trim() || firm,
      first: first || firm, last: lastN,
      company: firm,
      role: String(r.title || r.partner_type || '').trim(),
      phone: _e164(r.phone), email: String(r.email || '').trim(),
      src: QUO_SRC_PARTNER, srcRow: r._row, kind: 'partner',
      // partner_type is a closed list of four values, so it makes a filterable tag.
      // title is deliberately NOT tagged — 54 distinct free-text values across 79 rows
      // would be 54 tags nobody can filter by.
      tags: _tags('Referral Partner', _titleCase(r.partner_type))
    });
  }
  return out;
}

function _collectVendors() {
  var rows = _readTab(SpreadsheetApp.openById(QUO_VENDOR_ID), QUO_VENDOR_TAB);
  var out = [];
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    var name = String(r.vendor_name || '').trim();
    if (!name) continue;
    // A vendor you have decided not to call does not belong in the dialer.
    if (String(r.status || '').trim().toLowerCase().indexOf('do not use') === 0) continue;
    var first = String(r.contact_first || '').trim(), lastN = String(r.contact_last || '').trim();
    var cat = String(r.category || '').trim();
    // Group and category both go on, giving a coarse filter (the 5 groups) and a
    // precise one (42 categories) without having to pick which matters more.
    var tags = _tags('Vendor', r.category_group, cat);
    out.push({
      // The sheet carries a UID per vendor (verified populated and distinct on all
      // 152 rows), so identity comes from that rather than the row index — a cleared
      // row that later gets reused would otherwise inherit the old vendor's contact.
      extId: 'vendor:' + (String(r.uid || '').trim() || ('row' + r._row)),
      label: (first + ' ' + lastN).trim() || name,
      first: first || name, last: first ? lastN : '',
      company: name, role: cat,
      phone: _e164(r.phone), email: String(r.email || '').trim(),
      src: QUO_SRC_VENDOR, srcRow: r._row, kind: 'vendor',
      tags: tags
    });
  }
  return out;
}

function _collectClients() {
  var rows = _readTab(SpreadsheetApp.openById(QUO_JOBS_ID), QUO_JOBS_TAB);
  var out = [];
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    // Jobs keep their real record in a JSON blob; the flat columns are a fallback.
    var j = r;
    if (r.data_json) { try { j = JSON.parse(r.data_json); } catch (e) { j = r; } }
    var nm = _splitName(j.name || r.name);
    // Job ids are numeric timestamps. A sheet read can hand one back as a float
    // ("1785263972989.0"), which would make the same job a different contact than
    // the JSON blob's integer id, so the trailing .0 is normalised away.
    var id = String(j.id || r.id || '').trim().replace(/\.0+$/, '');
    if (!id || (!nm.first && !nm.last)) continue;
    out.push({
      extId: 'client:' + id,
      label: (nm.first + ' ' + nm.last).trim(),
      first: nm.first, last: nm.last,
      company: '', role: 'Client',
      phone: _e164(j.phone || r.phone), email: String(j.email || r.email || '').trim(),
      src: QUO_SRC_CLIENT, srcRow: r._row, kind: 'client',
      tags: ['Client']
    });
  }
  return out;
}

// ── Existing contacts ────────────────────────────────────────────────────────
// Read back what Quo already holds under our sources, so create-vs-update is
// decided against Quo's actual state rather than a cached id in a sheet.
function _quoLoadExisting() {
  var map = {}, token = '', guard = 0;
  var srcQ = _quoAllSources().map(function (s) {
    return 'sources=' + encodeURIComponent(s);
  }).join('&');
  do {
    var path = '/contacts?maxResults=50&' + srcQ + (token ? '&pageToken=' + encodeURIComponent(token) : '');
    var res = _quoFetch('get', path, null);
    if (res.code !== 200) throw new Error('Could not read existing contacts: HTTP ' + res.code +
      ' ' + JSON.stringify(res.body).slice(0, 200));
    var body = res.body || {};
    var list = body.data || body.contacts || [];
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      var ext = c.externalId || (c.defaultFields && c.defaultFields.externalId);
      if (ext) map[String(ext)] = c.id;
    }
    token = body.nextPageToken || (body.pageToken) || '';
    guard++;
  } while (token && guard < 100);
  return map;
}

function _quoPayload(rec) {
  var fields = { firstName: rec.first || rec.company || rec.label, lastName: rec.last || '' };
  if (rec.company) fields.company = rec.company;
  if (rec.role) fields.role = rec.role;
  if (rec.phone) fields.phoneNumbers = [{ name: 'Work', value: rec.phone }];
  if (rec.email) fields.emails = [{ name: 'Work', value: rec.email }];
  var p = { defaultFields: fields, externalId: rec.extId, source: rec.src };
  // Tags ride along only once the workspace field key is known — see the note at
  // QUO_TAGS_FIELD_KEY. Shape is unverified against the live API, so it stays off
  // by default rather than risking a 400 on every contact in the run.
  if (QUO_TAGS_FIELD_KEY && rec.tags && rec.tags.length) {
    p.customFields = [{ key: QUO_TAGS_FIELD_KEY, value: rec.tags }];
  }
  return p;
}

function _firmPayload(company, phone, src, tags) {
  var p = {
    defaultFields: {
      firstName: company, lastName: '', company: company, role: 'Main line',
      phoneNumbers: [{ name: 'Main', value: phone }]
    },
    externalId: 'firm:' + phone, source: src
  };
  if (QUO_TAGS_FIELD_KEY && tags && tags.length) {
    p.customFields = [{ key: QUO_TAGS_FIELD_KEY, value: tags }];
  }
  return p;
}

// ── The sync ─────────────────────────────────────────────────────────────────
function syncQuoAll(dryRun) {
  var plan = {
    ok: true, dryRun: !!dryRun, counts: {},
    create: [], update: [], skip: [], firms: [], dupe: [], conflict: [], failed: []
  };

  var partners = _collectPartners(), vendors = _collectVendors();
  var clients = QUO_SYNC_CLIENTS ? _collectClients() : [];
  plan.counts = {
    partners: partners.length, vendors: vendors.length,
    clients: clients.length, clientsGated: !QUO_SYNC_CLIENTS
  };
  var all = partners.concat(vendors).concat(clients);

  // Group by number across ALL sources — one number is one contact, whatever sheet
  // it came from.
  var byPhone = {}, order = [];
  for (var i = 0; i < all.length; i++) {
    var r = all[i];
    if (!r.phone) { plan.skip.push({ src: r.kind, name: r.label, why: 'no dialable phone' }); continue; }
    if (!byPhone[r.phone]) { byPhone[r.phone] = []; order.push(r.phone); }
    byPhone[r.phone].push(r);
  }

  var existing = dryRun ? {} : _quoLoadExisting();
  if (dryRun) { try { existing = _quoLoadExisting(); } catch (e) { existing = {}; } }

  for (var g = 0; g < order.length; g++) {
    var phone = order[g], members = byPhone[phone], payload, entry;

    if (members.length === 1) {
      payload = _quoPayload(members[0]);
      entry = { name: members[0].label, phone: phone, kind: members[0].kind, ext: payload.externalId };
    } else {
      // Collapse to one record only when the members agree on who owns the number.
      var names = {}, company = '', tags = {}, srcs = {};
      members.forEach(function (m) {
        if (m.company) { names[m.company] = 1; company = m.company; }
        srcs[m.src] = 1;
        (m.tags || []).forEach(function (t) { tags[t] = 1; });
      });
      if (Object.keys(names).length !== 1) {
        plan.conflict.push({
          phone: phone, names: members.map(function (m) { return m.label + ' (' + m.kind + ')'; }),
          companies: Object.keys(names), why: 'shared number, no single owner — left unsynced'
        });
        continue;
      }
      // Same company AND same person on one number is not a switchboard — it is the
      // same record entered twice. Collapsing it to a "Main line" org contact would
      // paper over a duplicate row, so sync one of them as the person and say so.
      var labels = {};
      members.forEach(function (m) { labels[m.label] = 1; });
      if (Object.keys(labels).length === 1) {
        plan.dupe.push({
          phone: phone, name: members[0].label, company: company,
          rows: members.map(function (m) { return m.kind + ' row ' + m.srcRow; })
        });
        payload = _quoPayload(members[0]);
        entry = { name: members[0].label, phone: phone, kind: members[0].kind, ext: payload.externalId };
        var existingDup = existing[payload.externalId] || '';
        if (dryRun) { (existingDup ? plan.update : plan.create).push(entry); continue; }
        var resD = existingDup
          ? _quoFetch('patch', '/contacts/' + encodeURIComponent(existingDup), payload)
          : _quoFetch('post', '/contacts', payload);
        if (resD.code >= 200 && resD.code < 300) { (existingDup ? plan.update : plan.create).push(entry); }
        else { entry.code = resD.code; entry.error = JSON.stringify(resD.body).slice(0, 200); plan.failed.push(entry); }
        Utilities.sleep(QUO_THROTTLE_MS);
        continue;
      }
      var srcList = Object.keys(srcs);
      payload = _firmPayload(company, phone, srcList.length === 1 ? srcList[0] : QUO_SRC_PARTNER, Object.keys(tags));
      entry = { name: company, phone: phone, kind: 'firm', ext: payload.externalId };
      plan.firms.push({ company: company, phone: phone, folded: members.map(function (m) { return m.label; }) });
    }

    var existingId = existing[payload.externalId] || '';
    if (dryRun) { (existingId ? plan.update : plan.create).push(entry); continue; }

    var res = existingId
      ? _quoFetch('patch', '/contacts/' + encodeURIComponent(existingId), payload)
      : _quoFetch('post', '/contacts', payload);

    if (res.code >= 200 && res.code < 300) {
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

function _logQuoAll(p) {
  Logger.log((p.dryRun ? 'DRY RUN — nothing written.' : 'LIVE — pushed to Quo.') +
    '  create=' + p.create.length + '  update=' + p.update.length +
    '  skip=' + p.skip.length + '  conflict=' + p.conflict.length + '  failed=' + p.failed.length);
  Logger.log('  read: ' + p.counts.partners + ' partners, ' + p.counts.vendors + ' vendors, ' +
             (p.counts.clientsGated ? 'clients GATED OFF (QUO_SYNC_CLIENTS)' : p.counts.clients + ' clients'));
  if (!QUO_TAGS_FIELD_KEY) Logger.log('  (tags OFF — set QUO_TAGS_FIELD_KEY, see listQuoCustomFields)');
  if (p.firms.length) Logger.log('  ' + p.firms.length + ' shared number(s) synced as the organisation:');
  p.firms.forEach(function (f) { Logger.log('    FIRM    ' + f.phone + '  ' + f.company + '  ← ' + f.folded.join(', ')); });
  p.create.forEach(function (e) { Logger.log('  CREATE  [' + e.kind + '] ' + e.name + '  ' + e.phone); });
  p.update.forEach(function (e) { Logger.log('  UPDATE  [' + e.kind + '] ' + e.name + '  ' + e.phone); });
  var noPhone = p.skip.length;
  if (noPhone) Logger.log('  ' + noPhone + ' skipped for no dialable phone (first 20):');
  p.skip.slice(0, 20).forEach(function (e) { Logger.log('    SKIP    [' + e.src + '] ' + e.name); });
  if (p.dupe.length) Logger.log('  ' + p.dupe.length + ' duplicate row(s) in the source sheet — synced once, worth cleaning up:');
  p.dupe.forEach(function (e) { Logger.log('    DUPE    ' + e.phone + '  ' + e.name + '  (' + e.rows.join(', ') + ')'); });
  p.conflict.forEach(function (e) { Logger.log('  CONFLICT ' + e.phone + '  ' + e.names.join(', ') + '  — ' + e.why); });
  p.failed.forEach(function (e) { Logger.log('  FAILED  ' + e.name + '  HTTP ' + e.code + '  ' + e.error); });
  return p;
}

// ── Entry points ─────────────────────────────────────────────────────────────

// Read-only proof that the key and host are right; touches no contacts.
function testQuoAuth() {
  var res = _quoFetch('get', '/phone-numbers', null);
  if (res.code === 200) {
    var list = (res.body && (res.body.data || res.body)) || [];
    Logger.log('OK — authenticated against ' + QUO_API_BASE);
    (list.length ? list : []).forEach(function (n) {
      Logger.log('    ' + (n.number || n.phoneNumber || '?') + '  ' + (n.name || ''));
    });
  } else if (res.code === 401 || res.code === 403) {
    Logger.log('HTTP ' + res.code + ' — key rejected. Check QUO_API_KEY in Script Properties.');
  } else {
    Logger.log('HTTP ' + res.code + ' — ' + JSON.stringify(res.body).slice(0, 300));
  }
  return res.code;
}

// Tags are a workspace custom property, addressed by key. Create the property in
// the Quo app first (contact ▸ Add a property ▸ Tags), then run this and paste the
// key into QUO_TAGS_FIELD_KEY above.
function listQuoCustomFields() {
  var paths = ['/contact-custom-fields', '/contacts/custom-fields', '/custom-fields'];
  for (var i = 0; i < paths.length; i++) {
    var res = _quoFetch('get', paths[i], null);
    Logger.log(paths[i] + ' -> HTTP ' + res.code);
    if (res.code === 200) {
      Logger.log(JSON.stringify(res.body, null, 2).slice(0, 2000));
      return res.body;
    }
  }
  Logger.log('None of the candidate paths returned 200. Paste the log here and we will ' +
             'find the right one — or open a contact that has a Tag set and run ' +
             'dumpQuoContact with its id, which shows the field key inline.');
  return null;
}

// Fallback discovery: dump one contact raw, including whatever custom fields it
// carries. Set a Tag by hand on that contact first so the field appears.
function dumpQuoContact(contactId) {
  var res = _quoFetch('get', '/contacts/' + encodeURIComponent(contactId), null);
  Logger.log('HTTP ' + res.code);
  Logger.log(JSON.stringify(res.body, null, 2).slice(0, 3000));
  return res.body;
}

// Tag the FIRST already-synced vendor and read it straight back. The customFields
// payload shape is the one part of this integration not taken from the API docs, so
// it gets proven on a single contact before 199 of them depend on it. Sends the real
// sync payload, not a hand-built one — including defaultFields, so a PATCH that
// replaces rather than merges cannot blank the name while we are testing.
function testQuoTags() {
  if (!QUO_TAGS_FIELD_KEY) { Logger.log('QUO_TAGS_FIELD_KEY is empty — nothing to test.'); return; }
  var existing = _quoLoadExisting();
  var vendors = _collectVendors(), target = null;
  for (var i = 0; i < vendors.length && !target; i++) {
    if (vendors[i].phone && existing[vendors[i].extId]) target = vendors[i];
  }
  if (!target) { Logger.log('No already-synced vendor found — run pushQuoAll first.'); return; }

  var id = existing[target.extId];
  Logger.log('Tagging ' + target.label + '  ->  ' + JSON.stringify(target.tags));
  var res = _quoFetch('patch', '/contacts/' + encodeURIComponent(id), _quoPayload(target));
  Logger.log('PATCH -> HTTP ' + res.code);
  if (res.code < 200 || res.code >= 300) {
    Logger.log('  REJECTED: ' + JSON.stringify(res.body).slice(0, 400));
    Logger.log('  The key is confirmed good, so this is the payload shape. Paste this log.');
    return res.code;
  }
  var back = _quoFetch('get', '/contacts/' + encodeURIComponent(id), null);
  var b = (back.body && back.body.data) || back.body || {};
  Logger.log('read back — name: ' + JSON.stringify(b.defaultFields && b.defaultFields.firstName));
  Logger.log('read back — customFields: ' + JSON.stringify(b.customFields));
  Logger.log('If the tags are listed above AND the name survived, run pushQuoAll.');
  return res.code;
}

function dryRunQuoAll() { return _logQuoAll(syncQuoAll(true)); }
function pushQuoAll()   { return _logQuoAll(syncQuoAll(false)); }
