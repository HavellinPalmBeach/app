'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// DECLUTTER HOURS ON A HOME PREP ENGAGEMENT (2026-09-14)
//
// Anthony: *"we could walk into a home where they said they wanted us to prep for sale, and we
// could figure out it's a complete mess … it would likely just be Ashley as the TC coming in,
// spending four or five hours cleaning out the house while she's also orchestrating painters."*
//
// ⚠⚠ THE ALTERNATIVE — re-type the job as Home Editing and score the four messy rooms — WAS
// MEASURED AND REJECTED. `interiorLoad = sqft * ENGINE_K * volFactor` anchors on TOTAL under-air
// sqft, and marking the other rooms ✕ out of scope drops them from the volume AVERAGE without
// shrinking the sqft. Driven on the real computeEngineV3 on a 3,500 sqft house: 4 rooms scored
// gives TC 25 / PS 52 and the whole 12-room interior gives TC 24 / PS 52 — the same $8,950 for a
// light declutter as for editing the entire house. There is no room-scoring path that expresses
// half a day in four rooms. That measurement is reproduced below as a test, because it is the
// reason this feature is an INPUT rather than a derivation and somebody will propose the
// re-type again.
//
// The load-bearing half is that a prep job booking hours STOPS BEING FEE-ONLY, and three
// client-facing surfaces state the opposite in so many words.
// ─────────────────────────────────────────────────────────────────────────────

const { fn, sandbox, domStub, source } = require('./harness');

const DOC_FNS = ['marketingOptOutBlock', 'marketingUseParas', '_mktClause', 'estimateIsFeeOnly', 'estDeclutterHrs', 'prepFeeRate', 'fmt', 'esc', 'fmtDate2',
  'svcLabelOf', 'isDecedentJob', 'estTolerancePctTxt', 'conciergePhones', 'conciergePhonesText',
  'assignedTCContact', 'samePerson', 'canonPersonName', 'estWorkingDays', 'paymentSplit',
  'clientEstimateHtml', 'buildPrepEstimateBody', 'clientJobPlanSection', '_cePhases',
  'vendorEstimateNote', 'vendorFeeNote', 'materialsBasisNote', 'proposedPlanRow',
  'estimateDocScope', 'svcHasDocStep', 'fmtCEDate', '_pctWords', 'agreementHtml', 'probateAgreementHtml',
  'agrBillingRates', '_agrHasPrepVendors', '_agrScopeServices', '_agrProbateCompliance',
  '_agrMidpointTrigger', '_fixedFeeBlurb', 'docStandardEffect', 'isFormalDoc', 'gateDispute',
  '_gateYes', '_gate706', 'docLevelFloor', 'resolveDocLevel', 'docLevelFloorReason',
  'agrSection', 'approvedEstimateFor', 'materialsBasisNote', 'esignAnchor'];
const DOC_VARS = ['PREP_FEE_RATE', 'SMF_PCT', 'RUSH_PCT', 'SVC_LABELS', 'EST_TOLERANCE_PCT',
  'DEPT_EMAILS', 'HAVELLIN_OFFICE_PHONE', 'NON_MOBILE_NUMBERS', 'DEFAULT_CONTRACTORS',
  'DECEDENT_SERVICES', 'PERSON_NAME_ALIASES', 'DOC_SCOPES', 'DOC_CAPTURE_POOL_SHARE',
  'JOB_STEPS', 'PRODUCTIVE_HRS_PER_DAY', 'agrApproved', 'agrApprovedBy', 'agrApprovedAt', '_PCT_WORDS', 'ESIGN_ANCHORS'];

const text = (h) => String(h).replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&')
                             .replace(/&times;/g, 'x').replace(/&mdash;/g, '-')
                             .replace(/\s+/g, ' ').trim();

// A standalone prep estimate: $45,000 of trades, and N hours of concierge decluttering.
// havellinTotal is what calcAll produces — tcFee + psFee + pkgCost + smf + prepFee — so the
// fixtures carry the arithmetic the app would have produced rather than a made-up total.
function prepEst(dcHrs, over) {
  const rate = 150;
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
    prepItems: [{ type: 'Painting', cost: 20000, note: 'interior, whole house' },
                { type: 'Landscaping', cost: 9000, note: '' },
                { type: 'Cleaning', cost: 6000, note: '' },
                { type: 'Staging', cost: 10000, note: '' }],
    preparedBy: 'Ashley Jerome', docScope: 'full'
  }, over || {});
}
const PREP_JOB = { id: 1, hvlId: 'HVL-0011', name: 'Marston', svc: 'prep',
  svcLabel: 'Home Prep for Sale', addr: '12 Seabreeze Ln', city: 'Palm Beach',
  zip: '33480', email: 'm@example.com', phone: '561-555-0100',
  tc: 'Ashley Jerome', status: 'active', start: '2026-10-05', sqft: 3500 };

function docCtx(extra) {
  return sandbox({ fns: DOC_FNS, vars: DOC_VARS, stubs: Object.assign({
    jobs: [PREP_JOB], estimateStore: {}, jobLogs: {}, changeOrders: [], contractors: [],
    currentEstimate: null, vendorDirectory: [], jobPlans: {}, _photoRefs: {},
    document: domStub({}) }, extra || {}) });
}

module.exports = function ({ group, ok, eq, has, lacks }) {

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ WHY THIS IS AN INPUT: the engine cannot express "four rooms" at all');
  {
    const e = sandbox({
      fns: ['computeEngineV3', 'effectiveJobSteps', 'engineRoomWeight', 'engineIsExterior',
            'tenureMultiplier', 'docScopeDef'],
      vars: ['JOB_STEPS', 'ENGINE_K', 'ENGINE_VOLF', 'ENGINE_CPXF', 'ENGINE_CAREFUL',
             'ENGINE_ROOMLEVEL', 'ENGINE_FLOOR', 'PERROOM_REF', 'ROOMS', 'EXTERIOR_ROOMS',
             'ROOM_WEIGHT', 'DOC_SCOPES', 'DOC_CAPTURE_POOL_SHARE'] });
    const R = (n, v, c) => ({ name: n, vol: v, cplx: c });
    const four = [R('Living Room', 3, 3), R('Primary Bedroom', 3, 3), R('Dining Room', 3, 3), R('Kitchen', 3, 3)];
    const whole = four.concat([R('Family Room', 3, 3), R('Bedroom 2', 3, 3), R('Bedroom 3', 3, 3),
      R('Primary Bath', 2, 2), R('Full Bath', 2, 2), R('Half Bath', 1, 1),
      R('Laundry', 1, 1), R('Garage (2-car)', 3, 3)]);
    const a = e.computeEngineV3(3500, four, 'downsizing', 2, 10, 'full');
    const b = e.computeEngineV3(3500, whole, 'downsizing', 2, 10, 'full');
    // ⚠ THE ASSERTION IS THAT THEY BARELY MOVE. Scoring a third of the house prices within a
    // couple of concierge hours of scoring all of it, because the sqft is the backbone and the
    // excluded rooms never reach the engine (calcAll pushes only `st === 'in'` rooms).
    ok(Math.abs(a.totPS - b.totPS) <= 1,
       'four rooms and the whole interior price the SAME specialist hours (' + a.totPS + ' vs ' + b.totPS + ') — the sqft is the backbone');
    ok(Math.abs(a.totTC - b.totTC) <= 2,
       'and within two concierge hours (' + a.totTC + ' vs ' + b.totTC + ')');
    ok(a.totTC * 150 + a.totPS * 100 > 6000,
       'so a "light declutter" priced through the room grid lands over $6,000 — which is why declutter hours are typed, not derived');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('the accessor refuses on every service but prep — the stale-field leak guard');
  {
    const mk = (svc, val) => {
      const ctx = sandbox({ fns: ['getDeclutterTCHrs', 'currentSvc'], vars: ['DECLUTTER_MAX_HRS'],
        stubs: { document: domStub({ 'e-svc': svc, 'e-declutter-hrs': val }) } });
      return ctx.getDeclutterTCHrs();
    };
    eq(mk('prep', '5'), 5, 'a prep job reads the field');
    eq(mk('prep', '4.5'), 4.5, 'to the half hour');
    // ⚠ THE CARD IS HIDDEN ON A LABOUR JOB, NOT EMPTIED, so the value survives a re-type. Without
    // this guard those hours would be ADDED to a Home Editing job whose engine already priced its
    // own concierge time — invisibly, because they land inside totTC beside the engine's.
    eq(mk('downsizing', '5'), 0, 'Home Editing reads 0 even with a value left in the field');
    eq(mk('cleanout', '5'), 0, 'so does Estate Settlement');
    eq(mk('home_cleanout', '12'), 0, 'and Home Cleanout');
    eq(mk('prep', ''), 0, 'a blank field is 0, not NaN');
    eq(mk('prep', '-3'), 0, 'and so is a negative');
    eq(mk('prep', '999'), 40, 'clamped at DECLUTTER_MAX_HRS — this is a declutter, not a cleanout');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ A PREP JOB THAT BOOKS HOURS IS NOT FEE-ONLY — the load-bearing predicate');
  {
    const c = docCtx();
    ok(c.estimateIsFeeOnly(prepEst(0), PREP_JOB), 'no declutter hours → fee-only, as before');
    ok(!c.estimateIsFeeOnly(prepEst(5), PREP_JOB), '5 declutter hours → NOT fee-only');
    ok(!c.estimateIsFeeOnly(prepEst(0.5), PREP_JOB), 'half an hour is enough to flip it');
    // ⚠ THE BLANK TEMPLATE MUST STAY FEE-ONLY. agreementHtml runs with no estimate before one is
    // built, and that form has to print the management-fee clause rather than an hourly rate card.
    ok(c.estimateIsFeeOnly(null, PREP_JOB), 'a prep job with NO estimate is still fee-only');
    // the non-prep arm is untouched
    ok(c.estimateIsFeeOnly({ svc: 'downsizing', totTC: 0, totPS: 0 }, { svc: 'downsizing' }),
       'a labour job that priced no hours is still fee-only by the second arm');
    ok(!c.estimateIsFeeOnly({ svc: 'downsizing', totTC: 40, totPS: 60 }, { svc: 'downsizing' }),
       'and an ordinary Home Editing job is not');
    eq(c.estDeclutterHrs(prepEst(5)), 5, 'estDeclutterHrs reads the snapshot');
    eq(c.estDeclutterHrs({ svc: 'prep' }), 0, 'an estimate saved before 2026-09-14 has no field and reads 0');
    eq(c.estDeclutterHrs(null), 0, 'and null is 0 rather than a throw');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ ONE DEFINITION — the invoice no longer keeps its own copy of the fee-only test');
  {
    const inv = fn('invoiceHtml');
    has(inv, 'estimateIsFeeOnly(est, job)', 'invoiceHtml asks the shared predicate');
    // The copy it replaced. Reverting to it is green on every test that drives the predicate
    // alone, which is exactly why this asserts its ABSENCE at source.
    lacks(inv, "((est && est.svc) || job.svc) === 'prep') ||",
          'and keeps no inline copy that could drift from it');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('the client estimate itemises the labour, and the column adds up');
  {
    const c = docCtx();
    const withH = c.clientEstimateHtml(prepEst(5), PREP_JOB);
    const noH   = c.clientEstimateHtml(prepEst(0), PREP_JOB);
    const tW = text(withH), tN = text(noH);

    has(tW, 'Pre-prep declutter', 'the labour row prints');
    has(tW, '5.0 hrs x $150', 'naming the hours and the rate');
    has(tW, '$750', 'and the money');
    has(tW, '$13,500', 'the management fee is still its own row');
    // ⚠⚠ THE RECONCILIATION. havellinTotal is tcFee + prepFee = 750 + 13,500; a table printing the
    // fee alone above that subtotal visibly fails to add up on the document the client accepts.
    has(tW, '$14,250', 'and Havellin Services Total is the SUM of the two, not the fee alone');
    lacks(tN, 'Pre-prep declutter', 'a pure vendor-management prep job carries no labour row');
    has(tN, '$13,500', 'and its services total is the fee alone');

    // Terms — the three-way branch.
    has(tN, 'It is not billed hourly', 'with no hours the fee-only Terms still print');
    lacks(tW, 'It is not billed hourly', 'with hours that sentence is gone');
    has(tW, 'Havellin is paid on two bases', 'and the Terms name both bases');
    has(tW, 'concierge hours at $150/hour', 'the hourly one at the rate the estimate priced');
    has(tW, '30% management fee on actual vendor spend', 'and the fee one');
    has(tW, 'exceed the estimate by more than 15%', 'the notice threshold reaches prep for the first time');
    // ⚠ THE PLAIN T&M ARM IS WRONG ON PREP AND MUST NOT BE WHAT IT FALLS THROUGH TO. It promises
    // that vendor coordination bills hourly — on the one engagement where the 30% fee covers
    // exactly that — and closes with a moving-materials basis note on a job that has no package.
    lacks(tW, 'billed hourly like all other concierge time',
          'it does NOT fall through to the T&M arm, which would double-charge vendor coordination');
    lacks(tW, 'Moving materials', 'nor print a materials basis note on an engagement with no package');
    has(tW, 'Every vendor quote is reviewed with you before the vendor is booked',
        'and it keeps the prep-specific vendor-review promise');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ the payment milestones follow the SERVICE, never the fee-only test');
  {
    const c = docCtx();
    const tW = text(c.clientEstimateHtml(prepEst(5), PREP_JOB));
    const tN = text(c.clientEstimateHtml(prepEst(0), PREP_JOB));
    // A prep job has no "project midpoint" whatever its labour looks like — the vendors invoice
    // the client directly and there are no phases to sit between. Keyed on _isFeeOnlyEst, the
    // hours version would have printed an event that does not exist on it, and disagreed with
    // agreement §3.2 on one staple. That exact defect was fixed on 2026-09-11 and this is the
    // line it would have come back through.
    has(tN, 'Due once the vendor schedule is booked', 'no hours: the vendor-schedule milestone');
    has(tW, 'Due once the vendor schedule is booked', 'WITH hours: the same milestone');
    lacks(tW, 'Due at project midpoint', 'and never "project midpoint", which does not exist on prep');
    has(tW, 'Due at show-ready handover', 'the final milestone is the handover either way');
    // the caption has to name what the percentage is charged on
    has(tN, 'Management fee only', 'no hours: the caption says management fee only');
    has(tW, 'Management fee + concierge hours', 'with hours it names both');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ the AGREEMENT — a signed contract cannot say "no hours are billed" over hours');
  {
    const c = docCtx();
    const aW = text(c.agreementHtml(PREP_JOB, prepEst(5)));
    const aN = text(c.agreementHtml(PREP_JOB, prepEst(0)));
    const aBlank = text(c.agreementHtml(PREP_JOB, null));

    has(aN, 'No Transition Concierge or Property Specialist hours are billed on this engagement',
        'with no hours §3.3 keeps the fee-only clause');
    lacks(aW, 'No Transition Concierge or Property Specialist hours are billed',
        '⚠ with hours that clause is GONE — Exhibit A prices those very hours on its face');
    has(aW, 'Contractor is paid on two bases for this engagement', 'and §3.3 states both');
    has(aW, 'Transition Concierge services at $150/hour', 'at the rate the estimate priced');
    has(aW, '5.0 hours', 'naming the hours the Estimate provides for');
    has(aW, '$750', 'and the amount');
    // ⚠ THE SPECIALIST HALF SURVIVES BECAUSE IT STAYS TRUE — calcAll holds totPS at zero on prep.
    has(aW, 'No Property Specialist hours are billed on this engagement',
        'the specialist half of the old clause survives, because it is still true');
    // §1.2 and §3.8
    // ⚠ THIS NEEDLE MATCHED §3.3 ON THE FIRST PASS AND THE §1.2 REVERT CAME BACK GREEN.
    // Both clauses carry the phrase "hands-on decluttering and clearing of the Property", so a
    // bare search proved only that ONE of them was present. Pinned on §1.2's own surrounding
    // words instead. Fourth time this repo records a needle matching its neighbour.
    has(aW, 'Where the Estimate provides for it, Contractor also performs hands-on decluttering',
        '§1.2 names the second service in its own words');
    has(aW, 'billed hourly as set out in Section 3.3', 'and points at the clause that prices it');
    lacks(aN, 'Where the Estimate provides for it, Contractor also performs',
        'and says none of it on a fee-only engagement');
    has(aW, 'exceed the hours stated in the Estimate by more than 15%',
        '§3.8 carries the notice threshold, which reaches prep for the first time');
    lacks(aN, 'exceed the hours stated in the Estimate', 'and does not where there are no hours to exceed');
    // the blank template is the state that must keep the old form
    has(aBlank, 'No Transition Concierge or Property Specialist hours are billed on this engagement',
        'a blank template (no estimate yet) still prints the fee-only clause');
    // and the hourly rate card must never come back on prep
    lacks(aW, 'Property Specialist services are billed at',
        'the full hourly rate card stays off the prep form — that was the 2026-09-11 defect');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('the INVOICE bills the hours, and gates on them');
  {
    const invFns = ['invoiceHtml', 'jobLogEntries', 'coHours', 'coHoursTotal', 'coBaselineShift',
      'coHoursLabel', '_coMoney', 'fmt', 'getVendorActuals', '_srcLineKey', 'samePerson',
      'canonPersonName', '_invVendorFeeSentence', 'prepFeeRate', 'vendorGroupOfLine',
      'resolveJobVendor', 'coordHrsFor', 'prepLineTCHrs', 'vendorLineTCHrs', 'esc', 'fmtDate2',
      'svcLabelOf', 'conciergePhones', 'conciergePhonesText', 'assignedTCContact', 'vendorCats',
      'vendorPrimaryCat', 'estimateIsFeeOnly', 'estDeclutterHrs', 'isDecedentJob', 'stagePaidTotal',
      'jobPaidTotal', 'jobPayments', 'discountOnLabor', 'estTolerancePctTxt'];
    const invVars = ['EST_TOLERANCE_PCT', 'SMF_PCT', 'RUSH_PCT', 'SVC_LABELS', 'DEPT_EMAILS',
      'HAVELLIN_OFFICE_PHONE', 'NON_MOBILE_NUMBERS', 'DEFAULT_CONTRACTORS', 'COORD_TOUCHES',
      'COORD_TOUCHES_BY_GROUP', 'COORD_TOUCHES_DEFAULT', 'TOUCH_HRS', 'DECEDENT_SERVICES',
      'PERSON_NAME_ALIASES', 'PREP_FEE_RATE', 'invApproved'];
    const mkInv = (dcHrs, loggedTC, stage) => {
      const est = prepEst(dcHrs);
      const logs = loggedTC > 0
        ? { 1: [{ date: '2026-10-06', activity: 'declutter', members: [
              { name: 'Ashley Jerome', role: 'TC', hours: loggedTC }] }] }
        : { 1: [] };
      const ctx = sandbox({ fns: invFns, vars: invVars, stubs: {
        jobs: [PREP_JOB], jobLogs: logs,
        estimateStore: { 1: { estimate: est, approved: true, approvedBy: 'Anthony Graziano' } },
        changeOrders: [], contractors: [], currentEstimate: null, currentInvStage: stage,
        vendorDirectory: [], jobPlans: {}, _photoRefs: {}, document: domStub({}) } });
      return ctx.invoiceHtml(Object.assign({}, PREP_JOB,
        { payments: [{ stage: 'deposit', amount: 7125, date: '2026-10-01', method: 'wire' }] }), stage);
    };

    const dep = mkInv(5, 0, 'deposit');
    // deposit is 50% of havellinTotal = 50% of 14,250
    has(text(dep.html), '$7,125', 'the deposit is 50% of the fee AND the hours, not of the fee alone');
    ok(!dep.blocked, 'and a deposit invoice is never blocked');

    // ⚠ THE FINAL IS CORRECTLY BLOCKED WHEN THE HOURS WERE QUOTED AND NEVER LOGGED. The final
    // trues labour to the log, so an empty log would bill $0 for work somebody did. The escape
    // is to log the hours, which the Job Plan now allows.
    const finNoLog = mkInv(5, 0, 'final');
    ok(finNoLog.blocked, 'a final with quoted hours and an empty log is BLOCKED');
    const finLogged = mkInv(5, 5, 'final');
    ok(!finLogged.blocked, 'and passes once the hours are logged');
    has(text(finLogged.html), '$750', 'billing the concierge time at the logged hours');

    // the pure fee-only prep job is untouched — it must still final with an empty log
    const feeOnlyFinal = mkInv(0, 0, 'final');
    ok(!feeOnlyFinal.blocked,
       '⚠ a prep job that priced NO hours still finals with an empty log — blocking it would be an inescapable dead end');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ the JOB PLAN opens the hours log exactly when the estimate quoted hours');
  {
    const body = fn('loadJobPlanTab');
    has(body, 'estDeclutterHrs(est)', 'the plan asks what the estimate priced');
    has(body, '_prepDcHrs === 0', 'and hides the log only when it priced none');
    // ⚠ IT FALLS THROUGH to the shared wiring rather than repeating it. A prep branch with its own
    // copy of the log setup is how the two forms come to disagree about which job they write to.
    has(body, 'content.innerHTML = renderPrepJobPlan(jobId, job, est);', 'it renders the prep plan');
    const afterPrep = body.slice(body.indexOf('_isPrepPlan'));
    has(afterPrep, 'buildLogTeamRows();', 'and reaches the shared team-row wiring');
    has(afterPrep, "logJobEl.value = jobId", 'which is what points the form at this job');
    // quoting hours nobody can log is worse than not quoting them
    lacks(body, "if (job.svc === 'prep') {\n    var logSectionP",
          'the unconditional hide is gone');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ prep prices NO specialists, so the team gate cannot demand any');
  {
    const ctx = sandbox({ fns: ['plannedPSCount'], vars: [], stubs: {
      jobs: [PREP_JOB, { id: 2, svc: 'downsizing' }],
      estimateStore: { 1: { estimate: prepEst(5) }, 2: { estimate: { svc: 'downsizing', psCount: 3 } } },
      document: domStub({}) } });
    // ⚠ psCount is read off `ps-crew-size`, a select merely HIDDEN on prep that still reads "2",
    // so every prep estimate carries psCount 2. Inert while the prep plan had no hours log; the
    // moment one opened it would have rendered two specialist rows on a one-person engagement AND
    // made confirmJobTeam demand two names through unfilledPlannedPS — an unsatisfiable gate.
    eq(ctx.plannedPSCount(1, { ps: [] }), 0, 'a prep job plans ZERO specialists');
    eq(ctx.plannedPSCount(1, { ps: [{ name: '' }, { name: '' }] }), 0,
       'even with empty seeded slots on the crew record');
    eq(ctx.plannedPSCount(1, { ps: [{ name: 'Maria Delgado' }] }), 1,
       '⚠ but a specialist genuinely added beyond plan keeps their row');
    eq(ctx.plannedPSCount(2, { ps: [] }), 3, 'and a Home Editing job is untouched');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('the prep Job Plan shows the concierge what they are working against');
  {
    // ⚠ standingFlagsBlock AND renderVendorSourcing ARE STUBBED, AND NOTHING HERE ASSERTS ON
    // THEIR OUTPUT. Both drag in large unrelated trees (the whole HOUSE_FLAGS catalogue, the
    // vendor directory and the sourcing map); this group is about the Budget & Fee card and the
    // checklist, which renderPrepJobPlan builds inline. The two are pinned as REAL functions
    // below so a rename cannot leave a stub quietly standing in for something that no longer
    // exists — the trap CLAUDE.md records costing the `&amp;amp;` defect a whole round.
    ok(typeof fn('standingFlagsBlock') === 'string', 'standingFlagsBlock is real (stubbed here only)');
    ok(typeof fn('renderVendorSourcing') === 'string', 'renderVendorSourcing is real (stubbed here only)');
    const planFns = ['renderPrepJobPlan', 'estDeclutterHrs', 'prepFeeRate', 'esc', 'fmtDate2',
      'chkGrid', 'planChk', '_planTaskDone', '_srcLineKey', 'jobLogEntries', 'estTolerancePctTxt', 'getJobPlan',
      '_planTouch'];
    const planVars = ['PREP_FEE_RATE', 'EST_TOLERANCE_PCT'];
    const mkPlan = (dcHrs, loggedTC) => {
      const logs = loggedTC > 0
        ? { 1: [{ date: '2026-10-06', activity: 'declutter',
                  members: [{ name: 'Ashley Jerome', role: 'TC', hours: loggedTC }] }] }
        : { 1: [] };
      let ctx;
      try {
        ctx = sandbox({ fns: planFns, vars: planVars, stubs: {
          jobs: [PREP_JOB], jobLogs: logs, jobPlans: {}, jobPlanStore: {}, vendorDirectory: [], contractors: [],
          estimateStore: { 1: { estimate: prepEst(dcHrs) } }, _photoRefs: {},
          standingFlagsBlock: () => '', _sfHost: () => '', renderVendorSourcing: () => '',
          document: domStub({}) } });
      } catch (err) { return { err: String(err.message || err) }; }
      try { return { html: ctx.renderPrepJobPlan(1, PREP_JOB, prepEst(dcHrs)) }; }
      catch (err) { return { err: String(err.message || err) }; }
    };
    const a = mkPlan(5, 0);
    ok(!a.err, 'the prep plan renders' + (a.err ? ' — ' + a.err : ''));
    if (!a.err) {
      const t = text(a.html);
      has(t, 'Declutter hours quoted', 'the Budget & Fee card carries the quoted hours');
      has(t, '5.0 hrs x $150', 'with the rate');
      has(t, 'Logged to date', 'and what has been logged against them');
      has(t, 'Pre-prep declutter complete', 'and the checklist gains a step for it');
      const n = text(mkPlan(0, 0).html);
      lacks(n, 'Declutter hours quoted', 'a pure vendor-management job shows none of it');
      lacks(n, 'Pre-prep declutter complete', 'nor the checklist step');
      // the over-threshold flag
      const over = text(mkPlan(5, 9).html);
      has(over, 'more than 15% over', 'logging well past the quote raises the notice flag');
      const under = text(mkPlan(5, 5).html);
      lacks(under, 'more than 15% over', 'and logging on plan does not');
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // ⚠⚠ THESE FIVE CAME BACK GREEN ON THE FIRST REVERT SWEEP AND EVERY ONE WAS A REAL GAP:
  // each check above drove a DERIVATION or a DOCUMENT and nothing drove the FORM. Breaking the
  // card's display toggle, the fee row, the job-switch clear and the reopen all changed nothing
  // any test could see — and those four are the difference between a control that exists and a
  // control somebody can use. Same shape this file's project notes record five times over.
  group('⚠ THE FORM ITSELF — driven, because the first sweep proved none of it');
  {
    // ⚠ renderVendorGroupCards is STUBBED and nothing here asserts on it: it rebuilds the whole
    // vendor card SET and drags in the directory tree, and this group is about the declutter card
    // and the fee row. Pinned as a real function so a rename cannot leave the stub standing in for
    // something that no longer exists.
    ok(typeof fn('renderVendorGroupCards') === 'string', 'renderVendorGroupCards is real (stubbed here only)');
    const modeFns = ['applyEstimateServiceMode', 'getDeclutterTCHrs', 'currentSvc', 'prepFeeRate'];
    const modeVars = ['DECLUTTER_MAX_HRS', 'PREP_FEE_RATE', '_vgrpPrepMode'];
    const mode = (svc, hrs) => {
      const doc = domStub({ 'e-svc': svc, 'e-declutter-hrs': hrs });
      const ctx = sandbox({ fns: modeFns, vars: modeVars,
        stubs: { document: doc, renderVendorGroupCards: () => {} } });
      ctx.applyEstimateServiceMode(svc === 'prep');
      return doc;
    };
    // the card is prep-only
    eq(mode('prep', '5').getElementById('est-declutter-card').style.display, '',
       'the declutter card is SHOWN on a prep job');
    eq(mode('downsizing', '5').getElementById('est-declutter-card').style.display, 'none',
       'and HIDDEN on Home Editing — it is the one place prep can book labour');
    // ⚠ the fee row: a grand total with an invisible component in it is how a client document
    // stops adding up. It is off the blanket hide list for exactly this.
    eq(mode('prep', '5').getElementById('s-tc-fee-row').style.display, '',
       'the concierge fee row SHOWS on a prep job that booked hours');
    eq(mode('prep', '0').getElementById('s-tc-fee-row').style.display, 'none',
       'and stays hidden on a pure vendor-management one');
    eq(mode('downsizing', '0').getElementById('s-tc-fee-row').style.display, '',
       'and is untouched on every other service');
    // the hint reports rather than instructs
    has(mode('prep', '5').getElementById('e-declutter-hint').innerHTML, '$750',
        'the hint prices the hours as they are typed');
    has(mode('prep', '0').getElementById('e-declutter-hint').innerHTML, 'No declutter hours',
        'and says plainly when there are none');
  }

  group('⚠ the field is cleared on a job switch and restored from the record');
  {
    // A prep job opened straight after another prep job would otherwise inherit the last
    // property's answer and price hours nobody walked — the `_volPreset` leak exactly.
    const rDoc = domStub({ 'e-declutter-hrs': '5' });
    const rCtx = sandbox({
      fns: ['resetEstimateExtras'],
      vars: ['prepItems'],
      stubs: { document: rDoc, renderVendors: () => {}, renderPrepItems: () => {} } });
    rCtx.resetEstimateExtras();
    eq(rDoc.getElementById('e-declutter-hrs').value, '0',
       'switching job clears the declutter hours');

    // ⚠ THE REOPEN IS PINNED AT SOURCE, NOT DRIVEN, AND THE REASON IS RECORDED RATHER THAN
    // GLOSSED: restoreEstimateToUI walks the whole room grid and ends in calcAll, so driving it
    // needs the pricing tree this harness cannot yet resolve (the project notes carry that as
    // still-open work). The browser run is the driven proof. What is asserted here is the
    // CONTRACT — the reopen must write the value estDeclutterHrs returns into the element
    // getDeclutterTCHrs reads — so a revert of either end fails, and only renaming both
    // together, which is a rename rather than a defect, passes.
    const restore = fn('restoreEstimateToUI');
    has(restore, 'estDeclutterHrs(est)', 'the reopen asks the record what it was priced with');
    has(restore, "getElementById('e-declutter-hrs')", 'and writes it into the field');
    has(restore, "dcEl.value = String(estDeclutterHrs(est) || 0)", 'as the value, not an attribute');
    has(fn('getDeclutterTCHrs'), "getElementById('e-declutter-hrs')",
        'which is the same element the accessor reads back — one id, both ends');
  }

  group('⚠ the snapshot key calcAll WRITES is the key estDeclutterHrs READS');
  {
    // ⚠ calcAll CANNOT BE DRIVEN IN THIS HARNESS — it resolves three dozen DOM elements and a
    // pricing tree, and the project notes record that as still-unwritten work. So the snapshot
    // write is pinned at source and PROVED IN A BROWSER, which is the pattern this repo already
    // settled on for calcAll. What is asserted here is the CONTRACT rather than a byte sequence:
    // whatever key the writer uses, the reader must read the same one. Renaming either alone
    // fails this; renaming both together is a rename, not a defect.
    const write = fn('calcAll');
    const read = fn('estDeclutterHrs');
    const m = /declutterTCHrs:\s*declutterTCHrs/.exec(write);
    ok(!!m, 'calcAll stamps the hours onto the snapshot');
    has(read, 'e.declutterTCHrs', 'and estDeclutterHrs reads that exact key back');
    // the two hour concepts must not be written under one key
    has(write, 'prepTCHrs: prepTCHrs,', 'prepTCHrs is still its own field on the record');
    ok(write.indexOf('declutterTCHrs: declutterTCHrs') !== write.indexOf('prepTCHrs: prepTCHrs'),
       'and the two are separate fields, not one');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ a prep estimate still needs vendors — hours alone are a Home Editing job');
  {
    const save = fn('saveEstimateAndPreview');
    // ⚠ THE TEST IS ON prepCost, NOT havellinTotal. Declutter hours land in havellinTotal, so the
    // old `havellinTotal === 0` test would have let a prep estimate with NO VENDORS through on the
    // strength of a few concierge hours — a Home Editing job wearing the wrong name on the
    // agreement, the invoice header and the client's Drive folder.
    has(save, "(currentEstimate.prepCost || 0) === 0", 'the vendor test reads prepCost');
    lacks(save, "isPrepEst) {\n    if (!currentEstimate.prepEnabled || (currentEstimate.havellinTotal || 0) === 0)",
          'and no longer passes on havellinTotal, which the hours now move');
    has(save, 're-type it as Home Editing', 'and the refusal names the service that IS just decluttering');
    // ⚠ FOUND IN THE BROWSER, NOT BY A TEST. The save confirmation printed
    // "30% fee $14,250" off havellinTotal — which carries the declutter hours as well as the fee
    // — so it labelled the concierge labour as part of the management fee on the one line that
    // confirms what was just saved. It names the fee and the hours separately now.
    has(save, "'% fee $' + (currentEstimate.prepFee || 0).toLocaleString()",
        'the save summary prices the FEE off prepFee, not off the total the hours moved');
    has(save, "' declutter hrs \u00b7 total $'", 'and names the hours and the combined total separately');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ the two hour concepts stay apart at source');
  {
    const ca = fn('calcAll');
    has(ca, 'var prepTCHrs = 0;', 'prepTCHrs — vendor coordination — is still hard zero');
    has(ca, 'var declutterTCHrs = isPrep ? getDeclutterTCHrs() : 0;', 'declutter hours are their own variable');
    has(ca, 'totTC = isPrep ? declutterTCHrs : _sup.tcHrs;', 'and enter through totTC');
    // ⚠ NOT folded into coordTC. That line carries off-site vendor coordination, which the 30%
    // fee already pays for; adding hands-on hours to it would bill them as coordination and
    // resurrect the double charge that took SMF_PCT to zero.
    lacks(ca, '+ declutterTCHrs + vendorTCHrs', 'and never join coordTC beside prepTCHrs/vendorTCHrs');
    const src = source();
    ok(src.indexOf('declutterTCHrs') < src.indexOf('totTC = isPrep ? declutterTCHrs'),
       'declutterTCHrs is declared before it is read');
  }
};
