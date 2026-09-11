'use strict';
// ORPHANED JOB RECORDS (2026-09-09). Reported off an export of the sync sheet: "does the app
// write to all of the tabs in here? i feel like some are missing info always", and then, once
// the four leftovers were found, "why do they ever stay there? these are all dummy jobs.
// shouldn't we just fix this for now and forever?"
//
// The sheet held FIVE estimates against ONE job. Four practice clients had been cleared out of
// the Jobs tab by hand in July and August; their estimates stayed. The server refuses a deleted
// job's record on the way IN (_stripRefusedJobKeys) but nothing ever removed one already sitting
// in a store when its row went. Orphans are invisible in the app (no job row, so the estimate
// never renders) and invisible in the sheet (they live inside a 45,000-character JSON cell), so
// they accumulate unnoticed and push the blob toward the per-cell character cap.
//
// Three parts under test, all driving the REAL functions out of the .gs files:
//   1. deleteJobFromSheet purges all FIVE stores (it purged three; MediaStore and
//      ChangeOrderStore were missed, so a deleted client kept their whole photo manifest).
//   2. _sweepDeletedJobKeys clears the class automatically on every save, from now on.
//   3. previewOrphanRecords / pruneOrphanRecordsConfirm clear the pre-ledger ones, once,
//      with a person looking.

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { matchBrace } = require('./harness');

const GS = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'main-sync.gs'), 'utf8');
const GS_INV = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'saveInventory.gs'), 'utf8');

function gsFn(src, name) {
  const re = new RegExp('(^|\\n)function\\s+' + name + '\\s*\\(', 'g');
  const m = re.exec(src);
  if (!m) throw new Error('not in .gs: ' + name);
  const start = m.index + (m[1] ? m[1].length : 0);
  const open = src.indexOf('{', re.lastIndex);
  const close = matchBrace(src, open);
  if (close === -1) throw new Error('unbalanced: ' + name);
  return src.slice(start, close + 1);
}
function gsVar(src, name) {
  const m = src.match(new RegExp('(^|\\n)(var\\s+' + name + '\\s*=[^;]*;)'));
  if (!m) throw new Error('var not in .gs: ' + name);
  return m[2];
}

const HDR = ['ID', 'HVL ID', 'Name', 'Email', 'Phone', 'Address', 'City', 'Zip', 'Service', 'Status', 'Created', 'Data JSON'];

function fakeSheet(name, header) {
  const rows = header ? [header.slice()] : [];
  return {
    getName: () => name,
    _rows: rows,
    getLastRow: () => rows.length,
    getLastColumn: () => rows.reduce((m, r) => Math.max(m, r.length), 0),
    appendRow(r) { rows.push(r.slice()); },
    deleteRow(n) { rows.splice(n - 1, 1); },
    deleteRows(n, k) { rows.splice(n - 1, k); },
    getDataRange() { return { getValues: () => rows.map((r) => r.slice()) }; },
    getRange(r, c, nr, nc) {
      return {
        getValues() {
          const out = [];
          for (let i = 0; i < nr; i++) {
            const row = rows[r - 1 + i] || [];
            const cells = [];
            for (let j = 0; j < nc; j++) cells.push(row[c - 1 + j] === undefined ? '' : row[c - 1 + j]);
            out.push(cells);
          }
          return out;
        },
        setValues(v) {
          v.forEach((cells, i) => {
            while (rows.length < r + i) rows.push([]);
            cells.forEach((cell, j) => { rows[r - 1 + i][c - 1 + j] = cell; });
          });
        },
        clearContent() {
          for (let i = 0; i < nr; i++) {
            const row = rows[r - 1 + i];
            if (!row) continue;
            for (let j = 0; j < nc; j++) row[c - 1 + j] = '';
          }
          while (rows.length > 1 && rows[rows.length - 1].every((x) => x === '' || x === undefined)) rows.pop();
        },
      };
    },
  };
}

// `patch` rewrites the extracted source before it runs, which is how each fix gets
// revert-verified: back one line out and the suite must go red.
function server(opts = {}) {
  const sheets = {};
  const blobs = {};
  const log = [];
  let now = opts.now || 1_756_999_999_000;
  const ctx = {
    console,
    Logger: { log: (s) => log.push(String(s)) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    SpreadsheetApp: {
      openById: () => ({
        getName: () => 'fake',
        getSheetByName: (n) => sheets[n] || null,
        insertSheet(n) { sheets[n] = fakeSheet(n); return sheets[n]; },
      }),
    },
    _readStoreBlob(name, empty) {
      return Object.prototype.hasOwnProperty.call(blobs, name) ? JSON.parse(blobs[name]) : empty;
    },
    _writeStoreBlob(name, obj) {
      blobs[name] = JSON.stringify(obj);
      if (!sheets[name]) sheets[name] = fakeSheet(name, ['Updated', 'JSON']);
    },
    Date: Object.assign(function (...a) { return a.length ? new Date(...a) : new Date(now); },
      { now: () => now, parse: Date.parse, UTC: Date.UTC }),
    __sheets: sheets, __blobs: blobs, __log: log,
    __tick(ms) { now += ms; return now; },
  };
  ctx.Date.prototype = Date.prototype;
  vm.createContext(ctx);
  const names = ['getJobsFromSheet', 'saveAllJobsToSheet', 'deleteJobFromSheet',
    'getJobLedger', '_ledgerMarkSeen', '_jobRefusal', '_presentJobIds', '_deletedJobIds',
    '_stripRefusedJobKeys', '_jobRefusalCtx', '_sweepDeletedJobKeys', '_purgeJobFromStores',
    '_orphanJobRecords', 'previewOrphanRecords', 'pruneOrphanRecordsConfirm',
    '_okWithDrops', '_mergeStoreByKey', 'saveEstimateStore', 'getEstimateStore',
    'saveJobPlanStore', 'getJobPlanStore', 'saveLogStore', 'getLogStore',
    'saveChangeOrderStore', 'getChangeOrderStore', 'resetAllJobDataConfirm'];
  let code = [gsVar(GS, 'SHEET_ID'), gsVar(GS, 'RESET_JOB_STORES'), gsVar(GS, 'RESET_JOB_SHEETS'),
    gsVar(GS, 'JOB_LEDGER_STORE'), ...names.map((n) => gsFn(GS, n)),
    gsFn(GS_INV, 'saveMediaStore'), gsFn(GS_INV, 'getMediaStore'), gsFn(GS_INV, '_mergeMediaItems'),
    gsFn(GS_INV, '_mergeCustodyLogs'), gsFn(GS_INV, '_custodyEventId'),
    gsFn(GS_INV, '_invHasVal'), gsFn(GS_INV, '_invStickyValue'),
    (GS_INV.match(/var INV_STICKY_FIELDS = \[[\s\S]*?\];/) || [''])[0]].join('\n\n');
  if (opts.patch) code = opts.patch(code);
  vm.runInContext(code, ctx, { filename: 'main-sync.gs (extracted)' });
  return ctx;
}

function job(id, name) {
  return { id, hvlId: 'HVL-' + id, name, created: new Date(id).toISOString(), updatedAt: id };
}
const rec = (id) => ({ savedAt: id, estimate: { jobId: id, svc: 'cleanout', havellinTotal: 1000 } });
const STEP = 1_000_000;
const num = (a, b) => a - b;
// Push a row straight into the sheet, i.e. a job the app wrote BEFORE the ledger existed.
// Going through saveAllJobsToSheet instead would create the ledger first and then refuse the
// job for predating it — correct bootstrap behaviour, and the wrong fixture for these tests.
function seedRow(s, id, name) {
  s.__sheets.Jobs._rows.push([id, 'HVL-' + id, name, '', '', '', '', '', 'prep', 'new', '',
    JSON.stringify(job(id, name))]);
}

module.exports = function ({ group, ok, eq, has, lacks }) {
  const A = 1_757_000_000_000, B = 1_757_000_100_000, C = 1_757_000_200_000;

  // ── THE REPORTED CASE ───────────────────────────────────────────────────────────────
  group('orphans: the reported sheet — five estimates against one job');
  {
    // Rebuilt from the real export: EstimateStore held 1785263972989 / 1785618045114 /
    // 1785699061635 / 1785793865652 plus the one live job, and Jobs held only the last.
    // The clock sits where the real ledger's `since` does (2026-09-09 15:12 ET), so the four
    // July/August ids predate it exactly as they do on the real sheet.
    const s = server({ now: 1_788_981_151_995 });
    const LIVE = 1_788_902_034_426;
    const DEAD = [1_785_263_972_989, 1_785_618_045_114, 1_785_699_061_635, 1_785_793_865_652];
    s.__sheets.Jobs = fakeSheet('Jobs', HDR);
    seedRow(s, LIVE, 'izzy bizzy');
    const est = {};
    DEAD.concat([LIVE]).forEach((id) => { est[String(id)] = rec(id); });
    s._writeStoreBlob('EstimateStore', est);
    eq(Object.keys(s.getEstimateStore()).length, 5, 'the store starts with five estimates');
    eq(s.getJobsFromSheet().length, 1, 'and the Jobs sheet with one job');

    // These predate the ledger, so nothing automatic touches them — that is the whole reason
    // the explicit prune exists. Confirm the sweep leaves them alone first.
    const ctx = s._jobRefusalCtx();
    const store = s.getEstimateStore();
    eq(s._sweepDeletedJobKeys(store, ctx.present, ctx.ledger), [],
      'the automatic sweep does NOT touch a pre-ledger orphan — absence alone is not a verdict');

    const found = s._orphanJobRecords().orphans;
    eq(Object.keys(found).map(Number).sort(num), DEAD.slice().sort(num), 'the preview finds exactly the four');
    eq(found[String(DEAD[0])].why, 'predates', 'and says why: they predate the ledger');
    s.previewOrphanRecords();
    has(s.__log.join('\n'), '4 job id(s) with records but no row in Jobs', 'the preview names the count');
    has(s.__log.join('\n'), 'cleanout $1000', 'and the service and money, since the client NAME went with the Jobs row');
    eq(Object.keys(s.getEstimateStore()).length, 5, 'a PREVIEW deletes nothing');

    s.pruneOrphanRecordsConfirm();
    eq(Object.keys(s.getEstimateStore()), [String(LIVE)], 'the prune leaves exactly the live job');
    eq(s.getJobsFromSheet().length, 1, 'and never touches the Jobs sheet');

    // And they cannot come back: the prune marks them seen on the way out.
    const r = s.saveEstimateStore(Object.assign({}, est));
    eq(r.dropped.map(Number).sort(num), DEAD.slice().sort(num), 'a stale device re-pushing all five is refused the four');
    eq(Object.keys(s.getEstimateStore()), [String(LIVE)], 'and the store still holds only the live job');
  }

  // ── PART 1: deleteJob purges every store ────────────────────────────────────────────
  group('orphans: deleting a job clears all FIVE stores, not three');
  {
    const s = server();
    s.__sheets.Jobs = fakeSheet('Jobs', HDR);
    s.saveAllJobsToSheet([job(A, 'Alpha'), job(B, 'Bravo')]);
    s._writeStoreBlob('EstimateStore', { [A]: rec(A), [B]: rec(B) });
    s._writeStoreBlob('JobPlanStore', { [A]: { savedAt: A }, [B]: { savedAt: B } });
    s._writeStoreBlob('LogStore', { [A]: [{ id: 1 }], [B]: [{ id: 2 }] });
    s._writeStoreBlob('MediaStore', { [A]: { savedAt: A, items: [{ stableId: 'p1' }] }, [B]: { savedAt: B, items: [] } });
    s._writeStoreBlob('ChangeOrderStore', [{ id: 9, jobId: A }, { id: 10, jobId: B }]);

    s.deleteJobFromSheet(A);
    eq(Object.keys(s.getEstimateStore()), [String(B)], 'EstimateStore purged');
    eq(Object.keys(s.getJobPlanStore()), [String(B)], 'JobPlanStore purged');
    eq(Object.keys(s.getLogStore()), [String(B)], 'LogStore purged');
    eq(Object.keys(s._readStoreBlob('MediaStore', {})), [String(B)],
      'MediaStore purged — it was MISSED before, so a deleted client kept their whole photo manifest');
    eq(s.getChangeOrderStore().map((c) => c.jobId), [B],
      'ChangeOrderStore purged — also missed before');
    eq(s.getJobsFromSheet().map((j) => j.id), [B], 'and the row itself is gone');
  }

  group('orphans: the purge never CREATES a store tab that does not exist');
  {
    const s = server();
    s.__sheets.Jobs = fakeSheet('Jobs', HDR);
    s.saveAllJobsToSheet([job(A, 'Alpha')]);
    s._writeStoreBlob('EstimateStore', { [A]: rec(A) });
    s.deleteJobFromSheet(A);
    // LogStore / MediaStore / ChangeOrderStore were never written on this sheet. A tab only
    // exists once something has been written to it, and "not present" is meaningfully
    // different from "present and empty" when somebody goes looking for missing data.
    ok(!s.__sheets.LogStore, 'LogStore tab still absent');
    ok(!s.__sheets.MediaStore, 'MediaStore tab still absent');
    ok(!s.__sheets.ChangeOrderStore, 'ChangeOrderStore tab still absent');
  }

  // ── PART 2: the standing sweep ──────────────────────────────────────────────────────
  group('orphans: a row deleted BY HAND is swept on the next save — the forever half');
  {
    const s = server();
    s.__sheets.Jobs = fakeSheet('Jobs', HDR);
    s.saveAllJobsToSheet([job(A, 'Alpha'), job(B, 'Bravo')]);
    s.saveEstimateStore({ [A]: rec(A), [B]: rec(B) });
    s.saveJobPlanStore({ [A]: { savedAt: A }, [B]: { savedAt: B } });
    s.saveLogStore({ [A]: [{ id: 1 }], [B]: [{ id: 2 }] });
    s.saveChangeOrderStore([{ id: 9, jobId: A }, { id: 10, jobId: B }]);
    s.saveMediaStore({ jobId: A, savedAt: A, items: [{ stableId: 'p1' }] });
    s.saveMediaStore({ jobId: B, savedAt: B, items: [{ stableId: 'p2' }] });
    eq(Object.keys(s.getEstimateStore()).length, 2, 'both jobs have an estimate');

    // Anthony deletes Alpha's row in the spreadsheet. Nothing runs — no action, no tombstone.
    s.__sheets.Jobs._rows.splice(1, 1);
    eq(s.getJobsFromSheet().map((j) => j.id), [B], 'only Bravo has a row now');

    // The very next ordinary save of ANY job-keyed store sweeps Alpha out of that store.
    s.saveEstimateStore({ [B]: rec(B) });
    eq(Object.keys(s.getEstimateStore()), [String(B)], 'estimate swept');
    s.saveJobPlanStore({ [B]: { savedAt: B } });
    eq(Object.keys(s.getJobPlanStore()), [String(B)], 'job plan swept');
    s.saveLogStore({ [B]: [{ id: 2 }] });
    eq(Object.keys(s.getLogStore()), [String(B)], 'hours log swept');
    s.saveChangeOrderStore([{ id: 10, jobId: B }]);
    eq(s.getChangeOrderStore().map((c) => c.jobId), [B], 'change order swept');
    s.saveMediaStore({ jobId: B, savedAt: B, items: [{ stableId: 'p2' }] });
    eq(Object.keys(s._readStoreBlob('MediaStore', {})), [String(B)], 'manifest swept');
    has(s.__log.join('\n'), 'Swept records for deleted job(s)', 'and it says so in the log');
  }

  group('orphans: the sweep acts on a POSITIVE record only, never on inference');
  {
    // A store record for a job that predates the ledger and has no row is refused on write,
    // but must NOT be deleted automatically — that verdict rests on absence alone, and one
    // bad read of the Jobs sheet would otherwise take the whole store with it.
    const s = server({ now: C + STEP });                 // the ledger's `since` lands after A and C
    s.__sheets.Jobs = fakeSheet('Jobs', HDR);
    seedRow(s, C, 'Charlie');                           // C has a row; A never did
    s._writeStoreBlob('EstimateStore', { [A]: rec(A), [C]: rec(C) });
    const ctx = s._jobRefusalCtx();
    eq(s._jobRefusal(A, null, ctx.present, ctx.ledger), 'predates', 'A is refused as predating');
    s.saveEstimateStore({ [C]: rec(C) });
    eq(Object.keys(s.getEstimateStore()).map(Number).sort(num), [A, C], 'and A SURVIVES the save');
  }

  group('orphans: the sweep refuses to run against an empty Jobs sheet');
  {
    const s = server();
    s.__sheets.Jobs = fakeSheet('Jobs', HDR);
    s.saveAllJobsToSheet([job(A, 'Alpha'), job(B, 'Bravo')]);
    s._writeStoreBlob('EstimateStore', { [A]: rec(A), [B]: rec(B) });
    s.__sheets.Jobs._rows.splice(1);                    // every row gone: a bad read looks like this
    const ctx = s._jobRefusalCtx();
    eq(ctx.present, {}, 'nothing present');
    eq(s._sweepDeletedJobKeys(s.getEstimateStore(), ctx.present, ctx.ledger), [],
      'no jobs present means every seen id LOOKS deleted — so the sweep stands down entirely');
  }

  group('orphans: a new job whose estimate lands before its job row is never swept');
  {
    // The outbox sends one write at a time, so an estimate can reach the sheet ahead of the
    // job row it belongs to. "Not present yet" must never by itself remove anything.
    const s = server();
    s.__sheets.Jobs = fakeSheet('Jobs', HDR);
    s.saveAllJobsToSheet([job(A, 'Alpha')]);
    s.saveEstimateStore({ [A]: rec(A) });
    const N = s.__tick(STEP);                          // a job created just now, row not yet written
    s.saveEstimateStore({ [N]: rec(N) });
    eq(Object.keys(s.getEstimateStore()).map(Number).sort(num), [A, N],
      'the new estimate lands even though its job has no row yet');
    s.saveEstimateStore({ [A]: rec(A) });               // a later save of a DIFFERENT job
    ok(Object.keys(s.getEstimateStore()).indexOf(String(N)) >= 0,
      'and does not sweep it away');
  }

  // ── PART 3: the prune's guards ──────────────────────────────────────────────────────
  group('orphans: the prune refuses an empty Jobs sheet unless forced');
  {
    const s = server();
    s.__sheets.Jobs = fakeSheet('Jobs', HDR);
    s.saveAllJobsToSheet([job(A, 'Alpha'), job(B, 'Bravo')]);
    s._writeStoreBlob('EstimateStore', { [A]: rec(A), [B]: rec(B) });
    s.__sheets.Jobs._rows.splice(1);
    s.pruneOrphanRecordsConfirm();
    has(s.__log.join('\n'), 'REFUSED', 'it refuses');
    has(s.__log.join('\n'), 'resetAllJobDataConfirm', 'and names the deliberate way to clear everything');
    eq(Object.keys(s.getEstimateStore()).length, 2, 'nothing was deleted');
    s.pruneOrphanRecordsConfirm(true);
    eq(s.getEstimateStore(), {}, 'passing true really does clear them');
  }

  group('orphans: a clean sheet is a no-op');
  {
    const s = server();
    s.__sheets.Jobs = fakeSheet('Jobs', HDR);
    s.saveAllJobsToSheet([job(A, 'Alpha')]);
    s.saveEstimateStore({ [A]: rec(A) });
    const before = JSON.stringify(s.__blobs);
    s.previewOrphanRecords();
    s.pruneOrphanRecordsConfirm();
    has(s.__log.join('\n'), 'No orphaned records', 'the preview says so');
    has(s.__log.join('\n'), 'Nothing to do', 'and the prune does nothing');
    eq(s.__blobs.EstimateStore, JSON.parse(before).EstimateStore, 'no blob was rewritten');
  }

  group('orphans: neither maintenance function is reachable over HTTP');
  {
    const dispatch = GS.slice(GS.indexOf('function doPost'), GS.indexOf('function doPost') + 4000)
      + GS.slice(GS.indexOf('function doGet'), GS.indexOf('function doGet') + 4000);
    lacks(dispatch, 'pruneOrphanRecordsConfirm', 'the prune is not in doPost/doGet');
    lacks(dispatch, 'previewOrphanRecords', 'nor is the preview');
    lacks(GS, "'pruneOrphanRecordsConfirm'", 'and it is not a declared BACKEND_TYPE either');
  }

  group('orphans: one list of job-keyed stores, not two');
  {
    // deleteJobFromSheet used to carry its own copy of "which stores hold job-keyed records"
    // and that copy was two short. It must delegate, or the next store added is missed again.
    const del = gsFn(GS, 'deleteJobFromSheet');
    has(del, '_purgeJobFromStores', 'deleteJobFromSheet delegates to the shared purge');
    lacks(del, "getEstimateStore]", 'and keeps no private store list');
    const purge = gsFn(GS, '_purgeJobFromStores');
    ['EstimateStore', 'JobPlanStore', 'LogStore', 'MediaStore', 'ChangeOrderStore']
      .forEach((n) => has(purge, n, 'the shared purge covers ' + n));
    // RESET_JOB_STORES is the other list of the same five; they must agree.
    const reset = gsVar(GS, 'RESET_JOB_STORES');
    ['EstimateStore', 'JobPlanStore', 'LogStore', 'MediaStore', 'ChangeOrderStore']
      .forEach((n) => has(reset, n, 'and RESET_JOB_STORES agrees on ' + n));
  }

  group('orphans: the backend declares its new vintage');
  {
    // ⚠ THIS USED TO PIN THE LITERAL '2026-09-09b', which is a byte sequence rather than a
    // requirement — so it failed on the next legitimate bump, which is the true change it was
    // supposed to survive. That is the ninth time this project has recorded a test breaking on
    // a correct edit. The requirement is that the deployment CAN name itself and that the name
    // is dated; which date is not something source can check, so it is not asserted.
    const ver = /var BACKEND_VERSION = '([^']+)';/.exec(GS);
    ok(!!ver, 'the deployment declares a version');
    ok(/^\d{4}-\d{2}-\d{2}[a-z]?$/.test(ver[1]),
       'and it is dated \u2014 "' + ver[1] + '" \u2014 so a stale deployment is identifiable by eye');
    has(GS, 'BUMP BACKEND_VERSION IN THE SAME COMMIT',
        'and the rule that it moves with the file is written where it is declared');
  }

  // ── REVERT VERIFICATION ─────────────────────────────────────────────────────────────
  // Every fix backed out individually. A test that stays green with the fix reverted is
  // describing what the code returns rather than what has to be true — this file records
  // three separate times that has happened here, so each one is checked.
  group('orphans: revert each fix and the suite must go red');
  {
    // (a) deleteJob without MediaStore in the shared purge.
    const s = server({
      patch: (c) => c.replace("['EstimateStore', 'JobPlanStore', 'LogStore', 'MediaStore'].forEach(function(name) {\n    try {\n      var store = _readStoreBlob(name, null);",
        "['EstimateStore', 'JobPlanStore', 'LogStore'].forEach(function(name) {\n    try {\n      var store = _readStoreBlob(name, null);"),
    });
    s.__sheets.Jobs = fakeSheet('Jobs', HDR);
    s.saveAllJobsToSheet([job(A, 'Alpha')]);
    s._writeStoreBlob('MediaStore', { [A]: { savedAt: A, items: [] } });
    s.deleteJobFromSheet(A);
    eq(Object.keys(s._readStoreBlob('MediaStore', {})), [String(A)],
      'REVERTED: dropping MediaStore from the purge leaves the manifest behind — the original defect');

    // (b) the standing sweep removed from saveEstimateStore.
    const s2 = server({ patch: (c) => c.replace('_sweepDeletedJobKeys(merged, ctx.present, ctx.ledger);', '') });
    s2.__sheets.Jobs = fakeSheet('Jobs', HDR);
    s2.saveAllJobsToSheet([job(A, 'Alpha'), job(B, 'Bravo')]);
    s2.saveEstimateStore({ [A]: rec(A), [B]: rec(B) });
    s2.__sheets.Jobs._rows.splice(1, 1);
    s2.saveEstimateStore({ [B]: rec(B) });
    eq(Object.keys(s2.getEstimateStore()).map(Number).sort(num), [A, B],
      'REVERTED: without the sweep the hand-deleted job keeps its estimate forever');

    // (c) the empty-Jobs guard removed from the sweep.
    const s3 = server({
      patch: (c) => c.replace('if (!store || !present || !Object.keys(present).length) return gone;', 'if (!store || !present) return gone;'),
    });
    s3.__sheets.Jobs = fakeSheet('Jobs', HDR);
    s3.saveAllJobsToSheet([job(A, 'Alpha'), job(B, 'Bravo')]);
    s3._writeStoreBlob('EstimateStore', { [A]: rec(A), [B]: rec(B) });
    s3.__sheets.Jobs._rows.splice(1);
    const c3 = s3._jobRefusalCtx();
    const st3 = s3.getEstimateStore();
    eq(s3._sweepDeletedJobKeys(st3, c3.present, c3.ledger).map(Number).sort(num), [A, B],
      'REVERTED: without the guard one empty read of the Jobs sheet wipes every estimate');

    // (d) NOT a revert case, and worth saying why rather than writing one that cannot fail.
    // The prune marks the ledger before deleting, but that is belt-and-braces: a 'deleted'
    // orphan is already in `seen`, and a 'predates' one is refused by the predates rule
    // whether or not it is marked. What the mark buys is that the refusal becomes EXPLICIT —
    // the id is recorded as gone rather than being caught by an inference each time.
    const s4 = server({ now: C + STEP });
    s4.__sheets.Jobs = fakeSheet('Jobs', HDR);
    seedRow(s4, C, 'Charlie');
    s4._writeStoreBlob('EstimateStore', { [A]: rec(A), [C]: rec(C) });
    s4.pruneOrphanRecordsConfirm();
    eq(Object.keys(s4.getEstimateStore()), [String(C)], 'the pre-ledger orphan is cleared');
    ok(!!JSON.parse(s4.__blobs.JobLedger).seen[String(A)],
      'and the ledger records it as seen-and-gone, so the refusal is explicit rather than inferred');
  }
};
