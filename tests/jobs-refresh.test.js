'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// refreshJobsFromCloud replaced the WHOLE `jobs` list with the sheet's copy while this
// device's own saves were still queued. 2026-09-28 workflow audit, finding H4.
//
// A write takes far longer than a read — measured against a backend answering writes in 4 s
// and reads in 0.8 s — so "Save Client, then Build estimate" asked the sheet for the client
// list before the sheet had the client. The answer was an empty list, and it was taken:
//
//   · the new client vanished from this device, from memory AND the local cache;
//   · the walkthrough scored next was refused with "Job not found." and lost;
//   · the Drive folder URL, landing a second later, found no job to write itself onto.
//
// And "Edit Client 3,000 → 5,200 sq ft, then Build estimate" priced the job on 3,000 and put
// 3,000 back on the local record, while the sheet held 5,200.
//
// The rule is the one refreshPlanAndLogFromCloud already follows: the sheet is only
// authoritative once our own writes have reached it. These checks drive the REAL save paths
// (saveIntake, saveClientEdit, _driveFolderFailed), the REAL outbox and retry queue, and the
// REAL refresh, against a backend whose requests stay OPEN until the test answers them — so
// "a write is still in flight" is a state the test can actually hold, rather than one that
// resolved on the same tick and proved nothing.
// ─────────────────────────────────────────────────────────────────────────────

const { sandbox, domStub, source } = require('./harness');

const URL = 'https://script.google.com/macros/s/AAA/exec';
const QUIET = { warn() {}, log() {}, error() {} };
const clone = (x) => JSON.parse(JSON.stringify(x));

// A synchronous promise the test can hold OPEN — see sync-retry.test.js for why neither a
// real Promise (resolves after every assertion has run) nor an immediately-resolving
// thenable (no request could ever be in flight) can measure this.
function mkPromise() {
  let state = 'pending';
  let value;
  const queue = [];
  function settle(st, v) {
    if (state !== 'pending') return;
    state = st; value = v;
    queue.splice(0).forEach((f) => f());
  }
  const self = {
    then(onOk, onErr) {
      const nxt = mkPromise();
      const run = () => {
        try {
          if (state === 'ok') {
            const out = onOk ? onOk(value) : value;
            if (out && typeof out.then === 'function') out.then(nxt.resolve, nxt.reject);
            else nxt.resolve(out);
          } else if (onErr) {
            const out = onErr(value);
            if (out && typeof out.then === 'function') out.then(nxt.resolve, nxt.reject);
            else nxt.resolve(out);
          } else nxt.reject(value);
        } catch (e) { nxt.reject(e); }
      };
      if (state === 'pending') queue.push(run); else run();
      return nxt.promise;
    },
    catch(onErr) { return self.then(null, onErr); },
  };
  return { promise: self, resolve: (v) => settle('ok', v), reject: (e) => settle('err', e) };
}

// Everything between a save and the sheet, lifted rather than stubbed: the whole point is
// that the refresh and the queue agree about what "outstanding" means.
const SYNC_FNS = ['refreshJobsFromCloud', '_mergeCloudJobs', '_syncWritesOutstanding',
  '_applyDroppedJobs', '_purgeLocalJobRecords', 'migrateRetiredNames', 'canonPersonName',
  'saveJobs', 'syncJobToSheets', 'syncToSheets', 'postSyncBadge', 'queuedPostSync',
  '_flushOutbox', '_writeKey', '_enqueueWrite', '_backendErrorKind', '_retrySoon',
  '_scheduleRetry', 'flushPendingWrites', '_pendingCount'];
const SYNC_VARS = ['_outbox', '_outboxTimer', '_outboxSending', '_OUTBOX_WINDOW', '_syncWriteSeq',
  '_pendingWrites', '_retryTimer', '_retryStep', '_flushing', '_retryDelays', 'SYNC_STUCK_TRIES',
  'PERSON_NAME_ALIASES'];

const INTAKE_FNS = ['saveIntake', 'intakeAsksHouseContents', 'houseFlagsOf', 'resolveExecutorAuth',
  'docTierScope', 'docTierScopeMirror', 'docTierDef'];
const INTAKE_VARS = ['EXECUTOR_AUTH_OPTIONS', 'SVC_LABELS', 'DOC_TIERS'];

// The Edit Client modal's own dependency list (client-edit-fields.test.js).
const EC_FNS = ['saveClientEdit', 'courtRecordShown', 'jobOnProbateTrack', 'ecToggleProbate', 'executorAuthOptionsHtml', 'resolveExecutorAuth',
  'ecIsProbateSvc', 'ecIsEstateSvc', 'ecIsMoveSvc', 'ecDocGateChange', 'docTierOptionsHtml',
  'docTierOf', 'docTierDef', 'docTierScope', 'docTierScopeMirror', 'svcHasDocStep', 'esc',
  'onDocGateChange', 'houseFlagInputsHtml', 'houseFlagsOf', '_houseFlagRowClass', 'docLevelFloor',
  'gateDispute', '_gateYes', '_gate706', 'isDecedentJob', 'docLevelFloorReason', 'resolveDocLevel',
  'docStandardEffect', 'isFormalDoc', 'invAppraisalThreshold', 'matterTypeOf', 'matterDef',
  'invFiduciaryMode', 'readHouseFlagInputs', 'docScopeDef'];
const EC_VARS = ['EXECUTOR_AUTH_OPTIONS', 'SVC_LABELS', 'HOUSE_FLAGS', 'FIREARMS_PROTOCOL_DOC',
  'DECEDENT_SERVICES', 'DOC_TIERS', 'DOC_TIER_FROM_SCOPE', 'JOB_STEPS', 'INV_APPRAISAL_THRESHOLD',
  'INV_APPRAISAL_THRESHOLD_DISPUTED', 'MATTER_TYPES', 'DOC_SCOPES'];

// The sheet takes a write the way _mergeJobRecord does for scalars: the incoming record wins
// unless the sheet's copy is strictly newer.
function applyWrite(sheet, body) {
  const merge = (j) => {
    if (!j || j.id == null) return;
    const i = sheet.jobs.findIndex((x) => String(x.id) === String(j.id));
    if (i < 0) sheet.jobs.push(clone(j));
    else if (Number(j.updatedAt || 0) >= Number(sheet.jobs[i].updatedAt || 0)) sheet.jobs[i] = clone(j);
  };
  if (body && body.type === 'saveAllJobs') (body.payload || []).forEach(merge);
  if (body && body.type === 'job') merge(body.payload);
}

function rig(o) {
  o = o || {};
  const sheet = { jobs: clone(o.sheet || []), deleted: (o.deleted || []).map(String) };
  const writes = [];   // open POSTs, oldest first
  const reads = [];    // open GETs, oldest first
  const timers = [];
  const badges = [];
  let landed = 0;
  const c = sandbox({
    fns: SYNC_FNS.concat(o.fns || []),
    vars: SYNC_VARS.concat(o.vars || []),
    stubs: Object.assign({
      SHEETS_SYNC_URL: URL,
      document: domStub(o.dom || {}),
      jobs: clone(o.local || []),
      estimateStore: clone(o.estimateStore || {}), jobLogs: {}, jobPlanStore: {}, changeOrders: [],
      showSyncBadge(m) { badges.push(String(m)); },
      updatePendingIndicator() {},
      rebuildDropdowns() {},
      _jobsLanded() { landed++; },
      setTimeout(fn, ms) { timers.push({ fn, ms, done: false }); return timers.length; },
      clearTimeout() {},
      // The real postSyncTo serialises the body when it sends; so does this.
      postSyncTo(target, body) {
        const p = mkPromise();
        writes.push({ p, type: body && body.type, sent: clone(body) });
        return p.promise;
      },
      // A read is served from the sheet as it stands WHEN IT ARRIVES, and answered later.
      fetch(url) {
        const p = mkPromise();
        reads.push({ p, url: String(url), snap: { jobs: clone(sheet.jobs), deletedJobs: sheet.deleted.slice() } });
        return p.promise;
      },
    }, o.stubs || {}),
  });
  if (o.local) c.localStorage.setItem('havellin_jobs_v3', JSON.stringify(o.local));
  let refreshed = 0;
  return {
    c, sheet, writes, reads, timers, badges,
    landedCount: () => landed,
    cache: () => JSON.parse(c.localStorage.getItem('havellin_jobs_v3') || '[]'),
    ids: () => c.jobs.map((j) => j && j.id),
    refreshedCount: () => refreshed,
    refresh() { c.refreshJobsFromCloud(() => { refreshed++; }); },
    // Fire the timers armed so far (the outbox's 250 ms window, a retry's backoff), once each.
    tick(ms) { timers.filter((t) => !t.done && (ms == null || t.ms === ms)).forEach((t) => { t.done = true; t.fn(); }); },
    // Answer every open write. The sheet commits first, as a real execution does before it
    // answers; a sequential sender starts its NEXT request inside the resolution, so the loop
    // keeps going until nothing is on the wire.
    land(res) {
      let guard = 0;
      while (writes.length) {
        if (++guard > 50) throw new Error('runaway: the queue never stopped sending');
        const w = writes.shift();
        if (!res || res.ok) applyWrite(sheet, w.sent);
        w.p.resolve(res || { ok: true });
      }
    },
    // Answer the oldest open read with the sheet as it stood when the read arrived.
    // ⚠ Returns false rather than throwing when nothing is open: on a build that never asked, the
    // checks after this must still run and fail on their own — a throw here would stop the file and
    // read as one failure where there are several.
    answer(override) {
      const r = reads.shift();
      if (!r) return false;
      r.p.resolve({ json: () => Object.assign({ ok: true, success: true }, r.snap, override || {}) });
      return true;
    },
  };
}

const intakeDom = {
  'i-svc': 'downsizing', 'i-fname': 'Maeve', 'i-lname': 'Ellsworth', 'i-phone': '(561) 555-0100',
  'i-email': 'me@example.com', 'i-addr': '12 Seaview Ave', 'i-city': 'Palm Beach', 'i-zip': '33480',
  'i-sqft': '3000', 'i-ptype': 'Estate', 'i-src': 'Attorney', 'i-start': '2026-10-12',
};
const intakeStubs = {
  showFB() {}, createDriveJobFolder() {}, clearIntakeForm() {}, populateAgrSelect: null,
  showPanel() {}, generateHvlId: () => 'HVL-0007', readHouseFlagInputs: () => ({}),
  lookupReferralById: () => null, goToClientDashboard() {},
};

// Comment-stripped, LINE-based — a /* */ regex stripper eats ~170KB of this file because of
// accept="image/*" (CLAUDE.md records it).
const liveLines = (s) => String(s).split('\n')
  .filter((l) => { const t = l.trim(); return !(t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') || t.startsWith('<!--')); })
  .join('\n');

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();
  const fnBody = (name) => {
    const at = src.indexOf('function ' + name + '(');
    return src.slice(at, src.indexOf('\n}\n', at));
  };

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ THE REPORTED CASE: Save Client, then Build estimate at once — the new client survives');
  {
    const r = rig({ fns: INTAKE_FNS, vars: INTAKE_VARS, dom: intakeDom, stubs: intakeStubs });
    r.c.saveIntake();
    eq(r.c.jobs.length, 1, 'the client is created on this device');
    const id = r.c.jobs[0] && r.c.jobs[0].id;
    ok(Object.keys(r.c._outbox).length === 2, 'and both of its writes are queued (the list, and the job record)');
    eq(r.sheet.jobs.length, 0, 'the sheet does not have it yet — the writes have not gone');

    // Build estimate, straight away. refreshEstimateFromCloud → refreshJobsFromCloud.
    r.refresh();
    eq(r.refreshedCount(), 1, 'the caller carries on at once, with the local list');
    eq(r.reads.length, 0, '⚠ the sheet is not asked while this device still owes it a write');
    eq(r.ids(), [id], '⚠⚠ THE NEW CLIENT IS STILL ON THIS DEVICE — this is where the old refresh emptied the list');
    eq(r.cache().map((j) => j.id), [id], 'and in the local cache, which a reload reads first');

    // The 250 ms window closes: the first write is on the wire and has not answered.
    r.tick(250);
    ok(r.c._outboxSending, 'a batch is going out');
    eq(r.writes.length, 1, 'one write at a time, as the outbox always sends');
    r.refresh();
    eq(r.reads.length, 0, 'still not asked while a write is on the wire');
    eq(r.ids(), [id], 'still here');

    // Both writes land. Now the sheet is the truth, and the refresh takes it.
    r.land();
    eq(r.sheet.jobs.map((j) => j.id), [id], 'the sheet has the client');
    ok(!r.c._syncWritesOutstanding(), 'nothing is outstanding');
    r.sheet.jobs.push({ id: 424242, name: 'Ada Pressly', status: 'new', updatedAt: 1 });   // the other device
    r.refresh();
    eq(r.reads.length, 1, 'with nothing outstanding the sheet IS asked');
    has(r.reads[0] && r.reads[0].url, '?action=loadJobs', 'for the jobs list');
    r.answer();
    eq(r.ids(), [id, 424242], 'the answer is taken: our client, plus the one added on the other device');
    eq(r.cache().map((j) => j.id), [id, 424242], 'and cached');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ A FAILED WRITE HELD IN THE RETRY QUEUE stands the refresh down too — for as long as it is held');
  {
    // The worst window: the save failed, so the client exists ONLY on this device until the
    // retry lands, and a refresh taking the sheet's list would delete it outright.
    const r = rig({ fns: INTAKE_FNS, vars: INTAKE_VARS, dom: intakeDom, stubs: intakeStubs });
    r.c.saveIntake();
    const id = r.c.jobs[0] && r.c.jobs[0].id;
    r.tick(250);
    r.land({ ok: false, error: 'Lock timeout' });
    ok(Object.keys(r.c._pendingWrites).length >= 1, 'the failed writes are held for retry');
    ok(!r.c._outboxSending && !Object.keys(r.c._outbox).length, 'and nothing is left in the outbox');
    r.refresh();
    eq(r.reads.length, 0, '⚠ not asked while the retry queue holds a write');
    eq(r.ids(), [id], 'the client is still here');
    eq(r.cache().map((j) => j.id), [id], 'and cached');

    // The backoff fires and the sweep is on the wire.
    r.tick(r.c._retryDelays[0]);
    ok(r.c._flushing, 'the retry sweep is sending');
    r.refresh();
    eq(r.reads.length, 0, 'not asked mid-sweep either');
    r.land();
    ok(!r.c._syncWritesOutstanding(), 'the retry landed and the queue is empty');
    r.refresh();
    eq(r.reads.length, 1, 'and now the sheet is asked');
    r.answer();
    eq(r.ids(), [id], 'and agrees: the client is there');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ EDIT CLIENT 3,000 → 5,200 sq ft, then Build estimate: the local record keeps 5,200');
  {
    const job = { id: 7, hvlId: 'HVL-0007', name: 'Tripp Butler', fname: 'Tripp', lname: 'Butler',
                  svc: 'downsizing', sqft: '3000', status: 'new', start: '2026-10-12',
                  completion: '', walkthrough: '2026-10-06', updatedAt: 1000 };
    const r = rig({
      fns: EC_FNS, vars: EC_VARS, local: [job], sheet: [job],
      dom: { 'ec-svc': 'downsizing', 'ec-fname': 'Tripp', 'ec-lname': 'Butler', 'ec-sqft': '5200',
             'ec-premium': 'no', 'ec-start': '2026-10-12', 'ec-completion': '', 'ec-walkthrough': '2026-10-06' },
      stubs: { renderClientDashboard() {}, renderJobs() {} },
    });
    r.c.saveClientEdit(7);
    eq(r.c.jobs[0].sqft, '5200', 'the edit is on the local record');
    ok(Object.keys(r.c._outbox).length >= 1, 'and its write is queued');
    r.refresh();
    eq(r.reads.length, 0, '⚠ the sheet (still on 3,000) is not asked');
    eq(r.c.jobs[0].sqft, '5200', '⚠⚠ THE RECORD THE ESTIMATE PRICES FROM KEEPS 5,200 — this is where the old refresh put 3,000 back');
    eq(r.cache()[0].sqft, '5200', 'and the cache keeps 5,200');
    r.tick(250);
    r.land();
    eq(r.sheet.jobs[0].sqft, '5200', 'the write lands');
    r.refresh();
    r.answer();
    eq(r.c.jobs[0].sqft, '5200', 'and the sheet, asked afterwards, agrees');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ WITH NOTHING QUEUED, THE REFRESH STILL TAKES THE SHEET\'S COPY');
  {
    // The converse, or the fix is a switch that turned the refresh off. This is what the
    // refresh exists for: approval state and intake fields changed on the other device.
    const r = rig({
      local: [{ id: 1, name: 'Tripp Butler', sqft: '3000', status: 'new', updatedAt: 100 },
              { id: 3, name: 'Gone Elsewhere', status: 'lost', updatedAt: 90 }],
      sheet: [{ id: 1, name: 'Tripp Butler', sqft: '4100', status: 'pending', approved: false, updatedAt: 200 },
              { id: 2, name: 'Ada Pressly', status: 'new', tc: 'Anthony Graziano Sr', updatedAt: 150 }],
    });
    r.refresh();
    eq(r.reads.length, 1, 'the sheet is asked');
    eq(r.refreshedCount(), 0, 'and the caller waits for the answer — a fresher list is the whole point of asking');
    r.answer();
    eq(r.refreshedCount(), 1, 'the caller carries on once it lands');
    eq(r.ids(), [1, 2], 'the sheet\'s list, in the sheet\'s order');
    eq(r.c.jobs[0].sqft, '4100', 'a newer edit from the other device is taken');
    eq(r.c.jobs[0].status, 'pending', 'and a status change — what the 12 s and 15 s watches are waiting for');
    eq(r.c.jobs[1].tc, 'Anthony Graziano', 'a retired name is migrated on the way in, as loadJobs does');
    ok(r.ids().indexOf(3) < 0, '⚠ a job the sheet does not hold is dropped — membership stays the sheet\'s. Keeping it is how deleted clients came back on 2026-09-08');
    eq(r.cache().map((j) => j.id), [1, 2], 'and the cache is written');
    eq(r.cache()[1].tc, 'Anthony Graziano', 'already migrated');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ A NEWER LOCAL RECORD IS NEVER OVERWRITTEN by an older sheet copy');
  {
    const mine = { id: 1, name: 'Tripp Butler', sqft: '5200', notes: 'mine', updatedAt: 500 };
    const r = rig({
      local: [mine],
      sheet: [{ id: 1, name: 'Tripp Butler', sqft: '3000', notes: 'old', updatedAt: 400 }],
    });
    r.refresh();
    r.answer();
    eq(r.c.jobs[0].sqft, '5200', 'the local record is strictly newer than the sheet\'s — it stays');
    eq(r.c.jobs[0].notes, 'mine', 'whole, not field by field: the record, not a blend');
    eq(r.cache()[0].sqft, '5200', 'and the cache keeps it');
  }

  // The Drive failure notice, and the save helper it must NOT go through. `_saveJobEdit` and
  // `_jobTouch` are lifted although nothing here calls them: a revert that sends the notice through
  // the helper — making it stamp, so it no longer ties — then FAILS these groups on the clock
  // check instead of throwing out of the file with every check after it unrun.
  const FAIL_FNS = ['_driveFolderFailed', '_saveJobEdit', '_jobTouch'];

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ A WRITE QUEUED WHILE THE READ IS IN FLIGHT — the answer is discarded');
  {
    // The write has to be one that does NOT move the job's clock, or the stale answer is simply
    // older than the local record and the merge keeps it whatever the recheck does. Since 2026-09-29
    // (C2) every edit a PERSON makes stamps the job — this used the probate-package toggle, which
    // now does — so it is the Drive failure notice: a save the app makes on its own, deliberately
    // bare (tests/job-edit-stamps.test.js names it). It ties the local record, a tie goes to the
    // sheet, and only the recheck stops the stale answer wiping it.
    const job = { id: 1, name: 'Tripp Butler', svc: 'probate', updatedAt: 100 };
    const r = rig({ fns: FAIL_FNS, local: [job], sheet: [job], stubs: { console: QUIET } });
    r.refresh();
    eq(r.reads.length, 1, 'nothing was queued, so the sheet is asked');
    r.c._driveFolderFailed(r.c.jobs[0], 'the server refused', 'Exception: nope');
    ok(!!r.c.jobs[0].driveFolderError, 'a change is made while the read is out');
    eq(r.c.jobs[0].updatedAt, 100, '…one that leaves the job\'s clock alone, so the stale answer TIES it');
    r.answer();
    ok(!!r.c.jobs[0].driveFolderError, '⚠ the answer predates it and is not applied');
    ok(!!(r.cache()[0] || {}).driveFolderError, 'nor written over the cache');
    eq(r.refreshedCount(), 1, 'and the caller still carries on');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ A WRITE QUEUED *AND LANDED* WHILE THE READ IS IN FLIGHT — nothing is outstanding, and the answer still predates it');
  {
    const job = { id: 1, name: 'Tripp Butler', svc: 'probate', updatedAt: 100 };
    const r = rig({ fns: FAIL_FNS, local: [job], sheet: [job], stubs: { console: QUIET } });
    r.refresh();
    eq(r.reads.length, 1, 'the read goes out');
    r.c._driveFolderFailed(r.c.jobs[0], 'the server refused', 'Exception: nope');
    r.tick(250);
    r.land();
    ok(!!(r.sheet.jobs[0] || {}).driveFolderError, 'the write has reached the sheet');
    ok(!r.c._syncWritesOutstanding(), '⚠ and nothing is outstanding — the outstanding check alone cannot see this');
    r.answer();                                          // served before the write committed
    ok(!!r.c.jobs[0].driveFolderError, '⚠⚠ the write count says a write went out since the read was asked, so its answer is not taken');
    ok(!!(r.cache()[0] || {}).driveFolderError, 'and the cache keeps the change');
    r.refresh();
    r.answer();
    ok(!!r.c.jobs[0].driveFolderError, 'the next refresh reads the sheet with the write in it');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ THE SHEET\'S DELETIONS STILL APPLY — on a taken answer and on a discarded one');
  {
    // Taken: the list and the deletion both arrive.
    const a = rig({
      local: [{ id: 1, name: 'Tripp Butler', updatedAt: 100 }, { id: 4, name: 'Deleted Elsewhere', updatedAt: 100 }],
      sheet: [{ id: 1, name: 'Tripp Butler', updatedAt: 100 }], deleted: ['4'],
      estimateStore: { 1: { estimate: { svc: 'downsizing' } }, 4: { estimate: { svc: 'downsizing' } } },
    });
    a.refresh();
    a.answer();
    eq(a.ids(), [1], 'the deleted client leaves this device');
    ok(!a.c.estimateStore[4] && !!a.c.estimateStore[1], 'and takes its estimate with it, not anybody else\'s');
    ok(a.badges.some((m) => m.indexOf('1 client deleted elsewhere') >= 0), 'and it says so — a client vanishing with no word reads as data loss');
    eq(a.landedCount(), 1, 'every surface built from the list is redrawn');

    // Discarded: a write went out while the read was in flight. The list is not taken — but the
    // ledger's deletions are not a snapshot that can be behind our writes, so they still apply.
    const b = rig({
      fns: FAIL_FNS,
      local: [{ id: 1, name: 'Tripp Butler', notes: 'mine', updatedAt: 100 },
              { id: 4, name: 'Deleted Elsewhere', updatedAt: 100 }],
      sheet: [{ id: 1, name: 'Tripp Butler', notes: 'theirs', updatedAt: 100 }], deleted: ['4'],
      estimateStore: { 4: { estimate: { svc: 'downsizing' } } },
      stubs: { console: QUIET },
    });
    b.refresh();
    b.c._driveFolderFailed(b.c.jobs[0], 'the server refused', '');   // a write that ties — see above
    b.answer();
    eq(b.ids(), [1], '⚠ the deleted client leaves even though the list was not taken');
    ok(!b.c.estimateStore[4], 'with its records');
    ok(b.badges.some((m) => m.indexOf('deleted elsewhere') >= 0), 'and says so');
    eq(b.c.jobs[0].notes, 'mine', 'while the local record is left exactly as it was');
    ok(!!b.c.jobs[0].driveFolderError, 'including the change still on its way');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('an answer that is not a jobs list changes nothing — and the caller always carries on');
  {
    const local = [{ id: 1, name: 'Tripp Butler', updatedAt: 100 }];
    const e1 = rig({ local, sheet: [] });
    e1.refresh();
    e1.answer({ ok: false, error: 'Exception: Service invoked too many times', jobs: [] });
    eq(e1.ids(), [1], 'an error answer carrying an empty list does not empty this one');
    eq(e1.refreshedCount(), 1, 'and the caller carries on');
    const e2 = rig({ local, sheet: [] });
    e2.refresh();
    e2.answer({ jobs: undefined });
    eq(e2.ids(), [1], 'nor does an answer with no list at all');
    const e3 = rig({ local, sheet: [] });
    e3.refresh();
    const r3 = e3.reads.shift();
    if (r3) r3.p.reject(new Error('Failed to fetch'));
    ok(!!r3, 'the read went out');
    eq(e3.ids(), [1], 'nor a dropped connection');
    eq(e3.refreshedCount(), 1, 'and the caller still carries on, offline');
    const e4 = rig({ local, stubs: { SHEETS_SYNC_URL: '' } });
    e4.refresh();
    eq(e4.reads.length, 0, 'no sync URL: nothing to ask');
    eq(e4.refreshedCount(), 1, 'and the caller carries on');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('_mergeCloudJobs — the rule, driven on its own');
  {
    const c = sandbox({ fns: ['_mergeCloudJobs'] });
    const cloud1 = { id: 1, v: 'cloud', updatedAt: 100 };
    const local1 = { id: 1, v: 'local', updatedAt: 100 };
    ok(c._mergeCloudJobs([local1], [cloud1])[0] === cloud1, '⚠ a TIE goes to the sheet — it is our write, merged with the other device\'s keys');
    const newer = { id: 1, v: 'local', updatedAt: 101 };
    ok(c._mergeCloudJobs([newer], [cloud1])[0] === newer, 'a local record strictly newer is kept — the sheet has not seen that write');
    const older = { id: 1, v: 'local', updatedAt: 99 };
    ok(c._mergeCloudJobs([older], [cloud1])[0] === cloud1, 'an older local record takes the sheet\'s');
    eq(c._mergeCloudJobs([{ id: 9, updatedAt: 999 }], [cloud1]).map((j) => j.id), [1], 'a local-only job is not kept — membership is the sheet\'s');
    eq(c._mergeCloudJobs([], [cloud1, { id: 2 }]).map((j) => j.id), [1, 2], 'a sheet-only job is added');
    eq(c._mergeCloudJobs([{ id: 2 }, { id: 1 }], [{ id: 1 }, { id: 2 }]).map((j) => j.id), [1, 2], 'in the sheet\'s order');
    ok(c._mergeCloudJobs([{ id: 1 }], [{ id: 1, updatedAt: 5 }])[0].updatedAt === 5, 'a missing stamp reads as 0 — never newer than a stamped copy');
    ok(c._mergeCloudJobs([{ id: 1, updatedAt: 5, v: 'l' }], [{ id: 1, v: 'c' }])[0].v === 'l', 'and a stamped local copy beats an unstamped sheet one');
    ok(c._mergeCloudJobs([{ id: 7, updatedAt: 9, v: 'l' }], [{ id: '7', updatedAt: 1, v: 'c' }])[0].v === 'l', 'a numeric id matches its string on the sheet');
    eq(c._mergeCloudJobs(null, [cloud1]).length, 1, 'no local list is no local records');
    eq(c._mergeCloudJobs([cloud1], null), [], 'and no sheet list is an empty list — the caller has already refused that answer');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('the callers carry on with local data while the refresh stands down');
  {
    // refreshEstimateFromCloud — Build estimate, the client-estimate load, and the 12 s approval watch.
    const r = rig({
      fns: ['refreshEstimateFromCloud'],
      local: [{ id: 1, name: 'Tripp Butler', updatedAt: 100 }], sheet: [],
      stubs: { estimateHasContent: () => false },
    });
    r.c.saveJobs();                                       // a write outstanding
    const ready = [];
    r.c.refreshEstimateFromCloud(1, (s) => ready.push(s));
    eq(r.reads.length, 1, 'the jobs read stands down and the ESTIMATE read goes out at once');
    has(r.reads[0] && r.reads[0].url, '?action=loadEstimates', 'the estimates read');
    r.answer({ estimates: {} });
    eq(ready, ['cloud'], 'and the estimate opens on the answer');
    eq(r.ids(), [1], 'on the local jobs list, the client still in it');

    // jobsWatchTick — the 15 s poll while a job is pending.
    const w = rig({
      fns: ['jobsWatchTick', 'jobsStatusSig'],
      local: [{ id: 1, name: 'Tripp Butler', status: 'pending', updatedAt: 100 }], sheet: [],
      stubs: { maybeStartJobsWatch() { w.c.__rearmed = (w.c.__rearmed || 0) + 1; } },
    });
    w.c.saveJobs();
    w.c.jobsWatchTick();
    eq(w.reads.length, 0, 'the tick asks nothing while a write is out');
    eq(w.c.__rearmed, 1, 'and re-arms for the next tick, rather than stalling');
    eq(w.landedCount(), 0, 'nothing is redrawn — nothing changed');
    eq(w.ids(), [1], 'the pending job is still here');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('every main-sheet write moves the count the refresh compares against');
  {
    const r = rig({ local: [{ id: 1, updatedAt: 1 }] });
    const before = r.c._syncWriteSeq;
    r.c.queuedPostSync({ type: 'saveAllJobs', payload: [] });
    r.c.queuedPostSync({ type: 'saveAllJobs', payload: [] });   // coalesced — still a write queued
    r.c.queuedPostSync({ type: 'job', payload: { id: 1 } });
    eq(r.c._syncWriteSeq - before, 3, 'one per write queued, coalesced or not');
    const off = rig({ stubs: { SHEETS_SYNC_URL: '' } });
    off.c.queuedPostSync({ type: 'saveAllJobs', payload: [] });
    eq(off.c._syncWriteSeq, 0, 'no sync URL, no write, no count');

    // ⚠ The count is only complete while queuedPostSync is the one road to the main sheet.
    const live = liveLines(src);
    eq((live.match(/postSyncTo\(/g) || []).length, 4, 'postSyncTo: its definition, the postSync wrapper, and the two senders — no third road');
    eq((live.match(/[^A-Za-z_]postSync\(/g) || []).length, 1, 'postSync is defined and called by nothing');
    has(fnBody('postSyncBadge'), 'queuedPostSync(body', 'postSyncBadge goes through the queue');
    has(fnBody('_flushOutbox'), 'postSyncTo(w.target, w.body)', 'the outbox sends');
    has(fnBody('flushPendingWrites'), 'postSyncTo(w.target, w.body)', 'and so does the retry sweep');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('the old assignment is gone — and one half of the recheck is belt-and-braces, recorded rather than pinned');
  {
    const body = liveLines(fnBody('refreshJobsFromCloud'));
    lacks(body, 'jobs = data.jobs', '⚠ the answer is never assigned over the list whole');
    // ⚠ BELT-AND-BRACES, said so here rather than covered by a check that cannot fail. When the
    // answer lands it is refused if a write is outstanding OR the write count has moved. Every
    // main-sheet write is counted by queuedPostSync (the group above), so any write queued after the
    // read went out moves the count whether or not it is still outstanding — the count alone catches
    // every case the outstanding check does, and reverting that half alone is green by construction.
    // It stays because it is the rule refreshPlanAndLogFromCloud states; the one extra thing it sees
    // is a failed DIRECTORY write, which costs one skipped refresh and never any data.
    has(body, '_syncWritesOutstanding()', 'the stand-down reads the one shared definition of outstanding');
  }
};
