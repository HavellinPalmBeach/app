'use strict';
// ⚠⚠ A MANAGER'S APPROVAL IS A FACT ABOUT ONE JOB (2026-09-29, workflow audit findings H1 + M1).
//
// H1 — THE FINAL-INVOICE PIN. `invApproved`, `invApprovedBy` and `invApprovedAt` were page globals.
// `checkInvPin` set them; the registry's ±tolerance gate and the "Approved for Release" band read
// them; only the retired Invoices tab ever cleared them, and `dashApproveInvoice` — the one door left
// since that tab went — did not. Measured on the real functions before the fix, two jobs each 30%
// over their estimate: A's final refused → the PIN entered for B from the dashboard → A's final
// PRINTS. B approved at $16,000 went on passing at $22,000 after 45 more hours, and a reload forgot
// the approval entirely. The record lives on `job.docState['invoice:final'].approval = {by, at,
// amtDue}` now, written through the `docState` accessor, and it is honoured only while `amtDue` is
// the figure the final asks for.
//
// M1 — THE AGREEMENT'S "APPROVED FOR SENDING" BAND. Both forms printed it from `agrApproved`,
// `agrApprovedBy` and `agrApprovedAt`, which describe whichever job `ensureAgreementApproved`
// touched LAST. Measured: A approved by Anthony on September 1, then B approved by Ashley today, and
// A's agreement — the HTML converted for DocuSign — read "Approved by Ashley Jerome on <today>" on
// both forms. On a fresh page A read no band at all. Wrong in both directions.
//
// Every case here drives the REAL functions across TWO jobs, because a one-job fixture cannot see a
// page global: with one job the global and the job always agree. And the last group is a net over
// the client-document builders, so the next page-level approval variable cannot be read from one.

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const H = require('./harness');
const { sandbox, domStub, source, matchBrace } = H;

const SRC = source();

// ─── the invoice sandbox ─────────────────────────────────────────────────────
const INV_FNS = ['estTolerancePctTxt', 'paymentStageWord', 'finalAwaitsHours', 'invoiceHtml', 'docSentAt', 'paymentSplit', 'rushScopeLine', 'rushCrewAdded', 'jobLogEntries', 'coHours', 'coHoursTotal',
  'coBaselineShift', 'coPrice', 'coPriceTotal', 'coHoursLabel', '_coMoney', 'fmt', 'getVendorActuals',
  '_srcLineKey', 'samePerson', 'canonPersonName', '_invVendorFeeSentence', 'prepFeeRate',
  'vendorGroupOfLine', 'resolveJobVendor', 'coordHrsFor', 'prepLineTCHrs', 'vendorLineTCHrs', 'esc',
  'fmtDate2', 'svcLabelOf', 'conciergePhones', 'conciergePhonesText', 'assignedTCContact', 'vendorCats',
  'vendorPrimaryCat', 'estimateIsFeeOnly', 'isDecedentJob', 'stagePaidTotal', 'paymentCounts', 'jobPaidTotal',
  'jobPayments', 'discountOnLabor', 'estFixedFee', 'estPrepFeeOnTop', 'docReadiness', 'agreementReady',
  'isJobWon', 'resolvePin', 'checkInvPin', 'dashApproveInvoice', 'openInvPinModal', 'invFinalApproval',
  'invFinalApprovalRecord', 'invFinalApprovalStaleTxt', 'recordInvFinalApproval', 'docState',
  'docKeyFor', '_jobTouch', 'docSpec', 'docAction', 'approvedEstimateFor', 'priceAboveAcceptance', '_approvedPriceAbove', 'isAgreementSigned', 'agreementSignature', 'isAgreementSent', 'docSentAt', 'fmtMoney', 'estFixedLines', 'discountOnFixedFee', 'fixedDiscountBasisWords', 'rushBaseWords', 'coRushPct', 'coVendorAdds', 'coVendorAddsTxt', 'jobPrepLines', 'coPrepVendorLines', 'escLines', 'finalCrewOnlyWarn', 'coBaselineMove'];
const INV_VARS = ['DOC_STAGE_WORD', 'EST_TOLERANCE_PCT', 'SMF_PCT', 'RUSH_PCT', 'SVC_LABELS', 'DEPT_EMAILS',
  'HAVELLIN_OFFICE_PHONE', 'NON_MOBILE_NUMBERS', 'DEFAULT_CONTRACTORS', 'COORD_TOUCHES',
  'COORD_TOUCHES_BY_GROUP', 'COORD_TOUCHES_DEFAULT', 'TOUCH_HRS', 'DECEDENT_SERVICES',
  'PERSON_NAME_ALIASES', 'PREP_FEE_RATE', 'MANAGER_PINS', 'DOC_ACTIONS', 'DOC_READY_WHY',
  'currentInvJobId', 'currentInvStage', 'invRequiresApproval', 'invBlocked'];

// Estimated 100 TC + 50 PS at $150/$100 = $20,000. Logged 130 + 65 = $26,000: 30% over, so a
// PIN is needed, and with the $10,000 deposit on file the final asks for $16,000.
const EST = (id) => ({ jobId: id, tcFee: 15000, psFee: 5000, pkgCost: 0, smf: 0, prepFee: 0,
  havellinTotal: 20000, havellinTotalFull: 20000, tcRate: 150, psRate: 100, discountPct: 0,
  discountAmt: 0, fixedPrice: false, rush: false, vendors: [], prepItems: [],
  preparedBy: 'Anthony Graziano', svc: 'downsizing', totTC: 100, totPS: 50 });
const LOG = (tc, ps) => [{ id: 1, date: '2026-09-01', activity: 'work', members: [
  { name: 'Anthony Graziano', role: 'TC', hours: tc }, { name: 'Crew', role: 'PS', hours: ps }] }];
const JOB = (id, name) => ({ id, hvlId: 'HVL-000' + id, name, svc: 'downsizing',
  addr: id + ' Ocean Blvd', tc: 'Anthony Graziano', status: 'active', won: true, approved: true,
  payments: [{ uid: 'dep-' + id, stage: 'deposit', amount: 10000, date: '2026-09-01', method: 'wire' }] });

function invCtx(opts) {
  opts = opts || {};
  const dom = domStub({ 'inv-pin-input': { value: '' } });
  const said = { notices: [], redraws: [], notified: [], docNotices: [], saves: 0, synced: [] };
  const stubs = {
    document: dom,
    jobLogs: { 1: LOG(130, 65), 2: LOG(130, 65) },
    estimateStore: { 1: { estimate: EST(1), approved: true, approvedBy: 'Anthony Graziano' },
                     2: { estimate: EST(2), approved: true, approvedBy: 'Anthony Graziano' } },
    changeOrders: [], contractors: [], currentEstimate: null, vendorDirectory: [], jobPlans: {},
    notifyDept(to, subj, lines) { said.notified.push({ to, subj, lines }); },
    dashNotice(type, msg) { said.notices.push({ type, msg }); },
    _dashRedraw(id) { said.redraws.push(id); },
    _docNotice(type, msg, id) { said.docNotices.push({ type, msg, id }); },
    saveJobs() { said.saves++; },
    syncJobToSheets(j) { said.synced.push(j && j.id); },
    docNames() { return { client: 'Havellin Invoice', attachment: 'x.pdf', printTitle: 'Havellin Invoice - Final', drive: 'x.html' }; },
    bestClientEmail() { return 'client@example.com'; },
    setTimeout(f) { f(); },
  };
  // The retired tab's renderer paints a dozen elements; most groups stub it and one drives it.
  if (!opts.liftRenderInvoice) stubs.renderInvoice = function () {};
  if (opts.liftRenderInvoice) stubs.buildInvoiceMailto = function () { return 'mailto:client@example.com'; };
  const ctx = sandbox({ fns: INV_FNS.concat(opts.liftRenderInvoice ? ['renderInvoice'] : []), vars: INV_VARS, stubs });
  ctx.jobs = opts.jobs || [JOB(1, 'Alder'), JOB(2, 'Birch')];
  ctx.__dom = dom; ctx.__said = said;
  return ctx;
}
const jobOf = (ctx, id) => ctx.jobs.find((j) => j.id === id);
const finalBlocker = (ctx, id) => ctx.DOC_ACTIONS.invoice.blocker({ job: jobOf(ctx, id), stage: 'final', kind: 'invoice' }, 'print');
const finalHtml = (ctx, id) => ctx.invoiceHtml(jobOf(ctx, id), 'final').html;
// The PIN typed into the real modal, from the real dashboard door.
function approveFromDashboard(ctx, id, pin) {
  ctx.dashApproveInvoice(id, 'final');
  ctx.__dom.getElementById('inv-pin-input').value = pin;
  ctx.checkInvPin();
}
const bandCount = (h) => (String(h).match(/class="approved-stamp"/g) || []).length;
const clone = (o) => JSON.parse(JSON.stringify(o));

// ─── the agreement sandbox ───────────────────────────────────────────────────
const AGR_FNS = ['_agrComplianceHeading', '_agrComplianceLead', '_agrApprover', '_agrTrustDeliverable',
  'matterDef', 'matterTypeOf', 'invFiduciaryMode', 'marketingOptOutBlock', 'marketingUseParas',
  '_mktClause', 'estTolerancePctTxt', 'agreementHtml', 'agrPriceAdjustments', '_pctWords', 'probateAgreementHtml', 'agrBillingRates',
  'materialsBasisNote', 'materialsPackageQuoted', 'fmt', 'esc', 'paymentSplit', 'isDecedentJob', 'agrSection',
  '_agrHasPrepVendors', 'estimateDocScope', 'svcHasDocStep', 'docScopeDef', '_agrScopeServices',
  '_agrMidpointTrigger', '_agrProbateCompliance', 'esignAnchor', 'estFixedFee', 'estPrepFeeOnTop',
  'weArrangeAppraisals', 'docTierProduces', 'docTierOf', 'docTierDef', '_agrApprovedStamp',
  'ensureAgreementApproved', 'agreementReady', 'isJobWon', '_primeAgreementFor', 'loadAgreement',
  'approvedEstimateFor', 'signingPacketHtml', 'buildSigningPacketHtml', 'priceAboveAcceptance', '_approvedPriceAbove', 'isAgreementSigned', 'agreementSignature', 'isAgreementSent', 'docSentAt', 'docKeyFor', 'docDraftPending', 'estFixedLines', 'fixedDiscountBasisWords', 'coRushPctFor', 'appraisalDuty', 'estimateAppraiserLines', 'estimateAppraiserNames', '_agrOtherAppraisalsBy', 'coPrepVendorsOn'];
const AGR_VARS = ['DOC_STAGE_WORD', 'AGR_NOT_AN_ACCOUNTING', 'MATTER_TYPES', 'EST_TOLERANCE_PCT', 'SMF_PCT',
  'DECEDENT_SERVICES', 'currentAgrJobId',
  'HAVELLIN_OFFICE_PHONE', 'JOB_STEPS', 'DOC_SCOPES', 'ESIGN_ANCHORS', 'DOC_TIERS', 'DOC_TIER_FROM_SCOPE', 'RUSH_PCT'];
const AEST = (id) => ({ jobId: id, tcFee: 15000, psFee: 5000, pkgCost: 0, smf: 0, prepFee: 0,
  havellinTotal: 20000, totTC: 100, totPS: 50, tcRate: 150, psRate: 100, discountPct: 0,
  fixedPrice: false, rush: false, vendors: [], prepItems: [], rooms: [], collections: [], vehicles: [] });
const ESTATE = { executor: 'Tripp Butler', deathDate: '2026-01-15', matterType: 'probate' };

function agrCtx(svcA, svcB) {
  const ctx = sandbox({ fns: AGR_FNS, vars: AGR_VARS, stubs: {
    document: domStub({}), currentEstimate: null,
    estimateStore: { 1: { estimate: AEST(1), approved: true, approvedBy: 'Anthony Graziano' },
                     2: { estimate: AEST(2), approved: true, approvedBy: 'Ashley Jerome' } },
    populateAgrSelect() {}, renderAgreement() {}, updateAgrUI() {}, exportSigningPacketToDrive() {},
    saveJobs() {}, syncJobToSheets() {}, setTimeout() {},
    // The packet's Exhibit A is the client estimate, a separate renderer with its own suites. What
    // this file asks is which APPROVAL the packet's agreement page names.
    _approvedEstimateHtml(id) { return '<div class="ce-est">EXHIBIT A for job ' + id + '</div>'; } } });
  const extra = (svc) => (svc === 'probate' ? ESTATE : {});
  ctx.jobs = [
    Object.assign({ id: 1, hvlId: 'HVL-0001', name: 'Alder', svc: svcA, addr: '1 Ocean Blvd', won: true, approved: true,
      agrApproved: true, agrApprovedBy: 'Anthony Graziano', agrApprovedAt: 'September 1, 2026' }, extra(svcA)),
    Object.assign({ id: 2, hvlId: 'HVL-0002', name: 'Birch', svc: svcB, addr: '2 Ocean Blvd', won: true, approved: true }, extra(svcB)) ];
  return ctx;
}
// The band's two lines, read off the rendered document.
function band(h) {
  const m = String(h).match(/class="approved-stamp"[\s\S]*?Approved by ([^<]+?) on ([^<]+?)<\/div>/);
  return m ? m[1] + ' | ' + m[2] : '(no band)';
}
const TODAY_LONG = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

// ─── source helpers ──────────────────────────────────────────────────────────
// Line comments only. ⚠ Not a block-comment regex: `accept="image/*"` in this file makes
// `/\*[\s\S]*?\*\//` swallow ~170KB, which is recorded in CLAUDE.md. The comments beside these fixes
// have to NAME the retired globals to be worth reading, so a raw needle over the source would trip on
// the explanation of the fix.
const stripLine = (s) => String(s).split('\n').map((l) => l.replace(/(^|[^:'"\\])\/\/.*$/, '$1')).join('\n');
const LIVE = stripLine(SRC);
const FN_NAMES = new Set();
{ const re = /(^|\n)function\s+([A-Za-z_$][\w$]*)\s*\(/g; let m; while ((m = re.exec(SRC))) FN_NAMES.add(m[2]); }
const KW = new Set(['if', 'for', 'while', 'switch', 'return', 'function', 'catch', 'typeof', 'new', 'with', 'do', 'else']);
function callsIn(body) {
  const out = new Set();
  const re = /(^|[^.\w$])([A-Za-z_$][\w$]*)\s*\(/g;
  let m;
  while ((m = re.exec(body))) if (!KW.has(m[2]) && FN_NAMES.has(m[2])) out.add(m[2]);
  return out;
}
const bareRead = (body, name) => new RegExp('(^|[^.\\w$])' + name.replace(/\$/g, '\\$') + '(?![\\w$])').test(body);

module.exports = function ({ group, ok, eq, has, lacks }) {

  // ═══ H1 ════════════════════════════════════════════════════════════════════
  group('⚠⚠ H1 the reported defect: the PIN entered for B no longer releases A');
  {
    const ctx = invCtx();
    const A0 = ctx.invoiceHtml(jobOf(ctx, 1), 'final'), B0 = ctx.invoiceHtml(jobOf(ctx, 2), 'final');
    eq([Math.round(A0.variancePct * 100), A0.requiresApproval, A0.amtDue], [30, true, 16000], 'fixture: A is 30% over, needs a PIN, and asks for $16,000');
    eq([Math.round(B0.variancePct * 100), B0.requiresApproval, B0.amtDue], [30, true, 16000], 'fixture: so is B — the same figure on purpose, so only the JOB can tell them apart');
    has(finalBlocker(ctx, 1), 'needs a manager PIN', 'before any PIN, A\'s final is refused');
    has(finalBlocker(ctx, 2), 'needs a manager PIN', 'and so is B\'s');

    ctx.dashApproveInvoice(2, 'final');
    const modal = ctx.__dom.getElementById('inv-pin-modal');
    eq(modal.style.display, 'flex', 'the dashboard door opens the PIN modal');
    eq(modal.dataset.jobId, '2', '⚠ bound to B — the job the manager pressed it on');
    eq(ctx.currentInvJobId, null, '⚠ and it writes no page state to get there (currentInvJobId untouched)');
    ctx.__dom.getElementById('inv-pin-input').value = '4020';
    ctx.checkInvPin();

    eq(finalBlocker(ctx, 2), '', 'B\'s final is released');
    has(finalBlocker(ctx, 1), 'needs a manager PIN', '⚠⚠ A\'s final is STILL refused — this is the defect: it used to print');
    const A = jobOf(ctx, 1), B = jobOf(ctx, 2);
    eq(!!(A.docState && A.docState['invoice:final']), false, 'nothing was written onto A');
    const ap = ((B.docState || {})['invoice:final'] || {}).approval || {};
    eq([ap.by, ap.amtDue], ['Ashley Jerome', 16000], 'B carries {by, amtDue}: the person the PIN resolved to, and the figure they were shown');
    ok(!isNaN(Date.parse(ap.at)) && /T/.test(String(ap.at)), 'and `at` is a real timestamp, not a display string');
    ok(typeof (B.at || {})['docState:invoice:final'] === 'number', '⚠ written through the docState accessor: the key is stamped, so it merges per key on the sheet');
    ok(Number(B.updatedAt) > 0, 'and the record clock moved with it');
    eq(bandCount(finalHtml(ctx, 2)), 1, 'B\'s final carries the Approved for Release band once');
    eq(bandCount(finalHtml(ctx, 1)), 0, 'A\'s does not');
    eq(modal.style.display, 'none', 'the modal closes on a good PIN');

    const n = ctx.__said.notified;
    eq(n.length, 1, 'billing is told once');
    has((n[0] || {}).subj, 'Birch', 'about B');
    has(((n[0] || {}).lines || []).join('\n'), 'Approved by: Ashley Jerome on', 'naming the approver');
    has(((n[0] || {}).lines || []).join('\n'), 'Final balance approved: $16,000', 'and the figure approved, so a later change is visible in the inbox too');
    const okNote = ctx.__said.notices.filter((x) => x.type === 'ok').pop() || {};
    has(okNote.msg, 'approved for release by Ashley Jerome at $16,000', '⚠ the dashboard it was typed on says so — it used to get nothing back');
    has(okNote.msg, 'needs approving again', 'and says what undoes it');
    ok(ctx.__said.redraws.indexOf(2) >= 0, 'and redraws that client');
    ok(ctx.__said.saves > 0 && ctx.__said.synced.indexOf(2) >= 0, 'saved and synced');
    ok(ctx.__said.synced.indexOf(1) < 0, 'A was not synced — nothing about it changed');
  }

  group('⚠⚠ H1 end to end through the REAL docAction: A prints nothing, B prints');
  {
    const ctx = invCtx();
    approveFromDashboard(ctx, 2, '4020');
    ctx.__printed = '';
    eq(ctx.docAction(1, 'invoice', 'print', { stage: 'final' }), false, 'printing A\'s final is refused');
    eq(ctx.__printed, '', 'and nothing reached the print path');
    has((ctx.__said.docNotices.pop() || {}).msg, 'needs a manager PIN', 'with the reason on screen');
    ctx.docAction(2, 'invoice', 'print', { stage: 'final' });
    has(ctx.__printed, 'Final Invoice', 'B\'s final reaches the print path');
    has(ctx.__printed, 'approved-stamp', 'with the band in the markup — the print stylesheet is what hides it on paper');
  }

  group('⚠⚠ H1 the approval is for a FIGURE: more hours re-ask, the old figure is honoured again, a payment re-asks');
  {
    const ctx = invCtx();
    approveFromDashboard(ctx, 2, '4020');
    eq(finalBlocker(ctx, 2), '', 'approved at $16,000');

    ctx.jobLogs[2] = LOG(160, 80);   // 45 more hours
    const d = ctx.invoiceHtml(jobOf(ctx, 2), 'final');
    eq(d.amtDue, 22000, 'the final now asks for $22,000');
    const blk = finalBlocker(ctx, 2);
    has(blk, 'needs a manager PIN', '⚠⚠ and it is refused — it used to go on passing at a figure nobody had looked at');
    has(blk, 'Ashley Jerome approved it at $16,000', 'the refusal says who approved what');
    has(blk, 'it now asks for $22,000', 'and what it asks for now');
    eq(bandCount(finalHtml(ctx, 2)), 0, 'the band comes off with it');
    ctx.__dom.getElementById('inv-pin-modal').style.display = 'none';
    ctx.dashApproveInvoice(2, 'final');
    eq(ctx.__dom.getElementById('inv-pin-modal').style.display, 'flex', 'the dashboard door asks for the PIN again');

    ctx.jobLogs[2] = LOG(130, 65);   // the extra line corrected away
    eq(finalBlocker(ctx, 2), '', 'back to $16,000, the record on file describes it again and is honoured — nothing was deleted');

    jobOf(ctx, 2).payments.push({ uid: 'mid-2', stage: 'midpoint', amount: 1000, date: '2026-09-20', method: 'wire' });
    eq(ctx.invoiceHtml(jobOf(ctx, 2), 'final').amtDue, 15000, 'a payment recorded after the PIN moves the balance to $15,000');
    has(finalBlocker(ctx, 2), 'it now asks for $15,000', '⚠ and asks again — what the manager approved was a number, and this is not it');
  }

  group('⚠⚠ H1 a reload keeps it: the approval is on the record, not in the page');
  {
    const ctx = invCtx();
    approveFromDashboard(ctx, 2, '4020');
    const saved = clone(ctx.jobs);                 // what saveJobs / the sheet carry
    const fresh = invCtx({ jobs: saved });         // a new page on the same device, or the other device
    eq(finalBlocker(fresh, 2), '', 'B is still approved after a reload — it used to be forgotten');
    has(finalBlocker(fresh, 1), 'needs a manager PIN', 'and A is still refused');
    eq(bandCount(finalHtml(fresh, 2)), 1, 'the band comes back from the record');
    has(finalHtml(fresh, 2), 'Approved by Ashley Jerome on', 'naming the approver on file');
  }

  group('⚠⚠ H1 the sheet merges it per key: a stale device saving later does not drop it');
  {
    // The REAL backend merge, handed the REAL app's stamped record. A device holding the
    // morning copy saves a scalar change AFTER the approval, with a newer updatedAt and no
    // `invoice:final` key at all — the unstamped side is the weakest claim.
    const GS = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'main-sync.gs'), 'utf8');
    const gsFn = (name) => {
      const re = new RegExp('(^|\\n)function\\s+' + name + '\\s*\\(', 'g');
      const m = re.exec(GS); if (!m) throw new Error('not in .gs: ' + name);
      const start = m.index + (m[1] ? m[1].length : 0);
      const close = matchBrace(GS, GS.indexOf('{', re.lastIndex));
      return GS.slice(start, close + 1);
    };
    const gsVar = (name) => { const m = GS.match(new RegExp('(^|\\n)(var\\s+' + name + '\\s*=[^;]*;)')); if (!m) throw new Error('not in .gs: var ' + name); return m[2]; };
    const S = { Date };
    vm.createContext(S);
    vm.runInContext([gsVar('JOB_KEYED_LISTS'), gsVar('JOB_KEYED_MAPS'), gsVar('JOB_LIST_KEY'), gsVar('JOB_PAYMENT_STICKY'),
      ...['_jobStamp', '_jobListKey', '_mergeJobKeyed', '_mergeJobRecord', '_paymentSticky'].map(gsFn)].join('\n\n'), S);

    const morning = clone(JOB(2, 'Birch'));
    morning.updatedAt = Date.now() - 10 * 3600e3;
    morning.docState = { estimate: { sentAt: 'morning' } };
    morning.at = {};
    const ctx = invCtx({ jobs: [JOB(1, 'Alder'), clone(morning)] });
    approveFromDashboard(ctx, 2, '4020');
    const desk = clone(jobOf(ctx, 2));
    const house = clone(morning);
    house.notes = 'gate code changed';
    house.updatedAt = Date.now() + 3600e3;       // saved later, never saw the approval

    const out1 = S._mergeJobRecord(clone(desk), clone(house));
    const out2 = S._mergeJobRecord(clone(house), clone(desk));
    eq((((out1.docState || {})['invoice:final'] || {}).approval || {}).by, 'Ashley Jerome', '⚠⚠ the approval survives a stale device saving over it');
    eq((((out2.docState || {})['invoice:final'] || {}).approval || {}).by, 'Ashley Jerome', 'whichever order the two saves land in');
    eq([out1.notes, out2.notes], ['gate code changed', 'gate code changed'], 'while the other device\'s own edit still lands');
    eq(!!((out1.docState || {}).estimate), true, 'and the neighbouring docState keys are untouched');

    // A later re-approval at a new figure replaces the old one, on either side.
    // Read defensively: on a revert the desk may hold no record at all, and a TypeError here would
    // kill the file and read as one crash rather than as the assertions it breaks.
    const again = clone(desk);
    again.docState = again.docState || {};
    again.docState['invoice:final'] = Object.assign({}, again.docState['invoice:final'], { approval: { by: 'Anthony Graziano', at: new Date().toISOString(), amtDue: 22000 } });
    again.at = again.at || {};
    again.at['docState:invoice:final'] = Number((desk.at || {})['docState:invoice:final'] || Date.now()) + 60e3;
    again.updatedAt = again.at['docState:invoice:final'];
    const out3 = S._mergeJobRecord(clone(desk), clone(again));
    const out4 = S._mergeJobRecord(clone(again), clone(desk));
    const figOf = (o) => ((((o || {}).docState || {})['invoice:final'] || {}).approval || {}).amtDue;
    eq([figOf(out3), figOf(out4)], [22000, 22000], 'the newer approval wins per key, in both orders');
  }

  group('⚠ H1 fails CLOSED: no job bound, a job this device no longer holds, a wrong PIN');
  {
    const ctx = invCtx();
    const modal = ctx.__dom.getElementById('inv-pin-modal');
    modal.style.display = 'flex';
    modal.dataset.jobId = '';                     // opened with nothing bound
    ctx.__dom.getElementById('inv-pin-input').value = '4020';
    ctx.checkInvPin();
    eq([!!jobOf(ctx, 1).docState, !!jobOf(ctx, 2).docState], [false, false], 'no bound job: nothing is recorded on ANY job — it never falls back to another one');
    eq(modal.style.display, 'flex', 'the modal stays open');
    has(ctx.__dom.getElementById('inv-pin-fb').innerHTML, 'could not be found', 'and says why');
    eq(ctx.__said.notified.length, 0, 'billing is told nothing');
    eq(ctx.__said.notices.filter((x) => x.type === 'ok').length, 0, 'and no success notice');

    modal.dataset.jobId = '999';                  // a job dropped by another device meanwhile
    ctx.__dom.getElementById('inv-pin-input').value = '3010';
    ctx.checkInvPin();
    eq([!!jobOf(ctx, 1).docState, !!jobOf(ctx, 2).docState], [false, false], 'an unknown job: nothing recorded');

    ctx.currentInvJobId = 1;                      // even with the retired tab's page state pointing somewhere
    modal.dataset.jobId = '';
    ctx.__dom.getElementById('inv-pin-input').value = '4020';
    ctx.checkInvPin();
    eq(!!jobOf(ctx, 1).docState, false, '⚠ a stale currentInvJobId is never read by the PIN — only the job the modal was opened for');

    modal.dataset.jobId = '2';
    ctx.__dom.getElementById('inv-pin-input').value = '9999';
    ctx.checkInvPin();
    eq(!!jobOf(ctx, 2).docState, false, 'a wrong PIN records nothing');
    has(ctx.__dom.getElementById('inv-pin-fb').innerHTML, 'Incorrect PIN', 'and says so');
    ctx.__dom.getElementById('inv-pin-input').value = '40';
    ctx.checkInvPin();
    eq(!!jobOf(ctx, 2).docState, false, 'a half-typed PIN records nothing either');
  }

  group('⚠ H1 the dashboard door: inside tolerance, already approved, and no page state');
  {
    const ctx = invCtx();
    ctx.jobLogs[1] = LOG(100, 50);                // exactly on the estimate
    ctx.dashApproveInvoice(1, 'final');
    eq(ctx.__dom.getElementById('inv-pin-modal').style.display, undefined, 'inside tolerance: no modal');
    has((ctx.__said.notices.pop() || {}).msg, 'no approval needed', 'and it says so');

    approveFromDashboard(ctx, 2, '4020');
    const modal = ctx.__dom.getElementById('inv-pin-modal');
    modal.style.display = 'none';
    ctx.dashApproveInvoice(2, 'final');
    eq(modal.style.display, 'none', 'already approved at this figure: the PIN is not asked for twice');
    has((ctx.__said.notices.pop() || {}).msg, 'already approved for release', 'it names the approval on file instead');
    eq([ctx.currentInvJobId, ctx.currentInvStage, ctx.invRequiresApproval], [null, 'final', false], '⚠ none of the retired tab\'s page variables were written');

    ctx.dashApproveInvoice(404, 'final');
    has((ctx.__said.notices.pop() || {}).msg, 'could not be found', 'a missing job is refused by name');
  }

  group('H1 the band: once, under the header, from the record, escaped');
  {
    const ctx = invCtx();
    approveFromDashboard(ctx, 2, '4020');
    const h = finalHtml(ctx, 2);
    eq(bandCount(h), 1, 'exactly one band');
    ok(h.indexOf('ce-divider-thick') < h.indexOf('approved-stamp') && h.indexOf('approved-stamp') < h.indexOf('class="ce-title"'),
      'it sits under the header and above the title, as the agreement\'s does');
    has(h, 'Approved for Release', 'reading Approved for Release');
    const apAt = ((((jobOf(ctx, 2).docState || {})['invoice:final']) || {}).approval || {}).at;
    has(h, 'Approved by Ashley Jerome on ' + ctx.fmtDate2(apAt), 'naming the approver and the date off the record');
    eq(bandCount(ctx.invoiceHtml(jobOf(ctx, 2), 'deposit').html), 0, 'never on the deposit invoice');
    eq(bandCount(ctx.invoiceHtml(jobOf(ctx, 2), 'midpoint').html), 0, 'never on the midpoint invoice');
    // ⚠ The stage test is load-bearing, not tidiness: an approval whose figure happens to equal
    // the DEPOSIT's balance must not put "Approved for Release" on the deposit invoice.
    const depDue = ctx.invoiceHtml(jobOf(ctx, 1), 'deposit').amtDue;
    jobOf(ctx, 1).docState = { 'invoice:final': { approval: { by: 'Anthony Graziano', at: '2026-09-29T10:00:00Z', amtDue: depDue } } };
    eq(bandCount(ctx.invoiceHtml(jobOf(ctx, 1), 'deposit').html), 0, 'a final\'s approval at the deposit\'s own figure still puts no band on the deposit invoice');
    delete jobOf(ctx, 1).docState;

    // The record comes from the sheet, so it is escaped like any other stored text.
    jobOf(ctx, 1).docState = { 'invoice:final': { approval: { by: '<img src=x onerror=1>', at: '2026-09-29T10:00:00Z', amtDue: 16000 } } };
    const hA = finalHtml(ctx, 1);
    has(hA, '&lt;img src=x onerror=1&gt;', 'a stored approver name is escaped');
    lacks(hA, '<img src=x', 'never emitted as markup');
  }

  group('H1 the retired tab reads the record too (renderInvoice)');
  {
    const ctx = invCtx({ liftRenderInvoice: true });
    ctx.currentInvJobId = 2; ctx.currentInvStage = 'final';
    ctx.renderInvoice();
    const el = (id) => ctx.__dom.getElementById(id);
    eq(el('btn-inv-approve').style.display, 'inline-block', 'unapproved: the tab offers the approval');
    eq(el('btn-inv-pdf').style.display, 'none', 'and withholds the PDF');
    jobOf(ctx, 2).docState = { 'invoice:final': { approval: { by: 'Ashley Jerome', at: '2026-09-29T10:00:00Z', amtDue: 16000 } } };
    ctx.renderInvoice();
    eq(el('btn-inv-approve').style.display, 'none', 'approved on the record: no approval button');
    eq(el('btn-inv-pdf').style.display, 'inline-block', 'and the PDF is offered — the same test the registry\'s gate applies');
    has(el('inv-banner-wrap').innerHTML, 'Ashley Jerome', 'the banner names the approver on file');
    ctx.currentInvJobId = 1;                      // the tab switched to A
    ctx.renderInvoice();
    eq(el('btn-inv-approve').style.display, 'inline-block', '⚠ A on the same tab is NOT approved by B\'s record');
    ctx.currentInvJobId = 2; ctx.jobLogs[2] = LOG(160, 80);
    ctx.renderInvoice();
    has(el('inv-banner-wrap').innerHTML, 'it now asks for $22,000', 'a stale record is explained on the tab as well');
  }

  group('H1 the helpers, DOM-free');
  {
    const ctx = invCtx();
    const J = (st) => ({ id: 9, docState: st });
    eq(ctx.invFinalApprovalRecord(J(undefined)), null, 'no docState: no record');
    eq(ctx.invFinalApprovalRecord(J({ 'invoice:final': { sentAt: 'x' } })), null, 'a send record alone is not an approval');
    eq(ctx.invFinalApprovalRecord(J({ 'invoice:final': { approval: { at: 'x', amtDue: 1 } } })), null, 'an approval with no approver is not a record');
    eq(ctx.invFinalApprovalRecord(J({ 'invoice:midpoint': { approval: { by: 'A', amtDue: 1 } } })), null, 'only the FINAL\'s key counts');
    const rec = J({ 'invoice:final': { approval: { by: 'Ashley Jerome', at: '2026-09-29T10:00:00Z', amtDue: 16000 } } });
    eq((ctx.invFinalApproval(rec, 16000) || {}).by, 'Ashley Jerome', 'the same figure: approved');
    eq(ctx.invFinalApproval(rec, 16001), null, 'a dollar off: not approved');
    eq(ctx.invFinalApproval(rec, undefined), null, 'no figure to compare: not approved (fails closed)');
    eq(ctx.invFinalApproval(rec, null), null, 'nor with null');
    const zero = J({ 'invoice:final': { approval: { by: 'A', at: 'x', amtDue: 0 } } });
    eq(ctx.invFinalApproval(zero, null), null, '⚠ null is not 0: a paid-up final approved at $0 is not approved by a missing figure');
    eq((ctx.invFinalApproval(zero, 0) || {}).by, 'A', 'while an actual $0 matches');
    eq(ctx.invFinalApprovalStaleTxt(rec, 16000), '', 'nothing to explain while it still describes the figure');
    eq(ctx.invFinalApprovalStaleTxt(J({}), 16000), '', 'nor when there is no record');
    has(ctx.invFinalApprovalStaleTxt(rec, 18000), 'approved it at $16,000', 'a stale record explains itself');
    eq(ctx.recordInvFinalApproval(null, 'A'), null, 'the writer refuses no job');
    eq(ctx.recordInvFinalApproval(jobOf(ctx, 2), ''), null, 'and no approver');
    eq(!!jobOf(ctx, 2).docState, false, 'and writes nothing when it refuses');
    const w = ctx.recordInvFinalApproval(jobOf(ctx, 2), 'Anthony Graziano');
    eq((w || {}).amtDue, 16000, '⚠ the figure is read off invoiceHtml at the moment of the PIN, never passed in');
    const st = ctx.docState(jobOf(ctx, 2), 'invoice:final');
    st.draftedAt = '2026-09-29T11:00:00Z';        // the send record later written on the same key
    eq(((jobOf(ctx, 2).docState['invoice:final'] || {}).approval || {}).by, 'Anthony Graziano', 'a send or filing written on the same key rides beside the approval, it does not replace it');
  }

  group('⚠⚠ H1 the three page globals are GONE, and nothing reads a job for the PIN off page state');
  {
    for (const g of ['invApproved', 'invApprovedBy', 'invApprovedAt']) {
      ok(!new RegExp('(^|\\n)var\\s+' + g + '\\s*=').test(SRC), g + ' is not declared');
      ok(!bareRead(LIVE, g), g + ' appears on no live line anywhere in the app');
    }
    const cip = stripLine(H.fn('checkInvPin'));
    lacks(cip, 'currentInvJobId', 'checkInvPin finds its job on the modal, never through currentInvJobId');
    has(cip, 'recordInvFinalApproval(', 'and records through the one writer');
    const dai = stripLine(H.fn('dashApproveInvoice'));
    lacks(dai, 'currentInvJobId', 'dashApproveInvoice writes no currentInvJobId');
    lacks(dai, 'currentInvStage', 'nor currentInvStage');
    lacks(dai, 'invRequiresApproval', 'nor invRequiresApproval');
    has(dai, 'openInvPinModal(jobId)', 'it binds the modal to the job pressed');
    has(stripLine(H.fn('recordInvFinalApproval')), "docState(job, docKeyFor('invoice', { stage: 'final' }))", 'the writer goes through the docState accessor, which stamps');
  }

  // ═══ M1 ════════════════════════════════════════════════════════════════════
  for (const svcA of ['downsizing', 'probate']) {
    const form = svcA === 'probate' ? 'the estate form' : 'the standard form';
    group('⚠⚠ M1 ' + form + ': A keeps its own approver after B is approved');
    {
      const ctx = agrCtx(svcA, 'downsizing');
      const A = () => ctx.agreementHtml(ctx.jobs[0], null);
      eq(band(A()), 'Anthony Graziano | September 1, 2026', 'before: A names its own approval');
      eq(ctx.ensureAgreementApproved(2), '', 'B is approved through the real stamp');
      eq([ctx.jobs[1].agrApprovedBy, ctx.jobs[1].agrApprovedAt], ['Ashley Jerome', TODAY_LONG], 'fixture: B is approved by Ashley, today');
      // The page globals that then described B are deleted (2026-09-30, audit P14): nothing on the page holds a copy.
      eq([ctx.agrApprovedBy, ctx.agrApprovedAt], [undefined, undefined], 'and the page keeps no copy of B\'s approval');
      eq(band(A()), 'Anthony Graziano | September 1, 2026', '⚠⚠ after: A STILL names Anthony, September 1 — it used to read Ashley, today');
      eq(band(ctx.agreementHtml(ctx.jobs[1], null)), 'Ashley Jerome | ' + TODAY_LONG, 'and B names its own');
      eq(band(ctx.signingPacketHtml(1)), 'Anthony Graziano | September 1, 2026', '⚠ the signing packet — the HTML converted for DocuSign — carries A\'s approval');
      if (svcA === 'probate') has(ctx.agreementHtml(ctx.jobs[0], null), 'Tripp Butler', 'fixture: this really is the estate form');
    }
  }

  group('⚠⚠ M1 the other direction: a fresh page, and page globals left pointing elsewhere');
  {
    const ctx = agrCtx('downsizing', 'probate');
    eq([ctx.agrApproved, ctx.agrApprovedBy], [undefined, undefined], 'fixture: a fresh page — no page-level approval exists (deleted 2026-09-30)');
    eq(band(ctx.agreementHtml(ctx.jobs[0], null)), 'Anthony Graziano | September 1, 2026', '⚠ A is approved and shows it — it used to read NO band on a fresh page');
    ctx.agrApproved = true; ctx.agrApprovedBy = 'Mallory'; ctx.agrApprovedAt = 'January 1, 2020';
    // ⚠ ABSENCE is counted, never read through band(): band() needs "Approved by X on Y", so a band with
    // no name or no date reads '(no band)' while sitting right there in the markup. The revert sweep
    // found exactly that — a nameless band passed the no-approver check below.
    eq(bandCount(ctx.agreementHtml(ctx.jobs[1], null)), 0, 'an unapproved job reads no band, whatever the page globals say (estate form)');
    eq(band(ctx.agreementHtml(ctx.jobs[0], null)), 'Anthony Graziano | September 1, 2026', 'and an approved one reads its own, not the page\'s');
    ctx.jobs[1].svc = 'downsizing'; delete ctx.jobs[1].executor; delete ctx.jobs[1].matterType;
    eq(bandCount(ctx.agreementHtml(ctx.jobs[1], null)), 0, 'the same on the standard form');
    ctx.jobs[1].agrApproved = true;                // flagged but no approver recorded
    eq(bandCount(ctx.agreementHtml(ctx.jobs[1], null)), 0, 'approved with no approver on record: no band rather than a blank name');
    lacks(ctx.agreementHtml(ctx.jobs[1], null), 'Approved by </div>', 'never "Approved by" over nobody');
    ctx.jobs[1].agrApprovedBy = 'Ashley Jerome'; delete ctx.jobs[1].agrApprovedAt;
    has(ctx.agreementHtml(ctx.jobs[1], null), 'Approved by Ashley Jerome</div>', 'no date on record: the name alone, never "on undefined"');
  }

  group('M1 the band is escaped, on both forms');
  {
    for (const svc of ['downsizing', 'probate']) {
      const ctx = agrCtx(svc, 'downsizing');
      ctx.jobs[0].agrApprovedBy = "O'Hara & <Sons>";
      const h = ctx.agreementHtml(ctx.jobs[0], null);
      has(h, '&lt;Sons&gt;', svc + ': a stored approver name is escaped');
      lacks(h, '<Sons>', svc + ': never emitted as markup');
    }
    eq((SRC.match(/function _agrApprovedStamp\(/g) || []).length, 1, 'one band renderer');
    eq((LIVE.match(/_agrApprovedStamp\(/g) || []).length, 3, 'its definition and two readers, nothing else');
    has(H.fn('agreementHtml'), '_agrApprovedStamp(job)', 'the standard form reads it for THIS job');
    has(H.fn('probateAgreementHtml'), '_agrApprovedStamp(job)', 'and so does the estate form');
  }

  // ═══ _actor: the same defect on internal attribution ═══════════════════════
  // Found in passing on M1 and fixed the same day on Anthony's word ("yes, fix the _actor fallback
  // too"). `_actor(job)` fell back to the page global `agrApprovedBy` — whichever job the page approved
  // LAST — so on a job whose own agreement was not approved yet it stamped ANOTHER client's approver
  // as the person who drafted and sent the estimate, and on a job whose own approver was blank, as the
  // person who activated and closed it. Three jobs, because it takes a third to have no approval:
  // A approved by Anthony on September 1, B approved by Ashley through the real stamp, C neither.
  function actorCtx() {
    const said = { notices: [], alerts: [] };
    const ctx = sandbox({
      fns: AGR_FNS.concat(['_actor', '_handoverBy', 'docRecordSent', 'markDocSent', 'applyJobTransition', 'paymentStageWord', 'docState',
        '_jobTouch', '_ymdLocal', '_stamp', '_todayStr', 'fmtDate2', 'stagePaidTotal', 'paymentCounts', 'jobPayments', 'staleDraftNote', 'staleDraftsOf', 'draftIsStale', 'draftOutstanding', 'staleDocName', '_draftDay', '_andJoin', 'noDraftToConfirm', 'docDraftPending']),
      vars: AGR_VARS.concat(['DOC_SEND_PROVIDERS', 'JOB_TRANSITIONS']),
      stubs: {
        document: domStub({}), currentEstimate: null,
        estimateStore: { 1: { estimate: AEST(1), approved: true, approvedBy: 'Anthony Graziano' },
                         2: { estimate: AEST(2), approved: true, approvedBy: 'Ashley Jerome' },
                         3: { estimate: AEST(3), approved: false } },
        populateAgrSelect() {}, renderAgreement() {}, updateAgrUI() {}, exportSigningPacketToDrive() {},
        saveJobs() {}, syncJobToSheets() {}, setTimeout() {},
        _approvedEstimateHtml() { return ''; },
        // markDocSent's estimate branch primes the estimate tab and calls the legacy recorder; both
        // have their own suites. What this file asks is who the send record NAMES.
        _primeEstimateFor() { return true; }, markEstimateSent() {},
        dashNotice(type, msg) { said.notices.push({ type, msg }); }, _dashRedraw() {},
        // The activation and close gates have their own suites; here they are open so the stamp is reached.
        jobActivationBlockers() { return []; }, jobCloseBlockers() { return []; },
        confirm() { return true; }, alert(m) { said.alerts.push(m); } } });
    ctx.jobs = [
      { id: 1, hvlId: 'HVL-0001', name: 'Alder', svc: 'downsizing', addr: '1 Ocean Blvd', tc: 'Anthony Graziano',
        won: true, approved: true, status: 'won', agrApproved: true, agrApprovedBy: 'Anthony Graziano', agrApprovedAt: 'September 1, 2026' },
      { id: 2, hvlId: 'HVL-0002', name: 'Birch', svc: 'downsizing', addr: '2 Ocean Blvd', tc: 'Ashley Jerome',
        won: true, approved: true, status: 'won' },
      { id: 3, hvlId: 'HVL-0003', name: 'Cedar', svc: 'downsizing', addr: '3 Ocean Blvd', tc: 'Carla Ortiz',
        status: 'new' } ];
    ctx.__said = said;
    return ctx;
  }

  group('⚠⚠ _actor names this job\'s approver or nobody — never the page\'s');
  {
    const ctx = actorCtx();
    const [A, B, C] = ctx.jobs;
    eq(ctx.ensureAgreementApproved(2), '', 'fixture: B is approved through the real stamp');
    eq(B.agrApprovedBy, 'Ashley Jerome', 'fixture: B names Ashley');
    // The page global that also named her is gone (2026-09-30, audit P14): nothing is left to fall back to.
    eq(ctx.agrApprovedBy, undefined, 'and the page keeps no copy of it');
    eq(C.agrApprovedBy, undefined, 'fixture: C has no agreement approval of its own');
    eq(ctx._actor(C), '', '⚠⚠ C gets NOBODY — it used to get Ashley Jerome, B\'s approver');
    eq(ctx._actor(A), 'Anthony Graziano', 'A still gets its own approver, though the page names Ashley');
    eq(ctx._actor(B), 'Ashley Jerome', 'and B its own');
    eq([ctx._actor(null), ctx._actor(undefined)], ['', ''], 'no job, nobody');
    ctx.agrApprovedBy = 'Mallory';
    eq([ctx._actor(A), ctx._actor(C)], ['Anthony Graziano', ''], 'whatever the page global holds, it is never the answer');
  }

  group('⚠⚠ _actor driven: an estimate drafted and sent for a job with no approval names its own concierge');
  {
    const ctx = actorCtx();
    const C = ctx.jobs[2];
    ctx.ensureAgreementApproved(2);
    ctx.docRecordSent({ job: C, key: 'estimate' }, { provider: 'gmail', draftUrl: 'https://mail.google.com/x', pdfOk: true });
    const st = () => (C.docState || {}).estimate || {};
    ok(!!st().draftedAt, 'fixture: the draft was recorded');
    eq(st().draftedBy, 'Carla Ortiz', '⚠⚠ drafted by C\'s own concierge — it used to read Ashley Jerome, who approved B');
    eq(st().sentAt, undefined, 'fixture: a Gmail draft is not a send — the confirming tap records that');
    ctx.markDocSent(3, 'estimate');
    ok(!!st().sentAt, 'fixture: the confirming tap recorded the send');
    eq(st().sentBy, 'Carla Ortiz', '⚠⚠ sent by C\'s own concierge — it used to read Ashley Jerome');
    ok(!!(C.at || {})['docState:estimate'], 'fixture: written through the docState accessor, which stamps');
  }

  group('_actor driven, the converse: a job with its own approver keeps it, on the DocuSign send too');
  {
    const ctx = actorCtx();
    const A = ctx.jobs[0];
    ctx.ensureAgreementApproved(2);
    eq(ctx.jobs[1].agrApprovedBy, 'Ashley Jerome', 'fixture: B was approved last, by Ashley');
    ctx.docRecordSent({ job: A, key: 'agreement' }, { provider: 'docusign', pdfOk: true, extra: { envelopeId: 'env-1' } });
    eq([A.docState.agreement.draftedBy, A.docState.agreement.sentBy], ['Anthony Graziano', 'Anthony Graziano'], 'A\'s agreement is sent by A\'s approver');
    eq(A.agrSentBy, 'Anthony Graziano', 'and the legacy mirror says the same — no correct name is lost');
  }

  // ⚠ RESTATED 2026-09-30 (audit P14, Anthony's answer): the activation and close stamps carry the ASSIGNED
  // CONCIERGE, and only a job with nobody assigned falls back to its own approver — never another job's.
  group('⚠⚠ activating and closing a job stamps its assigned concierge, never another job\'s approver');
  {
    const ctx = actorCtx();
    const [A, , C] = ctx.jobs;
    ctx.ensureAgreementApproved(2);
    C.status = 'won';
    ok(ctx.applyJobTransition(C), 'fixture: C activates');
    eq([C.status, !!C.activatedOn], ['active', true], 'fixture: and is stamped');
    eq(C.activatedBy, 'Carla Ortiz', '⚠⚠ activated under C\'s own concierge — it used to read Ashley Jerome, who approved another job');
    ok(ctx.applyJobTransition(C), 'fixture: C closes');
    eq([C.status, !!C.deliveredOn], ['closed', true], 'fixture: and is stamped');
    eq(C.deliveredBy, 'Carla Ortiz', '⚠⚠ handed over under C\'s own concierge — never the page\'s approver');
    ok(ctx.applyJobTransition(A), 'fixture: A activates');
    eq(A.activatedBy, 'Anthony Graziano', 'the converse: A is activated under its own concierge');
    // Nobody assigned: the stamp falls back to what it recorded before — this job's approver, or nobody.
    const D = { id: 4, name: 'Dogwood', svc: 'downsizing', status: 'won', tc: '' };
    ok(ctx.applyJobTransition(D), 'fixture: D, with no concierge and no approval, activates');
    eq(D.activatedBy, '', 'no concierge and no approver: nobody on record');
    const E = { id: 5, name: 'Elm', svc: 'downsizing', status: 'won', agrApprovedBy: 'Anthony Graziano' };
    ok(ctx.applyJobTransition(E), 'fixture: E, approved but unassigned, activates');
    eq(E.activatedBy, 'Anthony Graziano', 'no concierge: its own approver, as before');
    eq(ctx.__said.alerts, [], 'fixture: nothing refused');
  }

  // ⚠ RESTATED 2026-09-30 (audit P14): `updateAgrUI` reads the job's own record now and the three globals
  // are deleted, so the one reader this group used to pin is gone too.
  group('⚠⚠ the page-level agreement approval is gone, and nothing reads it');
  {
    // A write is not a read: `agrApprovedBy = ...` targets are stripped before looking. What survives is
    // every place the page's copy is TAKEN as the answer, and there must be exactly one — the retired
    // Agreement tab's own banner, which paints for `currentAgrJobId`, the job `loadAgreement` primed the
    // globals from, and has had no nav button since 2026-09-11. `_actor` read it too until 2026-09-29.
    const readersOf = (v) => {
      const out = [];
      for (const n of FN_NAMES) {
        let b; try { b = stripLine(H.fn(n)); } catch (e) { continue; }
        if (bareRead(b.replace(new RegExp('(^|[^.\\w$])' + v + '\\s*=(?!=)', 'g'), '$1'), v)) out.push(n);
      }
      return out.sort();
    };
    eq(readersOf('agrApprovedBy'), [], '⚠⚠ agrApprovedBy: read by nothing — the retired tab\'s banner reads the job');
    eq(readersOf('agrApprovedAt'), [], 'agrApprovedAt: the same');
    eq(readersOf('agrApproved'), [], 'agrApproved: read by nothing');
    has(stripLine(H.fn('updateAgrUI')), '_agrJ.agrApprovedBy', 'the banner names the approver off the job it paints');
    // ⚠ Not vacuous: outside any function too, and the scan sees the lines it exists for.
    // (The declaration `var agrApprovedBy = ''` is a write, and the lookahead drops it with the others.)
    const readsInFile = (v) => (LIVE.match(new RegExp('(^|[^.\\w$])' + v + '(?![\\w$])(?!\\s*=(?!=))', 'g')) || []).length;
    eq(readsInFile('agrApprovedBy'), 0, 'no read of agrApprovedBy anywhere in the app');
    eq(readsInFile('agrApproved'), 0, 'and none of agrApproved');
    ok(readsInFile('_agrJ') > 0, 'fixture: the scan does see bare reads in the live source');
    lacks(stripLine(H.fn('_actor')), 'agrApprovedBy ||', '_actor keeps no fallback to the page');
    ok(bareRead(stripLine("function _actor(job) {\n  return (job && job.agrApprovedBy) || agrApprovedBy || '';\n}"), 'agrApprovedBy'),
      'the scan catches the line this replaced');
  }

  // ═══ the PDF: the band can never reach a client PDF ════════════════════════
  group('⚠⚠ every client document kind hides .approved-stamp in its PDF');
  {
    const ctx = sandbox({ vars: ['DOC_ACTIONS', 'DOC_KINDS'] });
    const kinds = Object.keys(ctx.DOC_ACTIONS);
    eq(kinds.slice().sort(), ctx.DOC_KINDS.slice().sort(), 'the registry and DOC_KINDS name the same kinds');
    ok(kinds.length >= 3, 'fixture: at least the estimate, the agreement and the invoice');
    for (const k of kinds) {
      has(ctx.DOC_ACTIONS[k].pdfCss || '', '.approved-stamp{display:none', k + ': pdfCss hides the band');
    }
    // The only two ways a client document becomes a PDF, and both hand over the kind's pdfCss.
    // RESTATED 2026-10-01 (P17): two more callers, each filing a document that carries no approval band — the accepted
    // change order (fileChangeOrder) and the probate package's pages (_pkgFileAll). Still exact, so a sixth fails here.
    eq((SRC.match(/_exportDoc\(/g) || []).length, 5, '_exportDoc: the definition, the two client-document paths and the two P17 filings');
    for (const f of ['fileChangeOrder', '_pkgFileAll']) has(H.fn(f), '_exportDoc(', f + ' is one of the two');
    for (const f of ['printChangeOrder', 'printCourtInventory', 'printTrustSchedule', 'printEstateInventoryReport',
                     'printContentsList', 'printAppraisalWorklist', 'probatePackageRecordHtml'])
      lacks(H.fn(f), 'approved-stamp', f + ' prints no approval band, so filing it needs no pdfCss');
    has(H.fn('docPdfBase64'), 'spec.cfg.pdfCss', 'docPdfBase64 passes the kind\'s pdfCss');
    has(H.fn('docFile'), 'spec.cfg.pdfCss', 'docFile passes the kind\'s pdfCss');
  }

  group('⚠⚠ driven: the document handed to the PDF converter and to Drive carries the rule');
  {
    // The real stylesheet, so the base `.approved-stamp` rule is in the document ahead of ours.
    const firstStyle = (SRC.match(/<style>([\s\S]*?)<\/style>/) || [])[1] || '';
    const posted = [], uploaded = [];
    const ctx = sandbox({ fns: ['docPdfBase64', 'docFile', '_exportDoc'], vars: ['DOC_ACTIONS', 'DOC_KINDS'], stubs: {
      document: { querySelectorAll: (sel) => (sel === 'style' ? [{ textContent: firstStyle }] : []) },
      SHEETS_SYNC_URL: 'https://example.invalid/exec',
      _appsScriptPost(url, body, cb) { posted.push(body); cb(true, { base64: 'UERG' }); },
      _backendErrorKind() { return ''; },
      resolveSubfolderId(job, sub, cb) { cb('F1'); },
      _jobRootFolderId() { return 'F0'; },
      uploadHtmlToDrive(target, name, doc, cb) { uploaded.push(doc); cb(true, 'https://drive/x', {}); },
      docRecordFiled() {}, showSyncBadge() {}, _docNotice() {} } });
    ok(/\.approved-stamp\{text-align:center/.test(firstStyle), 'fixture: the real base rule is in the page stylesheet');
    const job = { id: 7, hvlId: 'HVL-0007' };
    const BAND = '<div class="approved-stamp"><div class="approved-stamp-text">Approved</div></div><p>body</p>';
    for (const k of ctx.DOC_KINDS) {
      const cfg = Object.assign({}, ctx.DOC_ACTIONS[k], { html: () => BAND });
      const spec = { kind: k, stage: k === 'invoice' ? 'final' : null, key: k, job, cfg, names: { drive: k + '.html' } };
      let got = null;
      ctx.docPdfBase64(spec, BAND, (b64) => { got = b64; });
      const pdfDoc = String((posted[posted.length - 1] || {}).html || '');
      ok(got === 'UERG', k + ': fixture — the converter was reached');
      const tail = pdfDoc.slice(pdfDoc.lastIndexOf('<style>'));
      has(tail, '.approved-stamp{display:none!important;}', k + ': the document posted to htmlToPdf hides the band');
      ok(pdfDoc.indexOf('.approved-stamp{text-align:center') < pdfDoc.lastIndexOf('.approved-stamp{display:none'), k + ': after the page\'s own rule');
      ctx.docFile(spec, { auto: true });
      has(String(uploaded[uploaded.length - 1] || ''), '.approved-stamp{display:none!important;}', k + ': the copy filed to Drive hides it too');
    }
  }

  // ═══ THE NET ═══════════════════════════════════════════════════════════════
  // Every function a client-document builder can reach, walked from the registry's own closures,
  // may not read a page-level approval variable. The next one added to the page cannot quietly
  // become the thing a document asks.
  const PAGE_APPROVAL = ['invApproved', 'invApprovedBy', 'invApprovedAt', 'agrApproved', 'agrApprovedBy',
    'agrApprovedAt', 'estimateApproved', 'estimateSubmitted', 'approvedBy', 'approvedAt',
    'discountRevision', 'invRequiresApproval', 'invBlocked'];
  const GONE = ['invApproved', 'invApprovedBy', 'invApprovedAt', 'agrApproved', 'agrApprovedBy', 'agrApprovedAt'];
  // A top-level var whose name says "approv" must be on the list above or named here with its reason.
  const APPROV_EXEMPT = {
    _approvalWatch: 'the estimate approval POLL (a timer handle and a job id) — not an approval',
    MANAGER_APPROVAL_EMAIL: 'the mailbox approval requests go to — a constant address, not an approval',
    ESTIMATE_OUT_FOR_APPROVAL_TXT: 'the sentence a door prints while a manager has the estimate — a constant, not an approval',
  };

  group('⚠⚠ THE NET: no client-document builder reads a page-level approval variable');
  {
    const reg = sandbox({ vars: ['DOC_ACTIONS'] }).DOC_ACTIONS;
    const PROPS = ['html', 'emailHtml', 'text', 'mailto', 'subject', 'cc', 'blocker'];
    const closures = [];
    for (const k of Object.keys(reg)) for (const p of PROPS) if (typeof reg[k][p] === 'function') closures.push({ name: k + '.' + p, body: stripLine(reg[k][p].toString()) });
    const seen = new Set(); const stack = [];
    for (const c of closures) for (const f of callsIn(c.body)) stack.push(f);
    while (stack.length) {
      const n = stack.pop(); if (seen.has(n)) continue; seen.add(n);
      let b; try { b = stripLine(H.fn(n)); } catch (e) { continue; }
      for (const f of callsIn(b)) if (!seen.has(f)) stack.push(f);
    }
    // ⚠ Not vacuous: the walk has to reach the builders it exists for.
    for (const must of ['invoiceHtml', 'agreementHtml', 'probateAgreementHtml', 'signingPacketHtml',
      'clientEstimateHtml', 'buildInvoiceEmailHtml', 'buildAgreementEmailHtml', 'buildEstimateEmailHtml',
      '_agrApprovedStamp', 'invFinalApproval', 'invFinalApprovalStaleTxt']) ok(seen.has(must), 'the walk reaches ' + must);
    ok(seen.size > 60, 'and a real call graph (' + seen.size + ' functions), not a handful');
    const hits = [];
    for (const c of closures) for (const v of PAGE_APPROVAL) if (bareRead(c.body, v)) hits.push(c.name + ' → ' + v);
    for (const n of seen) {
      let b; try { b = stripLine(H.fn(n)); } catch (e) { continue; }
      for (const v of PAGE_APPROVAL) if (bareRead(b, v)) hits.push(n + ' → ' + v);
    }
    eq(hits, [], '⚠⚠ no builder, no email, no gate reads a page-level approval variable');
  }

  group('THE NET can fire, and the list describes the page');
  {
    ok(bareRead('return agrApprovedBy;', 'agrApprovedBy'), 'a bare read is caught');
    ok(bareRead('x = (agrApproved && agrApprovedBy) ? 1 : 0', 'agrApproved'), 'inside an expression too');
    ok(!bareRead('return job.agrApprovedBy;', 'agrApprovedBy'), 'a field on the job is not a page variable');
    ok(!bareRead('var invApprovedByX = 1;', 'invApprovedBy'), 'a longer name is not a hit');
    eq(stripLine("a(); // agrApprovedBy is explained here\nb('https://x.example/y');"), "a(); \nb('https://x.example/y');", 'comments are stripped, URLs are not');
    for (const v of PAGE_APPROVAL) {
      const declared = new RegExp('(^|\\n)var\\s+' + v + '\\s*=').test(SRC);
      ok(GONE.indexOf(v) >= 0 ? !declared : declared, v + (GONE.indexOf(v) >= 0 ? ' stays deleted' : ' is real page state'));
    }
    const approvVars = [];
    { const re = /(^|\n)var\s+([A-Za-z_$][\w$]*)\s*=/g; let m; while ((m = re.exec(SRC))) if (/approv/i.test(m[2])) approvVars.push(m[2]); }
    ok(approvVars.length >= 7, 'fixture: the scan finds the approval variables (' + approvVars.length + ')');
    const unlisted = approvVars.filter((v) => PAGE_APPROVAL.indexOf(v) < 0 && !APPROV_EXEMPT[v]);
    eq(unlisted, [], 'every page variable named for an approval is on the net\'s list or exempt with a reason');
  }
};
