'use strict';
// THE CONTRACT STATES THE RATES THE ESTIMATE WAS PRICED AT (2026-09-11).
//
// ⚠⚠ The probate form's §3.1 fee table hardcoded '$150 / hour' and '$100 / hour' while the
// standard form correctly read `est.tcRate` / `est.psRate`. On a PREMIUM engagement the
// estimate, the client estimate and every invoice bill $185 / $125 — so a personal
// representative signed a contract at $150/$100 and was invoiced at $185/$125. Driven on the
// real builder: a 100 TC + 100 PS probate matter stated **$25,000** of labour against
// **$31,000** billed, on a court-reviewed matter where those expenses are filed.
//
// ⚠ AND THE SAME TABLE PROMISED A BILLING MECHANISM THAT HAS NEVER EXISTED. `pkgCost` is a flat
// package price picked from a dropdown; there is no cost input, no markup arithmetic and no
// receipt store. Four client surfaces — two of them CONTRACTS — said "cost plus a 25% materials
// handling fee, itemized separately on the invoice, receipts available on request."
//
// ⚠⚠ THE ARCHITECTURAL CLAIM THIS FILE EXISTS TO PIN, because it is the question a reader will
// ask: A CONTRACTOR'S OWN RATE IS A COST AND MUST NEVER REACH A CLIENT DOCUMENT. The billing
// rate follows the ROLE (TC / PS, premium or not); the contractor rate follows the PERSON and
// feeds margin alone. Two clients on identical jobs must not pay different amounts because a
// different specialist was free that week — and the agreement is signed before the crew is
// named, so a person-keyed billing rate could not be written into it at all.

const { sandbox, source, fn } = require('./harness');

const AGR_FNS = ['agreementHtml', 'probateAgreementHtml', 'agrBillingRates', 'materialsBasisNote',
                 'fmt', 'esc', 'paymentSplit', 'isDecedentJob', 'agrSection', '_agrHasPrepVendors',
                 'estimateDocScope', 'svcHasDocStep', 'docScopeDef', '_agrScopeServices',
                 '_agrMidpointTrigger', '_agrProbateCompliance'];
const AGR_VARS = ['SMF_PCT', 'DECEDENT_SERVICES', 'agrApproved', 'HAVELLIN_OFFICE_PHONE',
                  'JOB_STEPS', 'DOC_SCOPES'];

const EST = {
  jobId: 1, tcFee: 18500, psFee: 12500, pkgCost: 1500, pkgLabel: 'Estate Premium — $1,500',
  smf: 0, prepFee: 0, havellinTotal: 32500, totTC: 100, totPS: 100,
  tcRate: 185, psRate: 125, discountPct: 0, fixedPrice: false, rush: false,
  vendors: [], prepItems: [], rooms: [], collections: [], vehicles: [],
};
const est = (over) => Object.assign({}, EST, over || {});

function ctx() {
  return sandbox({ fns: AGR_FNS, vars: AGR_VARS,
                   stubs: { estimateStore: {}, currentEstimate: null } });
}
const PROBATE = { id: 1, hvlId: 'HVL-0007', name: 'Margaret Doe', svc: 'probate',
                  executor: 'Tripp Butler', addr: '69 Beach Blvd', city: 'Palm Beach',
                  zip: '33480', deathDate: '2026-01-15', docLevel: 'formal' };
const LIVING = { id: 1, hvlId: 'HVL-0008', name: 'Jane Doe', svc: 'downsizing',
                 addr: '12 Ocean Blvd', city: 'Palm Beach', zip: '33480' };

const text = (h) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const probateDoc = (job, e) => text(ctx().probateAgreementHtml(job, e));
const standardDoc = (job, e) => text(ctx().agreementHtml(job, e));

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();
  const noComments = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ A PREMIUM ENGAGEMENT SIGNS AT THE RATES IT IS BILLED AT');
  {
    const prem = Object.assign({}, PROBATE, { premium: true });
    const d = probateDoc(prem, est());
    has(d, '$185 / hour',
        '⚠⚠ the probate fee table states the concierge rate the estimate priced — it said $150');
    has(d, '$125 / hour', 'and the specialist rate — it said $100');
    lacks(d, '$150 / hour',
          '⚠ the hardcoded pair is gone. 100 TC + 100 PS at the stated rates was $25,000 against '
          + '$31,000 invoiced, on a matter a court reviews');
    lacks(d, '$100 / hour', 'both halves of it');
    has(d, 'Premium Estate rates apply',
        '⚠ and it says WHY the rate is higher — a representative reading $185 with no explanation '
        + 'asks the question the contract should already have answered');
  }

  group('an ordinary engagement is unchanged, which is how this stayed hidden');
  {
    const d = probateDoc(PROBATE, est({ tcRate: 150, psRate: 100 }));
    has(d, '$150 / hour', 'a standard-rate matter still reads $150');
    has(d, '$100 / hour', 'and $100 — identical to before the fix');
    lacks(d, 'Premium Estate rates apply', 'with no premium note it has not earned');
  }

  group('⚠ IT READS THE RECORD, NOT THE PREMIUM FLAG — the test that proves it');
  {
    // A rate pair that matches NEITHER default. If the table were keyed on `job.premium` it
    // would print 150/100 or 185/125 and never these.
    const odd = est({ tcRate: 160, psRate: 110 });
    has(probateDoc(PROBATE, odd), '$160 / hour', 'a non-default concierge rate reaches the probate form');
    has(probateDoc(PROBATE, odd), '$110 / hour', 'and the specialist rate');
    has(standardDoc(LIVING, odd), '$160/hour', 'and the standard form, which already read it');
    has(standardDoc(LIVING, odd), '$110/hour', 'both');
  }

  group('the blank template falls back by the premium flag, in one place');
  {
    const c = ctx();
    eq(c.agrBillingRates({ premium: false }, null).tc, 150, 'no estimate, ordinary: $150');
    eq(c.agrBillingRates({ premium: false }, null).ps, 100, 'and $100');
    eq(c.agrBillingRates({ premium: true }, null).tc, 185, 'no estimate, premium: $185');
    eq(c.agrBillingRates({ premium: true }, null).ps, 125, 'and $125');
    eq(c.agrBillingRates(null, null).tc, 150, 'no job at all does not throw');
    // The estimate always wins over the flag — a job re-flagged premium after pricing must not
    // silently reprice a contract against an estimate quoted at the old rates.
    eq(c.agrBillingRates({ premium: true }, { tcRate: 150, psRate: 100 }).tc, 150,
       '⚠ the estimate wins over the flag — the contract states what was actually quoted');
  }

  group('⚠ ONE DEFINITION — the two forms cannot disagree about a rate');
  {
    const c = ctx();
    const r = c.agrBillingRates(PROBATE, est());
    eq(r.tc, 185, 'the shared helper answers the concierge rate');
    eq(r.ps, 125, 'and the specialist rate');
    // Both forms are driven off it rather than each carrying a fallback.
    const body = noComments(fn('probateAgreementHtml')) + noComments(fn('agreementHtml'));
    const uses = (body.match(/agrBillingRates\(/g) || []).length;
    eq(uses, 2, 'each agreement form asks the shared definition exactly once');
    lacks(noComments(fn('probateAgreementHtml')), "'$150 / hour'",
          '⚠ no rate literal survives in the probate fee table — that literal IS the defect');
    lacks(noComments(fn('probateAgreementHtml')), "'$100 / hour'", 'on either row');
    lacks(noComments(fn('agreementHtml')), 'job.premium ? 185 : 150',
          'and the standard form no longer keeps its own copy of the fallback');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ A CONTRACTOR RATE IS A COST AND NEVER REACHES A CLIENT DOCUMENT');
  {
    // The question this answers: "rates should also read from contractors when selected in an
    // estimate — is there a conflict?" There is not, and there must not be. The billing rate
    // follows the ROLE; the contractor rate follows the PERSON and feeds margin alone.
    const forms = noComments(fn('probateAgreementHtml')) + noComments(fn('agreementHtml'))
                + noComments(fn('agrBillingRates'));
    // ⚠ THE NEEDLE HAS TO BE THE ROSTER, NOT THE WORD. A bare `contractors` matches contract
    // PROSE — the standard form calls Havellin "Contractor" throughout, and there are bonding,
    // NDA and Independent Contractor clauses. It failed loudly, which is the good direction, but
    // a needle that matches the party's own name proves nothing about what the code reads.
    ['getTCCostRate', 'getPSCostRate', 'COST_RATES', 'activeCostRates',
     'DEFAULT_CONTRACTORS', 'contractors.filter', 'contractors.find'].forEach((n) => {
      lacks(forms, n, `no agreement reads ${n} — that is what Havellin PAYS, not what it bills`);
    });

    // And the invoice bills by ROLE at the job's rate, so two specialists on one job bill the
    // same. A person-keyed billing rate would make two identical jobs cost different amounts
    // and could not be written into a contract signed before the crew is named.
    const inv = noComments(fn('invoiceHtml'));
    has(inv, "var rate = t.role === 'TC' ? tcRate : psRate;",
        '⚠ the invoice bills each team member at the ROLE rate, never at their own cost rate');
    lacks(inv, 'getTCCostRate', 'the invoice never reaches for a cost rate');
    lacks(inv, 'getPSCostRate', 'on either role');

    // The cost side genuinely does do person-specific rates — that is where "specifics when the
    // crew is selected" lives, and it is deliberately on the margin side of the wall.
    const cost = noComments(fn('getTCCostRate'));
    has(cost, 'samePerson(c.name, name)', 'a NAMED contractor is matched by person');
    has(cost, '_cr.founderTC', 'and the settings rate is the fallback before anyone is named');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ THE MATERIALS LINE STATES WHAT IS ACTUALLY BILLED');
  {
    // `pkgCost` is a flat dropdown price. There is no cost input, no markup and no receipts.
    lacks(src, 'Cost + 25%',
          '⚠⚠ no client surface offers cost-plus materials — the app has never computed one');
    lacks(src, '25% materials handling fee', 'nor a handling fee it does not charge');
    lacks(src, 'Receipts available on request',
          '⚠ and nothing promises receipts the firm cannot produce, on a probate matter where '
          + 'the representative may well ask');

    const d = probateDoc(PROBATE, est());
    has(d, 'fixed package', 'the probate table states the real basis');
    has(d, 'Estate Premium', 'and names the package the estimate quoted');
    has(d, 'not cost-plus and carries no separate handling fee',
        'saying plainly what it is not, because four documents said otherwise');

    has(standardDoc(LIVING, est()), 'fixed package', '§3.6 of the standard form says the same');

    // One definition, read by every surface — the four copies are what drifted.
    const c = ctx();
    has(c.materialsBasisNote('Estate Basic — $500'), 'Estate Basic — $500', 'it names a known package');
    lacks(c.materialsBasisNote(''), '()', 'and renders cleanly with no package selected');
    const uses = (src.match(/materialsBasisNote\(/g) || []).length;
    ok(uses >= 4, 'defined once and read by the estimate table, the Terms and both agreements');
  }

  group('the client estimate agrees with the contract it is attached to');
  {
    // Exhibit A and the agreement are one document to a client; a materials basis stated two
    // ways across the staple is the drift this repo records more often than anything else.
    const ce = noComments(fn('clientEstimateHtml'));
    has(ce, 'materialsBasisNote(e.pkgLabel)', 'the estimate Terms read the shared definition');
    has(ce, 'Fixed package', 'and its fee-table cell states the basis in two words');
    // ⚠ Again the needle, not the code: a bare '25%' matches the PAYMENT SCHEDULE (25% midpoint,
    // 25% final), which is correct and must stay. Pin the claim itself.
    lacks(ce, 'handling fee', 'with no handling-fee claim anywhere in it');
    lacks(ce, 'Cost + 25%', 'and no cost-plus basis on the materials row');
    has(ce, '25% Midpoint', 'while the payment schedule still states its own 25% stages');
  }
};
