'use strict';
// ────────────────────────────────────────────────────────────────────────────────────────────────
// ⚠⚠ P15 — ANTHONY'S 2026-09-30 ANSWERS AND THE SMALL ITEMS.
//
//   Q14 follow-up  "yes": a fixed-price rush job's change orders carry the 20% premium. Pinned on the
//                  change order when it is created (`rushPct`), so one raised before today keeps the
//                  plain-rate price its client signed. The discount still does not apply.
//   Q20            "yes, drop built-in appraiser scheduling": the documentation step keeps inventory
//                  scheduling only (DOC_COORD_INVENTORY_SHARE); an appraiser is priced by its own vendor
//                  line when one is added, on any tier; the contract says Havellin coordinates the
//                  appraisals Exhibit A lists ('listed') where the tier does not promise them all.
//   Home Prep CO   "yes, add new also, or add TC hours for decluttering": a prep change order may add a
//                  preparation vendor found mid-job, which joins the job's prep lines once accepted.
//   Small items    the desk's All filter, the vendor and partner deletes asked again behind the PIN, the
//                  Vendor Directory warning on a labour job, the Rush subtitle (Q9).
//
// Everything here is driven: the real functions in a sandbox, the real engine through driveCalcAll.
// ────────────────────────────────────────────────────────────────────────────────────────────────

const { sandbox, source, fn, domStub, driveCalcAll } = require('./harness');

const text = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&mdash;/g, '—')
  .replace(/&rsquo;/g, '’').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();

// ── Change-order fixtures (the shapes fixed-price-change-orders and prep-co-hours use) ──────────
// 80 TC @150 + 60 PS @100 on the estimate; a $26,000 fixed fee on the fixed variants.
const EST_TM = { jobId: 1, svc: 'cleanout', tcFee: 12000, psFee: 6000, pkgCost: 1940, smf: 0, prepFee: 0,
                 havellinTotal: 19940, tcRate: 150, psRate: 100, discountPct: 0,
                 fixedPrice: false, rush: false, vendors: [], prepItems: [],
                 preparedBy: 'Anthony Graziano', totTC: 80, totPS: 60 };
// A fixed price saved from 2026-09-30: the premium is a line on the fee (fixedLines), 20% of $26,000.
const EST_FXR = Object.assign({}, EST_TM, { fixedPrice: true, fixedAmount: 26000, prepFeeOnTop: true,
                                            fixedLines: true, rushExPrepFee: true, rush: true, rushPct: 0.2,
                                            rushAmt: 5200, havellinTotal: 31200, discountPct: 10, discountAmt: 1880 });
// The same job saved before today: the premium inside the fee, no lines.
const EST_FX_OLD = Object.assign({}, EST_FXR, { fixedLines: false, rushExPrepFee: false, havellinTotal: 26000,
                                                rushAmt: 0, discountPct: 0, discountAmt: 0 });
// An hourly rush job.
const EST_TMR = Object.assign({}, EST_TM, { rush: true, rushPct: 0.2 });

// A standalone prep estimate: $45,000 of trades, no declutter hours (prep-co-hours.test.js's fixture).
function prepEst(dcHrs) {
  const prepCost = 45000, prepFee = Math.round(prepCost * 0.30), tcFee = Math.round(dcHrs * 150);
  return { jobId: 1, svc: 'prep', totTC: dcHrs, totPS: 0, tcFee: tcFee, psFee: 0, pkgCost: 0, smf: 0,
           prepFee: prepFee, prepCost: prepCost, prepEnabled: true, prepTCHrs: 0, declutterTCHrs: dcHrs,
           havellinTotal: tcFee + prepFee, havellinTotalFull: tcFee + prepFee, grandTotal: tcFee + prepFee + prepCost,
           tcRate: 150, psRate: 100, prem: false, discountPct: 0, discountAmt: 0, fixedPrice: false, rush: false,
           rooms: [], vendors: [], collections: [], vehicles: [],
           prepItems: [{ type: 'Painting', cost: 20000, note: '', lid: 'p1' },
                       { type: 'Landscaping', cost: 9000, note: '', lid: 'p2' },
                       { type: 'Cleaning', cost: 6000, note: '', lid: 'p3' },
                       { type: 'Staging', cost: 10000, note: '', lid: 'p4' }],
           preparedBy: 'Ashley Jerome', docScope: 'full' };
}
const LAB_JOB = { id: 1, hvlId: 'HVL-0007', name: 'Butler Estate', svc: 'cleanout', addr: '69 Beach Blvd',
                  city: 'Palm Beach', tc: 'Anthony Graziano', status: 'active', premium: false, executor: 'Tripp Butler' };
const PREP_JOB = Object.assign({}, LAB_JOB, { name: 'Marston', svc: 'prep', tc: 'Ashley Jerome' });

function co(extra) {
  return Object.assign({ id: 100, jobId: 1, description: 'Guest house added to scope', reason: 'scope_add',
                         tcHrs: 8, psHrs: 8, createdAt: 'Sep 30, 2026', clientApproved: false,
                         clientName: '', clientAcceptedAt: '' }, extra || {});
}
function accepted(extra) {
  return co(Object.assign({ clientApproved: true, clientName: 'Tripp Butler', clientAcceptedAt: 'September 30, 2026' }, extra || {}));
}
// A prep change order adding a painter: no hours, one vendor line with its own id.
const PAINTER = { type: 'Painting', cost: 4500, lid: 'co-paint' };
const prepAdd = (extra) => co(Object.assign({ tcHrs: 0, psHrs: 0, description: 'Repaint the guest house', vendorAdds: [PAINTER] }, extra || {}));

// The change-order modal, acceptance and print sandbox (prep-co-hours.test.js's list).
const CO_FNS = ['_coJobBasis', 'coHours', 'coHoursTotal', 'coBaselineShift', 'coHoursLabel', '_coMoney', 'fmt', 'esc',
                'coPrice', 'coPriceTotal', 'coFixedTerms', 'coRateBasisTxt', 'coReasonLabel', 'estFixedFee',
                'estTolerancePctTxt', 'coBasisNoteHtml', 'updateCOHours', 'openChangeOrder', 'openCOAcceptModal',
                'closeCOAcceptModal', 'acceptChangeOrder', 'printChangeOrder', 'saveChangeOrder', '_coPriorAccepted',
                'coPriorHours', 'coNoHoursBaseTxt', 'coPrepReadoutHtml', 'prepFeeRate', 'agrBillingRates',
                'coRateModsLine', 'coRushPct', 'coRushPctFor', 'estFixedLines', 'coScopeLabel', 'coVendorAdds',
                'coVendorAddsTxt', 'coDraftVendorAdd', 'coPrepVendorReadout', 'moneyToNumber', '_srcLid',
                'vendorGroupCategories', 'directoryCategories', 'vendorCats', 'coPrepVendorsOn', '_agrHasPrepVendors', 'estPrepFeeOnTop', 'coBaselineMove', 'discountOnLabor'];
function coCtx(est, cos, seed, dir) {
  const dom = domStub(seed || {});
  const said = [];
  const job = Object.assign({}, est && est.svc === 'prep' ? PREP_JOB : LAB_JOB);
  const c = sandbox({
    fns: CO_FNS, vars: ['EST_TOLERANCE_PCT', 'CO_REASONS', 'PREP_FEE_RATE', 'RUSH_PCT', 'LOGISTICS_CATEGORIES', 'GROUP_JOB_MENU', '_srcLidSeq'],
    stubs: {
      document: dom, setTimeout: () => 0, vendorDirectory: dir || [],
      jobs: [job], changeOrders: cos || [],
      estimateStore: est ? { 1: { estimate: Object.assign({}, est), approved: true } } : {},
      currentEstimate: null,
      saveChangeOrders: () => {}, saveJobs: () => {}, syncJobToSheets: () => {}, renderJobs: () => {},
      showFB: (id, kind, msg) => said.push({ id, kind, msg }),
      _docNotice: (kind, msg, jobId) => said.push({ id: 'doc', kind, msg, jobId }),
      docNames: () => ({ printTitle: 'Havellin Change Order' }),
    },
  });
  c.__dom = dom; c.__said = said; c.__job = job;
  return c;
}
// Fill the modal the way a person does, then press Create.
function createCO(c, f) {
  const d = c.__dom;
  d.getElementById('co-jobid').value = '1';
  d.getElementById('co-description').value = f.desc || 'Scope added';
  d.getElementById('co-tc-hrs').value = f.tc == null ? '' : String(f.tc);
  d.getElementById('co-ps-hrs').value = f.ps == null ? '' : String(f.ps);
  d.getElementById('co-reason').value = 'scope_add';
  d.getElementById('co-vendor-type').value = f.vendor || '';
  d.getElementById('co-vendor-cost').value = f.cost || '';
  c.saveChangeOrder();
  return c.changeOrders[c.changeOrders.length - 1];
}

// The invoice sandbox, as fixed-price-change-orders.test.js builds it.
function inv(stubs) {
  return sandbox({
    fns: ['estTolerancePctTxt', 'finalAwaitsHours', 'paymentStageWord', 'invoiceHtml', 'docSentAt', 'paymentSplit',
          'rushScopeLine', 'rushCrewAdded', 'jobLogEntries', 'invFinalApproval', 'invFinalApprovalRecord', 'docKeyFor',
          'coHours', 'coHoursTotal', 'coBaselineShift', 'coPrice', 'coPriceTotal', 'coHoursLabel',
          '_coMoney', 'fmt', 'getVendorActuals', '_srcLineKey', 'samePerson', 'canonPersonName',
          '_invVendorFeeSentence', 'prepFeeRate', 'vendorGroupOfLine', 'resolveJobVendor',
          'coordHrsFor', 'prepLineTCHrs', 'vendorLineTCHrs', 'esc', 'fmtDate2', 'svcLabelOf',
          'conciergePhones', 'conciergePhonesText', 'assignedTCContact', 'vendorCats',
          'vendorPrimaryCat', 'estimateIsFeeOnly', 'isDecedentJob',
          'stagePaidTotal', 'paymentCounts', 'paymentLive', 'isRefundRecord', 'jobPaidTotal', 'jobPayments', 'discountOnLabor', 'estFixedFee', 'estPrepFeeOnTop',
          'estFixedLines', 'discountOnFixedFee', 'fixedDiscountBasisWords', 'rushBaseWords', 'coRushPct',
          'coVendorAdds', 'coVendorAddsTxt', 'jobPrepLines', 'coPrepVendorLines', 'jobIsFeeOnly', 'coAcceptedHours', 'estDeclutterHrs', 'escLines', 'finalCrewOnlyWarn', 'coBaselineMove'],
    vars: ['DOC_STAGE_WORD', 'EST_TOLERANCE_PCT', 'SMF_PCT', 'RUSH_PCT', 'SVC_LABELS', 'DEPT_EMAILS', 'HAVELLIN_OFFICE_PHONE',
           'NON_MOBILE_NUMBERS', 'DEFAULT_CONTRACTORS', 'COORD_TOUCHES', 'COORD_TOUCHES_BY_GROUP', 'COORD_TOUCHES_DEFAULT',
           'TOUCH_HRS', 'DECEDENT_SERVICES', 'PERSON_NAME_ALIASES', 'PREP_FEE_RATE'],
    stubs: Object.assign({ jobLogs: {}, estimateStore: {}, changeOrders: [], contractors: [],
                           currentEstimate: null, currentInvStage: 'final', vendorDirectory: [], jobPlans: {} }, stubs || {}),
  });
}
// Walk the engagement stage by stage, paying each invoice in full, and return the final.
function finalDoc(est, job, cos, logged) {
  const store = { 1: { estimate: est, approved: true, approvedBy: 'Anthony Graziano' } };
  const logs = logged ? { 1: [{ date: '2026-09-01', activity: 'work', members: [{ name: 'Anthony Graziano', role: 'TC', hours: logged.tc },
                                                                                { name: 'Crew', role: 'PS', hours: logged.ps }] }] } : {};
  const run = (payments) => ({ ctx: inv({ estimateStore: store, jobLogs: logs, changeOrders: cos || [] }),
                               job: Object.assign({}, job, { payments: payments }) });
  const a = run([]);
  const dep = Math.round(a.ctx.invoiceHtml(a.job, 'deposit').amtDue);
  const b = run([{ uid: 'd', stage: 'deposit', amount: dep, date: '2026-08-01', method: 'wire' }]);
  const mid = Math.round(b.ctx.invoiceHtml(b.job, 'midpoint').amtDue);
  const c = run([{ uid: 'd', stage: 'deposit', amount: dep, date: '2026-08-01', method: 'wire' },
                 { uid: 'm', stage: 'midpoint', amount: mid, date: '2026-09-01', method: 'wire' }]);
  const d = c.ctx.invoiceHtml(c.job, 'final');
  d._collected = dep + mid + Math.round(d.amtDue);
  return d;
}

// The estate agreement and Exhibit A sandboxes (appraisal-tier.test.js's lists).
const TIER_FNS = ['weArrangeAppraisals', 'docTierProduces', 'docTierOf', 'docTierDef', 'docTierScope', 'svcHasDocStep',
                  'appraisalDuty', 'estimateAppraiserLines', 'estimateAppraiserNames'];
const TIER_VARS = ['DOC_TIERS', 'DOC_TIER_FROM_SCOPE', 'JOB_STEPS'];
const AGR_FNS = ['_agrComplianceHeading', '_agrComplianceLead', '_agrApprover', '_agrTrustDeliverable', 'matterDef',
                 'matterTypeOf', 'invFiduciaryMode', 'marketingOptOutBlock', 'marketingUseParas', '_mktClause',
                 'estTolerancePctTxt', 'agreementHtml', 'agrPriceAdjustments', '_pctWords', 'probateAgreementHtml',
                 '_agrApprovedStamp', 'agrBillingRates', 'materialsBasisNote', 'materialsPackageQuoted',
                 'fmt', 'esc', 'paymentSplit', 'isDecedentJob', 'agrSection', '_agrHasPrepVendors', 'estimateDocScope',
                 'docScopeDef', '_agrScopeServices', '_agrMidpointTrigger', '_agrProbateCompliance', 'esignAnchor',
                 'estFixedFee', 'estPrepFeeOnTop', 'estFixedLines', 'fixedDiscountBasisWords', 'coRushPctFor', '_agrOtherAppraisalsBy', 'coPrepVendorsOn'].concat(TIER_FNS);
const AGR_VARS = ['AGR_NOT_AN_ACCOUNTING', '_PCT_WORDS', 'MATTER_TYPES', 'EST_TOLERANCE_PCT', 'SMF_PCT', 'DECEDENT_SERVICES',
                  'HAVELLIN_OFFICE_PHONE', 'DOC_SCOPES', 'ESIGN_ANCHORS', 'RUSH_PCT'].concat(TIER_VARS);
const agrCtx = () => sandbox({ fns: AGR_FNS, vars: AGR_VARS, stubs: { estimateStore: {}, currentEstimate: null } });
const ceCtx = () => sandbox({ fns: ['estTolerancePctTxt', '_cePhases', 'estimateDocScope', 'docScopeDef', 'isDecedentJob', 'esc', 'estimateAppraiserNames', 'estimateAppraiserLines'].concat(TIER_FNS),
                              vars: ['AGR_NOT_AN_ACCOUNTING', 'MATTER_TYPES', 'EST_TOLERANCE_PCT', 'DOC_SCOPES', 'DECEDENT_SERVICES'].concat(TIER_VARS),
                              stubs: { isFormalDoc: () => true } });
const EST_ESTATE = { svc: 'probate', jobId: 1, docScope: 'full', tcFee: 18500, psFee: 12500, pkgCost: 1500,
                     pkgLabel: 'Estate Premium — $1,500', smf: 0, prepFee: 0, havellinTotal: 32500, totTC: 100, totPS: 100,
                     tcRate: 185, psRate: 125, discountPct: 0, fixedPrice: false, rush: false,
                     vendors: [], prepItems: [], rooms: [], collections: [], vehicles: [] };
const ART = { type: 'Art Appraiser', cost: 1500, lid: 'va' };
const estWith = (over) => Object.assign({}, EST_ESTATE, over || {});
const ESTATE_JOB = (over) => Object.assign({ id: 1, hvlId: 'HVL-0007', name: 'Margaret Doe', svc: 'probate', matterType: 'probate',
  executor: 'Tripp Butler', addr: '69 Beach Blvd', city: 'Palm Beach', zip: '33480', deathDate: '2026-01-15', docTier: 'values' }, over || {});

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('⚠⚠ Q14 follow-up — a fixed-price rush job\'s change order carries the premium, pinned on it');
  {
    const c0 = coCtx(EST_FXR, []);
    eq(c0.coRushPctFor(EST_FXR), 0.2, 'a fixed price, expedited, with its premium as a line: 20%');
    eq(c0.coRushPctFor(EST_FX_OLD), 0, 'an older fixed fee, with the premium inside it: none — it was papered at plain rates');
    eq(c0.coRushPctFor(EST_TMR), 0, 'an hourly rush job: none — its change orders carry hours, never a price');
    eq(c0.coRushPctFor(Object.assign({}, EST_FXR, { rush: false })), 0, 'a fixed price that is not expedited: none');
    eq(c0.coRushPctFor(Object.assign({}, EST_FXR, { rushPct: 0.25 })), 0.25, 'the rate pinned on the estimate, not RUSH_PCT');

    // The price: plain rates times one plus the premium, rounded once.
    eq(c0.coPrice({ tcHrs: 8, psHrs: 8 }, 150, 100), 2000, 'plain: 8 × $150 + 8 × $100');
    eq(c0.coPrice({ tcHrs: 8, psHrs: 8, rushPct: 0.2 }, 150, 100), 2400, '⚠⚠ with the premium pinned on it: $2,400');
    eq(c0.coPrice({ tcHrs: 0.5, rushPct: 0.2 }, 185, 125), 111, 'rounded once: $92.50 × 1.2 = $111, never $93 × 1.2');
    eq(c0.coPriceTotal([{ tcHrs: 8, psHrs: 8, rushPct: 0.2 }, { tcHrs: 8, psHrs: 8 }], 150, 100), 4400,
       'each change order carries its own pin: a new one at $2,400 beside an older one at $2,000');

    // Created through the real modal and save.
    const c1 = coCtx(EST_FXR, []);
    const made = createCO(c1, { tc: 8, ps: 8 });
    eq(made && made.rushPct, 0.2, '⚠⚠ Create pins the premium on the record');
    const t1 = coCtx(EST_TMR, []);
    ok(!('rushPct' in (createCO(t1, { tc: 8, ps: 8 }) || {})), 'an hourly rush job\'s change order carries no pin (the timesheet bills it)');
    const o1 = coCtx(EST_FX_OLD, []);
    ok(!('rushPct' in (createCO(o1, { tc: 8, ps: 8 }) || {})), 'nor does one on an older fixed fee');

    // The modal's readout, before it is saved.
    const r = coCtx(EST_FXR, [], { 'co-jobid': '1', 'co-tc-hrs': '8', 'co-ps-hrs': '8' });
    r.updateCOHours();
    const note = text(r.__dom.getElementById('co-hrs-note').innerHTML);
    has(note, 'plus the 20% expedited-delivery premium, as this job is expedited', 'the readout names the premium');
    has(note, '+ $2,400 on the fixed project fee', 'and the price it comes to');
    has(note, 'goes from $26,000 to $28,400', 'and the fee it leaves');
    r.openChangeOrder(1);
    has(text(r.__dom.getElementById('co-basis-note').innerHTML), 'plus the 20% expedited-delivery premium, because this job is expedited',
        'the note above the boxes says so before anyone types');

    // The printed page.
    const p = coCtx(EST_FXR, [co({ rushPct: 0.2 })]);
    p.printChangeOrder(100);
    const d = text(p.__printed);
    has(d, '+ $2,400', 'the printed change order carries the price with the premium');
    has(d, '+8.0 concierge hrs at $150/hr · +8.0 specialist hrs at $100/hr · plus the 20% expedited-delivery premium',
        'and its basis, so $2,000 plus 20% can be checked by hand');
    has(d, 'Revised fixed project fee $28,400', 'the fee it leaves');
    has(d, 'It is priced at the hourly rates shown plus the 20% expedited-delivery premium, as this engagement is expedited; the preferred-client discount on your fixed project fee does not apply to it.',
        '⚠⚠ the rate line: the premium applies, the discount still does not');
    lacks(d, 'the expedited-delivery premium and the preferred-client discount on your fixed project fee do not apply',
          'and never the old plain-rate sentence on a change order that carries it');

    // A change order raised before today, on the same job, keeps what its client signed.
    const q = coCtx(EST_FXR, [co()]);
    q.printChangeOrder(100);
    const dq = text(q.__printed);
    has(dq, '+ $2,000', '⚠ a change order with no pin prints its plain-rate price');
    has(dq, 'It is priced at the plain hourly rates shown: the expedited-delivery premium and the preferred-client discount on your fixed project fee do not apply to it.',
        'and the sentence it was signed with');

    // Acceptance moves the job's figure by the price with the premium.
    const a = coCtx(EST_FXR, [co({ rushPct: 0.2 })], { 'coa-co-id': '100', 'coa-client-name': 'Tripp Butler' });
    a.openCOAcceptModal(100);
    has(text(a.__dom.getElementById('coa-summary').innerHTML), 'Change to the fixed project fee + $2,400', 'the acceptance panel states it');
    a.__dom.getElementById('coa-client-name').value = 'Tripp Butler';
    a.acceptChangeOrder();
    eq(a.__job.havellinEst, 31200 + 2400, 'accepting moves the job\'s figure by $2,400');
    has(a.__said.map((x) => x.msg).join(' | '), '+ $2,400 on the fixed project fee', 'and the notice says so');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('⚠⚠ Q14 follow-up — the final adds exactly the signed price, and the premium line stays on the fee');
  {
    const none = finalDoc(EST_FXR, LAB_JOB, []);
    const one = finalDoc(EST_FXR, LAB_JOB, [accepted({ rushPct: 0.2 })]);
    eq(one._collected - none._collected, 2400, '⚠⚠ the job collects $2,400 more — the price printed on the change order, no more');
    const old = finalDoc(EST_FXR, LAB_JOB, [accepted()]);
    eq(old._collected - none._collected, 2000, 'a change order with no pin adds its plain-rate $2,000');
    has(text(one.html), '+ $2,400', 'the final\'s change-order row carries the signed price');
    // The fee's own premium line is 20% of the fee, never of the fee plus the change order.
    has(text(one.html), '5,200', 'the premium line on the fee is still $5,200 (20% of $26,000)');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('⚠ Q14 follow-up — the agreement says the change orders carry it, on the same rule');
  {
    const c = agrCtx();
    has(c.agrPriceAdjustments(EST_FXR, 'Contractor'), 'of the fixed price is charged in addition to it, as itemized on the Estimate, and on the price of any Change Order.',
        'the fixed-fee premium clause names the change orders');
    lacks(c.agrPriceAdjustments(EST_TMR, 'Contractor') || '', 'Change Order', 'an hourly clause says nothing of them (the hours carry it as billed)');
    eq(c.agrPriceAdjustments(EST_FX_OLD, 'Contractor'), '', 'an older fixed fee still prints no adjustments at all');
    // The estate form's blank change order, on a fixed-price rush estate.
    const job = ESTATE_JOB({ svc: 'cleanout', matterType: 'probate', docTier: 'values' });
    const fx = Object.assign({}, EST_FXR, { svc: 'cleanout', docScope: 'full', vendors: [], prepItems: [], rooms: [], collections: [], vehicles: [] });
    const h = text(c.probateAgreementHtml(job, fx));
    has(h, 'the additional hours at the rates in Section 3.1, plus the twenty percent (20%) expedited-delivery premium',
        '⚠ the form\'s Price of This Change names the premium');
    const h2 = text(c.probateAgreementHtml(job, EST_FX_OLD));
    has(h2, '(the additional hours at the rates in Section 3.1)', 'an older fixed fee\'s form is unchanged');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('⚠⚠ Q20 — the documentation step keeps inventory scheduling; an appraiser is priced by its line');
  {
    const ctx = driveCalcAll({ svc: 'cleanout', rooms: [] }).ctx;
    eq(ctx.DOC_COORD_INVENTORY_SHARE, 0.5, 'the inventory share is a starting 50%, like the capture share');
    for (const svc of ['cleanout', 'probate', 'contested_probate']) {
      const base = ctx.JOB_STEPS[svc].document;
      eq(ctx.effectiveJobSteps(svc, 'full').document, [base[0] * 0.5, base[1]], svc + ': full scope keeps the pool and half the scheduling');
      eq(ctx.effectiveJobSteps(svc, 'capture').document, [0, base[1] * 0.5], svc + ': capture is unchanged — none of the scheduling');
    }
    eq(JSON.stringify(ctx.JOB_STEPS.cleanout.document), '[0.12,0.9]', 'the catalogue itself is never mutated');

    // Driven: the appraiser half no longer rides every estate quote.
    const BASE = ['Living Room', 'Kitchen', 'Dining Room', 'Family Room / Great Room', 'Primary Suite', 'Bedroom 2', 'Bedroom 3'];
    const r = driveCalcAll({ svc: 'cleanout', sqft: 3500, rooms: BASE });
    const after = r.est || {};
    r.ctx.DOC_COORD_INVENTORY_SHARE = 1;   // the column as it was
    r.ctx.calcAll();
    const before = r.ctx.currentEstimate || {};
    ok(before.totTC > after.totTC, 'the concierge hours fall by the appraiser half of the scheduling (' + before.totTC + ' → ' + after.totTC + ')');
    eq(before.totPS, after.totPS, 'and the specialists\' hands-on pool is untouched');
    ok(before.havellinTotal - after.havellinTotal >= 150, 'about ' + (before.havellinTotal - after.havellinTotal) + ' off a 3,500 sq ft Estate Settlement');

    // An appraiser added to the estimate books its own coordination: 4 touches, 2 hours.
    const s = driveCalcAll({ svc: 'cleanout', sqft: 3500, rooms: BASE });
    const e0 = s.est || {};
    s.ctx.vendors = [{ type: 'Art Appraiser', cost: 1500, lid: 'va' }];
    s.ctx.calcAll();
    const e1 = s.ctx.currentEstimate || {};
    eq(e1.vendorTCHrs, 2, '⚠⚠ an appraiser line books 2 concierge hours (4 touches)');
    ok(e1.havellinTotal > e0.havellinTotal, 'so adding one prices its scheduling ($' + e0.havellinTotal + ' → $' + e1.havellinTotal + ')');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('⚠ Q20 — on the page calcAll paints: inventory scheduling, and the appraisals tier asking for its appraiser');
  {
    const BASE = ['Living Room', 'Kitchen', 'Dining Room', 'Family Room / Great Room', 'Primary Suite', 'Bedroom 2', 'Bedroom 3'];
    const r = driveCalcAll({ svc: 'cleanout', sqft: 3500, rooms: BASE, job: { docTier: 'appraisals', matterType: 'probate' } });
    const lbl = String((r.doc.getElementById('tc-fee-label') || {}).innerHTML || '');
    has(lbl, 'Inventory scheduling', '⚠ the concierge breakdown names inventory scheduling');
    lacks(lbl, 'Appraiser &amp; inventory scheduling', 'not appraiser scheduling');
    lacks(lbl, 'Appraiser & inventory scheduling', 'in either spelling');
    const hint = () => text((r.doc.getElementById('e-docscope-hint') || {}).innerHTML || '');
    has(hint(), 'This tier promises the specialist appraisals: add each appraiser under Vendors, so its scheduling is priced on its own line.',
        '⚠⚠ the appraisals tier asks for its appraiser, painted by calcAll');
    has(hint(), 'An appraiser is priced when you add one under Vendors.', 'the full-scope hint says how an appraiser is priced');
    r.ctx.vendors = [{ type: 'Art Appraiser', cost: 1500, lid: 'va', tcHrs: 2 }];
    r.ctx.calcAll();
    lacks(hint(), 'This tier promises the specialist appraisals', 'and withdraws the ask once one is on the estimate');
    const capture = (r.ctx.DOC_SCOPES || []).find((d) => d.key === 'capture') || {};
    has(capture.hint, 'Prices half the documentation work and none of its scheduling.', 'the capture hint no longer speaks of appraiser coordination');
    lacks(JSON.stringify(r.ctx.DOC_SCOPES || []), 'coordinates the appraisers', 'and no scope promises appraiser coordination');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('⚠⚠ Q20 — who arranges the appraisals: all of them, the ones Exhibit A lists, or none');
  {
    const c = sandbox({ fns: TIER_FNS.concat(['appraisalTierNote']), vars: TIER_VARS });
    const J = (tier) => ({ svc: 'probate', docTier: tier });
    const W = { vendors: [ART] }, N = { vendors: [] };
    eq(c.appraisalDuty('full', J('appraisals'), N), 'all', 'the appraisals tier at full scope: all of them');
    eq(c.appraisalDuty('full', J('appraisals'), W), 'all', '…with or without an appraiser line');
    eq(c.appraisalDuty('full', J('values'), W), 'listed', '⚠⚠ the values tier with an appraiser on the estimate: the ones it lists');
    eq(c.appraisalDuty('full', J('values'), N), '', 'the values tier with none: counsel\'s, as before');
    eq(c.appraisalDuty('capture', J('contents'), W), 'listed', 'no tier refuses one — an appraiser on a capture estimate is ours to coordinate');
    eq(c.appraisalDuty('capture', J('appraisals'), N), '', 'a re-tiered job never promises what its scope never priced');
    eq(c.appraisalDuty('full', J('values'), undefined), '', 'without the estimate the tier answers alone');
    eq(c.weArrangeAppraisals('full', J('values'), W), true, 'weArrangeAppraisals is yes for "listed"');
    eq(c.estimateAppraiserLines({ vendors: [ART, { type: 'Auction House' }, { type: 'Jewelry & Watch Appraiser' }] }).length, 2,
       'an appraiser line is one whose category is an appraiser\'s');
    eq(c.estimateAppraiserNames({ vendors: [ART, { type: 'Jewelry & Watch Appraiser' }, ART] }), 'Art Appraiser and Jewelry & Watch Appraiser',
       'named once each, as a document names them');
    has(c.appraisalTierNote(J('appraisals'), []), 'add each appraiser under Vendors', 'the top tier with no appraiser: Build Estimate flags it');
    eq(c.appraisalTierNote(J('appraisals'), [ART]), '', 'and says nothing once one is on');
    eq(c.appraisalTierNote(J('values'), []), '', 'no other tier promises them');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('⚠⚠ Q20 — the contract names the appraisals Exhibit A lists, instead of carving them all out');
  {
    const c = agrCtx();
    const vj = ESTATE_JOB({ docTier: 'values' });
    const withArt = estWith({ vendors: [ART] });
    const s2 = text(c._agrScopeServices('full', vj, withArt));
    has(s2, 'Havellin will coordinate the professional appraisals listed in Exhibit A (Art Appraiser); any other appraisal remains the responsibility of the Client and the estate attorney.',
        '⚠⚠ §2 on the values tier with an appraiser: Havellin coordinates the one it priced');
    lacks(s2, 'The coordination of professional appraisals is not within this engagement', 'and the bold carve-out is gone');
    has(text(c._agrScopeServices('full', vj, estWith())), 'The coordination of professional appraisals is not within this engagement',
        'with no appraiser line the carve-out stands');
    lacks(text(c._agrScopeServices('full', ESTATE_JOB({ docTier: 'appraisals' }), withArt)), 'listed in Exhibit A',
          'the appraisals tier promises them all and never narrows to a list');
    // At None the inventory and valuation are counsel's, and an appraiser Exhibit A prices is still ours.
    const none = text(c._agrScopeServices('none', ESTATE_JOB({ docTier: 'none' }), withArt));
    has(none, 'The inventory and valuation of estate assets are not within this engagement', 'at None the inventory and valuation stay counsel\'s');
    has(none, 'Havellin will coordinate the professional appraisals listed in Exhibit A (Art Appraiser); any other appraisal remains the responsibility of the Client and the estate attorney.',
        '⚠ and the appraiser Exhibit A prices is ours to coordinate, even at None');
    lacks(text(c._agrScopeServices('none', ESTATE_JOB({ docTier: 'none' }), estWith())), 'listed in Exhibit A', 'with no line, nothing is promised at None');
    const cap = text(c._agrScopeServices('capture', ESTATE_JOB({ docTier: 'contents' }), withArt));
    has(cap, 'Valuation of estate assets is not within this engagement', 'capture with an appraiser: valuation stays counsel\'s');
    has(cap, 'Havellin will coordinate the professional appraisals listed in Exhibit A (Art Appraiser)', 'and the listed appraiser is ours');
    lacks(cap, 'and the coordination of professional appraisals are not within', 'without carving out the appraiser it lists');

    // §5.2 on each matter branch.
    const comp = (m, e) => c._agrProbateCompliance('full', ESTATE_JOB({ docTier: 'values', matterType: m }), e).join(' | ');
    has(comp('probate', withArt), 'Havellin will coordinate the professional appraisals listed in Exhibit A (Art Appraiser) within the 60-day inventory deadline from Letters of Administration issuance. Any other appraisal is arranged by the estate attorney;',
        '§5.2, probate: the listed appraisals within the deadline, the rest counsel\'s');
    has(comp('trust', withArt), 'Any other appraisal is arranged by the trustee or their counsel;', 'trust: the trustee\'s counsel for the rest');
    has(comp('neither', withArt), 'Any other appraisal is arranged by the Client;', 'neither: the Client');
    has(comp('probate', estWith()), 'Professional appraisals are arranged by the estate attorney.', 'no line: unchanged');

    // §5.3's authorisation table, and Exhibit A.
    const full = text(c.probateAgreementHtml(vj, withArt));
    has(full, 'Arrange the appraisals listed in Exhibit A', '§5.3 authorises the listed appraisals');
    lacks(full, 'Admit an appraiser engaged by counsel', 'instead of admitting counsel\'s');
    const P = ceCtx()._cePhases(withArt, vj);
    const recv = P.find((p) => p.receive).receive.join(' | ');
    has(recv, 'Independent appraisals attached as supporting documentation', 'Exhibit A\'s records list names them, as the contract does');

    // §5.3's row names the party §5.2 names, on every matter branch (one rule, _agrOtherAppraisalsBy).
    const row = (m) => text(c.probateAgreementHtml(ESTATE_JOB({ docTier: 'values', matterType: m }), withArt));
    has(row('probate'), 'any other appraiser as scheduled by the estate attorney', 'probate: the estate attorney, as §5.2 says');
    has(row('trust'), 'any other appraiser as scheduled by the trustee or their counsel', 'trust: the trustee or their counsel, as §5.2 says');
    has(row('neither'), 'any other appraiser as scheduled by the Client', '⚠ neither: the Client, as §5.2 says — it named the estate attorney');
    has(row('neither'), 'Any other appraisal is arranged by the Client;', 'and §5.2 on the same page agrees');

    // The client estimate's capture-scope sort phase says the same as the contract.
    const capJob = ESTATE_JOB({ docTier: 'contents' });
    const sortOf = (e) => (ceCtx()._cePhases(e, capJob).map((x) => x.body || '').join(' | '));
    const capArt = text(sortOf(estWith({ docScope: 'capture', vendors: [ART] })));
    has(capArt, 'whose office states the values; we coordinate the appraisals this estimate lists (Art Appraiser), and counsel arranges any other.',
        '⚠ capture with an appraiser listed: the estimate says it is ours, as §2 does — it said counsel arranges any appraisal');
    lacks(capArt, 'states the values and arranges any appraisal', 'and not that counsel arranges them all');
    has(text(sortOf(estWith({ docScope: 'capture' }))), 'whose office states the values and arranges any appraisal.', 'with none listed, counsel arranges them all, as before');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('⚠ Q20 — the desk and the close-out list read the approved estimate, through jobAppraisalDuty');
  {
    const mk = (store) => sandbox({ fns: ['jobAppraisalDuty', 'approvedEstimateFor', 'appraisalDuty', 'estimateDocScope', 'docScopeDef',
                                          'svcHasDocStep', 'estimateAppraiserLines', 'docTierProduces', 'docTierOf', 'docTierDef'],
                                    vars: ['DOC_SCOPES', 'DOC_TIERS', 'DOC_TIER_FROM_SCOPE', 'JOB_STEPS'], stubs: { estimateStore: store } });
    const job = ESTATE_JOB({ docTier: 'values' });
    eq(mk({}).jobAppraisalDuty(job), '', 'before an estimate is approved the tier answers: values is counsel\'s');
    eq(mk({}).jobAppraisalDuty(ESTATE_JOB({ docTier: 'appraisals' })), 'all', '…and appraisals is ours');
    eq(mk({ 1: { estimate: estWith({ vendors: [ART] }), approved: true } }).jobAppraisalDuty(job), 'listed',
       '⚠ once approved, an appraiser on the estimate is ours on the desk as in the contract');
    eq(mk({ 1: { estimate: estWith({ vendors: [ART] }), approved: false } }).jobAppraisalDuty(job), '',
       'an unapproved estimate is not the contract yet');
    has(fn('printCourtInventory'), "Havellin schedules the appraiser on the estimate where it covers the item", 'the Court Inventory\'s DRAFT fix has the listed arm');
    has(fn('printTrustSchedule'), "the trustee or their counsel arranges any other", 'and the Trust Schedule\'s');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('⚠⚠ Home Prep change orders — a vendor found mid-job can be added, and is billed like any other');
  {
    const DIR = [{ vendor_name: 'Brush & Co', category_group: 'Property Preparation', category: 'Painting' },
                 { vendor_name: 'Green Thumb', category_group: 'Property Preparation', category: 'Landscaper' },
                 { vendor_name: 'Hauler', category_group: 'Disposal & Waste Management', category: 'Junk Removal / Hauling' }];
    // The modal: the block is on Home Prep, filled with the directory's preparation categories, and off elsewhere.
    const m = coCtx(prepEst(0), [], { 'co-jobid': '1' }, DIR);
    m.openChangeOrder(1);
    eq(m.__dom.getElementById('co-vendor-wrap').style.display, 'grid', 'the added-vendor block shows on Home Prep');
    const opts = m.__dom.getElementById('co-vendor-type').innerHTML;
    has(opts, '>Painting<', 'with the preparation categories');
    lacks(opts, 'Junk Removal', 'and no others');
    has(text(m.__dom.getElementById('co-basis-note').innerHTML), 'A change order can also add a preparation vendor found mid-job', 'the note says it can');
    const l = coCtx(EST_TM, [], { 'co-jobid': '1', 'co-vendor-wrap': { style: { display: 'grid' } } }, DIR);
    l.openChangeOrder(1);
    eq(l.__dom.getElementById('co-vendor-wrap').style.display, 'none', '⚠ and is hidden again on a labour job (one modal serves every job)');

    // Create: a vendor alone is a change order; nothing at all is not; a vendor needs its cost.
    const c = coCtx(prepEst(0), [], {}, DIR);
    const made = createCO(c, { vendor: 'Painting', cost: '$4,500' });
    eq(made && made.vendorAdds && made.vendorAdds.map((v) => [v.type, v.cost]), [['Painting', 4500]], '⚠⚠ a prep change order records the vendor and its estimated cost');
    ok(!!(made && made.vendorAdds && made.vendorAdds[0].lid), 'with its own line id for the sourcing record');
    has(c.__said.map((x) => x.msg).join(' | '), 'created (adds Painting (est. $4,500)) — waiting on the client',
        '⚠ the created notice names the vendor — it read "no hours change"');
    eq(made && made.tcHrs, 0, 'and no hours — a vendor alone is a change');
    const e1 = coCtx(prepEst(0), []);
    eq(createCO(e1, {}), undefined, 'nothing entered: refused');
    has(text(e1.__dom.getElementById('co-fb').innerHTML), 'or the prep vendor it adds', 'and the refusal names both');
    const e2 = coCtx(prepEst(0), []);
    eq(createCO(e2, { vendor: 'Painting' }), undefined, 'a vendor with no cost: refused');
    has(text(e2.__dom.getElementById('co-fb').innerHTML), 'estimated cost, so the client sees the fee it carries', 'so the client sees the fee it carries');
    const lab = coCtx(EST_TM, []);
    const lm = createCO(lab, { tc: 4, vendor: 'Painting', cost: '4500' });
    ok(lm && !lm.vendorAdds, '⚠ a vendor left in the hidden block never rides onto a labour job\'s change order');

    // The labels, the readout, the page and the acceptance.
    eq(c.coScopeLabel(prepAdd()), 'adds Painting (est. $4,500)', 'the card names the change');
    eq(c.coScopeLabel(prepAdd({ tcHrs: 4 })), '+4.0 concierge hrs · adds Painting (est. $4,500)', 'with its hours when it has both');
    const r = coCtx(prepEst(0), [], { 'co-jobid': '1', 'co-vendor-type': 'Painting', 'co-vendor-cost': '$4,500' });
    r.updateCOHours();
    has(text(r.__dom.getElementById('co-hrs-note').innerHTML), 'Adds Painting to the preparation vendors', 'the readout speaks with no hours typed');
    has(text(r.__dom.getElementById('co-hrs-note').innerHTML), 'about $1,350 at the estimated $4,500', 'and states the fee at the estimate');

    const p = coCtx(prepEst(0), [prepAdd()]);
    p.printChangeOrder(100);
    const d = text(p.__printed);
    has(d, 'This change order adds Painting to the preparation vendors.', '⚠ the printed page says what it adds');
    has(d, 'The vendor bills you directly, at cost, and the 30% site management fee in your agreement is billed on what it actually charges — about $1,350 at the estimated $4,500.',
        'and on what terms');
    lacks(d, 'Third-party vendor costs are unaffected', '⚠ and not the line that would now be false');
    has(d, 'Added preparation vendor: Painting', 'the table names the vendor');
    const ph = coCtx(prepEst(0), [co({ tcHrs: 4, psHrs: 0 })]);
    ph.printChangeOrder(100);
    has(text(ph.__printed), 'Third-party vendor costs are unaffected', 'an hours-only prep change order prints exactly as before');

    const a = coCtx(prepEst(0), [prepAdd()], { 'coa-co-id': '100' });
    a.openCOAcceptModal(100);
    has(text(a.__dom.getElementById('coa-summary').innerHTML), 'Added vendor Painting, est. $4,500, billed to you directly', 'the acceptance panel names it');
    lacks(text(a.__dom.getElementById('coa-summary').innerHTML), 'an hour, billed as worked',
          '⚠ and prints no hourly rate row for a change that adds no hours');
    const ah = coCtx(prepEst(0), [prepAdd({ tcHrs: 6 })], { 'coa-co-id': '100' });
    ah.openCOAcceptModal(100);
    has(text(ah.__dom.getElementById('coa-summary').innerHTML), 'an hour, billed as worked', 'one that adds hours as well keeps its rate row');
    has(text(a.__dom.getElementById('coa-terms').innerHTML), 'the addition of Painting to the preparation vendors, billed to them directly at cost',
        'and the client agrees to it in words');
    a.__dom.getElementById('coa-client-name').value = 'Helen Marston';
    a.acceptChangeOrder();
    has(a.__said.map((x) => x.msg).join(' | '), 'Painting now sits with the prep vendors on the Job Plan', 'the notice says where it went');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('⚠⚠ Home Prep change orders — the added vendor joins the job\'s prep lines once accepted, and nowhere before');
  {
    const L = (cos) => sandbox({ fns: ['jobPrepLines', 'coPrepVendorLines', 'coVendorAdds'], stubs: { changeOrders: cos } });
    const est = prepEst(0);
    eq(L([prepAdd()]).jobPrepLines(PREP_JOB, est).length, 4, 'an unaccepted change order adds nothing');
    const lines = L([accepted({ tcHrs: 0, psHrs: 0, vendorAdds: [PAINTER] })]).jobPrepLines(PREP_JOB, est);
    eq(lines.map((x) => x.type), ['Painting', 'Landscaping', 'Cleaning', 'Staging', 'Painting'], '⚠⚠ an accepted one adds its vendor after the estimate\'s');
    eq(lines[4].lid, 'co-paint', 'keeping its own line id');
    eq(L([]).jobPrepLines(PREP_JOB, Object.assign({}, est, { prepEnabled: false, svc: 'cleanout' })).length, 0,
       'an estimate with prep switched off carries none, as the invoice always read it');

    // The invoice's fee on actual spend includes it — at its estimate until a quote is recorded, then at the quote.
    const cos = [accepted({ tcHrs: 0, psHrs: 0, vendorAdds: [PAINTER] })];
    const a0 = finalDoc(est, PREP_JOB, []);
    const a1 = finalDoc(est, PREP_JOB, cos);
    eq(a1._collected - a0._collected, 1350, '⚠⚠ the job collects the fee on the added vendor: 30% of $4,500');
    const quoted = Object.assign({}, PREP_JOB, { prepSourcing: { 'Lco-paint': { quote: 5000 } } });
    const a2 = finalDoc(est, quoted, cos);
    eq(a2._collected - a0._collected, 1500, '…and on its actual quote once one is recorded: 30% of $5,000');
    has(text(a1.html), 'Adds Painting (est. $4,500) — it bills you directly, and the site management fee on it is in the fee above', 'the change-order row names it, and where its fee is');
    lacks(text(a1.html), 'preparation vendors above', '⚠ and never points at a vendor list this invoice does not print');
    has(text(a1.html), 'A vendor a change order added bills you directly, and the site management fee on what it actually charged is in the fee above.',
        'the section\'s note says where its fee is, too');
    has(text(a1.html), 'adds Painting, in the site management fee above', '⚠ the payment summary names the vendor — it read "no hours change, billed in the hours above"');
    lacks(text(a1.html), 'no hours change, billed in the hours above', 'not that');
    // The ±15% baseline moves with the accepted vendor, at its estimated cost: an accepted $4,500 painter is authorised scope.
    eq(a1.requiresApproval, a0.requiresApproval, 'an accepted vendor alone does not send the final to a manager');
    // The case that crosses the tolerance: a $9,000 painter adds $2,700 of fee to a $13,500 one, +20%.
    const BIG = [accepted({ tcHrs: 0, psHrs: 0, vendorAdds: [{ type: 'Painting', cost: 9000, lid: 'co-big' }] })];
    const big = finalDoc(est, PREP_JOB, BIG);
    eq(big._collected - a0._collected, 2700, 'fixture: the $9,000 painter adds $2,700 of fee, 20% of the $13,500 quoted');
    ok(big.requiresApproval === false, '⚠⚠ and the final does not ask for the manager PIN: the accepted vendor is authorised scope (it read +20%)');
    const over = finalDoc(est, Object.assign({}, PREP_JOB, { prepSourcing: { 'Lco-big': { quote: 20000 } } }), BIG);
    ok(over.requiresApproval === true, 'but a quote far above the estimate the client accepted still counts as over, and asks');

    // The Job Plan's sourcing writer lands on the line's own key.
    const S = sandbox({ fns: ['_srcSlot', '_prepJob', 'jobPrepLines', 'coPrepVendorLines', 'coVendorAdds', '_srcLineKey'],
                        stubs: { jobs: [Object.assign({}, PREP_JOB)], estimateStore: { 1: { estimate: est, approved: true } },
                                 changeOrders: cos, _srcAdoptLineIds: () => false, _srcPersistEstimates: () => {} } });
    eq(S._prepJob(1, 4).key, 'Lco-paint', '⚠ row five on the plan is the change order\'s line, keyed on its id');
    eq(S._prepJob(1, 0).key, 'Lp1', 'and row one is still the estimate\'s');

    // The Job Plan's sourcing list draws it, with the directory's vendors for its trade to book.
    const SRC_FNS = ['renderVendorSourcing', 'jobPrepLines', 'coPrepVendorLines', 'coVendorAdds', '_srcLineKey', 'esc', 'fmt', 'dirStaleNotice',
      'logisticsLinesFor', 'logisticsCatsFor', 'logisticsLineOn', '_fldBg', 'vendorPickerOptions', '_selVendorId', 'resolveJobVendor',
      'lookupVendorById', 'vendorCategoriesForSlot', 'approvedVendorsInCats', 'isActiveVendor', '_catSet', 'vendorCats', 'vendorStatusOptions',
      '_coordHrsField', 'prepLineTCHrs', 'coordHrsFor', 'coordTouches', '_vendorRefLine', 'vendorPrimaryCat', 'vendorIdOf', 'vendorStars',
      'vendorPerf', 'prepFeeRate', 'coordHrsRollup', 'vendorContacts', 'fmtPhoneDisplay'];
    const sourcing = (cos) => sandbox({ fns: SRC_FNS, vars: ['LOGISTICS_CATEGORIES', 'GROUP_JOB_MENU', 'VENDOR_GROUP_CARDS', 'PREP_FEE_RATE', '_dirStale', 'VENDOR_SLOT_CATEGORY_MAP', 'TOUCH_HRS', 'COORD_TOUCHES_BY_GROUP', 'COORD_TOUCHES'],
      stubs: { changeOrders: cos, jobs: [PREP_JOB], estimateStore: {}, document: domStub({}), contractors: [],
               vendorDirectory: [{ vendor_name: 'Brushworks Painting', category_group: 'Property Preparation', category: 'Painting', status: 'Active', _row: 3 }] } })
      .renderVendorSourcing(1, PREP_JOB, { svc: 'prep', prepEnabled: true, prepItems: [{ type: 'Staging', cost: 3000, lid: 'st' }], vendors: [] });
    const srcOn = String(sourcing(cos));
    ok(srcOn.indexOf('Painting') >= 0, '⚠⚠ the Job Plan\'s sourcing list draws the vendor the change order added');
    ok(srcOn.indexOf('Brushworks Painting') >= 0, 'with the directory\'s painter offered to book');
    ok(String(sourcing([prepAdd()])).indexOf('Painting') < 0, 'and an unaccepted change order draws nothing');

    // "Lined up" counts it.
    const V = sandbox({ fns: ['vendorSourcingProgress', '_srcLineKey', 'logisticsLinesFor', 'logisticsLineOn', 'logisticsCatsFor',
                              'jobPrepLines', 'coPrepVendorLines', 'coVendorAdds'],
                        vars: ['LOGISTICS_CATEGORIES'], stubs: { changeOrders: cos } });
    eq(V.vendorSourcingProgress(1, Object.assign({}, PREP_JOB, { prepSourcing: { 'Lco-paint': { status: 'Confirmed' } } }), est),
       { done: 1, total: 5 }, 'the sourcing count includes it, confirmed');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('the small items — the desk\'s All filter stays chosen');
  {
    let open = 1, captured = true, C = null;
    C = sandbox({ fns: ['_invApplyWhenDefault', 'setInvWhen', 'invClearFilters'], vars: ['_invFilter', '_invWhenJob'],
                  stubs: { _invCapturedToday: () => captured, renderInventoryTab: () => C._invApplyWhenDefault(open, []) } });
    C.renderInventoryTab();
    eq(C._invFilter.when, 'today', 'a desk opened on a day with a capture opens on Today');
    C.setInvWhen('all');
    eq(C._invFilter.when, 'all', '⚠⚠ pressing All shows All — it no longer snaps back to Today on the repaint');
    C.renderInventoryTab();
    eq(C._invFilter.when, 'all', 'and stays through any later repaint');
    open = 2;
    C.renderInventoryTab();
    eq(C._invFilter.when, 'today', 'opening another client\'s desk applies the default afresh');
    C.invClearFilters();
    eq(C._invFilter.when, 'all', 'Clear filters clears to All and stays there');
    captured = false; open = 3;
    C.renderInventoryTab();
    eq(C._invFilter.when, 'all', 'a day with no capture opens on All');
    // Afresh means all of it: nothing chosen on one client's desk carries to the next.
    captured = true; open = 4;
    C.renderInventoryTab();
    C.setInvWhen('today'); C._invFilter.q = 'piano'; C._invFilter.room = '2'; C._invFilter.flag = 'unnamed';
    C.renderInventoryTab();
    eq(C._invFilter, { when: 'today', room: '2', q: 'piano', flag: 'unnamed' }, 'a repaint keeps what the person chose on this desk');
    captured = false; open = 5;
    C.renderInventoryTab();
    eq(C._invFilter, { when: 'all', room: '', q: '', flag: '' },
       '⚠ another client\'s desk starts clean: no search, no chip, no room by index into a different house, and not Today with nothing shot there');
  }
  {
    // The join: the real renderInventoryTab asks the once-per-client rule, and no longer carries its own copy.
    const live = String(fn('renderInventoryTab') || '').split('\n').map((l) => l.replace(/^\s*\/\/.*$/, '')).join('\n');
    ok(live.length > 2000, 'the tab\'s source was found (' + live.length + ' chars)');
    eq((live.match(/_invApplyWhenDefault\(jobId, all\)/g) || []).length, 1, '⚠ the tab applies the default through the one rule');
    eq((live.match(/_invFilter\.when = 'today'/g) || []).length, 0, 'and has no inline copy that resets it on every render');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('the small items — the vendor and partner deletes ask their history question behind the PIN too');
  {
    const alerts = [], posts = [];
    let V = { vendor_name: 'Acme Hauling', _row: 7, jobs_rated: '0', perf: null };
    const D = sandbox({ fns: ['vendorDeleteBlocker', 'requestDeleteVendor', 'hardDeleteVendor'],
                        stubs: { lookupVendorById: () => V, vendorPerf: (v) => v.perf, alert: (m) => alerts.push(m),
                                 showSyncBadge: () => {}, postVendorWrite: (a, p, cb) => posts.push(a), VENDOR_SYNC_URL: 'https://example.test',
                                 _openDirDeletePin: () => {}, _dirDeleteTarget: null } });
    eq(D.vendorDeleteBlocker(V), '', 'a vendor with no history can go');
    D.requestDeleteVendor(7);
    eq(alerts.length, 0, 'the ✕ opens the PIN for it');
    // Rated while the PIN box was open: the handler behind the PIN asks again.
    V = Object.assign({}, V, { perf: 4.5 });
    D.hardDeleteVendor(7);
    eq(posts, [], '⚠⚠ a vendor rated since the ✕ is not deleted behind the PIN');
    has(alerts.join(' '), 'Do Not Use', 'and is steered to Do Not Use, in the button\'s own words');
    V = Object.assign({}, V, { perf: null, jobs_rated: '2' });
    has(D.vendorDeleteBlocker(V), 'job history', 'completed jobs count as history too');
    V = Object.assign({}, V, { jobs_rated: '0' });
    D.hardDeleteVendor(7);
    eq(posts, ['deleteVendor'], 'and one with none is deleted');

    const ra = [], rp = [];
    let P = { partner_name: 'Marie Gunster', _row: 3 }, count = 0, unread = false;
    const R = sandbox({ fns: ['referralDeleteBlocker', 'requestDeleteReferral', 'hardDeleteReferral'],
                        stubs: { lookupReferralById: () => P, referralPartnerStats: () => ({ count: count }), jobsUnread: () => unread,
                                 referralIdOf: (p) => p._row, alert: (m) => ra.push(m), showSyncBadge: () => {},
                                 postReferralWrite: (a) => rp.push(a), REFERRAL_SYNC_URL: 'https://example.test',
                                 _openDirDeletePin: () => {}, _dirDeleteTarget: null } });
    count = 2;
    R.hardDeleteReferral(3);
    eq(rp, [], '⚠⚠ a partner with referrals is not deleted behind the PIN');
    has(ra.join(' '), '2 referrals attributed', 'and says why');
    count = 0; unread = true;
    has(R.referralDeleteBlocker(P), 'has not loaded', '⚠ nor while the client list is unread, which would count none');
    R.requestDeleteReferral(3);
    ok(ra.length === 2, 'the ✕ refuses on the same grounds');
    unread = false;
    R.hardDeleteReferral(3);
    eq(rp, ['deletePartner'], 'a partner with none, the list read, is deleted');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('the small items — the Vendor Directory warning shows on a labour job, above the lines already there');
  {
    const cards = (dir, vendors, svc) => {
      const dom = domStub({});
      const c = sandbox({ fns: ['renderVendorGroupCards', 'vendorDirectoryReady', 'vendorGroupCategories', 'directoryCategories', 'vendorCats',
                                'vendorGroupOfLine', 'vendorLineHrs', 'vendorLineTCHrs', 'coordHrsFor', 'coordTouches', 'prepFeeRate', 'esc', 'fmt', 'premiumCoversLine', 'estimateAppraiserLines'],
                          vars: ['VENDOR_GROUP_CARDS', 'LOGISTICS_CATEGORIES', 'GROUP_JOB_MENU', 'PREP_FEE_RATE', 'COORD_TOUCHES',
                                 'COORD_TOUCHES_BY_GROUP', 'COORD_TOUCHES_DEFAULT', 'TOUCH_HRS'],
                          stubs: { document: dom, vendorDirectory: dir, vendors: vendors, prepItems: [], currentSvc: () => svc || 'cleanout' } });
      c.renderVendorGroupCards();
      return dom.getElementById('vendor-group-cards').innerHTML;
    };
    const unloaded = cards([], [{ type: 'Auction House', cost: 0, lid: 'a', tcHrs: 3 }]);
    has(unloaded, 'Vendor Directory not loaded', '⚠⚠ a labour job with no directory says so (the logistics card used to hide it)');
    has(unloaded, 'vgrp-grid', 'and still draws the cards, so a saved estimate\'s lines stay on screen');
    const loaded = cards([{ vendor_name: 'Christie', category_group: 'Asset Liquidation & Valuation', category: 'Auction House' }], []);
    lacks(loaded, 'Vendor Directory not loaded', 'a loaded directory says nothing');
    has(cards([], [], 'prep'), 'Vendor Directory not loaded', 'Home Prep with no directory and no lines: the warning alone, as before');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('the small items — the Rush subtitle states Q9');
  {
    has(src, 'Flat 20% premium on the Havellin services, never on the home prep fee, shown as its own line',
        'the Rush toggle\'s subtitle says the premium never touches the prep fee (Q9, 2026-09-30)');
    lacks(src, 'Flat 20% premium on the Havellin services total', 'and the old "services total" wording is gone');
  }
};
