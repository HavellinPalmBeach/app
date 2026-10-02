// Step 49 — P17 (W1, pricing and billing): Anthony's answers 1, 5, 6 and 10 of 2026-10-01.
//
// Drives the REAL page through its own controls: Build Estimate (the room checkboxes, the Premium and Fixed price
// toggles, the valuation card's picker, cost box and +, the declutter box, Save Estimate, a room's volume and
// complexity boxes), the Job Plan's hours form (its boxes and Save Hours Entry), the dashboard's Change Orders card
// (+ New, the modal, Create Change Order), the band's ACH payment link and the documents' View and Print. The
// Vendor Directory and the jobs backend are answered by routes, as the real Apps Script would answer them. What is
// seeded is state a person could not type in one sitting (a won, signed, funded job with a confirmed team).
//
//   A. Premium is the rates only: the toggle says so, the hours do not move, the rates do; an appraiser, an online
//      auction house and an estate sale company each book their own hours on a Premium estate (2.0, 6.0, 1.5)
//   B. a volume of 5 typed into a room leaves the complexity typed beside it alone
//   C. Home Prep: 5.5 declutter hours bill $825 under a total that counts exactly that; 5.3 is refused by the hint
//      and by Save Estimate, under the Home Sale Preparation Fee's name
//      ⚠ RESTATED 2026-10-02 (P18, Anthony's answer B; re-measured on the page): estimates round up to whole hours, so 5.5
//      bills 6 × $150 = $900 under a $6,900 total, and 5.3 is flagged beside the box and saved as 6, never refused
//   D. the hours log refuses 2.3 hours and logs 2.25, the second concierge's row included; the boxes step by 0.25
//      ⚠ RESTATED 2026-10-02 (P18): half hours for everyone — 2.3 and 2.25 are refused, 2.5 and 1.5 logged; the boxes step by 0.5
//   E. a change order refuses 2.3 hours and records 2.25
//      ⚠ RESTATED 2026-10-02 (P18): whole hours — 2.3 and 2.5 are refused, 3 is recorded; the boxes step by 1
//   F. the estimate, the agreement and each invoice print the cents and add up to them; the ACH link asks for the
//      outstanding figure to the cent (RESTATED 2026-10-02, P18: on whole hours a Premium estimate is whole dollars, so A
//      types a 3% preferred-client discount into the estimate for the cents these read)
//   G. overflow at 1440 and 390; no page errors
//
//   NODE_PATH=/opt/node22/lib/node_modules node tests/browser/step49.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');
// Money as a person reads it: whole dollars as "$900", cents whenever there are any ("$971.25").
const cents = (n) => Math.round(Number(n) * 100);
const money = (n) => { const c = cents(n); const w = Math.floor(Math.abs(c) / 100).toLocaleString('en-US'), r = Math.abs(c) % 100;
  return (c < 0 ? '-' : '') + '$' + w + (r ? '.' + String(r).padStart(2, '0') : ''); };
// The 50/25/25 split, worked out here in whole cents (half a cent away from zero), never by the page.
const split = (t) => { const T = cents(t); const d = Math.round(T / 2), m = Math.round(T / 4); return [d / 100, m / 100, (T - d - m) / 100]; };

const VENDORS_URL = 'https://vendors.example.test/exec';
const SYNC = 'https://script.google.com/macros/s/FAKE-P17/exec';
const DIR = [
  { vendor_name: 'Brushworks Painting', category_group: 'Property Preparation', category: 'Painting', status: 'Active', _row: 2 },
  { vendor_name: 'Gallery Fine Art Appraisals', category_group: 'Asset Liquidation & Valuation', category: 'Art Appraiser', status: 'Active', _row: 3 },
  { vendor_name: 'Click Auctions', category_group: 'Asset Liquidation & Valuation', category: 'Online Auction House', status: 'Active', _row: 4 },
  { vendor_name: 'Palm Estate Sales', category_group: 'Asset Liquidation & Valuation', category: 'Estate Sale Company', status: 'Active', _row: 5 },
];
const HOUSE = ['Living Room', 'Kitchen', 'Dining Room', 'Family Room / Great Room', 'Primary Suite', 'Bedroom 2', 'Bedroom 3'];

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
    await ctx.addInitScript(([vu, dir]) => {
      try { localStorage.setItem('hav_vendor_url', vu); localStorage.setItem('hav_vendor_dir', JSON.stringify(dir)); } catch (e) {}
    }, [VENDORS_URL, DIR]);
    await ctx.route(VENDORS_URL + '**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ vendors: DIR }) }));
    const posts = [];
    await ctx.route(SYNC + '*', async (route) => {
      let body = {}; try { body = JSON.parse(route.request().postData() || '{}'); } catch (e) {}
      posts.push(body);
      if (body.action === 'stripeLink') return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ ok: true, url: 'https://buy.stripe.com/test_' + body.jobId, linkId: 'plink_' + body.jobId }) });
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    });
    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    const dialogs = []; p.on('dialog', async (d) => { dialogs.push(d.message()); await d.accept(); });
    await p.goto(APP); await p.waitForTimeout(1800);
    await p.evaluate(() => { window.open = function () { return null; }; window.__prints = [];
      window.print = function () { const pt = document.getElementById('print-target'); window.__prints.push(pt ? pt.innerHTML : ''); }; });

    const section = async (name, body) => {
      console.log('\n## ' + name);
      await p.evaluate(() => document.querySelectorAll('.modal-overlay').forEach((m) => { if (getComputedStyle(m).display !== 'none') m.style.display = 'none'; }))
        .catch(() => {});
      try { await body(); } catch (e) { fail++; console.log('  ✗ ' + name + ' threw: ' + String(e && e.message || e).split('\n')[0]); }
    };
    const vis = (sel) => p.locator(sel).first().isVisible().catch(() => false);
    const press = async (sel, what) => {
      const n = await p.locator(sel).count();
      const v = n >= 1 && await vis(sel);
      ok(v, (what || sel) + ' — on screen (' + n + ')');
      if (v) { await p.locator(sel).first().click({ timeout: 5000 }).catch((e) => ok(false, (what || sel) + ' — ' + e.message.split('\n')[0])); await p.waitForTimeout(350); }
      return v;
    };
    const type = async (sel, value, what) => {
      const v = await vis(sel);
      ok(v, (what || sel) + ' — on screen to type into');
      if (v) { await p.fill(sel, value, { timeout: 5000 }).catch((e) => ok(false, (what || sel) + ' — ' + e.message.split('\n')[0])); await p.waitForTimeout(200); }
    };
    const txt = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }, sel);
    const val = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.value : null; }, sel);
    const T = (h) => p.evaluate((h) => { const d = document.createElement('div');
      d.innerHTML = String(h).replace(/<\/td>/g, ' </td>').replace(/<\/th>/g, ' </th>').replace(/<br>/g, ' ');
      return d.textContent.replace(/\s+/g, ' '); }, h);
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const toDash = async (id) => { await p.evaluate((id) => goToClientDashboard(id), id); await p.waitForTimeout(400); };
    const est = () => p.evaluate(() => JSON.parse(JSON.stringify(currentEstimate || {})));
    const estateJob = (id, name, extra) => p.evaluate(([id, name, extra]) => {
      jobs = jobs.filter((j) => j.id !== id);
      jobs.unshift(Object.assign({ id, hvlId: 'HVL-2610-' + id, name, fname: 'Ada', lname: name.split(' ').pop(), svc: 'cleanout', sqft: '3500',
        addr: id + ' Ocean Blvd', city: 'Palm Beach', zip: '33480', propVal: '6000000', beds: '3', baths: '3', halfBaths: '1',
        executor: 'Mark Vale', executorRole: 'Personal Representative', executorEmail: 'mark@example.com', executorPhone: '(561) 555-0157',
        matterType: 'probate', docTier: 'values', start: '2026-10-19', walkthrough: '2026-09-28', created: '2026-09-20',
        status: 'new', tc: 'Anthony Graziano', siteVisitBy: 'Anthony Graziano', dateOfDeath: '2026-08-01' }, extra || {}));
      delete estimateStore[id]; saveJobs();
    }, [id, name, extra || {}]);
    const tickHouse = async () => {
      const ids = await p.evaluate((names) => {
        const out = []; const used = new Set(); let ri = 0;
        ROOMS.forEach((sec) => sec.rooms.forEach((r) => { const id = 'r' + ri; ri++;
          const i = names.findIndex((n, k) => n === r.name && !used.has(k)); if (i >= 0) { used.add(i); out.push(id); } }));
        return out;
      }, HOUSE);
      const closed = await p.evaluate(() => Array.from(document.querySelectorAll('[id^="sec-body-"]')).filter((el) => el.style.display === 'none').map((el) => el.id.replace('sec-body-', '')));
      for (const si of closed) await p.click(`.sec-hdr.sec-toggle[onclick="toggleRoomSection(${si})"]`).catch(() => {});
      for (const id of ids) await p.click('#chk-' + id).catch(() => ok(false, 'tick ' + id));
      await p.waitForTimeout(300);
      return ids;
    };
    const addLine = async (cat, cost) => {
      const gi = await p.evaluate(() => VENDOR_GROUP_CARDS.findIndex((c) => c.group === 'Asset Liquidation & Valuation'));
      await p.selectOption('#vgrp-cat-' + gi, cat).catch((e) => ok(false, 'pick ' + cat + ' — ' + e.message.split('\n')[0]));
      await type('#vgrp-cost-' + gi, String(cost), cat + '\'s cost');
      await press('button[onclick="addFromVendorGroup(' + gi + ')"]', 'the valuation card\'s + (' + cat + ')');
    };

    ok(await p.evaluate(() => vendorDirectoryReady()), 'fixture: the Vendor Directory is loaded');

    // ── A. Premium is the rates only ─────────────────────────────────────────
    let PREM = null;
    await section('A. Premium is the rates only, and every vendor line books its own hours on a Premium estate', async () => {
      await estateJob(4901, 'Estate of Ada Premium');
      await toDash(4901);
      await press('#client-dashboard-view .jt-next button[onclick="dashGoEstimate(4901)"]', 'the band\'s Build estimate');
      await p.waitForTimeout(600);
      const ids = await tickHouse();
      eq(ids.length, HOUSE.length, 'fixture: the seven rooms are ticked on the grid');
      if (await p.evaluate(() => document.getElementById('e-fixed').checked)) await press('label.toggle:has(#e-fixed)', 'untick Fixed price, to read the hours');
      const sub = await p.evaluate(() => { const t = document.getElementById('e-prem'); const w = t && t.closest('.toggle-wrap'); const s = w && w.querySelector('.toggle-sub'); return s ? s.textContent : ''; });
      has(sub, '$185 TC / $125 PS rates only. Coordination comes from the vendor lines you add, as on every job.', '⚠⚠ the Premium toggle says it is the rates only');
      lacks(sub, '25 concierge hours', 'and promises no hours');
      const std = await est();
      await press('label.toggle:has(#e-prem)', 'the Premium estate toggle');
      ok(await p.evaluate(() => document.getElementById('e-prem').checked), 'Premium is on');
      const prem = await est();
      eq([prem.totTC, prem.totPS], [std.totTC, std.totPS], '⚠⚠ Premium moves no hours (' + std.totTC + ' TC / ' + std.totPS + ' PS); it added 25 concierge hours before');
      eq(cents(prem.havellinTotal), cents(prem.totTC * 185) + cents(prem.totPS * 125), 'only the rates: the hours at $185 / $125 ($' + std.havellinTotal + ' → $' + prem.havellinTotal + ')');
      has(await txt('#tc-fee-label'), '× $185)', 'the concierge fee line names the Premium rate');
      lacks(await txt('#tc-fee-label'), 'Premium specialty', 'and no Premium specialty coordination');
      // The vendor lines, added through the valuation card as a person does.
      await addLine('Art Appraiser', 1500);
      const a = await est();
      eq([a.vendorTCHrs, a.totTC - prem.totTC], [2, 2], '⚠⚠ an appraiser books its 2.0 hours on a Premium estate (P16 booked none)');
      lacks(await txt('#vendor-group-cards'), 'covered by Premium Estate', 'and its row says nothing of Premium');
      await addLine('Online Auction House', 2500);
      const o = await est();
      eq(o.vendorTCHrs - a.vendorTCHrs, 6, '⚠⚠ an online auction house books 6.0 hours (12 touches; it was 2.0)');
      await addLine('Estate Sale Company', 3000);
      const s = await est();
      eq(s.vendorTCHrs - o.vendorTCHrs, 1.5, '⚠⚠ an estate sale company books 1.5 hours (3 touches; it was 4.0)');
      // RESTATED 2026-10-02 (P18, re-measured on this page): the 9.5 line hours join the concierge's coordination and the billed
      // hours are rounded up to the whole hour once, with the rest, so the total moves 10 billed hours at $185 = $1,850 (P17
      // billed the 9.5 exactly, $1,757.50).
      eq([s.totTC - prem.totTC, cents(s.havellinTotal) - cents(prem.havellinTotal)], [10, cents(10 * 185)],
         'the three lines\' 9.5 hours move the billed hours, rounded up with the rest, by 10 at $185 = $1,850');
      has(await txt('#vendor-group-cards'), '+9.5 hrs concierge', 'and the card adds them up to 9.5');
      // Lines, then off again for the documents below: Premium, no vendors.
      await p.evaluate(() => { while (vendors.length) removeVendor(0); });
      await p.waitForTimeout(250);
      // RESTATED 2026-10-02 (P18): whole hours at $185 / $125 are whole dollars ($22,350), so the cents F reads come from a
      // 3% preferred-client discount typed into its box: $21,679.50 (P17's quarter hours gave $22,071.25 with none).
      await type('#e-discount', '3', 'a 3% preferred-client discount');
      PREM = await est();
      eq([PREM.totTC, PREM.totPS, PREM.havellinTotal], [60, 90, 21679.5], 'fixture: 60 / 90 whole hours at the Premium rates, less 3%: $21,679.50');
      ok(cents(PREM.havellinTotal) % 100 !== 0, 'fixture: the Premium total carries cents ($' + PREM.havellinTotal + ')');
    });

    // ── B. volume 5 leaves complexity alone ──────────────────────────────────
    await section('B. a volume of 5 typed into a room leaves its complexity alone', async () => {
      const id = await p.evaluate(() => { const c = Array.from(document.querySelectorAll('[id^="chk-r"]')).find((e) => e.getAttribute('data-state') === 'in');
        return c ? c.id.replace('chk-', '') : ''; });
      ok(!!id, 'fixture: a ticked room (' + id + ')');
      await type('#cplx-' + id, '2', 'the room\'s complexity');
      await type('#vol-' + id, '5', 'the room\'s volume');
      eq([await val('#vol-' + id), await val('#cplx-' + id)], ['5', '2'], '⚠⚠ volume 5, and the complexity typed beside it is still 2 (it was set to 5)');
      await type('#vol-' + id, '7', 'a volume of 7');
      eq([await val('#vol-' + id), await val('#cplx-' + id)], ['5', '2'], 'a 7 clamps to 5 as typed, and the complexity stays 2');
      await type('#vol-' + id, '3', 'back to 3'); await type('#cplx-' + id, '3', 'back to 3');
    });

    // ── C. Home Prep declutter hours ─────────────────────────────────────────
    await section('C. RESTATED (P18): Home Prep: 5.5 declutter hours bill 6, $900, under a total that counts them; 5.3 is flagged and saved as 6', async () => {
      await p.evaluate(() => {
        jobs = jobs.filter((j) => j.id !== 4903);
        jobs.unshift({ id: 4903, hvlId: 'HVL-2610-4903', name: 'Sam Marston', fname: 'Sam', lname: 'Marston', svc: 'prep', sqft: '2800',
          addr: '3 Royal Palm Way', city: 'Palm Beach', zip: '33480', email: 'sam@example.com', phone: '(561) 555-0144',
          start: '2026-10-19', walkthrough: '2026-09-28', created: '2026-09-20', status: 'new', tc: 'Ashley Jerome' });
        delete estimateStore[4903]; saveJobs();
      });
      await toDash(4903);
      await press('#client-dashboard-view .jt-next button[onclick="dashGoEstimate(4903)"]', 'the band\'s Build estimate');
      await p.waitForTimeout(600);
      const gi = await p.evaluate(() => VENDOR_GROUP_CARDS.findIndex((c) => c.group === 'Property Preparation'));
      await p.selectOption('#vgrp-cat-' + gi, 'Painting').catch((e) => ok(false, 'pick Painting — ' + e.message.split('\n')[0]));
      await type('#vgrp-cost-' + gi, '20000', 'the painter\'s cost');
      await press('button[onclick="addFromVendorGroup(' + gi + ')"]', 'the Property Preparation card\'s +');
      await type('#e-declutter-hrs', '5.5', 'the declutter hours');
      const e = await est();
      eq([e.totTC, e.tcFee, e.prepFee, e.havellinTotal], [6, 900, 6000, 6900], '⚠⚠ 5.5 hours are priced as 6: 6 × $150 = $900, and the services total is $6,900 (P17: 5.5, $825, $6,825)');
      has(await txt('#e-declutter-hint'), '6.0 hrs × $150 = $900', 'the hint prices them');
      has(await txt('#e-declutter-hint'), 'Estimates round up to whole hours: 5.5 is priced as 6.', 'and flags the rounding');
      has(await txt('#e-declutter-hint'), 'Home Sale Preparation Fee', 'beside the fee, by its name');
      lacks(await txt('#e-declutter-hint'), 'site management', 'never the old name');
      eq(await txt('#s-prep-fee'), '$6,000', 'the summary\'s fee row');
      has(await txt('#s-prep-fee-row'), 'Home Sale Preparation Fee', 'named the Home Sale Preparation Fee');
      eq(await txt('#s-tc-fee'), '$900', 'the hours row');
      eq(await txt('#s-havellin'), '$6,900', 'and the subtotal that counts both');
      await type('#e-declutter-hrs', '5.3', 'a figure that is not a whole hour');
      has(await txt('#e-declutter-hint'), 'Estimates round up to whole hours: 5.3 is priced as 6.', '⚠⚠ the hint flags 5.3 and says what it is priced at (P17 refused it)');
      await press('#est-save-card button:has-text("Save Estimate")', 'Save Estimate');
      has(await txt('#e-fb'), '+ 6.0 declutter hrs · total $6,900', '⚠⚠ and Save Estimate saves it, as the 6 hours priced (P17 refused it here)');
      eq(await p.evaluate(() => { const r = estimateStore[4903]; return r && r.estimate ? r.estimate.declutterTCHrs : null; }), 6, 'the record holds 6');
      await p.waitForTimeout(1500);   // Save lands on the dashboard a moment later (G reopens Build Estimate on this job)
    });

    // ── D. the hours log ─────────────────────────────────────────────────────
    await section('D. RESTATED (P18): the hours log refuses 2.3 and 2.25 and logs 2.5, the second concierge\'s row included', async () => {
      await p.evaluate(() => {
        jobs = jobs.filter((j) => j.id !== 4902);
        jobs.unshift({ id: 4902, hvlId: 'HVL-2610-4902', name: 'Tripp Butler', fname: 'Tripp', lname: 'Butler', svc: 'home_cleanout', sqft: '3500',
          addr: '69 Beach Blvd', city: 'Palm Beach', zip: '33480', email: 'tripp@example.com', phone: '(561) 555-0101',
          start: '2026-09-21', walkthrough: '2026-09-10', created: '2026-09-08', status: 'active', won: true, wonAt: '2026-09-12',
          wonBy: 'Anthony Graziano', wonMethod: 'call', approved: true, agrApproved: true, agrApprovedBy: 'Anthony Graziano',
          agrSent: true, agrSigned: true, depositReceived: true, tc: 'Ashley Jerome', activatedOn: '2026-09-21', activatedBy: 'Ashley Jerome',
          payments: [{ uid: 'd4902', stage: 'deposit', amount: 6006.25, receivedOn: '2026-09-15', method: 'wire', clearedOn: '2026-09-15' }],
          crew: { tc: { name: 'Ashley Jerome', locked: true }, tc2: { name: 'Anthony Graziano', locked: true },
                  ps: [{ name: 'Anthony Graziano Jr', locked: true }], confirmed: true, confirmedBy: 'Ashley Jerome', confirmedAt: '2026-09-20', picked: true } });
        estimateStore[4902] = { approved: true, approvedBy: 'Anthony Graziano', approvedAt: 'September 12, 2026', savedAt: Date.parse('2026-09-12T13:00:00Z'),
          estimate: { jobId: 4902, svc: 'home_cleanout', totTC: 40.25, totPS: 60, tcRate: 150, psRate: 100, tcFee: 6037.5, psFee: 6000,
            havellinTotal: 12037.5, grandTotal: 12037.5, vendors: [], prepItems: [], rooms: [], needsTC2: true, tcCount: 2, psCount: 1 } };
        saveJobs();
      });
      ok(await p.evaluate(() => openJobPlanFor(4902)), 'the Job Plan opens on the job');
      await p.waitForTimeout(700);
      const open = await p.evaluate(() => { const e = document.getElementById('phase-body-hours'); return !!e && e.style.display !== 'none'; });
      if (!open) await press('[onclick="togglePhase(\'hours\')"]', 'the Hours & daily close fold');
      for (const id of ['#log-m0-hrs', '#log-tc2-hrs', '#log-m1-hrs']) eq(await p.evaluate((s) => { const e = document.querySelector(s); return e ? e.getAttribute('step') : null; }, id), '0.5', '⚠ ' + id + ' steps by 0.5');
      const date = await p.evaluate(() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); });
      await p.evaluate((d) => { document.getElementById('log-date').value = d; }, date);
      await type('#log-activity', 'Kitchen sort', 'the activity');
      await type('#log-m0-hrs', '2.3', 'the concierge\'s hours, 2.3');
      await type('#log-m1-hrs', '7', 'the specialist\'s 7');
      await press('#btn-save-hours', 'Save Hours Entry');
      has(await txt('#log-fb'), 'Hours are logged in half hours (0.5, 1.0, 1.5 …). Not a half hour: Ashley Jerome (2.3).', '⚠⚠ 2.3 is refused, naming the row');
      eq(await p.evaluate(() => (jobLogs[4902] || []).length), 0, 'and nothing is logged');
      await type('#log-m0-hrs', '2.25', 'the concierge\'s hours, 2.25 (P17\'s quarter)');
      await press('#btn-save-hours', 'Save Hours Entry');
      has(await txt('#log-fb'), 'Not a half hour: Ashley Jerome (2.25)', '⚠⚠ a quarter is refused now too');
      await type('#log-m0-hrs', '2.5', 'the concierge\'s hours, 2.5');
      await type('#log-tc2-hrs', '1.1', 'the second concierge\'s 1.1');
      await press('#btn-save-hours', 'Save Hours Entry');
      has(await txt('#log-fb'), 'Not a half hour: Anthony Graziano (1.1)', '⚠⚠ the second concierge\'s row is asked the same question');
      eq(await p.evaluate(() => (jobLogs[4902] || []).length), 0, 'still nothing logged');
      await type('#log-tc2-hrs', '1.5', 'the second concierge\'s 1.5');
      await press('#btn-save-hours', 'Save Hours Entry');
      has(await txt('#log-fb'), 'Hours entry saved', 'half hours are saved');
      eq(await p.evaluate(() => ((jobLogs[4902] || [])[0] || { members: [] }).members.map((m) => m.role + ':' + m.hours).join(' ')), 'TC:2.5 PS:7 TC:1.5',
         '⚠ logged exactly as typed: 2.5, 7 and 1.5');
    });

    // ── E. a change order ────────────────────────────────────────────────────
    await section('E. RESTATED (P18): a change order refuses 2.3 and 2.5 hours and records 3', async () => {
      await toDash(4902);
      await press('#client-dashboard-view button[onclick="openChangeOrder(4902)"]', '+ New on the Change Orders card');
      eq(await p.evaluate(() => [document.getElementById('co-tc-hrs').getAttribute('step'), document.getElementById('co-ps-hrs').getAttribute('step')]), ['1', '1'],
         'both hours boxes step by 1');
      await type('#co-description', 'Garage added to scope.', 'the description');
      await type('#co-tc-hrs', '2.3', '2.3 concierge hours');
      await press('#change-order-modal button:has-text("Create Change Order")', 'Create Change Order');
      has(await txt('#co-fb'), 'Change orders are in whole hours (1, 2, 3 …): concierge 2.3 is not a whole hour. Nothing was saved.', '⚠⚠ refused, naming the figure');
      eq(await p.evaluate(() => changeOrders.filter((c) => c.jobId === 4902).length), 0, 'and nothing is recorded');
      await type('#co-tc-hrs', '2.5', '2.5 concierge hours');
      await press('#change-order-modal button:has-text("Create Change Order")', 'Create Change Order');
      has(await txt('#co-fb'), 'concierge 2.5 is not a whole hour', '⚠⚠ a half hour is refused too');
      eq(await p.evaluate(() => changeOrders.filter((c) => c.jobId === 4902).length), 0, 'still nothing recorded');
      await type('#co-tc-hrs', '3', '3 concierge hours');
      await press('#change-order-modal button:has-text("Create Change Order")', 'Create Change Order');
      eq(await p.evaluate(() => changeOrders.filter((c) => c.jobId === 4902).map((c) => [c.tcHrs, c.psHrs])), [[3, 0]], 'recorded at 3');
    });

    // ── F. the documents, to the cent ────────────────────────────────────────
    await section('F. the estimate, the agreement and each invoice print the cents and add up to them; the ACH link asks to the cent', async () => {
      ok(!!PREM && PREM.havellinTotal > 0, 'fixture: the Premium estimate from A');
      const total = PREM.havellinTotal;
      const [dep, mid, fin] = split(total);
      eq(cents(dep) + cents(mid) + cents(fin), cents(total), 'fixture: the split adds up');
      await p.evaluate(([e, d]) => {
        jobs = jobs.filter((j) => j.id !== 4904);
        jobs.unshift({ id: 4904, hvlId: 'HVL-2610-4904', name: 'Estate of Cora Cents', fname: 'Cora', lname: 'Cents', svc: 'cleanout', sqft: '3500',
          addr: '49 Ocean Blvd', city: 'Palm Beach', zip: '33480', propVal: '6000000', premium: true, executor: 'Mark Vale', executorRole: 'Personal Representative',
          executorEmail: 'mark@example.com', executorPhone: '(561) 555-0157', matterType: 'probate', docTier: 'values', start: '2026-10-19',
          walkthrough: '2026-09-28', created: '2026-09-20', status: 'won', won: true, wonAt: '2026-09-29', wonBy: 'Anthony Graziano', wonMethod: 'call',
          approved: true, estimateSentDate: 'September 28, 2026', agrApproved: true, agrApprovedBy: 'Anthony Graziano', agrSent: true, agrSigned: true,
          tc: 'Anthony Graziano', dateOfDeath: '2026-08-01',
          docState: { 'invoice:deposit': { draftedAt: '2026-09-29T14:00:00Z', sentAt: '2026-09-29T14:05:00Z' } },
          payments: [{ id: 1, uid: 'c4904', stage: 'deposit', amount: 5000, receivedOn: '2026-09-30', method: 'check', clearedOn: null }] });
        const s = Object.assign({}, e, { jobId: 4904 });
        estimateStore[4904] = { estimate: s, approved: true, submitted: true, approvedBy: 'Anthony Graziano', savedAt: Date.now() };
        SHEETS_SYNC_URL = d;
        saveJobs();
      }, [PREM, SYNC]);
      await toDash(4904);
      // The estimate and the agreement, through the documents' own View.
      const view = async (kind, extra) => {
        const sel = '#client-dashboard-view button[onclick="docAction(4904,\'' + kind + '\',\'view\'' + (extra || '') + ')"]';
        const n = await p.locator(sel).count();
        if (!n) { ok(false, 'View ' + kind + ' is offered (' + n + ')'); return ''; }
        await p.locator(sel).first().click(); await p.waitForTimeout(500);
        const t = await txt('#doc-viewer-body');
        await p.evaluate(() => { const m = document.getElementById('doc-viewer-modal'); if (m) m.style.display = 'none'; });
        return t;
      };
      const ce = await view('estimate');
      has(ce, money(total), '⚠⚠ the estimate prints its total with the cents (' + money(total) + ')');
      has(ce, money(dep), 'its schedule\'s deposit to the cent (' + money(dep) + ')');
      has(ce, money(mid), 'and its quarters (' + money(mid) + ')');
      ok(!new RegExp('\\$' + Math.round(total).toLocaleString('en-US').replace(/,/g, ',') + '(?![\\d.,])').test(ce) || cents(total) % 100 === 0, '⚠ and never the total rounded to the dollar');
      const ag = await view('agreement');
      has(ag, money(dep), 'the agreement\'s schedule asks the same deposit, to the cent');
      has(ag, money(mid), 'and the same midpoint');
      // The deposit invoice, printed through its own Print.
      await p.evaluate(() => { window.__prints = []; });
      const psel = '#client-dashboard-view button[onclick="docAction(4904,\'invoice\',\'print\',{stage:\'deposit\'})"]';
      if (await p.locator(psel).count()) {
        await p.locator(psel).first().click(); await p.waitForTimeout(600);
        const pr = await T(await p.evaluate(() => window.__prints[0] || ''));
        has(pr, 'Deposit Due Now (50%) ' + money(dep), '⚠⚠ the printed deposit invoice asks ' + money(dep));
        has(pr, money(total), 'beside the total it is half of');
        await p.waitForTimeout(700);   // the print path puts the panels back 650 ms after it prints
      } else ok(false, 'the deposit invoice\'s Print is offered');
      await toDash(4904);
      // The ACH link: the outstanding figure, to the cent.
      posts.length = 0;
      await press('#client-dashboard-view .jt-next button[onclick="dashStripeLink(4904,\'deposit\')"]', 'the band\'s ACH payment link');
      await p.waitForTimeout(600);
      const mint = posts.filter((x) => x.action === 'stripeLink');
      eq(mint.map((x) => x.amount), [(cents(dep) - 500000) / 100], '⚠⚠ the link asks for ' + money(dep - 5000) + ' — the deposit less the $5,000 cheque, to the cent');
      has(await txt('#client-dashboard-view'), 'https://buy.stripe.com/test_4904', 'the link is shown, to go out with the invoice');
      eq(await p.evaluate(() => ((jobs.find((j) => j.id === 4904).docState || {})['invoice:deposit'] || {}).stripe.amount), (cents(dep) - 500000) / 100,
         'and the job records the link at that figure, to the cent');
    });

    // ── G. overflow, and errors ──────────────────────────────────────────────
    await section('G. overflow at 1440 and 390; no page errors', async () => {
      await toDash(4904);
      ok(await overflow() <= 0, 'the dashboard fits at 1440 (' + await overflow() + ')');
      await p.setViewportSize({ width: 390, height: 844 });
      await toDash(4904); await p.waitForTimeout(300);
      ok(await overflow() <= 0, 'and at 390 (' + await overflow() + ')');
      await p.evaluate(() => dashGoEstimate(4903)); await p.waitForTimeout(600);
      ok(await overflow() <= 0, 'Build Estimate on the prep job fits at 390 (' + await overflow() + ')');
      await p.setViewportSize({ width: 1440, height: 1000 });
      eq(errs, [], 'no page errors');
    });

    console.log('\n' + pass + ' passed, ' + fail + ' failed');
    await b.close();
    process.exit(fail ? 1 : 0);
  } catch (e) {
    console.log('✗ threw: ' + (e && e.stack || e));
    console.log('\n' + pass + ' passed, ' + (fail + 1) + ' failed');
    if (b) await b.close().catch(() => {});
    process.exit(1);
  }
})();
