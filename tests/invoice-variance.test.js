'use strict';
// TWO THINGS ON ONE FINAL INVOICE, BOTH REPORTED OFF THE SAME DOCUMENT (2026-09-11).
// Anthony: "we ran a job over by a few hours, not 15%, so not requiring a change order, and
// the final invoice flagged that 'Client was notified per T&Cs' which is not true nor needed.
// also there was a weird rounding error on the invoice, creating a $1 credit to client."
//
// The job is reproduced exactly here: a $25,715 Estate Settlement estimated at 89 TC + 68 PS
// and worked at 95 TC + 70 PS, so $27,075 actual — $1,360 over, which is 5.3%.
//
// ⚠⚠ DEFECT 1 — THE INVOICE ASSERTED AN EVENT NOTHING HAD WITNESSED. The row read
// "client was notified per T&Cs" on EVERY positive variance. The notice is owed only past
// 15% (the estimate's Terms and the agreement's §3.8 both say so), and even past it the app
// records no notification anywhere — what it can evidence is an accepted change order.
//
// ⚠⚠ DEFECT 2 — A 50-CENT DIFFERENCE PRINTED AS A $1 CREDIT. `paymentGap` subtracted two
// figures that had each ALREADY been rounded to the dollar, so the `Math.abs(gap) < 1` guard
// that exists to swallow bank rounding could never see a sub-dollar gap.

const { sandbox } = require('./harness');

const FNS = ['estTolerancePctTxt', 'invoiceHtml', 'coHours', 'coHoursTotal', 'coBaselineShift',
             'coHoursLabel', '_coMoney', 'fmt', 'getVendorActuals', '_srcLineKey', 'samePerson',
             'canonPersonName', '_invVendorFeeSentence', 'prepFeeRate', 'vendorGroupOfLine',
             'resolveJobVendor', 'coordHrsFor', 'prepLineTCHrs', 'vendorLineTCHrs', 'esc',
             'fmtDate2', 'svcLabelOf', 'conciergePhones', 'conciergePhonesText',
             'assignedTCContact', 'vendorCats', 'vendorPrimaryCat', 'estimateIsFeeOnly',
             'isDecedentJob', 'stagePaidTotal', 'jobPaidTotal', 'jobPayments', 'discountOnLabor'];
const VARS = ['EST_TOLERANCE_PCT', 'SMF_PCT', 'RUSH_PCT', 'SVC_LABELS', 'DEPT_EMAILS',
              'HAVELLIN_OFFICE_PHONE', 'NON_MOBILE_NUMBERS', 'DEFAULT_CONTRACTORS',
              'COORD_TOUCHES', 'COORD_TOUCHES_BY_GROUP', 'COORD_TOUCHES_DEFAULT', 'TOUCH_HRS',
              'DECEDENT_SERVICES', 'PERSON_NAME_ALIASES', 'PREP_FEE_RATE', 'invApproved'];

// ⚠ THE ODD TOTAL IS THE POINT, NOT AN ACCIDENT. $25,715 puts the 50% stage target on a half
// dollar (12,857.50) and the 75% one on a quarter (19,286.25), which is what makes the double
// rounding reachable at all. A round number would hide this defect completely.
const TOTAL = 25715;
const EST = { jobId: 1, tcFee: 16465, psFee: 8500, pkgCost: 750, smf: 0, prepFee: 0,
              havellinTotal: TOTAL, havellinTotalFull: TOTAL, tcRate: 185, psRate: 125,
              discountPct: 0, discountAmt: 0, fixedPrice: false, rush: false,
              vendors: [], prepItems: [], preparedBy: 'Anthony Graziano',
              svc: 'cleanout', totTC: 89, totPS: 68 };

const logs = (tc, ps) => [{ date: '2026-09-01', activity: 'clearance', members: [
  { name: 'Anthony Graziano', role: 'TC', hours: tc },
  { name: 'Anthony Graziano Jr', role: 'PS', hours: ps } ] }];
const pay = (stage, amount) => ({ stage, amount, date: '2026-09-01', method: 'wire' });

function doc(payments, tc, ps, estOverride, jobOverride) {
  const est = Object.assign({}, EST, estOverride || {});
  const ctx = sandbox({ fns: FNS, vars: VARS, stubs: {
    jobLogs: { 1: logs(tc, ps) },
    estimateStore: { 1: { estimate: est, approved: true, approvedBy: 'Anthony Graziano' } },
    changeOrders: [], contractors: [], currentEstimate: null, currentInvStage: 'final',
    vendorDirectory: [], jobPlans: {} } });
  const job = Object.assign({ id: 1, hvlId: 'HVL-0007', client: 'Butler Estate',
    svc: 'cleanout', address: '69 beach blvd', tc: 'Anthony Graziano', status: 'active',
    executor: 'Tripp Butler', payments: payments }, jobOverride || {});
  return ctx.invoiceHtml(job, 'final');
}
const text = (h) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

// What was actually recorded on the reported job: the deposit at the app's own rounded
// target, the midpoint at the true 25% of an odd total.
const REPORTED = [pay('deposit', 12858), pay('midpoint', 6428.75)];

module.exports = function ({ group, ok, eq, has, lacks }) {

  group('⚠⚠ THE FINAL CARRIES NO VARIANCE ROW AT ALL');
  {
    const t = text(doc(REPORTED, 95, 70).html);
    lacks(t, 'notified per',
          '⚠⚠ THE ORIGINAL REPORT. "client was notified per T&Cs" printed on every positive '
          + 'variance however small — a claim the app has no record of at ANY size, on a job '
          + 'where no notice was owed');
    lacks(t, 'T&Cs', 'and the document no longer points at terms it was misreading');
    lacks(t, 'ran over estimate',
          '⚠⚠ AND THE WHOLE ROW IS GONE, which is the decision rather than a softer wording. '
          + 'An accepted change order moves the baseline, so authorised scope is inside the '
          + 'estimate by construction and a real overrun cannot reach a correctly-run final');
    lacks(t, 'came in under estimate',
          '⚠ BOTH ARMS, not just the overage. A document that narrates the favourable direction '
          + 'and goes quiet on the other reads as selective disclosure');
    has(t, 'Original Estimate',
        '⚠ NOTHING IS HIDDEN: the estimate is still printed…');
    has(t, 'Actual Havellin services total',
        '…on a row inches from the actual, so the reader can do the subtraction the row used to '
        + 'do for them. That is the standing client-copy rule — a line explaining what is already '
        + 'visible costs more than it earns');
    eq(Math.round(doc(REPORTED, 95, 70).amtDue), 7788,
       'and the balance is untouched — this was never a change to what anyone is billed');
  }

  group('⚠⚠ THE ±15% MANAGER PIN IS INTERNAL AND IS DELIBERATELY UNTOUCHED');
  {
    // Anthony's own argument is why this has to stay: a variance this large means the change
    // order was skipped. Withholding the final until a manager looks is the right answer to
    // that; telling the client about it on the invoice is not.
    const inside = doc(REPORTED, 95, 70);
    eq(inside.requiresApproval, false, '5.3% issues without a PIN');

    const past = doc([pay('deposit', 12858), pay('midpoint', 6428)], 95, 120);
    eq(past.requiresApproval, true,
       '⚠⚠ 26.7% STILL STOPS THE DOCUMENT. Removing the client-facing row must not remove the '
       + 'control — that is the one thing standing between a skipped change order and an invoice');
    ok(past.variancePct > 0.15, 'and the figure the gate reads is still computed');
    lacks(text(past.html), 'ran over estimate',
          '⚠ but the client copy says nothing about it even here');
  }

  group('an accepted change order moves the baseline, so authorised scope is not a variance');
  {
    // The structural half of Anthony's argument, driven rather than asserted: the same extra
    // hours are a 5.3% variance unauthorised and no variance at all once agreed.
    const d = doc(REPORTED, 95, 70);
    ok(Math.abs(d.overUnder) > 0,
       'unauthorised, the extra hours read as a variance to the gate');
    eq(d.requiresApproval, false,
       'small enough to issue — which is exactly the case that needed no flag');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ FIFTY CENTS IS BANK ROUNDING, AND THE GUARD CAN SEE IT NOW');
  {
    const d = doc(REPORTED, 95, 70);
    const t = text(d.html);
    // invoiced 0.75 × 25,715 = 19,286.25 · received 12,858.00 + 6,428.75 = 19,286.75
    lacks(t, 'Received ahead of the invoiced schedule',
          '⚠⚠ THE REPORTED BUG. A true gap of 50 cents used to print as a ($1) credit, because '
          + 'the gap was a difference of two figures ALREADY rounded to the dollar — so the '
          + '"below a dollar" guard could never observe anything smaller than one');
    lacks(t, 'Outstanding from the deposit', 'and nothing is claimed outstanding either');
    eq(Math.round(d.amtDue), 7788,
       '⚠ AND THE BALANCE HAS NOT MOVED. It was never wrong — the basis is whole dollars, so '
       + 'round(basis) − round(received) already equals rounding the true balance once. Only '
       + 'the NOTICE about the gap was wrong, and a fix that moved the money would be worse '
       + 'than the defect it closed');
  }

  group('⚠ A REAL GAP IS STILL NAMED IN BOTH DIRECTIONS — the converse that makes it safe');
  {
    const short = doc([pay('deposit', 5000), pay('midpoint', 6428)], 95, 70);
    has(text(short.html), 'Outstanding from the deposit and midpoint invoices',
        'a genuinely short deposit is still carried forward and still explained');
    eq(Math.round(short.amtDue), 27075 - 11428, 'and the final still asks for everything owed');

    const ahead = doc([pay('deposit', 12858), pay('midpoint', 8428)], 95, 70);
    has(text(ahead.html), 'Received ahead of the invoiced schedule',
        'a client genuinely $2,000 ahead is still told, or the credit reads as an error');
  }

  group('⚠ THE MIDPOINT INVOICE CARRIES THE SAME FIX — it had the same double rounding');
  {
    const ctx = sandbox({ fns: FNS, vars: VARS, stubs: {
      jobLogs: { 1: logs(40, 30) },
      estimateStore: { 1: { estimate: EST, approved: true, approvedBy: 'Anthony Graziano' } },
      changeOrders: [], contractors: [], currentEstimate: null, currentInvStage: 'midpoint',
      vendorDirectory: [], jobPlans: {} } });
    const job = { id: 1, hvlId: 'HVL-0007', client: 'Butler Estate', svc: 'cleanout',
                  address: '69 beach blvd', tc: 'Anthony Graziano', status: 'active',
                  executor: 'Tripp Butler', payments: [pay('deposit', 12857.30)] };
    // ⚠ THE FIGURE IS CHOSEN SO THE TWO ROUNDINGS DISAGREE, or this check cannot fail — the
    // first version used 12,857.50, where round(12857.50) = 12858 lands exactly on the target
    // and BOTH the old code and the new one suppress. Caught by reverting, not by reading.
    // Deposit target $12,858; a wire lands 70¢ light at $12,857.30. True gap 0.70 — bank
    // rounding, and quiet. Rounded first: 12,858 − 12,857 = $1, and the midpoint invoice duns
    // a client for a dollar they do not owe.
    lacks(text(ctx.invoiceHtml(job, 'midpoint').html), 'Outstanding from the deposit',
          '⚠ `_paymentGapRow(depositAmt - receivedDep)` rounded the received side too, so a '
          + 'sub-dollar wire difference printed as an outstanding balance on the midpoint');
  }

  group('one definition of the ±15%, and the file holds no second copy of it');
  {
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'havellin.html'), 'utf8');
    const live = src.split('\n').filter(function (l) {
      const t = l.trim();
      return t && t.indexOf('//') !== 0;
    }).join('\n');
    lacks(live, '_variancePct > 0.15',
          '⚠ the manager-PIN gate reads the constant');
    lacks(live, 'Math.abs(pct) >= 0.15',
          '⚠ and so does the change order modal, which measures the same rule');
    ok(live.indexOf('EST_TOLERANCE_PCT') > 0, 'the constant exists and is read');
  }
};
