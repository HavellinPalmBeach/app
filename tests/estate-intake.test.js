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
// ⚠ TWO DECEDENT BLOCKS SINCE 2026-10-18 (Anthony: the people together, the columns balanced): the estate's facts and
// the attorney sit in #estate-fields in the LEFT card, under the representative; the documentation questions (the
// tier, the two gates and their readout) sit in #estate-doc-fields in the RIGHT card, under the two questions and
// Notes. toggleIntakeFields shows and hides the two together, and the test below holds that.
const ESTATE_IDS = [
  'i-date-of-death', 'i-matter-type',
  'i-probate-atty-fname', 'i-probate-atty-lname', 'i-probate-atty-firm',
  'i-probate-atty-phone', 'i-probate-atty-email'
];
const ESTATE_DOC_IDS = ['i-doc-tier', 'i-gate-706', 'i-gate-dispute', 'i-gate-readout'];
// Facts about a COURT CASE — these stay probate-only.
// ⚠ RESTATED 2026-10-03 (P19): 'i-probate-sale' came off this list. Anthony ("yes", 2026-10-02) asked the property-sale
// question on a trust matter too, which has no court record to show it in, so it sits in the estate block in its own
// cell, shown by propertySaleAsked (the court record or a trust). Its containment is asserted below, beside these.
const PROBATE_IDS = [
  'i-probate-case', 'i-letters-date', 'i-probate-deadline', 'i-deadline-fb'
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
    // ⚠ THIS USED TO BE THREE SOURCE INDICES — estate-fields, then probate-fields, then
    // "What&rsquo;s In The House" as the end marker — and it broke on 2026-09-22 when the
    // intake columns were reflowed and the two questions moved ABOVE the estate block. The
    // requirement was never the ORDER of the sections; it is that a decedent fact sits inside
    // the decedent block and a court-case fact inside the court block. Stated as CONTAINMENT
    // now, so the next layout change cannot fail an assertion about something else.
    const blockOf = (id) => {
      const at = src.indexOf('id="' + id + '"');
      if (at < 0) return 'MISSING';
      let depth = 0, i = at;
      while (i > 0) {                       // walk back to the enclosing block's own open tag
        if (src.startsWith('</div>', i)) depth++;
        else if (src.startsWith('<div', i)) {
          if (depth === 0) {
            const tag = src.slice(i, src.indexOf('>', i) + 1);
            const m = /id="([a-z-]+)"/.exec(tag);
            if (m && (m[1] === 'estate-fields' || m[1] === 'estate-doc-fields' || m[1] === 'probate-fields' || m[1] === 'estate-auth-fields')) return m[1];
          } else depth--;
        }
        i--;
      }
      return 'none';
    };
    ok(src.indexOf('id="estate-fields"') > 0,  'the estate block exists');
    ok(src.indexOf('id="probate-fields"') > 0, 'the probate block exists');
    ESTATE_IDS.forEach((id) => {
      eq(blockOf(id), 'estate-fields', id + ' is a decedent fact and sits in the estate block');
    });
    ESTATE_DOC_IDS.forEach((id) => {
      eq(blockOf(id), 'estate-doc-fields', id + ' is a documentation question and sits in the estate documentation block');
    });
    // The two blocks are one answer to "is this an estate?": both follow isEstate in the one toggle.
    const tog = src.slice(src.indexOf('function toggleIntakeFields('), src.indexOf('function toggleIntakeFields(') + 12000);
    has(tog, "ef.style.display = isEstate ? 'block' : 'none'", 'toggleIntakeFields shows the estate block on an estate');
    has(tog, "edf.style.display = isEstate ? 'block' : 'none'", 'and the documentation block with it');
    PROBATE_IDS.forEach((id) => {
      eq(blockOf(id), 'probate-fields', id + ' is a court-case fact and stays probate-only');
    });
    // The converse, and it is the half that matters: neither block may swallow the other, so
    // a court fact can never be reached on an Estate Settlement and a decedent fact is never
    // withheld from one. Measured off the same walk rather than asserted separately.
    ok(ESTATE_IDS.concat(ESTATE_DOC_IDS).every((id) => blockOf(id) !== 'probate-fields'), 'no decedent fact is trapped in the probate block');
    ok(PROBATE_IDS.every((id) => blockOf(id) !== 'estate-fields'), 'no court fact has leaked into the estate block');
    // RESTATED 2026-10-03 (P19): the sale question is asked wherever the court record OR a trust is, so it is no longer a
    // court-case fact: it sits in the estate block, in a cell of its own that propertySaleAsked shows and hides.
    eq(blockOf('i-probate-sale'), 'estate-fields', 'i-probate-sale sits in the estate block (P19: asked on a trust too)');
    const cell = src.slice(src.indexOf('id="i-sale-cell"'), src.indexOf('id="i-probate-sale"'));
    ok(cell.length > 0 && cell.length < 200, '…inside its own cell, i-sale-cell, which the toggle shows by propertySaleAsked');
  }

  // ⚠⚠ THE TWO COLUMNS ARE A REQUIREMENT, NOT A LAYOUT PREFERENCE, and this is what keeps
  // them. `.grid2` collapses to ONE column under 820px and renders card 1 whole before card 2,
  // so the column a block sits in decides where it lands on the phone the intake call is taken
  // on. Measured on the old arrangement, a probate intake at 390px: the property type was at
  // y=4,235 and the square footage at y=4,388 — BELOW the two "what's in the house" questions
  // at y=3,282 — so the concierge scrolled past the whole estate block, the attorney and the
  // court record before reaching "how big is it". Reflowed 2026-09-22 on Anthony's reading:
  // LEFT is the standing facts (who, where, what kind of house), RIGHT is the conversation
  // (the two questions, then the parties on an estate). Property type now lands at y=1,020.
  // ⚠ REARRANGED 2026-10-18 (Anthony, reading the form on a desk: "the info on authorized rep and estate info should
  // flow beneath client info … balance the intake fields so the left and right are closer to the same length …
  // putting relevant info, like all of the contact info, next to each other"). LEFT is now the people and the matter:
  // service, the client (or the deceased), the representative and co-representatives, the estate attorney, the estate
  // details, the court record, the trust record, and THEN the property block and the move destination. RIGHT is the
  // conversation and the documentation: the two questions and the tick list, Notes, then one block holding the tier,
  // the two gates and the readout, and the level under it. Clear and Save Client sit under both cards. Measured at
  // 1440px: a probate intake 2,264px tall (2,519 before), a living one unchanged. On a phone the left card still
  // renders whole first, so on an estate the three contact blocks come before the property block: property type on
  // a probate intake at 390px is at y=2,934 (1,020 since 2026-09-22; 4,235 before that); on a living job 978, as it was.
  // Browser step 86 measures it; this holds which card each block is in.
  group('the intake columns: the people and the matter left, the conversation and the documentation right');
  {
    const panel = src.slice(src.indexOf('id="panel-intake"'));
    const grid  = panel.slice(panel.indexOf('<div class="grid2">'));
    // Walk the grid's direct children, so this reads the real card boundaries rather than
    // counting occurrences of a string that also appears inside them.
    const cards = [];
    let i = grid.indexOf('>') + 1, depth = 0, open = -1;
    while (i < grid.length && cards.length < 4) {
      if (grid.startsWith('<div', i)) { if (depth === 0) open = i; depth++; }
      else if (grid.startsWith('</div>', i)) {
        depth--;
        if (depth === 0 && open >= 0) { cards.push(grid.slice(open, i)); open = -1; }
        if (depth < 0) break;
      }
      i++;
    }
    eq(cards.length, 2, 'the intake grid is two cards');
    const col = (id) => cards.findIndex((c) => c.indexOf('id="' + id + '"') >= 0) + 1;

    // LEFT — the people (the client, the representative, the attorney), the matter, then the property.
    [['i-svc', 'the service type'], ['i-fname', 'the client name'], ['i-phone', 'the client phone'], ['i-addr', 'the property address'],
     ['i-executor-fname', 'the authorized representative'], ['i-executor-phone', 'the representative\'s phone'],
     ['i-cofid-block', 'the co-representatives'], ['i-probate-atty-fname', 'the estate attorney'],
     ['i-date-of-death', 'the date of death'], ['i-matter-type', 'the matter type'], ['i-probate-sale', 'the property sale'],
     ['i-probate-case', 'the court case number'], ['i-trust-name', 'the trust record'],
     ['i-ptype', 'the property type'], ['i-sqft', 'the square footage'], ['i-beds', 'the bedroom count'],
     ['i-home-value', 'the home value'], ['i-walkthrough', 'the walkthrough date'],
     ['i-start', 'the target start'], ['i-prem', 'the premium flag'], ['i-dest-addr', 'the move destination']
    ].forEach(([id, what]) => eq(col(id), 1, 'LEFT column carries ' + what));

    // RIGHT — the two questions asked on every call, Notes, then the documentation questions.
    [['i-mustfind', 'the must-find question'], ['i-safety', 'the safety question'],
     ['i-houseflags', 'the house-flag ticks'], ['i-notes', 'the notes'],
     ['i-doc-tier', 'the engagement tier'], ['i-gate-706', 'the 706 gate'], ['i-gate-dispute', 'the dispute gate'],
     ['i-gate-readout', 'the gate readout'], ['i-doclevel', 'the documentation level']
    ].forEach(([id, what]) => eq(col(id), 2, 'RIGHT column carries ' + what));
    // The people read in a row, contact block after contact block, and the property after the matter.
    const at1 = (id) => cards[0].indexOf('id="' + id + '"');
    ok(at1('i-phone') < at1('i-executor-phone') && at1('i-executor-phone') < at1('i-probate-atty-phone'),
       'the client, the representative and the attorney follow one another');
    ok(at1('i-probate-atty-phone') < at1('i-date-of-death') && at1('i-probate-case') < at1('i-ptype'),
       'then the estate details and the court record, then the property block');
    // Save Client is under both cards, not at the foot of one: the right card no longer ends the form.
    const afterGrid = panel.slice(panel.indexOf('</div>', grid.indexOf(cards[1]) + cards[1].length));
    ok(!/onclick="saveIntake\(\)"/.test(cards[0]) && !/onclick="saveIntake\(\)"/.test(cards[1]), 'Save Client is in neither card');
    ok(/onclick="saveIntake\(\)"/.test(afterGrid.slice(0, 1200)) && /id="i-fb"/.test(afterGrid.slice(0, 1200)), 'it sits under the grid, with #i-fb beside it');

    // ⚠ THE PROPERTY BLOCK MUST READ BEFORE THE QUESTIONS, which on a phone means being in
    // the earlier card — the whole point of the move. Stated as the requirement rather than as
    // a pixel, so it survives any amount of copy being added to either column.
    ok(col('i-sqft') < col('i-mustfind'), 'the property block reads before the two questions');
    // ⚠ AND THE DOCUMENTATION LEVEL SITS WITH THE OTHER DOCUMENTATION QUESTION, NOT IN JOB
    // DETAILS. It is how strictly, beside what we hand over — and beside the gate readout that
    // is the only thing on the form that explains why it is usually greyed out.
    eq(col('i-doclevel'), col('i-doc-tier'), 'the documentation level sits with the engagement tier');
    ok(cards[1].indexOf('id="i-gate-readout"') < cards[1].indexOf('id="i-doclevel"'),
       'and directly under the readout that explains it');
    // ⚠ OUTSIDE #estate-doc-fields, or the four living services lose the only route to Formal —
    // which is what makes chain of custody mandatory on the Job Plan.
    // ⚠ THE WALK STARTS AT THE OPENING `<div`, NOT AT THE id INSIDE IT. Starting at the id
    // leaves depth at 0 inside the block, so the FIRST inner </div> closed it and every later
    // element read as outside — which came back GREEN on the revert that moved the control in.
    const efOpen = cards[1].lastIndexOf('<div', cards[1].indexOf('id="estate-doc-fields"'));
    let efEnd = cards[1].length, d = 0;
    for (let j = efOpen; j < cards[1].length; j++) {
      if (cards[1].startsWith('<div', j)) d++;
      else if (cards[1].startsWith('</div>', j)) { d--; if (d === 0) { efEnd = j; break; } }
    }
    ok(efEnd < cards[1].length, 'the estate documentation block closes inside the card');
    ok(cards[1].indexOf('id="i-doclevel"') > efEnd, 'but outside it, so a living job still reaches the level');
    // ⚠ STATED AGAINST EVERY CONDITIONALLY-HIDDEN BLOCK, whichever card it is in. Those are the only things
    // toggleIntakeFields hides, so a control outside all of them is on screen on every service — which is the
    // requirement, since the four living services have no other route to Formal. The browser run drives the
    // converse and reads the control on all seven.
    const whole = cards[0] + cards[1];
    ['estate-fields', 'estate-doc-fields', 'estate-auth-fields', 'probate-fields', 'trust-fields'].forEach((blk) => {
      const open = whole.lastIndexOf('<div', whole.indexOf('id="' + blk + '"'));
      ok(open >= 0, '#' + blk + ' is on the form');
      let end = -1, k = 0;
      for (let j = open; j < whole.length; j++) {
        if (whole.startsWith('<div', j)) k++;
        else if (whole.startsWith('</div>', j)) { k--; if (k === 0) { end = j; break; } }
      }
      const at = whole.indexOf('id="i-doclevel"');
      ok(at < open || at > end, 'the documentation level is outside #' + blk + ', so every service reaches it');
    });
  }

  group('the documentation level says what it is actually for');
  {
    // ⚠⚠ THE HINT WAS FALSE AND HAD BEEN SINCE 2026-08-24. It read "Choose Formal when the
    // job needs court-grade records — a contested estate, a large estate that may owe estate
    // tax, or when the attorney or trust officer asks for it" — and ALL THREE of those now set
    // the floor automatically and DISABLE the control (docLevelFloor). So the one piece of
    // guidance on the form told you to use the dropdown in exactly the cases where it is
    // greyed out. Measured: on the three decedent services the floor is `formal` on a fresh
    // intake, because the 706 question defaults to Unknown and unknown counts as yes.
    const at  = src.indexOf('id="i-doclevel"');
    ok(at > 0, 'the control is still on the form');
    const hint = src.slice(at, at + 1600);
    const end  = hint.indexOf('</div>', hint.indexOf('</select>'));
    const copy = hint.slice(0, end < 0 ? hint.length : end);
    // RESTATED 2026-10-18 (Anthony: "an awful lot of words and duplication"): the hint is two sentences, that the answers
    // above set it and that it is escalate-only; what Formal does is the readout's to say, once. And the control is no
    // longer greyed out in place when the gates decide: the whole block is hidden and the readout reads Formal.
    ok(/answers above/i.test(copy), 'it says the answers above set this on an estate');
    lacks(copy, 'Choose <strong>Formal</strong> when the job needs court-grade records',
       'the retired instruction naming the three cases that disable it is gone');
    ok(/lower/i.test(copy), 'and that it is escalate-only');
    ok(copy.replace(/<[^>]+>/g, '').split(/\s+/).length < 40, 'in under forty words (' + copy.replace(/<[^>]+>/g, '').split(/\s+/).length + ')');
    // The block is shown only when it has a choice to offer.
    const shown = (seed) => {
      const d = domStub(seed);
      const c = sandbox({
        fns: ['onDocGateChange', '_gateYes', '_gate706', 'gateDispute', 'docLevelFloor', 'docTierOf', 'docTierDef', 'docTierScope', 'docTierScopeMirror',
              'svcHasDocStep', 'docLevelFloorReason', 'resolveDocLevel', 'isDecedentJob', 'invAppraisalThreshold', 'docStandardEffect', 'isFormalDoc', 'roundCents', 'fmt', 'esc'],
        vars: ['DECEDENT_SERVICES', 'INV_APPRAISAL_THRESHOLD', 'INV_APPRAISAL_THRESHOLD_DISPUTED', 'DOC_TIERS', 'DOC_TIER_FROM_SCOPE', 'JOB_STEPS'],
        stubs: { document: d },
      });
      c.onDocGateChange();
      return { block: d.getElementById('i-doclevel-block').style.display, out: String(d.getElementById('i-gate-readout').innerHTML || ''), disabled: d.getElementById('i-doclevel').disabled };
    };
    let r = shown({ 'i-svc': 'cleanout' });
    eq(r.block, 'none', 'an Estate Settlement with the 706 unanswered: the level block is hidden');
    ok(/Formal documentation/.test(r.out), 'and the readout carries the level');
    eq(r.disabled, true, '(the control stays disabled at formal underneath, as the save reads it)');
    r = shown({ 'i-svc': 'cleanout', 'i-gate-706': 'no' });
    eq(r.block, '', 'the 706 answered No: the block is back');
    eq(r.disabled, false, 'and live');
    eq(shown({ 'i-svc': 'downsizing_move' }).block, '', 'a Home Transition: shown, as nothing forces it');
    eq(shown({ 'i-svc': 'cleanout', 'i-gate-dispute': 'yes', 'i-gate-706': 'no' }).block, 'none', 'a recorded dispute hides it again');
    // The readout and the hints say each thing once: no sentence about lowering in the readout, none about custody in the hint.
    lacks(src, "It cannot be lowered here; change the answer above if it is wrong.", 'the readout no longer repeats the hint');
    lacks(src, 'Answered once, at engagement. These set how strictly', 'and the intro paragraph above the gates is gone');
  }

  group('which blocks a service shows');
  {
    const run = (svc) => {
      const d = classDom({ 'i-svc': svc }, {});
      const c = sandbox({
        fns: ['toggleIntakeFields', 'courtRecordRequired', 'paintProbateSvcFlag', 'probateSvcFlag', 'probateSvcOffTrack', 'courtRecordShown', 'jobOnProbateTrack', 'matterDef', 'matterTypeOf', 'invFiduciaryMode', 'intakeAsksHouseContents', 'onDocGateChange', '_gateYes', '_gate706', 'gateDispute',
              'docLevelFloor', 'docTierOf', 'docTierDef', 'docTierScope', 'docTierScopeMirror', 'svcHasDocStep', 'docLevelFloorReason', 'resolveDocLevel', 'isDecedentJob',
              'invAppraisalThreshold', 'docStandardEffect', 'isFormalDoc', 'showHouseFlagRows', 'houseFlagAsked', 'roundCents', 'fmt', 'trustRecordShown', 'propertySaleAsked', 'executorAuthField', 'estateAuthority'],
        vars: ['MATTER_TYPES', 'DECEDENT_SERVICES', 'INV_APPRAISAL_THRESHOLD', 'INV_APPRAISAL_THRESHOLD_DISPUTED',
                  'DOC_TIERS', 'DOC_TIER_FROM_SCOPE', 'JOB_STEPS', 'HOUSE_FLAGS', 'FIREARMS_PROTOCOL_DOC', 'ESTATE_AUTHORITY_WORDS', 'ESTATE_AUTHORITIES'],
        stubs: { document: d },
      });
      c.toggleIntakeFields();
      return {
        estate:  d.getElementById('estate-fields').style.display,
        doc:     d.getElementById('estate-doc-fields').style.display,
        probate: d.getElementById('probate-fields').style.display,
        auth:    d.getElementById('estate-auth-fields').style.display,
      };
    };
    ['cleanout', 'probate', 'contested_probate'].forEach((svc) => {
      eq(run(svc).estate, 'block', svc + ' is a decedent service, so it is asked the decedent facts');
      eq(run(svc).doc, 'block', svc + ' is asked the documentation questions, in the right-hand card (2026-10-18)');
      eq(run(svc).auth, 'block', svc + ' names an authorized representative');
    });
    eq(run('cleanout').probate, 'none', 'an Estate Settlement is shown no court record — it may never open probate');
    eq(run('probate').probate, 'block', 'probate is');
    eq(run('contested_probate').probate, 'block', 'and so is contested probate');
    ['downsizing', 'downsizing_move', 'home_cleanout', 'prep'].forEach((svc) => {
      eq(run(svc).estate, 'none', svc + ' is living-client work and is asked none of it');
      eq(run(svc).doc, 'none', svc + ' is shown no documentation questions either');
      eq(run(svc).probate, 'none', svc + ' gets no court record either');
    });
  }

  group('the level control is BORROWED by the gates, not overwritten');
  {
    // ⚠⚠ TWO DEFECTS ON ONE CONTROL, both found while measuring whether it is still worth
    // having (2026-09-22). (1) It carried NO onchange, so hand-setting Formal left the readout
    // directly beneath it still reading "Standard documentation" — the only line on the form
    // that explains the level, contradicting the control it explains. (2) Forcing the level
    // WRITES 'formal' into the control; answering the 706 "No" afterwards lifted the floor and
    // left that value behind, so the readout then reported it as "set by hand" — attributing a
    // choice to a person who never made one.
    has(src, 'id="i-doclevel" onchange="onDocGateChange()"',
        'the control repaints the readout when a person changes it');

    const drive = (seed) => {
      const d = classDom(seed, {});
      const c = sandbox({
        fns: ['onDocGateChange', '_gateYes', '_gate706', 'gateDispute', 'docLevelFloor',
              'docTierOf', 'docTierDef', 'svcHasDocStep', 'docLevelFloorReason', 'resolveDocLevel',
              'isDecedentJob', 'invAppraisalThreshold', 'docStandardEffect', 'isFormalDoc', 'roundCents', 'fmt'],
        vars: ['DECEDENT_SERVICES', 'INV_APPRAISAL_THRESHOLD', 'INV_APPRAISAL_THRESHOLD_DISPUTED',
               'DOC_TIERS', 'DOC_TIER_FROM_SCOPE', 'JOB_STEPS'],
        stubs: { document: d },
      });
      return { d, c, set: (id, v) => { d.getElementById(id).value = v; }, go: () => c.onDocGateChange(),
               lvl: () => d.getElementById('i-doclevel'),
               out: () => String(d.getElementById('i-gate-readout').innerHTML || '') };
    };

    // A fresh probate intake: the 706 defaults to Unknown, which IS the common case and is
    // what makes this control disabled on nearly every estate.
    {
      const t = drive({ 'i-svc': 'probate', 'i-doclevel': '' });
      t.go();
      eq(t.lvl().value, 'formal', 'an unanswered 706 forces the control to Formal');
      eq(t.lvl().disabled, true, 'and disables it');
      ok(/Strict Mode/.test(t.out()), 'the readout says so');
      // Now answer it honestly. The floor lifts — and the forced value must NOT be left behind.
      t.set('i-gate-706', 'no'); t.go();
      eq(t.lvl().disabled, false, 'answering No releases the control');
      eq(t.lvl().value, '', 'and hands back the blank it borrowed, not the formal it wrote itself');
      ok(/Standard documentation/.test(t.out()), 'so the readout reads Standard rather than "set by hand"');
    }

    // The converse, and it is the half a blanket clear would get wrong.
    {
      const t = drive({ 'i-svc': 'cleanout', 'i-gate-706': 'no', 'i-doclevel': 'formal' });
      t.go();
      eq(t.lvl().disabled, false, 'no gate fires, so a hand-set Formal is left alone');
      ok(/set by hand/.test(t.out()), 'and is reported as hand-set');
      // Take the control away and give it back: the person's own answer has to survive.
      t.set('i-doc-tier', 'appraisals'); t.go();
      eq(t.lvl().disabled, true, 'the appraisals tier takes the control');
      t.set('i-doc-tier', 'values'); t.go();
      eq(t.lvl().value, 'formal', 'and releasing it returns the Formal the person really chose');
      eq(t.lvl().disabled, false, 'released');
    }

    // Repeated passes while already forced must not overwrite the capture — this handler runs
    // on every gate change AND from toggleIntakeFields, so it sees the forced state often.
    {
      const t = drive({ 'i-svc': 'probate', 'i-doclevel': '' });
      t.go(); t.go(); t.go();
      t.set('i-gate-706', 'no'); t.go();
      eq(t.lvl().value, '', 'three forced passes still hand back the original blank');
    }

    // On the four living services nothing ever takes it, which is the whole reason it still
    // exists: Formal is what makes chain of custody mandatory on the Job Plan, and there is
    // no other route to it there.
    ['downsizing', 'downsizing_move', 'home_cleanout', 'prep'].forEach((svc) => {
      const t = drive({ 'i-svc': svc, 'i-doclevel': '' });
      t.go();
      eq(t.lvl().disabled, false, svc + ' — the gates never fire, so the control stays usable');
    });
  }

  group('the estate attorney is required on probate and merely offered on an estate settlement');
  {
    const marks = { 'm1': 'req-probate', 'm2': 'req-probate' };
    const run = (svc) => {
      const d = classDom({ 'i-svc': svc }, marks);
      const c = sandbox({
        fns: ['toggleIntakeFields', 'courtRecordRequired', 'paintProbateSvcFlag', 'probateSvcFlag', 'probateSvcOffTrack', 'courtRecordShown', 'jobOnProbateTrack', 'matterDef', 'matterTypeOf', 'invFiduciaryMode', 'intakeAsksHouseContents', 'onDocGateChange', '_gateYes', '_gate706', 'gateDispute',
              'docLevelFloor', 'docTierOf', 'docTierDef', 'docTierScope', 'docTierScopeMirror', 'svcHasDocStep', 'docLevelFloorReason', 'resolveDocLevel', 'isDecedentJob',
              'invAppraisalThreshold', 'docStandardEffect', 'isFormalDoc', 'showHouseFlagRows', 'houseFlagAsked', 'roundCents', 'fmt', 'trustRecordShown', 'propertySaleAsked', 'executorAuthField', 'estateAuthority'],
        vars: ['MATTER_TYPES', 'DECEDENT_SERVICES', 'INV_APPRAISAL_THRESHOLD', 'INV_APPRAISAL_THRESHOLD_DISPUTED',
                  'DOC_TIERS', 'DOC_TIER_FROM_SCOPE', 'JOB_STEPS', 'HOUSE_FLAGS', 'FIREARMS_PROTOCOL_DOC', 'ESTATE_AUTHORITY_WORDS', 'ESTATE_AUTHORITIES'],
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
        fns: ['saveIntake', 'coFiduciaryRepRefusal', 'coFiduciaryRepClash', 'intakeAsksHouseContents', 'houseFlagsOf', 'resolveExecutorAuth', 'docTierScope', 'docTierScopeMirror', 'docTierDef', 'clientMissingFields', 'courtRecordRequired', 'isDecedentJob', 'readReferralInputs', 'referralSourceKind', 'lookupReferralById', 'referralIdOf', 'readHouseFlagInputs', 'houseFlagAsked', 'readCoFiduciaryRows', 'trustRecordShown', 'propertySaleAsked', 'saveCoFiduciaryRows', '_coFidRowNums', 'matterDef', 'courtRecordShown', 'matterTypeOf', 'jobOnProbateTrack', 'invFiduciaryMode'],
        vars: ['EXECUTOR_AUTH_OPTIONS', 'SVC_LABELS', 'DOC_TIERS', 'REFERRAL_SOURCES', 'referralDirectory', 'DECEDENT_SERVICES', 'HOUSE_FLAGS', 'FIREARMS_PROTOCOL_DOC', 'MATTER_TYPES'],
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
          // A saved client lands on its own dashboard (2026-09-23); the success line rides it.
          goToClientDashboard: (id, kind, msg) => said.push({ kind, msg, id }),
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
    // RESTATED 2026-10-03 (P19): 'id="ec-probate-sale"' left this list — the sale question is asked on a trust too
    // (propertySaleAsked), so it sits in the estate block in its own wrapper, ec-sale-fields, asserted just below.
    ["txt('probate-case'", 'id="ec-probate-deadline"'].forEach((needle) => {
      ok(src.indexOf(needle) > pOpen, needle + ' stays probate-only');
    });
    const saleAt = src.indexOf('id="ec-probate-sale"');
    ok(saleAt > open && saleAt < close && src.lastIndexOf('id="ec-sale-fields"', saleAt) > open,
       'id="ec-probate-sale" sits in the estate block, in ec-sale-fields (P19: asked on a trust too)');

    // The save reads them on every estate service, not in the probate branch.
    const body = src.slice(src.indexOf('function saveClientEdit('));
    const fnBody = body.slice(0, body.indexOf('\nfunction formatPhone'));
    const est = fnBody.indexOf('if (isEstateEdit) {');
    // ⚠ RESTATED 2026-09-29 (audit M5 / P10): the court-record branch reads `courtRecordShown(svc, …)`,
    // the service OR a probate matter, since an Estate Settlement administering a probate estate had
    // nowhere to enter its case number. The requirement — decedent facts before the court record — holds.
    const pro = fnBody.indexOf('if (courtRecordShown(svc,');
    ok(est > 0 && pro > est, 'the estate branch runs first, and the court-record branch after it');
    ['job.deathDate', 'job.gate706', 'job.gateDispute', 'job.probateAttyName'].forEach((k) => {
      const at = fnBody.indexOf(k + ' ');
      ok(at > est && at < pro, k + ' is written on every estate service');
    });
    // RESTATED 2026-10-03 (P19): job.probateSale left this list — it is written wherever the modal asks it, the court
    // record or a trust (propertySaleAsked), on the line asserted below.
    ['job.probateCase', 'job.probateDeadline'].forEach((k) => {
      ok(fnBody.indexOf(k + ' ') > pro, k + ' is written only on a probate matter');
    });
    has(fnBody, "if (propertySaleAsked(svc, _mtEc)) job.probateSale = _keep('probate-sale', job.probateSale);",
        'job.probateSale is written where the sale question is asked: the court record or a trust');

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
    const EC_FNS = ['showEditClient', 'courtFromCaseNo', 'courtRecordRequired', 'courtRecordShown', 'jobOnProbateTrack', 'ecPaintSvcFlag', 'matterDef', 'executorAuthOptionsHtml', 'resolveExecutorAuth', 'ecIsProbateSvc', 'ecIsEstateSvc', 'ecIsMoveSvc', 'ecDocGateChange', 'docTierOptionsHtml', 'docTierOf', 'docTierDef', 'docTierScope', 'docTierScopeMirror', 'svcHasDocStep', 'esc',
                    'onDocGateChange', 'houseFlagInputsHtml', 'houseFlagsOf', '_houseFlagRowClass',
                    'docLevelFloor', 'docTierOf', 'docTierDef', 'docTierScope', 'docTierScopeMirror', 'svcHasDocStep', 'gateDispute', '_gateYes', '_gate706', 'isDecedentJob',
                    'docLevelFloorReason', 'resolveDocLevel', 'docStandardEffect',
                    'isFormalDoc', 'invAppraisalThreshold', 'ecToggleProbate',
                    'matterTypeOf', 'invFiduciaryMode', 'referralSourceKind', 'referralSourceOptionsHtml', 'referralPartnerOptionsHtml', 'jobRefersToPartner', 'referralIdOf', 'lookupReferralById', 'svcFamilyOptions', 'svcFamily', 'conciergeOptionsHtml', 'getAllActiveTC', '_byContractorName', 'samePerson', 'canonPersonName', 'executorRoleOptionsHtml', 'dateChainConflicts', 'dateChainFlagHtml', 'intakeAsksHouseContents', 'houseFlagAsked', 'showHouseFlagRows', 'roundCents', 'fmt', 'propertySaleAsked', 'trustRecordShown', 'executorAuthField', 'coFiduciaryBlockHtml', 'jobListEntries', 'estateAuthority'];
    const EC_VARS = ['EXECUTOR_AUTH_OPTIONS', 'SVC_LABELS', 'HOUSE_FLAGS', 'FIREARMS_PROTOCOL_DOC', 'DECEDENT_SERVICES',
                  'DOC_TIERS', 'DOC_TIER_FROM_SCOPE', 'JOB_STEPS',
                     'INV_APPRAISAL_THRESHOLD', 'INV_APPRAISAL_THRESHOLD_DISPUTED', 'MATTER_TYPES', 'REFERRAL_SOURCES', 'SVC_ORDER', 'EXECUTOR_ROLES', 'referralDirectory', 'DEFAULT_CONTRACTORS', 'contractors', 'PERSON_NAME_ALIASES', 'ESTIMATE_EDIT_ROUTE_TXT', 'ESTIMATE_OUT_FOR_APPROVAL_TXT', 'DOC_SCOPES', 'ESTATE_AUTHORITY_WORDS', 'ESTATE_AUTHORITIES'];
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
    // ⚠ RESTATED 2026-09-29 (audit M5 / P10): five attorney fields AND the case number. The court record
    // now renders on any estate whose matter is administered through probate, not the Probate service
    // alone — and on an Estate Settlement the save accepts a blank case number, so its asterisk had to
    // become the conditional one too. An unconditional mark there would label a field required that the
    // save does not require, which is the defect the attorney block's own marks were withdrawn for.
    eq((est.html.match(/class="ec-req-probate"/g) || []).length, 6,
       'all five attorney fields and the case number carry the conditional mark');
    const _caseLbl = est.html.slice(est.html.lastIndexOf('<label', est.html.indexOf('Probate Case Number')), est.html.indexOf('id="ec-probate-case"'));
    has(_caseLbl, 'class="ec-req-probate"', 'the case number’s mark is the conditional one, never a fixed asterisk');
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
    // Since 2026-10-18 the gates and the readout share #estate-doc-fields, shown with the estate block on every decedent
    // service (the containment group above holds both to it); here, only that the readout follows the gates.
    const blockOpen = src.indexOf('id="estate-doc-fields"');
    const readout = src.indexOf('id="i-gate-readout"');
    const gate = src.indexOf('id="i-gate-706"');
    ok(readout > gate, 'the readout follows the gates it explains');
    ok(gate > blockOpen && readout > blockOpen && readout < src.indexOf('id="i-doclevel-block"'), 'and sits in the same block, above the level');
  }

  // ⚠ WHAT THE LEVEL MEANS ON A LIVING SERVICE (Anthony, 2026-10-18: "if we are just doing a normal cleanout or home
  // transition … does 'auto' work? what is 'standard'"). The control sat on every service with the estate's hint, and the
  // readout that explains it is in the estate block. One namer, intakeDocLevelCopy: a living service gets its own first
  // option and hint; an estate, Home Prep's hidden control and a blank service keep the markup's words. The painter
  // withholds the explicit Standard option there (two options answering one question) and restores the estate's hint
  // as HTML. The value saved does not change: '' stays "not set by hand".
  group('the documentation level says what it means on the service in front of you');
  {
    const c = sandbox({
      fns: ['intakeDocLevelCopy', 'paintIntakeDocLevel', 'svcFamily', 'isDecedentJob'],
      vars: ['SVC_ORDER', 'DECEDENT_SERVICES'],
      stubs: { document: domStub({}) },
    });
    ['downsizing', 'downsizing_move', 'home_cleanout', 'prep'].forEach((svc) => {
      const copy = c.intakeDocLevelCopy(svc);
      ok(copy && copy.auto === 'Standard \u2014 the normal job', svc + ': the first option reads Standard, the normal job');
      ok(copy && /chain-of-custody/.test(copy.hint), svc + ': the hint names the custody log Formal adds');
      ok(copy && /appraised or waived/.test(copy.hint), svc + ': and the appraisal block');
      ok(copy && /Either way the house is photographed/.test(copy.hint), svc + ': and says the house is photographed either way');
      ok(copy && !/706|grey|court/i.test(copy.hint), svc + ': and none of the estate\'s words');
    });
    ['cleanout', 'probate', 'contested_probate', '', 'nonsense'].forEach((svc) => {
      eq(c.intakeDocLevelCopy(svc), null, JSON.stringify(svc) + ': the markup\'s own (estate) words');
    });
    // The painter against a select with the three options and the hint as the markup ships them.
    const run = (svc, before) => {
      const d = domStub({});
      const opts = [{ value: '', textContent: 'Auto \u2014 set by the answers above', hidden: false },
                    { value: 'standard', textContent: 'Standard', hidden: false },
                    { value: 'formal', textContent: 'Formal \u2014 court & attorney grade', hidden: false }];
      d.__seed('i-doclevel', { options: opts, value: (before && before.value) || '' });
      // ⚠ A STUB WHOSE textContent AND innerHTML ARE ONE STRING, as a browser's are: writing text escapes it into the
      // HTML, and reading text strips the tags. Two independent properties let a restore through textContent pass the
      // HTML assertion below (the revert sweep caught it: the revert stayed green).
      const hintEl = d.__seed('i-doclevel-hint', {});
      let html = 'On an estate the <em>answers above</em> decide this';
      Object.defineProperty(hintEl, 'innerHTML', { get() { return html; }, set(v) { html = String(v); }, configurable: true });
      Object.defineProperty(hintEl, 'textContent', { get() { return html.replace(/<[^>]+>/g, ''); },
        set(v) { html = String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }, configurable: true });
      const s = sandbox({ fns: ['intakeDocLevelCopy', 'paintIntakeDocLevel', 'svcFamily', 'isDecedentJob'], vars: ['SVC_ORDER', 'DECEDENT_SERVICES'], stubs: { document: d } });
      (before && before.first || []).forEach((sv) => s.paintIntakeDocLevel(sv));
      s.paintIntakeDocLevel(svc);
      const sel = d.getElementById('i-doclevel'), hint = d.getElementById('i-doclevel-hint');
      return { opt0: sel.options[0].textContent, stdHidden: !!sel.options[1].hidden, value: sel.value, text: hint.textContent, html: hint.innerHTML };
    };
    let r = run('downsizing_move');
    eq(r.opt0, 'Standard \u2014 the normal job', 'Home Transition: the first option is repainted');
    eq(r.stdHidden, true, 'the explicit Standard option is withheld');
    ok(/chain-of-custody/.test(r.text), 'the hint is the living copy');
    r = run('downsizing_move', { value: 'standard' });
    eq(r.value, '', 'a Standard carried over reads as the same answer, so the withheld option never shows blank');
    r = run('cleanout', { first: ['downsizing_move'] });
    eq(r.opt0, 'Auto \u2014 set by the answers above', 'back on an estate the first option reads Auto again');
    eq(r.stdHidden, false, 'Standard is offered again');
    eq(r.html, 'On an estate the <em>answers above</em> decide this', 'and the estate hint comes back as HTML, emphasis intact');
    r = run('', { first: ['home_cleanout'] });
    eq(r.opt0, 'Auto \u2014 set by the answers above', 'a blank service reads as the markup ships it');
    // toggleIntakeFields calls it, guarded like onDocGateChange, so every sandbox that lifts the toggle keeps working.
    has(src, "if (typeof paintIntakeDocLevel === 'function') paintIntakeDocLevel(svc);", 'the toggle paints the words on every service change');
    // The markup: the level keeps its three options and the hint carries the id the painter reads.
    const sel = src.slice(src.indexOf('<select id="i-doclevel"'), src.indexOf('</select>', src.indexOf('<select id="i-doclevel"')));
    has(sel, '<option value="">Auto &mdash; set by the answers above</option>', 'the markup ships Auto first');
    has(sel, '<option value="standard">Standard</option>', 'then Standard');
    has(src, '<div id="i-doclevel-hint"', 'the hint has the id the painter reads');
    // The Notes label counts no questions (the card holds two questions and nine rows).
    has(src, '<label>Notes <span class="lbl-hint">&mdash; anything not covered above</span></label>', 'the Notes label reads "anything not covered above"');
    lacks(src, 'the two questions above did not cover', 'and no longer counts two questions');
  }
};
