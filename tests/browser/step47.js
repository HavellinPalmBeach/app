// Step 47 — P16, the inventory desk (2026-09-30, workstream W3).
//
// Drives the REAL page through its own controls: the Job Admin & Inv desk (the row's ▾, the line's
// record, the bulk bar, the workbar and its More menu, Remove line, Removed items), the Job Plan's
// room card and room workspace, and the in-page camera itself — Chromium's fake camera device stands
// in for the phone's, so the shots are taken by the real shutter and uploaded by the real path. The
// Apps Script URL is answered by a route: an upload is ABORTED (the phone with no signal) or answered
// as the real script would answer it. What is seeded is state a person could not type in one sitting
// (a won estate with a manifest, an approved estimate with its rooms).
//
//   A. A5: a firearm going to a named person records its dealer route through the line's record (the
//      prompt names the dealer), the Approval Request names the route, the bulk bar records the signed
//      authority, and the worklist then clears it to carry; an NFA line is offered no route and stays
//      blocked; the route survives a reload
//   B. B22b: Remove line on a photographed line and on a split one (the photograph stays, the split
//      line keeps it); a cancelled confirm removes nothing; Removed items names who; the sheet is sent
//      the tombstone; after a reload a stale copy from the sheet does not bring the line back; Restore
//   C. B11: a detail shot taken with no signal gets a tile with Retry and 🗑 in the room; Retry lands it
//      and the room card's "⚠ not saved" clears; a second failed detail is binned the same way
//   D. B10: a living client's Approval Request carries no "not yet valued … under oath" notice
//   E. B12: the living bulk bar offers no valuation source; the estate one does
//   F. B22a: the None tier's workbar draws Approval Request once; Share w/ Counsel names both folders;
//      the Job Plan names a walkthrough collection waiting for its photograph (P24; it named the import tab)
//   G. overflow at 1440 and 390 (the desk with a record open, the room workspace); the Approval
//      Request under print media at Letter width; no page errors
//
//   NODE_PATH=/opt/node22/lib/node_modules node tests/browser/step47.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');

const SYNC = 'https://sync.example.test/exec';
const T0 = Date.parse('2026-09-24T15:00:00Z');   // a past day, so each desk opens on All

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
      args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
    await ctx.grantPermissions(['camera']).catch(() => {});
    // The Apps Script, as a route. `upload` decides what an uploadFile POST gets; `media` is what a
    // loadMedia GET hands back (the sheet's copy of a manifest); every other write is accepted.
    const net = { upload: 'abort', media: {}, posts: [], gets: [] };
    await ctx.route(SYNC + '**', async (r) => {
      const req = r.request();
      const body = req.postData() || '';
      if (req.method() === 'POST') {
        net.posts.push(body);
        if (/"action":"uploadFile"/.test(body)) {
          if (net.upload === 'abort') return r.abort('internetdisconnected');
          const n = net.posts.length;
          return r.fulfill({ status: 200, contentType: 'application/json',
            body: JSON.stringify({ ok: true, fileUrl: 'https://drive.google.com/file/d/up' + n + '/view', fileId: 'up' + n }) });
        }
        return r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
      }
      net.gets.push(req.url());
      const m = /action=loadMedia&jobId=(\d+)/.exec(req.url());
      if (m && net.media[m[1]]) {
        return r.fulfill({ status: 200, contentType: 'application/json',
          body: JSON.stringify({ ok: true, media: { [m[1]]: { items: net.media[m[1]] } } }) });
      }
      return r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":false,"error":"not in this test"}' });
    });
    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    // Dialogs answer from a queue: a prompt takes the next string, a confirm the next 'yes'/'no'.
    const dialogs = [], answers = [];
    p.on('dialog', async (d) => {
      dialogs.push(d.type() + ': ' + d.message());
      if (d.type() === 'prompt') { const a = answers.shift(); await d.accept(a == null ? '' : a); return; }
      if (d.type() === 'confirm') { const a = answers.shift(); if (a === 'no') await d.dismiss(); else await d.accept(); return; }
      await d.accept();
    });
    const hookPrint = () => p.evaluate(() => { window.open = function () { return null; }; window.__prints = window.__prints || [];
      window.print = function () { const pt = document.getElementById('print-target');
        window.__prints.push({ html: pt ? pt.innerHTML : '', over: document.documentElement.scrollWidth - document.documentElement.clientWidth }); }; });
    const boot = async () => {
      await p.waitForTimeout(1600);
      await hookPrint();
      await p.evaluate((u) => { SHEETS_SYNC_URL = u; }, SYNC);
    };
    await p.goto(APP); await boot();

    const section = async (name, body) => {
      console.log('\n## ' + name);
      try { await body(); } catch (e) { fail++; console.log('  ✗ ' + name + ' threw: ' + String(e && e.message || e).split('\n')[0]); }
    };
    const vis = (sel) => p.locator(sel).first().isVisible().catch(() => false);
    const press = async (sel, what) => {
      const n = await p.locator(sel).count();
      const v = n === 1 && await vis(sel);
      ok(v, (what || sel) + ' — one control, on screen (' + n + ')');
      if (v) { await p.click(sel, { timeout: 5000 }).catch((e) => ok(false, (what || sel) + ' — ' + e.message.split('\n')[0])); await p.waitForTimeout(400); }
      return v;
    };
    const txt = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }, sel);
    const T = (h) => p.evaluate((h) => { const d = document.createElement('div');
      d.innerHTML = String(h).replace(/<\/td>/g, ' </td>').replace(/<br>/g, ' '); return d.textContent.replace(/\s+/g, ' '); }, h);
    const lastPrint = () => p.evaluate(() => (window.__prints || []).slice(-1)[0] || { html: '', over: 0 });
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const toDesk = async (id) => {
      await p.evaluate((id) => { setCurrentJob(id); populateInventorySelect(); }, id);
      await p.click('.nb[onclick*="\'inventory\'"]'); await p.waitForTimeout(700);
      const sel = await p.evaluate(() => (document.getElementById('inv-job') || {}).value);
      if (String(sel) !== String(id)) { await p.selectOption('#inv-job', String(id)); await p.waitForTimeout(700); }
    };
    const rowText = (sid) => txt('#inv-row-' + sid);
    const deskRows = () => p.evaluate(() => Array.from(document.querySelectorAll('[id^="inv-row-"]')).filter((e) => e.checkVisibility()).map((e) => e.id.slice(8)));

    // ── Seed: an estate with a manifest, a living client, a None-tier estate, and a won cleanout ──
    const seed = () => p.evaluate((T0) => {
      const base = { status: 'active', won: true, wonAt: '2026-09-17', approved: true, tc: 'Ashley Jerome',
                     city: 'Palm Beach', zip: '33480', created: '2026-09-10', start: '2026-09-21', driveFolder: 'FOLDER',
                     driveSubfolders: { 'Estate Inventory': 'SUB-INV', 'As-Found Record': 'SUB-AF' } };
      const L = (id, o) => Object.assign({ stableId: id, label: 'inventory', collId: null, roomIdx: 1, seq: 1, status: 'uploaded',
        category: 'Furniture', ts: T0, updatedAt: T0, driveFileId: 'f-' + id, driveFileUrl: 'https://drive.google.com/file/d/f-' + id + '/view' }, o);
      const est = (id, svc, extra) => ({ approved: true, submitted: true, approvedBy: 'Anthony Graziano', savedAt: T0,
        estimate: Object.assign({ jobId: id, svc, havellinTotal: 20000, totTC: 40, totPS: 80, days: 4, collections: [], vendors: [], prepItems: [],
          rooms: [{ idx: 1, name: 'Study', st: 'in' }, { idx: 4, name: 'Kitchen', st: 'in' }] }, extra || {}) });
      jobs.unshift(
        Object.assign({ id: 4701, hvlId: 'HVL-2609-E471', name: 'Tripp Butler', fname: 'Tripp', lname: 'Butler', svc: 'probate',
          addr: '69 Beach Blvd', executor: 'Margaret Butler', deathDate: '2026-04-02', matterType: 'probate', docTier: 'values' }, base),
        Object.assign({ id: 4703, hvlId: 'HVL-2609-L473', name: 'Margaret Ellsworth', fname: 'Margaret', lname: 'Ellsworth',
          svc: 'downsizing_move', addr: '14 Coconut Row', destAddr: '801 Sunset Ave' }, base),
        Object.assign({ id: 4704, hvlId: 'HVL-2609-N474', name: 'Harold Finch', fname: 'Harold', lname: 'Finch', svc: 'probate',
          addr: '3 Ocean Blvd', executor: 'Ann Finch', deathDate: '2026-05-01', matterType: 'probate', docTier: 'none' }, base),
        Object.assign({ id: 4702, hvlId: 'HVL-2609-C472', name: 'Dora Fields', fname: 'Dora', lname: 'Fields', svc: 'home_cleanout',
          addr: '7 Palm Way' }, base));
      estimateStore[4701] = est(4701, 'probate');
      estimateStore[4703] = est(4703, 'downsizing_move');
      estimateStore[4704] = est(4704, 'probate');
      estimateStore[4702] = est(4702, 'home_cleanout', { collections: [{ id: 11, name: 'Silver service', disp: 'appraise', qty: 1, value: '2000' }] });
      _photoRefs[4701] = [
        L('g1', { itemNo: 1, objectName: 'Remington 870', category: 'Firearms', serial: 'RS12345678', disposition: 'Distribute', channel: 'Marie Delgado (daughter)' }),
        L('n1', { itemNo: 2, objectName: 'Suppressor', category: 'Firearms', serial: 'SX-1', disposition: 'Distribute', channel: 'Tom Butler (son)', flagNFA: true }),
        L('s1', { itemNo: 3, objectName: 'Oak sideboard', disposition: 'Keep' }),
        L('bc', { itemNo: 4, objectName: 'Bar console', disposition: 'Keep', driveFileId: 'f-bar' }),
        L('bk', { itemNo: 5, objectName: 'Banksy print', disposition: 'Keep', derivedFrom: 'bc', driveFileId: 'f-bar' }),
        L('lp', { itemNo: 6, objectName: 'Brass lamp', disposition: 'Donate' }),
      ];
      _photoRefs[4703] = [
        L('pt', { itemNo: 1, objectName: 'Oil painting', category: 'Art & Décor', disposition: 'Auction', needsAppr: true }),
        L('lm', { itemNo: 2, objectName: 'Floor lamp', disposition: 'Donate' }),
      ];
      _photoRefs[4704] = [L('x1', { itemNo: 1, objectName: 'Dining table', disposition: 'Sell' })];
      _photoRefs[4702] = [];
      [4701, 4703, 4704, 4702].forEach((id) => savePhotoRefs(id));
      saveJobs();
      // The estimates persist the way the app keeps them, so a reload finds them.
      localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore));
    }, T0).catch((e) => { ok(false, 'seed: ' + e.message.split('\n')[0]); });
    await seed();

    // ── A. the dealer route ────────────────────────────────────────────────
    await section('A. a firearm going to a person records its dealer route, and is carried only once authorised', async () => {
      await toDesk(4701);
      eq((await deskRows()).length, 6, 'fixture: the estate desk shows its six lines');
      has(await rowText('g1'), 'no dealer route', 'the Remington\'s row says its route is missing');
      lacks(await rowText('n1'), 'dealer route', 'the NFA line\'s row asks for no route');
      await press('button[onclick="_invToggleOpen(\'g1\')"]', 'the Remington\'s ▾');
      const rec = await txt('#inv-row-g1');
      has(rec, 'Not cleared to carry: Going to a named person', 'its record says it is held, and why');
      answers.push('Palm Beach Arms (FFL)');
      await press('button[onclick="invSetDealerRoute(4701,\'g1\',true)"]', 'Through a licensed dealer…');
      has(dialogs.join(' | '), 'on its way to Marie Delgado (daughter)', 'the prompt names the person it is going to');
      const rec2 = await txt('#inv-row-g1');
      has(rec2, 'To Marie Delgado (daughter), through Palm Beach Arms (FFL), a licensed dealer', '⚠⚠ the record names the route');
      has(rec2, 'recorded by Ashley Jerome', 'and who recorded it');
      has(rec2, 'Not cleared to carry: No written authority on file', 'authority is still required');
      has(rec2, 'via Palm Beach Arms (FFL)', 'the row names the route');
      // The NFA line: no route offered, still blocked.
      await press('button[onclick="_invToggleOpen(\'n1\')"]', 'the Suppressor\'s ▾');
      eq(await p.locator('button[onclick="invSetDealerRoute(4701,\'n1\',true)"]').count(), 0, '⚠⚠ an NFA line is offered no route');
      has(await txt('#inv-row-n1'), 'NFA item — never transported by Havellin', 'and says it never travels');
      // The Approval Request names the route on the line the representative initials.
      await press('#inv-workbar button[onclick="printApprovalRequest(4701)"]', 'Approval Request');
      await p.waitForTimeout(400);
      const req = await T((await lastPrint()).html);
      has(req, 'through Palm Beach Arms (FFL), a licensed dealer', '⚠⚠ the Approval Request names the dealer route');
      has(req, 'A firearm going to a named person goes to the dealer as well', 'and its firearms note says how a firearm reaches a person');
      // The representative signs; the desk records it with the bulk bar.
      await p.click('#inv-row-g1 input[type=checkbox]'); await p.waitForTimeout(300);
      await p.click('#inv-row-n1 input[type=checkbox]'); await p.waitForTimeout(300);
      // RESTATED 2026-10-03 (P19): Record approval is a dialog with a tick for each fiduciary on the job (here the one
      // representative, Margaret Butler) and the date, not two prompts. The approval it records is the same.
      await press('button[onclick="invRecordApproval(4701)"]', 'Record approval on the bulk bar');
      await p.check('#ia-fid-0').catch((e) => ok(false, 'the representative\'s tick — ' + e.message.split('\n')[0]));
      await p.fill('#ia-date', '2026-09-30').catch((e) => ok(false, 'the date — ' + e.message.split('\n')[0]));
      await press('#ia-save-btn', 'Record approval in the dialog');
      await press('#ia-actions button[onclick="closeInvApproval()"]', 'Done');
      has(await txt('#inv-row-g1'), 'Cleared to carry. Havellin’s named principal alone takes it to Palm Beach Arms (FFL)',
          '⚠⚠ with the authority recorded the firearm is cleared to carry, to the dealer on its route');
      has(await txt('#inv-row-n1'), 'NFA item — never transported by Havellin', 'the NFA item is not, authority or no authority');
      await press('#inv-workbar details > summary', 'More');
      await press('#inv-workbar button[onclick="printAppraisalWorklist(4701)"]', 'Appraisal Worklist');
      await p.waitForTimeout(400);
      const wl = await T((await lastPrint()).html);
      has(wl, '1 cleared to carry.', 'the worklist clears one firearm to carry');
      has(wl, '#1 Remington 870 · RS12345678 · to Marie Delgado (daughter), through Palm Beach Arms (FFL), a licensed dealer', 'naming its route');
      has(wl, '#2 Suppressor — NFA item — never transported by Havellin', 'and blocks the NFA item');
      // A reload keeps the route (its keys are on the save whitelist).
      await p.reload(); await boot();
      await toDesk(4701);
      has(await rowText('g1'), 'via Palm Beach Arms (FFL)', '⚠ the route survives a reload');
    });

    // ── B. Remove line ─────────────────────────────────────────────────────
    await section('B. Remove line: the line goes, the photograph stays, and a stale copy cannot bring it back', async () => {
      await toDesk(4701);
      await press('button[onclick="_invToggleOpen(\'lp\')"]', 'the lamp\'s ▾');
      answers.push('no');
      await press('button[onclick="invRemoveLine(4701,\'lp\')"]', 'Remove line on the lamp, then Cancel');
      ok((await deskRows()).indexOf('lp') >= 0, 'a cancelled confirm removes nothing');
      await press('button[onclick="_invToggleOpen(\'s1\')"]', 'the sideboard\'s ▾');
      dialogs.length = 0; answers.push('yes');
      await press('button[onclick="invRemoveLine(4701,\'s1\')"]', 'Remove line on the sideboard');
      has(dialogs.join(' | '), 'Remove item #3 — Oak sideboard?', 'it asks first, naming the line');
      has(dialogs.join(' | '), 'The photograph is not deleted', 'and says the photograph stays');
      ok((await deskRows()).indexOf('s1') < 0, '⚠⚠ the photographed line is off the desk');
      // A split: the console's line goes, the Banksy keeps the photograph.
      await press('button[onclick="_invToggleOpen(\'bc\')"]', 'the bar console\'s ▾');
      dialogs.length = 0; answers.push('yes');
      await press('button[onclick="invRemoveLine(4701,\'bc\')"]', 'Remove line on the console');
      has(dialogs.join(' | '), 'the 1 other line that share it keep it', 'the question names the line that shares the photograph');
      const bk = await p.evaluate(() => { const r = _photoRefs[4701].find((x) => x.stableId === 'bk'); return [!!r.deletedAt, r.driveFileId]; });
      eq(bk, [false, 'f-bar'], 'the Banksy stays, with the photograph');
      ok(await p.evaluate(() => document.querySelector('#inv-row-bk [data-thumb-id="f-bar"]') !== null), 'and still draws it');
      const removed = await txt('#inventory-content');
      has(removed, 'Removed items', 'Removed items lists them');
      has(removed, 'Oak sideboard', 'the sideboard among them');
      has(removed, 'by Ashley Jerome', 'with who removed it');
      // The sheet is told (the manifest write is debounced).
      await p.waitForTimeout(3200);
      ok(net.posts.some((x) => /"action":"saveMedia"|"type":"saveMedia"/.test(x) && /"stableId":"s1"[^}]*"deletedAt":\d+/.test(x)),
         'the manifest sent to the sheet carries the tombstone');
      // A reload, and a stale copy from the sheet: the sideboard with no tombstone and an older clock.
      net.media['4701'] = [{ stableId: 's1', label: 'inventory', collId: null, roomIdx: 1, itemNo: 3, objectName: 'Oak sideboard',
        category: 'Furniture', disposition: 'Keep', ts: T0, updatedAt: T0, driveFileId: 'f-s1', status: 'uploaded' }];
      await p.reload(); await boot();
      await toDesk(4701);
      await p.waitForTimeout(1200);
      ok(net.gets.some((u) => /action=loadMedia&jobId=4701/.test(u)) && await p.evaluate(() => !!_invCloudSeen[4701]),
         'fixture: the desk fetched the sheet\'s copy of this manifest, and merged it');
      ok((await deskRows()).indexOf('s1') < 0, '⚠⚠ after a reload and a stale copy from the sheet, the line stays removed');
      eq(await p.evaluate(() => { const r = _photoRefs[4701].find((x) => x.stableId === 's1'); return [!!r.deletedAt, r.deletedBy]; }),
         [true, 'Ashley Jerome'], 'with its tombstone and who removed it');
      // Restore gives it back under its own number.
      await press('button[onclick="restoreInventoryItem(4701,\'s1\')"]', 'Restore on the sideboard');
      ok((await deskRows()).indexOf('s1') >= 0, 'Restore brings the line back');
      has(await rowText('s1'), '3', 'under its own number');
    });

    // ── C. a failed detail shot ────────────────────────────────────────────
    await section('C. a detail shot taken with no signal can be retried and binned from the room', async () => {
      net.upload = 'abort';
      await p.evaluate(() => openJobPlanFor(4702)); await p.waitForTimeout(900);
      await press('#plan-rooms-4702 .rl-row[onclick="openRoomWorkspace(4702,1)"]', 'the Study\'s room card');
      await press('#room-ws .ws-cam[onclick="openFieldCamera(4702,1,\'inventory\')"]', 'the Items camera');
      await p.waitForFunction(() => { const s = document.querySelector('#field-cam .fc-shutter:not(.fc-closeup)'); return s && !s.disabled; }, null, { timeout: 8000 }).catch(() => {});
      await press('#field-cam .fc-shutter:not(.fc-closeup)', 'the shutter (an item)');
      await p.waitForTimeout(1500);
      // ⚠ RESTATED (P25, Q41): a close-up is one press of its own shutter, Close-up, not the toggle and then the shutter.
      await press('#field-cam .fc-closeup', 'Close-up (a detail of it)');
      await p.waitForTimeout(2500);
      await press('#field-cam .fc-done', 'Done');
      const shots = await p.evaluate(() => (_photoRefs[4702] || []).map((r) => ({ id: r.stableId, label: r.label, status: r.status })));
      const det = shots.find((s) => s.label === 'detail');
      const item = shots.find((s) => s.label === 'inventory');
      ok(det && det.status === 'failed' && item && item.status === 'failed', 'fixture: both shots failed to upload (' + JSON.stringify(shots) + ')');
      has(await txt('#plan-rooms-4702'), 'not saved', 'fixture: the room card reads "⚠ not saved"');
      const strip = await txt('#room-ws .ws-strip');
      has(strip, 'Detail shots not saved · 1', '⚠⚠ the failed detail shot has a tile in the room');
      has(strip, 'Detail of Item', 'naming the object it is a close-up of');
      // Retry, with a signal: the detail lands and its tile goes.
      net.upload = 'ok';
      await press('#room-ws button[onclick="retryPhotoUpload(4702,\'' + (det && det.id) + '\')"]', 'the detail\'s Retry');
      await p.waitForTimeout(1200);
      eq(await p.evaluate((id) => (_photoRefs[4702].find((r) => r.stableId === id) || {}).status, det && det.id), 'uploaded', 'Retry filed the detail shot');
      lacks(await txt('#room-ws .ws-strip'), 'Detail shots not saved', 'and its tile is gone');
      await press('#room-ws button[onclick="retryPhotoUpload(4702,\'' + (item && item.id) + '\')"]', 'the item\'s Retry');
      await p.waitForTimeout(1200);
      lacks(await txt('#plan-rooms-4702'), 'not saved', '⚠⚠ and the room card stops reading "not saved"');
      // A second failed detail, binned.
      await press('#room-ws .ws-cam[onclick="openFieldCamera(4702,1,\'inventory\')"]', 'the Items camera again');
      await p.waitForFunction(() => { const s = document.querySelector('#field-cam .fc-shutter:not(.fc-closeup)'); return s && !s.disabled; }, null, { timeout: 8000 }).catch(() => {});
      await press('#field-cam .fc-shutter:not(.fc-closeup)', 'the shutter (a second item, with a signal)');
      await p.waitForTimeout(1500);
      net.upload = 'abort';
      await press('#field-cam .fc-closeup', 'Close-up (its detail, with no signal)');
      await p.waitForTimeout(2500);
      await press('#field-cam .fc-done', 'Done');
      const det2 = await p.evaluate(() => ((_photoRefs[4702] || []).filter((r) => r.label === 'detail' && r.status === 'failed')[0] || {}).stableId);
      ok(!!det2, 'fixture: the second detail failed');
      has(await txt('#plan-rooms-4702'), 'not saved', 'fixture: "not saved" again');
      answers.push('yes');
      await press('#room-ws .ws-del[onclick="discardShot(4702,\'' + det2 + '\')"]', 'the failed detail\'s 🗑');
      await p.waitForTimeout(500);
      ok(await p.evaluate((id) => !!(_photoRefs[4702].find((r) => r.stableId === id) || {}).deletedAt, det2), 'the bin takes it');
      lacks(await txt('#plan-rooms-4702'), 'not saved', '⚠ and "not saved" clears');
      await p.evaluate(() => closeRoomWorkspace()); await p.waitForTimeout(300);
      // RESTATED P24: a collection is no longer brought in by hand. The Job Plan names it as waiting for its photograph and
      // says where it is taken; the import banner (vehicles only now) does not appear for a collection.
      has(await txt('#job-plan-content'), '1 collection from the walkthrough is not photographed yet: Silver service',
          'the Job Plan names the collection waiting for its photograph');
      has(await txt('#job-plan-content'), 'open the room it is in and tap it beside the cameras',
          'and where it is taken');
      lacks(await txt('#job-plan-content'), 'Bring them in on the Job Admin & Inv tab', 'with no import to press');
    });

    // ── D. a living client's Approval Request ──────────────────────────────
    await section('D. a living client\'s Approval Request carries no valuation notice', async () => {
      await toDesk(4703);
      await press('#inv-workbar button[onclick="printApprovalRequest(4703)"]', 'Approval Request (living)');
      await p.waitForTimeout(400);
      const req = await T((await lastPrint()).html);
      has(req, 'Oil painting', 'fixture: the painting is on the request');
      lacks(req, 'reported under oath', '⚠⚠ no "reported under oath" on a living client\'s request');
      lacks(req, 'has not been valued yet', 'and no valuation notice at all');
    });

    // ── E. the bulk bar ────────────────────────────────────────────────────
    await section('E. the living bulk bar offers no valuation source', async () => {
      await toDesk(4703);
      await p.click('#inv-row-pt input[type=checkbox]'); await p.waitForTimeout(400);
      const living = await txt('#inventory-content');
      has(living, 'Set disposition', 'fixture: the bulk bar is up');
      lacks(living, 'Set valuation source', '⚠⚠ a living job\'s bulk bar does not offer the valuation source');
      await p.evaluate(() => _invClearPicks());
      await toDesk(4701);
      await p.click('#inv-row-lp input[type=checkbox]'); await p.waitForTimeout(400);
      has(await txt('#inventory-content'), 'Set valuation source', 'an estate\'s bulk bar still does');
      await p.evaluate(() => _invClearPicks());
    });

    // ── F. the workbar ─────────────────────────────────────────────────────
    await section('F. the None tier draws Approval Request once; Share w/ Counsel names both folders', async () => {
      await toDesk(4704);
      eq(await p.locator('#inv-workbar button[onclick="printApprovalRequest(4704)"]').count(), 1, '⚠⚠ one Approval Request button at the None tier');
      await toDesk(4701);
      const t = await p.evaluate(() => { const bt = document.querySelector('#inv-workbar button[onclick="shareInventoryWithCounsel(4701)"]'); return bt ? bt.title : ''; });
      has(t, 'Estate Inventory and As-Found Record Drive folders', 'Share w/ Counsel names both photograph folders');
    });

    // ── G. overflow, print, errors ─────────────────────────────────────────
    await section('G. overflow at 1440 and 390; the Approval Request at Letter width in print; no page errors', async () => {
      await toDesk(4701);
      await p.click('button[onclick="_invToggleOpen(\'g1\')"]').catch(() => {}); await p.waitForTimeout(300);
      ok(await overflow() <= 0, 'the desk with a firearm\'s record open fits at 1440 (' + await overflow() + ')');
      await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(400);
      ok(await overflow() <= 0, 'and at 390 (' + await overflow() + ')');
      await p.evaluate(() => { openJobPlanFor(4702); }); await p.waitForTimeout(600);
      await p.evaluate(() => openRoomWorkspace(4702, 1)); await p.waitForTimeout(400);
      ok(await overflow() <= 0, 'the room workspace fits at 390 (' + await overflow() + ')');
      await p.evaluate(() => closeRoomWorkspace());
      await p.setViewportSize({ width: 816, height: 1056 });
      await toDesk(4701);
      await p.emulateMedia({ media: 'print' });
      await p.evaluate(() => printApprovalRequest(4701, false)); await p.waitForTimeout(500);
      const pr = await lastPrint();
      ok(pr.html.length > 0 && pr.over <= 0, 'the Approval Request fits a Letter page in print (' + pr.over + ')');
      await p.emulateMedia({ media: 'screen' });
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
