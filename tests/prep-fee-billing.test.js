'use strict';
// THE 30% HOME PREP FEE IS COUNTED WHERE IT IS SHOWN, AND ON A FIXED FEE IT SITS OUTSIDE IT
// (2026-09-23).
//
// Anthony, off a Home Transition estimate carrying a painter, a pressure washer and a pool clean:
// "the $250 in GC fees don't appear to be added to the Havellin Services total. where's the
// error?" It was in the total — $225, not $250 — and printed BELOW it, in the Home Prep section,
// so the services table's rows did not add up to its own total. A table whose rows do not reach
// its own total is wrong on its face, whatever the arithmetic behind it.
//
// And on a FIXED-PRICE estimate the fee was worse than misplaced: it was folded INSIDE the flat
// fee, marked up by the 20–35% contingency with the rest of the basis, and never billed on the
// vendors' actual invoices — while the estimate, both agreements and every invoice said it was a
// separate fee charged on actuals. "yes, fix both."
//
//   · the fee row is inside the Havellin Services table, above the subtotal it is part of;
//   · on a fixed fee the flat fee is `fixedAmount` alone (read through estFixedFee), the prep fee
//     is its own line on top, the suggestion excludes it, and every invoice bills it the way an
//     hourly job does — on the quotes at the deposit, on the actual quotes from the midpoint;
//   · a fixed-price record saved BEFORE today carries the fee inside its flat fee, so it adds
//     nothing, prints no second line, and says the fee is included — or it would bill it twice.

const { sandbox, source, fn, domStub } = require('./harness');

const noComments = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
const text = (h) => h.replace(/<\/td>/g, ' </td>').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&')
  .replace(/&rsquo;|&#39;/g, "'").replace(/&minus;/g, '−').replace(/\s+/g, ' ');

// The services table of a client estimate, read the way a client reads it: every money row, and
// the total under them. A discount row counts negative; the pre-discount subtotal is a restatement.
function servicesTable(html) {
  const tables = html.split('<table').slice(1).map((t) => '<table' + t.split('</table>')[0]);
  const svc = tables.find((t) => t.indexOf('Havellin Services Total') >= 0);
  const rows = []; let total = null;
  (svc.match(/<tr[\s\S]*?<\/tr>/g) || []).forEach((tr) => {
    const cells = (tr.match(/<td[^>]*>([\s\S]*?)<\/td>/g) || []).map((c) => text(c).trim());
    if (!cells.length) return;
    const label = cells[0], last = cells[cells.length - 1];
    const m = last.match(/^([−+-])?\s*\$([\d,]+)/);
    if (!m) return;
    let v = Number(m[2].replace(/,/g, ''));
    if (m[1] === '−' || m[1] === '-') v = -v;
    if (/Havellin Services Total/.test(label)) { total = v; return; }
    if (/Subtotal \(before discount\)/.test(label)) return;
    rows.push({ label, v });
  });
  return { rows, total, sum: rows.reduce((a, r) => a + r.v, 0) };
}

const PREP = [{ type: 'Painting', cost: 500, lid: 'a1' }, { type: 'Pressure Washing', cost: 150, lid: 'a2' },
              { type: 'Pool & Spa Service', cost: 100, lid: 'a3' }];
const BASE = {
  jobId: 1, svc: 'downsizing_move', tcFee: 8100, psFee: 6000, pkgCost: 0, smf: 0,
  prepEnabled: true, prepItems: PREP, prepCost: 750, prepFee: 225,
  havellinTotalFull: 14325, havellinTotal: 14325, vendorCost: 0, grandTotal: 15075,
  tcRate: 150, psRate: 100, totTC: 54, totPS: 60, discountPct: 0, discountAmt: 0,
  fixedPrice: false, rush: false, rushAmt: 0, vendors: [], rooms: [], collections: [], vehicles: [],
  preparedBy: 'Anthony Graziano',
};
const est = (over) => Object.assign({}, BASE, over || {});
// A fixed-price record saved from today: the flat fee alone in fixedAmount, the prep fee on top.
const FIXED = est({ fixedPrice: true, fixedAmount: 20000, havellinTotal: 20225, prepFeeOnTop: true, grandTotal: 20975 });
// The same record saved before today: the fee inside the flat fee, no marker.
const LEGACY = est({ fixedPrice: true, fixedAmount: 20000, havellinTotal: 20000, grandTotal: 20750 });

// ── the real client estimate ────────────────────────────────────────────────
const CE_FNS = ['estTolerancePctTxt', 'clientEstimateHtml', 'fmt', 'esc', 'paymentSplit', 'conciergePhonesText',
                'conciergePhones', 'estimateIsFeeOnly', 'clientJobPlanSection', 'proposedPlanRow', '_cePhases',
                'materialsBasisNote', 'discountOnLabor', 'prepFeeRate', 'estWorkingDays', 'estFixedFee',
                'estPrepFeeOnTop', '_fixedFeeBlurb', 'vendorEstimateNote', 'vendorFeeNote'];
const CE_VARS = ['EST_TOLERANCE_PCT', 'SMF_PCT', 'RUSH_PCT', 'SVC_LABELS', 'HAVELLIN_OFFICE_PHONE',
                 'NON_MOBILE_NUMBERS', 'PREP_FEE_RATE', 'PRODUCTIVE_HRS_PER_DAY'];
const JOB = { id: 1, svc: 'downsizing_move', name: 'Pat Transition', address: '1 A St' };
const ceDoc = (e) => sandbox({ fns: CE_FNS, vars: CE_VARS }).clientEstimateHtml(e, JOB);

// ── the real invoice ────────────────────────────────────────────────────────
const INV_FNS = ['estTolerancePctTxt', 'invoiceHtml', 'jobLogEntries', 'coHours', 'coHoursTotal', 'coBaselineShift',
                 'coHoursLabel', '_coMoney', 'fmt', 'getVendorActuals', '_srcLineKey', 'samePerson', 'canonPersonName',
                 '_invVendorFeeSentence', 'prepFeeRate', 'vendorGroupOfLine', 'resolveJobVendor', 'coordHrsFor',
                 'prepLineTCHrs', 'vendorLineTCHrs', 'esc', 'fmtDate2', 'svcLabelOf', 'conciergePhones',
                 'conciergePhonesText', 'assignedTCContact', 'vendorCats', 'vendorPrimaryCat', 'estimateIsFeeOnly',
                 'isDecedentJob', 'stagePaidTotal', 'jobPaidTotal', 'jobPayments', 'discountOnLabor',
                 'estFixedFee', 'estPrepFeeOnTop'];
const INV_VARS = ['EST_TOLERANCE_PCT', 'SMF_PCT', 'RUSH_PCT', 'SVC_LABELS', 'DEPT_EMAILS', 'HAVELLIN_OFFICE_PHONE',
                  'NON_MOBILE_NUMBERS', 'DEFAULT_CONTRACTORS', 'COORD_TOUCHES', 'COORD_TOUCHES_BY_GROUP',
                  'COORD_TOUCHES_DEFAULT', 'TOUCH_HRS', 'DECEDENT_SERVICES', 'PERSON_NAME_ALIASES', 'PREP_FEE_RATE',
                  'invApproved'];
function invoice(e, stage, payments, prepSourcing) {
  const ctx = sandbox({
    fns: INV_FNS, vars: INV_VARS,
    stubs: {
      jobLogs: { 1: [] }, estimateStore: { 1: { estimate: e, approved: true, approvedBy: 'Anthony Graziano' } },
      changeOrders: [], contractors: [], currentEstimate: null, currentInvStage: stage,
      vendorDirectory: [], jobPlans: {},
    },
  });
  const job = { id: 1, hvlId: 'HVL-0009', name: 'Pat Transition', svc: 'downsizing_move', address: '1 A St',
                tc: 'Anthony Graziano', status: 'active', payments: payments || [], prepSourcing: prepSourcing || {} };
  const r = ctx.invoiceHtml(job, stage);
  return Object.assign({ t: text(r.html) }, r);
}
const pay = (stage, amount) => ({ stage, amount, date: '2026-09-23', method: 'wire' });
// The painter actually bills $900, not the $500 quoted: the fee follows the bill. The key is
// _srcLineKey's — 'L' + the line's lid — so the record survives the line list being edited.
const actuals = () => ({ La1: { quote: 900, status: 'Confirmed', vendorName: 'Brush Co' } });

// ── the real agreements ─────────────────────────────────────────────────────
const AGR_FNS = ['_agrComplianceHeading', '_agrComplianceLead', '_agrApprover', '_agrTrustDeliverable', 'matterDef',
                 'matterTypeOf', 'invFiduciaryMode', 'marketingOptOutBlock', 'marketingUseParas', '_mktClause',
                 'estTolerancePctTxt', 'agreementHtml', 'probateAgreementHtml', 'agrBillingRates', 'materialsBasisNote',
                 'fmt', 'esc', 'paymentSplit', 'isDecedentJob', 'agrSection', '_agrHasPrepVendors', 'estimateDocScope',
                 'svcHasDocStep', 'docScopeDef', '_agrScopeServices', '_agrMidpointTrigger', '_agrProbateCompliance',
                 'esignAnchor', 'estFixedFee', 'estPrepFeeOnTop', '_pctWords', 'prepFeeRate'];
const AGR_VARS = ['AGR_NOT_AN_ACCOUNTING', 'MATTER_TYPES', 'EST_TOLERANCE_PCT', 'SMF_PCT', 'DECEDENT_SERVICES',
                  'agrApproved', 'HAVELLIN_OFFICE_PHONE', 'JOB_STEPS', 'DOC_SCOPES', 'ESIGN_ANCHORS', '_PCT_WORDS',
                  'PREP_FEE_RATE'];
const agr = (job, e) => text(sandbox({ fns: AGR_FNS, vars: AGR_VARS,
  stubs: { estimateStore: {}, currentEstimate: null } }).agreementHtml(job, e));
const LIVING = { id: 1, hvlId: 'HVL-0009', name: 'Pat Transition', svc: 'downsizing_move',
                 addr: '1 A St', city: 'Palm Beach', zip: '33480' };
const ESTATE = { id: 2, hvlId: 'HVL-0010', name: 'Margaret Doe', svc: 'cleanout', executor: 'Tripp Butler',
                 addr: '69 Beach Blvd', city: 'Palm Beach', zip: '33480', deathDate: '2026-01-15', matterType: 'probate' };

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();

  // ───────────────────────────────────────────────────────────────────────────
  group('estFixedFee / estPrepFeeOnTop — the flat fee is fixedAmount, and the marker says where the fee sits');
  {
    const c = sandbox({ fns: ['estFixedFee', 'estPrepFeeOnTop'] });
    eq(c.estFixedFee(FIXED), 20000, '⚠ the flat fee alone — NOT the $20,225 total the prep fee rides on');
    eq(c.estFixedFee(LEGACY), 20000, 'a record saved before today reads the same field');
    eq(c.estFixedFee(est({ fixedPrice: true, havellinTotal: 18000 })), 18000,
       'a record with no fixedAmount falls back to its total — the flat fee was the whole total then');
    eq(c.estFixedFee(BASE), 0, 'an hourly estimate has no flat fee');
    ok(c.estPrepFeeOnTop(FIXED), 'saved from today: the fee sits on top');
    ok(!c.estPrepFeeOnTop(LEGACY), '⚠ saved before: the fee is inside the flat fee — adding it would bill it twice');
    ok(!c.estPrepFeeOnTop(est({ prepFeeOnTop: true })), 'the marker means nothing on an hourly estimate');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ THE SERVICES TABLE ADDS UP — the fee row is inside it, above the subtotal');
  {
    const tm = servicesTable(ceDoc(BASE));
    eq(tm.total, 14325, 'the Havellin Services Total is the snapshot total');
    eq(tm.sum, tm.total, '⚠⚠ T&M: the rows add up to their own total — they came to $14,100 over a $14,325 total');
    ok(tm.rows.some((r) => /General contracting & site management of the home prep vendors/.test(r.label) && r.v === 225),
       'the $225 is a row in the table that counts it');
    const t = text(ceDoc(BASE));
    ok(t.indexOf('Home Prep for Sale — Site Management') < t.indexOf('Havellin Services Total'),
       'and it sits above the total, not under the prep vendors below it');
    lacks(t, 'Havellin GC / Site Management Fee', 'the old fee subtotal under the prep vendors is gone');
    has(t, "fee on this work is the site management line in Havellin Services above",
        'the prep section says where the fee is, so nobody hunts for it under the vendors');

    const fx = servicesTable(ceDoc(FIXED));
    eq(fx.total, 20225, 'fixed: the total is the flat fee plus the prep fee');
    eq(fx.sum, fx.total, '⚠ fixed: the rows add up');
    ok(fx.rows.some((r) => /^Fixed Project Fee/.test(r.label) && r.v === 20000),
       '⚠ the fixed row states the flat fee alone — never the sum the prep fee rides on');
    ok(fx.rows.some((r) => /General contracting/.test(r.label) && r.v === 225), 'the prep fee is its own row under it');

    const lg = servicesTable(ceDoc(LEGACY));
    eq(lg.total, 20000, 'a record saved before today: the flat fee is the whole Havellin total');
    eq(lg.sum, lg.total, 'and its one row adds up to it');
    ok(!lg.rows.some((r) => /General contracting/.test(r.label)), '⚠ no second fee row — the fee is inside the flat fee there');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('the fixed estimate says only the flat fee is firm');
  {
    const t = text(ceDoc(FIXED));
    has(t, 'The fixed project fee is firm for the scope of work described', 'the Terms name the fixed project fee, not the services total');
    has(t, 'which is not part of the fixed fee and is charged on what those vendors actually bill',
        'and carve the prep fee out of it');
    has(t, 'apart from the home prep vendors, whose site management fee is the next line', 'the fixed row\'s blurb carves them out too');
    has(t, 'charged on what these vendors actually bill rather than on these estimates', 'the prep section says the fee trues up');
    const l = text(ceDoc(LEGACY));
    lacks(l, 'which is not part of the fixed fee', 'a record saved before today claims no carve-out — its flat fee carries the fee');
    has(l, 'Moving materials and all vendor coordination are included', 'and its blurb still says all coordination is included');
    lacks(l, 'site management line in Havellin Services above', 'nor points at a line it does not print');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('calcAll prices the flat fee without the prep fee and saves the fee on top of it');
  {
    const body = noComments(fn('calcAll'));
    has(body, 'var _fpServices = havellinTotal - prepFee;', '⚠ the suggestion\'s basis excludes the prep fee');
    has(body, 'var _fpFee  = Math.round(_fpBasis * (1 + _fpBuf));', '— so the contingency is never charged on it');
    has(body, 'havellinTotal: isFixed ? fixedAmount + prepFee : Math.round(havellinTotalDiscounted)',
        'the saved total is the flat fee PLUS the prep fee');
    has(body, 'prepFeeOnTop: true', 'and the record says so, which is what tells today\'s records from older ones');
    has(body, 'Math.round(fixedAmount + prepFee + vendorCost + (prepEnabled ? prepCost : 0))',
        'the grand total counts the fee once, beside the vendors at cost');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('a discount on a fixed fee comes off the flat fee and keeps the prep fee on top');
  {
    const pct = { value: 10 };
    const a = sandbox({
      fns: ['estTolerancePctTxt', 'discountPreview', 'estPreDiscountTotal', 'discountOnLabor', 'applyDiscountRevision',
            'estFixedFee', 'estPrepFeeOnTop'],
      vars: ['EST_TOLERANCE_PCT', 'MAX_DISCOUNT_PCT', 'RUSH_PCT'],
      stubs: {
        document: { getElementById: (id) => (id === 'dm-pct' ? pct : null) },
        currentEstimate: Object.assign({}, FIXED), jobs: [{ id: 1, status: 'approved' }],
        saveJobs() {}, syncJobToSheets() {}, saveEstimateState() {}, closeDiscountModal() {},
        renderClientEstimate() {}, updateApprovalUI() {}, notifyManagerForApproval() {}, showFB() {},
      },
    });
    a.applyDiscountRevision();
    eq(a.currentEstimate.fixedAmount, 18000, '10% off the $20,000 flat fee');
    eq(a.currentEstimate.havellinTotal, 18225, '⚠ and the $225 prep fee is still on top — not dropped by the discount');
    const b = sandbox({
      fns: ['estTolerancePctTxt', 'discountPreview', 'estPreDiscountTotal', 'discountOnLabor', 'applyDiscountRevision',
            'estFixedFee', 'estPrepFeeOnTop'],
      vars: ['EST_TOLERANCE_PCT', 'MAX_DISCOUNT_PCT', 'RUSH_PCT'],
      stubs: {
        document: { getElementById: (id) => (id === 'dm-pct' ? pct : null) },
        currentEstimate: Object.assign({}, LEGACY), jobs: [{ id: 1, status: 'approved' }],
        saveJobs() {}, syncJobToSheets() {}, saveEstimateState() {}, closeDiscountModal() {},
        renderClientEstimate() {}, updateApprovalUI() {}, notifyManagerForApproval() {}, showFB() {},
      },
    });
    b.applyDiscountRevision();
    eq(b.currentEstimate.havellinTotal, 18000, 'a record saved before today gains no second prep fee from a discount');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ REOPENING A FIXED FEE SAVED BEFORE TODAY MOVES THE PREP FEE OUT OF IT — or a re-save charges it twice');
  {
    // Build Estimate re-prices whatever it opens under the current rule (fee on top). An older
    // flat fee already carries the fee inside it, so re-saving it untouched would put the fee on
    // top of a flat fee that contains it: the client's total rises by the fee, silently.
    const noop = () => {};
    const reopen = (e) => {
      const dom = domStub({});
      const ctx = sandbox({
        fns: ['restoreEstimateToUI', '_fxAmtSet', '_fxAmtGet', 'moneyToNumber'],
        vars: ['ROOMS', '_fixedAmountUserSet', '_fixedAmountBasis', '_fixedPrepMovedOut'],
        stubs: { document: dom, calcAll: noop, paintEstimateService: noop, svcTypeChanged: noop, toggleRoom: noop,
                 setRoomState: noop, collapseEmptyRoomSections: noop, renderCollections: noop, renderVehicles: noop,
                 renderVendors: noop, renderPrepItems: noop, paintVolPreset: noop, docScopeDef: () => null,
                 applyEstimateLock: noop, estDeclutterHrs: () => 0, jobs: [], collectionsData: [], vehiclesData: [],
                 vendors: [], prepItems: [] },
      });
      ctx.restoreEstimateToUI(Object.assign({}, e, { rooms: [] }));
      return { moved: ctx._fixedPrepMovedOut, field: ctx._fxAmtGet(), basis: ctx._fixedAmountBasis, held: ctx._fixedAmountUserSet };
    };
    const old = reopen(Object.assign({}, LEGACY, { fixedSuggested: 17190 }));
    eq(old.moved, 225, '⚠⚠ the $225 comes out of a flat fee saved with it inside');
    eq(old.field, 19775, 'the flat fee reopens at $19,775 — so the fee on top brings the client back to the same $20,000');
    ok(old.held, 'and it is still an agreed figure, not a prefill');
    eq(old.basis, 0, '⚠ its suggestion was taken with the fee inside, so it is not read back — the drift warning would report a move the rooms never made');

    const now = reopen(Object.assign({}, FIXED, { fixedSuggested: 16920 }));
    eq(now.moved, 0, 'a fee saved from today already has the prep fee on top — nothing is moved');
    eq(now.field, 20000, 'it reopens at its own flat fee');
    eq(now.basis, 16920, 'and its suggestion is read back as before');

    eq(reopen(est({ fixedPrice: true, fixedAmount: 20000, havellinTotal: 20000, prepFee: 0, prepEnabled: false, prepItems: [] })).moved, 0,
       'an older fixed fee with no prep vendors moves nothing');
    eq(reopen(BASE).moved, 0, 'and an hourly estimate has no flat fee to move anything out of');

    // ⚠ Driven, not grepped: a sentence switched off beside the call still sits in the source.
    const nc = sandbox({ fns: ['fixedPrepMovedNote'] });
    has(nc.fixedPrepMovedNote(225), 'This fee was saved under the old rule, with the prep fee inside it:</strong> $225',
        'the fixed panel names what was moved');
    has(nc.fixedPrepMovedNote(225), "so the client's total is unchanged", 'and that the total is unchanged');
    eq(nc.fixedPrepMovedNote(0), '', 'and says nothing when nothing moved');
    const calc = noComments(fn('calcAll'));
    has(calc, 'fixedPrepMovedNote(_fixedPrepMovedOut)', 'the panel reads the figure the reopen recorded');
    eq(src.split('  _fixedAmountBasis = 0;\n  _fixedPrepMovedOut = 0;\n').length - 1, 3,
       'the three job-switch resets clear it, or the note would follow the manager onto the next client');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ THE FIXED-PRICE INVOICES BILL THE PREP FEE ON TOP, ON QUOTES THEN ON ACTUALS');
  {
    const dep = invoice(FIXED, 'deposit');
    eq(dep.amtDue, 10113, 'deposit = 50% of the $20,000 flat fee + the $225 fee on the quotes');
    has(dep.t, 'Fixed project fee — full scope of work per agreement $20,000', 'the deposit states the flat fee');
    has(dep.t, 'Home Prep for Sale — GC / Site Management Fee (30%) $225', 'and itemises the prep fee on the quotes');
    has(dep.t, 'Havellin Services Total $20,225', 'with a total that adds up');
    has(dep.t, "shown here on the prep vendors' quotes and trued to their actual invoices", 'and says it trues up');

    const received = [pay('deposit', 10113)];
    const mid = invoice(FIXED, 'midpoint', received, actuals());
    eq(mid.amtDue, Math.round(0.75 * (20000 + 345)) - 10113,
       '⚠ midpoint = 75% of the flat fee + the fee on the ACTUAL $900 painter bill ($345), less the deposit');
    ok(/GC \/ Site Management Fee \(30%\) est\. \$345/.test(mid.t),
       'the midpoint bills $345, tagged est. while two prep lines are still on their quotes');

    const fin = invoice(FIXED, 'final', received.concat([pay('midpoint', mid.amtDue)]), actuals());
    eq(fin.amtDue, 20345 - 10113 - mid.amtDue, '⚠⚠ the final closes out flat fee + actual prep fee exactly');
    has(fin.t, 'Havellin Services Total $20,345', 'final services total = flat + actual prep fee');
    // ⚠ The total alone cannot see the row going missing — the table would print a $20,000 flat fee over a
    //   $20,345 total, which is the exact screen Anthony reported. Read the table and make it add up.
    ok(/Home Prep for Sale — GC \/ Site Management Fee \(30%\)( est\.)? \$345/.test(fin.t),
       '⚠⚠ the final itemises the fee on the actual invoices inside the services table');
    const iFee = fin.t.indexOf('GC / Site Management Fee (30%)');
    ok(iFee >= 0 && iFee < fin.t.indexOf('Havellin Services Total $20,345'),
       'above the services total it is part of (a missing row reads -1, which is not "above")');
    has(fin.t, "Home prep site management fee — on the prep vendors' actual invoices $345", 'the payment summary names the fee');
    has(fin.t, "Havellin's fee on the home preparation vendors is the 30% general contracting and site management fee shown above",
        'the vendor note points at a line that is on the page');
    lacks(fin.t, 'billed in the hours above', 'no hours claim on a fixed-price invoice');
    ok(!fin.blocked, 'a fixed final is never blocked for hours — the timesheet is empty here');

    // ⚠ The record saved before today: the fee is inside the flat fee, so it adds nothing.
    const ldep = invoice(LEGACY, 'deposit');
    eq(ldep.amtDue, 10000, '⚠⚠ a record saved before today: 50% of the flat fee alone — the fee is never billed twice');
    lacks(ldep.t, 'GC / Site Management Fee (30%)', 'and no separate fee line');
    const lfin = invoice(LEGACY, 'final', [pay('deposit', 10000), pay('midpoint', 5000)], actuals());
    eq(lfin.amtDue, 5000, 'its final closes out the flat fee and nothing more');
    has(lfin.t, 'fee on the home preparation vendors is included in the fixed project fee', 'and says the fee is inside it');

    // The hourly invoice is untouched.
    const tm = invoice(BASE, 'deposit');
    eq(tm.amtDue, Math.round(0.5 * 14325), 'an hourly deposit is 50% of the estimate total, prep fee included, as before');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('_invVendorFeeSentence — the billing basis decides which of three sentences is true');
  {
    const c = sandbox({ fns: ['_invVendorFeeSentence', 'prepFeeRate'], vars: ['PREP_FEE_RATE'] });
    has(c._invVendorFeeSentence(0, 225, ''), 'fee shown above', 'hourly: the fee line is on the page');
    has(c._invVendorFeeSentence(0, 225, 'fixed'), 'fee shown above', 'fixed, fee on top: so is it');
    has(c._invVendorFeeSentence(0, 225, 'fixed-inside'), 'is included in the fixed project fee',
        'fixed, fee inside: there is no line to point at');
    has(c._invVendorFeeSentence(0, 0, ''), 'billed in the hours above', 'hourly with no prep: the hours carry the coordination');
    has(c._invVendorFeeSentence(0, 0, 'fixed'), 'included in the fixed project fee',
        '⚠ fixed with no prep: there are no "hours above" on a fixed-price invoice');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ THE LIVING-CLIENT AGREEMENT STATES TWO FIGURES ON A FIXED FEE');
  {
    const a = agr(LIVING, FIXED);
    has(a, 'fixed price of $20,000', '§3.1 states the flat fee — not the $20,225 total');
    lacks(a, 'fixed price of $20,225', 'and never the sum');
    has(a, 'The Home Sale Preparation Fee in Section 3.5 is charged in addition to the fixed price', '§3.1 says it is additional');
    has(a, 'fixed project fee of $20,000', '§3.3 states the flat fee');
    has(a, 'is not part of the fixed project fee and is charged in addition to it', '§3.3 carves the prep fee out');
    has(a, 'is included in the fixed project fee under Section 3.3', '⚠ §3.5: coordination is inside the flat fee, not billed as time');
    has(a, 'calculated on what those vendors actually invoice and charged in addition to the fixed project fee', '§3.5 states the fee on top');
    has(a, 'at its estimated amount of $225', '§3.2 says the schedule carries the estimated fee');
    has(a, 'Deposit (50%) $10,113', 'the schedule splits flat + estimated fee — the same figure the deposit invoice asks for');
    has(a, 'is earned as the preparation work is performed', '§12.2 earns the prep fee on the vendor work');
    has(a, 'at thirty percent (30%) of those vendors\' invoices', 'at the rate, spelled from the one constant');
    has(a, 'and the Home Sale Preparation Fee owed under that Section', '§12.4 invoices it on termination');
    has(a, 'deposit is earned on signature and is not refundable', 'the deposit stays non-refundable');
    lacks(a, 'billed as Transition Concierge time under Section 3.3', '⚠ no clause bills coordination as hours on a fixed fee');

    const l = agr(LIVING, LEGACY);
    has(l, 'fixed price of $20,000', 'a record saved before today states its flat fee');
    has(l, 'On this engagement that fee is included in the fixed project fee under Section 3.3', 'and says the fee is inside it');
    lacks(l, 'charged in addition to the fixed', 'with no second charge claimed');

    // The hourly form is untouched — the converse, or this becomes a rewrite of a clause that was right.
    const tm = agr(LIVING, BASE);
    has(tm, 'billed as Transition Concierge time under Section 3.3', 'hourly §3.5: coordination is billed as concierge time');
    has(tm, 'which is not additionally billed as Transition Concierge time', 'and the prep fee is not billed twice');
    lacks(tm, 'charged in addition to the fixed', 'no fixed-price language on an hourly contract');

    // A fixed fee with no prep vendors: the plain §3.5 arm must not bill coordination as time either.
    const np = agr(LIVING, est({ fixedPrice: true, fixedAmount: 20000, havellinTotal: 20000, prepFeeOnTop: true,
                                prepEnabled: false, prepItems: [], prepCost: 0, prepFee: 0 }));
    has(np, 'The Transition Concierge time spent sourcing, scheduling, and supervising vendors is included in the fixed project fee under Section 3.3',
        '⚠ fixed, no prep: coordination is inside the flat fee');
    lacks(np, 'Home Sale Preparation Fee', 'and no prep fee is mentioned where none is charged');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ THE ESTATE AGREEMENT STATES TWO FIGURES ON A FIXED FEE');
  {
    const eFx = Object.assign({}, FIXED, { svc: 'cleanout', fixedAmount: 30000, havellinTotal: 30225 });
    const a = agr(ESTATE, eFx);
    has(a, 'Fee Structure', 'the estate form, fixed arm');
    has(a, 'fixed price of $30,000', 'the flat fee alone');
    has(a, 'the concierge time spent coordinating them is included in the fixed project fee below',
        '⚠ the vendor row no longer bills coordination at the TC rate on a fixed fee');
    has(a, 'which is not part of the fixed project fee below: it is charged in addition to it', 'the prep row is outside the flat fee');
    has(a, 'It is charged in addition to it, at thirty percent (30%) of what the home sale preparation vendors',
        'the Fixed Project Fee paragraph carries the prep fee');
    has(a, '(estimated in Exhibit A at $225)', 'with its estimated amount');
    has(a, 'together with the Home Sale Preparation Fee on the preparation vendors\' actual invoices', '§3.2 IMPORTANT names it');
    has(a, '(50% of fixed price + est. prep fee)', 'the payment rows name both parts');
    has(a, '$15,113 (50% of fixed price + est. prep fee)', 'and split the same figure the deposit invoice asks for');
    has(a, 'completes the fixed price and the Home Sale Preparation Fee on actual vendor invoices', 'the final payment says the fee trues up');
    has(a, 'The payment amounts above include the Home Sale Preparation Fee at its estimated amount of $225',
        'the estate schedule says its amounts carry the estimated fee');
    has(a, 'so the midpoint and final payments are adjusted to the actual amount', 'and that the later payments follow the actual bills');
    has(a, 'The Home Sale Preparation Fee is earned as the preparation work is performed', '§8.1 earns it on the work');
    has(a, 'and the Home Sale Preparation Fee owed will be issued', '§8.1 invoices it on termination');
    has(a, 'The deposit is earned in full on signature of this Agreement and is not refundable', 'the deposit stays protected');

    const l = agr(ESTATE, Object.assign({}, LEGACY, { svc: 'cleanout' }));
    has(l, 'which on this engagement is included in the fixed project fee below', 'a record saved before today: the fee is inside');
    lacks(l, 'est. prep fee', 'and the schedule claims no separate fee');

    const tm = agr(ESTATE, Object.assign({}, BASE, { svc: 'cleanout' }));
    has(tm, 'the concierge time spent coordinating them is billed at the TC rate above, except for the home sale preparation vendors',
        'the hourly estate row is untouched');
    has(tm, 'which is not additionally billed at the TC rate above', 'and so is its prep row');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('the emails state the flat fee and the prep fee as two lines');
  {
    const c = sandbox({ fns: ['estimateHavellinLines', 'estFixedFee', 'estPrepFeeOnTop', 'prepFeeRate'], vars: ['PREP_FEE_RATE'] });
    eq(JSON.stringify(c.estimateHavellinLines(FIXED, false)),
       JSON.stringify([['Fixed Project Fee', 20000], ['Home Prep Site Management Fee (30%)', 225]]),
       '⚠ fixed: two lines — a single "Fixed Project Fee" over their sum would state a flat fee no document agrees with');
    eq(JSON.stringify(c.estimateHavellinLines(LEGACY, false)), JSON.stringify([['Fixed Project Fee', 20000]]),
       'a record saved before today: one line, the whole flat fee');
    eq(JSON.stringify(c.estimateHavellinLines(BASE, false)), JSON.stringify([['Havellin Services', 14325]]),
       'hourly: the services total, as before');
    eq(c.estimateHavellinLines(BASE, true)[0][0], 'Havellin Management Fee', 'a fee-only engagement keeps its own label');
    const m = fn('buildEstimateMailto'), t = fn('buildEstimateEmailText'), h = fn('buildEstimateEmailHtml');
    [m, t, h].forEach((b, i) => has(b, 'estimateHavellinLines(', ['mailto', 'text', 'html'][i] + ' email reads the shared lines'));
    has(h, 'The fixed project fee above is firm', 'the HTML email calls only the flat fee firm');
    has(h, 'charged on what those vendors actually bill', 'and says the prep fee follows the bills');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('nothing outside estFixedFee reads the flat fee off havellinTotal on a fixed-price estimate');
  {
    // The invoice and both agreements used havellinTotal as the flat fee. A new reader doing the
    // same would print $20,225 as a "fixed price" of $20,000.
    lacks(noComments(fn('invoiceHtml')), '_fixed ? (est.havellinTotal', 'the invoice reads the flat fee through estFixedFee');
    has(noComments(fn('invoiceHtml')), 'var _fixedTotal = _fixed ? estFixedFee(est) : 0;', '— as the one definition');
    lacks(noComments(fn('agreementHtml')), "fixed price of $'+havTotal", 'the standard form never calls the total the fixed price');
    lacks(noComments(fn('probateAgreementHtml')), "fixed price of $'+havTotal", 'nor does the estate form');
    lacks(noComments(fn('agreementHtml')), "fixed project fee of '+b('$'+havTotal", '§3.3 neither');
  }
};
