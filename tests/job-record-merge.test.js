'use strict';
// ⚠⚠ A JOB IS NOT A SCALAR (2026-09-12). Anthony, after the job-plan merge shipped: "are
// there any other obvious locking issues that would keep things from propagating either in
// app or between devices that we should clean up now?" Three, and this file covers two.
//
// Both job save paths took the newer WHOLE record on updatedAt — and a job carries several
// independently-edited sub-records: payments[] (what the client actually paid), docState{}
// (which documents have gone out and been filed), appraisers[] and invSnapshots[].
// Measured on the real backend, both devices holding the morning's copy: the desk records a
// $12,857 deposit cheque at 2pm, the house marks the agreement signed at 3pm without having
// reloaded, and the sheet keeps the signature and NO PAYMENT.
//
// The second is the hours log: deleteLogEntry spliced, saveLogStore unioned by id and only
// ever added, so a deleted entry never reached the sheet at all and came back to the
// DELETING device on its next page load — billing the client, because the final invoice
// trues labour to this log.
//
// These drive the real .gs functions in a vm and then hand the REAL app's _jobTouch output
// to them, so the two ends are tested against each other rather than each against a fixture.

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { matchBrace, sandbox } = require('./harness');

const GS = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'main-sync.gs'), 'utf8');
const APP = fs.readFileSync(path.join(__dirname, '..', 'havellin.html'), 'utf8');

function gsFn(name) {
  const re = new RegExp('(^|\\n)function\\s+' + name + '\\s*\\(', 'g');
  const m = re.exec(GS);
  if (!m) throw new Error('not in .gs: ' + name);
  const start = m.index + (m[1] ? m[1].length : 0);
  const open = GS.indexOf('{', re.lastIndex);
  const close = matchBrace(GS, open);
  if (close === -1) throw new Error('unbalanced: ' + name);
  return GS.slice(start, close + 1);
}
function gsVar(name) {
  const m = GS.match(new RegExp('(^|\\n)(var\\s+' + name + '\\s*=[^;]*;)'));
  if (!m) throw new Error('not in .gs: var ' + name);
  return m[2];
}

// A minimal in-memory Jobs sheet, enough to drive the real saveAllJobsToSheet end to end.
// Driving the MERGE alone would not prove the save path actually calls it — this file
// already records a revert coming back green because a test drove a piece and not the wiring.
function fakeSheet(name, header) {
  const rows = header ? [header.slice()] : [];
  return {
    getName: () => name, _rows: rows,
    getLastRow: () => rows.length,
    getLastColumn: () => rows.reduce((m, r) => Math.max(m, r.length), 0),
    appendRow(r) { rows.push(r.slice()); },
    getDataRange() { return { getValues: () => rows.map((r) => r.slice()) }; },
    getRange(r, c, nr, nc) {
      return {
        getValues() {
          const out = [];
          for (let i = 0; i < nr; i++) {
            const row = rows[r - 1 + i] || [], cells = [];
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
          while (rows.length > 1 && rows[rows.length - 1].every((x) => x === '' || x === undefined)) rows.pop();
        },
      };
    },
  };
}

const HDR = ['ID', 'HVL ID', 'Name', 'Email', 'Phone', 'Address', 'City', 'Zip', 'Service', 'Status', 'Created', 'Data JSON'];

function server() {
  const sheets = { Jobs: fakeSheet('Jobs', HDR) };
  const blobs = {};
  const ctx = {
    console,
    Logger: { log() {} },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    SpreadsheetApp: { openById: () => ({
      getSheetByName: (n) => sheets[n] || null,
      insertSheet(n) { sheets[n] = fakeSheet(n); return sheets[n]; },
    }) },
    _readStoreBlob: (n, e) => (Object.prototype.hasOwnProperty.call(blobs, n) ? JSON.parse(blobs[n]) : e),
    _writeStoreBlob: (n, o) => { blobs[n] = JSON.stringify(o); },
    // The ledger and the deleted-job refusal have their own suite; stub them out so a
    // failure here is unambiguously about the merge.
    _jobRefusal: () => null,
    _jobRefusalCtx: () => ({ present: {}, ledger: { seen: {}, since: 0 } }),
    _stripRefusedJobKeys: () => [],
    _sweepDeletedJobKeys: () => {},
    _presentJobIds: () => ({}),
    getJobLedger: () => ({ seen: {}, since: 0 }),
    _ledgerMarkSeen: () => {},
    Date,
    __sheets: sheets, __blobs: blobs,
  };
  vm.createContext(ctx);
  const names = ['getJobsFromSheet', 'saveAllJobsToSheet', 'saveJobToSheet',
    '_jobStamp', '_jobListKey', '_mergeJobKeyed', '_mergeJobRecord',
    'saveLogStore', 'getLogStore'];
  vm.runInContext([gsVar('SHEET_ID'), gsVar('JOB_KEYED_LISTS'), gsVar('JOB_KEYED_MAPS'),
    gsVar('JOB_LIST_KEY'), ...names.map(gsFn)].join('\n\n'), ctx, { filename: 'main-sync.gs (extracted)' });
  return ctx;
}

const MORNING = 1757000000000;
function morningJob() {
  return {
    id: 7, hvlId: 'HVL-0007', name: 'Butler', svc: 'cleanout', status: 'won',
    created: '2026-09-04T09:00:00Z', updatedAt: MORNING,
    agrSent: true, agrSigned: false,
    payments: [],
    docState: { estimate: { sentAt: '09:00' }, agreement: { sentAt: '09:10' } },
    appraisers: [{ id: 'a1', name: 'Marie Wayland' }],
    invSnapshots: [],
    at: {},
  };
}
const clone = (o) => JSON.parse(JSON.stringify(o));

module.exports = function ({ group, ok, eq, has, lacks }) {

  group('⚠⚠ the reported loss: an unrelated edit on the other device destroyed a cheque');
  {
    const S = server();
    S.saveAllJobsToSheet([morningJob()]);

    // 2pm — the desk records the deposit, against its morning copy.
    const desk = clone(morningJob());
    desk.payments.push({ uid: 'p-desk', id: 1, stage: 'deposit', amount: 12857, method: 'check' });
    desk.at['payments:p-desk'] = MORNING + 5 * 3600e3;
    desk.docState['invoice:deposit'] = { sentAt: '14:00' };
    desk.at['docState:invoice:deposit'] = MORNING + 5 * 3600e3;
    desk.updatedAt = MORNING + 5 * 3600e3;
    S.saveAllJobsToSheet([desk]);

    // 3pm — the house marks the agreement signed, against ITS morning copy. It has never
    // seen the payment and its record is newer.
    const house = clone(morningJob());
    house.agrSigned = true;
    house.docState.agreement.sig = { signedBy: 'Tripp Butler' };
    house.at['docState:agreement'] = MORNING + 6 * 3600e3;
    house.updatedAt = MORNING + 6 * 3600e3;
    S.saveAllJobsToSheet([house]);

    const out = S.getJobsFromSheet()[0];
    eq(out.payments.length, 1, '⚠⚠ the $12,857 cheque survives the other device saving over it');
    // Read defensively: on a revert this list is EMPTY, and a TypeError here would kill the
    // file before the rest of the group runs — so the revert would read as one crash rather
    // than as the several assertions it actually breaks.
    eq((out.payments[0] || {}).amount, 12857, 'with its real amount, not a reconstruction');
    ok(out.docState['invoice:deposit'], 'and the record that the deposit invoice went out');
    eq(out.agrSigned, true, 'while the signature the house recorded still lands');
    eq(out.docState.agreement.sig.signedBy, 'Tripp Butler', 'with its signer');
  }

  group('⚠ order must not matter, or two laptops flip a job back and forth forever');
  {
    const a = clone(morningJob());
    a.payments.push({ uid: 'pa', amount: 100 });
    a.at['payments:pa'] = MORNING + 1000;
    a.updatedAt = MORNING + 1000;
    const b = clone(morningJob());
    b.payments.push({ uid: 'pb', amount: 200 });
    b.at['payments:pb'] = MORNING + 2000;
    b.updatedAt = MORNING + 2000;

    const S = server();
    const ab = S._mergeJobRecord(clone(a), clone(b));
    const ba = S._mergeJobRecord(clone(b), clone(a));
    eq(ab.payments.map((p) => p.uid).sort().join(','), 'pa,pb', 'both payments survive one way');
    eq(ba.payments.map((p) => p.uid).sort().join(','), 'pa,pb', 'and the other way');
    // ⚠ Compare the stamps as a SET. Key order is whichever device happened to save last,
    // and pinning it would assert an implementation detail rather than the requirement.
    const stamps = (o) => Object.keys(o.at).sort().map((k) => k + '=' + o.at[k]).join(',');
    eq(stamps(ab), stamps(ba), 'and the stamps agree whichever saved last');
  }

  group('⚠⚠ an unstamped key is the WEAKEST claim, not the freshest');
  {
    const S = server();
    // The house holds a payment it recorded. The desk is NEWER but never touched payments
    // — its empty list is "I never saw one", and falling back to updatedAt here would hand
    // every untouched record to whoever saved last, which IS the defect.
    const house = clone(morningJob());
    house.payments.push({ uid: 'px', amount: 500 });
    house.at['payments:px'] = MORNING + 1000;
    const desk = clone(morningJob());
    desk.updatedAt = MORNING + 9999;

    eq(S._mergeJobRecord(house, desk).payments.length, 1,
       '⚠ a newer record that never touched payments does not empty them');

    // ⚠⚠ AND THE CASE THAT MATTERS MOST: BOTH SIDES HOLD THE KEY. Every device posts the
    // WHOLE job, so the other machine's payload carries a value for every record the desk
    // changed — the STALE one it loaded that morning. With only updatedAt to go on, that
    // stale copy looks exactly as fresh as the real edit, which IS the defect. Caught only
    // by reverting: the absence cases above all resolve before this branch is reached.
    const filed = clone(morningJob());
    filed.docState.agreement = { sentAt: '09:10', filedAt: '13:00', filedUrl: 'drive://x' };
    filed.at['docState:agreement'] = MORNING + 4 * 3600e3;
    filed.updatedAt = MORNING + 4 * 3600e3;
    const untouched = clone(morningJob());          // still the morning value, never touched
    untouched.updatedAt = MORNING + 8 * 3600e3;     // …and NEWER
    const kept = S._mergeJobRecord(filed, untouched);
    eq(kept.docState.agreement.filedAt, '13:00',
       '⚠⚠ a stamped value beats a NEWER record that never touched that key');
    eq(kept.docState.agreement.filedUrl, 'drive://x', 'with the Drive link it carried');

    // And when BOTH devices really did touch it, the newer stamp decides — not updatedAt.
    const later = clone(morningJob());
    later.docState.agreement = { sentAt: '09:10', filedAt: '16:00' };
    later.at['docState:agreement'] = MORNING + 7 * 3600e3;
    later.updatedAt = MORNING + 100;                // older RECORD, newer touch on this key
    eq(S._mergeJobRecord(filed, later).docState.agreement.filedAt, '16:00',
       'two real edits to one key resolve on the stamp, not on the record clock');
    eq(S._mergeJobRecord(later, filed).docState.agreement.filedAt, '16:00',
       'and the same way round the other way');

    // …and with NO stamp on either side the newer record decides, which is exactly how a
    // job written before this deployment already behaved. Nothing legacy changes meaning.
    const oldA = { id: 7, updatedAt: 1, docState: { estimate: { sentAt: 'old' } } };
    const oldB = { id: 7, updatedAt: 2, docState: { estimate: { sentAt: 'new' } } };
    eq(S._mergeJobRecord(oldA, oldB).docState.estimate.sentAt, 'new',
       'unstamped on both sides falls back to updatedAt, as a legacy job always did');
  }

  group('⚠⚠ a stamp with NO value is a removal; a bare absence never is');
  {
    const S = server();
    const withAppr = clone(morningJob());
    withAppr.at['appraisers:a1'] = MORNING;

    // The desk removes the appraiser and stamps the removal.
    const removed = clone(withAppr);
    removed.appraisers = [];
    removed.at['appraisers:a1'] = MORNING + 1000;
    removed.updatedAt = MORNING + 1000;
    eq(S._mergeJobRecord(withAppr, removed).appraisers.length, 0,
       'a touch with nothing left behind it removes the record');

    // The reverse: a device that simply never saw it must not delete it. Every device posts
    // the WHOLE jobs array, so absence alone is how a stale laptop wipes real work.
    const neverSaw = clone(morningJob());
    neverSaw.appraisers = [];
    neverSaw.at = {};
    neverSaw.updatedAt = MORNING + 9999;
    eq(S._mergeJobRecord(withAppr, neverSaw).appraisers.length, 1,
       '⚠ but an unstamped absence is "never saw it" and keeps the record');

    // And the removal keeps winning against every LATER stale save, because the stamps
    // union — otherwise the appraiser comes back on the next sync from that same laptop.
    const afterRemoval = S._mergeJobRecord(withAppr, removed);
    const stillHasIt = clone(withAppr);
    stillHasIt.updatedAt = MORNING + 50000;
    eq(S._mergeJobRecord(afterRemoval, stillHasIt).appraisers.length, 0,
       'and it stays removed when a device still holding it saves afterwards');
  }

  group('⚠ scalars still follow the newer record — only the keyed sub-records are per key');
  {
    const S = server();
    const a = clone(morningJob());
    const b = clone(morningJob());
    b.status = 'active';
    b.name = 'Butler Estate';
    b.updatedAt = MORNING + 1000;
    const out = S._mergeJobRecord(a, b);
    eq(out.status, 'active', 'a status set on the newer device wins');
    eq(out.name, 'Butler Estate', 'and so does a corrected name');
  }

  group('⚠⚠ payments key on uid, because `id` is a PER-DEVICE counter');
  {
    const S = server();
    // max(id)+1 is computed from the payments THIS device holds, so two people each
    // recording one both mint 1. Keying on it would FUSE two real payments into one.
    const a = clone(morningJob());
    a.payments.push({ uid: 'u-a', id: 1, amount: 5000 });
    a.at['payments:u-a'] = MORNING + 1;
    const b = clone(morningJob());
    b.payments.push({ uid: 'u-b', id: 1, amount: 7857 });
    b.at['payments:u-b'] = MORNING + 2;
    const out = S._mergeJobRecord(a, b);
    eq(out.payments.length, 2, '⚠ two payments that both minted id 1 stay two payments');
    eq(out.payments.reduce((s, p) => s + p.amount, 0), 12857, 'and the money adds up');

    // A payment written before uids existed has no other key, and inventing one would
    // orphan it — the same index fallback _srcLineKey keeps for a legacy estimate line.
    eq(S._jobListKey('payments', { id: 4 }), '4', 'a legacy payment keys on its id');
    eq(S._jobListKey('payments', { uid: 'z', id: 4 }), 'z', 'and uid wins when present');
  }

  group('⚠ the per-record save path merges too — ~20 edit sites fire it');
  {
    const S = server();
    S.saveAllJobsToSheet([morningJob()]);
    const desk = clone(morningJob());
    desk.payments.push({ uid: 'p1', amount: 12857 });
    desk.at['payments:p1'] = MORNING + 1000;
    desk.updatedAt = MORNING + 1000;
    S.saveJobToSheet(desk);

    // A STALE edit through the same path. It used to return early and drop this write
    // whole; before that it overwrote. Both directions were live.
    const stale = clone(morningJob());
    stale.notes = 'called the executor';
    stale.updatedAt = MORNING + 500;
    S.saveJobToSheet(stale);
    let out = S.getJobsFromSheet()[0];
    eq(out.payments.length, 1, 'a stale per-record edit does not drop the payment');

    // …and a NEWER one does not either.
    const newer = clone(morningJob());
    newer.status = 'active';
    newer.updatedAt = MORNING + 9999;
    S.saveJobToSheet(newer);
    out = S.getJobsFromSheet()[0];
    eq(out.payments.length, 1, 'nor does a newer one');
    eq(out.status, 'active', 'while the newer scalar still lands');
  }

  group('⚠ the estimate store deliberately keeps whole-record-wins — do not apply this wholesale');
  {
    has(gsFn('saveEstimateStore'), '_mergeStoreByKey(getEstimateStore(), incoming)',
        'a saved estimate is ONE priced snapshot, not a thing two people edit half of each');
    const bulk = gsFn('saveAllJobsToSheet');
    has(bulk, '_mergeJobRecord(cur, j)', 'the bulk job path merges per key');
    lacks(bulk, 'inT >= curT', 'and no longer takes the newer whole record');
  }

  group('⚠⚠ a deleted hours entry stayed deleted — it never even reached the sheet before');
  {
    const S = server();
    const e = (id, h) => ({ id, date: '2026-09-04', members: [{ name: 'Crew', role: 'PS', hours: h }] });
    const live = (a) => a.filter((x) => !x.deletedAt);
    const hrs = (a) => live(a).reduce((s, x) => s + x.members[0].hours, 0);

    S.saveLogStore({ 7: [e('L1', 7), e('L2', 8), e('L3', 6)] });
    // The removal travels as a RECORD. Every device posts the whole log, so a missing entry
    // means "never saw it" and can never be read as a deletion.
    S.saveLogStore({ 7: [e('L1', 7), { id: 'L2', deletedAt: MORNING }, e('L3', 6)] });
    eq(hrs(S.getLogStore()[7]), 13, 'the delete reaches the sheet at all, which it did not before');

    // The device that never saw the delete logs tomorrow's hours, carrying L2 live.
    S.saveLogStore({ 7: [e('L1', 7), e('L2', 8), e('L3', 6), e('L4', 5)] });
    const after = S.getLogStore()[7];
    eq(hrs(after), 18, '⚠ and a stale device does not resurrect it — 18 hrs, not 26');
    eq(live(after).map((x) => x.id).join(','), 'L1,L3,L4', 'while its new entry still lands');
    ok(after.some((x) => x.id === 'L2' && x.deletedAt), 'the void stays as the record of the removal');

    // A void must win from EITHER side, or whichever device syncs second decides.
    const S2 = server();
    S2.saveLogStore({ 7: [{ id: 'L9', deletedAt: MORNING }] });
    S2.saveLogStore({ 7: [e('L9', 4)] });
    eq(live(S2.getLogStore()[7]).length, 0, 'a live copy never overwrites a void already stored');
  }

  group('⚠ the app writes a VOID, never a splice, and every reader goes through one accessor');
  {
    const ctx = sandbox({
      fns: ['deleteLogEntry', 'jobLogEntries'],
      vars: ['jobLogs'],
      stubs: {
        confirm: () => true,
        saveLogData() {}, updateLogSummary() {}, renderLogHistory() {}, renderProjection() {},
      },
    });
    ctx.jobLogs[7] = [{ id: 'L1', members: [{ role: 'PS', hours: 7 }] },
                      { id: 'L2', members: [{ role: 'PS', hours: 8 }] }];
    ctx.deleteLogEntry(7, 'L2');
    eq(ctx.jobLogs[7].length, 2, '⚠ the row stays in the store — a splice is undone by the next merge');
    ok(ctx.jobLogs[7][1].deletedAt > 0, 'as a void');
    eq(ctx.jobLogEntries(7).length, 1, 'and the live view hides it');
    eq(ctx.jobLogEntries(7)[0].id, 'L1', 'leaving the entry that was not deleted');

    // Ten sites read jobLogs[jobId] directly before the accessor existed, which is ten
    // places to forget. The requirement is that no READER is left — stated as the
    // expressions themselves rather than as a count, which would break on any edit.
    const src = APP.replace(/^\s*\/\/.*$/gm, '');
    has(src, 'function jobLogEntries(', 'the accessor exists');
    has(src, 'e && !e.deletedAt', 'and it is what filters the voids');
    lacks(src, 'var logs = jobLogs[', 'no reader takes the raw array');
    lacks(src, '(jobLogs[jobId] || []).length', 'nor counts it');
    lacks(src, '(jobLogs[jobId] || []).slice()', 'nor walks it');
    lacks(src, "var entries = (typeof jobLogs", 'nor falls back to it');
    // ⚠ The watch's change signature reads the RAW store on purpose: a tombstone arriving
    // from the other device has to register as a change, or a remote deletion never
    // redraws the tab. Reading the live view there would miss exactly that.
    has(source('refreshPlanAndLogFromCloud'), 'jobLogs[jobId]',
        'the change signature deliberately sees voids too');
  }

  group('⚠ the app stamps at every write site, or the merge has nothing to read');
  {
    const ctx = sandbox({
      fns: ['_jobTouch', 'docState'],
      stubs: { document: { getElementById() { return null; } } },
    });
    const job = { id: 7, updatedAt: 1 };
    ctx._jobTouch(job, 'payments', 'p1');
    ok(job.at['payments:p1'] > 0, 'a payment is stamped');
    ok(job.updatedAt > 1,
       '⚠ and the record clock moves too, or a stale device still wins every SCALAR');

    // ⚠ THE STAMP LIVES INSIDE docState BECAUSE ALL FIVE OF ITS CALLERS ARE WRITERS. One
    // site instead of five is what stops a writer forgetting — the same reason the Phase 2
    // note is rendered inside planRoomStatusBtns rather than beside it.
    const j2 = { id: 8 };
    ctx.docState(j2, 'invoice:deposit').sentAt = 'now';
    ok(j2.at['docState:invoice:deposit'] > 0, 'touching a document record stamps it');
    has(source('docState'), '_jobTouch(job, \'docState\', docKey)',
        'the stamp is inside the accessor, not at its call sites');

    // Removals stamp as well — that is the whole mechanism for propagating a deletion.
    const rm = source('removeAppraiser');
    has(rm, '_jobTouch(job, \'appraisers\', apprId)', 'removing an appraiser stamps the removal');
    has(source('removeInventorySnapshot'), '_jobTouch(job, \'invSnapshots\', ts)',
        'and so does removing a snapshot');
    has(source('saveDeposit'), 'uid: _photoUid()',
        '⚠ a payment is born with a device-independent key, not a max(id)+1 counter');
  }

  group('⚠⚠ the plan and the log were read ONCE, at page load, and never again');
  {
    // loadJobPlanData and loadLogData run from INIT and nowhere else, and the only poll in
    // the app is jobsWatchTick — gated on a job at `pending`, i.e. stopped for the whole
    // working phase. So the per-key plan merge was correct on the sheet and INVISIBLE on
    // screen: the house locks a room and the desk goes on showing it pending until somebody
    // reloads. These drive the real watch rather than asserting its source.
    function P(v) {
      return { then(f) { if (!f) return P(v); let o; try { o = f(v); } catch (e) { return F(e); }
                         return (o && typeof o.then === 'function') ? o : P(o); },
               catch() { return this; } };
    }
    function F(e) {
      return { then(f, g) { return g ? P(g(e)) : F(e); },
               catch(g) { let o; try { o = g(e); } catch (x) { return F(x); }
                          return (o && typeof o.then === 'function') ? o : P(o); } };
    }

    function rig(over) {
      const state = Object.assign({
        active: true, sel: '7', focusInPanel: false, calls: 0,
        plans: { 7: { rooms: { 3: { status: 'locked' } } } },
        logs: { 7: [] },
      }, over || {});
      const panel = { classList: { contains: (c) => c === 'active' && state.active },
                      contains: () => state.focusInPanel };
      const focused = { tagName: 'TEXTAREA' };
      const doc = {
        activeElement: state.focusInPanel ? focused : null,
        getElementById(id) {
          if (id === 'panel-job-plan') return panel;
          if (id === 'plan-job') return { value: state.sel };
          return null;
        },
      };
      const ctx = sandbox({
        fns: ['refreshPlanAndLogFromCloud', 'planWatchTick', 'maybeStartPlanWatch',
              'stopPlanWatch', '_planTabBusy', '_syncWritesOutstanding'],
        vars: ['_planWatch', 'PLAN_WATCH_MS'],
        stubs: {
          document: doc,
          SHEETS_SYNC_URL: 'https://example/exec',
          migrateRetiredNames: (x) => x,
          localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
          jobPlanStore: {}, jobLogs: {},
          _outboxSending: false, _flushing: false,
          _pendingWrites: state.pending || {}, _outbox: {},
          setInterval: () => 1, clearInterval() {},
          loadJobPlanTab() { state.redraws = (state.redraws || 0) + 1; },
          fetch(url) {
            state.calls++;
            const body = /loadJobPlans/.test(url) ? { jobPlans: state.plans } : { logs: state.logs };
            // `movesTo` models the person picking another client while this is in flight.
            if (state.movesTo) state.sel = state.movesTo;
            return P({ json: () => body });
          },
        },
      });
      return { ctx, state };
    }

    // The room the other device locked arrives, and the tab redraws once.
    let r = rig();
    r.ctx.planWatchTick();
    eq(r.state.calls, 2, 'a tick asks for the plan and the log');
    eq(r.state.redraws, 1, '⚠ a room locked on the other device redraws the tab');
    eq(r.ctx.jobPlanStore[7].rooms[3].status, 'locked', 'and the store now holds it');

    // ⚠ `changed` IS A REAL COMPARISON. refreshPhotoRefs ended in an unconditional
    // cb(true) and that re-entered loadJobPlanTab forever, one network round trip per
    // cycle — the stage that shut itself within seconds. A second tick over the same
    // answer must do nothing at all.
    r.ctx.planWatchTick();
    eq(r.state.redraws, 1, '⚠⚠ an unchanged answer does NOT redraw — that is the runaway loop');

    // ⚠ THE SHEET IS ONLY AUTHORITATIVE ONCE OUR OWN WRITES HAVE LANDED IN IT. Replacing
    // the store over a queued write reverts a room seconds after somebody locked it, which
    // is a worse defect than the one this closes.
    r = rig({ pending: { saveAllJobPlans: {} } });
    r.ctx.planWatchTick();
    eq(r.state.calls, 0, '⚠ a tick with a write still queued does not fetch at all');
    ok(!r.state.redraws, 'and never redraws over it');

    // ⚠ A REDRAW REWRITES #job-plan-content WITH innerHTML, so it destroys a half-typed
    // note — and somebody standing in a room typing is exactly who this tab is for.
    r = rig({ focusInPanel: true });
    r.ctx.planWatchTick();
    eq(r.state.calls, 0, 'a tick defers entirely while an input in the plan has focus');

    // Leaving the tab stops it, rather than polling a screen nobody is looking at.
    r = rig({ active: false });
    r.ctx._planWatch.timer = 1;
    r.ctx.planWatchTick();
    eq(r.ctx._planWatch.timer, null, 'the watch stops once the tab is not active');

    // ⚠ AND IT MUST NOT REDRAW A JOB THE PERSON HAS ALREADY MOVED OFF. The fetch is not
    // instant; the selector can change under it.
    r = rig({ movesTo: '9' });
    r.ctx.planWatchTick();
    ok(r.state.calls > 0, 'the request goes out against the job that was on screen');
    ok(!r.state.redraws, 'but the redraw is withheld once the selector has moved on');
  }

  group('⚠ the watch is wired to the tab, and stands down when you leave it');
  {
    const sp = source('showPanel');
    has(sp, 'maybeStartPlanWatch();', 'entering the Job Plan starts the watch');
    has(sp, 'stopPlanWatch();', 'and every other tab stops it');
    has(source('maybeStartPlanWatch'), 'planWatchTick();',
        '⚠ entering the tab is itself a refresh — not a 20-second wait to see the truth');
  }

  function source(name) {
    const re = new RegExp('(^|\\n)function\\s+' + name + '\\s*\\(', 'g');
    const m = re.exec(APP);
    if (!m) throw new Error('not in app: ' + name);
    const open = APP.indexOf('{', re.lastIndex);
    return APP.slice(m.index, matchBrace(APP, open) + 1);
  }
};
