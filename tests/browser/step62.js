// Step 62 — P20 · WC (2026-10-05; Anthony: "A, and yes to all the others"): a Probate service on a matter with no court
// (Q26), and the trust's date spelled out (Q27).
//
// Drives the REAL page through its own controls: + Add New Client typed into and saved with Save Client, the dashboard's
// ✎ Edit Client and the modal's own pickers, the band's Build estimate with the room checkboxes and Build Estimate's own
// service picker, the dashboard's View of the signing packet and the viewer's Print / Save PDF, and the Job Admin & Inv
// desk's More → Trust Schedule. What is seeded is state a person could not type in one sitting: a won client whose
// estimate a manager approved (the PIN and the Won modal leave exactly this), and an inventory on the desk. The jobs
// backend is answered by a route.
//
//   A. Client Intake, Probate on a Trust matter: the flag appears live under the matter question, follows the matter and
//      the service as they change, never on Contested Probate, and Save Client saves the service as picked (never refused)
//   B. Edit Client on that client: the flag on open and live as the service or the matter changes; Save Changes names it
//      in the dashboard's notice
//   C. Build Estimate: the flag beside the summary, under the total; switching the service to Estate Settlement through
//      the screen's own picker reprices it (both totals measured off the page) and the flag goes
//   D. the flag ignored and the estimate approved: the signing packet's agreement is titled Estate Settlement, Exhibit A
//      names Estate Settlement with no probate in its narrative, the price stays the Probate service's, and §1.2 names the
//      trust "dated March 3, 2015"; it prints, and fits a Letter page in print
//   E. Contested Probate on a trust: no suggestion anywhere, titled Contested Estate Settlement, the price its own
//   F. the Trust Schedule's header names the trust "dated March 3, 2015"; it fits a Letter page in print
//   G. overflow at 1440 and 390 with each flag on screen; no page errors
//
//   NODE_PATH=/opt/node22/lib/node_modules node tests/browser/step62.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');

const SYNC = 'https://script.google.com/macros/s/STEP62/exec';
const HOUSE = ['Living Room', 'Kitchen', 'Dining Room', 'Primary Suite', 'Bedroom 2'];
const HEAD_TRUST = 'No court on this matter: it is recorded as a trust administration. The Probate Estate Settlement service prices court work that will not happen.';
const HEAD_NEITHER = 'No court on this matter: it is recorded as a family distribution, with no trust. The Probate Estate Settlement service prices court work that will not happen.';
const SWITCH = 'Switch the service to Estate Settlement before the estimate is approved; it reprices the estimate.';

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
    await ctx.route(SYNC + '**', (route) => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ ok: true, fileUrl: 'https://drive.google.com/file/d/f62/view', fileId: 'f62' }) }));
    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    const dialogs = [];
    p.on('dialog', async (d) => { dialogs.push(d.message()); await d.accept(); });
    await p.goto(APP); await p.waitForTimeout(1800);
    const hook = () => p.evaluate((u) => {
      SHEETS_SYNC_URL = u; window.open = function () { return null; }; window.__prints = window.__prints || [];
      window.print = function () { const pt = document.getElementById('print-target');
        const d = document.createElement('div'); d.innerHTML = (pt ? pt.innerHTML : '').replace(/<\/(td|th|div|p|li|tr)>/g, ' </$1>').replace(/<br>/g, ' ');
        window.__prints.push({ html: pt ? pt.innerHTML : '', text: d.textContent.replace(/\s+/g, ' '),
          over: document.documentElement.scrollWidth - document.documentElement.clientWidth }); };
    }, SYNC);
    await hook();

    const section = async (name, body) => {
      console.log('\n## ' + name);
      await p.evaluate(() => document.querySelectorAll('.modal-overlay').forEach((m) => { if (getComputedStyle(m).display !== 'none') m.style.display = 'none'; })).catch(() => {});
      try { await body(); } catch (e) { fail++; console.log('  ✗ ' + name + ' threw: ' + String(e && e.message || e).split('\n')[0]); }
    };
    // checkVisibility, not offsetParent: Edit Client is position:fixed, whose offsetParent is always null.
    const shown = (sel) => p.evaluate((s) => { const e = document.querySelector(s); return !!(e && e.checkVisibility()); }, sel);
    const words = (sel) => p.evaluate((s) => { const el = document.querySelector(s); if (!el) return '';
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); const out = []; let n;
      while ((n = w.nextNode())) out.push(n.nodeValue);
      return out.join(' ').replace(/\s+/g, ' ').trim(); }, sel);
    const flagAt = async (sel) => ({ shown: await shown(sel + ' .alert'), text: await words(sel) });
    const press = async (sel, what) => {
      const n = await p.locator(sel).count();
      const v = n >= 1 && await p.locator(sel).first().isVisible().catch(() => false);
      ok(v, (what || sel) + ' — on screen (' + n + ')');
      if (v) { await p.locator(sel).first().click({ timeout: 5000 }).catch((e) => ok(false, (what || sel) + ' — ' + e.message.split('\n')[0])); await p.waitForTimeout(450); }
      return v;
    };
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const at390 = async (what) => {
      await p.setViewportSize({ width: 390, height: 900 }); await p.waitForTimeout(300);
      eq(await overflow(), 0, 'no horizontal overflow at 390 — ' + what);
      await p.setViewportSize({ width: 1440, height: 1000 }); await p.waitForTimeout(200);
      eq(await overflow(), 0, 'nor at 1440 — ' + what);
    };
    const job = (id) => p.evaluate((id) => JSON.parse(JSON.stringify(jobs.find((x) => x.id === id) || {})), id);
    const toDash = async (id) => { await p.evaluate((id) => goToClientDashboard(id), id); await p.waitForTimeout(500); };
    const date = async (sel, v) => { await p.fill(sel, v); await p.dispatchEvent(sel, 'change'); };
    // Money off the page: "$22,750" or "$28,437.50" → a number.
    const money = (t) => { const m = /\$([\d,]+(?:\.\d\d)?)/.exec(String(t)); return m ? parseFloat(m[1].replace(/,/g, '')) : NaN; };
    const total = async () => money(await words('#s-total'));
    const tickHouse = async () => {
      const ids = await p.evaluate((names) => {
        const out = []; const used = new Set(); let ri = 0;
        ROOMS.forEach((sec) => sec.rooms.forEach((r) => { const id = 'r' + ri; ri++;
          const i = names.findIndex((n, k) => n === r.name && !used.has(k)); if (i >= 0) { used.add(i); out.push(id); } }));
        return out;
      }, HOUSE);
      const closed = await p.evaluate(() => Array.from(document.querySelectorAll('[id^="sec-body-"]')).filter((el) => el.style.display === 'none').map((el) => el.id.replace('sec-body-', '')));
      for (const si of closed) await p.click(`.sec-hdr.sec-toggle[onclick="toggleRoomSection(${si})"]`).catch(() => {});
      for (const id of ids) await p.click('#chk-' + id).catch(() => ok(false, 'tick ' + id));
      await p.waitForTimeout(300);
      return ids;
    };
    // Text as a reader sees it: a cell boundary is a space.
    const T = (h) => p.evaluate((h) => { const d = document.createElement('div'); d.innerHTML = String(h).replace(/<\/(td|th|div|p|li|tr)>/g, ' </$1>').replace(/<br>/g, ' ');
      return d.textContent.replace(/\s+/g, ' '); }, h);
    const viewerHtml = () => p.evaluate(() => { const v = document.getElementById('doc-viewer-body'); return v ? v.innerHTML : ''; });
    const lastPrint = () => p.evaluate(() => (window.__prints || []).slice(-1)[0] || { html: '', text: '', over: 0 });
    const titleOf = (h) => ((/margin:\.6rem 0 \.25rem;">([^<]*)<\/div>/.exec(h) || [])[1] || 'NO TITLE');
    const serviceRow = (h) => ((/<div class="ce-meta-label">Service<\/div><div class="ce-meta-val">([^<]*)<\/div>/.exec(h) || [])[1] || 'NO SERVICE ROW');

    // Dates off the page's own clock: a target start two weeks of weekdays ahead.
    const today = await p.evaluate(() => _todayStr());
    const ymd = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const [ty, tm, td] = today.split('-').map(Number);
    const wd = (days) => { const d = new Date(ty, tm - 1, td + days); while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1); return ymd(d); };
    const START = wd(14);

    // ── A. Client Intake ──────────────────────────────────────────────────────────────────────────────────────────
    let ID_A = null;
    await section('A. Client Intake: Probate on a Trust matter is flagged live; Save Client saves it as picked', async () => {
      await p.click('#btn-add-client'); await p.waitForTimeout(400);
      const look = async (svc, mt) => { await p.selectOption('#i-svc', svc); if (mt !== undefined) await p.selectOption('#i-matter-type', mt); await p.waitForTimeout(150); return flagAt('#i-svc-flag'); };
      let f = await look('probate', 'trust');
      ok(f.shown, '⚠⚠ Probate with a Trust matter: the flag is on screen');
      eq(f.text, HEAD_TRUST + ' ' + SWITCH, 'it says there is no court, that Probate prices court work that will not happen, and to switch to Estate Settlement');
      const pos = await p.evaluate(() => { const fl = document.getElementById('i-svc-flag'), mt = document.getElementById('i-matter-type'), dt = document.getElementById('i-doc-tier');
        return !!(fl && mt && dt && (mt.compareDocumentPosition(fl) & Node.DOCUMENT_POSITION_FOLLOWING) && (fl.compareDocumentPosition(dt) & Node.DOCUMENT_POSITION_FOLLOWING)); });
      ok(pos, 'under the matter question, above the deliverable');
      f = await look('probate', 'neither');
      eq(f.text, HEAD_NEITHER + ' ' + SWITCH, 'the matter changed to Neither: the flag follows, live');
      f = await look('probate', 'both');
      eq([f.shown, f.text], [false, ''], 'to Both (a court is involved): gone');
      f = await look('probate', '');
      eq([f.shown, f.text], [false, ''], 'unanswered: nothing');
      f = await look('contested_probate', 'trust');
      eq([f.shown, f.text], [false, ''], '⚠⚠ Contested Probate on a trust: never flagged');
      f = await look('cleanout', 'trust');
      eq([f.shown, f.text], [false, ''], '⚠⚠ the service switched to Estate Settlement in the picker: gone');
      f = await look('probate', 'trust');
      ok(f.shown, 'and back to Probate: back');
      await at390('the intake form with the flag on screen');
      // Typed as on the call, the flag ignored: Save Client is never refused for it.
      await p.fill('#i-fname', 'Margaret'); await p.fill('#i-lname', 'Adler');
      await p.fill('#i-addr', '62 Beach Blvd'); await p.fill('#i-city', 'Palm Beach'); await p.fill('#i-zip', '33480');
      await p.fill('#i-sqft', '3200'); await p.selectOption('#i-ptype', 'Estate'); await p.selectOption('#i-src', 'Family');
      await date('#i-start', START);
      await date('#i-date-of-death', '2026-04-02'); await p.selectOption('#i-gate-706', 'no');
      await p.fill('#i-executor-fname', 'Ruth'); await p.fill('#i-executor-lname', 'Adler');
      await p.selectOption('#i-executor-role', 'Trustee');
      await p.fill('#i-executor-phone', '5615550101'); await p.fill('#i-executor-email', 'ruth@adler.example');
      await p.fill('#i-trust-name', 'Adler Family Trust'); await date('#i-trust-date', '2015-03-03');
      await p.fill('#i-probate-case', '2026-CP-006200');
      await p.fill('#i-probate-atty-fname', 'Ann'); await p.fill('#i-probate-atty-lname', 'Lowe'); await p.fill('#i-probate-atty-firm', 'Lowe & Co');
      await p.fill('#i-probate-atty-phone', '5615550102'); await p.fill('#i-probate-atty-email', 'ann@lowe.law');
      await p.fill('#i-home-value', '2500000').catch(() => {});
      ok((await flagAt('#i-svc-flag')).shown, 'fixture: the flag is on screen when Save Client is pressed');
      await p.click('button[onclick="saveIntake()"]'); await p.waitForTimeout(900);
      ID_A = await p.evaluate(() => (jobs[0] || {}).id);
      const j = await job(ID_A);
      eq([j.fname, j.lname], ['Margaret', 'Adler'], 'fixture: the client was created through the real Save Client');
      eq([j.svc, j.matterType], ['probate', 'trust'], '⚠⚠ saved as picked: a flag, never a refusal, and nothing re-types the service');
    });

    // ── B. Edit Client ────────────────────────────────────────────────────────────────────────────────────────────
    await section('B. Edit Client: the flag on open and live; Save Changes names it in the notice', async () => {
      await toDash(ID_A);
      await press('#client-dashboard-view button[onclick="dashEditClient(' + ID_A + ')"]', '✎ Edit Client');
      let f = await flagAt('#ec-svc-flag');
      ok(f.shown, '⚠⚠ open on a Probate service with a Trust matter: flagged');
      eq(f.text, HEAD_TRUST + ' ' + SWITCH, 'in the same words');
      const look = async (sel, v) => { await p.selectOption(sel, v); await p.waitForTimeout(150); return flagAt('#ec-svc-flag'); };
      f = await look('#ec-matter-type', 'both');
      eq([f.shown, f.text], [false, ''], 'the matter changed to Both: gone, live');
      f = await look('#ec-matter-type', 'neither');
      eq(f.text, HEAD_NEITHER + ' ' + SWITCH, 'to Neither: back, naming it');
      f = await look('#ec-matter-type', 'trust');
      f = await look('#ec-svc', 'cleanout');
      eq([f.shown, f.text], [false, ''], '⚠⚠ the service picker switched to Estate Settlement: gone, live');
      f = await look('#ec-svc', 'contested_probate');
      eq([f.shown, f.text], [false, ''], 'to Contested Probate: never flagged');
      f = await look('#ec-svc', 'probate');
      ok(f.shown, 'back to Probate: back');
      await at390('Edit Client with the flag on screen');
      await press('#edit-client-modal button[onclick="saveClientEdit(' + ID_A + ')"]', 'Save Changes');
      const view = await words('#client-dashboard-view');
      has(view, HEAD_TRUST + ' ' + SWITCH, '⚠⚠ the dashboard\'s notice names the flag after the save');
      eq((await job(ID_A)).svc, 'probate', 'saved as it stood: nothing re-typed');
    });

    // ── C. Build Estimate ─────────────────────────────────────────────────────────────────────────────────────────
    let PROBATE_TOTAL = NaN, ESTATE_TOTAL = NaN;
    await section('C. Build Estimate: the flag beside the summary; Estate Settlement through the picker reprices it', async () => {
      await toDash(ID_A);
      await press('#client-dashboard-view .jt-next button[onclick="dashGoEstimate(' + ID_A + ')"]', 'the band\'s Build estimate');
      await p.waitForTimeout(600);
      await tickHouse();
      PROBATE_TOTAL = await total();
      ok(PROBATE_TOTAL > 0, 'fixture: the real engine priced the house as Probate ($' + PROBATE_TOTAL + ')');
      eq(await p.inputValue('#e-svc'), 'probate', 'the screen prices the Probate service');
      ok(await p.isChecked('#e-fixed'), 'an estate opens on a fixed price (Q10), so the total is the suggested fixed fee');
      const f = await flagAt('#e-svc-flag');
      ok(f.shown, '⚠⚠ flagged beside the summary');
      eq(f.text, HEAD_TRUST + ' ' + SWITCH, 'in the same words');
      const inSummary = await p.evaluate(() => { const fl = document.getElementById('e-svc-flag'), tot = document.getElementById('s-total'), col = document.getElementById('est-summary-col');
        return !!(fl && tot && col && col.contains(fl) && (tot.compareDocumentPosition(fl) & Node.DOCUMENT_POSITION_FOLLOWING)); });
      ok(inSummary, 'inside the Estimate Summary, under the total');
      await at390('Build Estimate with the flag on screen');
      // The person takes the suggestion: Build Estimate's own service picker, asked first (accepted).
      const before = dialogs.length;
      await p.selectOption('#e-svc', 'cleanout'); await p.waitForTimeout(700);
      ok(dialogs.length > before && /Estate Settlement/.test(dialogs.slice(-1)[0] || ''), 'the picker asks first, naming Estate Settlement');
      ESTATE_TOTAL = await total();
      ok(ESTATE_TOTAL > 0 && ESTATE_TOTAL < PROBATE_TOTAL, '⚠⚠ repriced: $' + PROBATE_TOTAL + ' as Probate → $' + ESTATE_TOTAL + ' as Estate Settlement');
      console.log('  measured: Probate $' + PROBATE_TOTAL + ', Estate Settlement $' + ESTATE_TOTAL);
      const g = await flagAt('#e-svc-flag');
      eq([g.shown, g.text], [false, ''], 'and the flag is gone');
      eq((await job(ID_A)).svc, 'cleanout', 'the job is Estate Settlement now: the person\'s choice, through the picker');
    });

    // ── D. the flag ignored, the estimate approved ────────────────────────────────────────────────────────────────
    const BASE = (id, extra) => Object.assign({ id, hvlId: 'HVL-2610-' + id, name: 'Margaret Adler', fname: 'Margaret', lname: 'Adler', svc: 'probate',
      sqft: '3200', addr: id + ' Ocean Blvd', city: 'Palm Beach', zip: '33480', propVal: '2500000', deathDate: '2026-04-02', docTier: 'values', gate706: 'no',
      matterType: 'trust', executor: 'Ruth Adler', executorRole: 'Trustee', executorEmail: 'ruth@adler.example', executorPhone: '(561) 555-0101', executorAuth: 'pending',
      probateAttyName: 'Ann Lowe', probateAttyFirm: 'Lowe & Co', probateAttyPhone: '(561) 555-0102', probateAttyEmail: 'ann@lowe.law', probateCase: '2026-CP-006200',
      trustName: 'Adler Family Trust', trustDate: '2015-03-03', start: START, walkthrough: today, created: today, status: 'new', tc: 'Ashley Jerome', payments: [] }, extra || {});
    const priced = async (id, extra) => {
      await p.evaluate((j) => { jobs = jobs.filter((x) => x.id !== j.id); jobs.unshift(j); delete estimateStore[j.id]; saveJobs(); }, BASE(id, extra));
      await toDash(id);
      await press('#client-dashboard-view .jt-next button[onclick="dashGoEstimate(' + id + ')"]', 'the band\'s Build estimate (' + id + ')');
      await p.waitForTimeout(600);
      await tickHouse();
      const e = await p.evaluate(() => JSON.parse(JSON.stringify(currentEstimate || {})));
      return { e, total: await total(), flag: await flagAt('#e-svc-flag') };
    };
    const approve = async (id, e) => {
      await p.evaluate(([id, e]) => {
        const j = jobs.find((x) => x.id === id);
        Object.assign(j, { status: 'won', won: true, wonAt: _todayStr(), wonBy: 'Anthony Graziano', wonMethod: 'call', approved: true, estimateSentDate: 'October 5, 2026' });
        estimateStore[id] = { estimate: Object.assign({}, e, { jobId: id }), approved: true, submitted: true, approvedBy: 'Anthony Graziano', savedAt: Date.now() };
        saveJobs();
      }, [id, e]);
      await toDash(id);
    };
    const openPacket = async (id) => {
      const sel = '#client-dashboard-view button[onclick="docAction(' + id + ',\'agreement\',\'view\')"]';
      if (!(await p.locator(sel).count())) { ok(false, 'View the signing packet is offered on the dashboard (' + id + ')'); return ''; }
      await p.locator(sel).first().click(); await p.waitForTimeout(600);
      return viewerHtml();
    };
    const ID_D = 6201;
    await section('D. the flag ignored and the estimate approved: no "Probate" in the title or the narrative; the price stays Probate\'s', async () => {
      const r = await priced(ID_D);
      eq(r.total, PROBATE_TOTAL, '⚠ the same house prices exactly as the Probate service did in C ($' + r.total + ')');
      ok(r.flag.shown, 'fixture: flagged before approval, and the flag ignored');
      await approve(ID_D, r.e);
      const h = await openPacket(ID_D);
      ok(h.length > 20000, 'fixture: the signing packet is open in the viewer (' + h.length + ')');
      const agrH = h.slice(0, Math.max(0, h.indexOf('packet-exhibit')));
      const exH = h.slice(Math.max(0, h.indexOf('packet-exhibit')));
      ok(agrH.length > 20000 && exH.length > 5000, 'fixture: the agreement and Exhibit A (' + agrH.length + ', ' + exH.length + ')');
      eq(titleOf(agrH), 'Estate Settlement', '⚠⚠ the agreement is titled Estate Settlement');
      const at = await T(agrH);
      has(at, 'This Agreement governs Estate Settlement services provided by Havellin Palm Beach, LLC', 'its header sentence too');
      lacks(h, 'Probate Estate', '⚠⚠ "Probate Estate" nowhere in the packet');
      eq(serviceRow(exH), 'Estate Settlement', '⚠⚠ Exhibit A names the service Estate Settlement');
      const et = await T(exH);
      has(et, 'Onsite Estate Settlement Services', 'and its fee table');
      has(et, 'under full documentation standards', 'the narrative, without probate');
      lacks(et.toLowerCase(), 'probate', '⚠⚠ Exhibit A prints no "probate" at all');
      lacks(et, 'the court and counsel', 'nor a court');
      has(et, '$' + PROBATE_TOTAL.toLocaleString('en-US'), '⚠⚠ the price stays the Probate service\'s ($' + PROBATE_TOTAL + ')');
      lacks(et, '$' + ESTATE_TOTAL.toLocaleString('en-US'), 'never Estate Settlement\'s ($' + ESTATE_TOTAL + ')');
      has(at, 'Trust The Adler Family Trust, dated March 3, 2015', '⚠⚠ §1.2 names the trust with the month spelled out (Q27)');
      lacks(h, 'Mar 3, 2015', 'never "Mar 3"');
      // Print it, and under print media at Letter width.
      const before = await p.evaluate(() => (window.__prints || []).length);
      await press('#doc-viewer-print', 'Print / Save PDF on the viewer');
      for (let i = 0; i < 20 && (await p.evaluate(() => (window.__prints || []).length)) === before; i++) await p.waitForTimeout(150);
      const pr = await lastPrint();
      eq(titleOf(pr.html), 'Estate Settlement', 'the printed packet is titled Estate Settlement');
      await p.waitForTimeout(800); await hook();
      await p.setViewportSize({ width: 816, height: 1056 });
      await p.emulateMedia({ media: 'print' });
      await p.evaluate((id) => docAction(id, 'agreement', 'print'), ID_D);
      for (let i = 0; i < 20 && (await p.evaluate(() => (window.__prints || []).length)) < before + 2; i++) await p.waitForTimeout(150);
      const pp = await lastPrint();
      ok(pp.html.length > 20000 && pp.over <= 0, '⚠ the packet fits a Letter page in print (' + pp.over + ')');
      await p.emulateMedia({ media: 'screen' });
      await p.setViewportSize({ width: 1440, height: 1000 });
      await p.waitForTimeout(800); await hook();
      await p.evaluate(() => closeDocViewer());
      // The approved estimate on Build Estimate (its open door is the dashboard's; the handler opens it): no suggestion.
      await p.evaluate((id) => openEstimateScreen(id), ID_D); await p.waitForTimeout(800);
      const f = await flagAt('#e-svc-flag');
      eq([f.shown, f.text], [false, ''], '⚠⚠ approved: Build Estimate makes no suggestion');
    });

    // ── E. Contested Probate on a trust ───────────────────────────────────────────────────────────────────────────
    const ID_E = 6202;
    await section('E. Contested Probate on a trust: no suggestion, titled Contested Estate Settlement, the price its own', async () => {
      const r = await priced(ID_E, { svc: 'contested_probate' });
      ok(r.total > PROBATE_TOTAL, 'fixture: priced as Contested Probate, above Probate ($' + r.total + ')');
      console.log('  measured: Contested Probate $' + r.total);
      eq([r.flag.shown, r.flag.text], [false, ''], '⚠⚠ no flag and no suggestion on Build Estimate');
      await approve(ID_E, r.e);
      const h = await openPacket(ID_E);
      const agrH = h.slice(0, Math.max(0, h.indexOf('packet-exhibit')));
      const exH = h.slice(Math.max(0, h.indexOf('packet-exhibit')));
      eq(titleOf(agrH), 'Contested Estate Settlement', '⚠⚠ the agreement is titled Contested Estate Settlement');
      eq(serviceRow(exH), 'Contested Estate Settlement', '⚠⚠ Exhibit A names it so');
      lacks(h, 'Probate Estate', 'no "Probate Estate" in the packet');
      const et = await T(exH);
      lacks(et.toLowerCase(), 'probate', 'Exhibit A prints no "probate"');
      has(et, '$' + r.total.toLocaleString('en-US'), '⚠⚠ the price unchanged: Contested Probate\'s own ($' + r.total + ')');
      await p.evaluate(() => closeDocViewer());
    });

    // ── F. the Trust Schedule ─────────────────────────────────────────────────────────────────────────────────────
    await section('F. More → Trust Schedule names the trust "dated March 3, 2015"; it fits a Letter page', async () => {
      await p.evaluate((id) => {
        _photoRefs[id] = [
          { stableId: 'a1', label: 'inventory', collId: null, roomIdx: 1, seq: 1, status: 'uploaded', category: 'Furniture', objectName: 'Chesterfield sofa', condition: 'Good', qty: '1', fmv: '4000', valSource: 'Comparable', assetTrack: 'Trust', reviewed: true, ts: 1, updatedAt: 1 },
          { stableId: 'a2', label: 'inventory', collId: null, roomIdx: 1, seq: 2, status: 'uploaded', category: 'Furniture', objectName: 'Dining suite', condition: 'Good', qty: '1', fmv: '9000', valSource: 'Comparable', assetTrack: 'Trust', reviewed: true, ts: 2, updatedAt: 2 }];
        try { savePhotoRefs(id); } catch (e) {}
        const j = jobs.find((x) => x.id === id); j.status = 'active'; j.activatedOn = _todayStr(); saveJobs();
      }, ID_D);
      await p.evaluate((id) => { setCurrentJob(id); populateInventorySelect(); }, ID_D);
      await p.click('.nb[onclick*="\'inventory\'"]'); await p.waitForTimeout(700);
      const sel = await p.evaluate(() => (document.getElementById('inv-job') || {}).value);
      if (String(sel) !== String(ID_D)) { await p.selectOption('#inv-job', String(ID_D)); await p.waitForTimeout(700); }
      await press('#inv-workbar details > summary', 'More');
      const before = await p.evaluate(() => (window.__prints || []).length);
      await press('#inv-workbar button[onclick="printTrustSchedule(' + ID_D + ')"]', 'Trust Schedule');
      for (let i = 0; i < 20 && (await p.evaluate(() => (window.__prints || []).length)) === before; i++) await p.waitForTimeout(150);
      const pr = await lastPrint();
      ok(pr.html.indexOf('Schedule of Tangible Personal Property Held in Trust') >= 0, 'fixture: the Trust Schedule printed');
      has(pr.text, 'The Adler Family Trust, dated March 3, 2015', '⚠⚠ the header names the trust with the month spelled out (Q27)');
      lacks(pr.text, 'Mar 3, 2015', 'never "Mar 3"');
      await p.waitForTimeout(800); await hook();
      await p.setViewportSize({ width: 816, height: 1056 });
      await p.emulateMedia({ media: 'print' });
      const b2 = await p.evaluate(() => (window.__prints || []).length);
      await p.evaluate((id) => printTrustSchedule(id), ID_D);
      for (let i = 0; i < 20 && (await p.evaluate(() => (window.__prints || []).length)) === b2; i++) await p.waitForTimeout(150);
      const pp = await lastPrint();
      ok(pp.html.indexOf('dated March 3, 2015') >= 0 && pp.over <= 0, '⚠ it fits a Letter page in print (' + pp.over + ')');
      await p.emulateMedia({ media: 'screen' });
      await p.setViewportSize({ width: 1440, height: 1000 });
      await p.waitForTimeout(800); await hook();
    });

    // ── G. errors ─────────────────────────────────────────────────────────────────────────────────────────────────
    await section('G. the dashboard fits, and no page errors', async () => {
      await toDash(ID_D);
      await at390('the approved client\'s dashboard');
      eq(errs, [], 'no page errors');
    });

    console.log('\n' + pass + ' passed, ' + fail + ' failed');
    await b.close();
    process.exit(fail ? 1 : 0);
  } catch (e) {
    console.log('✗ threw: ' + (e && e.stack || e));
    console.log('\n' + pass + ' passed, ' + (fail + 1) + ' failed');
    if (b) await b.close().catch(() => {});
    process.exit(1);
  }
})();
