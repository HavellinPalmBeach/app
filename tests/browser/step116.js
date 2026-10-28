// Step 116 — the work bar's papers open on screen first, as More ▾'s do (2026-10-27; Anthony, asked whether the Contents
// List, the Estate Inventory PDF, the Approval Request and the Contents Record should open the same way: "Yes").
//
// Drives the REAL page: a probate estate on the values tier (its bar's paper is the Estate Inventory PDF, with the Approval
// Request beside it), an estate on the contents tier (the Contents List) and a living Home Transition (the Contents Record).
// A: Estate Inventory PDF opens in the viewer, titled, its client under it, the page on screen, nothing printed; Print / Save
// PDF prints that page and the viewer comes back after the dialog; Close takes it away. B: the bar's Approval Request the same
// way. C: the selection bar's Approval request opens the request for the lines picked. D: the Contents List on the contents
// tier. E: the Contents Record on a client's own home. F: 390 px: no horizontal overflow; zero page errors.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step116.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');

const SYNC = 'https://sync.example.test/exec';
const T0 = Date.parse('2026-10-10T15:00:00Z');
const EST = 11601, CON = 11602, LIV = 11603;

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
    let sheet = {};
    await ctx.route(SYNC + '**', async (r) => {
      const req = r.request();
      const json = (o) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
      if (req.method() === 'POST') return json({ ok: true });
      if (/action=loadMedia/.test(req.url())) return json({ ok: true, media: sheet });
      return json({ ok: true });
    });
    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    p.on('dialog', async (d) => { await d.accept(); });
    await p.goto(APP); await p.waitForTimeout(1600);
    await p.evaluate((u) => {
      SHEETS_SYNC_URL = u;
      window.open = function () { return null; };
      window.__prints = [];
      window.print = function () { const pt = document.getElementById('print-target'); window.__prints.push(pt ? pt.innerHTML : ''); };
    }, SYNC);

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
    const txt = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }, sel);
    const val = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.value : null; }, sel);
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const toDesk = async (id) => {
      await p.evaluate((id) => { setCurrentJob(id); populateInventorySelect(); }, id);
      await p.click('.nb[onclick*="\'inventory\'"]'); await p.waitForTimeout(900);
      if (String(await val('#inv-job')) !== String(id)) { await p.selectOption('#inv-job', String(id)); await p.waitForTimeout(900); }
    };
    const viewerOpen = () => p.evaluate(() => { const o = document.getElementById('doc-viewer-modal'); return !!o && o.style.display === 'flex'; });
    const prints = () => p.evaluate(() => (window.__prints || []).length);
    const lastPrint = () => p.evaluate(() => (window.__prints || []).slice(-1)[0] || '');
    const until = async (f) => { for (let i = 0; i < 30; i++) { if (await f()) return true; await p.waitForTimeout(150); } return false; };
    const close = () => press('#doc-viewer-modal button[onclick="closeDocViewer()"]', 'Close');

    // One paper off the bar: on screen, titled, its client under it, the page there, nothing printed; then (where asked) Print /
    // Save PDF prints that page and the viewer comes back after the dialog; Close takes it away.
    const paper = async (sel, label, client, words, printToo) => {
      const before = await prints();
      await press(sel, label);
      ok(await viewerOpen(), '⚠⚠ ' + label + ': the viewer is on screen');
      eq(await txt('#doc-viewer-title'), label, label + ': titled by the paper');
      eq(await txt('#doc-viewer-sub'), client, label + ': its client under it');
      const body = await txt('#doc-viewer-body');
      words.forEach((w) => has(body, w, label + ': the page is there to read (' + w + ')'));
      await p.waitForTimeout(600);
      eq(await prints(), before, '⚠ ' + label + ': nothing printed by opening it');
      ok(await vis('#doc-viewer-print'), label + ': Print / Save PDF is offered');
      if (printToo) {
        await press('#doc-viewer-print', label + ': Print / Save PDF');
        for (let i = 0; i < 20 && (await prints()) === before; i++) await p.waitForTimeout(150);
        eq((await prints()) - before, 1, label + ': the dialog opened once');
        has(await lastPrint(), words[0], '⚠⚠ ' + label + ': with that page');
        ok(await until(viewerOpen), '⚠⚠ ' + label + ': the viewer is back once the dialog closes');
      }
      await close();
      ok(!(await viewerOpen()), label + ': Close takes it away');
      return body;
    };

    // ── Seed ──
    sheet = await p.evaluate(([EST, CON, LIV, T0]) => {
      const base = (id, o) => Object.assign({ id, hvlId: 'HVL-2610-E' + id, addr: id + ' Ocean Blvd', city: 'Palm Beach', zip: '33480',
        status: 'active', won: true, wonAt: '2026-09-25', approved: true, tc: 'Ashley Jerome', created: '2026-09-20', start: '2026-10-06', activatedOn: '2026-10-05',
        agrApproved: true, agrSent: true, agrSigned: true, docState: {},
        driveFolder: 'https://drive.google.com/drive/folders/ROOT' + id, driveSubfolders: { 'Estate Inventory': 'INV' + id, 'As-Found Record': 'AF' + id, 'Signed Records': 'SR' + id },
        payments: [{ uid: 'p' + id, stage: 'deposit', amount: 20000, receivedOn: '2026-10-01', method: 'wire', clearedOn: '2026-10-01' }] }, o);
      jobs.unshift(
        base(EST, { name: 'Harold Whitcombe', svc: 'probate', matterType: 'probate', executor: 'Thomas Whitcombe', executorRole: 'Personal Representative',
          executorEmail: 't@example.com', deathDate: '2026-04-02', executorAuth: 'received', probateAttyName: 'Ann Lowe', probateAttyEmail: 'ann@lowe.law',
          probateCase: '50-2026-CP-001234', docTier: 'values', gate706: 'no' }),
        base(CON, { name: 'Margaret Ellery', svc: 'cleanout', matterType: 'neither', executor: 'Paul Ellery', executorRole: 'Personal Representative',
          executorEmail: 'p@example.com', deathDate: '2026-05-11', docTier: 'contents', gate706: 'no' }),
        base(LIV, { name: 'Ruth Caldwell', svc: 'downsizing_move', email: 'ruth@example.com', phone: '5615550100', destAddr: '9 Harbor Way', destCity: 'Jupiter', destSqft: 1400 }));
      const est = (id, svc) => ({ approved: true, submitted: true, approvedBy: 'Anthony Graziano', savedAt: T0,
        estimate: { jobId: id, svc, havellinTotal: 40000, fixedPrice: true, fixedAmount: 40000, fixedLines: true, totTC: 100, totPS: 150, tcRate: 150, psRate: 100,
          days: 8, vendors: [], prepItems: [], pkgCost: 0, rooms: [{ idx: 0, name: 'Living Room', st: 'in', vol: 3, cplx: 3 }] } });
      estimateStore[EST] = est(EST, 'probate'); estimateStore[CON] = est(CON, 'cleanout'); estimateStore[LIV] = est(LIV, 'downsizing_move');
      const item = (job, id, o) => Object.assign({ stableId: id, label: 'inventory', roomIdx: 0, seq: 1, status: 'uploaded', category: 'Furniture', disposition: '',
        objectName: 'Line ' + id, ts: T0, updatedAt: T0, filename: 'HVL_' + job + '_INV_' + id + '.jpg', driveFileId: 'f-' + id, namedBy: 'desk', reviewed: true }, o);
      _photoRefs[EST] = [
        item(EST, 'a', { itemNo: 1, objectName: 'Harbor painting', category: 'Art & Décor', fmv: '2400', disposition: 'Auction', channel: 'Kodner Galleries' }),
        item(EST, 'b', { itemNo: 2, objectName: 'Mahogany sideboard', fmv: '900', disposition: 'Sell', channel: 'Kodner Galleries' })];
      _photoRefs[CON] = [item(CON, 'c', { itemNo: 1, objectName: 'Walnut bookcase', disposition: 'Donate', channel: 'Habitat ReStore' })];
      _photoRefs[LIV] = [item(LIV, 'd', { itemNo: 1, objectName: 'Wingback chair', fmv: '300', disposition: 'Move' })];
      [EST, CON, LIV].forEach((id) => savePhotoRefs(id));
      saveJobs(); localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore));
      const out = {}; [EST, CON, LIV].forEach((id) => { out[id] = { items: JSON.parse(localStorage.getItem('hav_media_' + id) || '[]') }; }); return out;
    }, [EST, CON, LIV, T0]);

    // ── A ───────────────────────────────────────────────────────────────────
    await section('A. Estate Inventory PDF on a values-tier estate: on screen first; Print / Save PDF prints it; Close', async () => {
      await toDesk(EST);
      await paper('#inv-workbar button[onclick="printEstateInventoryReport(' + EST + ')"]', 'Estate Inventory', 'Harold Whitcombe · ' + EST + ' Ocean Blvd',
        ['Mahogany sideboard', 'Harbor painting'], true);
      ok(await vis('#inv-workbar'), 'the desk is under it');
    });

    // ── B ───────────────────────────────────────────────────────────────────
    await section('B. the bar’s Approval Request: on screen first; Print / Save PDF prints it', async () => {
      const body = await paper('#inv-workbar button[onclick="printApprovalRequest(' + EST + ')"]', 'Release Approval Request', 'Harold Whitcombe · ' + EST + ' Ocean Blvd',
        ['Mahogany sideboard', 'Harbor painting'], true);
      has(body, 'Dear Thomas Whitcombe', 'the letter to the representative');
    });

    // ── C ───────────────────────────────────────────────────────────────────
    await section('C. the selection bar’s Approval request: the lines picked, on screen first', async () => {
      await p.evaluate(() => { _invOpen = {}; renderInventoryTab(); }); await p.waitForTimeout(400);
      await p.click('#inv-row-b input[title="Select for a bulk change"]'); await p.waitForTimeout(400);
      const body = await paper('.inv-bulk button[onclick="printApprovalRequest(' + EST + ',true)"]', 'Release Approval Request', 'Harold Whitcombe · ' + EST + ' Ocean Blvd',
        ['Mahogany sideboard'], false);
      lacks(body, 'Harbor painting', '⚠ only the line picked');
    });

    // ── D ───────────────────────────────────────────────────────────────────
    await section('D. the Contents List on a contents-tier estate', async () => {
      await toDesk(CON);
      await paper('#inv-workbar button[onclick="printContentsList(' + CON + ')"]', 'Contents List', 'Margaret Ellery · ' + CON + ' Ocean Blvd', ['Walnut bookcase'], true);
    });

    // ── E ───────────────────────────────────────────────────────────────────
    await section('E. the Contents Record on a client’s own home', async () => {
      await toDesk(LIV);
      await paper('#inv-workbar button[onclick="printContentsRecord(' + LIV + ')"]', 'Contents Record', 'Ruth Caldwell · ' + LIV + ' Ocean Blvd', ['Wingback chair'], true);
    });

    // ── F ───────────────────────────────────────────────────────────────────
    await section('F. the viewer on a phone: no horizontal overflow; zero page errors', async () => {
      await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(500);
      await toDesk(EST);
      await p.evaluate((id) => printEstateInventoryReport(id), EST);
      // Since P6 (2026-10-27) a paper reads the sheet first, so the viewer opens once that read has answered.
      ok(await until(viewerOpen), 'fixture: the viewer is open');
      ok((await overflow()) <= 0, 'no horizontal overflow at 390 (' + (await overflow()) + ')');
      await close();
      eq(errs, [], 'zero page errors');
    });

    await b.close();
    console.log('\nstep116: ' + pass + ' passed, ' + fail + ' failed');
    process.exit(fail ? 1 : 0);
  } catch (e) {
    console.log('step116 crashed: ' + (e && e.stack || e));
    if (b) await b.close().catch(() => {});
    process.exit(1);
  }
})();
