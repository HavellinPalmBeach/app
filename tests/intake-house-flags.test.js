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

const { sandbox, source, domStub } = require('./harness');

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();

  // The REAL esc, not the harness's stub. The stub does not escape apostrophes, and a
  // stub that does not match source is what hid the `&amp;amp;` defect in the estimate
  // email — the rendering assertions below are worthless against an approximation.
  const ctx = sandbox({
    vars: ['FIREARMS_PROTOCOL_DOC', 'HOUSE_FLAGS', 'SF_HOSTS'],
    fns: [
      'esc',
      'houseFlagsOf', 'activeHouseFlags', 'standingFlagLines', 'jobHasStandingFlags',
      'houseFlagSummary', 'houseFlagInputsHtml', '_houseFlagRowClass', 'standingFlagsBlock',
      // The must-find items and the Found tick (2026-09-19), and the hosts the brief renders through.
      '_sfRowHtml', '_sfHost', 'mustFindItems', 'mustFoundOf', '_mustFindKey', '_mfHandle', '_mfUnhandle',
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
    has(save, "readHouseFlagInputs('i')", 'and the checklist, read through the shared reader');

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
    // Since 2026-09-19 every surface renders the brief through a HOST carrying the job id, so a
    // Found tick can repaint it in place. The hosts are one map (SF_HOSTS); each is named below.
    eq(src.split("_sfHost('sf-host-").length - 1, 5,
       'five hosts — both Job Plan headers, the dashboard, the room workspace, the Inventory desk block — and nowhere unexpected');
    const plan = src.slice(src.indexOf('function renderJobPlan'), src.indexOf('function renderJobPlan') + 12000);
    has(plan, "_sfHost('sf-host-plan', job)", 'the main Job Plan header carries the brief');
    const prep = src.slice(src.indexOf('// Header (set into the shared job-plan-header slot)'));
    has(prep.slice(0, 2500), "_sfHost('sf-host-plan', job)", 'so does the Home Prep one');

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
  // ═══════════════════════════════════════════════════════════════════════════════════════
  // THE FOUND TICK (2026-09-19). Anthony, reading the brief: nothing ever CLOSED a must-find,
  // so it read the same on day 8 as on day 1. One line per item, a tick per line, the tick on
  // the job record and merged per key. And the brief reaches the ROOM and the DESK now, not
  // only the plan header — a crew member shooting the study never saw "the coin collection is
  // in the study safe" there, and the person naming that evening's shots never saw it at all.
  // ═══════════════════════════════════════════════════════════════════════════════════════
  const fnSrc = (name) => { const i = src.indexOf('function ' + name + '('); return src.slice(i, src.indexOf('\n}\n', i)); };
  const JOB = () => ({ id: 7, tc: 'Ashley Jerome', mustFind: 'The ring\nThe coin collection\nThe deeds', safetyNotes: 'Two dogs',
    mustFound: { 'the ring': { at: '2026-09-19', by: 'Ashley Jerome' } },
    houseFlags: { cash: { on: true, note: 'Freezer' } } });

  group('must-find items — one line per item, keyed by wording, a line typed twice is one item');
  {
    const items = ctx.mustFindItems({ mustFind: "Coin collection in the study safe\n  Grandmother's ring — blue box \n\ncoin collection in the study safe.\nCash in the freezer" });
    eq(items.length, 3, 'four lines, one of them typed twice and one blank: three items');
    eq(items.map((i) => i.text).join('|'), "Coin collection in the study safe|Grandmother's ring — blue box|Cash in the freezer",
       'trimmed, in the order typed, the duplicate collapsed onto the first');
    eq(items[0].key, 'coin collection in the study safe', 'the key is the normalised wording');
    eq(ctx._mustFindKey('  Coin   Collection.  '), 'coin collection', 'case, runs of space and trailing punctuation do not make a new key');
    eq(ctx.mustFindItems({ mustFind: 'Deeds in the study' })[0].found, null, 'unfound until ticked');
    eq(ctx.mustFindItems({}).length, 0, 'no answer, no items');
    eq(ctx.mustFindItems({ mustFind: 'x', mustFound: 'garbage' })[0].found, null, 'a malformed mustFound reads as nothing found rather than throwing');
    eq(ctx.mustFindItems({ mustFind: 'x', mustFound: { x: 'yes' } })[0].found, null, 'and so does a tick that is not a record');
  }

  group('the brief: one line per item, still-missing first, found after');
  {
    const lines = ctx.standingFlagLines(JOB());
    eq(lines.map((l) => l.label).join('|'), 'Must find|Must find|Must find|Safety / handling|Cash',
       'one Must find line per item, then safety, then the flags');
    eq(lines.slice(0, 3).map((l) => l.note).join('|'), 'The coin collection|The deeds|The ring',
       '⚠ still-missing first, the found one last — the brief is read top-down by somebody about to walk in');
    eq(lines[2].severity, 'done', 'a found line is the green one');
    eq(lines[2].found.by, 'Ashley Jerome', 'and carries who');
    eq(lines[0].kind + '|' + lines[3].kind + '|' + lines[4].kind, 'mustFind|safety|flag', 'each line says what it is');
    eq(ctx.standingFlagLines({ mustFind: 'Deeds in the study' }).length, 1, 'one answer, one line — unchanged for a single-line answer');
  }

  group('the rendered brief carries a Found tick per must-find line, and Undo on a found one');
  {
    const block = ctx.standingFlagsBlock(JOB());
    eq((block.match(/toggleMustFound\(7,'/g) || []).length, 3, 'three ticks, one per line, addressed to this job');
    eq((block.match(/>Found it</g) || []).length, 2, 'two still to find');
    has(block, '&#10003; Found 2026-09-19 &middot; Ashley Jerome', 'the found line says when and under whom');
    has(block, 'class="sf-tick sf-undo"', 'and offers Undo — a tick with no way back is a tick nobody dares press');
    has(block, 'sf-row sf-done', 'on the green row');
    const nasty = "O'Hara & Sons' \"ledger\"";
    eq(ctx._mfUnhandle(ctx._mfHandle(nasty)), nasty, 'the handle round-trips the wording exactly');
    ok(/^[A-Za-z0-9+/=]+$/.test(ctx._mfHandle(nasty)), 'and is attribute-safe — an apostrophe cannot break out of the onclick string');
    lacks(ctx.standingFlagsBlock({ mustFind: 'x' }), 'sf-tick', 'no job id, nothing to write against, no tick');
    const dup = ctx.standingFlagsBlock({ id: 7, mustFind: 'Ring\nring\nRing.' });
    eq((dup.match(/toggleMustFound\(/g) || []).length, 1,
       'a line typed three times is ONE tick — the dashboard\'s unique-onclick net would be right to fail on two');
  }

  group('three shapes of one renderer — slim for the room, desk for the Inventory tab');
  {
    const armed = Object.assign(JOB(), { houseFlags: { firearms: { on: true, note: 'Safe' }, cash: { on: true, note: 'Freezer' } } });
    const full = ctx.standingFlagsBlock(armed), slim = ctx.standingFlagsBlock(armed, { slim: true }), desk = ctx.standingFlagsBlock(armed, { desk: true });
    has(full, 'sf-row sf-err', 'the full brief carries the red firearms row');
    lacks(slim, 'sf-row sf-err', '⚠ slim drops it — the workspace pins the firearms line ABOVE the scrolling body, where nothing can push it off screen');
    lacks(slim, 'sf-hd', 'and has no header');
    has(slim, 'class="sf-brief sf-slim"', 'but is still the brief');
    has(slim, 'Freezer', 'cash reaches the room');
    has(slim, 'The deeds', 'so do the must-finds');
    has(slim, "toggleMustFound(7,'", 'with their ticks');
    has(desk, 'From intake &mdash; must find &middot; safety', 'the desk block says what it is');
    has(desk, 'The deeds', 'the must-finds are on it');
    has(desk, 'Two dogs', 'and the safety answer');
    lacks(desk, 'Freezer', 'and nothing else — cash, safes and the rest stay on the plan');
    lacks(desk, 'sf-row sf-err', 'firearms included');
    eq(ctx.standingFlagsBlock({ id: 1, houseFlags: { firearms: { on: true } } }, { slim: true }), '', 'a job whose only flag is firearms renders no slim brief at all');
    eq(ctx.standingFlagsBlock({ id: 1, houseFlags: { cash: { on: true } } }, { desk: true }), '', 'and there is no desk block without a must-find or a safety answer');
  }

  group('the hosts — one map, five surfaces, and the tick repaints only the hosts showing this job');
  {
    eq(Object.keys(ctx.SF_HOSTS).sort().join('|'), 'sf-host-dash|sf-host-desk|sf-host-plan|sf-host-ws', 'four host ids');
    has(ctx._sfHost('sf-host-ws', JOB()), 'id="sf-host-ws" data-job="7"', 'a host names its job');
    has(ctx._sfHost('sf-host-ws', JOB()), 'sf-slim', 'and renders its own shape');
    lacks(ctx._sfHost('sf-host-desk', JOB()), 'Freezer', 'the desk host renders the desk shape');
    const ws = fnSrc('_paintRoomWorkspace');
    has(ws, "_sfHost('sf-host-ws', job)", 'the room workspace renders the slim brief');
    ok(ws.indexOf('<div class="ws-body">') < ws.indexOf("_sfHost('sf-host-ws', job)"), 'inside the scrolling body, first thing');
    ok(ws.indexOf('firearmsWorkspaceLine(job)') < ws.indexOf('<div class="ws-body">'), 'with the firearms line still pinned above the body');
    const inv = fnSrc('renderInventoryTab');
    ok(inv.indexOf("_sfHost('sf-host-desk', job)") > -1 && inv.indexOf("_sfHost('sf-host-desk', job)") < inv.indexOf('renderJobAdmin(jobId, job)'),
       'the Inventory tab renders the desk block ABOVE Job Admin');
    has(fnSrc('renderClientDashboard'), "_sfHost('sf-host-dash', job)", 'the dashboard renders through its host');

    const dom = domStub({ 'sf-host-plan': { attrs: { 'data-job': '7' } }, 'sf-host-dash': { attrs: { 'data-job': '8' } } });
    const r = sandbox({
      fns: ['_repaintStandingFlags', '_invJob', 'standingFlagsBlock', '_sfRowHtml', 'standingFlagLines', 'activeHouseFlags',
            'houseFlagsOf', 'mustFindItems', 'mustFoundOf', '_mustFindKey', '_mfHandle', 'esc'],
      vars: ['SF_HOSTS', 'HOUSE_FLAGS', 'FIREARMS_PROTOCOL_DOC'],
      stubs: { document: dom, jobs: [JOB()] },
    });
    r._repaintStandingFlags(7);
    has(dom.getElementById('sf-host-plan').innerHTML, 'The deeds', 'the plan host showing job 7 is repainted');
    eq(dom.getElementById('sf-host-dash').innerHTML, '', '⚠ the dashboard host showing ANOTHER job is left alone');
    eq(dom.getElementById('sf-host-ws').innerHTML, '', 'a host not on screen is not painted');
  }

  group('toggleMustFound — driven: writes the job, stamps, syncs, and refuses a line that is no longer there');
  {
    const calls = [];
    const j = { id: 7, tc: 'Ashley Jerome', mustFind: 'The ring\nThe deeds', updatedAt: 1000 };
    const dom = domStub({ 'sf-host-plan': { attrs: { 'data-job': '7' } } });
    const t = sandbox({
      fns: ['toggleMustFound', '_repaintStandingFlags', '_invJob', '_jobTouch', '_todayStr', 'mustFindItems', 'mustFoundOf',
            '_mustFindKey', '_mfHandle', '_mfUnhandle', 'standingFlagsBlock', '_sfRowHtml', 'standingFlagLines', 'activeHouseFlags',
            'houseFlagsOf', 'esc'],
      vars: ['SF_HOSTS', 'HOUSE_FLAGS', 'FIREARMS_PROTOCOL_DOC'],
      stubs: { document: dom, jobs: [j], saveJobs: () => calls.push('saveJobs'), syncJobToSheets: (job) => calls.push('sync:' + job.id) },
    });
    const h = t._mfHandle('the ring');
    t.toggleMustFound(7, h);
    ok(j.mustFound && j.mustFound['the ring'], 'the tick lands on the job under the line\'s key');
    eq((j.mustFound['the ring'] || {}).by, 'Ashley Jerome', 'attributed to the concierge assigned to the job');
    ok(/^\d{4}-\d{2}-\d{2}$/.test((j.mustFound['the ring'] || {}).at || ''), 'dated yyyy-mm-dd off the local calendar (_todayStr), never toISOString');
    ok(j.at && j.at['mustFound:the ring'] > 0, '⚠ and STAMPED — an unstamped key is the weakest claim on the per-key merge');
    ok(j.updatedAt > 1000, 'the record clock moved');
    eq(calls.join('|'), 'saveJobs|sync:7', 'saved and synced the way every other job edit is, in that order');
    has(dom.getElementById('sf-host-plan').innerHTML, 'Found', 'and the brief on screen repainted');
    lacks(fnSrc('toggleMustFound'), 'toISOString', 'the date is the local calendar day');

    const stamp1 = j.at['mustFound:the ring'];
    t.toggleMustFound(7, h);
    ok(!j.mustFound['the ring'], 'pressing it again unticks');
    ok(j.at['mustFound:the ring'] >= stamp1, '⚠ and the stamp STAYS — an untick with no stamp is not a removal, because absence alone never is');

    const before = JSON.stringify(j); calls.length = 0;
    t.toggleMustFound(7, t._mfHandle('the ring, reworded'));
    eq(JSON.stringify(j), before, 'a line that is no longer on the list writes nothing');
    eq(calls.length, 0, 'and syncs nothing');
    t.toggleMustFound(99, h);
    eq(calls.length, 0, 'an unknown job writes nothing');
  }

  group('both forms say one line per item, and the stylesheet has the tick');
  {
    eq(src.split('placeholder="One line per item: what it is, and where they think it might be."').length - 1, 2,
       'intake and Edit Client both say it — a paragraph cannot be ticked');
    const css = src.slice(src.indexOf('<style>'), src.indexOf('</style>'));
    has(css, '.sf-row.sf-done{', 'a green row for a found line');
    has(css, '.sf-tick{', 'the tick is styled');
    has(css, '.sf-brief.sf-slim{', 'and so is the room copy');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠ THE PLAN HEADER DOES NOT PRINT FIREARMS TWICE (2026-09-20) — the banner IS the row there');
  {
    // Anthony, off a screenshot of a Home Cleanout plan: the red FIREARMS banner and the
    // Standing job flags panel under it both carried "2 pistols", the crew rule and the
    // protocol link — "seems sort of duplicative". Every other intake flag and both intake
    // answers were only ever in the brief; firearms alone was in both, because the banner of
    // 2026-09-19 was layered over a brief that kept its red row. The plan host now says a
    // banner sits above it, and the brief drops the red row on the strength of that.
    eq(ctx.SF_HOSTS['sf-host-plan'].banner, true, 'the plan host declares the banner above it');
    ok(!ctx.SF_HOSTS['sf-host-dash'].banner, 'the dashboard host does not — it has no banner');
    const plan = ctx.standingFlagsBlock(FULL, { banner: true });
    lacks(plan, 'sf-row sf-err', '⚠ under a banner the brief carries no firearms row');
    lacks(plan, 'hall closet safe', 'and not the firearms note either — the banner prints it');
    has(plan, 'sf-hd', 'the header survives: it is still the standing-flags brief');
    has(plan, 'read to the crew before Day 1', 'with its title');
    has(plan, 'freezer and the desk drawer', 'and the other flags are all still there');
    has(plan, 'small blue box', 'the must-find answer');
    has(plan, 'pool cage steps', 'the safety answer');
    eq(ctx.standingFlagsBlock({ id: 1, houseFlags: { firearms: { on: true, note: '2 pistols' } } }, { banner: true }), '',
       'a job whose only flag is firearms renders no brief on the plan at all — the banner carries the whole of it');
    has(ctx.standingFlagsBlock({ id: 1, houseFlags: { firearms: { on: true, note: '2 pistols' } } }, {}), '2 pistols',
       '⚠ the same job on the dashboard, which has no banner, keeps the red row');
    has(ctx._sfHost('sf-host-dash', FULL), 'sf-row sf-err', 'through the dashboard host');
    lacks(ctx._sfHost('sf-host-plan', FULL), 'sf-row sf-err', 'and not through the plan host');
    // Both plan renderers share the host id, so both must carry the banner — or a firearms
    // flag on a Home Prep job would vanish from the plan entirely.
    const prepHdr = src.slice(src.indexOf('// Header (set into the shared job-plan-header slot)'), src.indexOf('// Header (set into the shared job-plan-header slot)') + 1200);
    has(prepHdr, 'var hdr = firearmsBannerHtml(job) +', '⚠ the Home Prep plan opens with the banner too');
    const labourHdr = src.slice(src.indexOf('function renderJobPlan'), src.indexOf('function renderJobPlan') + 12000);
    has(labourHdr, 'var hdr = firearmsBannerHtml(job) +', 'as the labour plan always has');
    // The filter keys on the ROW's severity, never on the word — the doc-carrying test above
    // already pins that, and the banner option is the same rule on a second surface.
    const sfb = fnSrc('standingFlagsBlock').split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    has(sfb, "if (opts.slim || opts.banner) lines = lines.filter(function(l) { return l.severity !== 'err'; });",
        'slim and banner drop the red row by severity, in one expression');
  }
};
