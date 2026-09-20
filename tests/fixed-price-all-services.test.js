'use strict';
// FIXED PRICE IS AVAILABLE ON EVERY ENGAGEMENT (2026-09-20).
//
// ⚠⚠ THE RULE THAT CAME OFF, AND WHY IT IS NOT A RELAXATION. `isTMOnly(svcKey)` returned true
// on probate and contested probate: the toggle was disabled, `calcAll` cleared a stale checked
// box with a notice, and the Build Estimate panel showed the flat figure as an internal
// reference nobody outside the office ever saw. Its stated ground was that the Personal
// Representative's expenses are reviewed by the court and "a flat fee that can't be tied back
// to logged time is exactly what a judge or an heir's counsel questions". That sentence stopped
// being true the same morning: hours are logged on EVERY job now, fixed price included and
// mandatory for the concierge. The log exists on a flat-fee probate exactly as on a T&M one —
// the fee is simply not billed FROM it.
//
// ⚠⚠ AND THE DOCUMENTS WERE ALREADY WRONG ON THIS, ON JOBS THAT SHIPPED. Estate Settlement has
// been quotable fixed all along and uses the SAME estate/probate agreement form, so three
// clauses carrying hours language on a firm fee were live before this build: §4.1's change-order
// trigger, §8.1's whole termination list, and the client estimate's close-out stage. Opening
// probate up did not create them; it made them the common case.
//
// ⚠ THE ONE ENGAGEMENT WITH NO TOGGLE IS HOME PREP, AND IT IS A DIFFERENT KIND OF RULE.
// computeEngineV3 zeroes every hour on prep and its revenue is prepFeeRate() of vendor spend,
// so there is no hourly basis for a flat fee to replace. `isPrep` gates it in calcAll.

const { sandbox, source, fn } = require('./harness');

const AGR_FNS = ['marketingOptOutBlock', 'marketingUseParas', '_mktClause', 'estTolerancePctTxt',
                 'agreementHtml', 'probateAgreementHtml', 'agrBillingRates', 'materialsBasisNote',
                 'fmt', 'esc', 'paymentSplit', 'isDecedentJob', 'agrSection', '_agrHasPrepVendors',
                 'estimateDocScope', 'svcHasDocStep', 'docScopeDef', '_agrScopeServices',
                 '_agrMidpointTrigger', '_agrProbateCompliance', 'esignAnchor'];
const AGR_VARS = ['EST_TOLERANCE_PCT', 'SMF_PCT', 'DECEDENT_SERVICES', 'agrApproved',
                  'HAVELLIN_OFFICE_PHONE', 'JOB_STEPS', 'DOC_SCOPES', 'ESIGN_ANCHORS'];

const EST = {
  jobId: 1, tcFee: 18500, psFee: 12500, pkgCost: 1500, pkgLabel: 'Estate Premium — $1,500',
  smf: 0, prepFee: 0, havellinTotal: 40000, totTC: 100, totPS: 100,
  tcRate: 185, psRate: 125, discountPct: 0, fixedPrice: false, rush: false,
  vendors: [], prepItems: [], rooms: [], collections: [], vehicles: [],
};
const est = (over) => Object.assign({}, EST, over || {});
const agrCtx = () => sandbox({ fns: AGR_FNS, vars: AGR_VARS,
                               stubs: { estimateStore: {}, currentEstimate: null } });

const PROBATE  = { id: 1, hvlId: 'HVL-0007', name: 'Margaret Doe', svc: 'probate',
                   executor: 'Tripp Butler', addr: '69 Beach Blvd', city: 'Palm Beach',
                   zip: '33480', deathDate: '2026-01-15', docLevel: 'formal' };
const LIVING   = { id: 2, hvlId: 'HVL-0008', name: 'Jane Doe', svc: 'downsizing',
                   addr: '12 Ocean Blvd', city: 'Palm Beach', zip: '33480' };

const text = (h) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const probateDoc  = (job, e) => text(agrCtx().probateAgreementHtml(job, e));
const standardDoc = (job, e) => text(agrCtx().agreementHtml(job, e));

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();
  const noComments = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ NO SERVICE-KEYED REFUSAL SURVIVES — stated as the converse, because a label can be renamed');
  {
    // The requirement is not "isTMOnly is gone" — it is that nothing anywhere withholds the
    // flat-fee option by service key. A net over the live source catches a replacement under
    // another name, which a name check could not.
    const live = noComments(src);
    lacks(live, 'isTMOnly', 'no live reference to the retired gate survives, under that name');
    lacks(live, '_tmOnly', 'nor the local it was read into');
    lacks(live, '_fixedCleared', 'nor the flag that reported a box being cleared');
    lacks(live, 'fixed-price-warn', 'and the notice element it wrote into is gone with it');

    // The two functions that decide whether a flat fee is reachable must not mention the two
    // matter types at all. This is the assertion that fails if the rule creeps back.
    const toggle = noComments(fn('toggleFixedPrice'));
    lacks(toggle, 'probate', 'toggleFixedPrice names no matter type');
    lacks(toggle, 'contested', 'nor contested probate');
    lacks(toggle, 'e-svc', 'and no longer reads the service at all');

    // calcAll keeps exactly one exclusion and it is prep. Driven on the source because calcAll
    // reads three dozen DOM elements; the browser run is the driven proof.
    const calc = noComments(fn('calcAll'));
    ok(/if \(isPrep\) isFixed = false;/.test(calc), 'calcAll withholds fixed mode on prep');
    // Counted, not merely present: a SECOND withdrawal site is how a service exclusion comes
    // back beside the prep one without anything above noticing.
    eq(calc.split('isFixed = false').length - 1, 1, 'and there is exactly one withdrawal site');

    // ⚠ AND THE LOCK MUST STILL WIN. The first cut of this replaced `_fxEl.disabled = _tmOnly`
    // with `_fxEl.disabled = false`, which reads as tidying and is not: applyEstimateLock
    // disables every input in #panel-estimate on a SUBMITTED or APPROVED estimate and calcAll
    // runs after it, so that line hands the billing basis back to anyone looking at an estimate
    // a manager is reviewing — and leaves the data-lock-restore bookkeeping inconsistent too.
    lacks(calc, "_fxEl.disabled", 'calcAll never writes the toggle\'s disabled state');
    has(noComments(fn('applyEstimateLock')), "el.disabled = true",
        'and the estimate lock is still the only thing that disables it');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ THE CONTINGENCY BANDS ARE QUOTED FIGURES NOW — 25 / 35 kept deliberately, not left behind');
  {
    const c = sandbox({ fns: ['fixedPriceBuffer'] });
    eq(c.fixedPriceBuffer('probate'), 0.25, 'probate carries 25%');
    eq(c.fixedPriceBuffer('contested_probate'), 0.35, 'contested carries 35%');
    eq(c.fixedPriceBuffer('cleanout'), 0.20, 'Estate Settlement 20%');
    eq(c.fixedPriceBuffer('downsizing'), 0.20, 'and the living-client services 20%');
    ok(c.fixedPriceBuffer('contested_probate') > c.fixedPriceBuffer('probate'),
       'contested is buffered wider than plain probate');

    // ⚠ THE COMMENT CALLING THEM "reference only — T&M billed" WENT WITH THE RULE. Leaving it
    // would tell the next reader these numbers reach nobody, on the day they started printing
    // on a personal representative's own page.
    const buf = fn('fixedPriceBuffer');
    lacks(buf, 'reference only', 'the reference-only annotation is gone from the table');

    // Driven end to end: the suggested fee really is the hourly basis × the band, so a probate
    // matter quotes higher than the same work as an Estate Settlement.
    const fee = (svc) => Math.round(40000 * (1 + c.fixedPriceBuffer(svc)));
    eq(fee('cleanout'), 48000, '$40,000 of hourly basis suggests $48,000 on Estate Settlement');
    eq(fee('probate'), 50000, '$50,000 on probate');
    eq(fee('contested_probate'), 54000, 'and $54,000 on contested probate');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ THE ESTATE AGREEMENT ON A FIXED-PRICE PROBATE — driven on the real builder');
  {
    const fixed = probateDoc(PROBATE, est({ fixedPrice: true, fixedAmount: 50000 }));
    const tm    = probateDoc(PROBATE, est({ fixedPrice: false }));

    has(fixed, 'Fee Structure', '§3.1 is headed Fee Structure on a firm fee');
    lacks(fixed, 'Hourly Rate Structure', 'and no longer calls itself an hourly rate structure');
    has(tm, 'Hourly Rate Structure', 'while the T&M form is untouched');

    // ⚠ THE RATE CARD STAYS, and that is load-bearing rather than an oversight: the Fixed
    // Project Fee paragraph says the hourly rates "apply only to Change-Order work", so
    // stripping them leaves a change-order mechanism with no rate to price it at.
    has(fixed, '$185 / hour', 'the rate card is still printed on a fixed-fee contract');
    has(fixed, 'apply only to Change-Order work', 'because the change-order clause prices off it');
    has(fixed, 'fixed price of $40,000', 'and the fee itself is stated');

    // §4.1 — an hours trigger cannot fire on a fee that does not move with hours.
    lacks(fixed, 'Actual hours projected to exceed estimate',
          'no hours-overrun change-order trigger on a fixed fee');
    has(fixed, 'beyond the scope of work described in Exhibit A',
        'the trigger is a change in scope instead');
    has(tm, 'Actual hours projected to exceed estimate', 'the T&M form keeps its hours trigger');

    // §8.1 — the termination earn-out.
    lacks(fixed, 'responsible for all hours worked',
          '§8.1 no longer measures the exit in hours worked');
    lacks(fixed, 'final invoice reflecting actual hours and materials',
          'nor promises an hours-and-materials final');
    lacks(fixed, 'non-refundable if termination occurs after project start',
          'and the undefined "after project start" qualifier is gone');
    has(fixed, 'earned in full on signature of this Agreement and is not refundable',
        'the deposit is earned at signature, which is what protects it');
    has(fixed, 'Seventy-five percent (75%) of the fixed fee is earned once the midpoint milestone',
        '75% is earned at the midpoint milestone');
    has(fixed, 'full fixed fee is earned on completion', 'and the whole fee on completion');
    has(fixed, 'payment schedule in Section 3.3',
        'anchored to the schedule the client already signed, not a new calculation');
    has(fixed, 'cannot be cancelled without charge',
        'non-cancelable vendor commitments ride with it');
    has(fixed, 'No part of the fee is calculated from hours worked',
        'and it says outright that no part of it comes from hours');

    // ⚠ "FOR CAUSE" IS DEFINED AND CURABLE. Without this the earn-out protects nothing: every
    // convenience termination gets relabelled as cause and the deposit goes back anyway.
    has(fixed, 'material breach', 'cause is a material breach');
    has(fixed, 'seven (7) days', 'with seven days to cure');
    has(fixed, 'written notice describing it', 'described in writing');
    has(fixed, 'refund any amount it holds above the portion earned',
        'and only then is the balance refunded');

    // The T&M form keeps every one of its own bullets.
    has(tm, 'responsible for all hours worked', 'T&M §8.1 is untouched');
    has(tm, 'non-refundable if termination occurs after project start', 'including its deposit bullet');
    lacks(tm, 'Seventy-five percent (75%) of the fixed fee', 'and carries no earn-out');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ THE LIVING-CLIENT AGREEMENT REFUNDED THE DEPOSIT ON A FIXED FEE — §12.2 and §12.4');
  {
    const fixed = standardDoc(LIVING, est({ fixedPrice: true, havellinTotal: 24000 }));
    const tm    = standardDoc(LIVING, est({ fixedPrice: false }));

    // §12.4 promised a refund and said nothing about the deposit being earned. On a flat fee
    // terminated early, "if the deposit exceeds the amount owed" hands most of the 50% back —
    // the opposite of the one thing this build was asked to protect.
    lacks(fixed, 'refund the unused balance', '§12.4 no longer promises the unused balance back');
    has(fixed, 'deposit is earned on signature and is not refundable', 'it is earned at signature');
    has(fixed, 'Section 12.3', 'with the cure mechanism cross-referenced');
    has(tm, 'refund the unused balance', 'and the T&M clause is untouched');

    // §12.2 — the same earn-out, against §3.2 (this form's payment schedule).
    lacks(fixed, 'pay Contractor for all Services performed and costs incurred',
          '§12.2 drops the services-performed measure on a fixed fee');
    has(fixed, 'payment schedule in Section 3.2', 'and anchors to this form\'s own schedule');
    has(fixed, 'seventy-five percent (75%) of the fixed project fee is earned',
        'stating the midpoint step');
    has(fixed, 'does not vary with the time Contractor spends',
        'and that the fee does not move with time spent');
    has(tm, 'pay Contractor for all Services performed', 'T&M §12.2 is untouched');

    // ⚠ THE CROSS-REFERENCES MUST NAME A REAL SECTION. §12.3 really does carry
    // notice-and-cure on this form, which is why it can be cited here — the estate form's §8.2
    // does not, which is why that one states the mechanism inline instead.
    has(fixed, '12.3 Termination for Cause', 'the cited section exists on this form');
    has(fixed, 'fails to cure within 7 days', 'and it is the one that carries notice and cure');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ THE CLIENT ESTIMATE PROMISED AN HOURS RECONCILIATION ON A FLAT FEE — live before today');
  {
    const c = sandbox({
      fns: ['estTolerancePctTxt', '_cePhases', 'estimateDocScope', 'docScopeDef',
            'svcHasDocStep', 'isDecedentJob'],
      vars: ['EST_TOLERANCE_PCT', 'JOB_STEPS', 'DOC_SCOPES', 'DECEDENT_SERVICES'],
    });
    const phases = (over) => c._cePhases(
      Object.assign({ svc: 'probate', docScope: 'full', vendors: [], collections: [] }, over),
      PROBATE);
    const blob = (p) => JSON.stringify(p);

    const fixedP = blob(phases({ fixedPrice: true }));
    const tmP    = blob(phases({ fixedPrice: false }));

    // The defect: the close-out stage described renderInvoice's T&M behaviour on every job,
    // and _cePhases carried no fixedPrice reference at all. On a flat fee it contradicted this
    // same document's Terms four inches below it.
    lacks(fixedP, 'generated from the actual logged hours',
          'the close-out stage no longer claims an hours-built final on a fixed fee');
    lacks(fixedP, 'A final invoice built from the actual logged hours',
          'nor promises one on the records list');
    has(fixedP, 'closes out the agreed fixed fee', 'it says what the final actually does');
    has(fixedP, 'does not move with the hours worked', 'and that it does not move with hours');
    has(fixedP, 'closing out the agreed fixed fee', 'the records list matches it');
    has(fixedP, 'change order', 'and still names what IS itemised against the fee');

    // The converse, and it is the half that stops this becoming a blanket deletion: a T&M job
    // still promises the reconciliation, because there the invoice really does produce one.
    has(tmP, 'generated from the actual logged hours', 'T&M keeps the hours sentence');
    has(tmP, 'A final invoice built from the actual logged hours', 'and the records-list promise');

    // Both arms keep everything the stage is otherwise for.
    ['Vendor invoices are collected and reconciled', 'walk every room'].forEach((s) => {
      has(fixedP, s, 'fixed arm keeps: ' + s);
      has(tmP, s, 'T&M arm keeps: ' + s);
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ THE SERVICE-CHANGE DIALOG REPORTS THE CONTINGENCY, NOT A WITHDRAWAL');
  {
    const live = noComments(fn('_svcChangeConsequences'));
    lacks(live, 'Fixed price is not offered', 'no withdrawal notice survives');
    lacks(live, 'becomes available again', 'nor a restoration notice');
    has(live, 'fixedPriceBuffer', 'it reads the band rather than naming matter types');
  }
};
