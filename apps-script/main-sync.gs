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
    else if (type === 'log')                 { /* redundant single-entry log; saveAllLogs is authoritative — ignore */ }
    else { return jsonOut({ ok: false, success: false, error: 'Unknown type: ' + type }); }

    return jsonOut({ ok: true, success: true });

  } catch (error) {
    Logger.log('doPost error: ' + error.toString());
    return jsonOut({ ok: false, success: false, error: error.toString() });
  }
}

// ══ STORE HELPERS ════════════════════════════════════════════════════════════════

// Write a store object/array as a single JSON blob in row 2 of the named sheet.
function _writeStoreBlob(sheetName, obj) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) { sheet = ss.insertSheet(sheetName); sheet.appendRow(['Updated', 'JSON']); }
  var json = JSON.stringify(obj);
  var data = sheet.getDataRange().getValues();
  if (data.length > 1) sheet.getRange(2, 1, 1, 2).setValues([[new Date().toISOString(), json]]);
  else sheet.appendRow([new Date().toISOString(), json]);
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
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('EstimateStore');
  if (!sheet) return {};
  var data = sheet.getDataRange().getValues();
  if (data.length < 2 || !data[1][1]) return {};
  try { return JSON.parse(data[1][1]); } catch(e) { return {}; }
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
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('JobPlanStore');
  if (!sheet) return {};
  var data = sheet.getDataRange().getValues();
  if (data.length < 2 || !data[1][1]) return {};
  try { return JSON.parse(data[1][1]); } catch(e) { return {}; }
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
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('ChangeOrderStore');
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length < 2 || !data[1][1]) return [];
  try { return JSON.parse(data[1][1]); } catch(e) { return []; }
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
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('LogStore');
  if (!sheet) return {};
  var data = sheet.getDataRange().getValues();
  if (data.length < 2 || !data[1][1]) return {};
  try { return JSON.parse(data[1][1]); } catch(e) { return {}; }
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
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('ContractorStore');
  if (!sheet) return { added: [], defaults: [] };
  var data = sheet.getDataRange().getValues();
  if (data.length < 2 || !data[1][1]) return { added: [], defaults: [] };
  try {
    var obj = JSON.parse(data[1][1]) || {};
    return { added: obj.added || [], defaults: obj.defaults || [] };
  } catch(e) { return { added: [], defaults: [] }; }
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

function saveJobToSheet(job) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('Jobs');
  if (!sheet) {
    sheet = ss.insertSheet('Jobs');
    sheet.appendRow(['ID', 'HVL ID', 'Name', 'Email', 'Phone', 'Address', 'City', 'Zip', 'Service', 'Status', 'Created', 'Data JSON']);
  }
  var data = sheet.getDataRange().getValues();
  var rowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === job.id) { rowIndex = i + 1; break; }
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
}

// ══ ESTIMATES (one row per job — most current version) ═══════════════════════════

function saveEstimateToSheet(estimate) {
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

  // Upsert by Job ID: update the existing row for this job, otherwise append.
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
    var names = subfolderNames || ['Photos', 'Walkthrough Notes', 'Estimate', 'Agreement', 'Change Orders', 'Asset Documentation', 'Invoice', 'Job Log'];
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
