'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// P9 (2026-09-28 workflow audit): EDIT CLIENT BROUGHT UP TO CLIENT INTAKE'S RULES.
//
//   H7  Saving Edit Client erased what it could not display. The concierge list was three
//       hard-coded names (one of them a specialist) and the role list lacked the three
//       court-appointed roles intake offers; `sel()` selects only an exact match and the save
//       wrote both back unconditionally, so an untouched save erased a directory concierge or
//       an ad litem role.
//   H8  A service switch across the living / estate line kept the wrong person's data, an
//       estate job asked for the deceased's phone and email, and esignSigner took job.email
//       first — a signature request could go out in a dead person's name.
//   H9  dateChainGuard silently cleared the hard target and the start (in dashboard-schedule).
//   M13 Years in home, bed and bath counts, the referral source and partner had no Edit Client
//       field. M14 the intake reset left preGate, date minimums and the referral block behind.
//   M15 The Drive-folder answer navigated to the new client. M16 a hidden partner was saved,
//       and partners were keyed by sheet row.
//   Q16 an address already on file is named, never refused. Q17 Home Prep is asked access &
//       security and safety, not must-find. And the intake lows.
//
// The central net is the audit's own test: for a job with each role and a directory concierge,
// OPEN Edit Client and SAVE UNTOUCHED — nothing changes. domStub parses no markup, so the form
// a browser would show is read back out of the rendered modal by `formFromHtml` (inputs by their
// value attribute, selects by their selected option, textareas by content, checkboxes by
// `checked`). The browser step (step 41) proves the same join on the real page.
// ─────────────────────────────────────────────────────────────────────────────

const { sandbox, source, domStub, fn } = require('./harness');

const noComments = (t) => String(t).split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
const unesc = (s) => String(s).replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>').replace(/&amp;/g, '&');

// What a browser shows in each control of a rendered form, keyed by id.
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
const optionValues = (html, id) => {
  const m = new RegExp('<select id="' + id + '"[^>]*>([\\s\\S]*?)</select>').exec(html);
  return m ? (m[1].match(/<option\b[^>]*>/g) || []).map((o) => unesc((/value="([^"]*)"/.exec(o) || [])[1] || '')) : null;
};

const EC_FNS = ['showEditClient', 'courtRecordShown', 'jobOnProbateTrack', 'saveClientEdit', 'ecToggleProbate', 'ecPaintSvcFlag', 'probateSvcFlag', 'probateSvcOffTrack',
  'executorAuthOptionsHtml', 'resolveExecutorAuth', 'ecIsProbateSvc', 'ecIsEstateSvc', 'ecIsMoveSvc', 'ecDocGateChange',
  'docTierOptionsHtml', 'docTierOf', 'docTierDef', 'docTierScope', 'docTierScopeMirror', 'svcHasDocStep', 'esc', 'onDocGateChange',
  'houseFlagInputsHtml', 'houseFlagsOf', '_houseFlagRowClass', 'docLevelFloor', 'gateDispute', '_gateYes', '_gate706', 'isDecedentJob',
  'docLevelFloorReason', 'resolveDocLevel', 'docStandardEffect', 'isFormalDoc', 'invAppraisalThreshold', 'matterTypeOf', 'matterDef',
  'invFiduciaryMode', 'readHouseFlagInputs', 'docScopeDef', 'inventoryDeadlineFrom', '_ymdLocal', 'referralSourceKind',
  'referralSourceOptionsHtml', 'referralPartnerOptionsHtml', 'jobRefersToPartner', 'referralIdOf', 'lookupReferralById',
  'svcFamilyOptions', 'svcFamily', 'sameSvcFamily', 'conciergeOptionsHtml', 'getAllActiveTC', '_byContractorName', 'samePerson', 'canonPersonName',
  'executorRoleOptionsHtml', 'dateChainConflicts', 'dateChainFlagHtml', 'intakeAsksHouseContents', 'houseFlagAsked',
  'clientMissingFields', 'readReferralInputs', 'showHouseFlagRows', 'onReferralSourceChange', 'populateReferralPicker', '_stampChangedKeys', '_jobTouch', 'docTierChangeNotice', 'followDocTier', 'activeDocScope', 'seedDocScopeFromJob', 'estimateDocScope', 'docTierWord', 'docScopeWord', 'estimateRepriceRoute', 'estimateEditBlocker', 'priceChangeBlocker', 'estimateOutForApproval', 'isAgreementSigned', 'isAgreementSent', 'agreementSignature', 'docSentAt', 'docKeyFor', 'roundCents', 'fmt', 'propertySaleAsked', 'trustRecordShown', 'executorAuthField', 'coFiduciaryBlockHtml', 'jobListEntries', 'readCoFiduciaryRows', 'saveCoFiduciaryRows', 'estateAuthority', '_coFidRowNums'];
const EC_VARS = ['EXECUTOR_AUTH_OPTIONS', 'SVC_LABELS', 'HOUSE_FLAGS', 'FIREARMS_PROTOCOL_DOC', 'DECEDENT_SERVICES',
  'DOC_TIERS', 'DOC_TIER_FROM_SCOPE', 'JOB_STEPS', 'INV_APPRAISAL_THRESHOLD', 'INV_APPRAISAL_THRESHOLD_DISPUTED', 'MATTER_TYPES',
  'DOC_SCOPES', 'REFERRAL_SOURCES', 'SVC_ORDER', 'EXECUTOR_ROLES', 'DEFAULT_CONTRACTORS', 'PERSON_NAME_ALIASES', 'ESTIMATE_EDIT_ROUTE_TXT', 'ESTIMATE_OUT_FOR_APPROVAL_TXT', 'ESTATE_AUTHORITY_WORDS', 'ESTATE_AUTHORITIES'];

const CARLA = { name: 'Carla Mendes', role: 'TC', status: 'active' };
const PARTNERS = [
  { _row: 5, uid: 'u-ann', partner_name: 'Ann Lowe', partner_type: 'Estate attorney', status: 'Active Partner' },
  { _row: 6, uid: 'u-bob', partner_name: 'Bob Reyes', partner_type: 'Estate attorney', status: 'Active Partner' },
  { _row: 7, uid: 'u-cat', partner_name: 'Cat Ortiz', partner_type: 'Realtor', status: 'Active Partner' },
];

// Open Edit Client on `job`, read the form a browser would show, apply `edits`, press Save.
function editAndSave(job, edits, opts) {
  opts = opts || {};
  const probe = domStub({});
  const mk = (d, jobsArr) => sandbox({ fns: EC_FNS, vars: EC_VARS, stubs: Object.assign({
    document: d, jobs: jobsArr, estimateStore: opts.estimateStore || {}, contractors: [CARLA],
    referralDirectory: JSON.parse(JSON.stringify(opts.partners || PARTNERS)), REFERRAL_SYNC_URL: '',
    saveJobs() {}, syncJobToSheets() {}, renderClientDashboard() {}, renderJobs() {},
    dashNotice: (t, m) => { said.notice = m; }, alert: (m) => { said.alert = (said.alert || '') + m; } }, opts.stubs || {}) });
  const said = {};
  const r = mk(probe, [JSON.parse(JSON.stringify(job))]);
  r.showEditClient(job.id);
  const html = probe.getElementById('edit-client-modal').innerHTML;
  const form = Object.assign(formFromHtml(html), edits || {});
  // domStub mints any id on demand; a browser answers null for a control the modal never rendered,
  // and "not rendered" is exactly what the save has to tell apart from "cleared" (H7).
  const rendered = new Set((html.match(/\bid="([^"]+)"/g) || []).map((m) => m.slice(4, -1)));
  const d = domStub(form);
  const mint = d.getElementById.bind(d);
  d.getElementById = (id) => (/^ec-/.test(id) && !rendered.has(id) && !(id in (edits || {}))) ? null : mint(id);
  // …and a browser fills el.dataset from the data-* attributes the markup carries.
  (html.match(/<[a-z]+\b[^>]*\bid="[^"]+"[^>]*>/g) || []).forEach((t) => {
    const id = /\bid="([^"]+)"/.exec(t)[1];
    let m; const re = /\bdata-([a-z-]+)="([^"]*)"/g;
    while ((m = re.exec(t))) mint(id).dataset[m[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = unesc(m[2]);
  });
  const jobsArr = [JSON.parse(JSON.stringify(job))];
  const c = mk(d, jobsArr);
  c.saveClientEdit(job.id);
  return { html, form, job: c.jobs[0], said, c };
}

const LIVING = { id: 7, hvlId: 'HVL-0007', name: 'Tripp Butler', fname: 'Tripp', lname: 'Butler', svc: 'downsizing',
  phone: '(561) 555-0142', email: 'tripp@example.com', addr: '12 Ocean Blvd', city: 'Palm Beach', zip: '33480',
  sqft: '4500', ptype: 'Single Family Home', src: 'Estate attorney', refPartnerId: 'u-bob', refPartnerName: 'Bob Reyes',
  start: '2026-10-05', walkthrough: '2026-09-28', completion: '2026-11-20', tc: 'Carla Mendes', yearsInHome: '22',
  beds: '4', baths: '3', halfBaths: '1', priority: 'normal', re: 'unknown', premium: false, notes: 'Gate code 1234',
  houseFlags: { access: { on: true, note: 'Alarm 4411' } } };
const ESTATE = { id: 9, hvlId: 'HVL-0009', name: 'Eleanor Vance', fname: 'Eleanor', lname: 'Vance', svc: 'probate',
  addr: '4 Via Mizner', city: 'Palm Beach', zip: '33480', sqft: '6200', ptype: 'Estate', src: 'Family',
  referredByName: 'Joan Vance', start: '2026-10-12', tc: 'Ashley Jerome', deathDate: '2026-07-01', matterType: 'probate',
  executorFname: 'Joan', executorLname: 'Vance', executor: 'Joan Vance', executorRole: 'Curator',
  executorPhone: '(561) 555-0199', executorEmail: 'joan@example.com', executorAuth: 'received',
  probateCase: '50-2026-CP-004411', probateAttyFname: 'Ann', probateAttyLname: 'Lowe', probateAttyName: 'Ann Lowe',
  probateAttyFirm: 'Lowe PA', probateAttyPhone: '(561) 555-0111', probateAttyEmail: 'ann@lowe.law',
  docTier: 'inventory', gate706: 'no', gateDispute: 'no', lettersDate: '2026-08-01', probateDeadline: '2026-09-30',
  // A phone and email left on the deceased's record by an old save: never shown, never erased, never used.
  phone: '(561) 555-0000', email: 'eleanor@example.com' };

const KEYS = ['name', 'fname', 'lname', 'svc', 'phone', 'email', 'addr', 'city', 'zip', 'sqft', 'ptype', 'src',
  'refPartnerId', 'refPartnerName', 'referredByName', 'start', 'walkthrough', 'completion', 'tc', 'yearsInHome',
  'beds', 'baths', 'halfBaths', 'notes', 'executorRole', 'executor', 'executorEmail', 'deathDate', 'matterType',
  'probateCase', 'lettersDate'];
const pick = (j) => { const o = {}; KEYS.forEach((k) => { o[k] = j[k] == null ? '' : String(j[k]); }); const hf = j.houseFlags || {}; o.houseFlags = JSON.stringify(Object.keys(hf).sort().filter((k) => hf[k] && (hf[k].on || hf[k].note)).map((k) => [k, !!hf[k].on, hf[k].note || ''])); return o; };

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ H7 — OPEN AND SAVE UNTOUCHED: NOTHING CHANGES, for every role and a directory concierge');
  {
    const roles = sandbox({ vars: ['EXECUTOR_ROLES'] }).EXECUTOR_ROLES.map((r) => r.v);
    ['Administrator ad litem', 'Curator', 'Guardian ad litem'].forEach((r) =>
      ok(roles.indexOf(r) >= 0, 'the one role catalogue carries ' + r));
    // ⚠ RESTATED 2026-10-01 (P17): Power of Attorney left the catalogue (a power of attorney ends at death, so it is not
    // a decedent's representative), which took one role out of this loop. A record that already carries it is exactly the
    // "older value" this net exists for, so it is opened and saved untouched here as one, with the typed role below.
    roles.concat(['Conservator (typed on an old record)', 'Power of Attorney']).forEach((role) => {
      const job = Object.assign({}, ESTATE, { executorRole: role });
      const r = editAndSave(job);
      eq(pick(r.job), pick(job), '⚠⚠ an untouched save changes nothing — role "' + role + '"');
    });
    const r = editAndSave(LIVING);
    eq(pick(r.job), pick(LIVING), '⚠⚠ an untouched save changes nothing — living client with directory concierge Carla Mendes');
    has(r.html, '<option value="Carla Mendes" selected>', 'the directory concierge is offered and selected');
    eq(r.said.alert, undefined, 'and nothing is refused or nagged');

    // The referral picks, kept the same way.
    const oldSrc = editAndSave(Object.assign({}, LIVING, { src: 'Newspaper', refPartnerId: '', refPartnerName: '' }));
    eq(oldSrc.job.src, 'Newspaper', 'a referral source the catalogue no longer lists is kept');
    has(oldSrc.html, 'Newspaper (as recorded)', 'and shown as recorded');
    const offDir = editAndSave(LIVING, null, { partners: [] });
    eq([offDir.job.refPartnerId, offDir.job.refPartnerName], ['u-bob', 'Bob Reyes'],
       '⚠ a partner the directory has not loaded (or no longer lists) is kept, id and name');
    has(offDir.html, 'Bob Reyes (as recorded)', 'and shown as recorded');
    const legacyRow = editAndSave(Object.assign({}, LIVING, { refPartnerId: '6' }));
    eq(legacyRow.job.refPartnerId, 'u-bob', 'a pre-M16 row id is matched to its partner and re-keyed to the uid on the next save');

    // Browser step 26 found this one: a property type saved under an older label.
    const oldPtype = editAndSave(Object.assign({}, LIVING, { ptype: 'Single Family' }), { 'ec-sqft': '5200' });
    eq([oldPtype.job.ptype, oldPtype.job.sqft], ['Single Family', '5200'],
       '⚠ a property type the list no longer carries is kept, and the edit beside it saves');
    has(oldPtype.html, 'Single Family (as recorded)', 'and it is shown as recorded');
    const oldPri = editAndSave(Object.assign({}, LIVING, { priority: 'rush' }));
    eq(oldPri.job.priority, 'rush', 'so is any other select\'s unlisted value (priority)');

    const gone = editAndSave(Object.assign({}, LIVING, { tc: 'Dana Former' }));
    eq(gone.job.tc, 'Dana Former', '⚠ a concierge no longer on the roster is kept, not written back as Unassigned');
    has(gone.html, 'Dana Former (not on the active roster)', 'and named as such');
    lacks(noComments(fn('showEditClient')), "{v:'Anthony Graziano Jr',l:'Anthony Graziano Jr'}", 'no hard-coded concierge list survives');

    // Intake and Edit Client offer the same roles, from the one list.
    const i = sandbox({ fns: ['buildExecutorRoleOptions', 'executorRoleOptionsHtml', 'esc'], vars: ['EXECUTOR_ROLES'],
      stubs: { document: domStub({}) } });
    i.buildExecutorRoleOptions();
    const intakeRoles = (i.document.getElementById('i-executor-role').innerHTML.match(/value="([^"]*)"/g) || []).map((x) => x.slice(7, -1));
    const ecRoles = optionValues(editAndSave(ESTATE).html, 'ec-exec-role');
    eq(ecRoles.slice().sort(), intakeRoles.slice().sort(), 'Edit Client offers exactly the roles intake offers');
    has(src, '<select id="i-executor-role"></select>', 'the intake select ships empty and is built from the catalogue');
    has(src.slice(src.lastIndexOf('buildExecutorAuthOptions();')), 'buildExecutorRoleOptions();', 'and it is built at load');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ H8 / Q4 — the service stays in its family; an estate never asks for, or writes to, the deceased');
  {
    const lr = editAndSave(LIVING);
    eq(optionValues(lr.html, 'ec-svc'), ['prep', 'downsizing', 'downsizing_move', 'home_cleanout'], 'a living client is offered the living services only');
    const er = editAndSave(ESTATE);
    eq(optionValues(er.html, 'ec-svc'), ['cleanout', 'probate', 'contested_probate'], 'an estate the decedent services only');

    const cross = editAndSave(LIVING, { 'ec-svc': 'cleanout' });
    eq(cross.job.svc, 'downsizing', '⚠⚠ a cross-family service reaching the save is refused');
    has(cross.said.alert, 'Create a new client for this', 'with the decided words');
    const within = editAndSave(LIVING, { 'ec-svc': 'home_cleanout' });
    eq(within.job.svc, 'home_cleanout', 'a switch within the family saves');

    lacks(er.html, 'id="ec-phone"', '⚠ an estate job renders no phone for the deceased');
    lacks(er.html, 'id="ec-email"', '⚠ nor an email');
    has(er.html, 'No phone or email for the deceased', 'and says where the contacts are');
    eq([er.job.phone, er.job.email], [ESTATE.phone, ESTATE.email], 'a value already on the record is kept, never blanked');

    const L = sandbox({ fns: ['clientRecipient', 'bestClientEmail', 'bestClientGreetingName', 'esignSigner', 'isDecedentJob', 'firstName'],
      vars: ['DECEDENT_SERVICES'] });
    eq(L.esignSigner(ESTATE), { name: 'Joan Vance', email: 'joan@example.com' },
       '⚠⚠ the signature request goes to the representative even with an email on the deceased\'s record');
    eq(L.bestClientEmail(ESTATE), 'joan@example.com', 'so does every email');
    eq(L.bestClientGreetingName(ESTATE), 'Joan', 'and the greeting names them');
    const noRep = Object.assign({}, ESTATE, { executorEmail: '' });
    eq(L.esignSigner(noRep), { name: 'Ann Lowe', email: 'ann@lowe.law' }, 'no representative email: counsel, never the deceased');
    eq(L.esignSigner(LIVING), { name: 'Tripp Butler', email: 'tripp@example.com' }, 'a living client is still the first rung');
    eq(L.esignSigner(Object.assign({}, LIVING, { email: '', executorEmail: 'poa@example.com', executor: 'Pat Butler' })),
       { name: 'Pat Butler', email: 'poa@example.com' }, 'and a living client with no email falls to the representative, name and address together');
    ['bestClientEmail', 'bestClientGreetingName', 'esignSigner'].forEach((f) =>
      has(noComments(fn(f)), 'clientRecipient(job)', f + ' reads the one ladder'));
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('H9 — Edit Client opens with a date conflict already on the record named in red, and saves both dates');
  {
    const bad = Object.assign({}, LIVING, { start: '2026-11-30', completion: '2026-11-20' });
    const r = editAndSave(bad);
    has(r.html, 'id="ec-date-flag"', 'the flag element is rendered');
    has(r.html, 'is after the hard target (2026-11-20)', '⚠ and names the conflict on open');
    eq([r.job.start, r.job.completion], ['2026-11-30', '2026-11-20'], '⚠⚠ both dates are saved as they stand');
    lacks(editAndSave(LIVING).html.match(/id="ec-date-flag"[^>]*>([^<]*)/)[1], 'hard target', 'an ordered job shows no flag');
    has(src, 'id="i-date-flag"', 'intake carries the same flag under its dates');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('M13 — years in home, bed and bath counts, the referral source and partner are correctable');
  {
    const r = editAndSave(LIVING, { 'ec-years-in-home': '40', 'ec-beds': '5', 'ec-baths': '4', 'ec-half-baths': '2' });
    eq([r.job.yearsInHome, r.job.beds, r.job.baths, r.job.halfBaths], ['40', '5', '4', '2'], 'all four save');
    const locked = editAndSave(LIVING, { 'ec-years-in-home': '40' }, { estimateStore: { 7: { approved: true } } });
    eq(locked.job.yearsInHome, '22', '⚠ once approved, years in home is held — tenure prices the estimate');
    has(locked.said.alert, 'Years in home', 'and the refusal names it');
    const lockedBeds = editAndSave(LIVING, { 'ec-beds': '6' }, { estimateStore: { 7: { approved: true } } });
    eq(lockedBeds.job.beds, '6', 'bedrooms price nothing and stay correctable');

    has(r.html, '<option value="u-bob" selected>Bob Reyes</option>', 'the partner picker opens on the job\'s partner');
    const moved = editAndSave(LIVING, { 'ec-refpartner': 'u-ann' });
    eq([moved.job.refPartnerId, moved.job.refPartnerName], ['u-ann', 'Ann Lowe'], '⚠ Q15: a mis-picked partner is corrected');
    const toFamily = editAndSave(LIVING, { 'ec-src': 'Family', 'ec-referredby': 'Joan Butler' });
    eq([toFamily.job.src, toFamily.job.refPartnerId, toFamily.job.refPartnerName, toFamily.job.referredByName],
       ['Family', '', '', 'Joan Butler'], '⚠ M16: a partner whose picker the new source hides is not saved');
    const blank = editAndSave(LIVING, { 'ec-src': '' });
    eq(blank.job.src, 'Estate attorney', 'the referral source is required: blanking it is refused');
    has(blank.said.alert, 'Referral source', 'by name');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ M16 — a partner is keyed by uid; a re-sorted sheet re-points nothing');
  {
    const R = sandbox({ fns: ['referralIdOf', 'lookupReferralById', 'jobRefersToPartner', 'referralPartnerStats', 'isJobWon'],
      stubs: { referralDirectory: PARTNERS, jobs: [] } });
    eq(R.referralIdOf(PARTNERS[0]), 'u-ann', 'the id is the uid');
    eq(R.referralIdOf({ _row: 12 }), '12', 'a row with no uid yet falls back to its row');
    eq(R.lookupReferralById('u-bob').partner_name, 'Bob Reyes', 'looked up by uid');
    eq(R.lookupReferralById('6').partner_name, 'Bob Reyes', 'and a legacy row id still resolves');
    // The sheet is sorted: Cat now sits on row 5, where Ann was when an old job recorded "5".
    const resorted = { _row: 5, uid: 'u-cat', partner_name: 'Cat Ortiz', partner_type: 'Realtor' };
    const legacy = { id: 1, refPartnerId: '5', refPartnerName: 'Ann Lowe' };
    ok(!R.jobRefersToPartner(legacy, resorted), '⚠⚠ a legacy row id is not credited to whoever the sort moved onto that row');
    ok(R.jobRefersToPartner(legacy, { _row: 5, uid: 'u-ann', partner_name: 'Ann Lowe' }), 'it is still credited to the partner it named');
    ok(R.jobRefersToPartner({ refPartnerId: 'u-ann' }, Object.assign({}, PARTNERS[0], { _row: 99 })), 'a uid follows the partner to any row');
    R.jobs.push({ id: 1, refPartnerId: 'u-ann', status: 'new' }, legacy, { id: 3, refPartnerId: 'u-cat', status: 'new' });
    eq(R.referralPartnerStats(PARTNERS[0]).count, 2, 'the leaderboard counts Ann\'s uid job and her legacy job');
    eq(R.referralPartnerStats(resorted).count, 1, 'and Cat only her own');
    has(noComments(fn('saveQuickPartner')), 'rec.uid = d.uid', 'a partner added from intake carries the uid the backend minted');
    has(noComments(fn('saveReferral')), 'rec.uid = d.uid', 'and one added on the Referral Partners tab');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('M16 / M14 — intake saves the referral the way the form shows it, and the reset leaves nothing behind');
  {
    const R = sandbox({ fns: ['readReferralInputs', 'referralSourceKind', 'lookupReferralById', 'referralIdOf'],
      vars: ['REFERRAL_SOURCES'], stubs: { referralDirectory: PARTNERS,
        document: domStub({ 'i-src': 'Family', 'i-refpartner': 'u-ann', 'i-referredby': 'Joan' }) } });
    eq(R.readReferralInputs('i'), { src: 'Family', refPartnerId: '', refPartnerName: '', referredByName: 'Joan' },
       '⚠ a partner picked, then hidden by a personal source, is not saved');
    has(noComments(fn('saveIntake')), "readReferralInputs('i')", 'saveIntake reads it through the one reader');

    const d = domStub({ 'i-src': 'Estate attorney', 'i-start': '2026-10-05', 'i-phone': '', 'i-doclevel': 'formal' });
    d.getElementById('i-start').min = '2026-09-28';
    d.getElementById('i-completion').min = '2026-10-05';
    d.getElementById('i-doclevel').dataset.preGate = 'formal';
    d.getElementById('i-phone').dataset.stash = '(561) 555-0142';
    d.getElementById('i-refpartner-wrap').style.display = 'block';
    const C = sandbox({ fns: ['resetIntakeFields', 'clearHouseFlagInputs', 'onHouseFlagToggle', '_houseFlagRowClass',
      'onReferralSourceChange', 'referralSourceKind', 'populateReferralPicker', 'referralPartnerOptionsHtml', 'jobRefersToPartner',
      'referralIdOf', 'lookupReferralById', 'paintDateChainFlag', 'dateChainFlagHtml', 'dateChainConflicts', 'paintAddressMatch',
      'jobsAtAddress', 'normStreetAddr', 'esc', 'buildCoFiduciaryBlock', 'coFiduciaryBlockHtml'],
      vars: ['INTAKE_FIELDS', 'INTAKE_FIELD_DEFAULTS', 'HOUSE_FLAGS', 'FIREARMS_PROTOCOL_DOC', 'REFERRAL_SOURCES', '_ADDR_ABBR'],
      stubs: { document: d, referralDirectory: PARTNERS, REFERRAL_SYNC_URL: '', jobs: [], toggleIntakeFields() {} } });
    C.resetIntakeFields();
    eq(d.getElementById('i-doclevel').dataset.preGate, undefined, '⚠ M14: the borrowed documentation level is dropped');
    eq([d.getElementById('i-start').min, d.getElementById('i-completion').min], ['', ''], 'the date minimums are cleared');
    eq(d.getElementById('i-phone').dataset.stash, undefined, 'a phone put aside by an estate switch is dropped');
    eq(d.getElementById('i-refpartner-wrap').style.display, 'none', 'the referral partner block collapses');
    eq(d.getElementById('i-date-flag').style.display, 'none', 'and the date flag');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('intake lows — a service switch puts phone and email aside instead of wiping them; no example placeholders');
  {
    const body = noComments(fn('toggleIntakeFields'));
    has(body, 'ds.stash = el.value', 'the value is put aside on an estate switch');
    has(body, 'if (!el.value && ds.stash) el.value = ds.stash', 'and comes back on switching back');
    lacks(body, '555-0100', 'no example phone at runtime');
    lacks(body, 'client@email.com', 'no example email at runtime');
    lacks(src, "'(561) 000-0000'", "tel()'s example default is gone");
    // Both forms ask one required-field rule.
    has(noComments(fn('saveIntake')), 'clientMissingFields(', 'intake asks the shared rule');
    has(noComments(fn('saveClientEdit')), 'clientMissingFields(', 'and so does Edit Client');
    const M = sandbox({ fns: ['clientMissingFields', 'isDecedentJob'], vars: ['DECEDENT_SERVICES'] });
    eq(M.clientMissingFields(LIVING), [], 'a complete living client is missing nothing');
    eq(M.clientMissingFields(ESTATE), [], 'nor a complete estate (no phone or email asked for the deceased)');
    eq(M.clientMissingFields(Object.assign({}, ESTATE, { executorRole: '', probateCase: '' })),
       ['Authorized rep role', 'Probate case number'], 'what is missing is named');
    // Blanking refused; an old gap named, not made the price of the save.
    const blanked = editAndSave(ESTATE, { 'ec-exec-email': '' });
    eq(blanked.job.executorEmail, 'joan@example.com', '⚠ a save that would clear a required field is refused');
    const old = editAndSave(Object.assign({}, LIVING, { zip: '' }), { 'ec-notes': 'called back' });
    eq(old.job.notes, 'called back', 'a legacy job missing a required field still saves a correction');
    has(old.said.notice, 'Still missing on this client: Zip', 'and the gap is named after the save');
    // The walkthrough asterisk promised a check no save made; the step asks for it later.
    lacks(src.slice(src.indexOf('Walkthrough / site visit date'), src.indexOf('id="i-walkthrough"')), '#A32D2D', 'the walkthrough is not marked required');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('intake lows — the client name is escaped in both headers');
  {
    const r = editAndSave(Object.assign({}, LIVING, { name: 'Maeve <b>O\'Hara</b> & Co', fname: 'Maeve', lname: 'O\'Hara' }));
    has(r.html, 'Maeve &lt;b&gt;', 'the Edit Client header escapes the name');
    const P = sandbox({ fns: ['populateJobSelect', 'esc'], stubs: { document: domStub({}), estimateTabHidesJob: () => false,
      jobs: [{ id: 1, name: 'A <i>B</i>', addr: '1 <x> St, Palm Beach' }] } });
    P.populateJobSelect();
    const h = P.document.getElementById('e-job').innerHTML;
    has(h, 'A &lt;i&gt;B', 'the estimate picker escapes it');
    has(h, '1 &lt;x&gt; St', 'and the address');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ Q16 — an address already on file is named at intake, never refused');
  {
    const A = sandbox({ fns: ['jobsAtAddress', 'normStreetAddr'], vars: ['_ADDR_ABBR'],
      stubs: { jobs: [{ id: 1, name: 'Tripp Butler', addr: '12 Ocean Boulevard, Palm Beach FL', zip: '33480' },
                      { id: 2, name: 'Other', addr: '12 Ocean Blvd', zip: '33401' }] } });
    eq(A.jobsAtAddress('12 ocean blvd.', '33480').map((j) => j.id), [1], 'case, punctuation and the suffix are normalised; the zip must agree');
    eq(A.jobsAtAddress('12 Ocean Blvd, Apt 4', '').map((j) => j.id), [1, 2], 'a unit is dropped, and a blank zip matches either');
    eq(A.jobsAtAddress('14 Ocean Blvd', '33480'), [], 'a different number is a different house');
    eq(A.jobsAtAddress('', ''), [], 'no address, no match');
    lacks(noComments(fn('saveIntake')), 'jobsAtAddress', '⚠ the save never consults it — a warning, not a gate');
    has(src, 'onchange="paintAddressMatch()"', 'the form paints it as the address is entered');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ Q17 — Edit Client on Home Prep: access & security and safety, no must-find; hidden answers are kept');
  {
    const PREP = Object.assign({}, LIVING, { svc: 'prep', mustFind: 'Grandma\'s ring',
      houseFlags: { firearms: { on: true, note: 'Rifle in closet' }, access: { on: true, note: 'Alarm 4411' } } });
    const r = editAndSave(PREP, { 'ec-hfn-access': 'Alarm 9900' });
    has(r.html, 'id="ec-house-find" style="margin-bottom:8px;display:none;', 'the must-find box is hidden on prep');
    has(r.html, 'id="ec-hfr-firearms" style="display:none;"', 'a contents row is hidden');
    lacks(r.html, 'id="ec-hfr-access" style="display:none;"', 'the access row is shown');
    eq(r.job.houseFlags.access.note, 'Alarm 9900', 'the access answer is corrected');
    eq(r.job.houseFlags.firearms, { on: true, note: 'Rifle in closet' }, '⚠ a hidden row keeps what the record holds');
    eq(r.job.mustFind, 'Grandma\'s ring', 'and so does the hidden must-find answer');
    // The case that matters: rows edited while visible, then the service switched to Home Prep before
    // Save. The hidden controls now differ from the record, and the save must not read them.
    const switched = editAndSave(Object.assign({}, PREP, { svc: 'downsizing' }),
      { 'ec-svc': 'prep', 'ec-hf-firearms': false, 'ec-hfn-firearms': '', 'ec-mustfind': 'typed before the switch' });
    eq(switched.job.svc, 'prep', 'the switch to Home Prep saves');
    eq(switched.job.houseFlags.firearms, { on: true, note: 'Rifle in closet' }, '⚠ a row edited and then hidden by the switch keeps the record');
    eq(switched.job.mustFind, 'Grandma\'s ring', '⚠ and so does the must-find box the switch hid');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('P11 — Edit Client stamps only the checklist rows it changed, so the sheet merges them row by row');
  {
    const r = editAndSave(LIVING, { 'ec-hf-firearms': true, 'ec-hfn-firearms': 'Rifle, hall closet' });
    const at = r.job.at || {};
    ok(at['houseFlags:firearms'] > 0, '⚠ the row ticked is stamped');
    eq(Object.keys(at).filter((k) => /^houseFlags:/.test(k)), ['houseFlags:firearms'], '⚠⚠ and no other row claims to be newer');
    const same = editAndSave(LIVING);
    eq(Object.keys(same.job.at || {}).filter((k) => /^houseFlags:/.test(k)), [], 'an untouched save stamps no row at all');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ M15 — the Drive folder landing repaints the client only if they are still on screen');
  {
    const body = noComments(src.slice(src.indexOf('function createDriveJobFolder('), src.indexOf('// The repair door.')));
    ok(body.length > 1500, 'createDriveJobFolder was located');
    lacks(body, 'openClientDashboard(', '⚠ it never navigates');
    eq((body.match(/_driveFolderLanded\(job\.id\)/g) || []).length, 4, 'every terminal arm goes through the one landing');
    const run = (onScreen) => {
      const drawn = [];
      const d = domStub({});
      d.getElementById('client-dashboard-view').style.display = 'block';
      const c = sandbox({ fns: ['_driveFolderLanded', '_asBackgroundRedraw', '_dashRedraw', '_jobBandHost'],
        vars: ['_dashKeepNotice'], stubs: { document: d, _dashboardJobId: onScreen,
          renderClientDashboard: (id) => drawn.push([id, c._dashKeepNotice]) } });
      c._driveFolderLanded(7);
      return drawn;
    };
    eq(run(8), [], '⚠⚠ another client on screen: nothing is drawn, nobody is moved');
    eq(run(7), [[7, true]], 'the same client: repainted, as a background redraw so a notice on screen stays');
  }
};
