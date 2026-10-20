// Step 94 — the vendors' certificates of insurance, and Havellin's own coverage as the agreements print it (2026-10-20,
// Q87 with A19). Anthony, after the insurer asked whether Havellin's vendors carry their own: the certificate is asked
// for WITH THE BOOKING, recorded on the vendor as two dates, and the Job Plan flags a vendor on the job without a current
// one. Never a block.
//
// Drives the REAL page: the Vendors tab's + Add Vendor form with its two COI dates, saved through the real Save Vendor
// button against a routed directory URL and read back off the rendered card; a living client through the real intake;
// the Job Plan's Vendors & partners fold with two vendors picked and confirmed through the real selects, read back for
// the fold's count, the summary line, the per-slot flag, the one-tap request link and the current certificate's "COI to";
// the real Edit form expiring a certificate and the plan reading it as expired; both agreements printed through the real
// print path (§6.1's bracketed figures and the note, §6.2's policy-keyed cap, §6.4; the standard form's §5.1 and §6);
// horizontal overflow at 1440 and 390 px; zero page errors.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step94.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');
const VURL = 'https://vendors.example.test/exec';
const T = (h) => String(h).replace(/<[^>]+>/g, ' ').replace(/&rsquo;|&#8217;/g, '’').replace(/&amp;/g, '&').replace(/&middot;/g, '·').replace(/&[a-z#0-9]+;/g, ' ').replace(/\s+/g, ' ');
const ymd = (d) => { const x = new Date(); x.setDate(x.getDate() + d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
const nice = (s) => new Date(s + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
    const posts = [];
    await ctx.route(VURL + '**', async (r) => {
      const req = r.request();
      if (req.method() === 'POST') { posts.push(JSON.parse(req.postData() || '{}')); return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, success: true, _row: 10 + posts.length, uid: 'u-' + posts.length }) }); }
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, vendors: [] }) });
    });
    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    p.on('dialog', async (d) => { await d.accept(); });
    await p.goto(APP); await p.waitForTimeout(1600);
    await p.evaluate((u) => { VENDOR_SYNC_URL = u; window.__prints = []; window.print = function () { const pt = document.getElementById('print-target'); window.__prints.push(pt ? pt.innerHTML : ''); }; }, VURL);

    // ── A. The vendor form: two dates, saved through the real button ─────────────────────────────
    console.log('\n## A. The vendor form\'s COI dates');
    const EXP = ymd(365), PAST = ymd(-20);
    await p.click('.nb:has-text("Vendors")'); await p.waitForTimeout(300);
    await p.click('#panel-vendors button:has-text("+ Add Vendor")'); await p.waitForTimeout(300);
    const form = await p.evaluate(() => ({ rec: !!document.getElementById('v-coi-received') && document.getElementById('v-coi-received').checkVisibility(),
      exp: !!document.getElementById('v-coi-expires') && document.getElementById('v-coi-expires').checkVisibility(), old: !!document.getElementById('v-coi') }));
    ok(form.rec && form.exp, 'the two date inputs are on the open form');
    ok(!form.old, 'and the Yes / Pending / No select is gone');
    const addVendor = async (name, cat, email, received, expires) => {
      await p.fill('#v-name', name);
      await p.evaluate(() => { const g = document.getElementById('v-group'); const o = Array.from(g.options).find((x) => x.value); g.value = o.value; if (g.onchange) g.onchange(); });
      await p.fill('#v-category', cat);
      await p.selectOption('#v-status', 'Active');
      if (email) await p.fill('#v-email', email);
      if (received) await p.fill('#v-coi-received', received);
      if (expires) await p.fill('#v-coi-expires', expires);
      await p.click('#v-save-btn'); await p.waitForTimeout(900);
      return p.evaluate((n) => { const v = vendorDirectory.find((x) => x.vendor_name === n); return v ? { row: vendorIdOf(v), rec: v.coi_received, exp: v.coi_expires, email: v.email } : null; }, name);
    };
    const acme = await addVendor('Acme Movers', 'Moving', 'office@acme.test', '2026-10-01', EXP);
    ok(!!acme && acme.rec === '2026-10-01' && acme.exp === EXP, 'saved with both dates (' + JSON.stringify(acme) + ')');
    ok(posts.some((x) => x.type === 'addVendor' && x.payload && x.payload.fields && x.payload.fields.coi_received === '2026-10-01' && x.payload.fields.coi_expires === EXP), 'the sheet was sent coi_received and coi_expires');
    ok(!posts.some((x) => x.payload && x.payload.fields && 'coi_on_file' in x.payload.fields), 'and never coi_on_file');
    await p.click('#panel-vendors button:has-text("+ Add Vendor")'); await p.waitForTimeout(300);
    const palm = await addVendor('Palm Auctions', 'Auction House', 'desk@palm.test', '', '');
    ok(!!palm && !palm.rec && !palm.exp, 'a vendor saved with no certificate (' + JSON.stringify(palm) + ')');
    const gh = await p.$('#vendors-list div[onclick^="toggleVendorGroup"]'); if (gh) { await gh.click(); await p.waitForTimeout(300); }
    // Each category press redraws the list, so re-query by index rather than holding handles across the redraw.
    const nCats = (await p.$$('#vendors-list div[onclick^="toggleVendorCat"]')).length;
    for (let i = 0; i < nCats; i++) { const h = (await p.$$('#vendors-list div[onclick^="toggleVendorCat"]'))[i]; if (h) { await h.click(); await p.waitForTimeout(200); } }
    const cards = await p.evaluate(() => { const l = document.getElementById('vendors-list'); return l ? l.textContent.replace(/\s+/g, ' ') : ''; });
    has(cards, 'COI received Oct 1, 2026, expires ' + nice(EXP), 'the rendered card reads the certificate as dates');
    has(cards, 'COI not on file', 'and the other card says none is on file');

    // ── B. A client, an estimate with two vendor lines, the Job Plan ───────────────────────────────
    console.log('\n## B. The Job Plan flags the vendor without a certificate');
    const future = (d) => { const x = new Date(); x.setDate(x.getDate() + d); while (x.getDay() === 0 || x.getDay() === 6) x.setDate(x.getDate() + 1); return x.toISOString().slice(0, 10); };
    const WT = future(10), START = future(24);
    const id = await p.evaluate(([wt, start]) => {
      document.getElementById('btn-add-client').click();
      const set = (id, v) => { const e = document.getElementById(id); if (!e) return; e.value = v; if (e.onchange) e.onchange(); if (e.oninput) e.oninput(); };
      const pick = (id) => { const e = document.getElementById(id); const o = e && Array.from(e.options).find((x) => x.value); if (o) { e.value = o.value; if (e.onchange) e.onchange(); } };
      set('i-svc', 'home_cleanout'); toggleIntakeFields();
      set('i-fname', 'Walter'); set('i-lname', 'Brennan'); set('i-addr', '2 Ocean Blvd'); set('i-city', 'Palm Beach'); set('i-zip', '33480'); set('i-sqft', '3500');
      set('i-phone', '(561) 555-0133'); set('i-email', 'w@example.com');
      pick('i-ptype'); pick('i-src'); set('i-walkthrough', wt); set('i-start', start);
      saveIntake();
      const j = jobs[0]; if (!j || j.svc !== 'home_cleanout') return { err: (document.getElementById('i-fb') || {}).textContent };
      j.won = true; j.status = 'won'; j.wonBy = 'Anthony Graziano'; j.agrApproved = true; j.agrApprovedBy = 'Anthony Graziano'; j.agrApprovedAt = _todayStr();
      estimateStore[j.id] = { approved: true, approvedBy: 'Anthony Graziano', approvedAt: _todayStr(), estimate: { jobId: j.id, svc: 'home_cleanout', totTC: 20, totPS: 40, tcRate: 150, psRate: 100, tcFee: 3000, psFee: 4000, pkgCost: 0, havellinTotal: 7000,
        discountPct: 0, discountAmt: 0, prem: false, fixedPrice: false, rush: false, rushExPrepFee: true, collections: [], rooms: [{ name: 'Living Room' }], vehicles: [], prepItems: [],
        vendors: [{ type: 'Moving', cost: 1200, lid: 'mv' }, { type: 'Auction House', cost: 0, lid: 'ah' }] } };
      return j.id;
    }, [WT, START]);
    ok(typeof id === 'number', 'the client was created (' + JSON.stringify(id) + ')');
    await p.waitForTimeout(400);
    await p.evaluate((id) => openJobPlanFor(id), id); await p.waitForTimeout(1000);
    const on = (h) => '[onchange^="' + h + '"]';
    const choose = async (h, v) => { try { await p.locator(on(h)).first().selectOption(String(v)); await p.waitForTimeout(300); return true; } catch (e) { ok(false, 'could not choose ' + v + ' in ' + h + ' — ' + e.message.split('\n')[0]); return false; } };
    await choose('setJobVendor(' + id + ',0,', acme.row);
    await choose('setJobVendorStatus(' + id + ',0,', 'Confirmed');
    await choose('setJobVendor(' + id + ',1,', palm.row);
    await choose('setJobVendorStatus(' + id + ',1,', 'Confirmed');
    const readPlan = () => p.evaluate((id) => {
      const vs = document.getElementById('vendor-sourcing-' + id);
      const meta = document.getElementById('stage-meta-vendors');
      const link = vs && vs.querySelector('.vendor-coi-flag a[href^="mailto:"]');
      return { text: vs ? vs.textContent.replace(/\s+/g, ' ') : '', html: vs ? vs.innerHTML : '', meta: meta ? meta.textContent.replace(/\s+/g, ' ') : '',
               flags: vs ? vs.querySelectorAll('.vendor-coi-flag').length : -1, summary: vs ? vs.querySelectorAll('.vendor-coi-summary').length : -1,
               href: link ? link.getAttribute('href') : '', linkShown: link ? link.checkVisibility() : false,
               sw: document.documentElement.scrollWidth, iw: window.innerWidth };
    }, id);
    let plan = await readPlan();
    has(plan.text, 'COI to ' + nice(EXP), 'the mover\'s current certificate reads on its line');
    ok(plan.summary === 1, 'one summary at the top (' + plan.summary + ')');
    has(plan.text, '1 vendor on the job without a current certificate of insurance: Palm Auctions. Ask for it with the booking; the flag on the line offers the email.', 'naming the auction house');
    ok(plan.flags === 1, 'exactly one slot carries the flag (' + plan.flags + ')');
    has(plan.text, 'COI not on file: ask for it with the booking · Request COI', 'the flag with the one-tap request');
    ok(plan.linkShown, 'and the request link is on screen');
    has(plan.href, 'mailto:desk%40palm.test?subject=Certificate%20of%20insurance%20for%20Havellin%20Palm%20Beach', 'addressed to the firm\'s inbox, with the subject');
    has(decodeURIComponent(plan.href), 'certificate holder and additional insured', 'and the body asks for Havellin as certificate holder and additional insured');
    has(plan.meta, '2 of 2 confirmed', 'the fold\'s count (' + plan.meta + ')');
    has(plan.meta, '· 1 without a COI', 'carries the gap');
    ok(plan.sw <= plan.iw, 'no horizontal overflow at 1440 (' + plan.sw + ' / ' + plan.iw + ')');

    // ── C. Expire the mover's certificate through the real Edit form ─────────────────────────────
    console.log('\n## C. An expired certificate, through the real form');
    await p.click('.nb:has-text("Vendors")'); await p.waitForTimeout(300);
    await p.evaluate((row) => editVendor(row), acme.row); await p.waitForTimeout(300);
    const filled = await p.evaluate(() => ({ rec: document.getElementById('v-coi-received').value, exp: document.getElementById('v-coi-expires').value }));
    ok(filled.rec === '2026-10-01' && filled.exp === EXP, 'Edit fills both dates back (' + JSON.stringify(filled) + ')');
    await p.fill('#v-coi-expires', PAST);
    await p.click('#v-save-btn'); await p.waitForTimeout(900);
    const after = await p.evaluate((n) => { const v = vendorDirectory.find((x) => x.vendor_name === n); return v ? v.coi_expires : null; }, 'Acme Movers');
    ok(after === PAST, 'the expiry was saved (' + after + ')');
    await p.evaluate((id) => openJobPlanFor(id), id); await p.waitForTimeout(1000);
    plan = await readPlan();
    has(plan.text, 'COI expired ' + nice(PAST) + ': ask for a renewal certificate · Request COI', 'the plan reads it as expired and asks for a renewal');
    lacks(plan.text, 'COI to ', 'nothing on the plan still reads a current certificate');
    has(plan.text, '2 vendors on the job without a current certificate of insurance: Acme Movers, Palm Auctions.', 'the summary counts both, plural');
    ok(plan.flags === 2, 'both slots carry a flag (' + plan.flags + ')');
    has(plan.meta, '· 2 without a COI', 'and the fold\'s count says two');
    await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(400);
    plan = await readPlan();
    ok(plan.sw <= plan.iw, 'no horizontal overflow at 390 with two flags on the plan (' + plan.sw + ' / ' + plan.iw + ')');
    await p.setViewportSize({ width: 1440, height: 1000 }); await p.waitForTimeout(300);

    // ── D. Both agreements through the real print path ───────────────────────────────────────────
    console.log('\n## D. The agreements');
    const idE = await p.evaluate(([wt, start]) => {
      document.getElementById('btn-add-client').click();
      const set = (id, v) => { const e = document.getElementById(id); if (!e) return; e.value = v; if (e.onchange) e.onchange(); if (e.oninput) e.oninput(); };
      const pick = (id) => { const e = document.getElementById(id); const o = e && Array.from(e.options).find((x) => x.value); if (o) { e.value = o.value; if (e.onchange) e.onchange(); } };
      set('i-svc', 'probate'); toggleIntakeFields();
      set('i-fname', 'Harold'); set('i-lname', 'Pemberton'); set('i-addr', '1 Ocean Blvd'); set('i-city', 'Palm Beach'); set('i-zip', '33480'); set('i-sqft', '4000');
      pick('i-ptype'); pick('i-src'); set('i-walkthrough', wt); set('i-start', start);
      ['i-executor-fname', 'Catherine', 'i-executor-lname', 'Hale', 'i-executor-role', 'Personal Representative', 'i-executor-phone', '(561) 555-0188', 'i-executor-email', 'cph@example.com',
       'i-date-of-death', '2026-08-14', 'i-matter-type', 'probate', 'i-gate-706', 'no', 'i-doc-tier', 'values', 'i-probate-case', '50-2026-CP-004412',
       'i-probate-atty-fname', 'Robert', 'i-probate-atty-lname', 'Castellano', 'i-probate-atty-firm', 'Castellano & Reed', 'i-probate-atty-phone', '(561) 555-0170', 'i-probate-atty-email', 'r@example.com'].forEach((v, i, a) => { if (i % 2 === 0) set(v, a[i + 1]); });
      saveIntake();
      const j = jobs[0]; if (!j || j.svc !== 'probate') return { err: (document.getElementById('i-fb') || {}).textContent };
      j.won = true; j.status = 'won'; j.wonBy = 'Anthony Graziano'; j.agrApproved = true; j.agrApprovedBy = 'Anthony Graziano'; j.agrApprovedAt = _todayStr();
      return j.id;
    }, [WT, START]);
    ok(typeof idE === 'number', 'the estate was created (' + JSON.stringify(idE) + ')');
    await p.waitForTimeout(400);
    const estOf = (jid, svc) => ({ jobId: jid, svc: svc, totTC: 40, totPS: 80, tcRate: 150, psRate: 100, tcFee: 6000, psFee: 8000, pkgCost: 0, havellinTotal: 14000, discountPct: 0, discountAmt: 0,
      prem: false, fixedPrice: false, rush: false, rushExPrepFee: true, collections: [], rooms: [{ name: 'Living Room' }], vehicles: [], prepItems: [], vendors: [{ type: 'Moving', cost: 1200, lid: 'mv' }] });
    const print = async (jid, kind, svc) => {
      await p.evaluate(([jid, e, kind]) => { estimateStore[jid] = { approved: true, approvedBy: 'Anthony Graziano', approvedAt: _todayStr(), estimate: e }; window.__prints = []; docAction(jid, kind, 'print'); }, [jid, estOf(jid, svc), kind]);
      await p.waitForTimeout(500); const got = await p.evaluate(() => window.__prints[0] || ''); await p.waitForTimeout(700); return got;
    };
    const agrE = T(await print(idE, 'agreement', 'probate'));
    ok(agrE.length > 3000, 'the estate agreement printed through the real path (' + agrE.length + ')');
    has(agrE, 'General Liability: $[2,000,000] per occurrence / $[4,000,000] aggregate', '§6.1 prints the applied-for figure in brackets');
    has(agrE, 'Commercial Crime (fidelity) and Cyber: employee dishonesty and theft on client premises, covering every team member and contractor Havellin places on site; data breach', 'the crime line names the contractors on site');
    has(agrE, 'Figures in brackets are the limits Havellin has applied for;', 'and the note under the list');
    has(agrE, 'in no case exceeds $[per-item limit] for any one item or $[per-occurrence limit] for any one occurrence, the limits of the coverage stated in Section 6.1.', '§6.2 follows the policy');
    lacks(agrE, '$10,000 per item', 'the $10,000 cap is gone');
    has(agrE, '6.4 Third-Party Vendors', '§6.4 is on the estate form');
    has(agrE, 'Havellin requires every vendor it books to carry its own commercial general liability insurance', 'with the certificate sentence');
    has(agrE, 'a claim arising from a vendor’s conduct is made against that vendor and its insurer', 'and the claim path');
    has(agrE, '7.2 Marketing & Promotional Use', '§7.2 keeps its number');
    const agrL = T(await print(id, 'agreement', 'home_cleanout'));
    ok(agrL.length > 3000, 'the standard agreement printed (' + agrL.length + ')');
    has(agrL, '(f) Commercial Crime (fidelity) and Cyber, employee dishonesty and theft on client premises, covering every team member and contractor Contractor places on site; data breach; and (g) Workers’ Compensation, per Florida statutory requirements.', '§5.1 lists the seven, lettered');
    lacks(agrL, '$[', 'with no figures');
    has(agrL, 'Contractor requires every vendor it books to carry its own commercial general liability insurance', '§6 carries the certificate sentence');
    await p.waitForTimeout(600);

    ok(errs.length === 0, 'zero page errors' + (errs.length ? ' — ' + errs.slice(0, 2).join(' | ') : ''));
  } catch (e) {
    fail++; console.log('  ✗ threw: ' + (e && e.stack || e));
  } finally {
    if (b) await b.close();
  }
  console.log('\nstep94: ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
