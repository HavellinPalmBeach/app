// Step 53 — P18 (W-B, hours): Anthony's answer B of 2026-10-02.
//
// Drives the REAL page through its own controls: Build Estimate (the Property Preparation card's picker, cost box and +,
// the declutter box, Save Estimate, the room checkboxes, the Fixed price toggle), the Job Plan's hours form (its boxes
// and Save Hours Entry), the dashboard's Change Orders card (+ New, the modal, Create Change Order) and the documents'
// View. The Vendor Directory and the jobs backend are answered by routes, as the real Apps Script would answer them.
// What is seeded is state a person could not type in one sitting (a won, signed, funded job with a confirmed team; an
// approved estimate on a won job).
//
//   A. Home Prep: 5.5 typed in the declutter box is flagged beside it ("Estimates round up to whole hours: 5.5 is priced
//      as 6."), priced as 6 × $150 = $900 under a $6,900 total; Save Estimate saves it (P17 refused it) as 6; the client's
//      estimate prints 6.0 hrs × $150/hr = $900 above that total; the box steps by 1
//   B. an estimate's billed hours are whole: a Home Transition to a 2,350 sq ft home bills whole hours, the move day
//      included, and the client's estimate prints four whole-hour rows that add up to the two fees
//   C. the hours log refuses 1.25 on a crew row, naming it, and logs 1.5; every box steps by 0.5
//   D. a change order refuses 2.5 hours and records 3; both boxes step by 1
//   E. the agreement says "Time is recorded and billed in half-hour increments, as worked." on an hourly job — the
//      standard form's §3.3 and the estate form's §3.2 — and not on a fixed fee
//   F. overflow at 1440 and 390; no page errors
//
//   NODE_PATH=/opt/node22/lib/node_modules node tests/browser/step53.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');
const cents = (n) => Math.round(Number(n) * 100);
const LINE = 'Time is recorded and billed in half-hour increments, as worked.';

const VENDORS_URL = 'https://vendors.example.test/exec';
const SYNC = 'https://script.google.com/macros/s/FAKE-P18/exec';
const DIR = [
  { vendor_name: 'Brushworks Painting', category_group: 'Property Preparation', category: 'Painting', status: 'Active', _row: 2 },
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
    await ctx.route(SYNC + '*', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) }));
    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    const dialogs = []; p.on('dialog', async (d) => { dialogs.push(d.message()); await d.accept(); });
    await p.goto(APP); await p.waitForTimeout(1800);
    await p.evaluate(() => { window.open = function () { return null; }; });

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
    const step = (sel) => p.evaluate((s) => { const e = document.querySelector(s); return e ? e.getAttribute('step') : null; }, sel);
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const toDash = async (id) => { await p.evaluate((id) => goToClientDashboard(id), id); await p.waitForTimeout(400); };
    const est = () => p.evaluate(() => JSON.parse(JSON.stringify(currentEstimate || {})));
    // A document through the dashboard's own View: its text, then the viewer closed.
    const view = async (id, kind) => {
      const sel = '#client-dashboard-view button[onclick="docAction(' + id + ',\'' + kind + '\',\'view\')"]';
      const n = await p.locator(sel).count();
      if (!n) { ok(false, 'View ' + kind + ' is offered on the dashboard (' + n + ')'); return { text: '', html: '' }; }
      await p.locator(sel).first().click(); await p.waitForTimeout(500);
      const out = await p.evaluate(() => { const b = document.getElementById('doc-viewer-body');
        return { text: b ? b.textContent.replace(/\s+/g, ' ') : '', html: b ? b.innerHTML : '' }; });
      await p.evaluate(() => { const m = document.getElementById('doc-viewer-modal'); if (m) m.style.display = 'none'; });
      return out;
    };
    // The hours rows of a services table, read off the rendered page: [hours, rate, amount] where the second cell is an
    // hours figure and the third a rate per hour.
    const hourRows = (html) => p.evaluate((h) => {
      const d = document.createElement('div'); d.innerHTML = h;
      const num = (s) => Math.round(parseFloat(String(s).replace(/[^0-9.\-]/g, '')) * 100);
      return Array.from(d.querySelectorAll('tr')).map((tr) => Array.from(tr.children).map((c) => c.textContent.replace(/\s+/g, ' ').trim()))
        .filter((c) => c.length >= 4 && /^\d+(\.\d+)?$/.test(c[1]) && /\/hr$/.test(c[2]))
        .map((c) => ({ label: c[0].slice(0, 40), hrs: parseFloat(c[1]), rate: num(c[2]), amt: num(c[3]) }));
    }, html);
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
    // A won client whose approved estimate is the one given (state the PIN and the Won modal leave on a job).
    const wonWith = (id, job, e) => p.evaluate(([id, job, e, sync]) => {
      jobs = jobs.filter((j) => j.id !== id);
      jobs.unshift(Object.assign({ id, hvlId: 'HVL-2610-' + id, city: 'Palm Beach', zip: '33480', start: '2026-10-19', walkthrough: '2026-09-28',
        created: '2026-09-20', status: 'won', won: true, wonAt: '2026-09-29', wonBy: 'Anthony Graziano', wonMethod: 'call', approved: true,
        estimateSentDate: 'September 28, 2026', tc: 'Anthony Graziano', payments: [] }, job));
      estimateStore[id] = { estimate: Object.assign({}, e, { jobId: id }), approved: true, submitted: true, approvedBy: 'Anthony Graziano', savedAt: Date.now() };
      SHEETS_SYNC_URL = sync;
      saveJobs();
    }, [id, job, e, SYNC]);

    ok(await p.evaluate(() => vendorDirectoryReady()), 'fixture: the Vendor Directory is loaded');

    // ── A. Home Prep: 5.5 is flagged, priced and saved as 6 ─────────────────────────────────────────────
    let PREP = null;
    await section('A. Home Prep: 5.5 declutter hours are flagged, priced and saved as 6, and the client\'s page reads 6 × $150 = $900', async () => {
      await p.evaluate(() => {
        jobs = jobs.filter((j) => j.id !== 5301);
        jobs.unshift({ id: 5301, hvlId: 'HVL-2610-5301', name: 'Sam Marston', fname: 'Sam', lname: 'Marston', svc: 'prep', sqft: '2800',
          addr: '3 Royal Palm Way', city: 'Palm Beach', zip: '33480', email: 'sam@example.com', phone: '(561) 555-0144',
          start: '2026-10-19', walkthrough: '2026-09-28', created: '2026-09-20', status: 'new', tc: 'Ashley Jerome' });
        delete estimateStore[5301]; saveJobs();
      });
      await toDash(5301);
      await press('#client-dashboard-view .jt-next button[onclick="dashGoEstimate(5301)"]', 'the band\'s Build estimate');
      await p.waitForTimeout(600);
      eq(await step('#e-declutter-hrs'), '1', '⚠ the declutter box steps by 1');
      const gi = await p.evaluate(() => VENDOR_GROUP_CARDS.findIndex((c) => c.group === 'Property Preparation'));
      await p.selectOption('#vgrp-cat-' + gi, 'Painting').catch((e) => ok(false, 'pick Painting — ' + e.message.split('\n')[0]));
      await type('#vgrp-cost-' + gi, '20000', 'the painter\'s cost');
      await press('button[onclick="addFromVendorGroup(' + gi + ')"]', 'the Property Preparation card\'s +');
      await type('#e-declutter-hrs', '5.5', 'the declutter hours, 5.5');
      const hint = await txt('#e-declutter-hint');
      has(hint, 'Estimates round up to whole hours: 5.5 is priced as 6.', '⚠⚠ the hint beside the box flags it before Save');
      has(hint, '6.0 hrs × $150 = $900', '⚠⚠ and prices the 6 hours');
      lacks(hint, 'refuses', 'and refuses nothing');
      const e = await est();
      eq([e.declutterTCHrs, e.totTC, e.tcFee, e.prepFee, e.havellinTotal], [6, 6, 900, 6000, 6900],
         '⚠⚠ the estimate holds 6 hours and bills 6 × $150 = $900 under a $6,900 total (P17: 5.5, $825, $6,825)');
      eq([await txt('#s-tc-fee'), await txt('#s-havellin')], ['$900', '$6,900'], 'the summary\'s hours row and subtotal');
      await press('#est-save-card button:has-text("Save Estimate")', 'Save Estimate, with 5.5 in the box');
      has(await txt('#e-fb'), '+ 6.0 declutter hrs · total $6,900', '⚠⚠ Save Estimate saves it (P17 refused it), naming the 6 hours saved');
      const saved = await p.evaluate(() => { const r = estimateStore[5301]; return r && r.estimate ? r.estimate.declutterTCHrs : null; });
      eq(saved, 6, '⚠⚠ the record saved holds 6, the figure priced');
      PREP = await p.evaluate(() => JSON.parse(JSON.stringify((estimateStore[5301] || {}).estimate || {})));
      await p.waitForTimeout(1500);   // Save lands on the dashboard a moment later
      // The client's estimate, through the dashboard's View, on the job once the estimate is approved and the client said yes.
      await wonWith(5302, { name: 'Pat Marston', fname: 'Pat', lname: 'Marston', svc: 'prep', sqft: '2800', addr: '5 Royal Palm Way',
        email: 'pat@example.com', phone: '(561) 555-0145' }, PREP);
      await toDash(5302);
      const ce = await view(5302, 'estimate');
      has(ce.text, 'hands-on clearing of the rooms (6.0 hrs × $150/hr)', '⚠⚠ the Home Prep page prints 6.0 hrs × $150/hr');
      has(ce.text, '$900', 'at $900');
      has(ce.text, 'Havellin Services Total$6,900', '⚠⚠ above a total that counts exactly it, $6,000 + $900');
      lacks(ce.text, '5.5 hrs', 'and never the 5.5 typed');
    });

    // ── B. an estimate's billed hours are whole ─────────────────────────────────────────────────────────
    await section('B. a Home Transition bills whole hours, the move day included, and its client estimate\'s rows add up', async () => {
      await p.evaluate(() => {
        jobs = jobs.filter((j) => j.id !== 5303);
        jobs.unshift({ id: 5303, hvlId: 'HVL-2610-5303', name: 'Lee Vance', fname: 'Lee', lname: 'Vance', svc: 'downsizing_move', sqft: '3500', destSqft: '2350',
          addr: '7 Palm Way', city: 'Palm Beach', zip: '33480', email: 'lee@example.com', phone: '(561) 555-0146', propVal: '2500000',
          start: '2026-10-19', walkthrough: '2026-09-28', created: '2026-09-20', status: 'new', tc: 'Ashley Jerome' });
        delete estimateStore[5303]; saveJobs();
      });
      await toDash(5303);
      await press('#client-dashboard-view .jt-next button[onclick="dashGoEstimate(5303)"]', 'the band\'s Build estimate');
      await p.waitForTimeout(600);
      const ids = await tickHouse();
      eq(ids.length, HOUSE.length, 'fixture: the seven rooms are ticked on the grid');
      if (await p.evaluate(() => document.getElementById('e-fixed').checked)) await press('label.toggle:has(#e-fixed)', 'untick Fixed price, to read the hours');
      const e = await est();
      eq([e.totTC, e.totPS, e.destTC, e.destPS].map((h) => Number.isInteger(h)), [true, true, true, true],
         '⚠⚠ every billed hour is whole: ' + [e.totTC, e.totPS, e.destTC, e.destPS].join(' / ') + ' (the move day was 12.7 / 21.2 before P17, 12.75 / 21.25 on P17)');
      eq([e.destTC, e.destPS], [13, 22], 'the move day is rounded up: 13 concierge and 22 specialist hours to a 2,350 sq ft home');
      has(await txt('#tc-fee-label'), '(' + e.totTC + '.0 hrs × $150)', 'the concierge fee line prints the whole hours');
      has(await txt('#ps-fee-label'), '(' + e.totPS + '.0 hrs × $100)', 'and so does the specialist line');
      eq([cents(e.tcFee), cents(e.psFee)], [cents(e.totTC * 150), cents(e.totPS * 100)], 'each fee is the whole hours at the rate');
      await wonWith(5304, { name: 'Lee Vance', fname: 'Lee', lname: 'Vance', svc: 'downsizing_move', sqft: '3500', destSqft: '2350', addr: '9 Palm Way',
        email: 'lee@example.com', phone: '(561) 555-0146' }, e);
      await toDash(5304);
      const ce = await view(5304, 'estimate');
      const rows = await hourRows(ce.html);
      eq(rows.length, 4, 'fixture: the client estimate prints four hours rows, on site and move day (' + rows.map((r) => r.hrs).join(' / ') + ')');
      eq(rows.map((r) => Number.isInteger(r.hrs)), [true, true, true, true], '⚠⚠ every hours figure the client reads is whole');
      eq(rows.map((r) => r.amt), rows.map((r) => Math.round(r.hrs * r.rate)), 'each row is its hours at its rate');
      eq(rows.reduce((a, r) => a + r.amt, 0), cents(e.tcFee) + cents(e.psFee), '⚠⚠ and the four rows add up to the two fees the total counts');
    });

    // ── C. the hours log: half hours ───────────────────────────────────────────────────────────────────
    await section('C. the hours log refuses 1.25 on a crew row, naming it, and logs 1.5; every box steps by 0.5', async () => {
      await p.evaluate(() => {
        jobs = jobs.filter((j) => j.id !== 5305);
        jobs.unshift({ id: 5305, hvlId: 'HVL-2610-5305', name: 'Tripp Butler', fname: 'Tripp', lname: 'Butler', svc: 'home_cleanout', sqft: '3500',
          addr: '69 Beach Blvd', city: 'Palm Beach', zip: '33480', email: 'tripp@example.com', phone: '(561) 555-0101',
          start: '2026-09-21', walkthrough: '2026-09-10', created: '2026-09-08', status: 'active', won: true, wonAt: '2026-09-12',
          wonBy: 'Anthony Graziano', wonMethod: 'call', approved: true, agrApproved: true, agrApprovedBy: 'Anthony Graziano',
          agrSent: true, agrSigned: true, depositReceived: true, tc: 'Ashley Jerome', activatedOn: '2026-09-21', activatedBy: 'Ashley Jerome',
          payments: [{ uid: 'd5305', stage: 'deposit', amount: 6125, receivedOn: '2026-09-15', method: 'wire', clearedOn: '2026-09-15' }],
          crew: { tc: { name: 'Ashley Jerome', locked: true }, tc2: { name: 'Anthony Graziano', locked: true },
                  ps: [{ name: 'Anthony Graziano Jr', locked: true }], confirmed: true, confirmedBy: 'Ashley Jerome', confirmedAt: '2026-09-20', picked: true } });
        estimateStore[5305] = { approved: true, approvedBy: 'Anthony Graziano', approvedAt: 'September 12, 2026', savedAt: Date.parse('2026-09-12T13:00:00Z'),
          estimate: { jobId: 5305, svc: 'home_cleanout', totTC: 41, totPS: 61, tcRate: 150, psRate: 100, tcFee: 6150, psFee: 6100,
            havellinTotal: 12250, grandTotal: 12250, vendors: [], prepItems: [], rooms: [], needsTC2: true, tcCount: 2, psCount: 1 } };
        delete jobLogs[5305];
        saveJobs();
      });
      ok(await p.evaluate(() => openJobPlanFor(5305)), 'the Job Plan opens on the job');
      await p.waitForTimeout(700);
      const open = await p.evaluate(() => { const e = document.getElementById('phase-body-hours'); return !!e && e.style.display !== 'none'; });
      if (!open) await press('[onclick="togglePhase(\'hours\')"]', 'the Hours & daily close fold');
      for (const id of ['#log-m0-hrs', '#log-tc2-hrs', '#log-m1-hrs']) eq(await step(id), '0.5', '⚠ ' + id + ' steps by 0.5');
      const date = await p.evaluate(() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); });
      await p.evaluate((d) => { document.getElementById('log-date').value = d; }, date);
      await type('#log-activity', 'Kitchen sort', 'the activity');
      await type('#log-m0-hrs', '7', 'the concierge\'s 7');
      await type('#log-m1-hrs', '1.25', 'the specialist\'s hours, 1.25');
      await press('#btn-save-hours', 'Save Hours Entry');
      has(await txt('#log-fb'), 'Hours are logged in half hours (0.5, 1.0, 1.5 …). Not a half hour: Anthony Graziano Jr (1.25).', '⚠⚠ 1.25 on the crew row is refused, naming the row');
      eq(await p.evaluate(() => (jobLogs[5305] || []).length), 0, 'and nothing is logged, the concierge\'s good 7 included');
      await type('#log-m1-hrs', '1.5', 'the specialist\'s hours, 1.5');
      await press('#btn-save-hours', 'Save Hours Entry');
      has(await txt('#log-fb'), 'Hours entry saved', '⚠⚠ 1.5 is logged');
      eq(await p.evaluate(() => ((jobLogs[5305] || [])[0] || { members: [] }).members.map((m) => m.role + ':' + m.hours).join(' ')), 'TC:7 PS:1.5',
         'exactly as typed: 7 and 1.5');
    });

    // ── D. a change order: whole hours ─────────────────────────────────────────────────────────────────
    await section('D. a change order refuses 2.5 hours and records 3', async () => {
      await toDash(5305);
      await press('#client-dashboard-view button[onclick="openChangeOrder(5305)"]', '+ New on the Change Orders card');
      eq([await step('#co-tc-hrs'), await step('#co-ps-hrs')], ['1', '1'], '⚠ both hours boxes step by 1');
      await type('#co-description', 'Garage added to scope.', 'the description');
      await p.evaluate(() => { const s = document.getElementById('co-reason'); const vs = Array.from(s.options).map(o => o.value).filter(Boolean); s.value = vs.indexOf('scope_add') >= 0 ? 'scope_add' : vs[0]; });   // P25 (Q54): no reason is pre-picked; a person picks one
      await type('#co-tc-hrs', '2.5', '2.5 concierge hours');
      await press('#change-order-modal button:has-text("Create Change Order")', 'Create Change Order');
      has(await txt('#co-fb'), 'Change orders are in whole hours (1, 2, 3 …): concierge 2.5 is not a whole hour. Nothing was saved.', '⚠⚠ 2.5 is refused, naming the figure');
      eq(await p.evaluate(() => changeOrders.filter((c) => c.jobId === 5305).length), 0, 'and nothing is recorded');
      await type('#co-tc-hrs', '3', '3 concierge hours');
      await press('#change-order-modal button:has-text("Create Change Order")', 'Create Change Order');
      eq(await p.evaluate(() => changeOrders.filter((c) => c.jobId === 5305).map((c) => [c.tcHrs, c.psHrs])), [[3, 0]], '⚠⚠ 3 is recorded');
    });

    // ── E. the agreements ──────────────────────────────────────────────────────────────────────────────
    await section('E. the agreement says how time is billed on an hourly job, and not on a fixed fee', async () => {
      // Three won clients, each priced on Build Estimate's real engine: hourly living, fixed living, hourly estate.
      const priced = async (id, svc, fixed) => {
        await p.evaluate(([id, svc]) => {
          jobs = jobs.filter((j) => j.id !== id);
          jobs.unshift({ id, hvlId: 'HVL-2610-' + id, name: 'Ada Vale ' + id, fname: 'Ada', lname: 'Vale', svc, sqft: '3500', propVal: '2500000',
            addr: id + ' Ocean Blvd', city: 'Palm Beach', zip: '33480', email: 'ada@example.com', phone: '(561) 555-0157',
            executor: svc === 'cleanout' ? 'Mark Vale' : '', executorRole: svc === 'cleanout' ? 'Personal Representative' : '',
            executorEmail: svc === 'cleanout' ? 'mark@example.com' : '', matterType: svc === 'cleanout' ? 'probate' : '', docTier: svc === 'cleanout' ? 'values' : '',
            dateOfDeath: svc === 'cleanout' ? '2026-08-01' : '',
            start: '2026-10-19', walkthrough: '2026-09-28', created: '2026-09-20', status: 'new', tc: 'Anthony Graziano' });
          delete estimateStore[id]; saveJobs();
        }, [id, svc]);
        await toDash(id);
        await press('#client-dashboard-view .jt-next button[onclick="dashGoEstimate(' + id + ')"]', 'the band\'s Build estimate (' + svc + (fixed ? ', fixed' : '') + ')');
        await p.waitForTimeout(600);
        await tickHouse();
        const isFixed = await p.evaluate(() => document.getElementById('e-fixed').checked);
        if (isFixed !== fixed) await press('label.toggle:has(#e-fixed)', (fixed ? 'tick' : 'untick') + ' Fixed price');
        const e = await est();
        ok(!!e.fixedPrice === fixed, 'fixture: the estimate is ' + (fixed ? 'a fixed fee' : 'hourly') + ' ($' + e.havellinTotal + ')');
        await p.evaluate((id) => { jobs.find((j) => j.id === id).status = 'won'; }, id);
        await wonWith(id, Object.assign({}, await p.evaluate((id) => JSON.parse(JSON.stringify(jobs.find((j) => j.id === id))), id), { status: 'won' }), e);
        await toDash(id);
        return (await view(id, 'agreement')).text;
      };
      const hourly = await priced(5306, 'home_cleanout', false);
      has(hourly, '3.3 Hourly and Project Rates.', 'fixture: the standard form\'s hourly §3.3');
      has(hourly, 'All rates are inclusive of on-site project oversight, client liaison, and vendor coordination. ' + LINE, '⚠⚠ which says time is billed in half-hour increments, as worked');
      const fixedA = await priced(5307, 'home_cleanout', true);
      has(fixedA, '3.3 Fixed Project Fee.', 'fixture: the standard form\'s fixed-fee §3.3');
      lacks(fixedA, 'half-hour increments', '⚠⚠ and a fixed fee, which bills no time, never says it');
      const estate = await priced(5308, 'cleanout', false);
      has(estate, 'IMPORTANT: Final billing reflects actual hours worked and materials used. ' + LINE, '⚠⚠ the estate form\'s §3.2 says it on an hourly engagement');
    });

    // ── F. overflow, and errors ───────────────────────────────────────────────────────────────────────
    await section('F. overflow at 1440 and 390; no page errors', async () => {
      await toDash(5305);
      ok(await overflow() <= 0, 'the dashboard fits at 1440 (' + await overflow() + ')');
      await p.evaluate(() => dashGoEstimate(5301)); await p.waitForTimeout(600);
      await p.fill('#e-declutter-hrs', '5.5').catch(() => {}); await p.waitForTimeout(200);
      ok(await overflow() <= 0, 'Build Estimate with the flag showing fits at 1440 (' + await overflow() + ')');
      await p.setViewportSize({ width: 390, height: 844 });
      await p.waitForTimeout(300);
      ok(await overflow() <= 0, 'and at 390 (' + await overflow() + ')');
      has(await txt('#e-declutter-hint'), 'Estimates round up to whole hours', 'with the flag on screen');
      await toDash(5305); await p.waitForTimeout(300);
      ok(await overflow() <= 0, 'the dashboard fits at 390 (' + await overflow() + ')');
      ok(await p.evaluate(() => openJobPlanFor(5305)), 'the Job Plan opens on a phone');
      await p.waitForTimeout(600);
      ok(await overflow() <= 0, 'the Job Plan\'s hours form fits at 390 (' + await overflow() + ')');
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
