'use strict';
// THE EXPEDITED-DELIVERY PREMIUM AND THE PREFERRED-CLIENT DISCOUNT (2026-09-11).
//
// Anthony, settling the order: "If it's a Rush job, we charge the 20%. If we then have to
// discount the job by a little bit, it comes off of the total — which is the total of
// services plus the 20% for the Rush job." So the premium is charged on the FULL services
// total and the discount is deducted from the result. It used to be the other way round,
// which made a discount shrink the premium as well as the fee.
//
// ⚠⚠ AND THE DEFECT UNDERNEATH IT WAS WORSE THAN THE ORDERING: OFFERING A DISCOUNT DELETED
// THE PREMIUM OUTRIGHT. `discountPreview` started from `havellinTotalFull`, which is the
// services subtotal before BOTH the discount and the premium — so on a job the client had
// agreed at services + 20%, the modal showed the manager the bare services figure and wrote
// back a revised total with the whole premium missing. The deposit was then taken at half of
// a number the client never agreed to, and the ±15% variance gate read the gap as an overrun.
//
// ⚠⚠ AND THE BASE THE PERCENTAGE COMES OFF WAS CORRECTED THE SAME DAY, BY ANTHONY, AFTER THE
// FIRST BUILD SHIPPED: "If it's a hundred thousand dollar job on labor, and we apply a twenty
// percent premium because it's a rush job, that's $120k. A 10% discount is $12k." The first
// build took the percentage off the BARE labour and produced $10,000. So the discount comes
// off the labour GROSSED UP by the premium charged on it — `discountOnLabor` is the one
// definition, and materials, the vendor SMF and the prep fee still stay out of it.
//
// ⚠ THERE WAS NO COMMITTED COVERAGE OF THIS INTERACTION ANYWHERE. 3432 checks and not one
// had put a discount on a rush job. That is why this file exists: every case below drives
// the real arithmetic and asserts what the engagement COLLECTS.

const { sandbox, source, fn } = require('./harness');

// ── the estimator's own arithmetic, stated once so the tests read as arithmetic ──────
const SERVICES = 19940;                        // tcFee 12000 + psFee 6000 + materials 1940
const LABOUR   = 18000;                        // tcFee + psFee — the discount base
const RUSH     = Math.round(SERVICES * 0.20);  // 3988

// ⚠ THE DISCOUNT BASE IS THE LABOUR GROSSED UP BY THE PREMIUM CHARGED ON IT, stated here once
// so every case below reads as arithmetic rather than as a magic number. Built the way the
// premium is billed — labour + round(labour × rate) — not round(labour × 1.2).
const discOn = (labour, pct, rushed) =>
  Math.round((labour + (rushed ? Math.round(labour * 0.20) : 0)) * pct / 100);

const DISC        = discOn(LABOUR, 10, true);  // 2160 — NOT the 1800 a bare-labour base gives
const DISC_NORUSH = discOn(LABOUR, 10, false); // 1800 — the ordinary job is unchanged
const AGREED      = SERVICES + RUSH - DISC;    // 21768 — premium first, discount after

const EST = {
  jobId: 1, tcFee: 12000, psFee: 6000, pkgCost: 1940, smf: 0, prepFee: 0,
  havellinTotalFull: SERVICES, havellinTotal: SERVICES + RUSH,
  tcRate: 150, psRate: 100, totTC: 80, totPS: 60, svc: 'cleanout',
  discountPct: 0, discountAmt: 0, fixedPrice: false,
  rush: true, rushPct: 0.20, rushAmt: RUSH,
  vendors: [], prepItems: [], preparedBy: 'Anthony Graziano',
};
const est = (over) => Object.assign({}, EST, over || {});

const DISCOUNT_FNS = ['estTolerancePctTxt', 'discountPreview', 'estPreDiscountTotal', 'discountOnLabor'];
const DISCOUNT_VARS = ['EST_TOLERANCE_PCT', 'MAX_DISCOUNT_PCT', 'RUSH_PCT'];

// ── the real client estimate, so the document a client reads is what is asserted ─────
const CE_FNS = ['estTolerancePctTxt', 'clientEstimateHtml', 'fmt', 'esc', 'paymentSplit', 'conciergePhonesText',
                'conciergePhones', 'estimateIsFeeOnly', 'clientJobPlanSection',
                'proposedPlanRow', '_cePhases', 'materialsBasisNote', 'discountOnLabor',
                // proposedPlanRow's prep narrative reads the rate rather than printing a 30.
                'prepFeeRate'];
const CE_VARS = ['EST_TOLERANCE_PCT', 'SMF_PCT', 'RUSH_PCT', 'SVC_LABELS', 'HAVELLIN_OFFICE_PHONE',
                 'NON_MOBILE_NUMBERS', 'PREP_FEE_RATE'];
const CE_JOB = { id: 1, svc: 'cleanout', name: 'Butler Estate', address: '69 Beach Blvd' };
function ceDoc(e) {
  return sandbox({ fns: CE_FNS, vars: CE_VARS }).clientEstimateHtml(e, CE_JOB);
}

// ── the real invoice, so what the engagement collects is what is asserted ────────────
const JOB = { id: 1, hvlId: 'HVL-0007', client: 'Butler Estate', svc: 'cleanout',
              address: '69 Beach Blvd', tc: 'Anthony Graziano', status: 'active',
              premium: false, executor: 'Tripp Butler' };
function invCtx(e, logs) {
  return sandbox({
    fns: ['invoiceHtml', 'coHours', 'coHoursTotal', 'coBaselineShift', 'coHoursLabel',
          '_coMoney', 'fmt', 'getVendorActuals', '_srcLineKey', 'samePerson', 'canonPersonName',
          '_invVendorFeeSentence', 'prepFeeRate', 'vendorGroupOfLine', 'resolveJobVendor',
          'coordHrsFor', 'prepLineTCHrs', 'vendorLineTCHrs', 'esc', 'fmtDate2', 'svcLabelOf',
          'conciergePhones', 'conciergePhonesText', 'assignedTCContact', 'vendorCats',
          'vendorPrimaryCat', 'estimateIsFeeOnly', 'isDecedentJob',
          'stagePaidTotal', 'jobPaidTotal', 'jobPayments', 'discountOnLabor', 'estTolerancePctTxt'],
    vars: ['EST_TOLERANCE_PCT', 'SMF_PCT', 'RUSH_PCT', 'SVC_LABELS', 'DEPT_EMAILS', 'HAVELLIN_OFFICE_PHONE',
           'NON_MOBILE_NUMBERS', 'DEFAULT_CONTRACTORS', 'COORD_TOUCHES',
           'COORD_TOUCHES_BY_GROUP', 'COORD_TOUCHES_DEFAULT', 'TOUCH_HRS',
           'DECEDENT_SERVICES', 'PERSON_NAME_ALIASES', 'PREP_FEE_RATE', 'invApproved'],
    stubs: {
      jobLogs: { 1: logs || [{ date: '2026-09-01', activity: 'clearance',
                   members: [{ name: 'Anthony Graziano', role: 'TC', hours: 80 },
                             { name: 'Crew', role: 'PS', hours: 60 }] }] },
      estimateStore: { 1: { estimate: e, approved: true, approvedBy: 'Anthony Graziano' } },
      changeOrders: [], contractors: [], currentEstimate: null,
      currentInvStage: 'final', vendorDirectory: [], jobPlans: {},
    },
  });
}
// What the engagement actually collects across the three stages, walked the way a real job
// is walked: each invoice is rendered, paid in full, and the payment recorded before the next
// one is drawn. Since 2026-09-11 the final reconciles against `job.payments[]`, so a fixture
// that never records a payment would bill the whole job at the final — correct, and useless
// for asking what a normally-paying client is charged.
function collected(e, logs) {
  const at = (stage, payments) => {
    const job = Object.assign({}, JOB, { payments: payments });
    return invCtx(e, logs).invoiceHtml(job, stage);
  };
  const dep = Math.round(at('deposit', []).amtDue);
  const paid1 = [{ stage: 'deposit', amount: dep, date: '2026-08-01', method: 'wire' }];
  const mid = Math.round(at('midpoint', paid1).amtDue);
  const paid2 = paid1.concat([{ stage: 'midpoint', amount: mid, date: '2026-09-01', method: 'wire' }]);
  const fin = at('final', paid2);
  return { deposit: dep, midpoint: mid, final: Math.round(fin.amtDue),
           variancePct: fin.variancePct, requiresApproval: fin.requiresApproval,
           total: dep + mid + Math.round(fin.amtDue), html: fin.html };
}

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();
  const noComments = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ A DISCOUNT MUST NOT DELETE THE PREMIUM');
  {
    const d = sandbox({ fns: DISCOUNT_FNS, vars: DISCOUNT_VARS });

    eq(d.estPreDiscountTotal(est()), SERVICES + RUSH,
       'the figure a discount comes off is services PLUS the premium — that is what the '
       + 'client agreed to pay');

    const p = d.discountPreview(est(), 10);
    eq(p.original, SERVICES + RUSH,
       '⚠ the manager is shown the total the client actually agreed, not the bare services '
       + 'subtotal — it read $19,940 on a job agreed at $23,928');
    eq(p.discount, DISC,
       '⚠⚠ the discount is 10% of the labour INCLUDING the premium charged on it — $2,160 on '
       + '$21,600, not the $1,800 that 10% of the bare $18,000 gives. Anthony\'s correction');
    eq(p.revised, AGREED,
       '⚠⚠ and the revised total keeps the premium. It used to come back $3,988 short, which '
       + 'is the entire expedited-delivery charge');

    // The premium survives at every offerable discount, not just the one case above.
    for (let pct = 1; pct <= d.MAX_DISCOUNT_PCT; pct++) {
      const r = d.discountPreview(est(), pct);
      eq(r.revised, SERVICES + RUSH - discOn(LABOUR, pct, true),
         `${pct}% off leaves the premium untouched`);
    }

    // A job with no premium is unaffected — the fix must not move the ordinary case.
    const plain = est({ rush: false, rushAmt: 0, havellinTotal: SERVICES });
    eq(d.discountPreview(plain, 10).revised, SERVICES - DISC_NORUSH,
       '⚠ a job with no expedited delivery discounts exactly as it always did — there is no '
       + 'premium to gross up, so the base is the bare labour and the figure has not moved');
  }

  group('⚠ A LEGACY RECORD CARRIES THE PREMIUM IN A DIFFERENT FIELD, and the two arms differ');
  {
    const d = sandbox({ fns: DISCOUNT_FNS, vars: DISCOUNT_VARS });
    // No havellinTotalFull: havellinTotal already carries the premium, so adding rushAmt
    // to it would count the premium twice. Collapsing the two arms is the trap.
    const legacy = { havellinTotal: SERVICES + RUSH, discountAmt: 0, rushAmt: RUSH,
                     tcFee: 12000, psFee: 6000, fixedPrice: false };
    eq(d.estPreDiscountTotal(legacy), SERVICES + RUSH,
       'a record with no havellinTotalFull is NOT given the premium a second time');

    // Already discounted once: havellinTotal is net, so the discount is added back.
    const already = { havellinTotal: AGREED, discountAmt: DISC, rushAmt: RUSH,
                      tcFee: 12000, psFee: 6000, fixedPrice: false };
    eq(d.estPreDiscountTotal(already), SERVICES + RUSH,
       'and a record already discounted resolves to the same pre-discount figure');

    eq(d.estPreDiscountTotal({ fixedPrice: true, fixedAmount: 30000, rushAmt: 5000 }), 30000,
       '⚠ a fixed fee IS the whole Havellin charge and already contains the premium — '
       + 'nothing is added to it');
    eq(d.estPreDiscountTotal(null), 0, 'no estimate is 0, not a throw');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ TWO DISCOUNT REVISIONS IN A ROW MUST NOT COMPOUND THE PREMIUM');
  {
    // applyDiscountRevision used to write the pre-discount total into havellinTotalFull.
    // That field means "services before BOTH", so once it carried the premium the next
    // revision added the premium on top of it again.
    const pct = { value: 10 };
    const a = sandbox({
      fns: DISCOUNT_FNS.concat(['applyDiscountRevision']),
      vars: DISCOUNT_VARS,
      stubs: {
        document: { getElementById: (id) => (id === 'dm-pct' ? pct : null) },
        currentEstimate: est(),
        jobs: [{ id: 1, status: 'approved' }],
        saveJobs() {}, syncJobToSheets() {}, saveEstimateState() {},
        closeDiscountModal() {}, renderClientEstimate() {}, updateApprovalUI() {},
        notifyManagerForApproval() {}, showFB() {},
      },
    });

    a.applyDiscountRevision();
    eq(a.currentEstimate.havellinTotal, AGREED, 'the first revision lands on the agreed total');
    eq(a.currentEstimate.havellinTotalFull, SERVICES,
       '⚠ havellinTotalFull still means services before BOTH — the premium is not folded in');

    pct.value = 10;
    a.applyDiscountRevision();
    eq(a.currentEstimate.havellinTotal, AGREED,
       '⚠⚠ re-offering the same 10% lands on the same total — it used to add the premium again');
    eq(a.currentEstimate.havellinTotalFull, SERVICES, 'and the field still means what it meant');

    pct.value = 5;
    a.applyDiscountRevision();
    eq(a.currentEstimate.havellinTotal, SERVICES + RUSH - discOn(LABOUR, 5, true),
       'changing the offer re-derives from the same base rather than stacking on the last one');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ WHAT THE ENGAGEMENT COLLECTS — the claim that matters');
  {
    const discounted = est({ discountPct: 10, discountAmt: DISC, havellinTotal: AGREED });

    const c = collected(discounted);
    eq(c.total, AGREED,
       '⚠⚠ a rush job with a 10% discount, worked exactly to estimate, collects the agreed '
       + 'total EXACTLY — the premium is billed on the gross services, not the discounted ones');
    eq(c.variancePct, 0,
       '⚠ and it reports ZERO variance. Billing the premium on the net figure made a job that '
       + 'ran exactly to estimate read as under-estimate, and print a credit');
    ok(!c.requiresApproval, 'so no manager PIN is demanded on a job that did nothing wrong');

    // The premium itself, on the final, is 20% of the GROSS services.
    has(c.html, '+ $3,988',
        'the expedited-delivery line on the final invoice is 20% of the services total');
    lacks(c.html, '+ $3,628',
          '⚠ NOT 20% of the discounted total — that is the $360 the client was under-billed');

    // ⚠⚠ AND THE DISCOUNT ROW ON THE INVOICE CREDITS THE GROSSED BASE. This is the driven
    // check on the ordering constraint inside invoiceHtml: `_rushRate` is read by _netLabor,
    // so declaring it below the discount block leaves it `undefined` there and this reverts
    // to crediting the bare labour, silently, on the document the client pays.
    has(c.html, '− $2,160', 'the final invoice credits 10% of labour PLUS its premium');
    lacks(c.html, '− $1,800', '⚠ not 10% of the bare labour');
    has(c.html, 'and the expedited-delivery premium charged on it',
        'and the row names the base it came off');

    // Same job with no discount: the premium is identical, which is the whole point.
    const plain = collected(est());
    eq(plain.total, SERVICES + RUSH, 'undiscounted, the same job collects services + premium');
    has(plain.html, '+ $3,988', 'and the premium is the same figure either way');

    // And with no premium at all, the discount behaves exactly as before.
    const noRush = collected(est({ rush: false, rushAmt: 0, discountPct: 10,
                                   discountAmt: DISC_NORUSH,
                                   havellinTotal: SERVICES - DISC_NORUSH }));
    eq(noRush.total, SERVICES - DISC_NORUSH,
       'a discounted job with no rush is untouched by any of this');
  }

  group('the premium still trues up to the hours actually worked');
  {
    // The RATE is pinned; the AMOUNT follows the services delivered. A job that runs over
    // pays the premium on what it really cost, which is what "20% of services" means.
    const discounted = est({ discountPct: 10, discountAmt: DISC, havellinTotal: AGREED });
    const over = collected(discounted, [{ date: '2026-09-01', activity: 'clearance',
      members: [{ name: 'Anthony Graziano', role: 'TC', hours: 100 },
                { name: 'Crew', role: 'PS', hours: 80 }] }]);
    const grossOver = 15000 + 8000 + 1940;                    // 100×150 + 80×100 + materials
    eq(over.total, grossOver + Math.round(grossOver * 0.20) - discOn(23000, 10, true),
       'twenty more hours each side: the premium and the discount both follow the real labour');
    // ⚠ A TAUTOLOGY WAS HERE ON THE FIRST PASS — `variancePct > 0.15 === requiresApproval`
    // is how the flag is DEFINED, so it could not fail. Pin the figures instead.
    eq(over.total, 27168, '24,940 of services + 4,988 premium − 2,760 discount');
    ok(Math.abs(over.variancePct - 5400 / AGREED) < 0.0005,
       'the overrun is the real $5,400 against the agreed $21,768, not a premium artefact');
    ok(over.requiresApproval,
       'and 24.9% over trips the manager PIN, which is exactly what that gate is for');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ THE DOCUMENTS PRINT THE PREMIUM ABOVE THE DISCOUNT, because that is the order');
  {
    // Printed the other way round a client reads the 20% as applied to the already
    // discounted figure — the rule the app followed until today and no longer does.
    const doc = ceDoc(est({ discountPct: 10, discountAmt: DISC, havellinTotal: AGREED }));
    const iSub  = doc.indexOf('Subtotal (before discount)');
    const iRush = doc.indexOf('Expedited Delivery');
    const iDisc = doc.indexOf('Preferred Client Discount');
    const iTot  = doc.indexOf('Havellin Services Total');
    ok(iSub >= 0 && iRush >= 0 && iDisc >= 0 && iTot >= 0, 'all four rows render');
    ok(iSub < iRush, 'the subtotal comes first');
    ok(iRush < iDisc, '⚠ the premium is charged BEFORE the discount is taken off');
    ok(iDisc < iTot, 'and the total closes the column');

    // The column has to reconcile, not merely be ordered.
    has(doc, '$19,940', 'subtotal before the discount is the services total');
    has(doc, '+ $3,988', 'the premium');
    has(doc, '- $2,160', 'the discount');
    has(doc, '$21,768', '19,940 + 3,988 − 2,160 — the column adds up on the page');
    lacks(doc, '- $1,800',
          '⚠ NOT 10% of the bare labour — that is the $360 the client would be short-credited');
    has(doc, 'including the expedited-delivery premium charged on them',
        '⚠ and the row SAYS which base the percentage came off, on a document where the two '
        + 'readings differ by real money');

    // The invoice tells the same story in the same order.
    const inv = collected(est({ discountPct: 10, discountAmt: DISC, havellinTotal: AGREED })).html;
    const jRush = inv.indexOf('Expedited Delivery');
    const jDisc = inv.indexOf('Preferred Client Discount');
    ok(jRush >= 0 && jDisc >= 0, 'both rows render on the final invoice');
    ok(jRush < jDisc, 'and the invoice orders them the same way the estimate does');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group("⚠⚠ ANTHONY'S WORKED EXAMPLE, PINNED — $100k of labour, 20% premium, 10% off");
  {
    const d = sandbox({ fns: DISCOUNT_FNS, vars: DISCOUNT_VARS });

    // "If it's a hundred thousand dollar job on labor, and we apply a twenty percent premium
    //  because it's a rush job, that's $120k. A 10% discount is $12k." Verbatim, as arithmetic.
    eq(d.discountOnLabor(100000, 0.20, 10), 12000, '⚠⚠ $12,000 — the sentence, as arithmetic');
    eq(d.discountOnLabor(100000, 0, 10), 10000,
       '⚠ and $10,000 with no premium to gross up — which is what the first build charged on '
       + 'BOTH, and is the defect this group exists to pin');

    const big = { tcFee: 60000, psFee: 40000, pkgCost: 0, smf: 0, prepFee: 0,
                  havellinTotalFull: 100000, havellinTotal: 120000,
                  rush: true, rushPct: 0.20, rushAmt: 20000, fixedPrice: false };
    const p = d.discountPreview(big, 10);
    eq(p.original, 120000, 'the manager is shown the $120,000 the client agreed');
    eq(p.discount, 12000, '⚠⚠ ten percent of $120,000');
    eq(p.revised, 108000, 'so the revised total is $108,000, not the $110,000 it shipped as');
    eq(p.basis, 'Discount (labor fees + expedited premium)',
       '⚠ and the modal NAMES the base, because on a rush job it is not the base an ordinary '
       + 'job uses and a manager approving the offer has to see which figure it came off');

    // ⚠ THE CARVE-OUT SURVIVES, and Anthony's own example cannot show it — there labour IS the
    // entire services total, so "10% of labour + premium" and "10% of everything" agree. Put
    // $20,000 of materials on the same job and they stop agreeing by $2,400.
    const withStuff = Object.assign({}, big, { pkgCost: 20000, havellinTotalFull: 120000,
                                               havellinTotal: 144000, rushAmt: 24000 });
    eq(d.discountPreview(withStuff, 10).discount, 12000,
       '⚠ the $20,000 materials package and the $4,000 of premium charged on it are NOT '
       + 'discounted — 10% of the whole services total would be $14,400');
    eq(d.discountPreview(withStuff, 10).revised, 132000,
       'and the client pays 144,000 − 12,000');

    // ⚠ THE HELPER DOES NOT CLAMP TO MAX_DISCOUNT_PCT, and that is deliberate. The cap belongs
    // on the two places a percentage is ENTERED. Clamping here as well would make the INVOICE
    // credit 15% against an estimate a client accepted at 20% — the cap was lowered from 30%
    // to 15% on 2026-08-01, so a job quoted before that is exactly the case.
    eq(d.discountOnLabor(18000, 0, 20), 3600,
       '⚠ an approved 20% is billed at 20%, not clipped to the current cap');
    eq(d.discountOnLabor(18000, 0, 0), 0, 'no discount is zero, not a rounding artefact');
    eq(d.discountOnLabor(0, 0.20, 10), 0, 'no labour is zero');

    // A fixed fee is the whole Havellin charge and already contains the premium.
    eq(d.discountPreview({ fixedPrice: true, fixedAmount: 120000 }, 10).discount, 12000,
       'a fixed fee discounts on itself — nothing is grossed up, it is already gross');
    eq(d.discountPreview({ fixedPrice: true, fixedAmount: 120000 }, 10).basis,
       'Discount (fixed fee)', 'and says so');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('one rule, stated once');
  {
    // The estimator and the invoice must not each carry their own opinion of the order.
    const calc = noComments(fn('calcAll'));
    has(calc, 'Math.round(havellinTotal * RUSH_PCT)',
        'the estimator charges the premium on the full services total');
    lacks(calc, '(havellinTotal - discountAmt) * RUSH_PCT',
          '⚠ and never on the discounted one — that expression IS the defect');
    has(calc, 'havellinTotal + rushAmt - discountAmt',
        'and the discount comes off the result');

    const invBody = noComments(fn('invoiceHtml'));
    has(invBody, 'Math.round(_midGross * _rushRate)', 'the invoice bills the midpoint premium on gross');
    has(invBody, 'Math.round(_finalGross * _rushRate)', 'and the final premium on gross');
    lacks(invBody, 'Math.round(_midServices * _rushRate)',
          '⚠ never on the net figure — the two surfaces cannot disagree about the order');
    lacks(invBody, 'Math.round(_finalServices * _rushRate)', 'on either stage');

    // ⚠ ONE DEFINITION OF THE DISCOUNT BASE. Two of these three used to hold their own copy
    // of `labor * pct / 100`, which is how the modal a manager approves and the invoice a
    // client pays come to disagree about what was offered.
    // ⚠ THE ESTIMATOR'S CALL IS PINNED EXACTLY, and the reason is worth recording: reverting
    // the rate argument to a bare 0 — the whole defect, the estimator quietly going back to
    // discounting bare labour — came back GREEN against every other check in this file,
    // because nothing in the suite drives calcAll (it reads three dozen DOM elements, and the
    // established pattern here is to pin it at source). The driven proof is the browser run.
    has(calc, 'var discountAmt = discountOnLabor(laborBase, isRush ? RUSH_PCT : 0, discountPct)',
        "⚠⚠ the estimator grosses the labour up by THIS job's rush rate, not by a constant");
    has(noComments(fn('discountPreview')), 'discountOnLabor(laborBase,', 'so does the modal');
    has(invBody, 'discountOnLabor(g, _rushRate, discountPct)', 'and so does the invoice');
    lacks(calc, 'Math.round(laborBase * discountPct / 100)',
          '⚠ no hand-rolled copy survives in the estimator');
    lacks(invBody, 'Math.round(laborBase * discountPct / 100)', 'nor in the invoice');
    lacks(invBody, 'g - Math.round(g * discountPct / 100)',
          "⚠ nor inside _netLabor, which is where the invoice's own copy lived");
    ok((src.match(/discountOnLabor\(/g) || []).length >= 5,
       'defined once and read from every surface that takes a percentage off labour');

    // ⚠ THE TWO INTERNAL BENCHMARKS HOLD THE PREMIUM OUT — the pricing reference band and the
    // blended-rate badge. Both ask what this job costs for a house this size / an hour of our
    // time, and an expedited-delivery surcharge is neither; holding the premium out of the
    // total while leaving its share of the discount in would understate both. Never billed.
    has(calc, 'var discountExRush = discountOnLabor(laborBase, 0, discountPct)',
        'the ex-premium discount is derived from the same definition, at a rate of zero');
    has(calc, 'updateRefBox(havellinTotal - discountExRush)',
        'the reference band compares the job without the expedite');
    has(calc, 'tcFee + psFee - discountExRush', 'and so does the blended-rate badge');
    lacks(calc, 'updateRefBox(havellinTotalDiscounted - rushAmt)',
          '⚠ subtracting the premium back out of the discounted total leaves the premium\'s '
          + 'share of the discount in, which understates both readouts');

    // The base is labour plus its premium — never materials, the vendor SMF or the prep fee.
    has(noComments(fn('discountPreview')), '(est.tcFee || 0) + (est.psFee || 0)',
        'the modal discounts labour');
    has(calc, 'var laborBase = tcFee + psFee', 'the estimator discounts labour');
    has(invBody, 'var laborBase = tcFee + psFee;', 'and so does the invoice');

    // estPreDiscountTotal is the one definition — a second copy is how they drift.
    const uses = (src.match(/estPreDiscountTotal\(/g) || []).length;
    ok(uses >= 2, 'estPreDiscountTotal is defined once and read, rather than inlined');
    lacks(noComments(fn('discountPreview')), 'est.havellinTotalFull',
          '⚠ discountPreview no longer reaches past the shared definition to the raw field');
  }
};
