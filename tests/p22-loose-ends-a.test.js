'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// P22 · GROUP A (2026-10-05): twelve items off CLAUDE.md's "Known, not fixed", each driven through the real code.
//
//   A1  The activation chips' fix is printed under the chip row, not only in a hover tooltip an iPad cannot reach.
//   A2  outstandingPayments stops watching a midpoint or final link once that stage is paid (stripeStagePaid).
//   A3  The payment recorder's "Already recorded at this stage" list reads a migrated deposit as "amount inferred", never
//       "· —".
//   A4  Manager approval asks estimateTierMoved (estimateApprovalTierBlocker, before the PIN and in checkPin); Edit
//       Client holds the pricing inputs while the estimate is out for approval.
//   A5  Edit Client's text controls escape the whole value, and a numeric value renders.
//   A6  The tier note names the client record, not intake; the Referral Partners blurb names Edit Client; jobSchedule's
//       `endVariance` is `workedDays`, which is what it held.
//   A7  The hours log has a readiness state (_logsState): the walkaway settlement is unknown until it has loaded.
//   A8  A Home Prep record's declutter hours print as billed (estDeclutterHrs reads the snapshot's totTC); the box's
//       40-hour cap is said on screen.
//   A9  The internal hours breakdown adds up: parts under half an hour are summed as "other".
//   A10 A Probate service off the probate track is not asked the court record (courtRecordShown / courtRecordRequired);
//       a service switched on Edit Client reaches an open Build Estimate (followJobService); fmtCEDate never prints
//       "Invalid Date"; Build Estimate's Probate flag has a field-mode copy beside the picker.
//   A11 The representative is never their own co-representative (coFiduciaryRepClash / coFiduciaryRepRefusal).
//   A12 Co-representatives pick from their own role catalogue (CO_FIDUCIARY_ROLES); a nameless entry is named on the
//       client card, where Edit Client draws it.
// ─────────────────────────────────────────────────────────────────────────────

const { sandbox, source, fn, decl, domStub, driveCalcAll } = require('./harness');

const SRC = source();
const ALL_FNS = new Set((SRC.match(/(^|\n)function\s+([A-Za-z0-9_$]+)\s*\(/g) || []).map((s) => s.replace(/^\n?function\s+/, '').replace(/\s*\($/, '')));
const ALL_VARS = new Set((SRC.match(/(^|\n)var\s+([A-Za-z0-9_$]+)\s*=/g) || []).map((s) => s.replace(/^\n?var\s+/, '').replace(/\s*=$/, '')));
const codeOnly = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).map((l) => l.replace(/\s\/\/\s.*$/, '')).join('\n')
  .replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, "''");
const noComments = (t) => String(t).split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
function closure(roots, stop) {
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
  return { fns: [...fns], vars: [...vars] };
}
function lift(roots, stop, stubs) {
  const c = closure(roots, (stop || []).concat(Object.keys(stubs || {})));
  return sandbox({ fns: c.fns, vars: c.vars, stubs: stubs || {} });
}
const inEastern = (body) => { const prev = process.env.TZ; process.env.TZ = 'America/New_York'; try { return body(); } finally { process.env.TZ = prev; } };
const text = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&middot;/g, '·').replace(/&#9888;/g, '⚠')
  .replace(/&mdash;/g, '—').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&nbsp;/g, ' ').replace(/&times;/g, '×').replace(/\s+/g, ' ').trim();
const unesc = (s) => String(s).replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
// The functions in the app whose live code calls `name(`.
const readers = (name) => [...ALL_FNS].filter((f) => { try { return f !== name && noComments(fn(f)).includes(name + '('); } catch (e) { return false; } }).sort();
const NOW = Date.parse('2026-10-05T15:00:00Z');
const FixedDate = (t) => class extends Date { constructor(...a) { if (a.length) super(...a); else super(t); } static now() { return t; } };
const T0 = Date.parse('2026-09-28T15:00:00Z');

// A trust-only estate (P19's fixture): its activation is held on the Certification of Trust, the agreement and the deposit.
const TRUST = (o) => Object.assign({
  id: 7, hvlId: 'HVL-0007', name: 'Walter Adler', fname: 'Walter', lname: 'Adler', svc: 'cleanout', status: 'won', won: true, approved: true,
  addr: '69 Beach Blvd', city: 'Palm Beach', zip: '33480', sqft: '4200', ptype: 'Estate', src: 'Family', start: '2026-10-19',
  tc: 'Ashley Jerome', agrApprovedBy: 'Anthony Graziano',
  matterType: 'trust', docTier: 'values', deathDate: '2026-02-10', gate706: 'yes', executorAuth: 'pending',
  executor: 'Rex Hale', executorFname: 'Rex', executorLname: 'Hale', executorRole: 'Trustee', executorEmail: 'rex@hale.example', executorPhone: '(561) 555-0101',
  probateAttyName: 'Ann Lowe', probateAttyFirm: 'Lowe & Co', probateAttyEmail: 'ann@lowe.law', probateAttyPhone: '(561) 555-0102',
  trustName: 'The Adler Family Revocable Trust', trustDate: '2019-04-02', trusteeAcceptedOn: '2026-03-01', probateSale: 'yes',
  coFiduciaries: [{ id: 'cf1', name: 'Daniel Adler', role: 'Co-Trustee', phone: '(561) 555-0103', email: 'dan@adler.example' }],
  docState: {}, at: {}, updatedAt: T0, payments: [],
}, o || {});
const EST = () => ({ approved: true, estimate: { jobId: 7, svc: 'cleanout', havellinTotal: 24000, days: 6,
  rooms: [{ idx: 1, name: 'Study', st: 'in', vol: 3, cplx: 3 }], vendors: [] } });

module.exports = function ({ group, ok, eq, has, lacks }) {
  const G = (name, body) => group(name, () => {
    try { body(); } catch (e) { ok(false, 'threw: ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e)); }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  let dashRig = null;
  const renderDash = (job, est) => {
    if (!dashRig) {
      const dom = domStub({});
      const c = lift(['renderClientDashboard'], ['esignRefresh', 'stripeRefresh', 'maybeStartJobsWatch', 'refreshPhotoRefs'], {
        document: dom, setTimeout: () => 0, clearTimeout() {}, Intl: global.Intl, Date: FixedDate(NOW),
        jobs: [], changeOrders: [], contractors: [], _photoRefs: {}, jobLogs: {}, SHEETS_SYNC_URL: 'https://script.google.com/macros/s/P22A/exec',
        jobPlanStore: {}, estimateStore: { 7: EST() }, maybeStartJobsWatch() {}, esignRefresh() {}, stripeRefresh() {}, refreshPhotoRefs() {} });
      dashRig = { c, dom };
    }
    dashRig.c.jobs.length = 0;
    dashRig.c.jobs.push(JSON.parse(JSON.stringify(job)));
    dashRig.c.renderClientDashboard(job.id);
    return dashRig.dom.getElementById('client-dashboard-view').innerHTML;
  };
  const chipFixes = (html) => { const m = /<div class="dash-chip-fixes">([\s\S]*?)<\/div><\/div>/.exec(html); return m ? m[1].split('</div>').map(text).filter(Boolean) : []; };

  G('A1 · every activation chip\'s fix is printed under the row, in the chip\'s own words', () => {
    const h = renderDash(TRUST());
    const chips = [...h.matchAll(/<span class="badge"[^>]*title="([^"]*)">&#9888; ([^<]*)<\/span>/g)].map((m) => [unesc(m[2]), unesc(m[1])]);
    eq(chips.map((c) => c[0]), ['Agreement not signed', 'Deposit not received', 'Certification of Trust pending'], 'fixture: three chips, each with a tooltip');
    eq(chipFixes(h), chips.map((c) => '⚠ ' + c[0] + ': ' + c[1]), '⚠⚠ each chip\'s fix is printed, one line each, the tooltip\'s words');
    has(h, 'Certification of Trust pending:</strong> Contact Rex Hale — (561) 555-0101', 'whom to chase, on screen');
    eq(chipFixes(renderDash(TRUST({ status: 'active' }))), [], 'an active job has no chips and no fixes');
    eq(chipFixes(renderDash(TRUST({ status: 'lost' }))), [], 'nor a job that died');
    has(SRC, '.dash-chip-fixes{', 'the block has its rule in the one stylesheet');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  G('A2 · a paid midpoint or final link drops off the watch; an unpaid or unpriceable one stays', () => {
    const job = (pays, o) => Object.assign({ id: 3, hvlId: 'HVL-0003', name: 'Tripp Butler', svc: 'downsizing', status: 'active',
      docState: { 'invoice:midpoint': { stripe: { linkId: 'plink_mid', url: 'https://buy.stripe.com/x', amount: 2500 } } },
      payments: pays }, o || {});
    const DEP = { id: 1, uid: 'u1', stage: 'deposit', amount: 5000, method: 'wire', receivedOn: '2026-09-01', clearedOn: '2026-09-01' };
    const est = { approved: true, estimate: { jobId: 3, svc: 'downsizing', havellinTotal: 10000, tcFee: 6000, psFee: 4000, totTC: 40, totPS: 40, tcRate: 150, psRate: 100 } };
    const rig = (j, store) => lift(['outstandingPayments'], [], { jobs: [j], estimateStore: store, Date: FixedDate(NOW), jobLogs: {}, changeOrders: [], document: domStub({}) });
    const keys = (c) => c.outstandingPayments().map((e) => e.key);
    eq(keys(rig(job([DEP]), { 3: est })), ['invoice:midpoint'], 'nothing in at the midpoint: watched');
    const MID = { id: 2, uid: 'u2', stage: 'midpoint', amount: 2500, method: 'stripe_ach', receivedOn: '2026-10-01', clearedOn: '2026-10-01', stripePiId: 'pi_1' };
    eq(keys(rig(job([DEP, MID]), { 3: est })), [], '⚠⚠ the midpoint paid in full: the link is no longer checked on every arrival');
    eq(keys(rig(job([DEP, Object.assign({}, MID, { amount: 1000 })]), { 3: est })), ['invoice:midpoint'], 'part paid: still watched');
    eq(keys(rig(job([DEP, MID]), {})), ['invoice:midpoint'], 'no estimate on this device: never stops on a guess');
    const HAND = { id: 3, uid: 'u3', stage: 'midpoint', amount: 2500, method: 'stripe_ach', receivedOn: '2026-10-01' };
    eq(keys(rig(job([DEP, HAND]), { 3: est })), ['invoice:midpoint'], 'paid by a transfer recorded by hand, still awaiting Stripe: watched, as the deposit is');
    const S = rig(job([DEP, MID]), { 3: est });
    eq([S.stripeStagePaid(job([DEP, MID]), 'midpoint'), S.stripeStagePaid(job([DEP]), 'midpoint'), S.stripeStagePaid(job([DEP]), 'deposit')], [true, false, true], 'stripeStagePaid: the one answer');
    eq(readers('stripeStagePaid'), ['outstandingPayments'], 'read by the watch');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  G('A3 · the recorder lists a migrated deposit as "amount inferred", never "· —"', () => {
    const job = { id: 4, name: 'Old Client', svc: 'downsizing', depositReceived: true, depositReceivedAt: '2026-08-01', docState: {} };
    const d = domStub({});
    const c = lift(['onDepStageChange'], ['updateDepModalHints'], { document: d, jobs: [job], estimateStore: { 4: { approved: true, estimate: { jobId: 4, havellinTotal: 8000 } } },
      _agrJob: () => job, currentDepStage: () => 'deposit', updateDepModalHints() {} });
    c.onDepStageChange();
    const prior = text(d.getElementById('dep-prior').innerHTML);
    has(prior, '$4,000 · 2026-08-01 uncleared · amount inferred — predates payment records', '⚠ the method it does not have is left out, and the inference named');
    lacks(prior, '· —', 'no "· —" for a method nobody recorded');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  G('A4 · approval refuses an estimate priced before the tier moved; Edit Client holds pricing inputs while it is out for approval', () => {
    const job = { id: 5, hvlId: 'HVL-0005', name: 'Ruth Adler', svc: 'cleanout', docTier: 'values', matterType: 'trust', deathDate: '2026-02-01', status: 'pending' };
    const est = { jobId: 5, svc: 'cleanout', docScope: 'capture', docTier: 'contents', havellinTotal: 18000, rooms: [{ name: 'Study', st: 'in', vol: 3, cplx: 3 }] };
    const said = {};
    const c = lift(['dashApproveEstimate', 'checkPin'], ['buildLockSnapshot', 'saveEstimateState', 'applyEstimateLock', 'renderClientEstimate',
      'closePinModal', 'notifyTCOfDecision', 'exportEstimateToDrive', 'saveFolderEstimate', '_dashRedraw', 'priceRaiseSentence'], {
      document: domStub({ 'pin-input': '1234' }), jobs: [job], estimateStore: { 5: { estimate: est, submitted: true } }, currentEstimate: null,
      _primeEstimateFor: (id) => { c.currentEstimate = JSON.parse(JSON.stringify(est)); return true; },
      openPinModal: () => { said.pin = true; }, dashNotice: (t, m) => { said.notice = m; }, _dashRedraw() {}, resolvePin: () => 'Anthony Graziano',
      buildLockSnapshot() {}, saveEstimateState: () => { said.saved = true; }, applyEstimateLock() {}, renderClientEstimate() {}, closePinModal() {},
      notifyTCOfDecision() {}, exportEstimateToDrive() {}, saveFolderEstimate() {}, priceRaiseSentence: () => '',
      setTimeout: () => 0, saveJobs() {}, syncJobToSheets() {} });
    const WHY = 'the documentation tier on this client changed to Inventory with values after this estimate was saved, and it is still priced at Capture only. '
      + 'Deny it: it reopens for editing, follows the new tier on Build Estimate, and is saved and submitted again.';
    eq(c.estimateApprovalTierBlocker(est, job), WHY, 'the rule, in the words Submit uses for the same fact');
    c.dashApproveEstimate(5);
    eq([!!said.pin, said.notice], [false, 'Cannot approve — ' + WHY], '⚠⚠ said before anybody types a PIN, and the PIN pad never opens');
    c.currentEstimate = JSON.parse(JSON.stringify(est));
    c.checkPin();
    has(c.document.getElementById('pin-fb').innerHTML, 'Cannot approve — the documentation tier on this client changed', '⚠⚠ and checkPin, which writes the approval, refuses it');
    eq([!!said.saved, c.estimateApproved === true, job.approved === true], [false, false, false], 'nothing was approved or saved');
    eq(c.estimateApprovalTierBlocker(Object.assign({}, est, { docScope: 'full', docTier: 'values' }), job), '', 'priced at the tier on the record: no refusal');
    eq(readers('estimateApprovalTierBlocker'), ['checkPin', 'dashApproveEstimate'], 'asked before the PIN and where the approval is written');
    // 4b — the lock, through the real save.
    const body = noComments(fn('saveClientEdit'));
    has(body, '|| job.depositReceived || _outForAppr)', '⚠⚠ the hold covers an estimate out for approval');
    has(body, 'var _outForAppr = estimateOutForApproval(job, _rec);', 'asked through the one rule');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Edit Client, opened and saved through the real modal (edit-client-intake-rules.test.js's rig, closure-lifted).
  const unescAll = unesc;
  function formFromHtml(html) {
    const out = {};
    (html.match(/<input\b[^>]*>/g) || []).forEach((t) => {
      const id = /\bid="([^"]+)"/.exec(t); if (!id) return;
      if (/type="checkbox"/.test(t)) { out[id[1]] = / checked\b/.test(t); return; }
      const v = /\bvalue="([^"]*)"/.exec(t); out[id[1]] = v ? unescAll(v[1]) : '';
    });
    (html.match(/<textarea\b[^>]*>[\s\S]*?<\/textarea>/g) || []).forEach((t) => {
      const id = /\bid="([^"]+)"/.exec(t); if (!id) return;
      out[id[1]] = unescAll(t.replace(/^<textarea\b[^>]*>/, '').replace(/<\/textarea>$/, ''));
    });
    (html.match(/<select\b[^>]*>[\s\S]*?<\/select>/g) || []).forEach((t) => {
      const id = /\bid="([^"]+)"/.exec(t); if (!id) return;
      const opts = t.match(/<option\b[^>]*>/g) || [];
      const sel = opts.find((o) => / selected\b/.test(o)) || opts[0] || '';
      const v = /\bvalue="([^"]*)"/.exec(sel); out[id[1]] = v ? unescAll(v[1]) : '';
    });
    return out;
  }
  const EC_STOP = ['renderClientDashboard', 'renderJobs', 'saveJobs', 'syncJobToSheets', 'dashNotice', 'calcAll', 'svcTypeChanged', 'paintEstimateService'];
  function openEc(job, store) {
    const probe = domStub({});
    const r = lift(['showEditClient', 'saveClientEdit'], EC_STOP, { document: probe, jobs: [JSON.parse(JSON.stringify(job))], estimateStore: store || {}, contractors: [],
      referralDirectory: [], REFERRAL_SYNC_URL: '', saveJobs() {}, syncJobToSheets() {}, renderClientDashboard() {}, renderJobs() {}, dashNotice() {},
      calcAll() {}, svcTypeChanged() {}, paintEstimateService() {}, alert() {}, setTimeout: () => 0 });
    r.showEditClient(job.id);
    return { html: probe.getElementById('edit-client-modal').innerHTML, dom: probe };
  }
  function editAndSave(job, edits, store) {
    const said = {};
    const { html } = openEc(job, store);
    const form = Object.assign(formFromHtml(html), edits || {});
    const rendered = new Set((html.match(/\bid="([^"]+)"/g) || []).map((m) => m.slice(4, -1)));
    const d = domStub(JSON.parse(JSON.stringify(form)));
    const mint = d.getElementById.bind(d);
    d.getElementById = (id) => (/^ec-/.test(id) && !rendered.has(id) && !(id in (edits || {}))) ? null : mint(id);
    (html.match(/<[a-z]+\b[^>]*\bid="[^"]+"[^>]*>/g) || []).forEach((t) => {
      const id = /\bid="([^"]+)"/.exec(t)[1];
      let m; const re = /\bdata-([a-z-]+)="([^"]*)"/g;
      while ((m = re.exec(t))) mint(id).dataset[m[1].replace(/-([a-z])/g, (_, ch) => ch.toUpperCase())] = unesc(m[2]);
    });
    // A row the person added: its data-* as the browser would hold them after + Add a co-representative.
    Object.keys(edits || {}).forEach((id) => { const v = edits[id]; if (v && typeof v === 'object' && v.dataset) Object.assign(mint(id).dataset, v.dataset); });
    const c = lift(['saveClientEdit'], EC_STOP, { document: d, jobs: [JSON.parse(JSON.stringify(job))], estimateStore: store || {}, contractors: [],
      referralDirectory: [], REFERRAL_SYNC_URL: '', saveJobs() {}, syncJobToSheets() {}, renderClientDashboard() {}, renderJobs() {},
      dashNotice: (t, m) => { said.notice = m; }, alert: (m) => { said.alert = (said.alert || '') + m; },
      calcAll: () => { said.calc = (said.calc || 0) + 1; }, svcTypeChanged: () => { said.svcChanged = true; },
      paintEstimateService: (svc) => { said.painted = svc; }, setTimeout: () => 0, Date: FixedDate(NOW) });
    c.saveClientEdit(job.id);
    return { html, form, job: c.jobs[0], said, c, d };
  }
  const LIVING = { id: 8, hvlId: 'HVL-0008', name: 'Tripp Butler', fname: 'Tripp', lname: 'Butler', svc: 'downsizing', phone: '(561) 555-0142',
    email: 'tripp@example.com', addr: '12 Ocean Blvd', city: 'Palm Beach', zip: '33480', sqft: '4500', ptype: 'Single Family Home', src: 'Family',
    referredByName: 'Joan', start: '2026-10-15', tc: '', yearsInHome: '22', priority: 'normal', re: 'unknown', premium: false, status: 'new' };

  G('A4b · Edit Client keeps the sq ft and the service while the estimate is out for approval, and says why', () => {
    const store = { 8: { estimate: { jobId: 8, svc: 'downsizing', havellinTotal: 12000 }, submitted: true } };
    const r = editAndSave(LIVING, { 'ec-sqft': '6000', 'ec-svc': 'downsizing_move' }, store);
    eq([r.job.sqft, r.job.svc], ['4500', 'downsizing'], '⚠⚠ out for approval: the pricing inputs keep the figure in front of the manager');
    has(r.said.alert || '', 'Service type and Approx. sqft cannot be changed on this job.', 'named');
    has(r.said.alert || '', 'The estimate is out for manager approval, so these feed the price a manager is deciding on', 'in the words of the state it is in');
    has(r.said.alert || '', 'It opens for editing again once a manager approves it or denies it.', 'and the route is the one estimateRepriceRoute gives');
    const free = editAndSave(LIVING, { 'ec-sqft': '6000' }, { 8: { estimate: { jobId: 8, svc: 'downsizing', havellinTotal: 12000 } } });
    eq([free.job.sqft, free.said.alert || ''], ['6000', ''], 'a draft: the sq ft moves, nothing said');
  });

  G('A5 · Edit Client escapes every text value and renders a number', () => {
    const job = Object.assign({}, LIVING, { sqft: 4500, addr: 'Smith & Sons "Annex" <b>2</b>', yearsInHome: 22 });
    let html = '';
    try { html = openEc(job, {}).html; } catch (e) { ok(false, '⚠⚠ Edit Client threw on a numeric sq ft: ' + e.message); }
    const f = formFromHtml(html);
    eq([f['ec-sqft'], f['ec-addr']], ['4500', 'Smith & Sons "Annex" <b>2</b>'], '⚠⚠ a number renders, and an ampersand and markup are shown as typed');
    has(html, 'value="Smith &amp; Sons &quot;Annex&quot; &lt;b&gt;2&lt;/b&gt;"', 'escaped whole');
    has(html, 'it is held once the estimate goes for approval; the save says how to reprice it.', 'the new home\'s sq ft hint names when it is held, and the route');
    const r = editAndSave(Object.assign({}, LIVING, { addr: 'Smith &amp; Sons' }), {});
    eq(r.job.addr, 'Smith &amp; Sons', 'an untouched save writes back exactly what the record held (it lost the "amp;")');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  G('A6 · the tier note names the client record; the referral blurb names Edit Client; workedDays is what it holds', () => {
    const c = lift(['_docScopeIntakeNote'], [], {});
    eq(c._docScopeIntakeNote({ svc: 'cleanout', docTier: 'contents' }, 'full'),
      'The client record’s documentation tier is Contents list; this estimate is priced at Full.', '⚠ never "Intake recorded" over a tier Edit Client set');
    lacks(noComments(fn('_docScopeIntakeNote')), "'Intake recorded", 'the old words are gone from live code');
    has(SRC, 'Link a partner to a job at intake or on Edit Client so referrals are tracked.', 'the blurb names both places a partner is linked');
    lacks(SRC, 'Link a partner to a job at intake so referrals', 'and not intake alone');
    const S = lift(['jobSchedule'], [], {});
    const done = inEastern(() => S.jobSchedule({ id: 1, svc: 'downsizing', status: 'closed', activatedOn: '2026-09-01', deliveredOn: '2026-09-03', start: '2026-09-01' },
      { days: 6 }, '2026-09-10'));
    eq([done.workedDays, 'endVariance' in done], [3, false], '⚠ the working days the job took, under a name that says so');
    lacks(noComments(SRC), 'endVariance', 'no reader of the old name survives');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  G('A7 · the walkaway settlement waits for the hours log', () => {
    const job = { id: 6, name: 'Gone Client', svc: 'downsizing', status: 'closed_retained', docState: {},
      payments: [{ id: 1, uid: 'p1', stage: 'deposit', amount: 6000, method: 'wire', receivedOn: '2026-09-01', clearedOn: '2026-09-01' }] };
    const store = { 6: { approved: true, estimate: { jobId: 6, svc: 'downsizing', havellinTotal: 12000, tcRate: 150, psRate: 100 } } };
    const c = lift(['walkawaySettlement', 'refundBlocker', 'loadLogData'], [], { jobs: [job], estimateStore: store, jobLogs: {}, changeOrders: [], Date: FixedDate(NOW),
      document: domStub({}), SHEETS_SYNC_URL: '', localStorage: { getItem: () => null, setItem() {} } });
    eq(c._logsState, 'loading', 'fixture: a device that has just booted');
    const s = c.walkawaySettlement(job);
    eq([s.basis, s.wait, s.due], ['unknown', 'its hours log', 0], '⚠⚠ an unread log is not zero hours: no figure, no refund due');
    eq(c.refundBlocker(job, s), 'What this job earned cannot be worked out on this device yet: its hours log has not loaded. Reload, then try again.', 'and the refund says what it waits on');
    eq(c.walkawaySettlement(Object.assign({}, job, { id: 99 })).wait, 'its estimate', 'with no estimate it waits on the estimate, as before');
    c._logsState = 'offline';
    eq(c.walkawaySettlement(job).basis, 'unknown', 'a log that could not be read is not the log either');
    c._logsState = 'ready';
    eq(c.walkawaySettlement(job).basis, 'hourly', 'loaded: the settlement is worked out');
    // The load sets it: a sync URL whose answer carries the log, one whose answer does not, and none at all.
    const thenable = (v, fail) => ({ then(f, r) { if (fail) return r ? thenable(r(v)) : thenable(v, true); try { return thenable(f(v)); } catch (e) { return thenable(e, true); } }, catch(r) { return fail ? thenable(r(v)) : this; } });
    const run = (url, answer, fail) => {
      const L = lift(['loadLogData'], ['_logsLanded'], { SHEETS_SYNC_URL: url, localStorage: { getItem: () => null, setItem() {} }, _logsLanded: () => { L.landed = true; },
        fetch: () => (fail ? thenable(new Error('offline'), true) : thenable({ json: () => answer })) });
      L.loadLogData();
      return [L._logsState, !!L.landed];
    };
    eq(run('https://x/exec', { logs: { 6: [] } }), ['ready', true], 'the sheet answered with the log: ready, and the screen repainted');
    eq(run('https://x/exec', { error: 'Unknown type' }), ['offline', true], 'an answer with no log: offline');
    eq(run('https://x/exec', null, true), ['offline', true], 'no answer: offline');
    eq(run('', null), ['ready', false], 'no sync URL: the local cache is all there is');
    has(noComments(fn('refreshPlanAndLogFromCloud')), "_logsState = 'ready';", 'a later refresh that brings the log marks it ready too');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  G('A8 · a Home Prep record prints the declutter hours it billed; the box says its cap', () => {
    const c = lift(['estDeclutterHrs', 'declutterHoursFlag'], [], { document: domStub({ 'e-declutter-hrs': '45' }) });
    eq(c.estDeclutterHrs({ svc: 'prep', declutterTCHrs: 5.5, totTC: 6 }), 6, '⚠⚠ pre-P17: 5.5 typed, 6 billed — the billed hours');
    eq(c.estDeclutterHrs({ svc: 'prep', declutterTCHrs: 5.25, totTC: 5.25 }), 5.25, 'a P17 record billed the quarter, and prints it');
    eq(c.estDeclutterHrs({ svc: 'prep', declutterTCHrs: 6 }), 6, 'no totTC: the field as saved');
    eq(c.estDeclutterHrs({ svc: 'prep', declutterTCHrs: 0, totTC: 6 }), 0, 'no declutter hours: none, whatever else is billed');
    eq(c.declutterHoursFlag(), 'The declutter box takes at most 40 hours: 45 is priced as 40.', '⚠ above the cap, the hint says so');
    has(SRC, '<input type="number" id="e-declutter-hrs" min="0" max="' + c.DECLUTTER_MAX_HRS + '"', 'the box\'s own max is the cap');
    has(SRC, 'whole hours, at most ' + c.DECLUTTER_MAX_HRS + ':', 'and its label says it');
    // The page the client reads, from a record saved before P17.
    const P = lift(['buildPrepEstimateBody'], [], { jobs: [], estimateStore: {}, document: domStub({}) });
    let body = '';
    try { body = text(P.buildPrepEstimateBody({ svc: 'prep', declutterTCHrs: 5.5, totTC: 6, tcRate: 150, prepFee: 900, havellinTotal: 1800, prepItems: [] },
      { id: 1, name: 'Ann Prep', svc: 'prep' })); } catch (e) { ok(false, 'buildPrepEstimateBody threw: ' + e.message); }
    has(body, '6.0 hrs × $150/hr) $900', '⚠⚠ the declutter row reads what the total billed');
    lacks(body, '5.5 hrs', 'never the part hour');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  G('A9 · the internal breakdown adds up: small parts are summed as "other"', () => {
    const c = lift(['_hoursPartsLine', '_scaleHoursParts'], [], {});
    const parts = c._scaleHoursParts([{ label: 'Pack', hrs: 20 }, { label: 'Triage', hrs: 0.3 }, { label: 'Haul', hrs: 0.2 }, { label: 'Doc', hrs: 4 }], 24.5);
    const line = c._hoursPartsLine(parts);
    eq(line, 'Pack 20.0 &middot; Doc 4.0 &middot; other 0.5', '⚠ the parts under half an hour are named as other, not dropped');
    const sum = line.split(' &middot; ').reduce((a, p) => a + parseFloat(p.split(' ').pop()), 0);
    eq(Math.round(sum * 10) / 10, 24.5, 'and the line adds up to the billed figure');
    eq(c._hoursPartsLine([{ label: 'A', hrs: 2 }]), 'A 2.0', 'nothing small: no "other"');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  G('A10a · a Probate service off the probate track is not asked the court record', () => {
    const c = lift(['clientMissingFields', 'courtRecordShown', 'courtRecordRequired'], [], {});
    const base = { fname: 'A', lname: 'B', addr: 'x', city: 'y', zip: '1', sqft: '1', ptype: 'Estate', src: 'Family', start: '2026-11-01',
      executorFname: 'R', executorLname: 'H', executorRole: 'Trustee', executorPhone: '1', executorEmail: 'e', deathDate: '2026-01-01' };
    const court = ['Probate case number', 'Attorney first name', 'Attorney last name', 'Attorney firm', 'Attorney phone', 'Attorney email'];
    const asks = (svc, matterType) => c.clientMissingFields(Object.assign({}, base, { svc, matterType })).filter((m) => court.indexOf(m) >= 0);
    eq(asks('probate', 'trust'), [], '⚠⚠ Probate on a trust: no case number, no attorney of record required');
    eq(asks('probate', 'neither'), [], 'nor on Neither');
    eq(asks('contested_probate', 'trust'), [], 'nor Contested Probate on a trust');
    eq(asks('probate', 'probate'), court, 'on the probate track, all six, as before');
    eq(asks('probate', 'both'), court, 'Both is on the track');
    eq(asks('probate', ''), court, 'an unanswered matter on a Probate service is on the track (it is then refused for the matter too)');
    eq(asks('cleanout', 'probate'), [], 'an Estate Settlement is offered the attorney, never required to give one');
    eq([c.courtRecordShown('probate', 'trust'), c.courtRecordShown('probate', ''), c.courtRecordShown('cleanout', 'both')], [false, true, true], 'shown on the track only');
    // Edit Client, as rendered, on a Probate service whose matter is a trust.
    const PRO = Object.assign({}, TRUST(), { id: 9, svc: 'probate', probateCase: '', status: 'new', approved: false, coFiduciaries: [] });
    const { html } = openEc(PRO, {});
    has(html, 'id="ec-probate-fields" style="display:none;"', '⚠ the court record is not drawn open');
    has(html, '(if there is one — many estate settlements never open probate)', 'and the attorney is offered, not required');
    lacks(html, 'class="ec-req-probate" style="color:#A32D2D;">', 'no required mark is shown on the attorney');
    const r = editAndSave(PRO, {});
    lacks(r.said.notice || '', 'Probate case number', 'the save does not name a missing case number');
    eq(readers('courtRecordRequired').filter((f) => ['clientMissingFields', 'ecToggleProbate', 'showEditClient', 'toggleIntakeFields'].indexOf(f) >= 0),
      ['clientMissingFields', 'ecToggleProbate', 'showEditClient', 'toggleIntakeFields'], 'one rule: the save and both forms\' marks');
  });

  G('A10b · a service switched on Edit Client reaches the Build Estimate open on that client', () => {
    const job = { id: 11, name: 'Estate', svc: 'cleanout', matterType: 'trust' };
    const d = domStub({ 'e-job': '11', 'e-svc': 'probate' });
    const said = {};
    const c = lift(['followJobService'], ['svcTypeChanged'], { document: d, jobs: [job], estimateStore: { 11: { estimate: { svc: 'probate' } } },
      svcTypeChanged: () => { said.repriced = (said.repriced || 0) + 1; } });
    eq(c.followJobService(job), true, 'it moved');
    eq([d.getElementById('e-svc').value, said.repriced], ['cleanout', 1], '⚠⚠ the picker reads the job\'s service and the build is repriced');
    has(d.getElementById('e-svc-note').innerHTML, 'Priced as Probate Estate Settlement; the job is now Estate Settlement', 'and the note names what the saved copy was priced as');
    eq(c.followJobService(job), false, 'a second call has nothing to do');
    d.getElementById('e-job').value = '12';
    d.getElementById('e-svc').value = 'probate';
    eq([c.followJobService(job), d.getElementById('e-svc').value], [false, 'probate'], 'a build bound to another client is left alone');
    eq(readers('followJobService'), ['openEstimateScreen', 'saveClientEdit'], 'asked when the screen resumes and when Edit Client saves');
    // Through the real save: the build open on this client follows the switch.
    const ESTATE = Object.assign({}, TRUST(), { id: 13, svc: 'probate', status: 'new', approved: false, coFiduciaries: [], probateCase: '' });
    const r = editAndSave(ESTATE, { 'ec-svc': 'cleanout', 'e-job': '13', 'e-svc': 'probate' }, {});
    eq([r.job.svc, r.said.painted, !!r.said.svcChanged], ['cleanout', 'cleanout', true], '⚠⚠ Edit Client\'s save repaints and reprices the open build');
  });

  G('A10c · fmtCEDate never prints "Invalid Date"', () => {
    const c = lift(['fmtCEDate'], [], {});
    inEastern(() => {
      eq(c.fmtCEDate('2015-03-03'), 'March 3, 2015', 'an ISO day, month spelled out');
      eq(c.fmtCEDate('March 3, 2015'), 'March 3, 2015', '⚠ anything else is printed as given');
      eq(c.fmtCEDate('garbage'), 'garbage', 'never "Invalid Date"');
      eq(c.fmtCEDate(''), '—', 'blank stays a dash');
    });
  });

  G('A10d · Build Estimate\'s Probate flag has a field-mode copy beside the picker', () => {
    const r = inEastern(() => driveCalcAll({ svc: 'probate', sqft: 3500, rooms: ['Living Room', 'Kitchen'], job: { svc: 'probate', matterType: 'trust', docTier: 'values' } }));
    const desk = r.doc.getElementById('e-svc-flag').innerHTML, field = r.doc.getElementById('e-svc-flag-field').innerHTML;
    ok(/No court on this matter/.test(text(desk)), 'fixture: the desk slot carries the flag');
    eq(field, desk, '⚠⚠ the field-mode slot carries the same flag');
    const markup = SRC.slice(SRC.indexOf('<body>'), SRC.indexOf('<script>', SRC.indexOf('<body>')));
    ok(markup.indexOf('id="e-svc-flag-field"') > markup.indexOf('id="e-svc-note"') && markup.indexOf('id="e-svc-flag-field"') < markup.indexOf('id="est-summary-col"'),
      'beside the service picker, outside the column field mode hides');
    has(SRC, 'body:not(.field-mode) #e-svc-flag-field{display:none!important;}', 'and shown in field mode only, so a desk reads it once');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  G('A11 · the representative is never their own co-representative', () => {
    const c = lift(['jobFiduciaries', 'coFiduciaryRepRefusal', 'saveCoFiduciaryRows'], [], { Date: FixedDate(NOW), saveJobs() {}, syncJobToSheets() {}, jobs: [] });
    const job = TRUST({ coFiduciaries: [{ id: 'cf1', name: 'Daniel Adler', role: 'Co-Trustee' }, { id: 'cf2', name: 'rex hale', role: 'Co-Trustee' }] });
    eq(c.jobFiduciaries(job).map((f) => f.name), ['Rex Hale', 'Daniel Adler'], '⚠⚠ one person, one fiduciary: the entry naming the representative is not a second signer');
    eq(c.coFiduciaryRepRefusal([{ name: 'Rex Hale' }], 'Rex Hale'),
      'Rex Hale is the representative on this estate, so cannot also be a co-representative: take that row off with ✕ Remove.', 'named');
    eq(c.coFiduciaryRepRefusal([{ name: 'Daniel Adler' }], 'Rex Hale'), '', 'anyone else: nothing');
    const j2 = TRUST({ coFiduciaries: [] });
    c.saveCoFiduciaryRows(j2, { rows: [{ name: 'Rex Hale', role: 'Co-Trustee', phone: '', email: '' }, { name: 'Daniel Adler', role: '', phone: '', email: '' }], removed: [] });
    eq((j2.coFiduciaries || []).map((x) => x.name), ['Daniel Adler'], 'the writer never records the representative as a co-representative');
    // Edit Client: a row added naming the representative is refused, by name, and nothing is saved.
    const ESTATE = TRUST({ id: 14, coFiduciaries: [], status: 'new', approved: false });
    const r = editAndSave(ESTATE, { 'ec-cofid-rows': { dataset: { rows: '0', next: '1', removed: '' } }, 'ec-cofid-0': { dataset: {} },
      'ec-cofid-0-name': 'Rex Hale', 'ec-cofid-0-role': 'Co-Trustee', 'ec-cofid-0-phone': '', 'ec-cofid-0-email': '', 'ec-addr': '70 Beach Blvd' });
    has(r.said.alert || '', 'Rex Hale is the representative on this estate, so cannot also be a co-representative', '⚠⚠ Edit Client refuses it by name');
    eq([r.job.addr, (r.job.coFiduciaries || []).length], ['69 Beach Blvd', 0], 'and nothing is saved');
    eq(readers('coFiduciaryRepRefusal').filter((f) => f === 'saveIntake' || f === 'saveClientEdit'), ['saveClientEdit', 'saveIntake'], 'both saves ask it');
    const D = renderDash(TRUST({ coFiduciaries: [{ id: 'cf2', name: 'Rex Hale', role: 'Co-Trustee' }] }));
    has(text(D), 'Rex Hale is the representative on this estate, so cannot also be a co-representative: take that row off on Edit Client.', 'one already on the record is named on the client card');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  G('A12 · co-representatives have their own role catalogue; a nameless one is named on the card', () => {
    const c = lift(['coFiduciaryRoleOptionsHtml', '_coFidRowHtml'], [], {});
    const vals = (h) => (h.match(/<option value="([^"]*)"/g) || []).map((o) => /value="([^"]*)"/.exec(o)[1]);
    eq(vals(c.coFiduciaryRoleOptionsHtml('')), ['', 'Co-Personal Representative', 'Co-Trustee', 'Other'], '⚠⚠ fiduciary roles only: no Estate Attorney, no Family Member');
    has(c.coFiduciaryRoleOptionsHtml('Trustee'), '<option value="Trustee" selected>Trustee (as recorded)</option>', 'a value recorded before is kept, as recorded');
    has(c.coFiduciaryRoleOptionsHtml('Co-Trustee'), '<option value="Co-Trustee" selected>Co-Trustee</option>', 'a catalogue value is selected');
    has(c._coFidRowHtml('ec', 0, { id: 'cf1', name: 'Dan', role: 'Co-Trustee' }), '<option value="Co-Personal Representative">', 'the row draws the catalogue');
    eq(readers('coFiduciaryRoleOptionsHtml'), ['_coFidRowHtml'], 'read by the one row builder');
    lacks(noComments(fn('_coFidRowHtml')), 'executorRoleOptionsHtml(', 'and not the representative\'s list');
    const D = text(renderDash(TRUST({ coFiduciaries: [{ id: 'cf1', name: 'Daniel Adler', role: 'Co-Trustee' }, { id: 'cf9', name: '', role: 'Co-Trustee', email: 'x@y.z' }] })));
    has(D, 'Daniel Adler · Co-Trustee 1 recorded with no name: name it or take it off on Edit Client.', '⚠⚠ the card names the entry Edit Client draws');
    const ec = openEc(TRUST({ id: 15, coFiduciaries: [{ id: 'cf9', name: '', role: 'Co-Trustee', email: 'x@y.z' }] }), {}).html;
    has(ec, 'id="ec-cofid-0" data-id="cf9"', 'and Edit Client draws it, to be named or taken off');
  });
};
