// Step 127 — Each paper says the right thing for its matter (P14 of the desk audit, 2026-10-28; DOC-02, DOC-07, VAL-24, NEW-14,
// DOC-28, DOC-20, DOC-17, VAL-30, EST-20, VAL-25, LIV-16).
//
// Drives the REAL page with six clients on Job Admin & Inv, each reached through the tab's own nav button and its picker: a probate
// estate (an exempt sofa, a non-probate car, a painting flagged for appraisal, a firearm with no written authority), a trust-only
// estate, a contested probate, an Estate Settlement with no matter type recorded, a Contents-list probate estate on Formal, and a
// living Home Transition (a painting to a specialist, a line promised to a daughter).
//   A · probate: the work bar's Estate Inventory PDF lists the sofa under Exempt Property Claimed inside the estate with its
//       subtotal, the car under "Non-probate Property — outside the probate estate", nothing "carved out"; More ▾ offers the Court
//       Inventory and no Trust Schedule; the Court Inventory is headed as it is filed; the Appraisal Worklist values as of the date
//       of death and states the firearm's gate as fact; the Report prints in print media with nothing cut off.
//   B · trust-only: More ▾ offers the Trust Schedule and no Court Inventory; the Report reads "Inventory — Asset Schedule" and the
//       trust's Drive folder.
//   C · contested probate: no Trust Schedule. D · unanswered: both, with "Matter type not recorded: set it in Edit Client." under
//       them, and the Court Inventory says the matter is not recorded.
//   E · Contents-list estate: the guardrail says the estate attorney has the appraisal done, never "before this inventory is
//       complete".
//   F · living: the Values bar reads "to a specialist", the roster's note no date of death, the guardrail ends "or Waive"; an
//       appraiser picked from the Vendor Directory with no contact prints once; the worklist values "as of the appraiser's
//       inspection"; the line's record reads Flags and Promised to someone, no Authorized By; the CSV, downloaded through its
//       button, carries no estate column and captured-at in local time.
//   G · 1440 and 390 px: no horizontal overflow; zero page errors.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step127.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const fs = require('fs');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');
const SYNC = 'https://script.google.com/macros/s/STEP127/exec';
const T0 = Date.parse('2026-10-21T02:09:00Z');   // 10:09 PM on the 20th, Eastern
const PRO = 12701, TRU = 12702, CON = 12703, UNA = 12704, CTT = 12705, LIV = 12706;

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York', acceptDownloads: true });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    let sheet = {};
    await ctx.route(SYNC + '**', async (r) => {
      const req = r.request();
      const json = (o) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(o) });
      if (req.method() === 'POST') return json({ ok: true });
      if (/action=loadMedia/.test(req.url())) return json({ ok: true, media: sheet });
      return json({ ok: true });
    });
    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    const said = [];
    p.on('dialog', async (d) => { said.push(d.message()); await d.accept(); });
    await p.goto(APP); await p.waitForTimeout(1600);
    await p.evaluate((u) => {
      SHEETS_SYNC_URL = u;
      try { localStorage.setItem('hav_device_user', 'Ashley Jerome'); } catch (e) {}
      window.open = function () { return null; };
      agentValueAuto = function () { return false; };
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
    const val = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.value : null; }, sel);
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const toDesk = async (id) => {
      await p.click('.nb[onclick*="\'inventory\'"]'); await p.waitForTimeout(900);
      if (String(await val('#inv-job')) !== String(id)) { await p.selectOption('#inv-job', String(id)); await p.waitForTimeout(1100); }
    };
    const viewerOpen = () => p.evaluate(() => { const o = document.getElementById('doc-viewer-modal'); return !!o && o.style.display === 'flex'; });
    const close = () => press('#doc-viewer-modal button[onclick="closeDocViewer()"]', 'Close');
    const openMore = async () => { if (!(await p.evaluate(() => { const d = document.getElementById('inv-more'); return !!d && d.open; }))) await press('#inv-more > summary', 'More ▾'); };
    const moreHas = (f, id) => p.evaluate(([f, id]) => !!document.querySelector('#inv-more button[onclick="' + f + '(' + id + ')"]'), [f, id]);
    const paper = async (sel, what) => { await press(sel, what); ok(await viewerOpen(), what + ': the viewer is on screen'); const t = await txt('#doc-viewer-body'); return t; };

    // ── Seed ──
    sheet = await p.evaluate(([ids, T0]) => {
      const [PRO, TRU, CON, UNA, CTT, LIV] = ids;
      vendorDirectory = [{ _row: 2, vendor_name: 'Gulfstream Appraisal Group', category: 'Art Appraiser', status: 'Active', license_cert: 'ISA' }];
      const est = (id, svc) => ({ approved: true, submitted: true, approvedBy: 'Anthony Graziano', savedAt: T0,
        estimate: { jobId: id, svc, havellinTotal: 40000, fixedPrice: true, fixedAmount: 40000, fixedLines: true, totTC: 100, totPS: 150, tcRate: 150, psRate: 100,
          days: 8, vendors: [], prepItems: [], pkgCost: 0, rooms: [{ idx: 0, name: 'Living Room', st: 'in', vol: 3, cplx: 3 }, { idx: 1, name: 'Garage', st: 'in', vol: 3, cplx: 3 }] } });
      const estate = (id, svc, matter, o) => Object.assign({ id, hvlId: 'HVL-2610-' + id, name: 'Harold Ashworth', svc, matterType: matter, addr: id + ' Via Bellaria', city: 'Palm Beach', zip: '33480',
        status: 'active', won: true, wonAt: '2026-09-25', approved: true, tc: 'Ashley Jerome', created: '2026-09-20', start: '2026-10-06', activatedOn: '2026-10-05',
        agrApproved: true, agrSent: true, agrSigned: true, docState: {}, at: {}, appraisers: [],
        executor: 'Ruth Ashworth', executorRole: matter === 'trust' ? 'Successor Trustee' : 'Personal Representative', executorEmail: 'ruth@example.com', deathDate: '2026-04-02', executorAuth: 'received',
        probateAttyName: 'Ann Lowe', probateAttyEmail: 'ann@lowe.law', probateCase: matter === 'trust' ? '' : '50-2026-CP-004321', docTier: 'values', gate706: 'yes',
        driveFolder: 'https://drive.google.com/drive/folders/ROOT' + id, driveSubfolders: { 'Estate Inventory': 'INV' + id, 'As-Found Record': 'AF' + id, 'Signed Records': 'SR' + id },
        payments: [{ uid: 'd' + id, stage: 'deposit', amount: 20000, receivedOn: '2026-10-01', method: 'wire', clearedOn: '2026-10-01' }] }, o || {});
      const item = (id, sid, o) => Object.assign({ stableId: sid, label: 'inventory', roomIdx: 0, status: 'uploaded', category: 'Furniture', disposition: 'Keep',
        objectName: 'Line ' + sid, ts: T0, updatedAt: T0, filename: 'HVL_' + id + '_INV_' + sid + '.jpg', driveFileId: 'f-' + id + sid, namedBy: 'desk', reviewed: true,
        valuedBy: 'desk', valSource: 'Dealer quote' }, o);
      const estateRows = (id) => [
        item(id, 'sb', { itemNo: 1, objectName: 'Walnut sideboard', fmv: 1200 }),
        item(id, 'so', { itemNo: 2, objectName: 'Household sofa', fmv: 900, flagExempt: true }),
        item(id, 'car', { itemNo: 3, objectName: 'Mercedes sedan', category: 'Vehicles & Watercraft', roomIdx: 1, fmv: 14000, assetTrack: 'Non-probate' }),
        item(id, 'pa', { itemNo: 4, objectName: 'Oil on canvas, harbour scene', category: 'Art & Décor', fmv: 2200, needsAppr: true }),
        item(id, 'gun', { itemNo: 5, objectName: 'Remington 870 shotgun', category: 'Firearms', disposition: 'Sell', fmv: 450, serial: 'RS1234', valuedBy: 'desk' }),
        item(id, 'lost', { itemNo: 6, objectName: 'Brass lamp', fmv: 80, status: 'failed', driveFileId: '', filename: '' })];
      const seed = (job, rows) => {
        jobs.unshift(job);
        estimateStore[job.id] = est(job.id, job.svc);
        jobPlanStore[job.id] = { rooms: { 0: { status: 'locked' }, 1: { status: 'locked' } }, tasks: {}, at: {} };
        _photoRefs[job.id] = rows; savePhotoRefs(job.id); _invCloudSeen[job.id] = true;
      };
      seed(estate(PRO, 'probate', 'probate'), estateRows(PRO));
      seed(estate(TRU, 'cleanout', 'trust', { trustName: 'Ashworth Family Trust', trustDate: '2015-03-03' }),
        estateRows(TRU).map((r) => r.stableId === 'car' ? Object.assign(r, { assetTrack: '' }) : r));
      seed(estate(CON, 'contested_probate', 'probate'), estateRows(CON));
      seed(estate(UNA, 'cleanout', ''), estateRows(UNA));
      seed(estate(CTT, 'probate', 'probate', { docTier: 'contents', docLevel: 'formal' }),
        [item(CTT, 'pa', { itemNo: 1, objectName: 'Oil portrait', category: 'Art & Décor', fmv: '', valSource: '', valuedBy: undefined, needsAppr: true })]);
      seed({ id: LIV, hvlId: 'HVL-2610-' + LIV, name: 'Robert Hale', svc: 'downsizing_move', addr: LIV + ' Royal Palm Way', city: 'Palm Beach', zip: '33480',
        status: 'active', won: true, wonAt: '2026-09-25', approved: true, tc: 'Ashley Jerome', created: '2026-09-20', start: '2026-10-06', activatedOn: '2026-10-05',
        agrApproved: true, agrSent: true, agrSigned: true, docState: {}, at: {}, appraisers: [], email: 'robert@hale.example', destAddr: '200 Royal Palm Way',
        destCity: 'Palm Beach', destSqft: 1800, driveFolder: 'https://drive.google.com/drive/folders/ROOT' + LIV,
        payments: [{ uid: 'd' + LIV, stage: 'deposit', amount: 15000, receivedOn: '2026-10-01', method: 'wire', clearedOn: '2026-10-01' }] },
        [item(LIV, 'pa', { itemNo: 1, objectName: 'Oil portrait', category: 'Art & Décor', fmv: '', valSource: '', valuedBy: undefined, needsAppr: true }),
         item(LIV, 'ch', { itemNo: 2, objectName: 'Cherry dresser', disposition: 'Distribute', channel: 'Anne Hale (daughter)', flagBequest: true, fmv: 300 })]);
      saveJobs(); localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore));
      _logsState = 'ready';
      const out = {}; ids.forEach((id) => { out[id] = { items: JSON.parse(localStorage.getItem('hav_media_' + id) || '[]') }; }); return out;
    }, [[PRO, TRU, CON, UNA, CTT, LIV], T0]);

    // ── A ──
    await section('A. probate: exempt property claimed inside the estate on the Report; More ▾ by the matter; the Court Inventory\'s own name; the worklist\'s date and facts', async () => {
      await toDesk(PRO);
      const rep = await paper('#inv-workbar button[onclick="printEstateInventoryReport(' + PRO + ')"]', 'Estate Inventory PDF');
      const iEx = rep.indexOf('Exempt Property Claimed (Fla. Stat. §732.402)'), iOut = rep.indexOf('Non-probate Property — outside the probate estate');
      ok(iEx > 0 && iOut > iEx, '⚠⚠ the exempt heading inside the estate, before the outside block (' + iEx + ', ' + iOut + ')');
      ok(rep.indexOf('Household sofa', iEx) > iEx && rep.indexOf('Household sofa', iEx) < iOut, '⚠ the sofa ticked Exempt is listed under it');
      has(rep, 'Total exempt property claimed: $900', '…with its subtotal');
      ok(rep.indexOf('Mercedes sedan', iOut) > iOut, 'the car under the outside block');
      lacks(rep, 'carved out', '⚠⚠ nothing "carved out of the probate estate"');
      has(rep, 'Probate estate, exempt property included (Fair Market Value): $4,830', 'the estate\'s subtotal counts the sofa');
      has(rep, 'did not reach the estate’s Drive folder', 'the estate\'s folder on a probate matter');
      // Print media: nothing in the page column cut off.
      const pr = await p.evaluate(() => { const b = document.getElementById('doc-viewer-body'); return b ? b.innerHTML : ''; });
      const pp = await ctx.newPage();
      await pp.setContent('<html><body style="margin:0">' + pr + '</body></html>');
      await pp.emulateMedia({ media: 'print' });
      await pp.setViewportSize({ width: 739, height: 1000 });
      ok(await pp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth) <= 0, 'the Report in print media at Letter width: nothing runs off the page');
      await pp.close();
      await close();
      await openMore();
      eq([await moreHas('printCourtInventory', PRO), await moreHas('printTrustSchedule', PRO)], [true, false], '⚠ More ▾ on probate: the Court Inventory, no Trust Schedule');
      lacks(await txt('#inv-more'), 'Matter type not recorded', '…and no unanswered note');
      const ci = await paper('#inv-more button[onclick="printCourtInventory(' + PRO + ')"]', 'Court Inventory');
      has(ci, 'Court Inventory (§733.604) — Tangible Personal Property', '⚠ the Court Inventory carries its own name');
      has(ci, 'Total exempt property claimed: $900', '…and claims the same $900 in the same words');
      await close();
      await openMore();
      const wl = await paper('#inv-more button[onclick="printAppraisalWorklist(' + PRO + ')"]', 'Appraisal Worklist');
      has(wl, 'Items flagged for specialist appraisal · value as of the date of death (Apr 2, 2026) · prepared', '⚠ the worklist: the estate\'s date, named');
      has(wl, '#5 Remington 870 shotgun — No written authority on file yet.', '⚠ the firearm\'s gate, as a fact');
      ['press Record approval', 'Record approval on Job Admin', 'select the firearm', 'Open the line', 'not on your person'].forEach((x) => lacks(wl, x, '⚠ no "' + x + '" on the paper'));
      await close();
    });

    // ── B ──
    await section('B. trust-only: the Trust Schedule and no Court Inventory; the Report says Inventory and the trust\'s Drive folder', async () => {
      await toDesk(TRU);
      await openMore();
      eq([await moreHas('printCourtInventory', TRU), await moreHas('printTrustSchedule', TRU)], [false, true], '⚠ More ▾ on a trust: the Trust Schedule, no Court Inventory');
      await press('#inv-more > summary', 'More ▾ (shut)');
      const rep = await paper('#inv-workbar button[onclick="printEstateInventoryReport(' + TRU + ')"]', 'Estate Inventory PDF');
      has(rep, 'Inventory — Asset Schedule', 'the Report is headed Inventory');
      lacks(rep, 'Estate Inventory', '⚠ never Estate Inventory on a trust administration');
      has(rep, 'did not reach the trust’s Drive folder', '⚠ the trust\'s Drive folder');
      await close();
    });

    // ── C, D ──
    await section('C. contested probate: no Trust Schedule. D. unanswered: both, with the line under them; the Court Inventory says so', async () => {
      await toDesk(CON);
      await openMore();
      eq([await moreHas('printCourtInventory', CON), await moreHas('printTrustSchedule', CON)], [true, false], '⚠ contested probate: no "Held in Trust" schedule offered');
      await press('#inv-more > summary', 'More ▾ (shut)');
      await toDesk(UNA);
      await openMore();
      eq([await moreHas('printCourtInventory', UNA), await moreHas('printTrustSchedule', UNA)], [true, true], 'unanswered: both offered');
      has(await txt('#inv-more'), 'Matter type not recorded: set it in Edit Client.', '⚠ …with the line under them');
      const ci = await paper('#inv-more button[onclick="printCourtInventory(' + UNA + ')"]', 'Court Inventory (unanswered)');
      has(ci, 'No matter type is recorded on this job, so Havellin cannot confirm from the record that this estate is administered through probate',
        '⚠ the unanswered Estate Settlement\'s Court Inventory names what is not on the record');
      await close();
    });

    // ── E ──
    await section('E. a Contents-list estate on Formal: the guardrail says the estate attorney has the appraisal done', async () => {
      await toDesk(CTT);
      await p.evaluate((id) => { if (typeof deskFoldOpen === 'function') deskFoldOpen(id, 'values'); renderInventoryTab(); }, CTT); await p.waitForTimeout(600);
      const g = await txt('#inv-guardrail');
      has(g, '1 item for the estate attorney to have appraised: on this engagement Havellin does not arrange appraisals.', '⚠ counsel has it appraised');
      lacks(g, 'before this inventory is complete', '…never "before this inventory is complete"');
    });

    // ── F ──
    await section('F. living: To a specialist, no date of death, the firm once, the worklist\'s inspection, the record and the CSV follow the job', async () => {
      await toDesk(LIV);
      has(await txt('#desk-stat-values-' + LIV), '1 to a specialist (1 with no specialist linked)', '⚠ the Values bar: the chip\'s own name');
      lacks(await txt('#desk-stat-values-' + LIV), 'needs an appraisal', '…never "needs an appraisal"');
      await p.evaluate((id) => { if (typeof deskFoldOpen === 'function') deskFoldOpen(id, 'values'); renderInventoryTab(); }, LIV); await p.waitForTimeout(600);
      const g = await txt('#inv-guardrail');
      has(g, '1 item to go to a specialist has no appraisal figure yet.', 'the guardrail: to a specialist');
      lacks(g, 'reasonable estimates on a standard job', '⚠ never the estate\'s advice');
      // The roster's add form: pick the directory firm, which has no named contact, and save.
      const add = '#appr-add-' + LIV;
      if (await vis(add)) await press(add, '+ Add an appraiser');
      lacks(await txt('#desk-body-values-' + LIV), 'usually the date of death', 'the roster\'s note: no date of death');
      has(await txt('#desk-body-values-' + LIV), 'the value date — usually the day the appraiser inspects it', '⚠ …the day the appraiser inspects it');
      const picker = await p.evaluate(() => { const s = Array.from(document.querySelectorAll('select')).filter((x) => /_apprPickVendor/.test(x.getAttribute('onchange') || ''))[0]; return s ? s.options.length : 0; });
      ok(picker >= 2, 'the Vendor Directory picker lists the firm');
      await p.evaluate(() => { const s = Array.from(document.querySelectorAll('select')).filter((x) => /_apprPickVendor/.test(x.getAttribute('onchange') || ''))[0]; s.value = '0'; s.dispatchEvent(new Event('change')); });
      await p.waitForTimeout(300);
      await press('button[onclick="addAppraiser(' + LIV + ')"]', 'Save appraiser');
      const roster = await txt('#desk-body-values-' + LIV);
      has(roster, 'Gulfstream Appraisal Group', 'the appraiser on the roster');
      lacks(roster, 'Gulfstream Appraisal Group · Gulfstream Appraisal Group', '⚠⚠ the firm prints once on the roster');
      const opt = await p.evaluate((id) => { const s = document.querySelector('#inv-guardrail select'); return s ? Array.from(s.options).map((o) => o.textContent.trim()) : []; }, LIV);
      ok(opt.indexOf('Gulfstream Appraisal Group (ISA)') >= 0, '⚠ the guardrail\'s picker names it once (' + opt.join(' | ') + ')');
      await openMore();
      const wl = await paper('#inv-more button[onclick="printAppraisalWorklist(' + LIV + ')"]', 'Appraisal Worklist (living)');
      has(wl, 'value as of the appraiser’s inspection', '⚠⚠ the worklist on a living job: the appraiser\'s inspection');
      lacks(wl, 'date of death', '…never a date of death');
      await close();
      // The line's record.
      await press('#inv-row-ch button[title="Open the full record"]', 'the dresser\'s ▾');
      const rec = await txt('#inv-row-ch');
      has(rec, 'Promised to someone', 'the record: a promise, in the desk\'s words');
      lacks(rec, 'Specific Bequest', '…never a bequest');
      lacks(rec, 'Flags & Track', '…the section is Flags');
      lacks(rec, 'Authorized By', '⚠ an everyday line the client approves by word: no Authorized By');
      await p.evaluate(() => { _invOpen = {}; renderInventoryTab(); }); await p.waitForTimeout(400);
      // The CSV, through its button.
      const dl = p.waitForEvent('download', { timeout: 8000 });
      await press('#inv-workbar button[onclick="exportInventoryCSV(' + LIV + ')"]', 'CSV');
      const d = await dl.catch(() => null);
      ok(!!d, 'the CSV downloads');
      const csv = d ? fs.readFileSync(await d.path(), 'utf8').replace(/^﻿/, '') : '';
      const head = csv.split('\r\n')[0] || '';
      ['Valuation Date', 'MAIV §20.2031-6', 'Exempt §732.402', 'Asset Track', 'Specific Bequest'].forEach((h) => lacks(head, h, '⚠ the living CSV: no "' + h + '"'));
      has(head, 'Promised to someone', '…a promise to someone');
      has(csv, ',2026-10-20 22:09,', '⚠ captured at 10:09 PM on the 20th, local time');
      lacks(csv, 'T02:09:00', '…never the UTC stamp');
    });

    // ── G ──
    await section('G. 1440 and 390 px: no horizontal overflow; zero page errors', async () => {
      ok((await overflow()) <= 0, 'no horizontal overflow at 1440 (' + (await overflow()) + ')');
      await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(500);
      for (const id of [PRO, UNA, LIV]) {
        await toDesk(id);
        await openMore();
        ok((await overflow()) <= 0, 'no horizontal overflow at 390 on ' + id + ', More ▾ open (' + (await overflow()) + ')');
        await press('#inv-more > summary', 'More ▾ (shut)');
      }
      await p.evaluate((id) => printEstateInventoryReport(id), PRO); await p.waitForTimeout(600);
      ok(await viewerOpen(), 'fixture: the Report in the viewer');
      ok((await overflow()) <= 0, 'the Report at 390: no horizontal overflow (' + (await overflow()) + ')');
      await close();
      eq(errs, [], 'zero page errors');
    });

    await b.close();
    console.log('\n' + pass + ' passed, ' + fail + ' failed');
    process.exit(fail ? 1 : 0);
  } catch (e) {
    console.log('  ✗ threw: ' + (e && e.stack || e));
    if (b) await b.close().catch(() => {});
    console.log('\n' + pass + ' passed, ' + (fail + 1) + ' failed');
    process.exit(1);
  }
})();
