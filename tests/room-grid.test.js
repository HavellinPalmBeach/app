'use strict';
// The room grid's three tables — ROOMS (what you can tick), ROOM_WEIGHT (what it costs the
// engine) and EXTERIOR_ROOMS (whether it is added on top of the under-air baseline). Until
// now NOTHING in tests/ read any of them, which is why the defect below survived from the
// day it was written to the day somebody looked at the screen.
//
// ⚠⚠ THE DEFECT THIS SUITE EXISTS FOR, TWICE OVER. A pool house was scoreable in two
// different sections of the grid. It was fixed on 2026-08-03 by renaming the two rows
// apart — `Pool House / Cabana — no living quarters` in Exterior & Auxiliary against
// `Pool House — with living quarters` in Outbuildings & Guest Quarters — and the rename
// made the two readable without making the pair necessary. On 2026-09-18 Anthony cut it to
// ONE row: the survivor is the Exterior one, relabelled with living quarters, and it TOOK
// THE 4.5 WEIGHT of the row it replaces rather than keeping a cabana's 2.7. That last part
// is the whole reason a weight assertion is worth having — a label promising bedroom,
// kitchen and bath over a weight priced for a changing room is a silent under-collection on
// every estate with a pool house, and nothing on any screen would ever have shown it.
//
// ⚠ THE LOAD-BEARING CHECK IS THE RULE, NOT THE ROW. A list of today's names catches
// today's names. The rule is that ONE DETACHED STRUCTURE GETS ONE ROW, and that a row
// cannot be added without a weight.

const { sandbox } = require('./harness');

module.exports = function ({ group, ok, eq }) {
  const ctx = sandbox({
    vars: ['ROOMS', 'ROOM_WEIGHT', 'EXTERIOR_ROOMS', 'ROOM_DEFAULTS',
           'COVERAGE_BEDROOMS', 'COVERAGE_FULL_BATHS', 'COVERAGE_HALF_BATHS'],
  });
  const { ROOMS, ROOM_WEIGHT, EXTERIOR_ROOMS } = ctx;

  // Every grid row, flattened, keeping the section it came from.
  const rows = [];
  ROOMS.forEach(s => s.rooms.forEach(r =>
    rows.push({ sec: s.section, name: r.name, custom: !!r.custom })));
  const names = rows.map(r => r.name);
  const inSection = sec => rows.filter(r => r.sec === sec);

  // The two sections that hold DETACHED STRUCTURES rather than rooms. A building in one is
  // the same building as one in the other, which is what made the pool house scoreable twice.
  const STRUCTURE_SECTIONS = ['Exterior & Auxiliary', 'Outbuildings & Guest Quarters'];
  // The building a row names, ignoring the size or variant suffix: everything up to the
  // first em-dash or slash. `Pool House — with living quarters` and
  // `Pool House / Cabana — no living quarters` both stem to `Pool House`, which is the
  // collision a name-equality check could never see — the two rows had different names.
  const stem = n => n.split(/[—/]/)[0].trim();

  // ─────────────────────────────────────────────────────────────────────────────
  group('every row the engine can be handed has a weight of its own');
  {
    // engineRoomWeight falls back to 2.0 for an unknown name, silently — so a row added
    // without a ROOM_WEIGHT entry does not throw, it prices as a generic bedroom. That is
    // the quiet failure, and it is invisible on screen because the grid renders the row
    // perfectly well. A `custom:true` row is exempt: its name is typed by the estimator, so
    // no table could carry it.
    const missing = rows.filter(r => !r.custom && ROOM_WEIGHT[r.name] === undefined);
    eq(missing.length, 0,
      'no non-custom row is missing a ROOM_WEIGHT entry (would price at the 2.0 default): '
      + missing.map(r => r.sec + ' / ' + r.name).join(', '));

    // An exterior room is added ON TOP of the sqft-anchored interior, so a missing weight
    // there does not just mis-scale a room — it adds 2.0 load units to the whole job.
    const extNoWeight = Object.keys(EXTERIOR_ROOMS).filter(k => ROOM_WEIGHT[k] === undefined);
    eq(extNoWeight.length, 0,
      'every EXTERIOR_ROOMS key has a weight: ' + extNoWeight.join(', '));

    // EXTERIOR_ROOMS is read as engineIsExterior(name) with a name straight off a grid row,
    // so an entry naming no row is dead. Harmless, but it is also exactly what a deletion
    // leaves behind, and a dead entry is how the next reader concludes the row still exists.
    const extOrphans = Object.keys(EXTERIOR_ROOMS).filter(k => names.indexOf(k) < 0);
    eq(extOrphans.length, 0,
      'no EXTERIOR_ROOMS entry names a row that is not in the grid: ' + extOrphans.join(', '));
  }

  // ─────────────────────────────────────────────────────────────────────────────
  group('⚠ ONE DETACHED STRUCTURE, ONE ROW — the rule the pool house broke twice');
  {
    // Size variants of one building ARE allowed inside a single section: Guest House 1/2/3
    // bedroom sit adjacent on screen and you obviously pick one. What is forbidden is the
    // same structure reachable from TWO sections, which is the state that produced
    // "nothing on screen said which to pick" — the two pool-house rows were two sections
    // apart, so nobody comparing them ever saw them together.
    const seen = {};
    STRUCTURE_SECTIONS.forEach(sec => {
      inSection(sec).filter(r => !r.custom).forEach(r => {
        const k = stem(r.name);
        (seen[k] = seen[k] || []).push(sec);
      });
    });
    const straddling = Object.keys(seen)
      .filter(k => seen[k].some(s => s !== seen[k][0]));
    eq(straddling.length, 0,
      'no structure is scoreable from two sections at once: '
      + straddling.map(k => k + ' in ' + seen[k].join(' + ')).join('; '));

    // Sanity: the rule can actually fire. Feed it the pre-2026-09-18 pair by hand.
    const before = { 'Exterior & Auxiliary': ['Pool House / Cabana — no living quarters'],
                     'Outbuildings & Guest Quarters': ['Pool House — with living quarters'] };
    const beforeStems = {};
    Object.keys(before).forEach(sec => before[sec].forEach(n => {
      const k = stem(n); (beforeStems[k] = beforeStems[k] || []).push(sec);
    }));
    eq(beforeStems['Pool House'].length, 2,
      'the stem rule sees the old two-section pool house as one structure (so it is a real net)');

    // A saved room is matched back to its row on section+name, and _claim hands each saved
    // record to exactly ONE row — so two rows sharing a name inside one section means the
    // second one silently restores blank.
    const bySec = {};
    rows.forEach(r => { const k = r.sec + ':::' + r.name; bySec[k] = (bySec[k] || 0) + 1; });
    const dupes = Object.keys(bySec).filter(k => bySec[k] > 1);
    eq(dupes.length, 0, 'no name appears twice in one section: ' + dupes.join(', '));
  }

  // ─────────────────────────────────────────────────────────────────────────────
  group('the one pool-house row — where it lives, and what it weighs');
  {
    const ph = rows.filter(r => /^Pool House/.test(r.name));
    eq(ph.length, 1, 'exactly one Pool House row in the whole grid');
    eq(ph[0].name, 'Pool House — with living quarters', 'and it names living quarters');
    eq(ph[0].sec, 'Exterior & Auxiliary', 'it sits with the exterior rows, not in Outbuildings');

    // ⚠ THE NUMBER IS THE POINT. 4.5 = 2.0 living/bed + 1.5 kitchen/bar + 1.0 bath, the
    // weight of the Outbuildings row this one replaced. At the 2.7 it used to carry, a label
    // promising quarters would price a changing room — about 4-5 specialist hours short on a
    // mid-size estate, on a row nobody would think to question.
    eq(ROOM_WEIGHT['Pool House — with living quarters'], 4.5,
      'it carries the with-quarters 4.5, not the cabana 2.7 it used to');
    ok(EXTERIOR_ROOMS['Pool House — with living quarters'],
      'it is still an exterior room — a pool house is not inside the under-air square footage');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  group('⚠ AND THE WEIGHT REACHES THE HOURS — the table checked above is not the money');
  {
    // Everything above this reads a TABLE. A build where engineRoomWeight stopped consulting
    // ROOM_WEIGHT, or where an exterior row stopped being added on top of the sqft baseline,
    // would pass every one of those checks with the price silently wrong — the gap this
    // project records more often than any other: every check drove a piece and nothing drove
    // the end. So drive the real engine and read what the job actually costs.
    const eng = sandbox({
      fns: ['computeEngineV3', 'effectiveJobSteps', 'docScopeDef', 'engineRoomWeight',
            'engineIsExterior', 'tenureMultiplier'],
      vars: ['ROOM_WEIGHT', 'EXTERIOR_ROOMS', 'JOB_STEPS', 'DOC_SCOPES', 'ENGINE_VOLF',
             'ENGINE_CPXF', 'ENGINE_K', 'ENGINE_CAREFUL', 'ENGINE_ROOMLEVEL', 'ENGINE_FLOOR',
             'PERROOM_REF'],
    });
    // A 3,500 sqft Estate Settlement, three rooms scored neutral, 2 crew, 10 years' tenure.
    const BASE = [{ name: 'Kitchen', vol: 3, cplx: 3 },
                  { name: 'Living Room', vol: 3, cplx: 3 },
                  { name: 'Primary Suite', vol: 3, cplx: 3 }];
    const price = extra =>
      eng.computeEngineV3(3500, extra ? BASE.concat([extra]) : BASE, 'cleanout', 2, 10);
    const tick = name => price({ name: name, vol: 3, cplx: 3 });

    const none = price(null);
    const pool = tick('Pool House — with living quarters');

    // The weight lands in the load pool whole — an exterior row at neutral volume
    // contributes exactly its weight, on top of the sqft-anchored interior.
    eq(+(pool.load - none.load).toFixed(6), 4.5,
      'ticking the pool house adds its 4.5 to the job load, through the real engine');

    // ⚠ THE RELATIONSHIP, NOT THE ABSOLUTE. Pinning a number of hours would break on the
    // next legitimate coefficient tune and say nothing about this row. What has to hold is
    // that a pool house with quarters is worth 2.25× a boat house — the ratio of the two
    // weights — and that survives ENGINE_K, the volume curve and the step table all moving.
    const boat = tick('Boat House');
    eq(+((pool.load - none.load) / (boat.load - none.load)).toFixed(6), +(4.5 / 2.0).toFixed(6),
      'and it is 2.25x a Boat House (2.0), which is what the weight MEANS');

    // The load has to reach BILLABLE HOURS or none of the above is money. Measured on this
    // job: 12 specialist hours for the pool house. At the 2.7 it used to carry it was 7 —
    // so the 2026-09-18 decision is worth 5 PS hours on every estate with a pool house, and
    // an estimator would have had no way to see the difference.
    ok(pool.totPS - none.totPS > boat.totPS - none.totPS,
      'the pool house books more specialist hours than the boat house it outweighs');
    eq(pool.totPS - none.totPS, 12,
      'it books 12 specialist hours here; a cabana-weighted 2.7 booked 7');

    // A pool house is not under air. If it ever stopped being exterior it would modulate the
    // sqft baseline instead of adding to it, which on a big house is a REDUCTION.
    ok(eng.engineIsExterior('Pool House — with living quarters'),
      'the engine itself agrees it is exterior, not interior square footage');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  group('what came out on 2026-09-18, and is gone from all three tables');
  {
    // A row removed from ROOMS but left in ROOM_WEIGHT is dead rather than dangerous — but
    // it reads to the next person as though the row is still there, which is how a deleted
    // option gets "restored" a year later. Check all three tables, not just the grid.
    ['Casita — bedroom & bath', 'Pool House / Cabana — no living quarters'].forEach(gone => {
      eq(names.indexOf(gone), -1, gone + ' is not a grid row');
      eq(ROOM_WEIGHT[gone], undefined, gone + ' has no weight left behind');
      eq(EXTERIOR_ROOMS[gone], undefined, gone + ' has no EXTERIOR_ROOMS entry left behind');
      eq(ctx.ROOM_DEFAULTS[gone], undefined, gone + ' has no opening score left behind');
    });
    eq(rows.filter(r => /Casita/i.test(r.name)).length, 0,
      'no casita row under any spelling — a genuine casita is Guest House — 1 bedroom');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  group('Outbuildings & Guest Quarters is now the bedroom ladder alone');
  {
    const ob = inSection('Outbuildings & Guest Quarters');
    eq(ob.length, 7, 'seven rows: three guest house sizes, three cottage sizes, one custom');
    eq(ob.filter(r => r.custom).length, 1, 'exactly one free-text row');

    // ⚠ THE +2.0 STEP IS THE WHOLE REASON THE LADDER IS READABLE. Each extra bedroom adds
    // the old per-bedroom weight; break it and the sizes stop being predictable from each
    // other, which is what the one-row-per-building consolidation bought.
    [['Guest House', 7.0], ["Caretaker's Cottage", 5.5]].forEach(([b, base]) => {
      for (let n = 1; n <= 3; n++) {
        eq(ROOM_WEIGHT[b + ' — ' + n + ' bedroom'], base + (n - 1) * 2.0,
          b + ' ' + n + '-bedroom keeps the +2.0 per-bedroom step');
      }
    });
    ob.filter(r => !r.custom).forEach(r =>
      ok(EXTERIOR_ROOMS[r.name], r.name + ' is exterior — a detached building is not under air'));
  }

  // ─────────────────────────────────────────────────────────────────────────────
  group('the coverage lists are untouched, and no outbuilding is back on one');
  {
    // The cabana powder room is a COVERAGE row and is NOT the pool house — deleting the
    // wrong Pool/Cabana row here would drop the half-bath ceiling from 5 back to 4 and make
    // the badge unclearable on a house with two powder rooms, which is its own old defect.
    ok(ctx.COVERAGE_HALF_BATHS.indexOf('Pool / Cabana Half Bath') >= 0,
      'Pool / Cabana Half Bath is still a counted half bath');
    ok(names.indexOf('Pool / Cabana Half Bath') >= 0, 'and still a row you can tick');

    const reach = list => names.filter(n => list.indexOf(n) >= 0).length;
    eq(reach(ctx.COVERAGE_BEDROOMS), 8, 'eight reachable bedroom rows, unchanged');
    eq(reach(ctx.COVERAGE_FULL_BATHS), 14, 'fourteen reachable full-bath rows, unchanged');
    eq(reach(ctx.COVERAGE_HALF_BATHS), 5, 'five reachable half-bath rows, unchanged');

    // Standing rule: intake records the MAIN HOUSE, so an outbuilding row satisfying an
    // intake bedroom count is a false green on a house that was never fully walked.
    const cov = [].concat(ctx.COVERAGE_BEDROOMS, ctx.COVERAGE_FULL_BATHS, ctx.COVERAGE_HALF_BATHS);
    const leaked = inSection('Outbuildings & Guest Quarters')
      .filter(r => cov.indexOf(r.name) >= 0);
    eq(leaked.length, 0, 'no outbuilding row counts toward the intake figures');
  }
};
