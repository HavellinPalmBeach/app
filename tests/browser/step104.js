// Step 104 — Agent One told what is already listed off a photograph (2026-10-24).
//
// Anthony, off the Ellison plates: one kitchen photograph carried four lines, #73 and #87 both the dinner plates and #81 and
// #88 both the salad plates, in two wordings (*"you should definitely fix whatever you say is wrong with agent one"*).
//
// Drives the REAL page with an active trust estate whose kitchen photograph carries #73, the dinner plates (named by Agent
// One), and #81, the salad plates split off it (named at the desk). Job Admin & Inv through its own nav button, the client
// through its picker: #73's record opened by its ▾ and **➕ Another item in this photo** pressed (one blank line on a
// photograph already named); **Name 1 shot** pressed on the work bar, Agent One a route answering as the script does: the
// request names the photograph once, asks about the blank line alone, and carries the two lines already listed off it
// with their counts. Agent One's answer of nothing else: #73 and #81 keep their names, the blank line stays blank and is
// stamped, no line is added. A second blank line, Agent One answering one new object (the serving platter): the blank line
// takes it, nothing doubles. At 1440 and 390 px no horizontal overflow; zero page errors throughout.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step104.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
const SYNC = 'https://sync.example.test/exec';
const J = 9841;
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const DINNER = 'Hand-painted majolica dinner plates, yellow bird and blue flower, cobalt rim';
const SALAD = 'Hand-painted majolica salad plates, matching';

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
    const net = { identify: [], answer: [] };
    let sheet = {};
    await ctx.route(SYNC + '**', async (r) => {
      const req = r.request();
      const json = (o) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
      if (req.method() === 'POST') {
        let body = {}; try { body = JSON.parse(req.postData() || '{}'); } catch (e) {}
        if (body.action === 'agentIdentify') {
          net.identify.push(body);
          // Answered as the script answers: a result per shot sent, keyed on its stableId.
          const objects = net.answer.shift() || [];
          const results = {}; (body.shots || []).forEach((s) => { results[s.stableId] = { objects: objects, notices: [] }; });
          return json({ ok: true, results: results, done: Object.keys(results), failed: {}, remaining: 0 });
        }
        if (body.action === 'agentRoomCheck') return json({ ok: true, results: {}, failed: {}, remaining: [] });
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
      if (v) { await p.click(sel, { timeout: 5000 }).catch((e) => ok(false, (what || sel) + ' — ' + e.message.split('\n')[0])); await p.waitForTimeout(700); }
      return v;
    };
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const lines = () => p.evaluate((j) => (_photoRefs[j] || []).filter((r) => r.label === 'inventory' && !r.deletedAt)
      .map((r) => ({ id: r.stableId, no: r.itemNo, name: r.objectName || '', qty: r.qty || 1, conf: r.agentConf || '', from: r.derivedFrom || '' })), J);

    await p.goto(APP); await p.waitForTimeout(1600);
    sheet = await p.evaluate(([J, SYNC, DINNER, SALAD]) => {
      SHEETS_SYNC_URL = SYNC;
      try { localStorage.setItem('hav_device_user', 'Ashley Jerome'); } catch (e) {}
      const T = Date.now() - 2 * 86400000;
      jobs.unshift({ id: J, hvlId: 'HVL-2610-EL', name: 'Margaret Ellison', svc: 'cleanout', matterType: 'trust', addr: '12 Via Mizner', city: 'Palm Beach', zip: '33480',
        executor: 'Katherine Ellison', executorRole: 'Successor Trustee', executorEmail: 'kate@example.com', deathDate: '2026-05-02', executorAuth: 'received',
        trustName: 'Ellison Family Trust', docTier: 'values', gate706: 'no', status: 'active', won: true, wonAt: '2026-10-01', approved: true, tc: 'Ashley Jerome',
        created: '2026-09-28', start: '2026-10-12', activatedOn: '2026-10-10', agrApproved: true, agrSent: true, agrSigned: true, sqft: 3800,
        driveFolder: 'https://drive.google.com/drive/folders/R' + J, driveSubfolders: { 'Estate Inventory': 'INV_EL', 'As-Found Record': 'AF_EL' }, at: {},
        payments: [{ uid: 'd' + J, stage: 'deposit', amount: 12000, receivedOn: '2026-10-08', method: 'wire', clearedOn: '2026-10-08' }] });
      estimateStore[J] = { approved: true, submitted: true, approvedBy: 'Anthony Graziano', savedAt: T,
        estimate: { jobId: J, svc: 'cleanout', havellinTotal: 24000, fixedPrice: true, fixedAmount: 24000, fixedLines: true, totTC: 60, totPS: 90, days: 5,
          vendors: [], prepItems: [], rooms: [{ idx: 2, name: 'Kitchen', st: 'in', vol: 3, cplx: 3 }] } };
      const photo = { label: 'inventory', collId: null, roomIdx: 2, seq: 5, status: 'uploaded', ts: T, filename: 'HVL-2610-EL_Kitchen_INV_5.jpg',
        driveFileId: 'FID_PLATES', driveFileUrl: 'https://drive.google.com/file/d/FID_PLATES/view' };
      _photoRefs[J] = [
        Object.assign({ stableId: 'pl73', itemNo: 73, objectName: DINNER, category: 'Collectibles', qty: 8, namedBy: 'agent', agentConf: 'high',
          disposition: 'Distribute', channel: 'Katherine Ellison', fieldNote: 'Italian plates going to Katherine, set of 8', updatedAt: T }, photo),
        Object.assign({ stableId: 'pl81', itemNo: 81, derivedFrom: 'pl73', objectName: SALAD, category: 'Collectibles', qty: 6, namedBy: 'desk',
          disposition: 'Distribute', channel: 'Katherine Ellison', updatedAt: T }, photo)];
      savePhotoRefs(J); saveJobs(); localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore));
      const out = {}; out[J] = { items: JSON.parse(localStorage.getItem('hav_media_' + J) || '[]') };
      return out;
    }, [J, SYNC, DINNER, SALAD]);

    const toDesk = async () => {
      await p.click('.nb[onclick*="\'inventory\'"]'); await p.waitForTimeout(800);
      const cur = await p.evaluate(() => (document.getElementById('inv-job') || {}).value);
      if (String(cur) !== String(J)) { await p.selectOption('#inv-job', String(J)); await p.waitForTimeout(1300); }
      if (await p.locator('#panel-inventory button[onclick="setInvWhen(\'all\')"]').count()) { await p.click('#panel-inventory button[onclick="setInvWhen(\'all\')"]'); await p.waitForTimeout(600); }
    };
    const addBlank = async () => {
      const open = 'button[onclick="_invToggleOpen(\'pl73\')"]';
      if (!(await p.evaluate(() => !!document.getElementById('inv-cu-pl73')))) await press(open, '#73\'s ▾');
      await press('button[onclick="invSplitItemClick(' + J + ',\'pl73\')"]', '➕ Another item in this photo, in #73\'s record');
    };

    // ── A ─────────────────────────────────────────────────────────────────────────────────────
    await section('A. a blank line on the plates\' photograph, Name 1 shot: the request carries what is already listed, and asks about the blank line alone', async () => {
      await toDesk();
      await addBlank();
      const L = await lines();
      eq(L.length, 3, 'the photograph carries three lines: #73, #81 and the blank one');
      const blank = L.find((x) => !x.name);
      ok(!!blank && blank.from === 'pl73', 'the blank line is split off the plates\' photograph');
      await press('#inv-workbar button:has-text("Name 1 shot")', 'Name 1 shot, on the work bar');
      await p.waitForTimeout(1500);
      eq(net.identify.length, 1, 'one request to Agent One');
      const shots = (net.identify[0] || {}).shots || [];
      eq(shots.map((s) => s.stableId), ['pl73'], 'the photograph sent once');
      eq(shots[0] && shots[0].listed, [{ name: DINNER, qty: 8 }, { name: SALAD, qty: 6 }], '⚠⚠ with the two lines already named off it, and their counts');
      has(shots[0] && shots[0].fieldNote, 'set of 8', 'and the crew\'s note, where the count was said');
    });

    // ── B ─────────────────────────────────────────────────────────────────────────────────────
    await section('B. Agent One finds nothing else: #73 and #81 keep their names, the blank line stays blank, no line added', async () => {
      const L = await lines();
      eq(L.length, 3, '⚠⚠ still three lines: nothing went on the list twice');
      eq(L.filter((x) => x.name).map((x) => [x.no, x.name, x.qty]), [[73, DINNER, 8], [81, SALAD, 6]], 'the dinner plates and the salad plates as they were');
      eq(L.find((x) => x.id === 'pl73').conf, 'high', 'and #73 carries no empty stamp');
      const blank = L.find((x) => !x.name);
      eq(blank && blank.conf, 'none', 'the blank line stamped: nothing else in the photograph');
      ok(!said.some((m) => /could not|failed/i.test(m)), 'no failure said');
    });

    // ── C ─────────────────────────────────────────────────────────────────────────────────────
    await section('C. a second blank line, Agent One finds one new thing: the blank line takes it, nothing doubles', async () => {
      // Remove the first blank line, as the desk would, then add another and name it.
      const first = (await lines()).find((x) => !x.name);
      await p.evaluate(([J, id]) => { const r = _getPhotoRef(J, id); r.deletedAt = Date.now(); _setPhotoRef(J, r); savePhotoRefs(J); renderInventoryTab(); }, [J, first.id]);
      await p.waitForTimeout(500);
      await addBlank();
      net.answer.push([{ name: 'Hand-painted majolica serving platter, matching', category: 'Collectibles', qty: 1, confidence: 'high', basis: 'at the edge of the frame', crop: [0, 0, 1, 1] }]);
      await press('#inv-workbar button:has-text("Name 1 shot")', 'Name 1 shot, again');
      await p.waitForTimeout(1500);
      const shots = (net.identify[1] || {}).shots || [];
      eq(shots[0] && shots[0].listed.map((l) => l.name), [DINNER, SALAD], 'the second request lists the same two');
      const L = await lines();
      eq(L.length, 3, '⚠⚠ three lines: the platter, and still one each of the plates');
      eq(L.map((x) => x.name).sort(), [DINNER, SALAD, 'Hand-painted majolica serving platter, matching'].sort(), 'the platter on the blank line, the plates unchanged');
      const shown = await p.evaluate(() => (document.getElementById('inventory-content') || {}).textContent || '');
      has(shown, 'Hand-painted majolica serving platter, matching', 'the platter is on the desk');
    });

    // ── D ─────────────────────────────────────────────────────────────────────────────────────
    await section('D. the layout at 1440 and 390 px', async () => {
      eq(await overflow(), 0, 'no horizontal overflow at 1440 px');
      await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(700);
      eq(await overflow(), 0, 'no horizontal overflow at 390 px');
    });

    eq(errs, [], 'zero page errors');
    await b.close();
  } catch (e) {
    fail++; console.log('  ✗ step threw: ' + (e && e.stack || e));
    if (b) await b.close().catch(() => {});
  }
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
