'use strict';
// ⚠⚠ A DELIVERED, PAID JOB COULD STILL BE MARKED LOST (2026-09-22).
//
// Anthony, off the client list: "after we won the client and have completed the job, the
// 'x' at the end of the client record in client dashboard should be deactivated b/c this
// is the lost button, which is rightly there during the course of the job b/c the client
// could cancel mid-job, but once the final invoice is paid, it should not be there."
//
// ⚠ HE IS RIGHT, AND THE BLAST RADIUS IS WORSE THAN A STRAY BUTTON. `confirmMarkLost`
// flips the job to `lost` or `closed_retained`, sets `won = false` on the first, writes
// `lostReason` / `lostAt` / `lostEst`, and EVERY filter predicate in `renderJobs` excludes
// `status === 'lost'` — so one press on a finished engagement drops it off the client list
// entirely AND out of the Win/Loss won count, with nothing on screen saying where it went.
//
// ⚠ THE PREDICATE ORs RATHER THAN ANDs, AND THAT IS THE DECISION. `deliveredOn` (write-once,
// stamped by `applyJobTransition` on the first close) and a recorded final payment are each
// sufficient on their own. Requiring BOTH would leave the delivered-but-unpaid job exposed —
// which is exactly the case where the wrong record is most tempting ("they won't pay, mark
// it lost") and most false: the work was done, so it is a collections matter, and
// `closed_retained` would assert we kept the deposit and walked away.
//
// ⚠ AND THE FINAL CAN BE PAID WHILE THE JOB IS STILL `active`, before anybody presses
// Close — so the status alone is not the test. `finPaid > 0` is the rail's own definition
// of its `final_paid` milestone, read rather than re-derived.

const { sandbox, domStub, source, fn } = require('./harness');

module.exports = function ({ group, ok, eq, has, lacks }) {

// ⚠ renderJobs grew the Win / Loss row, the sortable header and the shared status cell on
// 2026-09-23. They are LIFTED, never stubbed: a stub of the sort or of the status vocabulary is
// exactly what would let the list this suite reads drift from the one a person sees.
const RENDER_FNS = ['renderJobs', 'fmt', 'jobIsSettled', 'stagePaidTotal', 'jobPayments',
  'houseFlagSummary', 'activeHouseFlags', 'houseFlagsOf', 'svcLabelOf',
  'maybeStartJobsWatch', 'stopJobsWatch',
  'sortJobsForList', 'jobsHeadHtml', '_jobStatusCell', 'esc', 'jobsUnread', 'jobsUnreadNotice',
  'renderWinLoss', 'winLossBlockHtml', 'winLossFigures', 'winLossListHtml', '_wlClientCell',
  'isJobWon', 'secCaret', 'fmtDate2'];
const RENDER_VARS = ['currentFilter', 'HOUSE_FLAGS', 'FIREARMS_PROTOCOL_DOC', 'SVC_LABELS', '_jobsWatch',
  '_jobsState', '_jobSort', '_wlOpen', 'JOB_SORTS', 'JOB_LIST_COLS', 'JOB_STATUS_ORDER',
  'JOB_STATUS_LABELS', 'JOB_STATUS_DOT', 'WON_METHOD_LABELS'];

function job(over) {
  return Object.assign({
    id: 7, name: 'Butler Estate', svc: 'cleanout', status: 'active', won: true,
    havellinEst: 19940, start: '2026-09-01',
  }, over || {});
}

// Drive the REAL renderer and read the markup back. A source check cannot tell a rendered
// control from a withheld one — this project records that trap over and over — so every
// claim about the button is made against what `#jobs-body` actually received.
function renderRow(j, filter) {
  const doc = domStub({});
  const ctx = sandbox({ fns: RENDER_FNS, vars: RENDER_VARS, stubs: { document: doc } });
  ctx.jobs = [j];
  ctx.currentFilter = filter || 'all';
  ctx.renderJobs();
  return doc.getElementById('jobs-body').innerHTML;
}

function openModal(j) {
  const doc = domStub({});
  const alerts = [];
  const ctx = sandbox({
    fns: ['openCloseoutModal', 'jobIsSettled', 'stagePaidTotal', 'jobPayments'],
    stubs: { document: doc, alert: (m) => alerts.push(String(m)) },
  });
  ctx.jobs = [j];
  ctx.closeoutJobId = 0;
  ctx.openCloseoutModal(j.id);
  return { alerts, bound: ctx.closeoutJobId, shown: doc.getElementById('closeout-modal').style.display };
}

// ── the predicate ────────────────────────────────────────────────────────────
group('jobIsSettled — what counts as the end of an engagement');
{
  const ctx = sandbox({ fns: ['jobIsSettled', 'stagePaidTotal', 'jobPayments'] });
  const settled = ctx.jobIsSettled;

  eq(settled(job()), false, 'an ordinary active job is not settled');
  eq(settled(job({ status: 'won' })), false, 'a won job that has not started is not settled');
  eq(settled(job({ status: 'pending' })), false, 'a job awaiting manager approval is not settled');

  eq(settled(job({ deliveredOn: '2026-09-20' })), true, 'delivered alone settles it');
  eq(settled(job({ payments: [{ stage: 'final', amount: 4985 }] })), true,
    'a recorded final payment alone settles it');
  eq(settled(job({ deliveredOn: '2026-09-20', payments: [{ stage: 'final', amount: 4985 }] })), true,
    'both together, obviously');

  // ⚠ THE OR IS THE POINT AND THIS IS THE CASE THAT PROVES IT. A delivered job whose final
  // invoice is outstanding is NOT a job we lost.
  eq(settled(job({ status: 'closed', deliveredOn: '2026-09-20', payments: [{ stage: 'deposit', amount: 9970 }] })), true,
    'delivered with the final still outstanding is settled — that is collections, not a loss');

  // ⚠ AND THE CONVERSE, or this becomes a gate that fires on every funded job. A deposit
  // and a midpoint are money on a job still running.
  eq(settled(job({ payments: [{ stage: 'deposit', amount: 9970 }, { stage: 'midpoint', amount: 4985 }] })), false,
    'deposit and midpoint money do not settle a job — the work is still going on');

  eq(settled(job({ payments: [{ stage: 'final', amount: 0 }] })), false,
    'a zero-amount final record is not a payment');
  eq(settled(null), false, 'no job answers false rather than throwing');
  eq(settled(undefined), false, 'undefined answers false');

  // ⚠ `completionDate` IS THE INTAKE TARGET AND IS WRITTEN BY NOTHING. Reading it would
  // settle a job on a date somebody typed on the first phone call.
  eq(settled(job({ completionDate: '2026-09-20' })), false,
    'the intake target date is not a delivery stamp');
  lacks(fn('jobIsSettled'), 'completionDate', 'the predicate never reads the intake target');

  // It asks the rail's own definition of final money rather than keeping a second copy.
  has(fn('jobIsSettled'), "stagePaidTotal(job, 'final')", 'final money comes from stagePaidTotal');
  lacks(fn('jobIsSettled'), 'jobPaidTotal', 'never the all-stages total, which a deposit alone would trip');
}

// ── the button ───────────────────────────────────────────────────────────────
group('the ✕ is withheld on a settled job and present on a live one');
{
  const live = renderRow(job());
  has(live, 'openCloseoutModal(7)', 'a live job still offers the close-out control');
  has(live, 'Close out / mark lost', 'and it is the mark-lost control');
  has(live, 'openClientDashboard(7)', 'Open → is there either way');

  const delivered = renderRow(job({ status: 'closed', deliveredOn: '2026-09-20' }));
  lacks(delivered, 'openCloseoutModal', 'a delivered job renders NO close-out button');
  lacks(delivered, 'Close out / mark lost', 'and no title naming it');
  has(delivered, 'openClientDashboard(7)', 'the row is otherwise untouched — Open → survives');
  has(delivered, 'Butler Estate', 'and the job is still listed, not hidden');

  const paid = renderRow(job({ payments: [{ stage: 'final', amount: 4985 }] }));
  lacks(paid, 'openCloseoutModal', 'a final payment withdraws it even while the job reads active');

  // ⚠ THE CONVERSE, and it is the half that stops this becoming a cull: a funded job
  // mid-engagement must keep the button, because a client really can cancel mid-job.
  const funded = renderRow(job({ depositReceived: true, payments: [{ stage: 'deposit', amount: 9970 }] }));
  has(funded, 'openCloseoutModal(7)', 'a funded, active job keeps it — mid-job cancellation is real');

  const midway = renderRow(job({ payments: [{ stage: 'deposit', amount: 9970 }, { stage: 'midpoint', amount: 4985 }] }));
  has(midway, 'openCloseoutModal(7)', 'past the midpoint it is still offered');

  // ⚠ HIDDEN RATHER THAN DISABLED, and the test says which. A control that refuses the
  // same blocker back at you is worse than none, and on a finished job the absence
  // explains itself.
  lacks(delivered, 'disabled', 'it is withheld, not rendered disabled');
}

// ── the handler ──────────────────────────────────────────────────────────────
group('openCloseoutModal refuses a settled job, so the button cannot be reached around');
{
  const liveOpen = openModal(job());
  eq(liveOpen.alerts.length, 0, 'a live job opens with no refusal');
  eq(liveOpen.bound, 7, 'and binds the job id');
  eq(liveOpen.shown, 'flex', 'and shows the modal');

  const dead = openModal(job({ id: 7, status: 'closed', deliveredOn: '2026-09-20' }));
  eq(dead.alerts.length, 1, 'a delivered job is refused');
  eq(dead.bound, 0, 'nothing is bound, so a stray Confirm cannot land on it');
  ok(dead.shown !== 'flex', 'and the modal never opens');
  has(dead.alerts[0], 'cannot be marked lost', 'the refusal says what it will not do');
  has(dead.alerts[0], 'delivered', 'and why');
  has(dead.alerts[0], 'collections', 'and names what an outstanding final actually is');

  const paidOnly = openModal(job({ id: 7, payments: [{ stage: 'final', amount: 4985 }] }));
  eq(paidOnly.alerts.length, 1, 'a final payment refuses it too');
  has(paidOnly.alerts[0], 'final payment is recorded', 'and the wording names the payment when there is one');

  // ⚠ The delivered-but-unpaid refusal must NOT claim a payment that is not there.
  lacks(dead.alerts[0], 'final payment is recorded',
    'a delivered job with no final payment is not told one was recorded');

  // The gate is the shared predicate at both ends, never a second copy of the rule.
  has(fn('openCloseoutModal'), 'jobIsSettled(j)', 'the handler asks the shared predicate');
  has(source().slice(source().indexOf('// action buttons vary by status')),
    'if (!jobIsSettled(j)) actions +=', 'and so does the renderer');
  lacks(fn('openCloseoutModal'), 'deliveredOn',
    'the handler holds no copy of what settled means');
}

// ── what this deliberately does NOT touch ────────────────────────────────────
group('⚠ WHAT THE GATE MUST NOT REACH');
{
  // A job already marked lost or closed-with-deposit-retained KEEPS the control. The modal
  // prefills `lostReason` / `lostNote` precisely so a reason can be amended, and taking the
  // button away would remove the only route to that correction. They are not `settled` —
  // neither carries a delivery stamp or a final payment — and a test says so rather than
  // leaving it to a later tidy-up.
  const ctx = sandbox({ fns: ['jobIsSettled', 'stagePaidTotal', 'jobPayments'] });
  eq(ctx.jobIsSettled(job({ status: 'lost', won: false, lostReason: 'price' })), false,
    'a lost job is not settled — the reason must stay amendable');
  eq(ctx.jobIsSettled(job({ status: 'closed_retained', depositReceived: true,
    payments: [{ stage: 'deposit', amount: 9970 }] })), false,
    'closed — deposit retained is not settled either; no delivery, no final payment');

  // ⚠ MY FIRST VERSION OF THIS CHECK WAS WRONG AND THE CODE WAS RIGHT. A `lost` job is
  // not in the default list at all — every filter predicate in `renderJobs` ends
  // `j.status !== 'lost'` — so it is reached through the Lost filter, which is where the
  // reason gets amended. Pinned in both directions so nobody "fixes" the absence.
  lacks(renderRow(job({ status: 'lost', won: false, lostReason: 'price' })), 'Butler Estate',
    'a lost job is not in the default client list');
  const lost = renderRow(job({ status: 'lost', won: false, lostReason: 'price' }), 'lost');
  has(lost, 'Butler Estate', 'the Lost filter is where it lives');
  has(lost, 'openCloseoutModal(7)', 'and the control is still rendered on one, so the reason can be amended');

  const retained = renderRow(job({ status: 'closed_retained', depositReceived: true,
    payments: [{ stage: 'deposit', amount: 9970 }] }));
  has(retained, 'openCloseoutModal(7)', 'closed — deposit retained keeps it too');

  // ⚠ `confirmMarkLost` IS UNTOUCHED. The gate is on the two doors into the modal; the
  // writer itself is unchanged, so nothing about what a genuine loss records has moved.
  has(fn('confirmMarkLost'), "j.status = j.depositReceived ? 'closed_retained' : 'lost';",
    'the loss writer is unchanged');
  lacks(fn('confirmMarkLost'), 'jobIsSettled', 'and holds no gate of its own');
}
};
