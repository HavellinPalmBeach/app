'use strict';
// APPRAISE IS A SECOND AVENUE, NOT A SEVENTH DISPOSITION (2026-09-11).
//
// Anthony, from a job site: "when we're doing the room by room sorting and taking pictures for
// an estate client, the only disposition avenues are auction, consign, donate, hold, junk, keep,
// or sell. And we need appraisal in there too... it might have two disposition avenues. First,
// appraise, then auction, consign, or sell."
//
// ⚠⚠ HE IS RIGHT ABOUT THE MODEL AND THE APP ALREADY HELD IT — an item carries a disposition
// AND `needsAppr` at the same time, and invNeedsAppraisal fires automatically off the category.
// What was actually wrong was that the flag could not be SET by a person (one writer in the
// whole file, the collector-vehicle import), that nothing in the field SAID the automatic rule
// had fired, and — the defect — that nothing downstream said an item was still waiting on one.
//
// ⚠⚠ THE MEASURED DEFECT, and it is the reason this file exists: `_invAwaitingApproval` filtered
// on disposition-plus-no-approval-date and consulted the appraisal track NOWHERE. So an object
// the app itself had flagged for a specialist, with no value on record, printed on the release
// approval request with Auction proposed and an initial box beside it, and the document never
// said it had not been valued. The representative initials it and it leaves the property
// unvalued. Byte-for-byte the shape of the bequest defect fixed the same day.

const { sandbox, source, fn, domStub } = require('./harness');

const noComments = (s) => String(s)
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

// The chain behind invAwaitingAppraisal is lifted for real rather than stubbed. Stubbing the
// predicate would be testing the stub — the lesson this project paid for on `_cePhases`.
const APPR_FNS = ['invAwaitingAppraisal', 'invNeedsAppraisal', '_invHasAppraisal',
                  '_jobAppraisers', 'invAppraisalThreshold', 'gateDispute', '_gateYes',
                  'invIsIntrinsic', 'invCatMeta', '_invJob'];
const APPR_VARS = ['INV_TAXONOMY', 'INV_APPRAISAL_THRESHOLD', 'INV_APPRAISAL_THRESHOLD_DISPUTED'];

const JOB = { id: 1, hvlId: 'HVL-0007', name: 'Butler Estate', client: 'Butler Estate',
              svc: 'probate', executor: 'Tripp Butler' };

const mk = (o) => Object.assign({ label: 'inventory', collId: null, roomIdx: null, qty: 1,
                                  ts: 1, updatedAt: 1 }, o);

function ctx(rows, extra) {
  return sandbox({
    fns: APPR_FNS, vars: APPR_VARS,
    stubs: Object.assign({
      jobs: [Object.assign({}, JOB)],
      _photoRefs: { 1: rows || [] },
    }, extra || {}),
  });
}

const readable = (html) => String(html).replace(/<[^>]+>/g, ' ')
  .replace(/&#9888;/g, '⚠').replace(/&#9873;/g, '⚑').replace(/&#10003;/g, '✓')
  .replace(/&middot;/g, '·').replace(/&rsquo;|&#8217;/g, '’')
  .replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ THE RULE — appraise is a PRECONDITION, and the list says so');
  {
    const s = sandbox({ vars: ['INV_DISPOSITIONS', 'INV_GROUP_ORDER', 'INV_RELEASE_DISPOSITIONS'] });

    // The deliverable is not "an Appraise chip was not added" — a label can be renamed. It is
    // that every value on this list is a DESTINATION, so the desk grouping, the release test
    // and the client workbook's rollup can all key on it and mean the same thing.
    eq(s.INV_DISPOSITIONS.indexOf('Appraise'), -1,
       '⚠ Appraise is NOT a disposition — every value here is a terminal destination');
    eq(s.INV_DISPOSITIONS.length, 7, 'the seven destinations are unchanged');
    s.INV_RELEASE_DISPOSITIONS.forEach((d) => {
      ok(s.INV_DISPOSITIONS.indexOf(d) >= 0, d + ' is a real disposition');
    });
    // ⚠ THE GROUPING AND THE LIST MUST AGREE, or an item lands in a section the desk never
    // renders and drops off the screen entirely.
    const grouped = s.INV_GROUP_ORDER.filter((g) => g !== '');
    eq(grouped.slice().sort().join(','), s.INV_DISPOSITIONS.slice().sort().join(','),
       'the desk groups exactly the dispositions that exist, plus the undecided bucket');
    eq(s.INV_GROUP_ORDER[0], '', 'and undecided sorts first, because it is the worklist');

    // The decision is recorded where someone would go to undo it.
    has(src, 'APPRAISE IS DELIBERATELY NOT ON THIS LIST',
        'the reasoning sits on the list itself, not only in a commit message');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ ONE DEFINITION of "still waiting on an appraisal"');
  {
    const s = ctx();
    const A = (r) => s.invAwaitingAppraisal(r, 1);

    ok(A(mk({ category: 'Art & Décor', fmv: '' })),
       'an intrinsic category with no value yet is waiting');
    ok(A(mk({ category: 'Rugs & Carpets', fmv: '9000' })),
       'and so is one over the threshold');
    ok(!A(mk({ category: 'Rugs & Carpets', fmv: '400' })),
       'a cheap rug with a value on record is not');
    ok(!A(mk({ category: 'Furniture', fmv: '' })),
       'and ordinary furniture never was');

    // ⚠ THE EXPLICIT FLAG IS THE HALF THAT WAS UNREACHABLE. The automatic rule covers art,
    // jewelry and silver; it cannot cover the period side table or the unmarked bronze.
    ok(A(mk({ category: 'Furniture', fmv: '2000', needsAppr: true })),
       '⚠ a person can force it onto the worklist from a NON-intrinsic category');
    ok(A(mk({ category: 'General/Household', fmv: '50', needsAppr: true })),
       'at any value — the whole point is that the app cannot tell');

    // Both escape hatches close it, and they are different acts.
    eq(A(mk({ category: 'Art & Décor', fmv: '', apprWaived: true })), false,
       'a logged waiver closes it');
    ok(!s.invAwaitingAppraisal(null, 1), 'no item is not a throw');

    // ⚠ WITHOUT A JOB IT MUST GO SILENT RATHER THAN GUESS: the threshold this estate is on and
    // its appraiser roster both live on the job, and answering confidently without them is how
    // a disputed estate gets evaluated at the ordinary $3,000.
    ok(!s.invAwaitingAppraisal(mk({ category: 'Art & Décor', fmv: '' }), undefined),
       '⚠ no job means no answer, never a guessed one');
  }

  group('a linked appraiser is what closes it, and only a REAL one');
  {
    const s = ctx([], { jobs: [Object.assign({}, JOB, {
      appraisers: [{ id: 'ap1', name: 'M. Wayland', firm: 'Wayland Fine Art' }] })] });
    const row = mk({ category: 'Art & Décor', fmv: '' });
    ok(s.invAwaitingAppraisal(row, 1), 'unlinked, it is waiting');
    ok(!s.invAwaitingAppraisal(Object.assign({}, row, { apprId: 'ap1' }), 1),
       'linked to a roster appraiser, it is not');
    // ⚠ A DANGLING ID IS NOT COVERAGE. Removing an appraiser from the roster clears the links,
    // but a merge from another device can land a row pointing at one this device never had.
    ok(s.invAwaitingAppraisal(Object.assign({}, row, { apprId: 'gone' }), 1),
       '⚠ an id no roster entry answers to leaves the item waiting, not covered');
  }

  group('⚠ the guardrail and the row badge read that ONE definition, not their own copies');
  {
    // Both inlined `invNeedsAppraisal(...) && !_invHasAppraisal(...) && !r.apprWaived` before
    // today — two copies of one rule, which is the drift this project records more often than
    // anything else, and the reason the release request could be written without the rule at all.
    const guard = noComments(fn('_invGuardrailItems'));
    has(guard, 'invAwaitingAppraisal', 'the guardrail asks the shared definition');
    lacks(guard, '_invHasAppraisal', 'and keeps no copy of how it is answered');
    lacks(guard, 'apprWaived', 'nor of the waiver arm');

    const rowFn = noComments(fn('_renderInvRow'));
    has(rowFn, 'invAwaitingAppraisal(ref, jid)', 'and so does the badge on the row');
    lacks(rowFn, '!ref.apprWaived', 'no second opinion on screen');

    const sites = (src.match(/invAwaitingAppraisal\(/g) || []).length;
    ok(sites >= 4, 'one definition, read by the guardrail, the badge, the caution and its test');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ THE FIELD CAN SAY IT NOW — it could not before, anywhere in the app');
  {
    const s = sandbox({
      fns: ['_renderRoomInventoryCapture', '_renderRoomInventoryList', '_invRefs',
            '_invApprNoteText', 'invIsIntrinsic', 'invCatMeta'],
      vars: ['INV_CATEGORIES', 'INV_DEFAULT_CATEGORY', 'INV_DISPOSITIONS', 'INV_TAXONOMY'],
      stubs: { jobs: [Object.assign({}, JOB)], _photoRefs: { 1: [] },
               _invThumbHTML: () => '', _invItemNo: () => 1 },
    });
    const html = s._renderRoomInventoryCapture(1, 0);

    has(html, 'inv-appr-1-r0', 'the capture card carries an appraise control');
    has(html, '_selectInvAppr(this,1,0)', 'wired to the toggle');
    has(readable(html), '⚑ Appraise', 'and it is labelled');

    // ⚠ A TOGGLE, NOT AN EIGHTH CHIP — pressing it must not deselect the disposition, because
    // the two answers are independent. That is the whole "two avenues" point.
    lacks(html, 'data-disp="Appraise"', '⚠ it is not a disposition chip');
    has(html, '_selectInvDisp', 'the seven chips are untouched');
    s.INV_DISPOSITIONS.forEach((d) => {
      has(html, 'data-disp="' + d + '"', d + ' is still a chip');
    });

    // The category select has to repaint the note, or the automatic rule stays invisible.
    has(html, '_paintInvApprNote(1,0)', 'changing the category repaints the note');

    // ⚠ THE NOTE REPORTS, IT DOES NOT INSTRUCT. The commonest case is that the category has
    // ALREADY put the item on the worklist and the crew had no way to know — which is why the
    // whole track looked absent when it had been running silently since it was built.
    has(readable(s._invApprNoteText('Art & Décor')), '✓ Art & Décor already goes to the appraisal worklist',
        'an intrinsic category says it is already covered');
    has(readable(s._invApprNoteText('Furniture')), 'Tick for anything that should be valued by a specialist',
        'and a plain one asks the question');
    lacks(s._invApprNoteText('Art & Décor'), 'Tick for',
          '⚠ it does not ask for an action that changes nothing');
  }

  group('⚠ THE MARKUP AND THE PAINTER ARE TESTED AGAINST EACH OTHER, not each on its own');
  {
    // ⚠⚠ THIS GROUP EXISTS BECAUSE A REVERT CAME BACK GREEN. Breaking the note span's id in
    // the rendered card — so _paintInvApprNote looks up an element that is not there and the
    // sentence never changes — failed NOTHING: the checks above drive _invApprNoteText directly
    // and grep the card for the wiring, and neither notices that the two ends no longer meet.
    // The silent failure mode is a renamed id, and the note is the half that tells the crew the
    // automatic rule has ALREADY fired, which is what made the whole track look absent.
    // So: read the id out of the REAL card and hand it to the REAL painter.
    const r = sandbox({
      fns: ['_renderRoomInventoryCapture', '_renderRoomInventoryList', '_invRefs',
            '_invApprNoteText', 'invIsIntrinsic', 'invCatMeta'],
      vars: ['INV_CATEGORIES', 'INV_DEFAULT_CATEGORY', 'INV_DISPOSITIONS', 'INV_TAXONOMY'],
      stubs: { jobs: [Object.assign({}, JOB)], _photoRefs: { 1: [] },
               _invThumbHTML: () => '', _invItemNo: () => 1 },
    });
    const card = r._renderRoomInventoryCapture(1, 0);
    const noteId = (card.match(/<span id="([^"]*-note)"/) || [])[1];
    ok(noteId, 'the card renders a note span with an id');

    const p = sandbox({
      fns: ['_paintInvApprNote', '_invApprNoteText', 'invIsIntrinsic', 'invCatMeta'],
      vars: ['INV_DEFAULT_CATEGORY', 'INV_TAXONOMY'],
      stubs: { document: domStub({ 'inv-cat-1-r0': { value: 'Art & Décor' } }) },
    });
    // Seeded by the id the CARD actually emitted. If that id is renamed on either side, the
    // painter writes nowhere and this goes quiet — which is the bug.
    const note = p.document.getElementById(noteId);
    note.innerHTML = 'UNPAINTED';
    p._paintInvApprNote(1, 0);
    has(readable(note.innerHTML), 'already goes to the appraisal worklist',
        '⚠ the painter reaches the span the card rendered — markup and lookup agree');

    p.document.getElementById('inv-cat-1-r0').value = 'Furniture';
    p._paintInvApprNote(1, 0);
    has(readable(note.innerHTML), 'Tick for anything that should be valued',
        'and switching to a plain category repaints it');
    lacks(note.innerHTML, 'UNPAINTED', 'the seeded text is really gone');
  }

  group('pressing the toggle paints it, and pressing it again clears it');
  {
    const s = sandbox({ fns: ['_selectInvAppr'], stubs: { document: domStub({}) } });
    const btn = s.document.getElementById('inv-appr-1-r0');
    btn.style = {}; btn.dataset = {};
    s._selectInvAppr(btn, 1, 0);
    eq(btn.dataset.on, '1', 'one press sets it');
    eq(btn.style.background, 'var(--bronze)',
       '⚠ bronze — the same colour the "⚑ appraise" badge wears on the Inventory tab');
    s._selectInvAppr(btn, 1, 0);
    eq(btn.dataset.on, '', 'a second press clears it');
    eq(btn.style.background, 'var(--cream)', 'and repaints');
  }

  group('⚠⚠ THE CAPTURE WRITES IT, and the toggle does NOT latch to the next shot');
  {
    const refs = [];
    const s = sandbox({
      fns: ['attachJobPlanInventoryPhoto', '_selectInvAppr', '_cleanName', '_photoUid'],
      vars: ['_photoUidSeq'],
      stubs: {
        jobs: [Object.assign({}, JOB)], _photoRefs: { 1: [] }, estimateStore: {},
        document: domStub({
          'inv-name-1-r0': { value: 'Carved side table' },
          'inv-cat-1-r0': { value: 'Furniture' },
          'inv-disp-1-r0': { dataset: { disp: 'Auction' } },
          'inv-appr-1-r0': { dataset: { on: '1' }, style: {} },
        }),
        _photoCaptureJob: (jid) => ({ id: jid, status: 'won', won: true }),
        _invRefs: () => [], _photoStamp: () => '20260911',
        _photoRetryData: {}, _setPhotoRef: (j, r) => refs.push(r),
        savePhotoRefs: () => {}, _updateRoomInventoryEl: () => {},
        _doPhotoUpload: () => {}, _invCacheLocalThumb: () => {}, _scheduleInventorySync: () => {},
        compressImage: (d, w, q, cb) => cb(d),
        FileReader: function () {
          this.readAsDataURL = () => this.onload({ target: { result: 'data:image/jpeg;base64,AAA' } });
        },
      },
    });
    s.attachJobPlanInventoryPhoto({ files: [{ name: 'x.jpg' }], value: 'x' }, 1, 0);

    eq(refs.length, 1, 'the shot is recorded');
    eq(refs[0].needsAppr, true, '⚠⚠ the field answer reaches the record');
    eq(refs[0].disposition, 'Auction',
       '⚠⚠ AND SO DOES THE DISPOSITION — the two avenues ride the same line, which is the model');
    eq(refs[0].objectName, 'Carved side table', 'with the object it describes');

    // ⚠ THE ASYMMETRY IS DELIBERATE. A disposition is a standing answer about the room being
    // worked; "send this one to a specialist" is a judgement about the single object in front
    // of you. Latching it would flag every later shot in the room — the intake-checkbox leak
    // this project already paid for once.
    const appr = s.document.getElementById('inv-appr-1-r0');
    eq(appr.dataset.on, '', '⚠ the appraise toggle resets for the next object');
    eq(s.document.getElementById('inv-disp-1-r0').dataset.disp, 'Auction',
       'and the disposition deliberately does not');
    eq(s.document.getElementById('inv-name-1-r0').value, '', 'the name clears with it');
  }

  group('leaving the toggle off never takes an intrinsic item OFF the worklist');
  {
    const refs = [];
    const s = sandbox({
      fns: ['attachJobPlanInventoryPhoto', '_selectInvAppr', '_cleanName', '_photoUid'],
      vars: ['_photoUidSeq'],
      stubs: {
        jobs: [Object.assign({}, JOB)], _photoRefs: { 1: [] }, estimateStore: {},
        document: domStub({
          'inv-name-1-r0': { value: 'Oil portrait' },
          'inv-cat-1-r0': { value: 'Art & Décor' },
          'inv-disp-1-r0': { dataset: { disp: '' } },
          'inv-appr-1-r0': { dataset: { on: '' }, style: {} },
        }),
        _photoCaptureJob: (jid) => ({ id: jid, status: 'won', won: true }),
        _invRefs: () => [], _photoStamp: () => '20260911',
        _photoRetryData: {}, _setPhotoRef: (j, r) => refs.push(r),
        savePhotoRefs: () => {}, _updateRoomInventoryEl: () => {},
        _doPhotoUpload: () => {}, _invCacheLocalThumb: () => {}, _scheduleInventorySync: () => {},
        compressImage: (d, w, q, cb) => cb(d),
        FileReader: function () {
          this.readAsDataURL = () => this.onload({ target: { result: 'data:image/jpeg;base64,AAA' } });
        },
      },
    });
    s.attachJobPlanInventoryPhoto({ files: [{ name: 'x.jpg' }], value: 'x' }, 1, 0);
    eq(refs[0].needsAppr, false, 'the explicit flag is off');

    const g = ctx([mk(refs[0])]);
    ok(g.invAwaitingAppraisal(mk(refs[0]), 1),
       '⚠ and the automatic category rule still puts the painting on the worklist');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ THE DESK CAN SET IT TOO — a column, so a walkthrough answer can be corrected');
  {
    const s = sandbox({ fns: ['_invColEditable', 'invIsFirearm', 'invIsMAIV', 'invMAIVDefaultCat'],
                        vars: ['INVENTORY_COLUMNS', 'INV_TAXONOMY', 'MAIV_CATEGORIES'] });
    const col = s.INVENTORY_COLUMNS.filter((c) => c.key === 'needsAppr')[0];
    ok(col, 'Needs Appraisal is a manifest column');
    eq(col.edit, 'flag', 'a tick box');
    eq(col.group, 'val', '⚠ filed with valuation, which is the question it answers');
    eq(col.header, 'Needs Appraisal', 'named for what it does, not for the field behind it');

    // ⚠ IT IS OFFERED ON EVERY ROW, unlike flagNFA and maivCat which are scoped. The entire
    // reason it exists is the item the automatic category rule CANNOT see.
    ok(s._invColEditable({ category: 'Furniture' }, col),
       '⚠ editable on ordinary furniture — that is the case it was added for');
    ok(s._invColEditable({ category: 'Art & Décor' }, col), 'and on an intrinsic row');

    // It sits before the appraiser link: you flag it, then you engage someone.
    const keys = s.INVENTORY_COLUMNS.map((c) => c.key);
    ok(keys.indexOf('needsAppr') < keys.indexOf('apprDoc'),
       'the flag comes before the appraiser you link to it');
  }

  group('⚠ and it survives a real save — the whitelist drops anything not on it, silently');
  {
    const s = sandbox({ fns: ['savePhotoRefs', '_warnPhotoStoreFull'] });
    s._photoRefs[1] = [mk({ stableId: 'a', objectName: 'Side table', category: 'Furniture',
                            needsAppr: true })];
    s.savePhotoRefs(1);
    const parsed = JSON.parse(s.__store['hav_media_1'] || '[]');
    eq(parsed.length, 1, 'the row is written');
    eq(parsed[0].needsAppr, true,
       '⚠ needsAppr is on the savePhotoRefs whitelist — a column that is not is dropped on every save');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ THE COLLECTION BRIDGE — an explicit Appraise was silently thrown away');
  {
    const s = sandbox({ fns: ['_collDispToInv', '_collDispNeedsAppr'] });

    // ⚠ IT USED TO RETURN 'Hold' — which is where DISPUTED property goes and which sorts LAST
    // in INV_GROUP_ORDER — and set no flag at all.
    eq(s._collDispToInv('appraise'), '',
       '⚠⚠ Appraise resolves to Not yet decided, which is the honest answer and sorts FIRST');
    eq(s._collDispToInv('firearms'), 'Hold',
       'a firearm still holds — pending written authority, which is a different question');
    eq(s._collDispToInv('auction'), 'Auction', 'the ordinary routes are unchanged');
    eq(s._collDispToInv('estate_sale'), 'Consign', 'and so are the grouped ones');

    ok(s._collDispNeedsAppr('appraise'), 'and the flag rides with it');
    ok(s._collDispNeedsAppr('firearms'), 'a firearm is a specialist valuation too');
    ok(!s._collDispNeedsAppr('auction'), 'an auction consignment is not, by itself');
    ok(!s._collDispNeedsAppr('donate'), 'nor a donation');
  }

  group('⚠⚠ MEASURED: "Asian ceramics" marked Appraise reached the worklist NOWHERE');
  {
    // THE CASE THAT MAKES IT A DEFECT RATHER THAN UNTIDINESS. _guessCategory matches on
    // keywords; "Asian ceramics", "grandfather clock", "porcelain" and "doll collection" all
    // fall through every regex to General/Household, which is NOT intrinsic. So the automatic
    // rule never fired, the bridge set no flag, and the line sat in Hold — an explicit written
    // instruction to appraise, parked where nobody looks, reported on no document.
    const pushed = [];
    const s = sandbox({
      fns: ['materializeCollection', '_collDispToInv', '_collDispNeedsAppr', '_guessCategory',
            '_numOrBlank', '_importedSourceSet', '_jobInvRefs'],
      stubs: {
        jobs: [Object.assign({}, JOB)], _photoRefs: { 1: [] },
        estimateStore: { 1: { estimate: { collections: [
          { id: 'c1', name: 'Asian ceramics', disp: 'appraise', value: '' },
        ] } } },
        document: { getElementById: () => null },
        _pushInvLine: (j, line) => pushed.push(line),
        savePhotoRefs: () => {}, renderInventoryTab: () => {}, _scheduleInventorySync: () => {},
      },
    });
    s.materializeCollection(1, 'c1');

    eq(pushed.length, 1, 'the collection lands as one lot line');
    eq(pushed[0].category, 'General/Household',
       '⚠ the guesser still cannot place it — that is exactly why the flag has to be carried');
    eq(pushed[0].needsAppr, true, '⚠⚠ and it IS carried now');
    eq(pushed[0].disposition, '', 'with no destination invented for it');

    const g = ctx([mk(pushed[0])]);
    ok(g.invAwaitingAppraisal(mk(pushed[0]), 1),
       '⚠⚠ so it reaches the Appraisal Worklist — on the old build it reached nothing');

    // The converse: without the flag, this line is invisible to the whole appraisal track.
    const without = Object.assign({}, pushed[0]); delete without.needsAppr;
    ok(!g.invAwaitingAppraisal(mk(without), 1),
       '⚠ and the category alone would NOT have found it — the measurement, not the argument');
  }

  group('an itemised import carries the flag onto every line, not just the first');
  {
    const pushed = [];
    const s = sandbox({
      fns: ['materializeCollection', '_collDispToInv', '_collDispNeedsAppr', '_guessCategory',
            '_numOrBlank', '_importedSourceSet', '_jobInvRefs'],
      stubs: {
        jobs: [Object.assign({}, JOB)], _photoRefs: { 1: [] },
        estimateStore: { 1: { estimate: { collections: [
          { id: 'c2', name: 'Porcelain figures', disp: 'appraise', value: '' },
        ] } } },
        document: { getElementById: (id) => (id === 'imp-mode-c2' ? { value: 'itemize' }
                                           : id === 'imp-qty-c2' ? { value: '3' } : null) },
        _pushInvLine: (j, line) => pushed.push(line),
        savePhotoRefs: () => {}, renderInventoryTab: () => {}, _scheduleInventorySync: () => {},
      },
    });
    s.materializeCollection(1, 'c2');
    eq(pushed.length, 3, 'three lines');
    eq(pushed.filter((l) => l.needsAppr === true).length, 3,
       '⚠ all three — a per-item worklist that covers one of three is worse than none');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ THE RELEASE REQUEST NOW SAYS AN ITEM HAS NOT BEEN VALUED');
  {
    const s = ctx();
    const cautions = sandbox({
      fns: APPR_FNS.concat(['invReleaseCautions']), vars: APPR_VARS.concat(['INV_RELEASE_CAUTIONS']),
      stubs: { jobs: [Object.assign({}, JOB)], _photoRefs: { 1: [] } },
    });
    const raise = (r) => cautions.invReleaseCautions(mk(r), 1).map((c) => c.key);

    eq(raise({ category: 'Art & Décor', fmv: '', disposition: 'Auction' }).join(),
       'needsAppraisal',
       '⚠⚠ an unvalued painting proposed for auction raises it — it raised NOTHING before today');
    eq(raise({ category: 'Furniture', fmv: '4000', disposition: 'Auction' }).join(), '',
       'an ordinary valued line raises nothing');
    eq(raise({ category: 'Art & Décor', fmv: '', disposition: 'Auction', apprWaived: true }).join(), '',
       'a logged waiver closes it');

    // ⚠ IT STACKS WITH THE OTHER TWO — an item can be a bequest AND unvalued, and one is not a
    // substitute for the other.
    eq(raise({ category: 'Art & Décor', fmv: '', disposition: 'Auction',
               flagBequest: true, flagDisputed: true }).length, 3,
       '⚠ all three show — they answer different questions');

    // Its own wording must not read as a refusal, and must not name a number.
    const c = cautions.INV_RELEASE_CAUTIONS.filter((x) => x.key === 'needsAppraisal')[0];
    ok(c, 'the caution is in the shared catalogue');
    has(readable(c.body), 'is a decision you can properly make',
        '⚠ it flags and explains — selling before a formal appraisal is often correct');
    has(readable(c.body), 'reported under oath', 'and says what the estate is giving up');
    lacks(c.body, ' is flagged ', '⚠ number-neutral — it names one line or nine either way');
    lacks(c.body, 'cannot be released', 'it never claims to refuse');
  }

  group('⚠⚠ the printed request NAMES them and still LISTS them — never a silent omission');
  {
    const rows = [
      mk({ stableId: 'a', itemNo: 1, objectName: 'Dining chairs', category: 'Furniture',
           fmv: '4000', disposition: 'Auction' }),
      mk({ stableId: 'b', itemNo: 2, objectName: 'Sargent portrait', category: 'Art & Décor',
           fmv: '', disposition: 'Auction' }),
    ];
    const s = sandbox({
      fns: APPR_FNS.concat(['printApprovalRequest', 'invReleaseCautions', '_invCautionBadges',
                            '_invCautionNotices', '_invNamed', '_invItemNo', '_invAwaitingApproval',
                            '_jobInvRefs', '_invAssignItemNos', '_invTouch', '_invPrintThumb',
                            '_invFileId', '_invRoomName', '_invMoney', 'invIsFirearm',
                            '_invDocHead', 'resolveValBasis', 'estateValueDate', '_invPicked',
                            '_invMatchesFilter', '_setPhotoRef', 'savePhotoRefs',
                            '_warnPhotoStoreFull', 'fmtDate2']),
      vars: APPR_VARS.concat(['INV_RELEASE_CAUTIONS', 'INV_RELEASE_DISPOSITIONS', 'INV_CAT_GLYPH']),
      stubs: { jobs: [Object.assign({}, JOB)], _photoRefs: { 1: rows },
               _invPick: {}, _invFilter: { when: 'all', room: '', q: '', flag: '' } },
    });
    s.printApprovalRequest(1);
    const out = s.__printed || '';
    const text = readable(out);

    ok(out.length > 0, 'the request renders');
    has(text, 'NOT YET APPRAISED', 'the unvalued line wears the badge');
    has(text, 'Property on this request has not been valued yet', 'and the notice heads it');
    has(text, 'Sargent portrait', '⚠ NAMED, not counted — a count cannot be acted on');

    // ⚠ THE LINE IS STILL THERE. Dropping it would be the silent-omission defect this project
    // records over and over; the representative decides, the app only has to tell them.
    has(text, 'Dining chairs', 'the ordinary line prints');
    ok(out.indexOf('Sargent portrait') >= 0, '⚠ and so does the flagged one — it is never withheld');

    // ⚠ ABOVE THE TABLE, and that is arithmetic rather than typography: a caveat printed under
    // a list has arrived after the signature it existed to come before.
    ok(out.indexOf('has not been valued yet') < out.indexOf('Sargent portrait'),
       '⚠ the notice is read BEFORE the line it is about');

    // The ordinary line must not be dragged in with it.
    const chairsIdx = out.indexOf('Dining chairs');
    const badgeIdx = out.indexOf('NOT YET APPRAISED');
    ok(badgeIdx > chairsIdx || out.indexOf('NOT YET APPRAISED', chairsIdx) > out.indexOf('Sargent'),
       'the badge rides the flagged row, not every row');
  }

  group('a valued, appraised estate raises nothing — the converse, so it is not a blanket notice');
  {
    const rows = [
      mk({ stableId: 'a', itemNo: 1, objectName: 'Dining chairs', category: 'Furniture',
           fmv: '4000', disposition: 'Auction' }),
      mk({ stableId: 'b', itemNo: 2, objectName: 'Tabriz rug', category: 'Rugs & Carpets',
           fmv: '9000', disposition: 'Sell', apprId: 'ap1' }),
    ];
    const s = sandbox({
      fns: APPR_FNS.concat(['printApprovalRequest', 'invReleaseCautions', '_invCautionBadges',
                            '_invCautionNotices', '_invNamed', '_invItemNo', '_invAwaitingApproval',
                            '_jobInvRefs', '_invAssignItemNos', '_invTouch', '_invPrintThumb',
                            '_invFileId', '_invRoomName', '_invMoney', 'invIsFirearm',
                            '_invDocHead', 'resolveValBasis', 'estateValueDate', '_invPicked',
                            '_invMatchesFilter', '_setPhotoRef', 'savePhotoRefs',
                            '_warnPhotoStoreFull', 'fmtDate2']),
      vars: APPR_VARS.concat(['INV_RELEASE_CAUTIONS', 'INV_RELEASE_DISPOSITIONS', 'INV_CAT_GLYPH']),
      stubs: { jobs: [Object.assign({}, JOB, {
                 appraisers: [{ id: 'ap1', name: 'M. Wayland', firm: 'Wayland Fine Art' }] })],
               _photoRefs: { 1: rows },
               _invPick: {}, _invFilter: { when: 'all', room: '', q: '', flag: '' } },
    });
    s.printApprovalRequest(1);
    const text = readable(s.__printed || '');
    has(text, 'Dining chairs', 'both lines print');
    has(text, 'Tabriz rug', 'including the linked one');
    lacks(text, 'NOT YET APPRAISED',
          '⚠ a properly worked estate gets no notice — or the badge stops meaning anything');
  }

  group('⚠ the bulk bar names them at the moment the mistake is MADE');
  {
    // Forty rows swept to Auction in one dropdown is where an unvalued line gets committed.
    // The release request names them too, but that document is read by the representative;
    // this is read by the person who did it, while they are still looking at the screen.
    const rows = [
      mk({ stableId: 'a', itemNo: 1, objectName: 'Dining chairs', category: 'Furniture', fmv: '4000' }),
      mk({ stableId: 'b', itemNo: 2, objectName: 'Sargent portrait', category: 'Art & Décor', fmv: '' }),
    ];
    let badge = '';
    const s = sandbox({
      fns: APPR_FNS.concat(['_invBulkApply', 'invReleaseCautions', '_invNamed', '_invItemNo',
                            '_invPicked', '_jobInvRefs', '_invTouch', '_invMatchesFilter',
                            '_setPhotoRef', 'savePhotoRefs', '_warnPhotoStoreFull', '_invRoomName']),
      vars: APPR_VARS.concat(['INV_RELEASE_CAUTIONS', 'INV_RELEASE_DISPOSITIONS']),
      stubs: { jobs: [Object.assign({}, JOB)], _photoRefs: { 1: rows },
               _invPick: { a: true, b: true },
               _invFilter: { when: 'all', room: '', q: '', flag: '' },
               showSyncBadge: (m) => { badge = String(m); },
               renderInventoryTab: () => {}, _scheduleInventorySync: () => {},
               _invBulkLast: null },
    });
    s._invBulkApply(1, 'disposition', 'Auction');
    const t = readable(badge);
    has(t, 'Auction set on 2 items', 'it says what it did');
    has(t, 'not yet appraised', 'and warns on the unvalued one');
    has(t, 'Sargent portrait', '⚠ by name');
    lacks(t, 'Dining chairs', 'and does not sweep the valued line in with it');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ THE WORKLIST TELLS THE APPRAISER WHERE THE OBJECT IS GOING');
  {
    // What the estate intends changes what is being asked for: a piece being KEPT needs a
    // date-of-death fair market value for the schedule; one going to AUCTION needs a reserve
    // and a saleroom view. Same object, two different engagements — and this document said
    // nothing at all about it.
    const rows = [
      mk({ stableId: 'a', itemNo: 9, objectName: 'Sargent portrait', category: 'Art & Décor',
           fmv: '', disposition: 'Auction', condition: 'Good' }),
      mk({ stableId: 'b', itemNo: 10, objectName: 'Georgian tea service', category: 'Silver & Precious Metal',
           fmv: '', disposition: '', condition: 'Good' }),
    ];
    const s = sandbox({
      fns: APPR_FNS.concat(['printAppraisalWorklist', '_apprGroups', '_apprWithheld', '_apprNFA',
                            '_apprEstimateFlags', '_jobInvRefs', '_invAssignItemNos', '_invTouch',
                            '_invItemNo', '_invRoomName', '_invMoney', 'invIsFirearm',
                            'invFirearmAuthorized', 'invReleaseBlocked', 'invAppraiserFor',
                            'maivAggregate', '_maivWorklistBlock', 'maivFilingApplies',
                            'maivStatement', 'maivStatement_', 'invIsMAIV', 'invMAIVDefaultCat',
                            'invMAIVCategory', 'isDecedentJob', '_gate706', 'fmtDate2',
                            'savePhotoRefs', '_warnPhotoStoreFull']),
      vars: APPR_VARS.concat(['MAIV_AGGREGATE_THRESHOLD', 'MAIV_CATEGORIES', 'MAIV_OTHER',
                              'MAIV_BY_CATEGORY', 'DECEDENT_SERVICES', 'INVENTORY_COLUMNS',
                              'INV_TAXONOMY', 'INV_CATEGORIES']),
      stubs: { jobs: [Object.assign({}, JOB)], _photoRefs: { 1: rows },
               estimateStore: {}, _invPrintThumb: () => '' },
    });
    s.printAppraisalWorklist(1);
    const text = readable(s.__printed || '');

    has(text, 'Intended Disposition', 'the column is on the packet');
    has(text, 'Auction', 'a routed item shows where it is headed');
    has(text, 'Not yet decided', '⚠ and an unrouted one says so rather than printing a blank');

    // ⚠⚠ THE POINT OF THE WHOLE CHANGE, ON ONE PAGE: this line is on the appraisal worklist AND
    // already routed to auction. Two avenues at once, which is why appraise is not a disposition.
    has(text, 'Sargent portrait', 'the flagged object is listed');
  }

  group('⚠ the empty state no longer names an action the app does not offer');
  {
    const s = sandbox({
      fns: APPR_FNS.concat(['printAppraisalWorklist', '_apprGroups', '_apprWithheld', '_apprNFA',
                            '_apprEstimateFlags', '_jobInvRefs', '_invAssignItemNos', '_invTouch',
                            '_invItemNo', '_invRoomName', '_invMoney', 'invIsFirearm',
                            'invFirearmAuthorized', 'invReleaseBlocked', 'invAppraiserFor',
                            'maivAggregate', '_maivWorklistBlock', 'maivFilingApplies',
                            'maivStatement', 'maivStatement_', 'invIsMAIV', 'invMAIVDefaultCat',
                            'invMAIVCategory', 'isDecedentJob', '_gate706', 'fmtDate2',
                            'savePhotoRefs', '_warnPhotoStoreFull']),
      vars: APPR_VARS.concat(['MAIV_AGGREGATE_THRESHOLD', 'MAIV_CATEGORIES', 'MAIV_OTHER',
                              'MAIV_BY_CATEGORY', 'DECEDENT_SERVICES', 'INVENTORY_COLUMNS',
                              'INV_TAXONOMY', 'INV_CATEGORIES']),
      stubs: { jobs: [Object.assign({}, JOB)],
               _photoRefs: { 1: [mk({ stableId: 'a', objectName: 'Sofa', category: 'Furniture',
                                      fmv: '900', disposition: 'Donate' })] },
               estimateStore: {}, _invPrintThumb: () => '' },
    });
    s.printAppraisalWorklist(1);
    const text = readable(s.__printed || '');
    has(text, 'No individual item is currently flagged', 'it still says nothing is flagged');
    has(text, 'tick Needs Appraisal on the manifest',
        '⚠ and names the control that now exists — it used to name one that did not');
    has(text, 'Appraise', 'plus the field route');
  }
};
