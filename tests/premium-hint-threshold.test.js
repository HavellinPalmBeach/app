'use strict';
// ────────────────────────────────────────────────────────────────────────────────────────────────
// The Premium Estate hint on Build Estimate (2026-10-14).
//
// The home value prices nothing; its one reader on the estimate screen is the hint under the Premium
// Estate toggle, "High-value property (…) — consider the Premium Estate rate." It fired at $5M. Anthony,
// 2026-10-14, on the pricing grid: coastal Palm Beach County runs $1,500 to $3,000 a square foot, so a
// 2,000 sq ft condo on the island is $3M to $6M and nearly every job cleared $5M; the hint fired on
// everything and said nothing. "Raise the Premium hint threshold to $10M."
//
// Driven through the real calcAll (driveCalcAll): the hint is read off the painted badge, never off the
// constant alone, and intake's value picker buckets are held to the boundary ($5M – $10M is below it,
// $10M – $20M above), so the hint follows what intake recorded.
// ────────────────────────────────────────────────────────────────────────────────────────────────
const { driveCalcAll, sandbox, source } = require('./harness');

module.exports = function ({ group, ok, eq, has, lacks }) {
  const ROOMS = ['Living Room', 'Kitchen', 'Primary Suite', 'Garage (2-car)'];
  const badge = (propval, prem) => {
    const seed = { 'e-propval': String(propval), 'e-prem': { checked: !!prem } };
    const r = driveCalcAll({ svc: 'cleanout', sqft: 3500, rooms: ROOMS, seed, job: { id: 7, svc: 'cleanout', sqft: 3500, propVal: String(propval) } });
    return String(r.doc.getElementById('prop-mult-badge').innerHTML || '');
  };

  group('the Premium Estate hint fires at $10M, not $5M (Anthony, 2026-10-14)');
  {
    const ctx = sandbox({ fns: [], vars: ['PREMIUM_HINT_VALUE'] });
    eq(ctx.PREMIUM_HINT_VALUE, 10000000, 'PREMIUM_HINT_VALUE is $10,000,000');
    lacks(badge(5000000), 'consider the Premium Estate rate', 'a $5M home, which fired the hint until 2026-10-14, no longer does');
    lacks(badge(9999999), 'consider the Premium Estate rate', 'nor does one dollar under $10M');
    has(badge(10000000), 'consider the Premium Estate rate', 'a $10M home does');
    has(badge(10000000), 'High-value property', 'the hint still names the property');
    has(badge(25000000), 'consider the Premium Estate rate', 'and so does a $25M estate');
    lacks(badge(25000000, true), 'consider the Premium Estate rate', 'nothing with Premium Estate already ticked');
  }

  group('intake\'s value buckets straddle the threshold');
  {
    // The picker stores one representative value per bucket; the two either side of $10M decide the hint.
    lacks(badge(7500000), 'consider the Premium Estate rate', '$5M – $10M (recorded as 7,500,000) does not fire it');
    has(badge(14000000), 'consider the Premium Estate rate', '$10M – $20M (recorded as 14,000,000) does');
    const src = source();
    ok(/'7500000':'\$5M – \$10M','14000000':'\$10M – \$20M'/.test(src), 'the picker still records those two buckets as 7,500,000 and 14,000,000');
  }

  group('one definition: the badge reads the constant, never a literal');
  {
    const src = source();
    const at = src.indexOf('consider the Premium Estate rate');
    ok(at > 0, 'the hint is in the source');
    const slice = src.slice(Math.max(0, at - 400), at);
    has(slice, 'propVal >= PREMIUM_HINT_VALUE', 'the badge compares against PREMIUM_HINT_VALUE');
    lacks(slice, '5000000', 'and not against the old literal');
    eq((src.match(/PREMIUM_HINT_VALUE/g) || []).length, 2, 'the constant is declared once and read once');
  }
};
