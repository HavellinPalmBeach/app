'use strict';
// ────────────────────────────────────────────────────────────────────────────────────────────────
// ⚠⚠ P16 · AGREEMENTS AND PRICING — Anthony's answers of 2026-09-30 (round 2) and the known defects in this area.
//
//   A1  §3.9 offered card payment → "yes": ACH through the payment link, wire, or check. No card anywhere a client reads.
//   A2  the hourly deposit on a walkaway → "deposit paid, is lost": earned on signature, never refunded, on an hourly
//       engagement as on a fixed one (standard §12.4, estate §8.1), and Deposit Retained (Q2) now has its clause.
//   A3  bundled prep → "yes": a change order may add a preparation vendor on a labour job whose estimate bundles prep
//       (coPrepVendorsOn), offered, saved, read out, accepted, printed, joined to jobPrepLines, billed on the final and
//       kept out of the ±15% variance; both forms' fee clauses say "or added by Change Order" (counsel bundle B9).
//   A4  Premium Estate's 25 hours already cover appraiser coordination → "drop the line's hours on premium jobs"
//       (premiumCoversLine, read at read time by every sum of vendor-line hours).
//   B8  dashApproveInvoice asks `blocked` before `requiresApproval`.
//   B9  the ±15% baseline moves by what the final bills for a change order (coBaselineMove).
//   B14 the estate form's §5.3 counsel row names the party §5.2 names (_agrOtherAppraisalsBy).
//   B25 crew hours logged with no concierge hours: flagged on the final's row on the dashboard (finalCrewOnlyWarn).
//   The crew badge on a fixed price (Q5) and the agreement chip's "Approve the agreement…".
//
// Everything is driven: the real functions in a sandbox, the real engine through driveCalcAll.
// ────────────────────────────────────────────────────────────────────────────────────────────────

const { sandbox, source, fn, domStub, driveCalcAll } = require('./harness');

const ENT = { '&amp;': '&', '&nbsp;': ' ', '&mdash;': '—', '&ndash;': '–', '&rsquo;': '’', '&#39;': "'", '&quot;': '"',
              '&lt;': '<', '&gt;': '>', '&minus;': '−', '&sect;': '§', '&plusmn;': '±', '&hellip;': '…', '&middot;': '·', '&ldquo;': '“', '&rdquo;': '”' };
const text = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, (m) => (ENT[m] !== undefined ? ENT[m] : m))
  .replace(/\s+/g, ' ').trim();
const noComments = (t) => String(t).split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
function attempt(f) { try { return { ok: true, val: f() }; } catch (e) { return { ok: false, err: String(e && e.message || e) }; } }

// ── Fixtures ────────────────────────────────────────────────────────────────────────────────────
// A living-client labour job whose estimate bundles prep: 80 TC @150 + 60 PS @100, a $1,940 package, a $10,000
// painter at 30%. havellinTotal is the sum calcAll would give: 12,000 + 6,000 + 1,940 + 3,000.
const EST_BP = { jobId: 1, svc: 'downsizing_move', totTC: 80, totPS: 60, tcFee: 12000, psFee: 6000, pkgCost: 1940,
                 pkgLabel: 'Standard — $1,940', smf: 0, prepEnabled: true, prepCost: 10000, prepFee: 3000,
                 prepItems: [{ type: 'Painting', cost: 10000, note: '', lid: 'bp1' }],
                 havellinTotal: 22940, tcRate: 150, psRate: 100, discountPct: 0, discountAmt: 0, prem: false,
                 fixedPrice: false, rush: false, rushExPrepFee: true, vendors: [], collections: [], rooms: [], vehicles: [],
                 preparedBy: 'Anthony Graziano' };
// The same job on a fixed price saved from 2026-09-30: the prep fee on top of the flat fee, premium and discount as lines.
const EST_BPF = Object.assign({}, EST_BP, { fixedPrice: true, fixedAmount: 24000, prepFeeOnTop: true, fixedLines: true,
                                            havellinTotal: 27000 });
// An older fixed fee (before 2026-09-23) that carries the prep fee INSIDE it.
const EST_BPI = Object.assign({}, EST_BP, { fixedPrice: true, fixedAmount: 27000, havellinTotal: 27000 });
// A plain labour estimate with no prep at all.
const EST_LAB = Object.assign({}, EST_BP, { prepEnabled: false, prepItems: [], prepCost: 0, prepFee: 0, havellinTotal: 19940 });
// A standalone Home Prep estimate.
const EST_PREP = Object.assign({}, EST_BP, { svc: 'prep', totTC: 0, totPS: 0, tcFee: 0, psFee: 0, pkgCost: 0,
                                             havellinTotal: 3000, declutterTCHrs: 0 });
const BP_JOB = { id: 1, hvlId: 'HVL-0016', name: 'Harper', svc: 'downsizing_move', addr: '12 Ocean Blvd', city: 'Palm Beach',
                 tc: 'Anthony Graziano', status: 'active', premium: false, email: 'harper@example.com', phone: '561-555-0100' };

const DIR = [{ vendor_name: 'Brush & Co', category_group: 'Property Preparation', category: 'Painting', status: 'Active' },
             { vendor_name: 'Green Thumb', category_group: 'Property Preparation', category: 'Landscaper', status: 'Active' },
             { vendor_name: 'Hauler', category_group: 'Disposal & Waste Management', category: 'Junk Removal / Hauling', status: 'Active' }];

function co(extra) {
  return Object.assign({ id: 100, jobId: 1, description: 'Paint the guest house', reason: 'scope_add',
                         tcHrs: 0, psHrs: 0, createdAt: 'Sep 30, 2026', clientApproved: false,
                         clientName: '', clientAcceptedAt: '' }, extra || {});
}
function accepted(extra) {
  return co(Object.assign({ clientApproved: true, clientName: 'Helen Harper', clientAcceptedAt: 'September 30, 2026' }, extra || {}));
}
const LANDSCAPER = { type: 'Landscaper', cost: 9000, lid: 'co-land' };

// The change-order modal, save, readout, acceptance and print — P15's list, with the P16 rule and its reader.
const CO_FNS = ['_coJobBasis', 'coPrepVendorsOn', '_agrHasPrepVendors', 'estPrepFeeOnTop', 'coHours', 'coHoursTotal', 'coBaselineShift', 'coHoursLabel',
                '_coMoney', 'fmt', 'esc', 'coPrice', 'coPriceTotal', 'coFixedTerms', 'coRateBasisTxt', 'coReasonLabel', 'estFixedFee',
                'estTolerancePctTxt', 'coBasisNoteHtml', 'updateCOHours', 'openChangeOrder', 'openCOAcceptModal', 'closeCOAcceptModal',
                'acceptChangeOrder', 'printChangeOrder', 'saveChangeOrder', '_coPriorAccepted', 'coPriorHours', 'coNoHoursBaseTxt',
                'coPrepReadoutHtml', 'prepFeeRate', 'agrBillingRates', 'coRateModsLine', 'coRushPct', 'coRushPctFor', 'estFixedLines',
                'coScopeLabel', 'coVendorAdds', 'coVendorAddsTxt', 'coDraftVendorAdd', 'coPrepVendorReadout', 'moneyToNumber', '_srcLid',
                'vendorGroupCategories', 'directoryCategories', 'vendorCats', 'coBaselineMove', 'discountOnLabor'];
function coCtx(est, job, cos, seed) {
  const dom = domStub(seed || {});
  const said = [];
  const theJob = Object.assign({}, job || BP_JOB);
  const c = sandbox({
    fns: CO_FNS, vars: ['EST_TOLERANCE_PCT', 'CO_REASONS', 'PREP_FEE_RATE', 'RUSH_PCT', 'LOGISTICS_CATEGORIES', 'GROUP_JOB_MENU', '_srcLidSeq'],
    stubs: {
      document: dom, setTimeout: () => 0, vendorDirectory: DIR,
      jobs: [theJob], changeOrders: cos || [],
      estimateStore: est ? { 1: { estimate: Object.assign({}, est), approved: true } } : {},
      currentEstimate: null,
      saveChangeOrders: () => {},
      // Accepting files the accepted copy to Drive (P17); that filing is driven in p17-documents-drive.test.js.
      fileChangeOrder: () => {}, saveJobs: () => {}, syncJobToSheets: () => {}, renderJobs: () => {},
      showFB: (id, kind, msg) => said.push({ id, kind, msg }),
      _docNotice: (kind, msg, jobId) => said.push({ id: 'doc', kind, msg, jobId }),
      docNames: () => ({ printTitle: 'Havellin Change Order' }),
    },
  });
  c.__dom = dom; c.__said = said; c.__job = theJob;
  return c;
}
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

// The invoice sandbox (P15's list, with the P16 rules).
const INV_FNS = ['estTolerancePctTxt', 'finalAwaitsHours', 'paymentStageWord', 'invoiceHtml', 'docSentAt', 'paymentSplit',
  'rushScopeLine', 'rushCrewAdded', 'jobLogEntries', 'invFinalApproval', 'invFinalApprovalRecord', 'docKeyFor',
  'coHours', 'coHoursTotal', 'coBaselineShift', 'coPrice', 'coPriceTotal', 'coHoursLabel',
  '_coMoney', 'fmt', 'getVendorActuals', '_srcLineKey', 'samePerson', 'canonPersonName',
  '_invVendorFeeSentence', 'prepFeeRate', 'vendorGroupOfLine', 'resolveJobVendor',
  'coordHrsFor', 'prepLineTCHrs', 'vendorLineTCHrs', 'esc', 'fmtDate2', 'svcLabelOf',
  'conciergePhones', 'conciergePhonesText', 'assignedTCContact', 'vendorCats',
  'vendorPrimaryCat', 'estimateIsFeeOnly', 'isDecedentJob',
  'stagePaidTotal', 'jobPaidTotal', 'jobPayments', 'discountOnLabor', 'estFixedFee', 'estPrepFeeOnTop',
  'estFixedLines', 'discountOnFixedFee', 'fixedDiscountBasisWords', 'rushBaseWords', 'coRushPct',
  'coVendorAdds', 'coVendorAddsTxt', 'jobPrepLines', 'coPrepVendorLines', 'jobIsFeeOnly', 'coAcceptedHours', 'estDeclutterHrs',
  'coBaselineMove', 'finalCrewOnlyWarn', 'agrBillingRates', 'paymentCounts', 'escLines'];
const INV_VARS = ['DOC_STAGE_WORD', 'EST_TOLERANCE_PCT', 'SMF_PCT', 'RUSH_PCT', 'SVC_LABELS', 'DEPT_EMAILS', 'HAVELLIN_OFFICE_PHONE',
  'NON_MOBILE_NUMBERS', 'DEFAULT_CONTRACTORS', 'COORD_TOUCHES', 'COORD_TOUCHES_BY_GROUP', 'COORD_TOUCHES_DEFAULT',
  'TOUCH_HRS', 'DECEDENT_SERVICES', 'PERSON_NAME_ALIASES', 'PREP_FEE_RATE', 'INV_FINAL_NO_HOURS_WHY'];
function inv(stubs, extraFns) {
  return sandbox({ fns: INV_FNS.concat(extraFns || []), vars: INV_VARS,
    stubs: Object.assign({ jobLogs: {}, estimateStore: {}, changeOrders: [], contractors: [],
                           currentEstimate: null, currentInvStage: 'final', vendorDirectory: [], jobPlans: {} }, stubs || {}) });
}
const logOf = (tc, ps) => ({ 1: [{ date: '2026-09-01', activity: 'work', members: [{ name: 'Anthony Graziano', role: 'TC', hours: tc },
                                                                                 { name: 'Crew', role: 'PS', hours: ps }] }] });
// Walk the engagement stage by stage, paying each invoice in full, and return the final (P15's finalDoc).
function finalDoc(est, job, cos, logged) {
  const store = { 1: { estimate: est, approved: true, approvedBy: 'Anthony Graziano' } };
  const logs = logged ? logOf(logged.tc, logged.ps) : {};
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

// Both agreement forms (P15's lists).
const TIER_FNS = ['weArrangeAppraisals', 'docTierProduces', 'docTierOf', 'docTierDef', 'docTierScope', 'svcHasDocStep',
                  'appraisalDuty', 'estimateAppraiserLines', 'estimateAppraiserNames'];
const TIER_VARS = ['DOC_TIERS', 'DOC_TIER_FROM_SCOPE', 'JOB_STEPS'];
const AGR_FNS = ['_agrComplianceHeading', '_agrComplianceLead', '_agrApprover', '_agrTrustDeliverable', 'matterDef',
                 'matterTypeOf', 'invFiduciaryMode', 'marketingOptOutBlock', 'marketingUseParas', '_mktClause',
                 'estTolerancePctTxt', 'agreementHtml', 'agrPriceAdjustments', '_pctWords', 'probateAgreementHtml',
                 '_agrApprovedStamp', 'agrBillingRates', 'materialsBasisNote', 'materialsPackageQuoted',
                 'fmt', 'esc', 'paymentSplit', 'isDecedentJob', 'agrSection', '_agrHasPrepVendors', 'estimateDocScope',
                 'docScopeDef', '_agrScopeServices', '_agrMidpointTrigger', '_agrProbateCompliance', 'esignAnchor',
                 'estFixedFee', 'estPrepFeeOnTop', 'estFixedLines', 'fixedDiscountBasisWords', 'coRushPctFor', '_agrOtherAppraisalsBy',
                 'prepFeeRate', 'estimateIsFeeOnly', 'estDeclutterHrs', 'coPrepVendorsOn'].concat(TIER_FNS);
const AGR_VARS = ['AGR_NOT_AN_ACCOUNTING', '_PCT_WORDS', 'MATTER_TYPES', 'EST_TOLERANCE_PCT', 'SMF_PCT', 'DECEDENT_SERVICES',
                  'HAVELLIN_OFFICE_PHONE', 'DOC_SCOPES', 'ESIGN_ANCHORS', 'RUSH_PCT', 'PREP_FEE_RATE'].concat(TIER_VARS);
const agrCtx = () => sandbox({ fns: AGR_FNS, vars: AGR_VARS, stubs: { estimateStore: {}, currentEstimate: null } });
const EST_ESTATE = { svc: 'probate', jobId: 1, docScope: 'full', tcFee: 18500, psFee: 12500, pkgCost: 1500,
                     pkgLabel: 'Estate Premium — $1,500', smf: 0, prepFee: 0, havellinTotal: 32500, totTC: 100, totPS: 100,
                     tcRate: 185, psRate: 125, discountPct: 0, fixedPrice: false, rush: false,
                     vendors: [], prepItems: [], rooms: [], collections: [], vehicles: [] };
const ESTATE_JOB = (over) => Object.assign({ id: 1, hvlId: 'HVL-0007', name: 'Margaret Doe', svc: 'probate', matterType: 'probate',
  executor: 'Tripp Butler', addr: '69 Beach Blvd', city: 'Palm Beach', zip: '33480', deathDate: '2026-01-15', docTier: 'values' }, over || {});
const LIVING_JOB = (over) => Object.assign({}, BP_JOB, over || {});

const BASE = ['Living Room', 'Kitchen', 'Dining Room', 'Family Room / Great Room', 'Primary Suite', 'Bedroom 2', 'Bedroom 3'];
const ART = { type: 'Art Appraiser', cost: 1500, lid: 'va', tcHrs: 2 };

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('⚠⚠ A1 — §3.9 names ACH through the payment link, wire and check; no card, on any form');
  {
    const c = agrCtx();
    const docs = {
      hourly: text(c.agreementHtml(LIVING_JOB(), EST_LAB)),
      fixed: text(c.agreementHtml(LIVING_JOB(), Object.assign({}, EST_LAB, { fixedPrice: true, fixedAmount: 24000, fixedLines: true, havellinTotal: 24000 }))),
      prep: text(c.agreementHtml(LIVING_JOB({ svc: 'prep' }), EST_PREP)),
    };
    Object.keys(docs).forEach((k) => {
      has(docs[k], '3.9 Payment Method. Payment may be made by ACH bank transfer through Contractor\'s secure payment link, by wire transfer, or by check payable to Havellin Palm Beach LLC.',
          k + ': §3.9 names the three routes Anthony approved');
      lacks(docs[k], 'credit/debit', k + ': ⚠ and no longer offers a credit or debit card');
      ok(!/\bcards?\b/i.test(docs[k]), k + ': the word "card" appears nowhere on the living-client agreement');
    });
    const est = text(c.probateAgreementHtml(ESTATE_JOB(), EST_ESTATE));
    ok(!/\bcards?\b/i.test(est), 'the estate form names no card either (it has no payment-method clause at all)');
    lacks(src, "credit/debit card via Contractor", 'the old clause is gone from the source');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('⚠⚠ A1 — no card on any other client document: the estimate, the three invoices, the change orders');
  {
    // The invoices, at each stage, hourly and fixed.
    const store = (e) => ({ 1: { estimate: e, approved: true, approvedBy: 'Anthony Graziano' } });
    [['hourly', EST_LAB], ['fixed', EST_BPF]].forEach(([k, e]) => {
      ['deposit', 'midpoint', 'final'].forEach((st) => {
        const I = inv({ estimateStore: store(e), jobLogs: logOf(80, 60) });
        const d = I.invoiceHtml(Object.assign({}, BP_JOB, { payments: [] }), st);
        ok(d && !/\bcards?\b/i.test(text(d.html)), k + ' ' + st + ' invoice: no card');
      });
    });
    // The printed change order on each basis.
    [EST_LAB, EST_BPF, EST_PREP].forEach((e, i) => {
      const P = coCtx(e, e.svc === 'prep' ? LIVING_JOB({ svc: 'prep' }) : BP_JOB, [co({ tcHrs: 4, vendorAdds: i ? [LANDSCAPER] : undefined })]);
      P.printChangeOrder(100);
      ok(!/\bcards?\b/i.test(text(P.__printed)), ['hourly', 'fixed', 'prep'][i] + ' change order: no card');
    });
    // The client estimate's Terms name no payment route at all; the estimate builder carries no card.
    ok(!/credit|debit/i.test(noComments(fn('clientEstimateHtml'))), 'the client estimate builder carries no credit or debit wording');
    ok(!/credit\/debit|debit card|credit card/i.test(noComments(fn('signingPacketHtml'))), 'nor the signing packet builder');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('⚠⚠ A2 — the hourly deposit is earned on signature and not refunded: standard §12.4');
  {
    const c = agrCtx();
    const hourly = text(c.agreementHtml(LIVING_JOB(), EST_LAB));
    const prep = text(c.agreementHtml(LIVING_JOB({ svc: 'prep' }), EST_PREP));
    const fixed = text(c.agreementHtml(LIVING_JOB(), Object.assign({}, EST_LAB, { fixedPrice: true, fixedAmount: 24000, fixedLines: true, havellinTotal: 24000 })));
    const NEW = '12.4 Effect of Termination. Upon termination, Contractor will cease work, remove its personnel and equipment, and provide a final invoice for the Services performed and costs incurred through the termination date under Section 12.2. The deposit is applied against that amount. The deposit is earned on signature and is not refundable , including where it exceeds that amount, except where Client terminates under Section 12.3 for a material breach by Contractor that Contractor has failed to cure, in which case Contractor will refund any amount it holds above the amount owed.';
    has(hourly, NEW, '⚠⚠ the hourly §12.4 keeps the deposit, with the one exit the fixed arm has');
    has(prep, NEW, 'a Home Prep engagement signs the same clause (it is hourly or fee-only, never fixed)');
    lacks(hourly, 'refund the unused balance', 'and no longer refunds "the unused balance"');
    lacks(hourly, 'Any deposit will be applied to amounts due', 'the old sentence is gone');
    has(hourly, 'Client shall pay Contractor for all Services performed and costs incurred through the termination date',
        '§12.2 keeps the hourly measure of what is owed');
    // The fixed arm is untouched.
    has(fixed, 'provide a final invoice stating the portion of the fixed project fee earned under Section 12.2. The deposit is applied against that amount. The deposit is earned on signature and is not refundable , except where Client terminates under Section 12.3',
        'the fixed §12.4 reads as it did');
    eq((hourly.match(/\brefund\b/g) || []).length, 1, 'the one refund left on the hourly form is the breach exception');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('⚠⚠ A2 — the estate form\'s hourly §8.1: earned on signature, not "after project start"');
  {
    const c = agrCtx();
    const tm = text(c.probateAgreementHtml(ESTATE_JOB(), EST_ESTATE));
    const fx = text(c.probateAgreementHtml(ESTATE_JOB(), Object.assign({}, EST_ESTATE, { fixedPrice: true, fixedAmount: 40000, havellinTotal: 40000 })));
    lacks(tm, 'after project start', '⚠⚠ the undefined "after project start" is gone');
    has(tm, 'The deposit is earned in full on signature of this Agreement and is not refundable. It is applied against the hours worked and materials used, and no part of it is returned where it exceeds them',
        'the deposit is earned at signature and applied against the hours, never returned above them');
    has(tm, 'Where Havellin is in material breach of this Agreement and has not cured that breach within seven (7) days of the Client\'s written notice describing it, Havellin will refund any amount it holds above the hours worked and materials used through the date of that notice',
        'the one exit, stated inline as the fixed arm states it');
    has(tm, 'The Client is responsible for all hours worked and materials used through the termination date', 'the hours measure stays');
    has(tm, 'A final invoice reflecting actual hours and materials will be issued within 10 business days of termination', 'and the final invoice bullet');
    // The fixed arm, as it was.
    has(fx, 'The deposit is earned in full on signature of this Agreement and is not refundable. Seventy-five percent (75%) of the fixed fee',
        'the fixed arm is unchanged');
    // Both forms, the estimate and every invoice: nothing promises the deposit back.
    const store = { 1: { estimate: EST_LAB, approved: true } };
    ['deposit', 'midpoint', 'final'].forEach((st) => {
      const d = inv({ estimateStore: store, jobLogs: logOf(80, 60) }).invoiceHtml(Object.assign({}, BP_JOB, { payments: [] }), st);
      ok(d && !/refund/i.test(text(d.html)), st + ' invoice: no refund is promised');
    });
    ok(!/refund/i.test(noComments(fn('clientEstimateHtml'))), 'the client estimate promises no refund');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('⚠ A2 — Deposit Retained (Q2) and the contract now agree on a paid hourly walkaway');
  {
    const said = [];
    const job = Object.assign({}, BP_JOB, { status: 'active', won: true, havellinEst: 22940,
                                            payments: [{ uid: 'd', stage: 'deposit', amount: 11470, date: '2026-09-01', method: 'wire' }] });
    const dom = domStub({ 'closeout-reason': 'client_changed_mind', 'closeout-note': '' });
    const c = sandbox({ fns: ['confirmMarkLost', 'closeoutRetainedTotal', 'jobPaidTotal', 'jobPayments', 'closeCloseoutModal', 'paymentCounts'],
                        vars: ['LOSS_REASONS'],
                        stubs: { document: dom, jobs: [job], closeoutJobId: 1, saveJobs: () => said.push('save'),
                                 syncJobToSheets: () => {}, renderJobs: () => {} } });
    c.confirmMarkLost();
    eq(job.status, 'closed_retained', 'an hourly job abandoned after its deposit closes as Deposit Retained');
    eq(c.closeoutRetainedTotal(job), 11470, 'keeping the $11,470 received — which the hourly §12.4 now says is earned');
    ok(job.won !== false, 'and stays a won job');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('⚠⚠ A3 — where a change order may add a preparation vendor: one rule (coPrepVendorsOn)');
  {
    const R = sandbox({ fns: ['coPrepVendorsOn', '_agrHasPrepVendors', 'estPrepFeeOnTop'] });
    eq(R.coPrepVendorsOn(EST_PREP, null), true, 'standalone Home Prep, as P15 built it');
    eq(R.coPrepVendorsOn(null, { svc: 'prep' }), true, 'even before its estimate is saved');
    eq(R.coPrepVendorsOn(EST_BP, BP_JOB), true, '⚠⚠ a labour job whose estimate bundles prep, hourly');
    eq(R.coPrepVendorsOn(EST_BPF, BP_JOB), true, 'and on a fixed price whose prep fee sits on top of the flat fee');
    eq(R.coPrepVendorsOn(EST_BPI, BP_JOB), false, 'not on an older fee that carries the prep fee inside it: nothing would bill the added vendor\'s fee');
    eq(R.coPrepVendorsOn(EST_LAB, BP_JOB), false, 'not on a labour job with no prep');
    eq(R.coPrepVendorsOn(null, BP_JOB), false, 'nor on a labour job with no estimate');
    const b = coCtx(EST_BP)._coJobBasis(1);
    ok(b.prepVendors === true && b.prep === false, 'the basis carries it beside `prep`, which stays standalone Home Prep only');
    // ⚠ A prep line typed with no cost switches prep on (calcAll derives prepEnabled from the lines), but the agreement then
    // prints the plain §3.5 and no fee clause: a vendor added there would carry a 30% fee the signed contract disclaims.
    // The rule asks the agreement's own test (_agrHasPrepVendors), so the offer exists exactly where the clause does.
    const NOCOST = Object.assign({}, EST_BP, { prepItems: [{ type: 'Painting', cost: 0, note: '', lid: 'bp1' }], prepCost: 0, prepFee: 0,
                                               havellinTotal: 19940 });
    eq(R.coPrepVendorsOn(NOCOST, BP_JOB), false, '⚠⚠ not on a labour estimate whose only prep line has no cost');
    const noCostAgr = text(agrCtx().agreementHtml(LIVING_JOB(), NOCOST));
    has(noCostAgr, '3.5 Vendor Coordination. Contractor adds no fee or markup to third-party vendor invoices.', 'fixture: that agreement disclaims any fee on vendors …');
    lacks(noCostAgr, 'added by Change Order', '… and names no vendor added by change order');
    ok(coCtx(NOCOST)._coJobBasis(1).prepVendors === false, 'and the basis every surface reads says no');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('⚠⚠ A3 — the modal offers the vendor on a bundled-prep labour job, and nowhere it may not');
  {
    const m = coCtx(EST_BP, BP_JOB, [], { 'co-jobid': '1' });
    m.openChangeOrder(1);
    eq(m.__dom.getElementById('co-vendor-wrap').style.display, 'grid', '⚠⚠ the added-vendor block shows on a bundled-prep labour job');
    const opts = m.__dom.getElementById('co-vendor-type').innerHTML;
    has(opts, '>Painting<', 'with the directory\'s preparation categories');
    lacks(opts, 'Junk Removal', 'and no others');
    eq(m.__dom.getElementById('co-ps-hrs').disabled, false, 'the specialist box stays open: it is a labour job');
    const note = text(m.__dom.getElementById('co-basis-note').innerHTML);
    has(note, 'A change order carries no price and bills nothing on its own', 'the hourly note keeps its rule');
    has(note, 'A change order can also add a preparation vendor found mid-job, with or without hours: it bills the client directly at cost, and the 30% site management fee applies to what it actually charges. It books no concierge hours.',
        'and says a vendor can be added, and on what terms');
    const f = coCtx(EST_BPF, BP_JOB, [], { 'co-jobid': '1' });
    f.openChangeOrder(1);
    eq(f.__dom.getElementById('co-vendor-wrap').style.display, 'grid', 'on the fixed price with the fee on top too');
    has(text(f.__dom.getElementById('co-basis-note').innerHTML), 'applies to what it actually charges, on top of the fixed project fee.', 'where the fee sits on top of the flat fee');
    [[EST_LAB, 'a labour job with no prep'], [EST_BPI, 'an older fixed fee with the prep fee inside']].forEach(([e, why]) => {
      const x = coCtx(e, BP_JOB, [], { 'co-jobid': '1', 'co-vendor-wrap': { style: { display: 'grid' } } });
      x.openChangeOrder(1);
      eq(x.__dom.getElementById('co-vendor-wrap').style.display, 'none', 'hidden again on ' + why + ' (one modal serves every job)');
      lacks(text(x.__dom.getElementById('co-basis-note').innerHTML), 'add a preparation vendor', 'and the note does not offer it there');
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('⚠⚠ A3 — the save records the vendor on a bundled-prep labour job, with or without hours');
  {
    const c = coCtx(EST_BP);
    const made = createCO(c, { vendor: 'Landscaper', cost: '$9,000' });
    eq(made && made.vendorAdds && made.vendorAdds.map((v) => [v.type, v.cost]), [['Landscaper', 9000]], '⚠⚠ a vendor alone is a change order on a labour job now');
    ok(!!(made && made.vendorAdds && made.vendorAdds[0].lid), 'with its own line id for the sourcing record');
    eq([made && made.tcHrs, made && made.psHrs], [0, 0], 'and no hours');
    has(c.__said.map((x) => x.msg).join(' | '), 'created (adds Landscaper (est. $9,000)) — waiting on the client', 'the created notice names it');
    const both = createCO(coCtx(EST_BP), { tc: 4, ps: 8, vendor: 'Painting', cost: '4500' });
    eq(both && [both.tcHrs, both.psHrs, both.vendorAdds && both.vendorAdds[0].type], [4, 8, 'Painting'], 'hours and a vendor together');
    const fx = createCO(coCtx(EST_BPF), { tc: 4, vendor: 'Painting', cost: '4500' });
    ok(fx && fx.vendorAdds && fx.vendorAdds.length === 1, 'and on the fixed price with the fee on top');
    // The refusals.
    const e1 = coCtx(EST_BP);
    eq(createCO(e1, { vendor: 'Painting' }), undefined, 'a vendor with no cost: refused');
    has(text(e1.__dom.getElementById('co-fb').innerHTML), 'estimated cost, so the client sees the fee it carries', 'naming why');
    const e2 = coCtx(EST_BP);
    eq(createCO(e2, {}), undefined, 'nothing entered: refused');
    has(text(e2.__dom.getElementById('co-fb').innerHTML), 'concierge, specialist or both, or the preparation vendor it adds', 'and the refusal names the vendor too');
    const e3 = coCtx(EST_LAB);
    eq(createCO(e3, {}), undefined, 'on a plain labour job too');
    lacks(text(e3.__dom.getElementById('co-fb').innerHTML), 'preparation vendor', 'where it does not offer a vendor');
    // A vendor left in the hidden block never rides onto a job that may not add one.
    [EST_LAB, EST_BPI].forEach((e) => {
      const x = createCO(coCtx(e), { tc: 4, vendor: 'Painting', cost: '4500' });
      ok(x && !x.vendorAdds, '⚠ the hidden block is not read on ' + (e === EST_LAB ? 'a plain labour job' : 'an older inside-fee fixed job'));
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('⚠ A3 — the readout says what the vendor brings, under the hours readout where there are hours');
  {
    const only = coCtx(EST_BP, BP_JOB, [], { 'co-jobid': '1', 'co-vendor-type': 'Landscaper', 'co-vendor-cost': '$9,000' });
    only.updateCOHours();
    const t1 = text(only.__dom.getElementById('co-hrs-note').innerHTML);
    has(t1, 'Adds Landscaper to the preparation vendors. It bills the client directly at cost, and the 30% site management fee applies to what it actually charges — about $2,700 at the estimated $9,000.',
        'a vendor alone reads out, with its fee at the estimate');
    lacks(t1, 'hrs on the estimate', 'and no hours readout');
    const both = coCtx(EST_BP, BP_JOB, [], { 'co-jobid': '1', 'co-tc-hrs': '4', 'co-ps-hrs': '8', 'co-vendor-type': 'Painting', 'co-vendor-cost': '4500' });
    both.updateCOHours();
    const t2 = text(both.__dom.getElementById('co-hrs-note').innerHTML);
    has(t2, '+4.0 concierge / +8.0 specialist hrs — 140.0 hrs on the estimate becomes 152.0', 'hours: the ±15% readout as before');
    has(t2, 'Adds Painting to the preparation vendors', 'and the vendor under it');
    const fx = coCtx(EST_BPF, BP_JOB, [], { 'co-jobid': '1', 'co-tc-hrs': '4', 'co-vendor-type': 'Painting', 'co-vendor-cost': '4500' });
    fx.updateCOHours();
    const t3 = text(fx.__dom.getElementById('co-hrs-note').innerHTML);
    has(t3, '+ $600 on the fixed project fee', 'fixed: the price of the hours');
    has(t3, 'Adds Painting to the preparation vendors', 'and the vendor under it');
    const lab = coCtx(EST_LAB, BP_JOB, [], { 'co-jobid': '1', 'co-tc-hrs': '4', 'co-vendor-type': 'Painting', 'co-vendor-cost': '4500' });
    lab.updateCOHours();
    lacks(text(lab.__dom.getElementById('co-hrs-note').innerHTML), 'Painting', 'a plain labour job reads out no vendor');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('⚠⚠ A3 — the client accepts the vendor by name, on either basis');
  {
    const a = coCtx(EST_BP, BP_JOB, [co({ vendorAdds: [LANDSCAPER] })], { 'coa-co-id': '100' });
    a.openCOAcceptModal(100);
    const s = text(a.__dom.getElementById('coa-summary').innerHTML);
    has(s, 'Added vendor Landscaper, est. $9,000, billed to you directly', 'the panel names the vendor');
    has(s, '30% site management fee on it about $2,700, on its actual invoice', 'and the fee on it');
    lacks(s, 'No charge is created by this change order', '⚠ never "no charge", which a vendor\'s fee would make false');
    has(text(a.__dom.getElementById('coa-terms').innerHTML),
        'By typing their name and pressing Accept, the client confirms they have reviewed and agreed to this change in scope, and the addition of Landscaper to the preparation vendors, billed to them directly at cost, with the 30% site management fee on what it actually charges.',
        'and the client agrees to it in words');
    const h = coCtx(EST_BP, BP_JOB, [co({ tcHrs: 4, psHrs: 8, vendorAdds: [LANDSCAPER] })], { 'coa-co-id': '100' });
    h.openCOAcceptModal(100);
    has(text(h.__dom.getElementById('coa-terms').innerHTML), 'agreed to this change in scope and the additional hours it is expected to take, and the addition of Landscaper to the preparation vendors',
        'with hours: both, in one sentence');
    has(text(h.__dom.getElementById('coa-terms').innerHTML), 'Those hours are billed on the final invoice as they are actually worked.', 'and the hours sentence');
    const plain = coCtx(EST_BP, BP_JOB, [co({ tcHrs: 4, psHrs: 8 })], { 'coa-co-id': '100' });
    plain.openCOAcceptModal(100);
    has(text(plain.__dom.getElementById('coa-summary').innerHTML), 'No charge is created by this change order. These hours are billed on the final invoice as they are actually worked.',
        'an hours-only change order reads exactly as before');
    eq(text(plain.__dom.getElementById('coa-terms').innerHTML),
       'By typing their name and pressing Accept, the client confirms they have reviewed and agreed to this change in scope and the additional hours it is expected to take. Those hours are billed on the final invoice as they are actually worked.',
       'and its terms are unchanged, word for word');
    const f = coCtx(EST_BPF, BP_JOB, [co({ vendorAdds: [LANDSCAPER] })], { 'coa-co-id': '100' });
    f.openCOAcceptModal(100);
    const fs = text(f.__dom.getElementById('coa-summary').innerHTML);
    lacks(fs, 'Change to the fixed project fee', '⚠ a vendor alone on a fixed price moves no fixed fee, and shows none');
    has(fs, 'It is not part of the fixed project fee.', 'and says its fee is on top');
    has(text(f.__dom.getElementById('coa-terms').innerHTML), 'agreed to this change in scope, and the addition of Landscaper', 'fixed terms name the vendor');
    const fh = coCtx(EST_BPF, BP_JOB, [co({ tcHrs: 4, vendorAdds: [LANDSCAPER] })], { 'coa-co-id': '100' });
    fh.openCOAcceptModal(100);
    has(text(fh.__dom.getElementById('coa-summary').innerHTML), 'Change to the fixed project fee + $600', 'with hours: the price rows as before');
    // Accepting it: the notice names where the vendor went.
    a.__dom.getElementById('coa-client-name').value = 'Helen Harper';
    a.acceptChangeOrder();
    const said = a.__said.map((x) => x.msg).join(' | ');
    has(said, 'Landscaper now sits with the prep vendors on the Job Plan, to be booked and quoted.', 'Accept says where it went');
    lacks(said, 'These hours bill on the final invoice', 'and says nothing about hours it does not carry');
    // … and on a fixed price a vendor alone moves no fee, so the notice names no fee change (it would read
    // "+ $0 on the fixed project fee, which is now $24,000"); one with hours still states its price.
    f.__dom.getElementById('coa-client-name').value = 'Helen Harper';
    f.acceptChangeOrder();
    const saidF = f.__said.map((x) => x.msg).join(' | ');
    has(saidF, 'Landscaper now sits with the prep vendors on the Job Plan, to be booked and quoted.', 'on a fixed price, Accept says where the vendor went');
    lacks(saidF, 'on the fixed project fee', '⚠ and names no change to a fee it did not change');
    fh.__dom.getElementById('coa-client-name').value = 'Helen Harper';
    fh.acceptChangeOrder();
    has(fh.__said.map((x) => x.msg).join(' | '), '+ $600 on the fixed project fee, which is now $24,600', 'with hours, the fee change as before');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('⚠⚠ A3 — the printed change order on a bundled-prep labour job');
  {
    const P = (e, c0) => { const x = coCtx(e, BP_JOB, [c0]); x.printChangeOrder(100); return text(x.__printed); };
    const v = P(EST_BP, co({ vendorAdds: [LANDSCAPER] }));
    has(v, 'This change order adds Landscaper to the preparation vendors.', '⚠⚠ the page says what it adds');
    has(v, 'Added preparation vendor: Landscaper billed to you directly by the vendor, at cost $9,000 estimated', 'the table names the vendor and its estimate');
    has(v, 'Site management fee (30%) on its actual invoice about $2,700', 'and the fee on it');
    has(v, 'The vendor bills you directly, at cost, and the 30% site management fee in your agreement is billed on what it actually charges — about $2,700 at the estimated $9,000.',
        'the terms, in the Home Prep page\'s words');
    has(v, 'That fee covers coordinating and supervising the preparation work, which is not billed as hours.', 'as §3.5 says it');
    lacks(v, 'Third-party vendor costs are unaffected', '⚠ not the line this change makes false');
    lacks(v, 'does not itself create a charge', 'nor "no charge"');
    lacks(v, 'Hours on the approved estimate', 'a vendor alone prints no hours rows');
    const h = P(EST_BP, co({ tcHrs: 4, psHrs: 8, vendorAdds: [LANDSCAPER] }));
    has(h, 'Hours on the approved estimate 140.0 hrs', 'hours as well: the hours chain');
    has(h, 'Revised estimated hours 152.0 hrs', 'to the revised figure');
    has(h, 'This change order adds the hours above, and adds Landscaper to the preparation vendors.', 'and one headline for both');
    const f = P(EST_BPF, co({ tcHrs: 4, vendorAdds: [LANDSCAPER] }));
    has(f, 'Fixed project fee in your agreement $24,000', 'fixed: the fee chain');
    has(f, 'Revised fixed project fee $24,600', 'to the revised fee');
    has(f, 'That fee is charged in addition to your fixed project fee', 'with the vendor\'s fee on top of it');
    // The hours line (Q14) is about hours: a change order that adds only a vendor carries none, even on a rush job with a discount.
    const RD = Object.assign({}, EST_BP, { rush: true, rushPct: 0.2, discountPct: 10 });
    lacks(P(RD, co({ vendorAdds: [LANDSCAPER] })), 'these hours carry', '⚠ a vendor-only change order prints no "these hours carry" line');
    has(P(RD, co({ tcHrs: 4, vendorAdds: [LANDSCAPER] })), 'these hours carry the 20% expedited-delivery premium and the 10% preferred-client discount',
        'one that adds hours as well keeps it');
    // Unchanged where no vendor is added.
    const plain = P(EST_BP, co({ tcHrs: 4, psHrs: 8 }));
    has(plain, 'This change order does not itself create a charge.', 'an hours-only change order prints exactly as before');
    has(plain, 'Third-party vendor costs are unaffected', 'with its vendor line');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('⚠⚠ A3 — once accepted the vendor joins the job\'s prep lines and is billed on the final, outside the variance');
  {
    const L = (cos) => sandbox({ fns: ['jobPrepLines', 'coPrepVendorLines', 'coVendorAdds'], stubs: { changeOrders: cos } });
    eq(L([co({ vendorAdds: [LANDSCAPER] })]).jobPrepLines(BP_JOB, EST_BP).map((x) => x.type), ['Painting'], 'an unaccepted change order adds nothing');
    eq(L([accepted({ vendorAdds: [LANDSCAPER] })]).jobPrepLines(BP_JOB, EST_BP).map((x) => x.type), ['Painting', 'Landscaper'],
       '⚠⚠ an accepted one joins the labour job\'s prep lines, after the estimate\'s');
    const COS = [accepted({ vendorAdds: [LANDSCAPER] })];
    // The hourly final: labour at the estimate, the fee on both prep vendors.
    const a0 = finalDoc(EST_BP, BP_JOB, [], { tc: 80, ps: 60 });
    const a1 = finalDoc(EST_BP, BP_JOB, COS, { tc: 80, ps: 60 });
    eq(a1._collected - a0._collected, 2700, '⚠⚠ the hourly final collects the fee on the added vendor: 30% of $9,000');
    eq(a1.overUnder, 0, '⚠⚠ and the baseline moved by exactly that fee: no variance');
    ok(a1.requiresApproval === false, 'so the accepted vendor never sends the final to a manager');
    has(text(a1.html), 'Adds Landscaper (est. $9,000) — it bills you directly, and the site management fee on it is in the fee above', 'the change-order row names it');
    has(text(a1.html), 'A vendor a change order added bills you directly, and the site management fee on what it actually charged is in the fee above.', 'the section note says where its fee is');
    lacks(text(a1.html), 'These hours are not billed separately', 'and says nothing of hours it did not add');
    has(text(a1.html), 'adds Landscaper, in the site management fee above', 'the payment summary names it');
    const quoted = finalDoc(EST_BP, Object.assign({}, BP_JOB, { prepSourcing: { 'Lco-land': { quote: 12000 } } }), COS, { tc: 80, ps: 60 });
    eq(quoted._collected - a0._collected, 3600, 'on its actual quote once one is recorded: 30% of $12,000');
    // The fixed price with the fee on top.
    const f0 = finalDoc(EST_BPF, BP_JOB, [], { tc: 80, ps: 60 });
    const f1 = finalDoc(EST_BPF, BP_JOB, COS, { tc: 80, ps: 60 });
    eq(f1._collected - f0._collected, 2700, 'the fixed-price final collects the fee on it too, on top of the flat fee');
    eq(f1.overUnder, 0, 'with no variance');
    has(text(f1.html), 'adds Landscaper, in the site management fee above', 'and names it in the payment summary');
    const fh = finalDoc(EST_BPF, BP_JOB, [accepted({ tcHrs: 4, vendorAdds: [LANDSCAPER] })], { tc: 80, ps: 60 });
    has(text(fh.html), '+ $600; adds Landscaper, in the site management fee above', 'with hours: the signed price, then the vendor');
    // The change-order section's note on the fixed final: where the vendor's fee is, and a price sentence only for a
    // change order that carries a price (a vendor-only one carries none).
    has(text(f1.html), 'A vendor a change order added bills you directly, and the site management fee on what it actually charged is in the fee above.',
        '⚠ the fixed final\'s change-order note says where the added vendor\'s fee is');
    lacks(text(f1.html), 'Each is charged at the price on the change order you accepted', 'and claims no price for a change order that carries none');
    has(text(fh.html), 'because a fixed fee does not otherwise move with the hours worked. A vendor a change order added bills you directly',
        'with hours as well: the price sentence, then the vendor\'s');
    // The Job Plan's sourcing list on the labour job, and the close-out count.
    const SRC_FNS = ['renderVendorSourcing', 'jobPrepLines', 'coPrepVendorLines', 'coVendorAdds', '_srcLineKey', 'esc', 'fmt', 'dirStaleNotice',
      'logisticsLinesFor', 'logisticsCatsFor', 'logisticsLineOn', '_fldBg', 'vendorPickerOptions', '_selVendorId', 'resolveJobVendor',
      'lookupVendorById', 'vendorCategoriesForSlot', 'approvedVendorsInCats', 'isActiveVendor', '_catSet', 'vendorCats', 'vendorStatusOptions',
      '_coordHrsField', 'prepLineTCHrs', 'coordHrsFor', 'coordTouches', '_vendorRefLine', 'vendorPrimaryCat', 'vendorIdOf', 'vendorStars',
      'vendorPerf', 'prepFeeRate', 'coordHrsRollup', 'vendorLineHrs', 'premiumCoversLine', 'estimateAppraiserLines', 'vendorLineTCHrs'];
    const sourcing = (cos) => String(sandbox({ fns: SRC_FNS, vars: ['LOGISTICS_CATEGORIES', 'GROUP_JOB_MENU', 'VENDOR_GROUP_CARDS', 'PREP_FEE_RATE', '_dirStale', 'VENDOR_SLOT_CATEGORY_MAP', 'TOUCH_HRS', 'COORD_TOUCHES_BY_GROUP', 'COORD_TOUCHES'],
      stubs: { changeOrders: cos, jobs: [BP_JOB], estimateStore: {}, document: domStub({}), contractors: [],
               vendorDirectory: [{ vendor_name: 'Green Thumb Landscaping', category_group: 'Property Preparation', category: 'Landscaper', status: 'Active', _row: 3 }] } })
      .renderVendorSourcing(1, BP_JOB, EST_BP));
    ok(sourcing(COS).indexOf('Landscaper') >= 0, '⚠⚠ the labour job\'s sourcing list draws the vendor the change order added');
    ok(sourcing(COS).indexOf('Green Thumb Landscaping') >= 0, 'with the directory\'s landscaper offered to book');
    ok(sourcing([co({ vendorAdds: [LANDSCAPER] })]).indexOf('Landscaper') < 0, 'and an unaccepted change order draws nothing');
    const V = sandbox({ fns: ['vendorSourcingProgress', '_srcLineKey', 'logisticsLinesFor', 'logisticsLineOn', 'logisticsCatsFor',
                              'jobPrepLines', 'coPrepVendorLines', 'coVendorAdds'], vars: ['LOGISTICS_CATEGORIES'], stubs: { changeOrders: COS } });
    eq(V.vendorSourcingProgress(1, Object.assign({}, BP_JOB, { prepSourcing: { 'Lco-land': { status: 'Confirmed' } } }), EST_BP),
       { done: 1, total: 2 }, 'the "lined up" count includes it');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('⚠⚠ A3 — both forms charge the fee on vendors "identified in Exhibit A or added by Change Order" (counsel B9)');
  {
    const c = agrCtx();
    const st = (e) => text(c.agreementHtml(LIVING_JOB(), e));
    has(st(EST_BP), 'Home sale preparation vendors identified in the Estimate or added by Change Order are the exception', 'standard §3.5, hourly');
    has(st(EST_BPF), 'Home sale preparation vendors identified in the Estimate or added by Change Order are the exception', 'standard §3.5, fixed with the fee on top');
    has(st(EST_BPI), 'Home sale preparation vendors identified in the Estimate are the exception', 'an older inside-fee form keeps its words');
    lacks(st(EST_BPI), 'added by Change Order', 'where no change order can add one');
    const es = (e) => text(c.probateAgreementHtml(ESTATE_JOB({ svc: 'cleanout' }), Object.assign({}, EST_ESTATE, { svc: 'cleanout' }, e)));
    const prepE = { prepEnabled: true, prepItems: [{ type: 'Painting', cost: 10000, lid: 'bp1' }], prepCost: 10000, prepFee: 3000 };
    has(es(prepE), 'General contractor / site management fee on the home sale preparation vendors identified in Exhibit A or added by Change Order. Those vendors bill at cost',
        '⚠⚠ the estate fee row, hourly arm');
    const fx = es(Object.assign({}, prepE, { fixedPrice: true, fixedAmount: 40000, prepFeeOnTop: true, havellinTotal: 43000 }));
    has(fx, 'on the home sale preparation vendors identified in Exhibit A or added by Change Order. Those vendors bill at cost', 'the fee row, fixed arm');
    has(fx, 'of what the home sale preparation vendors identified in Exhibit A or added by Change Order actually invoice', 'and the Fixed Project Fee paragraph');
    lacks(es(Object.assign({}, prepE, { fixedPrice: true, fixedAmount: 43000, havellinTotal: 43000 })), 'added by Change Order', 'an older inside-fee estate form keeps its words');
  }

  group('⚠⚠ A3 — the estate form\'s §4.2 change-order form has a row for an added vendor, and stops saying "no charge" (lead)');
  {
    // The fee row above says "or added by Change Order", and §4.2 is the form a change order is written on: it had no
    // row for a vendor, and its hourly Billing row said the change order "does not itself create a charge" — false for
    // one that adds a vendor carrying the 30% fee. It asks coPrepVendorsOn, the rule the change order modal asks.
    const c = agrCtx();
    const es = (e) => text(c.probateAgreementHtml(ESTATE_JOB({ svc: 'cleanout' }), Object.assign({}, EST_ESTATE, { svc: 'cleanout' }, e)));
    const prepE = { prepEnabled: true, prepItems: [{ type: 'Painting', cost: 10000, lid: 'bp1' }], prepCost: 10000, prepFee: 3000 };
    const hourly = es(prepE);
    const f42 = (t) => { const i = t.indexOf('4.2 Change Order Documentation'); return i < 0 ? '' : t.slice(i, t.indexOf('Havellin Authorization', i)); };
    ok(f42(hourly).length > 100, 'fixture: the hourly estate form prints §4.2');
    has(f42(hourly), 'Added Preparation Vendor (the vendor and its estimated cost. It bills the Client directly, at cost, and the Home Sale Preparation Fee in Section 3.1 is charged on what it actually invoices.)',
        '⚠⚠ the form has a row for the vendor, saying who pays it and where its fee is');
    has(f42(hourly), 'The additional hours are billed as worked, at the hourly rates in Section 3.1. A preparation vendor this Change Order adds bills the Client directly, at cost, and the Home Sale Preparation Fee is charged on what it actually invoices; this Change Order creates no other charge.',
        '⚠⚠ the hourly Billing row names the vendor\'s fee');
    lacks(f42(hourly), 'does not itself create a charge', 'and no longer says the change order creates no charge');
    const fx = f42(es(Object.assign({}, prepE, { fixedPrice: true, fixedAmount: 40000, prepFeeOnTop: true, havellinTotal: 43000 })));
    has(fx, 'is charged on what it actually invoices, in addition to the fixed project fee.)', 'on a fixed fee with the prep fee on top, the fee is in addition to it');
    has(fx, 'Price of This Change', 'beside the fixed arm\'s own rows');
    lacks(f42(es(Object.assign({}, prepE, { fixedPrice: true, fixedAmount: 43000, havellinTotal: 43000 }))), 'Added Preparation Vendor',
          'never on an older fixed fee with the prep fee inside it (no change order can add a vendor there)');
    const plain = f42(es({}));
    lacks(plain, 'Added Preparation Vendor', 'nor on an estate with no preparation vendors');
    has(plain, 'The additional hours are billed as worked, at the hourly rates in Section 3.1. This Change Order does not itself create a charge.',
        'whose hourly Billing row reads exactly as it did');
    eq(c.coPrepVendorsOn(Object.assign({}, EST_ESTATE, { svc: 'cleanout' }, prepE), ESTATE_JOB({ svc: 'cleanout' })), true,
       'the form and the modal ask the same rule');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('⚠⚠ A4 — on a Premium estate an appraiser line books no hours: measured through calcAll');
  {
    const run = (prem, withArt, fixed, svc) => {
      const seed = { 'e-prem': !!prem };
      if (fixed) seed['e-fixed'] = { checked: true };
      const r = driveCalcAll({ svc: svc || 'cleanout', sqft: 3500, rooms: BASE, seed });
      if (withArt) { r.ctx.vendors = [Object.assign({}, ART)]; r.ctx.calcAll(); }
      return r;
    };
    const E = (r) => r.ctx.currentEstimate || {};
    // Standard: the line books its 2.0 hours (Q20).
    const s0 = E(run(false, false)), s1 = E(run(false, true));
    eq(s1.vendorTCHrs, 2, 'a standard estate: the appraiser books its 2.0 hours');
    eq(s1.totTC - s0.totTC, 2, 'two concierge hours on the estimate');
    eq(s1.havellinTotal - s0.havellinTotal, 300, '$300 at the standard rate (3,500 sq ft Estate Settlement, $18,000 → $18,300)');
    // Premium: none.
    const p0 = E(run(true, false)), p1r = run(true, true), p1 = E(p1r);
    eq(p1.vendorTCHrs, 0, '⚠⚠ Premium: the appraiser line books no coordination hours');
    eq([p1.totTC, p1.havellinTotal], [p0.totTC, p0.havellinTotal], '⚠⚠ so adding the appraiser moves a Premium hourly quote not at all ($' + p0.havellinTotal + ')');
    eq(p1.prem, true, 'fixture: the estimate is Premium');
    eq((p1.vendors || [])[0] && p1.vendors[0].tcHrs, 2, 'the line keeps its recorded 2.0 hours in the snapshot — the rule is applied at read time');
    const pf0 = E(run(true, false, true)), pf1 = E(run(true, true, true));
    eq(pf1.fixedAmount, pf0.fixedAmount, 'a Premium fixed-price suggestion does not move either ($' + pf0.fixedAmount + ')');
    const pp0 = E(run(true, false, false, 'probate')), pp1 = E(run(true, true, false, 'probate'));
    eq(pp1.havellinTotal, pp0.havellinTotal, 'and a Premium Probate ($' + pp0.havellinTotal + ')');
    // Both ways: switch Premium off on the same page and the line's hours come back.
    p1r.doc.getElementById('e-prem').checked = false;
    p1r.ctx.calcAll();
    eq(E(p1r).vendorTCHrs, 2, '⚠ switching Premium off books the appraiser\'s hours again');
    eq(E(p1r).totTC, s1.totTC, 'to the standard figure');
    p1r.doc.getElementById('e-prem').checked = true;
    p1r.ctx.calcAll();
    eq(E(p1r).vendorTCHrs, 0, 'and switching it back drops them again');
    // Another vendor on a Premium estate keeps its hours.
    const oth = run(true, false);
    oth.ctx.vendors = [Object.assign({}, ART), { type: 'Auction House', cost: 2000, lid: 'ah', tcHrs: 3 }];
    oth.ctx.calcAll();
    eq(E(oth).vendorTCHrs, 3, 'only the appraiser is covered: an auction house on the same Premium estate books its 3.0');
    // The reference band prices the same rule: identical with and without the appraiser on a Premium estate.
    const bandOf = (r) => String(r.doc.getElementById('ref-box').innerHTML || '');
    ok(bandOf(p1r).length > 0 && bandOf(run(true, true)) === bandOf(run(true, false)), 'the Pricing Reference Check does not move either');
    ok(bandOf(run(false, true)) !== bandOf(run(false, false)), 'while on a standard estate the appraiser moves it, as it moves the estimate');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('⚠⚠ A4 — the appraiser\'s own row on Build Estimate says why it books no hours, and the card total follows');
  {
    const r = driveCalcAll({ svc: 'cleanout', sqft: 3500, rooms: BASE, seed: { 'e-prem': true } });
    r.ctx.vendors = [Object.assign({}, ART), { type: 'Auction House', cost: 2000, lid: 'ah', tcHrs: 3 }];
    r.ctx.renderVendorGroupCards();
    r.ctx.calcAll();
    const cards = () => String(r.doc.getElementById('vendor-group-cards').innerHTML || '');
    has(cards(), 'No concierge hours &mdash; appraiser coordination is covered by Premium Estate', '⚠⚠ the appraiser\'s row says Premium covers it');
    eq((cards().match(/covered by Premium Estate/g) || []).length, 1, 'on the appraiser alone');
    ok(/\+3\.0 hrs concierge/.test(cards()) && !/\+5\.0 hrs concierge/.test(cards()), 'the card books the auction house\'s 3.0, not 5.0');
    // Toggling Premium repaints the cards (the transition guard), both ways.
    r.doc.getElementById('e-prem').checked = false;
    r.ctx.calcAll();
    lacks(cards(), 'covered by Premium Estate', 'switched off: the note goes');
    ok(/\+5\.0 hrs concierge/.test(cards()), 'and the card books both lines\' hours');
    r.doc.getElementById('e-prem').checked = true;
    r.ctx.calcAll();
    has(cards(), 'covered by Premium Estate', 'switched back on: it returns');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('⚠ A4 — every sum of vendor-line hours reads the rule: the saved-total share-out and the Job Plan');
  {
    const r = driveCalcAll({ svc: 'cleanout', sqft: 3500, rooms: BASE,
                             fns: ['pinVendorLineHours', 'vendorDirectoryReady', 'directoryCategories', 'vendorCats', 'coordHrsRollup'] });
    const P = r.ctx;
    P.vendorDirectory = [];   // not loaded: the lines share the saved total
    const lines = [{ type: 'Art Appraiser' }, { type: 'Estate Sale Company' }];
    P.pinVendorLineHours(lines, 4, true);
    eq(lines[1].tcHrs, 4, '⚠ on a Premium estate the saved total goes to the lines that book hours — the appraiser counts none of it');
    eq(lines[0].tcHrs, P.vendorLineTCHrs('Art Appraiser'), 'and the appraiser is pinned at its own hours, which come back if Premium goes');
    const std = [{ type: 'Art Appraiser' }, { type: 'Estate Sale Company' }];
    P.pinVendorLineHours(std, 4, false);
    eq(Math.round((std[0].tcHrs + std[1].tcHrs) * 10) / 10, 4, 'a standard estate shares it across both, as before');
    // The Job Plan's coordination rollup falls back to the lines through the same rule.
    const rollJob = { id: 1, svc: 'cleanout', vendorSourcing: { La: { coordHrs: 1 } } };
    const roll = (prem) => text(P.coordHrsRollup(rollJob, { svc: 'cleanout', prem, vendors: [Object.assign({}, ART, { lid: 'a' })] }));
    has(roll(true), 'Coordination time: estimated 0.0 hrs', 'the Job Plan\'s coordination rollup estimates no hours for a Premium appraiser');
    has(roll(false), 'Coordination time: estimated 2.0 hrs', 'and 2.0 on a standard one');
    // The Job Plan's sourcing card prints each line's estimated coordination beside the hours recorded for it.
    const SRC = ['renderVendorSourcing', 'jobPrepLines', 'coPrepVendorLines', 'coVendorAdds', '_srcLineKey', 'esc', 'fmt', 'dirStaleNotice',
      'logisticsLinesFor', 'logisticsCatsFor', 'logisticsLineOn', '_fldBg', 'vendorPickerOptions', '_selVendorId', 'resolveJobVendor',
      'lookupVendorById', 'vendorCategoriesForSlot', 'approvedVendorsInCats', 'isActiveVendor', '_catSet', 'vendorCats', 'vendorStatusOptions',
      '_coordHrsField', 'prepLineTCHrs', 'coordHrsFor', 'coordTouches', '_vendorRefLine', 'vendorPrimaryCat', 'vendorIdOf', 'vendorStars',
      'vendorPerf', 'prepFeeRate', 'coordHrsRollup', 'vendorLineHrs', 'premiumCoversLine', 'estimateAppraiserLines', 'vendorLineTCHrs', 'vendorGroupOfLine', 'vendorGroupCategories', 'directoryCategories'];
    const srcCard = (prem) => text(sandbox({ fns: SRC, vars: ['LOGISTICS_CATEGORIES', 'GROUP_JOB_MENU', 'VENDOR_GROUP_CARDS', 'PREP_FEE_RATE', '_dirStale', 'VENDOR_SLOT_CATEGORY_MAP', 'TOUCH_HRS', 'COORD_TOUCHES_BY_GROUP', 'COORD_TOUCHES', 'COORD_TOUCHES_DEFAULT'],
      stubs: { changeOrders: [], jobs: [{ id: 1, svc: 'cleanout' }], estimateStore: {}, document: domStub({}), contractors: [], vendorDirectory: [] } })
      .renderVendorSourcing(1, { id: 1, svc: 'cleanout' }, { svc: 'cleanout', prem, vendors: [Object.assign({}, ART)], prepItems: [], collections: [] }));
    has(srcCard(true), 'Art Appraiser', 'fixture: the sourcing card draws the appraiser line');
    has(srcCard(true), 'est 0.0', '⚠ the sourcing card estimates no coordination for it on a Premium estate');
    has(srcCard(false), 'est 2.0', 'and its 2.0 hours on a standard one');
    // Every call of vendorLineHrs passes the Premium flag: a caller that forgets books the hours silently.
    const live = noComments(src);
    const calls = live.match(/vendorLineHrs\(([^()]|\([^()]*\))*\)/g) || [];
    const uses = calls.filter((x) => !/^vendorLineHrs\(v, prem\) \{/.test(x));
    ok(uses.length >= 5, 'fixture: the callers are found (' + uses.length + ')');
    eq(uses.filter((x) => !/,/.test(x)), [], '⚠⚠ every call of vendorLineHrs hands it the Premium flag');
    eq((live.match(/: getVendorTCHrs\(prem\);/g) || []).length, 1, 'calcAll sums the lines with it');
    has(live, 'pinVendorLineHours(vendors, est.vendorTCHrs, est.prem);', 'and the reopen share-out reads the saved estimate\'s flag');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('⚠⚠ B8 — the final\'s Manager approval asks `blocked` first, and says what blocks it');
  {
    const notices = [], pins = [];
    const mk = (est, logs) => inv({ estimateStore: { 1: { estimate: est, approved: true } }, jobLogs: logs || {},
      jobs: [Object.assign({}, BP_JOB, { payments: [] })],
      dashNotice: (kind, msg) => notices.push({ kind, msg }), _dashRedraw: () => {}, openInvPinModal: (id) => pins.push(id) },
      ['dashApproveInvoice']);
    mk(EST_LAB, {}).dashApproveInvoice(1, 'final');
    eq(notices.pop(), { kind: 'warn', msg: 'No hours have been logged for this job, so the final cannot be issued. Log them on the Job Plan tab first.' },
       '⚠⚠ an hourly final with no hours logged: the refusal the send gives, not "no approval needed"');
    eq(pins.length, 0, 'and no PIN is asked for');
    mk(EST_LAB, logOf(80, 60)).dashApproveInvoice(1, 'final');
    has(notices.pop().msg, 'inside the ±15% tolerance', 'hours at the estimate: inside the tolerance, as before');
    mk(EST_LAB, logOf(160, 120)).dashApproveInvoice(1, 'final');
    eq(pins, [1], 'far over the estimate: the PIN is asked for');
    const reg = sandbox({ vars: ['INV_FINAL_NO_HOURS_WHY'] });
    has(noComments(fn('dashApproveInvoice')), 'INV_FINAL_NO_HOURS_WHY', 'one sentence …');
    ok(src.indexOf('if (d.blocked) return INV_FINAL_NO_HOURS_WHY;') >= 0, '… which the send\'s own refusal returns');
    ok(typeof reg.INV_FINAL_NO_HOURS_WHY === 'string' && reg.INV_FINAL_NO_HOURS_WHY.length > 20, 'and it is a real sentence');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('⚠⚠ B9 — the ±15% baseline moves by what the final bills for a change order (coBaselineMove)');
  {
    // An hourly rush job with a 10% discount: 80 TC @150 + 60 PS @100, $1,940 package, premium 20% (not on the prep fee).
    // havellinTotal as calcAll gives it: 19,940 + 3,988 − discountOnLabor(18,000, 0.2, 10) = 2,160 → 21,768.
    const ER = Object.assign({}, EST_LAB, { rush: true, rushPct: 0.2, rushExPrepFee: true, discountPct: 10, havellinTotal: 21768 });
    const D = sandbox({ fns: ['discountOnLabor'] });
    eq(ER.havellinTotal, 19940 + 3988 - D.discountOnLabor(18000, 0.2, 10), 'fixture: the estimate carries calcAll\'s arithmetic');
    const CO40 = [accepted({ tcHrs: 40, psHrs: 40 })];
    const M = sandbox({ fns: ['coBaselineMove', 'coPrice', 'coRushPct', 'coBaselineShift', 'coHours', 'discountOnLabor', 'coVendorAdds',
                              'estPrepFeeOnTop', 'prepFeeRate'], vars: ['RUSH_PCT', 'PREP_FEE_RATE'] });
    eq(M.coBaselineMove(CO40, ER, 150, 100), 10000 + 2000 - 1200, '⚠⚠ $10,000 of hours carry the 20% premium and the 10% discount, as the final bills them: $10,800');
    eq(M.coBaselineMove(CO40, EST_LAB, 150, 100), 10000, 'on a job with neither, the plain value');
    // Driven: log exactly the estimate plus the change order's hours, and the final lands on its baseline.
    const d = finalDoc(ER, BP_JOB, CO40, { tc: 120, ps: 100 });
    eq(d.overUnder, 0, '⚠⚠ the final billing exactly the authorised hours reads no variance (it read +$800, the premium less the discount on the change order)');
    eq(d.variancePct, 0, 'so the gate measures the work, not the premium');
    const d2 = finalDoc(ER, BP_JOB, [], { tc: 80, ps: 60 });
    eq(d2.overUnder, 0, 'fixture: the same job without the change order, at the estimate, reads none either');
    // The fixed price: the signed price, premium pinned on it, and the vendor fee only where the final bills it.
    const FXR = Object.assign({}, EST_BPF, { rush: true, rushPct: 0.2 });
    eq(M.coBaselineMove([accepted({ tcHrs: 4, rushPct: 0.2 })], FXR, 150, 100), 720, 'fixed rush: the signed price with its pinned premium ($600 + 20%)');
    eq(M.coBaselineMove([accepted({ vendorAdds: [LANDSCAPER] })], EST_BPF, 150, 100), 2700, 'a vendor on a fixed price with the fee on top: its fee');
    eq(M.coBaselineMove([accepted({ vendorAdds: [LANDSCAPER] })], EST_BPI, 150, 100), 0, 'on an older inside-fee fixed price: nothing, as nothing bills it');
    const OLD = Object.assign({}, EST_BP, { rush: true, rushPct: 0.2, rushExPrepFee: false });
    eq(M.coBaselineMove([accepted({ vendorAdds: [LANDSCAPER] })], OLD, 150, 100), 2700 + 540, 'an hourly quote saved before Q9 charges the premium on the prep fee, so the move carries it');
    // Accepting the change order writes the same figure onto the job: the client list's revised estimate.
    const a = coCtx(ER, BP_JOB, [co({ tcHrs: 40, psHrs: 40 })], { 'coa-co-id': '100' });
    a.__dom.getElementById('coa-client-name').value = 'Helen Harper';
    a.acceptChangeOrder();
    eq(a.__job.havellinEst, 21768 + 10800, '⚠ the job\'s revised estimate is the final\'s baseline: $32,568');
    eq(noComments(fn('invoiceHtml')).match(/coBaselineMove\(/g).length, 1, 'the invoice reads the rule once');
    eq(noComments(fn('acceptChangeOrder')).match(/coBaselineMove\(/g).length, 1, 'and so does the acceptance');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('⚠⚠ B14 — §5.3\'s counsel row names the party §5.2 names, on every matter type');
  {
    const c = agrCtx();
    const PARTY = { probate: 'the estate attorney', both: 'the estate attorney', trust: 'the trustee or their counsel', neither: 'the Client', '': 'the estate attorney' };
    Object.keys(PARTY).forEach((m) => {
      const doc = text(c.probateAgreementHtml(ESTATE_JOB({ matterType: m || undefined, svc: m === 'probate' || m === 'both' || !m ? 'probate' : 'cleanout' }),
                                              Object.assign({}, EST_ESTATE, { svc: m === 'probate' || m === 'both' || !m ? 'probate' : 'cleanout' })));
      const who = PARTY[m], mm = m || 'unanswered';
      has(doc, 'Admit an appraiser engaged by ' + who + ' Instruction from ' + who + ' As scheduled by ' + who, '⚠⚠ ' + mm + ': the row names ' + who + ' in all three columns');
      lacks(doc, 'engaged by counsel', mm + ': never "counsel" in the abstract');
      eq(c._agrOtherAppraisalsBy(ESTATE_JOB({ matterType: m || undefined })), who, mm + ': the one rule answers ' + who);
    });
    const neither = text(c.probateAgreementHtml(ESTATE_JOB({ matterType: 'neither', svc: 'cleanout' }), Object.assign({}, EST_ESTATE, { svc: 'cleanout' })));
    has(neither, 'Professional appraisals are arranged by the Client.', '⚠ neither: §5.2 names the Client …');
    has(neither, 'Admit an appraiser engaged by the Client', '… and so does §5.3, on the same page (it named the estate attorney)');
    lacks(noComments(fn('probateAgreementHtml')), '_apprWho', 'the row\'s own copy of the rule is gone');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('⚠⚠ B25 — crew hours with no concierge hours: one rule, flagged where the final is sent and approved');
  {
    const W = sandbox({ fns: ['finalCrewOnlyWarn', 'estimateIsFeeOnly', 'estDeclutterHrs', 'agrBillingRates', 'fmt'] });
    const w = W.finalCrewOnlyWarn(BP_JOB, EST_LAB, 0, 60);
    eq(w, '60.0 crew hours logged with no concierge hours. The concierge is on site for every crew hour, so this final is likely under-billing $12,000 of concierge time. Check the log before sending.',
       'crew hours with none of the concierge\'s: the sentence, with the concierge time the estimate priced');
    eq(W.finalCrewOnlyWarn(BP_JOB, EST_LAB, 4, 60), '', 'any concierge hours: nothing');
    eq(W.finalCrewOnlyWarn(BP_JOB, EST_LAB, 0, 0), '', 'no hours at all is the blocked final, not this flag');
    eq(W.finalCrewOnlyWarn(BP_JOB, EST_BPF, 0, 60), '', 'a fixed price never consults the hours');
    eq(W.finalCrewOnlyWarn(LIVING_JOB({ svc: 'prep' }), EST_PREP, 0, 60), '', 'a fee-only engagement bills none');
    // The invoice still carries it (for the retired tab's shim) …
    const d = inv({ estimateStore: { 1: { estimate: EST_LAB, approved: true } }, jobLogs: logOf(0, 60) })
      .invoiceHtml(Object.assign({}, BP_JOB, { payments: [] }), 'final');
    has(text(d.warnHtml), '60.0 crew hours logged with no concierge hours.', 'invoiceHtml\'s warning is the same sentence');
    ok(d.blocked === false, 'and it is a flag, never a refusal');
    // … and the timeline's final row carries it on the dashboard, where the final is sent and approved.
    const TL = sandbox({
      fns: ['agrApprovalWithdrawn', 'jobTimeline', '_localDateOf', 'paymentStageWord', 'finalAwaitsHours', 'estimateIsFeeOnly', 'estDeclutterHrs',
        'finalCrewOnlyWarn', 'agrBillingRates', 'fmt', 'jobTimelineNext', 'paymentSplit', 'unscoredRoomNames', 'jobActivationBlockers',
        'resolveExecutorAuth', 'jobOnProbateTrack', 'matterDef', 'isDecedentJob', 'invFiduciaryMode', 'matterTypeOf', 'isJobWon', 'isJobFunded',
        'jobPayments', 'stagePaidTotal', 'depositPaidTotal', 'depositTargetFor', 'docSentAt', 'docKeyFor', 'agreementSignature',
        'isAgreementSigned', 'esignProviderKey', 'esignAvailable', 'esignJobWatches', 'isAgreementSent', 'jtDraftLine', 'staleDraftNote',
        'staleDraftsOf', 'draftIsStale', 'draftOutstanding', 'staleDocName', '_draftDay', '_andJoin', 'estimateOutForApproval', 'priceAboveSent',
        'docDraftPending', 'fmtMoney', 'priceAboveAcceptance', '_approvedPriceAbove', 'coHours', '_ymdLocal', 'paymentCounts'],
      vars: ['JT_SHORT', 'EXECUTOR_AUTH_OPTIONS', 'JT_NEXT', 'AGR_SIG_METHODS', 'ESIGN_PROVIDERS', 'ESIGN_PROVIDER_KEY', 'DECEDENT_SERVICES', 'DOC_STAGE_WORD'],
      stubs: { REQUIRE_WALKTHROUGH_NOTES: false, SHEETS_SYNC_URL: '' } });
    // A job closed with every step before the final recorded, so the final is the one lit step (checked below).
    const closedJob = (over) => Object.assign({}, BP_JOB, { status: 'closed', deliveredOn: '2026-09-29', activatedOn: '2026-09-01', won: true,
      approved: true, agrSigned: true, agrSent: true, depositReceived: true, created: 'Sep 1, 2026', walkthrough: '2026-08-15',
      estimateSentDate: '2026-08-20',
      payments: [{ uid: 'd', stage: 'deposit', amount: 9970, date: '2026-08-01', method: 'wire' }],
      docState: { agreement: { sentAt: '2026-08-25T12:00:00Z', sig: { signedBy: 'Helen Harper', signedOn: '2026-08-26', how: 'wet' } },
                  'invoice:deposit': { sentAt: '2026-08-27T12:00:00Z' } } }, over || {});
    const rec = { estimate: Object.assign({}, EST_LAB, { rooms: [{ name: 'Kitchen', vol: 3, cplx: 3 }] }), approved: true };
    const rowOf = (job, logs) => (TL.jobTimeline(job, rec, logs, []) || []).find((x) => x.key === 'final_invoiced') || {};
    const crewOnly = [{ date: '2026-09-02', members: [{ name: 'Crew', role: 'PS', hours: 60 }] }];
    has(rowOf(closedJob(), crewOnly).sub, '60.0 crew hours logged with no concierge hours', '⚠⚠ the final row flags it on a closed job');
    lacks(rowOf(closedJob(), [{ date: '2026-09-02', members: [{ name: 'Anthony Graziano', role: 'TC', hours: 8 }, { name: 'Crew', role: 'PS', hours: 60 }] }]).sub || '',
          'crew hours logged with no concierge', 'not once the concierge\'s hours are logged');
    lacks(rowOf(closedJob({ status: 'active', deliveredOn: '' }), crewOnly).sub || '', 'crew hours logged', 'not while the job is still in progress');
    const sentFinal = closedJob();
    sentFinal.docState = Object.assign({}, sentFinal.docState, { 'invoice:final': { sentAt: '2026-09-30T12:00:00Z' } });
    lacks(rowOf(sentFinal, crewOnly).sub || '', 'crew hours logged', 'nor after the final has gone');
    const nxt = TL.jobTimelineNext(TL.jobTimeline(closedJob(), rec, crewOnly, []));
    eq(nxt && nxt.key, 'final_invoiced', 'fixture: on a closed job the final is the lit step, so the band prints this row\'s line');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('⚠ Stale text — the crew badge on a fixed price says the fee does not move with the crew (Q5)');
  {
    const COVER = ['Primary Bath', 'Bathroom 2', 'Bathroom 3', 'Half Bath', 'Laundry Room', 'Entryway / Foyer', 'Garage (2-car)'];
    const badge = (fixed, delta) => {
      const r = driveCalcAll({ svc: 'cleanout', sqft: 9000, rooms: BASE.concat(COVER), seed: fixed ? { 'e-fixed': { checked: true } } : {} });
      const rec = (r.ctx.currentEstimate || {}).psRecommended;
      r.doc.getElementById('ps-crew-size').value = String(rec + delta);
      r.ctx._crewUserSet = true;
      r.ctx.calcAll();
      return { rec, html: text(r.doc.getElementById('ps-crew-badge').innerHTML) };
    };
    const hb = badge(false, 1), fb = badge(true, 1);
    ok(hb.rec >= 3, 'fixture: a house big enough to recommend ' + hb.rec + ' specialists');
    has(hb.html, 'the estimate is lower than it would be at', 'hourly: a bigger crew lowers the quote, and the badge says so');
    has(fb.html, 'but the suggested fixed fee stays on the two-specialist plan whatever crew runs it, so it shortens the calendar without lowering the fee.',
        '⚠⚠ fixed: the badge says the fee does not drop');
    lacks(fb.html, 'the estimate is lower', 'and no longer that it does');
    const hs = badge(false, -1), fs = badge(true, -1);
    has(hs.html, 'so the fee is higher and the calendar is longer', 'hourly: a smaller crew raises the quote');
    has(fs.html, 'The suggested fixed fee is priced on the two-specialist plan whatever the crew, so the fee does not move; only the calendar is longer.',
        'fixed: a smaller crew moves only the calendar');
    lacks(fs.html, 'the fee is higher', 'and the fee is not "higher"');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('⚠ Stale text — the "Agreement not signed" chip names what is actually missing');
  {
    const G = sandbox({ fns: ['agreementChipFix', 'docReadiness', 'agreementReady', 'isJobWon', 'priceAboveAcceptance', '_approvedPriceAbove',
                              'fmtMoney', 'isAgreementSent', 'isAgreementSigned', 'agreementSignature', 'docSentAt', 'docKeyFor', 'esignJobWatches',
                              'esignProviderKey', 'esignAvailable'],
                        vars: ['DOC_READY_WHY', 'ESIGN_PROVIDERS', 'ESIGN_PROVIDER_KEY'], stubs: { estimateStore: {}, SHEETS_SYNC_URL: '' } });
    const EST = { estimate: { havellinTotal: 20000 }, approved: true };
    const J = (over) => Object.assign({ id: 1, name: 'Harper', svc: 'downsizing_move', status: 'won', won: true, acceptedTotal: 20000 }, over || {});
    has(G.agreementChipFix(J(), null), 'No estimate has been built', 'no estimate: says so');
    has(G.agreementChipFix(J(), { estimate: { havellinTotal: 20000 }, approved: false }), 'The estimate must be approved before the agreement can be drawn.', 'unapproved: the estimate first');
    has(G.agreementChipFix(J({ won: false, status: 'approved' }), EST), 'Record the client’s acceptance first', 'not yet won: the client\'s yes');
    has(G.agreementChipFix(J({ acceptedTotal: 18000 }), EST), 'The client accepted', 'a raise: the re-acceptance');
    eq(G.agreementChipFix(J(), EST), 'Send the signing packet from the timeline, then record the signature once the client signs.', 'ready: send the packet');
    eq(G.agreementChipFix(J({ agrSent: true, docState: { agreement: { sentAt: '2026-09-29T12:00:00Z' } } }), EST),
       'The signing packet is out: record the signature on the timeline once the client has signed.', 'sent by hand: record the signature');
    const watched = J({ agrSent: true, docState: { agreement: { sentAt: '2026-09-29T12:00:00Z', esign: { envelopeId: 'env-1' } } } });
    eq(G.agreementChipFix(watched, EST), G.ESIGN_PROVIDERS[G.esignProviderKey()].label + ' is watching for the client\'s signature and records it when the envelope completes.',
       'an envelope out: the provider is watching, and records the signature itself');
    const all = [G.agreementChipFix(J(), null), G.agreementChipFix(J(), EST)].join(' ');
    lacks(all, 'Approve the agreement', '⚠⚠ never "Approve the agreement": it has no approval step');
    const dash = noComments(fn('renderClientDashboard'));
    has(dash, "fix:agreementChipFix(job, null)", 'the chip reads it');
    lacks(src, "fix:'Approve the agreement, send the signing packet, then record the signature'", 'and the old fix is gone');
  }
};
