// Step 105 — The appraiser is the source from the moment of linking, on every job; the figure typed is the appraisal; File the
// report on the appraiser's row (Q93, 2026-10-24).
//
// Anthony, asked "On a living job, how should the app know an appraiser's figure has come back?": *"i mean, if we send an item
// to an appraiser, listed in the vendor directory, shouldn't that person be on the record for all jobs, living & dead, as the
// source of that value? when their appraisal comes back, they are already listed as the source and we just input the values
// and save the formal apraisal to the drive?"*
//
// Drives the REAL page with two active jobs, each with a painting waiting on an appraisal and an empty roster: a living Home
// Transition (the painting ticked ⚑, the living rule) and a probate estate (the painting routes on its category). On each, Job
// Admin & Inv through its own nav button and the client through its picker: the Values & appraisals bar open by itself and its
// add form with it; the appraiser picked from the Vendor Directory and saved; the painting linked from the guardrail's own
// picker; its row and record reading "Appraisal · <appraiser> · pending"; the report's figure typed on the row's Value box
// (Tab to leave it), the row redrawn as the appraisal ("Appraisal · <appraiser>", no pending), the item off the guardrail and
// the bar's count, the bar's line and the appraiser's row naming the report not filed; File the report pressed on the
// appraiser's row with a PDF (the upload stubbed, as step 87's), landing in Estate Inventory and listed with its link and a
// Void, the flag gone. On the estate the Court Inventory's basis names the appraiser. At 1440 and 390 px: no horizontal
// overflow; zero page errors throughout.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step105.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');
const SYNC = 'https://script.google.com/macros/s/STEP105/exec';
const LIVE = 10501, EST = 10502;
const LABEL = 'Marie Wayland · Wayland Fine Art';

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    await ctx.route(SYNC + '**', (r) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ ok: true }) }));
    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    const said = []; p.on('dialog', async (d) => { said.push(d.message()); await d.accept(); });
    await p.goto(APP); await p.waitForTimeout(1600);
    await p.evaluate((u) => {
      SHEETS_SYNC_URL = u;
      try { localStorage.setItem('hav_device_user', 'Ashley Jerome'); } catch (e) {}
      // The Drive boundary, as step 87 stubs it: the folder asked for, and what was uploaded into it.
      window.__resolves = []; window.__uploads = [];
      resolveSubfolderId = function (job, name, cb) { window.__resolves.push(name); cb('FOLDER-' + name); };
      uploadToDrive = function (folderId, filename, dataUrl, cb) {
        window.__uploads.push({ folderId, filename, pdf: /^data:application\/pdf/.test(dataUrl) });
        cb(true, 'https://drive.google.com/file/d/RPT' + window.__uploads.length + '/view', 'RPT' + window.__uploads.length);
      };
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
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const text = (sel) => p.evaluate((sel) => { const el = document.querySelector(sel); return el ? el.textContent.replace(/\s+/g, ' ').trim() : null; }, sel);

    // ── Seed: a living Home Transition and a probate estate, each with a painting waiting on an appraisal, no appraisers ──
    await p.evaluate(([LIVE, EST]) => {
      const T = Date.now() - 5 * 86400000;
      vendorDirectory = [{ _row: 2, vendor_name: 'Wayland Fine Art', category: 'Art Appraiser', contact_first: 'Marie', contact_last: 'Wayland', status: 'Active' }];
      const est = (id, svc) => ({ approved: true, submitted: true, approvedBy: 'Anthony Graziano', savedAt: T,
        estimate: { jobId: id, svc, havellinTotal: 30000, fixedPrice: true, fixedAmount: 30000, fixedLines: true, totTC: 80, totPS: 120, tcRate: 150, psRate: 100, days: 6,
          vendors: [], prepItems: [], pkgCost: 0, rooms: [{ idx: 0, name: 'Study', st: 'in', vol: 3, cplx: 3 }] } });
      const base = (id, name, svc, extra) => Object.assign({ id, hvlId: 'HVL-2610-A' + id, name, svc, addr: id + ' Via Bellaria', city: 'Palm Beach', zip: '33480',
        status: 'active', won: true, wonAt: '2026-09-25', approved: true, tc: 'Ashley Jerome', created: '2026-09-20', start: '2026-10-06', activatedOn: '2026-10-05',
        agrApproved: true, agrSent: true, agrSigned: true, sqft: 3800, driveFolder: 'https://drive.google.com/drive/folders/R' + id, at: {}, appraisers: [],
        docState: { agreement: { sentAt: '2026-09-26T14:00:00Z', sig: { signedBy: name, signedAt: '2026-09-28' } }, 'invoice:deposit': { sentAt: '2026-09-29T14:00:00Z' } },
        payments: [{ uid: 'd' + id, stage: 'deposit', amount: 15000, receivedOn: '2026-10-01', method: 'wire', clearedOn: '2026-10-01' }] }, extra || {});
      const painting = (id, extra) => Object.assign({ stableId: 'p' + id, itemNo: 1, label: 'inventory', roomIdx: 0, status: 'uploaded', category: 'Art & Décor',
        objectName: 'Oil on canvas, harbour scene', namedBy: 'desk', disposition: 'Keep', fmv: '', ts: T, updatedAt: T,
        filename: 'HVL_' + id + '_INV_p.jpg', driveFileId: 'f-' + id, driveFileUrl: 'https://drive.google.com/file/d/f-' + id + '/view' }, extra || {});
      jobs.unshift(base(LIVE, 'Margaret Ellis', 'downsizing_move', { email: 'meg@ellis.example', docTier: 'contents', destAddr: '200 Royal Palm Way', destCity: 'Palm Beach', destSqft: 1800 }));
      estimateStore[LIVE] = est(LIVE, 'downsizing_move');
      jobPlanStore[LIVE] = { rooms: { 0: { status: 'locked' } }, tasks: {}, at: {} };
      _photoRefs[LIVE] = [painting(LIVE, { needsAppr: true })]; savePhotoRefs(LIVE);
      jobs.unshift(base(EST, 'Estate of Harold Pemberton', 'probate', { matterType: 'probate', executor: 'Thomas Pemberton', executorRole: 'Personal Representative',
        executorEmail: 'tom@example.com', deathDate: '2026-04-02', executorAuth: 'received', probateAttyName: 'Ann Lowe', probateAttyEmail: 'ann@lowe.law',
        docTier: 'values', gate706: 'yes' }));
      estimateStore[EST] = est(EST, 'probate');
      jobPlanStore[EST] = { rooms: { 0: { status: 'locked' } }, tasks: {}, at: {} };
      _photoRefs[EST] = [painting(EST)]; savePhotoRefs(EST);
      _invCloudSeen[LIVE] = true; _invCloudSeen[EST] = true;
      saveJobs(); localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore));
      _logsState = 'ready';
    }, [LIVE, EST]);

    const toDesk = async (id) => {
      await p.click('.nb[onclick*="\'inventory\'"]'); await p.waitForTimeout(800);
      const cur = String(await p.evaluate(() => (document.getElementById('inv-job') || {}).value));
      if (cur !== String(id)) { await p.selectOption('#inv-job', String(id)); await p.waitForTimeout(1000); }
    };
    const barOpen = (id) => p.evaluate((id) => { const b = document.getElementById('desk-body-values-' + id); return !!b && b.style.display !== 'none'; }, id);
    const barLine = (id) => p.evaluate((id) => Array.from(document.querySelectorAll('#desk-stat-values-' + id + ' span'))
      .map((s) => [s.textContent.trim(), s.className.replace('desk-st-', '')]), id);
    const line = (id) => p.evaluate((id) => jobs.find((j) => j.id === id) && _photoRefs[id][0], id);

    const run = async (id, what) => {
      // ── A ──
      await section(what + ' A. the Values & appraisals bar opens by itself; the appraiser comes from the Vendor Directory', async () => {
        await toDesk(id);
        eq(await barOpen(id), true, 'an item waits with no appraiser linked: the bar is open');
        ok(await vis('#appr-form-' + id), 'the add form open by itself (the roster is empty and an item waits)');
        const pick = '#appr-form-' + id + ' select';
        ok(await vis(pick), 'the Vendor Directory picker on the form');
        await p.selectOption(pick, { index: 1 }); await p.waitForTimeout(300);
        eq(await p.inputValue('#appr-name'), 'Marie Wayland', 'the contact filled from the directory');
        await press('#appr-form-' + id + ' button:has-text("Save appraiser")', 'Save appraiser');
        const roster = await text('#desk-body-values-' + id + ' .vtbl');
        has(roster, 'Marie Wayland', 'the appraiser is on the roster');
        has(roster, 'File the report', '⚠⚠ their row offers File the report');
        lacks(roster, 'report not filed', 'nothing owed yet');
      });
      // ── B ──
      let apprId = null;
      await section(what + ' B. linked from the guardrail\'s picker: the row and the record read "Appraisal · <appraiser> · pending"', async () => {
        apprId = await p.evaluate((id) => (jobs.find((j) => j.id === id).appraisers[0] || {}).id, id);
        ok(!!apprId, 'fixture: the appraiser has an id');
        await p.selectOption('#inv-guardrail select', String(apprId)); await p.waitForTimeout(800);
        const r = await line(id);
        eq([String(r.apprId), r.valSource || ''], [String(apprId), ''], 'linked, and no source written (a figure before the link keeps its own)');
        const row = await text('#inv-row-p' + id);
        has(row, '⚑ Appraisal · ' + LABEL + ' · pending', '⚠⚠ the row: the appraiser is the source, pending');
        has(await text('#inv-guardrail'), 'Appraisal in progress · ' + LABEL + ': when the report comes back, type its figure on the line.', 'the guardrail: in progress, naming them');
        has((await barLine(id)).map((x) => x[0]).join(' | '), '1 needs an appraisal, each linked', 'the bar\'s line: one waiting, linked');
        await press('#inv-row-p' + id + ' button[title="Open the full record"]', 'the row\'s ▾');
        has(await text('#inv-row-p' + id + ' .inv-panel-appr'), 'Valuation source Appraisal · ' + LABEL + ' · pending', 'and its record says so');
      });
      // ── C ──
      await section(what + ' C. the report\'s figure typed on the row: the appraisal; off the guardrail and the bar\'s count; report not filed', async () => {
        const box = '#inv-row-p' + id + ' input[inputmode="decimal"]';
        ok(await vis(box), 'the row\'s Value box');
        await p.fill(box, '18500'); await p.press(box, 'Tab'); await p.waitForTimeout(800);
        const r = await line(id);
        eq([r.fmv, r.valSource, r.valuedBy], [18500, 'Appraisal', 'appraiser'], '⚠⚠ recorded as the appraisal: source Appraisal, valued by the appraiser');
        eq(r.valDate, id === EST ? '2026-04-02' : await p.evaluate(() => _todayStr()), 'the valuation date the job\'s rule sets');
        const row = await text('#inv-row-p' + id);
        has(row, 'Appraisal · ' + LABEL, 'the row redrawn as the appraisal');
        lacks(row, 'pending', '…no longer pending');
        has(row, 'report not filed', 'and naming the report not filed');
        eq(await text('#inv-guardrail'), '', '⚠⚠ off the guardrail: no Waive needed');
        const bl = await barLine(id);
        has(bl.map((x) => x[0]).join(' | '), '✓ nothing needs an appraisal', 'the bar\'s count with it');
        eq(bl.filter((x) => /report not filed/.test(x[0])), [['report not filed: Marie Wayland (1 item)', 'amber']], 'the bar\'s line names the report owed, amber');
        has(await text('#appr-rpt-' + id + '-' + apprId), 'report not filed: #1 Oil on canvas, harbour scene', 'the appraiser\'s row names the item owed its report');
      });
      // ── D ──
      await section(what + ' D. File the report on the appraiser\'s row: into Estate Inventory, listed with its link and a Void', async () => {
        const before = await p.evaluate(() => window.__uploads.length);
        const input = '#appr-rpt-' + id + '-' + apprId + ' input[type=file]';
        eq(await p.locator(input).count(), 1, 'the row\'s file control');
        await p.setInputFiles(input, { name: 'Wayland report.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 report ' + 'x'.repeat(80)) });
        await p.waitForTimeout(1200);
        const up = await p.evaluate((n) => window.__uploads.slice(n), before);
        eq(up.length, 1, 'one upload');
        eq(await p.evaluate(() => window.__resolves[window.__resolves.length - 1]), 'Estate Inventory', '⚠⚠ into the client\'s Estate Inventory folder, with the collections\' appraisals');
        ok(up[0] && up[0].pdf && /Appraisal report - Marie Wayland - /.test(up[0].filename), 'the PDF, named for the appraiser: ' + (up[0] || {}).filename);
        const rec = await p.evaluate((id) => (jobs.find((j) => j.id === id).signedRecords || []).filter((r) => r.kind === 'appraisal_report').map((r) => [r.ref, r.stableIds]), id);
        eq(rec, [[String(apprId), ['p' + id]]], 'recorded against the appraiser, covering the linked item');
        await toDesk(id);
        if (!(await barOpen(id))) await press('#desk-hd-values-' + id, 'the Values & appraisals bar\'s header');
        const cell = '#appr-rpt-' + id + '-' + apprId;
        ok(await vis(cell + ' a[href="https://drive.google.com/file/d/RPT' + (before + 1) + '/view"]'), '⚠⚠ listed on the row with its link');
        ok(await vis(cell + ' button:has-text("Void")'), 'with a Void');
        ok(await vis(cell + ' label:has-text("File the report")'), 'File the report still offered (more than one may be filed)');
        lacks(await text(cell), 'report not filed', 'the flag gone');
        lacks((await barLine(id)).map((x) => x[0]).join(' | '), 'report not filed', 'from the bar\'s line too');
        lacks(await text('#inv-row-p' + id), 'report not filed', 'and from the item\'s row');
      });
    };

    await run(LIVE, 'Living Home Transition ·');
    await run(EST, 'Probate estate ·');

    // ── E ──
    await section('E. the estate\'s Court Inventory names the appraiser in its Basis column', async () => {
      const html = await p.evaluate((id) => { const r = printCourtInventory(id, { asHtml: true }); return (r && r.html) || ''; }, EST);
      has(html.replace(/<[^>]+>/g, ' '), 'appraisal · ' + LABEL, 'the basis: appraisal · <appraiser>');
    });

    // ── F ──
    await section('F. both widths: no horizontal overflow with the roster open; zero page errors', async () => {
      for (const id of [LIVE, EST]) {
        await toDesk(id);
        if (!(await barOpen(id))) await press('#desk-hd-values-' + id, 'the Values & appraisals bar\'s header');
        for (const w of [1440, 390]) {
          await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(500);
          eq(await overflow(), 0, (id === LIVE ? 'living' : 'estate') + ' desk at ' + w + ' px: no horizontal overflow');
        }
        await p.setViewportSize({ width: 1440, height: 1000 }); await p.waitForTimeout(300);
      }
      eq(errs, [], 'zero page errors');
    });
  } catch (e) {
    fail++; console.log('  ✗ step105 threw: ' + (e && e.stack || e));
  } finally {
    if (b) await b.close();
  }
  console.log('\nstep105: ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
