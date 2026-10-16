'use strict';
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// Q62 (and Q21) · THE REFERRAL-FEE DISCLOSURE (Anthony, 2026-10-16, reading the rendered forms).
//
// "we will never charge the client a percentage, but we may have referral agreements with vendors like auction houses
// that will pay us a referral fee, which may itself be a % of the property sold" — and the estate form's §5.4 and the
// standard form's §8 both said Havellin took no percentage of the proceeds, which would be false the day such a fee is
// paid ("obviously we can't say we don't take a fee because that would be lying if we do"). He asked what disclosure is
// really required ("why am I obligated to … list every single vendor … even if it's a garbage hauler that pays me 20
// bucks"): one general sentence in both forms, a note on the client estimate's selling-vendor rows (by type: the
// estimate names no firm), and the firm named on the close-out record of sales off a directory tick. Never a schedule.
// Driven on the real builders; the directory is a fixture the helpers read by name.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

const { sandbox, source, fn, domStub } = require('./harness');
const DOCREC = require('./document-reconciliation.test.js');

const SRC = source();
const noComments = (t) => String(t).split('\n').filter((l) => { const s = l.trim(); return !(s.startsWith('//') || s.startsWith('*') || s.startsWith('/*')); }).join('\n');
const LIVE = noComments(SRC);
const text = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&rsquo;|’/g, '’').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ');
const inEastern = (body) => { const prev = process.env.TZ; process.env.TZ = 'America/New_York'; try { return body(); } finally { process.env.TZ = prev; } };

const FNS = DOCREC.FNS.concat(['agrReferralFeeTxt', 'vendorPaysReferral', 'referralFeeVendorsNote', '_vendorByName', '_vendorNameKey', '_andJoin',
  'estateAuthority', 'jobOnProbateTrack', 'trustInstrumentTitle', '_agrTrusteeRepresentation', 'esignAnchorsPresent', '_ceGroupedSpaces', 'esignCoSignerAnchors']);
const VARS = DOCREC.VARS.concat(['PROCEEDS_PAID_VENDOR_TYPES', 'CE_REFERRAL_NOTE', 'CE_REFERRAL_SHORT', 'ESIGN_REQUIRED_ANCHORS', 'AGR_NOT_AN_ACCOUNTING', 'ESIGN_COSIGNER_ANCHOR']);

module.exports = function ({ group, ok, eq, has, lacks }) {
  let _ctx = null;
  const ctx = (job, dir) => {
    if (!_ctx) _ctx = sandbox({ fns: FNS, vars: VARS, stubs: { document: domStub({}) } });
    Object.assign(_ctx, { jobs: job ? [job] : [], jobLogs: {}, estimateStore: {}, changeOrders: [], contractors: [], currentEstimate: null,
      currentInvStage: 'final', vendorDirectory: dir || [], jobPlans: {}, _photoRefs: {} });
    return _ctx;
  };
  const EST = (o) => Object.assign({ jobId: 1, svc: 'probate', totTC: 40, totPS: 80, tcRate: 150, psRate: 100, tcFee: 6000, psFee: 8000, pkgCost: 0,
    havellinTotal: 14000, discountPct: 0, discountAmt: 0, prem: false, fixedPrice: false, rush: false, rushExPrepFee: true, vendors: [], collections: [],
    rooms: [], vehicles: [], prepItems: [], preparedBy: 'Anthony Graziano', docScope: 'full' }, o || {});
  const ESTATE = { id: 1, hvlId: 'HVL-0001', name: 'Harold Pemberton', svc: 'probate', matterType: 'probate', addr: '1 Ocean Blvd', city: 'Manalapan', zip: '33462',
    executor: 'Catherine Hale', executorRole: 'Personal Representative', executorEmail: 'c@example.com', status: 'won', payments: [] };
  const LIVING = { id: 2, hvlId: 'HVL-0002', name: 'Margaret Whitfield', svc: 'downsizing_move', addr: '240 Via Bellaria', city: 'Palm Beach', zip: '33480',
    email: 'm@example.com', status: 'won', payments: [] };
  const DIR = [{ vendor_name: 'Palm Beach Auctions', category_group: 'Asset Liquidation & Valuation', category: 'Auction House', status: 'Active', referral_fee: 'Yes' },
               { vendor_name: 'Coastal Estate Sales', category_group: 'Asset Liquidation & Valuation', category: 'Estate Sale Company', status: 'Active', referral_fee: 'No' },
               { vendor_name: 'Hauler Co', category_group: 'Disposal & Waste Management', category: 'Junk Removal / Hauling', status: 'Active' }];

  group('the one text, in both forms, and no form says it takes no percentage');
  {
    const c = ctx(ESTATE);
    const t = c.agrReferralFeeTxt('Havellin');
    has(t, 'Havellin may receive a referral fee from a vendor it recommends.', 'the sentence that would otherwise be a lie');
    has(t, 'paid by the vendor out of the vendor’s own commission or charges', 'who pays it');
    has(t, 'never deducted from the Client’s proceeds, never added to the vendor’s invoice and never taken on a firearm', 'what it never is');
    has(t, 'The Client may engage any vendor of the Client’s choosing.', 'the client is free to choose');
    has(t, 'the Estimate says so on that vendor’s line and the close-out record of sales names the vendor', 'where the selling vendors are named');
    eq(c.agrReferralFeeTxt('Contractor').indexOf('Contractor may receive'), 0, 'the standard form’s party');
    lacks(t, 'schedule', 'never a schedule of vendors');

    const estate = text(inEastern(() => ctx(ESTATE).probateAgreementHtml(ESTATE, EST())));
    has(estate, '5.4 No Purchase by Havellin; Referral Fees', 'the estate form’s §5.4 heading');
    has(estate, 'will take no part of the proceeds of any sale of that property.', 'the no-purchase clause, restated: no part of the proceeds');
    has(estate, 'Havellin may receive a referral fee from a vendor it recommends.', 'followed by the disclosure');
    lacks(estate, 'no commission, percentage or other share', '⚠⚠ the sentence that would be false is gone');
    ok(estate.indexOf('will take no part of the proceeds') < estate.indexOf('Havellin may receive a referral fee') && estate.indexOf('Havellin may receive a referral fee') < estate.indexOf('Section 6'),
       'inside §5.4, before Section 6, so nothing renumbers');
    eq(c.AGR_NO_PURCHASE.indexOf('no part of the proceeds') > 0 && c.AGR_NO_PURCHASE.indexOf('percentage') < 0, true, 'the constant itself');

    const std = text(inEastern(() => ctx(LIVING).agreementHtml(LIVING, EST({ jobId: 2, svc: 'downsizing_move', docScope: 'none' }))));
    has(std, 'Contractor takes no part of the Client\'s sale proceeds.', 'the standard form’s §8 sentence');
    has(std, 'Contractor may receive a referral fee from a vendor it recommends.', 'and its disclosure, in its own party’s name');
    lacks(std, 'does not take a percentage of auction or sale proceeds', '⚠⚠ the old §8 sentence is gone');
    lacks(std, 'Havellin may receive a referral fee', 'and the estate form’s party never leaks into it');
    ok(std.indexOf('8. Valuation, Sales, and No Guarantee of Prices') < std.indexOf('Contractor may receive a referral fee'), 'inside §8');
  }

  group('the client estimate: the note on the rows that sell the client’s property, and on no other');
  {
    const e = EST({ vendors: [{ type: 'Auction House', cost: 0, lid: 'a' }, { type: 'Estate Sale Company', cost: 0, lid: 'b' }, { type: 'Online Auction House', cost: 0, lid: 'c' },
                                { type: 'Junk Removal / Hauling', cost: 800, lid: 'd' }, { type: 'Appraiser(s)', cost: 0, lid: 'e' }] });
    const h = inEastern(() => ctx(ESTATE).clientEstimateHtml(e, ESTATE));
    const t = text(h);
    eq((h.match(/Havellin may receive a referral fee from this vendor/g) || []).length, 3, 'three selling rows, three notes');
    has(t, 'Auction House Havellin may receive a referral fee from this vendor, paid out of the vendor’s own commission and never from your proceeds.', 'under the auction house');
    has(t, 'Online Auction House Havellin may receive a referral fee', 'the online auction house');
    has(t, 'Estate Sale Company Havellin may receive a referral fee', 'the estate sale company');
    lacks(t, 'Junk Removal / Hauling Havellin may receive', '⚠ never on the hauler (the $20 a garbage hauler pays is the general sentence’s)');
    lacks(t, 'Appraiser(s) Havellin may receive', 'nor on the appraiser');
    has(t, 'Appraiser(s) Quote to follow', 'whose blank cost still reads Quote to follow');
    eq(ctx().PROCEEDS_PAID_VENDOR_TYPES, ['Auction House', 'Online Auction House', 'Estate Sale Company'], 'the one list of proceeds-paid types');
    const clean = inEastern(() => ctx(ESTATE).clientEstimateHtml(EST({ vendors: [{ type: 'Junk Removal / Hauling', cost: 800, lid: 'd' }] }), ESTATE));
    lacks(clean, 'referral fee from this vendor', 'an estimate with no selling vendor carries no note');
  }

  group('the directory tick and the close-out records that read it');
  {
    const c = ctx(ESTATE, DIR);
    eq(c.vendorPaysReferral(DIR[0]), true, 'Yes is the tick');
    eq(c.vendorPaysReferral(DIR[1]), false, 'No is not');
    eq(c.vendorPaysReferral(DIR[2]), false, 'nor a blank');
    eq(c.vendorPaysReferral({ referral_fee: ' yes ' }), true, 'trimmed, case aside');
    eq(c.vendorPaysReferral(null), false, 'nobody');
    const rows = [{ channel: 'palm beach auctions' }, { channel: 'Palm Beach Auctions ' }, { channel: 'Coastal Estate Sales' }, { channel: 'Somebody Unknown' }, { channel: '' }, {}];
    eq(c.referralFeeVendorsNote(ESTATE, rows), 'Palm Beach Auctions pays Havellin a referral fee out of its own commission; no figure here is reduced by it. ',
       '⚠ the ticked vendor once, by the directory’s own name; the No vendor, the unknown name and the blanks say nothing');
    eq(c.referralFeeVendorsNote(ESTATE, [{ channel: 'Coastal Estate Sales' }]), '', 'a vendor ticked No: nothing (the record never claims no fee was paid)');
    eq(c.referralFeeVendorsNote(ESTATE, []), '', 'no rows: nothing');
    c.vendorDirectory.push({ vendor_name: 'Bid & Co', category: 'Online Auction House', status: 'Active', referral_fee: 'Yes' });
    eq(c.referralFeeVendorsNote(ESTATE, [{ channel: 'Palm Beach Auctions' }, { channel: 'Bid & Co' }]),
       'Palm Beach Auctions and Bid &amp; Co pay Havellin a referral fee out of their own commission; no figure here is reduced by it. ', 'two, joined and escaped');
    has(fn('printDispositionLedger'), 'referralFeeVendorsNote(job, L.rows)', 'the Disposition Ledger prints it in its footer');
    has(fn('printContentsRecord'), 'referralFeeVendorsNote(job, rec.items)', 'and the Contents Record in its');
    has(fn('vendorCardHtml'), "['Referral fee', v.referral_fee]", 'the vendor card shows the tick');
    has(SRC, "'v-reffee':'referral_fee'", 'the form writes it');
    has(SRC, '<select id="v-reffee">', 'through its own select');
    const form = SRC.slice(SRC.indexOf('<select id="v-reffee">'), SRC.indexOf('</select>', SRC.indexOf('<select id="v-reffee">')));
    eq((form.match(/<option value="(Yes|No|)"/g) || []).length, 3, 'Not recorded, Yes, No: nothing else');
  }

  group('the request the fiduciary signs, and the estimate’s commission sentences');
  {
    has(fn('printApprovalRequest'), 'and take no part of the proceeds of its sale; a referral fee a selling vendor pays Havellin out of its own commission is disclosed in the agreement.',
        'the request’s staff rule no longer says "no share"');
    eq((LIVE.match(/take no share of the proceeds of its sale/g) || []).length, 0, '⚠⚠ nothing a client reads says "no share of the proceeds of its sale" any more');
    has(fn('collectionsDispositionNote'), "less any fees the partner charges.' + CE_REFERRAL_SHORT", 'the estimate’s disposal sentence carries the short form');
    has(SRC, "less whatever fee that partner charges.' + CE_REFERRAL_SHORT", 'and the email’s');
    eq(ctx().CE_REFERRAL_SHORT, ' Where that partner pays Havellin a referral fee, it comes out of the partner’s fee, not your proceeds.', 'the short form');
  }
};
