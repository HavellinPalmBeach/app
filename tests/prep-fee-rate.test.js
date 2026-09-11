'use strict';
// THE PREP FEE WAS 30% IN TWELVE PLACES AND A RATE IN ONE (2026-09-11).
//
// `prepFeeRate()` has been the single definition since 2026-09-10 and thirteen surfaces
// already read it. Twelve others printed the digits — four on the CLIENT ESTIMATE, one in
// the CLIENT EMAIL, five on the prep Job Plan, one in the standard agreement's §3.5, and
// one on the sourcing card.
//
// ⚠⚠ ONE OF THEM WAS NOT PROSE. `renderPrepJobPlan` computed
//     var feeActual = Math.round(totalQuoted * 0.30);
// — a second copy of the RATE, in arithmetic, so no amount of reading the wording would
// find it. Measured by driving the real renderers on a $100,000 prep job with the rate
// moved to 0.35: the estimate and the invoice bill $35,000 and the Budget & Fee card
// still read **$30,000**, on the concierge's own fee readout in the field.
//
// ⚠ AND THE SOURCING NOTE HAD GONE FALSE IN BOTH HALVES. On a BUNDLED job it read
// "Havellin charges no fee on them — the coordination is billed hourly, in your logged
// hours". Since 2026-09-10 prep carries its fee on every engagement and books zero
// concierge hours, so both clauses were wrong — told to the one person typing in the
// actuals that fee is computed from. Same shape as the 15% clause this file already
// records, one service over.

const { sandbox, source, fn } = require('./harness');

const noComments = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

// Cut a source line down to its CODE: drop quoted spans first, so a `//` inside a string
// is not mistaken for a comment, then cut at whatever `//` is left.
function codeOf(line) {
  const bare = line.replace(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"/g, "''");
  const i = bare.indexOf('//');
  return i === -1 ? line : line.slice(0, line.length - (bare.length - i));
}

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ NO SURFACE STATES THE PREP FEE AS DIGITS');
  {
    // Any line mentioning a FEE and a 30 must be reading the rate. Scoped by the word
    // rather than by a list of functions on purpose: a list is a list of the sites we
    // already know about, and the failure mode here is the site nobody remembered.
    //
    // ⚠ A NARROWER PHRASE LIST LET ONE THROUGH AND ONLY REVERTING FOUND IT. The first cut
    // matched "management fee", "GC fee", "vendor spend" and four more — and the estimate's
    // own save confirmation says just `· 30% fee $25,715`, so backing that one out came back
    // GREEN. A net woven from the wordings you can think of catches the wordings you thought
    // of. The bare word is the net.
    //
    // The margin panel's "Price at 30% Margin" / "30% reference" is a DIFFERENT thirty —
    // the profitability line, unrelated to any fee — and it carries no "fee", so it is
    // excluded by the net rather than by an exception.
    const EXEMPT = [
      /var PREP_FEE_RATE = /,            // the one definition
      /within 30 days shall be submitted to binding arbitration/,  // §8 arbitration window
    ];
    const offenders = [];
    src.split('\n').forEach((line, i) => {
      const code = codeOf(line);
      if (!/fee/i.test(code)) return;
      if (!/\b30\b|0\.30|thirty percent/.test(code)) return;
      if (/prepFeeRate/.test(code)) return;
      if (EXEMPT.some((re) => re.test(code))) return;
      offenders.push((i + 1) + ': ' + code.trim().slice(0, 110));
    });
    eq(offenders, [], '⚠⚠ every fee statement carrying a 30 reads prepFeeRate() — no bare 30 survives');

    // The converse, so the sweep cannot pass by the phrases having been reworded away.
    const readers = (src.match(/prepFeeRate\(\)/g) || []).length;
    ok(readers >= 24, 'and there are ' + readers + ' readers of the one rate (>= 24)');
    eq((src.match(/var PREP_FEE_RATE = /g) || []).length, 1, 'declared exactly once');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ DRIVEN: MOVE THE RATE AND EVERY SURFACE MOVES WITH IT');
  {
    // $100,000 of managed vendors. At 30% the fee is $30,000; at 35% it is $35,000. The
    // point is not which number is right — it is that no surface can hold its own opinion.
    const EST = {
      jobId: 501, svc: 'prep', prepEnabled: true, fixedPrice: false,
      prepItems: [{ type: 'Painting', cost: 60000, note: 'full interior' },
                  { type: 'Landscaping', cost: 40000, note: 'front + rear' }],
      prepCost: 100000, prepFee: 30000, havellinTotal: 30000, grandTotal: 130000,
      rooms: [], vendors: [], collections: [], vehicles: [],
      tcHrs: 0, psHrs: 0, totTC: 0, totPS: 0, baseTCHrs: 0, basePSHrs: 0,
      tcRate: 150, psRate: 100, preparedBy: 'Ashley Jerome',
    };
    const JOB = { id: 501, svc: 'prep', name: 'Vickers', address: '2 Seabreeze Ln',
                  hvlId: 'HVL-0501', prepSourcing: { 0: { quote: 60000 }, 1: { quote: 40000 } } };

    const at = (rate, build) => {
      const c = sandbox({
        fns: ['prepFeeRate', 'buildPrepEstimateBody', 'proposedPlanRow', 'fmt', 'esc',
              'paymentSplit', 'estimateIsFeeOnly', 'clientJobPlanSection', '_cePhases',
              'materialsBasisNote', 'vendorEstimateNote', 'vendorFeeNote', '_pctWords',
              'conciergePhones', 'conciergePhonesText', 'prepLineTCHrs', 'coordHrsFor'],
        vars: ['SMF_PCT', 'RUSH_PCT', 'SVC_LABELS', 'HAVELLIN_OFFICE_PHONE',
               'NON_MOBILE_NUMBERS', 'PREP_FEE_RATE', 'COORD_TOUCHES',
               'COORD_TOUCHES_BY_GROUP', 'COORD_TOUCHES_DEFAULT', 'TOUCH_HRS'],
      });
      c.PREP_FEE_RATE = rate;
      return build(c);
    };

    // The client estimate's fee table and its two notes.
    const ce30 = at(0.30, (c) => c.buildPrepEstimateBody(EST, JOB));
    const ce35 = at(0.35, (c) => c.buildPrepEstimateBody(EST, JOB));
    has(ce30, '(30% of vendor spend)', 'at 0.30 the fee row reads 30%');
    has(ce35, '(35% of vendor spend)', '⚠ and at 0.35 it reads 35% — the row follows the rate');
    has(ce30, 'The final fee is 30% of actual vendor spend', 'the note reads 30%');
    has(ce35, 'The final fee is 35% of actual vendor spend', '⚠ …and follows too');
    lacks(ce35, '30%', '⚠⚠ NOTHING on a 35% estimate still says 30%');

    // The narrative paragraph, which is prose the client reads first.
    const n30 = at(0.30, (c) => c.proposedPlanRow(EST).narrative);
    const n35 = at(0.35, (c) => c.proposedPlanRow(EST).narrative);
    has(n30, 'a 30% management fee on that vendor spend', 'the narrative states the fee');
    has(n35, 'a 35% management fee on that vendor spend', '⚠ …and states the real one');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ THE JOB PLAN\'S FEE IS ARITHMETIC, AND IT WAS A SECOND COPY OF THE RATE');
  {
    // ⚠ Comment-stripped, and the reason is not laziness: the requirement is that no LIVE
    // expression holds a second copy of the rate, and the comment beside the fix has to
    // QUOTE the old arithmetic to be worth reading. Both needles below matched that comment
    // on the first run — this file already records the same trip four times.
    const body = noComments(fn('renderPrepJobPlan'));
    has(body, 'Math.round(totalQuoted * prepFeeRate())',
      '⚠⚠ the Budget & Fee card computes off the one rate');
    lacks(body, 'totalQuoted * 0.30',
      '⚠⚠ …and never off a hardcoded 0.30 — prose can be read, arithmetic cannot');
    // The four labels around it move as well, or the card states one rate and shows another.
    eq((body.match(/prepFeeRate\(\)/g) || []).length, 5,
       'the arithmetic and all four labels on that plan read it');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ THE SOURCING NOTE NO LONGER TELLS THE CONCIERGE THE FIRM EARNS NOTHING');
  {
    const body = noComments(fn('renderVendorSourcing'));   // same reason as above
    // The bundled arm said "Havellin charges no fee on them — the coordination is billed
    // hourly, in your logged hours." Both halves went false on 2026-09-10: prep carries the
    // fee on every engagement, and prepTCHrs is zero everywhere.
    lacks(body, 'Havellin charges no fee on them',
      '⚠⚠ the bundled arm no longer denies a fee that is charged');
    lacks(body, 'the coordination is billed hourly, in your logged hours',
      '⚠ nor promises hours that are booked nowhere');
    has(body, 'on this and every engagement',
      'it states the rule as the unconditional rule it now is');
    has(body, 'Prep books no concierge hours',
      '…and says the hours are zero, which is the other half a concierge needs');
    lacks(body, "(est.svc || job.svc) === 'prep')\n          ? 'Havellin",
      'the standalone/bundled ternary is gone, because the rule does not branch');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ THE AGREEMENT\'S §3.5 NO LONGER MIXES A COMPUTED RATE WITH A TYPED ONE');
  {
    const body = noComments(fn('agreementHtml'));
    // The SMF arm is unreachable while SMF_PCT is 0, which is exactly why it rotted
    // unnoticed: it computed the SMF from its constant and typed the prep 30 beside it.
    has(body, "and (b) ' + Math.round(prepFeeRate()*100) + '% of contractor invoices",
      '⚠ both rates in one clause are read, not one read and one typed');
    lacks(body, 'and (b) 30% of contractor invoices', 'the typed one is gone');
    // The two live arms already used _pctWords and must keep doing so — a contract states a
    // percentage in words, and that is a different rendering of the same one rate.
    eq((body.match(/_pctWords\(prepFeeRate\(\)\)/g) || []).length, 3,
       'all three arms that state a prep rate in prose spell it in words from the one rate');
  }
};
