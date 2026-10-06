// Step 68 — P22 · group E, Anthony's decisions of 2026-10-06.
//
// Drives the REAL page through its own controls: the desk's Releases & signed papers card (File pickup list, the
// dialog's ticks and its file picker), the desk row, the Job Plan's room card and the room workspace (Mark lost, Lock),
// the client list's Win / Loss Lost tile, a client's dashboard (the terminal row and the Deposit Retained card), and
// Build Estimate's fixed-price panel. Seeded: a probate estate selling through an auction house with a failed as-found
// shot whose image the device did not hold; a hourly walkaway refunded to $0; one whose estimate is not on the device.
//
//   A. E7  the vendor pickup list: pre-ticked by the vendor's channel, one unticked, the sheet filed; the line reads
//          picked up and carries a Released custody event; the unticked one does not
//   B. E4  Mark lost on the as-found shot: the entry reads Lost with who and when, the flag clears, Lock still waits
//   C. E1  Closed — Refunded: the client list's status, the Lost list with the net kept at $0, the dashboard's row
//   D. E10 the Deposit Retained card on a settlement it cannot work out says what it waits on
//   E. E3  Build Estimate's suggested fixed fee is a whole hundred and says it is rounded up
//   F. overflow at 1440 and 390, no page errors
//
//   NODE_PATH=<dir>/node_modules node tests/browser/step68.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');

const SYNC = 'https://script.google.com/macros/s/STEP68/exec';
const T0 = Date.parse('2026-09-24T15:00:00Z');
const EST = 6801, GONE = 6802, COLD = 6803, NEW = 6804;

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
    await ctx.route(SYNC + '**', (r) => r.fulfill({ status: 200, contentType: 'application/json',
      headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ ok: true }) }));
    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    p.on('dialog', async (d) => { await d.accept(); });
    await p.goto(APP); await p.waitForTimeout(1600);
    await p.evaluate(() => { window.open = function () { return null; }; });
    await p.evaluate((u) => { SHEETS_SYNC_URL = u; }, SYNC);
    // The Drive boundary: the folder lookup and the upload answer as Drive would.
    await p.evaluate(() => {
      window.__uploads = [];
      resolveSubfolderId = function (job, name, cb) { cb('SIGNED-68'); };
      uploadToDrive = function (folderId, filename, dataUrl, cb) { window.__uploads.push({ folderId, filename }); cb(true, 'https://drive.google.com/file/d/PK1/view', 'PK1'); };
    });

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
    const until = async (f, ms) => { for (let i = 0; i < (ms || 6000) / 150; i++) { if (await f()) return true; await p.waitForTimeout(150); } return false; };
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const line = (id, sid) => p.evaluate(([id, sid]) => JSON.parse(JSON.stringify((_photoRefs[id] || []).find((r) => r.stableId === sid) || null)), [id, sid]);
    const toDesk = async (id) => {
      await p.evaluate((id) => { setCurrentJob(id); populateInventorySelect(); }, id);
      await p.click('.nb[onclick*="\'inventory\'"]'); await p.waitForTimeout(700);
      const sel = await p.evaluate(() => (document.getElementById('inv-job') || {}).value);
      if (String(sel) !== String(id)) { await p.selectOption('#inv-job', String(id)); await p.waitForTimeout(700); }
    };

    // ── Seed ──────────────────────────────────────────────────────────────────────────────────────────────
    await p.evaluate(([T0, EST, GONE, COLD, NEW]) => {
      const base = { status: 'active', won: true, wonAt: '2026-09-17', approved: true, tc: 'Ashley Jerome', city: 'Palm Beach', zip: '33480',
        created: '2026-09-10', start: '2026-09-21', activatedOn: '2026-09-21', driveFolder: 'https://drive.google.com/drive/folders/ROOT68', docTier: 'values',
        driveSubfolders: { 'Estate Inventory': 'SUB-INV', 'As-Found Record': 'SUB-AF', 'Signed Records': 'SIGNED-68' }, updatedAt: T0 };
      const L = (id, o) => Object.assign({ stableId: id, label: 'inventory', collId: null, roomIdx: 1, seq: 1, status: 'uploaded', qty: 1,
        category: 'Furniture', condition: 'Good', ts: T0, updatedAt: T0, driveFileId: 'f-' + id, driveFileUrl: 'https://drive.google.com/file/d/f-' + id + '/view' }, o);
      const est = (id, svc, o) => ({ approved: true, submitted: true, approvedBy: 'Anthony Graziano', savedAt: T0,
        estimate: Object.assign({ jobId: id, svc, havellinTotal: 10000, totTC: 40, totPS: 80, tcRate: 150, psRate: 100, days: 4, collections: [], vendors: [], prepItems: [],
          rooms: [{ idx: 1, name: 'Study', st: 'in' }, { idx: 4, name: 'Kitchen', st: 'in' }] }, o || {}) });
      const paid = [{ id: 1, uid: 'p1', stage: 'deposit', amount: 5000, method: 'wire', receivedOn: '2026-09-01', clearedOn: '2026-09-01' },
                    { id: 2, uid: 'p2', stage: 'midpoint', amount: 2500, method: 'wire', receivedOn: '2026-09-10', clearedOn: '2026-09-10' }];
      jobs.unshift(
        Object.assign({ id: EST, hvlId: 'HVL-2610-E681', name: 'Tripp Butler Sr', fname: 'Tripp', lname: 'Butler', svc: 'probate', matterType: 'probate',
          addr: '12 Ocean Way', deathDate: '2026-03-01', executorAuth: 'received', executor: 'Tripp Butler', executorRole: 'Personal Representative',
          executorEmail: 'tripp@butler.example', signedRecords: [] }, base),
        Object.assign({ id: GONE, hvlId: 'HVL-2610-G682', name: 'Gone Walkaway', fname: 'Gone', lname: 'Walkaway', svc: 'downsizing', addr: '3 Lake Trail' }, base,
          { status: 'closed_retained', lostAt: '2026-10-02T15:00:00Z', lostReason: 'other', lostReasonLabel: 'Client walked away', havellinEst: 10000,
            payments: paid.concat([{ id: 3, uid: 'r1', stage: 'refund', amount: 7500, refundedOn: '2026-10-03', method: 'check', payee: 'Gone Walkaway', recordedBy: 'Anthony Graziano' }]) }),
        Object.assign({ id: COLD, hvlId: 'HVL-2610-C683', name: 'Cold Cache', fname: 'Cold', lname: 'Cache', svc: 'downsizing', addr: '5 Royal Palm' }, base,
          { status: 'closed_retained', lostAt: '2026-10-02T15:00:00Z', lostReasonLabel: 'Client walked away', payments: paid.slice(0, 1) }),
        Object.assign({ id: NEW, hvlId: 'HVL-2610-N684', name: 'Estate of Ada New', fname: 'Ada', lname: 'New', svc: 'cleanout', addr: '7 Via Mizner',
          sqft: '3500', beds: 3, baths: 2, deathDate: '2026-05-01', executor: 'Rex New', executorEmail: 'rex@new.example', docTier: 'values' }, base,
          { status: 'new', won: false, wonAt: '', approved: false, activatedOn: '', start: '2026-11-02' }));
      estimateStore[EST] = est(EST, 'probate');
      estimateStore[GONE] = est(GONE, 'downsizing');
      _photoRefs[EST] = [
        L('k1', { itemNo: 1, objectName: 'Sideboard', fmv: '900', disposition: 'Sell', channel: 'Kodner Galleries' }),
        L('k2', { itemNo: 2, objectName: 'Hall mirror', fmv: '200', disposition: 'Auction', channel: '  kodner   galleries ' }),
        L('j1', { itemNo: 3, objectName: 'Bookcase', fmv: '300', disposition: 'Sell', channel: 'Jane Buyer' }),
        // The as-found shot that failed and whose image this device never held.
        { stableId: 'af1', roomIdx: 1, label: 'before', seq: 1, status: 'failed', filename: 'af1.jpg', ts: T0, updatedAt: T0 },
      ];
      jobPlanStore[EST] = { rooms: { 1: { foundDone: { at: '2026-09-22', by: 'Ashley Jerome' } } }, tasks: {} };
      savePhotoRefs(EST);
      saveJobs();
      localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore));
      _logsState = 'ready';
    }, [T0, EST, GONE, COLD, NEW]).catch((e) => ok(false, 'seed: ' + e.message.split('\n')[0]));

    // ════════════════════════════════════════════════════════════════════════════════════════════════════
    await section('A. the vendor pickup list: pre-ticked, one unticked, filed; the line reads picked up and its custody is closed', async () => {
      await toDesk(EST);
      const card = await txt('#inv-releases');
      has(card, 'Vendor pickups', 'the Releases & signed papers card has the section');
      has(card, 'Kodner Galleries · 2 lines (#1, #2)', '⚠⚠ the auction house\'s two lines, whatever the capitals or spacing');
      has(card, 'Jane Buyer · 1 line (#3)', 'and the buyer\'s');
      await press('#inv-releases button[onclick^="openPickupDialog(' + EST + ',&quot;kodner"], #inv-releases button[onclick^="openPickupDialog(' + EST + ',\\"kodner"]', 'File pickup list for Kodner Galleries');
      ok(await p.evaluate(() => document.getElementById('inv-pickup-modal').style.display === 'flex'), 'the dialog opens');
      const ticks = await p.evaluate(() => [...document.querySelectorAll('#ip-body .ip-tick')].map((x) => x.getAttribute('data-sid') + ':' + x.checked));
      eq(ticks, ['k1:true', 'k2:true'], '⚠⚠ every line on that vendor\'s channel is ticked');
      await p.click('#ip-body .ip-tick[data-sid="k2"]'); await p.waitForTimeout(150);
      await p.setInputFiles('#inv-pickup-modal input[type=file]', { name: 'kodner-sheet.jpg', mimeType: 'image/jpeg', buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) });
      await until(() => p.evaluate(() => document.getElementById('inv-pickup-modal').style.display === 'none'));
      ok(await p.evaluate(() => document.getElementById('inv-pickup-modal').style.display === 'none'), 'filed, the dialog closes');
      const up = await p.evaluate(() => window.__uploads.slice(-1)[0] || {});
      eq(up.folderId, 'SIGNED-68', 'to the Signed Records folder');
      has(up.filename, 'Vendor pickup list - Kodner Galleries', 'named for what it is');
      const rec = await p.evaluate((id) => (jobs.find((j) => j.id === id).signedRecords || []).filter((r) => r.kind === 'pickup').map((r) => [r.ref, r.stableIds]), EST);
      eq(rec, [['Kodner Galleries', ['k1']]], '⚠⚠ recorded: the vendor and the line ticked');
      await toDesk(EST);
      has(await txt('#inv-row-k1'), 'picked up by Kodner Galleries', '⚠⚠ the row reads picked up');
      lacks(await txt('#inv-row-k2'), 'picked up by', 'the unticked line does not');
      const ev = ((await line(EST, 'k1')).custodyLog || []).filter((e) => !e.deletedAt).map((e) => [e.action, e.party, e.method]);
      eq(ev, [['Released', 'Kodner Galleries', 'Vendor pickup']], '⚠⚠ a probate estate keeps custody: a Released event to the vendor');
      const card2 = await txt('#inv-releases');
      has(card2, 'on a pickup list: #1 · not on one: #2', 'the card says what the list covers and what it does not');
      has(card2, 'File another pickup list', 'and offers the next sheet');
    });

    // ════════════════════════════════════════════════════════════════════════════════════════════════════
    await section('B. Mark lost: one tap, who and when, the flag clears, Lock still waits', async () => {
      await p.evaluate((id) => openJobPlanFor(id), EST); await p.waitForTimeout(900);
      has(await txt('#job-plan-content'), 'not saved', 'fixture: the room card flags the failed shot');
      await press('#job-plan-content button.rl-row[onclick="openRoomWorkspace(' + EST + ',1)"]', 'the Study');
      has(await txt('#room-ws'), 'not saved, image not held', 'the tile says the image is gone');
      eq(await p.locator('#room-ws button[onclick="retryPhotoUpload(' + EST + ',\'af1\')"]').count(), 0, 'no Retry that cannot work');
      await press('#room-ws button[onclick="markShotLost(' + EST + ',\'af1\')"]', '⚠⚠ Mark lost');
      const af = await line(EST, 'af1');
      eq([af.status, af.lostAt, af.lostBy], ['lost', await p.evaluate(() => _todayStr()), 'Ashley Jerome'], '⚠⚠ recorded: lost, the day, the concierge');
      const ws = await txt('#room-ws');
      has(ws, 'Lost · marked', 'the entry stays, reading lost');
      has(ws, 'by Ashley Jerome', 'with who');
      lacks(ws, 'not saved', 'the error is cleared');
      ok(await p.evaluate(() => { const b = document.querySelector('#plan-room-status-1 .ws-btn'); return !!b && b.disabled; }), '⚠⚠ Lock is still refused');
      has(ws, 'Shoot the room as found first', 'and says another as-found shot is needed');
      await p.evaluate(() => closeRoomWorkspace()); await p.waitForTimeout(300);
      lacks(await txt('#job-plan-content'), 'not saved', 'the room card\'s flag is gone');
    });

    // ════════════════════════════════════════════════════════════════════════════════════════════════════
    await section('C. Closed — Refunded: the client list, the Lost list at $0 kept, the client\'s row', async () => {
      await p.click('.nb[onclick*="\'jobs\'"]').catch(() => {}); await p.waitForTimeout(600);
      await p.evaluate(() => { if (typeof goToClientDashboard === 'function') goToClientDashboard(); }); await p.waitForTimeout(600);
      await press('button[onclick="setFilter(\'closed\')"], .fb[onclick*="\'closed\'"]', 'the Closed filter');
      const row = await txt('#panel-jobs tr[onclick="openClientDashboard(' + GONE + ')"]');
      has(row, 'Closed — Refunded', '⚠⚠ the client list reads Closed — Refunded');
      has(await txt('#panel-jobs tr[onclick="openClientDashboard(' + COLD + ')"]'), 'Closed — Deposit Retained', 'a walkaway that kept its deposit reads as before');
      await press('#wl-tile-lost', 'the Lost tile');
      const lost = await txt('#wl-list-lost');
      has(lost, 'Gone Walkaway', '⚠⚠ the refunded walkaway is on the Lost list');
      has(lost, 'Closed — Refunded · $0 kept', 'with the net it kept, at $0');
      await press('#wl-tile-won', 'the Won tile');
      lacks(await txt('#wl-list-won'), 'Gone Walkaway', 'and off the Won list');
      await press('#wl-list-lost tr[onclick="openClientDashboard(' + GONE + ')"]', 'open the client from the Lost list');
      const dash = await txt('#client-dashboard-view');
      has(dash, 'Closed — refunded', '⚠⚠ the client\'s one row reads Closed — refunded');
      has(dash, '$0 kept after refunds', 'and names the net kept');
    });

    // ════════════════════════════════════════════════════════════════════════════════════════════════════
    await section('D. the Deposit Retained card on a settlement it cannot work out says what it waits on', async () => {
      await p.evaluate((id) => goToClientDashboard(id), COLD); await p.waitForTimeout(700);
      const s = await txt('#jt-settle-' + COLD);
      has(s, 'Walkaway settlement', 'the card carries the settlement');
      has(s, 'cannot be worked out until its estimate loads on this device', '⚠⚠ and says what it waits on');
      eq(await p.locator('#jt-settle-' + COLD + ' button').count(), 0, 'with no refund offered');
    });

    // ════════════════════════════════════════════════════════════════════════════════════════════════════
    await section('E. Build Estimate: the suggested fixed fee is a whole hundred, and says so', async () => {
      await p.evaluate((id) => goToClientDashboard(id), NEW); await p.waitForTimeout(500);
      await p.evaluate((id) => openEstimateScreen(id), NEW); await p.waitForTimeout(1500);
      ok(await p.evaluate(() => { const e = document.getElementById('e-fixed'); return !!(e && e.checked); }), 'fixture: an estate opens on a fixed price');
      const fee = await p.evaluate(() => window._fixedPriceSuggested);
      ok(fee > 0 && fee % 100 === 0, '⚠⚠ the suggestion is a whole hundred ($' + fee + ')');
      const amt = await p.evaluate(() => document.getElementById('e-fixed-amount').value);
      eq(amt, await p.evaluate((f) => fmt(f), fee), 'the fee box holds it');
      await p.click('#fixed-toggle-wrap label.toggle .slider'); await p.waitForTimeout(500);   // the switch a person presses
      ok(!(await p.evaluate(() => document.getElementById('e-fixed').checked)), 'the box unticked, the panel offers the suggestion');
      has(await txt('#fixed-price-label'), 'rounded up to the next $100', 'and says it is rounded up');
    });

    // ════════════════════════════════════════════════════════════════════════════════════════════════════
    await section('F. overflow at 1440 and 390, no page errors', async () => {
      await toDesk(EST);
      ok(await overflow() <= 0, 'the desk fits at 1440 (' + await overflow() + ')');
      await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(400);
      await toDesk(EST);
      ok(await overflow() <= 0, 'the desk fits at 390 (' + await overflow() + ')');
      await p.click('#inv-releases button[onclick^="openPickupDialog(' + EST + '"]', { timeout: 3000 }).catch(() => {});
      await p.waitForTimeout(300);
      ok(await overflow() <= 0, 'the pickup dialog fits at 390 (' + await overflow() + ')');
      await p.evaluate(() => closePickupDialog());
      await p.evaluate((id) => goToClientDashboard(id), GONE); await p.waitForTimeout(500);
      ok(await overflow() <= 0, 'the refunded client fits at 390 (' + await overflow() + ')');
      await p.setViewportSize({ width: 1440, height: 1000 });
      eq(errs, [], 'no page errors');
    });

    console.log('\n' + pass + ' passed, ' + fail + ' failed');
    await b.close();
    process.exit(fail ? 1 : 0);
  } catch (e) {
    console.log('  ✗ the step threw: ' + (e && e.stack || e));
    try { if (b) await b.close(); } catch (x) {}
    console.log('\n' + pass + ' passed, ' + (fail + 1) + ' failed');
    process.exit(1);
  }
})();
