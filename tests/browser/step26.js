// Step 26 — the jobs refresh stands down while this device's own writes are still going out
// (2026-09-29, workflow audit finding H4).
//
// refreshJobsFromCloud REPLACED `jobs` with the sheet's list, and a write takes far longer than a
// read. Measured on this page against a backend answering writes in 4 s and reads in 0.8 s:
//   · Save Client, then Build estimate at once → the new client left this device (the list and the
//     local cache both went to 0), the rooms scored next were refused with "Job not found." and lost,
//     and the new client's Drive folder URL, landing a second later, found no job to write onto;
//   · Edit Client 3,000 → 5,200 sq ft, then Build estimate → priced on 3,000, and 3,000 put back on
//     the local record while the sheet held 5,200.
// Five callers reach it, two on a timer. The rule now is refreshPlanAndLogFromCloud's: the sheet is
// only authoritative once our own writes have landed in it.
//
// Drives the REAL page — the real + Add New Client and intake, the real band's Build estimate button,
// the real scope toggles and Save, the real Edit Client modal — against a stubbed Apps Script that
// answers with realistic latency. Writes commit at the END of their window, as a real execution
// commits before it answers; reads are served from the sheet as it stood when they arrived.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step26.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
const APP_PATH = APP.replace(/^file:\/\//, '');
let pass = 0, fail = 0;
let b = null;   // held outside the body so the catch can close it (see step25)
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');

// The deployment answers the version probe with the backend's own lists, so no out-of-date banner
// draws over the page. Read from the .gs beside the app under test, or the repo's.
const GS_PATH = [path.join(path.dirname(APP_PATH), 'apps-script', 'main-sync.gs'),
                 path.join(__dirname, '..', '..', 'apps-script', 'main-sync.gs')].find((f) => fs.existsSync(f));
const GS = fs.readFileSync(GS_PATH, 'utf8');
const listOf = (name) => JSON.parse(GS.match(new RegExp('var ' + name + ' = (\\[[\\s\\S]*?\\]);'))[1].replace(/'/g, '"'));
const VERSION = (GS.match(/var BACKEND_VERSION = '([^']+)'/) || [])[1];
const SYNC = 'https://script.google.com/macros/s/FAKE-STEP26/exec';
const WRITE_MS = 4000, READ_MS = 800, FOLDER_MS = 1500;

function backend() {
  const sheet = { jobs: [], estimates: {}, seen: {} };
  const trace = [];
  const t0 = Date.now();
  const at = () => Date.now() - t0;
  const clone = (x) => JSON.parse(JSON.stringify(x));
  function mergeJobs(arr) {
    (arr || []).forEach((j) => {
      if (!j || j.id == null) return;
      const i = sheet.jobs.findIndex((x) => String(x.id) === String(j.id));
      if (i < 0) sheet.jobs.push(clone(j));
      else if (Number(j.updatedAt || 0) >= Number(sheet.jobs[i].updatedAt || 0)) sheet.jobs[i] = clone(j);
      sheet.seen[j.id] = true;
    });
  }
  async function handle(route) {
    const req = route.request();
    const u = new globalThis.URL(req.url());
    const reply = (obj) => route.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }, body: JSON.stringify(obj) });
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    if (req.method() === 'GET') {
      const action = u.searchParams.get('action');
      if (action === 'loadJobs') {
        const snap = clone(sheet.jobs);
        const present = {}; snap.forEach((j) => { present[j.id] = true; });
        const deleted = Object.keys(sheet.seen).filter((k) => !present[k]);
        trace.push({ t: at(), ev: 'GET loadJobs' });
        await wait(READ_MS);
        return reply({ ok: true, success: true, jobs: snap, deletedJobs: deleted });
      }
      if (action === 'loadEstimates') { const snap = clone(sheet.estimates); await wait(READ_MS); return reply({ ok: true, success: true, estimates: snap }); }
      if (action === 'version') return reply({ ok: true, success: true, version: VERSION, actions: listOf('BACKEND_ACTIONS'), types: listOf('BACKEND_TYPES') });
      if (action === 'loadJobPlans') return reply({ ok: true, success: true, jobPlans: {} });
      if (action === 'loadLogs') return reply({ ok: true, success: true, logs: {} });
      if (action === 'loadChangeOrders') return reply({ ok: true, success: true, changeOrders: [] });
      if (action === 'loadContractors') return reply({ ok: true, success: true, contractors: { added: [], defaults: [] } });
      if (action === 'loadMedia') return reply({ ok: true, success: true, media: {} });
      return reply({ ok: false, error: 'Unknown action' });
    }
    let body = {}; try { body = JSON.parse(req.postData() || '{}'); } catch (e) {}
    if (body.action === 'createFolder') {
      await wait(FOLDER_MS);
      return reply({ ok: true, folderUrl: 'https://drive.google.com/drive/folders/FAKE-' + (body.hvlId || 'x'), subfolders: {} });
    }
    const type = body.type || body.action || '?';
    trace.push({ t: at(), ev: 'POST ' + type + ' sent' });
    await wait(WRITE_MS);
    if (type === 'saveAllJobs') mergeJobs(body.payload);
    if (type === 'job') mergeJobs([body.payload]);
    if (type === 'saveAllEstimates') Object.keys(body.payload || {}).forEach((k) => { sheet.estimates[k] = clone(body.payload[k]); });
    trace.push({ t: at(), ev: 'POST ' + type + ' committed' });
    return reply({ ok: true, success: true });
  }
  return { sheet, trace, handle };
}

(async () => {
  b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

  async function open(be, seedJobs) {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 950 } });
    await ctx.addInitScript(([url, seed]) => {
      if (sessionStorage.getItem('__seeded')) return;
      sessionStorage.setItem('__seeded', '1');
      localStorage.clear();
      localStorage.setItem('hav_sheets_url', url);
      if (seed) localStorage.setItem('havellin_jobs_v3', JSON.stringify(seed));
    }, [SYNC, seedJobs || null]);
    await ctx.route(SYNC + '**', be.handle);
    const p = await ctx.newPage();
    p.setDefaultTimeout(8000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    p.on('dialog', (d) => d.accept());
    await p.goto(APP); await p.waitForTimeout(2500);
    // Every jobs read from here on, and whether THIS DEVICE still owed the sheet a write when it went
    // out. The backend cannot tell: a write sits in the app's 250 ms outbox before it is on the wire.
    await p.evaluate(() => {
      const f = window.fetch; window.__jobsReads = [];
      window.fetch = function (u) {
        if (String(u).indexOf('action=loadJobs') >= 0) window.__jobsReads.push({ owed: _syncWritesOutstanding() });
        return f.apply(this, arguments);
      };
    });
    return { ctx, p, errs };
  }
  const future = (days) => { const d = new Date(); d.setDate(d.getDate() + days);
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10); };
  const errsAll = [];
  // Wait until this device owes the sheet nothing. A fixed sleep is a guess at how many 4 s writes
  // are queued; this is the answer.
  async function drain(p) {
    for (let i = 0; i < 90; i++) {
      await p.waitForTimeout(500);
      if (!(await p.evaluate(() => _syncWritesOutstanding()))) return true;
    }
    return false;
  }

  // ── A. Save Client, then Build estimate at once, score rooms, Save ─────────
  {
    const be = backend();
    const { ctx, p, errs } = await open(be);
    await p.click('#btn-add-client'); await p.waitForTimeout(300);
    await p.evaluate(([wt, st]) => {
      const set = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; if (e.onchange) e.onchange(); } };
      const pick = (id) => { const el = document.getElementById(id); if (!el) return; for (const o of el.options) if (o.value) { el.value = o.value; break; } };
      set('i-svc', 'downsizing'); toggleIntakeFields();
      set('i-fname', 'Maeve'); set('i-lname', 'Ellsworth'); set('i-phone', '(561) 555-0100'); set('i-email', 'me@example.com');
      set('i-addr', '12 Seaview Ave'); set('i-city', 'Palm Beach'); set('i-zip', '33480'); set('i-sqft', '3000');
      pick('i-ptype'); pick('i-src'); set('i-start', st); set('i-walkthrough', wt); set('i-home-value', '2400000');
    }, [future(10), future(20)]);
    await p.click('button[onclick^="saveIntake"]');
    const made = await p.evaluate(() => ({ n: jobs.length, id: (jobs[0] || {}).id }));
    eq1(made.n, 1, 'Save Client creates the client');

    // The band's own primary, pressed straight away — before either write has reached the sheet.
    const band = await p.evaluate(() => { const x = document.querySelector('#client-dashboard-view .jt-next .jt-btn-p'); return x ? x.textContent.trim() : ''; });
    eq1(band, 'Build estimate', 'the band offers Build estimate for a booked walkthrough');
    await p.click('#client-dashboard-view .jt-next .jt-btn-p');
    await p.waitForTimeout(2500);   // the estimates read lands; a jobs read would have landed by now too
    const mid = await p.evaluate((id) => ({
      n: jobs.length, has: jobs.some((j) => j.id === id),
      cached: JSON.parse(localStorage.getItem('havellin_jobs_v3') || '[]').map((j) => j.id),
      eJob: document.getElementById('e-job').value,
      screen: (document.getElementById('panel-estimate') || {}).classList && document.getElementById('panel-estimate').classList.contains('active'),
    }), made.id);
    ok(mid.has && mid.n === 1, '⚠⚠ the new client is still on this device while its saves are going out — it went to 0 here (' + mid.n + ')');
    ok(mid.cached.indexOf(made.id) >= 0, 'and in the local cache (' + JSON.stringify(mid.cached) + ')');
    eq1(mid.eJob, String(made.id), 'Build estimate is bound to the client');
    const owedReads = await p.evaluate(() => window.__jobsReads.filter((x) => x.owed).length);
    eq1(owedReads, 0, '⚠ no jobs read is sent while this device still owes the sheet a write');

    // Score three rooms with the real toggles, then the real Save.
    // Room sections open collapsed: open the first by its header, as a person would, then take the
    // first three toggles the page shows.
    if (await p.evaluate(() => (document.getElementById('sec-body-0') || {}).style.display === 'none')) await p.click('#room-sec-0 .sec-hdr');
    const toggles = [];
    for (const t of await p.$$('button.scope-toggle')) { if (toggles.length < 3 && await t.isVisible()) toggles.push(t); }
    eq1(toggles.length, 3, 'three room toggles are on screen');
    for (const t of toggles) await t.click();
    await p.evaluate(() => calcAll());
    await p.click('button[onclick="saveEstimateAndPreview()"]');
    await p.waitForTimeout(300);
    const saved = await p.evaluate((id) => ({
      rec: !!(estimateStore[id] && estimateStore[id].estimate),
      rooms: ((estimateStore[id] && estimateStore[id].estimate && estimateStore[id].estimate.rooms) || []).length,
      page: document.body.innerText,
    }), made.id);
    ok(saved.rec, '⚠⚠ Save saves — it was refused with "Job not found." and the walkthrough lost');
    eq1(saved.rooms, 3, 'with the three rooms scored');
    lacks(saved.page, 'Job not found', 'and nothing on screen says the job is missing');

    ok(await drain(p), 'every write lands (the queue drains)');
    const end = await p.evaluate((id) => ({ n: jobs.length, folder: ((jobs.find((j) => j.id === id) || {}).driveFolder) || '' }), made.id);
    ok(be.sheet.jobs.some((j) => j.id === made.id), 'the sheet has the client');
    ok(!!be.sheet.estimates[made.id], 'and its estimate');
    eq1(end.n, 1, 'the device still has exactly the one client');
    has(end.folder, 'FAKE-', '⚠ the Drive folder URL landed on the client — it found no job to write onto');
    errsAll.push(...errs);
    await ctx.close();
  }

  // ── B. Edit Client 3,000 → 5,200, then Build estimate ──────────────────────
  const JOB = { id: 1790000000001, hvlId: 'HVL-0007', fname: 'Tripp', lname: 'Butler', name: 'Tripp Butler', email: 'tb@example.com',
    phone: '(561) 555-0199', addr: '69 Beach Blvd', city: 'Palm Beach', zip: '33480', svc: 'downsizing', svcLabel: 'Home Editing',
    status: 'new', sqft: '3000', propVal: '2400000', ptype: 'Single Family', start: future(20), walkthrough: future(10),
    created: 'Sep 20, 2026', updatedAt: 1790000000001 };
  {
    const be = backend();
    be.sheet.jobs.push(JSON.parse(JSON.stringify(JOB))); be.sheet.seen[JOB.id] = true;
    const { ctx, p, errs } = await open(be, [JOB]);
    await p.evaluate((id) => openClientDashboard(id), JOB.id); await p.waitForTimeout(200);
    await p.evaluate((id) => showEditClient(id), JOB.id); await p.waitForTimeout(200);
    await p.fill('#ec-sqft', '5200');
    await p.click('#edit-client-modal button[onclick^="saveClientEdit"]');
    await p.waitForTimeout(100);
    await p.evaluate((id) => openEstimateScreen(id), JOB.id);
    await p.waitForTimeout(2500);
    const est = await p.evaluate((id) => {
      Array.from(document.querySelectorAll('button.scope-toggle')).slice(0, 6).forEach((t) => t.click());
      calcAll();
      return { local: (jobs.find((j) => j.id === id) || {}).sqft, eSqft: document.getElementById('e-sqft').value,
               priced: currentEstimate && currentEstimate.sqft,
               cached: (JSON.parse(localStorage.getItem('havellin_jobs_v3') || '[]').find((j) => j.id === id) || {}).sqft };
    }, JOB.id);
    eq1(String(est.local), '5200', '⚠⚠ the local record keeps 5,200 — the refresh put 3,000 back');
    eq1(String(est.priced), '5200', '⚠⚠ and the estimate is priced on 5,200 — it priced 3,000');
    eq1(String(est.cached), '5200', 'and the cache keeps 5,200');
    ok(await drain(p), 'the edit\'s writes land');
    eq1(String((be.sheet.jobs[0] || {}).sqft), '5200', 'and the sheet has 5,200');

    // ── C. And with nothing queued, the refresh still takes the sheet's copy ──
    // The other device edits the job; this one opens its estimate again through the real loader.
    be.sheet.jobs[0].sqft = '6100'; be.sheet.jobs[0].updatedAt = Date.now() + 60000;
    const readsBefore = be.trace.filter((x) => x.ev === 'GET loadJobs').length;
    await p.evaluate((id) => editEstimateForJob(id), JOB.id);
    await p.waitForTimeout(2500);
    const c = await p.evaluate((id) => ({ local: (jobs.find((j) => j.id === id) || {}).sqft,
      eSqft: document.getElementById('e-sqft').value }), JOB.id);
    // (twice, in fact: editEstimateForJob asks, and so does loadJobIntoEstimate on a fresh build)
    ok(be.trace.filter((x) => x.ev === 'GET loadJobs').length - readsBefore >= 1, 'with nothing outstanding the sheet IS asked');
    eq1(String(c.local), '6100', '⚠ and its newer copy is taken — the refresh still does its job');
    eq1(String(c.eSqft), '6100', 'and the estimate reads it');
    errsAll.push(...errs);
    await ctx.close();
  }

  // ── D. Overflow — the estimate screen and the dashboard, a client just created ─
  {
    const be = backend();
    be.sheet.jobs.push(JSON.parse(JSON.stringify(JOB))); be.sheet.seen[JOB.id] = true;
    const { ctx, p, errs } = await open(be, [JOB]);
    for (const w of [1440, 390]) {
      await p.setViewportSize({ width: w, height: 900 });
      await p.evaluate((id) => openClientDashboard(id), JOB.id); await p.waitForTimeout(300);
      const od = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      ok(od <= 0, 'the dashboard fits at ' + w + 'px (overflow ' + od + ')');
      await p.evaluate((id) => openEstimateScreen(id), JOB.id); await p.waitForTimeout(2000);
      const oe = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      ok(oe <= 0, 'the estimate screen fits at ' + w + 'px (overflow ' + oe + ')');
    }
    errsAll.push(...errs);
    await ctx.close();
  }

  ok(errsAll.length === 0, 'no page errors (' + errsAll.join(' | ') + ')');
  await b.close();
  console.log('\nstep26: ' + pass + ' passed, ' + fail + ' failed');
})().catch(async (e) => {
  console.log('THREW ' + (e && e.stack || e));
  console.log('step26: ' + pass + ' passed, ' + (fail + 1) + ' failed');
  try { if (b) await b.close(); } catch (_) { /* already gone */ }
});

function eq1(a, e, m) { ok(a === e, m + '  [expected ' + JSON.stringify(e) + ', got ' + JSON.stringify(a) + ']'); }
