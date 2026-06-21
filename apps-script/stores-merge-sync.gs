/**
 * Havellin — Estimate / Job Plan / Change Order / Log sync hardening
 * ──────────────────────────────────────────────────────────────────────────────
 * Round 2 of the cross-device data-loss fix (jobs were handled in
 * jobs-merge-sync.gs). Covers the four single-blob stores:
 *
 *   EstimateStore   — object keyed by jobId   (full-blob overwrite → merge by jobId)
 *   JobPlanStore    — object keyed by jobId   (full-blob overwrite → merge by jobId)
 *   ChangeOrderStore— array of change orders  (was NOT wired into the router at all)
 *   LogStore        — object keyed by jobId   (was NOT wired into the router at all)
 *
 * EstimateStore/JobPlanStore had the same last-write-wins overwrite as the Jobs
 * sheet. ChangeOrders and Logs were worse: the app already sends
 * saveAllChangeOrders / saveAllLogs and reads loadChangeOrders / loadLogs, but the
 * original script had NO doPost branches or doGet actions for them — so change
 * orders and on-site logs never synced across devices at all.
 *
 * INSTALL (5 edits, all in your main sync script)
 *
 * 1. REPLACE the bodies of these four functions with the versions below:
 *        saveEstimateStore, saveJobPlanStore, saveChangeOrderStore, saveLogStore
 *    (Leave the matching getEstimateStore/getJobPlanStore/getChangeOrderStore/
 *     getLogStore readers exactly as they are — the merges call them.)
 *
 * 2. ADD the two small helpers (_writeStoreBlob, _mergeStoreByKey) once, anywhere
 *    at top level.
 *
 * 3. In doGet, add the loadChangeOrders and loadLogs actions (shown below) next to
 *    the existing loadJobs / loadEstimates / loadJobPlans actions.
 *
 * 4. In doPost's `type` if/else chain, add the saveAllChangeOrders and saveAllLogs
 *    branches (shown below) next to saveAllJobPlans — BEFORE the final `else`.
 *
 * 5. Re-deploy: Deploy ▸ Manage deployments ▸ Edit (pencil) ▸ Version: New version ▸
 *    Deploy.
 *
 * PAIRS WITH (already live in havellin.html)
 *   estimateStore[jobId].savedAt, jobPlanStore[jobId].savedAt, and co.updatedAt give
 *   the merges a recency signal so concurrent edits to the SAME record resolve
 *   newest-wins. Concurrent edits to DIFFERENT records are always safe (union by key).
 *
 * NOTE: the app also fires a redundant single-entry `type:'log'` message (no-cors,
 * ignored on failure). saveAllLogs is the authoritative path, so leaving 'log'
 * unhandled is fine — do NOT also append it or you'll double-count entries.
 */

// ── shared helpers ────────────────────────────────────────────────────────────

// Write a store object/array as a single JSON blob in row 2 (matches the original
// EstimateStore/JobPlanStore/etc. layout).
function _writeStoreBlob(sheetName, obj) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) { sheet = ss.insertSheet(sheetName); sheet.appendRow(['Updated', 'JSON']); }
  var json = JSON.stringify(obj);
  var data = sheet.getDataRange().getValues();
  if (data.length > 1) sheet.getRange(2, 1, 1, 2).setValues([[new Date().toISOString(), json]]);
  else sheet.appendRow([new Date().toISOString(), json]);
}

// Merge two {key: entry} stores. Per key, keep the entry with the newer savedAt;
// never drop a key that exists in only one side (that absence-means-delete behavior
// is what let one device wipe another's data).
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

// ── REPLACE these four function bodies ────────────────────────────────────────

function saveEstimateStore(incoming) {
  if (!incoming) return;
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (e) {}
  try { _writeStoreBlob('EstimateStore', _mergeStoreByKey(getEstimateStore(), incoming)); }
  finally { try { lock.releaseLock(); } catch (e) {} }
}

function saveJobPlanStore(incoming) {
  if (!incoming) return;
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (e) {}
  try { _writeStoreBlob('JobPlanStore', _mergeStoreByKey(getJobPlanStore(), incoming)); }
  finally { try { lock.releaseLock(); } catch (e) {} }
}

// Change orders are a flat array; merge by co.id (newer updatedAt wins, id is the
// creation time so it's a safe fallback). Union — never drops a change order.
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

// Logs are { jobId: [entries] }. Merge per job by unioning entries by entry.id, so
// log lines added on two devices for the same job are both kept (append-friendly).
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
      cur.forEach(function(e) { if (e && e.id != null) seen[e.id] = true; });
      inArr.forEach(function(e) { if (e && e.id != null && !seen[e.id]) { cur.push(e); seen[e.id] = true; } });
      out[jid] = cur;
    });
    _writeStoreBlob('LogStore', out);
  } finally { try { lock.releaseLock(); } catch (e) {} }
}

/* ── ADD to doGet (next to loadJobs / loadEstimates / loadJobPlans) ─────────────

    if (action === 'loadChangeOrders') {
      return jsonOut({ ok: true, success: true, changeOrders: getChangeOrderStore() });
    }
    if (action === 'loadLogs') {
      return jsonOut({ ok: true, success: true, logs: getLogStore() });
    }

   ── ADD to doPost's type chain (next to saveAllJobPlans, before the final else) ──

  else if (type === 'saveAllChangeOrders') { saveChangeOrderStore(payload); }
  else if (type === 'saveAllLogs')         { saveLogStore(payload); }

*/
