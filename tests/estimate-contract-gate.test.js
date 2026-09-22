'use strict';
// REFUSE TO PRICE UNTIL THE CONTRACT QUESTIONS ARE ANSWERED (2026-09-22).
//
// Step 8 of ESTATE_SCOPE_SPEC.md, Decision 3: "Refuse to price until answered. Build Estimate
// will not save or submit without it."
//
// ⚠⚠ THE DEFECT IS NOT "A FIELD IS BLANK" — IT IS THAT THE BLANK IS THE MOST EXPENSIVE ANSWER,
// TAKEN SILENTLY. `estimateDocScope` falls back to `full` on an estimate carrying no tier, so
// an unanswered job prices IDENTICALLY TO THE TOP TIER. Driven on the real form before the gate
// existed, a 3,500 sqft probate estate with the same six rooms scored:
//
//     tier (blank)   → scope full      $17,700    60 TC / 87 PS
//     tier none      → scope none      $11,600    40 TC / 56 PS
//     tier contents  → scope capture   $14,400    48 TC / 72 PS
//     tier values    → scope full      $17,700    60 TC / 87 PS
//
// $6,100 and 51 hours of documentation work quoted on a question nobody asked — and the estate
// agreement then promises it in writing, on a contract the personal representative signs.
//
// ⚠ WHAT THIS SUITE MUST NEVER BE "SIMPLIFIED" INTO: a check that the estimate refuses to
// CALCULATE. It does not, deliberately — see the `refuses to commit, never to compute` group.

const { sandbox, domStub, source } = require('./harness');

const G_FNS = ['estimateContractMissing', 'estimateContractBlocker', 'estimateContractNotice',
  'isDecedentJob', 'invFiduciaryMode', 'matterTypeOf', 'svcHasDocStep', 'docTierOf', 'docTierDef',
  'docTierScope', 'docTierScopeMirror', 'estimateDocScope', 'docScopeDef', '_docScopeIntakeNote'];
const G_VARS = ['ESTIMATE_CONTRACT_FIELDS', 'MATTER_TYPES', 'DOC_TIERS', 'DOC_TIER_FROM_SCOPE',
  'DECEDENT_SERVICES', 'JOB_STEPS', 'DOC_SCOPES'];

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();
  const c = sandbox({ fns: G_FNS, vars: G_VARS });

  // A probate estate with everything intake asks for EXCEPT the two contract answers.
  const job = (o) => Object.assign({
    id: 1, svc: 'cleanout', svcLabel: 'Estate Settlement', sqft: 3500,
    deathDate: '2026-08-14', executor: 'Tripp Butler'
  }, o || {});

  // Line-based, never /\/\*[\s\S]*?\*\//: `accept="image/*"` in this file reads as a comment
  // opener to that regex and swallows ~170KB of source.
  const live = (t) => t.split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
  const body = (name) => {
    const from = src.indexOf('function ' + name + '(');
    if (from < 0) return '';
    const rest = src.slice(from + 10);
    const end = rest.indexOf('\nfunction ');
    return end < 0 ? rest : rest.slice(0, end);
  };

  // ───────────────────────────────────────────────────────────────────────────
  group('the blank is the top tier, which is why it is refused rather than defaulted');
  {
    // The measurement above, pinned at the two ends the engine reads. If this ever stops
    // being true the gate is arguably optional; while it is true the gate is not.
    eq(c.estimateDocScope({ svc: 'cleanout' }), 'full',
       'an estimate with no tier prices at the FULL documentation scope');
    eq(c.docTierScope(''), 'full', 'and the tier projection agrees — a blank reads as full');
    eq(c.docTierScope('none'), 'none', 'against `none`, which is the cheapest answer');
    eq(c.docTierScope('contents'), 'capture', 'and `contents`, which is the middle one');
    // ⚠ THE CONVERSE, so nobody "fixes" the fallback instead of the gate. Defaulting a blank
    // to `none` would under-quote every estate whose attorney does want the inventory, which
    // is a worse failure than over-quoting: we would be contractually on the hook for work we
    // did not price. The answer is to ask, not to pick a cheaper guess.
    // ⚠ THIS SLOT HELD AN ASSERTION THAT COULD NOT FAIL — a `has(bodyA + bodyB, 'full')` over
    // a concatenation that contains the word either way. Replaced with the two things that
    // actually move: the fallback's VALUE, and the note telling the next reader not to
    // "improve" it into a cheaper guess.
    eq(c.docTierScope('appraisals'), 'full',
       'the top tier and a blank tier really do land on the same scope, which is the defect');
    has(src, 'DO NOT\n// "FIX" THIS FALLBACK', 'and the comment says so in as many words');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('two questions, two tests, and they stay separate');
  {
    eq(c.ESTIMATE_CONTRACT_FIELDS.map((f) => f.key), ['matter', 'tier'],
       'two fields, ordered as the intake form asks them');

    // ⚠ THEY SELECT THE SAME THREE SERVICES TODAY AND THAT IS PINNED IN BOTH DIRECTIONS —
    // not so they can be collapsed, but so a catalogue change that splits them is LOUD.
    const svcs = Object.keys(c.JOB_STEPS);
    const tierAsks = svcs.filter((s) => c.ESTIMATE_CONTRACT_FIELDS[1].asks({ svc: s }));
    const mattAsks = svcs.filter((s) => c.ESTIMATE_CONTRACT_FIELDS[0].asks({ svc: s }));
    eq(tierAsks.sort(), ['cleanout', 'contested_probate', 'probate'].sort(),
       'the tier is asked on the three services that price a documentation step');
    eq(mattAsks.sort(), tierAsks.slice().sort(),
       'and the matter type on the same three today — via a DIFFERENT predicate');
    lacks(live(body('estimateContractMissing')), 'DECEDENT_SERVICES',
       'neither test is inlined; both go through their own named predicate');

    // ⚠ THE `isDecedentJob` ARM IS LOAD-BEARING, NOT BELT-AND-BRACES. `matterTypeOf` returns
    // '' for every living-client job BY DESIGN, so without that guard this would refuse to
    // price every downsizing in the book over a question that does not apply to one.
    eq(c.matterTypeOf({ svc: 'downsizing' }), '',
       'a living job has no matter type, by design');
    eq(c.estimateContractMissing({ svc: 'downsizing' }), [],
       'and is therefore asked neither question');
    eq(c.estimateContractMissing({ svc: 'downsizing_move' }), [], 'nor is a Home Transition');
    eq(c.estimateContractMissing({ svc: 'home_cleanout' }), [], 'nor a Home Cleanout');
    eq(c.estimateContractMissing({ svc: 'prep' }), [], 'nor a Home Prep for Sale');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('the refusal — what it fires on, and what it says');
  {
    const both = c.estimateContractBlocker(job());
    ok(both, 'a probate estate with neither answer is blocked');
    eq(both.code, 'contract', 'under one code');
    eq(both.missing, ['matter', 'tier'], 'naming both fields');
    has(both.msg, 'How this estate is being administered', 'the message names the matter type');
    has(both.msg, 'What we are contracted to produce', 'and the tier');
    has(both.msg, 'two contract questions are', 'and counts them correctly');
    // ⚠ ONE TRIP, NOT TWO. A refusal that sends somebody to another screen, then refuses
    // again for a second field, is what makes people stop trusting the app.
    has(both.msg, 'Edit Client', 'it names where the answer is given');
    has(both.msg, 'the walkthrough on this screen is kept',
       'and says the walkthrough survives — which is the thing somebody would fear');

    const tierOnly = c.estimateContractBlocker(job({ matterType: 'probate' }));
    eq(tierOnly.missing, ['tier'], 'the matter answered on its own leaves the tier');
    has(tierOnly.msg, 'a contract question is', 'and the wording follows the count');
    lacks(tierOnly.msg, 'How this estate is being administered',
       'never naming a field that IS answered');

    const mattOnly = c.estimateContractBlocker(job({ docTier: 'values' }));
    eq(mattOnly.missing, ['matter'], 'and the tier answered on its own leaves the matter');

    eq(c.estimateContractBlocker(job({ matterType: 'trust', docTier: 'none' })), null,
       'both answered — no blocker');
    eq(c.estimateContractBlocker(job({ matterType: 'neither', docTier: 'contents' })), null,
       'and `neither` is a real answer, not an absence');
    eq(c.estimateContractBlocker(null), null,
       'no job at all is not this gate\'s refusal to make — the callers already have one');

    // An unrecognised value is not an answer. `matterTypeOf` and `docTierOf` both discard one,
    // so a typo in a saved record cannot buy its way past the question.
    eq(c.estimateContractBlocker(job({ matterType: 'probate', docTier: 'everything' })).missing,
       ['tier'], 'an unrecognised tier reads as unanswered');
    eq(c.estimateContractBlocker(job({ matterType: 'guardianship', docTier: 'values' })).missing,
       ['matter'], 'and so does an unrecognised matter type');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('a legacy job is NOT blank, and must not be caught by this');
  {
    // ⚠⚠ THE MIGRATION IS WHAT MAKES THIS GATE SAFE TO SHIP. `docTierOf` reads
    // DOC_TIER_FROM_SCOPE for a job recorded before the tier existed, so every estate already
    // on the books answers the tier question from its own pricing scope. Without that, turning
    // this on would refuse to re-open every estimate in the business at once.
    eq(c.docTierOf({ svc: 'cleanout', docScope: 'full' }), 'values',
       'a legacy job carrying docScope full migrates to the values tier');
    eq(c.estimateContractMissing({ svc: 'cleanout', docScope: 'full', matterType: 'probate' }), [],
       'and is therefore not blocked');
    eq(c.estimateContractMissing({ svc: 'cleanout', docScope: 'capture', matterType: 'probate' }), [],
       'nor is a capture-scope one');
    eq(c.estimateContractMissing({ svc: 'cleanout', docScope: 'none', matterType: 'probate' }), [],
       'nor a none-scope one');
    // The genuinely unanswered legacy job — no tier AND no scope — IS blocked, which is right:
    // the estimate is exactly where to ask it.
    eq(c.estimateContractMissing(job({ matterType: 'probate' })).map((f) => f.key), ['tier'],
       'a job carrying neither is asked');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('two voices over one list — the notice is not the refusal');
  {
    const n = c.estimateContractNotice(job());
    const b = c.estimateContractBlocker(job()).msg;
    ok(n !== b, 'the notice and the refusal are different sentences');
    has(n, 'Not a quote yet', 'the notice describes the number on screen, in the present tense');
    has(b, 'Not ready to quote', 'the refusal describes an action that was just declined');

    // ⚠ THE CONSEQUENCE SENTENCE IS THE HALF THAT MATTERS. "A field is empty" is a thing
    // nobody acts on; "this is pricing at the top of the scale and the agreement would promise
    // it" is. Without it this notice is decoration.
    has(n, 'top of the scale', 'and names what the blank is doing to the price');
    has(n, 'full inventory with estimated values', 'in the tier\'s own words');
    has(n, 'agreement would then promise', 'and what the contract would then say');

    // On a matter-only gap there is no tier consequence to state, and stating one would be
    // false — the price is correct on that job.
    const mattOnly = c.estimateContractNotice(job({ docTier: 'values' }));
    ok(mattOnly !== '', 'a matter-only gap still speaks');
    lacks(mattOnly, 'top of the scale', 'but claims nothing about the price, because nothing is wrong with it');

    eq(c.estimateContractNotice(job({ matterType: 'probate', docTier: 'values' })), '',
       'and an answered job says nothing at all');
    eq(c.estimateContractNotice({ svc: 'downsizing' }), '', 'nor does a living job');
    eq(c.estimateContractNotice(null), '', 'nor no job');

    // One list, two renderers: neither can name a field the other does not.
    lacks(live(body('estimateContractNotice')), 'isDecedentJob',
       'the notice does not re-derive which fields are missing');
    lacks(live(body('estimateContractBlocker')), 'svcHasDocStep',
       'nor does the refusal');
    has(live(body('estimateContractNotice')), 'estimateContractMissing(', 'both read the one list');
    has(live(body('estimateContractBlocker')), 'estimateContractMissing(', 'both read the one list');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('it cannot shadow the note already under the documentation dropdown');
  {
    // ⚠ `_docScopeIntakeNote` opens `if (!t) return ''`, so it goes silent for exactly the
    // blank tier this gate fills in. They report two different states — one a DISAGREEMENT
    // between intake and the estimate, the other that intake was never asked — and by
    // construction neither can shadow the other.
    eq(c._docScopeIntakeNote(job(), 'full'), '',
       'the disagreement note is silent on a job with no tier recorded');
    eq(c._docScopeIntakeNote(job(), 'none'), '',
       'whatever scope the estimate is priced at');
    ok(c.estimateContractNotice(job()) !== '', 'while the contract notice speaks');
    // And the converse: once a tier IS recorded the contract notice goes quiet and the
    // disagreement note takes over.
    const answered = job({ matterType: 'probate', docTier: 'values' });
    eq(c.estimateContractNotice(answered), '', 'an answered tier silences the contract notice');
    has(c._docScopeIntakeNote(answered, 'none'), 'Intake recorded',
       'and the disagreement note is the one that speaks when the estimate overrides it');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('three doors, one definition');
  {
    // The same net `unscoredRoomNames` already carries. Save, Submit and the manager PIN are
    // the three places a price is COMMITTED, and a fourth must not be added reading its own
    // copy of the rule.
    [['saveEstimateAndPreview', 'Save'],
     ['estimateSubmitBlocker', 'Submit'],
     ['checkPin', 'the manager PIN'],
    ].forEach(([sig, what]) => {
      has(live(body(sig)), 'estimateContractBlocker(', `${what} reads the shared definition`);
    });
    eq((src.match(/estimateContractBlocker\(/g) || []).length, 4,
       'and nothing else calls it — three readers plus the definition itself');
    lacks(live(body('saveEstimateAndPreview')), 'docTierOf(',
       'Save never re-tests the tier itself');
    lacks(live(body('checkPin')), 'matterTypeOf(',
       'nor does the manager PIN re-test the matter type');

    // ⚠ Submit takes the job as an ARGUMENT rather than resolving it off `est.jobId` inside,
    // the rule `jobSchedule` already follows: reaching for the `jobs` global would cost the
    // blocker the argument-only property every test of it depends on.
    lacks(live(body('estimateSubmitBlocker')), 'jobs.find',
       'the blocker never reaches for the jobs global');

    // ⚠⚠ DRIVEN, NOT GREPPED, AND THE FIRST VERSION OF THIS COULD NOT FAIL. It asserted
    // `has(submitForApproval, 'currentEstimate.jobId')` — which matched the SECOND lookup six
    // lines below, the one that moves the status to `pending`, so the check stayed green with
    // the job dropped from the blocker entirely. That is the whole defect: a caller that
    // resolves nothing hands the blocker `undefined`, `estimateContractMissing` returns [],
    // and Submit sails past the gate on the one job it exists to stop.
    {
      const sub = sandbox({
        fns: ['submitForApproval', 'estimateSubmitBlocker', 'estimateContractBlocker',
              'estimateContractMissing', 'isDecedentJob', 'matterTypeOf', 'matterDef',
              'invFiduciaryMode', 'docTierOf', 'docTierDef', 'svcHasDocStep',
              'unscoredRoomNames', 'estimateNoteGaps'],
        vars: ['ESTIMATE_CONTRACT_FIELDS', 'MATTER_TYPES', 'DOC_TIERS', 'DOC_TIER_FROM_SCOPE',
               'DECEDENT_SERVICES', 'REQUIRE_WALKTHROUGH_NOTES', 'JOB_STEPS'],
        stubs: {
          showFB: (id, kind, msg) => { spoke.push({ id, kind, msg }); },
          saveEstimateState: () => { wrote.push('est'); },
          saveJobs: () => { wrote.push('jobs'); },
          syncJobToSheets: () => {},
          updateApprovalUI: () => {},
          notifyManagerForApproval: () => { wrote.push('notified'); },
          confirm: () => true
        }
      });
      var spoke = [], wrote = [];
      // The estimate is complete and priced; the JOB is the thing missing its answers.
      sub.currentEstimate = { jobId: 7, havellinTotal: 25715, rooms: [{ name: 'Kitchen', st: 'in', vol: 3, cplx: 3 }] };
      sub.estimateSubmitted = false;
      sub.jobs = [{ id: 7, svc: 'probate' }];

      const out = sub.submitForApproval();
      ok(out && out.code === 'contract', 'Submit refuses a job with the contract questions unanswered');
      eq(sub.estimateSubmitted, false, 'and nothing is submitted');
      eq(wrote.length, 0, 'nothing is written and no manager is notified');
      ok(spoke.some(m => m.id === 'e-fb' && /contract question/.test(m.msg)),
         'and it says so on the estimate tab');

      // The converse, or the group above proves only that something refuses everything.
      spoke = []; wrote = [];
      sub.jobs = [{ id: 7, svc: 'probate', matterType: 'probate', docTier: 'values' }];
      const out2 = sub.submitForApproval();
      eq(out2, null, 'answer both and the same job submits');
      eq(sub.estimateSubmitted, true, 'and it really is submitted');
      ok(wrote.indexOf('notified') >= 0, 'and the manager is notified');
      eq(sub.jobs[0].status, 'pending', 'and the hoisted job is the one moved to pending');
    }

    // The refusal is PRINTED, on each of the three, where the person firing it is looking.
    has(live(body('saveEstimateAndPreview')), "showFB('e-fb','warn', _contractBlk.msg)",
       'Save prints it on the estimate tab');
    has(live(body('checkPin')), "pin-fb", 'the PIN modal prints it in the modal');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('it refuses to COMMIT a price, never to compute one');
  {
    // ⚠⚠ THE MOST IMPORTANT GROUP IN THIS SUITE. `calcAll` runs on every room tick, so gating
    // it would blank the screen under somebody mid-walkthrough — and the tier is answered
    // BETTER with a number in front of you, because "what do you want us to hand over" is a
    // conversation the concierge has with the attorney while looking at what each answer
    // costs. The number renders; the notice says it is not a quote.
    const calc = live(body('calcAll'));
    lacks(calc, 'estimateContractBlocker(', 'calcAll is not gated');
    lacks(calc, 'estimateContractMissing(', 'nor does it consult the list directly');
    has(calc, 'paintEstimateContractGate(', 'it paints the notice and carries on');

    // The slot exists and is painted from one place.
    eq((src.match(/e-contract-gate/g) || []).length, 2,
       'one slot in the markup, one reader of it');
    eq((src.match(/paintEstimateContractGate\(/g) || []).length, 2,
       'and one painter with one call site');
    has(live(body('paintEstimateContractGate')), 'estimateContractNotice(',
       'the painter renders the notice rather than composing its own sentence');
    has(live(body('paintEstimateContractGate')), 'esc(',
       'and escapes it — the labels are app constants, but this is a renderer');

    // ⚠ ITS OWN PAINTER RATHER THAN A LINE INSIDE `paintEstimateDocScope`, which returns early
    // on a service with no documentation step — where a matter-only gap would be painted
    // nowhere the day the two predicates diverge.
    lacks(live(body('paintEstimateDocScope')), 'estimateContractNotice(',
       'the documentation-scope painter does not carry it');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('Decision 3 is closed, and D-numbers it does not close');
  {
    has(src, 'ESTATE_SCOPE_SPEC.md', 'the gate cites the spec it implements');
    // The matter type has been REQUIRED at intake since step 2, so a job created through the
    // form today cannot reach here with it blank. This gate is what covers a legacy record and
    // a job re-typed onto an estate service on the walkthrough.
    has(src, "missing.push('How this estate is being administered')",
       'intake still refuses a blank matter type in its own right');
    // ⚠ AND THE TIER IS STILL DELIBERATELY OPTIONAL AT INTAKE. Step 3 recorded why: on the
    // first call the attorney may genuinely not have decided, and a guess printed onto an
    // agreement is worse than a blank. THIS is the gate that turns it into a requirement, at
    // the estimate, where the cost of the answer is incurred.
    lacks(src, "missing.push('What we are contracted to produce')",
       'while intake still accepts a blank tier, which is the whole reason this gate exists');
  }
};
