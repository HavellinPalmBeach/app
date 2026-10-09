// Step 70 — P24, the room check and the walkthrough's collections on the inventory (2026-10-06). Anthony: "Fix option 2
// above with room level check. That's an obvious fix and will help with our fake client we are doing tomorrow with full
// inventory." Then: "definitely fix the collection double count. collections should automatically be in inventory and
// obviously need photo documentation."
//
// Drives the REAL page through its own controls: the Job Admin & Inv desk (the work bar's Check N rooms and Name N shots,
// the Possible duplicates block's Remove, a row's ▾, the collection panel's Use that line), the Job Plan (its banner, a
// room card, the room's brief, the in-page camera with Chromium's fake camera, the shutter, Done). The Apps Script URL is
// answered by a route as the real script would answer it (agentRoomCheck, agentIdentify, uploadFile, loadMedia); what is
// seeded is state a person could not type in one sitting (a won estate, its approved estimate with two collections and a
// vehicle, four lines Agent One named).
//
//   A. the desk: each walkthrough collection is a line by itself, reading "no photograph yet"; the import panel offers the
//      vehicle alone; Check 1 room (the Kitchen, three photographs) posts the room with its lines, and the answer, two
//      lines named two ways, is shown under Possible duplicates with what the pictures showed; the button withdraws
//   B. Remove on the extra line clears the group
//   C. the coin collection shot in the Dining Room as an ordinary line: its own line's panel hands it over (Use that
//      line), and the collection is one line
//   D. the Job Plan names the stamp albums as not photographed; the Kitchen's brief offers them; one tap opens Items with
//      them armed; the shutter fills their line (its id and number kept, the room and photograph added); the brief and
//      the banner clear
//   E. Name 1 shot names it, and the naming run hands on to the room check by itself
//   F. overflow at 1440 and 390 (the desk with the duplicates block and a panel open; the room workspace); no page errors
//
//   NODE_PATH=/opt/node22/lib/node_modules node tests/browser/step70.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');

const SYNC = 'https://sync.example.test/exec';
const T0 = Date.parse('2026-10-05T15:00:00Z');
const J = 4801, COIN = 1700000000001, STAMP = 1700000000002;
const COIN_LINE = J + '_col' + COIN, STAMP_LINE = J + '_col' + STAMP;

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
      args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
    await ctx.grantPermissions(['camera']).catch(() => {});
    // The Apps Script, as a route: each action answered from its own queue, the rest accepted.
    const net = { posts: [], room: [], name: [], uploads: 0 };
    await ctx.route(SYNC + '**', async (r) => {
      const req = r.request();
      const json = (o) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
      if (req.method() === 'POST') {
        let body = {}; try { body = JSON.parse(req.postData() || '{}'); } catch (e) {}
        net.posts.push(body);
        if (body.action === 'agentRoomCheck') return json(net.room.shift() || { ok: true, results: {}, failed: {}, remaining: [] });
        if (body.action === 'agentIdentify') return json(net.name.shift() || { ok: true, results: {}, failed: {}, remaining: 0 });
        if (body.action === 'uploadFile') { net.uploads++; return json({ ok: true, fileUrl: 'https://drive.google.com/file/d/up' + net.uploads + '/view', fileId: 'up' + net.uploads }); }
        return json({ ok: true });
      }
      if (/action=loadMedia/.test(req.url())) return json({ ok: true, media: {} });
      return json({ ok: false, error: 'not in this test' });
    });
    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    const dialogs = [], answers = [];
    p.on('dialog', async (d) => {
      dialogs.push(d.type() + ': ' + d.message());
      if (d.type() === 'confirm') { const a = answers.shift(); if (a === 'no') await d.dismiss(); else await d.accept(); return; }
      await d.accept();
    });
    await p.goto(APP); await p.waitForTimeout(1600);
    await p.evaluate((u) => { SHEETS_SYNC_URL = u; }, SYNC);

    const section = async (name, body) => {
      console.log('\n## ' + name);
      try { await body(); } catch (e) { fail++; console.log('  ✗ ' + name + ' threw: ' + String(e && e.message || e).split('\n')[0]); }
    };
    const vis = (sel) => p.locator(sel).first().isVisible().catch(() => false);
    const press = async (sel, what) => {
      const n = await p.locator(sel).count();
      const v = n === 1 && await vis(sel);
      ok(v, (what || sel) + ' — one control, on screen (' + n + ')');
      if (v) { await p.click(sel, { timeout: 5000 }).catch((e) => ok(false, (what || sel) + ' — ' + e.message.split('\n')[0])); await p.waitForTimeout(500); }
      return v;
    };
    const txt = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }, sel);
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const ref = (sid) => p.evaluate(([j, s]) => { const r = (_photoRefs[j] || []).find((x) => x.stableId === s); return r ? JSON.parse(JSON.stringify(r)) : null; }, [J, sid]);
    const toDesk = async () => {
      await p.evaluate((id) => { setCurrentJob(id); populateInventorySelect(); }, J);
      await p.click('.nb[onclick*="\'inventory\'"]'); await p.waitForTimeout(700);
      const sel = await p.evaluate(() => (document.getElementById('inv-job') || {}).value);
      if (String(sel) !== String(J)) { await p.selectOption('#inv-job', String(J)); await p.waitForTimeout(900); }
      await p.waitForTimeout(900);
    };

    // ── Seed: a won estate, its approved estimate (two collections, a vehicle), four lines Agent One named ──
    await p.evaluate(([J, T0, COIN, STAMP]) => {
      jobs.unshift({ id: J, hvlId: 'HVL-2610-E481', name: 'Ruth Adler', fname: 'Ruth', lname: 'Adler', svc: 'probate',
        addr: '12 Seaspray Ave', city: 'Palm Beach', zip: '33480', executor: 'Daniel Adler', deathDate: '2026-07-02',
        matterType: 'probate', docTier: 'values', status: 'active', won: true, wonAt: '2026-10-01', approved: true, tc: 'Ashley Jerome',
        created: '2026-09-28', start: '2026-10-06', driveFolder: 'FOLDER', driveSubfolders: { 'Estate Inventory': 'SUB-INV', 'As-Found Record': 'SUB-AF' } });
      estimateStore[J] = { approved: true, submitted: true, approvedBy: 'Anthony Graziano', savedAt: T0,
        estimate: { jobId: J, svc: 'probate', havellinTotal: 24000, totTC: 40, totPS: 80, days: 4, vendors: [], prepItems: [],
          collections: [{ id: COIN, name: 'Coin collection', disp: 'appraise', qty: '200', value: '5000' },
                        { id: STAMP, name: 'Stamp albums', disp: 'appraise', qty: 'Est.', value: 'Unknown' }],
          vehicles: [{ id: 9, desc: '1965 Ford Mustang', year: '1965', collector: true }],
          rooms: [{ idx: 1, name: 'Dining Room', st: 'in' }, { idx: 4, name: 'Kitchen', st: 'in' }] } };
      const L = (id, o) => Object.assign({ stableId: id, label: 'inventory', collId: null, roomIdx: 4, seq: 1, status: 'uploaded',
        category: 'Furniture', disposition: '', namedBy: 'agent', ts: T0, updatedAt: T0, filename: 'HVL-2610-E481_' + id + '.jpg',
        driveFileId: 'f-' + id, driveFileUrl: 'https://drive.google.com/file/d/f-' + id + '/view' }, o);
      _photoRefs[J] = [
        L('k1', { itemNo: 1, objectName: 'Mahogany sideboard', ts: T0 + 1 }),
        L('k2', { itemNo: 2, objectName: 'Blue vase', category: 'Art & Décor', ts: T0 + 2 }),
        L('k3', { itemNo: 3, objectName: 'Cobalt art glass vase, likely Murano', category: 'Art & Décor', ts: T0 + 3 }),
        L('d1', { itemNo: 4, objectName: 'Silver coins in Whitman albums', category: 'Collectibles', roomIdx: 1, ts: T0 + 4 }),
      ];
      savePhotoRefs(J); saveJobs();
      localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore));
    }, [J, T0, COIN, STAMP]);

    // ── A ───────────────────────────────────────────────────────────────────
    await section('A. the collections join by themselves; Check 1 room finds one vase twice', async () => {
      await toDesk();
      const coin = await ref(COIN_LINE), stamp = await ref(STAMP_LINE);
      ok(!!coin && !!stamp, 'each walkthrough collection is a line by itself, with nothing pressed');
      eq(coin && [coin.objectName, coin.qty, coin.needsAppr, coin.manual], ['Coin collection', '200', true, true],
         'the walkthrough\'s name, count and instruction to appraise');
      has(await txt('#inv-row-' + COIN_LINE), 'no photograph yet', 'its row says it is waiting for a photograph');
      const panel = await txt('#panel-inventory');
      has(panel, '1965 Ford Mustang', 'the import panel offers the vehicle');
      lacks(panel, 'Keep as lot', 'and no collection to add');
      net.room.push({ ok: true, results: { 4: { doubles: [{ ids: ['k2', 'k3'], why: 'the cobalt vase: on the sideboard in one, close up in the other', confidence: 'high' }], photos: 3 } }, failed: {}, remaining: [] });
      answers.push('yes');
      await press('#inv-workbar button:has-text("Check 1 room")', 'Check 1 room (the Kitchen: three photographs; the Dining Room has one)');
      has(dialogs.join(' | '), 'Check 1 room for anything photographed twice?', 'it asks first');
      await p.waitForTimeout(1200);
      const post = net.posts.filter((x) => x.action === 'agentRoomCheck');
      eq(post.length, 1, 'one call to the room check');
      eq(post[0] && post[0].rooms.map((r) => [r.key, r.room, r.shots.map((s) => s.lines.map((l) => l.id))]),
         [['4', 'Kitchen', [['k1'], ['k2'], ['k3']]]], 'the Kitchen, its photographs in the order taken, each with its line');
      const block = await txt('#panel-inventory .alert.a-warn');
      has(block, 'Possible duplicates', 'the block above the rows names it');
      has(block, 'the cobalt vase: on the sideboard in one, close up in the other', 'with what the pictures showed');
      has(block, 'room check: plainly one thing', 'and how sure');
      has(block, 'Cobalt art glass vase, likely Murano', 'naming each line under its photograph');
      has(await txt('#inv-row-k3'), 'possible duplicate', 'the row reads possible duplicate');
      eq(await p.locator('#inv-workbar button:has-text("Check 1 room")').count(), 0, 'the button withdraws: the room is checked');
      has(await txt('#inv-room-state'), '1 possible double flagged under Possible duplicates', 'the work bar says what came back');
      ok(await overflow() <= 0, 'the desk with the block fits at 1440 (' + await overflow() + ')');
    });

    // ── B ───────────────────────────────────────────────────────────────────
    await section('B. Remove on the extra line clears the group', async () => {
      answers.push('yes');
      await press('#panel-inventory .alert.a-warn button[onclick="agentDropDuplicate(' + J + ',\'k3\')"]', 'Remove on the close-up\'s line');
      eq(!!(await ref('k3')).deletedAt, true, 'the line comes off (the photograph stays)');
      eq(await p.locator('#panel-inventory .inv-dup-group').count(), 0, 'and the group is gone');
    });

    // ── C ───────────────────────────────────────────────────────────────────
    await section('C. the coin collection, shot as an ordinary line, is handed to that line', async () => {
      await press('button[onclick="_invToggleOpen(\'' + COIN_LINE + '\')"]', 'the coin collection\'s ▾');
      const rec = await txt('#inv-row-' + COIN_LINE);
      has(rec, 'No photograph yet. In the house', 'its panel says where to photograph it');
      await p.selectOption('#coll-use-' + COIN_LINE, 'd1');
      ok(await p.locator('#coll-use-' + COIN_LINE).isVisible(), 'the line already shot is offered');
      answers.push('yes');
      await press('#inv-row-' + COIN_LINE + ' button:has-text("Use that line")', 'Use that line');
      has(dialogs.join(' | '), 'as Coin collection from the walkthrough?', 'asked first, naming both');
      const d1 = await ref('d1'), cl = await ref(COIN_LINE);
      eq([String(d1.sourceCollId), d1.needsAppr, d1.fmv, d1.objectName], [String(COIN), true, 5000, 'Silver coins in Whitman albums'],
         'the photographed line carries the collection, its instruction and value, under its own name');
      eq(!!cl.deletedAt, true, 'the collection\'s own line comes off');
      eq(await p.evaluate((j) => _jobInvRefs(j).filter((r) => r.sourceCollId != null).map((r) => r.stableId).sort(), J), ['d1', STAMP_LINE].sort(),
         '⚠⚠ each collection counted once: the coins on their photograph, the stamps waiting for theirs');
    });

    // ── D ───────────────────────────────────────────────────────────────────
    await section('D. the stamps: the plan names them, the Kitchen\'s brief arms the camera, the shutter fills their line', async () => {
      await p.evaluate((j) => openJobPlanFor(j), J); await p.waitForTimeout(1200);
      has(await txt('#job-plan-content'), '1 collection from the walkthrough is not photographed yet: Stamp albums', 'the plan names them');
      has(await txt('#job-plan-content'), 'Photographed on the inventory: #4 in Dining Room', 'the Collection Partners card reads the coins\' line');
      await press('#plan-rooms-' + J + ' .rl-row[onclick="openRoomWorkspace(' + J + ',4)"]', 'the Kitchen\'s room card');
      has(await txt('#room-ws .ws-colls'), 'From the walkthrough, not photographed yet.', 'the room\'s brief names them');
      await press('#room-ws .ws-coll', 'the stamp albums\' button');
      await p.waitForFunction(() => { const s = document.querySelector('#field-cam .fc-shutter:not(.fc-closeup)'); return s && !s.disabled; }, null, { timeout: 8000 }).catch(() => {});
      has(await txt('#field-cam .fc-colls .fc-tog.on'), 'Stamp albums', 'the camera opens with them armed');
      const before = await p.evaluate((j) => _jobInvRefs(j).length, J);
      // (P25, Q41: the Close-up shutter shares the class; the main shutter is the other one.)
      await press('#field-cam .fc-shutter:not(.fc-closeup)', 'the shutter');
      await p.waitForTimeout(2500);
      const st = await ref(STAMP_LINE);
      eq(st && [st.roomIdx, st.label, st.status, st.manual, st.objectName, String(st.sourceCollId), st.needsAppr],
         [4, 'inventory', 'uploaded', undefined, '', String(STAMP), true],
         'their line took the photograph: in the Kitchen, saved, no longer typed, waiting for a name, still theirs and still to appraise');
      has(st && st.filename, 'Kitchen_INV_', 'filed as a Kitchen Items shot');
      eq(st && st.fieldNote, 'From the walkthrough: Stamp albums.', 'with the walkthrough\'s words for the agent');
      eq(await p.evaluate((j) => _jobInvRefs(j).length, J), before, '⚠⚠ no new line: the shot is the collection\'s');
      eq(await p.locator('#field-cam .fc-colls').count(), 0, 'the chip is gone once photographed');
      await press('#field-cam .fc-done', 'Done');
      eq(await p.locator('#room-ws .ws-colls').count(), 0, 'the brief no longer lists them');
      await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(400);
      ok(await overflow() <= 0, 'the room workspace fits at 390 (' + await overflow() + ')');
      await p.setViewportSize({ width: 1440, height: 1000 }); await p.waitForTimeout(300);
      await p.evaluate(() => closeRoomWorkspace()); await p.waitForTimeout(300);
      await p.evaluate((j) => openJobPlanFor(j), J); await p.waitForTimeout(900);
      lacks(await txt('#job-plan-content'), 'not photographed yet', 'and the plan stops naming them');
    });

    // ── E ───────────────────────────────────────────────────────────────────
    await section('E. Name 1 shot names the stamps, and hands on to the room check by itself', async () => {
      await toDesk();
      net.name.push({ ok: true, results: { [STAMP_LINE]: { objects: [{ name: 'Stamp albums, worldwide, about 12 volumes', category: 'Collectibles', qty: 12,
        confidence: 'medium', basis: 'album spines', crop: [0, 0, 1, 1] }], notices: [] } }, failed: {}, remaining: 0 });
      net.room.push({ ok: true, results: { 4: { doubles: [], photos: 3 } }, failed: {}, remaining: [] });
      answers.push('yes');
      await press('#inv-workbar button:has-text("Name 1 shot")', 'Name 1 shot');
      await p.waitForTimeout(2500);
      eq((await ref(STAMP_LINE)).objectName, 'Stamp albums, worldwide, about 12 volumes', 'named from the picture');
      const rc = net.posts.filter((x) => x.action === 'agentRoomCheck');
      eq(rc.length, 2, '⚠ the naming run handed on to the room check, with nothing pressed');
      eq(rc[1] && rc[1].rooms.map((r) => [r.key, r.shots.length]), [['4', 3]], 'the Kitchen again: the sideboard, the vase and the stamps');
      has(await txt('#inv-room-state'), 'nothing photographed twice in the 1 room read', 'and says what it found');
      ok(await overflow() <= 0, 'the desk fits at 1440 (' + await overflow() + ')');
      await p.click('button[onclick="_invToggleOpen(\'' + STAMP_LINE + '\')"]').catch(() => {}); await p.waitForTimeout(300);
      await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(400);
      ok(await overflow() <= 0, 'and at 390 with a record open (' + await overflow() + ')');
      await p.setViewportSize({ width: 1440, height: 1000 });
    });

    await section('F. no page errors', async () => { eq(errs, [], 'no page errors'); });

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
