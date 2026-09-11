'use strict';
// What's in the house — the two intake-call questions and the seven-row checklist that
// replaced the single Notes box on Client Intake (2026-09-10).
//
// WHAT THIS SUITE IS ACTUALLY GUARDING, because it is not the form. Asking a widow on the
// phone where her husband kept the cash and then not telling the two people emptying the
// house is worse than never asking — the person who asked believes it was passed on. So
// the requirement is not "intake stores an answer", it is "the answer reaches the crew":
// every ticked row and both free-text answers have to come back out on the Job Plan, which
// is what the crew has open in the house and what printJobPlan puts on paper.
//
// The other half is the catalogue. ONE array feeds four surfaces (intake, Edit Client, the
// Job Plan brief, the dashboard). A hand-written second copy is how the fee table and the
// room grid drifted apart, how PRICING_REF and the agreement's svcMap each grew their own
// service names, and how the Edit Client modal kept a hardcoded service list that a rename
// missed. There is a check below that fails if any label is written down twice.

const { sandbox, source } = require('./harness');

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();

  // The REAL esc, not the harness's stub. The stub does not escape apostrophes, and a
  // stub that does not match source is what hid the `&amp;amp;` defect in the estimate
  // email — the rendering assertions below are worthless against an approximation.
  const ctx = sandbox({
    vars: ['HOUSE_FLAGS'],
    fns: [
      'esc',
      'houseFlagsOf', 'activeHouseFlags', 'standingFlagLines', 'jobHasStandingFlags',
      'houseFlagSummary', 'houseFlagInputsHtml', '_houseFlagRowClass', 'standingFlagsBlock',
    ],
  });
  const { HOUSE_FLAGS } = ctx;

  // A job as intake would have written it: firearms and cash ticked, both questions answered.
  const FULL = {
    mustFind: 'Grandmother\'s ring — bedroom closet, small blue box',
    safetyNotes: 'Two large dogs, and the pool cage steps are rotten',
    houseFlags: {
      firearms: { on: true, note: 'Two, hall closet safe. Only the PR may take possession.' },
      cash:     { on: true, note: 'Maybe $2k, freezer and the desk drawer' },
      access:   { on: false, note: 'typed then unticked' },
    },
  };
  // A job created before this shipped. Nobody was asked, and that is a real answer.
  const LEGACY = { id: 7, name: 'Ellsworth', notes: 'Old free-text note' };

  group('the catalogue — seven rows, and every one of them earns a notes box');
  {
    eq(HOUSE_FLAGS.length, 7, 'seven rows, the seven Anthony named');
    eq(HOUSE_FLAGS.map((f) => f.key),
       ['cash', 'valuables', 'firearms', 'safes', 'documents', 'sentimental', 'access'],
       'in the order they are asked on the call');
    eq(new Set(HOUSE_FLAGS.map((f) => f.key)).size, 7, 'keys are distinct — a collision would overwrite a row silently');

    // `ask` is the whole value of a row. "Firearms ✓" tells a crew in the driveway nothing.
    HOUSE_FLAGS.forEach((f) => {
      ok(f.label && f.label.trim().length > 0, `${f.key} has a label`);
      ok(f.ask && f.ask.trim().length > 0, `${f.key} prompts for what to write down`);
    });

    // Firearms is the only red row, and red has to keep meaning "stop, do not touch".
    eq(HOUSE_FLAGS.filter((f) => f.severity === 'err').map((f) => f.key), ['firearms'],
       'firearms is the only err-severity row');
    eq(HOUSE_FLAGS.filter((f) => f.crewRule).map((f) => f.key), ['firearms'],
       'and the only one carrying a standing crew rule');
    has(HOUSE_FLAGS[2].crewRule, 'written authority',
        'the firearms rule is the app-wide one: nothing moves without written authority');
  }

  group('labels are PLAIN TEXT — the contract that stops a second round of escaping');
  {
    // Store `&`, render through esc() once. Storing `&amp;` and escaping again is exactly
    // what printed `Scoping &amp;amp; Sourcing` on a client's screen.
    HOUSE_FLAGS.forEach((f) => {
      lacks(f.label, '&amp;', `${f.key} label is not pre-escaped`);
      lacks(f.detail || '', '&amp;', `${f.key} detail is not pre-escaped`);
      lacks(f.ask, '&amp;', `${f.key} prompt is not pre-escaped`);
    });
    const html = ctx.houseFlagInputsHtml('i', FULL);
    has(html, 'Firearms &amp; ammunition', 'the rendered label escapes the ampersand once');
    lacks(html, '&amp;amp;', 'and never twice');
  }

  group('houseFlagsOf — a record from before this shipped reads as "nobody was asked"');
  {
    const legacy = ctx.houseFlagsOf(LEGACY);
    eq(Object.keys(legacy).length, 7, 'every catalogue row is present');
    ok(HOUSE_FLAGS.every((f) => legacy[f.key].on === false), 'nothing is ticked');
    ok(HOUSE_FLAGS.every((f) => legacy[f.key].note === ''), 'and no note is invented');

    eq(ctx.houseFlagsOf(null).firearms, { on: false, note: '' }, 'a missing job does not throw');
    eq(ctx.houseFlagsOf({ houseFlags: { cash: { on: true } } }).cash, { on: true, note: '' },
       'a tick with no note field normalises to a blank note');
    eq(ctx.houseFlagsOf({ houseFlags: { cash: { on: 1, note: 42 } } }).cash, { on: true, note: '' },
       'a non-string note is not passed through as a number');
    // A key that is no longer in the catalogue is dropped rather than carried forward.
    eq(Object.keys(ctx.houseFlagsOf({ houseFlags: { retired: { on: true } } })).indexOf('retired'), -1,
       'a stale key from an older catalogue is not resurrected');
  }

  group('activeHouseFlags — only what was ticked, in the order it was asked');
  {
    const on = ctx.activeHouseFlags(FULL);
    eq(on.map((f) => f.key), ['cash', 'firearms'], 'catalogue order, not the order the record happens to list');
    eq(on[0].severity, 'warn', 'cash is amber');
    eq(on[1].severity, 'err', 'firearms is red');
    has(on[0].note, 'freezer', 'the note rides along');
    eq(ctx.activeHouseFlags(LEGACY), [], 'nothing ticked, nothing returned');

    // Un-ticking hides the note; it does not delete it, and it must not resurrect the row.
    eq(ctx.activeHouseFlags({ houseFlags: { access: { on: false, note: 'gate code 4417' } } }), [],
       'a note left behind by an untick does not put the row back on the brief');

    eq(ctx.houseFlagSummary(FULL), 'Cash · Firearms & ammunition', 'the one-line list for the client table');
    eq(ctx.houseFlagSummary(LEGACY), '', 'and nothing at all when nothing is ticked');
  }

  group('standingFlagLines — THE POINT: what the crew is read before Day 1');
  {
    const lines = ctx.standingFlagLines(FULL);
    eq(lines.map((l) => l.label),
       ['Firearms & ammunition', 'Must find', 'Safety / handling', 'Cash'],
       'firearms first, then the two answers, then the rest in intake order');
    eq(lines[0].severity, 'err', 'the firearms line is the red one');
    has(lines[0].rule, 'Photograph it where it lies', 'and it carries the standing rule, not just the note');
    has(lines[1].note, 'Grandmother', 'question 1 reaches the crew verbatim');
    has(lines[2].note, 'rotten', 'so does question 2');
    ok(lines.slice(1).every((l) => l.severity === 'warn'), 'nothing else is painted red');

    ok(ctx.jobHasStandingFlags(FULL), 'the job has flags');
    eq(ctx.standingFlagLines(LEGACY), [], 'a job nobody was asked about produces no brief');
    ok(!ctx.jobHasStandingFlags(LEGACY), 'and reports none');

    // Blank answers must not produce empty rows — a brief padded with nothing is a brief
    // people stop reading.
    eq(ctx.standingFlagLines({ mustFind: '   ', safetyNotes: '\n' }), [],
       'whitespace-only answers are not answers');
    eq(ctx.standingFlagLines({ mustFind: 'Deeds in the study' }).length, 1, 'one answer, one line');

    // A tick with nothing written against it still prints, and says what to do about it —
    // the standing rule that a panel reporting a blocker carries its own fix. Silence here
    // is indistinguishable from never having been asked.
    const bare = ctx.standingFlagLines({ houseFlags: { safes: { on: true, note: '' } } });
    eq(bare.length, 1, 'a bare tick still reaches the crew');
    has(bare[0].note, 'no detail recorded', 'and admits the detail is missing');
    has(bare[0].note, 'ask the client before Day 1', 'and says how to clear it');
  }

  group('the checklist control — one renderer, two forms, ids that match what reads them');
  {
    ['i', 'ec'].forEach((p) => {
      const html = ctx.houseFlagInputsHtml(p, FULL);
      HOUSE_FLAGS.forEach((f) => {
        has(html, `id="${p}-hf-${f.key}"`, `${p}: ${f.key} checkbox id`);
        has(html, `id="${p}-hfn-${f.key}"`, `${p}: ${f.key} note id`);
        has(html, `id="${p}-hfr-${f.key}"`, `${p}: ${f.key} row id`);
        has(html, `onHouseFlagToggle('${p}','${f.key}')`, `${p}: ${f.key} is wired to the toggle`);
      });
    });

    // readHouseFlagInputs and clearHouseFlagInputs build the same ids from the same
    // catalogue. If the renderer's id shape ever moves, they have to move with it.
    const reader = src.slice(src.indexOf('function readHouseFlagInputs'));
    has(reader, "prefix + '-hf-' + f.key", 'the reader builds the checkbox id the same way');
    has(reader, "prefix + '-hfn-' + f.key", 'and the note id the same way');

    const html = ctx.houseFlagInputsHtml('ec', FULL);
    has(html, 'id="ec-hf-firearms" checked', 'a ticked row renders checked');
    lacks(html, 'id="ec-hf-valuables" checked', 'an unticked row does not');
    has(html, 'hf-row on-err', 'the ticked firearms row is painted red');
    has(html, 'freezer and the desk drawer', 'the stored note comes back into the box');
    // The note box is hidden until the row is ticked, so the form stays short.
    has(html, 'id="ec-hfw-firearms"', 'the ticked row exposes its note');
    has(html, 'id="ec-hfw-valuables" style="display:none;"', 'the unticked one keeps it collapsed');

    eq(ctx._houseFlagRowClass(HOUSE_FLAGS[0], false), 'hf-row', 'unticked row class');
    eq(ctx._houseFlagRowClass(HOUSE_FLAGS[0], true), 'hf-row on', 'ticked amber row class');
    eq(ctx._houseFlagRowClass(HOUSE_FLAGS[2], true), 'hf-row on-err', 'ticked firearms row class');
  }

  group('standingFlagsBlock — the brief itself');
  {
    eq(ctx.standingFlagsBlock(LEGACY), '',
       'a job with nothing recorded renders NOTHING, not an empty scary box');
    const block = ctx.standingFlagsBlock(FULL);
    has(block, 'Standing job flags', 'the heading matches the Phase 0 checkbox it answers');
    has(block, 'read to the crew before Day 1', 'and says what to do with it');
    has(block, 'sf-row sf-err', 'firearms renders on the red row');
    has(block, 'sf-rule', 'and its standing rule renders');
    has(block, 'Two large dogs', 'the safety answer is on the brief');
    // The notes are typed by a person on a phone call and go straight into innerHTML.
    has(ctx.standingFlagsBlock({ mustFind: '<script>x</script> & co' }), '&lt;script&gt;',
        'a typed note is escaped, not executed');
  }

  group('WIRED UP — the answers actually leave the intake form and reach the crew');
  {
    // Intake save. Without these the questions are asked and thrown away.
    const save = src.slice(src.indexOf('function saveIntake'), src.indexOf('function saveIntake') + 12000);
    has(save, "mustFind:", 'saveIntake stores the must-find answer');
    has(save, "safetyNotes:", 'saveIntake stores the safety answer');
    has(save, "houseFlags:  readHouseFlagInputs('i')", 'and the checklist, read through the shared reader');

    // The reset leak. INTAKE_FIELDS does `.value = ''`, which does NOTHING to a checkbox,
    // so without this the next client created in the same session inherits the last
    // client's firearms tick — the one place a stale value is dangerous, not just wrong.
    const reset = src.slice(src.indexOf('function resetIntakeFields'));
    has(reset, "clearHouseFlagInputs('i')", 'resetIntakeFields clears the checkboxes');
    has(src, "'i-mustfind', 'i-safety'", 'both textareas are on the shared INTAKE_FIELDS list');

    // Edit Client — same catalogue, and it writes back all three.
    const ec = src.slice(src.indexOf('function saveClientEdit'), src.indexOf('function saveClientEdit') + 9000);
    has(ec, 'job.mustFind', 'Edit Client saves the must-find answer');
    has(ec, 'job.safetyNotes', 'Edit Client saves the safety answer');
    has(ec, "readHouseFlagInputs('ec')", 'Edit Client saves the checklist');
    has(src, "houseFlagInputsHtml('ec', job)", 'and renders it from the catalogue, not from its own list');

    // The Job Plan — BOTH headers. A Home Prep job runs vendors through the same house;
    // an alarm code and a loaded gun safe do not care which service was sold.
    eq(src.split('standingFlagsBlock(job)').length - 1, 4,
       'the brief renders on both Job Plan headers, the dashboard, and nowhere unexpected');
    const plan = src.slice(src.indexOf('function renderJobPlan'), src.indexOf('function renderJobPlan') + 12000);
    has(plan, 'standingFlagsBlock(job)', 'the main Job Plan header carries the brief');
    const prep = src.slice(src.indexOf('// Header (set into the shared job-plan-header slot)'));
    has(prep.slice(0, 2500), 'standingFlagsBlock(job)', 'so does the Home Prep one');

    // ⚠ IT USED TO REACH PAPER, AND NO LONGER DOES. The brief went into #job-plan-header
    // rather than into the phase content precisely because printJobPlan carried that element
    // along with the content — and that control was retired on 2026-09-11 ("Print job plan is
    // useless. Too long printing all the cards."). So this is a SCREEN-ONLY brief now.
    // The requirement that survives is the one that always mattered: both plan renderers put
    // it in front of the crew, on the phone, in the house.
    const hdrWrite = src.slice(src.indexOf("var _jpHeader = document.getElementById('job-plan-header')"), 0
      + src.indexOf("var _jpHeader = document.getElementById('job-plan-header')") + 240);
    has(hdrWrite, '_jpHeader.innerHTML = hdr', 'the Job Plan writes the brief into its header slot');
    lacks(src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n'), 'printJobPlan',
          'and nothing prints it — the print path is retired, comments aside');

    // The intake form's host element, and the one call that fills it at boot.
    has(src, 'id="i-houseflags"', 'the intake form has a host for the checklist');
    has(src, 'buildHouseFlagInputs();', 'and boot fills it from the catalogue');
    has(src, 'id="i-mustfind"', 'question 1 is on the form');
    has(src, 'id="i-safety"', 'question 2 is on the form');

    // Notes survives, demoted. Three surfaces read job.notes; dropping it from intake
    // would leave every one of them reading "None" forever on every new job.
    has(src, 'id="i-notes"', 'the general Notes box is still on intake');
  }

  group('ONE CATALOGUE — no hand-written second copy of the list');
  {
    // The failure this prevents is specific and silent: a checklist that says "cash" on
    // intake and nothing on the crew brief, because someone typed the rows into a second
    // surface and the two drifted apart.
    //
    // Assert on the row's own PROSE, not on its label. Two labels are ordinary English the
    // app already uses elsewhere — "Cash" is a payment method on the deposit recorder and
    // an inventory line, "Valuables" is an inventory category — so a label count is a
    // false positive on those two and proves nothing on the rest. The detail and the
    // prompt are unique to the row, and they are what a hand-copied second list carries.
    HOUSE_FLAGS.forEach((f) => {
      eq(src.split(f.ask).length - 1, 1, `${f.key}: the prompt is written down exactly once`);
      if (f.detail) eq(src.split(f.detail).length - 1, 1, `${f.key}: the detail is written down exactly once`);
      if (f.label.split(' ').length > 1) {
        eq(src.split(f.label).length - 1, 1, `"${f.label}" is written down exactly once`);
      }
    });
  }

  group('the checkbox has a width — the global input rule would otherwise eat it');
  {
    const css = src.slice(src.indexOf('<style>'), src.indexOf('</style>'));
    // `input,select,textarea{width:100%}` paints a bare checkbox full-width with its label
    // stranded beside it. The phone block's input[type=checkbox]{width:auto} only applies
    // under 820px and is not a substitute.
    has(css, '.hf-tick input[type=checkbox]{width:15px', 'the tick is sized on desktop too');
    has(css, '.sf-brief{', 'the brief has a stylesheet');
    has(css, '.sf-row.sf-err{', 'and a red row');
  }
};
