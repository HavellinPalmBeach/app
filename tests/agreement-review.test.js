'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// THE FULL LEGAL REVIEW OF BOTH AGREEMENT FORMS AND EXHIBIT A (2026-11-07; Anthony: "a full legal review of all of this",
// and he took "Fix all as proposed"; counsel bundle A22). An independent read found about thirty points: Havellin reading as
// the fiduciary or as counsel, contradictions between clauses and with Exhibit A, terms used and never defined, a vendor
// indemnity that reached Havellin's own bookings, and promises the business cannot keep. This file holds the rules the
// review made, each to the live code: the capacity the Client signs in, the one definition of the midpoint, and the words
// the forms and Exhibit A may no longer say.
// ─────────────────────────────────────────────────────────────────────────────
const { sandbox, source, fn } = require('./harness');

const SRC = source();
// Live text only: comment lines stripped, so a needle never matches the comment that explains the fix.
const LIVE = SRC.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
const live = (name) => fn(name).split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
const count = (h, n) => String(h).split(n).length - 1;
function attempt(f) { try { return { ok: true, val: f() }; } catch (e) { return { ok: false, err: String(e && e.message || e) }; } }

const MID = 'the earliest of the halfway point of the working days planned in Exhibit A, half of the work in scope complete, or every room in scope sorted and documented';

module.exports = function ({ group, ok, eq, has, lacks }) {
  ok(LIVE.length > SRC.length * 0.5, 'fixture: the stripped source is most of the file (' + LIVE.length + ' of ' + SRC.length + ')');

  group('the Client signs in a capacity, never individually (§733.619): §1.2 defines it and the signature block repeats it');
  {
    const S = attempt(() => sandbox({ fns: ['_agrSignsAsTxt', '_agrApprover', 'matterDef', 'matterTypeOf', 'invFiduciaryMode', 'isDecedentJob'], vars: ['MATTER_TYPES', 'DECEDENT_SERVICES'] }));
    ok(S.ok, 'the namer lifts (' + (S.err || '') + ')');
    const say = (mt, defn) => { const r = attempt(() => S.val._agrSignsAsTxt({ svc: 'probate', matterType: mt }, mt === 'trust' ? 'The Doe Trust' : 'the Estate of Jane Doe', defn)); return r.ok ? r.val : r.err; };
    has(say('probate', true), 'acting as Personal Representative of the Estate of Jane Doe and not individually', 'probate: §1.2 states the capacity');
    has(say('probate', true), '&ldquo;Client&rdquo; in this Agreement means the Authorized Representative in that capacity', '…and defines the Client by it');
    eq(say('probate', false), 'Signing as Personal Representative of the Estate of Jane Doe, and not individually.', 'and the signature block says the same');
    eq(say('trust', false), 'Signing as Successor Trustee of The Doe Trust, and not individually.', 'a trust: the trustee\'s capacity, the trust named');
    lacks(say('neither', true), 'not individually', 'neither (no court, no trust): no representative capacity is claimed');
    const body = live('probateAgreementHtml');
    eq(count(body, '_agrSignsAsTxt('), 2, '⚠ the form asks it twice: §1.2 and under the signature');
    lacks(body, "dRow('Date','_______________________________________________');", '§1.2\'s meaningless Date row is gone');
  }

  group('the midpoint is one definition: the estate form\'s §3.3, the standard form\'s §3.2 and Exhibit A');
  {
    const S = attempt(() => sandbox({ fns: ['_agrMidpointTrigger'] }));
    ['full', 'capture', 'none'].forEach((sc) => eq(S.ok ? S.val._agrMidpointTrigger(sc) : S.err, 'Due at the project midpoint: ' + MID, sc + ': the estate form defines it'));
    eq(count(live('agreementHtml'), 'Due at the project midpoint: ' + MID), 1, 'the standard form\'s payment row reads the same words');
    has(live('clientEstimateHtml'), 'Due at the project midpoint: halfway through the planned working days, half the work done, or every room sorted, whichever comes first',
        'Exhibit A says it in the client\'s words');
    lacks(LIVE, 'approximately 50% of scope is complete', '⚠ never "Contractor\'s determination that approximately 50%"');
    lacks(LIVE, 'Asset Inventory stage', '⚠ never a stage that does not exist');
    has(live('probateAgreementHtml'), 'is earned once the project midpoint defined in that schedule is reached', '§8.1\'s 75% points at that definition');
  }

  group('Havellin never reads as the fiduciary, counsel, an appraiser or a licensee');
  {
    [
      ['We settle the estate', 'Exhibit A never says Havellin settles the estate'],
      ['documentation standards probate requires', 'nor that probate sets photograph standards'],
      ['family distribution and documented handoff', '§2 never has Havellin distributing to beneficiaries'],
      ['Florida Probate Compliance', '§5.2 is never a compliance service'],
      ['support — but not replace —', 'nor its lead'],
      ['documented asset inventory suitable for use in the court-required filing', '§5.2 prepares the Court Inventory for the PR to adopt'],
      ['The verified inventory is prepared', 'Exhibit A never prepares the PR\'s verified inventory'],
      ['to take the following actions on behalf of', '§5.3: at the direction of, never on behalf of'],
      ['Letters of Administration or Testamentary', 'Florida issues Letters of Administration only'],
      ['requiring additional appraisal', '§4.1 never assumes appraisals are in scope'],
      ['not a licensed appraiser', 'the standard form never implies Florida licenses personal-property appraisers'],
      ['Contractor represents that it maintains', 'the standard form never represents coverage not yet bound'],
      ['requires every vendor it books', 'Havellin asks for a vendor\'s certificate: the app flags, never blocks'],
      ['never deducted from the Client', 'the referral fee is paid from the vendor\'s own revenue'],
      ['never from your proceeds', '…on the estimate too'],
      ['scheduled and supervised by us', 'Exhibit A never says Havellin supervises the vendors'],
      ['does not leave this property unattended', 'nor promises a valuable is never unattended'],
      ['we are on site when they are', 'nor that Havellin is on site whenever a vendor is'],
      ['Sensitive documents are shredded', 'papers are returned, never shredded unasked'],
      ['receipted for your tax records', 'never implies a tax deduction'],
      ['Donation receipts, for your tax records', '…on the records list either'],
      ['flagged for your attention', 'exempt property is what the client or counsel identifies'],
      ['and materials used', 'materials are a fixed package, never "materials used"'],
      ['selected or approved by the Client, except to the extent', '§6.4\'s indemnity never reaches a vendor Havellin booked'],
      ['vendors selected or approved by Client', '…nor the standard form\'s §11.6(c)'],
      ['suspend work on any engagement', 'late payment suspends this engagement only'],
      ['binding instructions on behalf of all heirs', 'the standard form never binds non-parties'],
      ['qualified subcontractors', '§10: Havellin\'s own team members and contractors, vendors left to §6.4'],
    ].forEach(([n, why]) => eq(count(LIVE, n), 0, '⚠ ' + why + ' (' + n + ')'));
    has(live('probateAgreementHtml'), 'Douglas Elliman and would earn a commission on any listing', '§2.1 discloses the brokerage tie');
    has(live('probateAgreementHtml'), 'this engagement is not conditioned on it', '…and that the engagement is not conditioned on it');
    has(live('probateAgreementHtml'), 'Havellin never receives or holds the proceeds of a sale', '§5.4: Havellin never holds proceeds');
    has(live('probateAgreementHtml'), "['Release a firearm'", '§5.3 carries a firearm\'s row');
    has(live('probateAgreementHtml'), "['Notices',", '§10 has notices');
    has(live('probateAgreementHtml'), "['Counterparts; Electronic Signatures',", '…and electronic signatures');
    has(live('probateAgreementHtml'), 'technology providers (cloud storage, and software, including artificial intelligence', '§7 names the technology providers, AI included');
    has(live('probateAgreementHtml'), '(these photographs, the &ldquo;Documentation Media&rdquo;)', '§7.1 defines the Documentation Media');
    has(live('probateAgreementHtml'), 'Section 7.2 does not apply to the written record', '…and keeps §7.2 off the written record');
    has(live('agreementHtml'), '(&ldquo;Contractor&rdquo; or &ldquo;Havellin&rdquo;)', 'the standard form defines Contractor');
    has(live('agreementHtml'), '(the &ldquo;Effective Date&rdquo;)', '…and the Effective Date');
    has(live('agrVendorCoiTxt'), ' tells ', 'the certificate sentence says the client is told of a vendor without one');
  }
};
