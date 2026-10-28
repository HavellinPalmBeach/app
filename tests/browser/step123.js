// Step 123 — P8 of the desk audit (2026-10-27): nothing counted twice.
//
// ACC-02, INV-01: a FINAL Trust Schedule over a total holding one harbour painting twice. GAP1-03: a photograph read twice with
// nothing pairing a repeat to its original, and three Removes that took both salad-plate lines. INV-05, AGT-03: Not duplicates
// pressed on one pair silenced every later double of either line, while the work bar said one was flagged.
//
// Drives the REAL page with an active trust estate on the values tier: a kitchen photograph carrying the four Ellison lines with
// the crops Agent One gave them (#73 and #81 from one naming, #87 and #88 from a second), and in the living room two
// photographs of one harbour painting the room check read as plainly one thing (#10 and #11), beside a sofa. Job Admin & Inv
// through its own nav button, the client through its picker:
//   A. Possible duplicates names the pairs, *#87 repeats #73 · #88 repeats #81*; Keep the first reading asks first, naming what
//      it takes off, and takes #87 and #88 off; #73 and #81 stay, and the group goes.
//   B. The Trust Schedule from More ▾ reads *DRAFT — 1 possible double count not yet decided: #10 and #11*, names the two lines
//      and their figures under the total and has no receipt line; the Estate Inventory PDF names the pair under its stamp.
//   C. Not duplicates on the painting: the Trust Schedule is FINAL, with its receipt line.
//   D. Day two: a third photograph of the painting is named (#12); Check 1 room pressed, the room check answering #10 with #11
//      again and #10 with #12, both plainly one thing. Only #10 and #12 are shown; the work bar says one double was flagged;
//      Agent Two, following the check by itself, does not value #12, which waits on #10.
//      The group is headed by the #10-#12 pair's own sentence, never the answered #10-#11 one's (P8's review); #12's name
//      tidied through its row's box sends nothing to Agent Two while it waits.
//   E. Not duplicates on #10 and #12: Agent Two values #12 by itself, once.
//   F. (P8's review) A second photograph read twice with whole-photograph crops: the dinner plates read twice and a stack of
//      salad plates in the second reading only. The block reads *#31 repeats #30 · #32 not matched*, the repeat's line naming
//      its original by name; Keep the first reading asks, naming both lines of the pair and keeping #32; afterwards #32 is
//      still *not matched* and Keep is no longer offered, so the salad plates stay.
//   At 1440 and 390 px no horizontal overflow; zero page errors throughout.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step123.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
const SYNC = 'https://sync.example.test/exec';
const J = 12301;
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');
const DIN1 = 'Hand-painted tin-glazed earthenware dinner plates, yellow bird and blue flower';
const SAL1 = 'Hand-painted tin-glazed earthenware salad plates, matching';
const DIN2 = 'Hand-painted majolica dinner plates, yellow bird and blue flower design';
const SAL2 = 'Hand-painted majolica salad or dessert plates, matching';
const OIL = 'Oil painting, harbor scene, gilt frame';
const OIL2 = 'Harbor painting in gilt frame';

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
    const net = { value: [], room: [] };
    let sheet = {};
    let roomAnswer = {};
    await ctx.route(SYNC + '**', async (r) => {
      const req = r.request();
      const json = (o) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
      if (req.method() === 'POST') {
        let body = {}; try { body = JSON.parse(req.postData() || '{}'); } catch (e) {}
        if (body.action === 'agentValue') {
          net.value.push((body.items || []).map((it) => it.stableId));
          const results = {};
          (body.items || []).forEach((it) => {
            results[it.stableId] = { fmv: 2000, low: 1500, high: 2600, confidence: 'medium', source: 'Online comps', basis: 'A harbour scene in oils, signed.',
              comps: [], lookup: '', notices: [], mode: 'comps', name: it.name };   // researched: a general figure over the ceiling is sent again
          });
          return json({ ok: true, success: true, results: results, failed: {}, remaining: 0 });
        }
        if (body.action === 'agentRoomCheck') {
          net.room.push((body.rooms || []).map((rm) => rm.key));
          const results = {};
          (body.rooms || []).forEach((rm) => { results[rm.key] = roomAnswer[rm.key] || { doubles: [] }; });
          return json({ ok: true, results: results, failed: {}, remaining: [] });
        }
        return json({ ok: true });
      }
      if (/action=loadMedia/.test(req.url())) return json({ ok: true, media: sheet });
      return json({ ok: true });
    });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    const said = []; p.on('dialog', async (d) => { said.push(d.message()); await d.accept(); });
    const section = async (name, body) => {
      console.log('\n## ' + name);
      try { await body(); } catch (e) { fail++; console.log('  ✗ ' + name + ' threw: ' + String(e && e.message || e).split('\n')[0]); }
    };
    const vis = (sel) => p.locator(sel).first().isVisible().catch(() => false);
    const press = async (sel, what) => {
      const n = await p.locator(sel).count();
      const v = n === 1 && await vis(sel);
      ok(v, (what || sel) + ' — one control, on screen (' + n + ')');
      if (v) { await p.click(sel, { timeout: 5000 }).catch((e) => ok(false, (what || sel) + ' — ' + e.message.split('\n')[0])); await p.waitForTimeout(800); }
      return v;
    };
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const txt = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }, sel);
    const live = () => p.evaluate((j) => (_photoRefs[j] || []).filter((r) => r.label === 'inventory' && !r.deletedAt).map((r) => r.itemNo), J);
    const groups = () => p.evaluate(() => [...document.querySelectorAll('#panel-inventory .inv-dup-group')].map((x) => x.textContent.replace(/\s+/g, ' ').trim()));
    const viewerOpen = () => p.evaluate(() => { const o = document.getElementById('doc-viewer-modal'); return !!o && o.style.display === 'flex'; });
    const closeViewer = async () => { if (await viewerOpen()) await press('#doc-viewer-modal button[onclick="closeDocViewer()"]', 'Close the viewer'); };
    const trustSchedule = async () => {
      if (!(await vis('#inv-more button[onclick="printTrustSchedule(' + J + ')"]'))) await press('#inv-more > summary', 'More ▾');
      await press('#inv-more button[onclick="printTrustSchedule(' + J + ')"]', 'Trust Schedule, under More ▾');
      ok(await viewerOpen(), 'the Trust Schedule opens in the viewer');
      const t = await txt('#doc-viewer-body');
      await closeViewer();
      return t;
    };

    await p.goto(APP); await p.waitForTimeout(1600);
    sheet = await p.evaluate(([J, SYNC, DIN1, SAL1, DIN2, SAL2, OIL, OIL2]) => {
      SHEETS_SYNC_URL = SYNC;
      try { localStorage.setItem('hav_device_user', 'Ashley Jerome'); } catch (e) {}
      const T = Date.now() - 2 * 86400000, A1 = T + 3600000, A2 = A1 + 7 * 60000;
      jobs.unshift({ id: J, hvlId: 'HVL-2610-P8', name: 'Margaret Ellison', svc: 'cleanout', matterType: 'trust', addr: '12 Via Mizner', city: 'Palm Beach', zip: '33480',
        executor: 'Katherine Ellison', executorRole: 'Successor Trustee', executorEmail: 'kate@example.com', deathDate: '2026-08-14', executorAuth: 'received',
        trustName: 'Ellison Family Trust', docTier: 'values', gate706: 'no', status: 'active', won: true, wonAt: '2026-10-01', approved: true, tc: 'Ashley Jerome',
        created: '2026-09-28', start: '2026-10-12', activatedOn: '2026-10-10', agrApproved: true, agrSent: true, agrSigned: true, sqft: 3800,
        driveFolder: 'https://drive.google.com/drive/folders/R' + J, driveSubfolders: { 'Estate Inventory': 'INV_P8', 'As-Found Record': 'AF_P8' }, at: {},
        payments: [{ uid: 'd' + J, stage: 'deposit', amount: 12000, receivedOn: '2026-10-08', method: 'wire', clearedOn: '2026-10-08' }] });
      estimateStore[J] = { approved: true, submitted: true, approvedBy: 'Anthony Graziano', savedAt: T,
        estimate: { jobId: J, svc: 'cleanout', havellinTotal: 24000, fixedPrice: true, fixedAmount: 24000, fixedLines: true, totTC: 60, totPS: 90, days: 5,
          vendors: [], prepItems: [], rooms: [{ idx: 2, name: 'Kitchen', st: 'in', vol: 3, cplx: 3 }, { idx: 3, name: 'Living Room', st: 'in', vol: 3, cplx: 3 }] } };
      const photo = (room, seq, file, ts) => ({ label: 'inventory', collId: null, roomIdx: room, seq: seq, status: 'uploaded', ts: ts, filename: 'HVL-2610-P8_' + file + '.jpg',
        driveFileId: file, driveFileUrl: 'https://drive.google.com/file/d/' + file + '/view' });
      const agent = (name, at) => ({ namedBy: 'agent', agentName: name, agentConf: 'medium', agentAt: at, updatedAt: at, dupChkAt: at + 60000 });
      const desk = (fmv) => ({ fmv: fmv, valuedBy: 'desk', valSource: 'Estimate', valDate: '2026-08-14', condition: 'Good', disposition: 'Auction', reviewed: true, reviewedBy: 'Ashley Jerome' });
      const plates = photo(2, 5, 'FID_PLATES', T);
      _photoRefs[J] = [
        Object.assign({ stableId: 'pl73', itemNo: 73, objectName: DIN1, qty: 8, category: 'General/Household', crop: [0.46, 0.38, 1, 0.78] }, plates, agent(DIN1, A1), desk(400)),
        Object.assign({ stableId: 'pl81', itemNo: 81, derivedFrom: 'pl73', objectName: SAL1, qty: 16, category: 'General/Household', crop: [0.03, 0.43, 0.45, 0.78] }, plates, agent(SAL1, A1 + 3), desk(300)),
        Object.assign({ stableId: 'pl87', itemNo: 87, derivedFrom: 'pl73', objectName: DIN2, qty: 6, category: 'General/Household', crop: [0.5, 0.4, 0.98, 0.8] }, plates, agent(DIN2, A2), desk(300)),
        Object.assign({ stableId: 'pl88', itemNo: 88, derivedFrom: 'pl73', objectName: SAL2, qty: 6, category: 'General/Household', crop: [0.05, 0.42, 0.44, 0.8] }, plates, agent(SAL2, A2 + 2), desk(200)),
        Object.assign({ stableId: 'oil10', itemNo: 10, objectName: OIL, qty: 1, category: 'Art & Décor', dupWith: ['oil11'],
          dupPairs: { oil11: { conf: 'high', why: 'The harbor painting: over the sofa in one, close up in the other.' } } }, photo(3, 1, 'FID_OIL10', T + 10), agent(OIL, A1 + 9000), desk(2400)),
        Object.assign({ stableId: 'oil11', itemNo: 11, objectName: OIL2, qty: 1, category: 'Art & Décor', dupWith: ['oil10'],
          dupPairs: { oil10: { conf: 'high', why: 'The harbor painting: over the sofa in one, close up in the other.' } } }, photo(3, 2, 'FID_OIL11', T + 20), agent(OIL2, A1 + 9000), desk(2100)),
        Object.assign({ stableId: 'sofa', itemNo: 13, objectName: 'Chesterfield sofa, brown leather', qty: 1, category: 'Furniture' }, photo(3, 3, 'FID_SOFA', T + 30), agent('Chesterfield sofa, brown leather', A1 + 9000), desk(1200))];
      _invCloudSeen[J] = true;
      savePhotoRefs(J); saveJobs(); localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore));
      const out = {}; out[J] = { items: JSON.parse(localStorage.getItem('hav_media_' + J) || '[]') };
      return out;
    }, [J, SYNC, DIN1, SAL1, DIN2, SAL2, OIL, OIL2]);

    const toDesk = async () => {
      await p.click('.nb[onclick*="\'inventory\'"]'); await p.waitForTimeout(800);
      const cur = await p.evaluate(() => (document.getElementById('inv-job') || {}).value);
      if (String(cur) !== String(J)) { await p.selectOption('#inv-job', String(J)); await p.waitForTimeout(1300); }
      if (await p.locator('#panel-inventory button[onclick="setInvWhen(\'all\')"]').count()) { await p.click('#panel-inventory button[onclick="setInvWhen(\'all\')"]'); await p.waitForTimeout(600); }
    };

    // ── A ─────────────────────────────────────────────────────────────────────────────────────
    await section('A. the photograph read twice: each repeat paired with its original, and Keep the first reading', async () => {
      await toDesk();
      const g = await groups();
      eq(g.length, 2, 'fixture: two groups under Possible duplicates, the plates and the painting');
      const plates = g.find((x) => /One photograph named twice/.test(x)) || '';
      has(plates, '#87 repeats #73 · #88 repeats #81', '⚠⚠ the block says which line repeats which');
      has(plates, DIN2 + ' repeats #73 ' + DIN1, '⚠ and on the repeat\'s own line, its original named (P8\'s review)');
      eq(await overflow(), 0, 'no horizontal overflow at 1440 with both groups shown');
      await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(600);
      eq(await overflow(), 0, '⚠ nor at 390, the pairs\' heading and Keep the first reading on a phone');
      await p.setViewportSize({ width: 1440, height: 1000 }); await p.waitForTimeout(600);
      await press('#panel-inventory .inv-dup-group button.inv-keep-first', 'Keep the first reading');
      const q = said.find((m) => /Keep the first reading of this photograph\?/.test(m)) || '';
      has(q, '#87 ' + DIN2 + '\n      repeats #73 ' + DIN1, 'it asks first, naming each line it takes off and the line it repeats, by number and name');
      has(q, '#88 ' + SAL2 + '\n      repeats #81 ' + SAL1, 'both');
      eq((await live()).sort((a, c) => a - c), [10, 11, 13, 73, 81], '⚠⚠ #87 and #88 are off; #73 and #81 stay');
      eq(await p.evaluate((j) => (_photoRefs[j] || []).filter((r) => r.deletedAt).map((r) => [r.stableId, !!r.deletedBy, !!r.driveFileId]), J),
        [['pl87', true, true], ['pl88', true, true]], 'removed as tombstones with who, the photograph untouched');
      const g2 = await groups();
      eq([g2.length, g2.some((x) => /One photograph named twice/.test(x))], [1, false], 'the plates\' group is gone; the painting\'s stays');
    });

    // ── B ─────────────────────────────────────────────────────────────────────────────────────
    await section('B. the Trust Schedule is DRAFT, naming the double count; the Estate Inventory PDF names it under its stamp', async () => {
      const t = await trustSchedule();
      has(t, 'DRAFT — 1 possible double count not yet decided: #10 and #11', '⚠⚠ the status names it');
      has(t, '#10 ' + OIL + ' ($2,400) and #11 ' + OIL2 + ' ($2,100)', 'the note under the total names the lines and their figures');
      lacks(t, 'Received for the trust', '⚠ and the receipt line is withheld');
      has(t, 'a final copy is issued once Havellin has decided whether each pair is one item or two', 'the draft box says what issues the final copy');
      await press('#inv-workbar button[onclick="printEstateInventoryReport(' + J + ')"]', 'Estate Inventory PDF, on the work bar');
      const r = await txt('#doc-viewer-body');
      has(r, 'IN PROGRESS', 'the Estate Inventory Report is IN PROGRESS');
      has(r, '1 possible double count not yet decided: #10 and #11. Both lines of each are in the total below', '⚠ and names the pair under its stamp');
      await closeViewer();
    });

    // ── C ─────────────────────────────────────────────────────────────────────────────────────
    await section('C. Not duplicates on the painting: the Trust Schedule is FINAL', async () => {
      await press('#panel-inventory .inv-dup-group button:has-text("Not duplicates")', 'Not duplicates on the painting');
      eq(await groups(), [], 'the group is answered and gone');
      eq(await p.evaluate((j) => { const w = ['oil10', 'oil11'].map((id) => (_photoRefs[j].find((r) => r.stableId === id) || {}).dupOKIn || []);
        return [w[0].length, w[1].length, w[0][0] === w[1][0]]; }, J), [1, 1, true], '⚠ the answer is recorded for the pair: one press\'s id on both lines');
      const t = await trustSchedule();
      has(t, 'FINAL', 'FINAL');
      has(t, 'Received for the trust', 'with its receipt line');
      lacks(t, 'double count', 'and nothing named');
    });

    // ── D ─────────────────────────────────────────────────────────────────────────────────────
    await section('D. day two: a new photograph of the painting is flagged against #10; the answered pair stays answered; Agent Two waits', async () => {
      await p.evaluate(([J, OIL]) => {
        const at = Date.now();
        _photoRefs[J].push({ stableId: 'oil12', itemNo: 12, objectName: OIL, agentName: OIL, namedBy: 'agent', agentConf: 'medium', agentAt: at, qty: 1, category: 'Art & Décor',
          label: 'inventory', collId: null, roomIdx: 3, seq: 4, status: 'uploaded', ts: at, filename: 'HVL-2610-P8_FID_OIL12.jpg', driveFileId: 'FID_OIL12',
          driveFileUrl: 'https://drive.google.com/file/d/FID_OIL12/view', updatedAt: at });
        savePhotoRefs(J); renderInventoryTab();
      }, [J, OIL]);
      await p.waitForTimeout(500);
      roomAnswer = { 3: { doubles: [{ ids: ['oil10', 'oil11'], confidence: 'high', why: 'The harbor painting again.' },
        { ids: ['oil10', 'oil12'], confidence: 'high', why: 'The same harbor painting from the doorway.' }] } };
      const before = net.value.length;
      await press('#inv-workbar button:has-text("Check 1 room")', 'Check 1 room, on the work bar');
      await p.waitForTimeout(1500);
      eq(net.room.length, 1, 'fixture: one call to the room check');
      const g = await groups();
      eq(g.length, 1, 'one group');
      has(g[0] || '', '#12', '⚠⚠ the new double is shown, with #12');
      has(g[0] || '', '#10', 'and #10');
      lacks(g[0] || '', '#11', '⚠ and not #11, the pair a person answered');
      has(g[0] || '', 'The same harbor painting from the doorway.', '⚠⚠ headed by the #10-#12 pair\'s own sentence (P8\'s review)');
      lacks(g[0] || '', 'The harbor painting again.', 'never the answered #10-#11 pair\'s');
      has(await txt('#inv-room-state'), 'Room check: 1 possible double flagged under Possible duplicates', '⚠ the work bar counts the double the block shows');
      eq(net.value.slice(before).filter((ids) => ids.indexOf('oil12') >= 0).length, 0, '⚠⚠ Agent Two, following the check, leaves #12 waiting on #10');
      const t = await trustSchedule();
      has(t, 'DRAFT — ', 'and the Trust Schedule is DRAFT');
      has(t, '1 possible double count not yet decided: #10 and #12', 'for it');
      // #12's name tidied through its row's box while it waits: nothing goes to Agent Two (P8's review: it researched the painting twice).
      const vb = net.value.length;
      await p.fill('#inv-row-oil12 .inv-name textarea', 'Harbor scene in oils, gilt frame (doorway view)');
      await p.press('#inv-row-oil12 .inv-name textarea', 'Tab'); await p.waitForTimeout(1200);
      eq(await p.evaluate((j) => (_photoRefs[j].find((r) => r.stableId === 'oil12') || {}).objectName, J), 'Harbor scene in oils, gilt frame (doorway view)', 'fixture: the name is written');
      eq(net.value.slice(vb).filter((ids) => ids.indexOf('oil12') >= 0).length, 0, '⚠⚠ renamed while it waits: Agent Two is not sent it');
    });

    // ── E ─────────────────────────────────────────────────────────────────────────────────────
    await section('E. Not duplicates on #10 and #12: Agent Two values #12 by itself', async () => {
      const before = net.value.length;
      await press('#panel-inventory .inv-dup-group button:has-text("Not duplicates")', 'Not duplicates on #10 and #12');
      await p.waitForTimeout(1500);
      eq(net.value.slice(before).filter((ids) => ids.indexOf('oil12') >= 0).length, 1, '⚠ the waiting line goes to Agent Two, once (the rename held for it, not sent twice)');
      eq(await p.evaluate((j) => { const r = _photoRefs[j].find((x) => x.stableId === 'oil12'); return [r.valuedBy, r.fmv]; }, J), ['agent', 2000], 'and is valued');
      eq(await groups(), [], 'nothing left to flag');
      eq(await overflow(), 0, 'no horizontal overflow at 1440');
      await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(600);
      eq(await overflow(), 0, 'no horizontal overflow at 390');
      await p.setViewportSize({ width: 1440, height: 1000 }); await p.waitForTimeout(600);
    });

    // ── F ─────────────────────────────────────────────────────────────────────────────────────
    await section('F. whole-photograph crops: Keep the first reading takes the dinner-plate repeat and never the salad plates', async () => {
      const W1 = 'White porcelain dinner plates', W2 = 'White porcelain salad plates';
      await p.evaluate(([J, W1, W2]) => {
        const T = Date.now() - 86400000, A1 = T + 1000, A2 = A1 + 7 * 60000;
        const ph = { label: 'inventory', collId: null, roomIdx: 2, seq: 9, status: 'uploaded', ts: T, filename: 'HVL-2610-P8_FID_WHITE.jpg', driveFileId: 'FID_WHITE',
          driveFileUrl: 'https://drive.google.com/file/d/FID_WHITE/view', crop: [0, 0, 1, 1], category: 'General/Household', qty: 8,
          fmv: 120, valuedBy: 'desk', valSource: 'Estimate', valDate: '2026-08-14', condition: 'Good', disposition: 'Auction', reviewed: true, reviewedBy: 'Ashley Jerome' };
        const ag = (name, at) => ({ namedBy: 'agent', agentName: name, objectName: name, agentConf: 'medium', agentAt: at, updatedAt: at, dupChkAt: at + 60000 });
        _photoRefs[J].push(Object.assign({ stableId: 'wh30', itemNo: 30 }, ph, ag(W1, A1)),
          Object.assign({ stableId: 'wh31', itemNo: 31, derivedFrom: 'wh30' }, ph, ag(W1, A2)),
          Object.assign({ stableId: 'wh32', itemNo: 32, derivedFrom: 'wh30' }, ph, ag(W2, A2 + 2)));
        savePhotoRefs(J); renderInventoryTab();
      }, [J, W1, W2]);
      await p.waitForTimeout(600);
      const g = (await groups()).find((x) => /One photograph named twice/.test(x)) || '';
      has(g, '#31 repeats #30 · #32 not matched', '⚠⚠ only the same words pair lines the crops cannot place');
      has(g, W1 + ' repeats #30 ' + W1, 'the repeat names its original');
      has(g, W2 + ' not matched to the first reading', 'the salad plates say they are not matched');
      const n0 = said.length;
      await press('#panel-inventory .inv-dup-group button.inv-keep-first', 'Keep the first reading on the white plates');
      const q = said.slice(n0).find((m) => /Keep the first reading of this photograph\?/.test(m)) || '';
      has(q, '#31 ' + W1 + '\n      repeats #30 ' + W1, 'the question names both lines of the pair');
      has(q, 'Not matched to a line of the first reading, and kept:\n  · #32 ' + W2, '⚠ and keeps the salad plates');
      const lv = await live();
      eq([lv.indexOf(30) >= 0, lv.indexOf(31) >= 0, lv.indexOf(32) >= 0], [true, false, true], '⚠⚠ #31 off; #30 and #32 stay');
      const g2 = (await groups()).find((x) => /One photograph named twice/.test(x)) || '';
      has(g2, '#32 not matched', '⚠⚠ after the press #32 is still not matched (#30 stays taken by the removed #31)');
      eq(await p.locator('#panel-inventory .inv-dup-group button.inv-keep-first').count(), 0, '⚠⚠ and Keep the first reading is not offered again');
      eq(await overflow(), 0, 'no horizontal overflow at 1440');
      await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(600);
      eq(await overflow(), 0, 'nor at 390');
    });

    eq(errs, [], 'zero page errors');
    console.log('\n' + pass + ' passed, ' + fail + ' failed');
    await b.close();
    process.exit(fail ? 1 : 0);
  } catch (e) {
    console.log('step 123 threw: ' + (e && e.stack || e));
    if (b) await b.close().catch(() => {});
    process.exit(1);
  }
})();
