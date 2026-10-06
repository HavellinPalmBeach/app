'use strict';
// CLOSE JOB, AND THE MIDPOINT THAT USED TO HOLD IT (2026-09-29, workflow audit H3 and M8).
//
// ⚠⚠ H3 — A FINISHED JOB COULD NOT BE CLOSED OR SENT ITS FINAL UNTIL A MIDPOINT PAYMENT WAS RECORDED.
// The band lights the earliest unfinished step (`jobTimelineNext`). Both midpoint rows sat in front of
// Work complete and the final, and "Close job" lived on Work complete alone (`jobTimelineActions`). The
// client list's Status button — the one other control that could have closed a job — was assigned and
// then overwritten on the very next line of `renderJobs`, so it never rendered. With the midpoint
// invoice sent and unpaid the band read "Collect the midpoint payment" over a house already emptied,
// and the only way past was to record money that had not arrived. Measured on the real rail before the
// change: every room cleared, midpoint sent and unpaid → the filled button is Record payment and ZERO
// rows anywhere offer `activateOrCycle`.
//
// THE DECISION (Q1): close any time after activation, and the final goes out with the midpoint still
// unpaid — the final already reconciles against the payments actually received, so its balance
// carries whatever the midpoint left. So Close job is an outline button beside every live step of an
// active job, and once the job is closed an unsettled midpoint row is OPEN (a sixth state: passed, not
// lit, amber) until the money is in, while the final takes the light.
//
// ⚠⚠ M8 — ON ACTIVATION DAY THE BAND'S ONE FILLED BUTTON WAS "Send midpoint invoice", while the estimate
// tells the client the midpoint is due at the project midpoint. Until the calendar halfway, or half the
// work done, the send is an outline button reading "due around <halfway date>" and the band says to do
// the work.
//
// Everything here drives the REAL functions lifted from havellin.html: the rail, the actions, the band,
// the transition, the Job Plan's stage marker, and the rendered Client Dashboard.

const vm = require('vm');
const { sandbox, source, fn, domStub } = require('./harness');

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();
  const noComments = (s) => s.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

  const TL_FNS = ['agrApprovalWithdrawn', 'jobTimeline', 'depositVoidFlag', 'agreementHandedOverInPerson', '_localDateOf', 'paymentStageWord', 'finalAwaitsHours', 'jobLogEntries', 'estimateIsFeeOnly', 'estDeclutterHrs', 'jobTimelineNext', 'paymentSplit', 'unscoredRoomNames',
    'jobActivationBlockers', 'isJobWon', 'isJobFunded', 'jobPayments', 'stagePaidTotal', 'paymentCounts', 'paymentLive', 'isRefundRecord', 'depositPaidTotal',
    'depositTargetFor', 'docSentAt', 'docKeyFor', 'agreementSignature', 'isAgreementSigned',
    'esignProviderKey', 'esignAvailable', 'esignJobWatches', 'isAgreementSent',
    'jobSchedule', 'jobOnProbateTrack', 'matterDef', 'matterTypeOf', 'invFiduciaryMode', 'isDecedentJob', '_ymdLocal', 'jobProgress', 'estWorkingDays', 'addWorkingDays', 'workingDaysInclusive', 'coWorkingDays',
    '_coPaceFix', 'roomStatusNormalize', 'jtDraftLine', 'staleDraftNote', 'staleDraftsOf', 'draftIsStale', 'draftOutstanding', 'staleDocName', '_draftDay', '_andJoin', 'estimateOutForApproval', 'priceAboveSent', 'docDraftPending', 'priceAboveAcceptance', '_approvedPriceAbove', 'finalCrewOnlyWarn', 'roundCents', 'fmtHrs', 'fmt', 'estateAuthority', 'estateTaxReturnDue', 'estateTaxReturn', 'agreementHandOverDraftNote'];
  const RAIL_FNS = TL_FNS.concat(['jtBandHtml', 'jobTimelineActions', 'jobTimelineDoc', 'jobStageDoc', 'docReadiness', 'esignSignedCopyGaps',
    'docDraftOnly', 'docPreviewOnly', 'docReadOnlyWord', 'discountOfferBlocker', 'docTitle', 'docWord', '_jtDocSecondaries', '_jtDocViews', '_jtDraftLink', '_jtDriveLink',
    '_jtSendAction', 'agreementReady', 'jtRailHtml', 'jtTrackHtml', '_jtAtFmt', '_jtStateCls', 'fmt',
    // ⚠ The REAL date formatter, not the harness's passthrough: the label promises "due around Sep 25, 2026"
    // and a passthrough would read "2026-09-25" and hide a formatting defect in a test that looks green.
    'fmtDate2',
    // The transition behind every Close button, and the one handler both buttons call.
    'applyJobTransition', 'activateOrCycle', 'jobCloseBlockers', 'unratedVendorsForJob', '_assignedVendorsForJob',
    'lookupVendorById', 'vendorIdOf', '_actor', '_handoverBy', 'estimateEditBlocker', 'priceChangeBlocker', 'agreementSignature', 'isAgreementSent', 'docKeyFor', 'draftOutstanding', 'docDraftPending', 'draftIsStale',
    // The Re-open (2026-09-29): the same door, its own branch. Lifted, never stubbed — a stub of "can this job
    // be re-opened" is exactly what would let the rail's button and the transition's refusal disagree.
    'jobReopenBlocker', '_reopenTransition', 'docState', '_jobTouch', 'roundCents',
    // P19: an estate's close names its unsigned Disposition Ledger in the same question.
    'ledgerCloseFlag', 'ledgerSignedCopies', 'signedRecordsOf', 'jobListEntries', '_agrApprover', 'esignFiledCopies']);
  const VARS = ['JT_SHORT', 'DECEDENT_SERVICES', 'MATTER_TYPES', 'JT_NEXT', 'JT_LEG_BREAK', 'JT_ROW_DOC', 'AGR_SIG_METHODS', 'ESIGN_PROVIDERS',
    'DOC_READY_WHY', 'DOC_KIND_WORD', 'DOC_STAGE_WORD', 'DOC_ACTIONS', 'SVC_LABELS', 'ROOM_STATUS_META',
    'ROOM_STATUS_LEGACY', 'TC_DONE_STATUSES', 'PS_DONE_STATUSES', 'PROJ_CREW_DAY', 'PRODUCTIVE_HRS_PER_DAY',
    'JOB_TRANSITIONS', 'LEDGER_SIGNED_REF'];

  const asked = [];
  const filed = [];
  let answer = true;
  const R = sandbox({ fns: RAIL_FNS, vars: VARS, stubs: {
    // P19: a close files the Disposition Ledger in the background (driven in p19-ledger.test.js); recorded here.
    fileDispositionLedger(id, o) { filed.push([id, !!(o && o.auto)]); },
    Intl: global.Intl, _todayStr: () => '2026-09-30', vendorDirectory: [],
    saveJobs() {}, syncJobToSheets() {}, openJobPlanFor() { return false; }, _dashRedraw() { return true; },
    renderClientDashboard() {}, alert() {},
    confirm(m) { asked.push(m); return answer; },
  } });

  // A 6-working-day Estate Settlement activated on Wednesday 23 September: working days 23, 24, 25, 28,
  // 29, 30 — so the halfway point is day 3, Friday 25 September, and the planned end is the 30th.
  // Two rooms of 15 hours each against a 30-hour estimate, so ONE room cleared is exactly half the work.
  const EST = (over) => Object.assign({ svc: 'cleanout', days: 6, totTC: 10, totPS: 20, havellinTotal: 20000,
    rooms: [{ idx: 0, name: 'Kitchen', vol: 3, cplx: 3, tcH: 5, psH: 10 },
            { idx: 1, name: 'Study', vol: 3, cplx: 3, tcH: 5, psH: 10 }] }, over || {});
  const DEP_SENT = { 'invoice:deposit': { draftedAt: '2026-09-15T10:00:00Z', sentAt: '2026-09-15T10:00:00Z' } };
  const MID_SENT = { draftedAt: '2026-09-26T10:00:00Z', sentAt: '2026-09-26T10:00:00Z' };
  const JOB = (over) => Object.assign({ id: 7, hvlId: 'HVL-2609-TZAK', name: 'Ellsworth', svc: 'cleanout',
    status: 'active', won: true, wonAt: '2026-09-10', wonBy: 'Anthony', approved: true,
    agrApproved: true, agrApprovedBy: 'Anthony Graziano', agrSent: true, agrSigned: true,
    created: 'Sep 8, 2026', walkthrough: '2020-01-01', estimateSentDate: 'September 9, 2026',
    start: '2026-09-23', activatedOn: '2026-09-23', depositReceived: true, depositReceivedAt: '2026-09-19',
    docState: Object.assign({}, DEP_SENT),
    payments: [{ id: 1, uid: 'p1', stage: 'deposit', amount: 10000, date: '2026-09-19', method: 'wire' }] }, over || {});
  const CLEARED = { rooms: { 0: { status: 'cleared' }, 1: { status: 'cleared' } } };

  // The whole screen state for one job on one day: rows, the lit row, the band's markup and buttons.
  function rail(job, today, plan, estOver) {
    const rec = { estimate: EST(estOver), approved: true, savedAt: 1789067253747 };
    R.estimateStore = { 7: rec }; R.jobs = [job];
    const prog = R.jobProgress(rec.estimate, plan || null, [], {});
    const sched = today === null ? null : R.jobSchedule(job, rec.estimate, today, prog);
    const rows = R.jobTimeline(job, rec, [], [], sched);
    const next = R.jobTimelineNext(rows);
    const band = R.jtBandHtml(job, rec, rows, next);
    const by = {}; rows.forEach((r) => { by[r.key] = r; });
    const acts = (key) => R.jobTimelineActions(by[key], job, rec);
    const filledAll = band.html.match(/jt-btn-p/g) || [];
    const f = /class="jt-btn jt-btn-p" onclick="([^"]+)">([^<]*)</.exec(band.html);
    const outline = [];
    const re = /class="jt-btn(?: jt-btn-d)?" onclick="([^"]+)">([^<]*)</g;
    let m;
    while ((m = re.exec(band.html)) !== null) outline.push({ call: m[1], label: m[2] });
    return { rec, prog, sched, rows, by, next, band, acts, filledCount: filledAll.length,
             filled: f ? { call: f[1], label: f[2] } : null, outline };
  }
  const has1 = (list, needle) => list.some((b) => b.call === needle || b.label.indexOf(needle) >= 0);

  // ─────────────────────────────────────────────────────────────────────────────
  group('M8 — on activation day the midpoint invoice is NOT the filled button');
  {
    const s = rail(JOB(), '2026-09-23');
    eq(s.sched.state, 'running', 'the schedule is running from the activation');
    eq(s.sched.halfway, '2026-09-25', 'and its halfway point is day 3 of 6, Friday the 25th');
    eq(s.next && s.next.key, 'midpoint_invoiced', 'the lit step is still the midpoint invoice — it IS the next milestone');
    ok(s.by.midpoint_invoiced.notYet, 'but it is not yet due');
    eq(s.by.midpoint_invoiced.dueOn, '2026-09-25', 'and it knows the day it falls due, as a yyyy-mm-dd the renderer formats');
    eq((s.next && s.next.todo), 'Do the work — the midpoint invoice is due at the halfway point',
       'the band says to do the work, and when the invoice falls due');
    ok((s.next && s.next.todo) !== (s.next && s.next.label) && /^Do /.test((s.next && s.next.todo)), 'still a step in the imperative, never the milestone name');

    // ⚠⚠ THE REQUIREMENT, AS WRITTEN: Send midpoint invoice is not the filled button.
    eq(s.filledCount, 0, 'the band carries NO filled button on activation day — nothing is due, the work is');
    const a = s.acts('midpoint_invoiced');
    eq(a.primary, null, 'the midpoint row offers no primary before it is due');
    const send = a.secondary.filter((b) => /Send midpoint invoice/.test(b.label))[0] || null;
    ok(!!send, 'the send is still there, as an outline button, so an early invoice is one press');
    has(send ? send.label : '', 'due around Sep 25, 2026', 'and it says when the invoice falls due, formatted');
    eq(send ? send.call : '', "docAction(7,'invoice','send',{stage:'midpoint'})", 'and it is the same send every document uses');
    ok(has1(s.outline, 'Send midpoint invoice'), 'the band renders it as an OUTLINE button');
    lacks(s.band.html.match(/jt-btn-p[^>]*>[^<]*/g) ? s.band.html.match(/jt-btn-p[^>]*>[^<]*/g).join('') : '',
          'Send midpoint invoice', 'and never as the filled one');
    ok(has1(s.outline, 'activateOrCycle(7)'), 'Close job rides beside it from day one');

    // The rail row keeps its planned date, which says the same day as the button.
    eq(s.by.midpoint_invoiced.plan, '2026-09-25', 'the rail row still carries "Planned halfway point"');
    has(R.jtRailHtml(s.rows), 'Planned halfway point Sep 25, 2026', 'and the rail prints it');
  }

  group('M8 — the midpoint becomes the filled button at the halfway point, or at half the work');
  {
    ok(rail(JOB(), '2026-09-24').by.midpoint_invoiced.notYet, 'day 2: still not due');
    const half = rail(JOB(), '2026-09-25');
    ok(!half.by.midpoint_invoiced.notYet, 'ON the halfway day it is due — the calendar halfway is the day, not the day after');
    eq(half.filled && half.filled.call, "docAction(7,'invoice','send',{stage:'midpoint'})",
       'and Send midpoint invoice is the filled button again');
    eq((half.next && half.next.todo), 'Send the midpoint invoice', 'the band reads the ordinary step');
    ok(!rail(JOB(), '2026-09-28').by.midpoint_invoiced.notYet, 'past the halfway point it stays due');

    // Half the WORK, before the halfway day. One of two equal rooms cleared = exactly 50%.
    const oneCleared = { rooms: { 0: { status: 'cleared' } } };
    const early = rail(JOB(), '2026-09-23', oneCleared);
    eq(early.prog.workPct, 0.5, 'one of the two rooms cleared is exactly half the work');
    ok(!early.by.midpoint_invoiced.notYet, '⚠ half the work done makes it due on day 1, whatever the calendar says');
    eq(early.filled && early.filled.call, "docAction(7,'invoice','send',{stage:'midpoint'})", 'and it is the filled button');
    const locked = rail(JOB(), '2026-09-23', { rooms: { 0: { status: 'locked' } } });
    ok(locked.prog.workPct < 0.5 && locked.by.midpoint_invoiced.notYet, 'one room of two only LOCKED is not half the work — still not due');
    eq(locked.sched.roomsLocked, false, 'and not every room is locked');
    // ⚠⚠ EVERY ROOM LOCKED IS THE PROJECT MIDPOINT — the Job Plan's own definition (its red banner, its
    // derived line, its Midpoint & pickups marker) and the estate agreement's trigger. On HOURS it reads a
    // third here (locking earns the concierge hours only), and the band must not say "not yet" under a
    // banner saying "you're at the project midpoint".
    const allLocked = rail(JOB(), '2026-09-23', { rooms: { 0: { status: 'locked' }, 1: { status: 'locked' } } });
    ok(allLocked.prog.workPct < 0.5, 'every room locked is well under half the work by hours');
    eq([allLocked.prog.nRooms, allLocked.prog.nLocked], [2, 2], 'jobProgress counts the rooms and the locked ones');
    eq(allLocked.sched.roomsLocked, true, 'the schedule carries it');
    ok(!allLocked.by.midpoint_invoiced.notYet, '⚠⚠ every room locked makes the midpoint due, whatever the calendar says');
    eq(allLocked.filled && allLocked.filled.call, "docAction(7,'invoice','send',{stage:'midpoint'})", 'and its send is the filled button');
    // Counted by ROOM, before the hours are read: a room with unreadable hours is still a room.
    const odd = rail(JOB(), '2026-09-23', { rooms: { 0: { status: 'locked' } } },
      { rooms: [{ idx: 0, name: 'Kitchen', vol: 3, cplx: 3, tcH: 5, psH: 10 }, { idx: 1, name: 'Study', vol: 3, cplx: 3 }] });
    eq([odd.prog.nRooms, odd.prog.nLocked], [2, 1], 'a room with no hours on it still counts as a room not yet locked');
    eq(odd.sched.roomsLocked, false, 'so one of two locked is not every room');
    // Excluded rooms are not the job's to lock.
    const excl = rail(JOB(), '2026-09-23', { rooms: { 0: { status: 'locked' } } },
      { rooms: [{ idx: 0, name: 'Kitchen', vol: 3, cplx: 3, tcH: 5, psH: 10 }, { idx: 1, name: 'Guest Bath', excluded: true, tcH: 0, psH: 0 }] });
    eq(excl.sched.roomsLocked, true, 'a room out of scope is not waited on');
    // ⚠ …but NO room in scope is not "every room locked". An estimate whose rooms are all out of scope still
    // prices hours (the job-level work), so the schedule reads progress — and zero of zero is not a midpoint.
    const none = rail(JOB(), '2026-09-23', null,
      { rooms: [{ idx: 0, name: 'Kitchen', excluded: true, tcH: 0, psH: 0 }, { idx: 1, name: 'Study', excluded: true, tcH: 0, psH: 0 }] });
    ok(none.sched.progress, 'an estimate with every room out of scope still reads progress off its hours');
    eq([none.prog.nRooms, none.prog.nLocked], [0, 0], 'it has no rooms in scope to lock');
    eq(none.sched.roomsLocked, false, '⚠ zero rooms is never "every room locked"');
    ok(none.by.midpoint_invoiced.notYet, 'so its midpoint is not due on activation day');
    // A shade under half, on uneven rooms: 15 of 33 hours.
    const uneven = rail(JOB(), '2026-09-23', { rooms: { 0: { status: 'cleared' } } },
      { totTC: 11, totPS: 22, rooms: [{ idx: 0, name: 'Kitchen', vol: 3, cplx: 3, tcH: 5, psH: 10 },
                                      { idx: 1, name: 'Study', vol: 3, cplx: 3, tcH: 6, psH: 12 }] });
    ok(uneven.prog.workPct > 0.45 && uneven.prog.workPct < 0.5 && uneven.by.midpoint_invoiced.notYet,
       'just under half the work is not half — the threshold is >= 50%');
  }

  group('M8 — without a running schedule there is no halfway to wait for, so the invoice is the step as before');
  {
    // ⚠ TWO GUARDS ON `_midNotYet` ARE BELT AND BRACES AND THEIR REVERTS ARE GREEN, recorded here rather than
    // covered by assertions that could not fail: `!_closed` (a running schedule already means no handover
    // stamp) and `_sc.state === 'running'` (the flag is only read on a LIVE row, which needs the job active,
    // and an active job's schedule is running whenever it has a halfway to wait for). See the source.
    const bare = rail(JOB(), null);
    ok(!bare.by.midpoint_invoiced.notYet, 'no schedule passed: not "not yet"');
    eq(bare.filled && bare.filled.call, "docAction(7,'invoice','send',{stage:'midpoint'})", 'Send midpoint invoice is the primary, as it always was');
    const short = rail(JOB(), '2026-09-23', null, { days: 2 });
    eq(short.sched.halfway, '', 'a two-day job has no halfway point');
    ok(!short.by.midpoint_invoiced.notYet, 'so its midpoint is due on day one');
    // A draft means somebody chose to send early — confirming it is the next thing to do.
    const drafted = JOB({ docState: Object.assign({}, DEP_SENT, { 'invoice:midpoint': { draftedAt: '2026-09-23T10:00:00Z', draftUrl: 'https://mail.google.com/x' } }) });
    const d = rail(drafted, '2026-09-23');
    ok(!d.by.midpoint_invoiced.notYet, 'a drafted midpoint is never "not yet"');
    eq(d.filled && d.filled.call, "markDocSent(7,'invoice:midpoint')", 'the filled button is the confirming tap');
    // Home Prep runs on the vendors' calendar.
    const prep = rail(JOB({ svc: 'prep' }), '2026-09-23', null, { svc: 'prep' });
    eq(prep.sched.state, 'vendor', 'a prep job has no calendar halfway');
    ok(!prep.by.midpoint_invoiced.notYet, 'so its midpoint behaves exactly as before');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  group('H3 — every room cleared, midpoint unpaid: Close is reachable, and after closing the FINAL is the primary');
  {
    // The exact state from the audit: work finished, midpoint invoice sent, no midpoint money.
    const job = JOB({ docState: Object.assign({}, DEP_SENT, { 'invoice:midpoint': Object.assign({}, MID_SENT) }) });
    const before = rail(job, '2026-09-30', CLEARED);
    eq(before.prog.workPct, 1, 'every room is cleared');
    eq((before.next && before.next.key), 'midpoint_received', 'the light is on collecting the midpoint');
    eq(before.filled && before.filled.call, "dashRecordPayment(7,'midpoint')", 'Record payment is still the filled button');
    const close = before.outline.filter((b) => b.call === 'activateOrCycle(7)')[0] || null;
    ok(!!close, '⚠⚠ and Close job is reachable from that band — the dead end is gone');
    has(close ? close.label : '', 'Close job', 'labelled as what it does');

    // PRESS IT — the onclick string exactly as the band carries it, run in the page's own scope.
    // Guarded, so a build that offers no Close fails the assertions below cleanly rather than
    // throwing here and leaving the rest of the file unrun (a crash reads as one failure).
    asked.length = 0; answer = true;
    if (close) vm.runInContext(close.call, R);
    eq(job.status, 'closed', 'the job closes');
    eq(job.deliveredOn, '2026-09-30', 'stamped as handed over today');
    eq(asked.length, 1, 'having asked once, because no midpoint payment is recorded');
    eq(filed, [[7, true]], 'P19: and the close files the Disposition Ledger, in the background');

    const after = rail(job, '2026-09-30', CLEARED);
    eq(after.next && after.next.key, 'final_invoiced', '⚠⚠ the FINAL takes the light once the job is closed');
    eq(after.filled && after.filled.call, "docAction(7,'invoice','send',{stage:'final'})", 'and Send final invoice is the band\'s filled button');
    has(after.filled ? after.filled.label : '', 'Send final invoice', 'reading as such');
    eq(after.by.midpoint_invoiced.state, 'done', 'the midpoint invoice went out, so its row is done');
    eq(after.by.midpoint_received.state, 'open', 'the midpoint PAYMENT stays open until it is paid');
    eq(after.by.midpoint_received.sub, 'Unpaid — the final invoice carries it', 'and says what settles it');
    // ⚠ A closed job is offered no CLOSE — and, since 2026-09-29, a Re-open in its place: the same one call,
    // under its own label, as an outline beside the step (the final is still the thing to do next).
    const reo = after.outline.filter((b) => b.call === 'activateOrCycle(7)');
    eq(reo.length, 1, 'a closed job carries the transition exactly once on its band');
    has(reo.length ? reo[0].label : '', 'Re-open job', '⚠⚠ as Re-open job');
    lacks(after.outline.map((b) => b.label).join(' '), 'Close job', 'and never as Close job');
  }

  group('H3 — the midpoint invoice never went out: both rows are open once the job closes, and settle with the final');
  {
    const job = JOB();
    const due = rail(job, '2026-09-28', CLEARED);
    eq((due.next && due.next.key), 'midpoint_invoiced', 'past the halfway point the lit step is sending the midpoint');
    eq(due.filled && due.filled.call, "docAction(7,'invoice','send',{stage:'midpoint'})", 'which is the filled button');
    ok(due.outline.some((b) => b.call === 'activateOrCycle(7)'), 'and Close job sits beside it');

    asked.length = 0; answer = true;
    vm.runInContext('activateOrCycle(7)', R);
    const closed = rail(job, '2026-09-30', CLEARED);
    eq((closed.next && closed.next.key), 'final_invoiced', 'closed: the final is lit');
    eq(closed.by.midpoint_invoiced.state, 'open', 'the unsent midpoint invoice is open, not lit');
    eq(closed.by.midpoint_invoiced.sub, 'Not sent — the final invoice bills it', 'and says the final bills it');
    eq(closed.by.midpoint_received.state, 'open', 'its payment is open too');
    eq(closed.by.midpoint_invoiced.plan, '', '⚠ an open row carries no "Planned halfway point" — that date is history now');
    ok(!/Send midpoint invoice/.test(JSON.stringify(closed.rows.map((r) => closed.acts(r.key)))),
       '⚠⚠ no action on any row offers to send the midpoint once the final bills it — a second bill for one share');

    // The final goes out.
    job.docState['invoice:final'] = { draftedAt: '2026-10-01T10:00:00Z', sentAt: '2026-10-01T10:00:00Z' };
    const sentF = rail(job, '2026-10-01', CLEARED);
    eq(sentF.by.midpoint_invoiced.state, 'done', 'once the final is sent, the midpoint share has been billed');
    eq(sentF.by.midpoint_invoiced.sub, 'Billed on the final invoice', 'and the row says where');
    eq(sentF.by.midpoint_received.state, 'open', 'its payment is still open');
    eq((sentF.next && sentF.next.key), 'final_paid', 'the light moves to collecting the final');

    // The final is paid.
    job.payments.push({ id: 3, uid: 'p3', stage: 'final', amount: 10000, date: '2026-10-05', method: 'check' });
    const paid = rail(job, '2026-10-05', CLEARED);
    eq(paid.by.midpoint_received.state, 'done', 'the final\'s payment settles the midpoint — its share was inside that balance');
    eq(paid.by.midpoint_received.sub, 'Paid with the final invoice', 'and the row says so');
    eq(paid.next, null, 'nothing is left lit');
    has(paid.band.html, 'Every milestone on this job is recorded', 'the band reads Complete');
  }

  group('H3 — an open midpoint can still be paid, and recording it is one press from the strip');
  {
    const job = JOB({ status: 'closed', deliveredOn: '2026-09-30', deliveredBy: 'Anthony Graziano',
      docState: Object.assign({}, DEP_SENT, { 'invoice:midpoint': Object.assign({}, MID_SENT) }) });
    const s = rail(job, '2026-09-30', CLEARED);
    const a = s.acts('midpoint_received');
    eq(a.primary, null, 'the open row offers no primary — the band belongs to the final');
    eq(a.secondary.length, 1, 'one out-of-sequence action');
    const rec = a.secondary[0] || {};   // read defensively: a build that offers nothing must fail here, not throw
    eq(rec.call, "dashRecordPayment(7,'midpoint')", 'recording the midpoint payment');
    has(rec.label || '', 'Record midpoint payment', 'named, because the strip has no row context');
    job.payments.push({ id: 2, uid: 'p2', stage: 'midpoint', amount: 5000, date: '2026-10-02', method: 'check' });
    const paid = rail(job, '2026-10-02', CLEARED);
    eq(paid.by.midpoint_received.state, 'done', 'a midpoint cheque arriving after the close settles the row');
    eq(paid.by.midpoint_received.sub, '$5,000 received', 'reading as money received');
    eq((paid.next && paid.next.key), 'final_invoiced', 'and the final is still the step');
  }

  group('the open state never takes the light, and only ever appears after the close');
  {
    const cases = [
      ['active, midpoint unsent', JOB(), '2026-09-28'],
      ['active, midpoint sent', JOB({ docState: Object.assign({}, DEP_SENT, { 'invoice:midpoint': Object.assign({}, MID_SENT) }) }), '2026-09-28'],
      ['closed, midpoint unsent', JOB({ status: 'closed', deliveredOn: '2026-09-30' }), '2026-09-30'],
      ['closed, midpoint sent', JOB({ status: 'closed', deliveredOn: '2026-09-30',
        docState: Object.assign({}, DEP_SENT, { 'invoice:midpoint': Object.assign({}, MID_SENT) }) }), '2026-09-30'],
      ['closed, midpoint paid', JOB({ status: 'closed', deliveredOn: '2026-09-30', payments: [
        { id: 1, stage: 'deposit', amount: 10000 }, { id: 2, stage: 'midpoint', amount: 5000 }] }), '2026-09-30'],
    ];
    cases.forEach(([name, job, today]) => {
      const s = rail(job, today, CLEARED);
      const lit = s.rows.filter((r) => r.state === 'current' || r.state === 'blocked');
      ok(lit.length <= 1, `${name}: at most one row is lit`);
      ok(!s.next || s.next.state !== 'open', `${name}: the lit row is never an open one`);
      const open = s.rows.filter((r) => r.state === 'open').map((r) => r.key);
      if (!job.deliveredOn) eq(open, [], `${name}: nothing is open before the close`);
      else ok(open.every((k) => k === 'midpoint_invoiced' || k === 'midpoint_received'), `${name}: only the midpoint rows can be open (${open.join(', ') || 'none'})`);
      s.rows.forEach((r) => ok(['done', 'current', 'blocked', 'waiting', 'terminal', 'open'].indexOf(r.state) >= 0,
        `${name} ${r.key}: a known state`));
    });
    eq(rail(cases[4][1], '2026-09-30', CLEARED).rows.filter((r) => r.state === 'open').length, 0,
       'a closed job whose midpoint was paid has nothing open');
    eq(R._jtStateCls({ state: 'open' }), 'jt-open', 'open paints as its own class');
    has(R.jtRailHtml(rail(cases[2][1], '2026-09-30', CLEARED).rows), 'jt-row jt-open', 'on the rail');
    has(R.jtTrackHtml(rail(cases[2][1], '2026-09-30', CLEARED).rows), 'jt-step jt-open', 'and on the track');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  group('Close job: offered on every live step of an ACTIVE job, and nowhere else');
  {
    const act = rail(JOB(), '2026-09-23');
    eq(act.acts('midpoint_invoiced').secondary.filter((b) => b.call === 'activateOrCycle(7)').length, 1, 'once on the lit step of an active job');
    // Not before activation: the lit step there is Activate, and a Close beside it would close a job never started.
    const won = JOB({ status: 'won', activatedOn: '' });
    const w = rail(won, '2026-09-23');
    eq((w.next && w.next.key), 'job_active', 'a funded, signed job waiting to start lights Activate');
    eq(w.filled && w.filled.call, 'activateOrCycle(7)', 'Activate job is the filled button');
    lacks(w.outline.map((b) => b.label).join(' '), 'Close job', 'and there is no Close beside it');
    // Work complete keeps Close as its PRIMARY and gains no duplicate.
    const midPaid = JOB({ docState: Object.assign({}, DEP_SENT, { 'invoice:midpoint': Object.assign({}, MID_SENT) }),
      payments: [{ id: 1, stage: 'deposit', amount: 10000 }, { id: 2, stage: 'midpoint', amount: 5000 }] });
    const wc = rail(midPaid, '2026-09-30', CLEARED);
    eq((wc.next && wc.next.key), 'work_complete', 'with the midpoint paid the light is on Work complete');
    eq(wc.filled && wc.filled.call, 'activateOrCycle(7)', 'Close job is its filled button, as it always was');
    eq((wc.band.html.match(/activateOrCycle\(7\)/g) || []).length, 1, 'and it appears on the band exactly once');
    // A waiting row offers nothing, so the strip under the rail cannot carry a second Close.
    const all = act.rows.map((r) => act.acts(r.key));
    eq(all.reduce((n, a) => n + a.secondary.filter((b) => b.call === 'activateOrCycle(7)').length, 0), 1,
       'across every row of the rail, one Close secondary — the lit one');
    // ⚠⚠ ONE CONTROL RE-OPENS A CLOSED JOB, AND IT IS ON THE LIT ROW ALONE (2026-09-29, restated — until today
    // this pinned that NOTHING did, because the one control that tried, the client list's Status button, never
    // rendered). JOB_TRANSITIONS.closed is still 'active'; what changed is that pressing it now UNDOES the close.
    const closed = rail(JOB({ status: 'closed', deliveredOn: '2026-09-30' }), '2026-09-30', CLEARED);
    const allActs = closed.rows.map((r) => ({ key: r.key, a: closed.acts(r.key) }));
    const reopens = allActs.map((x) => [x.a.primary].concat(x.a.secondary, x.a.doc ? x.a.doc.acts : [])
      .filter((b) => b && b.call === 'activateOrCycle(7)').map((b) => ({ key: x.key, label: b.label })))
      .reduce((x, y) => x.concat(y), []);
    eq(reopens.length, 1, 'across every row of a closed job, the transition is offered exactly once');
    eq(reopens.length ? reopens[0].key : '', closed.next && closed.next.key, '…on the lit row, as the undo beside the step');
    has(reopens.length ? reopens[0].label : '', 'Re-open job', 'labelled Re-open job, never Close or Activate');
    eq(allActs.filter((x) => x.a.primary && x.a.primary.call === 'activateOrCycle(7)').length, 0,
       'and never as a primary — sending the final is still the thing to do next');
    eq(R.JOB_TRANSITIONS.closed, 'active', 'the map entry is the Re-open');
    // Withheld — not offered-and-refused — once the final invoice has gone out, or a final payment is on file.
    const finSent = rail(JOB({ status: 'closed', deliveredOn: '2026-09-30', docState: Object.assign({}, DEP_SENT, {
      'invoice:final': { draftedAt: '2026-09-30T10:00:00Z', sentAt: '2026-09-30T11:00:00Z' } }) }), '2026-09-30', CLEARED);
    eq(finSent.rows.map((r) => finSent.acts(r.key)).map((a) => [a.primary].concat(a.secondary, a.doc ? a.doc.acts : []))
      .reduce((x, y) => x.concat(y), []).filter((b) => b && b.call === 'activateOrCycle(7)').length, 0,
       '⚠⚠ once the final has gone out there is no Re-open anywhere on the rail');
    const finPaid = rail(JOB({ status: 'closed', deliveredOn: '2026-09-30', payments: [{ id: 1, stage: 'deposit', amount: 10000 },
      { id: 3, stage: 'final', amount: 10000 }] }), '2026-09-30', CLEARED);
    eq(finPaid.outline.filter((b) => b.call === 'activateOrCycle(7)').length, 0,
       'nor once a final payment is on file, sent or not');
  }

  group('the early close is asked once, before any midpoint payment, and only then');
  {
    const j = JOB();
    asked.length = 0; answer = false;
    ok(R.applyJobTransition(j) === false, 'Cancel refuses the close');
    eq(j.status, 'active', 'the job stays active');
    ok(!j.deliveredOn, '⚠ and no handover date is stamped on a close that did not happen — the stamp is write-once');
    eq(asked.length, 1, 'having asked exactly once');
    const q = asked[0] || '';
    has(q, 'No midpoint payment is recorded', 'the question names why it is being asked');
    has(q, 'the final invoice bills everything not yet paid', 'says what the final does about it');
    has(q, 'Sep 30, 2026', 'names today as the handover date, formatted');
    // ⚠ Restated 2026-09-29: the question used to say the date "cannot be changed, and a closed job cannot be
    // re-opened". Both went false the moment Re-open landed, and a question that overstates the stakes is
    // one people learn to answer without reading.
    has(q, 'Until the final invoice goes out, Re-open can undo the close', '⚠ says the close can be undone, and until when');
    lacks(q, 'cannot be re-opened', 'and no longer says a closed job stays closed');
    lacks(q, 'cannot be changed', 'nor that the date is permanent');
    has(q, 'press Cancel', 'and how to back out');
    asked.length = 0; answer = true;
    ok(R.applyJobTransition(j) === true, 'OK closes it');
    eq(j.status, 'closed', 'closed');
    eq(j.deliveredOn, '2026-09-30', 'stamped with today');

    // A midpoint payment on file: the normal close, asked nothing — the question is scoped to what is new.
    // ⚠ RESTATED 2026-10-03 (P19): this is an Estate Settlement, and since P19 an estate whose Disposition Ledger has no
    // signed copy on file is named in the same question (flagged, never refused). With a signed copy on file it asks
    // nothing, as before; without one it asks once, about the ledger and not the midpoint.
    const paid = JOB({ payments: [{ id: 1, stage: 'deposit', amount: 10000 }, { id: 2, stage: 'midpoint', amount: 5000 }],
      signedRecords: [{ id: 's1', kind: 'ledger', ref: 'ledger', filedAt: 1 }] });
    asked.length = 0; answer = false;
    ok(R.applyJobTransition(paid) === true, 'a job with its midpoint paid closes');
    eq(asked.length, 0, 'without a question');
    const paidUnsigned = JOB({ payments: [{ id: 1, stage: 'deposit', amount: 10000 }, { id: 2, stage: 'midpoint', amount: 5000 }] });
    asked.length = 0; answer = true;
    ok(R.applyJobTransition(paidUnsigned) === true, 'P19: an estate with no signed ledger still closes on OK');
    eq(asked.length, 1, 'having asked once');
    has(asked[0] || '', 'The Disposition Ledger has no signed copy on file', 'about the ledger');
    lacks(asked[0] || '', 'payment is recorded', 'and not the midpoint, which is paid');
    // ⚠ DEFENSIVE, not a live path: an ACTIVE job carrying a handover date. A Re-open clears the stamp (below),
    // so the only way to reach this is a record written by hand or by an older build. The stamp is still
    // write-once — a close never overwrites one — and the question is not asked over it, because "closing
    // records today" would be false there.
    const stamped = JOB({ deliveredOn: '2026-09-18' });
    asked.length = 0; answer = false;
    ok(R.applyJobTransition(stamped) === true && stamped.deliveredOn === '2026-09-18', 'a close never overwrites a handover date already on the record');
    eq(asked.length, 0, 'and asks nothing — it would be promising a stamp it does not write');
    // Activation is a different transition and never asks about the midpoint.
    const w = JOB({ status: 'won', activatedOn: '', start: '' });
    asked.length = 0; answer = false;
    ok(R.applyJobTransition(w) === true && w.status === 'active', 'activating is untouched');
    eq(asked.length, 0, 'and asks nothing about a midpoint');
    answer = true;
  }

  group('no midpoint draft is offered once the final bills that share');
  {
    const drafted = JOB({ status: 'closed', deliveredOn: '2026-09-30', docState: Object.assign({}, DEP_SENT, {
      'invoice:midpoint': { draftedAt: '2026-09-29T10:00:00Z', draftUrl: 'https://mail.google.com/mid' },
      'invoice:final': { draftedAt: '2026-09-30T10:00:00Z', draftUrl: 'https://mail.google.com/fin' } }) });
    // ⚠ A closed time-and-materials job whose final was drafted had hours logged — the final cannot be built
    // without them. Since 2026-09-29 (audit P10) the rail withholds the final's View/Print while no hours are
    // logged, because the document itself refuses then; this fixture used to leave the log empty, a state
    // the app cannot reach with a drafted final, so it now carries the day's hours the final was built from.
    R.jobLogs = { 7: [{ id: 1, date: '2026-09-29', members: [{ name: 'Ashley Jerome', role: 'TC', hours: 10 }, { name: 'Crew', role: 'PS', hours: 20 }] }] };
    const s = rail(drafted, '2026-09-30', CLEARED);
    delete R.jobLogs;
    const mid = s.acts('midpoint_invoiced');
    ok(!!mid.doc, 'the midpoint invoice can still be read');
    ok(((mid.doc || {}).acts || []).some((b) => /View midpoint invoice/.test(b.label)), 'View is there');
    lacks(((mid.doc || {}).acts || []).map((b) => b.call).join(' '), 'openDocDraft', '⚠ but its draft link is withheld on a closed job');
    R.jobLogs = { 7: [{ id: 1, date: '2026-09-29', members: [{ name: 'Ashley Jerome', role: 'TC', hours: 10 }, { name: 'Crew', role: 'PS', hours: 20 }] }] };
    const fin = s.acts('final_invoiced');
    delete R.jobLogs;
    has(((fin.doc || {}).acts || []).map((b) => b.call).join(' '), "openDocDraft(7,'invoice:final')", 'the FINAL draft is still offered — the rule is the midpoint alone');
    eq(s.filled && s.filled.call, "markDocSent(7,'invoice:final')", 'and the final\'s confirming tap is the filled button');
    const live = rail(JOB({ docState: Object.assign({}, DEP_SENT, {
      'invoice:midpoint': { draftedAt: '2026-09-29T10:00:00Z', draftUrl: 'https://mail.google.com/mid' } }) }), '2026-09-29', CLEARED);
    has(((live.acts('midpoint_invoiced').doc || {}).acts || []).map((b) => b.call).join(' '), 'openDocDraft',
        'before the close the midpoint draft link is offered exactly as before');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  group('the Job Plan marks a closed job as in Close-out, whatever the midpoint says');
  {
    const c = sandbox({ fns: ['planCurrentStage', '_planRooms', '_planRoomStatus', 'roomStatusNormalize', 'stagePaidTotal', 'paymentCounts', 'jobPayments', 'roundCents', 'paymentLive', 'isRefundRecord'],
      vars: ['jobPlanStore', 'estimateStore', 'TC_DONE_STATUSES', 'PS_DONE_STATUSES', 'ROOM_STATUS_META', 'ROOM_STATUS_LEGACY'] });
    c.estimateStore[7] = { estimate: EST() };
    c.jobPlanStore[7] = { rooms: { 0: { status: 'cleared' }, 1: { status: 'cleared' } } };
    const est = c.estimateStore[7].estimate;
    eq(c.planCurrentStage(7, JOB(), est), 'p2', 'active, cleared, midpoint unpaid → still Midpoint & pickups (money first)');
    eq(c.planCurrentStage(7, JOB({ status: 'closed', deliveredOn: '2026-09-30' }), est), 'p4',
       '⚠ closed with the midpoint unpaid → Close-out: the final settles it now');
    c.jobPlanStore[7] = {};
    eq(c.planCurrentStage(7, JOB({ status: 'closed', deliveredOn: '2026-09-30' }), est), 'p4',
       'a closed job is in close-out even with no room statuses recorded');
  }

  group('the Job Plan\'s red "you\'re at the project midpoint" banner agrees with the band, and stands down once closed');
  {
    // The REAL renderJobPlan, in the sandbox field-capture drives it in. The banner reads every room
    // locked and the midpoint invoice unsent; it is what the band's "every room locked is due" rule was
    // brought into line with, and it must not go on asking for the midpoint after the final bills it.
    const dom = domStub({});
    const P = sandbox({
      fns: ['renderJobPlan', 'planTaskCtx', 'jobOnProbateTrack', 'invFiduciaryMode', 'isDecedentJob', 'planTasksFor', 'planTasksHtml', 'planTaskSectionsHtml', 'planSubsec', 'chkGrid',
            'planChk', '_planTaskDone', 'planPhaseWrap', 'secCaret', 'planDerivedHtml', 'planDerivedLines', 'estateAuthority', 'estateTaxReturn', 'jobListEntries', 'siteFindsCardHtml', 'siteFindsOf', '_planRooms', '_planRoomStatus', 'donationReceiptLine', 'ledgerDerivedLines', 'ledgerSignedCopies', 'signedRecordsOf', '_agrApprover', 'jobTakesProceedsStatements', 'proceedsLine',
            '_planRoomListHtml', '_shotCount', '_slotRefs', 'roomStatusNormalize', 'firearmsBannerHtml', 'firearmsWorkspaceLine',
            'firearmsFlaggedAtIntake', '_firearmsRow', 'houseFlagsOf', '_jobInvRefs', '_srcLineKey',
            'planGateChipsHtml', 'vendorSourcingProgress', 'logisticsLinesFor', 'logisticsLineOn', 'logisticsCatsFor', 'jobTeamGateLine', 'crewDuplicates', 'isCrewPlaceholder', 'samePerson', 'canonPersonName', 'planVendorsMeta', 'planStageMeta', 'planHoursMeta', 'planHoursMetaHtml', 'planHoursRuleTxt', '_hrsTxt',
            'planStageCard', 'planStageState', 'planCurrentStage', 'matterTypeOf', 'matterDef', 'docTierOf', 'docTierDef', 'docTierProduces', 'svcHasDocStep', 'estimateIsFeeOnly', 'estDeclutterHrs', 'jobIsFeeOnly', 'renderCloseoutCard', 'renderCloseoutBody', 'closeoutState', 'closeoutMeta', '_assignedVendorsForJob', 'unratedVendorsForJob', 'lookupVendorById', 'vendorIdOf', 'bestClientEmail', '_coFmt', 'computeVendorAvg', 'esc', 'fmtDate2', 'coAcceptedHours', 'coHoursTotal', 'coHours', 'clientRecipient', 'firstName', 'jobAppraisalDuty', 'approvedEstimateFor', 'appraisalDuty', 'estimateDocScope', 'estimateAppraiserLines', 'docScopeDef', 'jobPrepLines', 'coPrepVendorLines', 'coVendorAdds', 'roundCents', 'fmtHrs', 'fmt'],
      vars: ['DECEDENT_SERVICES', 'SVC_LABELS', '_planOpenPhases', 'PLAN_TASKS', 'PLAN_FLOW', 'FIREARMS_PROTOCOL_DOC', 'HOUSE_FLAGS', 'jobPlanStore', 'estimateStore', 'LEDGER_SIGNED_REF', 'INV_SALE_DISPOSITIONS',
             'TC_DONE_STATUSES', 'PS_DONE_STATUSES', 'ROOM_STATUS_META', 'ROOM_STATUS_LEGACY', 'INV_RELEASE_DISPOSITIONS', 'changeOrders', 'MATTER_TYPES', 'DOC_TIERS', 'DOC_TIER_FROM_SCOPE', 'JOB_STEPS', 'LOGISTICS_CATEGORIES', 'LOG_PLACEHOLDER_NAMES', 'CONTRACTOR_TC_NAME', 'PERSON_NAME_ALIASES', 'DOC_SCOPES', 'ESTATE_AUTHORITIES', 'SITE_FIND_KINDS'],
      stubs: {
        document: dom, isFormalDoc: () => false, _todayStr: () => '2026-09-24',
        _sfHost: () => '', renderVendorSourcing: () => '', renderVendorScorecard: () => '', renderDailyCloseBlock: () => '',
        _importableFromEstimate: () => ({ collections: [], vehicles: [] }), getPlanNote: () => '',
        paymentSplit: () => ({ midpoint: 5000 }), planScheduleHtml: () => '',
        docSentAt: () => null, isAgreementSigned: () => true, isJobFunded: () => true, depositPaidTotal: () => 10000,
        stagePaidTotal: () => 0, jobLogEntries: () => [], _photoRefs: { 7: [] },
      },
    });
    const est = EST();
    P.estimateStore[7] = { estimate: est, approved: true };
    P.jobPlanStore[7] = { rooms: { 0: { status: 'locked' }, 1: { status: 'locked' } } };
    const BANNER = 'All rooms are locked';
    const open = P.renderJobPlan(7, JOB(), est);
    has(open, BANNER, 'an active job with every room locked and the midpoint unsent carries the red banner');
    has(open, "openInvoiceFor(7,'midpoint')", 'with its button to the midpoint invoice');
    // …and the band on the same day agrees: every room locked makes the midpoint due.
    const same = rail(JOB(), '2026-09-24', { rooms: { 0: { status: 'locked' }, 1: { status: 'locked' } } });
    eq(same.filled && same.filled.call, "docAction(7,'invoice','send',{stage:'midpoint'})",
       '⚠⚠ and the band beside it asks for the same invoice — before the halfway day, because every room is locked');
    lacks(same.band.html, 'Do the work', 'it never says "not yet" under a banner saying "you\'re at the project midpoint"');
    const closed = P.renderJobPlan(7, JOB({ status: 'closed', deliveredOn: '2026-09-30', deliveredBy: 'Anthony Graziano' }), est);
    lacks(closed, BANNER, '⚠⚠ once the job is closed the banner stands down — the final bills that share now');
    lacks(closed, "openInvoiceFor(7,'midpoint')", 'and nothing on the plan offers the midpoint invoice');
    has(closed, 'not sent — the job is closed, so the final invoice bills it',
        '⚠ the Midpoint invoice sent line says the final bills it, rather than "send it … collection takes time"');
    lacks(closed, 'collection takes time', 'the instruction to send it is gone from a closed job');
    has(open, 'collection takes time', 'the converse: on an active job it still says to send it');
    P.jobPlanStore[7] = { rooms: { 0: { status: 'locked' } } };
    lacks(P.renderJobPlan(7, JOB(), est), BANNER, 'one room of two locked: no banner (the converse)');
  }

  group('the rendered Client Dashboard: activation day and after the close');
  {
    // Everything lifted verbatim — the list the utility-bar suite resolved by driving the renderer —
    // with the REAL date formatter and a pinned today, so "due around" reads a real day.
    const FNS = ['_dashUtilityBarHtml', '_jtDocViews', '_jtDraftLink', '_jtDriveLink', '_jtSendAction',
      'activeHouseFlags', 'agreementSignature', 'dashUtilityBar', 'driveFolderPending', 'depositPaidTotal', 'depositTargetFor',
      'docKeyFor', 'docSentAt', 'esignProviderKey', 'esignAvailable', 'esignJobWatches', 'field',
      'getJobActuals', 'jobLogEntries', 'houseFlagsOf', 'isAgreementSigned', 'isJobFunded', 'isJobWon',
      'jobActivationBlockers', 'jobPayments', 'agrApprovalWithdrawn', 'jobTimeline', '_localDateOf', 'paymentStageWord', 'finalAwaitsHours', 'estimateIsFeeOnly', 'estDeclutterHrs', 'jobTimelineActions', 'esignSignedCopyGaps', 'docReadOnlyWord', 'discountOfferBlocker', 'jobTimelineNext', 'depositVoidFlag', 'agreementHandedOverInPerson',
      'jobStageDoc', 'docReadiness', 'docDraftOnly', 'docTitle', 'docWord', '_jtDocSecondaries', 'docPreviewOnly',
      'agreementReady', 'jobTimelineDoc',
      'jobSchedule', 'jobOnProbateTrack', 'estatePackageRoute', 'matterDef', 'matterTypeOf', 'invFiduciaryMode', 'isDecedentJob', 'jtScheduleHtml', '_jtSchedDeadlinesHtml', 'estWorkingDays', 'addWorkingDays', '_ymdLocal', 'jobProgress',
      'workingDaysInclusive', 'approvedEstimateFor', 'roomStatusNormalize',
      'maybeStartJobsWatch', 'paymentSplit', 'renderClientDashboard', 'coFiduciaryRepClash', 'coFiduciaryRepRefusal', 'walkawaySettlementHtml', 'walkawaySettlement', 'jobRefundedTotal', 'refundCounts', 'jobPaymentsListHtml', '_paymentKey', 'paymentStageLabel', 'paymentMethodLabel', 'fmt', 'sectionHdr', 'stagePaidTotal', 'paymentCounts', 'paymentLive', 'isRefundRecord',
      'standingFlagLines', 'standingFlagsBlock', '_sfHost', '_sfRowHtml', 'mustFindItems', 'mustFoundOf', '_mustFindKey', '_mfHandle',
      'stopJobsWatch', 'unscoredRoomNames', 'isAgreementSent', 'jtBandHtml', 'jtTrackHtml', 'jtRailHtml', '_jtAtFmt', '_jtStateCls',
      'coWorkingDays', '_coPaceFix', 'coAcceptedHours', 'coHoursTotal', 'coHours', 'coInclTxt', 'fmtDate2', 'estimateEditBlocker', 'priceChangeBlocker', 'jobStatusView', 'jtDraftLine', 'staleDraftNote', 'staleDraftsOf', 'draftIsStale', 'draftOutstanding', 'staleDocName', '_draftDay', '_andJoin', '_dashNoticeHtml', 'estimateOutForApproval', 'priceAboveSent', 'docDraftPending', 'priceAboveAcceptance', '_approvedPriceAbove',
      'jobReopenBlocker', 'coScopeLabel', 'coVendorAddsTxt', 'coVendorAdds', 'coHoursLabel', 'escLines', 'finalCrewOnlyWarn', 'agreementChipFix', 'roundCents', 'fmtHrs', 'estateAuthority', 'jobFiduciaries', 'estateTaxReturnDue', 'jobListEntries', 'estateTaxReturn', 'esignFiledCopies', 'agreementHandOverDraftNote', 'estatePackageOrphanDraftNote'];
    const DVARS = ['_driveFolderInFlight', 'PROBATE_PKG_KEY', 'MATTER_TYPES', 'DECEDENT_SERVICES', 'ESIGN_PROVIDERS', 'FIREARMS_PROTOCOL_DOC', 'HOUSE_FLAGS', 'SF_HOSTS', 'JT_LEG_BREAK', 'PAYMENT_STAGE_LABELS',
      'JT_SHORT', 'JT_NEXT', 'SVC_LABELS', '_dashNotice', '_jobsWatch', 'jobLogs', 'JT_ROW_DOC', 'DOC_READY_WHY',
      'DOC_KIND_WORD', 'DOC_STAGE_WORD', 'DOC_ACTIONS', 'PRODUCTIVE_HRS_PER_DAY', 'jobPlanStore', 'PROJ_CREW_DAY',
      'TC_DONE_STATUSES', 'PS_DONE_STATUSES', 'ROOM_STATUS_META', 'ROOM_STATUS_LEGACY', 'EST_TOLERANCE_PCT', 'JOB_STATUS_LABELS', 'JOB_STATUS_DOT', '_dashShown', '_dashKeepNotice'];
    function render(job, today, plan) {
      const dom = domStub({});
      const c = sandbox({ fns: FNS, vars: DVARS, stubs: {
        document: dom, setTimeout: () => 0, clearTimeout: () => {}, Intl: global.Intl, _todayStr: () => today,
        jobs: [job], logs: [], changeOrders: [], contractors: [], _photoRefs: {},
        estimateStore: { 7: { estimate: EST(), approved: true, savedAt: 1789067253747 } } } });
      if (plan) c.jobPlanStore[7] = plan;
      c.renderClientDashboard(7);
      return dom.getElementById('client-dashboard-view').innerHTML;
    }
    const onclicks = (h) => (h.match(/onclick="[^"]*"/g) || []);

    const day1 = render(JOB(), '2026-09-23');
    const bandOf = (h) => { const i = h.indexOf('class="jt-next'); return i < 0 ? '' : h.slice(i, h.indexOf('class="jt-track', i)); };
    const b1 = bandOf(day1);
    ok(b1.length > 0, 'the NEXT band renders on activation day');
    eq((b1.match(/jt-btn-p/g) || []).length, 0, 'with no filled button');
    has(b1, 'Send midpoint invoice &mdash; due around Sep 25, 2026', 'the midpoint send is an outline button naming the day');
    has(b1, 'Do the work', 'and the band tells the concierge to do the work');
    has(b1, '&#9632; Close job', 'Close job is on the band from day one');
    const d1 = onclicks(day1);
    eq(d1.length, new Set(d1).size, 'every onclick on the rendered dashboard is unique');

    const closedJob = JOB({ status: 'closed', deliveredOn: '2026-09-30', deliveredBy: 'Anthony Graziano',
      docState: Object.assign({}, DEP_SENT, { 'invoice:midpoint': Object.assign({}, MID_SENT) }) });
    const after = render(closedJob, '2026-09-30', CLEARED);
    const b2 = bandOf(after);
    eq((b2.match(/jt-btn-p/g) || []).length, 1, 'after the close the band has exactly one filled button');
    has(b2, "jt-btn jt-btn-p\" onclick=\"docAction(7,'invoice','send',{stage:'final'})\"", 'and it sends the FINAL invoice');
    has(after, 'jt-row jt-open', 'the unpaid midpoint is drawn open on the rail');
    has(after, 'Unpaid — the final invoice carries it', 'saying what settles it');
    has(after, "dashRecordPayment(7,'midpoint')", 'and its payment can be recorded from the strip');
    lacks(after, "docAction(7,'invoice','send',{stage:'midpoint'})", 'nothing on the page sends the midpoint again');
    // ⚠ Restated 2026-09-29: the page used to carry no transition at all on a closed job. It carries ONE, the
    // Re-open, as an outline in the band — never in the strip, never twice.
    eq((after.match(/activateOrCycle\(7\)/g) || []).length, 1, 'the transition is on the page exactly once');
    has(b2, 'jt-btn" onclick="activateOrCycle(7)">&#8634; Re-open job', 'as an outline Re-open job, in the band');
    const d2 = onclicks(after);
    eq(d2.length, new Set(d2).size, 'every onclick on the closed job\'s dashboard is unique');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  group('the dead Status button and the function behind it are gone');
  {
    lacks(noComments(src), 'cycleStatus', 'no live line names cycleStatus — the button never rendered and its handler had one caller');
    lacks(fn('renderJobs'), 'Status</button>', 'the client list builds no Status button');
    has(fn('renderJobs'), 'openClientDashboard(', 'it still opens the client');
    // One reader of the transition map: the timeline's handler.
    const callers = (noComments(src).match(/applyJobTransition\(/g) || []).length;
    eq(callers, 2, 'applyJobTransition is defined once and called once — from activateOrCycle');
  }

  group('the stylesheet paints the open state on the rail and on the track');
  {
    const css = src.slice(src.indexOf('<style>'), src.indexOf('</style>'));
    has(css, '.jt-row.jt-open::before{', 'the rail node');
    has(css, '.jt-row.jt-open{border-left-color:var(--warn-tx);}', 'the rail thread');
    has(css, '.jt-step.jt-open .jt-node{', 'the track node');
    has(css, '.jt-step.jt-open::after{', 'the track connector');
  }
};
