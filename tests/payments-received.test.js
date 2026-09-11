'use strict';
// AN INVOICE CREDITS MONEY THAT ARRIVED, NOT MONEY IT ASKED FOR (2026-09-11).
//
// ⚠⚠ `finalDue` was `totalFinalBasis - depositAmt - midpointAmt` — the two stage TARGETS —
// so the final invoice credited the client with every earlier invoice as though it had been
// paid in full. `job.payments[]` is the record of what actually landed and nothing on this
// document had ever read it, while the Payment Summary printed those targets under a heading
// reading "Subtotal payments received".
//
// Measured by driving the real invoiceHtml on a $19,940 job before the fix:
//   deposit short-paid by $4,970  → billed as if paid in full; $4,970 never invoiced again
//   midpoint invoice never paid   → $4,985 silently dropped off the engagement
//   client OVERPAID by $2,000     → billed the full final anyway, $2,000 over
// The first two are the firm writing off its own money. The third reaches a client who paid
// early as a demand for money they have already sent, which is the one that becomes a call.
//
// ⚠ THE CASE THAT HID IT: a client who pays both invoices in full to the cent is billed
// identically either way. That is the first assertion in this file, because a fix that moves
// the ordinary job is a worse defect than the one it closes.

const { sandbox, fn } = require('./harness');

const FNS = ['invoiceHtml', 'coHours', 'coHoursTotal', 'coBaselineShift', 'coHoursLabel',
             '_coMoney', 'fmt', 'getVendorActuals', 'samePerson', 'canonPersonName',
             '_invVendorFeeSentence', 'prepFeeRate', 'vendorGroupOfLine', 'resolveJobVendor',
             'coordHrsFor', 'prepLineTCHrs', 'vendorLineTCHrs', 'esc', 'fmtDate2', 'svcLabelOf',
             'conciergePhones', 'conciergePhonesText', 'assignedTCContact', 'vendorCats',
             'vendorPrimaryCat', 'estimateIsFeeOnly', 'isDecedentJob',
             'stagePaidTotal', 'jobPaidTotal', 'jobPayments'];
const VARS = ['SMF_PCT', 'RUSH_PCT', 'SVC_LABELS', 'DEPT_EMAILS', 'HAVELLIN_OFFICE_PHONE',
              'NON_MOBILE_NUMBERS', 'DEFAULT_CONTRACTORS', 'COORD_TOUCHES',
              'COORD_TOUCHES_BY_GROUP', 'COORD_TOUCHES_DEFAULT', 'TOUCH_HRS',
              'DECEDENT_SERVICES', 'PERSON_NAME_ALIASES', 'PREP_FEE_RATE', 'invApproved'];

// 80 TC @150 + 60 PS @100 + $1,940 materials = $19,940, and the logged hours below reproduce
// it exactly, so an untouched job reads zero variance and the arithmetic is easy to follow.
const TOTAL    = 19940;
const DEPOSIT  = 9970;   // what the deposit invoice asks for — 50%
const MIDPOINT = 4985;   // what the midpoint invoice asks for once the deposit is paid — 25%
const EST = { jobId: 1, tcFee: 12000, psFee: 6000, pkgCost: 1940, smf: 0, prepFee: 0,
              havellinTotal: TOTAL, havellinTotalFull: TOTAL, tcRate: 150, psRate: 100,
              discountPct: 0, discountAmt: 0, fixedPrice: false, rush: false,
              vendors: [], prepItems: [], preparedBy: 'Anthony Graziano',
              svc: 'cleanout', totTC: 80, totPS: 60 };
const LOGS = [{ date: '2026-09-01', activity: 'clearance',
                members: [{ name: 'Anthony Graziano', role: 'TC', hours: 80 },
                          { name: 'Crew', role: 'PS', hours: 60 }] }];

const pay = (stage, amount) => ({ stage, amount, date: '2026-09-01', method: 'wire' });
const paid = (list) => list.reduce((s, p) => s + p.amount, 0);

function doc(payments, stage, estOverride) {
  const est = Object.assign({}, EST, estOverride || {});
  const ctx = sandbox({
    fns: FNS, vars: VARS,
    stubs: {
      jobLogs: { 1: LOGS },
      estimateStore: { 1: { estimate: est, approved: true, approvedBy: 'Anthony Graziano' } },
      changeOrders: [], contractors: [], currentEstimate: null,
      currentInvStage: stage || 'final', vendorDirectory: [], jobPlans: {},
    },
  });
  const job = { id: 1, hvlId: 'HVL-0007', client: 'Butler Estate', svc: 'cleanout',
                address: '69 Beach Blvd', tc: 'Anthony Graziano', status: 'active',
                executor: 'Tripp Butler', payments: payments };
  return ctx.invoiceHtml(job, stage || 'final');
}
// The whole engagement: what the client sent, plus what the final still asks for.
const engagement = (payments) => paid(payments) + Math.round(doc(payments).amtDue);
const text = (h) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

module.exports = function ({ group, ok, eq, has, lacks }) {

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ THE ORDINARY JOB DOES NOT MOVE — this is why the defect survived');
  {
    const full = [pay('deposit', DEPOSIT), pay('midpoint', MIDPOINT)];
    eq(Math.round(doc(full).amtDue), 4985,
       'both invoices paid in full: the final is the last 25%, exactly as it always was');
    eq(engagement(full), TOTAL, 'and the engagement collects the job total');
    lacks(text(doc(full).html), 'Outstanding from the deposit',
          'nothing is flagged on a client who paid what they were asked');
  }

  group('⚠⚠ A SHORT PAYMENT IS CARRIED FORWARD, NOT WRITTEN OFF');
  {
    // The deposit cheque came in $4,970 light. Before the fix the final invoice credited
    // the client with the full $9,970 and the shortfall was never invoiced again.
    const short = [pay('deposit', 5000), pay('midpoint', MIDPOINT)];
    eq(paid(short), 9985, 'the client has sent $9,985');
    eq(Math.round(doc(short).amtDue), TOTAL - 9985,
       '⚠⚠ the final asks for everything still owed — it used to ask for $4,985 and lose $4,970');
    eq(engagement(short), TOTAL, 'so the engagement still collects the job total');

    const t = text(doc(short).html);
    has(t, 'Payments received to date', 'the row says received, and now means it');
    has(t, '$9,985', 'and shows what actually arrived');
    has(t, 'Outstanding from the deposit and midpoint invoices',
        '⚠ the gap is NAMED. A larger-than-expected final with no explanation on the page is '
        + 'how a correct invoice turns into an argument');
  }

  group('⚠⚠ AN UNPAID MIDPOINT DOES NOT VANISH');
  {
    // Printing the final before the midpoint cheque has landed is completely ordinary.
    const depOnly = [pay('deposit', DEPOSIT)];
    eq(Math.round(doc(depOnly).amtDue), TOTAL - DEPOSIT,
       '⚠⚠ the unpaid midpoint is carried into the final — $4,985 used to drop off the job');
    eq(engagement(depOnly), TOTAL, 'the engagement still collects the total');
    has(text(doc(depOnly).html), 'Outstanding from the deposit and midpoint invoices',
        'and the document says why the final is larger than 25%');
  }

  group('⚠⚠ A CLIENT WHO PAID AHEAD IS CREDITED, NOT BILLED AGAIN');
  {
    // The direction that reaches the client as a complaint rather than as lost revenue.
    const over = [pay('deposit', DEPOSIT), pay('midpoint', MIDPOINT), pay('midpoint', 2000)];
    eq(paid(over), 16955, 'the client has sent $2,000 more than they were asked for');
    eq(Math.round(doc(over).amtDue), TOTAL - 16955,
       '⚠⚠ the final is reduced by the overpayment — it used to bill the full $4,985 on top');
    eq(engagement(over), TOTAL, 'the engagement collects the total and no more');
    has(text(doc(over).html), 'Received ahead of the invoiced schedule',
        '⚠ and it says so, because an unexplained credit reads as an error');

    // Paid the whole job up front: the balance is zero, not a demand.
    const allUp = [pay('deposit', TOTAL)];
    eq(Math.round(doc(allUp).amtDue), 0, 'a client who prepaid the whole job owes nothing');

    // Paid MORE than the job came to: a real credit, and _amtDueBox renders it as one.
    const credit = [pay('deposit', TOTAL + 500)];
    eq(Math.round(doc(credit).amtDue), -500, 'beyond the total it goes negative');
    has(doc(credit).html, 'Credit:', 'and prints as a credit rather than a negative demand');
  }

  group('nothing recorded at all is answered honestly');
  {
    // A job whose payments were never captured owes everything. That is the truthful answer
    // and it is loud, which is the point — the old code quietly assumed 75% had arrived.
    eq(Math.round(doc([]).amtDue), TOTAL, 'with no payment on file the whole total is due');
    eq(Math.round(doc(undefined).amtDue), TOTAL, 'and a job with no payments array does not throw');
    has(text(doc([]).html), 'Outstanding from the deposit and midpoint invoices',
        'with the reason on the page');
  }

  group('⚠ BANK ROUNDING IS NOT A DEBT');
  {
    // A wire landing fifty cents light must not draw an "outstanding" notice, while the
    // arithmetic still uses the real figure rather than pretending the gap away.
    const cents = [pay('deposit', DEPOSIT - 0.4), pay('midpoint', MIDPOINT)];
    lacks(text(doc(cents).html), 'Outstanding from the deposit',
          'a sub-dollar difference raises nothing');
    lacks(text(doc(cents).html), 'Received ahead of the invoiced schedule',
          'in neither direction');
    // A whole dollar is a real difference and is reported.
    const dollar = [pay('deposit', DEPOSIT - 5), pay('midpoint', MIDPOINT)];
    has(text(doc(dollar).html), 'Outstanding from the deposit',
        'five dollars short is reported');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ THE MIDPOINT INVOICE ASKS FOR WHAT IS OUTSTANDING, not a flat 25%');
  {
    const onTime = doc([pay('deposit', DEPOSIT)], 'midpoint');
    eq(Math.round(onTime.amtDue), MIDPOINT,
       'deposit paid in full: the midpoint asks for its 25%, unchanged');

    const shortDep = doc([pay('deposit', 5000)], 'midpoint');
    eq(Math.round(shortDep.amtDue), MIDPOINT + (DEPOSIT - 5000),
       '⚠ a short deposit is carried into the midpoint — the cumulative 75% target less what '
       + 'actually arrived, rather than less what was asked for');
    const t = text(shortDep.html);
    has(t, 'invoiced on acceptance', 'the row says what the deposit invoice asked for');
    has(t, 'Received to date', 'and a separate row says what came in');
    has(t, 'Outstanding from the deposit', 'with the gap named');

    eq(Math.round(doc([], 'midpoint').amtDue), Math.round(0.75 * TOTAL),
       'with nothing paid the midpoint asks for the whole cumulative 75%');
  }

  group('the deposit invoice is untouched — there is nothing to reconcile yet');
  {
    eq(Math.round(doc([], 'deposit').amtDue), DEPOSIT, 'it asks for 50% of the estimate');
    eq(Math.round(doc([pay('deposit', 1000)], 'deposit').amtDue), DEPOSIT,
       '⚠ and a part payment does NOT reduce it — the deposit invoice states the 50% due, '
       + 'and part-paying it is what the midpoint and final reconcile');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('fixed price reconciles against payments too');
  {
    const fx = { fixedPrice: true, fixedAmount: TOTAL, havellinTotal: TOTAL };
    const full = [pay('deposit', DEPOSIT), pay('midpoint', MIDPOINT)];
    eq(Math.round(doc(full, 'final', fx).amtDue), 4985, 'paid in full, the flat fee closes out');
    eq(Math.round(doc([pay('deposit', DEPOSIT)], 'final', fx).amtDue), TOTAL - DEPOSIT,
       '⚠ an unpaid midpoint is carried on a fixed-price job too — it has its own summary '
       + 'block, which is exactly how one of two copies gets missed');
    has(text(doc([pay('deposit', DEPOSIT)], 'final', fx).html),
        'Outstanding from the deposit and midpoint invoices',
        'and its summary names the gap the same way');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('one rule, read from the payment record');
  {
    const body = fn('invoiceHtml').split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    has(body, "stagePaidTotal(job, 'deposit')", 'the deposit received is read from the record');
    has(body, 'jobPaidTotal(job)', 'and the total received from the record');
    has(body, 'var finalDue     = Math.round(totalFinalBasis) - receivedAll;',
        'the final reconciles against what arrived');
    lacks(body, 'Math.round(totalFinalBasis) - depositAmt - midpointAmt',
          '⚠ never against the two stage targets — that expression IS the defect');
    lacks(body, 'var alreadyPaid = deposit + midpoint;',
          '⚠ and the row labelled "received" is not fed the invoiced figures');
    lacks(body, 'Subtotal payments received',
          'the old heading is gone with the arithmetic it described');

    // The gap row is defined once and read by all three summaries.
    const uses = (body.match(/_paymentGapRow\(/g) || []).length;
    ok(uses >= 4, 'one gap row, read by the T&M final, the fixed-price final and the midpoint');
  }
};
