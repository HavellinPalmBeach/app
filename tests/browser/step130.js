// Step 130 — P12 of the desk audit (2026-10-28): the close and the ledger tell the whole truth.
//
// Drives the REAL page with two clients at the close (every room cleared, the midpoint paid), on a sheet answered by the route:
//   • the Ashworth estate (probate, values tier): two representatives, Thomas and Nora; a portrait both signed for and gone, lamps
//     donated with no written approval (a ratification owed), a clock nobody decided, a rug only Thomas has signed for, a bookcase
//     to charity with nobody named still in the house, a Bible kept;
//   • the Hale home (Home Cleanout, hourly, no hours logged): a shotgun to the son with no written authority, a table on Hold,
//     a lamp nobody decided, an armchair kept.
//   A. The Ashworth desk, through its nav button and picker: the Closing bar opens by itself at the close, and its line names
//      each open item with its numbers (the undecided lines, the ratification, the approvals, the sold lines, the Court
//      Inventory still a draft, the ledger not signed); the Close-out card inside it carries step 5, Before you close, in the
//      question's own sentences.
//   B. The Disposition Ledger card: one row per signer, a press for each and one for both; the real file input under
//      "File the copy Thomas Ashworth signed" files a PDF (the route answers the upload); the card then reads Thomas on file and
//      Nora still to sign, and the bar's line says the ledger is not signed by Nora.
//   C. Print on the ledger card: Authorized by reads "ratification owed" and "signed so far by …; still to sign: …", the gaps are
//      above the table, a bookcase still in the house waits for a taker (never "left"), the sign-off is withheld (a line is
//      undecided); with the clock decided the sign-off reads "the record to date" (the stamp IN PROGRESS) under the ratification
//      sentence naming #2. Print media: the page fits.
//   D. Close job, pressed in the band: one question, "Still open:" and a line per entry with its numbers; Cancel keeps it open.
//   E. The Hale desk: the bar's line names the shotgun (a firearm), the two items with no destination (Hold counted), no hours
//      logged and the Contents Record unsigned; the Contents Record from the work bar opens in the viewer saying the held line has
//      no destination and withholding the sign-off; Close job's question says the same.
//   F. A device that has not read the inventory: Close job reads it first (the toast), then asks, naming the lines it read.
//   G. The Job Plan's Close-out card carries the same Before you close.
//   I. P12's review (2026-10-28): Close job reads the sheet again though the desk has read it, and the question names the client;
//      a second press while a slow read is out reads nothing more; the picker moved to the Hale desk while it was out, nothing is
//      asked or closed and the toast says so; a read the sheet fails is said as this device's copy; with the representative
//      recorded as Family Member and Nora as Other, the ledger card and the printed signature lines name them in a capacity.
//   At 1440 and 390 px no horizontal overflow; zero page errors throughout.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step130.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
const SYNC = 'https://sync.example.test/exec';
const A = 13001, H = 13002;
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
    const net = { reads: 0, uploads: [] };
    let sheet = {};
    let slow = 0, failRead = false;   // section I: a read the sheet answers late, or not at all
    await ctx.route(SYNC + '**', async (r) => {
      const req = r.request();
      const json = (o) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
      if (req.method() === 'POST') {
        let body = {}; try { body = JSON.parse(req.postData() || '{}'); } catch (e) {}
        if (body.action === 'uploadFile') { net.uploads.push(body.filename || body.name || ''); return json({ ok: true, fileUrl: 'https://drive.google.com/file/d/SIGNED' + net.uploads.length + '/view', fileId: 'SIGNED' + net.uploads.length }); }
        if (body.action === 'getSubfolders') return json({ ok: true, subfolders: null });
        return json({ ok: true });
      }
      if (/action=loadMedia/.test(req.url())) {
        net.reads++;
        if (slow) await new Promise((res) => setTimeout(res, slow));
        if (failRead) return r.fulfill({ status: 500, contentType: 'text/plain', body: 'Service unavailable' });
        return json({ ok: true, media: sheet });
      }
      if (/action=getSubfolders/.test(req.url())) return json({ ok: true, subfolders: null });
      return json({ ok: true });
    });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    const said = []; let answer = true;
    p.on('dialog', async (d) => { said.push(d.message()); if (answer) await d.accept(); else await d.dismiss(); });
    const section = async (name, body) => {
      console.log('\n## ' + name);
      try { await body(); } catch (e) { fail++; console.log('  ✗ ' + name + ' threw: ' + String(e && e.message || e).split('\n')[0]); }
    };
    const vis = (sel) => p.locator(sel).first().isVisible().catch(() => false);
    const press = async (sel, what) => {
      const n = await p.locator(sel).count();
      const v = n >= 1 && await vis(sel);
      ok(v, (what || sel) + ' — on screen (' + n + ')');
      if (v) { await p.locator(sel).first().click({ timeout: 5000 }).catch((e) => ok(false, (what || sel) + ' — ' + e.message.split('\n')[0])); await p.waitForTimeout(800); }
      return v;
    };
    // Restated 2026-11-02 (merging main: every card's paper opens on screen first): the ledger card's Print opens the Disposition
    // Ledger in the document viewer and prints nothing; the viewer's Print / Save PDF prints the page (what __prints reads), and
    // Close takes the viewer away so the desk under it can be pressed again. Returns the page printed.
    const viewerOpen = () => p.evaluate(() => { const o = document.getElementById('doc-viewer-modal'); return !!o && o.style.display === 'flex'; });
    const printLedger = async (what) => {
      const before = await p.evaluate(() => window.__prints.length);
      await press('#inv-ledger-card button:has-text("Print")', what);
      for (let i = 0; i < 25 && !(await viewerOpen()); i++) await p.waitForTimeout(200);   // the ledger reads the sheet first
      ok(await viewerOpen(), what + ': the ledger opens in the document viewer');
      eq(await txt('#doc-viewer-title'), 'Disposition Ledger', '…titled by the paper');
      eq(await p.evaluate(() => window.__prints.length), before, '…and nothing printed yet');
      await press('#doc-viewer-print', 'Print / Save PDF, in the viewer');
      eq(await p.evaluate(() => window.__prints.length), before + 1, 'Print / Save PDF printed the page once');
      await p.waitForTimeout(900);
      await press('#doc-viewer-modal button[onclick="closeDocViewer()"]', 'Close the viewer');
      ok(!(await viewerOpen()), 'Close takes the viewer away');
      return p.evaluate(() => window.__prints[window.__prints.length - 1] || '');
    };
    const txt = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }, sel);
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const barLine = (id) => p.evaluate((id) => Array.from(document.querySelectorAll('#desk-stat-closing-' + id + ' span')).map((s) => s.textContent.trim()).join(' · '), id);
    const barOpen = (id) => p.evaluate((id) => { const el = document.getElementById('desk-body-closing-' + id); return !!el && el.style.display !== 'none'; }, id);

    await p.goto(APP); await p.waitForTimeout(1600);
    sheet = await p.evaluate(([A, H, SYNC]) => {
      SHEETS_SYNC_URL = SYNC;
      try { localStorage.setItem('hav_device_user', 'Ashley Jerome'); } catch (e) {}
      window.open = function () { return null; };
      window.__prints = [];
      window.print = function () { const pt = document.getElementById('print-target'); window.__prints.push(pt ? pt.innerHTML : ''); };
      const T = Date.now() - 9 * 86400000;
      const base = (id, o) => Object.assign({ id, addr: id + ' Ocean Blvd', city: 'Palm Beach', zip: '33480', status: 'active', won: true, wonAt: '2026-09-25', approved: true,
        tc: 'Ashley Jerome', created: '2026-09-20', start: '2026-10-06', activatedOn: '2026-10-05', agrApproved: true, agrSent: true, agrSigned: true, sqft: 4200,
        driveFolder: 'https://drive.google.com/drive/folders/R' + id, driveSubfolders: { 'Estate Inventory': 'INV' + id, 'Signed Records': 'SR' + id }, at: {},
        docState: { agreement: { sentAt: '2026-09-26T14:00:00Z', sig: { signedBy: 'Client', signedAt: '2026-09-28' } }, 'invoice:deposit': { sentAt: '2026-09-29T14:00:00Z' } },
        payments: [{ uid: 'd' + id, stage: 'deposit', amount: 20000, receivedOn: '2026-10-01', method: 'wire', clearedOn: '2026-10-01' },
          { uid: 'm' + id, stage: 'midpoint', amount: 10000, receivedOn: '2026-10-15', method: 'wire', clearedOn: '2026-10-15' }] }, o);
      jobs.unshift(base(A, { hvlId: 'HVL-2610-P12A', name: 'Margaret Ashworth', svc: 'probate', matterType: 'probate', docTier: 'values', gate706: 'no',
        executor: 'Thomas Ashworth', executorRole: 'Personal Representative', executorEmail: 'thomas@example.com', deathDate: '2026-06-02', executorAuth: 'received',
        probateAttyName: 'Ann Lowe', probateAttyEmail: 'ann@lowe.law',
        coFiduciaries: [{ id: 'c1', name: 'Nora Ashworth', role: 'Co-Personal Representative', email: 'nora@example.com' }] }));
      jobs.unshift(base(H, { hvlId: 'HVL-2610-P12H', name: 'Robert Hale', svc: 'home_cleanout', docTier: '' }));
      const est = (id, svc, fixed) => ({ approved: true, submitted: true, approvedBy: 'Anthony Graziano', savedAt: T,
        estimate: { jobId: id, svc, havellinTotal: 40000, fixedPrice: fixed, fixedAmount: fixed ? 40000 : 0, fixedLines: true, totTC: 100, totPS: 150, tcRate: 150, psRate: 100, days: 8,
          vendors: [], prepItems: [], pkgCost: 0, rooms: [{ idx: 0, name: 'Living Room', st: 'in', vol: 3, cplx: 3 }, { idx: 1, name: 'Kitchen', st: 'in', vol: 3, cplx: 3 }] } });
      estimateStore[A] = est(A, 'probate', true);
      estimateStore[H] = est(H, 'home_cleanout', false);
      [A, H].forEach((id) => { jobPlanStore[id] = { rooms: { 0: { status: 'cleared' }, 1: { status: 'cleared' } }, tasks: {}, at: {} }; });
      const line = (id, sid, no, o) => Object.assign({ stableId: sid, itemNo: no, label: 'inventory', roomIdx: 0, status: 'uploaded', category: 'Furniture', namedBy: 'desk',
        ts: T + no * 60000, updatedAt: T + no * 60000, condition: 'Good', filename: 'HVL_' + id + '_INV_' + sid + '.jpg', driveFileId: 'f-' + sid,
        driveFileUrl: 'https://drive.google.com/file/d/f-' + sid + '/view' }, o);
      const BOTH = 'Thomas Ashworth; Nora Ashworth';
      _photoRefs[A] = [
        line(A, 'a1', 1, { objectName: 'Sargent portrait', category: 'Art', fmv: 900, disposition: 'Auction', channel: 'Kodner Galleries', gross: 1000, fees: 250, dispDate: '2026-10-18', authBy: BOTH, approvalDate: '2026-10-15' }),
        line(A, 'a2', 2, { objectName: 'Pair of brass table lamps', fmv: 80, disposition: 'Donate', channel: 'Goodwill Palm Beach', dispDate: '2026-10-18' }),
        line(A, 'a3', 3, { objectName: 'Mantel clock', fmv: 40, disposition: '' }),
        // The rug's name is still Agent One's and nobody has looked at it: the papers read IN PROGRESS.
        line(A, 'a4', 4, { objectName: 'Tabriz rug', fmv: 400, disposition: 'Consign', channel: 'Palm Consign', authBy: 'Thomas Ashworth', approvalDate: '2026-10-21', namedBy: 'agent' }),
        // The bookcase has no value yet: the Court Inventory is still a draft.
        line(A, 'a6', 6, { objectName: 'Oak bookcase', fmv: '', disposition: 'Donate', channel: '' }),
        line(A, 'a8', 8, { objectName: 'Family Bible', fmv: 20, disposition: 'Keep' }),
      ];
      _photoRefs[H] = [
        line(H, 'h1', 1, { objectName: 'Remington 870 shotgun', category: 'Firearms', disposition: 'Distribute', channel: 'Susan Hale' }),
        line(H, 'h2', 2, { objectName: 'Mahogany drop-leaf side table', disposition: 'Hold' }),
        line(H, 'h3', 3, { objectName: 'Desk lamp', disposition: '' }),
        line(H, 'h4', 4, { objectName: 'Armchair', disposition: 'Keep' }),
      ];
      savePhotoRefs(A); savePhotoRefs(H);
      saveJobs(); localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore));
      _logsState = 'ready';
      return { [A]: { items: JSON.parse(JSON.stringify(_photoRefs[A])) }, [H]: { items: JSON.parse(JSON.stringify(_photoRefs[H])) } };
    }, [A, H, SYNC]);

    const toDesk = async (id) => {
      await p.click('.nb[onclick*="\'inventory\'"]'); await p.waitForTimeout(900);
      const cur = String(await p.evaluate(() => (document.getElementById('inv-job') || {}).value));
      if (cur !== String(id)) { await p.selectOption('#inv-job', String(id)); await p.waitForTimeout(1500); }
    };
    const toPlan = async (id) => {
      await p.click('.nb[onclick*="\'job-plan\'"]'); await p.waitForTimeout(900);
      const cur = await p.evaluate(() => document.getElementById('plan-job').value);
      if (String(cur) !== String(id)) { await p.selectOption('#plan-job', String(id)); await p.waitForTimeout(1200); }
    };

    await section('A. the estate at the close: the Closing bar names each open item with its numbers; the Close-out card says the same', async () => {
      await toDesk(A);
      ok(await barOpen(A), 'the Closing bar opens by itself at the close');
      const line = await barLine(A);
      has(line, '1 line with no disposition (#3)', '⚠⚠ VAL-14: the undecided clock, by number');
      has(line, '1 ratification owed (#2)', '⚠⚠ EST-14: the lamps that left with no written approval');
      has(line, 'items leaving without the written approval needed (#4, #6)', 'the approvals owed');
      has(line, 'sold lines on no statement (#1, #4)', 'the sold lines on no statement');
      has(line, 'Court Inventory still a draft (', '⚠ VAL-26: the schedule said to be a draft');
      lacks(line, 'Adopted Court Inventory not filed yet', '…never "not filed yet" while it withholds its signature block');
      has(line, 'Disposition Ledger not signed yet', 'the ledger');
      const card = await txt('#close-ready-admin-' + A);
      has(card, 'Before you close', 'the Close-out card carries step 5');
      has(card, '1 item left the property before its written approval was complete: a ratification is owed (#2).', '…in the question\'s sentences');
      has(card, 'None of it stops the close', '…and says none of it is a refusal');
      ok(await p.locator('#close-ready-admin-' + A).first().isVisible(), 'and it is on screen');
    });

    await section('B. the Disposition Ledger card: a row per signer; the real file input files Thomas\'s copy; Nora still to sign', async () => {
      const card = await txt('#inv-ledger-card');
      has(card, '⚠ Thomas Ashworth, Personal Representative — not signed on a copy filed yet', 'Thomas\'s row');
      has(card, '⚠ Nora Ashworth, Co-Personal Representative — not signed on a copy filed yet', 'Nora\'s row');
      for (const w of ['File the copy Thomas Ashworth signed', 'File the copy Nora Ashworth signed', 'File the copy signed by Thomas Ashworth and Nora Ashworth']) {
        ok(await p.locator('#inv-ledger-card label.btn-s', { hasText: w }).first().isVisible(), 'the card offers: ' + w);
      }
      const input = p.locator('#inv-ledger-card label.btn-s', { hasText: 'File the copy Thomas Ashworth signed' }).first().locator('input[type=file]');
      await input.setInputFiles({ name: 'ledger-thomas.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 signed by Thomas') });
      await p.waitForTimeout(2500);
      eq(net.uploads.length, 1, 'one upload to Drive');
      const rec = await p.evaluate((A) => (jobs.find((j) => j.id === A).signedRecords || []).map((r) => [r.kind, r.ref, r.signedBy]), A);
      eq(rec, [['ledger', 'ledger', 'Thomas Ashworth']], '⚠⚠ EST-13: the copy records who signed it');
      const after = await txt('#inv-ledger-card');
      has(after, '✓ Thomas Ashworth, Personal Representative — signed copy filed', 'Thomas on file');
      has(after, '⚠ Nora Ashworth, Co-Personal Representative — not signed on a copy filed yet', 'Nora still to sign');
      ok(await p.locator('#inv-ledger-card label.btn-s', { hasText: 'File the copy signed by Nora Ashworth' }).first().isVisible(), 'the press for Nora\'s copy');
      eq(await p.locator('#inv-ledger-card label.btn-s', { hasText: 'Thomas Ashworth signed' }).count(), 0, 'no press for Thomas any more');
      has(await barLine(A), 'Disposition Ledger not signed by Nora Ashworth', 'the bar names who is still to sign');
    });

    await section('C. the ledger printed: Authorized by says what is owed; the gaps; the sign-off\'s words; the ratification sentence; print media', async () => {
      const html = await printLedger('Print, on the ledger card');   // through the viewer since 2026-11-02
      const t = String(html).replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;|&#\d+;/g, (m) => ({ '&amp;': '&', '&rsquo;': '’', '&mdash;': '—', '&nbsp;': ' ' }[m] || m)).replace(/\s+/g, ' ');
      has(t, 'Pair of brass table lamps Donate Goodwill Palm Beach ratification owed', '⚠⚠ DOC-11: the lamps read "ratification owed"');
      has(t, 'signed so far by Thomas Ashworth (Oct 21, 2026); still to sign: Nora Ashworth', '⚠⚠ REL-08: one of two, and who is still to sign');
      has(t, 'left the property before its written approval was complete', 'the gap above the table');
      has(t, 'waits for somebody to be named to take it: #6 Oak bookcase', '⚠ DOC-12: still in the house, so it waits');
      lacks(t, 'left the property with no recipient recorded: #6', '…never "left"');
      has(t, 'The sign-off is withheld', 'a line undecided: no sign-off');
      // Decide the clock through its row's select, then print again: the record to date, under the ratification sentence.
      const sel = p.locator('#panel-inventory select[onchange*="\'a3\'"][onchange*="disposition"]').first();
      if (await sel.count()) { await sel.selectOption('Keep'); await p.waitForTimeout(1200); }
      else await p.evaluate((A) => { const r = _photoRefs[A].find((x) => x.stableId === 'a3'); r.disposition = 'Keep'; r.updatedAt = Date.now(); savePhotoRefs(A); renderInventoryTab(); }, A);
      const html2 = await printLedger('Print again');   // through the viewer since 2026-11-02
      const t2 = String(html2).replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;|&#\d+;/g, (m) => ({ '&amp;': '&', '&rsquo;': '’', '&mdash;': '—', '&nbsp;': ' ' }[m] || m)).replace(/\s+/g, ' ');
      has(t2, 'Reviewed and approved as the record to date of the disposition of the property listed above.', '⚠⚠ Ask 12: the record to date under IN PROGRESS');
      lacks(t2, 'as the final record of the disposition', '…never the final record under a working copy');
      has(t2, 'By signing below, each signer also ratifies the release of the item marked ratification owed above (#2)', '⚠⚠ Ask 13: the ratification sentence');
      ok(t2.indexOf('ratifies the release') < t2.indexOf('Sign-off'), '…above the sign-off');
      // Print media: the page in #print-target fits Letter.
      await p.evaluate((h) => { document.getElementById('print-target').innerHTML = h; }, html2);
      await p.emulateMedia({ media: 'print' });
      const pw = await p.evaluate(() => { const el = document.getElementById('print-target'); return el ? el.scrollWidth - el.clientWidth : -1; });
      ok(pw <= 1, 'print media: the ledger fits its page (' + pw + ')');
      await p.emulateMedia({ media: 'screen' });
      await p.evaluate(() => { document.getElementById('print-target').innerHTML = ''; });
    });

    await section('D. Close job, pressed in the band: one question naming everything open; Cancel keeps it open', async () => {
      answer = false; said.length = 0;
      await press('#panel-inventory button:has-text("Close job")', 'Close job, in the band');
      await p.waitForTimeout(800);
      const q = said.join('\n');
      has(q, 'Still open:', '⚠⚠ NEW-04: the question lists what is open');
      has(q, '• 1 item left the property before its written approval was complete: a ratification is owed (#2).', 'the ratification');
      has(q, 'do not have the written approval they need (#4, #6)', 'the approvals');
      has(q, 'The Disposition Ledger on file is not signed by Nora Ashworth.', 'who is still to sign the ledger');
      has(q, 'Closing does not change any of these: finish them, or close now.', 'a flag, not a refusal');
      lacks(q, 'name the recipients', 'never a fix for something not open');
      eq(await p.evaluate((A) => jobs.find((j) => j.id === A).status, A), 'active', 'Cancel keeps the job open');
      answer = true;
    });

    await section('E. the living home: the shotgun, the Hold line, the hours, the Contents Record', async () => {
      await toDesk(H);
      ok(await barOpen(H), 'the Closing bar opens at the close');
      const line = await barLine(H);
      has(line, '1 item leaving without the written approval needed (#1 (a firearm))', '⚠⚠ NEW-04: the shotgun with no written authority');
      has(line, '2 items with no destination (#2, #3)', '⚠ LIV-11: the Hold line counted');
      has(line, 'no hours logged', 'no hours on an hourly job');
      has(line, 'Contents Record not signed yet', '⚠ LIV-13: the Contents Record');
      await press('#panel-inventory button[onclick="printContentsRecord(' + H + ')"]', 'Contents Record, on the work bar');
      const v = await txt('#doc-viewer-body');
      has(v, 'held back with no destination yet', 'the held table is a gap');
      has(v, 'held back for now: no destination yet', '…its heading says what Hold means');
      has(v, 'The sign-off is withheld. 2 items have no destination recorded yet (1 on Hold).', '…and the sign-off waits for it');
      lacks(v, 'Values and dispositions', 'the stamp states no values');
      if (await vis('#doc-viewer-modal button[onclick="closeDocViewer()"]')) await press('#doc-viewer-modal button[onclick="closeDocViewer()"]', 'Close the viewer');
      answer = false; said.length = 0;
      await press('#panel-inventory button:has-text("Close job")', 'Close job, on the living home');
      await p.waitForTimeout(800);
      const q = said.join('\n');
      has(q, 'leaving the property does not have the written approval it needs (#1 (a firearm)).', 'the question names the shotgun');
      has(q, 'No hours are logged yet, so the final invoice cannot be priced.', '…and the hours');
      has(q, 'The Contents Record has no signed copy on file.', '…and the client\'s paper');
      answer = true;
    });

    await section('F. a device that has not read the inventory: Close job reads it first, then asks', async () => {
      await toDesk(A);
      const before = net.reads;
      await p.evaluate((A) => { delete _invCloudSeen[A]; }, A);
      answer = false; said.length = 0;
      await p.locator('#panel-inventory button:has-text("Close job")').first().click();
      await p.waitForTimeout(200);
      const badge = await p.evaluate(() => document.body.innerText.indexOf('Reading the inventory from the sheet first') >= 0);
      await p.waitForTimeout(2000);
      ok(net.reads > before, 'the sheet is read');
      ok(badge || said.length > 0, 'the toast said why, or the read landed at once');
      has(said.join('\n'), 'Still open:', 'then the question is asked');
      has(said.join('\n'), '(#2)', '…naming the lines the read brought');
      answer = true;
    });

    await section('G. the Job Plan\'s Close-out card carries the same list', async () => {
      await toPlan(A);
      const t = await txt('#close-ready-plan-' + A);
      has(t, 'Before you close', 'step 5 on the plan');
      has(t, 'a ratification is owed (#2)', '…with the same entries');
    });

    await section('I. P12\'s review: Close job reads on every press, names the client, is never asked over another client, says a failed read', async () => {
      await toDesk(A);
      const toast = () => txt('#sync-status');
      // 1. The desk has read the sheet: Close job reads it again, then asks, by name.
      let before = net.reads;
      answer = false; said.length = 0;
      await p.locator('#panel-inventory button:has-text("Close job")').first().click();
      await p.waitForTimeout(1800);
      ok(net.reads > before, '⚠⚠ read already on this device: Close job reads the sheet again (' + (net.reads - before) + ')');
      eq(said.length, 1, 'then one question');
      ok(/^Close Margaret Ashworth's job now\?/.test(said[0] || ''), '⚠⚠ the question names the client: ' + JSON.stringify((said[0] || '').slice(0, 40)));
      // 2. A slow read; a second press; the picker moved to the Hale desk before it lands.
      slow = 3500; said.length = 0; before = net.reads;
      await p.locator('#panel-inventory button:has-text("Close job")').first().click();
      await p.waitForTimeout(300);
      await p.evaluate(() => { const el = document.getElementById('sync-status'); if (el) el.textContent = ''; });
      await p.locator('#panel-inventory button:has-text("Close job")').first().click();
      await p.waitForTimeout(200);
      has(await toast(), 'Reading the inventory from the sheet first', '⚠ a second press while it reads says the toast again');
      await p.selectOption('#inv-job', String(H));
      await p.waitForTimeout(slow + 2500);
      eq(said.length, 0, '⚠⚠ the Hale desk on screen when the read lands: nothing asked');
      eq(await p.evaluate((A) => jobs.find((j) => j.id === A).status, A), 'active', '…and Ashworth not closed');
      has(await toast(), 'Close job was not asked: another screen is showing now. Open Margaret Ashworth and press Close job again.', '…and the toast says so');
      eq(net.reads - before >= 1, true, 'the read went');
      slow = 0;
      // 3. The sheet does not answer: the question says the list is this device's copy.
      await toDesk(A);
      failRead = true; said.length = 0;
      await p.locator('#panel-inventory button:has-text("Close job")').first().click();
      await p.waitForTimeout(2500);
      failRead = false;
      has(said[0] || '', 'The sheet did not answer just now, so what is open on the inventory is read off this device’s copy, which may be behind.', '⚠⚠ a read that failed is said in the question');
      eq(await p.evaluate((A) => jobs.find((j) => j.id === A).status, A), 'active', 'Cancel keeps it open');
      answer = true;
      // 4. The representative recorded as Family Member, Nora as Other: the ledger names them in a capacity, on the card and the page.
      await p.evaluate((A) => { const j = jobs.find((x) => x.id === A); j.executorRole = 'Family Member';
        (j.coFiduciaries || []).forEach((c) => { c.role = 'Other'; }); saveJobs(); renderInventoryTab(); }, A);
      await p.waitForTimeout(900);
      const card = await txt('#inv-ledger-card');
      has(card, 'Thomas Ashworth, Personal Representative', '⚠⚠ the card: the representative in a capacity');
      has(card, 'Nora Ashworth, Co-Personal Representative', '…Nora, recorded as Other, as a co-representative');
      lacks(card, 'Family Member', '…never the raw role recorded');
      const html = await printLedger('Print, on the ledger card');   // through the viewer since 2026-11-02
      const t = String(html).replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;|&#\d+;/g, (m) => ({ '&amp;': '&', '&rsquo;': '’', '&mdash;': '—', '&nbsp;': ' ' }[m] || m)).replace(/\s+/g, ' ');
      has(t, 'Thomas Ashworth, Personal Representative', 'the signature line in a capacity');
      has(t, 'Nora Ashworth, Co-Personal Representative', '…and hers');
      lacks(t, 'Family Member', 'no relationship printed as a capacity');
      await p.evaluate((A) => { const j = jobs.find((x) => x.id === A); j.executorRole = 'Personal Representative';
        (j.coFiduciaries || []).forEach((c) => { c.role = 'Co-Personal Representative'; }); saveJobs(); renderInventoryTab(); }, A);
      await p.waitForTimeout(600);
    });

    await section('H. widths and errors', async () => {
      await toDesk(A);
      eq(await overflow(), 0, 'no horizontal overflow at 1440 px');
      await p.setViewportSize({ width: 390, height: 900 });
      await p.waitForTimeout(600);
      eq(await overflow(), 0, 'no horizontal overflow at 390 px');
      eq(errs, [], 'zero page errors');
    });

    await b.close();
  } catch (e) {
    fail++; console.log('  ✗ threw: ' + (e && e.stack || e));
    if (b) await b.close().catch(() => {});
  }
  console.log(pass + ' passed, ' + fail + ' failed');
})();
