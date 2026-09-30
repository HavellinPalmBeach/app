'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// P11 (2026-09-28 workflow audit, finding M9 and the C2 follow-up): HARDEN THE BACKEND.
//
//   · An unreadable store tab used to read as EMPTY, so the next save merged into nothing and wrote
//     back only what that one save carried — every other job's records in that store gone.
//   · Nine save paths swallowed a lock timeout and wrote WITHOUT the lock.
//   · The maps two people edit at once (four sourcing buckets, the team, ratings, the review ask,
//     the house checklist) rode the whole record, so any save from a morning copy undid them.
//   · The stale-backend banner listed six actions and one type out of the 26 the app posts, and no
//     action name can reveal server-only behaviour, so a deployment without this pack drew nothing.
//
// The server half drives the REAL main-sync.gs functions — the real chunked blob reader and writer
// over a fake spreadsheet — and the app half the real havellin.html functions.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { sandbox, matchBrace, source, fn, domStub } = require('./harness');

const GS = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'main-sync.gs'), 'utf8');
const GS_INV = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'saveInventory.gs'), 'utf8');

function gsFn(src, name) {
  const re = new RegExp('(^|\\n)function\\s+' + name + '\\s*\\(', 'g');
  const m = re.exec(src);
  if (!m) throw new Error('not in .gs: ' + name);
  const start = m.index + (m[1] ? m[1].length : 0);
  const open = src.indexOf('{', re.lastIndex);
  return src.slice(start, matchBrace(src, open) + 1);
}
function gsVar(src, name) {
  const m = src.match(new RegExp('(^|\\n)(var\\s+' + name + '\\s*=[^;]*;)'));
  if (!m) throw new Error('var not in .gs: ' + name);
  return m[2];
}
// A minimal in-memory Sheet (rows of cells, 1-based ranges), enough for the real chunked blob code.
function fakeSheet(name, header) {
  const rows = header ? [header.slice()] : [];
  return {
    getName: () => name, _rows: rows,
    getLastRow: () => rows.length,
    appendRow(r) { rows.push(r.slice()); },
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
          for (let i = 0; i < nr; i++) { const row = rows[r - 1 + i]; if (row) for (let j = 0; j < nc; j++) row[c - 1 + j] = ''; }
          while (rows.length > 1 && rows[rows.length - 1].every((x) => x === '' || x === undefined)) rows.pop();
        },
      };
    },
  };
}

function gsServer(opts = {}) {
  const sheets = {};
  const ctx = {
    console, JSON,
    Logger: { log() {} },
    LockService: { getScriptLock: () => ({ tryLock: () => opts.lockFree !== false, waitLock() {}, releaseLock() {} }) },
    SpreadsheetApp: { openById: () => ({ getSheetByName: (n) => sheets[n] || null,
      insertSheet(n) { sheets[n] = fakeSheet(n); return sheets[n]; } }) },
    ContentService: { MimeType: { JSON: 'json' },
      createTextOutput: (s) => ({ setMimeType() { return this; }, getContent: () => s }) },
    __sheets: sheets,
  };
  vm.createContext(ctx);
  const names = ['_readStoreBlob', '_writeStoreBlob', '_lockOrBusy', 'saveEstimateStore', 'getEstimateStore',
    'saveJobPlanStore', 'getJobPlanStore', '_mergePlanStore', '_mergePlanRecord', '_planStamp',
    'saveLogStore', 'getLogStore', '_mergeStoreByKey', '_stripRefusedJobKeys', '_jobRefusalCtx', '_sweepDeletedJobKeys',
    'getJobLedger', '_jobRefusal', '_presentJobIds', '_deletedJobIds', '_ledgerMarkSeen', 'getJobsFromSheet',
    'doPost', 'doGet', 'jsonOut', '_okWithDrops'];
  const code = [gsVar(GS, 'SHEET_ID'), gsVar(GS, '_BLOB_CHUNK'), gsVar(GS, 'JOB_LEDGER_STORE'), gsVar(GS, 'PLAN_KEYED_MAPS'),
    gsVar(GS, 'BACKEND_VERSION'), ...names.map((n) => gsFn(GS, n)),
    gsFn(GS_INV, 'saveMediaStore'), gsFn(GS_INV, 'getMediaStore'), gsFn(GS_INV, '_mergeMediaItems')].join('\n\n');
  vm.runInContext(code, ctx, { filename: 'main-sync.gs (extracted)' });
  return ctx;
}
const snapshot = (ctx) => JSON.stringify(Object.keys(ctx.__sheets).sort().map((n) => [n, ctx.__sheets[n]._rows]));
const post = (ctx, body) => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(body) } }).getContent());
const get = (ctx, action) => JSON.parse(ctx.doGet({ parameter: { action } }).getContent());

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ M9 — AN UNREADABLE STORE TAB IS REFUSED, NEVER READ AS EMPTY');
  {
    const S = gsServer();
    // Two clients' estimates on the sheet, written the real way.
    S._writeStoreBlob('EstimateStore', { 11: { savedAt: 1, estimate: { svc: 'cleanout' } }, 12: { savedAt: 1, estimate: { svc: 'probate' } } });
    eq(Object.keys(S.getEstimateStore()).sort(), ['11', '12'], 'a healthy store reads back both clients');
    // The tab is damaged: the JSON is cut short (a bad paste, a hand edit, a half-finished write).
    const tab = S.__sheets.EstimateStore;
    tab._rows[1][1] = String(tab._rows[1][1]).slice(0, 40);
    const before = JSON.stringify(tab._rows);

    let threw = '';
    try { S.saveEstimateStore({ 13: { savedAt: 2, estimate: { svc: 'prep' } } }); } catch (e) { threw = String(e && e.message); }
    has(threw, 'STORE_UNREADABLE', '⚠⚠ a save into an unreadable tab refuses');
    has(threw, 'EstimateStore', 'and names the tab');
    has(threw, 'Version history', 'and says how to put it right');
    eq(JSON.stringify(tab._rows), before, '⚠⚠ and the tab is left exactly as it was — the old code wrote {13} over both clients');

    const r = post(S, { type: 'saveAllEstimates', payload: { 13: { savedAt: 2, estimate: { svc: 'prep' } } } });
    eq(r.ok, false, 'through doPost the write answers ok:false, so the app keeps it and retries');
    has(r.error, 'STORE_UNREADABLE', 'with the reason in the error the app shows');
    const g = get(S, 'loadEstimates');
    eq(g.ok, false, '⚠ and a load answers an error, not an empty store — "none" would be a lie');
    eq(g.estimates, undefined, 'with no estimates object to mistake for an empty one');

    // A MISSING tab is still honestly empty (nothing was ever written there).
    const E = gsServer();
    eq(JSON.stringify(E.getEstimateStore()), '{}', 'a tab that does not exist reads as the empty store, as before');
    E.saveEstimateStore({ 21: { savedAt: 1, estimate: {} } });
    eq(Object.keys(E.getEstimateStore()), ['21'], 'and the first save creates it');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ M9 — A SAVE THAT CANNOT GET THE LOCK DOES NOT WRITE');
  {
    const S = gsServer({ lockFree: false });
    S._writeStoreBlob('JobPlanStore', { 11: { savedAt: 1, rooms: {} } });
    const before = snapshot(S);
    let threw = '';
    try { S.saveJobPlanStore({ 12: { savedAt: 2, rooms: {} } }); } catch (e) { threw = String(e && e.message); }
    has(threw, 'busy', '⚠⚠ a lock timeout refuses the write');
    eq(snapshot(S), before, '⚠⚠ and nothing was written without the lock');
    const r = post(S, { type: 'saveAllLogs', payload: { 12: [] } });
    eq(r.ok, false, 'through doPost it answers ok:false');
    has(r.error, 'busy', 'naming why');
    // The app reads "busy" as retryable: not a stale deployment, not a routing fault, not a crash.
    const A = sandbox({ fns: ['_backendErrorKind'] });
    eq(A._backendErrorKind(r.error, true, { type: 'saveAllLogs' }), '', 'the app retries a busy answer by itself');
    eq(A._backendErrorKind('Error: STORE_UNREADABLE: the EstimateStore tab…', true, { type: 'saveAllEstimates' }), '',
       'and keeps retrying an unreadable-store answer until the tab is restored');
    // Every lock site in both files goes through the one rule.
    const bare = (GS + GS_INV).split('\n').filter((l) => /try\s*\{\s*lock\.waitLock\(/.test(l) && !/^\s*\/\//.test(l));
    eq(bare, [], 'no save path swallows a lock timeout any more');
    ok((GS.match(/\b_lockOrBusy\(lock\)/g) || []).length >= 8, 'the eight main-sync.gs save paths take the lock through _lockOrBusy');
    ok(/\b_lockOrBusy\(lock\)/.test(GS_INV), 'and so does saveMediaStore');
    // With the lock free, the same save lands.
    const F = gsServer();
    F.saveJobPlanStore({ 12: { savedAt: 2, rooms: {} } });
    ok(!!F.getJobPlanStore()[12], 'with the lock free the save lands as before');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ C2 follow-up — the maps two people edit at once merge key by key');
  {
    // The merge rule itself, on the real function: A's copy carries its own stamped vendor line and
    // concierge; B's later whole record carries its stamped checklist row and stale copies of the rest.
    const S = vm.createContext({ console });
    vm.runInContext([gsVar(GS, 'JOB_KEYED_LISTS'), gsVar(GS, 'JOB_KEYED_MAPS'), gsVar(GS, 'JOB_LIST_KEY'), gsVar(GS, 'JOB_PAYMENT_STICKY'),
      gsFn(GS, '_jobStamp'), gsFn(GS, '_jobListKey'), gsFn(GS, '_mergeJobKeyed'), gsFn(GS, '_mergeJobRecord'), gsFn(GS, '_paymentSticky')].join('\n\n'), S);
    ['vendorSourcing', 'prepSourcing', 'logisticsSourcing', 'collSourcing', 'crew', 'vendorRatings', 'reviewAsk', 'houseFlags']
      .forEach((k) => ok(S.JOB_KEYED_MAPS.indexOf(k) >= 0, k + ' merges key by key'));
    const MORNING = 1000;
    const base = () => ({ id: 7, updatedAt: MORNING, at: {},
      vendorSourcing: { Lv1: { quote: 12000 } }, crew: { tc: { name: '' }, ps: [], confirmed: false },
      houseFlags: { firearms: { on: false, note: '' }, access: { on: false, note: '' } },
      reviewAsk: {}, vendorRatings: {} });
    const sheet = base();
    sheet.vendorSourcing.Lv1 = { quote: 13500, status: 'Confirmed' };
    sheet.crew.tc = { name: 'Ashley Jerome' };
    sheet.at = { 'vendorSourcing:Lv1': 2000, 'crew:tc': 2000 };
    sheet.updatedAt = 2000;
    const inc = base();                                   // B, on the morning copy, ticks firearms
    inc.houseFlags.firearms = { on: true, note: 'Two pistols, bedroom safe' };
    inc.at = { 'houseFlags:firearms': 3000 };
    inc.updatedAt = 3000;
    const out = S._mergeJobRecord(JSON.parse(JSON.stringify(sheet)), inc);
    eq(out.vendorSourcing.Lv1, { quote: 13500, status: 'Confirmed' }, '⚠⚠ A\'s confirmed vendor line survives B\'s later save of a morning copy');
    eq(out.crew.tc.name, 'Ashley Jerome', '⚠⚠ …and so does A\'s concierge');
    eq(out.houseFlags.firearms, { on: true, note: 'Two pistols, bedroom safe' }, 'while B\'s own checklist row lands');
    eq(out.houseFlags.access, { on: false, note: '' }, 'and a row neither touched is left alone');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('the writers stamp exactly what they changed — the app half of the per-key merge');
  {
    const C = sandbox({ fns: ['_stampChangedKeys', '_jobTouch'] });
    const job = { id: 7, updatedAt: 1, at: {} };
    const n = C._stampChangedKeys(job, 'houseFlags',
      { cash: { on: false, note: '' }, firearms: { on: false, note: '' } },
      { cash: { on: false, note: '' }, firearms: { on: true, note: 'safe' } });
    eq(n, 1, 'one row changed, one stamp');
    ok(job.at['houseFlags:firearms'] > 1 && !job.at['houseFlags:cash'], '⚠ the untouched row claims nothing');
    const job2 = { id: 7, at: {} };
    C._stampChangedKeys(job2, 'reviewAsk', { draftedAt: 'x', sentAt: 'y' }, { draftedAt: 'z' });
    ok(job2.at['reviewAsk:sentAt'] && job2.at['reviewAsk:draftedAt'], 'a field the new value drops is stamped as removed, beside the one it changed');

    // The review ask, driven: a draft stamps each field it writes; "I've sent it" stamps the two it adds.
    const R = sandbox({ fns: ['draftReviewRequest', 'markReviewRequestSent', '_stampChangedKeys', '_jobTouch'],
      stubs: { _planTaskDone: () => true, bestClientEmail: () => 'tripp@example.com', gmailConfigured: () => false,
        _reviewMailtoUrl: () => 'mailto:x', _coNotice() {}, _repaintCloseout() {}, saveJobs() {}, syncJobToSheets() {},
        _actor: () => 'Ashley Jerome', window: { location: {} } } });
    R.jobs = [{ id: 7, updatedAt: 1, at: {} }];
    R.draftReviewRequest(7);
    const ra = R.jobs[0].at;
    ok(ra['reviewAsk:draftedAt'] && ra['reviewAsk:via'] && ra['reviewAsk:by'], '⚠ a review draft stamps the fields it wrote');
    ok(!ra['reviewAsk:sentAt'], 'and not one it never had');
    R.markReviewRequestSent(7);
    ok(R.jobs[0].at['reviewAsk:sentAt'] && R.jobs[0].at['reviewAsk:sentBy'], '⚠ "I\'ve sent it" stamps sentAt and sentBy');

    // Edit Client's checklist: compared in normalised form, so a job whose record never carried a row
    // does not claim that row as changed when the form reads it back unticked.
    const body = fn('saveClientEdit');
    has(body, "_stampChangedKeys(job, 'houseFlags', _hfBefore, houseFlagsOf(job))", 'Edit Client stamps only the checklist rows it changed');
    has(fn('_crewSave'), "_stampChangedKeys(job, 'crew', before, job.crew)", 'the crew save stamps the parts its writer changed');
    ['setCrewTC', 'setCrewTC2', 'setCrewPS', 'confirmJobTeam', 'reviseJobTeam', 'lockAssignedCrew'].forEach((w) => {
      has(fn(w), 'var before = _crewSnap(crew);', w + ' snapshots the crew before it writes');
      has(fn(w), '_crewSave(jobId, before)', w + ' saves with that snapshot');
    });

    // The adoption step's removal is stamped, so the old index key cannot come back as an orphan.
    const A = sandbox({ fns: ['_srcAdoptLineIds', '_srcLid', '_jobTouch'], vars: ['_srcLidSeq'] });
    const j = { id: 7, at: {}, vendorSourcing: { 0: { vendorName: 'Junk Kings', status: 'Confirmed' } } };
    const est = { vendors: [{ type: 'Junk Removal', cost: 900 }] };
    ok(A._srcAdoptLineIds(j, est), 'the line gets its id');
    const newKey = 'L' + est.vendors[0].lid;
    eq(Object.keys(j.vendorSourcing), [newKey], 'the record moves onto it');
    ok(j.at['vendorSourcing:0'] > 0, '⚠ and the index key it left is stamped as removed');
    // Drive the server merge with it: the sheet still holds the index key.
    const S = vm.createContext({ console });
    vm.runInContext([gsVar(GS, 'JOB_KEYED_LISTS'), gsVar(GS, 'JOB_KEYED_MAPS'), gsVar(GS, 'JOB_LIST_KEY'), gsVar(GS, 'JOB_PAYMENT_STICKY'),
      gsFn(GS, '_jobStamp'), gsFn(GS, '_jobListKey'), gsFn(GS, '_mergeJobKeyed'), gsFn(GS, '_mergeJobRecord'), gsFn(GS, '_paymentSticky')].join('\n\n'), S);
    const merged = S._mergeJobRecord({ id: 7, updatedAt: 1, at: {}, vendorSourcing: { 0: { vendorName: 'Junk Kings', status: 'Confirmed' } } },
      Object.assign({}, j, { updatedAt: 5 }));
    eq(Object.keys(merged.vendorSourcing), [newKey], '⚠⚠ the orphan index key does not come back to be counted at close-out');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ THE BANNER KNOWS EVERYTHING THE APP POSTS, AND WHAT NO ACTION NAME CAN SHOW');
  {
    const live = src.split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
    const posted = new Set();
    [...live.matchAll(/action:\s*'([A-Za-z]+)'/g)].forEach((m) => posted.add(m[1]));
    [...live.matchAll(/_invShareEach\(ids,\s*'([A-Za-z]+)'/g)].forEach((m) => posted.add(m[1]));
    [...live.matchAll(/postSyncBadge\(\s*\{\s*type:\s*'([A-Za-z]+)'/g)].forEach((m) => posted.add(m[1]));
    [...live.matchAll(/syncToSheets\('([A-Za-z]+)'/g)].forEach((m) => posted.add(m[1]));
    ok(posted.size >= 25, 'the app\'s posts were found in its source (' + posted.size + ')');
    const B = sandbox({ vars: ['BACKEND_NEEDS', 'BACKEND_NEEDS_TYPES', 'BACKEND_FEATURE_COST', 'BACKEND_MIN_VERSION'] });
    const listed = new Set(B.BACKEND_NEEDS.concat(B.BACKEND_NEEDS_TYPES));
    eq([...posted].filter((a) => !listed.has(a)).sort(), [], '⚠⚠ every action and type the app posts is on the banner\'s list');
    eq([...listed].filter((a) => !Object.prototype.hasOwnProperty.call(B.BACKEND_FEATURE_COST, a)).sort(), [],
       'and each says what breaks without it');
    const bv = (GS.match(/BACKEND_VERSION\s*=\s*'([^']+)'/) || [])[1];
    ok(bv >= B.BACKEND_MIN_VERSION, 'the backend on main satisfies the app\'s minimum (' + bv + ' ≥ ' + B.BACKEND_MIN_VERSION + ')');
    ok(B.BACKEND_MIN_VERSION >= '2026-09-30', 'and the minimum is at least this pack');

    // Drive the real check against three deployments.
    const run = (answer) => {
      const shown = [];
      const C = sandbox({ fns: ['checkBackendVersion'], vars: ['BACKEND_NEEDS', 'BACKEND_NEEDS_TYPES', 'BACKEND_MIN_VERSION', '_backendVersion'],
        stubs: { SHEETS_SYNC_URL: 'https://sheets', _showBackendStaleBanner: (v, m) => shown.push({ v, m }),
          fetch: () => ({ then(f) { const r = f({ json: () => answer }); return { then(g) { g(r); return { catch() {} }; } }; } }) } });
      C.checkBackendVersion();
      return shown;
    };
    const all = { actions: B.BACKEND_NEEDS, types: B.BACKEND_NEEDS_TYPES };
    eq(run(Object.assign({ ok: true, version: bv }, all)), [], 'a current deployment draws no banner');
    const old = run(Object.assign({ ok: true, version: '2026-09-22b' }, all));
    eq(old.length === 1 && old[0].m, ['version'], '⚠⚠ a deployment from before this pack is named, though it lacks no action');
    const older = run({ ok: true, version: '2026-09-18a', actions: B.BACKEND_NEEDS.filter((a) => a !== 'esignSend'), types: B.BACKEND_NEEDS_TYPES });
    eq(older.length === 1 && older[0].m, ['esignSend', 'version'], 'a missing action is named with it');
    const ancient = run({ ok: false, error: 'Unknown action' });
    eq(ancient.length === 1 && ancient[0].m, ['preVersion', 'version'], 'a deployment too old to answer is named as such, not charged with 26 features');
    has(B.BACKEND_FEATURE_COST.version, 'undo each other', 'and the version line says what breaks by consequence');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('Agent One gets room to finish a dense frame (P14, bundled with this redeploy)');
  {
    const m = GS.match(/var AGENT_MAX_TOKENS\s*=\s*(\d+)/);
    const n = m ? Number(m[1]) : 0;
    ok(n >= 16000, 'AGENT_MAX_TOKENS is at least 16,000 (' + n + ') — 4,096 cut dense frames off with adaptive thinking on');
    ok(n <= 16000, 'and no more: the request is not streamed, and 16,000 is the documented non-streaming ceiling');
    has(gsFn(GS, '_agReadResult'), "body.stop_reason === 'max_tokens'", 'a cut-off answer still reads as a failure, never an empty frame');
  }
};
