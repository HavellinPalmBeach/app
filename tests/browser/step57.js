// Step 57 — P19 · W4 site-plan (2026-10-03): what the crew finds in the house, the trustee's list, custody on a trust.
// Anthony, 2026-10-03: "i'm good with all of your calls. build it all".
//
// Drives the REAL page through its own controls — the client list, the nav, the Found on site card's buttons, the
// dialog's fields and its Record button, the File signed receipt picker — against one routed Apps Script (its stores,
// getSubfolders and uploadFile answered as the deployment would). What is seeded is state a person could not type in
// one sitting: won, active trust estates with an approved estimate.
//
//   A. A trust administration at the Standard level: chain of custody is mandatory on the header (it was not); the
//      Certification of Trust chip is red with its fix; Before Day 1 carries the Trust gate box; the two in-house boxes
//      point at Found on site. A second trust estate with the 706 unanswered shows the Form 706 chip, red, with its fix.
//   B. Record an original will through the card and the dialog: refused without a description, then recorded; the
//      card's line is red ("held by Havellin … today"); the desk's Job Admin card carries it first, red, beside the
//      trustee's own list.
//   C. Print Receipt for Original Will: the statement, the description escaped, the blank lines; it fits a Letter page
//      under print media.
//   D. Record the hand-over (the attorney and today by default); the deposit line falls due ten days later; File signed
//      receipt, a PDF through the real picker, to the routed Apps Script (Signed Records, uploadFile): the receipt line
//      goes green; Confirm the deposit with the clerk: every line green.
//   E. Record cash found: one name twice is refused; two people and a bag number recorded; red until handed over; the
//      hand-over recorded (the fiduciary and today by default); Print Cash Count and Receipt (two counters' lines, the
//      fiduciary's for the bag); File signed receipt, a photograph: green.
//   F. Overflow at 1440 and 390 with the card on screen and with the dialog open; no page errors.
//
//   NODE_PATH=/opt/node22/lib/node_modules node tests/browser/step57.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');

const SYNC = 'https://script.google.com/macros/s/STEP57/exec';
const STORE = { jobs: [], estimates: {} };
const UPLOADS = [], SUBFOLDER_ASKS = [];
// A calendar date N days on, worked out here (never by the code under test), printed the way fmtDate2 prints it.
const plusDays = (ymd, n) => { const [y, m, d] = ymd.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10); };
const pretty = (ymd) => { const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }); };

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
        if (body.type === 'saveAllJobs') { STORE.jobs = body.payload || []; return json({ ok: true }); }
        if (body.type === 'saveAllEstimates') { Object.assign(STORE.estimates, body.payload || {}); return json({ ok: true }); }
        if (body.action === 'getSubfolders') { SUBFOLDER_ASKS.push(body.folderId);
          return json({ ok: true, subfolders: { 'Signed Records': { id: 'SIGNED-' + body.folderId }, 'Estate Inventory': { id: 'INV-' + body.folderId } } }); }
        if (body.action === 'uploadFile') {
          UPLOADS.push({ folderId: body.folderId, filename: body.filename, kind: String(body.dataUrl || '').slice(0, 30) });
          return json({ ok: true, fileUrl: 'https://drive.google.com/file/d/sr' + UPLOADS.length + '/view', fileId: 'sr' + UPLOADS.length });
        }
        return json({ ok: true });
      }
      switch (action) {
        case 'loadJobs': return json({ jobs: STORE.jobs, deletedJobs: [] });
        case 'loadEstimates': return json({ ok: true, estimates: STORE.estimates });
        case 'loadJobPlans': return json({ ok: true, jobPlans: {} });
        case 'loadLogs': return json({ ok: true, logs: {} });
        case 'loadChangeOrders': return json({ ok: true, changeOrders: [] });
        case 'loadContractors': return json({ ok: true, contractors: { added: [], defaults: [] } });
        case 'loadMedia': return json({ ok: true, media: {} });
        case 'version': return json({ ok: false, error: 'Unknown action' });
        default: return json({ ok: false, error: 'not in this test: ' + action });
      }
    });

    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    p.on('dialog', async (d) => { await d.accept(); });
    await p.goto(APP); await p.waitForTimeout(1800);
    // window.print is where _printDocument hands off: read the print target at that moment.
    const hookPrint = () => p.evaluate(() => { window.__prints = []; window.print = function () {
      const pt = document.getElementById('print-target'); window.__prints.push({ html: pt ? pt.innerHTML : '', title: document.title }); }; });
    await hookPrint();

    const section = async (name, body) => {
      console.log('\n## ' + name);
      try { await body(); } catch (e) { fail++; console.log('  ✗ ' + name + ' threw: ' + String(e && e.message || e).split('\n')[0]); }
    };
    const vis = (sel) => p.locator(sel).first().isVisible().catch(() => false);
    const press = async (sel, what) => {
      const n = await p.locator(sel).count();
      const v = n === 1 && await vis(sel);
      ok(v, (what || sel) + ' — one control, on screen (' + n + ')');
      if (v) { await p.click(sel, { timeout: 5000 }).catch((e) => ok(false, (what || sel) + ' — ' + e.message.split('\n')[0])); await p.waitForTimeout(450); }
      return v;
    };
    const type = async (sel, value, what) => {
      const v = await vis(sel);
      ok(v, (what || sel) + ' — on screen to type into');
      if (v) { await p.fill(sel, value, { timeout: 5000 }).catch((e) => ok(false, (what || sel) + ' — ' + e.message.split('\n')[0])); await p.waitForTimeout(120); }
    };
    const val = (sel) => p.evaluate((s) => { const e = document.querySelector(s); return e ? e.value : null; }, sel);
    const txt = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }, sel);
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const job = (id) => p.evaluate((id) => JSON.parse(JSON.stringify(jobs.find((j) => j.id === id) || null)), id);
    const settle = async () => {
      for (let i = 0; i < 60; i++) {
        await p.waitForTimeout(150);
        const idle = await p.evaluate(() => !_outboxSending && !_flushing && !_outboxTimer && !Object.keys(_outbox).length && !Object.keys(_pendingWrites).length);
        if (idle) return true;
      }
      return false;
    };
    const until = async (f, ms) => { for (let i = 0; i < (ms || 8000) / 150; i++) { if (await f()) return true; await p.waitForTimeout(150); } return false; };
    // The derived lines on the Found on site card: label, state, detail.
    const findLines = (id) => p.evaluate((id) => Array.from(document.querySelectorAll('#plan-derived-finds-' + id + ' .pl-line')).map((e) => ({
      lbl: (e.querySelector('.pl-lbl') || {}).textContent || '', ok: e.classList.contains('pl-ok'), red: e.classList.contains('pl-red'),
      det: ((e.querySelector('.pl-det') || {}).textContent || '').replace(/\s+/g, ' ') })), id);
    // Open a client the way a person does: the Clients nav, the row, then the Job Plan nav.
    const openPlan = async (id) => {
      await p.evaluate(() => { const nb = document.querySelector('.nb[onclick*="\'jobs\'"]'); if (nb) nb.click(); });
      await p.waitForTimeout(300);
      const row = '#panel-jobs tr[onclick="openClientDashboard(' + id + ')"]';
      const n = await p.locator(row).count();
      ok(n >= 1, 'the client is on the client list (' + n + ')');
      if (n) { await p.locator(row).first().click(); await p.waitForTimeout(700); }
      await p.click('.nb:has-text("Job Plan")'); await p.waitForTimeout(900);
      eq(await val('#plan-job'), String(id), 'the Job Plan opens on that client');
    };
    const seed = async (j, est) => {
      await p.evaluate(([j, est]) => {
        jobs = jobs.filter((x) => x.id !== j.id);
        jobs.unshift(j);
        estimateStore[j.id] = { approved: true, approvedBy: 'Anthony Graziano', approvedAt: 'September 20, 2026', estimate: est, savedAt: Date.now() };
        try { localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore)); } catch (x) {}
        postSyncBadge({ type: 'saveAllEstimates', payload: estimateStore }, 'ok', 'fail');
        saveJobs(); renderJobs();
      }, [j, est]);
      await settle();
    };
    const EST = (id) => ({ jobId: id, svc: 'cleanout', havellinTotal: 24000, fixedPrice: false, totTC: 40, totPS: 60, days: 5,
      rooms: [{ idx: 0, name: 'Study', st: 'in', vol: 3, cplx: 3 }, { idx: 1, name: 'Primary Suite', st: 'in', vol: 3, cplx: 3 }],
      collections: [], vendors: [], prepItems: [] });
    const TRUST = (id, extra) => Object.assign({ id: id, hvlId: 'HVL-2610-' + id, name: 'Estate of Harold Adler', fname: 'Harold', lname: 'Adler',
      svc: 'cleanout', matterType: 'trust', docTier: 'values', addr: '100 Ocean Blvd', city: 'Palm Beach', zip: '33480',
      deathDate: '2026-07-14', executor: 'Ruth Adler', executorFname: 'Ruth', executorLname: 'Adler', executorRole: 'Trustee',
      executorEmail: 'ruth@example.com', executorPhone: '(561) 555-0101', executorAuth: 'pending',
      probateAttyName: 'Richard Comiter', probateAttyFirm: 'Comiter Law', probateAttyEmail: 'rc@example.com',
      tc: 'Ashley Jerome', status: 'active', won: true, wonAt: '2026-09-29', approved: true, created: '2026-09-20',
      start: '2026-10-05', walkthrough: '2026-09-28', activatedOn: '2026-10-01', depositReceived: true, agrSigned: true,
      driveFolder: 'https://drive.google.com/drive/folders/ROOT' + id,
      crew: { tc: { name: 'Ashley Jerome', locked: true }, tc2: { name: '', locked: false }, ps: [{ name: 'Anthony Graziano Jr', locked: true }], confirmed: true },
      payments: [{ id: 1, uid: 'dep' + id, stage: 'deposit', amount: 12000, receivedOn: '2026-09-30', method: 'wire', clearedOn: '2026-09-30' }] }, extra || {});
    const TODAY = await p.evaluate(() => _todayStr());

    // ── A ────────────────────────────────────────────────────────────────────────────────────────────
    await section('A. a trust estate: custody mandatory, the Certification chip, the Trust gate, the boxes pointing at Found on site; the 706 chip', async () => {
      await seed(TRUST(5701, { gate706: 'no' }), EST(5701));
      eq(await p.evaluate(() => isFormalDoc(jobs.find((j) => j.id === 5701))), false, 'fixture: the trust estate is at the Standard level (706 answered no)');
      await openPlan(5701);
      has(await txt('#job-plan-header'), 'Chain of custody is mandatory on this job', '⚠⚠ D4: chain of custody is mandatory on a trust administration at Standard');
      const chip = await p.evaluate(() => { const c = document.querySelector('#plan-gates-5701 [data-gate="certification"]'); return c ? { t: c.textContent, red: c.classList.contains('gate-no') } : null; });
      eq(chip && chip.red, true, '⚠ the Certification of Trust chip, red while pending');
      has(chip && chip.t, 'Certification of Trust on file', 'naming the paper');
      has(await txt('#plan-gates-5701 .gate-fixes'), 'successor trustee’s proof of authority (§736.1017)', 'with its fix under the row');
      eq(await p.locator('#plan-gates-5701 [data-gate="letters"]').count(), 0, 'and no Letters chip on a trust');
      eq(await p.locator('#plan-gates-5701 [data-gate="form_706"]').count(), 0, 'a 706 answered no has no 706 chip');
      has(await txt('#stage-p0'), 'Certification of Trust (§736.1017) read — any limits on the trustee’s powers noted', 'Before Day 1 carries the Trust gate box');
      ok(await p.locator('#stage-p0 input[onchange*="\'trustee_authority\'"]').count() === 1, 'as a real box');
      const rooms = await txt('#stage-rooms');
      has(rooms, 'an original will is recorded under Found on site, below', 'the papers box points at Found on site');
      has(rooms, 'cash is counted and handed over under Found on site, below', 'and the valuables box');
      lacks(rooms, 'PR sign-off', 'no "PR" in the boxes');
      ok(await vis('#plan-finds-5701'), 'the Found on site card is on the In the house stage');

      await seed(TRUST(5702, { gate706: '', name: 'Estate of Mae Lyle', fname: 'Mae', lname: 'Lyle', deathDate: '2026-05-31' }), EST(5702));
      await openPlan(5702);
      const c706 = await p.evaluate(() => { const c = document.querySelector('#plan-gates-5702 [data-gate="form_706"]'); return c ? { t: c.textContent, red: c.classList.contains('gate-no') } : null; });
      eq(c706 && c706.red, true, '⚠ D5: the Form 706 chip, red while the 706 is unanswered');
      has(c706 && c706.t, 'Form 706 due Feb 28, 2027, if one is filed', 'nine months after 31 May is the last day of February, and unfirm');
      has(await txt('#plan-gates-5702 .gate-fixes'), 'Form 706 being filed? under Edit Client', 'its fix names the question and where');
    });

    // ── B ────────────────────────────────────────────────────────────────────────────────────────────
    let WILL = null;
    await section('B. record an original will: refused without a description, recorded, red while Havellin holds it', async () => {
      await openPlan(5701);
      await press('#plan-finds-5701 button:has-text("Record an original will")', 'Record an original will');
      ok(await vis('#fos-modal .modal-box'), 'the dialog opens');
      eq(await txt('#fos-title'), 'Record an original will', 'titled for the act');
      eq(await val('#fos-date'), TODAY, 'found on: today');
      eq(await val('#fos-handed-to'), 'Richard Comiter', 'handed to: the estate attorney, by default');
      ok(!(await vis('#fos-amount')), 'no cash fields');
      await type('#fos-where', 'study, desk drawer', 'Where in the house');
      await type('#fos-found-by', 'Anthony Graziano Jr', 'Found by');
      await press('#fos-save-btn', 'Record');
      has(await txt('#fos-fb'), 'what it looks like from the outside', '⚠ refused without the description, naming it');
      eq(((await job(5701)).siteFinds || []).length, 0, 'and nothing is written');
      await type('#fos-desc', 'Sealed white envelope marked <Last Will> in ink, unopened', 'What it looks like from the outside');
      await press('#fos-save-btn', 'Record');
      ok(!(await vis('#fos-modal .modal-box')), 'the dialog closes');
      const j = await job(5701);
      WILL = (j.siteFinds || [])[0] || null;
      eq(WILL && [WILL.kind, WILL.foundOn, WILL.foundBy, WILL.where], ['will', TODAY, 'Anthony Graziano Jr', 'study, desk drawer'], 'the find is on the job');
      ok(WILL && !WILL.handedOn, 'with no hand-over yet');
      ok(WILL && typeof (j.at || {})['siteFinds:' + WILL.id] === 'number', 'stamped on its own key');
      const L = await findLines(5701);
      eq(L.map((l) => [l.lbl, l.red]), [['Original will held by Havellin', true]], '⚠⚠ one line on the card, RED');
      has(L[0] && L[0].det, 'hand it to Richard Comiter today, against a signed receipt', 'saying to whom, today');
      eq(await p.evaluate(() => { const l = document.querySelector('#plan-derived-finds-5701 .pl-red .pl-lbl'); return l ? getComputedStyle(l).color : ''; }),
         'rgb(121, 31, 31)', 'drawn in the error colour (--err-tx), not the grey of an open line');
      has(await txt('#plan-finds-5701'), 'Sealed white envelope marked <Last Will> in ink, unopened', 'the description shown as typed, as text');

      // The desk card: the reminder first, red; the trustee's own list beside it.
      await p.click('.nb:has-text("Job Admin")'); await p.waitForTimeout(700);
      eq(await val('#inv-job'), '5701', 'the desk follows the client');
      if (!(await vis('#plan-derived-admin-5701'))) await press('.ja-card .ja-hd', 'Job Admin — desk paperwork');
      const desk = await p.evaluate(() => { const first = document.querySelector('#plan-derived-admin-5701 .pl-line');
        return first ? { lbl: first.textContent.replace(/\s+/g, ' '), red: first.classList.contains('pl-red') } : null; });
      eq(desk && desk.red, true, '⚠⚠ the desk card carries it FIRST, red');
      has(desk && desk.lbl, 'Original will held by Havellin', 'the same line');
      const card = await txt('.ja-card');
      has(card, 'Trust administration', 'D3: the trustee\'s list, under a heading with no court in it (textContent: the stylesheet uppercases it)');
      has(card, 'Trust Schedule verified — date-of-death FMV on every line', 'the schedule check');
      has(card, 'Disposition records delivered for the trustee’s accounting (§736.08135)', 'the records for the trustee\'s accounting');
      lacks(card, 'PR sign-off', '⚠ and no sign-off box');
      lacks(card, '733.604', 'nothing on a trust cites the court\'s statute');
    });

    // ── C ────────────────────────────────────────────────────────────────────────────────────────────
    await section('C. Print Receipt for Original Will: the statement, the blanks, a Letter page under print media', async () => {
      await openPlan(5701);
      await hookPrint();
      await press('#plan-finds-5701 button:has-text("Print Receipt for Original Will")', 'Print Receipt for Original Will');
      ok(await until(() => p.evaluate(() => (window.__prints || []).length > 0)), 'the print dialog is reached');
      const pr = await p.evaluate(() => (window.__prints || [])[0] || { html: '', title: '' });
      has(pr.html, 'Receipt for Original Will', 'the form');
      has(pr.html, 'Havellin has not opened it, read its contents or copied it, and keeps no copy of it in any form', '⚠ delivered as found, unopened, no copy kept');
      has(pr.html, '&lt;Last Will&gt;', 'the description escaped on paper');
      has(pr.html, 'Received by: ____', 'a line for the person receiving it');
      has(pr.html, 'Delivered by: ____', 'and for Havellin');
      ok(/^Havellin Receipt for Original Will - 100 Ocean Blvd - /.test(pr.title), 'the PDF is named for the form and the property: ' + pr.title);
      // Print media: the form on a Letter page's printable width (8.5in less the .5in side margins = 7.5in = 720px).
      await p.setViewportSize({ width: 720, height: 1000 });
      await p.emulateMedia({ media: 'print' });
      const paper = await p.evaluate((h) => { const pt = document.getElementById('print-target'); pt.innerHTML = h; pt.style.display = 'block';
        const sig = Array.from(pt.querySelectorAll('div')).filter((d) => /Received by:/.test(d.textContent) && !d.querySelector('div'))[0];
        return { over: pt.scrollWidth - pt.clientWidth, docOver: document.documentElement.scrollWidth - document.documentElement.clientWidth,
                 sig: !!(sig && sig.checkVisibility()) }; }, pr.html);
      ok(paper.over <= 0 && paper.docOver <= 0, 'it fits the printable width (' + paper.over + ', ' + paper.docOver + ')');
      eq(paper.sig, true, 'the signature line is on the page');
      await p.emulateMedia({ media: 'screen' });
      await p.evaluate(() => { const pt = document.getElementById('print-target'); pt.innerHTML = ''; pt.style.display = 'none'; });
      await p.setViewportSize({ width: 1440, height: 1000 });
    });

    // ── D ────────────────────────────────────────────────────────────────────────────────────────────
    await section('D. the hand-over, the ten days, the signed receipt filed to Drive, the deposit with the clerk', async () => {
      await openPlan(5701);
      const row = '#plan-finds-5701 .fos-find[data-find="' + (WILL && WILL.id) + '"]';
      await press(row + ' button:has-text("Record the hand-over")', 'Record the hand-over');
      eq(await txt('#fos-title'), 'Record the hand-over', 'the dialog, for the hand-over');
      eq([await val('#fos-handed-to'), await val('#fos-handed-on')], ['Richard Comiter', TODAY], 'the attorney and today, by default');
      ok(!(await vis('#fos-desc')), 'the find\'s own fields are not offered again');
      await press('#fos-save-btn', 'Record the hand-over');
      let j = await job(5701);
      eq([j.siteFinds[0].handedTo, j.siteFinds[0].handedOn], ['Richard Comiter', TODAY], 'recorded on the find');
      let L = await findLines(5701);
      eq(L.map((l) => [l.lbl, l.ok, l.red]), [['Original will handed over against a signed receipt', false, false], ['Original will deposited with the clerk', false, false]],
         'handed over: the receipt and the deposit open, neither red');
      has(L[1] && L[1].det, 'due ' + pretty(plusDays(TODAY, 10)) + ', ten days after the hand-over', '⚠ the deposit falls due ten days after the hand-over');
      has(L[1] && L[1].det, '§732.901', 'citing the custodian\'s duty');
      lacks(await txt(row), 'Record the hand-over', 'the hand-over is not offered twice');

      // File the receipt the attorney signed: the label opens the picker, the picker takes the PDF.
      const lbl = row + ' label:has-text("File signed receipt")';
      ok(await vis(lbl), 'File signed receipt is offered once the hand-over is recorded');
      const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click(lbl)]);
      await fc.setFiles({ name: 'will-receipt-signed.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 step57 will receipt ' + 'x'.repeat(200)) });
      ok(await until(async () => ((await job(5701)).signedRecords || []).length === 1), 'the signed copy is recorded on the job');
      j = await job(5701);
      const sr = (j.signedRecords || [])[0] || {};
      eq([sr.kind, sr.ref, sr.signedBy, sr.signedOn], ['will', WILL.id, 'Richard Comiter', TODAY], '⚠ as this will\'s receipt, signed by whom it went to, on the hand-over day');
      eq(UPLOADS.length, 1, 'one upload to the routed Apps Script');
      eq(UPLOADS[0] && UPLOADS[0].folderId, 'SIGNED-ROOT5701', 'into the client\'s Signed Records folder');
      has(UPLOADS[0] && UPLOADS[0].filename, 'Signed receipt for the original will', 'named for what it is');
      has(UPLOADS[0] && UPLOADS[0].kind, 'data:application/pdf', 'carrying the PDF');
      await p.waitForTimeout(400);
      L = await findLines(5701);
      eq(L[0] && L[0].ok, true, 'the receipt line goes green');
      ok(await p.locator(row + ' a:has-text("Signed receipt for the original will")').count() === 1, 'and the filed copy is linked on the find');

      await press(row + ' button:has-text("Confirm the deposit with the clerk")', 'Confirm the deposit with the clerk');
      eq(await val('#fos-dep-by'), 'Richard Comiter', 'confirmed by: whoever holds it, by default');
      await type('#fos-dep-on', TODAY, 'Deposited with the clerk on');
      await press('#fos-save-btn', 'Record the deposit');
      L = await findLines(5701);
      eq(L.map((l) => l.ok), [true, true], '⚠⚠ received against a signed receipt and deposited: every line green');
      has(L[1] && L[1].det, 'confirmed by Richard Comiter', 'naming who confirmed it');
    });

    // ── E ────────────────────────────────────────────────────────────────────────────────────────────
    let CASH = null;
    await section('E. cash: one name twice refused; two counters and a bag recorded; red until handed over; the form; the receipt filed', async () => {
      await openPlan(5701);
      await press('#plan-finds-5701 button:has-text("Record cash found")', 'Record cash found');
      eq(await txt('#fos-title'), 'Record cash found', 'the dialog, for cash');
      eq(await txt('#fos-date-lbl'), 'Counted on', 'the count\'s date');
      eq(await val('#fos-handed-to'), 'Ruth Adler', 'handed to: the fiduciary, by default');
      await type('#fos-where', 'hall closet, shoebox', 'Where in the house');
      await type('#fos-amount', '1240.50', 'Amount counted');
      await type('#fos-counter1', 'Ashley Jerome', 'Counted by');
      await type('#fos-counter2', 'ashley jerome', 'And by');
      await type('#fos-bag', 'B-1049', 'Sealed bag number');
      await press('#fos-save-btn', 'Record');
      has(await txt('#fos-fb'), 'Two different people count the cash', '⚠⚠ one person named twice is refused');
      eq(((await job(5701)).siteFinds || []).length, 1, 'nothing more is written');
      await type('#fos-counter2', 'Anthony Graziano Jr', 'And by');
      await press('#fos-save-btn', 'Record');
      ok(!(await vis('#fos-modal .modal-box')), 'recorded, the dialog closes');
      CASH = ((await job(5701)).siteFinds || []).filter((f) => f.kind === 'cash')[0] || null;
      eq(CASH && [CASH.amount, CASH.countedBy, CASH.bagNo], [1240.5, ['Ashley Jerome', 'Anthony Graziano Jr'], 'B-1049'], 'the count on the job');
      let L = await findLines(5701);
      const held = L.filter((l) => l.lbl === 'Cash held by Havellin')[0];
      eq(held && held.red, true, '⚠ cash still held: RED');
      has(held && held.det, '$1,240.50 in sealed bag No. B-1049', 'naming the money and the bag');
      has(held && held.det, 'hand it to Ruth Adler today', 'and to whom');

      const row = '#plan-finds-5701 .fos-find[data-find="' + (CASH && CASH.id) + '"]';
      await press(row + ' button:has-text("Record the hand-over")', 'Record the hand-over (cash)');
      eq([await val('#fos-handed-to'), await val('#fos-handed-on')], ['Ruth Adler', TODAY], 'the fiduciary and today, by default');
      await press('#fos-save-btn', 'Record the hand-over');
      L = await findLines(5701);
      const open = L.filter((l) => l.lbl === 'Cash count receipt filed')[0];
      eq(open && [open.ok, open.red], [false, false], 'handed over: the count\'s receipt line, open until filed');

      await hookPrint();
      await press(row + ' button:has-text("Print Cash Count and Receipt")', 'Print Cash Count and Receipt');
      ok(await until(() => p.evaluate(() => (window.__prints || []).length > 0)), 'the print dialog is reached');
      const pr = await p.evaluate(() => (window.__prints || [])[0] || { html: '' });
      has(pr.html, '<strong>$1,240.50</strong>', 'the amount, to the cent');
      eq((pr.html.match(/Counted by: ____/g) || []).length, 2, '⚠ a signature line for each counter');
      has(pr.html, 'Received sealed bag No. B-1049, seal intact: ____', 'and the fiduciary\'s, for the sealed bag');
      has(pr.html, 'Ruth Adler, Trustee', 'naming the fiduciary and the role');
      await p.waitForTimeout(800);

      const lbl = row + ' label:has-text("File signed receipt")';
      const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click(lbl)]);
      await fc.setFiles({ name: 'IMG_0042.jpg', mimeType: 'image/jpeg', buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70, 0, 1]) });
      ok(await until(async () => ((await job(5701)).signedRecords || []).filter((r) => r.kind === 'cash').length === 1), 'the photograph of the signed form is recorded');
      const sr = ((await job(5701)).signedRecords || []).filter((r) => r.kind === 'cash')[0] || {};
      eq([sr.ref, sr.signedBy], [CASH && CASH.id, 'Ashley Jerome; Anthony Graziano Jr; Ruth Adler'], 'as the count\'s receipt, signed by both counters and the fiduciary');
      has(UPLOADS[1] && UPLOADS[1].kind, 'data:image/jpeg', 'a photograph, uploaded as one');
      await p.waitForTimeout(400);
      L = await findLines(5701);
      eq(L.every((l) => l.ok), true, '⚠⚠ every line on the card green: the will deposited, the cash signed for');
    });

    // ── F ────────────────────────────────────────────────────────────────────────────────────────────
    await section('F. overflow at 1440 and 390, with the card and with the dialog; no page errors', async () => {
      await openPlan(5701);
      ok(await overflow() <= 0, 'the Job Plan fits at 1440 (' + await overflow() + ')');
      await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(300);
      ok(await overflow() <= 0, 'and at 390 (' + await overflow() + ')');
      const cardW = await p.evaluate(() => { const c = document.getElementById('plan-finds-5701'); return c ? c.scrollWidth - c.clientWidth : 99; });
      ok(cardW <= 0, 'the Found on site card does not overflow itself at 390 (' + cardW + ')');
      await press('#plan-finds-5701 button:has-text("Record cash found")', 'Record cash found, on a phone');
      ok(await p.evaluate(() => document.getElementById('fos-save-btn').checkVisibility()), 'the dialog\'s Record button is on screen at 390');
      ok(await overflow() <= 0, 'the dialog fits at 390 (' + await overflow() + ')');
      await press('#fos-modal button:has-text("Cancel")', 'Cancel');
      await p.setViewportSize({ width: 1440, height: 1000 });
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
