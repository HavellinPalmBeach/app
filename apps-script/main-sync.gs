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

// ══ DEPLOYMENT IDENTITY ═════════════════════════════════════════════════════════
// ⚠ THE APP HAS SHIPPED THREE FEATURES AGAINST A DEPLOYMENT THAT DID NOT HAVE THEM, AND
// EACH TIME IT READ AS A BUG IN THE APP: saveMedia (2026-08-24, the inventory manifest
// never synced), htmlToPdf (2026-09-08, no PDF on any client email — reported three times)
// and the Shared-Drive fix to uploadHtmlToDrive (2026-09-09, duplicate estimates in Drive).
//
// THE CAUSE, found only from a screenshot of the browser address bar: the file was being
// copied from a DEAD BRANCH SIX WEEKS STALE, not from main. Every redeploy was performed
// correctly — on ancient code. Nothing named the vintage that was answering, so a perfect
// redeploy of July's file was indistinguishable from a fresh one.
//
// Two further ways a redeploy looks done when it is not, both worth knowing: pressing Save
// changes NOTHING about what the live /exec URL serves (that needs Deploy → Manage
// deployments → edit → New version), and "Deploy → New deployment" mints a DIFFERENT URL
// the app is not calling.
//
// So the deployment says who it is, and the app checks on load. BACKEND_ACTIONS/TYPES are
// what this file can actually do; a test asserts they match the dispatch in doPost exactly,
// in BOTH directions, so the lists cannot drift from the code beneath them — a list that
// over-claims would be worse than no list at all.
//
// ⚠ BUMP BACKEND_VERSION IN THE SAME COMMIT AS ANY CHANGE TO THIS FILE.
var BACKEND_VERSION = '2026-09-11b';
var BACKEND_ACTIONS = [
  'createFolder', 'uploadFile', 'uploadHtml', 'htmlToPdf', 'getSubfolders',
  'getThumbnails', 'shareFolder', 'unshareFolder'
];
var BACKEND_TYPES = [
  'job', 'saveAllEstimates', 'saveAllJobs', 'saveAllJobPlans',
  'saveAllChangeOrders', 'saveAllLogs', 'saveAllContractors', 'deleteContractor',
  'deleteJob', 'saveInventory', 'saveMedia', 'log'
];

var SHEET_ID = '16Z3yiRYbhYLsia0aG4v5znWo_O2eDRnB0dcldECjAJM';
var ROOT_FOLDER_ID = '1X2bmAAjbruL5lLip-UgwwmPNo7y_Ubrb';

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// A successful write that refused some job ids says which. `dropped` is only present when
// non-empty, so every other write's response is byte-identical to what it always was.
function _okWithDrops(r) {
  var out = { ok: true, success: true };
  if (r && r.dropped && r.dropped.length) out.dropped = r.dropped;
  return out;
}

// ══ ROUTERS ════════════════════════════════════════════════════════════════════

function doGet(e) {
  try {
    var action = e.parameter.action;

    // Answered by every deployment that carries it; an OLD one answers 'Unknown action',
    // which is itself the signal the app is looking for.
    if (action === 'version') {
      return jsonOut({ ok: true, success: true, version: BACKEND_VERSION,
                       actions: BACKEND_ACTIONS, types: BACKEND_TYPES });
    }

    if (action === 'loadJobs') {
      // `deletedJobs` is every id the sheet has seen and no longer holds (see JOB LEDGER), so a
      // device can drop the estimates, plans and logs it still carries for a job that is gone.
      var jobsNow = getJobsFromSheet();
      return jsonOut({ ok: true, success: true, jobs: jobsNow,
                       deletedJobs: _deletedJobIds(_presentJobIds(jobsNow), getJobLedger()) });
    }
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
    if (data.action === 'htmlToPdf')     { return jsonOut(htmlToPdfBase64(data.html)); }
    if (data.action === 'getSubfolders') { return handleGetSubfolders(data); }
    if (data.action === 'getThumbnails')  { return jsonOut(getDriveThumbnails(data.fileIds)); }
    if (data.action === 'shareFolder')   { return jsonOut(shareFolder(data.folderId, data.email)); }
    if (data.action === 'unshareFolder') { return jsonOut(unshareFolder(data.folderId, data.email)); }

    var type = data.type;
    var payload = data.payload;
    // The job and job-keyed writes answer with `dropped`: ids the sheet REFUSED because it
    // has seen them before and no longer holds them (see JOB LEDGER). The app removes those
    // from the device that sent them, which is how a stale browser stops resurrecting them.
    if      (type === 'job')                 { return jsonOut(_okWithDrops(saveJobToSheet(payload))); }
    else if (type === 'saveAllEstimates')    { return jsonOut(_okWithDrops(saveEstimateStore(payload))); }
    else if (type === 'saveAllJobs')         { return jsonOut(_okWithDrops(saveAllJobsToSheet(payload))); }
    else if (type === 'saveAllJobPlans')     { return jsonOut(_okWithDrops(saveJobPlanStore(payload))); }
    else if (type === 'saveAllChangeOrders') { return jsonOut(_okWithDrops(saveChangeOrderStore(payload))); }
    else if (type === 'saveAllLogs')         { return jsonOut(_okWithDrops(saveLogStore(payload))); }
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
// for data in them. The app has never posted type:'estimate' or type:'hours'; the two
// handlers that answered them were deleted on 2026-09-11 along with their dispatch lines
// and their BACKEND_TYPES entries, so nothing can write to either tab again. The tabs
// themselves are left in the reset list: an old deployment really did create them, and a
// sheet that still has one wants it cleared with the rest of the practice data.
// The real estimate data is the EstimateStore blob, the real hours are LogStore, and both
// look like unreadable JSON rather than a friendly table. Someone clearing the practice data
// by hand will empty 'Estimates', see it was already empty, and conclude the estimates are
// gone. They are not.
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
  var led = _readStoreBlob(JOB_LEDGER_STORE, null);
  Logger.log('  JobLedger: ' + (led && led.seen ? Object.keys(led.seen).length : 0)
    + ' job id(s) remembered — KEPT, and every id cleared below is added to it');
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
    // FIRST, before anything is cleared: make sure the ledger has seen every job that is
    // about to go, so a device still holding one is refused when it next saves rather than
    // merged straight back in. Ids come from the Jobs sheet AND the keyed stores — an
    // estimate can outlive its job row, and a stale device pushes both.
    var ledger = getJobLedger();
    var going = getJobsFromSheet().map(function(j) { return j && j.id; });
    ['EstimateStore', 'JobPlanStore', 'LogStore', 'MediaStore'].forEach(function(name) {
      try { going = going.concat(Object.keys(_readStoreBlob(name, {}) || {})); } catch (e) {}
    });
    try { (_readStoreBlob('ChangeOrderStore', []) || []).forEach(function(co) { if (co && co.jobId != null) going.push(co.jobId); }); } catch (e) {}
    _ledgerMarkSeen(ledger, going);
    Logger.log('Ledger now remembers ' + Object.keys(ledger.seen).length + ' job id(s) as deleted-if-absent');

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
  Logger.log('Done on the sheet. A device that still has the app open will SHOW the old clients');
  Logger.log('until it reloads or saves — but its next save is refused for those ids and it drops');
  Logger.log('them itself, so nothing comes back. Settings → This Device → Clear still works to');
  Logger.log('tidy a device straight away.');
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

// ══ JOB LEDGER — the sheet's memory of every job it has ever held ════════════════
// Reported 2026-09-08. Anthony cleared every row of the Jobs sheet by hand to start over.
// Ashley's laptop still had the app open from before, holding the old clients in memory.
// She added one new client; saveAllJobs sent the whole array; and the merge below — which
// unions by id and never drops a job missing from the payload — took the three deleted
// clients straight back. That union is the right rule for two devices that each hold a
// client the other has not seen. It is the wrong rule for a device holding a client the
// sheet DELIBERATELY no longer has, and the merge could not tell the two cases apart.
//
// Now it can. JobLedger is { since: ms, seen: { "<id>": firstSeenMs }, restore: {...} } —
// every job id the sheet has ever written. A job the ledger has seen and the Jobs sheet no
// longer holds was DELETED — by the deleteJob action, by resetAllJobDataConfirm, or by
// somebody deleting the row in the spreadsheet — and an incoming copy is refused, not
// merged. A job the ledger has never seen is new and goes in.
//
// Why a LEDGER of what was seen, rather than tombstones written by deleteJob: nothing runs
// when a row is deleted in the spreadsheet, so a tombstone written by the delete action
// would not exist for exactly the case that was reported.
//
// `since` closes the bootstrap gap. The ledger is seeded from the Jobs sheet the first time
// it is needed, so a job deleted BEFORE this deployment is in neither the sheet nor the
// ledger and would otherwise be taken as new. A job id is its creation time (id: Date.now()
// in the app), so a never-seen job created before the ledger existed, that the sheet does
// not hold, is refused too. That loses nothing: the sheet overwrites a device's job list
// wholesale on every reload, so such a job was already gone from every device that had
// reloaded since.
//
// ⚠ The ledger is NOT in RESET_JOB_STORES and must never be: it is the memory of the reset.
// To let a device put a job back on purpose, see allowJobRestoreConfirm.
var JOB_LEDGER_STORE = 'JobLedger';

function getJobLedger() {
  var led = _readStoreBlob(JOB_LEDGER_STORE, null);
  if (led && led.seen && led.since) { if (!led.restore) led.restore = {}; return led; }
  // First use: everything the sheet holds right now has been seen, as of now.
  led = { since: Date.now(), seen: {}, restore: {} };
  getJobsFromSheet().forEach(function(j) { if (j && j.id != null) led.seen[String(j.id)] = led.since; });
  _writeStoreBlob(JOB_LEDGER_STORE, led);
  return led;
}

// Record ids the Jobs sheet now holds. `seen` only ever grows; an id written after being
// allowed back (restore) is spent from that list, so the permission is single-use.
function _ledgerMarkSeen(ledger, ids) {
  var now = Date.now(), changed = false;
  (ids || []).forEach(function(id) {
    if (id == null || id === '') return;
    var k = String(id);
    if (!ledger.seen[k]) { ledger.seen[k] = now; changed = true; }
    if (ledger.restore && ledger.restore[k]) { delete ledger.restore[k]; changed = true; }
  });
  if (changed) _writeStoreBlob(JOB_LEDGER_STORE, ledger);
}

// '' to accept an incoming job (or a store record keyed by its id), else why it is refused:
//   'deleted'  — the ledger has seen this id and the Jobs sheet no longer holds it.
//   'predates' — never seen, not held, and created before the ledger existed.
// `present` is the { "<id>": true } map of what the Jobs sheet holds right now.
function _jobRefusal(id, created, present, ledger) {
  if (id == null || id === '') return '';
  var k = String(id);
  if (present[k]) return '';
  if (ledger.restore && ledger.restore[k]) return '';
  if (ledger.seen[k]) return 'deleted';
  var born = Number(id);
  if (!isFinite(born) || born < 1e12) born = Date.parse(created || '') || 0;
  if (born && born < ledger.since) return 'predates';
  return '';
}

function _presentJobIds(jobsArr) {
  var m = {};
  (jobsArr || []).forEach(function(j) { if (j && j.id != null) m[String(j.id)] = true; });
  return m;
}

// Every id the ledger has seen that the Jobs sheet no longer holds.
function _deletedJobIds(present, ledger) {
  return Object.keys(ledger.seen).filter(function(k) { return !present[k]; });
}

// Strip records for refused jobs out of a { jobId: ... } payload, returning the ids dropped.
// The keyed stores are what a stale device pushes right behind its job list, and each of
// their merges unions — so a refused job would come back as a headless estimate, plan or
// hours log if these were left alone.
function _stripRefusedJobKeys(obj, ctx) {
  if (!obj || typeof obj !== 'object') return [];
  ctx = ctx || _jobRefusalCtx();
  var present = ctx.present, ledger = ctx.ledger, dropped = [];
  Object.keys(obj).forEach(function(k) {
    if (_jobRefusal(k, null, present, ledger)) { delete obj[k]; dropped.push(k); }
  });
  if (dropped.length) Logger.log('Refused records for deleted job(s): ' + dropped.join(', '));
  return dropped;
}

// One read of the Jobs sheet and the ledger, shared by the strip and the sweep below.
// They ask the same two questions on every save; reading twice doubles the slowest part
// of the write for no benefit.
function _jobRefusalCtx() {
  return { present: _presentJobIds(getJobsFromSheet()), ledger: getJobLedger() };
}

// THE STANDING CLEANUP. Drop records already IN a store whose job the ledger has seen and
// the Jobs sheet no longer holds. _stripRefusedJobKeys refuses a deleted job's record on
// the way IN; nothing removed one that was already sitting in the store when its row was
// deleted, so orphans accumulated forever — invisible in the app (no job row means the
// estimate never renders), invisible in the sheet (they are inside a 45,000-character JSON
// cell), and serialized into every subsequent write, pushing the blob toward the per-cell
// character cap for no benefit at all.
//
// ⚠ ONLY the 'deleted' verdict, NEVER 'predates'. 'deleted' rests on a positive record:
// the ledger watched that id go into the sheet and the sheet no longer has it. 'predates'
// is an INFERENCE from absence, and an inference is not a thing to act on automatically on
// every save — one bad read of the Jobs sheet would take the whole store with it. Pre-ledger
// orphans are cleared by pruneOrphanRecordsConfirm, where a person decides.
//
// ⚠ AND IT REFUSES TO RUN AGAINST AN EMPTY JOBS SHEET, for the same reason: no jobs present
// makes every seen id look deleted. A genuinely empty sheet is what resetAllJobDataConfirm
// is for. Returns the keys removed; mutates the store in place.
function _sweepDeletedJobKeys(store, present, ledger) {
  var gone = [];
  if (!store || !present || !Object.keys(present).length) return gone;
  Object.keys(store).forEach(function(k) {
    if (_jobRefusal(k, null, present, ledger) === 'deleted') { delete store[k]; gone.push(k); }
  });
  if (gone.length) Logger.log('Swept records for deleted job(s): ' + gone.join(', '));
  return gone;
}

// Remove every keyed record belonging to these job ids, across ALL FIVE stores. ONE
// definition, shared by deleteJobFromSheet and pruneOrphanRecordsConfirm — two copies of
// "which stores hold job-keyed records" is precisely how MediaStore and ChangeOrderStore
// came to be missed by the delete path while the other three were purged correctly.
// Returns { StoreName: [ids removed] } so a caller can report what it really did.
function _purgeJobFromStores(ids) {
  var keys = {}, removed = {};
  (ids || []).forEach(function(id) { if (id != null && id !== '') keys[String(id)] = true; });
  if (!Object.keys(keys).length) return removed;
  // Four of the five are objects keyed by job id. _readStoreBlob answers null for a tab
  // that does not exist, which is left alone — never CREATE a store just to empty it.
  ['EstimateStore', 'JobPlanStore', 'LogStore', 'MediaStore'].forEach(function(name) {
    try {
      var store = _readStoreBlob(name, null);
      if (!store) return;
      var hit = Object.keys(store).filter(function(k) { return keys[k]; });
      if (!hit.length) return;
      hit.forEach(function(k) { delete store[k]; });
      _writeStoreBlob(name, store);
      removed[name] = hit;
    } catch (e) { Logger.log('purge ' + name + ': ' + e); }
  });
  // ChangeOrderStore is an ARRAY, filed under co.jobId rather than under its own key.
  try {
    var cos = _readStoreBlob('ChangeOrderStore', null);
    if (cos && cos.length) {
      var gone = [];
      var keep = cos.filter(function(co) {
        if (co && co.jobId != null && keys[String(co.jobId)]) {
          if (gone.indexOf(String(co.jobId)) < 0) gone.push(String(co.jobId));
          return false;
        }
        return true;
      });
      if (gone.length) { _writeStoreBlob('ChangeOrderStore', keep); removed.ChangeOrderStore = gone; }
    }
  } catch (e) { Logger.log('purge ChangeOrderStore: ' + e); }
  return removed;
}

// Run from the editor. Lists the ids the ledger will refuse — i.e. what a stale device
// would be prevented from putting back — with the client name where the estimate store
// still knows it.
function previewDeletedJobs() {
  var present = _presentJobIds(getJobsFromSheet()), ledger = getJobLedger();
  var gone = _deletedJobIds(present, ledger);
  Logger.log(gone.length + ' deleted job id(s) the sheet will refuse to take back:');
  var est = _readStoreBlob('EstimateStore', {}) || {};
  gone.forEach(function(k) {
    var name = est[k] && est[k].estimate && est[k].estimate.clientName ? ' — ' + est[k].estimate.clientName : '';
    Logger.log('  ' + k + name + '  (first seen ' + new Date(ledger.seen[k]).toISOString() + ')');
  });
  Logger.log("To let a device restore one on purpose, edit the call and run allowJobRestoreConfirm(['<id>']).");
}

// The escape hatch for a row deleted by mistake. Before the ledger a stale device would
// have put it back by accident; now nothing can, unless you say so here. Single-use: the
// permission is spent the moment a device writes the job. Takes the ids as an argument, so
// it cannot be run from the Run menu by accident — you edit the call.
function allowJobRestoreConfirm(ids) {
  if (!ids || !ids.length) { Logger.log("Pass the job id(s) to allow back, e.g. allowJobRestoreConfirm(['1757000000000'])"); return; }
  var ledger = getJobLedger();
  if (!ledger.restore) ledger.restore = {};
  ids.forEach(function(id) { ledger.restore[String(id)] = Date.now(); });
  _writeStoreBlob(JOB_LEDGER_STORE, ledger);
  Logger.log('The next device that saves ' + ids.join(', ') + ' will be allowed to put it back.');
}

// ORPHANED RECORDS — an estimate, plan, log or manifest whose job row is gone ══════
// Reported 2026-09-09: "why do they ever stay there? these are all dummy jobs." The sheet
// held FIVE estimates against ONE job — four practice clients cleared out of the Jobs tab
// by hand in July and August, whose estimates nobody ever removed. Invisible in the app (no
// job row, so the estimate never renders) and invisible in the sheet (they live inside a
// 45,000-character JSON cell), which is exactly why they went unnoticed for six weeks.
//
// From 2026-09-09 the save path sweeps this class automatically — see _sweepDeletedJobKeys.
// These two are for the records that predate the ledger, where the only evidence is absence
// and a person should look before anything is deleted. Same preview/confirm split as
// pruneQuoStale and resetAllJobDataConfirm, and deliberately NOT in doGet or doPost, so no
// HTTP request can reach them.

// Every job-keyed record the Jobs sheet has no row for, with the reason.
function _orphanJobRecords() {
  var present = _presentJobIds(getJobsFromSheet()), ledger = getJobLedger(), found = {};
  function note(k, name, why) {
    if (!found[k]) found[k] = { why: why, stores: [] };
    if (found[k].stores.indexOf(name) < 0) found[k].stores.push(name);
  }
  ['EstimateStore', 'JobPlanStore', 'LogStore', 'MediaStore'].forEach(function(name) {
    var store = _readStoreBlob(name, null);
    if (!store) return;
    Object.keys(store).forEach(function(k) {
      var why = _jobRefusal(k, null, present, ledger);
      if (why) note(k, name, why);
    });
  });
  (_readStoreBlob('ChangeOrderStore', null) || []).forEach(function(co) {
    if (!co || co.jobId == null) return;
    var why = _jobRefusal(co.jobId, null, present, ledger);
    if (why) note(String(co.jobId), 'ChangeOrderStore', why);
  });
  return { present: present, orphans: found };
}

function previewOrphanRecords() {
  var r = _orphanJobRecords(), ids = Object.keys(r.orphans);
  var est = _readStoreBlob('EstimateStore', {}) || {};
  Logger.log('This is a PREVIEW. Nothing has been deleted.');
  Logger.log('Jobs sheet holds ' + Object.keys(r.present).length + ' job(s).');
  if (!ids.length) { Logger.log('No orphaned records — every stored record has a job row.'); return; }
  Logger.log(ids.length + ' job id(s) with records but no row in Jobs:');
  ids.forEach(function(k) {
    var o = r.orphans[k], e = est[k] && est[k].estimate ? est[k].estimate : null;
    // The client NAME lived on the Jobs row and went with it; the estimate snapshot carries
    // only the service and the money. Print those so a person can still recognise the job.
    var what = e ? ('  ' + (e.svc || '?') + ' $' + (e.havellinTotal || 0)) : '';
    Logger.log('  ' + k + '  (' + (o.why === 'deleted' ? 'deleted' : 'predates the ledger')
      + ')  in ' + o.stores.join(', ') + what
      + '  created ' + new Date(Number(k)).toISOString().slice(0, 10));
  });
  Logger.log('');
  Logger.log('To clear them: run pruneOrphanRecordsConfirm().');
}

// Removes them. Contractors, vendors, referral partners and Drive are untouched — this
// only ever deletes records filed under a job id the Jobs sheet does not have.
function pruneOrphanRecordsConfirm(force) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var r = _orphanJobRecords(), ids = Object.keys(r.orphans);
    if (!ids.length) { Logger.log('Nothing to do — no orphaned records.'); return; }
    // ⚠ An empty Jobs sheet makes EVERY stored record look orphaned. That is either a bad
    // read or a sheet somebody just cleared by hand, and neither is a reason to delete every
    // estimate the business has. resetAllJobDataConfirm is the deliberate way to clear
    // everything; pass true here only if you really mean this one.
    if (!Object.keys(r.present).length && force !== true) {
      Logger.log('REFUSED: the Jobs sheet has no jobs, so all ' + ids.length
        + ' stored record(s) look orphaned.');
      Logger.log('Use resetAllJobDataConfirm() to clear everything, or');
      Logger.log('pruneOrphanRecordsConfirm(true) if you really mean to delete these.');
      return;
    }
    // Remember them before they go, so a stale device cannot push them back afterwards.
    _ledgerMarkSeen(getJobLedger(), ids);
    var removed = _purgeJobFromStores(ids);
    Object.keys(removed).forEach(function(name) {
      Logger.log('Cleared ' + removed[name].length + ' record(s) from ' + name);
    });
    Logger.log('Done — ' + ids.length + ' orphaned job id(s) cleared: ' + ids.join(', '));
  } finally {
    lock.releaseLock();
  }
}

// ══ ESTIMATE STORE (merge by jobId) ══════════════════════════════════════════════

function saveEstimateStore(incoming) {
  if (!incoming) return { dropped: [] };
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (e) {}
  try {
    var ctx = _jobRefusalCtx();
    var dropped = _stripRefusedJobKeys(incoming, ctx);
    var merged = _mergeStoreByKey(getEstimateStore(), incoming);
    _sweepDeletedJobKeys(merged, ctx.present, ctx.ledger);
    _writeStoreBlob('EstimateStore', merged);
    return { dropped: dropped };
  }
  finally { try { lock.releaseLock(); } catch (e) {} }
}

function getEstimateStore() {
  return _readStoreBlob('EstimateStore', {});
}

// ══ JOB PLAN STORE (merge by jobId) ══════════════════════════════════════════════

// ⚠⚠ A JOB PLAN MERGES PER KEY, NOT AS ONE RECORD. Reported 2026-09-11: Ashley locked
// every room on a job from the desk and none of it reached Anthony's machine. This store
// used _mergeStoreByKey, which keeps the newer WHOLE record for a jobId — right for a
// scalar, categorically wrong for the one surface two people work at the same time, one in
// the house and one at the desk. The last device to save any part of a plan overwrote all
// of it: her eight locked rooms lost to his one changed checkbox.
//
// ⚠ UNION BY KEY IS NOT ENOUGH ON ITS OWN. Every device posts the WHOLE store, so the
// loser's payload carries a value for every room the winner locked — the stale one it
// loaded beforehand. The choice per key therefore needs each key's OWN last-write time,
// which the app now stamps into `plan.at` as `'<kind>:<key>'`.
//
// ⚠ AN UNSTAMPED KEY IS THE WEAKEST CLAIM, NOT THE FRESHEST: it means that device never
// touched it, so it loses to a stamped one whatever the record's savedAt says. Falling back
// to savedAt would hand every untouched room to whoever saved last, which IS the defect.
// Only when NEITHER side carries a stamp does savedAt decide — exactly how a plan written
// before this deployment already behaved, so nothing legacy changes meaning.
var PLAN_KEYED_MAPS = ['rooms', 'collections', 'notes', 'tasks'];

function _planStamp(plan, kind, key) {
  var at = plan && plan.at;
  var v = at && at[kind + ':' + key];
  return (v === undefined || v === null || v === '') ? null : Number(v);
}

function _mergePlanRecord(cur, inc) {
  if (!cur) return inc;
  if (!inc) return cur;
  var curT = cur.savedAt ? Number(cur.savedAt) : 0;
  var incT = inc.savedAt ? Number(inc.savedAt) : 0;
  var newer = incT >= curT ? inc : cur;
  var older = newer === inc ? cur : inc;

  // Scalars follow the newer record; the keyed maps are resolved key by key below.
  var out = {};
  for (var k in newer) out[k] = newer[k];

  PLAN_KEYED_MAPS.forEach(function(kind) {
    var a = (cur && cur[kind]) || {}, b = (inc && inc[kind]) || {};
    var map = {}, key;
    for (key in a) map[key] = 1;
    for (key in b) map[key] = 1;
    var merged = {}, any = false;
    for (key in map) {
      any = true;
      var inA = Object.prototype.hasOwnProperty.call(a, key);
      var inB = Object.prototype.hasOwnProperty.call(b, key);
      if (!inA) { merged[key] = b[key]; continue; }
      if (!inB) { merged[key] = a[key]; continue; }
      var sA = _planStamp(cur, kind, key), sB = _planStamp(inc, kind, key);
      if (sA !== null && sB !== null) merged[key] = sB >= sA ? b[key] : a[key];
      else if (sA !== null)           merged[key] = a[key];
      else if (sB !== null)           merged[key] = b[key];
      else                            merged[key] = newer[kind] ? newer[kind][key] : b[key];
    }
    if (any) out[kind] = merged;
  });

  // The stamps themselves union, newest per key, or a device that did not touch a room
  // would drop the proof that the other one did.
  var at = {};
  [cur.at || {}, inc.at || {}].forEach(function(src) {
    for (var k in src) {
      var v = Number(src[k]);
      if (!(k in at) || v > at[k]) at[k] = v;
    }
  });
  for (var _k in at) { out.at = at; break; }
  return out;
}

function _mergePlanStore(existing, incoming) {
  var out = {};
  for (var k in existing) out[k] = existing[k];
  for (var k in incoming) out[k] = _mergePlanRecord(out[k], incoming[k]);
  return out;
}

function saveJobPlanStore(incoming) {
  if (!incoming) return { dropped: [] };
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (e) {}
  try {
    var ctx = _jobRefusalCtx();
    var dropped = _stripRefusedJobKeys(incoming, ctx);
    var merged = _mergePlanStore(getJobPlanStore(), incoming);
    _sweepDeletedJobKeys(merged, ctx.present, ctx.ledger);
    _writeStoreBlob('JobPlanStore', merged);
    return { dropped: dropped };
  }
  finally { try { lock.releaseLock(); } catch (e) {} }
}

function getJobPlanStore() {
  return _readStoreBlob('JobPlanStore', {});
}

// ══ CHANGE ORDER STORE (merge a flat array by co.id) ═════════════════════════════
// Payload is the full changeOrders ARRAY from the app. Union by id; newer updatedAt
// wins (id is the creation timestamp, a safe fallback). Never drops a change order.

function saveChangeOrderStore(incoming) {
  if (!incoming) return { dropped: [] };
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (e) {}
  try {
    // Change orders are keyed by their own id but belong to a job; refuse the ones whose job
    // the sheet has seen and no longer holds, the same way the job-keyed stores do.
    var ctx = _jobRefusalCtx();
    var present = ctx.present, ledger = ctx.ledger, dropped = [];
    incoming = (incoming || []).filter(function(co) {
      if (!co || co.jobId == null || !_jobRefusal(co.jobId, null, present, ledger)) return true;
      if (dropped.indexOf(co.jobId) < 0) dropped.push(co.jobId);
      return false;
    });
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
    // The array equivalent of _sweepDeletedJobKeys: same 'deleted'-only rule, same refusal
    // to act on an empty Jobs read, applied to the merged result rather than to a key set.
    var out = order.map(function(id) { return byId[id]; });
    if (Object.keys(present).length) {
      var swept = [];
      out = out.filter(function(co) {
        if (co && co.jobId != null && _jobRefusal(co.jobId, null, present, ledger) === 'deleted') {
          if (swept.indexOf(String(co.jobId)) < 0) swept.push(String(co.jobId));
          return false;
        }
        return true;
      });
      if (swept.length) Logger.log('Swept change orders for deleted job(s): ' + swept.join(', '));
    }
    _writeStoreBlob('ChangeOrderStore', out);
    return { dropped: dropped };
  } finally { try { lock.releaseLock(); } catch (e) {} }
}

function getChangeOrderStore() {
  return _readStoreBlob('ChangeOrderStore', []);
}

// ══ LOG STORE (merge { jobId: [entries] } by entry.id) ═══════════════════════════
// Payload is the jobLogs OBJECT keyed by jobId. Per job, union entries by id so log
// lines added on two devices for the same job are both kept.

function saveLogStore(incoming) {
  if (!incoming) return { dropped: [] };
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (e) {}
  try {
    var ctx = _jobRefusalCtx();
    var dropped = _stripRefusedJobKeys(incoming, ctx);
    var out = getLogStore();
    Object.keys(incoming).forEach(function(jid) {
      var inArr = incoming[jid] || [];
      var cur = out[jid] || [];
      var seen = {};
      cur.forEach(function(en) { if (en && en.id != null) seen[en.id] = true; });
      inArr.forEach(function(en) { if (en && en.id != null && !seen[en.id]) { cur.push(en); seen[en.id] = true; } });
      out[jid] = cur;
    });
    _sweepDeletedJobKeys(out, ctx.present, ctx.ledger);
    _writeStoreBlob('LogStore', out);
    return { dropped: dropped };
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
// let a second device wipe another device's client. Real deletions go through deleteJob,
// and a job the sheet has seen and no longer holds is REFUSED rather than merged back (see
// JOB LEDGER). Returns { dropped: [ids refused] } so the sender can drop them too.
function saveAllJobsToSheet(jobsArr) {
  var result = { dropped: [] };
  if (!jobsArr || !jobsArr.length) return result;
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
    var stored = getJobsFromSheet();
    var present = _presentJobIds(stored), ledger = getJobLedger();
    var byId = {}, order = [];
    stored.forEach(function(j) {
      if (j && j.id != null) { if (!(j.id in byId)) order.push(j.id); byId[j.id] = j; }
    });

    // Upsert each incoming job; newer updatedAt wins (missing timestamp counts as oldest).
    jobsArr.forEach(function(j) {
      if (!j || j.id == null) return;
      // A job the sheet has seen before and no longer holds was deleted while this device
      // still had it. Refuse it: merging it is how a cleared sheet refilled itself.
      if (_jobRefusal(j.id, j.created, present, ledger)) { result.dropped.push(j.id); return; }
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
    _ledgerMarkSeen(ledger, order);
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
  if (result.dropped.length) Logger.log('saveAllJobs refused ' + result.dropped.length + ' deleted job(s): ' + result.dropped.join(', '));
  return result;
}

// Single-job upsert. Takes the SAME script lock and applies the SAME newest-wins
// guard as saveAllJobsToSheet, so this per-record path (fired from ~20 edit sites)
// can no longer race the bulk write and clobber a job row. Two devices editing two
// different jobs are always safe; two editing the SAME job resolve by updatedAt.
function saveJobToSheet(job) {
  var result = { dropped: [] };
  if (!job || job.id == null) return result;
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
    // Same refusal as the bulk path: ~20 edit sites fire this per record, and an edit made
    // on a stale device to a job the sheet has deleted must not re-create the row.
    var ledger = getJobLedger();
    if (rowIndex < 0 && _jobRefusal(job.id, job.created, {}, ledger)) {
      result.dropped.push(job.id);
      Logger.log('saveJob refused deleted job ' + job.id);
      return result;
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
      _ledgerMarkSeen(ledger, [job.id]);
    }
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
  return result;
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
  // Remember it. Normally already seen; this covers a row somebody typed into the sheet by
  // hand, which no write ever recorded. Absent from the sheet + seen = refused from now on.
  try { _ledgerMarkSeen(getJobLedger(), [id]); } catch (e) { Logger.log('ledger on delete ' + id + ': ' + e); }
  // Purge the job's records from the keyed stores too. Deleting a job used to remove only
  // the Jobs row, so its estimate, job plan and logs stayed behind forever — invisible in
  // the app, but still serialized into every subsequent write. That is how the sheet ends
  // up holding more estimates than the app has jobs, and every orphan pushes the blob
  // closer to the per-cell character cap for no benefit at all.
  //
  // Deliberately keyed on the same id the app uses, and silent about a miss: a job with no
  // estimate is normal, not an error.
  // ⚠ THIS USED TO PURGE ONLY THREE OF THE FIVE STORES — MediaStore and ChangeOrderStore
  // were missed, so deleting a client through the app left their whole inventory manifest
  // (photo refs, custody log, appraisal waivers) and every change order in the sheet
  // forever. _purgeJobFromStores is the one list; add a store there, not here.
  var removed = _purgeJobFromStores([id]);
  Object.keys(removed).forEach(function(name) { Logger.log('Purged ' + name + ' for ' + id); });
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

// Every file in `folder` carrying exactly this name.
//
// ⚠ DO NOT COLLAPSE THIS BACK TO folder.getFilesByName(). That is what uploadHtmlToDrive
// used, and on a SHARED DRIVE it can come back empty for files that are plainly there —
// the same class of failure this project already hit with drive.files.get answering
// "File not found" for a file DriveApp opens fine (see _driveThumbnail). When the lookup
// finds nothing, the caller's "remove the old copy first" step silently does nothing and
// every save creates another file. Reported 2026-09-09: "save to drive creates dupes
// endlessly if you keep hitting it."
//
// So both sources are asked and the results unioned by id: DriveApp for the ordinary case,
// and the advanced Drive service WITH supportsAllDrives/includeItemsFromAllDrives, which is
// the one that actually answers on a Shared Drive.
function _filesNamedInFolder(folder, name) {
  var byId = {}, out = [];
  function add(f) { if (f && !byId[f.getId()]) { byId[f.getId()] = 1; out.push(f); } }

  try {
    var it = folder.getFilesByName(name);
    while (it.hasNext()) add(it.next());
  } catch (e) { Logger.log('_filesNamedInFolder DriveApp: ' + e); }

  try {
    if (typeof Drive !== 'undefined' && Drive.Files && Drive.Files.list) {
      var q = "'" + folder.getId() + "' in parents and title = '" + String(name).replace(/'/g, "\\'") +
              "' and trashed = false";
      var res = Drive.Files.list({
        q: q, maxResults: 100,
        supportsAllDrives: true, includeItemsFromAllDrives: true
      });
      var items = (res && (res.items || res.files)) || [];
      for (var i = 0; i < items.length; i++) {
        try { add(DriveApp.getFileById(items[i].id)); } catch (e2) {}
      }
    }
  } catch (e3) { Logger.log('_filesNamedInFolder Drive API: ' + e3); }

  return out;
}

// Render HTML to a PDF and put it in the job folder under a STABLE name, replacing what is
// already there rather than adding beside it.
//
// The first match is updated IN PLACE where the advanced Drive service allows it, so the
// file keeps its id — which matters because the app stamps job.estimateDriveUrl with it and
// counsel may already have the link. Any further copies under the same name are trashed
// (never deleted — Drive's 30-day undo is the safety net), so the first save after this
// change collapses a folder that has already accumulated duplicates back down to one file.
function uploadHtmlToDrive(folderId, filename, html) {
  try {
    var folder = DriveApp.getFolderById(folderId);
    var pdfName = filename.replace(/\.(html?|pdf)$/i, '') + '.pdf';
    var htmlBlob = Utilities.newBlob(html, 'text/html', pdfName);
    var pdfBlob = htmlBlob.getAs('application/pdf').setName(pdfName);

    var existing = _filesNamedInFolder(folder, pdfName);
    var file = null, replaced = false, removed = 0;

    if (existing.length) {
      // Update the oldest copy in place; that is the one whose link has been handed out.
      existing.sort(function(a, b){ return a.getDateCreated() - b.getDateCreated(); });
      var keep = existing[0];
      try {
        if (typeof Drive !== 'undefined' && Drive.Files && Drive.Files.update) {
          Drive.Files.update({}, keep.getId(), pdfBlob, { supportsAllDrives: true });
          file = keep; replaced = true;
        }
      } catch (eUpd) { Logger.log('uploadHtmlToDrive in-place update failed: ' + eUpd); }
      if (!file) { try { keep.setTrashed(true); removed++; } catch (eT) {} }
      for (var i = 1; i < existing.length; i++) {
        try { existing[i].setTrashed(true); removed++; } catch (eT2) {}
      }
    }

    if (!file) file = folder.createFile(pdfBlob);

    return { ok: true, fileUrl: file.getUrl(), fileId: file.getId(),
             replaced: replaced, duplicatesRemoved: removed };
  } catch (error) {
    Logger.log('uploadHtmlToDrive error: ' + error.toString());
    return { ok: false, error: error.toString() };
  }
}

// Report what a job folder is actually holding, and collapse duplicate names down to the
// newest copy. Run from the editor with a folder id when a folder looks wrong.
//
// Deliberately NOT reachable over HTTP and split preview/confirm, the same shape as
// previewReset / resetAllJobDataConfirm — this trashes files, and a destructive action must
// not be one malformed URL away.
function previewFolderDuplicates(folderId) {
  var folder = DriveApp.getFolderById(folderId);
  var seen = {}, it = folder.getFiles(), n = 0;
  while (it.hasNext()) { var f = it.next(); (seen[f.getName()] = seen[f.getName()] || []).push(f); n++; }
  Logger.log('Folder "%s" holds %s files (DriveApp view).', folder.getName(), n);
  Object.keys(seen).sort().forEach(function(name){
    Logger.log('  %s x%s%s', name, seen[name].length, seen[name].length > 1 ? '   <-- DUPLICATE' : '');
  });
  return seen;
}

function dedupeFolderConfirm(folderId) {
  var seen = previewFolderDuplicates(folderId), removed = 0;
  Object.keys(seen).forEach(function(name){
    var list = seen[name];
    if (list.length < 2) return;
    list.sort(function(a, b){ return b.getLastUpdated() - a.getLastUpdated(); });  // newest first
    for (var i = 1; i < list.length; i++) { list[i].setTrashed(true); removed++; }
  });
  Logger.log('Trashed %s duplicate file(s). They are recoverable from Drive trash for 30 days.', removed);
  return removed;
}

// Convert HTML to a PDF and hand the BYTES back, without writing anything to Drive.
//
// This exists so the app can attach the client estimate to a Gmail draft. The alternative
// was to read back the copy already filed to Drive, which needs a Drive scope on top of
// the Gmail one and only works for a signed-in user who can see that Shared Drive — the
// browser is not necessarily the Havellin account. This runs AS the Havellin account,
// needs no extra scope, and reuses the SAME conversion that produces the filed copy, so
// the attachment and the document in the client's folder cannot be different renderings.
//
// Deliberately no folderId: nothing is stored. The response is base64, so it inflates by
// ~33% — Apps Script caps a response around 50MB and these documents run well under 1MB.
function htmlToPdfBase64(html) {
  try {
    if (!html) return { ok: false, error: 'No html supplied' };
    var pdf = Utilities.newBlob(html, 'text/html', 'estimate.pdf').getAs('application/pdf');
    return { ok: true, base64: Utilities.base64Encode(pdf.getBytes()), bytes: pdf.getBytes().length };
  } catch (error) {
    Logger.log('htmlToPdfBase64 error: ' + error.toString());
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
