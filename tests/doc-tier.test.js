'use strict';
// WHAT THE CLIENT IS CONTRACTED TO RECEIVE — the engagement tier (2026-09-21).
//
// Step 3 of ESTATE_SCOPE_SPEC.md. The website promises "as little or as much of the inventory
// work as required" and the app had three PRICING settings and no contract term: `docScope`
// answers *how much of the work do we do*, never *what are we contracted to hand over*.
// Anthony: "we have to know if we are doing a full documentation with valuation and that should
// be captured somewhere, probably at intake, certainly before we offer an estimate of cost."
//
// The tier is what the client is told they will receive; `docScope` is its pricing projection,
// derived from it and mirrored onto the job so nothing downstream had to be repointed.

const { sandbox, domStub, source } = require('./harness');

// The engine lists, lifted verbatim from tests/doc-scope.test.js — the point of this group
// is that the tier changes NO pricing, so it has to drive the same engine that suite does.
const ENGINE_FNS = ['computeEngineV3', 'effectiveJobSteps', 'docScopeDef', 'svcHasDocStep',
  'estimateDocScope', 'tenureMultiplier', 'engineRoomWeight', 'engineIsExterior', 'roomDefault'];
const ENGINE_VARS = ['EST_TOLERANCE_PCT', 'JOB_STEPS', 'DOC_SCOPES', 'DOC_CAPTURE_POOL_SHARE', 'ENGINE_CAREFUL',
  'ENGINE_ROOMLEVEL', 'PERROOM_REF', 'ENGINE_FLOOR', 'ENGINE_K', 'ENGINE_VOLF', 'ENGINE_CPXF',
  'ROOM_WEIGHT', 'EXTERIOR_ROOMS', 'ROOM_DEFAULTS'];

const T_FNS  = ['docTierDef', 'docTierOf', 'docTierScope', 'docTierScopeMirror', 'svcHasDocStep', 'seedDocScopeFromJob',
                'docScopeDef', '_docScopeIntakeNote'];
const T_VARS = ['DOC_TIERS', 'DOC_TIER_FROM_SCOPE', 'JOB_STEPS', 'DOC_SCOPES'];

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();
  const c = sandbox({ fns: T_FNS, vars: T_VARS });
  const j = (o) => Object.assign({ svc: 'cleanout' }, o);

  group('four tiers, and what each one projects onto');
  {
    const keys = c.DOC_TIERS.map((t) => t.key);
    eq(keys.join(','), 'contents,values,appraisals,none', 'in the order a client reads them: least to most, then none');
    c.DOC_TIERS.forEach((t) => {
      ok(t.label.length > 20, t.key + ' carries a label the client can read');
      ok(t.we.length > 20, t.key + ' says what WE produce');
      ok(t.they.length > 10, t.key + ' says what THEY produce — the half that makes it a contract term');
      ok(['capture', 'full', 'none'].indexOf(t.scope) >= 0, t.key + ' projects onto a real pricing scope');
    });
    eq(c.docTierScope('contents'), 'capture', 'a contents list prices as capture');
    eq(c.docTierScope('values'), 'full', 'values as full');
    eq(c.docTierScope('appraisals'), 'full', 'and appraisals as full too');
    eq(c.docTierScope('none'), 'none', 'none as none');
    // ⚠ FOUR ONTO THREE IS DELIBERATE. The top two price the same today, because appraiser
    // coordination already sits inside the document step's coordination column. What they do
    // not share is the documentation STANDARD.
    eq(c.docTierDef('values').scope, c.docTierDef('appraisals').scope,
       'the top two price identically today — appraiser coordination is already inside the document step');
    eq(c.docTierDef('appraisals').floor, 'formal', 'and are told apart by the documentation floor, not the price');
    ['contents', 'values', 'none'].forEach((k) => {
      eq(c.docTierDef(k).floor, '', k + ' raises no floor');
    });
    // An unanswered tier still prices, exactly as an unanswered scope always did.
    eq(c.docTierScope(''), 'full', 'an unanswered tier prices at full — the estimate still shows a number');
    eq(c.docTierScope('bogus'), 'full', 'and so does a value that is not one of the four');
  }

  group('a job recorded before the tier existed is migrated on READ, not by a sweep');
  {
    eq(c.docTierOf(j({ docScope: 'full' })), 'values', 'full migrates to Inventory with values');
    eq(c.docTierOf(j({ docScope: 'capture' })), 'contents', 'capture to Contents list');
    eq(c.docTierOf(j({ docScope: 'none' })), 'none', 'none to None');
    // ⚠⚠ NOT TO `appraisals`. The top tier raises the documentation floor, so mapping every
    // existing job onto it would put all of them into Strict Mode — a behaviour change nobody
    // asked for, arriving silently, on jobs already priced and papered.
    ok(c.docTierOf(j({ docScope: 'full' })) !== 'appraisals',
       'and never to the top tier, which would put every existing job into Strict Mode');
    eq(c.docTierOf(j({ docTier: 'appraisals', docScope: 'full' })), 'appraisals',
       'a stored tier wins over the mirrored scope');
    eq(c.docTierOf(j({ docTier: 'bogus', docScope: 'capture' })), 'contents',
       'and an unrecognised tier falls back to the scope rather than resolving to garbage');
    eq(c.docTierOf(j({})), '', 'a job with neither answers nothing');
    eq(c.docTierOf(null), '', 'and so does no job at all');

    // ⚠ KEYED ON svcHasDocStep — the tier is a documentation deliverable, so it exists only on
    // a service that prices documentation. A downsizing has nothing to hand over.
    ['downsizing', 'downsizing_move', 'home_cleanout', 'prep'].forEach((svc) => {
      eq(c.docTierOf({ svc: svc, docTier: 'values' }), '',
         svc + ' prices no documentation step, so it has no tier whatever the record holds');
    });
    ['cleanout', 'probate', 'contested_probate'].forEach((svc) => {
      eq(c.docTierOf({ svc: svc, docTier: 'contents' }), 'contents', svc + ' does');
    });

    // The migration is a READ. A write sweep needs a writer, a version gate and every device to
    // run it; this fixes them all on the next paint with nothing to run.
    const body = src.slice(src.indexOf('function docTierOf('));
    const fn = body.slice(0, body.indexOf('\nfunction docTierScope'));
    lacks(fn, 'saveJobs', 'reading a legacy job never writes to it');
    lacks(fn, 'syncJobToSheets', 'nor pushes it up the sync');

    // And the seed reads the tier, so every existing job opens exactly where it used to.
    eq(c.seedDocScopeFromJob(j({ docScope: 'capture' })), 'capture', 'a legacy job seeds where it always did');
    eq(c.seedDocScopeFromJob(j({ docTier: 'contents' })), 'capture', 'and a tiered one seeds off the tier');
  }

  group('pricing is untouched — the whole point of deriving rather than replacing');
  {
    const e = sandbox({
      fns: ENGINE_FNS.concat(['docTierScope', 'docTierScopeMirror', 'docTierDef']),
      vars: ENGINE_VARS.concat(['DOC_TIERS']),
    });
    const rooms = [{ name: 'Kitchen', vol: 3, cplx: 3 }, { name: 'Primary Bedroom', vol: 3, cplx: 3 }];
    const run = (scope) => e.computeEngineV3(3500, rooms, 'cleanout', 2, 10, scope);
    const byTier = (tier) => run(e.docTierScope(tier));
    // The tier's projection produces the SAME figures the scope did — so no reference band, no
    // saved estimate and no invoice moves because the question was reworded.
    ['contents', 'values', 'none'].forEach((t) => {
      const a = byTier(t), b = run({ contents: 'capture', values: 'full', none: 'none' }[t]);
      eq(JSON.stringify(a.byStep), JSON.stringify(b.byStep), t + ' prices exactly as its scope always did');
    });
    // And the two `full` tiers really are the same number today.
    eq(JSON.stringify(byTier('values').byStep), JSON.stringify(byTier('appraisals').byStep),
       'values and appraisals price identically — they differ in standard, not in hours');
    // ⚠ `byStep.document` is an OBJECT {tc, ps}, not a pair — an index read is `undefined`
    // on both sides and the comparison then passes on any build. Measured: full is
    // {tc:5.6826, ps:38.745}, capture {tc:0, ps:19.3725}, and None has no entry at all.
    ok(byTier('values').byStep.document.ps > byTier('contents').byStep.document.ps,
       'and a contents list really does price less documentation than a valued inventory');
    eq(byTier('contents').byStep.document.tc, 0,
       'capture is half the pool and NONE of the coordination — counsel schedules the appraiser');
    ok(!byTier('none').byStep.document, 'while None prices no documentation step at all');
  }

  group('the top tier raises the documentation floor, and says why');
  {
    const g = sandbox({
      fns: ['docLevelFloor', 'docLevelFloorReason', 'resolveDocLevel', 'gateDispute', '_gateYes',
            '_gate706', 'isDecedentJob', 'invAppraisalThreshold', 'docTierOf', 'docTierDef',
            'docTierScope', 'docTierScopeMirror', 'svcHasDocStep'],
      vars: ['DECEDENT_SERVICES', 'INV_APPRAISAL_THRESHOLD', 'INV_APPRAISAL_THRESHOLD_DISPUTED',
             'DOC_TIERS', 'DOC_TIER_FROM_SCOPE', 'JOB_STEPS'],
    });
    const clear = (o) => Object.assign({ svc: 'cleanout', gate706: 'no' }, o);   // gates say standard
    eq(g.docLevelFloor(clear({})), 'standard', 'with the gates answered and no tier, the floor is standard');
    eq(g.docLevelFloor(clear({ docTier: 'values' })), 'standard', 'a valued inventory does not raise it');
    eq(g.docLevelFloor(clear({ docTier: 'contents' })), 'standard', 'nor a contents list');
    eq(g.docLevelFloor(clear({ docTier: 'none' })), 'standard', 'nor None');
    // ⚠ IT IS NOT A DECORATION. Strict Mode turns the appraisal guardrail from an amber nudge
    // into a red block and holds the Court Inventory at DRAFT until every flagged item is
    // appraised or waived — which is precisely the machinery this tier is named after.
    eq(g.docLevelFloor(clear({ docTier: 'appraisals' })), 'formal',
       'the tier that sells appraisals turns on the machinery that enforces them');
    has(g.docLevelFloorReason(clear({ docTier: 'appraisals' })), 'Inventory + appraisals',
        'and the reason names the tier, so the disabled dropdown is never unexplained');

    // Escalate-only is unbroken: it raises a floor and can never lower one.
    eq(g.docLevelFloor({ svc: 'contested_probate', docTier: 'contents' }), 'formal',
       'a contested matter stays formal at the lightest tier');
    eq(g.docLevelFloor({ svc: 'cleanout', gate706: 'yes', docTier: 'contents' }), 'formal',
       'and so does a 706 estate');
    // ⚠ AND THE TIER IS LAST IN THE REASON CHAIN. The three above it are facts about the matter;
    // this one is a contractual choice, and the reader wants the fact they cannot change.
    has(g.docLevelFloorReason({ svc: 'cleanout', gate706: 'yes', docTier: 'appraisals' }), 'Form 706',
        'when both apply the reader is told the fact, not the choice');
    // A legacy `full` job must NOT land on the top tier and acquire a floor it never had.
    eq(g.docLevelFloor(clear({ docScope: 'full' })), 'standard',
       'a job recorded before the tier existed keeps the floor it had');
  }

  group('the readout sees the tier, on both forms');
  {
    const run = (seed, pfx) => {
      const d = domStub(seed);
      const x = sandbox({
        fns: ['onDocGateChange', 'docLevelFloor', 'docLevelFloorReason', 'resolveDocLevel',
              'gateDispute', '_gateYes', '_gate706', 'isDecedentJob', 'invAppraisalThreshold',
              'isFormalDoc', 'docStandardEffect', 'docTierOf', 'docTierDef',
              'docTierScope', 'docTierScopeMirror', 'svcHasDocStep', 'esc'],
        vars: ['DECEDENT_SERVICES', 'INV_APPRAISAL_THRESHOLD', 'INV_APPRAISAL_THRESHOLD_DISPUTED',
               'DOC_TIERS',
               'DOC_TIER_FROM_SCOPE', 'JOB_STEPS'],
        stubs: { document: d },
      });
      x.onDocGateChange(pfx);
      return { html: d.getElementById((pfx || 'i') + '-gate-readout').innerHTML,
               disabled: d.getElementById((pfx || 'i') + '-doclevel').disabled };
    };
    const plain = run({ 'i-svc': 'cleanout', 'i-gate-706': 'no' });
    lacks(plain.html, 'Strict Mode', 'a settled estate on an ordinary tier is not in Strict Mode');
    eq(plain.disabled, false, 'and its documentation level is freely settable');

    const top = run({ 'i-svc': 'cleanout', 'i-gate-706': 'no', 'i-doc-tier': 'appraisals' });
    has(top.html, 'Strict Mode', 'picking the top tier puts the estate into Strict Mode');
    has(top.html, 'Inventory + appraisals', 'and the readout says which answer did it');
    eq(top.disabled, true, 'the dropdown disables itself rather than pretending it can be lowered');

    // Edit Client reads its own prefix, so correcting the tier there repaints the same way.
    const ec = run({ 'ec-svc': 'cleanout', 'ec-gate-706': 'no', 'ec-doc-tier': 'appraisals' }, 'ec');
    has(ec.html, 'Inventory + appraisals', 'and the same is true on the Edit Client form');
  }

  group('the menu is actually FILLED, and Edit Client writes through the tier');
  {
    // ⚠⚠ THE THREE CHECKS HERE ARE THE THREE REVERTS THAT CAME BACK GREEN ON THE FIRST SWEEP,
    // and all three are the same gap: every check above drove a PIECE and nothing drove the JOIN.
    // The intake markup is an EMPTY <select> on purpose, so a build that stops filling it renders
    // the one question this whole step exists to ask as a blank box with nothing in it — and the
    // catalogue, the builder and the markup all still look right on their own.
    const EC_FNS = ['showEditClient', 'saveClientEdit', 'ecIsProbateSvc', 'ecIsEstateSvc', 'ecIsMoveSvc',
      'ecDocGateChange', 'docTierOptionsHtml', 'buildDocTierOptions', 'docTierOf', 'docTierDef',
      'docTierScope', 'docTierScopeMirror', 'svcHasDocStep', 'esc', 'onDocGateChange', 'houseFlagInputsHtml',
      'houseFlagsOf', '_houseFlagRowClass', 'docLevelFloor', 'gateDispute', '_gateYes', '_gate706',
      'isDecedentJob', 'docLevelFloorReason', 'resolveDocLevel', 'docStandardEffect',
      'isFormalDoc', 'invAppraisalThreshold', 'matterTypeOf', 'matterDef',
      'invFiduciaryMode', 'readHouseFlagInputs', 'docScopeDef'];
    const EC_VARS = ['SVC_LABELS', 'HOUSE_FLAGS', 'FIREARMS_PROTOCOL_DOC', 'DECEDENT_SERVICES',
      'DOC_TIERS', 'DOC_TIER_FROM_SCOPE', 'JOB_STEPS', 'INV_APPRAISAL_THRESHOLD',
      'INV_APPRAISAL_THRESHOLD_DISPUTED', 'MATTER_TYPES', 'DOC_SCOPES'];
    const JOB = { id: 7, hvlId: 'HVL-0007', name: 'Tripp Butler', fname: 'Tripp', lname: 'Butler',
                  svc: 'cleanout', deathDate: '2026-08-14', gate706: 'no', matterType: 'trust',
                  docScope: 'capture' };
    const mk = (seed) => {
      const d = domStub(seed);
      return { d, c: sandbox({ fns: EC_FNS, vars: EC_VARS, stubs: { document: d,
        jobs: [JSON.parse(JSON.stringify(JOB))], estimateStore: {},
        saveJobs() {}, renderClientDashboard() {}, renderJobs() {} } }) };
    };

    // 1. The load-time fill. The markup ships the select EMPTY (pinned below), so this call is
    //    the only thing standing between the form and a question nobody can answer.
    const { d: d1, c: c1 } = mk({});
    c1.buildDocTierOptions();
    const menu = d1.getElementById('i-doc-tier').innerHTML;
    c1.DOC_TIERS.forEach((t) => has(menu, 'value="' + t.key + '"', 'the intake menu really carries ' + t.key));
    has(menu, 'value=""', 'and a blank, because the tier has no default');
    eq(menu.split('<option').length - 1, c1.DOC_TIERS.length + 1, 'four tiers and one blank, nothing else');
    // ⚠ The wiring is the half a driven call cannot see: fill the select from a function
    // nothing runs and the menu is empty on the real page while every check above passes.
    const init = src.slice(src.lastIndexOf('populateIntakeTCDropdown();'));
    has(init.split('\n').filter((l) => l.trim().indexOf('//') !== 0).join('\n'), 'buildDocTierOptions();',
        'and it is called at load, beside the other menu builders');

    // 2. Edit Client repaints the readout when the tier is corrected there. Without this the
    //    documentation level stays enabled against a Formal floor, so somebody sets it to
    //    Standard and resolveDocLevel silently overrides them with nothing on screen saying so.
    const { d: d2, c: c2 } = mk({ 'ec-svc': 'cleanout', 'ec-gate-706': 'no' });
    c2.showEditClient(7);
    const html = d2.getElementById('edit-client-modal').innerHTML;
    has(html, 'id="ec-doc-tier" onchange="ecDocGateChange()"', 'the tier select repaints the readout on change');
    has(html, '<option value="contents" selected>', 'and is prefilled through the migration — a legacy capture job reads Contents list');

    // 3. The save writes the TIER and mirrors the scope off it. Setting the scope independently
    //    is what lets the deliverable the agreement promises drift from the work the estimate priced.
    const write = (v) => {
      const { c } = mk({ 'ec-svc': 'cleanout', 'ec-fname': 'Tripp', 'ec-lname': 'Butler',
                         'ec-date-of-death': '2026-08-14', 'ec-matter-type': 'trust',
                         'ec-doc-tier': v });
      c.saveClientEdit(7);
      return [c.jobs[0].docTier, c.jobs[0].docScope].join('/');
    };
    eq(write('appraisals'), 'appraisals/full', 'a real answer is saved and the scope mirrors it');
    eq(write('contents'), 'contents/capture', 'and follows the tier onto capture');
    eq(write('none'), 'none/none', 'and onto none');
    // ⚠⚠ THE CONVERSE OF THE OLD ASSERTION, AND IT IS THE STEP-8 FIX. A blank used to store
    // `docScope:'full'`, which `docTierOf` migrated straight back to `values` — so clearing the
    // tier on Edit Client silently re-answered it. The MIRROR is blank; the PRICING fallback is
    // untouched and still reads full (the group below drives that), which is what the estimate's
    // notice warns about. Two different questions, and conflating them is what hid the defect.
    eq(write(''), '/', 'a blank clears the tier AND the mirror — it never re-answers itself as full');
    eq(write('bogus'), '/', 'and a value that is not one of the four is discarded, not stored');
    eq(c.docTierScope(''), 'full', 'while PRICING an unanswered job still reads full, unchanged');
    eq(c.estimateDocScope ? c.docTierScope('bogus') : 'full', 'full', 'as does an unrecognised one');
  }

  group('one catalogue, both menus');
  {
    // ⚠ NEITHER FORM TYPES THE OPTIONS. This file records what a second hardcoded list costs:
    // the Edit Client modal kept its own service list and a rename missed it.
    has(src, '<select id="i-doc-tier" onchange="onDocGateChange()"></select>',
        'the intake menu is empty in the markup and filled from DOC_TIERS at load');
    has(src, 'function docTierOptionsHtml(', 'through one builder');
    has(src, "docTierOptionsHtml(docTierOf(job))", 'which Edit Client reads too, prefilled through the migration');
    c.DOC_TIERS.forEach((t) => {
      const n = src.split("'" + t.key + "'").length - 1 + src.split('"' + t.key + '"').length - 1;
      ok(n > 0, t.key + ' exists in the source');
    });
    // The labels appear once — in the catalogue — and nowhere else as literals.
    c.DOC_TIERS.forEach((t) => {
      const lbl = t.label.split(' — ')[0];
      const hits = src.split('>' + lbl + ' &mdash;').length - 1;
      eq(hits, 0, 'the "' + lbl + '" label is not typed into any markup');
    });
  }
};
