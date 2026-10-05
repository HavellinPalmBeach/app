// Step 58 — P19 · W5, the ledger (2026-10-03): Anthony, "i'm good with all of your calls. build it all".
//
// Drives the REAL page through its own controls on the Job Admin & Inv desk and the band, against one fake Apps Script
// (its stores, loadMedia, getSubfolders, uploadHtml and uploadFile answered as the deployment would), routed. What is
// seeded is state a person could not type in one sitting: an active probate estate, its deposit and midpoint paid, with a
// representative and a co-representative, an inventory on the sheet (two lots at auction with Kodner Galleries, a
// consignment, two lines to Goodwill, a line kept), and two inventory snapshots.
//
//   A. The Disposition Ledger card sits under the inventory (Print, File to Drive, File signed copy) and the strip's More
//      menu no longer carries the ledger. Print: the close-out summary — item numbers, the proceeds net to the estate, the
//      totals to the cent, and a sign-off line for each of the two fiduciaries; never "Fiduciary accounting".
//   B. Snapshots: Void asks for a reason (none given: not voided), then voids with one; the row reads VOIDED with the
//      reason and still prints; Compare with now and Compare with previous print the what-changed page.
//   C. Proceeds: + Record a statement, the modal, the two auction lots ticked, a gross $12.50 over what the lines record:
//      flagged on its row with both figures, on the ledger card, and on the desk's derived line. Correcting the line's
//      gross in its record clears the flag without a reload.
//   D. Donations: Print Donation Record for Goodwill; the charity's receipt filed through File charity receipt; the
//      donation line reads every donated line receipted.
//   E. Close job, from the desk's band: the one question names the unsigned ledger; OK closes; the ledger is filed to the
//      Estate Inventory folder as "<HVL> - Havellin Disposition Ledger.html" and the card says so. File signed copy: the
//      desk's line "Disposition Ledger signed by the Personal Representative" turns green.
//   F. overflow at 1440 and 390 (the desk with the cards, the statement modal), the ledger at Letter width in print, and
//      no page errors.
//
//   NODE_PATH=/opt/node22/lib/node_modules node tests/browser/step58.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');

const SYNC = 'https://script.google.com/macros/s/STEP58/exec';
const ID = 5801, HVL = 'HVL-2610-5801';
const T0 = Date.parse('2026-09-28T15:00:00Z');
const STORE = { jobs: [], estimates: {}, media: {} };
const UPLOADS = [], FILES = [];

const L = (id, o) => Object.assign({ stableId: id, label: 'inventory', collId: null, roomIdx: 1, seq: 1, status: 'uploaded', qty: 1,
  category: 'Furniture', condition: 'Good', ts: T0, updatedAt: T0, driveFileId: 'f-' + id, driveFileUrl: 'https://drive.google.com/file/d/f-' + id + '/view' }, o);
const LINES = [
  L('a1', { itemNo: 1, objectName: 'Sargent portrait', disposition: 'Auction', channel: 'Kodner Galleries', gross: 1000, fees: 250, dispDate: '2026-09-30', authBy: 'Rex Hale', approvalDate: '2026-09-25' }),
  L('a2', { itemNo: 2, objectName: 'Silver tea set', disposition: 'Auction', channel: 'Kodner Galleries', gross: 237.5, fees: 59.38, dispDate: '2026-09-30', authBy: 'Rex Hale', approvalDate: '2026-09-25' }),
  L('c1', { itemNo: 3, objectName: 'Tabriz rug', disposition: 'Consign', channel: 'Palm Consign', authBy: 'Rex Hale', approvalDate: '2026-09-25' }),
  L('d1', { itemNo: 4, objectName: 'Sofa', disposition: 'Donate', channel: 'Goodwill', condition: 'Fair', fmv: 300, dispDate: '2026-09-29', authBy: 'Rex Hale', approvalDate: '2026-09-25' }),
  L('d2', { itemNo: 5, objectName: 'Lamps (pair)', disposition: 'Donate', channel: 'Goodwill', qty: 2, fmv: 80, dispDate: '2026-09-29', authBy: 'Rex Hale', approvalDate: '2026-09-25' }),
  L('k1', { itemNo: 6, objectName: 'Family Bible', disposition: 'Keep' }),
];

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
    await ctx.addInitScript((u) => { try { localStorage.setItem('hav_sheets_url', u); } catch (e) {} }, SYNC);
    await ctx.route(SYNC + '**', async (route) => {
      const req = route.request(), url = new URL(req.url()), action = url.searchParams.get('action');
      const json = (o) => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(o) });
      if (req.method() === 'POST') {
        let body = {}; try { body = JSON.parse(req.postData() || '{}'); } catch (e) {}
        if (body.type === 'saveAllJobs') { STORE.jobs = body.payload || []; return json({ ok: true }); }
        if (body.type === 'job') { STORE.jobs = STORE.jobs.filter((j) => j.id !== (body.payload || {}).id).concat([body.payload]); return json({ ok: true }); }
        if (body.type === 'saveAllEstimates') { Object.assign(STORE.estimates, body.payload || {}); return json({ ok: true }); }
        if (body.action === 'getSubfolders') return json({ ok: true, subfolders: {} });
        if (body.action === 'uploadHtml') {
          UPLOADS.push({ folderId: body.folderId, filename: body.filename, html: body.html });
          return json({ ok: true, fileUrl: 'https://drive.google.com/file/d/html' + UPLOADS.length + '/view', fileId: 'html' + UPLOADS.length });
        }
        if (body.action === 'uploadFile') {
          FILES.push({ folderId: body.folderId, filename: body.filename });
          return json({ ok: true, fileUrl: 'https://drive.google.com/file/d/scan' + FILES.length + '/view', fileId: 'scan' + FILES.length });
        }
        return json({ ok: true });
      }
      switch (action) {
        case 'loadJobs': return json({ jobs: STORE.jobs, deletedJobs: [] });
        case 'loadEstimates': return json({ ok: true, estimates: STORE.estimates });
        case 'loadJobPlans': return json({ ok: true, jobPlans: {} });
        case 'loadLogs': return json({ ok: true, logs: {} });
        case 'loadChangeOrders': return json({ ok: true, changeOrders: [] });
        case 'loadContractors': return json({ ok: true, contractors: { added: [], defaults: [] } });
        case 'loadMedia': {
          const id = url.searchParams.get('jobId');
          return json({ ok: true, media: id ? { [id]: { items: STORE.media[id] || [] } } : {} });
        }
        case 'version': return json({ ok: false, error: 'Unknown action' });
        default: return json({ ok: false, error: 'not in this test: ' + action });
      }
    });

    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    // Dialogs answer from a queue: a prompt takes the next string, a confirm the next 'yes'/'no'.
    const dialogs = [], answers = [];
    p.on('dialog', async (d) => {
      dialogs.push(d.type() + ': ' + d.message());
      if (d.type() === 'prompt') { const a = answers.shift(); if (a === null) await d.dismiss(); else await d.accept(a == null ? '' : a); return; }
      if (d.type() === 'confirm') { const a = answers.shift(); if (a === 'no') await d.dismiss(); else await d.accept(); return; }
      await d.accept();
    });
    const hookPrint = () => p.evaluate(() => { window.open = function () { return null; }; window.__prints = window.__prints || [];
      window.print = function () { const pt = document.getElementById('print-target');
        window.__prints.push({ html: pt ? pt.innerHTML : '', title: document.title, over: document.documentElement.scrollWidth - document.documentElement.clientWidth }); }; });
    await p.goto(APP); await p.waitForTimeout(1800); await hookPrint();

    const section = async (name, body) => {
      console.log('\n## ' + name);
      await p.evaluate(() => document.querySelectorAll('.modal-overlay').forEach((m) => { if (m.id !== 'ps-modal' && getComputedStyle(m).display !== 'none') m.style.display = 'none'; }))
        .catch(() => {});
      try { await body(); } catch (e) { fail++; console.log('  ✗ ' + name + ' threw: ' + String(e && e.message || e).split('\n')[0]); }
    };
    const vis = (sel) => p.locator(sel).first().isVisible().catch(() => false);
    // A print hides the panels for the dialog and restores them about 650 ms later (_printDocument), so a press waits
    // until a panel is showing again before the next control is looked for.
    const settled = async () => { for (let i = 0; i < 40; i++) { if (await p.evaluate(() => !!document.querySelector('.panel.active') && document.getElementById('print-target').style.display !== 'block')) return; await p.waitForTimeout(100); } };
    const press = async (sel, what) => {
      await settled();
      const n = await p.locator(sel).count();
      const v = n === 1 && await vis(sel);
      ok(v, (what || sel) + ' — one control, on screen (' + n + ')');
      if (v) { await p.click(sel, { timeout: 5000 }).catch((e) => ok(false, (what || sel) + ' — ' + e.message.split('\n')[0])); await p.waitForTimeout(500); }
      return v;
    };
    const type = async (sel, value, what) => {
      const v = await vis(sel);
      ok(v, (what || sel) + ' — on screen to type into');
      if (v) { await p.fill(sel, value, { timeout: 5000 }).catch((e) => ok(false, (what || sel) + ' — ' + e.message.split('\n')[0])); await p.waitForTimeout(150); }
    };
    const txt = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }, sel);
    const T = (h) => p.evaluate((h) => { const d = document.createElement('div');
      d.innerHTML = String(h).replace(/<\/td>/g, ' </td>').replace(/<\/th>/g, ' </th>').replace(/<br>/g, ' '); return d.textContent.replace(/\s+/g, ' '); }, h);
    const lastPrint = () => p.evaluate(() => (window.__prints || []).slice(-1)[0] || { html: '', title: '', over: 0 });
    const printsN = () => p.evaluate(() => (window.__prints || []).length);
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const job = () => p.evaluate((id) => JSON.parse(JSON.stringify(jobs.find((j) => j.id === id) || null)), ID);
    const badge = () => p.evaluate(() => { const el = document.getElementById('sync-badge') || document.querySelector('.sync-badge'); return el ? el.textContent : ''; });
    const until = async (f, ms) => { for (let i = 0; i < (ms || 8000) / 150; i++) { if (await f()) return true; await p.waitForTimeout(150); } return false; };
    const toDesk = async () => {
      await settled();
      await p.evaluate((id) => { setCurrentJob(id); populateInventorySelect(); }, ID);
      await p.click('.nb[onclick*="\'inventory\'"]'); await p.waitForTimeout(700);
      const sel = await p.evaluate(() => (document.getElementById('inv-job') || {}).value);
      if (String(sel) !== String(ID)) { await p.selectOption('#inv-job', String(ID)); await p.waitForTimeout(700); }
    };
    const pdf = (name) => ({ name, mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 step58 ' + name) });

    // ── Seed ────────────────────────────────────────────────────────────────
    STORE.media[ID] = JSON.parse(JSON.stringify(LINES));
    await p.evaluate(([ID, HVL, T0, LINES]) => {
      jobs = jobs.filter((j) => j.id !== ID);
      jobs.unshift({ id: ID, hvlId: HVL, name: 'Walter Ellsworth', fname: 'Walter', lname: 'Ellsworth', svc: 'cleanout', status: 'active',
        won: true, wonAt: '2026-09-17', wonBy: 'Anthony Graziano', wonMethod: 'call', approved: true, agrApproved: true, agrApprovedBy: 'Anthony Graziano',
        agrSent: true, agrSigned: true, depositReceived: true, tc: 'Ashley Jerome', created: '2026-09-10', start: '2026-09-21',
        activatedOn: '2026-09-21', activatedBy: 'Ashley Jerome', addr: '69 Beach Blvd', city: 'Palm Beach', zip: '33480',
        matterType: 'probate', docTier: 'values', deathDate: '2026-08-01', executorAuth: 'received',
        executor: 'Rex Hale', executorRole: 'Personal Representative', executorEmail: 'rex@hale.example',
        coFiduciaries: [{ id: 'cf1', name: 'Dana Hale', role: 'Co-Personal Representative', email: 'dana@hale.example' }],
        driveFolder: 'https://drive.google.com/drive/folders/ROOT58',
        driveSubfolders: { 'Estate Inventory': 'INV58', 'As-Found Record': 'AF58', 'Signed Records': 'SR58' },
        payments: [{ uid: 'dep58', stage: 'deposit', amount: 12000, receivedOn: '2026-09-15', method: 'wire', clearedOn: '2026-09-15' },
                   { uid: 'mid58', stage: 'midpoint', amount: 6000, receivedOn: '2026-09-29', method: 'wire', clearedOn: '2026-09-29' }],
        invSnapshots: [
          { ts: T0 - 86400000, label: 'As of walkthrough', count: 5, totalFMV: 300, items: [
            { itemNo: 1, object: 'Portrait', category: 'Art', fmv: '', disposition: '', track: 'Probate' },
            { itemNo: 2, object: 'Silver tea set', category: 'Silver', fmv: '', disposition: '', track: 'Probate' },
            { itemNo: 4, object: 'Sofa', category: 'Furniture', fmv: '300', disposition: '', track: 'Probate' },
            { itemNo: 5, object: 'Lamps (pair)', category: 'Furniture', fmv: '', disposition: '', track: 'Probate' },
            { itemNo: 9, object: 'Card table', category: 'Furniture', fmv: '', disposition: '', track: 'Probate' }] },
          { ts: T0, label: 'Taken twice by mistake', count: 0, totalFMV: 0, items: [] }],
        docState: { 'invoice:deposit': { draftedAt: '2026-09-15T10:00:00Z', sentAt: '2026-09-15T10:00:00Z' },
                    'invoice:midpoint': { draftedAt: '2026-09-26T10:00:00Z', sentAt: '2026-09-26T10:00:00Z' } },
        at: {}, updatedAt: Date.now() });
      estimateStore[ID] = { approved: true, submitted: true, approvedBy: 'Anthony Graziano', savedAt: T0,
        estimate: { jobId: ID, svc: 'cleanout', havellinTotal: 24000, totTC: 40, totPS: 80, days: 4, collections: [], vendors: [], prepItems: [],
          rooms: [{ idx: 1, name: 'Study', st: 'in' }] } };
      try { localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore)); } catch (x) {}
      _photoRefs[ID] = JSON.parse(JSON.stringify(LINES));
      savePhotoRefs(ID);
      saveJobs();
    }, [ID, HVL, T0, LINES]);

    // ── A. the ledger card and the page ─────────────────────────────────────
    await section('A. The Disposition Ledger card under the inventory; the close-out summary it prints', async () => {
      await toDesk();
      ok(await vis('#inv-ledger-card'), '⚠⚠ the Disposition Ledger card is on the desk');
      has(await txt('#inv-ledger-card'), '6 of 6 lines on the ledger · Gross $1,237.50 · Fees $309.38 · Net to the estate $928.12', 'its figures, net to the estate');
      has(await txt('#inv-ledger-card'), 'Not in Drive yet — it is filed when the job closes, or now with File to Drive.', 'not yet filed, and when it will be');
      has(await txt('#inv-ledger-card'), 'No signed copy on file — the Personal Representative signs it at close-out.', 'nobody has signed');
      ok(await p.locator('#inv-ledger-card input[type=file]').count() === 1, 'File signed copy is on the card');
      ok(await p.locator('#inv-workbar button[onclick^="printDispositionLedger("]').count() === 0, '⚠ and the strip\'s More menu no longer carries the ledger');
      const before = await printsN();
      await press('#inv-ledger-card button[onclick="printDispositionLedger(' + ID + ')"]', 'the card\'s Print');
      ok(await printsN() === before + 1, 'the ledger prints');
      const pg = await lastPrint();
      const t = await T(pg.html);
      has(pg.title, 'Havellin Disposition Ledger - 69 Beach Blvd', 'titled for the client');
      has(t, 'Where each item went and what it brought · proceeds net to the estate', 'whose the proceeds are');
      has(t, '1 Sargent portrait', 'item numbers');
      has(t, 'Totals $1,237.50 $309.38 $928.12', 'totals to the cent');
      has(t, 'Reviewed and approved as the final record of the disposition of the property listed above.', '⚠⚠ the sign-off');
      eq((pg.html.match(/Signature: _/g) || []).length, 2, '⚠⚠ one signature line per fiduciary');
      has(t, 'Rex Hale, Personal Representative', 'the representative');
      has(t, 'Dana Hale, Co-Personal Representative', 'and the co-representative');
      lacks(t, 'Fiduciary accounting', 'never "Fiduciary accounting"');
    });

    // ── B. snapshots ────────────────────────────────────────────────────────
    await section('B. A snapshot is voided with a reason, never deleted; Compare prints what changed', async () => {
      await toDesk();
      const rows = '#inv-snapshots .snap-row';
      eq(await p.locator(rows).count(), 2, 'fixture: two snapshots listed');
      ok(await p.locator('#inv-snapshots button:has-text("Remove")').count() === 0, '⚠⚠ there is no Remove');
      answers.push('');
      await press('#inv-snapshots button[onclick="voidInventorySnapshot(' + ID + ',' + T0 + ')"]', 'Void on the mistaken snapshot');
      ok(!(await job()).invSnapshots.find((s) => s.ts === T0).voidedAt, 'no reason given: not voided');
      answers.push('taken twice by mistake');
      await press('#inv-snapshots button[onclick="voidInventorySnapshot(' + ID + ',' + T0 + ')"]', 'Void again, with a reason');
      const s = (await job()).invSnapshots.find((x) => x.ts === T0) || {};
      eq([s.voidReason, (await job()).invSnapshots.length], ['taken twice by mistake', 2], '⚠⚠ voided with the reason, and still on the record');
      ok(typeof ((await job()).at || {})['invSnapshots:' + T0] === 'number', 'stamped on its own key');
      has(await txt('#inv-snapshots'), 'VOIDED', 'listed as VOIDED');
      has(await txt('#inv-snapshots'), 'taken twice by mistake', 'with the reason');
      ok(await p.locator('#inv-snapshots button[onclick="voidInventorySnapshot(' + ID + ',' + T0 + ')"]').count() === 0, 'and no Void on it now');
      await press('#inv-snapshots button[onclick="printInventorySnapshot(' + ID + ',' + T0 + ')"]', 'the voided snapshot still prints');
      has(await T((await lastPrint()).html), 'VOIDED — the snapshot of', 'marked VOIDED on the page');
      const older = T0 - 86400000;
      await press('#inv-snapshots button[onclick="printSnapshotComparison(' + ID + ',' + older + ',\'now\')"]', 'Compare with now, on the walkthrough snapshot');
      const cmp = await T((await lastPrint()).html);
      has(cmp, 'Inventory Snapshot — What Changed', 'the what-changed page prints');
      has(cmp, 'Items 5 → 6', 'with the totals before and after');
      has(cmp, 'Added 2 · Removed 1 · Renamed 1 · Value changed 1 · Disposition changed 4 · Track changed 0 · Unchanged 0', 'what was added, removed, renamed and changed, by item number');
      has(cmp, 'Renamed (1)Item # Was Now 1 Portrait Sargent portrait', 'the rename, old → new');
      has(cmp, 'Value changed (1)Item # Item Was Now 5 Lamps (pair) no value $80', 'a value, old → new');
      has(cmp, 'Removed (1)', 'the line no longer on the inventory');
      ok(await p.locator('#inv-snapshots button[onclick="printSnapshotComparison(' + ID + ',' + T0 + ',\'prev\')"]').count() === 1, 'Compare with previous is offered on the later snapshot');
      await press('#inv-snapshots button[onclick="printSnapshotComparison(' + ID + ',' + T0 + ',\'prev\')"]', 'Compare with previous');
      has(await T((await lastPrint()).html), '(As of walkthrough) compared with the snapshot of', 'set against the snapshot before it');
    });

    // ── C. proceeds ─────────────────────────────────────────────────────────
    await section('C. A statement $12.50 over its lines is flagged with both figures; correcting the line clears it', async () => {
      await toDesk();
      ok(await vis('#inv-proceeds-card'), 'the Proceeds statements card is on a disposal estate\'s desk');
      await press('#inv-proceeds-card button[onclick="openProceedsStatement(' + ID + ')"]', '+ Record a statement');
      ok(await vis('#ps-modal'), 'the modal opens');
      eq(await p.locator('#ps-lines input[type=checkbox]').count(), 3, 'its three sold lines are offered to tick');
      await press('#ps-save-btn', 'Record statement, empty');
      has(await txt('#ps-fb'), 'To record this statement, enter who it is from, the statement date, the lines it covers, the gross and the net paid. Nothing was saved.', 'refused, everything missing named');
      await type('#ps-vendor', 'Kodner Galleries', 'who it is from');
      await type('#ps-date', '2026-10-01', 'the statement date');
      await p.check('#ps-lines input[data-sid="a1"]'); await p.check('#ps-lines input[data-sid="a2"]');
      await type('#ps-gross', '1250', 'the gross, $12.50 over the lines');
      await type('#ps-fees', '309.38', 'commission and fees');
      await type('#ps-net', '940.62', 'net paid');
      await type('#ps-paidon', '2026-10-02', 'paid on');
      await type('#ps-paidto', 'Estate of W. Ellsworth, checking ending 4417', 'paid to');
      await type('#ps-ref', 'Settlement 2026-118', 'the reference');
      await press('#ps-save-btn', 'Record statement');
      ok(!(await vis('#ps-modal')), 'the modal closes');
      const st = ((await job()).proceedsStatements || [])[0] || {};
      eq([st.vendor, st.gross, st.fees, st.netPaid, (st.lines || []).map((l) => l.stableId)], ['Kodner Galleries', 1250, 309.38, 940.62, ['a1', 'a2']], 'recorded as typed, its lines by stableId');
      has(await txt('#inv-proceeds-card'), 'Gross: $1,250 on the statement, $1,237.50 on its lines ($12.50 apart)', '⚠⚠ flagged on its row, with both figures');
      has(await txt('#inv-proceeds-card'), 'Sold lines on no statement: #3 Tabriz rug.', 'the consignment on no statement');
      has(await txt('#inv-ledger-card'), '1 proceeds statement disagrees with the ledger', 'the ledger card says so');
      await p.click('#inventory-content .ja-hd').catch(() => {}); await p.waitForTimeout(400);
      has(await txt('#plan-derived-admin-' + ID), 'Sale proceeds reconciled1 statement, 1 disagrees with the ledger; 1 sold line on no statement; 1 statement not yet filed to Drive', '⚠ the desk\'s derived line, in place of the box');
      // Correct the tea set's gross in its record: 237.50 was 250.00 on the statement.
      await p.click('button[onclick="_invToggleOpen(\'a2\')"]').catch(() => {}); await p.waitForTimeout(400);
      const grossSel = 'input[onchange*="\'a2\',\'gross\'"]';
      ok(await p.locator(grossSel).count() === 1, 'the line\'s Gross Proceeds box is in its record');
      await p.fill(grossSel, '250'); await p.locator(grossSel).dispatchEvent('change'); await p.waitForTimeout(500);
      lacks(await txt('#inv-proceeds-card'), 'on the statement', '⚠⚠ the flag clears at once, without a reload (the records repaint)');
      has(await txt('#inv-proceeds-card'), '✓ Agrees with the ledger', 'the statement agrees');
      has(await txt('#inv-ledger-card'), 'Gross $1,250', 'and the ledger\'s total moved');
    });

    // ── D. donations ────────────────────────────────────────────────────────
    await section('D. A Donation Record for the charity, and its receipt filed through the control', async () => {
      await toDesk();
      ok(await vis('#inv-donations-card'), 'the Donations card is on the desk');
      has(await txt('#inv-donations-card'), 'Goodwill · 2 lines · 0 of 2 receipted', 'Goodwill\'s two lines, none receipted');
      await press('#inv-donations-card button[onclick="printDonationRecord(' + ID + ',\'d1\')"]', 'Print Donation Record');
      const dr = await T((await lastPrint()).html);
      has(dr, 'Charity: Goodwill', 'the record names the charity');
      has(dr, 'Donated on behalf of the estate, by Rex Hale, Personal Representative and Dana Hale, Co-Personal Representative.', 'on whose behalf');
      has(dr, '2 lines · 3 items · estimated value $380', 'its lines, items and the estimated value');
      has(dr, 'They are not appraisals.', 'values marked as estimates, not appraisals');
      has(dr, 'is for the donor’s tax adviser to determine', 'and the deduction left to the donor\'s tax adviser');
      await settled();
      await p.setInputFiles('#inv-donations-card input[type=file]', pdf('goodwill-receipt.pdf'));
      ok(await until(async () => /1 of 1|2 of 2 receipted/.test(await txt('#inv-donations-card'))), 'the receipt files');
      has(await txt('#inv-donations-card'), 'Goodwill · 2 lines · 2 of 2 receipted', '⚠⚠ the charity\'s receipt counts both its lines');
      eq(FILES.slice(-1).map((f) => f.folderId), ['SR58'], 'filed to Signed Records');
      has(FILES.slice(-1)[0].filename, HVL + ' - Charity receipt - Goodwill - ', 'under the charity\'s name');
    });

    // ── E. the close ────────────────────────────────────────────────────────
    await section('E. Close job names the unsigned ledger, then files it to Drive; the signed copy turns the line green', async () => {
      await toDesk();
      dialogs.length = 0; answers.push('yes');
      await press('#inventory-content button[onclick="activateOrCycle(' + ID + ')"]', 'Close job, on the desk\'s band');
      const q = dialogs.filter((d) => /^confirm/.test(d));
      eq(q.length, 1, 'one question');
      has(q[0] || '', 'The Disposition Ledger has no signed copy on file. It is filed to Drive as the job closes; have the Personal Representative sign it, then file the signed copy on the Disposition Ledger card (Job Admin & Inv).', '⚠⚠ naming the unsigned ledger');
      lacks(q[0] || '', 'payment is recorded', 'and nothing about the midpoint, which is paid');
      eq((await job()).status, 'closed', 'OK closes it: flagged, never refused');
      ok(await until(async () => UPLOADS.some((u) => /Disposition Ledger\.html$/.test(u.filename))), 'the ledger is filed to Drive');
      const up = UPLOADS.filter((u) => /Disposition Ledger\.html$/.test(u.filename)).slice(-1)[0] || {};
      eq([up.folderId, up.filename], ['INV58', HVL + ' - Havellin Disposition Ledger.html'], '⚠⚠ to Estate Inventory, under its undated name');
      has(up.html || '', 'Where each item went and what it brought', 'the ledger page');
      const stl = (await job()).docState.dispositionLedger || {};
      eq([stl.filedHow, !!stl.filedUrl], ['close', true], 'recorded on the job, as filed at close');
      await toDesk();
      has(await txt('#inv-ledger-card'), ', as the job closed · Filed copy', 'the card says it was filed as the job closed, with the link');
      await settled();
      await p.setInputFiles('#inv-ledger-card input[type=file]', pdf('ledger-signed.pdf'));
      ok(await until(async () => /Signed Disposition Ledger/.test(await txt('#inv-ledger-card'))), 'the signed copy files');
      const sr = ((await job()).signedRecords || []).filter((r) => r.kind === 'ledger');
      eq(sr.map((r) => r.ref), ['ledger'], 'recorded as kind ledger, ref ledger');
      await toDesk();
      const ja = await p.evaluate(() => !!document.querySelector('.ja-body'));
      if (!ja) { await p.click('#inventory-content .ja-hd').catch(() => {}); await p.waitForTimeout(400); }
      const line = await p.evaluate((id) => { const d = document.getElementById('plan-derived-admin-' + id); if (!d) return null;
        const l = Array.from(d.querySelectorAll('.pl-line')).find((x) => /Disposition Ledger signed/.test(x.textContent)); return l ? { ok: /pl-ok/.test(l.className), t: l.textContent } : null; }, ID);
      ok(!!line && line.ok, '⚠⚠ "Disposition Ledger signed by the Personal Representative" is green on the desk');
      has(line ? line.t : '', 'Disposition Ledger signed by the Personal Representative', 'naming who signs');
    });

    // ── F. overflow, print, errors ──────────────────────────────────────────
    await section('F. overflow at 1440 and 390; the ledger at Letter width in print; no page errors', async () => {
      await toDesk();
      ok(await overflow() <= 0, 'the desk with the records cards fits at 1440 (' + await overflow() + ')');
      await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(400);
      ok(await overflow() <= 0, 'and at 390 (' + await overflow() + ')');
      ok(await vis('#inv-ledger-card button[onclick="printDispositionLedger(' + ID + ')"]'), 'the ledger\'s Print is reachable on a phone');
      await p.evaluate((id) => openProceedsStatement(id), ID); await p.waitForTimeout(300);
      ok(await vis('#ps-save-btn'), 'the statement modal\'s Record button is on screen at 390');
      ok(await overflow() <= 0, 'the modal fits at 390 (' + await overflow() + ')');
      await p.evaluate(() => closeProceedsStatement());
      await p.setViewportSize({ width: 816, height: 1056 });
      await toDesk();
      await p.emulateMedia({ media: 'print' });
      await p.evaluate((id) => printDispositionLedger(id), ID); await p.waitForTimeout(500);
      const pr = await lastPrint();
      ok(pr.html.length > 0 && pr.over <= 0, 'the Disposition Ledger fits a Letter page in print (' + pr.over + ')');
      await p.emulateMedia({ media: 'screen' });
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
