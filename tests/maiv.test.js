'use strict';
// Marked artistic or intrinsic value — Treas. Reg. §20.2031-6(b), built 2026-08-24.
//
// THE POINT OF THESE TESTS is that the app already had a $3,000 number and it was the
// WRONG $3,000. `invNeedsAppraisal` asks whether one object is worth enough to send to a
// specialist. The regulation asks whether the estate's articles of marked artistic or
// intrinsic value, ADDED UP, exceed $3,000 — in which case an expert's appraisal under
// oath has to be filed with the Form 706. An estate can fail the second test while
// passing the first on every single item, and before this it produced an empty appraisal
// worklist and the app said nothing at all.

const { sandbox, fn, domStub } = require('./harness');

const FNS = [
  'invCatMeta', 'invIsIntrinsic', 'invNeedsAppraisal', 'invFiduciaryMode', 'invAppraisalThreshold',
  '_gateYes', '_gate706', 'gateDispute', 'isDecedentJob',
  'invMAIVDefaultCat', 'invIsMAIV', 'invMAIVCategory', 'maivAggregate',
  'maivFilingApplies', 'maivStatement', 'maivStatement_', '_maivWorklistBlock',
  // §20.2031-6(a) — built 2026-09-22, lifted rather than stubbed: the whole point is that
  // (a) and (b) read ONE gate, and a stub of `maivFilingApplies` is exactly what would let them
  // come apart on the one document that states both.
  'invLotArticleValue', 'invLotSplitState', 'invLotSplitSentence', 'invLotsToSplit',
  'invLotsUntestable', '_lotSplitWorklistBlock', '_invItemNo', 'esc',
  '_invMoney', 'savePhotoRefs', '_warnPhotoStoreFull', '_vehicleLineName',
];
const VARS = [
  'INV_TAXONOMY', 'INV_APPRAISAL_THRESHOLD', 'INV_APPRAISAL_THRESHOLD_DISPUTED',
  'MAIV_AGGREGATE_THRESHOLD', 'MAIV_CATEGORIES', 'MAIV_OTHER', 'MAIV_BY_CATEGORY',
  'INV_LOT_ARTICLE_CAP',
  'DECEDENT_SERVICES', 'INVENTORY_COLUMNS',
];

module.exports = function ({ group, ok, eq, has, lacks }) {
  const ctx = sandbox({ fns: FNS, vars: VARS });
  const item = (over) => Object.assign({ stableId: 'x', label: 'inventory', category: 'General/Household' }, over);
  const estate = (over) => Object.assign({ id: 1, svc: 'cleanout' }, over);   // Estate Settlement

  group('MAIV fires by default, on the categories the regulation names');
  {
    const yes = ['Art & Décor', 'Antiques', 'Jewelry & Watches', 'Silver & Precious Metal',
                 'Rugs & Carpets', 'Collectibles', 'Firearms', 'Wine & Spirits', 'Musical Instruments'];
    yes.forEach((c) => ok(ctx.invIsMAIV(item({ category: c })), `${c} is MAIV by default`));

    const no = ['Furniture', 'Electronics & Appliances', 'General/Household', 'Vehicles & Watercraft'];
    no.forEach((c) => ok(!ctx.invIsMAIV(item({ category: c })), `${c} is not MAIV by default`));

    // Vehicles are the deliberate omission: the reg's list does not reach them and they
    // are valued on their own evidence. They are also the one intrinsic:false category
    // that already carries its own appraisal route.
    eq(ctx.invMAIVDefaultCat('Vehicles & Watercraft'), '',
       'a car is not an article of marked artistic or intrinsic value');
  }

  group('the class comes from the regulation, not from the app taxonomy');
  {
    eq(ctx.invMAIVCategory(item({ category: 'Silver & Precious Metal' })), 'Silverware',
       'the app category maps onto the regulation word');
    eq(ctx.invMAIVCategory(item({ category: 'Rugs & Carpets' })), 'Oriental rugs', 'and again');
    eq(ctx.invMAIVCategory(item({ category: 'Firearms' })), ctx.MAIV_OTHER,
       'a category the reg does not name lands in the catch-all rather than being dropped');
    eq(ctx.invMAIVCategory(item({ category: 'Furniture' })), '',
       'a non-MAIV article has no class at all');

    // Furs and books are named by the regulation and have NO app category — this is the
    // whole reason the class is a field rather than a pure derivation.
    ok(ctx.MAIV_CATEGORIES.indexOf('Furs') >= 0, 'Furs is offered, though no item category produces it');
    ok(ctx.MAIV_CATEGORIES.indexOf('Books & manuscripts') >= 0, 'so is Books & manuscripts');
    const fur = item({ category: 'General/Household', flagMAIV: 'yes', maivCat: 'Furs' });
    ok(ctx.invIsMAIV(fur), 'a fur coat filed under General/Household can be brought in by hand');
    eq(ctx.invMAIVCategory(fur), 'Furs', 'and carries the regulation class');
  }

  group('the override runs BOTH ways');
  {
    ok(!ctx.invIsMAIV(item({ category: 'Art & Décor', flagMAIV: 'no' })),
       'a $40 mass-produced print can be forced OUT — carrying it in overstates the estate');
    ok(ctx.invIsMAIV(item({ category: 'Furniture', flagMAIV: 'yes' })),
       'and an ordinary category can be forced in');
    ok(ctx.invIsMAIV(item({ category: 'Antiques', flagMAIV: '' })),
       'blank means auto, not no');
    eq(ctx.invMAIVCategory(item({ category: 'Furniture', flagMAIV: 'yes' })), ctx.MAIV_OTHER,
       'a forced-in article with no derivable class still gets one');
  }

  group('THE BUG THIS EXISTS FOR: an aggregate that trips while every item passes');
  {
    // Thirty $500 pieces of silver. Not one is at or above the $3,000 per-item threshold,
    // and every one carries a value — so invNeedsAppraisal is false across the board and
    // the appraisal worklist has no groups at all. The aggregate is $15,000.
    const job = estate({ gate706: 'yes' });
    const silver = [];
    for (let i = 0; i < 30; i++) silver.push(item({ stableId: 's' + i, category: 'Silver & Precious Metal', fmv: '500' }));

    eq(silver.filter((r) => ctx.invNeedsAppraisal(r, job)).length, 0,
       'no single piece is flagged by the per-item test');
    const agg = ctx.maivAggregate(silver);
    eq(agg.total, 15000, 'but the aggregate is $15,000');
    eq(agg.count, 30, 'across 30 articles');
    ok(agg.over, 'which is over the $3,000 regulation cap');
    ok(agg.settled, 'and every article is valued, so the total can be relied on');

    // And the printed block must appear even though the list above it is empty.
    const block = ctx._maivWorklistBlock(job, silver, agg);
    ok(!!block, 'the worklist block renders with zero per-item flags');
    has(block, 'expert appraisal must be filed with the return', 'and states the filing requirement');
    has(block, '$15,000', 'with the number');
    has(block, 'Silverware', 'broken down by regulation class');
    has(block, 'not satisfied by them',
        'and says plainly that the per-item flags above do not satisfy it');
  }

  group('an untested aggregate is never reported as one under the cap');
  {
    // The silent-failure class: unvalued articles make the total a FLOOR. Printing
    // "under the aggregate" against it reads as a clearance and is not one.
    const partial = [
      item({ stableId: 'a', category: 'Jewelry & Watches', fmv: '900' }),
      item({ stableId: 'b', category: 'Art & Décor' }),
      item({ stableId: 'c', category: 'Antiques' }),
    ];
    const agg = ctx.maivAggregate(partial);
    eq(agg.total, 900, 'the total counts only what is valued');
    eq(agg.unvalued, 2, 'and reports how many are not');
    ok(!agg.settled, 'so the aggregate is not settled');
    ok(!agg.over, 'the recorded total is under the cap …');

    const said = ctx.maivStatement_(agg);
    has(said, 'at least', '… but the sentence says "at least", not a flat total');
    has(said, 'cannot be tested yet', 'and refuses to conclude');
    lacks(said, 'under the', 'the word "under" never appears while anything is unvalued');

    const block = ctx._maivWorklistBlock(estate({ gate706: 'yes' }), partial, agg);
    lacks(block, 'does not require an', 'and the block never clears the estate either');
    has(block, 'value them before the return is prepared'.replace('value', 'value'),
        'it says what to do instead');
  }

  group('the aggregate spans the GROSS estate, not the probate schedule');
  {
    // §20.2031-6 says "included in the gross estate". A revocable trust's contents are in
    // the gross estate even though they are off the §733.604 probate schedule, so reusing
    // _invIsProbateAsset here would understate the aggregate on exactly the Palm Beach
    // estates most likely to hold everything in trust.
    const mixed = [
      item({ stableId: 'p', category: 'Antiques', fmv: '2000', assetTrack: 'Probate' }),
      item({ stableId: 't', category: 'Antiques', fmv: '2000', assetTrack: 'Trust' }),
      item({ stableId: 'n', category: 'Antiques', fmv: '2000', assetTrack: 'Non-probate' }),
    ];
    const agg = ctx.maivAggregate(mixed);
    eq(agg.total, 6000, 'trust and non-probate articles are counted');
    ok(agg.over, 'so the aggregate trips where a probate-only sum would not');
  }

  group('the filing requirement is scoped to estates that actually file a 706');
  {
    ok(ctx.maivFilingApplies(estate({ gate706: 'yes' })), 'a 706 being filed');
    ok(ctx.maivFilingApplies(estate({ gate706: '' })), 'unknown counts as yes, as everywhere else');
    ok(!ctx.maivFilingApplies(estate({ gate706: 'no' })), 'an explicit no lifts it');
    ok(!ctx.maivFilingApplies({ svc: 'downsizing', gate706: '' }),
       'a living-client downsizing files no return and must not be told it owes an appraisal');

    // A dispute forces Strict Mode without making a federal return due. Reading
    // isFormalDoc here would assert a filing requirement on an estate that files nothing.
    ok(!ctx.maivFilingApplies(estate({ gate706: 'no', gateDispute: 'yes' })),
       'a dispute is not a 706 — Strict Mode and the federal filing are different questions');

    const noFiling = estate({ gate706: 'no' });
    const arts = [item({ category: 'Antiques', fmv: '9000' })];
    const block = ctx._maivWorklistBlock(noFiling, arts, ctx.maivAggregate(arts));
    has(block, 'not recorded as filing one', 'the block reports the aggregate as a guide instead');
    lacks(block, 'must be filed with the return', 'and asserts no requirement');
  }

  group('an estate with no MAIV articles says nothing rather than saying zero');
  {
    const plain = [item({ category: 'Furniture', fmv: '400' })];
    const agg = ctx.maivAggregate(plain);
    eq(agg.count, 0, 'nothing qualifies');
    eq(ctx.maivStatement(plain), '', 'the statement is empty');
    eq(ctx._maivWorklistBlock(estate({ gate706: 'yes' }), plain, agg), '',
       'and the block does not render — a $0 aggregate block is noise on a printed document');
  }

  group('every editable column survives a save — savePhotoRefs is a WHITELIST');
  {
    // savePhotoRefs enumerates the fields it persists by hand. A column added to
    // INVENTORY_COLUMNS but not to that list is dropped on the next save, silently, and
    // the user's typing disappears with it. flagMAIV and maivCat were exactly that risk;
    // this walks EVERY editable column so the next one is caught too.
    const p = sandbox({ fns: ['savePhotoRefs', '_warnPhotoStoreFull'], vars: ['INVENTORY_COLUMNS'] });
    const editable = p.INVENTORY_COLUMNS.filter((c) => c.edit).map((c) => c.key);
    ok(editable.length > 15, 'there are editable columns to check');

    const row = { stableId: 'z1', label: 'inventory' };
    editable.forEach((k) => { row[k] = 'MARK-' + k; });
    p._photoRefs[9] = [row];
    p.savePhotoRefs(9);
    const back = JSON.parse(p.__store['hav_media_9'])[0];
    const lost = editable.filter((k) => back[k] !== 'MARK-' + k);
    eq(lost, [], 'no editable column is dropped by savePhotoRefs');
  }

  group('the manifest columns exist and are scoped');
  {
    const keys = ctx.INVENTORY_COLUMNS.map((c) => c.key);
    ok(keys.indexOf('flagMAIV') >= 0, 'the MAIV flag is a manifest column');
    ok(keys.indexOf('maivCat') >= 0, 'so is the regulation class');
    const flag = ctx.INVENTORY_COLUMNS.find((c) => c.key === 'flagMAIV');
    eq(flag.edit, 'maivSelect', 'the flag is tri-state, not a checkbox — auto is a real third state');
  }

  group('a vehicle imported from the estimate is named once');
  {
    // Reported off a real client workbook: "2025 2025 Mercedes E63". The year field and
    // the description box were both filled, and the join stacked them.
    eq(ctx._vehicleLineName({ year: '2025', desc: '2025 Mercedes E63' }), '2025 Mercedes E63',
       'a description that already opens with the year is left alone');
    eq(ctx._vehicleLineName({ year: '2026', desc: 'Bentley SUV' }), '2026 Bentley SUV',
       'and one that does not still gets it');
    eq(ctx._vehicleLineName({ year: '1965', desc: 'Mustang, restored 2019' }), '1965 Mustang, restored 2019',
       'the match is at the START only — a year mentioned mid-description is not the model year');
    eq(ctx._vehicleLineName({ year: '', desc: 'Boston Whaler 210' }), 'Boston Whaler 210', 'no year, no prefix');
    eq(ctx._vehicleLineName({ year: '2025', desc: '' }), '2025 Vehicle', 'a bare year still reads as something');
    eq(ctx._vehicleLineName({}), 'Vehicle', 'and an empty record does not produce an empty name');

    // There were TWO copies of this rule — materializeVehicle and the import panel — and
    // only one was fixed first time round, so the panel went on printing "1960 1960
    // Corvette Stingray" beside a manifest row that read correctly.
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'havellin.html'), 'utf8');
    lacks(src, "[v.year, v.desc].filter(Boolean).join(' ')",
          'the import panel calls the shared namer rather than repeating the join');
    lacks(src, "[veh.year, veh.desc].filter(Boolean).join(' ')",
          'and so does materializeVehicle');
  }

  group('a quantity beside a value says which the value is');
  {
    // "Coin Collection (qty 10,000)" next to "$500,000" reads either way, and the two
    // readings differ by four orders of magnitude on a court filing. FMV is the LINE
    // TOTAL everywhere in the app; the document now says so.
    // ⚠ THIS SLICED FROM `printCourtInventory` TO THE NEXT FUNCTION and broke correctly on
    // 2026-09-21, when the table renderer was EXTRACTED so the trustee's schedule could share it
    // — the rows moved a few lines up and out of the slice. It was a pin on where the code lives
    // rather than on what it says. Stated against the renderer itself now, plus the half that
    // makes the extraction worth having: there is exactly ONE of it, so the probate schedule and
    // the trust schedule cannot come to disagree about whether a quantity is a lot or a unit price.
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'havellin.html'), 'utf8');
    const body = fn('_invScheduleSection');
    has(body, 'items, valued as a lot', 'the row says the value covers the whole lot');
    has(body, 'FMV (total)', 'and the column header says total');
    lacks(body, "'(qty '", 'the bare qty label is gone');
    eq((src.match(/items, valued as a lot/g) || []).length, 1,
       'and exactly one renderer says it, shared by both schedules');
    ['printCourtInventory', 'printTrustSchedule'].forEach(function (name) {
      has(fn(name), '_invScheduleSection', name + ' asks the shared renderer rather than keeping a copy');
    });
  }

  // ══ §20.2031-6(a) — THE GROUPING CAP, BUILT 2026-09-22 ═══════════════════════
  //
  // ⚠⚠ WHAT THESE TESTS ARE FOR. On 2026-09-22 a Havellin house PAIR — $100 strict /
  // $1,000 standard, keyed on the DOCUMENTATION LEVEL — was retired: it was enforced by
  // nothing, it had one reader (a sentence builder), and Florida sets no itemisation floor
  // at all. What went back in is a different rule that happens to share one of the numbers,
  // and the entire value of these tests is holding the two apart. The retired one was
  // arbitrary; this one is 26 CFR §20.2031-6(a), it governs a Form 706 schedule, and it is
  // gated on the 706 answer rather than on how strictly we happen to be documenting.
  //
  // ⚠ IF A LATER READER COLLAPSES THIS ONTO `isFormalDoc`, THE DEFECT IS BACK. A recorded
  // dispute forces Strict Mode without making a federal return due, so an estate that files
  // nothing would be told it owes a federal itemisation standard. There is a `lacks` on
  // exactly that below, and it is the most important assertion in this file.
  group('§20.2031-6(a) fires on the 706 gate, never on the documentation level');
  {
    const lot = (q, v) => ({ stableId: 'l', label: 'inventory', qty: String(q), fmv: v == null ? '' : String(v) });

    // The gate is `maivFilingApplies` — decedent AND the 706 answer — which is the SAME gate
    // the aggregate in (b) reads. One regulation, two subsections, one gate.
    eq(ctx.invLotSplitState(lot(6, 5000), estate()), 'over',
       'a 706 estate: six articles at $5,000 average $833 and are over the cap');
    eq(ctx.invLotSplitState(lot(6, 5000), estate({ gate706: 'no' })), '',
       'the same lot on an estate filing NO 706 is not flagged — Florida sets no floor');
    eq(ctx.invLotSplitState(lot(6, 5000), { id: 2, svc: 'downsizing' }), '',
       'and never on a living owner, who files no return at all');
    eq(ctx.invLotSplitState(lot(6, 5000), null), '', 'no job, no claim');

    // ⚠ UNANSWERED COUNTS AS YES, exactly as _gate706 has always read it, so the cap applies
    // by default on every new estate. That is the conservative direction and it matches (b).
    eq(ctx.invLotSplitState(lot(6, 5000), estate({ gate706: '' })), 'over',
       'an unanswered 706 question still applies the cap — unknown counts as yes');

    // ⚠ THE NET. `isFormalDoc` is the documentation level and it is NOT what moves this.
    const lsBody = fn('invLotSplitState');
    lacks(lsBody, 'isFormalDoc', 'the predicate does not read the documentation level');
    lacks(lsBody, 'docLevelFloor', 'nor the floor that sets it');
    has(lsBody, 'maivFilingApplies', 'it reads the 706 gate, the same one (b) reads');
  }

  group('a lot is what the cap is about — a single article never is');
  {
    const lot = (q, v) => ({ qty: String(q), fmv: v == null ? '' : String(v) });
    eq(ctx.invLotSplitState(lot(1, 50000), estate()), '',
       'a $50,000 single article is named specifically already — nothing is grouped');
    eq(ctx.invLotSplitState(lot(0, 50000), estate()), '', 'a zero quantity is not a group');
    eq(ctx.invLotSplitState({ fmv: '50000' }, estate()), '', 'nor a row with no quantity at all');

    // ⚠ "none of which has a value in excess of $100" — so EXACTLY $100 is permitted.
    eq(ctx.invLotSplitState(lot(10, 1000), estate()), '',
       'exactly $100 an article is inside the cap — the reg says "in excess of"');
    eq(ctx.invLotSplitState(lot(10, 1001), estate()), 'over', 'a dollar over is over');
    eq(ctx.INV_LOT_ARTICLE_CAP, 100, 'and the figure is the regulation own');
  }

  group('an unvalued lot is NOT a lot inside the cap');
  {
    const lot = (q, v) => ({ qty: String(q), fmv: v == null ? '' : String(v) });
    // ⚠⚠ THE FAILURE THIS WHOLE AREA EXISTS TO PREVENT, and the reason the aggregate in (b)
    // keeps `settled`: reporting an untested lot as clear reads as a clearance and is not one.
    eq(ctx.invLotSplitState(lot(30, null), estate()), 'unvalued',
       'thirty articles with no value recorded cannot be tested');
    eq(ctx.invLotSplitState(lot(30, 'x'), estate()), 'unvalued', 'nor can an unparseable one');
    ok(ctx.invLotSplitState(lot(30, null), estate()) !== '',
       'and it is never the empty string, which is what "inside the cap" means');
    // A recorded zero IS an answer, the distinction moneyToNumber('') exists for.
    eq(ctx.invLotSplitState(lot(30, 0), estate()), '', 'a recorded zero is a value, and is under the cap');
  }

  group('the per-article figure is the LINE TOTAL over the count, and says so');
  {
    // FMV is the line total everywhere in this app — that is how every accumulator reads it
    // and what the court schedule prints. The article value a lot implies is therefore the
    // total over the count, and it is an AVERAGE.
    eq(ctx.invLotArticleValue({ qty: '4', fmv: '800' }), 200, '$800 over four articles is $200 each');
    ok(isNaN(ctx.invLotArticleValue({ qty: '1', fmv: '800' })), 'a single article implies nothing');
    ok(isNaN(ctx.invLotArticleValue({ qty: '4', fmv: '' })), 'and an unvalued lot implies nothing');

    has(ctx.invLotSplitSentence({ qty: '6', fmv: '5000' }), '6 items at $5,000 averages $833 an article',
        'the sentence states the arithmetic rather than asserting a verdict');
    has(ctx.invLotSplitSentence({ qty: '6', fmv: '' }), 'no value recorded',
        'and says so when there is nothing to divide');

    // ⚠ ONE SENTENCE, THREE SURFACES. The import panel, the desk and the worklist must not
    // state the arithmetic differently — that is how two readings of one lot appear on one job.
    const srcA = require('fs').readFileSync(require('path').join(__dirname, '..', 'havellin.html'), 'utf8');
    eq((srcA.match(/function invLotSplitSentence/g) || []).length, 1, 'exactly one such sentence exists');
    has(fn('_impLotHintHtml'), 'invLotSplitSentence',
        'the capture readout asks the shared sentence rather than rebuilding the arithmetic');
    // ⚠ ONE PREDICATE, THREE SURFACES — the capture readout, the desk chip and the
    // worklist. THAT is the net that matters: a second opinion of "is this lot over the cap"
    // is how the panel comes to wave through what the document then flags, on one job, on one
    // evening. The worklist tabulates the same arithmetic in columns rather than in prose,
    // which is why it reads the VALUE helper instead of the sentence.
    has(fn('_lotSplitWorklistBlock'), 'invLotSplitState', 'the worklist asks the shared predicate');
    has(fn('_lotSplitWorklistBlock'), 'invLotArticleValue', 'and the shared per-article figure');
    has(fn('_impLotHintHtml'), 'invLotSplitState', 'the capture readout asks the shared predicate');

  }

  group('the worklist states (a) beside (b), under the same gate');
  {
    const mk = (o) => Object.assign({ stableId: 's', label: 'inventory', category: 'Silver & Precious Metal' }, o);
    const over = mk({ stableId: 'a', objectName: 'Sterling flatware service', qty: '6', fmv: '5000', itemNo: 12 });
    const fine = mk({ stableId: 'b', objectName: 'Kitchen sundries', qty: '40', fmv: '800' });
    const blank = mk({ stableId: 'c', objectName: 'Boxed china', qty: '25', fmv: '' });

    const b = ctx._lotSplitWorklistBlock(estate(), [over, fine]);
    has(b, '20.2031-6(a)', 'it cites the subsection it is applying');
    has(b, 'Sterling flatware service', 'and names the lot rather than giving a bare count');
    has(b, '#12', 'by its permanent item number, which is what a reply cites');
    has(b, 'Split', 'and names the fix');
    lacks(b, 'Kitchen sundries', 'a lot inside the cap is not on the action list');

    // ⚠ THE CLEARANCE IS A FINDING, NOT AN ABSENCE — withholding it leaves a reader unable
    // to tell a checked estate from an unchecked one.
    const clear = ctx._lotSplitWorklistBlock(estate(), [fine]);
    has(clear, 'permits them to stand as groups', 'every lot inside the cap is stated, not left silent');

    const untested = ctx._lotSplitWorklistBlock(estate(), [blank]);
    has(untested, 'cannot be tested', 'an unvalued lot is disclosed as untestable');
    has(untested, 'not a lot inside the cap', 'and explicitly not reported as clear');

    // ⚠ IT RENDERS ONLY WHERE IT GOVERNS. On an estate filing no 706 there is no floor in
    // Florida law, so a line saying so would be explaining an absence.
    eq(ctx._lotSplitWorklistBlock(estate({ gate706: 'no' }), [over]), '',
       'nothing on an estate that files no return');
    eq(ctx._lotSplitWorklistBlock({ id: 9, svc: 'downsizing' }, [over]), '',
       'nothing on a living owner');
    eq(ctx._lotSplitWorklistBlock(estate(), [mk({ qty: '1', fmv: '9000' })]), '',
       'and nothing when the manifest groups nothing');

    // The two subsections are on ONE page, under ONE gate, because a reviewer reading one
    // asks the other.
    has(fn('printAppraisalWorklist'), '_lotSplitWorklistBlock', 'the worklist renders (a)');
    has(fn('printAppraisalWorklist'), '_maivWorklistBlock', 'beside (b)');
  }

  group('the desk chip exists only where the rule does');
  {
    const ctx2 = sandbox({
      fns: ['invWorkFlags', 'invFiduciaryMode', 'maivFilingApplies', '_gate706', 'isDecedentJob',
            'invLotSplitState', '_invNeedsValue', 'invNeedsAppraisal', 'invIsFirearm',
            'invReleaseBlocked', 'invCatMeta', 'invIsIntrinsic', 'invAppraisalThreshold',
            'gateDispute', '_gateYes', '_invHasAppraisal', '_invJob', 'invIsMAIV', 'invMAIVDefaultCat',
            'invFirearmAuthorized'],
      vars: ['INV_WORK_FLAGS', 'INV_RELEASE_DISPOSITIONS', 'DECEDENT_SERVICES', 'INV_TAXONOMY',
             'INV_APPRAISAL_THRESHOLD', 'INV_APPRAISAL_THRESHOLD_DISPUTED', 'INV_LOT_ARTICLE_CAP',
             'MAIV_BY_CATEGORY', 'MAIV_OTHER'],
    });
    const flags = (job) => ctx2.invWorkFlags(job).map((f) => f.key);
    ok(flags(estate()).indexOf('lotsplit') >= 0, 'a 706 estate gets the chip');
    ok(flags(estate({ gate706: 'no' })).indexOf('lotsplit') < 0,
       'an estate filing no 706 does NOT — a chip that is structurally always 0 teaches people to skip the strip');
    ok(flags({ id: 3, svc: 'downsizing' }).indexOf('lotsplit') < 0, 'and a living job never');
    // ⚠ DRIVEN, NOT GREPPED. A source needle on the chip's own body passed while the chip was
    // deleted — it was matching the string in this file's own assertion rather than the app's.
    // Ask the catalogue for the entry and then ask the entry the question.
    const chipDef = ctx2.INV_WORK_FLAGS.filter((f) => f.key === 'lotsplit')[0];
    ok(!!chipDef, 'the chip is an entry in the ONE worklist catalogue, not a second list');
    ok(chipDef && chipDef.test({ qty: '6', fmv: '5000' }, estate()) === true,
       'and its test IS the shared predicate — a lot over the cap counts');
    ok(chipDef && chipDef.test({ qty: '6', fmv: '5000' }, estate({ gate706: 'no' })) === false,
       'gated exactly as the predicate is, so the chip and the document cannot disagree');
    ok(chipDef && chipDef.test({ qty: '1', fmv: '5000' }, estate()) === false,
       'and a single article is never on it');
    ['unnamed', 'undecided', 'appr', 'norecip', 'firearm', 'hold'].forEach((k) => {
      ok(flags(estate()).indexOf(k) >= 0, k + ' still on the strip');
    });
  }

  group('the capture-time readout — the one moment the estate can still be looked at');
  {
    // ⚠⚠ THIS IS THE HALF THAT MAKES THE RULE IMPLEMENTABLE AT ALL. A lot row carries ONE
    // name, ONE value and ONE quantity, so nothing downstream can split it. The import panel
    // is where the lot is born and where the mode selector sits one tap from the number.
    const dctx = sandbox({
      fns: ['_impLotHintHtml', 'invLotSplitState', 'invLotSplitSentence', 'invLotArticleValue',
            'maivFilingApplies', '_gate706', 'isDecedentJob', '_numOrBlank', '_invMoney', 'esc'],
      vars: ['INV_LOT_ARTICLE_CAP', 'DECEDENT_SERVICES'],
      stubs: {
        jobs: [{ id: 1, svc: 'cleanout' }],
        estimateStore: { 1: { estimate: { collections: [{ id: 'c1', name: 'Sterling flatware', value: '5000' },
                                                        { id: 'c2', name: 'Kitchen sundries', value: '800' },
                                                        { id: 'c3', name: 'Boxed china', value: 'Unknown' }] } } },
        document: domStub({}),
      },
    });
    const over = dctx._impLotHintHtml(1, 'c1', 'lot', 6);
    has(over, 'above the $100', 'six articles at $5,000 warns at the moment the lot is chosen');
    has(over, 'averages $833 an article', 'with the arithmetic on screen');
    has(over, 'Itemize it', 'and names the fix, which is the control immediately beside it');

    // ⚠ IT READS OUT, IT NEVER REFUSES — the collection value here is a walkthrough estimate
    // and the count is often a guess, so blocking would refuse on a figure nobody has stood
    // behind. The house rule: flag, name the arithmetic, name the fix.
    lacks(fn('materializeCollection'), 'invLotSplitState', 'the Add button is not gated on it');

    // ⚠ THE INSIDE-THE-CAP CASE SPEAKS. A silent pass is indistinguishable from a check that
    // never ran, on the one surface whose job is saying the grouping is safe before you commit.
    const okHint = dctx._impLotHintHtml(1, 'c2', 'lot', 40);
    has(okHint, 'inside the $100', 'a lot under the cap is confirmed rather than left silent');

    const blank = dctx._impLotHintHtml(1, 'c3', 'lot', 25);
    has(blank, 'cannot be tested', 'an unpriced collection says the cap cannot be tested');

    eq(dctx._impLotHintHtml(1, 'c1', 'itemize', 6), '',
       'itemizing IS the fix, so the panel says nothing about it');
    eq(dctx._impLotHintHtml(1, 'c1', 'lot', 1), '', 'and a single article groups nothing');

    // ⚠⚠ THE JOIN, AND THE REVERT SWEEP IS WHAT FOUND IT MISSING. Everything above drives the
    // HELPER. Deleting the hint row from the panel that renders it — i.e. removing the entire
    // capture-time surface this build exists for — left the whole suite green, because no check
    // asked whether the two ends meet. CLAUDE.md records that exact shape more often than any
    // other. This drives the REAL panel and reads its markup back.
    const pctx = sandbox({
      fns: ['_renderInventoryImportPanel', '_impLotHintHtml', '_impLotHint', 'invLotSplitState',
            'invLotSplitSentence', 'invLotArticleValue', 'maivFilingApplies', '_gate706',
            'isDecedentJob', '_numOrBlank', '_invMoney', 'esc', '_importableFromEstimate',
            '_importedSourceSet', '_guessCategory', '_vehicleLineName', 'fmtColVal', '_jobInvRefs'],
      vars: ['INV_LOT_ARTICLE_CAP', 'DECEDENT_SERVICES', 'INV_CATEGORIES', 'INV_TAXONOMY'],
      stubs: {
        jobs: [{ id: 1, svc: 'cleanout' }],
        estimateStore: { 1: { estimate: { vehicles: [], collections: [
          { id: 'c1', name: 'Sterling flatware', value: '5000', qty: 6, disp: 'sell' },
          { id: 'c2', name: 'Kitchen sundries', value: '800', qty: 40, disp: 'donate' }] } } },
        _photoRefs: { 1: [] },
        document: domStub({}),
      },
    });
    const panel = pctx._renderInventoryImportPanel(1);
    has(panel, 'imp-hint-c1', 'the real panel emits a readout row for the collection');
    has(panel, 'above the $100', 'carrying the warning, rendered rather than merely available');
    has(panel, 'averages $833 an article', 'with the arithmetic already on the page');
    has(panel, 'inside the $100', 'and the confirmation on the lot that is fine');
    // ⚠ AND IT HAS TO RE-READ LIVE, or the number is right once and wrong the moment somebody
    // changes the count — which is the one thing they are there to do.
    has(panel, "onchange=\"_impLotHint(", 'the mode selector repaints it');
    has(panel, "oninput=\"_impLotHint(", 'and so does the quantity box, on every keystroke');

    // The same panel on an estate filing no return says nothing at all.
    const qctx = sandbox({
      fns: ['_renderInventoryImportPanel', '_impLotHintHtml', '_impLotHint', 'invLotSplitState',
            'invLotSplitSentence', 'invLotArticleValue', 'maivFilingApplies', '_gate706',
            'isDecedentJob', '_numOrBlank', '_invMoney', 'esc', '_importableFromEstimate',
            '_importedSourceSet', '_guessCategory', '_vehicleLineName', 'fmtColVal', '_jobInvRefs'],
      vars: ['INV_LOT_ARTICLE_CAP', 'DECEDENT_SERVICES', 'INV_CATEGORIES', 'INV_TAXONOMY'],
      stubs: {
        jobs: [{ id: 1, svc: 'cleanout', gate706: 'no' }],
        estimateStore: { 1: { estimate: { vehicles: [], collections: [
          { id: 'c1', name: 'Sterling flatware', value: '5000', qty: 6, disp: 'sell' }] } } },
        _photoRefs: { 1: [] },
        document: domStub({}),
      },
    });
    const quiet = qctx._renderInventoryImportPanel(1);
    has(quiet, 'imp-hint-c1', 'the row is still there on a no-706 estate');
    lacks(quiet, '20.2031-6(a)', 'and it is empty — there is no federal floor to state');
  }

  group('the retired house rule has not come back wearing the new one clothes');
  {
    // ⚠⚠ THE WHOLE POINT. $100 is back; $1,000 is not, and must never be — it had no source
    // anywhere, which is precisely what made the retired pair arbitrary.
    const srcB = require('fs').readFileSync(require('path').join(__dirname, '..', 'havellin.html'), 'utf8');
    const live = srcB.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
    ok(live.length > srcB.length * 0.5, 'the comment stripper did not eat the file');
    has(live, 'function invLotSplitState', 'and the function under test survived it');

    lacks(live, 'INV_LISTING_THRESHOLD', 'the retired constants are still gone');
    lacks(live, 'invListingThreshold', 'and so is the retired accessor');
    lacks(live, 'listed individually', 'and the retired wording');
    eq((live.match(/INV_LOT_ARTICLE_CAP = /g) || []).length, 1, 'the cap is declared exactly once');
    lacks(fn('docStandardEffect'), 'INV_LOT_ARTICLE_CAP',
       'and the documentation-level readout does not quote it — the level is not what moves it');
  }
};
