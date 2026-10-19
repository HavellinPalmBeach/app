// Step 89 — ✓ Received on the dashboard, and the estate package waiting for the inventory (2026-10-19; Anthony, the first
// Ellison run: the Certification of Trust was not in hand, Activate job never showed, and the only way to record the paper
// was Edit Client; and Ashley pressed Send trust package by accident before the house was photographed, so every schedule
// went out as a blank floor).
//
// Drives the REAL page: a funded trust job waiting on its Certification; the band's blocked Activate row with the press
// beside it and the fix naming it; the Trust card's chip with the same press; the package row withheld and saying why;
// the press and its confirm, the record (received today, by the device's user), the row opened, the chip's day and who;
// Activate job; the package refused by name on an empty inventory once the sheet is read; a named line and an unlocked
// room: the confirm naming the gaps, declined, nothing drafted; overflow at 1440 and 390; zero page errors.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step89.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');

const SYNC = 'https://script.google.com/macros/s/STEP89/exec';
const T0 = Date.parse('2026-10-19T15:00:00Z');
const EST = 8901;

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
    let mediaItems = [];   // what the sheet answers for the job's manifest
    const posts = [];
    await ctx.route(SYNC + '**', async (r) => {
      const req = r.request();
      const json = (o) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(o) });
      if (req.method() === 'GET' && /action=loadMedia/.test(req.url())) return json({ ok: true, media: { [String(EST)]: { items: mediaItems } } });
      if (req.method() === 'POST') { let body = {}; try { body = JSON.parse(req.postData() || '{}'); } catch (e) {} posts.push(body.action || '?'); }
      return json({ ok: true });
    });
    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    const dialogs = []; let answer = true;
    p.on('dialog', async (d) => { dialogs.push(d.type() + ': ' + d.message()); if (answer) await d.accept(); else await d.dismiss(); });
    await p.goto(APP); await p.waitForTimeout(1600);
    await p.evaluate((u) => {
      SHEETS_SYNC_URL = u;
      localStorage.setItem('hav_device_user', 'Ashley Jerome');
      window.open = function () { return null; };
      window.__drafts = [];
      gmailCreateDraft = (mime, cb) => { window.__drafts.push(String(mime)); cb(true, { messageId: 'd89' }); };
      gmailAuth = (cb) => cb('tok-89');
      resolveSubfolderId = function (job, name, cb) { cb('INV-89'); };
      uploadToDrive = function (folderId, filename, dataUrl, cb) { cb(true, 'https://drive/' + filename, 'F' + filename.length); };
      uploadHtmlToDrive = function (folderId, name, html, cb) { cb(true, 'https://drive/' + name, 'H' + name.length); };
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
      if (v) { await p.locator(sel).first().click({ timeout: 5000 }).catch((e) => ok(false, (what || sel) + ' — ' + e.message.split('\n')[0])); await p.waitForTimeout(500); }
      return v;
    };
    const txt = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }, sel);
    const until = async (f, ms) => { for (let i = 0; i < (ms || 8000) / 150; i++) { if (await f()) return true; await p.waitForTimeout(150); } return false; };
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const job = () => p.evaluate((id) => JSON.parse(JSON.stringify(jobs.find((j) => j.id === id) || null)), EST);
    const dash = '#client-dashboard-view';
    const toDash = async () => { await p.evaluate((id) => goToClientDashboard(id), EST); await p.waitForTimeout(700); };
    const railRow = (label) => p.evaluate((label) => { const r = Array.from(document.querySelectorAll('#client-dashboard-view .jt-row'))
      .find((x) => ((x.querySelector('.jt-lbl') || {}).textContent || '').replace(/\s+/g, ' ').trim().indexOf(label) === 0); return r ? r.textContent.replace(/\s+/g, ' ') : ''; }, label);
    const pkgRow = () => txt('#pkg-row-' + EST);
    const recvBtn = dash + ' button[onclick="dashMarkAuthorityReceived(' + EST + ')"]';
    const chipBtn = dash + ' button[onclick="event.stopPropagation();dashMarkAuthorityReceived(' + EST + ')"]';

    // ── Seed: a funded trust job, its Certification pending ─────────────────────────────
    await p.evaluate(([T0, EST]) => {
      jobs.unshift({ id: EST, hvlId: 'HVL-2610-S891', name: 'Harold Adler', fname: 'Harold', lname: 'Adler', svc: 'cleanout', matterType: 'trust',
        status: 'won', won: true, wonAt: '2026-10-01', wonBy: 'Ashley Jerome', approved: true, agrApproved: true, agrApprovedBy: 'Anthony Graziano',
        agrSent: true, agrSigned: true, agrSignedAt: '2026-10-10', depositReceived: true, depositAmount: 7000, depositReceivedOn: '2026-10-12',
        tc: 'Ashley Jerome', addr: '100 Ocean Blvd', city: 'Palm Beach', zip: '33480', created: 'Sep 28, 2026', walkthrough: '2026-09-29',
        estimateSentDate: 'September 30, 2026', start: '2026-11-02', deathDate: '2026-08-01', executor: 'Ruth Adler', executorRole: 'Trustee',
        executorEmail: 'ruth@adler.example', executorPhone: '(561) 555-0101', executorAuth: 'pending', trustName: 'Adler Family Trust', trustDate: '2015-03-03',
        probateAttyName: 'Laura Pell', probateAttyEmail: 'lpell@example.com', docTier: 'values', havellinEst: 14000, totalEst: 14000,
        driveFolder: 'https://drive.google.com/drive/folders/ROOT89', driveSubfolders: { 'Estate Inventory': 'INV-89', 'Signed Records': 'SR-89' },
        docState: { agreement: { sentAt: '2026-10-09T14:00:00.000Z', sentHow: 'in_person', sig: { how: 'wet', signedBy: 'Ruth Adler', signedOn: '2026-10-10', recordedBy: 'Ashley Jerome' } },
                    'invoice:deposit': { draftedAt: '2026-10-11T10:00:00.000Z', sentAt: '2026-10-11T10:05:00.000Z' } },
        payments: [{ uid: 'p1', stage: 'deposit', amount: 7000, receivedOn: '2026-10-12', method: 'wire', cleared: true, clearedOn: '2026-10-12', recordedBy: 'Ashley Jerome' }],
        at: {}, signedRecords: [], updatedAt: T0 });
      estimateStore[EST] = { approved: true, submitted: true, approvedBy: 'Anthony Graziano', approvedAt: 'September 30, 2026', savedAt: T0,
        estimate: { jobId: EST, svc: 'cleanout', tcFee: 6000, psFee: 8000, pkgCost: 0, pkgLabel: '', smf: 0, prepFee: 0, havellinTotal: 14000, totalEst: 14000, totTC: 40, totPS: 80,
          tcRate: 150, psRate: 100, discountPct: 0, fixedPrice: false, rush: false, docScope: 'full', docTier: 'values', days: 4, tcCount: 1,
          vendors: [], prepItems: [], rooms: [{ idx: 1, name: 'Study', st: 'in', vol: 3, cplx: 3 }], collections: [], vehicles: [] } };
      saveJobs();
      try { localStorage.setItem('estimateStore', JSON.stringify(estimateStore)); } catch (e) {}
    }, [T0, EST]);

    // ═══════════════════════════════════════════════════════════════════════
    await section('A. the blocked Activate row offers the press, the fix names it, the Trust card\'s chip carries it too', async () => {
      await toDash();
      has(await txt(dash + ' .jt-next'), 'Activate the job', 'fixture: activation is the step');
      ok(await p.locator(dash + ' button[onclick="activateOrCycle(' + EST + ')"]').count() === 0, 'Activate job itself is withheld while the paper is pending');
      has(await txt(recvBtn), 'Certification of Trust received', '⚠⚠ the band offers ✓ Certification of Trust received');
      const all = await txt(dash);
      has(all, 'The successor trustee’s Certification of Trust must be received', 'the dashboard says why (the band carries the blocked row\'s reason)');
      has(all, 'Once it is in hand, press ✓ Certification of Trust received here.', 'and the fix names the press');
      has(await txt(dash), 'Certification of Trust pending — blocker', 'the Trust card\'s chip reads pending');
      ok(await p.locator(chipBtn).count() === 1, '⚠ and carries the press beside it');
      eq(await overflow(), 0, 'no horizontal overflow at 1440');
    });

    await section('B. the package row is withheld before activation, and says why', async () => {
      const row = await pkgRow();
      lacks(row, 'Send trust package', '⚠⚠ the send is withheld');
      has(row, 'it needs the job activated (the package carries the inventory, which is built once the work starts)', 'and the row says why');
      ok(await p.locator('button[onclick*="sendProbatePackage(' + EST + ')"]').count() === 0, 'no send button on the page');
    });

    await section('C. the press: a confirm, the record, the row opened, the chip\'s day and who', async () => {
      dialogs.length = 0; answer = false;
      await press(recvBtn, '✓ Certification of Trust received (declined)');
      ok(dialogs.length === 1 && /Record the Certification of Trust as received today\?/.test(dialogs[0]), 'asks first, naming the paper: ' + dialogs[0]);
      eq((await job()).executorAuth, 'pending', 'declined: nothing written');
      answer = true; dialogs.length = 0;
      await press(recvBtn, '✓ Certification of Trust received');
      ok(await until(async () => (await job()).executorAuth === 'received', 4000), '⚠⚠ recorded as received');
      const j = await job();
      eq([j.executorAuthOn, j.executorAuthBy], ['2026-10-19', 'Ashley Jerome'], 'today, by the device\'s user');
      has(await txt(dash), 'Certification of Trust recorded as received today by Ashley Jerome. Activate job is open.', 'the notice');
      has(await txt(dash + ' .jt-next'), 'Activate the job', 'the step stays Activate');
      ok(await p.locator(dash + ' button[onclick="activateOrCycle(' + EST + ')"]').count() === 1, '⚠⚠ Activate job is offered now');
      ok(await p.locator(recvBtn).count() === 0 && await p.locator(chipBtn).count() === 0, 'the press is gone from the band and the card');
      has(await txt(dash), 'Received · recorded Oct 19, 2026 by Ashley Jerome', 'the card says when and who');
      has(await txt(dash), 'Certification of Trust received', 'and the chip reads received');
    });

    await section('D. activated: the package still waits for a named line, refused after the sheet is read', async () => {
      dialogs.length = 0; answer = true;
      await press(dash + ' button[onclick="activateOrCycle(' + EST + ')"]', '▶ Activate job');
      ok(await until(async () => (await job()).status === 'active', 4000), 'active');
      await toDash();
      // Activating opened the Job Plan, which read the (empty) sheet: the row already withholds the send for the inventory.
      has(await pkgRow(), 'the inventory holds no named line', 'the Job Plan read the empty sheet: the row says the inventory holds no named line');
      ok(await p.locator('button[onclick*="sendProbatePackage(' + EST + ')"]').count() === 0, 'and withholds the send');
      // A device that has not read the sheet offers the send; the send reads the sheet (empty) and refuses by name.
      await p.evaluate((id) => { _photoRefs[id] = []; delete _invCloudSeen[id]; }, EST);
      await toDash();
      ok(await p.locator('button[onclick*="sendProbatePackage(' + EST + ')"]').count() === 1, 'the manifest unread on this device: the send is offered');
      mediaItems = [];
      await press('button[onclick*="sendProbatePackage(' + EST + ')"]', '📧 Send trust package');
      ok(await until(async () => /the inventory holds no named line/.test(await txt(dash)), 6000), '⚠⚠ refused by name: the inventory holds no named line');
      eq(await p.evaluate(() => window.__drafts.length), 0, 'nothing drafted');
      has(await pkgRow(), 'the inventory holds no named line', 'and the row now says so (the sheet read)');
      ok(await p.locator('button[onclick*="sendProbatePackage(' + EST + ')"]').count() === 0, 'and withholds the send');
    });

    await section('E. one named line, the Study unlocked: the confirm names the gaps; declined, nothing drafted', async () => {
      mediaItems = [{ stableId: 's1', label: 'inventory', collId: null, roomIdx: 1, status: 'uploaded', ts: T0, updatedAt: T0, itemNo: 1,
        objectName: 'Walnut sideboard', category: 'Furniture', qty: 1, driveFileId: 'f1', driveFileUrl: 'https://drive.google.com/file/d/f1/view' }];
      await p.evaluate((id) => { _photoRefs[id] = []; delete _invCloudSeen[id]; }, EST);
      await toDash();
      ok(await p.locator('button[onclick*="sendProbatePackage(' + EST + ')"]').count() === 1, 'the send offered again with the manifest unread');
      dialogs.length = 0; answer = false;
      await press('button[onclick*="sendProbatePackage(' + EST + ')"]', '📧 Send trust package');
      ok(await until(async () => dialogs.length === 1, 6000), 'the confirm asked once');
      has(dialogs[0] || '', 'The inventory is still being built: 1 room not yet locked, 1 line with no disposition and 1 line with no value.', '⚠⚠ naming every gap');
      has(dialogs[0] || '', 'would go to lpell@example.com now with those gaps marked on its pages. Send it anyway?', 'and to whom');
      ok(await until(async () => /Not sent\. Finish the inventory, then press Send trust package again\./.test(await txt(dash)), 4000), 'declined: not sent, said');
      eq(await p.evaluate(() => window.__drafts.length), 0, 'nothing drafted');
      eq(await overflow(), 0, 'no horizontal overflow at 1440');
    });

    await section('F. a phone: no overflow at 390, zero page errors', async () => {
      await p.setViewportSize({ width: 390, height: 844 });
      await toDash();
      eq(await overflow(), 0, 'no horizontal overflow at 390');
      eq(errs, [], 'zero page errors');
    });
  } catch (e) {
    fail++; console.log('  ✗ step threw: ' + (e && e.stack || e));
  } finally {
    if (b) await b.close().catch(() => {});
  }
  console.log('\nstep89  ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
