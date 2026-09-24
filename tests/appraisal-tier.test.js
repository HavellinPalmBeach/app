'use strict';
// WHO ARRANGES THE APPRAISALS IS THE TIER'S QUESTION, NOT THE PRICING SCOPE'S (2026-09-24).
//
// ⚠⚠ THE DEFECT. The documentation tier is a four-rung menu — Contents list · Inventory with
// values · Inventory + appraisals · None — priced on three scopes, because the top two price
// identically (appraiser coordination already sits inside the `document` step's coordination
// column). The estate agreement and Exhibit A read the SCOPE, so on the `values` tier they were
// byte-identical to the `appraisals` tier and promised in writing that Havellin coordinates the
// appraisals: §2 ("appraisal coordination for all asset categories"), §5.2 ("within the 60-day
// inventory deadline from Letters of Administration issuance"), §5.3 ("Arrange professional
// appraisal"), and the estimate's close-out and records list ("Independent appraisals attached
// as supporting documentation"). Every other reader asks the TIER — the desk checklist's
// `weAppraise`, and the Court Inventory's DRAFT fix, which tells the court "the estate attorney
// arranges the appraisal on this engagement" — so a signed contract and a court-facing schedule
// disagreed about one duty on one job.
//
// Found checking the website's "appraisal coordination" line against the app: counsel can pick
// appraisals as their own rung on the menu, and the contract did not honour the rung below it.
//
// THE RULE THESE TESTS PIN: a Havellin-arranges-the-appraisals promise appears on a client
// document IF AND ONLY IF the tier produces appraisals AND the estimate priced the full scope.
// Driven on the real builders across every tier and every matter type, never grepped.

const { sandbox, source, fn } = require('./harness');

const TIER_FNS = ['weArrangeAppraisals', 'docTierProduces', 'docTierOf', 'docTierDef', 'docTierScope', 'svcHasDocStep'];
const TIER_VARS = ['DOC_TIERS', 'DOC_TIER_FROM_SCOPE', 'JOB_STEPS'];

const AGR_FNS = ['_agrComplianceHeading', '_agrComplianceLead', '_agrApprover', '_agrTrustDeliverable', 'matterDef',
                 'matterTypeOf', 'invFiduciaryMode', 'marketingOptOutBlock', 'marketingUseParas', '_mktClause',
                 'estTolerancePctTxt', 'agreementHtml', 'probateAgreementHtml', 'agrBillingRates', 'materialsBasisNote',
                 'fmt', 'esc', 'paymentSplit', 'isDecedentJob', 'agrSection', '_agrHasPrepVendors', 'estimateDocScope',
                 'docScopeDef', '_agrScopeServices', '_agrMidpointTrigger', '_agrProbateCompliance', 'esignAnchor',
                 'estFixedFee', 'estPrepFeeOnTop'].concat(TIER_FNS);
const AGR_VARS = ['AGR_NOT_AN_ACCOUNTING', 'MATTER_TYPES', 'EST_TOLERANCE_PCT', 'SMF_PCT', 'DECEDENT_SERVICES',
                  'agrApproved', 'HAVELLIN_OFFICE_PHONE', 'DOC_SCOPES', 'ESIGN_ANCHORS'].concat(TIER_VARS);

const CE_FNS = ['estTolerancePctTxt', '_cePhases', 'estimateDocScope', 'docScopeDef', 'isDecedentJob'].concat(TIER_FNS);
const CE_VARS = ['AGR_NOT_AN_ACCOUNTING', 'MATTER_TYPES', 'EST_TOLERANCE_PCT', 'DOC_SCOPES', 'DECEDENT_SERVICES']
  .concat(TIER_VARS);

const EST = {
  svc: 'probate', jobId: 1, docScope: 'full', tcFee: 18500, psFee: 12500, pkgCost: 1500,
  pkgLabel: 'Estate Premium — $1,500', smf: 0, prepFee: 0, havellinTotal: 32500, totTC: 100, totPS: 100,
  tcRate: 185, psRate: 125, discountPct: 0, fixedPrice: false, rush: false,
  vendors: [], prepItems: [], rooms: [], collections: [], vehicles: [],
};
const JOB = (over) => Object.assign({
  id: 1, hvlId: 'HVL-0007', name: 'Margaret Doe', svc: 'probate', matterType: 'probate', executor: 'Tripp Butler',
  addr: '69 Beach Blvd', city: 'Palm Beach', zip: '33480', deathDate: '2026-01-15',
}, over || {});

const text = (h) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const agrCtx = () => sandbox({ fns: AGR_FNS, vars: AGR_VARS, stubs: { estimateStore: {}, currentEstimate: null } });
const ceCtx = () => sandbox({ fns: CE_FNS, vars: CE_VARS, stubs: { isFormalDoc: () => true } });

// Every tier priced the way the real estimate prices it: the scope is pinned FROM the tier
// (seedDocScopeFromJob → docTierScope), so the fixture asks the app rather than typing a map.
const TIERS = ['contents', 'values', 'appraisals', 'none'];
// A trust or `neither` matter is an Estate Settlement in practice; probate and the pour-over
// case are booked as Probate. The service only moves the pricing steps; the clauses follow the
// matter type, which is the point.
const MATTERS = [['probate', 'probate'], ['both', 'probate'], ['trust', 'cleanout'], ['neither', 'cleanout']];
const OURS = ['appraisal coordination for all asset categories', 'Havellin will coordinate professional appraisals',
              'Arrange professional appraisal'];
const COUNSEL_BY_MATTER = {
  probate: 'Professional appraisals are arranged by the estate attorney',
  both:    'Professional appraisals are arranged by the estate attorney',
  trust:   'Professional appraisals are arranged by the trustee or their counsel',
  neither: 'Professional appraisals are arranged by the Client',
};

module.exports = function ({ group, ok, eq, has, lacks }) {
  const scopeOf = (tier) => agrCtx().docTierScope(tier);
  const agr = (matter, svc, tier, estOver) => {
    const job = JOB({ matterType: matter, svc: svc, docTier: tier });
    const e = Object.assign({}, EST, { svc: svc, docScope: scopeOf(tier) }, estOver || {});
    return text(agrCtx().probateAgreementHtml(job, e));
  };

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ the agreement promises Havellin arranges the appraisals ONLY on the appraisals tier');
  {
    eq(scopeOf('values'), 'full', 'fixture check: the values tier prices at full scope — the whole reason for the defect');
    eq(scopeOf('appraisals'), 'full', 'fixture check: and so does the appraisals tier');
    for (const [matter, svc] of MATTERS) {
      for (const tier of TIERS) {
        const doc = agr(matter, svc, tier);
        const hits = OURS.filter((s) => doc.indexOf(s) !== -1);
        eq(hits.length > 0, tier === 'appraisals', matter + ' / ' + tier + ': a promise that Havellin arranges the appraisals'
           + (tier === 'appraisals' ? ' is made' : ' is NOT made') + (hits.length ? ' (found: ' + hits.join('; ') + ')' : ''));
        if (tier === 'appraisals') eq(hits.length, 3, matter + ' / appraisals: in all three places — §2, §5.2 and the §5.3 table');
      }
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('the values tier says whose the appraisals are, in each place the top tier claims them');
  {
    for (const [matter, svc] of MATTERS) {
      const doc = agr(matter, svc, 'values');
      has(doc, 'The coordination of professional appraisals is not within this engagement',
          matter + ' / values: §2 states the carve-out rather than leaving it to inference');
      has(doc, COUNSEL_BY_MATTER[matter], matter + ' / values: §5.2 names who arranges them');
      has(doc, 'Havellin will give the appraiser access to the property', matter + ' / values: and what Havellin still does');
      has(doc, 'Admit an appraiser engaged by counsel', matter + ' / values: §5.3 authorises admitting the appraiser, not engaging one');
      // The values tier is still a VALUED inventory — the fix must not take the inventory half with it.
      has(doc, 'room-by-room asset documentation and inventory', matter + ' / values: §2 still sells the inventory');
    }
    const probate = agr('probate', 'probate', 'values');
    has(probate, 'Havellin will prepare a documented asset inventory suitable for use in the court-required filing',
        'probate / values: §5.2 still promises the §733.604 inventory — only the appraisal half moved');
    lacks(probate, '60-day inventory deadline from Letters', 'and no longer promises appraisals inside the 60-day window');
    eq((probate.match(/not within this engagement/g) || []).length, 1, 'the carve-out is stated exactly once in §2');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('the appraisals tier reads exactly as full scope always read — nothing moved at the top');
  {
    const ctx = agrCtx();
    const top = JOB({ docTier: 'appraisals' });
    eq(ctx._agrScopeServices('full', top),
       'Havellin Palm Beach will provide all services necessary to complete the estate settlement as directed by the '
       + 'Client and authorized by the Personal Representative. Services include, as applicable: room-by-room asset '
       + 'documentation and inventory; sorting, staging, and photographing all property contents; appraisal '
       + 'coordination for all asset categories; sale, auction, and liquidation coordination; charitable donation '
       + 'logistics with tax documentation; disposal and waste management; family distribution and documented handoff '
       + 'to beneficiaries; and vendor coordination throughout. Where applicable, property preparation for sale is '
       + 'included as reflected in Exhibit A.',
       '§2 at the appraisals tier is byte-for-byte the pre-fix full-scope clause');
    eq(ctx._agrProbateCompliance('full', top)[1],
       'Havellin will coordinate professional appraisals for all required asset categories within the 60-day inventory '
       + 'deadline from Letters of Administration issuance.',
       '§5.2 at the appraisals tier is byte-for-byte the pre-fix clause');
    eq(ctx._agrProbateCompliance('full', top).length, ctx._agrProbateCompliance('full', JOB({ docTier: 'values' })).length,
       'and §5.2 has the same number of clauses on both valued tiers — one sentence changes, none are added');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ the PRICED scope still guards it — the tier alone cannot promise what was never priced');
  {
    // A job re-tiered to `appraisals` after it was priced as a contents list: the estimate
    // carries no valuation and no appraiser coordination, so the contract must not promise either.
    const recapture = agr('probate', 'probate', 'appraisals', { docScope: 'capture' });
    OURS.forEach((s) => lacks(recapture, s, 'appraisals tier over a capture-priced estimate: no "' + s + '"'));
    has(recapture, 'without valuation', 'and the inventory half follows what was priced, too');
    const renone = agr('probate', 'probate', 'appraisals', { docScope: 'none' });
    OURS.forEach((s) => lacks(renone, s, 'appraisals tier over a none-priced estimate: no "' + s + '"'));
    const ctx = agrCtx();
    eq(ctx.weArrangeAppraisals('full', JOB({ docTier: 'appraisals' })), true, 'full + appraisals: ours');
    eq(ctx.weArrangeAppraisals('capture', JOB({ docTier: 'appraisals' })), false, 'capture + appraisals: not ours');
    eq(ctx.weArrangeAppraisals('full', JOB({ docTier: 'values' })), false, 'full + values: not ours — the defect');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('one answer across the app: the contract now agrees with the desk and the Court Inventory');
  {
    // Both of those read docTierProduces(job, 'appraisals'). At the full scope the contract's
    // question must answer the same, tier by tier — including an unanswered tier and a job
    // recorded before tiers existed, which the migration reads as `values`.
    const ctx = agrCtx();
    const cases = TIERS.map((t) => ['tier ' + t, JOB({ docTier: t })]).concat([
      ['an unanswered tier', JOB({})],
      ['a legacy job (docScope full, no tier)', JOB({ docScope: 'full' })],
      ['a legacy job (docScope capture, no tier)', JOB({ docScope: 'capture' })],
    ]);
    for (const [label, job] of cases) {
      eq(ctx.weArrangeAppraisals('full', job), ctx.docTierProduces(job, 'appraisals'),
         label + ': the contract and docTierProduces give the same answer');
    }
    eq(ctx.weArrangeAppraisals('full', JOB({ docScope: 'full' })), false,
       'a legacy full-scope job reads `values` — prelaunch, and the same reading the desk and the Court Inventory already give it');
    eq(ctx.weArrangeAppraisals('full', { svc: 'downsizing', docTier: 'appraisals' }), false,
       'a living-client service never has the appraisals, whatever a stray tier says');
    eq(ctx.weArrangeAppraisals('full', null), false, 'no job, no promise');
    // The other two readers, named so the join cannot quietly go one-sided.
    has(fn('printCourtInventory'), "docTierProduces(job, 'appraisals')", 'the Court Inventory DRAFT fix asks the tier');
    has(fn('planTaskCtx'), "weAppraise: docTierProduces(job, 'appraisals')", 'the desk checklist asks the tier');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('Exhibit A follows the tier: the close-out and the records list');
  {
    const ctx = ceCtx();
    const phases = (tier, svc) => ctx._cePhases(Object.assign({}, EST, { svc: svc || 'probate', docScope: scopeOf(tier) }),
                                                JOB({ svc: svc || 'probate', docTier: tier }));
    const recv = (P) => P.find((p) => p.receive).receive.join(' | ');
    const close = (P) => P.find((p) => p.title.indexOf('Close-Out') === 0).body;

    const top = phases('appraisals'), valued = phases('values');
    has(recv(top), 'Independent appraisals attached as supporting documentation', 'appraisals tier: the records list promises them');
    lacks(recv(valued), 'Independent appraisals', 'values tier: the records list does not');
    has(recv(valued), 'fair market value for every asset', 'values tier: the court-grade valued inventory is still promised');
    has(recv(valued), 'chain-of-custody', 'and the custody log');
    has(close(top), 'appraisals attached as supporting documentation', 'appraisals tier: the close-out names them');
    lacks(close(valued), 'appraisals attached', 'values tier: the close-out does not');
    has(close(valued), 'date-of-death fair market value for every asset, non-probate assets excluded, and the whole package',
        'values tier: the close-out sentence still joins cleanly — no stray comma where the clause came out');

    // Estate Settlement prices no legal step, so there is no court close-out either way — the
    // records list is the one place it shows, and it must follow the tier there too.
    const esTop = phases('appraisals', 'cleanout'), esValued = phases('values', 'cleanout');
    has(recv(esTop), 'Independent appraisals', 'Estate Settlement at the appraisals tier promises them');
    lacks(recv(esValued), 'Independent appraisals', 'Estate Settlement at the values tier does not');

    for (const tier of ['contents', 'none']) {
      lacks(recv(phases(tier)), 'Independent appraisals', tier + ': never promised, as before');
      lacks(close(phases(tier)), 'appraisals attached', tier + ': never at close-out, as before');
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('the helper is the only door: nothing prints an appraisal promise off the scope alone');
  {
    const live = (name) => fn(name).split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    // Each builder that makes the promise must ask the helper, the number of times it promises.
    eq((live('_agrProbateCompliance').match(/weArrangeAppraisals\(docScope, job\)/g) || []).length, 3,
       '§5.2 asks the helper on all three matter branches — probate, trust and neither');
    has(live('_agrScopeServices'), 'weArrangeAppraisals(docScope, job)', '§2 asks it');
    has(live('probateAgreementHtml'), 'weArrangeAppraisals(docScope, job)', '§5.3 asks it');
    has(live('_cePhases'), 'weArrangeAppraisals(docScope, job)', 'Exhibit A asks it');
    // And none of them still decides it on the scope. The phrase each promise used to hang off.
    for (const name of ['_agrProbateCompliance', '_agrScopeServices']) {
      const body = live(name);
      const lines = body.split('\n');
      const bad = lines.filter((l, i) => /docScope === 'full'/.test(l)
        && /apprais/i.test(lines.slice(i, i + 3).join(' ')));
      eq(bad.length, 0, name + ': no appraisal promise hangs off `docScope === \'full\'` any more');
    }
    ok(source().indexOf('function weArrangeAppraisals(docScope, job)') !== -1, 'the helper is defined once, where the tier predicate lives');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('the tier catalogue says the same thing the contract now says');
  {
    // DOC_TIERS is the one menu both forms build from, and each tier's `they` is counsel's half of
    // the deal. `values` read "Counsel prepares the filing." — silent on the appraisals, and the
    // appraisals are the only thing separating it from the tier above, which prices the same.
    const c = sandbox({ vars: ['DOC_TIERS'] });
    const tiers = c.DOC_TIERS;
    const byKey = (k) => tiers.filter((t) => t.key === k)[0] || {};
    tiers.filter((t) => t.produces && t.produces.inventory && !t.produces.appraisals).forEach((t) => {
      ok(/apprais/i.test(t.they), t.key + ': counsel\'s half names the appraisals (' + t.they + ')');
    });
    has(byKey('values').they, 'arranges any appraisal', 'values: counsel arranges any appraisal');
    lacks(byKey('appraisals').they, 'apprais', 'appraisals: counsel\'s half does not claim them — they are ours');
    eq(byKey('values').scope, byKey('appraisals').scope,
       'and the two still price the same, which is exactly why the words have to differ');
  }
};
