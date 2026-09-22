'use strict';
// WHICH INSTRUMENT THE WORK FEEDS — probate, trust, both or neither (2026-09-21).
//
// Step 2 of ESTATE_SCOPE_SPEC.md. The app is built probate-first — the intake block, the desk
// checklist, the Court Inventory and the agreement's compliance section all key on `isProbate`,
// which is the SERVICE TYPE and therefore says only that a probate case was opened at intake.
// It says nothing about a decedent whose assets pass under a revocable trust, and Anthony's
// reading is that on an upmarket book most of them will: "most homes will be in trust… the
// probate cases will be more rare." So the common case had no path through the app.
//
// The defect this closes, MEASURED on a seeded estate holding $19,000 of furniture with every
// line tracked Trust (identically for Non-probate and Homestead): the Court Inventory rendered
// FINAL in green, "Total tangible personal property: $0", with a signature block under it
// reading "Reviewed and adopted by … Personal Representative / authorized fiduciary". A
// fiduciary adopting that files a §733.604 schedule asserting the estate held nothing.
//
// ⚠ WHAT THIS IS NOT. The trustee's own schedule — Chapter 736 citations, a successor-trustee
// signature block, the carve-out reversed, and the line stating it SUPPORTS rather than
// constitutes a §736.08135 accounting — is a separate build. This stops the PROBATE document
// being signed on a matter with no probate in it.

const { sandbox, domStub, source } = require('./harness');

const BASE_FNS = [ 'invDocContractBlock', 'docTierProduces','matterTypeOf', 'matterDef', 'invFiduciaryMode', 'isDecedentJob'];
const BASE_VARS = [ 'INV_CONTRACT_DOCS','MATTER_TYPES', 'DECEDENT_SERVICES'];

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();
  const ctx = sandbox({ fns: BASE_FNS, vars: BASE_VARS });
  const est = (over) => Object.assign({ svc: 'cleanout' }, over);

  group('the four answers, and what each one means');
  {
    const keys = Object.keys(ctx.MATTER_TYPES);
    eq(keys.length, 4, 'four matter types and no more');
    eq(keys.sort().join(','), 'both,neither,probate,trust', 'probate, trust, both, neither');
    keys.forEach((k) => {
      const d = ctx.MATTER_TYPES[k];
      ok(typeof d.label === 'string' && d.label.length > 10, k + ' carries a label a person can read');
      eq(typeof d.onProbate, 'boolean', k + ' says whether a court filing exists');
      eq(typeof d.trust, 'boolean', k + ' says whether a trust is involved');
    });
    // The two derived facts, each true of exactly the pair it should be.
    eq(keys.filter((k) => ctx.MATTER_TYPES[k].onProbate).sort().join(','), 'both,probate',
       'a court filing exists on probate and on a pour-over will, and nowhere else');
    eq(keys.filter((k) => ctx.MATTER_TYPES[k].trust).sort().join(','), 'both,trust',
       'a trust is involved on a trust matter and on a pour-over will, and nowhere else');
    // ⚠ `both` is the one that is BOTH, and collapsing it into either is the whole reason the
    // field is not a boolean: a pour-over will really does have assets on each side.
    ok(ctx.MATTER_TYPES.both.onProbate && ctx.MATTER_TYPES.both.trust,
       'a pour-over will is genuinely both, which is why this is not a two-way flag');
    ok(!ctx.MATTER_TYPES.neither.onProbate && !ctx.MATTER_TYPES.neither.trust,
       'and family distribution is genuinely neither, which is why it is not a trust flag');
  }

  group('an unanswered matter type answers nothing');
  {
    // ⚠⚠ THE LOAD-BEARING HALF. Every job created before 2026-09-21 carries none, and
    // defaulting one to `probate` would put the exact claim this field exists to stop back on
    // a court document — silently, on the matters where it is most often wrong.
    eq(ctx.matterTypeOf(est({})), '', 'a job with no answer resolves to nothing, not to probate');
    eq(ctx.matterTypeOf(est({ matterType: '' })), '', 'nor does an empty string');
    eq(ctx.matterTypeOf(est({ matterType: 'bogus' })), '', 'nor does a value that is not one of the four');
    eq(ctx.matterTypeOf(null), '', 'nor does no job at all');
    eq(ctx.matterDef(est({})), null, 'and matterDef hands back null rather than a default entry');

    ['probate', 'trust', 'both', 'neither'].forEach((k) => {
      eq(ctx.matterTypeOf(est({ matterType: k })), k, k + ' resolves to itself');
      eq(ctx.matterDef(est({ matterType: k })), ctx.MATTER_TYPES[k], 'and to its entry');
    });

    // Living-client work has no matter type at all, so a job re-typed out of the decedent
    // family stops claiming one rather than keeping a stale answer on the record.
    ['downsizing', 'downsizing_move', 'home_cleanout', 'prep'].forEach((svc) => {
      eq(ctx.matterTypeOf({ svc: svc, matterType: 'probate' }), '',
         svc + ' is living-client work and has no matter type whatever the record holds');
    });
    ['cleanout', 'probate', 'contested_probate'].forEach((svc) => {
      eq(ctx.matterTypeOf({ svc: svc, matterType: 'trust' }), 'trust',
         svc + ' is decedent work and keeps its answer');
    });
    // ⚠ A PROBATE SERVICE TYPE IS NOT A PROBATE MATTER TYPE, and that is the point of the
    // field: `svc` is what we were hired to do, this is which instrument the work feeds.
    eq(ctx.matterTypeOf({ svc: 'probate', matterType: 'trust' }), 'trust',
       'the service type does not override the answer somebody gave');
  }

  group('intake asks it, refuses without it, and never defaults it');
  {
    const estateOpen  = src.indexOf('id="estate-fields"');
    const probateOpen = src.indexOf('id="probate-fields"');
    const at = src.indexOf('id="i-matter-type"');
    ok(at > estateOpen && at < probateOpen,
       'it sits in the estate block, so every decedent service is asked it and no probate-only block hides it');
    has(src, "'i-gate-706', 'i-gate-dispute', 'i-doc-tier', 'i-matter-type',",
        'and it is cleared with the other intake fields, so the last client\'s answer cannot ride onto the next');
    // ⚠ NO DEFAULT, unlike the scope question beside it. Doing the most is a defensible
    // assumption about scope; there is none about probate versus trust.
    const defs = src.slice(src.indexOf('var INTAKE_FIELD_DEFAULTS'));
    lacks(defs.slice(0, defs.indexOf('\n')), 'i-matter-type',
          'it carries no default — guessing probate is the defect, not the fallback');
    const opts = src.slice(at, src.indexOf('</select>', at));
    has(opts, 'value=""', 'the menu opens on a blank so somebody has to choose');
    ['probate', 'trust', 'both', 'neither'].forEach((k) => {
      has(opts, 'value="' + k + '"', 'the menu offers ' + k);
    });
  }

  group('what saveIntake does with it');
  {
    const base = {
      'i-fname': 'Tripp', 'i-lname': 'Butler', 'i-svc': 'cleanout', 'i-tc': 'Ashley Jerome',
      'i-addr': '69 Beach Blvd', 'i-city': 'Palm Beach', 'i-zip': '33480', 'i-sqft': '3500',
      'i-ptype': 'Estate', 'i-src': 'Attorney', 'i-start': '2026-10-01',
      'i-date-of-death': '2026-08-14',
      'i-executor-fname': 'Jane', 'i-executor-lname': 'Doe', 'i-executor-role': 'Trustee',
      'i-executor-phone': '(561) 555-0100', 'i-executor-email': 'jane@x.com',
    };
    const run = (over) => {
      const d = domStub(Object.assign({}, base, over));
      const said = [];
      const c = sandbox({
        fns: ['saveIntake', 'docTierScope', 'docTierScopeMirror', 'docTierDef'], vars: ['MATTER_TYPES', 'DECEDENT_SERVICES', 'SVC_LABELS', 'DOC_TIERS'],
        stubs: {
          document: d, jobs: [],
          showFB: (el, kind, msg) => said.push({ kind, msg }),
          saveJobs() {}, syncJobToSheets() {}, createDriveJobFolder() {},
          clearIntakeForm() {}, populateAgrSelect: null, showPanel() {},
          generateHvlId: () => 'HVL-0007', readHouseFlagInputs: () => ({}),
          lookupReferralById: () => null, setTimeout() {},
        },
      });
      c.saveIntake();
      return { said: said[0] || {}, jobs: c.jobs };
    };
    const none = run({});
    eq(none.said.kind, 'warn', 'an estate job with no matter type is refused');
    has(none.said.msg, 'How this estate is being administered', 'and the refusal names it in words somebody can act on');
    eq(none.jobs.length, 0, 'nothing is written');

    const t = run({ 'i-matter-type': 'trust' });
    eq(t.said.kind, 'ok', 'with an answer it saves');
    eq(t.jobs[0].matterType, 'trust', 'and the answer reaches the job');

    // A living-client job is never asked and is never refused for it.
    const live = run({ 'i-svc': 'downsizing', 'i-phone': '(561) 555-0102', 'i-email': 'a@b.com' });
    eq(live.said.kind, 'ok', 'a downsizing saves without one');
    eq(live.jobs[0].matterType, '', 'and carries none');
  }

  group('Edit Client carries it, and discards an answer it does not recognise');
  {
    const EC_FNS = ['showEditClient', 'saveClientEdit', 'ecIsProbateSvc', 'ecIsEstateSvc',
                    'ecDocGateChange', 'docTierOptionsHtml', 'docTierOf', 'docTierDef', 'docTierScope', 'docTierScopeMirror', 'svcHasDocStep', 'esc', 'onDocGateChange', 'houseFlagInputsHtml', 'houseFlagsOf',
                    '_houseFlagRowClass', 'docLevelFloor', 'docTierOf', 'docTierDef', 'docTierScope', 'docTierScopeMirror', 'svcHasDocStep', 'gateDispute', '_gateYes', '_gate706',
                    'isDecedentJob', 'docLevelFloorReason', 'resolveDocLevel', 'docStandardEffect',
                    'invListingThreshold', 'isFormalDoc', 'invAppraisalThreshold', 'matterTypeOf',
                    'matterDef', 'invFiduciaryMode', 'readHouseFlagInputs', 'docScopeDef'];
    const EC_VARS = ['SVC_LABELS', 'HOUSE_FLAGS', 'FIREARMS_PROTOCOL_DOC', 'DECEDENT_SERVICES',
                  'DOC_TIERS', 'DOC_TIER_FROM_SCOPE', 'JOB_STEPS',
                     'INV_LISTING_THRESHOLD_STANDARD', 'INV_LISTING_THRESHOLD_STRICT',
                     'INV_APPRAISAL_THRESHOLD', 'INV_APPRAISAL_THRESHOLD_DISPUTED', 'MATTER_TYPES',
                     'DOC_SCOPES'];
    const JOB = { id: 7, hvlId: 'HVL-0007', name: 'Tripp Butler', fname: 'Tripp', lname: 'Butler',
                  svc: 'cleanout', deathDate: '2026-08-14', gate706: 'no', matterType: 'trust' };

    const d = domStub({ 'ec-svc': 'cleanout', 'ec-gate-706': 'no' });
    const c = sandbox({ fns: EC_FNS, vars: EC_VARS,
                        stubs: { document: d, jobs: [JSON.parse(JSON.stringify(JOB))],
                                 estimateStore: {}, saveJobs() {}, renderClientDashboard() {}, renderJobs() {} } });
    c.showEditClient(7);
    const html = d.getElementById('edit-client-modal').innerHTML;
    has(html, 'id="ec-matter-type"', 'the modal offers it');
    has(html, '<option value="trust" selected>', 'prefilled from the job, so nobody re-answers what is already on file');
    const open = html.indexOf('ec-estate-auth-fields'), close = html.indexOf('end estate block');
    ok(html.indexOf('ec-matter-type') > open && (close < 0 || html.indexOf('ec-matter-type') < close),
       'inside the estate block, so it shows on every decedent service and not only probate');

    // The save writes a recognised value and discards anything else, rather than storing a
    // string matterTypeOf will refuse to resolve — a record that looks answered while every
    // screen reads it as unanswered is worse than a blank one.
    const write = (v) => {
      const dd = domStub({ 'ec-svc': 'cleanout', 'ec-fname': 'Tripp', 'ec-lname': 'Butler',
                           'ec-matter-type': v, 'ec-date-of-death': '2026-08-14' });
      const cc = sandbox({ fns: EC_FNS, vars: EC_VARS,
                           stubs: { document: dd, jobs: [JSON.parse(JSON.stringify(JOB))],
                                    estimateStore: {}, saveJobs() {}, renderClientDashboard() {}, renderJobs() {} } });
      cc.saveClientEdit(7);
      return cc.jobs[0].matterType;
    };
    eq(write('probate'), 'probate', 'a real answer is saved');
    eq(write(''), '', 'a blank clears it');
    eq(write('bogus'), '', 'and a value that is not one of the four is discarded, not stored');
  }

  group('the Court Inventory stops being signed on a matter with no probate in it');
  {
    const FNS = ['_invScheduleSection', 'invProbateRows', '_invTrackDefault', 'printCourtInventory', '_invAssignItemNos', '_jobInvRefs', '_invTouch',
                 'savePhotoRefs', 'isFormalDoc', 'resolveDocLevel', 'docLevelFloor', 'docTierOf', 'docTierDef', 'docTierScope', 'docTierScopeMirror', 'svcHasDocStep', 'gateDispute',
                 '_gateYes', '_gate706', 'isDecedentJob', '_invGuardrailItems',
                 'invAwaitingAppraisal', '_invJob', 'invNeedsAppraisal', 'invFiduciaryMode',
                 'invIsIntrinsic', 'invCatMeta', 'invAppraisalThreshold', '_invHasAppraisal',
                 '_invOnProbateSchedule', '_invTrack', 'resolveValBasis', 'estateValueDate',
                 '_invMoney', '_invExcludedTracks', '_invDocName', '_invHasValue', '_invIsExempt',
                 'matterDef', 'matterTypeOf', 'invDocContractBlock',
                 'docTierProduces', 'docTierOf', 'svcHasDocStep'];
    const VARS = ['DECEDENT_SERVICES', 'INV_TAXONOMY', 'INV_APPRAISAL_THRESHOLD',
                  'DOC_TIERS', 'DOC_TIER_FROM_SCOPE', 'JOB_STEPS',
                  'EXEMPT_CAP_732_402', 'MATTER_TYPES', 'INV_CONTRACT_DOCS'];
    const item = (id, name, fmv, track) => ({ stableId: id, label: 'inventory', jobId: 7,
      objectName: name, category: 'Furniture', fmv: fmv, assetTrack: track, condition: 'Good',
      ts: Number(id.slice(1)) });

    function render(matterType, track, items) {
      const refs = { 7: items !== undefined ? items : [
        item('i1', 'Chesterfield sofa', '4000', track),
        item('i2', 'Dining suite', '9000', track),
        item('i3', 'Bedroom set', '6000', track) ] };
      const d = domStub({});
      const c = sandbox({ fns: FNS, vars: VARS, stubs: { document: d, jobs: [{
        id: 7, hvlId: 'HVL-0007', name: 'Tripp Butler', svc: 'cleanout', gate706: 'no',
        deathDate: '2026-08-14', addr: '69 Beach Blvd', city: 'Palm Beach',
        matterType: matterType }], _photoRefs: refs } });
      c.printCourtInventory(7);
      const h = c.__printed || '';
      return {
        h: h,
        final: h.indexOf('#357a50') > 0,
        signed: h.indexOf('Reviewed and adopted by') > 0,
        notReady: h.indexOf('not ready to be adopted') > 0,
        // ⚠ PROBE THE BLOCK, NOT A PHRASE THE STATUS CHIP ALSO CARRIES. The first version of
        // this read 'not being administered through probate', which is ALSO the DRAFT reason
        // pushed into the status line at the top of the page — so deleting the block entirely,
        // and moving it below the table, both came back green on the revert sweep. The sentence
        // below appears in the block and nowhere else.
        offProbate: h.indexOf('is the wrong instrument for it') > 0,
      };
    }

    // ── The defect, closed. Layer one needs no field at all, so every job created before this
    //    field existed is protected by it.
    const carved = render('', 'Trust');
    eq(carved.final, false, 'an all-carved-out schedule is no longer stamped FINAL');
    eq(carved.signed, false, 'and offers no signature block for a fiduciary to adopt $0 with');
    has(carved.h, 'no recorded item is on the probate schedule', 'and says which of the two empties it is');
    ['Non-probate', 'Homestead'].forEach((t) => {
      const r = render('', t);
      eq(r.final, false, t + ' carves out the same way and is refused the same way');
      eq(r.signed, false, t + ' offers no signature block either');
    });
    const empty = render('', 'Probate', []);
    eq(empty.final, false, 'an estate with nothing recorded at all is refused too');
    has(empty.h, 'nothing is recorded on this estate yet',
        'and is told apart from the carve-out, because the fix is different: do the inventory, versus wrong document');

    // ── Unchanged where property really is on the schedule. The fix is additive.
    const normal = render('', 'Probate');
    eq(normal.final, true, 'a real probate schedule still finalises');
    eq(normal.signed, true, 'and still carries its signature block');
    has(normal.h, '$19,000', 'with the property on it');
    eq(normal.offProbate, false, 'and says nothing about matter type, because none was recorded');
    has(render('trust', 'Probate').h, 'This estate is not being administered through probate.',
        'the block names the finding in its own words, above and apart from the status chip');

    // ── Layer two: the answer, once given, is read.
    ['trust', 'neither'].forEach((mt) => {
      const r = render(mt, 'Probate');
      eq(r.offProbate, true, mt + ': the document says on its face that this is not a probate matter');
      eq(r.final, false, mt + ': and is never stamped FINAL, whatever the item tracks say');
      eq(r.signed, false, mt + ': and is never signed');
      ok(r.h.indexOf('is the wrong instrument for it') < r.h.indexOf('Tangible Personal Property</div>'),
         mt + ': the block is ABOVE the table — a caveat under the total has arrived after it was read as a filing');
    });
    has(render('trust', 'Probate').h, 'passes under the trust rather than through the estate',
        'a trust matter says where the property actually passes');
    has(render('neither', 'Probate').h, 'without a court or a trust',
        'and a family distribution says the same for itself');

    // ⚠ `both` IS A REAL PROBATE MATTER AND MUST NOT BE REFUSED. A pour-over will has assets on
    // each side; the probate schedule is the right instrument for the probate half.
    const both = render('both', 'Probate');
    eq(both.final, true, 'a pour-over will still finalises its probate schedule');
    eq(both.signed, true, 'and is still adoptable');
    eq(both.offProbate, false, 'and is not told it has no probate in it');
    has(both.h, "belongs on the trustee", 'but is told the trust assets are on a separate schedule');

    // ⚠ And `probate` changes nothing at all — the field earns its keep by what it STOPS, not
    // by what it adds to the common case. Compared byte for byte, so a stray note added to the
    // probate arm later fails rather than passing unnoticed.
    eq(render('probate', 'Probate').h, normal.h,
       'an explicit probate answer renders the same document, byte for byte, as no answer at all');
  }

  group('⚠ THE SECOND READER — the workbook Summary, and the net that catches the next one');
  {
    // The Court Inventory was the first reader. The Summary sheet became the second on
    // 2026-09-21 (a trust estate's own workbook opened with "Letters Issued" and a §733.604
    // deadline over two empty cells). What matters here is not that there are two, but that
    // NEITHER holds its own idea of which answers are on-probate — the 6-against-13 category
    // drift is what a second copy of a catalogue costs.
    const src = source();
    const live = String(src).split('\n')
      .filter((l) => { const t = l.trim(); return !(t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')); })
      .join('\n');
    ok(live.length > src.length * 0.5, 'the comment stripper did not eat the file');
    const fnBody = (n) => { const i = live.indexOf('function ' + n + '('); return live.slice(i, live.indexOf('\n}', i) + 2); };

    // ⚠⚠ THE CATALOGUE'S KEYS ARE UNQUOTED, so a QUOTED key anywhere in live code is a reader
    // testing the answer by name — and a reader that tests by name is a reader that forgets
    // `both`, which really does have a probate estate beside the trust. Both readers ask
    // `onProbate` off MATTER_TYPES instead.
    ["'trust'", "'both'", "'neither'"].forEach((tok) => {
      eq(live.split(tok).length - 1, 0,
         '⚠⚠ no live line compares a matter type to ' + tok + ' — they ask the catalogue');
    });
    // The stronger form of the same rule: ONE reader of the raw field, and it is the resolver.
    eq(live.split('.matterType').length - 1, 2,
       '⚠ `.matterType` is touched twice: read once in matterTypeOf, written once by Edit Client '
       + '(intake sets it as an object-literal key). A third touch is a reader going round the resolver.');
    has(fnBody('matterTypeOf'), 'job.matterType', '…and the single read is the resolver\'s own');
    has(live, 'function invProbateRows(', 'the Summary rows go through a named predicate');
    has(live, 'onProbate: invProbateRows(job)', '…which is what rides the workbook payload');
  }
};
