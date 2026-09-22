'use strict';
// EVERY FACT ABOUT A DECEDENT IS ASKED ON EVERY DECEDENT SERVICE (2026-09-21).
//
// The finding this file exists for: the app asked who builds the inventory, priced the answer
// and wrote it into the contract — and asked it inside `#probate-fields`, which renders on
// Probate and Contested Probate alone. So on an ESTATE SETTLEMENT, which is a decedent job by
// definition (isDecedentJob) and is the service Havellin runs most, the question was never put
// at all. It took the 'full' default and was priced at full documentation — about a third of
// the ticket — whatever counsel had actually asked for. The 706 question went the same way:
// unanswered counts as yes, so every Estate Settlement sat in permanent Strict Mode with the
// reason rendering into a div inside the hidden block. And the date of death, which is the
// date every value on an estate schedule is stated AT (estateValueDate), was never collected.
//
// The requirement under test is CONTAINMENT, not layout: a decedent fact lives in the block
// shown on all three decedent services, and the block shown only on a court case holds the
// court record and nothing else.

const { sandbox, domStub, source } = require('./harness');

// Facts about a DECEDENT — every one of these must be reachable on Estate Settlement.
const ESTATE_IDS = [
  'i-date-of-death', 'i-doc-tier', 'i-matter-type', 'i-gate-706', 'i-gate-dispute', 'i-gate-readout',
  'i-probate-atty-fname', 'i-probate-atty-lname', 'i-probate-atty-firm',
  'i-probate-atty-phone', 'i-probate-atty-email',
];
// Facts about a COURT CASE — these stay probate-only.
const PROBATE_IDS = [
  'i-probate-case', 'i-letters-date', 'i-probate-deadline', 'i-deadline-fb', 'i-probate-sale',
];

// A class-aware document. domStub returns [] from querySelectorAll, so the required-marks
// toggle would be unobservable against it — and a toggle nothing can observe is exactly the
// assertion-that-cannot-fail this project keeps paying for.
function classDom(seed, classed) {
  const d = domStub(seed);
  Object.keys(classed || {}).forEach((id) => { d.__seed(id, { className: classed[id] }); });
  d.querySelectorAll = function (selector) {
    const want = String(selector).replace(/^\./, '');
    return Object.keys(d.__els)
      .map((k) => d.__els[k])
      .filter((el) => String(el.className || '').split(/\s+/).indexOf(want) >= 0);
  };
  return d;
}

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();

  group('the two blocks hold what their name says, and nothing else');
  {
    const estateOpen  = src.indexOf('id="estate-fields"');
    const probateOpen = src.indexOf('id="probate-fields"');
    const houseFlags  = src.indexOf('What&rsquo;s In The House');
    ok(estateOpen > 0, 'the estate block exists');
    ok(probateOpen > estateOpen, 'and closes before the probate block opens');
    ok(houseFlags > probateOpen, 'which in turn closes before the next intake section');

    ESTATE_IDS.forEach((id) => {
      const at = src.indexOf('id="' + id + '"');
      ok(at > estateOpen && at < probateOpen, id + ' is a decedent fact and sits in the estate block');
    });
    PROBATE_IDS.forEach((id) => {
      const at = src.indexOf('id="' + id + '"');
      ok(at > probateOpen && at < houseFlags, id + ' is a court-case fact and stays probate-only');
    });
  }

  group('which blocks a service shows');
  {
    const run = (svc) => {
      const d = classDom({ 'i-svc': svc }, {});
      const c = sandbox({
        fns: ['toggleIntakeFields', 'onDocGateChange', '_gateYes', '_gate706', 'gateDispute',
              'docLevelFloor', 'docTierOf', 'docTierDef', 'docTierScope', 'docTierScopeMirror', 'svcHasDocStep', 'docLevelFloorReason', 'resolveDocLevel', 'isDecedentJob',
              'invAppraisalThreshold', 'invListingThreshold', 'docStandardEffect', 'isFormalDoc'],
        vars: ['DECEDENT_SERVICES', 'INV_APPRAISAL_THRESHOLD', 'INV_APPRAISAL_THRESHOLD_DISPUTED',
                  'DOC_TIERS', 'DOC_TIER_FROM_SCOPE', 'JOB_STEPS',
               'INV_LISTING_THRESHOLD_STRICT', 'INV_LISTING_THRESHOLD_STANDARD'],
        stubs: { document: d },
      });
      c.toggleIntakeFields();
      return {
        estate:  d.getElementById('estate-fields').style.display,
        probate: d.getElementById('probate-fields').style.display,
        auth:    d.getElementById('estate-auth-fields').style.display,
      };
    };
    ['cleanout', 'probate', 'contested_probate'].forEach((svc) => {
      eq(run(svc).estate, 'block', svc + ' is a decedent service, so it is asked the decedent facts');
      eq(run(svc).auth, 'block', svc + ' names an authorized representative');
    });
    eq(run('cleanout').probate, 'none', 'an Estate Settlement is shown no court record — it may never open probate');
    eq(run('probate').probate, 'block', 'probate is');
    eq(run('contested_probate').probate, 'block', 'and so is contested probate');
    ['downsizing', 'downsizing_move', 'home_cleanout', 'prep'].forEach((svc) => {
      eq(run(svc).estate, 'none', svc + ' is living-client work and is asked none of it');
      eq(run(svc).probate, 'none', svc + ' gets no court record either');
    });
  }

  group('the estate attorney is required on probate and merely offered on an estate settlement');
  {
    const marks = { 'm1': 'req-probate', 'm2': 'req-probate' };
    const run = (svc) => {
      const d = classDom({ 'i-svc': svc }, marks);
      const c = sandbox({
        fns: ['toggleIntakeFields', 'onDocGateChange', '_gateYes', '_gate706', 'gateDispute',
              'docLevelFloor', 'docTierOf', 'docTierDef', 'docTierScope', 'docTierScopeMirror', 'svcHasDocStep', 'docLevelFloorReason', 'resolveDocLevel', 'isDecedentJob',
              'invAppraisalThreshold', 'invListingThreshold', 'docStandardEffect', 'isFormalDoc'],
        vars: ['DECEDENT_SERVICES', 'INV_APPRAISAL_THRESHOLD', 'INV_APPRAISAL_THRESHOLD_DISPUTED',
                  'DOC_TIERS', 'DOC_TIER_FROM_SCOPE', 'JOB_STEPS',
               'INV_LISTING_THRESHOLD_STRICT', 'INV_LISTING_THRESHOLD_STANDARD'],
        stubs: { document: d },
      });
      c.toggleIntakeFields();
      return { mark: d.getElementById('m1').style.display,
               note: d.getElementById('i-atty-req-note').textContent };
    };
    eq(run('probate').mark, 'inline', 'the asterisks show on probate, where saveIntake really refuses without them');
    has(run('probate').note, 'all fields required', 'and the heading says so');
    eq(run('cleanout').mark, 'none', 'and are withheld on an Estate Settlement, where the save accepts them blank');
    has(run('cleanout').note, 'never open probate', 'the heading says why rather than going quiet');
    // A net, not a list of the five fields that exist today.
    has(src, "document.querySelectorAll('.req-probate')",
        'matched by class, so a sixth attorney field cannot be added and quietly left marked wrong');
  }

  group('what saveIntake refuses, per service');
  {
    const base = {
      'i-fname': 'Tripp', 'i-lname': 'Butler', 'i-svc': 'cleanout', 'i-tc': 'Ashley Jerome',
      'i-phone': '', 'i-email': '', 'i-addr': '69 Beach Blvd', 'i-city': 'Palm Beach',
      'i-zip': '33480', 'i-sqft': '3500', 'i-ptype': 'Estate', 'i-src': 'Attorney',
      'i-start': '2026-10-01',
      'i-executor-fname': 'Jane', 'i-executor-lname': 'Doe', 'i-executor-role': 'Personal Representative',
      'i-executor-phone': '(561) 555-0100', 'i-executor-email': 'jane@x.com',
    };
    const run = (over) => {
      const d = domStub(Object.assign({}, base, over));
      const said = [];
      const c = sandbox({
        fns: ['saveIntake', 'docTierScope', 'docTierScopeMirror', 'docTierDef'],
        vars: ['SVC_LABELS', 'DOC_TIERS'],
        stubs: {
          document: d,
          jobs: [],
          showFB: (el, kind, msg) => said.push({ kind, msg }),
          saveJobs() {}, syncJobToSheets() {}, createDriveJobFolder() {},
          clearIntakeForm() {}, populateAgrSelect: null, showPanel() {},
          generateHvlId: () => 'HVL-0007',
          readHouseFlagInputs: () => ({}),
          lookupReferralById: () => null,
          setTimeout() {},
        },
      });
      c.saveIntake();
      return { said: said[0] || {}, jobs: c.jobs };
    };

    // ⚠ DATE OF DEATH IS REQUIRED ON ALL THREE, NOT ONLY PROBATE. It used to be checked in the
    // probate branch, on a field the form did not render outside probate — so every Estate
    // Settlement ever created carries deathDate '', and estateValueDate returns '' with it.
    const noDod = run({ 'i-matter-type': 'probate' });
    eq(noDod.said.kind, 'warn', 'an Estate Settlement with no date of death is refused');
    has(noDod.said.msg, 'Date of death', 'and the refusal names it');
    eq(noDod.jobs.length, 0, 'and nothing is written');

    const ok1 = run({ 'i-date-of-death': '2026-08-14', 'i-matter-type': 'probate' });
    eq(ok1.said.kind, 'ok', 'with a date of death it saves — the attorney is NOT required here');
    eq(ok1.jobs.length, 1, 'and the job lands');
    eq(ok1.jobs[0].deathDate, '2026-08-14', 'carrying the date every value on it will be stated at');
    // ⚠ BLANK, not 'full'. The form showed a blank tier, so the record carries a blank mirror —
    // storing the pricing fallback here is what made every new job read as already answered.
    eq(ok1.jobs[0].docTier, '', 'the tier the form actually showed somebody — blank');
    eq(ok1.jobs[0].docScope, '', 'and a blank mirror beside it, so the estimate can still tell');

    const pr = run({ 'i-svc': 'probate', 'i-date-of-death': '2026-08-14', 'i-matter-type': 'probate' });
    eq(pr.said.kind, 'warn', 'a probate matter with no attorney and no case number is refused');
    has(pr.said.msg, 'Attorney first name', 'naming the attorney');
    has(pr.said.msg, 'Probate case number', 'and the case number');
    lacks(pr.said.msg, 'Date of death', 'but not the date of death, which was supplied');

    const gates = run({ 'i-date-of-death': '2026-08-14', 'i-matter-type': 'trust', 'i-gate-706': 'no', 'i-gate-dispute': 'yes' });
    eq(gates.jobs[0].gate706, 'no', 'the 706 answer reaches the job from an Estate Settlement intake');
    eq(gates.jobs[0].gateDispute, 'yes', 'and so does the dispute answer');
    eq(gates.jobs[0].matterType, 'trust', 'and the matter type, which nothing else in the app could have told us');

    // ⚠ REQUIRED AND NEVER DEFAULTED. The scope question beside it opens at Full because doing
    // the most is a defensible assumption; there is no defensible assumption about probate
    // versus trust, and guessing probate is what puts a court schedule in front of a trustee.
    const noMatter = run({ 'i-date-of-death': '2026-08-14' });
    eq(noMatter.said.kind, 'warn', 'an estate job with no matter type is refused');
    has(noMatter.said.msg, 'How this estate is being administered', 'and the refusal names it');
    eq(noMatter.jobs.length, 0, 'and nothing is written');
  }

  group('Edit Client carries the same split, so Strict Mode is no longer a one-way door');
  {
    const open  = src.indexOf("html += '<div id=\"ec-estate-auth-fields\"");
    const close = src.indexOf("// end estate block");
    const pOpen = src.indexOf("html += '<div id=\"ec-probate-fields\"");
    ok(open > 0 && close > open, 'the estate block exists in the modal');
    ok(pOpen > close, 'and the court record follows it, as intake orders them');
    ['ec-date-of-death', 'ec-gate-706', 'ec-gate-dispute', 'ec-gate-readout'].forEach((id) => {
      const at = src.indexOf('id="' + id + '"');
      ok(at > open && at < close, id + ' is offered on every estate service');
    });
    ["txt('atty-fname'", "txt('atty-firm'", "tel('atty-phone'"].forEach((needle) => {
      const at = src.indexOf(needle);
      ok(at > open && at < close, needle + ' moved out of the probate block — the Job Plan asks for it on Estate Settlement');
    });
    ["txt('probate-case'", 'id="ec-probate-deadline"', 'id="ec-probate-sale"'].forEach((needle) => {
      ok(src.indexOf(needle) > pOpen, needle + ' stays probate-only');
    });

    // The save reads them on every estate service, not in the probate branch.
    const body = src.slice(src.indexOf('function saveClientEdit('));
    const fnBody = body.slice(0, body.indexOf('\nfunction formatPhone'));
    const est = fnBody.indexOf('if (isEstateEdit) {');
    const pro = fnBody.indexOf('if (ecIsProbateSvc(svc)) {');
    ok(est > 0 && pro > est, 'the estate branch runs first, and the probate branch after it');
    ['job.deathDate', 'job.gate706', 'job.gateDispute', 'job.probateAttyName'].forEach((k) => {
      const at = fnBody.indexOf(k + ' ');
      ok(at > est && at < pro, k + ' is written on every estate service');
    });
    ['job.probateCase', 'job.probateDeadline', 'job.probateSale'].forEach((k) => {
      ok(fnBody.indexOf(k + ' ') > pro, k + ' is written only on a probate matter');
    });

    // ⚠ AND THE APPROVAL LOCK MUST NOT HOLD THEM. It exists for the three inputs that feed the
    // hours engine; holding a 706 answer would make a wrong one permanent the moment an
    // estimate was approved, which is the door this change exists to open.
    // ⚠ BOUNDED TO THE BLOCK ITSELF AND COMMENT-STRIPPED. Slicing to the estate branch swept
    // in the comment explaining why the lock does NOT hold these, and the needle tripped on the
    // prose explaining the fix — the shape this project records over and over.
    const lockOpen = fnBody.indexOf('if (_locked) {');
    const locked = fnBody.slice(lockOpen, fnBody.indexOf('svc = job.svc;', lockOpen))
      .split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
    ['gate706', 'gateDispute', 'deathDate', 'docScope'].forEach((k) => {
      lacks(locked, k, 'the approval lock says nothing about ' + k);
    });
  }

  // The modal is BUILT here, not grepped. Four things went green on the revert sweep when
  // this group did not exist: the conditional asterisk, the documentation level parked on the
  // readout, the readout being painted on open, and the repaint when the service changes.
  // Every one of them is something a person sees and no source needle noticed.
  group('driving the Edit Client modal');
  {
    const EC_FNS = ['showEditClient', 'ecIsProbateSvc', 'ecIsEstateSvc', 'ecDocGateChange', 'docTierOptionsHtml', 'docTierOf', 'docTierDef', 'docTierScope', 'docTierScopeMirror', 'svcHasDocStep', 'esc',
                    'onDocGateChange', 'houseFlagInputsHtml', 'houseFlagsOf', '_houseFlagRowClass',
                    'docLevelFloor', 'docTierOf', 'docTierDef', 'docTierScope', 'docTierScopeMirror', 'svcHasDocStep', 'gateDispute', '_gateYes', '_gate706', 'isDecedentJob',
                    'docLevelFloorReason', 'resolveDocLevel', 'docStandardEffect',
                    'invListingThreshold', 'isFormalDoc', 'invAppraisalThreshold', 'ecToggleProbate',
                    'matterTypeOf', 'invFiduciaryMode'];
    const EC_VARS = ['SVC_LABELS', 'HOUSE_FLAGS', 'FIREARMS_PROTOCOL_DOC', 'DECEDENT_SERVICES',
                  'DOC_TIERS', 'DOC_TIER_FROM_SCOPE', 'JOB_STEPS',
                     'INV_LISTING_THRESHOLD_STANDARD', 'INV_LISTING_THRESHOLD_STRICT',
                     'INV_APPRAISAL_THRESHOLD', 'INV_APPRAISAL_THRESHOLD_DISPUTED', 'MATTER_TYPES'];
    // ⚠ THE THREE CONTROLS THE READOUT READS ARE SEEDED, BECAUSE domStub DOES NOT PARSE MARKUP.
    // showEditClient writes one innerHTML string; a real browser then has those selects in it,
    // carrying the values the string gave them, and the stub does not. Seeding them from the job
    // is exactly what the browser has a moment later — without it the readout computes against
    // three blank fields and every estate job reads the same answer.
    const open = (job, seed) => {
      const d = classDom(Object.assign({
        'ec-svc': job.svc, 'ec-gate-706': job.gate706 || '', 'ec-gate-dispute': job.gateDispute || '',
      }, seed || {}), {});
      const c = sandbox({ fns: EC_FNS, vars: EC_VARS, stubs: { document: d, jobs: [job] } });
      c.showEditClient(job.id);
      return { d, c, html: d.getElementById('edit-client-modal').innerHTML };
    };
    const JOB = { id: 7, hvlId: 'HVL-0007', name: 'Tripp Butler', fname: 'Tripp', lname: 'Butler',
                  svc: 'cleanout', deathDate: '2026-08-14', docLevel: 'formal', gate706: '',
                  docScope: 'capture' };

    const est = open(JOB);
    eq((est.html.match(/class="ec-req-probate"/g) || []).length, 5,
       'all five attorney fields carry the conditional mark');
    has(est.html, 'class="ec-req-probate" style="color:#A32D2D;display:none;"',
        'and it is withheld on an Estate Settlement, where the save accepts them blank');
    has(est.html, 'data-doclevel="formal"',
        'the documentation level rides on the readout — there is no control in this modal to read it from');
    has(est.html, 'value="2026-08-14"', 'the date of death is prefilled from the job');
    ok(est.d.getElementById('ec-gate-readout').innerHTML.length > 0,
       'the readout is painted when the modal OPENS, not only when a gate is touched');
    has(est.d.getElementById('ec-gate-readout').innerHTML, 'Strict Mode',
        'and an unanswered 706 on an Estate Settlement reads as Strict, on the screen somebody opened to find out why');

    // The read side of the parked level. A domStub element minted for an id is not the element
    // the innerHTML string describes, so the attribute cannot travel on its own here — it is
    // seeded, and the browser run proves the two halves meet. Without the fallback a Formal set
    // by hand reads back as merely the floor.
    const hand = open(Object.assign({}, JOB, { gate706: 'no' }),
                      { 'ec-gate-readout': { dataset: { doclevel: 'formal' } } });
    has(hand.d.getElementById('ec-gate-readout').innerHTML, 'set by hand',
        'a documentation level set by hand is reported as such, off the level parked on the readout');

    const pro = open(Object.assign({}, JOB, { svc: 'probate' }));
    has(pro.html, 'class="ec-req-probate" style="color:#A32D2D;"',
        'the marks come back on probate');
    has(pro.html, '(all fields required)', 'and the heading says so');

    // Changing the service mid-edit moves the floor: contested probate is formal by rule.
    const t = open(Object.assign({}, JOB, { svc: 'cleanout', gate706: 'no', docLevel: '' }));
    const before = t.d.getElementById('ec-gate-readout').innerHTML;
    lacks(before, 'Strict Mode', 'an Estate Settlement with the 706 answered No is not in Strict Mode');
    t.d.getElementById('ec-svc').value = 'contested_probate';
    t.c.ecToggleProbate();
    has(t.d.getElementById('ec-gate-readout').innerHTML, 'Strict Mode',
        'switching to contested probate repaints the readout rather than leaving the old answer standing');
    eq(t.d.getElementById('ec-probate-fields').style.display, 'block',
       'and brings the court record with it');
  }

  group('the gate readout is reachable wherever the gates are');
  {
    // It used to live inside #probate-fields while `i-doclevel` sat outside it, so on an
    // Estate Settlement the dropdown was disabled with the explanation rendering into a
    // hidden div — a control that refuses you and cannot say why.
    const estateOpen  = src.indexOf('id="estate-fields"');
    const probateOpen = src.indexOf('id="probate-fields"');
    const readout = src.indexOf('id="i-gate-readout"');
    const gate = src.indexOf('id="i-gate-706"');
    ok(readout > gate, 'the readout follows the gates it explains');
    ok(readout > estateOpen && readout < probateOpen, 'and is shown on every service the gates are');
  }
};
