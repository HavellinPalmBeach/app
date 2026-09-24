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

const AGR_FNS = ['_agrComplianceHeading', '_agrComplianceLead', '_agrApprover', '_agrTrustDeliverable', 'matterDef', 'matterTypeOf', 'invFiduciaryMode', 'marketingOptOutBlock', 'marketingUseParas', '_mktClause', 'estTolerancePctTxt', 'agreementHtml', 'probateAgreementHtml', 'agrBillingRates', 'materialsBasisNote',
                 'fmt', 'esc', 'paymentSplit', 'isDecedentJob', 'agrSection', '_agrHasPrepVendors',
                 'estimateDocScope', 'svcHasDocStep', 'docScopeDef', '_agrScopeServices',
                 '_agrMidpointTrigger', '_agrProbateCompliance', 'esignAnchor', 'estFixedFee', 'estPrepFeeOnTop',
                 'weArrangeAppraisals', 'docTierProduces', 'docTierOf', 'docTierDef'];
const AGR_VARS = ['AGR_NOT_AN_ACCOUNTING', 'MATTER_TYPES', 'EST_TOLERANCE_PCT', 'SMF_PCT', 'DECEDENT_SERVICES', 'agrApproved', 'HAVELLIN_OFFICE_PHONE',
                  'JOB_STEPS', 'DOC_SCOPES', 'ESIGN_ANCHORS', 'DOC_TIERS', 'DOC_TIER_FROM_SCOPE'];

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
// ⚠ read from the app rather than typed here, or this test pins a number the app can move.
const HAVELLIN_OFFICE_PHONE_LITERAL = (source().match(/var HAVELLIN_OFFICE_PHONE = '([^']+)'/) || [])[1];
const probateDoc = (job, e) => text(ctx().probateAgreementHtml(job, e));
const standardDoc = (job, e) => text(ctx().agreementHtml(job, e));

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ SECTION 5 FOLLOWS THE MATTER TYPE — it asserted a probate proceeding on every estate');
  {
    // ⚠ THIS GROUP EXISTS BECAUSE A REVERT CAME BACK GREEN. Step 7's own suite drives the
    // compliance CLAUSES as pure helpers, and nothing drove the RENDERED §5 — so removing the
    // trustee's authority warranty from §5.1 broke no check at all. The warranty is the client's
    // side of the stated-capacity point the 2026-09-18 signature-block fix made on ours, and §5.1
    // asked for it nowhere: rep 2 is conditional ("If acting as Personal Representative or
    // Executor…"), so on a trust matter it is never false, merely silent.
    const at = (m) => probateDoc(Object.assign({}, PROBATE, { svc: 'cleanout', matterType: m }), est());
    const trust = at('trust'), probate = at('probate'), both = at('both'),
          neither = at('neither'), blank = at('');

    has(trust, 'If acting as successor trustee, the Client has accepted the trusteeship',
        'a trust matter warrants the authority it actually holds');
    has(both, 'If acting as successor trustee', 'and so does a pour-over matter, which has both');
    lacks(probate, 'If acting as successor trustee', 'a probate matter does not');
    lacks(neither, 'If acting as successor trustee', 'nor a family distribution');
    lacks(blank, 'If acting as successor trustee', 'nor an unanswered one');
    has(trust, 'duly appointed by the probate court',
        '⚠ and the existing representation is ADDED TO rather than replaced, so no wording moves');

    // §5.3's authorisation table named a PR on forms that issue on matters with no PR.
    has(trust, 'Written trustee approval', '§5.3 names the trustee on a trust matter');
    has(trust, 'Written trustee approval + signed receipt from recipient', 'including the delivery row');
    lacks(trust, 'Written PR approval', 'and the PR appears in none of the five cells');
    has(both, 'Written PR / trustee approval', 'a pour-over matter names either');
    has(neither, 'Written Client approval', 'and a family distribution names the client');
    has(probate, 'Written PR approval', 'a probate matter is unchanged');

    // ⚠ THE NUMBERS NEVER MOVE. Removing or renumbering a subsection renumbers Termination and
    // everything under it against agreements already issued citing them — the constraint §7.1 and
    // §10 already answer to.
    [['trust', trust], ['probate', probate], ['both', both], ['neither', neither], ['blank', blank]]
      .forEach(([name, doc]) => {
        ['5.1 Client Representations', '5.3 Asset Disposition Authorization'].forEach((n) =>
          has(doc, n, name + ': ' + n + ' keeps its number'));
        has(doc, '5.2 ', name + ': and so does the compliance subsection');
      });
    // ⚠⚠ AN UNANSWERED MATTER IS THE PROBATE FORM, BYTE FOR BYTE — every agreement papered
    //    before the field existed.
    eq(blank, probate, 'an unanswered matter renders the whole agreement identically to an explicit probate one');
    // And the heading a trust matter actually signs under.
    has(trust, '5.2 Florida Trust Administration Support', 'the trust matter signs a trust compliance section');
    lacks(trust, 'Letters of Administration issuance', '⚠⚠ with no 60-day Letters deadline on a trust administration');
    // ⚠⚠ THIS ASSERTION FOUND TWO MORE, OUTSIDE §5.2, AND ONE OF THEM WAS AN AFFIRMATIVE
    // MISSTATEMENT. §7.1 said the photographs are taken "for condition documentation, asset
    // identification, the §733.604 inventory, appraisal support" — a PURPOSE, on a matter with
    // no such filing. The Project Records disclaimer named the same statute; that one was still
    // true on a trust matter, and a trustee told these are not a §733.604 inventory is entitled
    // to ask whether they are the accounting. Both name the instrument the matter actually has.
    lacks(trust, '733.604', 'and no probate inventory statute anywhere in it');
    has(trust, 'the trust&rsquo;s schedule of property, appraisal support',
        '§7.1 names what the photographs are actually for on a trust matter');
    has(trust, 'they are not a trust accounting under Fla. Stat. &sect;736.08135',
        'and the Project Records disclaimer names the instrument it is not');
    has(both, '733.604', 'a pour-over matter still names the probate filing …');
    has(both, '736.08135', '… and the accounting beside it, because it genuinely has both');
    has(probate, 'the &sect;733.604 inventory, appraisal support', 'a probate matter is unchanged');
  }
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
    const inv = noComments(fn('invoiceHtml', 'jobLogEntries'));
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

  // ───────────────────────────────────────────────────────────────────────────
  // ⚠⚠ THE PROBATE FORM PUT A SECOND PERSON'S NAME OVER THE DATE LINE. Its Havellin block ran a
  // two-column grid carrying Anthony's name and contact above the SIGNATURE line and Ashley's
  // above the DATE line, so the execution block read as Ashley signing the date — on a contract
  // the personal representative signs and a court may read. Only ONE person executes for the LLC,
  // and the envelope proves it: `esignSendEnvelope` builds exactly one Havellin recipient at
  // routing order 2 holding BOTH the havSig and havDate tabs.
  group('⚠⚠ THE HAVELLIN EXECUTION BLOCK NAMES ONE SIGNATORY, AND NOBODY OVER THE DATE LINE');
  {
    const full = probateDoc(PROBATE, est());
    const at = full.indexOf('Signature Page');
    // ⚠ BOUNDED AT 'For Office Use'. An unbounded slice runs on into the document FOOTER, which
    // legitimately carries the office line — so the no-phone check below read as failing over a
    // number that is correct where it sits. Measure the execution block, not the rest of the page.
    const end = full.indexOf('For Office Use');
    ok(at > 0 && end > at, 'the probate form has a signature page, and it ends where office use begins');
    const sig = full.slice(at, end);
    const count = (h, n) => h.split(n).length - 1;

    eq(count(sig, 'Anthony Graziano'), 1,
       '⚠⚠ exactly ONE Havellin signatory is named on the signature page');
    lacks(sig, 'Ashley Jerome',
          '⚠⚠ and it is NOT a second person — a name beside the date line reads as that person '
          + 'signing the date, which is the defect this closes');
    has(sig, 'Managing Member',
        '⚠ the signatory carries the authority that lets them bind the LLC, as the standard form '
        + 'has always printed');
    ok(!/\(\d{3}\)\s*\d{3}-\d{4}/.test(sig),
       '⚠ no phone number on the signature page — contact details are §1.1 Service Provider\'s '
       + 'job, stated once, where the phone reads the shared office constant');

    // ⚠ THE CONVERSE, AND IT IS WHY THIS GROUP IS NOT JUST A `lacks`. Removing a name from the
    // execution block must never be read as removing her from the contract: §1.1 names both as
    // the firm's contacts and is the one place that should.
    has(full, 'Anthony Graziano / Ashley Jerome',
        '⚠ §1.1 still names BOTH as Primary Contact — the signature block is about who executes, '
        + 'not about who the client calls');
    has(full, HAVELLIN_OFFICE_PHONE_LITERAL,
        '⚠ and §1.1 still carries the office line from the shared constant');
  }

  // ⚠ The standard form was already correct and must stay that way: its name sits UNDER the
  // signature line it belongs to, and the date column names nobody.
  group('the standard form was already right, and is unchanged');
  {
    const sig = standardDoc(LIVING, est());
    const seg = sig.slice(sig.indexOf('Acknowledgment'));
    eq(seg.split('Anthony Graziano').length - 1, 1, 'one Havellin signatory there too');
    lacks(seg, 'Ashley Jerome', 'and no second name in the block');
    has(seg, 'Managing Member', 'with the same authority stated');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ⚠⚠ THE ESTATE FORM PROMISED A PER-JOB NDA AND THE FIRM DOES NOT TAKE ONE (fixed 2026-09-20).
  // Anthony: *"we do not require NDAs for staff on all jobs. confidentiality is baked into our
  // 1099 employment agreements."* §7 said outright that Havellin would *"Require all team
  // members and contractors to sign a Non-Disclosure Agreement before accessing the property"* —
  // on the one form a personal representative signs, on the matters where the contents are most
  // sensitive, and the Job Plan's `nda_signed` checkbox was the operational half of it. Same
  // class as the 15% vendor fee clause, the *licensed* claim and the cost-plus materials line:
  // a document stating something the business does not do, found by reading the document.
  group('⚠⚠ neither agreement promises a per-job NDA, and the obligation is still stated');
  {
    const p = probateDoc(PROBATE, est());
    lacks(p, 'Non-Disclosure', '⚠⚠ the estate form no longer promises a per-job NDA, in any wording');
    lacks(p, 'before accessing the property', 'nor the per-job trigger that went with it');
    // ⚠ THE CONVERSE IS THE HALF THAT MATTERS, and deleting the bullet outright would have been
    // the opposite defect: the duty is REAL, it is simply STANDING rather than per-job. A
    // confidentiality section on an estate engagement that says nothing about the crew is worse
    // than one that overpromises, because the representative is reading it to find exactly that.
    has(p, 'confidentiality obligations',
        '⚠ the duty is still stated — standing, in the contractor agreement, not a per-job signature');
    has(p, 'before they work on any Havellin engagement',
        '…and it binds before anybody sets foot in the house, which is what the old bullet was for');
    has(p, 'strictly confidential', 'the rest of §7 is untouched');
    // The living-client form never made the promise — its §9 puts the duty on Havellin and says
    // it may disclose to "its personnel, contractors, and vendors who need it". It must not
    // acquire one by a later sweep trying to make the two forms match.
    lacks(standardDoc(LIVING, est()), 'Non-Disclosure',
          'the standard form never promised one, and does not gain one');
    // ⚠ AND NOTHING ANYWHERE ASKS A PERSON TO ATTEST THAT IT HAPPENED. The clause and the
    // checkbox have to move together or the app goes on collecting evidence for a promise the
    // contract no longer makes — or, worse, the reverse.
    lacks(noComments(src), 'NDA signed by every crew member',
          '⚠⚠ and the Job Plan box that attested to it is gone from live code');
  }

  group('⚠⚠ THE WRITTEN RECORD IS COVERED BY BOTH FORMS — it was covered by neither');
  {
    // ⚠⚠ EVERY CUSTODY, RETENTION AND NON-DISCLOSURE PROMISE IN THE TWO FORMS ATTACHED TO
    // "Documentation Media", A DEFINED TERM MEANING PHOTOGRAPHS AND VIDEO. Since the item
    // record went on to all six labour services (2026-09-21) both engagements produce a
    // WRITTEN document naming who took what, held seven years, and the clauses three lines
    // above did not reach it.
    const a = standardDoc(LIVING, est());
    const pr = probateDoc(PROBATE, est());

    [['the living-client form', a, 'Contractor', 'Section 10.2', 'Section 10.1a'],
     ['the estate form', pr, 'Havellin', 'Section 7.2', null]].forEach(function (r) {
      const [label, doc, us, mkt] = r;
      has(doc, 'Project Records', label + ' defines the written record');
      has(doc, 'the name of that recipient', '…and says the recipient is named in it');
      has(doc, 'retained for seven years', '…under the same seven-year retention as the images');
      has(doc, 'the amount received, any fees deducted, and the net amount',
          '…and states proceeds only where they were actually received');
      has(doc, 'What the Project Records are and are not',
          '⚠ ' + label + ' disclaims the record\'s evidentiary weight');
      has(doc, 'They are not an appraisal',
          '…starting with the one a tidy itemised list most invites');
      // ⚠ NEITHER FORM MAY LET THE MARKETING CLAUSE REACH IT. A client who does not tick the
      // opt-out is not thereby authorising publication of a list naming their daughter.
      has(doc, mkt + ' does not apply to them',
          '⚠⚠ ' + label + ' holds the record outside the marketing opt-out');
      has(doc, us + '&rsquo;s work product', 'and the obligated party is substituted, as everywhere else');
    });

    // ⚠ THE ASYMMETRIES ARE DELIBERATE AND EACH IS PINNED IN BOTH DIRECTIONS, or the next
    // sweep "harmonises" the two forms and takes a real distinction out with the difference.
    has(a, 'Recipient names',
        '⚠ only the living form lets a recipient go unnamed — a PR cannot suppress a beneficiary');
    has(a, 'recipient not be named', '…stated as an instruction the Client can actually give');
    lacks(pr, 'recipient not be named', '…and the estate form does not offer it');
    has(a, 'estate-planning record',
        'the living disclaimer points at tax, insurance and estate planning');
    lacks(a, '733.604',
          '⚠⚠ and never at a court schedule — there is no probate on a living-client job');
    has(pr, 'not the inventory required by Fla. Stat. &sect;733.604',
        '⚠ while the estate one disclaims exactly that');
    has(pr, 'satisfied a devise or bequest',
        '…and that a delivery recorded on it proves a bequest was satisfied');
    has(pr, 'any receipt obtained under Section 5.3',
        '⚠ the estate record cites the signed receipt §5.3 already requires');
    lacks(a, 'Section 5.3', '…which the living form has no counterpart to and must not cite');
    has(pr, 'to counsel of record',
        '⚠ only the estate form has an affirmative production duty');
    lacks(a, 'counsel of record', '…a living client\'s record is theirs and nobody else\'s');
    has(pr, 'not Client documents for the purposes of the return-or-destroy provision',
        '⚠⚠ and only the estate form carves itself out of §7\'s return-or-destroy bullet');
    has(pr, 'Destroy or return all Client documents',
        '…which is a live conflict rather than a hypothetical: the bullet is still there');

    // The heading had to grow on both, and §10\'s stopped being about photography.
    has(a, '10. Documentation and Records Authorization',
        '§10 is renamed — it carries a written record now, not only images');
    lacks(a, 'Photography Authorization', '…and the old heading is gone, not duplicated');
    has(a, '11.', '⚠ the rename renumbers nothing — §11 is still §11');
    has(pr, '7.1 Documentation Media and Project Records',
        '⚠ the estate form grows a heading and NO new number');
    lacks(pr, '7.3',
        '⚠⚠ a §7.3 would wedge marketing between the two custody clauses and renumber §8 onwards');
    has(pr, '7.2 Marketing', 'so §7.2 is where it was');
    has(pr, 'Section 8 &middot; Termination', 'and Termination is still §8, against agreements already issued');

    // ⚠ NOT A LAWYER, AND IT SAYS SO. Drafted here and unreviewed; it goes to counsel with
    // the rest of both forms before the first real engagement signs.
    ok(text(a).indexOf('Project Records') < text(a).indexOf('Marketing'),
       '⚠ the record clause is read BEFORE the opt-out box that excludes it');
  }
};
