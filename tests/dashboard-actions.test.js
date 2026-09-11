'use strict';
// SLICE 1 — acting on a job from the Client Dashboard (2026-09-10).
//
// ⚠⚠ THE DEFECT CLASS THIS SUITE EXISTS FOR, AND IT IS NOT A COSMETIC ONE.
// Every action the rail now fires was written when the ONLY way to reach it was to
// pick a job from a <select> on its own tab. So almost none of them takes a job id —
// they read a GLOBAL that the tab's own loader set:
//
//   checkPin · openDenyModal · openDiscountModal · markEstimateSent  →  currentEstimate
//   checkAgrPin                                                      →  currentAgrJobId
//   markAgreementSent · markAgreementSigned · openDepositModal        →  _agrJob() / #agr-job
//
// Fired from the drilldown with those globals holding ANOTHER job's values, the benign
// outcome is a silent no-op printed onto a panel you are not looking at. The malignant
// one is real and was reproduced in a browser before it was fixed: **`checkPin` approves
// whichever estimate happens to be loaded**, stamping an approver and a frozen lock
// snapshot onto the wrong client's job, and `saveDeposit` records a cheque against the
// wrong client. Both are silent and neither is recoverable by looking at the screen.
//
// So the load-bearing assertion in this file is not "the button works". It is **every
// handler primes before it acts**, and a new one that forgets fails the suite.

const { sandbox, source } = require('./harness');

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();

  // One function's source, bounded at the next top-level `function`.
  const body = (sig) => {
    const from = src.indexOf('function ' + sig);
    if (from < 0) return '';
    const rest = src.slice(from + 10);
    const end = rest.indexOf('\nfunction ');
    return end < 0 ? rest : rest.slice(0, end);
  };
  const noComments = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

  const ctx = sandbox({
    fns: ['jobTimeline', 'jobTimelineNext', 'jobTimelineActions', 'estimateSubmitBlocker',
      'estimateNoteGaps', 'paymentSplit', 'unscoredRoomNames', 'jobActivationBlockers',
      'isJobWon', 'isJobFunded', 'jobPayments', 'stagePaidTotal', 'depositPaidTotal',
      'depositTargetFor', 'agreementReady',
      'docSentAt', 'docDraftedAt', 'docKeyFor', '_jtSendAction', '_jtDocViews', '_jtDraftLink'],
    vars: ['JT_SHORT'],
    stubs: { REQUIRE_WALKTHROUGH_NOTES: false },
  });

  const room = (name, o) => Object.assign({ name, vol: 3, cplx: 3, note: 'seen' }, o || {});
  const EST = () => ({ rooms: [room('Kitchen'), room('Primary Bedroom')], havellinTotal: 24100, collections: [] });

  function fixture(over, recOver) {
    const job = Object.assign({ id: 7, name: 'Butler', created: 'Sep 8, 2026', svc: 'cleanout',
      status: 'new', walkthrough: '2020-01-01' }, over || {});
    const rec = Object.assign({ estimate: EST(), savedAt: 'Sep 8, 2026', approved: false, submitted: false }, recOver || {});
    // `{estimate: null}` is how a caller asks for a job with nothing built yet — the
    // default above supplies one, so without this the very first case silently tested
    // the row after the one it named.
    if (recOver && recOver.estimate === null) rec.estimate = null;
    ctx.estimateStore = { 7: rec }; ctx.jobs = [job];
    return { job, rec };
  }
  const railFor = (over, recOver) => {
    const f = fixture(over, recOver);
    const rows = ctx.jobTimeline(f.job, f.rec, [], []);
    return { rows, next: ctx.jobTimelineNext(rows), job: f.job, rec: f.rec };
  };
  const actFor = (over, recOver) => {
    const r = railFor(over, recOver);
    return { a: ctx.jobTimelineActions(r.next, r.job, r.rec), row: r.next, r };
  };

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ EVERY HANDLER PRIMES BEFORE IT ACTS — the wrong-job guarantee');
  {
    // Which global each handler's target reads, and therefore which primer it must run
    // FIRST. A handler that acts before priming acts on the previously-loaded job.
    const HANDLERS = [
      ['dashSubmitEstimate(jobId)',     '_primeEstimateFor(jobId)',  'submitForApproval'],
      ['dashApproveEstimate(jobId)',    '_primeEstimateFor(jobId)',  'openPinModal'],
      ['dashDenyEstimate(jobId)',       '_primeEstimateFor(jobId)',  'openDenyModal'],
      ['dashOfferDiscount(jobId)',      '_primeEstimateFor(jobId)',  'openDiscountModal'],
      ['dashMarkEstimateSent(jobId)',   '_primeEstimateFor(jobId)',  'markEstimateSent'],
      ['dashMarkAgreementSent(jobId)',  '_primeAgreementFor(jobId)', 'markAgreementSent'],
      ['dashMarkAgreementSigned(jobId)', '_primeAgreementFor(jobId)', 'markAgreementSigned'],
      ['dashRecordPayment(jobId, stage)', '_primeAgreementFor(jobId)', 'openDepositModal'],
    ];
    HANDLERS.forEach(([sig, primer, target]) => {
      const b = noComments(body(sig));
      ok(b.length > 0, `${sig} exists`);
      const iPrime = b.indexOf(primer);
      const iAct = b.indexOf(target + '(');
      ok(iPrime >= 0, `${sig} calls ${primer}`);
      ok(iAct >= 0, `${sig} calls ${target}`);
      ok(iPrime >= 0 && iAct >= 0 && iPrime < iAct, `${sig} primes BEFORE it calls ${target}`);
      // And it must not act anyway when the priming failed.
      ok(/if \(!_prime/.test(b), `${sig} refuses when the priming fails rather than acting on the last job`);
    });

    // The priming is synchronous and local. The tab loaders chain two cloud fetches and
    // assign the global in a callback — opening a PIN modal behind one is a race whose
    // loser is an approval on the wrong job.
    const pe = noComments(body('_primeEstimateFor(jobId)'));
    has(pe, 'estimateStore[jobId]', '_primeEstimateFor reads the local store');
    lacks(pe, 'refreshEstimateFromCloud', 'and never waits on a fetch');
    lacks(pe, 'loadClientEstimateFromSelect', 'nor on the tab loader');
    ['currentEstimate', 'estimateApproved', 'estimateSubmitted', 'discountRevision', 'approvedBy', 'approvedAt']
      .forEach((g) => has(pe, g + ' =', `_primeEstimateFor sets ${g}`));
    ok(/return null/.test(pe), 'and returns null when there is no saved estimate');

    // The agreement side runs the REAL loader rather than duplicating what it restores —
    // a second copy of that restore is how agrApproved drifts from job.agrApproved.
    const pa = noComments(body('_primeAgreementFor(jobId)'));
    has(pa, 'loadAgreement()', '_primeAgreementFor runs the real loader');
    has(pa, 'populateAgrSelect()', 'after making sure the option exists');
    ok(/return false/.test(pa), 'and reports failure when the job has no option');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ _agrJob — six functions resolve their job through it, none takes an id');
  {
    // markAgreementSent, markAgreementSigned, openDepositModal, onDepStageChange,
    // saveDeposit and updateDepModalHints. With the drilldown open its job WINS, because
    // #agr-job can be holding whatever was last picked days ago.
    const b = noComments(body('_agrJob()'));
    has(b, "getElementById('client-dashboard-view')", '_agrJob checks whether the drilldown is open');
    has(b, '_dashboardJobId', 'and resolves through it');
    const iDash = b.indexOf('_dashboardJobId');
    const iSel = b.indexOf("getElementById('agr-job')");
    ok(iDash >= 0 && iSel >= 0 && iDash < iSel, 'the drilldown wins over the Agreement tab select');

    // The requirement is not a count of who mentions the select — populateAgrSelect,
    // docPdf and docEmail legitimately WRITE to it. It is that everything which RESOLVES
    // a job for an agreement or payment action goes through the one resolver, so the
    // drilldown precedence above cannot be bypassed by re-inlining the read.
    ['markAgreementSent()', 'markAgreementSigned()', 'openDepositModal(stage)',
     'onDepStageChange()', 'saveDeposit()'].forEach((sig) => {
      const b = noComments(body(sig));
      has(b, '_agrJob()', `${sig} resolves its job through _agrJob`);
      lacks(b, "getElementById('agr-job')", `${sig} does not re-read the select itself`);
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ the agreement lost its manager PIN — what must NOT be lost with it');
  {
    // Anthony: *"once an estimate is approved by a manager and accepted by a client, a TC
    // should be able to send an agreement without further manager approval or emails …
    // there is literally no way to amend an agreement that comes out of the system."*
    // Right, and the reason it is safe: the commercial terms ARE the approved estimate,
    // attached as Exhibit A, and the document has no free-text field a manager could read
    // differently. Both facts needing a human were already captured by a named person.
    // What must survive is the GATE — the same two conditions — and the ATTRIBUTION.
    // ⚠ DRIVEN, NOT GREPPED. Source assertions that the body mentions `isJobWon` survive
    // an early `return ''` placed above them — an inserted early return removes the gate
    // entirely and left every one of them green. Caught by reverting. The gate is the one
    // thing that must not go with the PIN, so it is exercised, not read.
    ctx.estimateStore = { 10: { estimate: EST(), approved: true }, 11: { estimate: EST(), approved: false } };
    const J = (o) => Object.assign({ id: 10, svc: 'cleanout', status: 'new' }, o || {});
    eq(ctx.agreementReady(null, null), 'nojob', 'no job is refused rather than cleared');
    eq(ctx.agreementReady(J({ id: 11 }), null), 'estimate', 'an unapproved estimate blocks');
    eq(ctx.agreementReady(J({ id: 99 }), null), 'estimate', 'so does a job with no estimate at all');
    eq(ctx.agreementReady(J({ won: false }), null), 'notwon', 'an approved estimate the client has not accepted still blocks');
    eq(ctx.agreementReady(J({ won: true }), null), '', 'approved and accepted clears');
    // isJobWon's legacy fallback must not be a back door: status alone is not acceptance
    // on a job that has explicitly been marked not-won.
    eq(ctx.agreementReady(J({ won: false, status: 'active' }), null), 'notwon',
      'a withdrawn job does not clear on status alone');
    const ready = noComments(body('agreementReady(job, estRec)'));
    has(ready, 'isJobWon(job)', 'and it reads the same acceptance predicate as the rest of the app');

    const ensure = noComments(body('ensureAgreementApproved(jobId)'));
    has(ensure, 'agreementReady(job, null)', 'the stamp reads that one gate');
    has(ensure, 'if (blk) return blk', 'and refuses rather than stamping when it is not met');
    // ⚠ `_actor(job)` reads agrApprovedBy for agrSentBy, agrSignedBy, depositReceivedBy
    // AND deliveredBy. Losing the PIN must not leave all four blank — the manager who
    // approved the price is the named person who signed off on what this document says.
    has(ensure, 'job.agrApprovedBy = (rec && rec.approvedBy)', 'attribution falls to the estimate approver');
    has(ensure, "|| job.wonBy || job.tc || ''", 'with a real name behind that, never a blank');
    has(ensure, 'exportAgreementToDrive(jobId)', 'the agreement files itself on the stamp');
    has(ensure, 'exportSigningPacketToDrive(jobId)', 'and so does the signing packet');
    // ⚠ It files into a client's Drive folder off whatever the agreement panel holds.
    has(ensure, '_primeAgreementFor(jobId)', 'it primes that panel first');
    has(ensure, "return 'nojob'", 'and refuses if it cannot, rather than filing the wrong estate');

    // ⚠ EVERY DOOR INTO THE AGREEMENT STAMPS, AND SLICE 4 MOVED WHERE. It used to be the
    // first line of three separate functions; a fourth door was one line away from having
    // no stamp at all. It is `DOC_ACTIONS.agreement.commit` now — run by `docAction` on
    // every verb but 'view' — so a door cannot be opened without going through it.
    ['markAgreementSent()', 'generateStripeLink()'].forEach((sig) => {
      has(noComments(body(sig)), 'ensureAgreementApproved(', `${sig} stamps on the way through`);
    });
    ['emailAgreementToClient()', 'printAgreement()', 'printSigningPacket()'].forEach((sig) => {
      has(noComments(body(sig)), "docAction(", `${sig} goes through the one action`);
      lacks(noComments(body(sig)), 'ensureAgreementApproved(', `${sig} keeps no copy of the stamp`);
    });
    // ⚠ AND 'view' IS EXEMPT, WHICH IS THE HALF THAT IS EASY TO LOSE. Reading the draft
    // you are about to talk a client through is free — that is why it renders at all
    // times. Stamping on a read would file two documents into a client's Drive folder
    // because somebody looked at the contract.
    const da = noComments(body('docAction(jobId, kind, verb, opt)'));
    has(da, "if (verb !== 'view' && spec.cfg.commit && spec.cfg.commit(spec))",
      "docAction commits on every verb but 'view'");
    ok(da.indexOf('spec.cfg.blocker(spec)') < da.indexOf('spec.cfg.commit(spec)'),
      'and reads the gate before it stamps, never the other way round');
    has(src, 'commit: function (spec) { return ensureAgreementApproved(spec.job.id); },',
      'the agreement is the kind that carries a commit');
    eq((src.match(/    commit: function \(spec\)/g) || []).length, 1,
      'and the only one — a second would be a second rule about when a document commits');

    // The tab reads readiness, not the stamp — a job that is ready but has not been acted
    // on yet would otherwise show no buttons at all.
    has(noComments(body('updateAgrUI()')), 'var _ready = !agreementReady(_agrJ, null);',
      'updateAgrUI reads readiness rather than the stamp');
    has(noComments(body('updateAgrUI()')), "(_ready && !_sent)", 'and gates its steps on it');

    // The PIN and its internal notification are gone, not disabled.
    lacks(src, 'function checkAgrPin(', 'the PIN handler is deleted');
    lacks(src, 'agr-pin-modal', 'its modal markup with it');
    lacks(src, 'Agreement Approved &amp; Ready to Send', 'and the internal notify-the-manager email');
    // ⚠ But the CC to agreements@ on what the CLIENT is sent is a different thing and
    // stays: that is the firm's own record of what went out, and it was a defect that it
    // was ever missing.
    has(src, "cc: function () { return DEPT_EMAILS.agreements; },",
      'the client-facing send still copies agreements@');
    // It is the registry that carries it now, and `docSend` reads `spec.cfg.cc()` — so
    // every document CCs the department that owns it, by construction. The estimate has
    // always CC'd estimates@ and the agreement never did, which was the defect.
    has(src, 'to: spec.to, cc: spec.cfg.cc(),', 'through the one send path, which reads the registry');
    ['estimates', 'agreements', 'billing'].forEach((d) =>
      has(src, `cc: function () { return DEPT_EMAILS.${d}; },`, `${d}@ is CC'd on its own document`));
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('estimateSubmitBlocker — one rule, and the caller decides where it prints');
  {
    // ⚠ All three refusals printed to showFB('e-fb', …), and #e-fb lives inside
    // #panel-estimate — a panel neither the Client Estimate tab nor the drilldown is
    // showing. A refusal fired from either landed in the DOM and was seen by nobody,
    // which is precisely what makes a button look dead.
    eq(ctx.estimateSubmitBlocker(EST()), null, 'a complete estimate has no blocker');
    eq(ctx.estimateSubmitBlocker(null).code, 'noest', 'no estimate at all');
    eq(ctx.estimateSubmitBlocker({ havellinTotal: 0, rooms: [] }).code, 'noest', 'nor a zero total');

    const half = EST(); half.rooms.push({ name: 'Garage (2-car)', vol: 0, cplx: 0, note: 'x' });
    const blk = ctx.estimateSubmitBlocker(half);
    eq(blk.code, 'unscored', 'an unscored room blocks');
    has(blk.msg, 'Garage (2-car)', 'and the message names it');

    // An excluded room is a decision, not a gap — inherited from unscoredRoomNames.
    const exc = EST(); exc.rooms.push({ name: 'Guest Wing', vol: 0, cplx: 0, excluded: true });
    eq(ctx.estimateSubmitBlocker(exc), null, 'a room marked out of scope does not block');

    // Notes are soft by default and hard only when Settings says so.
    const noNote = EST(); noNote.rooms[0].note = '';
    eq(ctx.estimateSubmitBlocker(noNote), null, 'a missing note is not a blocker by default');
    const strict = sandbox({ fns: ['estimateSubmitBlocker', 'estimateNoteGaps', 'unscoredRoomNames'],
      stubs: { REQUIRE_WALKTHROUGH_NOTES: true } });
    eq(strict.estimateSubmitBlocker(noNote).code, 'notes', 'and is one when the Settings requirement is on');
    eq(ctx.estimateNoteGaps(noNote), ['Kitchen'], 'the gap list names the room');

    // submitForApproval reads it rather than re-testing, and hands it back so a caller
    // on another surface can print it where the person actually is.
    const sub = noComments(body('submitForApproval(opts)'));
    has(sub, 'estimateSubmitBlocker(currentEstimate)', 'submitForApproval reads the one rule');
    has(sub, 'return blk', 'and returns the blocker');
    has(sub, 'opts.silent', 'and can be told not to print it itself');
    has(sub, 'return null', 'returning null on success');
    // The soft confirm stays out of the blocker: a question is not a blocker, and the
    // blocker function has to be answerable with no user present.
    lacks(noComments(body('estimateSubmitBlocker(est)')), 'confirm(', 'the blocker never asks a question');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('jobTimelineActions — one primary per live step, and it is the right one');
  {
    const cases = [
      [{}, { estimate: null }, 'Build the estimate', 'dashGoEstimate(7)'],
      [{}, { estimate: EST() }, 'Submit for approval', 'dashSubmitEstimate(7)'],
      [{ status: 'pending' }, { estimate: EST(), submitted: true }, 'Manager approval', 'dashApproveEstimate(7)'],
      // ⚠ SLICE 4: EVERY DOCUMENT ROW'S PRIMARY IS NOW SEND, and it is the same control
      // in the same place on all five. "Mark as sent" was a book-keeping tick beside a
      // document you had to go to another tab to actually send; the tick survives as the
      // SECOND state of this button, for the interval between a Gmail draft being created
      // and a person pressing send in Gmail.
      [{ approved: true }, { estimate: EST(), approved: true }, '&#9993; Send estimate', "docAction(7,'estimate','send')"],
      [{ approved: true, estimateSentDate: 'Sep 8, 2026' }, { estimate: EST(), approved: true },
        '&#10003; Client accepted — mark won', 'openWonModal(7)'],
      // ⚠ No 'Approve agreement' step: it is stamped as a side effect of the first print
      // or send now, so a won job goes straight to sending the packet.
      [{ approved: true, estimateSentDate: 'Sep 8, 2026', won: true }, { estimate: EST(), approved: true },
        '&#9993; Send signing packet', "docAction(7,'agreement','send')"],
      [{ approved: true, estimateSentDate: 'Sep 8, 2026', won: true, agrApproved: true, agrSent: true },
        { estimate: EST(), approved: true }, '&#10003; Record signature received', 'dashMarkAgreementSigned(7)'],
      // ⚠ ASKING FOR THE MONEY AND RECEIVING IT ARE TWO STEPS NOW. A signed agreement's
      // next move is sending the deposit invoice; the payment recorder is the row below.
      [{ approved: true, estimateSentDate: 'Sep 8, 2026', won: true, agrApproved: true, agrSent: true, agrSigned: true },
        { estimate: EST(), approved: true }, '&#9993; Send deposit invoice', "docAction(7,'invoice','send',{stage:'deposit'})"],
      [{ approved: true, estimateSentDate: 'Sep 8, 2026', won: true, agrApproved: true, agrSent: true, agrSigned: true,
        docState: { 'invoice:deposit': { draftedAt: '2026-09-11T10:00:00Z', sentAt: '2026-09-11T10:05:00Z' } } },
        { estimate: EST(), approved: true }, '&#10003; Record payment', "dashRecordPayment(7,'deposit')"],
      // The one interval the confirming tap exists for: a draft is written, nothing has
      // gone out, and `gmail.compose` cannot send it — only a person can.
      [{ approved: true, estimateSentDate: 'Sep 8, 2026', won: true, agrApproved: true, agrSent: true, agrSigned: true,
        docState: { 'invoice:deposit': { draftedAt: '2026-09-11T10:00:00Z' } } },
        { estimate: EST(), approved: true }, '&#10003; I&rsquo;ve sent it', "markDocSent(7,'invoice:deposit')"],
    ];
    cases.forEach(([j, r, label, call]) => {
      const { a, row } = actFor(j, r);
      eq(a.primary && a.primary.label, label, `${row.key}: the primary reads "${label}"`);
      eq(a.primary && a.primary.call, call, `${row.key}: and calls ${call}`);
    });

    // Deny sits beside Manager Approval, and is marked as the destructive one.
    const sub = actFor({ status: 'pending' }, { estimate: EST(), submitted: true });
    eq(sub.a.secondary.map((x) => x.call), ['dashDenyEstimate(7)'], 'Deny is offered beside the PIN');
    ok(sub.a.secondary[0].danger, 'and is marked destructive');
    const won = actFor({ approved: true, estimateSentDate: 'x' }, { estimate: EST(), approved: true });
    ok(won.a.secondary.some((x) => x.call === 'openCloseoutModal(7)'), 'Mark lost sits beside Mark won');

    // ⚠ A blocked estimate points at where the fix is, rather than at nothing.
    const halfRec = { estimate: EST(), approved: false };
    halfRec.estimate.rooms.push({ name: 'Garage (2-car)', vol: 0, cplx: 0, note: 'x' });
    const blocked = actFor({}, halfRec);
    eq(blocked.row.state, 'blocked', 'the estimate-approved row is blocked');
    eq(blocked.a.primary.call, 'dashGoEstimate(7)', 'and its button opens Build Estimate, where the scores are');

    // ⚠ A blocked ACTIVATION has no button: the fix is a phone call to the executor, and
    // a button that alerts the same blocker back at you is worse than none.
    const auth = actFor({ approved: true, estimateSentDate: 'x', won: true, agrApproved: true, agrSent: true,
      agrSigned: true, depositReceived: true, svc: 'contested_probate', executorAuth: 'pending',
      docState: { 'invoice:deposit': { draftedAt: 'x', sentAt: '2026-09-11T10:05:00Z' } },
      payments: [{ id: 1, stage: 'deposit', amount: 12050 }] }, { estimate: EST(), approved: true });
    eq(auth.row.key, 'job_active', 'the activation row is the live one');
    eq(auth.row.state, 'blocked', 'and it is blocked');
    eq(auth.a.primary, null, 'with no button — the fix is off-app');

    // Out-of-sequence actions, and the one rule that keeps them safe.
    const railDone = railFor({ approved: true, estimateSentDate: 'x' }, { estimate: EST(), approved: true });
    const intake = ctx.jobTimelineActions(railDone.rows[0], railDone.job, railDone.rec);
    eq(intake.secondary.map((x) => x.call), ['dashEditClient(7)'], 'Edit client is always available');
    const built = railDone.rows.filter((r) => r.key === 'estimate_built')[0];
    ok(ctx.jobTimelineActions(built, railDone.job, railDone.rec).secondary.length === 1,
      'Edit estimate is offered while the client has not signed');
    // ⚠ updateApprovalUI hides Edit Estimate on agrSigned because the signature IS the
    // lock. A second door into the same edit that ignored that would be a way around it.
    const signedRail = railFor({ approved: true, estimateSentDate: 'x', won: true, agrApproved: true,
      agrSent: true, agrSigned: true }, { estimate: EST(), approved: true });
    const builtSigned = signedRail.rows.filter((r) => r.key === 'estimate_built')[0];
    eq(ctx.jobTimelineActions(builtSigned, signedRail.job, signedRail.rec).secondary, [],
      'and withdrawn the moment the client signs');
    const sentSigned = signedRail.rows.filter((r) => r.key === 'estimate_sent')[0];
    // ⚠ Offer discount is withdrawn on a signed job — a signed price is not re-negotiated
    // from here. View and Print are NOT withdrawn: reading a document you have already
    // sent is always safe, and it is the point of Slice 3 that every document stays
    // readable from the client it belongs to.
    const sentSignedActs = ctx.jobTimelineActions(sentSigned, signedRail.job, signedRail.rec).secondary;
    ok(!sentSignedActs.some((a) => /Offer discount/.test(a.label)), 'Offer discount is withdrawn once signed');
    ok(sentSignedActs.some((a) => a.call.indexOf("'estimate','view'") >= 0), 'but the estimate stays readable');
    ok(sentSignedActs.some((a) => a.call.indexOf("'estimate','print'") >= 0), 'and printable');

    // A dead job offers nothing.
    const lost = railFor({ status: 'lost', lostReasonLabel: 'Went elsewhere' }, { estimate: EST() });
    eq(lost.next, null, 'a lost job lights nothing');
    eq(ctx.jobTimelineActions(lost.rows[0], lost.job, lost.rec).primary, null, 'and offers no action');

    // DOM-free, like the derivation it serves.
    ['document.', 'getElementById', 'innerHTML'].forEach((n) =>
      lacks(noComments(body('jobTimelineActions(row, job, estRec)')), n, `jobTimelineActions is DOM-free (${n})`));
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('all the client information is in ONE block, above the timeline');
  {
    // Anthony: *"put the first screenshot's info under the second screenshot's info,
    // below the Won, Estate Settlement, premium estate chips so all of the client info is
    // at the top."* It sat in its own card UNDER the rail, so "who is this and what is the
    // property" was below the fold and on the far side of the one thing you scroll past —
    // and two cards describing one client is two places to look for one answer.
    const rc = body('renderClientDashboard(jobId)');
    const chips = rc.indexOf("close chip row");
    const grid = rc.indexOf("h += '<div class=\"d-grid4\">';");
    const slot = rc.indexOf('<!--TIMELINE_SLOT-->');
    ok(chips > -1 && grid > -1 && slot > -1, 'the three landmarks exist');
    ok(chips < grid, 'the detail grid comes after the chips');
    ok(grid < slot, 'and BEFORE the timeline, which is the whole point');
    // One card, so one `</div>` closes it after the detail rather than before.
    has(rc, "h += '</div>';   // close the detail block", 'the detail is inside the card');
    has(rc, "h += '</div>';   // close client info card", 'which closes after it');
    // ⚠ The generic heading went with the move — the client's own name heads the card
    // now, and a heading that restates what the reader can already see is the standing
    // copy rule this file keeps.
    lacks(rc, "sectionHdr('Client & Property')", 'no generic heading over the client’s own name');
    // The intake answers stay at the foot of that block: this is where the job is prepped,
    // so it is where a missing answer is still cheap to go back and get.
    ok(rc.indexOf('standingFlagsBlock(job)') > grid, 'the intake brief stays with the client block');
    ok(rc.indexOf('standingFlagsBlock(job)') < slot, 'and above the timeline with it');
    // One slot, emitted once and replaced once.
    eq((rc.match(/<!--TIMELINE_SLOT-->/g) || []).length, 2, 'one slot: emitted, then replaced');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('the primary button is drawn in the band and nowhere else');
  {
    // The lit row and the band are the SAME step, so drawing the button on both puts the
    // same control on screen twice — and two identical buttons make you check which is
    // the real one. The rail stays a status read.
    const rc = body('renderClientDashboard(jobId)');
    has(rc, 'jt-btn jt-btn-p', 'the band draws the primary');
    eq((rc.match(/jt-btn-p/g) || []).length, 1, 'exactly one primary button site');

    // ⚠ The out-of-sequence actions used to hang off their own row, which the horizontal
    // track has no room for and which scattered them down the vertical rail. They are
    // ONE deduped strip now, serving both layouts — so an action appears once on screen
    // whichever layout is showing, and the primary is still only ever in the band.
    has(rc, 'jt-quick', 'the secondaries live in a single strip');
    // ⚠ `has(rc, '_qaSeen[a.call]')` matched the ASSIGNMENT on the next line, so this
    // could not fail with the guard removed. Assert the guard itself.
    has(rc, 'if (_qaSeen[a.call]) return;', 'deduped by call, so one action cannot render twice');
    has(rc, "if (r.state === 'current' || r.state === 'blocked') return;",
      'and the lit row is skipped — its buttons are already in the band');
    eq((rc.match(/jt-ghost/g) || []).length, 1, 'exactly one ghost-button site');
    // ⚠ Labels carry HTML entities and are app constants, never user input. Escaping
    // them a second time is what printed `&amp;amp;` on a client's screen once already.
    lacks(rc, 'esc(_jtA.primary.label)', 'a button label is not double-escaped');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('feedback reaches the surface the person is actually looking at');
  {
    // agr-fb, dep-fb and e-fb all live inside panels the drilldown hides.
    const t = noComments(body('_dashFbTarget(fallbackId)'));
    has(t, "'dash-fb'", '_dashFbTarget redirects to the drilldown strip');
    has(t, "getElementById('dash-fb')", 'but only when that strip actually exists');
    has(t, 'return fallbackId', 'and falls back to the tab strip otherwise');

    ['markAgreementSent()', 'markAgreementSigned()', 'openDepositModal(stage)', 'saveDeposit()'].forEach((sig) => {
      const b = noComments(body(sig));
      eq((b.match(/showFB\('agr-fb'/g) || []).length, 0,
        `${sig} routes every message through _dashFbTarget, confirmations included`);
      has(b, "_dashFbTarget('agr-fb')", `${sig} uses the redirect`);
    });
    // ⚠ The confirmations were left on the bare id in the first pass, so from the
    // drilldown a refusal was visible and the "it worked" was not — the more confusing
    // half of the two.
    has(body('markAgreementSent()'), "_dashFbTarget('agr-fb'),'ok'", 'the sent confirmation reaches the drilldown');
    has(body('markAgreementSigned()'), "_dashFbTarget('agr-fb'),'ok'", 'so does the signature confirmation');


    // ⚠ The handlers must NOT re-check gates their target already enforces.
    ['dashMarkAgreementSent(jobId)', 'dashMarkAgreementSigned(jobId)'].forEach((sig) => {
      const b = noComments(body(sig));
      lacks(b, 'agrApproved', `${sig} does not keep a second copy of the gate`);
      lacks(b, 'agrSent', `${sig} leaves the rule where it is enforced`);
    });

    // showFB did getElementById(id).innerHTML with no guard. It is called from functions
    // reachable from more than one surface now, and a TypeError mid-save is worse than a
    // message nobody sees.
    const fb = noComments(body('showFB(elId, type, msg)'));
    has(fb, 'if (!el) return', 'showFB survives a missing target');
    // `.a-info` is defined in the stylesheet and showFB's map never carried the key, so
    // every info alert in the file rendered as a warning.
    has(fb, "info:'a-info'", "showFB knows 'info'");
    has(src, '.a-info{background:var(--info-bg)', 'and the class it names exists');
    has(fb, 'if (e2)', 'including on the timer that clears it');
    has(noComments(body('populateAgrSelect()')), 'if (!sel) return', 'populateAgrSelect guards its select too');

    // The notice has to survive the innerHTML rewrite the redraw performs, and must not
    // outlive the client it was about.
    has(src, 'var _dashNotice = null;', 'the notice is module state, not DOM state');
    has(body('renderClientDashboard(jobId)'), '_dashNotice = null;', 'and is cleared once shown');
    has(body('openClientDashboard(jobId)'), '_dashNotice = null;', 'and again when another client is opened');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('openDepositModal takes the stage the row was pressed on');
  {
    const b = noComments(body('openDepositModal(stage)'));
    has(b, 'PAYMENT_STAGES.indexOf(stage) >= 0', 'a recognised stage is honoured');
    has(b, '_defaultPaymentStage(job)', 'and anything else falls back to the default');
    // Record Payment on the midpoint row must not land on deposit.
    has(body('jobTimelineActions(row, job, estRec)'), "dashRecordPayment(\" + id + \",'midpoint')",
      'the midpoint row asks for the midpoint stage');
    has(body('jobTimelineActions(row, job, estRec)'), "dashRecordPayment(\" + id + \",'final')",
      'and the final row for the final');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('the old tab-hopping submit is gone');
  {
    // dashboardSubmitForApproval submitted, then closed the drilldown and threw you onto
    // the Client Estimate tab — the behaviour this slice exists to remove. It also held
    // its own copy of the priming, which is what made the wrong-job hazard easy to miss:
    // it read as ceremony rather than as the thing standing between a PIN and the wrong
    // client's estimate.
    const b = noComments(body('dashboardSubmitForApproval(jobId)'));
    has(b, 'dashSubmitEstimate(jobId)', 'it delegates to the handler that stays put');
    lacks(b, 'closeClientDashboard', 'and no longer closes the drilldown');
    lacks(b, 'renderClientEstimate', 'nor renders another tab');
    lacks(b, 'currentEstimate =', 'nor keeps a second copy of the priming');
  }
};
