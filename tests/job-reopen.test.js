'use strict';
// ⚠⚠ A CLOSED JOB CAN BE RE-OPENED, AND THE FINAL STOPS CLAIMING A MIDPOINT INVOICE THAT NEVER WENT OUT
// (2026-09-29). Anthony, answering two of the four things the H3 build flagged: *"yes to 2 and 3, reword
// the final and add Re-open"*.
//
// THE REWORDING. Since H3 a job can be closed with its midpoint never sent, so the final can be the second
// bill the client ever sees — and it went on printing "25% midpoint — invoiced at project midpoint" and
// "Outstanding from the deposit and midpoint invoices" over a midpoint invoice that did not exist. The
// money was right; the account of it was not. The record decides now: a midpoint invoice was issued when
// it was SENT, or when a midpoint payment is on file. `payments-received` carries the T&M, fixed-price and
// nothing-recorded cases; this file carries the rest (a printed copy paid by cheque, the midpoint row's
// own figure, the midpoint invoice's gap row, the no-hours message, the overpaid deposit, fee-only prep).
//
// THE RE-OPEN. Until today nothing re-opened a closed job — the one control that tried, the client list's
// Status button, never rendered — so a close made by mistake needed Anthony. A Re-open now UNDOES the close:
// the handover stamp is cleared, the close it recorded is kept on `job.reopens`, a final invoice drafted
// but not sent is voided on the record, and the next close stamps its own day. It is offered beside the lit
// step of a closed job until the final goes out (or a final payment is on file), through the same one door
// as Close, `activateOrCycle`, and it asks before it touches anything.
//
// Everything is driven through the REAL rail, actions, band, transition, invoice and rendered dashboard,
// plus the REAL `_mergeJobRecord` from main-sync.gs for the two-device case.

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { sandbox, fn, source, domStub, matchBrace } = require('./harness');

const text = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&mdash;/g, '—').replace(/\s+/g, ' ');
const noComments = (s) => s.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

// ── the invoice ─────────────────────────────────────────────────────────────
const INV_FNS = ['estTolerancePctTxt', 'invoiceHtml', 'docSentAt', 'docKeyFor', 'paymentSplit', 'rushScopeLine', 'rushCrewAdded',
  'invFinalApproval', 'invFinalApprovalRecord', 'jobLogEntries', 'coHours', 'coHoursTotal',
  'coBaselineShift', 'coPrice', 'coPriceTotal', 'coHoursLabel', '_coMoney', 'fmt', 'getVendorActuals', '_srcLineKey',
  'samePerson', 'canonPersonName', '_invVendorFeeSentence', 'prepFeeRate', 'vendorGroupOfLine', 'resolveJobVendor',
  'coordHrsFor', 'prepLineTCHrs', 'vendorLineTCHrs', 'esc', 'fmtDate2', 'svcLabelOf', 'conciergePhones',
  'conciergePhonesText', 'assignedTCContact', 'vendorCats', 'vendorPrimaryCat', 'estimateIsFeeOnly', 'estDeclutterHrs',
  'isDecedentJob', 'stagePaidTotal', 'jobPaidTotal', 'jobPayments', 'discountOnLabor', 'estFixedFee', 'estPrepFeeOnTop'];
const INV_VARS = ['EST_TOLERANCE_PCT', 'SMF_PCT', 'RUSH_PCT', 'SVC_LABELS', 'DEPT_EMAILS', 'HAVELLIN_OFFICE_PHONE',
  'NON_MOBILE_NUMBERS', 'DEFAULT_CONTRACTORS', 'COORD_TOUCHES', 'COORD_TOUCHES_BY_GROUP', 'COORD_TOUCHES_DEFAULT',
  'TOUCH_HRS', 'DECEDENT_SERVICES', 'PERSON_NAME_ALIASES', 'PREP_FEE_RATE'];

// 80 TC @150 + 60 PS @100 + $1,940 materials = $19,940; the logged hours reproduce it exactly, so the only
// thing that moves between two cases is the one thing each case is about.
const TOTAL = 19940, DEPOSIT = 9970, SHARE = 4985;          // SHARE = the midpoint's own 25%
const EST = { jobId: 1, tcFee: 12000, psFee: 6000, pkgCost: 1940, smf: 0, prepFee: 0, havellinTotal: TOTAL,
  havellinTotalFull: TOTAL, tcRate: 150, psRate: 100, discountPct: 0, discountAmt: 0, fixedPrice: false, rush: false,
  vendors: [], prepItems: [], preparedBy: 'Anthony Graziano', svc: 'cleanout', totTC: 80, totPS: 60 };
const LOGGED = [{ date: '2026-09-01', activity: 'clearance', members: [{ name: 'Anthony Graziano', role: 'TC', hours: 80 },
  { name: 'Crew', role: 'PS', hours: 60 }] }];
const pay = (stage, amount) => ({ stage, amount, date: '2026-09-01', method: 'wire' });
const MID_SENT = { 'invoice:midpoint': { sentAt: '2026-09-15T14:00:00Z' } };

function invoice(o) {
  const est = Object.assign({}, EST, o.est || {});
  const ctx = sandbox({ fns: INV_FNS, vars: INV_VARS, stubs: {
    jobLogs: { 1: o.logs === undefined ? LOGGED : o.logs },
    estimateStore: { 1: { estimate: est, approved: true, approvedBy: 'Anthony Graziano' } },
    changeOrders: [], contractors: [], currentEstimate: null, currentInvStage: o.stage || 'final',
    vendorDirectory: [], jobPlans: {} } });
  const job = Object.assign({ id: 1, hvlId: 'HVL-0007', client: 'Butler Estate', svc: est.svc, address: '69 Beach Blvd',
    tc: 'Anthony Graziano', status: 'closed', deliveredOn: '2026-09-30', executor: 'Tripp Butler',
    payments: o.payments || [], docState: o.docState || {} }, o.job || {});
  const r = ctx.invoiceHtml(job, o.stage || 'final');
  return Object.assign({ t: text(r.html) }, r);
}
// The midpoint row, isolated: the label and the figure it carries.
function midRow(t) {
  const m = /25% midpoint — (fees trued to actuals|invoiced at project midpoint|billed on this invoice)[^$]*\$([\d,]+)/.exec(t);
  return m ? { label: m[1], amount: Number(m[2].replace(/,/g, '')) } : null;
}

// ── the rail, the transition and the band ───────────────────────────────────
const TL_FNS = ['jobTimeline', 'jobTimelineNext', 'paymentSplit', 'unscoredRoomNames', 'jobActivationBlockers', 'isJobWon',
  'isJobFunded', 'jobPayments', 'stagePaidTotal', 'depositPaidTotal', 'depositTargetFor', 'docSentAt', 'docDraftedAt',
  'docKeyFor', 'agreementSignature', 'isAgreementSigned', 'esignProviderKey', 'esignAvailable', 'esignJobWatches',
  'isAgreementSent', 'jobSchedule', 'jobProgress', 'estWorkingDays', 'addWorkingDays', 'workingDaysInclusive',
  'coWorkingDays', '_coPaceFix', 'roomStatusNormalize'];
const RAIL_FNS = TL_FNS.concat(['jtBandHtml', 'jobTimelineActions', 'jobTimelineDoc', 'jobStageDoc', 'docReadiness',
  'docDraftOnly', 'docTitle', 'docWord', '_jtDocSecondaries', '_jtDocViews', '_jtDraftLink', '_jtDriveLink', '_jtSendAction',
  'agreementReady', 'jtRailHtml', 'jtTrackHtml', '_jtAtFmt', '_jtStateCls', 'fmtMoney',
  // The REAL date formatter: the question names the handover day, and a passthrough would hide its format.
  'fmtDate2',
  'applyJobTransition', 'activateOrCycle', 'jobCloseBlockers', 'unratedVendorsForJob', '_assignedVendorsForJob',
  'lookupVendorById', 'vendorIdOf', '_actor',
  // Lifted, never stubbed — the button, the refusal and the undo are one rule read three ways.
  'jobReopenBlocker', '_reopenTransition', 'docState', '_jobTouch',
  // The two readers of the handover stamp outside the rail.
  'jobIsSettled', 'planCurrentStage', '_planRooms', '_planRoomStatus', 'docReadOnlyWord', 'docPreviewOnly', 'estimateEditBlocker', 'priceChangeBlocker', 'discountOfferBlocker']);
const VARS = ['JT_SHORT', 'JT_NEXT', 'JT_LEG_BREAK', 'JT_ROW_DOC', 'AGR_SIG_METHODS', 'ESIGN_PROVIDERS', 'DOC_READY_WHY',
  'DOC_KIND_WORD', 'DOC_STAGE_WORD', 'DOC_ACTIONS', 'SVC_LABELS', 'ROOM_STATUS_META', 'ROOM_STATUS_LEGACY',
  'TC_DONE_STATUSES', 'PS_DONE_STATUSES', 'PROJ_CREW_DAY', 'PRODUCTIVE_HRS_PER_DAY', 'JOB_TRANSITIONS', 'jobPlanStore'];

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();

  const asked = [], said = [], landed = [];
  let answer = true, today = '2026-09-30';
  const R = sandbox({ fns: RAIL_FNS, vars: VARS, stubs: {
    Intl: global.Intl, _todayStr: () => today, agrApprovedBy: '', vendorDirectory: [],
    saveJobs() {}, syncJobToSheets(j) { if (j) j.updatedAt = Date.now(); },
    openJobPlanFor(id) { landed.push(id); return true; }, _dashRedraw() { return true; }, renderClientDashboard() {},
    alert(m) { said.push(m); }, confirm(m) { asked.push(m); return answer; },
  } });
  const reset = (a) => { asked.length = 0; said.length = 0; landed.length = 0; answer = a === undefined ? true : a; };

  // A 6-working-day Estate Settlement activated Wednesday 23 September: halfway Friday the 25th, planned end
  // the 30th. Both rooms cleared, the midpoint invoice SENT and UNPAID — the audit's own job — closed today.
  const ESTR = { svc: 'cleanout', days: 6, totTC: 10, totPS: 20, havellinTotal: 20000,
    rooms: [{ idx: 0, name: 'Kitchen', vol: 3, cplx: 3, tcH: 5, psH: 10 }, { idx: 1, name: 'Study', vol: 3, cplx: 3, tcH: 5, psH: 10 }] };
  const DEP_SENT = { 'invoice:deposit': { draftedAt: '2026-09-15T10:00:00Z', sentAt: '2026-09-15T10:00:00Z' } };
  const JOB = (over) => Object.assign({ id: 7, hvlId: 'HVL-2609-TZAK', name: 'Ellsworth', svc: 'cleanout',
    status: 'closed', won: true, wonAt: '2026-09-10', wonBy: 'Anthony', approved: true,
    agrApproved: true, agrApprovedBy: 'Anthony Graziano', agrSent: true, agrSigned: true,
    created: 'Sep 8, 2026', walkthrough: '2020-01-01', estimateSentDate: 'September 9, 2026',
    start: '2026-09-23', activatedOn: '2026-09-23', depositReceived: true, depositReceivedAt: '2026-09-19',
    deliveredOn: '2026-09-30', deliveredAt: '2026-09-30T19:00:00.000Z', deliveredBy: 'Ashley Jerome',
    docState: Object.assign({}, DEP_SENT, { 'invoice:midpoint': { draftedAt: '2026-09-26T10:00:00Z', sentAt: '2026-09-26T10:00:00Z' } }),
    payments: [{ id: 1, uid: 'p1', stage: 'deposit', amount: 10000, date: '2026-09-19', method: 'wire' }] }, over || {});
  const CLEARED = { rooms: { 0: { status: 'cleared' }, 1: { status: 'cleared' } } };

  function rail(job, day, plan) {
    const rec = { estimate: Object.assign({}, ESTR), approved: true, savedAt: 1789067253747 };
    R.estimateStore = { 7: rec }; R.jobs = [job];
    R.jobPlanStore[7] = plan || CLEARED;
    const prog = R.jobProgress(rec.estimate, plan || CLEARED, [], {});
    const sched = R.jobSchedule(job, rec.estimate, day || today, prog);
    const rows = R.jobTimeline(job, rec, [], [], sched);
    const next = R.jobTimelineNext(rows);
    const band = R.jtBandHtml(job, rec, rows, next);
    const by = {}; rows.forEach((r) => { by[r.key] = r; });
    const acts = (key) => R.jobTimelineActions(by[key], job, rec);
    const all = rows.map((r) => ({ key: r.key, a: acts(r.key) }));
    const every = all.map((x) => [x.a.primary].concat(x.a.secondary, x.a.doc ? x.a.doc.acts : []).filter(Boolean)
      .map((b) => ({ key: x.key, call: b.call, label: b.label }))).reduce((p, q) => p.concat(q), []);
    const f = /class="jt-btn jt-btn-p" onclick="([^"]+)">([^<]*)</.exec(band.html);
    const outline = [];
    const re = /class="jt-btn(?: jt-btn-d)?" onclick="([^"]+)">([^<]*)</g;
    let m;
    while ((m = re.exec(band.html)) !== null) outline.push({ call: m[1], label: m[2] });
    return { rows, by, next, band, acts, every, filled: f ? { call: f[1], label: f[2] } : null, outline,
             filledCount: (band.html.match(/jt-btn-p/g) || []).length };
  }
  const reopenCalls = (s) => s.every.filter((b) => b.call === 'activateOrCycle(7)');

  // ═══════════════════════════════════════════════════════════════════════════
  group('THE FINAL — a midpoint paid against a printed copy was billed, so the page says so');
  {
    // A midpoint invoice PRINTED and handed over leaves no send record, and a client who then paid it was
    // plainly asked for it. The payment is the evidence; the page names both invoices as it always did.
    const cheque = invoice({ payments: [pay('deposit', DEPOSIT), pay('midpoint', 2000)] });
    eq((midRow(cheque.t) || {}).label, 'fees trued to actuals', '⚠ a midpoint PAYMENT on file means a midpoint invoice was issued');
    has(cheque.t, 'Outstanding from the deposit and midpoint invoices', 'and the gap names both invoices');
    lacks(cheque.t, 'billed on this invoice', 'nothing claims the midpoint is billed here');
    const sent = invoice({ payments: [pay('deposit', DEPOSIT), pay('midpoint', 2000)], docState: MID_SENT });
    eq(Math.round(cheque.amtDue), Math.round(sent.amtDue), 'and it reads exactly as a sent one does — to the dollar');
    eq(cheque.t, sent.t, 'to the word');
  }

  group('THE FINAL — the midpoint row states the midpoint\'s own share when it was never invoiced');
  {
    // ⚠ A short deposit, the midpoint never sent. Sent, the midpoint row carries the shortfall forward (it is
    // what that invoice ASKED for). Never sent, the shortfall is on the gap row — so the row states the 25%
    // share alone, or the same dollars would be described twice on one page.
    const short = [pay('deposit', 5000)];
    const never = invoice({ payments: short });
    const sent = invoice({ payments: short, docState: MID_SENT });
    const nr = midRow(never.t), sr = midRow(sent.t);
    eq(nr && nr.label, 'billed on this invoice', 'never sent: the midpoint is billed on this invoice');
    eq(nr && nr.amount, SHARE, '⚠ and its figure is the midpoint\'s own 25% — $4,985');
    has(never.t, 'Outstanding from the deposit invoice — carried into the balance below +$4,970',
        'the deposit shortfall is named once, on the gap row, against the deposit invoice alone');
    eq(sr && sr.label, 'fees trued to actuals', 'sent: the midpoint invoice is named');
    eq(sr && sr.amount, SHARE + (DEPOSIT - 5000), 'and its row carries what that invoice asked for, shortfall included');
    has(sent.t, 'Outstanding from the deposit and midpoint invoices — carried into the balance below +$9,955',
        'with both invoices named on the gap');
    eq(Math.round(never.amtDue), TOTAL - 5000, '⚠⚠ the balance is the whole job less what arrived');
    eq(Math.round(sent.amtDue), Math.round(never.amtDue), '⚠⚠ and it does not move with the wording — the money was never wrong');
  }

  group('THE FINAL — an overpaid deposit with no midpoint invoice is credited against the deposit invoice');
  {
    const over = invoice({ payments: [pay('deposit', DEPOSIT + 1500)] });
    eq((midRow(over.t) || {}).label, 'billed on this invoice', 'no midpoint invoice: the share is billed here');
    has(over.t, 'Received ahead of the invoiced schedule — credited in the balance below ($1,500)',
        'the $1,500 paid ahead of the deposit invoice is credited, and says where');
    eq(Math.round(over.amtDue), TOTAL - DEPOSIT - 1500, 'the balance is the job less everything received');
  }

  group('THE FINAL — fixed price reads the same record');
  {
    const FX = { fixedPrice: true, fixedAmount: TOTAL, havellinTotal: TOTAL };
    const chq = invoice({ est: FX, payments: [pay('deposit', DEPOSIT), pay('midpoint', SHARE)] });
    eq((midRow(chq.t) || {}).label, 'invoiced at project midpoint', 'a midpoint payment on file: the fixed-price summary names the invoice');
    const never = invoice({ est: FX, payments: [pay('deposit', 5000)] });
    eq((midRow(never.t) || {}).label, 'billed on this invoice', 'never sent and unpaid: billed here');
    eq((midRow(never.t) || {}).amount, SHARE, 'at its own 25% share');
    has(never.t, 'Outstanding from the deposit invoice', 'the deposit shortfall named against the deposit invoice');
    lacks(never.t, 'deposit and midpoint invoices', 'and no midpoint invoice named that never went out');
  }

  group('THE FINAL — fee-only Home Prep takes the same rule');
  {
    // Standalone prep bills the management fee alone, and its final is the hourly arm with no hours to gate on.
    const PREP = { svc: 'prep', totTC: 0, totPS: 0, tcFee: 0, psFee: 0, pkgCost: 0, smf: 0, prepFee: 13500,
      prepCost: 45000, prepEnabled: true, prepTCHrs: 0, declutterTCHrs: 0, havellinTotal: 13500, havellinTotalFull: 13500,
      grandTotal: 58500, prepItems: [{ type: 'Painting', cost: 45000, lid: 'a1' }], rooms: [] };
    const never = invoice({ est: PREP, logs: [], payments: [pay('deposit', 6750)] });
    ok(!never.blocked, 'a fee-only prep final is not blocked for want of hours');
    eq((midRow(never.t) || {}).label, 'billed on this invoice', 'never sent: billed on this invoice');
    lacks(never.t, 'deposit and midpoint invoices', 'naming no midpoint invoice');
    const sent = invoice({ est: PREP, logs: [], payments: [pay('deposit', 6750)], docState: MID_SENT });
    eq((midRow(sent.t) || {}).label, 'fees trued to actuals', 'sent: the midpoint invoice is named');
    eq(Math.round(never.amtDue), Math.round(sent.amtDue), 'and the balance is identical either way');
  }

  group('THE MIDPOINT INVOICE — its own gap row names the deposit invoice, never itself');
  {
    // ⚠ The sentence was fixed at "the deposit and midpoint invoices … the balance below", so the MIDPOINT
    // invoice reported a short deposit as outstanding from the very invoice the reader was holding.
    const mid = invoice({ stage: 'midpoint', payments: [pay('deposit', 5000)], job: { status: 'active', deliveredOn: '' } });
    has(mid.t, 'Outstanding from the deposit invoice — carried into the payment due below +$4,970',
        '⚠ a short deposit is outstanding from the deposit invoice, carried into the payment due below');
    lacks(mid.t, 'deposit and midpoint invoices', 'the midpoint invoice never names itself as a prior invoice');
    lacks(mid.t, 'the balance below', 'and there is no "balance" on a midpoint invoice — it asks for a payment');
    const ahead = invoice({ stage: 'midpoint', payments: [pay('deposit', DEPOSIT + 800)], job: { status: 'active', deliveredOn: '' } });
    has(ahead.t, 'Received ahead of the invoiced schedule — credited in the payment due below ($800)',
        'a deposit paid ahead is credited in the payment due, and says so');
  }

  group('THE FINAL — the no-hours block says which invoices it would be crediting against');
  {
    const never = invoice({ logs: [], payments: [pay('deposit', DEPOSIT)] });
    ok(never.blocked, 'a T&M final with no hours logged is blocked, as it always was');
    has(never.t, 'already invoiced at the deposit —', 'never sent: only the deposit was invoiced');
    lacks(never.t, 'at deposit and midpoint', 'and no midpoint invoice is claimed');
    const sent = invoice({ logs: [], payments: [pay('deposit', DEPOSIT)], docState: MID_SENT });
    has(sent.t, 'already invoiced at deposit and midpoint —', 'sent: both are named');
    has(never.t, '$9,970 already invoiced', '⚠ and the figure it names is the deposit alone');
    has(sent.t, '$14,955 already invoiced', 'against the cumulative 75% when both went out');
  }

  group('the rule is one expression, read from the record the rail reads');
  {
    const body = noComments(fn('invoiceHtml'));
    has(body, "var _midBilled     = !!docSentAt(job, 'invoice', 'midpoint') || stagePaidTotal(job, 'midpoint') > 0;",
        'a midpoint invoice was issued when it was sent, or when a midpoint payment is on file');
    has(body, 'var invoicedBefore = _midBilled ? midCumTarget : depositAmt;', 'the gap is measured against what was invoiced');
    has(body, 'var finalDue     = Math.round(totalFinalBasis) - receivedAll;', '⚠ and the balance still reads only what arrived');
    eq((body.match(/_paymentGapRow\(/g) || []).length, 4, 'one gap renderer: its definition and three callers');
    ok(!/_paymentGapRow\([^,()]+\)/.test(body), '⚠ every caller names where the gap came from and where it lands');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('RE-OPEN — offered beside the lit step of a closed job, once, as an outline');
  {
    const s = rail(JOB());
    eq(s.next && s.next.key, 'final_invoiced', 'a closed job lights the final invoice');
    eq(s.filled && s.filled.call, "docAction(7,'invoice','send',{stage:'final'})", 'sending it stays the filled button');
    const r = reopenCalls(s);
    eq(r.length, 1, 'the transition is offered exactly once across the whole rail');
    eq((r[0] || {}).key, 'final_invoiced', 'on the lit row');
    eq((r[0] || {}).label, '&#8634; Re-open job', 'labelled Re-open job');
    ok(s.outline.some((b) => b.call === 'activateOrCycle(7)' && /Re-open job/.test(b.label)), 'and the band draws it as an outline');
    eq(s.filledCount, 1, 'the band keeps exactly one filled button');
    lacks(s.every.map((b) => b.label).join(' '), 'Close job', 'a closed job is offered no Close');
    lacks(s.every.map((b) => b.label).join(' '), 'Activate job', 'and no Activate');
  }

  group('RE-OPEN — withheld once the final has gone out, and the transition refuses in the same words');
  {
    const sentFinal = JOB({ docState: Object.assign({}, JOB().docState,
      { 'invoice:final': { draftedAt: '2026-09-30T10:00:00Z', sentAt: '2026-09-30T11:00:00Z' } }) });
    eq(reopenCalls(rail(sentFinal)).length, 0, '⚠⚠ no Re-open anywhere once the final invoice has gone out');
    reset(true);
    const before = JSON.stringify(sentFinal);
    ok(R.applyJobTransition(sentFinal) === false, 'the transition refuses it');
    eq(asked.length, 0, 'without asking a question it would then refuse');
    has(said[0] || '', 'its final invoice has already gone out to the client', 'and says why, out loud');
    eq(JSON.stringify(sentFinal), before, 'nothing on the record moves');
    has(R.jobReopenBlocker(sentFinal), 'final invoice has already gone out', 'the rail and the refusal read one answer');

    const paidFinal = JOB({ payments: JOB().payments.concat([{ id: 3, uid: 'p3', stage: 'final', amount: 8000 }]) });
    eq(reopenCalls(rail(paidFinal)).length, 0, 'nor once a final payment is on file (a final paid against a printed copy)');
    reset(true);
    ok(R.applyJobTransition(paidFinal) === false, 'refused');
    has(said[0] || '', 'a final payment is already recorded against it', 'naming the payment');
    eq(R.jobReopenBlocker(JOB({ status: 'active', deliveredOn: '' })), 'Only a closed job can be re-opened.',
       'and asked of a job that is not closed, the answer says so');
  }

  group('RE-OPEN — Cancel changes nothing');
  {
    const j = JOB();
    const before = JSON.stringify(j);
    reset(false);
    R.jobs = [j];
    R.activateOrCycle(7);
    eq(asked.length, 1, 'it asks, once');
    eq(JSON.stringify(j), before, '⚠ Cancel leaves every field on the job exactly as it was');
    eq(landed.length, 0, 'and goes nowhere');
    const q = asked[0] || '';
    has(q, 'Re-open this job?', 'the question says what it is');
    has(q, 'It was closed on Sep 30, 2026 by Ashley Jerome.', 'names the close it would undo — when, and by whom');
    has(q, 'clears that handover date', 'says the handover date goes');
    has(q, 'When it is closed again, that day is recorded as the handover.', 'and what the next close records');
    has(q, 'Nothing else changes: the hours, the payments and anything already sent stay as they are.',
        'and what it does not touch');
    lacks(q, 'Gmail', 'with no final drafted, it says nothing about a draft');
  }

  group('RE-OPEN — OK undoes the close, keeps a record of it, and lands on the Job Plan');
  {
    const j = JOB();
    reset(true);
    R.jobs = [j];
    R.activateOrCycle(7);
    eq(j.status, 'active', 'the job is active again');
    ok(!('deliveredOn' in j) && !('deliveredAt' in j) && !('deliveredBy' in j),
       '⚠⚠ the handover stamp is cleared — every reader of it reads the job as in progress again');
    eq((j.reopens || []).length, 1, 'and the close it undid is kept');
    const e = (j.reopens || [])[0] || {};
    eq(e.closedOn, '2026-09-30', 'when it was closed');
    eq(e.closedAt, '2026-09-30T19:00:00.000Z', 'the full close timestamp');
    eq(e.closedBy, 'Ashley Jerome', 'who closed it');
    eq(e.reopenedOn, '2026-09-30', 'when it was re-opened');
    ok(/^\d{4}-\d\d-\d\dT/.test(e.reopenedAt || ''), 'with a timestamp');
    eq(e.reopenedBy, 'Anthony Graziano', 'and who re-opened it');
    eq(e.finalDraftVoided, '', 'no final draft was voided');
    eq(j.activatedOn, '2026-09-23', '⚠ the day the job really started is untouched — a Re-open is not an activation');
    eq(landed, [7], '⚠ and it lands on that client\'s Job Plan, as an activation does');
    ok(j.updatedAt > 0, 'saved and synced, with the record clock moved');
  }

  group('RE-OPEN — the rail, the Job Plan and the lost-button gate all follow the stamp back');
  {
    const closed = JOB();
    const sC = rail(closed);
    eq(sC.by.midpoint_received.state, 'open', 'closed: the unpaid midpoint is drawn open');
    ok(R.jobIsSettled(closed), 'closed: settled, so the ✕ Mark lost is hidden');
    eq(R.planCurrentStage(7, closed, ESTR), 'p4', 'closed: the Job Plan marks Close-out');

    const j = JOB();
    reset(true);
    R.jobs = [j];
    R.activateOrCycle(7);
    const s = rail(j);
    eq(s.next && s.next.key, 'midpoint_received', '⚠⚠ re-opened: the light goes back to the midpoint payment the job was on');
    eq(s.by.midpoint_received.state, 'current', 'the row is live again, not open');
    lacks(JSON.stringify(s.rows.map((r) => r.state)), '"open"', 'and no row reads open any more');
    ok(s.outline.some((b) => b.call === 'activateOrCycle(7)' && /Close job/.test(b.label)), 'Close job is back beside the step');
    eq(reopenCalls(s).filter((b) => /Re-open/.test(b.label)).length, 0, 'and Re-open is gone');
    eq(s.by.work_complete.sub, 'Re-opened — the earlier close was undone', '⚠ Work complete says the job was re-opened');
    eq(s.by.work_complete.state === 'done', false, 'and is not done');
    ok(!R.jobIsSettled(j), 'the ✕ Mark lost is offered again — an unsettled job in progress can still be lost');
    eq(R.planCurrentStage(7, j, ESTR), 'p2', 'the Job Plan leaves Close-out for Midpoint & pickups');
  }

  group('RE-OPEN — a final invoice drafted but not sent is voided on the record, and only then');
  {
    const DRAFT = { draftedAt: '2026-09-30T10:00:00Z', draftedBy: 'Anthony Graziano', draftUrl: 'https://mail.google.com/fin',
      pdfOk: true, filedAt: '2026-09-30T10:01:00Z', filedUrl: 'https://drive.example/fin' };
    const j = JOB({ docState: Object.assign({}, JOB().docState, { 'invoice:final': Object.assign({}, DRAFT) }) });
    const s0 = rail(j);
    eq(s0.filled && s0.filled.call, "markDocSent(7,'invoice:final')", 'closed with a final drafted: the band waits on "I\'ve sent it"');
    reset(true);
    R.jobs = [j];
    R.activateOrCycle(7);
    const q = asked[0] || '';
    has(q, 'The final invoice drafted on Sep 30, 2026 billed the job as it stood at the close and no longer applies — delete that draft in Gmail.',
        '⚠⚠ the question says the draft is stale and to delete it in Gmail');
    has(q, 'The copy filed to Drive is replaced when the final goes out.', 'and what happens to the Drive copy');
    const st = (j.docState || {})['invoice:final'] || {};
    ['draftedAt', 'draftedBy', 'draftUrl', 'pdfOk', 'filedAt', 'filedUrl'].forEach((k) =>
      ok(!(k in st), '⚠ the stale draft\'s ' + k + ' is off the record'));
    ok(((j.at || {})['docState:invoice:final'] || 0) > 0, '⚠ the void is STAMPED, so the other device\'s copy of the draft cannot win it back');
    eq(((j.reopens || [])[0] || {}).finalDraftVoided, '2026-09-30T10:00:00Z', 'and the void is recorded on the re-open');
    eq((j.docState || {})['invoice:midpoint'].sentAt, '2026-09-26T10:00:00Z', 'the midpoint\'s own record is untouched');

    // Closed again two days later: the final is offered to SEND, never "I've sent it" over a stale draft.
    today = '2026-10-02';
    reset(true);
    R.activateOrCycle(7);
    eq(j.status, 'closed', 'closed again');
    eq(j.deliveredOn, '2026-10-02', '⚠ the new close stamps its own day');
    eq(asked.length, 1, 'having asked the early-close question again — still no midpoint payment');
    has(asked[0] || '', 'Oct 2, 2026', 'naming the new handover day');
    has(asked[0] || '', 'Until the final invoice goes out, Re-open can undo the close.', 'and that it can be undone');
    const s1 = rail(j, '2026-10-02');
    eq(s1.filled && s1.filled.call, "docAction(7,'invoice','send',{stage:'final'})", '⚠⚠ the band sends a FRESH final');
    lacks(s1.every.map((b) => b.call).join(' '), "openDocDraft(7,'invoice:final')", 'and no link to the stale draft survives');
    eq((j.reopens || []).length, 1, 'the earlier re-open stays on the record');
    today = '2026-09-30';

    // The converse: a final that was SENT is not a stale draft — it blocks the re-open outright (above).
    // A final that was only filed, never drafted, is left alone.
    const filed = JOB({ docState: Object.assign({}, JOB().docState, { 'invoice:final': { filedAt: '2026-09-30T10:01:00Z', filedUrl: 'https://drive.example/fin' } }) });
    reset(true);
    R.jobs = [filed];
    R.activateOrCycle(7);
    eq(filed.status, 'active', 'a final filed but never drafted does not stop the re-open');
    eq(filed.docState['invoice:final'].filedUrl, 'https://drive.example/fin', 'and is not touched — there was no draft to void');
    lacks(asked[0] || '', 'Gmail', 'nor does the question mention one');
  }

  group('RE-OPEN — twice: the history accumulates');
  {
    const j = JOB();
    reset(true);
    R.jobs = [j];
    R.activateOrCycle(7);
    today = '2026-10-01';
    R.activateOrCycle(7);                          // close again
    today = '2026-10-02';
    R.activateOrCycle(7);                          // re-open again
    today = '2026-09-30';
    eq(j.status, 'active', 'active after the second re-open');
    eq((j.reopens || []).map((e) => e.closedOn).join(','), '2026-09-30,2026-10-01', 'both closes are on the record, in order');
    eq((j.reopens || []).map((e) => e.reopenedOn).join(','), '2026-09-30,2026-10-02', 'with both re-opens');
  }

  group('RE-OPEN — the legacy closed job (no handover stamp) is offered Re-open, never Activate');
  {
    // A job closed before the handover stamp shipped (2026-07-30) carries no deliveredOn, so its rail reads
    // Job active undone. Until today that row offered Activate job — a re-open under the wrong name.
    const legacy = JOB({ deliveredOn: undefined, deliveredAt: undefined, deliveredBy: undefined });
    delete legacy.deliveredOn; delete legacy.deliveredAt; delete legacy.deliveredBy;
    const s = rail(legacy);
    eq(s.next && s.next.key, 'job_active', 'its lit row is Job active');
    eq(s.acts('job_active').primary, null, '⚠ which offers no Activate job');
    const r = reopenCalls(s);
    eq(r.length, 1, 'Re-open is offered, once');
    eq((r[0] || {}).label, '&#8634; Re-open job', 'under its own name');
    reset(true);
    R.jobs = [legacy];
    R.activateOrCycle(7);
    lacks(asked[0] || '', 'It was closed on', 'the question names no close date it does not have');
    lacks(asked[0] || '', 'clears that handover date', 'nor a date to clear');
    has(asked[0] || '', 'Re-opening puts it back to Active, so the timeline returns', 'and still says what it does');
    eq(legacy.status, 'active', 'it re-opens');
    eq(((legacy.reopens || [])[0] || {}).closedOn, '', 'recording a close with no known date');
  }

  group('RE-OPEN — one door: the Close question, the ratings and the activation checks never reach it');
  {
    const tr = noComments(fn('applyJobTransition'));
    ok(tr.indexOf("if (j.status === 'closed') return _reopenTransition(j);") > -1, 'the Re-open is its own branch');
    ok(tr.indexOf("if (j.status === 'closed') return _reopenTransition(j);") < tr.indexOf("if (next === 'closed')"),
       '⚠ ahead of the close checks, so the ratings refusal can never land on a Re-open');
    ok(tr.indexOf("if (j.status === 'closed') return _reopenTransition(j);") < tr.indexOf("if (next === 'active' && !j.activatedOn)"),
       'and ahead of the activation stamp, so a Re-open never re-stamps the start');
    eq((noComments(src).match(/applyJobTransition\(/g) || []).length, 2, 'applyJobTransition is defined once and called once');
    eq((noComments(src).match(/_reopenTransition\(/g) || []).length, 2, '_reopenTransition is defined once and called once — from the transition');
    const acts = noComments(fn('jobTimelineActions'));
    has(acts, "if (live && job.status === 'closed' && !jobReopenBlocker(job)) {", 'the rail asks the same blocker');
    has(acts, "out.secondary.push({ label: '&#8634; Re-open job', call: 'activateOrCycle(' + id + ')' });",
        'and offers the same one call as Close, as a secondary');
    has(acts, "if (row.state === 'current' && job.status !== 'closed') out.primary = { label: '&#9654; Activate job'",
        'Activate is never offered on a closed job');
  }

  group('the rendered Client Dashboard: one Re-open on a closed job, one Close once re-opened, nothing twice');
  {
    const FNS = ['_dashUtilityBarHtml', '_jtDocViews', '_jtDraftLink', '_jtDriveLink', '_jtSendAction', 'activeHouseFlags',
      'agreementSignature', 'dashUtilityBar', 'driveFolderPending', 'depositPaidTotal', 'depositTargetFor', 'docDraftedAt',
      'docKeyFor', 'docSentAt', 'esignProviderKey', 'esignAvailable', 'esignJobWatches', 'field', 'fmtMoney', 'getJobActuals',
      'jobLogEntries', 'houseFlagsOf', 'isAgreementSigned', 'isJobFunded', 'isJobWon', 'jobActivationBlockers', 'jobPayments',
      'jobTimeline', 'jobTimelineActions', 'jobTimelineNext', 'jobStageDoc', 'docReadiness', 'docDraftOnly', 'docTitle',
      'docWord', '_jtDocSecondaries', 'agreementReady', 'jobTimelineDoc', 'jobSchedule', 'jtScheduleHtml', 'estWorkingDays',
      'addWorkingDays', 'jobProgress', 'workingDaysInclusive', 'approvedEstimateFor', 'roomStatusNormalize',
      'maybeStartJobsWatch', 'paymentSplit', 'renderClientDashboard', 'sectionHdr', 'stagePaidTotal', 'standingFlagLines',
      'standingFlagsBlock', '_sfHost', '_sfRowHtml', 'mustFindItems', 'mustFoundOf', '_mustFindKey', '_mfHandle',
      'stopJobsWatch', 'unscoredRoomNames', 'isAgreementSent', 'jtBandHtml', 'jtTrackHtml', 'jtRailHtml', '_jtAtFmt',
      '_jtStateCls', 'coWorkingDays', '_coPaceFix', 'coAcceptedHours', 'coHoursTotal', 'coHours', 'coInclTxt', 'fmtDate2',
      'jobReopenBlocker', 'jobStatusView', 'agrApprovalWithdrawn', 'docReadOnlyWord', 'discountOfferBlocker',
      'docPreviewOnly', 'coCardActions', 'estimateEditBlocker', 'priceChangeBlocker'];
    const DVARS = ['_driveFolderInFlight', 'ESIGN_PROVIDERS', 'FIREARMS_PROTOCOL_DOC', 'HOUSE_FLAGS', 'SF_HOSTS', 'JT_LEG_BREAK',
      'JT_SHORT', 'JT_NEXT', 'SVC_LABELS', '_dashNotice', '_jobsWatch', 'jobLogs', 'JT_ROW_DOC', 'DOC_READY_WHY',
      'DOC_KIND_WORD', 'DOC_STAGE_WORD', 'DOC_ACTIONS', 'PRODUCTIVE_HRS_PER_DAY', 'jobPlanStore', 'PROJ_CREW_DAY',
      'TC_DONE_STATUSES', 'PS_DONE_STATUSES', 'ROOM_STATUS_META', 'ROOM_STATUS_LEGACY', 'EST_TOLERANCE_PCT', 'JOB_STATUS_LABELS', 'JOB_STATUS_DOT'];
    const render = (job) => {
      const dom = domStub({});
      const c = sandbox({ fns: FNS, vars: DVARS, stubs: { document: dom, setTimeout: () => 0, clearTimeout: () => {},
        Intl: global.Intl, _todayStr: () => '2026-09-30', jobs: [job], logs: [], changeOrders: [], contractors: [], _photoRefs: {},
        estimateStore: { 7: { estimate: Object.assign({}, ESTR), approved: true, savedAt: 1789067253747 } } } });
      c.jobPlanStore[7] = CLEARED;
      c.renderClientDashboard(7);
      return dom.getElementById('client-dashboard-view').innerHTML;
    };
    const clicks = (h) => (h.match(/onclick="([^"]+)"/g) || []);
    const closedPage = render(JOB());
    eq((closedPage.match(/activateOrCycle\(7\)/g) || []).length, 1, 'a closed job: the transition is on the page once');
    has(closedPage, 'onclick="activateOrCycle(7)">&#8634; Re-open job', 'as Re-open job');
    eq(clicks(closedPage).length, new Set(clicks(closedPage)).size, 'every onclick on the closed job\'s page is unique');

    const j = JOB();
    reset(true);
    R.jobs = [j];
    R.activateOrCycle(7);
    const openPage = render(j);
    eq((openPage.match(/activateOrCycle\(7\)/g) || []).length, 1, 're-opened: the transition is on the page once');
    has(openPage, 'onclick="activateOrCycle(7)">&#9632; Close job', 'as Close job');
    lacks(openPage, 'Re-open job', 'and no Re-open');
    has(openPage, 'Re-opened — the earlier close was undone', 'the rail says the job was re-opened');
    eq(clicks(openPage).length, new Set(clicks(openPage)).size, 'every onclick on the re-opened job\'s page is unique');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('two devices: a Re-open is not undone by the other device\'s older copy of the closed job');
  {
    const GS = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'main-sync.gs'), 'utf8');
    const gsFn = (name) => {
      const re = new RegExp('(^|\\n)function\\s+' + name + '\\s*\\(', 'g');
      const m = re.exec(GS);
      if (!m) throw new Error('not in .gs: ' + name);
      const start = m.index + (m[1] ? m[1].length : 0);
      return GS.slice(start, matchBrace(GS, GS.indexOf('{', re.lastIndex)) + 1);
    };
    const gsVar = (name) => GS.match(new RegExp('(^|\\n)(var\\s+' + name + '\\s*=[^;]*;)'))[2];
    const S = { Date, JSON, Object, Math, Number, String, Array };
    vm.createContext(S);
    vm.runInContext([gsVar('JOB_KEYED_LISTS'), gsVar('JOB_KEYED_MAPS'), gsVar('JOB_LIST_KEY'),
      gsFn('_jobStamp'), gsFn('_jobListKey'), gsFn('_mergeJobKeyed'), gsFn('_mergeJobRecord')].join('\n\n'), S);

    // The desk's copy: closed, with a final drafted at close — stamped when the draft was recorded.
    const T0 = Date.now() - 3600e3;
    const desk = JOB({ updatedAt: T0, at: { 'docState:invoice:final': T0 },
      docState: Object.assign({}, JOB().docState, { 'invoice:final': { draftedAt: '2026-09-30T10:00:00Z', draftUrl: 'https://mail.google.com/fin' } }) });
    // The house re-opens its own copy of the same record.
    const house = JSON.parse(JSON.stringify(desk));
    reset(true);
    R.jobs = [house];
    R.activateOrCycle(7);
    ok(house.updatedAt > T0, 'the re-open moved the record clock (syncJobToSheets)');
    [['desk then house', S._mergeJobRecord(JSON.parse(JSON.stringify(desk)), JSON.parse(JSON.stringify(house)))],
     ['house then desk', S._mergeJobRecord(JSON.parse(JSON.stringify(house)), JSON.parse(JSON.stringify(desk)))]].forEach(([how, out]) => {
      eq(out.status, 'active', how + ': the job stays re-opened');
      ok(!out.deliveredOn, how + ': ⚠ the handover stamp does not come back from the older copy');
      eq((out.reopens || []).length, 1, how + ': the re-open record survives');
      ok(!(((out.docState || {})['invoice:final'] || {}).draftedAt), how + ': ⚠ and the voided final draft does not come back');
    });
  }
};
