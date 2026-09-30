'use strict';
// ────────────────────────────────────────────────────────────────────────────────────────────────
// ⚠⚠ P12 — THE ESTIMATOR FIXES AND PRICING DECISIONS (2026-09-30, off the 2026-09-28 workflow audit).
//
// Anthony's answers: Q5 extra crew never lowers a fixed fee below the two-specialist plan; Q6 a room
// left at its default does not pull the house down, and a bigger house never prices lower; Q7 the
// reference band is rebuilt from the engine; Q9 no premium on the 30% prep fee on either basis, and on
// a fixed price the premium is its own line; Q10 estates open on fixed price; Q13 a fixed-price
// discount is its own line. Plus the estimator lows the audit listed.
//
// Everything here is driven: the real calcAll through driveCalcAll, the real helpers in a sandbox. The
// documents' arithmetic under the new rules is held by tests/document-reconciliation.test.js (its
// "2026-09-30 rules" matrix), which renders every client document and adds up its rows.
// ────────────────────────────────────────────────────────────────────────────────────────────────

const { sandbox, source, fn, domStub, driveCalcAll } = require('./harness');

module.exports = function ({ group, ok, eq, has, lacks }) {
  const BASE = ['Living Room', 'Kitchen', 'Dining Room', 'Family Room / Great Room', 'Primary Suite',
                'Bedroom 2', 'Bedroom 3', 'Garage (2-car)'];
  // The rooms the coverage badge asks for on a 3-bed, 3-bath house with a powder room.
  const COVER = ['Primary Bath', 'Bathroom 2', 'Bathroom 3', 'Half Bath', 'Laundry Room', 'Entryway / Foyer'];
  const SVCS = ['downsizing', 'downsizing_move', 'home_cleanout', 'cleanout', 'probate', 'contested_probate'];
  const run = (o) => driveCalcAll(o);
  const est = (r) => (r && r.ctx && r.ctx.currentEstimate) || {};
  // "$18,300", "+ $4,000", "- $2,220" → the signed number.
  const money = (t) => { const m = String(t || '').match(/([+\-−])?\s*\$\s*([\d,]+)/); if (!m) return null;
                         const v = parseInt(m[2].replace(/,/g, ''), 10); return (m[1] && /[-−]/.test(m[1])) ? -v : v; };
  const bandFigure = (html, label) => {
    const m = String(html).match(new RegExp(label + '</td><td class="num">\\$([\\d,]+) · (\\d+) working day'));
    return m ? { services: parseInt(m[1].replace(/,/g, ''), 10), days: parseInt(m[2], 10) } : null;
  };
  const PKG1500 = { 'e-pkg': { value: '1500', options: [{ text: 'Estate Premium — $1,500', value: '1500' }], selectedIndex: 0 } };

  // ───────────────────────────────────────────────────────────────────────────────────────────────
  group('⚠⚠ Q6 — a room left at its default does not pull the house down (audit M12)');
  {
    // The audit's case: scoring the rooms the coverage badge asks for, at their defaults, cut quotes by
    // 1.4% (contested probate) to 8% (Estate Settlement, $19,900 → $18,300).
    SVCS.forEach((svc) => {
      const a = est(run({ svc, sqft: 3500, rooms: BASE }));
      const b = est(run({ svc, sqft: 3500, rooms: BASE.concat(COVER) }));
      ok(a.havellinTotal > 0, `${svc}: the base walkthrough prices ($${a.havellinTotal})`);
      eq(b.havellinTotal, a.havellinTotal, `${svc}: scoring the six coverage rooms at their defaults leaves the quote where it was`);
    });

    // The engine, on one light room at, above and below its default.
    const ctx = run({ svc: 'cleanout', rooms: [] }).ctx;
    const eng = (rooms) => ctx.computeEngineV3(3500, rooms, 'cleanout', 2, '', 'full');
    const at = (name, vol, cplx) => { const d = ctx.roomDefault(name); return { name, vol: vol == null ? d.vol : vol, cplx: cplx == null ? d.cplx : cplx }; };
    const lr = [at('Living Room'), at('Kitchen')];
    const base = eng(lr);
    const withHalf = eng(lr.concat([at('Half Bath')]));
    eq([withHalf.totTC, withHalf.totPS], [base.totTC, base.totPS], 'a powder room at its default (1 / 1) is neutral — neither column moves');
    const halfFull = eng(lr.concat([at('Half Bath', 3)]));
    ok(halfFull.totPS > base.totPS, 'a powder room scored ABOVE its default raises the house');
    const lrLight = eng([at('Living Room', 2), at('Kitchen')]);
    ok(lrLight.totPS < base.totPS, 'a living room scored BELOW its default lowers it — an observation still counts');
    const cabana = eng(lr.concat([at('Pool / Cabana Half Bath')]));
    ok(cabana.totPS > base.totPS, 'an outbuilding at its default adds its load on top (exterior load is absolute, never an average)');
    eq(ctx.engineRelFactor(ctx.ENGINE_VOLF, 1, 1), 1, 'a score at its own default reads 1.0');
    eq(ctx.engineRelFactor(ctx.ENGINE_VOLF, undefined, 3), 1, 'and an unreadable one reads as the default, never as a 3');
  }

  // ───────────────────────────────────────────────────────────────────────────────────────────────
  group('⚠⚠ Q5 — a fixed fee never drops below the two-specialist plan (audit M12)');
  {
    // A bigger house never lowers the suggested fixed fee, across the automatic crew steps. The hourly
    // quote at the staffed crew dips at each step (the concierge is on site fewer hours) — that is the
    // open question put to Anthony; the fee, which is a price rather than a count of hours, does not.
    ['cleanout', 'probate', 'home_cleanout'].forEach((svc) => {
      let prev = null, stepped = 0;
      const drops = [];
      for (let s = 3000; s <= 12000; s += 500) {
        const e = est(run({ svc, sqft: s, rooms: BASE.concat(COVER), seed: { 'e-fixed': { checked: true } } }));
        if (prev && e.fixedSuggested < prev.fee) drops.push(`${prev.s}→${s}: $${prev.fee}→$${e.fixedSuggested}`);
        if (prev && e.psRecommended > prev.n) stepped++;
        prev = { s, fee: e.fixedSuggested, n: e.psRecommended };
      }
      ok(stepped >= 1, `${svc}: the range crosses ${stepped} automatic crew step(s)`);
      eq(drops, [], `${svc}: and the suggested fixed fee never falls as the house grows`);
    });

    // A crew the estimator chooses: 2 to 6 specialists on a large Estate Settlement.
    const big = run({ svc: 'cleanout', sqft: 9000, rooms: BASE.concat(COVER), seed: { 'e-fixed': { checked: true } } });
    const fees = [], hourly = [], notes = [];
    for (let n = 2; n <= 6; n++) {
      big.doc.getElementById('ps-crew-size').value = String(n);
      big.ctx._crewUserSet = true;
      big.ctx.calcAll();
      fees.push(est(big).fixedSuggested);
      hourly.push(est(big).hourlyHavellinTotal);
      notes.push(big.doc.getElementById('fixed-price-note').textContent);
    }
    eq(new Set(fees).size, 1, `the suggested fixed fee is the same at 2, 3, 4, 5 and 6 specialists ($${fees[0]}): the crew is Havellin's call, not a discount`);
    ok(hourly[4] < hourly[0], `while the hourly figure, which bills the hours actually worked, falls with the bigger crew ($${hourly[0]} at 2, $${hourly[4]} at 6)`);
    has(notes[4], 'Priced as the job would run with two specialists', 'the fixed panel says what the fee is priced on when the crew is larger');
    lacks(notes[0], 'Priced as the job would run with two specialists', 'and says nothing of it at two');
  }

  // ───────────────────────────────────────────────────────────────────────────────────────────────
  group('⚠⚠ Q7 — the reference band is this house, priced by the engine at Normal and at Full (audit M11)');
  {
    const ctx0 = run({ svc: 'cleanout', rooms: [] }).ctx;
    const fuller = (name) => Math.min(5, ctx0.roomDefault(name).vol + 1);
    SVCS.forEach((svc) => {
      const rN = run({ svc, sqft: 4000, rooms: BASE.concat(COVER) });
      const box = rN.doc.getElementById('ref-box').innerHTML;
      const n = bandFigure(box, 'At Normal'), f = bandFigure(box, 'At Full');
      ok(n && f, `${svc}: the band prints a Normal and a Full figure`);
      eq(n && n.services, est(rN).havellinTotal, `${svc}: its Normal figure IS this estimate priced with every room at Normal`);
      eq(n && n.days, est(rN).days, `${svc}: in the same working days`);
      const rF = run({ svc, sqft: 4000, rooms: BASE.concat(COVER).map((nm) => ({ name: nm, vol: fuller(nm) })) });
      eq(f && f.services, est(rF).havellinTotal, `${svc}: and its Full figure is the estimate priced with every room one step fuller`);
      ok(f && n && f.services > n.services, `${svc}: Full prices above Normal`);
      has(box, 'Scored at Normal.', `${svc}: a walkthrough at its defaults reads "Scored at Normal"`);
      ok(!/review scores|below range|above range|premium job/i.test(box), `${svc}: and nothing on it tells anyone to score up or down`);
      has(rF.doc.getElementById('ref-box').innerHTML, 'Scored at Full.', `${svc}: and one step fuller everywhere reads "Scored at Full"`);
    });
    // The band prices the same extras and the same chosen crew as the estimate beside it.
    const wp = run({ svc: 'cleanout', sqft: 4000, rooms: BASE.concat(COVER), seed: PKG1500 });
    eq((bandFigure(wp.doc.getElementById('ref-box').innerHTML, 'At Normal') || {}).services, est(wp).havellinTotal,
       'with a $1,500 materials package on it, the Normal figure is still this estimate at Normal');
    const wc = run({ svc: 'cleanout', sqft: 9000, rooms: BASE.concat(COVER) });
    wc.doc.getElementById('ps-crew-size').value = '5';
    wc.ctx._crewUserSet = true;
    wc.ctx.calcAll();
    const wcn = bandFigure(wc.doc.getElementById('ref-box').innerHTML, 'At Normal') || {};
    eq([wcn.services, wcn.days], [est(wc).havellinTotal, est(wc).days],
       'and with five specialists chosen by hand, the band prices the house with the same five');
    // The audit's "Above range": an Estate Settlement at 3,500 sq ft on default scores.
    const es = run({ svc: 'cleanout', sqft: 3500, rooms: BASE.concat(COVER) }).doc.getElementById('ref-box').innerHTML;
    has(es, 'Scored at Normal.', 'the audit\'s Estate Settlement at 3,500 sq ft on default scores reads as what it is');
    const light = run({ svc: 'cleanout', sqft: 3500, rooms: BASE.concat(COVER).map((nm) => ({ name: nm, vol: 1 })) }).doc.getElementById('ref-box').innerHTML;
    has(light, 'Scored lighter than Normal.', 'a house scored light says so, neutrally');
    const packed = run({ svc: 'cleanout', sqft: 3500, rooms: BASE.concat(COVER).map((nm) => ({ name: nm, vol: 5 })) }).doc.getElementById('ref-box').innerHTML;
    has(packed, 'Scored fuller than Full.', 'and a packed one says that');
    // Property value no longer moves the band (the multiplier widened it 15–85% on homes over $5M).
    const pv1 = run({ svc: 'probate', sqft: 5000, rooms: BASE, seed: { 'e-propval': '1500000' } }).doc.getElementById('ref-box').innerHTML;
    const pv2 = run({ svc: 'probate', sqft: 5000, rooms: BASE, seed: { 'e-propval': '50000000' } }).doc.getElementById('ref-box').innerHTML;
    eq(pv2, pv1, 'a $50M house and a $1.5M one of the same size and scoring read the same band');
    has(run({ svc: 'cleanout', sqft: 0, rooms: BASE }).doc.getElementById('ref-box').innerHTML, 'Set the square footage',
        'with no square footage the box says what it needs');
    has(run({ svc: 'cleanout', sqft: 3500, rooms: [] }).doc.getElementById('ref-box').innerHTML, 'Tick the rooms in scope',
        'and with no rooms, that');
    const src = source();
    lacks(src, 'var PRICING_REF', 'the hand-typed table is gone');
    lacks(src, 'function propValMultiplier', 'and the property-value multiplier with it');
    lacks(fn('renderJobs'), 'j.inRange', 'the client list no longer flags a total against the retired table');
  }

  // ───────────────────────────────────────────────────────────────────────────────────────────────
  group('⚠⚠ Q9 and Q13 — on a fixed price the premium and the discount are lines on the fee; the premium never touches the prep fee');
  {
    const r = run({ svc: 'cleanout', sqft: 3500, rooms: BASE,
                    seed: Object.assign({ 'e-fixed': { checked: true }, 'e-rush': { checked: true }, 'e-discount': '10' }, PKG1500) });
    r.ctx.prepItems = [{ type: 'Painting', cost: 10000, lid: 'L1' }];
    r.ctx.calcAll();
    const e = est(r);
    const prepFee = Math.round(10000 * r.ctx.prepFeeRate());
    eq([e.fixedLines, e.rushExPrepFee], [true, true], 'the record says it was priced under these rules');
    eq(e.fixedAmount, e.fixedSuggested, 'the fee tracks the suggestion until a figure is typed');
    eq(e.fixedSuggested, Math.round((e.tcFee + e.psFee + 1500) * (1 + r.ctx.fixedPriceBuffer('cleanout'))),
       '⚠ the suggestion is the price of the scope: the services and the contingency, with no premium and no discount inside it');
    eq(e.rushAmt, Math.round(e.fixedAmount * 0.20), 'the premium is 20% of the fee, and nothing of the prep fee');
    eq(e.discountAmt, r.ctx.discountOnLabor(e.fixedAmount - 1500, 0.20, 10),
       'the discount is 10% of the fee less the materials package, grossed up by the premium on it');
    eq(e.havellinTotal, e.fixedAmount + e.rushAmt - e.discountAmt + prepFee, 'the services total: the fee, plus the premium, less the discount, plus the prep fee');
    eq(e.grandTotal, e.havellinTotal + (e.vendorCost || 0) + e.prepCost, 'and the grand total adds the vendors at cost');

    // M10 — the Estimate Summary shows those figures, not the hourly ones.
    const T = (id) => r.doc.getElementById(id).textContent;
    const D = (id) => r.doc.getElementById(id).style.display;
    eq(money(T('s-fixed-fee')), e.fixedAmount, 'M10: the summary opens with the fixed fee');
    eq(D('s-fixed-row'), '', '…on a row of its own');
    eq(['s-tc-fee-row', 's-ps-fee-row', 's-pkg-row'].map(D), ['none', 'none', 'none'], 'and the hourly fee rows it replaced are hidden');
    eq(money(T('s-havellin')), e.fixedAmount + prepFee, 'the Services subtotal is the fee and the prep fee');
    eq(money(T('s-rush-amt')), e.rushAmt, 'the premium row is the premium on the fee');
    eq(money(T('s-discount-amt')), -e.discountAmt, 'the discount row is the discount on it');
    eq(money(T('s-total')), e.grandTotal, 'and "Total project estimate" is the figure the client is quoted ($' + e.grandTotal + ')');

    // The internal margin panel measures the price the client is quoted, on a fixed price the fee.
    const dep = (html) => { const m = String(html).match(/50% deposit \(\$([\d,]+)\)/); return m ? parseInt(m[1].replace(/,/g, ''), 10) : null; };
    eq(dep(r.doc.getElementById('margin-panel').innerHTML), Math.round(e.havellinTotal * 0.5),
       'M10: the margin panel\'s deposit is half the fixed-price total, not half the hourly one');

    // A fee typed by hand still carries the premium: ticking rush always raises the price.
    r.doc.getElementById('e-fixed-amount').value = '$20,000';
    r.ctx._fixedAmountUserSet = true;
    r.ctx.calcAll();
    const typed = est(r);
    eq([typed.fixedAmount, typed.rushAmt], [20000, 4000], 'on a typed $20,000 fee the premium is $4,000');
    r.doc.getElementById('e-rush').checked = false;
    r.ctx.calcAll();
    const calm = est(r);
    eq(calm.rushAmt, 0, 'untick rush and the premium goes');
    eq(typed.havellinTotal - calm.havellinTotal, 4000 - (typed.discountAmt - calm.discountAmt),
       '⚠ and the total falls by the premium (less its share of the discount): the tick moves a typed fee\'s price');
    ok(typed.havellinTotal > calm.havellinTotal, 'so a rush job always costs more than the same job without it');

    // The two ways to discount a fixed fee agree (audit low: about $180 apart with a $1,500 package).
    const D2 = sandbox({ fns: ['discountPreview', 'estPreDiscountTotal', 'estFixedLines', 'estFixedFee', 'estPrepFeeOnTop',
                               'discountOnFixedFee', 'discountOnLabor', 'fixedDiscountBasisWords'],
                         vars: ['RUSH_PCT', 'MAX_DISCOUNT_PCT'] });
    const pv = D2.discountPreview(typed, 10);
    eq(pv.discount, typed.discountAmt, 'Offer discount previews exactly the discount Build Estimate prices');
    eq(pv.revised, typed.havellinTotal, 'and the total it would leave is the saved total');
    has(pv.basis, 'less the moving materials it includes', 'and it names the base it used');
    const old = D2.discountPreview({ fixedPrice: true, fixedAmount: 24000 }, 10);
    eq([old.discount, old.revised, !!old.lines], [2400, 21600, false], 'a fixed price saved before today keeps its old rule: the discount is baked into the fee');

    // Hourly: the premium leaves the prep fee out too.
    const h = run({ svc: 'downsizing_move', sqft: 3500, rooms: BASE, seed: Object.assign({ 'e-rush': { checked: true } }, PKG1500) });
    h.ctx.prepItems = [{ type: 'Painting', cost: 10000, lid: 'L1' }];
    h.ctx.calcAll();
    const he = est(h);
    eq(he.rushAmt, Math.round((he.tcFee + he.psFee + he.pkgCost) * 0.20),
       '⚠ on an hourly job the premium is 20% of the services, not of the prep fee ($' + he.rushAmt + ', not $' + Math.round(he.havellinTotalFull * 0.20) + ')');
    eq(he.havellinTotal, he.havellinTotalFull + he.rushAmt, 'and the total is the services plus that premium');
  }

  // ───────────────────────────────────────────────────────────────────────────────────────────────
  group('⚠ a fixed price saved before today is restated on reopen, and its client\'s total does not move');
  {
    const noop = () => {};
    const reopen = (e) => {
      const ctx = sandbox({
        fns: ['restoreEstimateToUI', '_fxAmtSet', '_fxAmtGet', 'moneyToNumber', 'fixedFeeForCharge', 'discountOnFixedFee', 'discountOnLabor',
              'pinVendorLineHours', 'vendorDirectoryReady', 'vendorLineTCHrs', 'coordHrsFor', 'coordTouches', 'vendorGroupOfLine',
              'vendorGroupCategories', 'directoryCategories', 'vendorCats'],
        vars: ['ROOMS', '_fixedAmountUserSet', '_fixedAmountBasis', '_fixedPrepMovedOut', '_fixedLinesRestated', 'RUSH_PCT',
               'VENDOR_GROUP_CARDS', 'COORD_TOUCHES', 'COORD_TOUCHES_BY_GROUP', 'COORD_TOUCHES_DEFAULT', 'TOUCH_HRS',
               'vendorDirectory', 'GROUP_JOB_MENU', 'LOGISTICS_CATEGORIES'],
        stubs: { document: domStub({}), calcAll: noop, paintEstimateService: noop, svcTypeChanged: noop, toggleRoom: noop,
                 setRoomState: noop, collapseEmptyRoomSections: noop, renderCollections: noop, renderVehicles: noop,
                 renderVendors: noop, renderPrepItems: noop, paintVolPreset: noop, docScopeDef: () => null,
                 applyEstimateLock: noop, estDeclutterHrs: () => 0, jobs: [], collectionsData: [], vehiclesData: [],
                 vendors: [], prepItems: [] },
      });
      ctx.restoreEstimateToUI(Object.assign({ rooms: [] }, e));
      return ctx;
    };
    const LEG = { fixedPrice: true, fixedAmount: 24000, havellinTotal: 24000, prepFeeOnTop: true, rush: true, rushPct: 0.20,
                  discountPct: 10, pkgCost: 1500, fixedSuggested: 24000 };
    const c = reopen(LEG);
    const fee = c._fxAmtGet();
    const charge = fee + Math.round(fee * 0.20) - c.discountOnFixedFee(fee, 1500, 0.20, 10);
    ok(fee < 24000, `the fee is restated below the old figure ($${fee}), so the premium and the discount can print as lines`);
    ok(charge >= 24000 && charge - 24000 <= 1, `and with its lines it charges the old $24,000 (to the dollar: $${charge})`);
    eq(c._fixedLinesRestated, { was: 24000, fee }, 'the reopen records the restatement for the fixed panel');
    eq(c._fixedAmountBasis, 0, 'and its old suggestion is not read back (it was taken with the lines inside)');
    const now = reopen(Object.assign({}, LEG, { fixedLines: true, fixedAmount: 20000 }));
    eq([now._fxAmtGet(), now._fixedLinesRestated], [20000, null], 'a fee saved under today\'s rules comes back as saved');
    const plain = reopen(Object.assign({}, LEG, { rush: false, discountPct: 0 }));
    eq([plain._fxAmtGet(), plain._fixedLinesRestated], [24000, null], 'and an older fee with neither premium nor discount has nothing to restate');
    const N = sandbox({ fns: ['fixedLinesRestatedNote'] });
    has(N.fixedLinesRestatedNote({ was: 24000, fee: 21819 }, 24000), 'restated from $24,000 to $21,819', 'the panel names the restatement');
    has(N.fixedLinesRestatedNote({ was: 24000, fee: 21819 }, 24000), 'the same as before', 'and that the total did not move');
    has(N.fixedLinesRestatedNote({ was: 24000, fee: 21820 }, 24001), 'comes to $24,001.', 'or by how much it did');
    eq(N.fixedLinesRestatedNote(null, 0), '', 'and says nothing when nothing was restated');
  }

  // ───────────────────────────────────────────────────────────────────────────────────────────────
  group('⚠ Q10 — an estate opens on fixed price');
  {
    const R = sandbox({ fns: ['estimateOpensFixed', 'isDecedentJob'], vars: ['DECEDENT_SERVICES'] });
    eq(['cleanout', 'probate', 'contested_probate'].map((svc) => R.estimateOpensFixed({ svc })), [true, true, true],
       'Estate Settlement, Probate and Contested Probate open on fixed price');
    eq(['downsizing', 'downsizing_move', 'home_cleanout', 'prep'].map((svc) => R.estimateOpensFixed({ svc })), [false, false, false, false],
       'the living-client services open hourly');
    eq(R.estimateOpensFixed(null), false, 'and an unbound screen opens hourly');
    has(fn('resetEstimateJobState'), 'var _fxOn = estimateOpensFixed(job);', 'the one reset every fresh build runs through asks it');
  }

  // ───────────────────────────────────────────────────────────────────────────────────────────────
  group('the estimator lows (audit, P12)');
  {
    // 1. Re-saving a reopened estimate kept its pinned cost card, not today's Settings.
    const r1 = run({ svc: 'cleanout', sqft: 3500, rooms: BASE });
    r1.ctx._estimateCostPin = { founderTC: 11, contractorTC: 22, psStandard: 33, psSenior: 44 };
    r1.ctx.calcAll();
    eq(est(r1).costRates, { founderTC: 11, contractorTC: 22, psStandard: 33, psSenior: 44 }, 'the snapshot carries the pinned cost card');
    r1.ctx._estimateCostPin = null;
    r1.ctx.calcAll();
    const card = r1.ctx.COST_RATES;
    eq(est(r1).costRates, { founderTC: card.founderTC, contractorTC: card.contractorTC, psStandard: card.psStandard, psSenior: card.psSenior },
       'and the Settings card on a fresh build');

    // 2. A vendor line's coordination hours ride the line, so a slow directory cannot reprice a saved estimate.
    const r2 = run({ svc: 'cleanout', sqft: 3500, rooms: BASE,
                     fns: ['pinVendorLineHours', 'vendorDirectoryReady', 'directoryCategories', 'vendorCats'] });
    r2.ctx.vendorDirectory = [];   // not loaded
    r2.ctx.vendors = [{ type: 'Estate Sale Company', cost: 3000, lid: 'L1', tcHrs: 3.5 }];
    r2.ctx.calcAll();
    eq(est(r2).vendorTCHrs, 3.5, 'a pinned line books its own hours, whatever the directory holds');
    const P = r2.ctx;
    P.vendorDirectory = [];
    const loose = [{ type: 'Estate Sale Company' }, { type: 'Junk Removal' }];
    P.pinVendorLineHours(loose, 4);
    eq(Math.round((loose[0].tcHrs + loose[1].tcHrs) * 10) / 10, 4, 'with no directory, older lines share the total the record was saved with');
    P.vendorDirectory = [{ vendor_name: 'Acme Haul', category: 'Junk Removal', category_group: 'Disposal & Waste Management' }];
    const loose2 = [{ type: 'Junk Removal' }];
    P.pinVendorLineHours(loose2, 99);
    eq(loose2[0].tcHrs, P.vendorLineTCHrs('Junk Removal'), 'with the directory in hand they are derived, as a new line is');
    has(fn('addFromVendorGroup'), 'tcHrs: vendorLineTCHrs(sel.value)', 'a new line is pinned as it is added');

    // 3. A room score is a whole number from 1 to 5; a blank is unscored, and the gate can fire.
    const S = sandbox({ fns: ['roomScoreOf', 'clampRoomScoreInput', 'unscoredRoomNames'] });
    eq(['', ' ', '0', 'abc', '9', '2.5', '3', '1.4', '-2'].map((x) => S.roomScoreOf(x)), [null, null, null, null, 5, 3, 3, 1, null],
       'blank, 0 and junk are unscored; 9 is a 5; 2.5 is a 3');
    const box = (v) => { const el = { value: v }; S.clampRoomScoreInput(el); return el.value; };
    eq(['9', '2.5', '', '0', '4'].map(box), ['5', '3', '', '0', '4'], 'the box is brought into range as it is typed, and a blank or 0 is left for the gate');
    const blank = run({ svc: 'cleanout', sqft: 3500, rooms: [{ name: 'Living Room', vol: '' }, 'Kitchen'] });
    const scored = run({ svc: 'cleanout', sqft: 3500, rooms: ['Living Room', 'Kitchen'] });
    eq(est(blank).rooms.find((x) => x.name === 'Living Room').vol, null, 'a blank volume rides the snapshot as unscored');
    eq(S.unscoredRoomNames(est(blank)), ['Living Room'], '⚠ so Save and Submit name it — the gate that could never fire');
    eq(est(blank).havellinTotal, est(scored).havellinTotal, 'and until it is scored it prices at the room\'s own default, which is neutral');
    const nine = run({ svc: 'cleanout', sqft: 3500, rooms: [{ name: 'Living Room', vol: '9' }, 'Kitchen'] });
    eq(est(nine).rooms.find((x) => x.name === 'Living Room').vol, 5, 'a 9 is saved as the 5 it was priced at');

    // 4. Standalone Home Prep hides the fixed-price box it would ignore.
    const pr = run({ svc: 'prep', sqft: 3500, rooms: [] });
    eq(pr.doc.getElementById('fixed-toggle-wrap').style.display, 'none', 'on standalone prep the fixed-price toggle is hidden');
    eq(pr.doc.getElementById('fixed-amount-row').style.display, 'none', 'and its fee row');
    const lv = run({ svc: 'downsizing', sqft: 3500, rooms: BASE, seed: { 'e-fixed': { checked: true } } });
    eq([lv.doc.getElementById('fixed-toggle-wrap').style.display, lv.doc.getElementById('fixed-amount-row').style.display], ['', 'flex'],
       'on every other service it is there, with the fee row beside a ticked box');

    // 5. The Save button reads what the manual and the playbook call it.
    has(source(), '>Save Estimate</button>', 'the button reads Save Estimate');
    lacks(source(), 'Save &amp; Preview Client Estimate', 'not the retired preview label');
  }

  // ───────────────────────────────────────────────────────────────────────────────────────────────
  group('the premium and the discount on a fixed fee reach every place that states a price');
  {
    const REC = { fixedPrice: true, fixedLines: true, prepFeeOnTop: true, fixedAmount: 20000, rush: true, rushPct: 0.20,
                  rushAmt: 4000, discountPct: 10, discountAmt: 2070, pkgCost: 1500, prepFee: 3000, havellinTotal: 24930 };
    // The estimate emails: their lines add up to the Havellin total they state.
    const M = sandbox({ fns: ['estimateHavellinLines', 'estFixedFee', 'estPrepFeeOnTop', 'estFixedLines', 'prepFeeRate', '_emMoney'],
                        vars: ['PREP_FEE_RATE', 'RUSH_PCT'] });
    const lines = M.estimateHavellinLines(REC, false);
    eq(lines.map((l) => l[0]), ['Fixed Project Fee', 'Home Prep Site Management Fee (30%)', 'Expedited Delivery (20%)', 'Preferred Client Discount (10%)'],
       'the estimate emails list the fee, the prep fee, the premium and the discount');
    eq(lines.reduce((a, l) => a + l[1], 0), REC.havellinTotal, 'and those lines add up to the total the email states');
    eq([M._emMoney(-2070), M._emMoney(4000)], ['\u2212$2,070', '$4,000'], 'a credit line prints as −$2,070, never $-2,070');
    eq(M.estimateHavellinLines(Object.assign({}, REC, { fixedLines: false }), false).length, 2,
       'an older fixed price, its premium inside the fee, lists no premium line');

    // The change order says the premium and the discount are ON the fee, not in it.
    const C = sandbox({ fns: ['coRateModsLine', 'estFixedLines'], vars: ['RUSH_PCT'] });
    has(C.coRateModsLine(REC, true, false), 'the expedited-delivery premium and the preferred-client discount on your fixed project fee do not apply to it',
        'a fixed-price change order names the lines on the fee');
    has(C.coRateModsLine(Object.assign({}, REC, { fixedLines: false }), true, false), 'in your fixed project fee',
        'and an older fee\'s change order still says they are in it');

    // Offer discount on a fixed price saved today: the discount becomes a line and the fee stays the fee.
    const said = [];
    const A = sandbox({
      fns: ['applyDiscountRevision', 'discountPctInput', '_discountModalSays', 'discountPreview', 'estPreDiscountTotal', 'discountOnLabor',
            'estPrepFeeOnTop', 'estFixedLines', 'estFixedFee', 'discountOnFixedFee', 'fixedDiscountBasisWords', 'discountOfferBlocker',
            'priceChangeBlocker', 'isAgreementSigned', 'isAgreementSent', 'agreementSignature', 'docSentAt', 'docKeyFor',
            'revokeAgreementApproval', 'notePriceChange', 'docState', '_jobTouch', 'estimateEventStatus', 'isJobWon', 'closeDiscountModal',
            'staleDraftNotice', '_docNotice', 'dashNotice', '_dashFbTarget', '_jobBandHost',
            'docDraftPending', 'draftIsStale', 'draftOutstanding', 'outstandingDrafts', 'staleDraftsOf', 'staleDraftNote',
            'staleDocName', '_draftDay', '_andJoin'],
      vars: ['MAX_DISCOUNT_PCT', 'RUSH_PCT', '_packetExported', 'currentAgrJobId', 'estimateApproved', 'estimateSubmitted',
             'discountRevision', '_dashNotice', '_dashboardJobId'],
      stubs: { document: domStub({ 'dm-pct': '10' }), saveJobs() {}, syncJobToSheets() {}, saveEstimateState() {}, renderClientEstimate() {},
               updateApprovalUI() {}, notifyManagerForApproval() {}, _dashRedraw() {}, showFB(el, k, m) { said.push(m); },
               showSyncBadge() {}, alert() {} },
    });
    A.jobs = [{ id: 7, status: 'won', won: true, approved: true, docState: {} }];
    A.currentEstimate = Object.assign({ jobId: 7, grandTotal: 26930 }, REC, { discountPct: 0, discountAmt: 0, havellinTotal: 27000 });
    A.applyDiscountRevision();
    const ce = A.currentEstimate;
    eq([ce.fixedAmount, ce.discountPct], [20000, 10], 'the fee stays the price of the scope and the discount is recorded as 10%');
    eq(ce.discountAmt, A.discountOnFixedFee(20000, 1500, 0.20, 10), 'at the one fixed-fee discount rule');
    eq(ce.havellinTotal, 27000 - ce.discountAmt, 'and the total is the old one less that discount — the prep fee still on top once');
  }

  // ───────────────────────────────────────────────────────────────────────────────────────────────
  group('the lows are wired where a person reaches them');
  {
    // The score boxes clamp as they are typed.
    const V = sandbox({ fns: ['onVolInput', 'onCplxInput', 'clampRoomScoreInput', 'roomScoreOf'], vars: [],
                        stubs: { document: domStub({ 'vol-r1': '9', 'cplx-r1': '2', 'vol-r2': '3', 'cplx-r2': '2.5' }), calcAll() {}, _volHandSet: {} } });
    V.onVolInput('r1');
    eq(V.document.getElementById('vol-r1').value, '5', 'a 9 typed as a volume becomes a 5 as it is typed');
    eq(String(V.document.getElementById('cplx-r1').value), '5', 'and a 5 still lifts the complexity to 5, as it always has');
    V.onCplxInput('r2');
    eq(V.document.getElementById('cplx-r2').value, '3', 'a 2.5 typed as a complexity becomes a 3');
    // A saved estimate reopened before the directory lands keeps its vendor hours.
    const noop = () => {};
    const R = sandbox({
      fns: ['restoreEstimateToUI', '_fxAmtSet', '_fxAmtGet', 'moneyToNumber', 'fixedFeeForCharge', 'discountOnFixedFee', 'discountOnLabor',
            'pinVendorLineHours', 'vendorDirectoryReady', 'vendorLineTCHrs', 'coordHrsFor', 'coordTouches', 'vendorGroupOfLine',
            'vendorGroupCategories', 'directoryCategories', 'vendorCats'],
      vars: ['ROOMS', '_fixedAmountUserSet', '_fixedAmountBasis', '_fixedPrepMovedOut', '_fixedLinesRestated', 'RUSH_PCT',
             'VENDOR_GROUP_CARDS', 'COORD_TOUCHES', 'COORD_TOUCHES_BY_GROUP', 'COORD_TOUCHES_DEFAULT', 'TOUCH_HRS',
             'vendorDirectory', 'GROUP_JOB_MENU', 'LOGISTICS_CATEGORIES'],
      stubs: { document: domStub({}), calcAll: noop, paintEstimateService: noop, svcTypeChanged: noop, toggleRoom: noop,
               setRoomState: noop, collapseEmptyRoomSections: noop, renderCollections: noop, renderVehicles: noop,
               renderVendors: noop, renderPrepItems: noop, paintVolPreset: noop, docScopeDef: () => null,
               applyEstimateLock: noop, estDeclutterHrs: () => 0, jobs: [], collectionsData: [], vehiclesData: [],
               vendors: [], prepItems: [] },
    });
    R.vendorDirectory = [];
    R.restoreEstimateToUI({ rooms: [], vendorTCHrs: 6, vendors: [{ type: 'Estate Sale Company', cost: 4000 }, { type: 'Junk Removal', cost: 900 }] });
    eq(Math.round(R.vendors.reduce((a, v) => a + v.tcHrs, 0) * 10) / 10, 6,
       '⚠ reopened before the Vendor Directory has loaded, the lines keep the 6 hours the estimate was saved with');
  }

  // ───────────────────────────────────────────────────────────────────────────────────────────────
  group('one chain from engine hours to billed hours, read by the estimate and the band');
  {
    const src = fn('calcAll');
    has(src, 'var _pools = labourPools(eng,', 'calcAll takes its pools from labourPools');
    has(src, 'var _billed = labourBilled(_sup, _billK);', 'and its billed hours from labourBilled');
    has(src, 'daysNeeded = planDays(crew, destPS, crewSize, svcKey, isPrep);', 'and its days from planDays');
    const rb = fn('referenceBand');
    ['labourPools(eng, inp.poolsK)', 'labourBilled(sup, inp.billedK)', 'planDays(sup,'].forEach((n) =>
      has(rb, n, 'the band reads ' + n.split('(')[0]));
  }
};
