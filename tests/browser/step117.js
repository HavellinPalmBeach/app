// Step 117 — Nothing is lost: the Jobs sheet and every device's copy (P1 of the desk audit, 2026-10-27).
//
// The audit drove it on the real page (GAP3, browser.js): More ▾ › Snapshot on a 450-line probate desk posted a client record
// of 81,554 characters; the sheet's writer cleared the Jobs tab before the write that then threw; 2.25 s later the iPad that
// pressed it held 0 clients under "All changes saved ✓"; every other device emptied itself at first contact ("Loaded 0 jobs
// from Sheets ✓"); photographs not yet in Drive went with them. Here the page's every call to the main sheet is answered by
// the REAL apps-script/main-sync.gs and saveInventory.gs (tests/sheet-rig.js) over a fake spreadsheet that refuses a cell over
// 50,000 characters as Sheets does (variant D since 2026-10-28: writes applied at a flush, a read or the end of the request, the
// refused cell and everything after it not written; sections A to F run on it, G on the deployment live until the redeploy under
// variant A, as written), the page booting off it as a device does:
//   A. The desk: More ▾ › Snapshot pressed on a 450-line probate estate, labelled as typed. The Jobs tab still holds all three
//      clients, the estate's cell on the sheet is small, the snapshot store holds its 450 lines, every write landed, the page
//      still holds three clients and says nothing was deleted; the snapshot's page is filed to Drive under a dated name; five
//      seconds on, all still whole.
//   B. A second device, reloaded off the sheet: three clients; the estate's desk lists the snapshot; Compare with now, pressed
//      on its row, reads the snapshot's lines from the sheet, then prints: 450 items, a count corrected since named under
//      Count changed.
//   C. A cold desk: the trust estate's inventory read from the sheet is aborted (a dead spot), and More ▾ › Snapshot, + Add line
//      item and CSV each refuse by name and record nothing.
//   D. A record too large for the sheet: a client grown past a cell on this device is saved through Edit Client's own Save
//      Changes; the sheet refuses it by name and writes nothing; the chip names the client and the size and says reloading the
//      tab is safe and what to do; the list went with the other two (P1's review); six seconds on, nothing has been sent again;
//      reloaded, the client is back as the sheet holds it.
//   E. The Jobs tab emptied by hand on the sheet: a device opening the app keeps its three clients, the Clients tab says "The
//      sheet has no clients right now. Nothing on this device was changed. Tell Anthony.", the photographs it had not yet got
//      into Drive are still on it, and nothing says "Loaded 0 jobs"; once the rows are restored, a reload clears the notice.
//      At 1440 and 390 px no horizontal overflow; zero page errors on every device.
//   F. (P1's review) Snapshot whose lines' write is lost on the way (that request aborted, a dead spot): its row reads as saving,
//      with nothing to press; nothing is on the record or on the sheet; once the request goes through, the queue lands the
//      lines and the heading is recorded, on the record and the sheet.
//   G. (P1's review) The deployment live until the redeploy (tests/old-backend, 7abc836): the Jobs tab emptied, a device on this
//      app reloads and keeps its three clients; Edit Client's Save Changes on one client takes nobody off it (it took that
//      client and its estimate) and the notice that nothing changed stays true; + Add New Client, a name typed, Save Client
//      refuses by name and the form keeps the name.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step117.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const path = require('path');
const R = require(path.join(__dirname, '..', 'sheet-rig.js'));
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
const SYNC = 'https://sync.example.test/exec';
const E = 9700, T = 9701, LV = 9702, LINES = 450;
const ME = 'Ashley Jerome';
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');

// ── The sheet: three clients as two devices saving normally leave them ──
const NOW = Date.UTC(2026, 9, 20, 14);   // the clients' own clock readings; the ledger is born a month before
const ROOMS = ['Living Room', 'Dining Room', 'Kitchen', 'Primary Bedroom', 'Guest Bedroom', 'Garage'];
const OBJ = ['Tufted linen three-seat sofa, oatmeal, rolled arms', 'Pair of brass table lamps with pleated linen shades',
  'Herend Rothschild Bird porcelain dinner plates, hand-painted', 'Oil on canvas harbor scene in a carved gilt frame, signed lower right',
  'Mahogany drop-leaf side table on turned legs, likely 1940s', 'Sterling silver candlesticks, Gorham, weighted bases',
  'Wool area rug, Persian style, hand-knotted, about 8 x 10 ft', 'Box of hardcover novels and biographies, mixed authors'];
const CATS = ['Furniture', 'General/Household', 'Collectibles', 'Art & Décor', 'Furniture', 'Silver & Precious Metal', 'Rugs & Textiles', 'Books & Media'];
const DISPS = ['Sell', 'Donate', 'Distribute', 'Auction', 'Keep', 'Consign', 'Junk', 'Hold'];
function estate(id, hvl, first, last, o) {
  return Object.assign({ id, hvlId: hvl, fname: first, lname: last, name: first + ' ' + last, svc: 'probate', matterType: 'probate',
    addr: '9 Audit Way', city: 'Palm Beach', zip: '33480', ptype: 'Single Family Home', src: 'Family', sqft: 3600,
    executor: 'Daniel Price', executorFname: 'Daniel', executorLname: 'Price', executorRole: 'Personal Representative', executorPhone: '(561) 555-0110',
    executorEmail: 'dan@example.com', deathDate: '2026-06-01', executorAuth: 'received', probateAttyName: 'Ann Lowe', probateAttyEmail: 'ann@lowe.law',
    probateCase: '50-2026-CP-004321', docTier: 'values', gate706: 'no', gateDispute: '', status: 'active', won: true, wonAt: '2026-10-01', approved: true, tc: ME,
    created: '2026-09-28', start: '2026-10-12', activatedOn: '2026-10-10', agrApproved: true, agrSent: true, agrSigned: true,
    driveFolder: 'https://drive.google.com/drive/folders/R' + id, driveSubfolders: { 'Estate Inventory': 'INV' + id, 'As-Found Record': 'AF' + id, 'Signed Records': 'SR' + id },
    at: {}, updatedAt: NOW, payments: [{ uid: 'd' + id, stage: 'deposit', amount: 12000, receivedOn: '2026-10-08', method: 'wire', clearedOn: '2026-10-08' }] }, o || {});
}
const JOBS = [
  estate(E, 'HVL-2610-A9700', 'Walter', 'Price'),
  estate(T, 'HVL-2610-A9701', 'Margaret', 'Ellison', { matterType: 'trust', probateCase: '', executor: 'Katherine Ellison', executorFname: 'Katherine',
    executorLname: 'Ellison', executorRole: 'Trustee', executorEmail: 'kate@example.com', trustName: 'Ellison Family Trust' }),
  { id: LV, hvlId: 'HVL-2610-A9702', fname: 'Joan', lname: 'Whitfield', name: 'Joan Whitfield', svc: 'downsizing_move', addr: '1 Hale Road', city: 'Jupiter', zip: '33458',
    email: 'joan@example.com', phone: '(561) 555-0199', status: 'active', won: true, tc: ME, created: '2026-09-29', updatedAt: NOW, at: {} }];
const EST = {};
JOBS.forEach((j) => { EST[j.id] = { approved: true, submitted: true, approvedBy: 'Anthony Graziano', savedAt: NOW,
  estimate: { jobId: j.id, svc: j.svc, havellinTotal: 30000, fixedPrice: true, fixedAmount: 30000, fixedLines: true, totTC: 80, totPS: 120, days: 8,
    vendors: [], prepItems: [], rooms: ROOMS.map((nm, i) => ({ idx: i, name: nm, st: 'in', vol: 3, cplx: 3 })) } }; });
const T0 = NOW - 3 * 3600000;
const line = (id, k) => ({ stableId: 'L' + id + '_' + k, label: 'inventory', roomIdx: k % ROOMS.length, seq: k + 1, itemNo: k + 1, status: 'uploaded', ts: T0 + k * 30000,
  updatedAt: T0 + k * 30000 + 5000, filename: 'HVL_' + id + '_INV_' + k + '.jpg', driveFileId: 'f' + id + k, driveFileUrl: 'https://drive.google.com/file/d/f' + id + k + '/view',
  objectName: OBJ[k % OBJ.length] + ' (' + (k + 1) + ')', namedBy: 'agent', category: CATS[k % CATS.length], disposition: DISPS[k % DISPS.length],
  fmv: String(25 + (k * 37) % 1900), valSource: 'General estimate', valuedBy: 'agent', qty: 1 });
const MEDIA = { [E]: Array.from({ length: LINES }, (_, k) => line(E, k)), [T]: Array.from({ length: 9 }, (_, k) => line(T, k)), [LV]: [] };

function seed(srv) {
  srv._writeStoreBlob('JobLedger', { since: NOW - 30 * 86400000, seen: {}, restore: {} });
  srv.post({ type: 'saveAllJobs', payload: JOBS });
  srv.post({ type: 'saveAllEstimates', payload: EST });
  [E, T].forEach((id) => srv.post({ type: 'saveMedia', payload: { jobId: id, savedAt: NOW, items: MEDIA[id] } }));
}

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const srv = R.server('D');
    seed(srv);
    eq(srv.state(), { jobs: 3, est: 3, plan: 0, log: 0, media: 2, co: 0 }, 'fixture: the sheet holds three clients and two inventories');
    const uploads = [];
    let abortMediaFor = null;
    const DRIVE = ['uploadHtml', 'uploadFile', 'getSubfolders', 'getThumbnails', 'htmlToPdf', 'createFolder'];

    // A device: its own browser context (its own localStorage), the page booting against the sheet as a configured device does.
    const device = async (tag, opt) => {
      opt = opt || {};
      const sv = opt.srv || srv;   // G drives the deployment live until the redeploy
      const ctx = await b.newContext({ viewport: { width: opt.width || 1440, height: 1000 }, timezoneId: 'America/New_York' });
      const d = { tag, ctx, net: [], errs: [], dialogs: [], answers: [] };
      await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
      await ctx.addInitScript(([url, who, ls]) => {
        if (sessionStorage.getItem('__seeded')) return;
        sessionStorage.setItem('__seeded', '1');
        Object.keys(ls || {}).forEach((k) => localStorage.setItem(k, ls[k]));
        localStorage.setItem('hav_sheets_url', url);
        localStorage.setItem('hav_device_user', who);
      }, [SYNC, ME, opt.ls || null]);
      await ctx.route(SYNC + '**', async (r) => {
        const req = r.request();
        let body = {};
        if (req.method() === 'POST') { try { body = JSON.parse(req.postData() || '{}'); } catch (e) {} }
        const q = {};
        (req.url().split('?')[1] || '').split('&').forEach((kv) => { if (kv) { const i = kv.indexOf('='); q[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1) || ''); } });
        const action = body.action || body.type || q.action || '';
        d.net.push({ m: req.method(), action, jobId: q.jobId || (body.payload && body.payload.jobId), bytes: (req.postData() || '').length });
        const json = (o) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: typeof o === 'string' ? o : JSON.stringify(o) });
        if (action === 'loadMedia' && abortMediaFor && String(q.jobId) === String(abortMediaFor)) return r.abort();
        if (d.abortType && body.type === d.abortType) return r.abort();
        if (DRIVE.indexOf(action) >= 0) {
          if (action === 'uploadHtml') { uploads.push(body.filename); return json({ ok: true, fileUrl: 'https://drive.google.com/file/d/html' + uploads.length + '/view', fileId: 'html' + uploads.length }); }
          if (action === 'getThumbnails') return json({ ok: true, thumbs: {} });
          return json({ ok: true, subfolders: {} });
        }
        return json(req.method() === 'POST' ? sv.exec('POST', { postData: { contents: req.postData() || '{}' } }) : sv.exec('GET', { parameter: q }));
      });
      const p = await ctx.newPage();
      p.setDefaultTimeout(10000);
      p.on('pageerror', (e) => d.errs.push(String(e)));
      p.on('dialog', async (dl) => {
        d.dialogs.push(dl.type() + ': ' + dl.message());
        if (dl.type() === 'prompt') { const a = d.answers.shift(); return dl.accept(a == null ? 'Filed with court' : a); }
        return dl.accept();
      });
      d.p = p;
      await p.goto(APP);
      await p.waitForTimeout(2500);
      await p.evaluate(() => {
        window.open = function () { return null; };
        window.__badges = [];
        const o = showSyncBadge; showSyncBadge = function (m, e) { window.__badges.push((e ? '[err] ' : '') + m); return o.apply(this, arguments); };
        window.__printed = '';
        window.print = function () { window.__printed = (document.getElementById('print-target') || {}).innerHTML || ''; };
      });
      return d;
    };
    const section = async (name, body) => {
      console.log('\n## ' + name);
      try { await body(); } catch (e) { fail++; console.log('  ✗ ' + name + ' threw: ' + String(e && e.message || e).split('\n')[0]); }
    };
    const until = async (p, f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < (ms || 8000)) { if (await f()) return true; await p.waitForTimeout(150); } return false; };
    const press = async (p, sel, what) => {
      const n = await p.locator(sel).count();
      const v = n >= 1 && await p.locator(sel).first().isVisible().catch(() => false);
      ok(v, (what || sel) + ' — on screen (' + n + ')');
      if (v) { await p.locator(sel).first().click({ timeout: 5000 }).catch((e) => ok(false, (what || sel) + ' — ' + e.message.split('\n')[0])); await p.waitForTimeout(700); }
      return v;
    };
    const txt = (p, sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }, sel);
    const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const held = (p) => p.evaluate(() => ({ jobs: jobs.length, cache: (JSON.parse(localStorage.getItem('havellin_jobs_v3') || '[]')).length, pending: Object.keys(_pendingWrites), badges: (window.__badges || []).slice() }));
    const toDesk = async (p, id) => {
      await p.click('.nb[onclick*="\'inventory\'"]'); await p.waitForTimeout(800);
      if (String(await p.evaluate(() => (document.getElementById('inv-job') || {}).value)) !== String(id)) await p.selectOption('#inv-job', String(id));
      await until(p, () => p.evaluate((j) => !!_invCloudSeen[j] || !!(_invCloudFailed || {})[j], id), 10000);
      await p.waitForTimeout(800);
    };
    const more = async (p) => { if (!(await p.evaluate(() => !!(document.getElementById('inv-more') || {}).open))) { await p.click('#inv-more > summary'); await p.waitForTimeout(300); } };
    const snapsOf = (p, id) => p.evaluate((j) => ((jobs.find((x) => x.id === j) || {}).invSnapshots || []).map((s) => ({ ts: s.ts, label: s.label, count: s.count, filedUrl: s.filedUrl || '' })), id);

    const A = await device('A');
    let lsBefore = null, snapTs = 0;

    await section('A. More ▾ › Snapshot on a 450-line probate desk: the sheet and this device stay whole', async () => {
      eq((await held(A.p)).jobs, 3, 'fixture: the device booted off the sheet with its three clients');
      ok(await A.p.evaluate(() => typeof backendHasType === 'function' && backendHasType('saveSnapshot')), 'the version probe answered: the deployment keeps a snapshot\'s lines');
      await toDesk(A.p, E);
      eq(await A.p.evaluate((j) => (_photoRefs[j] || []).filter((r) => r.label === 'inventory').length, E), LINES, 'fixture: the desk read the 450 lines from the sheet');
      lsBefore = await A.p.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); } return o; });
      await more(A.p);
      await press(A.p, '#inv-more button:has-text("Snapshot")', 'More ▾ › Snapshot');
      await A.p.waitForTimeout(2500);
      const sn = await snapsOf(A.p, E);
      eq(sn.map((s) => [s.label, s.count]), [['Filed with court', LINES]], 'the snapshot was taken, labelled as typed');
      snapTs = (sn[0] || {}).ts;
      const recLen = await A.p.evaluate((j) => JSON.stringify(jobs.find((x) => x.id === j)).length, E);
      ok(recLen < 10000, '⚠⚠ the client\'s record stays small (' + recLen + ' characters; it was 81,554)');
      eq(srv.jobsRows(), 3, '⚠⚠ the Jobs tab still holds all three clients (it emptied 0.3 s after the press)');
      eq(srv.cellThrows, 0, 'no write reached the 50,000-character cell');
      eq(srv.clears.filter((c) => /^Jobs/.test(c)), [], 'nothing on the Jobs tab was cleared');
      const cell = (srv.rowOf(E) || [])[11] || '';
      ok(cell.length > 0 && cell.length < 10000, '⚠ the estate\'s cell on the sheet is ' + cell.length + ' characters');
      const st = srv.store('SnapshotStore') || {};
      eq((((st[String(E)] || {})[String(snapTs)] || {}).items || []).length, LINES, '⚠⚠ the snapshot store holds its 450 lines');
      const h = await held(A.p);
      eq([h.jobs, h.cache, h.pending], [3, 3, []], 'the device holds its three clients, and every write landed');
      ok(h.badges.every((x) => !/deleted elsewhere|refused by the sheet/.test(x)), 'nothing says a client was deleted or refused');
      ok(uploads.some((f) => /^HVL-2610-A9700 - Havellin Inventory Snapshot - Oct \d+ 2026 .* - Filed with court\.html$/.test(f)), '⚠ the snapshot\'s page is filed to Drive under a dated name (' + uploads.slice(-1)[0] + ')');
      ok(/drive\.google\.com/.test(((await snapsOf(A.p, E))[0] || {}).filedUrl), 'and its link recorded on the snapshot');
      has(await txt(A.p, '#inv-snapshots'), '450 items', 'the snapshot is listed under Removed items & snapshots');
      await A.p.waitForTimeout(5000);
      eq(srv.state().jobs, 3, '⚠⚠ five seconds on, the sheet still holds every client');
      eq((await held(A.p)).jobs, 3, 'and so does the device');
    });

    const B = await device('B', { ls: lsBefore });
    await section('B. A second device, reloaded off the sheet: Compare with now reads the snapshot\'s lines first', async () => {
      eq((await held(B.p)).jobs, 3, '⚠⚠ the second device opens with three clients (it opened with 0)');
      // A count corrected since, on the sheet.
      const items = MEDIA[E].map((r, k) => (k === 7 ? Object.assign({}, r, { qty: 4, updatedAt: NOW + 3600000 }) : r));
      srv.post({ type: 'saveMedia', payload: { jobId: E, savedAt: NOW + 3600000, items } });
      await toDesk(B.p, E);
      // The snapshots are under the last bar, which a device that did not take the snapshot finds shut: opened by its header.
      if (!(await B.p.locator('#inv-snapshots').first().isVisible().catch(() => false))) {
        await press(B.p, '#panel-inventory .sec-hdr.sec-toggle:has-text("Removed items")', 'the Removed items & snapshots bar');
      }
      const n0 = B.net.length;
      await press(B.p, '#inv-snapshots button[onclick="printSnapshotComparison(' + E + ',' + snapTs + ',\'now\')"]', 'Compare with now, on the snapshot\'s row');
      await until(B.p, () => B.p.evaluate(() => !!window.__printed), 6000);
      ok(B.net.slice(n0).some((n) => n.action === 'loadSnapshots'), '⚠ the device asked the sheet for the snapshot\'s lines');
      const page = await B.p.evaluate(() => { const d = document.createElement('div'); d.innerHTML = window.__printed || ''; return d.textContent.replace(/\s+/g, ' '); });
      ok(/Items\s*450 → 450/.test(page), '⚠⚠ the comparison prints, all 450 lines  [' + ((/Items\s*\d+ → \d+/.exec(page) || [''])[0]) + ']');
      has(page, 'Count changed 1', '⚠ and names the count corrected since (it read "Unchanged 400")');
      has(page, 'Unchanged 449', 'the rest unchanged');
      await B.p.evaluate(() => { const pt = document.getElementById('print-target'); if (pt) { pt.style.display = 'none'; pt.innerHTML = ''; } document.querySelectorAll('.panel').forEach((x) => { if (x.dataset.wasActive === '1') x.classList.add('active'); }); });
    });

    await section('C. A cold desk refuses by name: Snapshot, + Add line item, CSV', async () => {
      abortMediaFor = T;
      await toDesk(A.p, T);
      ok(await A.p.evaluate((j) => !_invCloudSeen[j], T), 'fixture: the trust estate\'s inventory could not be read');
      // What the desk says of its own list meanwhile (SYN-08): never "0 of 0 reviewed", never "No items yet".
      const wb = await txt(A.p, '#inv-workbar');
      ok(wb.indexOf('sheet unreachable: this device’s copy') >= 0, '⚠ the work bar says this is the device\'s copy (' + wb.slice(0, 80) + ')');
      ok(!/\b\d+ of \d+ reviewed/.test(wb), '⚠ and counts nothing as reviewed or not');
      const cached = await A.p.evaluate((j) => (_photoRefs[j] || []).length, T);
      const pane = await txt(A.p, '#panel-inventory');
      if (!cached) {
        ok(pane.indexOf('This device has not read this client’s items from the sheet yet') >= 0, '⚠ the rows say the copy has not read the sheet');
        ok(pane.indexOf('No items yet') < 0, '⚠ never "No items yet"');
      } else ok(true, 'fixture: this device holds a copy of the lines, so the rows show it under the bars\' amber');
      const d0 = A.dialogs.length;
      await more(A.p);
      await press(A.p, '#inv-more button:has-text("Snapshot")', 'More ▾ › Snapshot, on a cold desk');
      has(A.dialogs.slice(d0).join(' | '), 'Not done: this device has not read the inventory yet', '⚠⚠ Snapshot refuses by name');
      eq((await snapsOf(A.p, T)).length, 0, '⚠⚠ and records nothing ("Filed with court 0 items $0" before)');
      const d1 = A.dialogs.length;
      await press(A.p, '#inv-workbar button:has-text("+ Add line item")', '+ Add line item');
      has(A.dialogs.slice(d1).join(' | '), 'Not done: this device has not read the inventory yet', '⚠ + Add line item refuses before it numbers anything');
      eq(await A.p.evaluate((j) => (_photoRefs[j] || []).filter((r) => r.manual).length, T), 0, 'and adds no line');
      const d2 = A.dialogs.length;
      await press(A.p, '#inv-workbar button:has-text("CSV")', 'CSV');
      has(A.dialogs.slice(d2).join(' | '), 'Not done: this device has not read the inventory yet', 'CSV refuses too');
      abortMediaFor = null;
    });

    await section('D. A record too large for the sheet: refused by name, held, and safe to close', async () => {
      // The trust estate has grown past a cell on this device (a long list of signed papers, as a long estate might).
      await A.p.evaluate((j) => { const job = jobs.find((x) => x.id === j); job.signedRecords = Array.from({ length: 420 }, (_, i) => ({ id: 'sr' + i, kind: 'receipt', ref: 'x', note: 'y'.repeat(130) })); }, T);
      const rowBefore = JSON.stringify(srv.rowOf(T));
      await A.p.click('.nb[onclick*="\'jobs\'"]'); await A.p.waitForTimeout(600);
      await press(A.p, '#panel-jobs tr[onclick="openClientDashboard(' + T + ')"]', 'the client\'s row, on the Clients tab');
      await press(A.p, '#client-dashboard-view button[onclick="dashEditClient(' + T + ')"]', '✎ Edit Client');
      await press(A.p, '#edit-client-modal button[onclick="saveClientEdit(' + T + ')"]', 'Save Changes');
      await A.p.waitForTimeout(2500);
      eq(JSON.stringify(srv.rowOf(T)), rowBefore, '⚠⚠ the sheet refused it and wrote nothing');
      eq(srv.jobsRows(), 3, 'every client still there');
      const chip = await A.p.evaluate(() => _pendingChipCopy());
      has(chip.head, 'Not saved — Margaret Ellison (HVL-2610-A9701) is too large for the sheet (', '⚠ the chip names the client');
      ok(/\([\d,]+ characters\)/.test(chip.head), 'and the size: ' + chip.head);
      has(chip.note, 'reload this tab (it is safe', '⚠ and says reloading the tab is safe');
      has(chip.note, 'every other client still saves', '⚠ that every other client still saves (P1\'s review)');
      has(chip.note, 'tell Anthony the client and what you had just done', 'and what to do');
      has(await txt(A.p, '#sync-pending-label'), 'is too large for the sheet', 'the chip on screen says so');
      eq((await held(A.p)).pending, ['main/job:' + T], '⚠⚠ only that client is held: the list went with the other two (one client too large refused every client\'s save)');
      const sent = () => A.net.filter((n) => n.m === 'POST' && (n.action === 'saveAllJobs' || n.action === 'job')).length;
      const n0 = sent();
      await A.p.waitForTimeout(6500);
      eq(sent(), n0, '⚠⚠ six seconds on it has not been sent again (the first retry fell due at 2 s)');
      // Reloaded: the client comes back as the sheet holds it, and the page does not ask whether to leave (nothing else is owed).
      const dl0 = A.dialogs.length;
      await A.p.reload(); await A.p.waitForTimeout(2500);
      eq(A.dialogs.slice(dl0).filter((x) => /^beforeunload/.test(x)), [], '⚠ the page does not challenge the reload: the chip says it is safe');
      const back = await A.p.evaluate((j) => { const x = jobs.find((y) => y.id === j); return x ? (x.signedRecords || []).length : -1; }, T);
      eq([back, (await held(A.p)).jobs], [0, 3], 'reloaded, the client is back as the sheet holds it, and every client is there');
    });

    await section('E. The Jobs tab emptied on the sheet: a device opening the app keeps its clients and says so', async () => {
      const saved = srv.sheets.Jobs._rows.map((r) => r.slice());
      srv.sheets.Jobs._rows.splice(1);
      const ls = Object.assign({}, lsBefore, { ['hav_media_pending_' + LV]: JSON.stringify({ shotA: 'data:image/jpeg;base64,AAAA', shotB: 'data:image/jpeg;base64,BBBB' }) });
      const C = await device('C', { ls });
      await C.p.click('.nb[onclick*="\'jobs\'"]').catch(() => {}); await C.p.waitForTimeout(700);
      const h = await held(C.p);
      eq([h.jobs, h.cache], [3, 3], '⚠⚠ the device keeps its three clients (it emptied itself under "Loaded 0 jobs from Sheets ✓")');
      has(await txt(C.p, '#sheet-refusal-note'), 'The sheet has no clients right now. Nothing on this device was changed. Tell Anthony.', '⚠ the Clients tab says so');
      ok(h.badges.every((x) => !/Loaded 0 jobs/.test(x)), 'and nothing says it loaded none');
      eq(await C.p.evaluate((k) => localStorage.getItem(k) !== null, 'hav_media_pending_' + LV), true, '⚠ the photographs it had not got into Drive are still on it');
      eq(await txt(C.p, '#m-tot'), '3', 'the Clients tab still counts three');
      eq(await overflow(C.p), 0, 'no horizontal overflow at 1440');
      await C.p.setViewportSize({ width: 390, height: 844 }); await C.p.waitForTimeout(500);
      eq(await overflow(C.p), 0, 'no horizontal overflow at 390, the notice on screen');
      // Restored from version history; the device reloaded.
      srv.sheets.Jobs._rows.splice(0, srv.sheets.Jobs._rows.length, ...saved);
      await C.p.reload(); await C.p.waitForTimeout(2500);
      await C.p.click('.nb[onclick*="\'jobs\'"]').catch(() => {}); await C.p.waitForTimeout(500);
      eq(await txt(C.p, '#sheet-refusal-note'), '', 'once the rows are back, a reload clears the notice');
      eq((await held(C.p)).jobs, 3, 'with every client');
      eq(C.errs, [], 'zero page errors on the third device');
      await C.ctx.close();
    });

    await section('F. A snapshot whose lines\' write is lost on the way records nothing until they land (P1\'s review)', async () => {
      // The trust estate has no snapshot, so its Removed items & snapshots bar shows only for the one saving.
      await toDesk(A.p, T);
      eq((await snapsOf(A.p, T)).length, 0, 'fixture: the trust estate has no snapshot');
      const before = 0;
      A.abortType = 'saveSnapshot';
      A.answers.push('Delivered to counsel');
      await more(A.p);
      await press(A.p, '#inv-more button:has-text("Snapshot")', 'More ▾ › Snapshot, its lines\' write lost on the way');
      await A.p.waitForTimeout(1500);
      ok(await A.p.locator('#inv-snapshots').first().isVisible().catch(() => false), '⚠ the bar shows for the snapshot saving, the only one this client has');
      const row = await txt(A.p, '#inv-snapshots');
      has(row, 'saving its lines to the sheet', '⚠ its row reads as saving');
      eq(await A.p.locator('#inv-snapshots .snap-pending button').count(), 0, 'with nothing to press on it');
      eq((await snapsOf(A.p, T)).length, before, '⚠⚠ nothing is on the record while its lines are not on the sheet');
      ok(!((JSON.parse((srv.rowOf(T) || [])[11] || '{}').invSnapshots || []).some((s) => s.label === 'Delivered to counsel')),
        '⚠⚠ nor on the sheet (a heading with nothing behind it stayed there for good)');
      A.abortType = null;
      await A.p.evaluate(() => { _retryStep = 0; flushPendingWrites(); });
      await until(A.p, async () => (await snapsOf(A.p, T)).some((s) => s.label === 'Delivered to counsel'), 8000);
      await A.p.waitForTimeout(1200);
      ok((await snapsOf(A.p, T)).some((s) => s.label === 'Delivered to counsel'), '⚠ the lines landed, and the snapshot is recorded');
      ok(((JSON.parse((srv.rowOf(T) || [])[11] || '{}').invSnapshots || []).some((s) => s.label === 'Delivered to counsel')), 'and its heading reached the sheet');
      eq(await A.p.locator('#inv-snapshots .snap-pending').count(), 0, 'and its row no longer reads as saving');
    });

    await section('G. The deployment live until the redeploy: the tab emptied, no save takes a client off this device (P1\'s review)', async () => {
      const old = R.server('A', R.OLD);
      seed(old);
      eq(old.jobsRows(), 3, 'fixture: the old deployment holds three clients');
      const G = await device('G', { srv: old });
      eq((await held(G.p)).jobs, 3, 'fixture: the device booted off it');
      old.sheets.Jobs._rows.splice(1);   // as the page before P1 pressing Snapshot on a full house empties it there
      await G.p.reload(); await G.p.waitForTimeout(2500);
      await G.p.evaluate(() => { window.__badges = []; const o = showSyncBadge; showSyncBadge = function (m, e) { window.__badges.push((e ? '[err] ' : '') + m); return o.apply(this, arguments); }; });
      await G.p.click('.nb[onclick*="\'jobs\'"]'); await G.p.waitForTimeout(600);
      has(await txt(G.p, '#sheet-refusal-note'), 'The sheet has no clients right now. Nothing on this device was changed.', 'fixture: it keeps its three and says so');
      await press(G.p, '#panel-jobs tr[onclick="openClientDashboard(' + LV + ')"]', 'a client\'s row');
      await press(G.p, '#client-dashboard-view button[onclick="dashEditClient(' + LV + ')"]', '✎ Edit Client');
      await press(G.p, '#edit-client-modal button[onclick="saveClientEdit(' + LV + ')"]', 'Save Changes');
      await G.p.waitForTimeout(3000);
      const h = await held(G.p);
      eq([h.jobs, h.cache], [3, 3], '⚠⚠ Save Changes on one client takes nobody off this device (it took that client)');
      ok(await G.p.evaluate((j) => !!estimateStore[j], LV), 'nor its estimate');
      await G.p.click('.nb[onclick*="\'jobs\'"]'); await G.p.waitForTimeout(500);
      has(await txt(G.p, '#sheet-refusal-note'), 'Nothing on this device was changed', '⚠ and the notice that says so is true');
      ok(h.badges.every((x) => !/removed from this device/.test(x)), 'nothing says a client was removed');
      // + Add New Client: Save Client refuses by name, and the form keeps what was typed.
      await press(G.p, '#btn-add-client', '+ Add New Client');
      await G.p.fill('#i-fname', 'Nora'); await G.p.fill('#i-lname', 'Vance');
      const rows0 = old.jobsRows();
      await press(G.p, 'button[onclick="saveIntake()"]', 'Save Client');
      has(await txt(G.p, '#i-fb'), 'Not saved yet: the sheet has refused this device’s clients', '⚠⚠ Save Client refuses a new client while the notice stands');
      eq(await G.p.inputValue('#i-fname'), 'Nora', 'and the form keeps the name typed');
      eq([old.jobsRows(), (await held(G.p)).jobs], [rows0, 3], '⚠⚠ nothing went to the sheet, whose first new client would sweep the others\' records');
      eq(await overflow(G.p), 0, 'no horizontal overflow at 1440');
      eq(G.errs, [], 'zero page errors on the device');
      await G.ctx.close();
    });

    eq(A.errs, [], 'zero page errors on the device that pressed Snapshot');
    eq(B.errs, [], 'zero page errors on the second device');
    console.log('\n' + pass + ' passed, ' + fail + ' failed');
    await b.close();
    process.exit(fail ? 1 : 0);
  } catch (e) {
    console.log('step 117 threw: ' + (e && e.stack || e));
    if (b) await b.close().catch(() => {});
    process.exit(1);
  }
})();
