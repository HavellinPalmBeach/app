// Step 124 — Use a sale (2026-11-02; Anthony, off the eBay developer account: eBay holds its sold history back from apps and gives it to
// its sellers in Seller Hub's Product Research; he took "Rename to 'Use a sale'"), with the desk audit's Ask 14 (answered 2026-10-28:
// a sale more than 15% from the line's figure is asked about once: use the sale, or keep the figure and file the sale only).
//
// Drives the REAL page with an active probate estate whose dining room holds three pairs of sterling candelabra, each valued by
// Agent Two at $4,200 from auction comps. Job Admin & Inv through its own nav button; each record opened by its own ▾:
//   A. The form reads Use a sale and says where a sale comes from. A LiveAuctioneers sale at $1,100 asks once, naming both figures;
//      OK: the line's value is $1,100, the person's, from auction comps.
//   B. An eBay sale at $1,100 on the second pair, Cancel: $4,200 and Agent Two's source stand, the sale filed first.
//   C. An eBay sale at $3,900 on the third: nothing asked, $4,200 kept, its source online comps, the venue eBay.
//   D. More ▾ → Court Inventory: the Basis column reads auction comps, auction comps and online comps.
//   At 1440 and 390 px no horizontal overflow; zero page errors throughout.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step124.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
const SYNC = 'https://sync.example.test/exec';
const J = 12401;
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');
const EBAY = 'https://www.ebay.com/itm/123456789012';
const LA = 'https://www.liveauctioneers.com/item/77';

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
    let sheet = {};
    await ctx.route(SYNC + '**', async (r) => {
      const req = r.request();
      const json = (o) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
      if (req.method() === 'POST') {
        let body = {}; try { body = JSON.parse(req.postData() || '{}'); } catch (e) {}
        if (body.action === 'getSubfolders') return json({ ok: true, subfolders: null });
        return json({ ok: true });
      }
      if (/action=loadMedia/.test(req.url())) return json({ ok: true, media: sheet });
      return json({ ok: true });
    });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    const said = []; let answer = true;
    p.on('dialog', async (d) => { said.push(d.message()); if (d.type() === 'confirm' && !answer) await d.dismiss(); else await d.accept(); });
    const section = async (name, body) => {
      console.log('\n## ' + name);
      try { await body(); } catch (e) { fail++; console.log('  ✗ ' + name + ' threw: ' + String(e && e.message || e).split('\n')[0]); }
    };
    const vis = (sel) => p.locator(sel).first().isVisible().catch(() => false);
    const press = async (sel, what) => {
      const n = await p.locator(sel).count();
      const v = n >= 1 && await vis(sel);
      ok(v, (what || sel) + ' — on screen (' + n + ')');
      if (v) { await p.locator(sel).first().click({ timeout: 5000 }).catch((e) => ok(false, (what || sel) + ' — ' + e.message.split('\n')[0])); await p.waitForTimeout(700); }
      return v;
    };
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const line = (id) => p.evaluate(([j, id]) => { const r = (_photoRefs[j] || []).find((x) => x.stableId === id) || {};
      const c = (r.valComps || [])[0] || {};
      return { fmv: r.fmv, src: r.valSource, by: r.valuedBy, rev: !!r.reviewed, first: [c.price, c.venue, c.by] }; }, [J, id]);
    const viewerOpen = () => p.evaluate(() => { const o = document.getElementById('doc-viewer-modal'); return !!o && o.style.display === 'flex'; });

    await p.goto(APP); await p.waitForTimeout(1600);
    sheet = await p.evaluate(([J, SYNC]) => {
      SHEETS_SYNC_URL = SYNC;
      window.print = function () {};
      try { localStorage.setItem('hav_device_user', 'Anthony Graziano'); } catch (e) {}
      const T = Date.now() - 2 * 86400000;
      jobs.unshift({ id: J, hvlId: 'HVL-2611-US1', name: 'Walter Pemberton', svc: 'probate', matterType: 'probate', addr: '9 Banyan Rd', city: 'Palm Beach', zip: '33480',
        executor: 'Grace Pemberton', executorRole: 'Personal Representative', executorEmail: 'grace@example.com', deathDate: '2026-07-20', executorAuth: 'received',
        probateAttyName: 'Ann Lowe', probateAttyEmail: 'ann@lowe.law', probateCase: '50-2026-CP-005555', docTier: 'values', gate706: 'no',
        status: 'active', won: true, wonAt: '2026-10-01', approved: true, tc: 'Ashley Jerome', created: '2026-09-28', start: '2026-10-12', activatedOn: '2026-10-10',
        agrApproved: true, agrSent: true, agrSigned: true,
        driveFolder: 'https://drive.google.com/drive/folders/R' + J, driveSubfolders: { 'Estate Inventory': 'INV_US', 'As-Found Record': 'AF_US' }, at: {}, docState: {},
        payments: [{ uid: 'd' + J, stage: 'deposit', amount: 15000, receivedOn: '2026-10-08', method: 'wire', clearedOn: '2026-10-08' }] });
      estimateStore[J] = { approved: true, submitted: true, approvedBy: 'Anthony Graziano', savedAt: T,
        estimate: { jobId: J, svc: 'probate', havellinTotal: 30000, fixedPrice: true, fixedAmount: 30000, fixedLines: true, totTC: 80, totPS: 120, days: 6,
          vendors: [], prepItems: [], rooms: [{ idx: 3, name: 'Dining Room', st: 'in', vol: 3, cplx: 3 }] } };
      const pair = (id, n) => ({ stableId: id, itemNo: 30 + n, qty: 1, label: 'inventory', collId: null, roomIdx: 3, seq: n, status: 'uploaded', ts: T + n * 60000,
        filename: 'HVL-2611-US1_Dining_INV_' + n + '.jpg', driveFileId: 'F_' + id, driveFileUrl: 'https://drive.google.com/file/d/F_' + id + '/view',
        objectName: 'Sterling silver candelabra, pair', namedBy: 'agent', agentConf: 'high', agentAt: T + n * 60000 + 5000, category: 'Silver',
        disposition: 'Sell', channel: 'Kodner Galleries', condition: 'Good', condBy: 'desk', updatedAt: T + n * 60000 + 5000,
        fmv: 4200, valLow: 3800, valHigh: 4600, valuedBy: 'agent', valConf: 'medium', valSource: 'Auction comps', valDate: '2026-07-20',
        valNote: 'Two sold pairs at regional houses, 2025', valNameAt: 'Sterling silver candelabra, pair', valAgentAt: T + n * 60000 + 9000,
        valComps: [{ title: 'Pair of sterling candelabra', venue: 'Hindman', saleDate: '2025-05', price: 4400, url: 'https://hindmanauctions.com/items/1', kind: 'sold', by: 'agent' }] });
      _photoRefs[J] = [
        { stableId: 'af1', label: 'before', roomIdx: 3, seq: 1, collId: null, status: 'uploaded', ts: T, updatedAt: T, filename: 'HVL-2611-US1_Dining_before_1.jpg',
          driveFileId: 'F_AF', driveFileUrl: 'https://drive.google.com/file/d/F_AF/view' },
        pair('far', 1), pair('keep', 2), pair('near', 3)];
      savePhotoRefs(J); saveJobs(); localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore));
      const out = {}; out[J] = { items: JSON.parse(localStorage.getItem('hav_media_' + J) || '[]') };
      return out;
    }, [J, SYNC]);

    const toDesk = async () => {
      await p.evaluate((id) => { setCurrentJob(id); populateInventorySelect(); }, J);
      await p.click('.nb[onclick*="\'inventory\'"]'); await p.waitForTimeout(900);
      const cur = await p.evaluate(() => (document.getElementById('inv-job') || {}).value);
      if (String(cur) !== String(J)) { await p.selectOption('#inv-job', String(J)); await p.waitForTimeout(1300); }
      if (await p.locator('#panel-inventory button[onclick="setInvWhen(\'all\')"]').count()) { await p.click('#panel-inventory button[onclick="setInvWhen(\'all\')"]'); await p.waitForTimeout(600); }
    };
    const open = async (id) => {
      if (!(await p.evaluate((id) => !!document.getElementById('av-wp-title-' + id), id))) { await p.click('button[onclick="_invToggleOpen(\'' + id + '\')"]'); await p.waitForTimeout(700); }
      return p.evaluate((id) => !!document.getElementById('av-wp-title-' + id), id);
    };
    // The real form: open it by its summary, type the sale, press Use this sale.
    const useSale = async (id, price, url, venue) => {
      ok(await open(id), id + ': its record is open');
      const isOpen = await p.evaluate((id) => { const d = document.querySelector('details:has(#av-wp-title-' + id + ')'); return !!(d && d.open); }, id);
      if (!isOpen) await press('details:has(#av-wp-title-' + id + ') > summary', id + ': Use a sale');
      await p.fill('#av-wp-title-' + id, 'Pair of sterling candelabra, Gorham');
      await p.fill('#av-wp-price-' + id, String(price));
      await p.fill('#av-wp-date-' + id, '2026-09-14');
      if (venue) await p.fill('#av-wp-venue-' + id, venue);
      await p.fill('#av-wp-url-' + id, url);
      await press('details:has(#av-wp-title-' + id + ') button:has-text("Use this sale")', id + ': Use this sale');
      await p.waitForTimeout(500);
    };

    // ── A ─────────────────────────────────────────────────────────────────────────────────────
    await section('A. The form is Use a sale; a sale 74% below the figure asks once, and OK uses it', async () => {
      await toDesk();
      ok(await open('far'), 'the first pair\'s record is open');
      const summary = await p.evaluate(() => { const s = document.querySelector('details:has(#av-wp-title-far) > summary'); return s ? s.textContent.trim() : ''; });
      eq(summary, 'Use a sale', '⚠ the form reads Use a sale');
      await press('details:has(#av-wp-title-far) > summary', 'Use a sale');
      const hint = await p.evaluate(() => { const d = document.querySelector('details:has(#av-wp-title-far) .av-sale-hint'); return d ? d.textContent.trim() : ''; });
      eq(hint, 'A sold price you found: eBay’s Product Research (in Seller Hub), WorthPoint or an auction house’s results. Its link says where it came from.', 'and says where a sale comes from');
      ok(await vis('details:has(#av-wp-title-far) .av-sale-hint'), 'on screen');
      const n0 = said.length; answer = true;
      await useSale('far', 1100, LA, 'Kodner Galleries');
      const asked = said.slice(n0);
      eq(asked.length, 1, '⚠⚠ asked once');
      has(asked[0], 'This sale ($1,100) is 74% below the line\'s figure ($4,200).', 'naming both figures');
      has(asked[0], 'OK: use the sale. The line\'s value becomes $1,100, from auction comps.', 'and what OK does');
      eq(await line('far'), { fmv: 1100, src: 'Auction comps', by: 'desk', rev: true, first: [1100, 'Kodner Galleries', 'desk'] },
         '⚠⚠ OK: $1,100, the person\'s, from auction comps, the sale first, the line reviewed');
    });

    // ── B ─────────────────────────────────────────────────────────────────────────────────────
    await section('B. Cancel keeps $4,200 and Agent Two\'s source, and files the sale only', async () => {
      const n0 = said.length; answer = false;
      await useSale('keep', 1100, EBAY);
      eq(said.slice(n0).length, 1, 'asked once');
      eq(await line('keep'), { fmv: 4200, src: 'Auction comps', by: 'agent', rev: true, first: [1100, 'eBay', 'desk'] },
         '⚠⚠ Cancel: the figure and its source stand, the eBay sale filed first (never relabelling the figure, ACC-04)');
      answer = true;
    });

    // ── C ─────────────────────────────────────────────────────────────────────────────────────
    await section('C. Within 15%: nothing asked, the figure kept, the sale names its source', async () => {
      const n0 = said.length;
      await useSale('near', 3900, EBAY);
      eq(said.slice(n0), [], 'nothing asked at $3,900 against $4,200');
      eq(await line('near'), { fmv: 4200, src: 'Online comps', by: 'agent', rev: true, first: [3900, 'eBay', 'desk'] },
         '⚠ the figure kept, from online comps, the venue eBay off the link');
      eq(await overflow(), 0, 'no horizontal overflow at 1440 with the form open');
    });

    // ── D ─────────────────────────────────────────────────────────────────────────────────────
    await section('D. More ▾ → Court Inventory: the Basis column says where each figure came from', async () => {
      await p.evaluate(() => { _invOpen = {}; renderInventoryTab(); }); await p.waitForTimeout(400);
      if (!(await vis('#inv-more button[onclick="printCourtInventory(' + J + ')"]'))) await press('#inv-more > summary', 'More ▾');
      await press('#inv-more button[onclick="printCourtInventory(' + J + ')"]', 'Court Inventory');
      ok(await viewerOpen(), 'the Court Inventory is on screen');
      const rows = await p.evaluate(() => [...document.querySelectorAll('#doc-viewer-body tr')].map((tr) => tr.textContent.replace(/\s+/g, ' ').trim())
        .filter((t) => /Sterling silver candelabra/.test(t)));
      eq(rows.length, 3, 'three pairs on the schedule');
      eq(rows.map((t) => (t.match(/\$[\d,]+(?:\.\d\d)?/) || [''])[0]), ['$1,100', '$4,200', '$4,200'], 'their figures, in item order');
      eq(rows.map((t) => /auction comps/.test(t) ? 'auction comps' : (/online comps/.test(t) ? 'online comps' : '?')),
         ['auction comps', 'auction comps', 'online comps'], '⚠⚠ the basis follows each sale\'s link, and Cancel left Agent Two\'s');
      await press('#doc-viewer-modal button[onclick="closeDocViewer()"]', 'Close');
      await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(600);
      ok(await open('near'), 'a record open on a phone');
      eq(await overflow(), 0, 'no horizontal overflow at 390');
    });

    eq(errs, [], 'zero page errors');
    console.log('\n' + pass + ' passed, ' + fail + ' failed');
    await b.close();
    process.exit(fail ? 1 : 0);
  } catch (e) {
    console.log('step 124 threw: ' + (e && e.stack || e));
    if (b) await b.close().catch(() => {});
    process.exit(1);
  }
})();
