// Step 74 — P25 group 3, the desk (2026-10-09): Anthony's answers to the job-flow audit's questions, as a person meets them,
// through the real controls.
//
//   A. the release request: every leaving line listed, one initial per destination group under $500, a line's own initial
//      on the painting over $500 and on the disputed desk (Q46)
//   B. the bulk bar sets Good across a selection; a line left blank prints "as photographed" (Q50)
//   C. the statement dialog: typing the auction house ticks its lines; each lot's gross and fees are typed in the table and
//      written onto the lines; the statement agrees with the ledger to the cent (Q39)
//   D. the close asks a rating of the auction house and the charity named on lines, and of the buyer on a filed pickup list (Q48)
//   E. overflow at 1440 and 390; no page errors
//
//   NODE_PATH=/opt/node22/lib/node_modules node tests/browser/step74.js [/abs/path/to/havellin.html]
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
const EST = 7401;

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
    let sheet = {};
    await ctx.route(SYNC + '**', async (r) => {
      const req = r.request();
      const json = (o) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
      if (req.method() === 'POST') return json({ ok: true });
      if (/action=loadMedia/.test(req.url())) return json({ ok: true, media: sheet });
      return json({ ok: true });
    });
    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    const dialogs = [];
    p.on('dialog', async (d) => { dialogs.push(d.type() + ': ' + d.message()); await d.accept(); });
    await p.goto(APP); await p.waitForTimeout(1600);
    await p.evaluate((u) => {
      SHEETS_SYNC_URL = u;
      window.open = function () { return null; };
      window.gmailCreateDraft = function (mime, cb) { cb(true, { draftId: 'd1', messageId: 'm1' }); };
      window.sendInternalEmail = function () {};
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
      if (v) { await p.locator(sel).first().click({ timeout: 5000 }).catch((e) => ok(false, (what || sel) + ' — ' + e.message.split('\n')[0])); await p.waitForTimeout(600); }
      return v;
    };
    const txt = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }, sel);
    const val = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.value : null; }, sel);
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const lastPrint = () => p.evaluate(() => { const h = (window.__prints || []).slice(-1)[0] || ''; const d = document.createElement('div');
      d.innerHTML = String(h).replace(/<\/td>/g, ' </td>').replace(/<br>/g, ' '); return d.textContent.replace(/\s+/g, ' '); });
    const toDesk = async (id) => {
      await p.evaluate((id) => { setCurrentJob(id); populateInventorySelect(); }, id);
      await p.click('.nb[onclick*="\'inventory\'"]'); await p.waitForTimeout(900);
      if (String(await val('#inv-job')) !== String(id)) { await p.selectOption('#inv-job', String(id)); await p.waitForTimeout(900); }
    };
    const line = (sid) => p.evaluate(([id, sid]) => Object.assign({}, (_photoRefs[id] || []).find((r) => r.stableId === sid) || {}), [EST, sid]);

    // ── Seed: an active probate estate with six leaving lines, a directory, and a filed pickup list ──
    sheet = await p.evaluate(([EST, T0]) => {
      vendorDirectory = [{ _row: 41, vendor_name: 'Kodner Galleries', category: 'Auction House' }, { _row: 42, vendor_name: 'Goodwill Palm Beach', category: 'Donation Pickup' },
        { _row: 43, vendor_name: 'Palm Beach Estate Buyers', category: 'Estate Buyer' }];
      jobs.unshift({ id: EST, hvlId: 'HVL-2610-E401', name: 'Harold Whitcombe', svc: 'probate', matterType: 'probate', addr: '5 E St', city: 'Palm Beach', zip: '33480',
        executor: 'Thomas Whitcombe', executorRole: 'Personal Representative', executorEmail: 't@example.com', deathDate: '2026-04-02', executorAuth: 'received',
        probateCase: '50-2026-CP-001234', docTier: 'values', gate706: 'yes', status: 'active', won: true, wonAt: '2026-09-25', approved: true, tc: 'Ashley Jerome',
        created: '2026-09-20', start: '2026-10-06', activatedOn: '2026-10-05', agrApproved: true, agrSent: true, agrSigned: true,
        docState: { estimate: { sentAt: '2026-09-24T14:00:00Z' }, agreement: { sentAt: '2026-09-26T14:00:00Z', sig: { signedBy: 'T', signedAt: '2026-09-28' } }, 'invoice:deposit': { sentAt: '2026-09-29T14:00:00Z' } },
        signedRecords: [{ id: 'pk1', kind: 'pickup', ref: 'Palm Beach Estate Buyers', stableIds: [], filedAt: T0, filedBy: 'Ashley Jerome', url: 'https://drive/x' }],
        payments: [{ uid: 'e1', stage: 'deposit', amount: 20000, receivedOn: '2026-10-01', method: 'wire', clearedOn: '2026-10-01' }], proceedsStatements: [] });
      estimateStore[EST] = { approved: true, submitted: true, approvedBy: 'Anthony Graziano', approvedAt: 'September 23, 2026', savedAt: T0,
        estimate: { jobId: EST, svc: 'probate', havellinTotal: 40000, fixedPrice: true, fixedAmount: 40000, fixedLines: true, totTC: 100, totPS: 150, tcRate: 150, psRate: 100,
          days: 8, vendors: [], prepItems: [], pkgCost: 0, rooms: [{ idx: 0, name: 'Living Room', st: 'in', vol: 3, cplx: 3 }] } };
      const item = (id, o) => Object.assign({ stableId: id, label: 'inventory', roomIdx: 0, seq: 1, status: 'uploaded', category: 'Furniture', disposition: '',
        objectName: 'Line ' + id, ts: T0, updatedAt: T0, filename: 'HVL_' + EST + '_INV_' + id + '.jpg', driveFileId: 'f-' + id }, o);
      _photoRefs[EST] = [
        item('a', { itemNo: 1, objectName: 'Paperback books', fmv: '20', disposition: 'Donate', channel: 'Goodwill Palm Beach' }),
        item('b', { itemNo: 2, objectName: 'Table lamp', fmv: '60', disposition: 'Donate', channel: 'Goodwill Palm Beach' }),
        item('c', { itemNo: 3, objectName: 'Harbor painting', category: 'Art & Décor', fmv: '2400', disposition: 'Auction', channel: 'Kodner Galleries' }),
        item('d', { itemNo: 4, objectName: 'Mantel clock', category: 'Clocks', fmv: '300', disposition: 'Auction', channel: 'Kodner Galleries' }),
        item('e', { itemNo: 5, objectName: 'Writing desk', fmv: '350', disposition: 'Donate', channel: 'Goodwill Palm Beach', flagDisputed: true }),
        item('f', { itemNo: 6, objectName: 'Old mattress', fmv: '0', disposition: 'Junk', channel: 'Haul-It', condition: 'Poor' })];
      savePhotoRefs(EST);
      saveJobs(); localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore));
      const out = {}; out[EST] = { items: JSON.parse(localStorage.getItem('hav_media_' + EST) || '[]') }; return out;
    }, [EST, T0]);

    // ── A ───────────────────────────────────────────────────────────────────
    await section('A. the release request: one initial per destination under $500; a line\'s own over $500 or with a caution', async () => {
      await toDesk(EST);
      await press('#inv-workbar button[onclick="printApprovalRequest(' + EST + ')"]', 'Approval Request');
      await p.waitForTimeout(500);
      const t = await lastPrint();
      ['Paperback books', 'Table lamp', 'Harbor painting', 'Mantel clock', 'Writing desk', 'Old mattress'].forEach((n) => has(t, n, n + ' is listed'));
      has(t, 'Initial once for the 2 items above going to Goodwill Palm Beach (Donate), each under $500', '⚠⚠ the books and the lamp share one initial');
      has(t, 'Initial once for the item above going to Kodner Galleries (Auction), each under $500', 'the clock, with its destination');
      has(t, 'Initial once for the item above going to Haul-It (Disposed of), each under $500', 'the mattress, with its own');
      const h = await p.evaluate(() => (window.__prints || []).slice(-1)[0] || '');
      eq((h.match(/initialled with its group/g) || []).length, 4, '⚠ four lines initialled with their group; the painting and the disputed desk initialled on their own');
    });

    // ── B ───────────────────────────────────────────────────────────────────
    await section('B. Good across a selection on the bulk bar; a blank prints "as photographed"', async () => {
      await toDesk(EST);
      for (const sid of ['a', 'b']) await p.click('#inv-row-' + sid + ' input[onchange^="_invTogglePick"]');
      await p.waitForTimeout(400);
      ok(await vis('select[onchange*="\'condition\'"]'), 'the bulk bar offers Set condition…');
      await p.selectOption('select[onchange*="\'condition\'"]', 'Good'); await p.waitForTimeout(600);
      eq([(await line('a')).condition, (await line('b')).condition, (await line('f')).condition], ['Good', 'Good', 'Poor'], '⚠⚠ Good on the two picked, the exception left as it was');
      await press('#inv-workbar button[onclick="printEstateInventoryReport(' + EST + ')"]', 'Estate Inventory PDF');
      await p.waitForTimeout(500);
      const t = await lastPrint();
      has(t, 'as photographed', '⚠⚠ a line with no condition prints "as photographed"');
      lacks(t, 'Furniture — ', 'never an em dash for it');
    });

    // ── C ───────────────────────────────────────────────────────────────────
    await section('C. the statement dialog: the auction house\'s lines ticked, lot by lot, written onto the lines', async () => {
      await toDesk(EST);
      await press('button[onclick="openProceedsStatement(' + EST + ')"]', '+ Record a statement');
      ok(await vis('#ps-modal'), 'the dialog opens');
      await p.fill('#ps-vendor', 'Kodner Galleries'); await p.dispatchEvent('#ps-vendor', 'input'); await p.waitForTimeout(300);
      const ticked = await p.evaluate(() => Array.from(document.querySelectorAll('#ps-lines input[type=checkbox]')).filter((c) => c.checked).map((c) => c.getAttribute('data-sid')));
      eq(ticked, ['c', 'd'], '⚠⚠ typing the auction house ticks its two lines');
      await p.fill('#ps-lines input.ps-lot-g[data-sid="c"]', '2600'); await p.fill('#ps-lines input.ps-lot-f[data-sid="c"]', '520');
      await p.fill('#ps-lines input.ps-lot-g[data-sid="d"]', '275.50'); await p.fill('#ps-lines input.ps-lot-f[data-sid="d"]', '55.10');
      await p.dispatchEvent('#ps-lines input.ps-lot-f[data-sid="d"]', 'input');
      has(await txt('#ps-lots-sum'), '2 lots ticked: gross $2,875.50, fees $575.10', 'the lots add up under the table, to the cent');
      await p.fill('#ps-date', '2026-10-08'); await p.fill('#ps-gross', '2875.50'); await p.fill('#ps-fees', '575.10'); await p.fill('#ps-net', '2300.40');
      await p.fill('#ps-paidon', '2026-10-09');
      await press('#ps-save-btn', 'Record statement →');
      await p.waitForTimeout(600);
      eq([(await line('c')).gross, (await line('c')).fees, (await line('d')).gross, (await line('d')).fees], [2600, 520, 275.5, 55.1], '⚠⚠ each lot\'s figures are on its line');
      eq(await p.evaluate((id) => (jobs.find((j) => j.id === id).proceedsStatements || []).length, EST), 1, 'the statement is recorded');
      has(await txt('#inv-proceeds-card'), 'Agrees with the ledger', 'and it agrees with the ledger to the cent');
    });

    // ── D ───────────────────────────────────────────────────────────────────
    await section('D. the close asks a rating of the auction house on a line and the charity on a pickup list', async () => {
      const un = await p.evaluate((id) => unratedVendorsForJob(jobs.find((j) => j.id === id)).map((v) => v.name), EST);
      eq(un.sort(), ['Goodwill Palm Beach', 'Kodner Galleries', 'Palm Beach Estate Buyers'], '⚠⚠ the charity and the auction house named on lines, and the buyer on a filed pickup list, are owed a rating');
      lacks(un.join(' '), 'Haul-It', 'a hauler the directory does not hold is nobody to rate');
      await p.evaluate((id) => { showPanel('jobs', document.querySelector('.nb[onclick*="\'jobs\'"]')); openClientDashboard(id); }, EST); await p.waitForTimeout(800);
      const n0 = dialogs.length;
      await press('#client-dashboard-view button[onclick="activateOrCycle(' + EST + ')"]', 'Close job');
      await p.waitForTimeout(700);
      const said = dialogs.slice(n0).join(' | ') + ' ' + await txt('#client-dashboard-view');
      has(said, 'Kodner Galleries', '⚠⚠ the close names the auction house');
      has(said, 'Goodwill Palm Beach', 'and the charity');
      has(said, 'Palm Beach Estate Buyers', 'and the buyer on the pickup list');
      eq(await p.evaluate((id) => !!jobs.find((j) => j.id === id).deliveredOn, EST), false, 'and the job is not closed');
    });

    // ── E ───────────────────────────────────────────────────────────────────
    await section('E. overflow and page errors', async () => {
      await toDesk(EST);
      ok(await overflow() <= 0, 'the desk fits at 1440 (' + await overflow() + ')');
      await p.setViewportSize({ width: 390, height: 844 });
      await press('button[onclick="openProceedsStatement(' + EST + ')"]', '+ Record a statement, on a phone');
      ok(await overflow() <= 0, 'the statement dialog fits at 390 (' + await overflow() + ')');
      eq(errs, [], 'no page errors');
    });
  } catch (e) {
    fail++; console.log('  ✗ threw: ' + String(e && e.message || e).split('\n')[0]);
  } finally {
    if (b) await b.close().catch(() => {});
    console.log('  step74: ' + pass + ' passed, ' + fail + ' failed');
    process.exit(fail ? 1 : 0);
  }
})();
