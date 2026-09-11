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
// ⚠ THERE WAS NO COMMITTED COVERAGE OF THIS INTERACTION ANYWHERE. 3432 checks and not one
// had put a discount on a rush job. That is why this file exists: every case below drives
// the real arithmetic and asserts what the engagement COLLECTS.

const { sandbox, source, fn } = require('./harness');

// ── the estimator's own arithmetic, stated once so the tests read as arithmetic ──────
const SERVICES = 19940;                        // tcFee 12000 + psFee 6000 + materials 1940
const LABOUR   = 18000;                        // tcFee + psFee — the discount base
const RUSH     = Math.round(SERVICES * 0.20);  // 3988
const DISC     = Math.round(LABOUR * 0.10);    // 1800
const AGREED   = SERVICES + RUSH - DISC;       // 22128 — premium first, discount after

const EST = {
  jobId: 1, tcFee: 12000, psFee: 6000, pkgCost: 1940, smf: 0, prepFee: 0,
  havellinTotalFull: SERVICES, havellinTotal: SERVICES + RUSH,
  tcRate: 150, psRate: 100, totTC: 80, totPS: 60, svc: 'cleanout',
  discountPct: 0, discountAmt: 0, fixedPrice: false,
  rush: true, rushPct: 0.20, rushAmt: RUSH,
  vendors: [], prepItems: [], preparedBy: 'Anthony Graziano',
};
const est = (over) => Object.assign({}, EST, over || {});

const DISCOUNT_FNS = ['discountPreview', 'estPreDiscountTotal'];
const DISCOUNT_VARS = ['MAX_DISCOUNT_PCT'];

// ── the real client estimate, so the document a client reads is what is asserted ─────
const CE_FNS = ['clientEstimateHtml', 'fmt', 'esc', 'paymentSplit', 'conciergePhonesText',
                'conciergePhones', 'estimateIsFeeOnly', 'clientJobPlanSection',
                'proposedPlanRow', '_cePhases'];
const CE_VARS = ['SMF_PCT', 'RUSH_PCT', 'SVC_LABELS', 'HAVELLIN_OFFICE_PHONE',
                 'NON_MOBILE_NUMBERS'];
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
          '_coMoney', 'fmt', 'getVendorActuals', 'samePerson', 'canonPersonName',
          '_invVendorFeeSentence', 'prepFeeRate', 'vendorGroupOfLine', 'resolveJobVendor',
          'coordHrsFor', 'prepLineTCHrs', 'vendorLineTCHrs', 'esc', 'fmtDate2', 'svcLabelOf',
          'conciergePhones', 'conciergePhonesText', 'assignedTCContact', 'vendorCats',
          'vendorPrimaryCat', 'estimateIsFeeOnly', 'isDecedentJob'],
    vars: ['SMF_PCT', 'RUSH_PCT', 'SVC_LABELS', 'DEPT_EMAILS', 'HAVELLIN_OFFICE_PHONE',
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
// What the engagement actually collects across the three stages, derived the way the app
// derives it — the deposit and midpoint from the estimate, the final reconciling.
function collected(e, logs) {
  const c = invCtx(e, logs);
  const dep = c.invoiceHtml(JOB, 'deposit');
  const mid = c.invoiceHtml(JOB, 'midpoint');
  const fin = c.invoiceHtml(JOB, 'final');
  return { deposit: Math.round(dep.amtDue), midpoint: Math.round(mid.amtDue),
           final: Math.round(fin.amtDue), variancePct: fin.variancePct,
           requiresApproval: fin.requiresApproval,
           total: Math.round(dep.amtDue) + Math.round(mid.amtDue) + Math.round(fin.amtDue),
           html: fin.html };
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
    eq(p.discount, DISC, 'the discount is 10% of LABOUR, asked and answered — not of the total');
    eq(p.revised, AGREED,
       '⚠⚠ and the revised total keeps the premium. It used to come back $3,988 short, which '
       + 'is the entire expedited-delivery charge');

    // The premium survives at every offerable discount, not just the one case above.
    for (let pct = 1; pct <= d.MAX_DISCOUNT_PCT; pct++) {
      const r = d.discountPreview(est(), pct);
      eq(r.revised, SERVICES + RUSH - Math.round(LABOUR * pct / 100),
         `${pct}% off leaves the premium untouched`);
    }

    // A job with no premium is unaffected — the fix must not move the ordinary case.
    const plain = est({ rush: false, rushAmt: 0, havellinTotal: SERVICES });
    eq(d.discountPreview(plain, 10).revised, SERVICES - DISC,
       'a job with no expedited delivery discounts exactly as it always did');
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
    eq(a.currentEstimate.havellinTotal, SERVICES + RUSH - Math.round(LABOUR * 0.05),
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

    // Same job with no discount: the premium is identical, which is the whole point.
    const plain = collected(est());
    eq(plain.total, SERVICES + RUSH, 'undiscounted, the same job collects services + premium');
    has(plain.html, '+ $3,988', 'and the premium is the same figure either way');

    // And with no premium at all, the discount behaves exactly as before.
    const noRush = collected(est({ rush: false, rushAmt: 0, discountPct: 10,
                                   discountAmt: DISC, havellinTotal: SERVICES - DISC }));
    eq(noRush.total, SERVICES - DISC, 'a discounted job with no rush is untouched by any of this');
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
    eq(over.total, grossOver + Math.round(grossOver * 0.20) - Math.round(23000 * 0.10),
       'twenty more hours each side: the premium and the discount both follow the real labour');
    // ⚠ A TAUTOLOGY WAS HERE ON THE FIRST PASS — `variancePct > 0.15 === requiresApproval`
    // is how the flag is DEFINED, so it could not fail. Pin the figures instead.
    eq(over.total, 27628, '24,940 of services + 4,988 premium − 2,300 discount');
    ok(Math.abs(over.variancePct - 5500 / 22128) < 0.0005,
       'the overrun is the real $5,500 against the agreed $22,128, not a premium artefact');
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
    has(doc, '- $1,800', 'the discount');
    has(doc, '$22,128', '19,940 + 3,988 − 1,800 — the column adds up on the page');

    // The invoice tells the same story in the same order.
    const inv = collected(est({ discountPct: 10, discountAmt: DISC, havellinTotal: AGREED })).html;
    const jRush = inv.indexOf('Expedited Delivery');
    const jDisc = inv.indexOf('Preferred Client Discount');
    ok(jRush >= 0 && jDisc >= 0, 'both rows render on the final invoice');
    ok(jRush < jDisc, 'and the invoice orders them the same way the estimate does');
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

    // The discount base is labour, everywhere, and that is Anthony's answer.
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
