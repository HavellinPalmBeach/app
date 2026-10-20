// Step 93 — one client's inventory reset (2026-10-19; Anthony, the first Ellison run: "I went to the Google Drive and deleted
// all the items in the inventory spreadsheet, as well as all of the estate inventory photos. But when I log back into the
// app, all of the inventory is still there").
//
// Drives the REAL page: an active estate seeded on this device with the Items pass (a line valued by Agent Two, its close-up, a
// removed line, a typed line, the walkthrough's collection line photographed), the as-found shot and two cached thumbnails;
// the sheet answering the job's entry stamped `invResetAt` and holding the as-found shot alone (what resetInventoryConfirm
// leaves). The desk opened through the tab: every Items line gone, the collection back as a line owed its photograph and
// numbered #1, the as-found shot's thumbnail kept and the dropped line's gone, the manifest saved, no re-render loop;
// *+ Add line item* through the real button numbering on from it; the room's workspace on the Job Plan still showing the
// as-found shot and no Items; the same desk at 390 px with no overflow; zero page errors.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step93.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');
const SYNC = 'https://sync.example.test/exec';
const T0 = Date.parse('2026-10-05T15:00:00Z');       // the photographs
const RESET = Date.parse('2026-10-19T14:00:00Z');    // the reset in the editor
const EST = 9201;
const COLL = 1700000000000;                          // the walkthrough collection's id (a ms stamp, as the estimate mints them)
const PX = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';
// The as-found shot as the sheet holds it after the reset: the one record resetInventoryConfirm keeps of this fixture.
const SHEET_B1 = { stableId: 'b1', label: 'before', roomIdx: 1, seq: 1, status: 'uploaded', ts: T0, updatedAt: T0, driveFileId: 'f-b1',
  driveFileUrl: 'https://drive.google.com/file/d/f-b1/view', filename: 'b1.jpg' };

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
    const loads = [];
    await ctx.route(SYNC + '**', async (r) => {
      const json = (o) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(o) });
      const url = r.request().url();
      if (r.request().method() === 'POST') return json({ ok: true });
      if (/action=loadMedia/.test(url)) {
        loads.push(url);
        if (new RegExp('jobId=' + EST).test(url)) return json({ ok: true, media: { [EST]: { savedAt: RESET, items: [SHEET_B1], invResetAt: RESET } } });
        return json({ ok: true, media: {} });
      }
      return json({ ok: true });
    });
    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    const dialogs = []; p.on('dialog', async (d) => { dialogs.push(d.type() + ': ' + d.message()); if (d.type() === 'prompt') await d.accept('Mantel clock'); else await d.accept(); });
    await p.goto(APP); await p.waitForTimeout(1600);
    await p.evaluate((u) => { SHEETS_SYNC_URL = u; localStorage.setItem('hav_device_user', 'Ashley Jerome'); }, SYNC);
    const section = async (name, body) => {
      console.log('\n## ' + name);
      try { await body(); } catch (e) { fail++; console.log('  ✗ ' + name + ' threw: ' + String(e && e.message || e).split('\n')[0]); }
    };
    const vis = (sel) => p.locator(sel).first().isVisible().catch(() => false);
    const press = async (sel, what) => {
      const n = await p.locator(sel).count();
      const v = n >= 1 && await vis(sel);
      ok(v, (what || sel) + ' — on screen (' + n + ')');
      if (v) { await p.locator(sel).first().click({ timeout: 5000 }).catch((e) => ok(false, (what || sel) + ' — ' + e.message.split('\n')[0])); await p.waitForTimeout(500); }
      return v;
    };
    const txt = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }, sel);
    // A line's name sits in an editable box (the input's value and title), so names are read off the desk's markup.
    const html = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.innerHTML : ''; }, sel);
    // The number the desk prints beside a named line: the row's number span, found from the line's name box.
    const numberOf = (name) => p.evaluate((n) => {
      const inp = [...document.querySelectorAll('#inventory-content input[type="text"]')].find((i) => i.value === n);
      let el = inp; while (el && el !== document.body) { const sp = [...el.querySelectorAll('span')].find((s) => /^#?\d+$/.test(s.textContent.trim())); if (sp) return sp.textContent.trim(); el = el.parentElement; }
      return null;
    }, name);
    const until = async (f, ms) => { for (let i = 0; i < (ms || 8000) / 150; i++) { if (await f()) return true; await p.waitForTimeout(150); } return false; };
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const refIds = () => p.evaluate((id) => (_photoRefs[id] || []).map((r) => r.stableId).sort(), EST);
    const toDesk = async () => {
      await p.evaluate((id) => { setCurrentJob(id); populateInventorySelect(); }, EST);
      await p.click('.nb[onclick*="\'inventory\'"]'); await p.waitForTimeout(700);
      const sel = await p.evaluate(() => (document.getElementById('inv-job') || {}).value);
      if (String(sel) !== String(EST)) { await p.selectOption('#inv-job', String(EST)); await p.waitForTimeout(700); }
    };

    // ── Seed: the device as the iPad left it, the moment before the reset ─────────────────────
    await p.evaluate(([T0, EST, COLL, PX]) => {
      const base = { status: 'active', won: true, wonAt: '2026-09-17', approved: true, tc: 'Ashley Jerome', city: 'Palm Beach', zip: '33480',
        created: '2026-09-10', start: '2026-09-21', activatedOn: '2026-09-21', driveFolder: 'https://drive.google.com/drive/folders/ROOT92', docTier: 'values',
        driveSubfolders: { 'Estate Inventory': 'SUB-INV', 'As-Found Record': 'SUB-AF', 'Signed Records': 'SIGNED-92' }, updatedAt: T0 };
      const L = (id, o) => Object.assign({ stableId: id, label: 'inventory', collId: null, roomIdx: 1, seq: 1, status: 'uploaded', qty: '1',
        category: 'Furniture', condition: 'Good', ts: T0, updatedAt: T0, driveFileId: 'f-' + id, driveFileUrl: 'https://drive.google.com/file/d/f-' + id + '/view', filename: id + '.jpg' }, o);
      jobs.unshift(Object.assign({ id: EST, hvlId: 'HVL-2610-E921', name: 'Ruth Ellison', fname: 'Ruth', lname: 'Ellison', svc: 'cleanout', matterType: 'trust',
        addr: '140 Via Palma', deathDate: '2026-03-01', executorAuth: 'received', executor: 'Daniel Ellison', executorRole: 'Successor Trustee',
        executorEmail: 'daniel@ellison.example', trustName: 'The Ruth Ellison Revocable Trust', signedRecords: [] }, base));
      estimateStore[EST] = { approved: true, submitted: true, approvedBy: 'Anthony Graziano', savedAt: T0,
        estimate: { jobId: EST, svc: 'cleanout', havellinTotal: 12000, totTC: 40, totPS: 80, tcRate: 150, psRate: 100, days: 4, vendors: [], prepItems: [],
          collections: [{ id: COLL, name: 'Silver service', qty: '12', disp: 'auction', value: '2400' }],
          rooms: [{ idx: 1, name: 'Study', st: 'in' }] } };
      _photoRefs[EST] = [
        { stableId: 'b1', label: 'before', roomIdx: 1, seq: 1, status: 'uploaded', ts: T0, updatedAt: T0, driveFileId: 'f-b1', driveFileUrl: 'https://drive.google.com/file/d/f-b1/view', filename: 'b1.jpg' },
        L('k1', { itemNo: 1, objectName: 'Sideboard', fmv: '900', valuedBy: 'agent', valSource: 'General estimate', valConf: 'medium', valNotices: ['worth a specialist'], namedBy: 'agent' }),
        L('k2', { itemNo: 2, objectName: 'Hall mirror', fmv: '200', disposition: 'Sell' }),
        L('k3', { itemNo: 3, objectName: 'Drawer of cutlery', disposition: 'Undecided' }),
        { stableId: 'd1', label: 'detail', groupId: 'k1', roomIdx: 1, seq: 1, status: 'uploaded', ts: T0 + 1, updatedAt: T0 + 1, driveFileId: 'f-d1', driveFileUrl: 'https://drive.google.com/file/d/f-d1/view', filename: 'd1.jpg' },
        L('k4', { itemNo: 4, objectName: 'Broken chair', deletedAt: T0 + 5, deletedBy: 'Ashley Jerome' }),
        L('m1', { itemNo: 5, objectName: 'Typed line', manual: true, status: 'manual', driveFileId: undefined, driveFileUrl: null, filename: '' }),
        L(collectionLineId(EST, COLL), { itemNo: 6, objectName: 'Silver service', sourceCollId: COLL, ts: COLL, disposition: 'Auction', fmv: '2400' }),
      ];
      _invThumbs[EST] = { 'f-k1': PX, 'f-b1': PX };
      _invSaveThumbCache(EST);
      jobPlanStore[EST] = { rooms: { 1: { foundDone: { at: '2026-09-22', by: 'Ashley Jerome' } } }, tasks: {} };
      savePhotoRefs(EST);
      saveJobs();
    }, [T0, EST, COLL, PX]);
    const COLL_ID = await p.evaluate(([id, c]) => collectionLineId(id, c), [EST, COLL]);
    eq(await refIds(), ['b1', 'd1', 'k1', 'k2', 'k3', 'k4', 'm1', COLL_ID].sort(), 'the seed: eight records on the device');

    // ── A ───────────────────────────────────────────────────────────────────────
    await section('A. the desk opened through the tab reads the sheet\'s stamped entry: the Items pass goes, the house\'s record stays', async () => {
      await toDesk();
      ok(await until(async () => (await html('#inventory-content')).indexOf('Sideboard') < 0, 8000), 'the lines are gone from the desk once the sheet is read');
      ok(loads.some((u) => new RegExp('jobId=' + EST).test(u)), '(the desk asked the sheet for this job)');
      const desk = await html('#inventory-content');
      ['Sideboard', 'Hall mirror', 'Drawer of cutlery', 'Typed line', 'Broken chair', 'worth a specialist'].forEach((n) => lacks(desk, n, '⚠⚠ gone: ' + n));
      has(desk, 'Silver service', 'the walkthrough\'s collection is back on the inventory');
      has(desk, 'no photograph yet', '…as a line owed its photograph (collectionLinesEnsure remade it)');
      const ids = await refIds();
      eq(ids, ['b1', COLL_ID].sort(), '⚠⚠ the device holds the as-found shot and the remade collection line, nothing else');
      const coll = await p.evaluate(([id, c]) => { const r = (_photoRefs[id] || []).find((x) => x.sourceCollId === c); return r ? [r.itemNo, !!(r.driveFileId || r.filename), r.updatedAt, r.ts] : null; }, [EST, COLL]);
      eq(coll && coll[0], 1, '⚠ the remade collection line is #1: nothing older is left on the entry to number from');
      eq(coll && coll[1], false, '…and has no photograph');
      eq(coll && coll[3], COLL, '…and carries the walkthrough\'s ts, which the reset rule exempts');
      const saved = await p.evaluate((id) => JSON.parse(localStorage.getItem('hav_media_' + id) || '[]').map((r) => r.stableId).sort(), EST);
      eq(saved, ids, 'the device\'s manifest is saved as the screen shows it');
      const thumbs = await p.evaluate((id) => Object.keys(JSON.parse(localStorage.getItem('hav_media_thumb_' + id) || '{}')).sort(), EST);
      eq(thumbs, ['f-b1'], '⚠ the dropped line\'s thumbnail is off the device, the as-found shot\'s stays');
      ok(await overflow() <= 0, 'no overflow at 1440 (' + await overflow() + ')');
    });

    // ── B ───────────────────────────────────────────────────────────────────────
    await section('B. no render loop: the desk settles', async () => {
      const n = await p.evaluate(() => new Promise((res) => {
        const el = document.getElementById('inventory-content'); let count = 0;
        const mo = new MutationObserver(() => { count++; });
        mo.observe(el, { childList: true, subtree: false });
        _invRefreshFromCloud();
        setTimeout(() => { mo.disconnect(); res(count); }, 3000);
      }));
      ok(n <= 1, 'a second read of the same entry redraws the desk at most once in three seconds (' + n + ')');
      eq(await refIds(), ['b1', COLL_ID].sort(), '…and drops nothing more');
    });

    // ── C ───────────────────────────────────────────────────────────────────────
    await section('C. + Add line item through the real button numbers on from the collection\'s line', async () => {
      await press('#inv-workbar button[onclick^="addInventoryManualItem(' + EST + ')"]', '+ Add line item');
      ok(dialogs.some((d) => d.indexOf('prompt: Line item description') === 0), 'the description was asked (answered Mantel clock)');
      ok(await until(async () => (await html('#inventory-content')).indexOf('Mantel clock') >= 0, 4000), 'the typed line is on the desk');
      const no = await p.evaluate((id) => { const r = (_photoRefs[id] || []).find((x) => x.objectName === 'Mantel clock'); return r ? r.itemNo : null; }, EST);
      eq(no, 2, '⚠ it is #2: the numbers run on from the one line left (#1, the collection), never from the old high-water mark of 6');
      ok(/^#?2$/.test(String(await numberOf('Mantel clock'))), '…and the desk prints it so (' + await numberOf('Mantel clock') + ')');
    });

    // ── D ───────────────────────────────────────────────────────────────────────
    await section('D. the Job Plan\'s room still holds the as-found shot and no Items', async () => {
      await p.click('.nb[onclick*="\'job-plan\'"]'); await p.waitForTimeout(900);
      const cur = await p.evaluate(() => document.getElementById('plan-job').value);
      if (String(cur) !== String(EST)) { await p.selectOption('#plan-job', String(EST)); await p.waitForTimeout(900); }
      await press('button.rl-row[onclick="openRoomWorkspace(' + EST + ',1)"]', 'the Study\'s row');
      ok(await until(async () => (await p.evaluate(() => { const el = document.getElementById('room-ws'); return !!el && el.style.display === 'flex'; })), 4000), 'the room workspace opens');
      const heads = await p.evaluate(() => [...document.querySelectorAll('#room-ws .ws-strip-h')].map((h) => h.textContent.replace(/\s+/g, ' ').trim()));
      has(heads.join(' | '), 'As found · 1', '⚠⚠ the as-found shot is still on the room (Lock still holds)');
      ok(!heads.some((h) => /^Items/.test(h)), 'and no Items strip (' + heads.join(' | ') + ')');
      eq(await p.evaluate(() => document.querySelectorAll('#room-ws .ws-shot').length), 1, 'one tile: the as-found shot');
      await p.evaluate(() => closeRoomWorkspace());
    });

    // ── E ───────────────────────────────────────────────────────────────────────
    await section('E. the same desk on a phone', async () => {
      await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(400);
      await toDesk();
      await p.waitForTimeout(800);
      const desk = await html('#inventory-content');
      lacks(desk, 'Sideboard', 'the old lines stay gone at 390');
      has(desk, 'Silver service', 'the collection line is there');
      has(desk, 'Mantel clock', 'and the typed line');
      ok(await overflow() <= 0, 'no overflow at 390 (' + await overflow() + ')');
    });

    eq(errs, [], 'zero page errors');
    console.log('\n' + pass + ' passed, ' + fail + ' failed');
    await b.close();
    process.exit(fail ? 1 : 0);
  } catch (e) {
    console.log('step 93 threw: ' + (e && e.stack || e));
    if (b) await b.close().catch(() => {});
    process.exit(1);
  }
})();
