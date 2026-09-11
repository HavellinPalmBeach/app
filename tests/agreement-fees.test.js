'use strict';
// The Service Management Fee (2026-09-08). SMF_PCT went to 0 on 2026-08-02 and the estimate,
// the invoice and the Terms all stopped charging it that day. Both agreements kept promising
// it: the standard form's §3.5 named "15% of vendor invoices" outright and the probate form's
// fee table carried a "Vendor Management Fee — 15% of vendor invoice" row. Anthony found it
// reading a filed copy. Both now read SMF_PCT, so the fee cannot be stated in a contract the
// invoice does not bill. Standalone Home Prep keeps its 30% — that engagement bills no hours.

const { fn, decl, source, sandbox } = require('./harness');

module.exports = function ({ group, ok, eq, has, lacks }) {
  const smfDecl = decl('SMF_PCT');
  const agr = fn('agreementHtml');
  const prob = fn('probateAgreementHtml');

  group('the fee is off, and both agreements read the constant rather than a literal');
  {
    has(smfDecl, 'SMF_PCT = 0', 'SMF_PCT is 0 — the fee was struck on 2026-08-02');
    lacks(agr, "15% of vendor invoices", 'the standard agreement carries no literal 15%');
    lacks(prob, "'15% of vendor invoice'", 'nor does the probate fee table');
    has(agr, 'SMF_PCT > 0', '§3.5 is gated on the constant');
    has(prob, 'SMF_PCT > 0', 'the probate fee row is gated on the constant');
    has(agr, "Math.round(SMF_PCT*100)+'%", 'and when it is ever switched back on the clause prints the real rate');
  }

  group('what the client reads today');
  {
    has(agr, '3.5 Vendor Coordination.', 'the standard form states the no-fee rule under the same clause number');
    has(agr, 'Contractor adds no fee or markup to third-party vendor invoices', 'in plain words');
    has(agr, 'billed as Transition Concierge time under Section 3.3', 'and says where the coordination time IS billed — hourly or inside the fixed fee, §3.3 is both');
    has(agr, "3.5 Management Fee.", 'standalone Home Prep keeps its own clause');
    // The rate is spelled by _pctWords(prepFeeRate()) since 2026-09-10 rather than typed into
    // the clause, so the requirement is what this asserts: the fee stated in the contract comes
    // from the same constant the estimate and the invoice charge on. Asserting the rendered
    // digits instead would pass just as happily against a hardcoded copy that had drifted —
    // which is exactly how §3.5 went on promising 15% for five weeks after the fee came off.
    has(agr, "_pctWords(prepFeeRate())+' of the total third-party vendor costs managed under this",
        'at the one rate the estimate and the invoice bill, read from the constant');
    has(agr, "equal to '+_pctWords(prepFeeRate())+'", '§1.2 states it from the same place, not by hand');
    has(prob, "'Third-Party Vendors', 'At cost — no fee'", 'the probate fee table names the vendors as at-cost with no fee');
    lacks(prob, 'materials, and vendor fees based on', '§3.2 no longer describes the estimate as carrying vendor fees');
  }

  group('nowhere else in a client document does a vendor-fee percentage survive unguarded');
  {
    // The estimate and invoice already gate their SMF rows on the computed amount; this pins
    // that the constant is the only place the rate is defined.
    const src = source();
    const literal15 = (src.match(/15% of vendor/g) || []).length;
    eq(literal15, 0, 'no "15% of vendor" literal anywhere in the file');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // A STANDALONE HOME PREP AGREEMENT PRINTED AN HOURLY RATE CARD (2026-09-11).
  //
  // ⚠⚠ Measured on the real builder: §3.3 read "Transition Concierge services are billed at
  // $150/hour. Property Specialist services are billed at $100/hour" — on a signed contract
  // whose §1.2 states the fee is thirty percent of vendor costs. calcAll zeroes baseTCHrs,
  // basePSHrs and coordTC on prep, prepTCHrs is zero on EVERY engagement since 2026-09-10,
  // and loadJobPlanTab hides the hours log, so there is no hour that clause could describe.
  // `isFixedAgr` is false on prep — the fixed-price toggle is not reachable there — so the
  // HOURLY arm is what a prep client would have signed. The estimate's Terms were corrected
  // for exactly this on 2026-09-08 and the agreement was never given the same arm.
  const AGR_FNS = ['agreementHtml', 'probateAgreementHtml', 'isDecedentJob', 'prepFeeRate',
                   '_pctWords', 'agrBillingRates', 'materialsBasisNote', '_agrHasPrepVendors',
                   '_agrScopeServices', '_agrProbateCompliance', '_agrMidpointTrigger',
                   'estimateDocScope', 'svcHasDocStep', 'fmt', 'esc', 'paymentSplit',
                   'conciergePhones', 'assignedTCContact', 'samePerson', 'canonPersonName',
                   'svcLabelOf', 'estimateIsFeeOnly', 'agrSection'];
  const AGR_VARS = ['SMF_PCT', 'PREP_FEE_RATE', 'SVC_LABELS', 'DECEDENT_SERVICES', '_PCT_WORDS',
                    'HAVELLIN_OFFICE_PHONE', 'NON_MOBILE_NUMBERS', 'DEFAULT_CONTRACTORS',
                    'PERSON_NAME_ALIASES', 'DOC_SCOPES', 'JOB_STEPS', 'agrApproved'];
  function agrDoc(svc, over) {
    const c = sandbox({ fns: AGR_FNS, vars: AGR_VARS });
    const job = { id: 900, name: 'Client', hvlId: 'HVL-0900', svc: svc, addr: '1 A St' };
    const est = Object.assign({
      jobId: 900, svc: svc, fixedPrice: false, prepEnabled: svc === 'prep',
      prepItems: svc === 'prep' ? [{ type: 'Painting', cost: 100000 }] : [], vendors: [],
      rooms: [], collections: [], vehicles: [], tcRate: 150, psRate: 100,
      totTC: 80, totPS: 60, tcFee: 12000, psFee: 6000,
      havellinTotal: svc === 'prep' ? 30000 : 19940,
      grandTotal: svc === 'prep' ? 130000 : 19940,
      prepCost: svc === 'prep' ? 100000 : 0, prepFee: svc === 'prep' ? 30000 : 0,
    }, over || {});
    c.jobs = [job];
    c.estimateStore = { 900: { estimate: est, approved: true, approvedBy: 'Anthony Graziano', savedAt: 1 } };
    return c.agreementHtml(job, est).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
  }

  group('⚠⚠ A CONTRACT THAT BILLS NO HOURS STATES NO HOURLY RATE');
  {
    const prep = agrDoc('prep');
    lacks(prep, '3.3 Hourly and Project Rates',
      '⚠⚠ the hourly rate card is not on a prep agreement');
    lacks(prep, '$150/hour', '…nor the concierge rate');
    lacks(prep, '$100/hour', '…nor the specialist rate');
    has(prep, '3.3 Basis of Fee.', 'it states the basis that is actually charged');
    has(prep, 'No Transition Concierge or Property Specialist hours are billed on this engagement',
      '…and says so in as many words');
    has(prep, 'management fee stated in Section 1.2 and Section 3.5',
      '…pointing at the clause that does state the fee');

    // ⚠ A CHANGE ORDER CARRIES HOURS AND NOTHING ELSE since the 2026-09-11 rebuild, so the
    // 15% overrun mechanism describes nothing on an engagement with no hours.
    lacks(prep, 'exceed the Estimate by more than 15%',
      '⚠ and the 15% hours-overrun clause is not on it either');
    has(prep, '3.8 Changes to Scope.', 'scope changes have their own clause');
    has(prep, 'quoted and agreed with Client in writing before it proceeds',
      '…saying a change is RE-QUOTED, which is what the estimate\'s Terms already say');
  }

  group('⚠ AND THE TWO ARMS THAT DO BILL HOURS KEEP EVERY WORD OF IT');
  {
    // The converse, so the fix cannot be a blanket deletion. A Home Editing job on time and
    // materials is the arm a prep job was wrongly taking.
    const tm = agrDoc('downsizing');
    has(tm, '3.3 Hourly and Project Rates.', 'an hourly job still states its rate card');
    has(tm, '$150/hour', '…with the concierge rate');
    has(tm, '$100/hour', '…and the specialist rate');
    has(tm, '3.8 Adjustment to Estimate.', 'and still carries the 15% notify threshold');
    has(tm, 'exceed the Estimate by more than 15%', '…in as many words');

    const fx = agrDoc('downsizing', { fixedPrice: true });
    has(fx, '3.3 Fixed Project Fee.', 'a fixed-price job states its flat fee');
    has(fx, 'not billed hourly and does not change based on the actual hours worked',
      '…and that it does not move with the hours');
    has(fx, '3.8 Changes to Scope.', 'with its own scope clause');
  }

  group('⚠⚠ THE AGREEMENT AND ITS EXHIBIT A NAME THE SAME PAYMENT TRIGGERS');
  {
    // The estimate is attached to this agreement as Exhibit A and the estate form says the
    // agreement is not valid without it. On a prep job the two named DIFFERENT triggers for
    // the same 25%: the estimate "once the vendor schedule is booked", the agreement
    // "approximately 50% of scope is complete" — an event the estimate's own comment says
    // does not exist on that engagement.
    const prep = agrDoc('prep');
    has(prep, 'Due once the vendor schedule is booked',
      '⚠⚠ the agreement bills the second 25% on the event the estimate names');
    lacks(prep, 'approximately 50% of scope is complete',
      '…and not on a project midpoint prep does not have');
    has(prep, 'Due at show-ready handover of the property', 'and the final on the handover');
    // The estimate's own wording, so the two cannot drift apart unnoticed.
    const src = source();
    has(src, 'Due once the vendor schedule is booked', 'the agreement states it');
    has(src, 'Due once the vendor schedule is booked', 'and the estimate says the same');
    has(fn('clientEstimateHtml'), 'Due once the vendor schedule is booked',
      '⚠ the estimate is where that wording comes from');

    // An ordinary job keeps the midpoint it really has.
    const tm = agrDoc('downsizing');
    has(tm, 'Midpoint Payment (25%)', 'an ordinary job still has a midpoint row');
    has(tm, 'approximately 50% of scope is complete', '…billed on the scope midpoint');
  }

  group('⚠ A CHANGE ORDER CANNOT CARRY A COST, SO NO CLAUSE SAYS IT DOES');
  {
    // `amount`, `originalTotal` and `newTotal` were deleted from the record on 2026-09-11 —
    // not retired, deleted — so a clause charging a COST through a Change Order describes a
    // mechanism the app cannot produce. §7.2 named the two real routes instead.
    lacks(agr, 'may be charged to Client via Change Order',
      '⚠ the hazardous-conditions clause no longer charges a cost through one');
    has(agr, 'billed as set out in Section 3.3',
      '…it points at the basis clause, which is what makes one sentence true on all three arms');
    has(agr, 'billed to Client directly by that specialist',
      '…and names the third-party route for remediation work');
    // Prep's §3.3 says no hours are billed, so the pointer resolves correctly there too.
    has(agrDoc('prep'), 'billed as set out in Section 3.3', 'including on prep');
  }
};
