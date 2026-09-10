'use strict';
// Room coverage — the badge under the room grid that checks what intake said the property
// has against what the walkthrough actually covered.
//
// THE DEFECT THIS SUITE EXISTS FOR (2026-09-10). The scope toggle has THREE states —
// blank → in scope (✓) → homeowner-handled / out of scope (✕) — and the badge was only
// ever handed the ✓ rooms. So a room the estimator had deliberately marked ✕ counted
// exactly the same as a room nobody had opened, and a job that is mostly Home Prep, where
// whole floors are legitimately out of scope, read "Walkthrough looks incomplete" at a
// walkthrough that was finished. The only way to clear it was to price rooms Havellin is
// not touching. A check that is wrong on a normal job is worse than no check, because it
// teaches people to ignore the one thing that catches a genuinely half-scored house — and
// a half-scored house MISPRICES rather than under-counts, since volume and complexity are
// averaged over the rooms scored and applied to the whole square footage.

const { sandbox, source } = require('./harness');

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();

  // A DOM just big enough for the badge: the host element and the job picker.
  const badge = { innerHTML: '' };
  const jobField = { value: '0' };
  const ctx = sandbox({
    fns: ['roomCoverage', 'renderCoverageBadge'],
    vars: ['COVERAGE_BEDROOMS', 'COVERAGE_FULL_BATHS', 'COVERAGE_HALF_BATHS'],
    stubs: {
      document: {
        getElementById(id) {
          if (id === 'coverage-badge') return badge;
          if (id === 'e-job') return jobField;
          return null;
        },
      },
    },
  });

  // Render against one job and hand back what the badge printed.
  const render = (job, scored, excluded) => {
    badge.innerHTML = '';
    ctx.jobs = job ? [job] : [];
    jobField.value = job ? String(job.id) : '0';
    ctx.renderCoverageBadge(scored, excluded);
    return badge.innerHTML;
  };

  const JOB = { id: 1, beds: 3, baths: 3, halfBaths: 1 };

  group('roomCoverage — scored and excluded are counted apart, and summed for the test');
  {
    const only = ctx.roomCoverage(['Primary Suite', 'Bedroom 2'], []);
    eq(only.beds.scored, 2, 'two bedrooms scored');
    eq(only.beds.excluded, 0, 'none excluded');
    eq(only.beds.accounted, 2, 'accounted is the sum');

    const mixed = ctx.roomCoverage(['Primary Suite'], ['Bedroom 2', 'Bedroom 3']);
    eq(mixed.beds.scored, 1, 'one scored');
    eq(mixed.beds.excluded, 2, 'two marked out of scope');
    eq(mixed.beds.accounted, 3, 'all three bedrooms are accounted for');

    const baths = ctx.roomCoverage(['Primary Bath'], ['Bathroom 2', 'Half Bath']);
    eq(baths.fullBaths.accounted, 2, 'full baths count across both lists');
    eq(baths.halfBaths.excluded, 1, 'a half bath marked out of scope is counted as a half bath');
    eq(baths.halfBaths.scored, 0, 'and never as a scored one');

    eq(ctx.roomCoverage(['Garage (2-car)'], ['Foyer']).beds.accounted, 0,
       'a room that is neither a bedroom nor a bath counts towards neither, from either list');
    eq(ctx.roomCoverage(['Primary Suite']).beds.accounted, 1,
       'omitting the excluded list entirely does not throw — it reads as none');
  }

  group("Izzy Bizzy — a mostly-Home-Prep job with rooms deliberately left out");
  {
    // Anthony's real case: Home Prep re-typed to Home Editing + prep. Guest beds and baths,
    // the kitchen, the laundry and the half bath are the client's own; one bedroom and one
    // full bath are in scope. That is a COMPLETE walkthrough, not a gap.
    const html = render(JOB,
      ['Primary Suite', 'Primary Bath'],
      ['Bedroom 2', 'Bedroom 3', 'Bathroom 2', 'Bathroom 3', 'Half Bath', 'Kitchen', 'Laundry Room']);
    lacks(html, 'Walkthrough looks incomplete', 'no warning — every room on record is accounted for');
    lacks(html, 'a-err', 'and nothing red');
    has(html, 'a-ok', 'it confirms instead');
    has(html, 'accounted for', 'the confirmation says accounted for');
    has(html, '2 scored, 5 out of scope', 'and states the split rather than implying seven rooms were walked');
    lacks(html, 'has been scored', 'it must never claim an out-of-scope room was scored');
  }

  group('a genuinely half-scored house still fails, and now in red');
  {
    // Same intake, nothing excluded — the rooms were simply never opened.
    const html = render(JOB, ['Primary Suite', 'Primary Bath'], []);
    has(html, 'Walkthrough looks incomplete', 'the check still catches the case it exists for');
    has(html, 'a-err', 'red, not amber — this is a mispricing');
    lacks(html, 'a-warn', 'the amber class is gone from this branch');
    has(html, '<strong>1 of 3</strong> bedrooms', 'names the bedroom shortfall');
    has(html, '<strong>1 of 3</strong> full baths', 'and the full baths');
    has(html, '<strong>0 of 1</strong> half baths', 'and the half bath');
    has(html, 'Accounted for', 'the wording is accounted for, not scored — excluded rooms count too now');
    has(html, 'out of scope', 'and the panel carries the fix rather than only the complaint');
  }

  group('excluding the missing rooms is what clears it');
  {
    // The same job as the failing case above, one step later: mark them ✕ and it goes green.
    // This is the pair that proves the fix does the work — not a green that was always green.
    const before = render(JOB, ['Primary Suite'], []);
    const after = render(JOB, ['Primary Suite'], ['Bedroom 2', 'Bedroom 3', 'Primary Bath',
      'Bathroom 2', 'Bathroom 3', 'Half Bath']);
    has(before, 'Walkthrough looks incomplete', 'red before');
    lacks(after, 'Walkthrough looks incomplete', 'green after, with no room scored in between');
    has(after, '1 scored, 6 out of scope', 'and it says so honestly');
  }

  group('partial exclusion still reports the real remainder');
  {
    // One bedroom scored, one excluded, one never opened — 2 of 3, still short.
    const html = render(JOB, ['Primary Suite', 'Primary Bath', 'Bathroom 2', 'Bathroom 3', 'Half Bath'],
      ['Bedroom 2']);
    has(html, 'Walkthrough looks incomplete', 'the third bedroom is still missing');
    has(html, '<strong>2 of 3</strong> bedrooms', 'the excluded one counts, the untouched one does not');
    lacks(html, 'full baths', 'the baths are complete and are not mentioned');
    lacks(html, 'half baths', 'nor the half bath');
  }

  group('a job with no exclusions keeps the original confirmation wording');
  {
    const html = render(JOB,
      ['Primary Suite', 'Bedroom 2', 'Bedroom 3', 'Primary Bath', 'Bathroom 2', 'Bathroom 3', 'Half Bath'], []);
    has(html, 'every bedroom and bath on record has been scored',
       'nothing excluded → the old sentence, which is still exactly true');
    lacks(html, 'out of scope', 'and no parenthetical about rooms that do not exist');
  }

  group('the states where the badge says nothing at all');
  {
    eq(render(JOB, [], []), '', 'nothing ticked and nothing excluded — the walkthrough has not started');
    eq(render(null, ['Primary Suite'], []), '', 'no job attached, nothing to check against');
    eq(render({ id: 1 }, ['Primary Suite'], []), '',
       'intake never captured a bed or bath count — silent rather than guessing');
  }

  group('an all-excluded walkthrough is a real state, not an unstarted one');
  {
    // The guard used to test the scored list alone, so a job where every room on record is
    // out of scope would have gone silent — which is precisely the job this change is about.
    const html = render(JOB, [],
      ['Primary Suite', 'Bedroom 2', 'Bedroom 3', 'Primary Bath', 'Bathroom 2', 'Bathroom 3', 'Half Bath']);
    ok(html !== '', 'the badge still renders with nothing scored and everything excluded');
    has(html, 'a-ok', 'and it is satisfied — every room on record was considered');
    has(html, '0 scored, 7 out of scope', 'stating plainly that nothing was priced');
  }

  group('only the kinds intake recorded are tallied');
  {
    // Intake captured bedrooms only. An excluded bath is not evidence about a count nobody
    // recorded, so it must not appear in the confirmation's numbers.
    const html = render({ id: 1, beds: 2 }, ['Primary Suite'], ['Bedroom 2', 'Bathroom 2', 'Half Bath']);
    lacks(html, 'Walkthrough looks incomplete', 'the two bedrooms are accounted for');
    has(html, '1 scored, 1 out of scope', 'the baths intake never counted are left out of the tally');
  }

  group('unscoredRoomNames — an out-of-scope room is not an unscored one');
  {
    const ctx2 = sandbox({ fns: ['unscoredRoomNames'] });
    // Exactly the shape calcAll pins on the snapshot: 'in' rooms carry their scores,
    // excluded ones ride at vol:0/cplx:0 with excluded:true so they can print at $0.
    const est = { rooms: [
      { name: 'Primary Suite', vol: 4, cplx: 3 },
      { name: 'Primary Bath',  vol: 2, cplx: 2 },
      { name: 'Bedroom 2',    vol: 0, cplx: 0, excluded: true },
      { name: 'Bathroom 2',   vol: 0, cplx: 0, excluded: true },
      { name: 'Kitchen',      vol: 0, cplx: 0, excluded: true },
      { name: 'Laundry Room', vol: 0, cplx: 0, excluded: true },
      { name: 'Half Bath',    vol: 0, cplx: 0, excluded: true },
    ] };
    eq(ctx2.unscoredRoomNames(est), [],
       'the Izzy Bizzy walkthrough is complete — five rooms out of scope block nothing');

    // The gate must still do its real job on a room that IS in scope and unscored.
    const half = { rooms: [
      { name: 'Primary Suite', vol: 4, cplx: 3 },
      { name: 'Bedroom 2', vol: 0, cplx: 0 },
      { name: 'Bedroom 3', vol: 3, cplx: 0 },
      { name: 'Bedroom 4', vol: 0, cplx: 3, excluded: true },
    ] };
    eq(ctx2.unscoredRoomNames(half), ['Bedroom 2', 'Bedroom 3'],
       'an in-scope room with no volume, or no complexity, is still caught');
    eq(ctx2.unscoredRoomNames(null), [], 'no estimate is not a throw');
    eq(ctx2.unscoredRoomNames({}), [], 'nor an estimate with no rooms array');
  }

  group('Save, Submit and the manager PIN all read that one definition');
  {
    // These three had three copies of the test and only checkPin skipped excluded rooms, so
    // a walkthrough with any ✕ room could be APPROVED but never SAVED or SUBMITTED — and
    // setRoomState disables vol/cplx on an excluded row, so it could not be complied with.
    const inlined = (src.match(/\.rooms\s*\|\|\s*\[\]\)\.filter\(function\(r\)\{ return[^\n]*vol >= 1|\.rooms\.filter\(function\(r\)\{ return[^\n]*vol >= 1/g) || []).length;
    eq(inlined, 0, 'no inlined copy of the scoring test survives anywhere');
    // ⚠ THIS PINNED THE LITERAL `unscoredRoomNames(currentEstimate)` AND THE EXACT
    // showFB CALL, and both moved when Submit's refusals were extracted into
    // `estimateSubmitBlocker` so they could be printed on whichever surface fired it
    // (they all went to #e-fb, inside a panel the Client Dashboard is not showing, so a
    // refusal was invisible and the button read as dead). A true statement about a
    // requirement must not break because a line moved. So: name the functions that have
    // to consult the shared definition, and assert each one does.
    const fnBody = (sig) => {
      const from = src.indexOf('function ' + sig);
      if (from < 0) return '';
      const rest = src.slice(from + 10);
      const end = rest.indexOf('\nfunction ');
      return end < 0 ? rest : rest.slice(0, end);
    };
    [['saveEstimateAndPreview()', 'Save'], ['estimateSubmitBlocker(est)', 'Submit'],
     ['checkPin()', 'the manager PIN'], ['jobTimeline(job, estRec, logs, cos)', 'the timeline rail'],
    ].forEach(([sig, what]) => {
      has(fnBody(sig), 'unscoredRoomNames(', `${what} reads the shared definition`);
    });
    eq((src.match(/unscoredRoomNames\(/g) || []).length, 5,
       'and nothing else calls it — four readers plus the definition itself');
    has(src, "showFB('e-fb','warn','Every included room needs a volume and complexity score",
       'Save still refuses a genuinely unscored room');
    has(fnBody('estimateSubmitBlocker(est)'), 'Cannot submit — every included room needs',
       'Submit still does too, and still says why');
    has(fnBody('submitForApproval(opts)'), 'estimateSubmitBlocker(currentEstimate)',
       'and Submit reads that one blocker rather than re-testing');
    has(src, 'Cannot approve — unscored rooms:',
       'and the manager PIN still does');
  }

  group('the call site hands over both scope lists');
  {
    // calcAll builds roomMeta (the ✓ rooms) and excludedMeta (the ✕ rooms) in one pass. If a
    // later edit drops the second argument the badge silently returns to the old behaviour,
    // with every test above still passing on the function in isolation.
    has(src, 'renderCoverageBadge(roomMeta.map(function(r){ return r.name; }),',
       'the scored list is still first');
    has(src, 'excludedMeta.map(function(r){ return r.name; }));',
       'and the excluded list is passed alongside it');
    lacks(src, 'renderCoverageBadge(roomMeta.map(function(r){ return r.name; }));',
       'no single-argument call survives');
  }
};
