// Step 126 — every card's paper opens on screen first, as More ▾'s and the work bar's do (2026-11-02; Anthony, asked whether
// the cards' papers should open the same way: "yes, do the cards' papers too").
//
// Drives the REAL page through its own controls against one routed Apps Script (its stores, loadMedia and loadSnapshots
// answered as the deployment would). What is seeded is state a person could not type in one sitting: an active probate estate
// with a representative, an inventory on the sheet (a portrait sold at auction with Kodner Galleries, a sofa donated to
// Goodwill, a tea service approved to Mary Smith, a Bible kept), two inventory snapshots, a key received and held, an original
// will found in the study, and a change order awaiting the client's acceptance. Each paper is opened by the button a person
// presses, and for each: the viewer is on screen, titled by the paper, the client under it, the page there to read, nothing
// printed by opening it; Print / Save PDF prints that page once, under the paper's file name, and the viewer comes back after
// the dialog; Close takes it away.
//   A. The Disposition Ledger card's Print (Closing the job).
//   B. Mary Smith's leaving row: Print receipt (Releases & signed papers).
//   C. The Donations card: Print Donation Record for Goodwill.
//   D. The snapshots (Removed items & snapshots): Print on a snapshot, Compare with now, Compare with previous.
//   E. The Job Plan's Keys & access card: Print the custody record.
//   F. The Job Plan's Found on site card: Print Receipt for Original Will.
//   G. The client dashboard's Change Orders card: PDF.
//   H. 390 px: every column of the ledger, the custody record and the will receipt can be scrolled to inside the viewer
//      (it hid them until 2026-11-02); no page overflow at 390 or 1440; no dialogs; zero page errors.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step126.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');

const SYNC = 'https://script.google.com/macros/s/STEP124/exec';
const ID = 12401, HVL = 'HVL-2610-12401';
const NAME = 'Eleanor Vance', ADDR = '124 Seaview Ave', CLIENT = NAME + ' · ' + ADDR;
const T0 = Date.parse('2026-09-28T15:00:00Z'), T1 = T0 - 86400000;
const CO_ID = 1760000124001;
const STORE = { jobs: [], estimates: {}, media: {}, snaps: {}, cos: null };

const L = (id, o) => Object.assign({ stableId: id, label: 'inventory', collId: null, roomIdx: 1, seq: 1, status: 'uploaded', qty: 1,
  category: 'Furniture', condition: 'Good', ts: T0, updatedAt: T0, namedBy: 'desk', reviewed: true,
  driveFileId: 'f-' + id, driveFileUrl: 'https://drive.google.com/file/d/f-' + id + '/view' }, o);
const LINES = [
  L('a1', { itemNo: 1, objectName: 'Sargent portrait', disposition: 'Auction', channel: 'Kodner Galleries', gross: 1000, fees: 250, dispDate: '2026-09-30',
    authBy: 'Rex Hale', approvalDate: '2026-09-25', fmv: '1000' }),
  L('d1', { itemNo: 2, objectName: 'Camelback sofa', disposition: 'Donate', channel: 'Goodwill', condition: 'Fair', fmv: '300', dispDate: '2026-09-29',
    authBy: 'Rex Hale', approvalDate: '2026-09-25' }),
  L('m1', { itemNo: 3, objectName: 'Walnut tea table', disposition: 'Distribute', channel: 'Mary Smith', fmv: '450', authBy: 'Rex Hale', approvalDate: '2026-09-25' }),
  L('k1', { itemNo: 4, objectName: 'Family Bible', disposition: 'Keep', fmv: '40' }),
];
// The two snapshots' lines as the sheet's snapshot store holds them (since 2026-10-27, P1).
const SL = (o) => Object.assign({ category: 'Furniture', fmv: '', disposition: '', track: 'Probate', qty: 1, room: 'Study', condition: 'Good', basis: '', valDate: '' }, o);
STORE.snaps[ID] = {
  [T1]: { ts: T1, items: [SL({ itemNo: 1, object: 'Portrait' }), SL({ itemNo: 2, object: 'Camelback sofa', fmv: '300' })] },
  [T0]: { ts: T0, items: [SL({ itemNo: 1, object: 'Sargent portrait' }), SL({ itemNo: 2, object: 'Camelback sofa', fmv: '300' }), SL({ itemNo: 9, object: 'Card table' })] } };

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
    await ctx.addInitScript((u) => { try { localStorage.setItem('hav_sheets_url', u); localStorage.setItem('hav_device_user', 'Ashley Jerome'); } catch (e) {} }, SYNC);
    await ctx.route(SYNC + '**', async (route) => {
      const req = route.request(), url = new URL(req.url()), action = url.searchParams.get('action');
      const json = (o) => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(o) });
      if (req.method() === 'POST') {
        let body = {}; try { body = JSON.parse(req.postData() || '{}'); } catch (e) {}
        if (body.type === 'saveAllJobs') { STORE.jobs = body.payload || []; return json({ ok: true }); }
        if (body.type === 'job') { STORE.jobs = STORE.jobs.filter((j) => j.id !== (body.payload || {}).id).concat([body.payload]); return json({ ok: true }); }
        if (body.type === 'saveAllEstimates') { Object.assign(STORE.estimates, body.payload || {}); return json({ ok: true }); }
        if (body.type === 'saveAllChangeOrders') { STORE.cos = body.payload || []; return json({ ok: true }); }
        if (body.action === 'getSubfolders') return json({ ok: true, subfolders: {} });
        return json({ ok: true });
      }
      switch (action) {
        case 'loadJobs': return json({ jobs: STORE.jobs, deletedJobs: [] });
        case 'loadEstimates': return json({ ok: true, estimates: STORE.estimates });
        case 'loadJobPlans': return json({ ok: true, jobPlans: {} });
        case 'loadLogs': return json({ ok: true, logs: {} });
        case 'loadChangeOrders': return json({ ok: true, changeOrders: STORE.cos || [] });
        case 'loadContractors': return json({ ok: true, contractors: { added: [], defaults: [] } });
        case 'loadMedia': {
          const id = url.searchParams.get('jobId');
          return json({ ok: true, media: id ? { [id]: { items: STORE.media[id] || [] } } : {} });
        }
        case 'loadSnapshots': return json({ ok: true, snapshots: STORE.snaps[url.searchParams.get('jobId')] || {} });
        case 'version': return json({ ok: false, error: 'Unknown action' });
        default: return json({ ok: false, error: 'not in this test: ' + action });
      }
    });

    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    const dialogs = [];
    p.on('dialog', async (d) => { dialogs.push(d.type() + ': ' + d.message()); await d.accept(); });
    await p.goto(APP); await p.waitForTimeout(1800);
    const APP_TITLE = await p.evaluate(() => document.title);
    await p.evaluate(() => {
      window.open = function () { return null; };
      window.__prints = [];
      window.print = function () { const pt = document.getElementById('print-target'), ov = document.getElementById('doc-viewer-modal');
        window.__prints.push({ html: pt ? pt.innerHTML : '', title: document.title, viewerUp: !!ov && ov.style.display === 'flex' }); };
    });

    const section = async (name, body) => {
      console.log('\n## ' + name);
      try { await body(); } catch (e) { fail++; console.log('  ✗ ' + name + ' threw: ' + String(e && e.message || e).split('\n')[0]); }
    };
    const vis = (sel) => p.locator(sel).first().isVisible().catch(() => false);
    // A print hides the panels for the dialog and restores them about 650 ms later (_printDocument), so a press waits until a
    // panel is showing again before the next control is looked for.
    const settled = async () => { for (let i = 0; i < 40; i++) { if (await p.evaluate(() => !!document.querySelector('.panel.active') && document.getElementById('print-target').style.display !== 'block')) return; await p.waitForTimeout(100); } };
    const press = async (sel, what) => {
      await settled();
      const n = await p.locator(sel).count();
      const v = n === 1 && await vis(sel);
      ok(v, (what || sel) + ' — one control, on screen (' + n + ')');
      if (v) { await p.click(sel, { timeout: 5000 }).catch((e) => ok(false, (what || sel) + ' — ' + e.message.split('\n')[0])); await p.waitForTimeout(400); }
      return v;
    };
    const txt = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }, sel);
    const val = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.value : null; }, sel);
    const T = (h) => p.evaluate((h) => { const d = document.createElement('div');
      d.innerHTML = String(h).replace(/<\/td>/g, ' </td>').replace(/<\/th>/g, ' </th>').replace(/<br>/g, ' '); return d.textContent.replace(/\s+/g, ' '); }, h);
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const until = async (f, ms) => { for (let i = 0; i < (ms || 5000) / 150; i++) { if (await f()) return true; await p.waitForTimeout(150); } return false; };
    const viewerOpen = () => p.evaluate(() => { const o = document.getElementById('doc-viewer-modal'); return !!o && o.style.display === 'flex'; });
    const prints = () => p.evaluate(() => (window.__prints || []).length);
    const lastPrint = () => p.evaluate(() => (window.__prints || []).slice(-1)[0] || { html: '', title: '' });
    const close = () => press('#doc-viewer-modal button[onclick="closeDocViewer()"]', 'Close');

    // One paper off its card: the press opens the viewer (a desk paper reads the sheet first, P6, so it opens once that read
    // has answered), titled by the paper, the client under it, the page there to read, nothing printed by opening it; Print /
    // Save PDF prints that page once under the paper's file name, and the viewer comes back after the dialog; Close takes it
    // away. Answers the page's text as the viewer showed it.
    const paper = async (sel, label, words, fileName) => {
      const before = await prints();
      await press(sel, label + ': its button');
      ok(await until(viewerOpen), '⚠⚠ ' + label + ': the viewer is on screen');
      eq(await txt('#doc-viewer-title'), label, label + ': titled by the paper');
      eq(await txt('#doc-viewer-sub'), CLIENT, label + ': its client under it');
      const body = await T(await p.evaluate(() => (document.getElementById('doc-viewer-body') || {}).innerHTML || ''));
      words.forEach((w) => has(body, w, label + ': the page is there to read (' + w + ')'));
      await p.waitForTimeout(700);
      eq(await prints(), before, '⚠ ' + label + ': nothing printed by opening it');
      ok(await vis('#doc-viewer-print'), label + ': Print / Save PDF is offered');
      const n0 = await prints();
      await press('#doc-viewer-print', label + ': Print / Save PDF');
      await until(async () => (await prints()) > n0, 3000);
      eq((await prints()) - n0, 1, label + ': the dialog opened once');
      const pr = await lastPrint();
      has(await T(pr.html), words[0], '⚠⚠ ' + label + ': with that page');
      eq(pr.viewerUp, false, label + ': the viewer steps aside while the print dialog is up');
      has(pr.title, fileName, label + ': under the paper\'s file name');
      ok(await until(viewerOpen), '⚠⚠ ' + label + ': the viewer is back once the dialog closes');
      ok(await until(() => p.evaluate((t) => document.title === t, APP_TITLE)), label + ': the app\'s own title is back');
      await p.waitForTimeout(300);
      eq((await prints()) - n0, 1, label + ': and it printed only once');
      await close();
      ok(!(await viewerOpen()), label + ': Close takes it away');
      return body;
    };
    // ⚠ THE DESK'S FOUR BARS (2026-10-22): a card sits in a fold bar that opens by its own rules, so it is opened by a real
    // press of its header, and only when its body is hidden.
    const openBar = async (fold) => {
      const body = p.locator('#desk-body-' + fold + '-' + ID), hd = p.locator('#desk-hd-' + fold + '-' + ID);
      if ((await body.count()) === 1 && !(await body.isVisible()) && (await hd.isVisible())) { await p.click('#desk-hd-' + fold + '-' + ID); await p.waitForTimeout(300); }
      ok(await body.isVisible().catch(() => false), 'the ' + fold + ' bar is open');
    };
    const toDesk = async (fold) => {
      await settled();
      await p.evaluate((id) => { setCurrentJob(id); populateInventorySelect(); }, ID);
      await p.click('.nb[onclick*="\'inventory\'"]'); await p.waitForTimeout(800);
      if (String(await val('#inv-job')) !== String(ID)) { await p.selectOption('#inv-job', String(ID)); await p.waitForTimeout(800); }
      if (fold) await openBar(fold);
    };
    const toPlan = async () => {
      await settled();
      await p.evaluate((id) => { setCurrentJob(id); }, ID);
      await p.click('.nb[onclick*="\'job-plan\'"]'); await p.waitForTimeout(900);
      if (String(await val('#plan-job')) !== String(ID)) { await p.selectOption('#plan-job', String(ID)); await p.waitForTimeout(900); }
    };

    // ── Seed ────────────────────────────────────────────────────────────────
    STORE.media[ID] = JSON.parse(JSON.stringify(LINES));
    await p.evaluate(([ID, HVL, NAME, ADDR, T0, T1, CO_ID, LINES]) => {
      jobs = jobs.filter((j) => j.id !== ID);
      jobs.unshift({ id: ID, hvlId: HVL, name: NAME, fname: 'Eleanor', lname: 'Vance', svc: 'probate', status: 'active',
        won: true, wonAt: '2026-09-17', wonBy: 'Anthony Graziano', wonMethod: 'call', approved: true, agrApproved: true, agrApprovedBy: 'Anthony Graziano',
        agrSent: true, agrSigned: true, depositReceived: true, tc: 'Ashley Jerome', created: '2026-09-10', start: '2026-09-21', walkthrough: '2026-09-15',
        activatedOn: '2026-09-21', activatedBy: 'Ashley Jerome', addr: ADDR, city: 'Palm Beach', zip: '33480',
        matterType: 'probate', docTier: 'values', gate706: 'no', deathDate: '2026-08-01', executorAuth: 'received',
        executor: 'Rex Hale', executorFname: 'Rex', executorLname: 'Hale', executorRole: 'Personal Representative', executorEmail: 'rex@hale.example',
        probateAttyName: 'Richard Comiter', probateAttyFirm: 'Comiter Law', probateAttyEmail: 'rc@example.com', probateCase: '50-2026-CP-001240',
        driveFolder: 'https://drive.google.com/drive/folders/ROOT124',
        driveSubfolders: { 'Estate Inventory': 'INV124', 'As-Found Record': 'AF124', 'Signed Records': 'SR124' },
        crew: { tc: { name: 'Ashley Jerome', locked: true }, tc2: { name: '', locked: false }, ps: [{ name: 'Anthony Graziano Jr', locked: true }], confirmed: true },
        payments: [{ uid: 'dep124', stage: 'deposit', amount: 12000, receivedOn: '2026-09-15', method: 'wire', clearedOn: '2026-09-15' }],
        invSnapshots: [{ ts: T1, label: 'As of walkthrough', count: 2, totalFMV: 300 }, { ts: T0, label: 'Before the sale', count: 3, totalFMV: 300 }],
        // A front door key received from the representative and held by the concierge (Keys & access).
        accessItems: [{ id: 'ak1', kind: 'key', label: 'front door', qty: 2, code: '', receivedOn: '2026-09-21', receivedFrom: 'Rex Hale',
          recordedBy: 'Ashley Jerome', recordedAt: T0 }],
        accessEvents: [{ id: 'ae1', itemId: 'ak1', kind: 'received', on: '2026-09-21', from: 'Rex Hale', to: 'Ashley Jerome', note: '',
          recordedBy: 'Ashley Jerome', recordedAt: T0 }],
        // An original will found in the study, not yet handed over (Found on site).
        siteFinds: [{ id: 'sf1', kind: 'will', foundOn: '2026-09-23', where: 'study, desk drawer', foundBy: 'Anthony Graziano Jr',
          description: 'Sealed cream envelope marked Last Will in ink, unopened', recordedBy: 'Ashley Jerome', recordedAt: T0 }],
        docState: { 'invoice:deposit': { draftedAt: '2026-09-15T10:00:00Z', sentAt: '2026-09-15T10:00:00Z' } },
        at: {}, updatedAt: Date.now() });
      estimateStore[ID] = { approved: true, submitted: true, approvedBy: 'Anthony Graziano', approvedAt: 'September 16, 2026', savedAt: T0,
        estimate: { jobId: ID, svc: 'probate', havellinTotal: 24000, grandTotal: 24000, fixedPrice: false, totTC: 40, totPS: 80, tcRate: 150, psRate: 100,
          tcFee: 6000, psFee: 8000, days: 4, collections: [], vendors: [], prepItems: [], pkgCost: 0, psSlots: [],
          rooms: [{ idx: 1, name: 'Study', st: 'in', vol: 3, cplx: 3 }] } };
      try { localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore)); } catch (x) {}
      // A change order raised and awaiting the client's acceptance, as Create writes it.
      changeOrders = changeOrders.filter((c) => c.jobId !== ID);
      changeOrders.push({ id: CO_ID, updatedAt: T0, jobId: ID, description: 'Added the detached garage apartment to scope.', reason: 'scope_add',
        tcHrs: 6, psHrs: 8, createdAt: 'Sep 29, 2026', clientApproved: false, clientName: '', clientAcceptedAt: '' });
      saveChangeOrders();
      _photoRefs[ID] = JSON.parse(JSON.stringify(LINES));
      savePhotoRefs(ID);
      saveJobs(); renderJobs();
    }, [ID, HVL, NAME, ADDR, T0, T1, CO_ID, LINES]);
    await p.waitForTimeout(800);

    // ── A ───────────────────────────────────────────────────────────────────
    await section('A. the Disposition Ledger card\'s Print: on screen first; Print / Save PDF prints it; Close', async () => {
      await toDesk('closing');
      ok(await vis('#inv-ledger-card'), 'fixture: the Disposition Ledger card is on the desk');
      const body = await paper('#inv-ledger-card button[onclick="printDispositionLedger(' + ID + ')"]', 'Disposition Ledger',
        ['Sargent portrait', 'Camelback sofa', 'Walnut tea table'], 'Havellin Disposition Ledger - ' + ADDR);
      has(body, 'Rex Hale, Personal Representative', 'the representative\'s sign-off line is on the page on screen');
      ok(await vis('#inv-ledger-card'), 'the desk is under it, the card where it was');
    });

    // ── B ───────────────────────────────────────────────────────────────────
    await section('B. Mary Smith\'s leaving row: Print receipt opens the receipt on screen first', async () => {
      await toDesk('releases');
      const row = await p.evaluate(() => [...document.querySelectorAll('#inv-releases .inv-leaving-row')].map((r) => r.textContent.replace(/\s+/g, ' ').trim())
        .filter((t) => t.indexOf('Mary Smith') === 0)[0] || '');
      has(row, '#3', 'fixture: Mary Smith\'s row carries the tea table');
      await paper('#inv-releases button[onclick^="printBeneficiaryReceipt("]', 'Receipt - Mary Smith', ['Walnut tea table', 'Mary Smith'], 'Havellin Receipt - Mary Smith - ' + ADDR);
    });

    // ── C ───────────────────────────────────────────────────────────────────
    await section('C. the Donations card: Print Donation Record for Goodwill, on screen first', async () => {
      await toDesk('closing');
      ok(await vis('#inv-donations-card'), 'fixture: the Donations card is on the desk');
      const body = await paper('#inv-donations-card button[onclick="printDonationRecord(' + ID + ',\'d1\')"]', 'Donation Record - Goodwill',
        ['Camelback sofa', 'Charity: Goodwill'], 'Havellin Donation Record - Goodwill - ' + ADDR);
      has(body, 'Donated on behalf of the estate, by Rex Hale, Personal Representative.', 'on whose behalf');
    });

    // ── D ───────────────────────────────────────────────────────────────────
    await section('D. the snapshots: Print, Compare with now and Compare with previous, each on screen first', async () => {
      await toDesk('history');
      eq(await p.locator('#inv-snapshots .snap-row').count(), 2, 'fixture: two snapshots listed');
      const s = await paper('#inv-snapshots button[onclick="printInventorySnapshot(' + ID + ',' + T0 + ')"]', 'Inventory Snapshot',
        ['Card table', 'Before the sale'], 'Havellin Inventory Snapshot - ' + ADDR);
      has(s, 'Sargent portrait', 'the snapshot\'s lines, read from the sheet');
      const now = await paper('#inv-snapshots button[onclick="printSnapshotComparison(' + ID + ',' + T0 + ',\'now\')"]', 'Inventory Snapshot Comparison',
        ['Inventory Snapshot — What Changed', 'Items 3 → 4'], 'Havellin Inventory Snapshot Comparison - ' + ADDR);
      has(now, 'Walnut tea table', 'what was added since, against the inventory now');
      const prev = await paper('#inv-snapshots button[onclick="printSnapshotComparison(' + ID + ',' + T0 + ',\'prev\')"]', 'Inventory Snapshot Comparison',
        ['(As of walkthrough) compared with the snapshot of', 'Items 2 → 3'], 'Havellin Inventory Snapshot Comparison - ' + ADDR);
      has(prev, 'Renamed (1)', 'the snapshot before it set against this one');
    });

    // ── E ───────────────────────────────────────────────────────────────────
    await section('E. the Job Plan\'s Keys & access card: Print the custody record, on screen first', async () => {
      await toPlan();
      ok(await vis('#plan-access-' + ID), 'fixture: the Keys & access card is on the Job Plan');
      const body = await paper('#plan-access-' + ID + ' button[onclick*="printAccessRecord("]', 'Key and Access Custody Record',
        ['front door', 'IN PROGRESS — 1 of 1 still held'], 'Havellin Key and Access Custody Record - ' + ADDR);
      has(body, 'Ashley Jerome', 'who holds it');
      ok(await vis('#plan-access-' + ID), 'the Job Plan is under it, the card where it was');
    });

    // ── F ───────────────────────────────────────────────────────────────────
    await section('F. the Job Plan\'s Found on site card: Print Receipt for Original Will, on screen first', async () => {
      await toPlan();
      ok(await vis('#plan-finds-' + ID), 'fixture: the Found on site card is on the Job Plan');
      const body = await paper('#plan-finds-' + ID + ' button:has-text("Print Receipt for Original Will")', 'Receipt for Original Will',
        ['Sealed cream envelope marked Last Will in ink, unopened', 'Havellin has not opened it'], 'Havellin Receipt for Original Will - ' + ADDR);
      has(body, 'Received by:', 'the line for the person receiving it');
    });

    // ── G ───────────────────────────────────────────────────────────────────
    await section('G. the client dashboard\'s Change Orders card: PDF opens the change order on screen first', async () => {
      await settled();
      await p.click('.nb[onclick*="\'jobs\'"]'); await p.waitForTimeout(400);
      await press('#panel-jobs tr[onclick="openClientDashboard(' + ID + ')"]', 'the client\'s row on the client list');
      await p.waitForTimeout(600);
      const body = await paper('#client-dashboard-view button[onclick="printChangeOrder(' + CO_ID + ')"]', 'Change Order',
        ['Added the detached garage apartment to scope.', 'CO-' + String(CO_ID).slice(-6)], 'Havellin Change Order CO-' + String(CO_ID).slice(-6) + ' - ' + ADDR);
      has(body, 'This change order does not itself create a charge.', 'an hourly change order\'s terms');
      ok(await vis('#client-dashboard-view button[onclick="openCOAcceptModal(' + CO_ID + ')"]'), 'the dashboard is under it, Get Acceptance where it was');
    });

    // ── H ───────────────────────────────────────────────────────────────────
    // Restated on review (2026-11-02): the page's own scroll width cannot see inside the viewer (a fixed overlay whose body
    // hid what it could not fit), so the check is made in the viewer: every column a person can reach. The ledger, and the two
    // Job Plan papers a phone reaches in field mode.
    await section('H. the viewer on a phone: every column reachable inside it, no page overflow; zero page errors', async () => {
      const reach = () => p.evaluate(() => {
        const b = document.getElementById('doc-viewer-body'); if (!b) return { ok: false, why: 'no viewer body' };
        const wide = b.scrollWidth > b.clientWidth + 1, ox = getComputedStyle(b).overflowX;
        return { ok: !wide || ox === 'auto' || ox === 'scroll', why: b.scrollWidth + ' in ' + b.clientWidth + ', overflow-x ' + ox, wide };
      });
      await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(500);
      const at390 = [
        [async () => toDesk('closing'), '#inv-ledger-card button[onclick="printDispositionLedger(' + ID + ')"]', 'the ledger card\'s Print'],
        [toPlan, '#plan-access-' + ID + ' button[onclick*="printAccessRecord("]', 'Print the custody record'],
        [toPlan, '#plan-finds-' + ID + ' button:has-text("Print Receipt for Original Will")', 'Print Receipt for Original Will'],
      ];
      let anyWide = false;
      for (const [go, sel, what] of at390) {
        await go();
        await press(sel, what + ', at 390');
        ok(await until(viewerOpen), what + ': the viewer is open at 390');
        const r = await reach();
        anyWide = anyWide || r.wide;
        ok(r.ok, '⚠⚠ ' + what + ': every column can be scrolled to inside the viewer (' + r.why + ')');
        ok((await overflow()) <= 0, what + ': no page overflow at 390 with the viewer open (' + (await overflow()) + ')');
        if (await viewerOpen()) await close();
      }
      ok(anyWide, 'fixture: at least one paper is wider than the phone (else the check above proves nothing)');
      ok((await overflow()) <= 0, 'and none once it is closed (' + (await overflow()) + ')');
      await p.setViewportSize({ width: 1440, height: 1000 }); await p.waitForTimeout(400);
      await toDesk('closing');
      await press('#inv-ledger-card button[onclick="printDispositionLedger(' + ID + ')"]', 'the ledger card\'s Print, at 1440');
      ok((await overflow()) <= 0, 'no page overflow at 1440 with the viewer open (' + (await overflow()) + ')');
      if (await viewerOpen()) await close();
      eq(dialogs, [], 'no alert or confirm along the way');
      eq(errs, [], 'zero page errors');
    });

    await b.close();
    console.log('\nstep126: ' + pass + ' passed, ' + fail + ' failed');
    process.exit(fail ? 1 : 0);
  } catch (e) {
    console.log('step126 crashed: ' + (e && e.stack || e));
    console.log('\nstep126: ' + pass + ' passed, ' + (fail + 1) + ' failed');
    if (b) await b.close().catch(() => {});
    process.exit(1);
  }
})();
