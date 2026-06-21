/**
 * Havellin — Jobs sync hardening  —  tailored to your existing Apps Script
 * ──────────────────────────────────────────────────────────────────────────────
 * Fixes the cross-device client-overwrite bug: saving a client used to push this
 * device's ENTIRE jobs array as `saveAllJobs`, which the Sheet applied as a
 * destructive full replace. A second device that hadn't pulled the latest could
 * therefore wipe a client created on another device (last-write-wins on the whole
 * collection).
 *
 * This file contains drop-in REPLACEMENTS for two functions already in your main
 * sync script (the one with doGet/doPost, SHEET_ID, getJobsFromSheet, etc.).
 *
 * INSTALL
 * 1. In that same Apps Script project, find `saveAllJobsToSheet` and replace the
 *    whole function with the version below.
 * 2. Find `deleteJobFromSheet` and replace the whole function with the version below.
 *    (The old one never deleted: it looked for a lowercase 'id' header but the header
 *    is 'ID', and it used getActiveSpreadsheet() which is null inside a web app.)
 * 3. Re-deploy: Deploy ▸ Manage deployments ▸ Edit (pencil) ▸ Version: New version ▸
 *    Deploy. The web-app URL stays the same — no app Settings change needed.
 *
 * PAIRS WITH (already live in havellin.html)
 *   - saveJobs(): fills job.updatedAt when missing.
 *   - syncJobToSheets(): bumps job.updatedAt on the edited job.
 *   These give the merge below a recency signal so concurrent edits to the SAME job
 *   resolve newest-wins. Concurrent creation of DIFFERENT clients is safe regardless
 *   of timestamps — the merge unions by id.
 *
 * NOTE: do NOT paste this file as-is into a second .gs alongside the originals — it
 * would create duplicate function definitions. Replace the originals in place.
 */

// Merge the incoming jobs into the Jobs sheet by id (newer updatedAt wins). Never
// deletes a job that's missing from the payload — that absence-means-delete behavior
// is exactly what let a second device wipe another device's client. Real deletions go
// through the deleteJob action below.
function saveAllJobsToSheet(jobsArr) {
  if (!jobsArr || !jobsArr.length) return;
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (e) { /* best effort if lock unavailable */ }
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

// Delete one job row by id. Now that saveAllJobsToSheet no longer deletes-by-absence,
// this is the only deletion path, so it must actually work.
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
