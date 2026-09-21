'use strict';
// Intake gates and Strict Mode (2026-08-24). The documentation level used to be a pure
// judgment call on a dropdown whose own hint named the real trigger — "a large estate
// that may owe estate tax". That is a fact somebody knows, so it is asked as a fact and
// the level is computed from it.
//
// ESCALATE-ONLY is the rule under test: the gates set a floor, the manual control may
// raise the level above that floor and can never lower it.

const fs = require('fs');
const path = require('path');
const { sandbox, domStub } = require('./harness');

const FNS = [
  '_gateYes', '_gate706', 'gateDispute', 'docLevelFloor', 'docLevelFloorReason',
  'docTierOf', 'docTierDef', 'docTierScope', 'svcHasDocStep',
  'resolveDocLevel', 'isFormalDoc', 'invAppraisalThreshold', 'invListingThreshold',
  'isDecedentJob', 'invFiduciaryMode', 'invNeedsAppraisal', 'invIsIntrinsic', 'invCatMeta',
  'docStandardEffect',
];
const VARS = [
  'DECEDENT_SERVICES', 'INV_APPRAISAL_THRESHOLD', 'INV_APPRAISAL_THRESHOLD_DISPUTED',
                  'DOC_TIERS', 'DOC_TIER_FROM_SCOPE', 'JOB_STEPS',
  'INV_LISTING_THRESHOLD_STRICT', 'INV_LISTING_THRESHOLD_STANDARD', 'INV_TAXONOMY',
];

module.exports = function ({ group, ok, eq, has, lacks }) {
  const ctx = sandbox({ fns: FNS, vars: VARS });
  const est = (over) => Object.assign({ svc: 'cleanout' }, over);   // Estate Settlement

  group('G2 — the 706 gate, where unknown counts as yes');
  {
    eq(ctx.docLevelFloor(est({ gate706: 'yes' })), 'formal', 'a 706 being filed forces Formal');
    eq(ctx.docLevelFloor(est({ gate706: '' })), 'formal',
       'UNANSWERED forces Formal too — an estate that might file one is documented as though it will');
    eq(ctx.docLevelFloor(est({ gate706: 'no' })), 'standard', 'only an explicit no lifts it');

    // A living-client job cannot owe estate tax, so the gate must not fire there.
    eq(ctx.docLevelFloor({ svc: 'downsizing', gate706: '' }), 'standard',
       'the 706 gate is decedent work only — it must not catch a downsizing');
    eq(ctx.docLevelFloor({ svc: 'home_cleanout', gate706: '' }), 'standard',
       'nor a Home Cleanout, which is living-client work by definition');
  }

  group('G6 — dispute');
  {
    eq(ctx.docLevelFloor(est({ gate706: 'no', gateDispute: 'yes' })), 'formal',
       'a dispute forces Formal even with no 706');
    ok(ctx.gateDispute({ svc: 'contested_probate' }),
       'contested probate counts as disputed without anyone ticking the box');
    eq(ctx.docLevelFloor({ svc: 'contested_probate', gate706: 'no' }), 'formal',
       'and contested probate is always Formal regardless');
  }

  group('escalate-only: the manual control may raise, never lower');
  {
    // Gates say standard → the dropdown decides.
    const relaxed = est({ gate706: 'no' });
    eq(ctx.resolveDocLevel(relaxed), 'standard', 'standard by default when the gates are clear');
    eq(ctx.resolveDocLevel(est({ gate706: 'no', docLevel: 'formal' })), 'formal',
       'and can be RAISED by hand');

    // Gates say formal → the dropdown cannot pull it back down. This is the rule.
    eq(ctx.resolveDocLevel(est({ gate706: 'yes', docLevel: 'standard' })), 'formal',
       'a manual Standard CANNOT lower a gated Formal');
    eq(ctx.resolveDocLevel(est({ gateDispute: 'yes', gate706: 'no', docLevel: 'standard' })), 'formal',
       'nor can it lower one forced by a dispute');
    eq(ctx.resolveDocLevel({ svc: 'contested_probate', docLevel: 'standard' }), 'formal',
       'nor one forced by contested probate');
  }

  group('the appraisal threshold is now per job');
  {
    eq(ctx.invAppraisalThreshold(est({ gate706: 'no' })), 3000, 'ordinary estates stay at $3,000');
    eq(ctx.invAppraisalThreshold(est({ gateDispute: 'yes' })), 500, 'a dispute drops it to $500');
    eq(ctx.invAppraisalThreshold({ svc: 'contested_probate' }), 500,
       'contested probate drops it without the box being ticked');
    eq(ctx.invAppraisalThreshold(null), 3000, 'a missing job falls back to the ordinary threshold');

    // The threshold has to actually reach the item test, or the gate is decorative.
    const rug = { category: 'Rugs & Carpets', fmv: '900' };
    ok(!ctx.invNeedsAppraisal(rug, est({ gateDispute: 'no' })),
       'a $900 rug does not need a specialist on an ordinary estate');
    ok(ctx.invNeedsAppraisal(rug, est({ gateDispute: 'yes' })),
       'but it DOES once a dispute is recorded — this is the whole point of G6');
  }

  group('every call site passes a job');
  {
    // A caller that omits the job silently evaluates a disputed estate at $3,000 and
    // under-flags exactly the estate where under-flagging is least affordable.
    const src = fs.readFileSync(path.join(__dirname, '..', 'havellin.html'), 'utf8');
    const bare = src.match(/invNeedsAppraisal\(\s*[A-Za-z_$][\w$]*\s*\)/g) || [];
    eq(bare, [], 'no invNeedsAppraisal call takes a single argument');
  }

  group('listing threshold: two modes');
  {
    eq(ctx.invListingThreshold(est({ gate706: 'no' })), 1000,
       '$1,000 on an estate filing no 706 — §733.604 asks for reasonable detail, not the reg');
    eq(ctx.invListingThreshold(est({ gate706: 'yes' })), 100,
       '$100 in Strict Mode — Treas. Reg. 20.2031-6(a) caps a grouped lot at $100 an article');
    eq(ctx.invListingThreshold(est({ gate706: '' })), 100, 'and unknown is Strict, so $100');
  }

  group('the reason is stated, not left to be reverse-engineered');
  {
    has(ctx.docLevelFloorReason(est({ gate706: 'yes' })), '706',
        'a 706 floor says so');
    has(ctx.docLevelFloorReason(est({ gate706: '' })), 'unanswered',
        'an unanswered 706 says it is unanswered and how to lift it');
    has(ctx.docLevelFloorReason(est({ gateDispute: 'yes' })), '$500',
        'a dispute names the new threshold');
    eq(ctx.docLevelFloorReason(est({ gate706: 'no' })), '',
       'no floor, no reason');
  }

  group('the readout says what the level COSTS, not just what it is called');
  {
    // "Strict Mode" asserted on its own is a label. Both numbers it moves have to be on
    // the screen, or the concierge cannot tell what changed — which is what "I'm
    // confused" was about.
    const strict = ctx.docStandardEffect(est({ gate706: '' }));
    has(strict, '$100',   'Strict Mode names the $100 individual-listing threshold');
    has(strict, '$3,000', 'and the specialist threshold that still applies');

    const disputed = ctx.docStandardEffect(est({ gate706: 'no', gateDispute: 'yes' }));
    has(disputed, '$100', 'a dispute is Strict too, so listing is still $100');
    has(disputed, '$500', 'and the specialist threshold drops');

    const standard = ctx.docStandardEffect(est({ gate706: 'no' }));
    has(standard, '$1,000', 'Standard lists individually above $1,000');
    has(standard, '$3,000', 'and routes to a specialist at $3,000');
    lacks(standard, '$100,', 'and never quotes the Strict figure');
  }

  group('a normal starting state is not painted as an error');
  {
    const src = fs.readFileSync(path.join(__dirname, '..', 'havellin.html'), 'utf8');
    const f = src.slice(src.indexOf('function onDocGateChange('));
    const body = f.slice(0, f.indexOf('\nfunction resolveDocLevel'));
    // 706 defaults to Unknown, so EVERY new estate job opens in Strict Mode. Amber on all
    // of them reads as something being wrong. Amber is reserved for the one case with an
    // outstanding question to chase.
    has(body, "var open = !gateDispute(draft) && !String(draft.gate706 || '')",
        'amber is scoped to the unanswered 706');
    has(body, "(open ? 'a-warn' : 'a-info')",
        'a settled 706, a recorded dispute and contested probate read as information');
    has(body, 'esc(effect)', 'and every branch states the numbers');
  }

  group('the hint does not describe a state the answer has not selected');
  {
    const src = fs.readFileSync(path.join(__dirname, '..', 'havellin.html'), 'utf8');
    has(src, 'Ticking it drops the specialist-appraisal threshold',
        'the dispute hint reads as a consequence of ticking, not as the current threshold');
    lacks(src, '. Drops the specialist-appraisal threshold',
          'the bare "Drops ..." wording is gone — it read as a claim about the current state');
  }

  group('the dropdown cannot pretend to lower it');
  {
    const src = fs.readFileSync(path.join(__dirname, '..', 'havellin.html'), 'utf8');
    const f = src.slice(src.indexOf('function onDocGateChange('));
    const body = f.slice(0, f.indexOf('\nfunction resolveDocLevel'));
    has(body, 'sel.disabled = true', 'the control disables itself when the gates force Formal');
    has(body, 'sel.title = reason', 'and says why on hover');
    has(body, "sel.disabled = false", 'and re-enables when the floor lifts');
  }

  // ⚠ WAS A SOURCE PIN ON `document.getElementById('i-svc')`, WHICH BROKE ON A TRUE CHANGE —
  // the function is keyed on a prefix now so Edit Client can reuse it, and the literal moved.
  // The requirement was never the byte sequence: it is that the readout reads the REAL service
  // field, because reading one that does not exist resolves to '' and silently disables G2 on
  // every estate job. Driven, so a renamed id fails rather than a renamed expression.
  group('the readout reads the real form, not an id that resolves to nothing');
  {
    const run = (seed) => {
      const d = domStub(seed);
      const c = sandbox({ fns: FNS.concat(['onDocGateChange', 'esc']), vars: VARS, stubs: { document: d } });
      c.onDocGateChange();
      return d.getElementById('i-gate-readout').innerHTML;
    };
    // Estate Settlement, 706 unanswered: unknown counts as yes, so this is Strict Mode.
    // If the service field were misnamed this comes back Standard and nothing says so.
    has(run({ 'i-svc': 'cleanout' }), 'Strict Mode',
        'an Estate Settlement with the 706 unanswered reads as Strict — G2 really fired');
    has(run({ 'i-svc': 'cleanout' }), 'a-warn', 'and amber, because the question is still open');
    has(run({ 'i-svc': 'cleanout', 'i-gate-706': 'no' }), '$1,000',
        'answering it No lifts the floor and the readout states the Standard numbers');
    lacks(run({ 'i-svc': 'cleanout', 'i-gate-706': 'no' }), 'Strict Mode',
          'and stops claiming Strict');
    has(run({ 'i-svc': 'cleanout', 'i-gate-dispute': 'yes' }), 'a-info',
        'a recorded dispute is a settled state, not an open question');
    eq(run({ 'i-svc': 'downsizing' }).indexOf('Strict Mode'), -1,
       'a living-client job is never dragged into Strict Mode by an unanswered 706');
  }

  // The SAME function serves Edit Client. One estate, one question — a second copy written
  // beside that modal is how the two forms come to answer it differently.
  group('one function, two forms');
  {
    // ⚠ THE FIXTURE HAS TO MAKE THE TWO PREFIXES DISAGREE, or a function that read `i-` and
    // wrote `ec-` passes: blank intake fields resolve to Standard, and so did the first version
    // of this case. An Estate Settlement with the 706 unanswered is Strict; a blank service is
    // not. That is the difference a hardcoded prefix cannot fake. (Caught by reverting.)
    const d = domStub({ 'ec-svc': 'cleanout' });
    const c = sandbox({ fns: FNS.concat(['onDocGateChange', 'esc']), vars: VARS, stubs: { document: d } });
    c.onDocGateChange('ec');
    has(d.getElementById('ec-gate-readout').innerHTML, 'Strict Mode',
        'the ec prefix reads the ec fields — the intake fields beside them are blank and say Standard');
    eq(d.getElementById('i-gate-readout').innerHTML, '',
       'and never touches the intake readout');
    eq(d.getElementById('i-doclevel').disabled, false,
       'nor disables the intake dropdown from a modal that is not on screen');

    // Edit Client has no documentation-level dropdown, so the manual level it cannot read is
    // passed in. Without it a hand-set Formal reads back as merely the floor.
    const d2 = domStub({ 'ec-svc': 'cleanout', 'ec-gate-706': 'no' });
    const c2 = sandbox({ fns: FNS.concat(['onDocGateChange', 'esc']), vars: VARS, stubs: { document: d2 } });
    c2.onDocGateChange('ec', 'formal');
    has(d2.getElementById('ec-gate-readout').innerHTML, 'set by hand',
        'a documentation level set by hand is reported as such, not as the floor');
    eq(d2.getElementById('ec-doclevel').disabled, false,
       'and nothing is disabled — there is no such control in that modal to disable');
  }
};
