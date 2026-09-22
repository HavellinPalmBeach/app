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
  'docTierOf', 'docTierDef', 'docTierScope', 'docTierScopeMirror', 'svcHasDocStep',
  'resolveDocLevel', 'isFormalDoc', 'invAppraisalThreshold', 'isDecedentJob', 'invFiduciaryMode', 'invNeedsAppraisal', 'invIsIntrinsic', 'invCatMeta',
  'docStandardEffect'
];
const VARS = [
  'DECEDENT_SERVICES', 'INV_APPRAISAL_THRESHOLD', 'INV_APPRAISAL_THRESHOLD_DISPUTED',
                  'DOC_TIERS', 'DOC_TIER_FROM_SCOPE', 'JOB_STEPS',
  'INV_TAXONOMY'
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

  group('the listing threshold is RETIRED, and the claim must not come back');
  {
    // ⚠ THE REQUIREMENT IS THE CONVERSE NOW. `invListingThreshold` had exactly one reader in
    // 34,000 lines — `docStandardEffect` — so the only thing the app ever did with an itemisation
    // floor was tell somebody it had one. Nothing itemised anything above it and no control let a
    // person apply it by hand: a lot row carries one name, one value and one quantity, so there is
    // no per-article data inside it for a threshold to split. §8 of ESTATE_SCOPE_SPEC.md records
    // that Florida sets no statutory itemisation floor — the $100 / $1,000 were house rules being
    // presented as a documentation standard, in four documents.
    eq(typeof ctx.invListingThreshold, 'undefined', 'the function is gone, not left returning a number');

    // The net is the RULE rather than today's two names: no live line may quote an itemisation
    // floor in any wording. Comment-stripped and LINE-BASED — a /\*[\s\S]*?\*/ stripper eats
    // ~170KB of this file because of accept="image/*" — and the retirement note has to QUOTE the
    // retired wording to be worth reading, so a raw needle would trip on the explanation.
    const live = fs.readFileSync(path.join(__dirname, '..', 'havellin.html'), 'utf8')
      .split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
    ok(live.length > 400000, 'the stripper did not eat the file');
    has(live, 'function docStandardEffect', 'and the function under test is still in it');
    lacks(live, 'INV_LISTING_THRESHOLD', 'no constant survives');
    lacks(live, 'invListingThreshold', 'and nothing calls the retired helper');
    lacks(live, 'listed individually', 'no live line claims items are listed individually above a floor');
    lacks(live, 'individual-listing', 'nor names an individual-listing threshold');
  }

  group('the reason is stated, not left to be reverse-engineered');
  {
    has(ctx.docLevelFloorReason(est({ gate706: 'yes' })), '706',
        'a 706 floor says so');
    has(ctx.docLevelFloorReason(est({ gate706: '' })), 'unanswered',
        'an unanswered 706 says it is unanswered and how to lift it');
    // ⚠ RESTATED. This asserted the reason names the $500, which it did — and so did
    // `docStandardEffect` two sentences later in the SAME alert, so one number appeared in one
    // box twice. The requirement is that the dispute is named as the cause; the number is stated
    // once, in the effect, where it is attributed correctly.
    has(ctx.docLevelFloorReason(est({ gateDispute: 'yes' })), 'dispute',
        'a dispute says a dispute is why');
    lacks(ctx.docLevelFloorReason(est({ gateDispute: 'yes' })), '$',
        'and quotes no figure, because the effect carries it');

    // ⚠ SAME RULE ON THE TIER ARM. Its tail read "so every flagged item is held to the
    // specialist standard until it is appraised or waived" — which `docStandardEffect` now says
    // in the same box. The reason says WHY the floor is set; the effect says what it does.
    const tierReason = ctx.docLevelFloorReason(est({ gate706: 'no', docTier: 'appraisals' }));
    has(tierReason, 'Inventory + appraisals', 'the tier arm names the tier');
    lacks(tierReason, 'appraised or waived', 'and does not restate what the effect already says');
    eq(ctx.docLevelFloorReason(est({ gate706: 'no' })), '',
       'no floor, no reason');
  }

  group('the readout says what the level really gates');
  {
    // ⚠⚠ IT USED TO NAME TWO NUMBERS AND THE LEVEL MOVED NEITHER. Driven on the real chain:
    // formal/$100/$3,000 on an unanswered 706, standard/$1,000/$3,000 on a no, formal/$100/$500 on
    // a dispute. The listing floor was the only figure that moved with the level and it was
    // enforced by nothing; the specialist figure is real but is moved by the DISPUTE gate — the
    // SAME $3,000 on both rows of the commonest case. So the box explaining a forced level
    // explained it with one fiction and one number the level is not responsible for.
    const strict = ctx.docStandardEffect(est({ gate706: '' }));
    has(strict, 'DRAFT',            'Strict Mode names the schedules held at DRAFT');
    has(strict, 'blocks rather than prompts', 'the guardrail blocking rather than nudging');
    has(strict, 'chain of custody', 'chain of custody becoming mandatory');
    has(strict, 'court-grade records', 'and the client estimate\'s court-grade records list');
    has(strict, '$3,000',           'plus the specialist threshold, which is real and enforced');
    lacks(strict, 'listed individually', 'and never the itemisation floor it used to claim');
    lacks(strict, '$100',           'nor the $100 figure');

    // The four claims are each measured at a real reader: printCourtInventory / printTrustSchedule
    // hold at DRAFT on `formal && guard.length`, _renderAppraisalGuardrail paints a-err over
    // a-warn, planTaskCtx.formal drives custodyMandatory, and _cePhases' `deep` adds the records
    // list. It deliberately does NOT claim the client Job Plan section deepens — that function
    // declared a `deep` local and never read it.
    const src = fs.readFileSync(path.join(__dirname, '..', 'havellin.html'), 'utf8');
    lacks(src, "var deep = (typeof isFormalDoc === 'function') ? isFormalDoc(_j) : false;",
          'the dead reader is gone, so the sentence is not overstating the level\'s reach');

    const standard = ctx.docStandardEffect(est({ gate706: 'no' }));
    has(standard, 'amber prompt rather than a block', 'Standard says a flag is a prompt');
    has(standard, '$3,000', 'and still routes to a specialist at $3,000');
    lacks(standard, '$1,000', 'and no longer quotes a listing floor');
    lacks(standard, 'DRAFT',  'nor claims a schedule is held');

    // ⚠ ONE NUMBER, ONE PLACE. The reason's dispute arm used to quote the threshold too, so it
    // appeared twice in one alert. It is stated in the effect and nowhere else.
    const disputed = ctx.docStandardEffect(est({ gate706: 'no', gateDispute: 'yes' }));
    has(disputed, '$500', 'a dispute lowers the specialist threshold');
    has(disputed, 'the recorded dispute is what lowers that, not this level',
        'and the sentence attributes it to the dispute rather than to the level');
    lacks(ctx.docLevelFloorReason(est({ gateDispute: 'yes' })), '$500',
          'the reason no longer restates it');

    // ⚠ CONTESTED PROBATE HAS NO RECORDED DISPUTE. `gateDispute` is true on the service key
    // alone, so a flat "the recorded dispute" is false on the one matter type whose reader is
    // most likely to be counsel.
    const contested = ctx.docStandardEffect(est({ svc: 'contested_probate', gate706: 'no' }));
    has(contested, 'the contest is what lowers that', 'contested names the contest');
    lacks(contested, 'recorded dispute', 'and never a dispute nobody recorded');
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
    // ⚠ RESTATED. This pinned '$1,000', the retired listing floor, as the proof that the floor
    // had lifted — so it was asserting the fiction. The requirement is that the readout says what
    // Standard means, which is that a flag prompts rather than blocks.
    has(run({ 'i-svc': 'cleanout', 'i-gate-706': 'no' }), 'Standard documentation',
        'answering it No lifts the floor and the readout says so');
    has(run({ 'i-svc': 'cleanout', 'i-gate-706': 'no' }), 'amber prompt rather than a block',
        'and states what Standard actually means for a flagged item');
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
