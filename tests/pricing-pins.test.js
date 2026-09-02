'use strict';
// What an estimate was PRICED UNDER, and why a settings change must never restate it.
//
// Anthony, 2026-09-02, on the Settings pricing block: "why are these now in app setting?
// … if they are set across the app, they will apply to all jobs and that is not correct.
// these look like 'per job' settings, don't you think?"
//
// Half right, and the half that was wrong found a worse bug. The production rate really is
// a per-property judgement — its own help text said "dial it down on trophy estates" while
// sitting on a firm-wide control. The four cost rates are a rate card and stay firm-wide.
// But Settings claimed "Saved estimates keep the crew cost they were priced with" and
// nothing did that: getPSCostRate / getTCCostRate read the live globals on every render.

const fs = require('fs');
const path = require('path');
const { sandbox } = require('./harness');

const APP = () => fs.readFileSync(path.join(__dirname, '..', 'havellin.html'), 'utf8');

module.exports = function ({ group, ok, eq, has, lacks }) {

  group('the production rate is a property judgement, set on the estimate');
  {
    const ctx = sandbox({
      fns: ['activeAlpha', 'setEstimateAlpha', 'resetEstimateAlpha'],
      vars: ['_estimateAlphaPin'],
      stubs: { TC_ONSITE_ALPHA: 0.5, calcAll() {}, document: { getElementById: () => null } },
    });

    eq(ctx.activeAlpha(), 0.5, 'an untouched estimate tracks the firm default');
    ctx.setEstimateAlpha(30);
    eq(ctx.activeAlpha(), 0.3, 'setting it on the estimate wins');
    ctx.resetEstimateAlpha();
    eq(ctx.activeAlpha(), 0.5, 'and Default hands it back to the firm value');

    // Nonsense must not silently become a price. A blank field is "no opinion", not 0%,
    // and 0% would put the concierge on site contributing nothing while the solve divides.
    ctx.setEstimateAlpha('');
    eq(ctx.activeAlpha(), 0.5, 'a cleared field falls back to the default, not to zero');
    ctx.setEstimateAlpha('abc');
    eq(ctx.activeAlpha(), 0.5, 'and so does gibberish');
    ctx.setEstimateAlpha(150);
    eq(ctx.activeAlpha(), 0.5, 'out of range is refused rather than clamped silently');
    ctx.setEstimateAlpha(0);
    eq(ctx.activeAlpha(), 0, 'but a deliberate 0% is a real answer — a concierge who only directs');
  }

  group('cost rates are pinned to what the estimate was quoted under');
  {
    const ctx = sandbox({
      fns: ['activeCostRates', 'getPSCostRate', 'getTCCostRate'],
      vars: ['_estimateCostPin'],
      stubs: {
        COST_RATES: { founderTC: 100, contractorTC: 60, psStandard: 30, psSenior: 35 },
        CONTRACTOR_TC_NAME: 'Contractor Concierge',
        DEFAULT_CONTRACTORS: [],
        contractors: [],
      },
    });

    // Live by default — a fresh estimate is costed at today's rates.
    eq(ctx.getTCCostRate('nobody'), 100, 'an unresolvable concierge falls back to the founder rate');
    eq(ctx.getPSCostRate('contractor_standard'), 30, 'and the placeholder slots to the live card');

    ctx._estimateCostPin = { founderTC: 111, contractorTC: 66, psStandard: 33, psSenior: 44 };
    eq(ctx.getTCCostRate('nobody'), 111, 'a saved estimate is costed at the rates it was priced under');
    eq(ctx.getTCCostRate('Contractor Concierge'), 66, 'including the outside-concierge placeholder');
    eq(ctx.getPSCostRate('contractor_standard'), 33, 'and both specialist placeholders');
    eq(ctx.getPSCostRate('contractor_senior'), 44, 'senior too');

    // THE RULE THAT SURVIVES ALL OF THIS: a named person is paid their own rate. These
    // four only ever covered the founders and the unnamed placeholder slots.
    ctx.contractors = [{ name: 'Real Person', role: 'PS', rate: 77 },
                       { name: 'Real Concierge', role: 'TC', rate: 88 }];
    eq(ctx.getPSCostRate('Real Person'), 77, 'a named specialist beats the pin');
    eq(ctx.getTCCostRate('Real Concierge'), 88, 'and a named concierge does too');

    // A named contractor with no rate recorded still falls back — to the PINNED card, so
    // the estimate stays internally consistent rather than mixing eras.
    ctx.contractors.push({ name: 'Rateless', role: 'PS', rate: 0 });
    eq(ctx.getPSCostRate('Rateless'), 33, 'a rateless contractor uses the pinned fallback');
  }

  group('the pins are stamped, restored, and cleared in the right places');
  {
    const src = APP();

    // Stamped onto the snapshot beside tcAlpha, or there is nothing to restore.
    has(src, 'costRates:{ founderTC:COST_RATES.founderTC', 'the snapshot records the cost card');
    has(src, "hoursModel:'v4-working-supervisor', tcAlpha:_sup.alpha",
        'alongside the production rate it was priced under');

    const at = src.indexOf('function restoreEstimateToUI(');
    const body = src.slice(at, src.indexOf('\n  // Set service type', at));
    has(body, '_estimateCostPin = (est.costRates', 'reopening an estimate restores the cost card');
    // An estimate saved before the stamp has no honest history to invent — it falls back
    // to live, which is the old behaviour, and Settings says so rather than implying
    // the number is historical.
    has(body, ': null;', 'and a pre-stamp estimate falls back to live rather than inventing one');

    // Resetting the production rate is not a reason to forget what the crew cost.
    const reset = src.slice(src.indexOf('function resetEstimateAlpha('));
    const resetBody = reset.slice(0, reset.indexOf('\n}\n'));
    lacks(resetBody, '_estimateCostPin', 'Default on the alpha field leaves the cost pin alone');

    // Every reader goes through the accessor, or one of them silently reads live rates.
    const ps = src.slice(src.indexOf('function getPSCostRate('));
    const psBody = ps.slice(0, ps.indexOf('\n}\n'));
    lacks(psBody, 'COST_RATES.', 'getPSCostRate reads the pin, never the global directly');
    const tc = src.slice(src.indexOf('function getTCCostRate('));
    const tcBody = tc.slice(0, tc.indexOf('\n}\n'));
    lacks(tcBody, 'COST_RATES.', 'getTCCostRate too');
  }

  group('Settings stops giving per-job advice on a firm-wide control');
  {
    const src = APP();
    const at = src.indexOf('The Transition Concierge is on site for every crew hour.');
    const blurb = src.slice(at, src.indexOf('</div>', at));
    // The old copy said "Dial it down on trophy estates" on a control that could not be
    // dialled per job — that contradiction is what prompted the whole change.
    lacks(blurb, 'Dial it down', 'the old per-job instruction is gone from the global control');
    has(blurb, 'set per', 'and it points at where the rate is actually set');
    has(blurb, 'fresh estimate starts at', 'naming itself as a default, not the rate');

    const cAt = src.indexOf('Raising a cost rate lowers margin');
    const cBlurb = src.slice(cAt, src.indexOf('</div>', cAt));
    has(cBlurb, 'keeps the crew cost it was priced with', 'the promise is still made');
    has(cBlurb, 'before 2026-09-02', 'and the estimates it cannot keep it for are named');
  }
};
