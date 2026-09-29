// Step 31 — a Job Plan edit made on one device survives the other device's next save (2026-09-29,
// workflow audit finding C2). Written as step 26 and renumbered on each merge as the concurrent sessions
// landed theirs first: H4 took 26, C1 27, H3/M8 28, the document-claims build 29 and H1/M1 30.
//
// The defect: the Job Plan's sourcing and crew writers changed the job and called saveJobs() alone,
// and saveJobs() fills `updatedAt` only when it is MISSING. So the edit left the job at the stamp it had
// that morning — and saveAllJobs posts EVERY job, and the sheet's _mergeJobRecord keeps the incoming copy
// on a tie (`incT >= curT`). The next save from a second device still holding the morning copy — an
// edit to a DIFFERENT client is enough — won the tie and wrote the morning back over the edit: a
// confirmed $23,400 painter, an $850 dumpster and a confirmed job team, gone, with nothing on either
// screen saying so. The final invoice then billed the prep fee on the $20,000 estimate figure and
// dropped the dumpster.
//
// This drives it with TWO BROWSERS — two separate contexts, so two separate localStorages, which is
// what two devices are — against one fake Apps Script whose Jobs tab runs the REAL saveAllJobsToSheet /
// saveJobToSheet / _mergeJobRecord out of apps-script/main-sync.gs. Device A is the iPad in the house:
// the real Job Plan, the real sourcing selects and quote boxes, the real "+ Add an end-of-job vendor…"
// menu, the real team selects and the real Confirm job team button, the real hours form. Device B is the
// laptop at the desk that loaded the jobs before A started and never reloaded: it edits a different
// client through the real Edit Client modal and presses the real Save. Then the sheet is read, and a
// fresh reload of each device is read, and the bill is computed off what came back.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step31.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), vm = require('vm');
const { matchBrace } = require(path.join(__dirname, '..', 'harness'));
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(a === e, m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');

// ── THE SHEET: the REAL merge out of main-sync.gs, over an in-memory Jobs tab ─────────────────────
const GS = fs.readFileSync(path.join(__dirname, '..', '..', 'apps-script', 'main-sync.gs'), 'utf8');
function gsFn(name) {
  const re = new RegExp('(^|\\n)function\\s+' + name + '\\s*\\(', 'g');
  const m = re.exec(GS); if (!m) throw new Error('not in .gs: ' + name);
  const start = m.index + (m[1] ? m[1].length : 0), open = GS.indexOf('{', re.lastIndex);
  return GS.slice(start, matchBrace(GS, open) + 1);
}
function gsVar(name) {
  const m = GS.match(new RegExp('(^|\\n)(var\\s+' + name + '\\s*=[\\s\\S]*?;)\\n')); if (!m) throw new Error('not in .gs: var ' + name);
  return m[2];
}
function fakeSheet(name, header) {
  const rows = header ? [header.slice()] : [];
  return {
    getName: () => name,
    getLastRow: () => rows.length,
    getLastColumn: () => rows.reduce((m, r) => Math.max(m, r.length), 0),
    appendRow(r) { rows.push(r.slice()); },
    getDataRange() { return { getValues: () => rows.map((r) => r.slice()) }; },
    getRange(r, c, nr, nc) {
      return {
        getValues() { const out = []; for (let i = 0; i < nr; i++) { const row = rows[r - 1 + i] || [], cells = [];
          for (let j = 0; j < nc; j++) cells.push(row[c - 1 + j] === undefined ? '' : row[c - 1 + j]); out.push(cells); } return out; },
        setValues(v) { v.forEach((cells, i) => { while (rows.length < r + i) rows.push([]); const row = rows[r - 1 + i];
          cells.forEach((cell, j) => { row[c - 1 + j] = cell; }); }); },
        clearContent() { for (let i = 0; i < nr; i++) { const row = rows[r - 1 + i]; if (!row) continue;
          for (let j = 0; j < nc; j++) row[c - 1 + j] = ''; }
          while (rows.length > 1 && rows[rows.length - 1].every((x) => x === '' || x === undefined)) rows.pop(); },
      };
    },
  };
}
const S = {
  console, Logger: { log() {} }, Date,
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  // The deleted-job ledger has its own suite; it is not what this step is about.
  _jobRefusal: () => null, _presentJobIds: () => ({}), getJobLedger: () => ({ seen: {}, since: 0 }), _ledgerMarkSeen: () => {},
};
const SHEETS = { Jobs: fakeSheet('Jobs', ['ID', 'HVL ID', 'Name', 'Email', 'Phone', 'Address', 'City', 'Zip', 'Service', 'Status', 'Created', 'Data JSON']) };
S.SpreadsheetApp = { openById: () => ({ getSheetByName: (n) => SHEETS[n] || null, insertSheet(n) { SHEETS[n] = fakeSheet(n); return SHEETS[n]; } }) };
vm.createContext(S);
vm.runInContext([gsVar('SHEET_ID'), gsVar('JOB_KEYED_LISTS'), gsVar('JOB_KEYED_MAPS'), gsVar('JOB_LIST_KEY'),
  gsVar('BACKEND_VERSION'), gsVar('BACKEND_ACTIONS'), gsVar('BACKEND_TYPES'),
  ...['getJobsFromSheet', 'saveAllJobsToSheet', 'saveJobToSheet', '_jobStamp', '_jobListKey', '_mergeJobKeyed', '_mergeJobRecord'].map(gsFn)
].join('\n\n'), S, { filename: 'main-sync.gs (extracted)' });
const sheetJob = (id) => S.getJobsFromSheet().find((j) => j.id === id) || null;
// The other stores are whole blobs the app reads back; nothing here is about how they merge.
const STORES = { estimates: {}, jobPlans: {}, logs: {}, changeOrders: [] };
const POSTS = [];   // { who, type, t } — every write either device sent, in the order it arrived

async function wire(ctx, who) {
  await ctx.route('**/exec*', async (route) => {
    const req = route.request(), url = new URL(req.url()), action = url.searchParams.get('action');
    const json = (o) => route.fulfill({ status: 200, contentType: 'application/json',
      headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(o) });
    if (req.method() === 'POST') {
      let body = {}; try { body = JSON.parse(req.postData() || '{}'); } catch (e) {}
      POSTS.push({ who, type: body.type || body.action || '?', t: Date.now() });
      if (body.type === 'saveAllJobs') { S.saveAllJobsToSheet(body.payload); return json({ ok: true }); }
      if (body.type === 'job') { S.saveJobToSheet(body.payload); return json({ ok: true }); }
      if (body.type === 'saveAllEstimates') { Object.assign(STORES.estimates, body.payload || {}); return json({ ok: true }); }
      if (body.type === 'saveAllJobPlans') { Object.assign(STORES.jobPlans, body.payload || {}); return json({ ok: true }); }
      if (body.type === 'saveAllLogs') { Object.assign(STORES.logs, body.payload || {}); return json({ ok: true }); }
      return json({ ok: true });
    }
    switch (action) {
      case 'loadJobs': return json({ jobs: S.getJobsFromSheet(), deletedJobs: [] });
      case 'loadEstimates': return json({ ok: true, estimates: STORES.estimates });
      case 'loadJobPlans': return json({ ok: true, jobPlans: STORES.jobPlans });
      case 'loadLogs': return json({ ok: true, logs: STORES.logs });
      case 'loadChangeOrders': return json({ ok: true, changeOrders: STORES.changeOrders });
      case 'loadContractors': return json({ ok: true, contractors: { added: [], defaults: [] } });
      case 'loadMedia': return json({ ok: true, media: {} });
      case 'version': return json({ ok: true, version: S.BACKEND_VERSION, actions: S.BACKEND_ACTIONS, types: S.BACKEND_TYPES });
      default: return json({ ok: false, error: 'not in this test: ' + action });
    }
  });
}

// The directory the pickers read. `_row` is the id a job's sourcing record stores.
const VENDORS = [
  { _row: 11, vendor_name: 'Ace Painting', category: 'Painting', category_group: 'Property Preparation', phone: '5615550101', status: 'Active' },
  { _row: 12, vendor_name: 'Bin There Dumpsters', category: 'Junk Removal & Dumpster', category_group: 'Disposal & Removal', phone: '5615550102', status: 'Active' },
  { _row: 13, vendor_name: 'Two Men Movers', category: 'Moving Company', category_group: 'Moving & Logistics', phone: '5615550103', status: 'Active' },
];

(async () => {
  b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  async function device(who) {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
    await wire(ctx, who);
    await ctx.addInitScript((v) => {
      localStorage.setItem('hav_sheets_url', 'https://script.google.com/macros/s/FAKE/exec');
      localStorage.setItem('hav_vendor_dir', JSON.stringify(v));
    }, VENDORS);
    const p = await ctx.newPage();
    p.setDefaultTimeout(8000);
    p.errs = []; p.on('pageerror', (e) => p.errs.push(String(e)));
    p.on('dialog', async (d) => { await d.accept(); });
    return { ctx, p };
  }
  // A write goes out through the outbox 250ms after the action and then one at a time; wait until
  // nothing is queued, nothing is in flight and nothing is held for retry.
  const settle = async (p) => {
    for (let i = 0; i < 60; i++) {
      await p.waitForTimeout(150);
      const idle = await p.evaluate(() => !_outboxSending && !_flushing && !_outboxTimer &&
        !Object.keys(_outbox).length && !Object.keys(_pendingWrites).length);
      if (idle) return true;
    }
    return false;
  };
  const jobPosts = (who, since) => POSTS.filter((x) => x.who === who && x.t >= since && (x.type === 'saveAllJobs' || x.type === 'job'));

  // ── SET-UP: two clients through the real intake, one priced through the real Build Estimate ─────────
  console.log('\n## Set-up — the morning: two clients on the sheet, one won, signed and funded');
  const A = await device('A');
  await A.p.goto(APP); await A.p.waitForTimeout(1500);
  const future = (() => { const d = new Date(); d.setDate(d.getDate() + 30);
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); })();
  async function make(last) {
    await A.p.evaluate(() => { const x = document.getElementById('btn-add-client'); if (x) x.click(); }); await A.p.waitForTimeout(300);
    const id = await A.p.evaluate(([wt, last]) => {
      const set = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; if (e.onchange) e.onchange(); } };
      const pick = (id) => { const e = document.getElementById(id); const o = e && Array.from(e.options).find((x) => x.value); if (o) { e.value = o.value; if (e.onchange) e.onchange(); } };
      set('i-svc', 'downsizing'); toggleIntakeFields();
      set('i-fname', 'Pat'); set('i-lname', last); set('i-addr', '1 A St'); set('i-city', 'Palm Beach'); set('i-zip', '33480');
      set('i-sqft', '3500'); set('i-phone', '(561) 555-0199'); set('i-email', 'c@example.com'); set('i-home-value', '4200000');
      pick('i-ptype'); pick('i-src'); set('i-walkthrough', wt);
      const st = new Date(wt); st.setDate(st.getDate() + 7); while (st.getDay() === 0 || st.getDay() === 6) st.setDate(st.getDate() + 1);
      set('i-start', st.toISOString().slice(0, 10)); saveIntake(); return (jobs[0] || {}).id;
    }, [future, last]);
    await A.p.waitForTimeout(1200); return id;
  }
  const id = await make('Butler');
  const other = await make('Ellsworth');
  ok(!!id && !!other && id !== other, 'two clients created through the real intake');
  await A.p.evaluate((id) => dashGoEstimate(id), id); await A.p.waitForTimeout(700);
  const est = await A.p.evaluate((id) => {
    const js = document.getElementById('e-job'); js.value = String(id); if (js.onchange) js.onchange();
    for (let i = 0; i < 6; i++) setRoomState('r' + i, 'in');
    prepItems.length = 0; prepItems.push({ type: 'Painting', cost: 20000, lid: _srcLid() }); renderPrepItems();
    vendors.length = 0; vendors.push({ type: 'Moving Company', cost: 12000, lid: _srcLid() });
    calcAll();
    const e = JSON.parse(JSON.stringify(currentEstimate));
    estimateStore[id] = { approved: true, approvedBy: 'Anthony Graziano', estimate: e, savedAt: Date.now() };
    const job = jobs.find((j) => j.id === id);
    job.tc = 'Ashley Jerome'; job.won = true; job.status = 'won'; job.approved = true;
    job.agrApproved = true; job.agrSent = true; job.agrSigned = true;
    job.payments = [{ id: 1, uid: 'dep' + id, stage: 'deposit', amount: depositTargetFor(job), method: 'wire',
                      date: _todayStr(), clearedOn: _todayStr() }];
    job.updatedAt = Date.now(); saveJobs();
    return e;
  }, id);
  ok(est && est.prepItems && est.prepItems.length === 1 && est.vendors.length === 1, 'the estimate carries a $20,000 painter line and a mover line');
  await settle(A.p);
  STORES.estimates[id] = await A.p.evaluate((id) => estimateStore[id], id);
  const morning = sheetJob(id);
  ok(!!morning && morning.won === true && !!morning.updatedAt, 'the sheet holds the morning job');
  const MORNING = morning ? morning.updatedAt : 0;

  // ── THE MORNING: BOTH DEVICES LOAD THE SHEET. B IS NEVER RELOADED AFTER THIS ─────────────────────
  // A is reloaded too: the set-up above ran the real Build Estimate, whose own cloud refresh can land
  // after the set-up writes and hand this page an older list. A device that has just opened the app
  // holds exactly what the sheet holds, which is the state both devices start the day in.
  await A.p.reload(); await A.p.waitForTimeout(2200);
  eq(await A.p.evaluate((id) => (jobs.find((j) => j.id === id) || {}).updatedAt, id), MORNING, 'device A (the house) holds the morning copy');
  const B = await device('B');
  await B.p.goto(APP); await B.p.waitForTimeout(2200);
  const bHas = await B.p.evaluate(([id, o]) => ({ n: jobs.length, has: !!jobs.find((j) => j.id === id), other: !!jobs.find((j) => j.id === o) }), [id, other]);
  ok(bHas.has && bHas.other, 'device B (the desk) loaded both clients from the sheet');
  eq(await B.p.evaluate((id) => jobs.find((j) => j.id === id).updatedAt, id), MORNING, 'and holds the morning copy of the job');

  // ── A: THE REAL JOB PLAN, EDITED IN THE HOUSE ─────────────────────────────────────────────────
  console.log('\n## A. Device A (the house) edits the Job Plan through the real controls');
  const aStart = Date.now();
  await A.p.evaluate((id) => openJobPlanFor(id), id); await A.p.waitForTimeout(1000);
  // A press or a keystroke that cannot land is a FAILED CHECK, not a crash: run against a build that
  // predates a control, the rest of the step still has something to say.
  const on = (h) => '[onchange^="' + h + '"]';
  async function choose(p, h, v) {
    try { await p.locator(on(h)).first().selectOption(String(v)); await p.waitForTimeout(250); return true; }
    catch (e) { ok(false, 'could not choose ' + v + ' in ' + h); return false; } }
  async function type(p, h, v) {
    try { const l = p.locator(on(h)).first(); await l.fill(String(v)); await l.dispatchEvent('change'); await p.waitForTimeout(250); return true; }
    catch (e) { ok(false, 'could not type ' + v + ' into ' + h); return false; } }
  async function press(p, sel) {
    try { await p.locator(sel).first().click(); await p.waitForTimeout(300); return true; }
    catch (e) { ok(false, 'could not press ' + sel); return false; } }
  // The painter on the bundled prep line, the mover on the estimate's vendor line.
  await choose(A.p, 'setPrepVendor(' + id + ',0,', 11);
  await type(A.p, 'setPrepVendorQuote(' + id + ',0,', 23400);
  await choose(A.p, 'setPrepVendorStatus(' + id + ',0,', 'Confirmed');
  await choose(A.p, 'setJobVendor(' + id + ',0,', 13);
  await type(A.p, 'setJobVendorQuote(' + id + ',0,', 12500);
  await choose(A.p, 'setJobVendorStatus(' + id + ',0,', 'Confirmed');
  // A dumpster nobody put on the estimate, through the real "+ Add an end-of-job vendor…" menu.
  await choose(A.p, 'addLogisticsLine(' + id + ',', 'dumpster');
  await choose(A.p, 'setLogisticsVendor(' + id + ",'dumpster',", 12);
  await type(A.p, 'setLogisticsQuote(' + id + ",'dumpster',", 850);
  await choose(A.p, 'setLogisticsStatus(' + id + ",'dumpster',", 'Confirmed');
  // The team: the Hours fold, the real selects and the real Confirm job team button.
  const hoursOpen = await A.p.evaluate(() => { const e = document.getElementById('phase-body-hours'); return !!e && e.style.display !== 'none'; });
  if (!hoursOpen) await press(A.p, '[onclick="togglePhase(\'hours\')"]');
  await choose(A.p, 'setCrewTC(' + id + ',', 'Ashley Jerome');
  await choose(A.p, 'setCrewPS(' + id + ',0,', 'Anthony Graziano Jr');
  await choose(A.p, 'setCrewPS(' + id + ',1,', 'Contractor TBD');
  await press(A.p, '[onclick="confirmJobTeam(' + id + ')"]');
  ok(await settle(A.p), 'device A\'s writes all went out');
  const aJob = await A.p.evaluate((id) => JSON.parse(JSON.stringify(jobs.find((j) => j.id === id))), id);
  const recOf = (j, bucket) => { const m = (j && j[bucket]) || {}; const k = Object.keys(m)[0]; return k ? m[k] : {}; };
  eq(recOf(aJob, 'prepSourcing').vendorName, 'Ace Painting', 'the painter is on A\'s job');
  eq(String(recOf(aJob, 'prepSourcing').quote), '23400', 'at $23,400');
  eq(((aJob.logisticsSourcing || {}).dumpster || {}).vendorName, 'Bin There Dumpsters', 'the dumpster is on A\'s job');
  ok(!!(aJob.crew && aJob.crew.confirmed), 'and the team is confirmed');
  ok(aJob.updatedAt > MORNING, '⚠⚠ the edits moved the job\'s clock past the morning  [' + (aJob.updatedAt - MORNING) + 'ms]');
  const afterA = sheetJob(id);
  eq(recOf(afterA, 'prepSourcing').vendorName, 'Ace Painting', 'the sheet holds the painter once A\'s writes land');
  ok(jobPosts('A', aStart).length > 0, 'A posted the job  (' + jobPosts('A', aStart).length + ' job writes)');

  // ── B: THE STALE LAPTOP SAVES A DIFFERENT CLIENT ────────────────────────────────────────────────
  console.log('\n## B. Device B, still on the morning copy, edits a DIFFERENT client and presses Save');
  const bStart = Date.now();
  await B.p.evaluate((o) => openClientDashboard(o), other); await B.p.waitForTimeout(500);
  await press(B.p, '[onclick="dashEditClient(' + other + ')"]');
  try { await B.p.fill('#ec-notes', 'Gate code 4417 — call the daughter first'); } catch (e) { ok(false, 'could not type the note'); }
  await press(B.p, 'button[onclick="saveClientEdit(' + other + ')"]');
  ok(await settle(B.p), 'device B\'s writes all went out');
  const bSent = jobPosts('B', bStart);
  ok(bSent.some((x) => x.type === 'saveAllJobs'), 'B posted the WHOLE job list — its morning copy of the Butler job included');
  eq(await B.p.evaluate((id) => jobs.find((j) => j.id === id).updatedAt, id), MORNING, 'B never saw A\'s edits: it saved the morning copy');

  // ── THE SHEET ─────────────────────────────────────────────────────────────────────────────────
  console.log('\n## C. The sheet, after both');
  const after = sheetJob(id);
  const pr = recOf(after, 'prepSourcing'), mv = recOf(after, 'vendorSourcing'), du = ((after || {}).logisticsSourcing || {}).dumpster || {};
  eq(pr.vendorName, 'Ace Painting', '⚠⚠ the painter survived B\'s save');
  eq(String(pr.quote), '23400', '…at $23,400');
  eq(pr.status, 'Confirmed', '…confirmed');
  eq(mv.vendorName, 'Two Men Movers', 'the mover survived');
  eq(String(mv.quote), '12500', '…at $12,500');
  eq(du.vendorName, 'Bin There Dumpsters', '⚠⚠ the dumpster line survived');
  eq(String(du.quote), '850', '…at $850');
  ok(!!(after && after.crew && after.crew.confirmed), '⚠⚠ the confirmed team survived — it used to reset');
  eq(after && after.crew && after.crew.ps && after.crew.ps[0] && after.crew.ps[0].name, 'Anthony Graziano Jr', '…with its specialist on it');
  eq((sheetJob(other) || {}).notes, 'Gate code 4417 — call the daughter first', 'and B\'s own edit to the other client landed too — nothing was refused');

  // ── THE BILL, OFF A FRESH RELOAD OF EACH DEVICE ─────────────────────────────────────────────────
  console.log('\n## D. Both devices reloaded: what the Job Plan shows and what the final invoice bills');
  for (const [who, d] of [['A', A], ['B', B]]) {
    await d.p.reload(); await d.p.waitForTimeout(2200);
    const bill = await d.p.evaluate((id) => {
      const job = jobs.find((j) => j.id === id), e = estimateStore[id].estimate, a = getVendorActuals(job, e);
      return { prepTotal: a.prepTotal, prepFee: a.prepFee, painter: (a.prep[0] || {}).vendorName,
               dumpster: a.thirdParty.filter((l) => /Dumpster/.test(l.label)).map((l) => l.amount) };
    }, id);
    eq(bill.prepTotal, 23400, who + ': the prep actual is the painter\'s $23,400');
    eq(bill.prepFee, 7020, who + ': so the 30% fee is $7,020 — the lost edit billed $6,000 on the $20,000 estimate figure');
    eq(JSON.stringify(bill.dumpster), '[850]', who + ': the $850 dumpster is a third-party actual on the final');
    eq(bill.painter, 'Ace Painting', who + ': the painter is named');
  }
  await A.p.evaluate((id) => openJobPlanFor(id), id); await A.p.waitForTimeout(1000);
  const shown = await A.p.evaluate(([id]) => {
    const q = (h) => { const e = document.querySelector('[onchange^="' + h + '"]'); return e ? e.value : null; };
    const chip = document.querySelector('#plan-gates-' + id + ' [data-gate="team_confirmed"]');
    return { painter: q('setPrepVendor(' + id + ',0,'), quote: q('setPrepVendorQuote(' + id + ',0,'),
             status: q('setPrepVendorStatus(' + id + ',0,'), dumpster: q('setLogisticsQuote(' + id + ",'dumpster',"),
             team: chip ? chip.className + ' ' + chip.textContent : '' };
  }, [id]);
  eq(shown.painter, '11', 'the reloaded Job Plan shows Ace Painting on the painting line');
  eq(shown.quote, '23400', '…the $23,400 quote in its box');
  eq(shown.status, 'Confirmed', '…and Confirmed');
  eq(shown.dumpster, '850', 'the dumpster line is on the plan with its $850');
  has(shown.team, 'gate-ok', 'the job-team chip is green  (' + shown.team.trim() + ')');

  // ── E. AN HOURS SAVE THAT LOCKS NOTHING WRITES NOTHING TO THE JOB ─────────────────────────────────
  // lockAssignedCrew runs on EVERY hours save. The team locks when it is confirmed, so on an ordinary
  // day there is nothing left to lock — and a save that stamped anyway would let a device that merely
  // logged its hours (the log is its own store) claim to hold the newest copy of the whole job.
  console.log('\n## E. The hours form — a save that locks nothing writes nothing to the job');
  const hrsOpen = await A.p.evaluate(() => { const e = document.getElementById('phase-body-hours'); return !!e && e.style.display !== 'none'; });
  if (!hrsOpen) await press(A.p, '[onclick="togglePhase(\'hours\')"]');
  // Measured on its own: against a build that lost the team above, staff it again first, so this
  // section says what the hours save does rather than failing on a form the team gate has disabled.
  if (!(await A.p.evaluate((id) => !!(jobs.find((j) => j.id === id).crew || {}).confirmed, id))) {
    await choose(A.p, 'setCrewTC(' + id + ',', 'Ashley Jerome');
    await choose(A.p, 'setCrewPS(' + id + ',0,', 'Anthony Graziano Jr');
    await choose(A.p, 'setCrewPS(' + id + ',1,', 'Contractor TBD');
    await press(A.p, '[onclick="confirmJobTeam(' + id + ')"]');
    await settle(A.p);
  }
  const dayBefore = (n) => A.p.evaluate((n) => { const d = new Date(); d.setDate(d.getDate() - n);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }, n);
  async function logDay(n) {
    const date = await dayBefore(n);
    await A.p.evaluate((d) => { document.getElementById('log-date').value = d; }, date);
    for (const f of ['#log-m0-hrs', '#log-m1-hrs']) { try { await A.p.fill(f, '6'); } catch (e) { ok(false, 'could not type hours into ' + f); } }
    await press(A.p, '#btn-save-hours');
    await settle(A.p);
    return A.p.evaluate(() => (document.getElementById('log-fb') || {}).textContent || '');
  }
  const clock = () => A.p.evaluate((id) => jobs.find((j) => j.id === id).updatedAt, id);
  const c0 = await clock();
  const e1 = Date.now(); has(await logDay(0), 'Hours entry saved', 'a day\'s hours saved through the real form');
  ok(POSTS.some((x) => x.who === 'A' && x.t >= e1 && x.type === 'saveAllLogs'), 'the hours went out (saveAllLogs)');
  eq(jobPosts('A', e1).map((x) => x.type).join(','), '', '⚠⚠ and NO job write — the team was locked at sign-off, so there was nothing to lock');
  eq(await clock(), c0, '⚠ the job\'s clock did not move: an hours save is not an edit to the job');
  // A specialist added mid-job. Naming them IS an edit; the next hours save locks them, and THAT is an edit too.
  await press(A.p, '[onclick="addLogPSSlot()"]');
  const e2 = Date.now(); await choose(A.p, 'setCrewPS(' + id + ',2,', 'Contractor TBD'); await settle(A.p);
  ok(jobPosts('A', e2).length > 0, 'naming a specialist added mid-job went to the sheet');
  const e3 = Date.now(); await logDay(1);
  ok(await A.p.evaluate((id) => !!((jobs.find((j) => j.id === id).crew.ps[2] || {}).locked), id), 'the next hours save locked the new slot');
  ok(jobPosts('A', e3).length > 0, '…and that lock is an edit: it went to the sheet  (' + jobPosts('A', e3).map((x) => x.type).join(',') + ')');
  eq(((sheetJob(id) || {}).crew || { ps: [] }).ps[2] && sheetJob(id).crew.ps[2].locked, true, '…where the new slot reads locked');
  const c3 = await clock();
  const e4 = Date.now(); await logDay(2);
  eq(jobPosts('A', e4).map((x) => x.type).join(','), '', 'the save after that, locking nothing, sends no job write again');
  eq(await clock(), c3, '…and leaves the clock where the lock put it');

  // ── F. LAYOUT AND ERRORS ───────────────────────────────────────────────────────────────────────
  const w1440 = await A.p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  await A.p.setViewportSize({ width: 390, height: 844 }); await A.p.waitForTimeout(400);
  const w390 = await A.p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok(w1440 <= 0, 'no horizontal overflow on the Job Plan at 1440  (' + w1440 + ')');
  ok(w390 <= 0, 'no horizontal overflow on the Job Plan at 390  (' + w390 + ')');
  eq(A.p.errs.length + B.p.errs.length, 0, 'no page errors on either device  ' + JSON.stringify(A.p.errs.concat(B.p.errs).slice(0, 2)));
  await b.close();
  console.log(pass + ' passed, ' + fail + ' failed');
})().catch(async (e) => { console.log('  ✗ threw: ' + (e && e.stack || e)); fail++; try { if (b) await b.close(); } catch (x) {}
  console.log(pass + ' passed, ' + fail + ' failed'); process.exitCode = 1; });
