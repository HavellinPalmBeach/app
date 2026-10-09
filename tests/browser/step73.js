// Step 73 — P25 group 2, the field taps (2026-10-09): Anthony's answers to the job-flow audit's questions, as a person meets
// them, through the real controls.
//
//   A. Build Estimate: a heavy estate suggests a second concierge and leaves the count at one (Q47)
//   B. the dashboard: the rooms with no walkthrough note are named under Submit, and Submit asks nothing (Q45)
//   C. the Job Plan: a locked room is marked cleared from its row (Q40); the as-found camera goes on to Items in one tap,
//      where the Close-up shutter waits for a first item (Q40, Q41); a living room's workspace offers no as-found tick (Q40)
//   D. Home Transition's move day: four boxes and a procedure (Q42)
//   E. the desk: a Donate line takes the one confirmed charity, marked from the Job Plan (Q44); an estate's desk reads the
//      delivery to counsel off the package, with no served or filed box (Q43)
//   F. overflow at 1440 and 390; no page errors
//
//   NODE_PATH=/opt/node22/lib/node_modules node tests/browser/step73.js [/abs/path/to/havellin.html]
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
const BIG = 7301, NEWJ = 7302, LIVE = 7303, MOVE = 7304, EST = 7305;

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
      args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
    await ctx.grantPermissions(['camera']).catch(() => {});
    let sheet = {};
    await ctx.route(SYNC + '**', async (r) => {
      const req = r.request();
      const json = (o) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
      if (req.method() === 'POST') return json({ ok: true });
      if (/action=loadMedia/.test(req.url())) return json({ ok: true, media: sheet });
      return json({ ok: true });
    });
    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    const dialogs = [];
    p.on('dialog', async (d) => { dialogs.push(d.type() + ': ' + d.message()); await d.accept(); });
    await p.goto(APP); await p.waitForTimeout(1600);
    await p.evaluate((u) => {
      SHEETS_SYNC_URL = u;
      window.open = function () { return null; };
      window.gmailCreateDraft = function (mime, cb) { cb(true, { draftId: 'd1', messageId: 'm1' }); };
      window.sendInternalEmail = function () {};
      window.notifyManagerForApproval = function () {};
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
      if (v) { await p.locator(sel).first().click({ timeout: 5000 }).catch((e) => ok(false, (what || sel) + ' — ' + e.message.split('\n')[0])); await p.waitForTimeout(600); }
      return v;
    };
    const txt = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }, sel);
    const val = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.value : null; }, sel);
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const dash = async (id) => { await p.evaluate((id) => { showPanel('jobs', document.querySelector('.nb[onclick*="\'jobs\'"]')); openClientDashboard(id); }, id); await p.waitForTimeout(700); };
    const toDesk = async (id) => {
      await p.evaluate((id) => { setCurrentJob(id); populateInventorySelect(); }, id);
      await p.click('.nb[onclick*="\'inventory\'"]'); await p.waitForTimeout(900);
      if (String(await val('#inv-job')) !== String(id)) { await p.selectOption('#inv-job', String(id)); await p.waitForTimeout(900); }
    };

    // ── Seed ────────────────────────────────────────────────────────────────
    sheet = await p.evaluate(([BIG, NEWJ, LIVE, MOVE, EST, T0]) => {
      const won = { won: true, wonAt: '2026-09-25', approved: true, created: '2026-09-20', walkthrough: '2026-09-22', tc: 'Ashley Jerome',
        city: 'Palm Beach', zip: '33480', agrApproved: true, agrSent: true, agrSigned: true, status: 'active', activatedOn: '2026-10-05', start: '2026-10-06',
        docState: { estimate: { sentAt: '2026-09-24T14:00:00Z' }, agreement: { sentAt: '2026-09-26T14:00:00Z', sig: { signedBy: 'Client', signedAt: '2026-09-28' } },
          'invoice:deposit': { sentAt: '2026-09-29T14:00:00Z' } } };
      const rec = (id, est) => ({ approved: true, submitted: true, approvedBy: 'Anthony Graziano', approvedAt: 'September 23, 2026', savedAt: T0,
        estimate: Object.assign({ jobId: id, tcRate: 150, psRate: 100, vendors: [], prepItems: [], pkgCost: 0 }, est) });
      // A: a heavy contested probate at the walkthrough, a big house, eight rooms scored full.
      const rooms = ['Living Room', 'Dining Room', 'Kitchen', 'Library', 'Primary Bedroom', 'Bedroom 2', 'Garage', 'Attic'].map((n, i) => ({ idx: i, name: n, st: 'in', vol: 5, cplx: 5, note: i ? '' : 'pantry' }));
      jobs.unshift({ id: BIG, hvlId: 'HVL-2610-B301', name: 'Edith Crane', svc: 'contested_probate', matterType: 'probate', addr: '1 Big Rd', city: 'Palm Beach',
        zip: '33480', executor: 'Ann Crane', executorRole: 'Personal Representative', executorEmail: 'ann@example.com', deathDate: '2026-05-01',
        probateCase: '50-2026-CP-000777', docTier: 'appraisals', gate706: 'yes', dispute: 'yes', status: 'new', created: '2026-09-20', walkthrough: '2026-09-22',
        start: '2026-10-14', tc: 'Ashley Jerome', sqft: '9000', payments: [] });
      estimateStore[BIG] = { approved: false, submitted: false, savedAt: T0, estimate: { jobId: BIG, svc: 'contested_probate', sqft: 9000, tcRate: 150, psRate: 100,
        vendors: [], prepItems: [], pkgCost: 0, rooms: rooms } };
      // B: a living cleanout, estimate saved and not submitted, two rooms without a note.
      jobs.unshift({ id: NEWJ, hvlId: 'HVL-2610-N302', name: 'Nell Price', svc: 'home_cleanout', addr: '2 New St', email: 'nell@example.com', status: 'new',
        created: '2026-10-01', walkthrough: '2026-10-02', tc: 'Ashley Jerome', city: 'Palm Beach', zip: '33480', sqft: '2000', payments: [] });
      estimateStore[NEWJ] = { approved: false, submitted: false, savedAt: T0, estimate: { jobId: NEWJ, svc: 'home_cleanout', havellinTotal: 9000, totTC: 30, totPS: 40,
        tcRate: 150, psRate: 100, vendors: [], prepItems: [], pkgCost: 0, sqft: 2000,
        rooms: [{ idx: 0, name: 'Kitchen', st: 'in', vol: 3, cplx: 3, note: 'two pantries' }, { idx: 1, name: 'Den', st: 'in', vol: 3, cplx: 3 }, { idx: 2, name: 'Garage', st: 'in', vol: 3, cplx: 3 }] } };
      // C/E: an active living cleanout, the Kitchen locked, one confirmed donation charity, a line to set Donate.
      jobs.unshift(Object.assign({}, won, { id: LIVE, hvlId: 'HVL-2610-L303', name: 'Pat Butler', svc: 'home_cleanout', addr: '3 C St', email: 'pat@example.com',
        vendorSourcing: { Ldon: { status: 'Confirmed', vendorName: 'Goodwill Palm Beach' } },
        payments: [{ uid: 'l1', stage: 'deposit', amount: 5000, receivedOn: '2026-10-01', method: 'wire', clearedOn: '2026-10-01' }] }));
      estimateStore[LIVE] = rec(LIVE, { svc: 'home_cleanout', havellinTotal: 10000, totTC: 40, totPS: 40, days: 4,
        vendors: [{ lid: 'don', type: 'Donation Pickup', cost: 0 }],
        rooms: [{ idx: 0, name: 'Kitchen', st: 'in', vol: 3, cplx: 3 }, { idx: 1, name: 'Den', st: 'in', vol: 3, cplx: 3 }] });
      jobPlanStore[LIVE] = { rooms: { 0: { status: 'locked' }, 1: { status: 'pending' } }, at: {} };
      const item = (job, id, o) => Object.assign({ stableId: id, label: 'inventory', roomIdx: 0, seq: 1, status: 'uploaded', category: 'Furniture',
        disposition: '', objectName: 'Line ' + id, ts: T0, updatedAt: T0, filename: 'HVL_' + job + '_INV_' + id + '.jpg', driveFileId: 'f-' + id }, o);
      _photoRefs[LIVE] = [item(LIVE, 'chair', { itemNo: 1, objectName: 'Side chair' }), item(LIVE, 'b1', { label: 'before', roomIdx: 1, itemNo: undefined, objectName: undefined })];
      // D: an active Home Transition.
      jobs.unshift(Object.assign({}, won, { id: MOVE, hvlId: 'HVL-2610-M304', name: 'Moe Fields', svc: 'downsizing_move', addr: '4 D St', email: 'moe@example.com',
        destAddr: '9 New Home Ln', payments: [{ uid: 'm1', stage: 'deposit', amount: 6000, receivedOn: '2026-10-01', method: 'wire', clearedOn: '2026-10-01' }] }));
      estimateStore[MOVE] = rec(MOVE, { svc: 'downsizing_move', havellinTotal: 12000, totTC: 40, totPS: 60, days: 5, rooms: [{ idx: 0, name: 'Kitchen', st: 'in', vol: 3, cplx: 3 }] });
      // E: an active probate estate whose package went to counsel with the Court Inventory and the ledger.
      jobs.unshift(Object.assign({}, won, { id: EST, hvlId: 'HVL-2610-E305', name: 'Harold Whitcombe', svc: 'probate', matterType: 'probate', addr: '5 E St',
        executor: 'Thomas Whitcombe', executorRole: 'Personal Representative', executorEmail: 't@example.com', deathDate: '2026-04-02', executorAuth: 'received',
        probateCase: '50-2026-CP-001234', docTier: 'values', gate706: 'yes', probateAttyName: 'R. Comiter', probateAttyEmail: 'rc@law.com',
        driveFolder: 'https://drive.google.com/drive/folders/X',
        docState: Object.assign({}, won.docState, { probatePackage: { sentAt: '2026-10-08T15:00:00Z', sentBy: 'Ashley Jerome', pkg: { owed: ['court', 'schedule', 'ledger', 'worklist'], docs: ['court', 'schedule', 'ledger', 'worklist'], to: 'rc@law.com', cc: '' } } }),
        payments: [{ uid: 'e1', stage: 'deposit', amount: 20000, receivedOn: '2026-10-01', method: 'wire', clearedOn: '2026-10-01' }] }));
      estimateStore[EST] = rec(EST, { svc: 'probate', havellinTotal: 40000, fixedPrice: true, fixedAmount: 40000, fixedLines: true, totTC: 100, totPS: 150, days: 8,
        rooms: [{ idx: 0, name: 'Living Room', st: 'in', vol: 3, cplx: 3 }] });
      _photoRefs[EST] = [item(EST, 'e1', { itemNo: 1, objectName: 'Writing desk', disposition: 'Keep' })];
      [LIVE, EST].forEach((id) => savePhotoRefs(id));
      saveJobs(); localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore));
      const out = {};
      [LIVE, EST].forEach((id) => { out[id] = { items: JSON.parse(localStorage.getItem('hav_media_' + id) || '[]') }; });
      return out;
    }, [BIG, NEWJ, LIVE, MOVE, EST, T0]);

    // ── A ───────────────────────────────────────────────────────────────────
    await section('A. Build Estimate suggests a second concierge and leaves the count at one', async () => {
      await dash(BIG);
      await press('#client-dashboard-view button[onclick="dashGoEstimate(' + BIG + ')"]', 'Build estimate');
      await p.waitForTimeout(1500);
      eq(await val('#e-tc-count'), '1', '⚠⚠ the count stays at one concierge');
      const hint = await txt('#e-tc2-hint');
      has(hint, 'A second concierge suggested', '…and the engine\'s recommendation is a suggestion');
      has(hint, 'Pick 2 above to staff one', 'saying how to take it');
      await p.selectOption('#e-tc-count', '2'); await p.waitForTimeout(500);
      has(await txt('#e-tc2-hint'), '2 concierges recommended', 'picked, it says so');
      eq(await val('#e-tc-count'), '2', 'and the pick holds');
    });

    // ── B ───────────────────────────────────────────────────────────────────
    await section('B. the rooms with no note are named under Submit, and Submit asks nothing', async () => {
      await dash(NEWJ);
      has(await txt('#client-dashboard-view'), 'No walkthrough note: Den, Garage', '⚠⚠ the rooms without a note, under Submit');
      const n0 = dialogs.length;
      await press('#client-dashboard-view button[onclick="dashSubmitEstimate(' + NEWJ + ')"]', 'Submit for approval');
      await p.waitForTimeout(600);
      eq(dialogs.slice(n0).filter((d) => /walkthrough note/i.test(d)), [], '⚠⚠ no question about notes');
      eq(await p.evaluate((id) => !!(estimateStore[id] && estimateStore[id].submitted), NEWJ), true, 'and it was submitted');
    });

    // ── C ───────────────────────────────────────────────────────────────────
    await section('C. the Job Plan: Cleared from the row; the as-found camera goes on to Items; no as-found tick on living work', async () => {
      await p.evaluate((j) => openJobPlanFor(j), LIVE); await p.waitForTimeout(2200);
      const rows = '#plan-rooms-' + LIVE;
      eq(await p.locator(rows + ' .rl-clear').count(), 1, '⚠⚠ one Mark cleared, on the locked Kitchen');
      has(await txt(rows + ' .rl-clear'), 'no after photo yet', 'naming the after photo still missing');
      await press(rows + ' .rl-clear', 'Mark cleared');
      await p.waitForTimeout(500);
      eq(await p.evaluate((id) => jobPlanStore[id].rooms[0].status, LIVE), 'cleared', 'the Kitchen is cleared, without opening it');
      eq(await p.locator(rows + ' .rl-clear').count(), 0, 'and the row no longer offers it');
      await press(rows + ' .rl-row[onclick="openRoomWorkspace(' + LIVE + ',1)"]', 'the Den');
      eq(await p.locator('#room-ws input[onchange^="setRoomFoundDone"]').count(), 0, '⚠ a living room offers no as-found tick: the shot is the pass');
      lacks(await txt('#room-ws'), 'as-found pass is not confirmed', 'and nothing flags it, with an as-found shot on the room');
      await press('#room-ws button.ws-cam[onclick="openFieldCamera(' + LIVE + ',1,\'before\')"]', 'As found');
      await p.waitForTimeout(900);
      await press('#field-cam .fc-next', 'Next: Items →');
      await p.waitForTimeout(900);
      has(await txt('#field-cam .fc-room'), 'Items', '⚠⚠ one tap, and the camera is on the Items pass');
      ok(await vis('#field-cam .fc-closeup'), 'the Close-up shutter is beside the main one');
      eq(await p.evaluate(() => { const e = document.querySelector('#field-cam .fc-closeup'); return !!(e && (e.disabled || e.tagName === 'BUTTON' && e.hasAttribute('disabled'))); }), true,
        'and waits for a first item to be close to');
      eq(await p.locator('#field-cam button[onclick="fieldCamToggleDetail()"]').count(), 0, 'the two-tap toggle is gone');
      await press('#field-cam .fc-done', 'Done');
      await p.evaluate(() => { try { closeRoomWorkspace(); } catch (e) {} });
    });

    // ── D ───────────────────────────────────────────────────────────────────
    await section('D. Home Transition\'s move day: four boxes and a procedure', async () => {
      await p.evaluate((j) => openJobPlanFor(j), MOVE); await p.waitForTimeout(2000);
      eq(await p.locator('#stage-p3 input[type=checkbox]').count(), 4, '⚠⚠ four boxes on move day');
      has(await txt('#stage-p3 .stg-count'), '0 of 4 ticked', 'the stage counts them');
      eq(await p.locator('#stage-p3 .plan-proc li').count(), 5, 'and the procedure, five lines to read');
      has(await txt('#stage-p3 .plan-proc'), 'be on site before they arrive', 'with the presence rules');
    });

    // ── E ───────────────────────────────────────────────────────────────────
    await section('E. the desk: a Donate line takes the confirmed charity; the delivery to counsel is read off the package', async () => {
      await toDesk(LIVE);
      const row = '#inv-row-chair';
      ok(await vis(row), 'fixture: the chair\'s row is on the desk');
      await p.selectOption(row + ' select[onchange*="\'disposition\'"]', 'Donate'); await p.waitForTimeout(700);
      eq(await p.evaluate(() => (_photoRefs[7303].find((r) => r.stableId === 'chair') || {}).channel), 'Goodwill Palm Beach', '⚠⚠ Donate: the confirmed charity is its recipient');
      has(await txt('#inv-row-chair'), 'from the Job Plan', 'marked as from the Job Plan');
      eq(await val('#inv-row-chair input[onchange*="\'channel\'"]'), 'Goodwill Palm Beach', 'in the recipient box, editable');
      await toDesk(EST);
      // The Job Admin card opens on its header (it is folded by default).
      if (!(await p.evaluate((id) => !!(window._jobAdminOpen && _jobAdminOpen[id]), EST))) await press('[onclick^="toggleJobAdmin(' + EST + ')"]', 'the Job Admin card\'s header');
      const desk = await txt('#panel-inventory');
      has(desk, 'Court Inventory and Disposition Ledger delivered to counsel', '⚠⚠ the estate\'s desk reads the delivery off the package');
      lacks(await p.evaluate(() => document.getElementById('panel-inventory') ? document.getElementById('panel-inventory').innerHTML : ''), "'ct_filed'", 'and asks nobody to tick counsel\'s filing');
    });

    // ── F ───────────────────────────────────────────────────────────────────
    await section('F. overflow and page errors', async () => {
      ok(await overflow() <= 0, 'the desk fits at 1440 (' + await overflow() + ')');
      await p.setViewportSize({ width: 390, height: 844 });
      await p.evaluate((j) => openJobPlanFor(j), LIVE); await p.waitForTimeout(1500);
      ok(await overflow() <= 0, 'the Job Plan\'s room list fits at 390 (' + await overflow() + ')');
      await p.evaluate((j) => openJobPlanFor(j), MOVE); await p.waitForTimeout(1500);
      ok(await overflow() <= 0, 'move day fits at 390 (' + await overflow() + ')');
      eq(errs, [], 'no page errors');
    });
  } catch (e) {
    fail++; console.log('  ✗ threw: ' + String(e && e.message || e).split('\n')[0]);
  } finally {
    if (b) await b.close().catch(() => {});
    console.log('  step73: ' + pass + ' passed, ' + fail + ' failed');
    process.exit(fail ? 1 : 0);
  }
})();
