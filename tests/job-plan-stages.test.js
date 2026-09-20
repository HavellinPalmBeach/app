'use strict';
// THE JOB PLAN IN THE ORDER A CONCIERGE RUNS A JOB (2026-09-19, evening), AND THEN THE FOLDS CAME OFF
// THE JOB ITSELF (2026-09-20). Anthony, the morning after the stage rebuild, off a screenshot of
// Midpoint & pickups, Move day and Close-out each behind a dark bar: "not sure this needs to be
// condensed with expanders … it's not that much info … let's rethink this all to make more sense to
// a human doing a job … Maybe the vendors and partners and hours in daily close are at the top and
// both expandable. But everything else just sort of runs in the order that it's done in a job …
// the main body should just be the job you're working and everything should flow logically."
//
// The order now: the header (with the dashboard's schedule strip) → gates (a chip row) → the two
// TOOLS, folded: Vendors & partners, Hours & daily close → the JOB, open, on one thread: Before
// Day 1 → In the house (the room cards, the in-house boxes) → Midpoint & pickups → Move day
// (Transition only) → Close-out. Each card carries a node — green behind you, bronze NOW, grey
// ahead. These drive the REAL renderer and read the REAL markup, because the browser is the only
// other thing that can tell what a closed fold hides — and there are now exactly two of them.
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
            'planChk', '_planTaskDone', 'planPhaseWrap', 'planStageCard', 'planStageState', 'planDerivedHtml', 'planDerivedLines',
            '_planRooms', '_planRoomStatus', '_planRoomListHtml', '_shotCount', '_slotRefs', 'roomStatusNormalize',
            'firearmsBannerHtml', 'firearmsWorkspaceLine', 'firearmsFlaggedAtIntake', '_firearmsRow', 'houseFlagsOf', '_jobInvRefs', '_srcLineKey',
            'planGateChipsHtml', 'vendorSourcingProgress', 'planStageMeta', 'planHoursMeta', 'planHoursMetaHtml', '_hrsTxt', '_todayStr',
            'planCurrentStage'],
      vars: ['SVC_LABELS', '_planOpenPhases', 'PLAN_TASKS', 'PLAN_FLOW', 'FIREARMS_PROTOCOL_DOC', 'HOUSE_FLAGS', 'jobPlanStore', 'estimateStore',
             'TC_DONE_STATUSES', 'PS_DONE_STATUSES', 'ROOM_STATUS_META', 'ROOM_STATUS_LEGACY', 'INV_RELEASE_DISPOSITIONS', 'changeOrders'],
      stubs: {
        document: dom, isFormalDoc: () => false, _sfHost: () => '', renderVendorSourcing: () => '<i>SOURCING</i>',
        renderVendorScorecard: () => '', _importableFromEstimate: () => ({ collections: [], vehicles: [] }), getPlanNote: () => '',
        paymentSplit: () => ({ midpoint: 1000 }), planScheduleHtml: () => '<div class="plan-sched">STRIP</div>',
        docSentAt: () => null, isAgreementSigned: () => !!opts.signed, isJobFunded: () => !!opts.funded, depositPaidTotal: () => 0,
        stagePaidTotal: () => opts.midPaid || 0, jobLogEntries: () => opts.logs || [], _photoRefs: { 7: [] },
      },
    });
    j.estimateStore[7] = { estimate: est, approved: true };   // _planRooms reads the rooms off the store, not the argument
    if (opts.plan) j.jobPlanStore[7] = opts.plan;
    return { out: j.renderJobPlan(7, job, est), ctx: j, hdr: dom.getElementById('job-plan-header').innerHTML };
  };
  const idx = (out, needle) => { const i = out.indexOf(needle); if (i < 0) throw new Error('missing: ' + needle); return i; };

  group('⚠⚠ the order: gates → the two tools, folded → the job, open, top to bottom');
  {
    const { out } = plan(JOB(), EST());
    const order = ['id="plan-gates-7"', 'id="phase-body-vendors"', '<i>SOURCING</i>', '<!--/stage-vendors-->',
                   'id="phase-body-hours"', 'id="plan-hours-slot"', '<!--/stage-hours-->',
                   'class="plan-flow"', 'id="stage-p0"', 'Pre-Job Call Notes', '<!--/stage-p0-->',
                   'id="stage-rooms"', 'id="plan-rooms-7"', 'Before anything leaves the house', '<!--/stage-rooms-->',
                   'id="stage-p2"', '<!--/stage-p2-->', 'id="stage-p4"', '<!--/stage-p4-->'];
    for (let i = 1; i < order.length; i++) ok(idx(out, order[i - 1]) < idx(out, order[i]), order[i - 1] + ' comes before ' + order[i]);
    eq((out.match(/id="phase-body-/g) || []).length, 2, '⚠⚠ exactly two folds on the plan — the tools, and nothing in the job body');
    ok(out.lastIndexOf('id="phase-body-') < idx(out, 'class="plan-flow"'), 'both tools sit ABOVE the job');
    ok(idx(out, 'id="plan-rooms-7"') > idx(out, '<!--/stage-hours-->'), '⚠ the rooms are never inside a closed body — every fold has closed before them');
    ok(idx(out, 'Before anything leaves the house') < idx(out, '<!--/stage-rooms-->'), 'the four in-house boxes sit under the room grid, inside the same card');
    ok(idx(out, 'Pre-Job Call Notes') > idx(out, 'id="stage-p0"') && idx(out, 'Pre-Job Call Notes') < idx(out, '<!--/stage-p0-->'),
       'the pre-job call notes are a box inside Before Day 1, not a section of their own');
    lacks(out, 'plan-rooms-block-', 'the old rooms block is gone — the rooms are a stage card like the others');
    lacks(out.slice(idx(out, 'class="plan-flow"')), 'display:none', 'nothing in the job body starts closed');
    eq((out.slice(0, idx(out, 'class="plan-flow"')).match(/style="display:none/g) || []).length, 2, 'the two tools above it do');
  }

  group('named stages, no numbers — two fold bars, four (five) cards');
  {
    const { out } = plan(JOB(), EST());
    ['Vendors &amp; partners', 'Hours &amp; daily close'].forEach((t) => has(out, '>' + t + '</span>', 'the fold reads ' + t));
    ['Before Day 1', 'In the house', 'Midpoint &amp; pickups', 'Close-out'].forEach((t) =>
      has(out, '<span class="stg-title">' + t, 'the card reads ' + t));
    has(out, 'class="stg-sub">Tap a room to shoot it and lock it.</span>', 'the rooms card says what to do with it');
    ['Phase 0', 'Phase 1', 'Phase 2', 'Phase 3', 'Phase 4'].forEach((t) => lacks(out, t, 'no "' + t + '" anywhere on the plan'));
    ['p0', 'p1', 'p2', 'p3', 'p4'].forEach((p) => lacks(out, 'phase-body-' + p, 'no ' + p + ' fold — the job does not fold'));
    // ⚠ FOUND IN THE BROWSER, NOT BY THE RENDER ABOVE: the vendor scorecard's empty state read
    // "No vendors were assigned in Phase 0 sourcing", and this render stubs the scorecard out.
    // So the net is the SOURCE: no live line anywhere in the file may name a phase by number —
    // comments may (they explain the change), code may not. A fixture cannot render every
    // empty state, and the string that survives is always the one nobody rendered.
    const live = src.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
    lacks(live, 'Phase 0', '⚠ no live "Phase 0" anywhere in the app');
    ['Phase 1', 'Phase 2', 'Phase 3', 'Phase 4'].forEach((t) => ok(!new RegExp(t + '(?![0-9])').test(live), 'no live "' + t + '" anywhere in the app'));
    lacks(out, 'id="stage-p3"', 'and no Move day on an estate job');
    const mm = plan(JOB({ svc: 'downsizing_move' }), EST({ svc: 'downsizing_move' })).out;
    has(mm, '<span class="stg-title">Move day', 'Home Transition gets Move day');
    ok(idx(mm, 'id="stage-p2"') < idx(mm, 'id="stage-p3"') && idx(mm, 'id="stage-p3"') < idx(mm, 'id="stage-p4"'),
       'between Midpoint & pickups and Close-out');
    lacks(mm, 'Before anything leaves the house', 'a living-client job with nothing to sequester has no in-house boxes and no empty heading');
  }

  group('⚠ the node on each card: green behind you, bronze NOW, grey ahead — off the stage the job is in');
  {
    const won = plan(JOB(), EST()).out;
    has(won, 'class="stg stg-cur" id="stage-p0"', 'a won job is in Before Day 1');
    has(won, '<span class="stg-title">Before Day 1<span class="stg-now">Now</span>', 'and the title says NOW');
    eq((won.match(/stg-now/g) || []).length, 1, 'exactly one NOW on the plan');
    eq((won.match(/stg-done/g) || []).length, 0, 'nothing is behind a job that has not started');
    has(won, 'class="stg" id="stage-rooms"', 'the house is ahead');
    const active = plan(JOB({ status: 'active' }), EST()).out;
    has(active, 'class="stg stg-done" id="stage-p0"', 'active: Before Day 1 is behind you');
    has(active, 'class="stg stg-cur" id="stage-rooms"', 'and the house is NOW');
    has(active, 'class="stg" id="stage-p2"', 'the midpoint is ahead');
    const locked = plan(JOB({ status: 'active' }), EST(), { plan: { rooms: { 0: { status: 'locked' }, 1: { status: 'locked' } } } }).out;
    has(locked, 'class="stg stg-done" id="stage-rooms"', 'every room locked: the house is behind you');
    has(locked, 'class="stg stg-cur" id="stage-p2"', 'and Midpoint & pickups is NOW');
    has(locked, 'class="stg" id="stage-p4"', 'Close-out ahead');
    const done = plan(JOB({ status: 'active' }), EST({ svc: 'downsizing_move' }),
                      { plan: { rooms: { 0: { status: 'cleared' }, 1: { status: 'cleared' } } }, midPaid: 500 }).out;
    has(done, 'class="stg stg-cur" id="stage-p4"', 'cleared and paid: Close-out is NOW');
    has(done, 'class="stg stg-done" id="stage-p3"', 'and Move day reads done behind it on a Transition');
    has(done, 'class="stg stg-done" id="stage-p2"', 'as does the midpoint');
  }

  group('the gates are chips, and a red chip carries its fix');
  {
    const { out } = plan(JOB(), EST());
    eq((out.match(/class="gate-chip /g) || []).length, 3, 'agreement · deposit · attorney on an estate settlement with no vendors');
    eq((out.match(/gate-no/g) || []).length, 3, 'all three red on a job with nothing recorded');
    has(out, '<strong>Deposit received:</strong> not yet', 'and the fix is under the row, not in a tooltip');
    lacks(out, 'id="plan-derived-p0-7"', 'the Before Day 1 card does not repeat them as lines');
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

  group('the counts — on the fold bars and in the card headings');
  {
    const { out } = plan(JOB(), EST(), { plan: { rooms: { 0: { status: 'locked' } }, tasks: { crew_briefed: true } } });
    has(out, '<span class="stg-count">1 of 2 locked &middot; 0 cleared</span>', 'the house card counts the statuses');
    has(out, '<span class="stg-count">1 of 5 ticked</span>',
        'Before Day 1 counts its ticks (five boxes on an estate settlement — six until the per-job NDA went, 2026-09-20)');
    has(out, 'nothing on the estimate</span>', 'Vendors says so when the estimate carries no lines');
    has(out, 'today 0 hrs &middot; 0 of 15 logged', 'the Hours fold reads today and the running total against the estimate');
    const logged = plan(JOB({ status: 'active' }), EST(), { logs: [{ date: '2026-01-01', members: [{ hours: 4 }] }] }).out;
    has(logged, 'stage-warn">no hours logged today</span> &middot; 4 of 15 logged', '⚠ an active job with nothing logged today says so in amber on the fold');
    lacks(plan(JOB({ status: 'won' }), EST()).out, 'stage-warn', 'not before the job is active');
    const p2 = plan(JOB(), EST()).out;
    has(p2, '<span class="stg-count">0 of 2 ticked &middot; 2 still open</span>', 'Midpoint & pickups counts its ticks and its open derived lines');
    lacks(p2, 'nothing to tick &middot;', 'the wording is one thing or the other');
  }

  group('planCurrentStage marks; only Vendors ever opens by itself');
  {
    const c = sandbox({ fns: ['planCurrentStage', 'planVendorsOpenOnLoad', 'vendorSourcingProgress', '_srcLineKey', '_planRooms', '_planRoomStatus',
                              'roomStatusNormalize', '_planOpenStageFor', 'planStageState'],
      vars: ['jobPlanStore', 'estimateStore', 'TC_DONE_STATUSES', 'PS_DONE_STATUSES', 'ROOM_STATUS_META', 'ROOM_STATUS_LEGACY', '_planOpenPhases', '_planLastJob', 'PLAN_FLOW'],
      stubs: { stagePaidTotal: () => 0 } });
    c.estimateStore[7] = { estimate: EST({ vendors: [{ lid: 'a', type: 'Mover' }] }) };
    const est = c.estimateStore[7].estimate;
    eq(c.planCurrentStage(7, JOB(), est), 'p0', 'won, a vendor unconfirmed → Before Day 1 (the calls are part of it)');
    eq(c.planCurrentStage(7, JOB({ vendorSourcing: { La: { status: 'Confirmed' } } }), est), 'p0', 'won, everything confirmed → Before Day 1');
    eq(c.planCurrentStage(7, JOB({ status: 'active' }), est), 'rooms', 'active, rooms in progress → the house');
    c.jobPlanStore[7] = { rooms: { 0: { status: 'locked' }, 1: { status: 'locked' } } };
    eq(c.planCurrentStage(7, JOB({ status: 'active' }), est), 'p2', 'every room locked → Midpoint & pickups');
    c.jobPlanStore[7] = { rooms: { 0: { status: 'cleared' }, 1: { status: 'cleared' } } };
    eq(c.planCurrentStage(7, JOB({ status: 'active' }), est), 'p2', 'every room cleared but the midpoint unpaid → still Midpoint & pickups (money first)');
    c.stagePaidTotal = () => 5000;
    eq(c.planCurrentStage(7, JOB({ status: 'active' }), est), 'p4', 'cleared and paid → Close-out');
    ['vendors', '', 'hours'].forEach((v) => ok(['p0', 'rooms', 'p2', 'p4'].indexOf(c.planCurrentStage(7, JOB(), est)) >= 0, 'it never answers a tool or nothing (' + JSON.stringify(v) + ')'));
    // planStageState, the node.
    eq(JSON.stringify(['p0', 'rooms', 'p2', 'p3', 'p4'].map((s) => c.planStageState(s, 'rooms'))), '["done","cur","","",""]', 'in the house: Before Day 1 done, the rest ahead');
    eq(JSON.stringify(['p0', 'rooms', 'p2', 'p3', 'p4'].map((s) => c.planStageState(s, 'p4'))), '["done","done","done","done","cur"]', 'at Close-out everything before it is done');
    eq(c.planStageState('p3', 'p2'), '', 'Move day is ahead while the midpoint is current');
    eq(c.planStageState('vendors', 'p0'), '', 'a tool has no node');
    eq(c.planStageState('p0', ''), '', 'and no current stage marks nothing');
    // What opens by itself: Vendors, while the job is not active and a line is unconfirmed.
    c.stagePaidTotal = () => 0; c.jobPlanStore[7] = {};
    ok(c.planVendorsOpenOnLoad(7, JOB(), est), 'won, a vendor unconfirmed → Vendors opens');
    ok(!c.planVendorsOpenOnLoad(7, JOB({ vendorSourcing: { La: { status: 'Confirmed' } } }), est), 'everything confirmed → nothing opens');
    ok(!c.planVendorsOpenOnLoad(7, JOB({ status: 'active' }), est), '⚠ an active job with a line still unconfirmed does not have the tool thrown open over the work');
    c._planOpenStageFor(7, JOB(), est);
    eq(JSON.stringify(c._planOpenPhases), '{"vendors":true}', 'Vendors opens on load');
    c._planOpenPhases.hours = true;
    c._planOpenStageFor(7, JOB(), est);
    eq(JSON.stringify(c._planOpenPhases), '{"vendors":true,"hours":true}', '⚠ a redraw of the same job keeps what the crew opened');
    c._planOpenStageFor(8, JOB({ id: 8, status: 'active' }), EST());
    eq(JSON.stringify(c._planOpenPhases), '{}', 'a different job starts from its own rule — an active job opens nothing');
    lacks(noComments(fn('_planOpenStageFor')), 'planCurrentStage', 'the stage the job is in decides no fold — it marks');
    ['p0', 'p2', 'p4', 'rooms'].forEach((s) => lacks(noComments(fn('_planOpenStageFor')), "'" + s + "'", 'it can never open ' + s));
  }

  group('planPhaseWrap — the tools’ fold: the meta on the bar and the end marker; three arguments still work');
  {
    const w = sandbox({ fns: ['planPhaseWrap'], vars: ['_planOpenPhases'] });
    const three = w.planPhaseWrap('vendors', 'Vendors', 'BODY');
    has(three, 'id="phase-body-vendors" style="display:none', 'starts closed');
    lacks(three, 'stage-meta', 'no meta, no span');
    ok(three.endsWith('<!--/stage-vendors-->'), 'the end marker closes it');
    has(w.planPhaseWrap('hours', 'Hours', 'BODY', 'today 3 hrs'), '<span class="stage-meta">today 3 hrs</span>', 'the count rides the fold');
  }

  group('planStageCard — an open card on the flow, with the same end marker');
  {
    const w = sandbox({ fns: ['planStageCard'] });
    const c = w.planStageCard('p2', 'Midpoint', 'BODY', '3 of 5 ticked', '');
    has(c, '<div class="stg" id="stage-p2">', 'a plain card when the stage is ahead');
    has(c, '<span class="stg-count">3 of 5 ticked</span>', 'the count in the heading');
    has(c, '<div class="stg-body">BODY</div>', 'the body, open');
    lacks(c, 'display:none', 'never closed');
    lacks(c, 'togglePhase', 'and nothing to tap');
    lacks(c, 'stg-now', 'no NOW tag when it is not the stage the job is in');
    ok(c.endsWith('<!--/stage-p2-->'), 'the end marker closes it, as the fold’s does');
    const cur = w.planStageCard('rooms', 'In the house', 'BODY', '0 of 3 locked', 'cur', 'Tap a room.');
    has(cur, '<div class="stg stg-cur" id="stage-rooms">', 'the current stage is marked');
    has(cur, 'In the house<span class="stg-now">Now</span>', 'and says NOW');
    has(cur, '<span class="stg-sub">Tap a room.</span>', 'a sub-line when given');
    has(w.planStageCard('p0', 'Before Day 1', 'B', '', 'done'), 'class="stg stg-done"', 'a stage behind you');
    lacks(w.planStageCard('p0', 'Before Day 1', 'B', '', 'done'), 'stg-count', 'no count, no span');
  }

  group('⚠ the checklists: a sentence, not a form label; a lone box spans the row');
  {
    const c = sandbox({ fns: ['planChk', 'chkGrid', 'planTaskSectionsHtml', 'planSubsec', 'planTasksFor', 'planTaskCtx'],
                        vars: ['PLAN_TASKS', 'jobPlanStore'], stubs: { _planTaskDone: (j, k) => k === 'coi_provided', isFormalDoc: () => false, firearmsFlaggedAtIntake: () => false } });
    const box = c.planChk(7, 'precall', 'Pre-job call placed');
    has(box, '<label class="plan-chk">', 'the box is a class, not seven inline properties');
    lacks(box, 'style=', 'no inline style at all');
    has(c.planChk(7, 'coi_provided', 'COI'), '<label class="plan-chk plan-chk-done"><input type="checkbox" checked', 'a ticked box carries the done class');
    const ctx = c.planTaskCtx({ svc: 'cleanout' }, { svc: 'cleanout' });
    const p0 = c.planTaskSectionsHtml(7, c.planTasksFor(c.PLAN_TASKS, 'p0', ctx), ctx, ['Pre-job call']);
    eq((p0.match(/<label class="plan-chk/g) || []).length, 1, 'the pre-job call section is one box');
    has(p0, '<div class="chk-grid"><label class="plan-chk">', 'in its own grid — the :only-child rule is what spans it');
    const t = noComments(fn('togglePlanTask'));
    has(t, "classList.toggle('plan-chk-done', !!checked)", 'the tick flips the class');
    lacks(t, 'style.color', 'and paints nothing by hand');
    lacks(t, 'textDecoration', 'nothing');
  }

  group('⚠ the schedule strip on the plan header — the dashboard’s own, never a second reading of the dates');
  {
    const s = sandbox({ fns: ['planScheduleHtml', 'jobSchedule', 'jtScheduleHtml', 'jobProgress', 'estWorkingDays', 'addWorkingDays',
                              'workingDaysInclusive', 'approvedEstimateFor', 'roomStatusNormalize'],
                        vars: ['PRODUCTIVE_HRS_PER_DAY', 'PROJ_CREW_DAY', 'jobPlanStore', 'estimateStore', 'TC_DONE_STATUSES', 'PS_DONE_STATUSES', 'ROOM_STATUS_META', 'ROOM_STATUS_LEGACY'],
                        stubs: { docSentAt: () => null, jobLogEntries: () => [], _todayStr: () => '2026-09-24' } });
    const est = EST({ days: 6 });
    s.estimateStore[7] = { estimate: est, approved: true };
    const planned = s.planScheduleHtml(7, JOB(), est);
    has(planned, '<div class="plan-sched"><div class="jt-sched">', 'the strip, wrapped for the header card');
    has(planned, 'Target start', 'a job that has not started states its target');
    has(planned, '6 working days', 'and its length');
    has(planned, 'Target end', 'and the target end');
    const running = s.planScheduleHtml(7, JOB({ status: 'active', activatedOn: '2026-09-22' }), est);
    has(running, 'Started', 'an active job says when it started');
    has(running, '2026-09-22', 'the recorded start');
    has(running, 'target was', '⚠ and names the target it slipped from');
    has(running, '2026-09-21', 'the target start');
    has(running, 'Today', 'today, in words');
    has(running, '2026-09-24', 'the date the working day was measured against');
    has(running, 'Working day 3 of 6', 'where the job is');
    has(running, '3 working days to go', '⚠ and how many are left — Anthony’s "three more days"');
    has(running, 'Target end', 'the target end still reads');
    has(running, 'now ending', 'and the end the slip moved it to');
    eq(s.planScheduleHtml(7, JOB({ status: 'lost' }), est), '', 'a dead job renders nothing');
    lacks(noComments(fn('planScheduleHtml')), 'getJobPlan', '⚠ it reads the plan store directly — the accessor MINTS a plan for any job it is asked about');
    has(fn('planScheduleHtml'), 'jobPlanStore[jobId]', 'directly');
    const r = noComments(fn('renderJobPlan'));
    has(r, 'planScheduleHtml(jobId, job, est)', 'the header calls it');
    lacks(r, 'estWorkingDays(', '⚠ and computes no length of its own — that is the drift this file records twice');
    lacks(r, 'addWorkingDays(', 'nor an end date');
    lacks(r, "'Target Start'", 'the hand-typed date bits are gone');
    lacks(r, "'Projected'", 'both of them');
    // The strip lands under the client line, inside the header card.
    const { hdr } = plan(JOB(), EST());
    ok(hdr.indexOf('Client:') < hdr.indexOf('<div class="plan-sched">'), 'under the client line');
  }

  group('⚠ the hours log is MOVED into its fold at the top, and parked before anything rewrites the plan');
  {
    const load = fn('loadJobPlanTab'), rep = fn('_repaintPlan');
    ok(load.indexOf('_parkHoursSection();') > 0 && load.indexOf('_parkHoursSection();') < load.indexOf('var empty = function'),
       'the loader parks the section before its FIRST possible write — the empty-state writes included');
    has(load, "content.innerHTML = renderJobPlan(jobId, job, est);\n    _placeHoursSection();", 'and places it right after the labour render');
    ok(rep.indexOf('_parkHoursSection();') < rep.indexOf('content.innerHTML') && rep.indexOf('_placeHoursSection();') > rep.indexOf('content.innerHTML'),
       'the network-free repaint does the same in the same order');
    has(load, '_planOpenStageFor(jobId, job, est);', 'the open set is decided on load');
    has(fn('_parkHoursSection'), 'content.parentNode.insertBefore(ls, content)', 'parked is where it always was: just above the plan');
    has(fn('_placeHoursSection'), "getElementById('plan-hours-slot')", 'placed into the slot the Hours fold renders');
    lacks(noComments(src), 'function renderDailyCloseBlock', 'the duplicate projection block is gone, not left compiling');
    lacks(noComments(fn('renderJobPlan')), 'renderDailyCloseBlock', 'and nothing calls it');
    has(fn('renderJobPlan'), 'Change Order before the next room', 'its one sentence survives under the hours');
  }

  group('the stylesheet: the thread and its nodes, the lone box, the sentence-case box, the strip in the card');
  {
    const css = src.slice(src.indexOf('<style>'), src.indexOf('</style>'));
    has(css, '.chk-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));', 'three columns of boxes on a desk');
    has(css, '.chk-grid > :only-child{grid-column:1 / -1;}', '⚠ a section with one box spans the row');
    has(css, '.plan-chk{', 'the box rule');
    ok(/\.plan-chk\{[^}]*text-transform:none/.test(css), '⚠ sentence case — the global label rule made every stage a wall of capitals');
    ok(/\.plan-chk\{[^}]*font-size:12\.5px/.test(css), 'at a readable size');
    has(css, '.plan-chk-done{color:var(--gray);text-decoration:line-through;}', 'a ticked box greys out');
    has(css, '.plan-flow{position:relative;padding-left:22px;}', 'the thread’s gutter');
    has(css, '.stg::before{', 'a node per card');
    has(css, '.stg:not(:last-child)::after{', 'joined by a thread');
    has(css, '.stg-done::before{border-color:var(--sage-dk)', 'green behind you');
    has(css, '.stg-cur::before{border-color:var(--bronze)', 'bronze where you are');
    has(css, '.stg-cur{border-color:var(--bronze);box-shadow:inset 3px 0 0 var(--bronze);}', 'and the card itself carries the accent');
    has(css, '.stg-now{', 'the NOW tag');
    has(css, '.stg-count{', 'the count in the heading');
    has(css, '.plan-sched .jt-sched{', 'the strip re-seated inside the header card');
    has(css, '.rl{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));', 'three room cards across on a desk');
    has(css, '@media (max-width:1100px){.rl{grid-template-columns:repeat(2,minmax(0,1fr));}}', 'two on the iPad');
    has(css, '@media (max-width:820px){.rl{grid-template-columns:minmax(0,1fr);}}', 'one on a phone');
    has(css, '.gate-chip{', 'chips'); has(css, '.gate-no{', 'red'); has(css, '.gate-ok{', 'green'); has(css, '.gate-fixes{', 'the fix line');
    has(css, '.stage-meta{', 'the count on the fold'); has(css, '.stage-warn{', 'and the amber hours warning');
    const row = fn('_planRoomListHtml');
    has(row, '<span class="rl-top"><span class="rl-name">', 'name and pill on the top line');
    ok(row.indexOf('class="rl-counts"') < row.indexOf('class="rl-note"'), 'counts, then the note');
  }
};
