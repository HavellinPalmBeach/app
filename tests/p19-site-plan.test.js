'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// P19 · W4 THE JOB PLAN AND WHAT THE CREW FINDS IN THE HOUSE (2026-10-03).
// Anthony, 2026-10-03: "i'm good with all of your calls. build it all".
//   D1 An original will found on site: described from the outside only, handed to the estate attorney the same day
//      against a signed receipt, and followed until the deposit with the clerk is confirmed (§732.901: ten days from
//      the hand-over, red once past). Havellin never keeps it. (Counsel confirms.)
//   D2 Cash found: counted by two different people, sealed in a numbered bag, signed for by the fiduciary the same day.
//      Refused only without two counters or a bag number (and without the count itself); everything else is flagged.
//   D3 The trustee's own desk list (tt_*) beside the court's (ct_*), keyed on the trust track and the tier;
//      ct_pr_signoff deleted with no twin; trustee_authority on Before Day 1.
//   D4 Chain of custody mandatory on the trust track, as on the probate track.
//   D5 The authority chip names the paper estateAuthority names; the Form 706 chip reads estateTaxReturn.
//   D6 "The representative", never "PR", where the matter may be a trust or a family.
// Driven through the real catalogue, the real renderers and the real dialog handlers; the boundaries (the network,
// FileReader, the store saves, the print dialog) are stubbed by name. Dates run in Eastern, and today is always an
// argument or a stub: never the clock.
// ─────────────────────────────────────────────────────────────────────────────

const { sandbox, domStub, source, fn, decl } = require('./harness');

const SRC = source();
const inEastern = (body) => { const prev = process.env.TZ; process.env.TZ = 'America/New_York'; try { return body(); } finally { process.env.TZ = prev; } };
function attempt(f) { try { return { ok: true, val: f() }; } catch (e) { return { ok: false, err: String(e && e.message || e) }; } }
// Live source of one function: comment lines stripped (a needle must not match the comment that explains it).
const live = (name) => fn(name).split('\n').filter((l) => !l.trim().startsWith('//')).map((l) => l.replace(/\s\/\/\s.*$/, '')).join('\n');

const CTX_FNS = ['planTaskCtx', 'jobOnProbateTrack', 'planTasksFor', 'invFiduciaryMode', 'isDecedentJob', 'firearmsFlaggedAtIntake',
  'houseFlagsOf', 'matterTypeOf', 'matterDef', 'docTierOf', 'docTierDef', 'docTierProduces', 'docTierScope', 'docTierScopeMirror',
  'svcHasDocStep', 'jobAppraisalDuty', 'approvedEstimateFor', 'appraisalDuty', 'estimateDocScope', 'estimateAppraiserLines', 'docScopeDef'];
const CTX_VARS = ['PLAN_TASKS', 'JOB_ADMIN_TASKS', 'DECEDENT_SERVICES', 'MATTER_TYPES', 'DOC_TIERS', 'DOC_TIER_FROM_SCOPE', 'JOB_STEPS',
  'HOUSE_FLAGS', 'FIREARMS_PROTOCOL_DOC', 'DOC_SCOPES'];
// planDerivedLines and what it reads, as job-desk-scope lifts it, plus the P19 answers it now asks.
const DERIVED_FNS = ['planDerivedLines', 'planDerivedHtml', 'planTaskCtx', 'jobOnProbateTrack', 'invFiduciaryMode', 'isDecedentJob', '_planRooms',
  'roomStatusNormalize', 'firearmsFlaggedAtIntake', 'houseFlagsOf', '_jobInvRefs', '_srcLineKey', 'matterTypeOf', 'matterDef', 'docTierOf',
  'docTierDef', 'docTierProduces', 'svcHasDocStep', 'estimateIsFeeOnly', 'estDeclutterHrs', 'jobIsFeeOnly', 'coAcceptedHours', 'coHoursTotal',
  'coHours', 'jobAppraisalDuty', 'approvedEstimateFor', 'appraisalDuty', 'estimateDocScope', 'estimateAppraiserLines', 'docScopeDef',
  'jobPrepLines', 'coPrepVendorLines', 'coVendorAdds', 'roundCents', 'fmtHrs', 'fmt', '_hrsTxt',
  'estateAuthority', 'estateTaxReturn', '_ymdLocal', 'fmtDate2', 'esc', 'escLines', 'jobListEntries', 'jobFiduciaries', 'signedRecordsOf',
  'siteFindLines', 'siteFindsOf', 'siteFindDefaultHolder', 'willDepositDue',
  'donationReceiptLine', 'ledgerDerivedLines', 'ledgerSignedCopies', '_agrApprover', 'jobTakesProceedsStatements', 'proceedsLine'];
const DERIVED_VARS = ['DECEDENT_SERVICES', 'jobPlanStore', 'TC_DONE_STATUSES', 'PS_DONE_STATUSES', 'ROOM_STATUS_META', 'ROOM_STATUS_LEGACY',
  'INV_RELEASE_DISPOSITIONS', 'FIREARMS_PROTOCOL_DOC', 'HOUSE_FLAGS', 'changeOrders', 'MATTER_TYPES', 'DOC_TIERS', 'DOC_TIER_FROM_SCOPE',
  'JOB_STEPS', 'DOC_SCOPES', 'ESTATE_AUTHORITIES', 'SITE_FIND_KINDS', 'WILL_DEPOSIT_DAYS', 'LEDGER_SIGNED_REF', 'INV_SALE_DISPOSITIONS'];
const DERIVED_STUBS = () => ({ isFormalDoc: () => false, docSentAt: () => null, jobLogEntries: () => [], stagePaidTotal: () => 0,
  isAgreementSigned: () => false, isJobFunded: () => false, depositPaidTotal: () => 0, _photoRefs: { 7: [], 41: [] },
  estimateStore: { 7: { estimate: { rooms: [{ idx: 0, name: 'Kitchen' }] } } } });
// The Found on site card and its dialog, the foundation's list writers and the signed-copy path, on top.
const FIND_FNS = ['siteFindsCardHtml', '_siteFindRowHtml', '_repaintSiteFinds', 'openSiteFind', 'closeSiteFind', 'saveSiteFind', 'voidSiteFind',
  'siteFindRefusal', 'siteFindHandFlag', 'siteFindHolderFlag', 'siteFindDay', '_siteFindTeamNames', '_siteFindHolderNames',
  'willReceiptHtml', 'cashReceiptHtml', 'printSiteFindReceipt', '_siteFindFormRow', '_siteFindSigLine', '_invDocHead', '_invDocName',
  'jobListPut', 'jobListGet', 'jobListVoid', 'newJobListId', '_saveJobEdit', '_jobTouch', '_actor', 'samePerson', 'canonPersonName',
  'isCrewPlaceholder', '_andJoin', 'showFB', 'fileSignedCopy', '_signedCopyName', '_jobRootFolderId', 'signedCopyControlHtml',
  'fileSignedCopyFromInput', 'signedRecordLinksHtml'];
const FIND_VARS = ['JOB_RECORD_LISTS', 'SIGNED_RECORD_KINDS', 'SIGNED_COPY_MAX_BYTES', '_signedFiling', 'SIGNED_RECORDS_SUBFOLDER',
  '_signedCopySpecs', '_signedCopyKeys', 'PERSON_NAME_ALIASES', 'CONTRACTOR_TC_NAME', 'LOG_PLACEHOLDER_NAMES', '_SITE_FIND_BLANK',
  'WILL_RECEIPT_STATEMENT', 'CASH_RECEIPT_STATEMENT'];

module.exports = function ({ group, ok, eq, has, lacks }) {
  // ── 1 ─────────────────────────────────────────────────────────────────────
  group('D3 — the trustee\'s list, and the court\'s without its sign-off box: pinned cases');
  {
    const c = sandbox({ fns: CTX_FNS, vars: CTX_VARS, stubs: { isFormalDoc: () => false } });
    const admin = (job) => c.planTasksFor(c.JOB_ADMIN_TASKS, null, c.planTaskCtx(job, { svc: job.svc })).map((t) => t.key);
    const tt = (job) => admin(job).filter((k) => k.indexOf('tt_') === 0).map((k) => k.slice(3)).join(' ');
    const ct = (job) => admin(job).filter((k) => k.indexOf('ct_') === 0).map((k) => k.slice(3)).join(' ');
    eq(tt({ svc: 'cleanout', matterType: 'trust', docTier: 'values' }), 'schedule excluded delivered records',
       'a trust at Inventory with values: the schedule checked, other property excluded, the schedule and the records delivered');
    eq(tt({ svc: 'cleanout', matterType: 'trust', docTier: 'appraisals' }), 'schedule appraisals excluded delivered records',
       'at Inventory + appraisals the reports are ours to attach as well');
    eq(tt({ svc: 'cleanout', matterType: 'trust', docTier: 'contents' }), 'excluded delivered records',
       'on a contents list we state no values, so nothing asks us to verify one');
    eq(tt({ svc: 'cleanout', matterType: 'trust', docTier: 'none' }), 'delivered records',
       'at None the two deliverable checks and the exclusion are gone; delivery and the accounting records stay');
    eq(tt({ svc: 'cleanout', matterType: 'trust', docTier: 'contents', appraisers: [{ id: 1 }] }), 'appraisals excluded delivered records',
       '⚠ an appraiser on the record brings the attach box back at any tier, as on the court list');
    eq(tt({ svc: 'probate', matterType: 'trust', docTier: 'values' }), 'schedule excluded delivered records',
       'a Probate service recorded as a trust administration gets the same list');
    eq(tt({ svc: 'cleanout', matterType: 'trust' }), 'schedule excluded delivered records',
       'an unanswered tier reads as Inventory with values (the migration\'s map), as the court list does');
    eq(tt({ svc: 'cleanout', matterType: 'both', docTier: 'appraisals' }), 'schedule excluded delivered records',
       '⚠ a pour-over at the top tier: no second appraisals box — the court list already asks it');
    eq(ct({ svc: 'cleanout', matterType: 'both', docTier: 'appraisals' }), 'inventory appraisals nonprobate served filed accounting',
       'and the court list beside it, which does');
    ['', 'probate', 'neither'].forEach((m) => {
      eq(tt({ svc: 'probate', matterType: m || undefined, docTier: 'values' }), '', 'a probate service recorded ' + (m || 'unanswered') + ' gets no trustee\'s list');
    });
    eq(tt({ svc: 'cleanout', docTier: 'values' }), '', '⚠ an unanswered matter is never a trust matter: nothing in a service name says trust');
    ['downsizing', 'downsizing_move', 'home_cleanout', 'prep'].forEach((svc) => {
      eq(tt({ svc: svc, matterType: 'trust', docTier: 'appraisals' }), '', svc + ' gets none even with a trust matter written onto it');
    });
    eq(ct({ svc: 'probate' }), 'inventory nonprobate served filed accounting', 'the court list, without the PR\'s sign-off box');
    eq(admin({ svc: 'cleanout', matterType: 'trust', docTier: 'values' }).slice(-1)[0], 'rec_archived', 'the archive box still closes the card');

    const tasks = c.JOB_ADMIN_TASKS.filter((t) => t.key.indexOf('tt_') === 0);
    eq(tasks.length, 5, 'five trustee\'s boxes');
    tasks.forEach((t) => {
      eq(t.sec, 'Trust administration', t.key + ' sits under "Trust administration"');
      ok(!/court|733\.604|\bPR\b/i.test(t.sec + ' ' + t.label), t.key + ' names no court, no §733.604 and no PR');
    });
    ok(!c.JOB_ADMIN_TASKS.some((t) => t.key === 'ct_pr_signoff'), '⚠ ct_pr_signoff is deleted');
    ok(!c.JOB_ADMIN_TASKS.some((t) => /sign-?off/i.test(t.key + ' ' + t.label)), '⚠⚠ and no sign-off box on either list: the signed ledger is the record');
    has(c.JOB_ADMIN_TASKS.filter((t) => t.key === 'tt_records')[0].label, '§736.08135', 'the records box names the trustee\'s accounting statute');
    has(c.JOB_ADMIN_TASKS.filter((t) => t.key === 'tt_records')[0].label, 'sale proceeds, donations, disposal costs', 'and what the records are');
  }

  // ── 2 ─────────────────────────────────────────────────────────────────────
  group('D3 — every service × matter × tier × appraiser: each list on its own track, each appraisal box asked once');
  {
    const c = sandbox({ fns: CTX_FNS, vars: CTX_VARS, stubs: { isFormalDoc: () => false } });
    const SVCS = ['downsizing', 'downsizing_move', 'home_cleanout', 'prep', 'cleanout', 'probate', 'contested_probate'];
    const MATTERS = ['', 'probate', 'trust', 'both', 'neither'];
    const TIERS = ['', 'contents', 'values', 'appraisals', 'none'];
    let n = 0;
    const bad = [];
    SVCS.forEach((svc) => MATTERS.forEach((m) => TIERS.forEach((t) => [false, true].forEach((appr) => {
      const job = { svc: svc };
      if (m) job.matterType = m;
      if (t) job.docTier = t;
      if (appr) job.appraisers = [{ id: 1 }];
      const ctx = c.planTaskCtx(job, { svc: svc });
      const a = c.planTasksFor(c.JOB_ADMIN_TASKS, null, ctx).map((x) => x.key);
      const p = c.planTasksFor(c.PLAN_TASKS, null, ctx).map((x) => x.key);
      const dec = svc === 'cleanout' || svc === 'probate' || svc === 'contested_probate';
      // The tracks, worked out here from the rule rather than read off the ctx under test.
      const trust = dec && (m === 'trust' || m === 'both');
      const probate = dec && (m ? (m === 'probate' || m === 'both') : (svc === 'probate' || svc === 'contested_probate'));
      const tag = svc + '/' + (m || '-') + '/' + (t || '-') + (appr ? '/appr' : '');
      n++;
      const hasTT = a.some((k) => k.indexOf('tt_') === 0), hasCT = a.some((k) => k.indexOf('ct_') === 0);
      if (hasTT !== trust) bad.push(tag + ': trustee\'s list ' + hasTT);
      if (hasCT !== probate) bad.push(tag + ': court list ' + hasCT);
      if ((p.indexOf('trustee_authority') >= 0) !== trust) bad.push(tag + ': trustee_authority');
      if ((p.indexOf('pr_authority') >= 0) !== probate) bad.push(tag + ': pr_authority');
      if (trust && (a.indexOf('tt_delivered') < 0 || a.indexOf('tt_records') < 0)) bad.push(tag + ': delivery or records missing');
      const asks = (a.indexOf('ct_appraisals') >= 0 ? 1 : 0) + (a.indexOf('tt_appraisals') >= 0 ? 1 : 0);
      if (asks > 1) bad.push(tag + ': the appraisals asked twice');
      // An appraiser on the record is attached on a trust exactly where it would be on a probate estate.
      if (trust && appr && asks !== 1) bad.push(tag + ': a held appraisal not asked for');
      if (a.indexOf('ct_pr_signoff') >= 0) bad.push(tag + ': ct_pr_signoff');
    }))));
    eq(n, 350, 'the grid ran: 7 services × 5 matters × 5 tiers × with and without an appraiser');
    eq(bad, [], '⚠⚠ each list renders exactly on its own track, and no combination asks for an appraisal twice');
  }

  // ── 3 ─────────────────────────────────────────────────────────────────────
  group('D3/D6 — the Before Day 1 trust gate, and "the representative" for "PR" where the matter may not be probate');
  {
    const c = sandbox({ fns: CTX_FNS, vars: CTX_VARS, stubs: { isFormalDoc: () => false } });
    const task = (k) => c.PLAN_TASKS.filter((t) => t.key === k)[0] || {};
    eq([task('trustee_authority').phase, task('trustee_authority').sec], ['p0', 'Trust gate'], 'trustee_authority is a Before Day 1 box, under its own gate');
    has(task('trustee_authority').label, 'Certification of Trust (§736.1017)', 'it names the paper and the statute');
    has(task('trustee_authority').label, 'limits on the trustee’s powers', 'and asks for any limits on the trustee\'s powers to be noted');
    ok(c.PLAN_TASKS.indexOf(task('trustee_authority')) === c.PLAN_TASKS.indexOf(task('pr_authority')) + 1, 'directly after its probate twin');
    ['coi_provided', 'docs_sequestered', 'cash_logged'].forEach((k) => {
      ok(!/\bPR\b/.test(task(k).label), k + ' no longer says "PR"');
      has(task(k).label, 'representative', k + ' says "the representative"');
    });
    ['docs_sequestered', 'cash_logged'].forEach((k) => has(task(k).label, 'Found on site, below', k + ' points at the Found on site card\'s procedure'));
    has(task('docs_sequestered').label, 'an original will is recorded under Found on site', 'the papers box hands the will to the card');
    has(task('cash_logged').label, 'cash is counted and handed over under Found on site', 'and the valuables box hands the cash to it');
    has(task('cash_logged').label, 'written authority', 'nothing removed without the representative\'s written authority');
    ok(!c.PLAN_TASKS.concat(c.JOB_ADMIN_TASKS).some((t) => /\bPR\b/.test(t.label)), '⚠ no box on either list abbreviates the representative as PR');
    // The keys are the saved ticks: renaming one would orphan every tick made under it.
    ['coi_provided', 'docs_sequestered', 'cash_logged', 'pr_authority'].forEach((k) => ok(!!task(k).key, k + ' keeps its key'));
  }

  // ── 4 ─────────────────────────────────────────────────────────────────────
  group('D5 — the authority chip names the paper estateAuthority names, on one stored answer');
  inEastern(() => {
    const d = sandbox({ fns: DERIVED_FNS, vars: DERIVED_VARS, stubs: DERIVED_STUBS() });
    const p0 = (job) => d.planDerivedLines(7, Object.assign({ id: 7 }, job), { svc: job.svc, rooms: [{ idx: 0, name: 'Kitchen' }] }, 'p0', '2026-10-03');
    const auth = (job) => p0(job).filter((l) => l.key === 'letters' || l.key === 'certification')[0] || null;
    const L = auth({ svc: 'probate', executorAuth: 'pending' });
    eq([L && L.key, L && L.label, L && L.ok], ['letters', 'Letters of Administration on file', false], 'probate: the Letters line, its key kept');
    eq(L && L.detail, 'pending — recorded under Edit Client when the certified copy arrives, and the job cannot activate without it', 'with its wording unchanged');
    const T = auth({ svc: 'cleanout', matterType: 'trust', executorAuth: 'pending' });
    eq([T && T.key, T && T.label, T && T.ok], ['certification', 'Certification of Trust on file', false], '⚠ a trust-only matter: the Certification of Trust');
    has(T && T.detail, 'successor trustee’s proof of authority (§736.1017)', 'naming whose paper it is and the statute');
    has(T && T.detail, 'the job cannot activate without it', 'and that activation waits on it, as the Letters do');
    eq(auth({ svc: 'cleanout', matterType: 'trust', executorAuth: 'received' }).ok, true, 'received: green');
    eq(auth({ svc: 'cleanout', matterType: 'trust', executorAuth: 'notneeded' }).detail, 'not required on this matter', 'not required: green, saying so');
    eq(auth({ svc: 'cleanout', matterType: 'both', executorAuth: 'pending' }).key, 'letters', 'Both stays on the Letters (the court governs a pour-over)');
    eq(auth({ svc: 'probate', matterType: 'trust', executorAuth: 'pending' }).key, 'certification', 'a Probate service recorded as a trust takes the Certification');
    eq(auth({ svc: 'cleanout', matterType: 'neither' }), null, 'Neither: no paper, no line');
    eq(auth({ svc: 'cleanout' }), null, 'an Estate Settlement whose matter is unanswered: no line');
    eq(auth({ svc: 'downsizing' }), null, 'a living client: no line');
    // The chip and the activation gate cannot name two different papers: the line reads the one answer.
    has(live('planDerivedLines'), 'var auth = estateAuthority(job);', 'the line asks estateAuthority');
    lacks(live('planDerivedLines'), "key: 'letters'", '⚠ and keeps no second rule of its own for when the Letters are asked');
  });

  // ── 5 ─────────────────────────────────────────────────────────────────────
  group('D5 — the Form 706 chip: green on a firm date ahead, red while unanswered or once past, nothing on a no');
  inEastern(() => {
    const d = sandbox({ fns: DERIVED_FNS, vars: DERIVED_VARS, stubs: DERIVED_STUBS() });
    const line = (job, today) => d.planDerivedLines(7, Object.assign({ id: 7 }, job), { svc: job.svc, rooms: [{ idx: 0, name: 'Kitchen' }] }, 'p0', today)
      .filter((l) => l.key === 'form_706')[0] || null;
    const firm = line({ svc: 'cleanout', matterType: 'trust', deathDate: '2026-05-31', gate706: 'yes' }, '2026-10-03');
    eq([firm && firm.ok, firm && firm.label], [true, 'Form 706 due Feb 28, 2027'], 'a 706 answered yes: green, the due date in the label (31 May + 9 months is 28 Feb)');
    has(firm && firm.detail, 'counsel or the accountant files it', 'and it says who files it');
    const unfirm = line({ svc: 'cleanout', matterType: 'trust', deathDate: '2026-05-31' }, '2026-10-03');
    eq([unfirm && unfirm.ok, unfirm && unfirm.label], [false, 'Form 706 due Feb 28, 2027, if one is filed'], '⚠ unanswered: red, and the date says it is unfirm');
    has(unfirm && unfirm.detail, '<em>Form 706 being filed?</em> under Edit Client', 'naming the question to answer and where');
    has(unfirm && unfirm.detail, 'Ask the estate attorney', 'and whom to ask');
    const past = line({ svc: 'probate', deathDate: '2025-12-15', gate706: 'yes' }, '2026-10-03');
    eq([past && past.ok, past && past.label], [false, 'Form 706 due Sep 15, 2026'], '⚠ a firm date already past: red');
    has(past && past.detail, 'Form 4768', 'saying to confirm the return or an extension went in');
    has(past && past.detail, 'Havellin does not see the filing', 'and never claiming either one happened');
    eq(line({ svc: 'probate', deathDate: '2025-12-15', gate706: 'yes' }, '2026-09-15').ok, true, 'on the due day itself it is still green');
    eq(line({ svc: 'probate', deathDate: '2025-12-15', gate706: 'no' }, '2026-10-03'), null, 'answered no: no line');
    eq(line({ svc: 'probate', gate706: 'yes' }, '2026-10-03'), null, 'no date of death: nothing to compute, no line');
    eq(line({ svc: 'downsizing', deathDate: '2026-01-01', gate706: 'yes' }, '2026-10-03'), null, 'a living client: no line');
    // A job with no estate return never reads the clock (today absent, _todayStr not lifted here).
    const noClock = attempt(() => d.planDerivedLines(7, { id: 7, svc: 'probate', gate706: 'no' }, { svc: 'probate', rooms: [] }, 'p0'));
    ok(noClock.ok, 'a job with no 706 line renders with no clock to read: ' + (noClock.err || 'ok'));
  });

  // ── 6 ─────────────────────────────────────────────────────────────────────
  group('D5 — the two chips drawn: the red one carries its fix under the row, the green one its date');
  inEastern(() => {
    // The chip row passes no date, so planDerivedLines asks _todayStr: pinned here, never the clock.
    const d = sandbox({ fns: DERIVED_FNS.concat(['planGateChipsHtml', 'vendorSourcingProgress', 'logisticsLinesFor', 'logisticsLineOn', 'logisticsCatsFor',
      'jobTeamGateLine', 'crewDuplicates', 'isCrewPlaceholder', 'samePerson', 'canonPersonName']),
      vars: DERIVED_VARS.concat(['LOGISTICS_CATEGORIES', 'LOG_PLACEHOLDER_NAMES', 'CONTRACTOR_TC_NAME', 'PERSON_NAME_ALIASES']),
      stubs: Object.assign(DERIVED_STUBS(), { _todayStr: () => '2026-10-03' }) });
    const job = { id: 7, svc: 'cleanout', matterType: 'trust', executorAuth: 'pending', deathDate: '2026-05-31' };
    const h = d.planGateChipsHtml(7, job, { svc: 'cleanout', rooms: [{ idx: 0, name: 'Kitchen' }] });
    has(h, 'class="gate-chip gate-no" data-gate="certification">&#9679; Certification of Trust on file', 'the Certification chip, red while pending');
    has(h, 'class="gate-chip gate-no" data-gate="form_706">&#9679; Form 706 due Feb 28, 2027, if one is filed', 'the 706 chip, red while unanswered');
    has(h, '<strong>Form 706 due Feb 28, 2027, if one is filed:</strong> not known whether the estate files', 'with its fix under the row');
    lacks(h, 'data-gate="letters"', 'and no Letters chip on a trust');
    const g = d.planGateChipsHtml(7, Object.assign({}, job, { gate706: 'yes', executorAuth: 'received' }), { svc: 'cleanout', rooms: [] });
    has(g, 'class="gate-chip gate-ok" data-gate="form_706">&#10003; Form 706 due Feb 28, 2027</span>', 'answered yes: green, the date on the chip itself');
    has(g, 'class="gate-chip gate-ok" data-gate="certification"', 'and the Certification green once received');
  });

  // ── 7 ─────────────────────────────────────────────────────────────────────
  group('D4 — chain of custody is mandatory on the trust track, as on the probate track');
  {
    const PLAN_FNS = ['renderJobPlan', 'custodyLogKept', 'planTaskCtx', 'jobOnProbateTrack', 'invFiduciaryMode', 'isDecedentJob', 'planTasksFor', 'planTasksHtml',
      'planTaskSectionsHtml', 'planSubsec', 'chkGrid', 'planChk', '_planTaskDone', 'planPhaseWrap', 'secCaret', 'planDerivedHtml', 'planDerivedLines',
      'donationReceiptLine', 'ledgerDerivedLines', 'ledgerSignedCopies', 'signedRecordsOf', '_agrApprover', 'jobTakesProceedsStatements', 'proceedsLine',
      'estateAuthority', 'estateTaxReturn', 'jobListEntries', 'siteFindsCardHtml', 'siteFindsOf', '_planRooms', '_planRoomStatus', '_planRoomListHtml',
      '_shotCount', '_slotRefs', 'roomStatusNormalize', 'firearmsBannerHtml', 'firearmsWorkspaceLine', 'firearmsFlaggedAtIntake', '_firearmsRow',
      'houseFlagsOf', '_jobInvRefs', '_srcLineKey', 'planGateChipsHtml', 'vendorSourcingProgress', 'logisticsLinesFor', 'logisticsLineOn',
      'logisticsCatsFor', 'jobTeamGateLine', 'crewDuplicates', 'isCrewPlaceholder', 'samePerson', 'canonPersonName', 'planVendorsMeta',
      'planStageMeta', 'planHoursMeta', 'planHoursMetaHtml', 'planHoursRuleTxt', '_hrsTxt', 'planStageCard', 'planStageState', 'planCurrentStage',
      'matterTypeOf', 'matterDef', 'docTierOf', 'docTierDef', 'docTierProduces', 'svcHasDocStep', 'estimateIsFeeOnly', 'estDeclutterHrs',
      'jobIsFeeOnly', 'renderCloseoutCard', 'renderCloseoutBody', 'closeoutState', 'closeoutMeta', '_assignedVendorsForJob', 'unratedVendorsForJob',
      'lookupVendorById', 'vendorIdOf', 'bestClientEmail', '_coFmt', 'computeVendorAvg', 'esc', 'fmtDate2', 'coAcceptedHours', 'coHoursTotal',
      'coHours', 'clientRecipient', 'firstName', 'jobAppraisalDuty', 'approvedEstimateFor', 'appraisalDuty', 'estimateDocScope',
      'estimateAppraiserLines', 'docScopeDef', 'jobPrepLines', 'coPrepVendorLines', 'coVendorAdds', 'roundCents', 'fmtHrs', 'fmt'];
    const PLAN_VARS = ['DECEDENT_SERVICES', 'SVC_LABELS', '_planOpenPhases', 'PLAN_TASKS', 'PLAN_FLOW', 'FIREARMS_PROTOCOL_DOC', 'HOUSE_FLAGS',
      'jobPlanStore', 'estimateStore', 'TC_DONE_STATUSES', 'PS_DONE_STATUSES', 'ROOM_STATUS_META', 'ROOM_STATUS_LEGACY', 'INV_RELEASE_DISPOSITIONS',
      'changeOrders', 'MATTER_TYPES', 'DOC_TIERS', 'DOC_TIER_FROM_SCOPE', 'JOB_STEPS', 'LOGISTICS_CATEGORIES', 'LOG_PLACEHOLDER_NAMES',
      'CONTRACTOR_TC_NAME', 'PERSON_NAME_ALIASES', 'DOC_SCOPES', 'ESTATE_AUTHORITIES', 'SITE_FIND_KINDS', 'LEDGER_SIGNED_REF', 'INV_SALE_DISPOSITIONS'];
    const render = (job, formal) => {
      const dom = domStub({});
      const j = sandbox({ fns: PLAN_FNS, vars: PLAN_VARS, stubs: {
        document: dom, isFormalDoc: () => !!formal, _sfHost: () => '', renderVendorSourcing: () => '', renderVendorScorecard: () => '',
        _importableFromEstimate: () => ({ collections: [], vehicles: [] }), getPlanNote: () => '', paymentSplit: () => ({ midpoint: 1000 }),
        planScheduleHtml: () => '', docSentAt: () => null, isAgreementSigned: () => false, isJobFunded: () => false, depositPaidTotal: () => 0,
        stagePaidTotal: () => 0, jobLogEntries: () => [], _photoRefs: { 7: [] }, _todayStr: () => '2026-10-03' } });
      const est = { svc: job.svc, rooms: [{ idx: 0, name: 'Kitchen', tcH: 1, psH: 2 }] };
      j.estimateStore[7] = { estimate: est, approved: true };
      const out = j.renderJobPlan(7, Object.assign({ id: 7, name: 'X', won: true }, job), est);
      return { out, hdr: dom.getElementById('job-plan-header').innerHTML };
    };
    const MUST = 'Chain of custody is mandatory on this job';
    has(render({ svc: 'cleanout', matterType: 'trust' }).hdr, MUST, '⚠⚠ a trust administration at the Standard level: mandatory (it was not)');
    has(render({ svc: 'probate', matterType: 'trust' }).hdr, MUST, 'and a Probate service recorded as a trust');
    has(render({ svc: 'cleanout', matterType: 'both' }).hdr, MUST, 'a pour-over');
    has(render({ svc: 'cleanout', matterType: 'probate' }).hdr, MUST, 'a probate matter, as before');
    has(render({ svc: 'probate' }).hdr, MUST, 'a Probate service, as before');
    lacks(render({ svc: 'cleanout', matterType: 'neither' }).hdr, MUST, 'a family distribution at Standard: not mandatory');
    lacks(render({ svc: 'cleanout' }).hdr, MUST, 'an Estate Settlement whose matter is unanswered: not (an unanswered matter is never a trust)');
    lacks(render({ svc: 'downsizing' }).hdr, MUST, 'a living client at Standard: not');
    has(render({ svc: 'downsizing' }, true).hdr, MUST, 'Formal makes it mandatory anywhere, as before');

    // The close-out stage says where the desk lists went, the trustee's included.
    has(render({ svc: 'cleanout', matterType: 'trust' }).out, 'Financial close, the trustee&rsquo;s list and records are desk work', 'a trust plan names its desk list');
    has(render({ svc: 'cleanout', matterType: 'both' }).out, 'Financial close, the §733.604 filing list, the trustee&rsquo;s list and records', 'a pour-over names both');
    has(render({ svc: 'downsizing' }).out, 'Financial close and records are desk work', 'a living plan names neither');

    // ── The Found on site card, on the In the house stage of an estate only, under the boxes that point down at it.
    const est8 = render({ svc: 'cleanout', matterType: 'trust' }).out;
    const at = est8.indexOf('id="plan-finds-7"');
    ok(at > est8.indexOf('<!--/stage-p0-->') && at < est8.indexOf('<!--/stage-rooms-->'), '⚠ the Found on site card is on the In the house stage');
    ok(at > est8.indexOf("'cash_logged'"), 'under the in-house boxes that point "below" at it');
    has(est8, 'openSiteFind(7,\'will\')">Record an original will', 'with Record an original will');
    has(est8, 'openSiteFind(7,\'cash\')">Record cash found', 'and Record cash found');
    lacks(render({ svc: 'downsizing' }).out, 'plan-finds-7', 'a living client\'s plan has no Found on site card');
    lacks(render({ svc: 'home_cleanout' }).out, 'plan-finds-7', 'nor a Home Cleanout');
  }

  // ── 8 ─────────────────────────────────────────────────────────────────────
  // The handlers, driven: the dialog's fields are the domStub's elements, the store saves are counted, and the
  // signed receipt goes through the foundation's real fileSignedCopy with only the network and the reader stubbed.
  function rig(o) {
    o = o || {};
    const dom = domStub({});
    const log = { saves: 0, syncs: 0, badges: [], uploads: [], prompts: [], printed: null };
    const S = sandbox({
      fns: DERIVED_FNS.concat(FIND_FNS), vars: DERIVED_VARS.concat(FIND_VARS),
      stubs: Object.assign(DERIVED_STUBS(), {
        document: dom, setTimeout: () => 0,
        _todayStr: () => o.today || '2026-10-03',
        saveJobs: () => { log.saves++; }, syncJobToSheets: () => { log.syncs++; },
        showSyncBadge: (m, err) => { log.badges.push({ m: m, err: !!err }); },
        resolveValBasis: () => 'Fair Market Value', estateValueDate: () => '',
        _printDocument: (html, title) => { log.printed = { html: html, title: title }; return true; },
        SHEETS_SYNC_URL: 'https://script.google.com/macros/s/P19/exec',
        resolveSubfolderId: (j, name, cb) => cb('SUBSIGNED'),
        uploadToDrive: (folderId, filename, dataUrl, cb) => { log.uploads.push({ folderId, filename }); cb(true, 'https://drive.google.com/file/d/F' + log.uploads.length + '/view', 'F' + log.uploads.length); },
        FileReader: function () { const self = this; self.readAsDataURL = function (f) { self.result = 'data:' + f.type + ';base64,QUJD'; if (self.onload) self.onload(); }; },
      }),
    });
    S.window.prompt = (msg) => { log.prompts.push(msg); return o.prompt === undefined ? '' : o.prompt; };
    const job = Object.assign({ id: 41, hvlId: 'HVL-2610-ADLR', name: 'Estate of Harold Adler', svc: 'cleanout', matterType: 'trust',
      executor: 'Ruth Adler', executorRole: 'Trustee', executorEmail: 'ruth@example.com', probateAttyName: 'Richard Comiter',
      tc: 'Ashley Jerome', addr: '100 Ocean Blvd', city: 'Palm Beach', driveFolder: 'https://drive.google.com/drive/folders/ROOT41',
      crew: { tc: { name: 'Ashley Jerome' }, ps: [{ name: 'Anthony Graziano Jr' }, { name: 'Contractor TBD' }] } }, o.job || {});
    S.jobs = [job];
    S.estimateStore[41] = { estimate: { svc: job.svc, rooms: [{ idx: 0, name: 'Study' }] }, approved: true };
    const val = (id) => dom.getElementById(id).value;
    const set = (id, v) => { dom.getElementById(id).value = v; };
    const fb = () => dom.getElementById('fos-fb').innerHTML;
    const lines = (phase, today) => S.planDerivedLines(41, S.jobs[0], S.estimateStore[41].estimate, phase || 'finds', today || o.today || '2026-10-03');
    const card = () => S.siteFindsCardHtml(41, S.jobs[0], S.estimateStore[41].estimate);
    return { S, dom, log, job, val, set, fb, lines, card };
  }

  group('D1 — an original will: recorded the day it is found, red while Havellin holds it');
  inEastern(() => {
    const r = rig();
    eq(r.S.openSiteFind(41, 'will'), true, 'Record an original will opens the dialog');
    eq(r.dom.getElementById('fos-modal').style.display, 'flex', 'on screen');
    eq(r.dom.getElementById('fos-title').textContent, 'Record an original will', 'titled for the act');
    eq([r.dom.getElementById('fos-sec-will').style.display, r.dom.getElementById('fos-sec-cash').style.display, r.dom.getElementById('fos-sec-dep').style.display],
       ['', 'none', 'none'], 'the will\'s fields shown, the cash and the deposit fields hidden');
    eq(r.val('fos-date'), '2026-10-03', 'found on: today by default');
    eq(r.val('fos-handed-to'), 'Richard Comiter', '⚠ handed to: the estate attorney recorded, by default');
    eq(r.val('fos-handed-on'), '', 'and no hand-over date: leave it blank while Havellin holds it');
    has(r.dom.getElementById('fos-holders').innerHTML, 'value="Ruth Adler"', 'the representative is offered as well');
    has(r.dom.getElementById('fos-team').innerHTML, 'value="Anthony Graziano Jr"', 'the team is offered as the finder');
    lacks(r.dom.getElementById('fos-team').innerHTML, 'Contractor TBD', 'never a placeholder');
    has(r.dom.getElementById('fos-summary').innerHTML, 'never open, read, copy or photograph its contents', 'the dialog states the rule first');

    // Every missing piece named at once, and nothing written.
    r.set('fos-date', '');
    eq(r.S.saveSiteFind(), false, 'a will with nothing described is refused');
    has(r.fb(), 'Enter the day it was found, who found it and what it looks like from the outside.', 'naming all three at once');
    ok(!r.job.siteFinds || r.job.siteFinds.length === 0, 'and writes nothing');
    eq(r.log.saves, 0, 'saves nothing');

    r.set('fos-date', '2026-10-03'); r.set('fos-where', 'study, desk drawer'); r.set('fos-found-by', 'Anthony Graziano Jr');
    r.set('fos-desc', 'Sealed white envelope marked "Last Will" <b>in ink</b>');
    eq(r.S.saveSiteFind(), true, 'recorded');
    const f = r.job.siteFinds && r.job.siteFinds[0];
    ok(!!f && typeof f.id === 'string', 'one find on job.siteFinds, with an id');
    eq([f.kind, f.foundOn, f.where, f.foundBy, f.description], ['will', '2026-10-03', 'study, desk drawer', 'Anthony Graziano Jr', 'Sealed white envelope marked "Last Will" <b>in ink</b>'], 'as typed');
    ok(!('handedOn' in f), '⚠ the prefilled attorney alone is not a hand-over: no date, no hand-over recorded');
    eq(f.recordedBy, 'Ashley Jerome', 'recorded by the concierge where no approver is on the job');
    ok(typeof (r.job.at || {})['siteFinds:' + f.id] === 'number', '⚠ stamped on its own key: a person\'s edit the sheet merges entry by entry');
    eq([r.log.saves, r.log.syncs], [1, 1], 'saved and synced once');
    eq(r.dom.getElementById('fos-modal').style.display, 'none', 'the dialog closes');

    const L = r.lines();
    eq(L.map((l) => [l.key.replace(f.id, 'ID'), l.ok, !!l.red]), [['will_held_ID', false, true]], '⚠⚠ one line, RED: Havellin holds an original will');
    eq(L[0].label, 'Original will held by Havellin', 'saying so');
    has(L[0].detail, 'hand it to Richard Comiter today, against a signed receipt', 'and what to do today, to whom');
    has(L[0].detail, 'Havellin never keeps an original will', 'and why');
    const desk = r.lines('admin');
    eq(desk[0] && desk[0].key, 'will_held_' + f.id, '⚠ first on the desk card too');
    const html = r.card();
    has(html, 'pl-line pl-open pl-red', 'drawn red on the card');
    has(html, 'Record the hand-over', 'the card offers the hand-over');
    lacks(html, 'File signed receipt', 'and no receipt to file before a hand-over is recorded');
    has(html, '&lt;b&gt;in ink&lt;/b&gt;', 'the description is text wherever it lands');
    lacks(html, '<b>in ink</b>', 'never markup');

    // The receipt prints before the hand-over, with blanks to be filled at it.
    eq(r.S.printSiteFindReceipt(41, f.id), true, 'Print Receipt for Original Will');
    has(r.log.printed.html, 'Receipt for Original Will', 'the form');
    has(r.log.printed.html, 'Havellin has not opened it, read its contents or copied it, and keeps no copy of it in any form', '⚠ the statement: unopened, unread, no copy kept');
    has(r.log.printed.html, 'Fla. Stat. &sect;732.901', 'and the custodian\'s duty, cited');
    has(r.log.printed.html, 'Received by: ____', 'a line for the person receiving it to sign');
    has(r.log.printed.html, 'Delivered by: ____', 'and for Havellin');
    has(r.log.printed.html, 'Print name: ____', 'with a name to print, since none is recorded yet');
    has(r.log.printed.html, '&lt;b&gt;in ink&lt;/b&gt;', 'the description escaped on paper too');
    ok(/^Havellin Receipt for Original Will - 100 Ocean Blvd - [A-Z][a-z]{2} \d{1,2} \d{4}$/.test(r.log.printed.title), 'named for the PDF it saves as: ' + r.log.printed.title);
  });

  group('D1 — the hand-over, the signed receipt, the ten days and the deposit with the clerk');
  inEastern(() => {
    const r = rig();
    r.S.openSiteFind(41, 'will');
    r.set('fos-where', 'study'); r.set('fos-found-by', 'Anthony Graziano Jr'); r.set('fos-desc', 'Sealed envelope marked Last Will');
    r.S.saveSiteFind();
    const id = r.job.siteFinds[0].id;

    // A deposit before any hand-over is refused in the handler, whatever the dialog was showing.
    r.set('fos-job', '41'); r.set('fos-kind', 'will'); r.set('fos-mode', 'deposit'); r.set('fos-id', id);
    r.set('fos-dep-on', '2026-10-05'); r.set('fos-dep-by', 'Richard Comiter');
    eq(r.S.saveSiteFind(), false, '⚠ a deposit with no hand-over behind it is refused where the record is written');
    has(r.fb(), 'Record the hand-over first', 'saying why');
    ok(!r.job.siteFinds[0].depositedOn, 'and nothing is written');

    eq(r.S.openSiteFind(41, 'will', 'handover', id), true, 'Record the hand-over opens the dialog on that find');
    eq(r.dom.getElementById('fos-sec-find').style.display, 'none', 'the find\'s own fields are not offered again (it is written once)');
    eq([r.val('fos-handed-to'), r.val('fos-handed-on')], ['Richard Comiter', '2026-10-03'], 'the attorney and today, by default');
    r.set('fos-handed-on', '');
    eq(r.S.saveSiteFind(), false, 'a hand-over with no day is refused');
    has(r.fb(), 'the day it was handed over', 'naming it');
    r.set('fos-handed-on', '2026-10-04');
    eq(r.S.saveSiteFind(), true, '⚠ a hand-over on the NEXT day is recorded, not refused');
    const f = r.job.siteFinds[0];
    eq([r.job.siteFinds.length, f.handedTo, f.handedOn], [1, 'Richard Comiter', '2026-10-04'], 'onto the same find, never a second one');
    eq(r.S.siteFindHandFlag(f), 'handed over Oct 4, 2026, not the day it was found (Oct 3, 2026)', '⚠ and flagged: the procedure is the same day');
    ok(r.log.badges.slice(-1)[0].err && /flagged/.test(r.log.badges.slice(-1)[0].m), 'the notice says it was flagged');
    has(r.card(), 'class="fos-flag">&#9888; handed over Oct 4, 2026, not the day it was found', 'and the card shows the flag');
    eq(r.S.willDepositDue(f), '2026-10-14', 'the deposit falls due ten days after the hand-over');

    let L = r.lines('finds', '2026-10-04');
    eq(L.map((l) => [l.key.replace(id, 'ID'), l.ok, !!l.red]), [['will_receipt_ID', false, false], ['will_deposit_ID', false, false]],
       'handed over: the receipt open, the deposit open — neither red');
    has(L[1].detail, 'due Oct 14, 2026, ten days after the hand-over', 'the deposit line names the day');
    has(L[1].detail, '(&sect;732.901)', 'and the statute');
    has(L[1].detail, 'Confirm the deposit with Richard Comiter', 'and whom to ask');
    eq(r.lines('finds', '2026-10-14')[1].red, false, 'on the due day itself it is not yet red');
    const late = r.lines('finds', '2026-10-15')[1];
    eq([late.ok, late.red], [false, true], '⚠⚠ the day after: RED');
    has(late.detail, 'was due Oct 14, 2026', 'saying it was due');
    has(late.detail, 'Confirm with Richard Comiter that it went to the clerk', 'and to confirm it went');

    // The signed receipt, through the foundation's control on the card.
    const html = r.card();
    const m = /fileSignedCopyFromInput\(this,(\d+)\)/.exec(html);
    ok(!!m, 'once handed over the card offers File signed receipt');
    has(html, 'File signed receipt', 'labelled so');
    lacks(html, 'Record the hand-over', 'and no second hand-over');
    r.dom.__seed('plan-finds-41', { outerHTML: '' });
    r.S.fileSignedCopyFromInput({ files: [{ name: 'Receipt signed.pdf', type: 'application/pdf', size: 90000 }] }, Number(m[1]));
    const sr = (r.job.signedRecords || [])[0];
    ok(!!sr, 'filed and recorded on the job');
    eq([sr.kind, sr.ref, sr.signedBy, sr.signedOn], ['will', id, 'Richard Comiter', '2026-10-04'], '⚠ as a will receipt, for THIS find, signed by whom it went to, on the hand-over day');
    eq(r.log.uploads[0].folderId, 'SUBSIGNED', 'into Signed Records');
    has(r.dom.getElementById('plan-finds-41').outerHTML, 'id="plan-finds-41"', 'and only the card repaints, in place');
    L = r.lines('finds', '2026-10-05');
    eq(L[0].ok, true, 'the receipt line is green');
    has(r.card(), 'Signed receipt for the original will</a>', 'the filed copy is linked on the find');
    lacks(r.card(), 'File signed receipt', 'and is not offered twice');

    // The deposit, confirmed.
    eq(r.S.openSiteFind(41, 'will', 'deposit', id), true, 'Confirm the deposit with the clerk');
    eq(r.dom.getElementById('fos-sec-dep').style.display, '', 'the deposit\'s fields are shown');
    eq(r.dom.getElementById('fos-sec-hand').style.display, 'none', 'and the hand-over\'s are not');
    eq(r.val('fos-dep-by'), 'Richard Comiter', 'confirmed by: whoever holds it, by default');
    eq(r.val('fos-dep-on'), '', 'and no deposit day assumed');
    eq(r.S.saveSiteFind(), false, 'no day: refused');
    has(r.fb(), 'the day it was deposited with the clerk', 'naming it');
    r.set('fos-dep-on', '2026-10-09');
    eq(r.S.saveSiteFind(), true, 'recorded');
    eq([r.job.siteFinds[0].depositedOn, r.job.siteFinds[0].depositConfirmedBy], ['2026-10-09', 'Richard Comiter'], 'on the find');
    L = r.lines('finds', '2026-12-01');
    eq(L.map((l) => l.ok), [true, true], '⚠⚠ received against a signed receipt and deposited: every line green, whatever the date');
    has(L[1].detail, 'Oct 9, 2026, confirmed by Richard Comiter', 'naming the day and who confirmed it');
    lacks(r.card(), 'Confirm the deposit with the clerk', 'and the button is gone');
    r.set('fos-job', '41'); r.set('fos-kind', 'will'); r.set('fos-mode', 'deposit'); r.set('fos-id', id); r.set('fos-dep-on', '2026-10-10');
    eq(r.S.saveSiteFind(), false, 'a second deposit is refused');
    has(r.fb(), 'already recorded', 'saying so');
    eq(r.job.siteFinds[0].depositedOn, '2026-10-09', 'and the first stands');
  });

  group('D1 — a find is voided with a reason, never removed; and a living job is refused in the handler');
  inEastern(() => {
    const r = rig({ prompt: '' });
    r.S.openSiteFind(41, 'will');
    r.set('fos-found-by', 'Ashley Jerome'); r.set('fos-desc', 'Envelope, sealed');
    r.S.saveSiteFind();
    const id = r.job.siteFinds[0].id;
    eq(r.S.voidSiteFind(41, id), false, 'a void with no reason is not made');
    ok(!r.job.siteFinds[0].voidedAt, 'and changes nothing');
    const r2 = rig({ prompt: 'recorded on the wrong client' });
    r2.S.openSiteFind(41, 'will');
    r2.set('fos-found-by', 'Ashley Jerome'); r2.set('fos-desc', 'Envelope, sealed');
    r2.S.saveSiteFind();
    const id2 = r2.job.siteFinds[0].id;
    eq(r2.S.voidSiteFind(41, id2), true, 'with a reason it is made');
    eq([r2.job.siteFinds.length, r2.job.siteFinds[0].voidReason, r2.job.siteFinds[0].voidedBy], [1, 'recorded on the wrong client', 'Ashley Jerome'],
       '⚠ the find stays on the record, marked, with why and by whom');
    eq(r2.lines(), [], 'it leaves the reminder');
    has(r2.card(), 'void: recorded on the wrong client', 'and the card lists it as void');
    lacks(r2.card(), 'Record the hand-over', 'with nothing left to do on it');
    eq(r2.S.printSiteFindReceipt(41, id2), false, 'a void find prints nothing');
    eq(r2.S.voidSiteFind(41, id2), false, 'and is not voided twice');
    r2.S.openSiteFind(41, 'will', 'handover', id2);
    eq(r2.dom.getElementById('fos-modal').style.display, 'none', 'a hand-over on a void find is not opened');

    const lv = rig({ job: { svc: 'downsizing', matterType: '' } });
    eq(lv.S.openSiteFind(41, 'will'), false, 'a living client: the dialog is refused');
    lv.set('fos-job', '41'); lv.set('fos-kind', 'will'); lv.set('fos-mode', 'new'); lv.set('fos-date', '2026-10-03');
    lv.set('fos-found-by', 'Ashley Jerome'); lv.set('fos-desc', 'x');
    eq(lv.S.saveSiteFind(), false, '⚠ and the handler refuses it too, whatever the dialog held');
    has(lv.fb(), 'recorded on an estate job', 'saying why');
    ok(!lv.job.siteFinds, 'nothing is written');
    eq(lv.S.siteFindsCardHtml(41, lv.job, { svc: 'downsizing' }), '', 'and a living client has no card');
  });

  group('D2 — cash: two different counters and a bag number, or nothing is recorded; the rest is flagged');
  inEastern(() => {
    const r = rig();
    eq(r.S.openSiteFind(41, 'cash'), true, 'Record cash found opens the dialog');
    eq([r.dom.getElementById('fos-sec-cash').style.display, r.dom.getElementById('fos-sec-will').style.display], ['', 'none'], 'the cash fields, not the will\'s');
    eq(r.dom.getElementById('fos-date-lbl').textContent, 'Counted on', 'the date is the count\'s');
    eq(r.val('fos-handed-to'), 'Ruth Adler', '⚠ handed to: the fiduciary, by default');
    has(r.dom.getElementById('fos-holders').innerHTML, 'value="Ruth Adler"', 'the fiduciaries are offered');
    lacks(r.dom.getElementById('fos-holders').innerHTML, 'Richard Comiter', 'and not the attorney: cash goes to a fiduciary');
    r.set('fos-amount', '1240.005'); r.set('fos-counter1', 'Ashley Jerome'); r.set('fos-counter2', '  ashley jerome '); r.set('fos-bag', 'B-1049');
    eq(r.S.saveSiteFind(), false, '⚠⚠ one person named twice is refused');
    has(r.fb(), 'Two different people count the cash, and both names given are Ashley Jerome', 'naming the rule and the name');
    ok(!r.job.siteFinds, 'nothing written');
    r.set('fos-counter2', '');
    eq(r.S.saveSiteFind(), false, 'a second counter left blank is refused');
    has(r.fb(), 'both people who counted it', 'naming it');
    r.set('fos-counter2', 'Anthony Graziano Jr'); r.set('fos-bag', '');
    eq(r.S.saveSiteFind(), false, '⚠ no bag number: refused');
    has(r.fb(), 'the sealed bag’s number', 'naming it');
    r.set('fos-bag', 'B-1049'); r.set('fos-amount', '');
    eq(r.S.saveSiteFind(), false, 'no amount: refused (the count is the record)');
    has(r.fb(), 'the amount counted', 'naming it');
    r.set('fos-amount', '1240.005');
    eq(r.S.saveSiteFind(), true, 'two different counters, a bag and an amount: recorded, with no place given (where is never required)');
    const f = r.job.siteFinds[0];
    eq([f.kind, f.amount, f.countedBy, f.bagNo, f.countedOn, f.where], ['cash', 1240.01, ['Ashley Jerome', 'Anthony Graziano Jr'], 'B-1049', '2026-10-03', ''],
       'to the cent (roundCents: 1240.005 is $1,240.01), both counters, the bag');
    let L = r.lines();
    eq(L.map((l) => [l.label, l.ok, !!l.red]), [['Cash held by Havellin', false, true]], '⚠⚠ held: RED');
    has(L[0].detail, '$1,240.01 in sealed bag No. B-1049, counted Oct 3, 2026', 'naming the money and the bag');
    has(L[0].detail, 'hand it to Ruth Adler today, against a signed receipt', 'and to whom, today');

    // Handed over the next day to somebody who is not a fiduciary: recorded, both flags raised.
    r.S.openSiteFind(41, 'cash', 'handover', f.id);
    r.set('fos-handed-to', 'Vincent Adler'); r.set('fos-handed-on', '2026-10-05');
    eq(r.S.saveSiteFind(), true, '⚠ a late hand-over to a non-fiduciary is RECORDED — flagged, never refused');
    const g = r.job.siteFinds[0];
    eq(r.S.siteFindHandFlag(g), 'handed over Oct 5, 2026, not the day it was counted (Oct 3, 2026)', 'flagged: not the count day');
    eq(r.S.siteFindHolderFlag(r.job, g), 'not a fiduciary recorded on this job', 'flagged: not a fiduciary');
    has(r.card(), 'not the day it was counted (Oct 3, 2026); not a fiduciary recorded on this job', 'both on the card');
    eq(r.S.siteFindHolderFlag(r.job, Object.assign({}, g, { handedTo: ' ruth adler ' })), '', 'the representative under any spacing or case is a fiduciary');
    L = r.lines('finds', '2026-10-05');
    eq(L.map((l) => [l.label, l.ok, !!l.red]), [['Cash count receipt filed', false, false]], 'handed over: the receipt line, open until filed');
    has(L[0].detail, 'file the receipt both counters and Vincent Adler signed', 'saying whose signatures');
    const m = /fileSignedCopyFromInput\(this,(\d+)\)/.exec(r.card());
    r.S.fileSignedCopyFromInput({ files: [{ name: 'IMG_0042.JPG', type: 'image/jpeg', size: 900000 }] }, Number(m[1]));
    const sr = (r.job.signedRecords || [])[0];
    eq([sr && sr.kind, sr && sr.ref, sr && sr.signedBy], ['cash', f.id, 'Ashley Jerome; Anthony Graziano Jr; Vincent Adler'], 'filed as the count\'s receipt, signed by all three');
    eq(r.lines('finds', '2026-10-06')[0].ok, true, '⚠ green once the count\'s receipt is filed');

    // The form: both counters sign, the fiduciary signs for the sealed bag.
    r.S.printSiteFindReceipt(41, f.id);
    const ph = r.log.printed.html;
    has(ph, 'Cash Count and Receipt', 'the form');
    has(ph, '<strong>$1,240.01</strong>', 'the amount to the cent');
    has(ph, 'Ashley Jerome and Anthony Graziano Jr', 'both counters named');
    eq((ph.match(/Counted by: ____/g) || []).length, 2, '⚠ a signature line for each counter');
    has(ph, 'Received sealed bag No. B-1049, seal intact: ____', 'and the fiduciary\'s, for the sealed bag');
    has(ph, 'Havellin Palm Beach, LLC does not hold estate cash', 'the statement');
    ok(/^Havellin Cash Count and Receipt - 100 Ocean Blvd - /.test(r.log.printed.title), 'named for the PDF it saves as');
    // A count handed to the fiduciary prints the fiduciary's role.
    const r2 = rig();
    r2.S.openSiteFind(41, 'cash');
    r2.set('fos-amount', '300'); r2.set('fos-counter1', 'Ashley Jerome'); r2.set('fos-counter2', 'Ruth Adler'); r2.set('fos-bag', 'B-7');
    r2.set('fos-handed-on', '2026-10-03');
    eq(r2.S.saveSiteFind(), true, 'a count handed over the same day, in the same dialog');
    eq(r2.S.siteFindHandFlag(r2.job.siteFinds[0]), '', 'the same day: no flag');
    eq(r2.S.siteFindHolderFlag(r2.job, r2.job.siteFinds[0]), '', 'to the fiduciary: no flag');
    r2.S.printSiteFindReceipt(41, r2.job.siteFinds[0].id);
    has(r2.log.printed.html, 'Ruth Adler, Trustee', 'the form names the fiduciary\'s role');
  });

  group('D1/D2 — each receipt answers for its own find, and the handler asks again whatever the dialog held');
  inEastern(() => {
    const r = rig({ prompt: 'recorded twice' });
    const record = (desc) => { r.S.openSiteFind(41, 'will'); r.set('fos-found-by', 'Ashley Jerome'); r.set('fos-desc', desc); return r.S.saveSiteFind(); };
    record('First envelope'); record('Second envelope, a codicil');
    const [a, b] = r.job.siteFinds.map((f) => f.id);
    [a, b].forEach((id) => { r.S.openSiteFind(41, 'will', 'handover', id); r.S.saveSiteFind(); });
    eq(r.job.siteFinds.map((f) => f.handedOn), ['2026-10-03', '2026-10-03'], 'two wills, both handed over');
    // A receipt filed against the first.
    r.S.jobListPut(r.job, 'signedRecords', { kind: 'will', ref: a, label: 'Signed receipt for the original will', signedBy: 'Richard Comiter', signedOn: '2026-10-03' });
    const L = r.lines();
    eq(L.filter((l) => l.key === 'will_receipt_' + a)[0].ok, true, 'the first will\'s receipt line is green');
    eq(L.filter((l) => l.key === 'will_receipt_' + b)[0].ok, false, '⚠ and the second\'s stays open: a receipt answers for the find it was filed against');
    // A second hand-over on the same find, from a dialog left open: refused where the record is written.
    r.set('fos-job', '41'); r.set('fos-kind', 'will'); r.set('fos-mode', 'handover'); r.set('fos-id', a);
    r.set('fos-handed-to', 'Somebody Else'); r.set('fos-handed-on', '2026-10-09');
    eq(r.S.saveSiteFind(), false, '⚠ a second hand-over is refused');
    has(r.fb(), 'The hand-over is already recorded: to Richard Comiter on Oct 3, 2026.', 'naming the one on record');
    eq([r.job.siteFinds[0].handedTo, r.job.siteFinds[0].handedOn], ['Richard Comiter', '2026-10-03'], 'and it stands');
    // A hand-over on a find voided on the other device while the dialog stood open.
    r.S.voidSiteFind(41, b);
    const after = r.lines().map((l) => l.key);
    ok(after.some((k) => k.indexOf(a) >= 0), 'the live will keeps its lines');
    ok(!after.some((k) => k.indexOf(b) >= 0), '⚠ and the void one beside it leaves the reminder (a void is never a line)');
    r.set('fos-id', b); r.set('fos-mode', 'deposit'); r.set('fos-dep-on', '2026-10-05'); r.set('fos-dep-by', 'Richard Comiter');
    eq(r.S.saveSiteFind(), false, '⚠ nothing is recorded on a void find');
    has(r.fb(), 'no longer on this job', 'saying it is gone');
    ok(!r.job.siteFinds[1].depositedOn, 'and the void find is untouched');
  });

  group('The desk card: the matter line names both lists it withholds; a red line is drawn red');
  {
    const d = sandbox({ fns: DERIVED_FNS, vars: DERIVED_VARS, stubs: DERIVED_STUBS() });
    const blank = d.planDerivedLines(7, { id: 7, svc: 'cleanout' }, { svc: 'cleanout', rooms: [{ idx: 0, name: 'Kitchen' }] }, 'admin', '2026-10-03')
      .filter((l) => l.key === 'matter_type')[0];
    has(blank && blank.detail, 'the Florida court list and the trustee&rsquo;s list are withheld until it is', '⚠ an unanswered matter withholds the trustee\'s list too, and says so');
    // The stylesheet colours what planDerivedHtml marks red (the browser step reads the computed colour).
    const css = SRC.slice(SRC.indexOf('<style>'), SRC.indexOf('</style>'));
    has(css, '.pl-red .pl-dot,.pl-red .pl-lbl{color:var(--err-tx);}', 'a red line\'s dot and label take the error colour');
  }

  group('D1/D2 — the rules, DOM-free: what refuses and what never does');
  {
    const S = sandbox({ fns: ['siteFindRefusal', 'samePerson', 'canonPersonName', '_andJoin', 'esc'], vars: ['SITE_FIND_KINDS', 'PERSON_NAME_ALIASES'] });
    const will = { kind: 'will', foundOn: '2026-10-03', foundBy: 'A', description: 'Envelope' };
    const cash = { kind: 'cash', countedOn: '2026-10-03', amount: 5, countedBy: ['A', 'B'], bagNo: 'B-1' };
    eq(S.siteFindRefusal(will, 'new'), '', 'a will found, by someone, described: recorded');
    eq(S.siteFindRefusal(cash, 'new'), '', 'cash counted by two, bagged: recorded');
    eq(S.siteFindRefusal(Object.assign({}, cash, { where: '' }), 'new'), '', 'no place given is never a refusal');
    eq(S.siteFindRefusal(Object.assign({}, cash, { handedTo: 'Someone Else', handedOn: '2027-01-01' }), 'new'), '', '⚠ a hand-over on any other day, to anybody, is never a refusal');
    eq(S.siteFindRefusal(Object.assign({}, will, { handedTo: 'Any Name', handedOn: '2026-11-30' }), 'new'), '', 'nor on a will: any name may be typed');
    has(S.siteFindRefusal(Object.assign({}, cash, { countedBy: ['A', 'a'] }), 'new'), 'Two different people', 'the same counter twice refuses');
    has(S.siteFindRefusal(Object.assign({}, cash, { bagNo: '  ' }), 'new'), 'the sealed bag’s number', 'a blank bag number refuses');
    has(S.siteFindRefusal(Object.assign({}, cash, { amount: 0 }), 'new'), 'the amount counted', 'no amount refuses');
    has(S.siteFindRefusal(Object.assign({}, cash, { handedOn: '2026-10-03' }), 'new'), 'who it was handed to', 'a hand-over day with nobody named refuses');
    has(S.siteFindRefusal(Object.assign({}, will, { handedTo: 'X', handedOn: '' }), 'handover'), 'the day it was handed over', 'the hand-over act needs its day');
    has(S.siteFindRefusal(Object.assign({}, cash, { handedTo: 'X', handedOn: '2026-10-03' }), 'deposit'), 'Only an original will is deposited', 'cash is never deposited with the clerk');
    has(S.siteFindRefusal({ kind: 'jewelry' }, 'new'), 'not something the Found on site card records', 'an unknown kind refuses');
    has(S.siteFindRefusal(Object.assign({}, cash, { countedBy: ['<b>Al</b>', '<b>al</b>'] }), 'new'), '&lt;b&gt;Al&lt;/b&gt;', 'a typed name in the refusal is escaped (it is drawn as markup)');
  }

  group('One definition each: the rules are asked where the record is written, and nothing else writes a find');
  {
    eq((SRC.match(/\nvar WILL_DEPOSIT_DAYS = 10;/g) || []).length, 1, 'the ten days are one constant');
    eq((SRC.match(/\bsiteFindLines\(/g) || []).length, 2, 'siteFindLines: defined once, read once (planDerivedLines, for the card and the desk)');
    has(live('planDerivedLines'), 'siteFindLines(job, day())', 'by planDerivedLines');
    eq((SRC.match(/\bsiteFindRefusal\(/g) || []).length, 2, 'siteFindRefusal: defined once, asked once — by the save that writes the record');
    has(live('saveSiteFind'), "var why = siteFindRefusal(rec, mode);", 'saveSiteFind asks it before the put');
    ok(live('saveSiteFind').indexOf("var why = siteFindRefusal(rec, mode);") < live('saveSiteFind').indexOf("jobListPut(job, 'siteFinds', rec);"), 'and before it writes');
    ok(!/\.siteFinds\s*(=|\.push\()/.test(SRC.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n')), '⚠ nothing assigns or pushes job.siteFinds: the list helpers are the only writers');
    has(live('voidSiteFind'), "jobListVoid(job, 'siteFinds', id,", 'a find is voided through the list helper');
    lacks(live('voidSiteFind'), 'jobListRemove', 'and never removed');
    // RESTATED P22 E: the rule moved into custodyLogKept (the vendor pickup list asks it too), read by renderJobPlan.
    has(live('custodyLogKept'), 'return !!(ctx.formal || ctx.isProbate || ctx.probateTrack || ctx.trustTrack);', 'custody: the trust track added beside the others');
    has(live('renderJobPlan'), 'var custodyMandatory = custodyLogKept(job, est);', 'and the plan reads it');
    has(decl('SIGNED_RECORD_KINDS'), "will:      { label: 'Signed receipt for the original will' }", 'the will\'s receipt files under the foundation\'s own kind');
  }
};
