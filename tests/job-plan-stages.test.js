'use strict';
// THE JOB PLAN IN THE ORDER A CONCIERGE RUNS A JOB (2026-09-19, evening). Anthony, reading the
// plan the field-capture build shipped: the rooms came before the pre-job authority, the vendors
// and the collections sat inside a folded Phase 0 below the work they precede, and "there's only
// phase two and phase four, there's no phase three" — Move Day only exists on Home Transition, so
// every other job counted 0, 1, 2, 4. "Apply some human logic to how we would run a job."
//
// The order now: gates (a chip row) → Vendors & partners → Before Day 1 → Rooms (never in a fold,
// the in-house boxes under the grid) → Hours & daily close → Midpoint & pickups → Move day →
// Close-out. Named stages, no numbers. These drive the REAL renderer and read the REAL markup,
// because the browser is the only other thing that can tell what a closed fold hides.
const { sandbox, domStub, source } = require('./harness');

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();
  const fn = (name) => { const i = src.indexOf('function ' + name + '('); if (i < 0) return ''; return src.slice(i, src.indexOf('\n}\n', i)); };
  const noComments = (t) => t.split('\n').map((l) => l.replace(/^\s*\/\/.*$/, '')).join('\n');

  const EST = (over) => Object.assign({ svc: 'cleanout', totTC: 5, totPS: 10, havellinTotal: 2000, days: 3, psCount: 2,
    rooms: [{ idx: 0, name: 'Kitchen', vol: 3, cplx: 3, tcH: 2, psH: 4, section: 'Kitchen & Utility' },
            { idx: 1, name: 'Study', vol: 3, cplx: 3, tcH: 3, psH: 6, section: 'Lifestyle Rooms' }],
    vendors: [], collections: [], vehicles: [], prepItems: [] }, over || {});
  const JOB = (over) => Object.assign({ id: 7, hvlId: 'HVL-0007', name: 'Butler', svc: 'cleanout', status: 'won', won: true, approved: true,
    start: '2026-09-21', houseFlags: {} }, over || {});

  // The same sandbox shape the field-capture suite drives the plan through, plus the stage helpers.
  const plan = (job, est, opts) => {
    opts = opts || {};
    const dom = domStub({});
    const j = sandbox({
      fns: ['renderJobPlan', 'planTaskCtx', 'planTasksFor', 'planTasksHtml', 'planTaskSectionsHtml', 'planSubsec', 'chkGrid',
            'planChk', '_planTaskDone', 'planPhaseWrap', 'planDerivedHtml', 'planDerivedLines', '_planRooms', '_planRoomStatus',
            '_planRoomListHtml', '_shotCount', '_slotRefs', 'roomStatusNormalize', 'firearmsBannerHtml', 'firearmsWorkspaceLine',
            'firearmsFlaggedAtIntake', '_firearmsRow', 'houseFlagsOf', '_jobInvRefs', '_srcLineKey',
            'planGateChipsHtml', 'vendorSourcingProgress', 'planStageMeta', 'planHoursMeta', 'planHoursMetaHtml', '_hrsTxt', '_todayStr'],
      vars: ['SVC_LABELS', '_planOpenPhases', 'PLAN_TASKS', 'FIREARMS_PROTOCOL_DOC', 'HOUSE_FLAGS', 'jobPlanStore', 'estimateStore',
             'TC_DONE_STATUSES', 'PS_DONE_STATUSES', 'ROOM_STATUS_META', 'ROOM_STATUS_LEGACY', 'INV_RELEASE_DISPOSITIONS', 'changeOrders'],
      stubs: {
        document: dom, isFormalDoc: () => false, _sfHost: () => '', renderVendorSourcing: () => '<i>SOURCING</i>',
        renderVendorScorecard: () => '', _importableFromEstimate: () => ({ collections: [], vehicles: [] }), getPlanNote: () => '',
        paymentSplit: () => ({ midpoint: 1000 }), estWorkingDays: () => 0, addWorkingDays: () => '',
        docSentAt: () => null, isAgreementSigned: () => !!opts.signed, isJobFunded: () => !!opts.funded, depositPaidTotal: () => 0,
        stagePaidTotal: () => opts.midPaid || 0, jobLogEntries: () => opts.logs || [], _photoRefs: { 7: [] },
      },
    });
    j.estimateStore[7] = { estimate: est, approved: true };   // _planRooms reads the rooms off the store, not the argument
    if (opts.plan) j.jobPlanStore[7] = opts.plan;
    return { out: j.renderJobPlan(7, job, est), ctx: j };
  };
  const idx = (out, needle) => { const i = out.indexOf(needle); if (i < 0) throw new Error('missing: ' + needle); return i; };

  group('⚠⚠ the order: gates → vendors → before Day 1 → rooms → hours → midpoint → close-out');
  {
    const { out } = plan(JOB(), EST());
    const order = ['id="plan-gates-7"', 'id="phase-body-vendors"', 'id="phase-body-p0"', '<!--/stage-p0-->', 'id="plan-rooms-7"',
                   'While you are in the house', 'id="phase-body-hours"', 'id="plan-hours-slot"', '<!--/stage-hours-->',
                   'id="phase-body-p2"', 'id="phase-body-p4"'];
    for (let i = 1; i < order.length; i++) ok(idx(out, order[i - 1]) < idx(out, order[i]), order[i - 1] + ' comes before ' + order[i]);
    ok(idx(out, 'id="plan-rooms-7"') > idx(out, '<!--/stage-p0-->') && idx(out, 'id="plan-rooms-7"') < idx(out, 'id="phase-body-hours"'),
       '⚠ the rooms sit BETWEEN two folds — never inside a closed body, which is what the browser found on the first cut');
    ok(idx(out, 'While you are in the house') < idx(out, 'id="phase-body-hours"') && idx(out, 'While you are in the house') > idx(out, 'id="plan-rooms-7"'),
       'the four in-house boxes sit under the room grid, not in a fold of their own');
    ok(idx(out, '<i>SOURCING</i>') < idx(out, 'id="plan-rooms-7"'), 'the vendor sourcing is ABOVE the rooms — the calls are made before the job starts');
    ok(idx(out, 'Pre-Job Call Notes') > idx(out, 'id="phase-body-p0"') && idx(out, 'Pre-Job Call Notes') < idx(out, '<!--/stage-p0-->'),
       'the pre-job call notes are a box inside Before Day 1, not a section of their own');
  }

  group('named stages, no numbers');
  {
    const { out } = plan(JOB(), EST());
    ['Vendors &amp; partners', 'Before Day 1', 'Hours &amp; daily close', 'Midpoint &amp; pickups', 'Close-out'].forEach((t) =>
      has(out, '>' + t + '</span>', 'the fold reads ' + t));
    ['Phase 0', 'Phase 1', 'Phase 2', 'Phase 3', 'Phase 4'].forEach((t) => lacks(out, t, 'no "' + t + '" anywhere on the plan'));
    lacks(out, 'phase-body-p1', 'there is no Phase 1 fold — its boxes live under the rooms');
    // ⚠ FOUND IN THE BROWSER, NOT BY THE RENDER ABOVE: the vendor scorecard's empty state read
    // "No vendors were assigned in Phase 0 sourcing", and this render stubs the scorecard out.
    // So the net is the SOURCE: no live line anywhere in the file may name a phase by number —
    // comments may (they explain the change), code may not. A fixture cannot render every
    // empty state, and the string that survives is always the one nobody rendered.
    const live = src.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
    lacks(live, 'Phase 0', '⚠ no live "Phase 0" anywhere in the app');
    ['Phase 1', 'Phase 2', 'Phase 3', 'Phase 4'].forEach((t) => ok(!new RegExp(t + '(?![0-9])').test(live), 'no live "' + t + '" anywhere in the app'));
    lacks(out, 'phase-body-p3', 'and no Move day fold on an estate job');
    const mm = plan(JOB({ svc: 'downsizing_move' }), EST({ svc: 'downsizing_move' })).out;
    has(mm, '>Move day</span>', 'Home Transition gets Move day');
    ok(idx(mm, 'id="phase-body-p2"') < idx(mm, 'id="phase-body-p3"') && idx(mm, 'id="phase-body-p3"') < idx(mm, 'id="phase-body-p4"'),
       'between Midpoint & pickups and Close-out');
    lacks(mm, 'While you are in the house', 'a living-client job with nothing to sequester has no in-house boxes and no empty heading');
  }

  group('the gates are chips, and a red chip carries its fix');
  {
    const { out } = plan(JOB(), EST());
    eq((out.match(/class="gate-chip /g) || []).length, 3, 'agreement · deposit · attorney on an estate settlement with no vendors');
    eq((out.match(/gate-no/g) || []).length, 3, 'all three red on a job with nothing recorded');
    has(out, '<strong>Deposit received:</strong> not yet', 'and the fix is under the row, not in a tooltip');
    lacks(out, 'id="plan-derived-p0-7"', 'the Before Day 1 fold does not repeat them as lines');
    eq((out.match(/class="pl-derived"/g) || []).length, 2, 'derived-line blocks survive on Midpoint & pickups and Close-out only');
    const signed = plan(JOB(), EST(), { signed: true, funded: true }).out;
    eq((signed.match(/gate-ok/g) || []).length, 2, 'signed and funded read green');
    const withVendor = plan(JOB({ vendorSourcing: { L1: { status: 'Confirmed' } } }), EST({ vendors: [{ lid: '1', type: 'Mover', cost: 100 }] })).out;
    has(withVendor, 'data-gate="vendors_lined_up"', 'a job with vendors gets the vendor chip');
    has(withVendor, 'gate-ok" data-gate="vendors_lined_up"', 'green once every line is confirmed');
    has(withVendor, '1 of 1 confirmed</span>', 'and the Vendors fold carries the count');
  }

  group('vendorSourcingProgress — what "lined up" means');
  {
    const v = sandbox({ fns: ['vendorSourcingProgress', '_srcLineKey'] });
    const est = { vendors: [{ lid: 'a', type: 'Mover' }, { lid: 'b', type: 'Auction House' }], collections: [{ id: 'c1' }], prepItems: [{ lid: 'p1' }] };
    const job = { vendorSourcing: { La: { status: 'Confirmed' }, Lb: { status: 'Quote requested' } }, collSourcing: { c1: { vendorId: 3 } }, prepSourcing: {},
                  logisticsSourcing: { junk: { vendorId: 9 } } };
    eq(JSON.stringify(v.vendorSourcingProgress(7, job, est)), '{"done":2,"total":4}', 'one confirmed vendor + the assigned collection, of four lines');
    eq(v.vendorSourcingProgress(7, {}, { vendors: [], collections: [], prepItems: [] }).total, 0, 'nothing on the estimate, nothing to line up');
    eq(v.vendorSourcingProgress(7, { logisticsSourcing: { junk: { vendorId: 9 } } }, {}).total, 0,
       '⚠ the end-of-job logistics slots never count — a job with no dumpster is not a job with a vendor missing');
  }

  group('the fold counts');
  {
    const { out } = plan(JOB(), EST(), { plan: { rooms: { 0: { status: 'locked' } }, tasks: { crew_briefed: true } } });
    has(out, '1 of 2 locked &middot; 0 cleared', 'the rooms header counts the statuses');
    has(out, '1 of 6 ticked</span>', 'Before Day 1 counts its ticks (six boxes on an estate settlement)');
    has(out, 'nothing on the estimate</span>', 'Vendors says so when the estimate carries no lines');
    has(out, 'today 0 hrs &middot; 0 of 15 logged', 'the Hours fold reads today and the running total against the estimate');
    const logged = plan(JOB({ status: 'active' }), EST(), { logs: [{ date: '2026-01-01', members: [{ hours: 4 }] }] }).out;
    has(logged, 'stage-warn">no hours logged today</span> &middot; 4 of 15 logged', '⚠ an active job with nothing logged today says so in amber on the fold');
    lacks(plan(JOB({ status: 'won' }), EST()).out, 'stage-warn', 'not before the job is active');
    const p2 = plan(JOB(), EST()).out;
    has(p2, '0 of 2 ticked &middot; 2 still open', 'Midpoint & pickups counts its ticks and its open derived lines');
    lacks(p2, 'nothing to tick &middot;', 'the wording is one thing or the other');
  }

  group('planCurrentStage — what opens by itself');
  {
    const c = sandbox({ fns: ['planCurrentStage', 'vendorSourcingProgress', '_srcLineKey', '_planRooms', '_planRoomStatus', 'roomStatusNormalize', '_planOpenStageFor'],
      vars: ['jobPlanStore', 'estimateStore', 'TC_DONE_STATUSES', 'PS_DONE_STATUSES', 'ROOM_STATUS_META', 'ROOM_STATUS_LEGACY', '_planOpenPhases', '_planLastJob'],
      stubs: { stagePaidTotal: () => 0 } });
    c.estimateStore[7] = { estimate: EST({ vendors: [{ lid: 'a', type: 'Mover' }] }) };
    const est = c.estimateStore[7].estimate;
    eq(c.planCurrentStage(7, JOB(), est), 'vendors', 'won, a vendor unconfirmed → Vendors');
    eq(c.planCurrentStage(7, JOB({ vendorSourcing: { La: { status: 'Confirmed' } } }), est), 'p0', 'won, everything confirmed → Before Day 1');
    eq(c.planCurrentStage(7, JOB({ status: 'active' }), est), '', 'active, rooms in progress → nothing (the rooms are always open)');
    c.jobPlanStore[7] = { rooms: { 0: { status: 'locked' }, 1: { status: 'locked' } } };
    eq(c.planCurrentStage(7, JOB({ status: 'active' }), est), 'p2', 'every room locked → Midpoint & pickups');
    c.jobPlanStore[7] = { rooms: { 0: { status: 'cleared' }, 1: { status: 'cleared' } } };
    eq(c.planCurrentStage(7, JOB({ status: 'active' }), est), 'p2', 'every room cleared but the midpoint unpaid → still Midpoint & pickups (money first)');
    c.stagePaidTotal = () => 5000;
    eq(c.planCurrentStage(7, JOB({ status: 'active' }), est), 'p4', 'cleared and paid → Close-out');
    // The open set resets on a JOB change and survives a redraw of the same job.
    c._planOpenStageFor(7, JOB({ status: 'active' }), est);
    eq(JSON.stringify(c._planOpenPhases), '{"p4":true}', 'the current stage opens on load');
    c._planOpenPhases.vendors = true;
    c._planOpenStageFor(7, JOB({ status: 'active' }), est);
    eq(JSON.stringify(c._planOpenPhases), '{"p4":true,"vendors":true}', '⚠ a redraw of the same job keeps what the crew opened');
    c._planOpenStageFor(8, JOB({ id: 8 }), EST());
    eq(JSON.stringify(c._planOpenPhases), '{"p0":true}', 'a different job starts from its own stage');
  }

  group('planPhaseWrap — the meta on the fold and the end marker; three arguments still work');
  {
    const w = sandbox({ fns: ['planPhaseWrap'], vars: ['_planOpenPhases'] });
    const three = w.planPhaseWrap('p2', 'Midpoint', 'BODY');
    has(three, 'id="phase-body-p2" style="display:none', 'starts closed');
    lacks(three, 'stage-meta', 'no meta, no span');
    ok(three.endsWith('<!--/stage-p2-->'), 'the end marker closes it');
    has(w.planPhaseWrap('p2', 'Midpoint', 'BODY', '3 of 5 ticked'), '<span class="stage-meta">3 of 5 ticked</span>', 'the count rides the fold');
  }

  group('⚠ the hours log is MOVED into its stage, and parked before anything rewrites the plan');
  {
    const load = fn('loadJobPlanTab'), rep = fn('_repaintPlan');
    ok(load.indexOf('_parkHoursSection();') > 0 && load.indexOf('_parkHoursSection();') < load.indexOf('var empty = function'),
       'the loader parks the section before its FIRST possible write — the empty-state writes included');
    has(load, "content.innerHTML = renderJobPlan(jobId, job, est);\n    _placeHoursSection();", 'and places it right after the labour render');
    ok(rep.indexOf('_parkHoursSection();') < rep.indexOf('content.innerHTML') && rep.indexOf('_placeHoursSection();') > rep.indexOf('content.innerHTML'),
       'the network-free repaint does the same in the same order');
    has(load, '_planOpenStageFor(jobId, job, est);', 'the current stage opens on load');
    has(fn('_parkHoursSection'), 'content.parentNode.insertBefore(ls, content)', 'parked is where it always was: just above the plan');
    has(fn('_placeHoursSection'), "getElementById('plan-hours-slot')", 'placed into the slot the Hours fold renders');
    lacks(noComments(src), 'function renderDailyCloseBlock', 'the duplicate projection block is gone, not left compiling');
    lacks(noComments(fn('renderJobPlan')), 'renderDailyCloseBlock', 'and nothing calls it');
    has(fn('renderJobPlan'), 'Change Order before the next room', 'its one sentence survives under the hours');
  }

  group('the stylesheet: three room cards across, the gate chips, the fold meta');
  {
    const css = src.slice(src.indexOf('<style>'), src.indexOf('</style>'));
    has(css, '.rl{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));', 'three columns on a desk');
    has(css, '@media (max-width:1100px){.rl{grid-template-columns:repeat(2,minmax(0,1fr));}}', 'two on the iPad');
    has(css, '@media (max-width:820px){.rl{grid-template-columns:minmax(0,1fr);}}', 'one on a phone');
    has(css, '.rl-row{display:flex;flex-direction:column;', 'the row is a card now');
    has(css, '.rl-note{display:block;font-size:10.5px;font-weight:400;color:var(--gray);font-style:italic;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}', 'the note is one truncated line');
    has(css, '.gate-chip{', 'chips'); has(css, '.gate-no{', 'red'); has(css, '.gate-ok{', 'green'); has(css, '.gate-fixes{', 'the fix line');
    has(css, '.stage-meta{', 'the count on the fold'); has(css, '.stage-warn{', 'and the amber hours warning');
    const row = fn('_planRoomListHtml');
    has(row, '<span class="rl-top"><span class="rl-name">', 'name and pill on the top line');
    ok(row.indexOf('class="rl-counts"') < row.indexOf('class="rl-note"'), 'counts, then the note');
  }
};
