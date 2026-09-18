'use strict';
// Office line vs personal cell, on vendors and referral partners (2026-09-18).
//
// Anthony: "they'll be an email for say southflorida@navismoving.com and then we'll get
// the owner Andy's email and he's andy@navismoving.com … office phone number, office
// email, and then two contacts per vendor with cell phone and personal email fields."
//
// ⚠⚠ THE DEFECT THIS CLOSES IS NOT "A MISSING FIELD", IT IS A NUMBER PRESENTED AS
// SOMEBODY'S WHEN IT IS NOT. Measured on the 79-row partner seed before anything was
// built: 32 rows carry phone_type 'Main', i.e. the firm's switchboard sitting in the one
// phone field, which the card renders under that person's name and the Call button
// dials. 13 partners share 5 numbers between them. Same shape as the 2026-09-09 defect
// that printed the Havellin office line as a concierge's personal mobile.
//
// A vendor is a FIRM with people inside it, so it gets two contact slots. A partner is a
// PERSON at a firm — four partners at Comiter are already four rows — so it gets the
// firm's line, an extension, a cell and the assistant instead. Copying the vendor shape
// across would have been the wrong model, and half this file exists to pin that.

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { sandbox, source, domStub } = require('./harness');

const SRC = source();
const QUO = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'quo-sync.gs'), 'utf8');
const RPB = fs.readFileSync(path.join(__dirname, '..', 'referral-partners-backend.gs'), 'utf8');

// The vendor add/edit form's grid, markup only.
function vformBlock() {
  const start = SRC.indexOf('<div class="vform">');
  const end = SRC.indexOf('<div class="divider"></div>', start);
  return SRC.slice(start, end);
}
// The referral add/edit form, markup only.
function rformBlock() {
  const start = SRC.indexOf('<div id="add-referral-card"');
  const end = SRC.indexOf('<!-- QUICK EDIT — field path, mirrors the vendor card', start);
  return SRC.slice(start, end);
}
function mapKeys(name) {
  const m = SRC.match(new RegExp('var ' + name + ' = \\{[\\s\\S]*?\\n\\};'));
  if (!m) return null;
  const out = {};
  for (const hit of m[0].matchAll(/'([\w-]+)'\s*:\s*'([\w]+)'/g)) out[hit[1]] = hit[2];
  return out;
}

const VENDOR_CARD_STUBS = {
  vendorFitSelect: () => '<fit>', vendorStatusSelect: () => '<status>',
  vendorRatingCompact: () => '<rating>', vendorFit: () => '', VENDOR_FIT: {},
};
function vendorCtx() {
  return sandbox({
    fns: ['vendorCardHtml', 'vendorContacts', '_vendorContact', 'vendorIdOf', 'fmtPhoneDisplay',
          '_vendorWebUrl', '_vLine', 'vendorCats', 'fmtVendorDate', 'isVendorPhoneKey',
          'vendorSearchBlob', 'vendorMatchesQuery'],
    vars: ['VENDOR_CONTACT_SLOTS'],
    stubs: VENDOR_CARD_STUBS,
  });
}

// Anthony's own example, end to end.
const NAVIS = {
  _row: 7, vendor_name: 'Navis Moving', category: 'Mover', category_group: 'Moving & Logistics',
  status: 'Active', uid: 'u-navis',
  phone: '5615550100', email: 'southflorida@navismoving.com', website: 'navismoving.com',
  contact_first: 'Andy', contact_last: 'Ramirez', contact_title: 'Owner',
  contact_mobile: '5615550111', contact_email: 'andy@navismoving.com',
  contact2_first: 'Dave', contact2_last: 'Chen', contact2_title: 'Dispatch',
  contact2_mobile: '5615550122', contact2_email: '',
};

module.exports = function ({ group, ok, eq, has, lacks }) {

  // ───────────────────────────────────────────────────────────────────────────
  group('a vendor is a firm: the office line is the firm’s, a contact slot is a person');
  {
    const ctx = vendorCtx();
    const cs = ctx.vendorContacts(NAVIS);
    eq(cs.length, 2, 'two people on one row');
    eq(cs[0].name, 'Andy Ramirez', 'slot 1 keeps the original contact_first / contact_last keys');
    eq(cs[0].title, 'Owner', 'and carries their title');
    eq(cs[0].mobile, '5615550111', 'their own number, not the firm’s');
    eq(cs[0].email, 'andy@navismoving.com', "Anthony's example: the owner's own address");
    eq(cs[1].name, 'Dave Chen', 'slot 2 is contact2_*');
    eq(cs[1].email, '', 'a slot with no address reads empty rather than inheriting the firm’s');

    // ⚠ THE FIRM'S OWN FIELDS ARE NEVER READ AS A PERSON'S. This is the whole point:
    // southflorida@navismoving.com belongs to the company and must never be offered as
    // the way to reach a named individual.
    cs.forEach((c) => {
      ok(c.email !== NAVIS.email, 'no contact inherits the general inbox');
      ok(c.mobile !== NAVIS.phone, 'no contact inherits the office line');
    });
  }

  group('a half-typed slot still counts, and an empty one is not a person');
  {
    const ctx = vendorCtx();
    // ⚠ A CARD HANDED OVER IN A DRIVEWAY AND HALF-TYPED. Requiring the name would throw
    // away the only thing on the slot worth having.
    eq(ctx.vendorContacts({ contact_mobile: '5615550111' }).length, 1,
       'a number with no name is still somebody you can reach');
    eq(ctx.vendorContacts({ contact_email: 'a@b.com' }).length, 1, 'so is an address alone');
    eq(ctx.vendorContacts({ contact_title: 'Owner' }).length, 0,
       '⚠ but a title ALONE is not a person — no name, no number, no address is nothing to reach');
    eq(ctx.vendorContacts({ vendor_name: 'X' }).length, 0, 'an empty slot is not a person');
    eq(ctx.vendorContacts({}).length, 0, 'a bare row does not throw');
    eq(ctx.vendorContacts(null).length, 0, 'nor does no row at all');
    eq(ctx.vendorContacts({ contact2_mobile: '5615550122' }).map((c) => c.slot), [2],
       'slot 2 filled alone keeps its own slot number rather than sliding into slot 1');
  }

  group('_vendorContact still answers exactly what it used to');
  {
    const ctx = vendorCtx();
    // Six readers depend on this (the appraiser picker, the job-plan reference line and
    // three sourcing writers), so the rewrite had to be behaviour-preserving.
    eq(ctx._vendorContact({ contact_first: 'Andy', contact_last: 'Ramirez' }), 'Andy Ramirez',
       'the split fields');
    eq(ctx._vendorContact({ primary_contact: 'Legacy Person' }), 'Legacy Person',
       'the retired column still rescues a row that never migrated');
    eq(ctx._vendorContact({ vendor_name: 'X' }), '', 'no contact is still empty, not a firm name');
    eq(ctx._vendorContact(null), '', 'null does not throw');
    // ⚠ THE LEGACY FALLBACK IS SLOT 1 ONLY. primary_contact never described a second
    // person, so reading it into slot 2 would invent one.
    eq(ctx.vendorContacts({ primary_contact: 'Legacy Person' }).map((c) => c.slot), [1],
       'the retired column lands in slot 1 and nowhere else');
    eq(ctx._vendorContact({ contact2_first: 'Only', contact2_last: 'Second' }), 'Only Second',
       'a row with only a second contact names them rather than going silent');
  }

  group('every phone key is derived from the slots, never listed');
  {
    const ctx = vendorCtx();
    ok(ctx.isVendorPhoneKey('phone'), 'the office line');
    ok(ctx.isVendorPhoneKey('contact_mobile'), 'slot 1’s mobile');
    ok(ctx.isVendorPhoneKey('contact2_mobile'), 'slot 2’s mobile');
    ok(!ctx.isVendorPhoneKey('contact_email'), 'an address is not a number');
    ok(!ctx.isVendorPhoneKey('vendor_name'), 'nor is a name');
    // ⚠ WHY IT IS DERIVED: the quick card prefills every number FORMATTED and compares it
    // digit-wise. A mobile added to the slots and missed here would compare "(561)
    // 555-0111" against "5615550111", read as an edit on every save, and write the
    // formatted string back over the stored digits.
    ctx.VENDOR_CONTACT_SLOTS.forEach((s) => {
      ok(ctx.isVendorPhoneKey(s.mobile), s.mobile + ' is covered because the slots say so');
    });
  }

  group('the vendor card: the office row carries no name, each person gets their own');
  {
    const html = vendorCtx().vendorCardHtml(NAVIS);
    // ⚠ THE LOAD-BEARING ASSERTION. The office row used to OPEN with the contact's name,
    // which is a switchboard presented as that person's direct line.
    const officeRow = html.slice(html.indexOf('tel:5615550100') - 400, html.indexOf('tel:5615550100') + 300);
    lacks(officeRow, 'Andy', 'the office number is not rendered under a person’s name');
    has(html, '>office</span>', 'and says outright which line it is');
    has(html, 'tel:5615550111', 'Andy’s own mobile is on the card');
    has(html, 'mailto:andy@navismoving.com', 'and his own address');
    has(html, 'tel:5615550122', 'so is the second contact’s');
    has(html, '>mobile</span>', 'each personal number says what it is');

    // The tap strip is the thumb-sized path used standing outside a house.
    has(html, '☎ Office', 'the office line is labelled on the tap strip');
    has(html, '☎ Andy', 'and each person by name, so you never guess which number it dials');
    has(html, '✉ Text Andy', 'texting is offered on the mobile');
    has(html, '☎ Dave', 'the second contact gets their own row');
    // ⚠ NO TEXT BUTTON ON THE OFFICE LINE. A switchboard does not receive SMS, and the
    // "where are you?" that button exists for is a message to a person.
    const officeTap = html.slice(html.indexOf('☎ Office') - 200, html.indexOf('☎ Office') + 260);
    lacks(officeTap, 'sms:5615550100', 'the switchboard is never offered a Text button');
  }

  group('a vendor with nothing but an office line renders exactly as it always did');
  {
    // The 152 live rows on the day this shipped. A field addition that changed how they
    // read would be a migration, not an addition.
    const html = vendorCtx().vendorCardHtml({
      _row: 3, vendor_name: 'Junk Kings', category: 'Junk Removal / Hauling',
      phone: '5615559999', email: 'info@junkkings.com',
      contact_first: 'Pat', contact_last: 'Moore',
    });
    has(html, 'tel:5615559999', 'the office line still dials');
    has(html, '☎ Office', 'and still has its thumb target');
    lacks(html, '>mobile</span>', 'no mobile row is invented');
    lacks(html, '✉ Text', 'and nothing offers to text a landline');
  }

  group('a number with no name says so rather than floating free');
  {
    const html = vendorCtx().vendorCardHtml({
      _row: 4, vendor_name: 'Sparkle Cleaning', phone: '5615558888',
      contact_mobile: '5615557777',
    });
    has(html, 'name not recorded', 'the half-typed slot names its own gap');
    has(html, 'tel:5615557777', 'and the number is still reachable');
    has(html, '☎ Mobile', 'the tap strip falls back to a generic label rather than a blank one');
  }

  group('⚠ every contact field is searchable, or it reads as one that did not save');
  {
    const ctx = vendorCtx();
    const hit = (q) => ctx.vendorMatchesQuery(NAVIS, q);
    ok(hit('andy'), 'by the contact’s first name');
    ok(hit('ramirez'), 'by their last');
    ok(hit('owner'), 'by their title');
    ok(hit('andy@navismoving.com'), 'by their own address');
    ok(hit('5615550111'), "by their mobile's digits — the field Anthony asked for");
    ok(hit('5615550122'), 'and the second contact’s');
    ok(hit('5615550100'), 'the office line still matches, as it always did');
    ok(hit('dave chen'), 'multi-word terms are AND-ed across the contact fields');
    ok(!hit('5615559999'), 'a number this vendor does not hold does not match');
    // ⚠ READ THROUGH THE SHARED DEFINITION. A blob listing the fields by hand is how a
    // column gets added to the form and silently left out of search.
    has(SRC, 'vendorContacts(v).forEach', 'the blob reads the slots rather than naming fields');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ the quick card, driven: open it, save it, and see what actually gets written');
  {
    // THE JOIN, and it is here because both halves of it came back GREEN on the first
    // revert sweep. isVendorPhoneKey was tested on its own and the map contents were
    // tested on their own, and NOTHING drove quickEditVendor → the form → the patch. So
    // breaking the prefill, and breaking the digit-wise comparison, each changed nothing
    // any check could see — on the surface Anthony described using ("we get the owner
    // Andy's email"), which is the whole reason these fields exist.
    const doc = domStub({});
    let patch = null;
    const ctx = sandbox({
      fns: ['quickEditVendor', 'saveVendorQuickEdit', '_setV', '_getV', 'lookupVendorById',
            'vendorIdOf', 'fmtPhoneDisplay', 'isVendorPhoneKey'],
      vars: ['VENDOR_QUICK_MAP', 'VENDOR_CONTACT_SLOTS'],
      stubs: {
        document: doc, showSyncBadge() {}, closeVendorQuickEdit() {},
        _quickWriteVendor(id, p) { patch = p; },
      },
    });
    // Stored the way a bulk import leaves them: raw digits.
    ctx.vendorDirectory = [Object.assign({}, NAVIS)];
    const val = (id) => doc.getElementById(id).value;

    ctx.quickEditVendor('7');
    // ⚠ EVERY NUMBER SHOWS FORMATTED, not just the office line. A contact mobile reading
    // "5615550111" on the one card a concierge edits in the field is the inconsistency
    // the original comment on this function exists to prevent.
    eq(val('vq-phone'), '(561) 555-0100', 'the office line prefills formatted');
    eq(val('vq-contact-mobile'), '(561) 555-0111', "and so does the contact's mobile");
    eq(val('vq-contact2-mobile'), '(561) 555-0122', 'and the second contact’s');
    eq(val('vq-contact-email'), 'andy@navismoving.com', 'their own address is loaded');
    eq(val('vq-contact-title'), 'Owner', 'and their title');
    eq(val('vq-contact2-first'), 'Dave', 'the second slot loads too');

    // ⚠⚠ OPEN IT AND SAVE IT WITHOUT TOUCHING ANYTHING: NOTHING MAY BE WRITTEN. With the
    // numbers prefilled formatted and compared as strings, every such save posts
    // "(561) 555-0111" over the stored digits and bumps updated_at on the CRM-sync
    // columns for an edit that changed nothing.
    patch = null;
    ctx.saveVendorQuickEdit();
    eq(patch, null, 'opening and closing the quick card writes nothing at all');

    // A real edit writes only what changed.
    ctx.quickEditVendor('7');
    doc.getElementById('vq-contact-email').value = 'andy.r@navismoving.com';
    patch = null;
    ctx.saveVendorQuickEdit();
    eq(patch, { contact_email: 'andy.r@navismoving.com' },
       "Anthony's case end to end: the owner's own address, and nothing else touched");

    // Re-typing the same number a different way is not an edit either.
    ctx.quickEditVendor('7');
    doc.getElementById('vq-contact-mobile').value = '561-555-0111';
    patch = null;
    ctx.saveVendorQuickEdit();
    eq(patch, null, 'the same number punctuated differently is still the same number');

    // And a genuinely new mobile does get through.
    ctx.quickEditVendor('7');
    doc.getElementById('vq-contact2-mobile').value = '(561) 555-0999';
    patch = null;
    ctx.saveVendorQuickEdit();
    eq(patch, { contact2_mobile: '(561) 555-0999' }, 'a changed number is written');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('the vendor form, the quick card and the search cannot disagree');
  {
    const form = mapKeys('VENDOR_FORM_MAP');
    const quick = mapKeys('VENDOR_QUICK_MAP');
    ok(!!form && !!quick, 'both maps parse');
    const markup = vformBlock();
    const ctx = vendorCtx();

    // Every slot key must be writable somewhere, or the card renders a field nothing fills.
    const wanted = [];
    ctx.VENDOR_CONTACT_SLOTS.forEach((s) => wanted.push(s.first, s.last, s.title, s.mobile, s.email));
    const formKeys = Object.values(form);
    wanted.forEach((k) => ok(formKeys.indexOf(k) !== -1, k + ' is on the full form'));

    // ⚠ THE DRIVEWAY CASE IS THE WHOLE REASON THESE FIELDS EXIST — "we get the owner
    // Andy's email" happens in front of the vendor, on the QUICK card, not at a desk.
    const quickKeys = Object.values(quick);
    ctx.VENDOR_CONTACT_SLOTS.forEach((s) => {
      ok(quickKeys.indexOf(s.mobile) !== -1, s.mobile + ' is reachable from the field path');
      ok(quickKeys.indexOf(s.email) !== -1, s.email + ' is reachable from the field path');
    });

    // Both directions: an id in a map with no input is a save that writes '' over real
    // data; an input with no map entry is a box that silently discards what you type.
    Object.keys(form).forEach((id) => {
      ok(markup.indexOf('id="' + id + '"') !== -1, 'full-form id ' + id + ' exists in the markup');
    });
    ctx.VENDOR_CONTACT_SLOTS.forEach((s) => {
      [s.first, s.last, s.title, s.mobile, s.email].forEach((key) => {
        const ids = Object.keys(form).filter((id) => form[id] === key);
        eq(ids.length, 1, key + ' is written by exactly one form field');
      });
    });
    quickKeys.forEach((k) => ok(formKeys.indexOf(k) !== -1,
      'quick-card key ' + k + ' is also on the full form, so the field path is a subset'));
  }

  group('⚠ the office fields are relabelled, not renamed');
  {
    const form = mapKeys('VENDOR_FORM_MAP');
    // 152 live rows carry `phone` and `email`, and ~20 readers name them. Renaming the
    // COLUMN to office_phone would have been a sheet migration for a label change.
    eq(form['v-phone'], 'phone', 'the office line still stores to `phone`');
    eq(form['v-email'], 'email', 'and the general inbox to `email`');
    has(vformBlock(), '>Office phone<', 'only the label says which it is');
    has(vformBlock(), '>Office email<', 'same for the inbox');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ a partner is a PERSON, so they do not get the vendor’s two contact slots');
  {
    const form = mapKeys('REFERRAL_FORM_MAP');
    ok(!!form, 'the referral map parses');
    const keys = Object.values(form);
    ['office_phone', 'phone_ext', 'mobile', 'assistant_phone', 'assistant_email']
      .forEach((k) => ok(keys.indexOf(k) !== -1, k + ' is on the partner form'));
    // Four partners at Comiter are already four rows. A second contact slot on each of
    // them would be modelling the same firm five different ways.
    ['contact2_first', 'contact2_mobile', 'contact_mobile']
      .forEach((k) => ok(keys.indexOf(k) === -1, 'a partner has no ' + k + ' — that is the vendor shape'));
    eq(form['r-phone'], 'phone', 'their direct line still stores to `phone`');
    eq(form['r-contact'], 'primary_contact',
       'the assistant’s name keeps the column it always had, moved out of the research block');
    has(rformBlock(), 'Assistant / gatekeeper', 'and is labelled for what it is');
    has(rformBlock(), '>Direct line ', 'the partner’s own line says it is theirs');

    const markup = rformBlock();
    Object.keys(form).forEach((id) => {
      ok(markup.indexOf('id="' + id + '"') !== -1, 'partner form id ' + id + ' exists in the markup');
    });
  }

  group('phone_type had no reader for a year; it is the migration signal now');
  {
    const ctx = sandbox({ fns: ['referralPhoneIsMainLine'] });
    const f = ctx.referralPhoneIsMainLine;
    // 32 of 79 seed rows are exactly this: a switchboard in the direct-line field.
    ok(f({ phone: '5616262101', phone_type: 'Main' }), 'a Main-typed number with nowhere else to live');
    ok(f({ phone: '5616262101', phone_type: 'Switchboard' }), 'and a switchboard');
    ok(f({ phone: '5616262101', phone_type: 'main line' }), 'matched case-insensitively');
    ok(!f({ phone: '5616262101', phone_type: 'Direct' }), 'a genuine direct line raises nothing');
    ok(!f({ phone: '5616262101', phone_type: '' }), 'and neither does an unrecorded type');
    // ⚠ IT STOPS ONCE THE NUMBER HAS SOMEWHERE TO GO. A flag you cannot clear is one
    // people learn to read past, which this file records costing the firearms rule once.
    ok(!f({ phone: '5616262101', phone_type: 'Main', office_phone: '5616262101' }),
       'filling in Office phone clears it');
    ok(!f({ phone_type: 'Main' }), 'no number at all is nothing to flag');
    ok(!f(null), 'null does not throw');
  }

  group('the partner card: three different numbers, each saying whose it is');
  {
    const ctx = sandbox({
      fns: ['referralCardHtml', 'referralPhoneIsMainLine', 'fmtPhoneDisplay', 'referralIdOf',
            'fmtVendorDate', 'referralSearchBlob'],
      stubs: {
        referralPartnerStats: () => ({ count: 0, won: 0, wonRev: 0 }),
        referralDormancy: () => ({ dormant: false, days: 1 }),
        referralStatusSelect: () => '<status>', referralPriorityBadge: () => '<pri>',
        referralChannelHtml: () => '', referralDirectory: [],
      },
    });
    const html = ctx.referralCardHtml({
      _row: 2, partner_name: 'David Pratt', first_name: 'David', last_name: 'Pratt',
      partner_type: 'Estate attorney', title: 'Partner', firm: 'McDermott Will & Schulte',
      phone: '5617179023', phone_type: 'Direct', mobile: '5615551212',
      office_phone: '5614772000', phone_ext: '214',
      email: 'dpratt@mcdermottlaw.com',
      primary_contact: 'Marie Duval', assistant_phone: '5614772044',
      assistant_email: 'mduval@mcdermottlaw.com',
    });
    has(html, 'tel:5617179023', 'the direct line');
    has(html, '>direct</span>', 'labelled as theirs');
    has(html, 'tel:5615551212', 'their mobile');
    has(html, '>mobile</span>', 'labelled as theirs');
    has(html, 'tel:5614772000', 'the firm’s main number');
    has(html, 'ext 214', 'with their extension on it, which is useless without the number');
    has(html, 'Marie Duval', 'the assistant is named');
    has(html, 'tel:5614772044', 'with her own number');
    has(html, 'mailto:mduval@mcdermottlaw.com', 'and her own address');
    has(html, '>Assistant</span> ', 'on her own line, not folded in with his');
    has(html, '☎ Mobile', 'the tap strip separates the cell');
    has(html, '☎ Marie', 'and offers the gatekeeper by name');
    // ⚠ TEXTING IS OFFERED ON THE CELL AND NOWHERE ELSE.
    has(html, 'sms:5615551212', 'the mobile can be texted');
    lacks(html, 'sms:5617179023', 'a desk line cannot');
    lacks(html, 'sms:5614772000', 'and neither can a switchboard');
  }

  group('⚠ a switchboard in the direct-line field is named on the card, never dialled silently');
  {
    const ctx = sandbox({
      fns: ['referralCardHtml', 'referralPhoneIsMainLine', 'fmtPhoneDisplay', 'referralIdOf', 'fmtVendorDate'],
      stubs: {
        referralPartnerStats: () => ({ count: 0, won: 0, wonRev: 0 }),
        referralDormancy: () => ({ dormant: false, days: 1 }),
        referralStatusSelect: () => '<status>', referralPriorityBadge: () => '<pri>',
        referralChannelHtml: () => '', referralDirectory: [],
      },
    });
    const row = {
      _row: 5, partner_name: 'Richard Comiter', first_name: 'Richard', last_name: 'Comiter',
      firm: 'Comiter, Singer, Baseman & Braun', phone: '5616262101', phone_type: 'Main',
      email: 'rcomiter@comitersinger.com',
    };
    const flagged = ctx.referralCardHtml(row);
    has(flagged, 'firm main line, not direct', 'the card says what that number really is');
    has(flagged, '☎ Main line', 'and the button is labelled honestly');
    // ⚠ IT FLAGS AND NEVER REFUSES — the standing rule. The number is still the only way
    // through to him, so withholding it would be a downgrade.
    has(flagged, 'tel:5616262101', 'the number still dials');

    const fixed = ctx.referralCardHtml(Object.assign({}, row, { office_phone: '5616262101', phone: '' }));
    lacks(fixed, 'firm main line, not direct', 'moving it into Office phone clears the flag');
    has(fixed, '☎ Office', 'and the button says what it now reaches');
  }

  group('⚠ every partner number is searchable, the assistant included');
  {
    const ctx = sandbox({ fns: ['referralSearchBlob', 'referralPhoneIsMainLine'] });
    const blob = ctx.referralSearchBlob({
      partner_name: 'David Pratt', phone: '5617179023', mobile: '5615551212',
      office_phone: '5614772000', phone_ext: '214', phone_type: 'Direct',
      primary_contact: 'Marie Duval', assistant_phone: '5614772044',
      assistant_email: 'mduval@mcdermottlaw.com',
    });
    ['5617179023', '5615551212', '5614772000', '5614772044'].forEach((n) => {
      ok(blob.indexOf(n) !== -1, n + ' is findable by its digits');
    });
    ok(blob.indexOf('marie duval') !== -1, "the assistant's name — \"who is Marie at Gunster\" is a real search");
    ok(blob.indexOf('mduval@mcdermottlaw.com') !== -1, 'and her address');
    // The 32 rows still needing the move have to be findable as a set.
    const stale = ctx.referralSearchBlob({ partner_name: 'X', phone: '5616262101', phone_type: 'Main' });
    ok(stale.indexOf('firm main line, not direct') !== -1,
       'typing "main line" pulls up the rows whose direct-line field still holds a switchboard');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ the partner sheet is read BY POSITION, so new columns append at the very end');
  {
    const m = RPB.match(/var COLUMNS = \[([\s\S]*?)\n\];/);
    ok(!!m, 'COLUMNS parses out of referral-partners-backend.gs');
    // ⚠ MATCH ANY QUOTED TOKEN, not /[a-z_0-9]+/. The narrow pattern skipped anything
    // carrying a capital, so a column inserted mid-array was invisible to this check and
    // the positions below read as unmoved. Found by reverting, not by reading.
    // ⚠ AND STRIP THE COMMENTS FIRST, because the block is half explanation and English
    // is full of apostrophes — the widened pattern read "a PARTNER IS A PERSON… vendor's"
    // as a column name. Sixth time this repo records a needle tripping on the prose that
    // explains the fix.
    const body = m[1].replace(/\/\/[^\n]*/g, '');
    const keys = [...body.matchAll(/'([^']+)'/g)].map((x) => x[1]);
    // The layout the LIVE sheet is written in. Any of these moving means every read of
    // that column hands back the wrong field — a Quo contact id as somebody's office
    // phone, which the sync would then dial.
    const live = ['first_name', 'last_name', 'partner_name', 'partner_type', 'firm', 'primary_contact',
      'phone', 'email', 'website', 'status', 'owner', 'last_contacted', 'notes',
      'title', 'street', 'suite', 'city', 'state', 'zip', 'phone_type',
      'credentials', 'board_cert', 'actec', 'council', 'council_role', 'email_status',
      'channel', 'priority', 'warm_path', 'uid', 'updated_at', 'source', 'last_contact_note',
      'quo_contact_id', 'quo_external_id'];
    live.forEach((k, i) => eq(keys[i], k, 'column ' + (i + 1) + ' is still ' + k));
    eq(keys.slice(live.length), ['office_phone', 'phone_ext', 'mobile', 'assistant_phone', 'assistant_email'],
       'the new columns are appended after every existing one');
    eq(keys.filter((k, i) => keys.indexOf(k) !== i).length, 0, 'no duplicated column');
    eq(keys.length, live.length + 5, 'and nothing else has been slipped into the array');
    // updatePartner writes by index whether or not a header cell exists, so without this
    // the values land in columns nobody can read by name.
    has(RPB, 'CONTACT_COLS.forEach', 'backfillIds writes the new header cells');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // THE QUO SYNC — the payoff. One row can now produce several contacts, so Andy calling
  // the office line resolves as Andy rather than as an unknown number.
  function quoCtx(partnerRows, vendorRows) {
    const grab = (name) => {
      const mm = QUO.match(new RegExp('function ' + name + '\\([^)]*\\) \\{[\\s\\S]*?\\n\\}'));
      ok(!!mm, name + ' is present in apps-script/quo-sync.gs');
      return mm ? mm[0] : '';
    };
    const gctx = {
      SpreadsheetApp: {
        getActiveSpreadsheet: () => ({ __rows: partnerRows }),
        openById: () => ({ __rows: vendorRows }),
      },
      QUO_PARTNER_TAB: 'Partners', QUO_VENDOR_ID: 'x', QUO_VENDOR_TAB: 'Vendor Directory',
      QUO_SRC_PARTNER: 'Havellin Referral Partner', QUO_SRC_VENDOR: 'Havellin Vendor',
      _readTab: (ss) => ss.__rows,
    };
    vm.createContext(gctx);
    vm.runInContext([grab('_e164'), grab('_titleCase'), grab('_tags'),
                     grab('_vendorRowContacts'), grab('_collectVendors'), grab('_collectPartners')].join('\n\n'),
                    gctx, { filename: 'quo-sync.gs (extracted)' });
    return gctx;
  }

  group('⚠ Quo: the office contact KEEPS its external id, or 136 live contacts duplicate');
  {
    const g = quoCtx([], [Object.assign({ _row: 7 }, NAVIS)]);
    const recs = g._collectVendors();
    const ids = recs.map((r) => r.extId);
    // THE MIGRATION. Suffixing every id would leave every existing vendor contact
    // matching nothing: the next run creates 136 duplicates AND reports the originals
    // STALE for deletion. Only the NEW records carry a suffix.
    ok(ids.indexOf('vendor:u-navis') !== -1, 'the office record keeps the id it has always had');
    ok(ids.indexOf('vendor:u-navis:c1') !== -1, 'the first contact is a new, suffixed id');
    ok(ids.indexOf('vendor:u-navis:c2') !== -1, 'and the second');
    eq(ids.length, 3, 'one firm plus two people');
    const byId = Object.fromEntries(recs.map((r) => [r.extId, r]));
    eq(byId['vendor:u-navis'].phone, '+15615550100', 'the office record holds the office line');
    eq(byId['vendor:u-navis:c1'].phone, '+15615550111', "and Andy's record holds Andy's cell");
    eq(byId['vendor:u-navis:c1'].label, 'Andy Ramirez', 'which is what caller ID will now say');
    eq(byId['vendor:u-navis:c1'].company, 'Navis Moving', 'with the firm beside the name');
    eq(byId['vendor:u-navis:c1'].role, 'Owner',
       'their own title beats the trades — "Owner" says more about an incoming call');
    eq(byId['vendor:u-navis:c1'].email, 'andy@navismoving.com', "and his own address, not the firm's");
  }

  group('⚠⚠ a number is attributed to a person only when it is the best way to reach them');
  {
    // With a mobile on file, the office line goes back to being the FIRM's — naming it
    // after Andy would put his name on the receptionist's calls.
    const withCell = quoCtx([], [Object.assign({ _row: 7 }, NAVIS)])._collectVendors();
    eq(withCell.find((r) => r.extId === 'vendor:u-navis').label, 'Navis Moving',
       'once Andy is reachable directly, the switchboard is the firm’s again');

    // ⚠ AND THE CONVERSE IS WHY THIS SHIPS WITH ZERO CHURN. No mobile is recorded on any
    // of the 152 rows on day one, so every existing contact keeps the name it has.
    const noCell = quoCtx([], [{
      _row: 7, vendor_name: 'Navis Moving', uid: 'u-navis', category: 'Mover',
      phone: '5615550100', contact_first: 'Andy', contact_last: 'Ramirez',
    }])._collectVendors();
    eq(noCell.length, 1, 'no mobile means no second contact');
    eq(noCell[0].label, 'Andy Ramirez',
       'and the office record is left exactly as it reads today, because that line is still the only way through');
  }

  group('Quo: a contact with an address but no number is not a row in the dialer');
  {
    const recs = quoCtx([], [{
      _row: 8, vendor_name: 'Sothebys', uid: 'u-sot', category: 'Auction House',
      phone: '5615553000', contact_first: 'Lena', contact_last: 'Voss',
      contact_email: 'lena@sothebys.com',
    }])._collectVendors();
    eq(recs.length, 1, 'an email-only contact makes no contact — there is nothing to ring');
    eq(recs[0].extId, 'vendor:u-sot', 'just the firm');
  }

  group('Quo: a partner’s desk line and cell are ONE card, because they are one person');
  {
    const g = quoCtx([{
      _row: 2, uid: 'u-pratt', first_name: 'David', last_name: 'Pratt',
      firm: 'McDermott Will & Schulte', title: 'Partner', partner_type: 'Estate attorney',
      phone: '5617179023', mobile: '5615551212', email: 'dpratt@mcdermottlaw.com',
      office_phone: '5614772000', primary_contact: 'Marie Duval', assistant_phone: '5614772044',
    }], []);
    const recs = g._collectPartners();
    const byId = Object.fromEntries(recs.map((r) => [r.extId, r]));
    // ⚠ TWO CARDS FOR ONE PERSON WOULD BE THE AMBIGUITY, NOT THE FIX. The rule is that a
    // NUMBER resolves to one name — which forbids one number on two cards and says
    // nothing against two numbers on one.
    ok(!!byId['u-pratt'], 'the person record keeps its bare uid, so all 63 update in place');
    eq(byId['u-pratt'].phone, '+15617179023', 'grouped on the desk line');
    eq(byId['u-pratt'].extras.map((x) => x.value), ['+15615551212'], 'with the cell riding the same card');
    eq(byId['u-pratt'].extras[0].name, 'Mobile', 'labelled, so the card says which is which');

    // ⚠ `firm:<number>`, NOT `<uid>:office`. Four partners at one firm emit four identical
    // ids that collapse to one contact; keying on a uid would make the surviving contact
    // depend on which partner happened to be first, and removing them would orphan it.
    ok(!!byId['firm:+15614772000'], 'the firm’s switchboard is keyed by the number itself');
    eq(byId['firm:+15614772000'].role, 'Main line', 'and named for what it is');
    ok(!!byId['u-pratt:asst'], 'the gatekeeper gets her own contact');
    eq(byId['u-pratt:asst'].label, 'Marie Duval', 'under her own name');
    eq(byId['u-pratt:asst'].role, 'Assistant to David Pratt', 'saying whose call it is');
  }

  group('Quo: a partner with only a cell still resolves');
  {
    const recs = quoCtx([{
      _row: 3, uid: 'u-solo', first_name: 'Jane', last_name: 'Roe', firm: 'Roe Law',
      mobile: '5615559000',
    }], [])._collectPartners();
    eq(recs.length, 1, 'one contact');
    eq(recs[0].phone, '+15615559000', 'grouped on the only number they have');
    eq(recs[0].phoneLabel, 'Mobile', 'labelled honestly rather than as a work line');
    eq(recs[0].extras.length, 0, 'with nothing left over');
  }

  group('⚠⚠ the app and the Apps Script agree about who a vendor’s people are');
  {
    // Two parallel implementations of one rule: vendorContacts in havellin.html and
    // _vendorRowContacts in quo-sync.gs. Two copies that drift is how the workbook
    // rollups once got six categories against thirteen, so they are driven side by side.
    const app = vendorCtx().vendorContacts;
    const gs = quoCtx([], [])._vendorRowContacts;
    const cases = [
      NAVIS,
      { contact_first: 'Andy', contact_mobile: '5615550111' },
      { contact_mobile: '5615550111' },
      { contact2_first: 'Only', contact2_last: 'Second', contact2_email: 'o@s.com' },
      { primary_contact: 'Legacy Person' },
      { vendor_name: 'Nobody' },
      {},
      { contact_title: 'Owner' },
      { contact_first: ' Andy ', contact_last: ' Ramirez ', contact_mobile: ' 561 555 0111 ' },
    ];
    cases.forEach((row, i) => {
      const a = app(row), b = gs(row);
      eq(b.length, a.length, 'case ' + i + ': the same people');
      a.forEach((c, j) => {
        eq(b[j].slot, c.slot, 'case ' + i + ' slot ' + j + ': same slot');
        eq(b[j].name, c.name, 'case ' + i + ' slot ' + j + ': same name');
        eq(b[j].title, c.title, 'case ' + i + ' slot ' + j + ': same title');
        eq(b[j].email, c.email, 'case ' + i + ' slot ' + j + ': same address');
        // The .gs normalises to E.164 on the way to the dialer; the app keeps what was
        // typed. They must agree on WHETHER there is a number, which is what decides
        // both the tap strip and whether a contact is synced at all.
        eq(!!b[j].mobile, !!c.mobile, 'case ' + i + ' slot ' + j + ': agree on having a number');
      });
    });
  }

  group('⚠ a second number on one card must never be another contact’s own number');
  {
    // Driven, not grepped. A guard that computes the right answer and then throws it away
    // contains every string a source check would look for — which is how the payload
    // dropping `extras` came back GREEN on the first revert sweep.
    const grab = (name) => {
      const mm = QUO.match(new RegExp('function ' + name + '\\([^)]*\\) \\{[\\s\\S]*?\\n\\}'));
      ok(!!mm, name + ' is present in apps-script/quo-sync.gs');
      return mm ? mm[0] : '';
    };
    const g = {};
    vm.createContext(g);
    vm.runInContext(grab('_pruneAmbiguousExtras'), g, { filename: 'quo-sync.gs (extracted)' });

    const pratt = { label: 'David Pratt', phone: '+15617179023',
                    extras: [{ name: 'Mobile', value: '+15615551212' }] };
    const roe   = { label: 'Jane Roe', phone: '+15615559000', extras: [] };
    const plan  = { conflict: [] };
    // Nobody else holds Pratt's cell, so it stays on his card.
    g._pruneAmbiguousExtras([pratt, roe], { '+15617179023': [pratt], '+15615559000': [roe] }, plan);
    eq(pratt.extras.length, 1, 'a number nobody else holds rides the card');
    eq(plan.conflict.length, 0, 'and raises nothing');

    // Now the "cell" recorded against Pratt is really Jane Roe's own number.
    const pratt2 = { label: 'David Pratt', phone: '+15617179023',
                     extras: [{ name: 'Mobile', value: '+15615559000' }] };
    const plan2 = { conflict: [] };
    g._pruneAmbiguousExtras([pratt2, roe], { '+15617179023': [pratt2], '+15615559000': [roe] }, plan2);
    eq(pratt2.extras.length, 0, '⚠ a number that is somebody else’s own is dropped from the card');
    eq(plan2.conflict.length, 1, 'and reported — never dropped silently');
    has(plan2.conflict[0].why, "another contact's own number", 'the report says what happened');
    ok(plan2.conflict[0].names.indexOf('Jane Roe') !== -1, 'naming who else holds it');

    // ⚠ A CONTACT'S OWN GROUPING NUMBER IS NOT A CLASH WITH ITSELF. Getting this wrong
    // would strip every extra from every card, which is the same outcome as having no
    // second number at all.
    const solo = { label: 'Solo', phone: '+15615551111',
                   extras: [{ name: 'Mobile', value: '+15615552222' }] };
    const plan3 = { conflict: [] };
    g._pruneAmbiguousExtras([solo], { '+15615551111': [solo] }, plan3);
    eq(solo.extras.length, 1, 'its own grouping number does not make it clash with itself');
    eq(plan3.conflict.length, 0, 'and nothing is reported');
  }

  group('⚠⚠ the whole sync, driven: one vendor row becomes three contacts');
  {
    // THE WIRING, not the pieces. Deleting the CALL to _pruneAmbiguousExtras broke
    // nothing while the guard was only tested in isolation — the same gap this project
    // records on _jtProg, where blanking every progress figure on the one screen that
    // shows them passed the whole suite. syncQuoAll runs end to end here in dry-run.
    const grab = (name) => {
      const mm = QUO.match(new RegExp('function ' + name + '\\([^)]*\\) \\{[\\s\\S]*?\\n\\}'));
      ok(!!mm, name + ' is present in apps-script/quo-sync.gs');
      return mm ? mm[0] : '';
    };
    function drive(partnerRows, vendorRows, quoHolds) {
      const g = {
        SpreadsheetApp: { getActiveSpreadsheet: () => ({ __rows: partnerRows }), openById: () => ({ __rows: vendorRows }) },
        QUO_PARTNER_TAB: 'Partners', QUO_VENDOR_ID: 'x', QUO_VENDOR_TAB: 'V',
        QUO_SRC_PARTNER: 'Havellin Referral Partner', QUO_SRC_VENDOR: 'Havellin Vendor',
        QUO_SRC_CLIENT: 'Havellin Client', QUO_SYNC_CLIENTS: false, QUO_TAGS_FIELD_KEY: '',
        QUO_THROTTLE_MS: 0,
        _readTab: (ss) => ss.__rows, _collectClients: () => [],
        _quoLoadExisting: () => (quoHolds || { ids: {}, meta: {} }),
        Logger: { log(line) { g.__log.push(String(line)); } },
        __log: [],
        Utilities: { sleep() {} }, _quoFetch: () => ({ code: 200, body: {} }),
      };
      vm.createContext(g);
      vm.runInContext([grab('_e164'), grab('_titleCase'), grab('_tags'), grab('_vendorRowContacts'),
                       grab('_collectPartners'), grab('_collectVendors'), grab('_quoPayload'),
                       grab('_firmPayload'), grab('_pruneAmbiguousExtras'), grab('_quoWho'),
                       grab('_logQuoAll'), grab('syncQuoAll')].join('\n\n'),
                      g, { filename: 'quo-sync.gs (extracted)' });
      const plan = g.syncQuoAll(true);
      // The REPORT is the deliverable here, not the plan object — a stale entry that
      // carries a name and then prints a bare id is the defect this closes. So drive
      // the real renderer and read the lines a person would actually see.
      g.__log.length = 0;
      g._logQuoAll(plan);
      plan.__lines = g.__log.slice();
      return plan;
    }

    // Anthony's example, all the way through the real sync.
    const plan = drive([], [Object.assign({ _row: 7 }, NAVIS)]);
    const made = plan.create.concat(plan.update).map((e) => e.ext);
    eq(made.sort(), ['vendor:u-navis', 'vendor:u-navis:c1', 'vendor:u-navis:c2'],
       'one vendor row becomes the firm plus each person who has their own number');
    const byExt = Object.fromEntries(plan.create.concat(plan.update).map((e) => [e.ext, e]));
    eq(byExt['vendor:u-navis:c1'].name, 'Andy Ramirez',
       '⚠ THE POINT OF THE WHOLE CHANGE: Andy calling now resolves as Andy, not as an unknown number');
    eq(byExt['vendor:u-navis'].name, 'Navis Moving', 'and the switchboard resolves as the firm');
    eq(plan.conflict.length, 0, 'nothing ambiguous about it');
    eq(plan.skip.length, 0, 'and nothing is skipped for want of a number');

    // ⚠ THE GUARD, REACHED THE WAY IT IS REACHED IN PRODUCTION. Pratt's recorded "cell"
    // is really Jane Roe's own line — two names on one number is the one thing this file
    // exists to prevent.
    const clash = drive([
      { _row: 2, uid: 'u-pratt', first_name: 'David', last_name: 'Pratt', firm: 'McDermott',
        title: 'Partner', phone: '5617179023', mobile: '5615559000', email: 'd@m.com' },
      { _row: 3, uid: 'u-roe', first_name: 'Jane', last_name: 'Roe', firm: 'Roe Law', phone: '5615559000' },
    ], []);
    eq(clash.conflict.length, 1, 'the clash is reported by a real run, not just by the helper');
    eq(clash.conflict[0].phone, '+15615559000', 'naming the number');
    ok(clash.conflict[0].names.indexOf('Jane Roe') !== -1, 'and who else holds it');
    const pratt = clash.create.concat(clash.update).find((e) => e.ext === 'u-pratt');
    eq(pratt.phone, '+15617179023', 'Pratt keeps his own desk line');
    const roe = clash.create.concat(clash.update).find((e) => e.ext === 'u-roe');
    eq(roe.name, 'Jane Roe', "and Jane's number still resolves to Jane, which is the whole rule");

    // ⚠⚠ A REPORT THAT NAMES A PROBLEM WITHOUT NAMING ENOUGH TO ACT ON IT.
    // The first live prune list was sixteen lines of `STALE <32-hex id> was vendor:<uid>`
    // — a decision nobody can make, about contacts nobody can identify, on the one
    // action in this file that is irreversible. _quoLoadExisting had the name and the
    // number in hand and threw both away. Driven on the REAL reporter, because the plan
    // object carrying a name and the log line printing a bare id is exactly the state
    // this closes.
    const withStale = drive([], [Object.assign({ _row: 7 }, NAVIS)], {
      ids: { 'vendor:u-gone': 'c-0001' },
      meta: { 'vendor:u-gone': { name: 'Old Hauler LLC', phone: '+15615550000' } },
    });
    eq(withStale.stale.length, 1, 'a contact Quo holds that no directory produces any more is stale');
    eq(withStale.stale[0].name, 'Old Hauler LLC', '⚠ and the plan says WHO, not just which id');
    eq(withStale.stale[0].phone, '+15615550000', 'and on what number');
    const staleLine = withStale.__lines.find((l) => l.indexOf('STALE') !== -1);
    ok(!!staleLine, 'the report prints a STALE line');
    ok(staleLine.indexOf('Old Hauler LLC') !== -1,
       '⚠⚠ THE REQUIREMENT: the LINE A PERSON READS names the contact, not only the plan object');
    ok(staleLine.indexOf('c-0001') !== -1, 'while still carrying the id the delete needs');

    // A contact Quo returns with no usable name must say so rather than rendering blank —
    // a bare id with two spaces in front of it reads as a formatting bug, not as "Quo
    // gave us nothing".
    const noName = drive([], [Object.assign({ _row: 7 }, NAVIS)], {
      ids: { 'vendor:u-gone': 'c-0002' }, meta: {},
    });
    const blankLine = noName.__lines.find((l) => l.indexOf('STALE') !== -1);
    ok(blankLine.indexOf('(name not returned)') !== -1, 'an unnamed contact says so in words');

    // ⚠ THE CONFLICT LINE PRINTED THE CONTACT LABELS AND NOT THE THING THAT DIFFERED.
    // Two rows for one person under two business names rendered as 'David Schneider,
    // David Schneider' — identical twice, with nothing on the line saying what the
    // conflict was. `companies` was computed and never printed.
    const twoNames = drive([], [
      { _row: 2, uid: 'u-ds1', vendor_name: 'Schneider Appraisals', contact_first: 'David',
        contact_last: 'Schneider', phone: '5613913580', category: 'Art Appraiser' },
      { _row: 3, uid: 'u-ds2', vendor_name: 'Schneider Fine Art', contact_first: 'David',
        contact_last: 'Schneider', phone: '5613913580', category: 'Antiques & Furniture Appraiser' },
    ]);
    eq(twoNames.conflict.length, 1, 'one number under two business names is reported');
    eq(twoNames.conflict[0].companies.sort(), ['Schneider Appraisals', 'Schneider Fine Art'],
       'the plan carries both business names');
    const confLines = twoNames.__lines.filter((l) => l.indexOf('business names:') !== -1);
    eq(confLines.length, 1, 'and the report prints them');
    ok(confLines[0].indexOf('Schneider Appraisals') !== -1 &&
       confLines[0].indexOf('Schneider Fine Art') !== -1,
       '⚠ naming what actually differed, which the contact labels could not');
  }

  group('⚠⚠ every number the collector produces reaches the payload Quo is sent');
  {
    // THE JOIN. The collectors were tested, the payload was tested, and NOTHING drove one
    // into the other — so deleting the line that copies `extras` onto phoneNumbers came
    // back green on the first sweep, with a partner's cell collected and then discarded
    // on the way out of the door. The gap this file records more often than any other.
    const grab = (name) => {
      const mm = QUO.match(new RegExp('function ' + name + '\\([^)]*\\) \\{[\\s\\S]*?\\n\\}'));
      return mm ? mm[0] : '';
    };
    const g = { QUO_TAGS_FIELD_KEY: '' };
    vm.createContext(g);
    vm.runInContext(grab('_quoPayload'), g, { filename: 'quo-sync.gs (extracted)' });

    const recs = quoCtx([{
      _row: 2, uid: 'u-pratt', first_name: 'David', last_name: 'Pratt', firm: 'McDermott',
      title: 'Partner', phone: '5617179023', mobile: '5615551212', email: 'd@m.com',
    }], [])._collectPartners();
    const payload = g._quoPayload(recs[0]);
    const nums = payload.defaultFields.phoneNumbers.map((n) => n.value);
    eq(nums, ['+15617179023', '+15615551212'],
       'the desk line AND the cell are both on the contact Quo receives');
    eq(payload.defaultFields.phoneNumbers.map((n) => n.name), ['Work', 'Mobile'],
       'each labelled, so the card says which is which');
    eq(payload.externalId, 'u-pratt', 'under the id the live contact already has');

    // The vendor side of the same join: a contact's mobile must arrive as its own contact.
    const vrecs = quoCtx([], [Object.assign({ _row: 7 }, NAVIS)])._collectVendors();
    const andy = g._quoPayload(vrecs.find((r) => r.extId === 'vendor:u-navis:c1'));
    eq(andy.defaultFields.phoneNumbers.map((n) => n.value), ['+15615550111'],
       "Andy's cell reaches Quo");
    eq(andy.defaultFields.phoneNumbers[0].name, 'Mobile', 'labelled as a mobile');
    eq(andy.defaultFields.emails[0].value, 'andy@navismoving.com', "and his own address, not the firm's");
    eq(andy.defaultFields.firstName, 'Andy', 'so caller ID resolves to a person');
    eq(andy.defaultFields.company, 'McDermott' === 'x' ? '' : 'Navis Moving', 'with the firm beside it');

    // A record with no extras must not grow an empty entry.
    const office = g._quoPayload(vrecs.find((r) => r.extId === 'vendor:u-navis'));
    eq(office.defaultFields.phoneNumbers.length, 1, 'one number where there is one number');
  }

  group('⚠⚠ the loader keeps the name, and the prune preview prints it');
  {
    // BOTH OF THESE CAME BACK GREEN ON THE FIRST REVERT SWEEP, and they are the same
    // gap this project records more than any other: every check drove a PIECE and
    // nothing drove the END.
    //   · _quoLoadExisting is STUBBED in every other group, so the real loader could go
    //     back to discarding the name with the whole suite passing.
    //   · pruneQuoStale had NO coverage at all — the list somebody reads immediately
    //     before an irreversible delete, never once driven.
    const grab = (name) => {
      const mm = QUO.match(new RegExp('function ' + name + '\\([^)]*\\) \\{[\\s\\S]*?\\n\\}'));
      ok(!!mm, name + ' is present in apps-script/quo-sync.gs');
      return mm ? mm[0] : '';
    };

    // ── the REAL loader, against a Quo-shaped response ────────────────────────
    const lg = {
      QUO_SRC_PARTNER: 'P', QUO_SRC_VENDOR: 'V', QUO_SRC_CLIENT: 'C', QUO_SRC_LEGACY: 'L',
      _quoFetch: () => ({ code: 200, body: { data: [
        { id: 'c-777', externalId: 'vendor:u-gone', defaultFields: {
          firstName: 'Old', lastName: 'Hauler', company: 'Old Hauler LLC',
          phoneNumbers: [{ name: 'Main', value: '+15615550000' }] } },
        { id: 'c-778', externalId: 'firm:+15616559011', defaultFields: {
          firstName: '', lastName: '', company: 'Dissolved Switchboard',
          phoneNumbers: [{ name: 'Main', value: '+15616559011' }] } },
      ] } }),
    };
    vm.createContext(lg);
    vm.runInContext([grab('_quoAllSources'), grab('_quoLoadExisting')].join('\n\n'),
                    lg, { filename: 'quo-sync.gs (extracted)' });
    const loaded = lg._quoLoadExisting();
    eq(loaded.ids['vendor:u-gone'], 'c-777', 'the id map is what decides POST vs PATCH, unchanged');
    eq(loaded.meta['vendor:u-gone'].name, 'Old Hauler',
       '⚠ THE REVERT THAT WAS GREEN: the REAL loader keeps the name it already had in hand');
    eq(loaded.meta['vendor:u-gone'].phone, '+15615550000', 'and the number');
    eq(loaded.meta['firm:+15616559011'].name, 'Dissolved Switchboard',
       'a firm contact has no first/last, so the company name is the name');

    // ── the REAL prune preview ────────────────────────────────────────────────
    const pg = {
      QUO_THROTTLE_MS: 0, Utilities: { sleep() {} },
      Logger: { log(line) { pg.__log.push(String(line)); } }, __log: [],
      _quoFetch: () => { throw new Error('a PREVIEW must not call the API'); },
      syncQuoAll: () => ({ stale: [
        { externalId: 'vendor:u-gone', contactId: 'c-777', name: 'Old Hauler LLC', phone: '+15615550000' },
      ] }),
    };
    vm.createContext(pg);
    vm.runInContext([grab('_quoWho'), grab('pruneQuoStale')].join('\n\n'),
                    pg, { filename: 'quo-sync.gs (extracted)' });
    pg.pruneQuoStale(false);
    const prev = pg.__log.find((l) => l.indexOf('c-777') !== -1);
    ok(!!prev, 'the preview lists the contact');
    ok(prev.indexOf('Old Hauler LLC') !== -1,
       '⚠⚠ THE SECOND GREEN REVERT: the list you decide from names the contact, not just its id');
    ok(pg.__log.some((l) => l.indexOf('WOULD DELETE') !== -1), 'and says nothing was deleted');
    ok(pg.__log.some((l) => l.indexOf('pruneQuoStaleConfirm') !== -1),
       'naming the function the Run menu can actually reach, since the menu passes no arguments');

    // ⚠⚠ THE WORST BLAST RADIUS IN THIS FILE, AND IT WAS GREEN ON THE REVERT.
    // A LIVE push that cannot read Quo back sees an empty externalId map, so EVERY
    // contact looks new: it would create a duplicate of all ~210 and then report the
    // originals STALE for deletion. The id scheme exists to make that impossible, and
    // it only holds while the read is allowed to FAIL LOUDLY. A dry run may swallow it
    // — there is nothing to corrupt and the plan is still worth reading — but a push
    // must not. Nothing tested the asymmetry, so a tidy-up could have collapsed the two.
    const boom = (dry) => {
      const bg = {
        SpreadsheetApp: { getActiveSpreadsheet: () => ({ __rows: [] }), openById: () => ({ __rows: [] }) },
        QUO_PARTNER_TAB: 'Partners', QUO_VENDOR_ID: 'x', QUO_VENDOR_TAB: 'V',
        QUO_SRC_PARTNER: 'P', QUO_SRC_VENDOR: 'V', QUO_SRC_CLIENT: 'C',
        QUO_SYNC_CLIENTS: false, QUO_TAGS_FIELD_KEY: '', QUO_THROTTLE_MS: 0,
        _readTab: (ss) => ss.__rows, _collectClients: () => [],
        _quoLoadExisting: () => { throw new Error('HTTP 503'); },
        Logger: { log() {} }, Utilities: { sleep() {} }, _quoFetch: () => ({ code: 200, body: {} }),
      };
      vm.createContext(bg);
      vm.runInContext([grab('_e164'), grab('_titleCase'), grab('_tags'), grab('_vendorRowContacts'),
                       grab('_collectPartners'), grab('_collectVendors'), grab('_quoPayload'),
                       grab('_firmPayload'), grab('_pruneAmbiguousExtras'), grab('syncQuoAll')].join('\n\n'),
                      bg, { filename: 'quo-sync.gs (extracted)' });
      try { bg.syncQuoAll(dry); return null; } catch (e) { return e.message; }
    };
    eq(boom(true), null, 'a DRY RUN still prints a plan when Quo is unreadable — nothing can be corrupted');
    eq(boom(false), 'HTTP 503',
       '⚠⚠ a LIVE push REFUSES rather than treating every existing contact as new');
  }
};
