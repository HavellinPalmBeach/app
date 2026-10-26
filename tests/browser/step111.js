// Step 111 — the desk's More ▾ papers open on screen first (2026-10-26; Anthony: "as soon as I cancel or I launch a printer ...
// it just disappears").
//
// Drives the REAL page: a probate estate with two rooms, an as-found photograph in one, an unvalued painting flagged for
// appraisal and a sideboard. A: More ▾ → As-Found Record opens in the viewer, titled, the page on screen, nothing printed.
// B: the viewer's Print / Save PDF prints that page and the viewer comes back after the dialog; Close takes it away.
// C: the Appraisal Worklist and the Court Inventory the same way. D: the work bar's Approval Request still prints at once.
// E: the viewer at 390 px: no horizontal overflow; zero page errors.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step111.js [/abs/path/to/havellin.html]
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
const EST = 11101;

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
    let sheet = {};
    const posts = [];
    await ctx.route(SYNC + '**', async (r) => {
      const req = r.request();
      const json = (o) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
      if (req.method() === 'POST') {
        let body = {}; try { body = JSON.parse(req.postData() || '{}'); } catch (e) {}
        posts.push(body);
        if (body.action === 'uploadHtml') return json({ ok: true, fileUrl: 'https://drive.google.com/file/d/up' + posts.length + '/view', fileId: 'up' + posts.length });
        if (body.action === 'htmlToPdf') return json({ ok: true, base64: Buffer.from('%PDF-1.4 ' + 'x'.repeat(200)).toString('base64') });
        if (body.action === 'getSubfolders') return json({ ok: true, subfolders: null });
        return json({ ok: true });
      }
      if (/action=loadMedia/.test(req.url())) return json({ ok: true, media: sheet });
      return json({ ok: true });
    });
    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    const dialogs = [];
    p.on('dialog', async (d) => { dialogs.push(d.type() + ': ' + d.message()); await d.accept(); });
    await p.goto(APP); await p.waitForTimeout(1600);
    await p.evaluate((u) => {
      SHEETS_SYNC_URL = u;
      window.__opened = [];
      window.open = function (x) { window.__opened.push(String(x)); return null; };
      window.__drafts = [];
      window.gmailCreateDraft = function (mime, cb) { window.__drafts.push(mime); cb(true, { draftId: 'd1', messageId: 'm1' }); };
      window.sendInternalEmail = function () {};
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
    const html = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.innerHTML : ''; }, sel);
    const val = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.value : null; }, sel);
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const toDesk = async (id) => {
      await p.evaluate((id) => { setCurrentJob(id); populateInventorySelect(); }, id);
      await p.click('.nb[onclick*="\'inventory\'"]'); await p.waitForTimeout(900);
      if (String(await val('#inv-job')) !== String(id)) { await p.selectOption('#inv-job', String(id)); await p.waitForTimeout(900); }
    };
    const record = () => p.evaluate((id) => { const j = jobs.find((x) => x.id === id); return JSON.parse(JSON.stringify((j.docState || {}).approvalRequest || null)); }, EST);
    // ⚠ THE DESK'S FOUR BARS (2026-10-22): the Releases card sits in a fold bar, so it is opened by a real press of its
    // header, and only when its body is hidden.
    const openBar = async (fold, id) => {
      const body = p.locator('#desk-body-' + fold + '-' + id), hd = p.locator('#desk-hd-' + fold + '-' + id);
      if ((await body.count()) === 1 && !(await body.isVisible()) && (await hd.isVisible())) { await p.click('#desk-hd-' + fold + '-' + id); await p.waitForTimeout(300); }
    };
    const sendsOnDesk = () => p.evaluate(() => Array.from(document.querySelectorAll('#inventory-content button[onclick^="sendApprovalRequest("]')).map((x) => x.getAttribute('onclick')));

    // ── Seed ──
    sheet = await p.evaluate(([EST, T0]) => {
      jobs.unshift({ id: EST, hvlId: 'HVL-2610-E111', name: 'Harold Whitcombe', svc: 'probate', matterType: 'probate', addr: '5 E St', city: 'Palm Beach', zip: '33480',
        executor: 'Thomas Whitcombe', executorRole: 'Personal Representative', executorEmail: 't@example.com', deathDate: '2026-04-02', executorAuth: 'received',
        probateAttyName: 'Ann Lowe', probateAttyEmail: 'ann@lowe.law', probateCase: '50-2026-CP-001234', docTier: 'values', gate706: 'no',
        status: 'active', won: true, wonAt: '2026-09-25', approved: true, tc: 'Ashley Jerome', created: '2026-09-20', start: '2026-10-06', activatedOn: '2026-10-05',
        agrApproved: true, agrSent: true, agrSigned: true,
        driveFolder: 'https://drive.google.com/drive/folders/ROOT111', driveSubfolders: { 'Estate Inventory': 'INV111', 'As-Found Record': 'AF111', 'Signed Records': 'SR111' },
        docState: {}, payments: [{ uid: 'e1', stage: 'deposit', amount: 20000, receivedOn: '2026-10-01', method: 'wire', clearedOn: '2026-10-01' }] });
      estimateStore[EST] = { approved: true, submitted: true, approvedBy: 'Anthony Graziano', savedAt: T0,
        estimate: { jobId: EST, svc: 'probate', havellinTotal: 40000, fixedPrice: true, fixedAmount: 40000, fixedLines: true, totTC: 100, totPS: 150, tcRate: 150, psRate: 100,
          days: 8, vendors: [], prepItems: [], pkgCost: 0, rooms: [{ idx: 0, name: 'Living Room', st: 'in', vol: 3, cplx: 3 }, { idx: 1, name: 'Study', st: 'in', vol: 3, cplx: 3 }] } };
      const item = (id, o) => Object.assign({ stableId: id, label: 'inventory', roomIdx: 0, seq: 1, status: 'uploaded', category: 'Furniture', disposition: '',
        objectName: 'Line ' + id, ts: T0, updatedAt: T0, filename: 'HVL_' + EST + '_INV_' + id + '.jpg', driveFileId: 'f-' + id, namedBy: 'desk', reviewed: true }, o);
      _photoRefs[EST] = [
        { stableId: 'af1', label: 'before', roomIdx: 0, seq: 1, collId: null, status: 'uploaded', ts: T0, updatedAt: T0, filename: 'HVL_' + EST + '_Room_before_1.jpg',
          driveFileId: 'f-af1', driveFileUrl: 'https://drive.google.com/file/d/f-af1/view' },
        item('a', { itemNo: 1, objectName: 'Harbor painting', category: 'Art & Décor', fmv: '', needsAppr: true, disposition: 'Auction', channel: 'Kodner Galleries' }),
        item('b', { itemNo: 2, objectName: 'Mahogany sideboard', fmv: '900', disposition: 'Sell', channel: 'Kodner Galleries' })];
      savePhotoRefs(EST);
      saveJobs(); localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore));
      const out = {}; out[EST] = { items: JSON.parse(localStorage.getItem('hav_media_' + EST) || '[]') }; return out;
    }, [EST, T0]);
    const viewerOpen = () => p.evaluate(() => { const o = document.getElementById('doc-viewer-modal'); return !!o && o.style.display === 'flex'; });
    const prints = () => p.evaluate(() => (window.__prints || []).length);
    const lastPrint = () => p.evaluate(() => ({ html: (window.__prints || []).slice(-1)[0] || '' }));
    const until = async (f) => { for (let i = 0; i < 30; i++) { if (await f()) return true; await p.waitForTimeout(150); } return false; };
    const more = async () => { if (!(await vis('#inv-more button[onclick="printAsFoundRecord(' + EST + ')"]'))) await press('#inv-more > summary', 'More ▾'); };

    // ── A ───────────────────────────────────────────────────────────────────
    await section('A. More ▾ → As-Found Record: on screen in the viewer, titled, nothing printed', async () => {
      await toDesk(EST);
      await more();
      const before = await prints();
      await press('#inv-more button[onclick="printAsFoundRecord(' + EST + ')"]', 'As-Found Record');
      ok(await viewerOpen(), '⚠⚠ the viewer is on screen');
      eq(await txt('#doc-viewer-title'), 'As-Found Record', 'titled by the paper');
      eq(await txt('#doc-viewer-sub'), 'Harold Whitcombe · 5 E St', 'its client under it');
      has(await txt('#doc-viewer-body'), 'Living Room', 'the page is there to read');
      has(await txt('#doc-viewer-body'), 'Study', 'naming the room with no as-found photograph');
      await p.waitForTimeout(800);
      eq(await prints(), before, '⚠ nothing printed by opening it');
      ok(await vis('#doc-viewer-print'), 'Print / Save PDF is offered');
    });

    // ── B ───────────────────────────────────────────────────────────────────
    await section('B. Print / Save PDF prints that page; the viewer comes back after the dialog; Close takes it away', async () => {
      const before = await prints();
      await press('#doc-viewer-print', 'Print / Save PDF');
      for (let i = 0; i < 20 && (await prints()) === before; i++) await p.waitForTimeout(150);
      eq((await prints()) - before, 1, 'the dialog opened once');
      const pr = await lastPrint();
      has(pr.html, 'Living Room', '⚠⚠ with the As-Found Record');
      ok(await until(viewerOpen), '⚠⚠ the viewer is back once the dialog closes');
      has(await txt('#doc-viewer-body'), 'Living Room', 'still holding the page');
      await press('#doc-viewer-modal button[onclick="closeDocViewer()"]', 'Close');
      ok(!(await viewerOpen()), 'Close takes it away');
      ok(await vis('#inv-workbar'), 'and the desk is under it');
    });

    // ── C ───────────────────────────────────────────────────────────────────
    await section('C. the Appraisal Worklist and the Court Inventory open the same way', async () => {
      for (const [f, label, words] of [['printAppraisalWorklist', 'Appraisal Worklist', 'Harbor painting'], ['printCourtInventory', 'Court Inventory', 'Mahogany sideboard']]) {
        await more();
        const before = await prints();
        await press('#inv-more button[onclick="' + f + '(' + EST + ')"]', label);
        ok(await viewerOpen(), label + ': the viewer is on screen');
        eq(await txt('#doc-viewer-title'), label, label + ': titled');
        has(await txt('#doc-viewer-body'), words, label + ': the page is there');
        await p.waitForTimeout(500);
        eq(await prints(), before, label + ': nothing printed by opening it');
        await press('#doc-viewer-modal button[onclick="closeDocViewer()"]', 'Close');
      }
    });

    // ── D ───────────────────────────────────────────────────────────────────
    await section('D. the work bar’s Approval Request still prints at once (not asked)', async () => {
      const before = await prints();
      await press('#inv-workbar button[onclick="printApprovalRequest(' + EST + ')"]', 'Approval Request');
      for (let i = 0; i < 20 && (await prints()) === before; i++) await p.waitForTimeout(150);
      eq((await prints()) - before, 1, 'printed at once');
      ok(!(await viewerOpen()), 'no viewer');
    });

    // ── E ───────────────────────────────────────────────────────────────────
    await section('E. the viewer on a phone: no horizontal overflow; zero page errors', async () => {
      await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(500);
      await toDesk(EST);
      await p.evaluate((id) => printAsFoundRecord(id), EST);
      ok(await viewerOpen(), 'fixture: the viewer is open');
      ok((await overflow()) <= 0, 'no horizontal overflow at 390 (' + (await overflow()) + ')');
      await press('#doc-viewer-modal button[onclick="closeDocViewer()"]', 'Close');
      eq(errs, [], 'zero page errors');
    });

    await b.close();
    console.log('\nstep111: ' + pass + ' passed, ' + fail + ' failed');
    process.exit(fail ? 1 : 0);
  } catch (e) {
    console.log('step111 crashed: ' + (e && e.stack || e));
    if (b) await b.close().catch(() => {});
    process.exit(1);
  }
})();
