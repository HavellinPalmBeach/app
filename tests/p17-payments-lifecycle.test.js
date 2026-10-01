'use strict';
// P17 · W2, payments and the lifecycle (2026-10-01). Anthony's answers 2, 3, 7, 8 and 12 of 2026-10-01.
//
//   2   A deposit voided on an active job: "flag it on the timeline (a red/blocked step 'Deposit voided: record the
//       replacement payment' until one is recorded); the job stays active; nothing rewinds." depositVoidFlag reads the
//       payments alone; the timeline's deposit row blocks on it, with its fix on screen; the void dialog says so first.
//   3   Payments stay void + re-record: no edit, no un-void. Decided, nothing to build. Held here: no live line writes an
//       existing payment's amount or takes a void back, and the documents say so in all four files.
//   7   An hourly walkaway: "refund the excess. Keep the deposit plus the work done (hours and materials); show and record
//       any refund due above that." walkawaySettlement (earned = the deposit or the work done, whichever is more; the work
//       done read off the final invoice), shown in the close-out dialog and on the Deposit Retained card; saveRefund records
//       the refund as its own record on the payments list; the retained figure, Win / Loss and the rail net it.
//   8   A signing packet handed over in person: "Handed over in person" beside the send routes, recording the send on the
//       document record (dashMarkAgreementSent), so the timeline moves to awaiting the signature.
//   12  Power of Attorney is off the representative roles; a record that carries it keeps it, shown as recorded.
//
// Every sandbox is the ROOT's own call graph, derived from the source (comments and string literals stripped, the way
// p14-small-backlog.test.js does it), with the job state and the screen's boundaries supplied — never the rule under test.
// That also keeps this file whole when another branch gives one of these functions a new helper.

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { sandbox, source, fn, decl, domStub, matchBrace, driveCalcAll } = require('./harness');

const SRC = source();
const ALL_FNS = new Set((SRC.match(/(^|\n)function\s+([A-Za-z0-9_$]+)\s*\(/g) || []).map((s) => s.replace(/^\n?function\s+/, '').replace(/\s*\($/, '')));
const ALL_VARS = new Set((SRC.match(/(^|\n)var\s+([A-Za-z0-9_$]+)\s*=/g) || []).map((s) => s.replace(/^\n?var\s+/, '').replace(/\s*=$/, '')));
const codeOnly = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).map((l) => l.replace(/\s\/\/\s.*$/, '')).join('\n')
  .replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, "''");
const live = (t) => String(t).split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
const text = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#8212;|&mdash;/g, '—').replace(/\s+/g, ' ').trim();

// The functions and top-level vars `roots` reach; `stop` names what the test supplies (state, or a screen boundary).
function closure(roots, stop) {
  const stopSet = new Set(stop || []);
  const fns = new Set(), vars = new Set();
  const queue = roots.map((r) => ['f', r]);
  while (queue.length) {
    const [k, name] = queue.shift();
    if (stopSet.has(name)) continue;
    let body;
    if (k === 'f') { if (fns.has(name)) continue; fns.add(name); try { body = codeOnly(fn(name)); } catch (e) { continue; } }
    else { if (vars.has(name)) continue; vars.add(name); try { body = codeOnly(decl(name)); } catch (e) { continue; } }
    for (const m of body.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)) if (ALL_FNS.has(m[1]) && !stopSet.has(m[1])) queue.push(['f', m[1]]);
    for (const m of body.matchAll(/[(,]\s*([A-Za-z_$][\w$]*)\s*[,)]/g)) if (ALL_FNS.has(m[1]) && !stopSet.has(m[1])) queue.push(['f', m[1]]);
    for (const m of body.matchAll(/\b([A-Za-z_$][\w$]*)\b/g)) if (ALL_VARS.has(m[1]) && !stopSet.has(m[1])) queue.push(['v', m[1]]);
  }
  return { fns: [...fns], vars: [...vars] };
}

// A fixed clock: 2pm Eastern on 1 October 2026. `new Date()` with no argument is the pinned instant.
const realDate = Date;
const NOW = realDate.parse('2026-10-01T18:00:00Z');
function clockAt(ms) {
  function Fake(...a) {
    if (!new.target) return new realDate(ms).toString();
    return a.length ? new realDate(...a) : new realDate(ms);
  }
  Fake.prototype = realDate.prototype;
  Fake.now = () => ms; Fake.parse = realDate.parse; Fake.UTC = realDate.UTC;
  return Fake;
}
function inZone(body) {
  const prev = process.env.TZ;
  process.env.TZ = 'America/New_York';
  try { return body(); } finally { process.env.TZ = prev; }
}

// STATE the tests hand in (a lifted `var jobs = []` would overwrite the stub), and the BOUNDARIES of the screen: the save,
// the sync, the redraw, the notices and the tab plumbing. Each is recorded so a test can read what happened.
const STATE = ['jobs', 'estimateStore', 'jobLogs', 'changeOrders', 'contractors', 'currentEstimate', 'currentInvStage',
  'jobPlanStore', 'vendorDirectory', 'vendors', 'prepItems', 'currentAgrJobId', '_dashNotice', '_dashboardJobId',
  '_gmailUserEmail', '_wonJobId', 'closeoutJobId', '_sigJobId', 'referralDirectory', 'approvedBy'];
const BOUNDS = ['saveJobs', 'syncJobToSheets', 'renderJobs', '_dashRedraw', 'dashNotice', 'showFB', '_dashFbTarget',
  'updateAgrUI', 'loadInvoice', '_attachPaymentEvidence', 'showSyncBadge', 'postSyncBadge', 'renderClientDashboard',
  '_primeAgreementFor', '_agrJob', 'exportSigningPacketToDrive', '_docNotice', 'renderWinLoss', '_jobBandHost'];

function box(roots, opts) {
  const o = opts || {};
  const job = o.job;
  const doc = o.doc || domStub(o.seed || {});
  const seen = { saved: 0, synced: 0, redrawn: 0, notices: [], fb: [], confirms: [], timeouts: 0 };
  const c = closure(roots, STATE.concat(BOUNDS, o.stop || []));
  const ctx = sandbox({
    fns: c.fns, vars: c.vars,
    stubs: Object.assign({
      Date: clockAt(NOW), document: doc, jobs: job ? [job] : [], estimateStore: o.estimateStore || {},
      jobLogs: o.jobLogs || {}, changeOrders: [], contractors: [], currentEstimate: null, currentInvStage: 'final',
      jobPlanStore: {}, vendorDirectory: [], vendors: [], prepItems: [], currentAgrJobId: job ? job.id : 0,
      _dashNotice: null, _dashboardJobId: job ? job.id : 0, _gmailUserEmail: '', referralDirectory: [], approvedBy: '',
      _wonJobId: 0, closeoutJobId: job ? job.id : 0, _sigJobId: null,
      confirm: (m) => { seen.confirms.push(String(m)); return o.decline ? false : true; },
      setTimeout: () => { seen.timeouts++; return 0; }, clearTimeout() {},
      saveJobs: () => { seen.saved++; }, syncJobToSheets: (j) => { seen.synced++; seen.lastSynced = JSON.parse(JSON.stringify(j)); },
      renderJobs() {}, updateAgrUI() {}, loadInvoice() {}, _attachPaymentEvidence() {}, showSyncBadge() {}, postSyncBadge() {},
      renderClientDashboard() {}, renderWinLoss() {}, exportSigningPacketToDrive() {}, _jobBandHost: () => null,
      _dashRedraw: () => { seen.redrawn++; return true; },
      dashNotice: (type, msg) => seen.notices.push({ type, msg: String(msg) }),
      _docNotice: (type, msg) => seen.notices.push({ type, msg: String(msg) }),
      showFB: (id, kind, msg) => seen.fb.push({ id, kind, msg: String(msg) }), _dashFbTarget: (x) => x,
      _primeAgreementFor: () => true, _agrJob: () => job,
    }, o.stubs || {}),
  });
  return { ctx, job, doc, seen };
}

// The estate the rail tests have always used: $24,100, so the deposit is $12,050 and the midpoint $6,025.
const TOTAL = 24100;
const REC = () => ({ approved: true, approvedBy: 'Anthony Graziano', approvedAt: 'September 18, 2026',
  estimate: { havellinTotal: TOTAL, rooms: [{ name: 'Kitchen', vol: 3, cplx: 3 }], tcRate: 150, psRate: 100, fixedPrice: false } });
const SENT = (when) => ({ draftedAt: when, draftedBy: 'Anthony Graziano', sentAt: when, sentBy: 'Anthony Graziano', provider: 'gmail' });
const CHEQUE = () => ({ id: 1, uid: 'u-dep', stage: 'deposit', amount: 12050, method: 'check', reference: '#1042',
  payer: 'Pressly Family Trust', receivedOn: '2026-09-21', clearedOn: null, recordedBy: 'Anthony Graziano' });
// A job signed, invoiced, funded by one cheque and ACTIVE since 22 September, with the stamps activation leaves.
function activeJob(over) {
  return Object.assign({
    id: 7, hvlId: 'HVL-0007', name: 'Butler', fname: 'Tripp', svc: 'cleanout', status: 'active', created: 'Sep 8, 2026',
    walkthrough: '2020-01-01', approved: true, estimateSentDate: 'September 18, 2026', won: true, wonAt: '2026-09-19',
    wonBy: 'Anthony Graziano', wonMethod: 'call', agrApproved: true, agrApprovedBy: 'Anthony Graziano', agrSent: true,
    agrSentAt: 'September 19, 2026', agrSigned: true, agrSignedAt: '2026-09-20', executor: 'Tripp Butler',
    executorEmail: 'tripp@example.com', executorAuth: 'received', matterType: 'probate', tc: 'Ashley Jerome',
    docState: { estimate: SENT('2026-09-18T14:00:00.000Z'), agreement: SENT('2026-09-19T14:00:00.000Z'),
      'invoice:deposit': SENT('2026-09-20T14:00:00.000Z') },
    payments: [CHEQUE()], depositReceived: true, depositReceivedAt: '2026-09-21',
    activatedOn: '2026-09-22', activatedBy: 'Ashley Jerome', updatedAt: 1,
  }, over || {});
}
const byKey = (rows, k) => rows.filter((r) => r.key === k)[0] || {};
const lit = (rows) => rows.filter((r) => r.state === 'current' || r.state === 'blocked');

// ─── THE SHEET'S JOB MERGE (main-sync.gs), for the refund's cross-device test ─────────────────────────────────────────
const GS = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'main-sync.gs'), 'utf8');
function gsFn(name) {
  const re = new RegExp('(^|\\n)function\\s+' + name + '\\s*\\(', 'g');
  const m = re.exec(GS); if (!m) throw new Error('not in main-sync.gs: ' + name);
  const start = m.index + (m[1] ? m[1].length : 0), open = GS.indexOf('{', re.lastIndex);
  return GS.slice(start, matchBrace(GS, open) + 1);
}
function gsVar(name) {
  const m = GS.match(new RegExp('(^|\\n)(var\\s+' + name + '\\s*=[\\s\\S]*?;)\\n')); if (!m) throw new Error('not in main-sync.gs: var ' + name);
  return m[2];
}

module.exports = function ({ group, ok, eq, has, lacks }) {

  // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  // ITEM 2 — A DEPOSIT VOIDED ON AN ACTIVE JOB
  // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  const TL = ['jobTimeline', 'jobTimelineNext', 'jobTimelineActions', 'jtBandHtml', 'jtRailHtml', 'depositVoidFlag',
    'openVoidPayment', 'confirmVoidPayment', 'paymentVoidEffect', 'saveDeposit', 'onDepStageChange', 'jobPaymentsListHtml'];

  group('2 · voided on an active job: the deposit step blocks, on screen, and nothing rewinds');
  {
    const job = activeJob();
    const b = box(TL, { job, estimateStore: { 7: REC() } });
    const C = b.ctx;
    const rows0 = inZone(() => C.jobTimeline(job, C.estimateStore[7], [], []));
    ok(byKey(rows0, 'deposit_received').done && byKey(rows0, 'job_active').done, 'fixture: funded and active before the void');
    eq((C.jobTimelineNext(rows0) || {}).key, 'midpoint_invoiced', 'fixture: the light is on the midpoint, past the deposit');

    // The void, through its own dialog: the effect line names what the timeline will show BEFORE anything is written.
    inZone(() => C.openVoidPayment(7, 'u-dep'));
    const eff = text(b.doc.getElementById('pv-effect').innerHTML);
    has(eff, 'The timeline will show “Deposit voided: record the replacement payment” until a payment that counts restores the deposit',
      '⚠⚠ the dialog says what the timeline will show, before the void');
    has(eff, 'nothing else on the job is undone', 'and that nothing else is undone');
    has(eff, 'The job is no longer funded', 'beside the consequence P16 already named');
    b.doc.__seed('pv-reason', 'Cheque returned unpaid');   // typed into the open dialog
    inZone(() => C.confirmVoidPayment());
    ok(!!job.payments[0].voidedAt, 'the cheque is void, and stays on the job');

    const rows = inZone(() => C.jobTimeline(job, C.estimateStore[7], [], []));
    const dep = byKey(rows, 'deposit_received');
    eq(dep.state, 'blocked', '⚠⚠ the deposit step is BLOCKED (red), not a fresh "Collect the deposit"');
    eq(dep.todo, 'Deposit voided: record the replacement payment', 'and the band says Anthony\'s words');
    has(dep.blockedWhy, '$12,050 personal cheque on the deposit', 'the reason names the payment');
    has(dep.blockedWhy, 'was voided on Oct 1, 2026: Cheque returned unpaid', 'when it was voided and why');
    has(dep.blockedWhy, 'Hours cannot be logged until the deposit is recorded again', 'and what it stops');
    has(dep.blockedFix, 'Record payment when the replacement arrives', '⚠ the fix is on screen (a tooltip is unreachable on an iPad)');
    has(dep.blockedFix, 'Nothing else on the job is undone', 'and says nothing rewinds');
    eq(lit(rows).map((r) => r.key), ['deposit_received'], 'exactly one row is lit, and it is the deposit');
    eq((C.jobTimelineNext(rows) || {}).key, 'deposit_received', 'jobTimelineNext points at it');
    // Nothing rewinds: the job stays active, its activation stamps stay, and the rail still reads it active.
    eq([job.status, job.activatedOn, job.activatedBy], ['active', '2026-09-22', 'Ashley Jerome'], '⚠⚠ the job stays active; activatedOn is untouched');
    const act = byKey(rows, 'job_active');
    ok(act.done && act.at === '2026-09-22' && act.by === 'Ashley Jerome', 'Job active is still done, with its day and its concierge');
    ok(byKey(rows, 'agreement_signed').done && byKey(rows, 'deposit_invoiced').done, 'and every earlier step is still done');

    // The band: red, the step, the reason, the fix, and the one button that records the replacement.
    const band = inZone(() => C.jtBandHtml(job, C.estimateStore[7], rows, C.jobTimelineNext(rows)).html);
    has(band, 'jt-next-blk', 'the band is painted as a blocker');
    has(band, '&#9888; Blocked', 'and says Blocked');
    has(band, 'Deposit voided: record the replacement payment', 'with the step');
    has(band, 'jt-next-fix', 'and the fix on its own line');
    has(band, "dashRecordPayment(7,'deposit')", 'the one filled button records the replacement');
    has(band, 'activateOrCycle(7)', 'and Close job is still beside it (the job is active)');
    const rail = inZone(() => C.jtRailHtml(rows));
    has(rail, 'jt-row jt-blk', 'the rail paints the deposit row red too');

    // The replacement: a wire through the real recorder. The flag clears and the light goes back to where the job is.
    b.doc.__seed('dep-stage', 'deposit'); b.doc.__seed('dep-amount', '12050'); b.doc.__seed('dep-date', '2026-10-01');
    b.doc.__seed('dep-method', 'wire'); b.doc.__seed('dep-reference', 'FW-88'); b.doc.__seed('dep-payer', 'Pressly Family Trust');
    inZone(() => C.saveDeposit());
    eq(job.payments.length, 2, 'the replacement is recorded beside the void');
    eq(C.depositVoidFlag(job), null, '⚠⚠ a payment that counts restores the deposit, and the flag clears');
    const rows2 = inZone(() => C.jobTimeline(job, C.estimateStore[7], [], []));
    ok(byKey(rows2, 'deposit_received').done, 'the deposit step is done again');
    eq((C.jobTimelineNext(rows2) || {}).key, 'midpoint_invoiced', 'and the light is back on the midpoint');
    eq(job.depositReceived, true, 'the mirror the activation gate reads is true again');
  }

  group('2 · derived from the payments, never from job.status or the activation stamp');
  {
    const voided = (o) => Object.assign(CHEQUE(), { voidedAt: '2026-10-01T15:00:00.000Z', voidedBy: 'Anthony Graziano', voidReason: 'returned unpaid' }, o || {});
    const flagOf = (job) => box(['depositVoidFlag'], { job, estimateStore: { 7: REC() } }).ctx.depositVoidFlag(job);
    const rowsOf = (job) => { const b = box(['jobTimeline', 'jobTimelineNext'], { job, estimateStore: { 7: REC() } });
      return inZone(() => b.ctx.jobTimeline(job, b.ctx.estimateStore[7], [], [])); };

    ok(!!flagOf(activeJob({ payments: [voided()] })), 'an active job whose deposit cheque was voided is flagged');
    // ⚠ The status is not the question: an estimate event writing `approved`, or a job not yet activated, reads the same.
    ok(!!flagOf(activeJob({ payments: [voided()], status: 'approved' })), '⚠ the same payments under another status are flagged the same');
    ok(!!flagOf(activeJob({ payments: [voided()], status: 'won', activatedOn: '', activatedBy: '' })),
      'a void that un-funded a deposit before activation is the same fact, and flagged');
    eq(byKey(rowsOf(activeJob({ payments: [voided()], status: 'won', activatedOn: '' })), 'deposit_received').state, 'blocked',
      'and its deposit step blocks too');
    // A payment typed twice and voided leaves the deposit funded: nothing to flag.
    const dup = activeJob({ payments: [CHEQUE(), voided({ id: 2, uid: 'u-dup' })] });
    eq(flagOf(dup), null, 'a duplicate voided while the deposit stays whole raises nothing');
    ok(byKey(rowsOf(dup), 'deposit_received').done, 'and the deposit step stays done');
    // A deposit that was never whole is "part paid", not this.
    const short = activeJob({ status: 'won', activatedOn: '', payments: [voided({ amount: 5000 })] });
    eq(flagOf(short), null, 'a short cheque voided, the deposit never whole, raises nothing');
    const sr = byKey(rowsOf(short), 'deposit_received');
    eq([sr.state, sr.todo], ['current', 'Collect the deposit'], 'its step is the ordinary one');
    eq(flagOf(activeJob({ payments: [] })), null, 'no void, no flag (an unfunded job with nothing voided)');
    // A partial replacement keeps the flag, and the reason says how much is in.
    const part = activeJob({ payments: [voided(), Object.assign(CHEQUE(), { id: 2, uid: 'u-part', amount: 6000, method: 'wire' })] });
    const pf = inZone(() => flagOf(part));
    ok(!!pf, 'a replacement short of the deposit keeps the flag');
    has(pf && pf.why, '$6,000 of the $12,050 deposit is recorded.', 'and the reason says what is in');
    has(pf && pf.why, 'The $12,050 personal cheque on the deposit', '⚠ it names the voided cheque, never the replacement beside it');
    lacks(pf && pf.why, 'wire transfer', 'and not the wire that is still live');
    // ⚠ The flag reads, it never writes: the voided record keeps its void after the what-if.
    const v = activeJob({ payments: [voided()] });
    flagOf(v);
    ok(!!v.payments[0].voidedAt, '⚠ asking the flag never takes the void back (its what-if is a copy)');
    // Where an earlier step holds the light — a deposit invoice never recorded as sent — the rail still names the void.
    const unsent = activeJob({ payments: [voided()] }); delete unsent.docState['invoice:deposit'];
    const ur = rowsOf(unsent);
    eq((lit(ur)[0] || {}).key, 'deposit_invoiced', 'fixture: the light is on the unsent deposit invoice');
    eq(byKey(ur, 'deposit_received').sub, 'Deposit voided: record the replacement payment', 'the deposit row\'s own line names the void');
  }

  group('2 · the void dialog names the timeline only when the void would raise it');
  {
    const effectOf = (job, uid) => { const b = box(['paymentVoidEffect', '_jobPaymentByKey'], { job, estimateStore: { 7: REC() } });
      return inZone(() => b.ctx.paymentVoidEffect(job, b.ctx._jobPaymentByKey(job, uid))); };
    has(effectOf(activeJob(), 'u-dep'), '“Deposit voided: record the replacement payment”', 'voiding the funding cheque: named');
    const dup = activeJob({ payments: [CHEQUE(), Object.assign(CHEQUE(), { id: 2, uid: 'u-dup' })] });
    lacks(effectOf(dup, 'u-dup'), 'Deposit voided', 'voiding a duplicate the deposit does not need: not named');
    const mid = activeJob({ payments: [CHEQUE(), { id: 2, uid: 'u-mid', stage: 'midpoint', amount: 6025, method: 'check', receivedOn: '2026-09-30' }] });
    lacks(effectOf(mid, 'u-mid'), 'Deposit voided', 'voiding a midpoint cheque: not named');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  // ITEM 3 — VOID + RE-RECORD, DECIDED
  // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  group('3 · a recorded payment is never edited and a void is never taken back (decided: void, then record again)');
  {
    const lines = SRC.split('\n').filter((l) => !l.trim().startsWith('//'));
    const unvoid = lines.filter((l) => /\.voidedAt\s*=\s*(null|''|undefined|false)/.test(l) || /delete\s+[A-Za-z_$.]+\.voidedAt/.test(l));
    eq(unvoid.map((l) => l.trim().slice(0, 80)), [], 'no live line clears a void on a record (the what-ifs copy with Object.assign)');
    const amountWriters = lines.filter((l) => /\b(p|x|pay|payment|hand)\.amount\s*=[^=]/.test(l));
    eq(amountWriters.map((l) => l.trim().slice(0, 80)), [], 'and no live line rewrites a recorded payment\'s amount');
    const DOC = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
    ['manual.html', 'MANUAL.md', 'concierge-guide.html', 'CONCIERGE_GUIDE.md'].forEach((f) => {
      has(DOC(f), 'a recorded payment is never edited', f + ' says a recorded payment is never edited');
      has(DOC(f), 'decided with Anthony, 2026-10-01', f + ' says it is decided');
      has(DOC(f), 'void it with the reason and record it again', f + ' says how to correct one');
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  // ITEM 7 — AN HOURLY WALKAWAY: WHAT IT EARNED, AND THE REFUND
  // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  // The estimate is the engine's own (driveCalcAll), saved the way Build Estimate saves it; the deposit is the job's real
  // target; the work done comes off the real final invoice from the logged hours. Nothing below is worked out by hand.
  const ENGINE = driveCalcAll({ svc: 'cleanout', sqft: 3500, rooms: ['Kitchen', 'Living Room', 'Primary Suite', 'Garage (2-car)'] }).est;
  const EST = JSON.parse(JSON.stringify(ENGINE));
  const FIXED_EST = Object.assign(JSON.parse(JSON.stringify(ENGINE)), { fixedPrice: true });
  const HAV = EST.havellinTotal;
  const logsFor = (share) => [{ id: 1, date: '2026-09-25', activity: 'clearance', members: [
    { name: 'Ashley Jerome', role: 'TC', hours: Math.round((Number(EST.totTC) || 0) * share) },
    { name: 'Crew A', role: 'PS', hours: Math.round((Number(EST.totPS) || 0) * share) }] }];
  const WK = ['walkawaySettlement', 'walkawaySettlementHtml', 'refundBlocker', 'openRefundModal', 'saveRefund', 'closeRefundModal',
    'invoiceHtml', 'openCloseoutModal', 'confirmMarkLost', 'closeoutRetainedTotal', 'jobTimeline', 'jobPaymentsListHtml',
    'openVoidPayment', 'confirmVoidPayment', 'paymentVoidEffect', 'markPaymentCleared', 'winLossFigures', 'paymentSplit',
    'depositTargetFor', 'refundMethodLabel'];
  function walker(opts) {
    const o = opts || {};
    const est = o.est || EST;
    const job = activeJob(Object.assign({ payments: [] }, o.job || {}));
    const doc = domStub(o.seed || {});
    const btn = { textContent: '' };
    doc.querySelector = (q) => (q === '#closeout-modal button[onclick="confirmMarkLost()"]' ? btn : null);
    const b = box(WK, { job, doc, decline: o.decline,
      estimateStore: o.noEstimate ? {} : { 7: { approved: true, approvedBy: 'Anthony Graziano', estimate: est } },
      jobLogs: { 7: o.logs || [] } });
    const C = b.ctx;
    // The payments a walkaway made: the real deposit target, and the real midpoint share, as the invoices asked for them.
    if (!o.job || !o.job.payments) {
      const dep = C.depositTargetFor(job), mid = C.paymentSplit(HAV).midpoint;
      job.payments = [{ id: 1, uid: 'u-dep', stage: 'deposit', amount: dep, method: 'wire', receivedOn: '2026-09-20', clearedOn: '2026-09-20' }]
        .concat(o.midpoint === false ? [] : [{ id: 2, uid: 'u-mid', stage: 'midpoint', amount: mid, method: 'check', receivedOn: '2026-09-28', clearedOn: null }]);
    }
    return Object.assign(b, { btn, C });
  }
  const round2 = (v) => Math.round(v * 100) / 100;
  const finalTotalOnPage = (html) => {
    const m = /Actual Havellin services total \(logged hours \+ actual fees\)<\/td><td class="r"><strong>([^<]+)<\/strong>/.exec(String(html));
    return m ? m[1] : null;
  };

  group('7 · what an hourly walkaway earned: the deposit, or the work done as the final invoice bills it, whichever is more');
  {
    ok(HAV > 10000 && !EST.fixedPrice && Number(EST.totTC) > 0, 'fixture: an hourly Estate Settlement priced by the real engine ($' + HAV + ')');
    // Work done ABOVE the deposit: about seventy per cent of the quoted hours logged.
    const w = walker({ logs: logsFor(0.7) });
    const s = inZone(() => w.C.walkawaySettlement(w.job));
    const inv = inZone(() => w.C.invoiceHtml(w.job, 'final'));
    const received = w.job.payments.reduce((a, p) => a + p.amount, 0);
    eq(s.basis, 'hourly', 'an hourly basis');
    eq(s.deposit, w.C.depositTargetFor(w.job), 'the deposit is the one this job asks for');
    eq(s.work, round2(inv.servicesTotal), '⚠⚠ the work done is the final invoice\'s own services total');
    eq(finalTotalOnPage(inv.html), w.C.fmt(s.work), '⚠ the figure the final prints as its services total, read off the page');
    ok(s.work > s.deposit && s.work < received, 'fixture: the work done lands between the deposit and what was received');
    eq(s.earned, s.work, 'earned is the work done, being more than the deposit');
    eq(s.received, received, 'received is every payment that counts');
    eq(s.due, round2(received - s.work), '⚠⚠ the refund due is what came in less what was earned');
    ok(s.due > 0, 'and there is one');
    eq(s.retained, s.work, 'once it goes back, the job keeps what it earned');
    // Work done BELOW the deposit: the deposit is kept whole, and the midpoint goes back.
    const w2 = walker({ logs: logsFor(0.2) });
    const s2 = inZone(() => w2.C.walkawaySettlement(w2.job));
    ok(s2.work < s2.deposit, 'fixture: a fifth of the hours, under the deposit');
    eq(s2.earned, s2.deposit, '⚠ the deposit is earned on signature and kept whole');
    eq(s2.due, w2.C.paymentSplit(HAV).midpoint, 'so the midpoint payment is what is due back');
    // The deposit alone, nothing worked: nothing due back.
    const w3 = walker({ logs: [], midpoint: false });
    eq(inZone(() => w3.C.walkawaySettlement(w3.job)).due, 0, 'the deposit alone, nothing worked: nothing due back, never below zero');
    // A fixed price keeps its stage earn-out: unchanged.
    const wf = walker({ est: FIXED_EST, logs: logsFor(0.2) });
    const sf = inZone(() => wf.C.walkawaySettlement(wf.job));
    eq([sf.basis, sf.due, sf.retained], ['fixed', 0, sf.received], '⚠ a fixed price keeps everything received, as before');
    // An unread estimate is not an answer.
    const wc = walker({ noEstimate: true, logs: logsFor(0.7) });
    const sc = inZone(() => wc.C.walkawaySettlement(wc.job));
    eq([sc.basis, sc.due], ['unknown', 0], '⚠ with no estimate on this device the settlement is unknown, and nothing is due');
    wc.job.status = 'closed_retained';
    has(wc.C.refundBlocker(wc.job, sc), 'its estimate has not loaded', 'and no refund can be recorded against a guess');
    // A final that cannot be priced at all (a record the invoice throws on) is not an answer either: no work-done figure
    // is guessed. The invoice is the boundary here, stubbed to throw; everything else is the real settlement.
    const job = activeJob({ payments: [CHEQUE()] });
    const th = box(['walkawaySettlement'], { job, estimateStore: { 7: { approved: true, estimate: EST } }, stop: ['invoiceHtml'],
      stubs: { invoiceHtml: () => { throw new Error('unpriceable'); } } });
    // Read defensively: a settlement that throws on the missing invoice fails here, and the rest of the file still runs.
    let st;
    try { st = inZone(() => th.ctx.walkawaySettlement(job)); } catch (e) { st = { basis: 'threw: ' + e.message, due: NaN }; }
    eq([st.basis, st.due], ['unknown', 0], '⚠ a final the invoice cannot price leaves the settlement unknown, with nothing due');
  }

  group('7 · the close-out dialog shows it before the close, and the close keeps the status rule');
  {
    const w = walker({ logs: logsFor(0.7) });
    const s = inZone(() => w.C.walkawaySettlement(w.job));
    inZone(() => w.C.openCloseoutModal(7));
    const sub = text(w.doc.getElementById('closeout-sub').innerHTML);
    has(sub, 'Received ' + w.C.fmt(s.received), 'the dialog names what was received');
    has(sub, 'Earned: the deposit (' + w.C.fmt(s.deposit) + ') or the work done (' + w.C.fmt(s.work) + ') ' + w.C.fmt(s.earned), '⚠⚠ what was earned, and how');
    has(sub, 'Refund due ' + w.C.fmt(s.due), '⚠⚠ and the refund due');
    has(sub, 'what the final invoice bills', 'it says where the work done comes from');
    eq(w.btn.textContent, 'Close — Retain ' + w.C.fmt(s.retained) + ' · refund ' + w.C.fmt(s.due), 'the button states the decision: keep the earned, refund the rest');
    w.doc.__seed('closeout-reason', 'timing');
    inZone(() => w.C.confirmMarkLost());
    eq([w.job.status, w.job.won], ['closed_retained', true], 'it closes as Deposit Retained, still a win');
    // Fixed price: the dialog and the button as they were.
    const wf = walker({ est: FIXED_EST, logs: logsFor(0.2) });
    inZone(() => wf.C.openCloseoutModal(7));
    const kept = wf.C.closeoutRetainedTotal(wf.job);
    has(text(wf.doc.getElementById('closeout-sub').innerHTML), 'with the ' + wf.C.fmt(kept) + ' kept, not as a loss', 'a fixed price reads as before');
    eq(wf.btn.textContent, 'Close — Retain ' + wf.C.fmt(kept), 'and so does its button');
    lacks(text(wf.doc.getElementById('closeout-sub').innerHTML), 'Refund due', 'with no refund line');
  }

  group('7 · the refund is a recorded act, and the retained figure, Win / Loss and the rail read it');
  {
    const w = walker({ logs: logsFor(0.7), job: { status: 'closed_retained', lostReason: 'timing', lostReasonLabel: 'Timing — client not ready yet', lostAt: '2026-10-01T15:00:00.000Z' } });
    // `job.payments` given above is empty: put the walkaway's payments back.
    const dep = w.C.depositTargetFor(w.job), mid = w.C.paymentSplit(HAV).midpoint;
    w.job.payments = [{ id: 1, uid: 'u-dep', stage: 'deposit', amount: dep, method: 'wire', receivedOn: '2026-09-20', clearedOn: '2026-09-20' },
      { id: 2, uid: 'u-mid', stage: 'midpoint', amount: mid, method: 'check', receivedOn: '2026-09-28', clearedOn: null }];
    const s = inZone(() => w.C.walkawaySettlement(w.job));
    ok(s.due > 0, 'fixture: a refund is due (' + s.due + ')');
    // RESTATED 2026-10-01 (P17 merge): the retained figure is to the cent since W1 (roundCents), so it holds the $14,381.25
    // received, not the $14,381 this read when closeoutRetainedTotal rounded to the dollar; likewise twice below.
    eq(w.C.closeoutRetainedTotal(w.job), s.received, 'before the refund goes back the job holds everything received');
    // The card: the settlement and the one control.
    const card = inZone(() => w.C.walkawaySettlementHtml(w.job));
    has(card, 'Walkaway settlement', 'the Deposit Retained card carries the settlement');
    has(text(card), 'Refund due ' + w.C.fmt(s.due), 'with the refund due');
    has(card, 'openRefundModal(7)', 'and Record refund');
    // The dialog opens on the figure due.
    inZone(() => w.C.openRefundModal(7));
    eq(w.doc.getElementById('refund-modal').style.display, 'flex', 'Record refund opens its dialog');
    eq(w.doc.getElementById('rf-amount').value, String(s.due), 'on the amount due');
    eq(w.doc.getElementById('rf-date').value, '2026-10-01', 'dated today');
    has(w.doc.getElementById('rf-summary').textContent, 'Due back: ' + w.C.fmt(s.due), 'naming what is due');
    // Record it.
    w.doc.__seed('rf-method', 'check'); w.doc.__seed('rf-reference', '#2201'); w.doc.__seed('rf-payee', 'Pressly Family Trust');
    const before = { saved: w.seen.saved, synced: w.seen.synced, at: w.job.updatedAt };
    inZone(() => w.C.saveRefund());
    const r = w.job.payments[w.job.payments.length - 1];
    eq([r.stage, r.amount, r.refundedOn, r.method, r.reference, r.payee, r.recordedBy],
       ['refund', s.due, '2026-10-01', 'check', '#2201', 'Pressly Family Trust', 'Anthony Graziano'],
       '⚠⚠ the refund is its own record: amount, day, method, reference, payee and who');
    ok(!!r.uid && r.id === 3, 'with its own uid and id');
    eq(w.job.payments.length, 3, 'and the payments it is measured against are untouched');
    ok(w.job.at && w.job.at['payments:' + r.uid] > 0, '⚠ stamped on its own key, so the sheet merges it alone');
    ok(w.seen.synced > before.synced && w.job.updatedAt > before.at, 'a person\'s edit: the job\'s clock moves and it syncs');
    eq(w.doc.getElementById('refund-modal').style.display, 'none', 'the dialog closes');
    has((w.seen.notices[w.seen.notices.length - 1] || {}).msg, 'Refund recorded: ' + w.C.fmt(s.due) + ' refund by cheque, sent Oct 1, 2026, to Pressly Family Trust.',
        '⚠ and the notice says so, naming it as a refund (paymentSummaryText), never as a payment received');
    // Every total reads it — and none of the money-received totals counts it.
    eq(w.C.jobPaidTotal(w.job), s.received, 'received is still what came in');
    eq(w.C.jobRefundedTotal(w.job), s.due, 'refunded is what went back');
    eq(w.C.closeoutRetainedTotal(w.job), s.earned, '⚠⚠ the retained figure is now what the job earned');   // to the cent (P17 merge)
    const s2 = inZone(() => w.C.walkawaySettlement(w.job));
    eq([s2.refunded, s2.due, s2.retained], [s.due, 0, s.earned], 'the settlement reads it: nothing more is due');
    eq([w.C.stagePaidTotal(w.job, 'deposit'), w.C.isJobFunded(w.job)], [dep, true], 'the deposit and the funding gate never see it');
    eq([w.C.paymentCounts(r), w.C.refundCounts(r)], [false, true], 'paymentCounts leaves it out; refundCounts counts it');
    const wl = w.C.winLossFigures();
    eq(wl.wonRev, s.earned, '⚠ Win / Loss counts what was kept');
    const term = inZone(() => w.C.jobTimeline(w.job, w.C.estimateStore[7], [], []))[0];
    has(term.sub, w.C.fmt(s.earned) + ' retained', 'and the rail\'s Deposit Retained row says it');
    // The card and the list after.
    const card2 = text(inZone(() => w.C.walkawaySettlementHtml(w.job)));
    has(card2, 'Refunded (' + w.C.fmt(s.due) + ')', 'the card shows the refund');
    has(card2, 'Refund due ' + w.C.fmt(0), 'and nothing more due');
    lacks(inZone(() => w.C.walkawaySettlementHtml(w.job)), 'openRefundModal(', 'with no Record refund once nothing is due');
    const list = inZone(() => w.C.jobPaymentsListHtml(w.job));
    has(list, 'Payments and refunds recorded', 'the list heads itself for both');
    has(text(list), w.C.fmt(s.due) + ' · Refund · Cheque · #2201 · to Pressly Family Trust', 'the refund is listed as money that went back');
    has(text(list), 'Refund sent Oct 1, 2026', 'with the day it was sent');
    has(list, "openVoidPayment(7,'" + r.uid + "')", 'it can be voided');
    lacks(list, "markPaymentCleared(7,'" + r.uid + "')", 'and never "cleared"');
  }

  group('7 · the handler asks what the button asks');
  {
    const closed = (o) => walker(Object.assign({ logs: logsFor(0.7) }, o || {}));
    const fill = (w, f) => { Object.keys(f).forEach((k) => w.doc.__seed(k, f[k])); };
    const ready = (w) => { w.job.status = 'closed_retained'; w.doc.__seed('rf-job', '7'); };
    const GOOD = { 'rf-amount': '100', 'rf-date': '2026-10-01', 'rf-method': 'check' };
    // Not closed out: refused, nothing written.
    const a = closed(); a.doc.__seed('rf-job', '7'); fill(a, GOOD);
    inZone(() => a.C.saveRefund());
    eq(a.job.payments.length, 2, '⚠ an active job records no refund');
    has((a.seen.fb[0] || {}).msg, 'closed out with the deposit retained', 'and says why');
    inZone(() => a.C.openRefundModal(7));
    has((a.seen.notices[0] || {}).msg, 'closed out with the deposit retained', 'the door says the same');
    // Fixed price: refused.
    const f = closed({ est: FIXED_EST }); ready(f); fill(f, GOOD);
    inZone(() => f.C.saveRefund());
    eq(f.job.payments.length, 2, 'a fixed price records none');
    has((f.seen.fb[0] || {}).msg, 'stage earn-out', 'because it keeps its stage earn-out');
    // Nothing due: refused.
    const n = closed({ logs: [], midpoint: false }); ready(n); fill(n, GOOD);
    inZone(() => n.C.saveRefund());
    eq(n.job.payments.length, 1, 'nothing due, nothing recorded');
    has((n.seen.fb[0] || {}).msg, 'Nothing is due back', 'and it says so');
    // The fields.
    const k = closed(); ready(k);
    const due = inZone(() => k.C.walkawaySettlement(k.job)).due;
    const tryWith = (f2) => { fill(k, f2); inZone(() => k.C.saveRefund()); return (k.seen.fb[k.seen.fb.length - 1] || {}).msg || ''; };
    has(tryWith({ 'rf-amount': '0', 'rf-date': '2026-10-01', 'rf-method': 'check' }), 'Enter the amount refunded', 'no amount: refused');
    has(tryWith({ 'rf-amount': '100', 'rf-date': '', 'rf-method': 'check' }), 'Enter the date', 'no date: refused');
    has(tryWith({ 'rf-amount': '100', 'rf-date': '2026-10-01', 'rf-method': '' }), 'Select how the refund was sent', 'no method: refused');
    has(tryWith({ 'rf-amount': '100', 'rf-date': '2026-10-01', 'rf-method': 'stripe' }), 'Select how the refund was sent', 'a method not on the list: refused');
    has(tryWith({ 'rf-amount': '999999', 'rf-date': '2026-10-01', 'rf-method': 'wire' }), 'this job holds', '⚠ more than the job holds: refused');
    eq(k.job.payments.length, 2, 'and none of those wrote anything');
    // More than is due: asked, and a no writes nothing.
    const d = closed({ decline: true }); ready(d); fill(d, { 'rf-amount': String(due + 500), 'rf-date': '2026-10-01', 'rf-method': 'wire' });
    inZone(() => d.C.saveRefund());
    has(d.seen.confirms[0] || '', 'is more than the ' + d.C.fmt(due) + ' due back', '⚠ more than is due is asked about');
    eq(d.job.payments.length, 2, 'and declined, nothing is written');
    const y = closed(); ready(y); fill(y, { 'rf-amount': String(due + 500), 'rf-date': '2026-10-01', 'rf-method': 'wire' });
    inZone(() => y.C.saveRefund());
    eq(y.job.payments.length, 3, 'accepted, it is recorded as entered');
    eq(inZone(() => y.C.walkawaySettlement(y.job)).due, 0, 'and nothing is due');
    // P17 merge: the amount is kept to the cent, as saveDeposit keeps a payment's (roundCents).
    const ct = closed(); ready(ct); fill(ct, { 'rf-amount': '100.005', 'rf-date': '2026-10-01', 'rf-method': 'check' });
    inZone(() => ct.C.saveRefund());
    eq((ct.job.payments[2] || {}).amount, 100.01, '⚠ a refund typed past the cent is recorded to the cent, as a payment is');
  }

  group('7 · a refund recorded in error is voided with a reason, never deleted, and every figure goes back');
  {
    const w = walker({ logs: logsFor(0.7) });
    w.job.status = 'closed_retained';
    const s = inZone(() => w.C.walkawaySettlement(w.job));
    w.job.payments.push({ id: 3, uid: 'u-rf', stage: 'refund', amount: s.due, refundedOn: '2026-10-01', method: 'check', reference: '#2201',
      payee: 'Pressly Family Trust', recordedBy: 'Anthony Graziano', recordedAt: '2026-10-01T15:00:00.000Z' });
    inZone(() => w.C.markPaymentCleared(7, 'u-rf'));
    ok(!w.job.payments[2].clearedOn, 'Mark cleared refuses a refund');
    has((w.seen.notices[w.seen.notices.length - 1] || {}).msg, 'That is a refund Havellin sent', 'and says why');
    inZone(() => w.C.openVoidPayment(7, 'u-rf'));
    eq(w.doc.getElementById('pv-title').textContent, 'Void this refund', 'the dialog says it is a refund');
    eq(w.doc.getElementById('pv-save-btn').textContent, 'Void refund', 'and so does its button');
    eq(w.doc.getElementById('pv-summary').textContent, w.C.fmt(s.due) + ' refund by cheque, sent Oct 1, 2026, to Pressly Family Trust.',
       '⚠ and it names the refund as what it is: how, when and to whom it went (paymentSummaryText)');
    const eff = text(w.doc.getElementById('pv-effect').innerHTML);
    has(eff, 'comes off what has been refunded', 'the effect is stated first');
    has(eff, 'retained becomes ' + w.C.fmt(s.received) + '.', 'the retained figure goes back up');
    has(eff, 'The refund due becomes ' + w.C.fmt(s.due), 'and the refund is due again');
    w.doc.__seed('pv-reason', 'Cheque not sent: recorded early');
    inZone(() => w.C.confirmVoidPayment());
    eq(w.job.payments.length, 3, '⚠ the refund stays on the record');
    ok(!!w.job.payments[2].voidedAt && w.job.payments[2].voidReason === 'Cheque not sent: recorded early', 'void, with why');
    eq([w.C.jobRefundedTotal(w.job), w.C.closeoutRetainedTotal(w.job)], [0, s.received], 'nothing is refunded and the job holds it all again');
    eq(inZone(() => w.C.walkawaySettlement(w.job)).due, s.due, 'so the refund is due again');
    lacks(inZone(() => w.C.jobPaymentsListHtml(w.job)), "openVoidPayment(7,'u-rf')", 'a void refund offers nothing more');
  }

  group('7 · the sheet merges a refund as a payment: on its own uid, and its void holds against a stale device');
  {
    const S = { Date, JSON, Math, Number, String, Object, Array };
    vm.createContext(S);
    vm.runInContext([gsVar('JOB_KEYED_LISTS'), gsVar('JOB_KEYED_MAPS'), gsVar('JOB_LIST_KEY'), gsVar('JOB_PAYMENT_STICKY'),
      gsFn('_paymentSticky'), gsFn('_jobStamp'), gsFn('_jobListKey'), gsFn('_mergeJobKeyed'), gsFn('_mergeJobRecord')].join('\n\n'), S);
    const clone = (o) => JSON.parse(JSON.stringify(o));
    const morning = { id: 7, status: 'closed_retained', updatedAt: 100, at: { 'payments:u-dep': 50 },
      payments: [{ id: 1, uid: 'u-dep', stage: 'deposit', amount: 12050 }] };
    // The desk records the refund (stamped on its uid); a laptop on the morning copy saves something else later.
    const desk = clone(morning);
    desk.payments.push({ id: 2, uid: 'u-rf', stage: 'refund', amount: 4075, refundedOn: '2026-10-01', method: 'check' });
    desk.at['payments:u-rf'] = 200; desk.updatedAt = 200;
    const laptop = clone(morning); laptop.notes = 'gate code changed'; laptop.updatedAt = 300;
    let sheet = S._mergeJobRecord(desk, laptop);
    eq(sheet.payments.map((p) => p.uid), ['u-dep', 'u-rf'], '⚠⚠ the refund survives a stale device\'s later save');
    eq(sheet.notes, 'gate code changed', 'and the laptop\'s own edit lands beside it');
    // The desk voids it; a device holding the refund live touches its copy later — the void holds.
    const voided = clone(sheet);
    Object.assign(voided.payments[1], { voidedAt: '2026-10-02T15:00:00.000Z', voidedBy: 'Anthony Graziano', voidReason: 'recorded twice' });
    voided.at['payments:u-rf'] = 400; voided.updatedAt = 400;
    const stale = clone(sheet); stale.payments[1].reference = '#2201'; stale.at['payments:u-rf'] = 500; stale.updatedAt = 500;
    sheet = S._mergeJobRecord(voided, stale);
    const rf = sheet.payments.filter((p) => p.uid === 'u-rf')[0] || {};
    eq([!!rf.voidedAt, rf.voidReason], [true, 'recorded twice'], '⚠ the void of a refund is kept, as a payment\'s is (_paymentSticky)');
  }

  group('7 · the refund dialog offers exactly REFUND_METHODS; the card is on hourly walkaways only');
  {
    const a = SRC.indexOf('<select id="rf-method"');
    const sel = a >= 0 ? SRC.slice(a, SRC.indexOf('</select>', a)) : '';
    ok(sel.length > 50 && sel.length < 2000, 'the refund dialog\'s method select was found');
    const opts = [...sel.matchAll(/<option value="([^"]*)">([^<]*)</g)].filter((x) => x[1]).map((x) => [x[1], x[2]]);
    const c = sandbox({ vars: ['REFUND_METHODS'] });
    eq(opts, c.REFUND_METHODS.map((m) => [m.v, m.l]), 'the select is REFUND_METHODS, in its order, with its labels');
    const w = walker({ logs: logsFor(0.7) });
    eq(inZone(() => w.C.walkawaySettlementHtml(w.job)), '', 'an active job has no settlement card');
    const wf = walker({ est: FIXED_EST, logs: logsFor(0.7) }); wf.job.status = 'closed_retained';
    eq(inZone(() => wf.C.walkawaySettlementHtml(wf.job)), '', 'nor does a fixed-price walkaway');
    has(live(fn('renderClientDashboard')), 'walkawaySettlementHtml(job)', 'the dashboard draws it, above the payments list');
    ok(live(fn('renderClientDashboard')).indexOf('walkawaySettlementHtml(job)') < live(fn('renderClientDashboard')).indexOf('jobPaymentsListHtml(job)'),
      'in that order');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  // ITEM 8 — A SIGNING PACKET HANDED OVER IN PERSON
  // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  const AG = ['dashMarkAgreementSent', 'jobTimeline', 'jobTimelineNext', 'jobTimelineActions', 'jtRailHtml', 'agreementHandedOverInPerson', 'isAgreementSent'];
  // Won, not yet sent: the packet's send step is the live one.
  const wonJob = (over) => {
    const j = activeJob(Object.assign({ status: 'won', agrApproved: false, agrApprovedBy: '', agrSent: false, agrSentAt: '',
      agrSigned: false, agrSignedAt: '', payments: [], depositReceived: false, depositReceivedAt: '', activatedOn: '', activatedBy: '' }, over || {}));
    j.docState = { estimate: SENT('2026-09-18T14:00:00.000Z') };
    return j;
  };

  group('8 · "Handed over in person" is offered where the send is, and only there');
  {
    const job = wonJob();
    const b = box(AG, { job, estimateStore: { 7: REC() } });
    const rows = inZone(() => b.ctx.jobTimeline(job, b.ctx.estimateStore[7], [], []));
    const row = byKey(rows, 'agreement_sent');
    eq(row.state, 'current', 'fixture: the packet\'s send is the live step');
    const a = b.ctx.jobTimelineActions(row, job, b.ctx.estimateStore[7]);
    has(a.primary && a.primary.call, "docAction(7,'agreement','send')", 'the send is the band\'s primary');
    const hand = a.secondary.filter((x) => x.call === 'dashMarkAgreementSent(7)');
    eq(hand.length, 1, '⚠⚠ Handed over in person is beside it, once');
    has(hand[0] && hand[0].label, 'Handed over in person', 'named as Anthony named it');
    if (b.ctx.esignAvailable()) ok(a.secondary.some((x) => /via:'paper'/.test(x.call)), 'beside the paper route, on the DocuSign route');
    // Not on a step that is done, or one still waiting.
    const doneRow = Object.assign({}, row, { state: 'done', done: true });
    eq(b.ctx.jobTimelineActions(doneRow, job, b.ctx.estimateStore[7]).secondary.filter((x) => /dashMarkAgreementSent/.test(x.call)).length, 0, 'never on a done step');
    const waitRow = Object.assign({}, row, { state: 'waiting' });
    eq(b.ctx.jobTimelineActions(waitRow, job, b.ctx.estimateStore[7]).secondary.filter((x) => /dashMarkAgreementSent/.test(x.call)).length, 0, 'nor on a waiting one');
  }

  group('8 · pressing it records the send on the document record, and the timeline waits for the signature');
  {
    const job = wonJob();
    const b = box(AG.concat(['ensureAgreementApproved', 'markAgreementSent']), { job, estimateStore: { 7: REC() } });
    const C = b.ctx;
    const before = job.updatedAt;
    inZone(() => C.dashMarkAgreementSent(7));
    has(b.seen.confirms[0] || '', 'Record the signing packet as handed to Tripp Butler in person today?', '⚠ it asks first, naming who it went to');
    const st = (job.docState || {}).agreement || {};
    eq([st.sentAt, st.sentBy, st.sentHow], ['2026-10-01T18:00:00.000Z', 'Anthony Graziano', 'in_person'],
       '⚠⚠ the send is on the document record: when, who, and how');
    eq(st.sentHowAt, st.sentAt, 'the route names the send it describes');
    eq([job.agrSent, job.agrApproved], [true, true], 'the legacy mirror is written and the approval stamped (markAgreementSent, the send\'s gate)');
    ok(C.isAgreementSent(job), 'isAgreementSent reads it from the record');
    ok(job.at && job.at['docState:agreement'] > 0, '⚠ a person\'s edit: stamped on its key');
    ok(job.updatedAt > before && b.seen.synced > 0, 'the job\'s clock moves and it syncs');
    eq(((b.seen.lastSynced || {}).docState || {}).agreement && b.seen.lastSynced.docState.agreement.sentHow, 'in_person',
       '⚠ and what reaches the sheet carries the in-person send (synced after it was written)');
    has((b.seen.notices[b.seen.notices.length - 1] || {}).msg, 'Recorded as handed over in person by Anthony Graziano', 'the notice says what was recorded');
    const rows = inZone(() => C.jobTimeline(job, C.estimateStore[7], [], []));
    const sent = byKey(rows, 'agreement_sent');
    eq([sent.done, sent.sub], [true, 'Handed over in person'], '⚠⚠ the step is done, and says how');
    eq((C.jobTimelineNext(rows) || {}).key, 'agreement_signed', 'the timeline moves to awaiting the signature');
    const sig = C.jobTimelineActions(C.jobTimelineNext(rows), job, C.estimateStore[7]);
    eq(sig.primary && sig.primary.call, 'dashMarkAgreementSigned(7)', 'whose button records the signature by hand (no envelope watches it)');
    has(inZone(() => C.jtRailHtml(rows)), 'Handed over in person', 'and the rail prints the route');
    // A second press records nothing new. (Read defensively: with no record the checks above fail, and these do not throw.)
    const agr = () => (job.docState || {}).agreement || {};
    inZone(() => C.dashMarkAgreementSent(7));
    eq(agr().sentAt, st.sentAt, 'a second press does not record the send again');
    has((b.seen.notices[b.seen.notices.length - 1] || {}).msg, 'already recorded as sent', 'and says so');
    // Another send rewriting the record retires the in-person route.
    agr().sentAt = '2026-10-02T14:00:00.000Z';
    ok(!C.agreementHandedOverInPerson(job), 'a later send on the record is no longer the in-person one');
  }

  group('8 · the gate is the send\'s own, asked where it is pressed');
  {
    // Not won: agreementReady refuses, through markAgreementSent; nothing is recorded.
    const job = wonJob({ won: false, status: 'approved' });
    const b = box(AG.concat(['ensureAgreementApproved', 'markAgreementSent']), { job, estimateStore: { 7: REC() } });
    inZone(() => b.ctx.dashMarkAgreementSent(7));
    ok(!((job.docState || {}).agreement || {}).sentAt, '⚠ before the client\'s yes nothing is recorded');
    eq(job.agrSent, false, 'and the mirror stays false');
    has((b.seen.fb[0] || {}).msg, 'acceptance recorded first', 'the gate says why');
    // Declined: nothing.
    const j2 = wonJob();
    const d = box(AG.concat(['ensureAgreementApproved', 'markAgreementSent']), { job: j2, estimateStore: { 7: REC() }, decline: true });
    inZone(() => d.ctx.dashMarkAgreementSent(7));
    ok(!((j2.docState || {}).agreement || {}).sentAt && !j2.agrSent, 'a press answered "Cancel" records nothing');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  // ITEM 12 — NO POWER OF ATTORNEY
  // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  group('12 · Power of Attorney is off the roles; a record that carries it keeps it, shown as recorded');
  {
    const c = sandbox({ fns: ['executorRoleOptionsHtml', 'buildExecutorRoleOptions', 'expectedSignerName', 'esc'], vars: ['EXECUTOR_ROLES'],
      stubs: { document: domStub({}) } });
    eq(c.EXECUTOR_ROLES.filter((r) => /attorney/i.test(r.v) && r.v !== 'Estate Attorney').length, 0, '⚠⚠ the catalogue offers no power of attorney');
    ok(c.EXECUTOR_ROLES.some((r) => r.v === 'Personal Representative') && c.EXECUTOR_ROLES.some((r) => r.v === 'Estate Attorney'),
      'and keeps the roles that act for an estate');
    c.buildExecutorRoleOptions();
    lacks(c.document.getElementById('i-executor-role').innerHTML, 'Power of Attorney', 'intake does not offer it');
    lacks(c.executorRoleOptionsHtml(''), 'Power of Attorney', 'nor does a blank Edit Client');
    const old = c.executorRoleOptionsHtml('Power of Attorney');
    has(old, '<option value="Power of Attorney" selected>Power of Attorney (as recorded)</option>', '⚠ an older record shows its role, as recorded');
    eq((old.match(/Power of Attorney/g) || []).length, 2, 'once (value and label)');
    eq(c.expectedSignerName({ executor: 'Tripp Butler', executorRole: 'Power of Attorney', name: 'William Butler' }),
       'Tripp Butler (Power of Attorney)', 'and what is recorded is what prints');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  group('docs · each change is in all four documents');
  {
    const DOC = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
    const FILES = ['manual.html', 'MANUAL.md', 'concierge-guide.html', 'CONCIERGE_GUIDE.md'];
    [['Deposit voided: record the replacement payment', 'item 2'], ['Handed over in person', 'item 8'],
     ['Record refund', 'item 7'], ['Refund due', 'item 7'], ['Power of Attorney', 'item 12']].forEach(([needle, what]) => {
      FILES.forEach((f) => has(DOC(f), needle, f + ' carries "' + needle + '" (' + what + ')'));
    });
  }
};
