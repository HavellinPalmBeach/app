// Step 50 — P17 · W2, payments and the lifecycle (2026-10-01).
//
// Drives the REAL page through its own controls against ONE fake Apps Script whose Jobs tab runs the REAL
// saveAllJobsToSheet / saveJobToSheet / _mergeJobRecord / _paymentSticky out of apps-script/main-sync.gs. What is
// seeded is state a person could not type in one sitting: an estimate approved, won and signed, a week of hours.
//
//   A. item 2 — a deposit cheque on an ACTIVE job is voided through the payments list: the dialog says first what the
//      timeline will show; the band turns red "Deposit voided: record the replacement payment" with its reason and its
//      fix on screen; the job stays Active, Job active stays done; ✓ Record payment records a wire and the band moves on
//   B. item 7 — an hourly walkaway whose midpoint is larger than the work: the ✕ on the client list opens close-out,
//      which reads Received / Earned / Refund due; the close; the Deposit Retained card's settlement and Record refund;
//      the refund recorded through its dialog; the card, the payments list, the rail and Win / Loss read it; the sheet
//      holds the refund
//   C. item 8 — 🤝 Handed over in person on the packet's send step: asked, recorded, the timeline waits for the signature
//   D. item 12 — intake offers no Power of Attorney; Edit Client on a record that carries it shows it "(as recorded)",
//      and an untouched save keeps it
//   E. overflow at 1440 and 390 with the blocked band, the settlement and the refund dialog; no page errors
//
//   NODE_PATH=/opt/node22/lib/node_modules node tests/browser/step50.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), vm = require('vm');
const { matchBrace } = require(path.join(__dirname, '..', 'harness'));
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');

// ── THE SHEET: the REAL job merge out of main-sync.gs over an in-memory Jobs tab (step 46's) ───────────────
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
    getName: () => name, getLastRow: () => rows.length,
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
  console, Logger: { log() {} }, Date, JSON, Math, Number, String, Object, Array,
  LockService: { getScriptLock: () => ({ waitLock() {}, tryLock() { return true; }, releaseLock() {} }) },
  _jobRefusal: () => null, _presentJobIds: () => ({}), getJobLedger: () => ({ seen: {}, since: 0 }), _ledgerMarkSeen: () => {},
};
const SHEETS = { Jobs: fakeSheet('Jobs', ['ID', 'HVL ID', 'Name', 'Email', 'Phone', 'Address', 'City', 'Zip', 'Service', 'Status', 'Created', 'Data JSON']) };
S.SpreadsheetApp = { openById: () => ({ getSheetByName: (n) => SHEETS[n] || null, insertSheet(n) { SHEETS[n] = fakeSheet(n); return SHEETS[n]; } }) };
vm.createContext(S);
const STICKY = /(^|\n)function _paymentSticky\(/.test(GS);
vm.runInContext([gsVar('SHEET_ID'), gsVar('JOB_KEYED_LISTS'), gsVar('JOB_KEYED_MAPS'), gsVar('JOB_LIST_KEY'),
  STICKY ? gsVar('JOB_PAYMENT_STICKY') : '', gsVar('BACKEND_VERSION'), gsVar('BACKEND_ACTIONS'), gsVar('BACKEND_TYPES'),
  ...['getJobsFromSheet', 'saveAllJobsToSheet', 'saveJobToSheet', '_jobStamp', '_jobListKey', '_mergeJobKeyed', '_mergeJobRecord', '_lockOrBusy']
    .concat(STICKY ? ['_paymentSticky'] : []).map(gsFn)].join('\n\n'), S, { filename: 'main-sync.gs (extracted)' });
const sheetJob = (id) => S.getJobsFromSheet().find((j) => j.id === id) || null;
const STORES = { estimates: {}, jobPlans: {}, logs: {}, changeOrders: [] };
const SYNC = 'https://script.google.com/macros/s/STEP50/exec';

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
        if (body.type === 'saveAllJobs') { S.saveAllJobsToSheet(body.payload); return json({ ok: true }); }
        if (body.type === 'job') { S.saveJobToSheet(body.payload); return json({ ok: true }); }
        if (body.type === 'saveAllEstimates') { Object.assign(STORES.estimates, body.payload || {}); return json({ ok: true }); }
        if (body.type === 'saveAllJobPlans') { Object.assign(STORES.jobPlans, body.payload || {}); return json({ ok: true }); }
        if (body.type === 'saveAllLogs') { Object.assign(STORES.logs, body.payload || {}); return json({ ok: true }); }
        if (body.action === 'htmlToPdf') return json({ ok: true, base64: 'JVBERi0xLjQK', bytes: 9 });
        if (body.action === 'uploadHtml') return json({ ok: true, fileUrl: 'https://drive.example/file/x', fileId: 'f-1' });
        if (body.action === 'getSubfolders') return json({ ok: true, subfolders: {} });
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

    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    const dialogs = []; p.on('dialog', async (d) => { dialogs.push(d.message()); await d.accept(); });
    await p.goto(APP); await p.waitForTimeout(1800);
    await p.evaluate(() => { window.open = function () { return null; }; });

    const section = async (name, body) => {
      console.log('\n## ' + name);
      await p.evaluate(() => ['deposit-modal', 'pay-void-modal', 'refund-modal', 'closeout-modal', 'edit-client-modal']
        .forEach((id) => { const m = document.getElementById(id); if (m) m.style.display = 'none'; })).catch(() => {});
      try { await body(); } catch (e) { fail++; console.log('  ✗ ' + name + ' threw: ' + String(e && e.message || e).split('\n')[0]); }
    };
    const vis = (sel) => p.locator(sel).first().isVisible().catch(() => false);
    const press = async (sel, what) => {
      const n = await p.locator(sel).count();
      const v = n === 1 && await vis(sel);
      ok(v, (what || sel) + ' — one control, on screen (' + n + ')');
      if (v) { await p.click(sel, { timeout: 5000 }).catch((e) => ok(false, (what || sel) + ' — ' + e.message.split('\n')[0])); await p.waitForTimeout(400); }
      return v;
    };
    const txt = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }, sel);
    // A settlement's rows as a person reads them: label, then figure (the two are adjacent spans with no space between).
    const settleRows = (sel) => p.evaluate((s) => Array.from(document.querySelectorAll(s + ' .jt-settle-row'))
      .map((r) => Array.from(r.children).map((c) => c.textContent.replace(/\s+/g, ' ').trim()).join(' ')).join(' | '), sel);
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const job = (id) => p.evaluate((id) => JSON.parse(JSON.stringify(jobs.find((j) => j.id === id) || null)), id);
    const money = (n) => p.evaluate((n) => fmt(n), n);
    const settle = async () => {
      for (let i = 0; i < 60; i++) {
        await p.waitForTimeout(150);
        const idle = await p.evaluate(() => !_outboxSending && !_flushing && !_outboxTimer && !Object.keys(_outbox).length && !Object.keys(_pendingWrites).length);
        if (idle) return true;
      }
      return false;
    };
    const dash = '#client-dashboard-view';
    const toDash = async (id) => { await p.evaluate((id) => goToClientDashboard(id), id); await p.waitForTimeout(600); };
    const future = await p.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + 30);
      while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1); return _ymdLocal(d); });

    // The real intake, then the real Build Estimate (six rooms, hourly), approved and won the way the PIN and the Won
    // modal leave a job; `signed` adds the packet's send and signature and the deposit invoice's send.
    async function make(last, svc, extra) {
      await p.evaluate(() => { const bt = document.getElementById('btn-add-client'); if (bt) bt.click(); }); await p.waitForTimeout(300);
      const id = await p.evaluate(([wt, last, svc, extra]) => {
        const set = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; if (e.onchange) e.onchange(); } };
        const pick = (id) => { const e = document.getElementById(id); const o = e && Array.from(e.options).find(x => x.value); if (o) { e.value = o.value; if (e.onchange) e.onchange(); } };
        set('i-svc', svc || 'home_cleanout'); toggleIntakeFields();
        set('i-fname', 'Tripp'); set('i-lname', last); set('i-addr', '69 Beach Blvd'); set('i-city', 'Palm Beach'); set('i-zip', '33480');
        set('i-sqft', '3500'); set('i-phone', '(561) 555-0199'); set('i-email', 'tripp@example.com'); set('i-home-value', '4200000');
        pick('i-ptype'); pick('i-src'); set('i-walkthrough', wt);
        Object.keys(extra || {}).forEach((k) => set(k, extra[k]));
        const tc = document.getElementById('i-tc'); if (tc) { const o = Array.from(tc.options).find(x => /Ashley/.test(x.textContent)); if (o) { tc.value = o.value; if (tc.onchange) tc.onchange(); } }
        const st = new Date(wt + 'T12:00:00'); st.setDate(st.getDate() + 7); while (st.getDay() === 0 || st.getDay() === 6) st.setDate(st.getDate() + 1);
        set('i-start', _ymdLocal(st));
        saveIntake(); return (jobs[0] || {}).id;
      }, [future, last, svc, extra || {}]);
      await p.waitForTimeout(1500); await p.evaluate(() => { window.open = function () { return null; }; });
      return id;
    }
    async function build(id, o) {
      await p.evaluate((id) => dashGoEstimate(id), id); await p.waitForTimeout(700);
      const e = await p.evaluate(([id, o]) => {
        const js = document.getElementById('e-job'); js.value = String(id); if (js.onchange) js.onchange();
        for (let i = 0; i < 6; i++) setRoomState('r' + i, 'in');
        calcAll();
        const e = JSON.parse(JSON.stringify(currentEstimate));
        estimateStore[id] = { approved: true, submitted: false, approvedBy: 'Anthony Graziano', approvedAt: 'September 20, 2026', estimate: e, savedAt: Date.now() };
        const j = jobs.find(x => x.id === id);
        j.tc = 'Ashley Jerome';
        j.driveFolder = 'https://drive.google.com/drive/folders/FOLDER' + id;
        j.driveSubfolders = { Estimate: 'sub-est-' + id, Agreement: 'sub-agr-' + id, Invoice: 'sub-inv-' + id };
        j.approved = true; j.status = 'won'; j.won = true; j.wonAt = '2026-09-21'; j.wonBy = 'Ashley Jerome'; j.wonMethod = 'email';
        j.estimateSentDate = 'September 20, 2026'; j.docState = j.docState || {};
        j.docState.estimate = { draftedAt: '2026-09-20T14:00:00.000Z', sentAt: '2026-09-20T14:05:00.000Z', provider: 'gmail' };
        if (o.signed) {
          j.agrApproved = true; j.agrApprovedBy = 'Anthony Graziano'; j.agrApprovedAt = 'September 21, 2026'; j.agrSent = true; j.agrSentAt = 'September 21, 2026';
          j.docState.agreement = { sentAt: '2026-09-21T14:00:00.000Z', draftedAt: '2026-09-21T13:00:00.000Z', provider: 'gmail',
            sig: { how: 'wet', signedBy: 'Tripp ' + j.lname, signedOn: '2026-09-22', provider: 'manual', recordedBy: 'Anthony Graziano', recordedAt: '2026-09-22T15:00:00.000Z' } };
          j.agrSigned = true; j.agrSignedAt = '2026-09-22';
          j.docState['invoice:deposit'] = { draftedAt: '2026-09-22T16:00:00.000Z', sentAt: '2026-09-22T16:05:00.000Z', provider: 'gmail' };
        }
        j.updatedAt = Date.now(); saveJobs();
        try { localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore)); } catch (x) {}
        postSyncBadge({ type: 'saveAllEstimates', payload: estimateStore }, 'ok', 'fail');
        return e;
      }, [id, o || {}]);
      await settle();
      return e;
    }
    const recordPayment = async (id, stage, amount, method) => {
      await p.evaluate(([id, stage]) => dashRecordPayment(id, stage), [id, stage]); await p.waitForTimeout(300);
      if (amount !== null) await p.fill('#dep-amount', String(amount));
      await p.selectOption('#dep-method', method);
      await press('#dep-save-btn', 'Record ' + stage + ' →');
    };

    // ════════════════════════════════════════════════════════════════════════════════════════════════════
    let idA = 0;
    await section('A. item 2 — the deposit voided on an ACTIVE job: a blocked step, its fix on screen, nothing rewinds', async () => {
      idA = await make('Pressly');
      const e = await build(idA, { signed: true });
      ok(e && !e.fixedPrice && e.havellinTotal > 0, 'fixture: an hourly job priced by the real engine (' + (e && e.havellinTotal) + ')');
      await toDash(idA);
      const dep = await p.evaluate((id) => depositTargetFor(jobs.find(j => j.id === id)), idA);
      // The deposit by cheque, through the band's own recorder, then the band's ▶ Activate job.
      await press(dash + ' .jt-next button[onclick="dashRecordPayment(' + idA + ',\'deposit\')"]', 'the band\'s ✓ Record payment');
      await p.selectOption('#dep-method', 'check'); await p.fill('#dep-reference', '#1042');
      await press('#dep-save-btn', 'Record Deposit →');
      await toDash(idA);
      await press(dash + ' .jt-next button[onclick="activateOrCycle(' + idA + ')"]', 'the band\'s ▶ Activate job');
      await toDash(idA);
      const j0 = await job(idA);
      ok(j0.status === 'active' && !!j0.activatedOn, 'fixture: the job is active (' + j0.activatedOn + ')');
      lacks(await txt(dash + ' .jt-next'), 'Blocked', 'fixture: nothing is blocked before the void');
      const chequeUid = (j0.payments[0] || {}).uid;
      // The void, through the payments list: the dialog says what the timeline will show before anything is written.
      await press(dash + ' button[onclick="openVoidPayment(' + idA + ',\'' + chequeUid + '\')"]', 'Void on the deposit cheque');
      const eff = await txt('#pv-effect');
      has(eff, 'The timeline will show “Deposit voided: record the replacement payment” until a payment that counts restores the deposit',
        '⚠⚠ the dialog names what the timeline will show, before the void');
      await p.fill('#pv-reason', 'Cheque returned unpaid');
      await press('#pv-save-btn', 'Void payment');
      // The band: red, Anthony's words, the reason and the fix printed on screen, and the one button that records the replacement.
      const band = await txt(dash + ' .jt-next');
      ok(await p.locator(dash + ' .jt-next.jt-next-blk').count() === 1, '⚠⚠ the band is painted as a blocker');
      has(band, 'Blocked', 'it says Blocked');
      has(band, 'Deposit voided: record the replacement payment', '⚠⚠ with the step in Anthony\'s words');
      has(band, 'was voided on', 'the reason says what happened');
      has(band, 'Cheque returned unpaid', 'and why');
      const fix = await txt(dash + ' .jt-next .jt-next-fix');
      has(fix, 'Record payment when the replacement arrives', '⚠ the fix is printed on screen, not in a tooltip');
      const fixVis = await p.evaluate((s) => { const el = document.querySelector(s); return !!(el && el.checkVisibility()); }, dash + ' .jt-next .jt-next-fix');
      ok(fixVis, 'and it is visible');
      // Nothing rewinds.
      const j1 = await job(idA);
      eq([j1.status, j1.activatedOn], ['active', j0.activatedOn], '⚠⚠ the job stays active; activatedOn is untouched');
      has(await txt(dash + ' .dash-chips'), 'Active', 'the status chip still reads Active');
      const activeRow = await p.evaluate(() => { const r = Array.from(document.querySelectorAll('#client-dashboard-view .jt-row'))
        .find((x) => /^Job active/.test((x.querySelector('.jt-lbl') || {}).textContent || '')); return r ? r.className : ''; });
      has(activeRow, 'jt-done', 'the rail\'s Job active step is still done');
      // The replacement, through the band's own button.
      await press(dash + ' .jt-next button[onclick="dashRecordPayment(' + idA + ',\'deposit\')"]', 'the blocked band\'s ✓ Record payment');
      eq(await p.inputValue('#dep-amount'), String(dep), 'the recorder opens on the deposit due again');
      await p.selectOption('#dep-method', 'wire'); await p.fill('#dep-reference', 'FW-88');
      await press('#dep-save-btn', 'Record Deposit →');
      await toDash(idA);
      lacks(await txt(dash + ' .jt-next'), 'Deposit voided', '⚠⚠ a payment that counts restores the deposit, and the flag is gone');
      eq(await p.locator(dash + ' .jt-next.jt-next-blk').count(), 0, 'the band is no longer red');
      await settle();
      const sj = sheetJob(idA) || {};
      eq((sj.payments || []).map((x) => !!x.voidedAt), [true, false], 'the sheet holds the void and the replacement');
    });

    // ════════════════════════════════════════════════════════════════════════════════════════════════════
    let idB = 0, refundAmt = 0, earned = 0;
    await section('B. item 7 — an hourly walkaway whose midpoint is larger than the work: the refund due, then recorded', async () => {
      idB = await make('Ellsworth');
      const e = await build(idB, { signed: true });
      // A week of work and the money the walkaway paid: the deposit and the midpoint, as the invoices asked for them, and
      // about thirty per cent of the quoted hours logged — less work than the midpoint brought in on top of the deposit.
      const seeded = await p.evaluate(([id, e]) => {
        const j = jobs.find(x => x.id === id);
        const sp = paymentSplit(e.havellinTotal);
        j.payments = [
          { id: 1, uid: 'p50-dep', stage: 'deposit', amount: sp.deposit, method: 'wire', receivedOn: '2026-09-22', clearedOn: '2026-09-22', recordedBy: 'Anthony Graziano' },
          { id: 2, uid: 'p50-mid', stage: 'midpoint', amount: sp.midpoint, method: 'check', receivedOn: '2026-09-29', clearedOn: null, recordedBy: 'Anthony Graziano' }];
        j.at = j.at || {}; j.at['payments:p50-dep'] = Date.now(); j.at['payments:p50-mid'] = Date.now();
        j.depositReceived = true; j.depositReceivedAt = '2026-09-22'; j.status = 'active'; j.activatedOn = '2026-09-23'; j.activatedBy = 'Ashley Jerome';
        jobLogs[id] = [{ id: 1, date: '2026-09-24', activity: 'clearance', members: [
          { name: 'Ashley Jerome', role: 'TC', hours: Math.round(e.totTC * 0.3) }, { name: 'Crew A', role: 'PS', hours: Math.round(e.totPS * 0.3) }] }];
        localStorage.setItem('havellin_logs_v3', JSON.stringify(jobLogs));
        j.updatedAt = Date.now(); saveJobs(); syncJobToSheets(j);
        return { dep: sp.deposit, mid: sp.midpoint };
      }, [idB, e]);
      await settle();
      // (On a build without the settlement this reads what was received and nothing else, so the close-out dialog is still
      // reached and shows what that build did: everything kept, nothing due back.)
      const s = await p.evaluate((id) => { const j = jobs.find(x => x.id === id);
        return (typeof walkawaySettlement === 'function') ? walkawaySettlement(j) : { received: jobPaidTotal(j) }; }, idB);
      ok(s && s.basis === 'hourly' && s.work > 0 && s.due > 0, 'fixture: a refund is due on this walkaway (' + (s && s.due) + ')');
      refundAmt = s.due; earned = s.earned;
      // The ✕ on the client list opens close-out.
      await p.evaluate(() => { const nb = document.querySelector('.nb[onclick*="\'jobs\'"]'); if (nb) nb.click(); }); await p.waitForTimeout(400);
      const x = '#panel-jobs button[onclick*="openCloseoutModal(' + idB + ')"]';
      await press(x, 'the ✕ on the client\'s row');
      ok(await p.evaluate(() => document.getElementById('closeout-modal').checkVisibility()), 'the close-out dialog opens');
      const sub = (await txt('#closeout-sub')) + ' | ' + (await settleRows('#closeout-sub'));
      has(sub, 'Received ' + await money(s.received), 'it names what was received');
      has(sub, 'Earned: the deposit (' + await money(s.deposit) + ') or the work done (' + await money(s.work) + ')', '⚠⚠ what the job earned, and how');
      has(sub, 'Refund due ' + await money(s.due), '⚠⚠ and the refund due');
      const btn = await txt('#closeout-modal button[onclick="confirmMarkLost()"]');
      eq(btn, 'Close — Retain ' + await money(s.retained) + ' · refund ' + await money(s.due), 'the button states the decision');
      await p.selectOption('#closeout-reason', 'timing');
      await press('#closeout-modal button[onclick="confirmMarkLost()"]', btn);
      eq((await job(idB)).status, 'closed_retained', 'closed as Deposit Retained');
      // The Deposit Retained card.
      await toDash(idB);
      const card = (await txt(dash + ' .jt-settle')) + ' | ' + (await settleRows(dash + ' .jt-settle'));
      has(card, 'Walkaway settlement', '⚠⚠ the card carries the settlement');
      has(card, 'Refund due ' + await money(s.due), 'with the refund due');
      await press(dash + ' .jt-settle button[onclick="openRefundModal(' + idB + ')"]', 'Record refund');
      ok(await p.evaluate(() => document.getElementById('refund-modal').checkVisibility()), 'the refund dialog opens');
      eq(await p.inputValue('#rf-amount'), String(s.due), 'on the amount due');
      eq(await overflow(), 0, 'no overflow at 1440 with the refund dialog open');
      await p.selectOption('#rf-method', 'check'); await p.fill('#rf-reference', '#2201'); await p.fill('#rf-payee', 'Ellsworth Family Trust');
      await press('#rf-save-btn', 'Record refund →');
      ok(!(await p.evaluate(() => document.getElementById('refund-modal').checkVisibility())), 'the dialog closes');
      const j = await job(idB);
      const r = (j.payments || []).find((x) => x.stage === 'refund') || {};
      eq([r.amount, r.method, r.reference, r.payee], [s.due, 'check', '#2201', 'Ellsworth Family Trust'], '⚠⚠ the refund is its own record on the job');
      eq(j.payments.length, 3, 'beside the two payments, which are untouched');
      const card2 = await settleRows(dash + ' .jt-settle');
      has(card2, 'Refunded (' + await money(s.due) + ')', 'the card shows the refund');
      has(card2, 'Refund due ' + await money(0), 'and nothing more due');
      // ⚠ RESTATED (P25, Q49; Anthony, 2026-10-09): a refund above what is due may be recorded, with its reason, while the job
      // still holds money, so Record refund stays (it went once nothing was due). Above what is due the save asks the reason.
      eq(await p.locator(dash + ' .jt-settle button[onclick^="openRefundModal("]').count(), 1, 'Record refund stays while the job holds money (a further refund needs its reason)');
      const list = await txt(dash + ' .jt-pays');
      has(list, 'Payments and refunds recorded', 'the list heads itself for both');
      has(list, 'Refund · Cheque · #2201 · to Ellsworth Family Trust', 'and lists the refund');
      const term = await p.evaluate(() => { const r = Array.from(document.querySelectorAll('#client-dashboard-view .jt-row')).find((x) => /deposit retained/i.test(x.textContent)); return r ? r.textContent.replace(/\s+/g, ' ') : ''; });
      // RESTATED 2026-10-01 (P17 merge): the retained figure is to the cent since W1, so it is read through the page's own fmt
      // ($6,006.25 on the merged build), never '$' + Math.round(…), which printed $6,006 here; likewise Win / Loss below.
      has(term, await money(earned) + ' retained', '⚠⚠ the rail\'s Deposit Retained row now reads what the job kept');
      // Win / Loss counts what was kept.
      await p.evaluate(() => { const nb = document.querySelector('.nb[onclick*="\'jobs\'"]'); if (nb) nb.click(); }); await p.waitForTimeout(400);
      await press('#wl-tile-won', 'the Won tile');
      const wl = await p.evaluate((id) => { const r = document.querySelector('#wl-list-won tr[onclick="openClientDashboard(' + id + ')"]');
        return r ? Array.from(r.children).map((c) => c.textContent.replace(/\s+/g, ' ').trim()).join(' | ') : ''; }, idB);
      has(wl, await money(earned) + 'retained', 'Win / Loss counts the retained figure after the refund');
      await press('#wl-tile-won', 'the Won tile, to close it');
      await settle();
      const sr = ((sheetJob(idB) || {}).payments || []).find((x) => x.stage === 'refund') || {};
      eq(sr.amount, s.due, '⚠ the sheet holds the refund (merged on its own uid)');
    });

    // ════════════════════════════════════════════════════════════════════════════════════════════════════
    let idC = 0;
    await section('C. item 8 — "Handed over in person" records the send, and the timeline waits for the signature', async () => {
      idC = await make('Whitlock');
      await build(idC, { signed: false });
      await toDash(idC);
      has(await txt(dash + ' .jt-next'), 'Send the signing packet', 'fixture: the packet\'s send is the step');
      const hand = dash + ' .jt-next button[onclick="dashMarkAgreementSent(' + idC + ')"]';
      has(await txt(hand), 'Handed over in person', '⚠⚠ the band offers Handed over in person, beside the send');
      const n0 = dialogs.length;
      await press(hand, 'Handed over in person');
      has(dialogs.slice(n0).join(' | '), 'in person today?', 'it asks first');
      const st = ((await job(idC)).docState || {}).agreement || {};
      eq([st.sentHow, !!st.sentAt, st.sentHowAt === st.sentAt], ['in_person', true, true], '⚠⚠ the send is on the document record, with how');
      has(await txt(dash + ' .jt-next'), 'Get the agreement signed', '⚠⚠ the timeline moves to awaiting the signature');
      ok(await p.locator(dash + ' .jt-next button[onclick="dashMarkAgreementSigned(' + idC + ')"]').count() === 1, 'whose button records the signature');
      const railRow = await p.evaluate(() => { const r = Array.from(document.querySelectorAll('#client-dashboard-view .jt-row'))
        .find((x) => /^Signing packet sent/.test((x.querySelector('.jt-lbl') || {}).textContent || '')); return r ? r.textContent.replace(/\s+/g, ' ') : ''; });
      has(railRow, 'Handed over in person', 'the rail says how it went');
      await settle();
      eq((((sheetJob(idC) || {}).docState || {}).agreement || {}).sentHow, 'in_person', 'and the sheet holds it');
    });

    // ════════════════════════════════════════════════════════════════════════════════════════════════════
    await section('D. item 12 — no Power of Attorney at intake; an older record keeps it, shown as recorded', async () => {
      await p.evaluate(() => { const bt = document.getElementById('btn-add-client'); if (bt) bt.click(); }); await p.waitForTimeout(300);
      await p.evaluate(() => { const e = document.getElementById('i-svc'); e.value = 'cleanout'; if (e.onchange) e.onchange(); toggleIntakeFields(); });
      ok(await vis('#i-executor-role'), 'fixture: intake shows the representative\'s role on an estate');
      const roles = await p.evaluate(() => Array.from(document.querySelectorAll('#i-executor-role option')).map((o) => o.value).filter(Boolean));
      ok(roles.indexOf('Personal Representative') >= 0, 'the roles are listed');
      ok(roles.indexOf('Power of Attorney') < 0, '⚠⚠ intake offers no Power of Attorney');
      // An estate whose record carries the role from before.
      const idD = await make('Vance', 'cleanout', { 'i-executor-fname': 'Joan', 'i-executor-lname': 'Vance', 'i-executor-role': 'Executor',
        'i-executor-email': 'joan@example.com', 'i-executor-phone': '(561) 555-0101' });
      await p.evaluate((id) => { const j = jobs.find(x => x.id === id); j.executorRole = 'Power of Attorney'; j.updatedAt = Date.now(); saveJobs(); }, idD);
      await toDash(idD);
      await press(dash + ' button[onclick="dashEditClient(' + idD + ')"]', 'Edit Client');
      const sel = await p.evaluate(() => { const s = document.getElementById('ec-exec-role'); if (!s) return null;
        return { value: s.value, label: (s.options[s.selectedIndex] || {}).textContent, all: Array.from(s.options).map((o) => o.textContent) }; });
      ok(!!sel, 'Edit Client shows the role');
      eq(sel && sel.value, 'Power of Attorney', '⚠⚠ the recorded role is selected');
      eq(sel && sel.label, 'Power of Attorney (as recorded)', 'and named as recorded');
      eq(((sel && sel.all) || []).filter((t) => /Power of Attorney/.test(t)).length, 1, 'once, never as a catalogue choice');
      await p.evaluate((id) => saveClientEdit(id), idD); await p.waitForTimeout(500);
      eq((await job(idD)).executorRole, 'Power of Attorney', 'an untouched save keeps it');
    });

    // ════════════════════════════════════════════════════════════════════════════════════════════════════
    await section('E. the blocked band, the settlement and the refund dialog fit at 390; no page errors', async () => {
      // A blocked band to measure: void the replacement wire on A.
      const wire = ((await job(idA)).payments || []).find((x) => !x.voidedAt) || {};
      await toDash(idA);
      await press(dash + ' button[onclick="openVoidPayment(' + idA + ',\'' + wire.uid + '\')"]', 'Void on the wire');
      await p.fill('#pv-reason', 'returned'); await press('#pv-save-btn', 'Void payment');
      await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(400);
      await toDash(idA);
      ok(await p.locator(dash + ' .jt-next.jt-next-blk').count() === 1, 'fixture: the blocked band is on screen at 390');
      eq(await overflow(), 0, 'no overflow at 390 with the blocked band');
      await toDash(idB);
      ok(await p.locator(dash + ' .jt-settle').count() === 1, 'fixture: the settlement is on screen at 390');
      eq(await overflow(), 0, 'none with the settlement card');
      const w = await p.evaluate(() => { const el = document.querySelector('#client-dashboard-view .jt-settle'); return el ? el.getBoundingClientRect().width : 0; });
      ok(w > 200 && w <= 390, 'the settlement fits the phone (' + Math.round(w) + 'px)');
      // The refund dialog at 390: void the refund so one is due again, then open it.
      const rf = ((await job(idB)).payments || []).find((x) => x.stage === 'refund') || {};
      await press(dash + ' button[onclick="openVoidPayment(' + idB + ',\'' + rf.uid + '\')"]', 'Void on the refund');
      has(await txt('#pv-effect'), 'The refund due becomes', 'the dialog says the refund comes due again');
      await p.fill('#pv-reason', 'recorded early'); await press('#pv-save-btn', 'Void refund');
      await press(dash + ' .jt-settle button[onclick="openRefundModal(' + idB + ')"]', 'Record refund, on a phone');
      eq(await overflow(), 0, 'none with the refund dialog open at 390');
      await p.evaluate(() => closeRefundModal());
      await p.setViewportSize({ width: 1440, height: 1000 }); await p.waitForTimeout(300);
      await toDash(idB);
      eq(await overflow(), 0, 'and none at 1440 with the settlement card');
      eq(errs, [], 'no page errors');
    });

    await b.close();
  } catch (e) {
    fail++; console.log('  ✗ threw: ' + (e && e.stack || e));
    try { if (b) await b.close(); } catch (x) {}
  }
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
