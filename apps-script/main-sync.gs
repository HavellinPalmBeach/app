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
var BACKEND_VERSION = '2026-09-18c';
var BACKEND_ACTIONS = [
  'createFolder', 'uploadFile', 'uploadHtml', 'htmlToPdf', 'getSubfolders',
  'getThumbnails', 'shareFolder', 'unshareFolder', 'esignSend', 'esignStatus', 'esignArchive',
  'stripeLink', 'stripeStatus'
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
    if (data.action === 'esignSend')     { return jsonOut(esignSendEnvelope(data)); }
    if (data.action === 'esignStatus')   { return jsonOut(esignEnvelopeStatus(data)); }
    if (data.action === 'esignArchive')  { return jsonOut(esignArchiveEnvelope(data)); }
    if (data.action === 'stripeLink')    { return jsonOut(stripeCreatePaymentLink(data)); }
    if (data.action === 'stripeStatus')  { return jsonOut(stripePaymentsForLink(data)); }

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

// ══ THE JOB RECORD MERGES PER KEY TOO ════════════════════════════════════════════
//
// ⚠⚠ A JOB IS NOT A SCALAR, AND MERGING IT AS ONE DESTROYS MONEY. Found 2026-09-12 by
// auditing what else still merged the way the job plan did before the 09-11 fix. Both
// job paths took the newer WHOLE record on updatedAt — and a job carries several
// independently-edited sub-records: job.payments[] (what the client actually paid),
// job.docState{} (which documents have gone out and been filed), job.appraisers[] and
// job.invSnapshots[]. Driven on this function, both devices holding the morning's copy:
// the desk records a $12,857 deposit cheque at 2pm; the house marks the agreement signed
// at 3pm without having reloaded; the sheet ends up with the signature and NO PAYMENT.
// Nothing on either screen says so.
//
// ⚠ The rule is the job plan's rule, and deliberately the same mechanism rather than a
// second one: keyed sub-records resolve KEY BY KEY against `job.at['<kind>:<key>']`, and
// AN UNSTAMPED KEY IS THE WEAKEST CLAIM — it means that device never touched it, so it
// loses to a stamped one whatever updatedAt says. Everything else on the job is a scalar
// somebody sets, and there the newer record is genuinely right.
//
// ⚠ A STAMP WITH NO VALUE IS A REMOVAL. That is what lets removeAppraiser and
// removeInventorySnapshot survive a merge from a device that still holds the record live:
// absence ALONE is never a deletion (that is how a stale laptop resurrects things), but
// absence plus a touch means this device took it out. The stamps union newest-per-key, so
// the removal keeps winning against every later stale save.
var JOB_KEYED_LISTS = ['payments', 'appraisers', 'invSnapshots'];
var JOB_KEYED_MAPS  = ['docState'];
// Per-list identity. ⚠ `payments` used to be minted `max(id)+1` PER DEVICE, so two people
// each recording a payment both produced the same id and union-by-id would fuse two real
// payments into one. The app mints a uid now; `id` stays the fallback so a payment written
// before this deployment still has a key, exactly as _srcLineKey keeps its index fallback.
var JOB_LIST_KEY = { payments: 'uid', appraisers: 'id', invSnapshots: 'ts' };

function _jobStamp(job, kind, key) {
  var at = job && job.at;
  var v = at && at[kind + ':' + key];
  return (v === undefined || v === null || v === '') ? null : Number(v);
}

function _jobListKey(kind, rec) {
  if (!rec) return null;
  var v = rec[JOB_LIST_KEY[kind]];
  if (v === undefined || v === null || v === '') v = rec.id;
  return (v === undefined || v === null || v === '') ? null : String(v);
}

// Resolve one keyed collection given both sides as {key: value} views. Shared by the list
// and the map shapes so there is ONE copy of the rule; two copies is how the two shapes
// would come to disagree about what a stamp means.
function _mergeJobKeyed(cur, inc, kind, a, b, incIsNewer) {
  var keys = {}, k;
  for (k in a) keys[k] = 1;
  for (k in b) keys[k] = 1;
  var out = {}, order = [];
  for (k in a) order.push(k);
  for (k in b) if (!Object.prototype.hasOwnProperty.call(a, k)) order.push(k);
  for (var i = 0; i < order.length; i++) {
    k = order[i];
    var inA = Object.prototype.hasOwnProperty.call(a, k);
    var inB = Object.prototype.hasOwnProperty.call(b, k);
    var sA = _jobStamp(cur, kind, k), sB = _jobStamp(inc, kind, k);
    if (!inA) {
      // Stamped on the side that does NOT have it, and no newer stamp opposite: removed.
      if (sA !== null && (sB === null || sA > sB)) continue;
      out[k] = b[k]; continue;
    }
    if (!inB) {
      if (sB !== null && (sA === null || sB > sA)) continue;
      out[k] = a[k]; continue;
    }
    if (sA !== null && sB !== null) out[k] = sB >= sA ? b[k] : a[k];
    else if (sA !== null)           out[k] = a[k];
    else if (sB !== null)           out[k] = b[k];
    else                            out[k] = incIsNewer ? b[k] : a[k];
  }
  out.__order = order;
  return out;
}

function _mergeJobRecord(cur, inc) {
  if (!cur) return inc;
  if (!inc) return cur;
  var curT = Number(cur.updatedAt || 0), incT = Number(inc.updatedAt || 0);
  var incIsNewer = incT >= curT;

  // Scalars follow the newer record; the keyed sub-records are resolved below.
  var out = {}, k;
  var newer = incIsNewer ? inc : cur;
  for (k in newer) out[k] = newer[k];

  JOB_KEYED_LISTS.forEach(function(kind) {
    var aArr = (cur[kind] && cur[kind].length !== undefined) ? cur[kind] : null;
    var bArr = (inc[kind] && inc[kind].length !== undefined) ? inc[kind] : null;
    if (!aArr && !bArr) return;
    var a = {}, b = {}, i, key;
    for (i = 0; i < (aArr || []).length; i++) { key = _jobListKey(kind, aArr[i]); if (key !== null && !(key in a)) a[key] = aArr[i]; }
    for (i = 0; i < (bArr || []).length; i++) { key = _jobListKey(kind, bArr[i]); if (key !== null && !(key in b)) b[key] = bArr[i]; }
    var m = _mergeJobKeyed(cur, inc, kind, a, b, incIsNewer);
    var order = m.__order; delete m.__order;
    var list = [];
    for (i = 0; i < order.length; i++) if (Object.prototype.hasOwnProperty.call(m, order[i])) list.push(m[order[i]]);
    out[kind] = list;
  });

  JOB_KEYED_MAPS.forEach(function(kind) {
    var a = (cur[kind] && typeof cur[kind] === 'object') ? cur[kind] : null;
    var b = (inc[kind] && typeof inc[kind] === 'object') ? inc[kind] : null;
    if (!a && !b) return;
    var m = _mergeJobKeyed(cur, inc, kind, a || {}, b || {}, incIsNewer);
    delete m.__order;
    out[kind] = m;
  });

  // The stamps themselves union, newest per key — a device that did not touch a payment
  // would otherwise drop the proof that the other one did, and the record would be
  // contested again on the next save.
  var at = {};
  [cur.at || {}, inc.at || {}].forEach(function(src) {
    for (var key in src) {
      var v = Number(src[key]);
      if (!(key in at) || v > at[key]) at[key] = v;
    }
  });
  for (var _k in at) { out.at = at; break; }
  return out;
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
      // ⚠⚠ A DELETED HOURS ENTRY USED TO BE UNDELETABLE. This unioned by id and only ever
      // ADDED, so deleteLogEntry's splice never reached the sheet at all: the entry came
      // straight back to the deleting device on its next page load, and it bills the
      // client, because the final invoice trues labour to this log. Measured 2026-09-12 —
      // delete a mis-typed 8 hr line, log tomorrow's hours, and the job goes 21 hrs to 26.
      //
      // ⚠ A VOID WINS OVER A LIVE COPY, from either side, and the removal has to travel as
      // a RECORD rather than as an absence. Every device posts the whole log, so a device
      // that simply has not seen an entry omits it too — absence can never mean deletion
      // here. Same rule the inventory and the custody log already follow.
      var byId = {}, order = [];
      cur.forEach(function(en) { if (en && en.id != null) { if (!(en.id in byId)) order.push(en.id); byId[en.id] = en; } });
      inArr.forEach(function(en) {
        if (!en || en.id == null) return;
        var was = byId[en.id];
        if (!was) { order.push(en.id); byId[en.id] = en; return; }
        if (en.deletedAt && !was.deletedAt) byId[en.id] = en;
      });
      out[jid] = order.map(function(id) { return byId[id]; });
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
      // Per key, not per record — see _mergeJobRecord. Taking the newer whole job here is
      // what destroyed a recorded deposit cheque when the other device marked the
      // agreement signed against its own morning copy.
      if (!cur) { order.push(j.id); byId[j.id] = j; return; }
      byId[j.id] = _mergeJobRecord(cur, j);
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
    // Newest-wins on the SCALARS, per key on the sub-records. This used to return early
    // when the stored row was newer, which threw away the incoming device's payments and
    // docState wholesale; and when the incoming row was newer it overwrote the stored
    // ones. ~20 edit sites fire this per record, so both directions were live.
    if (rowIndex > 0) {
      var stored = null;
      try { stored = JSON.parse(data[rowIndex - 1][11]); } catch (e) {}
      if (stored) job = _mergeJobRecord(stored, job);
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

// ══ DOCUSIGN — JWT GRANT, ENVELOPE SEND, STATUS POLL ════════════════════════════
// Anthony, 2026-09-17: *"I want to start wiring up DocuSign so we can actually send out an
// agreement for signature."* The app-side signature RECORD shipped 2026-09-11 (Slice 6)
// shaped for exactly this; what follows is the provider behind it.
//
// ⚠⚠ THIS IS IN main-sync.gs RATHER THAN ITS OWN FILE, AND THAT IS A DELIBERATE REVERSAL OF
// THE quo-sync.gs PRECEDENT. Quo is a second file in the same project and that is right for
// it: nothing in the app calls it, it runs on a trigger, and it can be a version behind
// without the app ever noticing. THIS is on the app's REQUEST PATH, so it must move in
// lockstep with BACKEND_VERSION, BACKEND_ACTIONS and the dispatch-parity test. A second
// file somebody has to remember to paste is precisely the failure this project already
// paid six weeks for — see DEPLOYMENT IDENTITY at the top of this file.
//
// ⚠⚠ EVERY SECRET IS IN SCRIPT PROPERTIES AND NONE IS IN THIS FILE. This repo is public and
// havellin.html is served from GitHub Pages, so a private key in either is not a key. Same
// place QUO_API_KEY lives. Set these five (Project Settings ▸ Script Properties):
//     DS_INTEGRATION_KEY  the app's client id — a GUID, semi-public like any OAuth client id
//     DS_USER_ID          the user the integration impersonates (API Username on Apps & Keys)
//     DS_ACCOUNT_ID       API Account ID
//     DS_BASE_URI         https://demo.docusign.net  (sandbox)  or the production base URI
//     DS_PRIVATE_KEY      the RSA private key, INCLUDING the BEGIN/END lines
//
// ⚠ THE ENVIRONMENT IS DERIVED FROM DS_BASE_URI, NEVER CONFIGURED SEPARATELY. Two fields
// that must agree is two fields that can disagree, and the failure mode is silent: a demo
// key against the production auth host answers `consent_required` forever, which reads as
// "consent was never granted" rather than "you are pointed at the wrong environment".
var DS_AUTH_HOST_DEMO = 'account-d.docusign.com';
var DS_AUTH_HOST_PROD = 'account.docusign.com';
var DS_JWT_SCOPES     = 'signature impersonation';
var DS_TOKEN_TTL_SEC  = 3600;   // DocuSign's own ceiling for a JWT assertion

// ⚠ THE ANCHOR STRINGS, AND THEY MUST MATCH havellin.html's `esignAnchor` EXACTLY. These
// are the invisible markers DocuSign finds in the PDF text layer to place each signature
// box. Two copies of one string is how the tab silently stops being placed, so a test in
// tests/esign-docusign.test.js asserts this table and the app's agree, key for key.
var DS_ANCHORS = {
  clientSig:  '/hsc/',
  clientDate: '/hdc/',
  havSig:     '/hsh/',
  havDate:    '/hdh/',
  mktOptOut:  '/mko/'
};
// ⚠⚠ THE FOUR THAT ARE ON EVERY AGREEMENT, AND THE ONE THAT IS NOT. `mktOptOut` renders on the
// living-client form and on no estate one — Havellin does not market estate work — so placing it
// blind would make DocuSign refuse every estate envelope over an anchor that is correctly absent.
// The APP measures the document it is sending (`esignAnchorsPresent`) and names what it carries;
// this list is what gets placed regardless, because their absence really is a defect.
var DS_REQUIRED_ANCHORS = ['clientSig', 'clientDate', 'havSig', 'havDate'];

// ⚠ ONE PLACE TO TUNE THE TAB POSITION, AND IT NEEDS ONE VISUAL CHECK IN THE SANDBOX BEFORE
// ANYTHING GOES TO A CLIENT. The anchor sits at the TOP of a 36px `.sig-line` box whose
// visible rule is at its foot, so the tab has to be pushed DOWN to land on the line. The
// figure below is a considered first guess and nothing more — it cannot be derived, because
// it depends on how Apps Script's HTML-to-PDF conversion lays the box out. Send one envelope
// to yourself, look at where the box lands, change this number, send another.
var DS_TAB_Y_OFFSET = '14';

function _dsProp(name) {
  return (PropertiesService.getScriptProperties().getProperty(name) || '').trim();
}
function _dsIsDemo()   { return _dsProp('DS_BASE_URI').indexOf('demo.') !== -1; }
function _dsAuthHost() { return _dsIsDemo() ? DS_AUTH_HOST_DEMO : DS_AUTH_HOST_PROD; }

// Which of the five are missing, named. A single "not configured" is what turns a
// twenty-second fix into a support thread — this file already records that lesson on the
// PDF-conversion error, which took three rounds because it carried no cause.
function _dsMissingProps() {
  return ['DS_INTEGRATION_KEY', 'DS_USER_ID', 'DS_ACCOUNT_ID', 'DS_BASE_URI', 'DS_PRIVATE_KEY']
    .filter(function (k) { return !_dsProp(k); });
}

// ─── ACCESS TOKEN ────────────────────────────────────────────────────────────────
// ⚠ CACHED, AND THAT IS NOT AN OPTIMISATION. The status poll runs every five minutes, so an
// uncached mint is ~288 assertions a day against an endpoint DocuSign rate-limits, and a
// throttled token failure would surface as "the envelope vanished". Held 50 minutes against
// a 60-minute token, so a request can never set off with a token that expires mid-flight.
function _dsAccessToken() {
  var missing = _dsMissingProps();
  if (missing.length) return { ok: false, error: 'DocuSign is not configured — missing Script Properties: ' + missing.join(', ') };

  var cache = CacheService.getScriptCache();
  try {
    var hit = cache.get('ds_access_token');
    if (hit) return { ok: true, token: hit, cached: true };
  } catch (e) { /* a cache miss must never be fatal — fall through and mint */ }

  var now = Math.floor(Date.now() / 1000);
  var header = { alg: 'RS256', typ: 'JWT' };
  var claims = {
    iss:   _dsProp('DS_INTEGRATION_KEY'),
    sub:   _dsProp('DS_USER_ID'),
    aud:   _dsAuthHost(),          // the HOST alone, no scheme and no trailing slash
    iat:   now,
    exp:   now + DS_TOKEN_TTL_SEC,
    scope: DS_JWT_SCOPES
  };

  var signingInput = _dsB64Url(JSON.stringify(header)) + '.' + _dsB64Url(JSON.stringify(claims));

  // ⚠⚠ DOCUSIGN ISSUES PKCS#1 AND APPS SCRIPT SIGNS ONLY WITH PKCS#8, SO THE SCRIPT CONVERTS IT
  // ITSELF. "+ GENERATE RSA" hands back `-----BEGIN RSA PRIVATE KEY-----`;
  // `Utilities.computeRsaSha256Signature` accepts only `-----BEGIN PRIVATE KEY-----` and throws on
  // the other. The first build REFUSED a PKCS#1 key and printed an `openssl` command — correct, and
  // the wrong answer: it put a terminal session and a clipboard dance between a person and a
  // working integration, and the one person who tried it pasted the key onto the same line as the
  // command and put it through his shell history. Converting is a fixed ASN.1 wrap, so the script
  // does it and the property holds whatever DocuSign gave you.
  var key = _dsSigningKey();
  if (key && key.dsError) return { ok: false, error: key.dsError };

  var sig;
  try {
    sig = Utilities.base64EncodeWebSafe(
      Utilities.computeRsaSha256Signature(signingInput, key)
    ).replace(/=+$/, '');
  } catch (e) {
    // Past the format check, so this is the other half: BEGIN/END lines missing outright, or the
    // line breaks eaten by a copy through a chat window.
    return { ok: false, error: 'Could not sign the JWT — check DS_PRIVATE_KEY is the full key including the BEGIN and END lines. (' + e + ')' };
  }

  var res = UrlFetchApp.fetch('https://' + _dsAuthHost() + '/oauth/token', {
    method: 'post',
    payload: {
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: signingInput + '.' + sig
    },
    muteHttpExceptions: true
  });

  var code = res.getResponseCode();
  var body = {};
  try { body = JSON.parse(res.getContentText()); } catch (e) {}

  if (code !== 200 || !body.access_token) {
    // ⚠ `consent_required` IS THE ONE ERROR WITH A SPECIFIC, ACTIONABLE FIX, so it gets the
    // consent URL built from the live values rather than a generic failure. Everything else
    // prescribes nothing — the rule this project already learned on _pdfFailAdvice.
    if (String(body.error || '') === 'consent_required') {
      return { ok: false, needsConsent: true, consentUrl: dsConsentUrl(),
               error: 'DocuSign has not been granted consent to impersonate this user yet. Open the consent URL once and click Allow.' };
    }
    return { ok: false, error: 'DocuSign auth failed (HTTP ' + code + '): ' + (body.error_description || body.error || res.getContentText().slice(0, 300)) };
  }

  try { cache.put('ds_access_token', body.access_token, 3000); } catch (e) {}
  return { ok: true, token: body.access_token, cached: false };
}

// Base64url with the padding stripped — a JWT segment is not standard base64 and a trailing
// '=' is rejected outright by the token endpoint.
function _dsB64Url(str) {
  return Utilities.base64EncodeWebSafe(Utilities.newBlob(str).getBytes()).replace(/=+$/, '');
}

// ─── PKCS#1 → PKCS#8 ─────────────────────────────────────────────────────────────
// A PKCS#1 RSAPrivateKey becomes a PKCS#8 PrivateKeyInfo by wrapping it, unchanged, in:
//   SEQUENCE { INTEGER 0, SEQUENCE { OID rsaEncryption, NULL }, OCTET STRING { <the PKCS#1 DER> } }
// No key material is touched — only a header is added — so this cannot alter or weaken the key.
// Verified byte-for-byte against `openssl pkcs8 -topk8` on a real 2048-bit key, and the output
// re-validated with `openssl rsa -check`.
//
// ⚠ APPS SCRIPT BYTE ARRAYS ARE SIGNED (-128..127). `Utilities.base64Decode` returns signed bytes
// and `Utilities.base64Encode` expects them, while DER is naturally unsigned 0..255 — every byte in
// the fixed prefix below is above 127. Everything is built unsigned and converted once at each
// edge; mixing the two silently produces a corrupt key that fails as an opaque signing error.
var DS_RSA_ALG_ID = [0x30,0x0d,0x06,0x09,0x2a,0x86,0x48,0x86,0xf7,0x0d,0x01,0x01,0x01,0x05,0x00];

function _dsDerLen(n) {
  if (n < 0x80)    return [n];
  if (n < 0x100)   return [0x81, n];
  if (n < 0x10000) return [0x82, (n >> 8) & 0xff, n & 0xff];
  return [0x83, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

// The key the signer actually uses. A PKCS#8 key is handed back untouched; a PKCS#1 one is wrapped.
// Returns {dsError} rather than throwing, so the caller can report a cause instead of a stack.
function _dsSigningKey() {
  var pem = _dsProp('DS_PRIVATE_KEY');
  if (!pem) return { dsError: 'DS_PRIVATE_KEY is empty.' };
  if (pem.indexOf('BEGIN RSA PRIVATE KEY') === -1) return pem;   // already PKCS#8, or not a PEM

  try {
    var der = Utilities.base64Decode(pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, ''));
    var i, body = [0x02, 0x01, 0x00].concat(DS_RSA_ALG_ID, [0x04], _dsDerLen(der.length));
    // ⚠ THE DECODED BYTES GO IN AS THEY CAME — SIGNED — AND ARE NOT NORMALISED FIRST. Doing it at
    // both edges is a round trip that cancels itself out (a signed -34 and an unsigned 222 are the
    // same byte and encode identically), so it reads as a safeguard while testing nothing. One
    // normalisation, at the output edge, where it is the only thing standing between the fixed
    // prefix below and a corrupt key.
    for (i = 0; i < der.length; i++) body.push(der[i]);
    var out = [0x30].concat(_dsDerLen(body.length), body);
    // Every byte of DS_RSA_ALG_ID and most DER lengths are above 127; Utilities.base64Encode takes
    // a SIGNED Byte[] and an out-of-range value is not silently coerced.
    for (i = 0; i < out.length; i++) if (out[i] > 127) out[i] -= 256;
    return '-----BEGIN PRIVATE KEY-----\n'
         + (Utilities.base64Encode(out).match(/.{1,64}/g) || []).join('\n')
         + '\n-----END PRIVATE KEY-----';
  } catch (e) {
    return { dsError: 'DS_PRIVATE_KEY could not be read. Paste the whole key from DocuSign, '
           + 'including the BEGIN and END lines. (' + e + ')' };
  }
}

// The one-time consent URL, built from the live properties so it can never name a different
// integration key than the one actually failing.
function dsConsentUrl(redirectUri) {
  var redirect = redirectUri || 'https://havellinpalmbeach.github.io/app/';
  return 'https://' + _dsAuthHost() + '/oauth/auth'
       + '?response_type=code'
       + '&scope=' + encodeURIComponent(DS_JWT_SCOPES)
       + '&client_id=' + encodeURIComponent(_dsProp('DS_INTEGRATION_KEY'))
       + '&redirect_uri=' + encodeURIComponent(redirect);
}

function _dsApi(method, path, payload) {
  var tok = _dsAccessToken();
  if (!tok.ok) return { ok: false, code: 0, body: tok };

  var opts = {
    method: method,
    headers: { Authorization: 'Bearer ' + tok.token },
    contentType: 'application/json',
    muteHttpExceptions: true
  };
  if (payload) opts.payload = JSON.stringify(payload);

  var url = _dsProp('DS_BASE_URI').replace(/\/+$/, '')
          + '/restapi/v2.1/accounts/' + _dsProp('DS_ACCOUNT_ID') + path;
  var res = UrlFetchApp.fetch(url, opts);
  var body = {};
  try { body = JSON.parse(res.getContentText()); } catch (e) { body = { raw: res.getContentText().slice(0, 300) }; }
  return { ok: res.getResponseCode() < 300, code: res.getResponseCode(), body: body };
}

// ─── SEND FOR SIGNATURE ──────────────────────────────────────────────────────────
// ⚠⚠ TWO RECIPIENTS WITH A ROUTING ORDER, NOT ONE, AND THE DOCUMENT IS WHY. Both agreement
// forms carry a Havellin signature block beside the client's, and the probate form states
// outright that *"No work will begin until both signatures are obtained"*. A client-only
// envelope would come back `completed` over a contract Havellin never signed — and
// applyEsignStatus would then record it as signed, which is the exact false claim the
// signature record exists to prevent. Client signs first (order 1), Havellin countersigns
// (order 2); DocuSign only reports `completed` when BOTH are done, so the app-side rule
// "only `completed` is a signature" carries the countersignature for free.
//
// ⚠ TABS ARE PLACED BY ANCHOR, NEVER BY x/y. The signing packet's length varies with the
// estimate attached as Exhibit A, so a fixed page-and-coordinate would drift onto the wrong
// page the moment a job has one more room than the last one.
function esignSendEnvelope(data) {
  try {
    if (!data || !data.pdfBase64) return { ok: false, error: 'No document supplied to send.' };
    if (!data.signerEmail || !data.signerName) return { ok: false, error: 'The envelope needs the signer name and email.' };

    // ⚠⚠ THE COUNTERSIGNATURE GOES TO A PERSON, NOT TO THE DEPARTMENT GROUP, AND THAT IS A
    // CORRECTNESS RULE RATHER THAN A PREFERENCE. It used to default to agreements@, which is a
    // Google Group: whoever opened it first would sign, and the certificate of completion would
    // record that signature as *Anthony Graziano* regardless of who actually clicked. On a
    // contract, the audit trail naming the wrong human is the one failure it exists to prevent.
    // Anthony: *"let's make it simple and have me responsible for signing all agreements on
    // behalf of Havellin."*
    // ⚠ agreements@ IS STILL ON THE ENVELOPE — as a CARBON COPY below, which is what actually
    // delivers the executed agreement to the firm's file. That is the half the group address was
    // really doing, and a CC does it without also claiming to be a signatory.
    var havEmail = data.havellinEmail || 'anthony@havellinpalmbeach.com';
    var havName  = data.havellinName  || 'Anthony Graziano';
    var fileEmail = data.fileCopyEmail || 'agreements@havellinpalmbeach.com';

    var env = {
      emailSubject: data.subject || ('Havellin Services Agreement — ' + (data.hvlId || '')),
      emailBlurb: data.blurb || '',
      documents: [{
        documentBase64: data.pdfBase64,
        name: data.filename || 'Havellin Services Agreement.pdf',
        fileExtension: 'pdf',
        documentId: '1'
      }],
      recipients: {
        signers: [
          {
            email: data.signerEmail,
            name: data.signerName,
            recipientId: '1',
            routingOrder: '1',
            roleName: 'Client',
            tabs: _dsClientTabs(data.anchors)
          },
          {
            email: havEmail,
            name: havName,
            recipientId: '2',
            routingOrder: '2',
            roleName: 'Havellin',
            tabs: _dsTabs(DS_ANCHORS.havSig, DS_ANCHORS.havDate)
          }
        ],
        // ⚠⚠ THIS IS WHAT PUTS THE EXECUTED AGREEMENT IN THE FIRM'S FILE, AND IT COSTS NOTHING
        // TO RUN. DocuSign mails every recipient — signers and carbon copies alike — the completed
        // envelope with the signed PDF attached the moment the last signature lands. So the client
        // gets their copy, Anthony gets his, and agreements@ gets one for the record, with no
        // second send path in this app to go wrong. The Drive archive still runs and is still the
        // durable copy; this is the mailbox copy Anthony asked for.
        // ⚠ ROUTING ORDER 3, AFTER BOTH SIGNATURES. A carbon copy at order 1 would mail the firm
        // an UNSIGNED agreement the moment it went out, which reads in the inbox exactly like an
        // executed one.
        carbonCopies: [
          {
            email: fileEmail,
            name: 'Havellin Palm Beach — Agreements',
            recipientId: '3',
            routingOrder: '3'
          }
        ]
      },
      status: 'sent'
    };

    var res = _dsApi('post', '/envelopes', env);
    if (!res.ok) {
      var b = res.body || {};
      if (b.needsConsent) return b;   // carries the consent URL through untouched
      return { ok: false, error: 'DocuSign refused the envelope (HTTP ' + res.code + '): '
                                 + (b.message || b.error || JSON.stringify(b).slice(0, 300)) };
    }
    return { ok: true, envelopeId: res.body.envelopeId, status: res.body.status || 'sent',
             sentAt: res.body.statusDateTime || '' };
  } catch (error) {
    Logger.log('esignSendEnvelope error: ' + error);
    return { ok: false, error: String(error) };
  }
}

function _dsTabs(sigAnchor, dateAnchor) {
  return {
    signHereTabs: [{
      anchorString: sigAnchor, anchorUnits: 'pixels',
      anchorXOffset: '0', anchorYOffset: DS_TAB_Y_OFFSET, anchorIgnoreIfNotPresent: 'false'
    }],
    dateSignedTabs: [{
      anchorString: dateAnchor, anchorUnits: 'pixels',
      anchorXOffset: '0', anchorYOffset: DS_TAB_Y_OFFSET, anchorIgnoreIfNotPresent: 'false'
    }]
  };
}

// ⚠⚠ THE CLIENT CARRIES THE MARKETING OPT-OUT AND HAVELLIN DOES NOT, and that asymmetry is the
// whole reason this is a separate builder rather than an argument to _dsTabs. A media release is
// the client's decision about their own home; putting the same tab on the countersignature would
// ask Havellin to consent to Havellin.
//
// ⚠⚠ IT IS ONE OPTIONAL CHECKBOX, AND THE REQUIRED RADIO PAIR IT REPLACED DID NOT RENDER ON A
// REAL ENVELOPE. Anthony, off the first one DocuSign actually sent: *"docusign did not recognize
// the marketing tic boxes or the required signature."* `testEsignTabs` had come back ACCEPTED on
// all four shapes — but it created DRAFTS (`status:'created'`), and **a draft accepting a field
// definition does not prove the field survives SENDING**. That is the lesson; the field type is
// only the consequence. `checkboxTabs` is the most basic field DocuSign has.
//
// ⚠ OPTIONAL IS CORRECT HERE AND WOULD HAVE BEEN WRONG BEFORE. DocuSign's guided navigation steps
// through required fields and jumps past optional ones, which under an OPT-IN meant a consent
// nobody was ever asked for. Under an opt-out, a box nobody reaches lands on the documented default
// — authorized — which is exactly what §10.2 says happens when nothing is ticked. Making it
// required would instead block the client's own signature on a question the contract says they need
// not answer.
//
// ⚠⚠ AND IT IS PLACED ONLY WHEN THE DOCUMENT CARRIES THE ANCHOR. The estate form has no marketing
// clause at all, so `anchorIgnoreIfNotPresent:'false'` would make DocuSign refuse every estate
// envelope. `anchors` is the list the app measured off the very html it converted, so what is
// placed follows the document rather than a second copy of the rule that renders it. A caller that
// names nothing gets the four required tabs and no optional one — the safe direction, because a
// missing opt-out box leaves the stated default in place while a refused envelope sends nothing.
function _dsClientTabs(anchors) {
  var t = _dsTabs(DS_ANCHORS.clientSig, DS_ANCHORS.clientDate);
  var has = {};
  (anchors || []).forEach(function (k) { has[k] = true; });

  if (has.mktOptOut) {
    t.checkboxTabs = [{
      anchorString: DS_ANCHORS.mktOptOut, anchorUnits: 'pixels',
      anchorXOffset: '0', anchorYOffset: '0', anchorIgnoreIfNotPresent: 'false',
      tabLabel: 'marketing_opt_out', name: 'Do not authorize marketing use',
      selected: 'false', required: 'false'
    }];
  }

  return t;
}

// ─── STATUS ──────────────────────────────────────────────────────────────────────
// ⚠ THE SIGNER IS READ OFF ROUTING ORDER 1, NOT "whoever signed last". Order 2 is Havellin
// countersigning, and recording OUR name as the person who bound the estate is byte for
// byte the defect Slice 6 exists to undo (`agrSignedBy` holding the manager who approved
// the price). A test drives a two-signer envelope and asserts the client comes back.
function esignEnvelopeStatus(data) {
  try {
    var id = data && data.envelopeId;
    if (!id) return { ok: false, error: 'No envelope id supplied.' };

    var res = _dsApi('get', '/envelopes/' + encodeURIComponent(id) + '?include=recipients', null);
    if (!res.ok) {
      var b = res.body || {};
      if (b.needsConsent) return b;
      return { ok: false, error: 'DocuSign status check failed (HTTP ' + res.code + '): '
                                 + (b.message || b.error || '') };
    }

    var signers = ((res.body.recipients || {}).signers) || [];
    var client = null;
    for (var i = 0; i < signers.length; i++) {
      if (String(signers[i].routingOrder) === '1') { client = signers[i]; break; }
    }

    return {
      ok: true,
      envelopeId: id,
      status: res.body.status || '',
      completedAt: res.body.completedDateTime || '',
      signerName: (client && client.name) || '',
      signerEmail: (client && client.email) || '',
      signedAt: (client && client.signedDateTime) || ''
    };
  } catch (error) {
    Logger.log('esignEnvelopeStatus error: ' + error);
    return { ok: false, error: String(error) };
  }
}

// ─── RETRIEVING THE EXECUTED AGREEMENT ───────────────────────────────────────────
// ⚠⚠ THIS IS THE HALF MOST LIKELY TO BE SKIPPED, BECAUSE THE SEND ALREADY LOOKS FINISHED — and it
// is the half that matters legally. DocuSign's Document Retention can purge a completed envelope
// and the DOCUMENTS are then permanently unrecoverable (the certificate and history survive with a
// Purged flag; the documents do not). Account closure takes everything. ESIGN Act §101(e) puts the
// retain-and-accurately-reproduce burden on the party RELYING on the record — us — not the vendor.
// And Florida's five-year limitation on a written contract (Fla. Stat. §95.11) runs from the
// BREACH, so a 2026 agreement is litigable well into the 2030s, longer than any confidence in
// holding one particular subscription.
//
// ⚠ ON A PROBATE MATTER THE CERTIFICATE MAY BE THE MORE IMPORTANT FILE. A personal representative
// binds an estate; counsel may later ask who bound it. The certificate of completion is the audit
// trail — signer identity, timestamps, IP, authentication method — and is a separate document.
//
// ⚠⚠ `_dsApi` CANNOT BE USED HERE AND THAT IS NOT A STYLE POINT. It ends in
// `JSON.parse(res.getContentText())`, and `getContentText()` decodes bytes as UTF-8 — lossy and
// irreversible for a PDF. A document fetched through it arrives as mangled text, silently. This
// keeps the blob and never calls getContentText().
function _dsFetchBlob(path, filename) {
  var tok = _dsAccessToken();
  if (!tok.ok) return { ok: false, error: tok.error, needsConsent: !!tok.needsConsent, consentUrl: tok.consentUrl || '' };

  var url = _dsProp('DS_BASE_URI').replace(/\/+$/, '')
          + '/restapi/v2.1/accounts/' + _dsProp('DS_ACCOUNT_ID') + path;
  var res = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: { Authorization: 'Bearer ' + tok.token, Accept: 'application/pdf' },
    muteHttpExceptions: true
  });
  if (res.getResponseCode() >= 300) {
    // Safe to read as text HERE: a failure is JSON or HTML, never a PDF.
    return { ok: false, error: 'HTTP ' + res.getResponseCode() + ': ' + res.getContentText().slice(0, 300) };
  }
  var blob = res.getBlob().setName(filename);
  return { ok: true, blob: blob, bytes: blob.getBytes().length };
}

// Files the executed agreement AND the certificate into the job's Drive Agreement folder.
//
// ⚠⚠ `certificate=true` DEFAULTS TO FALSE ON THE COMBINED DOWNLOAD — read from DocuSign's own
// OpenAPI spec, and it contradicts several third-party write-ups. Omit it and you silently retain a
// perfectly good-looking signed PDF with no audit trail: the silent-omission shape this file
// records over and over. A test pins the query string.
//
// ⚠ THE STANDALONE CERTIFICATE IS FETCHED SEPARATELY ON PURPOSE, not as duplication. A tenant-wide
// admin setting ("Attach certificate of completion to envelope") may suppress it from the combined
// PDF, and no source could establish whether the explicit query parameter overrides that. The
// separate call has no dependence on the setting, so the audit trail cannot go missing quietly.
//
// ⚠ NAMES MUST DIFFER FROM THE UNSIGNED PACKET. `uploadHtmlToDrive` overwrites BY FILENAME — that
// is what makes a re-file replace rather than accumulate — so a packet re-filed after signature
// would otherwise destroy the executed copy.
function esignArchiveEnvelope(data) {
  try {
    var id = data && data.envelopeId;
    if (!id) return { ok: false, error: 'No envelope id supplied.' };
    if (!data.folderId) return { ok: false, error: 'No Drive folder supplied to file the signed agreement into.' };
    var base = data.baseName || ('Agreement ' + id);
    var enc = encodeURIComponent(id);

    var signed = _dsFetchBlob('/envelopes/' + enc + '/documents/combined?certificate=true',
                              base + ' - SIGNED.pdf');
    if (!signed.ok) return { ok: false, error: 'Could not retrieve the signed agreement — ' + signed.error,
                             needsConsent: signed.needsConsent, consentUrl: signed.consentUrl };

    var cert = _dsFetchBlob('/envelopes/' + enc + '/documents/certificate',
                            base + ' - Certificate of Completion.pdf');

    var folder = DriveApp.getFolderById(data.folderId);
    var out = { ok: true };
    var f1 = folder.createFile(signed.blob);
    out.signedUrl = f1.getUrl(); out.signedId = f1.getId(); out.signedBytes = signed.bytes;

    // ⚠ A MISSING CERTIFICATE IS REPORTED, NEVER SILENT. The executed agreement is the thing that
    // had to be kept; losing the audit trail without saying so is how a probate matter discovers it
    // two years later.
    if (cert.ok) {
      var f2 = folder.createFile(cert.blob);
      out.certUrl = f2.getUrl(); out.certId = f2.getId(); out.certBytes = cert.bytes;
    } else {
      out.certError = cert.error;
    }
    return out;
  } catch (error) {
    Logger.log('esignArchiveEnvelope error: ' + error);
    return { ok: false, error: String(error) };
  }
}

// ─── WHAT IS ACTUALLY IN DS_PRIVATE_KEY ──────────────────────────────────────────
// ⚠⚠ THIS EXISTS BECAUSE I GUESSED THREE TIMES AND WAS WRONG THREE TIMES. `no_valid_keys_or_
// signatures` says only "the signature did not verify", which is consistent with a truncated
// paste, a key from a deleted keypair, or a bug in the conversion above — and nothing on either
// screen tells them apart. This measures the property instead: how much of it arrived, what the
// DER really is, and what public key it implies. Editor-only and argument-free, like testEsignAuth.
//
// ⚠ IT PRINTS THE PUBLIC HALF ONLY. The public key is not a secret (DocuSign displays it), and the
// private half must never reach an execution log, which is retained and shared.
function dsKeyReport() {
  var raw = _dsProp('DS_PRIVATE_KEY');
  if (!raw) { Logger.log('DS_PRIVATE_KEY is empty.'); return; }

  Logger.log('Property length : ' + raw.length + ' chars');
  var isP1 = raw.indexOf('BEGIN RSA PRIVATE KEY') !== -1;
  var isP8 = raw.indexOf('BEGIN PRIVATE KEY') !== -1 && !isP1;
  Logger.log('Header          : ' + (isP1 ? 'PKCS#1 (BEGIN RSA PRIVATE KEY) — will be converted'
                                    : isP8 ? 'PKCS#8 (BEGIN PRIVATE KEY) — used as-is'
                                    : 'NONE FOUND — this is not a PEM private key'));
  Logger.log('END line present: ' + (raw.indexOf('END') !== -1 ? 'yes' : 'NO — the paste is truncated'));

  var b64 = raw.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  var der;
  try { der = Utilities.base64Decode(b64); }
  catch (e) { Logger.log('Body            : NOT VALID BASE64 — the paste is damaged. (' + e + ')'); return; }
  Logger.log('Body            : ' + b64.length + ' base64 chars -> ' + der.length + ' DER bytes');
  Logger.log('                  (a 2048-bit PKCS#1 key is about 1190 DER bytes)');

  if (!isP1) { Logger.log('Stopping — the modulus check below reads PKCS#1 only.'); return; }

  // RSAPrivateKey ::= SEQUENCE { version INTEGER, modulus INTEGER, publicExponent INTEGER, ... }
  var u = [], i;
  for (i = 0; i < der.length; i++) u.push(der[i] < 0 ? der[i] + 256 : der[i]);
  var p = { i: 0 };
  function readLen() {
    var b = u[p.i++];
    if (b < 0x80) return b;
    var n = b & 0x7f, v = 0;
    while (n-- > 0) v = (v << 8) | u[p.i++];
    return v;
  }
  function expect(tag) {
    if (u[p.i] !== tag) throw new Error('expected tag 0x' + tag.toString(16) + ' at ' + p.i);
    p.i++;
    return readLen();
  }
  try {
    // ⚠ THE OUTER SEQUENCE DECLARES ITS OWN LENGTH, so comparing that against what actually
    // arrived catches a partial paste outright — including one that kept its END line, which the
    // check above cannot see. This is the single most likely cause of a key that parses and then
    // fails to verify.
    var declared = expect(0x30);            // SEQUENCE
    var actual = der.length - p.i;
    if (actual < declared) {
      Logger.log('*** TRUNCATED: the key declares ' + declared + ' bytes of content and only '
                 + actual + ' arrived. Re-copy the WHOLE private key block from DocuSign. ***');
      return;
    }
    var vlen = expect(0x02); p.i += vlen;   // version
    var mlen = expect(0x02);                // modulus
    var lead = (u[p.i] === 0x00) ? 1 : 0;   // DER sign byte
    Logger.log('Modulus         : ' + ((mlen - lead) * 8) + ' bits');
    Logger.log('                  (DocuSign generates 2048)');
    var mod = u.slice(p.i, p.i + mlen); p.i += mlen;
    var elen = expect(0x02);
    var exp = u.slice(p.i, p.i + elen);

    // SubjectPublicKeyInfo { AlgorithmIdentifier, BIT STRING { SEQUENCE { n, e } } }
    var inner = [0x02].concat(_dsDerLen(mod.length), mod, [0x02], _dsDerLen(exp.length), exp);
    var seq = [0x30].concat(_dsDerLen(inner.length), inner);
    var bits = [0x03].concat(_dsDerLen(seq.length + 1), [0x00], seq);
    var spki = [0x30].concat(_dsDerLen(DS_RSA_ALG_ID.length + bits.length), DS_RSA_ALG_ID, bits);
    for (i = 0; i < spki.length; i++) if (spki[i] > 127) spki[i] -= 256;
    Logger.log('\nThe PUBLIC key this private key implies — compare it with the one DocuSign shows\n'
      + 'for the keypair on your integration key. If they differ, the wrong key is in the property.\n\n'
      + '-----BEGIN PUBLIC KEY-----\n'
      + (Utilities.base64Encode(spki).match(/.{1,64}/g) || []).join('\n')
      + '\n-----END PUBLIC KEY-----');
  } catch (e) {
    Logger.log('Could not parse the key structure: ' + e);
    Logger.log('That almost always means the paste is partial — re-copy the WHOLE private key block.');
  }
}

// ─── RUN THIS FIRST ──────────────────────────────────────────────────────────────
// ⚠ EDITOR-ONLY, AND IT TAKES NO ARGUMENTS — the Apps Script Run menu passes none, which is
// the same rule testQuoAuth and previewDeletedJobs already follow. Read-only: it proves the
// five properties, the key and the consent in one call WITHOUT creating an envelope, so an
// auth failure can never masquerade as a sending bug. That distinction is why testQuoAuth
// exists, and this file records the cost of not having had one.
function testEsignAuth() {
  var missing = _dsMissingProps();
  if (missing.length) {
    Logger.log('NOT CONFIGURED — add these Script Properties: ' + missing.join(', '));
    return false;
  }
  Logger.log('Environment : ' + (_dsIsDemo() ? 'DEMO / sandbox' : 'PRODUCTION') + '  (' + _dsProp('DS_BASE_URI') + ')');
  Logger.log('Auth host   : ' + _dsAuthHost());

  var tok = _dsAccessToken();
  if (!tok.ok) {
    Logger.log('FAILED — ' + tok.error);
    if (tok.needsConsent) Logger.log('Consent URL (open once, click Allow):\n' + tok.consentUrl);
    return false;
  }
  Logger.log('Token       : OK (' + (tok.cached ? 'from cache' : 'freshly minted') + ')');

  var res = _dsApi('get', '', null);   // the account itself — the cheapest authenticated read
  if (!res.ok) {
    Logger.log('Token minted but the API refused it (HTTP ' + res.code + '): ' + JSON.stringify(res.body).slice(0, 300));
    return false;
  }
  Logger.log('Account     : ' + (res.body.accountName || _dsProp('DS_ACCOUNT_ID')));
  Logger.log('ALL GOOD — DocuSign is reachable and consented.');
  return true;
}

// ─── WHAT WILL THIS ACCOUNT ACTUALLY ACCEPT? ─────────────────────────────────────
// ⚠⚠ THIS EXISTS BECAUSE A SCREENSHOT OF THE FIELD PALETTE IS NOT AN ANSWER, AND THE
// THREE QUESTIONS IT LOOKS LIKE IT ANSWERS ARE DIFFERENT QUESTIONS.
//   (1) which FIELD TYPES the drag-and-drop sender UI offers;
//   (2) which TAB TYPES the REST API accepts on this plan;
//   (3) whether CONDITIONAL LOGIC on a tab is permitted.
// Nothing here ever touches the drag-and-drop palette — every envelope in this file is built
// by API — so (1) is at best a proxy for (2). And (3) is not a field type at all: it is a
// property ON a tab, so it appears in no palette screenshot either way. Measure it.
//
// ⚠ ONE CAPABILITY PER ENVELOPE, DELIBERATELY. Putting all four in one draft and reading a
// single pass/fail says nothing about WHICH one the account refused — the same reason
// `testDriveThumbnails` probes its three sources separately and prints the size of each.
// The baseline case is the control: if IT fails, the probe is broken, not the account.
//
// ⚠ TABS ARE PLACED BY x/y HERE AND BY ANCHOR EVERYWHERE ELSE, AND THAT IS THE POINT.
// This asks ONE question — will the account take this tab type — so the anchor text layer is
// deliberately removed as a variable. Anchor placement is a separate question answered by a
// real envelope on a real agreement.
//
// ⚠ EVERY ENVELOPE IS status:'created' — A DRAFT. Nothing is mailed to anyone, so this is
// safe against a live account, and each draft is deleted again at the end. Editor-only and
// argument-free, like testEsignAuth: the Run menu passes no arguments.
//
// ⚠⚠ CORRECTED 2026-09-18, AND THE CORRECTION MATTERS MORE THAN THE RESULT: THIS PROBE PROVED
// LESS THAN IT LOOKED LIKE IT PROVED. All four came back ACCEPTED, so the marketing consent
// shipped as a required radio pair plus a conditional signature — and on the first envelope
// DocuSign really SENT, the radios were not on the page. A draft accepts a field DEFINITION;
// whether that field survives the transition to `status:'sent'` is a different question and this
// function does not ask it. It is still the right tool for "will the account take this shape at
// all", and its answer is still a floor rather than a guarantee. **If a capability has to be
// certain, send one real envelope and look at it.** The marketing consent is now one
// `checkboxTabs` — the most basic field DocuSign has — chosen for exactly that reason.
function testEsignTabs() {
  var missing = _dsMissingProps();
  if (missing.length) {
    Logger.log('NOT CONFIGURED — add these Script Properties: ' + missing.join(', '));
    return false;
  }
  Logger.log('Environment : ' + (_dsIsDemo() ? 'DEMO / sandbox' : 'PRODUCTION'));

  var pdf = htmlToPdfBase64('<html><body><p>Havellin tab capability probe.</p></body></html>');
  if (!pdf.ok) { Logger.log('FAILED to build the probe PDF — ' + pdf.error); return false; }

  // ⚠ ADDRESSED TO OURSELVES, NOT A PLACEHOLDER. A draft can be sent by hand from the
  // DocuSign web console by anyone who finds it; addressed to the firm, the worst case is
  // an odd email to ourselves rather than a probe document reaching a client.
  var me = { email: 'agreements@havellinpalmbeach.com', name: 'Havellin Palm Beach' };

  function tabsFor(kind) {
    var base = { signHereTabs: [{ documentId: '1', pageNumber: '1', xPosition: '100', yPosition: '200' }] };
    if (kind === 'baseline') return base;

    if (kind === 'optional signature') {
      return { signHereTabs: [
        { documentId: '1', pageNumber: '1', xPosition: '100', yPosition: '200' },
        { documentId: '1', pageNumber: '1', xPosition: '100', yPosition: '300', optional: 'true' }
      ]};
    }

    if (kind === 'radio group') {
      return {
        signHereTabs: base.signHereTabs,
        radioGroupTabs: [{
          documentId: '1', groupName: 'marketing_consent', requireInitialOnSharedChange: 'false',
          radios: [
            { pageNumber: '1', xPosition: '100', yPosition: '350', value: 'authorize', required: 'true' },
            { pageNumber: '1', xPosition: '100', yPosition: '380', value: 'decline',   required: 'true' }
          ]
        }]
      };
    }

    if (kind === 'conditional signature') {
      return {
        signHereTabs: [
          { documentId: '1', pageNumber: '1', xPosition: '100', yPosition: '200' },
          { documentId: '1', pageNumber: '1', xPosition: '100', yPosition: '420',
            tabLabel: 'marketing_signature', optional: 'true',
            conditionalParentLabel: 'marketing_consent', conditionalParentValue: 'authorize' }
        ],
        radioGroupTabs: [{
          documentId: '1', groupName: 'marketing_consent',
          radios: [
            { pageNumber: '1', xPosition: '100', yPosition: '350', value: 'authorize', required: 'true' },
            { pageNumber: '1', xPosition: '100', yPosition: '380', value: 'decline',   required: 'true' }
          ]
        }]
      };
    }
    return base;
  }

  var KINDS = ['baseline', 'optional signature', 'radio group', 'conditional signature'];
  var drafts = [], verdict = {};

  KINDS.forEach(function (kind) {
    var env = {
      emailSubject: 'Havellin capability probe — ' + kind + ' (draft, never sent)',
      documents: [{ documentBase64: pdf.base64, name: 'probe.pdf', fileExtension: 'pdf', documentId: '1' }],
      recipients: { signers: [{
        email: me.email, name: me.name, recipientId: '1', routingOrder: '1', tabs: tabsFor(kind)
      }]},
      status: 'created'   // ⚠ DRAFT. Never 'sent'.
    };
    var res = _dsApi('post', '/envelopes', env);
    if (res.ok) {
      verdict[kind] = 'ACCEPTED';
      if (res.body.envelopeId) drafts.push(res.body.envelopeId);
    } else {
      var b = res.body || {};
      verdict[kind] = 'REFUSED (HTTP ' + res.code + ') — ' + (b.message || b.errorCode || JSON.stringify(b).slice(0, 200));
    }
    Logger.log(_pad(kind, 24) + ' : ' + verdict[kind]);
  });

  // ⚠ CLEAN UP, AND SAY SO IF IT FAILS. A probe that leaves drafts behind on every run turns
  // the account's envelope list into a bin nobody trusts.
  drafts.forEach(function (id) {
    var del = _dsApi('put', '/envelopes/' + encodeURIComponent(id), { status: 'voided', voidedReason: 'Capability probe — never sent' });
    if (!del.ok) Logger.log('  (could not void draft ' + id + ' — remove it by hand)');
  });

  Logger.log('');
  if (verdict['baseline'] !== 'ACCEPTED') {
    Logger.log('⚠ THE BASELINE FAILED, so read nothing into the other three — the probe itself is the problem, not the plan.');
    return false;
  }
  Logger.log('Baseline passed, so the three results above are real answers about this account.');
  return verdict;
}

function _pad(s, n) { s = String(s); while (s.length < n) s += ' '; return s; }
// ═══════════════════════════════════════════════════════════════════════════════════
// STRIPE — ACH ONLY
// ═══════════════════════════════════════════════════════════════════════════════════
// ⚠⚠ THIS LIVES IN main-sync.gs RATHER THAN THE SEPARATE STRIPE PROJECT, AND THAT IS THE
// WHOLE POINT OF THE MOVE. Until 2026-09-18 the payment link was minted by a second Apps
// Script deployment behind STRIPE_SCRIPT_URL — fine while it was fire-and-forget, and wrong
// the moment anything reads back, because read-back is on the app's REQUEST PATH and has to
// move in lockstep with BACKEND_VERSION, BACKEND_ACTIONS and the dispatch-parity test.
// `checkBackendVersion` cannot reach a second deployment, so a stale one would fail exactly
// the way the stale main-sync.gs did: silently, and read as an app bug. This file records
// that costing six weeks. Same reasoning as the DocuSign build on 2026-09-17.
//
// ⚠ ACH ONLY, AND IT IS DECIDED RATHER THAN DEFAULTED. Anthony, 2026-09-18, asked directly:
// "No cards at all." ACH is 0.8% capped at $5; a card is 2.9% + 30c, which on one $25,715
// job is $747 against $16.50. A 3% surcharge cannot close that gap legally — the cap is the
// LOWER of 3% or actual cost of acceptance, and the blended card rate is 2.9023% at these
// ticket sizes, so 3% is only compliant at or below $300. See STRIPE_PAYMENTS_SPEC.md §1.
var STRIPE_API             = 'https://api.stripe.com/v1';
var STRIPE_API_VERSION     = '2024-06-20';
var STRIPE_ALLOWED_METHODS = ['us_bank_account'];   // ⚠ ACH. Adding a card here is a pricing decision, not a config change.

function _stProp(name) {
  return (PropertiesService.getScriptProperties().getProperty(name) || '').trim();
}

// Named individually, never "not configured" — the lesson this file already records twice, on
// the PDF conversion and on the five DocuSign properties.
function _stMissingProps() {
  return ['STRIPE_SECRET_KEY'].filter(function (k) { return !_stProp(k); });
}

function _stErr(res) {
  var e = (res && res.body && res.body.error) || {};
  return e.message || e.type || (res && res.body && res.body.raw) || 'no reason given';
}

// ⚠ STRIPE TAKES FORM ENCODING, NOT JSON, AND NESTS WITH BRACKETS. `line_items[0][price_data]
// [currency]=usd`. Posting JSON to this API returns a 400 that reads like a bad key, which is
// the wrong place to start debugging.
function _stForm(obj, prefix, out) {
  out = out || [];
  for (var k in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
    var v = obj[k];
    if (v === null || v === undefined) continue;
    var key = prefix ? prefix + '[' + k + ']' : k;
    if (Object.prototype.toString.call(v) === '[object Array]') {
      for (var i = 0; i < v.length; i++) {
        if (v[i] !== null && typeof v[i] === 'object') _stForm(v[i], key + '[' + i + ']', out);
        else out.push(encodeURIComponent(key + '[' + i + ']') + '=' + encodeURIComponent(String(v[i])));
      }
    } else if (typeof v === 'object') {
      _stForm(v, key, out);
    } else {
      out.push(encodeURIComponent(key) + '=' + encodeURIComponent(String(v)));
    }
  }
  return out.join('&');
}

function _stApi(method, path, params) {
  var key = _stProp('STRIPE_SECRET_KEY');
  if (!key) return { ok: false, code: 0, body: { error: { message: 'STRIPE_SECRET_KEY is not set in Script Properties.' } } };

  var url  = STRIPE_API + path;
  var opts = {
    method: method,
    headers: { Authorization: 'Bearer ' + key, 'Stripe-Version': STRIPE_API_VERSION },
    muteHttpExceptions: true
  };
  if (params) {
    if (String(method).toLowerCase() === 'get') {
      url += (url.indexOf('?') === -1 ? '?' : '&') + _stForm(params);
    } else {
      opts.contentType = 'application/x-www-form-urlencoded';
      opts.payload = _stForm(params);
    }
  }
  var res  = UrlFetchApp.fetch(url, opts);
  var body = {};
  try { body = JSON.parse(res.getContentText()); } catch (e) { body = { raw: res.getContentText().slice(0, 300) }; }
  return { ok: res.getResponseCode() < 300, code: res.getResponseCode(), body: body };
}

// ─── CREATING THE PAYMENT LINK ───────────────────────────────────────────────────
// ⚠⚠ A PAYMENT LINK, NOT A CHECKOUT SESSION, AND THE REASON IS THE CALENDAR. A Checkout
// Session expires — 24 hours is Stripe's hard maximum — and a deposit invoice is routinely
// paid days later by a trust officer who has to get it approved first. An expired link is a
// client who tried to pay and could not, which is worse than never sending one. A Payment
// Link does not expire until it is deactivated.
function stripeCreatePaymentLink(data) {
  try {
    var miss = _stMissingProps();
    if (miss.length) {
      return { ok: false, error: 'Stripe is not configured — missing Script Propert'
                                 + (miss.length > 1 ? 'ies' : 'y') + ': ' + miss.join(', ') + '.' };
    }
    var cents = Math.round(Number(data && data.amount) * 100);
    if (!(cents > 0)) return { ok: false, error: 'There is no amount to charge on this stage.' };

    var res = _stApi('post', '/payment_links', {
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: cents,
          product_data: { name: (data.description || 'Havellin Palm Beach').slice(0, 250) }
        }
      }],
      payment_method_types: STRIPE_ALLOWED_METHODS,
      // ⚠ THE METADATA IS HOW A PAYMENT FINDS ITS WAY HOME. Stripe is the only record of which
      // job and stage a bank transfer belongs to once it lands days later.
      metadata: {
        jobId: String((data && data.jobId) || ''),
        hvlId: String((data && data.hvlId) || ''),
        stage: String((data && data.stage) || '')
      }
    });
    if (!res.ok) return { ok: false, error: 'Stripe refused the request (HTTP ' + res.code + '): ' + _stErr(res) };

    // ⚠⚠ VERIFY WHAT CAME BACK; DO NOT TRUST THE PARAMETER. Whether /v1/payment_links honours
    // `payment_method_types` could not be confirmed from the build environment — docs.stripe.com
    // is blocked by the egress proxy. So the link is READ BACK and checked, and a link that would
    // also take a card is DEACTIVATED rather than returned. This is the rule this file already
    // records paying for on DriveApp.getThumbnail(), which returned a 130KB archival photograph
    // under a name promising a thumbnail: trust the measurement, never the method name.
    //
    // ⚠ AN EMPTY LIST IS A FAILURE, NOT A PASS. Stripe returns null there when it defers to the
    // Dashboard's own payment-method settings, and those may include cards. We cannot prove
    // ACH-only in that case, so we refuse and name the fix.
    var got = res.body.payment_method_types || [];
    var bad = [];
    for (var i = 0; i < got.length; i++) {
      if (STRIPE_ALLOWED_METHODS.indexOf(got[i]) === -1) bad.push(got[i]);
    }
    if (!got.length || bad.length) {
      try { _stApi('post', '/payment_links/' + encodeURIComponent(res.body.id), { active: false }); } catch (e) {}
      return { ok: false, error: 'Stripe created a link that is not ACH-only ('
        + (bad.length ? 'it also accepts ' + bad.join(', ') : 'it did not say which methods it accepts')
        + '), so it was deactivated and NOT sent. Fix it in the Stripe Dashboard: '
        + 'Settings > Payments > Payment methods — turn OFF cards and turn ON ACH Direct Debit.' };
    }

    return { ok: true, linkId: res.body.id, url: res.body.url, amount: cents / 100, methods: got };
  } catch (error) {
    Logger.log('stripeCreatePaymentLink error: ' + error);
    return { ok: false, error: String(error) };
  }
}

// ─── READING BACK WHAT WAS PAID ──────────────────────────────────────────────────
// ⚠⚠ NO WEBHOOK, AND THE REASON IS THE SAME ONE THAT RULED OUT DOCUSIGN CONNECT. `doPost(e)`
// does not expose request HEADERS, and Stripe signs every webhook with `Stripe-Signature`
// with no query-parameter alternative. An Apps Script endpoint therefore cannot authenticate
// a delivery — leaving an open URL, on a public repo, that marks a $12,858 deposit received.
//
// ⚠ BUT THE DOCUSIGN HAZARD DOES NOT TRANSFER, which is why polling is the answer here and was
// not there. DocuSign publishes a hard one-request-per-resource-per-15-minutes floor and names
// REVOCATION as the penalty. Stripe has no such rule. And ACH takes ~4 business days to settle,
// so checking on arrival loses nothing a webhook would have bought.
//
// ⚠ ONE LIST CALL, NOT LIST-THEN-GET-EACH. `expand[]=data.payment_intent` returns the intent
// inline; fetching each one separately is N+1 calls for the same answer.
function stripePaymentsForLink(data) {
  try {
    var id = data && data.linkId;
    if (!id) return { ok: false, error: 'No payment link supplied.' };

    var res = _stApi('get', '/checkout/sessions', {
      limit: 100,
      payment_link: id,
      expand: ['data.payment_intent']
    });
    if (!res.ok) return { ok: false, error: 'Stripe status check failed (HTTP ' + res.code + '): ' + _stErr(res) };

    var out = [];
    var rows = (res.body && res.body.data) || [];
    for (var i = 0; i < rows.length; i++) {
      var s  = rows[i];
      var pi = s.payment_intent;
      if (!pi || typeof pi !== 'object') continue;   // unexpanded id, or a session that never got as far as an intent
      var cd = s.customer_details || {};
      out.push({
        sessionId: s.id,
        piId:      pi.id,
        // ⚠ THE INTENT'S STATUS, NEVER THE SESSION'S. On ACH the session reads `complete` the
        // moment the client authorises, while the money is still days away — the intent sits at
        // `processing` until it actually settles. Reading the session would record money that
        // has not arrived, which is the whole defect this build exists to avoid.
        status:    pi.status || '',
        amount:    (pi.amount_received || pi.amount || 0) / 100,
        payer:     cd.name || cd.email || '',
        createdAt: pi.created ? new Date(pi.created * 1000).toISOString() : ''
      });
    }
    return { ok: true, linkId: id, payments: out };
  } catch (error) {
    Logger.log('stripePaymentsForLink error: ' + error);
    return { ok: false, error: String(error) };
  }
}

// ⚠ EDITOR-ONLY, ARGUMENT-FREE, READ-ONLY — the testQuoAuth / testEsignAuth pattern, and the
// thing to run first. The Apps Script Run menu passes no arguments. It proves the key and the
// account WITHOUT creating a payment link, so an auth failure can never masquerade as a
// sending bug. It also reports whether the account can actually take ACH, because a key that
// authenticates against an account with ACH switched off fails later and further away.
function testStripeAuth() {
  var miss = _stMissingProps();
  if (miss.length) { Logger.log('MISSING Script Property: ' + miss.join(', ')); return; }

  var bal = _stApi('get', '/balance', null);
  if (!bal.ok) { Logger.log('FAILED (HTTP ' + bal.code + '): ' + _stErr(bal)); return; }

  var acct = _stApi('get', '/account', null);
  var live = _stProp('STRIPE_SECRET_KEY').indexOf('sk_live_') === 0;
  Logger.log('ALL GOOD — Stripe is reachable.');
  Logger.log('  mode:    ' + (live ? 'LIVE' : 'TEST'));
  if (acct.ok) {
    Logger.log('  account: ' + (acct.body.business_profile && acct.body.business_profile.name || acct.body.id));
    var caps = acct.body.capabilities || {};
    Logger.log('  ACH (us_bank_account_ach_payments): ' + (caps.us_bank_account_ach_payments || 'not enabled'));
    if (caps.us_bank_account_ach_payments !== 'active') {
      Logger.log('  >> ACH IS NOT ACTIVE. Enable it: Dashboard > Settings > Payments > Payment methods.');
    }
  }
}
