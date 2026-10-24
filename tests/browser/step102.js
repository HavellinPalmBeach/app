// Step 102 — A close-up after the fact: + Close-up in a line's record (2026-10-24).
//
// Anthony, off a line Agent One flagged *Look at this* for a blurred mark under a stack of plates: *"is there a workflow for
// taking a detail photo after the fact and attaching it to [the] item … saying this is the same item?"* Asked, he took
// **+ Close-up** on the line.
//
// Drives the REAL page with an active estate whose kitchen photograph carries two lines (#73 the dinner plates, on the
// photograph, with the close-up taken in the house; #81 the salad plates, split off it). Job Admin & Inv through its own nav
// button, the client through its picker, each record opened by its ▾: + Close-up on screen beside + Another item in this
// photo; pressed, the file chooser answered with a photograph (the iPad offers its camera or its library through the same
// chooser); the close-up filed under that line and no other (the manifest, the record's count and tile, the row's count),
// no line added, nothing on the line changed, the upload sent to the client's Estate Inventory folder named as a close-up;
// the salad plates' close-up on the salad plates alone; an upload that fails reads Not saved with Retry, and Retry pressed
// sends it again and the record repaints; a PDF refused by name with nothing written. At 1440 and 390 px: no horizontal
// overflow with a record open; zero page errors throughout.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step102.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const SYNC = 'https://script.example.test/exec';
const ID = 9821;
const P = ID + '_r2_inventory_plates', S = ID + '_d_salad', DP = ID + '_r2_detail_house';

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    // The Apps Script: `upload` decides what an uploadFile POST gets; every other write is accepted, every read refused.
    const net = { upload: 'ok', uploads: [] };
    await ctx.route(SYNC + '**', async (r) => {
      const req = r.request(), body = req.postData() || '';
      if (req.method() === 'POST') {
        if (/"action":"uploadFile"/.test(body)) {
          const j = JSON.parse(body);
          net.uploads.push({ folderId: j.folderId, filename: j.filename });
          if (net.upload === 'abort') return r.abort('internetdisconnected');
          const n = net.uploads.length;
          return r.fulfill({ status: 200, contentType: 'application/json',
            body: JSON.stringify({ ok: true, fileUrl: 'https://drive.google.com/file/d/cu' + n + '/view', fileId: 'cu' + n }) });
        }
        return r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
      }
      return r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":false,"error":"not in this test"}' });
    });
    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    const said = []; p.on('dialog', async (d) => { said.push(d.type() + ': ' + d.message()); await d.accept(); });
    await p.goto(APP); await p.waitForTimeout(1600);
    await p.evaluate((u) => { SHEETS_SYNC_URL = u; try { localStorage.setItem('hav_device_user', 'Ashley Jerome'); } catch (e) {} }, SYNC);
    const section = async (name, body) => {
      console.log('\n## ' + name);
      try { await body(); } catch (e) { fail++; console.log('  ✗ ' + name + ' threw: ' + String(e && e.message || e).split('\n')[0]); }
    };
    const vis = (sel) => p.locator(sel).first().isVisible().catch(() => false);
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    // A real photograph, made by the browser, to answer the chooser with.
    const jpeg = Buffer.from((await p.evaluate(() => {
      const c = document.createElement('canvas'); c.width = 320; c.height = 240;
      const g = c.getContext('2d'); g.fillStyle = '#2c4a9a'; g.fillRect(0, 0, 320, 240); g.fillStyle = '#e8c33a'; g.fillRect(100, 70, 120, 100);
      return c.toDataURL('image/jpeg', 0.9);
    })).split(',')[1], 'base64');

    // ── Seed: an active estate, the kitchen photograph carrying the dinner plates and the salad plates ──
    await p.evaluate(([ID, P, S, DP]) => {
      const T = Date.now() - 2 * 86400000;
      jobs.unshift({ id: ID, hvlId: 'HVL-2610-CU', name: 'Margaret Ellison', svc: 'cleanout', matterType: 'trust', addr: '12 Via Mizner', city: 'Palm Beach', zip: '33480',
        executor: 'Katherine Ellison', executorRole: 'Successor Trustee', executorEmail: 'kate@example.com', deathDate: '2026-05-02', executorAuth: 'received',
        trustName: 'Ellison Family Trust', docTier: 'values', gate706: 'no', status: 'active', won: true, wonAt: '2026-10-01', approved: true, tc: 'Ashley Jerome',
        created: '2026-09-28', start: '2026-10-12', activatedOn: '2026-10-10', agrApproved: true, agrSent: true, agrSigned: true, sqft: 3800,
        driveFolder: 'https://drive.google.com/drive/folders/R' + ID, driveSubfolders: { 'Estate Inventory': 'FOLDER_INV', 'As-Found Record': 'FOLDER_AF' }, at: {},
        payments: [{ uid: 'd' + ID, stage: 'deposit', amount: 12000, receivedOn: '2026-10-08', method: 'wire', clearedOn: '2026-10-08' }] });
      estimateStore[ID] = { approved: true, submitted: true, approvedBy: 'Anthony Graziano', savedAt: T,
        estimate: { jobId: ID, svc: 'cleanout', havellinTotal: 24000, fixedPrice: true, fixedAmount: 24000, fixedLines: true, totTC: 60, totPS: 90, tcRate: 150, psRate: 100, days: 5,
          vendors: [], prepItems: [], pkgCost: 0, rooms: [{ idx: 2, name: 'Kitchen', st: 'in', vol: 3, cplx: 3 }] } };
      jobPlanStore[ID] = { rooms: { 2: { status: 'locked' } }, tasks: {}, at: {} };
      const photo = { filename: 'HVL-2610-CU_Kitchen_INV_5.jpg', driveFileId: 'FID_P', driveFileUrl: 'https://drive.google.com/file/d/FID_P/view', status: 'uploaded', ts: T, roomIdx: 2, seq: 5 };
      _photoRefs[ID] = [
        Object.assign({ stableId: P, label: 'inventory', collId: null, itemNo: 73, objectName: 'Hand-painted majolica dinner plates, yellow bird and blue flower', category: 'Collectibles',
          qty: 8, disposition: 'Distribute', channel: 'Katherine Ellison', fieldNote: 'Italian plates going to Katherine', namedBy: 'agent', updatedAt: T,
          agentNotices: [{ kind: 'other', text: 'The close-up of the plate underside shows a painted script mark that is out of focus.' }] }, photo),
        Object.assign({ stableId: S, label: 'inventory', collId: null, derivedFrom: P, itemNo: 81, objectName: 'Hand-painted majolica salad plates, matching', category: 'Collectibles',
          qty: 6, namedBy: 'agent', updatedAt: T }, photo),
        { stableId: DP, label: 'detail', groupId: P, roomIdx: 2, seq: 1, filename: 'HVL-2610-CU_Kitchen_DETAIL_1.jpg', driveFileId: 'FID_DP', status: 'uploaded', ts: T + 1000, updatedAt: T },
      ];
      savePhotoRefs(ID); saveJobs(); localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore));
    }, [ID, P, S, DP]);

    const toDesk = async () => {
      await p.click('.nb[onclick*="\'inventory\'"]'); await p.waitForTimeout(800);
      const cur = String(await p.evaluate(() => (document.getElementById('inv-job') || {}).value));
      if (cur !== String(ID)) { await p.selectOption('#inv-job', String(ID)); await p.waitForTimeout(1000); }
      // Every line in view, whatever day the desk opened on.
      await p.evaluate(() => { try { setInvWhen('all'); } catch (e) {} });
      await p.waitForTimeout(400);
    };
    const openRecord = async (sid) => {
      const sel = 'button[onclick="_invToggleOpen(\'' + sid + '\')"]';
      ok(await vis(sel), 'the line\'s ▾ is on screen');
      if (!(await p.evaluate((sid) => !!document.getElementById('inv-cu-' + sid), sid))) { await p.click(sel); await p.waitForTimeout(500); }
      ok(await p.evaluate((sid) => !!document.getElementById('inv-cu-' + sid), sid), 'its record is open');
    };
    const addBtn = (sid) => '#inv-cu-' + sid + ' >> xpath=ancestor::div[contains(@style,"padding:10px 4px 12px 52px")][1] >> label.inv-cu-add';
    const choose = async (sid, file) => {
      const sel = addBtn(sid);
      ok(await vis(sel), '+ Close-up is on screen in the record');
      const [chooser] = await Promise.all([p.waitForEvent('filechooser', { timeout: 5000 }), p.click(sel)]);
      await chooser.setFiles(file);
      await p.waitForTimeout(1500);
    };
    const shots = () => p.evaluate((ID) => (_photoRefs[ID] || []).map((r) => ({ id: r.stableId, label: r.label, groupId: r.groupId || null, status: r.status, del: !!r.deletedAt,
      fileId: r.driveFileId || '', filename: r.filename || '' })), ID);
    const host = (sid) => p.evaluate((sid) => {
      const h = document.getElementById('inv-cu-' + sid);
      if (!h) return null;
      const tiles = Array.from(h.querySelectorAll('[data-cu-id]')).map((t) => ({ id: t.getAttribute('data-cu-id'), bg: !!(t.firstChild && t.firstChild.style.backgroundImage),
        state: (t.querySelector('.inv-cu-state') || {}).textContent || '' }));
      return { text: h.firstElementChild ? h.firstElementChild.textContent.trim() : '', tiles };
    }, sid);
    const rowSub = (sid) => p.evaluate((sid) => { const b = document.querySelector('button[onclick="_invToggleOpen(\'' + sid + '\')"]');
      const row = b && b.closest('[id^="inv-row-"]'); return row ? row.textContent.replace(/\s+/g, ' ') : ''; }, sid);
    const lineOf = (sid) => p.evaluate(([ID, sid]) => JSON.stringify((_photoRefs[ID] || []).find((r) => r.stableId === sid)), [ID, sid]);
    const liveLines = () => p.evaluate((ID) => _jobInvRefs(ID).map((r) => r.itemNo), ID);

    let firstAdded = null;
    // ── A ─────────────────────────────────────────────────────────────────────────────────────
    await section('A. the dinner plates (#73): + Close-up pressed, a photograph chosen, filed under #73 and nothing added', async () => {
      await toDesk();
      await openRecord(P);
      const sel = addBtn(P);
      eq(await p.locator(sel).count(), 1, 'one + Close-up in the dinner plates\' record');
      const bar = await p.evaluate((P) => { const h = document.getElementById('inv-cu-' + P);
        const rec = h && h.closest('div[style*="padding:10px 4px 12px 52px"]'); return rec ? Array.from(rec.querySelectorAll('button,label.btn-s')).map((x) => x.textContent.trim()) : []; }, P);
      ok(bar.indexOf('➕ Close-up') === bar.indexOf('➕ Another item in this photo') + 1, 'beside + Another item in this photo: ' + bar.join(' | '));
      const before = await lineOf(P), lines0 = await liveLines();
      eq((await host(P) || {}).text, 'Detail shots · 1', 'the record shows the close-up taken in the house');
      await choose(P, { name: 'IMG_0412.jpg', mimeType: 'image/jpeg', buffer: jpeg });
      const added = (await shots()).filter((s) => s.label === 'detail' && s.id !== DP);
      eq(added.length, 1, 'one close-up filed');
      firstAdded = added[0] && added[0].id;
      eq(added[0] && [added[0].groupId, added[0].status, added[0].fileId], [P, 'uploaded', 'cu1'], '⚠⚠ a close-up of #73, uploaded, its Drive id recorded');
      eq(net.uploads.map((u) => u.folderId), ['FOLDER_INV'], 'sent to the client\'s Estate Inventory folder');
      has(net.uploads[0] && net.uploads[0].filename, '_DETAIL_', 'named as a close-up in Drive');
      eq(await liveLines(), lines0, '⚠⚠ no line added: still #73 and #81');
      const after = JSON.parse(await lineOf(P)), was = JSON.parse(before);
      eq(['objectName', 'qty', 'disposition', 'channel', 'fieldNote', 'itemNo', 'reviewed'].map((k) => after[k]),
         ['objectName', 'qty', 'disposition', 'channel', 'fieldNote', 'itemNo', 'reviewed'].map((k) => was[k]), 'and nothing on #73 changed: its name, Katherine, the note, its number');
      const h = await host(P);
      eq(h && h.text, 'Detail shots · 2', 'the record counts two close-ups now');
      ok(h && h.tiles.length === 2 && h.tiles[1].id === firstAdded && h.tiles[1].bg, 'the new one drawn, with its photograph');
      eq(h && h.tiles.map((t) => t.state), ['', ''], 'neither says it is unsaved');
      has(await rowSub(P), '+2 detail shots', 'the row counts two');
      eq(said, [], 'nothing refused, nothing asked');
    });

    // ── B ─────────────────────────────────────────────────────────────────────────────────────
    await section('B. the salad plates (#81, split off the same photograph): their own close-up, on them alone', async () => {
      await openRecord(S);
      eq((await host(S) || {}).text, '', 'no close-up on the salad plates yet');
      await choose(S, { name: 'IMG_0413.jpg', mimeType: 'image/jpeg', buffer: jpeg });
      const mine = (await shots()).filter((s) => s.label === 'detail' && s.groupId === S);
      eq(mine.map((s) => s.status), ['uploaded'], '⚠ one close-up of #81, uploaded');
      eq((await host(S) || {}).text, 'Detail shots · 1', 'on the salad plates\' record');
      eq((await host(P) || {}).text, 'Detail shots · 2', 'and not added to the dinner plates\'');
      has(await rowSub(S), '+1 detail shot', 'the salad plates\' row counts it');
      // Agent Two would read it with the line, first.
      eq(await p.evaluate(([ID, S]) => invLineCloseUps(ID, _getPhotoRef(ID, S)).map((d) => d.groupId), [ID, S]), [S, P, P],
        'Agent Two reads the salad plates\' own close-up first, then the photograph\'s');
    });

    // ── C ─────────────────────────────────────────────────────────────────────────────────────
    await section('C. an upload that fails: Not saved, with Retry; Retry pressed sends it again and the record repaints', async () => {
      net.upload = 'abort';
      await choose(S, { name: 'IMG_0414.jpg', mimeType: 'image/jpeg', buffer: jpeg });
      const failed = (await shots()).filter((s) => s.label === 'detail' && s.groupId === S && s.status === 'failed');
      eq(failed.length, 1, 'the close-up is recorded, failed');
      const h = await host(S);
      eq(h && h.text, 'Detail shots · 2', 'the record counts it');
      eq(h && h.tiles.map((t) => t.state.replace(/\s+/g, ' ').trim()), ['', '⚠ Not saved Retry'], '⚠ and says it is not saved, with Retry');
      net.upload = 'ok';
      const retry = '#inv-cu-' + S + ' button:has-text("Retry")';
      ok(await vis(retry), 'Retry on screen');
      await p.click(retry); await p.waitForTimeout(1500);
      eq((await shots()).filter((s) => s.id === (failed[0] || {}).id).map((s) => s.status), ['uploaded'], 'Retry sent it: uploaded');
      const h2 = await host(S);
      eq(h2 && [h2.text, h2.tiles.map((t) => t.state)], ['Detail shots · 2', ['', '']], 'and the record repainted: no Not saved left');
      ok(h2 && h2.tiles[1] && h2.tiles[1].bg, 'the retried close-up drawn with its photograph');
    });

    // ── D ─────────────────────────────────────────────────────────────────────────────────────
    await section('D. a PDF chosen: refused by name, nothing written, nothing sent', async () => {
      const n0 = (await shots()).length, u0 = net.uploads.length;
      said.length = 0;
      await choose(P, { name: 'appraisal.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%%EOF\n') });
      has(said.join(' | '), 'That file is not a photograph', 'refused by name');
      eq([(await shots()).length, net.uploads.length], [n0, u0], 'nothing written, nothing sent');
    });

    // ── E ─────────────────────────────────────────────────────────────────────────────────────
    await section('E. the layout at 1440 and 390 px with the records open', async () => {
      eq(await overflow(), 0, 'no horizontal overflow at 1440 px');
      await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(700);
      await toDesk();
      await openRecord(P);
      ok(await vis(addBtn(P)), '+ Close-up on screen at 390 px');
      eq(await overflow(), 0, 'no horizontal overflow at 390 px');
      await p.setViewportSize({ width: 1440, height: 1000 }); await p.waitForTimeout(400);
    });

    eq(errs, [], 'zero page errors');
    await b.close();
  } catch (e) {
    fail++; console.log('  ✗ step threw: ' + (e && e.stack || e));
    if (b) await b.close().catch(() => {});
  }
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
