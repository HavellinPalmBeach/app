// Step 82 — Incident reporting on a job (P26, 2026-10-16; Anthony: anything that goes wrong, recorded the same day).
//
// On a 390 px phone, through the REAL controls: the Incidents card on the Job Plan's In the house stage, Report an incident,
// a damage report with a photograph (uploaded to the Incident Reports folder and recorded as an entry), the amber header
// chip; an injury, whose red banner says CALL ANTHONY IMMEDIATELY with his number until I called Anthony is pressed; the
// dashboard's Work complete row flagged and Close job refused by name; both incidents resolved with a note; the close going
// through and filing the Incident Record to Drive; the record printed from the card; zero page errors and no horizontal
// overflow at 390 or 1440.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step82.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');

const SYNC = 'https://script.google.com/macros/s/STEP82/exec';
const ID = 8201;
const UPLOADS = [], HTMLS = [];

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'America/New_York', isMobile: true, hasTouch: true });
    await ctx.addInitScript((u) => { try { localStorage.setItem('hav_sheets_url', u); localStorage.setItem('hav_device_user', 'Ashley Jerome'); } catch (e) {} }, SYNC);
    await ctx.route(SYNC + '**', async (route) => {
      const req = route.request(), url = new URL(req.url()), action = url.searchParams.get('action');
      const json = (o) => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(o) });
      if (req.method() === 'POST') {
        let body = {}; try { body = JSON.parse(req.postData() || '{}'); } catch (e) {}
        if (body.action === 'uploadFile') { UPLOADS.push({ folderId: body.folderId, filename: body.filename }); return json({ ok: true, fileUrl: 'https://drive.google.com/file/d/U' + UPLOADS.length + '/view', fileId: 'U' + UPLOADS.length }); }
        if (body.action === 'uploadHtml') { HTMLS.push({ folderId: body.folderId, filename: body.filename || body.name, html: body.html || body.content || '' }); return json({ ok: true, fileUrl: 'https://drive.google.com/file/d/H' + HTMLS.length + '/view', fileId: 'H' + HTMLS.length }); }
        if (body.action === 'getSubfolders') return json({ ok: true, subfolders: { 'Incident Reports': 'SUBINC82', 'Estate Inventory': 'SUBINV82' } });
        return json({ ok: true });
      }
      switch (action) {
        case 'loadJobs': return json({ jobs: [], deletedJobs: [] });
        case 'loadEstimates': return json({ ok: true, estimates: {} });
        case 'loadJobPlans': return json({ ok: true, jobPlans: {} });
        case 'loadLogs': return json({ ok: true, logs: {} });
        case 'loadChangeOrders': return json({ ok: true, changeOrders: [] });
        case 'loadContractors': return json({ ok: true, contractors: { added: [], defaults: [] } });
        case 'loadMedia': return json({ ok: true, media: {} });
        case 'version': return json({ ok: true, version: '2026-10-16', actions: [], types: [] });
        default: return json({ ok: false, error: 'not in this test: ' + action });
      }
    });

    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    const dialogs = [];
    let promptAnswer = null;
    p.on('dialog', async (d) => {
      dialogs.push({ type: d.type(), msg: d.message() });
      if (d.type() === 'prompt') await d.accept(promptAnswer == null ? d.defaultValue() : promptAnswer); else await d.accept();
    });
    await p.goto(APP); await p.waitForTimeout(1800);
    await p.evaluate(() => { const bn = document.getElementById('backend-stale-banner'); if (bn) bn.remove(); window.__opened = []; window.open = function (u) { window.__opened.push(u); return null; };
      window.__printed = ''; window.print = function () { var t = document.getElementById('print-target'); window.__printed = t ? t.innerHTML : ''; }; });

    const section = async (name, body) => {
      console.log('\n## ' + name);
      try { await body(); } catch (e) { fail++; console.log('  ✗ ' + name + ' threw: ' + String(e && e.message || e).split('\n')[0]); }
    };
    const vis = (sel) => p.locator(sel).first().isVisible().catch(() => false);
    const press = async (sel, what) => {
      const n = await p.locator(sel).count();
      const v = n >= 1 && await vis(sel);
      ok(v, (what || sel) + ' — on screen (' + n + ')');
      if (v) { await p.locator(sel).first().click({ timeout: 5000 }).catch((e) => ok(false, (what || sel) + ' — ' + e.message.split('\n')[0])); await p.waitForTimeout(600); }
      return v;
    };
    const txt = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }, sel);
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const job = () => p.evaluate((id) => JSON.parse(JSON.stringify(jobs.find((j) => j.id === id) || null)), ID);
    const incidents = async () => ((await job()) || {}).incidents || [];
    const card = '#plan-incidents-' + ID;

    // ── Seed: an active Home Transition, the Hallorans, with its estimate ──────────────────────────────────────────────
    await p.evaluate((ID) => {
      const T = Date.now() - 86400000;
      jobs = jobs.filter((j) => j.id !== ID);
      jobs.unshift({ id: ID, hvlId: 'HVL-2611-' + ID, svc: 'downsizing_move', status: 'active', won: true, approved: true, wonAt: '2026-10-20', created: 'Oct 6, 2026',
        walkthrough: '2026-10-08', tc: 'Ashley Jerome', addr: '200 Seaview Ave', city: 'Palm Beach', zip: '33480', name: 'Margaret Halloran', fname: 'Margaret', lname: 'Halloran',
        email: 'margaret@halloran.example', destAddr: '4 Harbor Ct', destCity: 'Jupiter', destSqft: 2200, start: '2026-11-02', activatedOn: '2026-11-02', activatedBy: 'Ashley Jerome',
        agrApproved: true, agrApprovedBy: 'Anthony Graziano', agrSent: true, agrSigned: true,
        docState: { agreement: { sentAt: '2026-10-25T14:00:00.000Z', sig: { how: 'wet', signedBy: 'Margaret Halloran', signedOn: '2026-10-26', recordedBy: 'Ashley Jerome' } },
                    invoice_deposit: { sentAt: '2026-10-26T14:00:00.000Z' } },
        driveFolder: 'https://drive.google.com/drive/folders/ROOT' + ID,
        driveSubfolders: { 'Estate Inventory': 'SUBINV82', 'As-Found Record': 'SUBAF82', 'Signed Records': 'SR82', 'Incident Reports': 'SUBINC82', Agreement: 'AGR82' },
        at: {}, updatedAt: T, payments: [{ uid: 'p1', stage: 'deposit', amount: 12000, method: 'wire', receivedOn: '2026-10-27', clearedOn: '2026-10-27' }],
        crew: { tc: { name: 'Ashley Jerome' }, ps: [{ name: 'Anthony Graziano Jr' }] } });
      estimateStore[ID] = { approved: true, submitted: true, approvedBy: 'Anthony Graziano', approvedAt: 'October 15, 2026', savedAt: T,
        estimate: { jobId: ID, svc: 'downsizing_move', havellinTotal: 24000, fixedPrice: false, tcFee: 9000, psFee: 15000, totTC: 60, totPS: 150, tcRate: 150, psRate: 100,
          days: 5, collections: [], vendors: [], prepItems: [], rooms: [{ idx: 1, name: 'Study', st: 'in', vol: 3, cplx: 3 }, { idx: 2, name: 'Primary Bedroom', st: 'in', vol: 3, cplx: 3 }] } };
      try { localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore)); } catch (x) {}
      saveJobs(); renderJobs();
    }, ID);
    await p.waitForTimeout(800);

    // ═══════════════════════════════════════════════════════════════════════
    await section('A. the Incidents card is on the Job Plan, In the house, and Report an incident opens the dialog', async () => {
      await p.evaluate((id) => openJobPlanFor(id, 'p1'), ID); await p.waitForTimeout(1000);
      ok(await vis(card), 'the Incidents card is on screen');
      has(await txt(card), 'Incidents', '…headed Incidents');
      has(await txt(card), 'Record it today', '…with its note');
      lacks(await txt(card), 'Print Incident Record', '…and no record to print yet');
      eq(await txt('#inc-hdr-' + ID), '', 'no banner with nothing recorded');
      eq(await overflow(), 0, 'no horizontal overflow at 390 px with the card');
      await press(card + ' button[onclick="openIncident(' + ID + ',\'report\')"]', 'Report an incident');
      ok(await vis('#inc-modal'), 'the dialog is open');
      eq(await p.evaluate(() => document.getElementById('inc-date').value), new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' }), 'today');
      eq(await p.evaluate(() => document.getElementById('inc-reported-by').value), 'Ashley Jerome', 'reported by the device\'s user');
      ok(!(await vis('#inc-fields')), 'the fields wait for a kind');
      await press('#inc-kind-damage', 'the Property damage chip');
      ok(await vis('#inc-fields'), 'the fields appear');
      ok(await vis('#inc-money-wrap'), '…with the estimated value for damage');
      ok(!(await vis('#inc-yn-wrap')), '…and no yes/no');
    });

    await section('B. an empty report is refused by name; a damage report with a photograph records, uploads and is entered', async () => {
      await press('#inc-save-btn', 'Record, with nothing filled in');
      has(await txt('#inc-fb'), 'Enter where it happened, what happened and the item.', 'every missing piece named at once');
      eq((await incidents()).length, 0, 'and nothing written');
      await p.fill('#inc-time', '14:35');
      await p.fill('#inc-where', 'Study');
      await p.fill('#inc-what', 'The crystal decanter slipped off the tray while it was being wrapped and shattered.');
      await p.fill('#inc-present', 'Ashley Jerome; Anthony Graziano Jr');
      await p.fill('#inc-f1', 'Waterford decanter, item 14');
      await p.fill('#inc-money', '1250');
      await p.setInputFiles('#inc-photos', [{ name: 'decanter.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('ffd8ffe000104a46494600010100000100010000ffd9', 'hex') }]);
      await press('#inc-save-btn', 'Record');
      await p.waitForTimeout(1200);
      ok(!(await vis('#inc-modal')), 'the dialog closed');
      const inc = await incidents();
      const rep = inc.find((e) => e.entry === 'report');
      ok(!!rep && rep.kind === 'damage' && rep.where === 'Study' && rep.estValue === 1250 && rep.recordedBy === 'Ashley Jerome', 'the report is on the job as written');
      eq(UPLOADS.length, 1, 'the photograph was uploaded');
      eq(UPLOADS[0] && UPLOADS[0].folderId, 'SUBINC82', '…into the Incident Reports folder');
      has(UPLOADS[0] && UPLOADS[0].filename, 'Incident 1 - Property damage', '…named for the incident');
      const ph = inc.find((e) => e.entry === 'update' && e.act === 'photos');
      ok(!!ph && ph.photos.length === 1 && ph.photos[0].fileId === 'U1', 'and recorded as a photos entry on the report');
      const c = await txt(card);
      has(c, 'Incident 1 · Property damage', 'the row is on the card');
      has(c, 'Open', '…open');
      has(c, 'Photographs added', '…with its photograph entry');
      has(c, 'client notified within 24 hours', '…and §6.3\'s deadlines as lines');
      has(await txt('#inc-hdr-' + ID), '1 open incident on this job', 'the header chip counts it, amber');
      ok(!(await vis('#inc-hdr-' + ID + ' .inc-banner')), '…not red: damage owes no call');
      eq(await overflow(), 0, 'no horizontal overflow with a row on the card');
    });

    await section('C. an injury: CALL ANTHONY IMMEDIATELY in red, with his number, until I called Anthony is pressed', async () => {
      await press(card + ' button[onclick="openIncident(' + ID + ',\'report\')"]', 'Report an incident');
      await press('#inc-kind-injury', 'the Injury chip');
      has(await txt('#inc-kind-note'), '(617) 650-6588', 'the dialog says to call Anthony at once');
      await p.fill('#inc-where', 'Study');
      await p.fill('#inc-what', 'Cut his hand on a shard of the decanter; cleaned and bandaged on site.');
      await p.fill('#inc-f1', 'Anthony Graziano Jr');
      await p.selectOption('#inc-yn', 'no');
      await press('#inc-save-btn', 'Record');
      await p.waitForTimeout(600);
      ok(await vis('#inc-hdr-' + ID + ' .inc-banner'), 'the header banner is red');
      has(await txt('#inc-hdr-' + ID), 'CALL ANTHONY IMMEDIATELY', '…and says to call Anthony');
      has(await txt('#inc-hdr-' + ID), '(617) 650-6588', '…with the number');
      eq(await p.evaluate((id) => { const a = document.querySelector('#inc-hdr-' + id + ' a[href^="tel:"]'); return a ? a.getAttribute('href') : ''; }, ID), 'tel:+16176506588', '…as a tap-to-call link');
      has(await txt('#inc-hdr-' + ID), 'Incident 2: injury, Study', '…naming the incident');
      has(await txt(card), 'CALL ANTHONY IMMEDIATELY', 'the row carries it too');
      eq(await overflow(), 0, 'no horizontal overflow with the red banner');
      await press('#inc-hdr-' + ID + ' button.inc-call-btn', 'I called Anthony, on the banner');
      const al = (await incidents()).find((e) => e.entry === 'update' && e.act === 'alerted');
      ok(!!al && al.how === 'call' && al.by === 'Ashley Jerome', 'the call is recorded, by whom and how');
      lacks(await txt('#inc-hdr-' + ID), 'CALL ANTHONY', 'the call is no longer asked for');
      ok(await vis('#inc-hdr-' + ID + ' .inc-banner'), '…but an open injury still reads red');
      has(await txt('#inc-hdr-' + ID), 'Open until it is resolved', '…as open');
    });

    await section('D. the dashboard, at a desk: Work complete flagged, Close job refused by name', async () => {
      // The close is a desk act: the dashboard's Close job sits off the phone's three tabs.
      await p.setViewportSize({ width: 1440, height: 1000 });
      await p.evaluate((id) => { showPanel('jobs', document.querySelector('.nb[onclick*="\'jobs\'"]')); openClientDashboard(id); }, ID); await p.waitForTimeout(1000);
      const rail = await txt('#client-dashboard-view');
      has(rail, '2 open incidents — the job cannot close until each is resolved', 'the Work complete row is flagged');
      const d0 = dialogs.length;
      await press('#client-dashboard-view button[onclick="activateOrCycle(' + ID + ')"]', 'Close job');
      const al = dialogs.slice(d0).find((d) => d.type === 'alert') || { msg: '' };
      has(al.msg, 'Cannot close the job yet', 'the close is refused');
      has(al.msg, 'Resolve the 2 open incidents with a resolution note (Incident 1, property damage; 2, injury)', '…naming each incident');
      has(al.msg, 'The Incidents card is on the Job Plan, under In the house.', '…and where to go');
      eq(((await job()) || {}).status, 'active', 'the job is still active');
    });

    await section('E. both resolved with a note; the close goes through and files the Incident Record; the record prints', async () => {
      await p.evaluate((id) => openJobPlanFor(id, 'p1'), ID); await p.waitForTimeout(1000);
      const inc = await incidents();
      const reps = inc.filter((e) => e.entry === 'report');
      for (const r of reps) {
        await press(card + ' button[onclick="openIncident(' + ID + ',\'update\',\'' + r.id + '\',\'resolved\')"]', 'Resolve, Incident ' + (r.kind));
        await press('#inc-save-btn', 'Record the resolution, with no note');
        has(await txt('#inc-fb'), 'the resolution note', 'refused without the note');
        await p.fill('#inc-note', r.kind === 'damage' ? 'Mrs Halloran told the same afternoon; she declined a claim and kept the pieces.' : 'Minor cut; bandaged; back at work within the hour. No medical visit.');
        await press('#inc-save-btn', 'Record the resolution');
        await p.waitForTimeout(500);
      }
      const after = await incidents();
      eq(after.filter((e) => e.act === 'resolved').length, 2, 'two resolutions recorded as entries');
      eq(reps.map((r) => after.find((e) => e.id === r.id).what), reps.map((r) => r.what), 'the reports themselves are as written');
      has(await txt(card), 'Resolved', 'the rows read Resolved');
      eq(await txt('#inc-hdr-' + ID), '', 'the header banner is gone');
      has(await txt(card), 'Print Incident Record', 'the card offers the record');
      await press(card + ' button[onclick="printIncidentRecord(' + ID + ')"]', 'Print Incident Record');
      await press('#doc-viewer-print', 'Print / Save PDF, in the viewer');   // the paper opens on screen first (2026-10-26)
      await p.waitForSelector('#doc-viewer-modal', { state: 'visible', timeout: 4000 }).catch(() => ok(false, 'the viewer comes back after the print dialog'));
      await press('#doc-viewer-modal button[onclick="closeDocViewer()"]', 'Close the viewer');
      await p.waitForTimeout(800);
      const printed = await p.evaluate(() => window.__printed || (document.getElementById('print-target') || {}).innerHTML || '');
      has(printed, 'Incident Record', 'the record printed');
      has(printed, 'Incident 1 · Property damage', '…with the damage report');
      has(printed, 'Incident 2 · Injury', '…and the injury');
      has(printed, '2 incidents listed: 0 open, 2 resolved.', '…and its footer adds up');
      await p.evaluate(() => { document.querySelectorAll('.panel').forEach((pn) => { if (pn.dataset.wasActive === '1') pn.classList.add('active'); }); });
      await p.evaluate((id) => { showPanel('jobs', document.querySelector('.nb[onclick*="\'jobs\'"]')); openClientDashboard(id); }, ID); await p.waitForTimeout(1000);
      const d0 = dialogs.length;
      await press('#client-dashboard-view button[onclick="activateOrCycle(' + ID + ')"]', 'Close job');
      await p.waitForTimeout(1500);
      ok(!dialogs.slice(d0).some((d) => /Cannot close/.test(d.msg)), 'no refusal this time');
      eq(((await job()) || {}).status, 'closed', 'the job closed');
      const rec = HTMLS.find((h) => /Incident Record/.test(String(h.filename)));
      ok(!!rec, 'the Incident Record was filed to Drive at the close');
      eq(rec && rec.folderId, 'SUBINC82', '…into the Incident Reports folder');
      has(rec && rec.html, 'Waterford decanter', '…carrying the record');
      const st = (((await job()) || {}).docState || {}).incidentRecord;
      ok(!!st && !!st.filedAt && st.filedHow === 'close', 'and recorded on docState.incidentRecord');
    });

    await section('F. a desk at 1440: the record on More ▾, the card wide, no overflow', async () => {
      await p.evaluate((id) => openJobPlanFor(id, 'p1'), ID); await p.waitForTimeout(1000);
      ok(await vis(card), 'the card at a desk width');
      eq(await overflow(), 0, 'no horizontal overflow at 1440');
      await p.evaluate((id) => { setCurrentJob(id); populateInventorySelect(); }, ID);
      await p.click('.nb[onclick*="\'inventory\'"]'); await p.waitForTimeout(900);
      const sel = await p.evaluate(() => (document.getElementById('inv-job') || {}).value);
      if (String(sel) !== String(ID)) { await p.selectOption('#inv-job', String(ID)); await p.waitForTimeout(900); }
      await p.evaluate(() => { const m = document.getElementById('inv-more'); if (m) m.open = true; });
      ok(await vis('#inv-more button[onclick="printIncidentRecord(' + ID + ')"]'), 'the desk\'s More ▾ offers the Incident Record');
    });

    eq(errs, [], 'zero page errors');
  } catch (e) {
    fail++; console.log('  ✗ step 82 threw: ' + (e && e.stack || e));
  } finally {
    if (b) await b.close();
  }
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
