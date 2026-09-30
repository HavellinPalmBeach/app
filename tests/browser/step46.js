// Step 46 — P16 · W2, payments and integrations (2026-09-30).
//
// Drives the REAL page through its own controls against ONE fake Apps Script whose Jobs tab runs the REAL
// saveAllJobsToSheet / saveJobToSheet / _mergeJobRecord / _paymentSticky out of apps-script/main-sync.gs, and
// whose stripeStatus, esignStatus, esignArchive, htmlToPdf and uploadHtml answer as the deployment would. The
// Gmail API is routed too. What is seeded is state a person could not type in one sitting: a job signed and
// invoiced, ten minutes passing, a stale device's copy arriving at the sheet.
//
//   A. the recorder offers no Card; a personal cheque recorded through the band's Record payment and the dialog;
//      the dashboard's payments list shows it Uncleared; Mark cleared pressed → Cleared today, no total moved
//   B. Void: the dialog says what it does to the money before anything is written; a blank reason is refused; a
//      reason voids it — struck through, the job unfunded, the band back on Record payment; a fresh cheque funds
//      it again and is counted once; the final invoice's received row leaves the void out
//   C. a stale device that touched the same payment on its morning copy writes to the sheet after the void; the
//      page reloads from the sheet and the payment is still void (the real merge, _paymentSticky)
//   D. a bank transfer recorded by hand on the midpoint; ten minutes on, the client is reopened from the client
//      list and Stripe (routed) reports the same money settled: one payment, cleared by Stripe, counted once
//   E. a failed Gmail draft (routed 403) falls back to a plain email: recorded, filed, the row says so, the band
//      offers "I've sent it", and pressing it records the send
//   F. ✎ Edit estimate on that sent, filed estimate: the "📁 Filed estimate" link to the pre-edit copy goes
//   G. a DocuSign envelope comes back (routed): the row carries the client's own day and the address DocuSign
//      authenticated, not the envelope's completion day
//   H. the manager's PIN approves an estimate: the concierge's email is a Gmail draft, no mailto
//   I. overflow at 1440 and 390 with the payments list and the Void dialog on screen; no page errors
//
//   NODE_PATH=/opt/node22/lib/node_modules node tests/browser/step46.js [/abs/path/to/havellin.html]
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

// ── THE SHEET: the REAL job merge out of main-sync.gs over an in-memory Jobs tab (step 32's) ───────────────
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
// The payment merge is lifted only where the file has it: against a build from before P16 the sheet merges
// payments by stamp alone, which is what that build's deployment did.
const STICKY = /(^|\n)function _paymentSticky\(/.test(GS);
vm.runInContext([gsVar('SHEET_ID'), gsVar('JOB_KEYED_LISTS'), gsVar('JOB_KEYED_MAPS'), gsVar('JOB_LIST_KEY'),
  STICKY ? gsVar('JOB_PAYMENT_STICKY') : '', gsVar('BACKEND_VERSION'), gsVar('BACKEND_ACTIONS'), gsVar('BACKEND_TYPES'),
  ...['getJobsFromSheet', 'saveAllJobsToSheet', 'saveJobToSheet', '_jobStamp', '_jobListKey', '_mergeJobKeyed', '_mergeJobRecord', '_lockOrBusy']
    .concat(STICKY ? ['_paymentSticky'] : []).map(gsFn)].join('\n\n'), S, { filename: 'main-sync.gs (extracted)' });
const sheetJob = (id) => S.getJobsFromSheet().find((j) => j.id === id) || null;
const STORES = { estimates: {}, jobPlans: {}, logs: {}, changeOrders: [] };

const SYNC = 'https://script.google.com/macros/s/STEP46/exec';
const BOX = 'anthony@havellinpalmbeach.com';
const STRIPE = {};            // linkId -> the payments Stripe reports for it
const ESIGN = {};             // envelopeId -> the status DocuSign reports
const POSTS = [];             // every action the app posted, in order
const GMAIL = { fail: false, drafts: [] };

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
        POSTS.push(body.type || body.action || '?');
        if (body.type === 'saveAllJobs') { S.saveAllJobsToSheet(body.payload); return json({ ok: true }); }
        if (body.type === 'job') { S.saveJobToSheet(body.payload); return json({ ok: true }); }
        if (body.type === 'saveAllEstimates') { Object.assign(STORES.estimates, body.payload || {}); return json({ ok: true }); }
        if (body.type === 'saveAllJobPlans') { Object.assign(STORES.jobPlans, body.payload || {}); return json({ ok: true }); }
        if (body.type === 'saveAllLogs') { Object.assign(STORES.logs, body.payload || {}); return json({ ok: true }); }
        if (body.action === 'stripeStatus') return json({ ok: true, linkId: body.linkId, payments: STRIPE[body.linkId] || [] });
        if (body.action === 'esignStatus') return json(Object.assign({ ok: true, envelopeId: body.envelopeId }, ESIGN[body.envelopeId] || { status: 'sent' }));
        if (body.action === 'esignArchive') return json({ ok: true, signedUrl: 'https://drive.example/signed', certUrl: 'https://drive.example/cert' });
        if (body.action === 'htmlToPdf') return json({ ok: true, base64: 'JVBERi0xLjQK', bytes: 9 });
        if (body.action === 'uploadHtml') return json({ ok: true, fileUrl: 'https://drive.example/file/' + encodeURIComponent(body.filename || 'x'), fileId: 'f-' + POSTS.length });
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
    await ctx.route('https://gmail.googleapis.com/gmail/v1/users/me/drafts', async (r) => {
      const body = JSON.parse(r.request().postData() || '{}');
      const raw = Buffer.from(String(body.message && body.message.raw || '').replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
      if (GMAIL.fail) return r.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error: { message: 'Request had insufficient authentication scopes.' } }) });
      GMAIL.drafts.push(raw);
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'r-' + GMAIL.drafts.length, message: { id: 'm-' + GMAIL.drafts.length } }) });
    });
    await ctx.route('https://www.googleapis.com/oauth2/v3/userinfo', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ email: BOX }) }));

    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    const dialogs = []; p.on('dialog', async (d) => { dialogs.push(d.message()); await d.accept(); });
    await p.goto(APP); await p.waitForTimeout(1800);
    // The page's own hooks for what a headless browser cannot do: a Google sign-in popup (the token is handed
    // over, the Gmail API is routed), a new tab, and a mailto: (captured — in a headless browser it navigates
    // away from the page under test). The mailto route's href is still built by the real registry.
    const hook = () => p.evaluate(() => {
      window.gmailAuth = function (cb) { cb('tok-step46'); };
      window.open = function () { return null; };
      window.__mailtos = window.__mailtos || [];
      if (window.DOC_SEND_PROVIDERS && !DOC_SEND_PROVIDERS.mailto.__hooked) {
        DOC_SEND_PROVIDERS.mailto.send = function (spec, pdf, cb) {
          var href = spec.cfg.mailto(spec);
          if (!href || href === '#') { cb(false, 'no client email on this job'); return; }
          window.__mailtos.push(href); cb(true, null, '');
        };
        DOC_SEND_PROVIDERS.mailto.__hooked = true;
      }
    });
    await hook();

    const section = async (name, body) => {
      console.log('\n## ' + name);
      await p.evaluate(() => ['deposit-modal', 'pay-void-modal', 'pin-modal', 'doc-viewer-modal']
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
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const job = (id) => p.evaluate((id) => JSON.parse(JSON.stringify(jobs.find((j) => j.id === id) || null)), id);
    const today = () => p.evaluate(() => _todayStr());
    const fmtDay = (ymd) => p.evaluate((d) => fmtDate2(d), ymd);
    const settle = async () => {
      for (let i = 0; i < 60; i++) {
        await p.waitForTimeout(150);
        const idle = await p.evaluate(() => !_outboxSending && !_flushing && !_outboxTimer && !Object.keys(_outbox).length && !Object.keys(_pendingWrites).length);
        if (idle) return true;
      }
      return false;
    };
    const openFromList = async (id) => {
      await p.evaluate(() => { const nb = document.querySelector('.nb[onclick*="\'jobs\'"]'); if (nb) nb.click(); });
      await p.waitForTimeout(300);
      const row = '#panel-jobs tr[onclick="openClientDashboard(' + id + ')"]';
      const n = await p.locator(row).count();
      ok(n >= 1, 'the client is on the client list (' + n + ')');
      if (n) { await p.locator(row).first().click(); await p.waitForTimeout(900); }
    };
    const dash = '#client-dashboard-view';
    const future = await p.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + 30);
      while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1); return _ymdLocal(d); });

    // The real intake, then the real Build Estimate (six rooms, fixed price), approved and won the way the PIN and
    // the Won modal leave a job. `sent` says how far the paperwork has gone.
    async function make(last, svc) {
      await p.evaluate(() => { const bt = document.getElementById('btn-add-client'); if (bt) bt.click(); }); await p.waitForTimeout(300);
      const id = await p.evaluate(([wt, last, svc]) => {
        const set = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; if (e.onchange) e.onchange(); } };
        const pick = (id) => { const e = document.getElementById(id); const o = e && Array.from(e.options).find(x => x.value); if (o) { e.value = o.value; if (e.onchange) e.onchange(); } };
        set('i-svc', svc || 'home_cleanout'); toggleIntakeFields();
        set('i-fname', 'Tripp'); set('i-lname', last); set('i-addr', '69 Beach Blvd'); set('i-city', 'Palm Beach'); set('i-zip', '33480');
        set('i-sqft', '3500'); set('i-phone', '(561) 555-0199'); set('i-email', 'tripp@example.com'); set('i-home-value', '4200000');
        pick('i-ptype'); pick('i-src'); set('i-walkthrough', wt);
        const tc = document.getElementById('i-tc'); if (tc) { const o = Array.from(tc.options).find(x => /Ashley/.test(x.textContent)); if (o) { tc.value = o.value; if (tc.onchange) tc.onchange(); } }
        const st = new Date(wt + 'T12:00:00'); st.setDate(st.getDate() + 7); while (st.getDay() === 0 || st.getDay() === 6) st.setDate(st.getDate() + 1);
        set('i-start', _ymdLocal(st));
        saveIntake(); return (jobs[0] || {}).id;
      }, [future, last, svc]);
      await p.waitForTimeout(1500); await hook(); return id;
    }
    async function build(id, o) {
      await p.evaluate((id) => dashGoEstimate(id), id); await p.waitForTimeout(700);
      const e = await p.evaluate(([id, o]) => {
        const js = document.getElementById('e-job'); js.value = String(id); if (js.onchange) js.onchange();
        for (let i = 0; i < 6; i++) setRoomState('r' + i, 'in');
        calcAll();
        if (o.fixed) { const fx = document.getElementById('e-fixed'); if (!fx.checked) { fx.checked = true; toggleFixedPrice(); } calcAll(); _fxAmtSet(o.fixed); markFixedAmountEdited(); calcAll(); }
        const e = JSON.parse(JSON.stringify(currentEstimate));
        estimateStore[id] = { approved: !o.submitted, submitted: !!o.submitted, approvedBy: o.submitted ? '' : 'Anthony Graziano',
          approvedAt: o.submitted ? '' : 'September 20, 2026', estimate: e, savedAt: Date.now() };
        const j = jobs.find(x => x.id === id);
        j.tc = 'Ashley Jerome'; j.agrApprovedBy = 'Anthony Graziano';
        j.driveFolder = 'https://drive.google.com/drive/folders/FOLDER' + id;
        j.driveSubfolders = { Estimate: 'sub-est-' + id, Agreement: 'sub-agr-' + id, Invoice: 'sub-inv-' + id };
        if (o.submitted) { j.status = 'pending'; }
        else { j.approved = true; j.status = 'approved'; }
        if (o.won) { j.won = true; j.status = 'won'; j.wonAt = '2026-09-21'; j.wonBy = 'Ashley Jerome'; j.wonMethod = 'email';
                     j.estimateSentDate = 'September 20, 2026'; j.docState = j.docState || {};
                     j.docState.estimate = { draftedAt: '2026-09-20T14:00:00.000Z', sentAt: '2026-09-20T14:05:00.000Z', provider: 'gmail' }; }
        if (o.signed) { j.agrApproved = true; j.agrApprovedAt = 'September 21, 2026'; j.agrSent = true; j.agrSentAt = 'September 21, 2026';
                        j.docState.agreement = { sentAt: '2026-09-21T14:00:00.000Z', draftedAt: '2026-09-21T13:00:00.000Z', provider: 'gmail',
                          sig: { how: 'wet', signedBy: 'Tripp ' + j.lname, signedOn: '2026-09-22', provider: 'manual', recordedBy: 'Anthony Graziano', recordedAt: '2026-09-22T15:00:00.000Z' } };
                        j.agrSigned = true; j.agrSignedAt = '2026-09-22';
                        j.docState['invoice:deposit'] = { draftedAt: '2026-09-22T16:00:00.000Z', sentAt: '2026-09-22T16:05:00.000Z', provider: 'gmail' }; }
        j.updatedAt = Date.now(); saveJobs(); saveEstimateState && void 0;
        try { localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore)); } catch (x) {}
        postSyncBadge({ type: 'saveAllEstimates', payload: estimateStore }, 'ok', 'fail');
        return e;
      }, [id, o]);
      await settle();
      return e;
    }
    const toDash = async (id) => { await p.evaluate((id) => goToClientDashboard(id), id); await p.waitForTimeout(500); await hook(); };

    // ════════════════════════════════════════════════════════════════════════════════════════════════════
    let idA = 0, chequeUid = '', morning = null;
    await section('A. the recorder has no Card; a cheque recorded, listed Uncleared, then Mark cleared', async () => {
      idA = await make('Pressly');
      const e = await build(idA, { fixed: 24000, won: true, signed: true });
      ok(e && e.fixedPrice && e.havellinTotal > 0, 'fixture: a fixed-price job priced by the real engine (' + (e && e.havellinTotal) + ')');
      await toDash(idA);
      const dep = await p.evaluate((id) => depositTargetFor(jobs.find(j => j.id === id)), idA);
      ok(dep > 0, 'fixture: the deposit due is ' + dep);
      has(await txt(dash + ' .jt-next'), 'Record payment', 'the band\'s one step is recording the deposit');
      await press(dash + ' .jt-next button[onclick="dashRecordPayment(' + idA + ',\'deposit\')"]', 'the band\'s ✓ Record payment');
      ok(await vis('#deposit-modal'), 'the recorder opens');
      const methods = await p.evaluate(() => Array.from(document.querySelectorAll('#dep-method option')).map((o) => o.value + ':' + o.textContent));
      eq(methods, [':Select method', 'check:Personal cheque', 'cashiers_check:Cashier\'s cheque', 'wire:Wire transfer', 'stripe_ach:Bank transfer (ACH)', 'cash:Cash'],
         '⚠⚠ the recorder offers no Card (Anthony, 2026-09-30: no card payments)');
      eq(await p.inputValue('#dep-amount'), String(dep), 'it opens on the deposit due');
      await p.selectOption('#dep-method', 'check');
      await p.fill('#dep-reference', '#1042'); await p.fill('#dep-payer', 'Pressly Family Trust');
      await press('#dep-save-btn', 'Record Deposit →');
      const j = await job(idA);
      const pay = (j.payments || [])[0] || {};
      chequeUid = pay.uid || '';
      ok(!!chequeUid && pay.method === 'check' && pay.clearedOn === null, 'a personal cheque is recorded, uncleared');
      morning = j;                                   // what a device that loads now and never reloads holds
      const list = await txt(dash + ' .jt-pays');
      has(list, 'Payments recorded', '⚠ the dashboard lists the payments now');
      has(list, '$' + dep.toLocaleString() + ' · Deposit (50%) · Personal cheque', 'the cheque, with its stage and method');
      has(list, 'Pressly Family Trust', 'and who paid it');
      has(list, 'Uncleared', 'marked Uncleared');
      has(await txt(dash + ' .jt-next'), 'Activate job', 'the deposit funds the job: the band moves on');
      await press(dash + ' button[onclick="markPaymentCleared(' + idA + ',\'' + chequeUid + '\')"]', '✓ Mark cleared on the cheque');
      has(dialogs[dialogs.length - 1] || '', 'as cleared today', 'it asks first');
      const j2 = await job(idA);
      eq((j2.payments[0] || {}).clearedOn, await today(), '⚠⚠ the cheque is cleared today');
      eq((j2.payments[0] || {}).clearedBy, 'Anthony Graziano', 'by the job\'s approver, as a payment\'s recorder is');
      const list2 = await txt(dash + ' .jt-pays');
      has(list2, 'Cleared ' + await fmtDay(await today()), 'the list says so');
      eq(await p.locator(dash + ' button[onclick^="markPaymentCleared("]').count(), 0, 'and Mark cleared is gone');
      has(await txt(dash + ' .jt-fb'), 'Marked cleared', 'the notice says what it did');
      eq(await p.evaluate((id) => depositPaidTotal(jobs.find(j => j.id === id)), idA), dep, 'no money moved');
      await settle();
      eq((sheetJob(idA) && sheetJob(idA).payments[0] || {}).clearedOn, await today(), 'and the clear reached the sheet');
    });

    // ════════════════════════════════════════════════════════════════════════════════════════════════════
    await section('B. Void: the dialog says what it does first; the record stays; every total leaves it out', async () => {
      const dep = await p.evaluate((id) => depositTargetFor(jobs.find(j => j.id === id)), idA);
      // The rail's "Deposit received" row, as printed: the day it carries is the deposit's own day.
      const depRow = () => p.evaluate(() => { const r = Array.from(document.querySelectorAll('#client-dashboard-view .jt-row'))
        .find((x) => /^Deposit received/.test((x.querySelector('.jt-lbl') || {}).textContent || '')); return r ? r.textContent.replace(/\s+/g, ' ') : null; });
      has(await depRow(), await fmtDay(await today()), 'fixture: the rail\'s Deposit received row prints the cheque\'s day');
      await press(dash + ' button[onclick="openVoidPayment(' + idA + ',\'' + chequeUid + '\')"]', 'Void on the cheque');
      ok(await p.evaluate(() => document.getElementById('pay-void-modal').checkVisibility()), 'the Void dialog opens');
      has(await txt('#pv-summary'), 'personal cheque on the deposit', 'naming the payment');
      const eff = await txt('#pv-effect');
      has(eff, 'comes off the deposit, leaving $0 of the $' + dep.toLocaleString() + ' due recorded against it.', '⚠⚠ what the void does to the money, before anything is written');
      has(eff, 'The job is no longer funded', 'including the consequence nobody would guess');
      await press('#pv-save-btn', 'Void payment with no reason');
      has(await txt('#pv-fb'), 'Say why it is being voided', 'a blank reason is refused');
      ok(!((await job(idA)).payments[0] || {}).voidedAt, 'and nothing is voided');
      await p.fill('#pv-reason', 'Cheque returned unpaid');
      await press('#pv-save-btn', 'Void payment');
      ok(!(await p.evaluate(() => document.getElementById('pay-void-modal').checkVisibility())), 'the dialog closes');
      const j = await job(idA);
      eq(j.payments.length, 1, '⚠⚠ the record STAYS on the job');
      eq([j.payments[0].voidReason, j.payments[0].voidedBy], ['Cheque returned unpaid', 'Anthony Graziano'], 'void, with why and who');
      const list = await p.evaluate((s) => document.querySelector(s).innerHTML, dash + ' .jt-pays');
      has(list, 'jt-pay void', 'the list keeps it, struck through');
      has(await txt(dash + ' .jt-pays'), 'Void ' + await fmtDay(await today()) + ' · Anthony Graziano — Cheque returned unpaid', 'with when, who and why');
      has(await txt(dash + ' .jt-fb'), 'The job is no longer funded', '⚠ the notice says what the money did');
      eq(await p.evaluate((id) => { const x = jobs.find(j => j.id === id); return [depositPaidTotal(x), jobPaidTotal(x), isJobFunded(x), x.depositReceived]; }, idA),
         [0, 0, false, false], '⚠⚠ every total leaves it out: deposit, job total, funded, and the mirror the activation gate reads');
      has(await txt(dash + ' .jt-next'), 'Record payment', 'the band goes back to recording the deposit');
      const dr = await depRow();
      ok(dr !== null, 'the rail still has its Deposit received row');
      lacks(dr || '', await fmtDay(await today()), '⚠ and it no longer prints the voided cheque\'s day as the deposit\'s');
      await settle();
      ok(!!(sheetJob(idA).payments[0] || {}).voidedAt, 'the void reached the sheet');

      // A fresh cheque funds it again, counted once.
      await press(dash + ' .jt-next button[onclick="dashRecordPayment(' + idA + ',\'deposit\')"]', 'Record payment again');
      has(await p.evaluate(() => document.getElementById('dep-prior').innerHTML), '<s>', 'the recorder lists the void, struck through');
      eq(await p.inputValue('#dep-amount'), String(dep), '⚠ and prefills the whole deposit: the void is not money received');
      await p.selectOption('#dep-method', 'wire');
      await press('#dep-save-btn', 'Record Deposit →');
      eq(await p.evaluate((id) => { const x = jobs.find(j => j.id === id); return [depositPaidTotal(x), isJobFunded(x)]; }, idA), [dep, true],
         '⚠⚠ funded again on the wire alone — counted once, not ' + (2 * dep));
      has(await txt(dash + ' .jt-next'), 'Activate job', 'the band moves on');
      const fin = await p.evaluate((id) => { const r = invoiceHtml(jobs.find(j => j.id === id), 'final'); const d = document.createElement('div'); d.innerHTML = String(r.html).replace(/<\/t[dh]>/g, ' $&');
        return { due: r.amtDue, text: d.textContent.replace(/\s+/g, ' ') }; }, idA);
      const tot = await p.evaluate((id) => estimateStore[id].estimate.havellinTotal, idA);
      eq(Math.round(fin.due), Math.round(tot) - dep, 'the final invoice bills the whole job less the wire alone');
      // The received row, read off the rendered document: "Payments received to date ($12,000)".
      const got = (fin.text.match(/Payments received to date \(\$([\d,]+)\)/) || [])[1] || '';
      eq(got, dep.toLocaleString(), '⚠⚠ its received row is the wire alone — never the voided cheque added in');
      await settle();
    });

    // ════════════════════════════════════════════════════════════════════════════════════════════════════
    await section('C. a stale device that touched the same payment cannot bring the void back (the real sheet merge)', async () => {
      ok(!!morning && !!chequeUid, 'fixture: the morning copy of the job, cheque live');
      // Device B loaded the job this morning and never reloaded: an hour later it attaches the cheque photo to
      // ITS copy of the cheque — live, uncleared — so its stamp on that payment is newer than the void's.
      const later = Date.now() + 3600e3;
      const B = JSON.parse(JSON.stringify(morning));
      B.payments[0].evidence = 'https://drive.google.com/file/d/cheque-photo';
      B.at = Object.assign({}, B.at, { ['payments:' + chequeUid]: later }); B.updatedAt = later;
      S.saveAllJobsToSheet([B]);
      const merged = (sheetJob(idA).payments || []).find((x) => x.uid === chequeUid) || {};
      ok(!!merged.voidedAt, '⚠⚠ the sheet keeps the void (_paymentSticky)');
      eq(merged.evidence, 'https://drive.google.com/file/d/cheque-photo', 'and the photo B attached');
      // The page reads the sheet again, as any device does on load.
      await p.reload(); await p.waitForTimeout(2200); await hook();
      await toDash(idA);
      const j = await job(idA);
      const c = (j.payments || []).find((x) => x.uid === chequeUid) || {};
      ok(!!c.voidedAt, '⚠⚠ after the reload the cheque is still void on this device');
      has(await txt(dash + ' .jt-pays'), 'Cheque returned unpaid', 'and the list still says why');
      eq(await p.evaluate((id) => depositPaidTotal(jobs.find(j => j.id === id)), idA), await p.evaluate((id) => depositTargetFor(jobs.find(j => j.id === id)), idA),
         '⚠ and the deposit counts the wire alone');
    });

    // ════════════════════════════════════════════════════════════════════════════════════════════════════
    let idD = 0;
    await section('D. a bank transfer recorded by hand, then reported by Stripe: one payment, cleared, counted once', async () => {
      idD = await make('Vale');
      await build(idD, { fixed: 24000, won: true, signed: true });
      const mid = await p.evaluate((id) => {
        const j = jobs.find(x => x.id === id);
        const dep = depositTargetFor(j);
        j.payments = [{ id: 1, uid: 'dep-wire-' + id, stage: 'deposit', amount: dep, receivedOn: '2026-09-23', method: 'wire', reference: 'FW-88',
          payer: 'Vale Trust', recordedBy: 'Anthony Graziano', recordedAt: '2026-09-23T15:00:00.000Z', clearedOn: '2026-09-23' }];
        j.depositReceived = true; j.status = 'active'; j.activatedOn = '2026-09-24'; j.activatedBy = 'Ashley Jerome';
        j.docState['invoice:midpoint'] = { draftedAt: '2026-09-28T14:00:00.000Z', sentAt: '2026-09-28T14:05:00.000Z', provider: 'gmail',
          stripe: { linkId: 'plink_mid_' + id, url: 'https://buy.stripe.com/mid' } };
        j.at = Object.assign({}, j.at, { ['payments:dep-wire-' + id]: Date.now() });
        j.updatedAt = Date.now(); saveJobs();
        return paymentSplit(estimateStore[id].estimate.havellinTotal).midpoint;
      }, idD);
      await settle();
      await toDash(idD);
      has(await txt(dash + ' .jt-next'), 'Record payment', 'fixture: the band is on the midpoint payment');
      // The client says "I've paid by the link": the concierge records it by hand.
      await press(dash + ' .jt-next button[onclick="dashRecordPayment(' + idD + ',\'midpoint\')"]', 'the band\'s ✓ Record payment on the midpoint');
      await p.selectOption('#dep-method', 'stripe_ach');
      await p.fill('#dep-amount', String(mid));
      await press('#dep-save-btn', 'Record Midpoint Payment →');
      let j = await job(idD);
      const hand = (j.payments || []).find((x) => x.stage === 'midpoint') || {};
      ok(hand.method === 'stripe_ach' && hand.clearedOn === null && !hand.stripePiId, 'a bank transfer recorded by hand, uncleared');
      has(await txt(dash + ' .jt-pays'), 'Bank transfer (ACH)', 'on the list');
      // Four days later Stripe reports the transfer settled. The last check was inside the ten-minute window,
      // so time passes; then the client is opened again from the client list — an arrival check.
      STRIPE['plink_mid_' + idD] = [{ sessionId: 'cs_1', piId: 'pi_mid_46', status: 'succeeded', amount: mid, payer: 'Vale Trust',
        createdAt: '2026-09-28T18:00:00.000Z' }];
      await p.evaluate((id) => { const st = jobs.find(x => x.id === id).docState['invoice:midpoint'].stripe;
        st.checkedAt = new Date(Date.now() - 11 * 60000).toISOString(); }, idD);
      const before = POSTS.filter((x) => x === 'stripeStatus').length;
      await openFromList(idD);
      await p.waitForTimeout(800); await settle();
      ok(POSTS.filter((x) => x === 'stripeStatus').length > before, 'opening the client asked Stripe');
      j = await job(idD);
      const mids = (j.payments || []).filter((x) => x.stage === 'midpoint');
      eq(mids.length, 1, '⚠⚠ ONE midpoint payment, not two — the hand record took the intent');
      eq([mids[0] && mids[0].stripePiId, mids[0] && mids[0].clearedBy, mids[0] && mids[0].clearedOn], ['pi_mid_46', 'Stripe', await today()],
         'it carries the intent, cleared by Stripe today');
      eq(await p.evaluate((id) => stagePaidTotal(jobs.find(x => x.id === id), 'midpoint'), idD), mid, '⚠⚠ the midpoint counts the money once');
      has(await txt(dash + ' .jt-fb'), 'not recorded twice', 'the notice says why there is one');
      has(await txt(dash + ' .jt-pays'), 'Stripe reported it settled', 'and the list shows who cleared it');
    });

    // ════════════════════════════════════════════════════════════════════════════════════════════════════
    let idE = 0;
    await section('E. a failed Gmail draft falls back to a plain email, is recorded, and can be confirmed sent', async () => {
      idE = await make('Ellsworth');
      await build(idE, { fixed: 24000 });
      await toDash(idE);
      has(await txt(dash + ' .jt-next'), 'Send', 'fixture: the band is on sending the approved estimate');
      GMAIL.fail = true;
      const uploads = POSTS.filter((x) => x === 'uploadHtml').length;
      await press(dash + ' .jt-next button[onclick="docAction(' + idE + ',\'estimate\',\'send\')"]', 'the band\'s ✉ Send estimate');
      await p.waitForTimeout(1500); await settle();
      eq((await p.evaluate(() => window.__mailtos.slice(-1)[0] || '')).indexOf('mailto:tripp%40example.com'), 0, 'Gmail refused, so a plain email opened, to the client');
      const st = ((await job(idE)).docState || {}).estimate || {};
      ok(!!st.draftedAt && st.provider === 'mailto' && !st.sentAt, '⚠⚠ and it is RECORDED as the plain email it is — never as sent');
      const fb = await txt(dash + ' .jt-fb');
      has(fb, 'Gmail draft failed', 'the notice says what failed');
      has(fb, 'a plain email carries NO attachment', 'that nothing is attached');
      has(fb, 'I’ve sent it', 'and what to do next');
      ok(POSTS.filter((x) => x === 'uploadHtml').length > uploads, 'the estimate is filed to Drive, as every send files it');
      has(await txt(dash + ' .jt-next'), 'Opened as a plain email — send it from your mail app, then confirm', 'the band says what the app did');
      await press(dash + ' .jt-next button[onclick="markDocSent(' + idE + ',\'estimate\')"]', '⚠⚠ the band\'s ✓ I\'ve sent it');
      const st2 = ((await job(idE)).docState || {}).estimate || {};
      ok(!!st2.sentAt, '⚠⚠ the send is recorded');
      ok(!!(await job(idE)).estimateSentDate, 'through the estimate\'s own recorder');
      lacks(await txt(dash + ' .jt-next'), 'Opened as a plain email', 'and the band moves on');
      GMAIL.fail = false;
    });

    // ════════════════════════════════════════════════════════════════════════════════════════════════════
    await section('F. ✎ Edit estimate: the link to the pre-edit Drive copy goes with the approval', async () => {
      await settle();
      const st = ((await job(idE)).docState || {}).estimate || {};
      ok(!!st.filedAt && !!st.filedUrl, 'fixture: the sent estimate was filed to Drive');
      const filedBtn = dash + ' button[onclick="openDocFiled(' + idE + ',\'estimate\')"]';
      ok(await p.locator(filedBtn).count() === 1, 'the "📁 Filed estimate" link is on the dashboard');
      await press(dash + ' button[onclick="dashEditEstimate(' + idE + ')"]', '✎ Edit estimate');
      await p.waitForTimeout(600);
      await toDash(idE);
      const st2 = ((await job(idE)).docState || {}).estimate || {};
      ok(!st2.filedAt && !st2.filedUrl, '⚠⚠ the filing record is dropped with the approval');
      eq(await p.locator(filedBtn).count(), 0, '⚠⚠ so nothing offers the pre-edit copy as this estimate');
      await settle();
      ok(!((sheetJob(idE).docState || {}).estimate || {}).filedAt, 'and the sheet agrees');
    });

    // ════════════════════════════════════════════════════════════════════════════════════════════════════
    await section('G. a DocuSign envelope comes back: the client\'s own day and the address DocuSign authenticated', async () => {
      const idG = await make('Birch');
      await build(idG, { fixed: 24000, won: true });
      await p.evaluate((id) => { const j = jobs.find(x => x.id === id);
        j.agrApproved = true; j.agrApprovedAt = 'September 24, 2026';
        j.docState.agreement = { draftedAt: '2026-09-24T14:00:00.000Z', sentAt: '2026-09-24T14:00:00.000Z', provider: 'docusign',
          esign: { envelopeId: 'env-46', status: 'sent', checkedAt: new Date(Date.now() - 40 * 60000).toISOString() } };
        j.agrSent = true; j.agrSentAt = 'September 24, 2026'; j.updatedAt = Date.now(); saveJobs(); }, idG);
      await settle();
      // The client signed at 9:30pm Eastern on the 28th; Anthony countersigned on the 30th.
      ESIGN['env-46'] = { status: 'completed', signerName: 'Tripp Birch', signerEmail: 'tripp.birch@example.com',
        signedAt: '2026-09-29T01:30:00.0000000Z', completedAt: '2026-09-30T14:00:00.0000000Z' };
      await openFromList(idG);
      await p.waitForTimeout(900); await settle();
      const sig = (((await job(idG)).docState || {}).agreement || {}).sig || {};
      eq([sig.signedOn, sig.signerEmail, sig.signedBy], ['2026-09-28', 'tripp.birch@example.com', 'Tripp Birch'],
         '⚠⚠ the signature carries the client\'s own day (the 28th, not the 30th) and the authenticated address');
      const row = await p.evaluate(() => { const r = Array.from(document.querySelectorAll('#client-dashboard-view .jt-rail .jt-row, #client-dashboard-view .jt-row'))
        .find((x) => /Agreement signed/.test(x.textContent)); return r ? r.textContent.replace(/\s+/g, ' ') : ''; });
      has(row, 'Sep 28, 2026', 'the rail row names the day the client signed');
      has(row, 'tripp.birch@example.com', 'and the address DocuSign authenticated');
    });

    // ════════════════════════════════════════════════════════════════════════════════════════════════════
    await section('H. the manager\'s PIN approves an estimate: the concierge is told by a Gmail draft, not a mailto', async () => {
      const idH = await make('Crane');
      await build(idH, { submitted: true });
      await toDash(idH);
      const drafts = GMAIL.drafts.length, mailtos = await p.evaluate(() => window.__mailtos.length);
      await press(dash + ' .jt-next button[onclick="dashApproveEstimate(' + idH + ')"]', 'the band\'s Manager approval');
      await p.fill('#pin-input', '3010');
      await p.waitForTimeout(1500);
      ok(!!(await p.evaluate((id) => estimateStore[id] && estimateStore[id].approved, idH)), 'the PIN approves the estimate');
      const mine = GMAIL.drafts.slice(drafts).filter((m) => /Estimate Approved/.test(Buffer.from((m.match(/Subject: =\?UTF-8\?B\?([^?]+)\?=/) || [])[1] || '', 'base64').toString('utf8')));
      eq(mine.length, 1, '⚠⚠ one Gmail draft tells the concierge');
      has(mine[0] || '', 'To: ashley', 'addressed to the concierge on the job');
      eq(await p.evaluate(() => window.__mailtos.length), mailtos, 'and no mailto opened');
    });

    // ════════════════════════════════════════════════════════════════════════════════════════════════════
    await section('I. the payments list and the Void dialog fit at 1440 and 390; no page errors', async () => {
      await toDash(idA);
      ok(await p.locator(dash + ' .jt-pay').count() >= 2, 'fixture: the list holds the void and the wire');
      eq(await overflow(), 0, 'no horizontal overflow at 1440');
      await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(400);
      await toDash(idA);
      eq(await overflow(), 0, 'none at 390 with the payments list on screen');
      const w = await p.evaluate(() => { const el = document.querySelector('#client-dashboard-view .jt-pays'); return el ? el.getBoundingClientRect().width : 0; });
      ok(w > 200 && w <= 390, 'the list fits the phone (' + Math.round(w) + 'px)');
      const wire = ((await job(idA)).payments || []).find((x) => !x.voidedAt) || {};
      await press(dash + ' button[onclick="openVoidPayment(' + idA + ',\'' + wire.uid + '\')"]', 'Void on the wire, on a phone');
      eq(await overflow(), 0, 'none with the Void dialog open at 390');
      await press('#pay-void-modal button[onclick="closeVoidPayment()"]', 'Cancel');
      ok(!((await job(idA)).payments || []).find((x) => x.uid === wire.uid).voidedAt, 'Cancel voids nothing');
      await p.setViewportSize({ width: 1440, height: 1000 }); await p.waitForTimeout(300);
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
