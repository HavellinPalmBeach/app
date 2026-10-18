// Step 85 — the industry's practice on the plan (2026-10-17, P27; Anthony's Q75 to Q85): procedure lines and pages, never boxes.
//
// Drives the REAL page: intake's two new house-list rows (storage on a living and a decedent service, the decider hidden on
// probate) and the destination's move-in contact; an active Home Transition's Job Plan with *Choosing the mover* under Before
// Day 1, *How the sorting runs* under the rooms, *Packing* under Midpoint & pickups and, on Move day, three boxes, the
// *No damage reported* line, two procedure blocks with their page links and *File the Bill of Lading*; Edit Client taking the
// move-in contact and the header printing it; a damage incident recorded through the real dialog turning the Move day line
// red; the Bill of Lading filed through the real control over a routed Apps Script; a closed Home Transition's dashboard
// carrying the *Settling in* reminder on day 12; a living client's ⚑ Sell line with no value badged on the printed Contents
// Record; overflow at 1440 and 390; zero page errors.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step85.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');
const SYNC = 'https://sync.example.test/exec';
const T0 = Date.parse('2026-10-05T15:00:00Z');
const MM = 8501, DONE = 8502, LIV = 8503;
const PHOTO = { name: 'bol.png', mimeType: 'image/png', buffer: Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex') };

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
    const uploads = [];
    let sheet = {};   // the manifest the routed Apps Script hands back, so the desk's read from the sheet does not empty the seed
    await ctx.route(SYNC + '**', async (r) => {
      const req = r.request();
      const json = (o) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(o) });
      if (req.method() === 'POST') {
        let body = {}; try { body = JSON.parse(req.postData() || '{}'); } catch (e) {}
        if (body.action === 'uploadFile') {
          uploads.push({ folderId: body.folderId, filename: body.filename });
          return json({ ok: true, fileUrl: 'https://drive.google.com/file/d/BOL' + uploads.length + '/view', fileId: 'BOL' + uploads.length });
        }
        if (body.action === 'getSubfolders') return json({ ok: true, subfolders: { 'Signed Records': 'SR85' } });
        return json({ ok: true });
      }
      if (/action=loadMedia/.test(req.url())) return json({ ok: true, media: sheet });
      return json({ ok: true });
    });
    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    p.on('dialog', async (d) => { await d.accept(); });
    await p.goto(APP); await p.waitForTimeout(1600);
    await p.evaluate((u) => {
      SHEETS_SYNC_URL = u;
      localStorage.setItem('hav_device_user', 'Ashley Jerome');
      window.__prints = [];
      window.print = function () { const pt = document.getElementById('print-target'); window.__prints.push(pt ? pt.innerHTML : ''); };
    }, SYNC);
    const section = async (name, body) => {
      console.log('\n## ' + name);
      try { await body(); } catch (e) { fail++; console.log('  ✗ ' + name + ' threw: ' + String(e && e.message || e).split('\n')[0]); }
    };
    const vis = (sel) => p.locator(sel).first().isVisible().catch(() => false);
    const press = async (sel, what) => {
      const n = await p.locator(sel).count();
      const v = n >= 1 && await vis(sel);
      ok(v, (what || sel) + ' — on screen (' + n + ')');
      if (v) { await p.locator(sel).first().click({ timeout: 5000 }).catch((e) => ok(false, (what || sel) + ' — ' + e.message.split('\n')[0])); await p.waitForTimeout(700); }
      return v;
    };
    const txt = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }, sel);
    const html = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.innerHTML : ''; }, sel);
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const plan = async (id) => {
      await p.click('.nb[onclick*="\'job-plan\'"]'); await p.waitForTimeout(900);
      const cur = await p.evaluate(() => document.getElementById('plan-job').value);
      if (String(cur) !== String(id)) { await p.selectOption('#plan-job', String(id)); await p.waitForTimeout(900); }
    };
    const dash = async (id) => { await p.evaluate((id) => goToClientDashboard(id), id); await p.waitForTimeout(900); };

    // ── Seed: an active Home Transition; a Home Transition closed twelve days ago; a living Home Editing job with a desk line ──
    sheet = await p.evaluate(([MM, DONE, LIV, T0]) => {
      const base = (id, hvl, name, svc, extra) => Object.assign({ id, hvlId: hvl, name, fname: name.split(' ')[0], lname: name.split(' ')[1], svc, addr: id + ' Seaview Ave', city: 'Palm Beach',
        email: 'c' + id + '@example.com', phone: '(561) 555-0100', sqft: '3200', beds: '3', baths: '2', propVal: '4200000', status: 'active', won: true, wonAt: '2026-09-24', start: '2026-10-06',
        activatedOn: '2026-10-05', tc: 'Ashley Jerome', agrApproved: true, agrSent: true, agrSigned: true, at: {},
        docState: { estimate: { sentAt: '2026-09-24T14:00:00Z' }, agreement: { sentAt: '2026-09-26T14:00:00Z', sig: { signedBy: name, signedAt: '2026-09-28' } } },
        payments: [{ uid: 'p' + id, stage: 'deposit', amount: 7325, receivedOn: '2026-10-01', method: 'wire', clearedOn: '2026-10-01' }],
        driveFolder: 'https://drive.google.com/drive/folders/f' + id, driveSubfolders: { 'Signed Records': 'SR85', 'Estate Inventory': 'INV85', 'As-Found Record': 'AF85' } }, extra || {});
      const est = (id, svc) => ({ approved: true, submitted: true, approvedBy: 'Anthony Graziano', approvedAt: 'September 23, 2026', savedAt: T0,
        estimate: { jobId: id, svc, havellinTotal: 14650, grandTotal: 14650, totTC: 40, totPS: 60, tcRate: 150, psRate: 100, tcFee: 6000, psFee: 6000, days: 5,
          vendors: [], prepItems: [], pkgCost: 0, collections: [], psSlots: [], rooms: [{ idx: 0, name: 'Living Room', st: 'in', vol: 3, cplx: 3 }] } });
      const twelveAgo = _ymdLocal(new Date(Date.now() - 12 * 86400000));
      jobs.unshift(base(MM, 'HVL-2610-M851', 'Ruth Adler', 'downsizing_move', { destAddr: '1 Devonshire Way', destCity: 'Palm Beach Gardens', destSqft: '1800', incidents: [] }));
      jobs.unshift(base(DONE, 'HVL-2610-M852', 'Edna Marsh', 'downsizing_move', { status: 'closed', deliveredOn: twelveAgo, deliveredBy: 'Ashley Jerome', destAddr: '2 Devonshire Way', destSqft: '1500' }));
      jobs.unshift(base(LIV, 'HVL-2610-E853', 'Carl Ives', 'downsizing', {}));
      estimateStore[MM] = est(MM, 'downsizing_move'); estimateStore[DONE] = est(DONE, 'downsizing_move'); estimateStore[LIV] = est(LIV, 'downsizing');
      _photoRefs[LIV] = [{ stableId: 'a', label: 'inventory', roomIdx: 0, seq: 1, status: 'uploaded', category: 'Furniture', disposition: 'Sell', needsAppr: true,
        objectName: 'Side table', ts: T0, updatedAt: T0, itemNo: 1, filename: 'HVL_' + LIV + '_INV_a.jpg', driveFileId: 'f-a' }];
      savePhotoRefs(LIV); _invCloudSeen = _invCloudSeen || {}; _invCloudSeen[LIV] = true;
      saveJobs(); localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore));
      _logsState = 'ready';
      const out = {}; out[LIV] = { items: JSON.parse(localStorage.getItem('hav_media_' + LIV) || '[]') }; return out;
    }, [MM, DONE, LIV, T0]);

    // ── A ─────────────────────────────────────────────────────────────────────────────────────
    await section('A. intake: the two new house-list rows, the decider hidden on probate, the move-in contact under the destination', async () => {
      await p.click('.nb[onclick*="\'clients\'"]').catch(() => {}); await p.waitForTimeout(500);
      await press('#btn-add-client', '+ Add New Client');
      await p.selectOption('#i-svc', 'downsizing_move'); await p.waitForTimeout(400);
      ok(await vis('#i-hfr-storage'), 'Offsite storage or a second property is on the list on a Home Transition');
      ok(await vis('#i-hfr-decider'), 'and Who decides for the family');
      has(await txt('#i-hfr-storage'), 'Offsite storage or a second property', 'the storage row, in its words');
      has(await txt('#i-hfr-decider'), 'Who decides for the family', 'the decider row, in its words');
      ok(await vis('#i-dest-contact'), 'the Move-in contact control is under the destination');
      await p.selectOption('#i-svc', 'probate'); await p.waitForTimeout(400);
      ok(await vis('#i-hfr-storage'), 'on a probate intake the storage row stays');
      ok(!(await vis('#i-hfr-decider')), '⚠ and the decider row is hidden: the representative decides');
      await p.selectOption('#i-svc', 'prep'); await p.waitForTimeout(400);
      ok(!(await vis('#i-hfr-storage')), 'on a Home Prep neither is asked');
      ok(!(await vis('#i-hfr-decider')), '(nothing leaves a prep house)');
      await p.selectOption('#i-svc', 'downsizing'); await p.waitForTimeout(400);
      ok(await vis('#i-hfr-decider'), 'back on a living service the decider returns');
    });

    // ── B ─────────────────────────────────────────────────────────────────────────────────────
    await section('B. the active Home Transition’s plan: procedure blocks under three stages, three move-day boxes, the damage line, the Bill of Lading control', async () => {
      await plan(MM);
      const p0 = await txt('#stage-p0');
      has(p0, 'Choosing the mover', 'Before Day 1 carries Choosing the mover');
      has(p0, 'Ask the mover what the load is insured for.', 'with the coverage line');
      const rooms = await txt('#stage-rooms');
      has(rooms, 'How the sorting runs', 'In the house carries How the sorting runs');
      has(rooms, 'Two to three hours of decisions, once a day.', 'with the session rule');
      eq(await p.locator('#stage-rooms a[href="sorting-guide.html"]').count(), 1, 'Sorting a House linked once under it');
      const p2 = await txt('#stage-p2');
      has(p2, 'Packing', 'Midpoint & pickups carries Packing');
      has(p2, 'The DO NOT LOAD closet', 'with the closet');
      eq(await p.locator('#stage-p2 a[href="packing-guide.html"]').count(), 1, 'Packing a House linked once');
      const p3 = await txt('#stage-p3');
      eq(await p.locator('#stage-p3 input[type=checkbox]').count(), 3, '⚠⚠ three boxes on Move day');
      has(p3, 'Bill of Lading and the mover’s inventory signed', 'the third names the papers');
      lacks(p3, 'Damage photographed and reported', 'no damage box');
      has(p3, 'No damage reported', 'the damage line reads none reported');
      has(p3, 'How move day runs', 'the day’s procedure');
      has(p3, 'The to-go bag (medications, documents, chargers, a change of clothes) and the keys to the new home ride with the client, never on the truck.', 'the to-go bag line');
      has(p3, 'How move-in runs', 'and the move-in procedure');
      eq(await p.locator('#stage-p3 a[href="move-day-guide.html"]').count(), 1, 'Move Day linked');
      eq(await p.locator('#stage-p3 a[href="first-night-guide.html"]').count(), 1, 'The First Night linked');
      ok(await vis('#plan-bol-' + MM), 'the Bill of Lading block is under the boxes');
      has(await txt('#plan-bol-' + MM), 'File the Bill of Lading', 'offering File the Bill of Lading');
      eq(await p.locator('#stage-p3 .plan-proc li').count(), 14, 'fourteen procedure lines on the stage');
      eq(await p.locator('.plan-proc input[type=checkbox]').count(), 0, '⚠⚠ no box inside any procedure block');
      // 2026-10-18: a guide opens over the plan, never in a new tab (Anthony: like the room-score info box).
      const pagesBefore = ctx.pages().length;
      await press('#stage-p3 a[href="move-day-guide.html"]', 'Read Move Day');
      eq(ctx.pages().length, pagesBefore, 'no new tab opened');
      ok(await p.evaluate(() => document.getElementById('guide-modal').checkVisibility()), 'the guide panel is over the plan');
      eq(await p.evaluate(() => document.getElementById('guide-title').textContent), 'Move Day', 'headed Move Day');
      ok(/move-day-guide\.html$/.test(await p.evaluate(() => document.getElementById('guide-frame').getAttribute('src'))), 'with the page in its frame');
      await p.waitForTimeout(800);
      has(await p.frameLocator('#guide-frame').locator('h1').textContent().catch(() => ''), 'Move Day', 'and the page itself rendered inside it');
      await press('#guide-modal button', 'Close');
      ok(!(await p.evaluate(() => document.getElementById('guide-modal').checkVisibility())), 'Close hides the panel');
      eq(await p.evaluate(() => document.getElementById('guide-frame').getAttribute('src')), 'about:blank', 'and empties the frame');
      lacks(await txt('#panel-job-plan'), 'Move-in contact', 'no contact on the header before one is recorded');
    });

    // ── C ─────────────────────────────────────────────────────────────────────────────────────
    await section('C. Edit Client takes the move-in contact after approval, and the plan header prints it', async () => {
      await dash(MM);
      await press('button[onclick="dashEditClient(' + MM + ')"]', '✎ Edit Client');
      ok(await vis('#ec-dest-contact'), 'the Move-in contact field is on Edit Client');
      ok(!(await p.locator('#ec-dest-contact').isDisabled()), 'and not held: the estimate is approved and it prices nothing');
      await p.fill('#ec-dest-contact', 'Maria Lopez, Director of Resident Services, 561-555-0142');
      await press('button[onclick="saveClientEdit(' + MM + ')"]', 'Save Changes');
      eq(await p.evaluate((id) => jobs.find((j) => j.id === id).destContact, MM), 'Maria Lopez, Director of Resident Services, 561-555-0142', 'the job carries it');
      await plan(MM);
      const hdr = await txt('#panel-job-plan');
      has(hdr, 'Move-in contact', 'the plan header names the contact');
      has(hdr, 'Maria Lopez, Director of Resident Services', 'by name');
    });

    // ── D ─────────────────────────────────────────────────────────────────────────────────────
    await section('D. a damage incident recorded through the real dialog turns the Move day line red and offers Open Incidents', async () => {
      await press('button[onclick="openIncident(' + MM + ',\'report\')"]', 'Report an incident');
      await press('#inc-kind-damage', 'Property damage');
      await p.fill('#inc-where', 'The truck'); await p.fill('#inc-what', 'The hall mirror cracked in the crate');
      await p.fill('#inc-f1', 'Hall mirror, no inventory number'); await p.fill('#inc-money', '300');
      const rb = await p.evaluate(() => document.getElementById('inc-reported-by').value);
      if (!rb) await p.fill('#inc-reported-by', 'Ashley Jerome');
      await press('#inc-save-btn', 'Record');
      eq(await p.evaluate((id) => jobs.find((j) => j.id === id).incidents.filter((e) => e.entry === 'report').length, MM), 1, 'one report on the job');
      const p3 = await txt('#stage-p3');
      has(p3, 'Damage reported: 1 incident', 'the Move day line counts it at once');
      eq(await p.locator('#plan-derived-p3-' + MM + ' .pl-red').count(), 1, 'red while open');
      ok(await vis('#plan-derived-p3-' + MM + ' button[onclick="goToIncidents(' + MM + ')"]'), 'with Open Incidents beside it');
      eq(await p.locator('#stage-p3 input[type=checkbox]').count(), 3, 'and still three boxes');
    });

    // ── E ─────────────────────────────────────────────────────────────────────────────────────
    await section('E. the Bill of Lading filed through the real control lands in Signed Records and is listed with a Void', async () => {
      await p.setInputFiles('#plan-bol-' + MM + ' input[type=file]', PHOTO); await p.waitForTimeout(1500);
      eq(uploads.length, 1, 'one upload went to the Apps Script');
      eq(uploads[0] && uploads[0].folderId, 'SR85', 'into the Signed Records folder');
      has(uploads[0] && uploads[0].filename, 'Bill of Lading', 'named for the paper');
      const recs = await p.evaluate((id) => jobs.find((j) => j.id === id).signedRecords.filter((r) => r.kind === 'bol' && !r.voidedAt).map((r) => [r.ref, r.fileUrl]), MM);
      eq(recs, [['bol', 'https://drive.google.com/file/d/BOL1/view']], 'recorded on the job as kind bol');
      await plan(MM);
      const bol = await html('#plan-bol-' + MM);
      has(bol, 'href="https://drive.google.com/file/d/BOL1/view"', 'the filed copy is linked under the boxes');
      has(bol, 'File another copy', 'and the control offers another');
      has(bol, 'voidSignedRecord(' + MM, 'with a Void');
    });

    // ── F ─────────────────────────────────────────────────────────────────────────────────────
    await section('F. a Home Transition closed twelve days ago: the dashboard’s Settling in reminder; a cleanout and an open job get none', async () => {
      await dash(DONE);
      ok(await vis('#dash-checkin-' + DONE), 'the Settling in card is on the closed job’s dashboard');
      const card = await txt('#dash-checkin-' + DONE);
      has(card, 'Check-in call due around', 'with the reminder');
      has(card, 'a doctor', 'and when distress is for a doctor');
      eq(await p.locator('#dash-checkin-' + DONE + ' input[type=checkbox]').count(), 0, 'nothing to tick');
      await dash(MM);
      eq(await p.locator('#dash-checkin-' + MM).count(), 0, 'an open Home Transition has none');
    });

    // ── G ─────────────────────────────────────────────────────────────────────────────────────
    await section('G. a living client’s ⚑ Sell line with no value: badged on the printed Contents Record and explained in its record', async () => {
      await p.evaluate((id) => { setCurrentJob(id); populateInventorySelect(); }, LIV);
      await p.click('.nb[onclick*="\'inventory\'"]'); await p.waitForTimeout(900);
      if (String(await p.evaluate(() => document.getElementById('inv-job').value)) !== String(LIV)) { await p.selectOption('#inv-job', String(LIV)); await p.waitForTimeout(900); }
      await p.evaluate(() => { window.__prints = []; });
      await press('#inv-workbar button[onclick="printContentsRecord(' + LIV + ')"]', 'Contents Record (the work bar)');
      await p.waitForTimeout(900);   // _printDocument prints on a timer
      const printed = await p.evaluate(() => window.__prints[0] || '');
      has(printed, 'Side table', 'the Contents Record prints the line');
      has(printed, 'FLAGGED FOR APPRAISAL, NO VALUE RECORDED', '⚠ badged on the client’s paper');
      lacks(printed, 'NOT YET APPRAISED', 'never the estate’s badge');
      const panel = await p.evaluate((id) => { const j = jobs.find((x) => x.id === id); return _invPanelCautionHtml(j, _photoRefs[id][0]); }, LIV);
      has(panel, 'Flagged for appraisal, no value recorded.', 'the line’s record says why');
      has(panel, 'not refused', 'and that it is not refused');
    });

    // ── H ─────────────────────────────────────────────────────────────────────────────────────
    await section('H. overflow at 1440 and 390 on the plan, and zero page errors', async () => {
      await plan(MM);
      eq(await overflow(), 0, 'no horizontal overflow at 1440');
      await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(700);
      await plan(MM);
      ok((await overflow()) <= 0, 'no horizontal overflow at 390 (' + (await overflow()) + 'px)');
      await p.setViewportSize({ width: 1440, height: 1000 });
      eq(errs, [], 'zero page errors');
    });
  } catch (e) {
    fail++; console.log('  ✗ step85 threw: ' + (e && e.stack || e));
  } finally {
    if (b) await b.close();
  }
  console.log('\nstep85: ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
