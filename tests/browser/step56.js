// Step 56 — P19 · W3, the desk's releases (2026-10-03). Anthony: "i'm good with all of your calls. build it all".
//
// Drives the REAL page through its own controls on the Job Admin & Inv desk: the Beneficiaries & specific bequests card
// (its forms, Save, Match), a row's To a person recipient box and its suggestions, the workbar's Approval Request, the
// bulk bar (its checkboxes, Record approval, Set recipient), the Record approval dialog (its ticks, its date, Record
// approval, its File the signed request picker), the Releases & signed papers card (Print receipt, File signed receipt,
// File the received copy) and the Job Admin fold. The Apps Script is a route: uploadFile answers as the deployment would.
// What is seeded is state a person could not type in one sitting: an active trust estate with two co-trustees (W1 builds
// their inputs) and a manifest, a probate estate, a living client.
//
//   A. the beneficiaries and bequests: a roster and two bequests typed in, a line matched by item number (marked a
//      specific bequest); "not yet found"; the flagged line no bequest covers named; a matched line proposed for Auction
//      badged on its row; the To a person box offers the roster
//   B. the Approval Request addresses both co-trustees, prints a signature line for each and says both must sign, names
//      the designated item going elsewhere and its beneficiary, and states the staff rule in the trust's words
//   C. Record approval: one co-trustee ticked is refused, naming the other, and nothing is written; both ticked records
//      "Ruth Adler; Daniel Adler" on every line; the signed request is filed to Drive from the dialog and listed
//      RESTATED 2026-10-05 (P20, Q24): one co-trustee ticked is saved as a partial approval, never refused (step 61);
//      here the dialog says so before saving, and both are ticked, as the returned paper shows
//   D. receipts: the card names what is owed, the receipt prints (who it came from, by matter), the signed copy files
//      back and the line counts as receipted; the Job Admin line reads 1 of 2
//   E. staff never buy: a recipient naming the concierge on a sale is refused in the row, and the bulk bar refuses a
//      crew member across the selection, naming the rule; nothing is written
//   F. a co-trustee recorded after the approval makes it incomplete, and the desk says who is missing; the Trust Schedule
//      files as received; a probate estate offers the Court Inventory instead; a living client has no bequest card
//   G. overflow at 1440 and 390 (the cards, the dialog), the request and the receipt at Letter width in print; no errors
//
//   NODE_PATH=/opt/node22/lib/node_modules node tests/browser/step56.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');

const SYNC = 'https://script.google.com/macros/s/STEP56/exec';
const T0 = Date.parse('2026-09-24T15:00:00Z');   // a past day, so the desk opens on All
const PDF = { name: 'signed.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 step56 signed page') };

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
    const net = { posts: [], uploads: [] };
    await ctx.route(SYNC + '**', async (r) => {
      const req = r.request();
      const json = (o) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(o) });
      if (req.method() === 'POST') {
        let body = {}; try { body = JSON.parse(req.postData() || '{}'); } catch (e) {}
        net.posts.push(body.type || body.action || '?');
        if (body.action === 'uploadFile') {
          net.uploads.push({ folderId: body.folderId, filename: body.filename });
          const n = net.uploads.length;
          return json({ ok: true, fileUrl: 'https://drive.google.com/file/d/S' + n + '/view', fileId: 'S' + n });
        }
        return json({ ok: true });
      }
      return json({ ok: false, error: 'not in this test' });
    });
    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    const dialogs = [];
    p.on('dialog', async (d) => { dialogs.push(d.type() + ': ' + d.message()); await d.accept(); });
    const hookPrint = () => p.evaluate(() => { window.open = function () { return null; }; window.__prints = window.__prints || [];
      window.print = function () { const pt = document.getElementById('print-target');
        window.__prints.push({ html: pt ? pt.innerHTML : '', over: document.documentElement.scrollWidth - document.documentElement.clientWidth }); }; });
    await p.goto(APP); await p.waitForTimeout(1600);
    await hookPrint();
    await p.evaluate((u) => { SHEETS_SYNC_URL = u; }, SYNC);

    const section = async (name, body) => {
      console.log('\n## ' + name);
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
    const type = async (sel, value, what) => {
      const v = (await p.locator(sel).count()) === 1 && await vis(sel);
      ok(v, (what || sel) + ' — the box is on screen');
      if (v) { await p.fill(sel, value); }
      return v;
    };
    const txt = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }, sel);
    const T = (h) => p.evaluate((h) => { const d = document.createElement('div');
      d.innerHTML = String(h).replace(/<\/td>/g, ' </td>').replace(/<br>/g, ' '); return d.textContent.replace(/\s+/g, ' '); }, h);
    const lastPrint = () => p.evaluate(() => (window.__prints || []).slice(-1)[0] || { html: '', over: 0 });
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const job = (id) => p.evaluate((id) => JSON.parse(JSON.stringify(jobs.find((j) => j.id === id) || null)), id);
    const line = (id, sid) => p.evaluate(([id, sid]) => JSON.parse(JSON.stringify((_photoRefs[id] || []).find((r) => r.stableId === sid) || null)), [id, sid]);
    const until = async (f, ms) => { for (let i = 0; i < (ms || 6000) / 150; i++) { if (await f()) return true; await p.waitForTimeout(150); } return false; };
    // The print path takes the panels away for about 650 ms (_printDocument), and a filing that lands meanwhile repaints
    // the dashboard rather than the desk (_signedCopyRepaint asks _jobBandHost). A person cannot file that fast, so the
    // step waits for the print to close, as they would, rather than for a fixed time that load can outrun.
    const printClosed = () => until(() => p.evaluate(() => { const pt = document.getElementById('print-target');
      return !!pt && pt.style.display === 'none' && !!document.querySelector('.panel.active'); }));
    const toDesk = async (id) => {
      await p.evaluate((id) => { setCurrentJob(id); populateInventorySelect(); }, id);
      await p.click('.nb[onclick*="\'inventory\'"]'); await p.waitForTimeout(700);
      const sel = await p.evaluate(() => (document.getElementById('inv-job') || {}).value);
      if (String(sel) !== String(id)) { await p.selectOption('#inv-job', String(id)); await p.waitForTimeout(700); }
    };
    const rowText = (sid) => txt('#inv-row-' + sid);
    const pick = async (sid) => { await p.click('#inv-row-' + sid + ' input[type=checkbox][title="Select for a bulk change"]'); await p.waitForTimeout(300); };

    // ── Seed: a trust estate with two co-trustees, a probate estate, a living client ──
    await p.evaluate((T0) => {
      const base = { status: 'active', won: true, wonAt: '2026-09-17', approved: true, tc: 'Ashley Jerome', city: 'Palm Beach', zip: '33480',
        created: '2026-09-10', start: '2026-09-21', driveFolder: 'https://drive.google.com/drive/folders/ROOT56', docTier: 'values',
        driveSubfolders: { 'Estate Inventory': 'SUB-INV', 'As-Found Record': 'SUB-AF', 'Signed Records': 'SIGNED-56' }, updatedAt: T0 };
      const L = (id, o) => Object.assign({ stableId: id, label: 'inventory', collId: null, roomIdx: 1, seq: 1, status: 'uploaded', qty: 1,
        category: 'Furniture', condition: 'Good', ts: T0, updatedAt: T0, driveFileId: 'f-' + id, driveFileUrl: 'https://drive.google.com/file/d/f-' + id + '/view' }, o);
      const est = (id, svc) => ({ approved: true, submitted: true, approvedBy: 'Anthony Graziano', savedAt: T0,
        estimate: { jobId: id, svc, havellinTotal: 20000, totTC: 40, totPS: 80, days: 4, collections: [], vendors: [], prepItems: [],
          rooms: [{ idx: 1, name: 'Study', st: 'in' }, { idx: 4, name: 'Kitchen', st: 'in' }] } });
      jobs.unshift(
        Object.assign({ id: 5601, hvlId: 'HVL-2610-T561', name: 'Walter Ellsworth', fname: 'Walter', lname: 'Ellsworth', svc: 'cleanout',
          addr: '69 Beach Blvd', matterType: 'trust', trustName: 'Ellsworth Family Trust', deathDate: '2026-04-02',
          executor: 'Ruth Adler', executorRole: 'Trustee', executorEmail: 'ruth@adler.example',
          coFiduciaries: [{ id: 'cf1', name: 'Daniel Adler', role: 'Co-trustee', email: 'dan@adler.example' }] }, base),
        Object.assign({ id: 5602, hvlId: 'HVL-2610-P562', name: 'Harold Finch', fname: 'Harold', lname: 'Finch', svc: 'probate',
          addr: '3 Ocean Blvd', matterType: 'probate', executor: 'Ann Finch', deathDate: '2026-05-01' }, base),
        Object.assign({ id: 5603, hvlId: 'HVL-2610-L563', name: 'Margaret Ellsworth', fname: 'Margaret', lname: 'Ellsworth', svc: 'downsizing_move',
          addr: '14 Coconut Row', destAddr: '801 Sunset Ave', docTier: '' }, base));
      estimateStore[5601] = est(5601, 'cleanout');
      estimateStore[5602] = est(5602, 'probate');
      estimateStore[5603] = est(5603, 'downsizing_move');
      _photoRefs[5601] = [
        L('s1', { itemNo: 1, objectName: 'Sargent portrait', category: 'Art & Décor', fmv: '48000', disposition: 'Auction', channel: 'Christie’s' }),
        L('s2', { itemNo: 2, objectName: 'Tea service', category: 'Silver & Precious Metal', fmv: '1200', disposition: 'Distribute', channel: 'Mary Smith', condition: 'Excellent' }),
        L('s3', { itemNo: 3, objectName: 'Locket', category: 'Jewelry & Watches', fmv: '300', disposition: 'Distribute' }),
        L('s4', { itemNo: 4, objectName: 'Tabriz rug', category: 'Rugs & Carpets', fmv: '9000', disposition: 'Sell', flagBequest: true }),
        L('s5', { itemNo: 5, objectName: 'Sofa', fmv: '200', disposition: 'Donate' }),
      ];
      _photoRefs[5602] = [L('p1', { itemNo: 1, objectName: 'Dining table', fmv: '900', disposition: 'Sell' })];
      _photoRefs[5603] = [L('v1', { itemNo: 1, objectName: 'Floor lamp', disposition: 'Donate', authBy: 'Margaret Ellsworth', approvalDate: '2026-10-01' })];
      [5601, 5602, 5603].forEach((id) => savePhotoRefs(id));
      saveJobs();
      localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore));
    }, T0).catch((e) => ok(false, 'seed: ' + e.message.split('\n')[0]));

    // ════════════════════════════════════════════════════════════════════════════════════════════════════
    await section('A. beneficiaries and bequests, typed at the desk; a line matched by item number', async () => {
      await toDesk(5601);
      ok(await vis('#inv-bequests'), 'the Beneficiaries & specific bequests card is on the desk');
      has(await txt('#inv-bequests'), 'Havellin never reads or interprets the will or the trust', 'and says whose list it is');
      has(await txt('#inv-bequests'), 'Flagged Specific Bequest, and no bequest on the list covers it: #4 Tabriz rug', '⚠ the flagged line no bequest covers is named');
      await type('#bq-ben-name-5601', 'Mary Smith', 'the beneficiary\'s name');
      await type('#bq-ben-rel-5601', 'niece');
      await type('#bq-ben-email-5601', 'mary@smith.example');
      await press('button[onclick="invSaveBeneficiary(5601)"]', 'Save beneficiary');
      await type('#bq-ben-name-5601', 'John Smith');
      await press('button[onclick="invSaveBeneficiary(5601)"]', 'Save beneficiary, again');
      const card = await txt('#inv-bequests');
      has(card, 'Mary Smith · niece · mary@smith.example', 'the roster lists Mary');
      has(card, 'John Smith', 'and John');
      eq(((await job(5601)).beneficiaries || []).map((x) => x.name), ['Mary Smith', 'John Smith'], 'on the job record');
      // A bequest, in the representative's words, matched to item #1.
      await type('#bq-desc-5601', 'the Sargent portrait of her mother', 'the bequest as given');
      await p.selectOption('#bq-benid-5601', { label: 'Mary Smith' });
      await type('#bq-items-5601', '1');
      await press('button[onclick="invSaveBequest(5601)"]', 'Save bequest');
      await type('#bq-desc-5601', 'the gold watch');
      await p.selectOption('#bq-benid-5601', { label: 'John Smith' });
      await press('button[onclick="invSaveBequest(5601)"]', 'Save the second bequest');
      const c2 = await txt('#inv-bequests');
      has(c2, '“the Sargent portrait of her mother” → Mary Smith', 'the bequest, with its beneficiary');
      has(c2, 'Matched: #1 Sargent portrait', 'matched to line #1');
      has(c2, '“the gold watch” → John Smith', 'the second bequest, with its beneficiary');
      has(await p.evaluate(() => { const r = Array.from(document.querySelectorAll('#inv-bequests .inv-bq-row')).find((x) => /gold watch/.test(x.textContent));
        return r ? r.textContent.replace(/\s+/g, ' ') : ''; }), 'not yet found', '⚠ the bequest with no line reads "not yet found"');
      ok((await line(5601, 's1')).flagBequest === true, '⚠⚠ matching marked the line a specific bequest');
      has(c2, 'Designated items proposed to go elsewhere: #1 Sargent portrait (bequest to Mary Smith; proposed: Auction)', 'and the card names the line going elsewhere');
      has(await rowText('s1'), '⚠ bequest to Mary Smith · going elsewhere', '⚠ the desk row carries it');
      // Match line #2 with the bequest's own box.
      const matchBox = await p.evaluate(() => { const els = Array.from(document.querySelectorAll('#inv-bequests [id^="bq-match-"]')); return els.length ? '#' + els[0].id : ''; });
      await type(matchBox, '2', 'the first bequest\'s Match box');
      const matchBtn = await p.evaluate(() => { const b = document.querySelector('#inv-bequests button[onclick^="invMatchBequest(5601,"]'); return b ? b.getAttribute('onclick') : ''; });
      await press('#inv-bequests button[onclick=\'' + matchBtn + '\']', 'Match');
      has(await txt('#inv-bequests'), 'Matched: #1 Sargent portrait ✕ · #2 Tea service', 'line #2 is matched too');
      has(await rowText('s2'), 'bequest to Mary Smith', 'its row names whose it is');
      lacks(await rowText('s2'), 'going elsewhere', 'and carries no caution: it is going to Mary');
      // The To a person box offers the roster, and stays free text.
      eq(await p.getAttribute('#inv-row-s3 input[placeholder="Who took it?"]', 'list'), 'inv-ben-list-5601', '⚠ the To a person box offers the roster');
      eq(await p.evaluate(() => Array.from(document.querySelectorAll('#inv-ben-list-5601 option')).map((o) => o.value)), ['Mary Smith', 'John Smith'], 'as suggestions');
      await p.fill('#inv-row-s3 input[placeholder="Who took it?"]', 'John Smith');
      await p.press('#inv-row-s3 input[placeholder="Who took it?"]', 'Tab'); await p.waitForTimeout(300);
      eq((await line(5601, 's3')).channel, 'John Smith', 'the recipient is written');
    });

    // ════════════════════════════════════════════════════════════════════════════════════════════════════
    await section('B. the Approval Request: both co-trustees, a line each, the designated item named, the staff rule', async () => {
      await toDesk(5601);
      await press('#inv-workbar button[onclick="printApprovalRequest(5601)"]', 'Approval Request');
      const h = (await lastPrint()).html, t = await T(h);
      has(h, 'To <strong>Ruth Adler and Daniel Adler</strong>', '⚠⚠ addressed to both co-trustees');
      has(t, 'Every co-trustee named below must sign: nothing on this list is approved until all 2 of you have.', 'saying both must sign');
      eq((h.match(/Approved by: _{10}/g) || []).length, 2, '⚠⚠ a signature line for each');
      has(t, 'Daniel Adler, Co-trustee / authorized fiduciary', 'the co-trustee\'s line');
      has(t, 'Designated items proposed to go elsewhere', 'the bequest notice');
      has(t, '#1 Sargent portrait (bequest to Mary Smith; proposed: Auction)', '⚠ naming the line and the beneficiary');
      has(h, 'BEQUEST TO MARY SMITH', 'and the row\'s badge');
      has(t, 'Havellin and its people never purchase or receive trust property, and take no share of the proceeds of its sale.', '⚠ the staff rule, in the trust\'s words');
      has(t, 'filed with the trust’s records', 'filed with the trust\'s records');
      lacks(t, 'Personal Representative', 'no Personal Representative on a trust');
    });

    // ════════════════════════════════════════════════════════════════════════════════════════════════════
    await section('C. Record approval: every co-trustee or nothing; then the signed request filed from the dialog', async () => {
      await toDesk(5601);
      await pick('s1'); await pick('s2'); await pick('s3');
      await press('button[onclick="invRecordApproval(5601)"]', 'Record approval on the bulk bar');
      ok(await vis('#inv-approval-modal'), 'the dialog opens');
      has(await txt('#ia-body'), 'Every co-trustee must sign', 'and states the rule');
      ok(await vis('#ia-fid-0') && await vis('#ia-fid-1'), 'a tick for each co-trustee');
      eq(dialogs.filter((d) => /^prompt/.test(d)).length, 0, 'and no prompt is asked');
      await p.fill('#ia-date', '2026-10-02');
      await p.check('#ia-fid-0');
      // RESTATED 2026-10-05 (P20, Q24; Anthony: "yes", Record approval saves a partial approval). P19 pressed Record approval
      // here and was refused; it would now record Ruth alone and say the lines stay open (step 61 drives that). The dialog
      // says so before anything is saved, and the paper both signed is recorded with both ticked.
      ok(await vis('#ia-note'), 'the dialog\'s note is on screen');
      eq(await txt('#ia-note'), 'Daniel Adler has not signed yet: these lines stay on the next request until they do.', '⚠⚠ with Ruth alone ticked, the dialog says the lines would stay open');
      eq((await line(5601, 's1')).authBy, undefined, 'and nothing is written by saying it');
      await p.check('#ia-fid-1');
      await press('#ia-save-btn', 'Record approval, both ticked');
      has(await txt('#ia-body'), 'Approval recorded on 3 items, signed by Ruth Adler; Daniel Adler on Oct 2, 2026.', 'recorded');
      for (const sid of ['s1', 's2', 's3']) {
        const l = await line(5601, sid);
        eq([l.authBy, l.approvalDate], ['Ruth Adler; Daniel Adler', '2026-10-02'], sid + ': both names and the date');
      }
      const u0 = net.uploads.length;
      ok((await p.locator('#ia-actions input[type=file]').count()) === 1, 'the dialog offers File the signed request');
      await p.setInputFiles('#ia-actions input[type=file]', PDF);
      await until(async () => ((await job(5601)).signedRecords || []).length > 0);
      eq(net.uploads.length - u0, 1, 'one upload');
      eq((net.uploads[u0] || {}).folderId, 'SIGNED-56', 'to the client\'s Signed Records folder');
      has((net.uploads[u0] || {}).filename, 'Signed release approval - 2026-10-02 Ruth Adler; Daniel Adler', 'named for the approval batch');
      const rec = ((await job(5601)).signedRecords || [])[0] || {};
      eq([rec.kind, rec.stableIds, rec.signedBy, rec.signedOn], ['approval', ['s1', 's2', 's3'], 'Ruth Adler; Daniel Adler', '2026-10-02'], '⚠⚠ recorded against the lines it covers');
      ok(!(await vis('#inv-approval-modal')), 'the dialog closes once filed');
      const card = await txt('#inv-releases');
      has(card, 'Approved Oct 2, 2026 by Ruth Adler; Daniel Adler · 3 lines (#1, #2, #3)', 'the desk lists the approval');
      has(card, 'Signed release approval · signed by Ruth Adler; Daniel Adler', 'with its filed copy');
      ok(await p.locator('#inv-releases a[href="https://drive.google.com/file/d/S' + (u0 + 1) + '/view"]').count() === 1, 'linked to the file in Drive');
    });

    // ════════════════════════════════════════════════════════════════════════════════════════════════════
    await section('D. receipts: owed, printed, filed back, counted', async () => {
      await toDesk(5601);
      const card = await txt('#inv-releases');
      has(card, 'Mary Smith · released: #2 · ⚠ no signed receipt filed for #2', '⚠ the card names the receipt owed to Mary');
      has(card, 'John Smith · released: #3', 'and to John');
      has(await rowText('s2'), 'no signed receipt', 'the row says so too');
      const strip = await txt('#inv-flagstrip');
      has(strip, 'No signed receipt 2', 'and the Needs-you strip counts them');
      await press('#inv-releases button[onclick=\'printBeneficiaryReceipt(5601,"Mary Smith")\']', 'Print receipt for Mary');
      const r = await T((await lastPrint()).html);
      has(r, 'Receipt for Property Released', 'the receipt prints');
      has(r, 'Released to Mary Smith from the trustee of Ellsworth Family Trust', '⚠ who it came from, by matter');
      has(r, 'Tea service', 'its line');
      has(r, 'Excellent', 'with its condition');
      lacks(r, 'Locket', 'and not John\'s');
      has(r, 'as directed in writing by Ruth Adler and Daniel Adler.', 'directed in writing by both co-trustees');
      has(r, 'it does not release or waive any right or claim concerning the trust.', 'and what it is not');
      has(r, 'Signature of Mary Smith', 'the recipient signs');
      has(r, 'Witnessed for Havellin Palm Beach, LLC', 'Havellin witnesses');
      ok(await printClosed(), 'the print closes before the signed copy is filed');
      const u0 = net.uploads.length;
      const recv = await p.evaluate(() => { const rows = Array.from(document.querySelectorAll('#inv-releases .inv-rel-row'));
        const r = rows.find((x) => /^Mary Smith/.test(x.textContent.trim())); const i = r && r.querySelector('input[type=file]');
        if (!i) return ''; i.id = 'step56-mary-receipt'; return '#step56-mary-receipt'; });
      ok(!!recv, 'File signed receipt is offered for Mary');
      if (recv) await p.setInputFiles(recv, PDF);
      await until(async () => ((await job(5601)).signedRecords || []).some((s) => s.kind === 'receipt'));
      const rr = ((await job(5601)).signedRecords || []).filter((s) => s.kind === 'receipt')[0] || {};
      eq([rr.ref, rr.stableIds, rr.signedBy], ['Mary Smith', ['s2'], 'Mary Smith'], '⚠⚠ the signed receipt is recorded against Mary\'s line');
      eq((net.uploads[u0] || {}).folderId, 'SIGNED-56', 'filed to Signed Records');
      await p.waitForTimeout(400);
      const c2 = await txt('#inv-releases');
      has(c2, 'Mary Smith · released: #2 · ✓ every one receipted', 'Mary\'s line is receipted');
      lacks(await rowText('s2'), 'no signed receipt', 'and her row says nothing owed');
      has(await rowText('s3'), 'no signed receipt', 'John\'s still does');
      await press('.ja-hd[onclick="toggleJobAdmin(5601)"]', 'the Job Admin fold');
      const ja = await p.evaluate(() => { const l = Array.from(document.querySelectorAll('#plan-derived-admin-5601 .pl-line'))
        .find((x) => /Signed receipt for every item released to a person/.test(x.textContent)); return l ? l.querySelector('.pl-det').textContent : ''; });
      has(ja, '1 of 2', '⚠ the Job Admin line: Signed receipt for every item released to a person, 1 of 2');
      await press('.ja-hd[onclick="toggleJobAdmin(5601)"]', 'the Job Admin fold, shut');
    });

    // ════════════════════════════════════════════════════════════════════════════════════════════════════
    await section('E. staff never buy: refused in the row and on the bulk bar', async () => {
      await toDesk(5601);
      dialogs.length = 0;
      await p.fill('#inv-row-s1 input[placeholder="Who took it?"]', 'Ashley Jerome');
      await p.press('#inv-row-s1 input[placeholder="Who took it?"]', 'Tab'); await p.waitForTimeout(400);
      has(dialogs.join(' | '), 'Havellin and its people never buy or receive trust property, and take no share of the proceeds. Ashley Jerome is with Havellin, so #1 Sargent portrait cannot be sold or released to them. Nothing was changed.',
          '⚠⚠ a sale to the concierge is refused, naming the rule');
      eq((await line(5601, 's1')).channel, 'Christie’s', 'nothing is written');
      eq(await p.inputValue('#inv-row-s1 input[placeholder="Who took it?"]'), 'Christie’s', 'and the box is put back');
      await pick('s4'); await pick('s5');
      dialogs.length = 0;
      await type('#inv-bulk-recip', 'Anthony Graziano Jr', 'the bulk bar\'s recipient');
      await press('button[onclick*="_invBulkApply(5601,\'channel\'"]', 'Set recipient');
      has(dialogs.join(' | '), 'Anthony Graziano Jr is with Havellin, so #4 Tabriz rug cannot be sold or released to them. Nothing was changed.', '⚠ the bulk bar refuses, naming the sale');
      eq([(await line(5601, 's4')).channel, (await line(5601, 's5')).channel], [undefined, undefined], 'and writes nothing on either line');
      await p.evaluate(() => _invClearPicks()); await p.waitForTimeout(300);
    });

    // ════════════════════════════════════════════════════════════════════════════════════════════════════
    await section('F. a co-trustee recorded after the approval; the Trust Schedule; a probate estate; a living client', async () => {
      // W1 builds the co-trustee inputs; the record list is written the way they will write it.
      await p.evaluate(() => { const j = jobs.find((x) => x.id === 5601); jobListPut(j, 'coFiduciaries', { name: 'Sam Adler', role: 'Co-trustee' }); });
      await toDesk(5601);
      has(await rowText('s1'), 'approval incomplete', '⚠⚠ an approval recorded before Sam was is incomplete now');
      // RESTATED 2026-10-05 (P20): who has signed is read through the one readable form ("Signed so far by …"), never the
      // field; and #2, already gone (Mary's signed receipt is filed), goes on the next request apart, for ratification (Q23).
      has(await txt('#inv-releases'), '⚠ Sam Adler has not approved it, and every co-trustee must. Signed so far by Ruth Adler; Daniel Adler (Oct 2, 2026). These lines go back on the next approval request, #2 apart, for ratification: it has already left.', 'and the desk says who is missing');
      await press('#inv-workbar button[onclick="printApprovalRequest(5601)"]', 'Approval Request again');
      const t = await T((await lastPrint()).html);
      has(t, 'Signed so far by Ruth Adler; Daniel Adler (Oct 2, 2026); still to sign: Sam Adler', 'the lines are back on the request, naming who is still to sign');
      has(t, 'all 3 of you have', 'for all three');
      ok(await printClosed(), 'the print closes before anything is filed');   // the print path takes the panels away for a moment
      // The Trust Schedule, filed as received; no Court Inventory on a trust.
      has(await txt('#inv-releases'), 'Trust Schedule, once the trustee has signed it as received', 'the Trust Schedule is offered');
      lacks(await txt('#inv-releases'), 'Court Inventory', 'and no Court Inventory on a trust');
      const ts = await p.evaluate(() => { const rows = Array.from(document.querySelectorAll('#inv-releases .inv-rel-row'));
        const r = rows.find((x) => /^Trust Schedule/.test(x.textContent.trim())); const i = r && r.querySelector('input[type=file]');
        if (!i) return ''; i.id = 'step56-ts'; return '#step56-ts'; });
      if (ts) await p.setInputFiles(ts, PDF);
      await until(async () => ((await job(5601)).signedRecords || []).some((s) => s.kind === 'schedule'));
      const sr = ((await job(5601)).signedRecords || []).filter((s) => s.kind === 'schedule')[0] || {};
      eq([sr.ref, sr.label], ['Trust Schedule', 'Received Trust Schedule'], '⚠ the received Trust Schedule is filed and recorded');
      await p.waitForTimeout(300);
      has(await txt('#inv-releases'), 'Received Trust Schedule', 'and listed');
      // A probate estate: the Court Inventory, the Personal Representative, estate property.
      await toDesk(5602);
      has(await txt('#inv-releases'), 'Court Inventory, once the representative has adopted it', 'a probate estate offers the adopted Court Inventory');
      lacks(await txt('#inv-releases'), 'Trust Schedule', 'and not the Trust Schedule');
      await press('#inv-workbar button[onclick="printApprovalRequest(5602)"]', 'the probate Approval Request');
      const pt = await T((await lastPrint()).html);
      has(pt, 'To Ann Finch:', 'addressed to the representative');
      has(pt, 'never purchase or receive estate property', 'estate property');
      // A living client: no bequest card; the approval list, and no receipts.
      await toDesk(5603);
      eq(await p.locator('#inv-bequests').count(), 0, 'a living client has no bequest card');
      has(await txt('#inv-releases'), 'Approved Oct 1, 2026 by Margaret Ellsworth', 'its signed approval can still be filed');
      lacks(await txt('#inv-releases'), 'receipt', 'and nothing is said about receipts');
    });

    // ════════════════════════════════════════════════════════════════════════════════════════════════════
    await section('G. overflow at 1440 and 390, print at Letter width, no page errors', async () => {
      await toDesk(5601);
      ok(await vis('#inv-releases') && await vis('#inv-bequests'), 'fixture: both cards are on screen');
      ok(await overflow() <= 0, 'the desk with both cards fits at 1440 (' + await overflow() + ')');
      await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(400);
      ok(await overflow() <= 0, 'and at 390 (' + await overflow() + ')');
      ok(await vis('#inv-bequests button[onclick="invSaveBeneficiary(5601)"]'), 'Save beneficiary is on screen at 390');
      await pick('s5');
      await press('button[onclick="invRecordApproval(5601)"]', 'Record approval at 390');
      ok(await vis('#ia-save-btn'), 'the dialog\'s Record approval is on screen at 390');
      ok(await overflow() <= 0, 'and the dialog fits (' + await overflow() + ')');
      await p.evaluate(() => { closeInvApproval(); _invClearPicks(); });
      await p.setViewportSize({ width: 816, height: 1056 });
      await toDesk(5601);
      await p.emulateMedia({ media: 'print' });
      await p.evaluate(() => printApprovalRequest(5601, false)); await p.waitForTimeout(1000);   // the print path clears its target 650 ms on
      const pr = await lastPrint();
      ok(pr.html.length > 0 && pr.over <= 0, 'the Approval Request fits a Letter page in print (' + pr.over + ')');
      await p.evaluate(() => printBeneficiaryReceipt(5601, 'Mary Smith')); await p.waitForTimeout(1000);
      const rc = await lastPrint();
      ok(/Receipt for Property Released/.test(rc.html) && rc.over <= 0, 'the receipt fits a Letter page in print (' + rc.over + ')');
      await p.emulateMedia({ media: 'screen' });
      await p.setViewportSize({ width: 1440, height: 1000 });
      eq(errs, [], 'no page errors');
    });

    console.log('\n' + pass + ' passed, ' + fail + ' failed');
    await b.close();
    process.exit(fail ? 1 : 0);
  } catch (e) {
    console.log('  ✗ the step threw: ' + (e && e.stack || e));
    try { if (b) await b.close(); } catch (x) {}
    console.log('\n' + pass + ' passed, ' + (fail + 1) + ' failed');
    process.exit(1);
  }
})();
