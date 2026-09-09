'use strict';
// The job ledger (2026-09-08). Reported as: "if a computer has clients stored in its local
// memory, that pushes those locally stored clients back to Google Drive into the job sync
// sheet even if I've gone in and deleted all of the jobs in the sheet itself." Anthony
// cleared the Jobs sheet by hand; Ashley's laptop still had the app open with the old
// clients in memory; she added one client and saveAllJobs merged three deleted ones back.
//
// The server-side merge unions by id and never drops a job missing from the payload —
// correct for two devices each holding a client the other has not seen, wrong for a device
// holding a client the sheet deliberately no longer has. The fix is a LEDGER of every id the
// sheet has ever held: seen + absent = deleted = refused. These tests drive the real
// functions out of apps-script/main-sync.gs against a fake spreadsheet, and the app's
// receiving side out of havellin.html.

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { sandbox, matchBrace } = require('./harness');

const GS = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'main-sync.gs'), 'utf8');
const GS_INV = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'saveInventory.gs'), 'utf8');
const APP = fs.readFileSync(path.join(__dirname, '..', 'havellin.html'), 'utf8');

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

// A minimal in-memory Sheet: rows of cells, 1-based ranges, header on row 1.
function fakeSheet(name, header) {
  const rows = header ? [header.slice()] : [];
  const sh = {
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
            const row = rows[r - 1 + i];
            cells.forEach((cell, j) => { row[c - 1 + j] = cell; });
          });
        },
        clearContent() {
          for (let i = 0; i < nr; i++) {
            const row = rows[r - 1 + i];
            if (!row) continue;
            for (let j = 0; j < nc; j++) row[c - 1 + j] = '';
          }
          // Trailing all-blank rows no longer count, the way a real sheet's getLastRow works.
          while (rows.length > 1 && rows[rows.length - 1].every((x) => x === '' || x === undefined)) rows.pop();
        },
      };
    },
  };
  return sh;
}

// Build a sandbox holding the real .gs code over a fake spreadsheet + in-memory store blobs.
function server(opts = {}) {
  const sheets = {};
  const blobs = {};
  const log = [];
  // Starts just BEFORE the test job ids below (which are creation timestamps), so a ledger
  // created on the first save predates them — the normal case. The bootstrap group moves it.
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
    // The store blobs are chunked JSON in the real thing; here they are plain objects. The
    // functions under test only ever go through these two helpers.
    _readStoreBlob(name, empty) { return Object.prototype.hasOwnProperty.call(blobs, name) ? JSON.parse(blobs[name]) : empty; },
    // Writing a blob also creates its tab, the way _writeStoreBlob does — resetAllJobDataConfirm
    // only clears stores whose tab exists.
    _writeStoreBlob(name, obj) { blobs[name] = JSON.stringify(obj); if (!sheets[name]) sheets[name] = fakeSheet(name, ['Updated', 'JSON']); },
    Date: Object.assign(function (...a) { return a.length ? new Date(...a) : new Date(now); }, { now: () => now, parse: Date.parse, UTC: Date.UTC }),
    __sheets: sheets, __blobs: blobs, __log: log,
    __tick(ms) { now += ms; return now; },
  };
  ctx.Date.prototype = Date.prototype;
  vm.createContext(ctx);
  const names = ['getJobsFromSheet', 'saveAllJobsToSheet', 'saveJobToSheet', 'deleteJobFromSheet',
    'getJobLedger', '_ledgerMarkSeen', '_jobRefusal', '_presentJobIds', '_deletedJobIds',
    '_stripRefusedJobKeys', '_jobRefusalCtx', '_sweepDeletedJobKeys', '_purgeJobFromStores',
    '_okWithDrops', '_mergeStoreByKey', 'saveEstimateStore', 'getEstimateStore',
    'saveJobPlanStore', 'getJobPlanStore', 'saveLogStore', 'getLogStore', 'saveChangeOrderStore',
    'getChangeOrderStore', 'resetAllJobDataConfirm', 'allowJobRestoreConfirm', 'previewDeletedJobs'];
  const code = [gsVar(GS, 'SHEET_ID'), gsVar(GS, 'RESET_JOB_STORES'), gsVar(GS, 'RESET_JOB_SHEETS'),
    gsVar(GS, 'JOB_LEDGER_STORE'), ...names.map((n) => gsFn(GS, n)),
    // saveMediaStore lives in the other file and leans on getMediaStore + _mergeMediaItems.
    gsFn(GS_INV, 'saveMediaStore'), gsFn(GS_INV, 'getMediaStore'), gsFn(GS_INV, '_mergeMediaItems')].join('\n\n');
  vm.runInContext(code, ctx, { filename: 'main-sync.gs (extracted)' });
  return ctx;
}

const HDR = ['ID', 'HVL ID', 'Name', 'Email', 'Phone', 'Address', 'City', 'Zip', 'Service', 'Status', 'Created', 'Data JSON'];
function job(id, name, over) {
  return Object.assign({ id, hvlId: 'HVL-' + id, name, created: new Date(id).toISOString(), updatedAt: id }, over || {});
}
const idsOf = (arr) => arr.map((j) => j.id).sort((a, b) => a - b);
// Advancing the fake clock by this much mints an id later than every fixture id below.
const STEP = 1_000_000;

module.exports = function ({ group, ok, eq, has, lacks }) {
  // Ids are creation timestamps in the app (id: Date.now()). All of these predate `now`.
  const A = 1_757_000_000_000, B = 1_757_000_100_000, C = 1_757_000_200_000;

  group('ledger: the reported case — rows cleared by hand, a stale laptop saves');
  {
    const s = server();
    // Day 1: two devices have been saving normally; the sheet holds A and B.
    s.saveAllJobsToSheet([job(A, 'Alpha'), job(B, 'Bravo')]);
    eq(idsOf(s.getJobsFromSheet()), [A, B], 'both jobs written');
    const led = JSON.parse(s.__blobs.JobLedger);
    eq(Object.keys(led.seen).sort(), [String(A), String(B)], 'the ledger has seen both');

    // Anthony deletes every row in the spreadsheet by hand. NOTHING runs — no action, no
    // tombstone. This is the case a deleteJob-written tombstone could never cover.
    s.__sheets.Jobs._rows.splice(1);
    eq(s.getJobsFromSheet(), [], 'the sheet is empty');

    // Ashley's laptop, open since before, adds one client and saves its whole array.
    const N = s.__tick(STEP);
    const r = s.saveAllJobsToSheet([job(A, 'Alpha'), job(B, 'Bravo'), job(N, 'New client')]);
    eq(idsOf(s.getJobsFromSheet()), [N], 'ONLY the new client lands — the deleted two are refused, not merged');
    eq(r.dropped.sort(), [A, B], 'and the response names the refused ids so the laptop can drop them too');
    eq(s._okWithDrops(r), { ok: true, success: true, dropped: r.dropped }, 'doPost hands them back as `dropped`');
    eq(s._okWithDrops({ dropped: [] }), { ok: true, success: true }, 'a clean write answers exactly as it always did');
  }

  group('ledger: deleteJob and the reset script both leave a memory');
  {
    const s = server();
    s.saveAllJobsToSheet([job(A, 'Alpha'), job(B, 'Bravo'), job(C, 'Charlie')]);
    s.deleteJobFromSheet(B);
    eq(idsOf(s.getJobsFromSheet()), [A, C], 'the deleteJob action removed the row');
    let r = s.saveAllJobsToSheet([job(A, 'Alpha'), job(B, 'Bravo'), job(C, 'Charlie')]);
    eq(idsOf(s.getJobsFromSheet()), [A, C], 'a stale device cannot put B back');
    eq(r.dropped, [B], 'B is the one refused');

    // A row typed into the sheet by hand was never written by the app, so the ledger has
    // not seen it — deleting it through the action must still remember it.
    const H = C + 5000;
    s.__sheets.Jobs._rows.push([H, 'HVL-H', 'Hand', '', '', '', '', '', '', '', '', JSON.stringify(job(H, 'Hand'))]);
    s.deleteJobFromSheet(H);
    r = s.saveAllJobsToSheet([job(H, 'Hand')]);
    eq(r.dropped, [H], 'a hand-typed row deleted through the action is remembered too');

    // The reset script: everything present is remembered as it goes.
    s.saveEstimateStore({ [String(C)]: { savedAt: 1, estimate: { jobId: C } } });
    s.resetAllJobDataConfirm();
    eq(s.getJobsFromSheet(), [], 'reset cleared the Jobs sheet');
    eq(s.getEstimateStore(), {}, 'reset cleared the estimate store');
    ok(!!s.__blobs.JobLedger, 'the ledger SURVIVES the reset — it is the memory of it');
    lacks(JSON.stringify(s.RESET_JOB_STORES), 'JobLedger', 'and is not in RESET_JOB_STORES');
    r = s.saveAllJobsToSheet([job(A, 'Alpha'), job(C, 'Charlie')]);
    eq(s.getJobsFromSheet(), [], 'after the reset a stale device can put nothing back');
    eq(r.dropped.sort(), [A, C], 'both refused');
    ok(s.__log.some((l) => /remembers/.test(l)), 'the reset log says the ledger was updated');
    lacks(s.__log.join('\n'), 'NOW CLEAR EACH DEVICE', 'the reset no longer orders a device sweep as the only defence');
  }

  group('ledger: the bootstrap gap — deleted before the ledger existed');
  {
    // The deployment lands on a sheet that already holds C. Jobs A and B were deleted by
    // hand LAST WEEK, before any ledger existed: they are in neither the sheet nor `seen`.
    const s = server({ now: C + 500_000 });   // the ledger is born AFTER all three were created
    s.__sheets.Jobs = fakeSheet('Jobs', HDR);
    s.__sheets.Jobs._rows.push([C, 'HVL-C', 'Charlie', '', '', '', '', '', '', '', '', JSON.stringify(job(C, 'Charlie'))]);
    const N = s.__tick(STEP);   // a genuinely new job, created after the ledger's birth
    const r = s.saveAllJobsToSheet([job(A, 'Alpha'), job(B, 'Bravo'), job(C, 'Charlie'), job(N, 'New')]);
    eq(idsOf(s.getJobsFromSheet()), [C, N], 'the pre-existing job and the new job land; the two old ghosts do not');
    eq(r.dropped.sort(), [A, B], 'a never-seen job created before the ledger existed is refused — it was already gone from every reloaded device');
    const led = JSON.parse(s.__blobs.JobLedger);
    ok(led.since > 0 && A < led.since, 'because its id (creation time) predates ledger.since');
    eq(s._jobRefusal(A, null, {}, led), 'predates', 'the reason is named');
    eq(s._jobRefusal(C, null, s._presentJobIds(s.getJobsFromSheet()), led), '', 'a present job is never refused');
    eq(s._jobRefusal(N + 1, null, {}, led), '', 'an unseen job younger than the ledger is new and accepted');
    eq(s._jobRefusal('not-a-timestamp', '2020-01-01T00:00:00Z', {}, led), 'predates', 'a non-numeric id falls back to `created`');
    eq(s._jobRefusal('not-a-timestamp', null, {}, led), '', 'and with neither, it is let through — refusing needs evidence');
  }

  group('ledger: the per-record path refuses the same way');
  {
    const s = server();
    s.saveAllJobsToSheet([job(A, 'Alpha'), job(B, 'Bravo')]);
    s.deleteJobFromSheet(A);
    const r = s.saveJobToSheet(job(A, 'Alpha', { updatedAt: s.__tick(5000) }));
    eq(r.dropped, [A], 'an edit to a deleted job on a stale device is refused');
    eq(idsOf(s.getJobsFromSheet()), [B], 'and does not re-create the row');
    const N = s.__tick(STEP);
    eq(s.saveJobToSheet(job(N, 'New')).dropped, [], 'a new job is written');
    eq(idsOf(s.getJobsFromSheet()), [B, N], 'and lands');
    ok(JSON.parse(s.__blobs.JobLedger).seen[String(N)], 'and the ledger saw it on the way in');
    eq(s.saveJobToSheet(job(B, 'Bravo edited', { updatedAt: s.__tick(1) })).dropped, [], 'an ordinary edit to a present job is untouched');
  }

  group('ledger: the keyed stores refuse records for deleted jobs');
  {
    const s = server();
    s.saveAllJobsToSheet([job(A, 'Alpha'), job(B, 'Bravo')]);
    s.deleteJobFromSheet(A);
    const N = s.__tick(STEP);
    // Estimates — the store CLAUDE.md warned "merges per key, so a local record survives".
    let r = s.saveEstimateStore({ [A]: { savedAt: 5, estimate: {} }, [B]: { savedAt: 5, estimate: {} }, [N]: { savedAt: 5, estimate: {} } });
    eq(Object.keys(s.getEstimateStore()).sort(), [String(B), String(N)], 'the deleted job\'s estimate is stripped; the present and the brand-new one land');
    eq(r.dropped, [String(A)], 'and reported');
    // A new job's estimate may arrive BEFORE its job row (the outbox sends one write at a
    // time in queue order). It must not be refused for merely not being present yet.
    const M = s.__tick(STEP);
    r = s.saveEstimateStore({ [M]: { savedAt: 1, estimate: {} } });
    eq(r.dropped, [], 'an estimate for a job the sheet has not yet been told about is accepted');
    r = s.saveJobPlanStore({ [A]: { savedAt: 1 }, [B]: { savedAt: 1 } });
    eq(Object.keys(s.getJobPlanStore()), [String(B)], 'job plans: same rule');
    r = s.saveLogStore({ [A]: [{ id: 1 }], [B]: [{ id: 2 }] });
    eq(Object.keys(s.getLogStore()), [String(B)], 'hours logs: same rule');
    r = s.saveChangeOrderStore([{ id: 1, jobId: A }, { id: 2, jobId: B }]);
    eq(s.getChangeOrderStore().map((c) => c.id), [2], 'change orders: filtered by the job they belong to');
    eq(r.dropped, [A], 'and the dropped list names the JOB, which is what the app removes');
    const m = s.saveMediaStore({ jobId: A, savedAt: 1, items: [{ stableId: 'x', updatedAt: 1 }] });
    eq(m.dropped, [String(A)], 'the photo manifest for a deleted job is refused');
    eq(s.getMediaStore(), {}, 'and nothing was written for it');
    eq(s.saveMediaStore({ jobId: B, savedAt: 1, items: [{ stableId: 'y', updatedAt: 1 }] }).count, 1, 'a present job\'s manifest saves as before');
  }

  group('ledger: loadJobs tells devices what is gone, and a restore is deliberate');
  {
    const s = server();
    s.saveAllJobsToSheet([job(A, 'Alpha'), job(B, 'Bravo')]);
    s.deleteJobFromSheet(A);
    const led = s.getJobLedger();
    eq(s._deletedJobIds(s._presentJobIds(s.getJobsFromSheet()), led), [String(A)], '`deletedJobs` on loadJobs is the seen-but-absent set');
    has(GS, 'deletedJobs: _deletedJobIds(_presentJobIds(jobsNow), getJobLedger())', 'and doGet loadJobs sends it');

    // The escape hatch: a row deleted by mistake. Single-use permission.
    s.allowJobRestoreConfirm([A]);
    let r = s.saveAllJobsToSheet([job(A, 'Alpha')]);
    eq(r.dropped, [], 'allowed back once');
    eq(idsOf(s.getJobsFromSheet()), [A, B], 'and it is in the sheet again');
    eq(JSON.parse(s.__blobs.JobLedger).restore, {}, 'the permission was spent on the write');
    s.deleteJobFromSheet(A);
    r = s.saveAllJobsToSheet([job(A, 'Alpha')]);
    eq(r.dropped, [A], 'deleted again, refused again — the permission did not linger');
    s.previewDeletedJobs();
    ok(s.__log.some((l) => l.indexOf(String(A)) >= 0), 'previewDeletedJobs lists it');
    // A stale run of the old reset log line must not survive.
    lacks(GS, 'push the old clients straight back up', 'the reset no longer claims devices will re-push');
  }

  group('ledger: idempotence — a second identical save changes nothing');
  {
    const s = server();
    s.saveAllJobsToSheet([job(A, 'Alpha'), job(B, 'Bravo')]);
    s.deleteJobFromSheet(A);
    s.saveAllJobsToSheet([job(A, 'Alpha'), job(B, 'Bravo')]);
    const before = JSON.stringify([s.getJobsFromSheet(), s.__blobs.JobLedger]);
    s.saveAllJobsToSheet([job(A, 'Alpha'), job(B, 'Bravo')]);
    eq(JSON.stringify([s.getJobsFromSheet(), s.__blobs.JobLedger]), before, 'sheet and ledger identical after a repeat');
  }

  group('doPost routes every job-keyed write through _okWithDrops');
  {
    const post = GS.slice(GS.indexOf('function doPost('));
    const body = post.slice(0, post.indexOf('\n}\n'));
    ['job', 'saveAllEstimates', 'saveAllJobs', 'saveAllJobPlans', 'saveAllChangeOrders', 'saveAllLogs'].forEach((t) => {
      ok(new RegExp("type === '" + t + "'\\)\\s*\\{ return jsonOut\\(_okWithDrops\\(").test(body),
         'doPost: ' + t + ' answers with dropped ids');
    });
  }

  group('app: the device drops what the sheet refused, without saving it back');
  {
    let saves = 0, badges = [], redraws = 0;
    const ctx = sandbox({
      fns: ['_applyDroppedJobs', '_purgeLocalJobRecords'],
      stubs: {
        jobs: [job(A, 'Alpha'), job(B, 'Bravo'), job(C, 'Charlie')],
        estimateStore: { [A]: { e: 1 }, [B]: { e: 2 } },
        jobLogs: { [A]: [{ id: 1 }], [C]: [{ id: 3 }] },
        jobPlanStore: { [A]: { p: 1 } },
        changeOrders: [{ id: 1, jobId: A }, { id: 2, jobId: B }],
        saveJobs() { saves++; },
        postSyncBadge() { saves++; },
        showSyncBadge(m) { badges.push(m); },
        renderJobs() { redraws++; },
        rebuildDropdowns() { redraws++; },
      },
    });
    ctx.localStorage.setItem('hav_media_' + A, '[1]');
    ctx.localStorage.setItem('hav_media_thumb_' + A, '{}');
    ctx.localStorage.setItem('hav_media_' + B, '[2]');

    const n = ctx._applyDroppedJobs([String(A), C]);   // ids arrive as strings or numbers from JSON
    eq(n, 2, 'two jobs removed');
    eq(idsOf(ctx.jobs), [B], 'only the surviving job remains in memory');
    eq(JSON.parse(ctx.localStorage.getItem('havellin_jobs_v3')).map((j) => j.id), [B], 'and in localStorage');
    eq(Object.keys(ctx.estimateStore), [String(B)], 'its estimate went with it');
    eq(Object.keys(ctx.jobLogs), [], 'so did its hours');
    eq(Object.keys(ctx.jobPlanStore), [], 'and its job plan');
    eq(ctx.changeOrders.map((c) => c.id), [2], 'and its change orders');
    eq(ctx.localStorage.getItem('hav_media_' + A), null, 'and its photo manifest');
    eq(ctx.localStorage.getItem('hav_media_thumb_' + A), null, 'and the thumbnail cache');
    eq(ctx.localStorage.getItem('hav_media_' + B), '[2]', 'the surviving job\'s manifest is untouched');
    eq(JSON.parse(ctx.localStorage.getItem('havellin_est_v4')), { [B]: { e: 2 } }, 'the estimate store was re-persisted');
    eq(saves, 0, 'NOTHING WAS PUSHED — saveJobs() here would post the deleted jobs straight back');
    ok(redraws >= 2, 'the list and the dropdowns were redrawn');
    eq(badges.length, 1, 'one message');
    has(badges[0], '2 clients deleted elsewhere', 'that says what happened, not "lost"');
    eq(ctx._applyDroppedJobs([]), 0, 'an empty list is a no-op');
    eq(ctx._applyDroppedJobs(['nope']), 0, 'an unknown id removes nothing');
    eq(badges.length, 1, 'and says nothing');
  }

  group('app: both send paths and both load paths listen');
  {
    const ob = APP.slice(APP.indexOf('function _flushOutbox('));
    has(ob.slice(0, ob.indexOf('\n}\n')), '_applyDroppedJobs(res.dropped)', 'the outbox applies dropped ids on success');
    const fl = APP.slice(APP.indexOf('function flushPendingWrites('));
    has(fl.slice(0, fl.indexOf('\n}\n')), '_applyDroppedJobs(res.dropped)', 'so does the retry queue');
    const lj = APP.slice(APP.indexOf('function loadJobs('));
    has(lj.slice(0, lj.indexOf('\n}\n')), '_purgeLocalJobRecords(data.deletedJobs)', 'loadJobs purges local records for deleted jobs');
    const rj = APP.slice(APP.indexOf('function refreshJobsFromCloud('));
    has(rj.slice(0, rj.indexOf('\n}\n')), '_purgeLocalJobRecords(data.deletedJobs)', 'so does refreshJobsFromCloud');
    const hd = APP.slice(APP.indexOf('function hardDeleteJob('));
    has(hd.slice(0, hd.indexOf('\n}\n')), '_purgeLocalJobRecords([id])', 'the deliberate delete shares the purge rather than carrying a second copy');
    // The one thing _applyDroppedJobs must never do.
    const ad = APP.slice(APP.indexOf('function _applyDroppedJobs('));
    lacks(ad.slice(0, ad.indexOf('\n}\n')), 'saveJobs()', '_applyDroppedJobs never calls saveJobs()');
    lacks(ad.slice(0, ad.indexOf('\n}\n')), 'postSyncBadge', 'and never posts');
  }
};
