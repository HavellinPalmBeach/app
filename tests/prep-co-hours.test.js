'use strict';
// A CHANGE ORDER CAN ADD CONCIERGE HOURS TO A HOME PREP JOB SIGNED WITH VENDORS ONLY (2026-09-25).
//
// Anthony: *"Just to confirm on home prep, you're saying that if we have a live job that only quoted
// vendors, there's no way to then add transition concierge hours … I thought we had added decluttering
// transition concierge hours to the estimate phase. But I guess you're talking about when we're in
// mid-job and we need to add hours."* Correct on every clause — and then *"Yes to 1."* to the route.
//
// THE GAP, AND WHY IT WAS STRUCTURAL. Declutter hours live on the ESTIMATE, and the estimate locks at
// signature. A prep job signed with vendors only is fee-only (estimateIsFeeOnly), so its Job Plan had
// no hours log and its final billed the 30% site management fee alone — and a change order carrying
// concierge hours was billed NOWHERE: nothing could record them and nothing charged them. The change
// order readout said so ("hours on a change order are not billed here") and both documents told the
// concierge not to promise them.
//
// THE ROUTE. An ACCEPTED change order adding concierge hours turns the job into one that bills hours:
//   · jobIsFeeOnly is the JOB's answer (the estimate plus its accepted change orders), read by the Job
//     Plan's log gate and the desk card. estimateIsFeeOnly stays the QUOTE's answer, read by every
//     document the client signed, so nothing they already hold changes.
//   · the hours log opens, the Budget & Fee card and the Hours fold measure against the authorised
//     hours, and the final bills them as logged at the concierge rate, on top of the fee.
//   · ⚠⚠ THE CHANGE ORDER STATES THE RATE. The fee-only prep agreement names no hourly rate anywhere,
//     so the readout, the acceptance panel and the printed page each carry it — the fixed-price change
//     order's reasoning, on the one engagement whose contract prices no hours. Agreement §3.3 gains a
//     carve-out naming this route and §3.8 names the Change Order (draft; in the counsel bundle).
//   · ⚠⚠ AND THEN THE AGREEMENT STATES THE RATE TOO (same day). Anthony: *"I think we should mention the
//     hourly rates in the home prep agreement."* §3.3's carve-out names the concierge rate, read from
//     agrBillingRates — the definition _coJobBasis now reads as well — so the contract and the change
//     order state one rate for one job, and the change order restates it rather than being the only
//     place it appears. The concierge rate only: the form says no specialist hours are billed.
//   · concierge hours only: the engagement has no specialists.
//   · ⚠ NO BLOCK ON AN UNLOGGED FINAL. A final whose ESTIMATE priced hours is refused with an empty log;
//     one whose hours came only from a change order is not, because no change order can be withdrawn
//     once accepted and that refusal could never be lifted if the work was not needed. The band's
//     final-invoice step and the desk card say instead that it bills the fee alone, and a large enough
//     gap still trips the ±15% manager PIN.

const { sandbox, source, fn, domStub } = require('./harness');

const noComments = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
const text = (h) => String(h).replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&times;/g, 'x')
  .replace(/&mdash;/g, '-').replace(/&rsquo;/g, '’').replace(/\s+/g, ' ').trim();

// A standalone prep estimate: $45,000 of trades and N hours of quoted decluttering — the fixture
// prep-declutter.test.js uses, so the arithmetic is the app's rather than a made-up total.
function prepEst(dcHrs, over) {
  const rate = (over && over.tcRate) || 150;
  const prepCost = 45000;
  const prepFee = Math.round(prepCost * 0.30);
  const tcFee = Math.round(dcHrs * rate);
  return Object.assign({
    jobId: 1, svc: 'prep', totTC: dcHrs, totPS: 0, tcFee: tcFee, psFee: 0,
    pkgCost: 0, smf: 0, prepFee: prepFee, prepCost: prepCost, prepEnabled: true,
    prepTCHrs: 0, declutterTCHrs: dcHrs,
    havellinTotal: tcFee + prepFee, havellinTotalFull: tcFee + prepFee,
    grandTotal: tcFee + prepFee + prepCost,
    tcRate: rate, psRate: 100, prem: false, discountPct: 0, discountAmt: 0,
    fixedPrice: false, rush: false, days: 0, psCount: 0, nps: 0,
    rooms: [], vendors: [], collections: [], vehicles: [],
    prepItems: [{ type: 'Painting', cost: 20000, note: 'interior, whole house', lid: 'p1' },
                { type: 'Landscaping', cost: 9000, note: '', lid: 'p2' },
                { type: 'Cleaning', cost: 6000, note: '', lid: 'p3' },
                { type: 'Staging', cost: 10000, note: '', lid: 'p4' }],
    preparedBy: 'Ashley Jerome', docScope: 'full'
  }, over || {});
}
const PREP_JOB = { id: 1, hvlId: 'HVL-0011', name: 'Marston', svc: 'prep',
  svcLabel: 'Home Prep for Sale', addr: '12 Seabreeze Ln', city: 'Palm Beach',
  zip: '33480', email: 'm@example.com', phone: '561-555-0100',
  tc: 'Ashley Jerome', status: 'active', start: '2026-10-05', sqft: 3500, premium: false };
// A labour job beside it, so every prep behaviour is shown not to leak onto T&M.
const EST_TM = { jobId: 1, svc: 'cleanout', totTC: 80, totPS: 60, psCount: 2, tcRate: 150, psRate: 100,
                 fixedPrice: false, rooms: [{ idx: 0, name: 'Kitchen', tcH: 40, psH: 30 }],
                 havellinTotal: 19940, tcFee: 12000, psFee: 6000, pkgCost: 1940, smf: 0, prepFee: 0,
                 discountPct: 0, rush: false, vendors: [], prepItems: [], preparedBy: 'Anthony Graziano' };
const LAB_JOB = Object.assign({}, PREP_JOB, { svc: 'cleanout', name: 'Butler Estate' });

function co(tc, extra) {
  return Object.assign({ id: 100, jobId: 1, description: 'Clear the <garage> for the painters', reason: 'scope_add',
                         tcHrs: tc, psHrs: 0, createdAt: 'Sep 25, 2026',
                         clientApproved: false, clientName: '', clientAcceptedAt: '' }, extra || {});
}
function accepted(tc, extra) {
  return co(tc, Object.assign({ clientApproved: true, clientName: 'Helen Marston',
                                clientAcceptedAt: 'September 25, 2026' }, extra || {}));
}
const CO = ['coAcceptedHours', 'coHoursTotal', 'coHours'];
const TC_LOG = (h) => (h > 0 ? [{ date: '2026-10-06', activity: 'garage',
                                   members: [{ name: 'Ashley Jerome', role: 'TC', hours: h }] }] : []);

// The change-order modal, acceptance and print sandbox — fixed-price-change-orders.test.js's list
// plus the prep readout and the save path.
const CO_FNS = ['_coJobBasis', 'coHours', 'coHoursTotal', 'coBaselineShift', 'coHoursLabel', '_coMoney', 'fmt', 'esc',
                'coPrice', 'coPriceTotal', 'coFixedTerms', 'coRateBasisTxt', 'coReasonLabel', 'estFixedFee',
                'estTolerancePctTxt', 'coBasisNoteHtml', 'updateCOHours', 'openChangeOrder', 'openCOAcceptModal',
                'closeCOAcceptModal', 'acceptChangeOrder', 'printChangeOrder', 'saveChangeOrder', '_coPriorAccepted',
                'coPriorHours', 'coNoHoursBaseTxt', 'coPrepReadoutHtml', 'prepFeeRate',
                // Lifted, never stubbed: _coJobBasis reads the rates through the definition the agreements
                // use, and a stub is exactly what would let the change order and §3.3 state two rates.
                'agrBillingRates'];
function coCtx(est, cos, seed, jobOver) {
  const dom = domStub(seed || {});
  const said = [];
  const c = sandbox({
    fns: CO_FNS, vars: ['EST_TOLERANCE_PCT', 'CO_REASONS', 'PREP_FEE_RATE'],
    stubs: {
      document: dom, setTimeout: () => 0,
      jobs: [Object.assign({}, est && est.svc === 'prep' ? PREP_JOB : LAB_JOB, jobOver || {})],
      changeOrders: cos || [],
      estimateStore: est ? { 1: { estimate: Object.assign({}, est), approved: true } } : {},
      currentEstimate: null,
      saveChangeOrders: () => {}, saveJobs: () => {}, syncJobToSheets: () => {}, renderJobs: () => {},
      showFB: (id, kind, msg) => said.push({ id, kind, msg }),
      docNames: () => ({ printTitle: 'Havellin Change Order' }),
    },
  });
  c.__dom = dom; c.__said = said;
  return c;
}

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();

  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠⚠ jobIsFeeOnly — the JOB bills hours once an ACCEPTED change order adds them');
  {
    const P = (cos) => sandbox({ fns: ['jobIsFeeOnly', 'estimateIsFeeOnly', 'estDeclutterHrs'].concat(CO),
                                 stubs: { changeOrders: cos } });
    ok(P([]).jobIsFeeOnly(prepEst(0), PREP_JOB) === true, 'a prep job signed with vendors only, no change order: bills no hours');
    ok(P([accepted(8)]).jobIsFeeOnly(prepEst(0), PREP_JOB) === false,
       '⚠⚠ an ACCEPTED change order adding concierge hours makes it a job that bills hours');
    ok(P([co(8)]).jobIsFeeOnly(prepEst(0), PREP_JOB) === true, '⚠ a draft authorises nothing — still fee-only');
    ok(P([accepted(8, { jobId: 2 })]).jobIsFeeOnly(prepEst(0), PREP_JOB) === true, 'another job’s change order does not count');
    ok(P([accepted(8, { id: 50 }), accepted(-8, { id: 60 })]).jobIsFeeOnly(prepEst(0), PREP_JOB) === true,
       'one that adds 8 hours and one that takes them back leave it fee-only — the authorised hours are zero');
    ok(P([]).jobIsFeeOnly(prepEst(5), PREP_JOB) === false, 'a prep job that QUOTED declutter hours bills hours, change order or not');
    ok(P([]).jobIsFeeOnly(EST_TM, LAB_JOB) === false, 'a labour job is never fee-only');
    ok(P([accepted(8)]).jobIsFeeOnly(prepEst(0), null) === true, 'with no job there is no change order to read — the estimate’s answer');
    ok(P([accepted(8)]).estimateIsFeeOnly(prepEst(0), PREP_JOB) === true,
       '⚠⚠ and estimateIsFeeOnly does NOT move — it answers what was QUOTED, which is what the client signed');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠⚠ WHO ASKS WHICH — the job surfaces ask the job, the documents the client signed ask the quote');
  {
    has(noComments(fn('loadJobPlanTab')), 'if (jobIsFeeOnly(est, job))', 'the Job Plan opens the hours log on the JOB’s answer');
    has(noComments(fn('planDerivedLines')), 'var feeOnly = jobIsFeeOnly(est, job);', 'the desk card’s hours line asks the job too');
    // ⚠ The documents the client already holds must keep saying what they signed. Reading the job's
    // answer there would rewrite a signed agreement's §3.3 the moment a change order was accepted.
    ['clientEstimateHtml', 'buildPrepEstimateBody', 'agreementHtml', 'invoiceHtml'].forEach((f) => {
      lacks(noComments(fn(f)), 'jobIsFeeOnly', `${f} reads what was quoted, never jobIsFeeOnly`);
    });
    // The net: the definition and the two job surfaces, and nothing else.
    const calls = noComments(src).match(/jobIsFeeOnly\(/g) || [];
    eq(calls.length, 3, 'jobIsFeeOnly( appears exactly three times — its definition, the Job Plan, the desk card');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠⚠ THE PREP JOB PLAN — the Budget & Fee card and the checklist carry the change order’s hours');
  {
    const planFns = ['renderPrepJobPlan', 'planPhaseWrap', 'secCaret', 'estDeclutterHrs', 'prepFeeRate', 'esc', 'fmtDate2',
      'chkGrid', 'planChk', '_planTaskDone', '_srcLineKey', 'jobLogEntries', 'estTolerancePctTxt', 'getJobPlan', '_planTouch',
      'firearmsBannerHtml', 'firearmsFlaggedAtIntake', '_firearmsRow', 'houseFlagsOf', 'renderCloseoutCard', 'renderCloseoutBody',
      'closeoutState', 'closeoutMeta', '_assignedVendorsForJob', 'unratedVendorsForJob', 'lookupVendorById', 'vendorIdOf',
      'bestClientEmail', '_coFmt', 'renderVendorScorecard', 'computeVendorAvg', 'coHoursLabel', '_coMoney', 'fmt'].concat(CO);
    const planVars = ['PREP_FEE_RATE', 'EST_TOLERANCE_PCT', '_planOpenPhases', 'HOUSE_FLAGS', 'FIREARMS_PROTOCOL_DOC'];
    const plan = (est, cos, loggedTC) => {
      try {
        const c = sandbox({ fns: planFns, vars: planVars, stubs: {
          jobs: [PREP_JOB], jobLogs: { 1: TC_LOG(loggedTC || 0) }, jobPlans: {}, jobPlanStore: {}, vendorDirectory: [],
          contractors: [], changeOrders: cos, estimateStore: { 1: { estimate: est } }, _photoRefs: {},
          standingFlagsBlock: () => '', _sfHost: () => '', renderVendorSourcing: () => '', document: domStub({}) } });
        return text(c.renderPrepJobPlan(1, PREP_JOB, est));
      } catch (e) { return 'THREW ' + (e && e.message); }
    };
    const a = plan(prepEst(0), [accepted(8)], 0);
    lacks(a, 'THREW', 'the prep plan renders with a change order on it');
    has(a, 'Added by change order (+8.0 concierge hrs x $150)', '⚠⚠ the card names the change order’s hours and the rate');
    has(a, '+ $1,200', 'and what they come to at the estimated hours');
    has(a, 'Logged to date 0.0 hrs', 'and what is logged against them — the row a vendors-only job never had');
    has(a, 'Declutter complete (8.0 hrs authorised, +8.0 concierge hrs by change order) - log the hours below',
        'the checklist gains the step, naming where the hours came from');
    lacks(a, 'Declutter hours quoted', 'nothing was quoted, and the card does not say otherwise');

    const none = plan(prepEst(0), [], 0);
    lacks(none, 'Added by change order', 'a vendors-only job with no change order shows none of it');
    lacks(none, 'Logged to date', 'no logged-hours row');
    lacks(none, 'Declutter complete', 'no checklist step');
    lacks(plan(prepEst(0), [co(8)], 0), 'Added by change order', '⚠ a draft change order moves nothing on the card');

    const both = plan(prepEst(5), [accepted(3)], 0);
    has(both, 'Declutter hours quoted (5.0 hrs x $150)', 'quoted hours keep their row');
    has(both, 'Added by change order (+3.0 concierge hrs x $150)', 'the change order sits under them');
    has(both, 'Declutter complete (8.0 hrs authorised, +3.0 concierge hrs by change order)', 'the authorised figure is the sum');

    // The over-threshold flag reads the AUTHORISED hours, and says what clears it.
    const over = plan(prepEst(0), [accepted(8)], 10);
    has(over, 'Logged concierge hours are more than 15% over the 8.0 authorised (quoted and by change order)',
        '⚠ 10 logged against 8 authorised is over the line');
    has(over, 'more hours need another change order they accept', 'and says what clears it');
    lacks(plan(prepEst(0), [accepted(8)], 9), 'more than 15% over', '9 against 8 is inside it');
    const quotedOver = plan(prepEst(5), [], 6);
    has(quotedOver, 'over the 5.0 quoted', 'with no change order the old wording stands');
    has(quotedOver, 'the estimate’s terms promise notice at that threshold', 'including the notice it promises');

    const prem = plan(prepEst(0, { tcRate: 185 }), [accepted(8)], 0);
    has(prem, 'x $185', 'a premium estate reads its own rate');
    has(prem, '+ $1,480', 'and prices at it');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠⚠ THE DESK CARD — an hours line appears, and says what an empty log will do');
  {
    const deskFns = ['planDerivedLines', 'planTaskCtx', 'invFiduciaryMode', 'isDecedentJob', '_planRooms', 'roomStatusNormalize',
      'firearmsFlaggedAtIntake', 'houseFlagsOf', '_jobInvRefs', '_srcLineKey', 'matterTypeOf', 'matterDef',
      'docTierOf', 'docTierDef', 'docTierProduces', 'svcHasDocStep', 'estimateIsFeeOnly', 'estDeclutterHrs', 'jobIsFeeOnly'].concat(CO);
    const deskVars = ['DECEDENT_SERVICES', 'jobPlanStore', 'TC_DONE_STATUSES', 'PS_DONE_STATUSES', 'ROOM_STATUS_META',
      'ROOM_STATUS_LEGACY', 'INV_RELEASE_DISPOSITIONS', 'FIREARMS_PROTOCOL_DOC', 'HOUSE_FLAGS', 'MATTER_TYPES',
      'DOC_TIERS', 'DOC_TIER_FROM_SCOPE', 'JOB_STEPS'];
    const line = (job, est, cos, logged) => {
      const d = sandbox({ fns: deskFns, vars: deskVars, stubs: {
        isFormalDoc: () => false, docSentAt: () => null, jobLogEntries: () => TC_LOG(logged || 0),
        stagePaidTotal: () => 0, _photoRefs: { 1: [] }, changeOrders: cos, estimateStore: { 1: { estimate: est } } } });
      return d.planDerivedLines(1, Object.assign({}, job), Object.assign({}, est), 'admin').find((l) => l.key === 'hours_logged');
    };
    ok(!line(PREP_JOB, prepEst(0), [], 0), 'a vendors-only prep job with no change order logs no hours — no line');
    ok(!line(PREP_JOB, prepEst(0), [co(8)], 0), 'a draft change order adds none either');
    const empty = line(PREP_JOB, prepEst(0), [accepted(8)], 0);
    ok(!!empty && empty.ok === false, '⚠⚠ an accepted change order brings the hours line in, open');
    eq(empty ? empty.detail : '', 'none yet — a change order added hours; log them before the final goes out, or it bills the management fee alone',
       '⚠ and it says what an empty log does HERE — not the refusal a quoted-hours job gets');
    const logged = line(PREP_JOB, prepEst(0), [accepted(8)], 8);
    ok(!!logged && logged.ok === true, 'logged, it goes green');
    eq(logged ? logged.detail : '', '8 hrs against 8 estimated — the final invoice trues to the log', 'against the authorised 8');
    // The two other empty-log states keep the refusal wording, because there the final IS refused.
    eq((line(PREP_JOB, prepEst(5), [accepted(3)], 0) || {}).detail, 'none yet — the final invoice cannot issue without them',
       'a prep job that QUOTED hours is refused with an empty log, change order or not');
    eq((line(LAB_JOB, EST_TM, [accepted(8)], 0) || {}).detail, 'none yet — the final invoice cannot issue without them',
       'and so is a labour job');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('THE HOURS FOLD AND THE HOURS SUMMARY — measured against the change order’s hours');
  {
    const meta = (est, cos) => sandbox({ fns: ['planHoursMeta', '_todayStr'].concat(CO),
      stubs: { changeOrders: cos, jobLogEntries: () => TC_LOG(3) } }).planHoursMeta(1, PREP_JOB, est);
    eq(meta(prepEst(0), [accepted(8)]).est, 8, '⚠ the fold reads "3 of 8 logged", not "3 of 0"');
    eq(meta(prepEst(0), [co(8)]).est, 0, 'a draft moves nothing');
    eq(meta(prepEst(5), [accepted(3)]).est, 8, 'quoted plus added');

    const summary = (est, cos) => {
      const dom = domStub({});
      const S = sandbox({ fns: ['updateLogSummary', 'jobLogEntries', 'hoursOverText', 'estTolerancePctTxt', 'coHoursLabel'].concat(CO),
        vars: ['EST_TOLERANCE_PCT'],
        stubs: { document: dom, jobs: [Object.assign({}, PREP_JOB)], jobLogs: { 1: TC_LOG(3) }, changeOrders: cos,
                 estimateStore: est ? { 1: { estimate: Object.assign({}, est) } } : {} } });
      S.updateLogSummary(1);
      return { tc: dom.getElementById('ls-est-tc').textContent, note: dom.getElementById('ls-co-note').textContent };
    };
    const s = summary(prepEst(0), [accepted(8)]);
    eq(s.tc, '8.0 hrs', '⚠⚠ the summary reads 8 concierge hours where it read "No estimate" over them');
    has(s.note, '+8.0 concierge hrs from 1 accepted change order', 'and says where they came from');
    eq(summary(prepEst(0), []).tc, 'No estimate', 'with no change order a vendors-only job still reads No estimate');
    eq(summary(null, [accepted(8)]).tc, 'No estimate', 'and a job with no saved estimate grows nothing from a change order');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠⚠ THE MODAL — concierge hours only, and the readout states the rate');
  {
    const p = coCtx(prepEst(0), [], { 'co-jobid': '1' });
    p.openChangeOrder(1);
    const box = p.__dom.getElementById('co-ps-hrs');
    ok(box.disabled === true, '⚠ the specialist box is off on Home Prep');
    eq(box.placeholder, 'Not used on Home Prep', 'and says why');
    const note = p.__dom.getElementById('co-basis-note').innerHTML;
    has(note, 'concierge hours for hands-on work', 'the note says what a prep change order is');
    has(note, 'at $150 an hour', 'names the rate');
    has(note, 'on top of the 30% site management fee', 'on top of the fee, read from prepFeeRate');
    has(note, 'that rate is printed on the change order the client signs', 'and that the client sees it in writing');
    has(note, 'Coordinating the vendors is covered by the fee and is never billed as hours', '⚠ the old double-charge rule survives');
    lacks(note, 'carries no price and bills nothing', 'not the T&M sentence');
    // ⚠ ONE MODAL SERVES EVERY JOB: the box left disabled by a prep job must come back on for a labour job.
    const l = coCtx(EST_TM, [], { 'co-jobid': '1', 'co-ps-hrs': { disabled: true, placeholder: 'Not used on Home Prep' } });
    l.openChangeOrder(1);
    ok(l.__dom.getElementById('co-ps-hrs').disabled === false, '⚠⚠ a labour job gets its specialist box back');
    eq(l.__dom.getElementById('co-ps-hrs').placeholder, 'e.g. 16 (negative to reduce)', 'with its own hint');
    has(l.__dom.getElementById('co-basis-note').innerHTML, 'carries no price and bills nothing', 'and the T&M note');

    const read = (est, cos, tc, over) => {
      const c = coCtx(est, cos, { 'co-jobid': '1', 'co-tc-hrs': String(tc), 'co-ps-hrs': '' }, over);
      c.updateCOHours();
      return c.__dom.getElementById('co-hrs-note').innerHTML;
    };
    const r = read(prepEst(0), [], 8);
    has(r, '+8.0 concierge hrs at $150 an hour', 'the readout states the hours and the rate');
    has(r, 'about $1,200 at the estimated hours, billed as they are worked on the final invoice', 'what that comes to, and how it bills');
    has(r, 'on top of the 30% site management fee on the prep vendors’ invoices', 'on top of the fee');
    has(r, 'This engagement priced no concierge hours; the rate is the one its agreement states in Section 3.3, and the change order prints it again',
        '⚠ a vendors-only job is told where the rate comes from — the agreement, restated on the change order');
    lacks(r, 'so the rate is printed on the change order', '⚠ never the old reason, which was true only while §3.3 stated no rate');
    lacks(r, 'not billed here', '⚠⚠ the sentence that made Anthony ask is gone');
    lacks(r, 'threshold', 'and there is no ±15% line — every addition on prep is agreed in writing first');
    has(read(prepEst(0), [accepted(8, { id: 50 })], 4), 'Concierge hours on this job go from 8.0 to 12.0',
        'a second change order starts from where the first left the job');
    has(read(prepEst(5), [], 8), 'Concierge hours on this job go from 5.0 to 13.0', 'and from quoted declutter hours');
    has(read(prepEst(5), [], -2), 'about $300 less at the estimated hours', 'a reduction says so');
    has(read(prepEst(0, { tcRate: 185 }), [], 8), '$185 an hour', 'a premium estate states its own rate');
    has(read(EST_TM, [], 10), 'hrs on the estimate becomes', 'a labour job keeps its T&M readout');
    // The same base rule off prep: an estimate that priced no hours, once a change order adds some.
    const zero = Object.assign({}, EST_TM, { totTC: 0, totPS: 0 });
    has(read(zero, [accepted(20, { id: 50 })], 8), '20.0 hrs on the estimate and 1 accepted change order becomes 28.0',
        '⚠ a labour estimate that priced no hours measures the next change order from the accepted one');
    has(read(zero, [], 8), 'the estimate for this job prices no concierge or specialist hours',
        'and with none accepted it still says there is nothing to measure against');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠ SAVING — the same rules where the record is written, so the box cannot be reached around');
  {
    // ⚠ A COPY of the list goes in: the sandbox pushes into the array it is handed, so comparing
    // against the caller's own array read every successful save as "nothing saved".
    const save = (est, cos, tc, ps) => {
      const before = (cos || []).length;
      const c = coCtx(est, (cos || []).slice(), { 'co-jobid': '1', 'co-description': 'Clear the garage', 'co-tc-hrs': String(tc),
                                  'co-ps-hrs': String(ps), 'co-reason': 'scope_add' });
      c.saveChangeOrder();
      return { saved: c.changeOrders.length - before, fb: c.__dom.getElementById('co-fb').innerHTML, last: c.changeOrders[c.changeOrders.length - 1] };
    };
    const sp = save(prepEst(0), [], 8, 4);
    eq(sp.saved, 0, '⚠ specialist hours on a prep change order are refused');
    has(sp.fb, 'Home Prep has no specialists', 'and it says why');
    const none = save(prepEst(0), [], 0, 0);
    eq(none.saved, 0, 'no concierge hours, nothing saved');
    has(none.fb, 'Enter the additional concierge hours', 'naming the one box that counts here');
    const below = save(prepEst(0), [], -2, 0);
    eq(below.saved, 0, 'a reduction below zero is refused');
    has(below.fb, 'below zero', 'and it says so');
    has(below.fb, 'there are none to reduce', 'on a vendors-only job there is nothing to take away');
    eq(save(prepEst(5), [], -2, 0).saved, 1, 'a reduction inside quoted declutter hours saves');
    const good = save(prepEst(0), [], 8, 0);
    eq(good.saved, 1, 'eight concierge hours save');
    eq(good.last && good.last.tcHrs, 8, 'as concierge hours');
    eq(good.last && good.last.psHrs, 0, 'and no specialist hours');
    ok(good.last && good.last.clientApproved === false, 'pending until the client accepts');
    eq(save(EST_TM, [], 8, 4).saved, 1, 'a labour job still takes specialist hours');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠⚠ THE ACCEPTANCE — the client agrees to a RATE, and the panel says what it is');
  {
    const p = coCtx(prepEst(0), [co(8)]);
    p.openCOAcceptModal(100);
    const s = text(p.__dom.getElementById('coa-summary').innerHTML);
    has(s, 'Rate $150 an hour, billed as worked', '⚠⚠ the panel the client types their name under states the rate');
    has(s, 'At the estimated hours about $1,200', 'and what the hours come to');
    has(s, 'on top of the 30% site management fee', 'on top of the fee');
    lacks(s, 'No charge is created', '⚠ not the T&M sentence — here the hours ARE a new charge');
    has(p.__dom.getElementById('coa-summary').innerHTML, 'Clear the &lt;garage&gt; for the painters', 'the description is escaped');
    const terms = p.__dom.getElementById('coa-terms').innerHTML;
    has(terms, 'the rate of $150 an hour at which those hours are billed', 'the acceptance sentence names the rate');
    p.__dom.getElementById('coa-co-id').value = '100';
    p.__dom.getElementById('coa-client-name').value = 'Helen Marston';
    p.acceptChangeOrder();
    const msg = p.__said.map((x) => x.msg).join(' | ');
    has(msg, 'These concierge hours bill on the final invoice at $150 an hour as they are worked', 'the confirmation states the rate');
    has(msg, 'log them on the Job Plan', 'and where to log them');
    ok(p.changeOrders[0].clientApproved === true, 'the change order is accepted');

    const t = coCtx(EST_TM, [co(8)]);
    t.openCOAcceptModal(100);
    has(t.__dom.getElementById('coa-summary').innerHTML, 'No charge is created by this change order', 'a T&M job keeps its sentence');
    lacks(t.__dom.getElementById('coa-summary').innerHTML, '$', 'and states no price');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠⚠ THE PRINTED CHANGE ORDER — the rate on the page the client signs, restating the agreement’s');
  {
    const p = coCtx(prepEst(0), [co(8)]);
    p.printChangeOrder(100);
    const d = text(p.__printed);
    has(d, 'Concierge hours on the approved estimate 0.0', 'the table opens on the estimate’s concierge hours');
    has(d, 'Revised estimated concierge hours 8.0', 'and foots in the revised hours');
    has(d, 'Rate for these hours $150 an hour, billed as worked', '⚠⚠ the rate is on the page the client signs');
    has(d, 'This change order adds concierge hours, billed at $150 an hour.', 'the sentence that makes the page honest');
    has(d, 'at the estimated hours, about $1,200', 'what they come to');
    has(d, 'in addition to the 30% site management fee on the preparation vendors’ invoices, which this change does not alter',
        'on top of the fee, which does not move');
    has(d, 'Coordinating the vendors remains covered by that fee.', 'vendor coordination is never billed as hours');
    lacks(d, 'does not itself create a charge', '⚠⚠ never the T&M sentence, which would tell this client the opposite');
    lacks(d, 'at the rates already set out in your agreement',
          '⚠ nor the T&M pointer — this page states the rate itself, and a prep job has no other hours billed "the same way"');

    const two = coCtx(prepEst(0), [accepted(8, { id: 50 }), co(4)]);
    two.printChangeOrder(100);
    has(text(two.__printed), 'Change orders already accepted +8.0 hrs', 'change order #2 names what #1 already added');
    has(text(two.__printed), 'Revised estimated concierge hours 12.0', 'and foots after both');

    const t = coCtx(EST_TM, [co(8)]);
    t.printChangeOrder(100);
    has(t.__printed, 'This change order does not itself create a charge.', 'a T&M page keeps its sentence');
    ok(!/\$\s?[\d,]/.test(t.__printed), '⚠ and a T&M change order still carries no dollar figure anywhere');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠⚠ THE FINAL INVOICE — the fee plus exactly the change-order hours logged');
  {
    const invFns = ['invoiceHtml', 'jobLogEntries', 'coHours', 'coHoursTotal', 'coBaselineShift', 'coPrice', 'coPriceTotal',
      'coHoursLabel', '_coMoney', 'fmt', 'getVendorActuals', '_srcLineKey', 'samePerson', 'canonPersonName',
      '_invVendorFeeSentence', 'prepFeeRate', 'vendorGroupOfLine', 'resolveJobVendor', 'coordHrsFor', 'prepLineTCHrs',
      'vendorLineTCHrs', 'esc', 'fmtDate2', 'svcLabelOf', 'conciergePhones', 'conciergePhonesText', 'assignedTCContact',
      'vendorCats', 'vendorPrimaryCat', 'estimateIsFeeOnly', 'estDeclutterHrs', 'isDecedentJob', 'stagePaidTotal',
      'jobPaidTotal', 'jobPayments', 'discountOnLabor', 'estTolerancePctTxt', 'estFixedFee', 'estPrepFeeOnTop'];
    const invVars = ['EST_TOLERANCE_PCT', 'SMF_PCT', 'RUSH_PCT', 'SVC_LABELS', 'DEPT_EMAILS', 'HAVELLIN_OFFICE_PHONE',
      'NON_MOBILE_NUMBERS', 'DEFAULT_CONTRACTORS', 'COORD_TOUCHES', 'COORD_TOUCHES_BY_GROUP', 'COORD_TOUCHES_DEFAULT',
      'TOUCH_HRS', 'DECEDENT_SERVICES', 'PERSON_NAME_ALIASES', 'PREP_FEE_RATE', 'invApproved'];
    // Walk the engagement stage by stage, paying each invoice in full, and return the final.
    const walk = (est, cos, loggedTC) => {
      const run = (payments, stage) => sandbox({ fns: invFns, vars: invVars, stubs: {
        jobs: [PREP_JOB], jobLogs: { 1: TC_LOG(loggedTC) },
        estimateStore: { 1: { estimate: est, approved: true, approvedBy: 'Anthony Graziano' } },
        changeOrders: cos, contractors: [], currentEstimate: null, currentInvStage: stage,
        vendorDirectory: [], jobPlans: {}, _photoRefs: {}, document: domStub({}) } })
        .invoiceHtml(Object.assign({}, PREP_JOB, { payments }), stage);
      const dep = Math.round(run([], 'deposit').amtDue);
      const p1 = [{ stage: 'deposit', amount: dep, date: '2026-10-01', method: 'wire' }];
      const mid = Math.round(run(p1, 'midpoint').amtDue);
      const fin = run(p1.concat([{ stage: 'midpoint', amount: mid, date: '2026-10-10', method: 'wire' }]), 'final');
      fin._collected = dep + mid + Math.round(fin.amtDue);
      return fin;
    };
    const f = walk(prepEst(0), [accepted(8)], 8);
    ok(!f.blocked, 'the final issues');
    eq(f._collected, 13500 + 1200, '⚠⚠ the engagement collects the $13,500 fee plus exactly the 8 logged hours at $150 — $14,700');
    has(text(f.html), 'TC 8.0 $150/hr $1,200', 'the hours sit in the hours table at the rate');
    has(f.html, 'These concierge hours are billed as they were logged, at $150 an hour', 'the change-order note says so');
    lacks(f.html, 'already included in the figures above', '⚠ not the T&M sentence, which calls them like every other hour');
    ok(!f.requiresApproval, 'on the authorised hours there is no variance to approve');

    const unlogged = walk(prepEst(0), [accepted(8)], 0);
    ok(!unlogged.blocked, '⚠⚠ an unlogged change order does NOT block the final — no change order can be withdrawn, so a refusal could never lift');
    eq(unlogged._collected, 13500, 'it bills the management fee alone, which the band and the desk card both say beforehand');
    const big = walk(prepEst(0), [accepted(20)], 0);
    ok(!big.blocked && big.requiresApproval, '⚠ but a big enough gap still trips the ±15% manager PIN — a manager looks before it goes');
    ok(walk(prepEst(5), [accepted(3)], 0).blocked, 'a prep job that QUOTED hours is still refused with an empty log — the desk card says so');
    const fee = walk(prepEst(0), [], 0);
    ok(!fee.blocked, 'and a vendors-only job with no change order finals on the fee, as always');
    eq(fee._collected, 13500, 'for the fee alone');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠⚠ THE BAND — the final-invoice step says an unlogged change order bills the fee alone');
  {
    const T = (cos) => sandbox({
      fns: ['jobTimeline', 'jobTimelineNext', 'paymentSplit', 'unscoredRoomNames', 'jobActivationBlockers', 'isJobWon',
            'isJobFunded', 'jobPayments', 'stagePaidTotal', 'depositPaidTotal', 'depositTargetFor', 'docSentAt', 'docDraftedAt',
            'docKeyFor', 'agreementSignature', 'isAgreementSigned', 'esignProviderKey', 'esignAvailable', 'esignJobWatches',
            'isAgreementSent', 'estimateIsFeeOnly', 'estDeclutterHrs'].concat(CO),
      vars: ['JT_SHORT', 'JT_NEXT', 'AGR_SIG_METHODS', 'ESIGN_PROVIDERS'],
      stubs: { changeOrders: cos } });
    const sub = (est, cos, logged, jobOver) => {
      const job = Object.assign({}, PREP_JOB, { created: 'Sep 8, 2026', won: true, approved: true }, jobOver || {});
      const rows = T(cos).jobTimeline(job, { estimate: est, approved: true }, TC_LOG(logged), cos);
      const r = rows.find((x) => x.key === 'final_invoiced');
      return r ? (r.sub || '') : 'NO ROW';
    };
    const w = sub(prepEst(0), [accepted(8)], 0);
    has(w, 'A change order added 8.0 concierge hours and none are logged', '⚠⚠ the step names the hours nobody logged');
    has(w, 'or this final bills the management fee alone', 'and what sending it now would do');
    eq(sub(prepEst(0), [accepted(8)], 8), '', 'once any are logged the step says nothing');
    eq(sub(prepEst(0), [co(8)], 0), '', 'a draft change order raises nothing');
    eq(sub(prepEst(0), [], 0), '', 'nor does a vendors-only job with no change order');
    eq(sub(EST_TM, [accepted(8)], 0), '', 'a labour job’s empty log is the invoice’s refusal to state, not this');
    eq(sub(prepEst(5), [accepted(3)], 0), '', 'and so is a quoted-hours prep job’s');
    const sent = { docState: { 'invoice:final': { sentAt: '2026-10-20', sentBy: 'Ashley', provider: 'gmail' } } };
    eq(sub(prepEst(0), [accepted(8)], 0, sent), '', 'a final already sent is past the point of saying it');
    const drafted = { docState: { 'invoice:final': { draftedAt: '2026-10-20', draftedBy: 'Ashley', provider: 'gmail' } } };
    const dw = sub(prepEst(0), [accepted(8)], 0, drafted);
    has(dw, 'none are logged', 'a drafted final still carries the warning');
    has(dw, 'Drafted — read it, send it, then confirm', 'beside the drafted line it had before');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠⚠ THE AGREEMENT — §3.3 names the route, §3.8 names the Change Order');
  {
    const DOC_FNS = ['marketingOptOutBlock', 'marketingUseParas', '_mktClause', 'estimateIsFeeOnly', 'estDeclutterHrs', 'prepFeeRate',
      'fmt', 'esc', 'fmtDate2', 'svcLabelOf', 'isDecedentJob', 'estTolerancePctTxt', 'conciergePhones', 'conciergePhonesText',
      'assignedTCContact', 'samePerson', 'canonPersonName', 'estWorkingDays', 'paymentSplit', 'fmtCEDate', '_pctWords',
      'agreementHtml', 'probateAgreementHtml', 'agrBillingRates', '_agrHasPrepVendors', '_agrScopeServices',
      '_agrProbateCompliance', '_agrMidpointTrigger', '_fixedFeeBlurb', 'estimateDocScope', 'svcHasDocStep',
      'docTierOf', 'docTierDef', 'docTierScope', 'docTierScopeMirror', 'agrSection', 'approvedEstimateFor',
      'materialsBasisNote', 'esignAnchor', 'estFixedFee', 'estPrepFeeOnTop', 'weArrangeAppraisals', 'docTierProduces',
      'docStandardEffect', 'isFormalDoc', 'gateDispute', '_gateYes', '_gate706', 'docLevelFloor', 'resolveDocLevel',
      'docLevelFloorReason'];
    const DOC_VARS = ['PREP_FEE_RATE', 'SMF_PCT', 'RUSH_PCT', 'SVC_LABELS', 'EST_TOLERANCE_PCT', 'DEPT_EMAILS',
      'HAVELLIN_OFFICE_PHONE', 'NON_MOBILE_NUMBERS', 'DEFAULT_CONTRACTORS', 'DECEDENT_SERVICES', 'PERSON_NAME_ALIASES',
      'DOC_SCOPES', 'DOC_CAPTURE_POOL_SHARE', 'JOB_STEPS', 'PRODUCTIVE_HRS_PER_DAY', 'agrApproved', 'agrApprovedBy',
      'agrApprovedAt', '_PCT_WORDS', 'ESIGN_ANCHORS', 'DOC_TIERS', 'DOC_TIER_FROM_SCOPE'];
    const A = (cos) => sandbox({ fns: DOC_FNS, vars: DOC_VARS, stubs: {
      jobs: [PREP_JOB], estimateStore: {}, jobLogs: {}, changeOrders: cos || [], contractors: [], currentEstimate: null,
      vendorDirectory: [], jobPlans: {}, _photoRefs: {}, document: domStub({}) } });
    const fee = text(A().agreementHtml(PREP_JOB, prepEst(0)));
    has(fee, 'No Transition Concierge or Property Specialist hours are billed on this engagement',
        'the fee-only §3.3 still says what the engagement is as signed');
    has(fee, 'is billed only if Client signs a Change Order under Section 3.8 stating the Transition Concierge hours',
        '⚠⚠ and names the one route to hours — a signed change order stating them');
    // (Two needles, not one: the figure is bold, and text() leaves a space where the </strong> was.)
    has(fee, "billed as worked at Contractor's Transition Concierge rate of $150/hour",
        '⚠⚠ at a rate the contract itself states, before anyone signs');
    has(fee, '/hour , in addition to the management fee', '…and on top of the fee, not inside it');
    lacks(fee, 'that states the Transition Concierge hours and the hourly rate',
          'the retired wording, which left the rate for the change order to set, is gone');
    has(fee, 'Hands-on work Contractor is asked to do after signing is documented in a written Change Order signed by both Parties',
        '⚠ §3.8 names the Change Order §3.3 points at — it never said the words');
    // ⚠ The quote does not move: an accepted change order leaves the signed agreement as it was.
    eq(text(A([accepted(8)]).agreementHtml(PREP_JOB, prepEst(0))), fee,
       '⚠⚠ an accepted change order changes nothing in the agreement — byte-identical');
    const dc = text(A().agreementHtml(PREP_JOB, prepEst(5)));
    lacks(dc, 'is billed only if Client signs a Change Order', 'the two-bases arm already states its rate — no carve-out there');
    has(dc, 'documented in a written Change Order signed by both Parties', 'but §3.8 names the Change Order on it too');
    // ⚠ Home Editing, not LAB_JOB: `cleanout` is ESTATE SETTLEMENT, a decedent service, and takes the
    // estate agreement form. The living-client form is the one prep shares, so that is the comparison.
    const HE = Object.assign({}, LAB_JOB, { svc: 'downsizing', svcLabel: 'Home Editing' });
    const lab = text(A().agreementHtml(HE, Object.assign({}, EST_TM, { svc: 'downsizing' })));
    has(lab, '3.3 Hourly and Project Rates', 'the Home Editing agreement renders its T&M §3.3');
    lacks(lab, 'Hands-on work Contractor is asked to do after signing', 'a labour agreement is untouched');
    lacks(lab, 'is billed only if Client signs a Change Order', 'on both clauses');
    has(lab, 'Property Specialist services are billed at $100/hour', 'and keeps its whole rate card');

    // ═════════════════════════════════════════════════════════════════════════
    group('⚠⚠ THE RATE — §3.3 states it before anyone signs, and it IS the change order’s rate');
    // Anthony: *"I think we should mention the hourly rates in the home prep agreement."* The first cut
    // left the rate to the change order, so the page a client signs mid-job was the first place they saw
    // one. The rate reaches the contract from agrBillingRates, the definition _coJobBasis now reads too.
    const rateOf = (t) => { const m = /Transition Concierge rate of \$(\d[\d,]*)\/hour/.exec(t);
                            return m ? Number(m[1].replace(/,/g, '')) : null; };
    eq(rateOf(fee), 150, 'a vendors-only prep agreement states the concierge rate: $150/hour');
    eq(rateOf(text(A().agreementHtml(PREP_JOB, prepEst(0, { tcRate: 185 })))), 185, 'a premium estimate states its own $185');
    eq(rateOf(text(A().agreementHtml(PREP_JOB, prepEst(0, { tcRate: 165 })))), 165,
       '⚠ READ off the estimate, never assumed: an unusual rate comes through as it was priced');
    eq(rateOf(text(A().agreementHtml(PREP_JOB, null))), 150, 'the blank template (no estimate yet) states the standard rate');
    eq(rateOf(text(A().agreementHtml(Object.assign({}, PREP_JOB, { premium: true }), null))), 185,
       'and a premium job’s blank template states the premium one');
    has(dc, 'Transition Concierge services at $150/hour', 'the two-bases arm already stated it, and still does');
    // ⚠ THE CONCIERGE RATE ONLY. The form says in bold that no specialist hours are billed, and a prep
    // change order refuses them — a specialist rate on this contract would price work it rules out.
    [prepEst(0), prepEst(5), prepEst(0, { tcRate: 185, psRate: 125 })].forEach((e, i) => {
      const t = text(A().agreementHtml(PREP_JOB, e));
      lacks(t, 'Property Specialist services are billed at', `⚠ no specialist rate on a prep form (case ${i})`);
      lacks(t, '$' + e.psRate + '/hour', `nor the specialist figure itself (case ${i})`);
    });

    // ⚠⚠ THE JOIN — the contract, the readout and the printed change order state ONE rate for one job.
    // Driven off the same estimate through each real renderer; a copy of the rule on either side fails.
    [[150, {}], [185, {}], [165, {}], [185, { premium: true }]].forEach(([r, jobOver], i) => {
      const e = jobOver.premium ? prepEst(0, { tcRate: 0 }) : prepEst(0, { tcRate: r });
      const job = Object.assign({}, PREP_JOB, jobOver);
      const agr = rateOf(text(A().agreementHtml(job, e)));
      const rc = coCtx(e, [], { 'co-jobid': '1', 'co-tc-hrs': '8', 'co-ps-hrs': '' }, jobOver);
      rc.updateCOHours();
      const rd = /concierge hrs at \$(\d[\d,]*) an hour/.exec(text(rc.__dom.getElementById('co-hrs-note').innerHTML));
      const pc = coCtx(e, [co(8)], {}, jobOver);
      pc.printChangeOrder(100);
      const pr = /Rate for these hours \$(\d[\d,]*) an hour/.exec(text(pc.__printed));
      eq(agr, r, `the agreement states $${r}/hour (case ${i})`);
      eq(rd ? Number(rd[1]) : null, agr, `⚠⚠ the modal readout states the agreement’s rate (case ${i})`);
      eq(pr ? Number(pr[1]) : null, agr, `⚠⚠ and so does the page the client signs (case ${i})`);
    });
    const cjb = noComments(fn('_coJobBasis'));
    has(cjb, 'agrBillingRates(job, est)', '_coJobBasis reads the one rate definition the agreements read');
    lacks(cjb, '185 : 150', '⚠ and keeps no third copy of the fallback');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('the retired sentence and the retired branch are gone');
  {
    lacks(noComments(src), 'hours on a change order are not billed here', '⚠ "not billed here" survives nowhere in live code');
    lacks(noComments(fn('coNoHoursBaseTxt')), "'prep'", 'coNoHoursBaseTxt has no prep arm — prep reads coPrepReadoutHtml');
    has(noComments(fn('updateCOHours')), 'if (b.prep) {', 'the modal branches on the basis');
    has(noComments(fn('_coJobBasis')), "prep: ((est && est.svc) || (job && job.svc)) === 'prep'", 'the basis carries prep, estimate first');
  }
};
