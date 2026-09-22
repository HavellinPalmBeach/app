'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// WHAT A CLIENT INTAKE COLLECTS, AND WHAT CAN BE CORRECTED AFTERWARDS (2026-09-22).
//
// Three things audited on the same pass, and they are one subject: intake is a
// CREATE-ONLY form, so every field it collects is either read by something or is
// dead weight, and every field something later REFUSES on has to be correctable
// from Edit Client or the refusal is a dead end.
//
//   ⚠⚠ TWO HARD REFUSALS POINTED AT A FORM THAT CANNOT REACH AN EXISTING CLIENT.
//   `i-home-value` and `i-dest-sqft` were optional at intake and a hard refusal on
//   estimate save — "set the approximate home value in Client Intake for this
//   client, then reopen the estimate" — and neither had a control in Edit Client or
//   anywhere else. `e-propval` is a hidden input inside a display:none block. So a
//   walkthrough on a job that missed either could not be saved at all, and the only
//   way out was to re-create the client.
//
//   ⚠ THREE FIELDS WERE COLLECTED, SAVED AND SYNCED WITH NO READER ANYWHERE.
//   `destZip`, `destBeds`, `destBaths`. The destination prints as address + city
//   (both surfaces hardcode ", FL") and only the square footage reaches the engine.
//
//   ⚠ AND THE JOB PLAN NAMED A CONTROL INTAKE DOES NOT HAVE. The Letters line read
//   "pending — recorded at intake or under Edit Client"; `i-executor-auth` has never
//   existed, so `saveIntake`'s ternary over it always resolved to 'pending'.
//
// The nets here are stated as RULES rather than as today's field names: a key on the
// job record must have a reader, INTAKE_FIELDS and the form must agree in both
// directions, and every conditionally-hidden block in the modal must be named by the
// handler that shows it — which is the defect from 2026-09-10, where switching to
// Contested Probate mid-edit hid four fields the save went on reading.
// ─────────────────────────────────────────────────────────────────────────────

const { sandbox, source, domStub, fn } = require('./harness');

// ⚠ LINE-BASED. A `/\/\*[\s\S]*?\*\//` stripper pairs the `/*` inside every
// `accept="image/*"` with a distant `*/` and eats ~170KB of live code.
const liveLines = (s) => String(s).split('\n')
  .filter((l) => { const t = l.trim(); return !(t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') || t.startsWith('<!--')); })
  .join('\n');

const EC_FNS = ['showEditClient', 'saveClientEdit', 'ecToggleProbate',
                'ecIsProbateSvc', 'ecIsEstateSvc', 'ecIsMoveSvc', 'ecDocGateChange',
                'docTierOptionsHtml', 'docTierOf', 'docTierDef', 'docTierScope',
                'docTierScopeMirror', 'svcHasDocStep', 'esc', 'onDocGateChange',
                'houseFlagInputsHtml', 'houseFlagsOf', '_houseFlagRowClass',
                'docLevelFloor', 'gateDispute', '_gateYes', '_gate706', 'isDecedentJob',
                'docLevelFloorReason', 'resolveDocLevel', 'docStandardEffect',
                'isFormalDoc', 'invAppraisalThreshold', 'matterTypeOf', 'matterDef',
                'invFiduciaryMode', 'readHouseFlagInputs', 'docScopeDef'];
const EC_VARS = ['SVC_LABELS', 'HOUSE_FLAGS', 'FIREARMS_PROTOCOL_DOC', 'DECEDENT_SERVICES',
                 'DOC_TIERS', 'DOC_TIER_FROM_SCOPE', 'JOB_STEPS', 'INV_APPRAISAL_THRESHOLD',
                 'INV_APPRAISAL_THRESHOLD_DISPUTED', 'MATTER_TYPES', 'DOC_SCOPES'];

const MOVE = { id: 7, hvlId: 'HVL-0007', name: 'Tripp Butler', fname: 'Tripp', lname: 'Butler',
               svc: 'downsizing_move', propVal: '3200000', destAddr: '9 Palm Way',
               destCity: 'Boca Raton', destSqft: '1800', sqft: '4500' };

function openModal(job, seed, extraStubs) {
  const d = domStub(Object.assign({ 'ec-svc': job.svc }, seed || {}));
  const c = sandbox({
    fns: EC_FNS, vars: EC_VARS,
    stubs: Object.assign({ document: d, jobs: [JSON.parse(JSON.stringify(job))], estimateStore: {},
                           saveJobs() {}, renderClientDashboard() {}, renderJobs() {} }, extraStubs || {}),
  });
  c.showEditClient(job.id);
  return { d, c, html: d.getElementById('edit-client-modal').innerHTML };
}

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();
  const live = liveLines(src);

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ A FIELD ON THE JOB RECORD HAS A READER, OR IT IS NOT COLLECTED');
  {
    // The rule, not the three names. `destZip` / `destBeds` / `destBaths` were written
    // onto every Home Transition job and synced to the sheet for months, and the only
    // thing that would have caught them is asking whether anything reads them back.
    const save = fn('saveIntake');
    const keys = [...new Set([...save.matchAll(/\b(dest[A-Za-z]+)\s*:/g)].map((m) => m[1]))];
    ok(keys.length > 0, 'saveIntake writes a destination block at all');

    // Both writers are excluded, so what is left is a genuine READ. saveClientEdit is
    // the second writer as of today — it is the whole point of the other half of this file.
    const writers = save + '\n' + fn('saveClientEdit');
    keys.forEach((k) => {
      const re = new RegExp('(?:\\.\\s*' + k + '|\\[[\'"]' + k + '[\'"]\\])(?![A-Za-z0-9_$])', 'g');
      const all = (live.match(re) || []).length;
      const byWriters = (writers.match(re) || []).length;
      ok(all - byWriters > 0, k + ' is read by something other than the forms that write it');
    });

    // The converse — this must not become a cull. All three survivors are load-bearing:
    // destSqft prices move day, destAddr/destCity ARE the printed destination.
    ['destAddr', 'destCity', 'destSqft'].forEach((k) => {
      ok(keys.indexOf(k) >= 0, k + ' is still collected');
    });
    ['destZip', 'destBeds', 'destBaths'].forEach((k) => {
      lacks(live, k, k + ' is gone from the file, not merely unread');
    });
    ['i-dest-zip', 'i-dest-beds', 'i-dest-baths'].forEach((id) => {
      lacks(src, id, id + ' is gone from the markup too — a field nothing collects is still a question somebody asks');
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('the reset sweep and the form agree, in BOTH directions');
  {
    // ⚠ THE LEAK THIS CATCHES IS THE ONE THE LIST'S OWN COMMENT DESCRIBES: the two
    // hand-maintained lists had drifted, and the whole i-dest-* block was missing from
    // the post-save clear — so the NEXT client created in the same session inherited the
    // previous client's destination property, which prices move day. Deleting a field
    // from the markup and leaving it on the list is the same defect wearing the other
    // face: the sweep then names an element that does not exist.
    const m = src.match(/var INTAKE_FIELDS = \[([\s\S]*?)\];/);
    ok(!!m, 'INTAKE_FIELDS is a flat literal list');
    const listed = [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
    const panel = src.slice(src.indexOf('id="panel-intake"'), src.indexOf('id="panel-estimate"'));
    const ctrls = [...new Set([...panel.matchAll(/<(input|select|textarea)\b[^>]*\bid="(i-[\w-]+)"/g)].map((x) => x[2]))];
    ok(ctrls.length > 40, 'the intake panel really was parsed (' + ctrls.length + ' controls)');
    eq(ctrls.filter((i) => listed.indexOf(i) < 0), [],
       'every intake control is on INTAKE_FIELDS — one that is not leaks into the next client');
    eq(listed.filter((i) => ctrls.indexOf(i) < 0), [],
       'and every id on INTAKE_FIELDS is a control the form renders');

    // The one field in that block that still matters is still in it.
    const dest = panel.slice(panel.indexOf('id="downsizing-dest-fields"'));
    const destEnd = dest.slice(0, dest.indexOf('id="panel-'));
    has(destEnd.slice(0, 2000), 'id="i-dest-sqft"', 'the new home sq ft is still asked at intake');
    has(destEnd.slice(0, 2000), 'will not save without', 'and the form says what it costs to leave blank');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ EDIT CLIENT OFFERS BOTH FIELDS THE ESTIMATE REFUSES WITHOUT');
  {
    const t = openModal(MOVE);
    has(t.html, 'id="ec-home-value"', 'the approximate home value is correctable');
    has(t.html, 'value="$3,200,000"', 'prefilled formatted, the way Client Intake shows it');
    has(t.html, 'oninput="formatMoneyInput(this)"', 'and formats as you type, so a reader cannot parseFloat a raw string');
    has(t.html, 'id="ec-dest-sqft"', 'so is the new home sq ft');
    has(t.html, 'id="ec-dest-addr"', 'with the address it belongs beside');
    has(t.html, 'id="ec-dest-city"', 'and the city');
    has(t.html, 'value="1800"', 'the sq ft is prefilled from the job');
    has(t.html, 'value="9 Palm Way"', 'and so is the address');

    // ⚠ NEITHER IS MARKED REQUIRED, because saveClientEdit accepts both blank. Five
    // asterisks over fields a save does not enforce is the defect the attorney block
    // already carried; the hint says what a blank costs instead.
    const lbl = (name) => t.html.slice(t.html.indexOf(name), t.html.indexOf('</div>', t.html.indexOf(name)));
    lacks(lbl('Approx. Home Value'), '#A32D2D', 'the home value carries no required mark the save does not enforce');
    lacks(lbl('New Home Sq Ft'), '#A32D2D', 'nor does the new home sq ft');
    has(lbl('Approx. Home Value'), 'will not save without', 'it says what a blank costs instead');
    has(lbl('New Home Sq Ft'), 'will not save without', 'and so does the sq ft');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('the destination block follows the service type, on open AND mid-edit');
  {
    has(openModal(MOVE).html, 'id="ec-dest-fields" style="display:block;"',
        'a Home Transition opens with the destination showing');
    has(openModal(Object.assign({}, MOVE, { svc: 'cleanout' })).html, 'id="ec-dest-fields" style="display:none;"',
        'an estate job does not — there is nowhere for the contents to go');

    // ⚠⚠ THE DEFECT THIS IS HERE FOR (2026-09-10): ecToggleProbate tested plain `probate`
    // for one block and omitted contested_probate from the other, so changing the service
    // mid-edit hid four fields the save went on reading out of the hidden div. A block the
    // render knows about and the handler does not is that bug with a new name.
    const t = openModal(Object.assign({}, MOVE, { svc: 'downsizing' }));
    eq(t.d.getElementById('ec-dest-fields').style.display, undefined,
       'the handler has not run yet — this reads the render, not a leftover');
    t.d.getElementById('ec-svc').value = 'downsizing_move';
    t.c.ecToggleProbate();
    eq(t.d.getElementById('ec-dest-fields').style.display, 'block',
       'switching to Home Transition mid-edit reveals the block the save reads');
    t.d.getElementById('ec-svc').value = 'cleanout';
    t.c.ecToggleProbate();
    eq(t.d.getElementById('ec-dest-fields').style.display, 'none', 'and switching away hides it again');

    // The NET, so the next conditional block cannot be added and quietly left out.
    const render = fn('showEditClient');
    const toggle = fn('ecToggleProbate');
    const blocks = [...new Set([...render.matchAll(/id="(ec-[\w-]*fields)"/g)].map((m) => m[1]))];
    ok(blocks.length >= 3, 'the modal has conditionally-hidden blocks to check (' + blocks.length + ')');
    blocks.forEach((id) => has(toggle, id, id + ' is shown and hidden by the mid-edit handler'));

    // One predicate, read by both, so they cannot come to disagree about which service it is.
    has(render, 'ecIsMoveSvc(job.svc)', 'the render asks the shared predicate');
    has(toggle, 'ecIsMoveSvc(svcVal)', 'and so does the handler');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ THE SAVE WRITES THEM, AND THE APPROVAL LOCK HOLDS ONLY THE ONE THAT PRICES');
  {
    const save = (job, seed, store) => {
      const d = domStub(Object.assign({ 'ec-svc': job.svc, 'ec-fname': 'Tripp', 'ec-lname': 'Butler',
                                        'ec-sqft': job.sqft || '', 'ec-premium': 'no' }, seed || {}));
      const alerts = [];
      const c = sandbox({
        fns: EC_FNS, vars: EC_VARS,
        stubs: { document: d, jobs: [JSON.parse(JSON.stringify(job))], estimateStore: store || {},
                 saveJobs() {}, renderClientDashboard() {}, renderJobs() {},
                 alert: (m) => alerts.push(m) },
      });
      c.saveClientEdit(job.id);
      return { job: c.jobs[0], alerts, d };
    };

    const w = save(MOVE, { 'ec-home-value': '$4,750,000', 'ec-dest-addr': '11 Ocean Ln',
                           'ec-dest-city': 'Delray Beach', 'ec-dest-sqft': '2400' });
    eq(w.job.propVal, '4750000', 'the home value is stored digits-only, as Client Intake stores it');
    eq(w.job.destAddr, '11 Ocean Ln', 'the destination address is written');
    eq(w.job.destCity, 'Delray Beach', 'and the city');
    eq(w.job.destSqft, '2400', 'and the sq ft the engine prices move day from');
    eq(w.alerts.length, 0, 'an unapproved estimate accepts all four without complaint');

    const cleared = save(MOVE, { 'ec-home-value': '', 'ec-dest-sqft': '' });
    eq(cleared.job.propVal, '', 'a cleared home value really clears — a stale figure would price the band wrong');

    // ⚠⚠ THE SPLIT IS WHICH OF THEM REACHES THE ENGINE. destSqft sizes move day directly
    // (destTC = 8 + sqft*0.002, destPS = sqft*0.009), so moving it after approval
    // desynchronises the job from a number the client accepted — the same failure sqft is
    // held for. propVal books no hours at all: propValMultiplier scales the internal
    // reference band on Build Estimate and the RE-commission readout, and nothing else.
    // Holding it would put the one field the estimate refuses on behind the approval that
    // cannot happen until the estimate saves.
    const locked = save(MOVE, { 'ec-home-value': '$9,000,000', 'ec-dest-sqft': '2400' },
                        { 7: { approved: true } });
    eq(locked.job.propVal, '9000000', 'the home value is still correctable on an approved estimate');
    eq(locked.job.destSqft, '1800', 'the new home sq ft is not — it is a priced input');
    ok(locked.alerts.some((a) => a.indexOf('New home sq ft') >= 0),
       'and the refusal names it rather than dropping the edit in silence');
    ok(locked.alerts.every((a) => a.indexOf('home value') < 0),
       'while saying nothing about the home value, which was saved');

    const lockedQuiet = save(MOVE, { 'ec-home-value': '$9,000,000', 'ec-dest-sqft': '1800' },
                             { 7: { approved: true } });
    eq(lockedQuiet.alerts.length, 0, 'an approved job whose sq ft is unchanged is not nagged about it');

    // ⚠ saveJobs() fills updatedAt only when MISSING — deliberately, so it never bumps a job
    // this device did not touch. Without the pairing an Edit Client correction on a job that
    // already has one can lose the newest-wins merge to another device's untouched copy.
    has(fn('saveClientEdit'), 'syncJobToSheets(job)',
        'the save bumps the record clock, so the correction survives a merge');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ THE CORRECTION REACHES THE ESTIMATE THAT REFUSED, OR THE FIX IS A RELOAD');
  {
    // Both refusals promise the walkthrough on screen is kept. It is — but `e-propval` is
    // seeded ONCE by loadJobIntoEstimate, so without this push the only way to pick the
    // corrected value up is to re-select the job on Build Estimate, which runs
    // neutralizeEstimateView and drops every room just scored.
    const run = (eJob) => {
      const d = domStub({ 'ec-svc': 'downsizing_move', 'ec-fname': 'Tripp', 'ec-lname': 'Butler',
                          'ec-home-value': '$5,500,000', 'ec-sqft': '4500', 'ec-premium': 'no',
                          'e-job': eJob });
      let recalcs = 0;
      const c = sandbox({
        fns: EC_FNS, vars: EC_VARS,
        stubs: { document: d, jobs: [JSON.parse(JSON.stringify(MOVE))], estimateStore: {},
                 saveJobs() {}, renderClientDashboard() {}, renderJobs() {},
                 calcAll() { recalcs++; } },
      });
      c.saveClientEdit(7);
      return { propval: d.getElementById('e-propval').value, recalcs };
    };
    const same = run('7');
    eq(same.propval, '5500000', 'the estimate holding this job picks the corrected value up in place');
    eq(same.recalcs, 1, 'and reprices once, so the refusal clears on the next Save');

    // ⚠ AND IT MUST NOT REACH ANOTHER CLIENT'S ESTIMATE. Writing e-propval blind would put
    // this job's property value onto whichever estimate happened to be open — the wrong-job
    // hazard this file records on every global the estimator reads.
    const other = run('8');
    eq(other.propval, '', 'an estimate open on a DIFFERENT client is not touched');
    eq(other.recalcs, 0, 'and is not repriced');

    // Ordering: a throw in the pricing tree must not leave the record half-written.
    const body = fn('saveClientEdit');
    ok(body.indexOf('saveJobs();') < body.indexOf("getElementById('e-job')"),
       'the job is saved before anything reaches into the estimator');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('the refusals send you somewhere that can actually fix it');
  {
    const est = fn('saveEstimateAndPreview');
    has(est, 'Property value is required', 'the property-value refusal still fires');
    has(est, 'New home sq ft is required', 'so does the new home sq ft one');
    // ⚠ CLIENT INTAKE ONLY CREATES NEW CLIENTS. Naming it is what made both of these dead
    // ends: there is no route back into that form for a job that already exists.
    lacks(est, 'in Client Intake for this client', 'neither sends you to a form that cannot reach an existing client');
    ['Property value is required', 'New home sq ft is required'].forEach((lead) => {
      const line = est.slice(est.indexOf(lead), est.indexOf('\n', est.indexOf(lead)));
      has(line, 'Edit Client', lead + ' — names the control that fixes it');
      has(line, 'walkthrough on this screen is kept', lead + ' — and says the scoring is not lost');
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ LETTERS ARE RECORDED IN ONE PLACE, AND THE JOB PLAN NAMES THAT PLACE');
  {
    // `i-executor-auth` has never existed. saveIntake's ternary over it always resolved to
    // 'pending', so every estate job was born pending — correctly — while the derived line
    // told the reader it had been "recorded at intake", sending them to a control that is
    // not on the form.
    lacks(live, 'i-executor-auth', 'saveIntake no longer reads a control the intake form does not render');
    has(fn('saveIntake'), "executorAuth: 'pending'", 'a new job is born pending, stated rather than derived from a missing element');
    has(fn('showEditClient'), 'id="ec-exec-auth"', 'Edit Client is where it is recorded');
    has(fn('saveClientEdit'), "job.executorAuth     = document.getElementById('ec-exec-auth').value",
        'and Edit Client is what writes it');

    const d = sandbox({
      fns: ['planDerivedLines', 'planTaskCtx', 'invFiduciaryMode', 'isDecedentJob', '_planRooms',
            'roomStatusNormalize', 'firearmsFlaggedAtIntake', 'houseFlagsOf', '_jobInvRefs',
            '_srcLineKey', 'matterTypeOf', 'matterDef', 'docTierOf', 'docTierDef',
            'docTierProduces', 'svcHasDocStep'],
      vars: ['DECEDENT_SERVICES', 'jobPlanStore', 'TC_DONE_STATUSES', 'PS_DONE_STATUSES',
             'ROOM_STATUS_META', 'ROOM_STATUS_LEGACY', 'INV_RELEASE_DISPOSITIONS',
             'FIREARMS_PROTOCOL_DOC', 'HOUSE_FLAGS', 'changeOrders', 'MATTER_TYPES',
             'DOC_TIERS', 'DOC_TIER_FROM_SCOPE', 'JOB_STEPS'],
      stubs: { isFormalDoc: () => false, docSentAt: () => null, jobLogEntries: () => [],
               stagePaidTotal: () => 0, _photoRefs: { 7: [] },
               isAgreementSigned: () => false, isJobFunded: () => false, depositPaidTotal: () => 0 },
    });
    const letters = (auth) => d.planDerivedLines(7, { id: 7, svc: 'probate', executorAuth: auth },
      { svc: 'probate', rooms: [{ idx: 0, name: 'Kitchen' }] }, 'p0')
      .filter((l) => l.key === 'letters')[0];

    const pending = letters('pending');
    ok(!!pending, 'a probate job carries the Letters line');
    eq(pending.ok, false, 'pending reads open');
    has(pending.detail, 'Edit Client', 'and names the one form that can record it');
    lacks(pending.detail, 'at intake', 'never intake, which has no control for it');
    has(pending.detail, 'cannot activate', 'and says what it is holding up');
    eq(letters('received').ok, true, 'received reads green');
    eq(letters('notneeded').detail, 'not required on this matter', 'and a matter with no Letters says so');
  }
};
