'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// A FEE-ONLY ESTIMATE IS A BUILT ESTIMATE (2026-09-22).
//
// Found by Anthony on the first dummy client of the test run, twenty minutes in.
//
//   `var estBuilt = !!(est && (est.rooms || []).length > 0 && hav > 0);`
//
// ⚠⚠ ROOMS ARE NOT THE ONLY WAY AN ESTIMATE GETS BUILT, AND ON THE SIMPLEST SERVICE
// THEY ARE NOT A WAY AT ALL. Home Prep for Sale has NO ROOM GRID — `applyEstimateServiceMode`
// hides it and the entire estimate is the prep vendor lines — so `est.rooms` is `[]` on
// every prep job that has ever been priced, and `estBuilt` was false forever.
//
// THE FAILURE IS NOT COSMETIC, AND THE CHAIN IS THE WHOLE POINT OF THIS FILE:
//   1. `walked` is `estBuilt || the walkthrough date has passed`. With estBuilt false and
//      the walkthrough booked for Friday, the `walkthrough` row stayed open.
//   2. `jobTimelineNext` lights the EARLIEST gap, so the band landed on `walkthrough`.
//   3. Its primary reads "Set the walkthrough date" and opens Edit Client — which had no
//      walkthrough field (fixed the same day; see client-edit-fields).
//   4. `Submit for approval` renders ONLY while `estimate_approved` is the live row. It
//      was not, so there was no submit button anywhere on the dashboard.
// A priced, saved job with no way forward and nothing on screen saying why.
//
// ⚠ WHY NOTHING CAUGHT IT: every fixture in `job-timeline` is a room-scored estate job,
// and every fixture in the prep suites stops at the estimate. Nothing had ever driven a
// fee-only estimate THROUGH the rail. The two halves were each correct on their own.
//
// ⚠ THE FIX READS SUBSTANCE, NEVER THE SERVICE KEY. `svc === 'prep'` would be a second
// copy of the fee-only rule and would break on the next service that prices no rooms;
// a test below pins that the predicate names no service.
// ─────────────────────────────────────────────────────────────────────────────

const { sandbox, source } = require('./harness');

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();

  const ctx = sandbox({
    fns: [
      'jobTimeline', 'jobTimelineNext', 'jobTimelineActions', 'paymentSplit',
      'unscoredRoomNames', 'jobActivationBlockers', 'isJobWon', 'isJobFunded',
      'jobPayments', 'stagePaidTotal', 'depositPaidTotal', 'depositTargetFor',
      'docSentAt', 'docDraftedAt', 'docKeyFor', 'agreementSignature',
      'isAgreementSigned', 'esignProviderKey', 'esignAvailable', 'esignJobWatches',
      'isAgreementSent',
      // ⚠ `jobTimelineActions` is LIFTED, never stubbed. The rail saying "you are on
      // estimate_approved" and the band actually RENDERING a submit button are two
      // different claims, and this defect lived precisely in the gap between them.
      'jobStageDoc', 'docReadiness', 'docTitle', 'docDraftOnly', 'docWord',
      '_jtDocSecondaries', '_jtDraftLink', '_jtDocViews', '_jtDriveLink',
    ],
    vars: ['JT_SHORT', 'JT_NEXT', 'AGR_SIG_METHODS', 'ESIGN_PROVIDERS',
           'JT_ROW_DOC', 'DOC_ACTIONS', 'DOC_KIND_WORD'],
  });
  const { jobTimeline, jobTimelineNext, jobTimelineActions } = ctx;

  const FUTURE = '2099-01-01';
  const PAST = '2020-01-01';

  // Anthony's own client 01, as the test run has him type it: $45,000 of prep trades,
  // a 30% fee, a walkthrough booked three days out. No rooms, because the service has none.
  const prepJob = (o) => Object.assign({
    id: 7, hvlId: 'HVL-0007', name: 'ZZ Whitfield', created: 'Sep 22, 2026',
    svc: 'prep', status: 'new', walkthrough: FUTURE,
  }, o || {});
  const prepEst = (o) => Object.assign({
    rooms: [],
    prepItems: [
      { type: 'Painting', cost: 18000, note: 'whole interior' },
      { type: 'Cleaning', cost: 6000 },
      { type: 'Landscaping', cost: 9000 },
      { type: 'Staging', cost: 12000 },
    ],
    prepCost: 45000, havellinTotal: 13500,
  }, o || {});
  const prepRec = (eo) => ({ estimate: prepEst(eo), savedAt: 'Sep 22, 2026', approved: false, submitted: false });

  const roomEst = () => ({
    rooms: [{ name: 'Kitchen', vol: 3, cplx: 3 }, { name: 'Primary Bedroom', vol: 3, cplx: 3 }],
    havellinTotal: 24100,
  });

  const rowsOf = (job, rec) => jobTimeline(job, rec, [], []);
  const pick = (rows, k) => rows.filter((r) => r.key === k)[0];

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ THE DEFECT: a priced prep job had no way forward');
  {
    const job = prepJob(), rec = prepRec();
    const rows = rowsOf(job, rec);

    eq(pick(rows, 'estimate_built').done, true,
      'a prep estimate with vendor lines and a total reads BUILT');
    eq(pick(rows, 'walkthrough').done, true,
      '…so the walkthrough reads done, whatever the calendar says — the estimate proves it happened');

    const next = jobTimelineNext(rows);
    ok(next && next.key !== 'walkthrough',
      'the band does NOT land on walkthrough (it did: the row was the earliest gap)');
    eq(next && next.key, 'estimate_approved',
      'it lands on the step that actually needs doing');

    // ⚠ THE JOIN. Driving the rail alone would pass with the button still missing —
    // `Submit for approval` renders only while its own row is live, which is exactly
    // what the open walkthrough row was preventing.
    const act = jobTimelineActions(next, job, rec);
    eq(act.primary && act.primary.label, 'Submit for approval',
      '⚠ and the submit button is actually THERE — the half a rail-only test cannot see');
    has(String(act.primary && act.primary.call), 'dashSubmitEstimate',
      'wired to the real submit handler');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('the converse, or the fix is just "everything is built"');
  {
    // An estimate with neither rooms nor prep lines has priced nothing.
    const empty = rowsOf(prepJob(), prepRec({ rooms: [], prepItems: [] }));
    eq(pick(empty, 'estimate_built').done, false, 'no rooms and no prep lines is not a built estimate');
    eq(pick(empty, 'walkthrough').done, false, '…and it does not clear the walkthrough either');
    eq(jobTimelineNext(empty).key, 'walkthrough', 'a job with nothing priced still lights the walkthrough');

    // Lines but no money is a half-filled form, not a quote.
    const free = rowsOf(prepJob(), prepRec({ havellinTotal: 0 }));
    eq(pick(free, 'estimate_built').done, false, 'prep lines with a zero total is not built');

    // And the row still does its own job when there is genuinely no estimate.
    const bare = rowsOf(prepJob(), null);
    eq(pick(bare, 'walkthrough').done, false, 'no estimate at all: the walkthrough row is open, correctly');
    eq(pick(bare, 'walkthrough').sub, '', 'a date IS set, so it does not claim "No date set yet"');
    const none = rowsOf(prepJob({ walkthrough: '' }), null);
    has(pick(none, 'walkthrough').sub, 'No date set yet', 'with no date it says so');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('a room-scored job is untouched');
  {
    const job = { id: 1, hvlId: 'HVL-0001', name: 'Butler', created: 'Sep 8, 2026',
                  svc: 'cleanout', status: 'new', walkthrough: FUTURE };
    const rec = { estimate: roomEst(), savedAt: 'Sep 8, 2026', approved: false, submitted: false };
    const rows = rowsOf(job, rec);
    eq(pick(rows, 'estimate_built').done, true, 'scored rooms still build an estimate');
    eq(pick(rows, 'walkthrough').done, true, 'and still clear the walkthrough');
    eq(jobTimelineNext(rows).key, 'estimate_approved', 'and still land on approval');

    // The other arm of `walked` — a date that has passed, with no estimate behind it.
    const walkedOnly = rowsOf({ id: 2, name: 'x', created: 'Sep 8, 2026', svc: 'cleanout',
                                status: 'new', walkthrough: PAST }, null);
    eq(pick(walkedOnly, 'walkthrough').done, true, 'a past date on its own still counts');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ the rule is the estimate’s substance, never the service key');
  {
    const line = src.split('\n').filter((l) => l.indexOf('var estBuilt') >= 0).join('\n');
    ok(line.length > 0, 'estBuilt is declared exactly once');
    has(line, 'prepItems', 'it reads the prep lines');
    has(line, 'rooms', 'and the rooms');
    // Keying on the service would be a second copy of the fee-only rule, and would go
    // wrong the day another service prices no rooms.
    // ⚠ THE NEEDLE IS THE QUOTED KEY, NOT THE WORD. A bare `prep` matches `prepItems`,
    // which is the field the fix legitimately reads — the first version of this check
    // failed on correct code for exactly that reason.
    ["'prep'", '"prep"', 'svc', 'estimateIsFeeOnly', 'isPrep'].forEach((n) => {
      lacks(line, n, 'it names no service and no fee-only predicate (' + n + ')');
    });
  }
};
