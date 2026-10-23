// Step 98 — bigger photographs on the desk (2026-10-23; Anthony: "can we make the thumbnails a bit bigger so that when
// we're at the desk we can actually see what the images are. They're quite small"). Through the real controls, on the
// Job Admin & Inv tab with a seeded estate whose photographs are already on this device (the cache the Apps Script fills):
//
//   A. at 1440: every row's photograph is 72 px and painted; Possible duplicates draws each pair at 72
//   B. the row's ▾ opens the line's record: its photograph at 240 px and its close-up at 120, both painted
//   C. at 390: the same sizes, no horizontal overflow with the record open; no page errors
//
//   NODE_PATH=<dir>/node_modules node tests/browser/step98.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    for (const W of [1440, 390]) {
      console.log('\n## at ' + W + ' px');
      const ctx = await b.newContext({ viewport: { width: W, height: 900 } });
      const p = await ctx.newPage();
      p.setDefaultTimeout(10000);
      const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
      p.on('dialog', async (d) => { await d.accept(); });
      await p.goto(APP); await p.waitForTimeout(1600);
      // An estate with three photographed lines, a close-up of the first, and two agent-named chairs off different
      // photographs in one room (a Possible duplicates pair). The thumbnails sit in the device's cache, as they do once the
      // Apps Script has answered.
      await p.evaluate(() => {
        const T0 = Date.parse('2026-09-24T15:00:00Z');
        const base = { status: 'active', won: true, wonAt: '2026-09-17', approved: true, tc: 'Ashley Jerome', city: 'Palm Beach',
                       created: '2026-09-10', start: '2026-09-21', driveFolder: 'F' };
        jobs.unshift(Object.assign({ id: 9801, hvlId: 'HVL-2609-T981', name: 'Tripp Butler', fname: 'Tripp', lname: 'Butler', svc: 'probate',
          addr: '69 Beach Blvd', executor: 'Margaret Butler', deathDate: '2026-04-02', matterType: 'probate', docTier: 'values' }, base));
        estimateStore[9801] = { approved: true, submitted: true, savedAt: T0, estimate: { jobId: 9801, svc: 'probate', havellinTotal: 20000,
          collections: [], vendors: [], prepItems: [], rooms: [{ idx: 1, name: 'Study', st: 'in' }] } };
        const L = (id, o) => Object.assign({ stableId: id, label: 'inventory', roomIdx: 1, status: 'uploaded', category: 'Furniture',
          disposition: 'Keep', ts: T0, updatedAt: T0, driveFileId: 'f-' + id, driveFileUrl: 'https://drive.google.com/file/d/f-' + id + '/view' }, o);
        _photoRefs[9801] = [
          L('s1', { seq: 1, itemNo: 1, objectName: 'Oak sideboard' }),
          L('s2', { seq: 2, itemNo: 2, objectName: 'Brass lamp' }),
          L('c1', { seq: 3, itemNo: 3, objectName: 'Oak chair', namedBy: 'agent' }),
          L('c2', { seq: 4, itemNo: 4, objectName: 'Oak chair', namedBy: 'agent' }),
          { stableId: 'd1', label: 'detail', groupId: 's1', roomIdx: 1, status: 'uploaded', ts: T0 + 5, updatedAt: T0, driveFileId: 'f-d1' },
        ];
        const cv = document.createElement('canvas'); cv.width = 240; cv.height = 180;
        const g = cv.getContext('2d'); g.fillStyle = '#8a5a2b'; g.fillRect(0, 0, 240, 180);
        const uri = cv.toDataURL('image/jpeg', 0.7);
        const cache = _invThumbCache(9801);
        ['f-s1', 'f-s2', 'f-c1', 'f-c2', 'f-d1'].forEach((id) => { cache[id] = uri; });
        savePhotoRefs(9801); saveJobs();
        setCurrentJob(9801); populateInventorySelect();
      });
      await p.click('.nb[onclick*="\'inventory\'"]'); await p.waitForTimeout(900);
      if (await p.evaluate(() => (document.getElementById('inv-job') || {}).value) !== '9801') {
        await p.selectOption('#inv-job', '9801'); await p.waitForTimeout(800);
      }
      // [width, height, painted] of a thumbnail by its file id inside a container.
      const thumb = (scope, id) => p.evaluate(([scope, id]) => {
        const el = document.querySelector(scope + ' [data-thumb-id="' + id + '"]');
        if (!el || !el.checkVisibility()) return null;
        const r = el.getBoundingClientRect();
        return [Math.round(r.width), Math.round(r.height), /url\(/.test(el.style.backgroundImage)];
      }, [scope, id]);
      const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

      eq(await thumb('#inv-row-s1', 'f-s1'), [72, 72, true], 'A. the sideboard\'s row draws its photograph at 72 px, painted');
      eq(await thumb('#inv-row-s2', 'f-s2'), [72, 72, true], 'A. and the lamp\'s');
      eq(await p.locator('.inv-dup-group').count(), 1, 'A. fixture: the two chairs are a Possible duplicates pair');
      eq(await thumb('.inv-dup-group', 'f-c1'), [72, 72, true], 'A. Possible duplicates draws each photograph at 72 px');
      eq(await thumb('.inv-dup-group', 'f-c2'), [72, 72, true], 'A. both of them');

      const chev = 'button[onclick="_invToggleOpen(\'s1\')"]';
      ok(await p.locator(chev).first().isVisible(), 'B. the sideboard\'s ▾ is on screen');
      await p.click(chev); await p.waitForTimeout(500);
      // The record's photograph is the second f-s1 in the row (the row's own is first); its close-up is f-d1.
      const opened = await p.evaluate(() => Array.from(document.querySelectorAll('#inv-row-s1 [data-thumb-id="f-s1"]'))
        .map((el) => { const r = el.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height), /url\(/.test(el.style.backgroundImage)]; }));
      eq(opened, [[72, 72, true], [240, 240, true]], 'B. the opened record shows the photograph at 240 px, painted');
      eq(await thumb('#inv-row-s1', 'f-d1'), [120, 120, true], 'B. and its close-up at 120 px');
      ok(await overflow() <= 0, 'C. no horizontal overflow with the record open at ' + W + ' (' + await overflow() + ')');
      eq(errs, [], 'C. no page errors');
      await ctx.close();
    }
    await b.close();
    console.log('\n' + pass + ' passed, ' + fail + ' failed');
  } catch (e) {
    console.log('  ✗ threw: ' + (e && e.stack || e));
    if (b) await b.close().catch(() => {});
    console.log('\n' + pass + ' passed, ' + (fail + 1) + ' failed');
  }
})();
