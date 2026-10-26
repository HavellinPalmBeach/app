// THE $100 REVIEW FLOOR (2026-10-25, Q99 and Q100).
//
// Anthony, after the one look per line (agents-together.test.js): *"I'd prefer not to have to review absolutely every
// item if we don't need to. If we can have a below a de minimis line or below $100 or something … I don't want to have
// to manually tick a drawer of like stainless steel silverware or a junk drawer filled with tape and whatever. Like, so
// let's just have some sort of threshold that does not require a review."* He took $100 (Q99), measured on the top of
// Agent Two's range for the whole line, with what a person must see always left out; and for the papers *"Say so on the
// stamp"* (Q100): "REVIEWED — 42 items checked; 158 under $100 accepted as valued".
//
//   A · the rule: invLineUnderFloor, each thing it leaves for a person, the top of the range, the count carrying the range
//   B · its readers: invLineReviewed (and so the Not reviewed chip, the unsure hint and the group counts), the row's box
//   C · the papers: _invReviewStats' floor count, _invProgressStamp's words, _avUnreviewedStamp
//   D · one definition: INV_REVIEW_FLOOR read only where it should be, and no second copy of the figure
const { sandbox, source, fn } = require('./harness');

const FNS = ['invLineUnderFloor', 'invLineReviewed', 'agentValueUnreviewed', '_avHasFigure', '_invHasValue', 'agentValueStale', '_agNameKey',
  'invIsFirearm', 'invIsIntrinsic', 'invCatMeta', 'invLineUnsure', '_invReviewStats', '_invFloorStampWords', '_invProgressStamp',
  '_avUnreviewedStamp', 'fmt', 'roundCents', '_invQtyCarriesValue', 'invLineQty', 'invAppraised', 'invIsMAIV', 'invMAIVDefaultCat', '_arDupEligible'];
const VARS = ['INV_REVIEW_FLOOR', 'INV_TAXONOMY', 'INV_WORK_FLAGS', 'MAIV_OTHER', 'MAIV_BY_CATEGORY'];
const ctx = () => sandbox({ fns: FNS, vars: VARS });
// A line Agent One named and Agent Two valued as an everyday lot, under the floor: the cutlery drawer.
const DRAWER = (o) => Object.assign({ stableId: 'd1', label: 'inventory', objectName: 'Stainless flatware and kitchen utensils, drawer',
  namedBy: 'agent', agentConf: 'medium', category: 'General/Household', qty: 1, disposition: 'Donate', driveFileId: 'F1',
  valuedBy: 'agent', fmv: 40, valLow: 20, valHigh: 60, valConf: 'medium', valSource: 'General estimate',
  valNameAt: 'Stainless flatware and kitchen utensils, drawer' }, o || {});
const attempt = (f) => { try { return { ok: true, val: f() }; } catch (e) { return { ok: false, err: String(e && e.message || e) }; } };
const live = (s) => s.split('\n').map((l) => l.replace(/^\s*\/\/.*$/, '')).join('\n');

module.exports = function ({ group, ok, eq, has, lacks }) {
  // ═══ A · THE RULE ═══
  group('⚠⚠ A · under $100 on the top of Agent Two\'s range, nothing flagged: the line passes by itself');
  {
    const C = ctx();
    eq(C.INV_REVIEW_FLOOR, 100, 'the floor is $100 (Anthony, Q99)');
    eq(C.invLineUnderFloor(DRAWER()), true, '⚠⚠ the cutlery drawer, $20–$60: under the floor');
    eq(C.invLineUnderFloor(DRAWER({ objectName: 'Junk drawer: tape, batteries, pens', valNameAt: 'Junk drawer: tape, batteries, pens', fmv: 5, valLow: 0, valHigh: 10, valConf: 'low' })), true,
      'the junk drawer, even on a low-confidence figure: its top is $10');
    eq(C.invLineUnderFloor(DRAWER({ fmv: 80, valHigh: 140 })), false, '⚠ measured on the top of the range: $80 with a top of $140 is not under');
    eq(C.invLineUnderFloor(DRAWER({ fmv: 100, valLow: 100, valHigh: 100 })), false, 'exactly $100 is not under');
    eq(C.invLineUnderFloor(DRAWER({ valHigh: undefined, valLow: undefined, fmv: 60 })), true, 'a figure with no range: the figure itself');
    eq(C.invLineUnderFloor(DRAWER({ fmv: '', valLow: 30, valHigh: 70 })), true, 'a range with no figure (where counsel values): its top');
    // Only Agent Two's figure.
    eq(C.invLineUnderFloor(DRAWER({ valuedBy: 'desk', valHigh: undefined, valLow: undefined })), false, 'a figure a person typed: not the floor (a person can tick it)');
    eq(C.invLineUnderFloor(DRAWER({ valuedBy: 'appraiser' })), false, 'an appraiser\'s: not the floor');
    eq(C.invLineUnderFloor(DRAWER({ valuedBy: undefined, fmv: '', valLow: undefined, valHigh: undefined })), false, 'no value yet: not the floor');
    eq(C.invLineUnderFloor(DRAWER({ deletedAt: 5 })), false, 'a removed line: nothing');
    // Each thing left for a person.
    [['a firearm', { category: 'Firearms' }], ['an NFA flag', { flagNFA: true }], ['jewellery', { category: 'Jewelry & Watches' }],
     ['silver', { category: 'Silver & Precious Metal' }], ['art', { category: 'Art & Décor' }], ['antiques', { category: 'Antiques' }],
     ['a rug', { category: 'Rugs & Carpets' }], ['a collectible', { category: 'Collectibles' }], ['wine', { category: 'Wine & Spirits' }],
     ['an instrument', { category: 'Musical Instruments' }], ['a line ticked for appraisal', { needsAppr: true }],
     ['a line linked to an appraiser', { apprId: 'a1' }], ['a specific bequest', { flagBequest: true }], ['a dispute', { flagDisputed: true }],
     ['marked artistic value', { flagMAIV: 'yes' }], ['a note from Agent One', { agentNotices: [{ kind: 'other', text: 'a mark under the base' }] }],
     ['a note from Agent Two', { valNotices: [{ kind: 'appraiser', text: 'a signed piece' }] }],
     ['a figure made for an earlier name', { objectName: 'Sterling flatware, Gorham' }]]
      .forEach(([what, o]) => eq(C.invLineUnderFloor(DRAWER(o)), false, '⚠ left for a person: ' + what));
    // The count carries the range: twelve plates at $8 is over, and the line comes back to a person.
    const plates = DRAWER({ objectName: 'White dinner plates', valNameAt: 'White dinner plates', qty: 4, fmv: 32, valLow: 24, valHigh: 40 });
    ok(C.invLineUnderFloor(plates), 'fixture: four plates, top $40, under');
    plates.qty = 12;
    const r = attempt(() => C._invQtyCarriesValue(plates, 8, 4));
    ok(r.ok && r.val === true, 'the count carries Each (' + (r.err || '') + ')');
    eq([plates.fmv, plates.valHigh], [96, 120], 'the total and the top of the range follow the count');
    eq(C.invLineUnderFloor(plates), false, '⚠⚠ the top now $120: over the floor, back to a person');
  }

  // ═══ B · ITS READERS ═══
  group('⚠⚠ B · the floor is the line\'s review: Not reviewed, unsure, the row\'s box');
  {
    const C = ctx();
    eq(C.invLineReviewed(DRAWER()), true, '⚠⚠ the drawer counts as reviewed with nobody ticking it');
    eq(C.invLineReviewed(DRAWER({ fmv: 150, valLow: 120, valHigh: 180 })), false, 'a line over the floor still waits for the tick');
    eq(C.invLineReviewed(DRAWER({ category: 'Silver & Precious Metal' })), false, '…and so does silver at any figure');
    eq(C.invLineUnsure(DRAWER({ valConf: 'low', agentConf: 'low' })), false,
      'no unsure hint under the floor, a guess or not (the figure there is the review)');
    const chip = C.INV_WORK_FLAGS.find((f) => f.key === 'unreviewed');
    ok(chip && chip.label === 'Not reviewed', 'fixture: the Not reviewed chip');
    eq(chip ? chip.test(DRAWER()) : null, false, '⚠ the drawer is not counted on Not reviewed');
    eq(chip ? chip.test(DRAWER({ fmv: 150, valHigh: 180 })) : null, true, 'a $150 line is');
    // The row reads the one rule: its box ticked and greyed, and its tooltip saying why.
    has(live(fn('_renderInvRow')), '_invRevBoxHtml(jid, ref)', 'the row draws the one box');
    const row = live(fn('_invRevBoxHtml'));
    has(row, "(invLineReviewed(ref) ? ' checked' : '') + (invLineReviewed(ref) && !ref.reviewed ? ' disabled' : '')", 'the box: ticked and fixed where the review is derived');
    has(row, "invLineUnderFloor(ref) && !ref.valReviewed ? esc('Under ' + fmt(INV_REVIEW_FLOOR) + ' and nothing flagged: Agent Two", '⚠ its tooltip names the floor');
    has(live(fn('invLineReviewed')), 'if (invLineUnderFloor(r)) return true;\n  if (agentValueUnreviewed(r)) return false;', 'the floor is asked before the unseen figure');
  }

  // ═══ C · THE PAPERS ═══
  group('⚠⚠ C · the papers say how many passed by the floor (Q100: "Say so on the stamp")');
  {
    const C = ctx();
    const checked = (n) => Array.from({ length: n }, (_, i) => DRAWER({ stableId: 'c' + i, fmv: 500, valLow: 400, valHigh: 600, reviewed: true, valReviewed: true }));
    const small = (n) => Array.from({ length: n }, (_, i) => DRAWER({ stableId: 's' + i }));
    const st = C._invReviewStats(checked(42).concat(small(158)));
    eq([st.done, st.total, st.complete, st.floor], [200, 200, true, 158], 'the counts: all reviewed, 158 by the floor');
    const text = (h) => String(h).replace(/<[^>]+>/g, ' ').replace(/&mdash;/g, '—').replace(/\s+/g, ' ').trim();
    has(text(C._invProgressStamp(checked(42).concat(small(158)))), 'REVIEWED — 42 items checked; 158 under $100 accepted as valued',
      '⚠⚠ the stamp, in Anthony\'s words');
    has(text(C._invProgressStamp(checked(1).concat(small(1)))), 'REVIEWED — 1 item checked; 1 under $100 accepted as valued', 'one of each, singular');
    has(text(C._invProgressStamp(small(12))), 'REVIEWED — all 12 under $100 accepted as valued', 'all of them under the floor');
    has(text(C._invProgressStamp(checked(3))), 'REVIEWED — all 3 items', '⚠ none under the floor: the stamp reads as it always did');
    const open = checked(30).concat(small(158), [DRAWER({ stableId: 'o1', fmv: 500, valHigh: 600 }), DRAWER({ stableId: 'o2', fmv: 900, valHigh: 1200 })]);
    has(text(C._invProgressStamp(open)), 'IN PROGRESS — 30 of 32 items checked; 158 under $100 accepted as valued', 'in progress, the floor named beside it');
    has(text(C._invProgressStamp([DRAWER({ fmv: 500, valHigh: 600 }), {}].concat(checked(1)))), 'IN PROGRESS — 1 of 3 items reviewed',
      'none under the floor: the in-progress stamp reads as it always did');
    has(text(C._invProgressStamp(checked(2).concat(small(5)), { noValues: true })), 'REVIEWED — 2 items checked; 5 everyday items accepted as named',
      'a paper that states no values (the Contents List) names no figure');
    // A person's tick takes a line off the floor's count: they looked.
    const ticked = small(3); ticked[0].reviewed = true; ticked[0].valReviewed = true;
    eq(C._invReviewStats(ticked).floor, 2, '⚠ a drawer somebody ticked is checked, not accepted by the floor');
    // The schedules' value stamp.
    const sched = text(C._avUnreviewedStamp(small(4).concat([DRAWER({ stableId: 'x', fmv: 500, valLow: 400, valHigh: 600 })])));
    has(sched, '1 value not yet reviewed', '⚠ only the value over the floor is "not yet reviewed"');
    has(sched, '4 under $100 accepted as valued', '…and the schedule says how many the floor accepted');
    eq(text(C._avUnreviewedStamp(checked(2))), '', 'nothing to say: nothing');
    // Every paper that stamps progress passes through the one stamp (the Contents List with noValues).
    const src = live(source());
    const callers = (src.match(/_invProgressStamp\(/g) || []).length - 1;
    ok(callers >= 4, 'the papers call the one stamp (' + callers + ')');
    has(src, '_invProgressStamp(rec.items, { noValues: true })', 'the Contents List asks it without values');
  }

  // ═══ D · ONE DEFINITION ═══
  group('D · one figure, read by the rule and the words that name it');
  {
    const src = live(source());
    ok(src.length > 1500000, 'fixture: the live source read whole (' + src.length + ' chars)');
    eq((src.match(/var INV_REVIEW_FLOOR = 100;/g) || []).length, 1, 'one figure');
    const readers = ['invLineUnderFloor', '_invFloorStampWords', '_avUnreviewedStamp', '_invRevBoxHtml'];
    readers.forEach((n) => has(live(fn(n)), 'INV_REVIEW_FLOOR', n + ' reads it'));
    eq((src.match(/INV_REVIEW_FLOOR/g) || []).length, readers.length + 1, 'and nothing else does (the declaration and one read in each)');
    const floorCalls = (src.match(/invLineUnderFloor\(/g) || []).length - 1;
    eq(floorCalls, 6, 'invLineUnderFloor\'s readers: invLineReviewed, the stats, the value stamp twice and the row\'s tooltip twice (' + floorCalls + ')');
  }

  // ═══ E · THE PAGES SAY IT ═══
  // The manual and the playbook, HTML and markdown, carry the floor's note, what it leaves for a person, the stamp in Anthony's
  // words (Q100), the Contents List's and the schedules' words, and no sentence left saying every line waits for a tick.
  group('E · the pages say it: the manual and the playbook, HTML and markdown');
  {
    const fs = require('fs'), path = require('path');
    const rd = (f) => { try { return fs.readFileSync(path.join(__dirname, '..', f), 'utf8'); } catch (e) { return ''; } };
    const dec = (h) => String(h).replace(/&mdash;/g, '—').replace(/&rsquo;|&lsquo;/g, "'").replace(/&ldquo;|&rdquo;/g, '"').replace(/&hellip;/g, '…')
      .replace(/&eacute;/g, 'é').replace(/&amp;/g, '&').replace(/<[^>]+>/g, '').replace(/\*\*?|`/g, '').replace(/[’‘]/g, "'").replace(/\s+/g, ' ');
    const MAN = 'Under $100, no tick (2026-10-25, Q99)', PB = 'Under $100, no tick (new 2026-10-25, Q99)';
    [['manual.html', MAN], ['MANUAL.md', MAN], ['concierge-guide.html', PB], ['CONCIERGE_GUIDE.md', PB]].forEach(([f, title]) => {
      const t = dec(rd(f));
      ok(t.length > 100000, f + ': fixture: the page read (' + t.length + ' chars)');
      eq(t.split(title).length - 1, 1, f + ': ⚠⚠ the note, once');
      // The note itself, to its end: the next note's title or the end of the page, bounded.
      const at = t.indexOf(title), note = at < 0 ? '' : t.slice(at, at + 2600);
      ok(note.length > 800, f + ': fixture: the note sliced (' + note.length + ' chars)');
      has(note, '$100', f + ': the figure');
      [['the top of the range', /top of its range/], ['a firearm', /firearm/], ['NFA', /NFA/], ['silver', /silver/i], ['jewelry', /jewelry/i],
       ['art', /\bart\b|Art & Décor/], ['an appraiser', /appraiser/], ['a bequest', /bequest/], ['a dispute', /dispute/], ['a note', /note from Agent One|left a note/],
       ['a value made for another name', /earlier name|name changed/], ['the count bringing it back', /\$120/]]
        .forEach(([what, re]) => ok(re.test(note), f + ': the note names ' + what));
      has(note, "Under $100 and nothing flagged: Agent Two's value counts as the review", f + ': the row\'s tooltip, word for word');
      has(t, 'REVIEWED — 42 items checked; 158 under $100 accepted as valued', f + ': ⚠⚠ the stamp, in Anthony\'s words');
      has(t, 'IN PROGRESS — 30 of 32 items checked; 158 under $100 accepted as valued', f + ': the stamp in progress');
      has(note, 'everyday items accepted as named', f + ': the Contents List\'s words');
      ok(/grey (N|158) under \$100 accepted as valued/.test(t), f + ': the schedules\' grey count');
      has(t, 'N values not yet reviewed', f + ': …beside N values not yet reviewed');
    });
    // The sentences that said every line waits for a person are restated.
    ['manual.html', 'MANUAL.md'].forEach((f) => {
      const t = dec(rd(f));
      lacks(t, 'Nothing is marked reviewed by the agent, so every client document still carries', f + ': the old "nothing is marked reviewed" claim is restated');
      has(t, 'unless Agent Two has valued it since: then tick it (since 2026-10-25, not where that value is under $100', f + ': a name you typed, restated');
      has(t, 'that count leaves out the values under $100 that count as reviewed by themselves', f + ': the schedules\' count, restated');
    });
    ['concierge-guide.html', 'CONCIERGE_GUIDE.md'].forEach((f) => {
      const t = dec(rd(f));
      lacks(t, 'Until every line is ticked the document prints', f + ': the old "until every line is ticked" is restated');
      has(t, 'is ticked and greyed, and nobody ticked it', f + ': the symptom row');
      has(t, 'wants the tick, unless that value is under $100 with nothing flagged', f + ': a name you typed, restated');
    });
    // The words the pages quote are the code's.
    const C = ctx();
    const text = (h) => String(h).replace(/<[^>]+>/g, ' ').replace(/&mdash;/g, '—').replace(/\s+/g, ' ').trim();
    const small = (n) => Array.from({ length: n }, (_, i) => DRAWER({ stableId: 's' + i }));
    has(text(C._invProgressStamp(small(158), { noValues: true })), '158 everyday items accepted as named', 'the Contents List\'s words are the stamp\'s');
    has(text(C._avUnreviewedStamp(small(158))), '158 under $100 accepted as valued', 'the schedules\' words are the stamp\'s');
    has(live(fn('_invRevBoxHtml')), "' and nothing flagged: Agent Two\\u2019s value counts as the review'", 'the tooltip the pages quote is the row\'s');
  }
};
