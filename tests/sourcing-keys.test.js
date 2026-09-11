'use strict';
// A DELETED ESTIMATE LINE MOVED EVERY QUOTE BELOW IT ONTO THE WRONG TRADE (2026-09-11).
//
// ⚠⚠ `vendorSourcing` and `prepSourcing` were plain `src[i]` maps over `est.vendors` and
// `est.prepItems` — the line's POSITION, not its identity — and `removeVendor` /
// `removePrepItem` SPLICE. So dropping one line from an estimate shifted every recorded
// quote below it up one, silently, on a job whose vendors were already booked.
//
// Measured by driving the real getVendorActuals. Three prep trades and three vendors, all
// quoted, then the client drops the landscaping and the auction:
//
//   before  Painting/Ace $18,000 · Landscaping/Green Thumb $9,000 · Cleaning/Sparkle $4,000
//   after   Painting/Ace $18,000 · **Cleaning = Green Thumb $9,000**
//           Moving/Palm $12,000  · **Junk Removal = Sothebys $0**
//
// The cleaner's line carrying the landscaper's name and price; the hauler's carrying the
// auction house's. Prep $31,000 → $27,000 against a true $22,000 (the fee $9,300 → $8,100
// against a true $6,600), and **$3,000 of the client's pass-through vendor cost gone off
// the invoice entirely**. A vendor's NAME on another vendor's line, on the document the
// client pays and the plan the crew works from.
//
// `collSourcing` has keyed by collId since it was written. This is the same rule for the
// other two.

const { sandbox, source, fn } = require('./harness');

const noComments = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

const PREP = () => [{ type: 'Painting', cost: 20000 },
                    { type: 'Landscaping', cost: 10000 },
                    { type: 'Cleaning', cost: 5000 }];
const VEND = () => [{ type: 'Moving Company', cost: 12000 },
                    { type: 'Auction House', cost: 0 },
                    { type: 'Junk Removal', cost: 3000 }];

function ctx(extraFns) {
  return sandbox({
    fns: ['_srcLid', '_srcLineKey', '_srcAdoptLineIds', 'getVendorActuals',
          'prepFeeRate', 'logisticsCatsFor'].concat(extraFns || []),
    vars: ['SMF_PCT', 'PREP_FEE_RATE', 'LOGISTICS_CATEGORIES', '_srcLidSeq'],
  });
}

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();

  // ───────────────────────────────────────────────────────────────────────────
  group('A LINE IS ADDRESSED BY ITS ID, AND BY ITS POSITION ONLY WHILE IT HAS NONE');
  {
    const c = ctx();
    eq(c._srcLineKey({ type: 'Painting', lid: 'ab-1' }, 4), 'Lab-1', 'an id wins');
    eq(c._srcLineKey({ type: 'Painting' }, 4), '4',
       '⚠ a line with no id keys by its index — which is the only key it has ever had, and '
       + 'is what makes this change invisible on a record written before ids existed');
    eq(c._srcLineKey(undefined, 2), '2', 'and a missing line does not throw');
    // Two lines minted in the same millisecond must not collide, or one quote overwrites
    // the other — the same reason _photoUid carries a counter.
    const seen = {};
    for (let i = 0; i < 50; i++) seen[c._srcLid()] = 1;
    eq(Object.keys(seen).length, 50, '50 ids minted back to back are 50 distinct ids');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ THE MEASURED DEFECT — A DELETED LINE REPOINTS EVERY QUOTE BELOW IT');
  {
    const c = ctx();
    const job = {
      id: 601,
      prepSourcing: { 0: { vendorName: 'Ace Painting', quote: 18000 },
                      1: { vendorName: 'Green Thumb', quote: 9000 },
                      2: { vendorName: 'Sparkle Cleaning', quote: 4000 } },
      vendorSourcing: { 0: { vendorName: 'Palm Movers', quote: 12000 },
                        1: { vendorName: 'Sothebys', quote: 0 },
                        2: { vendorName: 'Junk Kings', quote: 3000 } },
    };
    const est = { svc: 'downsizing', prepEnabled: true, prepItems: PREP(), vendors: VEND() };

    // Adoption is what the first Job Plan write does. Before it, the records are index-keyed
    // and behave exactly as they always did; after it they are pinned to the line.
    eq(c._srcAdoptLineIds(job, est), true, 'the first adoption reports that it moved something');
    eq(c._srcAdoptLineIds(job, est), false, '⚠ and the second is a no-op — it is idempotent');
    eq(est.prepItems.filter((l) => !!l.lid).length, 3, 'every prep line carries an id');
    eq(est.vendors.filter((l) => !!l.lid).length, 3, 'and every vendor line');

    // ⚠ THE STAMP AND THE RE-KEY ARE ONE OPERATION. Stamping a line without moving its
    // record orphans the quote — strictly worse than the defect, because the money simply
    // disappears rather than landing on the wrong row.
    eq(Object.keys(job.prepSourcing).sort(),
       est.prepItems.map((l) => 'L' + l.lid).sort(),
       '⚠⚠ every record moved onto its line in the same pass');
    eq(job.prepSourcing['L' + est.prepItems[1].lid].vendorName, 'Green Thumb',
       'and landed on the right one');

    const read = () => {
      const a = c.getVendorActuals(job, est);
      return { prep: a.prep.map((l) => l.label + '=' + l.vendorName + '$' + l.amount),
               tp: a.thirdParty.map((l) => l.label + '=' + l.vendorName + '$' + l.amount),
               prepTotal: a.prepTotal, prepFee: a.prepFee, tpTotal: a.thirdPartyTotal };
    };
    const before = read();
    eq(before.prep, ['Painting=Ace Painting$18000', 'Landscaping=Green Thumb$9000',
                     'Cleaning=Sparkle Cleaning$4000'], 'three trades, three quotes');
    eq(before.prepTotal, 31000, '$31,000 of prep');
    eq(before.tpTotal, 15000, '$15,000 of third-party vendors');

    // The client drops the landscaping and the auction.
    est.prepItems.splice(1, 1);
    est.vendors.splice(1, 1);
    const after = read();

    eq(after.prep, ['Painting=Ace Painting$18000', 'Cleaning=Sparkle Cleaning$4000'],
       '⚠⚠ the cleaner keeps HER name and HER price — this read "Cleaning = Green Thumb $9,000"');
    eq(after.tp, ['Moving Company=Palm Movers$12000', 'Junk Removal=Junk Kings$3000'],
       '⚠⚠ and the hauler keeps his — this read "Junk Removal = Sothebys $0"');
    eq(after.prepTotal, 22000, 'prep is the true $22,000, not the $27,000 the shift produced');
    eq(after.prepFee, 6600, '…so the fee is $6,600 rather than $8,100 over-billed');
    eq(after.tpTotal, 15000,
       '⚠ and the $3,000 junk quote is still on the invoice — it fell off it entirely before');

    // The dropped lines' records stay on the job, orphaned. Deleting them would destroy the
    // record that a quote was obtained, and they are never read again — a re-added line
    // mints a new id.
    eq(Object.keys(job.prepSourcing).length, 3, 'the dropped line\'s quote is kept, not reassigned');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ THE PREP PLAN\'S BUDGET & FEE CARD READS THE SAME KEYS');
  {
    // ⚠ THIS GROUP EXISTS BECAUSE REVERTING THIS ONE LINE CAME BACK GREEN. The rollup is
    // `psrc[...]` inside renderPrepJobPlan, and the source needle a few groups down does
    // not match its shape — so the card could go back to summing by position with the
    // whole suite passing. It is the concierge's own fee readout, in the field, on money.
    const plan = (est, job) => sandbox({
      fns: ['renderPrepJobPlan', '_srcLineKey', 'prepFeeRate', 'fmtDate2', 'chkGrid'],
      vars: ['PREP_FEE_RATE'],
      stubs: { document: { getElementById: () => null }, esc: (v) => String(v == null ? '' : v),
               standingFlagsBlock: () => '', planChk: () => '', renderVendorSourcing: () => '',
               vendorDirectory: [] },
    }).renderPrepJobPlan(job.id, job, est);
    const money = (html, re) => (html.match(re) || [])[1];

    const est = { prepItems: [{ type: 'Painting', cost: 20000, lid: 'a' },
                              { type: 'Landscaping', cost: 10000, lid: 'b' },
                              { type: 'Cleaning', cost: 5000, lid: 'c' }] };
    const job = { id: 1, name: 'Vickers',
                  prepSourcing: { La: { quote: 18000 }, Lb: { quote: 9000 }, Lc: { quote: 4000 } } };

    const QUOTED = /Quoted to date \(\d+ of \d+ vendors\)<\/td><td class="num"[^>]*>\$([\d,]+)/;
    const FEE = /fee \(on quoted actuals\)<\/td><td class="num">\$([\d,]+)/;

    const h1 = plan(est, job);
    eq(money(h1, QUOTED), '31,000', 'three quotes sum to $31,000');
    eq(money(h1, FEE), '9,300', '…and the fee to $9,300');

    est.prepItems.splice(1, 1);   // the client drops the landscaping
    const h2 = plan(est, job);
    eq(money(h2, QUOTED), '22,000',
       '⚠⚠ the card sums the two lines that remain — it read $27,000 when it summed by position');
    eq(money(h2, FEE), '6,600', '…so the fee is $6,600, not $8,100');
    has(h2, 'Quoted to date (2 of 2 vendors)', 'and it says two vendors, not three');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ ADOPTION TOUCHES NOTHING IT SHOULD NOT');
  {
    const c = ctx();
    // A line that already has an id is left exactly as it is — otherwise re-running would
    // mint a new id every time and orphan the record written under the last one.
    const est = { prepItems: [{ type: 'Painting', lid: 'keep-me' }], vendors: [] };
    const job = { prepSourcing: { 'Lkeep-me': { quote: 100 } } };
    eq(c._srcAdoptLineIds(job, est), false, 'nothing to do');
    eq(est.prepItems[0].lid, 'keep-me', 'the id is untouched');
    eq(job.prepSourcing['Lkeep-me'].quote, 100, 'and so is its record');

    // A line with no record yet is stamped without inventing one.
    const est2 = { prepItems: [{ type: 'Painting' }], vendors: [] };
    const job2 = {};
    eq(c._srcAdoptLineIds(job2, est2), true, 'the line is stamped');
    eq(job2.prepSourcing, undefined, '⚠ and no empty sourcing map is conjured for it');

    eq(c._srcAdoptLineIds(null, est2), false, 'no job, no change');
    eq(c._srcAdoptLineIds(job2, null), false, 'no estimate, no change');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ READERS AND WRITERS KEY THE SAME WAY, FROM ONE DEFINITION');
  {
    // Six sites read a sourcing record by line: getVendorActuals (x2 through resolve),
    // the two lists on the sourcing card, and the prep plan's rollup. Plus _srcSlot, which
    // is the one place a slot is addressed for WRITING.
    const body = noComments(src);
    lacks(body, 'job.vendorSourcing[i]',
      '⚠⚠ no setter still addresses a slot by the line\'s position');
    lacks(body, 'job.prepSourcing[i]', '…nor the prep one');
    lacks(body, 'var rec = src[i]', 'nor any reader');
    lacks(body, 'var rec = psrc[i]', 'nor the prep reader');

    // Every setter funnels through the one addressing helper, so none of them can hold its
    // own opinion of what a slot is called.
    const slot = noComments(fn('_srcSlot'));
    has(slot, '_srcLineKey(line, i)', 'the writer resolves the key from the line');
    has(slot, '_srcAdoptLineIds(job, est)', '…adopting first, so the write lands on the stable key');
    ['setJobVendor', 'setJobVendorQuote', 'setJobVendorStatus', 'setJobVendorCoordHrs',
     'setPrepVendor', 'setPrepVendorQuote', 'setPrepVendorStatus', 'setPrepVendorCoordHrs']
      .forEach((name) => {
        const f = noComments(fn(name));
        // The two vendor-picker setters hand the slot to _srcSetVendor, which is the same
        // requirement one hop further on: the record is the one the key resolved to.
        ok(/slot\.rec|_srcSetVendor\(slot/.test(f), name + ' writes through the resolved slot');
        lacks(f, 'Sourcing[i]', name + ' never indexes by position');
      });
    has(noComments(fn('_srcSetVendor')), 'slot.rec',
       'and the shared vendor-picker write does too');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ THE PERSIST MUST NOT GO THROUGH saveEstimateState');
  {
    const p = noComments(fn('_srcPersistEstimates'));
    lacks(p, 'currentEstimate',
      '⚠⚠ saveEstimateState rebuilds the record from `currentEstimate`, a global the Job Plan '
      + 'never sets — calling it from here would file whichever estimate was last open '
      + 'against this job. This writes the store it was handed and nothing else.');
    has(p, "localStorage.setItem('havellin_est_v4'", 'it persists locally');
    has(p, "type: 'saveAllEstimates'", '…and to the sheet, the one authoritative write');
    lacks(p, 'saveEstimateState', 'and never delegates to the tab\'s save');
    // The success badge is deliberately empty; _flushOutbox skips a falsy one.
    has(p, "payload: estimateStore }, ''", 'a schema backfill announces nothing on success');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ THE TWO MAPS THAT WERE ALREADY RIGHT ARE UNTOUCHED');
  {
    // collSourcing keys by collId and logisticsSourcing by the category key — both stable
    // already, and both would break if this change were applied to them wholesale.
    const coll = noComments(fn('_collJob'));
    has(coll, 'job.collSourcing[collId]', 'collections still key by collection id');
    const logi = noComments(fn('_logiJob'));
    has(logi, 'job.logisticsSourcing[key]', 'logistics still key by category');
    const va = noComments(fn('getVendorActuals'));
    has(va, 'lsrc[cat.key]', 'and the reader still looks logistics up by category');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('A NEW LINE IS BORN WITH AN ID');
  {
    // So a fresh estimate never needs adopting at all — the quotes are stable from the
    // first one recorded.
    has(src, "cost: parseFloat(c && c.value) || 0, lid: _srcLid()", 'addVendor stamps one');
    has(src, "prepItems.push({type: sel.value, cost: cost, lid: _srcLid()})",
       'and so does the prep card');
    has(src, "vendors.push({type: sel.value, cost: cost, lid: _srcLid()})",
       'and the vendor card');
  }
};
