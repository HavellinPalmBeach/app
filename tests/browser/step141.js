// Step 141 — Papers found in the house (2026-11-06; Anthony approved, off the estate reference and a Florida probate
// inventory report). Exhibit A promised that deeds, titles and financial records go to the representative and counsel
// against a signed receipt; Found on site recorded only a will or cash, so nothing kept that promise.
//
// Drives the REAL page through its own controls, on step 57's routed Apps Script and seeded trust estate:
//   A. The Found on site card offers Record papers found; the dialog shows the papers fields (the will's and the cash
//      fields hidden), counsel by default as the holder; refused with nothing listed; recorded with three lines, one blank.
//   B. The card's line is red (held by Havellin, today, to counsel); the desk's Urgent strip carries it, red, above the band.
//   C. Record the hand-over (counsel and today by default); Print Receipt for Papers Found opens in the viewer, each paper
//      numbered, the statement, a signature line; File signed receipt through the real picker: the line goes green and
//      leaves the strip.
//   D. The In the house box now points at Found on site for the papers. Overflow at 390 with the dialog open; no page errors.
//
//   NODE_PATH=/opt/node22/lib/node_modules node tests/browser/step141.js [/abs/path/to/havellin.html]
//   NODE_PATH=/opt/node22/lib/node_modules node tests/browser/step57.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');

const SYNC = 'https://script.google.com/macros/s/STEP141/exec';
const STORE = { jobs: [], estimates: {} };
const UPLOADS = [], SUBFOLDER_ASKS = [];
// A calendar date N days on, worked out here (never by the code under test), printed the way fmtDate2 prints it.
const plusDays = (ymd, n) => { const [y, m, d] = ymd.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10); };
const pretty = (ymd) => { const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }); };

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
        if (body.type === 'saveAllEstimates') { Object.assign(STORE.estimates, body.payload || {}); return json({ ok: true }); }
        if (body.action === 'getSubfolders') { SUBFOLDER_ASKS.push(body.folderId);
          return json({ ok: true, subfolders: { 'Signed Records': { id: 'SIGNED-' + body.folderId }, 'Estate Inventory': { id: 'INV-' + body.folderId } } }); }
        if (body.action === 'uploadFile') {
          UPLOADS.push({ folderId: body.folderId, filename: body.filename, kind: String(body.dataUrl || '').slice(0, 30) });
          return json({ ok: true, fileUrl: 'https://drive.google.com/file/d/sr' + UPLOADS.length + '/view', fileId: 'sr' + UPLOADS.length });
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
        case 'loadMedia': return json({ ok: true, media: {} });
        case 'version': return json({ ok: false, error: 'Unknown action' });
        default: return json({ ok: false, error: 'not in this test: ' + action });
      }
    });

    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    p.on('dialog', async (d) => { await d.accept(); });
    await p.goto(APP); await p.waitForTimeout(1800);
    // window.print is where _printDocument hands off: read the print target at that moment.
    const hookPrint = () => p.evaluate(() => { window.__prints = []; window.print = function () {
      const pt = document.getElementById('print-target'); window.__prints.push({ html: pt ? pt.innerHTML : '', title: document.title }); }; });
    await hookPrint();

    const section = async (name, body) => {
      console.log('\n## ' + name);
      try { await body(); } catch (e) { fail++; console.log('  ✗ ' + name + ' threw: ' + String(e && e.message || e).split('\n')[0]); }
    };
    const vis = (sel) => p.locator(sel).first().isVisible().catch(() => false);
    const press = async (sel, what) => {
      const n = await p.locator(sel).count();
      const v = n === 1 && await vis(sel);
      ok(v, (what || sel) + ' — one control, on screen (' + n + ')');
      if (v) { await p.click(sel, { timeout: 5000 }).catch((e) => ok(false, (what || sel) + ' — ' + e.message.split('\n')[0])); await p.waitForTimeout(450); }
      return v;
    };
    const type = async (sel, value, what) => {
      const v = await vis(sel);
      ok(v, (what || sel) + ' — on screen to type into');
      if (v) { await p.fill(sel, value, { timeout: 5000 }).catch((e) => ok(false, (what || sel) + ' — ' + e.message.split('\n')[0])); await p.waitForTimeout(120); }
    };
    const val = (sel) => p.evaluate((s) => { const e = document.querySelector(s); return e ? e.value : null; }, sel);
    const txt = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }, sel);
    // Restated 2026-11-02: every card's paper opens on screen first. A Found on site receipt opens in the document viewer,
    // titled by the form with the client line under it, and nothing prints until its Print / Save PDF is pressed; that press
    // prints the page (what __prints captures), the viewer comes back once the dialog closes, and Close takes it away so the
    // Job Plan under it can be pressed again.
    const viewerOpen = () => p.evaluate(() => { const o = document.getElementById('doc-viewer-modal'); return !!o && o.style.display === 'flex'; });
    const printCount = () => p.evaluate(() => (window.__prints || []).length);
    const viewThenPrint = async (title, before) => {
      ok(await until(viewerOpen, 3000), title + ' opens in the document viewer');
      eq(await txt('#doc-viewer-title'), title, 'the viewer is titled by the paper');
      eq(await txt('#doc-viewer-sub'), 'Estate of Harold Adler · 100 Ocean Blvd', 'with the client line under it');
      eq(await printCount(), before, 'nothing printed before Print / Save PDF is pressed');
      await press('#doc-viewer-print', 'Print / Save PDF, in the viewer');
    };
    const closeViewer = async (before) => {
      await p.waitForSelector('#doc-viewer-modal', { state: 'visible', timeout: 4000 }).catch(() => ok(false, 'the viewer comes back after the print dialog'));
      eq(await printCount(), before + 1, 'Print / Save PDF printed the page once');
      await press('#doc-viewer-modal button[onclick="closeDocViewer()"]', 'Close the viewer');
      ok(!(await viewerOpen()), 'Close takes the viewer away');
    };
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const job = (id) => p.evaluate((id) => JSON.parse(JSON.stringify(jobs.find((j) => j.id === id) || null)), id);
    const settle = async () => {
      for (let i = 0; i < 60; i++) {
        await p.waitForTimeout(150);
        const idle = await p.evaluate(() => !_outboxSending && !_flushing && !_outboxTimer && !Object.keys(_outbox).length && !Object.keys(_pendingWrites).length);
        if (idle) return true;
      }
      return false;
    };
    const until = async (f, ms) => { for (let i = 0; i < (ms || 8000) / 150; i++) { if (await f()) return true; await p.waitForTimeout(150); } return false; };
    // The derived lines on the Found on site card: label, state, detail.
    const findLines = (id) => p.evaluate((id) => Array.from(document.querySelectorAll('#plan-derived-finds-' + id + ' .pl-line')).map((e) => ({
      lbl: (e.querySelector('.pl-lbl') || {}).textContent || '', ok: e.classList.contains('pl-ok'), red: e.classList.contains('pl-red'),
      det: ((e.querySelector('.pl-det') || {}).textContent || '').replace(/\s+/g, ' ') })), id);
    // Open a client the way a person does: the Clients nav, the row, then the Job Plan nav.
    const openPlan = async (id) => {
      await p.evaluate(() => { const nb = document.querySelector('.nb[onclick*="\'jobs\'"]'); if (nb) nb.click(); });
      await p.waitForTimeout(300);
      const row = '#panel-jobs tr[onclick="openClientDashboard(' + id + ')"]';
      const n = await p.locator(row).count();
      ok(n >= 1, 'the client is on the client list (' + n + ')');
      if (n) { await p.locator(row).first().click(); await p.waitForTimeout(700); }
      await p.click('.nb:has-text("Job Plan")'); await p.waitForTimeout(900);
      eq(await val('#plan-job'), String(id), 'the Job Plan opens on that client');
    };
    const seed = async (j, est) => {
      await p.evaluate(([j, est]) => {
        jobs = jobs.filter((x) => x.id !== j.id);
        jobs.unshift(j);
        estimateStore[j.id] = { approved: true, approvedBy: 'Anthony Graziano', approvedAt: 'September 20, 2026', estimate: est, savedAt: Date.now() };
        try { localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore)); } catch (x) {}
        postSyncBadge({ type: 'saveAllEstimates', payload: estimateStore }, 'ok', 'fail');
        saveJobs(); renderJobs();
      }, [j, est]);
      await settle();
    };
    const EST = (id) => ({ jobId: id, svc: 'cleanout', havellinTotal: 24000, fixedPrice: false, totTC: 40, totPS: 60, days: 5,
      rooms: [{ idx: 0, name: 'Study', st: 'in', vol: 3, cplx: 3 }, { idx: 1, name: 'Primary Suite', st: 'in', vol: 3, cplx: 3 }],
      collections: [], vendors: [], prepItems: [] });
    const TRUST = (id, extra) => Object.assign({ id: id, hvlId: 'HVL-2610-' + id, name: 'Estate of Harold Adler', fname: 'Harold', lname: 'Adler',
      svc: 'cleanout', matterType: 'trust', docTier: 'values', addr: '100 Ocean Blvd', city: 'Palm Beach', zip: '33480',
      deathDate: '2026-07-14', executor: 'Ruth Adler', executorFname: 'Ruth', executorLname: 'Adler', executorRole: 'Trustee',
      executorEmail: 'ruth@example.com', executorPhone: '(561) 555-0101', executorAuth: 'pending',
      probateAttyName: 'Richard Comiter', probateAttyFirm: 'Comiter Law', probateAttyEmail: 'rc@example.com',
      tc: 'Ashley Jerome', status: 'active', won: true, wonAt: '2026-09-29', approved: true, created: '2026-09-20',
      start: '2026-10-05', walkthrough: '2026-09-28', activatedOn: '2026-10-01', depositReceived: true, agrSigned: true,
      driveFolder: 'https://drive.google.com/drive/folders/ROOT' + id,
      crew: { tc: { name: 'Ashley Jerome', locked: true }, tc2: { name: '', locked: false }, ps: [{ name: 'Anthony Graziano Jr', locked: true }], confirmed: true },
      payments: [{ id: 1, uid: 'dep' + id, stage: 'deposit', amount: 12000, receivedOn: '2026-09-30', method: 'wire', clearedOn: '2026-09-30' }] }, extra || {});
    const TODAY = await p.evaluate(() => _todayStr());

    // ── A ────────────────────────────────────────────────────────────────────────────────────────────
    await section('A. Record papers found: the dialog, refused with nothing listed, then recorded', async () => {
      await seed(TRUST(14101, { gate706: 'no' }), EST(14101));
      await openPlan(14101);
      ok(await vis('#plan-finds-14101'), 'the Found on site card is on the In the house stage');
      has(await txt('#plan-finds-14101 .fos-hd'), 'an original will, cash, or the estate’s papers', 'its heading names papers');
      await press('#plan-finds-14101 button:has-text("Record papers found")', 'Record papers found');
      eq(await txt('#fos-title'), 'Record papers found', 'titled for the act');
      ok(await vis('#fos-papers'), 'the list box is on screen');
      ok(!(await vis('#fos-desc')) && !(await vis('#fos-amount')), 'the will\'s and the cash fields are not');
      eq(await val('#fos-handed-to'), 'Richard Comiter', 'counsel by default as the holder');
      eq(await val('#fos-date'), TODAY, 'found today by default');
      await press('#fos-save-btn', 'Record, with nothing listed');
      has(await txt('#fos-fb'), 'who found them and what was found, one per line', 'refused, naming what is missing');
      await type('#fos-where', 'study, filing cabinet', 'Where in the house');
      await type('#fos-p-found-by', 'Anthony Graziano Jr', 'Found by');
      await type('#fos-papers', 'Deed to 100 Ocean Blvd\n\nChase statements, 2025\nLedger hardware wallet <usb>', 'What was found');
      await press('#fos-save-btn', 'Record');
      ok(!(await vis('#fos-modal .modal-box')), 'the dialog closes');
      const j = await job(14101);
      const f = (j.siteFinds || []).find((x) => x.kind === 'papers');
      eq(f && f.items, 'Deed to 100 Ocean Blvd\nChase statements, 2025\nLedger hardware wallet <usb>', 'recorded one per line, the blank line dropped');
      has(await txt('#plan-finds-14101'), 'Ledger hardware wallet <usb>', 'the card lists each as text');
    });

    // ── B ────────────────────────────────────────────────────────────────────────────────────────────
    await section('B. red on the card and on the desk\'s Urgent strip while Havellin holds them', async () => {
      const L = await findLines(14101);
      eq(L.map((l) => [l.lbl, l.red]), [['Papers held by Havellin', true]], '⚠ one line, red');
      has(L[0] && L[0].det, '3 papers and items found', 'counting what was listed');
      has(L[0] && L[0].det, 'hand them to Richard Comiter today, against a signed receipt', 'saying to whom, today');
      await p.click('.nb:has-text("Job Admin")'); await p.waitForTimeout(700);
      const desk = await p.evaluate(() => { const first = document.querySelector('#desk-now-14101 .pl-line');
        return first ? { lbl: first.textContent.replace(/\s+/g, ' '), red: first.classList.contains('pl-red'), shown: first.checkVisibility() } : null; });
      ok(!!desk && desk.shown && desk.red, '⚠ the desk\'s Urgent strip carries it, red, on screen');
      has(desk && desk.lbl, 'Papers held by Havellin', 'the same line');
    });

    // ── C ────────────────────────────────────────────────────────────────────────────────────────────
    await section('C. the hand-over, the receipt in the viewer, the signed copy filed: green and off the strip', async () => {
      await openPlan(14101);
      await press('#plan-finds-14101 button:has-text("Record the hand-over")', 'Record the hand-over');
      eq(await val('#fos-handed-to'), 'Richard Comiter', 'counsel by default');
      eq(await val('#fos-handed-on'), TODAY, 'today by default');
      await press('#fos-save-btn', 'Record the hand-over');
      let L = await findLines(14101);
      eq(L.map((l) => [l.lbl, l.ok]), [['Papers handed over against a signed receipt', false]], 'open until the signed receipt is filed');
      await hookPrint();
      await press('#plan-finds-14101 button:has-text("Print Receipt for Papers Found")', 'Print Receipt for Papers Found');
      ok(await until(viewerOpen, 3000), 'it opens in the document viewer');
      const body = await p.evaluate(() => { const v = document.querySelector('#doc-viewer-modal .doc-viewer-body'); return v ? v.textContent.replace(/\s+/g, ' ') : ''; });
      has(body, '1. Deed to 100 Ocean Blvd', 'each paper numbered');
      has(body, '3. Ledger hardware wallet <usb>', 'as text');
      has(body, 'has not used any password, key or device among them', 'with its statement');
      has(body, 'Received by:', 'and the holder\'s signature line');
      await press('#doc-viewer-modal button[onclick="closeDocViewer()"]', 'Close the viewer');
      const input = '#plan-finds-14101 input[type="file"]';
      eq(await p.locator(input).count(), 1, 'one File signed receipt picker on the card');
      await p.setInputFiles(input, { name: 'papers-receipt.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 receipt') });
      ok(await until(async () => (await findLines(14101)).every((l) => l.ok), 6000), '⚠ the line goes green once the receipt is filed');
      ok(UPLOADS.some((u) => u.folderId === 'SIGNED-ROOT14101'), 'filed to the client\'s Signed Records folder');
      await p.click('.nb:has-text("Job Admin")'); await p.waitForTimeout(700);
      lacks(await txt('#desk-now-14101'), 'Papers', 'and it leaves the Urgent strip');
    });

    // ── D ────────────────────────────────────────────────────────────────────────────────────────────
    await section('D. the In the house box points at Found on site; overflow at 390; no page errors', async () => {
      await openPlan(14101);
      has(await txt('#stage-rooms'), 'the papers, and an original will, are recorded under Found on site, below', 'the papers box points at Found on site');
      await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(300);
      await press('#plan-finds-14101 button:has-text("Record papers found")', 'Record papers found, on a phone');
      ok(await p.evaluate(() => document.getElementById('fos-save-btn').checkVisibility()), 'the Record button is on screen at 390');
      ok(await overflow() <= 0, 'the dialog fits at 390 (' + await overflow() + ')');
      await press('#fos-modal button:has-text("Cancel")', 'Cancel');
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
