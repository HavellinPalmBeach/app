// Step 121 — No figure the evidence does not support (P7 of the desk audit, 2026-10-27): Appraisal means an appraiser's figure;
// the Form 706 aggregate tells the truth once the valued articles pass $3,000, and every such article is owed the sworn appraisal;
// the §20.2031-6(b) sentence reads the top of Agent Two's ranges and carries the stamp's words; a floor is a floor on the Estate
// Inventory Report (VAL-02, GAP2-02, RT-05, ACC-03, DOC-01, VAL-27).
//
// Drives the REAL page with one probate estate filing a Form 706, on the values tier: Agent Two's $4,800 still life (ranged $3,200
// to $7,500, nobody's look), seven articles of marked artistic or intrinsic value valued by the desk at $8,480 together with an
// unsigned bronze unvalued, two ordinary lines unvalued, and a Mercedes tracked Non-probate. Job Admin & Inv through its own nav
// button and the client through its picker. A: the still life's record, Valuation Source → Appraisal: the dialog names Agent
// Two's estimate; Cancel leaves the line; OK takes the figure off (the row's Total box blank) and records the source; the
// appraiser's figure typed on the row's Total box (Tab to leave it) is the appraisal, read "Appraisal (appraiser not named)".
// B: two lines picked: the selection bar's Set valuation source… offers no Appraisal. C: More ▾ → Appraisal Worklist, in the
// viewer: "already over the $3,000 aggregate whatever the remaining 1 is worth", the articles owed the sworn appraisal named and
// marked in their packets, the class table counting the twelve goblets as twelve. D: the work bar's Estate Inventory PDF: the
// probate estate and the property outside it subtotalled, each a floor while a line in it has no value, the lines named; the
// Court Inventory's floor equals the probate subtotal. E: Show summary & rollups: the desk's notice says an expert appraisal is
// required and names the articles owed it. F: at 1440 and 390 px no horizontal overflow; zero page errors.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step121.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');
const SYNC = 'https://script.google.com/macros/s/STEP121/exec';
const T0 = Date.parse('2026-10-10T15:00:00Z');
const EST = 12101;

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    let sheet = {};
    await ctx.route(SYNC + '**', async (r) => {
      const req = r.request();
      const json = (o) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(o) });
      if (req.method() === 'POST') return json({ ok: true });
      if (/action=loadMedia/.test(req.url())) return json({ ok: true, media: sheet });
      return json({ ok: true });
    });
    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    // Every dialog is answered OK unless a section sets `answer` to false.
    const said = []; let answer = true;
    p.on('dialog', async (d) => { said.push(d.message()); if (answer) await d.accept(); else await d.dismiss(); });
    await p.goto(APP); await p.waitForTimeout(1600);
    await p.evaluate((u) => {
      SHEETS_SYNC_URL = u;
      try { localStorage.setItem('hav_device_user', 'Ashley Jerome'); } catch (e) {}
      window.open = function () { return null; };
      window.__prints = [];
      window.print = function () { const pt = document.getElementById('print-target'); window.__prints.push(pt ? pt.innerHTML : ''); };
      // Agent Two is never asked here: the run would value the lines this step leaves unvalued on purpose.
      agentValueAuto = function () { return false; };
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
    const line = (sid) => p.evaluate(([id, sid]) => (_photoRefs[id] || []).filter((r) => r.stableId === sid)[0] || null, [EST, sid]);
    const toDesk = async () => {
      await p.click('.nb[onclick*="\'inventory\'"]'); await p.waitForTimeout(900);
      if (String(await val('#inv-job')) !== String(EST)) { await p.selectOption('#inv-job', String(EST)); await p.waitForTimeout(1000); }
    };
    const viewerOpen = () => p.evaluate(() => { const o = document.getElementById('doc-viewer-modal'); return !!o && o.style.display === 'flex'; });
    const close = () => press('#doc-viewer-modal button[onclick="closeDocViewer()"]', 'Close');
    const more = async (f) => { if (!(await vis('#inv-more button[onclick="' + f + '(' + EST + ')"]'))) await press('#inv-more > summary', 'More ▾'); };

    // ── Seed ──
    sheet = await p.evaluate(([EST, T0]) => {
      jobs.unshift({ id: EST, hvlId: 'HVL-2610-P7', name: 'Harold Ashworth', svc: 'probate', matterType: 'probate', addr: '12 Ocean Blvd', city: 'Palm Beach', zip: '33480',
        status: 'active', won: true, wonAt: '2026-09-25', approved: true, tc: 'Ashley Jerome', created: '2026-09-20', start: '2026-10-06', activatedOn: '2026-10-05',
        agrApproved: true, agrSent: true, agrSigned: true, docState: {}, at: {}, appraisers: [],
        executor: 'Ruth Ashworth', executorRole: 'Personal Representative', executorEmail: 'ruth@example.com', deathDate: '2026-04-02', executorAuth: 'received',
        probateAttyName: 'Ann Lowe', probateAttyEmail: 'ann@lowe.law', probateCase: '50-2026-CP-004321', docTier: 'values', gate706: 'yes',
        driveFolder: 'https://drive.google.com/drive/folders/ROOT' + EST, driveSubfolders: { 'Estate Inventory': 'INV' + EST, 'As-Found Record': 'AF' + EST, 'Signed Records': 'SR' + EST },
        payments: [{ uid: 'd' + EST, stage: 'deposit', amount: 20000, receivedOn: '2026-10-01', method: 'wire', clearedOn: '2026-10-01' }] });
      estimateStore[EST] = { approved: true, submitted: true, approvedBy: 'Anthony Graziano', savedAt: T0,
        estimate: { jobId: EST, svc: 'probate', havellinTotal: 40000, fixedPrice: true, fixedAmount: 40000, fixedLines: true, totTC: 100, totPS: 150, tcRate: 150, psRate: 100,
          days: 8, vendors: [], prepItems: [], pkgCost: 0, rooms: [{ idx: 0, name: 'Study', st: 'in', vol: 3, cplx: 3 }, { idx: 1, name: 'Garage', st: 'in', vol: 3, cplx: 3 }] } };
      jobPlanStore[EST] = { rooms: { 0: { status: 'locked' }, 1: { status: 'locked' } }, tasks: {}, at: {} };
      const item = (id, o) => Object.assign({ stableId: id, label: 'inventory', roomIdx: 0, status: 'uploaded', category: 'Furniture', disposition: 'Keep',
        objectName: 'Line ' + id, ts: T0, updatedAt: T0, filename: 'HVL_' + EST + '_INV_' + id + '.jpg', driveFileId: 'f-' + id, namedBy: 'desk', reviewed: true }, o);
      const desk = (o) => Object.assign({ valuedBy: 'desk', valSource: 'Dealer quote' }, o);
      _photoRefs[EST] = [
        item('sl', { itemNo: 40, objectName: 'Oil on canvas still life, signed lower left', category: 'Art & Décor', fmv: 4800, valLow: 3200, valHigh: 7500,
          valConf: 'low', valuedBy: 'agent', valSource: 'Online comps', valNote: 'Two signed still lifes sold online, 2025.', valAgentAt: T0, valNameAt: 'Oil on canvas still life, signed lower left' }),
        item('m1', desk({ itemNo: 1, objectName: 'Brenner oil, harbour', category: 'Art & Décor', fmv: 1600 })),
        item('m2', desk({ itemNo: 2, objectName: 'Gorham sterling goblets', category: 'Silver & Precious Metal', qty: 12, fmv: 1800 })),
        item('m3', desk({ itemNo: 3, objectName: 'Heriz rug', category: 'Rugs & Carpets', fmv: 2200 })),
        item('m4', desk({ itemNo: 4, objectName: 'Pearl necklace', category: 'Jewelry & Watches', fmv: 1400 })),
        item('m5', desk({ itemNo: 5, objectName: 'Federal card table', category: 'Antiques', fmv: 900 })),
        item('m6', desk({ itemNo: 6, objectName: 'Coin collection', category: 'Collectibles', fmv: 400 })),
        item('m7', desk({ itemNo: 7, objectName: 'Signed print', category: 'Art & Décor', fmv: 180 })),
        item('m8', { itemNo: 8, objectName: 'Unsigned bronze', category: 'Art & Décor', fmv: '' }),
        item('n1', { itemNo: 20, objectName: 'Nightstand', fmv: '' }),
        item('n2', { itemNo: 23, objectName: 'Copper cookware set', category: 'General/Household', fmv: '' }),
        item('car', desk({ itemNo: 30, objectName: 'Mercedes sedan', category: 'Vehicles & Watercraft', roomIdx: 1, fmv: 14000, assetTrack: 'Non-probate' }))];
      savePhotoRefs(EST);
      saveJobs(); localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore));
      _logsState = 'ready';
      const out = {}; out[EST] = { items: JSON.parse(localStorage.getItem('hav_media_' + EST) || '[]') }; return out;
    }, [EST, T0]);

    // ── A ──
    await section('A. Valuation Source → Appraisal over Agent Two\'s figure asks first; OK takes it off; the figure typed after is the appraisal', async () => {
      await toDesk();
      ok(await vis('#inv-row-sl'), 'the still life\'s row on the desk');
      await press('#inv-row-sl button[title="Open the full record"]', 'the row\'s ▾');
      const sel = '#inv-row-sl select[onchange*="\'valSource\'"]';
      ok(await vis(sel), 'the record\'s Valuation Source');
      answer = false; said.length = 0;
      await p.selectOption(sel, 'Appraisal'); await p.waitForTimeout(700);
      answer = true;
      has(said.join(' | '), 'carries Agent Two’s estimate of $4,800, not an appraisal', '⚠ the dialog names Agent Two\'s estimate');
      const kept = await line('sl');
      eq([kept.fmv, kept.valSource, kept.valuedBy], [4800, 'Online comps', 'agent'], 'Cancel: the line is as it was');
      eq(await val(sel), 'Online comps', '…and the select put back');
      said.length = 0;
      await p.selectOption(sel, 'Appraisal'); await p.waitForTimeout(900);
      ok(said.length === 1, 'asked once');
      const off = await line('sl');
      eq([off.fmv, off.valSource, off.valuedBy, off.valHigh], ['', 'Appraisal', 'appraiser', undefined], '⚠⚠ OK: Agent Two\'s figure is off the line, the source Appraisal');
      eq(await val('#inv-fmv-sl'), '', 'the row\'s Total box is blank, waiting for the appraiser\'s figure');
      await p.fill('#inv-fmv-sl', '5200'); await p.press('#inv-fmv-sl', 'Tab'); await p.waitForTimeout(900);
      const r = await line('sl');
      eq([r.fmv, r.valSource, r.valuedBy], [5200, 'Appraisal', 'appraiser'], '⚠⚠ the figure typed after the choice is the appraisal');
      has(await txt('#inv-row-sl'), 'Appraisal (appraiser not named)', 'and the row says nobody is named as its appraiser');
    });

    // ── B ──
    await section('B. two lines picked: Set valuation source… offers no Appraisal', async () => {
      await p.evaluate(() => { _invOpen = {}; renderInventoryTab(); }); await p.waitForTimeout(500);
      await p.click('#inv-row-n1 input[title="Select for a bulk change"]'); await p.waitForTimeout(300);
      await p.click('#inv-row-n2 input[title="Select for a bulk change"]'); await p.waitForTimeout(500);
      const opts = await p.evaluate((id) => Array.from(document.querySelectorAll('#inv-bulk-' + id + ' select')).filter((s) => /Set valuation source/.test(s.textContent))
        .map((s) => Array.from(s.options).map((o) => o.textContent.trim()))[0] || null, EST);
      ok(!!opts, 'the selection bar\'s Set valuation source…');
      ok(opts && opts.indexOf('Appraisal') < 0, '⚠⚠ Appraisal is not on it');
      ok(opts && opts.indexOf('Dealer quote') >= 0, '…the other sources are');
      await p.evaluate(() => { _invPick = {}; renderInventoryTab(); }); await p.waitForTimeout(400);
    });

    // ── C ──
    await section('C. More ▾ → Appraisal Worklist: already over the aggregate, and every such article owed the sworn appraisal', async () => {
      await more('printAppraisalWorklist');
      await press('#inv-more button[onclick="printAppraisalWorklist(' + EST + ')"]', 'Appraisal Worklist');
      ok(await viewerOpen(), 'the viewer is on screen');
      const body = await txt('#doc-viewer-body');
      has(body, 'total at least $13,680: already over the $3,000 aggregate whatever the remaining 1 is worth, so an expert appraisal must be filed with the return.',
        '⚠⚠ over, never "cannot be tested yet"');
      lacks(body, 'cannot be tested', '…and never cannot be tested');
      has(body, '8 items are owed the sworn appraisal with the return: #1 Brenner oil, harbour, #2 Gorham sterling goblets, #3 Heriz rug, #4 Pearl necklace, #5 Federal card table, #6 Coin collection, #7 Signed print, #8 Unsigned bronze.',
        '⚠⚠ the items owed the sworn appraisal, named (the still life, appraised in A, aside)');
      has(body, 'Signed print · owed the sworn appraisal (§20.2031-6(b) aggregate)', '…each marked in its specialist\'s packet');
      const silver = await p.evaluate(() => { const tr = Array.from(document.querySelectorAll('#doc-viewer-body tr')).filter((r) => r.cells[0] && r.cells[0].textContent.trim() === 'Silverware')[0];
        return tr ? tr.cells[1].textContent.trim() : null; });
      eq(silver, '12', '⚠ the class table counts the twelve goblets as twelve articles');
      await close();
    });

    // ── D ──
    await section('D. the Estate Inventory PDF: a floor, the probate estate and the property outside it subtotalled; the Court Inventory agrees', async () => {
      await press('#inv-workbar button[onclick="printEstateInventoryReport(' + EST + ')"]', 'Estate Inventory PDF');
      ok(await viewerOpen(), 'the viewer is on screen');
      const body = await txt('#doc-viewer-body');
      has(body, 'Probate estate, exempt property included, recorded so far (Fair Market Value) — not a complete total: $13,680', '⚠⚠ the probate estate: a floor');
      has(body, 'Outside the probate estate (Fair Market Value): $14,000', '…the property outside it, complete');
      has(body, 'Total recorded so far (Fair Market Value) — not a complete total: $27,680', '⚠⚠ the whole: a floor, never a complete total');
      has(body, '3 items are recorded without a value and are NOT included above, so this figure is a floor rather than a total: #8 Unsigned bronze, #20 Nightstand, #23 Copper cookware set.', '…naming the lines');
      lacks(body, 'Total estimated fair market value', 'no complete total over a floor');
      await close();
      await more('printCourtInventory');
      await press('#inv-more button[onclick="printCourtInventory(' + EST + ')"]', 'Court Inventory');
      has(await txt('#doc-viewer-body'), 'Total recorded so far (Fair Market Value) — not a complete total: $13,680', '⚠ the Court Inventory\'s floor is the Report\'s probate subtotal');
      await close();
    });

    // ── E ──
    await section('E. Show summary & rollups: the desk\'s notice says the appraisal is required and names the articles owed it', async () => {
      const btn = '#inv-more button[onclick="invToggleRollups()"]';
      if (!(await vis(btn))) await press('#inv-more > summary', 'More ▾');
      await press(btn, 'Show summary & rollups');
      await p.waitForTimeout(500);
      const s = await txt('#inv-summary');
      has(s, 'Expert appraisal required with the return.', '⚠ the desk\'s notice: required');
      has(s, '8 items are owed the sworn appraisal with the return', '…naming the articles owed it');
    });

    // ── F ──
    await section('F. 1440 and 390 px: no horizontal overflow; zero page errors', async () => {
      ok((await overflow()) <= 0, 'no horizontal overflow at 1440 (' + (await overflow()) + ')');
      await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(500);
      await toDesk();
      ok((await overflow()) <= 0, 'no horizontal overflow at 390 (' + (await overflow()) + ')');
      await p.evaluate((id) => printAppraisalWorklist(id), EST); await p.waitForTimeout(500);
      ok(await viewerOpen(), 'fixture: the worklist in the viewer');
      ok((await overflow()) <= 0, 'the worklist at 390: no horizontal overflow (' + (await overflow()) + ')');
      await close();
      eq(errs, [], 'zero page errors');
    });

    await b.close();
    console.log('\n' + pass + ' passed, ' + fail + ' failed');
    process.exit(fail ? 1 : 0);
  } catch (e) {
    console.log('  ✗ threw: ' + (e && e.stack || e));
    if (b) await b.close().catch(() => {});
    console.log('\n' + pass + ' passed, ' + (fail + 1) + ' failed');
    process.exit(1);
  }
})();
