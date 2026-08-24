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

const { sandbox } = require('./harness');

const FNS = [
  'invCatMeta', 'invIsIntrinsic', 'invNeedsAppraisal', 'invAppraisalThreshold',
  '_gateYes', '_gate706', 'gateDispute', 'isDecedentJob',
  'invMAIVDefaultCat', 'invIsMAIV', 'invMAIVCategory', 'maivAggregate',
  'maivFilingApplies', 'maivStatement', 'maivStatement_', '_maivWorklistBlock',
  '_invMoney', 'savePhotoRefs', '_warnPhotoStoreFull', '_vehicleLineName',
];
const VARS = [
  'INV_TAXONOMY', 'INV_APPRAISAL_THRESHOLD', 'INV_APPRAISAL_THRESHOLD_DISPUTED',
  'MAIV_AGGREGATE_THRESHOLD', 'MAIV_CATEGORIES', 'MAIV_OTHER', 'MAIV_BY_CATEGORY',
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
  }

  group('a quantity beside a value says which the value is');
  {
    // "Coin Collection (qty 10,000)" next to "$500,000" reads either way, and the two
    // readings differ by four orders of magnitude on a court filing. FMV is the LINE
    // TOTAL everywhere in the app; the document now says so.
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'havellin.html'), 'utf8');
    const f = src.slice(src.indexOf('function printCourtInventory('));
    const body = f.slice(0, f.indexOf('\nfunction printDispositionLedger'));
    has(body, 'items, valued as a lot', 'the row says the value covers the whole lot');
    has(body, 'FMV (total)', 'and the column header says total');
    lacks(body, "'(qty '", 'the bare qty label is gone');
  }
};
