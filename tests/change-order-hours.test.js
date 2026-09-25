'use strict';
// AN ACCEPTED CHANGE ORDER IS PART OF THE HOURS THE JOB IS MEASURED AGAINST (2026-09-25).
//
// Anthony, on the list of what the fixed-price change-order build had found and not fixed: *"Fix
// everything you highlighted."* Three items:
//
//   1. THE HOURS BASELINES NEVER INCLUDED ACCEPTED CHANGE-ORDER HOURS. The Client Dashboard's Hours
//      Log bars, the Job Plan's hours summary, the Hours fold, the desk card's hours line, the
//      projection and the schedule strip all measured against `est.totTC` / `est.totPS` alone,
//      while the invoice's variance gate moved with the change orders. So a T&M job holding a
//      signed +40-hour change order read "STOP … No further scope work until a signed Change
//      Order" over the hours the client had just signed for, and a fixed-price job read "margin at
//      risk" on hours it had been paid for. The schedule's own advice — "raise a change order if
//      the scope grew" — could never clear the flag it was attached to, because accepting one
//      moved nothing.
//   2. THE ESTATE AGREEMENT'S §4.2 CHANGE ORDER FORM printed "Additional Cost Estimate $" and
//      "Revised Total Estimate $" on both bases — a price field, inside a signed contract, on the
//      T&M change order the app itself refuses to price.
//   3. A FEE-ONLY HOME PREP JOB'S CHANGE ORDER READOUT said "this job has no approved estimate
//      yet" over a job whose approved estimate simply prices no hours.
//
// ⚠⚠ THE SPLIT THIS FILE PINS HARDEST: HOURS are measured against the AUTHORISED budget (estimate
// + accepted change orders); WORK DONE stays on the estimate's rooms, because nothing ever marks a
// change order's hours complete — folding them in would leave a finished job reading 84% done.

const { sandbox, source, fn, domStub } = require('./harness');

const noComments = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

// 80 TC + 60 PS on the estimate (140 hrs); a +20 / +20 change order takes it to 180.
const ROOMS = [{ idx: 0, name: 'Kitchen', tcH: 40, psH: 30 }, { idx: 1, name: 'Garage (2-car)', tcH: 40, psH: 30 }];
const EST_TM = { jobId: 7, svc: 'cleanout', totTC: 80, totPS: 60, psCount: 2, tcRate: 150, psRate: 100,
                 fixedPrice: false, rooms: ROOMS, havellinTotal: 19940, tcFee: 12000, psFee: 6000 };
const EST_FX = Object.assign({}, EST_TM, { fixedPrice: true, fixedAmount: 26000, havellinTotal: 26000 });
const JOB = { id: 7, hvlId: 'HVL-0007', name: 'Butler Estate', svc: 'cleanout', addr: '69 Beach Blvd',
              tc: 'Anthony Graziano', status: 'active', premium: false };

function co(tc, ps, id, extra) {
  return Object.assign({ id: id || 100, jobId: 7, description: 'Guest house added to scope', reason: 'scope_add',
                         tcHrs: tc, psHrs: ps, createdAt: 'Sep 25, 2026',
                         clientApproved: false, clientName: '', clientAcceptedAt: '' }, extra || {});
}
function accepted(tc, ps, id, extra) {
  return co(tc, ps, id, Object.assign({ clientApproved: true, clientName: 'Tripp Butler',
                                        clientAcceptedAt: 'September 25, 2026' }, extra || {}));
}
const LOG = (tc, ps) => [{ date: '2026-09-20', members: [{ name: 'A', role: 'TC', hours: tc }, { name: 'C', role: 'PS', hours: ps }] }];

const CO = ['coAcceptedHours', 'coHoursTotal', 'coHours'];

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();

  // ═══════════════════════════════════════════════════════════════════════════
  group('coAcceptedHours — the ONE sum of the hours the client has signed for beyond the estimate');
  {
    const c = sandbox({ fns: CO, stubs: { changeOrders: [
      accepted(20, 20, 50), accepted(-4, 0, 60), co(99, 99, 70),              // one pending
      accepted(8, 8, 80, { jobId: 8 }),                                        // another job's
    ] } });
    const h = c.coAcceptedHours(7);
    eq(h.tc, 16, 'accepted concierge hours summed, a reduction netted off (20 − 4)');
    eq(h.ps, 20, 'accepted specialist hours summed');
    eq(h.total, 36, 'and the total');
    eq(h.n, 2, 'counting the two accepted orders');
    // ⚠ The draft is the case that matters: an unaccepted change order authorises nothing, so it
    // must never raise the bar the crew is measured against.
    ok(h.tc < 99, '⚠ a PENDING change order adds nothing — clientApproved is the filter, as on the invoice');
    eq(c.coAcceptedHours(8).total, 16, 'another job’s change orders are its own');
    eq(c.coAcceptedHours(9).total, 0, 'a job with none reads zero');

    const bare = sandbox({ fns: CO });
    eq(bare.coAcceptedHours(7).total, 0, 'and with no change-order store at all it reads zero rather than throwing');

    const t = sandbox({ fns: ['coInclTxt'] });
    eq(t.coInclTxt({ tc: 20, ps: 20 }), 'incl. +40.0 hrs by change order', 'the baseline label names the change-order share');
    eq(t.coInclTxt({ tc: -6 }), 'incl. −6.0 hrs by change order', 'a reduction keeps the minus outside the figure');
    eq(t.coInclTxt({ tc: 0, ps: 0 }), '', 'and nothing at all when there is none');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠⚠ jobProgress — HOURS against the authorised budget, WORK DONE on the estimate’s rooms');
  {
    const P = sandbox({ fns: ['jobProgress', 'roomStatusNormalize'],
                        vars: ['PROJ_CREW_DAY', 'TC_DONE_STATUSES', 'PS_DONE_STATUSES', 'ROOM_STATUS_META', 'ROOM_STATUS_LEGACY'] });
    const PLAN = { rooms: { 0: { status: 'cleared' }, 1: { status: 'cleared' } } };
    const base = P.jobProgress(EST_TM, PLAN, LOG(100, 70));
    const withCO = P.jobProgress(EST_TM, PLAN, LOG(100, 70), { tc: 20, ps: 20 });

    eq(withCO.coTC, 20, 'the change-order hours are carried');
    eq(withCO.authTC, 100, 'the authorised concierge budget is 80 + 20');
    eq(withCO.authPS, 80, 'the authorised specialist budget is 60 + 20');
    eq(withCO.authHrs, 180, 'and the whole budget 180');
    eq(Math.round(withCO.hoursPct * 100), 94, '⚠⚠ 170 logged is 94% of the authorised 180 …');
    eq(Math.round(base.hoursPct * 100), 121, '… where against the estimate alone it read 121% — over the line on signed-for hours');
    eq(withCO.estTC, 80, 'the estimate’s own hours are unchanged');
    // ⚠⚠ THE HALF THAT MUST NOT MOVE. Every room is cleared: the work is done. Folding the change
    // order into the work denominator would read 78% here forever.
    eq(withCO.workPct, 1, '⚠⚠ work done stays on the rooms — every room cleared is 100%, change order or not');
    eq(withCO.workPct, base.workPct, 'identical to the job with no change order');
    eq(withCO.wholePctTC, base.wholePctTC, 'and the projection’s tier gate reads the same room fraction');

    const three = P.jobProgress(EST_TM, PLAN, LOG(100, 70));
    eq(JSON.stringify(three), JSON.stringify(P.jobProgress(EST_TM, PLAN, LOG(100, 70), { tc: 0, ps: 0 })),
       'a three-argument call is byte-identical to one with no change-order hours');
    const noRooms = P.jobProgress(Object.assign({}, EST_TM, { rooms: [] }), PLAN, [], { tc: 14, ps: 0 });
    eq(noRooms.coTC, 14, '⚠ the change-order hours are carried even on an estimate with no rooms — the plan length reads them');
    eq(noRooms.has, false, 'while the progress reading itself stays unavailable there');
    const cut = P.jobProgress(EST_TM, PLAN, LOG(10, 10), { tc: -200, ps: 0 });
    eq(cut.authTC, 0, 'a reduction larger than the estimate floors the budget at zero rather than going negative');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠⚠ the projection — red over signed-for hours before, on track against them now');
  {
    function projection(cos, fixed) {
      const dom = domStub({});
      const saved = [];
      const C = sandbox({
        fns: ['renderProjection', 'computeProjection', 'jobProgress', 'getJobPlan', 'roomStatusNormalize', 'projBandHtml',
              'estTolerancePctTxt', 'coHoursLabel'].concat(CO),
        vars: ['PROJ_CREW_DAY', 'TC_DONE_STATUSES', 'PS_DONE_STATUSES', 'jobPlanStore', 'estimateStore', 'currentEstimate',
               'ROOM_STATUS_META', 'ROOM_STATUS_LEGACY', 'EST_TOLERANCE_PCT'],
        stubs: { document: dom, saveJobPlan: (id) => saved.push(id), changeOrders: cos,
                 // Half the room work done (the kitchen cleared) on 60 TC + 45 PS: a rate that projects
                 // 120 TC / 90 PS for the whole job.
                 jobLogEntries: () => LOG(60, 45) },
      });
      C.jobPlanStore[7] = { rooms: { 0: { status: 'cleared' } } };
      C.estimateStore[7] = { estimate: Object.assign({}, fixed ? EST_FX : EST_TM) };
      C.renderProjection(7);
      return { snap: C.jobPlanStore[7].lastProjection, html: dom.getElementById('projection-output').innerHTML };
    }
    const before = projection([]);
    eq(before.snap.projTC, 120, 'the rate projects 120 concierge hours');
    eq(before.snap.headlineBand, 'red', 'against the estimate’s 80 that is red …');
    has(before.html, 'STOP', '… and a T&M job is told to stop');

    const after = projection([accepted(40, 30, 50)]);
    eq(after.snap.estTC, 120, '⚠⚠ with the +40 / +30 change order accepted the concierge budget is 120');
    eq(after.snap.triggerTC, 138, 'and the ±15% line sits on it — 138, read off EST_TOLERANCE_PCT');
    eq(after.snap.headlineBand, 'green', '⚠⚠ so the same hours are ON TRACK — the client signed for them');
    lacks(after.html, 'STOP', '⚠⚠ and nobody is told to stop work the client authorised');
    has(after.html, 'Estimated hours include +40.0 concierge / +30.0 specialist hrs from accepted change orders',
        'the card says its estimated figures carry the change orders');
    eq(after.snap.projTC, before.snap.projTC, 'the projected hours themselves do not move — only the line they are measured against');

    const pending = projection([co(40, 30, 50)]);
    eq(pending.snap.headlineBand, 'red', '⚠ an UNACCEPTED change order moves nothing — still red');
    lacks(pending.html, 'Estimated hours include', 'and the card claims no change-order hours');

    const fx = projection([accepted(40, 30, 50)], true);
    eq(fx.snap.headlineBand, 'green', 'a fixed-price job is measured against the scope it was paid for too');
    lacks(fx.html, 'margin at risk', 'so no margin warning on hours the change order priced');

    has(noComments(fn('computeProjection')), 'var estTC = P.authTC, estPS = P.authPS;',
        'the projection reads the authorised budget off the shared measurement, never a second sum');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠⚠ coWorkingDays — an accepted change order lengthens the plan by its MARGINAL days');
  {
    const W = sandbox({ fns: ['coWorkingDays', 'estWorkingDays'], vars: ['PRODUCTIVE_HRS_PER_DAY'] });
    const est = { svc: 'cleanout', days: 6, totTC: 42, totPS: 70, psCount: 2 };
    eq(W.coWorkingDays(est, 14, 28), 2, '+14 TC / +28 PS takes both legs from 6 to 8 days: two more');
    eq(W.coWorkingDays(est, 0, 0), 0, 'none adds none');
    // ⚠ THE LONGER LEG DECIDES, IN BOTH DIRECTIONS. −14 concierge hours takes that leg from 6 days
    // to 4, but the specialist leg still needs 5 (70 hrs over 2 people at 7 a day): one day shorter,
    // not two. A reduction of both legs is what brings it to 4.
    eq(W.coWorkingDays(est, -14, 0), -1, '⚠ −14 TC alone: the specialist leg still needs 5 days, so one day shorter');
    eq(W.coWorkingDays(est, -14, -28), -2, 'a reduction on both legs takes it to 4: two shorter');
    // ⚠⚠ THE MARGINAL RULE. 36 hours is ceil(5.14) = 6 days and 42 is exactly 6: a +6-hour change
    // order adds NO day. Rounding the change order up on its own would say one.
    eq(W.coWorkingDays({ svc: 'cleanout', days: 6, totTC: 36, totPS: 0 }, 6, 0), 0,
       '⚠⚠ +6 hours that fit inside the last part-day add no day — never a second ceiling');
    eq(W.coWorkingDays({ svc: 'cleanout', days: 6, totTC: 36, totPS: 0 }, 7, 0), 1, 'one more hour tips it over');
    eq(W.coWorkingDays({ svc: 'prep', totTC: 5 }, 14, 0), 0, 'prep has no day count of ours to move');
    eq(W.coWorkingDays(null, 14, 0), 0, 'no estimate, no days');
    eq(W.estWorkingDays(est), 6, '⚠ and the ESTIMATE’s own length never moves — the client estimate and the agreement read this');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠⚠ jobSchedule — the overrun flag the change order was the advice for now clears');
  {
    const S = sandbox({
      fns: ['jobSchedule', 'estWorkingDays', 'addWorkingDays', 'workingDaysInclusive', 'docSentAt', 'docKeyFor',
            'coWorkingDays', '_coPaceFix'],
      vars: ['PRODUCTIVE_HRS_PER_DAY'],
    });
    const EST = { svc: 'cleanout', days: 6, totTC: 42, totPS: 70, psCount: 2 };
    const JOBR = { id: 7, svc: 'cleanout', start: '2026-09-21', status: 'active', activatedOn: '2026-09-21' };
    // Tuesday 29 September is working day 7 of a job that started Monday the 21st.
    const noCO = S.jobSchedule(JOBR, EST, '2026-09-29', { has: false, coTC: 0, coPS: 0 });
    eq(noCO.days, 6, 'six days on the estimate');
    eq(noCO.pace, 'overrun', 'working day 7 of 6 is an overrun …');
    has(noCO.paceFix, 'raise a change order if the scope grew', '… and the fix says to raise a change order');
    has(noCO.paceFix, 'Once the client accepts it, its hours lengthen the plan', 'and now says what accepting one does');

    const withCO = S.jobSchedule(JOBR, EST, '2026-09-29', { has: false, coTC: 14, coPS: 28 });
    eq(withCO.coDays, 2, 'the accepted change order adds two days');
    eq(withCO.days, 8, '⚠⚠ the plan is eight days now');
    ok(withCO.pace !== 'overrun', '⚠⚠ and working day 7 of 8 is NOT an overrun — the advice finally clears the flag');
    eq(withCO.remaining, 1, 'one working day to go');
    eq(withCO.planEnd, '2026-09-30', 'the planned end moves to the eighth working day');

    const pending = S.jobSchedule(JOBR, EST, '2026-09-29', undefined);
    eq(pending.days, 6, 'with no progress passed the length is exactly the estimate’s — every older caller unchanged');
    const cut = S.jobSchedule(JOBR, EST, '2026-09-22', { has: false, coTC: -42, coPS: -70 });
    eq(cut.days, 1, 'a reduction can shorten the plan but never below one day');

    // ⚠ The fix sentence on a fixed price. It said "a change order carries HOURS, not a dollar
    // amount" on every job — false on a fixed price since the change order carries its price.
    const fx = S.jobSchedule(JOBR, Object.assign({}, EST, { fixedPrice: true }), '2026-09-29', { has: false });
    has(fx.paceFix, 'on a fixed price it is priced at the job’s rates and added to the fee', '⚠ fixed: the change order is the price');
    lacks(fx.paceFix, 'carries HOURS, not a dollar amount', '⚠⚠ and never the T&M sentence that says it carries no price');
    has(fx.paceFix, 'Once the client accepts it, its hours lengthen the plan',
        '⚠ and says what accepting one does on a fixed price too — found by the sweep, where only the T&M arm was asserted');
    has(noCO.paceFix, 'carries HOURS, not a dollar amount', 'T&M keeps it');

    // ⚠ The BEHIND arm carries the same advice and reads the same helper — a job running long on
    // the work rather than the calendar. 30% of the work on working day 4 of 6 tracks to 14 days.
    const behindProg = { has: true, aboveFloor: true, workPct: 0.30, hoursPct: 0.5, actHrs: 60, authHrs: 180,
                         coTC: 0, coPS: 0 };
    const JOB4 = Object.assign({}, JOBR);
    const behindTM = S.jobSchedule(JOB4, EST, '2026-09-24', behindProg);
    eq(behindTM.pace, 'behind', 'a job 30% done on working day 4 of 6 is behind');
    has(behindTM.paceFix, 'carries HOURS, not a dollar amount', 'T&M: the change order carries hours');
    const behindFx = S.jobSchedule(JOB4, Object.assign({}, EST, { fixedPrice: true }), '2026-09-24', behindProg);
    has(behindFx.paceFix, 'priced at the job’s rates and added to the fee', '⚠ fixed: the behind arm says the change order is priced too');
    lacks(behindFx.paceFix, 'carries HOURS, not a dollar amount', 'and never the T&M sentence');
    // The descriptor's hours figure is the authorised budget, the same one hoursPct was taken against.
    eq(behindTM.estHrs, 180, 'the schedule carries the AUTHORISED hours, never the estimate’s alone');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('the schedule strip says the length moved, beside the count it moved');
  {
    const V = sandbox({ fns: ['jtScheduleHtml'], stubs: { fmtDate2: (d) => 'D:' + d } });
    const running = { state: 'running', days: 8, daysQuoted: true, coDays: 2, anchor: '2026-09-21', anchorKind: 'actual',
                      actualStart: '2026-09-21', actualStartKind: 'activated', today: '2026-09-29', elapsed: 7,
                      remaining: 1, overBy: 0, planEnd: '2026-09-30', halfway: '2026-09-24' };
    const h = V.jtScheduleHtml(running);
    has(h, 'Working day 7 of 8', 'the count is the lengthened one');
    has(h, 'incl. 2 days by change order', '⚠ and says two of them came from a change order');
    has(V.jtScheduleHtml(Object.assign({}, running, { coDays: 1 })), 'incl. 1 day by change order', 'singular for one');
    has(V.jtScheduleHtml(Object.assign({}, running, { coDays: -1 })), '1 day shorter by change order', 'a reduction says so');
    lacks(V.jtScheduleHtml(Object.assign({}, running, { coDays: 0 })), 'by change order', 'nothing when no change order moved it');
    const planned = V.jtScheduleHtml({ state: 'planned', days: 8, daysQuoted: true, coDays: 2, start: '2026-10-05',
                                       anchor: '2026-10-05', anchorKind: 'target', planEnd: '2026-10-14', halfway: '2026-10-08' });
    has(planned, 'incl. 2 days by change order', 'the planned strip says it too');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠⚠ THE CLIENT DASHBOARD, DRIVEN — the Hours Log bars against the authorised hours');
  {
    const FNS = ['_dashUtilityBarHtml', '_jtDocViews', '_jtDraftLink', '_jtDriveLink', '_jtSendAction',
      'activeHouseFlags', 'agreementSignature', 'dashUtilityBar', 'driveFolderPending', 'depositPaidTotal', 'depositTargetFor',
      'docDraftedAt', 'docKeyFor', 'docSentAt', 'esignProviderKey', 'esignAvailable', 'esignJobWatches', 'field', 'fmtMoney',
      'getJobActuals', 'jobLogEntries', 'houseFlagsOf', 'isAgreementSigned', 'isJobFunded', 'isJobWon',
      'jobActivationBlockers', 'jobPayments', 'jobTimeline', 'jobTimelineActions', 'jobTimelineNext',
      'jobStageDoc', 'docReadiness', 'docDraftOnly', 'docTitle', 'docWord', '_jtDocSecondaries',
      'agreementReady', 'jobTimelineDoc',
      'jobSchedule', 'jtScheduleHtml', 'estWorkingDays', '_todayStr', 'addWorkingDays', 'jobProgress',
      'workingDaysInclusive', 'approvedEstimateFor',
      'maybeStartJobsWatch', 'paymentSplit', 'renderClientDashboard', 'sectionHdr', 'stagePaidTotal',
      'standingFlagLines', 'standingFlagsBlock', '_sfHost', '_sfRowHtml', 'mustFindItems', 'mustFoundOf', '_mustFindKey', '_mfHandle',
      'stopJobsWatch', 'unscoredRoomNames', 'isAgreementSent', 'jtBandHtml', 'jtTrackHtml', 'jtRailHtml', '_jtAtFmt', '_jtStateCls',
      'hoursOverText', 'estTolerancePctTxt', 'coHoursLabel', 'dot', 'coWorkingDays', '_coPaceFix', 'coInclTxt', 'esc',
      'roomStatusNormalize'].concat(CO);
    const VARS = ['_driveFolderInFlight', 'ESIGN_PROVIDERS', 'FIREARMS_PROTOCOL_DOC', 'HOUSE_FLAGS', 'SF_HOSTS', 'JT_LEG_BREAK', 'JT_SHORT', 'JT_NEXT', 'SVC_LABELS',
      '_dashNotice', '_jobsWatch', 'jobLogs', 'JT_ROW_DOC', 'DOC_READY_WHY', 'DOC_KIND_WORD', 'DOC_STAGE_WORD', 'DOC_ACTIONS',
      'PRODUCTIVE_HRS_PER_DAY', 'jobPlanStore', 'PROJ_CREW_DAY', 'TC_DONE_STATUSES', 'PS_DONE_STATUSES', 'EST_TOLERANCE_PCT',
      'ROOM_STATUS_META', 'ROOM_STATUS_LEGACY'];
    function dash(cos, opts) {
      opts = opts || {};
      const dom = domStub({});
      const job = Object.assign({ won: true, approved: true, created: 'Sep 8, 2026', walkthrough: '2020-01-01',
                                  driveFolder: 'https://drive.google.com/drive/folders/XYZ' }, JOB);
      const c = sandbox({ fns: FNS, vars: VARS, stubs: {
        document: dom, setTimeout: () => 0, clearTimeout: () => {}, Intl: global.Intl,
        jobs: [job], changeOrders: cos, contractors: [], _photoRefs: {},
        estimateStore: { 7: { estimate: Object.assign({}, opts.fixed ? EST_FX : EST_TM), approved: true } } } });
      if (opts.tol != null) c.EST_TOLERANCE_PCT = opts.tol;
      // 100 TC against 80 is 125%; 70 PS against 60 is 117% — both over the ±15% on the estimate alone.
      c.jobLogs[7] = LOG(100, 70);
      c.renderClientDashboard(7);
      return dom.getElementById('client-dashboard-view').innerHTML;
    }
    const before = dash([]);
    has(before, '— OVERAGE', 'on the estimate alone 125% is an OVERAGE …');
    has(before, 'must be notified in writing', '… and the T&M notice sentence fires');

    const after = dash([accepted(20, 20, 50)]);
    lacks(after, '— OVERAGE', '⚠⚠ with the +20 / +20 change order accepted it is not an overage');
    lacks(after, 'must be notified', '⚠⚠ and nobody is told to notify the client about hours the client signed for');
    lacks(after, '#FCEBEB', 'the card is not red');
    has(after, 'of 100.0 hrs estimated', 'the concierge bar reads against 80 + 20');
    has(after, 'of 80.0 hrs estimated', 'the specialist bar against 60 + 20');
    has(after, 'incl. +20.0 hrs by change order', 'and each says where the extra came from');
    has(after, '100% used', 'the concierge bar reads 100%');

    const pending = dash([co(20, 20, 50)]);
    has(pending, '— OVERAGE', '⚠ an unaccepted change order moves nothing');
    lacks(pending, 'by change order', 'and claims nothing');

    const other = dash([accepted(20, 20, 50, { jobId: 8 })]);
    has(other, '— OVERAGE', 'another job’s change order is not this job’s budget');

    const fx = dash([accepted(20, 20, 50)], { fixed: true });
    lacks(fx, 'margin at risk', 'a fixed-price job’s bars read against the scope it was paid for too');
    lacks(fx, 'ours to absorb', 'and the margin sentence does not fire on priced hours');

    // ⚠ THE BAR COLOURS WERE THE LAST TWO BARE `115`s ON THIS SCREEN. With the tolerance moved to
    // 30%, 125% is inside it: no bar may still paint the over-the-line red.
    const moved = dash([], { tol: 0.30 });
    lacks(moved, 'background:#A32D2D;width', '⚠ with the tolerance at 30% no bar paints the over-the-line red');
    const still = dash([], { tol: 0.15 });
    has(still, 'background:#A32D2D;width', 'at 15% the 125% bar does');
    lacks(noComments(fn('renderClientDashboard')), '> 115', 'no bare 115 survives in the dashboard, spaced or not');
    has(noComments(fn('renderClientDashboard')), 'var _coH = coAcceptedHours(jobId);', 'the bars read the shared sum');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠⚠ THE JOB PLAN — the hours summary, the Hours fold and the desk card’s hours line');
  {
    function summary(cos, tol) {
      const dom = domStub({});
      const S = sandbox({ fns: ['updateLogSummary', 'jobLogEntries', 'hoursOverText', 'estTolerancePctTxt', 'coHoursLabel'].concat(CO),
                          vars: ['EST_TOLERANCE_PCT'],
                          stubs: { document: dom, jobs: [Object.assign({}, JOB)], jobLogs: { 7: LOG(100, 70) },
                                   changeOrders: cos, estimateStore: { 7: { estimate: Object.assign({}, EST_TM) } } } });
      if (tol != null) S.EST_TOLERANCE_PCT = tol;
      S.updateLogSummary(7);
      const g = (id) => dom.getElementById(id);
      return { estTC: g('ls-est-tc').textContent, estPS: g('ls-est-ps').textContent, tcPct: g('ls-tc-pct').textContent,
               tcColor: g('ls-tc-pct').style.color, note: g('ls-co-note').textContent, alert: g('log-overage-alert').innerHTML };
    }
    // ⚠ domStub mints any element on demand, so the note would render here even if the markup lost
    // it — and updateLogSummary guards `if (_coNote)`, so on the real page it would simply never show.
    const markup = src.slice(src.indexOf('id="ls-est-tc"'), src.indexOf('id="log-overage-alert"') + 40);
    has(markup, 'id="ls-co-note"', '⚠ the note has a place in the real markup, under the hours table');
    ok(src.indexOf('id="ls-co-note"') < src.indexOf('id="log-overage-alert"'), 'and sits above the overage alert it explains');
    const b = summary([]);
    eq(b.estTC, '80.0 hrs', 'the estimate alone: 80 concierge hours');
    has(b.alert, 'must be notified in writing', 'and 170 logged against 140 is over the line');
    eq(b.note, '', 'with no change order there is no note');
    eq(b.tcColor, 'var(--err-tx)', '125% of the concierge estimate reads red');

    const a = summary([accepted(20, 20, 50)]);
    eq(a.estTC, '100.0 hrs', '⚠⚠ with the change order accepted the concierge figure is 100');
    eq(a.estPS, '80.0 hrs', 'the specialist figure 80');
    eq(a.tcPct, '100%', 'the concierge reads 100% used');
    ok(a.tcColor !== 'var(--err-tx)', '⚠⚠ and is not red');
    eq(a.alert, '', '⚠⚠ 170 against the authorised 180 raises no alert at all');
    eq(a.note, 'Estimated hours include +20.0 concierge / +20.0 specialist hrs from 1 accepted change order.',
       'the note says the figures carry the change order');

    const two = summary([accepted(10, 10, 50), accepted(10, 10, 60)]);
    has(two.note, 'from 2 accepted change orders', 'plural for two');
    const pend = summary([co(20, 20, 50)]);
    eq(pend.estTC, '80.0 hrs', '⚠ a pending change order moves nothing');

    const moved = summary([], 0.30);
    eq(moved.tcColor, 'var(--warn-tx)', '⚠ the per-role red is the ±15% constant: at 30%, 125% is amber, not red');
    lacks(noComments(fn('updateLogSummary')), '> 115', 'no bare 115 survives in the summary');

    // The Hours fold: "7 of 180 logged".
    function meta(cos, est) {
      const M = sandbox({ fns: ['planHoursMeta', '_todayStr'].concat(CO),
                          stubs: { changeOrders: cos, jobLogEntries: () => LOG(100, 70) } });
      return M.planHoursMeta(7, JOB, est);
    }
    eq(meta([], EST_TM).est, 140, 'the fold measures against the estimate …');
    eq(meta([accepted(20, 20, 50)], EST_TM).est, 180, '⚠ … plus the accepted change orders');
    eq(meta([accepted(20, 20, 50)], { totTC: 0, totPS: 0 }).est, 0, 'a job whose estimate prices no hours does not grow a budget from change orders');

    // The desk card's hours line. Driven through the real planDerivedLines(jobId, job, est, phase) —
    // the same dependency list job-desk-scope lifts.
    function desk(cos, est) {
      const D = sandbox({
        fns: ['planDerivedLines', 'planTaskCtx', 'invFiduciaryMode', 'isDecedentJob', '_planRooms',
              'roomStatusNormalize', 'firearmsFlaggedAtIntake', 'houseFlagsOf', '_jobInvRefs',
              '_srcLineKey', 'matterTypeOf', 'matterDef', 'docTierOf', 'docTierDef',
              'docTierProduces', 'svcHasDocStep', 'estimateIsFeeOnly', 'estDeclutterHrs'].concat(CO),
        vars: ['DECEDENT_SERVICES', 'jobPlanStore', 'TC_DONE_STATUSES', 'PS_DONE_STATUSES',
               'ROOM_STATUS_META', 'ROOM_STATUS_LEGACY', 'INV_RELEASE_DISPOSITIONS',
               'FIREARMS_PROTOCOL_DOC', 'HOUSE_FLAGS', 'MATTER_TYPES',
               'DOC_TIERS', 'DOC_TIER_FROM_SCOPE', 'JOB_STEPS'],
        stubs: { isFormalDoc: () => false, docSentAt: () => null, jobLogEntries: () => LOG(100, 70),
                 stagePaidTotal: () => 0, _photoRefs: { 7: [] }, changeOrders: cos,
                 estimateStore: { 7: { estimate: Object.assign({}, est) } } },
      });
      let lines = [];
      try { lines = D.planDerivedLines(7, Object.assign({}, JOB), Object.assign({}, est), 'admin') || []; } catch (e) { lines = []; }
      return lines.filter((l) => l && l.key === 'hours_logged')[0];
    }
    const noCoLine = desk([], EST_TM);
    ok(!!noCoLine, 'the desk card carries its hours line');
    has(noCoLine ? noCoLine.detail : '', '170 hrs against 140 estimated', 'on the estimate alone it reads against 140');
    const coLine = desk([accepted(20, 20, 50)], EST_TM);
    has(coLine ? coLine.detail : '', '170 hrs against 180 estimated', '⚠ with the change order accepted, against the authorised 180');
    const pendLine = desk([co(20, 20, 50)], EST_TM);
    has(pendLine ? pendLine.detail : '', '170 hrs against 140 estimated', 'a pending change order moves nothing here either');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠ THE CHANGE ORDER MODAL — a second change order is measured from where the first left the job');
  {
    function modal(est, cos, tc, ps, jobOver) {
      const dom = domStub({ 'co-jobid': '7', 'co-tc-hrs': String(tc), 'co-ps-hrs': String(ps) });
      const c = sandbox({
        fns: ['updateCOHours', '_coJobBasis', 'coHoursLabel', 'coFixedTerms', '_coPriorAccepted', 'coPriorHours', 'coPrice',
              'coPriceTotal', 'coBaselineShift', '_coMoney', 'fmt', 'estFixedFee', 'estTolerancePctTxt', 'coNoHoursBaseTxt',
              'prepFeeRate'].concat(CO),
        vars: ['EST_TOLERANCE_PCT', 'PREP_FEE_RATE'],
        stubs: { document: dom, jobs: [Object.assign({}, JOB, jobOver || {})], changeOrders: cos,
                 estimateStore: est ? { 7: { estimate: Object.assign({}, est), approved: true } } : {}, currentEstimate: null },
      });
      c.updateCOHours();
      return { note: dom.getElementById('co-hrs-note').innerHTML, base: dom.getElementById('co-original-hrs').textContent,
               rev: dom.getElementById('co-new-hrs').textContent };
    }
    const first = modal(EST_TM, [], 10, 10);
    eq(first.base, '140.0', 'the first change order starts from the estimate’s 140');
    has(first.note, '140.0 hrs on the estimate becomes 160.0', 'and says so');

    const second = modal(EST_TM, [accepted(20, 20, 50)], 10, 10);
    eq(second.base, '180.0', '⚠⚠ the second starts from 180 — the estimate plus the change order already accepted');
    eq(second.rev, '200.0', 'and revises to 200');
    has(second.note, '180.0 hrs on the estimate and 1 accepted change order becomes 200.0', 'naming the earlier change order');
    has(second.note, '(+11.1%)', 'measuring its percentage against the authorised figure');
    const pend = modal(EST_TM, [co(20, 20, 50)], 10, 10);
    eq(pend.base, '140.0', 'a pending change order is not in the base');

    // ── #3 · the fee-only Home Prep readout ──
    const PREP = { jobId: 7, svc: 'prep', totTC: 0, totPS: 0, prepItems: [{ cat: 'Painting', cost: 10000 }], rooms: [] };
    const prep = modal(PREP, [], 8, 0, { svc: 'prep' });
    lacks(prep.note, 'no approved estimate', '⚠⚠ a prep job with an approved estimate is never told it has none');
    has(prep.note, 'this engagement bills no hours', 'it says what is true: the engagement bills no hours');
    has(prep.note, 'its fee is 30% of what the preparation vendors invoice', 'the fee, with the rate read from prepFeeRate');
    has(prep.note, 'hours on a change order are not billed here', '⚠ and that hours typed here reach no invoice');
    const none = modal(null, [], 8, 0);
    has(none.note, 'this job has no saved estimate yet', 'a job with no estimate at all still says so');
    const zero = modal(Object.assign({}, EST_TM, { totTC: 0, totPS: 0 }), [], 8, 0);
    has(zero.note, 'the estimate for this job prices no concierge or specialist hours', 'a labour estimate with no hours says that instead');
    lacks(noComments(fn('updateCOHours')), 'no approved estimate yet', 'the old sentence is gone from the modal');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠⚠ THE PRINTED T&M CHANGE ORDER — the hours chain names the change orders before it');
  {
    function printed(cos, id) {
      const c = sandbox({
        fns: ['printChangeOrder', '_coJobBasis', 'coHoursLabel', 'coFixedTerms', '_coPriorAccepted', 'coPriorHours', 'coPrice',
              'coPriceTotal', 'coBaselineShift', '_coMoney', 'fmt', 'esc', 'estFixedFee', 'coReasonLabel', 'coRateBasisTxt'].concat(CO),
        vars: ['CO_REASONS'],
        stubs: { jobs: [Object.assign({}, JOB)], changeOrders: cos, currentEstimate: null,
                 estimateStore: { 7: { estimate: Object.assign({}, EST_TM), approved: true } },
                 docNames: () => ({ printTitle: 'Havellin Change Order' }) },
      });
      c.printChangeOrder(id);
      return c.__printed;
    }
    const cos = [accepted(20, 20, 50), co(10, 10, 100)];
    const second = printed(cos, 100);
    has(second, 'Change orders already accepted', '⚠⚠ change order #2 names the hours #1 already added');
    has(second, '+40.0 hrs', 'as +40.0 hours');
    has(second, '200.0', '⚠⚠ and foots at 200 — 140 + 40 + 20 — not the 160 it printed before');
    ok(!/\$\s?[\d,]/.test(second), 'a T&M change order still carries no dollar figure anywhere');
    const first = printed(cos, 50);
    lacks(first, 'Change orders already accepted', 'change order #1 never shows a later one above it');
    has(first, '180.0', 'and foots at 180');
    const alone = printed([co(10, 10, 100)], 100);
    lacks(alone, 'Change orders already accepted', 'with nothing accepted before it there is no such row');
    has(alone, '160.0', 'and it foots at 160');

    // The one definition of "earlier" is shared with the fixed-price chain.
    const fnPrior = noComments(fn('coFixedTerms'));
    has(fnPrior, '_coPriorAccepted(jobId, co)', 'the fixed chain reads the shared rule for "before"');
    has(noComments(fn('coPriorHours')), '_coPriorAccepted(jobId, co)', 'and so does the hours chain');
    eq((src.match(/c\.id < me/g) || []).length, 1, '⚠ "created earlier" is written exactly once');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠⚠ §4.2 OF THE ESTATE AGREEMENT — the blank change-order form follows the billing basis');
  {
    const AGR_FNS = ['_agrComplianceHeading', '_agrComplianceLead', '_agrApprover', '_agrTrustDeliverable', 'matterDef', 'matterTypeOf',
      'invFiduciaryMode', 'marketingOptOutBlock', 'marketingUseParas', '_mktClause', 'estTolerancePctTxt', 'agreementHtml',
      'probateAgreementHtml', 'agrBillingRates', 'materialsBasisNote', 'fmt', 'esc', 'paymentSplit', 'isDecedentJob', 'agrSection',
      '_agrHasPrepVendors', 'estimateDocScope', 'svcHasDocStep', 'docScopeDef', '_agrScopeServices', '_agrMidpointTrigger',
      '_agrProbateCompliance', 'esignAnchor', 'estFixedFee', 'estPrepFeeOnTop', 'weArrangeAppraisals', 'docTierProduces',
      'docTierOf', 'docTierDef'];
    const AGR_VARS = ['AGR_NOT_AN_ACCOUNTING', 'MATTER_TYPES', 'EST_TOLERANCE_PCT', 'SMF_PCT', 'DECEDENT_SERVICES', 'agrApproved',
      'HAVELLIN_OFFICE_PHONE', 'JOB_STEPS', 'DOC_SCOPES', 'ESIGN_ANCHORS', 'DOC_TIERS', 'DOC_TIER_FROM_SCOPE'];
    const A = sandbox({ fns: AGR_FNS, vars: AGR_VARS, stubs: { estimateStore: {}, currentEstimate: null } });
    const PROB = { id: 7, hvlId: 'HVL-0007', name: 'Margaret Doe', svc: 'probate', executor: 'Tripp Butler',
                   addr: '69 Beach Blvd', city: 'Palm Beach', zip: '33480', deathDate: '2026-01-15', docLevel: 'formal' };
    const E = { jobId: 7, tcFee: 12000, psFee: 6000, pkgCost: 0, smf: 0, prepFee: 0, havellinTotal: 18000, totTC: 80, totPS: 60,
                tcRate: 150, psRate: 100, discountPct: 0, rush: false, vendors: [], prepItems: [], rooms: [], collections: [], vehicles: [] };
    const sec42 = (h) => {
      const t = h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      const a = t.indexOf('4.2 Change Order Documentation');
      const b = t.indexOf('Section 5');
      return a >= 0 && b > a ? t.slice(a, b) : '';
    };
    const tm = sec42(A.probateAgreementHtml(PROB, Object.assign({}, E, { fixedPrice: false })));
    const fx = sec42(A.probateAgreementHtml(PROB, Object.assign({}, E, { fixedPrice: true, fixedAmount: 24000, havellinTotal: 24000 })));
    ok(tm.length > 0 && fx.length > 0, 'both forms carry §4.2');

    lacks(tm, 'Additional Cost Estimate', '⚠⚠ T&M: no cost field on a change order the app refuses to price');
    lacks(tm, 'Revised Total Estimate', 'and no revised dollar total');
    lacks(tm, '$', '⚠⚠ and not a single dollar sign anywhere in the T&M form');
    has(tm, 'Additional TC Hours', 'T&M: it asks the hours');
    has(tm, 'Revised Estimated Hours', 'and the revised hours');
    has(tm, 'billed as worked, at the hourly rates in Section 3.1', 'and says how those hours are billed');
    has(tm, 'This Change Order does not itself create a charge', 'and that the form creates no charge');

    has(fx, 'Price of This Change', '⚠ fixed: the change order is the price');
    has(fx, 'the additional hours at the rates in Section 3.1', 'priced at the §3.1 rates the fixed arm keeps for exactly this');
    has(fx, 'Revised Fixed Project Fee', 'and the fee it leaves');
    lacks(fx, 'Revised Estimated Hours', 'fixed: no hours total — the fee is the figure');
    lacks(fx, 'Additional Cost Estimate', 'and neither form carries the old wording');
    has(fx, 'Additional TC Hours', 'both keep the hours rows');
    has(tm, 'Client Approval', 'and both keep the client’s signature row');
    has(fx, 'Havellin Authorization', 'and ours');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('the nets — every progress reading passes the change orders; one definition of the sum');
  {
    // ⚠ Line-based, not a regex over the call: the arguments nest a call of their own
    // (`jobLogEntries(jobId)`), so `[^)]*` stops inside it and reads every call as missing its
    // fourth argument. Comment lines and the definition itself are excluded.
    const calls = src.split('\n').filter((l) => /jobProgress\(/.test(l) && !/^\s*\/\//.test(l)
                                              && !/function jobProgress\(/.test(l)).map((l) => l.trim());
    ok(calls.length >= 4, 'there are at least four progress readings');
    calls.forEach((c) => has(c, 'coAcceptedHours(jobId)', '⚠ ' + c + ' passes the accepted change-order hours'));
    eq((src.match(/function coAcceptedHours\(/g) || []).length, 1, 'one definition of the accepted sum');
    has(noComments(fn('coAcceptedHours')), 'c.clientApproved', 'and it filters on acceptance');
    ['planHoursMeta', 'planDerivedLines', 'updateLogSummary', 'computeProjection'].forEach((f) => {
      ok(/coAcceptedHours\(jobId\)/.test(noComments(fn(f))) || /P\.authTC/.test(noComments(fn(f))),
         f + ' reads the authorised budget');
    });
  }
};
