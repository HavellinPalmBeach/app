'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// THE JOB PLAN FROM THE FIELD — seven reports off one dummy client (2026-09-23)
//
// Anthony, off the Job Plan for Robert & Jean ZZ Ellsworth (Home Transition), in one message:
//   1. "the activate job button on the client dashboard should take you to the job plan"
//   2. "document shredding gets lumped into end of job logistics automatically, whether or not you
//      want it … It should just be the vendors that you choose when you create the estimate"
//   3. "if it changes, the dates on the top of the job plan need to update and you need to do away
//      with the old ones like the target start date and target midpoint because it's very confusing"
//   4. "I was assigned to do the walkthrough, but Ashley was assigned as the transition concierge
//      at client intake. But then on the job plan, I was listed as the default"
//   5. "we were able to lock in a team where both property specialists were Anthony Jr"
//   6. "we'd also like an indicator for … locking in the job team"
//   7. "the next stage is midpoint invoice sent … makes it seem like we've already done that"
//
// Every one of them was REPRODUCED in a browser before anything was built, and #4 was worse than
// reported: the concierge select READ "Ashley Jerome" while the crew record held "Anthony
// Graziano", and Save & Confirm locked in the name that was not on the screen.
//
// Driven, not grepped, wherever the function can be driven. The source pins that remain are named
// as pins, for the DOM-heavy paths the browser run (tests/browser/step20.js) proves.
// ─────────────────────────────────────────────────────────────────────────────

const { sandbox, source, fn, domStub } = require('./harness');

// Line-based comment strip: a /*…*/ regex eats ~170KB of this file (accept="image/*").
const live = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();

  // ═══════════════════════════════════════════════════════════════════════════
  // #7 — THE BAND SAYS WHAT TO DO NEXT, NOT WHAT THE MILESTONE WILL BE CALLED ONCE IT IS DONE
  // ═══════════════════════════════════════════════════════════════════════════
  const TL_FNS = ['jobTimeline', 'jobTimelineNext', 'paymentSplit', 'unscoredRoomNames',
    'jobActivationBlockers', 'isJobWon', 'isJobFunded', 'jobPayments', 'stagePaidTotal', 'depositPaidTotal',
    'depositTargetFor', 'docSentAt', 'docDraftedAt', 'docKeyFor', 'agreementSignature', 'isAgreementSigned',
    'esignProviderKey', 'esignAvailable', 'esignJobWatches', 'isAgreementSent'];
  const EST = () => ({ svc: 'cleanout', days: 6, totTC: 11, totPS: 22, havellinTotal: 20000,
    rooms: [{ idx: 0, name: 'Kitchen', vol: 3, cplx: 3, tcH: 5, psH: 10 },
            { idx: 1, name: 'Study', vol: 3, cplx: 3, tcH: 6, psH: 12 }] });
  // Robert & Jean ZZ Ellsworth, at the moment of the report: active, deposit in, the midpoint
  // invoice not yet sent — so the band's NEXT is `midpoint_invoiced`.
  const ELLSWORTH = (over) => Object.assign({ id: 7, hvlId: 'HVL-2609-TZAK', name: 'Robert & Jean ZZ Ellsworth',
    svc: 'downsizing_move', status: 'active', won: true, wonAt: '2026-09-10', wonBy: 'Anthony Graziano',
    approved: true, agrApproved: true, agrSent: true, agrSigned: true, created: 'Sep 8, 2026',
    walkthrough: '2020-01-01', estimateSentDate: 'September 9, 2026', start: '2026-10-05', activatedOn: '2026-09-23',
    docState: { 'invoice:deposit': { sentAt: '2026-09-15T10:00:00Z' } },
    payments: [{ id: 1, uid: 'p1', stage: 'deposit', amount: 10000, date: '2026-09-19', method: 'wire' }] }, over || {});

  group('⚠⚠ #7 — the band says the STEP ("Send the midpoint invoice"), never the finished milestone');
  {
    const T = sandbox({ fns: TL_FNS, vars: ['JT_SHORT', 'JT_NEXT', 'AGR_SIG_METHODS', 'ESIGN_PROVIDERS'] });
    const rec = { estimate: EST(), approved: true, savedAt: 1789067253747 };
    T.estimateStore = { 7: rec };
    const rows = T.jobTimeline(ELLSWORTH(), rec, [], []);
    eq(rows.length, 16, 'the whole rail, sixteen rows');
    const next = T.jobTimelineNext(rows);
    eq(next && next.key, 'midpoint_invoiced', 'Ellsworth, deposit in and active: the live step is the midpoint invoice');
    eq(next.label, 'Midpoint invoice sent', 'the ROW keeps its milestone name — the rail prints it beside a green node once done');
    eq(next.todo, 'Send the midpoint invoice', '⚠⚠ and carries the STEP, in the imperative, for the band');

    // ⚠ A NET, NOT TODAY'S LIST: every row the rail builds has a step, and no step is its own
    // milestone name — a row added later cannot fall back to printing "… sent" under NEXT.
    rows.forEach((r) => {
      ok(Object.prototype.hasOwnProperty.call(T.JT_NEXT, r.key), `JT_NEXT carries a step for "${r.key}"`);
      ok(r.todo && r.todo !== r.label, `"${r.key}": the step ("${r.todo}") is not the milestone name ("${r.label}")`);
      // An INSTRUCTION opens on a verb — "Send…", "Collect…", "Get the estimate approved" — where a
      // milestone name opens on its noun ("Midpoint invoice sent").
      ok(/^(Finish|Do|Build|Get|Send|Collect|Activate) /.test(r.todo),
         `"${r.key}": the step opens on a verb ("${r.todo}") — an instruction, not a milestone name`);
    });
    eq(Object.keys(T.JT_NEXT).length, rows.length, '…and carries no key the rail does not build');
    eq(T.JT_NEXT.deposit_received, 'Collect the deposit', 'money arriving reads as the thing to do about it');
    eq(T.JT_NEXT.job_active, 'Activate the job', 'and the activation reads as an action');
  }

  group('#7, driven through the real band renderer');
  {
    const DFNS = TL_FNS.concat(['jtBandHtml', 'jobTimelineActions', 'jobTimelineDoc', 'jobStageDoc', 'docReadiness',
      'docDraftOnly', 'docTitle', 'docWord', '_jtDocSecondaries', '_jtDocViews', '_jtDraftLink', '_jtDriveLink',
      '_jtSendAction', 'agreementReady', 'jtRailHtml', '_jtAtFmt', '_jtStateCls', 'roomStatusNormalize', 'fmtMoney']);
    const B = sandbox({ fns: DFNS, vars: ['JT_SHORT', 'JT_NEXT', 'JT_LEG_BREAK', 'JT_ROW_DOC', 'AGR_SIG_METHODS', 'ESIGN_PROVIDERS',
      'DOC_READY_WHY', 'DOC_KIND_WORD', 'DOC_STAGE_WORD', 'DOC_ACTIONS', 'SVC_LABELS', 'ROOM_STATUS_META', 'ROOM_STATUS_LEGACY'],
      stubs: { _todayStr: () => '2026-09-23', Intl: global.Intl } });
    const rec = { estimate: EST(), approved: true, savedAt: 1789067253747 };
    B.estimateStore = { 7: rec };
    const job = ELLSWORTH();
    B.jobs = [job];
    const rows = B.jobTimeline(job, rec, [], []);
    const band = B.jtBandHtml(job, rec, rows, B.jobTimelineNext(rows)).html;
    has(band, '<div class="jt-next-step">Send the midpoint invoice</div>', '⚠⚠ NEXT reads the step to take');
    lacks(band, 'Midpoint invoice sent', '⚠⚠ …and never the milestone name, which reads as already done');
    has(B.jtRailHtml(rows), 'Midpoint invoice sent', 'the rail below still names the milestone — that is where the name belongs');
    // A blocked step keeps the imperative too: "⚠ Blocked / Get the estimate approved".
    const blocked = rows.slice();
    const blk = Object.assign({}, rows.filter((r) => r.key === 'midpoint_invoiced')[0], { state: 'blocked', blockedWhy: 'why', blockedFix: 'fix' });
    const bh = B.jtBandHtml(job, rec, blocked, blk).html;
    has(bh, 'Blocked', 'a blocked band still says it is blocked');
    has(bh, 'Send the midpoint invoice', 'and names the step it is blocked on, as a step');
    has(live(fn('jtBandHtml')), 'esc(next.todo || next.label)', 'the band reads `todo`, with the label only as a fallback for a row carrying none');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // #3 — ONE START, ONE HALFWAY, ONE END, COUNTED FROM THE DAY THE JOB REALLY STARTED
  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠⚠ #3 — Anthony’s own strip, rendered: a job activated twelve days ahead of its target start');
  {
    // fmtDate2 lifted for real (it overrides the harness passthrough), under the zone it runs in.
    const prevTZ = process.env.TZ;
    process.env.TZ = 'America/New_York';
    try {
      const S = sandbox({ fns: ['jobSchedule', 'jtScheduleHtml', 'estWorkingDays', 'addWorkingDays', 'workingDaysInclusive',
                                'docSentAt', 'docKeyFor', 'fmtDate2', 'coWorkingDays', '_coPaceFix'], vars: ['PRODUCTIVE_HRS_PER_DAY'] });
      const est = { svc: 'downsizing_move', days: 6 };
      const job = { id: 7, svc: 'downsizing_move', status: 'active', start: '2026-10-05', activatedOn: '2026-09-23' };
      const d = S.jobSchedule(job, est, '2026-09-23');
      eq(d.anchor, '2026-09-23', 'the plan counts from the day the job started');
      eq(d.halfway, '2026-09-25', 'halfway is day 3 of 6 from the 23rd');
      eq(d.planEnd, '2026-09-30', 'and the end is day 6 — the date the old strip already called "now ending"');
      const strip = S.jtScheduleHtml(d).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      has(strip, 'Started Sep 23, 2026', 'the recorded start');
      has(strip, 'Working day 1 of 6', 'where the job is');
      has(strip, '5 working days to go', 'and what is left');
      has(strip, 'Halfway Sep 25, 2026', '⚠⚠ the halfway, from the real start');
      has(strip, 'Planned end Sep 30, 2026', '⚠⚠ ONE end, from the real start');
      // The four dates his screenshot printed off a start that never happened:
      ['Oct 5, 2026', 'Oct 7, 2026', 'Oct 12, 2026'].forEach((dt) =>
        lacks(strip, dt, `⚠⚠ "${dt}" — a date counted from the target start — is gone from the strip`));
      lacks(strip, 'target was', '…no "target was" beside the start');
      lacks(strip, 'now ending', '…and no second end');
      lacks(strip, 'Target end', '…nor a "Target end" once the job runs on its real start');

      // Before it starts, the target is what it runs on — and says so.
      const planned = S.jtScheduleHtml(S.jobSchedule({ id: 7, svc: 'downsizing_move', status: 'won', start: '2026-10-05' }, est, '2026-09-23'))
        .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      has(planned, 'Target start Oct 5, 2026', 'a job not yet started states its target start');
      has(planned, 'Halfway Oct 7, 2026', '…the halfway off it');
      has(planned, 'Target end Oct 12, 2026', '…and the target end');

      // "If it changes, the dates … need to update": moving the target in Edit Client moves the strip.
      const moved = S.jtScheduleHtml(S.jobSchedule({ id: 7, svc: 'downsizing_move', status: 'won', start: '2026-10-12' }, est, '2026-09-23'))
        .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      has(moved, 'Target start Oct 12, 2026', 'a moved target start moves the strip');
      has(moved, 'Target end Oct 19, 2026', '…and every date counted from it');
      lacks(moved, 'Oct 5, 2026', '…and the old date is not left beside it');
    } finally {
      if (prevTZ === undefined) delete process.env.TZ; else process.env.TZ = prevTZ;
    }
  }

  group('#3 — the hard target is tested against the start the job really had');
  {
    const S = sandbox({ fns: ['jobSchedule', 'estWorkingDays', 'addWorkingDays', 'workingDaysInclusive', 'docSentAt', 'docKeyFor', 'coWorkingDays', '_coPaceFix'],
                        vars: ['PRODUCTIVE_HRS_PER_DAY'] });
    const est = { svc: 'cleanout', days: 6 };
    // Target start the 21st, a hard target of the 25th — reachable on paper — but the job only
    // started on the 28th. The plan now counts from the 28th, so the hard target is BEFORE the start.
    const late = S.jobSchedule({ id: 7, svc: 'cleanout', status: 'active', start: '2026-09-21', activatedOn: '2026-09-28',
                                 completion: '2026-09-25' }, est, '2026-09-29');
    eq(late.fit, 'inverted', '⚠ a hard target that fell before the REAL start is named as such, not measured against the target start');
    eq(late.fitTxt, 'The hard target is before the start.', '…in words that name the start it means');
    const planned = S.jobSchedule({ id: 7, svc: 'cleanout', status: 'won', start: '2026-09-21', completion: '2026-09-25' }, est, '2026-09-14');
    eq(planned.fit, 'late', 'the same dates before the job starts: the plan simply runs past the hard target');
  }

  group('⚠⚠ #3 — activating AHEAD of the target start asks first, because the stamp is write-once');
  {
    const asked = [];
    const T = sandbox({ fns: ['applyJobTransition', 'jobActivationBlockers', '_actor', 'isJobFunded', 'jobPayments', 'stagePaidTotal',
                              'depositPaidTotal', 'isAgreementSigned', 'agreementSignature', 'jobCloseBlockers', 'unratedVendorsForJob',
                              '_assignedVendorsForJob', 'lookupVendorById', 'vendorIdOf'],
                        vars: ['JOB_TRANSITIONS'],
                        stubs: { _todayStr: () => '2026-09-23', fmtDate2: (d) => 'D:' + d, agrApprovedBy: '', approvedBy: 'Anthony Graziano',
                                 confirm: (m) => { asked.push(m); return T.__answer; } } });
    const READY = (over) => Object.assign({ id: 7, status: 'won', won: true, agrSigned: true, depositReceived: true,
      payments: [{ id: 1, stage: 'deposit', amount: 10000 }] }, over || {});

    T.__answer = false;
    const early = READY({ start: '2026-10-05' });
    ok(T.applyJobTransition(early) === false, '⚠⚠ Cancel on an early activation activates NOTHING');
    eq(early.status, 'won', '…the status does not move');
    ok(!early.activatedOn, '…and no start date is stamped — the one thing that could not be taken back');
    eq(asked.length, 1, 'it asked exactly once');
    has(asked[0], 'D:2026-10-05', 'the question names the target start');
    has(asked[0], 'D:2026-09-23', '…and today');
    has(asked[0], 'cannot be changed afterwards', '…and says why it is asking');

    T.__answer = true;
    ok(T.applyJobTransition(early) === true, 'OK activates it');
    eq(early.status, 'active', '…active');
    eq(early.activatedOn, '2026-09-23', '…stamped today, because that is what was confirmed');

    asked.length = 0;
    const onTime = READY({ start: '2026-09-23' });
    ok(T.applyJobTransition(onTime), 'on the target date itself');
    eq(asked.length, 0, '⚠ nothing is asked — only an EARLY start is a surprise');
    const late = READY({ start: '2026-09-15' });
    ok(T.applyJobTransition(late), 'a late start');
    eq(asked.length, 0, 'is simply late, and asks nothing');
    const noStart = READY();
    ok(T.applyJobTransition(noStart), 'a job with no target start at all');
    eq(asked.length, 0, 'has nothing to be early against');
    // A re-open keeps its original stamp, so there is nothing to confirm.
    const reopen = READY({ status: 'closed', start: '2026-10-05', activatedOn: '2026-09-01' });
    ok(T.applyJobTransition(reopen) && reopen.status === 'active', 're-opening a closed job');
    eq(asked.length, 0, '⚠ asks nothing — its start date was fixed on the first activation');
    eq(reopen.activatedOn, '2026-09-01', '…and keeps it');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // #1 — THE ACTIVATION LANDS ON THE JOB PLAN
  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠⚠ #1 — pressing Activate takes you to that client’s Job Plan; closing does not');
  {
    const calls = { plan: [], redraw: [], dash: [] };
    const A = sandbox({ fns: ['activateOrCycle'],
                        stubs: { saveJobs: () => {}, syncJobToSheets: () => {},
                                 applyJobTransition: (j) => { j.status = A.__to; return true; },
                                 openJobPlanFor: (id) => { calls.plan.push(id); return A.__planOk; },
                                 _dashRedraw: (id) => { calls.redraw.push(id); return true; },
                                 renderClientDashboard: (id) => { calls.dash.push(id); } } });
    A.jobs = [{ id: 7, status: 'won' }, { id: 8, status: 'active' }];
    A.__to = 'active'; A.__planOk = true;
    A.activateOrCycle(7);
    eq(calls.plan, [7], '⚠⚠ an activation opens THAT client’s Job Plan');
    eq(calls.redraw.length, 0, '…and does not redraw the dashboard it is leaving');
    A.__to = 'closed';
    A.activateOrCycle(8);
    eq(calls.plan, [7], 'closing a job does NOT navigate — the close-out is the other half of the button and stays put');
    eq(calls.redraw, [8], '…it repaints where you are');
    A.jobs[0].status = 'won'; A.__to = 'active'; A.__planOk = false;
    A.activateOrCycle(7);
    eq(calls.redraw, [8, 7], '⚠ if the Job Plan cannot be opened (the job left this device) it falls back to the repaint');
    A.jobs.push({ id: 9, status: 'closed' }); A.__planOk = true;
    const before = calls.plan.length;
    A.activateOrCycle(9);   // closed -> active (Re-open)
    eq(calls.plan.length, before + 1, 're-opening a closed job starts it again, so it lands on the plan too');

    // openJobPlanFor: the one way onto a client's Job Plan from another screen. DOM-heavy (it
    // presses the real nav), so pinned here and proven in tests/browser/step20.js.
    const o = live(fn('openJobPlanFor'));
    ok(o.indexOf('setCurrentJob(jobId)') > -1 && o.indexOf('setCurrentJob(jobId)') < o.indexOf('nb.click()'),
       'it records the client BEFORE pressing the nav, so showPanel adopts it into the picker');
    has(o, "jobs.some(function(x){ return x.id === jobId; })", 'it refuses a job no longer on this device rather than landing on an empty picker');
    has(o, "togglePhase(fold)", 'a fold can be opened on arrival');
    eq(live(fn('goToJobLog')).replace(/\s+/g, ' ').trim(), "function goToJobLog(jobId) { openJobPlanFor(jobId, 'hours'); }",
       '"+ Log Hours Today" is the same door, with the hours fold opened — its two timers and text-matched nav are gone');
    has(live(fn('openClientDashboard')), 'setCurrentJob(jobId)',
        '⚠ opening a client records it, so tapping Job Plan next opens THAT client (it used to land on "Select a job")');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // #2 — END-OF-JOB LOGISTICS: THE VENDORS YOU CHOSE, NEVER A STANDING LIST
  // ═══════════════════════════════════════════════════════════════════════════
  const LOGI_FNS = ['logisticsCatsFor', 'logisticsLineOn', 'logisticsLinesFor'];
  group('⚠⚠ #2 — an end-of-job category is on the job only when somebody put it there');
  {
    const L = sandbox({ fns: LOGI_FNS, vars: ['LOGISTICS_CATEGORIES'] });
    const keys = (job, v) => L.logisticsLinesFor(job, v || []).map((c) => c.key);
    eq(keys({}), [], '⚠⚠ a job with nothing recorded carries NO end-of-job lines — no Document Shredding waiting for a vendor');
    eq(keys({ logisticsSourcing: { shred: {}, junk: {} } }), [], 'an empty record is not a line either');
    eq(keys({ logisticsSourcing: { shred: { added: true } } }), ['shred'], 'a category somebody ADDED is on the job');
    eq(keys({ logisticsSourcing: { junk: { vendorId: 9 } } }), ['junk'], 'a line sourced before today (a vendor on it) still shows');
    eq(keys({ logisticsSourcing: { cleaning: { quote: 450 } } }), ['cleaning'], '…as does one with only a quote — it is billed, so it must be visible');
    eq(keys({ logisticsSourcing: { dumpster: { status: 'Contacted' } } }), ['dumpster'], '…or a status');
    eq(keys({ logisticsSourcing: { donation: { quote: 0 } } }), ['donation'], '⚠ a quote of 0 is a recorded answer, not an absence');
    eq(keys({ logisticsSourcing: { junk: { added: true } } }, [{ type: 'Junk Removal / Hauling' }]), [],
       '⚠ a category the ESTIMATE already carries is never listed twice — it lives under Service Vendors');
    eq(keys({ logisticsSourcing: { shred: { added: true }, donation: { added: true }, junk: { added: true } } }),
       ['donation', 'junk', 'shred'], 'several lines come back in catalogue order, not click order');
  }

  group('#2 — the sourcing list renders the lines on the job, and ADDS the rest one pick at a time');
  {
    const R = sandbox({ fns: ['renderVendorSourcing'].concat(LOGI_FNS), vars: ['LOGISTICS_CATEGORIES'],
      stubs: { vendorDirectory: [{}], dirStaleNotice: () => '', vendorPickerOptions: () => '<option>V</option>',
               vendorCategoriesForSlot: () => [], _selVendorId: () => '', _fldBg: () => '', vendorStatusOptions: () => '',
               _coordHrsField: () => '', coordHrsFor: () => 1, _vendorRefLine: () => '', _srcLineKey: (l, i) => 'L' + i,
               prepFeeRate: () => 0.3, prepLineTCHrs: () => 0, coordHrsRollup: () => '', getJobPlan: () => ({}),
               planChk: () => '', planCollectionStatusBtns: () => '', _renderCollPhotoCapture: () => '' } });
    const EST2 = { vendors: [{ type: 'Mover', cost: 3000 }], collections: [], prepItems: [] };
    const fresh = R.renderVendorSourcing(7, { id: 7, svc: 'downsizing_move' }, EST2);
    lacks(fresh, 'End-of-Job Logistics', '⚠⚠ a fresh job has no End-of-Job Logistics block at all');
    lacks(fresh, 'setLogisticsVendor(', '…and no logistics row waiting for a vendor');
    has(fresh, '+ Add an end-of-job vendor', 'the categories are OFFERED instead');
    has(fresh, 'onchange="addLogisticsLine(7,this.value)"', '…by one select that puts a line on the job');
    ['Document Shredding', 'Dumpster Rental', 'Junk Removal / Hauling', 'Donation Organization', 'Move-Out / Final Cleaning'].forEach((l) =>
      has(fresh, '>' + l + '</option>', `"${l}" is one pick away`));
    ok((fresh.match(/Document Shredding/g) || []).length === 1, 'Document Shredding appears once — as an option, never as a row');

    const added = R.renderVendorSourcing(7, { id: 7, svc: 'downsizing_move', logisticsSourcing: { shred: { added: true } } }, EST2);
    has(added, 'End-of-Job Logistics', 'adding one brings the block');
    has(added, "setLogisticsVendor(7,'shred',this.value)", '…with a row for the line that was added');
    has(added, "removeLogisticsLine(7,'shred')", '…and a Remove on it');
    lacks(added, "setLogisticsVendor(7,'junk'", '…and no row for anything else');
    lacks(added, '<option value="shred">', 'an added category leaves the add menu');
    has(added, '<option value="junk">', 'the others stay on it');

    const covered = R.renderVendorSourcing(7, { id: 7, svc: 'downsizing_move' },
      { vendors: [{ type: 'Junk Removal / Hauling', cost: 900 }], collections: [], prepItems: [] });
    lacks(covered, '<option value="junk">', '⚠ a category the estimate carries is not offered again');

    const all = { id: 7, svc: 'downsizing_move', logisticsSourcing: {} };
    ['donation', 'junk', 'dumpster', 'cleaning', 'shred'].forEach((k) => { all.logisticsSourcing[k] = { added: true }; });
    lacks(R.renderVendorSourcing(7, all, EST2), 'Add an end-of-job vendor', 'with everything on the job there is nothing left to offer');

    const prep = R.renderVendorSourcing(7, { id: 7, svc: 'prep', logisticsSourcing: { shred: { added: true } } }, EST2);
    lacks(prep, 'End-of-Job Logistics', 'Home Prep clears nothing out — no logistics block');
    lacks(prep, 'Add an end-of-job vendor', '…and nothing offered');
  }

  group('#2 — add, remove, and a touched line stays put');
  {
    const saved = []; const asked = []; const refreshed = [];
    const W = sandbox({ fns: ['addLogisticsLine', 'removeLogisticsLine', '_logiJob', 'setLogisticsVendor'], vars: ['LOGISTICS_CATEGORIES'],
      stubs: { saveJobs: () => saved.push(1), refreshVendorSourcing: (id) => refreshed.push(id),
               lookupVendorById: () => null, vendorIdOf: () => '', _vendorContact: () => '',
               confirm: (m) => { asked.push(m); return W.__answer; } } });
    const job = { id: 7, svc: 'downsizing_move' };
    W.jobs = [job];
    W.addLogisticsLine(7, 'shred');
    eq(job.logisticsSourcing.shred, { added: true }, 'adding writes the line');
    eq(refreshed, [7], '…and redraws the sourcing list (which repaints the chip row)');
    W.addLogisticsLine(7, 'not-a-category');
    W.addLogisticsLine(7, '');
    eq(Object.keys(job.logisticsSourcing), ['shred'], '⚠ a value that is not a catalogue key mints nothing — it arrives from a <select>');

    W.removeLogisticsLine(7, 'shred');
    eq(asked.length, 0, 'an empty line comes off without a question');
    ok(!('shred' in job.logisticsSourcing), '…and the record goes with it');

    job.logisticsSourcing.junk = { added: true, vendorName: 'Junk Kings', quote: 650 };
    W.__answer = false;
    W.removeLogisticsLine(7, 'junk');
    eq(asked.length, 1, '⚠ a line carrying a vendor and a quote is asked about first');
    has(asked[0], 'Junk Kings', '…naming the vendor');
    has(asked[0], '$650', '…and the quote that comes off the invoice with it');
    ok('junk' in job.logisticsSourcing, 'Cancel keeps it');
    W.__answer = true;
    W.removeLogisticsLine(7, 'junk');
    ok(!('junk' in job.logisticsSourcing), 'OK takes it off');

    // A legacy line (no `added`) whose vendor is cleared must not vanish from under the person editing it.
    job.logisticsSourcing.dumpster = { vendorId: 3, vendorName: 'Big Bin' };
    W.setLogisticsVendor(7, 'dumpster', '');
    eq(job.logisticsSourcing.dumpster.added, true, '⚠ a line being written to is marked on the job, so clearing its vendor does not drop it off the list');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // #4 — THE CONCIERGE ASSIGNED AT INTAKE IS THE DEFAULT, NOT THE WALKTHROUGH PERSON
  // ═══════════════════════════════════════════════════════════════════════════
  const CREW_FNS = ['seedCrewFromEstimate', 'getJobCrew', 'crewSlotHolding', 'crewDuplicates', 'isCrewPlaceholder',
                    'samePerson', 'canonPersonName'];
  const CREW_VARS = ['CONTRACTOR_TC_NAME', 'LOG_PLACEHOLDER_NAMES', 'PERSON_NAME_ALIASES'];
  group('⚠⚠ #4 — the default concierge is job.tc (who RUNS the job), never est.preparedBy (who walked it)');
  {
    const C = sandbox({ fns: CREW_FNS, vars: CREW_VARS, stubs: { jobLogEntries: () => [], currentEstimate: null } });
    const est = { preparedBy: 'Anthony Graziano', psSlots: [{ type: 'aj' }, { type: 'contractor_standard' }] };
    eq(C.seedCrewFromEstimate({ tc: 'Ashley Jerome' }, est).tc.name, 'Ashley Jerome',
       '⚠⚠ Anthony walked the house, Ashley was assigned at intake: Ashley is the default');
    eq(C.seedCrewFromEstimate({ tc: '' }, est).tc.name, 'Anthony Graziano', 'with nobody assigned at intake, the walkthrough person stands in');
    eq(C.seedCrewFromEstimate({}, null).tc.name, '', 'and with neither, nobody');

    // A crew seeded BEFORE today still carries the walkthrough person. Until somebody decides
    // otherwise, the default follows intake.
    C.estimateStore = { 7: { estimate: est } };
    const job = { id: 7, tc: 'Ashley Jerome', crew: { tc: { name: 'Anthony Graziano', locked: false }, tc2: { name: '', locked: false },
                  ps: [{ name: '' }, { name: '' }], confirmed: false, confirmedAt: '' } };
    C.jobs = [job];
    eq(C.getJobCrew(7).tc.name, 'Ashley Jerome', '⚠⚠ an untouched default follows the intake assignment');
    job.tc = 'Anthony Graziano Jr';
    eq(C.getJobCrew(7).tc.name, 'Anthony Graziano Jr', '…and follows Edit Client when intake is reassigned');

    const decided = (crewOver, jobOver) => {
      const j = Object.assign({ id: 8, tc: 'Ashley Jerome' }, jobOver || {});
      j.crew = Object.assign({ tc: { name: 'Anthony Graziano', locked: false }, tc2: { name: '', locked: false },
                               ps: [{ name: '' }, { name: '' }], confirmed: false, confirmedAt: '' }, crewOver || {});
      C.jobs = [j];
      return C.getJobCrew(8).tc.name;
    };
    eq(decided({ tc: { name: 'Anthony Graziano', locked: false, picked: true } }), 'Anthony Graziano',
       '⚠ a concierge PICKED on the Job Plan is a decision, and is never overridden');
    eq(decided({ confirmed: true, confirmedAt: '2026-09-20T10:00:00Z' }), 'Anthony Graziano',
       '⚠ nor is a confirmed team');
    eq(decided({ confirmed: false, confirmedAt: '2026-09-20T10:00:00Z' }), 'Anthony Graziano',
       '⚠ nor a team re-opened with Revise team — `confirmedAt` is set once and never cleared');
    eq(decided({ tc: { name: 'Anthony Graziano', locked: true } }), 'Anthony Graziano', 'nor a locked slot');
    eq(decided({ tc2: { name: 'Ashley Jerome', locked: false } }), 'Anthony Graziano',
       '⚠ nor when the intake concierge already holds another slot — following would make the duplicate the one-slot rule refuses');
    eq(decided({}, { tc: 'Anthony Graziano Sr' }), 'Anthony Graziano', 'a name written before a rename is the same person, and nothing moves');

    // The display-only auto-select that let the screen and the record disagree is gone.
    const lp = live(fn('loadJobPlanTab'));
    lacks(lp, 'tcSel.selectedIndex', '⚠⚠ loadJobPlanTab no longer sets the concierge select behind the record’s back');
    lacks(lp, 'tc2Sel.selectedIndex', '…nor the second concierge');
    lacks(lp, 'psSel.selectedIndex', '…nor the specialists');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // #5 — ONE PERSON, ONE SLOT
  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠⚠ #5 — where a name already sits, and every name that sits twice');
  {
    const C = sandbox({ fns: CREW_FNS, vars: CREW_VARS });
    const crew = { tc: { name: 'Ashley Jerome' }, tc2: { name: '' },
                   ps: [{ name: 'Anthony Graziano Jr' }, { name: 'Anthony Graziano Jr' }, { name: 'Contractor TBD' }, { name: 'Contractor TBD' }] };
    eq(C.crewSlotHolding(crew, 'Anthony Graziano Jr', 'ps1'), 'Property Specialist 1', 'slot 2 asking about AJ finds him in slot 1');
    eq(C.crewSlotHolding(crew, 'Anthony Graziano Jr', 'ps0'), 'Property Specialist 2', '…and slot 1 asking finds him in slot 2');
    eq(C.crewSlotHolding(crew, 'Ashley Jerome', 'ps0'), 'Transition Concierge', 'a specialist slot asking about the concierge finds her');
    eq(C.crewSlotHolding(crew, 'Ashley Jerome', 'tc'), '', '…and her own slot does not count against her');
    eq(C.crewSlotHolding(crew, 'Contractor TBD', 'ps0'), '', '⚠ a placeholder may repeat — it means "not named yet", not a person');
    eq(C.crewSlotHolding(crew, 'Bob Smith', 'ps0'), '', 'a name on nobody’s slot is free');
    eq(C.crewSlotHolding({ tc: { name: 'Anthony Graziano Sr' }, ps: [] }, 'Anthony Graziano', 'ps0'), 'Transition Concierge',
       'samePerson, not === — a name written before a rename is the same human');

    const dups = C.crewDuplicates(crew);
    eq(dups.length, 1, '⚠⚠ Anthony’s team: one real person in two slots');
    const d0 = dups[0] || {};   // defensive: an empty answer must fail these checks, not throw past them
    eq(d0.name, 'Anthony Graziano Jr', 'named');
    eq(d0.slots, ['Property Specialist 1', 'Property Specialist 2'], 'with the slots he is in');
    eq((C.crewDuplicates({ tc: { name: 'Ashley Jerome' }, ps: [{ name: 'Ashley Jerome' }, { name: 'Bob Smith' }] })[0] || {}).slots,
       ['Transition Concierge', 'Property Specialist 1'], 'a concierge doubling as a specialist is a duplicate too');
    eq(C.crewDuplicates({ tc: { name: 'Ashley Jerome' }, ps: [{ name: 'Contractor TBD' }, { name: 'Contractor TBD' }] }), [],
       '"Contractor TBD" twice is not a duplicate');
    eq(C.crewDuplicates(null), [], 'no crew, nothing doubled');
  }

  group('⚠⚠ #5 — the setters REFUSE a name already on the team, and put the select back');
  {
    const said = []; const saves = []; const rebuilt = [];
    const dom = domStub({ 'log-m2-name': 'Anthony Graziano Jr', 'log-m0-name': 'Ashley Jerome' });
    const crew = { tc: { name: 'Ashley Jerome', locked: false }, tc2: { name: '', locked: false },
                   ps: [{ name: 'Anthony Graziano Jr', locked: false }, { name: '', locked: false }] };
    // ⚠ getJobCrew is STUBBED here, never lifted — lifting it (CREW_FNS carries it) would override the
    // stub, find no job, and return null, so every "refusal" below would be the early return on a
    // missing crew. That is exactly how this group first passed with nothing refused at all.
    const S = sandbox({ fns: ['setCrewTC', 'setCrewTC2', 'setCrewPS', '_crewRefuseDup', '_crewRefreshSelects', 'crewSlotHolding',
                              'crewDuplicates', 'isCrewPlaceholder', 'samePerson', 'canonPersonName'],
      vars: CREW_VARS,
      stubs: { document: dom, getJobCrew: () => crew, saveJobs: () => saves.push(1),
               showFB: (id, kind, msg) => said.push({ id, kind, msg }), getPSCostRate: () => 60,
               rebuildLogDropdowns: () => rebuilt.push(1), getAllActiveTC: () => [], getAllActivePS: () => [] } });

    S.setCrewPS(7, 1, 'Anthony Graziano Jr');
    eq(crew.ps[1].name, '', '⚠⚠ Anthony Jr in slot 2 when he is already slot 1 is REFUSED — the record does not take it');
    eq(saves.length, 0, '…nothing is saved');
    eq(said.length, 1, '…and it is said out loud');
    // Read defensively: a revert that lets the name through says nothing, and `said[0].msg` would then
    // throw and stop the file — one crash reading as one failure, with every check after it unrun.
    const said0 = (said[0] || {}).msg || '';
    has(said0, 'already on this team as Property Specialist 1', '…naming where he already is');
    has(said0, 'Contractor TBD', '…and the placeholder to use for a body not yet named');
    eq(dom.getElementById('log-m2-name').value, '', '⚠ the select goes back to what the record holds — left showing him, it would read as though it took');
    ok(rebuilt.length >= 1, 'the other selects are redrawn in place');

    S.setCrewPS(7, 1, 'Contractor TBD');
    eq(crew.ps[1].name, 'Contractor TBD', 'a placeholder is taken');
    S.setCrewPS(7, 0, 'Contractor TBD');
    eq(crew.ps[0].name, 'Contractor TBD', '…even into a second slot — "not named yet" may repeat');
    S.setCrewPS(7, 0, 'Anthony Graziano Jr');
    eq(crew.ps[0].name, 'Anthony Graziano Jr', 'a free name is taken');

    said.length = 0;
    S.setCrewTC(7, 'Anthony Graziano Jr');
    eq(crew.tc.name, 'Ashley Jerome', '⚠ the concierge slot refuses a specialist already on the team');
    has((said[0] || {}).msg || '', 'Property Specialist 1', '…and says where he is');
    ok(!crew.tc.picked, '…and a refused pick is not a pick');
    S.setCrewTC(7, 'Bob Smith');
    eq(crew.tc.name, 'Bob Smith', 'a free concierge is taken');
    eq(crew.tc.picked, true, '⚠ and marked PICKED, so the intake default stops following Edit Client over it');
    S.setCrewTC2(7, 'Bob Smith');
    eq(crew.tc2.name, '', 'the second concierge slot refuses the first concierge');
  }

  group('⚠⚠ #5 — the confirm is the backstop for a crew that already carries a duplicate');
  {
    const said = []; let locked = 0;
    const crew = { tc: { name: 'Ashley Jerome', locked: false }, tc2: { name: '', locked: false },
                   ps: [{ name: 'Anthony Graziano Jr', locked: false }, { name: 'Anthony Graziano Jr', locked: false }], confirmed: false };
    const K = sandbox({ fns: ['confirmJobTeam', 'crewDuplicates', 'isCrewPlaceholder', 'samePerson', 'canonPersonName'], vars: CREW_VARS,
      stubs: { getJobCrew: () => crew, isJobWon: () => true, unfilledPlannedPS: () => [], plannedPSCount: () => 2,
               showFB: (id, kind, msg) => said.push({ kind, msg }), confirm: () => true, lockAssignedCrew: () => { locked++; },
               saveJobs: () => {}, buildLogTeamRows: () => {}, _repaintPlanGates: () => {} } });
    K.jobs = [{ id: 7 }];
    K.confirmJobTeam(7);
    ok(!crew.confirmed, '⚠⚠ the team Anthony locked in — both specialists Anthony Jr — does NOT confirm now');
    eq(locked, 0, '…nobody is locked');
    const k0 = said[0] || {};
    eq(k0.kind, 'err', '…and it is refused in red');
    has(k0.msg || '', 'Anthony Graziano Jr</strong> is in 2 slots (Property Specialist 1, Property Specialist 2)', '…naming who and where');
    crew.ps[1].name = 'Contractor TBD';
    said.length = 0;
    K.confirmJobTeam(7);
    ok(crew.confirmed, 'with the extra slot changed, it confirms');
    eq((said[said.length - 1] || {}).kind, 'ok', '…and says so');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // #6 — THE JOB TEAM, ON THE CHIP ROW
  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠⚠ #6 — a Job team chip beside Vendors lined up, read off the record and never seeded');
  {
    const G = sandbox({ fns: ['jobTeamGateLine', 'crewDuplicates', 'isCrewPlaceholder', 'samePerson', 'canonPersonName'], vars: CREW_VARS });
    const none = { id: 7 };
    const l0 = G.jobTeamGateLine(none);
    eq(l0.key, 'team_confirmed', 'it is its own gate');
    eq(l0.label, 'Job team confirmed', 'named for the fact it asserts');
    ok(!l0.ok, 'a job with no crew yet has no confirmed team');
    has(l0.detail, 'Save &amp; Confirm Job Team', '⚠ the fix is under the chip, not in a tooltip');
    has(l0.detail, 'Hours cannot be logged until it is', '…with what it holds up');
    ok(!('crew' in none), '⚠⚠ drawing the chip wrote NOTHING to the job — getJobCrew mints a crew; a chip row must not');
    ok(!G.jobTeamGateLine({ crew: { tc: { name: 'Ashley Jerome' }, ps: [], confirmed: false } }).ok, 'an unconfirmed team is red');
    ok(G.jobTeamGateLine({ crew: { tc: { name: 'Ashley Jerome' }, ps: [{ name: 'Bob Smith' }], confirmed: true } }).ok, 'a confirmed team is green');
    const bad = G.jobTeamGateLine({ crew: { tc: { name: 'Ashley Jerome' }, confirmed: true,
                                           ps: [{ name: 'Anthony Graziano Jr' }, { name: 'Anthony Graziano Jr' }] } });
    ok(!bad.ok, '⚠⚠ a CONFIRMED team carrying one person in two slots is still RED — "confirmed" over it would be a false green');
    has(bad.detail, 'Anthony Graziano Jr is in 2 slots', '…and the chip says who');
    has(bad.detail, 'Revise team', '…and how to fix it');
  }

  group('#6, driven through the real chip row — and repainted IN PLACE when the team or a vendor moves');
  {
    const P = sandbox({ fns: ['planGateChipsHtml', 'jobTeamGateLine', 'crewDuplicates', 'isCrewPlaceholder', 'samePerson', 'canonPersonName',
                              'vendorSourcingProgress', '_srcLineKey', 'planVendorsMeta', '_repaintPlanGates'].concat(LOGI_FNS),
      vars: CREW_VARS.concat(['LOGISTICS_CATEGORIES']),
      stubs: { planDerivedLines: () => [{ key: 'agreement_signed', ok: true, label: 'Agreement signed' }] } });
    const est = { vendors: [{ lid: 'a', type: 'Mover' }], collections: [], prepItems: [] };
    const job = { id: 7, svc: 'downsizing_move', vendorSourcing: {}, crew: { tc: { name: 'Ashley Jerome' }, ps: [], confirmed: false } };
    const row = P.planGateChipsHtml(7, job, est);
    has(row, 'data-gate="vendors_lined_up"', 'the vendor chip');
    has(row, 'gate-no" data-gate="team_confirmed"', '⚠⚠ and the team chip beside it, red until the team is confirmed');
    ok(row.indexOf('data-gate="vendors_lined_up"') < row.indexOf('data-gate="team_confirmed"'), 'after the vendors, where the eye reads the job side');
    has(row, '<strong>Job team confirmed:</strong> not yet', 'with its fix under the row');

    // _repaintPlanGates: the chip row and the vendors fold count, rewritten in place.
    const dom = domStub({ 'plan-job': '7' });
    P.document = dom; P.jobs = [job]; P.estimateStore = { 7: { estimate: est } };
    job.crew.confirmed = true;
    job.vendorSourcing = { La: { status: 'Confirmed' } };
    P._repaintPlanGates(7);
    has(dom.getElementById('plan-gates-7').outerHTML, 'gate-ok" data-gate="team_confirmed"', '⚠ confirming the team turns the chip green without a redraw of the plan');
    has(dom.getElementById('plan-gates-7').outerHTML, 'gate-ok" data-gate="vendors_lined_up"', '…and a confirmed vendor turns its chip green');
    eq(dom.getElementById('stage-meta-vendors').innerHTML, '1 of 1 confirmed', '…and the Vendors fold count moves with it');
    const other = domStub({ 'plan-job': '8' });
    P.document = other;
    P._repaintPlanGates(7);
    eq(other.getElementById('plan-gates-7').outerHTML, undefined, '⚠ another client on the picker: nothing is written');
    const prepDom = domStub({ 'plan-job': '9' });
    P.document = prepDom; P.jobs = [{ id: 9, svc: 'prep' }]; P.estimateStore = { 9: { estimate: est } };
    P._repaintPlanGates(9);
    eq(prepDom.getElementById('plan-gates-9').outerHTML, undefined, 'a prep plan has no chip row to repaint');

    // Wired where the two things that move it happen below it.
    has(live(fn('confirmJobTeam')), '_repaintPlanGates(jobId)', 'confirming the team repaints the chip');
    has(live(fn('reviseJobTeam')), '_repaintPlanGates(jobId)', 're-opening it does too');
    has(live(fn('refreshVendorSourcing')), '_repaintPlanGates(jobId)', 'and every sourcing change (status, vendor, add, remove) repaints both');
    has(live(fn('renderJobPlan')), 'var vendorsMeta = planVendorsMeta(jobId, job, est);', 'the fold count on first draw and on repaint is one wording');
  }
};
