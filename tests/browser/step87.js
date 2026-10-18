// Step 87 — sign-out on the iPad (P28, 2026-10-18; Anthony: "signing things on the ipad is genius. let's do that for anything
// that leaves the house, on estate, once the PR signs off on disposition").
//
// Drives the REAL page: a probate estate with a vendor's approved and unapproved lines, a charity's line, a beneficiary's
// line, a firearm and a line linked to an appraiser; the desk's Releases & signed papers card; the sign-out dialog opened
// from it; the refusal before a signature; a signature drawn with the mouse on the pad; Sign and file over a routed
// htmlToPdf and a stubbed upload; the record, the row, the custody event and the card after; the appraiser's hand-off and
// return; the photograph route beside it; a failed PDF named; overflow at 1440 and 390; zero page errors.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step87.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');

const SYNC = 'https://script.google.com/macros/s/STEP87/exec';
const T0 = Date.parse('2026-10-10T15:00:00Z');
const EST = 8701;

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
    let pdfFail = false; const pdfs = [];
    await ctx.route(SYNC + '**', async (r) => {
      const req = r.request();
      const json = (o) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(o) });
      if (req.method() === 'POST') {
        let body = {}; try { body = JSON.parse(req.postData() || '{}'); } catch (e) {}
        if (body.action === 'htmlToPdf') {
          pdfs.push(body.html || '');
          if (pdfFail) return json({ ok: false, error: 'conversion boom' });
          return json({ ok: true, base64: Buffer.from('%PDF-1.4 signed ' + 'x'.repeat(100)).toString('base64') });
        }
      }
      return json({ ok: true });
    });
    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    const dialogs = []; p.on('dialog', async (d) => { dialogs.push(d.type() + ': ' + d.message()); await d.accept(); });
    await p.goto(APP); await p.waitForTimeout(1600);
    await p.evaluate((u) => {
      SHEETS_SYNC_URL = u;
      localStorage.setItem('hav_device_user', 'Ashley Jerome');
      window.open = function () { return null; };
      window.__uploads = [];
      resolveSubfolderId = function (job, name, cb) { cb('SIGNED-87'); };
      uploadToDrive = function (folderId, filename, dataUrl, cb) { window.__uploads.push({ folderId, filename, bytes: dataUrl.length, pdf: /^data:application\/pdf/.test(dataUrl) }); cb(true, 'https://drive.google.com/file/d/S' + window.__uploads.length + '/view', 'S' + window.__uploads.length); };
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
      if (v) { await p.locator(sel).first().click({ timeout: 5000 }).catch((e) => ok(false, (what || sel) + ' — ' + e.message.split('\n')[0])); await p.waitForTimeout(400); }
      return v;
    };
    const txt = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }, sel);
    const until = async (f, ms) => { for (let i = 0; i < (ms || 8000) / 150; i++) { if (await f()) return true; await p.waitForTimeout(150); } return false; };
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const line = (sid) => p.evaluate(([id, sid]) => JSON.parse(JSON.stringify((_photoRefs[id] || []).find((r) => r.stableId === sid) || null)), [EST, sid]);
    const records = () => p.evaluate((id) => (jobs.find((j) => j.id === id).signedRecords || []).filter((r) => !r.voidedAt).map((r) => [r.kind, r.ref, r.stableIds, r.signedBy, !!r.glass]), EST);
    const modalOpen = () => p.evaluate(() => document.getElementById('inv-pickup-modal').style.display === 'flex');
    const toDesk = async () => {
      await p.evaluate((id) => { setCurrentJob(id); populateInventorySelect(); }, EST);
      await p.click('.nb[onclick*="\'inventory\'"]'); await p.waitForTimeout(700);
      const sel = await p.evaluate(() => (document.getElementById('inv-job') || {}).value);
      if (String(sel) !== String(EST)) { await p.selectOption('#inv-job', String(EST)); await p.waitForTimeout(700); }
    };
    const signOut = async (kind, taker) => press('#inv-releases button[onclick^=\'openSignoutDialog(' + EST + ',"' + kind + '","' + taker + '\']', 'the sign-out button for ' + taker);
    // A signature drawn with the mouse on the pad: three strokes across the canvas.
    const draw = async () => {
      const box = await p.locator('#ip-pad').boundingBox();
      ok(!!box && box.width > 200, 'the pad is on screen (' + (box ? Math.round(box.width) : 0) + ' px wide)');
      if (!box) return;
      for (let s = 0; s < 3; s++) {
        await p.mouse.move(box.x + 30 + s * 90, box.y + 40);
        await p.mouse.down();
        for (let i = 1; i <= 8; i++) await p.mouse.move(box.x + 30 + s * 90 + i * 8, box.y + 40 + Math.sin(i) * 25);
        await p.mouse.up();
      }
      await p.waitForTimeout(100);
    };

    // ── Seed ─────────────────────────────────────────────────────────────────────
    await p.evaluate(([T0, EST]) => {
      const base = { status: 'active', won: true, wonAt: '2026-09-17', approved: true, tc: 'Ashley Jerome', city: 'Palm Beach', zip: '33480',
        created: '2026-09-10', start: '2026-09-21', activatedOn: '2026-09-21', driveFolder: 'https://drive.google.com/drive/folders/ROOT87', docTier: 'values',
        driveSubfolders: { 'Estate Inventory': 'SUB-INV', 'As-Found Record': 'SUB-AF', 'Signed Records': 'SIGNED-87' }, updatedAt: T0 };
      const L = (id, o) => Object.assign({ stableId: id, label: 'inventory', collId: null, roomIdx: 1, seq: 1, status: 'uploaded', qty: 1,
        category: 'Furniture', condition: 'Good', ts: T0, updatedAt: T0, driveFileId: 'f-' + id, driveFileUrl: 'https://drive.google.com/file/d/f-' + id + '/view' }, o);
      const OK = { authBy: 'Tripp Butler', approvalDate: '2026-10-01' };
      jobs.unshift(Object.assign({ id: EST, hvlId: 'HVL-2610-S871', name: 'Tripp Butler Sr', fname: 'Tripp', lname: 'Butler', svc: 'probate', matterType: 'probate',
        addr: '12 Ocean Way', deathDate: '2026-03-01', executorAuth: 'received', executor: 'Tripp Butler', executorRole: 'Personal Representative',
        executorEmail: 'tripp@butler.example', signedRecords: [], appraisers: [{ id: 'ap1', name: 'Mary Whalen', firm: 'Appraisals by the Sea' }] }, base));
      estimateStore[EST] = { approved: true, submitted: true, approvedBy: 'Anthony Graziano', savedAt: T0,
        estimate: { jobId: EST, svc: 'probate', havellinTotal: 10000, totTC: 40, totPS: 80, tcRate: 150, psRate: 100, days: 4, collections: [], vendors: [], prepItems: [],
          rooms: [{ idx: 1, name: 'Study', st: 'in' }] } };
      _photoRefs[EST] = [
        L('k1', Object.assign({ itemNo: 1, objectName: 'Sideboard', fmv: '900', disposition: 'Sell', channel: 'Kodner Galleries' }, OK)),
        L('k2', { itemNo: 2, objectName: 'Hall mirror', fmv: '200', disposition: 'Auction', channel: 'Kodner Galleries' }),
        L('c1', Object.assign({ itemNo: 3, objectName: 'Box of books', fmv: '40', disposition: 'Donate', channel: 'Goodwill' }, OK)),
        L('d1', Object.assign({ itemNo: 4, objectName: 'Grandfather clock', fmv: '2500', disposition: 'Distribute', channel: 'Daniel Butler' }, OK)),
        L('g1', Object.assign({ itemNo: 5, objectName: 'Shotgun', category: 'Firearms', serial: 'SN-1', fmv: '1200', disposition: 'Sell', channel: 'Kodner Galleries' }, OK)),
        L('f1', { itemNo: 6, objectName: 'Oil on canvas, signed', category: 'Art', fmv: '', disposition: 'Keep', apprId: 'ap1', apprDoc: 'Mary Whalen · Appraisals by the Sea' }),
      ];
      jobPlanStore[EST] = { rooms: { 1: { foundDone: { at: '2026-09-22', by: 'Ashley Jerome' } } }, tasks: {} };
      savePhotoRefs(EST);
      saveJobs();
    }, [T0, EST]);

    // ── A ───────────────────────────────────────────────────────────────────────
    await section('A. the Releases card: who may sign for what, and the gate', async () => {
      await toDesk();
      const card = await txt('#inv-releases');
      has(card, 'Leaving the property · sign out on the iPad', 'the section');
      has(card, 'Kodner Galleries · vendor pickup · 2 lines (#1, #2) · ⚠ awaiting written approval: #2', '⚠⚠ the vendor\'s approved line is offered, the unapproved one named as waiting');
      has(card, 'Sign out 1 to Kodner Galleries', 'one line to sign out');
      has(card, 'Goodwill · donation · 1 line (#3)', 'the charity');
      has(card, 'Daniel Butler · release to a person · 1 line (#4)', 'the beneficiary');
      has(card, 'Mary Whalen · appraisal hand-off · 1 line (#6)', 'the appraiser\'s hand-off');
      const rows = await p.evaluate(() => [...document.querySelectorAll('#inv-releases .inv-signout-row')].map((r) => r.textContent.replace(/\s+/g, ' ')).join(' | '));
      lacks(rows, '#5', '⚠⚠ the firearm is on no sign-out row (' + rows.length + ' chars of rows read)');
      has(rows, '#1', '(the rows were read)');
      ok(await overflow() <= 0, 'no overflow at 1440 (' + await overflow() + ')');
    });

    // ── B ───────────────────────────────────────────────────────────────────────
    await section('B. the vendor: the dialog, the refusal before a signature, the signature, the filed PDF', async () => {
      await signOut('pickup', 'Kodner Galleries');
      ok(await modalOpen(), 'the dialog opens');
      has(await txt('#ip-title'), 'Vendor Pickup List — Kodner Galleries', 'named for the paper and the taker');
      const ticks = await p.evaluate(() => [...document.querySelectorAll('#ip-body .ip-tick')].map((x) => x.getAttribute('data-sid') + ':' + x.checked + ':' + x.disabled));
      eq(ticks, ['k1:true:false', 'k2:false:true'], '⚠⚠ the approved line ticked, the unapproved one disabled');
      has(await txt('#ip-body'), 'awaiting written approval: not offered', 'and told why');
      eq(await p.inputValue('#ip-signer'), 'Kodner Galleries', 'the signer box opens on the vendor');
      await p.fill('#ip-signer', 'Sam Driver');
      await press('#ip-sign-btn', 'Sign and file, unsigned');
      has(await txt('#ip-fb'), 'Sign the sheet first', '⚠⚠ refused: no signature yet');
      ok(await modalOpen(), 'the dialog stays open');
      await draw();
      await press('#ip-sign-btn', 'Sign and file');
      ok(await until(() => p.evaluate(() => document.getElementById('inv-pickup-modal').style.display === 'none')), 'filed: the dialog closes');
      eq(pdfs.length, 1, '⚠⚠ one PDF asked of the backend');
      has(pdfs[0], 'data:image/png;base64,', 'carrying the signature drawn on the glass');
      has(pdfs[0], 'Vendor Pickup List', 'and the sheet');
      has(pdfs[0], 'Signed by: <strong>Sam Driver</strong>, signed on the iPad', 'naming the signer');
      has(pdfs[0], 'Witnessed for Havellin Palm Beach, LLC: Ashley Jerome', 'and the concierge, from the device');
      has(pdfs[0], 'Approved in writing by', 'with the approval column');
      const up = await p.evaluate(() => window.__uploads.slice(-1)[0] || {});
      eq(up.folderId, 'SIGNED-87', 'to the Signed Records folder');
      has(up.filename, 'Vendor pickup list - Kodner Galleries', 'named for what it is');
      ok(/\.pdf$/.test(up.filename) && up.pdf, 'a PDF, not a photograph');
      eq(await records(), [['pickup', 'Kodner Galleries', ['k1'], 'Sam Driver', true]], '⚠⚠ recorded: the vendor\'s pickup list, the line, the signer, signed on the glass');
      await toDesk();
      has(await txt('#inv-row-k1'), 'picked up by Kodner Galleries', '⚠⚠ the row reads picked up');
      lacks(await txt('#inv-row-k2'), 'picked up by', 'the unapproved line does not');
      const ev = ((await line('k1')).custodyLog || []).filter((e) => !e.deletedAt).map((e) => [e.action, e.party, e.method]);
      eq(ev, [['Released', 'Kodner Galleries', 'Vendor pickup']], 'a probate estate keeps custody: a Released event');
      const card = await txt('#inv-releases');
      has(card, '✓ signed for: #1', 'the card says what is signed for');
      has(card, 'signed by Sam Driver on the iPad', 'and how');
    });

    // ── C ───────────────────────────────────────────────────────────────────────
    await section('C. the appraiser: out on a hand-off, back on a return', async () => {
      await signOut('appraisal_out', 'Mary Whalen');
      ok(await modalOpen(), 'the hand-off dialog opens');
      has(await txt('#ip-title'), 'Appraisal Hand-off — Mary Whalen', 'named');
      await draw();
      await press('#ip-sign-btn', 'Sign and file');
      ok(await until(() => p.evaluate(() => document.getElementById('inv-pickup-modal').style.display === 'none')), 'filed');
      has(pdfs[pdfs.length - 1], 'to be returned to the property', 'the sheet says it comes back');
      await toDesk();
      has(await txt('#inv-row-f1'), 'with Mary Whalen since', '⚠⚠ the row says where the painting is');
      const ev = ((await line('f1')).custodyLog || []).filter((e) => !e.deletedAt).map((e) => [e.action, e.method]);
      eq(ev, [['Transferred', 'Out for appraisal']], 'a Transferred event, never Released');
      const card = await txt('#inv-releases');
      has(card, 'Mary Whalen · back from appraisal · 1 line (#6)', 'the card now offers the return');
      await signOut('appraisal_back', 'Mary Whalen');
      ok(await modalOpen(), 'the return dialog opens');
      eq(await p.inputValue('#ip-signer'), 'Ashley Jerome', '⚠⚠ the device\'s user signs the return');
      await draw();
      await press('#ip-sign-btn', 'Sign and file');
      ok(await until(() => p.evaluate(() => document.getElementById('inv-pickup-modal').style.display === 'none')), 'filed');
      await toDesk();
      lacks(await txt('#inv-row-f1'), 'with Mary Whalen since', 'back: the row no longer says it is out');
      eq(((await line('f1')).custodyLog || []).filter((e) => !e.deletedAt).map((e) => e.action), ['Transferred', 'Returned'], 'and a Returned event');
      has(await txt('#inv-releases'), 'Mary Whalen · appraisal hand-off · 1 line (#6)', 'it can go out again');
    });

    // ── D ───────────────────────────────────────────────────────────────────────
    await section('D. the photograph route beside the pad, and a failed PDF named', async () => {
      await signOut('donation', 'Goodwill');
      ok(await modalOpen(), 'the charity\'s dialog opens');
      await p.setInputFiles('#inv-pickup-modal input[type=file]', { name: 'goodwill-receipt.jpg', mimeType: 'image/jpeg', buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) });
      ok(await until(() => p.evaluate(() => document.getElementById('inv-pickup-modal').style.display === 'none')), 'a photographed receipt files as before');
      const recs = await records();
      eq(recs.filter((r) => r[0] === 'donation'), [['donation', 'Goodwill', ['c1'], 'Goodwill', false]], 'the charity receipt, not signed on the glass');
      await toDesk();
      pdfFail = true;
      await signOut('receipt', 'Daniel Butler');
      ok(await modalOpen(), 'the beneficiary\'s dialog opens');
      await draw();
      await press('#ip-sign-btn', 'Sign and file');
      ok(await until(() => p.evaluate(() => /could not be made/.test(document.getElementById('ip-fb').textContent))), '⚠⚠ a failed conversion is named');
      has(await txt('#ip-fb'), 'photograph a printed sheet', 'and the paper route offered');
      ok(await modalOpen(), 'the dialog stays open');
      eq((await records()).filter((r) => r[0] === 'receipt').length, 0, 'nothing filed');
      pdfFail = false;
      await press('#ip-sign-btn', 'Sign and file, again');
      ok(await until(() => p.evaluate(() => document.getElementById('inv-pickup-modal').style.display === 'none')), 'the second try files');
      eq((await records()).filter((r) => r[0] === 'receipt'), [['receipt', 'Daniel Butler', ['d1'], 'Daniel Butler', true]], 'the beneficiary\'s receipt, signed on the glass');
      has(pdfs[pdfs.length - 1], 'Receipt for Property Released', 'on the estate\'s receipt form');
    });

    // ── E ───────────────────────────────────────────────────────────────────────
    await section('E. the dialog at 390; zero page errors', async () => {
      await toDesk();
      await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(500);
      // The vendor has no approved line left to offer, so its button is gone (the card says so); the appraiser's hand-off is open to sign again.
      eq(await p.locator('#inv-releases button[onclick^=\'openSignoutDialog(' + EST + ',"pickup","Kodner\']').count(), 0, 'nothing left to sign out to the vendor: no button');
      has(await txt('#inv-releases'), 'Nothing to sign out until the approval is on record.', 'and the row says why');
      await signOut('appraisal_out', 'Mary Whalen');
      ok(await modalOpen(), 'a dialog is open at 390');
      ok(await overflow() <= 0, 'no horizontal overflow with the dialog open at 390 (' + await overflow() + ')');
      const box = await p.locator('#ip-pad').boundingBox();
      ok(!!box && box.width > 250, 'the pad is wide enough to sign on (' + (box ? Math.round(box.width) : 0) + ' px)');
      await p.evaluate(() => closePickupDialog());
      await p.setViewportSize({ width: 1440, height: 1000 });
      eq(errs, [], 'zero page errors');
      eq(dialogs.filter((d) => /^alert/.test(d)), [], 'no blocking alert');
    });

    await b.close();
    console.log('\nstep87: ' + pass + ' passed, ' + fail + ' failed');
    process.exit(fail ? 1 : 0);
  } catch (e) {
    console.log('step87 crashed: ' + (e && e.stack || e));
    if (b) await b.close().catch(() => {});
    process.exit(1);
  }
})();
