'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// WORK DONE IS MEASURED AGAINST THE ROOMS (2026-09-29, workflow audit H5 / fix pack P8)
//
// Anthony, Q3: "Should 'work done' measure room work only, or count coordination time too?"
// → "Room work only. Logged hours already show the rest."
//
// jobProgress divided the room hours earned by est.totTC + est.totPS. A room carries only its
// share of the hands-on pool; the concierge's off-site coordination, move day, collections'
// on-site presence and the round-up to whole billable hours belong to NO room. So on a real
// estimate "every room cleared" could never read 100%. Measured through the REAL calcAll on a
// 22-room, 3,500 sq ft house (this file, below): Home Editing 60%, Home Transition 56%, Home
// Cleanout 74%, Estate Settlement 74%, Probate 73%, Contested Probate 70% — and a cleanout
// finished on day 3 of a 4-day plan told the crew it was running a day late.
//
// ⚠ THE PREMISE IS ASSERTED, NOT ASSUMED: every estimate here is built by driveCalcAll, the
// real engine, and the first group checks that its rooms really do NOT sum to the totals. The
// 2026-09-13 tests passed over this defect because their seeded rooms happened to.
// ─────────────────────────────────────────────────────────────────────────────

const { sandbox, fn, source, driveCalcAll } = require('./harness');

const live = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();
  const HOUSE = ['Entryway / Foyer', 'Living Room', 'Dining Room', 'Family Room / Great Room', 'Half Bath',
    'Kitchen', 'Laundry Room', 'Mudroom / Utility Entry', 'Office 1', 'Library',
    'Primary Suite', 'Primary Bath', 'Walk-in Closet', 'Bedroom 2', 'Bathroom 2', 'Bedroom 3', 'Bathroom 3', 'Bedroom 4',
    'Garage (2-car)', 'Storage Room / Oversized Closets', 'Furnished Patio', 'Screened Porch'];
  const LABOUR = ['downsizing', 'downsizing_move', 'home_cleanout', 'cleanout', 'probate', 'contested_probate'];

  const P = sandbox({ fns: ['jobProgress', 'roomStatusNormalize'],
                      vars: ['PROJ_CREW_DAY', 'TC_DONE_STATUSES', 'PS_DONE_STATUSES', 'ROOM_STATUS_META', 'ROOM_STATUS_LEGACY'] });
  const planAll = (est, status, pick) => ({ rooms: est.rooms.reduce((m, r, i) => {
    if (!pick || pick(r, i)) m[r.idx] = { status }; return m; }, {}) });
  const LOG = (tc, ps) => ([{ date: '2026-09-22', members: [{ name: 'A', role: 'TC', hours: tc }, { name: 'C', role: 'PS', hours: ps }] }]);

  const built = {};
  LABOUR.forEach((svc) => { built[svc] = driveCalcAll({ svc, sqft: 3500, rooms: HOUSE }).est; });

  // ═══════════════════════════════════════════════════════════════════════════
  group('the premise: on a REAL estimate the rooms do not sum to the totals');
  {
    LABOUR.forEach((svc) => {
      const est = built[svc];
      ok(est && est.rooms && est.rooms.length === 22, `${svc}: calcAll built all 22 rooms`);
      const roomHrs = est.rooms.reduce((s, r) => s + r.tcH + r.psH, 0);
      ok(roomHrs > 0 && roomHrs < est.totTC + est.totPS,
         `${svc}: the rooms carry ${roomHrs.toFixed(1)} of ${est.totTC + est.totPS} hrs — coordination and the rest belong to no room`);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('every room cleared reads 100% — on all six labour services');
  {
    LABOUR.forEach((svc) => {
      const est = built[svc];
      const p = P.jobProgress(est, planAll(est, 'cleared'), LOG(10, 20));
      eq(p.workPct, 1, `${svc}: every room cleared is exactly 100% of the work`);
      eq(p.tcPct, 1, `${svc}: …and every room's concierge hours are earned`);
      eq(p.psPct, 1, `${svc}: …and every room's specialist hours`);
      ok(p.has, `${svc}: there is a reading to print`);
    });
    // A legacy status reads the same way (normalised on read, never migrated).
    const est = built.cleanout;
    eq(P.jobProgress(est, planAll(est, 'packed'), LOG(10, 20)).workPct, 1, 'a room still saved as "packed" counts as cleared');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('partial work is its share of the ROOM hours');
  {
    const est = built.cleanout;
    const roomTC = est.rooms.reduce((s, r) => s + r.tcH, 0);
    const roomAll = est.rooms.reduce((s, r) => s + r.tcH + r.psH, 0);
    const locked = P.jobProgress(est, planAll(est, 'locked'), LOG(10, 20));
    ok(Math.abs(locked.workPct - roomTC / roomAll) < 1e-9, 'every room LOCKED earns the rooms’ concierge hours only');
    ok(locked.workPct > 0 && locked.workPct < 1, '…so locked-not-cleared is part of the way, never done');

    const firstHalf = (r, i) => i < 11;
    const half = P.jobProgress(est, planAll(est, 'cleared', firstHalf), LOG(10, 20));
    const want = est.rooms.filter(firstHalf).reduce((s, r) => s + r.tcH + r.psH, 0) / roomAll;
    ok(Math.abs(half.workPct - want) < 1e-9, 'half the rooms cleared is their share of the room hours');

    // Out-of-scope rooms are carried at zero hours and never counted.
    const withExcl = driveCalcAll({ svc: 'cleanout', sqft: 3500, rooms: HOUSE.concat([{ name: 'Wine Cellar', state: 'excl' }]) }).est;
    ok(withExcl.rooms.some((r) => r.excluded), 'the out-of-scope room is on the estimate');
    eq(P.jobProgress(withExcl, planAll(withExcl, 'cleared', (r) => !r.excluded), LOG(10, 20)).workPct, 1,
       'every IN-SCOPE room cleared is 100% — the excluded room is not waited on');
    // Every room out of scope: nothing to count as work, but the estimate still prices job-level hours,
    // so the hours half of the reading stays.
    const none = P.jobProgress({ svc: 'cleanout', totTC: 12, totPS: 6, rooms: [{ idx: 0, name: 'Kitchen', excluded: true, tcH: 0, psH: 0 }] },
                               { rooms: {} }, LOG(3, 0));
    ok(none.has, 'an estimate with every room out of scope still has a reading (the hours logged)');
    eq(none.workPct, 0, '…and zero work to count, not a division by zero');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠ the unrounded sums decide it — a finished job is never 99.99% done');
  {
    // Tenths that do not sum exactly in floating point: 0.1 + 0.2 is 0.30000000000000004. Dividing a
    // ROUNDED numerator (0.3) by that total reads 0.9999999999999998, and jobSchedule's
    // ceil(elapsed / workPct) then turns day 3 into day 4 on a finished job.
    const est = { svc: 'cleanout', days: 4, totTC: 5, totPS: 5, rooms: [
      { idx: 0, name: 'Powder Room', tcH: 0.1, psH: 0.2 }, { idx: 1, name: 'Hall', tcH: 0.2, psH: 0.1 }] };
    const p = P.jobProgress(est, { rooms: { 0: { status: 'cleared' }, 1: { status: 'cleared' } } }, LOG(4, 4));
    eq(p.workPct, 1, 'every room cleared is exactly 1, not a hair under');
    eq(Math.ceil(3 / p.workPct), 3, '…so the pace arithmetic keeps a day-3 finish on day 3');
    eq(p.doneHrs, 0.6, 'the display figure is still rounded to the tenth');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('the pace verdict: a job finished early is not "behind"');
  {
    const S = sandbox({ fns: ['jobSchedule', 'estWorkingDays', 'addWorkingDays', 'workingDaysInclusive', 'docSentAt', 'docKeyFor',
                              'coWorkingDays', '_coPaceFix'],
                        vars: ['PRODUCTIVE_HRS_PER_DAY'] });
    const est = Object.assign({}, built.home_cleanout, { days: 4 });
    const job = { id: 7, svc: 'home_cleanout', status: 'active', won: true, start: '2026-09-21', activatedOn: '2026-09-21',
                  agrSigned: true, payments: [{ stage: 'deposit', amount: 1 }] };
    // Every room cleared by the end of working day 3, with a crew-day of hours logged.
    const prog = P.jobProgress(est, planAll(est, 'cleared'), LOG(20, 40));
    const sc = S.jobSchedule(job, est, '2026-09-23', prog);
    eq(sc.workPct, 1, 'the strip is handed 100% work done');
    ok(sc.pace !== 'behind', `a 4-day job with every room cleared on day 3 does not read behind (pace: ${sc.pace || '—'})`);
    ok(!/past the planned end/.test(sc.paceTxt || ''), '…and does not say it will run past the planned end');

    // The OLD basis, for the record: the same job read this (room hours over the estimate's totals).
    const oldPct = est.rooms.reduce((s, r) => s + r.tcH + r.psH, 0) / (est.totTC + est.totPS);
    ok(oldPct < 0.8, `on the old basis this job read ${Math.round(oldPct * 100)}% with every room cleared`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('the projection gates on the SAME room fraction it prints');
  {
    // Rooms carry 10 concierge hrs; the estimate's TC total is 40 (30 of coordination). Four of
    // those ten are earned — 40% of the room work — and 30 TC hours are logged, projecting 75.
    const est = { svc: 'cleanout', days: 6, totTC: 40, totPS: 20, rooms: [
      { idx: 0, name: 'Kitchen', tcH: 4, psH: 8 },
      { idx: 1, name: 'Living Room', tcH: 6, psH: 12 },
    ] };
    const C = sandbox({ fns: ['computeProjection', 'jobProgress', 'roomStatusNormalize'],
                        vars: ['PROJ_CREW_DAY', 'TC_DONE_STATUSES', 'PS_DONE_STATUSES', 'ROOM_STATUS_META', 'ROOM_STATUS_LEGACY', 'EST_TOLERANCE_PCT'],
                        stubs: { estimateStore: { 7: { estimate: est } }, currentEstimate: null,
                                 getJobPlan: () => ({ rooms: { 0: { status: 'locked' } } }), saveJobPlan() {},
                                 jobLogEntries: () => LOG(30, 0), coAcceptedHours: () => ({ tc: 0, ps: 0 }) } });
    const snap = C.computeProjection(7);
    eq(Math.round(snap.tcPct * 100), 40, 'the band prints 40% complete (the room fraction)');
    eq(snap.projTC, 75, 'and projects 75 concierge hrs at that rate');
    eq(snap.tcBand, 'red', '⚠ past the ±15% line at 40% complete is red — the gate reads the same 40%, not 4/40 = 10%');

    // The specialist side the same way: the Kitchen CLEARED earns its 8 of the rooms' 20 PS hours (40%),
    // against an estimate PS total of 80 — so the whole-estimate fraction would be 10%.
    const est2 = Object.assign({}, est, { totPS: 80 });
    const C2 = sandbox({ fns: ['computeProjection', 'jobProgress', 'roomStatusNormalize'],
                         vars: ['PROJ_CREW_DAY', 'TC_DONE_STATUSES', 'PS_DONE_STATUSES', 'ROOM_STATUS_META', 'ROOM_STATUS_LEGACY', 'EST_TOLERANCE_PCT'],
                         stubs: { estimateStore: { 7: { estimate: est2 } }, currentEstimate: null,
                                  getJobPlan: () => ({ rooms: { 0: { status: 'cleared' } } }), saveJobPlan() {},
                                  jobLogEntries: () => LOG(0, 60), coAcceptedHours: () => ({ tc: 0, ps: 0 }) } });
    const s2 = C2.computeProjection(7);
    eq(Math.round(s2.psPct * 100), 40, 'the specialist band prints 40% complete');
    eq(s2.psBand, 'red', '⚠ and gates on that 40%, not 8/80 = 10%');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('nets: one basis, and the retired one cannot come back');
  {
    const body = live(fn('jobProgress'));
    lacks(body, 'P.estTC > 0 ? P.estTC', 'jobProgress no longer divides room hours by the estimate’s totals');
    lacks(live(src), 'wholePct', 'the whole-estimate fraction is gone from live code, not left computed beside the room one');
    const cp = live(fn('computeProjection'));
    has(cp, 'bandFor(projTC, estTC, tcPct)', 'the concierge band gates on the room fraction');
    has(cp, 'bandFor(projPS, estPS, psPct)', 'the specialist band gates on the room fraction');
  }
};
