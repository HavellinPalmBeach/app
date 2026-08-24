'use strict';
// The estimate-store load race, reported 2026-08-24: "on my iPad the job plan is not
// loading at all for clients, but I can see them on my desktop."
//
// loadEstimateState hydrates estimateStore from localStorage SYNCHRONOUSLY and then
// fetches. On a machine that has used the app before the local cache is warm, so every
// gate reads a populated store immediately. On one with a cold cache — a new iPad,
// cleared data, or Safari evicting storage for a site not visited in a week — the store
// is {} when the Job Plan renders, and the gate asserted the estimate was unapproved.
// It is not unapproved. It is unread. Those are different states and the app now says so.

const { sandbox } = require('./harness');

const FNS = ['_appraiserVendors'];

module.exports = function ({ group, ok, eq, has, lacks }) {

  group('estimate store: an empty store has two meanings');
  {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.join(__dirname, '..', 'havellin.html'), 'utf8');

    has(src, "var _estStoreState = 'loading';",
        'the store starts in an explicitly unresolved state');
    has(src, "_estStoreState = 'ready';", 'a successful load resolves it');
    has(src, "_estStoreState = 'offline';", 'a FAILED load also resolves it — silence is not a state');

    // The gate must branch on the flag before it claims anything about approval.
    const gate = src.slice(src.indexOf('var estRec = estimateStore[jobId];'));
    const upToApproved = gate.slice(0, gate.indexOf('Job Plan generates once'));
    has(upToApproved, "_estStoreState === 'loading'",
        'the loading case is handled BEFORE the unapproved message can be reached');
    has(upToApproved, "_estStoreState === 'offline'",
        'and so is the unreachable case');
    has(upToApproved, 'No estimate exists for this job yet',
        'a genuinely missing estimate says so, rather than blaming approval');
  }

  group('estimate store: the screen redraws when the data lands');
  {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.join(__dirname, '..', 'havellin.html'), 'utf8');

    // The original bug was not only the wrong message — it was that the message never
    // corrected itself. The fetch landed and called rebuildDropdowns() alone, so the tab
    // stayed wrong until you navigated away and back.
    const landed = src.slice(src.indexOf('function _estStoreLanded()'));
    has(landed.slice(0, 600), 'loadJobPlanTab',
        'the Job Plan is re-rendered when estimates arrive');
    has(landed.slice(0, 600), 'renderInventoryTab',
        'so is the Inventory tab, which reads the same store for its import panel');

    // Both success and failure must call it, or one path leaves the UI stuck.
    const loader = src.slice(src.indexOf('function loadEstimateState()'));
    const body = loader.slice(0, loader.indexOf('function loadEstimateForJob'));
    // Count CALLS, not the declaration — `function _estStoreLanded()` matches too.
    eq((body.match(/(?<!function )_estStoreLanded\(\);/g) || []).length, 2,
       'called on BOTH the success and the failure path');
  }

  group('appraisers come from the vendor directory');
  {
    const ctx = sandbox({
      fns: ['_appraiserVendors', 'vendorCats'],
      vars: ['APPRAISER_DIR_CATEGORIES'],
      stubs: {
        vendorDirectory: [
          { vendor_name: 'Zeta Art Appraisals', category: 'Art Appraiser', status: 'Active' },
          { vendor_name: 'Acme Jewelry',        category: 'Jewelry & Watch Appraiser' },
          { vendor_name: 'Multi Trade',         category: 'Painting; Wine Appraiser' },
          { vendor_name: 'Not An Appraiser',    category: 'Junk Removal & Dumpster' },
          { vendor_name: 'Retired Appraiser',   category: 'Art Appraiser', status: 'Do Not Use' },
        ],
      },
    });

    const names = ctx._appraiserVendors().map((v) => v.vendor_name);
    eq(names, ['Acme Jewelry', 'Multi Trade', 'Zeta Art Appraisals'],
       'appraiser categories only, sorted by name');
    lacks(names.join(), 'Not An Appraiser', 'a hauler is not offered as an appraiser');
    lacks(names.join(), 'Retired Appraiser',
          'a vendor marked Do Not Use is never offered — we walked away for a reason');
    ok(names.indexOf('Multi Trade') >= 0,
       'a multi-trade vendor qualifies on its SECOND listed category');
  }

  group('appraisers: an empty directory says why');
  {
    const ctx = sandbox({
      fns: ['_appraiserVendors', 'vendorCats', '_apprPickerHtml'],
      vars: ['APPRAISER_DIR_CATEGORIES'],
      stubs: { vendorDirectory: [], INV_APPRAISER_CREDS: [] },
    });
    const html = ctx._apprPickerHtml();
    has(html, 'No appraisers in the Vendor Directory yet',
        'an empty directory explains itself rather than rendering an empty dropdown');
    lacks(html, '<select', 'and offers no control there is nothing to put in');
  }
};
