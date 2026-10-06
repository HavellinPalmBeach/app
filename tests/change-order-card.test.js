'use strict';
// A change order can be printed and accepted from the screen that shows it (2026-09-29, audit H2).
//
// ⚠⚠ THE DEAD END THIS SUITE GUARDS. `printChangeOrder` and `openCOAcceptModal` were called from exactly
// one place: renderJobs' `detailHtml`, a hidden row built for every client and never added to the page
// ("Detail expand suppressed — click row to open Client Dashboard"). So a change order raised from the
// dashboard's + New could never be printed and never accepted — its row read "Awaiting acceptance" with
// nothing to press. An unaccepted change order moves nothing: the client got no document to sign, the
// hours never lengthened the plan or cleared an overrun flag, a fixed-price change was never added to the
// final, and a vendors-only Home Prep job could never open its hours log. Browser steps 23–25 passed only
// because they called both functions through page.evaluate — a test that reaches past the screen proves a
// function exists, never that a person can reach it. So the load-bearing group here is the one that
// renders the REAL dashboard and reads the buttons back out of it, and the one that drives Create and
// Accept through the real modal functions and the real notice chain onto that same dashboard.
//
// And Q14, Anthony's decision: an hourly change order's hours carry the job's rush premium and discount
// like every other hour; a fixed-price change order is priced at the plain hourly rates; say so in one
// line on the printed change order. The line states the bill, so it is tested against the invoice too.

const { sandbox, source, fn, domStub } = require('./harness');

const noComments = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
const text = (h) => String(h).replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&rsquo;/g, '’')
  .replace(/&mdash;/g, '—').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();

// Realistic ids — Date.now() at the moment of Create — so the rendered reference reads CO-000050 and the
// onclick carries the full number, as it does in the app.
const ID_A = 1759180000050;   // accepted
const ID_P = 1759180000100;   // pending

// 80 TC + 60 PS on the estimate (140 hrs), the fixture change-order-hours.test.js prices.
const ROOMS = [{ idx: 0, name: 'Kitchen', tcH: 40, psH: 30 }, { idx: 1, name: 'Garage (2-car)', tcH: 40, psH: 30 }];
const EST_TM = { jobId: 7, svc: 'cleanout', totTC: 80, totPS: 60, psCount: 2, tcRate: 150, psRate: 100,
                 fixedPrice: false, rooms: ROOMS, havellinTotal: 18000, tcFee: 12000, psFee: 6000,
                 pkgCost: 0, smf: 0, prepFee: 0, discountPct: 0, rush: false, vendors: [], prepItems: [] };
const EST_FX = Object.assign({}, EST_TM, { fixedPrice: true, fixedAmount: 26000, havellinTotal: 26000 });
const JOB = { id: 7, hvlId: 'HVL-0007', name: 'Butler Estate', svc: 'cleanout', addr: '69 Beach Blvd',
              tc: 'Anthony Graziano', status: 'active', premium: false, executor: 'Tripp Butler' };

function co(tc, ps, id, extra) {
  return Object.assign({ id: id || ID_P, jobId: 7, description: 'Guest house added to scope', reason: 'scope_add',
                         tcHrs: tc, psHrs: ps, createdAt: 'Sep 25, 2026',
                         clientApproved: false, clientName: '', clientAcceptedAt: '' }, extra || {});
}
function accepted(tc, ps, id, extra) {
  return co(tc, ps, id || ID_A, Object.assign({ clientApproved: true, clientName: 'Tripp Butler',
                                                clientAcceptedAt: 'September 25, 2026' }, extra || {}));
}
const LOG = (tc, ps) => [{ date: '2026-09-20', members: [{ name: 'A', role: 'TC', hours: tc }, { name: 'C', role: 'PS', hours: ps }] }];

const CO = ['coAcceptedHours', 'coHoursTotal', 'coHours'];

// The real dashboard, lifted exactly as change-order-hours.test.js lifts it — never stubbed: a stub of the
// card is precisely what would let this suite pass while the screen offers nothing.
const DASH_FNS = ['_dashUtilityBarHtml', '_jtDocViews', '_jtDraftLink', '_jtDriveLink', '_jtSendAction',
  'activeHouseFlags', 'agreementSignature', 'dashUtilityBar', 'driveFolderPending', 'depositPaidTotal', 'depositTargetFor',
  'docKeyFor', 'docSentAt', 'esignProviderKey', 'esignAvailable', 'esignJobWatches', 'field',
  'getJobActuals', 'jobLogEntries', 'houseFlagsOf', 'isAgreementSigned', 'isJobFunded', 'isJobWon',
  'jobActivationBlockers', 'jobOnProbateTrack', 'estatePackageRoute', 'matterDef', 'matterTypeOf', 'invFiduciaryMode', 'isDecedentJob', 'jobPayments', 'agrApprovalWithdrawn', 'jobTimeline', '_localDateOf', 'paymentStageWord', 'finalAwaitsHours', 'jobTimelineActions', 'esignSignedCopyGaps', 'docReadOnlyWord', 'depositVoidFlag', 'agreementHandedOverInPerson',
  'discountOfferBlocker', 'jobTimelineNext',
  'jobStageDoc', 'docReadiness', 'docDraftOnly', 'docTitle', 'docWord', '_jtDocSecondaries', 'docPreviewOnly',
  'agreementReady', 'jobTimelineDoc',
  'jobSchedule', 'jtScheduleHtml', 'estWorkingDays', '_todayStr', '_ymdLocal', 'addWorkingDays', 'jobProgress',
  'workingDaysInclusive', 'approvedEstimateFor',
  'maybeStartJobsWatch', 'paymentSplit', 'renderClientDashboard', 'walkawaySettlementHtml', 'walkawaySettlement', 'jobRefundedTotal', 'refundCounts', 'jobPaymentsListHtml', '_paymentKey', 'paymentStageLabel', 'paymentMethodLabel', 'fmt', 'coCardActions', 'sectionHdr', 'stagePaidTotal', 'paymentCounts', 'paymentLive', 'isRefundRecord',
  'standingFlagLines', 'standingFlagsBlock', '_sfHost', '_sfRowHtml', 'mustFindItems', 'mustFoundOf', '_mustFindKey', '_mfHandle',
  'stopJobsWatch', 'unscoredRoomNames', 'isAgreementSent', 'jtBandHtml', 'jtTrackHtml', 'jtRailHtml', '_jtAtFmt', '_jtStateCls',
  'hoursOverText', 'estTolerancePctTxt', 'coHoursLabel', 'dot', 'coWorkingDays', '_coPaceFix', 'coInclTxt', 'esc',
  'roomStatusNormalize', 'estimateIsFeeOnly', 'estDeclutterHrs', 'estimateEditBlocker', 'priceChangeBlocker', 'jobStatusView', 'jtDraftLine', 'staleDraftNote', 'staleDraftsOf', 'draftIsStale', 'draftOutstanding', 'staleDocName', '_draftDay', '_andJoin', '_dashNoticeHtml', 'estimateOutForApproval', 'priceAboveSent', 'docDraftPending', 'priceAboveAcceptance', '_approvedPriceAbove', 'estFixedLines', 'coRushPct', 'coRushPctFor', 'coScopeLabel', 'coHours', 'coVendorAddsTxt', 'coVendorAdds', 'coDraftVendorAdd', 'coPrepVendorReadout', 'moneyToNumber', '_srcLid', 'escLines', 'finalCrewOnlyWarn', 'agreementChipFix', 'roundCents', 'fmtHrs', 'estateAuthority', 'jobFiduciaries', 'estateTaxReturnDue', 'jobListEntries', 'estateTaxReturn', 'esignFiledCopies', 'agreementHandOverDraftNote', 'estatePackageOrphanDraftNote'].concat(CO);
const DASH_VARS = ['_driveFolderInFlight', 'MATTER_TYPES', 'DECEDENT_SERVICES', 'ESIGN_PROVIDERS', 'FIREARMS_PROTOCOL_DOC', 'HOUSE_FLAGS', 'SF_HOSTS', 'JT_LEG_BREAK', 'JT_SHORT', 'JT_NEXT', 'SVC_LABELS', 'PAYMENT_STAGE_LABELS',
  '_dashNotice', '_jobsWatch', 'jobLogs', 'JT_ROW_DOC', 'DOC_READY_WHY', 'DOC_KIND_WORD', 'DOC_STAGE_WORD', 'DOC_ACTIONS',
  'PRODUCTIVE_HRS_PER_DAY', 'jobPlanStore', 'PROJ_CREW_DAY', 'TC_DONE_STATUSES', 'PS_DONE_STATUSES', 'EST_TOLERANCE_PCT',
  'ROOM_STATUS_META', 'ROOM_STATUS_LEGACY', 'JOB_STATUS_LABELS', 'JOB_STATUS_DOT', '_dashShown', '_dashKeepNotice', 'RUSH_PCT'];

// The change-order modal, acceptance and print functions (prep-co-hours.test.js's list), plus the real
// notice chain: _docNotice → dashNotice → _dashRedraw → the lifted renderClientDashboard.
const CO_FNS = ['_coJobBasis', 'coBaselineShift', '_coMoney', 'fmt', 'coPrice', 'coPriceTotal', 'coFixedTerms',
  'coRateBasisTxt', 'coReasonLabel', 'estFixedFee', 'coBasisNoteHtml', 'updateCOHours', 'openChangeOrder',
  'openCOAcceptModal', 'closeCOAcceptModal', 'acceptChangeOrder', 'printChangeOrder', 'saveChangeOrder',
  '_coPriorAccepted', 'coPriorHours', 'coNoHoursBaseTxt', 'coPrepReadoutHtml', 'prepFeeRate', 'agrBillingRates',
  'coRateModsLine', 'coPrepVendorsOn', '_agrHasPrepVendors', 'estPrepFeeOnTop', 'coBaselineMove', 'discountOnLabor', 'coVendorAdds', 'roundCents', 'isWholeHours', 'fmtHrs'];
const NOTICE_FNS = ['_docNotice', 'dashNotice', '_dashRedraw', '_jobBandHost'];
const CO_VARS = ['CO_REASONS', 'RUSH_PCT', 'PREP_FEE_RATE', '_dashboardJobId', '_srcLidSeq'];

// The whole screen: a dashboard open on job 7, the modals, and the stores behind them.
function screen(cos, opts) {
  opts = opts || {};
  const dom = domStub({ 'client-dashboard-view': { style: { display: 'block' } } });
  const job = Object.assign({ won: true, approved: true, created: 'Sep 8, 2026', walkthrough: '2020-01-01',
                              driveFolder: 'https://drive.google.com/drive/folders/XYZ' }, JOB);
  const c = sandbox({
    fns: DASH_FNS.concat(CO_FNS, NOTICE_FNS),
    vars: DASH_VARS.concat(CO_VARS),
    stubs: {
      document: dom, setTimeout: () => 0, clearTimeout: () => {}, Intl: global.Intl,
      jobs: [job], changeOrders: cos, contractors: [], _photoRefs: {},
      estimateStore: { 7: { estimate: Object.assign({}, opts.est || EST_TM), approved: true } },
      currentEstimate: null,
      saveChangeOrders: () => {},
      // Accepting files the accepted copy to Drive (P17); that filing is driven in p17-documents-drive.test.js.
      fileChangeOrder: () => {}, saveJobs: () => {}, syncJobToSheets: () => {}, renderJobs: () => {},
      docNames: () => ({ printTitle: 'Havellin Change Order' }),
      // A showFB that really writes, so a regression back to `showFB('e-fb', …)` fails on the strip it
      // wrote to rather than crashing the file on a missing function.
      showFB: (id, kind, msg) => { dom.getElementById(id).innerHTML = String(msg); },
    },
  });
  c._dashboardJobId = 7;          // the dashboard is open on this client, as goToClientDashboard leaves it
  c.jobLogs[7] = opts.log || LOG(100, 70);
  c.__dom = dom;
  c.__view = () => dom.getElementById('client-dashboard-view').innerHTML;
  return c;
}

// One `<div class="doc-r">` row per change order; the card's own "+ New" row carries no CO- reference.
function coRow(html, id) {
  const ref = 'CO-' + String(id).slice(-6);
  const rows = html.split('<div class="doc-r">');
  const hit = rows.filter((r) => r.indexOf(ref + '</div>') >= 0);
  return hit.length === 1 ? hit[0] : '';
}
function buttons(rowHtml) {
  const out = [];
  const re = /<button class="([^"]*)"[^>]*onclick="([^"]*)"[^>]*>([^<]*)<\/button>/g;
  let m;
  while ((m = re.exec(rowHtml))) out.push({ cls: m[1], call: m[2], label: m[3] });
  return out;
}

// The invoice sandbox, as change-order-billing.test.js builds it.
function inv(stubs) {
  return sandbox({
    fns: ['estTolerancePctTxt', 'finalAwaitsHours', 'paymentStageWord', 'invoiceHtml', 'docSentAt', 'paymentSplit', 'rushScopeLine', 'rushCrewAdded', 'jobLogEntries', 'invFinalApproval', 'invFinalApprovalRecord', 'docKeyFor', 'coHours', 'coHoursTotal', 'coBaselineShift', 'coPrice', 'coPriceTotal', 'coHoursLabel',
          '_coMoney', 'fmt', 'getVendorActuals', '_srcLineKey', 'samePerson', 'canonPersonName',
          '_invVendorFeeSentence', 'prepFeeRate', 'vendorGroupOfLine', 'resolveJobVendor',
          'coordHrsFor', 'prepLineTCHrs', 'vendorLineTCHrs', 'esc', 'fmtDate2', 'svcLabelOf', 'docServiceTitle', 'probateSvcOffTrack',
          'conciergePhones', 'conciergePhonesText', 'assignedTCContact', 'vendorCats',
          'vendorPrimaryCat', 'estimateIsFeeOnly', 'isDecedentJob',
          'stagePaidTotal', 'jobPaidTotal', 'jobPayments', 'discountOnLabor', 'estFixedFee', 'estPrepFeeOnTop', 'estFixedLines', 'discountOnFixedFee', 'fixedDiscountBasisWords', 'rushBaseWords', 'coRushPct', 'coVendorAdds', 'coVendorAddsTxt', 'jobPrepLines', 'coPrepVendorLines', 'escLines', 'paymentCounts', 'finalCrewOnlyWarn', 'coBaselineMove', 'roundCents', 'fmtHrs', 'paymentLive', 'isRefundRecord'],
    vars: ['DOC_STAGE_WORD', 'EST_TOLERANCE_PCT', 'SMF_PCT', 'RUSH_PCT', 'SVC_LABELS', 'DEPT_EMAILS', 'HAVELLIN_OFFICE_PHONE',
           'NON_MOBILE_NUMBERS', 'DEFAULT_CONTRACTORS', 'COORD_TOUCHES',
           'COORD_TOUCHES_BY_GROUP', 'COORD_TOUCHES_DEFAULT', 'TOUCH_HRS',
           'DECEDENT_SERVICES', 'PERSON_NAME_ALIASES', 'PREP_FEE_RATE'],
    stubs: Object.assign({
      jobLogs: {}, estimateStore: {}, changeOrders: [], contractors: [],
      currentEstimate: null, currentInvStage: 'final', vendorDirectory: [], jobPlans: {},
    }, stubs || {}),
  });
}
// Walk the engagement stage by stage, paying each invoice in full, and return what was collected.
function collected(est, cos, loggedTC, loggedPS) {
  const store = { 7: { estimate: est, approved: true, approvedBy: 'Anthony Graziano' } };
  const logs = { 7: [{ date: '2026-09-01', activity: 'clearance',
                       members: [{ name: 'Anthony Graziano', role: 'TC', hours: loggedTC },
                                 { name: 'Crew', role: 'PS', hours: loggedPS }] }] };
  const run = (payments) => ({ ctx: inv({ estimateStore: store, jobLogs: logs, changeOrders: cos || [] }),
                               job: Object.assign({}, JOB, { payments: payments }) });
  const a = run([]);
  const dep = Math.round(a.ctx.invoiceHtml(a.job, 'deposit').amtDue);
  const b = run([{ stage: 'deposit', amount: dep, date: '2026-08-01', method: 'wire' }]);
  const mid = Math.round(b.ctx.invoiceHtml(b.job, 'midpoint').amtDue);
  const c = run([{ stage: 'deposit', amount: dep, date: '2026-08-01', method: 'wire' },
                 { stage: 'midpoint', amount: mid, date: '2026-09-01', method: 'wire' }]);
  return dep + mid + Math.round(c.ctx.invoiceHtml(c.job, 'final').amtDue);
}

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();

  // ═══════════════════════════════════════════════════════════════════════════
  group('coCardActions — what a change order’s row offers, and when');
  {
    const c = sandbox({ fns: ['coCardActions'] });
    const p = c.coCardActions(co(10, 10, ID_P));
    eq(p.map((a) => a.label), ['PDF', 'Get Acceptance'], 'an unaccepted change order offers the PDF and Get Acceptance');
    eq(p.map((a) => a.call), ['printChangeOrder(' + ID_P + ')', 'openCOAcceptModal(' + ID_P + ')'],
       'each naming this change order’s own id');
    ok(!!p[1] && p[1].primary === true && !p[0].primary, 'Get Acceptance is the one primary — it is the step still to take');

    const a = c.coCardActions(accepted(20, 20, ID_A));
    // RESTATED 2026-10-01 (P17): an accepted change order is filed to the client's Drive (Anthony's answer 9), so its row
    // carries its filing too — File to Drive until it is filed, the filed copy after. Still never Get Acceptance.
    eq(a.map((x) => x.label), ['PDF', '&#128193; File to Drive'], '⚠ an accepted one offers the PDF and its filing, never Get Acceptance — accepting again would overwrite who agreed and when');
    eq((a[0] || {}).call, 'printChangeOrder(' + ID_A + ')', 'the client’s copy stays printable after they agree');

    eq((c.coCardActions(co(1, 0, String(ID_P)))[0] || {}).call, 'printChangeOrder(' + ID_P + ')',
       'a numeric id read back as a string still renders as a number');
    eq(c.coCardActions(co(1, 0, '1);alert(1')).length, 0,
       '⚠ an id that is not a number gets no controls rather than a broken — or worse — onclick');
    eq(c.coCardActions({ jobId: 7, tcHrs: 1 }).length, 0, 'a record with no id gets none');
    // Guarded, so a regression here fails the check instead of throwing the rest of the file away.
    const none = (() => { try { return c.coCardActions(null).length; } catch (e) { return 'threw'; } })();
    eq(none, 0, 'and nothing at all gets nothing');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠⚠ THE DASHBOARD CARD — one pending and one accepted change order, through the real renderClientDashboard');
  {
    const c = screen([accepted(20, 20, ID_A, { clientName: 'O\'Hara <b>Trust</b>' }), co(10, 10, ID_P)]);
    c.renderClientDashboard(7);
    const html = c.__view();

    const pend = coRow(html, ID_P);
    ok(pend.length > 0, 'the pending change order has its row');
    has(pend, 'Awaiting acceptance', 'reading Awaiting acceptance …');
    const pb = buttons(pend);
    eq(pb.map((b) => b.label), ['PDF', 'Get Acceptance'], '⚠⚠ … with the two controls on it, PDF first');
    eq(pb.map((b) => b.call), ['printChangeOrder(' + ID_P + ')', 'openCOAcceptModal(' + ID_P + ')'],
       '⚠⚠ and their onclicks name this change order');
    eq((pb[1] || {}).cls, 'btn-bronze', 'Get Acceptance is the bronze primary');
    eq((pb[0] || {}).cls, 'btn-s', 'the PDF an outline button beside it');

    const acc = coRow(html, ID_A);
    ok(acc.length > 0, 'the accepted change order has its row');
    has(acc, '>Accepted<', 'reading Accepted');
    const ab = buttons(acc);
    // RESTATED 2026-10-01 (P17): and its filing to Drive (see coCardActions above).
    eq(ab.map((b) => b.call), ['printChangeOrder(' + ID_A + ')', 'fileChangeOrder(' + ID_A + ')'], '⚠⚠ with the PDF and File to Drive — no Get Acceptance on an accepted one');
    has(acc, 'accepted by O&#39;Hara &lt;b&gt;Trust&lt;/b&gt;', 'who accepted it rides on the row, escaped');
    lacks(acc, '<b>Trust', 'never as raw markup');

    eq((html.match(/onclick="openCOAcceptModal\(/g) || []).length, 1, 'exactly one Get Acceptance on the screen');
    eq((html.match(/onclick="printChangeOrder\(/g) || []).length, 2, 'and one PDF per change order');
    has(html, 'onclick="openChangeOrder(7)"', 'the + New that raises one is still there');
    has(html, '2 issued', 'and the card counts them');

    const calls = (html.match(/onclick="[^"]*"/g) || []);
    eq(calls.length, new Set(calls).size, 'no control is on the screen twice');

    // ⚠ A change order that adds a preparation vendor names it on its row (2026-09-30; coScopeLabel), where one
    // that adds no hours read "no hours change".
    const v = screen([co(0, 0, ID_P, { vendorAdds: [{ type: 'Painting', cost: 4500, lid: 'co-paint' }] })]);
    v.renderClientDashboard(7);
    const vrow = coRow(v.__view(), ID_P);
    has(vrow, 'adds Painting (est. $4,500)', '⚠⚠ the row names the vendor it adds and its estimated cost');
    lacks(vrow, 'no hours change', 'rather than reading as an empty change');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠⚠ CREATE, THEN ACCEPT — the real modal functions, the real notice chain, the real dashboard');
  {
    const c = screen([]);
    c.renderClientDashboard(7);
    has(c.__view(), 'None issued', 'a job with no change order reads None issued');
    const barBefore = c.__view();

    // + New, then the modal filled in and Create pressed.
    c.openChangeOrder(7);
    eq(c.__dom.getElementById('change-order-modal').style.display, 'flex', '+ New opens the modal on this job');
    c.__dom.getElementById('co-description').value = 'Pool house added to scope';
    c.__dom.getElementById('co-tc-hrs').value = '8';
    c.__dom.getElementById('co-ps-hrs').value = '8';
    c.saveChangeOrder();
    eq(c.changeOrders.length, 1, 'Create writes the change order');
    const id = c.changeOrders[0].id;
    eq(c.__dom.getElementById('change-order-modal').style.display, 'none', 'the modal closes');

    const after = c.__view();
    const row = coRow(after, id);
    ok(row.length > 0, '⚠⚠ the card is REDRAWN — the new row is on screen at once, not "None issued"');
    lacks(after, 'None issued', 'the stale count is gone');
    eq(buttons(row).map((b) => b.call), ['printChangeOrder(' + id + ')', 'openCOAcceptModal(' + id + ')'],
       '⚠⚠ with its PDF and Get Acceptance');
    const fb = after.slice(after.indexOf('id="dash-fb"'), after.indexOf('id="dash-fb"') + 900);
    has(fb, 'created (+8.0', '⚠ the notice is painted in the dashboard’s own strip');
    has(fb, 'waiting on the client', 'saying what it is waiting on');
    has(fb, 'PDF prints it for them to sign', 'naming the PDF');
    has(fb, 'Get Acceptance records their agreement', 'and Get Acceptance');
    lacks(after, 'Open the job in Client Dashboard', '⚠ never sending you to the screen you are on');
    ok(c._dashNotice === null, 'shown once — a stale notice does not come back on the next redraw');
    eq(c.__dom.getElementById('e-fb').innerHTML, '', '⚠ nothing written to the hidden Build Estimate strip');

    // Get Acceptance, read off the rendered button — so the onclick on screen is proven to name a real record.
    // Read defensively: on a build with no Get Acceptance this must FAIL, not throw and take the rest of
    // the file with it — a crash reads as one failure when it is really every check after it.
    const onclick = (buttons(row)[1] || {}).call || '';
    const coId = Number((onclick.match(/^openCOAcceptModal\((\d+)\)$/) || [])[1]);
    eq(coId, id, 'the rendered Get Acceptance names the change order just created');
    c.openCOAcceptModal(coId);
    eq(c.__dom.getElementById('co-accept-modal').style.display, 'flex', 'it opens the acceptance panel');
    c.__dom.getElementById('coa-client-name').value = 'Tripp Butler';
    c.acceptChangeOrder();
    ok(c.changeOrders[0].clientApproved === true, 'Accept records the client’s agreement');
    eq(c.__dom.getElementById('co-accept-modal').style.display, 'none', 'and closes the panel');

    const done = c.__view();
    const row2 = coRow(done, id);
    has(row2, '>Accepted<', '⚠⚠ the card is redrawn — the row reads Accepted at once …');
    has(row2, 'accepted by Tripp Butler', '… naming who accepted');
    // RESTATED 2026-10-01 (P17): the filing the acceptance started is stubbed in this sandbox, so the row offers File to Drive.
    eq(buttons(row2).map((b) => b.label), ['PDF', '&#128193; File to Drive'], '… and Get Acceptance is gone from it');
    lacks(done, 'onclick="openCOAcceptModal(', 'nothing left to accept anywhere on the screen');
    const fb2 = done.slice(done.indexOf('id="dash-fb"'), done.indexOf('id="dash-fb"') + 900);
    has(fb2, 'Change Order accepted by Tripp Butler', 'the acceptance notice is painted on the dashboard');
    has(fb2, 'These hours bill on the final invoice as they are worked', 'with the T&M sentence');
    eq(c.__dom.getElementById('e-fb').innerHTML, '', 'and again nothing to the hidden strip');

    // What accepting is FOR: the hours the client signed for reach the bars on the same redraw.
    lacks(barBefore, 'by change order', 'before acceptance the Hours Log carries no change-order hours');
    has(done, 'incl. +8.0 hrs by change order', '⚠⚠ after it, the bars read the accepted hours — acceptance moved something');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('a refusal still speaks inside the modal, and moves nothing');
  {
    const c = screen([]);
    c.renderClientDashboard(7);
    c.openChangeOrder(7);
    c.__dom.getElementById('co-tc-hrs').value = '8';
    c.saveChangeOrder();                       // no description
    eq(c.changeOrders.length, 0, 'nothing is written');
    has(c.__dom.getElementById('co-fb').innerHTML, 'Describe what changed', 'the modal says why');
    eq(c.__dom.getElementById('change-order-modal').style.display, 'flex', 'and stays open on the fields it names');
    ok(c._dashNotice === null, 'no dashboard notice claims anything happened');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('the notices name the screen they land on — never the hidden Build Estimate strip');
  {
    const sv = noComments(fn('saveChangeOrder'));
    const ac = noComments(fn('acceptChangeOrder'));
    lacks(sv, "'e-fb'", 'Create no longer prints to e-fb');
    lacks(ac, "'e-fb'", 'nor Accept');
    has(sv, "_docNotice('ok'", 'Create speaks through the one notice route …');
    has(ac, "_docNotice('ok'", 'as does Accept');
    has(sv, 'their agreement.\', jobId);', '… naming the job, so the redraw lands on it');
    // ⚠ RESTATED 2026-09-30 (P16): the notice now ends with any vendor the change order added, on every basis.
    has(ac, '+ _accV, co.jobId);', 'Accept names its job too');
    lacks(src, 'Open the job in Client Dashboard', 'the sentence that sent you to the screen you were on is gone');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠⚠ Q14 — the printed change order says whether its hours carry the premium and the discount');
  {
    function printed(est, extra) {
      const c = sandbox({
        fns: ['printChangeOrder', '_coJobBasis', 'coHoursLabel', 'coFixedTerms', '_coPriorAccepted', 'coPriorHours', 'coPrice',
              'coPriceTotal', 'coBaselineShift', '_coMoney', 'fmt', 'esc', 'estFixedFee', 'coReasonLabel', 'coRateBasisTxt',
              'agrBillingRates', 'coRateModsLine', 'prepFeeRate', 'coHours', 'coHoursTotal', 'estFixedLines', 'coRushPct', 'coRushPctFor', 'coVendorAdds', 'coPrepVendorsOn', '_agrHasPrepVendors', 'estPrepFeeOnTop', 'roundCents', 'fmtHrs'],
        vars: ['CO_REASONS', 'RUSH_PCT', 'PREP_FEE_RATE'],
        stubs: { jobs: [Object.assign({}, JOB, (extra && extra.job) || {})], changeOrders: [co(10, 0, ID_P)], currentEstimate: null,
                 estimateStore: { 7: { estimate: Object.assign({}, est), approved: true } },
                 docNames: () => ({ printTitle: 'Havellin Change Order' }) },
      });
      c.printChangeOrder(ID_P);
      return text(c.__printed);
    }
    const RD = { rush: true, rushPct: 0.2, discountPct: 10 };

    const tm = printed(Object.assign({}, EST_TM, RD));
    has(tm, 'Like every other hour on this engagement, these hours carry the 20% expedited-delivery premium and the 10% preferred-client discount on the final invoice.',
        '⚠⚠ T&M: the hours carry both, stated with the job’s own percentages');
    ok(tm.indexOf('does not itself create a charge') >= 0 && tm.indexOf('does not itself create a charge') < tm.indexOf('Like every other hour'),
       'the line follows the terms it qualifies');
    ok(!/\$\s?[\d,]/.test(tm), '⚠ a T&M change order still carries no dollar figure anywhere');

    has(printed(Object.assign({}, EST_TM, { rush: true, rushPct: 0.2 })),
        'these hours carry the 20% expedited-delivery premium on the final invoice.', 'the premium alone');
    has(printed(Object.assign({}, EST_TM, { discountPct: 10 })),
        'these hours carry the 10% preferred-client discount on the final invoice.', 'the discount alone');
    has(printed(Object.assign({}, EST_TM, { rush: true, rushPct: 0.25 })),
        'the 25% expedited-delivery premium', 'the rate pinned on the estimate, not today’s RUSH_PCT');

    const plain = printed(EST_TM);
    lacks(plain, 'expedited-delivery', '⚠ a job with neither says nothing about either …');
    lacks(plain, 'preferred-client', '… no discount clause …');
    lacks(plain, 'Like every other hour', '… and no line at all — explaining an absence is what draws attention to it');

    const fx = printed(Object.assign({}, EST_FX, RD));
    has(fx, 'It is priced at the plain hourly rates shown: the expedited-delivery premium and the preferred-client discount in your fixed project fee do not apply to it.',
        '⚠⚠ fixed price: the plain hourly rates, said in one line');
    lacks(fx, '20% expedited', '⚠ with no percentage — the fixed-price estimate never itemises the premium');
    lacks(fx, '10% preferred', 'nor the discount');
    has(fx, '+ $1,500', 'the price is the hours at the rate card: 10 × $150');

    has(printed(Object.assign({}, EST_FX, { rush: true, rushPct: 0.2 })),
        'the expedited-delivery premium in your fixed project fee does not apply to it.', 'fixed, the premium alone');
    has(printed(Object.assign({}, EST_FX, { prevApprovedTotal: 28000 })),
        'the preferred-client discount in your fixed project fee does not apply to it.',
        '⚠ a discount offered after approval is baked into the fee and leaves discountPct at 0 — prevApprovedTotal is its trace');
    lacks(printed(EST_FX), 'plain hourly rates', 'a fixed job with neither prints no line');

    // Home Prep: a vendors-only engagement has no other hours, so the "every other hour" clause would be false.
    const PREP = { jobId: 7, svc: 'prep', totTC: 0, totPS: 0, tcRate: 150, psRate: 100, fixedPrice: false,
                   prepFee: 13500, prepCost: 45000, prepEnabled: true, declutterTCHrs: 0, havellinTotal: 13500,
                   rush: false, discountPct: 10, rooms: [], vendors: [],
                   prepItems: [{ type: 'Painting', cost: 45000, note: '', lid: 'p1' }] };
    const pr = printed(PREP, { job: { svc: 'prep' } });
    has(pr, 'These hours carry the 10% preferred-client discount on the final invoice.', 'prep: the discount, stated plainly');
    lacks(pr, 'Like every other hour', '⚠ never "like every other hour" on an engagement that may have none');
    lacks(printed(Object.assign({}, PREP, { discountPct: 0 }), { job: { svc: 'prep' } }), 'preferred-client',
          'a prep job with no discount prints no line');

    const L = sandbox({ fns: ['coRateModsLine', 'estFixedLines', 'coRushPct'], vars: ['RUSH_PCT'] });
    eq(L.coRateModsLine(null, false), '', 'no estimate, no line');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠⚠ Q14 IS THE BILL — the invoice charges exactly what the printed line says');
  {
    const RD = { rush: true, rushPct: 0.2, discountPct: 10 };
    const tmRD = Object.assign({}, EST_TM, RD);
    // Ten change-order concierge hours, accepted and logged, against the same job without them.
    const withCO = collected(tmRD, [accepted(10, 0, ID_A)], 90, 60);
    const without = collected(tmRD, [], 80, 60);
    eq(withCO - without, 1620, '⚠⚠ T&M: 10 hrs × $150, plus the 20% premium, less the 10% discount — $1,620, the hours carry both');
    eq(collected(EST_TM, [accepted(10, 0, ID_A)], 90, 60) - collected(EST_TM, [], 80, 60), 1500,
       'and on a job with neither, the same hours are $1,500 — the difference is the premium and the discount');

    const fxRD = Object.assign({}, EST_FX, RD);
    eq(collected(fxRD, [accepted(10, 0, ID_A)], 80, 60) - collected(fxRD, [], 80, 60), 1500,
       '⚠⚠ fixed price: exactly 10 × $150 is added — the plain rate, with neither the premium nor the discount on it');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('the dead detail row is gone, and each control has exactly one caller');
  {
    const rj = noComments(fn('renderJobs'));
    lacks(rj, 'detailHtml', 'renderJobs builds no detail row');
    lacks(rj, 'detailFields', 'nor its fields');
    lacks(rj, 'id="detail-', 'nor the hidden <tr> they went in');
    lacks(rj, 'printChangeOrder', 'the client list no longer carries change-order controls nobody could see');

    const live = src.split('\n').filter((l) => !/^\s*(\/\/|\*)/.test(l)).join('\n');
    ok(live.length > src.length * 0.5, 'the comment strip did not eat the file');
    const callers = (name) => (live.match(new RegExp("[^A-Za-z_$]" + name + "\\(", 'g')) || []).length
      - (live.match(new RegExp('function ' + name + '\\(', 'g')) || []).length;
    // RESTATED 2026-10-01 (P17): two places now — the card's PDF, and fileChangeOrder, which asks it for the page itself
    // ({asHtml:true}) to file the accepted copy. Still exact, so a third, unseen caller fails here.
    eq(callers('printChangeOrder'), 2, '⚠⚠ printChangeOrder is named in exactly two places: the card’s actions and the Drive filing');
    has(fn('fileChangeOrder'), 'printChangeOrder(coId, { asHtml: true })', 'and the second asks for the page, never the print dialog');
    eq(callers('openCOAcceptModal'), 1, '⚠⚠ openCOAcceptModal too');
    has(fn('coCardActions'), "'printChangeOrder('", 'and that place is coCardActions …');
    has(noComments(fn('renderClientDashboard')), 'coCardActions(co).forEach', '… which the dashboard card renders on every row');
  }
};
