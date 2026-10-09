// Step 45 — P16 (agreements and pricing): Anthony's answers of 2026-09-30, round 2, and the defects in this area.
//
// Drives the REAL page through its own controls: the band's Print and View on the signing packet and the final
// invoice, its Manager approval, the Change Orders card (+ New, the modal, Create, Get Acceptance, the acceptance
// panel, PDF), the Job Plan, Build Estimate's vendor cards, its Premium and Fixed price toggles and its crew size.
// The Vendor Directory is answered by a route, as the real Apps Script would answer it. What is seeded is state a
// person could not type in one sitting (a won, signed, funded job; logged hours; a closed job).
//
//   A. the living-client packet, printed: §3.9 names ACH, wire and check (no card); the hourly §12.4 keeps the
//      deposit; §3.5 charges the prep fee on vendors "identified in the Estimate or added by Change Order"
//   B. the estate packet on a *neither* matter: the hourly §8.1 keeps the deposit; §5.3's counsel row names the Client
//   C. a change order adds a landscaper to a Home Transition with bundled prep: the vendor block, the refusal without
//      a cost, the readout, the card, the acceptance, the PDF, the Job Plan, and the final bills its fee with no PIN
//   D. the final's Manager approval: a blocked final says what blocks it (B8); an hourly rush job's accepted change
//      order moves the baseline by what the final bills for it, so the exact hours read inside the tolerance (B9)
//   E. crew hours with no concierge hours are flagged on the band where the final is sent (B25)
//   F. Build Estimate: on a Premium estate an appraiser line books no hours, and its row says why, both ways (A4)
//   G. the crew badge on a fixed price says the fee does not move with the crew (Q5)
//   H. the "Agreement not signed" chip names what is missing, never "Approve the agreement"
//   I. overflow at 1440 and 390; no page errors
//
//   NODE_PATH=/opt/node22/lib/node_modules node tests/browser/step45.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');

const VENDORS_URL = 'https://vendors.example.test/exec';
const DIR = [
  { vendor_name: 'Brushworks Painting', category_group: 'Property Preparation', category: 'Painting', status: 'Active', _row: 2 },
  { vendor_name: 'Green Thumb Landscaping', category_group: 'Property Preparation', category: 'Landscaper', status: 'Active', _row: 3 },
  { vendor_name: 'Gallery Fine Art Appraisals', category_group: 'Asset Liquidation & Valuation', category: 'Art Appraiser', status: 'Active', _row: 4 },
  { vendor_name: 'Heritage Auctions', category_group: 'Asset Liquidation & Valuation', category: 'Auction House', status: 'Active', _row: 5 },
];

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
    await ctx.addInitScript(([vu, dir]) => {
      try { localStorage.setItem('hav_vendor_url', vu); localStorage.setItem('hav_vendor_dir', JSON.stringify(dir)); } catch (e) {}
    }, [VENDORS_URL, DIR]);
    await ctx.route(VENDORS_URL + '**', async (r) => {
      if (r.request().method() === 'POST') return r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ vendors: DIR }) });
    });
    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', e => errs.push(String(e)));
    const dialogs = []; p.on('dialog', async d => { dialogs.push(d.message()); await d.accept(); });
    await p.goto(APP); await p.waitForTimeout(1800);
    await p.evaluate(() => { window.open = function () { return null; }; window.__prints = [];
      window.print = function () { const pt = document.getElementById('print-target'); window.__prints.push(pt ? pt.innerHTML : ''); }; });

    const section = async (name, body) => {
      console.log('\n## ' + name);
      await p.evaluate(() => ['change-order-modal', 'co-accept-modal', 'doc-viewer-modal', 'inv-pin-modal']
        .forEach((id) => { const m = document.getElementById(id); if (m) m.style.display = 'none'; })).catch(() => {});
      try { await body(); } catch (e) { fail++; console.log('  ✗ ' + name + ' threw: ' + String(e && e.message || e).split('\n')[0]); }
    };
    const vis = (sel) => p.locator(sel).first().isVisible().catch(() => false);
    const press = async (sel, what) => {
      const n = await p.locator(sel).count();
      const v = n === 1 && await vis(sel);
      ok(v, (what || sel) + ' — one control, on screen (' + n + ')');
      if (v) { await p.click(sel, { timeout: 5000 }).catch((e) => ok(false, (what || sel) + ' — ' + e.message.split('\n')[0])); await p.waitForTimeout(350); }
      return v;
    };
    const txt = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }, sel);
    const shown = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return !!el && el.checkVisibility(); }, sel);
    const T = (h) => p.evaluate((h) => { const d = document.createElement('div');
      d.innerHTML = String(h).replace(/<\/td>/g, ' </td>').replace(/<\/th>/g, ' </th>').replace(/<br>/g, ' ').replace(/<\/li>/g, ' </li>');
      return d.textContent.replace(/\s+/g, ' '); }, h);
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const toDash = async (id) => { await p.evaluate((id) => goToClientDashboard(id), id); await p.waitForTimeout(400); };
    const coOf = (id) => p.evaluate((id) => { const c = changeOrders.filter((x) => x.jobId === id).pop();
      return c ? JSON.parse(JSON.stringify(c)) : null; }, id);
    const printed = async (sel, what) => {
      await p.evaluate(() => { window.__prints = []; });
      await press(sel, what);
      await p.waitForTimeout(500);
      return T(await p.evaluate(() => window.__prints[window.__prints.length - 1] || ''));
    };
    const viewed = async (sel, what) => {
      await press(sel, what);
      await p.waitForTimeout(400);
      const t = await txt('#doc-viewer-body');
      await p.evaluate(() => { const m = document.getElementById('doc-viewer-modal'); if (m) m.style.display = 'none'; });
      return t;
    };

    ok(await p.evaluate(() => vendorDirectoryReady()), 'fixture: the Vendor Directory is loaded');

    // A job at any stage, seeded as the record a person would have built. `o.stage`: 'won' (estimate approved, the
    // client's yes, nothing sent), 'active' (signed, funded, started) or 'closed' (worked and handed over).
    const seed = (o) => p.evaluate((o) => {
      const id = o.id;
      const base = { id, hvlId: 'HVL-2609-S' + id, name: o.name, fname: o.name.split(' ')[0], lname: o.name.split(' ').pop(), svc: o.svc,
        sqft: '3500', addr: id + ' Ocean Blvd', city: 'Palm Beach', zip: '33480', email: 'client' + id + '@example.com', phone: '(561) 555-0' + (100 + id % 900),
        start: '2026-09-01', walkthrough: '2026-08-15', created: 'Aug 10, 2026', tc: 'Anthony Graziano', siteVisitBy: 'Anthony Graziano',
        status: 'won', won: true, wonAt: '2026-08-20', wonBy: 'Anthony Graziano', wonMethod: 'call', approved: true,
        estimateSentDate: 'August 18, 2026', acceptedTotal: o.est.havellinTotal, premium: !!o.est.prem };
      if (o.estate) Object.assign(base, { executor: 'Sam Heir', executorRole: 'Personal Representative', executorEmail: 'sam@example.com',
        executorPhone: '(561) 555-0142', matterType: o.matter || 'probate', docTier: 'values', dateOfDeath: '2026-06-01' });
      if (o.stage === 'active' || o.stage === 'closed') Object.assign(base, { status: 'active', agrApproved: true, agrApprovedBy: 'Anthony Graziano',
        agrSent: true, agrSigned: true, depositReceived: true, activatedOn: '2026-09-01', activatedBy: 'Anthony Graziano',
        payments: [{ uid: 'd' + id, stage: 'deposit', amount: Math.round(o.est.havellinTotal / 2), date: '2026-08-25', method: 'wire', clearedOn: '2026-08-25' }],
        docState: { estimate: { sentAt: '2026-08-18T14:00:00.000Z' },
                    agreement: { sentAt: '2026-08-21T14:00:00.000Z', sig: { signedBy: o.name, signedOn: '2026-08-22', how: 'in_person', recordedBy: 'Anthony Graziano' } },
                    'invoice:deposit': { sentAt: '2026-08-23T14:00:00.000Z' } } });
      if (o.stage === 'closed') Object.assign(base, { status: 'closed', deliveredOn: '2026-09-29', deliveredBy: 'Anthony Graziano' });
      jobs = jobs.filter((j) => j.id !== id); jobs.unshift(Object.assign(base, o.job || {}));
      estimateStore[id] = { approved: true, approvedBy: 'Anthony Graziano', approvedAt: 'August 17, 2026', savedAt: Date.parse('2026-08-17T13:00:00Z'),
        estimate: Object.assign({ jobId: id, rooms: [{ idx: 0, name: 'Kitchen', vol: 3, cplx: 3 }], collections: [], vehicles: [], vendors: [], prepItems: [] }, o.est) };
      if (o.logs) { jobLogs[id] = o.logs; try { localStorage.setItem('havellin_logs_v3', JSON.stringify(jobLogs)); } catch (e) {} }
      saveJobs();
      return id;
    }, o);
    const EST_BP = { svc: 'downsizing_move', totTC: 80, totPS: 60, tcFee: 12000, psFee: 6000, pkgCost: 1940, pkgLabel: 'Standard — $1,940',
      smf: 0, prepEnabled: true, prepCost: 10000, prepFee: 3000, prepItems: [{ type: 'Painting', cost: 10000, note: '', lid: 'bp1' }],
      havellinTotal: 22940, grandTotal: 32940, tcRate: 150, psRate: 100, discountPct: 0, fixedPrice: false, rush: false, rushExPrepFee: true,
      preparedBy: 'Anthony Graziano', docScope: 'none' };

    // ── A. the living-client packet ──────────────────────────────────────────
    await section('A. the living-client packet: §3.9 without cards, the hourly §12.4 keeps the deposit, §3.5 names a change order', async () => {
      await seed({ id: 4501, name: 'Helen Harper', svc: 'downsizing_move', stage: 'won', est: EST_BP });
      await toDash(4501);
      const pk = await printed('#client-dashboard-view button[onclick="docAction(4501,\'agreement\',\'print\')"]', 'the band\'s Print on the signing packet');
      ok(pk.length > 2000, 'fixture: the packet printed (' + pk.length + ' characters)');
      has(pk, '3.9 Payment Method. Payment may be made by ACH bank transfer through Contractor\'s secure payment link, by wire transfer, or by check payable to Havellin Palm Beach LLC.',
          '⚠⚠ §3.9 names ACH through the payment link, wire and check');
      ok(!/credit\/debit|\bcards?\b/i.test(pk), '⚠ and no card anywhere in the packet, Exhibit A included');
      has(pk, 'The deposit is earned on signature and is not refundable, including where it exceeds that amount',
          '⚠⚠ the hourly §12.4 keeps the deposit');
      lacks(pk, 'refund the unused balance', 'and refunds no "unused balance"');
      has(pk, 'Home sale preparation vendors identified in the Estimate or added by Change Order are the exception', '§3.5 charges the fee on a vendor a change order adds');
    });

    // ── B. the estate packet on a neither matter ─────────────────────────────
    await section('B. the estate packet on a *neither* matter: the hourly §8.1 keeps the deposit; §5.3 names the Client', async () => {
      await seed({ id: 4502, name: 'Estate of Ruth Vale', svc: 'cleanout', stage: 'won', estate: true, matter: 'neither',
        est: { svc: 'cleanout', docScope: 'full', docTier: 'values', totTC: 60, totPS: 120, tcRate: 150, psRate: 100, tcFee: 9000, psFee: 12000,
               havellinTotal: 21000, grandTotal: 21000, fixedPrice: false } });
      await toDash(4502);
      const pk = await printed('#client-dashboard-view button[onclick="docAction(4502,\'agreement\',\'print\')"]', 'the band\'s Print on the estate packet');
      ok(pk.length > 2000, 'fixture: the packet printed');
      has(pk, 'The deposit is earned in full on signature of this Agreement and is not refundable. It is applied against the hours worked and materials used, and no part of it is returned where it exceeds them',
          '⚠⚠ the hourly §8.1 earns the deposit on signature');
      lacks(pk, 'after project start', 'never "after project start"');
      has(pk, 'Professional appraisals are arranged by the Client.', '§5.2 names the Client …');
      has(pk, 'Admit an appraiser engaged by the Client Instruction from the Client As scheduled by the Client', '⚠⚠ … and so does §5.3\'s row, in all three columns');
      lacks(pk, 'engaged by counsel', 'not counsel in the abstract');
      // §4.2's blank change order on an estate with no preparation vendor reads as it did (lead, P16).
      lacks(pk, 'Added Preparation Vendor', '§4.2 has no vendor row where no change order can add one');
      has(pk, 'The additional hours are billed as worked, at the hourly rates in Section 3.1. This Change Order does not itself create a charge.',
          'and its Billing row reads as it did');
    });

    // ── B2. the estate packet with a preparation vendor: §4.2 can record a vendor a change order adds (lead) ──
    await section('B2. an estate with a preparation vendor: §4.2 has a row for an added vendor and names its fee', async () => {
      await seed({ id: 4509, name: 'Estate of Iris Lane', svc: 'cleanout', stage: 'won', estate: true, matter: 'probate',
        est: { svc: 'cleanout', docScope: 'full', docTier: 'values', totTC: 60, totPS: 120, tcRate: 150, psRate: 100, tcFee: 9000, psFee: 12000,
               prepEnabled: true, prepCost: 8000, prepFee: 2400, prepItems: [{ type: 'Painting', cost: 8000, note: '', lid: 'ep1' }],
               havellinTotal: 23400, grandTotal: 31400, fixedPrice: false, rushExPrepFee: true } });
      await toDash(4509);
      const pk = await printed('#client-dashboard-view button[onclick="docAction(4509,\'agreement\',\'print\')"]', 'the band\'s Print on the estate packet');
      ok(pk.length > 2000, 'fixture: the packet printed');
      // ⚠ RESTATED (P25, Q52; Anthony, 2026-10-09: "quotes, then trued"): the prep fee's basis reads what the app bills, the quotes recorded, updated if an invoice differs.
      has(pk, 'Added Preparation Vendor (the vendor and its estimated cost. It bills the Client directly, at cost, and the Home Sale Preparation Fee in Section 3.1 is charged on its quote as recorded, updated if its invoice differs.)',
          '⚠⚠ §4.2 has a row for a vendor a change order adds');
      has(pk, 'A preparation vendor this Change Order adds bills the Client directly, at cost, and the Home Sale Preparation Fee is charged on its quote as recorded, updated if its invoice differs; this Change Order creates no other charge.',
          '⚠⚠ and its Billing row names the fee rather than "no charge"');
      lacks(pk, 'This Change Order does not itself create a charge', 'never the old sentence beside a vendor row');
      has(pk, 'identified in Exhibit A or added by Change Order', 'the fee row the form points to');
    });

    // ── C. a change order adds a vendor to a bundled-prep labour job ─────────
    await section('C. a change order adds a landscaper to a Home Transition with bundled prep, and the final bills its fee', async () => {
      await seed({ id: 4503, name: 'Nora Harper', svc: 'downsizing_move', stage: 'active', est: EST_BP });
      await toDash(4503);
      await press('#client-dashboard-view button[onclick="openChangeOrder(4503)"]', '+ New on the Change Orders card');
      ok(await shown('#co-vendor-wrap'), '⚠⚠ the modal offers a prep vendor on a labour job whose estimate bundles prep');
      ok(await p.evaluate(() => !document.getElementById('co-ps-hrs').disabled), 'with the specialist hours open, as on any labour job');
      const vopts = await p.evaluate(() => Array.from(document.getElementById('co-vendor-type').options).map((o) => o.value));
      eq(vopts, ['', 'Landscaper', 'Painting'], 'from the directory\'s Property Preparation categories');
      has(await txt('#co-basis-note'), 'A change order can also add a preparation vendor found mid-job, with or without hours', 'the note says so');
      await p.selectOption('#co-vendor-type', 'Landscaper');
      await p.fill('#co-description', 'Relandscape the front beds before listing.');
      await p.evaluate(() => { const s = document.getElementById('co-reason'); const vs = Array.from(s.options).map(o => o.value).filter(Boolean); s.value = vs.indexOf('scope_add') >= 0 ? 'scope_add' : vs[0]; });   // P25 (Q54): no reason is pre-picked; a person picks one
      await press('#change-order-modal button:has-text("Create Change Order")', 'Create, with no cost typed');
      has(await txt('#co-fb'), 'Enter the added vendor’s estimated cost, so the client sees the fee it carries.', '⚠ refused by name without a cost');
      ok(!(await coOf(4503)), 'and nothing is recorded');
      await p.fill('#co-vendor-cost', '9000'); await p.waitForTimeout(250);
      // RESTATED 2026-10-01 (P17, Anthony's answer 5): the fee is the Home Sale Preparation Fee; this read "site management fee".
      has(await txt('#co-hrs-note'), 'the 30% Home Sale Preparation Fee applies to its quote as recorded, updated if its invoice differs — about $2,700 at the estimated $9,000', 'the readout names the fee');
      await press('#change-order-modal button:has-text("Create Change Order")', 'Create');
      const co = await coOf(4503);
      eq(co && co.vendorAdds && co.vendorAdds.map((v) => [v.type, v.cost]), [['Landscaper', 9000]], '⚠⚠ the change order records the landscaper');
      has(await txt('#client-dashboard-view'), 'adds Landscaper (est. $9,000)', 'the card names it');
      await press('#client-dashboard-view button[onclick="openCOAcceptModal(' + co.id + ')"]', 'Get Acceptance');
      const sum = await txt('#coa-summary');
      has(sum, 'Landscaper, est. $9,000, billed to you directly', 'the client sees what it adds');
      lacks(sum, 'No charge is created', 'and not "no charge"');
      has(await txt('#coa-terms'), 'and the addition of Landscaper to the preparation vendors, billed to them directly at cost', 'the terms name it');
      await p.fill('#coa-client-name', 'Nora Harper');
      await press('#co-accept-modal button:has-text("I Accept This Change Order")', 'I Accept');
      has(await txt('#dash-fb'), 'Landscaper now sits with the prep vendors on the Job Plan, to be booked and quoted.', 'the notice says where it went');
      const pr = await printed('#client-dashboard-view button[onclick="printChangeOrder(' + co.id + ')"]', 'the row\'s PDF');
      has(pr, 'This change order adds Landscaper to the preparation vendors.', 'the page says what it adds');
      has(pr, 'Added preparation vendor: Landscaper', 'and names it in the table');
      lacks(pr, 'Third-party vendor costs are unaffected', '⚠ never the line this change makes false');
      // The Job Plan's sourcing list.
      ok(await p.evaluate(() => openJobPlanFor(4503)), 'the Job Plan opens');
      await p.waitForTimeout(700);
      const plan = await txt('#panel-job-plan');
      has(plan, 'Landscaper', '⚠⚠ the landscaper is on the labour job\'s plan');
      ok(await p.evaluate(() => Array.from(document.querySelectorAll('#panel-job-plan select')).some((s) =>
        Array.from(s.options).some((o) => /Green Thumb Landscaping/.test(o.textContent)))), 'with the directory\'s landscaper offered to book');
      // Work it, close it, and read the final.
      await p.evaluate(() => {
        jobLogs[4503] = [{ date: '2026-09-10', activity: 'work', members: [{ name: 'Anthony Graziano', role: 'TC', hours: 80 }, { name: 'Crew', role: 'PS', hours: 60 }] }];
        const j = jobs.find((x) => x.id === 4503); j.status = 'closed'; j.deliveredOn = '2026-09-29'; saveJobs();
      });
      await toDash(4503);
      const fin = await viewed('#client-dashboard-view button[onclick="docAction(4503,\'invoice\',\'view\',{stage:\'final\'})"]', 'the band\'s View final invoice');
      has(fin, 'Adds Landscaper (est. $9,000) — it bills you directly, and the Home Sale Preparation Fee on it is in the fee above', 'the final names the added vendor');
      has(fin, '$5,700', '⚠⚠ and bills the fee on both prep vendors: 30% of $19,000');
      dialogs.length = 0;
      await press('#client-dashboard-view button[onclick="dashApproveInvoice(4503,\'final\')"]', 'Manager approval on the final');
      has(await txt('#dash-fb'), 'inside the ±15% tolerance', '⚠ the accepted vendor is authorised scope: no PIN');
    });

    // ── D. the final's Manager approval ──────────────────────────────────────
    await section('D. Manager approval: a blocked final says what blocks it; an hourly rush change order moves the baseline by its bill', async () => {
      const EST_LAB = Object.assign({}, EST_BP, { prepEnabled: false, prepItems: [], prepCost: 0, prepFee: 0, havellinTotal: 19940, grandTotal: 19940 });
      await seed({ id: 4504, name: 'Owen Blank', svc: 'downsizing_move', stage: 'closed', est: EST_LAB, logs: [] });
      await toDash(4504);
      await press('#client-dashboard-view button[onclick="dashApproveInvoice(4504,\'final\')"]', 'Manager approval on a final with no hours');
      const fb = await txt('#dash-fb');
      has(fb, 'No hours have been logged for this job, so the final cannot be issued. Log them on the Job Plan tab first.', '⚠⚠ it says what blocks it');
      lacks(fb, 'no approval needed', 'never "no approval needed"');
      ok(!(await shown('#inv-pin-modal')), 'and asks for no PIN');
      // An hourly rush job with a 10% discount, an accepted +40 / +40 change order, and exactly those hours worked.
      const ER = Object.assign({}, EST_LAB, { rush: true, rushPct: 0.2, discountPct: 10, havellinTotal: 21768, grandTotal: 21768 });
      await seed({ id: 4505, name: 'Iris Rush', svc: 'downsizing_move', stage: 'closed', est: ER,
        logs: [{ date: '2026-09-10', activity: 'work', members: [{ name: 'Anthony Graziano', role: 'TC', hours: 120 }, { name: 'Crew', role: 'PS', hours: 100 }] }] });
      await p.evaluate(() => { changeOrders.push({ id: 1759250000000, updatedAt: 1759250000000, jobId: 4505, description: 'The garage and the attic',
        reason: 'scope_add', tcHrs: 40, psHrs: 40, createdAt: 'Sep 12, 2026', clientApproved: true, clientName: 'Iris Rush', clientAcceptedAt: 'September 12, 2026' });
        saveChangeOrders(); });
      await toDash(4505);
      const v = await p.evaluate(() => { const d = invoiceHtml(jobs.find((j) => j.id === 4505), 'final'); return [d.overUnder, d.requiresApproval]; });
      eq(v, [0, false], '⚠⚠ the final billing exactly the authorised hours reads no variance (it read +$800)');
      await press('#client-dashboard-view button[onclick="dashApproveInvoice(4505,\'final\')"]', 'Manager approval on the rush job');
      has(await txt('#dash-fb'), 'inside the ±15% tolerance', 'inside the tolerance');
    });

    // ── E. the crew-only flag on the band ────────────────────────────────────
    await section('E. crew hours with no concierge hours are flagged on the band where the final is sent', async () => {
      const EST_LAB = Object.assign({}, EST_BP, { prepEnabled: false, prepItems: [], prepCost: 0, prepFee: 0, havellinTotal: 19940, grandTotal: 19940 });
      await seed({ id: 4506, name: 'Cal Crew', svc: 'downsizing_move', stage: 'closed', est: EST_LAB,
        logs: [{ date: '2026-09-10', activity: 'work', members: [{ name: 'Crew', role: 'PS', hours: 60 }] }] });
      await toDash(4506);
      const band = await txt('#client-dashboard-view .jt-next');
      has(band, 'Send the final invoice', 'fixture: the final is the step');
      has(band, '60.0 crew hours logged with no concierge hours. The concierge is on site for every crew hour, so this final is likely under-billing $12,000 of concierge time. Check the log before sending.',
          '⚠⚠ the band flags it, above the send and the approval');
      ok(await shown('#client-dashboard-view .jt-next button[onclick="dashApproveInvoice(4506,\'final\')"]'), 'a flag, never a refusal: the approval is still there');
      await p.evaluate(() => { jobLogs[4506][0].members.unshift({ name: 'Anthony Graziano', role: 'TC', hours: 80 }); });
      await toDash(4506);
      lacks(await txt('#client-dashboard-view .jt-next'), 'crew hours logged with no concierge hours', 'with the concierge\'s hours logged it goes');
    });

    // ── F. Premium and the appraiser line on Build Estimate ──────────────────
    // ⚠⚠ RESTATED 2026-10-01 (P17, Anthony's answer 1): Premium is the rates only, its 25 hours are gone, and an appraiser line books
    // its own 2.0 hours on a Premium estate as on any other. This section pinned P16's rule (no hours on Premium, a "covered by
    // Premium Estate" note on the row, +25 − 2 concierge hours when Premium went on); it drives the same controls under the new one.
    await section('F. Build Estimate: on a Premium estate an appraiser line books its own hours, and Premium moves no hours', async () => {
      await p.evaluate(() => {
        jobs = jobs.filter((j) => j.id !== 4507);
        jobs.unshift({ id: 4507, hvlId: 'HVL-2609-P457', name: 'Estate of Ada Premium', fname: 'Ada', lname: 'Premium', svc: 'cleanout', sqft: '3500',
          addr: '57 Ocean Blvd', city: 'Palm Beach', zip: '33480', propVal: '6000000', beds: '3', baths: '3', halfBaths: '1',
          executor: 'Mark Premium', executorRole: 'Personal Representative', executorEmail: 'mark@example.com', executorPhone: '(561) 555-0157',
          matterType: 'probate', docTier: 'values', start: '2026-10-19', walkthrough: '2026-09-28', created: '2026-09-20',
          status: 'new', tc: 'Anthony Graziano', siteVisitBy: 'Anthony Graziano', dateOfDeath: '2026-08-01' });
        delete estimateStore[4507]; saveJobs();
      });
      await toDash(4507);
      await press('#client-dashboard-view .jt-next button[onclick="dashGoEstimate(4507)"]', 'the band\'s Build estimate');
      await p.waitForTimeout(600);
      await p.evaluate(() => { for (let i = 0; i < 6; i++) setRoomState('r' + i, 'in'); calcAll(); });
      if (await p.evaluate(() => document.getElementById('e-fixed').checked)) await press('label.toggle:has(#e-fixed)', 'untick Fixed price, to read the hours');
      const gi = await p.evaluate(() => VENDOR_GROUP_CARDS.findIndex((c) => c.group === 'Asset Liquidation & Valuation'));
      await p.selectOption('#vgrp-cat-' + gi, 'Art Appraiser');
      await p.fill('#vgrp-cost-' + gi, '1500');
      await press('button[onclick="addFromVendorGroup(' + gi + ')"]', 'the valuation card\'s + (Art Appraiser)');
      const std = await p.evaluate(() => [currentEstimate.vendorTCHrs, currentEstimate.totTC, currentEstimate.havellinTotal]);
      eq(std[0], 2, 'fixture: on a standard estate the appraiser books its 2.0 hours');
      lacks(await txt('#vendor-group-cards'), 'covered by Premium Estate', 'and its row says nothing of Premium');
      await press('label.toggle:has(#e-prem)', 'the Premium estate toggle');
      ok(await p.evaluate(() => document.getElementById('e-prem').checked), 'Premium is on');
      const prem = await p.evaluate(() => [currentEstimate.vendorTCHrs, currentEstimate.totTC, currentEstimate.havellinTotal, currentEstimate.prem]);
      eq(prem[0], 2, '⚠⚠ on Premium the appraiser line books its 2.0 hours too');
      eq(prem[1], std[1], 'the concierge hours do not move: Premium adds none of its own (' + std[1] + ' → ' + prem[1] + ')');
      lacks(await txt('#vendor-group-cards'), 'covered by Premium Estate', '⚠ and the appraiser\'s row says nothing of Premium');
      ok(!(await shown('#vendor-group-cards .vgrp-covered')), 'no covered note on screen');
      // Remove the appraiser: on a Premium estate it takes its two hours at $185 with it.
      const withArt = prem[2];
      await p.evaluate(() => { const i = vendors.findIndex((v) => v.type === 'Art Appraiser'); removeVendor(i); });
      await p.waitForTimeout(200);
      eq(Math.round((withArt - await p.evaluate(() => currentEstimate.havellinTotal)) * 100), 37000, '⚠⚠ with Premium on, the appraiser line is worth its 2.0 hours at $185 ($' + withArt + ')');
      await press('button[onclick="addFromVendorGroup(' + gi + ')"]', 'the card\'s + with nothing chosen (no line)');
      await p.selectOption('#vgrp-cat-' + gi, 'Art Appraiser');
      await p.fill('#vgrp-cost-' + gi, '1500');
      await press('button[onclick="addFromVendorGroup(' + gi + ')"]', 'add the appraiser again');
      await press('label.toggle:has(#e-prem)', 'Premium off again');
      eq(await p.evaluate(() => currentEstimate.vendorTCHrs), 2, 'switched off: the appraiser still books its 2.0 hours, at $150');
      lacks(await txt('#vendor-group-cards'), 'covered by Premium Estate', 'and there is no note either way');
    });

    // ── G. the crew badge on a fixed price ───────────────────────────────────
    await section('G. the crew badge on a fixed price says the fee does not move with the crew', async () => {
      await p.evaluate(() => { document.getElementById('e-sqft').value = '9000'; for (let i = 0; i < 14; i++) setRoomState('r' + i, 'in'); calcAll(); });
      if (!(await p.evaluate(() => document.getElementById('e-fixed').checked))) await press('label.toggle:has(#e-fixed)', 'tick Fixed price');
      const rec = await p.evaluate(() => currentEstimate.psRecommended);
      ok(rec >= 2, 'fixture: ' + rec + ' specialists recommended');
      const fee0 = await p.evaluate(() => currentEstimate.fixedSuggested);
      await p.selectOption('#ps-crew-size', String(Math.min(6, rec + 1)));
      await p.waitForTimeout(300);
      const badge = await txt('#ps-crew-badge');
      has(badge, 'the suggested fixed fee stays on the two-specialist plan whatever crew runs it', '⚠⚠ the badge says a bigger crew does not lower a fixed fee');
      lacks(badge, 'the estimate is lower', 'and not that it does');
      eq(await p.evaluate(() => currentEstimate.fixedSuggested), fee0, 'which is true: the suggested fee did not move');
      await press('label.toggle:has(#e-fixed)', 'untick Fixed price');
      has(await txt('#ps-crew-badge'), 'the estimate is lower than it would be at', 'on an hourly quote the badge still says the quote drops');
    });

    // ── H. the agreement chip ────────────────────────────────────────────────
    await section('H. the "Agreement not signed" chip names what is actually missing', async () => {
      await toDash(4501);
      const title = await p.evaluate(() => { const c = Array.from(document.querySelectorAll('#client-dashboard-view .dash-chips .badge'))
        .find((x) => /Agreement not signed/.test(x.textContent)); return c ? c.getAttribute('title') : null; });
      eq(title, 'Send the signing packet from the timeline, then record the signature once the client signs.',
         '⚠⚠ a won client with the packet unsent: send it — never "Approve the agreement"');
      await seed({ id: 4508, name: 'Vera Draft', svc: 'downsizing_move', stage: 'won', est: EST_BP });
      await p.evaluate(() => { estimateStore[4508].approved = false; const j = jobs.find((x) => x.id === 4508); j.won = false; j.status = 'new'; j.approved = false; saveJobs(); });
      await toDash(4508);
      const t2 = await p.evaluate(() => { const c = Array.from(document.querySelectorAll('#client-dashboard-view .dash-chips .badge'))
        .find((x) => /Agreement not signed/.test(x.textContent)); return c ? c.getAttribute('title') : null; });
      eq(t2, 'The estimate must be approved before the agreement can be drawn.', 'an unapproved estimate: that first');
    });

    // ── I. overflow, and errors ──────────────────────────────────────────────
    await section('I. overflow at 1440 and 390; no page errors', async () => {
      // Back to crew-only hours on 4506, so the band carries the flag while it is measured.
      await p.evaluate(() => { jobLogs[4506][0].members = jobLogs[4506][0].members.filter((m) => m.role !== 'TC'); });
      await toDash(4506);
      has(await txt('#client-dashboard-view .jt-next'), 'crew hours logged with no concierge hours', 'fixture: the band carries the flag');
      ok(await overflow() <= 0, 'the dashboard with the flag fits at 1440 (' + await overflow() + ')');
      await p.setViewportSize({ width: 390, height: 844 });
      await toDash(4506); await p.waitForTimeout(300);
      ok(await overflow() <= 0, 'and at 390 (' + await overflow() + ')');
      ok(await shown('#client-dashboard-view .jt-next-sub'), 'the flag is on screen at 390');
      await toDash(4503);
      await press('#client-dashboard-view button[onclick="openChangeOrder(4503)"]', '+ New at 390');
      ok(await shown('#co-vendor-cost'), 'the vendor cost box is on screen at 390');
      ok(await overflow() <= 0, 'the modal fits at 390 (' + await overflow() + ')');
      await press('#change-order-modal button:has-text("Cancel")', 'Cancel');
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
