/**
 * Havellin Google Sheets Sync + Drive Folder Creation
 * Syncs jobs, estimates, change orders, logs, and hours across all devices via a
 * Google Sheet; creates an organized Drive folder structure per client.
 *
 * Cross-device safety: every shared store MERGES by record id instead of replacing
 * the whole collection, so two people working on different devices can't overwrite
 * each other's clients/estimates/etc. (This is the fix for the disappearing-client
 * bug.) Real deletions go through the explicit deleteJob action.
 *
 * The saveInventory(payload) handler lives in a separate file (saveInventory.gs) in
 * this same project — it's referenced from doPost below.
 */

var SHEET_ID = '16Z3yiRYbhYLsia0aG4v5znWo_O2eDRnB0dcldECjAJM';
var ROOT_FOLDER_ID = '1X2bmAAjbruL5lLip-UgwwmPNo7y_Ubrb';

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ══ ROUTERS ════════════════════════════════════════════════════════════════════

function doGet(e) {
  try {
    var action = e.parameter.action;

    if (action === 'loadJobs')         { return jsonOut({ ok: true, success: true, jobs: getJobsFromSheet() }); }
    if (action === 'loadEstimates')    { return jsonOut({ ok: true, success: true, estimates: getEstimateStore() }); }
    if (action === 'loadJobPlans')     { return jsonOut({ ok: true, success: true, jobPlans: getJobPlanStore() }); }
    if (action === 'loadChangeOrders') { return jsonOut({ ok: true, success: true, changeOrders: getChangeOrderStore() }); }
    if (action === 'loadLogs')         { return jsonOut({ ok: true, success: true, logs: getLogStore() }); }
    if (action === 'loadContractors')  { return jsonOut({ ok: true, success: true, contractors: getContractorStore() }); }
    // The inventory manifest — the durable copy of the item record. `jobId` scopes it
    // to one estate; without it the whole store comes back, which grows forever.
    if (action === 'loadMedia')        { return jsonOut({ ok: true, success: true, media: getMediaForJob(e.parameter.jobId) }); }

    if (action === 'createFolder') {
      var hvlId = e.parameter.hvlId || '';
      var clientName = e.parameter.clientName || 'Client';
      var svc = e.parameter.svc || '';
      return jsonOut(createJobFolder(hvlId, clientName, svc));
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

    if (data.action === 'createFolder')  { return jsonOut(createJobFolder(data.hvlId, data.clientName, data.svc, data.subfolders, data.parentFolderId)); }
    if (data.action === 'uploadFile')    { return jsonOut(uploadFileToDrive(data.folderId, data.filename, data.dataUrl)); }
    if (data.action === 'uploadHtml')    { return jsonOut(uploadHtmlToDrive(data.folderId, data.filename, data.html)); }
    if (data.action === 'getSubfolders') { return handleGetSubfolders(data); }
    if (data.action === 'getThumbnails')  { return jsonOut(getDriveThumbnails(data.fileIds)); }
    if (data.action === 'shareFolder')   { return jsonOut(shareFolder(data.folderId, data.email)); }
    if (data.action === 'unshareFolder') { return jsonOut(unshareFolder(data.folderId, data.email)); }

    var type = data.type;
    var payload = data.payload;
    if      (type === 'job')                 { saveJobToSheet(payload); }
    else if (type === 'estimate')            { saveEstimateToSheet(payload); }
    else if (type === 'hours')               { saveHoursToSheet(payload); }
    else if (type === 'saveAllEstimates')    { saveEstimateStore(payload); }
    else if (type === 'saveAllJobs')         { saveAllJobsToSheet(payload); }
    else if (type === 'saveAllJobPlans')     { saveJobPlanStore(payload); }
    else if (type === 'saveAllChangeOrders') { saveChangeOrderStore(payload); }
    else if (type === 'saveAllLogs')         { saveLogStore(payload); }
    else if (type === 'saveAllContractors')  { saveContractorStore(payload); }
    else if (type === 'deleteContractor')    { deleteContractorFromStore(payload.id); }
    else if (type === 'deleteJob')           { deleteJobFromSheet(payload.id); }
    else if (type === 'saveInventory')       { return jsonOut(saveInventory(payload)); }
    else if (type === 'saveMedia')           { return jsonOut(saveMediaStore(payload)); }
    else if (type === 'log')                 { /* redundant single-entry log; saveAllLogs is authoritative — ignore */ }
    else { return jsonOut({ ok: false, success: false, error: 'Unknown type: ' + type }); }

    return jsonOut({ ok: true, success: true });

  } catch (error) {
    Logger.log('doPost error: ' + error.toString());
    return jsonOut({ ok: false, success: false, error: error.toString() });
  }
}

// ══ DRIVE THUMBNAILS ═════════════════════════════════════════════════════════════
// The Inventory tab shows a photo beside every line. It cannot fetch those photos from
// Drive directly and MUST NOT TRY: shareFolder grants access with folder.addViewer(email)
// — named viewers only, never "anyone with the link" — so drive.google.com demands an
// authenticated session, and the app is served from GitHub Pages, which makes that a
// cross-site request. Safari blocks third-party cookies by default, so an <img> pointed
// at drive.google.com/thumbnail renders on desktop Chrome and fails on the iPad. Failing
// on one device only is worse than failing on all of them: it looks like missing photos
// on exactly the machine the work is done on.
//
// This script runs AS the Havellin account and already holds full Drive access, so it can
// simply hand the bytes back. Nothing about how the folder is shared changes.
//
// Returns { ok, thumbs: { fileId: dataUri }, missing: [fileId] }. A file that cannot be
// read is reported in `missing` rather than failing the batch — one deleted photo must
// not blank out the other forty.
var THUMB_MAX_IDS    = 60;      // one tab-load's worth; the app pages beyond this
var THUMB_PX         = 240;     // long edge of the thumbnail we ask Drive for
var THUMB_MAX_BYTES  = 60000;   // per image, before base64 - a real thumbnail is ~10KB
var THUMB_BUDGET     = 1200000; // total per response, so one batch cannot blow the limit

// A REAL thumbnail, not the whole photograph. This matters more than it looks: the app
// compresses to 900px before upload, so a full item photo is ~130KB, and 300 of those is
// 40MB - past the Apps Script response limit, past the browser's localStorage quota, and
// far too much to paint on every re-render.
//
// EVERY SOURCE IS SIZE-CHECKED, and that is the lesson. `getThumbnail()` is documented as
// returning the file's thumbnail; on a real Havellin photo it returned the whole 130KB
// image, and an earlier version trusted it and shipped exactly what this function exists
// to avoid. Trust the measurement, not the method name.
function _thumbAccept(blob, via) {
  if (!blob) return null;
  try { if (blob.getBytes().length > THUMB_MAX_BYTES) return null; } catch (e) { return null; }
  return { blob: blob, via: via };
}

// The Drive API's thumbnailLink, requested at our own size. Official route, and the only
// one where we choose the dimensions.
//
// `supportsAllDrives` is not optional decoration: without it drive.files.get answers
// "File not found" for a file DriveApp opens perfectly well, because the folder lives in a
// Shared Drive. That is exactly the error this hit on the real Havellin folder.
function _thumbViaLink(file) {
  var meta = null;
  var args = { fields: 'thumbnailLink', supportsAllDrives: true };
  try { meta = Drive.Files.get(file.getId(), args); }              // v3
  catch (eV3) { meta = Drive.Files.get(file.getId(), { supportsAllDrives: true }); }  // v2
  var link = meta && meta.thumbnailLink;
  if (!link) return null;
  return _fetchThumbUrl(link.replace(/=s\d+(-c)?$/, '') + '=s' + THUMB_PX);
}

// Drive's own thumbnail endpoint, sized. This needs NO advanced service — just the script's
// OAuth token — so it is the fallback when the Drive API is unavailable or refuses the id.
//
// NOTE the asymmetry with the browser: the app must never point an <img> at this URL,
// because a browser sends cookies rather than a token and Safari blocks them cross-site
// (see _invThumbHTML in havellin.html). Server-side, with a Bearer token, it is fine.
function _thumbViaEndpoint(file) {
  return _fetchThumbUrl('https://drive.google.com/thumbnail?id=' + encodeURIComponent(file.getId())
    + '&sz=w' + THUMB_PX);
}

function _fetchThumbUrl(url) {
  var r = UrlFetchApp.fetch(url, {
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true,
    followRedirects: true
  });
  if (r.getResponseCode() !== 200) return null;
  var blob = r.getBlob();
  // An auth wall comes back as 200 with an HTML body. A thumbnail is an image.
  var type = String(blob.getContentType() || '');
  if (type.indexOf('image/') !== 0) return null;
  return blob;
}

function _thumbBlobFor(file) {
  var got = null;
  try { got = _thumbAccept(_thumbViaLink(file), 'thumbnailLink'); if (got) return got; } catch (e) {}
  try { got = _thumbAccept(_thumbViaEndpoint(file), 'thumbnailEndpoint'); if (got) return got; } catch (e) {}
  try { got = _thumbAccept(file.getThumbnail(), 'getThumbnail'); if (got) return got; } catch (e) {}
  // The file itself, and only when it is genuinely small - a manual line item's snapshot,
  // say. Never ship a full photograph to fill a 40px box.
  try { got = _thumbAccept(file.getBlob(), 'fullBlob'); if (got) return got; } catch (e) {}
  return null;
}

function getDriveThumbnails(fileIds) {
  if (!fileIds || !fileIds.length) return { ok: true, thumbs: {}, missing: [] };
  var ids = fileIds.slice(0, THUMB_MAX_IDS);
  var thumbs = {}, missing = [], spent = 0;
  for (var i = 0; i < ids.length; i++) {
    var id = String(ids[i] || '').trim();
    if (!id) continue;
    try {
      var got = _thumbBlobFor(DriveApp.getFileById(id));
      if (!got) { missing.push(id); continue; }
      var type = got.blob.getContentType() || 'image/jpeg';
      var uri = 'data:' + type + ';base64,' + Utilities.base64Encode(got.blob.getBytes());
      // Stop before the response gets too large rather than failing the whole batch. The
      // app asks again for whatever it still does not have.
      if (spent + uri.length > THUMB_BUDGET) break;
      spent += uri.length;
      thumbs[id] = uri;
    } catch (err) {
      missing.push(id);
    }
  }
  return { ok: true, success: true, thumbs: thumbs, missing: missing };
}

// Run this from the Apps Script editor (Run menu) after pasting a new version, BEFORE
// relying on the app. It takes no arguments, because the Run menu cannot pass any — the
// same reason pruneQuoStale works the way it does. It finds the newest image anywhere
// under the Havellin root folder and thumbnails it, so a green log line here proves the
// whole path: the function is deployed, Drive is reachable, and thumbnails come back.
function testDriveThumbnails() {
  var root = DriveApp.getFolderById(ROOT_FOLDER_ID);
  var found = null;
  var stack = [root], guard = 0;
  while (stack.length && !found && guard++ < 400) {
    var f = stack.pop();
    var files = f.getFilesByType('image/jpeg');
    if (files.hasNext()) { found = files.next(); break; }
    var subs = f.getFolders();
    while (subs.hasNext()) stack.push(subs.next());
  }
  if (!found) {
    Logger.log('No JPEG found under the root folder yet — take a photo on the Job Plan first.');
    return;
  }
  // Probe every source and print what each one gave back. When this path misbehaves the
  // useful question is always "which source, and how big", and guessing at it from a
  // single OK line is what let a 130KB "thumbnail" through the first time.
  Logger.log('File: ' + found.getName());
  var kb = function(blob) {
    try { return Math.round(blob.getBytes().length / 1024) + ' KB'; } catch (e) { return 'unreadable'; }
  };
  var link = null, endp = null, thumb = null, full = null;
  try { link  = _thumbViaLink(found); } catch (e) { Logger.log('thumbnailLink threw: ' + e); }
  try { endp  = _thumbViaEndpoint(found); } catch (e) { Logger.log('thumbnailEndpoint threw: ' + e); }
  try { thumb = found.getThumbnail(); } catch (e) {}
  try { full  = found.getBlob(); } catch (e) {}
  Logger.log('  thumbnailLink     : ' + (link  ? kb(link)  : 'nothing returned'));
  Logger.log('  thumbnailEndpoint : ' + (endp  ? kb(endp)  : 'nothing returned'));
  Logger.log('  getThumbnail      : ' + (thumb ? kb(thumb) : 'nothing returned'));
  Logger.log('  full file         : ' + (full  ? kb(full)  : 'nothing returned'));

  var got = _thumbBlobFor(found);
  if (!got) {
    Logger.log('FAILED - nothing came back under the ' + Math.round(THUMB_MAX_BYTES / 1024)
      + ' KB cap. Send the four lines above on; the app will show category glyphs meanwhile, '
      + 'and every record still works.');
    return;
  }
  Logger.log('USING: ' + got.via + ' at ' + kb(got.blob) + ' - good.');
}

// ══ RESETTING THE DUMMY DATA ═════════════════════════════════════════════════════
// Written 2026-09-02 to clear the practice clients before real jobs start.
//
// TWO STEPS ON PURPOSE, the same shape as pruneQuoStale / pruneQuoStaleConfirm: the
// preview tells you exactly what will go, and a separately-named function is the only
// thing that actually removes it. Nothing here is reachable over HTTP — it is not in
// doGet or doPost — so a stray request can never trigger it.
//
// WHAT IT DOES NOT TOUCH, deliberately:
//   - the Vendor Directory and Referral Partners sheets. Different spreadsheets, real
//     data, 150+ rows you spent real time on.
//   - ContractorStore. Contractors are your crew, not practice clients. Pass true to
//     resetAllJobDataConfirm to include it.
//   - Drive. Job folders and their photos are left alone — see trashJobFoldersConfirm.
var RESET_JOB_STORES = ['EstimateStore', 'JobPlanStore', 'ChangeOrderStore', 'LogStore', 'MediaStore'];
// ⚠ 'Estimates' and 'Hours' are DEAD TABS and this is worth knowing before you go looking
// for data in them. The app never posts type:'estimate' or type:'hours' — those handlers
// exist and nothing calls them. The real estimate data is the EstimateStore blob, the real
// hours are LogStore, and both look like unreadable JSON rather than a friendly table.
// Someone clearing the practice data by hand will empty 'Estimates', see it was already
// empty, and conclude the estimates are gone. They are not.
var RESET_JOB_SHEETS = ['Jobs', 'Estimates', 'Hours'];

function previewReset() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  Logger.log('This is a PREVIEW. Nothing has been deleted.');
  Logger.log('Spreadsheet: ' + ss.getName());
  RESET_JOB_SHEETS.forEach(function(name) {
    var sh = ss.getSheetByName(name);
    var rows = sh ? Math.max(0, sh.getLastRow() - 1) : 0;
    Logger.log('  ' + name + ' sheet: ' + rows + ' data row' + (rows === 1 ? '' : 's') + ' would be cleared');
  });
  RESET_JOB_STORES.forEach(function(name) {
    // A store tab only exists once something has been written to it — a job with no hours
    // logged never creates LogStore. Say "not present" rather than "0 records": they mean
    // different things and only one of them is a reason to go looking for missing data.
    if (!ss.getSheetByName(name)) { Logger.log('  ' + name + ': not present — nothing was ever written'); return; }
    var obj = {};
    try { obj = _readStoreBlob(name) || {}; } catch (e) {}
    var n = Object.keys(obj).length;
    Logger.log('  ' + name + ': ' + n + ' record' + (n === 1 ? '' : 's') + ' would be cleared');
  });
  var cont = {};
  try { cont = _readStoreBlob('ContractorStore') || {}; } catch (e) {}
  Logger.log('  ContractorStore: ' + Object.keys(cont).length + ' KEPT (your crew, not clients)');
  Logger.log('');
  Logger.log('Job folders in Drive that trashJobFoldersConfirm() would move to Trash:');
  var folders = _jobFolders();
  if (!folders.length) Logger.log('  (none found under the Havellin root folder)');
  folders.forEach(function(f){ Logger.log('  ' + f.getName()); });
  Logger.log('');
  Logger.log('To go ahead: run resetAllJobDataConfirm(). Drive is separate and stays until');
  Logger.log('you run trashJobFoldersConfirm().');
}

function resetAllJobDataConfirm(alsoContractors) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    RESET_JOB_SHEETS.forEach(function(name) {
      var sh = ss.getSheetByName(name);
      if (!sh) return;
      var last = sh.getLastRow();
      // Row 1 is the header and stays — the app writes against those column names.
      if (last > 1) sh.deleteRows(2, last - 1);
      Logger.log('Cleared ' + name);
    });
    RESET_JOB_STORES.forEach(function(name) {
      // Never CREATE a tab just to empty it — _writeStoreBlob inserts a missing sheet, so
      // an unconditional call leaves behind empty stores the estate never had.
      if (!ss.getSheetByName(name)) { Logger.log('Skipped ' + name + ' — not present'); return; }
      _writeStoreBlob(name, {});
      Logger.log('Cleared ' + name);
    });
    if (alsoContractors === true && ss.getSheetByName('ContractorStore')) {
      _writeStoreBlob('ContractorStore', {});
      Logger.log('Cleared ContractorStore (you asked for it explicitly)');
    } else {
      Logger.log('KEPT ContractorStore — pass true if you really want the crew gone too');
    }
  } finally {
    lock.releaseLock();
  }
  Logger.log('');
  Logger.log('Done on the sheet. NOW CLEAR EACH DEVICE that has used the app, or the next');
  Logger.log('save from a stale browser will push the old clients straight back up.');
}

// Job folders sit directly under the Havellin root and are named "Client - HVL-....".
// Matching on that suffix means an unrelated folder someone filed there is left alone.
function _jobFolders() {
  var out = [];
  var it = DriveApp.getFolderById(ROOT_FOLDER_ID).getFolders();
  while (it.hasNext()) {
    var f = it.next();
    if (/ - HVL-/i.test(f.getName())) out.push(f);
  }
  return out;
}

// Separate from the sheet wipe, and separate on purpose: this is the photography. It goes
// to Drive's Trash, not shredded, so there are ~30 days to change your mind.
function trashJobFoldersConfirm() {
  var folders = _jobFolders();
  if (!folders.length) { Logger.log('No job folders found.'); return; }
  folders.forEach(function(f) {
    f.setTrashed(true);
    Logger.log('Moved to Trash: ' + f.getName());
  });
  Logger.log('');
  Logger.log(folders.length + ' folder(s) moved to Drive Trash — recoverable for about 30 days.');
}

// ══ STORE HELPERS ════════════════════════════════════════════════════════════════

// A Google Sheets cell holds at most 50,000 characters. Every store here is one JSON
// blob, and setValue() on a longer string THROWS — "Exceeds the maximum number of
// characters allowed in a cell" — which fails the whole doPost. The app then reports a
// failed sync, and because opening a job lets the sheet's copy win, the next open serves
// the last SUCCESSFUL (older, smaller) blob straight over the work that never landed.
// Silent revert: you save, come back, and the rooms you scored are gone.
//
// Measured on the real app: one fully-scored estimate serializes to about 16,250
// characters, so EstimateStore blew the cap at the fourth such job. Chunked across rows
// instead — column B of rows 2..N, reassembled on read. Reading an existing single-row
// blob is unchanged, so no migration step.
var _BLOB_CHUNK = 45000;   // headroom under the 50,000 cap

function _writeStoreBlob(sheetName, obj) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) { sheet = ss.insertSheet(sheetName); sheet.appendRow(['Updated', 'JSON']); }
  var json = JSON.stringify(obj);
  var chunks = [];
  for (var i = 0; i < json.length; i += _BLOB_CHUNK) chunks.push(json.substr(i, _BLOB_CHUNK));
  if (!chunks.length) chunks.push('');
  var stamp = new Date().toISOString();
  // Clear every old data row first. Without this a blob that shrinks leaves the tail of
  // the previous, longer one behind, and the reader concatenates JSON + garbage.
  var last = sheet.getLastRow();
  if (last > 1) sheet.getRange(2, 1, last - 1, 2).clearContent();
  var rows = chunks.map(function(c, n) { return [n === 0 ? stamp : '', c]; });
  sheet.getRange(2, 1, rows.length, 2).setValues(rows);
}

// Reassemble a chunked blob. Falls back cleanly to the old single-cell layout, and to
// the caller's empty value when the sheet is missing, blank, or holds unparseable JSON.
function _readStoreBlob(sheetName, empty) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return empty;
  var last = sheet.getLastRow();
  if (last < 2) return empty;
  var col = sheet.getRange(2, 2, last - 1, 1).getValues();
  var json = '';
  for (var i = 0; i < col.length; i++) {
    var v = col[i][0];
    if (v === '' || v === null || v === undefined) break;   // first blank ends the blob
    json += String(v);
  }
  if (!json) return empty;
  try { return JSON.parse(json); } catch (e) { return empty; }
}

// Merge two {key: entry} stores. Per key keep the entry with the newer savedAt;
// never drop a key present on only one side (absence != delete).
function _mergeStoreByKey(existing, incoming) {
  var out = {};
  for (var k in existing) out[k] = existing[k];
  for (var k in incoming) {
    var inc = incoming[k], cur = out[k];
    var inT  = inc && inc.savedAt ? Number(inc.savedAt) : 0;
    var curT = cur && cur.savedAt ? Number(cur.savedAt) : -1;
    if (!cur || inT >= curT) out[k] = inc;
  }
  return out;
}

// ══ ESTIMATE STORE (merge by jobId) ══════════════════════════════════════════════

function saveEstimateStore(incoming) {
  if (!incoming) return;
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (e) {}
  try { _writeStoreBlob('EstimateStore', _mergeStoreByKey(getEstimateStore(), incoming)); }
  finally { try { lock.releaseLock(); } catch (e) {} }
}

function getEstimateStore() {
  return _readStoreBlob('EstimateStore', {});
}

// ══ JOB PLAN STORE (merge by jobId) ══════════════════════════════════════════════

function saveJobPlanStore(incoming) {
  if (!incoming) return;
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (e) {}
  try { _writeStoreBlob('JobPlanStore', _mergeStoreByKey(getJobPlanStore(), incoming)); }
  finally { try { lock.releaseLock(); } catch (e) {} }
}

function getJobPlanStore() {
  return _readStoreBlob('JobPlanStore', {});
}

// ══ CHANGE ORDER STORE (merge a flat array by co.id) ═════════════════════════════
// Payload is the full changeOrders ARRAY from the app. Union by id; newer updatedAt
// wins (id is the creation timestamp, a safe fallback). Never drops a change order.

function saveChangeOrderStore(incoming) {
  if (!incoming) return;
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (e) {}
  try {
    var byId = {}, order = [];
    getChangeOrderStore().forEach(function(co) {
      if (co && co.id != null) { if (!(co.id in byId)) order.push(co.id); byId[co.id] = co; }
    });
    (incoming || []).forEach(function(co) {
      if (!co || co.id == null) return;
      var cur = byId[co.id];
      var inT  = Number(co.updatedAt || co.id || 0);
      var curT = cur ? Number(cur.updatedAt || cur.id || 0) : -1;
      if (!cur) order.push(co.id);
      if (!cur || inT >= curT) byId[co.id] = co;
    });
    _writeStoreBlob('ChangeOrderStore', order.map(function(id) { return byId[id]; }));
  } finally { try { lock.releaseLock(); } catch (e) {} }
}

function getChangeOrderStore() {
  return _readStoreBlob('ChangeOrderStore', []);
}

// ══ LOG STORE (merge { jobId: [entries] } by entry.id) ═══════════════════════════
// Payload is the jobLogs OBJECT keyed by jobId. Per job, union entries by id so log
// lines added on two devices for the same job are both kept.

function saveLogStore(incoming) {
  if (!incoming) return;
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (e) {}
  try {
    var out = getLogStore();
    Object.keys(incoming).forEach(function(jid) {
      var inArr = incoming[jid] || [];
      var cur = out[jid] || [];
      var seen = {};
      cur.forEach(function(en) { if (en && en.id != null) seen[en.id] = true; });
      inArr.forEach(function(en) { if (en && en.id != null && !seen[en.id]) { cur.push(en); seen[en.id] = true; } });
      out[jid] = cur;
    });
    _writeStoreBlob('LogStore', out);
  } finally { try { lock.releaseLock(); } catch (e) {} }
}

function getLogStore() {
  return _readStoreBlob('LogStore', {});
}

// ══ CONTRACTOR STORE (merge added[] and defaults[] by id) ════════════════════════
// The shared contractor directory (Transition Concierges + Property Specialists).
// Payload is { added:[...], defaults:[...] }: `added` are the contractors staff create
// in the app (id = 'c'+timestamp); `defaults` carries edits to the three built-in team
// members (id = 'default-N'). Both merge by id with the newer updatedAt winning, so a
// device that only knows the built-ins can never wipe another device's additions — the
// same disappearing-record protection the Jobs/Estimate stores use. Real removals of an
// added contractor go through the explicit deleteContractor action.

// Union two record arrays by id; newer updatedAt wins (missing timestamp counts oldest).
// Preserves records present on only one side (absence != delete).
function _mergeArrayById(existing, incoming) {
  var byId = {}, order = [];
  (existing || []).forEach(function(c) {
    if (c && c.id != null) { if (!(c.id in byId)) order.push(c.id); byId[c.id] = c; }
  });
  (incoming || []).forEach(function(c) {
    if (!c || c.id == null) return;
    var cur = byId[c.id];
    var inT  = Number(c.updatedAt || 0);
    var curT = cur ? Number(cur.updatedAt || 0) : -1;
    if (!cur) order.push(c.id);
    if (!cur || inT >= curT) byId[c.id] = c;
  });
  return order.map(function(id) { return byId[id]; });
}

function getContractorStore() {
  var obj = _readStoreBlob('ContractorStore', null) || {};
  return { added: obj.added || [], defaults: obj.defaults || [] };
}

function saveContractorStore(incoming) {
  if (!incoming) return;
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (e) {}
  try {
    var cur = getContractorStore();
    _writeStoreBlob('ContractorStore', {
      added:    _mergeArrayById(cur.added,    incoming.added),
      defaults: _mergeArrayById(cur.defaults, incoming.defaults)
    });
  } finally { try { lock.releaseLock(); } catch (e) {} }
}

function deleteContractorFromStore(id) {
  if (!id) return;
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (e) {}
  try {
    var cur = getContractorStore();
    cur.added = (cur.added || []).filter(function(c) { return c && String(c.id) !== String(id); });
    _writeStoreBlob('ContractorStore', cur);
  } finally { try { lock.releaseLock(); } catch (e) {} }
}

// ══ JOBS ═════════════════════════════════════════════════════════════════════════

function getJobsFromSheet() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('Jobs');
  if (!sheet) {
    sheet = ss.insertSheet('Jobs');
    sheet.appendRow(['ID', 'HVL ID', 'Name', 'Email', 'Phone', 'Address', 'City', 'Zip', 'Service', 'Status', 'Created', 'Data JSON']);
    return [];
  }
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  var jobs = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (row[11]) {
      try {
        jobs.push(JSON.parse(row[11]));
      } catch (e) {
        jobs.push({ id: row[0], hvlId: row[1], name: row[2], email: row[3], phone: row[4], addr: row[5], city: row[6], zip: row[7], svc: row[8], status: row[9], created: row[10] });
      }
    }
  }
  return jobs;
}

// Merge the incoming jobs into the Jobs sheet by id (newer updatedAt wins). Never
// deletes a job missing from the payload — that absence-means-delete behavior is what
// let a second device wipe another device's client. Real deletions go through deleteJob.
function saveAllJobsToSheet(jobsArr) {
  if (!jobsArr || !jobsArr.length) return;
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (e) {}
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName('Jobs');
    if (!sheet) {
      sheet = ss.insertSheet('Jobs');
      sheet.appendRow(['ID', 'HVL ID', 'Name', 'Email', 'Phone', 'Address', 'City', 'Zip', 'Service', 'Status', 'Created', 'Data JSON']);
    }

    // Start from what's already stored, keyed by id (preserves jobs this device never had).
    var byId = {}, order = [];
    getJobsFromSheet().forEach(function(j) {
      if (j && j.id != null) { if (!(j.id in byId)) order.push(j.id); byId[j.id] = j; }
    });

    // Upsert each incoming job; newer updatedAt wins (missing timestamp counts as oldest).
    jobsArr.forEach(function(j) {
      if (!j || j.id == null) return;
      var cur = byId[j.id];
      var inT = Number(j.updatedAt || 0), curT = cur ? Number(cur.updatedAt || 0) : -1;
      if (!cur) order.push(j.id);
      if (!cur || inT >= curT) byId[j.id] = j;
    });

    // Rewrite the data rows from the merged set.
    var rows = order.map(function(id) {
      var job = byId[id];
      return [job.id || '', job.hvlId || '', job.name || '', job.email || '', job.phone || '',
              job.addr || '', job.city || '', job.zip || '', job.svc || '', job.status || '',
              job.created || new Date().toISOString(), JSON.stringify(job)];
    });
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
    if (rows.length) sheet.getRange(2, 1, rows.length, 12).setValues(rows);
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

// Single-job upsert. Takes the SAME script lock and applies the SAME newest-wins
// guard as saveAllJobsToSheet, so this per-record path (fired from ~20 edit sites)
// can no longer race the bulk write and clobber a job row. Two devices editing two
// different jobs are always safe; two editing the SAME job resolve by updatedAt.
function saveJobToSheet(job) {
  if (!job || job.id == null) return;
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (e) {}
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName('Jobs');
    if (!sheet) {
      sheet = ss.insertSheet('Jobs');
      sheet.appendRow(['ID', 'HVL ID', 'Name', 'Email', 'Phone', 'Address', 'City', 'Zip', 'Service', 'Status', 'Created', 'Data JSON']);
    }
    var data = sheet.getDataRange().getValues();
    var rowIndex = -1;
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(job.id)) { rowIndex = i + 1; break; }
    }
    // Newest-wins guard: if the stored row is newer than this write, leave it alone
    // rather than overwriting fresher data with a stale edit from another device.
    if (rowIndex > 0) {
      var stored = null;
      try { stored = JSON.parse(data[rowIndex - 1][11]); } catch (e) {}
      var inT  = Number(job.updatedAt || 0);
      var curT = stored ? Number(stored.updatedAt || 0) : -1;
      if (curT > inT) return;
    }
    var rowData = [
      job.id || '', job.hvlId || '', job.name || '', job.email || '', job.phone || '',
      job.addr || '', job.city || '', job.zip || '', job.svc || '', job.status || '',
      job.created || new Date().toISOString(), JSON.stringify(job)
    ];
    if (rowIndex > 0) {
      sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
    } else {
      sheet.appendRow(rowData);
    }
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

function deleteJobFromSheet(id) {
  if (!id) return;
  var ss = SpreadsheetApp.openById(SHEET_ID);          // was getActiveSpreadsheet() — null in a web app
  var sheet = ss.getSheetByName('Jobs');
  if (!sheet) return;
  var data = sheet.getDataRange().getValues();
  var idCol = data[0].indexOf('ID');                   // header is 'ID', not 'id'
  if (idCol < 0) idCol = 0;
  for (var r = data.length - 1; r >= 1; r--) {
    if (String(data[r][idCol]) === String(id)) { sheet.deleteRow(r + 1); break; }
  }
  // Purge the job's records from the keyed stores too. Deleting a job used to remove only
  // the Jobs row, so its estimate, job plan and logs stayed behind forever — invisible in
  // the app, but still serialized into every subsequent write. That is how the sheet ends
  // up holding more estimates than the app has jobs, and every orphan pushes the blob
  // closer to the per-cell character cap for no benefit at all.
  //
  // Deliberately keyed on the same id the app uses, and silent about a miss: a job with no
  // estimate is normal, not an error.
  var key = String(id);
  [['EstimateStore', getEstimateStore], ['JobPlanStore', getJobPlanStore], ['LogStore', getLogStore]]
    .forEach(function(pair) {
      try {
        var store = pair[1]();
        if (store && Object.prototype.hasOwnProperty.call(store, key)) {
          delete store[key];
          _writeStoreBlob(pair[0], store);
        }
      } catch (e) { Logger.log('purge ' + pair[0] + ' for ' + key + ': ' + e); }
    });
}

// ══ ESTIMATES (one row per job — most current version) ═══════════════════════════

function saveEstimateToSheet(estimate) {
  if (!estimate) return;
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (e) {}
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName('Estimates');
    if (!sheet) {
      sheet = ss.insertSheet('Estimates');
      sheet.appendRow(['Job ID', 'Updated', 'Total TC', 'Total PS', 'Total Amount', 'Approved', 'Approved By', 'Approved At', 'Data JSON']);
    }

    var rowData = [
      estimate.jobId || '', new Date().toISOString(),
      estimate.totTC || 0, estimate.totPS || 0,
      estimate.havellinTotal || 0, estimate.approved || false,
      estimate.approvedBy || '', estimate.approvedAt || '', JSON.stringify(estimate)
    ];

    // Upsert by Job ID under the lock: update the existing row for this job, else append.
    var data = sheet.getDataRange().getValues();
    var rowIndex = -1;
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(estimate.jobId)) { rowIndex = i + 1; break; }
    }
    if (rowIndex > 0) {
      sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
    } else {
      sheet.appendRow(rowData);
    }
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

// ══ HOURS ════════════════════════════════════════════════════════════════════════

function saveHoursToSheet(hours) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('Hours');
  if (!sheet) {
    sheet = ss.insertSheet('Hours');
    sheet.appendRow(['Job ID', 'Date', 'Team Member', 'Role', 'Hours', 'Tasks', 'Data JSON']);
  }
  sheet.appendRow([
    hours.jobId || '', hours.date || '', hours.teamMember || '',
    hours.role || '', hours.hours || 0, hours.tasks || '', JSON.stringify(hours)
  ]);
}

// ══ DRIVE ════════════════════════════════════════════════════════════════════════

function createJobFolder(hvlId, clientName, svc, subfolderNames, parentFolderId) {
  try {
    var rootFolder = DriveApp.getFolderById(parentFolderId || ROOT_FOLDER_ID);
    var folderName = clientName + ' - ' + hvlId;
    // Idempotent by name: REUSE an existing job folder instead of creating another.
    // createFolder fires from more than one place (auto on client creation + the
    // manual button) and across devices; without this each call minted a fresh
    // "Client - HVLID" folder, which is how one client ended up with 4 folders.
    var existing = rootFolder.getFoldersByName(folderName);
    var reused = existing.hasNext();
    var clientFolder = reused ? existing.next() : rootFolder.createFolder(folderName);
    var names = subfolderNames || ['Estate Inventory', 'Walkthrough Notes', 'Estimate', 'Agreement', 'Change Orders', 'Invoice', 'Job Log'];
    var subfolders = {};
    names.forEach(function(name) {
      // Same reuse-by-name rule for each subfolder, so re-running never duplicates them.
      var subIt = clientFolder.getFoldersByName(name);
      var sub = subIt.hasNext() ? subIt.next() : clientFolder.createFolder(name);
      subfolders[name] = { id: sub.getId(), url: sub.getUrl() };
    });
    return { ok: true, success: true, folderUrl: clientFolder.getUrl(), folderId: clientFolder.getId(), folderName: folderName, subfolders: subfolders, reused: reused };
  } catch (error) {
    Logger.log('createJobFolder error: ' + error.toString());
    return { ok: false, success: false, error: error.toString() };
  }
}

function uploadFileToDrive(folderId, filename, dataUrl) {
  try {
    var folder = DriveApp.getFolderById(folderId);
    var base64 = dataUrl.split(',')[1];
    var mimeMatch = dataUrl.match(/^data:([^;]+);/);
    var mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    var blob = Utilities.newBlob(Utilities.base64Decode(base64), mime, filename);
    var file = folder.createFile(blob);
    return { ok: true, fileUrl: file.getUrl(), fileId: file.getId() };
  } catch (error) {
    Logger.log('uploadFileToDrive error: ' + error.toString());
    return { ok: false, error: error.toString() };
  }
}

function uploadHtmlToDrive(folderId, filename, html) {
  try {
    var folder = DriveApp.getFolderById(folderId);
    var pdfName = filename.replace(/\.(html?|pdf)$/i, '') + '.pdf';
    // Remove any existing copy so re-saving overwrites instead of duplicating
    var existing = folder.getFilesByName(pdfName);
    while (existing.hasNext()) { existing.next().setTrashed(true); }
    var htmlBlob = Utilities.newBlob(html, 'text/html', pdfName);
    var pdfBlob = htmlBlob.getAs('application/pdf').setName(pdfName);
    var file = folder.createFile(pdfBlob);
    return { ok: true, fileUrl: file.getUrl(), fileId: file.getId() };
  } catch (error) {
    Logger.log('uploadHtmlToDrive error: ' + error.toString());
    return { ok: false, error: error.toString() };
  }
}

function handleGetSubfolders(data) {
  try {
    var folder = DriveApp.getFolderById(data.folderId);
    var result = {};
    var it = folder.getFolders();
    while (it.hasNext()) {
      var sub = it.next();
      result[sub.getName()] = { id: sub.getId(), url: sub.getUrl() };
    }
    return jsonOut({ ok: true, subfolders: result });
  } catch(e) {
    return jsonOut({ ok: false, error: e.message });
  }
}

// Grant a person read-only (Viewer) access to one folder — used to share the merged
// "Estate Inventory" folder with an estate attorney or trust officer. Named-person
// share, not "anyone with the link", so it can be revoked with unshareFolder.
function shareFolder(folderId, email) {
  try {
    if (!folderId || !email) return { ok: false, success: false, error: 'Missing folderId or email' };
    var folder = DriveApp.getFolderById(folderId);
    folder.addViewer(email);
    return { ok: true, success: true, url: folder.getUrl() };
  } catch (e) {
    return { ok: false, success: false, error: String(e) };
  }
}
function unshareFolder(folderId, email) {
  try {
    if (!folderId || !email) return { ok: false, success: false, error: 'Missing folderId or email' };
    var folder = DriveApp.getFolderById(folderId);
    folder.removeViewer(email);
    return { ok: true, success: true };
  } catch (e) {
    return { ok: false, success: false, error: String(e) };
  }
}
