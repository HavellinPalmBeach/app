'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// THE VENDORS' OWN INSURANCE, AND HAVELLIN'S AS THE AGREEMENTS PRINT IT (2026-10-20; Q87, with A19 and Q61).
// Anthony, after the insurer asked whether Havellin's vendors and 1099 crew carry their own coverage:
//   · A vendor's certificate of insurance is asked for WITH THE BOOKING (cold requests go unanswered), recorded on the
//     directory row as two dates, and the Job Plan FLAGS a vendor on the job whose certificate is not current: the fold's
//     count, a summary at the top of the sourcing list, a flag under the slot with a one-tap request email. Never a block.
//   · Both client agreements say Havellin requires its vendors to carry their own coverage and provides the certificates
//     on request (one sentence, agrVendorCoiTxt, two readers); the estate form gains §6.4 (independent, no warranty, a
//     claim goes against the vendor and its insurer, release and indemnity), which the standard form had since the start.
//   · Every figure the agreements state about Havellin's own coverage comes from one catalogue (insCoverage): a bound
//     limit prints as money, an unbound one as the bracketed figure applied for, and the estate form says so under §6.1
//     while any is unbound. §6.2 follows A19: documented value up to the policy's limits; no $10,000 cap.
// Driven on the real helpers, the real slot line, the real sourcing list and both real agreement builders. Today is an
// argument or a stub, never the clock.
// ─────────────────────────────────────────────────────────────────────────────

const { sandbox, source, fn, domStub } = require('./harness');

const SRC = source();
const text = (h) => String(h).replace(/<[^>]+>/g, ' ').replace(/&rsquo;|&#8217;/g, '’').replace(/&amp;/g, '&').replace(/&middot;/g, '·').replace(/&#9888;/g, '⚠').replace(/\s+/g, ' ').trim();
// Live source of one function: comment lines stripped (a needle must not match the comment that explains it).
const live = (name) => fn(name).split('\n').filter((l) => !l.trim().startsWith('//')).map((l) => l.replace(/\s\/\/\s.*$/, '')).join('\n');
const count = (hay, needle) => hay.split(needle).length - 1;

const TODAY = '2026-10-20';
const V_CUR  = { _row: 1, vendor_name: 'Acme Movers', category: 'Moving', status: 'Active', email: 'office@acme.test', phone: '5615550100',
                 contact_first: 'Andy', contact_last: 'Ramirez', contact_email: 'andy@acme.test', coi_received: '2026-10-01', coi_expires: '2027-10-01' };
const V_EXP  = { _row: 2, vendor_name: 'Shore Hauling', category: 'Junk Removal / Hauling', status: 'Active', email: 'desk@shore.test', coi_received: '2025-09-30', coi_expires: '2026-09-30' };
const V_NONE = { _row: 3, vendor_name: 'Palm Auctions', category: 'Auction House', status: 'Active', email: '', phone: '5615550101' };
const V_ISO  = { _row: 4, vendor_name: 'Ocean Appraisals', category: 'Art Appraiser', status: 'Active', email: 'a@ocean.test',
                 coi_received: '2026-10-03T04:00:00.000Z', coi_expires: '2027-10-03T04:00:00.000Z' };
const V_UNDATED = { _row: 5, vendor_name: 'Shred Co', category: 'Document Shredding', status: 'Active', email: 's@shred.test', coi_received: '2026-10-05' };
const DIR = [V_CUR, V_EXP, V_NONE, V_ISO, V_UNDATED];

const COI_FNS = ['vendorCoiState', '_vendorYmd', 'vendorCoiRequestMailto', 'vendorCoiLineHtml', 'vendorsWithoutCoi', '_assignedVendorsForJob',
  'lookupVendorById', 'vendorIdOf', 'vendorContacts', 'fmtDate2', 'esc', 'jobListEntries', '_vendorRefLine', 'resolveJobVendor', 'fmtPhoneDisplay', 'planVendorsMeta'];
const COI_VARS = ['VENDOR_CONTACT_SLOTS', 'HAVELLIN_COI_HOLDER', 'INV_RELEASE_DISPOSITIONS'];
function coiCtx(over) {
  return sandbox({ fns: COI_FNS, vars: COI_VARS,
    stubs: Object.assign({ vendorDirectory: DIR, _photoRefs: {}, _todayStr: () => TODAY, saveJobs() {}, vendorSourcingProgress: () => ({ done: 1, total: 2 }) }, over || {}) });
}

// The agreement builders, lifted as agreement-rates.test.js lifts them, plus the insurance helpers of this build.
const AGR_FNS = ['docServiceTitle', 'probateSvcOffTrack', 'svcLabelOf', '_agrComplianceHeading', '_agrComplianceLead', '_agrApprover', '_agrTrustDeliverable', 'matterDef', 'matterTypeOf', 'invFiduciaryMode', 'marketingOptOutBlock', 'marketingUseParas', '_mktClause', 'estTolerancePctTxt', 'agreementHtml', 'agrPriceAdjustments', '_pctWords', 'probateAgreementHtml', 'agrFillSlot', 'agrReferralFeeTxt', 'jobProbateCourt', 'courtFromCaseNo', 'agrFinalDueTxt', '_agrTrusteeRepresentation', '_agrApprovedStamp', 'agrBillingRates', 'materialsBasisNote', 'materialsPackageQuoted',
  'fmt', 'esc', 'paymentSplit', 'isDecedentJob', 'agrSection', '_agrHasPrepVendors', 'estimateDocScope', 'svcHasDocStep', 'docScopeDef', '_agrScopeServices',
  '_agrMidpointTrigger', '_agrProbateCompliance', 'esignAnchor', 'estFixedFee', 'estPrepFeeOnTop', 'weArrangeAppraisals', 'docTierProduces', 'docTierOf', 'docTierDef', 'estFixedLines', 'fixedDiscountBasisWords', 'coRushPctFor', 'appraisalDuty', 'estimateAppraiserLines', 'estimateAppraiserNames', '_agrOtherAppraisalsBy', 'coPrepVendorsOn', 'roundCents', 'fmtHrs', '_agrTrustIsParty', 'trustInstrumentTitle', '_agrCounsel', 'docEstateAuthority', 'estateAuthority', 'jobOnProbateTrack', 'invProbateRows', '_agrEstateNoun', '_agrAuthorityTitle', '_agrCoRepRepresentation', '_agrCoSigners', 'jobFiduciaries', 'jobListEntries', '_agrClientCapacity', '_agrCoSignerCaption',
  'insCoverage', 'insFigure', 'insUnbound', 'insPlaceholderNote', 'agrCoverageLines', 'agrVendorCoiTxt'];
const AGR_VARS = ['AGR_DEPOSIT_DUE_TXT', 'AGR_NOT_AN_ACCOUNTING', 'MATTER_TYPES', 'SVC_LABELS', 'EST_TOLERANCE_PCT', 'TIME_INCREMENT_TXT', 'SMF_PCT', 'DECEDENT_SERVICES', 'HAVELLIN_OFFICE_PHONE',
  'JOB_STEPS', 'DOC_SCOPES', 'ESIGN_ANCHORS', 'DOC_TIERS', 'DOC_TIER_FROM_SCOPE', 'RUSH_PCT', 'ESTATE_AUTHORITIES', 'AGR_NO_PURCHASE'];
const EST = { jobId: 1, tcFee: 18500, psFee: 12500, pkgCost: 1500, pkgLabel: 'Estate Premium — $1,500', smf: 0, prepFee: 0, havellinTotal: 32500, totTC: 100, totPS: 100,
  tcRate: 185, psRate: 125, discountPct: 0, fixedPrice: false, rush: false, vendors: [], prepItems: [], rooms: [], collections: [], vehicles: [] };
const PROBATE = { id: 1, hvlId: 'HVL-0007', name: 'Margaret Doe', svc: 'probate', executor: 'Tripp Butler', addr: '69 Beach Blvd', city: 'Palm Beach', zip: '33480', deathDate: '2026-01-15', docLevel: 'formal', matterType: 'probate' };
const LIVING  = { id: 2, hvlId: 'HVL-0008', name: 'Jane Doe', svc: 'downsizing', addr: '12 Ocean Blvd', city: 'Palm Beach', zip: '33480' };
const agrCtx = () => sandbox({ fns: AGR_FNS, vars: AGR_VARS, stubs: { estimateStore: {}, currentEstimate: null } });

module.exports = function ({ group, ok, eq, has, lacks }) {

  group('A. vendorCoiState: the one reader of the two dates');
  {
    const C = coiCtx();
    eq(C.vendorCoiState(V_NONE, TODAY).state, 'none', 'no date at all: none');
    eq(C.vendorCoiState(V_NONE, TODAY).card, 'not on file', 'the card reads not on file');
    eq(C.vendorCoiState(V_NONE, TODAY).flag, 'COI not on file: ask for it with the booking', 'the flag says to ask with the booking');
    eq(C.vendorCoiState(V_EXP, TODAY).state, 'expired', 'an expiry before today: expired');
    eq(C.vendorCoiState(V_EXP, TODAY).card, 'expired Sep 30, 2026', 'the card names the day');
    eq(C.vendorCoiState(V_EXP, TODAY).flag, 'COI expired Sep 30, 2026: ask for a renewal certificate', 'the flag asks for a renewal');
    eq(C.vendorCoiState(V_CUR, TODAY).state, 'current', 'received with an expiry ahead: current');
    eq(C.vendorCoiState(V_CUR, TODAY).card, 'received Oct 1, 2026, expires Oct 1, 2027', 'the card carries both days');
    eq(C.vendorCoiState(V_CUR, TODAY).flag, '', 'and no flag');
    eq(C.vendorCoiState(V_UNDATED, TODAY).state, 'current', 'received with no expiry: current (the renewal is asked for by hand)');
    eq(C.vendorCoiState(V_UNDATED, TODAY).card, 'received Oct 5, 2026, no expiry recorded', 'and the card says the expiry is not recorded');
    eq(C.vendorCoiState(V_ISO, TODAY).state, 'current', '⚠ the sheet hands a date cell back as an ISO datetime: still read');
    eq(C.vendorCoiState(V_ISO, TODAY).card, 'received Oct 3, 2026, expires Oct 3, 2027', 'as the day it names');
    eq(C._vendorYmd('2026-10-03T04:00:00.000Z'), '2026-10-03', '_vendorYmd slices the day off an ISO datetime');
    eq(C._vendorYmd('garbage'), '', 'and answers nothing for anything else');
    eq(C.vendorCoiState(Object.assign({}, V_CUR, { coi_expires: TODAY }), TODAY).state, 'current', 'an expiry today is still current');
    eq(C.vendorCoiState(Object.assign({}, V_CUR, { coi_expires: '2026-10-19' }), TODAY).state, 'expired', 'yesterday is expired');
    eq(C.vendorCoiState(null, TODAY).state, 'none', 'no vendor at all answers none, never throws');
  }

  group('B. The one-tap request: a mailto, never a send');
  {
    const C = coiCtx();
    const m = C.vendorCoiRequestMailto(V_CUR);
    has(m, 'mailto:andy%40acme.test', 'the first named contact with an email is addressed');
    has(decodeURIComponent(m), 'Hello Andy,', 'and greeted by first name');
    has(decodeURIComponent(m), 'Havellin Palm Beach, LLC, 515 N Flagler Drive, Suite 350, West Palm Beach, FL 33401 as certificate holder and additional insured', 'the certificate holder is the firm at its address');
    has(decodeURIComponent(m), 'workers’ compensation or your exemption certificate', 'and asks for comp or the exemption');
    has(C.vendorCoiRequestMailto(V_EXP), 'mailto:desk%40shore.test', 'with no named contact, the firm\'s inbox');
    eq(C.vendorCoiRequestMailto(V_NONE), '', 'with no email at all, no link');
    lacks(live('vendorCoiRequestMailto') + live('vendorCoiLineHtml'), 'fetch(', 'the app sends nothing itself');
  }

  group('C. The slot\'s reference line: current with the rest, otherwise the flag');
  {
    const C = coiCtx();
    const idOf = (v) => C.vendorIdOf(v);
    const cur = C._vendorRefLine({ vendorId: idOf(V_CUR), vendorName: 'Acme Movers' });
    has(text(cur), 'COI to Oct 1, 2027', 'a current certificate reads with the rest');
    lacks(cur, 'vendor-coi-flag', 'and carries no flag');
    const none = C._vendorRefLine({ vendorId: idOf(V_NONE), vendorName: 'Palm Auctions' });
    has(none, 'vendor-coi-flag', 'no certificate: the flag');
    has(text(none), '⚠ COI not on file: ask for it with the booking', 'in the booking\'s words');
    has(text(none), 'no email on file for the request', 'and, with no email, says the request has nowhere to go');
    lacks(none, 'mailto:', 'so no link');
    const exp = C._vendorRefLine({ vendorId: idOf(V_EXP), vendorName: 'Shore Hauling' });
    has(text(exp), 'COI expired Sep 30, 2026: ask for a renewal certificate', 'an expired certificate: the renewal ask');
    has(exp, 'href="mailto:desk%40shore.test', 'with the request addressed to the firm');
    has(text(exp), 'Request COI', 'under the one label');
    const undated = C._vendorRefLine({ vendorId: idOf(V_UNDATED), vendorName: 'Shred Co' });
    has(text(undated), 'COI on file', 'received with no expiry reads on file');
    const gone = C._vendorRefLine({ vendorId: 99, vendorName: 'Gone Vendor' });
    has(text(gone), 'Gone Vendor', 'a vendor gone from the directory still prints its name');
    lacks(gone, 'vendor-coi-flag', '⚠ and no flag: the app claims nothing about a row it cannot read');
    lacks(text(gone), 'COI', 'nothing at all about a certificate');
  }

  group('D. vendorsWithoutCoi: every vendor on the job, as the close counts them');
  {
    const idOf = (v) => coiCtx().vendorIdOf(v);
    const job = { id: 7, svc: 'cleanout',
      vendorSourcing: { La: { vendorId: idOf(V_CUR), vendorName: 'Acme Movers', status: 'Confirmed' },
                        Lb: { vendorId: idOf(V_NONE), vendorName: 'Palm Auctions', status: 'Confirmed' },
                        Lc: { vendorId: idOf(V_EXP), vendorName: 'Shore Hauling', status: 'Quote received' } },
      signedRecords: [{ id: 'r1', kind: 'pickup', ref: 'shore hauling', stableIds: [] }] };
    const C = coiCtx({ _photoRefs: { 7: [{ stableId: '7_x', label: 'inventory', disposition: 'Auction', channel: 'ocean appraisals' }] } });
    const names = C.vendorsWithoutCoi(job, TODAY).map((m) => m.name + ':' + m.state).sort();
    eq(names, ['Palm Auctions:none', 'Shore Hauling:expired'], '⚠⚠ the confirmed vendor with no certificate and the expired one named on a filed pickup list; the current one and the appraiser named on a line (current) left out');
    ok(C.vendorsWithoutCoi(job, TODAY).every((m) => m.vendorId != null), 'each carries its id');
    const C2 = coiCtx({ _photoRefs: { 7: [{ stableId: '7_x', label: 'inventory', disposition: 'Auction', channel: 'palm auctions' }] } });
    eq(C2.vendorsWithoutCoi({ id: 7, svc: 'cleanout' }, TODAY).map((m) => m.name), ['Palm Auctions'], 'a vendor named on a leaving line alone, with nothing confirmed, is on the list');
    eq(C.vendorsWithoutCoi({ id: 8, svc: 'cleanout' }, TODAY), [], 'nothing on the job: nothing');
    const C3 = coiCtx({ vendorDirectory: [] });
    eq(C3.vendorsWithoutCoi(job, TODAY), [], 'a directory not loaded: nothing claimed');
    eq(C.planVendorsMeta(7, job, {}), '1 of 2 confirmed &middot; 2 without a COI', 'the fold\'s count carries the gap');
    eq(C.planVendorsMeta(8, { id: 8 }, {}), '1 of 2 confirmed', 'and nothing when there is none');
  }

  group('E. The sourcing list names them once at the top');
  {
    const SRC_FNS = ['renderVendorSourcing', 'jobPrepLines', 'coPrepVendorLines', 'coVendorAdds', '_srcLineKey', 'esc', 'fmt', 'dirStaleNotice',
      'logisticsLinesFor', 'logisticsCatsFor', 'logisticsLineOn', '_fldBg', 'vendorPickerOptions', '_selVendorId', 'resolveJobVendor',
      'lookupVendorById', 'vendorCategoriesForSlot', 'approvedVendorsInCats', 'isActiveVendor', '_catSet', 'vendorCats', 'vendorStatusOptions',
      '_coordHrsField', 'prepLineTCHrs', 'coordHrsFor', 'coordTouches', '_vendorRefLine', 'vendorPrimaryCat', 'vendorIdOf', 'vendorStars',
      'vendorPerf', 'prepFeeRate', 'coordHrsRollup', 'vendorContacts', 'fmtPhoneDisplay', 'roundCents', 'fmtHrs', 'vendorLineHrs', 'vendorLineTCHrs',
      'vendorCoiState', '_vendorYmd', 'vendorCoiRequestMailto', 'vendorCoiLineHtml', 'vendorsWithoutCoi', '_assignedVendorsForJob', 'jobListEntries', 'fmtDate2'];
    const idOf = (v) => coiCtx().vendorIdOf(v);
    const JOB = { id: 1, svc: 'cleanout', vendorSourcing: { Lm: { vendorId: idOf(V_NONE), vendorName: 'Palm Auctions', status: 'Confirmed' }, Lh: { vendorId: idOf(V_CUR), vendorName: 'Acme Movers', status: 'Confirmed' } } };
    const EST1 = { svc: 'cleanout', vendors: [{ type: 'Auction House', cost: 0, lid: 'm', tcHrs: 3 }, { type: 'Moving', cost: 1200, lid: 'h', tcHrs: 1 }], prepItems: [], collections: [] };
    const S = sandbox({ fns: SRC_FNS, vars: ['AGR_DEPOSIT_DUE_TXT', 'PREP_FEE_BASIS_TXT', 'PREP_FEE_BASIS_SHORT', 'PREP_FEE_ONE_TXT', 'LOGISTICS_CATEGORIES', 'GROUP_JOB_MENU', 'VENDOR_GROUP_CARDS', 'PREP_FEE_RATE', '_dirStale', 'VENDOR_SLOT_CATEGORY_MAP', 'TOUCH_HRS', 'COORD_TOUCHES_BY_GROUP', 'COORD_TOUCHES', 'VENDOR_CONTACT_SLOTS', 'HAVELLIN_COI_HOLDER', 'INV_RELEASE_DISPOSITIONS'],
      stubs: { changeOrders: [], jobs: [JOB], estimateStore: {}, document: domStub({}), contractors: [], vendorDirectory: DIR, _photoRefs: {}, _todayStr: () => TODAY, saveJobs() {}, _srcAdoptLineIds: () => false, _srcPersistEstimates: () => {} } });
    const html = String(S.renderVendorSourcing(1, JOB, EST1));
    has(html, 'vendor-coi-summary', 'the summary is drawn');
    has(text(html), '⚠ 1 vendor on the job without a current certificate of insurance: Palm Auctions. Ask for it with the booking; the flag on the line offers the email.', 'naming the one vendor, singular');
    eq(count(html, 'vendor-coi-flag'), 1, 'and exactly one slot carries the flag');
    has(text(html), 'COI to Oct 1, 2027', 'the mover\'s current certificate reads on its line');
    const JOB2 = { id: 1, svc: 'cleanout', vendorSourcing: { Lh: { vendorId: idOf(V_CUR), vendorName: 'Acme Movers', status: 'Confirmed' } } };
    const S2 = sandbox({ fns: SRC_FNS, vars: ['AGR_DEPOSIT_DUE_TXT', 'PREP_FEE_BASIS_TXT', 'PREP_FEE_BASIS_SHORT', 'PREP_FEE_ONE_TXT', 'LOGISTICS_CATEGORIES', 'GROUP_JOB_MENU', 'VENDOR_GROUP_CARDS', 'PREP_FEE_RATE', '_dirStale', 'VENDOR_SLOT_CATEGORY_MAP', 'TOUCH_HRS', 'COORD_TOUCHES_BY_GROUP', 'COORD_TOUCHES', 'VENDOR_CONTACT_SLOTS', 'HAVELLIN_COI_HOLDER', 'INV_RELEASE_DISPOSITIONS'],
      stubs: { changeOrders: [], jobs: [JOB2], estimateStore: {}, document: domStub({}), contractors: [], vendorDirectory: DIR, _photoRefs: {}, _todayStr: () => TODAY, saveJobs() {}, _srcAdoptLineIds: () => false, _srcPersistEstimates: () => {} } });
    lacks(String(S2.renderVendorSourcing(1, JOB2, { svc: 'cleanout', vendors: [{ type: 'Moving', cost: 1200, lid: 'h', tcHrs: 1 }], prepItems: [], collections: [] })), 'vendor-coi-summary', 'with every certificate current, no summary');
  }

  group('F. The directory form and card: two dates, no tick');
  {
    const mapSrc = (SRC.match(/var VENDOR_FORM_MAP = \{[\s\S]*?\n\};/) || [''])[0];
    ok(mapSrc.length > 500, 'fixture: the form map (' + mapSrc.length + ')');
    has(mapSrc, "'v-coi-received':'coi_received'", 'the received date is mapped');
    has(mapSrc, "'v-coi-expires':'coi_expires'", 'and the expiry');
    const liveMap = mapSrc.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    lacks(liveMap, 'coi_on_file', '⚠ the old Yes / Pending / No tick is written by nothing');
    const liveAll = SRC.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    // 0.55 (2026-10-26): the file is about 40% line comments by size, so 0.6 sat on the line (doc-send.test.js says the same).
    ok(liveAll.length > SRC.length * 0.55, 'fixture: the comment strip kept most of the file');
    eq(count(liveAll, 'coi_on_file'), 0, 'and read by nothing');
    has(live('editVendor'), "['v-coi-received', 'v-coi-expires'].forEach(function(fid){ _setV(fid, _vendorYmd(v[VENDOR_FORM_MAP[fid]])); });", 'Edit fills the two dates as yyyy-mm-dd (a date input rejects the sheet\'s ISO datetime)');
    has(live('vendorCardHtml'), "['COI', vendorCoiState(v, _todayStr()).card]", 'the card prints the state, through the one reader');
    const C = coiCtx();
    const card = sandbox({ fns: ['_vLine', 'esc'], stubs: {} });
    has(text(card._vLine([['COI', C.vendorCoiState(V_EXP, TODAY).card]])), 'COI expired Sep 30, 2026', 'and it reads as a date, not a tick');
    const formBlock = (SRC.match(/<label>COI received[\s\S]*?id="v-coi-expires">/) || [''])[0];
    has(formBlock, '<input type="date" id="v-coi-received">', 'the form asks the received date');
    has(formBlock, '<input type="date" id="v-coi-expires">', 'and the expiry');
    eq(count(SRC, 'id="v-coi">'), 0, 'the select is gone');
  }

  group('G. The estate form: §6.1 from the catalogue, §6.2 follows the policy, §6.4 the vendors');
  {
    const A = agrCtx();
    const pro = text(A.probateAgreementHtml(PROBATE, EST));
    ok(pro.length > 20000, 'fixture: the estate form renders (' + pro.length + ')');
    has(pro, '6.1 Havellin Insurance Coverage General Liability: $[2,000,000] per occurrence / $[4,000,000] aggregate', 'GL, as applied for, in brackets');
    has(pro, 'Inland Marine / Bailee’s Coverage: $[1,000,000 to 2,500,000] for the Client’s property in Havellin’s care, custody or control, with a scheduled fine arts and collectibles endorsement on an agreed-value basis', 'the bailee\'s line with the fine arts schedule');
    has(pro, 'Professional Liability (Errors & Omissions): covering the management, cataloguing and transition services Havellin provides', 'E&O');
    has(pro, 'Commercial Auto: $[1,000,000] combined single limit, including hired and non-owned auto liability', 'auto with hired and non-owned');
    has(pro, 'Umbrella: $[5,000,000 to 10,000,000] excess liability over the coverages above', 'the umbrella');
    has(pro, 'Commercial Crime (fidelity) and Cyber: employee dishonesty and theft on client premises, covering every team member and contractor Havellin places on site; data breach', 'crime and cyber, naming the contractors on site');
    has(pro, 'Workers’ Compensation: per Florida statutory requirements', 'and comp');
    has(pro, 'Figures in brackets are the limits Havellin has applied for; the limits bound replace them, and the certificate of insurance Havellin provides on request states them.', '⚠ the note under the list, while any figure is unbound');
    ['$1,000,000 per occurrence / $2,000,000 aggregate', '$1,000,000 CSL on all company vehicles', 'Fidelity bond covering all team members and contractors on-site', 'Bonding:']
      .forEach((w) => lacks(pro, w, 'the old typed line is gone: ' + w));
    has(pro, '6.2 Havellin Liability Limits Havellin’s responsibility for loss of or damage to an item of the property’s contents caused by its negligence while the item is in its care, custody or control is measured by the item’s documented value: the appraised value where an appraisal has been obtained, otherwise the value recorded for it on the Project Records (Section 7.1) or declared by the Client in writing; and in no case exceeds $[per-item limit] for any one item or $[per-occurrence limit] for any one occurrence, the limits of the coverage stated in Section 6.1.', '⚠⚠ §6.2: documented value up to the policy\'s limits (A19)');
    has(pro, 'An item whose documented value exceeds the per-item limit is, before it is moved, either scheduled with Havellin’s insurer for this engagement on an agreed-value basis or handled and transported by a specialist vendor carrying its own coverage; Havellin names those items to the Client before work begins.', 'the items above the limit: scheduled or a specialist, named before work begins');
    has(pro, 'Jewelry, cash, negotiable instruments and original legal documents are secured with the Client, counsel or a bank at the walkthrough and before any work begins.', 'and the classes secured at the walkthrough');
    has(pro, 'Havellin is not liable for: pre-existing damage to property or items;', 'the exclusions paragraph stays');
    ['$10,000 per item', 'declared a higher value in writing prior to the engagement', 'items of extraordinary value', 'written declaration of value prior to project start']
      .forEach((w) => lacks(pro, w, 'the $10,000 cap and the declaration the client never produces are gone: ' + w));
    has(pro, '6.3 Damage Incident Protocol', '§6.3 stays');
    has(pro, '6.4 Third-Party Vendors Havellin may recommend, coordinate and schedule third-party vendors for this engagement: movers, haulers, estate sale companies, auction houses, appraisers, cleaners and trades. Each is an independent business and not an employee, partner or agent of Havellin.', '⚠⚠ §6.4: the vendors are independent');
    has(pro, 'Havellin requires every vendor it books to carry its own commercial general liability insurance, automobile liability where it drives, coverage for the Client’s property while in its custody where it takes property away, and professional liability where it appraises, and to provide a certificate of insurance before its first day on site; Havellin provides those certificates to the Client on request.', 'the certificate sentence');
    has(pro, 'Havellin does not warrant or guarantee a vendor’s work, its results, or any valuation, price or sale outcome, and is not responsible for a vendor’s acts or omissions, including loss of or damage to property while in a vendor’s custody; a claim arising from a vendor’s conduct is made against that vendor and its insurer.', 'no warranty: the misappraisal and the truck fire go to the vendor and its insurer');
    has(pro, 'the Client releases Havellin from, and will indemnify and hold Havellin harmless against, claims arising from the acts or omissions of a vendor identified in Exhibit A or otherwise selected or approved by the Client, except to the extent caused by Havellin’s gross negligence or willful misconduct.', 'release and indemnity, as the standard form\'s §11.5(b) and §11.6(c)');
    ['7.1 Documentation Media and Project Records', '7.2 Marketing & Promotional Use', '8.1 Termination by Client', '8.2 Termination by Havellin']
      .forEach((w) => has(pro, w, '⚠ the numbering the app names is untouched: ' + w));
    eq(pro.indexOf('6.4 Third-Party Vendors') > pro.indexOf('6.3 Damage Incident Protocol') && pro.indexOf('6.4 Third-Party Vendors') < pro.indexOf('Confidentiality & Privacy'), true, '§6.4 sits after §6.3 and before §7');
    lacks(live('probateAgreementHtml'), '10,000', 'the live builder carries no typed figure for the cap');
    lacks(live('probateAgreementHtml'), '1,000,000', 'nor for the coverage');
  }

  group('H. The standard form: §5.1 from the same catalogue, §6 carries the certificate sentence');
  {
    const A = agrCtx();
    const std = text(A.agreementHtml(LIVING, EST));
    ok(std.length > 15000, 'fixture: the standard form renders (' + std.length + ')');
    has(std, '5.1 Contractor Insurance. Contractor represents that it maintains: (a) General Liability, covering bodily injury and property damage; (b) Inland Marine / Bailee’s Coverage, for the Client’s property in Contractor’s care, custody or control, with a scheduled fine arts and collectibles endorsement on an agreed-value basis for items scheduled for the engagement; (c) Professional Liability (Errors & Omissions), covering the management, cataloguing and transition services Contractor provides; (d) Commercial Auto, including hired and non-owned auto liability; (e) Umbrella, excess liability over the coverages above; (f) Commercial Crime (fidelity) and Cyber, employee dishonesty and theft on client premises, covering every team member and contractor Contractor places on site; data breach; and (g) Workers’ Compensation, per Florida statutory requirements.', '⚠⚠ the seven coverages, lettered, with "and" before the last');
    lacks(std, '$[', 'and no figures: this form never carried them');
    lacks(std, 'Fidelity Bond / Employee Dishonesty Coverage for all personnel', 'the old (d) is gone');
    has(std, '6. Third-Party Vendors and No Warranty Contractor may recommend or coordinate third-party vendors. Such vendors are independent contractors and not employees, partners, or agents of Contractor. Contractor requires every vendor it books to carry its own commercial general liability insurance, automobile liability where it drives, coverage for Client’s property while in its custody where it takes property away, and professional liability where it appraises, and to provide a certificate of insurance before its first day on site; Contractor provides those certificates to Client on request. Contractor does not warrant, guarantee, or assume responsibility', 'the sentence sits inside §6, in this form\'s bare "Client"');
    has(std, '(b) acts or omissions of third-party vendors;', '§11.5(b) stays');
    has(std, '(c) acts or omissions of third-party vendors selected or approved by Client', 'and §11.6(c)');
  }

  group('I. One sentence, one catalogue: the readers');
  {
    const liveAll = SRC.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    eq(count(liveAll, 'agrVendorCoiTxt('), 3, 'agrVendorCoiTxt: its definition and two readers');
    eq(count(live('probateAgreementHtml'), 'agrVendorCoiTxt('), 1, 'the estate form once');
    eq(count(live('agreementHtml'), 'agrVendorCoiTxt('), 1, 'the standard form once');
    eq(count(liveAll, 'requires every vendor it books'), 1, 'and the sentence is written once');
    eq(count(liveAll, 'agrCoverageLines('), 3, 'agrCoverageLines: its definition and the two forms');
    eq(count(liveAll, 'insFigure('), 1 + 1 + 2, 'insFigure: its definition, agrCoverageLines\' f, and §6.2\'s two');
    const A = agrCtx();
    const bound = { glOccurrence: { value: 2000000, placeholder: 'x' }, glAggregate: { value: 4000000, placeholder: 'x' }, baileeLimit: { value: 2500000, placeholder: 'x' },
      autoCSL: { value: 1000000, placeholder: 'x' }, umbrella: { value: 5000000, placeholder: 'x' }, perItem: { value: 25000, placeholder: 'x' }, perOccurrence: { value: 250000, placeholder: 'x' } };
    eq(A.insFigure('perItem', bound), '$25,000', 'a bound figure prints as money');
    eq(A.insFigure('perItem'), '$[per-item limit]', 'an unbound one as its bracketed name');
    eq(A.insFigure('glOccurrence'), '$[2,000,000]', 'or the figure applied for');
    eq(A.insFigure('nope', bound), '', 'an unknown key prints nothing');
    eq(A.insUnbound(bound), [], 'nothing unbound once every value is set');
    eq(A.insUnbound().length, 7, 'today every one is unbound');
    eq(A.insPlaceholderNote(bound), '', 'and the note goes by itself');
    eq(A.agrCoverageLines({ figures: true }, bound)[0].text, '$2,000,000 per occurrence / $4,000,000 aggregate', 'the GL line, bound');
    eq(A.agrCoverageLines({ figures: true }, bound)[3].text, '$1,000,000 combined single limit, including hired and non-owned auto liability', 'the auto line, bound');
    eq(A.agrCoverageLines({ who: 'Contractor' }).map((c) => c.title).length, 7, 'seven coverages');
    eq(A.agrCoverageLines({ who: 'Contractor' })[1].text.indexOf('Contractor’s care'), 'for the Client’s property in '.length, 'the party\'s name is the form\'s');
  }
};
