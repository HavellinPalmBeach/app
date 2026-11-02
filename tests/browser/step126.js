// Step 126 — Every line traceable to its photograph and number (P13 of the desk audit, 2026-10-28; EST-06, DOC-03, ROW-02, ACC-20,
// VAL-13, DOC-05, DOC-06, INV-10, INV-16, INV-20, INV-09, DOC-25, VAL-29, INV-18).
//
// Drives the REAL page with one probate estate filing a Form 706, on the values tier, of 168 lines: 150 book lots and the lines the
// pack is about (two Remington shotguns by number and room, Gorham flatware of twelve at $1,800, copper cookware of eight at $90
// each, a sideboard drawer of mixed things Agent One marked as a group at $180, "Set of 8 mahogany dining chairs" counted six), two
// numbers removed (#4 a duplicate of #3, #5 a photograph with nothing to list), and every photograph in Drive, the server answering
// getThumbnails at the size it really hands back (about 13,000 characters) except one file it cannot serve. Job Admin & Inv through
// its own nav button and the client through its picker. A: the row says "count in the name"; Show summary & rollups counts lines and
// articles; the history bar's Removed items says why each came off. B (ROW-02): the desk fetches the photographs, the stored copy
// stays under the 2,000,000-character budget, and after leaving the tab and coming back every row it draws still has its photograph,
// with nothing fetched again. C (EST-06, DOC-03): with the desk's cache cut to twenty, the work bar's Estate Inventory PDF gathers its
// own lines' photographs first, every line's photograph on the page but the one Drive cannot serve (linked in words), every number a
// link to its file, no "re-open this tab", the drafted footer, and localStorage untouched by it. D (print media): More ▾ → Court
// Inventory → Print / Save PDF: what printed, laid out on a Letter page in print media, carries Item # and Room on every table with
// one set of column widths, the shotguns told apart by number and room, "(8 × $90)", the Form 706 mark and "grouped, untested", the
// Numbers not used footnote, and no horizontal overflow. F (P13's review, 2026-10-28): P8's Ellison plates read twice and a
// "Brass candlestick" left marked as a group; Remove under Possible duplicates on #88 and #73 names #81 and #87 (never #73, the
// lowest number), the candlestick's record shows the mark and One article answers it, the drawer's count typed in its row's Qty box
// answers its mark, the summary then counts no group apart, and the Court Inventory says "grouped, untested" of neither.
// E: 1440 and 390 px, no horizontal overflow; zero page errors.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step126.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');
const SYNC = 'https://script.google.com/macros/s/STEP124/exec';
const T0 = Date.parse('2026-10-10T15:00:00Z');
const EST = 12401;
const BOOKS = 150;
// A real 1x1 PNG with trailing zero bytes, so it decodes and weighs what a thumbnail weighs.
const PNG = Buffer.concat([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'), Buffer.alloc(9700)]);
const THUMB = 'data:image/png;base64,' + PNG.toString('base64');
const MISSING = 'f-b7';

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    let sheet = {};
    const thumbCalls = [];
    await ctx.route(SYNC + '**', async (r) => {
      const req = r.request();
      const json = (o) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(o) });
      if (req.method() === 'POST') {
        let body = {};
        try { body = JSON.parse(req.postData() || '{}'); } catch (e) {}
        if (body.action === 'getThumbnails') {
          thumbCalls.push((body.fileIds || []).length);
          const thumbs = {}, missing = [];
          (body.fileIds || []).forEach((id) => { if (id === MISSING) missing.push(id); else thumbs[id] = THUMB; });
          return json({ ok: true, success: true, thumbs, missing });
        }
        return json({ ok: true });
      }
      if (/action=loadMedia/.test(req.url())) return json({ ok: true, media: sheet });
      return json({ ok: true });
    });
    const p = await ctx.newPage();
    p.setDefaultTimeout(15000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    p.on('dialog', async (d) => { await d.accept(); });
    await p.goto(APP); await p.waitForTimeout(1600);
    await p.evaluate((u) => {
      SHEETS_SYNC_URL = u;
      try { localStorage.setItem('hav_device_user', 'Ashley Jerome'); } catch (e) {}
      window.open = function () { return null; };
      window.__prints = [];
      window.print = function () { const pt = document.getElementById('print-target'); window.__prints.push(pt ? pt.innerHTML : ''); };
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
    const toDesk = async () => {
      await p.click('.nb[onclick*="\'inventory\'"]'); await p.waitForTimeout(1200);
      if (String(await val('#inv-job')) !== String(EST)) { await p.selectOption('#inv-job', String(EST)); await p.waitForTimeout(1500); }
    };
    const settle = async () => { let n = -1; for (let i = 0; i < 30 && n !== thumbCalls.length; i++) { n = thumbCalls.length; await p.waitForTimeout(800); } };
    const viewerOpen = () => p.evaluate(() => { const o = document.getElementById('doc-viewer-modal'); return !!o && o.style.display === 'flex'; });
    const waitViewer = async () => { for (let i = 0; i < 40 && !(await viewerOpen()); i++) await p.waitForTimeout(500); return viewerOpen(); };
    const close = () => press('#doc-viewer-modal button[onclick="closeDocViewer()"]', 'Close');
    const more = async (f) => { if (!(await vis('#inv-more button[onclick="' + f + '(' + EST + ')"]'))) await press('#inv-more > summary', 'More ▾'); };
    // The rows the desk draws, and how many of their photograph tiles are painted.
    const painted = () => p.evaluate(() => {
      const tiles = Array.prototype.slice.call(document.querySelectorAll('.inv-c-photo [data-thumb-id], a.inv-c-photo [data-thumb-id]'));
      return { tiles: tiles.length, painted: tiles.filter((t) => /url\(/.test(t.style.backgroundImage || '')).length };
    });

    // ── Seed ──
    sheet = await p.evaluate(([EST, T0, BOOKS]) => {
      jobs.unshift({ id: EST, hvlId: 'HVL-2610-P13', name: 'Harold Ashworth', svc: 'probate', matterType: 'probate', addr: '12 Ocean Blvd', city: 'Palm Beach', zip: '33480',
        status: 'active', won: true, wonAt: '2026-09-25', approved: true, tc: 'Ashley Jerome', created: '2026-09-20', start: '2026-10-06', activatedOn: '2026-10-05',
        agrApproved: true, agrSent: true, agrSigned: true, docState: {}, at: {}, appraisers: [],
        executor: 'Ruth Ashworth', executorRole: 'Personal Representative', executorEmail: 'ruth@example.com', deathDate: '2026-04-02', executorAuth: 'received',
        probateAttyName: 'Ann Lowe', probateAttyEmail: 'ann@lowe.law', probateCase: '50-2026-CP-004321', docTier: 'values', gate706: 'yes',
        driveFolder: 'https://drive.google.com/drive/folders/ROOT' + EST, driveSubfolders: { 'Estate Inventory': 'INV' + EST, 'As-Found Record': 'AF' + EST, 'Signed Records': 'SR' + EST },
        payments: [{ uid: 'd' + EST, stage: 'deposit', amount: 20000, receivedOn: '2026-10-01', method: 'wire', clearedOn: '2026-10-01' }] });
      estimateStore[EST] = { approved: true, submitted: true, approvedBy: 'Anthony Graziano', savedAt: T0,
        estimate: { jobId: EST, svc: 'probate', havellinTotal: 40000, fixedPrice: true, fixedAmount: 40000, fixedLines: true, totTC: 100, totPS: 150, tcRate: 150, psRate: 100,
          days: 8, vendors: [], prepItems: [], pkgCost: 0,
          rooms: [{ idx: 0, name: 'Study', st: 'in', vol: 3, cplx: 3 }, { idx: 1, name: 'Gun Room', st: 'in', vol: 3, cplx: 3 }, { idx: 2, name: 'Kitchen', st: 'in', vol: 3, cplx: 3 }] } };
      jobPlanStore[EST] = { rooms: { 0: { status: 'locked' }, 1: { status: 'locked' }, 2: { status: 'locked' } }, tasks: {}, at: {} };
      const item = (id, o) => Object.assign({ stableId: id, label: 'inventory', roomIdx: 0, status: 'uploaded', category: 'General/Household', disposition: 'Keep',
        objectName: 'Line ' + id, ts: T0, updatedAt: T0, filename: 'HVL_' + EST + '_INV_' + id + '.jpg', driveFileId: 'f-' + id,
        driveFileUrl: 'https://drive.google.com/file/d/f-' + id + '/view', namedBy: 'desk', reviewed: true, valuedBy: 'desk', valSource: 'Dealer quote' }, o);
      const refs = [
        item('fl', { itemNo: 1, objectName: 'Gorham sterling flatware service', category: 'Silver & Precious Metal', qty: 12, fmv: 1800, roomIdx: 2 }),
        item('cw', { itemNo: 2, objectName: 'Copper cookware', qty: 8, unitVal: 90, fmv: 720, roomIdx: 2 }),
        item('cl', { itemNo: 3, objectName: 'Grandfather clock', category: 'Antiques', fmv: 3500 }),
        item('dp', { itemNo: 4, objectName: 'Grandfather clock', category: 'Antiques', fmv: 3500, deletedAt: T0 + 5, deletedBy: 'Ashley Jerome', removedWhy: 'dup', removedOf: 'cl' }),
        item('em', { itemNo: 5, objectName: '', agentConf: 'none', deletedAt: T0 + 6, deletedBy: 'Ashley Jerome', removedWhy: 'empty', fmv: '' }),
        item('sd', { itemNo: 6, objectName: 'Sideboard drawer contents: candles, napkin rings, coasters', agentGroup: true, fmv: 180, roomIdx: 2 }),
        item('ch', { itemNo: 7, objectName: 'Set of 8 mahogany dining chairs', category: 'Furniture', qty: 6, fmv: 1200 }),
        item('g1', { itemNo: 11, objectName: 'Remington 870 pump shotgun', category: 'Collectibles', fmv: 500, roomIdx: 1 }),
        item('g2', { itemNo: 23, objectName: 'Remington 870 pump shotgun', category: 'Collectibles', fmv: 500, roomIdx: 0 })];
      for (let i = 0; i < BOOKS; i++) refs.push(item('b' + i, { itemNo: 100 + i, objectName: 'Shelf of hardcover books ' + (i + 1), fmv: 40 }));
      _photoRefs[EST] = refs;
      savePhotoRefs(EST);
      saveJobs(); localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore));
      _logsState = 'ready';
      const out = {}; out[EST] = { items: JSON.parse(localStorage.getItem('hav_media_' + EST) || '[]') }; return out;
    }, [EST, T0, BOOKS]);
    const LIVE = 7 + BOOKS;   // live lines with a file in Drive (the two removed aside)

    // ── B first: the desk's own fetch, then a full redraw (ROW-02) ──
    await section('B. ⚠⚠ the desk keeps the session\'s photographs: after leaving the tab and coming back every row still has its photograph (ROW-02)', async () => {
      await toDesk();
      await settle();
      ok(thumbCalls.length >= 3, 'the desk fetched the photographs in batches (' + thumbCalls.join(', ') + ')');
      const stored = await p.evaluate((id) => (localStorage.getItem('hav_media_thumb_' + id) || '').length, EST);
      const held = await p.evaluate((id) => Object.keys(_invThumbs[id] || {}).length, EST);
      ok(stored > 0 && stored <= 2000000, 'the stored copy is under the 2,000,000-character budget (' + stored + ')');
      eq(held, LIVE - 1, '⚠⚠ the session holds every photograph Drive could serve (' + held + '), more than the budget stores');
      const before = await painted();
      ok(before.tiles > 0 && before.painted >= before.tiles - 1, 'the rows drawn carry their photographs (' + before.painted + ' of ' + before.tiles + ')');
      const calls = thumbCalls.length;
      await p.click('.nb[onclick*="\'jobs\'"]').catch(() => {}); await p.waitForTimeout(800);
      await toDesk();
      await p.waitForTimeout(1500);
      const after = await painted();
      ok(after.tiles > 0 && after.painted >= after.tiles - 1, '⚠⚠ and after a full redraw they still do (' + after.painted + ' of ' + after.tiles + '; the audit: 142 of 300)');
      eq(thumbCalls.length, calls, 'with nothing fetched again');
    });

    // ── A ──
    await section('A. the row says "count in the name"; the summary counts lines and articles; Removed items says why', async () => {
      const hint = '#inv-row-ch .inv-count-name';
      ok(await vis(hint), 'the dining chairs\' row shows its hint');
      eq(await txt(hint), 'count in the name', 'in those words');
      ok(!(await vis('#inv-row-cl .inv-count-name')), 'a name with no count shows none');
      await more('invToggleRollups');
      const btn = '#inv-more button[onclick="invToggleRollups()"]';
      if (!(await vis(btn))) await press('#inv-more > summary', 'More ▾');
      await press(btn, 'Show summary & rollups');
      await p.waitForTimeout(500);
      const s = await p.evaluate(() => { const el = document.getElementById('inv-summary'); return el ? el.innerText.replace(/\s+/g, ' ') : ''; });
      has(s, 'Total Lines ' + LIVE, 'the summary counts the lines');
      // RESTATED (P13's review, 2026-10-28): the sideboard drawer Agent One marked as a group with no count is counted apart.
      has(s, 'Total Articles ' + (BOOKS + 12 + 8 + 1 + 6 + 2) + ', plus 1 grouped line not counted', '⚠ and the articles they hold, the group with no count apart');
      await press('#desk-hd-history-' + EST, 'the Removed items & snapshots bar');
      const h = await txt('#desk-body-history-' + EST);
      has(h, 'a duplicate of #3', 'Removed items says #4 was a duplicate of #3');
      has(h, 'nothing to list in its photograph', 'and #5 a photograph with nothing to list');
      has(h, 'the papers list its number under Numbers not used', 'and that the papers list the numbers');
    });

    // ── C ──
    await section('C. ⚠⚠ the Estate Inventory PDF gathers its own photographs, links every line, and writes nothing to localStorage (EST-06, DOC-03, DOC-06)', async () => {
      // The desk's cache cut to twenty, as a capped cache would leave it.
      await p.evaluate((id) => { const c = _invThumbs[id] || {}; const k = Object.keys(c); const kept = {}; k.slice(0, 20).forEach((x) => { kept[x] = c[x]; }); _invThumbs[id] = kept; _invPrintThumbs = {}; }, EST);
      const storedBefore = await p.evaluate((id) => localStorage.getItem('hav_media_thumb_' + id) || '', EST);
      const calls = thumbCalls.length;
      await press('#inv-workbar button[onclick="printEstateInventoryReport(' + EST + ')"]', 'Estate Inventory PDF, on the work bar');
      ok(await waitViewer(), 'the viewer is on screen once the photographs are in');
      ok(thumbCalls.length - calls >= 3, 'the paper asked for its own lines\' photographs first (' + thumbCalls.slice(calls).join(', ') + ')');
      const counts = await p.evaluate(() => {
        const box = document.getElementById('doc-viewer-body');
        return { imgs: box.querySelectorAll('img[src^="data:image"]').length, links: box.querySelectorAll('a.inv-no-link').length,
                 nothumb: box.querySelectorAll('a.inv-paper-nothumb').length, photoLinks: box.querySelectorAll('a.inv-paper-photo[href^="https://drive.google.com/file/d/"]').length };
      });
      eq(counts.imgs, LIVE - 1, '⚠⚠ every line\'s photograph is on the page but the one Drive cannot serve (' + counts.imgs + ')');
      eq(counts.nothumb, 1, '…which links to its file in words');
      eq(counts.links, LIVE, 'every number links to its photograph');
      eq(counts.photoLinks, LIVE, 'and every photograph cell to its file');
      const body = await txt('#doc-viewer-body');
      lacks(body, 're-open this tab', '⚠⚠ no "re-open this tab" to a reader who has no tab');
      lacks(body, 'reference-numbered', 'nor the claim the page never made true');
      has(body, 'Where an item has a photograph, its number links to it in Drive; the photographs are retained for seven years.', 'the drafted footer');
      has(body, 'Numbers not used: #4 a duplicate of #3; #5 nothing to list in its photograph', 'the gaps in the numbers, explained');
      has(body, 'Gorham sterling flatware service (12 × $150)', 'a lot says what each article is worth');
      has(body, 'averages $150 an article: itemise it for the Form 706', 'and on a Form 706 estate the over-cap lot is marked');
      eq(await p.evaluate((id) => localStorage.getItem('hav_media_thumb_' + id) || '', EST), storedBefore, '⚠⚠ the print-only fetch wrote nothing to localStorage');
      eq(await p.evaluate((id) => Object.keys(_invThumbs[id] || {}).length, EST), 20, 'nor into the desk\'s cache');
      await close();
    });

    // ── D ──
    await section('D. ⚠⚠ the Court Inventory, printed, in print media: Item # and Room, one set of widths, the lots, the gaps (ACC-20, DOC-05, VAL-29, DOC-25, INV-09, INV-16)', async () => {
      await more('printCourtInventory');
      await press('#inv-more button[onclick="printCourtInventory(' + EST + ')"]', 'Court Inventory, under More ▾');
      ok(await waitViewer(), 'in the viewer');
      const n = await p.evaluate(() => window.__prints.length);
      await press('#doc-print-btn, #doc-viewer-print', 'Print / Save PDF');
      await p.waitForTimeout(400);
      const html = await p.evaluate((k) => window.__prints[k] || '', n);
      ok(html.length > 1000, 'the page went to print');
      // What printed, laid out in print media on a Letter page.
      await p.waitForTimeout(800);
      await p.setViewportSize({ width: 816, height: 1056 });
      await p.evaluate((h) => { const pt = document.getElementById('print-target'); pt.innerHTML = h; pt.style.display = 'block'; }, html);
      await p.emulateMedia({ media: 'print' });
      const m = await p.evaluate(() => {
        const pt = document.getElementById('print-target');
        const tables = Array.prototype.slice.call(pt.querySelectorAll('table.inv-sched'));
        return { n: tables.length,
          heads: tables.map((t) => Array.prototype.map.call(t.querySelectorAll('thead th'), (th) => th.textContent.trim()).join('|')),
          lefts: tables.map((t) => Array.prototype.map.call(t.querySelectorAll('thead th'), (th) => Math.round(th.getBoundingClientRect().left)).join(',')),
          widths: tables.map((t) => Math.round(t.getBoundingClientRect().width)),
          over: pt.scrollWidth - pt.clientWidth, text: pt.textContent.replace(/\s+/g, ' '),
          // Each row as its cells read, one ' | ' between them (no text-transform on these cells, so innerText reads as printed).
          rows: Array.prototype.map.call(pt.querySelectorAll('table.inv-sched tbody tr'), (tr) => Array.prototype.map.call(tr.cells, (c) => c.innerText.replace(/\s+/g, ' ').trim()).join(' | ')) };
      });
      ok(m.n >= 3, 'a table per category (' + m.n + ')');
      ok(m.heads.every((h) => h === 'Item #|Description|Room|Condition|Basis|FMV (total)'), '⚠⚠ every table heads Item #, Description, Room, Condition, Basis, FMV');
      ok(m.lefts.every((l) => l === m.lefts[0]), '⚠ one set of column widths: every column starts at the same place on every table (' + m.lefts[0] + ')');
      ok(m.widths.every((w) => w === m.widths[0]), 'and every table is one width');
      ok(m.over <= 0, 'no horizontal overflow on the printed page (' + m.over + ')');
      const t = m.text, rows = m.rows.join('\n');
      const g11 = m.rows.findIndex((r) => r.indexOf('11 | Remington 870 pump shotgun | Gun Room') === 0), g23 = m.rows.findIndex((r) => r.indexOf('23 | Remington 870 pump shotgun | Study') === 0);
      ok(g11 >= 0 && g23 > g11, '⚠⚠ the two shotguns told apart by number and room, in number order');
      has(rows, '2 | Copper cookware (8 × $90) | Kitchen', '"(8 × $90)"');
      has(rows, '1 | Gorham sterling flatware service (12 × $150) ⚠ averages $150 an article: itemise it for the Form 706 | Kitchen', 'the Form 706 mark on its line');
      has(rows, '6 | Sideboard drawer contents: candles, napkin rings, coasters ⚠ grouped, untested | Kitchen', 'a group with no count: grouped, untested');
      lacks(t, 'valued as a lot', 'never "valued as a lot"');
      has(t, 'Numbers not used: #4 a duplicate of #3; #5 nothing to list in its photograph', 'the footnote');
      has(t, 'its number links to it in Drive', 'and the photographs\' sentence');
      await p.emulateMedia({ media: 'screen' });
      await p.evaluate(() => { const pt = document.getElementById('print-target'); pt.innerHTML = ''; pt.style.display = 'none'; });
      await p.setViewportSize({ width: 1440, height: 1000 });
      await p.waitForTimeout(600);
      if (await viewerOpen()) await close();
    });

    // ── F (P13's review, 2026-10-28) ──
    await section('F. ⚠⚠ the review: Remove under Possible duplicates names the line it duplicates; a group with no count is answered by a count typed or One article', async () => {
      // P8's Ellison plates, one photograph read twice (#73 dinner and #81 salad plates first; #87 and #88 the later reading), and a
      // line a drawer was itemised down to, left marked as a group: "Brass candlestick", $500.
      sheet = await p.evaluate(([EST, T0]) => {
        const A1 = T0 + 3600000, A2 = A1 + 7 * 60000;
        const ph = { label: 'inventory', roomIdx: 2, status: 'uploaded', ts: T0 + 50, filename: 'HVL_' + EST + '_INV_pl.jpg', driveFileId: 'f-pl',
          driveFileUrl: 'https://drive.google.com/file/d/f-pl/view', category: 'General/Household', disposition: 'Keep', namedBy: 'agent', agentConf: 'medium',
          valuedBy: 'desk', valSource: 'Dealer quote', fmv: 120 };
        const L = (id, no, name, at, crop, o) => Object.assign({ stableId: id, itemNo: no, objectName: name, agentName: name, agentAt: at, updatedAt: at, crop: crop },
          ph, id === 'pl73' ? {} : { derivedFrom: 'pl73' }, o || {});
        _photoRefs[EST].push(
          L('pl73', 73, 'Hand-painted tin-glazed earthenware dinner plates, yellow bird and blue flower', A1, [0.46, 0.38, 1, 0.78], { qty: 8 }),
          L('pl81', 81, 'Hand-painted tin-glazed earthenware salad plates, matching', A1 + 3, [0.03, 0.43, 0.45, 0.78], { qty: 6 }),
          L('pl87', 87, 'Hand-painted majolica dinner plates, yellow bird and blue flower design', A2, [0.5, 0.4, 0.98, 0.8], { qty: 6 }),
          L('pl88', 88, 'Hand-painted majolica salad or dessert plates, matching', A2 + 2, [0.05, 0.42, 0.44, 0.8], { qty: 6 }),
          { stableId: 'bc', itemNo: 8, label: 'inventory', roomIdx: 0, status: 'uploaded', category: 'General/Household', disposition: 'Keep', objectName: 'Brass candlestick',
            agentGroup: true, fmv: 500, ts: T0, updatedAt: T0, filename: 'HVL_' + EST + '_INV_bc.jpg', driveFileId: 'f-bc', driveFileUrl: 'https://drive.google.com/file/d/f-bc/view',
            namedBy: 'desk', reviewed: true, valuedBy: 'desk', valSource: 'Dealer quote' });
        savePhotoRefs(EST);
        const out = {}; out[EST] = { items: JSON.parse(localStorage.getItem('hav_media_' + EST) || '[]') }; return out;
      }, [EST, T0]);
      await p.click('.nb[onclick*="\'jobs\'"]').catch(() => {}); await p.waitForTimeout(600);
      await toDesk();
      await settle();
      const grp = '.inv-dup-group';
      ok(await vis(grp), 'Possible duplicates shows the photograph read twice');
      // Remove on #88, a repeat of #81, then on #73, the original #87 repeats.
      await press(grp + ' button[onclick="agentDropDuplicate(' + EST + ',\'pl88\')"]', 'Remove on #88');
      await press(grp + ' button[onclick="agentDropDuplicate(' + EST + ',\'pl73\')"]', 'Remove on #73');
      if (!(await vis('#desk-body-history-' + EST))) await press('#desk-hd-history-' + EST, 'the Removed items & snapshots bar');
      const h = await txt('#desk-body-history-' + EST);
      has(h, 'a duplicate of #81', '⚠⚠ Removed items: #88 a duplicate of #81, the line it repeats');
      has(h, 'a duplicate of #87', '⚠⚠ …and #73 a duplicate of #87, the later line that repeats it');
      lacks(h, 'a duplicate of #73', '⚠⚠ never "#88 a duplicate of #73" (the lowest number)');
      const foot = await p.evaluate((id) => invNumbersNotUsedText(id), EST);
      has(foot, '#73 a duplicate of #87; #88 a duplicate of #81', 'and the papers\' footnote says the same');
      // The candlestick's record: the mark, and One article.
      const tog = 'button[onclick="_invToggleOpen(\'bc\')"]';
      if (!(await vis('#inv-grp-bc'))) await press(tog, 'the candlestick\'s ▾');
      has(await txt('#inv-grp-bc'), 'A group with no count. Agent One read this line as more than one article, and no count is recorded.', '⚠ the record shows Agent One\'s mark');
      await press('#inv-grp-bc button', 'One article');
      const bc = await p.evaluate((id) => { const r = (_photoRefs[id] || []).filter((x) => x.stableId === 'bc')[0] || {}; return [r.groupBy, r.groupWho]; }, EST);
      eq(bc, ['desk', 'Ashley Jerome'], '⚠⚠ One article recorded as a person\'s answer, with who');
      if (!(await vis('#inv-grp-bc'))) await press(tog, 'the candlestick\'s ▾ again');
      has(await txt('#inv-grp-bc'), 'it was recorded as one article by Ashley Jerome', 'the record says who answered');
      // The sideboard drawer: its record open, its count typed in the row's own Qty box.
      const tog2 = 'button[onclick="_invToggleOpen(\'sd\')"]';
      if (!(await vis('#inv-grp-sd'))) await press(tog2, 'the drawer\'s ▾');
      has(await txt('#inv-grp-sd'), 'A group with no count.', 'the drawer\'s record shows the mark before its count');
      const qty = '#inv-row-sd input.inv-qty';
      ok(await vis(qty), 'the drawer\'s Qty box is on screen');
      await p.fill(qty, '5'); await p.keyboard.press('Tab'); await p.waitForTimeout(900);
      const sd = await p.evaluate((id) => { const r = (_photoRefs[id] || []).filter((x) => x.stableId === 'sd')[0] || {}; return [r.qty, r.groupBy]; }, EST);
      eq(sd, ['5', 'desk'], '⚠⚠ the count typed in Qty answers the mark');
      has(await txt('#inv-grp-sd'), 'its count was recorded by Ashley Jerome', '⚠ and the open record says so at once, repainted by id');
      const s = await p.evaluate(() => { const el = document.getElementById('inv-summary'); return el ? el.innerText.replace(/\s+/g, ' ') : ''; });
      lacks(s, 'grouped line', '⚠ the summary counts no group apart now');
      has(s, 'Total Articles ' + (BOOKS + 12 + 8 + 1 + 6 + 2 + 5 + 1 + 6 + 6), 'and counts the drawer\'s five, the candlestick and the plates left');
      const court = await p.evaluate((id) => { const r = printCourtInventory(id, { asHtml: true }); return r && r.html ? r.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ') : ''; }, EST);
      lacks(court, 'grouped, untested', '⚠⚠ and the Court Inventory says "grouped, untested" of neither');
      ok((await overflow()) <= 0, 'no horizontal overflow with the record open (' + (await overflow()) + ')');
    });

    // ── E ──
    await section('E. 1440 and 390 px: no horizontal overflow; zero page errors', async () => {
      ok((await overflow()) <= 0, 'no horizontal overflow at 1440 (' + (await overflow()) + ')');
      await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(600);
      await toDesk();
      ok((await overflow()) <= 0, 'no horizontal overflow at 390 (' + (await overflow()) + ')');
      eq(errs, [], 'zero page errors');
    });

    await b.close();
    console.log('\n' + pass + ' passed, ' + fail + ' failed');
  } catch (e) {
    fail++;
    console.log('  ✗ threw: ' + (e && e.stack || e));
    if (b) await b.close().catch(() => {});
    console.log('\n' + pass + ' passed, ' + fail + ' failed');
  }
})();
