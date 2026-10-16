// Step 81 — the referral-fee disclosure (2026-10-16, Q62 with Q21; Anthony: "we will never charge the client a
// percentage, but we may have referral agreements with vendors like auction houses that will pay us a referral fee").
//
// Drives the REAL page: the Vendors tab's + Add Vendor form with its new "Pays Havellin a referral fee" select, saved
// through the real Save Vendor button against a routed directory URL and read back off the rendered card; the real
// intake for a probate estate and a living client; the estimate, the agreement and the Disposition Ledger printed
// through the real print path and read back. The estimate's auction-house row carries the note and the hauler's does
// not; both agreements carry the disclosure and neither says it takes no percentage; the ledger names the ticked firm.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step81.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');
const VURL = 'https://vendors.example.test/exec';
const T = (h) => String(h).replace(/<[^>]+>/g, ' ').replace(/&rsquo;|&#8217;/g, '’').replace(/&amp;/g, '&').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ');

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
    const posts = [];
    await ctx.route(VURL + '**', async (r) => {
      const req = r.request();
      if (req.method() === 'POST') { posts.push(JSON.parse(req.postData() || '{}')); return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, success: true, _row: 7, uid: 'u-7' }) }); }
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, vendors: [] }) });
    });
    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    p.on('dialog', async (d) => { await d.accept(); });
    await p.goto(APP); await p.waitForTimeout(1600);
    await p.evaluate((u) => { VENDOR_SYNC_URL = u; window.__prints = []; window.print = function () { const pt = document.getElementById('print-target'); window.__prints.push(pt ? pt.innerHTML : ''); }; }, VURL);

    // ── A. The directory: the real form, the real Save ───────────────────────────────────────
    console.log('\n## A. The vendor form\'s "Pays Havellin a referral fee"');
    await p.click('.nb:has-text("Vendors")'); await p.waitForTimeout(300);
    await p.click('#panel-vendors button:has-text("+ Add Vendor")'); await p.waitForTimeout(300);
    const sel = await p.evaluate(() => { const e = document.getElementById('v-reffee'); return e ? { shown: e.checkVisibility(), opts: Array.from(e.options).map((o) => o.value + '=' + o.text) } : null; });
    ok(!!sel && sel.shown, 'the select is on the open form');
    ok(!!sel && sel.opts.length === 3 && /^=Not recorded/.test(sel.opts[0]) && /^Yes=/.test(sel.opts[1]) && /^No=/.test(sel.opts[2]), 'Not recorded / Yes / No (' + JSON.stringify(sel && sel.opts) + ')');
    await p.fill('#v-name', 'Palm Beach Auctions');
    await p.evaluate(() => { const g = document.getElementById('v-group'); const o = Array.from(g.options).find((x) => /Liquidation/.test(x.text)) || Array.from(g.options).find((x) => x.value); g.value = o.value; if (g.onchange) g.onchange(); });
    await p.fill('#v-category', 'Auction House');
    await p.selectOption('#v-status', 'Active');
    await p.selectOption('#v-reffee', 'Yes');
    await p.click('#v-save-btn'); await p.waitForTimeout(900);
    const saved = await p.evaluate(() => { const v = vendorDirectory.find((x) => x.vendor_name === 'Palm Beach Auctions'); return v ? { fee: v.referral_fee, pays: vendorPaysReferral(v) } : null; });
    ok(!!saved && saved.fee === 'Yes' && saved.pays === true, 'saved with referral_fee Yes, and the predicate reads it (' + JSON.stringify(saved) + ')');
    ok(posts.some((x) => x.type === 'addVendor' && x.payload && x.payload.fields && x.payload.fields.referral_fee === 'Yes'), 'the sheet was sent referral_fee: Yes');
    // The cards draw only once their category is opened: press the real category header.
    const gh = await p.$('#vendors-list div[onclick^="toggleVendorGroup"]'); if (gh) { await gh.click(); await p.waitForTimeout(300); }
    const ch = await p.$('#vendors-list div[onclick^="toggleVendorCat"]'); if (ch) { await ch.click(); await p.waitForTimeout(300); }
    const card = await p.evaluate(() => { const l = document.getElementById('vendors-list'); return l ? l.textContent.replace(/\s+/g, ' ') : ''; });
    has(card, 'Palm Beach Auctions', 'the card is on the list');
    has(card, 'Referral fee Yes', 'the rendered card shows it');

    // ── B. A probate estate and a living client, through the real intake ─────────────────────
    console.log('\n## B. The estimate, both agreements, the ledger');
    const future = (d) => { const x = new Date(); x.setDate(x.getDate() + d); while (x.getDay() === 0 || x.getDay() === 6) x.setDate(x.getDate() + 1); return x.toISOString().slice(0, 10); };
    const WT = future(10), START = future(24);
    const intake = (svc, patch) => p.evaluate(([svc, patch, wt, start]) => {
      document.getElementById('btn-add-client').click();
      const set = (id, v) => { const e = document.getElementById(id); if (!e) return; e.value = v; if (e.onchange) e.onchange(); if (e.oninput) e.oninput(); };
      const pick = (id) => { const e = document.getElementById(id); const o = e && Array.from(e.options).find((x) => x.value); if (o) { e.value = o.value; if (e.onchange) e.onchange(); } };
      set('i-svc', svc); toggleIntakeFields();
      set('i-fname', patch.fname); set('i-lname', patch.lname); set('i-addr', '1 Ocean Blvd'); set('i-city', 'Palm Beach'); set('i-zip', '33480'); set('i-sqft', '4000');
      pick('i-ptype'); pick('i-src'); set('i-walkthrough', wt); set('i-start', start);
      Object.keys(patch.fields || {}).forEach((k) => set(k, patch.fields[k]));
      saveIntake();
      const j = jobs[0]; if (!j || j.svc !== svc) return { err: (document.getElementById('i-fb') || {}).textContent };
      j.won = true; j.status = 'won'; j.wonBy = 'Anthony Graziano'; j.agrApproved = true; j.agrApprovedBy = 'Anthony Graziano'; j.agrApprovedAt = _todayStr();
      return j.id;
    }, [svc, patch, WT, START]);
    const idE = await intake('probate', { fname: 'Harold', lname: 'Pemberton', fields: { 'i-executor-fname': 'Catherine', 'i-executor-lname': 'Hale', 'i-executor-role': 'Personal Representative',
      'i-executor-phone': '(561) 555-0188', 'i-executor-email': 'cph@example.com', 'i-date-of-death': '2026-08-14', 'i-matter-type': 'probate', 'i-gate-706': 'no', 'i-doc-tier': 'values',
      'i-probate-atty-fname': 'Robert', 'i-probate-atty-lname': 'Castellano', 'i-probate-atty-firm': 'Castellano & Reed', 'i-probate-atty-phone': '(561) 555-0170', 'i-probate-atty-email': 'r@example.com', 'i-probate-case': '50-2026-CP-004412' } });
    ok(typeof idE === 'number', 'the estate was created (' + JSON.stringify(idE) + ')');
    await p.waitForTimeout(400);
    const idL = await intake('downsizing_move', { fname: 'Margaret', lname: 'Whitfield', fields: { 'i-phone': '(561) 555-0142', 'i-email': 'm@example.com', 'i-dest-sqft': '2000' } });
    ok(typeof idL === 'number', 'the living client was created (' + JSON.stringify(idL) + ')');
    await p.waitForTimeout(400);

    const estOf = (id, svc) => ({ jobId: id, svc: svc, totTC: 40, totPS: 80, tcRate: 150, psRate: 100, tcFee: 6000, psFee: 8000, pkgCost: 0, havellinTotal: 14000, discountPct: 0, discountAmt: 0,
      prem: false, fixedPrice: false, rush: false, rushExPrepFee: true, collections: [{ name: 'Silver service', disp: 'auction', cost: 0 }], rooms: [{ name: 'Living Room' }], vehicles: [], prepItems: [], preparedBy: 'Anthony Graziano', docScope: 'full',
      vendors: [{ type: 'Auction House', cost: 0, lid: 'a' }, { type: 'Junk Removal / Hauling', cost: 800, lid: 'b' }] });
    const print = async (id, kind, svc) => {
      await p.evaluate(([id, e, kind]) => { estimateStore[id] = { approved: true, approvedBy: 'Anthony Graziano', approvedAt: _todayStr(), estimate: e }; window.__prints = []; docAction(id, kind, 'print'); }, [id, estOf(id, svc), kind]);
      await p.waitForTimeout(500); const got = await p.evaluate(() => window.__prints[0] || ''); await p.waitForTimeout(700); return got;
    };
    const est = T(await print(idE, 'estimate', 'probate'));
    ok(est.length > 3000, 'the client estimate printed through the real path (' + est.length + ')');
    has(est, 'Auction House Havellin may receive a referral fee from this vendor, paid out of the vendor’s own commission and never from your proceeds.', 'the auction-house row carries the note');
    lacks(est, 'Junk Removal / Hauling Havellin may receive', 'the hauler’s row does not');
    has(est, 'Where that partner pays Havellin a referral fee, it comes out of the partner’s fee, not your proceeds.', 'the disposition sentence carries the short form');
    const agrE = T(await print(idE, 'agreement', 'probate'));
    has(agrE, '5.4 No Purchase by Havellin; Referral Fees', 'the estate form’s §5.4 heading');
    has(agrE, 'will take no part of the proceeds of any sale of that property.', 'no part of the proceeds');
    has(agrE, 'Havellin may receive a referral fee from a vendor it recommends.', 'and the disclosure');
    lacks(agrE, 'no commission, percentage or other share', 'the false sentence is gone');
    const agrL = T(await print(idL, 'agreement', 'downsizing_move'));
    has(agrL, "Contractor takes no part of the Client's sale proceeds.", 'the standard form’s §8 sentence');
    has(agrL, 'Contractor may receive a referral fee from a vendor it recommends.', 'and its disclosure');
    lacks(agrL, 'does not take a percentage of auction or sale proceeds', 'the old §8 sentence is gone');

    const ledger = T(await p.evaluate((id) => {
      const it = (k, o) => Object.assign({ stableId: id + '_' + k, label: 'inventory', roomIdx: 1, ts: 1, status: 'uploaded', category: 'Furniture', driveFileId: 'f' + k, driveFileUrl: 'https://drive.google.com/file/d/f' + k + '/view' }, o || {});
      _photoRefs[id] = [it('a', { objectName: 'Chesterfield sofa', disposition: 'Auction', channel: 'palm beach auctions', gross: 4000, fees: 400, dispDate: _todayStr() }),
                        it('b', { objectName: 'Bookcase', disposition: 'Donate', channel: 'Goodwill', dispDate: _todayStr() })];
      savePhotoRefs(id); window.__prints = []; printDispositionLedger(id);
      return new Promise((res) => setTimeout(() => res(window.__prints[0] || ''), 500));
    }, idE));
    ok(ledger.length > 500, 'the Disposition Ledger printed (' + ledger.length + ')');
    has(ledger, 'Palm Beach Auctions pays Havellin a referral fee out of its own commission; no figure here is reduced by it.', '⚠ the ticked firm is named, by the directory’s own name, off a line that typed it in lower case');
    lacks(ledger, 'Goodwill pays Havellin', 'the charity is not');
    has(ledger, 'Havellin charges no commission on sales', 'and the footer still says it charges the estate none');
    await p.waitForTimeout(800);

    ok(errs.length === 0, 'zero page errors' + (errs.length ? ' — ' + errs.slice(0, 2).join(' | ') : ''));
  } catch (e) {
    fail++; console.log('  ✗ threw: ' + (e && e.stack || e));
  } finally {
    if (b) await b.close();
  }
  console.log('\nstep81: ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
