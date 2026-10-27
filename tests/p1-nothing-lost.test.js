'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// P1 of the desk audit (2026-10-27): NOTHING IS LOST — the Jobs sheet and every device's copy.
// audits/2026-10-27-desk/PLAN.md, P1; findings VAL-01, INV-02, SYN-08, VAL-31, INV-14, GAP3-01 to GAP3-09.
//
// What the audit drove end to end on the real code over a fake sheet that refuses a cell over 50,000 characters (GAP3):
// one inventory Snapshot of a full house put the client's record past the cell; saveAllJobsToSheet cleared the Jobs tab
// and then threw; the ledger read every client as deleted; the iPad that pressed Snapshot was at 0 clients 2.25 s later
// under "All changes saved ✓"; every other device emptied itself at first contact; the first new client swept every other
// client's estimate, plan, hours and 450-line inventory off the stores; a device holding photographs not yet in Drive lost
// them; the failed write was retried for ever and emptied the restored tab again; and every store tab was cleared before
// it was written. "Variant A" is Apps Script keeping a clearContent that ran before a setValues that threw; "variant B"
// rolls the execution's writes back. Nobody outside Google can say which it is (the probe below asks), so both are driven.
//
// This file is that rig turned into tests: the WHOLE of apps-script/main-sync.gs and saveInventory.gs, evaluated as they
// are deployed, over the fake sheet; two or three devices built from the real sync code in havellin.html, their fetch
// routed to the server's real doGet and doPost through a synchronous promise and a virtual clock, so the outbox, the
// retry queue and the refreshes run as they do in the browser. Browser step 115 drives the same on the real page.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { sandbox, fn, domStub } = require('./harness');

// The server, the fake sheet and the synchronous promise are the rig browser step 115 drives too (tests/sheet-rig.js).
const { server, SP, CELL_MAX, CELL_ERR, GS } = require('./sheet-rig');
const SYNC = 'https://sync.example.test/exec';
const QUIET = { log() {}, warn() {}, error() {} };

// ── A device: the real sync code out of havellin.html, its fetch answered by the server ──
const DEVICE_FNS = ['saveJobs', 'loadJobs', 'loadJobsVerdict', 'refreshJobsFromCloud', '_mergeCloudJobs', '_applyDroppedJobs', '_purgeLocalJobRecords',
  '_unsentPhotoCount', 'unsentPhotosKeptText', 'sheetVerdictRefusal', '_setSheetNotice', 'sheetNoticeHtml', 'queuedPostSync', '_flushOutbox',
  '_enqueueWrite', 'flushPendingWrites', '_writeKey', '_backendErrorKind', '_writeKindHolds', '_retrySoon', '_scheduleRetry', '_pendingCount',
  'postSyncTo', '_targetUrl', 'postSync', 'postSyncBadge', 'syncToSheets', 'syncJobToSheets', '_readAppsScriptJson', '_syncWritesOutstanding',
  '_syncWritesHeld', '_pendingChipCopy', '_tooLargeWords', 'migrateRetiredNames', 'canonPersonName', '_jobTouch', '_saveJobEdit',
  'refreshPlanAndLogFromCloud', 'takeInventorySnapshot', 'snapshotRefusal', 'invColdRefusal', '_invManifestUnread', '_snapItemOf', '_snapLinesPut',
  '_snapLinesOf', 'loadSnapshotLines', '_withSnapLines', 'printInventorySnapshot', 'printSnapshotComparison', 'snapshotDiff', 'backendHasType',
  'invLineQty', '_invRoomName', '_invAssignItemNos', '_jobInvRefs', '_invTrack', 'estateValueDate', 'roundCents', '_snapPrevLive', '_snapVal',
  '_snapVoidedBlock', '_invItemNo', '_invMoney', '_invDateTime', '_invDocName', 'invValBasisWord', '_invHasValue', 'invAppraised',
  'invLineAppraiser', '_invLinkedAppraiser', '_jobAppraisers', '_apprLabel', '_invJob', 'fmt', '_stableJson'];
const DEVICE_VARS = ['PERSON_NAME_ALIASES', 'SYNC_TARGETS', '_pendingWrites', '_retryTimer', '_retryStep', '_flushing', '_retryDelays', 'SYNC_STUCK_TRIES',
  '_outbox', '_outboxTimer', '_outboxSending', '_OUTBOX_WINDOW', '_syncWriteSeq', 'SHEET_NO_CLIENTS_TXT', '_sheetNotice', 'SNAP_LINES_UNREAD_TXT',
  '_snapLines', 'INV_COLD_TXT', '_backendTypes'];

function device(name, srv, persisted, over) {
  over = over || {};
  const timers = [];
  let vnow = 0;
  const net = [], badges = [], alerts = [], filed = [];
  const dev = { name, net, badges, alerts, filed, offline: false, answer: null };
  const fetchStub = (url, opts) => {
    if (dev.offline) return SP.reject(new TypeError('Failed to fetch'));
    const isPost = opts && opts.method === 'POST';
    let text;
    if (isPost) {
      const body = JSON.parse(opts.body);
      net.push({ t: vnow, m: 'POST', what: body.type || body.action, n: Array.isArray(body.payload) ? body.payload.length : undefined, bytes: opts.body.length });
      text = dev.answer ? dev.answer('POST', body) : srv.exec('POST', { postData: { contents: opts.body } });
    } else {
      const q = {};
      String(url).split('?')[1].split('&').forEach((kv) => { const [k, v] = kv.split('='); q[k] = decodeURIComponent(v || ''); });
      net.push({ t: vnow, m: 'GET', what: q.action });
      text = dev.answer ? dev.answer('GET', q) : srv.exec('GET', { parameter: q });
    }
    return SP.resolve({ text: () => SP.resolve(text), json: () => SP.resolve(JSON.parse(text)) });
  };
  const ctx = sandbox({
    fns: DEVICE_FNS, vars: DEVICE_VARS,
    stubs: Object.assign({
      console: QUIET,
      document: domStub({}),
      window: { prompt: () => (dev.label != null ? dev.label : 'Filed with court'), confirm: () => true, addEventListener() {} },
      fetch: fetchStub,
      alert: (m) => alerts.push(String(m)),
      setTimeout: (f, ms) => { const t = { at: vnow + (ms || 0), f, id: timers.length + 1 }; timers.push(t); return t.id; },
      clearTimeout: (id) => { const t = timers.find((x) => x.id === id); if (t) t.dead = true; },
      SHEETS_SYNC_URL: SYNC, VENDOR_SYNC_URL: '', REFERRAL_SYNC_URL: '',
      jobs: [], estimateStore: {}, jobLogs: {}, jobPlanStore: {}, changeOrders: [], _photoRefs: {},
      _jobsState: 'loading', _invCloudSeen: {},
      showSyncBadge: (m, err) => badges.push((err ? '[err] ' : '') + m),
      updatePendingIndicator() {}, rebuildDropdowns() {}, renderJobs() {}, _jobsLanded() {}, deskFoldOpen() {}, renderInventoryTab() {},
      _invTouch(r) { r.updatedAt = (r.updatedAt || 0) + 1; }, savePhotoRefs() {}, _invTrackDefault: () => 'Probate', _avdDate: () => '',
      _snapFilePage: (jobId, ts) => { filed.push([jobId, ts]); return true; },
      _invDocPartyHead: (job) => 'Estate of ' + ((job && job.name) || ''),
      _invDocHead: (job, title, sub) => '<h2>' + title + '</h2><div>' + (sub || '') + '</div>',
      _printDocument(html) { dev.printed = html; return true; },
    }, over.stubs || {}),
  });
  if (persisted) Object.keys(persisted).forEach((k) => ctx.localStorage.setItem(k, persisted[k]));
  ctx._backendTypes = over.types === undefined ? ['saveSnapshot', 'saveMedia', 'saveAllJobs', 'job'] : over.types;
  vm.runInContext("function saveAllEstimatesNow(){ postSyncBadge({ type: 'saveAllEstimates', payload: estimateStore }, 'Estimate synced', 'Cloud sync failed'); }", ctx);
  vm.runInContext("function saveMediaNow(jobId){ postSyncBadge({ type: 'saveMedia', payload: { jobId: jobId, savedAt: Date.now(), items: _photoRefs[jobId] || [] } }, 'Inventory saved', 'Inventory not saved'); }", ctx);
  Object.assign(dev, {
    ctx,
    get now() { return vnow; },
    // Fire every timer due by `ms` from now, in order; the promises are synchronous, so each runs its whole chain.
    run(ms) {
      const end = vnow + (ms || 0);
      for (let guard = 0; guard < 20000; guard++) {
        const due = timers.filter((t) => !t.dead && !t.done && t.at <= end).sort((a, b) => a.at - b.at)[0];
        if (!due) break;
        vnow = Math.max(vnow, due.at); due.done = true; due.f();
      }
      vnow = Math.max(vnow, end);
    },
    cached() { const s = ctx.localStorage.getItem('havellin_jobs_v3'); return s ? JSON.parse(s).length : null; },
    dump() { const o = {}; Object.keys(ctx.__store).forEach((k) => { o[k] = ctx.__store[k]; }); return o; },
    pending() { return Object.keys(ctx._pendingWrites); },
    held() { return Object.keys(ctx._pendingWrites).filter((k) => ctx._pendingWrites[k].blocked); },
  });
  return dev;
}

// ── Fixtures: three clients over the last three days; a full house of named lines ──
// A fixed day (2026-09-21), never the clock: the ids are creation times, and the ledger is born before them. The app's own
// stamps (Date.now() inside the lifted code) are later than any of these, as a real edit's are.
const NOW = 1790000000000;
let _tick = 0;
const later = () => NOW + 3600000 + (++_tick) * 1000;   // an edit made after the fixtures, in order
const IDS = [NOW - 3 * 86400000, NOW - 2 * 86400000, NOW - 86400000];
const NAMES = ['Ellison Estate', 'Ashworth Estate', 'Hale Home Transition'];
const J = IDS[0], K = IDS[1], L = IDS[2];
function mkJob(i) {
  return { id: IDS[i], hvlId: 'HVL-26' + i, name: NAMES[i], svc: i === 2 ? 'downsizing_move' : 'probate', status: 'active',
    created: new Date(IDS[i]).toISOString(), updatedAt: IDS[i] + 1000, payments: [{ uid: 'p' + i, stage: 'deposit', amount: 5000 + i }],
    docState: { agreement: { sentAt: IDS[i] + 5000 } } };
}
const OBJ = ['Tufted linen three-seat sofa, oatmeal, rolled arms', 'Pair of brass table lamps with pleated linen shades',
  'Herend Rothschild Bird porcelain dinner plates, hand-painted', 'Oil on canvas harbor scene in a carved gilt frame, signed lower right',
  'Mahogany drop-leaf side table on turned legs, likely 1940s', 'Sterling silver candlesticks, Gorham, weighted bases',
  'Wool area rug, Persian style, hand-knotted, about 8 x 10 ft', 'Box of hardcover novels and biographies, mixed authors'];
const CATS = ['Furniture', 'General/Household', 'Collectibles', 'Art & Décor', 'Furniture', 'Silver & Precious Metal', 'Rugs & Textiles', 'Books & Media'];
const DISPS = ['Sell', 'Donate', 'Distribute', 'Auction', 'Keep', 'Consign', 'Junk', 'Hold'];
const SOURCES = ['Auction comps', 'Online comps', 'General estimate', 'Appraisal'];
function manifest(jobId, n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push({ stableId: 'L' + jobId + '_' + i, label: 'inventory', ts: NOW - 50000 + i, updatedAt: NOW - 40000 + i, itemNo: i + 1,
      objectName: OBJ[i % OBJ.length] + ' (' + (i + 1) + ')', category: CATS[i % CATS.length], qty: 1 + (i % 4), condition: ['Good', 'Fair', 'Excellent', ''][i % 4],
      fmv: String(25 + (i * 37) % 1900), valSource: SOURCES[i % 4], valDate: '2026-08-14', disposition: DISPS[i % DISPS.length], roomIdx: i % 14 });
  }
  return out;
}
const ROOMS = Array.from({ length: 14 }, (_, i) => ({ idx: i, name: 'Room ' + (i + 1) }));
function seedDevice(dev, opts) {
  const c = dev.ctx;
  c.jobs = IDS.map((_, i) => mkJob(i));
  IDS.forEach((id, i) => {
    c.estimateStore[id] = { savedAt: id + 2000, approved: true, estimate: { jobId: id, clientName: NAMES[i], havellinTotal: 24000 + i, rooms: ROOMS } };
    c.jobPlanStore[id] = { savedAt: id + 3000, rooms: { 0: { status: 'locked' } } };
    c.jobLogs[id] = [{ id: 'h' + i, date: '2026-10-2' + i, hrs: 6 }];
  });
  c.changeOrders = [{ id: J + 7, jobId: J, hrs: 4 }];
  c.localStorage.setItem('havellin_jobs_v3', JSON.stringify(c.jobs));
  IDS.forEach((id) => c.localStorage.setItem('hav_media_' + id, '[{"stableId":"x' + id + '"}]'));
  if (opts && opts.manifestN) {
    c._photoRefs[J] = manifest(J, opts.manifestN);
    c._invCloudSeen[J] = true;   // this device has read the client's inventory from the sheet
  }
}
// The sheet as two devices saving normally leave it: the ledger born before these clients, every store written.
function seedSheet(srv, dev, n) {
  srv._writeStoreBlob('JobLedger', { since: NOW - 30 * 86400000, seen: {}, restore: {} });
  srv.post({ type: 'saveAllJobs', payload: dev.ctx.jobs });
  srv.post({ type: 'saveAllEstimates', payload: dev.ctx.estimateStore });
  srv.post({ type: 'saveAllJobPlans', payload: dev.ctx.jobPlanStore });
  srv.post({ type: 'saveAllLogs', payload: dev.ctx.jobLogs });
  srv.post({ type: 'saveAllChangeOrders', payload: dev.ctx.changeOrders });
  IDS.forEach((id) => srv.post({ type: 'saveMedia', payload: { jobId: id, savedAt: 1, items: id === J ? manifest(id, n || 450) : [{ stableId: 'x' + id, label: 'inventory', updatedAt: 1 }] } }));
}
const len = (o) => JSON.stringify(o).length;

module.exports = function ({ group, ok, eq, has, lacks }) {
  // A failure in one group must not leave the rest unrun (a revert fails its assertions, never the file).
  const guard = (name, body) => { group(name); try { body(); } catch (e) { ok(false, name + ' threw: ' + (e && e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); } };

  // ───────────────────────────────────────────────────────────────────────────
  ['A', 'B'].forEach((variant) => guard('[' + variant + '] one Snapshot of a 450-line house: the sheet and every device stay whole (GAP3-01, -02, -03, -04)', () => {
    const srv = server(variant);
    const A = device('A', srv), B = device('B', srv);
    seedDevice(A, { manifestN: 450 }); seedDevice(B);
    // B holds two photographs not yet in Drive, the only copy of them.
    B.ctx.localStorage.setItem('hav_media_pending_' + L, JSON.stringify({ shotA: 'data:image/jpeg;base64,AAAA', shotB: 'data:image/jpeg;base64,BBBB' }));
    seedSheet(srv, A);
    const before = srv.state();
    eq(before, { jobs: 3, est: 3, plan: 3, log: 3, media: 3, co: 1 }, 'fixture: the sheet holds three clients and their records');

    A.ctx.takeInventorySnapshot(J);
    const rec = A.ctx.jobs.find((x) => x.id === J);
    const snap = (rec.invSnapshots || [])[0] || {};
    eq([snap.count, snap.label], [450, 'Filed with court'], 'the snapshot was taken, 450 lines, labelled as typed');
    ok(!('items' in snap), '⚠⚠ its lines are not on the client\'s record');
    ok(len(rec) < 5000, '⚠⚠ the record stays small after a 450-line snapshot (' + len(rec) + ' characters; it was 81,554)');
    A.run(300);
    eq(srv.jobsRows(), 3, '⚠⚠ the Jobs tab still holds all three clients (it emptied 0.3 s after the press)');
    eq(srv.cellThrows, 0, 'no write ever reached the cap');
    eq(srv.clears.filter((c) => /^Jobs/.test(c)), [], '⚠⚠ nothing on the Jobs tab was cleared');
    const store = srv.store('SnapshotStore') || {};
    eq(((store[String(J)] || {})[String(snap.ts)] || {}).items && store[String(J)][String(snap.ts)].items.length, 450, '⚠ the 450 lines are on the sheet, in the snapshot store');
    ok(len(JSON.parse(srv.rowOf(J)[11])) < 5000, 'and the client\'s cell on the sheet is small too');
    eq(A.pending(), [], 'every write landed');
    eq(A.ctx.jobs.length, 3, 'A still holds its three clients');
    lacks(A.badges.join(' | '), 'deleted elsewhere', 'and nothing says a client was deleted');

    A.run(5000);
    eq(srv.state(), before, '⚠⚠ two seconds on, every client and every store is still on the sheet (variant A emptied them here)');

    // B, open since before and never reloaded, edits a client and saves its three.
    B.ctx.jobs[2].notes = 'edited on B'; B.ctx.jobs[2].updatedAt = later();
    B.ctx.saveJobs(); B.run(300);
    eq([B.ctx.jobs.length, srv.jobsRows()], [3, 3], 'B\'s save lands; B and the sheet still hold three');
    eq(B.ctx.localStorage.getItem('hav_media_pending_' + L) !== null, true, '⚠ B\'s photographs not yet in Drive are still on B');

    // B reloads: a new page over B's localStorage, the real loadJobs.
    const B2 = device('B2', srv, B.dump());
    B2.ctx.loadJobs(); B2.run(100);
    eq([B2.ctx.jobs.length, B2.cached()], [3, 3], '⚠⚠ B reloads to three clients (it loaded 0 under "Loaded 0 jobs from Sheets ✓")');

    // The office carries on: a new client, and its estimate, plan, hours and inventory.
    const Nid = later();
    B2.ctx.jobs.push({ id: Nid, hvlId: 'HVL-NEW', name: 'New client', svc: 'downsizing', created: new Date(Nid).toISOString(), updatedAt: Nid });
    B2.ctx.saveJobs();
    B2.ctx.estimateStore[Nid] = { savedAt: later(), estimate: { jobId: Nid } };
    B2.ctx.saveAllEstimatesNow();
    B2.ctx._photoRefs[Nid] = [{ stableId: 'n1', label: 'inventory', updatedAt: 1 }]; B2.ctx.saveMediaNow(Nid);
    B2.run(400);
    eq(srv.state(), { jobs: 4, est: 4, plan: 3, log: 3, media: 4, co: 1 }, '⚠⚠ the new client lands and nobody else\'s records are swept (they went 3 -> 1)');
    eq(srv.log.filter((l) => /Swept/.test(l)), [], 'nothing was swept');

    // Compare with now, on another device, reads the snapshot's lines from the sheet first.
    B2.ctx._invCloudSeen[J] = true;
    B2.ctx.estimateStore[J] = { estimate: { rooms: ROOMS } };   // the rooms are named off the estimate, as on A
    B2.ctx._photoRefs[J] = manifest(J, 450);
    B2.ctx._photoRefs[J][3].qty = 9;   // a count corrected since
    const before2 = B2.net.length;
    B2.ctx.printSnapshotComparison(J, snap.ts, 'now');
    ok(B2.net.slice(before2).some((n) => n.what === 'loadSnapshots'), '⚠ the other device asked the sheet for the snapshot\'s lines');
    has(B2.printed || '', 'Count changed 1', '⚠ and the comparison it printed shows the count corrected since (INV-14)');
    has(B2.printed || '', 'Unchanged 449', 'and the rest unchanged');
  }));

  // ───────────────────────────────────────────────────────────────────────────
  guard('a 600-line snapshot, and two, leave the record well under 40,000 characters; two devices\' merge stays under the cap (VAL-01)', () => {
    const srv = server('A');
    const A = device('A', srv), B = device('B', srv);
    seedDevice(A, { manifestN: 600 }); seedDevice(B, { manifestN: 600 });
    seedSheet(srv, A, 600);
    A.ctx.takeInventorySnapshot(J); A.run(300);
    A.label = 'As of walkthrough'; A.ctx.takeInventorySnapshot(J); A.run(300);
    const rec = A.ctx.jobs.find((x) => x.id === J);
    eq((rec.invSnapshots || []).length, 2, 'fixture: two snapshots on one device');
    ok(len(rec) < 40000, '⚠⚠ two 600-line snapshots: the record is ' + len(rec) + ' characters (under 40,000)');
    // B never reloaded: its copy has no snapshot. It takes its own, and the sheet merges the two records.
    B.label = 'Delivered to counsel'; B.ctx.takeInventorySnapshot(J); B.run(300);
    const onSheet = JSON.parse((srv.rowOf(J) || [])[11] || '{}');
    eq((onSheet.invSnapshots || []).length, 3, 'the sheet\'s record carries all three snapshot headings, merged entry by entry');
    ok(len(onSheet) < 40000, '⚠⚠ the merged record is ' + len(onSheet) + ' characters (two devices\' merge passed 50,000 before)');
    eq(srv.cellThrows, 0, 'and nothing reached the cap');
    const store = srv.store('SnapshotStore')[String(J)] || {};
    eq(Object.keys(store).length, 3, 'the three snapshots\' lines are each in the store');
    ok(Object.keys(store).every((t) => store[t].items.length === 600), 'six hundred lines each');
    eq(srv.jobsRows(), 3, 'and the Jobs tab holds its three clients');
  });

  // ───────────────────────────────────────────────────────────────────────────
  ['A', 'B'].forEach((variant) => guard('[' + variant + '] a record too large for a cell is refused by name, after the merge, and nothing is written (GAP3-01)', () => {
    const srv = server(variant);
    const A = device('A', srv);
    seedDevice(A); seedSheet(srv, A, 5);
    const rowsBefore = srv.sheets.Jobs._rows.map((r) => r.slice());
    const ledgerBefore = JSON.stringify(srv.ledger());
    // Two devices' copies, each under the cap, whose record lists the sheet merges entry by entry: together they pass it.
    const big = (tag) => Array.from({ length: 160 }, (_, i) => ({ id: tag + i, kind: 'receipt', note: 'x'.repeat(180) }));
    const one = Object.assign(mkJob(0), { updatedAt: NOW + 1, signedRecords: big('a') });
    const two = Object.assign(mkJob(0), { updatedAt: NOW + 2, signedRecords: big('b') });
    ok(len(one) < CELL_MAX && len(two) < CELL_MAX, 'fixture: each copy is under the cap alone (' + len(one) + ', ' + len(two) + ')');
    const r1 = srv.post({ type: 'saveAllJobs', payload: [one, mkJob(1), mkJob(2)] });
    eq(r1.ok, true, 'the first copy lands');
    const rows1 = srv.sheets.Jobs._rows.map((r) => r.slice());
    const r2 = srv.post({ type: 'saveAllJobs', payload: [two, mkJob(1), mkJob(2)] });
    eq(r2.ok, false, '⚠⚠ the second is refused: the merge would pass the cap');
    ok(/TOO_LARGE: Ellison Estate \(HVL-260\) is [\d,]+ characters; a sheet cell holds 50,000\. Nothing was written\./.test(String(r2.error)),
      '⚠ by name, with the size: ' + String(r2.error).slice(0, 140));
    eq(srv.sheets.Jobs._rows, rows1, '⚠⚠ the Jobs tab is exactly as it was before the refused write');
    eq(srv.cellThrows, 0, 'measured before the sheet was touched: no setValues reached the cap');
    eq(srv.jobsRows(), 3, 'all three clients still there');
    // The one-client path the same way.
    const r3 = srv.post({ type: 'job', payload: two });
    eq(r3.ok, false, 'the one-client save refuses it too');
    has(String(r3.error), 'TOO_LARGE: Ellison Estate', 'by name');
    eq(srv.sheets.Jobs._rows, rows1, 'and writes nothing');
    ok(rowsBefore.length === 4 && ledgerBefore.length > 2, 'fixture sanity');
  }));

  // ───────────────────────────────────────────────────────────────────────────
  guard('no store tab is cleared before it is written (GAP3-07)', () => {
    const srv = server('A');
    const A = device('A', srv); seedDevice(A); seedSheet(srv, A, 3);
    eq(srv.keys('EstimateStore').length, 3, 'fixture: three estimates');
    // One setValues on the store fails (a timeout, a quota): the next save carries one estimate.
    let once = true;
    srv.failNext = (n) => { if (n === 'EstimateStore' && once) { once = false; return true; } return false; };
    const a1 = srv.post({ type: 'saveAllEstimates', payload: { [J]: { savedAt: later(), estimate: { jobId: J } } } });
    eq(a1.ok, false, 'fixture: the failed save says so');
    eq(srv.keys('EstimateStore').length, 3, '⚠⚠ the tab still holds all three: nothing was cleared before the write that failed');
    const a2 = srv.post({ type: 'saveAllEstimates', payload: { [K]: { savedAt: later(), estimate: { jobId: K } } } });
    eq(a2.ok, true, 'the next save lands');
    eq(srv.keys('EstimateStore').sort(), [J, K, L].map(String).sort(), '⚠⚠ and the store still holds every estimate (it went 3 -> 1)');
    // A blob that shrinks reads whole even if clearing the old tail never runs: one blank row ends it in the same write.
    srv._writeStoreBlob('Probe', { big: 'y'.repeat(140000) });
    eq(srv.sheets.Probe.getLastRow() - 1, 4, 'fixture: a four-chunk blob');
    srv.failClear = (n) => n === 'Probe';
    let threw = false;
    try { srv._writeStoreBlob('Probe', { small: 1 }); } catch (e) { threw = true; }
    ok(threw, 'fixture: clearing the leftover rows failed');
    eq(srv._readStoreBlob('Probe', null), { small: 1 }, '⚠ the new blob reads whole: the old tail is never read onto it');
    srv.failClear = null;
    srv._writeStoreBlob('Probe', { small: 2 });
    eq(srv.sheets.Probe.getLastRow() - 1, 1, 'and the leftover rows go once a clear runs');
    eq(srv._readStoreBlob('Probe', null), { small: 2 }, 'reading back what was written');
  });

  // ───────────────────────────────────────────────────────────────────────────
  guard('an empty Jobs tab is unread until a reset records itself (GAP3-02)', () => {
    const srv = server('A');
    const A = device('A', srv); seedDevice(A); seedSheet(srv, A, 3);
    const est = JSON.stringify(srv.store('EstimateStore'));
    srv.sheets.Jobs._rows.splice(1);   // emptied: by a failed write on an older deployment, or by hand
    const lj = srv.get({ action: 'loadJobs' });
    eq(lj.ok, false, '⚠⚠ loadJobs refuses an empty tab the ledger cannot explain');
    has(String(lj.error), 'JOBS_TAB_EMPTY: the Jobs tab is empty, but the sheet has held 3 clients nobody recorded deleting', 'and says why');
    ok(!('deletedJobs' in lj), 'and never names every client deleted');
    const w = srv.post({ type: 'saveAllJobs', payload: A.ctx.jobs });
    eq([w.ok, srv.jobsRows()], [false, 0], 'a stale device\'s save is refused, nothing written');
    const Nid = later();
    const n1 = srv.post({ type: 'job', payload: { id: Nid, name: 'New', created: new Date(Nid).toISOString(), updatedAt: Nid } });
    eq([n1.ok, srv.jobsRows()], [false, 0], '⚠ a new client is refused too: the first new client is what swept every store');
    ['saveAllEstimates', 'saveAllJobPlans', 'saveAllLogs'].forEach((t) => {
      eq(srv.post({ type: t, payload: { [Nid]: t === 'saveAllLogs' ? [{ id: 1 }] : { savedAt: 1 } } }).ok, false, t + ' refused while the tab is unread');
    });
    eq(srv.post({ type: 'saveAllChangeOrders', payload: [{ id: 9, jobId: Nid }] }).ok, false, 'change orders refused');
    eq(srv.post({ type: 'saveMedia', payload: { jobId: Nid, savedAt: 1, items: [{ stableId: 'q', updatedAt: 1 }] } }).ok, false, 'the manifest refused');
    eq(srv.post({ type: 'saveSnapshot', payload: { jobId: J, ts: 1, items: [] } }).ok, false, 'a snapshot refused');
    eq(JSON.stringify(srv.store('EstimateStore')), est, '⚠⚠ every store exactly as it was');
    // Restored from version history: everything reads again.
    seedSheet(srv, A, 3);
    eq(srv.get({ action: 'loadJobs' }).jobs.length, 3, 'once the rows are back, loadJobs answers');

    // A deliberate start-over goes through the editor's reset, which records every deletion and stamps itself.
    srv.resetAllJobDataConfirm();
    const led = srv.ledger();
    ok(led.resetAt > 0, 'the reset stamps itself');
    eq(Object.keys(led.deleted).sort(), IDS.map(String).sort(), 'and records each client it cleared as deleted');
    const lj2 = srv.get({ action: 'loadJobs' });
    eq([lj2.ok, lj2.jobs.length, lj2.deletedJobs.length, (lj2.recorded || []).length], [true, 0, 3, 3], 'loadJobs answers an empty list, every deletion recorded');
    const n2 = srv.post({ type: 'job', payload: { id: Nid, name: 'New', created: new Date(Nid).toISOString(), updatedAt: Nid } });
    eq([n2.ok, srv.jobsRows()], [true, 1], 'a new client lands after the reset');
    const stale = srv.post({ type: 'saveAllJobs', payload: A.ctx.jobs });
    eq([stale.ok, (stale.dropped || []).length, (stale.recorded || []).length, srv.jobsRows()], [true, 3, 3, 1], 'a stale device is refused, each refusal recorded');
  });

  guard('the last client deleted, and a restore allowed in the editor, are explained (GAP3-02)', () => {
    const srv = server('A');
    const A = device('A', srv); seedDevice(A); seedSheet(srv, A, 3);
    IDS.forEach((id) => srv.post({ type: 'deleteJob', payload: { id: id } }));
    eq(srv.jobsRows(), 0, 'fixture: every client deleted through the app');
    eq(srv.get({ action: 'loadJobs' }).ok, true, 'an empty tab whose every client was deleted through the app reads as empty');
    const Nid = later();
    eq(srv.post({ type: 'job', payload: { id: Nid, name: 'Next', created: new Date(Nid).toISOString(), updatedAt: Nid } }).ok, true, 'and the next client lands');

    const s2 = server('A');
    const B = device('B', s2); seedDevice(B); seedSheet(s2, B, 3);
    s2.sheets.Jobs._rows.splice(1);
    s2.allowJobRestoreConfirm(IDS.map(String));
    const lj = s2.get({ action: 'loadJobs' });
    eq([lj.ok, lj.deletedJobs], [true, []], '⚠ ids allowed back are not named deleted (the device holding them emptied itself on opening)');
    eq(s2.post({ type: 'saveAllJobs', payload: B.ctx.jobs }).ok, true, 'that device\'s save puts them back');
    eq(s2.jobsRows(), 3, 'all three');
  });

  // ───────────────────────────────────────────────────────────────────────────
  guard('the orphan sweep acts only on a deletion somebody recorded (GAP3-03)', () => {
    const srv = server('A');
    const A = device('A', srv); seedDevice(A); seedSheet(srv, A, 3);
    // K's row removed by hand: unrecorded.
    srv.sheets.Jobs._rows.splice(srv.sheets.Jobs._rows.findIndex((r) => String(r[0]) === String(K)), 1);
    srv.post({ type: 'saveAllEstimates', payload: { [J]: { savedAt: later(), estimate: { jobId: J } } } });
    eq(srv.keys('EstimateStore').sort(), IDS.map(String).sort(), '⚠⚠ an unrecorded absence sweeps nothing');
    srv.previewDeletedJobs();
    ok(srv.log.some((l) => l.indexOf(String(K)) >= 0 && /NOT recorded/.test(l)), 'previewDeletedJobs says it was not recorded');
    eq(srv.post({ type: 'saveAllJobs', payload: [mkJob(1)] }).dropped, [K], 'a stale copy of it is still refused (refusing holds a write and loses nothing)');
    // L deleted through the app: recorded, and its records go with the next save of each store.
    srv.post({ type: 'saveSnapshot', payload: { jobId: L, ts: 5, items: [{ itemNo: 1 }] } });
    srv.post({ type: 'deleteJob', payload: { id: L } });
    ok(!srv.keys('EstimateStore').includes(String(L)) && !srv.keys('SnapshotStore').includes(String(L)), 'deleteJob purges its records from every store, the snapshot store included');
    eq(srv.keys('EstimateStore').sort(), [J, K].map(String).sort(), 'and K\'s estimate, unrecorded, is still there');
  });

  // ───────────────────────────────────────────────────────────────────────────
  guard('the snapshot store: one snapshot\'s lines per ts, the first copy kept, a deleted client refused', () => {
    const srv = server('A');
    const A = device('A', srv); seedDevice(A); seedSheet(srv, A, 3);
    eq(srv.post({ type: 'saveSnapshot', payload: { jobId: J, ts: 100, items: [{ itemNo: 1, object: 'a' }] } }).ok, true, 'stored');
    srv.post({ type: 'saveSnapshot', payload: { jobId: J, ts: 100, items: [{ itemNo: 1, object: 'changed' }] } });
    eq(srv.get({ action: 'loadSnapshots', jobId: String(J) }).snapshots['100'].items[0].object, 'a', 'a snapshot never changes once taken: the first copy is kept');
    srv.post({ type: 'saveSnapshot', payload: { jobId: J, ts: 200, items: [] } });
    eq(Object.keys(srv.get({ action: 'loadSnapshots', jobId: String(J) }).snapshots).sort(), ['100', '200'], 'two snapshots, both kept');
    eq(srv.get({ action: 'loadSnapshots', jobId: String(K) }).snapshots, {}, 'one client\'s alone');
    srv.post({ type: 'deleteJob', payload: { id: J } });
    const r = srv.post({ type: 'saveSnapshot', payload: { jobId: J, ts: 300, items: [] } });
    eq([r.ok, r.dropped, r.recorded], [true, [String(J)], [String(J)]], 'a deleted client\'s snapshot is refused, the deletion recorded');
    const m = srv.post({ type: 'saveMedia', payload: { jobId: J, savedAt: 1, items: [{ stableId: 'z', updatedAt: 1 }] } });
    eq([m.ok, m.dropped, m.recorded], [true, [String(J)], [String(J)]], '⚠ and the manifest\'s refusal names it recorded too (saveInventory.gs), so a device may apply it');
    has(GS, "'saveSnapshot'", 'saveSnapshot is on BACKEND_TYPES');
    ok(srv.RESET_JOB_STORES.indexOf('SnapshotStore') >= 0 && srv.JOB_KEYED_STORES.indexOf('SnapshotStore') >= 0, 'and the reset, the purge and the orphan check know the store');
  });

  // ───────────────────────────────────────────────────────────────────────────
  guard('an older deployment\'s emptied sheet never empties a device (GAP3-02, -04)', () => {
    // The answers a deployment older than 2026-10-27 gave after the wipe: no jobs, every client deleted, and a write
    // answered ok with every client dropped, nothing recorded.
    const srv = server('A');
    const D = device('D', srv); seedDevice(D);
    D.ctx.localStorage.setItem('hav_media_pending_' + L, JSON.stringify({ a: 'data:x', b: 'data:y' }));
    const all = IDS.map(String);
    D.answer = (m, b) => JSON.stringify(m === 'GET' ? { ok: true, success: true, jobs: [], deletedJobs: all } : { ok: true, success: true, dropped: all });
    D.ctx.loadJobs(); D.run(50);
    eq([D.ctx.jobs.length, D.cached()], [3, 3], '⚠⚠ loadJobs keeps the three clients on this device');
    eq(D.ctx._jobsState, 'offline', 'and reads the list as unreachable, not as the sheet\'s');
    has(D.ctx._sheetNotice, 'The sheet has no clients right now. Nothing on this device was changed. Tell Anthony.', '⚠ the notice says so');
    has(D.ctx.sheetNoticeHtml(), 'Tell Anthony', 'and stays on the Clients tab');
    D.ctx.saveJobs(); D.run(400);
    eq(D.ctx.jobs.length, 3, '⚠⚠ a write answered with every client dropped takes none of them');
    ok(D.badges.every((b) => !/All changes saved/.test(b)), '⚠ and never ends in "All changes saved"');
    ok(D.badges.every((b) => !/deleted elsewhere/.test(b)), 'nor says "deleted elsewhere"');
    has(D.badges.join(' | '), 'The sheet refused every client on this device (3)', 'it says the sheet refused them');
    ok(D.ctx.localStorage.getItem('hav_media_pending_' + L) !== null, '⚠⚠ the photographs not yet in Drive are still here');
    // The refresh, the same.
    D.ctx.refreshJobsFromCloud(); D.run(50);
    eq(D.ctx.jobs.length, 3, 'the refresh keeps them too');
    // A retry that lands while the refusal stands says nothing is fine; with no refusal it says so, as it always did.
    const retryLands = () => {
      D.ctx._pendingWrites['main/saveAllEstimates'] = { target: 'main', body: { type: 'saveAllEstimates', payload: {} }, tries: 1 };
      const n = D.badges.length; D.ctx.flushPendingWrites(); D.run(300); return D.badges.slice(n).join(' | ');
    };
    D.answer = () => JSON.stringify({ ok: true, success: true });
    lacks(retryLands(), 'All changes saved', '⚠ a retry landing under the refusal never says "All changes saved"');
    D.ctx._setSheetNotice('');
    has(retryLands(), 'All changes saved', 'and with no refusal standing it does');
    // A 2026-10-27 deployment answering JOBS_TAB_EMPTY.
    D.answer = () => JSON.stringify({ ok: false, success: false, error: 'JOBS_TAB_EMPTY: the Jobs tab is empty …' });
    D.ctx._setSheetNotice('');
    D.ctx.loadJobs(); D.run(50);
    eq([D.ctx.jobs.length, D.ctx._sheetNotice], [3, 'The sheet has no clients right now. Nothing on this device was changed. Tell Anthony.'], 'JOBS_TAB_EMPTY: the same');
    // A verdict a person recorded (the editor's reset) applies.
    D.answer = (m) => JSON.stringify(m === 'GET' ? { ok: true, success: true, jobs: [], deletedJobs: all, recorded: all } : { ok: true });
    D.ctx.loadJobs(); D.run(50);
    eq([D.ctx.jobs.length, D.cached(), D.ctx._sheetNotice], [0, 0, ''], 'a reset recorded in the editor empties the device, as it should');
    ok(D.ctx.localStorage.getItem('hav_media_pending_' + L) !== null, '⚠ and still keeps the photographs not yet in Drive');
    // A verdict leaving clients behind applies, worded as what the device knows.
    const E = device('E', srv); seedDevice(E);
    E.answer = () => JSON.stringify({ ok: true, success: true, dropped: [String(K)] });
    E.ctx.saveJobs(); E.run(400);
    eq(E.ctx.jobs.map((j) => j.id), [J, L], 'one client refused: removed here');
    has(E.badges.join(' | '), '1 client refused by the sheet, which no longer holds it: removed from this device', '⚠ in the words of what it knows');
    // hardDeleteJob, a person's act behind the PIN, is the one path that takes the photographs.
    const F = device('F', srv, null, { stubs: { renderJobs() {} } });
    F.ctx.localStorage.setItem('hav_media_pending_' + K, JSON.stringify({ a: 'x' }));
    eq(F.ctx._purgeLocalJobRecords([K]), 1, 'a verdict keeps them and counts them');
    ok(F.ctx.localStorage.getItem('hav_media_pending_' + K) !== null, 'kept');
    F.ctx._purgeLocalJobRecords([K], { photos: true });
    eq(F.ctx.localStorage.getItem('hav_media_pending_' + K), null, 'the person\'s delete takes them');
    has(fn('hardDeleteJob'), '_purgeLocalJobRecords([id], { photos: true })', 'and only hardDeleteJob passes `photos`');
    eq((fn('_applyDroppedJobs') + fn('loadJobs')).indexOf('photos: true'), -1, 'the verdict paths never do');
  });

  // ───────────────────────────────────────────────────────────────────────────
  guard('a size refusal is held and named, never retried by itself; the queued save sends the list as it is now (GAP3-05)', () => {
    const srv = server('A');
    const A = device('A', srv); seedDevice(A); seedSheet(srv, A, 3);
    // A client grown too large on this device by some other list (the snapshot no longer does it).
    const j = A.ctx.jobs.find((x) => x.id === J);
    j.signedRecords = Array.from({ length: 400 }, (_, i) => ({ id: 's' + i, note: 'y'.repeat(140) }));
    j.updatedAt = later();
    A.ctx.saveJobs(); A.run(300);
    eq(A.held(), ['main/saveAllJobs'], '⚠⚠ the refused write is held');
    eq(A.ctx._pendingWrites['main/saveAllJobs'].kind, 'toolarge', 'as too large');
    const posts = () => A.net.filter((n) => n.what === 'saveAllJobs').length;
    const n0 = posts();
    A.run(600000);
    eq(posts(), n0, '⚠⚠ ten minutes on, it has not been sent again (24 posts in ten minutes before)');
    const chip = A.ctx._pendingChipCopy();
    has(chip.head, 'Not saved — Ellison Estate (HVL-260) is too large for the sheet (', '⚠ the chip names the client');
    ok(/\([\d,]+ characters\)/.test(chip.head), 'and the size');
    has(chip.note, 'Closing or reloading this tab is safe', '⚠ and says closing the tab is safe (it said not to)');
    lacks(chip.note, 'do not close', 'never the opposite');
    eq(srv.jobsRows(), 3, 'and the sheet is whole');
    // The queued body reads the list when it is sent: a client refused and dropped since is not sent again.
    const body = A.ctx._pendingWrites['main/saveAllJobs'].body;
    A.ctx.jobs = A.ctx.jobs.filter((x) => x.id !== L);
    eq(JSON.parse(JSON.stringify(body)).payload.map((x) => x.id), [J, K], '⚠ the held save carries the list as it is now, not the array it was queued with');
    // An older deployment's Sheets error names nobody: the app measures the record itself.
    eq(A.ctx._backendErrorKind(CELL_ERR, true), 'toolarge', 'the cell cap\'s own words are the same kind');
    const tw = A.ctx._tooLargeWords({ lastError: CELL_ERR, body: { type: 'saveAllJobs', payload: A.ctx.jobs } });
    eq(tw.who, 'Ellison Estate (HVL-260)', 'and the largest record in the write is named');
    eq(A.ctx._backendErrorKind('JOBS_TAB_EMPTY: x', true), 'empty', 'the empty tab is its own kind');
    eq([A.ctx._writeKindHolds('toolarge'), A.ctx._writeKindHolds('empty'), A.ctx._writeKindHolds('')], [true, false, false], 'held: the size; retried: the empty tab, a network drop');
  });

  guard('a held write no longer stops this device seeing others\' changes (GAP3-06)', () => {
    const srv = server('A');
    const A = device('A', srv); seedDevice(A); seedSheet(srv, A, 3);
    const B = device('B', srv); seedDevice(B);
    const j = A.ctx.jobs.find((x) => x.id === J);
    j.signedRecords = Array.from({ length: 400 }, (_, i) => ({ id: 's' + i, note: 'y'.repeat(140) }));
    j.updatedAt = later();
    // A adds a client too: its save is the held one, so the sheet has never seen it.
    const Nid = later();
    A.ctx.jobs.push({ id: Nid, name: 'Added on A', created: new Date(Nid).toISOString(), updatedAt: Nid });
    A.ctx.saveJobs(); A.run(300);
    eq(A.held(), ['main/saveAllJobs'], 'fixture: A holds a refused write');
    const k = B.ctx.jobs.find((x) => x.id === K); k.name = 'Renamed on B'; k.updatedAt = later();
    B.ctx.saveJobs(); B.run(300);
    const asked = A.net.length;
    A.ctx.refreshJobsFromCloud(); A.run(50);
    ok(A.net.length > asked, '⚠⚠ A asks the sheet although its write is held');
    eq((A.ctx.jobs.find((x) => x.id === K) || {}).name, 'Renamed on B', '⚠ and sees B\'s change');
    ok(A.ctx.jobs.some((x) => x.id === Nid), '⚠ and keeps the client it added, which only its held write carries');
    eq((A.ctx.jobs.find((x) => x.id === J) || {}).signedRecords.length, 400, 'and its own newer record of J');
    // A held write of a store the read replaces still waits.
    A.ctx._pendingWrites['main/saveAllJobPlans'] = { target: 'main', body: { type: 'saveAllJobPlans', payload: {} }, blocked: true, kind: 'stale' };
    eq(A.ctx._syncWritesOutstanding(['saveAllJobPlans', 'saveAllLogs']), true, 'the plan read still stands down for a held plan write');
    eq(A.ctx._syncWritesOutstanding([]), false, 'the jobs read does not');
    eq(A.ctx._syncWritesOutstanding(), true, 'and with no argument every held write counts, as before');
    has(fn('refreshPlanAndLogFromCloud'), "_syncWritesOutstanding(_replaces)", 'the plan refresh names the stores it replaces');
  });

  // ───────────────────────────────────────────────────────────────────────────
  guard('a cold desk refuses by name: Snapshot, the papers, CSV and + Add line item (SYN-08)', () => {
    const srv = server('A');
    const A = device('A', srv); seedDevice(A); seedSheet(srv, A, 9);
    A.ctx._photoRefs[J] = manifest(J, 9);
    delete A.ctx._invCloudSeen[J];
    eq(A.ctx.invColdRefusal(J), A.ctx.INV_COLD_TXT, 'unread: refused');
    has(A.ctx.INV_COLD_TXT, 'this device has not read the inventory yet', 'in the plan\'s words');
    A.ctx.takeInventorySnapshot(J);
    eq([(A.ctx.jobs[0].invSnapshots || []).length, A.alerts.slice(-1)[0]], [0, A.ctx.INV_COLD_TXT], '⚠⚠ Snapshot records nothing and says why ("Filed with court 0 items $0" before)');
    A.ctx._invCloudSeen[J] = true;
    eq(A.ctx.invColdRefusal(J), '', 'read: nothing refused');
    A.ctx.SHEETS_SYNC_URL = '';
    eq(A.ctx.invColdRefusal(J), '', 'no Apps Script URL: this device\'s copy is all there is');
    eq(A.ctx.snapshotRefusal(J), 'Not taken: this device has no Apps Script URL in Settings, and a snapshot’s lines are kept on the sheet. Nothing was recorded.', 'but a snapshot needs the sheet');
    A.ctx.SHEETS_SYNC_URL = SYNC;
    A.ctx._backendTypes = ['saveMedia'];
    has(A.ctx.snapshotRefusal(J), 'needs the 2026-10-27 redeploy', '⚠ a deployment with nowhere to keep the lines refuses it');
    A.ctx._backendTypes = ['saveSnapshot'];
    A.ctx._photoRefs[J] = [];
    eq(A.ctx.snapshotRefusal(J), 'Not taken: there is nothing in the inventory to snapshot yet.', 'and an empty inventory');
    // Every paper, CSV and + Add line item ask the one rule.
    ['takeInventorySnapshot:snapshotRefusal', 'addInventoryManualItem', 'printContentsList', 'printEstateInventoryReport', 'exportInventoryCSV',
      'printApprovalRequest', 'printBeneficiaryReceipt', 'printCourtInventory', 'printTrustSchedule', 'printDispositionLedger', 'printDonationRecord',
      'printAppraisalWorklist', 'printContentsRecord', 'printAsFoundRecord', 'printSnapshotComparison'].forEach((spec) => {
      const [f, via] = spec.split(':');
      has(fn(f), (via || 'invColdRefusal') + '(jobId)', f + ' asks it');
    });
    has(fn('snapshotRefusal'), 'invColdRefusal(jobId)', 'Snapshot through snapshotRefusal');
    // Drive one paper and + Add line item on a cold device.
    const P = sandbox({ fns: ['printEstateInventoryReport', 'invColdRefusal', '_invManifestUnread', 'addInventoryManualItem'], vars: ['INV_COLD_TXT'],
      stubs: { SHEETS_SYNC_URL: SYNC, _invCloudSeen: {}, jobs: [{ id: 7 }], invDocContractBlock: () => '', _setPhotoRef() { throw new Error('a line was minted'); },
        alert: (m) => { P.__said = m; }, window: { prompt: () => 'Cash on hand' } } });
    eq(P.printEstateInventoryReport(7, { asHtml: true }), { why: P.INV_COLD_TXT }, 'the report hands back the refusal');
    P.addInventoryManualItem(7);
    eq(P.__said, P.INV_COLD_TXT, '+ Add line item refuses before it mints a number');
  });

  // ───────────────────────────────────────────────────────────────────────────
  guard('a snapshot keeps the count, room, condition, basis and date of every line, and Compare shows each change (VAL-31, INV-14)', () => {
    const srv = server('A');
    const A = device('A', srv); seedDevice(A, { manifestN: 6 }); seedSheet(srv, A, 6);
    A.ctx.jobs[0].appraisers = [{ id: 'ap1', name: 'R. Kodner', firm: 'Kodner Galleries' }];
    A.ctx._photoRefs[J][3].valSource = 'Appraisal'; A.ctx._photoRefs[J][3].apprId = 'ap1';
    A.ctx.takeInventorySnapshot(J);
    const ts = A.ctx.jobs[0].invSnapshots[0].ts;
    const line = A.ctx._snapLinesOf(J, ts)[3];
    eq([line.qty, line.room, line.condition, line.basis, line.valDate], [4, 'Room 4', '', 'appraisal · R. Kodner · Kodner Galleries', '2026-08-14'],
      '⚠ count, room, condition, basis (the appraiser named) and valuation date');
    // Since: a count corrected, a line moved room, an agent figure replaced by an appraisal at the same amount.
    const now = A.ctx._photoRefs[J];
    now[0].qty = 7; now[1].roomIdx = 9; now[2].valSource = 'Appraisal'; now[2].apprId = 'ap1';
    const d = A.ctx.snapshotDiff(A.ctx._snapLinesOf(J, ts), A.ctx._invAssignItemNos(J).map((r) => A.ctx._snapItemOf(r, A.ctx.jobs[0])));
    eq([d.count.map((x) => x.no), d.room.map((x) => x.no), d.basis.map((x) => x.no), d.unchanged], [['1'], ['2'], ['3'], 3], '⚠⚠ each change, under its own heading');
    eq([d.count[0].from, d.count[0].to], [1, 7], 'the count, was and now');
    const page = A.ctx.printSnapshotComparison(J, ts, 'now', { asHtml: true });
    ['Count changed 1', 'Moved room 1', 'Basis changed 1'].forEach((s) => has(page.html, s, 'the page counts: ' + s));
    has(page.html, '>Moved room <', 'and draws the section');
    const pr = A.ctx.printInventorySnapshot(J, ts, { asHtml: true });
    ['Qty', 'Room', 'Condition', 'Basis'].forEach((h) => has(pr.html, '>' + h + '<', 'the printed snapshot carries ' + h));
    eq(A.filed.map((f) => f[0]), [J], '⚠ its own page is filed to Drive as it is taken');
    // On another device, without the lines: the page names why, and a press reads them first.
    const B = device('B', srv); seedDevice(B, { manifestN: 6 });
    B.ctx.jobs[0].invSnapshots = A.ctx.jobs[0].invSnapshots.map((s) => Object.assign({}, s));
    eq(B.ctx.printInventorySnapshot(J, ts, { asHtml: true }), { why: B.ctx.SNAP_LINES_UNREAD_TXT }, 'asHtml: the lines are not on this device, said by name');
    A.run(300);
    B.ctx.printInventorySnapshot(J, ts);
    has(B.printed || '', 'Inventory Snapshot', '⚠ a press reads them from the sheet, then prints');
    srv.sheets.SnapshotStore._rows.splice(1);
    const C = device('C', srv); seedDevice(C, { manifestN: 6 });
    C.ctx.jobs[0].invSnapshots = A.ctx.jobs[0].invSnapshots.map((s) => Object.assign({}, s));
    C.ctx.printInventorySnapshot(J, ts);
    eq(C.alerts.slice(-1)[0], C.ctx.SNAP_LINES_UNREAD_TXT, 'lines the sheet does not hold: said by name, nothing printed');
    // Two snapshots queued together are two writes.
    eq(A.ctx._writeKey({ type: 'saveSnapshot', payload: { jobId: 7, ts: 1 } }, 'main') !== A.ctx._writeKey({ type: 'saveSnapshot', payload: { jobId: 7, ts: 2 } }, 'main'), true,
      'the outbox keys a snapshot by its ts');
    eq(A.ctx._writeKey({ type: 'saveMedia', payload: { jobId: 7, savedAt: 1 } }, 'main'), 'main/saveMedia:7', 'and every other write as before');
  });

  // ───────────────────────────────────────────────────────────────────────────
  guard('the probe, run against the fake: it tells the two variants apart and trashes its file (GAP3-09)', () => {
    ['A', 'B'].forEach((v) => {
      const srv = server(v);
      let trashed = 0;
      srv.SpreadsheetApp.create = () => { const sh = srv.SpreadsheetApp.openById().insertSheet('probe-' + v); return { getSheets: () => [sh], getId: () => 'pid', getUrl: () => 'u' }; };
      srv.DriveApp = { getFileById: () => ({ setTrashed: () => { trashed++; } }) };
      // The probe's first write and flush are their own step; the execution the variant rolls back starts after them.
      srv.SpreadsheetApp.flush = () => { if (!srv.checkpoint) { srv.checkpoint = {}; Object.keys(srv.sheets).forEach((n) => { srv.checkpoint[n] = srv.sheets[n]._rows.map((r) => r.slice()); }); } };
      const verdict = srv.probeClearThenOversizeWrite();
      ok(v === 'A' ? /^VARIANT A/.test(verdict) : /^VARIANT B/.test(verdict), 'variant ' + v + ' reads as such: ' + verdict.slice(0, 60));
      eq(trashed, 1, 'and its throwaway file is trashed');
    });
    const S = server('A');
    const dispatch = S.doGet.toString() + S.doPost.toString();
    ok(dispatch.length > 2000, 'fixture: the two routers were read (' + dispatch.length + ')');
    lacks(dispatch, 'probeClearThenOversizeWrite', 'editor only: neither doGet nor doPost reaches it');
  });

  // ───────────────────────────────────────────────────────────────────────────
  guard('each arm of the sheet\'s verdict holds on its own, and a client brought back keeps no old deletion (GAP3-02, -03)', () => {
    const srv = server('A');
    const A = device('A', srv); seedDevice(A);
    const held = A.ctx.jobs.slice();
    eq(held.length, 3, 'fixture: this device holds three clients');
    // An empty list with no deletions named at all (a deployment older than the ledger): refused on its own.
    eq(A.ctx.loadJobsVerdict({ ok: true, jobs: [] }, held), { apply: false, why: A.ctx.SHEET_NO_CLIENTS_TXT },
      '⚠ an empty list over a cache holding clients changes nothing, whatever else the answer says');
    // Another client on the sheet, and every client here named deleted with nobody recording it: refused on its own.
    const v = A.ctx.loadJobsVerdict({ ok: true, jobs: [{ id: 999, name: 'Elsewhere' }], deletedJobs: held.map((j) => String(j.id)) }, held);
    eq(v.apply, false, '⚠ a deletion covering every client here, unrecorded, is refused although the sheet holds another');
    has(v.why || '', 'The sheet refused every client on this device (3)', 'and says so');
    eq(A.ctx.loadJobsVerdict({ ok: true, jobs: [{ id: 999 }], deletedJobs: [String(held[0].id)] }, held).apply, true, 'one client of three named deleted: applies');
    eq(A.ctx.loadJobsVerdict({ ok: true, jobs: [] }, []).apply, true, 'a device holding nothing has nothing to protect');
    // The server: deleted, allowed back and written back, then removed by hand. Its old deletion went when it was written
    // back, so the hand removal is unrecorded and its records stay.
    seedSheet(srv, A, 3);
    srv.post({ type: 'deleteJob', payload: { id: K } });
    srv.allowJobRestoreConfirm([String(K)]);
    eq(srv.post({ type: 'saveAllJobs', payload: A.ctx.jobs }).ok, true, 'fixture: the client allowed back is written back');
    eq(srv.jobsRows(), 3, 'fixture: all three on the sheet');
    ok(!(srv.ledger().deleted || {})[String(K)], '⚠ writing it back clears its recorded deletion');
    srv.post({ type: 'saveAllEstimates', payload: { [K]: { savedAt: later(), estimate: { jobId: K } } } });
    srv.sheets.Jobs._rows.splice(srv.sheets.Jobs._rows.findIndex((r) => String(r[0]) === String(K)), 1);
    srv.post({ type: 'saveAllEstimates', payload: { [J]: { savedAt: later(), estimate: { jobId: J } } } });
    ok(srv.keys('EstimateStore').indexOf(String(K)) >= 0, '⚠ removed by hand afterwards, its estimate stays: the old deletion is not read as a new one');
  });

  guard('the desk says what a cold copy is, never "0 of 0 reviewed" or "No items yet" (SYN-08)', () => {
    const S = sandbox({ fns: ['invColdWords', '_invManifestUnread'], stubs: { SHEETS_SYNC_URL: SYNC, _invCloudSeen: {}, _invCloudFailed: {} } });
    eq(S.invColdWords(7), 'reading the sheet…', 'loading');
    S._invCloudFailed[7] = true;
    eq(S.invColdWords(7), 'sheet unreachable: this device’s copy', 'unreachable, in the bars\' words');
    S._invCloudSeen[7] = true;
    eq(S.invColdWords(7), '', 'read: nothing to say');
    has(fn('_renderInvWorkbar'), 'var _coldW = invColdWords(job.id);', 'the work bar asks it');
    has(fn('_renderInvWorkbar'), "(_coldW ? '<span class=\"inv-cold\"", 'before it counts anything reviewed');
    has(fn('renderInventoryTab'), 'var _coldList = !all.length && !!invColdWords(jobId);', 'and the rows before they say "No items yet"');
    has(fn('renderInventoryTab'), 'if (_coldList) {', 'which draw the copy\'s words first');
    // A read that lands or fails and moves nothing: the work bar repainted by id where its words changed, a list that said
    // it had not read the sheet redrawn when idle, nothing else (_invColdRepaint).
    const drawn = [];
    let idle = 0;
    const R = sandbox({ fns: ['_invColdRepaint', 'invColdWords', '_invManifestUnread'], vars: ['_invColdShown'],
      stubs: { SHEETS_SYNC_URL: SYNC, _invCloudSeen: {}, _invCloudFailed: {}, _invJob: (id) => ({ id }), _jobInvRefs: () => [],
        _renderInvWorkbar: () => 'the bar now', _invRenderWhenIdle: () => { idle++; },
        document: { getElementById: (id) => (id === 'inv-workbar' ? { set outerHTML(h) { drawn.push(h); } } : null) } } });
    R._invColdRepaint(7);
    eq([drawn.length, idle], [0, 0], 'nothing drawn yet: nothing repainted');
    R._invColdShown[7] = { bar: 'reading the sheet…', list: false };
    R._invColdRepaint(7);
    eq([drawn.length, idle], [0, 0], 'still loading: the words have not changed');
    R._invCloudFailed[7] = true;
    R._invColdRepaint(7);
    eq([drawn, idle], [['the bar now'], 0], '⚠ the read failed: the work bar repainted by id');
    R._invColdShown[7] = { bar: 'sheet unreachable: this device’s copy', list: false };
    delete R._invCloudFailed[7]; R._invCloudSeen[7] = true;
    R._invColdRepaint(7);
    eq([drawn.length, idle], [2, 0], '⚠ the read landed with nothing new: repainted again, to its count');
    R._invColdShown[7] = { bar: '', list: false };
    R._invColdRepaint(7);
    eq([drawn.length, idle], [2, 0], 'a warm desk: nothing');
    R._invColdShown[7] = { bar: 'reading the sheet…', list: true };
    R._invColdRepaint(7);
    eq([drawn.length, idle], [2, 1], '⚠ the list said it had not read the sheet: redrawn once nobody is typing');
    has(fn('_renderInvWorkbar'), '(_invColdShown[job.id] = _invColdShown[job.id] || {}).bar = _coldW;', 'the work bar records what it drew');
    has(fn('renderInventoryTab'), '(_invColdShown[jobId] = _invColdShown[jobId] || {}).list = _coldList;', 'and the list whether it said so');
    has(fn('_invRefreshFromCloud'), '_invColdRepaint(jobId);', 'the read that moved nothing asks it');
  });

  // ───────────────────────────────────────────────────────────────────────────
  guard('the deployment and the app agree on what this needs', () => {
    const bv = (GS.match(/var BACKEND_VERSION = '([^']+)';/) || [])[1];
    ok(bv >= '2026-10-27', 'main-sync.gs is 2026-10-27 or later (' + bv + ')');
    const B = sandbox({ vars: ['BACKEND_MIN_VERSION', 'BACKEND_FEATURE_COST', 'BACKEND_NEEDS_TYPES'] });
    ok(B.BACKEND_MIN_VERSION >= '2026-10-27', '⚠ and the app relies on it: an older one can still empty the Jobs tab');
    ok(B.BACKEND_NEEDS_TYPES.indexOf('saveSnapshot') >= 0, 'the snapshot store is on the banner\'s list');
    ok(B.BACKEND_FEATURE_COST.version.indexOf('one failed write can empty the Jobs tab') === 0, 'and the version line names what stays broken, first');
    // The rule, one definition with its readers counted.
    const app = fs.readFileSync(path.join(__dirname, '..', 'havellin.html'), 'utf8').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
    eq((app.match(/sheetVerdictRefusal\(/g) || []).length, 4, 'sheetVerdictRefusal: its definition and three readers (the dropped answer, and loadJobsVerdict twice)');
    eq((app.match(/loadJobsVerdict\(/g) || []).length, 4, 'loadJobsVerdict: its definition, loadJobs, and the refresh twice');
  });

  // ───────────────────────────────────────────────────────────────────────────
  guard('the recovery runbook is in the manual, both copies (GAP3-08)', () => {
    const man = fs.readFileSync(path.join(__dirname, '..', 'manual.html'), 'utf8');
    const md = fs.readFileSync(path.join(__dirname, '..', 'MANUAL.md'), 'utf8');
    [man, md].forEach((doc, i) => {
      const w = i ? 'MANUAL.md' : 'manual.html';
      ['previewDeletedJobs()', 'Version history', 'allowJobRestoreConfirm', 'resetAllJobDataConfirm()', 'probeClearThenOversizeWrite()', 'JOBS_TAB_EMPTY', 'TOO_LARGE']
        .forEach((n) => has(doc, n, w + ' names ' + n));
    });
  });
};
