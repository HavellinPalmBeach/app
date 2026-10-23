// Step 92 — Remove lines on the desk's bulk bar (2026-10-19; Anthony, the first practice job: the Items pass photographed
// the inside of every drawer and the inventory came back as "hundreds and hundreds of items", with one Remove line per
// item the only way back).
//
// Drives the REAL page: an estate seeded with an as-found shot and four inventory lines (two split off one photograph);
// the row boxes ticked through the real controls; the bar's Remove lines pressed with the question refused, then
// accepted; the lines gone from the list and under Removed items with who removed them; the photograph and the as-found
// shot untouched; the manifest saved once; overflow at 1440 and 390 with the bar up; Read Photographing a House on the
// In the house stage and in a room, opening over the app (2026-10-19); zero page errors.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step92.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');

const T0 = Date.parse('2026-10-10T15:00:00Z');
const EST = 9101;

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    const dialogs = [];
    let accept = true;
    p.on('dialog', async (d) => { dialogs.push(d.type() + ': ' + d.message()); if (accept) await d.accept(); else await d.dismiss(); });
    await p.goto(APP); await p.waitForTimeout(1600);

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
    const toDesk = async (id) => {
      await p.evaluate((id) => { setCurrentJob(id); populateInventorySelect(); }, id);
      await p.click('.nb[onclick*="\'inventory\'"]'); await p.waitForTimeout(900);
      if (String(await val('#inv-job')) !== String(id)) { await p.selectOption('#inv-job', String(id)); await p.waitForTimeout(900); }
    };
    const live = () => p.evaluate((id) => _jobInvRefs(id).map((r) => r.stableId), EST);
    const refOf = (sid) => p.evaluate(([id, sid]) => { const r = _getPhotoRef(id, sid); return r ? { deletedAt: !!r.deletedAt, deletedBy: r.deletedBy || '', driveFileId: r.driveFileId || '' } : null; }, [EST, sid]);
    const tick = (sid) => press('input[onchange="_invTogglePick(\'' + sid + '\',this)"]', 'the box on ' + sid);

    // ── Seed: an Estate Settlement; an as-found shot; four lines, two split off one photograph ──
    await p.evaluate(([EST, T0]) => {
      jobs.unshift({ id: EST, hvlId: 'HVL-2610-R910', name: 'Estate of Miriam Vance', svc: 'cleanout', matterType: 'neither', addr: '9 Lake Trail', city: 'Palm Beach', zip: '33480',
        executor: 'Paul Vance', executorRole: 'Personal Representative', executorEmail: 'p@example.com', deathDate: '2026-05-02', docTier: 'values', gate706: 'no',
        status: 'active', won: true, wonAt: '2026-09-25', approved: true, tc: 'Ashley Jerome', created: '2026-09-20', start: '2026-10-06', activatedOn: '2026-10-05',
        agrApproved: true, agrSent: true, agrSigned: true,
        driveFolder: 'https://drive.google.com/drive/folders/ROOT910', driveSubfolders: { 'Estate Inventory': 'INV910', 'As-Found Record': 'AF910' },
        docState: { agreement: { sentAt: '2026-09-26T14:00:00Z', sig: { signedBy: 'P', signedAt: '2026-09-28' } } },
        payments: [{ uid: 'e1', stage: 'deposit', amount: 9000, receivedOn: '2026-10-01', method: 'wire', clearedOn: '2026-10-01' }] });
      estimateStore[EST] = { approved: true, submitted: true, approvedBy: 'Anthony Graziano', approvedAt: 'September 23, 2026', savedAt: T0,
        estimate: { jobId: EST, svc: 'cleanout', havellinTotal: 18000, fixedPrice: true, fixedAmount: 18000, fixedLines: true, totTC: 40, totPS: 60, tcRate: 150, psRate: 100,
          days: 4, vendors: [], prepItems: [], pkgCost: 0, rooms: [{ idx: 0, name: 'Kitchen', st: 'in', vol: 3, cplx: 3 }] } };
      const item = (id, o) => Object.assign({ stableId: id, label: 'inventory', roomIdx: 0, seq: 1, status: 'uploaded', category: 'General/Household', disposition: '',
        objectName: 'Line ' + id, ts: T0, updatedAt: T0, filename: 'HVL_' + EST + '_INV_' + id + '.jpg', driveFileId: 'f-' + id }, o);
      _photoRefs[EST] = [
        { stableId: 'af', label: 'before', roomIdx: 0, seq: 1, status: 'uploaded', ts: T0 - 1000, updatedAt: T0, filename: 'HVL_' + EST + '_BEFORE_1.jpg', driveFileId: 'f-af' },
        item('a', { itemNo: 1, objectName: 'Scotch tape dispensers, red and clear plastic' }),
        item('b', { itemNo: 2, objectName: 'Golf balls, one marked Titleist', derivedFrom: 'a', driveFileId: 'f-a', seq: 2 }),
        item('c', { itemNo: 3, objectName: 'Household battery packs', seq: 3 }),
        item('d', { itemNo: 4, objectName: 'Wooden console table', category: 'Furniture', disposition: 'Keep', seq: 4 })];
      savePhotoRefs(EST);
      saveJobs(); localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore));
      window.__saves = 0;
      const orig = savePhotoRefs;
      savePhotoRefs = function (id) { window.__saves++; return orig(id); };
    }, [EST, T0]);

    // ── A ───────────────────────────────────────────────────────────────────
    await section('A. the desk: four lines, no bar until a box is ticked, then Remove lines on it', async () => {
      await toDesk(EST);
      eq(await live(), ['a', 'b', 'c', 'd'], 'four live lines');
      eq(await p.locator('button[onclick="invBulkRemove(' + EST + ')"]').count(), 0, 'no bar, no Remove lines, with nothing ticked');
      await tick('a'); await tick('b'); await tick('c');
      has(await txt('#panel-inventory'), '3 selected', 'three selected on the bar');
      ok(await vis('button[onclick="invBulkRemove(' + EST + ')"]'), 'and Remove lines is on it');
      eq(await overflow(), 0, 'no horizontal overflow at 1440 with the bar up');
    });

    // ── B ───────────────────────────────────────────────────────────────────
    await section('B. the question refused: nothing removed, nothing saved', async () => {
      accept = false;
      const saves = await p.evaluate(() => window.__saves);
      await press('button[onclick="invBulkRemove(' + EST + ')"]', 'Remove lines');
      const q = dialogs[dialogs.length - 1] || '';
      has(q, 'confirm: Remove 3 lines from the inventory?', 'it asks, counting the lines');
      has(q, '#1 Scotch tape dispensers, red and clear plastic', 'and names them');
      has(q, 'No photograph is deleted', 'and says the photographs stay');
      has(q, 'Removed items, under Removed items & snapshots on Job Admin & Inv, gives them back.', 'and names the way back (its bar, since 2026-10-22)');
      eq(await live(), ['a', 'b', 'c', 'd'], 'refused: the four lines stay');
      eq(await p.evaluate(() => window.__saves), saves, 'and nothing was saved');
      has(await txt('#panel-inventory'), '3 selected', 'the selection stands');
    });

    // ── C ───────────────────────────────────────────────────────────────────
    await section('C. accepted: the three lines off, under Removed items with who removed them; the photograph and the as-found shot kept', async () => {
      accept = true;
      await p.evaluate(() => { localStorage.setItem('hav_device_user', 'Ashley Jerome'); });
      const saves = await p.evaluate(() => window.__saves);
      await press('button[onclick="invBulkRemove(' + EST + ')"]', 'Remove lines');
      await p.waitForTimeout(500);
      eq(await live(), ['d'], 'one live line left: the console table');
      eq(await p.evaluate(() => window.__saves) - saves, 1, '⚠ the manifest was saved once, not once per line');
      eq(await refOf('a'), { deletedAt: true, deletedBy: 'Ashley Jerome', driveFileId: 'f-a' }, 'a removed line is a tombstone stamped with who, photograph kept');
      eq(await refOf('b'), { deletedAt: true, deletedBy: 'Ashley Jerome', driveFileId: 'f-a' }, 'the line split off the same photograph too');
      eq(await refOf('af'), { deletedAt: false, deletedBy: '', driveFileId: 'f-af' }, 'the as-found shot is untouched');
      const panel = await txt('#panel-inventory');
      eq(await p.locator('input[onchange="_invTogglePick(\'a\',this)"]').count(), 0, 'the tape has no live row (its box is gone)');
      has(panel, 'Removed items', 'Removed items is on the tab');
      has(panel, '#1 · Scotch tape dispensers, red and clear plastic', 'with the removed line');
      has(panel, 'by Ashley Jerome', 'and who removed it');
      eq(await p.locator('#panel-inventory button:has-text("Restore")').count() >= 3, true, 'each has Restore');
      eq(await p.locator('button[onclick="invBulkRemove(' + EST + ')"]').count(), 0, 'the selection is cleared, so the bar is gone');
      has(await txt('#sync-status'), '3 lines removed', 'the toast says so');
      const stored = await p.evaluate((id) => JSON.parse(localStorage.getItem('hav_media_' + id) || '[]').filter((r) => r.deletedAt).length, EST);
      eq(stored, 3, 'and the three tombstones are in the saved manifest');
    });

    // ── D ───────────────────────────────────────────────────────────────────
    await section('D. the pocket size: the bar up at 390 with no overflow', async () => {
      await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(500);
      await tick('d');
      // ⚠ RESTATED 2026-10-22 (the desk on a phone): at 390 the bar is one line and its controls sit behind Actions, so Remove
      // lines is one press away there: hidden until Actions is pressed, then on screen.
      ok(!(await vis('button[onclick="invBulkRemove(' + EST + ')"]')), 'at 390 the bar is one line, Remove lines behind Actions');
      await press('#inv-bulk-tog-' + EST, 'the bar\'s Actions, at 390');
      ok(await vis('button[onclick="invBulkRemove(' + EST + ')"]'), 'Remove lines is on the bar at 390');
      eq(await overflow(), 0, 'no horizontal overflow at 390 with the bar up');
      await p.evaluate(() => _invClearPicks());
    });

    // ── E ───────────────────────────────────────────────────────────────────
    await section('E. Read Photographing a House: on the In the house stage and in the room, opening over the app', async () => {
      await p.setViewportSize({ width: 1440, height: 1000 }); await p.waitForTimeout(300);
      await p.evaluate((id) => openJobPlanFor(id), EST); await p.waitForTimeout(1200);
      const stage = await txt('#stage-rooms');
      has(stage, 'Read Photographing a House', 'the In the house stage carries the link');
      await press('#stage-rooms a[href="photography-guide.html"]', 'Read Photographing a House (on the stage)');
      eq(await p.evaluate(() => document.getElementById('guide-modal').style.display), 'flex', 'the guide opens over the app');
      ok(/photography-guide\.html$/.test(await p.evaluate(() => document.getElementById('guide-frame').getAttribute('src') || '')), 'and the frame holds the guide');
      eq(await txt('#guide-title'), 'Photographing a House', 'titled Photographing a House');
      await p.evaluate(() => closeGuidePage());
      await press('[onclick="openRoomWorkspace(' + EST + ',0)"]', 'the Kitchen room card');
      const room = await txt('#room-ws');
      has(room, 'Read Photographing a House', 'the room workspace carries the link too');
      await press('#room-ws a[href="photography-guide.html"]', 'Read Photographing a House (in the room)');
      eq(await p.evaluate(() => document.getElementById('guide-modal').style.display), 'flex', 'and it opens from the room');
      await p.evaluate(() => { closeGuidePage(); closeRoomWorkspace(); });
    });

    eq(errs, [], 'zero page errors');
    await b.close();
  } catch (e) {
    fail++;
    console.log('  ✗ step threw: ' + String(e && e.stack || e));
    if (b) await b.close().catch(() => {});
  }
  console.log('\nstep92: ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
