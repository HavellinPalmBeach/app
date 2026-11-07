// Step 142 — A safe or locked container on Found on site, and Locks changed on Keys & access (2026-11-07; Anthony approved, off
// the estate reference: "the safes and lock containers, photo record of them closed plus a locks changed entry").
//
// Drives the REAL page through its own controls, on step 141's routed Apps Script and seeded trust estate:
//   A. Record a safe or locked container: the dialog shows the safe's fields only; refused with nothing entered; recorded; the
//      card's line is amber (never red) and says to photograph it closed; File photo: closed through the real picker.
//   B. Record the opening: refused with nobody present; recorded with the trustee present and what was inside; File photo: open;
//      the line goes green; Print Safe Opening Record opens in the viewer listing what was inside and who was present.
//   C. Locks changed on Keys & access: refused with nothing entered; recorded; the entry is on the card with its line naming the
//      locksmith's receipt owed; File the locksmith's receipt through the real picker: the line goes green.
//   D. Overflow at 390 with each dialog open; no page errors.
//
//   NODE_PATH=/opt/node22/lib/node_modules node tests/browser/step142.js [/abs/path/to/havellin.html]
//   NODE_PATH=/opt/node22/lib/node_modules node tests/browser/step57.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');

const SYNC = 'https://script.google.com/macros/s/STEP142/exec';
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

    // The derived lines on the Keys & access card.
    const accLines = (id) => p.evaluate((id) => Array.from(document.querySelectorAll('#plan-derived-access-' + id + ' .pl-line')).map((e) => ({
      lbl: (e.querySelector('.pl-lbl') || {}).textContent || '', ok: e.classList.contains('pl-ok'), red: e.classList.contains('pl-red'),
      det: ((e.querySelector('.pl-det') || {}).textContent || '').replace(/\s+/g, ' ') })), id);

    // ── A ────────────────────────────────────────────────────────────────────────────────────────────
    await section('A. Record a safe or locked container, and file the photograph of it closed', async () => {
      await seed(TRUST(14201, { gate706: 'no' }), EST(14201));
      await openPlan(14201);
      has(await txt('#plan-finds-14201 .fos-hd'), 'or a safe', 'the card\'s heading names a safe');
      await press('#plan-finds-14201 button:has-text("Record a safe or locked container")', 'Record a safe or locked container');
      eq(await txt('#fos-title'), 'Record a safe or locked container', 'titled for the act');
      ok(await vis('#fos-s-desc'), 'its description box is on screen');
      ok(!(await vis('#fos-desc')) && !(await vis('#fos-amount')) && !(await vis('#fos-papers')) && !(await vis('#fos-handed-on')), 'the will\'s, cash\'s, papers\' and hand-over fields are not');
      await press('#fos-save-btn', 'Record, with nothing entered');
      has(await txt('#fos-fb'), 'who found it and what it is and how it is locked', 'refused, naming what is missing');
      await type('#fos-where', 'primary closet', 'Where in the house');
      await type('#fos-s-found-by', 'Anthony Graziano Jr', 'Found by');
      await type('#fos-s-desc', 'Wall safe, combination lock', 'What it is');
      await press('#fos-save-btn', 'Record');
      ok(!(await vis('#fos-modal .modal-box')), 'the dialog closes');
      let L = (await findLines(14201)).filter((l) => /Safe/.test(l.lbl));
      eq(L.map((l) => [l.lbl, l.ok, l.red]), [['Safe or locked container not yet opened', false, false]], '⚠ one line, amber, never red');
      has(L[0] && L[0].det, 'photograph it closed; open it only with the representative or counsel present', 'saying what to do');
      const input = '#plan-finds-14201 .fos-find input[type="file"]';
      eq(await p.locator(input).count(), 1, 'one picker on the row: the photograph of it closed');
      await p.setInputFiles(input, { name: 'safe-closed.jpg', mimeType: 'image/jpeg', buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16]) });
      ok(await until(async () => !/photograph it closed/.test(((await findLines(14201)).find((l) => /Safe/.test(l.lbl)) || {}).det || ''), 6000), 'the photograph of it closed is filed');
      ok(UPLOADS.some((u) => u.folderId === 'SIGNED-ROOT14201'), 'to the client\'s Signed Records folder');
    });

    // ── B ────────────────────────────────────────────────────────────────────────────────────────────
    await section('B. Record the opening with the trustee present, file the photograph of it open, print the record', async () => {
      await openPlan(14201);
      await press('#plan-finds-14201 button:has-text("Record the opening")', 'Record the opening');
      eq(await txt('#fos-title'), 'Record the opening', 'titled for the act');
      eq(await val('#fos-open-on'), TODAY, 'opened today by default');
      eq(await val('#fos-present'), '', 'nobody is put down as present for the person');
      await type('#fos-open-by', 'Pro Lock Co', 'Opened by');
      await press('#fos-save-btn', 'Record the opening, with nobody present');
      has(await txt('#fos-fb'), 'who was present', 'refused, naming who was present');
      await type('#fos-present', 'Ruth Adler; Ashley Jerome', 'Present');
      await type('#fos-contents', 'Deed to 100 Ocean Blvd\nGold coins (12)', 'What was inside');
      await press('#fos-save-btn', 'Record the opening');
      const f = ((await job(14201)).siteFinds || []).find((x) => x.kind === 'safe');
      eq(f && [f.openedBy, f.present, f.contents], ['Pro Lock Co', 'Ruth Adler; Ashley Jerome', 'Deed to 100 Ocean Blvd\nGold coins (12)'], 'recorded as entered');
      let L = (await findLines(14201)).filter((l) => /Safe/.test(l.lbl));
      has(L[0] && L[0].det, 'photograph it open', 'the photograph of it open is owed');
      const input = '#plan-finds-14201 .fos-find input[type="file"]';
      eq(await p.locator(input).count(), 1, 'one picker on the row: the photograph of it open');
      await p.setInputFiles(input, { name: 'safe-open.jpg', mimeType: 'image/jpeg', buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16]) });
      ok(await until(async () => ((await findLines(14201)).find((l) => /Safe/.test(l.lbl)) || {}).ok === true, 6000), '⚠ the line goes green: both photographs filed, the trustee present');
      await hookPrint();
      await press('#plan-finds-14201 button:has-text("Print Safe Opening Record")', 'Print Safe Opening Record');
      ok(await until(viewerOpen, 3000), 'it opens in the document viewer');
      const body = await p.evaluate(() => { const v = document.querySelector('#doc-viewer-modal .doc-viewer-body'); return v ? v.textContent.replace(/\s+/g, ' ') : ''; });
      has(body, '1. Deed to 100 Ocean Blvd', 'listing what was inside');
      has(body, 'Ruth Adler, Ashley Jerome', 'and who was present');
      has(body, 'Witnessed by:', 'with a witness line');
      await press('#doc-viewer-modal button[onclick="closeDocViewer()"]', 'Close the viewer');
    });

    // ── C ────────────────────────────────────────────────────────────────────────────────────────────
    await section('C. Locks changed on Keys & access, and the locksmith\'s receipt filed', async () => {
      await openPlan(14201);
      ok(await vis('#plan-access-14201'), 'the Keys & access card is on the plan');
      await press('#plan-access-14201 button:has-text("Locks changed")', 'Locks changed');
      eq(await txt('#acc-title'), 'Locks changed', 'titled for the act');
      eq(await txt('#acc-from-lbl'), 'Changed by (the locksmith)', 'asking who changed them');
      eq(await txt('#acc-note-lbl'), 'Which locks or doors', 'and which locks');
      ok(!(await vis('#acc-to')) && !(await vis('#acc-rows-wrap')), 'no holder and no item rows');
      await press('#acc-save-btn', 'Record, with nothing entered');
      has(await txt('#acc-fb'), 'who changed them and which locks or doors', 'refused, naming what is missing');
      await type('#acc-from', 'Pro Lock Co', 'Changed by');
      await type('#acc-note', 'Front door and garage side door', 'Which locks');
      await press('#acc-save-btn', 'Record');
      ok(!(await vis('#acc-modal .modal-box')), 'the dialog closes');
      has(await txt('#plan-access-14201 [data-locks]'), 'Front door and garage side door', 'the entry is on the card');
      let L = (await accLines(14201)).filter((l) => l.lbl === 'Locks changed');
      eq(L.map((l) => l.ok), [false], 'its line is open');
      has(L[0] && L[0].det, 'file the locksmith’s receipt', 'naming the receipt owed');
      const input = '#plan-access-14201 [data-locks] input[type="file"]';
      eq(await p.locator(input).count(), 1, 'one picker: the locksmith\'s receipt');
      await p.setInputFiles(input, { name: 'locksmith.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 locksmith') });
      ok(await until(async () => ((await accLines(14201)).find((l) => l.lbl === 'Locks changed') || {}).ok === true, 6000), '⚠ the line goes green once the receipt is filed');
      const ev = ((await job(14201)).accessEvents || []).find((e) => e.kind === 'locks_changed');
      eq(ev && [ev.from, ev.note, ev.itemId], ['Pro Lock Co', 'Front door and garage side door', 'locks'], 'recorded on the access log with no item');
    });

    // ── D ────────────────────────────────────────────────────────────────────────────────────────────
    await section('D. overflow at 390 with each dialog open; no page errors', async () => {
      await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(300);
      await press('#plan-finds-14201 button:has-text("Record a safe or locked container")', 'Record a safe or locked container, on a phone');
      ok(await p.evaluate(() => document.getElementById('fos-save-btn').checkVisibility()), 'the Record button is on screen at 390');
      ok(await overflow() <= 0, 'the dialog fits at 390 (' + await overflow() + ')');
      await press('#fos-modal button:has-text("Cancel")', 'Cancel');
      await press('#plan-access-14201 button:has-text("Locks changed")', 'Locks changed, on a phone');
      ok(await overflow() <= 0, 'the locks dialog fits at 390 (' + await overflow() + ')');
      await press('#acc-modal button:has-text("Cancel")', 'Cancel');
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
