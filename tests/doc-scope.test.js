'use strict';
// Pricing an estate job WITH or WITHOUT the paperwork.
//
// Anthony, 2026-09-04: "we don't quite know yet if when we get an estate settlement job,
// the attorneys are going to want us to do all that work to support their workflow or if
// they're just going to delegate to a junior associate or paralegal … I want to be
// flexible in the ability to price with and without paperwork."
//
// The `document` step was hard-wired to the service type and is a third to two-fifths of
// the ticket. It is now a per-estimate scope (DOC_SCOPES: full / capture / none) pinned on
// the snapshot like the production rate, and the client estimate and the estate agreement
// both read the pin — an agreement promising a §733.604 inventory over an estimate that
// priced none is a contract for work nobody is paying for.

const { sandbox, source } = require('./harness');

module.exports = function ({ group, ok, eq, has, lacks }) {

  const ENGINE_FNS = ['computeEngineV3', 'effectiveJobSteps', 'docScopeDef', 'svcHasDocStep',
    'estimateDocScope', 'tenureMultiplier', 'engineRoomWeight', 'engineIsExterior', 'roomDefault'];
  const ENGINE_VARS = ['JOB_STEPS', 'DOC_SCOPES', 'DOC_CAPTURE_POOL_SHARE', 'ENGINE_CAREFUL',
    'ENGINE_ROOMLEVEL', 'PERROOM_REF', 'ENGINE_FLOOR', 'ENGINE_K', 'ENGINE_VOLF', 'ENGINE_CPXF',
    'ROOM_WEIGHT', 'EXTERIOR_ROOMS', 'ROOM_DEFAULTS'];

  group('effectiveJobSteps — the catalogue is never mutated, only copied');
  {
    const ctx = sandbox({ fns: ENGINE_FNS, vars: ENGINE_VARS });
    const before = JSON.stringify(ctx.JOB_STEPS);
    ok(ctx.effectiveJobSteps('cleanout', 'full') === ctx.JOB_STEPS.cleanout, 'full is the catalogue entry itself');
    ok(ctx.effectiveJobSteps('cleanout', undefined) === ctx.JOB_STEPS.cleanout, 'no scope means full — every pre-existing caller prices as before');
    ok(ctx.effectiveJobSteps('cleanout', 'garbage') === ctx.JOB_STEPS.cleanout, 'an unknown scope falls back to full, not to nothing');

    const cap = ctx.effectiveJobSteps('cleanout', 'capture');
    eq(cap.document, [0, ctx.JOB_STEPS.cleanout.document[1] * ctx.DOC_CAPTURE_POOL_SHARE], 'capture keeps half the pool and none of the coordination');
    eq(ctx.DOC_CAPTURE_POOL_SHARE, 0.5, 'the starting capture share is 50% — tune on a real job, not by accident');
    eq(cap.triage, ctx.JOB_STEPS.cleanout.triage, 'the other steps are untouched');

    const none = ctx.effectiveJobSteps('probate', 'none');
    ok(!('document' in none), 'none removes the step outright');
    ok('legal' in none, 'and leaves the legal step — counsel doing the inventory does not remove chain of custody');

    eq(JSON.stringify(ctx.JOB_STEPS), before, 'JOB_STEPS is bit-identical afterwards');

    for (const svc of ['downsizing', 'downsizing_move', 'home_cleanout', 'prep']) {
      ok(ctx.effectiveJobSteps(svc, 'none') === ctx.JOB_STEPS[svc], svc + ' has no document step and ignores the scope');
      ok(!ctx.svcHasDocStep(svc), svc + ' reports no document step');
    }
    for (const svc of ['cleanout', 'probate', 'contested_probate']) ok(ctx.svcHasDocStep(svc), svc + ' prices a document step');
  }

  group('computeEngineV3 — the scope moves the hours, and only the document hours');
  {
    const ctx = sandbox({ fns: ENGINE_FNS, vars: ENGINE_VARS });
    const names = ['Entryway / Foyer', 'Living Room', 'Dining Room', 'Family Room / Great Room', 'Half Bath',
      'Kitchen', 'Laundry Room', 'Office 1', 'Primary Suite', 'Primary Bath', 'Walk-in Closet', 'Bedroom 2',
      'Bathroom 2', 'Bedroom 3', 'Bathroom 3', 'Bedroom 4', 'Garage (2-car)', 'Patio / Lanai'];
    const rooms = names.map((n) => { const d = ctx.roomDefault(n); return { name: n, vol: d.vol, cplx: d.cplx }; });
    for (const svc of ['cleanout', 'probate', 'contested_probate']) {
      const full = ctx.computeEngineV3(3500, rooms, svc, 2, '', 'full');
      const legacy = ctx.computeEngineV3(3500, rooms, svc, 2, '');
      const cap = ctx.computeEngineV3(3500, rooms, svc, 2, '', 'capture');
      const none = ctx.computeEngineV3(3500, rooms, svc, 2, '', 'none');
      eq([legacy.totTC, legacy.totPS], [full.totTC, full.totPS], svc + ': a caller that omits the scope prices exactly as full');
      ok(none.totPS < cap.totPS && cap.totPS < full.totPS, svc + ': pool hours fall none < capture < full');
      ok(none.totTC < full.totTC, svc + ': coordination falls when the appraiser scheduling moves to counsel');
      ok(!none.byStep.document, svc + ': none has no document line in the breakdown');
      ok(Math.abs(cap.byStep.document.ps - full.byStep.document.ps * 0.5) < 1e-9, svc + ': capture documents at half the pool hours');
      eq(cap.byStep.document.tc, 0, svc + ': capture books no documentation coordination');
      // Nothing else moved: every non-document step is identical across the three.
      for (const L of Object.keys(full.byStep)) {
        if (L === 'document') continue;
        ok(Math.abs(full.byStep[L].ps - none.byStep[L].ps) < 1e-9 && Math.abs(full.byStep[L].tc - none.byStep[L].tc) < 1e-9, svc + ': ' + L + ' is untouched by the scope');
      }
      // The document step is a third to two-fifths of the pool — the number that motivated this.
      const share = full.byStep.document.ps / full.totPS;
      ok(share > 0.30 && share < 0.50, svc + ': the document step is ' + Math.round(share * 100) + '% of the pool');
    }
    const d = ctx.computeEngineV3(3500, rooms, 'downsizing', 2, '', 'none');
    const d2 = ctx.computeEngineV3(3500, rooms, 'downsizing', 2, '', 'full');
    eq([d.totTC, d.totPS], [d2.totTC, d2.totPS], 'a downsizing prices identically whatever the scope says');
  }

  group('estimateDocScope — what a SAVED estimate was priced under');
  {
    const ctx = sandbox({ fns: ENGINE_FNS, vars: ENGINE_VARS });
    eq(ctx.estimateDocScope({ svc: 'cleanout' }), 'full', 'a snapshot from before the control existed was priced full');
    eq(ctx.estimateDocScope({ svc: 'cleanout', docScope: 'none' }), 'none', 'a pinned none is none');
    eq(ctx.estimateDocScope({ svc: 'probate', docScope: 'capture' }), 'capture', 'a pinned capture is capture');
    eq(ctx.estimateDocScope({ svc: 'cleanout', docScope: 'nonsense' }), 'full', 'garbage reads as full — the safe side, we never under-promise by accident');
    eq(ctx.estimateDocScope({ svc: 'downsizing', docScope: 'capture' }), 'none', 'a service with no document step is none whatever the field says');
    eq(ctx.estimateDocScope(null), 'none', 'no estimate at all reads as none rather than throwing');
  }

  group('the per-estimate pin — set, fall back, reset with the rest of the estimate');
  {
    let calcs = 0;
    const ctx = sandbox({
      fns: ['activeDocScope', 'setEstimateDocScope', 'docScopeDef'],
      vars: ['DOC_SCOPES', '_estimateDocScope'],
      stubs: { calcAll() { calcs++; } },
    });
    eq(ctx.activeDocScope(), 'full', 'a fresh estimate is full');
    ctx.setEstimateDocScope('none');
    eq(ctx.activeDocScope(), 'none', 'setting it on the estimate wins');
    eq(calcs, 1, 'and reprices');
    ctx.setEstimateDocScope('bogus');
    eq(ctx.activeDocScope(), 'full', 'nonsense falls back to full');
    ctx._estimateDocScope = 'garbage';
    eq(ctx.activeDocScope(), 'full', 'a corrupt pin reads as full rather than leaking into the engine');

    const src = source();
    has(src, "computeEngineV3(sqftVal, engineRooms, svcKey, crewSize, yearsInHomeVal, activeDocScope())", 'calcAll prices at the pinned scope');
    has(src, "docScope: activeDocScope()", 'the snapshot stamps the scope it was priced under');
    has(src, "_estimateDocScope = docScopeDef(est.docScope) ? est.docScope : 'full';", 'restoreEstimateToUI pins the saved scope back');
    const resets = (src.match(/_estimateAlphaPin = null; _estimateCostPin = null; _estimateDocScope = 'full';/g) || []).length;
    eq(resets, 2, 'the two no-job reset sites clear the scope pin with the α pin');
    has(src, "_estimateDocScope = seedDocScopeFromJob(job);   // fresh build", 'the fresh-build site seeds from the job instead — a stale scope on a fresh build misprices the next job');
    has(src, "_volPreset = 'normal'; paintVolPreset();\n  _estimateDocScope = 'full';", 'resetEstimate clears it with the preset');
  }

  group('the client estimate follows the scope it priced, once, in the stage');
  {
    const ctx = sandbox({
      fns: ['_cePhases', 'estimateDocScope', 'docScopeDef', 'svcHasDocStep', 'isDecedentJob'],
      vars: ['JOB_STEPS', 'DOC_SCOPES', 'DECEDENT_SERVICES'],
      stubs: { isFormalDoc: () => true },
    });
    const job = { id: 1, svc: 'probate', executor: 'PR' };
    const phases = (scope) => ctx._cePhases({ svc: 'probate', docScope: scope, vendors: [], collections: [] }, job);
    const text = (P) => JSON.stringify(P);
    const full = phases('full'), cap = phases('capture'), none = phases('none');

    eq(full[1].title, 'Sorting, Documentation &amp; Inventory', 'full keeps the original stage title');
    eq(cap[1].title, 'Sorting, Photography &amp; Listing', 'capture names what it is');
    eq(none[1].title, 'Sorting &amp; Set-Aside', 'none names what it is');

    has(text(full), 'estimated value', 'full promises a value on every item');
    lacks(text(full), 'not part of this engagement', 'full does not explain an absence — nothing is absent');
    has(cap[1].body, 'Valuation is not part of this engagement', 'capture says once that counsel values');
    lacks(cap[1].body, 'estimated value', 'and does not promise one');
    has(none[1].body, 'inventory and valuation of the estate are being handled by counsel', 'none says once that counsel inventories');
    eq((text(cap).match(/not part of this engagement/g) || []).length, 1, 'capture states the carve-out exactly once');
    eq((text(none).match(/handled by counsel/g) || []).length, 1, 'none states the carve-out exactly once');

    // What they are left holding.
    const recv = (P) => P.find((p) => p.receive).receive.join(' | ');
    has(recv(full), 'estimated value', 'full delivers the valued inventory');
    has(recv(full), 'Independent appraisals', 'and the appraisals');
    has(recv(cap), 'for counsel to value', 'capture delivers the list, for counsel to value');
    lacks(recv(cap), 'Independent appraisals', 'capture does not promise appraisals it is not coordinating');
    has(recv(cap), 'chain-of-custody', 'capture still keeps the custody log — we handled every listed item');
    lacks(recv(none), 'inventory', 'none promises no inventory');
    lacks(recv(none), 'chain-of-custody', 'or a custody log for items it never listed');
    lacks(recv(none), 'fair market value', 'or a valued court inventory');
    has(recv(full), 'fair market value', 'the court-grade records survive only on full');

    // Close-out on a probate job.
    const closeOut = (P) => P.find((p) => p.title.indexOf('Close-Out') === 0);
    has(closeOut(full).body, 'date-of-death fair market value', 'full prepares the verified inventory for filing');
    has(closeOut(cap).body, 'delivered to counsel in a form their office can value', 'capture hands counsel the list to file');
    lacks(closeOut(none).body, 'inventory', 'none says nothing about an inventory at close-out');

    // The estate rules that must NOT move with the scope.
    for (const P of [cap, none]) {
      has(P[1].body, 'Nothing is sold, donated or removed at this stage', 'catalogue-before-disposition holds without the paperwork');
      has(P[2].body, 'Nothing leaves the property until the representative has reviewed the inventory', 'the written-authority gate holds without the paperwork');
      has(P[1].need, 'You do not need to be on site', 'the representative still need not attend');
    }

    // Living-client copy is untouched whatever the field says.
    const down = ctx._cePhases({ svc: 'downsizing', docScope: 'none', vendors: [], collections: [] }, { svc: 'downsizing' });
    eq(down[1].title, 'Sorting &amp; Decisions', 'a downsizing reads as it always did');
    has(down[1].need, 'Decisions, room by room', 'and keeps the decision-paced ask');
    const legacy = ctx._cePhases({ svc: 'cleanout', vendors: [], collections: [] }, { svc: 'cleanout' });
    eq(legacy[1].title, 'Sorting, Documentation &amp; Inventory', 'an estimate saved before the control is read as full');
  }

  group('the estate agreement follows the same pin');
  {
    const ctx = sandbox({ fns: ['_agrScopeServices', '_agrProbateCompliance', '_agrMidpointTrigger'] });
    has(ctx._agrScopeServices('full'), 'room-by-room asset documentation and inventory', 'full scope sells the inventory');
    has(ctx._agrScopeServices('full'), 'appraisal coordination', 'and the appraisal coordination');
    lacks(ctx._agrScopeServices('full'), 'not within this engagement', 'and carves nothing out');
    has(ctx._agrScopeServices('capture'), 'without valuation', 'capture lists without valuing');
    has(ctx._agrScopeServices('capture'), 'not within this engagement', 'and says valuation is counsel\'s');
    lacks(ctx._agrScopeServices('capture'), 'appraisal coordination for all asset categories', 'and does not sell appraisal coordination');
    has(ctx._agrScopeServices('none'), 'inventory and valuation of estate assets are not within this engagement', 'none carves the inventory out');
    lacks(ctx._agrScopeServices('none'), 'room-by-room asset documentation', 'and does not sell it');
    for (const sc of ['full', 'capture', 'none']) {
      has(ctx._agrScopeServices(sc), 'family distribution and documented handoff to beneficiaries', sc + ': the disposition services are unchanged');
    }

    const comp = (sc) => ctx._agrProbateCompliance(sc).join(' | ');
    has(comp('full'), 'Havellin will prepare a documented asset inventory', 'full: we prepare the §733.604 inventory');
    has(comp('full'), 'Havellin will coordinate professional appraisals', 'full: we coordinate appraisals');
    has(comp('capture'), 'Valuation and the court filing are the responsibility of the estate attorney', 'capture: counsel values and files');
    has(comp('capture'), 'Professional appraisals are arranged by the estate attorney', 'capture: counsel arranges appraisals');
    has(comp('none'), 'Havellin does not prepare, value or file it', 'none: the inventory is not ours');
    lacks(comp('none'), 'Havellin will coordinate professional appraisals', 'none: no appraisal coordination promised');
    for (const sc of ['full', 'capture', 'none']) {
      has(comp(sc), '§733.613', sc + ': the sale-approval clause survives');
      has(comp(sc), 'retained for a minimum of 7 years', sc + ': retention survives');
      eq(ctx._agrProbateCompliance(sc).length, 5, sc + ': five clauses either way');
    }

    has(ctx._agrMidpointTrigger('full'), 'Asset Inventory', 'full: midpoint on the inventory');
    has(ctx._agrMidpointTrigger('capture'), 'Photography &amp; Listing', 'capture: midpoint on the listing');
    has(ctx._agrMidpointTrigger('none'), 'Sorting &amp; Set-Aside', 'none: midpoint on the sorting — there is no inventory phase to complete');

    const src = source();
    lacks(src, 'Phase 5 (Asset Inventory)', 'no literal inventory trigger survives in the agreement');
    has(src, 'content += pp(_agrScopeServices(docScope));', 'the agreement scope reads the helper');
    has(src, 'var comp = _agrProbateCompliance(docScope);', 'the compliance list reads the helper');
    has(src, "var docScope = est ? estimateDocScope(est) : (svcHasDocStep(job.svc || job.serviceType) ? 'full' : 'none');", 'the agreement reads the pin off the estimate it attaches');
  }

  group('the service badge and the hours breakdown say what the scope did');
  {
    const src = source();
    has(src, "documentation priced OUT — counsel handles the inventory", 'the badge names a priced-out step');
    has(src, "'Photograph & list (counsel values)' : (STEP_LABELS[L] || L)", 'the breakdown relabels the halved step');
    has(src, 'id="e-docscope"', 'the control exists on Build Estimate');
    has(src, 'paintEstimateDocScope(svcKey, _ejob);', 'and is painted from calcAll with the job, so it hides on services with no document step and can compare against intake');
  }

  group('intake asks who builds the inventory, and SEEDS the estimate rather than pricing it');
  {
    const ctx = sandbox({
      fns: ['seedDocScopeFromJob', '_docScopeIntakeNote', 'docScopeDef'],
      vars: ['DOC_SCOPES'],
    });
    eq(ctx.seedDocScopeFromJob({ docScope: 'none' }), 'none', 'a fresh estimate opens at the intake answer');
    eq(ctx.seedDocScopeFromJob({ docScope: 'capture' }), 'capture', 'capture too');
    eq(ctx.seedDocScopeFromJob({}), 'full', 'a job from before the question was asked opens at full');
    eq(ctx.seedDocScopeFromJob({ docScope: 'bogus' }), 'full', 'garbage on the job opens at full');
    eq(ctx.seedDocScopeFromJob(null), 'full', 'no job at all opens at full');

    eq(ctx._docScopeIntakeNote({ docScope: 'capture' }, 'capture'), '', 'no note when the estimate agrees with intake');
    eq(ctx._docScopeIntakeNote({}, 'none'), '', 'no note when intake never answered — there is nothing to disagree with');
    has(ctx._docScopeIntakeNote({ docScope: 'capture' }, 'full'), 'Intake recorded Capture only; this estimate is priced at Full', 'the two answers never silently disagree');
    has(ctx._docScopeIntakeNote({ docScope: 'none' }, 'capture'), 'Intake recorded None; this estimate is priced at Capture only', 'in either direction');

    const src = source();
    // The question lives INSIDE the estate block, so a downsizing intake never shows it.
    const estateOpen = src.indexOf('id="estate-auth-fields"');
    const q = src.indexOf('id="i-docscope"');
    const readout = src.indexOf('id="i-gate-readout"');
    ok(estateOpen > 0 && q > estateOpen && q > readout, 'the intake question sits in the estate block, after the documentation gates');
    has(src, "docScope:           (document.getElementById('i-docscope')||{}).value||'full',", 'intake saves the answer on the job');
    has(src, "'i-gate-706', 'i-gate-dispute', 'i-docscope',", 'and clears it with the other intake fields');
    has(src, "'i-docscope': 'full'", 'a cleared form resets to full, not to a blank select');
    // Edit-client carries it for EVERY estate service, not only probate.
    ok(src.indexOf("if (isEstateEdit) {\n    var _ecDs = document.getElementById('ec-docscope');") > 0, 'the edit-client save runs for Estate Settlement as well as probate');
    has(src, "id=\"ec-docscope\"", 'the edit-client modal offers it');
    // The intake answer never restates a priced estimate: the restore path reads the
    // snapshot's own pin, and only the fresh-build path reads the job.
    has(src, "_estimateDocScope = docScopeDef(est.docScope) ? est.docScope : 'full';", 'a saved estimate restores its OWN scope, never intake\'s');
    eq((src.match(/seedDocScopeFromJob\(/g) || []).length, 2, 'the seed is read in exactly one place besides its definition — the fresh-build site');
  }
};
