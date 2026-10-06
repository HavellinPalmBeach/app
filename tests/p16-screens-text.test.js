'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// P16 (2026-09-30), workstream W4 "screens-text": the screen defects on CLAUDE.md's known-bug list.
//
//   B3   Field mode hid Save Estimate (and the #e-fb strip every refusal prints to) inside
//        #est-summary-col, while the field banner said the estimate "saves in full".
//   B4   Person-entered text went into innerHTML unescaped: the dashboard's client card (notes, the
//        concierge, the representative, phones, emails), and the concierge's name, contact line and bio
//        on the client estimate and every invoice.
//   B13  Answering the documentation tier on Edit Client never reached an estimate that was still a
//        draft (seedDocScopeFromJob ran on a fresh build only). A draft now FOLLOWS the tier; an approved
//        estimate, or one out for approval, is never repriced by the app and the save names the route.
//   B21  Intake's "How is this estate being administered?" is required and carried no asterisk.
//   B23  The Job Plan's sourcing card put contact 1's name beside the firm's OFFICE number.
//   B24  A Home Prep worksheet with declutter hours filed an empty room table and no vendor list.
//   and the stale in-app text, each checked against the code it describes (measured where a figure).
//
// Everything is driven through the real code: the real renderers, the real save, the real engine
// (driveCalcAll). The browser step (tests/browser/step48.js) proves the joins on the page.
// ─────────────────────────────────────────────────────────────────────────────

const { sandbox, source, fn, domStub, driveCalcAll } = require('./harness');
// (No process.env.TZ here: nothing below reads a date, and run.js runs every file in one process, so a zone set
// at load would leak into the files after this one.)

const live = (t) => String(t).split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
const attempt = (f) => { try { return { ok: true, val: f() }; } catch (e) { return { ok: false, err: String(e && e.message || e) }; } };
const unesc = (s) => String(s).replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const text = (h) => String(h).replace(/<br>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\u00a0/g, ' ')
  .replace(/&times;/g, 'x').replace(/&minus;/g, '-').replace(/&middot;/g, '·').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

// The <div …> block opening at `at`, matched to its closing tag.
function divBlock(src, at) {
  if (at < 0) return '';
  const re = /<div\b|<\/div>/g;
  re.lastIndex = at;
  let depth = 0, m;
  while ((m = re.exec(src))) {
    depth += m[0] === '</div>' ? -1 : 1;
    if (depth === 0) return src.slice(at, m.index + 6);
  }
  return '';
}

// Every function and top-level var `roots` reach, walked off the source (p14-small-backlog.test.js's rule). `stop`
// names what the test supplies itself, so a lifted initialiser cannot overwrite the stub.
const SRC0 = source();
const ALL_FNS = new Set((SRC0.match(/(^|\n)function\s+([A-Za-z0-9_$]+)\s*\(/g) || []).map((s) => s.replace(/^\n?function\s+/, '').replace(/\s*\($/, '')));
const ALL_VARS = new Set((SRC0.match(/(^|\n)var\s+([A-Za-z0-9_$]+)\s*=/g) || []).map((s) => s.replace(/^\n?var\s+/, '').replace(/\s*=$/, '')));
const codeOnly = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).map((l) => l.replace(/\s\/\/\s.*$/, '')).join('\n')
  .replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, "''");
function closureLift(roots, stop, stubs) {
  const { decl } = require('./harness');
  const stopSet = new Set(stop || []);
  const fns = new Set(), vars = new Set();
  const queue = roots.map((r) => ['f', r]);
  while (queue.length) {
    const [k, name] = queue.shift();
    if (stopSet.has(name)) continue;
    let body;
    if (k === 'f') { if (fns.has(name)) continue; fns.add(name); try { body = codeOnly(fn(name)); } catch (e) { continue; } }
    else { if (vars.has(name)) continue; vars.add(name); try { body = codeOnly(decl(name)); } catch (e) { continue; } }
    for (const m of body.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)) if (ALL_FNS.has(m[1]) && !stopSet.has(m[1])) queue.push(['f', m[1]]);
    for (const m of body.matchAll(/[(,]\s*([A-Za-z_$][\w$]*)\s*[,)]/g)) if (ALL_FNS.has(m[1]) && !stopSet.has(m[1])) queue.push(['f', m[1]]);
    for (const m of body.matchAll(/\b([A-Za-z_$][\w$]*)\b/g)) if (ALL_VARS.has(m[1]) && !stopSet.has(m[1])) queue.push(['v', m[1]]);
  }
  return sandbox({ fns: [...fns], vars: [...vars], stubs: stubs || {} });
}

// ── Edit Client, opened and saved the way a browser would (edit-client-intake-rules.test.js's pattern) ──
function formFromHtml(html) {
  const out = {};
  (html.match(/<input\b[^>]*>/g) || []).forEach((t) => {
    const id = /\bid="([^"]+)"/.exec(t); if (!id) return;
    if (/type="checkbox"/.test(t)) { out[id[1]] = / checked\b/.test(t); return; }
    const v = /\bvalue="([^"]*)"/.exec(t);
    out[id[1]] = v ? unesc(v[1]) : '';
  });
  (html.match(/<textarea\b[^>]*>[\s\S]*?<\/textarea>/g) || []).forEach((t) => {
    const id = /\bid="([^"]+)"/.exec(t); if (!id) return;
    out[id[1]] = unesc(t.replace(/^<textarea\b[^>]*>/, '').replace(/<\/textarea>$/, ''));
  });
  (html.match(/<select\b[^>]*>[\s\S]*?<\/select>/g) || []).forEach((t) => {
    const id = /\bid="([^"]+)"/.exec(t); if (!id) return;
    const opts = t.match(/<option\b[^>]*>/g) || [];
    const sel = opts.find((o) => / selected\b/.test(o)) || opts[0] || '';
    const v = /\bvalue="([^"]*)"/.exec(sel);
    out[id[1]] = v ? unesc(v[1]) : '';
  });
  return out;
}
const TIER_FNS = ['docTierOf', 'docTierDef', 'docTierScope', 'svcHasDocStep', 'seedDocScopeFromJob', 'estimateDocScope',
  'docScopeDef', 'docTierWord', 'docScopeWord', 'activeDocScope'];
const ROUTE_FNS = ['estimateRepriceRoute', 'estimateEditBlocker', 'priceChangeBlocker', 'estimateOutForApproval',
  'isAgreementSigned', 'isAgreementSent', 'agreementSignature', 'docSentAt', 'docKeyFor'];
const TIER_VARS = ['DOC_TIERS', 'DOC_TIER_FROM_SCOPE', 'DOC_SCOPES', 'JOB_STEPS'];
const EC_FNS = ['showEditClient', 'courtRecordRequired', 'courtRecordShown', 'jobOnProbateTrack', 'saveClientEdit', 'coFiduciaryRepClash', 'coFiduciaryRepRefusal', 'followJobService', 'jobListEntries', 'ecToggleProbate', 'ecPaintSvcFlag', 'probateSvcFlag',
  'executorAuthOptionsHtml', 'resolveExecutorAuth', 'ecIsProbateSvc', 'ecIsEstateSvc', 'ecIsMoveSvc', 'ecDocGateChange',
  'docTierOptionsHtml', 'docTierScopeMirror', 'esc', 'onDocGateChange',
  'houseFlagInputsHtml', 'houseFlagsOf', '_houseFlagRowClass', 'docLevelFloor', 'gateDispute', '_gateYes', '_gate706', 'isDecedentJob',
  'docLevelFloorReason', 'resolveDocLevel', 'docStandardEffect', 'isFormalDoc', 'invAppraisalThreshold', 'matterTypeOf', 'matterDef',
  'invFiduciaryMode', 'readHouseFlagInputs', 'inventoryDeadlineFrom', '_ymdLocal', 'referralSourceKind',
  'referralSourceOptionsHtml', 'referralPartnerOptionsHtml', 'jobRefersToPartner', 'referralIdOf', 'lookupReferralById',
  'svcFamilyOptions', 'svcFamily', 'sameSvcFamily', 'conciergeOptionsHtml', 'getAllActiveTC', '_byContractorName', 'samePerson',
  'canonPersonName', 'executorRoleOptionsHtml', 'dateChainConflicts', 'dateChainFlagHtml', 'intakeAsksHouseContents', 'houseFlagAsked',
  'clientMissingFields', 'readReferralInputs', 'showHouseFlagRows', 'onReferralSourceChange', 'populateReferralPicker',
  '_stampChangedKeys', '_jobTouch', 'docTierChangeNotice', 'followDocTier', 'roundCents', 'fmt', 'propertySaleAsked', 'trustRecordShown', 'executorAuthField', 'coFiduciaryBlockHtml', 'jobListEntries', 'readCoFiduciaryRows', 'saveCoFiduciaryRows', 'estateAuthority', '_coFidRowNums'].concat(TIER_FNS, ROUTE_FNS);
const EC_VARS = ['EXECUTOR_AUTH_OPTIONS', 'SVC_LABELS', 'HOUSE_FLAGS', 'FIREARMS_PROTOCOL_DOC', 'DECEDENT_SERVICES',
  'INV_APPRAISAL_THRESHOLD', 'INV_APPRAISAL_THRESHOLD_DISPUTED', 'MATTER_TYPES', 'REFERRAL_SOURCES', 'SVC_ORDER', 'EXECUTOR_ROLES',
  'DEFAULT_CONTRACTORS', 'PERSON_NAME_ALIASES', 'ESTIMATE_EDIT_ROUTE_TXT', 'ESTIMATE_OUT_FOR_APPROVAL_TXT',
  '_estimateDocScope', '_estimateDocTier', 'ESTATE_AUTHORITY_WORDS', 'ESTATE_AUTHORITIES'].concat(TIER_VARS);

// Open Edit Client on `job`, apply `edits` to what the browser would show, set page `state` (the build on
// Build Estimate), press Save. `said` collects the notice, the alerts and the calcAll the save runs.
function editSave(job, edits, opts) {
  opts = opts || {};
  const said = { calc: 0, alert: '' };
  const mk = (d, jobsArr) => sandbox({ fns: EC_FNS, vars: EC_VARS, stubs: Object.assign({
    document: d, jobs: jobsArr, estimateStore: JSON.parse(JSON.stringify(opts.store || {})), contractors: [],
    referralDirectory: [], REFERRAL_SYNC_URL: '', estimateApproved: false, estimateSubmitted: false, currentEstimate: null,
    saveJobs() {}, syncJobToSheets() {}, renderClientDashboard() {}, renderJobs() {},
    calcAll: () => { said.calc++; },
    dashNotice: (t, m) => { said.type = t; said.notice = m; }, alert: (m) => { said.alert += m; } }, opts.stubs || {}) });
  const probe = domStub({});
  const r = mk(probe, [JSON.parse(JSON.stringify(job))]);
  r.showEditClient(job.id);
  const html = probe.getElementById('edit-client-modal').innerHTML;
  const form = Object.assign(formFromHtml(html), edits || {});
  const rendered = new Set((html.match(/\bid="([^"]+)"/g) || []).map((m) => m.slice(4, -1)));
  const d = domStub(form);
  const mint = d.getElementById.bind(d);
  d.getElementById = (id) => (/^ec-/.test(id) && !rendered.has(id) && !(id in (edits || {}))) ? null : mint(id);
  (html.match(/<[a-z]+\b[^>]*\bid="[^"]+"[^>]*>/g) || []).forEach((t) => {
    const id = /\bid="([^"]+)"/.exec(t)[1];
    let m; const re = /\bdata-([a-z-]+)="([^"]*)"/g;
    while ((m = re.exec(t))) mint(id).dataset[m[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = unesc(m[2]);
  });
  const c = mk(d, [JSON.parse(JSON.stringify(job))]);
  Object.assign(c, opts.state || {});
  const run = attempt(() => c.saveClientEdit(job.id));
  return { html, job: c.jobs[0], said, c, err: run.ok ? '' : run.err };
}

// An Estate Settlement whose documentation tier the tests move. Complete, so no required field is named.
const ESTATE = { id: 9, hvlId: 'HVL-0009', name: 'Eleanor Vance', fname: 'Eleanor', lname: 'Vance', svc: 'cleanout',
  addr: '4 Via Mizner', city: 'Palm Beach', zip: '33480', sqft: '3500', ptype: 'Estate', src: 'Family',
  referredByName: 'Joan Vance', start: '2026-10-12', tc: 'Ashley Jerome', deathDate: '2026-07-01', matterType: 'probate',
  executorFname: 'Joan', executorLname: 'Vance', executor: 'Joan Vance', executorRole: 'Personal Representative',
  executorPhone: '(561) 555-0199', executorEmail: 'joan@example.com', executorAuth: 'received',
  probateCase: '50-2026-CP-004411', probateAttyFname: 'Ann', probateAttyLname: 'Lowe', probateAttyName: 'Ann Lowe',
  probateAttyFirm: 'Lowe PA', probateAttyPhone: '(561) 555-0111', probateAttyEmail: 'ann@lowe.law',
  docTier: 'values', docScope: 'full', gate706: 'no', gateDispute: 'no', lettersDate: '2026-08-01', probateDeadline: '2026-09-30' };

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('B3 — field mode keeps Save Estimate, and the strip its refusals print to, on the phone');
  {
    const col = divBlock(src, src.indexOf('<div id="est-summary-col"'));
    ok(col.length > 2000 && col.indexOf('Estimate Summary') > 0, 'the column field mode hides is found and closed (' + col.length + ' chars)');
    lacks(col, 'saveEstimateAndPreview()', '⚠⚠ Save Estimate is not inside the column field mode hides');
    lacks(col, 'id="e-fb"', '⚠ nor is the strip Save and the microphone print their messages to');
    const card = divBlock(src, src.indexOf('<div class="card" id="est-save-card"'));
    has(card, '<button class="btn-p" onclick="saveEstimateAndPreview()">Save Estimate</button>', 'the save card carries Save Estimate, the same handler');
    has(card, '<div id="e-fb"></div>', 'and the message strip');
    has(card, 'onclick="resetEstimate()"', 'and Reset, as it did');
    const panel = divBlock(src, src.indexOf('<div class="panel" id="panel-estimate">'));
    eq((panel.match(/onclick="saveEstimateAndPreview\(\)"/g) || []).length, 1, 'one Save Estimate button on the screen, not a second copy for the phone');
    eq((panel.match(/id="e-fb"/g) || []).length, 1, 'and one strip');
    ok(panel.indexOf('id="est-save-card"') > 0 && panel.indexOf('id="est-summary-col"') > 0 && panel.indexOf('id="est-save-card"') > panel.indexOf('id="est-summary-col"'),
       'the card is still in the Build Estimate panel, under the summary where a desk had it (the lock and the screen own it)');

    // Every selector a field-mode rule hides, read off the stylesheet: none reaches the card.
    const css0 = src.slice(src.indexOf('<style>'), src.indexOf('</style>'));
    const css = css0.replace(/\/\*[\s\S]*?\*\//g, '');
    ok(css.length > css0.length * 0.3 && css.length > 20000, 'the stylesheet is read, comments stripped (' + css.length + ' chars)');
    const hidden = [];
    css.split('}').forEach((rule) => {
      const i = rule.indexOf('{'); if (i < 0) return;
      if (!/display\s*:\s*none/.test(rule.slice(i))) return;
      rule.slice(0, i).split(',').forEach((s) => { s = s.trim(); if (/^body\.field-mode\b/.test(s)) hidden.push(s); });
    });
    ok(hidden.indexOf('body.field-mode #est-summary-col') >= 0, 'the premise holds: field mode hides the summary column (' + hidden.length + ' hidden selectors)');
    const hits = hidden.filter((s) => /#est-save-card|#e-fb|#panel-estimate|\.card\b|\bbutton\b|\.btn-p\b/.test(s));
    eq(hits, [], '⚠ no field-mode rule hides the save card, the strip, the panel, a card or a button');

    const banner = divBlock(src, src.indexOf('<div id="field-banner">'));
    has(banner, '<strong>Save Estimate</strong> is at the foot of this screen', 'the banner says where Save Estimate is');
    has(banner, 'kept on this device only', 'and what happens until it is pressed');
    lacks(banner, 'saved in full', '⚠ and no longer promises a save that happened on nobody\'s press');
    lacks(live(fn('setFieldMode')), 'saves in full', 'nor does the Field button\'s tooltip');

    // The refusal lands on the strip that is now on the phone: driven, a save with nothing scored.
    const d = domStub({ 'e-job': '7', 'e-propval': '1500000' });
    const said = [];
    const S = attempt(() => sandbox({ fns: ['saveEstimateAndPreview', 'estimateContractBlocker', 'estimateContractMissing', 'isDecedentJob',
      'matterTypeOf', 'matterDef', 'unscoredRoomNames', 'estimateRepriceRoute', 'roomScoreOf', 'roundCents', 'fmtHrs', 'fmt'].concat(TIER_FNS, ROUTE_FNS),
      vars: ['ESTIMATE_CONTRACT_FIELDS', 'MATTER_TYPES', 'DECEDENT_SERVICES', 'ESTIMATE_EDIT_ROUTE_TXT', 'ESTIMATE_OUT_FOR_APPROVAL_TXT'].concat(TIER_VARS),
      stubs: { document: d, jobs: [{ id: 7, svc: 'downsizing', name: 'Pat' }], estimateStore: {}, estimateApproved: false,
        currentEstimate: { svc: 'downsizing', havellinTotal: 0, rooms: [] }, showFB: (id, k, m) => said.push({ id, k, m }) } }));
    ok(S.ok, 'the save handler lifts' + (S.ok ? '' : ' — ' + S.err));
    if (S.ok) {
      S.val.saveEstimateAndPreview();
      eq((said[0] || {}).id, 'e-fb', 'a refusal prints to #e-fb — the strip in the save card');
      has((said[0] || {}).m, 'No rooms scored', 'naming what is missing');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('B4 — escLines: escaped first, then each line break a <br>');
  {
    const E = sandbox({ fns: ['escLines', 'esc'] });
    eq(E.escLines('Gate <b>4417</b> & dogs\nCall Joan first'), 'Gate &lt;b&gt;4417&lt;/b&gt; &amp; dogs<br>Call Joan first', 'markup is text, and the line is kept');
    eq(E.escLines('typed <br> here'), 'typed &lt;br&gt; here', '⚠ a typed "<br>" is shown as typed — the conversion never runs before the escape');
    eq(E.escLines('a\r\nb\rc'), 'a<br>b<br>c', 'a Windows or old-Mac line break is one line break');
    eq(E.escLines(null), '', 'nothing is nothing');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('B4 — the dashboard\'s client card shows what was typed as text');
  {
    const FNS = ['_dashUtilityBarHtml', '_jtDocViews', '_jtDraftLink', '_jtDriveLink', '_jtSendAction',
      'activeHouseFlags', 'agreementSignature', 'dashUtilityBar', 'driveFolderPending', 'depositPaidTotal', 'depositTargetFor',
      'docKeyFor', 'docSentAt', 'esignProviderKey', 'esignAvailable', 'esignJobWatches', 'field', 'fmt',
      'getJobActuals', 'jobLogEntries', 'houseFlagsOf', 'isAgreementSigned', 'isJobFunded', 'isJobWon',
      'jobActivationBlockers', 'resolveExecutorAuth', 'jobOnProbateTrack', 'estatePackageRoute', 'matterDef', 'matterTypeOf', 'invFiduciaryMode', 'isDecedentJob',
      'jobPayments', 'agrApprovalWithdrawn', 'jobTimeline', '_localDateOf', 'paymentStageWord', 'finalAwaitsHours', 'estimateIsFeeOnly', 'depositVoidFlag', 'agreementHandedOverInPerson',
      'jobTimelineActions', 'esignSignedCopyGaps', 'docReadOnlyWord', 'discountOfferBlocker', 'jobTimelineNext',
      'jobStageDoc', 'docReadiness', 'docDraftOnly', 'docTitle', 'docWord', '_jtDocSecondaries', 'docPreviewOnly',
      'agreementReady', 'jobTimelineDoc', 'jobSchedule', 'jtScheduleHtml', 'estWorkingDays', '_todayStr', '_ymdLocal', 'addWorkingDays',
      'jobProgress', 'roomStatusNormalize', 'workingDaysInclusive', 'approvedEstimateFor',
      'maybeStartJobsWatch', 'paymentSplit', 'renderClientDashboard', 'coFiduciaryRepClash', 'coFiduciaryRepRefusal', 'walkawaySettlementHtml', 'walkawaySettlement', 'jobRefundedTotal', 'refundCounts', 'coCardActions', 'sectionHdr', 'stagePaidTotal',
      'standingFlagLines', 'standingFlagsBlock', '_sfHost', '_sfRowHtml', 'mustFindItems', 'mustFoundOf', '_mustFindKey', '_mfHandle',
      'stopJobsWatch', 'unscoredRoomNames', 'isAgreementSent', 'jtBandHtml', 'jtTrackHtml', 'jtRailHtml', '_jtAtFmt', '_jtStateCls',
      'coWorkingDays', '_coPaceFix', 'coAcceptedHours', 'coHoursTotal', 'coHours', 'coInclTxt', 'estimateEditBlocker', 'priceChangeBlocker',
      'jobStatusView', 'jtDraftLine', 'staleDraftNote', 'staleDraftsOf', 'draftIsStale', 'draftOutstanding', 'staleDocName', '_draftDay',
      '_andJoin', '_dashNoticeHtml', 'estimateOutForApproval', 'priceAboveSent', 'docDraftPending', 'priceAboveAcceptance',
      '_approvedPriceAbove', 'jobReopenBlocker', 'coScopeLabel', 'coVendorAddsTxt', 'coVendorAdds', 'coHoursLabel', 'escLines', 'esc', 'dot', 'paymentCounts', 'paymentLive', 'isRefundRecord', 'finalCrewOnlyWarn', 'agreementChipFix', 'jobPaymentsListHtml',
      'probatePackageCardHtml', 'probatePackageBlocker', 'probatePackageAddressee', 'roundCents', 'fmtHrs', 'estateAuthority', 'jobFiduciaries', 'trustRecordShown', 'estateTaxReturnLineHtml', 'estateTaxReturnDue', 'jobListEntries', 'estateTaxReturn', 'esignFiledCopies', 'agreementHandOverDraftNote', 'estatePackageOrphanDraftNote', 'photoSharesLine', 'photoSharesOf'];
    const VARS = ['_driveFolderInFlight', 'EXECUTOR_AUTH_OPTIONS', 'MATTER_TYPES', 'DECEDENT_SERVICES', 'ESIGN_PROVIDERS',
      'FIREARMS_PROTOCOL_DOC', 'HOUSE_FLAGS', 'SF_HOSTS', 'JT_LEG_BREAK', 'JT_SHORT', 'JT_NEXT', 'SVC_LABELS',
      '_dashNotice', '_jobsWatch', 'JT_ROW_DOC', 'DOC_READY_WHY', 'DOC_KIND_WORD', 'DOC_STAGE_WORD', 'DOC_ACTIONS',
      'PRODUCTIVE_HRS_PER_DAY', 'jobPlanStore', 'PROJ_CREW_DAY', 'TC_DONE_STATUSES', 'PS_DONE_STATUSES', 'ROOM_STATUS_META',
      'ROOM_STATUS_LEGACY', 'EST_TOLERANCE_PCT', 'JOB_STATUS_LABELS', 'JOB_STATUS_DOT', '_dashShown', '_dashKeepNotice', 'PROBATE_PKG_KEY', 'ESTATE_PKG_ROUTES', 'ESTATE_AUTHORITY_WORDS', 'ESTATE_AUTHORITIES'];
    const render = (job, logs) => {
      const dom = domStub({});
      const r = attempt(() => {
        const c = sandbox({ fns: FNS, vars: VARS, stubs: { document: dom, setTimeout: () => 0, clearTimeout: () => {}, Intl: global.Intl,
          jobs: [job], changeOrders: [], contractors: [], _photoRefs: {}, jobLogs: logs || {}, SHEETS_SYNC_URL: '',
          estimateStore: { [job.id]: { estimate: { rooms: [{ name: 'Kitchen', vol: 3, cplx: 3 }], havellinTotal: 24100 }, approved: true } } } });
        c.jobLogs = logs || {};
        c.renderClientDashboard(job.id);
        return dom.getElementById('client-dashboard-view').innerHTML;
      });
      return r.ok ? r.val : 'THREW ' + r.err;
    };
    const living = render({ id: 7, hvlId: 'HVL-<b>7</b>', name: 'Pat <b>Bold</b> & Co', svc: 'downsizing', status: 'won', won: true,
      addr: '1 <i>A</i> St', city: 'Palm Beach', zip: '33480', tc: 'Ann <b>TC</b>', phone: '555<b>0100', email: 'p<b>@x.com',
      ptype: 'Estate <u>x</u>', src: 'Friend <s>&</s>', notes: 'Line one <i>x</i> & y\nLine two', walkthrough: '2020-01-01',
      // Typed into number boxes at intake, but a record is whatever the sheet hands back: each is text here.
      sqft: '3<b>5</b>', yearsInHome: '1<i>2', beds: '4<u>', baths: '3', priority: 'high<b>' },
      { 7: [{ date: '2026-10-06', activity: 'Packed <b>kitchen</b> & den', members: [{ name: 'Ann TC', role: 'TC', hours: 2 }] }] });
    lacks(living, 'THREW', 'the real dashboard renders' + (living.indexOf('THREW') === 0 ? ' — ' + living : ''));
    has(living, 'Pat &lt;b&gt;Bold&lt;/b&gt; &amp; Co', '⚠⚠ the client\'s name is text');
    has(living, '1 &lt;i&gt;A&lt;/i&gt; St', 'the address too');
    has(living, 'Ann &lt;b&gt;TC&lt;/b&gt;', '⚠ the concierge is text, on the address line and in the grid');
    has(living, '555&lt;b&gt;0100', '⚠ the phone');
    has(living, 'p&lt;b&gt;@x.com', '⚠ the email');
    has(living, 'Estate &lt;u&gt;x&lt;/u&gt;', 'the property type');
    has(living, 'Friend &lt;s&gt;&amp;&lt;/s&gt;', 'the referral source');
    has(living, 'Line one &lt;i&gt;x&lt;/i&gt; &amp; y<br>Line two', '⚠⚠ the notes are text, and keep the line the concierge typed');
    has(living, 'Packed &lt;b&gt;kitchen&lt;/b&gt; &amp; den', 'the hours log\'s activity is text too');
    has(living, '3&lt;b&gt;5&lt;/b&gt; sqft', 'the square footage');
    has(living, '4&lt;u&gt; bd / 3 full ba', 'the bedrooms and baths');
    has(living, '1&lt;i&gt;2 yrs', 'the years in the home');
    has(living, 'High&lt;b&gt; priority', 'and the priority chip');
    has(living, 'HVL-&lt;b&gt;7&lt;/b&gt;', 'and the job id');
    ['<b>Bold', '<i>A</i>', '<b>TC', '<b>0100', '<b>@', '<u>x', '<s>&', '<i>x</i>', '<b>kitchen', '<b>5', '4<u>', '1<i>2', 'High<b>', '<b>7'].forEach((raw) =>
      lacks(living, raw, 'no typed markup reaches the page: ' + raw));
    eq((living.match(/<br>Line two/g) || []).length, 1, 'the note\'s one line break is one <br>');

    const estate = render({ id: 9, hvlId: 'HVL-0009', name: 'Vance <b>E</b>', svc: 'cleanout', status: 'won', won: true, addr: '4 Via Mizner',
      executor: 'Joan <b>Rep</b>', executorRole: 'Personal <i>Rep</i>', executorPhone: '561<b>', executorEmail: 'j<b>@x.com',
      matterType: 'neither', walkthrough: '2020-01-01' });
    lacks(estate, 'THREW', 'an estate renders' + (estate.indexOf('THREW') === 0 ? ' — ' + estate : ''));
    has(estate, 'Estate of Vance &lt;b&gt;E&lt;/b&gt;', 'the estate\'s name is text');
    has(estate, '<div class="dash-avatar">V&lt;</div>', 'and so are the initials taken off it ("V<")');
    has(estate, 'Joan &lt;b&gt;Rep&lt;/b&gt; · Personal &lt;i&gt;Rep&lt;/i&gt;', '⚠ the representative and their role are text');
    has(estate, '561&lt;b&gt;', 'their phone');
    has(estate, 'j&lt;b&gt;@x.com', 'their email');
    ['<b>E<', '<b>Rep', '<i>Rep', '561<b>', 'j<b>@', 'V<<'].forEach((raw) => lacks(estate, raw, 'nothing typed is markup: ' + raw));

    const probate = render({ id: 11, hvlId: 'HVL-0011', name: 'Hale', svc: 'probate', status: 'won', won: true, addr: '9 Palm Way',
      executor: 'Rex <b>Hale</b>', executorRole: 'Personal <s>Rep</s>', executorPhone: '561<s>9', executorEmail: 'r<s>@x.com',
      probateSale: 'Yes <b>sale</b>', matterType: 'probate', probateCase: 'CP <b>1</b>', probateAttyName: 'Ann <i>Lowe</i>', probateAttyFirm: 'Lowe & <b>Co</b>',
      probateAttyPhone: '561<i>', probateAttyEmail: 'a<b>@l.law', walkthrough: '2020-01-01' });
    lacks(probate, 'THREW', 'a probate matter renders its card' + (probate.indexOf('THREW') === 0 ? ' — ' + probate : ''));
    has(probate, 'Probate Information', 'with the probate card');
    ['CP &lt;b&gt;1&lt;/b&gt;', 'Ann &lt;i&gt;Lowe&lt;/i&gt;', 'Lowe &amp; &lt;b&gt;Co&lt;/b&gt;', '561&lt;i&gt;', 'a&lt;b&gt;@l.law', 'Rex &lt;b&gt;Hale&lt;/b&gt;']
      .forEach((t) => has(probate, t, 'the probate card\'s typed fields are text: ' + unesc(t)));
    lacks(probate, '<b>Hale', 'and the executor there is never markup');
    ['Personal &lt;s&gt;Rep&lt;/s&gt;', 'Yes &lt;b&gt;sale&lt;/b&gt;'].forEach((t) => has(probate, t, 'the card\'s ' + unesc(t) + ' is text'));
    // The grid above the card shows the representative's phone and email escaped too, so only the absence of the raw
    // text proves the card's own copies are.
    ['561<s>', 'r<s>@', '<s>Rep', '<b>sale'].forEach((raw) => lacks(probate, raw, 'the probate card never prints ' + raw + ' as markup'));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('B4 — the concierge on the client estimate and on every invoice is text');
  {
    const ZED = { name: 'Zed <b>Bold</b> & Co', role: 'TC', status: 'active', phone: '555<b>0123', email: 'z<b>@x.com',
                  bio: 'First line <i>it</i> & more\nSecond line' };
    const DOC_FNS = ['estimateIsFeeOnly', 'estDeclutterHrs', 'prepFeeRate', 'fmt', 'esc', 'escLines', 'fmtDate2', 'svcLabelOf', 'docServiceTitle', 'probateSvcOffTrack', 'isDecedentJob',
      'estTolerancePctTxt', 'conciergePhones', 'conciergePhonesText', 'assignedTCContact', 'samePerson', 'canonPersonName', 'estWorkingDays',
      'paymentSplit', 'clientEstimateHtml', 'rushScopeLine', 'rushCrewAdded', 'buildPrepEstimateBody', 'clientJobPlanSection', '_cePhases',
      'vendorEstimateNote', 'vendorFeeNote', 'materialsBasisNote', 'materialsPackageQuoted', 'proposedPlanRow', 'estimateDocScope',
      'svcHasDocStep', 'fmtCEDate', '_pctWords', 'docTierOf', 'docTierDef', 'docTierScope', 'approvedEstimateFor', 'estFixedFee',
      'estPrepFeeOnTop', 'weArrangeAppraisals', 'docTierProduces', 'estFixedLines', 'fixedDiscountBasisWords', 'rushBaseWords',
      'coRushPctFor', 'appraisalDuty', 'estimateAppraiserLines', 'estimateAppraiserNames', 'matterDef', 'matterTypeOf',
      'marketingOptOutBlock', 'marketingUseParas', '_mktClause', 'docScopeDef', 'addWorkingDays', '_ymdLocal', 'roundCents', 'fmtHrs'];
    const DOC_VARS = ['PREP_FEE_RATE', 'SMF_PCT', 'RUSH_PCT', 'SVC_LABELS', 'EST_TOLERANCE_PCT', 'DEPT_EMAILS', 'HAVELLIN_OFFICE_PHONE',
      'NON_MOBILE_NUMBERS', 'DEFAULT_CONTRACTORS', 'DECEDENT_SERVICES', 'PERSON_NAME_ALIASES', 'DOC_SCOPES', 'DOC_CAPTURE_POOL_SHARE',
      'JOB_STEPS', 'PRODUCTIVE_HRS_PER_DAY', '_PCT_WORDS', 'DOC_TIERS', 'DOC_TIER_FROM_SCOPE', 'MATTER_TYPES'];
    const JOB = { id: 1, hvlId: 'HVL-<b>11</b>', name: 'Marston', svc: 'downsizing', addr: '12 Seabreeze Ln', city: 'Palm Beach',
      phone: '561<b>0100', email: 'm@example.com', tc: ZED.name, status: 'active', start: '2026-10-05', sqft: 3500 };
    const EST = { jobId: 1, svc: 'downsizing', totTC: 40, totPS: 60, tcFee: 6000, psFee: 6000, pkgCost: 0, smf: 0, prepFee: 0,
      prepCost: 0, havellinTotal: 12000, havellinTotalFull: 12000, grandTotal: 12000, tcRate: 150, psRate: 100, discountPct: 0,
      discountAmt: 0, fixedPrice: false, rush: false, days: 5, rooms: [{ name: 'Kitchen', vol: 3, cplx: 3 }], vendors: [],
      collections: [], vehicles: [], prepItems: [], preparedBy: ZED.name, docScope: 'full' };
    const STOP = ['jobs', 'estimateStore', 'jobLogs', 'changeOrders', 'contractors', 'currentEstimate', 'vendorDirectory', 'jobPlans', '_photoRefs', 'jobPlanStore'];
    const ce = attempt(() => closureLift(['clientEstimateHtml', 'roundCents', 'fmtHrs', 'fmt', 'paymentSplit'], STOP, { jobs: [JOB], estimateStore: {}, jobLogs: {}, changeOrders: [],
      contractors: [ZED], currentEstimate: null, vendorDirectory: [], jobPlans: {}, jobPlanStore: {}, _photoRefs: {}, document: domStub({}) })
      .clientEstimateHtml(EST, JOB));
    ok(ce.ok, 'the client estimate renders' + (ce.ok ? '' : ' — ' + ce.err));
    const h = ce.ok ? ce.val : '';
    has(h, 'Contact <strong style="color:var(--gray-dk);">Zed &lt;b&gt;Bold&lt;/b&gt; &amp; Co</strong>', '⚠⚠ the concierge\'s name is text on the contact line');
    has(h, 'Mobile 555&lt;b&gt;0123', 'their number');
    has(h, 'href="mailto:z&lt;b&gt;@x.com"', 'their email, in the link');
    has(h, '>z&lt;b&gt;@x.com</a>', 'and in its text');
    has(h, 'First line &lt;i&gt;it&lt;/i&gt; &amp; more<br>Second line', '⚠⚠ the bio is text, and keeps its line');
    has(h, 'HVL-&lt;b&gt;11&lt;/b&gt;', 'the job id');
    has(h, '561&lt;b&gt;0100', 'the client\'s phone');
    has(h, 'Office (561) 652-5522 \u00a0\u00b7\u00a0 Mobile', 'the office line and the mobile still read as one line, joined by no-break spaces');
    ['<b>Bold', '<b>0123', '<b>@', '<i>it</i>', '<b>11', '<b>0100'].forEach((raw) => lacks(h, raw, 'nothing typed is markup: ' + raw));
    has(h, '>Z&lt;&amp;C</div>', 'the initials in the bio\'s circle come off the typed name, and are text ("Z<&C")');
    lacks(h, 'Z<&C', '…never markup');
    // An estate addresses the representative: their phone and email are typed at intake too.
    const EJOB = Object.assign({}, JOB, { id: 2, svc: 'cleanout', name: 'Vance', executor: 'Joan Vance', executorRole: 'Personal Representative',
      executorPhone: '561<b>0199', executorEmail: 'j<b>@x.com', deathDate: '2026-07-01', docTier: 'values', matterType: 'probate' });
    const ce2 = attempt(() => closureLift(['clientEstimateHtml'], STOP, { jobs: [EJOB], estimateStore: {}, jobLogs: {}, changeOrders: [],
      contractors: [ZED], currentEstimate: null, vendorDirectory: [], jobPlans: {}, jobPlanStore: {}, _photoRefs: {}, document: domStub({}) })
      .clientEstimateHtml(Object.assign({}, EST, { jobId: 2, svc: 'cleanout' }), EJOB));
    ok(ce2.ok, 'an estate\'s client estimate renders' + (ce2.ok ? '' : ' — ' + ce2.err));
    has(ce2.ok ? ce2.val : '', 'Rep Phone</div><div class="ce-meta-val">561&lt;b&gt;0199', '⚠ the representative\'s phone is text');
    has(ce2.ok ? ce2.val : '', 'Rep Email</div><div class="ce-meta-val">j&lt;b&gt;@x.com', 'their email too');
    ['561<b>', 'j<b>@'].forEach((raw) => lacks(ce2.ok ? ce2.val : '', raw, 'the estate estimate never prints ' + raw + ' as markup'));

    const INV_FNS = ['invoiceHtml', 'finalAwaitsHours', 'paymentStageWord', 'docSentAt', 'paymentSplit', 'rushScopeLine', 'rushCrewAdded',
      'jobLogEntries', 'invFinalApproval', 'invFinalApprovalRecord', 'docKeyFor', 'coHours', 'coHoursTotal', 'coBaselineShift', 'coPrice',
      'coPriceTotal', 'coHoursLabel', '_coMoney', 'fmt', 'getVendorActuals', '_srcLineKey', 'samePerson', 'canonPersonName',
      '_invVendorFeeSentence', 'prepFeeRate', 'vendorGroupOfLine', 'resolveJobVendor', 'coordHrsFor', 'prepLineTCHrs', 'vendorLineTCHrs',
      'esc', 'escLines', 'fmtDate2', 'svcLabelOf', 'docServiceTitle', 'probateSvcOffTrack', 'conciergePhones', 'conciergePhonesText', 'assignedTCContact', 'vendorCats',
      'vendorPrimaryCat', 'estimateIsFeeOnly', 'estDeclutterHrs', 'isDecedentJob', 'stagePaidTotal', 'jobPaidTotal', 'jobPayments',
      'discountOnLabor', 'estTolerancePctTxt', 'estFixedFee', 'estPrepFeeOnTop', 'estFixedLines', 'discountOnFixedFee',
      'fixedDiscountBasisWords', 'rushBaseWords', 'coRushPct', 'coVendorAdds', 'coVendorAddsTxt', 'jobPrepLines', 'coPrepVendorLines', 'paymentCounts', 'finalCrewOnlyWarn', 'coBaselineMove', 'roundCents', 'fmtHrs', 'paymentLive', 'isRefundRecord'];
    const INV_VARS = ['DOC_STAGE_WORD', 'EST_TOLERANCE_PCT', 'SMF_PCT', 'RUSH_PCT', 'SVC_LABELS', 'DEPT_EMAILS', 'HAVELLIN_OFFICE_PHONE',
      'NON_MOBILE_NUMBERS', 'DEFAULT_CONTRACTORS', 'COORD_TOUCHES', 'COORD_TOUCHES_BY_GROUP', 'COORD_TOUCHES_DEFAULT', 'TOUCH_HRS',
      'DECEDENT_SERVICES', 'PERSON_NAME_ALIASES', 'PREP_FEE_RATE'];
    ['deposit', 'midpoint', 'final'].forEach((stage) => {
      const r = attempt(() => sandbox({ fns: INV_FNS, vars: INV_VARS, stubs: { jobs: [JOB],
        jobLogs: { 1: [{ date: '2026-10-06', activity: 'work', members: [{ name: 'Zed', role: 'TC', hours: 40 }, { name: 'Pat', role: 'PS', hours: 60 }] }] },
        estimateStore: { 1: { estimate: EST, approved: true, approvedBy: 'Anthony Graziano' } }, changeOrders: [], contractors: [ZED],
        currentEstimate: null, currentInvStage: stage, vendorDirectory: [], jobPlans: {}, _photoRefs: {}, document: domStub({}) } })
        .invoiceHtml(Object.assign({}, JOB, { payments: [] }), stage));
      ok(r.ok, 'the ' + stage + ' invoice renders' + (r.ok ? '' : ' — ' + r.err));
      const ih = r.ok ? r.val.html : '';
      has(ih, 'Zed &lt;b&gt;Bold&lt;/b&gt; &amp; Co', '⚠ the ' + stage + ' invoice names the concierge as text');
      has(ih, 'First line &lt;i&gt;it&lt;/i&gt; &amp; more<br>Second line', 'with the bio as text on its lines');
      has(ih, 'href="mailto:z&lt;b&gt;@x.com"', 'the email');
      has(ih, 'Mobile 555&lt;b&gt;0123', 'the mobile');
      has(ih, '561&lt;b&gt;0100', 'and the client\'s phone');
      ['<b>Bold', '<i>it</i>', '<b>@', '<b>0123', '<b>0100', '<b>11', 'Z<&C'].forEach((raw) => lacks(ih, raw, stage + ': nothing typed is markup: ' + raw));
      has(ih, '>Z&lt;&amp;C</div>', stage + ': the initials are text');
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('B4 — Edit Client keeps the notes\' lines (a textarea, not a one-line input)');
  {
    const job = Object.assign({}, ESTATE, { svc: 'downsizing', fname: 'Pat', lname: 'Lee', name: 'Pat Lee', phone: '(561) 555-0142',
      email: 'p@example.com', notes: 'Gate <b>4417</b> & dogs\nCall Joan first' });
    const r = editSave(job, {});
    has(r.html, '<textarea id="ec-notes"', '⚠ the notes are a textarea on Edit Client, as at intake');
    has(r.html, '>Gate &lt;b&gt;4417&lt;/b&gt; &amp; dogs\nCall Joan first</textarea>', 'escaped into the element, the line break kept');
    lacks(r.html, '<input type="text" id="ec-notes"', 'not an input, whose value would strip the line break');
    eq(r.err, '', 'an untouched save runs');
    eq(r.job.notes, 'Gate <b>4417</b> & dogs\nCall Joan first', '⚠ and an untouched save keeps the note exactly, its line break included');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('B13 — followDocTier: a draft follows the tier; an approved one, or one out for approval, never moves');
  {
    const mk = (state) => {
      const c = sandbox({ fns: ['followDocTier', 'estimateTierMoved'].concat(TIER_FNS),
        vars: ['_estimateDocScope', '_estimateDocTier'].concat(TIER_VARS),
        stubs: { estimateApproved: false, estimateSubmitted: false } });
      Object.assign(c, state || {});
      return c;
    };
    const J = (tier) => ({ id: 9, svc: 'cleanout', docTier: tier });
    let c = mk({ _estimateDocScope: 'full', _estimateDocTier: '' });
    eq(JSON.parse(JSON.stringify(c.followDocTier(J('contents')))), { from: 'full', to: 'capture', tier: 'contents' },
       '⚠⚠ a build seeded while the tier was blank follows it once it is answered: Full to Capture only');
    eq([c._estimateDocScope, c._estimateDocTier], ['capture', 'contents'], 'the scope and the tier it answers to are both moved');
    eq(c.followDocTier(J('contents')), null, 'and a second look at the same tier moves nothing');
    c = mk({ _estimateDocScope: 'none', _estimateDocTier: 'values' });
    eq(c.followDocTier(J('values')), null, '⚠ a walkthrough override made against the CURRENT tier is kept');
    eq(c._estimateDocScope, 'none', '…untouched');
    c = mk({ _estimateDocScope: 'full', _estimateDocTier: 'values', estimateApproved: true });
    eq(c.followDocTier(J('contents')), null, '⚠⚠ an APPROVED estimate is never moved by the tier');
    eq(c._estimateDocScope, 'full', '…its scope stays what the manager approved');
    c = mk({ _estimateDocScope: 'full', _estimateDocTier: 'values', estimateSubmitted: true });
    eq(c.followDocTier(J('contents')), null, '⚠ nor one out for approval');
    c = mk({ _estimateDocScope: 'capture', _estimateDocTier: 'contents' });
    eq(c.followDocTier(J('')), null, 'a tier cleared on Edit Client moves nothing — the contract gate says it is unanswered');
    c = mk({ _estimateDocScope: 'full', _estimateDocTier: 'values' });
    eq(c.followDocTier(J('appraisals')), null, 'values to appraisals prices the same scope, so there is nothing to report');
    eq(c._estimateDocTier, 'appraisals', '…but the build now answers to the new tier');
    c = mk({ _estimateDocScope: 'full', _estimateDocTier: 'values' });
    eq(c.followDocTier({ id: 3, svc: 'downsizing' }), null, 'a service with no documentation step has no tier to follow');
    eq(c.followDocTier(null), null, 'and no job, nothing');

    eq(c.estimateTierMoved({ docTier: 'values', docScope: 'full', svc: 'cleanout' }, J('contents')), true,
       '⚠ a saved estimate priced against an older tier, at a scope the new one does not price, has moved');
    eq(c.estimateTierMoved({ docTier: 'values', docScope: 'full', svc: 'cleanout' }, J('appraisals')), false, 'one whose scope is the same has not');
    eq(c.estimateTierMoved({ docTier: 'contents', docScope: 'capture', svc: 'cleanout' }, J('contents')), false, 'nor one priced against the tier it holds');
    eq(c.estimateTierMoved({ docScope: 'full', svc: 'cleanout' }, J('contents')), false, 'a record from before est.docTier existed is never called moved');
    eq(c.estimateTierMoved({ docTier: 'values', docScope: 'full', svc: 'cleanout' }, J('')), false, 'nor is one whose tier was cleared');
    eq(c.estimateTierMoved({ docTier: 'contents', docScope: 'capture', svc: 'cleanout' }, J('')), false,
       '…even where a cleared tier would seed another scope: an unanswered tier is the contract gate\'s refusal, not a move');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('B13 — through the real engine: the build that follows is repriced, and the snapshot records the tier');
  {
    const ROOMS = ['Living Room', 'Kitchen', 'Primary Suite', 'Primary Bath', 'Bedroom 2', 'Bathroom 2', 'Dining Room', 'Garage (2-car)'];
    // Every call into the lifted engine is inside attempt(), so a revert fails these checks rather than throwing out of
    // the file and leaving the groups below it unrun (the revert sweep found one that did).
    const r = attempt(() => driveCalcAll({ svc: 'cleanout', rooms: ROOMS, job: { id: 9, svc: 'cleanout', docTier: 'values' },
      fns: ['followDocTier'].concat(TIER_FNS) }));
    ok(r.ok, 'the engine runs' + (r.ok ? '' : ' — ' + r.err));
    const run = attempt(() => {
      const ctx = r.val.ctx;
      ctx.estimateApproved = false; ctx.estimateSubmitted = false;
      ctx._estimateDocTier = 'values'; ctx._estimateDocScope = 'full'; ctx.calcAll();
      const atFull = ctx.currentEstimate;
      ctx.jobs[0].docTier = 'contents';
      const f = ctx.followDocTier(ctx.jobs[0]);
      ctx.calcAll();
      const followed = ctx.currentEstimate;
      ctx._estimateDocScope = 'capture'; ctx.calcAll();
      return { atFull, followed, f, capture: ctx.currentEstimate.havellinTotal };
    });
    ok(run.ok, 'the tier is followed through the engine' + (run.ok ? '' : ' — ' + run.err));
    const R0 = run.ok ? run.val : { atFull: {}, followed: {}, f: null, capture: -1 };
    eq([R0.atFull.docScope, R0.atFull.docTier], ['full', 'values'], 'the snapshot pins the scope AND the tier it was decided against');
    eq([R0.followed.docScope, R0.followed.docTier], ['capture', 'contents'], '⚠⚠ Edit Client answers Contents list: the open build is now priced at Capture only');
    ok(R0.followed.havellinTotal < R0.atFull.havellinTotal, 'and the price follows ($' + R0.atFull.havellinTotal + ' to $' + R0.followed.havellinTotal + ')');
    eq(R0.capture, R0.followed.havellinTotal, 'exactly the price a Capture-only build prices at');
    ok(R0.f && R0.f.from === 'full' && R0.f.to === 'capture', 'the rule reports the move it made');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('B13 — a saved draft follows when it is reopened; an approved one does not');
  {
    const noop = () => {};
    const reopen = (est, job, approved) => {
      const r = attempt(() => {
        const c = sandbox({
          fns: ['restoreEstimateToUI', '_fxAmtSet', '_fxAmtGet', 'moneyToNumber', 'fixedFeeForCharge', 'discountOnFixedFee', 'discountOnLabor',
                'pinVendorLineHours', 'vendorDirectoryReady', 'vendorLineTCHrs', 'coordHrsFor', 'coordTouches', 'vendorGroupOfLine',
                'vendorGroupCategories', 'directoryCategories', 'vendorCats', 'followDocTier', 'roundCents', 'fmt'].concat(TIER_FNS),
          vars: ['ROOMS', '_fixedAmountUserSet', '_fixedAmountBasis', '_fixedPrepMovedOut', '_fixedLinesRestated', 'RUSH_PCT',
                 'VENDOR_GROUP_CARDS', 'COORD_TOUCHES', 'COORD_TOUCHES_BY_GROUP', 'COORD_TOUCHES_DEFAULT', 'TOUCH_HRS', 'vendorDirectory',
                 'GROUP_JOB_MENU', 'LOGISTICS_CATEGORIES', '_estimateDocScope', '_estimateDocTier'].concat(TIER_VARS),
          stubs: { document: domStub({}), calcAll: noop, paintEstimateService: noop, svcTypeChanged: noop, toggleRoom: noop, setRoomState: noop,
                   collapseEmptyRoomSections: noop, renderCollections: noop, renderVehicles: noop, renderVendors: noop, renderPrepItems: noop,
                   paintVolPreset: noop, applyEstimateLock: noop, estDeclutterHrs: () => 0, jobs: [job], collectionsData: [], vehiclesData: [],
                   vendors: [], prepItems: [], estimateApproved: !!approved, estimateSubmitted: false } });
        c.restoreEstimateToUI(Object.assign({ rooms: [], jobId: 9, svc: 'cleanout' }, est));
        return [c._estimateDocScope, c._estimateDocTier];
      });
      return r.ok ? r.val : ['THREW ' + r.err, ''];
    };
    const job = Object.assign({}, ESTATE, { docTier: 'contents' });
    eq(reopen({ docScope: 'full', docTier: 'values' }, job, false), ['capture', 'contents'],
       '⚠⚠ a saved draft priced for Inventory with values reopens priced for the Contents list the client record now holds');
    eq(reopen({ docScope: 'full', docTier: 'values' }, job, true), ['full', 'values'],
       '⚠⚠ an APPROVED estimate reopens exactly as approved');
    eq(reopen({ docScope: 'none', docTier: 'contents' }, job, false), ['none', 'contents'],
       'a walkthrough override made against the tier the job still holds is kept');
    eq(reopen({ docScope: 'full' }, job, false), ['full', 'contents'],
       'a record from before est.docTier is taken to answer to today\'s tier: nothing moves, and the intake note flags the difference');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('B13 — the screen reopened after ✎ Edit estimate (or any time) follows a tier changed while it was away');
  {
    const run = (state) => {
      const log = [];
      const r = attempt(() => {
        const c = sandbox({ fns: ['openEstimateScreen', 'followJobService', 'followDocTier'].concat(TIER_FNS), vars: ['_estimateDocScope', '_estimateDocTier'].concat(TIER_VARS),
          stubs: { document: domStub({ 'e-job': { value: '9' }, 'e-svc': { value: ESTATE.svc }, 'est-loading-bar': { style: { display: 'none' } } }),
                   currentEstimate: { jobId: 9 }, jobs: [Object.assign({}, ESTATE, { docTier: 'contents' })],
                   _showDashScreen() {}, calcAll: () => log.push('calc:' + c._estimateDocScope), applyEstimateLock() {},
                   editEstimateForJob: () => log.push('open'), estimateApproved: false, estimateSubmitted: false } });
        Object.assign(c, state);
        const got = c.openEstimateScreen(9);
        return { got, scope: c._estimateDocScope, log };
      });
      return r.ok ? r.val : { got: 'THREW ' + r.err };
    };
    const a = run({ _estimateDocScope: 'full', _estimateDocTier: 'values' });
    eq(a.got, 'resumed', 'the same client resumes');
    eq(a.log, ['calc:capture'], '⚠ and the build is re-seeded BEFORE it is repriced');
    const b = run({ _estimateDocScope: 'full', _estimateDocTier: 'values', estimateApproved: true });
    eq(b.scope, 'full', 'an approved build resumes as it was');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('B13 — Edit Client\'s save: the open draft follows at once; everything else is said, with the route');
  {
    const est = (o) => Object.assign({ jobId: 9, svc: 'cleanout', docScope: 'full', docTier: 'values', rooms: [{ name: 'Kitchen', vol: 3, cplx: 3 }], havellinTotal: 19450 }, o || {});
    // 1. A blank tier, the walkthrough open on Build Estimate: the refusal's promise comes true.
    let r = editSave(Object.assign({}, ESTATE, { docTier: '', docScope: '' }), { 'ec-doc-tier': 'contents', 'e-job': '9', 'e-svc': ESTATE.svc },
      { state: { _estimateDocScope: 'full', _estimateDocTier: '' } });
    eq(r.err, '', 'the save runs');
    eq(r.job.docTier, 'contents', 'the tier is saved');
    eq([r.c._estimateDocScope, r.c._estimateDocTier], ['capture', 'contents'], '⚠⚠ the build open on Build Estimate is re-seeded at once');
    ok(r.said.calc >= 1, 'and repriced (the calcAll at the foot of the save)');
    eq(r.said.type, 'ok', 'the notice is good news');
    has(r.said.notice, 'The estimate open on Build Estimate follows it: repriced from Full to Capture only', 'and says what moved');
    has(r.said.notice, 'Press Save Estimate there to keep it', 'and that the saved copy changes when Save is pressed');

    // 2. Approved: never repriced, flagged, and the route named.
    r = editSave(Object.assign({}, ESTATE, { approved: true }), { 'ec-doc-tier': 'contents', 'e-job': '9', 'e-svc': ESTATE.svc },
      { store: { 9: { approved: true, estimate: est() } }, state: { _estimateDocScope: 'full', _estimateDocTier: 'values', estimateApproved: true } });
    eq(r.c._estimateDocScope, 'full', '⚠⚠ an approved estimate open on the screen is NOT repriced by the save');
    eq(r.said.type, 'warn', 'it is a warning');
    has(r.said.notice, 'The approved estimate is priced at Full, and the app does not reprice it on its own.', 'naming the price it keeps');
    has(r.said.notice, '✎ Edit estimate', '⚠ and the route: ✎ Edit estimate, before the packet goes out');
    has(r.said.notice, 'Reopened for editing, it follows the new tier.', 'and what happens when it is taken');
    eq(r.job.docTier, 'contents', 'the tier itself is saved — a contract term stays correctable');
    has(r.html, 'an estimate no manager has approved follows a change made here', '⚠ Edit Client\'s own line under the tier says a draft follows it');
    lacks(r.html, 'correcting the tier here never reprices a quote already given', 'and no longer that it never moves any estimate');

    // 3. The packet is out: the route is a change order, and nothing is said about reopening.
    r = editSave(Object.assign({}, ESTATE, { approved: true, agrSent: true }), { 'ec-doc-tier': 'contents' },
      { store: { 9: { approved: true, estimate: est() } } });
    has(r.said.notice, 'change order', '⚠ once the signing packet is out the route is a change order');
    lacks(r.said.notice, 'Reopened for editing', 'and nothing promises a reopen that cannot happen');

    // 4. Out for manager approval.
    r = editSave(Object.assign({}, ESTATE, { status: 'pending' }), { 'ec-doc-tier': 'contents' },
      { store: { 9: { submitted: true, estimate: est() } } });
    has(r.said.notice, 'estimate out for manager approval is priced at Full', 'an estimate out for approval is flagged too');
    has(r.said.notice, 'opens for editing again once a manager approves it or denies it', 'with the manager\'s decision as the route');

    // 5. A saved draft that is not open: it follows when opened, and Submit waits for that.
    r = editSave(ESTATE, { 'ec-doc-tier': 'contents' }, { store: { 9: { approved: false, estimate: est() } } });
    has(r.said.notice, 'The saved estimate is priced at Full: it follows the new tier when it is next opened on Build Estimate', 'a saved draft is told it will follow');
    has(r.said.notice, 'cannot be submitted until it has been saved there', 'and that Submit waits for it');
    eq(r.c._estimateDocScope, 'full', 'nothing is re-seeded on a screen that holds another client (or none)');

    // 6. A legacy draft (no est.docTier): what is true for it.
    r = editSave(ESTATE, { 'ec-doc-tier': 'contents' }, { store: { 9: { approved: false, estimate: est({ docTier: undefined }) } } });
    has(r.said.notice, 'open it on Build Estimate, set its Documentation scope and press Save Estimate', 'a record from before est.docTier is told to set the scope by hand');

    // 7. Nothing to say when the tier did not move, or moves within one scope.
    r = editSave(ESTATE, {}, { store: { 9: { approved: true, estimate: est() } } });
    eq(r.said.notice, undefined, 'an untouched save says nothing about the tier');
    r = editSave(ESTATE, { 'ec-doc-tier': 'appraisals' }, { store: { 9: { approved: true, estimate: est() } } });
    eq(r.said.notice, undefined, 'values to appraisals prices the same scope — no flag');

    // 8. The build open on the screen was submitted in this session and the store has not caught up: it is still
    //    locked, so it is flagged rather than silently left behind.
    r = editSave(ESTATE, { 'ec-doc-tier': 'contents', 'e-job': '9', 'e-svc': ESTATE.svc },
      { store: { 9: { estimate: est() } }, state: { _estimateDocScope: 'full', _estimateDocTier: 'values', estimateSubmitted: true } });
    eq(r.c._estimateDocScope, 'full', 'a submitted build is not re-seeded');
    has(r.said.notice, 'estimate out for manager approval is priced at Full', '⚠ and the save says so, from the screen\'s own lock');

    // 9. The notice itself says nothing when the tier did not move (the save asks first as well).
    const N = attempt(() => sandbox({ fns: ['docTierChangeNotice'].concat(TIER_FNS, ROUTE_FNS), vars: TIER_VARS.concat(['ESTIMATE_EDIT_ROUTE_TXT', 'ESTIMATE_OUT_FOR_APPROVAL_TXT']),
      stubs: { document: domStub({ 'e-job': '0' }), estimateStore: { 9: { approved: true, estimate: est({ docScope: 'capture' }) } } } })
      .docTierChangeNotice(Object.assign({}, ESTATE, { approved: true }), 'values'));
    eq(N.ok ? N.val : 'THREW ' + N.err, null, 'a tier that did not move is not a change, whatever the saved estimate is priced at');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('B13 — Submit refuses a saved estimate still priced against an older tier; the note says why a reopened one moved');
  {
    const S = sandbox({ fns: ['estimateSubmitBlocker', 'estimateContractBlocker', 'estimateContractMissing', 'isDecedentJob', 'matterTypeOf',
      'matterDef', 'invFiduciaryMode', 'unscoredRoomNames', 'estimateNoteGaps', 'roomScoreOf', 'estimateTierMoved', 'docTierFollowNote'].concat(TIER_FNS, ROUTE_FNS),
      vars: ['ESTIMATE_CONTRACT_FIELDS', 'MATTER_TYPES', 'DECEDENT_SERVICES', 'REQUIRE_WALKTHROUGH_NOTES'].concat(TIER_VARS) });
    const E = (o) => Object.assign({ svc: 'cleanout', havellinTotal: 19450, rooms: [{ name: 'Kitchen', vol: 3, cplx: 3 }], docScope: 'full', docTier: 'values' }, o || {});
    const JOB = Object.assign({}, ESTATE, { docTier: 'contents' });
    const blk = S.estimateSubmitBlocker(E(), JOB);
    eq(blk && blk.code, 'tier', '⚠⚠ a draft nobody reopened since the tier changed cannot go to a manager at the old scope');
    has(blk && blk.msg, 'changed to Contents list after this estimate was saved, and it is still priced at Full', 'the refusal names both');
    has(blk && blk.msg, 'Open it with ✎ Edit estimate on the dashboard (it follows the new tier there), press Save Estimate, then submit it',
        'and the way through, by the control the dashboard carries for a saved draft');
    // The control it names is asked first (the price-lock net's rule): where ✎ Edit estimate is withdrawn, the refusal
    // says why instead of naming a button that is not there.
    const sent = S.estimateSubmitBlocker(E(), Object.assign({}, JOB, { agrSent: true }));
    eq(sent && sent.code, 'tier', 'with the signing packet out it still refuses');
    lacks(sent && sent.msg, '✎ Edit estimate on the dashboard', '…and does not name a control that is withdrawn');
    has(sent && sent.msg, 'change order', '…it names the route that exists');
    eq(S.estimateSubmitBlocker(E({ docTier: 'contents', docScope: 'capture' }), JOB), null, 'once saved at the new tier it submits');
    eq(S.estimateSubmitBlocker(E({ docTier: undefined }), JOB), null, 'a record from before est.docTier is not refused on a guess');

    const rec = { approved: false, estimate: E() };
    has(S.docTierFollowNote(JOB, rec, 'capture', 'contents'), 'changed to Contents list after this estimate was saved', '⚠ the reopened build says why its price moved');
    has(S.docTierFollowNote(JOB, rec, 'capture', 'contents'), 'where the saved copy is at Full. Save Estimate keeps it.', 'and what Save does');
    eq(S.docTierFollowNote(JOB, { approved: true, estimate: E() }, 'capture', 'contents'), '', 'never on an approved record');
    eq(S.docTierFollowNote(JOB, { estimate: E({ docTier: 'contents', docScope: 'capture' }) }, 'capture', 'contents'), '', 'nor once Save has recorded the new pricing');
    eq(S.docTierFollowNote(JOB, rec, 'none', 'contents'), '', 'nor when the estimator has set another scope by hand since');
    eq(S.docTierFollowNote(Object.assign({}, ESTATE, { docTier: 'appraisals' }), rec, 'full', 'appraisals'), '',
       'nor when the new tier prices the scope the saved copy already has (values to appraisals)');

    // Joined: the Documentation scope's own hint on Build Estimate carries the note (paintEstimateDocScope).
    const dom = domStub({ 'e-docscope-wrap': { style: {} }, 'e-docscope': { value: '' }, 'e-docscope-hint': { innerHTML: '' } });
    const P = attempt(() => {
      const c = closureLift(['paintEstimateDocScope'], ['document', 'estimateStore', 'vendors', '_estimateDocScope', '_estimateDocTier'],
        { document: dom, estimateStore: { 9: rec }, vendors: [], _estimateDocScope: 'capture', _estimateDocTier: 'contents' });
      c.paintEstimateDocScope('cleanout', JOB);
      return dom.getElementById('e-docscope-hint').innerHTML;
    });
    ok(P.ok, 'the scope hint paints' + (P.ok ? '' : ' — ' + P.err));
    has(P.ok ? P.val : '', 'changed to Contents list after this estimate was saved, so it follows it here: priced at Capture only, where the saved copy is at Full',
        '⚠ the reopened build says under its scope why its price moved');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('The route to reprice an approved estimate is one answer, and every surface that names it reads it');
  {
    const R = sandbox({ fns: ROUTE_FNS, vars: ['ESTIMATE_EDIT_ROUTE_TXT', 'ESTIMATE_OUT_FOR_APPROVAL_TXT'] });
    has(R.estimateRepriceRoute({ id: 1, approved: true }, { approved: true }), '✎ Edit estimate', 'approved, packet not out: ✎ Edit estimate');
    has(R.estimateRepriceRoute({ id: 1, approved: true, agrSent: true }, { approved: true }), 'change order', 'the packet out: a change order');
    has(R.estimateRepriceRoute({ id: 1, approved: true, agrSigned: true }, { approved: true }), 'signed the agreement', 'signed: locked, a change order');
    eq(R.estimateRepriceRoute({ id: 1, status: 'pending' }, { submitted: true }), R.ESTIMATE_OUT_FOR_APPROVAL_TXT, 'out for approval: the manager');
    // Build Estimate's save refusal on an approved estimate.
    const said = [];
    const S = sandbox({ fns: ['saveEstimateAndPreview', 'roundCents', 'fmtHrs', 'fmt'].concat(ROUTE_FNS), vars: ['ESTIMATE_EDIT_ROUTE_TXT', 'ESTIMATE_OUT_FOR_APPROVAL_TXT'],
      stubs: { document: domStub({ 'e-job': '7' }), jobs: [{ id: 7, approved: true }], estimateStore: { 7: { approved: true } },
               estimateApproved: true, showFB: (id, k, m) => said.push(m) } });
    S.saveEstimateAndPreview();
    has(said[0], 'This estimate is approved and locked. To change it, press ✎ Edit estimate', '⚠ the save refusal names ✎ Edit estimate');
    lacks(said[0], 'Create a Change Order', 'not a change order, which is not the route before the packet goes out');
    // Build Estimate's banner, as markup and as applyEstimateLock paints its approved arm.
    const banner = divBlock(src, src.indexOf('<div id="est-approved-banner"'));
    has(banner, '&#9998; Edit estimate', 'the banner markup names ✎ Edit estimate');
    lacks(banner, 'create a Change Order from the Client Dashboard', 'and no longer sends an approved estimate to a change order');
    has(live(fn('applyEstimateLock')), '<strong>&#9998; Edit estimate</strong> or <strong>Offer discount</strong>', 'the painted banner names both buttons as they are labelled');
    // Edit Client's held-field alert.
    const JOB = { id: 7, hvlId: 'HVL-0007', name: 'Tripp Butler', fname: 'Tripp', lname: 'Butler', svc: 'downsizing', phone: '(561) 555-0142',
      email: 't@example.com', addr: '12 Ocean Blvd', city: 'Palm Beach', zip: '33480', sqft: '4500', ptype: 'Single Family Home',
      src: 'Family', start: '2026-10-05', approved: true };
    let r = editSave(JOB, { 'ec-sqft': '5200' }, { store: { 7: { approved: true, estimate: { rooms: [] } } } });
    eq(r.job.sqft, '4500', 'an approved estimate still holds the square footage');
    has(r.said.alert, '✎ Edit estimate', '⚠⚠ the held-field alert names ✎ Edit estimate');
    has(r.said.alert, 'Then change them here.', 'and says the fields open again after it');
    lacks(r.said.alert, 'Raise a change order instead', 'not the change order it used to prescribe');
    r = editSave(Object.assign({}, JOB, { agrSent: true }), { 'ec-sqft': '5200' }, { store: { 7: { approved: true, estimate: { rooms: [] } } } });
    has(r.said.alert, 'change order', 'once the packet is out the alert prescribes a change order');
    lacks(r.said.alert, 'Then change them here.', 'and does not promise the fields open again');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('B21 — every field intake requires carries the red mark, the estate\'s administration included');
  {
    const intake = divBlock(src, src.indexOf('<div class="panel" id="panel-intake">'));
    ok(intake.length > 5000, 'the intake panel is found (' + intake.length + ' chars)');
    // The ids the required-field rule is fed from, read off saveIntake itself.
    const body = live(fn('saveIntake'));
    const call = body.slice(body.indexOf('clientMissingFields({'), body.indexOf('});', body.indexOf('clientMissingFields({')));
    const direct = [...call.matchAll(/_iv\('(i-[a-z-]+)'\)/g)].map((m) => m[1]);
    ok(direct.indexOf('i-matter-type') >= 0 && direct.length >= 12, 'the rule\'s inputs are read off saveIntake (' + direct.length + ')');
    const ALWAYS = ['i-fname', 'i-lname', 'i-phone', 'i-email', 'i-addr', 'i-city', 'i-zip', 'i-sqft', 'i-ptype', 'i-src', 'i-svc', 'i-start'];
    ALWAYS.forEach((id) => has(body, "getElementById('" + id + "')", 'saveIntake reads #' + id));
    // The label a person reads for each control: the last <label> before it.
    const labelFor = (id) => {
      const at = intake.indexOf('id="' + id + '"');
      if (at < 0) return null;
      const l = intake.lastIndexOf('<label', at);
      return intake.slice(l, intake.indexOf('</label>', l) + 8);
    };
    ALWAYS.concat(direct).forEach((id) => {
      const lab = labelFor(id);
      ok(lab && (/#A32D2D/.test(lab) || /class="req-probate"/.test(lab)), 'the label for #' + id + ' carries the required mark' + (lab ? '' : ' (no label found)'));
    });
    has(labelFor('i-matter-type'), 'How is this estate being administered? <span style="color:#A32D2D;font-weight:700;">*</span>',
       '⚠⚠ the administration question carries the same mark as the date of death beside it');
    // Edit Client asks it with the mark already.
    const r = editSave(ESTATE, {});
    ok(/How is this estate being administered\?<span style="color:#A32D2D;"> \*<\/span>/.test(r.html), 'Edit Client marks it too');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('B23 — the sourcing card pairs each number with whom it reaches');
  {
    const V = { vendor_name: 'Acme Hauling', phone: '5615550100', contact_first: 'Andy', contact_last: 'Ramirez', contact_mobile: '5615550199',
                contact2_first: 'Bea', contact2_last: 'Cole', contact2_email: 'bea@acme.test', _row: 5, category: 'Junk Removal' };
    const mk = (dir) => sandbox({ fns: ['_vendorRefLine', 'resolveJobVendor', 'lookupVendorById', 'vendorIdOf', 'vendorContacts', 'fmtPhoneDisplay', 'esc'],
      vars: ['VENDOR_CONTACT_SLOTS'], stubs: { vendorDirectory: dir, saveJobs() {} } });
    const line = (dir, rec) => { const a = attempt(() => mk(dir)._vendorRefLine(rec)); return a.ok ? a.val : 'THREW ' + a.err; };
    const h = line([V], { vendorId: 5, vendorName: 'Acme Hauling' });
    lacks(h, 'THREW', 'the line renders' + (h.indexOf('THREW') === 0 ? ' — ' + h : ''));
    const t = text(h);
    has(t, 'Acme Hauling · ☎ (561) 555-0100 office · Andy Ramirez ☎ (561) 555-0199 mobile · Bea Cole', '⚠⚠ the office line is labelled the office, and Andy\'s own mobile sits beside Andy');
    lacks(h, 'Ramirez</strong> · <a href="tel:5615550100"', '⚠ contact 1\'s name is never followed by the office number');
    has(h, 'href="tel:5615550199"', 'Andy\'s mobile dials');
    has(h, 'href="tel:5615550100"', 'and so does the office');
    // A contact typed with a number and no name.
    const h2 = line([Object.assign({}, V, { contact_first: '', contact_last: '' })], { vendorId: 5, vendorName: 'Acme Hauling' });
    has(text(h2), '☎ (561) 555-0199 contact mobile', 'a mobile with no name recorded says it is a contact\'s, not the firm\'s');
    // Gone from the directory: the name recorded when the vendor was assigned, and the office line it was assigned with.
    const h3 = line([], { vendorName: 'Gone Co', contact: 'Old Name', phone: '5615550111' });
    has(text(h3), 'Gone Co · ☎ (561) 555-0111 office · Old Name', 'a vendor gone from the directory still labels its number the office\'s');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('B24 — a Home Prep worksheet with declutter hours files the vendor list and the hours, and adds up');
  {
    const worksheet = (est, job) => {
      let out = null;
      const r = attempt(() => sandbox({ fns: ['exportEstimateToDrive', 'estimateIsFeeOnly', 'estDeclutterHrs', 'estDeclutterHrsQuoted', 'prepFeeRate', 'fmt', 'esc', 'estimateDocNames', '_todayStr', '_ymdLocal', 'roundCents', 'fmtHrs'],
        vars: ['PREP_FEE_RATE'], stubs: { jobs: [job], resolveSubfolderId: (j, name, cb) => cb('F1'),
          uploadHtmlToDrive: (folder, name, html) => { out = { name, html }; }, showSyncBadge() {} } }).exportEstimateToDrive(job.id, est));
      return r.ok ? out : { html: 'THREW ' + r.err };
    };
    // The estimate as the phone builds it: the real engine, a painter at $20,000, 5.5 declutter hours, 10% off.
    const b = attempt(() => {
      const d = driveCalcAll({ svc: 'prep', sqft: 3500, rooms: [], seed: { 'e-declutter-hrs': '5.5', 'e-discount': '10' } });
      d.ctx.prepItems.push({ type: 'Painting <b>x</b>', cost: 20000, note: 'whole house' }); d.ctx.calcAll();
      return d.ctx.currentEstimate;
    });
    ok(b.ok, 'the prep estimate is built by the real engine' + (b.ok ? '' : ' — ' + b.err));
    const est = b.ok ? b.val : {};
    const job = { id: 7, hvlId: 'HVL-0007', name: 'Marston', svc: 'prep' };
    // ⚠⚠ RESTATED 2026-10-01 (P17; measured through the real engine): billed hours are the quoted quarter hours, so 5.5 hours
    // bill as 5.5 ($825), where they were rounded up to 6 whole hours ($900); the discount is $82.50 and the total $6,742.50
    // (it was $90 and $6,810). The worksheet's "billed as" clause is said only where the record bills other hours than it
    // quoted — a record saved before today, whose 5.5 billed as 6.
    // ⚠⚠ RESTATED 2026-10-02 (P18, Anthony's answer B; re-measured through the real engine): estimates are whole hours,
    // rounded up, and a typed 5.5 is SAVED as 6 (getDeclutterTCHrs), so the record quotes and bills 6 ($900), the discount
    // is $90 and the total $6,810 — the figures before P17, now with a quoted figure that matches them.
    eq([est.declutterTCHrs, est.totTC, est.tcFee, est.prepFee, est.discountAmt, est.havellinTotal], [6, 6, 900, 6000, 90, 6810],
       'fixture: 5.5 typed is saved and billed as 6 hours ($900), the fee is $6,000, the discount $90, the total $6,810');
    const w = worksheet(est, job) || { html: '' };
    has(w.name, 'Estimate Worksheet (INTERNAL)', 'it files as the internal worksheet');
    has(w.html, '<th>Prep vendor line</th>', '⚠⚠ it files the vendor list the estimate quoted');
    has(w.html, 'Painting &lt;b&gt;x&lt;/b&gt;', 'with each line (escaped)');
    lacks(w.html, '<th>Room</th>', '⚠⚠ and no empty room table');
    has(text(w.html), 'Declutter hours (Transition Concierge): 6.0 quoted x $150/hr = $900', '⚠ the declutter hours as they bill');
    lacks(text(w.html), 'billed as', 'no "billed as" when the whole hours quoted are the hours billed');
    const wOld = worksheet(Object.assign({}, est, { declutterTCHrs: 5.5, totTC: 6, tcFee: 900, discountAmt: 90, havellinTotal: 6810 }), job) || { html: '' };
    has(text(wOld.html), 'Declutter hours (Transition Concierge): 5.5 quoted, billed as 6.0 hours x $150/hr = $900', 'a record saved before P17 still says it billed 6 hours');
    const wP17 = worksheet(Object.assign({}, est, { declutterTCHrs: 5.5, totTC: 5.5, tcFee: 825, discountAmt: 82.5, havellinTotal: 6742.5 }), job) || { html: '' };
    has(text(wP17.html), 'Declutter hours (Transition Concierge): 5.5 quoted x $150/hr = $825', 'and one saved on P17\'s day bills the 5.5 it quoted');
    const foot = text(w.html.slice(w.html.lastIndexOf('<div style="margin-top:20px;font-size:14px;">')));
    has(foot, 'Fee rate: 30% = $6,000', 'the footer states the fee');
    has(foot, 'Declutter: $900', 'the hours');
    has(foot, 'Discount: -$90', 'the discount');
    has(foot, 'Havellin Total: $6,810', 'and the total');
    // RESTATED (P17): read with the cents, and added in cents.
    const n = (s) => Math.round(Number(String(s).replace(/[^0-9.]/g, '')) * 100);
    const fee = n((/Fee rate: 30% = (\$[\d,]+(?:\.\d\d)?)/.exec(foot) || [])[1]), dc = n((/Declutter: (\$[\d,]+(?:\.\d\d)?)/.exec(foot) || [])[1]),
          di = n((/Discount: -(\$[\d,]+(?:\.\d\d)?)/.exec(foot) || [])[1]), tot = n((/Havellin Total: (\$[\d,]+(?:\.\d\d)?)/.exec(foot) || [])[1]);
    eq(fee + dc - di, tot, '⚠ the footer adds up to its own total, to the cent: fee + declutter − discount');

    // Fee-only (no hours): the list, no hours line. A labour job: the room table, as before.
    const b0 = attempt(() => { const d = driveCalcAll({ svc: 'prep', sqft: 3500, rooms: [] }); d.ctx.prepItems.push({ type: 'Staging', cost: 10000 }); d.ctx.calcAll(); return d.ctx.currentEstimate; });
    const w0 = b0.ok ? worksheet(b0.val, job) : { html: '' };
    has(w0.html, '<th>Prep vendor line</th>', 'a fee-only prep estimate still files the vendor list');
    lacks(w0.html, 'Declutter hours', 'with no hours line');
    has(text(w0.html), 'Havellin Total: $3,000', 'and its total is the fee alone');
    const bL = attempt(() => driveCalcAll({ svc: 'downsizing', rooms: [{ name: 'Kitchen' }, { name: 'Living Room' }] }).est);
    const wL = bL.ok ? worksheet(Object.assign({}, bL.val, { rooms: bL.val.rooms.map((r, i) => i ? r : Object.assign({}, r, { name: 'Kitchen <b>k</b>', note: 'a & b' })) }),
      { id: 8, hvlId: 'HVL-<b>8', name: 'Lee <i>x</i>', svc: 'downsizing' }) : { html: '' };
    has(wL.html, '<th>Room</th>', 'a labour estimate files its room table, as before');
    lacks(wL.html, '<th>Prep vendor line</th>', 'and no vendor list');
    has(wL.html, 'Kitchen &lt;b&gt;k&lt;/b&gt;', 'its room names are escaped');
    has(wL.html, 'a &amp; b', 'its room notes');
    has(wL.html, 'Lee &lt;i&gt;x&lt;/i&gt;', 'and the client\'s name');
    has(wL.html, 'HVL-&lt;b&gt;8', 'and the job id');
    ['<b>k', '<i>x', '<b>8'].forEach((raw) => lacks(wL.html, raw, 'the worksheet never prints ' + raw + ' as markup'));
    // The quoted-vs-billed family: the worksheet asks what was QUOTED, never what the job bills now.
    const body = live(fn('exportEstimateToDrive'));
    has(body, 'var _prepWs = (est.svc === \'prep\') || _feeOnlyWs;', 'the list follows the service, or a fee-only quote');
    lacks(body, 'jobIsFeeOnly(', 'never the billing-side predicate');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('Stale text — the Premium toggle and the heirs subtitle say what the engine does, measured');
  {
    const SVCS = ['downsizing', 'downsizing_move', 'home_cleanout', 'cleanout', 'probate', 'contested_probate'];
    const ROOMS = ['Living Room', 'Kitchen', 'Primary Suite', 'Primary Bath', 'Bedroom 2', 'Bathroom 2', 'Dining Room', 'Office 1'];
    const sub = divBlock(src, src.indexOf('<div id="adj-pricing">'));
    // ⚠⚠ RESTATED 2026-10-01 (P17, Anthony's answer 1): Premium is the rates only. The toggle said it added 25 concierge hours
    // of specialty coordination, and the engine did; both are gone, and the toggle says the coordination comes from the lines.
    has(sub, '$185 TC / $125 PS rates only. Coordination comes from the vendor lines you add, as on every job.', 'the Premium toggle says it is the rates only');
    lacks(sub, '25 concierge hours', '⚠ and no longer promises the 25 hours');
    SVCS.forEach((svc) => {
      const a = attempt(() => driveCalcAll({ svc, rooms: ROOMS }).est);
      const b = attempt(() => driveCalcAll({ svc, rooms: ROOMS, seed: { 'e-prem': true } }).est);
      ok(a.ok && b.ok, svc + ': both builds run');
      if (a.ok && b.ok) {
        eq(b.val.totTC - a.val.totTC, 0, '⚠ ' + svc + ': Premium adds no concierge hours (' + a.val.totTC + ' → ' + b.val.totTC + '); it added 25 until P17');
        eq([b.val.tcRate, b.val.psRate], [185, 125], svc + ': at the rates it names');
      }
    });
    SVCS.forEach((svc) => {
      const r = attempt(() => { const d = driveCalcAll({ svc, rooms: ROOMS }); return { est: d.est, words: d.doc.getElementById('adj-heirs-sub').textContent }; });
      ok(r.ok, svc + ': the subtitle is painted');
      if (!r.ok) return;
      const w = r.val.words, e = r.val.est;
      if (svc === 'contested_probate') { has(w, 'Built into contested-probate rates', 'contested probate: built in, no uplift'); return; }
      const share = e.tcOffsite / e.totTC;
      const said = /about half/.test(w) ? 'half' : /about a quarter/.test(w) ? 'quarter' : '?';
      ok(said === 'half' ? (share >= 0.40 && share <= 0.62) : said === 'quarter' ? (share >= 0.18 && share <= 0.35) : false,
         '⚠ ' + svc + ': "' + w + '" — measured ' + Math.round(share * 100) + '% of the concierge hours are off-site coordination');
    });
    lacks(src, 'about half of total concierge hours)\'', 'the old blanket figure is gone from the code');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('Stale text — the refusals and confirms say what is true now');
  {
    // changeEstimateService: a family jump is a different client, and Edit Client refuses it too.
    const said = [];
    const C = attempt(() => {
      const d = domStub({ 'e-svc': 'cleanout', 'e-job': '1' });
      const c = sandbox({ fns: ['changeEstimateService', 'sameSvcFamily', 'svcFamily', 'isDecedentJob'], vars: ['DECEDENT_SERVICES', 'SVC_LABELS', 'SVC_ORDER', '_svcSelPrev'],
        stubs: { document: d, jobs: [{ id: 1, svc: 'prep' }], showFB: (id, k, m) => said.push(m) } });
      c._svcSelPrev = 'prep';
      c.changeEstimateService();
      return d.getElementById('e-svc').value;
    });
    ok(C.ok, 'the refusal is driven' + (C.ok ? '' : ' — ' + C.err));
    has(said[0], 'Create a new client for this with + Add New Client', '⚠ it names the route that exists: a new client');
    lacks(said[0], 'Edit Client', 'never Edit Client, which refuses the same crossing');

    // removeLogisticsLine: vendors are pass-through, so the quote was never billed.
    let msg = '';
    const job = { id: 4, logisticsSourcing: { dumpster: { vendorName: 'Acme', quote: 1200, added: true } } };
    sandbox({ fns: ['removeLogisticsLine', 'roundCents', 'fmt'], vars: ['LOGISTICS_CATEGORIES'],
      stubs: { jobs: [job], confirm: (m) => { msg = m; return false; }, _saveJobEdit() {}, refreshVendorSourcing() {} } }).removeLogisticsLine(4, 'dumpster');
    has(msg, 'Acme comes off it, and its $1,200 quote comes off the vendor costs the invoices list.', '⚠ the confirm says what the quote does');
    lacks(msg, 'no longer billed', 'not that Havellin stops billing what it never billed');
    ok(job.logisticsSourcing.dumpster, 'and a No keeps the line');

    // The referral leaderboard: attribution is set at intake and corrected on Edit Client (Q15).
    const dom = domStub({});
    sandbox({ fns: ['renderReferralLeaderboard', 'referralPartnerStats', 'referralIdOf', 'jobRefersToPartner', 'isJobWon', 'esc', 'roundCents', 'fmt'],
      stubs: { document: dom, referralDirectory: [{ uid: 'u-ann', partner_name: 'Ann Lowe', partner_type: 'Estate attorney' }],
               jobs: [{ id: 1, refPartnerId: 'u-ann', status: 'won', won: true, havellinEst: 20000 }] } }).renderReferralLeaderboard();
    has(dom.getElementById('referrals-leaderboard').innerHTML, 'jobs attributed to each partner at intake or on Edit Client', 'the leaderboard says where attribution is set');

    // jtScheduleHtml: the working days a delivered job took, in the singular when it is one.
    const J = sandbox({ fns: ['jtScheduleHtml', 'esc', 'fmtDate2'] });
    const one = text(J.jtScheduleHtml({ state: 'done', actualStart: '2026-09-01', delivered: '2026-09-01', workedDays: 1, days: 6 }));
    has(one, '1 working day against a 6-day plan', '⚠ one working day is a day');
    lacks(one, '1 working days', 'not "1 working days"');
    has(text(J.jtScheduleHtml({ state: 'done', actualStart: '2026-09-01', delivered: '2026-09-03', workedDays: 3, days: 6 })), '3 working days against a 6-day plan', 'and three are days');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('Stale text — the Home Prep cards and the vendor card say "site management fee" and count the declutter hours');
  {
    const PREP_JOB = { id: 1, svc: 'prep', name: 'Marston', tc: 'Ashley Jerome', status: 'active' };
    const SRC_FNS = ['renderVendorSourcing', 'jobPrepLines', 'coPrepVendorLines', 'coVendorAdds', '_srcLineKey', 'esc', 'fmt', 'dirStaleNotice',
      'logisticsLinesFor', 'logisticsCatsFor', 'logisticsLineOn', '_fldBg', 'vendorPickerOptions', '_selVendorId', 'resolveJobVendor',
      'lookupVendorById', 'vendorCategoriesForSlot', 'approvedVendorsInCats', 'isActiveVendor', '_catSet', 'vendorCats', 'vendorStatusOptions',
      '_coordHrsField', 'prepLineTCHrs', 'coordHrsFor', 'coordTouches', '_vendorRefLine', 'vendorPrimaryCat', 'vendorIdOf', 'vendorStars',
      'vendorPerf', 'prepFeeRate', 'coordHrsRollup', 'vendorContacts', 'fmtPhoneDisplay', 'roundCents', 'fmtHrs'];
    const s = attempt(() => sandbox({ fns: SRC_FNS, vars: ['LOGISTICS_CATEGORIES', 'GROUP_JOB_MENU', 'VENDOR_GROUP_CARDS', 'PREP_FEE_RATE', '_dirStale',
      'VENDOR_SLOT_CATEGORY_MAP', 'TOUCH_HRS', 'COORD_TOUCHES_BY_GROUP', 'COORD_TOUCHES', 'VENDOR_CONTACT_SLOTS'],
      stubs: { changeOrders: [], jobs: [PREP_JOB], estimateStore: {}, document: domStub({}), contractors: [], vendorDirectory: [] } })
      .renderVendorSourcing(1, PREP_JOB, { svc: 'prep', prepEnabled: true, prepItems: [{ type: 'Staging', cost: 3000, lid: 'st' }], vendors: [] }));
    ok(s.ok, 'the prep sourcing card renders' + (s.ok ? '' : ' — ' + s.err));
    // RESTATED 2026-10-01 (P17, Anthony's answer 5): the cards name the Home Sale Preparation Fee; they said "site management fee".
    has(text(s.ok ? s.val : ''), 'Havellin\'s 30% Home Sale Preparation Fee is calculated on these actuals', '⚠ the sourcing card names the Home Sale Preparation Fee');
    lacks(s.ok ? s.val : '', 'GC / Site', 'not a GC fee');

    const planFns = ['renderPrepJobPlan', 'planPhaseWrap', 'secCaret', 'estDeclutterHrs', 'prepFeeRate', 'esc', 'fmtDate2', 'chkGrid', 'planChk',
      '_planTaskDone', '_srcLineKey', 'jobLogEntries', 'estTolerancePctTxt', 'getJobPlan', '_planTouch', 'firearmsBannerHtml',
      'firearmsFlaggedAtIntake', '_firearmsRow', 'houseFlagsOf', 'renderCloseoutCard', 'renderCloseoutBody', 'closeoutState', 'closeoutMeta',
      '_assignedVendorsForJob', 'unratedVendorsForJob', 'lookupVendorById', 'vendorIdOf', 'bestClientEmail', '_coFmt', 'renderVendorScorecard',
      'computeVendorAvg', 'coAcceptedHours', 'coHoursTotal', 'coHours', 'coHoursLabel', '_coMoney', 'fmt', 'clientRecipient', 'isDecedentJob',
      'firstName', 'jobPrepLines', 'coPrepVendorLines', 'coVendorAdds', 'roundCents', 'fmtHrs'];
    const EST = { jobId: 1, svc: 'prep', prepEnabled: true, prepCost: 3000, prepFee: 900, declutterTCHrs: 0, tcRate: 150,
      prepItems: [{ type: 'Staging', cost: 3000, lid: 'st' }], vendors: [] };
    const p = attempt(() => sandbox({ fns: planFns, vars: ['DECEDENT_SERVICES', 'PREP_FEE_RATE', 'EST_TOLERANCE_PCT', '_planOpenPhases', 'HOUSE_FLAGS', 'FIREARMS_PROTOCOL_DOC'],
      stubs: { jobs: [PREP_JOB], jobLogs: { 1: [] }, jobPlans: {}, jobPlanStore: {}, vendorDirectory: [], contractors: [], changeOrders: [],
               estimateStore: { 1: { estimate: EST } }, _photoRefs: {}, standingFlagsBlock: () => '', _sfHost: () => '',
               renderVendorSourcing: () => '', document: domStub({}) } }).renderPrepJobPlan(1, PREP_JOB, EST));
    ok(p.ok, 'the prep plan renders' + (p.ok ? '' : ' — ' + p.err));
    has(text(p.ok ? p.val : ''), 'Havellin’s 30% Home Sale Preparation Fee is billed on the actual vendor spend logged here', '⚠ the budget card names the Home Sale Preparation Fee');
    lacks(p.ok ? p.val : '', 'GC / Site', 'not a GC fee');

    // The vendor card's subtitle on a Home Prep estimate: declutter hours ARE billed.
    const d = attempt(() => driveCalcAll({ svc: 'prep', sqft: 3500, rooms: [] }).doc.getElementById('vendors-card-sub').innerHTML);
    ok(d.ok, 'the subtitle is painted by calcAll' + (d.ok ? '' : ' — ' + d.err));
    lacks(d.ok ? d.val : '', 'no hours are billed', '⚠ the prep vendor card no longer says no hours are billed');
    has(d.ok ? d.val : '', 'coordinating these vendors books no hours; declutter hours, where the house needs them, are quoted separately and billed as worked',
        'it says what books no hours, and that declutter hours bill');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('Stale code comments — the figures they state are measured again, through the real engine');
  {
    const ROOMS = ['Entryway / Foyer', 'Living Room', 'Dining Room', 'Family Room / Great Room', 'Kitchen', 'Laundry Room', 'Office 1',
      'Primary Suite', 'Primary Bath', 'Walk-in Closet', 'Bedroom 2', 'Bathroom 2', 'Bedroom 3', 'Bathroom 3', 'Bedroom 4', 'Bathroom 4', 'Garage (2-car)'];
    // DOC_SCOPES: the documentation step's share of an estate ticket, 3,500 sq ft at Normal, two specialists.
    const at = src.indexOf('// The `document` step is about a third of an estate ticket');
    const cm = at >= 0 ? src.slice(at, at + 400) : '';
    const said = /\((\d+)% Estate Settlement,\s*\n?\/\/\s*(\d+)% Probate, (\d+)% Contested/.exec(cm);
    ok(!!said, 'the DOC_SCOPES comment states three shares');
    const price = (svc, scope) => {
      const r = driveCalcAll({ svc, sqft: 3500, rooms: ROOMS });
      r.doc.getElementById('ps-crew-size').value = '2'; r.ctx._crewUserSet = true;
      r.ctx._estimateDocScope = scope; r.ctx.calcAll();
      return r.ctx.currentEstimate.havellinTotal;
    };
    [['cleanout', 1], ['probate', 2], ['contested_probate', 3]].forEach(([svc, i]) => {
      const m = attempt(() => { const f = price(svc, 'full'), n = price(svc, 'none'); return (f - n) / f * 100; });
      ok(m.ok && said && Math.abs(m.val - Number(said[i])) < 0.6,
         '⚠ ' + svc + ': the comment says ' + (said ? said[i] : '?') + '%, the engine measures ' + (m.ok ? m.val.toFixed(1) : m.err) + '%');
    });
    // computeEngineV3: the rows reconcile with the specialist line, and not with the concierge's.
    const ec = live(fn('computeEngineV3')) === fn('computeEngineV3') ? '' : fn('computeEngineV3');
    // RESTATED 2026-10-01 (P17): the billed figures are quarter hours now, so the comment's billed totals may carry a decimal.
    const nums = /\((\d+\.\d) of (\d+(?:\.\d+)?) on a 3,500 sqft Estate Settlement/.exec(ec);
    const tcs = /\(the rows\s*\n?\s*\/\/\s*carry (\d+\.\d) of that job's (\d+(?:\.\d+)?) concierge hours\)|carry (\d+\.\d) of that job's (\d+(?:\.\d+)?) concierge hours/.exec(ec);
    ok(!!nums && !!tcs, 'the computeEngineV3 comment states both reconciliations');
    const e = attempt(() => driveCalcAll({ svc: 'cleanout', sqft: 3500, rooms: ROOMS }).est);
    if (e.ok && nums && tcs) {
      const rPS = e.val.rooms.reduce((a, r) => a + (r.psH || 0), 0), rTC = e.val.rooms.reduce((a, r) => a + (r.tcH || 0), 0);
      eq([rPS.toFixed(1), String(e.val.totPS)], [nums[1], nums[2]], '⚠ the rows\' specialist hours are what the comment says, against the billed line');
      // RESTATED 2026-10-02 (P18): the billed figure is rounded up to the whole hour again (96.4 of 97; 96.4 of 96.5 on P17).
      ok(Math.abs(e.val.totPS - rPS) < 1, 'short only of the rounding up to the whole hour (P18; to the nearest quarter on P17)');
      eq([rTC.toFixed(1), String(e.val.totTC)], [tcs[1] || tcs[3], tcs[2] || tcs[4]], 'and the rows carry the share of the concierge line it says');
      ok(rTC < e.val.totTC / 2, 'which never reconciles — off-site coordination and presence belong to no room');
    }
  }
};
