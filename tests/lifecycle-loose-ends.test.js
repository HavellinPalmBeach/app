'use strict';
// ⚠⚠ LIFECYCLE AND PAYMENT LOOSE ENDS (2026-09-29, workflow audit P10: M4, M5, M6, Q12, Q19 and the lows).
//
// Each finding here was a place where a record and the screen reading it disagreed about the same fact:
//   M4  Mark Lost decided lost-or-retained on `depositReceived`, which only turns true at the FULL 50%.
//       A client who paid $2,000 of a $4,575 deposit and walked was recorded as a plain loss, `won` was
//       cleared, and the $2,000 appeared nowhere — Win / Loss included. (Anthony, Q2: "keep it and name
//       the amount".) Amending the reason also restamped the loss date to today.
//   M5  The Letters gate, the court record fields and the Job Plan's court chips keyed on the SERVICE, so
//       an Estate Settlement administering a probate estate activated with no Letters on file and had
//       nowhere to record the case number or the Letters date.
//   M6  The payment recorder prefilled the deposit only; the midpoint and the final opened blank under a
//       button reading "Record Deposit →".
//   Q12 The ACH link asked for the invoice's figure, not the balance — a $2,000 cheque against a $4,575
//       deposit left the link asking for $4,575, and a client who used it overpaid by $2,000.
//   Q19 A job priced (and, on a rush job, PROMISED on Exhibit A) with two concierges confirmed its team
//       with the second slot empty.
//   Lows: Home Prep's middle payment was called a midpoint on every surface its own estimate calls it the
//       second payment; the final's View / Print were offered on a job with no hours and refused on the
//       press; the attorney chip sat red on a trust matter with none to record; a closed job's plan
//       pointed at Before Day 1.
//
// Everything here drives the REAL functions lifted from havellin.html.

const { sandbox, source, fn, domStub } = require('./harness');

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();
  const liveFn = (name) => fn(name).split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  const text = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&mdash;/g, '—').replace(/\s+/g, ' ').trim();

  // ═══════════════════════════════════════════════════════════════════════════
  // M4 — A CLIENT WHO PAID AND WALKED IS CLOSED — DEPOSIT RETAINED, WITH THE AMOUNT NAMED
  // ═══════════════════════════════════════════════════════════════════════════
  const CLOSE_FNS = ['openCloseoutModal', 'confirmMarkLost', 'closeCloseoutModal', 'closeoutRetainedTotal', 'jobPaidTotal', 'paymentCounts',
    'jobPayments', 'stagePaidTotal', 'jobIsSettled', 'fmt', 'depositTargetFor'];
  function closeOut(job, reason, note) {
    const d = domStub({ 'closeout-reason': reason || '', 'closeout-note': note || '' });
    const btn = { textContent: 'Mark as Lost' };
    d.querySelector = (sel) => (String(sel).indexOf('closeout-modal') >= 0 ? btn : null);
    let saves = 0;
    const c = sandbox({ fns: CLOSE_FNS, vars: ['LOSS_REASONS', 'closeoutJobId'],
      stubs: { document: d, jobs: [job], saveJobs() { saves++; }, syncJobToSheets() {}, renderJobs() {}, alert() {} } });
    c.openCloseoutModal(job.id);
    const sub = d.getElementById('closeout-sub').innerHTML;
    const btnText = btn.textContent;
    if (reason !== null) {
      // The modal PREFILLS the reason on a job already closed out (the amend route); a test choosing a
      // reason types it in after the open, as a person does.
      d.getElementById('closeout-reason').value = reason || '';
      d.getElementById('closeout-note').value = note || '';
      c.confirmMarkLost();
    }
    return { job: c.jobs[0], sub, btnText, saves, d };
  }
  const walker = (payments, over) => Object.assign({ id: 7, name: 'Maeve O\'Hara', svc: 'cleanout', status: 'active',
    won: true, havellinEst: 9150, payments }, over || {});
  const p = (stage, amount) => ({ stage, amount, receivedOn: '2026-09-20', method: 'check' });

  group('⚠⚠ M4 — $2,000 of a $4,575 deposit, then the client walks: retained, and the $2,000 named');
  {
    const r = closeOut(walker([p('deposit', 2000)]), 'price');
    has(text(r.sub), '$2,000 has already been received on this job', '⚠ the modal names the money before anything is pressed');
    has(text(r.sub), 'closed — deposit retained', '…and what the job will be recorded as');
    eq(r.btnText, 'Close — Retain $2,000', '⚠ the button says what it keeps');
    eq(r.job.status, 'closed_retained', '⚠⚠ a part-paid job is CLOSED — DEPOSIT RETAINED, not lost (it used to read lost)');
    eq(r.job.won, true, '⚠⚠ …and it stays won — it was won, paid for, and then abandoned');
    eq(r.job.lostReason, 'price', 'the reason is recorded');
    ok(!!r.job.lostAt, 'with the date');
    eq(r.saves, 1, 'in one save');

    const none = closeOut(walker([]), 'price');
    eq(none.job.status, 'lost', 'a client who paid nothing is an ordinary loss');
    eq(none.job.won, false, '…and a win withdrawn with nothing paid is not a win');
    eq(none.btnText, 'Mark as Lost', '…under the ordinary button');
    has(text(none.sub), 'as Lost with a reason', '…and the ordinary sentence');

    // Everything received, on any stage: a job abandoned after its midpoint was paid kept both.
    const both = closeOut(walker([p('deposit', 4575), p('midpoint', 2288)]), 'changed_mind');
    eq(both.btnText, 'Close — Retain $6,863', 'the kept figure is every payment, not the deposit stage alone');

    const empty = closeOut(walker([p('deposit', 2000)]), '');
    eq(empty.job.status, 'active', 'no reason, nothing written');
    has(empty.d.getElementById('closeout-fb').innerHTML, 'Please select a reason', '…and it says why');
  }

  group('⚠ M4 — amending the reason does not move the date we recorded losing the client');
  {
    const r = closeOut(walker([p('deposit', 2000)], { status: 'closed_retained', lostReason: 'price', lostAt: '2026-09-01T12:00:00.000Z' }), 'competitor', 'went with a cheaper firm');
    eq(r.job.lostAt, '2026-09-01T12:00:00.000Z', '⚠⚠ the loss date is write-once — a typo fixed today used to restamp it to today');
    eq(r.job.lostReason, 'competitor', '…while the reason IS amended');
    eq(r.job.lostNote, 'went with a cheaper firm', '…and the note');
    has(liveFn('confirmMarkWon'), 'delete j.lostAt', 'a job won back clears it, so losing it again stamps a new date');
  }

  group('⚠ M4 — Win / Loss counts what a retained job KEPT, and the list says so');
  {
    const W = sandbox({ fns: ['winLossFigures', 'isJobWon', 'closeoutRetainedTotal', 'jobPaidTotal', 'paymentCounts', 'jobPayments', 'winLossListHtml',
      '_wlClientCell', '_jobStatusCell', 'fmtDate2', 'jobStatusView', 'svcLabelOf', 'depositTargetFor', 'stagePaidTotal'],
      vars: ['WON_METHOD_LABELS', 'JOB_STATUS_LABELS', 'JOB_STATUS_DOT', 'SVC_LABELS', 'LOSS_REASONS'] });
    W.jobs = [
      { id: 1, name: 'Butler', status: 'active', won: true, havellinEst: 20000, payments: [p('deposit', 10000)] },
      { id: 2, name: 'Walker', status: 'closed_retained', won: true, havellinEst: 9150, payments: [p('deposit', 2000)] },
    ];
    const f = W.winLossFigures();
    eq(f.won.length, 2, 'both are won');
    eq(f.wonRev, 22000, '⚠⚠ $20,000 quoted and won, plus the $2,000 the walker actually paid — never the $9,150 it was quoted');
    const list = text(W.winLossListHtml('won', f, false));
    has(list, '$2,000 retained', 'the Won list names the kept amount on the retained row');
    lacks(list, '$9,150', '…and never its quote, which never came in');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // M5 — THE MATTER DECIDES WHETHER THERE IS A COURT, NOT THE SERVICE THAT WAS SOLD
  // ═══════════════════════════════════════════════════════════════════════════
  const M5_FNS = ['jobOnProbateTrack', 'courtRecordShown', 'matterDef', 'matterTypeOf', 'invFiduciaryMode', 'isDecedentJob',
    'jobActivationBlockers', 'resolveExecutorAuth', 'inventoryDeadlineFrom', '_ymdLocal'];
  const M5_VARS = ['MATTER_TYPES', 'DECEDENT_SERVICES', 'EXECUTOR_AUTH_OPTIONS'];
  const M = sandbox({ fns: M5_FNS, vars: M5_VARS });

  group('⚠⚠ M5 — jobOnProbateTrack: the matter where it is answered, the service where it is not');
  {
    const t = (svc, matterType) => M.jobOnProbateTrack({ svc, matterType });
    eq(t('cleanout', 'probate'), true, '⚠⚠ an Estate Settlement administering a probate estate is on the court track');
    eq(t('cleanout', 'both'), true, '…and so is a pour-over will, whose probate half is real');
    eq(t('cleanout', 'trust'), false, 'a trust administration is not');
    eq(t('cleanout', 'neither'), false, 'nor a family distribution');
    eq(t('cleanout', ''), false, 'an unanswered Estate Settlement falls back to its service — which opens no court');
    eq(t('probate', ''), true, 'an unanswered Probate job falls back to its service — a case was open at intake');
    eq(t('contested_probate', ''), true, '…as does a contested one');
    eq(t('probate', 'trust'), false, '⚠ an answered matter wins over the service in both directions');
    eq(t('downsizing', 'probate'), false, 'a living client has no matter at all, whatever the field holds');
    eq(M.jobOnProbateTrack(null), false, 'no job, no track');
    eq(M.jobOnProbateTrack({ svc: 'cleanout' }, 'probate'), true, 'the Job Plan can ask about the service its estimate priced');
  }

  group('⚠ M5 — courtRecordShown: wider than the track, because a required field must never be hidden');
  {
    eq(M.courtRecordShown('probate', 'trust'), true, 'a Probate service always shows the case fields — the save requires the case number there');
    eq(M.courtRecordShown('cleanout', 'probate'), true, '⚠⚠ an Estate Settlement on a probate matter shows them now (it had nowhere to enter a case)');
    eq(M.courtRecordShown('cleanout', 'both'), true, '…a pour-over will too');
    eq(M.courtRecordShown('cleanout', 'trust'), false, 'a trust matter does not');
    eq(M.courtRecordShown('cleanout', ''), false, 'nor an unanswered one');
    eq(M.courtRecordShown('downsizing', 'probate'), false, 'nor a living client');
  }

  group('⚠⚠ M5 — the Letters gate on activation follows the matter, and a blank is not an answer');
  {
    const B = (over) => M.jobActivationBlockers(Object.assign({ agrSigned: true, depositReceived: true }, over));
    const L = 'Executor authorization must be received';
    ok(B({ svc: 'cleanout', matterType: 'probate', executorAuth: 'pending' }).indexOf(L) >= 0,
       '⚠⚠ an Estate Settlement on a probate matter is refused activation until the Letters are in');
    ok(B({ svc: 'cleanout', matterType: 'probate', executorAuth: '' }).indexOf(L) >= 0,
       '⚠ a BLANK authorization is refused too — `=== "pending"` used to wave it straight through');
    ok(B({ svc: 'cleanout', matterType: 'probate' }).indexOf(L) >= 0, '…and so is a record carrying no answer at all');
    eq(B({ svc: 'cleanout', matterType: 'probate', executorAuth: 'received' }), [], 'with the Letters received it activates');
    eq(B({ svc: 'cleanout', matterType: 'probate', executorAuth: 'notneeded' }), [], 'and a matter needing none is not held up');
    eq(B({ svc: 'probate', matterType: 'trust', executorAuth: 'pending' }), [], 'a trust matter is not asked for Letters, whatever the service');
    ok(B({ svc: 'probate', executorAuth: 'pending' }).indexOf(L) >= 0, 'an unanswered Probate job is asked, exactly as before');
    eq(B({ svc: 'cleanout', executorAuth: 'pending' }), [], 'an unanswered Estate Settlement is not');
  }

  group('M5 — the §733.604 deadline is 60 days from the Letters, read by both forms');
  {
    eq(M.inventoryDeadlineFrom('2026-09-01'), '2026-10-31', 'Letters on September 1 → the inventory is due October 31');
    eq(M.inventoryDeadlineFrom('2026-12-15'), '2027-02-13', 'across a year end');
    eq(M.inventoryDeadlineFrom(''), '', 'no Letters, no deadline');
    eq(M.inventoryDeadlineFrom('rubbish'), '', 'an unparseable date is no deadline, never "NaN"');
    const d = domStub({ 'ec-letters-date': '2026-09-01' });
    const C = sandbox({ fns: ['computeInventoryDeadline', 'inventoryDeadlineFrom', '_ymdLocal'],
      stubs: { document: d, _todayStr: () => '2026-09-29' } });
    C.computeInventoryDeadline('ec');
    eq(d.getElementById('ec-probate-deadline').value, '2026-10-31', '⚠ Edit Client counts the deadline off the Letters date it now carries');
    has(d.getElementById('ec-deadline-fb').textContent, '32 days from today', '…and says how far away it is, on the local calendar');
    d.getElementById('ec-probate-deadline').value = '2026-11-30';
    d.getElementById('ec-probate-deadline').dataset.userEdited = '1';
    C.computeInventoryDeadline('ec');
    eq(d.getElementById('ec-probate-deadline').value, '2026-11-30', '⚠ a deadline set by hand (an extension the court granted) is never recounted over');
  }

  const EC_FNS = ['showEditClient', 'courtRecordShown', 'jobOnProbateTrack', 'saveClientEdit', 'ecToggleProbate',
    'executorAuthOptionsHtml', 'resolveExecutorAuth', 'ecIsProbateSvc', 'ecIsEstateSvc', 'ecIsMoveSvc', 'ecDocGateChange',
    'docTierOptionsHtml', 'docTierOf', 'docTierDef', 'docTierScope', 'docTierScopeMirror', 'svcHasDocStep', 'esc', 'onDocGateChange',
    'houseFlagInputsHtml', 'houseFlagsOf', '_houseFlagRowClass', 'docLevelFloor', 'gateDispute', '_gateYes', '_gate706', 'isDecedentJob',
    'docLevelFloorReason', 'resolveDocLevel', 'docStandardEffect', 'isFormalDoc', 'invAppraisalThreshold', 'matterTypeOf', 'matterDef',
    'invFiduciaryMode', 'readHouseFlagInputs', 'docScopeDef', 'inventoryDeadlineFrom', '_ymdLocal', 'referralSourceKind', 'referralSourceOptionsHtml', 'referralPartnerOptionsHtml', 'jobRefersToPartner', 'referralIdOf', 'lookupReferralById', 'svcFamilyOptions', 'svcFamily', 'conciergeOptionsHtml', 'getAllActiveTC', '_byContractorName', 'samePerson', 'canonPersonName', 'executorRoleOptionsHtml', 'dateChainConflicts', 'dateChainFlagHtml', 'intakeAsksHouseContents', 'houseFlagAsked', 'sameSvcFamily', 'clientMissingFields', 'readReferralInputs', 'showHouseFlagRows', '_stampChangedKeys', '_jobTouch', 'docTierChangeNotice', 'followDocTier', 'activeDocScope', 'seedDocScopeFromJob', 'estimateDocScope', 'docTierWord', 'docScopeWord', 'estimateRepriceRoute', 'estimateEditBlocker', 'priceChangeBlocker', 'estimateOutForApproval', 'isAgreementSigned', 'isAgreementSent', 'agreementSignature', 'docSentAt', 'docKeyFor'];
  const EC_VARS = ['EXECUTOR_AUTH_OPTIONS', 'SVC_LABELS', 'HOUSE_FLAGS', 'FIREARMS_PROTOCOL_DOC', 'DECEDENT_SERVICES',
    'DOC_TIERS', 'DOC_TIER_FROM_SCOPE', 'JOB_STEPS', 'INV_APPRAISAL_THRESHOLD', 'INV_APPRAISAL_THRESHOLD_DISPUTED', 'MATTER_TYPES', 'DOC_SCOPES', 'REFERRAL_SOURCES', 'SVC_ORDER', 'EXECUTOR_ROLES', 'referralDirectory', 'DEFAULT_CONTRACTORS', 'contractors', 'PERSON_NAME_ALIASES', 'ESTIMATE_EDIT_ROUTE_TXT', 'ESTIMATE_OUT_FOR_APPROVAL_TXT'];
  const ESTATE = { id: 7, hvlId: 'HVL-0007', name: 'Butler Estate', fname: 'Tripp', lname: 'Butler', svc: 'cleanout',
    matterType: 'probate', executor: 'Tripp Butler', deathDate: '2026-06-01', sqft: '3500', propVal: '2000000' };
  function editClient(job, seed) {
    const d = domStub(Object.assign({ 'ec-svc': job.svc, 'ec-matter-type': job.matterType || '', 'ec-fname': 'Tripp', 'ec-lname': 'Butler',
      'ec-sqft': job.sqft || '', 'ec-premium': 'no', 'ec-date-of-death': job.deathDate || '' }, seed || {}));
    const c = sandbox({ fns: EC_FNS, vars: EC_VARS,
      stubs: { document: d, jobs: [JSON.parse(JSON.stringify(job))], estimateStore: {},
               saveJobs() {}, syncJobToSheets() {}, renderClientDashboard() {}, renderJobs() {}, alert() {} } });
    return { d, c };
  }

  group('⚠⚠ M5 — Edit Client carries the court record on an Estate Settlement on a probate matter, with the Letters date');
  {
    const e = editClient(Object.assign({}, ESTATE, { lettersDate: '2026-09-01', probateDeadline: '2026-10-31' }));
    e.c.showEditClient(7);
    const html = e.d.getElementById('edit-client-modal').innerHTML;
    has(html, 'id="ec-probate-fields" style="display:block', '⚠⚠ the court block renders shown — it rendered hidden on every Estate Settlement');
    has(html, 'id="ec-letters-date" value="2026-09-01"', '⚠⚠ …with a Letters Issued field, prefilled — Letters issue weeks after intake and there was nowhere to record them');
    has(html, 'onchange="computeInventoryDeadline(\'ec\')"', '…which recounts the deadline as it changes');
    lacks(html.slice(html.indexOf('id="ec-probate-deadline"'), html.indexOf('id="ec-probate-deadline"') + 200), 'data-user-edited',
      'a deadline that IS the 60-day count is not marked as set by hand');
    const ext = editClient(Object.assign({}, ESTATE, { lettersDate: '2026-09-01', probateDeadline: '2026-11-30' }));
    ext.c.showEditClient(7);
    const eh = ext.d.getElementById('edit-client-modal').innerHTML;
    has(eh.slice(eh.indexOf('id="ec-probate-deadline"'), eh.indexOf('id="ec-probate-deadline"') + 200), 'data-user-edited="1"',
      '⚠ a deadline that differs from the count (an extension) is marked, so changing the Letters date cannot recount over it');

    const trust = editClient(Object.assign({}, ESTATE, { matterType: 'trust' }));
    trust.c.showEditClient(7);
    has(trust.d.getElementById('edit-client-modal').innerHTML, 'id="ec-probate-fields" style="display:none', 'a trust matter shows no court block');
  }

  group('⚠ M5 — changing the matter mid-edit shows or hides the court block, and the save reads what was shown');
  {
    const e = editClient(ESTATE, { 'ec-matter-type': 'trust' });
    e.c.ecToggleProbate();
    eq(e.d.getElementById('ec-probate-fields').style.display, 'none', 'trust: hidden');
    e.d.getElementById('ec-matter-type').value = 'probate';
    e.c.ecToggleProbate();
    eq(e.d.getElementById('ec-probate-fields').style.display, 'block', '⚠ probate: shown the moment the answer changes');

    const s = editClient(ESTATE, { 'ec-probate-case': '50-2026-CP-001234', 'ec-letters-date': '2026-09-01',
      'ec-probate-deadline': '2026-10-31', 'ec-probate-sale': 'no', 'ec-exec-auth': 'received' });
    s.c.saveClientEdit(7);
    const j = s.c.jobs[0];
    eq(j.probateCase, '50-2026-CP-001234', '⚠⚠ the case number typed on an Estate Settlement is saved — it used to be read on the service alone and thrown away');
    eq(j.lettersDate, '2026-09-01', '⚠⚠ …and the Letters date');
    eq(j.probateDeadline, '2026-10-31', '…and the deadline');

    const t = editClient(Object.assign({}, ESTATE, { matterType: 'trust', probateCase: 'OLD' }),
      { 'ec-matter-type': 'trust', 'ec-probate-case': 'SHOULD-NOT-SAVE', 'ec-letters-date': '2026-09-01' });
    t.c.saveClientEdit(7);
    eq(t.c.jobs[0].probateCase, 'OLD', 'a trust matter writes no court record — the block was not shown');
  }

  group('⚠ M5 — Client Intake shows the court record when the matter goes through probate');
  {
    const run = (svc, matter) => {
      const d = domStub({ 'i-svc': svc, 'i-matter-type': matter });
      const c = sandbox({ fns: ['toggleIntakeFields', 'courtRecordShown', 'jobOnProbateTrack', 'matterDef', 'matterTypeOf', 'invFiduciaryMode',
        'intakeAsksHouseContents', 'onDocGateChange', '_gateYes', '_gate706', 'gateDispute', 'docLevelFloor', 'docTierOf', 'docTierDef',
        'docTierScope', 'docTierScopeMirror', 'svcHasDocStep', 'docLevelFloorReason', 'resolveDocLevel', 'isDecedentJob',
        'invAppraisalThreshold', 'docStandardEffect', 'isFormalDoc', 'showHouseFlagRows', 'houseFlagAsked'],
        vars: ['MATTER_TYPES', 'DECEDENT_SERVICES', 'INV_APPRAISAL_THRESHOLD', 'INV_APPRAISAL_THRESHOLD_DISPUTED',
               'DOC_TIERS', 'DOC_TIER_FROM_SCOPE', 'JOB_STEPS', 'HOUSE_FLAGS', 'FIREARMS_PROTOCOL_DOC'],
        stubs: { document: d } });
      c.toggleIntakeFields();
      return d.getElementById('probate-fields').style.display;
    };
    eq(run('cleanout', 'probate'), 'block', '⚠⚠ an Estate Settlement on a probate matter is shown the court record at intake');
    eq(run('cleanout', 'trust'), 'none', 'a trust matter is not');
    eq(run('cleanout', ''), 'none', 'nor an unanswered one');
    eq(run('probate', 'trust'), 'block', 'a Probate service always is — its case number is required');
    has(src, '<select id="i-matter-type" onchange="toggleIntakeFields()">', '…and the matter select repaints it on change');
  }

  group('⚠ M5 — the Job Plan asks the court questions on a probate matter, and the attorney only where there is one to name');
  {
    const P = sandbox({
      fns: ['planDerivedLines', 'planTaskCtx', 'jobOnProbateTrack', 'invFiduciaryMode', 'isDecedentJob', '_planRooms',
            'roomStatusNormalize', 'firearmsFlaggedAtIntake', 'houseFlagsOf', '_jobInvRefs', '_srcLineKey', 'matterTypeOf', 'matterDef',
            'docTierOf', 'docTierDef', 'docTierProduces', 'svcHasDocStep', 'estimateIsFeeOnly', 'estDeclutterHrs', 'coAcceptedHours',
            'coHoursTotal', 'coHours', 'jobAppraisalDuty', 'approvedEstimateFor', 'appraisalDuty', 'estimateDocScope', 'estimateAppraiserLines', 'docScopeDef', 'jobPrepLines', 'coPrepVendorLines', 'coVendorAdds'],
      vars: ['DECEDENT_SERVICES', 'jobPlanStore', 'TC_DONE_STATUSES', 'PS_DONE_STATUSES', 'ROOM_STATUS_META', 'ROOM_STATUS_LEGACY',
             'INV_RELEASE_DISPOSITIONS', 'FIREARMS_PROTOCOL_DOC', 'HOUSE_FLAGS', 'changeOrders', 'MATTER_TYPES', 'DOC_TIERS',
             'DOC_TIER_FROM_SCOPE', 'JOB_STEPS', 'DOC_SCOPES'],
      stubs: { isFormalDoc: () => false, docSentAt: () => null, jobLogEntries: () => [], stagePaidTotal: () => 0, _photoRefs: { 7: [] },
               isAgreementSigned: () => false, isJobFunded: () => false, depositPaidTotal: () => 0 } });
    const keys = (job) => P.planDerivedLines(7, Object.assign({ id: 7 }, job), { svc: job.svc, rooms: [{ idx: 0, name: 'Kitchen' }] }, 'p0')
      .map((l) => l.key);
    const es = keys({ svc: 'cleanout', matterType: 'probate', executorAuth: 'pending' });
    ok(es.indexOf('letters') >= 0, '⚠⚠ an Estate Settlement on a probate matter is asked for its Letters');
    ok(es.indexOf('deadline_733604') >= 0, '⚠⚠ …and its §733.604 deadline');
    ok(es.indexOf('attorney_on_file') >= 0, '…and its attorney (Florida requires the PR to be represented)');
    const tr = keys({ svc: 'cleanout', matterType: 'trust' });
    eq(tr.filter((k) => k === 'letters' || k === 'deadline_733604' || k === 'attorney_on_file'), [],
       '⚠ a trust matter with no attorney is asked none of them — it used to carry a red attorney chip nobody could close');
    const trA = P.planDerivedLines(7, { id: 7, svc: 'cleanout', matterType: 'trust', probateAttyName: 'Richard Comiter' },
      { svc: 'cleanout', rooms: [] }, 'p0').filter((l) => l.key === 'attorney_on_file')[0];
    ok(trA && trA.ok, 'an attorney recorded on a trust matter is still shown, green');
    ok(keys({ svc: 'probate', executorAuth: 'pending' }).indexOf('letters') >= 0, 'an unanswered Probate job is asked, exactly as before');
  }

  group('M5 — the schedule strip carries the court deadline on every probate matter');
  {
    const S = sandbox({ fns: ['jobSchedule', 'jobOnProbateTrack', 'matterDef', 'matterTypeOf', 'invFiduciaryMode', 'isDecedentJob',
      'estWorkingDays', 'addWorkingDays', '_ymdLocal', 'workingDaysInclusive', 'docSentAt', 'docKeyFor', 'coWorkingDays', '_coPaceFix'],
      vars: ['MATTER_TYPES', 'DECEDENT_SERVICES', 'PRODUCTIVE_HRS_PER_DAY'] });
    const d = S.jobSchedule({ id: 7, svc: 'cleanout', matterType: 'probate', status: 'won', start: '2026-10-05', probateDeadline: '2026-10-31' },
      { svc: 'cleanout', days: 6 }, '2026-09-29');
    eq(d.courtDeadline, '2026-10-31', '⚠ an Estate Settlement on a probate matter is tested against its court deadline');
    const t = S.jobSchedule({ id: 7, svc: 'cleanout', matterType: 'trust', status: 'won', start: '2026-10-05', probateDeadline: '2026-10-31' },
      { svc: 'cleanout', days: 6 }, '2026-09-29');
    ok(!t.courtDeadline, 'a trust matter has none');
    has(liveFn('renderClientDashboard'), 'if (jobOnProbateTrack(job))', 'the dashboard\'s Probate Information card follows the same rule');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // M6 / Q12 — THE RECORDER AND THE ACH LINK ASK FOR WHAT IS STILL OWED, OFF THE INVOICE ITSELF
  // ═══════════════════════════════════════════════════════════════════════════
  const INV_FNS = ['estTolerancePctTxt', 'paymentStageWord', 'finalAwaitsHours', 'invoiceHtml', 'docSentAt', 'paymentSplit', 'rushScopeLine',
    'rushCrewAdded', 'jobLogEntries', 'invFinalApproval', 'invFinalApprovalRecord', 'docKeyFor', 'coHours', 'coHoursTotal',
    'coBaselineShift', 'coPrice', 'coPriceTotal', 'coHoursLabel', '_coMoney', 'fmt', 'getVendorActuals', '_srcLineKey', 'samePerson',
    'canonPersonName', '_invVendorFeeSentence', 'prepFeeRate', 'vendorGroupOfLine', 'resolveJobVendor', 'coordHrsFor', 'prepLineTCHrs',
    'vendorLineTCHrs', 'esc', 'fmtDate2', 'svcLabelOf', 'conciergePhones', 'conciergePhonesText', 'assignedTCContact', 'vendorCats',
    'vendorPrimaryCat', 'estimateIsFeeOnly', 'isDecedentJob', 'stagePaidTotal', 'jobPaidTotal', 'jobPayments', 'discountOnLabor', 'paymentCounts',
    'estFixedFee', 'estPrepFeeOnTop', 'estDeclutterHrs', 'estFixedLines', 'discountOnFixedFee', 'fixedDiscountBasisWords', 'rushBaseWords', 'coRushPct', 'coVendorAdds', 'coVendorAddsTxt', 'jobPrepLines', 'coPrepVendorLines', 'escLines', 'finalCrewOnlyWarn', 'coBaselineMove'];
  const INV_VARS = ['DOC_STAGE_WORD', 'EST_TOLERANCE_PCT', 'SMF_PCT', 'RUSH_PCT', 'SVC_LABELS', 'DEPT_EMAILS', 'HAVELLIN_OFFICE_PHONE',
    'NON_MOBILE_NUMBERS', 'DEFAULT_CONTRACTORS', 'COORD_TOUCHES', 'COORD_TOUCHES_BY_GROUP', 'COORD_TOUCHES_DEFAULT', 'TOUCH_HRS',
    'DECEDENT_SERVICES', 'PERSON_NAME_ALIASES', 'PREP_FEE_RATE'];
  // 80 TC @150 + 60 PS @100 + $1,940 materials = $19,940; the logged hours reproduce it exactly.
  const EST = { jobId: 1, tcFee: 12000, psFee: 6000, pkgCost: 1940, smf: 0, prepFee: 0, havellinTotal: 19940, havellinTotalFull: 19940,
    tcRate: 150, psRate: 100, discountPct: 0, discountAmt: 0, fixedPrice: false, rush: false, vendors: [], prepItems: [],
    preparedBy: 'Anthony Graziano', svc: 'cleanout', totTC: 80, totPS: 60 };
  const LOGS = [{ date: '2026-09-01', activity: 'clearance', members: [{ name: 'Anthony Graziano', role: 'TC', hours: 80 }, { name: 'Crew', role: 'PS', hours: 60 }] }];
  const PREP_EST = { jobId: 1, svc: 'prep', prepEnabled: true, prepItems: [{ type: 'Painting', cost: 10000, lid: 'a1' }], prepCost: 10000,
    prepFee: 3000, havellinTotal: 3000, havellinTotalFull: 3000, tcFee: 0, psFee: 0, pkgCost: 0, smf: 0, totTC: 0, totPS: 0,
    tcRate: 150, psRate: 100, discountPct: 0, discountAmt: 0, fixedPrice: false, rush: false, vendors: [], preparedBy: 'Ashley Jerome' };
  const pay = (stage, amount) => ({ stage, amount, receivedOn: '2026-09-20', method: 'check' });
  const JOB1 = (over) => Object.assign({ id: 1, hvlId: 'HVL-0007', name: 'Butler Estate', svc: 'cleanout', addr: '69 Beach Blvd',
    tc: 'Anthony Graziano', status: 'active', won: true, agrSigned: true, executor: 'Tripp Butler', payments: [] }, over || {});

  function recorder(job, stage, est, logs) {
    const d = domStub({ 'dep-stage': stage, 'dep-method': '' });
    const c = sandbox({ fns: INV_FNS.concat(['onDepStageChange', '_agrJob', 'currentDepStage', 'depositTargetFor', 'updateDepModalHints',
      'paymentMethodLabel']), vars: INV_VARS.concat(['PAYMENT_STAGES', 'LARGE_DEPOSIT_THRESHOLD']),
      stubs: { document: d, jobs: [job], _jobBandHost: () => ({ jobId: 1 }),
               jobLogs: { 1: logs === undefined ? LOGS : logs }, estimateStore: { 1: { estimate: est || EST, approved: true } },
               changeOrders: [], contractors: [], currentEstimate: null, vendorDirectory: [], jobPlans: {} } });
    c.onDepStageChange();
    return { amount: d.getElementById('dep-amount').value, title: d.getElementById('dep-modal-title').textContent,
             btn: d.getElementById('dep-save-btn').textContent, sub: text(d.getElementById('dep-modal-sub').innerHTML) };
  }

  group('⚠⚠ M6 — the midpoint opens on its balance, under a button naming the midpoint');
  {
    const r = recorder(JOB1({ payments: [pay('deposit', 9970)] }), 'midpoint');
    eq(String(r.amount), '4985', '⚠⚠ the midpoint is prefilled with what its invoice asks for — it opened BLANK');
    eq(r.title, 'Record Midpoint Payment', 'the title names the stage');
    eq(r.btn, 'Record Midpoint Payment →', '⚠ …and so does the button, which read "Record Deposit →" on every stage');
    has(r.sub, 'The midpoint invoice asks for $4,985', 'the sub-line says where the figure came from');
    has(r.sub, 'Outstanding: $4,985', '…and what is still owed');

    const part = recorder(JOB1({ payments: [pay('deposit', 9970), pay('midpoint', 2000)] }), 'midpoint');
    eq(String(part.amount), '2985', '⚠ a second cheque against a part-paid midpoint is prefilled with the balance');
    has(part.sub, 'of which $2,000 is already recorded here', '…and names the first one');

    const fin = recorder(JOB1({ payments: [pay('deposit', 9970), pay('midpoint', 4985)] }), 'final');
    eq(String(fin.amount), '4985', 'the final is prefilled with the balance its invoice asks for');
    eq(fin.btn, 'Record Final Payment →', '…under a Final button');

    const noHrs = recorder(JOB1({ payments: [pay('deposit', 9970), pay('midpoint', 4985)] }), 'final', EST, []);
    eq(String(noHrs.amount), '', 'a final that cannot be priced (no hours logged) prefills nothing — there is no figure to prefill');
    has(noHrs.sub, 'cannot be priced yet', '…and says why, so a figure is typed from the invoice actually sent');

    const dep = recorder(JOB1({ payments: [pay('deposit', 2000)] }), 'deposit');
    eq(String(dep.amount), '7970', 'the deposit still opens on its outstanding 50%, as it always did');
    eq(dep.btn, 'Record Deposit →', '…under the Deposit button');

    const prep = recorder(JOB1({ svc: 'prep', payments: [pay('deposit', 1500)] }), 'midpoint', PREP_EST, []);
    eq(prep.btn, 'Record Second Payment →', '⚠ on Home Prep the middle payment is the Second payment, as its estimate calls it');
    has(prep.sub, 'second invoice', '…in the sub-line too');
  }

  function achLink(job, stage, stripeSt) {
    const posts = [], notices = [];
    if (stripeSt) job.docState = { ['invoice:' + stage]: { stripe: stripeSt } };
    const c = sandbox({ fns: INV_FNS.concat(['stripePaymentLink', '_stripeShowLink', 'docState', 'paymentStageLabel']),
      vars: INV_VARS.concat(['PAYMENT_STAGES', 'PAYMENT_STAGE_LABELS']),
      stubs: { jobs: [job], SHEETS_SYNC_URL: 'https://script.example/exec', ensureAgreementApproved: () => '',
               _appsScriptPost: (url, body) => posts.push(body), _docNotice: (kind, msg) => notices.push({ kind, msg }),
               _jobTouch() {}, saveJobs() {}, syncJobToSheets() {},
               jobLogs: { 1: LOGS }, estimateStore: { 1: { estimate: EST, approved: true } },
               changeOrders: [], contractors: [], currentEstimate: null, vendorDirectory: [], jobPlans: {} } });
    c.stripePaymentLink(1, stage);
    return { posts, notices, last: notices[notices.length - 1] || { msg: '' } };
  }

  group('⚠⚠ Q12 — after a part cheque, the ACH link asks only for the balance');
  {
    const r = achLink(JOB1({ payments: [pay('deposit', 2000)] }), 'deposit');
    eq(r.posts.length, 1, 'one link is minted');
    eq((r.posts[0] || {}).amount, 7970, '⚠⚠ for $7,970 — the $9,970 deposit less the $2,000 cheque (it asked for the whole $9,970)');
    has((r.posts[0] || {}).description || '', 'Deposit (50%) balance', '⚠ the client reads "balance" on Stripe\'s page, or the figure reads as a mistake');
    has(r.notices[0] ? r.notices[0].msg : '', 'the balance of the Deposit (50%), after the $2,000 already received', 'and the notice says why the figure is smaller');

    const full = achLink(JOB1({ payments: [] }), 'deposit');
    eq((full.posts[0] || {}).amount, 9970, 'with nothing received the link asks for the deposit');
    lacks((full.posts[0] || {}).description || '', 'balance', '…and does not call it a balance');

    const paid = achLink(JOB1({ payments: [pay('deposit', 9970)] }), 'deposit');
    eq(paid.posts.length, 0, 'a stage paid in full mints no link');
    has(paid.last.msg, 'Nothing is outstanding on the Deposit (50%)', '…and says so');
  }

  group('⚠⚠ Q12 — a link minted before a cheque arrived is not handed over as current');
  {
    const r = achLink(JOB1({ payments: [pay('deposit', 2000)] }), 'deposit', { url: 'https://buy.stripe.com/x', amount: 9970 });
    eq(r.posts.length, 0, 'a minted link is never minted twice');
    eq(r.last.kind, 'warn', '⚠⚠ re-showing a link that now asks for more than is owed is a WARNING');
    has(r.last.msg, 'asks for $9,970, but only $7,970 is outstanding', '…naming both figures');
    has(r.last.msg, 'would overpay by $2,000', '…and the overpayment it would cause');
    has(r.last.msg, 'Deactivate it in the Stripe Dashboard', '…and where to switch it off');
    lacks(r.last.msg, 'https://buy.stripe.com/x', '⚠ and it does NOT print the link for copying');

    const done = achLink(JOB1({ payments: [pay('deposit', 9970)] }), 'deposit', { url: 'https://buy.stripe.com/x', amount: 9970 });
    has(done.last.msg, 'must not be sent again', 'a link for a stage now paid in full must not go out again');

    const same = achLink(JOB1({ payments: [] }), 'deposit', { url: 'https://buy.stripe.com/x', amount: 9970 });
    eq(same.last.kind, 'ok', 'a link that still asks for exactly what is owed is shown as before');
    has(same.last.msg, 'https://buy.stripe.com/x', '…with the link');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Q19 — THE SECOND CONCIERGE THE ESTIMATE STAFFS NEEDS A NAME
  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠⚠ Q19 — a two-concierge estimate cannot confirm its team with the second slot empty');
  {
    const run = (est, tc2Name, answer) => {
      const said = [], asked = [];
      const crew = { tc: { name: 'Ashley Jerome', locked: false }, tc2: { name: tc2Name || '', locked: false },
                     ps: [{ name: 'Anthony Graziano Jr', locked: false }], confirmed: false };
      const K = sandbox({ fns: ['confirmJobTeam', 'plannedTC2', 'rushCrewAdded', 'crewDuplicates', 'isCrewPlaceholder', 'samePerson',
          'canonPersonName', '_lockCrewSlots', '_crewSave', '_saveJobEdit', '_jobTouch', '_stampChangedKeys', '_crewSnap'],
        vars: ['CONTRACTOR_TC_NAME', 'LOG_PLACEHOLDER_NAMES', 'PERSON_NAME_ALIASES'],
        stubs: { getJobCrew: () => crew, isJobWon: () => true, unfilledPlannedPS: () => [], plannedPSCount: () => 1,
                 estimateStore: { 7: { estimate: est } },
                 showFB: (id, kind, msg) => said.push({ kind, msg }), confirm: (m) => { asked.push(m); return answer !== false; },
                 saveJobs() {}, syncJobToSheets() {}, buildLogTeamRows() {}, _repaintPlanGates() {} } });
      K.jobs = [{ id: 7 }];
      K.confirmJobTeam(7);
      return { crew, said, asked, TBD: K.CONTRACTOR_TC_NAME };
    };
    const empty = run({ needsTC2: true }, '');
    ok(!empty.crew.confirmed, '⚠⚠ an estimate staffing two concierges refuses a team with the second slot empty');
    has((empty.said[0] || {}).msg || '', 'the second slot has no name', '…saying which slot');
    has((empty.said[0] || {}).msg || '', empty.TBD, '…and offering the concierge placeholder by name');

    const tbd = run({ needsTC2: true }, empty.TBD);
    ok(tbd.crew.confirmed, 'the concierge placeholder satisfies it');
    has(tbd.asked[0] || '', '1 concierge slot is still', '⚠ …and is called out before confirming, as a TBD specialist is');
    const no = run({ needsTC2: true }, empty.TBD, false);
    ok(!no.crew.confirmed, '…and Cancel there confirms nothing');

    const named = run({ needsTC2: true }, 'Bob Smith');
    ok(named.crew.confirmed, 'a named second concierge confirms');
    eq(named.asked.length, 0, '…without a placeholder question');

    const one = run({ needsTC2: false }, '');
    ok(one.crew.confirmed, 'a one-concierge estimate confirms with the second slot empty, as before');
    const legacy = run({ preparedBy2: 'Bob Smith' }, '');
    ok(!legacy.crew.confirmed, 'an older record staffing two (preparedBy2) is held to the same rule — rushCrewAdded is the one reader');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // THE LOWS
  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠ HOME PREP\'S MIDDLE PAYMENT IS THE SECOND PAYMENT, ON EVERY SURFACE');
  {
    const W = sandbox({ fns: ['paymentStageWord', 'paymentStageLabel', 'docWord', 'docTitle', 'invoiceEmailSubject', 'docNames'],
      vars: ['DOC_STAGE_WORD', 'DOC_KIND_WORD', 'DOC_ACTIONS', 'PAYMENT_STAGE_LABELS'] });
    const prep = { id: 1, svc: 'prep', addr: '12 Ocean Ave, Palm Beach' }, estate = { id: 2, svc: 'cleanout', addr: '69 Beach Blvd' };
    const w = W.paymentStageWord(prep, 'midpoint');
    eq([w.title, w.noun, w.invoice, w.payment, w.renamed], ['Second', 'second', 'second invoice', 'second payment', true], 'Home Prep: the Second payment');
    eq(w.due, 'once the vendor schedule is booked', '…falling due when its estimate says it does');
    eq(W.paymentStageWord(estate, 'midpoint').title, 'Midpoint', 'every other service keeps its midpoint');
    eq(W.paymentStageWord(estate, 'midpoint').due, 'at project midpoint', '…and its due line');
    eq(W.paymentStageWord(prep, 'final').due, 'at show-ready handover', "Home Prep's final falls due at handover");
    eq(W.paymentStageWord(estate, 'final').due, 'on completion', 'everybody else\'s on completion');
    eq(W.paymentStageWord(prep, 'deposit').title, 'Deposit', 'the deposit is the deposit everywhere');
    eq(W.paymentStageWord(null, 'midpoint').title, 'Midpoint', 'with no job, the default name');
    eq(W.paymentStageWord(prep, 'nonsense').title, 'Final', 'an unknown stage reads as Final, the fallback every reader already used');
    eq(W.paymentStageLabel(prep, 'midpoint'), 'Second (25%)', 'the recorder\'s label');
    eq(W.paymentStageLabel(estate, 'midpoint'), 'Midpoint (25%)', '…unchanged elsewhere');
    eq(W.docWord('invoice', 'midpoint', prep), 'second invoice', 'the buttons\' noun');
    eq(W.docTitle('invoice', 'midpoint', prep), 'Invoice — Second', 'the viewer\'s title');
    has(W.invoiceEmailSubject(prep, 'midpoint'), 'Second Invoice for 12 Ocean Ave', 'the email subject');
    has(W.docNames(prep, 'invoice', { stage: 'midpoint' }).drive, 'Havellin Invoice - Second', 'the filed copy is named the same way');
    has(W.docNames(prep, 'invoice', { stage: 'midpoint' }).client, 'Havellin Second Invoice', 'the client PDF is the Second Invoice');
    ok(!/midpoint/i.test(W.docNames(prep, 'invoice', { stage: 'midpoint' }).client), '…with no "midpoint" in its name');

    // The document itself.
    const c = sandbox({ fns: INV_FNS, vars: INV_VARS, stubs: { jobLogs: { 1: [] }, estimateStore: { 1: { estimate: PREP_EST, approved: true } },
      changeOrders: [], contractors: [], currentEstimate: null, vendorDirectory: [], jobPlans: {} } });
    const inv = c.invoiceHtml(JOB1({ svc: 'prep', payments: [pay('deposit', 1500)] }), 'midpoint');
    const t = text(inv.html);
    has(t, 'Second Invoice', '⚠ the invoice a Home Prep client receives is headed Second Invoice');
    has(t, 'Second Payment Due Now (25%)', '…and asks for the Second Payment');
    lacks(t, 'Midpoint', '⚠ and says "midpoint" nowhere — its own estimate never stated one');
  }

  group('⚠ the KEY stays midpoint — only the words move');
  {
    has(liveFn('paymentStageWord'), "var renamed = stage === 'midpoint' && !!job && job.svc === 'prep';", 'the rename is words-only, keyed on the service');
    lacks(liveFn('paymentStageWord'), "stage = 'second'", 'the stage key is never rewritten — docState, payments and Drive keys all read it');
    lacks(src, "'invoice:second'", '…so no record is ever keyed under a new name');
  }

  group('⚠ the final\'s View and Print wait for logged hours — finalAwaitsHours is the one rule');
  {
    const F = sandbox({ fns: ['finalAwaitsHours', 'estimateIsFeeOnly', 'estDeclutterHrs', 'jobLogEntries', 'finalCrewOnlyWarn'], stubs: { jobLogs: {} } });
    const job = { id: 1, svc: 'cleanout' };
    eq(F.finalAwaitsHours(job, EST, 0), true, 'an hourly job with nothing logged cannot be priced');
    eq(F.finalAwaitsHours(job, EST, 12), false, '…and can once hours are logged');
    eq(F.finalAwaitsHours(job, Object.assign({}, EST, { fixedPrice: true }), 0), false, 'a fixed-price final never consults the log');
    eq(F.finalAwaitsHours({ id: 1, svc: 'prep' }, PREP_EST, 0), false, 'a fee-only Home Prep final priced no hours');
    eq(F.finalAwaitsHours(null, EST, 0), false, 'no job, no answer');
    F.jobLogs = { 1: LOGS };
    eq(F.finalAwaitsHours(job, EST), false, 'asked with no hours figure, it sums the log itself — the invoice\'s way');
    F.jobLogs = { 1: [] };
    eq(F.finalAwaitsHours(job, EST), true, '…and an empty log is an empty log');
    has(liveFn('invoiceHtml'), "var _noHours = (stage === 'final') && finalAwaitsHours(job, est, actTC + actPS);",
        '⚠ the invoice blocks on the same predicate the rail withholds on, so the two cannot disagree');
    has(liveFn('_jtDocSecondaries'), "d.stage === 'final' && finalAwaitsHours(", 'the strip under the rail asks it');
    has(liveFn('jobTimelineActions'), "_d.stage === 'final' && finalAwaitsHours(", '…and the band\'s tray');
  }

  group('a closed job\'s plan is in Close-out, even one closed before the delivery stamp existed');
  {
    const S = sandbox({ fns: ['planCurrentStage'], stubs: { _planRooms: () => ({ rooms: [] }), _planRoomStatus: () => 'pending',
      stagePaidTotal: () => 0, vendorSourcingProgress: () => ({ total: 0, done: 0 }) },
      vars: ['TC_DONE_STATUSES', 'PS_DONE_STATUSES'] });
    eq(S.planCurrentStage(7, { id: 7, status: 'closed' }, {}), 'p4', '⚠ a legacy closed job with no deliveredOn reads Close-out — it marked Before Day 1 as NOW');
    eq(S.planCurrentStage(7, { id: 7, status: 'active', deliveredOn: '2026-09-20' }, {}), 'p4', 'as does one carrying the stamp');
  }

  group('⚠ the rail, driven: the retained row names what was kept; Home Prep names its second payment');
  {
    const TL_FNS = ['estimateOutForApproval', '_approvedPriceAbove', 'priceAboveSent', 'priceAboveAcceptance', 'docDraftPending',
      'agrApprovalWithdrawn', 'jobTimeline', '_localDateOf', 'paymentStageWord', 'finalAwaitsHours', 'jobLogEntries',
      'estimateIsFeeOnly', 'estDeclutterHrs', 'jobTimelineNext', 'paymentSplit', 'unscoredRoomNames', 'jobActivationBlockers',
      'resolveExecutorAuth', 'isJobWon', 'isJobFunded', 'jobPayments', 'stagePaidTotal', 'paymentCounts', 'depositPaidTotal', 'jobPaidTotal',
      'closeoutRetainedTotal', 'depositTargetFor', 'docSentAt', 'docKeyFor', 'agreementSignature', 'isAgreementSigned',
      'esignProviderKey', 'esignAvailable', 'esignJobWatches', 'isAgreementSent', 'jobSchedule', 'jobOnProbateTrack', 'matterDef',
      'matterTypeOf', 'invFiduciaryMode', 'isDecedentJob', '_ymdLocal', 'jobProgress', 'estWorkingDays', 'addWorkingDays',
      'workingDaysInclusive', 'coWorkingDays', '_coPaceFix', 'roomStatusNormalize', 'jtDraftLine', 'staleDraftNote', 'staleDraftsOf',
      'draftIsStale', 'draftOutstanding', 'staleDocName', '_draftDay', '_andJoin', 'finalCrewOnlyWarn'];
    const TL_VARS = ['JT_SHORT', 'DECEDENT_SERVICES', 'MATTER_TYPES', 'JT_NEXT', 'JT_LEG_BREAK', 'JT_ROW_DOC', 'AGR_SIG_METHODS',
      'ESIGN_PROVIDERS', 'DOC_READY_WHY', 'DOC_KIND_WORD', 'DOC_STAGE_WORD', 'DOC_ACTIONS', 'SVC_LABELS', 'ROOM_STATUS_META',
      'ROOM_STATUS_LEGACY', 'TC_DONE_STATUSES', 'PS_DONE_STATUSES', 'PROJ_CREW_DAY', 'PRODUCTIVE_HRS_PER_DAY', 'EXECUTOR_AUTH_OPTIONS'];
    const R = sandbox({ fns: TL_FNS, vars: TL_VARS, stubs: { Intl: global.Intl, _todayStr: () => '2026-09-29' } });
    const rows = (job, est) => { const rec = { estimate: est, approved: true }; R.estimateStore = { [job.id]: rec }; R.jobs = [job];
      const by = {}; R.jobTimeline(job, rec, [], [], null).forEach((r) => { by[r.key] = r; }); return by; };

    // Under the zone the app runs in: the container is UTC, where 01:30Z on the 30th IS the 30th.
    const prevTZ = process.env.TZ; process.env.TZ = 'America/New_York';
    let dead;
    try {
      dead = rows(JOB1({ status: 'closed_retained', lostReason: 'price', lostReasonLabel: 'Price / estimate too high',
        lostAt: '2026-09-30T01:30:00Z', payments: [pay('deposit', 2000), pay('midpoint', 500)] }), EST);
    } finally { process.env.TZ = prevTZ; }
    ok(!!dead.terminal, 'a retained job collapses to its one terminal row');
    has(dead.terminal.sub, '$2,500 retained', '⚠⚠ naming everything it kept — the deposit and the midpoint — not the deposit stage alone');
    eq(dead.terminal.at, '2026-09-29', '…dated on the local calendar (lostAt is a UTC stamp written at 9:30pm)');

    const prepJob = JOB1({ svc: 'prep', created: 'Sep 8, 2026', approved: true, won: true });
    const pr = rows(prepJob, PREP_EST);
    eq(pr.midpoint_invoiced.label, 'Second invoice sent', '⚠ Home Prep\'s middle invoice row reads Second invoice sent');
    eq(pr.midpoint_received.label, 'Second payment', '…and its payment row Second payment');
    eq(pr.midpoint_received.todo, 'Collect the second payment', '…with the band\'s step in the same words');
    eq(pr.final_paid.sub, 'Balance of the fee on actual vendor spend', 'its final is the balance of the fee on the vendors\' actual invoices');
    const es = rows(JOB1(), EST);
    eq(es.midpoint_invoiced.label, 'Midpoint invoice sent', 'every other service keeps its midpoint');
    eq(es.final_paid.sub, 'Balance of actual hours', '…and an hourly final is the balance of actual hours');
    eq(rows(JOB1(), Object.assign({}, EST, { fixedPrice: true, fixedAmount: 20000 })).final_paid.sub, 'Balance of the fixed fee',
       '⚠ a fixed-price final is the balance of the fixed fee — it read "actual hours" on a job that bills none');
  }
};
