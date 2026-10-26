// Step 108 — only flagged lines keep a tick, and the list is read (2026-10-26; Q99 to Q108).
//
// Anthony: *"we will be obviously going back to the office and looking over the entire inventory list ourselves to make
// sure everything looks right. So the idea that … we need to be like ticking boxes is ridiculous to approve everything,
// because … this is our job at night. The agent identifies everything and then values it. And then we go back and we go
// over the list and we make sure it makes sense."* He took *"Only flagged lines"*: no value limit (Q106 replaced Q99's
// $100); a tick stays where the app flags something for a person; a line both agents guessed on keeps it (Q101); a
// disputed estate lets nothing stand by itself (Q102); and the papers say how many stood as the agents left them (Q100,
// Q104). Round two (the reviews, and two more answers): the night's read is recorded by one press, *I've read the list*
// (Q107: *"One 'List read' press"*), and a paper over lines standing as the agents left them says REVIEWED only once the
// list is read since it last changed; the bronze *unsure* shows wherever either agent was guessing, on a standing line
// too, until a person's look (Q108: *"Show it, no tick"*); a held line's box says why; and a tick never answers a
// possible duplicate (only Remove or Not duplicates do).
//
// Drives the REAL page with an active trust estate on the values tier whose kitchen Agent One named and Agent Two valued:
// a $40 cutlery drawer (Donate), a $2,500 dining table (Sell), a silver tray at $80 (Sell), a ceramic vase Agent One
// noted (Look at this), a painted box both agents guessed on, a $9,000 sofa (at the appraisal threshold), a platter only
// Agent Two was unsure of, and two brass candlesticks Agent One named alike off two photographs. Job Admin & Inv through
// its own nav button; Edit Client through the dashboard's own button:
//   A. Not reviewed reads 5 (the vase, the box, the sofa, the two candlesticks); the drawer, the table, the tray and the
//      platter stand: their Reviewed boxes ticked, grey and enabled, with the standing tooltip; each held box's tooltip
//      begins "Needs a look:" with its reason; the box and the platter say unsure (Q108), the platter's in bronze over its
//      grey tick; the candlesticks are one group under Possible duplicates; the work bar reads 4 of 9 · 4 accepted, and
//      "List not read yet" with the press.
//   B. The same job recorded as disputed on Edit Client: nothing stands (Not reviewed 9, every box unticked, its tooltip
//      naming the dispute, no "accepted"); recorded back as no dispute: 5 again.
//   C. The tray's grey box pressed: a person's look, green, "Reviewed by Ashley Jerome"; the work bar · 3 accepted.
//   D. Specific Bequest ticked in the drawer's record: its box unticked with no full render (the box replaced by id, the
//      row kept) and its tooltip naming the bequest, Not reviewed 6, the work bar · 2 accepted; unticked again: back, by id.
//   E. One candlestick's box ticked: it is green; the other stays unticked, still held as a duplicate, and the group stays
//      under Possible duplicates. Not duplicates pressed: the group goes and the other candlestick stands, grey.
//   F. The platter's grey box pressed: its unsure goes with the person's look, and the box turns green.
//   G. The three flagged lines ticked; Not reviewed 0; the Estate Inventory PDF pressed on the work bar prints
//      "IN PROGRESS — 6 items checked; 3 accepted as valued; the list not yet read" and no REVIEWED; the Trust Schedule under
//      More ▾ prints the grey "3 accepted as valued · list not yet read".
//   H. ✓ I've read the list pressed on the work bar: the line turns green, "✓ List read by Ashley Jerome, <day>", the
//      press gone; the report prints "REVIEWED — read by Ashley Jerome, <day>; 6 items checked; 3 accepted as valued"; the
//      Trust Schedule's pill carries the same read words.
//   I. The table's destination changed through the row's own select (Sell to Consign): the line reads "· changed since"
//      with the press; the report is back to IN PROGRESS "…; the list not yet read since it last changed" with the caveat;
//      the pill "· list not yet read since it changed". (A destination change redraws the tab by design: the row moves to
//      its new group. The by-id repaint is J's.)
//   J. Read again, then a recipient typed into the drawer's Who takes it box: no full render, the read line replaced by id
//      and reading "· changed since". At 1440 and 390 px no horizontal overflow; zero page errors.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step108.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
const SYNC = 'https://sync.example.test/exec';
const J = 9854;
const ME = 'Ashley Jerome';
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');
const STANDING_TIP = 'Nothing flagged: the agents’ name and value stand as they are. Tick it to record your own look.';
// Each held line's reason, as the box's tooltip words it (written out here, never read off INV_HOLD_WORDS).
const NEEDS = (why) => 'Needs a look: ' + why + '. Tick it once checked.';
const HELD = { vase: 'an agent’s note on it', guess: 'both agents were guessing', sofa: 'waiting on an appraisal',
  candA: 'a possible duplicate: answer it under Possible duplicates', candB: 'a possible duplicate: answer it under Possible duplicates' };
const STAND = ['cut', 'table', 'tray', 'plate'], FLAGGED = ['vase', 'guess', 'sofa', 'candA', 'candB'], ALL = STAND.concat(FLAGGED);
// The day a read was recorded, worked out here from its own clock reading, in Eastern time: "October 26, 2026".
const DAY = (at) => new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(at));

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
    // A colour as the stylesheet resolves one of its tokens, so a box or a hint can be named grey, green or bronze: one helper
    // on the page (installed after the page loads; the page is never reloaded).
    const installTones = () => p.evaluate(() => {
      window.__toneName = (c) => {
        const tone = (v) => { const s = document.createElement('span'); s.style.color = 'var(' + v + ')'; document.body.appendChild(s); const x = getComputedStyle(s).color; s.remove(); return x; };
        return c === tone('--gray') ? 'gray' : c === tone('--ok-tx') ? 'green' : c === tone('--bronze') ? 'bronze' : c;
      };
    });
    // The row's Reviewed box as a person sees it: ticked or not, greyed out or not, and in which colour (the label's ink and
    // the box's own accent).
    const box = (id) => p.evaluate((id) => {
      const el = document.querySelector('#inv-row-' + id + ' input[type="checkbox"][onchange*="_invSetReviewed"]');
      const lab = el && el.closest('label');
      return el ? { checked: el.checked, disabled: el.disabled, title: lab ? lab.getAttribute('title') : '',
        ink: lab ? window.__toneName(getComputedStyle(lab).color) : '', accent: window.__toneName(getComputedStyle(el).accentColor) } : null;
    }, id);
    // The row's bronze hint, and its colour.
    const unsure = (id) => p.evaluate((id) => {
      const el = document.querySelector('#inv-row-' + id + ' .inv-unsure');
      return el ? { text: el.textContent.trim(), ink: window.__toneName(getComputedStyle(el).color) } : null;
    }, id);
    const bar = async () => { const t = await txt('#inv-workbar'); const m = /(\d+ of \d+ reviewed(?: · \d+ accepted)?)/.exec(t); return m ? m[1] : t.slice(0, 120); };
    // The work bar's list-read line (Q107): its words, its colour, and whether it offers the press.
    const READ = '#inv-read-' + J, READ_BTN = '#inv-workbar button[onclick="invMarkListRead(' + J + ')"]';
    const readLine = () => p.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const btn = el.querySelector('button');
      return { text: el.textContent.replace(/\s+/g, ' ').trim(), ink: window.__toneName(getComputedStyle(el).color), press: btn ? btn.textContent.trim() : '' };
    }, READ);
    const readRec = () => p.evaluate((j) => { const r = (jobs.find((x) => x.id === j) || {}).invRead; return r ? { at: r.at, by: r.by } : null; }, J);
    const dupGroups = () => p.evaluate(() => [...document.querySelectorAll('#panel-inventory .inv-dup-group')].map((g) => g.textContent.replace(/\s+/g, ' ').trim()));
    const line = (id) => p.evaluate(([j, id]) => { const r = (_photoRefs[j] || []).find((x) => x.stableId === id) || {};
      return { rev: !!r.reviewed, by: r.reviewedBy || '', vrev: !!r.valReviewed, bq: !!r.flagBequest, dupOK: !!r.dupOK, disp: r.disposition || '', ch: r.channel || '' }; }, [J, id]);
    // Counts full renders of the tab from here on, and remembers the read line's element, to tell a by-id repaint from a redraw.
    const watchRenders = () => p.evaluate((sel) => {
      window.__renders = 0;
      if (!window.__origRender) { window.__origRender = renderInventoryTab; window.renderInventoryTab = function () { window.__renders++; return window.__origRender.apply(this, arguments); }; }
      window.__read = document.querySelector(sel);
    }, READ);
    const unwatchRenders = () => p.evaluate(() => { if (window.__origRender) { window.renderInventoryTab = window.__origRender; delete window.__origRender; } });

    await p.goto(APP); await p.waitForTimeout(1600);
    await installTones();
    sheet = await p.evaluate(([J, SYNC, ME]) => {
      SHEETS_SYNC_URL = SYNC;
      try { localStorage.setItem('hav_device_user', ME); } catch (e) {}
      const T = Date.now() - 2 * 86400000;
      jobs.unshift({ id: J, hvlId: 'HVL-2610-RF', fname: 'Margaret', lname: 'Ellison', name: 'Margaret Ellison', svc: 'cleanout', matterType: 'trust',
        addr: '14 Via Mizner', city: 'Palm Beach', zip: '33480', ptype: 'Single Family Home', src: 'Family', sqft: 3800,
        executor: 'Katherine Ellison', executorFname: 'Katherine', executorLname: 'Ellison', executorRole: 'Trustee', executorPhone: '(561) 555-0142',
        executorEmail: 'kate@example.com', deathDate: '2026-08-14', executorAuth: 'received', trustName: 'Ellison Family Trust',
        docTier: 'values', gate706: 'no', gateDispute: '', status: 'active', won: true, wonAt: '2026-10-01', approved: true, tc: ME,
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
        line('sofa', 6, 'Camelback sofa, silk upholstery', { category: 'Furniture', fmv: 9000, valLow: 7000, valHigh: 11000, valSource: 'Auction comps' }),
        // Agent One sure of the name, Agent Two not of the figure (Q108): it stands, and still says unsure.
        line('plate', 7, 'Blue and white transferware platter', { fmv: 45, valLow: 15, valHigh: 120, valConf: 'low' }),
        // One name, one room, two photographs: a possible duplicate (same-name evidence).
        line('candA', 8, 'Brass candlestick', { fmv: 25, valLow: 15, valHigh: 35 }),
        line('candB', 9, 'Brass candlestick', { fmv: 25, valLow: 15, valHigh: 35 })];
      savePhotoRefs(J); saveJobs(); localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore));
      const out = {}; out[J] = { items: JSON.parse(localStorage.getItem('hav_media_' + J) || '[]') };
      return out;
    }, [J, SYNC, ME]);

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
    // A paper as the print path hands it to the browser: window.print caught, the page's text read off #print-target.
    const printed = async (sel, what, menu) => {
      await p.evaluate(() => { window.__printed = ''; window.print = () => { window.__printed = (document.getElementById('print-target') || {}).innerHTML || ''; }; });
      // More ▾ keeps its open state across a redraw (_renderInvWorkbar reads it), so it is opened only if it is shut.
      if (menu && !(await p.evaluate(() => !!(document.getElementById('inv-more') || {}).open))) { await p.click('#inv-more > summary'); await p.waitForTimeout(400); }
      await press(sel, what);
      await p.waitForTimeout(1500);
      const doc = await p.evaluate(() => { const d = document.createElement('div'); d.innerHTML = window.__printed || ''; return d.textContent.replace(/\s+/g, ' '); });
      await p.evaluate(() => { const pt = document.getElementById('print-target'); if (pt) { pt.style.display = 'none'; pt.innerHTML = ''; }
        document.querySelectorAll('.panel').forEach((x) => { if (x.dataset.wasActive === '1') x.classList.add('active'); }); });
      await p.waitForTimeout(400);
      return doc;
    };
    const REPORT = '#inv-workbar button:has-text("Estate Inventory PDF")', SCHEDULE = '#inv-more button:has-text("Trust Schedule")';
    const report = () => printed(REPORT, 'Estate Inventory PDF, on the work bar');
    const schedule = () => printed(SCHEDULE, 'Trust Schedule, under More ▾', true);
    // The report's stamp: the words from IN PROGRESS or REVIEWED up to the next sentence of the page.
    const stampOf = (doc) => { const m = /(?:IN PROGRESS|REVIEWED) — [^.]*?(?=This is a working copy|Estate of|Ellison Family Trust|Item|#|$)/.exec(doc); return m ? m[0].trim().slice(0, 160) : doc.slice(0, 160); };

    // ── A ─────────────────────────────────────────────────────────────────────────────────────
    await section('A. four stand; five wait for a tick, each saying why; the guesses say unsure; the list not read yet', async () => {
      await toDesk();
      eq(await chip(), 5, '⚠⚠ Not reviewed 5: only the five flagged lines');
      for (const id of STAND) {
        const bx = await box(id);
        eq(bx && [bx.checked, bx.disabled, bx.ink, bx.accent], [true, false, 'gray', 'gray'], '⚠⚠ the ' + id + ' stands: its Reviewed box ticked, grey and enabled');
        eq(bx && bx.title, STANDING_TIP, '…its tooltip says why');
      }
      for (const id of FLAGGED) {
        const bx = await box(id);
        eq(bx && [bx.checked, bx.disabled], [false, false], 'the ' + id + ' waits for the tick');
        eq(bx && bx.title, NEEDS(HELD[id]), '⚠ …its tooltip begins "Needs a look:" and says why');
      }
      eq(await bar(), '4 of 9 reviewed · 4 accepted', '⚠ the work bar names the lines that stand as accepted');
      // Q108: the hint wherever either agent was guessing, a standing line included.
      const gu = await unsure('guess'), pl = await unsure('plate');
      eq(gu && [gu.text, gu.ink], ['unsure', 'bronze'], '⚠ the box both agents guessed on says unsure, in bronze');
      eq(pl && [pl.text, pl.ink], ['unsure', 'bronze'], '⚠⚠ the platter only Agent Two guessed on says unsure too, in bronze (Q108)');
      for (const id of ['cut', 'table', 'tray', 'vase', 'sofa', 'candA', 'candB']) eq(await unsure(id), null, 'no unsure on the ' + id);
      const g = await dupGroups();
      eq(g.length, 1, '⚠ the candlesticks: one group under Possible duplicates');
      ok(/Brass candlestick/.test(g[0] || '') && /#8/.test(g[0] || '') && /#9/.test(g[0] || ''), '…naming them and both their numbers  [' + (g[0] || '') + ']');
      const rl = await readLine();
      eq(rl && [rl.text, rl.ink, rl.press], ['List not read yet · ✓ I’ve read the list', 'gray', '✓ I’ve read the list'],
        '⚠⚠ the work bar: the list not read yet, in grey, with the press (Q107)');
      eq(await p.locator(READ_BTN).count(), 1, 'one press, on the work bar');
      eq(await readRec(), null, 'fixture: no read on the job');
      has(await txt('#inv-workbar'), 'Client documents print with an IN PROGRESS stamp until every flagged item is ticked and the list is read since its last change — they are never withheld.',
        'the work bar says what the papers wait on');
    });

    // ── B ─────────────────────────────────────────────────────────────────────────────────────
    await section('B. the same estate recorded as disputed: nothing stands by itself; recorded back: four stand again', async () => {
      await recordDispute('yes', 'a dispute');
      await toDesk();
      eq(await chip(), 9, '⚠⚠ Not reviewed counts every line on a disputed estate');
      const ticks = [];
      for (const id of ALL) { const bx = await box(id); ticks.push(bx ? bx.checked : null); }
      eq(ticks, ALL.map(() => false), 'every Reviewed box unticked');
      eq((await box('cut') || {}).title, NEEDS('a disputed estate: every item takes a tick'), '⚠ the drawer\'s tooltip names the dispute');
      eq(await bar(), '0 of 9 reviewed', 'and the work bar names nothing accepted');
      await recordDispute('', 'no dispute');
      await toDesk();
      eq(await chip(), 5, 'no dispute: Not reviewed 5 again');
      eq(await bar(), '4 of 9 reviewed · 4 accepted', 'the work bar with it');
    });

    // ── C ─────────────────────────────────────────────────────────────────────────────────────
    await section('C. the tray\'s grey box pressed: the person\'s own look, green and named', async () => {
      await press(BOX('tray'), 'the tray\'s grey Reviewed box');
      const ln = await line('tray');
      eq([ln.rev, ln.by, ln.vrev], [true, ME, true], '⚠⚠ the press recorded a person\'s look, the value with it');
      const bx = await box('tray');
      eq(bx && [bx.checked, bx.disabled, bx.ink, bx.accent], [true, false, 'green', 'green'], '⚠ ticked and green, still a control');
      eq(bx && bx.title, 'Reviewed by ' + ME, 'its tooltip names who');
      eq(await chip(), 5, 'Not reviewed unchanged: it was never on it');
      eq(await bar(), '4 of 9 reviewed · 3 accepted', 'the work bar: one fewer accepted');
    });

    // ── D ─────────────────────────────────────────────────────────────────────────────────────
    await section('D. Specific Bequest ticked in the drawer\'s record: its box unticked by id, no full render', async () => {
      await press('#inv-row-cut button[onclick="_invToggleOpen(\'cut\')"]', 'the drawer\'s ▾');
      const BQ = '#inv-row-cut input[type="checkbox"][onchange*="\'flagBequest\'"]';
      await watchRenders();
      await p.evaluate(() => { window.__box = document.getElementById('inv-rev-cut'); window.__row = document.getElementById('inv-row-cut'); });
      await press(BQ, 'Specific Bequest, in the drawer\'s record');
      eq((await line('cut')).bq, true, 'fixture: the line is a specific bequest now');
      const st = await p.evaluate(() => ({ renders: window.__renders, boxNew: !!document.getElementById('inv-rev-cut') && document.getElementById('inv-rev-cut') !== window.__box,
        oldGone: !!window.__box && !window.__box.isConnected, rowKept: document.getElementById('inv-row-cut') === window.__row }));
      eq([st.renders, st.boxNew, st.oldGone, st.rowKept], [0, true, true, true], '⚠⚠ no full render: the box replaced by id, the row kept');
      const bx = await box('cut');
      eq(bx && [bx.checked, bx.disabled], [false, false], '⚠⚠ flagged now: its box unticked, a person\'s to tick');
      eq(bx && bx.title, NEEDS('a specific bequest'), '⚠ …and its tooltip says it is a specific bequest');
      eq(await chip(), 6, 'Not reviewed 6');
      eq(await bar(), '3 of 9 reviewed · 2 accepted', '⚠ the work bar moved with it');
      ok(await p.locator(BQ).first().isVisible().catch(() => false), 'the record is still open');
      await press(BQ, 'Specific Bequest unticked');
      const bx2 = await box('cut');
      eq(bx2 && [bx2.checked, bx2.disabled, bx2.ink], [true, false, 'gray'], 'unticked: it stands again, grey');
      eq([await chip(), await bar()], [5, '4 of 9 reviewed · 3 accepted'], 'Not reviewed 5 and the work bar back');
      eq(await p.evaluate(() => window.__renders), 0, 'still no full render');
      await unwatchRenders();
      await press('#inv-row-cut button[onclick="_invToggleOpen(\'cut\')"]', 'the drawer\'s record shut');
    });

    // ── E ─────────────────────────────────────────────────────────────────────────────────────
    await section('E. a tick never answers a possible duplicate: one candlestick ticked, the other still held; Not duplicates does', async () => {
      await press(BOX('candA'), 'one candlestick\'s Reviewed box');
      eq((await line('candA')).rev, true, 'fixture: the first candlestick ticked by a person');
      const a = await box('candA'), bb = await box('candB');
      eq(a && [a.checked, a.ink], [true, 'green'], 'its box ticked and green');
      eq(bb && [bb.checked, bb.disabled], [false, false], '⚠⚠ the other candlestick stays unticked: the tick released nothing');
      eq(bb && bb.title, NEEDS(HELD.candB), '⚠ …still held as a possible duplicate');
      const g = await dupGroups();
      ok(g.length === 1 && /#8/.test(g[0]) && /#9/.test(g[0]), '⚠⚠ and the pair is still one group under Possible duplicates  [' + g.join(' | ') + ']');
      eq(await chip(), 4, 'Not reviewed 4: one fewer');
      eq(await bar(), '5 of 9 reviewed · 3 accepted', 'the work bar: one more reviewed, nothing more accepted');
      await press('#panel-inventory .inv-dup-group button:has-text("Not duplicates")', 'Not duplicates, under Possible duplicates');
      eq([(await line('candA')).dupOK, (await line('candB')).dupOK], [true, true], 'fixture: both said to be separate');
      eq(await dupGroups(), [], '⚠ the group is answered and gone');
      const b2 = await box('candB');
      eq(b2 && [b2.checked, b2.disabled, b2.ink, b2.title], [true, false, 'gray', STANDING_TIP], '⚠⚠ the other candlestick now stands, grey');
      eq(await chip(), 3, 'Not reviewed 3');
      eq(await bar(), '6 of 9 reviewed · 4 accepted', 'the work bar: it is accepted now');
    });

    // ── F ─────────────────────────────────────────────────────────────────────────────────────
    await section('F. the platter\'s grey box pressed: unsure goes with the person\'s look', async () => {
      await press(BOX('plate'), 'the platter\'s grey Reviewed box');
      const ln = await line('plate');
      eq([ln.rev, ln.by, ln.vrev], [true, ME, true], 'fixture: a person\'s look recorded');
      eq(await unsure('plate'), null, '⚠⚠ the unsure has gone with it (Q108: until a person\'s look)');
      const bx = await box('plate');
      eq(bx && [bx.checked, bx.ink, bx.title], [true, 'green', 'Reviewed by ' + ME], 'the box green, naming who');
      eq(await bar(), '6 of 9 reviewed · 3 accepted', 'the work bar: one fewer accepted, as many reviewed');
    });

    // ── G ─────────────────────────────────────────────────────────────────────────────────────
    await section('G. the flagged three ticked: the papers say how many stood, and that the list is not yet read', async () => {
      for (const id of ['vase', 'guess', 'sofa']) await press(BOX(id), 'the ' + id + '\'s Reviewed box');
      eq(await chip(), 0, 'Not reviewed: nothing left');
      for (const id of ['vase', 'guess', 'sofa']) eq((await line(id)).rev, true, 'the ' + id + ' ticked by a person');
      eq(await unsure('guess'), null, 'the box\'s unsure went with its tick');
      eq(await bar(), '9 of 9 reviewed · 3 accepted', 'the work bar: all nine, three of them accepted');
      const doc = await report();
      ok(doc.length > 200, 'fixture: the report printed (' + doc.length + ' chars)');
      has(doc, 'IN PROGRESS — 6 items checked; 3 accepted as valued; the list not yet read',
        '⚠⚠ every line checked or standing, but nobody has read the list: IN PROGRESS, and it says so (Q107)  [stamp: ' + stampOf(doc) + ']');
      has(doc, 'Every item is named and decided; the list has not been read through.', '…with the caveat that says what is missing');
      lacks(doc, 'REVIEWED', 'no REVIEWED stamp');
      lacks(doc, 'since it last changed', 'no read recorded, so nothing "since"');
      eq(doc.split('accepted as valued').length - 1, 1, 'said once: the report prints no second pill for them');
      lacks(doc, 'not yet reviewed', 'no value left "not yet reviewed"');
      lacks(doc, 'under $100', 'and no floor in it');
      const ts = await schedule();
      ok(ts.length > 200, 'fixture: the Trust Schedule printed (' + ts.length + ' chars)');
      has(ts, '3 accepted as valued · list not yet read', '⚠ the Trust Schedule\'s grey pill: the same count, and the list not yet read (Q104, Q107)');
      lacks(ts, 'not yet reviewed', 'and no "not yet reviewed" there either');
      lacks(ts, 'list read by', 'nor a read nobody made');
    });

    // ── H ─────────────────────────────────────────────────────────────────────────────────────
    let day = '';
    await section('H. ✓ I\'ve read the list pressed: who and when, in green, and the papers say REVIEWED', async () => {
      const before = Date.now();
      await press(READ_BTN, '✓ I’ve read the list, on the work bar');
      const rd = await readRec();
      ok(!!rd && rd.at >= before - 5000 && rd.at <= Date.now(), 'fixture: the read recorded on the job, now');
      eq(rd && rd.by, ME, '⚠ …by the device\'s user');
      day = rd ? DAY(rd.at) : '';
      const rl = await readLine();
      eq(rl && [rl.text, rl.ink, rl.press], ['✓ List read by ' + ME + ', ' + day, 'green', ''], '⚠⚠ the line turns green, who and when, and the press is gone');
      eq(await p.locator(READ_BTN).count(), 0, 'no press while the read is current');
      const doc = await report();
      has(doc, 'REVIEWED — read by ' + ME + ', ' + day + '; 6 items checked; 3 accepted as valued',
        '⚠⚠ the stamp: REVIEWED, who read the list and when, how many a person checked and how many stood  [stamp: ' + stampOf(doc) + ']');
      lacks(doc, 'IN PROGRESS', 'no IN PROGRESS');
      lacks(doc, 'not yet read', 'and no "not yet read"');
      eq(doc.split('accepted as valued').length - 1, 1, 'said once');
      const ts = await schedule();
      has(ts, '3 accepted as valued · list read by ' + ME + ', ' + day, '⚠⚠ the Trust Schedule\'s pill carries the read words');
      lacks(ts, 'not yet read', 'and no "not yet read" there');
    });

    // ── I ─────────────────────────────────────────────────────────────────────────────────────
    await section('I. the table\'s destination changed through its own select: changed since, and the papers back to IN PROGRESS', async () => {
      const SEL = '#inv-row-table select[onchange*="\'disposition\'"]';
      eq(await p.locator(SEL).count(), 1, 'fixture: the table\'s Where it goes select, on its row');
      await p.selectOption(SEL, 'Consign'); await p.waitForTimeout(900);
      eq((await line('table')).disp, 'Consign', 'fixture: the table goes to consignment now');
      const rl = await readLine();
      eq(rl && [rl.text, rl.ink, rl.press], ['List read by ' + ME + ', ' + day + ' · changed since · ✓ I’ve read the list', 'gray', '✓ I’ve read the list'],
        '⚠⚠ a change after the read: the line says so, in grey, with the press again');
      eq(await bar(), '9 of 9 reviewed · 3 accepted', 'the table still stands: a destination is no flag');
      const doc = await report();
      has(doc, 'IN PROGRESS — 6 items checked; 3 accepted as valued; the list not yet read since it last changed',
        '⚠⚠ the report is back to IN PROGRESS: the read was of an earlier list  [stamp: ' + stampOf(doc) + ']');
      has(doc, 'the list has not been read through since it last changed.', '…and its caveat says since when');
      lacks(doc, 'REVIEWED', 'no REVIEWED');
      const ts = await schedule();
      has(ts, '3 accepted as valued · list not yet read since it changed', '⚠ the Trust Schedule\'s pill says the same');
      lacks(ts, 'list read by', 'and no longer names the read');
    });

    // ── J ─────────────────────────────────────────────────────────────────────────────────────
    await section('J. read again, then a recipient typed: the line says changed since, by id, without a full render', async () => {
      await press(READ_BTN, '✓ I’ve read the list, again');
      const rl = await readLine();
      eq(rl && [rl.ink, rl.press], ['green', ''], 'read again: green, the press gone');
      has(rl && rl.text, '✓ List read by ' + ME, 'naming who');
      const RECIP = '#inv-row-cut .inv-recip';
      eq(await p.locator(RECIP).count(), 1, 'fixture: the drawer\'s Who takes it box, on its row');
      await watchRenders();
      await p.fill(RECIP, 'Goodwill Palm Beach'); await p.press(RECIP, 'Tab'); await p.waitForTimeout(900);
      eq((await line('cut')).ch, 'Goodwill Palm Beach', 'fixture: the charity typed onto the line');
      const st = await p.evaluate((sel) => ({ renders: window.__renders, oldGone: !!window.__read && !window.__read.isConnected,
        fresh: !!document.querySelector(sel) && document.querySelector(sel) !== window.__read }), READ);
      eq([st.renders, st.oldGone, st.fresh], [0, true, true], '⚠⚠ no full render: the read line replaced by id');
      const rl2 = await readLine();
      eq(rl2 && [rl2.text, rl2.ink, rl2.press], ['List read by ' + ME + ', ' + day + ' · changed since · ✓ I’ve read the list', 'gray', '✓ I’ve read the list'],
        '⚠⚠ and it says changed since, with the press');
      await unwatchRenders();
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
