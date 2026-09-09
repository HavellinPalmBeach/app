'use strict';
// A vendor that does more than one thing.
//
// Anthony, 2026-09-09: "we want to be able to put vendors into two or more categories. some
// vendors do jewelry appraisal and buy jewelry for example. or appraisers do multiple
// categories that we have broken out."
//
// This shipped on 2026-07-31 — `category` holds several values separated by ';' and
// vendorCats() splits it — but it had almost no committed coverage: vendorCats was exercised
// only incidentally, through _appraiserVendors. That is the same shape as the failures this
// project keeps hitting: a feature documented as built, with nothing asserting it still is.
//
// ⚠ THE SEPARATOR IS ';' AND THAT IS NOT ARBITRARY. Of the category names the app references,
// eleven contain '/' and eight contain '&' — "Pest Inspection / Treatment", "Asset Liquidation
// & Valuation", "Specialty Vendor (art handler, etc.)" even contains a comma. None contains a
// semicolon. Splitting on any of the others would shred real category names in half.

const path = require('path');
const { sandbox } = require('./harness');

const CAT_FNS = ['vendorCats', 'vendorPrimaryCat', '_catSet', 'isActiveVendor',
                 'approvedVendorsInCats', 'directoryCategories'];

function withDirectory(rows, extraFns, extraVars) {
  const ctx = sandbox({
    fns: (extraFns || []).concat(CAT_FNS),
    vars: extraVars || [],
    stubs: { GROUP_JOB_MENU: {
      'Property Preparation': 'prep',
      'Asset Liquidation & Valuation': 'service',
      'Disposal & Waste Management': 'service',
      'Moving & Logistics': 'service',
      'Professional Services': 'service',
    } },
  });
  ctx.vendorDirectory = rows;
  return ctx;
}

// Anthony's example, plus the multi-trade appraiser.
const DIR = [
  { vendor_name: 'Palm Beach Gold & Gem', status: 'Active',
    category_group: 'Professional Services',
    category: 'Jewelry & Watch Appraiser; Jewelry Buyer' },
  { vendor_name: 'Wayland Fine Art', status: 'Active',
    category_group: 'Professional Services',
    category: 'Art Appraiser; Antiques & Furniture Appraiser; Rug & Textile Appraiser' },
  { vendor_name: 'Single Trade Movers', status: 'Active',
    category_group: 'Moving & Logistics', category: 'Mover' },
  { vendor_name: 'Retired Appraisals', status: 'Do Not Use',
    category_group: 'Professional Services', category: 'Art Appraiser' },
];

module.exports = function ({ group, ok, eq, has, lacks }) {

  group('a category field holding several trades splits into all of them');
  {
    const ctx = withDirectory(DIR);
    eq(ctx.vendorCats({ category: 'Jewelry & Watch Appraiser; Jewelry Buyer' }),
       ['Jewelry & Watch Appraiser', 'Jewelry Buyer'], "Anthony's jewelry example");
    eq(ctx.vendorCats({ category: 'Art Appraiser; Antiques & Furniture Appraiser; Rug & Textile Appraiser' }).length,
       3, 'three trades on one row');
    eq(ctx.vendorCats({ category: 'Mover' }), ['Mover'], 'a single trade is still a list of one');

    // ⚠ THE CHARACTERS THAT MUST SURVIVE. Splitting on '/' or '&' or ',' would cut real
    // category names in half and file the halves as separate trades.
    eq(ctx.vendorCats({ category: 'Pest Inspection / Treatment' }), ['Pest Inspection / Treatment'],
       "'/' is part of a name, never a separator");
    eq(ctx.vendorCats({ category: 'Antiques & Furniture Appraiser' }), ['Antiques & Furniture Appraiser'],
       "'&' is part of a name");
    eq(ctx.vendorCats({ category: 'Specialty Vendor (art handler, etc.)' }),
       ['Specialty Vendor (art handler, etc.)'], "',' is part of a name");

    // Typed by a person, so the whitespace is whatever they left behind.
    eq(ctx.vendorCats({ category: '  Art Appraiser ;  Jewelry Buyer  ' }),
       ['Art Appraiser', 'Jewelry Buyer'], 'sloppy spacing around the separator is trimmed');
    eq(ctx.vendorCats({ category: 'Art Appraiser;; Jewelry Buyer;' }),
       ['Art Appraiser', 'Jewelry Buyer'], 'a stray or trailing separator adds no empty trade');
    eq(ctx.vendorCats({ category: '' }), [], 'blank is no trades, not one blank trade');
    eq(ctx.vendorCats({}), [], 'a row with no category field does not throw');
    eq(ctx.vendorCats(null), [], 'nor does no row at all');
  }

  group('a vendor is findable by EVERY trade it lists, not just the first');
  {
    const ctx = withDirectory(DIR);
    const byFirst  = ctx.approvedVendorsInCats(['Jewelry & Watch Appraiser']).map(v => v.vendor_name);
    const bySecond = ctx.approvedVendorsInCats(['Jewelry Buyer']).map(v => v.vendor_name);
    eq(byFirst, ['Palm Beach Gold & Gem'], 'found by its first-listed trade');
    eq(bySecond, ['Palm Beach Gold & Gem'],
       'and by its SECOND — this is the whole point of the feature');

    // The multi-trade appraiser, reachable from any of the three broken-out categories.
    ['Art Appraiser', 'Antiques & Furniture Appraiser', 'Rug & Textile Appraiser'].forEach(c => {
      eq(ctx.approvedVendorsInCats([c]).map(v => v.vendor_name), ['Wayland Fine Art'],
         'the multi-trade appraiser is reachable via ' + c);
    });

    // ⚠ ONCE, NOT TWICE. A slot that maps to several of a vendor's categories must not
    // offer the same firm two or three times in one dropdown.
    const both = ctx.approvedVendorsInCats(['Jewelry & Watch Appraiser', 'Jewelry Buyer']);
    eq(both.length, 1, 'a slot asking for both of its trades lists the vendor once');

    eq(ctx.approvedVendorsInCats(['Art Appraiser']).map(v => v.vendor_name), ['Wayland Fine Art'],
       'a Do Not Use vendor is never assignable, whatever it lists');
    eq(ctx.approvedVendorsInCats([]).length, 3, 'no filter returns every ACTIVE vendor');
  }

  group('the picker heading prefers the trade the slot actually asked for');
  {
    const ctx = withDirectory(DIR);
    const v = DIR[1];   // Art; Antiques; Rug
    eq(ctx.vendorPrimaryCat(v, ctx._catSet(['Rug & Textile Appraiser'])), 'Rug & Textile Appraiser',
       'filling a rug slot, the firm reads as a rug appraiser');
    eq(ctx.vendorPrimaryCat(v, ctx._catSet(['Antiques & Furniture Appraiser'])), 'Antiques & Furniture Appraiser',
       'filling an antiques slot, it reads as an antiques appraiser');
    eq(ctx.vendorPrimaryCat(v, null), 'Art Appraiser',
       'asked about nothing in particular, it falls back to the first listed');
    eq(ctx.vendorPrimaryCat(v, ctx._catSet(['Mover'])), 'Art Appraiser',
       'a slot it does not serve does not invent a trade for it');
    eq(ctx.vendorPrimaryCat({ category: '' }, null), '', 'and a row with no trades yields none');

    // Case is what a person typed, not a key.
    eq(ctx.vendorPrimaryCat(v, ctx._catSet(['rug & textile appraiser'])), 'Rug & Textile Appraiser',
       'the preference match is case-insensitive');
  }

  group('every trade a vendor lists reaches the category pickers');
  {
    const ctx = withDirectory(DIR);
    const prof = ctx.directoryCategories({ group: 'Professional Services' });
    has(prof.join('|'), 'Jewelry Buyer',
        'a second-listed trade still appears in the picker built from the directory');
    has(prof.join('|'), 'Rug & Textile Appraiser', 'and a third-listed one');

    // Counted once even though two Professional Services rows both list Art Appraiser
    // (one of them Do Not Use — directoryCategories is the vocabulary, not the roster).
    eq(prof.filter(c => c === 'Art Appraiser').length, 1, 'each category appears once in the list');
    eq(prof.slice().sort(), prof, 'and the list is sorted, like every other reference dropdown');

    const all = ctx.directoryCategories();
    has(all.join('|'), 'Mover', 'ungrouped call returns every category in use');
  }

  group('the entry field lets a person type more than one');
  {
    // The feature is unusable if the form only offers a single choice. The control is a text
    // input with a datalist — free text with suggestions — NOT a <select>.
    const src = require('fs').readFileSync(path.join(__dirname, '..', 'havellin.html'), 'utf8');
    const i = src.indexOf('id="v-category"');
    ok(i > 0, 'the Add Vendor category control exists');
    const tag = src.slice(src.lastIndexOf('<', i), src.indexOf('>', i) + 1);
    has(tag, '<input', 'it is a text input, so several can be typed');
    lacks(tag, '<select', 'it is not a single-choice select');

    // And it has to SAY so, or nobody discovers it.
    const label = src.slice(Math.max(0, i - 400), i);
    has(label, 'separate several with ;', 'the label states the separator');
    has(src.slice(i, i + 300), 'placeholder', 'and the placeholder shows a worked example');
  }

  group('an appraiser who also BUYS is not recorded as independent');
  {
    // ⚠ ANTHONY'S EXACT EXAMPLE, and it was a live defect rather than a missing feature.
    // `<input type="checkbox" id="appr-indep" checked>` ships pre-checked and nothing used to
    // untick it, while the picker's label filtered the firm's trades through
    // APPRAISER_DIR_CATEGORIES — dropping the Buyer half. So selecting the jeweller who both
    // appraises and buys produced a roster row asserting "Independent", in green, over the one
    // firm the directory itself says acquires the property.
    // ⚠ BOTH LISTS COME OUT OF THE SOURCE, never stubbed. A stub of _cePhases that did not
    // match the real constant is what hid the &amp;amp; defect on 2026-09-09; a stubbed
    // conflict list would let the app's own list drift out from under this whole group.
    const ctx = withDirectory(DIR, ['apprConflictCats', '_appraiserVendors', '_apprPickerHtml',
                                    '_apprPickVendor', 'esc'],
                              ['APPRAISER_CONFLICT_CATEGORIES', 'APPRAISER_DIR_CATEGORIES',
                               'INV_APPRAISER_CREDS']);
    ok(ctx.APPRAISER_CONFLICT_CATEGORIES.length > 0, 'the real conflict list is loaded');
    has(ctx.APPRAISER_CONFLICT_CATEGORIES.join('|'), 'Jewelry & Watch Buyer',
        "and it carries Anthony's example — the trade that makes the appraisal indefensible");
    ok(ctx.APPRAISER_CONFLICT_CATEGORIES.every(c => ctx.APPRAISER_DIR_CATEGORIES.indexOf(c) < 0),
       'no trade is on both lists — a category cannot be its own conflict');

    eq(ctx.apprConflictCats({ category: 'Jewelry & Watch Appraiser; Jewelry & Watch Buyer' }),
       ['Jewelry & Watch Buyer'], 'the acquiring trade is picked out of the list');
    eq(ctx.apprConflictCats({ category: 'Art Appraiser' }), [],
       'a pure appraiser carries no conflict');
    eq(ctx.apprConflictCats({ category: 'Art Appraiser; Auction House' }), ['Auction House'],
       'a commission on the sale price is a conflict too, not only an outright purchase');
    eq(ctx.apprConflictCats({ category: 'art appraiser; coin buyer' }), ['coin buyer'],
       'matched case-insensitively, since the second trade is typed');

    // The LABEL has to say it. This is the assertion that fails if the suffix is removed.
    const dir = [
      { vendor_name: 'PB Gold & Gem', status: 'Active', category_group: 'Professional Services',
        category: 'Jewelry & Watch Appraiser; Jewelry & Watch Buyer' },
      { vendor_name: 'Wayland Fine Art', status: 'Active', category_group: 'Professional Services',
        category: 'Art Appraiser' },
    ];
    ctx.vendorDirectory = dir;
    const html = ctx._apprPickerHtml();
    has(html, 'Jewelry &amp; Watch Buyer',
        'the option names the acquiring trade the appraiser filter would have dropped');
    const gemOpt = html.split('<option').filter(o => o.indexOf('Gold &amp; Gem') >= 0)[0] || '';
    has(gemOpt, 'also', 'and marks it as an ALSO rather than burying it in the trade list');
    const artOpt = html.split('<option').filter(o => o.indexOf('Wayland') >= 0)[0] || '';
    lacks(artOpt, 'also', 'the clean appraiser is not warned about');

    // And the box must actually move. Element-map DOM, because these two functions are the
    // only place the honest default is set.
    const els = {
      'appr-firm-wrap': { style: {} },
      'appr-name': { placeholder: '' },
      'appr-firm': { value: '' },
      'appr-indep': { checked: true },
      'appr-conflict-note': { innerHTML: '' },
    };
    ctx.document = { getElementById: (id) => els[id] || null };
    ctx._apprPickVendor({ value: '0' });
    eq(els['appr-indep'].checked, false,
       'picking the firm that also buys unticks Independent');
    has(els['appr-conflict-note'].innerHTML, 'Jewelry &amp; Watch Buyer',
        'and the note names the trade rather than just objecting');
    has(els['appr-conflict-note'].innerHTML, 'unticked', 'and says what it did');

    ctx._apprPickVendor({ value: '1' });
    eq(els['appr-indep'].checked, true,
       'and the pure appraiser ticks it back — the default is honest, not sticky');
    eq(els['appr-conflict-note'].innerHTML, '', 'with the warning cleared');

    // It flags; it must never refuse. A family may still want their own jeweller.
    ok(els['appr-indep'].checked !== undefined,
       'the box stays editable — whether a conflict exists is the concierge’s call');
  }

  group('the suggestion list keeps working past the semicolon');
  {
    // ⚠ A DATALIST MATCHES ITS OPTIONS AGAINST THE WHOLE INPUT VALUE. So once the field read
    // "Art Appraiser; Antiq" nothing matched and the suggestions went silent — on exactly the
    // segment that is the point of this feature. A typo there does not fail; it mints a new
    // category that then appears in every picker built from the directory, forever.
    const ctx = withDirectory(DIR, ['refreshVendorCategoryList', 'esc', '_getV']);
    const dl = { innerHTML: '' };
    const fields = { 'v-cat-list': dl, 'v-group': { value: '' }, 'v-category': { value: '' } };
    ctx.document = { getElementById: (id) => fields[id] || null };
    const opts = () => (dl.innerHTML.match(/value="([^"]*)"/g) || [])
      .map(m => m.slice(7, -1).replace(/&amp;/g, '&'));

    fields['v-group'].value = 'Professional Services';
    ctx.refreshVendorCategoryList();
    ok(opts().length > 0, 'the first category is offered');
    ok(opts().every(v => v.indexOf(';') < 0),
       'and offered bare, so the first pick replaces the field as before');

    fields['v-category'].value = 'Art Appraiser; Antiq';
    ctx.refreshVendorCategoryList();
    has(opts().join('|'), 'Art Appraiser; Antiques & Furniture Appraiser',
        'the second suggestion carries what is already typed, so the whole-value match hits');
    lacks(opts().join('|'), '; Art Appraiser',
          'and a trade this row already lists is not offered again');

    // A firm whose trades cross groups is the case that most needs a suggestion.
    fields['v-group'].value = 'Professional Services';
    fields['v-category'].value = 'Art Appraiser; ';
    ctx.refreshVendorCategoryList();
    has(opts().join('|'), 'Mover',
        'beyond the first, the list is not scoped to the group — a cross-group trade is why you type a second');

    fields['v-category'].value = '';
    ctx.refreshVendorCategoryList();
    lacks(opts().join('|'), 'Mover',
          'but the FIRST category is still group-scoped, so nonsensical pairings stay awkward');
  }

  group('a typed list is tidied before it is stored');
  {
    const ctx = withDirectory(DIR, ['canonVendorCategories']);
    eq(ctx.canonVendorCategories('Art Appraiser; art appraiser'), 'Art Appraiser',
       'the same trade typed twice is stored once');
    eq(ctx.canonVendorCategories('art appraiser; MOVER'), 'Art Appraiser; Mover',
       'a case slip snaps onto the spelling already in the directory');
    eq(ctx.canonVendorCategories('Art Appraiser;; ;  Mover  '), 'Art Appraiser; Mover',
       'blanks and stray separators are dropped');
    eq(ctx.canonVendorCategories('Mover'), 'Mover', 'a single trade round-trips unchanged');
    eq(ctx.canonVendorCategories(''), '', 'and so does nothing at all');
    // ⚠ It must NOT correct a misspelling. Inventing a category nobody typed is worse than
    // storing the one they did, and a genuinely new trade has to stay creatable by typing it.
    eq(ctx.canonVendorCategories('Art Appraiser; Drone Photography'),
       'Art Appraiser; Drone Photography',
       'an unknown trade is preserved verbatim, so a new category can still be created');
    eq(ctx.canonVendorCategories('Movr'), 'Movr',
       'a near-miss is stored as typed rather than silently snapped to Mover');

    const src = require('fs').readFileSync(path.join(__dirname, '..', 'havellin.html'), 'utf8');
    const sv = src.slice(src.indexOf('function saveVendor()'), src.indexOf('function saveVendor()') + 2000);
    has(sv, 'canonVendorCategories(fields.category)',
        'and saveVendor runs it, or none of the above reaches the sheet');
  }

  group('a multi-trade firm is one vendor in its group header');
  {
    // The group buckets deliberately hold the SAME object under every trade it serves, so the
    // Vendors tree can list it under either heading. Concatenating those buckets counted the
    // firm once PER TRADE — and the group header is exactly where multi-category vendors
    // concentrate, because one row carries one group.
    const ctx = withDirectory(DIR, ['_vendorCounts', 'isActiveVendor']);
    ctx.vendorFit = () => '';
    const firm = DIR[1];                       // three appraisal trades, one row
    eq(ctx._vendorCounts([firm, firm, firm]).total, 3,
       'the counter itself counts what it is handed — which is why the dedupe has to happen first');
    eq(ctx._vendorCounts([firm]).total, 1, 'deduped, the firm is one vendor');

    const src = require('fs').readFileSync(path.join(__dirname, '..', 'havellin.html'), 'utf8');
    const tab = src.slice(src.indexOf('function renderVendorsTab()'),
                          src.indexOf('function renderVendorsTab()') + 4000);
    const cat = tab.indexOf('var allInGroup');
    ok(cat > 0, 'renderVendorsTab builds the group-wide list');
    const stanza = tab.slice(cat, tab.indexOf('_vendorCounts(allInGroup)'));
    has(stanza, 'seenInGroup',
        'and dedupes it by record identity before counting, or a three-trade firm reads as three vendors');
  }
};
