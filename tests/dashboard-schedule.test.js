'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// THE CLIENT DASHBOARD: THE SCHEDULE, THE DOCUMENT TRAY, AND THE SAVE REDIRECT
// Five asks from Anthony, 2026-09-13, plus the two live defects they exposed.
//
// ⚠⚠ THE ONE THAT REACHES A CLIENT: four of the five document rows gated their View/Print
// links on NOTHING — only `estimate_sent` carried a condition. On a job at status NEW with no
// approval, no client acceptance and no agreement, "View deposit invoice" rendered a complete,
// printable billing document priced off the UNAPPROVED draft, because the invoice blocker only
// ever refused a FINAL. Promoting those links into the band without a gate would have made it
// more prominent, not less.
//
// ⚠⚠ AND THE ONE IN HIS OWN SCREENSHOT: `fmtDate2('')` returns the literal '—', which is
// TRUTHY — so the Hard target cell painted a RED BOLD EM DASH on every job that simply has no
// hard target. Every existing test was blind to it because the harness stubs `fmtDate2` as a
// passthrough returning ''.
// ─────────────────────────────────────────────────────────────────────────────

const { sandbox, source, fn, domStub } = require('./harness');

const noComments = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();

  // ═══════════════════════════════════════════════════════════════════════════
  group('the date primitives — one clock read, and a counter that does NOT clamp');
  {
    const d = sandbox({ fns: ['_todayStr', 'workingDaysInclusive', 'workingDaysBetween', 'addWorkingDays'] });

    // ⚠ `workingDaysBetween` CLAMPS ITS START TO TODAY, so it answers "how far is this deadline
    // from now" and returns a confident, silent 0 for any window that has already closed. No
    // elapsed measurement may use it — which is exactly why the pure counter had to exist.
    eq(d.workingDaysInclusive('2020-01-01', '2020-01-31'), 23,
       'the pure counter measures a window in the past');
    eq(d.workingDaysBetween('2020-01-01', '2020-01-31'), 0,
       '⚠ and the clamped one silently answers 0 for the same window — never use it for elapsed');

    eq(d.workingDaysInclusive('2026-09-21', '2026-09-21'), 1, 'one weekday is one working day');
    eq(d.workingDaysInclusive('2026-09-19', '2026-09-20'), 0, 'a weekend alone is none');
    eq(d.workingDaysInclusive('2026-09-21', '2026-09-28'), 6, 'Mon to the next Mon is six');
    eq(d.workingDaysInclusive('', '2026-09-28'), 0, 'a missing end of the range is 0, never NaN');
    eq(d.workingDaysInclusive('2026-09-28', '2026-09-21'), 0, 'and a backwards range is 0');
    eq(d.workingDaysInclusive('rubbish', '2026-09-21'), 0,
       '⚠ an unparseable date is 0 — new Date(rubbish) does not throw, it returns Invalid Date');

    // ⚠ LOCAL CALENDAR, NOT toISOString(). That is UTC and rolls over at 8pm in Eastern, so an
    // evening close stamped TOMORROW'S date on tonight's work.
    // ⚠ THE CONTAINER RUNS UTC, WHICH IS WHY THE SLIP IS INVISIBLE HERE. The constraint is
    // driven under the real zone rather than asserted on source text — TZ takes effect
    // mid-process on node 22 — and restored afterwards.
    const realTZ = process.env.TZ, realDate = Date;
    try {
      process.env.TZ = 'America/New_York';
      const frozen = new realDate('2026-09-14T03:30:00Z');   // 11:30pm on the 13th, Eastern
      const Fake = function () { return frozen; };
      Fake.prototype = realDate.prototype;
      const t = sandbox({ fns: ['_todayStr'], stubs: { Date: Fake } });
      eq(t._todayStr(), '2026-09-13', '⚠ _todayStr reads the LOCAL calendar day');
      eq(frozen.toISOString().slice(0, 10), '2026-09-14',
         '…while toISOString says the 14th — the evening slip this closes');
    } finally { process.env.TZ = realTZ; global.Date = realDate; }

    has(noComments(fn('applyJobTransition')), 'j.deliveredOn = _todayStr();',
        'and the delivery stamp reads it rather than rolling its own UTC date');
    lacks(noComments(fn('applyJobTransition')), "toISOString().split('T')[0]",
          'the UTC form is gone from the transition');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('estWorkingDays — ONE proposed length, replacing two that disagreed');
  {
    const e = sandbox({ fns: ['estWorkingDays'], vars: ['PRODUCTIVE_HRS_PER_DAY'] });

    eq(e.estWorkingDays({ days: 6, totTC: 40, totPS: 120, psCount: 2 }), 6,
       'a quoted figure wins — it is the number the estimator stood behind');
    // ⚠⚠ THE DEFECT THIS CLOSES. The client estimate took max(TC leg, PS leg); the Job Plan
    // header took the TC leg ALONE. On a legacy estimate with no `days` and a larger specialist
    // leg, the document the client holds and the header the crew works from printed DIFFERENT
    // projected completion dates for one job.
    eq(e.estWorkingDays({ totTC: 40, totPS: 120, psCount: 2 }), 9,
       '⚠ with no quoted figure the PS leg wins when it is larger — ceil(120/2/7)');
    eq(e.estWorkingDays({ totTC: 70, totPS: 14, psCount: 2 }), 10, 'and the TC leg when it is');
    eq(e.estWorkingDays({ svc: 'prep', days: 6 }), 0,
       '⚠ prep is 0 through an EXPLICIT branch — that engagement runs on the vendors’ calendar');
    eq(e.estWorkingDays(null), 0, 'and no estimate is 0, not NaN');

    // ⚠ RESTATED 2026-09-20. The Job Plan header no longer reads the length itself: it renders the
    // dashboard's schedule strip (planScheduleHtml → jobSchedule), so the plan and the dashboard cannot
    // state two lengths for one job. Two readers of the one definition, and the header reads the schedule.
    eq((src.match(/estWorkingDays\(/g) || []).length, 3,
       'one definition and two readers — the client estimate and the schedule; the Job Plan header reads the schedule');
    lacks(src, 'Math.ceil(est.totTC / 7)', 'the Job Plan header’s divergent copy is gone');
    lacks(noComments(fn('renderJobPlan')), 'estWorkingDays(', 'and it computes no length of its own any more');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('jobSchedule — the plan, the actual, and the two independent flags');
  {
    const S = sandbox({
      fns: ['jobSchedule', 'estWorkingDays', 'addWorkingDays', 'workingDaysInclusive', 'docSentAt', 'docKeyFor'],
      vars: ['PRODUCTIVE_HRS_PER_DAY'],
    });
    const EST = { days: 6, svc: 'cleanout' };
    const sched = (job, today) => S.jobSchedule(Object.assign({ id: 7, svc: 'cleanout' }, job), EST, today);

    // ── the plan ──
    const p = sched({ start: '2026-09-21' }, '2026-09-14');
    eq(p.state, 'planned', 'a job that has not started is planned');
    eq(p.days, 6, 'it carries the proposed length');
    ok(p.daysQuoted, 'and records that the figure was quoted rather than derived');
    // ⚠ ceil, not days/2: addWorkingDays counts the start as day 1 and `days` is inclusive,
    // so the middle working day of a 6-day job is day 3.
    eq(p.halfway, '2026-09-23', 'the calendar halfway is the third working day');
    // ⚠⚠ AND IT HAS TO BE AN ODD LENGTH TO SAY ANYTHING. On six days floor and ceil are both
    // 3, so the case above passes under either — caught by reverting, not by reading, which is
    // the sixteenth time this repo has recorded an assertion that could not fail. On FIVE days
    // ceil is 3 and floor is 2, and ceil is right: addWorkingDays counts the start as day 1 and
    // `days` is inclusive, so the middle working day of a 5-day job is the third.
    const odd = S.jobSchedule({ id: 7, svc: 'cleanout', start: '2026-09-21' },
                              { days: 5, svc: 'cleanout' }, '2026-09-14');
    eq(odd.halfway, '2026-09-23', '⚠ an ODD length halves by ceil — day 3 of 5, not day 2');
    eq(odd.planEnd, '2026-09-25', 'and its end is the fifth working day');
    eq(p.planEnd, '2026-09-28', 'and the target end the sixth');
    eq(p.pace, '', 'nothing is late yet');

    eq(sched({ start: '2026-09-21' }, '2026-09-22').pace, 'start_missed',
       '⚠ a target start that has passed on an inactive job has its OWN flag');
    has(sched({ start: '2026-09-21' }, '2026-09-22').paceFix, 'Edit Client',
       '…and it carries the fix on screen, not in a title=');

    // ── running ──
    const r = sched({ start: '2026-09-21', status: 'active', activatedOn: '2026-09-21' }, '2026-09-24');
    eq(r.state, 'running', 'an active job is running');
    eq(r.actualStartKind, 'activated', 'anchored on the write-once activation stamp');
    eq(r.elapsed, 4, 'and elapsed counts inclusive working days');
    eq(r.pace, 'halfway_late', '⚠ past the halfway point with no midpoint invoice sent');
    // ⚠ IT NAMES EXACTLY WHAT IT COMPARED, AND WHAT IT COMPARED IS A CALENDAR. This arm is a
    // statement about BILLING — money not yet asked for — and must never read as one about how
    // much work is done. (The comment here once claimed the app recorded no room-level progress
    // at all. That was false: the crew's own room statuses have driven `computeProjection` since
    // long before this strip existed, and `job-progress.test.js` now covers the arm that reads
    // them. What was missing was the split between measuring and persisting, not the data.)
    lacks(r.paceTxt, 'half done', 'and it never claims the WORK is half done');
    has(r.paceTxt, 'midpoint invoice has not gone out', 'only that the invoice has not gone out');

    const rSent = S.jobSchedule({ id: 7, svc: 'cleanout', start: '2026-09-21', status: 'active',
      activatedOn: '2026-09-21', docState: { 'invoice:midpoint': { sentAt: '2026-09-23T10:00:00Z' } } },
      EST, '2026-09-24');
    eq(rSent.pace, '', '…and it goes quiet the moment that invoice is sent');

    const over = sched({ start: '2026-09-21', status: 'active', activatedOn: '2026-09-21' }, '2026-10-05');
    eq(over.pace, 'overrun', 'past the proposed length is the worse flag and wins');
    eq(over.overBy, 5, 'and it says by how many working days');

    // ⚠ A DEPOSIT DATE MAY ANCHOR `elapsed` AND MAY NEVER SUPPORT A SLIP CLAIM — it says when
    // work COULD start, not when it did. Every job active before the stamp shipped is in that case.
    // ⚠⚠ THE DEPOSIT DATE MUST DIFFER FROM THE TARGET START OR THIS SAYS NOTHING. With both on
    // the 21st the slip is 0 whether the rule fires or not — caught by reverting. Here the
    // deposit landed a week late, so an unguarded rule would claim a 5-day slip off a date that
    // only says when work COULD have started.
    const legacy = sched({ start: '2026-09-21', status: 'active', depositReceivedAt: '2026-09-28' }, '2026-09-30');
    eq(legacy.actualStartKind, 'deposit', 'a legacy active job falls back to the deposit date');
    eq(legacy.elapsed, 3, 'it may anchor the elapsed reading');
    eq(legacy.startSlip, 0, '⚠⚠ and it may NEVER claim a start slip — it is a proxy, not a record');
    eq(legacy.projectedEnd, '', 'nor move the projected end off it');

    // ⚠ THE PLAN STAYS ANCHORED ON job.start EVEN WHEN THE JOB ACTIVATED LATE. That is the date
    // the client estimate's header and the agreement's Estimated Start Date both state.
    const late = sched({ start: '2026-09-21', status: 'active', activatedOn: '2026-09-28' }, '2026-09-29');
    eq(late.planEnd, '2026-09-28', 'the plan does not move under the client');
    eq(late.projectedEnd, '2026-10-05', 'the slipped end is a SECOND, separate figure');
    eq(late.startSlip, 5, 'and the slip is counted in working days');

    // ── fit is a SEPARATE slot from pace ──
    const tight = sched({ start: '2026-09-21', completion: '2026-09-24' }, '2026-09-14');
    eq(tight.fit, 'late', 'a plan that overruns the hard target does not fit');
    eq(tight.pace, '', '⚠ and it is perfectly ON PACE — one slot holding both would hide one');
    eq(sched({ start: '2026-09-21', completion: '2026-10-15' }, '2026-09-14').fit, 'ok',
       'a reachable hard target fits');
    eq(sched({ start: '2026-09-21', completion: '2026-09-01' }, '2026-09-14').fit, 'inverted',
       'and a hard target before the start is named rather than printed as a huge overrun');

    // ⚠ A COURT DEADLINE OUTRANKS THE HARD TARGET — it is statutory, the other is a preference.
    const pr = S.jobSchedule({ id: 7, svc: 'probate', start: '2026-09-21', completion: '2026-12-01',
      probateDeadline: '2026-09-24' }, EST, '2026-09-14');
    eq(pr.fit, 'late', 'the court deadline decides the fit on a probate matter');
    has(pr.fitTxt, 'court deadline', 'and it is named as the court deadline');

    // ── the degenerate cases, every one ──
    eq(S.jobSchedule(null, EST, '2026-09-14').state, 'none', 'no job: no schedule');
    eq(S.jobSchedule({ id: 7, svc: 'cleanout' }, null, '2026-09-14').state, 'none',
       'no estimate: no schedule, and no invented length');
    eq(S.jobSchedule({ id: 7, svc: 'prep' }, { svc: 'prep', days: 0 }, '2026-09-14').state, 'vendor',
       'a prep job has its own state — it runs on the vendors’ calendar');
    eq(S.jobSchedule({ id: 7, svc: 'cleanout', status: 'lost' }, EST, '2026-09-14').state, 'dead',
       'a lost job has no schedule to keep');
    eq(S.jobSchedule({ id: 7, svc: 'cleanout', status: 'closed_retained' }, EST, '2026-09-14').state, 'dead',
       'nor a retained-deposit one');
    eq(sched({}, '2026-09-14').state, 'nostart', 'no target start is its own state, and it is fixable');
    eq(S.jobSchedule({ id: 7, svc: 'cleanout', start: '2026-09-21' }, { days: 0, totTC: 0, totPS: 0 }, '2026-09-14').why,
       'no-days', 'an estimate with no derivable length says so rather than printing 0 days');

    const done = sched({ start: '2026-09-21', status: 'closed', activatedOn: '2026-09-21', deliveredOn: '2026-10-02' }, '2026-10-10');
    eq(done.state, 'done', 'a delivered job is history');
    eq(done.endVariance, 10, 'and it reports what it actually took');

    // ⚠ DOM-FREE AND CLOCK-FREE, the same rule jobTimeline follows.
    const sb = noComments(fn('jobSchedule'));
    ['document.', 'getElementById', 'innerHTML', 'new Date()', 'Date.now'].forEach((n) =>
      lacks(sb, n, `jobSchedule is DOM-free and clock-free (${n})`));
    lacks(sb, 'toLocaleDateString', 'and it never formats a date — the renderer owns that');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('the schedule strip — a projection never wears the clothes of a record');
  {
    const V = sandbox({ fns: ['jtScheduleHtml'], stubs: { fmtDate2: (d) => 'D:' + d } });
    const base = { state: 'planned', days: 6, daysQuoted: true, start: '2026-09-21',
                   halfway: '2026-09-23', planEnd: '2026-09-28', today: '2026-09-14' };

    eq(V.jtScheduleHtml({ state: 'dead' }), '', 'a dead job renders NOTHING — no "no schedule yet" line');
    eq(V.jtScheduleHtml({ state: 'none' }), '', 'and neither does a job with no estimate');
    eq(V.jtScheduleHtml(null), '', 'nor a missing descriptor');

    const planned = V.jtScheduleHtml(base);
    has(planned, 'Target start', 'the plan says "Target start" — an intention, in words');
    has(planned, '6 working days', 'it states the proposed length');
    has(planned, 'Halfway', 'the calendar halfway');
    has(planned, 'Target end', 'and a target end');
    // ⚠ "Halfway", NEVER "Midpoint". paymentSplit is a flat 50/25/25 with no calendar in it, so
    // the midpoint INVOICE has no date relationship to this. Two facts two inches apart on one
    // card must not share a word.
    lacks(planned, 'Midpoint', '⚠ and it never says "Midpoint" — that word belongs to the money');
    lacks(planned, 'Started', 'a job that has not started is never described as started');

    has(V.jtScheduleHtml(Object.assign({}, base, { daysQuoted: false })), 'about 6 working days',
        '⚠ a DERIVED length reads "about" — it is a number nobody ever told the client');

    const running = V.jtScheduleHtml(Object.assign({}, base, { state: 'running', elapsed: 4,
      actualStart: '2026-09-21', actualStartKind: 'activated' }));
    has(running, 'Started', 'a running job says Started — the one word that names a fact');
    has(running, 'Working day 4 of 6', 'and leads with where the job actually is');
    has(running, 'jt-sched-lead', 'in the bronze lead slot');
    has(V.jtScheduleHtml(Object.assign({}, base, { state: 'running', elapsed: 2,
      actualStart: '2026-09-21', actualStartKind: 'deposit' })), '(from the deposit)',
      '⚠ and a deposit-anchored start SAYS SO rather than passing itself off as a recorded start');
    // ⚠ NEVER "Working day 0 of 6" — found in a browser on a job activated ahead of the
    // calendar. A job cannot be on day zero of itself.
    const zero = V.jtScheduleHtml(Object.assign({}, base, { state: 'running', elapsed: 0,
      actualStart: '2026-09-21', actualStartKind: 'activated' }));
    lacks(zero, 'Working day 0', '⚠ a job that has not had a working day yet never says day 0');
    has(zero, '6 working days', '…it falls back to the proposed length, which is the honest reading');
    has(zero, 'Started', 'while still saying it has started');

    has(V.jtScheduleHtml({ state: 'vendor' }), 'vendor availability',
        'a prep job states how it IS scheduled, rather than apologising for a missing number');
    const ns = V.jtScheduleHtml(Object.assign({}, base, { state: 'nostart' }));
    has(ns, 'No target start', 'a missing start is named');
    has(ns, 'Set one in Edit Client', '…with the fix on screen, because it is fixable');

    has(V.jtScheduleHtml(Object.assign({}, base, { fit: 'late', fitTxt: 'ends 4 working days past the hard target' })),
        'jt-s-err', 'a plan that does not fit is flagged red');
    has(V.jtScheduleHtml(Object.assign({}, base, { hard: '2026-10-15' })), 'Hard target',
        'and a reachable one is stated in plain grey');

    const paced = V.jtScheduleHtml(Object.assign({}, base, { state: 'running', elapsed: 9, actualStart: '2026-09-21',
      actualStartKind: 'activated', pace: 'overrun', paceTxt: 'Working day 9 of 6.', paceFix: 'Re-plan.' }));
    has(paced, 'jt-sched-note', 'a pace flag gets its own line rather than joining the clauses');

    // ⚠ WHERE YOU STAND, IN WORDS (2026-09-20). Anthony, off the Job Plan: "target start date was
    // September 21st, actual start date September 22nd, projected six days, today is the 24th, three
    // more days … that lets you know where you stand in the job." The strip is the one renderer of
    // that sentence, on the dashboard and on the plan header alike.
    const slipped = V.jtScheduleHtml(Object.assign({}, base, { state: 'running', elapsed: 3, remaining: 3, today: '2026-09-24',
      actualStart: '2026-09-22', actualStartKind: 'activated', projectedEnd: '2026-09-29' }));
    has(slipped, 'Started D:2026-09-22', 'the recorded start');
    has(slipped, 'target was D:2026-09-21', '⚠ and the target it slipped from, beside it');
    has(slipped, 'Today <span class="jt-sched-v">D:2026-09-24</span>', 'today, so the working day is anchored on a date');
    has(slipped, 'Working day 3 of 6', 'where the job is');
    has(slipped, '3 working days to go', 'and the working days after today');
    has(slipped, 'now ending <span class="jt-sched-v">D:2026-09-29</span>', 'and the end the slip moved it to');
    const onTime = V.jtScheduleHtml(Object.assign({}, base, { state: 'running', elapsed: 6, remaining: 0, today: '2026-09-28',
      actualStart: '2026-09-21', actualStartKind: 'activated' }));
    lacks(onTime, 'target was', 'a start on the target date names no slip');
    has(onTime, 'last planned day', 'day 6 of 6 is the last planned day, not "0 to go"');
    const over = V.jtScheduleHtml(Object.assign({}, base, { state: 'running', elapsed: 8, remaining: 0, overBy: 2, today: '2026-09-30',
      actualStart: '2026-09-21', actualStartKind: 'activated', pace: 'overrun', paceTxt: 'Working day 8 of 6 — 2 past.', paceFix: 'Re-plan.' }));
    lacks(over, 'to go', '⚠ over the length, "to go" is withheld — the red pace line says it once');
    lacks(over, 'last planned day', 'and so is the last-day wording');
    const dep = V.jtScheduleHtml(Object.assign({}, base, { state: 'running', elapsed: 2, remaining: 4, today: '2026-09-23',
      actualStart: '2026-09-22', actualStartKind: 'deposit' }));
    has(dep, '(from the deposit)', 'a deposit-anchored start still says so');
    lacks(dep, 'target was', '⚠ and never claims a slip — a deposit date is a proxy, not a recorded start');
    lacks(V.jtScheduleHtml(Object.assign({}, base, { state: 'running', elapsed: 2, today: '2026-09-23',
      actualStart: '2026-09-22', actualStartKind: 'activated' })), 'to go', 'a descriptor without `remaining` prints no count rather than a wrong one');
    has(paced, 'Re-plan.', 'and it carries the fix');

    // A one-day job: addWorkingDays(s,1) is s and ceil(1/2) is 1, so halfway and end are the start.
    const oneDay = V.jtScheduleHtml(Object.assign({}, base, { days: 1, halfway: '', planEnd: '2026-09-21' }));
    eq((oneDay.match(/D:2026-09-21/g) || []).length, 1,
       '⚠ a one-day job prints its date ONCE, not three times');

    const vb = noComments(fn('jtScheduleHtml'));
    lacks(vb, 'job.', '⚠ the builder takes only the descriptor — it holds no opinion about the job');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠⚠ docReadiness — ONE gate, and the live defect it closes');
  {
    const G = sandbox({
      fns: ['docReadiness', 'docDraftOnly', 'agreementReady', 'isJobWon'],
      vars: ['DOC_READY_WHY'],
    });
    const JOB = { id: 7 };
    const DRAFT = { estimate: { jobId: 7 } };
    const APPROVED = { estimate: { jobId: 7 }, approved: true };

    eq(G.docReadiness('estimate', JOB, APPROVED), '', 'an approved estimate is ready');
    eq(G.docReadiness('estimate', JOB, DRAFT), '',
       '…and so is a DRAFT, for reading — the tray shows it, docDraftOnly stops it leaving');
    has(G.docReadiness('estimate', JOB, null), 'No estimate has been built',
        'a job with no estimate at all is refused');
    eq(G.docReadiness('estimate', null, null), G.docReadiness('estimate', null, null),
       'and no job is refused rather than throwing');

    // ⚠⚠ THE DEFECT. On the screenshot's job — status NEW, estimate built, NOT approved, not
    // won, no agreement — these two rendered a complete, printable billing document priced off
    // the draft, because the invoice blocker only ever refused a FINAL.
    ok(!!G.docReadiness('invoice', JOB, DRAFT),
       '⚠⚠ a deposit invoice off an UNAPPROVED estimate is refused');
    ok(!!G.docReadiness('agreement', JOB, DRAFT),
       '⚠ and so is the signing packet');
    ok(!!G.docReadiness('invoice', JOB, APPROVED),
       '⚠ an approved estimate is not enough either — the client has not accepted it');
    eq(G.docReadiness('invoice', { id: 7, won: true }, APPROVED), '',
       'and once they have, the invoice is ready');

    ok(G.docDraftOnly('estimate', JOB, DRAFT), 'a draft estimate is view-only');
    ok(!G.docDraftOnly('estimate', JOB, APPROVED), 'an approved one is not');
    ok(!G.docDraftOnly('invoice', JOB, DRAFT), '⚠ and draft-only is an ESTIMATE rule, not a general one');

    // ⚠ ONE GATE, READ BY BOTH ENDS: what is OFFERED and what happens when it is PRESSED.
    eq((src.match(/docReadiness\(/g) || []).length, 6,
       'the definition, the three registry blockers, the tray and the assembler');
    ['estimate', 'agreement', 'invoice'].forEach((k) => {
      const blk = noComments(src.slice(src.indexOf('  ' + k + ': {'), src.indexOf('  ' + k + ': {') + 4000));
      has(blk, 'docReadiness(', `the ${k} blocker asks the shared gate`);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠⚠ the rendered header — the red em dash in Anthony\u2019s own screenshot');
  {
    // ⚠⚠ THIS GROUP LIFTS THE **REAL** `fmtDate2`, AND THAT IS THE ENTIRE POINT. The harness
    // stubs it as `(d) => String(d || '')`, which returns '' for a missing date — so under the
    // stub the old expression `fmtDate2(job.completion) ? red : '—'` took its FALSE arm and
    // every test in this repo read the cell as correct. The real one returns the literal '—',
    // which is TRUTHY, so it took the TRUE arm and painted a red bold em dash on every job with
    // no hard target: an error-coloured warning nobody can act on, visible in the screenshot
    // that asked for these two fields to move here. A stub that does not match the real source
    // is worse than no stub — this repo has now paid for that twice.
    const DFNS = ['renderClientDashboard', 'field', 'fmtDate2', 'dot', 'sectionHdr', 'fmtMoney',
      'dashUtilityBar', '_dashUtilityBarHtml', 'jobTimeline', 'jobTimelineNext', 'jobTimelineActions',
      'jobTimelineDoc', 'jobStageDoc', 'docReadiness', 'docDraftOnly', 'docTitle', 'docWord',
      '_jtDocSecondaries', '_jtDocViews', '_jtDraftLink', '_jtDriveLink', '_jtSendAction',
      'jobSchedule', 'jtScheduleHtml', 'estWorkingDays', '_todayStr', 'addWorkingDays', 'jobProgress',
      'workingDaysInclusive', 'approvedEstimateFor', 'paymentSplit', 'unscoredRoomNames',
      'jobActivationBlockers', 'isJobWon', 'isJobFunded', 'jobPayments', 'stagePaidTotal',
      'depositPaidTotal', 'depositTargetFor', 'agreementSignature', 'isAgreementSigned',
      'agreementReady', 'esignProviderKey', 'esignAvailable', 'esignJobWatches', 'docSentAt', 'docDraftedAt', 'docKeyFor',
      'getJobActuals', 'jobLogEntries', 'houseFlagsOf', 'activeHouseFlags', 'standingFlagLines',
      'standingFlagsBlock', '_sfHost', '_sfRowHtml', 'mustFindItems', 'mustFoundOf', '_mustFindKey', '_mfHandle', 'maybeStartJobsWatch', 'stopJobsWatch', 'calcRECommission', 'formatPropVal', 'isAgreementSent'];
    const DVARS = ['ESIGN_PROVIDERS', 'FIREARMS_PROTOCOL_DOC', 'HOUSE_FLAGS', 'SF_HOSTS', 'JT_LEG_BREAK', 'JT_SHORT', 'SVC_LABELS',
      '_dashNotice', '_jobsWatch', 'jobLogs', 'JT_ROW_DOC', 'DOC_READY_WHY', 'DOC_KIND_WORD',
      'DOC_STAGE_WORD', 'DOC_ACTIONS', 'PRODUCTIVE_HRS_PER_DAY',
      'jobPlanStore', 'PROJ_CREW_DAY', 'TC_DONE_STATUSES', 'PS_DONE_STATUSES'];
    const paint = (over, rec) => {
      const job = Object.assign({ id: 7, hvlId: 'HVL-0007', name: 'Butler', svc: 'cleanout',
        status: 'won', won: true, approved: true, walkthrough: '2020-01-01',
        created: 'Sep 8, 2026' }, over || {});
      const dom = domStub({});
      const c = sandbox({ fns: DFNS, vars: DVARS, stubs: {
        document: dom, setTimeout: () => 0, clearTimeout: () => {}, Intl: global.Intl,
        jobs: [job], logs: [], changeOrders: [], contractors: [], _photoRefs: {},
        estimateStore: rec === null ? {} : { 7: rec || { estimate: { rooms: [{ name: 'Kitchen', vol: 3, cplx: 3 }], havellinTotal: 24100, days: 6, svc: 'cleanout' }, approved: true } },
      } });
      c.renderClientDashboard(7);
      return dom.getElementById('client-dashboard-view').innerHTML;
    };

    const noHard = paint({ start: '2026-09-21' });
    has(noHard, 'Target start', 'Target start is in the client detail grid');
    has(noHard, 'Hard target', 'and so is Hard target — to the right of Email, where Anthony asked');
    lacks(noHard, 'dfv-alert',
          '⚠⚠ a job with NO hard target paints no red — the em-dash defect, closed');
    has(paint({ start: '2026-09-21', completion: '2026-10-15' }), 'dfv-alert',
        'and a real hard target IS painted red, because that one must not be missed');

    // ⚠ THE CHIPS SIT BESIDE THE NAME NOW. Anthony: "put the chips … up higher, to the right of
    // the client's name and address."
    has(noHard, 'dash-id', 'the identity row is one flex row');
    has(noHard, 'dash-chips', 'with the chips as its second child');
    ok(noHard.indexOf('dash-id-who') < noHard.indexOf('dash-chips'),
       '…the name first, the chips to its right');
    has(noHard, 'dash-avatar',
        '⚠ and the avatar is a class, never an inline flex-shrink:0 the phone block overrides');

    // The schedule strip, above the rail.
    has(noHard, 'jt-sched', 'the schedule strip renders');
    has(noHard, '6 working days', 'stating the proposed length of the job');
    ok(noHard.indexOf('jt-sched') < noHard.indexOf('jt-next'),
       'above the NEXT band, which is above the track');

    // ⚠⚠ NO CONTROL RENDERS TWICE. The band's tray and the quick strip can legitimately name
    // the same document — twelve rows map onto five documents — so the strip is SEEDED from
    // the band before it sweeps. This is the check that makes that structural.
    const onclicks = (noHard.match(/onclick="([^"]+)"/g) || []);
    eq(onclicks.length, new Set(onclicks).size,
       '⚠⚠ every onclick on the whole rendered dashboard is unique');

    // The tray, on the state in the screenshot: estimate built, NOT approved.
    const draft = paint({ start: '2026-09-21', status: 'new', won: false, approved: false },
                        { estimate: { rooms: [{ name: 'Kitchen', vol: 3, cplx: 3 }], havellinTotal: 12700, days: 6, svc: 'cleanout' } });
    has(draft, 'jt-doc', 'the band carries a document tray');
    has(draft, 'DRAFT', '⚠ and an unapproved estimate is titled DRAFT — one word, no explanation');
    has(draft, "'estimate','view'", 'it can be read');
    lacks(draft, "'estimate','print'", '⚠⚠ and it cannot be printed — withheld, not offered-and-refused');
    has(draft, 'dashEditEstimate(7)', 'Edit estimate sits with the document it edits');
    // ⚠⚠ THE LIVE DEFECT: on this exact state the old strip offered View/Print for the packet
    // and all three invoices, two of which rendered a printable bill off the draft.
    lacks(draft, "'invoice','view'", '⚠⚠ and NO invoice is offered off an unapproved estimate');
    lacks(draft, "'invoice','print'", '⚠⚠ nor printed — this rendered a real bill off the draft');
    lacks(draft, "'agreement','view'", '⚠ nor the signing packet');
    lacks(draft, 'deposit invoice', '⚠ the words do not appear anywhere on the page');
    lacks(draft, 'midpoint invoice', 'for any stage');

    // ─── ONE ACTION ROW, NOT TWO (2026-09-20) ────────────────────────────────────
    // Anthony, off a final-invoice band whose four buttons sat two over two: *"let's make the
    // four ... move horizontally rather than stacked two over two to save a little vertical
    // scrolling."* NOTHING WAS WRAPPING — the tray's buttons and the step's were two sibling
    // flex rows, so the 2×2 was by construction and no width would ever have fixed it. The
    // requirement is therefore about STRUCTURE, not CSS, and that is what these pin: one
    // container holds all of them, and the document's buttons still come first in it.
    const rowOf = (html, cls) => {
      const at = html.indexOf('<div class="' + cls + '">');
      if (at < 0) return '';
      // The row holds only buttons, so the first close after it is its own.
      return html.slice(at, html.indexOf('</div>', at));
    };
    const dRow = rowOf(draft, 'jt-doc-acts');
    ok(dRow.length > 0, 'the band draws an action row inside the tray');
    eq((dRow.match(/<button/g) || []).length, 3,
       '⚠⚠ ONE ROW holds them all — View, Edit estimate and the step primary, not two rows of buttons');
    has(dRow, 'jt-btn-p', '…including the primary, which used to sit in a second row below');
    ok(dRow.indexOf("'estimate','view'") < dRow.indexOf('jt-btn-p'),
       '⚠ TRAY BEFORE THE PRIMARY still, left to right: you consult the document, then you act on it');
    ok(dRow.indexOf('dashEditEstimate(7)') < dRow.indexOf('jt-btn-p'),
       'and every tray button is ahead of it, not just the first');
    // ⚠ The second row is GONE rather than emptied — an empty flex row is 0px but it is also a
    // sibling nothing accounts for, and the next person adding a margin to it would reopen this.
    lacks(draft.slice(draft.indexOf('jt-doc-acts')), 'jt-acts',
          '⚠⚠ and there is no second action row after it at all');
    eq((draft.match(/jt-btn-p/g) || []).length, 1, 'still exactly one filled button in the band');

    // ⚠ THE NO-DOCUMENT CASE IS UNCHANGED, and it has to be tested separately: four rail rows
    // map to no document (intake, walkthrough, job active, work complete), and on those the
    // step's row is the only row there has ever been. Merging must not have cost them their row.
    // Deposit paid, job not yet activated — `job_active` is one of the four rows that map to no
    // document at all, so the step's row is the only row the band has ever drawn there.
    const noDoc = paint({ estimateSentDate: 'Sep 9, 2026', agrSent: true, agrSigned: true,
      docState: { estimate: { sentAt: '2026-09-09' }, agreement: { sentAt: '2026-09-10' }, 'invoice:deposit': { sentAt: '2026-09-12' } },
      payments: [{ uid: 'p1', stage: 'deposit', amount: 12050, date: '2026-09-15', method: 'wire', clearedOn: '2026-09-15' }] });
    has(noDoc, 'Activate job', 'the fixture really does land on a step with no document');
    has(noDoc, 'jt-acts', '⚠ a step with no document still draws its own action row');
    lacks(noDoc, 'jt-doc-acts', 'and no tray row, because there is no document to put in one');
    const nRow = rowOf(noDoc, 'jt-acts');
    has(nRow, 'jt-btn-p', 'carrying the primary exactly as before');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠ the row → document map, and the document in play right now');
  {
    const M = sandbox({ fns: ['jobStageDoc'], vars: ['JT_ROW_DOC'] });
    eq(M.jobStageDoc('estimate_built'), { kind: 'estimate', stage: '' }, 'the estimate runs from built…');
    eq(M.jobStageDoc('client_accepted'), { kind: 'estimate', stage: '' }, '…through the client accepting it');
    eq(M.jobStageDoc('agreement_signed'), { kind: 'agreement', stage: '' }, 'the packet through signing');
    // ⚠ *_received maps to the SAME invoice as *_invoiced deliberately: recording a cheque
    // against an invoice you cannot open is a real gap.
    eq(M.jobStageDoc('deposit_received'), { kind: 'invoice', stage: 'deposit' },
       '⚠ and the payment row reaches the same invoice as the row that sent it');
    // ⚠ FOUR ROWS HAVE NO DOCUMENT, and that is stated by ABSENCE.
    ['intake', 'walkthrough', 'job_active', 'work_complete'].forEach((k) =>
      eq(M.jobStageDoc(k), null, `${k} has no document — it is a step where you RECORD something`));
    eq(M.jobStageDoc('nonsense'), null, 'and an unknown key is null, not undefined');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠ the document in play right now — and "done" is not "sent"');
  {
    const D = sandbox({
      fns: ['jobTimelineDoc', 'jobTimelineNext', 'jobTimelineActions', 'jobStageDoc', 'docReadiness',
            'docDraftOnly', 'docTitle', 'docWord', '_jtDocSecondaries', '_jtDocViews', '_jtDraftLink',
            '_jtDriveLink', '_jtSendAction', 'docKeyFor', 'docSentAt', 'agreementReady', 'isJobWon',
            'esignAvailable', 'esignJobWatches', 'isAgreementSigned', 'agreementSignature', 'esignProviderKey'],
      vars: ['JT_ROW_DOC', 'DOC_READY_WHY', 'DOC_KIND_WORD', 'DOC_STAGE_WORD', 'DOC_ACTIONS', 'ESIGN_PROVIDERS'],
    });
    const REC = { estimate: { jobId: 7 }, approved: true };

    // The live step's own document wins, and is marked as the one in play NOW.
    const liveRows = [{ key: 'estimate_sent', state: 'current', done: false },
                      { key: 'client_accepted', state: 'waiting', done: false }];
    const now = D.jobTimelineDoc(liveRows, { id: 7, won: true }, REC);
    eq(now.kind, 'estimate', 'the lit step\u2019s document is the one in play');
    eq(now.rel, 'now', 'and it is marked as current');

    // ⚠⚠ THE BACKWARD WALK ACCEPTS ONLY A DOCUMENT THAT WAS ACTUALLY SENT. `estimate_built.done`
    // means an estimate EXISTS and `estimate_approved.done` means a manager approved it —
    // neither means it went out, and `markEstimateSent` is a skippable manual button this repo
    // already records as non-monotonic. Without the docSentAt test the Complete band reads
    // "Last sent — Client Estimate" over a document that never left the building.
    const doneRows = [{ key: 'estimate_built', state: 'done', done: true },
                      { key: 'estimate_approved', state: 'done', done: true }];
    eq(D.jobTimelineDoc(doneRows, { id: 7, won: true }, REC), null,
       '⚠⚠ a document that was approved but NEVER SENT is not offered as "last sent"');
    const sentJob = { id: 7, won: true, docState: { estimate: { sentAt: '2026-09-20T10:00:00Z' } } };
    const last = D.jobTimelineDoc(doneRows, sentJob, REC);
    ok(!!last, 'once it really was sent, the finished band can offer it');
    eq(last.rel, 'last', 'marked as history rather than as the step in play');
    has(last.title, 'Last sent', 'and the title says so, so it cannot read as the current document');

    // ⚠⚠ THE GATE AT THE ROW LEVEL, not only in the rendered page. On the screenshot's job every
    // one of these rows offered its document ungated, and two of them rendered a printable bill.
    const DRAFT_REC = { estimate: { jobId: 7 } };
    ['deposit_invoiced', 'midpoint_invoiced', 'final_invoiced', 'agreement_sent'].forEach((k) => {
      const a = D.jobTimelineActions({ key: k, state: 'waiting' }, { id: 7 }, DRAFT_REC);
      eq(a.doc, null, `${k} offers no document while the estimate is an unapproved draft`);
    });
    const ok1 = D.jobTimelineActions({ key: 'deposit_invoiced', state: 'waiting' },
                                     { id: 7, won: true }, { estimate: { jobId: 7 }, approved: true });
    ok(!!ok1.doc, '…and offers it once the estimate is approved and the client has accepted');

    eq(D.jobTimelineDoc([], { id: 7 }, REC), null, 'no rows, no document');
    eq(D.jobTimelineDoc(doneRows, { id: 7, won: true }, null), null,
       '⚠ and a job with no estimate offers nothing at all');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('the save redirect — it lands on the client, and clears nothing it cannot leave');
  {
    const b = noComments(fn('saveEstimateAndPreview'));
    // ⚠⚠ THE BUG: that tab was retired from the nav in Slice 7, so the selector resolved to
    // null, querySelector returned it without throwing, `if (_ceBtn)` swallowed it — and the
    // block went on to blank the form on the panel the user was still looking at.
    lacks(b, "'client-estimate'", '⚠ the retired tab is no longer the navigation target');
    has(b, "showPanel(\\'jobs\\'", 'it navigates to the Client Dashboard');
    has(b, 'openClientDashboard(jobId)', 'and opens the client the estimate was just built for');

    // ⚠ THE ORDER IS THE FIX, NOT JUST THE SELECTOR.
    ok(b.indexOf('if (!_navJobs) return;') < b.indexOf('clearEstimateTab()'),
       '⚠⚠ it finds the button BEFORE it clears the form — the old line cleared, then discovered it could not navigate');
    ok(b.indexOf('_navJobs.click()') < b.indexOf('openClientDashboard(jobId)'),
       '⚠ nav first, drilldown second — showPanel(\'jobs\') hides the drilldown and renders the list');
    ok(b.indexOf('openClientDashboard(jobId)') < b.indexOf("dashNotice('ok'"),
       '⚠ and the notice comes after, because openClientDashboard nulls _dashNotice');
    has(b, '_dashRedraw(jobId)', 'then redraws so the message is actually painted');
    lacks(b, 'renderClientEstimate()', 'the invisible preview into a panel with no nav button is gone');

    // The save summary reaches the dashboard; the progress claim does not outlive its truth.
    has(b, "saveMsg + ' · Uploading to cloud…'",
        'the progress claim rides the feedback call on the estimator');
    lacks(b, "+ ' · Uploading to cloud…';",
          '⚠ and not saveMsg itself — by the time the dashboard paints, the outbox has flushed');
    has(b, 'exportEstimateToDrive(jobId, _estSnapshotForDrive)',
        'and the Drive export still fires off its own snapshot');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('job.activatedOn — the write-once anchor the elapsed reading had none of');
  {
    const t = sandbox({ fns: ['applyJobTransition', 'jobActivationBlockers', '_actor', 'isJobFunded',
                              'jobPayments', 'stagePaidTotal', 'depositPaidTotal', 'isAgreementSigned',
                              'agreementSignature', '_todayStr'],
                        vars: ['JOB_TRANSITIONS'],
                        stubs: { agrApprovedBy: '', approvedBy: 'Anthony Graziano' } });
    const j = { id: 7, status: 'won', won: true, agrSigned: true, depositReceived: true,
                payments: [{ id: 1, stage: 'deposit', amount: 12050 }] };
    ok(t.applyJobTransition(j), 'a won, signed, funded job activates');
    eq(j.status, 'active', 'and its status moves');
    ok(!!j.activatedOn, '⚠ and it is stamped with the day it actually started');
    const first = j.activatedOn;

    t.applyJobTransition(j);                      // active -> closed
    eq(j.status, 'closed', 'it closes');
    t.applyJobTransition(j);                      // closed -> active (Re-open)
    eq(j.status, 'active', 'and re-opens');
    eq(j.activatedOn, first,
       '⚠⚠ WRITE-ONCE: JOB_TRANSITIONS.closed is "active", so re-opening would otherwise reset the date the job really started');

    has(noComments(fn('applyJobTransition')), "if (next === 'active' && !j.activatedOn)",
        'the guard is the whole mechanism');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠ ONE weekend / min-chain rule, now that both forms carry these dates');
  {
    // ⚠ THE DATES BECAME EDITABLE IN TWO PLACES the day the schedule strip made them
    // prominent. A second copy of "no weekends, and the chain runs walkthrough → start →
    // completion" is how the two forms come to disagree about what is a legal date.
    has(noComments(fn('updateIntakeDateMins')), "dateChainGuard('i', 'i-fb')",
        'intake delegates rather than keeping its own copy');
    const ub = noComments(fn('updateIntakeDateMins'));
    ['isWeekend(', '.min =', 'showFB('].forEach((n) =>
      lacks(ub, n, `intake re-implements nothing (${n})`));

    const G = sandbox({ fns: ['dateChainGuard', 'isWeekend'] });
    const el = (v) => ({ value: v, min: '' });
    // ⚠ EVERY ELEMENT ACCESS IS GUARDED: `ec-walkthrough` DOES NOT EXIST — the walkthrough date
    // is an intake field and Edit Client carries only the two targets. An unguarded read is a
    // TypeError on the form somebody is trying to save.
    const ec = { 'ec-start': el('2026-09-19'), 'ec-completion': el('2026-10-01') };  // a Saturday
    let said = '';
    G.document = { getElementById: (id) => ec[id] || null };
    G.alert = (m) => { said = m; };
    G.dateChainGuard('ec');
    eq(ec['ec-start'].value, '', '⚠ a weekend start is cleared on Edit Client, with no walkthrough field present');
    has(said, 'weekend', 'and it says why, through alert when the form has no feedback strip');

    const ec2 = { 'ec-start': el('2026-09-21'), 'ec-completion': el('2026-09-14') };
    G.document = { getElementById: (id) => ec2[id] || null };
    G.dateChainGuard('ec');
    eq(ec2['ec-completion'].min, '2026-09-21', 'the hard target cannot precede the start');
    eq(ec2['ec-completion'].value, '', 'and one that already did is cleared');

    // ⚠ IT FLAGS AND EXPLAINS; IT NEVER REFUSES. The client estimate states the target start and
    // the agreement states an Estimated Start Date, so moving it after either went out makes a
    // document in somebody's hands wrong. The app cannot reissue them; it can say so.
    const sb = noComments(fn('saveClientEdit'));
    has(sb, "job.start      = (document.getElementById('ec-start') || {}).value || '';",
        'Edit Client saves the target start, guarded');
    has(sb, "docSentAt(job, 'estimate')", 'and checks whether the client estimate has gone out');
    has(sb, 'the signed agreement', 'and whether an agreement was signed against the old dates');
    lacks(sb, 'return false', 'but it never refuses the edit');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('the rail carries PLANNED dates, and they can never be read as actuals');
  {
    const R = sandbox({
      fns: ['jobTimeline', 'jobTimelineNext', 'paymentSplit', 'unscoredRoomNames', 'jobActivationBlockers',
            'isJobWon', 'isJobFunded', 'jobPayments', 'stagePaidTotal', 'depositPaidTotal', 'depositTargetFor',
            'agreementSignature', 'isAgreementSigned', 'esignProviderKey', 'esignAvailable', 'esignJobWatches',
            'docSentAt', 'docDraftedAt', 'docKeyFor', 'isAgreementSent'],
      vars: ['JT_SHORT', 'AGR_SIG_METHODS', 'ESIGN_PROVIDERS'],
      stubs: { REQUIRE_WALKTHROUGH_NOTES: false },
    });
    const JOB = { id: 7, name: 'Butler', svc: 'cleanout', status: 'won', won: true, approved: true,
                  start: '2026-09-21', walkthrough: '2026-09-14', estimateSentDate: 'x',
                  agrSigned: true, agrSent: true, payments: [] };
    const REC = { estimate: { rooms: [{ name: 'Kitchen', vol: 3, cplx: 3 }], havellinTotal: 24100 }, approved: true };
    const SCHED = { state: 'planned', today: '2026-09-25', start: '2026-09-21',
                    halfway: '2026-09-23', planEnd: '2026-09-28' };

    const rows = R.jobTimeline(JOB, REC, [], [], SCHED);
    eq(rows.length, 16, 'the row count is unchanged');
    const byKey = {};
    rows.forEach((r) => { byKey[r.key] = r; });

    eq(byKey.midpoint_invoiced.plan, '2026-09-23', 'the midpoint invoice carries the calendar halfway');
    eq(byKey.midpoint_invoiced.planLbl, 'halfway point', 'labelled as the halfway point');
    ok(byKey.midpoint_invoiced.planLate, 'and flagged, because today is past it');
    // ⚠⚠ A PLANNED DATE IS NOT AN ACTUAL AND MUST NEVER SHARE THE `at` SLOT. Every `at` on this
    // rail is something that HAPPENED, and _jtAt formats it as one.
    eq(byKey.midpoint_invoiced.at, '', '⚠⚠ and its `at` is still empty — a plan never enters the actual slot');
    eq(byKey.job_active.plan, '2026-09-21', 'job active carries the target start');
    eq(byKey.work_complete.plan, '2026-09-28', 'and work complete the target end');
    eq(byKey.intake.plan, '', 'a row with no schedule meaning carries none');

    // ⚠ A PLAN IS WITHHELD THE MOMENT ITS ACTUAL EXISTS.
    const doneRows = R.jobTimeline(Object.assign({}, JOB, { status: 'active', deliveredOn: '2026-09-27' }), REC, [], [], SCHED);
    eq(doneRows.filter((r) => r.key === 'work_complete')[0].plan, '',
       '⚠ once the job is delivered the projection is history and is dropped');

    // Optional, and byte-identical without it — every existing caller is unmoved.
    const bare = R.jobTimeline(JOB, REC, [], []);
    eq(bare.length, 16, 'the schedule is optional');
    eq(bare.filter((r) => r.key === 'midpoint_invoiced')[0].plan, '', 'and no row carries a plan without one');

    ['dead', 'none', 'vendor'].forEach((st) =>
      eq(R.jobTimeline(JOB, REC, [], [], { state: st, today: '2026-09-25', start: '2026-09-21',
        halfway: '2026-09-23', planEnd: '2026-09-28' }).filter((r) => r.key === 'job_active')[0].plan, '',
        `a ${st} schedule puts no plan on the rail`));

    const jtBody = noComments(fn('jobTimeline'));
    lacks(jtBody, 'toLocaleDateString', 'the derivation still never formats a date');
    // ⚠ THE SCHEDULE IS PASSED IN RATHER THAN DERIVED, and that is the requirement: reading the
    // clock for it would make the repo's most-driven pure derivation non-deterministic and turn
    // five sandboxes into time bombs that pass today and fail on a future Tuesday.
    lacks(jtBody, '_todayStr()', 'jobTimeline never reads today for itself');
    lacks(jtBody, 'jobSchedule(', 'and never derives the schedule — its one caller hands it over');
    // ⚠ NOTED, NOT INTRODUCED, NOT FIXED: `jobTimeline` DOES read the clock in exactly one
    // pre-existing place — `walked`, which tests whether the walkthrough date has passed. It is
    // unrelated to the schedule and predates this work; pinned at ONE so the schedule cannot
    // quietly add a second.
    eq((jtBody.match(/new Date\(\)/g) || []).length, 1,
       'the one pre-existing clock read is the walkthrough test, and it stays alone');
  }
};
