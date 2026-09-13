'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// REAL JOB PROGRESS ON THE SCHEDULE STRIP
// Anthony, 2026-09-13: *"the app should know if half the work has been done by how many
// hours have been logged. Even in a fixed price contract the hours are tracked, I hope,
// to monitor job progress on the job plan. Confirm."*
//
// Confirmed, and this file is the confirmation made structural. Two claims are pinned here
// that nothing else in the repo pins:
//
//   1. ⚠⚠ NOTHING ON THE HOURS-LOG PATH BRANCHES ON FIXED PRICE. `loadJobPlanTab` gates the
//      log on a job, an estimate, that estimate approved and `isJobWon`, plus one service
//      carve-out (`prep`, which books no hours at all). Fixed price decides how hours are
//      BILLED, never whether they are RECORDED — and if that ever stops being true, the
//      progress reading silently goes blank on every fixed-price job while still rendering.
//
//   2. ⚠⚠ HOURS BURNED IS NOT WORK DONE. A single percentage cannot tell "70% spent, 70%
//      done" from "70% spent, 30% done", and only the second is a job in trouble. So
//      `jobProgress` returns both and the strip prints both.
//
// The schedule strip previously flagged only the CALENDAR halfway, and the comment beside it
// claimed the app recorded no room-level progress it could see. That was false: the crew's own
// room statuses have driven `computeProjection` since long before the strip existed. What was
// missing was the split between measuring and persisting — that function ends in
// `saveJobPlan(jobId)`, so `jobSchedule`, which must stay side-effect-free, could not call it.
// ─────────────────────────────────────────────────────────────────────────────

const { sandbox, source, fn, domStub } = require('./harness');

const noComments = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();

  // Two rooms whose WEIGHTS differ by an order of magnitude — the whole reason the reading
  // is hours-weighted rather than a room count.
  const ROOMS = () => ([
    { idx: 0, name: 'Kitchen', tcH: 10, psH: 20 },
    { idx: 1, name: 'Powder Room', tcH: 1, psH: 2 },
  ]);
  const EST = (over) => Object.assign({ svc: 'cleanout', days: 6, totTC: 11, totPS: 22,
                                        rooms: ROOMS() }, over || {});
  const LOG = (tc, ps) => ([{ date: '2026-09-22', members: [
    { name: 'Anthony', role: 'TC', hours: tc },
    { name: 'Crew', role: 'PS', hours: ps },
  ] }]);
  const PLAN = (statuses) => ({ rooms: Object.keys(statuses || {}).reduce((m, k) => {
    m[k] = { status: statuses[k] }; return m;
  }, {}) });

  const P = sandbox({ fns: ['jobProgress'],
                      vars: ['PROJ_CREW_DAY', 'TC_DONE_STATUSES', 'PS_DONE_STATUSES'] });
  const prog = (est, plan, logs) => P.jobProgress(est, plan, logs);

  // ═══════════════════════════════════════════════════════════════════════════
  group('jobProgress — hours BURNED and work DONE are two numbers, never one');
  {
    const a = prog(EST(), PLAN({ 1: 'complete' }), LOG(4, 8));

    ok(a.has, 'an estimate with priced rooms produces a reading');
    eq(a.actTC, 4, 'concierge hours come off the log by role');
    eq(a.actPS, 8, 'and specialist hours likewise');
    eq(a.actHrs, 12, 'combined');
    eq(a.estHrs, 33, 'against the estimate’s own two legs');
    eq(Math.round(a.hoursPct * 1000) / 1000, 0.364, '12 of 33 hours burned');

    // ⚠⚠ THE LOAD-BEARING ONE. One room of two is complete — 50% BY COUNT — and the work
    // done is 3 hours of 33, i.e. 9%. A room count on this card would have been wrong by a
    // factor of five on a perfectly ordinary two-room job, which is why no count is printed.
    eq(Math.round(a.workPct * 1000) / 1000, 0.091,
       '⚠ the reading is hours-weighted: the powder room is 9% of the job, not 50%');
    eq(a.doneHrs, 3, 'and the earned figure is the room’s own priced hours');

    // ⚠ AND THE TWO DISAGREE ON PURPOSE. 36% of the hours are gone and 9% of the work is
    // done — the gap IS the signal, and one combined percentage would have hidden it.
    ok(a.hoursPct > a.workPct * 3, '⚠ 36% burned against 9% done — the gap is the whole point');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('a room’s status decides which leg it earns, and the two are not the same question');
  {
    // TC is the DECISION work — a room counts once its contents are sorted and locked.
    // PS is the PHYSICAL work — it counts only once the room is packed.
    const locked = prog(EST(), PLAN({ 0: 'locked' }), LOG(4, 8));
    eq(locked.doneTC, 10, 'a LOCKED room earns its concierge hours');
    eq(locked.donePS, 0, '…and none of its specialist hours — nothing is packed yet');

    const packed = prog(EST(), PLAN({ 0: 'packed' }), LOG(4, 8));
    eq(packed.doneTC, 10, 'a PACKED room earns both');
    eq(packed.donePS, 20, '…because packing implies the decisions were made');

    ['pending', 'sorting'].forEach((s) => {
      const p = prog(EST(), PLAN({ 0: s }), LOG(4, 8));
      eq(p.doneTC + p.donePS, 0, `a ${s.toUpperCase()} room has earned nothing`);
    });

    eq(prog(EST(), PLAN({}), LOG(4, 8)).workPct, 0, 'an untouched plan reads zero, not null');
    eq(prog(EST(), null, LOG(4, 8)).workPct, 0, 'and a job with no plan at all reads zero too');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠⚠ NOTHING HERE BRANCHES ON FIXED PRICE — the answer to the question, pinned');
  {
    // The BEHAVIOURAL half: identical rooms, identical log, one job on a flat fee and one on
    // time and materials. Same reading, to the decimal.
    const tm    = prog(EST({ fixedPrice: false }), PLAN({ 0: 'packed' }), LOG(6, 12));
    const fixed = prog(EST({ fixedPrice: true, fixedFee: 24100 }), PLAN({ 0: 'packed' }), LOG(6, 12));
    eq(fixed.workPct, tm.workPct, '⚠ a fixed-price job measures progress identically');
    eq(fixed.hoursPct, tm.hoursPct, '…and burns its hours identically');
    eq(fixed.actHrs, tm.actHrs, '…off the same log');

    // The SOURCE half: no branch can creep in later.
    const pb = noComments(fn('jobProgress'));
    ['fixedPrice', 'isFixedAgr', '_fixedBasis', 'fixedFee'].forEach((n) =>
      lacks(pb, n, `jobProgress holds no opinion about fixed price (${n})`));

    // ⚠ AND THE GATE ITSELF, which is the thing that would actually break this. The hours log
    // on the Job Plan is shown and hidden by `loadJobPlanTab`; if a fixed-price test ever
    // appears in it, hours stop being recorded on those jobs and every reading above silently
    // reads zero while still rendering. Pinned on the real function, not on this one.
    const lb = noComments(fn('loadJobPlanTab'));
    ['fixedPrice', 'isFixedAgr', '_fixedBasis'].forEach((n) =>
      lacks(lb, n, `the hours log is never gated on fixed price (${n})`));
    has(lb, 'isJobWon(job)', 'it gates on the client having accepted');
    has(lb, "job.svc === 'prep'", '…and carves out only Home Prep, which books no hours at all');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('the floors, the carve-outs and the refusals');
  {
    eq(prog(EST(), PLAN({}), LOG(3, 3)).aboveFloor, false,
       '6 combined hours is below one crew-day and nothing derived from the rate is trusted');
    eq(prog(EST(), PLAN({}), LOG(3, 4)).aboveFloor, true, '…7 is the line, and it is inclusive');

    // Excluded rooms are the homeowner’s own and are not tracked — counting them would make
    // every such job permanently unfinishable.
    const withExcl = EST();
    withExcl.rooms.push({ idx: 2, name: 'Guest Wing', tcH: 50, psH: 100, excluded: true });
    const e = prog(withExcl, PLAN({ 0: 'packed', 1: 'packed' }), LOG(6, 12));
    eq(e.planTC, 11, 'an excluded room adds nothing to the plan');
    eq(Math.round(e.workPct * 100), 100, '…so packing everything in scope really does read 100%');

    // A malformed room is REPORTED, never silently counted as zero — a room with no hours
    // would otherwise drag every percentage down with nothing on screen to explain it.
    const bad = EST();
    bad.rooms.push({ idx: 2, name: 'Attic', tcH: 'x', psH: 4 });
    const b = prog(bad, PLAN({ 0: 'packed' }), LOG(6, 12));
    eq(b.invalidRooms.length, 1, 'a room with an unreadable figure is reported');
    eq(b.invalidRooms[0], 'Attic', '…by name');
    eq(b.planTC, 11, '…and kept out of the denominator');

    [null, {}, { rooms: [] }].forEach((x, i) =>
      eq(prog(x, PLAN({}), LOG(6, 12)).has, false, `no estimate to measure against (case ${i})`));

    // A tombstoned log entry never reaches here — `jobLogEntries` filters it — but a malformed
    // member must not throw on the one surface a concierge reads mid-job.
    eq(prog(EST(), PLAN({}), [{ date: 'x' }, null, { members: [null, { role: 'TC' }] }]).actHrs, 0,
       'a malformed log entry reads as zero rather than throwing');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠ IT MEASURES AND NEVER WRITES — which is the whole reason it exists separately');
  {
    const pb = noComments(fn('jobProgress'));
    // `computeProjection` ends in `plan.lastProjection = snap; saveJobPlan(jobId);`. That is
    // exactly why the measurement had to come out of it: `jobSchedule` runs on every dashboard
    // paint and on the 15-second remote tick, and a derivation that saves would push a plan
    // record up the sync as a side effect of somebody LOOKING at a client.
    ['saveJobPlan', 'lastProjection', 'postSyncBadge', 'localStorage', '_planTouch'].forEach((n) =>
      lacks(pb, n, `jobProgress writes nothing (${n})`));
    ['document', 'getElementById', 'new Date(', 'Date.now'].forEach((n) =>
      lacks(pb, n, `jobProgress is DOM-free and clock-free (${n})`));
    // It reads NO store: every input is an argument, so a test can drive any state at all.
    ['estimateStore', 'jobPlanStore', 'jobLogs', 'jobs['].forEach((n) =>
      lacks(pb, n, `jobProgress reads no global store (${n})`));

    // Nor does it mutate what it is handed. The plan it receives is normally the live
    // `jobPlanStore[jobId]`.
    const plan = PLAN({ 0: 'packed' });
    const before = JSON.stringify(plan);
    const est = EST(); const estBefore = JSON.stringify(est);
    prog(est, plan, LOG(6, 12));
    eq(JSON.stringify(plan), before, 'the plan it is handed comes back untouched');
    eq(JSON.stringify(est), estBefore, '…and so does the estimate');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠ ONE MEASUREMENT, TWO READERS — computeProjection asks the same function');
  {
    // The anti-drift check that matters. The Job Plan's projection card and the dashboard's
    // schedule strip now answer "how far along is this job" from ONE definition; two copies
    // of that rule drifting is the defect this repo records more often than any other.
    const cb = noComments(fn('computeProjection'));
    has(cb, 'jobProgress(', 'computeProjection measures through the shared function');
    // …and keeps no private copy of the counting it used to do inline.
    ['TC_DONE_STATUSES[s]', 'PS_DONE_STATUSES[s]', 'totalTCHrs +=', 'r.excluded'].forEach((n) =>
      lacks(cb, n, `computeProjection holds no second copy of the count (${n})`));
    eq((src.match(/TC_DONE_STATUSES\[/g) || []).length, 1,
       'the done-status test appears in exactly one place in the file');
    eq((src.match(/PS_DONE_STATUSES\[/g) || []).length, 1, '…and so does its specialist twin');
    eq((src.match(/function jobProgress\(/g) || []).length, 1, 'and there is one definition of it');

    // Drive the REAL computeProjection against the REAL jobProgress and assert the snapshot it
    // publishes carries the same figures the shared measurement produced. Asserting the call
    // exists proves the line is there; this proves the numbers agree.
    const saved = [];
    const C = sandbox({
      fns: ['computeProjection', 'jobProgress', 'getJobPlan'],
      vars: ['PROJ_CREW_DAY', 'TC_DONE_STATUSES', 'PS_DONE_STATUSES', 'jobPlanStore',
             'estimateStore', 'currentEstimate'],
      stubs: {
        jobLogEntries: () => LOG(6, 12),
        saveJobPlan: (id) => saved.push(id),
      },
    });
    C.jobPlanStore[7] = PLAN({ 0: 'packed' });
    C.estimateStore[7] = { estimate: EST() };
    const snap = C.computeProjection(7);
    const direct = prog(EST(), PLAN({ 0: 'packed' }), LOG(6, 12));

    ok(snap, 'the projection still computes');
    eq(snap.actTC, direct.actTC, 'the snapshot’s concierge hours match the shared measurement');
    eq(snap.actPS, direct.actPS, '…and its specialist hours');
    eq(snap.tcPct, direct.tcPct, '…and its per-leg room percentages');
    eq(snap.psPct, direct.psPct, '…both of them');
    eq(snap.aboveFloor, direct.aboveFloor, '…and the shared noise floor');
    eq(saved[0], 7, '⚠ and it STILL persists — the write stayed here, which is the split');

    eq(C.computeProjection(999), null, 'a job with no estimate still projects nothing');
  }
  // ═══════════════════════════════════════════════════════════════════════════
  group('jobSchedule reads it — and the WORK against the calendar is a new flag');
  {
    const S = sandbox({
      fns: ['jobSchedule', 'estWorkingDays', 'addWorkingDays', 'workingDaysInclusive',
            'docSentAt', 'docKeyFor'],
      vars: ['PRODUCTIVE_HRS_PER_DAY'],
    });
    // A 6-day job that activated on its target start. `today` is the fourth working day.
    const JOB = (over) => Object.assign({ id: 7, svc: 'cleanout', start: '2026-09-21',
      status: 'active', activatedOn: '2026-09-21' }, over || {});
    const sch = (pr, over, today) =>
      S.jobSchedule(JOB(over), { days: 6, svc: 'cleanout' }, today || '2026-09-24', pr);
    // workPct 0.25 on working day 4 of a 6-day plan → tracking to 16 working days.
    const BEHIND = { has: true, aboveFloor: true, workPct: 0.25, hoursPct: 0.5, actHrs: 16, estHrs: 33 };

    const b = sch(BEHIND);
    eq(b.elapsed, 4, 'four working days elapsed');
    eq(b.pace, 'behind', '⚠⚠ a quarter of the work done on day 4 of 6 is BEHIND');
    eq(b.paceBy, 10, '…tracking to 16 working days against a 6-day plan');
    eq(b.paceEnd, '2026-10-12', '…and to a real date, not a count');
    has(b.paceTxt, '25% of the work is done on working day 4 of 6',
        '…and it names exactly what it compared');
    has(b.paceFix, 'change order carries HOURS', 'with the fix on screen');

    // ── the floors. Below either one the rate says nothing, and so does the strip. ──
    eq(sch({ has: true, aboveFloor: true, workPct: 0.20, hoursPct: 0.5, actHrs: 16 }).pace, 'behind',
       'a fifth complete is the line, and it is inclusive');
    eq(sch({ has: true, aboveFloor: true, workPct: 0.19, hoursPct: 0.5, actHrs: 16 }).pace, 'halfway_late',
       '⚠ below a fifth the projection is withheld — one room of twelve on day one is not a verdict');
    eq(sch({ has: true, aboveFloor: false, workPct: 0.25, hoursPct: 0.2, actHrs: 6 }).pace, 'halfway_late',
       '⚠ and below one crew-day of logged hours it is withheld too');
    // ⚠ elapsed 0 — an activation stamped ahead of the calendar. The OUTCOME is asserted and
    // it holds, but the `S.elapsed >= 1` clause is not what causes it: `ceil(0 / workPct)` is 0
    // and a plan is at least one day, so the arm could not fire either way. Reverting that
    // clause alone is GREEN, and this note is here instead of a check that could not fail —
    // the eighteenth time this repo has had to record that distinction.
    eq(sch(BEHIND, { activatedOn: '2026-09-28' }, '2026-09-24').pace, 'halfway_late',
       'a job with no working day yet is never reported behind');

    // ── no "ahead" flag. Good news is not an instruction, and the chip already prints it. ──
    eq(sch({ has: true, aboveFloor: true, workPct: 0.67, hoursPct: 0.6, actHrs: 20 }).pace, 'halfway_late',
       'a job tracking to exactly its plan raises no pace flag of its own');
    const ahead = sch({ has: true, aboveFloor: true, workPct: 0.9, hoursPct: 0.4, actHrs: 13 });
    ok(ahead.pace !== 'behind', '⚠ and a job AHEAD of its plan is never flagged');
    eq(ahead.paceEnd, '', '…nor given a projected end it does not need');

    // ── the ranking. One slot, worst first, and the loser is not silently dropped. ──
    const over = sch(BEHIND, {}, '2026-10-01');
    eq(over.pace, 'overrun', '⚠ past the proposed length outranks behind — it is the harder fact');
    has(b.paceFix, 'The midpoint invoice has not gone out either.',
        '⚠⚠ behind outranks halfway_late, and carries its clause rather than taking a second slot');
    const midSent = sch(BEHIND, { docState: { 'invoice:midpoint': { sentAt: '2026-09-23T10:00:00Z' } } });
    eq(midSent.pace, 'behind', 'a sent midpoint invoice does not clear a behind job');
    lacks(midSent.paceFix, 'midpoint invoice', '…and the clause goes when the invoice has gone');

    // ── nostatus: the reading is unavailable, and that is worth one line. ──
    const nos = sch({ has: true, aboveFloor: true, workPct: 0, hoursPct: 0.4, actHrs: 13 }, {}, '2026-09-22');
    eq(nos.pace, 'nostatus', '⚠ hours logged and no room marked done has its own flag');
    has(nos.paceTxt, '13 hours logged', '…naming the hours that are going in');
    has(nos.paceFix, 'Job Plan', '…and where the fix is');
    eq(sch({ has: true, aboveFloor: false, workPct: 0, hoursPct: 0.1, actHrs: 3 }, {}, '2026-09-22').pace, '',
       '…withheld below the floor: a job in its first morning is not misbehaving');
    eq(sch({ has: true, aboveFloor: true, workPct: 0, hoursPct: 0.4, actHrs: 13 }).pace, 'halfway_late',
       '⚠ and an unsent midpoint invoice past halfway outranks it — that one is money');

    // ── running only ──
    eq(sch(BEHIND, { status: 'won', activatedOn: '' }, '2026-09-14').progress, false,
       'a job that has not started carries no progress reading');
    eq(sch(BEHIND, { deliveredOn: '2026-09-28' }).progress, false,
       '…and a delivered one is 100% by definition, so the figure would say nothing');
    eq(S.jobSchedule({ id: 7, svc: 'prep' }, { svc: 'prep' }, '2026-09-24', BEHIND).progress, false,
       '…and prep never reaches the reading at all');

    // ── the optional argument really is optional ──
    const bare = sch(undefined);
    eq(bare.progress, false, 'with no progress handed over the strip behaves exactly as before');
    eq(bare.pace, 'halfway_late', '…including its old calendar flag');
    eq(bare.paceEnd, '', '…and it projects nothing');

    // ⚠ IT STILL NEVER FORMATS A DATE. `paceEnd` is yyyy-mm-dd; the renderer owns how it looks.
    ok(/^\d{4}-\d{2}-\d{2}$/.test(b.paceEnd), 'paceEnd is a plain yyyy-mm-dd string');
    const sb = noComments(fn('jobSchedule'));
    ['toLocaleDateString', 'fmtDate2', 'document', 'new Date(', 'jobProgress('].forEach((n) =>
      lacks(sb, n, `jobSchedule stays clock-free, DOM-free and hands-off (${n})`));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('the strip prints both figures, and withholds the one it cannot stand behind');
  {
    const V = sandbox({ fns: ['jtScheduleHtml'], stubs: { fmtDate2: (d) => 'D:' + d } });
    const run = (over) => V.jtScheduleHtml(Object.assign({ state: 'running', days: 6,
      daysQuoted: true, start: '2026-09-21', halfway: '2026-09-23', planEnd: '2026-09-28',
      today: '2026-09-24', elapsed: 4, actualStart: '2026-09-21', actualStartKind: 'activated' },
      over || {}));

    const both = run({ progress: true, workPct: 0.25, hoursPct: 0.48 });
    has(both, '25% of the work done', 'the work done is on the strip');
    has(both, '48%', '…and so are the hours burned');
    has(both, 'of the estimated hours logged', '…named as hours, never as progress');
    has(both, 'Working day 4 of 6', '…beside where the job actually is');

    // ⚠ 0% IS WITHHELD. A job with no room marked done is far more often a crew that has not
    // touched the statuses than a crew that has done nothing, and "0% of the work done" on a
    // client-facing card asserts the second.
    const zero = run({ progress: true, workPct: 0, hoursPct: 0.48 });
    lacks(zero, '0% of the work done', '⚠ zero work done is never printed as a figure');
    has(zero, '48%', '…while the hours it CAN stand behind still are');

    lacks(run({}), 'of the work done', 'a job with no reading prints neither figure');

    // The tracking-to sentence is assembled in the RENDERER, which is the one place that formats.
    const beh = run({ progress: true, workPct: 0.25, hoursPct: 0.48, pace: 'behind', paceBy: 10,
      paceEnd: '2026-10-12', paceTxt: '25% of the work is done on working day 4 of 6.',
      paceFix: 'Re-plan with the client.' });
    has(beh, 'Tracking to D:2026-10-12', '⚠ the date is formatted here, never in the derivation');
    has(beh, '10 working days past the target end', '…with the slip in working days beside it');
    has(beh, 'jt-s-err', 'and a job running long is an error colour');
    has(beh, 'Re-plan with the client.', '…carrying its fix');

    has(run({ progress: true, workPct: 0.25, hoursPct: 0.48, pace: 'behind', paceBy: 1,
      paceEnd: '2026-09-29', paceTxt: 'x', paceFix: 'y' }), '1 working day past',
      '…and one day is singular');

    // ⚠ `nostatus` IS NOT PAINTED AS A WARNING. It reports that a reading is unavailable; three
    // genuine amber flags beside a housekeeping note is how people learn to skip all four.
    const nos = run({ progress: true, workPct: 0, hoursPct: 0.4, pace: 'nostatus',
      paceTxt: '13 hours logged and no room marked done yet.', paceFix: 'Set each room’s status.' });
    has(nos, '13 hours logged', 'it says so plainly');
    lacks(nos, 'jt-s-warn', '⚠ …in plain grey, not amber');
    lacks(nos, 'jt-s-err', '…and certainly not red');
    lacks(nos, 'Tracking to', '…and projects nothing, because it cannot');
  }
  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠⚠ THE WIRING, DRIVEN — the real dashboard really does hand the progress over');
  {
    // ⚠ THIS GROUP EXISTS BECAUSE THE REVERT SWEEP CAME BACK GREEN WITHOUT IT. Dropping the
    // `_jtProg` argument from `renderClientDashboard`'s call to `jobSchedule` — which silently
    // blanks every progress figure on the only screen that shows one — broke NOTHING, because
    // every check above drives a PIECE (`jobProgress` alone, `jobSchedule` alone, the strip
    // alone) and nothing drove the join. That is the same gap this repo has recorded four
    // times; the fix is always to drive the real renderer and read the real output.
const DFNS = ['renderClientDashboard', 'field', 'fmtDate2', 'dot', 'sectionHdr', 'fmtMoney',
      'dashUtilityBar', '_dashUtilityBarHtml', 'jobTimeline', 'jobTimelineNext', 'jobTimelineActions',
      'jobTimelineDoc', 'jobStageDoc', 'docReadiness', 'docDraftOnly', 'docTitle', 'docWord',
      '_jtDocSecondaries', '_jtDocViews', '_jtDraftLink', '_jtDriveLink', '_jtSendAction',
      'jobSchedule', 'jtScheduleHtml', 'estWorkingDays', 'addWorkingDays', 'jobProgress',
      'workingDaysInclusive', 'approvedEstimateFor', 'paymentSplit', 'unscoredRoomNames',
      'jobActivationBlockers', 'isJobWon', 'isJobFunded', 'jobPayments', 'stagePaidTotal',
      'depositPaidTotal', 'depositTargetFor', 'agreementSignature', 'isAgreementSigned',
      'agreementReady', 'esignProviderKey', 'esignWatches', 'docSentAt', 'docDraftedAt', 'docKeyFor',
      'getJobActuals', 'jobLogEntries', 'houseFlagsOf', 'activeHouseFlags', 'standingFlagLines',
      'standingFlagsBlock', 'maybeStartJobsWatch', 'stopJobsWatch', 'calcRECommission', 'formatPropVal'];
    const DVARS = ['ESIGN_PROVIDERS', 'FIREARMS_PROTOCOL_DOC', 'HOUSE_FLAGS', 'JT_LEG_BREAK', 'JT_SHORT', 'SVC_LABELS',
      '_dashNotice', '_jobsWatch', 'JT_ROW_DOC', 'DOC_READY_WHY', 'DOC_KIND_WORD',
      'DOC_STAGE_WORD', 'DOC_ACTIONS', 'PRODUCTIVE_HRS_PER_DAY', 'PROJ_CREW_DAY',
      'TC_DONE_STATUSES', 'PS_DONE_STATUSES'];

    // A real 6-day job, activated on its target start, four working days in. 63 hours of room
    // work priced; the powder room (3 hrs) is packed and 36 hours are on the clock.
    const paint = (planRooms, logs, jobOver) => {
      const dom = domStub({});
      const c = sandbox({ fns: DFNS, vars: DVARS, stubs: {
        document: dom, setTimeout: () => 0, clearTimeout: () => {}, Intl: global.Intl,
        // ⚠ THE CLOCK IS PINNED. `_todayStr` is the ONE wall-clock read on this path, so
        // stubbing it is what stops this group passing on the Thursday it was written and
        // failing on some later one — which is why it is a stub and not lifted from source.
        _todayStr: () => '2026-09-24',
        jobs: [Object.assign({}, JOBBASE, jobOver || {})],
        changeOrders: [], contractors: [], _photoRefs: {},
        jobLogs: { 7: logs }, jobPlanStore: { 7: { rooms: PLAN(planRooms).rooms } },
        estimateStore: { 7: { estimate: EST3(), approved: true } },
      } });
      c.renderClientDashboard(7);
      return dom.getElementById('client-dashboard-view').innerHTML;
    };
    // A midpoint invoice already out, so the calendar-halfway flag cannot fire and the arm
    // under test is the one actually being read.
    const MIDSENT = { docState: { 'invoice:midpoint': { sentAt: '2026-09-23T10:00:00Z' } } };
    // Three rooms, 63 hours of priced work: Kitchen 10/20, Living 10/20, Powder 1/2. Two rooms
    // would only ever read 9% or 100%, and the rung that matters is the one in between.
    const EST3 = () => EST({ totTC: 21, totPS: 42, rooms: [
      { idx: 0, name: 'Kitchen', tcH: 10, psH: 20 },
      { idx: 1, name: 'Living Room', tcH: 10, psH: 20 },
      { idx: 2, name: 'Powder Room', tcH: 1, psH: 2 },
    ] });
    const JOBBASE = { id: 7, hvlId: 'HVL-0007', name: 'Butler', svc: 'cleanout', status: 'active',
      won: true, approved: true, agrSigned: true, agrSent: true, agrApproved: true,
      walkthrough: '2020-01-01', created: 'Sep 8, 2026', start: '2026-09-21',
      activatedOn: '2026-09-21',
      payments: [{ id: 1, stage: 'deposit', amount: 12857, date: '2026-09-19', method: 'wire' }] };
    const LOGS = (tc, ps) => ([{ id: 1, date: '2026-09-22',
      members: [{ name: 'Ashley', role: 'TC', hours: tc }, { name: 'Crew', role: 'PS', hours: ps }] }]);

    // ── the floor, on the real screen. 3 of 63 hours earned = 5%, and a projection off a
    // twentieth of a job is noise, so the figure prints and the verdict does not.
    const early = paint({ 2: 'complete' }, LOGS(4, 8));
    has(early, 'jt-sched', 'the strip renders on the real dashboard');
    has(early, 'Working day 4 of 6', 'with the job where it actually is');
    has(early, '5% of the work done',
        '⚠⚠ and the WORK DONE really reaches the screen — this is the assertion the sweep wanted');
    // ⚠ THE TWO HALVES ARE ASSERTED SEPARATELY because the renderer bolds the FIGURE and
    // leaves the noun plain — `>19%</span> of the estimated hours logged` — so a needle
    // spanning both matches nothing and would read as the chip being absent.
    has(early, '>19%<', '…beside the hours burned, which is a DIFFERENT number');
    has(early, 'of the estimated hours logged', '…and it is named as hours, never as progress');
    lacks(early, 'Tracking to', '⚠ but below a fifth complete it projects nothing at the reader');

    // ── behind. 33 of 63 earned = 52% on working day 4 of 6, tracking to 8 working days.
    const behind = paint({ 0: 'packed', 2: 'complete' }, LOGS(8, 16));
    has(behind, '52% of the work done', 'packing a heavier room moves the figure by its HOURS');
    lacks(behind, '5% of the work done', '…and the old figure is gone');
    has(behind, 'jt-s-err', 'a job tracking past its plan is flagged red');
    has(behind, 'Tracking to', '…with a date it is tracking to');
    has(behind, '2 working days past the target end', '…and the slip in working days');
    has(behind, 'change order carries HOURS', '…carrying the fix on screen');

    // ── everything packed on working day 4 of a 6-day plan. Ahead, and silent.
    const done = paint({ 0: 'packed', 1: 'packed', 2: 'packed' }, LOGS(8, 16));
    has(done, '100% of the work done', 'a finished house reads 100%');
    lacks(done, 'Tracking to', '⚠ and a job AHEAD of its plan projects nothing at the reader');
    lacks(done, 'jt-s-err', '…nor is it painted as a problem');

    // ── hours going in, no room touched. The figure is withheld, the reason is not.
    const nostat = paint({}, LOGS(6, 12), MIDSENT);
    lacks(nostat, '0% of the work done', '⚠ zero is never printed as a figure');
    has(nostat, 'no room marked done yet', '…the reason is, in words');
    has(nostat, 'Job Plan', '…with the fix beside it');
    has(nostat, '>29%<', '…while the hours it CAN stand behind still print');
    has(nostat, 'of the estimated hours logged', '…named as hours');

    // ⚠ THE PLAN STORE IS READ, NEVER MINTED. `getJobPlan` creates an empty plan for any job
    // that has none, and this function runs on every paint and every 15-second remote tick —
    // so it would seed the store with a record for every client somebody merely looked at,
    // and `saveAllJobPlans` posts the whole store.
    const rb = noComments(fn('renderClientDashboard'));
    lacks(rb, 'getJobPlan(', 'the dashboard never mints a job plan as a side effect of drawing');
    has(rb, 'jobPlanStore[jobId]', '…it reads the store directly instead');
    // ⚠ ONE ESTIMATE FOR BOTH, or the strip prints a day count from one record and a
    // percentage from another — two copies of one rule drifting inside a single line.
    has(rb, 'jobProgress(_jtEst', 'the progress is measured against the same estimate');
    has(rb, 'jobSchedule(job, _jtEst', '…as the schedule is');
  }
};
