// Step 80 — the Appraisal Worklist lists a $9,000 sofa (2026-10-14, Anthony: "any category at $3,000+").
//
// Until then only the nine intrinsic categories routed on value, so a Furniture line Agent Two valued at
// $9,000 reached no appraiser on an estate. This drives the REAL desk: a probate estate with a $9,000 sofa,
// a $400 side table, an unvalued painting and a $30,000 car; the Appraisal Worklist is printed through the
// real More ▾ menu and read back. The sofa and the painting are on it; the table and the car are not.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step80.js [/abs/path/to/havellin.html]
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
const EST = 8001;

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
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
    p.on('dialog', async (d) => { await d.accept(); });
    await p.goto(APP); await p.waitForTimeout(1600);
    await p.evaluate((u) => {
      SHEETS_SYNC_URL = u;
      window.open = function () { return null; };
      window.__printed = ''; window.print = function () { var t = document.getElementById('print-target'); window.__printed = t ? t.innerHTML : ''; };
    }, SYNC);
    const vis = (sel) => p.locator(sel).first().isVisible().catch(() => false);
    const press = async (sel, what) => {
      const v = await vis(sel);
      ok(v, what + ' — on screen');
      if (v) { await p.locator(sel).first().click({ timeout: 5000 }); await p.waitForTimeout(700); }
      return v;
    };
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

    // A probate estate on the desk, four lines, none appraised.
    sheet = await p.evaluate(([EST, T0]) => {
      jobs.unshift({ id: EST, hvlId: 'HVL-2610-E804', name: 'Harold Brennan', fname: 'Harold', lname: 'Brennan', svc: 'probate', addr: '1180 N Lake Way', city: 'Palm Beach',
        sqft: '4500', beds: '4', baths: '3', halfBaths: '1', propVal: '7500000', status: 'active', won: true, wonAt: '2026-09-24', start: '2026-10-06', activatedOn: '2026-10-05',
        executor: 'Michael Brennan', executorRole: 'Personal Representative', executorPhone: '(561) 555-0103', executorEmail: 'mb@example.com', deathDate: '2026-06-02', executorAuth: 'received',
        matterType: 'probate', probateCase: '50-2026-CP-004412', docTier: 'values', docLevel: 'formal', tc: 'Ashley Jerome', agrApproved: true, agrSent: true, agrSigned: true,
        docState: { estimate: { sentAt: '2026-09-24T14:00:00Z' }, agreement: { sentAt: '2026-09-26T14:00:00Z', sig: { signedBy: 'Michael Brennan', signedAt: '2026-09-28' } } }, at: {},
        payments: [{ uid: 'p4', stage: 'deposit', amount: 24500, receivedOn: '2026-10-01', method: 'wire', clearedOn: '2026-10-01' }],
        driveFolder: 'https://drive.google.com/drive/folders/f1', driveSubfolders: { 'Estate Inventory': 'sf1', 'As-Found Record': 'sf2' } });
      estimateStore[EST] = { approved: true, submitted: true, approvedBy: 'Anthony Graziano', approvedAt: 'September 23, 2026', savedAt: T0,
        estimate: { jobId: EST, svc: 'probate', havellinTotal: 49000, grandTotal: 49000, fixedPrice: true, fixedAmount: 49000, fixedLines: true, totTC: 120, totPS: 200, tcRate: 150, psRate: 100,
          tcFee: 18000, psFee: 20000, days: 10, vendors: [], prepItems: [], pkgCost: 0, collections: [], psSlots: [], rooms: [{ idx: 0, name: 'Living Room', st: 'in', vol: 3, cplx: 3 }] } };
      const line = (id, over) => Object.assign({ stableId: id, label: 'inventory', roomIdx: 0, seq: 1, status: 'uploaded', category: 'Furniture', disposition: 'Keep', namedBy: 'desk',
        ts: T0, updatedAt: T0, filename: 'HVL-2610-E804_Living Room_INV_' + id + '.jpg', driveFileId: 'f-' + id, driveFileUrl: 'https://drive.google.com/file/d/f-' + id + '/view' }, over);
      _photoRefs[EST] = [line('s1', { itemNo: 1, objectName: 'Linen sofa', fmv: '9000', valSource: 'Desk estimate' }),
                         line('s2', { itemNo: 2, objectName: 'Side table', fmv: '400', valSource: 'Desk estimate' }),
                         line('s3', { itemNo: 3, objectName: 'Oil painting', category: 'Art & Décor', fmv: '' }),
                         line('s4', { itemNo: 4, objectName: 'Lexus sedan', category: 'Vehicles & Watercraft', fmv: '30000', valSource: 'Desk estimate' })];
      savePhotoRefs(EST);
      saveJobs(); localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore));
      _logsState = 'ready';
      const back = JSON.parse(localStorage.getItem('hav_media_' + EST) || '[]');
      return { [EST]: { items: back } };
    }, [EST, T0]);

    // The desk, then the worklist through the real menu.
    await p.evaluate((id) => { setCurrentJob(id); populateInventorySelect(); }, EST);
    await p.click('.nb[onclick*="\'inventory\'"]'); await p.waitForTimeout(900);
    const cur = await p.evaluate(() => { const el = document.querySelector('#inv-job'); return el ? el.value : ''; });
    if (String(cur) !== String(EST)) { await p.selectOption('#inv-job', String(EST)); await p.waitForTimeout(900); }
    if (!(await vis('button[onclick*="printAppraisalWorklist("]'))) await press('#inv-more > summary', 'More ▾');
    await press('button[onclick*="printAppraisalWorklist("]', 'Appraisal Worklist');
    await p.waitForTimeout(800);
    const printed = await p.evaluate(() => window.__printed || '');
    ok(printed.length > 500, 'the worklist printed (' + printed.length + ' chars)');
    const plain = printed.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    has(plain, 'Linen sofa', '⚠⚠ the $9,000 sofa is on the Appraisal Worklist');
    has(plain, 'Oil painting', 'the unvalued painting is on it (as before)');
    lacks(plain, 'Side table', 'the $400 table is not');
    lacks(plain, 'Lexus sedan', 'the $30,000 car is not (vehicles route by their collector flag)');

    // The row itself says so, on the desk.
    const row = await p.evaluate(() => { const el = document.getElementById(_invRowDomId('s1')); return el ? el.innerHTML : ''; });
    ok(/specialist appraisal|appraisal in progress/i.test(row), 'the sofa\'s desk row carries the appraisal flag  [row html: ' + row.replace(/\s+/g, ' ').slice(0, 120) + ']');
    const table = await p.evaluate(() => { const el = document.getElementById(_invRowDomId('s2')); return el ? el.innerHTML : ''; });
    ok(!/specialist appraisal|appraisal in progress/i.test(table), 'the $400 table\'s row does not');

    eq(await overflow(), 0, 'no horizontal overflow at 1440');
    await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(500);
    ok((await overflow()) <= 0, 'no horizontal overflow on the desk at 390');
    eq(errs, [], 'no page errors');
  } catch (e) { fail++; console.log('step80 CRASH ' + (e && e.stack || e)); }
  if (b) await b.close();
  console.log(`step80: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
