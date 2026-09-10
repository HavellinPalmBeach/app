'use strict';
// THE JOB TIMELINE RAIL — the Client Dashboard's spine (2026-09-10).
//
// WHY THIS SUITE EXISTS. The dashboard is becoming the one place a job is run, and the
// rail is what tells whoever opens it which single thing to do next. That makes the
// derivation load-bearing in a way the eight-step strip it replaces never was: the strip
// was decoration beside a Documents card, and it was wrong in three separate ways for
// months without anyone noticing, because nothing read it and nothing tested it.
//
//   · `Complete` read `job.completionDate`, which is READ TWICE AND WRITTEN NOWHERE in
//     the whole file. That node, and the "Work completed" field beside it, have been
//     blank on every job this app has ever had. The real stamp is `deliveredOn`.
//   · `Midpoint` was hardcoded `done:false` and `'25% · pending'` — a midpoint cheque
//     could be banked, recorded and reconciled and the timeline still said pending.
//   · The blocker chips above it kept their OWN copy of the activation rule, testing
//     `svc==='probate'` where `jobActivationBlockers` tests probate OR contested_probate.
//     So a contested matter with the Letters outstanding showed no warning anywhere and
//     then refused to activate, naming a blocker nothing on screen had mentioned.
//
// ⚠⚠ AND THE ONE THAT WOULD HAVE BITTEN THE REWRITE: `job.status` IS NOT THE LIFECYCLE
// POINTER. Five carriers hold a job's state and four move without it. `checkPin` alone
// knocks a WON job back to `'approved'` — its preserve list holds 'active' and 'closed'
// and not 'won' — so a rail driven off `job.status` announces that a signed, funded,
// active job is "Approved — Awaiting Client". There is a test for exactly that job.

const { sandbox, source } = require('./harness');

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();

  // ⚠ THE BODY OF `jobTimeline`, BOUNDED AND COMMENT-STRIPPED. A slice taken from
  // `indexOf('function jobTimeline(')` runs to the end of a 1.6MB file, so `lacks()`
  // over it searches the whole app and passes or fails on unrelated code. And a raw
  // body includes this function's own comments — which name `job.status` and
  // `completionDate` precisely because it explains why it does NOT read them. This
  // file has paid for that trap twice; strip them rather than weaken the assertion.
  const jtBody = (() => {
    const from = src.indexOf('function jobTimeline(job, estRec, logs, cos)');
    const body = src.slice(from, src.indexOf('\nfunction jobTimelineNext', from));
    return body.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  })();

  // The source of one function, bounded at the next top-level `function` so an
  // assertion cannot wander into unrelated code — the trap that made three of this
  // suite's first assertions unable to fail.
  const body = (sig) => {
    const from = src.indexOf('function ' + sig);
    if (from < 0) return '';
    const rest = src.slice(from + 10);
    const end = rest.indexOf('\nfunction ');
    return end < 0 ? rest : rest.slice(0, end);
  };

  const ctx = sandbox({
    fns: [
      'jobTimeline', 'jobTimelineNext', 'paymentSplit', 'unscoredRoomNames',
      'jobActivationBlockers', 'isJobWon', 'isJobFunded', 'jobPayments',
      'stagePaidTotal', 'depositPaidTotal', 'depositTargetFor',
    ],
  });

  const PAST = '2020-01-01';
  const FUTURE = '2099-01-01';
  const TOTAL = 24100;

  // A scored room. `vol`/`cplx` >= 1 is what `unscoredRoomNames` asks for.
  const room = (name, o) => Object.assign({ name, vol: 3, cplx: 3 }, o || {});

  // Build a job + its estimate record at a named point in the lifecycle. Each `stage`
  // adds the carrier for its own milestone and nothing else, so a test can assert that a
  // row reads the field that owns it rather than one that happens to move alongside.
  function fixture(stage, over) {
    // ⚠ `over` is applied LAST, after every stage has written its carriers. Applied
    // first, a test asking for status:'lost' got 'approved' back, because at('approved')
    // overwrites it — and the terminal tests then silently asserted against a live job.
    const job = {
      id: 1, hvlId: 'HVL-0007', name: 'Butler', created: 'Sep 8, 2026',
      svc: 'cleanout', status: 'new', walkthrough: '',
    };
    const est = { rooms: [room('Kitchen'), room('Primary Bedroom')], havellinTotal: TOTAL };
    let rec = null;

    const at = (s) => ORDER.indexOf(stage) >= ORDER.indexOf(s);
    const ORDER = ['intake', 'walkthrough', 'built', 'approved', 'sent', 'won',
      'agrApproved', 'agrSent', 'agrSigned', 'funded', 'active', 'midpoint', 'delivered', 'finalPaid'];

    if (at('walkthrough')) job.walkthrough = PAST;
    if (at('built')) rec = { estimate: est, savedAt: 'Sep 8, 2026', approved: false, submitted: false };
    if (at('approved')) { rec.approved = true; rec.approvedBy = 'Anthony'; rec.approvedAt = 'Sep 8, 2026'; job.approved = true; job.status = 'approved'; }
    if (at('sent')) job.estimateSentDate = 'September 8, 2026';
    if (at('won')) { job.won = true; job.wonAt = '2026-09-09'; job.wonBy = 'Anthony'; job.wonMethod = 'call'; job.status = 'won'; }
    if (at('agrApproved')) { job.agrApproved = true; job.agrApprovedBy = 'Anthony'; job.agrApprovedAt = 'Sep 9, 2026'; }
    if (at('agrSent')) { job.agrSent = true; job.agrSentAt = 'Sep 9, 2026'; job.agrSentBy = 'Anthony'; }
    if (at('agrSigned')) { job.agrSigned = true; job.agrSignedAt = 'Sep 10, 2026'; job.agrSignedBy = 'Anthony'; }
    if (at('funded')) {
      job.payments = [{ id: 1, stage: 'deposit', amount: 12050, receivedOn: '2026-09-10' }];
      job.depositReceived = true; job.depositReceivedAt = '2026-09-10';
    }
    if (at('active')) job.status = 'active';
    if (at('midpoint')) job.payments.push({ id: 2, stage: 'midpoint', amount: 6025, receivedOn: '2026-09-20' });
    if (at('delivered')) { job.status = 'closed'; job.deliveredOn = '2026-09-30'; job.deliveredBy = 'Anthony'; }
    if (at('finalPaid')) job.payments.push({ id: 3, stage: 'final', amount: 6025, receivedOn: '2026-10-02' });

    Object.assign(job, over || {});
    ctx.estimateStore = rec ? { 1: rec } : {};
    ctx.jobs = [job];
    return { job, rec, est };
  }

  const run = (stage, over) => {
    const f = fixture(stage, over);
    return ctx.jobTimeline(f.job, f.rec, [], []);
  };
  const byKey = (rows, k) => rows.filter((r) => r.key === k)[0];
  const lit = (rows) => rows.filter((r) => r.state === 'current' || r.state === 'blocked');

  const STAGES = ['intake', 'walkthrough', 'built', 'approved', 'sent', 'won',
    'agrApproved', 'agrSent', 'agrSigned', 'funded', 'active', 'midpoint', 'delivered', 'finalPaid'];

  // ─────────────────────────────────────────────────────────────────────────────
  group('THE INVARIANT — exactly one row is lit, at every point in the lifecycle');
  {
    // This is the entire promise of the rail. If two rows are lit there are two next
    // actions and the screen no longer answers the question it exists to answer; if none
    // is lit on an unfinished job, it answers it with silence.
    STAGES.forEach((s) => {
      const rows = run(s);
      const l = lit(rows);
      ok(l.length <= 1, `at "${s}" at most one row is current or blocked (found ${l.length}: ${l.map((r) => r.key).join(', ')})`);
      ok(!rows.some((r) => r.state === 'current' && r.blockedWhy),
        `at "${s}" no row is both current and carrying a blocker`);
    });

    // Every stage short of the last has somewhere to go.
    STAGES.slice(0, -1).forEach((s) => {
      ok(lit(run(s)).length === 1, `at "${s}" exactly one row is lit — the job is not finished`);
    });

    const done = run('finalPaid');
    eq(lit(done).length, 0, 'a fully recorded job lights nothing — there is no next action');
    ok(done.every((r) => r.state === 'done'), 'and every row on it reads done');
    eq(ctx.jobTimelineNext(done), null, 'jobTimelineNext returns null rather than a row');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  group('the light lands on the right step');
  {
    const expected = {
      intake: 'walkthrough', walkthrough: 'estimate_built', built: 'estimate_approved',   // eslint-disable-line
      approved: 'estimate_sent', sent: 'client_accepted', won: 'agreement_approved',
      agrApproved: 'agreement_sent', agrSent: 'agreement_signed', agrSigned: 'deposit_received',
      funded: 'job_active', active: 'midpoint_received', midpoint: 'work_complete',
      delivered: 'final_paid',
    };
    Object.keys(expected).forEach((s) => {
      const n = ctx.jobTimelineNext(run(s));
      eq(n && n.key, expected[s], `at "${s}" the next step is ${expected[s]}`);
    });

    // A walkthrough still ahead of us is a job whose next move is the walkthrough.
    const future = run('walkthrough', { walkthrough: FUTURE });
    eq(ctx.jobTimelineNext(future).key, 'walkthrough', 'a future walkthrough date is not done');
    eq(byKey(future, 'walkthrough').sub, '', 'and it does not claim there is no date set');
    eq(byKey(run('walkthrough', { walkthrough: '' }), 'walkthrough').sub, 'No date set yet',
      'no date at all says so');
    // A scored house IS a walkthrough, whatever the calendar says.
    eq(byKey(run('built', { walkthrough: '' }), 'walkthrough').done, true,
      'an estimate with rooms proves the walkthrough happened');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  group('⚠ every row reads the carrier that OWNS its milestone, never job.status');
  {
    // THE checkPin CASE. `checkPin` sets job.status='approved' and preserves only
    // 'active'/'closed' — 'won' is missing from its list. So re-approving an estimate on
    // a signed, funded, active job regresses the status while every real gate stays open.
    const rows = run('active', { status: 'approved' });
    eq(byKey(rows, 'client_accepted').done, true, 'client_accepted reads job.won, not job.status');
    eq(byKey(rows, 'agreement_signed').done, true, 'agreement_signed reads job.agrSigned');
    eq(byKey(rows, 'deposit_received').done, true, 'deposit_received reads the payments list');
    // job_active is the one row that legitimately reads status — and it also accepts a
    // delivered job, because a closed job was necessarily active.
    eq(byKey(rows, 'job_active').done, false, 'job_active reads status and reports it honestly');
    eq(byKey(run('delivered'), 'job_active').done, true, 'a delivered job counts as having been active');

    // The converse: status says active on a job with nothing else recorded.
    const bare = run('intake', { status: 'active' });
    eq(byKey(bare, 'agreement_signed').done, false, 'status=active does not fake a signature');
    eq(byKey(bare, 'deposit_received').done, false, 'status=active does not fake a payment');

    // A source-level pin. Only three places may consult job.status: the submitted
    // signal (which trusts it deliberately, because it syncs per job more reliably than
    // the estimate blob's own flag), the job_active row, and the terminal branch.
    const statusReads = (jtBody.match(/job\.status/g) || []).length;
    ok(statusReads <= 4, `jobTimeline reads job.status in at most 4 places (found ${statusReads}) — it is not the pointer`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  group('⚠ done is NOT monotonic and the walk must not assume it is');
  {
    // `markEstimateSent` is the ONLY writer of estimateSentDate and it is a manual
    // button. A job can therefore be signed, funded and active with no estimate-sent
    // date at all. The light must land on the earliest gap; the later rows stay done.
    const rows = run('active', { estimateSentDate: '' });
    eq(ctx.jobTimelineNext(rows).key, 'estimate_sent', 'the light lands on the earliest gap');
    eq(byKey(rows, 'agreement_signed').state, 'done', 'a later completed milestone still reads done');
    eq(byKey(rows, 'deposit_received').state, 'done', 'and so does the deposit');
    eq(lit(rows).length, 1, 'and still exactly one row is lit');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  group('⚠ the three standing bugs the old strip carried');
  {
    // 1. completionDate is written NOWHERE. deliveredOn is the write-once stamp.
    const legacy = run('active', { completionDate: 'Sep 30, 2026' });
    eq(byKey(legacy, 'work_complete').done, false,
      'a completionDate value proves nothing — no code path writes that field');
    const del = run('delivered');
    eq(byKey(del, 'work_complete').done, true, 'work_complete reads deliveredOn');
    eq(byKey(del, 'work_complete').at, '2026-09-30', 'and reports the date it was really handed over');
    lacks(jtBody, 'completionDate', 'jobTimeline never reads completionDate');
    lacks(src, "field('Work completed', job.completionDate",
      'and the dashboard field beside it no longer does either');

    // 2. Midpoint was hardcoded done:false.
    eq(byKey(run('active'), 'midpoint_received').done, false, 'no midpoint money, not done');
    const mid = run('midpoint');
    eq(byKey(mid, 'midpoint_received').done, true, 'a recorded midpoint payment reads done');
    eq(byKey(mid, 'midpoint_received').sub, '$6,025 received', 'and says what arrived');

    // 3. The chips kept their own copy of the activation rule and omitted contested.
    has(src, 'var blockers = jobActivationBlockers(job).map(function(b){',
      'the dashboard chips read jobActivationBlockers rather than re-testing the rule');
    lacks(src, "if (job.svc==='probate' && job.executorAuth==='pending') blockers.push(",
      'the old contested-probate-blind copy is gone');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  group('the executor-authorization blocker — the one gate that is not a prior row');
  {
    ['probate', 'contested_probate'].forEach((svc) => {
      const rows = run('funded', { svc, executorAuth: 'pending', executor: 'Jane Doe', executorPhone: '(561) 555-0100' });
      const row = byKey(rows, 'job_active');
      eq(row.state, 'blocked', `${svc} with the Letters outstanding blocks activation`);
      has(row.blockedWhy, 'Executor authorization must be received',
        `${svc} states the blocker in the words the gate itself uses`);
      // A panel reporting a blocker carries the fix. Standing rule.
      has(row.blockedFix, 'Jane Doe', 'the fix names the representative to chase');
      has(row.blockedFix, '(561) 555-0100', 'and how to reach them');
      eq(ctx.jobTimelineNext(rows).key, 'job_active', 'and it is the lit row');
    });

    ['received', 'notneeded'].forEach((auth) => {
      eq(byKey(run('funded', { svc: 'probate', executorAuth: auth }), 'job_active').state, 'current',
        `executorAuth=${auth} does not block`);
    });
    eq(byKey(run('funded', { svc: 'cleanout', executorAuth: 'pending' }), 'job_active').state, 'current',
      'a non-probate service is never dragged into the executor gate');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  group('unscored rooms block the estimate reaching a manager, and say which');
  {
    const f = fixture('built');
    f.est.rooms.push({ name: 'Garage (2-car)', vol: 0, cplx: 0 });
    const rows = ctx.jobTimeline(f.job, f.rec, [], []);
    const row = byKey(rows, 'estimate_approved');
    eq(row.state, 'blocked', 'an unscored room blocks approval');
    has(row.blockedWhy, 'Garage (2-car)', 'and names the room');
    has(row.blockedWhy, '1 room still needs', 'in the singular when there is one');
    // The fix must mention the ✕ escape hatch: a room Havellin is not touching is
    // accounted for, not missing, and demanding a score for it is unsatisfiable —
    // setRoomState disables and clears vol/cplx on an excluded row.
    has(row.blockedFix, 'out of scope', 'the fix offers the ✕ route for a room we are not touching');

    // And an excluded room is not unscored. `unscoredRoomNames` skips r.excluded; the
    // rail must inherit that rather than re-deriving it.
    const g = fixture('built');
    g.est.rooms.push({ name: 'Guest Wing', vol: 0, cplx: 0, excluded: true });
    eq(byKey(ctx.jobTimeline(g.job, g.rec, [], []), 'estimate_approved').state, 'current',
      'a room marked out of scope does not block');

    // Submitted and denied both surface, and neither is a blocker.
    const sub = fixture('built');
    sub.rec.submitted = true;
    eq(byKey(ctx.jobTimeline(sub.job, sub.rec, [], []), 'estimate_approved').sub,
      'Submitted — waiting on a manager PIN', 'a submitted estimate says what it waits on');
    const den = fixture('built');
    den.est.denyReason = 'Crew size looks light'; den.est.deniedBy = 'Ashley';
    has(byKey(ctx.jobTimeline(den.job, den.rec, [], []), 'estimate_approved').sub,
      'Denied by Ashley — Crew size looks light', 'a denied estimate carries the reason and who');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  group('money — a short payment reads short, never unpaid');
  {
    // Payments are a list precisely so a part payment stays visibly part paid. An
    // elderly client writing a cheque for less than the full 50% is the normal case here.
    const f = fixture('agrSigned');
    f.job.payments = [{ id: 1, stage: 'deposit', amount: 5000, receivedOn: '2026-09-10' }];
    const rows = ctx.jobTimeline(f.job, f.rec, [], []);
    const row = byKey(rows, 'deposit_received');
    eq(row.done, false, '$5,000 against a $12,050 target is not funded');
    eq(row.state, 'current', 'so the deposit is still the live step');
    has(row.sub, 'Part paid — $5,000 of $12,050', 'and the rail says exactly how short');

    // The 1% tolerance absorbs bank rounding.
    const near = fixture('agrSigned');
    near.job.payments = [{ id: 1, stage: 'deposit', amount: 12000, receivedOn: '2026-09-10' }];
    eq(byKey(ctx.jobTimeline(near.job, near.rec, [], []), 'deposit_received').done, true,
      'within 1% of target counts as funded');

    // The three payment rows carry the 50/25/25 split off the approved total.
    const full = run('funded');
    eq(byKey(full, 'deposit_received').amount, 12050, 'deposit row carries 50%');
    eq(byKey(full, 'midpoint_received').amount, 6025, 'midpoint row carries 25%');
    eq(byKey(full, 'final_paid').amount, 6025, 'final row carries the balance');
    // No estimate, no amounts invented.
    eq(byKey(run('intake'), 'deposit_received').amount, null, 'no estimate means no dollar figure');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  group('a job that died collapses to one honest line');
  {
    // Neither `lost` nor `closed_retained` has an entry in JOB_TRANSITIONS, so there is
    // no next action to offer. Lighting a step would invite a click the state machine
    // refuses — the exact shape of a dead button.
    const lost = run('sent', { status: 'lost', won: false, lostReasonLabel: 'Went with a competitor', lostAt: '2026-09-12' });
    eq(lost.length, 1, 'a lost job renders one row');
    eq(lost[0].state, 'terminal', 'and it is terminal');
    eq(lost[0].label, 'Lost', 'labelled Lost');
    has(lost[0].sub, 'Went with a competitor', 'carrying the reason');
    eq(ctx.jobTimelineNext(lost), null, 'and nothing is lit');

    // ⚠ FOUND IN THE BROWSER, NOT HERE: `lostAt` is an ISO stamp while every other
    // milestone on the rail is yyyy-mm-dd, so handed over whole it rendered as
    // "2026-09-12T00:00:00Z" — on the single row a dead job shows.
    eq(lost[0].at, '2026-09-12', 'the terminal date is the date half of the ISO stamp');
    eq(lost[0].atKind, 'date', 'and is formatted like every other date on the rail');

    const ret = run('funded', { status: 'closed_retained', lostReasonLabel: 'Family withdrew' });
    eq(ret[0].label, 'Closed — deposit retained', 'a post-deposit death is labelled as such');
    has(ret[0].sub, '$12,050 retained', 'and states the money kept');

    // ⚠ ALSO FOUND IN THE BROWSER: a lost job still carried "⚠ Agreement not signed"
    // and "⚠ Deposit not received" chips. Those are ACTIVATION blockers, and a lost job
    // cannot be activated at all — JOB_TRANSITIONS has no entry for it — so they were an
    // instruction that cannot be followed, sitting beside a rail saying the job is over.
    has(src, "var _jtDead = (job.status === 'lost' || job.status === 'closed_retained');",
      'the chip row knows which statuses are terminal');
    has(src, 'if (blockers.length > 0 && !_jtDead && ',
      'and stands the blocker chips down on them');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  group('shape, grouping and the deliberate absences');
  {
    const rows = run('built');
    eq(rows.length, 14, 'fourteen milestones');
    eq(rows.map((r) => r.key).join(','),
      'intake,walkthrough,estimate_built,estimate_approved,estimate_sent,client_accepted,'
      + 'agreement_approved,agreement_sent,agreement_signed,deposit_received,job_active,'
      + 'midpoint_received,work_complete,final_paid',
      'in the order the work actually happens');
    eq([...new Set(rows.map((r) => r.group))].join(' · '),
      'Set up · Estimate · Acceptance · Agreement · Deposit & start · Work · Close-out',
      'under seven groups, each contiguous');

    // ⚠ THE INVOICE-SENT ROWS ARE ABSENT ON PURPOSE. Nothing records that an invoice was
    // sent — midpointInvoiceSent is a self-attested Job Plan checkbox with no who and no
    // when, and the deposit and final have no field at all. A row whose `done` cannot be
    // answered honestly would read as a milestone while being a guess.
    ok(!rows.some((r) => /invoiced|invoice_sent/.test(r.key)),
      'no invoice-sent row exists until a real send record backs one');
    lacks(jtBody, 'midpointInvoiceSent', 'and the rail never reads the self-attested checkbox');

    eq(ctx.jobTimeline(null, null, [], []).length, 0, 'no job renders no rail');
    rows.forEach((r) => {
      ok(typeof r.key === 'string' && r.key.length > 0, `${r.key}: has a key`);
      ok(['done', 'current', 'blocked', 'waiting', 'terminal'].indexOf(r.state) >= 0, `${r.key}: state is one of the five`);
      ok(r.blockedFix === '' || r.blockedWhy !== '', `${r.key}: never offers a fix without naming the problem`);
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  group('the derivation is DOM-free — the tests read the real thing');
  {
    ['document.', 'getElementById', 'innerHTML', 'querySelector'].forEach((needle) => {
      lacks(jtBody, needle, `jobTimeline does not touch the DOM (${needle})`);
    });
    // One definition of "which step is live", so the pinned band and the rail can never
    // disagree about it.
    has(src, 'function jobTimelineNext(rows)', 'jobTimelineNext is the single definition');
    const renderer = src.slice(src.indexOf('function renderClientDashboard(jobId)'));
    eq((renderer.slice(0, renderer.indexOf('\nfunction ')).match(/jobTimelineNext\(/g) || []).length, 1,
      'and the renderer calls it exactly once rather than re-deriving the live row');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  group('the cold-cache and remote-approval redraws');
  {
    // loadEstimateState hydrates from localStorage synchronously and then fetches. On a
    // device with no cache estimateStore is {} at first paint, so four of the rail's rows
    // read undone on a job that has a priced estimate. _estStoreLanded is what corrects
    // it — and the dashboard was not in its list. Same shape as the 2026-08-24 Job Plan
    // bug: render before the data, never re-render after.
    // ⚠ These pinned the inline redraw BYTE SEQUENCE, and Slice 1 folded three copies
    // of it into one `_dashRedraw`. A true statement about a requirement should not
    // break because a line moved — this file has paid for that twice. So they state the
    // requirement: there is ONE redraw, it is properly guarded, and every surface that
    // has to correct the drilldown calls it.
    const redraw = body('_dashRedraw(jobId)');
    has(redraw, "getElementById('client-dashboard-view')", '_dashRedraw checks the drilldown is open');
    has(redraw, "style.display === 'none'", 'and that it is actually visible');
    has(redraw, '_dashboardJobId !== jobId', 'and refuses to redraw a job that is not the one open');
    has(redraw, 'renderClientDashboard(_dashboardJobId)', 'then redraws it');

    has(body('_estStoreLanded()'), '_dashRedraw()', '_estStoreLanded corrects the drilldown on a cold cache');
    has(body('approvalWatchTick(jobId)'), '_dashRedraw(jobId)', 'approvalWatchTick corrects it on a remote approval');

    // Every writer the rail can now fire has to land its result on the rail. Before
    // Slice 1 not one of them knew the drilldown existed.
    [['checkPin()', 'the estimate PIN'], ['checkAgrPin()', 'the agreement PIN'],
     ['markEstimateSent()', 'marking the estimate sent'], ['markAgreementSent()', 'marking the agreement sent'],
     ['markAgreementSigned()', 'recording the signature'], ['saveDeposit()', 'recording a payment'],
    ].forEach(([sig, what]) => {
      has(body(sig), '_dashRedraw(', `${what} redraws the drilldown`);
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  group('the rail has a stylesheet, and it is the tripwire for it');
  {
    // page-shell.test.js exists because 368 lines of CSS were deleted and shipped three
    // times with every other test green. The rail is the dashboard's primary surface now;
    // a rule of it going missing is the same silent class of failure.
    const styleOpen = src.indexOf('<style>');
    const css = src.slice(styleOpen, src.indexOf('</style>'));
    ['.jt{', '.jt-next{', '.jt-row{', '.jt-lbl{', '.jt-meta{', '.jt-sub{',
      '.jt-done{', '.jt-cur{', '.jt-blk{', '.jt-grp{', '.jt-term{'].forEach((rule) => {
      has(css, rule, `the rail's ${rule.slice(0, -1)} rule is present`);
    });
    // Every state the derivation can emit must have a class that paints it, or a row
    // silently renders as an ordinary one.
    has(src, "{done:'jt-done', current:'jt-cur', blocked:'jt-blk', waiting:'jt-wait', terminal:'jt-term'}",
      'all five states map to a class');
    has(css, '.jt-wait .jt-lbl{', 'including waiting');
    // Measured in Chromium: the blocked band painted the same tan as an ordinary NEXT
    // band, differing only by a word. A warning has to read as a warning — the standing
    // call on this file, made about the room-coverage badge.
    has(css, '.jt-next-blk{background:var(--err-bg);', 'a blocked NEXT band is painted as a warning');
    // ⚠ Measured at 1400px: `.jt-sub{flex-basis:100%}` without flex-wrap is not a line
    // break, it is a third item demanding the whole row — so every row carrying a sub
    // squeezed its own label ("Client accepted" rendered as "Client / accepted"). The
    // phone block's .card div{flex-wrap:wrap} only applies under 820px, which is why it
    // looked right at 390px and wrong on the desk.
    has(css, '.jt-row{display:flex;flex-wrap:wrap;', 'the row wraps, so a sub-line takes its own line');
    has(css, '.jt-lbl{flex:1 1 auto;min-width:0;', 'and the label takes the slack rather than shrinking');
    has(src, "'<div class=\"jt-next' + (_jtBlocked ? ' jt-next-blk' : '') + '\">'",
      'and the renderer puts the modifier on it');
  }
};
