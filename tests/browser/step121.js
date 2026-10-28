// Step 121 — two devices on one client: stop the losses now (2026-10-27; the desk audit's P6: SYN-10, SYN-06, SYN-18, SYN-05,
// SYN-16, and SYN-01 and SYN-02 contained until the merge itself is fixed, P18).
//
// Drives TWO REAL PAGES (A, Anthony's laptop, and B, Ashley's iPad, two browser contexts) over one emulated sheet whose
// inventory merges through the real server merge (saveInventory.gs's _mergeMediaItems, lifted by vm), the agents answered by
// photograph as the audit's harness answered them. A trust estate, 24 Items photographs straight off the field.
//   A. SYN-02: A takes 8 lines off through the selection bar's Remove lines; B, whose desk has not read the sheet since, presses
//      Name 24 shots: the press reads the sheet first, Agent One is sent the 16 left, the 8 stay removed on the sheet, and the
//      confirm and the run's line say "8 removed on another device were left alone".
//   B. SYN-01: A names a line on its row; B ticks it and presses Mark reviewed: B reads first, the sheet keeps A's name with B's
//      tick, and B says what another device changed.
//   C. SYN-10: A types $275 on a line; B presses the Estate Inventory PDF: the page carries the $275.
//   D. The minute's re-read (the constant shortened for the step): B's desk shows A's change by itself, names it, and never
//      redraws under a name being typed (SYN-05: the box keeps its whole text and focus, and the whole name is what is saved).
//   E. SYN-06 and SYN-18: offline, two lines edited on B: the chip counts 2 inventory lines; the tab reloaded, the signal back:
//      the app reads the sheet at start-up and sends them, the desk never opened. And an edit made one second before a reload
//      reaches the sheet.
//   G. P6's review, EST-01 again: B opens Record approval on two lines leaving for auction; A turns one into a $24,000 gift to a
//      cousin and the minute's read lands under the open dialog; Save records the other, pinned to what the dialog showed, and
//      leaves the gift unrecorded and named.
//   H. P6's review: Set category, then Set condition a second later while the first one's read is still out: both apply.
//   I. P6's review: a read that never answers lets go (the watchdog shortened for the step): the press is refused by name, and
//      the next press reads afresh and goes.
//   J. A press whose read does not land refuses by name and changes nothing; overflow at 1440 and 390; zero page errors.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step121.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), vm = require('vm');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');

// The server's own merge, out of the repo the page came from.
const ROOT = path.join(__dirname, '..', '..');
const gs = fs.readFileSync(path.join(ROOT, 'apps-script', 'saveInventory.gs'), 'utf8');
const G = { Logger: { log() {} }, console }; vm.createContext(G); vm.runInContext(gs, G);
const J = (x) => JSON.parse(JSON.stringify(x));
const srvMerge = (a, b) => J(G._mergeMediaItems(J(a), J(b)));

const SYNC = 'https://sync.example.test/exec';
const ID = 12101;
const CAT = [['Tufted linen three-seat sofa', 'Furniture', 1], ['Pair of brass table lamps with pleated shades', 'General/Household', 2],
  ['White porcelain dinner plates', 'General/Household', 8], ['Box of hardcover novels', 'Books & Media', 1],
  ['Sterling silver candlesticks, Gorham', 'Silver & Precious Metal', 2], ['Wool area rug, Persian style, about 8 x 10', 'Rugs & Textiles', 1]];
const VALUES = { 'Furniture': 350, 'General/Household': 40, 'Books & Media': 30, 'Silver & Precious Metal': 600, 'Rugs & Textiles': 450 };

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const shared = { sheet: {}, readDown: false, mediaDown: false };
    const sheetItems = () => ((shared.sheet[String(ID)] || {}).items || []);
    const sheetLine = (id) => sheetItems().find((r) => r.stableId === id) || {};
    const liveIds = () => sheetItems().filter((r) => r.label === 'inventory' && !r.deletedAt).map((r) => r.stableId);

    async function device(tag, who, width) {
      const ctx = await b.newContext({ viewport: { width: width || 1440, height: 1000 }, timezoneId: 'America/New_York' });
      const d = { tag, ctx, net: [], dialogs: [], errs: [], answer: true };
      await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
      await ctx.route(SYNC + '**', async (r) => {
        const req = r.request();
        const json = (o) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(o) });
        let body = {}; if (req.method() === 'POST') { try { body = JSON.parse(req.postData() || '{}'); } catch (e) {} }
        const action = body.action || body.type || ((/action=([A-Za-z]+)/.exec(req.url()) || [])[1]) || '';
        d.net.push({ action, n: action === 'agentIdentify' ? (body.shots || []).length : undefined });
        // A read that takes `delay` ms to answer (the sheet as it stood when asked), or that never answers (`hang`: a connected but dead link).
        if (action === 'loadMedia') { if (shared.readDown || d.readDown) return r.abort(); if (d.hang) { d.hung = (d.hung || 0) + 1; return; }
          const snap = J(shared.sheet); if (d.delay) await new Promise((res) => setTimeout(res, d.delay)); return json({ ok: true, success: true, media: snap }); }
        if (action === 'saveMedia') {
          if (shared.mediaDown || d.mediaDown) return r.abort();
          const pl = body.payload || {}; const k = String(pl.jobId);
          shared.sheet[k] = Object.assign({}, shared.sheet[k] || {}, { items: srvMerge((shared.sheet[k] && shared.sheet[k].items) || [], pl.items || []) });
          return json({ ok: true, success: true, jobId: k });
        }
        if (action === 'agentIdentify') {
          const results = {};
          (body.shots || []).forEach((sh) => { const n = parseInt(String(sh.stableId).replace(/\D/g, ''), 10) || 0; const c = CAT[n % CAT.length];
            results[sh.stableId] = { objects: [{ name: c[0], category: c[1], qty: c[2], confidence: 'high', basis: 'Seen in the photograph.' }], notices: [], model: 'claude-fable-5-1' }; });
          return json({ ok: true, results, done: Object.keys(results), failed: {}, remaining: 0 });
        }
        if (action === 'agentRoomCheck') { const results = {}; (body.rooms || []).forEach((rm) => { results[rm.key] = { doubles: [] }; }); return json({ ok: true, results, failed: {}, remaining: [] }); }
        if (action === 'agentValue') {
          const results = {};
          (body.items || []).forEach((it) => { const per = VALUES[it.category] || 60, q = Math.max(1, parseInt(it.qty, 10) || 1);
            results[it.stableId] = { fmv: per * q, low: per * q * 0.7, high: per * q * 1.3, confidence: 'high', source: 'General estimate', basis: 'Going rate.', comps: [], lookup: '', notices: [],
              mode: it.mode || 'general', name: it.objectName || it.name || '', category: it.category, condition: 'Good', model: 'claude-fable-5-1' }; });
          return json({ ok: true, success: true, results, failed: {}, remaining: 0 });
        }
        if (action === 'getDriveThumbnails') return json({ ok: true, thumbs: {} });
        if (action === 'htmlToPdf') return json({ ok: true, base64: Buffer.from('%PDF-1.4 x').toString('base64') });
        return json({ ok: true });
      });
      const p = await ctx.newPage(); p.setDefaultTimeout(15000);
      p.on('pageerror', (e) => d.errs.push(String(e)));
      p.on('dialog', async (dl) => { d.dialogs.push(dl.type() + ': ' + dl.message());
        if (dl.type() === 'prompt') return dl.accept(dl.defaultValue() || 'Filed');
        if (dl.type() === 'confirm' && d.answer === false) return dl.dismiss(); return dl.accept(); });
      d.p = p;
      await p.goto(APP); await p.waitForTimeout(1500);
      await p.evaluate(([u, w]) => { SHEETS_SYNC_URL = u; try { localStorage.setItem('hav_sheets_url', u); localStorage.setItem('hav_device_user', w); } catch (e) {} window.open = function () { return null; };
        // What the page said in its toasts, kept for the step (the toast itself goes after 4 s).
        window.__badges = []; var _sb = showSyncBadge; showSyncBadge = function (m, e) { window.__badges.push(String(m)); return _sb(m, e); }; }, [SYNC, who]);
      d.sent = (a) => d.net.filter((x) => x.action === a);
      return d;
    }
    // The client both devices hold: a trust estate, 24 unnamed Items photographs, the estimate approved.
    const seed = (d) => d.p.evaluate((ID) => {
      const NOW = Date.now(), T = NOW - 3 * 3600000;
      const rooms = ['Living Room', 'Dining Room', 'Kitchen', 'Primary Bedroom', 'Guest Bedroom', 'Garage'];
      jobs.unshift({ id: ID, hvlId: 'HVL-2610-A' + ID, name: 'Estate of Walter Price', svc: 'cleanout', matterType: 'trust', addr: '9 Audit Way', city: 'Palm Beach', zip: '33480',
        executor: 'Daniel Price', executorRole: 'Successor Trustee', executorEmail: 'dan@example.com', deathDate: '2026-06-01', executorAuth: 'received', gate706: 'no',
        trustName: 'Price Family Trust', probateAttyName: 'Ann Lowe', probateAttyEmail: 'ann@lowe.law', docTier: 'values', status: 'active', won: true, wonAt: '2026-10-01',
        approved: true, tc: 'Ashley Jerome', sqft: 3600, created: '2026-09-28', start: '2026-10-12', activatedOn: '2026-10-10', agrApproved: true, agrSent: true, agrSigned: true,
        driveFolder: 'https://drive.google.com/drive/folders/R' + ID, driveSubfolders: { 'Estate Inventory': 'INV' + ID, 'As-Found Record': 'AF' + ID, 'Signed Records': 'SR' + ID }, at: {},
        docState: { agreement: { sentAt: '2026-10-02T14:00:00Z', sig: { signedBy: 'x', signedAt: '2026-10-03' } } },
        payments: [{ uid: 'p' + ID, stage: 'deposit', amount: 10000, receivedOn: '2026-10-05', method: 'wire', clearedOn: '2026-10-05' }] });
      estimateStore[ID] = { approved: true, submitted: true, approvedBy: 'Anthony Graziano', approvedAt: 'October 1, 2026', savedAt: T,
        estimate: { jobId: ID, svc: 'cleanout', havellinTotal: 30000, fixedPrice: true, fixedAmount: 30000, fixedLines: true, totTC: 80, totPS: 120, tcRate: 150, psRate: 100, days: 8,
          vendors: [], prepItems: [], pkgCost: 0, rooms: rooms.map((nm, i) => ({ idx: i, name: nm, st: 'in', vol: 3, cplx: 3 })) } };
      const refs = [];
      for (let k = 0; k < 24; k++) refs.push({ stableId: 's' + k, label: 'inventory', roomIdx: k % rooms.length, seq: k + 1, itemNo: k + 1, status: 'uploaded', category: '', disposition: '',
        objectName: '', ts: T + k * 30000, updatedAt: T + k * 30000, filename: 'HVL_' + ID + '_INV_' + k + '.jpg', driveFileId: 'fileid' + String(k).padStart(6, '0'),
        driveFileUrl: 'https://drive.google.com/file/d/fileid' + String(k).padStart(6, '0') + '/view' });
      _photoRefs[ID] = refs; savePhotoRefs(ID);
      saveJobs(); localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore));
      const out = {}; out[ID] = { items: JSON.parse(localStorage.getItem('hav_media_' + ID) || '[]') }; return out;
    }, ID);
    const toDesk = async (d) => {
      const p = d.p;
      await p.evaluate((id) => { setCurrentJob(id); populateInventorySelect(); }, ID);
      await p.click('.nb[onclick*="\'inventory\'"]'); await p.waitForTimeout(900);
      if (String(await p.evaluate(() => (document.getElementById('inv-job') || {}).value)) !== String(ID)) { await p.selectOption('#inv-job', String(ID)); await p.waitForTimeout(900); }
      await p.click('button[onclick="setInvWhen(\'all\')"]').catch(() => {}); await p.waitForTimeout(500);
    };
    const until = async (p, f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < (ms || 10000)) { if (await f()) return true; await p.waitForTimeout(250); } return false; };
    const txt = (p, sel) => p.evaluate((q) => { const el = document.querySelector(q); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }, sel);
    const local = (d, id) => d.p.evaluate(([j, id]) => { const r = (_photoRefs[j] || []).find((x) => x.stableId === id) || {}; return { name: r.objectName || '', fmv: r.fmv, del: !!r.deletedAt, rev: !!r.reviewed }; }, [ID, id]);
    const tick = async (d, ids) => { for (const id of ids) { const cb = await d.p.$('#inv-row-' + id + ' .inv-row-main input[type=checkbox]'); ok(!!cb, d.tag + ': #' + id + '\'s box on screen'); if (cb) { await cb.click(); await d.p.waitForTimeout(120); } } };
    const typeIn = async (d, sel, v) => { await d.p.fill(sel, v); await d.p.press(sel, 'Tab'); await d.p.waitForTimeout(700); };
    const section = async (name, body) => {
      console.log('\n## ' + name);
      try { await body(); } catch (e) { fail++; console.log('  ✗ ' + name + ' threw: ' + String(e && e.message || e).split('\n')[0]); }
    };

    const A = await device('A', 'Anthony Graziano');
    const B = await device('B', 'Ashley Jerome');
    shared.sheet = await seed(A); await seed(B);
    await toDesk(B); await toDesk(A);

    await section('A. SYN-02: a stale Name 24 shots reads the sheet first, names the 16 left and leaves the 8 the other device removed', async () => {
      const gone = ['s0', 's1', 's2', 's3', 's4', 's5', 's6', 's7'];
      await tick(A, gone);
      await A.p.click('button:has-text("Remove lines")'); await A.p.waitForTimeout(4500);
      eq([liveIds().length, gone.filter((id) => sheetLine(id).deletedAt).length], [16, 8], 'fixture: the sheet holds 16 live lines and the 8 A removed');
      const offer = await B.p.$('#inv-workbar button:has-text("Name")');
      has(offer ? (await offer.textContent()).trim() : '', 'Name 24 shots', 'fixture: B, which has not read the sheet since, offers Name 24 shots');
      const loads0 = B.sent('loadMedia').length; B.dialogs.length = 0;
      if (offer) await offer.click();
      ok(await until(B.p, async () => B.sent('agentIdentify').length > 0, 15000), 'the naming ran');
      await B.p.waitForTimeout(9000);
      ok(B.sent('loadMedia').length > loads0, '⚠⚠ the press read the sheet first');
      eq(B.sent('agentIdentify').reduce((n, x) => n + (x.n || 0), 0), 16, '⚠⚠ Agent One was sent the 16 still on the inventory (24 before P6)');
      eq(gone.filter((id) => sheetLine(id).deletedAt).length, 8, '⚠⚠ the 8 stay removed on the sheet (all came back live, named and valued, before P6)');
      eq(liveIds().length, 16, 'the sheet holds 16 live lines (26 before P6)');
      has(B.dialogs.join('\n'), 'The sheet was read first: 8 removed on another device were left alone.', 'the confirm says what the read left alone');
      has(await txt(B.p, '#inv-agent-state'), '8 removed on another device were left alone', '⚠ and so does the run\'s line');
    });

    await section('B. SYN-01 contained: a stale Mark reviewed reads first, so A\'s typed name stands with B\'s tick', async () => {
      await typeIn(A, '#inv-row-s10 .inv-name textarea', 'Henredon walnut dresser, nine drawers');
      await A.p.waitForTimeout(3500);
      eq(sheetLine('s10').objectName, 'Henredon walnut dresser, nine drawers', 'fixture: A\'s name is on the sheet');
      // B's copy may already hold it through the minute's re-read; make B stale for the measure by holding its desk off the sheet
      // until the press, as a desk left open on a phone in a dead spot would be.
      ok((await local(B, 's10')).name !== 'Henredon walnut dresser, nine drawers', 'fixture: B\'s copy does not show A\'s name yet');
      await B.p.evaluate(() => { _invPick = {}; });
      await tick(B, ['s10']);
      await B.p.click('button:has-text("Mark reviewed")'); await B.p.waitForTimeout(4000);
      const L = sheetLine('s10');
      eq([L.objectName, !!L.reviewed], ['Henredon walnut dresser, nine drawers', true], '⚠⚠ the sheet keeps A\'s name, with B\'s tick');
      eq((await local(B, 's10')).name, 'Henredon walnut dresser, nine drawers', 'and B\'s desk shows the name it read');
    });

    await section('C. SYN-10: B\'s Estate Inventory PDF carries the $275 A typed a moment ago', async () => {
      await typeIn(A, '#inv-fmv-s12', '275');
      await A.p.waitForTimeout(3500);
      eq(String(sheetLine('s12').fmv), '275', 'fixture: A\'s $275 is on the sheet');
      ok(String((await local(B, 's12')).fmv) !== '275', 'fixture: B\'s copy lacks it (' + (await local(B, 's12')).fmv + ')');
      const loads0 = B.sent('loadMedia').length;
      await B.p.evaluate(() => { const m = document.getElementById('inv-more'); if (m) m.open = false; });
      const btn = B.p.locator('#inv-workbar button:has-text("Estate Inventory PDF")').first();
      ok(await btn.isVisible().catch(() => false), 'fixture: the Estate Inventory PDF is on the work bar');
      await btn.click(); await B.p.waitForTimeout(2500);
      ok(B.sent('loadMedia').length > loads0, '⚠⚠ the paper read the sheet first (the audit\'s press made no read)');
      has(await txt(B.p, '#doc-viewer-body'), '$275', '⚠⚠ and the page carries A\'s $275');
      await B.p.click('#doc-viewer-modal button[onclick="closeDocViewer()"]').catch(() => {}); await B.p.waitForTimeout(400);
    });

    await section('D. the minute\'s re-read: B shows A\'s change by itself and says so; it never redraws under a name being typed (SYN-05)', async () => {
      await B.p.evaluate(() => { INV_DESK_REREAD_MS = 3000; _invRefreshFromCloud(); });   // the constant shortened for the step
      await B.p.waitForTimeout(1500);
      await typeIn(A, '#inv-row-s14 .inv-name textarea', 'Mahogany drop-leaf side table');
      await A.p.waitForTimeout(3000);
      ok(await until(B.p, async () => (await local(B, 's14')).name === 'Mahogany drop-leaf side table', 8000), '⚠⚠ B\'s desk shows A\'s name with no press (it read only on a tab opened or a client picked)');
      has((await B.p.evaluate(() => window.__badges || [])).join('\n'), 'From the sheet: another device changed 1 line on this client. The desk shows them now.', '⚠ and says what another device changed');
      eq(await B.p.evaluate((id) => { const t = document.querySelector('#inv-row-s14 .inv-name textarea'); return t && t.value; }), 'Mahogany drop-leaf side table', 'on the row itself');
      // B types slowly into another name while A changes something and the re-read brings it.
      const box = '#inv-row-s15 .inv-name textarea', TYPE = 'Mahogany secretary desk with glazed bookcase top and brass pulls';
      await B.p.fill(box, ''); await B.p.click(box);
      await typeIn(A, '#inv-row-s16 .inv-name textarea', 'Glass-top coffee table');
      await B.p.keyboard.type(TYPE, { delay: 140 });   // about 9 s: three re-reads land meanwhile
      const mid = await B.p.evaluate((q) => { const t = document.querySelector(q); return { v: t && t.value, focused: document.activeElement === t }; }, box);
      eq(mid, { v: TYPE, focused: true }, '⚠⚠ the box keeps every letter and its focus while the reads land (a redraw cut it to "…with glazed bo")');
      await B.p.press(box, 'Tab'); await B.p.waitForTimeout(3500);
      eq((await local(B, 's15')).name, TYPE, 'the whole name is what is saved');
      eq((await local(B, 's16')).name, 'Glass-top coffee table', 'and A\'s change is drawn once B has left the box');
      await B.p.evaluate(() => { INV_DESK_REREAD_MS = 60000; });
    });

    await section('E. SYN-06 and SYN-18: the chip counts lines; a write lost before a reload is sent at start-up; an edit a second before a reload lands', async () => {
      B.mediaDown = true;
      await typeIn(B, '#inv-row-s18 .inv-name textarea', 'Nightstand, mahogany, one drawer');
      await typeIn(B, '#inv-fmv-s19', '140');
      await B.p.waitForTimeout(4000);
      has(await txt(B.p, '#sync-pending-label'), '2 inventory lines not yet on the sheet', '⚠ the chip counts the two lines (it read "1 unsaved change")');
      // The tab reloaded with the sheet still down, so the write sent as the page goes is lost too; the signal is back once the
      // new page has loaded, and nobody opens the desk (the sweep found the write the page sends as it goes had answered this
      // check alone: the reload is now the only road left).
      await B.p.reload();
      B.mediaDown = false;
      const landed = () => sheetLine('s18').objectName === 'Nightstand, mahogany, one drawer';
      await until(B.p, async () => landed(), 15000);
      ok(landed(), '⚠⚠ the reloaded page sent the inventory at start-up from the copy it kept (nothing went before P6 until the next edit)');
      eq([sheetLine('s18').objectName, String(sheetLine('s19').fmv)], ['Nightstand, mahogany, one drawer', '140'], '⚠⚠ both lines are on the sheet');
      // An edit one second before a reload.
      await toDesk(B);
      await typeIn(B, '#inv-row-s20 .inv-name textarea', 'Oak bookcase, five shelves');
      await B.p.waitForTimeout(300);
      await B.p.reload();
      await until(B.p, async () => sheetLine('s20').objectName === 'Oak bookcase, five shelves', 15000);
      eq(sheetLine('s20').objectName, 'Oak bookcase, five shelves', '⚠⚠ the edit reached the sheet (0 writes in 20 s before P6)');
    });

    await section('G. ⚠⚠ Record approval reads first, and a read landing under its open dialog never records a signature against terms it did not show', async () => {
      await toDesk(B);
      // Both lines named and leaving to auction at Kodner, no approval yet, put on the sheet from A and read by B.
      await A.p.evaluate((ID) => {
        [['s22', 'Oil on canvas, harbour scene, signed', '2400'], ['s23', 'Pair of Chinese export vases', '1800']].forEach(([id, nm, v]) => {
          const r = _getPhotoRef(ID, id); Object.assign(r, { objectName: nm, namedBy: 'desk', category: 'Art & Décor', disposition: 'Auction', channel: 'Kodner Galleries',
            fmv: v, valSource: 'Dealer quote', valuedBy: 'desk', reviewed: true }); _invTouch(r); });
        savePhotoRefs(ID); _scheduleInventorySync(ID);
      }, ID);
      await A.p.waitForTimeout(3500);
      eq([sheetLine('s22').channel, sheetLine('s23').channel], ['Kodner Galleries', 'Kodner Galleries'], 'fixture: both on the sheet, leaving to Kodner');
      await B.p.evaluate(() => _invRefreshFromCloud()); await B.p.waitForTimeout(1500);
      await B.p.evaluate(() => { _invPick = {}; renderInventoryTab(); }); await B.p.waitForTimeout(400);
      await tick(B, ['s22', 's23']);
      const rec = B.p.locator('.inv-bulk button:has-text("Record approval")').first();
      ok(await rec.isVisible().catch(() => false), 'fixture: Record approval on the selection bar');
      const loads0 = B.sent('loadMedia').length;
      await rec.click(); await B.p.waitForTimeout(1500);
      ok(B.sent('loadMedia').length > loads0, '⚠⚠ the press read the sheet first (the one press on the bar that did not)');
      has(await txt(B.p, '#ia-body'), 'Oil on canvas, harbour scene, signed · Auction · Kodner Galleries', 'and the dialog lists the line as the sheet holds it');
      // A, on the laptop, turns #23 into a $24,000 gift to a cousin; B's minute read lands while the dialog is open.
      await A.p.evaluate((ID) => { const r = _getPhotoRef(ID, 's22'); r.disposition = 'Distribute'; r.channel = 'Cousin Pete'; r.fmv = '24000'; _invTouch(r); savePhotoRefs(ID); _scheduleInventorySync(ID); }, ID);
      await A.p.waitForTimeout(3500);
      await B.p.evaluate((ID) => { INV_DESK_REREAD_MS = 2000; _invRereadArm(ID); }, ID);
      ok(await until(B.p, async () => (await B.p.evaluate((ID) => (_getPhotoRef(ID, 's22') || {}).channel, ID)) === 'Cousin Pete', 8000),
        'fixture: the read merged the gift in under the open dialog');
      await B.p.evaluate(() => { INV_DESK_REREAD_MS = 60000; });
      has(await txt(B.p, '#ia-body'), 'Oil on canvas, harbour scene, signed · Auction · Kodner Galleries', 'fixture: the dialog still shows the auction');
      await B.p.check('#ia-fid-0');
      await B.p.fill('#ia-date', await B.p.evaluate(() => _todayStr()));
      await B.p.click('#ia-save-btn'); await B.p.waitForTimeout(4000);
      const L = await B.p.evaluate((ID) => ['s22', 's23'].map((id) => { const r = _getPhotoRef(ID, id);
        return { by: String(r.authBy || ''), ch: r.authFor ? r.authFor.channel : '', fmv: r.authFor ? r.authFor.fmv : '', ok: invApprovalComplete(r, _invJob(ID)) }; }), ID);
      eq([L[0].by, L[0].ok], ['', false], '⚠⚠ the gift is not recorded as approved, nor cleared to leave (it took the signature given for the $2,400 consignment)');
      eq(String(sheetLine('s22').authBy || ''), '', 'nor on the sheet');
      eq(L[1], { by: 'Daniel Price', ch: 'Kodner Galleries', fmv: 1800, ok: true }, 'the line whose terms stand is recorded, pinned to what the dialog showed');
      eq(String(sheetLine('s23').authBy || ''), 'Daniel Price', 'and on the sheet');
      has(await txt(B.p, '#ia-body'), 'changed since this dialog opened', '⚠ and the dialog names the line it left');
      await B.p.evaluate(() => { if (typeof closeInvApproval === 'function') closeInvApproval(); });
    });

    await section('H. ⚠⚠ two sweeps on the selection bar, the second pressed while the first one\'s read is out: both apply', async () => {
      await B.p.evaluate(() => { _invPick = {}; renderInventoryTab(); }); await B.p.waitForTimeout(400);
      await tick(B, ['s16', 's17']);
      // Neither already reads what the two sweeps set (the step's Agent Two grades every line Good, so the sweep sets Fair).
      const before = await B.p.evaluate((ID) => ['s16', 's17'].map((id) => { const r = _getPhotoRef(ID, id) || {}; return [r.category || '', r.condition || '']; }), ID);
      ok(before.every(([c, k]) => c !== 'Furniture' && k !== 'Fair'), 'fixture: neither line is Furniture or Fair yet (' + JSON.stringify(before) + ')');
      B.delay = 3000; B.dialogs.length = 0;
      const cat = await B.p.$('.inv-bulk select[onchange*="\'category\'"]');
      const cond = await B.p.$('.inv-bulk select[onchange*="\'condition\'"]');
      ok(!!cat && !!cond, 'fixture: Set category and Set condition on the selection bar');
      if (cat && cond) {
        await cat.selectOption('Furniture');
        await B.p.waitForTimeout(1200);
        await cond.selectOption('Fair');
      }
      await B.p.waitForTimeout(8000);
      B.delay = 0;
      const loc = await B.p.evaluate((ID) => ['s16', 's17'].map((id) => { const r = _getPhotoRef(ID, id) || {}; return [r.category || '', r.condition || '']; }), ID);
      eq(loc, [['Furniture', 'Fair'], ['Furniture', 'Fair']], '⚠⚠ both sweeps are on the lines (the condition was dropped with no word)');
      eq(['s16', 's17'].map((id) => [sheetLine(id).category, sheetLine(id).condition]), [['Furniture', 'Fair'], ['Furniture', 'Fair']], 'and on the sheet');
      eq(B.dialogs, [], 'nothing refused');
    });

    await section('I. ⚠ a read that never answers lets go: the press is refused by name, and the next press reads afresh', async () => {
      await B.p.evaluate(() => { INV_READ_WATCHDOG_MS = 4000; _invPick = {}; renderInventoryTab(); }); await B.p.waitForTimeout(400);
      await tick(B, ['s13']);
      B.hang = true; B.dialogs.length = 0;
      await B.p.click('button:has-text("Remove lines")'); await B.p.waitForTimeout(2000);
      eq(B.dialogs, [], 'fixture: nothing said while the read is out');
      await B.p.waitForTimeout(3500);
      has(B.dialogs.join('\n'), 'Not done: Remove lines reads the inventory from the sheet first, so that nothing acts on a copy another device has moved past, and the sheet did not answer.',
        '⚠⚠ after the watchdog the press is refused by name (one toast, then every later press did nothing until the request died)');
      B.hang = false; B.dialogs.length = 0;
      const loads0 = B.sent('loadMedia').length;
      await B.p.click('button:has-text("Remove lines")'); await B.p.waitForTimeout(4000);
      ok(B.sent('loadMedia').length > loads0, '⚠ the signal back, the next press asks the sheet afresh');
      ok(!!sheetLine('s13').deletedAt, 'and the line is removed');
      await B.p.evaluate(() => { INV_READ_WATCHDOG_MS = 30000; });
    });

    await section('J. a press whose read does not land refuses by name; no overflow; zero page errors', async () => {
      await toDesk(B);
      B.readDown = true; B.dialogs.length = 0;
      const id0 = B.sent('agentIdentify').length;
      await B.p.evaluate((id) => agentNameShots(id), ID);   // the work bar offers none: every photograph is named
      await B.p.waitForTimeout(1500);
      await B.p.evaluate(() => { _invPick = {}; }); await tick(B, ['s21']);
      await B.p.click('button:has-text("Remove lines")'); await B.p.waitForTimeout(1500);
      has(B.dialogs.join('\n'), 'Not done: Remove lines reads the inventory from the sheet first, so that nothing acts on a copy another device has moved past, and the sheet did not answer. Nothing was changed.',
        '⚠ Remove lines refuses by name');
      eq([B.sent('agentIdentify').length, (await local(B, 's21')).del], [id0, false], 'nothing was named and nothing removed');
      // The minute's read fails too: the work bar says the copy is this device's own, under its count.
      await B.p.evaluate(() => _invRefreshFromCloud()); await B.p.waitForTimeout(1500);
      has(await txt(B.p, '#inv-workbar .inv-stale'), 'sheet not answering since', '⚠ the work bar says the sheet is not answering and since when');
      has(await txt(B.p, '#inv-workbar .inv-stale'), ': this device’s copy', 'and that what is shown is this device\'s copy');
      B.readDown = false;
      await B.p.evaluate(() => _invRefreshFromCloud()); await B.p.waitForTimeout(1500);
      eq(await txt(B.p, '#inv-workbar .inv-stale'), '', 'and stops saying so once a read lands');
      for (const w of [1440, 390]) {
        await B.p.setViewportSize({ width: w, height: 900 }); await B.p.waitForTimeout(500);
        eq(await B.p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 0, 'no horizontal overflow at ' + w);
      }
      eq(A.errs.concat(B.errs), [], 'zero page errors on either page');
    });
  } catch (e) { fail++; console.log('  ✗ threw: ' + (e && e.stack || e)); }
  if (b) await b.close().catch(() => {});
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
})();
