'use strict';
// TEST CLIENTS (2026-10-23).
//
// Anthony: *"we should have a way at intake … to label the client a dummy client and that way it doesn't
// get counted like in the win loss ratio or actually our pipeline … I'd rather have the dashboard only reflect
// actual live client"*, with the first live inbound arriving beside the dummy jobs. His picks: a test client
// stays in the list with a TEST badge; the tick is at intake and in Edit Client, either way; documents print
// as live. One rule, jobIsTest, read by every figure about the business.

const { sandbox, source, fn, domStub } = require('./harness');

const LIST_FNS = ['renderJobs', 'jobIsTest', 'liveJobs', 'fmt', 'jobIsSettled', 'stagePaidTotal', 'paymentCounts', 'paymentLive', 'isRefundRecord', 'jobPayments',
  'svcLabelOf', 'maybeStartJobsWatch', 'stopJobsWatch',
  'sortJobsForList', 'jobsHeadHtml', '_jobStatusCell', 'esc', 'jobsUnread', 'jobsUnreadNotice',
  'renderWinLoss', 'winLossBlockHtml', 'winLossFigures', 'closeoutRetainedTotal', 'jobPaidTotal', 'winLossListHtml', '_wlClientCell', 'jobRefundedTotal', 'refundCounts',
  'isJobWon', 'secCaret', 'fmtDate2', 'setJobSort', 'setFilter', 'jobStatusView', 'jobClosedRefunded', 'priceAboveAcceptance', '_approvedPriceAbove', 'isAgreementSigned', 'agreementSignature', 'isAgreementSent', 'docSentAt', 'docKeyFor', 'roundCents'];
const LIST_VARS = ['currentFilter', 'SVC_LABELS', 'SVC_ORDER', '_jobsWatch',
  '_jobsState', '_jobSort', '_wlOpen', 'JOB_SORTS', 'JOB_LIST_COLS', 'JOB_STATUS_ORDER',
  'JOB_STATUS_LABELS', 'JOB_STATUS_DOT', 'WON_METHOD_LABELS'];

const JOBS = [
  { id: 11, name: 'Ashby',  svc: 'downsizing_move', status: 'active', won: true, tc: 'Ashley Jerome', havellinEst: 30000, totalEst: 32000, re: 'yes' },
  { id: 12, name: 'Butler', svc: 'cleanout',        status: 'lost',   won: false, tc: 'Ashley Jerome', havellinEst: 20000 },
  { id: 13, name: 'Dummy Won',  svc: 'probate',     status: 'active', won: true, tc: 'Anthony Graziano', havellinEst: 90000, totalEst: 95000, re: 'yes', test: true },
  { id: 14, name: 'Dummy Lost', svc: 'downsizing',  status: 'lost',   won: false, tc: 'Anthony Graziano', havellinEst: 5000, test: true },
  { id: 15, name: 'Dummy Pending', svc: 'prep',     status: 'pending', tc: 'Anthony Graziano', havellinEst: 7000, test: true },
];

function list(jobs) {
  const d = domStub({});
  const s = sandbox({ fns: LIST_FNS, vars: LIST_VARS, stubs: { document: d, SHEETS_SYNC_URL: '' } });
  s.jobs = jobs.map((j) => Object.assign({}, j));
  s._jobsState = 'ready';
  s.currentFilter = 'all';
  s.renderJobs();
  const txt = (id) => String(d.getElementById(id).textContent);
  return { s, d, body: d.getElementById('jobs-body').innerHTML, txt };
}

const EC_FNS = ['showEditClient', 'jobIsTest', 'courtFromCaseNo', 'courtRecordRequired', 'courtRecordShown', 'jobOnProbateTrack', 'saveClientEdit', 'coFiduciaryRepClash', 'coFiduciaryRepRefusal', 'followJobService', 'ecToggleProbate', 'ecPaintSvcFlag', 'probateSvcFlag',
  'executorAuthOptionsHtml', 'resolveExecutorAuth', 'authorityRecord',
  'ecIsProbateSvc', 'ecIsEstateSvc', 'ecIsMoveSvc', 'ecDocGateChange',
  'docTierOptionsHtml', 'docTierOf', 'docTierDef', 'docTierScope',
  'docTierScopeMirror', 'svcHasDocStep', 'esc', 'onDocGateChange',
  'houseFlagInputsHtml', 'houseFlagsOf', '_houseFlagRowClass',
  'docLevelFloor', 'gateDispute', '_gateYes', '_gate706', 'isDecedentJob',
  'docLevelFloorReason', 'resolveDocLevel', 'docStandardEffect',
  'isFormalDoc', 'invAppraisalThreshold', 'matterTypeOf', 'matterDef',
  'invFiduciaryMode', 'readHouseFlagInputs', 'docScopeDef', 'referralSourceKind', 'referralSourceOptionsHtml', 'referralPartnerOptionsHtml', 'jobRefersToPartner', 'referralIdOf', 'lookupReferralById', 'svcFamilyOptions', 'svcFamily', 'conciergeOptionsHtml', 'getAllActiveTC', '_byContractorName', 'samePerson', 'canonPersonName', 'executorRoleOptionsHtml', 'dateChainConflicts', 'dateChainFlagHtml', 'intakeAsksHouseContents', 'houseFlagAsked', 'sameSvcFamily', 'clientMissingFields', 'readReferralInputs', 'showHouseFlagRows', '_stampChangedKeys', '_jobTouch', 'docTierChangeNotice', 'followDocTier', 'activeDocScope', 'seedDocScopeFromJob', 'estimateDocScope', 'docTierWord', 'docScopeWord', 'estimateRepriceRoute', 'estimateEditBlocker', 'priceChangeBlocker', 'estimateOutForApproval', 'isAgreementSigned', 'isAgreementSent', 'agreementSignature', 'docSentAt', 'docKeyFor', 'roundCents', 'fmt', 'propertySaleAsked', 'trustRecordShown', 'executorAuthField', 'coFiduciaryBlockHtml', 'jobListEntries', 'estateAuthority'];
const EC_VARS = ['EXECUTOR_AUTH_OPTIONS', 'SVC_LABELS', 'HOUSE_FLAGS', 'FIREARMS_PROTOCOL_DOC', 'DECEDENT_SERVICES',
  'DOC_TIERS', 'DOC_TIER_FROM_SCOPE', 'JOB_STEPS', 'INV_APPRAISAL_THRESHOLD',
  'INV_APPRAISAL_THRESHOLD_DISPUTED', 'MATTER_TYPES', 'DOC_SCOPES', 'REFERRAL_SOURCES', 'SVC_ORDER', 'EXECUTOR_ROLES', 'referralDirectory', 'DEFAULT_CONTRACTORS', 'contractors', 'PERSON_NAME_ALIASES', 'ESTIMATE_EDIT_ROUTE_TXT', 'ESTIMATE_OUT_FOR_APPROVAL_TXT'];

const MOVE = { id: 7, hvlId: 'HVL-0007', name: 'Tripp Butler', fname: 'Tripp', lname: 'Butler',
  svc: 'downsizing_move', propVal: '3200000', destAddr: '9 Palm Way', destCity: 'Boca Raton', destSqft: '1800', sqft: '4500' };

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();

  // ───────────────────────────────────────────────────────────────────────────
  group('the four tiles count live clients only, through the real renderJobs');
  {
    const r = list(JOBS);
    eq(r.txt('m-tot'), '2', 'Total Jobs: the two live clients, not five');
    eq(r.txt('m-act'), '1', 'Active: the live one running; the test pending adds no "(+1 pending)"');
    eq(r.txt('m-pip'), '$30,000', 'Pipeline: the live estimate alone ($90,000 and $7,000 of test work left out)');
    eq(r.txt('m-re'), '1', 'RE potential: the live one');
    const onlyTest = list(JOBS.filter((j) => j.test));
    eq(onlyTest.txt('m-tot'), '0', 'a book of nothing but test clients reads 0, a read list with no live client');
    eq(onlyTest.txt('m-pip'), '—', 'and no pipeline');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('a test client stays in the list, badged (Anthony\'s pick)');
  {
    const r = list(JOBS);
    has(r.body, 'Dummy Won', 'a test client is listed under All');
    has(r.body, 'Dummy Pending', 'every test client that is not lost');
    const badges = (r.body.match(/class="badge b-test"[^>]*>TEST</g) || []).length;
    eq(badges, 2, 'two TEST badges for the two test clients under All (the lost one is under Lost)');
    const ashbyRow = r.body.slice(r.body.indexOf('Ashby'), r.body.indexOf('</tr>', r.body.indexOf('Ashby')));
    ok(ashbyRow.length > 10 && !/b-test/.test(ashbyRow), 'a live client carries no badge');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('Win / Loss counts live clients only');
  {
    const r = list(JOBS);
    const f = r.s.winLossFigures();
    eq(f.won.map((j) => j.name).join(','), 'Ashby', 'won: the live client');
    eq(f.lost.map((j) => j.name).join(','), 'Butler', 'lost: the live client');
    eq(f.convRate, 50, 'conversion 1 of 2, not 2 of 4');
    eq(f.wonRev, 30000, 'won revenue leaves the $90,000 test job out');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('a referral partner is credited with live referrals only');
  {
    const P = { uid: 'rp-1', name: 'Jane Counsel', status: 'Active' };
    const s = sandbox({ fns: ['referralPartnerStats', 'referralDormancy', '_daysSinceISODate', 'liveJobs', 'jobIsTest', 'jobRefersToPartner', 'referralIdOf', 'isJobWon'],
      vars: ['REFERRAL_DORMANT_DAYS'], stubs: { referralDirectory: [P] } });
    const t0 = Date.parse('2026-10-20T12:00:00Z');
    s.jobs = [
      { id: t0 - 400 * 86400000, name: 'Live', refPartnerId: 'rp-1', status: 'won', won: true, havellinEst: 10000 },
      { id: t0, name: 'Test', refPartnerId: 'rp-1', status: 'won', won: true, havellinEst: 50000, test: true },
    ];
    const st = s.referralPartnerStats(P);
    eq(st.count, 1, 'one referral, the live one');
    eq(st.pipeline, 10000, 'its pipeline leaves the test job out');
    eq(st.wonRev, 10000, 'and its won revenue');
    const dm = s.referralDormancy(P);
    ok(dm.days != null && dm.days > 300, 'a test referral never makes a quiet partner look active (' + dm.days + ' days)');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('intake asks it, saves it, and the reset puts it back to live');
  {
    const intake = src.slice(src.indexOf('<select id="i-test">'), src.indexOf('</select>', src.indexOf('<select id="i-test">')));
    ok(intake.length > 20, 'intake has the Client record control');
    ok(intake.indexOf('value="live"') >= 0 && intake.indexOf('value="live"') < intake.indexOf('value="test"'), 'Live client is first, so a client is live unless somebody says otherwise');
    has(fn('saveIntake'), "test:(document.getElementById('i-test')||{}).value === 'test'", 'saveIntake writes test as a boolean');
    const d = domStub({ 'i-test': 'test' });
    const s = sandbox({ fns: ['resetIntakeFields'], vars: ['INTAKE_FIELDS', 'INTAKE_FIELD_DEFAULTS'],
      stubs: { document: d, clearHouseFlagInputs() {}, buildCoFiduciaryBlock() {}, toggleIntakeFields() {}, onReferralSourceChange() {}, paintDateChainFlag() {}, paintAddressMatch() {} } });
    s.resetIntakeFields();
    eq(d.getElementById('i-test').value, 'live', 'Clear (and the reset after a save) puts the next client back to live');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('Edit Client shows it and writes it, either way');
  {
    const open = (job) => {
      const d = domStub({ 'ec-svc': job.svc });
      const c = sandbox({ fns: EC_FNS, vars: EC_VARS, stubs: { document: d, jobs: [JSON.parse(JSON.stringify(job))], estimateStore: {}, saveJobs() {}, renderClientDashboard() {}, renderJobs() {} } });
      c.showEditClient(job.id);
      return d.getElementById('edit-client-modal').innerHTML;
    };
    const sel = (h) => { const i = h.indexOf('id="ec-test"'); return i < 0 ? '' : h.slice(i, h.indexOf('</select>', i)); };
    has(sel(open(MOVE)), '<option value="live" selected', 'a live client opens on Live client');
    has(sel(open(Object.assign({}, MOVE, { test: true }))), '<option value="test" selected', 'a test client opens on Test client');

    const save = (job, seed, absent) => {
      const d = domStub(Object.assign({ 'ec-svc': job.svc, 'ec-fname': 'Tripp', 'ec-lname': 'Butler', 'ec-sqft': job.sqft || '', 'ec-premium': 'no' }, seed || {}));
      if (absent) { const g = d.getElementById.bind(d); d.getElementById = (id) => (id === 'ec-test' ? null : g(id)); }
      const c = sandbox({ fns: EC_FNS, vars: EC_VARS, stubs: { document: d, jobs: [JSON.parse(JSON.stringify(job))], estimateStore: {}, saveJobs() {}, renderClientDashboard() {}, renderJobs() {}, alert() {} } });
      c.saveClientEdit(job.id);
      return c.jobs[0];
    };
    eq(save(MOVE, { 'ec-test': 'test' }).test, true, 'marking an existing client as test is saved');
    eq(save(Object.assign({}, MOVE, { test: true }), { 'ec-test': 'live' }).test, false, 'and a mistake is unmarked');
    eq(save(Object.assign({}, MOVE, { test: true }), {}, true).test, true, 'a modal without the control keeps the record\'s answer');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('the client dashboard header says TEST; documents do not (Anthony: test the real paper)');
  {
    const rcd = fn('renderClientDashboard');
    has(rcd, "(jobIsTest(job) ? '<span class=\"badge b-test\"", 'the dashboard header badges a test client');
    ['clientEstimateHtml', 'agreementHtml', 'probateAgreementHtml', 'invoiceHtml', 'signingPacketHtml'].forEach((b) => {
      const body = fn(b);
      ok(body.length > 200 && body.indexOf('jobIsTest') < 0 && !/\b(job|j)\.test\b(?!\()/.test(body), b + ' never reads the test mark');
    });
    has(src, '.b-test{', 'the badge has its style');
  }
};
