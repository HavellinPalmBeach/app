// Step 59 — P19, the lead (2026-10-05): the net total headed for whoever holds the proceeds (E7, completed).
// "Net to Estate" was false on a trust. The desk's Summary and the client's workbook head the total from one namer
// (inventoryNetLabel, estateProceedsHolder's answer as a heading); the 2026-10-03 deployment finds the Net column under
// either name, and the app keeps sending "Net to Estate", the name every deployment resolves, until that one is live.
//
// Drives the REAL page through its own controls on the Job Admin & Inv desk, against one fake Apps Script (its stores
// and loadMedia answered as the deployment would), routed. Seeded: a trust-only estate and a probate estate, each with a
// line sold at auction (gross $1,000, fees $250) and a line kept.
//
//   A. The trust: Show summary & rollups reads "Net to Trust $750", never "Net to Estate".
//   B. Renaming a line in its row saves the inventory: the workbook payload the app posts carries netLabel
//      "Net to Trust", and its Net column still under "Net to Estate".
//   C. The probate estate: the same summary reads "Net to Estate $750".
//   D. overflow at 1440 and 390 with the summary open, and no page errors.
//
//   NODE_PATH=/opt/node22/lib/node_modules node tests/browser/step59.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');

const SYNC = 'https://script.google.com/macros/s/STEP59/exec';
const TRUST = 5901, PROBATE = 5902;
const T0 = Date.parse('2026-09-28T15:00:00Z');
const STORE = { jobs: [], estimates: {}, media: {} };
const POSTS = [];

const L = (id, o) => Object.assign({ stableId: id, label: 'inventory', collId: null, roomIdx: 1, seq: 1, status: 'uploaded', qty: 1,
  category: 'Furniture', condition: 'Good', ts: T0, updatedAt: T0, driveFileId: 'f-' + id, driveFileUrl: 'https://drive.google.com/file/d/f-' + id + '/view' }, o);
const LINES = () => [
  L('a1', { itemNo: 1, objectName: 'Sargent portrait', disposition: 'Auction', channel: 'Kodner Galleries', gross: 1000, fees: 250, dispDate: '2026-09-30', authBy: 'Ruth Adler', approvalDate: '2026-09-25' }),
  L('k1', { itemNo: 2, objectName: 'Family Bible', disposition: 'Keep' }),
];

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
    await ctx.addInitScript((u) => { try { localStorage.setItem('hav_sheets_url', u); } catch (e) {} }, SYNC);
    await ctx.route(SYNC + '**', async (route) => {
      const req = route.request(), url = new URL(req.url()), action = url.searchParams.get('action');
      const json = (o) => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(o) });
      if (req.method() === 'POST') {
        let body = {}; try { body = JSON.parse(req.postData() || '{}'); } catch (e) {}
        POSTS.push(body);
        if (body.type === 'saveAllJobs') { STORE.jobs = body.payload || []; return json({ ok: true }); }
        if (body.type === 'job') { STORE.jobs = STORE.jobs.filter((j) => j.id !== (body.payload || {}).id).concat([body.payload]); return json({ ok: true }); }
        if (body.type === 'saveAllEstimates') { Object.assign(STORE.estimates, body.payload || {}); return json({ ok: true }); }
        if (body.type === 'saveInventory') return json({ ok: true, success: true, url: 'https://docs.google.com/spreadsheets/d/WB59' });
        if (body.action === 'getSubfolders') return json({ ok: true, subfolders: {} });
        return json({ ok: true });
      }
      switch (action) {
        case 'loadJobs': return json({ jobs: STORE.jobs, deletedJobs: [] });
        case 'loadEstimates': return json({ ok: true, estimates: STORE.estimates });
        case 'loadJobPlans': return json({ ok: true, jobPlans: {} });
        case 'loadLogs': return json({ ok: true, logs: {} });
        case 'loadChangeOrders': return json({ ok: true, changeOrders: [] });
        case 'loadContractors': return json({ ok: true, contractors: { added: [], defaults: [] } });
        case 'loadMedia': {
          const id = url.searchParams.get('jobId');
          return json({ ok: true, media: id ? { [id]: { items: STORE.media[id] || [] } } : {} });
        }
        case 'version': return json({ ok: false, error: 'Unknown action' });
        default: return json({ ok: false, error: 'not in this test: ' + action });
      }
    });

    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    p.on('dialog', async (d) => { await d.accept(); });
    await p.goto(APP); await p.waitForTimeout(1800);

    const section = async (name, body) => {
      console.log('\n## ' + name);
      try { await body(); } catch (e) { fail++; console.log('  ✗ ' + name + ' threw: ' + String(e && e.message || e).split('\n')[0]); }
    };
    const vis = (sel) => p.locator(sel).first().isVisible().catch(() => false);
    const txt = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }, sel);
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const until = async (f, ms) => { for (let i = 0; i < (ms || 8000) / 150; i++) { if (await f()) return true; await p.waitForTimeout(150); } return false; };
    const toDesk = async (id) => {
      await p.evaluate((id) => { setCurrentJob(id); populateInventorySelect(); }, id);
      await p.click('.nb[onclick*="\'inventory\'"]'); await p.waitForTimeout(700);
      const sel = await p.evaluate(() => (document.getElementById('inv-job') || {}).value);
      if (String(sel) !== String(id)) { await p.selectOption('#inv-job', String(id)); await p.waitForTimeout(700); }
      await until(() => p.evaluate(() => !!document.querySelector('#inv-summary')), 4000);
    };

    // ── Seed ────────────────────────────────────────────────────────────────
    STORE.media[TRUST] = LINES(); STORE.media[PROBATE] = LINES();
    await p.evaluate(([TRUST, PROBATE, T0, LINES]) => {
      const base = (id, o) => Object.assign({ id, hvlId: 'HVL-2610-' + id, svc: 'cleanout', status: 'active',
        won: true, wonAt: '2026-09-17', wonBy: 'Anthony Graziano', wonMethod: 'call', approved: true, agrApproved: true, agrApprovedBy: 'Anthony Graziano',
        agrSent: true, agrSigned: true, depositReceived: true, tc: 'Ashley Jerome', created: '2026-09-10', start: '2026-09-21',
        activatedOn: '2026-09-21', activatedBy: 'Ashley Jerome', city: 'Palm Beach', zip: '33480', docTier: 'values', deathDate: '2026-08-01',
        driveFolder: 'https://drive.google.com/drive/folders/ROOT' + id,
        driveSubfolders: { 'Estate Inventory': 'INV' + id, 'As-Found Record': 'AF' + id, 'Signed Records': 'SR' + id },
        payments: [{ uid: 'dep' + id, stage: 'deposit', amount: 12000, receivedOn: '2026-09-15', method: 'wire', clearedOn: '2026-09-15' }],
        docState: { 'invoice:deposit': { draftedAt: '2026-09-15T10:00:00Z', sentAt: '2026-09-15T10:00:00Z' } },
        at: {}, updatedAt: Date.now() }, o);
      jobs = jobs.filter((j) => j.id !== TRUST && j.id !== PROBATE);
      jobs.unshift(base(TRUST, { name: 'Harold Adler', fname: 'Harold', lname: 'Adler', addr: '100 Ocean Blvd', matterType: 'trust', executorAuth: 'received',
        executor: 'Ruth Adler', executorRole: 'Trustee', executorEmail: 'ruth@adler.example', trustName: 'Adler Family Trust', trustDate: '2015-03-03' }));
      jobs.unshift(base(PROBATE, { name: 'Walter Ellsworth', fname: 'Walter', lname: 'Ellsworth', addr: '69 Beach Blvd', matterType: 'probate', executorAuth: 'received',
        executor: 'Rex Hale', executorRole: 'Personal Representative', executorEmail: 'rex@hale.example' }));
      [TRUST, PROBATE].forEach((id) => {
        estimateStore[id] = { approved: true, submitted: true, approvedBy: 'Anthony Graziano', savedAt: T0,
          estimate: { jobId: id, svc: 'cleanout', havellinTotal: 24000, totTC: 40, totPS: 80, days: 4, collections: [], vendors: [], prepItems: [],
            rooms: [{ idx: 1, name: 'Study', st: 'in' }] } };
        _photoRefs[id] = JSON.parse(JSON.stringify(LINES));
        savePhotoRefs(id);
      });
      try { localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore)); } catch (x) {}
      saveJobs();
    }, [TRUST, PROBATE, T0, LINES()]);

    // ── A ───────────────────────────────────────────────────────────────────
    await section('A. A trust-only estate: the desk\'s summary heads the net total for the trust', async () => {
      await toDesk(TRUST);
      // Show summary & rollups sits under the work bar's More menu.
      const more = '#inv-workbar details > summary';
      ok(await p.locator(more).count() === 1 && await vis(more), 'More — one control, on screen');
      await p.click(more); await p.waitForTimeout(300);
      const btn = 'button[onclick="invToggleRollups()"]';
      ok(await p.locator(btn).count() === 1 && await vis(btn), 'Show summary & rollups — one control, on screen under More');
      await p.click(btn); await p.waitForTimeout(600);
      const s = await txt('#inv-summary');
      has(s, 'Net to Trust', '⚠⚠ the net total is headed for the trust');
      has(s, '$750', 'and is the gross less the fees');
      lacks(s, 'Net to Estate', '⚠ never "Net to Estate" on a trust');
    });

    // ── B ───────────────────────────────────────────────────────────────────
    await section('B. A rename in the row saves the inventory; the workbook payload carries the heading', async () => {
      const box = 'input[onchange="_invEdit(' + TRUST + ',\'a1\',\'objectName\',this)"]';
      ok(await p.locator(box).count() === 1 && await vis(box), 'the row\'s name box — one control, on screen');
      const before = POSTS.length;
      await p.fill(box, 'Sargent portrait (oil on canvas)'); await p.press(box, 'Tab');
      const got = await until(() => POSTS.slice(before).some((x) => x.type === 'saveInventory'), 9000);
      ok(got, 'the inventory save posts the workbook');
      const inv = POSTS.slice(before).filter((x) => x.type === 'saveInventory').pop() || {};
      const pay = inv.payload || {};
      eq(pay.netLabel, 'Net to Trust', '⚠⚠ the payload states the heading the workbook writes');
      ok((pay.columns || []).indexOf('Net to Estate') > 0, 'and the Net column goes under the name every deployment resolves');
      lacks((pay.columns || []).join('|'), 'Net Proceeds', 'not yet the new one');
      ok(POSTS.slice(before).some((x) => x.type === 'saveMedia'), 'the manifest saved first, as always');
    });

    // ── C ───────────────────────────────────────────────────────────────────
    await section('C. A probate estate: unchanged', async () => {
      await toDesk(PROBATE);
      const s = await txt('#inv-summary');
      has(s, 'Net to Estate', 'the net total, net to the estate');
      has(s, '$750', 'the same figure');
      lacks(s, 'Net to Trust', 'and no trust');
    });

    // ── D ───────────────────────────────────────────────────────────────────
    await section('D. Overflow and page errors', async () => {
      eq(await overflow(), 0, 'no horizontal overflow at 1440 with the summary open');
      // The rollup tables: side by side on a desk (unchanged), one under the other on a phone (they ran 29px off it).
      const tops = () => p.evaluate(() => { const g = document.querySelectorAll('#inv-summary .inv-roll-grid')[1];
        return g ? Array.prototype.map.call(g.children, (c) => Math.round(c.getBoundingClientRect().top)) : []; });
      const t1 = await tops();
      ok(t1.length === 2 && t1[0] === t1[1], 'at 1440 the category and disposition tables sit side by side  [' + t1 + ']');
      await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(500);
      await toDesk(TRUST);
      ok(await vis('#inv-summary'), 'the summary is on screen at 390');
      const t2 = await tops();
      ok(t2.length === 2 && t2[1] > t2[0], 'at 390 the disposition table is under the category table  [' + t2 + ']');
      eq(await overflow(), 0, 'no horizontal overflow at 390');
      eq(errs, [], 'no page errors');
    });

    await b.close();
  } catch (e) {
    fail++; console.log('  ✗ threw: ' + String(e && e.stack || e).split('\n').slice(0, 3).join(' | '));
    if (b) await b.close().catch(() => {});
  }
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
