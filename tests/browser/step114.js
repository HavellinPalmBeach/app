// Step 114 (renumbered from 108, then 113, on merging main, whose steps 108 and 113 landed first) — only flagged lines keep a tick, and the list is read (2026-10-26; Q99 to Q109).
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
// too, until a person's look (Q108: *"Show it, no tick"*); a held line's box says why. Round three (the second reviews, and
// Q109): the read vouches for the list it saw, never a time (a fingerprint of what the papers print of every line), so a
// tick, a room check or Not duplicates never unreads it and an edit arriving from another device does whatever its clock
// says; it is pressed only on a copy that has read the sheet; a tick cannot settle a possible duplicate (only Remove or Not
// duplicates do: a ticked half reads bronze, *but still open*) and a desk rename keeps the pair (Agent One's own reading,
// `agentName`); a waived appraisal answers its hold; the box names every reason; and the schedules' pill is bronze until the
// list is read (Q109: *"Bronze until read"*), the schedules staying FINAL.
//
// Drives the REAL page with an active trust estate on the values tier whose kitchen Agent One named and Agent Two valued:
// a $40 cutlery drawer (Donate), a $2,500 dining table (Sell), a silver tray at $80 (Sell), a ceramic vase Agent One
// noted (Look at this), a painted box both agents guessed on, a $9,000 sofa (at the appraisal threshold), a platter only
// Agent Two was unsure of, and two brass candlesticks Agent One named alike off two photographs; and a second estate whose
// sheet cannot be reached. Job Admin & Inv through its own nav button; Edit Client through the dashboard's own button. Each
// paper (the Estate Inventory PDF on the work bar, the Trust Schedule under More ▾) opens in the document viewer, titled by
// the paper, with nothing printed until its Print / Save PDF is pressed; what a paper "prints" below is the page that press
// prints, and the viewer is shut by its Close (restated 2026-10-27: the work bar's papers open on screen first; the Estate
// Inventory PDF printed at once until then):
//   A. Opened, and the sheet's read landed: the work bar offers ✓ I've read the list with no other press. Not reviewed reads
//      5 (the vase, the box, the sofa, the two candlesticks); the drawer, the table, the tray and the platter stand: their
//      Reviewed boxes ticked, grey and enabled, with the standing tooltip; each held box's tooltip names every reason (the
//      sofa's two), the candlesticks' "Still open: … A tick does not settle it."; the box and the platter say unsure (Q108);
//      the candlesticks are one group under Possible duplicates; the work bar reads 4 of 9 · 4 accepted and says the papers
//      wait on the flagged items and the read.
//   B. The same job recorded as disputed on Edit Client: nothing stands (Not reviewed 9, every box unticked, its tooltip
//      naming the dispute, no "accepted"); recorded back as no dispute: 5 again.
//   C. The tray's grey box pressed: a person's look, green, "Reviewed by Ashley Jerome"; the work bar · 3 accepted.
//   D. Specific Bequest ticked in the drawer's record: its box unticked with no full render (the box replaced by id, the
//      row kept), its tooltip naming the bequest and the caution it raises, Not reviewed 6; unticked again: back, by id.
//   E. Both candlesticks ticked: each box checked in bronze, "Ticked by Ashley Jerome, but still open: …", Not reviewed and
//      the work bar unmoved, the pair still under Possible duplicates. One half renamed through its row's own name box: the
//      pair stays (Agent One's own reading), and Agent Two values it again under the typed name.
//   F. The sofa's appraisal waived on the Values bar (Waive, the reason given): its box stands, grey, by id, no full render.
//   G. The platter's grey box pressed: its unsure goes with the person's look, and the box turns green.
//   H. The vase ticked: the report prints IN PROGRESS (the box and the pair still open); the Trust Schedule prints FINAL and
//      its pill in bronze, "3 values as Agent Two left them; list not yet read by Havellin" (Q109).
//   I. ✓ I've read the list pressed: green, who and when, the press gone, the work bar's sentence asking only for the flagged
//      items; the Trust Schedule's pill grey, "3 accepted as valued · list read by …". Then the box ticked: the read stays
//      green (a tick never unreads it), and the report is still IN PROGRESS: the ticked pair is still open.
//   J. Not duplicates pressed: the group goes, the first candlestick green, the renamed one standing grey on Agent Two's new
//      figure; the read still green; the report "REVIEWED — read by …; 5 items checked; 4 accepted as valued", and the
//      work bar's sentence gone.
//   K. The table's destination changed through the row's own select: the line reads "· changed since" with the press; the
//      work bar's sentence is back; the report is IN PROGRESS "…since it last changed" with its caveat; the pill bronze
//      again "… since it last changed".
//   L. Read again, then a recipient typed into the drawer's Who takes it box: no full render, the work bar redrawn by id
//      (the read line fresh, "· changed since", and its sentence back).
//   M. A second estate whose sheet read is aborted: the bars say the sheet is unreachable and the work bar gives that reason
//      in place of the press; with the connection back, the desk's own retry reads the sheet and the press is offered.
//   N. Another device's edits arriving from the sheet, each read as the first estate is opened again: the table's condition,
//      recorded on a clock behind the press, makes the read "· changed since" and the report IN PROGRESS; read again, a room
//      check that found nothing, on a clock running three days fast, leaves it green and the report REVIEWED. At 1440 and
//      390 px no horizontal overflow; zero page errors.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step114.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
const SYNC = 'https://sync.example.test/exec';
const J = 9854, J2 = 9855;
const ME = 'Ashley Jerome';
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');
const STANDING_TIP = 'Nothing flagged: the agents’ name and value stand as they are. Tick it to record your own look.';
// Each held line's reasons, as the box's tooltip words them (written out here, never read off INV_HOLD_WORDS).
const NEEDS = (why) => 'Needs a look: ' + why + '. Tick it once checked.';
const DUP = 'a possible duplicate: Remove one or press Not duplicates, under Possible duplicates';
const OPEN = 'Still open: ' + DUP + '. A tick does not settle it.';
const STUCK = 'Ticked by Ashley Jerome, but still open: ' + DUP + '. A tick does not settle it.';
const HELD = { vase: NEEDS('Agent One’s note on it'), guess: NEEDS('both agents were guessing'),
  // Every reason, not the first (round three): the sofa waits on an appraisal, and so its release carries the caution.
  sofa: NEEDS('waiting on an appraisal; a release caution'), candA: OPEN, candB: OPEN };
const STAND = ['cut', 'table', 'tray', 'plate'], FLAGGED = ['vase', 'guess', 'sofa', 'candA', 'candB'], ALL = STAND.concat(FLAGGED);
// The work bar's sentence, in each of its states.
const WAIT_BOTH = 'Client documents print with an IN PROGRESS stamp until every flagged item is checked and the list is read since its last change — they are never withheld.';
const WAIT_FLAGGED = 'Client documents print with an IN PROGRESS stamp until every flagged item is checked — they are never withheld.';
const WAIT_READ = 'Client documents print with an IN PROGRESS stamp until the list is read since its last change — they are never withheld.';
// The day a read was recorded, worked out here from its own clock reading, in Eastern time: "October 26, 2026".
const DAY = (at) => new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(at));

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
    let sheet = {};
    let failMedia = false;   // M: the sheet's read aborted, as an unreachable deployment answers
    const net = { value: [] };
    await ctx.route(SYNC + '**', async (r) => {
      const req = r.request();
      const json = (o) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
      if (req.method() === 'POST') {
        let body = {}; try { body = JSON.parse(req.postData() || '{}'); } catch (e) {}
        // Agent Two, valuing a renamed candlestick again under the name typed (E): it gives the typed name back.
        if (body.action === 'agentValue') {
          net.value.push(body);
          const results = {};
          (body.items || []).forEach((it) => {
            if (it.stableId === 'candB') results.candB = { fmv: 40, low: 30, high: 55, confidence: 'medium', source: 'Online comps',
              basis: 'Baldwin brass candlesticks sell singly for about this.', comps: [], lookup: '', notices: [], mode: it.mode || 'research',
              name: 'Brass candlestick, Baldwin' };
          });
          return json({ ok: true, success: true, results: results, failed: {}, remaining: 0 });
        }
        return json({ ok: true });
      }
      if (/action=loadMedia/.test(req.url())) { if (failMedia) return r.abort(); return json({ ok: true, media: sheet }); }
      return json({ ok: true });
    });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    // A prompt (Waive's reason) is answered as a person types it; everything else is accepted.
    const WAIVE_WHY = 'Katherine Ellison, by phone: the sofa sells with the house, no appraisal wanted';
    const said = []; p.on('dialog', async (d) => { said.push(d.message()); await (d.type() === 'prompt' ? d.accept(WAIVE_WHY) : d.accept()); });
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
    const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < (ms || 6000)) { if (await f()) return true; await p.waitForTimeout(150); } return false; };
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const txt = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }, sel);
    const chip = async () => { const t = await txt('#panel-inventory button[onclick="setInvFlag(\'unreviewed\')"]'); const m = /(\d+)/.exec(t); return t ? (m ? +m[1] : 0) : null; };
    const BOX = (id) => '#inv-row-' + id + ' input[type="checkbox"][onchange*="_invSetReviewed"]';
    // A colour as the stylesheet resolves one of its tokens, so a box or a hint can be named grey, green or bronze: one helper
    // on the page (installed after the page loads; the page is never reloaded). The bronze label of a ticked open line is
    // the darker bronze (`bronze-dk`).
    const installTones = () => p.evaluate(() => {
      window.__toneName = (c) => {
        const tone = (v) => { const s = document.createElement('span'); s.style.color = 'var(' + v + ')'; document.body.appendChild(s); const x = getComputedStyle(s).color; s.remove(); return x; };
        return c === tone('--gray') ? 'gray' : c === tone('--ok-tx') ? 'green' : c === tone('--bronze') ? 'bronze' : c === tone('--bronze-dk') ? 'bronze-dk' : c;
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
    // The work bar's sentence about what the papers wait on, or '' where it draws none.
    const waits = async () => { const t = await txt('#inv-workbar'); const m = /Client documents print with an IN PROGRESS stamp until [^—]*— they are never withheld\./.exec(t); return m ? m[0] : ''; };
    // The work bar's list-read line (Q107): its words, its colour, and whether it offers the press.
    const READ = '#inv-read-', READ_BTN = (j) => '#inv-workbar button[onclick="invMarkListRead(' + (j || J) + ')"]';
    const readLine = (j) => p.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const btn = el.querySelector('button');
      return { text: el.textContent.replace(/\s+/g, ' ').trim(), ink: window.__toneName(getComputedStyle(el).color), press: btn ? btn.textContent.trim() : '' };
    }, READ + (j || J));
    const readRec = () => p.evaluate((j) => { const r = (jobs.find((x) => x.id === j) || {}).invRead; return r ? { at: r.at, by: r.by } : null; }, J);
    const dupGroups = () => p.evaluate(() => [...document.querySelectorAll('#panel-inventory .inv-dup-group')].map((g) => g.textContent.replace(/\s+/g, ' ').trim()));
    const line = (id) => p.evaluate(([j, id]) => { const r = (_photoRefs[j] || []).find((x) => x.stableId === id) || {};
      return { rev: !!r.reviewed, by: r.reviewedBy || '', vrev: !!r.valReviewed, bq: !!r.flagBequest, dupOK: !!r.dupOK, disp: r.disposition || '', ch: r.channel || '',
        name: r.objectName || '', agentName: r.agentName || '', fmv: r.fmv, valBy: r.valuedBy || '', waived: !!r.apprWaived, cond: r.condition || '', chk: r.dupChkAt || 0 }; }, [J, id]);
    // Counts full renders of the tab from here on, and remembers the read line's element, to tell a by-id repaint from a redraw.
    const watchRenders = () => p.evaluate((sel) => {
      window.__renders = 0;
      if (!window.__origRender) { window.__origRender = renderInventoryTab; window.renderInventoryTab = function () { window.__renders++; return window.__origRender.apply(this, arguments); }; }
      window.__read = document.querySelector(sel);
    }, READ + J);
    const unwatchRenders = () => p.evaluate(() => { if (window.__origRender) { window.renderInventoryTab = window.__origRender; delete window.__origRender; } });
    // A client picked in the desk's own picker, and its sheet read waited for (the read's own record, as the bars wait on it).
    const pick = async (j) => {
      await p.selectOption('#inv-job', String(j));
      await until(() => p.evaluate((j) => !!_invCloudSeen[j] || !!(_invCloudFailed || {})[j], j), 8000);
      await p.waitForTimeout(700);
    };

    await p.goto(APP); await p.waitForTimeout(1600);
    await installTones();
    sheet = await p.evaluate(([J, J2, SYNC, ME]) => {
      SHEETS_SYNC_URL = SYNC;
      try { localStorage.setItem('hav_device_user', ME); } catch (e) {}
      const T = Date.now() - 2 * 86400000;
      const estate = (id, hvl, first, last, o) => Object.assign({ id: id, hvlId: hvl, fname: first, lname: last, name: first + ' ' + last, svc: 'cleanout', matterType: 'trust',
        addr: '14 Via Mizner', city: 'Palm Beach', zip: '33480', ptype: 'Single Family Home', src: 'Family', sqft: 3800,
        executor: 'Katherine Ellison', executorFname: 'Katherine', executorLname: 'Ellison', executorRole: 'Trustee', executorPhone: '(561) 555-0142',
        executorEmail: 'kate@example.com', deathDate: '2026-08-14', executorAuth: 'received', trustName: last + ' Family Trust',
        docTier: 'values', gate706: 'no', gateDispute: '', status: 'active', won: true, wonAt: '2026-10-01', approved: true, tc: ME,
        created: '2026-09-28', start: '2026-10-12', activatedOn: '2026-10-10', agrApproved: true, agrSent: true, agrSigned: true,
        driveFolder: 'https://drive.google.com/drive/folders/R' + id, driveSubfolders: { 'Estate Inventory': 'INV_' + id, 'As-Found Record': 'AF_' + id }, at: {},
        payments: [{ uid: 'd' + id, stage: 'deposit', amount: 12000, receivedOn: '2026-10-08', method: 'wire', clearedOn: '2026-10-08' }] }, o);
      jobs.unshift(estate(J2, 'HVL-2610-RG', 'Harold', 'Whitcombe', { addr: '220 Seaspray Avenue', executor: 'Ruth Whitcombe', executorFname: 'Ruth', executorLname: 'Whitcombe', executorEmail: 'ruth@example.com' }));
      jobs.unshift(estate(J, 'HVL-2610-RF', 'Margaret', 'Ellison'));
      [J, J2].forEach((id) => { estimateStore[id] = { approved: true, submitted: true, approvedBy: 'Anthony Graziano', savedAt: T,
        estimate: { jobId: id, svc: 'cleanout', havellinTotal: 24000, fixedPrice: true, fixedAmount: 24000, fixedLines: true, totTC: 60, totPS: 90, days: 5,
          vendors: [], prepItems: [], rooms: [{ idx: 2, name: 'Kitchen', st: 'in', vol: 3, cplx: 3 }] } }; });
      // Each line as Agent One's naming and Agent Two's valuing leave it, Agent One's own reading kept beside the name
      // (`agentName`, which _agWrite records on every naming since round three).
      const line = (j, hvl, id, n, name, o) => Object.assign({ stableId: id, itemNo: n, label: 'inventory', collId: null, roomIdx: 2, seq: n, status: 'uploaded', ts: T + n * 60000,
        filename: hvl + '_Kitchen_INV_' + n + '.jpg', driveFileId: 'F' + id, driveFileUrl: 'https://drive.google.com/file/d/F' + id + '/view',
        objectName: name, agentName: name, valNameAt: name, namedBy: 'agent', agentConf: 'medium', agentAt: T + n * 60000 + 5000, category: 'General/Household', disposition: 'Sell', qty: 1,
        valuedBy: 'agent', valConf: 'medium', valSource: 'General estimate', valAgentAt: T + n * 60000 + 9000, updatedAt: T + n * 60000 + 9000 }, o);
      const L = line.bind(null, J, 'HVL-2610-RF');
      _photoRefs[J] = [
        L('cut', 1, 'Stainless flatware and kitchen utensils, drawer', { disposition: 'Donate', fmv: 40, valLow: 20, valHigh: 60 }),
        L('table', 2, 'Mahogany dining table', { category: 'Furniture', fmv: 2500, valLow: 2000, valHigh: 2900, valSource: 'Online comps' }),
        L('tray', 3, 'Silver serving tray', { category: 'Silver & Precious Metal', fmv: 80, valLow: 60, valHigh: 110 }),
        L('vase', 4, 'Ceramic vase', { fmv: 30, valLow: 20, valHigh: 50, agentNotices: [{ kind: 'other', text: 'A maker’s mark under the base.' }] }),
        L('guess', 5, 'Painted wooden box, possibly folk art', { agentConf: 'low', valConf: 'low', fmv: 60, valLow: 20, valHigh: 150 }),
        L('sofa', 6, 'Camelback sofa, silk upholstery', { category: 'Furniture', fmv: 9000, valLow: 7000, valHigh: 11000, valSource: 'Auction comps' }),
        // Agent One sure of the name, Agent Two not of the figure (Q108): it stands, and still says unsure.
        L('plate', 7, 'Blue and white transferware platter', { fmv: 45, valLow: 15, valHigh: 120, valConf: 'low' }),
        // One name, one room, two photographs: a possible duplicate (same-name evidence).
        L('candA', 8, 'Brass candlestick', { fmv: 25, valLow: 15, valHigh: 35 }),
        L('candB', 9, 'Brass candlestick', { fmv: 25, valLow: 15, valHigh: 35 })];
      // The second estate (M): two lines that stand, whose sheet is out of reach when it is opened.
      const L2 = line.bind(null, J2, 'HVL-2610-RG');
      _photoRefs[J2] = [
        L2('lamp', 1, 'Brass floor lamp', { disposition: 'Donate', fmv: 60, valLow: 40, valHigh: 80 }),
        L2('rug', 2, 'Wool area rug, 8 by 10', { fmv: 300, valLow: 200, valHigh: 400 })];
      savePhotoRefs(J); savePhotoRefs(J2); saveJobs(); localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore));
      const out = {};
      [J, J2].forEach((id) => { out[id] = { items: JSON.parse(localStorage.getItem('hav_media_' + id) || '[]') }; });
      return out;
    }, [J, J2, SYNC, ME]);

    const toDesk = async () => {
      await p.click('.nb[onclick*="\'inventory\'"]'); await p.waitForTimeout(800);
      const cur = await p.evaluate(() => (document.getElementById('inv-job') || {}).value);
      if (String(cur) !== String(J)) await pick(J);
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
    // A paper as the print path hands it to the browser: window.print caught, the page's text read off #print-target, and
    // each stamp or pill on it (a box with a background of its own) with its colour, so bronze can be told from grey.
    // Restated 2026-10-27: the work bar's papers open on screen first. Every paper this step reads (the Estate Inventory PDF
    // on the work bar, the Trust Schedule under More ▾) opens in the document viewer titled by the paper, prints nothing
    // until the viewer's own Print / Save PDF is pressed, and the page read is the one that press prints.
    let pills = [];
    const printed = async (sel, what, menu, title) => {
      await p.evaluate(() => { window.__printed = ''; window.print = () => { window.__printed = (document.getElementById('print-target') || {}).innerHTML || ''; }; });
      // More ▾ keeps its open state across a redraw (_renderInvWorkbar reads it), so it is opened only if it is shut.
      if (menu && !(await p.evaluate(() => !!(document.getElementById('inv-more') || {}).open))) { await p.click('#inv-more > summary'); await p.waitForTimeout(400); }
      await press(sel, what);
      // Restated 2026-10-27: the work bar's papers open on screen first (the wait that let the page print now lets the viewer open).
      await p.waitForTimeout(700);
      // Restated on merging main (2026-10-26, "The desk's More ▾ papers open on screen first"): a paper under More ▾ opens in
      // the viewer and prints nothing until the viewer's own Print / Save PDF is pressed, which prints that page; the viewer
      // comes back after the dialog and is closed by its Close (left open, it covered the work bar and every press after it).
      // Restated 2026-10-27: the work bar's papers open on screen first. The Estate Inventory PDF no longer prints at once:
      // it takes the same road as the More ▾ papers, so the checks below are asked of every paper, not only those under More ▾.
      ok(await p.evaluate(() => { const o = document.getElementById('doc-viewer-modal'); return !!o && o.style.display === 'flex'; }),
        what + ': opens on screen first (' + (menu ? 'main, 2026-10-26' : '2026-10-27') + ')');
      // Restated 2026-10-27: the work bar's papers open on screen first; the viewer is titled by the paper.
      eq(await txt('#doc-viewer-title'), title, what + ': the viewer is titled by the paper');
      eq(await p.evaluate(() => (window.__printed || '').length), 0, what + ': nothing printed until the viewer\'s Print is pressed (characters printed)');
      await press('#doc-viewer-print', 'the viewer\'s Print / Save PDF (' + what + ')');
      await p.waitForTimeout(1500);
      const got = await p.evaluate(() => {
        const d = document.createElement('div'); d.innerHTML = window.__printed || '';
        const pl = [...d.querySelectorAll('div')].filter((x) => /background:\s*#/i.test(x.getAttribute('style') || '') && /font-weight:\s*700/.test(x.getAttribute('style') || ''))
          .map((x) => ({ text: x.textContent.replace(/\s+/g, ' ').trim(), bg: ((/background:\s*(#[0-9a-f]{3,6})/i.exec(x.getAttribute('style')) || [])[1] || '').toLowerCase() }));
        return { text: d.textContent.replace(/\s+/g, ' '), pills: pl };
      });
      await p.evaluate(() => { const pt = document.getElementById('print-target'); if (pt) { pt.style.display = 'none'; pt.innerHTML = ''; }
        document.querySelectorAll('.panel').forEach((x) => { if (x.dataset.wasActive === '1') x.classList.add('active'); }); });
      await p.waitForTimeout(400);
      // Restated 2026-10-27: the work bar's papers open on screen first, so every paper's viewer is closed by its Close (it came
      // back after the print, and left open it covered the work bar and every press after it).
      await press('#doc-viewer-modal button[onclick="closeDocViewer()"]', 'the viewer\'s Close (' + what + ')'); await p.waitForTimeout(200);
      pills = got.pills;
      return got.text;
    };
    // The pill or stamp carrying these words, and its colour: '#8a6d3b' bronze, '#6b6b6b' grey.
    const pillOf = (words) => { const f = pills.find((x) => x.text.indexOf(words) >= 0); return f ? [f.text, f.bg] : null; };
    const REPORT = '#inv-workbar button:has-text("Estate Inventory PDF")', SCHEDULE = '#inv-more button:has-text("Trust Schedule")';
    // Restated 2026-10-27: the work bar's papers open on screen first; each is named with the title its viewer carries.
    const report = () => printed(REPORT, 'Estate Inventory PDF, on the work bar', false, 'Estate Inventory');
    const schedule = () => printed(SCHEDULE, 'Trust Schedule, under More ▾', true, 'Trust Schedule');
    // The report's stamp: the words from IN PROGRESS or REVIEWED up to the next sentence of the page.
    const stampOf = (doc) => { const m = /(?:IN PROGRESS|REVIEWED) — [^.]*?(?=This is a working copy|Estate of|Ellison Family Trust|Item|#|$)/.exec(doc); return m ? m[0].trim().slice(0, 160) : doc.slice(0, 160); };
    const BRONZE = '#8a6d3b', GREY = '#6b6b6b';

    // ── A ─────────────────────────────────────────────────────────────────────────────────────
    await section('A. opened: the read lands and the press is offered; four stand; five wait, each naming every reason', async () => {
      await p.click('.nb[onclick*="\'inventory\'"]'); await p.waitForTimeout(800);
      await pick(J);
      eq(await p.evaluate((j) => !!_invCloudSeen[j], J), true, 'fixture: the sheet\'s copy read, and it changed nothing');
      // ⚠ Round three: the press waits for the sheet's read (invListReadRefusal). Once the read has landed, the work bar
      // offers it, with no other press: a person opening the desk at night presses nothing else first.
      const rl0 = await readLine();
      eq(rl0 && [rl0.text, rl0.press], ['List not read yet · ✓ I’ve read the list', '✓ I’ve read the list'],
        '⚠⚠ the sheet read: the work bar offers the press without another press (it kept "still loading" until the next full redraw)');
      if (await p.locator('#panel-inventory button[onclick="setInvWhen(\'all\')"]').count()) { await p.click('#panel-inventory button[onclick="setInvWhen(\'all\')"]'); await p.waitForTimeout(600); }
      eq(await chip(), 5, '⚠⚠ Not reviewed 5: only the five flagged lines');
      for (const id of STAND) {
        const bx = await box(id);
        eq(bx && [bx.checked, bx.disabled, bx.ink, bx.accent], [true, false, 'gray', 'gray'], '⚠⚠ the ' + id + ' stands: its Reviewed box ticked, grey and enabled');
        eq(bx && bx.title, STANDING_TIP, '…its tooltip says why');
      }
      for (const id of FLAGGED) {
        const bx = await box(id);
        eq(bx && [bx.checked, bx.disabled], [false, false], 'the ' + id + ' waits for the tick');
        eq(bx && bx.title, HELD[id], '⚠ …its tooltip names every reason (an open duplicate: what settles it)');
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
      eq(await p.locator(READ_BTN()).count(), 1, 'one press, on the work bar');
      eq(await readRec(), null, 'fixture: no read on the job');
      eq(await waits(), WAIT_BOTH, 'the work bar says what the papers wait on: the flagged items and the read');
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
      // Every reason (round three): the bequest, and the release caution a specific bequest with no bequest behind it raises.
      eq(bx && bx.title, NEEDS('a specific bequest; a release caution'), '⚠ …and its tooltip names the bequest and the caution it raises');
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
    await section('E. both candlesticks ticked: bronze, still open; one renamed on its row: still a pair', async () => {
      await press(BOX('candA'), 'the first candlestick\'s Reviewed box');
      await press(BOX('candB'), 'the second candlestick\'s Reviewed box');
      eq([(await line('candA')).rev, (await line('candB')).rev], [true, true], 'fixture: both ticked by a person');
      for (const id of ['candA', 'candB']) {
        const bx = await box(id);
        eq(bx && [bx.checked, bx.disabled, bx.ink, bx.accent], [true, false, 'bronze-dk', 'bronze'],
          '⚠⚠ the ' + id + '\'s box: the tick kept and shown, in bronze, not green (a tick does not settle a possible duplicate)');
        eq(bx && bx.title, STUCK, '⚠ …its tooltip: ticked, but still open, and what settles it');
      }
      eq(await chip(), 5, '⚠⚠ Not reviewed unmoved: neither is checked while the pair is open');
      eq(await bar(), '4 of 9 reviewed · 3 accepted', 'and the work bar with it');
      let g = await dupGroups();
      ok(g.length === 1 && /#8/.test(g[0]) && /#9/.test(g[0]), '⚠⚠ the pair still one group under Possible duplicates  [' + g.join(' | ') + ']');
      // One half renamed through its row's own name box, as a person tidies a name; Enter ends the edit.
      const NM = '#inv-row-candB .inv-name textarea';
      eq(await p.locator(NM).count(), 1, 'fixture: the second candlestick\'s name box, on its row');
      await p.fill(NM, 'Brass candlestick, Baldwin'); await p.press(NM, 'Enter');
      await until(async () => (await line('candB')).fmv === 40, 6000);
      await p.waitForTimeout(800);
      const ln = await line('candB');
      eq([ln.name, ln.agentName], ['Brass candlestick, Baldwin', 'Brass candlestick'], 'fixture: the name typed, Agent One\'s own reading kept beside it');
      eq(net.value.length >= 1 && (net.value[net.value.length - 1].items || []).map((it) => it.stableId), ['candB'], 'fixture: Agent Two asked to value it again under the typed name');
      eq([ln.fmv, ln.valBy], [40, 'agent'], 'fixture: …and its figure under that name came back');
      g = await dupGroups();
      ok(g.length === 1 && /#8/.test(g[0]) && /#9/.test(g[0]), '⚠⚠ renamed, the pair is still one group: only Remove or Not duplicates answers it  [' + g.join(' | ') + ']');
      const bx = await box('candB');
      eq(bx && [bx.checked, bx.ink, bx.title], [true, 'bronze-dk', STUCK], '⚠ the renamed half still ticked in bronze, still open');
      eq(await chip(), 5, 'Not reviewed unmoved');
    });

    // ── F ─────────────────────────────────────────────────────────────────────────────────────
    await section('F. the sofa\'s appraisal waived on the Values bar: its box stands by id, no full render', async () => {
      const WV = '#inv-guardrail button[onclick="waiveAppraisal(' + J + ',\'sofa\')"]';
      if (!(await p.locator(WV).first().isVisible().catch(() => false)) && await p.locator('#desk-hd-values-' + J).count()) {
        await p.click('#desk-hd-values-' + J); await p.waitForTimeout(500);
      }
      await watchRenders();
      await p.evaluate(() => { window.__box = document.getElementById('inv-rev-sofa'); window.__wb = document.getElementById('inv-workbar'); });
      await press(WV, 'Waive, beside the sofa on the Values bar');
      eq((await line('sofa')).waived, true, 'fixture: the waiver recorded, with the reason typed');
      const st = await p.evaluate(() => ({ renders: window.__renders, boxNew: !!document.getElementById('inv-rev-sofa') && document.getElementById('inv-rev-sofa') !== window.__box,
        wbNew: !!document.getElementById('inv-workbar') && document.getElementById('inv-workbar') !== window.__wb }));
      eq([st.renders, st.boxNew, st.wbNew], [0, true, true], '⚠⚠ no full render: the box and the work bar replaced by id');
      const bx = await box('sofa');
      eq(bx && [bx.checked, bx.disabled, bx.ink, bx.title], [true, false, 'gray', STANDING_TIP], '⚠⚠ a waiver answers the appraisal: the sofa stands, grey');
      eq(await chip(), 4, 'Not reviewed 4');
      eq(await bar(), '5 of 9 reviewed · 4 accepted', '⚠ the work bar, by id: one more accepted');
      await unwatchRenders();
    });

    // ── G ─────────────────────────────────────────────────────────────────────────────────────
    await section('G. the platter\'s grey box pressed: unsure goes with the person\'s look', async () => {
      await press(BOX('plate'), 'the platter\'s grey Reviewed box');
      const ln = await line('plate');
      eq([ln.rev, ln.by, ln.vrev], [true, ME, true], 'fixture: a person\'s look recorded');
      eq(await unsure('plate'), null, '⚠⚠ the unsure has gone with it (Q108: until a person\'s look)');
      const bx = await box('plate');
      eq(bx && [bx.checked, bx.ink, bx.title], [true, 'green', 'Reviewed by ' + ME], 'the box green, naming who');
      eq(await bar(), '5 of 9 reviewed · 3 accepted', 'the work bar: one fewer accepted, as many reviewed');
    });

    // ── H ─────────────────────────────────────────────────────────────────────────────────────
    await section('H. the vase ticked: the papers IN PROGRESS; the Trust Schedule FINAL, its pill bronze until the list is read', async () => {
      await press(BOX('vase'), 'the vase\'s Reviewed box');
      eq((await line('vase')).rev, true, 'fixture: the vase ticked by a person');
      eq(await chip(), 3, 'Not reviewed 3: the box and the pair');
      eq(await bar(), '6 of 9 reviewed · 3 accepted', 'the work bar');
      const doc = await report();
      ok(doc.length > 200, 'fixture: the report printed (' + doc.length + ' chars)');
      has(doc, 'IN PROGRESS — 3 of 6 items checked; 3 accepted as valued', '⚠ the report: IN PROGRESS, how many checked and how many stood  [stamp: ' + stampOf(doc) + ']');
      lacks(doc, 'REVIEWED', 'no REVIEWED stamp');
      lacks(doc, 'under $100', 'and no floor in it');
      const ts = await schedule();
      ok(ts.length > 200, 'fixture: the Trust Schedule printed (' + ts.length + ' chars)');
      has(ts, 'FINAL', '⚠ the Trust Schedule stays FINAL (Q109)');
      lacks(ts, 'DRAFT', 'no DRAFT');
      eq(pillOf('as Agent Two left'), ['3 values as Agent Two left them; list not yet read by Havellin', BRONZE],
        '⚠⚠ its pill bronze, saying whose read is owed (Q109: "Bronze until read")');
      lacks(ts, 'accepted as valued', 'no grey "accepted as valued" before anybody has read the list');
      lacks(ts, 'list read by', 'nor a read nobody made');
      // The two figures nobody has looked at, beside it: the box's (unticked) and the renamed candlestick's, valued again after
      // its tick (a tick covers the figure it saw, never the next one).
      eq(pillOf('not yet reviewed'), ['2 values not yet reviewed', BRONZE], 'and, beside it, the two figures nobody has looked at yet');
    });

    // ── I ─────────────────────────────────────────────────────────────────────────────────────
    let day = '';
    await section('I. ✓ I\'ve read the list pressed: green, who and when; the box ticked after it: the read stays', async () => {
      const before = Date.now();
      await press(READ_BTN(), '✓ I’ve read the list, on the work bar');
      const rd = await readRec();
      ok(!!rd && rd.at >= before - 5000 && rd.at <= Date.now(), 'fixture: the read recorded on the job, now');
      eq(rd && rd.by, ME, '⚠ …by the device\'s user');
      day = rd ? DAY(rd.at) : '';
      const rl = await readLine();
      eq(rl && [rl.text, rl.ink, rl.press], ['✓ List read by ' + ME + ', ' + day, 'green', ''], '⚠⚠ the line turns green, who and when, and the press is gone');
      eq(await p.locator(READ_BTN()).count(), 0, 'no press while the read is current');
      eq(await waits(), WAIT_FLAGGED, '⚠ the work bar\'s sentence asks only for the flagged items now');
      const ts = await schedule();
      eq(pillOf('accepted as valued'), ['3 accepted as valued · list read by ' + ME + ', ' + day, GREY], '⚠⚠ the Trust Schedule\'s pill grey once read, naming who and when (Q109)');
      lacks(ts, 'not yet read', 'and no "not yet read" there');
      has(ts, 'FINAL', 'still FINAL');
      // A flagged line ticked after the read: a tick never unreads the list.
      await press(BOX('guess'), 'the box\'s Reviewed box, after the read');
      eq((await line('guess')).rev, true, 'fixture: the box ticked by a person');
      eq(await unsure('guess'), null, 'its unsure went with its tick');
      const rl2 = await readLine();
      eq(rl2 && [rl2.text, rl2.ink, rl2.press], ['✓ List read by ' + ME + ', ' + day, 'green', ''], '⚠⚠ a tick never unreads the list: still green');
      eq(await chip(), 2, 'Not reviewed 2: the ticked pair, still open');
      const doc = await report();
      has(doc, 'IN PROGRESS — 4 of 6 items checked; 3 accepted as valued',
        '⚠⚠ the list read and both halves ticked, the report is IN PROGRESS: the pair is still open  [stamp: ' + stampOf(doc) + ']');
      lacks(doc, 'REVIEWED', 'no REVIEWED');
    });

    // ── J ─────────────────────────────────────────────────────────────────────────────────────
    await section('J. Not duplicates pressed: the pair is answered, the read still green, and the report REVIEWED', async () => {
      await press('#panel-inventory .inv-dup-group button:has-text("Not duplicates")', 'Not duplicates, under Possible duplicates');
      eq([(await line('candA')).dupOK, (await line('candB')).dupOK], [true, true], 'fixture: both said to be separate');
      eq(await dupGroups(), [], '⚠ the group is answered and gone');
      const a = await box('candA'), bb = await box('candB');
      eq(a && [a.checked, a.ink, a.accent, a.title], [true, 'green', 'green', 'Reviewed by ' + ME], '⚠⚠ the first candlestick: its tick a look now, green');
      eq(bb && [bb.checked, bb.disabled, bb.ink, bb.title], [true, false, 'gray',
        'Reviewed by ' + ME + '; Agent Two’s value since stands, nothing flagged. Tick it to record your look at the value.'],
        '⚠⚠ the renamed one stands, grey, on Agent Two\'s figure for the typed name, which nobody has looked at since');
      eq(await chip(), 0, 'Not reviewed: nothing left');
      eq(await bar(), '9 of 9 reviewed · 4 accepted', 'the work bar: all nine, four of them accepted');
      const rl = await readLine();
      eq(rl && [rl.text, rl.ink], ['✓ List read by ' + ME + ', ' + day, 'green'], '⚠⚠ Not duplicates never unreads the list');
      eq(await waits(), '', 'the work bar\'s sentence is gone: nothing is owed');
      const doc = await report();
      has(doc, 'REVIEWED — read by ' + ME + ', ' + day + '; 5 items checked; 4 accepted as valued',
        '⚠⚠ the stamp: REVIEWED, who read the list and when, how many a person checked and how many stood  [stamp: ' + stampOf(doc) + ']');
      lacks(doc, 'IN PROGRESS', 'no IN PROGRESS');
      lacks(doc, 'not yet read', 'and no "not yet read"');
      eq(doc.split('accepted as valued').length - 1, 1, 'said once: the report prints no second pill for them');
      const ts = await schedule();
      eq(pillOf('accepted as valued'), ['4 accepted as valued · list read by ' + ME + ', ' + day, GREY], '⚠ the Trust Schedule\'s pill, grey, with the read');
      lacks(ts, 'not yet reviewed', 'and no value left "not yet reviewed"');
    });

    // ── K ─────────────────────────────────────────────────────────────────────────────────────
    await section('K. the table\'s destination changed through its own select: changed since, and the papers back to IN PROGRESS', async () => {
      const SEL = '#inv-row-table select[onchange*="\'disposition\'"]';
      eq(await p.locator(SEL).count(), 1, 'fixture: the table\'s Where it goes select, on its row');
      await p.selectOption(SEL, 'Consign'); await p.waitForTimeout(900);
      eq((await line('table')).disp, 'Consign', 'fixture: the table goes to consignment now');
      const rl = await readLine();
      eq(rl && [rl.text, rl.ink, rl.press], ['List read by ' + ME + ', ' + day + ' · changed since · ✓ I’ve read the list', 'gray', '✓ I’ve read the list'],
        '⚠⚠ a change after the read: the line says so, in grey, with the press again');
      eq(await waits(), WAIT_READ, '⚠⚠ the work bar\'s sentence is back, asking for the read alone');
      eq(await bar(), '9 of 9 reviewed · 4 accepted', 'the table still stands: a destination is no flag');
      const doc = await report();
      has(doc, 'IN PROGRESS — 5 items checked; 4 accepted as valued; the list not yet read since it last changed',
        '⚠⚠ the report is back to IN PROGRESS: the read was of an earlier list  [stamp: ' + stampOf(doc) + ']');
      has(doc, 'Every item needing a closer look has been checked; the list as a whole has not been read through since it last changed.',
        '…and its caveat says what was checked and since when');
      lacks(doc, 'named and decided', 'and claims nothing it did not witness');
      lacks(doc, 'REVIEWED', 'no REVIEWED');
      const ts = await schedule();
      eq(pillOf('as Agent Two left'), ['4 values as Agent Two left them; list not yet read by Havellin since it last changed', BRONZE],
        '⚠⚠ the Trust Schedule\'s pill bronze again, since it last changed');
      lacks(ts, 'list read by', 'and no longer names the read');
      has(ts, 'FINAL', 'still FINAL');
    });

    // ── L ─────────────────────────────────────────────────────────────────────────────────────
    await section('L. read again, then a recipient typed: the work bar redrawn by id, changed since, its sentence back', async () => {
      await press(READ_BTN(), '✓ I’ve read the list, again');
      const rl = await readLine();
      eq(rl && [rl.ink, rl.press], ['green', ''], 'read again: green, the press gone');
      has(rl && rl.text, '✓ List read by ' + ME, 'naming who');
      eq(await waits(), '', 'no sentence while the read is current');
      const RECIP = '#inv-row-cut .inv-recip';
      eq(await p.locator(RECIP).count(), 1, 'fixture: the drawer\'s Who takes it box, on its row');
      await watchRenders();
      await p.evaluate(() => { window.__wb = document.getElementById('inv-workbar'); });
      await p.fill(RECIP, 'Goodwill Palm Beach'); await p.press(RECIP, 'Tab'); await p.waitForTimeout(900);
      eq((await line('cut')).ch, 'Goodwill Palm Beach', 'fixture: the charity typed onto the line');
      const st = await p.evaluate((sel) => ({ renders: window.__renders, oldGone: !!window.__read && !window.__read.isConnected,
        fresh: !!document.querySelector(sel) && document.querySelector(sel) !== window.__read,
        wbNew: !!document.getElementById('inv-workbar') && document.getElementById('inv-workbar') !== window.__wb }), READ + J);
      eq([st.renders, st.oldGone, st.fresh, st.wbNew], [0, true, true, true], '⚠⚠ no full render: the work bar replaced by id, its read line with it');
      const rl2 = await readLine();
      eq(rl2 && [rl2.text, rl2.ink, rl2.press], ['List read by ' + ME + ', ' + day + ' · changed since · ✓ I’ve read the list', 'gray', '✓ I’ve read the list'],
        '⚠⚠ and it says changed since, with the press');
      eq(await waits(), WAIT_READ, '⚠ and the work bar\'s sentence is back with it');
      await unwatchRenders();
      await press(READ_BTN(), '✓ I’ve read the list, a third time');
      eq((await readLine() || {}).ink, 'green', 'read again');
    });

    // ── M ─────────────────────────────────────────────────────────────────────────────────────
    await section('M. a second estate whose sheet cannot be reached: the reason in place of the press, then the press', async () => {
      failMedia = true;
      await pick(J2);
      const UN = 'sheet unreachable: this device’s copy';
      ok(await until(async () => String(await txt('#desk-stat-releases-' + J2)).indexOf(UN) === 0, 6000),
        'fixture: the read failed, and the bars say the sheet is unreachable  [' + await txt('#desk-stat-releases-' + J2) + ']');
      eq(await p.locator(READ_BTN(J2)).count(), 0, '⚠⚠ no press on a copy that has not read the sheet');
      const rl = await readLine(J2);
      eq(rl && rl.text, 'List not read yet · the sheet is unreachable: this is this device’s copy: the press waits for it',
        '⚠⚠ the work bar gives the bars\' reason in place of the press');
      failMedia = false;
      ok(await until(async () => String(await txt('#desk-stat-releases-' + J2)).indexOf(UN) < 0, 22000),
        'fixture: the connection back, the desk\'s own retry read the sheet within 20 s');
      await p.waitForTimeout(600);
      const rl2 = await readLine(J2);
      eq(rl2 && [rl2.text, rl2.press], ['List not read yet · ✓ I’ve read the list', '✓ I’ve read the list'],
        '⚠⚠ and the press is offered with no other press');
    });

    // ── N ─────────────────────────────────────────────────────────────────────────────────────
    await section('N. another device\'s edits from the sheet: the clocks never decide, what the papers print does', async () => {
      const local = () => p.evaluate((j) => JSON.parse(localStorage.getItem('hav_media_' + j) || '[]'), J);
      // The table's condition, recorded on another device whose clock is behind this one: older than the read, newer than
      // this device's copy of the line, so the merge takes it. (Timed against the press, the read stayed current.)
      const rdAt = (await readRec() || {}).at || 0;
      sheet[J] = { items: (await local()).map((r) => r.stableId !== 'table' ? r : Object.assign({}, r, { condition: 'Good: light wear on the top', updatedAt: (r.updatedAt || 0) + 1 })) };
      const tbl = sheet[J].items.find((r) => r.stableId === 'table') || {};
      ok(tbl.updatedAt < rdAt, 'fixture: the edit\'s own clock reading is earlier than the read (' + tbl.updatedAt + ' < ' + rdAt + ')');
      await pick(J2); await pick(J);
      eq((await line('table')).cond, 'Good: light wear on the top', 'fixture: the condition merged in from the sheet');
      const rl = await readLine();
      eq(rl && [rl.text, rl.ink, rl.press], ['List read by ' + ME + ', ' + day + ' · changed since · ✓ I’ve read the list', 'gray', '✓ I’ve read the list'],
        '⚠⚠ a change the papers print, arriving from another device, unreads the list whatever its clock says');
      const doc = await report();
      has(doc, 'IN PROGRESS — 5 items checked; 4 accepted as valued; the list not yet read since it last changed', '⚠ and the report says so  [stamp: ' + stampOf(doc) + ']');
      // Read again; then a room check that found nothing, run on a phone whose clock is three days fast: every line stamped
      // and moved days past the read. (Timed against the press, it unread the list.)
      await press(READ_BTN(), '✓ I’ve read the list, once more');
      eq((await readLine() || {}).ink, 'green', 'read again');
      sheet[J] = { items: (await local()).map((r) => Object.assign({}, r, { dupChkAt: Date.now(), updatedAt: Date.now() + 3 * 86400000 })) };
      eq(await p.locator('#inv-workbar button:has-text("Check 1 room")').count(), 1, 'fixture: before it, the work bar offers Check 1 room');
      await pick(J2); await pick(J);
      ok((await line('vase')).chk > 0, 'fixture: the room check from the other device merged in');
      eq(await p.locator('#inv-workbar button:has-text("Check 1 room")').count(), 0, 'fixture: …and the work bar no longer offers Check 1 room');
      const rl2 = await readLine();
      eq(rl2 && [rl2.text, rl2.ink, rl2.press], ['✓ List read by ' + ME + ', ' + day, 'green', ''],
        '⚠⚠ a room check that found nothing, on a clock running days fast, never unreads the list');
      const doc2 = await report();
      has(doc2, 'REVIEWED — read by ' + ME + ', ' + day + '; 5 items checked; 4 accepted as valued', '⚠ and the report is REVIEWED  [stamp: ' + stampOf(doc2) + ']');
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
