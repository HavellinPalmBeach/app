// Step 42 — P12: the estimator fixes and pricing decisions (2026-09-30, workflow audit M10–M12 and the
// Build Estimate lows; Anthony's answers to Q5–Q7, Q9, Q10 and Q13).
//
// Drives the REAL Build Estimate screen through its own controls: the band's Build estimate, the scope
// toggles, the volume boxes, the Rush and Fixed-price toggles, the fee and discount fields, Save Estimate.
// What is seeded is the client record a person would have typed at intake.
//
//   A. an Estate Settlement opens on fixed price (Q10); the summary shows the fee, not the hourly rows (M10)
//   B. the reference band is this house at Normal and at Full, worded neutrally (Q7)
//   C. finishing the walkthrough at defaults leaves the quote where it was (Q6)
//   D. rush on a typed fee is its own line and always raises the price; the discount is its own line, under
//      the premium (Q9, Q13)
//   E. a blank volume is refused on Save by name; a 9 is typed as a 5 (the lows)
//   F. Save Estimate lands on the dashboard; the saved estimate document itemises the fee, the premium and
//      the discount, and its rows add up
//   G. a living client opens hourly; standalone Home Prep has no fixed-price box
//   H. overflow at 1440 and 390; no page errors
//
//   NODE_PATH=/opt/node22/lib/node_modules node tests/browser/step42.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');
const money = (t) => { const m = String(t || '').match(/([+\-−])?\s*\$\s*([\d,]+)/); if (!m) return null;
                       const v = parseInt(m[2].replace(/,/g, ''), 10); return (m[1] && /[-−]/.test(m[1])) ? -v : v; };
const BASE = ['Living Room', 'Kitchen', 'Dining Room', 'Family Room / Great Room', 'Primary Suite', 'Bedroom 2', 'Bedroom 3', 'Garage (2-car)'];
const COVER = ['Primary Bath', 'Bathroom 2', 'Bathroom 3', 'Half Bath', 'Laundry Room', 'Entryway / Foyer'];
(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', e => errs.push(String(e)));
    p.on('dialog', async d => { await d.accept(); });
    await p.goto(APP); await p.waitForTimeout(1500);
    await p.evaluate(() => { window.open = function () { return null; }; });

    const vis = (sel) => p.locator(sel).first().isVisible().catch(() => false);
    const press = async (sel, what) => {
      const v = await vis(sel);
      ok(v, what + ' — the control is on screen');
      if (v) { await p.click(sel, { timeout: 5000 }).catch((e) => ok(false, what + ' — ' + e.message.split('\n')[0])); await p.waitForTimeout(350); }
      return v;
    };
    const type = async (sel, value, what) => {
      const v = await vis(sel);
      ok(v, (what || sel) + ' — on screen to type into');
      if (v) { await p.fill(sel, value, { timeout: 5000 }).catch((e) => ok(false, (what || sel) + ' — ' + e.message.split('\n')[0])); await p.waitForTimeout(250); }
    };
    const txt = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.textContent : null; }, sel);
    const html = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.innerHTML : ''; }, sel);
    const shown = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return !!el && el.checkVisibility(); }, sel);
    const rec = () => p.evaluate(() => JSON.parse(JSON.stringify(currentEstimate)));
    const openDash = async (id) => { await p.evaluate((i) => goToClientDashboard(i), id); await p.waitForTimeout(300); };
    const section = async (name, body) => {
      console.log('\n## ' + name);
      try { await body(); } catch (e) { fail++; console.log('  ✗ ' + name + ' threw: ' + String(e && e.message || e).split('\n')[0]); }
    };
    const rowIds = (names) => p.evaluate((names) => {
      const out = []; const used = new Set(); let ri = 0;
      ROOMS.forEach((sec) => sec.rooms.forEach((r) => {
        const id = 'r' + ri; ri++;
        const i = names.findIndex((n, k) => n === r.name && !used.has(k));
        if (i >= 0) { used.add(i); out.push(id); }
      }));
      return out;
    }, names);
    const openSections = async () => {
      const closed = await p.evaluate(() => Array.from(document.querySelectorAll('[id^="sec-body-"]'))
        .filter((el) => el.style.display === 'none').map((el) => el.id.replace('sec-body-', '')));
      for (const si of closed) await p.click(`.sec-hdr.sec-toggle[onclick="toggleRoomSection(${si})"]`);
    };
    const tick = async (names) => { for (const id of await rowIds(names)) await p.click('#chk-' + id); await p.waitForTimeout(300); };

    await p.evaluate(() => {
      jobs.unshift({ id: 4201, hvlId: 'HVL-2609-E421', name: 'Estate of Harriet Ames', fname: 'Harriet', lname: 'Ames', svc: 'cleanout',
        sqft: '3500', addr: '12 Ocean Blvd', city: 'Palm Beach', zip: '33480', propVal: '2500000', beds: '3', baths: '3', halfBaths: '1',
        executor: 'Tom Ames', executorRole: 'Personal Representative', executorEmail: 'tom@example.com', executorPhone: '(561) 555-0102',
        matterType: 'probate', docTier: 'values', start: '2026-10-19', walkthrough: '2026-09-28', created: '2026-09-20',
        status: 'new', tc: 'Anthony Graziano', siteVisitBy: 'Anthony Graziano', dateOfDeath: '2026-08-01' });
      jobs.unshift({ id: 4202, hvlId: 'HVL-2609-L422', name: 'Pat Living', fname: 'Pat', lname: 'Living', svc: 'downsizing_move',
        sqft: '3000', destSqft: '1800', addr: '9 Worth Ave', city: 'Palm Beach', zip: '33480', propVal: '1800000', beds: '3', baths: '2',
        halfBaths: '1', email: 'pat@example.com', phone: '(561) 555-0103', start: '2026-10-26', walkthrough: '2026-09-28',
        created: '2026-09-20', status: 'new', tc: 'Ashley Jerome' });
      jobs.unshift({ id: 4203, hvlId: 'HVL-2609-P423', name: 'Sam Prep', fname: 'Sam', lname: 'Prep', svc: 'prep', sqft: '2800',
        addr: '3 Royal Palm Way', city: 'Palm Beach', zip: '33480', propVal: '1200000', email: 'sam@example.com',
        phone: '(561) 555-0104', start: '2026-10-12', walkthrough: '2026-09-28', created: '2026-09-20', status: 'new', tc: 'Ashley Jerome' });
      saveJobs();
    });

    // ── A. an estate opens on fixed price; the summary shows the fee ─────────────────────────────
    let base = null, complete = null;
    await section('A. an Estate Settlement opens on fixed price, and the summary shows the fee (Q10, M10)', async () => {
      await openDash(4201);
      await press('#client-dashboard-view .jt-next button[onclick="dashGoEstimate(4201)"]', 'the band\'s Build estimate');
      await p.waitForTimeout(600);
      ok(await p.evaluate(() => document.getElementById('e-fixed').checked), '⚠ the fixed-price box is ticked on a new estate estimate');
      ok(await shown('#fixed-amount-row'), 'and the fee row is beside it');
      await openSections();
      await tick(BASE);
      base = await rec();
      ok(base && base.fixedPrice && base.fixedAmount > 0, 'the fee tracks the suggestion: $' + (base && base.fixedAmount));
      eq(money(await txt('#s-fixed-fee')), base.fixedAmount, 'the summary opens with the fixed fee');
      eq(await shown('#s-fixed-row'), true, 'on its own row');
      eq([await shown('#s-tc-fee-row'), await shown('#s-ps-fee-row'), await shown('#s-pkg-row')], [false, false, false],
         'the hourly fee rows it replaced are not on screen');
      eq((await txt('#s-havellin-row td')).trim(), 'Services subtotal', 'the first total is the Services subtotal');
      eq(money(await txt('#s-total')), base.grandTotal, '⚠⚠ "Total project estimate" is the fixed price quoted, not the hourly figure');
    });

    // ── B. the reference band ───────────────────────────────────────────────────────────────────
    await section('B. the reference band is this house at Normal and at Full, worded neutrally (Q7)', async () => {
      const box = await html('#ref-box');
      has(box, 'At Normal', 'the band prices the house at Normal');
      has(box, 'At Full', 'and at Full');
      has(box, 'Scored at Normal.', 'a walkthrough at its defaults says so');
      ok(!/review scores|below range|above range/i.test(box), 'nothing on it tells anyone to score up or down');
      lacks(box, 'property multiplier', 'and no property-value multiplier');
    });

    // ── C. finishing the walkthrough at defaults ────────────────────────────────────────────────
    await section('C. finishing the walkthrough at defaults leaves the quote where it was (Q6)', async () => {
      await tick(COVER);
      complete = await rec();
      eq(complete.rooms.filter((r) => !r.excluded).length, BASE.length + COVER.length, 'fourteen rooms are in scope');
      eq(complete.hourlyHavellinTotal, base.hourlyHavellinTotal,
         '⚠⚠ the six light rooms at their defaults do not move the hourly figure ($' + base.hourlyHavellinTotal + ')');
      eq(complete.fixedAmount, base.fixedAmount, 'nor the fixed fee');
    });

    // ── D. rush and discount on a typed fee ─────────────────────────────────────────────────────
    await section('D. on a fixed price the premium and the discount are their own lines (Q9, Q13)', async () => {
      await type('#e-fixed-amount', '20000', 'the fixed fee');
      await press('label.toggle:has(#e-rush)', 'the Rush toggle');
      let e = await rec();
      eq([e.fixedAmount, e.rushAmt], [20000, 4000], '⚠ ticking rush over a typed $20,000 fee adds $4,000');
      eq(money(await txt('#s-rush-amt')), 4000, 'the premium row says so');
      await type('#e-discount', '10', 'the preferred-client discount');
      e = await rec();
      ok(e.discountAmt > 0, 'the discount is priced: $' + e.discountAmt);
      eq(money(await txt('#s-discount-amt')), -e.discountAmt, 'and printed as its own row');
      const order = await p.evaluate(() => { const r = document.getElementById('s-rush-row'), d = document.getElementById('s-discount-row');
        return !!(r.compareDocumentPosition(d) & Node.DOCUMENT_POSITION_FOLLOWING); });
      ok(order, 'the premium prints above the discount, as the documents print them');
      eq(e.havellinTotal, 20000 + 4000 - e.discountAmt, 'the total is the fee, plus the premium, less the discount');
      eq(money(await txt('#s-total')), e.grandTotal, 'and the summary\'s total is that figure');
      await press('label.toggle:has(#e-rush)', 'the Rush toggle, off again');
      const off = await rec();
      ok(off.havellinTotal < e.havellinTotal, `untick rush and the price falls ($${e.havellinTotal} → $${off.havellinTotal})`);
      await press('label.toggle:has(#e-rush)', 'the Rush toggle, back on');
    });

    // ── E. the room-score lows ──────────────────────────────────────────────────────────────────
    await section('E. a blank volume is refused on Save by name; a 9 becomes a 5', async () => {
      const [lr] = await rowIds(['Living Room']);
      await type('#vol-' + lr, '', 'the living room\'s volume');
      await press('button[onclick="saveEstimateAndPreview()"]', 'Save Estimate');
      has(await txt('#e-fb'), 'Living Room', '⚠ the save names the unscored room — the gate that could never fire');
      await type('#vol-' + lr, '9', 'the living room\'s volume');
      eq(await p.evaluate((id) => document.getElementById('vol-' + id).value, lr), '5', 'a 9 is brought to a 5 as it is typed');
      await type('#vol-' + lr, '3', 'the living room\'s volume, back to its default');
    });

    // ── F. Save Estimate and the saved document ─────────────────────────────────────────────────
    await section('F. Save Estimate lands on the dashboard; the saved estimate itemises the fee, the premium and the discount', async () => {
      eq((await txt('button[onclick="saveEstimateAndPreview()"]')).trim(), 'Save Estimate', 'the button reads Save Estimate');
      await press('button[onclick="saveEstimateAndPreview()"]', 'Save Estimate');
      await p.waitForTimeout(1600);
      ok(await shown('#client-dashboard-view'), 'the save lands on the Client Dashboard');
      const saved = await p.evaluate(() => JSON.parse(JSON.stringify((estimateStore[4201] || {}).estimate || null)));
      ok(saved && saved.fixedLines === true && saved.rushExPrepFee === true, 'the saved record says it was priced under the new rules');
      const doc = await p.evaluate(() => clientEstimateHtml(estimateStore[4201].estimate, jobs.find((j) => j.id === 4201)));
      const row = (label) => { const m = doc.match(new RegExp(label + '[\\s\\S]*?<td class="r"[^>]*>([^<]*)</td>')); return m ? money(m[1]) : null; };
      const fee = row('<strong>Fixed Project Fee</strong>'), rush = row('Expedited Delivery \\(20%'),
            disc = row('Preferred Client Discount \\(10%\\)'), tot = row('<strong>Havellin Services Total</strong>');
      eq([fee, rush, disc], [20000, 4000, -saved.discountAmt], 'the estimate prints the fee, the premium and the discount as rows');
      eq(tot, saved.havellinTotal, 'and its Havellin Services Total is the saved total');
      eq(fee + rush + disc, tot, '⚠ and the rows add up to it');
    });

    // ── G. living and prep ──────────────────────────────────────────────────────────────────────
    await section('G. a living client opens hourly; standalone Home Prep has no fixed-price box', async () => {
      await openDash(4202);
      await press('#client-dashboard-view .jt-next button[onclick="dashGoEstimate(4202)"]', 'Pat Living\'s Build estimate');
      await p.waitForTimeout(600);
      eq(await p.evaluate(() => document.getElementById('e-fixed').checked), false, 'a Home Transition opens hourly');
      ok(await shown('#fixed-toggle-wrap'), 'with the fixed-price box there to tick');
      await openDash(4203);
      await press('#client-dashboard-view .jt-next button[onclick="dashGoEstimate(4203)"]', 'Sam Prep\'s Build estimate');
      await p.waitForTimeout(600);
      eq(await shown('#fixed-toggle-wrap'), false, '⚠ standalone Home Prep has no fixed-price box it would ignore');
      eq(await shown('#fixed-amount-row'), false, 'and no fee row');
    });

    // ── H. layout ───────────────────────────────────────────────────────────────────────────────
    await section('H. no horizontal overflow at 1440 and 390; no page errors', async () => {
      await openDash(4201);
      await press('#client-dashboard-view .jt-next button[onclick="dashGoEstimate(4201)"], #client-dashboard-view button[onclick="dashEditEstimate(4201)"]', 'back into the estate\'s estimate');
      for (const w of [1440, 390]) {
        await p.setViewportSize({ width: w, height: 900 });
        await p.waitForTimeout(300);
        const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        ok(over <= 1, `no horizontal overflow at ${w}px (${over}px)`);
      }
      eq(errs, [], 'no page errors');
    });
  } catch (e) {
    fail++; console.log('  ✗ step threw: ' + String(e && e.message || e).split('\n')[0]);
  } finally {
    if (b) await b.close().catch(() => {});
  }
  console.log(`step42: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
