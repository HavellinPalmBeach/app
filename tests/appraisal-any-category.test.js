'use strict';
// ────────────────────────────────────────────────────────────────────────────────────────────────
// The appraisal flag reads the value in every category (Anthony, 2026-10-14).
//
// Found building the pricing grid (P23's open item): `invNeedsAppraisal` routed on value only inside
// the nine intrinsic categories, so a Furniture line Agent Two valued at $9,000 reached no appraiser on
// an estate and the Court Inventory never said it was waiting for one. Asked with four options, Anthony
// chose "Any category at $3,000+". Two edges are deliberate: vehicles keep the collector flag as their
// only route (`apprByFlagOnly` on the taxonomy), and the no-value arm stays intrinsic-only (an unvalued
// sofa is not an appraisal; an unvalued painting is). On a living job nothing routes but the tick.
// ────────────────────────────────────────────────────────────────────────────────────────────────
const { sandbox, fn } = require('./harness');

module.exports = function ({ group, ok, eq, has, lacks }) {
  const ESTATE = { id: 1, svc: 'probate' };
  const DISPUTED = { id: 2, svc: 'cleanout', gateDispute: 'yes' };
  const LIVING = { id: 3, svc: 'home_cleanout' };
  const ctx = sandbox({
    fns: ['invNeedsAppraisal', 'invAppraisalChosen', 'invIsIntrinsic', 'invCatMeta', 'invAppraisalThreshold', 'gateDispute', '_gateYes', 'invFiduciaryMode', 'isDecedentJob',
          'invAwaitingAppraisal', 'invAppraised', '_invHasValue', '_invHasAppraisal', '_invJob'],
    vars: ['INV_TAXONOMY', 'INV_APPRAISAL_THRESHOLD', 'INV_APPRAISAL_THRESHOLD_DISPUTED', 'DECEDENT_SERVICES'],
    stubs: { jobs: [ESTATE, DISPUTED, LIVING] },
  });
  const needs = (ref, job) => ctx.invNeedsAppraisal(ref, job);

  group('on an estate, a value at the threshold flags a line in any category');
  {
    ok(needs({ category: 'Furniture', fmv: '9000' }, ESTATE), '⚠⚠ the $9,000 sofa reaches the worklist (it never did)');
    ok(needs({ category: 'Furniture', fmv: '3000' }, ESTATE), 'at exactly $3,000');
    ok(!needs({ category: 'Furniture', fmv: '2999' }, ESTATE), 'not a dollar under');
    ok(needs({ category: 'Electronics & Appliances', fmv: '4500' }, ESTATE), 'electronics too');
    ok(needs({ category: 'General/Household', fmv: '5000' }, ESTATE), 'and general household');
    ok(needs({ category: 'Art & Décor', fmv: '9000' }, ESTATE), 'the intrinsic categories as before');
    ok(!needs({ category: 'Art & Décor', fmv: '100' }, ESTATE), '…and under the threshold they do not');
  }

  group('the no-value arm stays intrinsic-only');
  {
    ok(needs({ category: 'Art & Décor', fmv: '' }, ESTATE), 'an unvalued painting needs a specialist');
    ok(needs({ category: 'Firearms', fmv: '' }, ESTATE), 'an unvalued firearm too');
    ok(!needs({ category: 'Furniture', fmv: '' }, ESTATE), 'an unvalued sofa is not an appraisal');
    ok(!needs({ category: 'General/Household', fmv: '' }, ESTATE), 'nor an unvalued household lot');
  }

  group('vehicles route only by their collector flag');
  {
    ok(!needs({ category: 'Vehicles & Watercraft', fmv: '30000' }, ESTATE), 'a $30,000 daily driver never nags');
    ok(needs({ category: 'Vehicles & Watercraft', fmv: '30000', needsAppr: true }, ESTATE), 'the collector flag still routes it');
    const flagOnly = ctx.INV_TAXONOMY.filter((t) => t.apprByFlagOnly).map((t) => t.cat);
    eq(flagOnly, ['Vehicles & Watercraft'], 'exactly one category is flag-only, and it is vehicles');
    eq(ctx.INV_TAXONOMY.filter((t) => t.intrinsic).length, 9, 'the nine intrinsic categories are unchanged');
  }

  group("Agent Two's range is read in every category");
  {
    ok(needs({ category: 'Furniture', fmv: '2500', valuedBy: 'agent', valHigh: '4000' }, ESTATE), 'a $2,500 to $4,000 range on a sofa is an appraisal');
    ok(!needs({ category: 'Furniture', fmv: '2500', valuedBy: 'agent', valHigh: '2900' }, ESTATE), 'a range under it is not');
    ok(!needs({ category: 'Furniture', fmv: '', valuedBy: 'agent', valHigh: '' }, ESTATE), 'a failed valuation on a sofa stays off the worklist');
  }

  group('the disputed threshold and the living job');
  {
    ok(needs({ category: 'Furniture', fmv: '600' }, DISPUTED), 'a disputed estate flags a $600 sofa');
    ok(!needs({ category: 'Furniture', fmv: '499' }, DISPUTED), 'not $499');
    ok(!needs({ category: 'Furniture', fmv: '50000' }, LIVING), 'a living client\'s $50,000 sofa is never flagged by value');
    ok(needs({ category: 'Furniture', fmv: '50000', needsAppr: true }, LIVING), 'the tick is the only route on a living job');
  }

  group('and so the line is awaiting its appraisal until the figure lands or a waiver is recorded');
  {
    ok(ctx.invAwaitingAppraisal({ category: 'Furniture', fmv: '9000' }, 1), 'the $9,000 sofa is awaiting one');
    ok(!ctx.invAwaitingAppraisal({ category: 'Furniture', fmv: '9000', valSource: 'Appraisal' }, 1), 'the appraisal\'s figure on the line clears it');
    ok(!ctx.invAwaitingAppraisal({ category: 'Furniture', fmv: '9000', apprWaived: true }, 1), 'as does a waiver');
    ok(!ctx.invAwaitingAppraisal({ category: 'Furniture', fmv: '9000' }, 3), 'and on the living job it was never awaiting one');
  }

  group('one rule, in the source');
  {
    const body = fn('invNeedsAppraisal');
    lacks(body, "if (!invIsIntrinsic(ref.category)) return false;", 'the old intrinsic-only early return is gone');
    has(body, 'apprByFlagOnly', 'the vehicle exception reads the taxonomy');
    has(body, 'if (!intrinsic) return !isNaN(v) && v >= invAppraisalThreshold(job);', 'a non-intrinsic line needs a known value');
  }
};
