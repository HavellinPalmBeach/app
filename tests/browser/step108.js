// Step 108 — under $100, no tick (2026-10-25, Q99 and Q100).
//
// Anthony: *"I'd prefer not to have to review absolutely every item if we don't need to … I don't want to have to
// manually tick a drawer of like stainless steel silverware or a junk drawer filled with tape and whatever."* He took
// $100 on the top of Agent Two's range (Q99), and for the papers *"Say so on the stamp"* (Q100).
//
// Drives the REAL page with an active estate whose kitchen Agent One named and Agent Two valued: a cutlery drawer
// ($20–$60), a junk drawer ($0–$10, low confidence), a silver-plate tray at $40 (a specialist category), a brass lamp
// at $90–$150, and a vase at $30 with a note from Agent One. Job Admin & Inv through its own nav button:
//   A. Not reviewed reads 3: the two drawers count as reviewed by themselves, their Reviewed boxes ticked and greyed
//      with the floor in the tooltip, no unsure on the junk drawer; the tray, the lamp and the vase wait.
//   B. The cutlery drawer's count typed 3: Total $120, the box back to a person and Not reviewed 4; typed back to 1:
//      $40, ticked again, Not reviewed 3.
//   C. The other three ticked; Not reviewed gone to nothing; the Estate Inventory PDF pressed on the work bar prints
//      "REVIEWED — 3 items checked; 2 under $100 accepted as valued" and the grey "2 under $100 accepted as valued".
//   At 1440 and 390 px no horizontal overflow; zero page errors.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step108.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
const SYNC = 'https://sync.example.test/exec';
const J = 9853;
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');

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
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    const said = []; p.on('dialog', async (d) => { said.push(d.message()); await d.accept(); });
    const section = async (name, body) => {
      console.log('\n## ' + name);
      try { await body(); } catch (e) { fail++; console.log('  ✗ ' + name + ' threw: ' + String(e && e.message || e).split('\n')[0]); }
    };
    const press = async (sel, what) => {
      const n = await p.locator(sel).count();
      const v = n === 1 && await p.locator(sel).first().isVisible().catch(() => false);
      ok(v, (what || sel) + ' — one control, on screen (' + n + ')');
      if (v) { await p.click(sel, { timeout: 5000 }).catch((e) => ok(false, (what || sel) + ' — ' + e.message.split('\n')[0])); await p.waitForTimeout(700); }
      return v;
    };
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const txt = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }, sel);
    const chip = async () => { const t = await txt('#panel-inventory button[onclick="setInvFlag(\'unreviewed\')"]'); const m = /(\d+)/.exec(t); return t ? (m ? +m[1] : 0) : null; };
    const box = (id) => p.evaluate((id) => {
      const el = document.querySelector('#inv-row-' + id + ' input[type="checkbox"][onchange*="_invSetReviewed"]');
      const lab = el && el.closest('label');
      return el ? { checked: el.checked, disabled: el.disabled, title: lab ? lab.getAttribute('title') : '' } : null;
    }, id);
    const typeIn = async (sel, value) => { await p.fill(sel, value); await p.press(sel, 'Tab'); await p.waitForTimeout(900); };

    await p.goto(APP); await p.waitForTimeout(1600);
    sheet = await p.evaluate(([J, SYNC]) => {
      SHEETS_SYNC_URL = SYNC;
      try { localStorage.setItem('hav_device_user', 'Ashley Jerome'); } catch (e) {}
      const T = Date.now() - 2 * 86400000;
      jobs.unshift({ id: J, hvlId: 'HVL-2610-FL', name: 'Margaret Ellison', svc: 'cleanout', matterType: 'trust', addr: '12 Via Mizner', city: 'Palm Beach', zip: '33480',
        executor: 'Katherine Ellison', executorRole: 'Successor Trustee', executorEmail: 'kate@example.com', deathDate: '2026-08-14', executorAuth: 'received',
        trustName: 'Ellison Family Trust', docTier: 'values', gate706: 'no', status: 'active', won: true, wonAt: '2026-10-01', approved: true, tc: 'Ashley Jerome',
        created: '2026-09-28', start: '2026-10-12', activatedOn: '2026-10-10', agrApproved: true, agrSent: true, agrSigned: true, sqft: 3800,
        driveFolder: 'https://drive.google.com/drive/folders/R' + J, driveSubfolders: { 'Estate Inventory': 'INV_FL', 'As-Found Record': 'AF_FL' }, at: {},
        payments: [{ uid: 'd' + J, stage: 'deposit', amount: 12000, receivedOn: '2026-10-08', method: 'wire', clearedOn: '2026-10-08' }] });
      estimateStore[J] = { approved: true, submitted: true, approvedBy: 'Anthony Graziano', savedAt: T,
        estimate: { jobId: J, svc: 'cleanout', havellinTotal: 24000, fixedPrice: true, fixedAmount: 24000, fixedLines: true, totTC: 60, totPS: 90, days: 5,
          vendors: [], prepItems: [], rooms: [{ idx: 2, name: 'Kitchen', st: 'in', vol: 3, cplx: 3 }] } };
      const line = (id, n, name, o) => Object.assign({ stableId: id, itemNo: n, label: 'inventory', collId: null, roomIdx: 2, seq: n, status: 'uploaded', ts: T + n * 60000,
        filename: 'HVL-2610-FL_Kitchen_INV_' + n + '.jpg', driveFileId: 'F' + id, driveFileUrl: 'https://drive.google.com/file/d/F' + id + '/view',
        objectName: name, valNameAt: name, namedBy: 'agent', agentConf: 'medium', agentAt: T + n * 60000 + 5000, category: 'General/Household', disposition: 'Donate', qty: 1,
        valuedBy: 'agent', valConf: 'medium', valSource: 'General estimate', valAgentAt: T + n * 60000 + 9000, updatedAt: T + n * 60000 + 9000 }, o);
      _photoRefs[J] = [
        line('cut', 1, 'Stainless flatware and kitchen utensils, drawer', { fmv: 40, valLow: 20, valHigh: 60 }),
        line('junk', 2, 'Junk drawer: tape, batteries, pens', { fmv: 5, valLow: 0, valHigh: 10, valConf: 'low' }),
        line('tray', 3, 'Silver-plate serving tray', { category: 'Silver & Precious Metal', fmv: 40, valLow: 20, valHigh: 60 }),
        line('lamp', 4, 'Brass floor lamp', { fmv: 120, valLow: 90, valHigh: 150 }),
        line('vase', 5, 'Ceramic vase', { fmv: 30, valLow: 20, valHigh: 50, agentNotices: [{ kind: 'other', text: 'A maker’s mark under the base.' }] })];
      savePhotoRefs(J); saveJobs(); localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore));
      const out = {}; out[J] = { items: JSON.parse(localStorage.getItem('hav_media_' + J) || '[]') };
      return out;
    }, [J, SYNC]);

    const toDesk = async () => {
      await p.click('.nb[onclick*="\'inventory\'"]'); await p.waitForTimeout(800);
      const cur = await p.evaluate(() => (document.getElementById('inv-job') || {}).value);
      if (String(cur) !== String(J)) { await p.selectOption('#inv-job', String(J)); await p.waitForTimeout(1300); }
      if (await p.locator('#panel-inventory button[onclick="setInvWhen(\'all\')"]').count()) { await p.click('#panel-inventory button[onclick="setInvWhen(\'all\')"]'); await p.waitForTimeout(600); }
    };

    // ── A ─────────────────────────────────────────────────────────────────────────────────────
    await section('A. the two drawers pass by themselves; the tray, the lamp and the vase wait for a person', async () => {
      await toDesk();
      eq(await chip(), 3, '⚠⚠ Not reviewed 3: the drawers are not on it');
      for (const id of ['cut', 'junk']) {
        const bx = await box(id);
        eq(bx && [bx.checked, bx.disabled], [true, true], '⚠ the ' + id + ' drawer: its Reviewed box ticked and greyed');
        has(bx && bx.title, 'Under $100 and nothing flagged', '…its tooltip names the floor');
      }
      lacks(await txt('#inv-row-junk'), 'unsure', 'no unsure on the junk drawer, low-confidence as its figure is');
      for (const id of ['tray', 'lamp', 'vase']) {
        const bx = await box(id);
        eq(bx && [bx.checked, bx.disabled], [false, false], 'the ' + id + ' waits for the tick');
      }
    });

    // ── B ─────────────────────────────────────────────────────────────────────────────────────
    await section('B. a count typed over $100 brings the drawer back to a person, and back under lets it go', async () => {
      await typeIn('#inv-row-cut .inv-qty', '3');
      eq((await p.evaluate((j) => (_photoRefs[j].find((r) => r.stableId === 'cut') || {}).fmv, J)), 120, 'fixture: three at $40 is $120');
      await p.evaluate(() => renderInventoryTab()); await p.waitForTimeout(500);
      const bx = await box('cut');
      eq(bx && [bx.checked, bx.disabled], [false, false], '⚠⚠ over $100: the box is a person\'s again');
      eq(await chip(), 4, 'and Not reviewed counts it');
      await typeIn('#inv-row-cut .inv-qty', '1');
      await p.evaluate(() => renderInventoryTab()); await p.waitForTimeout(500);
      const bx2 = await box('cut');
      eq(bx2 && [bx2.checked, bx2.disabled], [true, true], 'back to one at $40: under again');
      eq(await chip(), 3, 'Not reviewed 3');
    });

    // ── C ─────────────────────────────────────────────────────────────────────────────────────
    await section('C. the other three ticked; the Estate Inventory PDF says what passed by the floor', async () => {
      for (const id of ['tray', 'lamp', 'vase']) await press('#inv-row-' + id + ' input[type="checkbox"][onchange*="_invSetReviewed"]', id + '\'s Reviewed box');
      eq(await chip(), 0, 'Not reviewed: nothing left');
      await p.evaluate(() => { window.__printed = ''; window.print = () => { window.__printed = (document.getElementById('print-target') || {}).innerHTML || ''; }; });
      await press('#inv-workbar button:has-text("Estate Inventory PDF")', 'Estate Inventory PDF, on the work bar');
      await p.waitForTimeout(1500);
      const doc = await p.evaluate(() => { const d = document.createElement('div'); d.innerHTML = window.__printed || ''; return d.textContent.replace(/\s+/g, ' '); });
      ok(doc.length > 200, 'fixture: the report printed (' + doc.length + ' chars)');
      has(doc, 'REVIEWED — 3 items checked; 2 under $100 accepted as valued', '⚠⚠ the stamp, in Anthony\'s words');
      has(doc, '2 under $100 accepted as valued', 'and the values stamp beside it');
      lacks(doc, 'not yet reviewed', 'with no value left "not yet reviewed"');
      await p.evaluate(() => { const pt = document.getElementById('print-target'); if (pt) { pt.style.display = 'none'; pt.innerHTML = ''; }
        document.querySelectorAll('.panel').forEach((x) => { if (x.dataset.wasActive === '1') x.classList.add('active'); }); });
      await p.waitForTimeout(400);
      eq(await overflow(), 0, 'no horizontal overflow at 1440');
      await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(600);
      eq(await overflow(), 0, 'no horizontal overflow at 390');
    });

    eq(errs, [], 'zero page errors');
    console.log('\n' + pass + ' passed, ' + fail + ' failed');
    await b.close();
    process.exit(fail ? 1 : 0);
  } catch (e) {
    console.log('step 108 threw: ' + (e && e.stack || e));
    if (b) await b.close().catch(() => {});
    process.exit(1);
  }
})();
