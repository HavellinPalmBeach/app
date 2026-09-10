'use strict';
// The Build Estimate walkthrough — the order the tab asks its questions in, and the one
// control that answers a question about the whole property.
//
// THE DEFECT THIS SUITE EXISTS FOR (2026-09-10). "How full is this house?" was applied
// ONCE, to whatever rooms happened to be ticked at the moment it was pressed. That is the
// wrong half of a walkthrough: rooms are ticked AS YOU WALK, so on the natural order —
// stand in the first room, say the place is packed, then work through the house — every
// room after the press silently reverted to the bare ROOM_DEFAULTS. The estimator had told
// the app the property was packed and the app had agreed about the first few rooms.
//
// It is the invisibility that makes it expensive rather than annoying. A room sitting at 3
// because a preset never reached it is indistinguishable from a room at 3 somebody meant,
// and volume is averaged across the rooms scored and applied to the whole square footage —
// so the under-scoring is not confined to the rooms it happened to, it moves the price of
// the entire job. Nothing on the screen could ever have shown it.
//
// The other half is the converse and it is just as load-bearing: a preset must NEVER
// overwrite a room somebody scored by hand. That number is a direct observation — a person
// standing in the room looking at it — and a preset is a guess about the property as a
// whole. The guess does not get to flatten the observation.

const { sandbox, source, fn } = require('./harness');

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();

  // A DOM that auto-vivifies: the room grid is nineteen sections wide and every row owns
  // seven elements, so enumerating them is how one gets missed. Everything setRoomState and
  // applyVolPreset reach for exists; nothing is null.
  function build() {
    const els = {};
    const document = {
      getElementById(id) {
        if (!(id in els)) {
          els[id] = {
            id, value: '', className: '', innerHTML: '', title: '', textContent: '',
            tagName: 'SPAN', disabled: false, checked: false, style: {}, _a: {},
            getAttribute(k) { return this._a[k]; },
            setAttribute(k, v) { this._a[k] = v; },
          };
        }
        return els[id];
      },
    };
    const fb = [];
    const ctx = sandbox({
      fns: ['roomDefault', 'volPresetShift', 'volPresetSeed', 'volPresetLabel',
            'applyVolPreset', 'paintVolPreset', 'roomState', 'setRoomState', 'cycleRoom',
            'onVolInput'],
      vars: ['ROOMS', 'ROOM_DEFAULTS', 'VOL_PRESETS', '_volHandSet', '_volPreset'],
      stubs: {
        document,
        calcAll() {},
        updateRoomSectionCounts() {},
        showFB(el, kind, msg) { fb.push({ kind, msg }); },
        _activeRecognitions: null,
      },
    });
    // Name every row the way the real grid does, so roomDefault resolves.
    const names = [];
    let ri = 0;
    ctx.ROOMS.forEach((sec) => sec.rooms.forEach((r) => {
      document.getElementById('name-r' + ri).textContent = r.name;
      names.push(r.name);
      ri++;
    }));
    const idOf = (name) => 'r' + names.indexOf(name);
    const vol = (name) => document.getElementById('vol-' + idOf(name)).value;
    return { ctx, els, document, fb, names, idOf, vol };
  }

  // Two rooms that sit at opposite ends of ROOM_DEFAULTS: a foyer opens at 1 because a
  // foyer is inherently light whatever the house is like; a living room opens at the
  // neutral 3. Everything about "shift, never blanket" is visible in the pair.
  const LIGHT = 'Entryway / Foyer';
  const NORMAL = 'Living Room';

  group('volPresetSeed — the shift, clamped, with the room structure preserved');
  {
    const { ctx } = build();
    eq(ctx.roomDefault(LIGHT).vol, 1, 'the foyer is a 1 by default');
    eq(ctx.roomDefault(NORMAL).vol, 3, 'a living room is the neutral 3');

    ctx._volPreset = 'normal';
    eq(ctx.volPresetSeed(LIGHT), 1, 'Normal is the default, unshifted');
    eq(ctx.volPresetSeed(NORMAL), 3, 'for every room');

    ctx._volPreset = 'packed';
    eq(ctx.volPresetSeed(LIGHT), 3, 'Packed lifts the foyer by two');
    eq(ctx.volPresetSeed(NORMAL), 5, 'and the living room to the top of the scale');
    ok(ctx.volPresetSeed(LIGHT) < ctx.volPresetSeed(NORMAL),
      'A PRESET IS A SHIFT, NOT A BLANKET — a packed powder room is still not a packed garage');

    ctx._volPreset = 'seasonal';
    eq(ctx.volPresetSeed(LIGHT), 1, 'Seasonal clamps the foyer at the 1 floor rather than negative');
    eq(ctx.volPresetSeed(NORMAL), 1, 'and takes the living room down to it');

    ctx._volPreset = 'nonsense';
    eq(ctx.volPresetSeed(NORMAL), 3, 'an unknown key is a zero shift, never a throw');
  }

  group('⚠ THE DEFECT: a room ticked AFTER the preset inherits it');
  {
    const { ctx, vol, idOf, fb } = build();

    // The real walkthrough order: answer the question about the house, then walk it.
    ctx.applyVolPreset('packed');
    eq(ctx._volPreset, 'packed', 'the preset is set even with nothing ticked yet');
    has(fb[0].msg, 'every room you tick from here opens at Packed',
      'and says so rather than warning — pressing this first is the sensible opening move');
    eq(fb[0].kind, 'ok', 'it reports, it does not warn');

    ctx.setRoomState(idOf(NORMAL), 'in');
    eq(vol(NORMAL), 5, 'THE FIX: a room ticked after the press opens Packed, not at the bare default');
    ctx.setRoomState(idOf(LIGHT), 'in');
    eq(vol(LIGHT), 3, 'and the light room keeps its own lower starting point');

    // The same walkthrough at the other end of the scale.
    const b = build();
    b.ctx.applyVolPreset('seasonal');
    b.ctx.setRoomState(b.idOf(NORMAL), 'in');
    eq(b.vol(NORMAL), 1, 'a seasonal house opens its rooms low');
  }

  group('⚠ A ROOM SCORED BY HAND IS NEVER OVERWRITTEN BY A PRESET');
  {
    const { ctx, els, document, vol, idOf, fb } = build();
    ctx.applyVolPreset('normal');
    ctx.setRoomState(idOf(NORMAL), 'in');
    ctx.setRoomState(idOf(LIGHT), 'in');
    eq(vol(NORMAL), 3, 'both open at Normal');
    eq(vol(LIGHT), 1, 'both open at Normal');

    // The estimator is standing in the living room and it is stuffed.
    document.getElementById('vol-' + idOf(NORMAL)).value = 5;
    ctx.onVolInput(idOf(NORMAL));
    ok(ctx._volHandSet[idOf(NORMAL)], 'typing a volume marks that room hand-scored');
    ok(!ctx._volHandSet[idOf(LIGHT)], 'and only that room');

    fb.length = 0;
    ctx.applyVolPreset('seasonal');
    eq(vol(NORMAL), 5, 'the observation survives a later preset');
    eq(vol(LIGHT), 1, 'while every other room re-bases around it');
    has(fb[0].msg, '1 scored by hand left as it is',
      'and the feedback says what it did NOT touch — a silent skip reads as a broken button');

    // Idempotent, and re-basing rather than compounding.
    ctx.applyVolPreset('packed');
    eq(vol(LIGHT), 3, 'a second preset re-bases from the default rather than compounding');
    ctx.applyVolPreset('packed');
    eq(vol(LIGHT), 3, 'and pressing the same one twice lands on the same number');
    eq(vol(NORMAL), 5, 'the hand-scored room is still untouched');
  }

  group('leaving scope is the way back — the flag never outlives the value it describes');
  {
    const { ctx, document, vol, idOf } = build();
    ctx.applyVolPreset('packed');
    ctx.setRoomState(idOf(NORMAL), 'in');
    document.getElementById('vol-' + idOf(NORMAL)).value = 2;
    ctx.onVolInput(idOf(NORMAL));
    ok(ctx._volHandSet[idOf(NORMAL)], 'hand-scored');

    ctx.setRoomState(idOf(NORMAL), 'off');
    ok(!ctx._volHandSet[idOf(NORMAL)], 'unticking clears the flag with the value');
    ctx.setRoomState(idOf(NORMAL), 'in');
    eq(vol(NORMAL), 5, 're-ticking hands the room back to the preset');

    // Out of scope clears the score too, so it must clear the flag on the same branch.
    document.getElementById('vol-' + idOf(NORMAL)).value = 2;
    ctx.onVolInput(idOf(NORMAL));
    ctx.setRoomState(idOf(NORMAL), 'excl');
    ok(!ctx._volHandSet[idOf(NORMAL)], 'marking a room out of scope clears it as well');
  }

  group('a press that moves nothing says so');
  {
    const { ctx, document, idOf, fb } = build();
    ctx.setRoomState(idOf(NORMAL), 'in');
    document.getElementById('vol-' + idOf(NORMAL)).value = 4;
    ctx.onVolInput(idOf(NORMAL));
    fb.length = 0;
    ctx.applyVolPreset('packed');
    has(fb[0].msg, 'kept the score you typed', 'the one room in scope was hand-scored, and it says which way');
    has(fb[0].msg, 'untick and re-tick', 'and carries the fix, the way every blocker panel in the app does');
  }

  group('the preset rides the snapshot, keyed on the room record and not the row id');
  {
    // Row ids are positional. CLAUDE.md records what trusting an idx across a ROOMS insert
    // costs: a saved estimate restores its scores onto whatever row inherited the number.
    // volSet travels on the saved ROOM, so it restores through the same section+name
    // matching every other per-room field already uses.
    has(src, 'volSet: !!_volHandSet[id]', 'calcAll records which rooms were hand-scored');
    has(src, 'volSet: !!m.volSet', 'and the snapshot carries it on the room record');
    lacks(src, 'volHandSet: _volHandSet', 'never as a map keyed by row id — those are positional');
    has(fn('restoreEstimateToUI'), 'if (savedRoom.volSet) _volHandSet[id] = true; else delete _volHandSet[id];',
      'reopening an estimate restores which rooms were observed');
    has(fn('resetEstimate'), '_volHandSet = {}', 'Reset clears them');

    // ⚠ AND SWITCHING JOBS CLEARS THE PRESET ITSELF. neutralizeEstimateView exists because a
    // Home Prep estimate once bled into an unrelated Estate Settlement job, and it already
    // drops the α pin, the cost pin and the documentation scope for that reason. The fullness
    // preset joined that line the day setRoomState began SEEDING from it: while it was a
    // one-shot sweep a stale _volPreset only lit the wrong chip, but a seed carried across a
    // job switch prices the next property off the last one's answer.
    has(fn('neutralizeEstimateView'), "_volPreset = 'normal'; _volHandSet = {}; paintVolPreset();",
      'opening another job does not price it at the last job\'s fullness');
    has(fn('neutralizeEstimateView'), '_estimateAlphaPin = null',
      'alongside the pins it already drops for the same reason');

    // The seed is defined once. Two copies of the shift is exactly how applyVolPreset and
    // setRoomState came to disagree about the same house in the first place.
    const seeds = (src.match(/roomDefault\([A-Za-z]+\)\.vol \+ /g) || []).length;
    eq(seeds, 1, 'the default+shift arithmetic exists in exactly one place (volPresetSeed)');
    has(fn('setRoomState'), 'vol.value = volPresetSeed(rname)', 'and setRoomState reads it');
    has(fn('applyVolPreset'), 'volEl.value = volPresetSeed(nm)', 'as does applyVolPreset');
    has(fn('onVolInput'), '_volHandSet[id] = true', 'the estimator\'s keystroke is what sets the flag');
    const marks = (src.match(/_volHandSet\[id\] = true/g) || []).length;
    eq(marks, 2, 'set in exactly two places: the keystroke, and restoring a saved one');

    // Complexity is a different question and the preset must not reach it.
    lacks(fn('applyVolPreset'), 'cplx', 'a fullness preset never touches complexity');
  }

  group('⚠ THE TAB ASKS FOR VENDORS AFTER THE WALKTHROUGH, NOT BEFORE IT');
  {
    // You cannot know WHICH vendors a job needs until you have been through the house —
    // it is the collections and the vehicles that say there is an auction house, a
    // gemologist or a boat appraiser on this job at all. Asked at the top of the build
    // column the question had no answer yet, so it collected guesses.
    const at = (id) => src.indexOf('id="' + id + '"');
    ok(at('est-vendors-card') > at('est-rooms-card'), 'vendors come after the room grid');
    ok(at('est-vendors-card') > at('est-collections-card'), 'and after Notable Collections');
    ok(at('est-vendors-card') > at('est-vehicles-card'), 'and after Vehicles & Watercraft');
    ok(at('est-vendors-card') < at('est-materials-card'), 'and above Moving Materials');
    eq((src.match(/id="est-vendors-card"/g) || []).length, 1, 'exactly one vendor card');

    // A prep job shuttles the card up beside the Job block and has to put it back HERE.
    // Anchored on a named neighbour: "first child" is what stranded it at the top through
    // the reorder, because an ordinal cannot describe a position that has moved.
    const mode = fn('applyEstimateServiceMode');
    lacks(mode, 'buildCol.insertBefore(vendCard, buildCol.firstChild)',
      'the prep restore no longer anchors on the top of the column');
    has(mode, "buildCol.insertBefore(vendCard, matCard)", 'it restores the card above Moving Materials');
  }

  group('the sorting stage no longer claims we never work from a photograph');
  {
    // We do, and deliberately: a photograph emailed ahead is how a specialist says whether
    // an item is worth an on-site call-out, which saves the client an appraisal fee on
    // something that does not warrant one. The old sentence asserted the opposite outright.
    lacks(src, 'nothing is assessed from a photograph after the fact',
      'THE CLAIM IS GONE FROM THE FILE — it was not true of how the work is actually run');

    const ctx = sandbox({
      fns: ['_cePhases', 'estimateDocScope', 'docScopeDef', 'svcHasDocStep', 'isDecedentJob'],
      vars: ['JOB_STEPS', 'DOC_SCOPES', 'DECEDENT_SERVICES'],
      stubs: { isFormalDoc: () => true },
    });
    const withAppraiser = JSON.stringify(ctx._cePhases(
      { svc: 'cleanout', docScope: 'full', collections: [], vendors: [{ type: 'Art Appraiser' }] },
      { id: 1, svc: 'cleanout', executor: 'PR' }));
    has(withAppraiser, 'attend while the contents are still in place',
      'the specialist still attends — that part was always true and is the point');
    has(withAppraiser, 'we photograph a piece first and send it',
      'and the document now says we screen by photograph');
    has(withAppraiser, 'on-site appraisal is only booked where the item warrants one',
      'stated as what it is for the client: not paying for a visit that is not needed');
    has(withAppraiser, 'anything of consequence is valued in person',
      'while the promise that matters survives — the valuation itself is done on site');

    const noVendors = JSON.stringify(ctx._cePhases(
      { svc: 'cleanout', docScope: 'full', collections: [], vendors: [] },
      { id: 1, svc: 'cleanout', executor: 'PR' }));
    lacks(noVendors, 'photograph a piece first',
      'a job with no valuing specialist says nothing about photographs at all');
  }

  group('vendorEstimateNote — the figures are good faith, and the client sees the real bill');
  {
    const ctx = sandbox({ fns: ['vendorEstimateNote', 'prepFeeRate'], vars: ['PREP_FEE_RATE'] });
    const plain = ctx.vendorEstimateNote();

    has(plain, 'good-faith estimates taken at the walkthrough', 'it says what kind of number these are');
    has(plain, 'each vendor sets its own final price', 'and who actually sets the price');
    has(plain, 'invoices you directly', 'the half that makes the caveat a reassurance');
    has(plain, 'you will see their actual bill', 'the client is never taking our word for the figure');
    has(plain, 'may move', 'and the estimate is not held out as a price');

    // THE TWO HALVES MUST NOT BE SEPARATED. "These may move" alone is a hedge; it only
    // reads as straight dealing beside "and you will see the real invoice yourself".
    ok(plain.indexOf('good-faith') < plain.indexOf('invoices you directly'),
      'the caveat comes first and the reassurance answers it');

    // The prep arm's extra fact, and the rate is READ rather than written. A document that
    // hardcodes the digits is how the agreements went on selling a 15% vendor fee for five
    // weeks after SMF_PCT went to zero.
    const withFee = ctx.vendorEstimateNote({ feeTruesUp: true });
    has(withFee, "30% fee is charged on what the vendors", 'the prep arm says the fee follows the actuals');
    has(withFee, 'not on the estimate above', 'and explicitly not this page\'s figure');
    lacks(plain, 'fee is charged on what the vendors', 'a third-party-only job is not told about a prep fee');
    lacks(fn('vendorEstimateNote'), "'30%'", 'the rate is never a literal in the sentence');
    has(fn('vendorEstimateNote'), 'Math.round(prepFeeRate() * 100)', 'it reads prepFeeRate');

    // One sentence, three surfaces. Six client-facing surfaces each stating the vendor-fee
    // rule in their own words is a defect this file has already paid for once.
    eq((src.match(/vendorEstimateNote\(/g) || []).length, 4,
      'one definition and three call sites — the third-party band, bundled prep, standalone prep');
    lacks(src, 'Vendor amounts are estimates.',
      'the hand-written copy on the standalone prep form is gone, not left beside it');
  }

  group('the two disposition tables read as ONE column');
  {
    // Notable Collections and Vehicles & Watercraft are separate tables under separate
    // bands, and a reader takes the two right-hand columns as one list of answers. With the
    // default auto layout each table sized its first column to its OWN content, so a short
    // "Asian Art" put the disposition at 44% of the page while "Mercedes convertible" over a
    // spec line pushed the one below it out to 58% — the same kind of answer in two places.
    has(src, '.ce-disp-tbl{table-layout:fixed;}', 'fixed layout, so content cannot move the column');
    has(src, '.ce-disp-tbl td:first-child{width:55%;}', 'and one shared first-column width');
    eq((src.match(/ce-tbl ce-disp-tbl/g) || []).length, 2,
      'both disposition tables carry it — one of the two alone is the bug, not the fix');
    // The width is set once in CSS rather than inline on either table, so the two cannot
    // drift apart again the way they just did.
    lacks(fn('renderClientEstimate'), "width:55%", 'the width is not inlined on either table');
  }

  group('insured & bonded is claimed ONCE, in the footer');
  {
    // It was a Term as well, seven lines above the footer of the same document. Terms is
    // where a COMMERCIAL rule belongs — what the client is charged, what is billed at cost,
    // how long the quote stands — not a standing fact about the firm that the footer of
    // every Havellin document already carries.
    const ce = fn('renderClientEstimate');
    lacks(ce, 'Havellin Palm Beach is insured and bonded.', 'the Terms bullet is gone');
    eq((ce.match(/[Ii]nsured (&amp;|and) [Bb]onded/g) || []).length, 1,
      'and the claim survives exactly once — in the footer');
    has(ce, "'Insured &amp; Bonded' +", 'which is the footer line');
    // The licence rule this sits beside is unchanged and still absolute (see CLAUDE.md).
    lacks(src, 'Havellin Palm Beach is licensed', 'Havellin is still never described as licensed');
  }

  group('the vehicle row keeps + Add on one line');
  {
    // ⚠ flex-basis MUST be 0, and `auto` is not good enough: the global
    // input,select,textarea{width:100%} rule makes an auto basis resolve to the full row,
    // so the input claimed the whole line and the wrapping container pushed the button onto
    // a second one — leaving this card 43px deeper than Notable Collections beside it, in a
    // two-up whose columns are already the same width. Measured in Chromium, not guessed.
    has(src, "id=\"new-veh-desc\"", 'the input is still there');
    const row = src.slice(src.indexOf('id="vehicles-tbl"'), src.indexOf('id="est-vendors-card"'));
    has(row, 'flex:1 1 0;min-width:0;', 'basis 0 — it takes the space left over after the button');
    lacks(row, 'flex:1 1 100%', 'never 100%, which is what wrapped the button');
    lacks(row, 'flex:1 1 auto', 'and never auto, which the global width:100% rule resolves to the same thing');
  }

  group('the note is rendered ABOVE the numbers it qualifies');
  {
    // A caveat under a table is read after the total has already been taken as a price.
    // .ce-lead exists for exactly this: .ce-note is shaped to CLOSE a table.
    // ⚠ Asserted on the DECLARATION, not on the selector. `.ce-lead{` alone also matches the
    // phone override, so deleting the base rule left the check green — a stylesheet no test
    // can notice the loss of is the exact shape of the 2026-09-10 regex that ate 368 lines.
    has(src, '.ce-lead{font-size:11px;color:var(--gray);font-style:italic;', 'the base rule survives');
    has(src, 'border-bottom:1px solid var(--border);margin-bottom:0;}', 'shaped to butt onto the table below it');
    has(src, '  .ce-lead{font-size:9px', 'and is sized for the phone alongside .ce-note');

    const band = src.indexOf('Third-Party Vendors To Be Engaged</div>');
    const lead = src.indexOf("'<div class=\"ce-lead\">' + vendorEstimateNote() + '</div>'", band);
    const table = src.indexOf("'<table class=\"ce-tbl\">'", band);
    ok(lead > band && lead < table, 'the third-party note sits between its band and its table');

    has(src, "'<div class=\"ce-lead\">' + vendorEstimateNote({feeTruesUp: prepGcFee > 0}) + '</div>'",
      'the bundled Home Prep band carries it with the fee arm — that document\'s Terms never state it');
  }
};
