// Step 137 — the walkthrough's own camera, and the yards on the room grid (2026-11-04; Anthony, off the first live
// walkthrough: "we really needed to take pictures of each room and the yard at the walkthrough/estimate phase. And the
// yard is not even an area of the home that we have in the app to even price").
//   A. Build Estimate on a client not yet won: Front Yard and Back Yard are rows under Exterior & Auxiliary, and
//      ticking the back yard full raises the quote.
//   B. With no Apps Script URL the 📷 refuses by name and records nothing.
//   C. With one, a photo taken through the room's real 📷 (its file chooser) reaches Drive (a stubbed Apps Script),
//      the row's count reads 1, and the count opens the viewer with the photo linked to its file in Drive.
//   D. Save: the saved room carries the photo; reopened, the count still reads 1.
//   E. Drive refusing: the photo is held as not saved, the page owes it (the unload guard), and Retry in the viewer
//      records it once Drive answers.
//   F. The Job Plan's room brief offers the room's photos; the inventory manifest holds none of them.
//   G. Overflow at 1440 and 390, no page errors.
//   H. 🔍 Walkthrough (pressed on the dashboard): the kitchen's photos under its row, three across, real size, thumbnails
//      fetched and painted, each linked to its file, the folder linked; three across on a phone too.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step137.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
// A 2×2 PNG, so the page's compressImage has a real image to draw.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==', 'base64');
(async () => {
  b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  p.setDefaultTimeout(8000);
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  const dialogs = []; p.on('dialog', async d => { dialogs.push(d.message()); await d.accept(); });
  // The stubbed Apps Script: uploads answer as Drive does (or refuse while `refuse` is set), thumbnails answer none,
  // and every other request fails, so the page runs as a device with the sheet out of reach.
  let refuse = false, nUp = 0; const uploads = [], thumbAsks = [];
  await p.route('https://script.example/**', async (route) => {
    const req = route.request();
    let body = {}; try { body = JSON.parse(req.postData() || '{}'); } catch (e) {}
    if (body.action === 'uploadFile') {
      uploads.push(body);
      if (refuse) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'Drive said no' }) });
      nUp++;
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, fileId: 'F' + nUp, fileUrl: 'https://drive.google.com/file/d/F' + nUp + '/view' }) });
    }
    if (body.action === 'getThumbnails') {
      const thumbs = {}; (body.fileIds || []).forEach(id => { thumbs[id] = 'data:image/png;base64,' + PNG.toString('base64'); });
      thumbAsks.push(body.fileIds || []);
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, thumbs }) });
    }
    return route.abort();
  });
  await p.goto(APP); await p.waitForTimeout(1500);
  const future = (() => { const d = new Date(); d.setDate(d.getDate() + 30);
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10); })();

  const id = await p.evaluate((wt) => {
    const b = document.getElementById('btn-add-client'); if (b) b.click();
    const set = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; if (e.onchange) e.onchange(); } };
    const pick = (id) => { const e = document.getElementById(id); const x = e && Array.from(e.options).find(x => x.value); if (x) { e.value = x.value; if (e.onchange) e.onchange(); } };
    set('i-svc', 'downsizing'); toggleIntakeFields();
    set('i-fname', 'Ruth'); set('i-lname', 'Yardley'); set('i-addr', '9 Yard Way'); set('i-city', 'Palm Beach'); set('i-zip', '33480');
    set('i-sqft', '3500'); set('i-phone', '(561) 555-0142'); set('i-email', 'r@example.com'); set('i-home-value', '3000000');
    pick('i-ptype'); pick('i-src'); set('i-walkthrough', wt);
    const st = new Date(wt); st.setDate(st.getDate() + 7); while (st.getDay() === 0 || st.getDay() === 6) st.setDate(st.getDate() + 1);
    set('i-start', st.toISOString().slice(0, 10)); saveIntake(); return (jobs[0] || {}).id;
  }, future);
  await p.waitForTimeout(1500);
  const open = async () => {
    const btn = p.locator('#client-dashboard-view button[onclick="dashGoEstimate(' + id + ')"]').first();
    if (await btn.isVisible().catch(() => false)) await btn.click();
    else await p.evaluate((id) => dashGoEstimate(id), id);
    await p.waitForTimeout(1200);
  };
  const rowOf = (name) => p.evaluate((name) => {
    let ri = 0, hit = null; ROOMS.forEach(s => s.rooms.forEach(r => { if (r.name === name && !hit) hit = 'r' + ri; ri++; })); return hit;
  }, name);
  // Open the section a row sits in, by its own header, where it is shut.
  const reveal = async (rid) => {
    const shut = await p.evaluate((rid) => { const r = document.getElementById('row-' + rid); return !(r && r.checkVisibility()); }, rid);
    if (shut) { await p.evaluate((rid) => { const s = document.getElementById('row-' + rid).closest('.room-sec'); s.querySelector('.sec-hdr').click(); }, rid); await p.waitForTimeout(200); }
  };
  const count = (rid) => p.evaluate((rid) => { const e = document.getElementById('wph-n-' + rid); return e ? { t: e.textContent, vis: e.checkVisibility() } : null; }, rid);
  const take = async (rid) => {
    await reveal(rid);
    const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click('#wph-add-' + rid)]);
    await fc.setFiles({ name: 'kitchen.png', mimeType: 'image/png', buffer: PNG });
    await p.waitForTimeout(1500);
  };

  // ── A. the yards ───────────────────────────────────────────────────────
  console.log('## A. Front Yard and Back Yard on the grid, priced on top');
  await open();
  const kId = await rowOf('Kitchen'), byId = await rowOf('Back Yard'), fyId = await rowOf('Front Yard');
  ok(kId && byId && fyId, 'the kitchen, the front yard and the back yard each have a row (' + [kId, fyId, byId].join(', ') + ')');
  const secOf = await p.evaluate((rid) => { const r = document.getElementById('row-' + rid); const s = r && r.closest('.room-sec');
    return s ? s.querySelector('.sec-hdr').textContent : ''; }, byId);
  has(secOf, 'Exterior & Auxiliary', 'the back yard sits under Exterior & Auxiliary');
  await p.evaluate((ids) => { ids.forEach(i => document.getElementById('chk-' + i).click()); calcAll(); }, [kId, await rowOf('Living Room')]);
  const t0 = await p.evaluate(() => currentEstimate && currentEstimate.grandTotal);
  await reveal(byId);
  await p.click('#chk-' + byId);
  await p.fill('#vol-' + byId, '5'); await p.dispatchEvent('#vol-' + byId, 'input'); await p.waitForTimeout(400);
  const t1 = await p.evaluate(() => currentEstimate && currentEstimate.grandTotal);
  ok(t1 > t0, '⚠ a back yard scored full raises the quote (' + t0 + ' → ' + t1 + ')');

  // ── B. no Apps Script URL ──────────────────────────────────────────────
  console.log('## B. no Apps Script URL: refused by name');
  await reveal(kId);
  ok(await p.locator('#wph-add-' + kId).isVisible(), 'the kitchen row shows its 📷');
  await take(kId);
  ok(dialogs.some(d => /Photo not taken/.test(d) && /Apps Script URL/.test(d)), 'the 📷 refuses by name (' + dialogs.slice(-1)[0] + ')');
  ok(!(await count(kId)).vis, 'and records nothing');

  // ── C. a photo reaches Drive ───────────────────────────────────────────
  console.log('## C. a photo through the real 📷 reaches Drive and is counted on the row');
  await p.evaluate((id) => {
    SHEETS_SYNC_URL = 'https://script.example/exec';
    const j = jobs.find(x => x.id === id); j.driveFolder = 'https://drive.google.com/drive/folders/ROOT'; j.driveSubfolders = { 'Walkthrough Photos': { id: 'W1' } };
  }, id);
  await take(kId);
  ok(uploads.length === 1 && uploads[0].folderId === 'W1', 'one upload, into Walkthrough Photos (' + uploads.map(u => u.folderId).join(',') + ')');
  ok(uploads[0] && /Walkthrough Kitchen/.test(uploads[0].filename), 'named for the room (' + (uploads[0] && uploads[0].filename) + ')');
  const c1 = await count(kId);
  ok(c1 && c1.vis && /1/.test(c1.t), '⚠ the row\'s count reads 1 (' + JSON.stringify(c1) + ')');
  await p.click('#wph-n-' + kId); await p.waitForTimeout(400);
  const viewer = await p.evaluate(() => { const m = document.getElementById('wph-modal'); return m ? { vis: m.checkVisibility(), t: m.textContent, href: (m.querySelector('a[href]') || {}).href } : null; });
  ok(viewer && viewer.vis, 'the count opens the viewer');
  has(viewer && viewer.t, 'Walkthrough photos — Kitchen', 'titled for the room');
  ok(viewer && viewer.href === 'https://drive.google.com/file/d/F1/view', 'the photo links to its file in Drive (' + (viewer && viewer.href) + ')');
  await p.click('#wph-modal button.btn-p'); await p.waitForTimeout(200);
  ok(!(await p.evaluate(() => document.getElementById('wph-modal').checkVisibility())), 'Close closes it');

  // ── D. saved and reopened ──────────────────────────────────────────────
  console.log('## D. saved with the estimate, there on reopen');
  await p.click('button[onclick="saveEstimateAndPreview()"]'); await p.waitForTimeout(2200);
  const sv = await p.evaluate((id) => { const r = estimateStore[id] && estimateStore[id].estimate; const k = r && (r.rooms || []).find(x => x.name === 'Kitchen');
    return k ? (k.photos || []).map(x => x.fileId) : null; }, id);
  ok(JSON.stringify(sv) === '["F1"]', '⚠ the saved kitchen carries the photo (' + JSON.stringify(sv) + ')');
  await open();
  const kId2 = await rowOf('Kitchen');
  const c2 = await count(kId2);
  ok(c2 && c2.vis && /1/.test(c2.t), '⚠ reopened, the count still reads 1 (' + JSON.stringify(c2) + ')');

  // ── E. Drive refusing, then Retry ──────────────────────────────────────
  console.log('## E. Drive refusing: held, owed, then Retry');
  refuse = true;
  await take(kId2);
  const c3 = await count(kId2);
  ok(c3 && /not saved/.test(c3.t), 'the row says one is not saved (' + JSON.stringify(c3) + ')');
  ok(await p.evaluate(() => _syncOwedOnUnload()), '⚠ the page owes it: the guard asks before the tab closes');
  refuse = false;
  await p.click('#wph-n-' + kId2); await p.waitForTimeout(400);
  const retry = p.locator('#wph-modal button:has-text("Retry")');
  ok(await retry.isVisible().catch(() => false), 'the viewer offers Retry on it');
  await retry.click(); await p.waitForTimeout(1500);
  const c4 = await count(kId2);
  ok(c4 && /2/.test(c4.t) && !/not saved/.test(c4.t), '⚠ Retry records it once Drive answers (' + JSON.stringify(c4) + ')');
  ok(!(await p.evaluate(() => walkPhotosOwed())), 'and no photo is owed (the sheet\'s own writes still wait: the stub refuses them)');
  await p.evaluate(() => closeWalkPhotos());

  // ── F. the plan's brief, and never inventory ───────────────────────────
  console.log('## F. the Job Plan\'s room brief; never in the inventory manifest');
  await p.click('button[onclick="saveEstimateAndPreview()"]'); await p.waitForTimeout(2200);
  const brief = await p.evaluate((id) => { const k = (estimateStore[id].estimate.rooms || []).find(x => x.name === 'Kitchen'); return walkPhotoBriefHtml(id, k); }, id);
  has(brief, 'Walkthrough photos (2)', 'the room brief offers both');
  ok(await p.evaluate((id) => !(_photoRefs[id] || []).length, id), '⚠ the inventory manifest holds none of them');

  // ── H. the Walkthrough page ────────────────────────────────────────────
  console.log('## H. 🔍 Walkthrough: the kitchen\'s photos under it, three across, linked to Drive');
  await p.evaluate(() => { window._walkThumbs = window._walkThumbs || {}; Object.keys(_walkThumbs).forEach(k => delete _walkThumbs[k]); Object.keys(_walkThumbAsked).forEach(k => delete _walkThumbAsked[k]); });
  await p.evaluate((id) => goToClientDashboard(id), id); await p.waitForTimeout(800);
  const wtBtn = p.locator('#client-dashboard-view button[onclick="dashWalkthrough(' + id + ')"]').first();
  ok(await wtBtn.isVisible().catch(() => false), 'the dashboard offers 🔍 Walkthrough');
  await wtBtn.click(); await p.waitForTimeout(1500);
  const wt = await p.evaluate(() => {
    const body = document.getElementById('doc-viewer-body');
    const grid = body && body.querySelector('.wt-photos');
    const tiles = grid ? Array.from(grid.querySelectorAll('a.wt-ph')) : [];
    const prev = grid && grid.closest('tr').previousElementSibling;
    const folder = body && body.querySelector('.wt-photo-folder a');
    return { vis: !!(body && body.checkVisibility()), grids: body ? body.querySelectorAll('.wt-photos').length : 0,
      cols: grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').length : 0,
      w: tiles.map(t => Math.round(t.getBoundingClientRect().width)), imgs: grid ? grid.querySelectorAll('img').length : 0,
      hrefs: tiles.map(t => t.href), under: prev ? prev.textContent : '', folder: folder ? folder.href : '',
      line: (body.querySelector('.wt-photo-folder') || {}).textContent || '' };
  });
  ok(wt.vis, 'the Walkthrough page opens');
  ok(wt.grids === 1, 'one room carries photos, one grid (' + wt.grids + ')');
  has(wt.under, 'Kitchen', '⚠ the grid sits right under the kitchen\'s own row');
  ok(wt.cols === 3, '⚠ three across (' + wt.cols + ' columns)');
  ok(wt.w.length === 2 && wt.w.every(x => x >= 200), '⚠ each a real photo, not a chip: ' + wt.w.join(', ') + ' px wide at 1440');
  ok(wt.imgs === 2, '⚠ the thumbnails are fetched from Drive and painted in (' + wt.imgs + ' of 2)');
  ok(thumbAsks.length >= 1, 'asked of the Apps Script (' + thumbAsks.length + ' request)');
  ok(wt.hrefs.every(h => /^https:\/\/drive\.google\.com\/file\/d\/F\d\/view$/.test(h)), 'each opens its file in Drive (' + wt.hrefs.join(' ') + ')');
  has(wt.line, '2 walkthrough photos', 'the page counts them');
  ok(/drive/.test(wt.folder), 'and links the folder they are in (' + wt.folder + ')');
  await p.setViewportSize({ width: 390, height: 900 }); await p.waitForTimeout(300);
  const wt390 = await p.evaluate(() => {
    const grid = document.querySelector('#doc-viewer-body .wt-photos');
    const vb = document.querySelector('.doc-viewer-body') || document.getElementById('doc-viewer-body');
    return { w: grid ? Array.from(grid.querySelectorAll('a.wt-ph')).map(t => Math.round(t.getBoundingClientRect().width)) : [],
      ov: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  ok(wt390.w.length === 2 && wt390.w.every(x => x >= 80), 'on a phone still three across, ' + wt390.w.join(', ') + ' px each');
  ok(wt390.ov <= 0, 'and the page does not run off the side (' + wt390.ov + ')');
  await p.setViewportSize({ width: 1440, height: 1000 });
  await p.evaluate(() => closeDocViewer());

  // ── G. overflow ────────────────────────────────────────────────────────
  console.log('## G. overflow and errors');
  for (const w of [1440, 390]) {
    await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(300);
    const ov = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok(ov <= 0, 'no horizontal overflow at ' + w + ' px (' + ov + ')');
  }
  ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));

  await b.close();
  console.log(pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch(async e => { console.log('THREW: ' + (e && e.stack || e)); try { if (b) await b.close(); } catch (x) {} console.log(pass + ' passed, ' + (fail + 1) + ' failed'); process.exit(1); });
