'use strict';
// ⚠⚠ AN EDIT A PERSON MAKES TO A JOB MOVES THE JOB'S CLOCK (2026-09-29, workflow audit C2).
//
// The Job Plan's sourcing and crew writers changed the job and called saveJobs() alone.
// saveJobs() fills `updatedAt` only when it is MISSING — deliberately, so it never bumps a job
// this device did not touch — and the sheet merges a job as one record, keeping the INCOMING
// copy on a tie (`incT >= curT` in _mergeJobRecord). So the edit left the job at the stamp it
// had that morning, and the next save from ANY device holding the morning copy — an edit to a
// different client is enough, because saveAllJobs posts every job — won the tie and wrote the
// morning back. Reproduced on the real writers and the real sheet before anything was changed:
// a confirmed $23,400 painter, a confirmed team and an $850 dumpster came off the job, and
// getVendorActuals then billed the prep fee on the $20,000 estimate figure and dropped the
// dumpster from the final invoice.
//
// Everything below DRIVES the real writers out of havellin.html and the real save path out of
// apps-script/main-sync.gs (saveAllJobsToSheet / saveJobToSheet → _mergeJobRecord) against a
// fake Jobs sheet — the two ends against each other, never each against a fixture.

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { matchBrace, sandbox, domStub, source } = require('./harness');

const GS = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'main-sync.gs'), 'utf8');

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

// ── the sheet: the REAL saveAllJobsToSheet / saveJobToSheet over an in-memory Jobs tab ──────
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
  const ctx = {
    console, Logger: { log() {} },
    LockService: { getScriptLock: () => ({ waitLock() {}, tryLock() { return true; }, releaseLock() {} }) },
    SpreadsheetApp: { openById: () => ({
      getSheetByName: (n) => sheets[n] || null,
      insertSheet(n) { sheets[n] = fakeSheet(n); return sheets[n]; },
    }) },
    // The deleted-job ledger has its own suite; stub it so a failure here is about the merge.
    _jobRefusal: () => null, _presentJobIds: () => ({}),
    getJobLedger: () => ({ seen: {}, since: 0 }), _ledgerMarkSeen: () => {},
    Date,
  };
  vm.createContext(ctx);
  const names = ['getJobsFromSheet', 'saveAllJobsToSheet', 'saveJobToSheet',
    '_jobStamp', '_jobListKey', '_mergeJobKeyed', '_mergeJobRecord', '_lockOrBusy'];
  vm.runInContext([gsVar('SHEET_ID'), gsVar('JOB_KEYED_LISTS'), gsVar('JOB_KEYED_MAPS'),
    gsVar('JOB_LIST_KEY'), ...names.map(gsFn)].join('\n\n'), ctx, { filename: 'main-sync.gs (extracted)' });
  // Land a device's wire, in the order its outbox would send it.
  ctx.land = (wire) => wire.forEach((b) => {
    if (b.type === 'saveAllJobs') ctx.saveAllJobsToSheet(b.payload);
    else if (b.type === 'job') ctx.saveJobToSheet(b.payload);
  });
  ctx.job = (id) => ctx.getJobsFromSheet().find((j) => j.id === id);
  return ctx;
}

// ── a device: the REAL writers, with the outbox held BY REFERENCE the way the real one is ────
const MORNING = 1757000000000;
const VENDORS = [
  { _row: 2, vendor_name: 'Junk Kings', phone: '5615550100', contact_first: 'Kay', contact_last: 'King' },
  { _row: 11, vendor_name: 'Ace Painting', phone: '5615550101', contact_first: 'Al', contact_last: 'Ace', pricing_structure: 'Bid' },
  { _row: 12, vendor_name: 'Bin There Dumpsters', phone: '5615550102', contact_first: 'Bo', contact_last: 'Bin' },
];
const EST = () => ({
  svc: 'downsizing', prepEnabled: true, psCount: 2,
  prepItems: [{ type: 'Painting', cost: 20000, lid: 'p1' }],
  vendors: [{ type: 'Moving Company', cost: 12000, lid: 'v1' }],
  collections: [{ id: 'c1', name: 'Coins' }],
});
const clone = (o) => JSON.parse(JSON.stringify(o));
function morningJob(extra) {
  return Object.assign({
    id: 7, hvlId: 'HVL-0007', name: 'Butler', svc: 'downsizing', status: 'won', won: true,
    updatedAt: MORNING, tc: 'Ashley Jerome', created: '2026-09-20', email: 'tripp@example.com',
    payments: [], docState: {}, appraisers: [], invSnapshots: [], at: {},
  }, extra ? clone(extra) : {});
}
// A second client, so "the other device saves anything" can be a save of somebody else entirely.
const otherJob = () => ({ id: 8, hvlId: 'HVL-0008', name: 'Ellsworth', svc: 'cleanout', status: 'new', updatedAt: MORNING, created: '2026-09-21' });

const DEVICE_FNS = ['saveJobs', 'syncJobToSheets', 'syncToSheets', '_jobTouch', '_saveJobEdit', '_crewSave',
  '_srcLid', '_srcLineKey', '_srcAdoptLineIds', '_srcSlot', '_svcJob', '_prepJob', '_srcSetVendor',
  'setJobVendor', 'setJobVendorQuote', 'setJobVendorStatus', 'setPrepVendor', 'setPrepVendorQuote', 'setPrepVendorStatus',
  'setJobVendorCoordHrs', 'setPrepVendorCoordHrs', 'setLogisticsCoordHrs',
  '_collJob', 'setCollVendor', 'setCollFee', '_logiJob', 'setLogisticsVendor', 'setLogisticsQuote', 'setLogisticsStatus',
  'addLogisticsLine', 'removeLogisticsLine', 'getVendorActuals', 'prepFeeRate', 'logisticsCatsFor',
  'lookupVendorById', 'vendorIdOf', 'vendorContacts', '_vendorContact', 'resolveJobVendor',
  'getJobCrew', 'seedCrewFromEstimate', 'crewSlotHolding', 'crewDuplicates', '_crewRefuseDup', '_crewRefreshSelects',
  'setCrewTC', 'setCrewTC2', 'setCrewPS', 'confirmJobTeam', 'plannedTC2', 'rushCrewAdded', 'reviseJobTeam', 'lockAssignedCrew', '_lockCrewSlots', 'crewMemberHasHours',
  'unfilledPlannedPS', 'plannedPSCount', 'isCrewPlaceholder', 'samePerson', 'canonPersonName', 'isJobWon', 'jobLogEntries',
  'setVendorRating', 'setVendorRatingNote', '_ratingJob', '_writeVendorScore', 'computeVendorAvg',
  'draftReviewRequest', 'markReviewRequestSent', 'toggleProbatePkg', 'setValBasis', 'setEstateAVD',
  '_attachPaymentEvidence', '_driveFolderFailed', 'fetchSubfolderIds', '_normalizeSubfolders', 'applyEsignStatus', 'docState',
  'docStateBare', '_saveArrivalCheck', 'applyStripePayments', '_stripeRecordPayment', 'jobPayments', '_localDateOf', '_ymdLocal', '_stampChangedKeys', '_crewSnap', 'jobPrepLines', 'coPrepVendorLines', 'coVendorAdds'];
const DEVICE_VARS = ['SMF_PCT', 'PREP_FEE_RATE', 'LOGISTICS_CATEGORIES', '_srcLidSeq', 'VENDOR_CONTACT_SLOTS',
  'CONTRACTOR_TC_NAME', 'LOG_PLACEHOLDER_NAMES', 'PERSON_NAME_ALIASES', 'VENDOR_RATING_WINDOW'];

// A synchronous thenable, so fetchSubfolderIds' `.then` chain runs inside the call and the
// assertions after it are not racing a microtask.
function syncThen(v) { return { then(f) { const r = f(v); return (r && typeof r.then === 'function') ? r : syncThen(r); }, catch() { return this; } }; }

function device(jobList, stubs) {
  const posted = [];
  const saves = [];
  const c = sandbox({
    fns: DEVICE_FNS, vars: DEVICE_VARS,
    stubs: Object.assign({
      document: domStub(), SHEETS_SYNC_URL: 'https://sheets',
      postSyncBadge: (body) => posted.push(body),
      refreshVendorSourcing() {}, _srcPersistEstimates() {}, showFB() {}, rebuildLogDropdowns() {},
      getAllActiveTC: () => [], getAllActivePS: () => [], getPSCostRate: () => 30,
      buildLogTeamRows() {}, _repaintPlanGates() {}, jobLogs: {}, currentEstimate: null,
      vendorDirectory: VENDORS, VENDOR_SYNC_URL: 'https://vendor',
      queuedDirectoryWrite: (t, b, cb) => cb(true, {}, false),
      _repaintCloseout() {}, _todayStr: () => '2026-09-29', _actor: () => 'Ashley Jerome',
      _planTaskDone: () => true, bestClientEmail: () => 'tripp@example.com', gmailConfigured: () => false,
      _reviewMailtoUrl: () => 'mailto:tripp@example.com', _coNotice() {},
      renderClientDashboard() {}, _invRefreshSummary() {}, _scheduleInventorySync() {}, renderInventoryTab() {},
      showSyncBadge() {}, updateAgrUI() {},
      compressImage: (d, w, q, cb) => cb(d), resolveSubfolderId: (job, name, cb) => cb('folder-invoice'),
      _jobRootFolderId: () => 'root', uploadToDrive: (t, n, d, cb) => cb(true, 'https://drive/evidence.jpg'),
      FileReader: function () { this.readAsDataURL = function () { this.onload({ target: { result: 'data:image/jpeg;base64,AA' } }); }; },
      fetch: () => syncThen({ json: () => ({ subfolders: { 'Estate Inventory': 'sub-inv', 'Invoice': 'sub-invoice' } }) }),
    }, stubs || {}),
  });
  c.jobs = jobList;
  c.estimateStore = { 7: { estimate: EST(), approved: true } };
  c.window.confirm = () => true; c.confirm = () => true;
  c.__saves = saves;
  const realSave = c.saveJobs;
  c.saveJobs = function () { saves.push(1); return realSave.apply(this, arguments); };
  // What the outbox would put on the wire once the synchronous handler returns.
  c.__send = () => posted.splice(0).map((b) => clone(b));
  c.__posted = posted;
  return c;
}
const onWire = (wire, id) => {
  let last = null;
  wire.forEach((b) => {
    if (b.type === 'saveAllJobs') { const j = b.payload.find((x) => x.id === id); if (j) last = j; }
    if (b.type === 'job' && b.payload.id === id) last = b.payload;
  });
  return last;
};
const localJob = (dev, id) => (JSON.parse(dev.__store.havellin_jobs_v3 || '[]').find((j) => j.id === id) || null);
// Safe reads. A revert that breaks a writer must FAIL the checks after it — a read that throws
// stops the whole file, so it reads as ONE failure with every check after it unrun (the revert
// sweep found three of these on its first pass).
const get = (o, ...ks) => ks.reduce((a, k) => (a == null ? undefined : a[k]), o);
const holds = (check, j) => { try { return !!check(j || {}); } catch (e) { return false; } };

// The whole scenario: the sheet holds the morning's copy; device A makes the edit; device B,
// holding the morning's copy and never reloaded, saves something else; the sheet is read back.
function twoDevices(morningExtra, act, bAct) {
  const srv = server();
  srv.saveAllJobsToSheet([morningJob(morningExtra), otherJob()]);
  const A = device([morningJob(morningExtra), otherJob()]);
  act(A);
  const wireA = A.__send();
  srv.land(wireA);
  const afterA = clone(srv.job(7));
  const B = device([morningJob(morningExtra), otherJob()]);
  (bAct || ((b) => b.saveJobs()))(B);        // B saves ANYTHING — by default a bare whole-array save
  const wireB = B.__send();
  srv.land(wireB);
  return { A, B, wireA, wireB, afterA, after: srv.job(7), srv };
}

module.exports = function ({ group, ok, eq, has, lacks }) {

  // ─────────────────────────────────────────────────────────────────────────
  group('⚠⚠ the reported loss: a morning of Job Plan work survives the other device saving');
  {
    const r = twoDevices(null, (A) => {
      A.setPrepVendor(7, 0, 11); A.setPrepVendorQuote(7, 0, '23400'); A.setPrepVendorStatus(7, 0, 'Confirmed');
      A.addLogisticsLine(7, 'dumpster'); A.setLogisticsVendor(7, 'dumpster', 12);
      A.setLogisticsQuote(7, 'dumpster', '850'); A.setLogisticsStatus(7, 'dumpster', 'Confirmed');
      A.setCrewPS(7, 0, 'Anthony Graziano Jr'); A.setCrewPS(7, 1, 'Contractor TBD'); A.confirmJobTeam(7);
    }, (B) => { B.jobs[1].status = 'pending'; B.saveJobs(); });   // B edits ANOTHER client entirely
    const est = EST();
    const bill = (j) => {
      try {
        const a = r.A.getVendorActuals(j, est);
        return { prepTotal: a.prepTotal, prepFee: a.prepFee,
                 dumpster: a.thirdParty.filter((l) => /Dumpster/.test(l.label)).map((l) => l.amount),
                 painter: (a.prep[0] || {}).vendorName };
      } catch (e) { return {}; }
    };
    const before = bill(r.afterA), after = bill(r.after);
    eq(before.prepTotal, 23400, 'the sheet held the confirmed $23,400 painter once A saved');
    eq(after.prepTotal, 23400, '⚠⚠ and STILL holds it after B, on the morning copy, saved another client');
    eq(after.prepFee, 7020, 'so the prep fee is 30% of the real $23,400 — it was billing $6,000 on the $20,000 estimate figure');
    eq(after.dumpster, [850], 'the $850 dumpster is still a third-party actual — it had dropped to nothing');
    eq(after.painter, 'Ace Painting', 'the painter is still named');
    ok(!!get(r.after, 'crew', 'confirmed'), 'the confirmed team is still confirmed — it had reset');
    eq(get(r.after, 'crew', 'ps', 0, 'name'), 'Anthony Graziano Jr', '…with its specialists on it');
    const other = r.srv.job(8);
    eq(get(other, 'status'), 'pending', 'and B\'s own edit to the other client landed — nothing was refused, the tie just stopped going the wrong way');
  }

  // ─────────────────────────────────────────────────────────────────────────
  group('⚠⚠ every writer the audit named, one at a time, against the stale save');
  {
    const K = 'Lp1', V = 'Lv1';
    const CASES = [
      ['_srcSetVendor via setJobVendor', null, (A) => A.setJobVendor(7, 0, 2), (j) => (j.vendorSourcing || {})[V] && j.vendorSourcing[V].vendorName === 'Junk Kings'],
      ['setJobVendorQuote', null, (A) => A.setJobVendorQuote(7, 0, '11000'), (j) => (j.vendorSourcing || {})[V] && j.vendorSourcing[V].quote === 11000],
      ['setJobVendorStatus', null, (A) => A.setJobVendorStatus(7, 0, 'Confirmed'), (j) => (j.vendorSourcing || {})[V] && j.vendorSourcing[V].status === 'Confirmed'],
      ['setPrepVendor (_srcSetVendor)', null, (A) => A.setPrepVendor(7, 0, 11), (j) => (j.prepSourcing || {})[K] && j.prepSourcing[K].vendorName === 'Ace Painting'],
      ['setPrepVendorQuote', null, (A) => A.setPrepVendorQuote(7, 0, '23400'), (j) => (j.prepSourcing || {})[K] && j.prepSourcing[K].quote === 23400],
      ['setPrepVendorStatus', null, (A) => A.setPrepVendorStatus(7, 0, 'Confirmed'), (j) => (j.prepSourcing || {})[K] && j.prepSourcing[K].status === 'Confirmed'],
      ['setCollVendor', null, (A) => A.setCollVendor(7, 'c1', 11), (j) => (j.collSourcing || {}).c1 && j.collSourcing.c1.vendorName === 'Ace Painting'],
      ['setCollFee', null, (A) => A.setCollFee(7, 'c1', '400'), (j) => (j.collSourcing || {}).c1 && j.collSourcing.c1.fee === 400],
      ['setLogisticsVendor', null, (A) => A.setLogisticsVendor(7, 'dumpster', 12), (j) => (j.logisticsSourcing || {}).dumpster && j.logisticsSourcing.dumpster.vendorName === 'Bin There Dumpsters'],
      ['setLogisticsQuote', null, (A) => A.setLogisticsQuote(7, 'dumpster', '850'), (j) => (j.logisticsSourcing || {}).dumpster && j.logisticsSourcing.dumpster.quote === 850],
      ['setLogisticsStatus', null, (A) => A.setLogisticsStatus(7, 'dumpster', 'Confirmed'), (j) => (j.logisticsSourcing || {}).dumpster && j.logisticsSourcing.dumpster.status === 'Confirmed'],
      ['addLogisticsLine', null, (A) => A.addLogisticsLine(7, 'shred'), (j) => !!((j.logisticsSourcing || {}).shred && j.logisticsSourcing.shred.added)],
      // The morning copy HAS the line; A takes it off; B's morning copy still carries it and a
      // tie would put it — and its $650 — back on the final invoice.
      ['removeLogisticsLine', { logisticsSourcing: { junk: { added: true, vendorName: 'Junk Kings', quote: 650 } } },
        (A) => A.removeLogisticsLine(7, 'junk'), (j) => !((j.logisticsSourcing || {}).junk)],
      ['setJobVendorCoordHrs', null, (A) => A.setJobVendorCoordHrs(7, 0, '3.5'), (j) => (j.vendorSourcing || {})[V] && j.vendorSourcing[V].coordHrs === 3.5],
      ['setPrepVendorCoordHrs', null, (A) => A.setPrepVendorCoordHrs(7, 0, '2'), (j) => (j.prepSourcing || {})[K] && j.prepSourcing[K].coordHrs === 2],
      ['setLogisticsCoordHrs', null, (A) => A.setLogisticsCoordHrs(7, 'dumpster', '1'), (j) => (j.logisticsSourcing || {}).dumpster && j.logisticsSourcing.dumpster.coordHrs === 1],
      ['setCrewTC', null, (A) => A.setCrewTC(7, 'Anthony Graziano'), (j) => j.crew && j.crew.tc.name === 'Anthony Graziano' && j.crew.tc.picked === true, '_crewSnap', '_crewSave', '_stampChangedKeys', '_jobTouch'],
      ['setCrewTC2', null, (A) => A.setCrewTC2(7, 'Bob Smith'), (j) => j.crew && j.crew.tc2 && j.crew.tc2.name === 'Bob Smith', '_crewSnap', '_crewSave', '_stampChangedKeys', '_jobTouch'],
      ['setCrewPS', null, (A) => A.setCrewPS(7, 0, 'Anthony Graziano Jr'), (j) => j.crew && j.crew.ps[0].name === 'Anthony Graziano Jr'],
      ['confirmJobTeam', null, (A) => { A.setCrewPS(7, 0, 'Anthony Graziano Jr'); A.setCrewPS(7, 1, 'Contractor TBD'); A.confirmJobTeam(7); },
        (j) => j.crew && j.crew.confirmed === true && j.crew.tc.locked === true, '_crewSnap', '_crewSave', '_stampChangedKeys', '_jobTouch'],
      // The morning copy has a CONFIRMED team; A re-opens it; B's tie would re-confirm it
      // under A, and hours would be logged against a team somebody had just unlocked.
      ['reviseJobTeam', { crew: { tc: { name: 'Ashley Jerome', locked: true }, tc2: { name: '', locked: false },
                                   ps: [{ name: 'Anthony Graziano Jr', locked: true }, { name: 'Contractor TBD', locked: true }],
                                   confirmed: true, confirmedBy: 'Ashley Jerome', confirmedAt: '2026-09-28T10:00:00Z' } },
        (A) => A.reviseJobTeam(7), (j) => j.crew && j.crew.confirmed === false && j.crew.ps[0].locked === false],
      // A slot named after the sign-off locks on its first hours save.
      ['lockAssignedCrew', { crew: { tc: { name: 'Ashley Jerome', locked: true }, tc2: { name: '', locked: false },
                                      ps: [{ name: 'Anthony Graziano Jr', locked: true }, { name: 'Bob Smith', locked: false }],
                                      confirmed: true, confirmedBy: 'Ashley Jerome', confirmedAt: '2026-09-28T10:00:00Z' } },
        (A) => A.lockAssignedCrew(7), (j) => j.crew && j.crew.ps[1].locked === true],
    ];
    CASES.forEach(([label, extra, act, check]) => {
      const r = twoDevices(extra, act);
      ok(holds(check, r.afterA), label + ': the edit reached the sheet');
      ok(holds(check, r.after), '⚠⚠ ' + label + ': and SURVIVED the other device\'s stale save');
      const w = onWire(r.wireA, 7) || {};
      ok(w.updatedAt > MORNING, label + ': the job went out stamped, not at the morning\'s ' + MORNING);
      const l = localJob(r.A, 7) || {};
      ok(l.updatedAt > MORNING, label + ': and this device\'s own store carries the stamp too');
      ok(r.wireA.some((b) => b.type === 'job' && b.payload.id === 7), label + ': synced as a record, the house pairing');
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  group('_saveJobEdit — stamp FIRST, then save, then sync, and a key where one applies');
  {
    const seen = [];
    const c = sandbox({ fns: ['_saveJobEdit', '_jobTouch'],
      stubs: { saveJobs: () => seen.push(['save', c.jobs[0].updatedAt]), syncJobToSheets: (j) => seen.push(['sync', j.id]) } });
    c.jobs = [{ id: 7, updatedAt: MORNING }];
    c._saveJobEdit(c.jobs[0], 'logisticsSourcing', 'dumpster');
    eq(seen.map((s) => s[0]).join('>'), 'save>sync', 'saved, then synced — in that order');
    ok(get(seen, 0, 1) > MORNING, '⚠ the job was ALREADY stamped when saveJobs ran, so localStorage and the wire agree');
    eq(get(seen, 1, 1), 7, 'and it syncs the job it stamped');
    ok(get(c.jobs[0], 'at', 'logisticsSourcing:dumpster') > MORNING, 'the key the write landed on is stamped too');
    seen.length = 0;
    c._saveJobEdit(c.jobs[0]);
    eq(seen.length, 2, 'with no key it still stamps, saves and syncs');
    seen.length = 0;
    c._saveJobEdit(null);
    eq(seen.length, 0, 'no job, nothing written');
    // A key that _jobTouch refuses (empty) must not leave the record unstamped: the helper
    // stamps the record itself, whatever the key did.
    const j2 = { id: 8, updatedAt: MORNING };
    c.jobs.push(j2);
    c._saveJobEdit(j2, 'logisticsSourcing', '');
    ok(j2.updatedAt > MORNING, 'an empty key still stamps the record — _jobTouch returns early on one');
  }

  // ─────────────────────────────────────────────────────────────────────────
  group('the sub-record stamps land under the key the write landed on');
  {
    const A = device([morningJob(), otherJob()]);
    A.setPrepVendorQuote(7, 0, '23400');
    A.setCollFee(7, 'c1', '400');
    A.addLogisticsLine(7, 'dumpster');
    A.setVendorRating(7, 11, 5);
    const at = A.jobs[0].at || {};
    ok(at['prepSourcing:Lp1'] > MORNING, 'a prep quote stamps prepSourcing under the line\'s id (Lp1), never its position');
    ok(at['collSourcing:c1'] > MORNING, 'a collection fee stamps collSourcing:<collId>');
    ok(at['logisticsSourcing:dumpster'] > MORNING, 'an added logistics line stamps its category key');
    ok(at['vendorRatings:11'] > MORNING, 'a rating stamps vendorRatings:<vendorId>');
    A.removeLogisticsLine(7, 'dumpster');
    ok(!('dumpster' in (A.jobs[0].logisticsSourcing || {})), 'the line is removed…');
    ok((A.jobs[0].at || {})['logisticsSourcing:dumpster'] > MORNING, '…and its stamp stays: a stamp with no value left behind it IS the removal');
    // P11 (2026-09-30): the crew merges by its top-level parts. A concierge change stamps crew:tc and
    // nothing else — no part it did not change, so its stale copy of the others claims nothing.
    const before = Object.keys(A.jobs[0].at || {});
    A.setCrewTC(7, 'Anthony Graziano');
    const added = Object.keys(A.jobs[0].at || {}).filter((k) => before.indexOf(k) < 0);
    eq(added, ['crew:tc'], 'a concierge change stamps crew:tc, and only that part');
  }

  // ─────────────────────────────────────────────────────────────────────────
  group('⚠ lockAssignedCrew: only a lock that happened is an edit');
  {
    const locked = { crew: { tc: { name: 'Ashley Jerome', locked: true }, tc2: { name: '', locked: false },
                             ps: [{ name: 'Anthony Graziano Jr', locked: true }, { name: 'Contractor TBD', locked: true }],
                             confirmed: true, confirmedBy: 'Ashley Jerome', confirmedAt: '2026-09-28T10:00:00Z' } };
    const D = device([morningJob(locked), otherJob()]);
    eq(D.lockAssignedCrew(7), 0, 'every named slot already locked: nothing to lock');
    eq(D.__saves.length, 0, '⚠⚠ and NOTHING is saved — this runs on every hours save');
    eq(D.__posted.length, 0, 'nothing goes on the wire');
    eq(D.jobs[0].updatedAt, MORNING, 'and the job\'s clock does not move');

    const open = clone(locked); open.crew.ps[1] = { name: 'Bob Smith', locked: false };
    const E = device([morningJob(open), otherJob()]);
    eq(E.lockAssignedCrew(7), 1, 'a slot named since the sign-off locks, and it says how many');
    eq(E.__saves.length, 1, 'that one is saved');
    ok(E.jobs[0].updatedAt > MORNING, 'stamped');
    ok(E.__posted.some((b) => b.type === 'job'), 'and synced');

    // The second concierge is a named slot like the others. The lock was split out of
    // lockAssignedCrew on 2026-09-29 (_lockCrewSlots), and every slot it locked before has to lock
    // still — the revert sweep found nothing had ever driven a named second concierge through it.
    const second = clone(locked); second.crew.tc2 = { name: 'Bob Smith', locked: false };
    const G = device([morningJob(second), otherJob()]);
    eq(G.lockAssignedCrew(7), 1, 'a second concierge named since the sign-off locks too');
    eq(get(G.jobs[0], 'crew', 'tc2', 'locked'), true, '…on the record');

    // Confirming locks the named slots AND writes the sign-off. One object, so ONE save: before the
    // lock was split from its save (_lockCrewSlots), one press of Confirm wrote the job twice.
    const signOff = clone(locked); signOff.crew.confirmed = false; delete signOff.crew.confirmedAt;
    signOff.crew.tc.locked = false; signOff.crew.ps.forEach((p) => { p.locked = false; });
    signOff.crew.tc2 = { name: 'Bob Smith', locked: false };
    const F = device([morningJob(signOff), otherJob()]);
    F.confirmJobTeam(7);
    ok(holds((j) => j.crew.confirmed && j.crew.tc.locked && j.crew.ps.every((p) => p.locked), F.jobs[0]),
      'confirming the team locks every named slot');
    eq(get(F.jobs[0], 'crew', 'tc2', 'locked'), true, '…the second concierge included');
    eq(F.__saves.length, 1, '⚠ in ONE save — the lock is not a second write of the same job');
    ok(F.jobs[0].updatedAt > MORNING, '…stamped');

    // The stale device that merely logs a day's hours (the log is its own store) must not be
    // able to write its morning copy of the job back over the desk's edit.
    const r = twoDevices(null, (A) => { A.setPrepVendorQuote(7, 0, '23400'); },
                         (B) => { B.jobs[0].crew = clone(locked.crew); B.lockAssignedCrew(7); B.saveJobs(); });
    eq(get(r.after, 'prepSourcing', 'Lp1', 'quote'), 23400, 'the desk\'s quote survives the house logging hours on a morning copy');
  }

  // ─────────────────────────────────────────────────────────────────────────
  group('⚠⚠ the other writers that saved bare: ratings, the review ask, house flags, and the rest');
  {
    const CASES = [
      ['setVendorRating', (A) => A.setVendorRating(7, 11, 4), (j) => j.vendorRatings && j.vendorRatings[11] && j.vendorRatings[11].rating === 4],
      ['setVendorRatingNote', (A) => A.setVendorRatingNote(7, 11, 'left the site spotless'),
        (j) => j.vendorRatings && j.vendorRatings[11] && j.vendorRatings[11].note === 'left the site spotless'],
      ['draftReviewRequest (the review ask)', (A) => A.draftReviewRequest(7), (j) => !!(j.reviewAsk && j.reviewAsk.draftedAt)],
      ['markReviewRequestSent', (A) => { A.jobs[0].reviewAsk = { draftedAt: '2026-09-29T10:00:00Z' }; A.markReviewRequestSent(7); },
        (j) => !!(j.reviewAsk && j.reviewAsk.sentAt)],
      ['toggleProbatePkg', (A) => A.toggleProbatePkg(7), (j) => j.probatePkgSent === true],
      ['setValBasis', (A) => A.setValBasis(7, 'Replacement Value'), (j) => j.valBasis === 'Replacement Value'],
      ['setEstateAVD', (A) => A.setEstateAVD(7, true), (j) => j.avd === true],
    ];
    CASES.forEach(([label, act, check]) => {
      const r = twoDevices(null, act);
      ok(holds(check, r.afterA), label + ': the edit reached the sheet');
      ok(holds(check, r.after), '⚠⚠ ' + label + ': and SURVIVED the other device\'s stale save');
      const l = localJob(r.A, 7) || {};
      ok(l.updatedAt > MORNING, label + ': stamped before the save, so this device\'s own store carries it');
    });

    // The payment evidence: a keyed record, so the stamp is on the payment's own key.
    const pay = { id: 1, uid: 'p-1', stage: 'deposit', amount: 12857, method: 'check', recordedAt: '2026-09-29T09:00:00Z' };
    const r = twoDevices({ payments: [pay], at: { 'payments:p-1': MORNING } }, (A) => A._attachPaymentEvidence(A.jobs[0], A.jobs[0].payments[0], {}));
    eq(get(r.afterA, 'payments', 0, 'evidence'), 'https://drive/evidence.jpg', 'the cheque photograph is filed against the payment');
    eq(get(r.after, 'payments', 0, 'evidence'), 'https://drive/evidence.jpg', '⚠ and a stale copy of the same payment (no photograph) does not win it back');
    ok(get(r.after, 'at', 'payments:p-1') > MORNING, 'because the payment\'s own stamp moved with it');
  }

  // ─────────────────────────────────────────────────────────────────────────
  group('⚠⚠ HOUSE FLAGS — an Edit Client correction survives the stale save');
  {
    const EC_FNS = ['saveClientEdit', 'courtRecordShown', 'jobOnProbateTrack', 'resolveExecutorAuth', 'ecIsProbateSvc', 'ecIsEstateSvc', 'ecIsMoveSvc',
      'docTierOf', 'docTierDef', 'docTierScope', 'docTierScopeMirror', 'svcHasDocStep', 'readHouseFlagInputs',
      'isDecedentJob', 'matterTypeOf', 'invFiduciaryMode', 'matterDef', 'saveJobs', 'syncJobToSheets', 'syncToSheets', '_jobTouch', 'sameSvcFamily', 'svcFamily', 'clientMissingFields', 'readReferralInputs', 'referralSourceKind', 'lookupReferralById', 'referralIdOf', 'houseFlagAsked', 'houseFlagsOf', 'intakeAsksHouseContents', '_stampChangedKeys'];
    const EC_VARS = ['EXECUTOR_AUTH_OPTIONS', 'SVC_LABELS', 'HOUSE_FLAGS', 'FIREARMS_PROTOCOL_DOC', 'DECEDENT_SERVICES',
      'DOC_TIERS', 'DOC_TIER_FROM_SCOPE', 'JOB_STEPS', 'MATTER_TYPES', 'DOC_SCOPES', 'REFERRAL_SOURCES', 'SVC_ORDER', 'referralDirectory'];
    const srv = server();
    srv.saveAllJobsToSheet([morningJob(), otherJob()]);
    const posted = [];
    const d = domStub({ 'ec-svc': 'downsizing', 'ec-fname': 'Tripp', 'ec-lname': 'Butler', 'ec-sqft': '', 'ec-email': 'tripp@example.com',
                        'ec-premium': 'no', 'ec-hf-firearms': true, 'ec-hfn-firearms': 'Two pistols in the bedroom safe' });
    const A = sandbox({ fns: EC_FNS, vars: EC_VARS,
      stubs: { document: d, jobs: [morningJob(), otherJob()], estimateStore: {}, SHEETS_SYNC_URL: 'https://sheets',
               postSyncBadge: (b) => posted.push(b), renderClientDashboard() {}, renderJobs() {} } });
    A.saveClientEdit(7);
    // The store this device keeps agrees with the wire: stamped BEFORE the save, not only by the
    // sync's own bump afterwards — or a reload of this device reads the correction at the morning's
    // clock, and its next whole-list save loses the tie it just won.
    const mine = JSON.parse(A.__store.havellin_jobs_v3 || '[]').find((x) => x.id === 7) || {};
    ok(mine.updatedAt > MORNING, 'saveClientEdit: stamped before the save, so this device\'s own store carries it');
    srv.land(posted.splice(0).map(clone));
    const B = device([morningJob(), otherJob()]);
    B.saveJobs();
    srv.land(B.__send());
    const j = srv.job(7);
    ok(!!get(j, 'houseFlags', 'firearms', 'on'), '⚠⚠ the firearms flag ticked in Edit Client is still on the job');
    eq(get(j, 'houseFlags', 'firearms', 'note'), 'Two pistols in the bedroom safe', '…with its note — the crew brief reads it');
  }

  // ─────────────────────────────────────────────────────────────────────────
  group('⚠⚠ the exemptions stay BARE — a write the app makes on its own must not claim the job');
  {
    // resolveJobVendor: a render-time repair of a directory row that moved. The name is the
    // identity; the row id is a cache.
    const moved = { vendorSourcing: { Lv1: { vendorId: 99, vendorName: 'Junk Kings', phone: '5615550100' } } };
    const D = device([morningJob(moved), otherJob()]);
    const v = D.resolveJobVendor(D.jobs[0].vendorSourcing.Lv1);
    eq(v && v.vendor_name, 'Junk Kings', 'the repair still finds the vendor by name');
    eq(get(D.jobs[0], 'vendorSourcing', 'Lv1', 'vendorId'), 2, '…and heals the cached row id');
    eq(D.jobs[0].updatedAt, MORNING, '⚠⚠ but the job\'s clock does NOT move — drawing a screen is not an edit');
    lacks(D.__posted.map((b) => b.type).join(','), 'job', 'and nothing is synced as a record');

    // …and that is exactly what keeps a stale device that merely LOOKED harmless.
    const r = twoDevices(null, (A) => A.setPrepVendorQuote(7, 0, '23400'),
      (B) => { B.jobs[0].vendorSourcing = clone(moved.vendorSourcing); B.resolveJobVendor(B.jobs[0].vendorSourcing.Lv1); });
    eq(get(r.after, 'prepSourcing', 'Lp1', 'quote'), 23400, '⚠⚠ the stale device\'s render-time repair did not write its morning copy over the quote');

    // _writeVendorScore: the receipt from the Vendor Directory. The rating was stamped when given.
    const R = device([morningJob({ vendorRatings: { 11: { rating: 5, name: 'Ace Painting' } } }), otherJob()]);
    R._writeVendorScore(R.jobs[0], 11);
    ok(!!get(R.jobs[0], 'vendorRatings', 11, 'writtenAt'), 'the receipt is recorded');
    eq(R.jobs[0].updatedAt, MORNING, '⚠ but a receipt does not move the job\'s clock');
    lacks(R.__posted.map((b) => b.type).join(','), 'job', 'and is not synced as a record');

    // _driveFolderFailed: a failure notice kept for the next person to open the client.
    const F = device([morningJob(), otherJob()], { console: { warn() {}, log() {} } });
    F._driveFolderFailed(F.jobs[0], 'the server refused', 'Exception: nope');
    eq(get(F.jobs[0], 'driveFolderError', 'why'), 'the server refused', 'the failure is recorded on the job');
    eq(F.jobs[0].updatedAt, MORNING, '⚠ but a failure does not claim the job');

    // fetchSubfolderIds: a cache of Drive ids, refetched whenever it is missing.
    const S = device([morningJob({ driveFolder: 'https://drive.google.com/drive/folders/abcdefghijklmnopqrstuvwxyz' }), otherJob()]);
    let got = null;
    S.fetchSubfolderIds(S.jobs[0], (okd) => { got = okd; });
    eq(got, true, 'the subfolder ids are cached');
    ok(!!S.jobs[0].driveSubfolders, '…on the job');
    eq(S.jobs[0].updatedAt, MORNING, '⚠ and caching them does not move the job\'s clock');
  }

  // ─────────────────────────────────────────────────────────────────────────
  group('THE BOUNDARY, CLOSED BY P11 — a stale device making its OWN edit no longer wins the other maps wholesale');
  {
    // Until P11 (2026-09-30) a real edit made on a morning copy took the whole job: B stamped its own
    // edit later than A's, and the sheet took B's whole record, sourcing and all. The sourcing, crew,
    // ratings, review and checklist maps now merge key by key on the stamps the writers leave (this
    // needs the backend redeploy; the harness runs the current main-sync.gs).
    const r = twoDevices(null, (A) => A.setPrepVendorQuote(7, 0, '23400'),
      (B) => B.setLogisticsQuote(7, 'junk', '650'));
    eq(get(r.after, 'prepSourcing', 'Lp1', 'quote'), 23400, '⚠⚠ FIXED (P11): A\'s quote survives B\'s own later edit on its morning copy');
    eq(get(r.after, 'logisticsSourcing', 'junk', 'quote'), 650, '…and so does B\'s own edit');
    ok(!!get(r.after, 'at', 'prepSourcing:Lp1'), '…each on its own stamp');

    // The same across maps: a team confirmed on one device and a quote typed on the other's morning copy.
    const t = twoDevices(null, (A) => { A.setCrewTC(7, 'Anthony Graziano'); },
      (B) => B.setPrepVendorQuote(7, 0, '19000'));
    eq(get(t.after, 'crew', 'tc', 'name'), 'Anthony Graziano', '⚠ a concierge picked on one device survives a quote typed on the other\'s morning copy');
    eq(get(t.after, 'prepSourcing', 'Lp1', 'quote'), 19000, '…and the quote lands too');

    // ⚠⚠ AND THE SAME DOOR USED TO OPEN WITH NOBODY PRESSING ANYTHING (found 2026-09-29, FIXED 2026-09-30,
    // P11). The DocuSign and Stripe arrival checks run when a client is opened. On a device holding the
    // morning copy they wrote checkedAt through docState, which stamped the RECORD, and synced it, so a
    // stale device merely opening a client with an outstanding envelope or payment link took the whole
    // job, A's Job Plan edits included. A check that learns nothing new is now written bare
    // (docStateBare + _saveArrivalCheck): the job's clock does not move, so the stale copy loses.
    const POLL = { agrSent: true, docState: { agreement: { sentAt: '2026-09-28',
      esign: { provider: 'docusign', envelopeId: 'env-1', status: 'sent' } } } };
    const srv = server();
    srv.saveAllJobsToSheet([morningJob(POLL), otherJob()]);
    const pa = device([morningJob(POLL), otherJob()]);
    pa.setPrepVendorQuote(7, 0, '23400');
    srv.land(pa.__send());
    eq(get(srv.job(7), 'prepSourcing', 'Lp1', 'quote'), 23400, 'A\'s quote reached the sheet');
    const aClock = get(srv.job(7), 'updatedAt');
    const pb = device([morningJob(POLL), otherJob()],
      { isAgreementSigned: () => false, recordAgreementSignature: () => '', esignArchiveSigned() {} });
    pb.applyEsignStatus(7, { status: 'sent' });      // DocuSign answers "still out" to the stale laptop
    eq(get(localJob(pb, 7), 'updatedAt'), MORNING, '⚠ the stale device\'s check does not move the job\'s clock');
    ok(!!get(localJob(pb, 7), 'docState', 'agreement', 'esign', 'checkedAt'), '…and keeps the check time on this device, which is what paces its next check');
    srv.land(pb.__send());
    const polled = srv.job(7);
    eq(get(polled, 'prepSourcing', 'Lp1', 'quote'), 23400, '⚠⚠ FIXED: the stale device\'s DocuSign check no longer takes the job — A\'s quote survives');
    eq(get(polled, 'updatedAt'), aClock, '…and the job keeps the clock A\'s edit gave it');

    // A device whose copy is CURRENT still records its check: the sheet breaks the docState tie its way.
    const pc = device([clone(srv.job(7)), otherJob()],
      { isAgreementSigned: () => false, recordAgreementSignature: () => '', esignArchiveSigned() {} });
    pc.applyEsignStatus(7, { status: 'sent' });
    srv.land(pc.__send());
    ok(!!get(srv.job(7), 'docState', 'agreement', 'esign', 'checkedAt'), 'a current device\'s check time reaches the sheet, so the other devices pace their checks by it');
    eq(get(srv.job(7), 'prepSourcing', 'Lp1', 'quote'), 23400, 'and nothing else on the job moves');
    eq(get(srv.job(7), 'updatedAt'), aClock, 'including its clock');

    // Stripe, the same: a check that finds no new payment is bare.
    const SPOLL = { docState: { 'invoice-deposit': { stripe: { linkId: 'plink_1', url: 'https://buy' } } } };
    const srv2 = server();
    srv2.saveAllJobsToSheet([morningJob(SPOLL), otherJob()]);
    const sa = device([morningJob(SPOLL), otherJob()]);
    sa.setPrepVendorQuote(7, 0, '23400');
    srv2.land(sa.__send());
    const sb = device([morningJob(SPOLL), otherJob()], { _docNotice() {}, renderJobs() {}, fmt: (n) => '$' + n,
      paymentStageLabel: () => 'deposit', isJobFunded: () => true, _photoUid: () => 'u-pi-1' });
    eq(sb.applyStripePayments(7, 'invoice-deposit', 'deposit', { payments: [] }), 0, 'Stripe answers "nothing yet" to the stale laptop');
    eq(get(localJob(sb, 7), 'updatedAt'), MORNING, '⚠ …and the job\'s clock does not move');
    srv2.land(sb.__send());
    eq(get(srv2.job(7), 'prepSourcing', 'Lp1', 'quote'), 23400, '⚠⚠ FIXED: the stale device\'s Stripe check no longer takes the job');
    // A payment that DOES land is recorded the way a hand entry is: its own key stamped, the clock moved.
    const sc = device([clone(srv2.job(7)), otherJob()], { _docNotice() {}, renderJobs() {}, fmt: (n) => '$' + n,
      paymentStageLabel: () => 'deposit', isJobFunded: () => true, _photoUid: () => 'u-pi-1' });
    eq(sc.applyStripePayments(7, 'invoice-deposit', 'deposit',
      { payments: [{ piId: 'pi_1', status: 'succeeded', amount: 4575, createdAt: '2026-09-29T15:00:00Z' }] }), 1, 'a settled payment is recorded');
    srv2.land(sc.__send());
    eq((get(srv2.job(7), 'payments') || []).map((x) => x.stripePiId), ['pi_1'], 'it reaches the sheet');
    ok(!!get(srv2.job(7), 'at', 'payments:u-pi-1'), 'stamped on its own key');
    ok(get(srv2.job(7), 'updatedAt') > get(srv2.job(7), 'at', 'prepSourcing:Lp1') - 1, 'and with the job\'s clock moved, so its deposit mirror travels');
    eq(get(srv2.job(7), 'depositReceived'), true, 'the deposit mirror is on the sheet');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // THE NET. Every live `saveJobs()` call is a save of the job store; unless it is one of the
  // named exemptions, the object it saved must be STAMPED before the call (`.updatedAt =
  // Date.now()`, `_jobTouch(x,`, or `docState(x,`, which touches) and SYNCED after it
  // (`syncJobToSheets(x)`), and it must be the SAME object both times — a stamp on a change
  // order beside an unstamped job is not a stamp on the job. This is the rule, not today's
  // names: a writer added tomorrow that calls saveJobs() bare fails here.
  // ─────────────────────────────────────────────────────────────────────────
  group('⚠⚠ THE NET — no job is saved without being stamped and synced, except the named exemptions');
  {
    const EXEMPT = {
      resolveJobVendor: 'render-time self-heal of a moved directory row — the name is the identity, the id a cache',
      _writeVendorScore: 'the Vendor Directory\'s receipt (writtenAt / writeErr) — the rating was stamped when it was given',
      fetchSubfolderIds: 'a cache of Drive subfolder ids, refetched whenever it is missing',
      _driveFolderFailed: 'a failure notice kept for the next person to open the client; the retry is a person\'s press',
      hardDeleteJob: 'not an edit — the job leaves the array, and the deletion rides deleteJob and the sheet\'s ledger',
      _saveArrivalCheck: 'a DocuSign or Stripe check that learned nothing new — a stamped save let a stale device that merely opened a client take the whole job (P11)',
    };
    const src = source();

    // Mask strings, comments and regex literals inside a span (same length, so positions hold).
    // The scanner is matchBrace's; a line-based stripper cannot tell `//` in a URL from a comment.
    const REOK = new Set(['return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'case', 'do', 'else', 'yield', 'await', 'throw']);
    function mask(a, b) {
      const out = src.slice(a, b).split('');
      let i = a, prev = '', word = '';
      const blank = (x, y) => { for (let k = x; k < y && k < b; k++) if (out[k - a] !== '\n') out[k - a] = ' '; };
      while (i < b) {
        const c = src[i];
        if (c === '/' && src[i + 1] === '/') { const e = src.indexOf('\n', i); blank(i, e < 0 ? b : e); i = e < 0 ? b : e; continue; }
        if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); blank(i, e + 2); i = e + 2; continue; }
        if (c === '"' || c === "'" || c === '`') {
          let j = i + 1;
          while (j < b) { if (src[j] === '\\') { j += 2; continue; } if (src[j] === c) { j++; break; } j++; }
          blank(i + 1, j - 1); i = j; prev = c; word = ''; continue;
        }
        if (c === '/' && (REOK.has(word) || (!')]}'.includes(prev) && !/[A-Za-z0-9_$]/.test(prev)))) {
          let j = i + 1, inClass = false, closed = false;
          while (j < b) {
            if (src[j] === '\\') { j += 2; continue; }
            if (src[j] === '[') inClass = true; else if (src[j] === ']') inClass = false;
            else if (src[j] === '/' && !inClass) { closed = true; j++; break; }
            else if (src[j] === '\n') break;
            j++;
          }
          if (closed) { blank(i + 1, j - 1); i = j; prev = '/'; word = ''; continue; }
        }
        if (/[A-Za-z0-9_$]/.test(c)) word += c; else if (!/\s/.test(c)) word = '';
        if (!/\s/.test(c)) prev = c;
        i++;
      }
      return out.join('');
    }

    // Top-level functions (column 0), masked; every function token inside them, named or not.
    const tops = [];
    const topRe = /^function\s+([A-Za-z0-9_$]+)\s*\(/gm;
    let m;
    while ((m = topRe.exec(src))) {
      const open = src.indexOf('{', topRe.lastIndex);
      const close = matchBrace(src, open);
      if (close > open) tops.push({ name: m[1], start: m.index, close });
    }
    ok(tops.length > 1000, 'sanity: the scan found the app\'s top-level functions (' + tops.length + ')');

    const calls = [];     // { fn, named, at, before, after }
    tops.forEach((t) => {
      const code = mask(t.start, t.close + 1);
      const fnTok = /\bfunction\b\s*([A-Za-z0-9_$]*)\s*\(/g;
      const spans = [];
      let f;
      while ((f = fnTok.exec(code))) {
        const open = code.indexOf('{', fnTok.lastIndex);
        const close = matchBrace(src, t.start + open) - t.start;
        if (close > open) spans.push({ name: f[1], open, close });
      }
      const callRe = /\bsaveJobs\(\)/g;
      let c;
      while ((c = callRe.exec(code))) {
        if (code.slice(c.index - 9, c.index) === 'function ') continue;
        const inside = spans.filter((s) => s.open < c.index && s.close > c.index).sort((x, y) => (x.close - x.open) - (y.close - y.open));
        const innermost = inside[0];
        const named = (inside.find((s) => s.name) || {}).name || t.name;
        if (!innermost) continue;
        calls.push({ fn: innermost.name || '(anonymous in ' + named + ')', named,
          before: code.slice(innermost.open, c.index), after: code.slice(c.index, innermost.close) });
      }
    });
    // Cross-check the count against a plain scan of the non-comment source, so a masking bug
    // cannot quietly lose a call and pass on the ones left.
    const plain = src.split('\n').reduce((n, line) => {
      const code = line.replace(/\/\/.*$/, '');
      return n + (code.match(/\bsaveJobs\(\)/g) || []).length - (/function saveJobs\(\)/.test(code) ? 1 : 0);
    }, 0);
    eq(calls.length, plain, 'sanity: every live saveJobs() call in the file is inspected (' + calls.length + ')');
    // A vacuity guard, not the count: the plain scan above is the cross-check, and this only stops
    // both scans breaking together and agreeing on nothing. (46 when this was written; 45 once the
    // H3/M8 merge deleted the dead cycleStatus. A floor pinned at today's figure fails the next
    // honest deletion.)
    ok(calls.length >= 40, 'sanity: and there are as many as there should be');

    const RECV = '([A-Za-z_$][\\w$]*(?:\\.[A-Za-z_$][\\w$]*)*)';
    const receivers = (text, re) => { const out = new Set(); let x; const g = new RegExp(re, 'g'); while ((x = g.exec(text))) out.add(x[1]); return out; };
    const bad = [];
    calls.forEach((c) => {
      if (EXEMPT[c.named]) return;
      const stamped = new Set([
        ...receivers(c.before, RECV + '\\.updatedAt\\s*=\\s*Date\\.now\\(\\)'),
        ...receivers(c.before, '\\b_jobTouch\\(\\s*' + RECV + '\\s*,'),
        ...receivers(c.before, '(?<![\\w$.])docState\\(\\s*' + RECV + '\\s*,'),
      ]);
      const synced = receivers(c.after, '\\bsyncJobToSheets\\(\\s*' + RECV + '\\s*\\)');
      const both = [...stamped].filter((x) => synced.has(x));
      if (!both.length) bad.push(c.named + (c.fn !== c.named ? ' › ' + c.fn : '') + ' (stamped: ' + ([...stamped].join('/') || 'nothing') + '; synced: ' + ([...synced].join('/') || 'nothing') + ')');
    });
    eq(bad, [], '⚠⚠ every non-exempt saveJobs() saves a job that was stamped before it and synced after it');

    // The exemptions cannot go stale, and cannot quietly start claiming the job.
    Object.keys(EXEMPT).forEach((name) => {
      const t = tops.find((x) => x.name === name);
      ok(!!t, 'exemption ' + name + ' names a real function');
      if (!t) return;
      const code = mask(t.start, t.close + 1);
      ok(/\bsaveJobs\(\)/.test(code), 'exemption ' + name + ' still calls saveJobs() — or it comes off this list');
      ok(!/\.updatedAt\s*=|\b_jobTouch\(|(?<![\w$.])docState\(|\bsyncJobToSheets\(|\b_saveJobEdit\(|\b_crewSave\(/.test(code),
         '⚠ exemption ' + name + ' stays BARE — ' + EXEMPT[name]);
    });

    // The writers the audit named reach the stamp through the one helper, never a bare save.
    const NAMED = ['_srcSetVendor', 'setJobVendorQuote', 'setJobVendorStatus', 'setPrepVendorQuote', 'setPrepVendorStatus',
      'setCollVendor', 'setCollFee', 'setLogisticsVendor', 'setLogisticsQuote', 'setLogisticsStatus', 'addLogisticsLine',
      'removeLogisticsLine', 'setJobVendorCoordHrs', 'setPrepVendorCoordHrs', 'setLogisticsCoordHrs',
      'setCrewTC', 'setCrewTC2', 'setCrewPS', 'confirmJobTeam', 'reviseJobTeam', 'lockAssignedCrew'];
    NAMED.forEach((name) => {
      const t = tops.find((x) => x.name === name);
      const code = t ? mask(t.start, t.close + 1) : '';
      ok(/\b_saveJobEdit\(|\b_crewSave\(/.test(code) && !/\bsaveJobs\(\)/.test(code), name + ' saves through _saveJobEdit, never a bare saveJobs()');
    });
    ['setJobVendor', 'setPrepVendor'].forEach((name) => {
      const t = tops.find((x) => x.name === name);
      ok(!!t && /\b_srcSetVendor\(/.test(mask(t.start, t.close + 1)), name + ' writes through _srcSetVendor');
    });
  }
};
