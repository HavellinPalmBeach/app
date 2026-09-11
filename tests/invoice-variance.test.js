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

  group('⚠⚠ THE INVOICE NEVER CLAIMS THE CLIENT WAS TOLD');
  {
    const t = text(doc(REPORTED, 95, 70).html);
    lacks(t, 'notified per',
          '⚠⚠ the sentence is GONE. An invoice must not assert a phone call nothing on the '
          + 'system witnessed — and at 5.3% no notice was owed in the first place');
    lacks(t, 'T&Cs', 'and the document no longer points at terms it was misreading');
    has(t, 'Job ran over estimate by $1,360',
        'the overage itself is still stated — withholding it would be the silent omission');
    has(t, '(5.3%)',
        '⚠ WITH THE PERCENTAGE, which is the one fact the reader cannot derive from the page '
        + 'and the answer to "the bill is over the estimate, why wasn\'t I called?"');
    has(t, 'inside the 15% tolerance in your agreement',
        'and says which side of the threshold they agreed to it landed on');
  }

  group('⚠ THE ROW AND THE MANAGER PIN CANNOT DISAGREE — one constant, both readers');
  {
    const inside = doc(REPORTED, 95, 70);
    eq(inside.requiresApproval, false, '5.3% needs no PIN');
    has(text(inside.html), 'inside the 15%', 'and the client copy says inside');

    // 95 TC + 120 PS = $32,575 against $25,715 — 26.7% over.
    const past = doc([pay('deposit', 12858), pay('midpoint', 6428)], 95, 120);
    eq(past.requiresApproval, true, 'past the tolerance the final needs a manager PIN');
    has(text(past.html), 'beyond the 15% tolerance in your agreement',
        '⚠ and the client copy says beyond — the two surfaces read EST_TOLERANCE_PCT, so a '
        + 'final cannot print "inside the tolerance" over an invoice the app is withholding');
    lacks(text(past.html), 'notified per',
          '⚠⚠ AND STILL NO CLAIM OF NOTICE ABOVE THE THRESHOLD. That is where the old sentence '
          + 'looked most defensible and was still unevidenced: the notice happens mid-job in a '
          + 'phone call, and the record of it is an accepted change order, not this row');
  }

  group('a job that lands on its estimate says nothing at all');
  {
    const t = text(doc([pay('deposit', 12858), pay('midpoint', 6428)], 89, 68).html);
    lacks(t, 'Job ran over estimate', 'no variance, no row');
    lacks(t, 'Job came in under estimate', 'in either direction');
  }

  group('the under-estimate arm keeps its credit and gains the percentage');
  {
    const t = text(doc([pay('deposit', 12858), pay('midpoint', 6428)], 80, 60).html);
    has(t, 'Job came in under estimate by $2,665 (10.4%) — credit applied',
        'a client who is owed money is still told so, in the same shape');
  }

  group('⚠ A FEE-ONLY JOB IS NOT TOLD ABOUT A TOLERANCE ITS CONTRACT DOES NOT CARRY');
  {
    // Home Prep bills no hours, so its §3.8 re-quotes a scope change and states no 15%.
    // Naming a threshold that is not in that agreement is the §3.3 defect all over again.
    // Estimated at $10,000 of painting (a $3,000 fee); the painter actually quoted $20,000,
    // so the fee trues to $6,000 and the engagement finals $3,000 over with no hour logged.
    const prep = doc([pay('deposit', 1500)], 0, 0,
                     { svc: 'prep', totTC: 0, totPS: 0, tcFee: 0, psFee: 0, pkgCost: 0,
                       prepFee: 3000, havellinTotal: 3000, havellinTotalFull: 3000,
                       prepEnabled: true,
                       prepItems: [{ lid: 'a', cat: 'Painting', cost: 10000, note: 'interior' }] },
                     { svc: 'prep', prepSourcing: { La: { quote: 20000, vendorName: 'Ace Painting' } } });
    const t = text(prep.html);
    lacks(t, 'tolerance in your agreement',
          '⚠ no threshold is cited on an engagement whose agreement states none');
    has(t, 'Job ran over estimate', 'the variance itself is still reported');
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
