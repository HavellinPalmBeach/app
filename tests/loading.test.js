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

  // ── The Inventory tab rendered without ever hydrating what it was rendering ──
  group('inventory: the tab loads the manifest it is about to draw');
  {
    // Reported as "all of the items i added from the estimate walkthrough are now back in
    // the 'from the estimate walkthrough' section … it doesn't seem to be saving."
    // Nothing was failing to save. loadPhotoRefs was called from exactly ONE place in the
    // app — loadJobPlanTab — so selecting a client on the Inventory tab after a page
    // reload, without opening that client's Job Plan first, drew an empty manifest against
    // a perfectly good localStorage, and _importedSourceSet re-offered every import.
    const ctx = sandbox({ fns: ['_invEnsureLoaded', 'loadPhotoRefs', '_loadPendingPhotoData',
                                '_pendingPhotoKey'],
                          vars: ['_invHydrated'],
                          stubs: { _photoRetryData: {} } });
    ctx.__store['hav_media_4'] = JSON.stringify([
      { stableId: 'v1', label: 'inventory', objectName: '2026 Bentley SUV' },
      { stableId: 'c1', label: 'inventory', objectName: 'Coin Collection' },
    ]);
    eq(ctx._photoRefs[4], undefined, 'nothing is in memory on a fresh load');
    ctx._invEnsureLoaded(4);
    eq((ctx._photoRefs[4] || []).length, 2, 'hydrating pulls this device\'s copy back');

    // Once per session: the in-memory copy is authoritative after that, because every
    // mutation writes through savePhotoRefs immediately.
    ctx._photoRefs[4].push({ stableId: 'x', label: 'inventory' });
    ctx._invEnsureLoaded(4);
    eq(ctx._photoRefs[4].length, 3, 'a second call does not clobber newer in-memory work');
    ctx._invEnsureLoaded(0);
    ok(true, 'and no job id is a no-op rather than a throw');
  }

  group('inventory: selecting a client also pulls from the server');
  {
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'havellin.html'), 'utf8');
    has(src, 'onchange="onInventoryJobChange()"',
        'the job picker runs the cloud refresh, not just a redraw');
    const f = src.slice(src.indexOf('function onInventoryJobChange('));
    has(f.slice(0, 300), '_invRefreshFromCloud()',
        'because the tab-open refresh bails on "Select client" — the one moment a job '
        + 'becomes current was the one moment nothing fetched');
    const r = src.slice(src.indexOf('function renderInventoryTab('));
    has(r.slice(0, 900), '_invEnsureLoaded(jobId)', 'and the render hydrates before it draws');
  }

  group('inventory: the destructive write waits for the full picture');
  {
    // saveMedia MERGES per item server-side, so a partial list loses nothing. The workbook
    // write REBUILDS the sheet from the rows it is handed, so a partial list silently
    // truncates the document that goes to the attorney — which is what happened: a
    // three-item manifest was rendered as one, and the next edit rewrote the workbook
    // with one row. Only the projection is gated; the record never is.
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'havellin.html'), 'utf8');
    const f = src.slice(src.indexOf('function _scheduleInventorySync('));
    const body = f.slice(0, f.indexOf('\nfunction buildMediaPayload'));
    const media = body.indexOf("type: 'saveMedia'");
    const wb = body.indexOf("type: 'saveInventory'");
    ok(media >= 0 && wb > media, 'the record is written before the projection');
    ok(body.indexOf('_invCloudSeen[jobId]') > media && body.indexOf('_invCloudSeen[jobId]') < wb,
       'and the workbook write is gated on having read the server copy');
    lacks(body.slice(0, media), '_invCloudSeen', 'the manifest write is NOT gated');
    has(body, 'Workbook held', 'a held workbook says so rather than failing silently');
  }
};
