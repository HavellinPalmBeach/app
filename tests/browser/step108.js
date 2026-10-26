// Step 108 — only flagged lines keep a tick (2026-10-26; Q99 to Q106).
//
// Anthony: *"we will be obviously going back to the office and looking over the entire inventory list ourselves to make
// sure everything looks right. So the idea that … we need to be like ticking boxes is ridiculous to approve everything,
// because … this is our job at night. The agent identifies everything and then values it. And then we go back and we go
// over the list and we make sure it makes sense."* He took *"Only flagged lines"*: no value limit (Q106 replaced Q99's
// $100); a tick stays where the app flags something for a person; a line both agents guessed on keeps it (Q101); a
// disputed estate lets nothing stand by itself (Q102); and the papers say how many stood as the agents left them (Q100,
// Q104).
//
// Drives the REAL page with an active trust estate on the values tier whose kitchen Agent One named and Agent Two valued:
// a $40 cutlery drawer (Donate), a $2,500 dining table (Sell), a silver tray at $80 (Sell), a ceramic vase Agent One
// noted (Look at this), a painted box both agents guessed on, and a $9,000 sofa (at the appraisal threshold). Job Admin &
// Inv through its own nav button; Edit Client through the dashboard's own button:
//   A. Not reviewed reads 3 (the vase, the box, the sofa); the drawer, the table and the tray stand: their Reviewed boxes
//      ticked, grey and enabled, with the standing tooltip; the box says unsure; the work bar reads 3 of 6 · 3 accepted.
//   B. The same job recorded as disputed on Edit Client: nothing stands (Not reviewed 6, every box unticked, no
//      "accepted"); recorded back as no dispute: 3 again.
//   C. The tray's grey box pressed: a person's look, green, "Reviewed by Ashley Jerome"; the work bar · 2 accepted.
//   D. Specific Bequest ticked in the drawer's record: its box unticked with no full render (the box replaced by id, the
//      row kept), Not reviewed 4, the work bar · 1 accepted; unticked again: back, by id.
//   E. The three flagged lines ticked; Not reviewed 0; the Estate Inventory PDF pressed on the work bar prints
//      "REVIEWED — 4 items checked; 2 accepted as valued" once and no "not yet reviewed"; the Trust Schedule under
//      More ▾ prints the grey "2 accepted as valued". At 1440 and 390 px no horizontal overflow; zero page errors.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step108.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
const SYNC = 'https://sync.example.test/exec';
const J = 9854;
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');
const STANDING_TIP = 'Nothing flagged: the agents’ name and value stand as they are. Tick it to record your own look.';
const STAND = ['cut', 'table', 'tray'], FLAGGED = ['vase', 'guess', 'sofa'], ALL = STAND.concat(FLAGGED);

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
    const BOX = (id) => '#inv-row-' + id + ' input[type="checkbox"][onchange*="_invSetReviewed"]';
    // The row's Reviewed box as a person sees it: ticked or not, greyed out or not, and in which colour (the label's ink and
    // the box's own accent, each against the stylesheet's --gray and --ok-tx resolved the same way).
    const box = (id) => p.evaluate((id) => {
      const el = document.querySelector('#inv-row-' + id + ' input[type="checkbox"][onchange*="_invSetReviewed"]');
      const lab = el && el.closest('label');
      const tone = (v) => { const s = document.createElement('span'); s.style.color = 'var(' + v + ')'; document.body.appendChild(s); const c = getComputedStyle(s).color; s.remove(); return c; };
      const gray = tone('--gray'), green = tone('--ok-tx');
      const name = (c) => c === gray ? 'gray' : c === green ? 'green' : c;
      return el ? { checked: el.checked, disabled: el.disabled, title: lab ? lab.getAttribute('title') : '',
        ink: lab ? name(getComputedStyle(lab).color) : '', accent: name(getComputedStyle(el).accentColor) } : null;
    }, id);
    const bar = async () => { const t = await txt('#inv-workbar'); const m = /(\d+ of \d+ reviewed(?: · \d+ accepted)?)/.exec(t); return m ? m[1] : t.slice(0, 120); };
    const line = (id) => p.evaluate(([j, id]) => { const r = (_photoRefs[j] || []).find((x) => x.stableId === id) || {};
      return { rev: !!r.reviewed, by: r.reviewedBy || '', vrev: !!r.valReviewed, bq: !!r.flagBequest }; }, [J, id]);

    await p.goto(APP); await p.waitForTimeout(1600);
    sheet = await p.evaluate(([J, SYNC]) => {
      SHEETS_SYNC_URL = SYNC;
      try { localStorage.setItem('hav_device_user', 'Ashley Jerome'); } catch (e) {}
      const T = Date.now() - 2 * 86400000;
      jobs.unshift({ id: J, hvlId: 'HVL-2610-RF', fname: 'Margaret', lname: 'Ellison', name: 'Margaret Ellison', svc: 'cleanout', matterType: 'trust',
        addr: '14 Via Mizner', city: 'Palm Beach', zip: '33480', ptype: 'Single Family Home', src: 'Family', sqft: 3800,
        executor: 'Katherine Ellison', executorFname: 'Katherine', executorLname: 'Ellison', executorRole: 'Trustee', executorPhone: '(561) 555-0142',
        executorEmail: 'kate@example.com', deathDate: '2026-08-14', executorAuth: 'received', trustName: 'Ellison Family Trust',
        docTier: 'values', gate706: 'no', gateDispute: '', status: 'active', won: true, wonAt: '2026-10-01', approved: true, tc: 'Ashley Jerome',
        created: '2026-09-28', start: '2026-10-12', activatedOn: '2026-10-10', agrApproved: true, agrSent: true, agrSigned: true,
        driveFolder: 'https://drive.google.com/drive/folders/R' + J, driveSubfolders: { 'Estate Inventory': 'INV_RF', 'As-Found Record': 'AF_RF' }, at: {},
        payments: [{ uid: 'd' + J, stage: 'deposit', amount: 12000, receivedOn: '2026-10-08', method: 'wire', clearedOn: '2026-10-08' }] });
      estimateStore[J] = { approved: true, submitted: true, approvedBy: 'Anthony Graziano', savedAt: T,
        estimate: { jobId: J, svc: 'cleanout', havellinTotal: 24000, fixedPrice: true, fixedAmount: 24000, fixedLines: true, totTC: 60, totPS: 90, days: 5,
          vendors: [], prepItems: [], rooms: [{ idx: 2, name: 'Kitchen', st: 'in', vol: 3, cplx: 3 }] } };
      const line = (id, n, name, o) => Object.assign({ stableId: id, itemNo: n, label: 'inventory', collId: null, roomIdx: 2, seq: n, status: 'uploaded', ts: T + n * 60000,
        filename: 'HVL-2610-RF_Kitchen_INV_' + n + '.jpg', driveFileId: 'F' + id, driveFileUrl: 'https://drive.google.com/file/d/F' + id + '/view',
        objectName: name, valNameAt: name, namedBy: 'agent', agentConf: 'medium', agentAt: T + n * 60000 + 5000, category: 'General/Household', disposition: 'Sell', qty: 1,
        valuedBy: 'agent', valConf: 'medium', valSource: 'General estimate', valAgentAt: T + n * 60000 + 9000, updatedAt: T + n * 60000 + 9000 }, o);
      _photoRefs[J] = [
        line('cut', 1, 'Stainless flatware and kitchen utensils, drawer', { disposition: 'Donate', fmv: 40, valLow: 20, valHigh: 60 }),
        line('table', 2, 'Mahogany dining table', { category: 'Furniture', fmv: 2500, valLow: 2000, valHigh: 2900, valSource: 'Online comps' }),
        line('tray', 3, 'Silver serving tray', { category: 'Silver & Precious Metal', fmv: 80, valLow: 60, valHigh: 110 }),
        line('vase', 4, 'Ceramic vase', { fmv: 30, valLow: 20, valHigh: 50, agentNotices: [{ kind: 'other', text: 'A maker’s mark under the base.' }] }),
        line('guess', 5, 'Painted wooden box, possibly folk art', { agentConf: 'low', valConf: 'low', fmv: 60, valLow: 20, valHigh: 150 }),
        line('sofa', 6, 'Camelback sofa, silk upholstery', { category: 'Furniture', fmv: 9000, valLow: 7000, valHigh: 11000, valSource: 'Auction comps' })];
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
    // Edit Client's dispute answer, through the Clients tab, the client's row, ✎ Edit Client and Save Changes.
    const recordDispute = async (value, what) => {
      await p.click('.nb[onclick*="\'jobs\'"]'); await p.waitForTimeout(600);
      const row = p.locator('#panel-jobs tr[onclick="openClientDashboard(' + J + ')"]').first();
      ok(await row.isVisible().catch(() => false), 'the client\'s row, on the Clients tab');
      await row.click(); await p.waitForTimeout(900);
      const ec = '#client-dashboard-view button[onclick="dashEditClient(' + J + ')"]';
      const n = await p.locator(ec).count();
      ok(n >= 1, '✎ Edit Client on the dashboard (' + n + ')');
      await p.locator(ec).first().click(); await p.waitForTimeout(700);
      await p.selectOption('#ec-gate-dispute', value); await p.waitForTimeout(300);
      await press('#edit-client-modal button[onclick="saveClientEdit(' + J + ')"]', 'Save Changes (' + what + ')');
      await p.waitForTimeout(600);
      eq(await p.evaluate((j) => (jobs.find((x) => x.id === j) || {}).gateDispute || '', J), value, 'fixture: the dispute answer saved as ' + what);
    };

    // ── A ─────────────────────────────────────────────────────────────────────────────────────
    await section('A. the drawer, the table and the tray stand; the vase, the box and the sofa wait for a tick', async () => {
      await toDesk();
      eq(await chip(), 3, '⚠⚠ Not reviewed 3: only the three flagged lines');
      for (const id of STAND) {
        const bx = await box(id);
        eq(bx && [bx.checked, bx.disabled, bx.ink, bx.accent], [true, false, 'gray', 'gray'], '⚠⚠ the ' + id + ' stands: its Reviewed box ticked, grey and enabled');
        eq(bx && bx.title, STANDING_TIP, '…its tooltip says why');
      }
      for (const id of FLAGGED) {
        const bx = await box(id);
        eq(bx && [bx.checked, bx.disabled], [false, false], 'the ' + id + ' waits for the tick');
      }
      eq(await bar(), '3 of 6 reviewed · 3 accepted', '⚠ the work bar names the lines that stand as accepted');
      has(await txt('#inv-row-guess'), 'unsure', '⚠ the box both agents guessed on keeps its bronze unsure');
      for (const id of ['cut', 'table', 'tray', 'vase', 'sofa']) lacks(await txt('#inv-row-' + id), 'unsure', 'no unsure on the ' + id);
    });

    // ── B ─────────────────────────────────────────────────────────────────────────────────────
    await section('B. the same estate recorded as disputed: nothing stands by itself; recorded back: three stand again', async () => {
      await recordDispute('yes', 'a dispute');
      await toDesk();
      eq(await chip(), 6, '⚠⚠ Not reviewed counts every line on a disputed estate');
      const ticks = [];
      for (const id of ALL) { const bx = await box(id); ticks.push(bx ? bx.checked : null); }
      eq(ticks, [false, false, false, false, false, false], 'every Reviewed box unticked');
      eq(await bar(), '0 of 6 reviewed', 'and the work bar names nothing accepted');
      await recordDispute('', 'no dispute');
      await toDesk();
      eq(await chip(), 3, 'no dispute: Not reviewed 3 again');
      eq(await bar(), '3 of 6 reviewed · 3 accepted', 'the work bar with it');
    });

    // ── C ─────────────────────────────────────────────────────────────────────────────────────
    await section('C. the tray\'s grey box pressed: the person\'s own look, green and named', async () => {
      await press(BOX('tray'), 'the tray\'s grey Reviewed box');
      const ln = await line('tray');
      eq([ln.rev, ln.by, ln.vrev], [true, 'Ashley Jerome', true], '⚠⚠ the press recorded a person\'s look, the value with it');
      const bx = await box('tray');
      eq(bx && [bx.checked, bx.disabled, bx.ink, bx.accent], [true, false, 'green', 'green'], '⚠ ticked and green, still a control');
      eq(bx && bx.title, 'Reviewed by Ashley Jerome', 'its tooltip names who');
      eq(await chip(), 3, 'Not reviewed unchanged: it was never on it');
      eq(await bar(), '3 of 6 reviewed · 2 accepted', 'the work bar: one fewer accepted');
    });

    // ── D ─────────────────────────────────────────────────────────────────────────────────────
    await section('D. Specific Bequest ticked in the drawer\'s record: its box unticked by id, no full render', async () => {
      await press('#inv-row-cut button[onclick="_invToggleOpen(\'cut\')"]', 'the drawer\'s ▾');
      const BQ = '#inv-row-cut input[type="checkbox"][onchange*="\'flagBequest\'"]';
      await p.evaluate(() => {
        window.__renders = 0;
        if (!window.__origRender) { window.__origRender = renderInventoryTab; window.renderInventoryTab = function () { window.__renders++; return window.__origRender.apply(this, arguments); }; }
        window.__box = document.getElementById('inv-rev-cut'); window.__row = document.getElementById('inv-row-cut');
      });
      await press(BQ, 'Specific Bequest, in the drawer\'s record');
      eq((await line('cut')).bq, true, 'fixture: the line is a specific bequest now');
      const st = await p.evaluate(() => ({ renders: window.__renders, boxNew: !!document.getElementById('inv-rev-cut') && document.getElementById('inv-rev-cut') !== window.__box,
        oldGone: !!window.__box && !window.__box.isConnected, rowKept: document.getElementById('inv-row-cut') === window.__row }));
      eq([st.renders, st.boxNew, st.oldGone, st.rowKept], [0, true, true, true], '⚠⚠ no full render: the box replaced by id, the row kept');
      const bx = await box('cut');
      eq(bx && [bx.checked, bx.disabled], [false, false], '⚠⚠ flagged now: its box unticked, a person\'s to tick');
      eq(await chip(), 4, 'Not reviewed 4');
      eq(await bar(), '2 of 6 reviewed · 1 accepted', '⚠ the work bar moved with it');
      ok(await p.locator('#inv-row-cut input[type="checkbox"][onchange*="\'flagBequest\'"]').first().isVisible().catch(() => false), 'the record is still open');
      await press(BQ, 'Specific Bequest unticked');
      const bx2 = await box('cut');
      eq(bx2 && [bx2.checked, bx2.disabled, bx2.ink], [true, false, 'gray'], 'unticked: it stands again, grey');
      eq([await chip(), await bar()], [3, '3 of 6 reviewed · 2 accepted'], 'Not reviewed 3 and the work bar back');
      eq(await p.evaluate(() => window.__renders), 0, 'still no full render');
      await p.evaluate(() => { if (window.__origRender) { window.renderInventoryTab = window.__origRender; delete window.__origRender; } });
      await press('#inv-row-cut button[onclick="_invToggleOpen(\'cut\')"]', 'the drawer\'s record shut');
    });

    // ── E ─────────────────────────────────────────────────────────────────────────────────────
    const printed = async (sel, what, menu) => {
      await p.evaluate(() => { window.__printed = ''; window.print = () => { window.__printed = (document.getElementById('print-target') || {}).innerHTML || ''; }; });
      if (menu) { await p.click('#inv-more > summary'); await p.waitForTimeout(400); }
      await press(sel, what);
      await p.waitForTimeout(1500);
      const doc = await p.evaluate(() => { const d = document.createElement('div'); d.innerHTML = window.__printed || ''; return d.textContent.replace(/\s+/g, ' '); });
      await p.evaluate(() => { const pt = document.getElementById('print-target'); if (pt) { pt.style.display = 'none'; pt.innerHTML = ''; }
        document.querySelectorAll('.panel').forEach((x) => { if (x.dataset.wasActive === '1') x.classList.add('active'); }); });
      await p.waitForTimeout(400);
      return doc;
    };
    await section('E. the flagged three ticked; the papers say how many stood as the agents left them', async () => {
      for (const id of FLAGGED) await press(BOX(id), 'the ' + id + '\'s Reviewed box');
      eq(await chip(), 0, 'Not reviewed: nothing left');
      for (const id of FLAGGED) eq((await line(id)).rev, true, 'the ' + id + ' ticked by a person');
      eq(await bar(), '6 of 6 reviewed · 2 accepted', 'the work bar: all six, two of them accepted');
      const doc = await printed('#inv-workbar button:has-text("Estate Inventory PDF")', 'Estate Inventory PDF, on the work bar');
      ok(doc.length > 200, 'fixture: the report printed (' + doc.length + ' chars)');
      has(doc, 'REVIEWED — 4 items checked; 2 accepted as valued', '⚠⚠ the stamp: four a person checked, two accepted as valued');
      eq(doc.split('accepted as valued').length - 1, 1, 'said once: the report prints no second pill for them');
      lacks(doc, 'not yet reviewed', 'no value left "not yet reviewed"');
      lacks(doc, 'under $100', 'and no floor in it');
      const ts = await printed('#inv-more button:has-text("Trust Schedule")', 'Trust Schedule, under More ▾', true);
      ok(ts.length > 200, 'fixture: the Trust Schedule printed (' + ts.length + ' chars)');
      has(ts, '2 accepted as valued', '⚠ the Trust Schedule says the same, in the same words (Q104)');
      lacks(ts, 'not yet reviewed', 'and no "not yet reviewed" there either');
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
