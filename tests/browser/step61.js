// Step 61 — P20 · WB, the desk's releases answered (2026-10-05). Anthony, on Q22 to Q27: "A, and yes to all the others".
//
// Drives the REAL page through its own controls on the Job Admin & Inv desk: the bulk bar's checkboxes and Record
// approval, the Record approval dialog (its ticks, its date, its note, Record approval, its File the signed request
// picker, Done), the workbar's Approval Request, the Releases & signed papers card, a row's record (▾) and a row's
// recipient box. The Apps Script is a route: uploadFile answers as the deployment would. Seeded: an active trust estate
// with two co-trustees (Ruth Adler, Daniel Adler) and a manifest, one line of which left the property with only Ruth's
// approval on it; a living client with a line for sale.
//
//   A. Q24: Record approval with one co-trustee ticked: before saving the dialog says the lines stay open; it records
//      Ruth's signature and her day, never refuses; the signed request she signed is filed from the dialog
//   B. the Approval Request prints "Signed so far by Ruth Adler (Oct 1, 2026); still to sign: Daniel Adler", and lists the
//      line that left before Daniel signed apart, under "Already released: for ratification" (Q23)
//   C. a second Record approval (Daniel, a week later) completes the lines, each keeping their own day; the card lists
//      both signing acts and keeps the copy filed for the first; the item's record reads the signers readably; the
//      gone line's row reads "ratification owed"
//   D. Daniel's signature on the gone line ratifies it: nothing is left on the request
//   E. Q25: a living client's line sold to a Havellin contractor is saved and flagged on its row and on the printed
//      request; an estate's is still refused, and nothing is written
//   F. overflow at 1440 and 390 (the card, the dialog), the request at Letter width in print, no page errors
//
//   NODE_PATH=/opt/node22/lib/node_modules node tests/browser/step61.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');

const SYNC = 'https://script.google.com/macros/s/STEP61/exec';
const T0 = Date.parse('2026-09-24T15:00:00Z');   // a past day, so the desk opens on All
const PDF = { name: 'signed.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 step61 signed page') };
const TRUST = 6101, LIVING = 6103;

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
          return json({ ok: true, fileUrl: 'https://drive.google.com/file/d/W' + n + '/view', fileId: 'W' + n });
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
    const txt = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }, sel);
    const T = (h) => p.evaluate((h) => { const d = document.createElement('div');
      d.innerHTML = String(h).replace(/<\/td>/g, ' </td>').replace(/<\/div>/g, ' </div>').replace(/<br>/g, ' '); return d.textContent.replace(/\s+/g, ' '); }, h);
    const lastPrint = () => p.evaluate(() => (window.__prints || []).slice(-1)[0] || { html: '', over: 0 });
    const printCount = () => p.evaluate(() => (window.__prints || []).length);
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const job = (id) => p.evaluate((id) => JSON.parse(JSON.stringify(jobs.find((j) => j.id === id) || null)), id);
    const line = (id, sid) => p.evaluate(([id, sid]) => JSON.parse(JSON.stringify((_photoRefs[id] || []).find((r) => r.stableId === sid) || null)), [id, sid]);
    const until = async (f, ms) => { for (let i = 0; i < (ms || 6000) / 150; i++) { if (await f()) return true; await p.waitForTimeout(150); } return false; };
    // The print path takes the panels away for about 650 ms (_printDocument); wait for it to close, as a person would.
    const printClosed = () => until(() => p.evaluate(() => { const pt = document.getElementById('print-target');
      return !!pt && pt.style.display === 'none' && !!document.querySelector('.panel.active'); }));
    const toDesk = async (id) => {
      await p.evaluate((id) => { setCurrentJob(id); populateInventorySelect(); }, id);
      await p.click('.nb[onclick*="\'inventory\'"]'); await p.waitForTimeout(700);
      const sel = await p.evaluate(() => (document.getElementById('inv-job') || {}).value);
      if (String(sel) !== String(id)) { await p.selectOption('#inv-job', String(id)); await p.waitForTimeout(700); }
    };
    // Between sections: a dialog left open by a section that failed is closed, and the selection cleared, so each section
    // stands on its own (fixture hygiene, never the behaviour under test).
    const fresh = () => p.evaluate(() => { const m = document.getElementById('inv-approval-modal');
      if (m && m.style.display !== 'none' && typeof closeInvApproval === 'function') closeInvApproval();
      if (typeof _invClearPicks === 'function') _invClearPicks(); });
    const rowText = (sid) => txt('#inv-row-' + sid);
    const pick = async (sid) => { await p.click('#inv-row-' + sid + ' input[type=checkbox][title="Select for a bulk change"]'); await p.waitForTimeout(300); };
    const requestOf = async (id) => {
      const before = await printCount();
      await press('#inv-workbar button[onclick="printApprovalRequest(' + id + ')"]', 'Approval Request');
      await until(async () => (await printCount()) > before, 4000);
      const h = (await printCount()) > before ? (await lastPrint()).html : '';
      await printClosed();
      return h;
    };

    // ── Seed: a trust estate with two co-trustees, and a living client ───────────────────────────────────────
    await p.evaluate(([T0, TRUST, LIVING]) => {
      const base = { status: 'active', won: true, wonAt: '2026-09-17', approved: true, tc: 'Ashley Jerome', city: 'Palm Beach', zip: '33480',
        created: '2026-09-10', start: '2026-09-21', driveFolder: 'https://drive.google.com/drive/folders/ROOT61', docTier: 'values',
        driveSubfolders: { 'Estate Inventory': 'SUB-INV', 'As-Found Record': 'SUB-AF', 'Signed Records': 'SIGNED-61' }, updatedAt: T0 };
      const L = (id, o) => Object.assign({ stableId: id, label: 'inventory', collId: null, roomIdx: 1, seq: 1, status: 'uploaded', qty: 1,
        category: 'Furniture', condition: 'Good', ts: T0, updatedAt: T0, driveFileId: 'f-' + id, driveFileUrl: 'https://drive.google.com/file/d/f-' + id + '/view' }, o);
      const est = (id, svc) => ({ approved: true, submitted: true, approvedBy: 'Anthony Graziano', savedAt: T0,
        estimate: { jobId: id, svc, havellinTotal: 20000, totTC: 40, totPS: 80, days: 4, collections: [], vendors: [], prepItems: [],
          rooms: [{ idx: 1, name: 'Study', st: 'in' }, { idx: 4, name: 'Kitchen', st: 'in' }] } });
      jobs.unshift(
        Object.assign({ id: TRUST, hvlId: 'HVL-2610-T611', name: 'Walter Ellsworth', fname: 'Walter', lname: 'Ellsworth', svc: 'cleanout',
          addr: '69 Beach Blvd', matterType: 'trust', trustName: 'Ellsworth Family Trust', deathDate: '2026-04-02', executorAuth: 'received',
          executor: 'Ruth Adler', executorRole: 'Trustee', executorEmail: 'ruth@adler.example',
          coFiduciaries: [{ id: 'cf1', name: 'Daniel Adler', role: 'Co-trustee', email: 'dan@adler.example' }] }, base),
        Object.assign({ id: LIVING, hvlId: 'HVL-2610-L613', name: 'Margaret Ellsworth', fname: 'Margaret', lname: 'Ellsworth', svc: 'downsizing_move',
          addr: '14 Coconut Row', destAddr: '801 Sunset Ave', docTier: '' }, base));
      estimateStore[TRUST] = est(TRUST, 'cleanout');
      estimateStore[LIVING] = est(LIVING, 'downsizing_move');
      _photoRefs[TRUST] = [
        L('s1', { itemNo: 1, objectName: 'Sargent portrait', category: 'Art & Décor', fmv: '48000', disposition: 'Auction', channel: 'Christie’s' }),
        L('s2', { itemNo: 2, objectName: 'Dining table', fmv: '1200', disposition: 'Sell', channel: 'Kodner Galleries' }),
        // Released to John on Oct 2 with Ruth's approval alone: Daniel had not signed it (Q23).
        L('s3', { itemNo: 3, objectName: 'Locket', category: 'Jewelry & Watches', fmv: '300', disposition: 'Distribute', channel: 'John Smith',
                  dispDate: '2026-10-02', authBy: 'Ruth Adler', approvalDate: '2026-09-30' }),
        L('s4', { itemNo: 4, objectName: 'Family Bible', fmv: '50', disposition: 'Keep' }),
      ];
      _photoRefs[LIVING] = [L('v1', { itemNo: 1, objectName: 'Armchair', disposition: 'Sell' }), L('v2', { itemNo: 2, objectName: 'Floor lamp', disposition: 'Donate', channel: 'Goodwill' })];
      [TRUST, LIVING].forEach((id) => savePhotoRefs(id));
      saveJobs();
      localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore));
    }, [T0, TRUST, LIVING]).catch((e) => ok(false, 'seed: ' + e.message.split('\n')[0]));

    // ════════════════════════════════════════════════════════════════════════════════════════════════════
    await section('A. Q24: one co-trustee ticked — said before saving, recorded, never refused; her signed request filed', async () => {
      await toDesk(TRUST);
      await pick('s1'); await pick('s2');
      await press('button[onclick="invRecordApproval(' + TRUST + ')"]', 'Record approval on the bulk bar');
      ok(await vis('#inv-approval-modal'), 'the dialog opens');
      has(await txt('#ia-body'), 'Every co-trustee must sign before a line is approved: a signature recorded now is kept, and the lines stay on the next request until all 2 have signed.',
          'it states the rule as it now is');
      await p.fill('#ia-date', '2026-10-01');
      await p.check('#ia-fid-0'); await p.waitForTimeout(200);
      eq(await txt('#ia-note'), 'Daniel Adler has not signed yet: these lines stay on the next request until they do.',
         '⚠⚠ before saving, the dialog says plainly that the lines stay open');
      eq((await line(TRUST, 's1')).authBy, undefined, 'and nothing is written by saying it');
      dialogs.length = 0;
      await press('#ia-save-btn', 'Record approval, with Ruth alone ticked');
      eq(await txt('#ia-fb'), '', '⚠⚠ never refused');
      has(await txt('#ia-body'), 'Approval recorded on 2 items, signed by Ruth Adler on Oct 1, 2026.', 'recorded');
      has(await txt('#ia-body'), 'Daniel Adler has not signed yet: these lines stay on the next request until they do.', 'and said again');
      for (const sid of ['s1', 's2']) {
        const l = await line(TRUST, sid);
        eq([l.authBy, l.approvalDate], ['Ruth Adler', '2026-10-01'], sid + ': Ruth\'s signature and her day');
      }
      const u0 = net.uploads.length;
      ok((await p.locator('#ia-actions input[type=file]').count()) === 1, 'the dialog offers File the signed request');
      await p.setInputFiles('#ia-actions input[type=file]', PDF);
      await until(async () => ((await job(TRUST)).signedRecords || []).length > 0);
      eq(net.uploads.length - u0, 1, 'one upload');
      has((net.uploads[u0] || {}).filename, 'Signed release approval - 2026-10-01 Ruth Adler', 'named for the act Ruth signed');
      const rec = ((await job(TRUST)).signedRecords || [])[0] || {};
      eq([rec.kind, rec.ref, rec.stableIds, rec.signedBy, rec.signedOn], ['approval', '2026-10-01 Ruth Adler', ['s1', 's2'], 'Ruth Adler', '2026-10-01'],
         'recorded against the lines it covers');
      ok(!(await vis('#inv-approval-modal')), 'the dialog closes once filed');
      has(await rowText('s1'), 'approval incomplete', 'the line still here reads approval incomplete');
    });

    // ════════════════════════════════════════════════════════════════════════════════════════════════════
    await section('B. the request: who has signed, each with their day; the line already gone listed apart, for ratification', async () => {
      await fresh();
      await toDesk(TRUST);
      const h = await requestOf(TRUST), t = await T(h);
      has(t, 'Signed so far by Ruth Adler (Oct 1, 2026); still to sign: Daniel Adler', '⚠⚠ "Signed so far by Ruth Adler (Oct 1, 2026); still to sign: Daniel Adler"');
      const at = h.indexOf('Already released: for ratification');
      ok(at > 0, '⚠⚠ the ratification section prints');
      const main = await T(h.slice(0, at)), rat = await T(h.slice(at, h.indexOf('Approved by:')));
      has(main, 'Sargent portrait', 'the lines still here are asked for');
      lacks(main, 'Locket', '⚠ the line that already left is not "ready to be released"');
      has(rat, 'Locket', '⚠ it is listed apart');
      has(rat, 'These items left the property before every co-trustee had approved their release in writing. They are listed apart from the items above, for the signature of Daniel Adler, which ratifies each release; nothing is undone.',
          'for the missing signature, nothing undone');
      has(rat, 'Released Oct 2, 2026', 'saying when it went');
      has(rat, 'Signed so far by Ruth Adler (Sep 30, 2026); still to sign: Daniel Adler', 'and who has signed it');
      lacks(t, 'Family Bible', 'a line kept is on neither list');
      lacks(t, '(2026-', 'no raw ISO date on the page');
    });

    // ════════════════════════════════════════════════════════════════════════════════════════════════════
    await section('C. Daniel a week later completes the lines; the card lists both acts and keeps the first act\'s copy', async () => {
      await fresh();
      await toDesk(TRUST);
      await pick('s1'); await pick('s2');
      await press('button[onclick="invRecordApproval(' + TRUST + ')"]', 'Record approval again');
      has(await txt('#ia-body'), 'Ruth Adler · Trustee · already signed all 2 lines', 'the dialog says who has signed these lines already');
      await p.fill('#ia-date', '2026-10-08');
      await p.check('#ia-fid-1'); await p.waitForTimeout(200);
      eq(await txt('#ia-note'), '✓ With this signature every co-trustee has signed: the lines are approved.', 'the note says the tick completes them');
      await press('#ia-save-btn', 'Record approval, Daniel ticked');
      for (const sid of ['s1', 's2']) {
        const l = await line(TRUST, sid);
        eq([l.authBy, l.approvalDate], ['Ruth Adler (2026-10-01); Daniel Adler (2026-10-08)', '2026-10-08'], '⚠⚠ ' + sid + ': each signer with their own day, approvalDate the latest');
      }
      await press('#ia-actions button[onclick="closeInvApproval()"]', 'Done');
      await p.waitForTimeout(300);
      const card = await txt('#inv-releases');
      has(card, 'Approved Oct 8, 2026 by Daniel Adler · 2 lines (#1, #2)', 'the card lists Daniel\'s signing act');
      has(card, 'Approved Oct 1, 2026 by Ruth Adler · 2 lines (#1, #2)', '⚠⚠ and Ruth\'s, after the lines completed');
      has(card, 'Approved Sep 30, 2026 by Ruth Adler · 1 line (#3)', 'the day Ruth signed the line that has since left is its own act');
      has(card, 'These lines go back on the next approval request, #3 apart, for ratification: it has already left.', 'saying it goes apart, for ratification');
      ok(await p.locator('#inv-releases a[href="https://drive.google.com/file/d/W1/view"]').count() === 1, '⚠⚠ with the copy filed for it, kept');
      ok(card.indexOf('Approved Oct 8, 2026') < card.indexOf('Approved Oct 1, 2026'), 'newest first');
      lacks(await rowText('s1'), 'approval incomplete', 'the completed line reads clean');
      has(await rowText('s3'), 'ratification owed', '⚠ the line that already left reads ratification owed');
      lacks(await rowText('s3'), 'approval incomplete', 'never approval incomplete');
      // The item's record reads who signed, each on their own day.
      await p.click('#inv-row-s1 button[title="Open the full record"]'); await p.waitForTimeout(400);
      has(await txt('#inv-row-s1 .inv-auth-read'), 'Signed: Ruth Adler (Oct 1, 2026); Daniel Adler (Oct 8, 2026)', '⚠ the item\'s record reads the signers readably');
      await p.click('#inv-row-s1 button[title="Open the full record"]'); await p.waitForTimeout(300);
    });

    // ════════════════════════════════════════════════════════════════════════════════════════════════════
    await section('D. Daniel\'s signature ratifies the line that left: nothing is left on the request', async () => {
      await fresh();
      await toDesk(TRUST);
      await pick('s3');
      await press('button[onclick="invRecordApproval(' + TRUST + ')"]', 'Record approval on the gone line');
      await p.fill('#ia-date', '2026-10-08');
      await p.check('#ia-fid-1'); await p.waitForTimeout(200);
      await press('#ia-save-btn', 'Record approval, Daniel ticked');
      eq((await line(TRUST, 's3')).authBy, 'Ruth Adler (2026-09-30); Daniel Adler (2026-10-08)', 'the ratification is recorded, each with their day');
      await press('#ia-actions button[onclick="closeInvApproval()"]', 'Done');
      lacks(await rowText('s3'), 'ratification owed', '⚠ nothing is owed any more');
      dialogs.length = 0;
      const before = await printCount();
      await press('#inv-workbar button[onclick="printApprovalRequest(' + TRUST + ')"]', 'Approval Request');
      eq(await printCount(), before, 'nothing prints');
      has(dialogs.join(' | '), 'Nothing is waiting on approval.', 'nothing is waiting on approval');
    });

    // ════════════════════════════════════════════════════════════════════════════════════════════════════
    await section('E. Q25: a living client\'s line sold to a Havellin contractor is saved and flagged; an estate\'s is refused', async () => {
      await fresh();
      await toDesk(LIVING);
      dialogs.length = 0;
      const box = '#inv-row-v1 input[placeholder="Who took it?"]';
      ok(await vis(box), 'the row\'s recipient box is on screen');
      await p.fill(box, 'Anthony Graziano Jr');
      await p.press(box, 'Tab'); await p.waitForTimeout(500);
      eq((await line(LIVING, 'v1')).channel, 'Anthony Graziano Jr', '⚠⚠ saved, not refused');
      eq(dialogs.filter((d) => /never buy/.test(d)), [], 'no refusal');
      has(await rowText('v1'), '⚠ Anthony Graziano Jr works with Havellin', '⚠⚠ the row carries the caution');
      const h = await requestOf(LIVING), t = await T(h);
      has(t, 'Property going to someone who works with Havellin', '⚠⚠ the printed request carries it');
      has(t, '#1 Armchair (Anthony Graziano Jr works with Havellin; proposed: Sell)', 'naming the line and the person');
      has(t, 'Initialling a line below confirms that you know who is receiving it.', 'so the client signs knowing');
      has(h, 'GOING TO ANTHONY GRAZIANO JR, WHO WORKS WITH HAVELLIN', 'and the line is badged');
      ok(h.indexOf('Property going to someone who works with Havellin') < h.indexOf('Where it is going'), 'above the table');
      // An estate refuses the same write, as before.
      await toDesk(TRUST);
      dialogs.length = 0;
      const ebox = '#inv-row-s2 input[placeholder="Who took it?"]';
      await p.fill(ebox, 'Anthony Graziano Jr');
      await p.press(ebox, 'Tab'); await p.waitForTimeout(500);
      has(dialogs.join(' | '), 'Havellin and its people never buy or receive trust property, and take no share of the proceeds. Anthony Graziano Jr is with Havellin, so #2 Dining table cannot be sold or released to them. Nothing was changed.',
          '⚠ an estate still refuses, naming the rule');
      eq((await line(TRUST, 's2')).channel, 'Kodner Galleries', 'and nothing is written');
    });

    // ════════════════════════════════════════════════════════════════════════════════════════════════════
    await section('F. overflow at 1440 and 390, the request at Letter width in print, no page errors', async () => {
      await fresh();
      await toDesk(TRUST);
      ok(await vis('#inv-releases'), 'fixture: the card is on screen');
      ok(await overflow() <= 0, 'the desk with the card fits at 1440 (' + await overflow() + ')');
      await pick('s4');
      await press('button[onclick="invRecordApproval(' + TRUST + ')"]', 'Record approval at 1440');
      await p.check('#ia-fid-0'); await p.waitForTimeout(200);
      ok(await vis('#ia-note'), 'the note is on screen');
      ok(await overflow() <= 0, 'and the dialog fits (' + await overflow() + ')');
      await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(400);
      ok(await vis('#ia-save-btn') && await vis('#ia-note'), 'at 390 the note and Record approval are on screen');
      ok(await overflow() <= 0, 'and the dialog fits at 390 (' + await overflow() + ')');
      await p.evaluate(() => { closeInvApproval(); _invClearPicks(); });
      await toDesk(TRUST);
      ok(await overflow() <= 0, 'the desk fits at 390 (' + await overflow() + ')');
      // The request with both lists, at Letter width in print.
      await p.evaluate((id) => { const r = (_photoRefs[id] || []).find((x) => x.stableId === 's3'); r.authBy = 'Ruth Adler'; r.approvalDate = '2026-09-30'; }, TRUST);
      await p.evaluate((id) => { const r = (_photoRefs[id] || []).find((x) => x.stableId === 's1'); r.authBy = 'Ruth Adler'; r.approvalDate = '2026-10-01'; }, TRUST);
      await p.setViewportSize({ width: 816, height: 1056 });
      await toDesk(TRUST);
      await p.emulateMedia({ media: 'print' });
      await p.evaluate((id) => printApprovalRequest(id, false), TRUST); await p.waitForTimeout(1000);   // the print path clears its target 650 ms on
      const pr = await lastPrint();
      ok(/Already released: for ratification/.test(pr.html) && /Signed so far by Ruth Adler/.test(pr.html), 'fixture: the request carries both lists');
      ok(pr.html.length > 0 && pr.over <= 0, 'the request fits a Letter page in print (' + pr.over + ')');
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
