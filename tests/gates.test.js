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
const { sandbox } = require('./harness');

const FNS = [
  '_gateYes', '_gate706', 'gateDispute', 'docLevelFloor', 'docLevelFloorReason',
  'resolveDocLevel', 'isFormalDoc', 'invAppraisalThreshold', 'invListingThreshold',
  'isDecedentJob', 'invNeedsAppraisal', 'invIsIntrinsic', 'invCatMeta',
  'docStandardEffect',
];
const VARS = [
  'DECEDENT_SERVICES', 'INV_APPRAISAL_THRESHOLD', 'INV_APPRAISAL_THRESHOLD_DISPUTED',
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
    const f = src.slice(src.indexOf('function onDocGateChange()'));
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
    const f = src.slice(src.indexOf('function onDocGateChange()'));
    const body = f.slice(0, f.indexOf('\nfunction resolveDocLevel'));
    has(body, 'sel.disabled = true', 'the control disables itself when the gates force Formal');
    has(body, 'sel.title = reason', 'and says why on hover');
    has(body, "sel.disabled = false", 'and re-enables when the floor lifts');
    has(body, "document.getElementById('i-svc')",
        'it reads the real service field — i-service does not exist and would silently disable G2');
  }
};
