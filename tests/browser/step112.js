// Step 112 — written release on a client's own home: a firearm, or an item going to someone who works with Havellin
// (2026-10-26; Anthony, on a living client: "they are going to approve things verbally to send … the estate requirement for
// signed/initialed release is the important one"; he took "Drop it, firearms aside", and for the two living cautions "Split
// them").
//
// Drives the REAL page: a Home Transition with a sofa to donate, a desk to a dealer, a rifle to the client's son, a brass lamp
// sold to the concierge and a bronze flagged for appraisal sold with no value. A: the work bar's Approval Request carries the
// rifle and the lamp alone, under the living head; the Releases bar says two wait. B: the bulk bar offers the request's three
// buttons only once the rifle is picked. C: the Contents Record carries the bronze's badge. D: the rifle and the lamp kept, by
// the row's own disposition box: the work bar offers no request and the bar says nothing is owed. E: overflow at 1440 and 390,
// zero page errors.
// Restated 2026-10-27: the work bar's papers open on screen first. The Approval Request (the work bar's and the bulk bar's)
// and the Contents Record no longer print at once: each opens in the document viewer, titled by the paper, prints nothing
// until its Print / Save PDF is pressed, and the page A, B and C read is the one that press prints; Close then clears the
// viewer off the desk.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step112.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');

const SYNC = 'https://sync.example.test/exec';
const T0 = Date.parse('2026-10-10T15:00:00Z');
const LIV = 11201;

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
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
    p.on('dialog', async (d) => { await d.accept(); });
    await p.goto(APP); await p.waitForTimeout(1600);
    await p.evaluate((u) => {
      SHEETS_SYNC_URL = u;
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
    const val = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.value : null; }, sel);
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const toDesk = async (id) => {
      await p.evaluate((id) => { setCurrentJob(id); populateInventorySelect(); }, id);
      await p.click('.nb[onclick*="\'inventory\'"]'); await p.waitForTimeout(900);
      if (String(await val('#inv-job')) !== String(id)) { await p.selectOption('#inv-job', String(id)); await p.waitForTimeout(900); }
    };
    const lastPrint = () => p.evaluate(() => { const d = document.createElement('div'); d.innerHTML = (window.__prints || []).slice(-1)[0] || '';
      return d.textContent.replace(/\s+/g, ' ').trim(); });
    // Restated 2026-10-27: the work bar's papers open on screen first. A paper this step reads opens in the document viewer,
    // titled by the paper, and prints nothing until its Print / Save PDF is pressed; the viewer comes back after the dialog and
    // its Close takes it off the desk, so the next press reaches the page under it.
    const viewerOpen = () => p.evaluate(() => { const o = document.getElementById('doc-viewer-modal'); return !!o && o.style.display === 'flex'; });
    const printCount = () => p.evaluate(() => (window.__prints || []).length);
    const printFromViewer = async (title, before) => {
      ok(await viewerOpen(), title + ' opens in the document viewer');
      eq(await txt('#doc-viewer-title'), title, 'the viewer is titled by the paper');
      eq(await printCount(), before, 'nothing printed before Print / Save PDF is pressed');
      await press('#doc-viewer-print', 'Print / Save PDF, in the viewer');
      await p.waitForSelector('#doc-viewer-modal', { state: 'visible', timeout: 4000 }).catch(() => ok(false, 'the viewer comes back after the print dialog'));
      eq(await printCount(), before + 1, 'Print / Save PDF printed the page once');
      await press('#doc-viewer-modal button[onclick="closeDocViewer()"]', 'Close the viewer');
      ok(!(await viewerOpen()), 'Close takes the viewer away');
    };
    const relLine = () => p.evaluate((id) => { const el = document.getElementById('desk-stat-releases-' + id); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }, LIV);
    const pick = async (sid) => { await p.click('#inv-row-' + sid + ' input[type=checkbox][title="Select for a bulk change"]'); await p.waitForTimeout(400); };
    const bulkButtons = () => p.evaluate((id) => Array.from(document.querySelectorAll('#inv-bulk-' + id + ' button')).map((x) => x.getAttribute('onclick') || ''), LIV);

    // ── Seed: an active Home Transition, the concierge Ashley Jerome ──
    sheet = await p.evaluate(([LIV, T0]) => {
      jobs.unshift({ id: LIV, hvlId: 'HVL-2610-L112', name: 'Margaret Ellis', fname: 'Margaret', lname: 'Ellis', email: 'meg@ellis.example', svc: 'downsizing_move',
        addr: '9 Dunbar Rd', city: 'Palm Beach', zip: '33480', destAddr: '200 Royal Palm Way', docTier: 'contents', status: 'active', won: true, wonAt: '2026-09-25',
        approved: true, tc: 'Ashley Jerome', created: '2026-09-20', start: '2026-10-06', activatedOn: '2026-10-05', agrApproved: true, agrSent: true, agrSigned: true,
        driveFolder: 'https://drive.google.com/drive/folders/ROOT112', driveSubfolders: { 'Estate Inventory': 'INV112', 'As-Found Record': 'AF112' },
        docState: { estimate: { sentAt: '2026-09-24T14:00:00Z' }, agreement: { sentAt: '2026-09-26T14:00:00Z', sig: { signedBy: 'Margaret Ellis', signedAt: '2026-09-28' } } },
        payments: [{ uid: 'l1', stage: 'deposit', amount: 9000, receivedOn: '2026-10-01', method: 'wire', clearedOn: '2026-10-01' }] });
      estimateStore[LIV] = { approved: true, submitted: true, approvedBy: 'Anthony Graziano', approvedAt: 'September 23, 2026', savedAt: T0,
        estimate: { jobId: LIV, svc: 'downsizing_move', havellinTotal: 18000, totTC: 40, totPS: 80, tcRate: 150, psRate: 100, days: 5, vendors: [], prepItems: [], pkgCost: 0,
          rooms: [{ idx: 0, name: 'Living Room', st: 'in', vol: 3, cplx: 3 }] } };
      const item = (id, o) => Object.assign({ stableId: id, label: 'inventory', roomIdx: 0, seq: 1, status: 'uploaded', category: 'Furniture', disposition: '',
        objectName: 'Line ' + id, ts: T0, updatedAt: T0, filename: 'HVL_' + LIV + '_INV_' + id + '.jpg', driveFileId: 'f-' + id, namedBy: 'desk', reviewed: true }, o);
      _photoRefs[LIV] = [
        item('d', { itemNo: 1, objectName: 'Chesterfield sofa', disposition: 'Donate', channel: 'Habitat ReStore' }),
        item('s', { itemNo: 2, objectName: 'Mahogany desk', disposition: 'Sell', channel: 'Kodner Galleries', fmv: '900' }),
        item('g', { itemNo: 3, objectName: 'Browning rifle', category: 'Firearms', disposition: 'Distribute', channel: 'Tom Ellis', serial: 'BR12345' }),
        item('t', { itemNo: 4, objectName: 'Brass lamp', disposition: 'Sell', channel: 'Ashley Jerome', fmv: '60' }),
        item('f', { itemNo: 5, objectName: 'Bronze figure', category: 'Art & Décor', disposition: 'Sell', channel: 'Kodner Galleries', needsAppr: true })];
      savePhotoRefs(LIV);
      saveJobs(); localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore));
      const out = {}; out[LIV] = { items: JSON.parse(localStorage.getItem('hav_media_' + LIV) || '[]') }; return out;
    }, [LIV, T0]);

    // ── A ───────────────────────────────────────────────────────────────────
    await section('A. the request carries the rifle and the lamp to the concierge, under the living head; the bar says two wait', async () => {
      await toDesk(LIV);
      has(await relLine(), '2 items need written approval: send a request', '⚠⚠ the Releases bar: the rifle and the lamp, not the other three');
      // Restated 2026-10-27: the work bar's papers open on screen first; the page read is the one its Print / Save PDF prints.
      const before = await printCount();
      await press('#inv-workbar button[onclick="printApprovalRequest(' + LIV + ')"]', 'Approval Request on the work bar');
      await printFromViewer('Release Approval Request', before);
      const t = await lastPrint();
      has(t, 'Browning rifle', 'the rifle is on it');
      has(t, 'Brass lamp', 'the lamp to the concierge is on it');
      has(t, 'Property going to someone who works with Havellin', 'the conflict is named above the line the client initials');
      lacks(t, 'Chesterfield sofa', '⚠⚠ the sofa to Habitat is not: the client\'s word approves it');
      lacks(t, 'Mahogany desk', 'nor the desk to the dealer');
      lacks(t, 'Bronze figure', 'nor the bronze');
      has(t, 'For your written approval before they leave', 'headed for what it is (two items: they)');
      lacks(t, 'on counsel', 'the firearms block names no counsel');
      ok(await overflow() <= 0, 'no horizontal overflow at 1440 (' + await overflow() + ')');
    });

    // ── B ───────────────────────────────────────────────────────────────────
    await section('B. the bulk bar offers the request\'s buttons only once the rifle is picked', async () => {
      await toDesk(LIV);
      await pick('d'); await pick('s');
      let btns = await bulkButtons();
      ok(btns.some((x) => x.indexOf('invBulkRemove(') === 0), 'fixture: the bulk bar is up');
      ok(!btns.some((x) => /printApprovalRequest\(|sendApprovalRequest\(|invRecordApproval\(/.test(x)), '⚠⚠ the sofa and the desk picked: no Approval request, Send request or Record approval');
      await pick('g');
      btns = await bulkButtons();
      eq(['printApprovalRequest(' + LIV + ',true)', 'sendApprovalRequest(' + LIV + ',true)', 'invRecordApproval(' + LIV + ')'].map((x) => btns.indexOf(x) >= 0), [true, true, true],
        'the rifle picked too: all three');
      // Restated 2026-10-27: the work bar's papers open on screen first; the page read is the one its Print / Save PDF prints.
      const before = await printCount();
      await press('#inv-bulk-' + LIV + ' button[onclick="printApprovalRequest(' + LIV + ',true)"]', 'Approval request on the bulk bar');
      await printFromViewer('Release Approval Request', before);
      const t = await lastPrint();
      has(t, 'Browning rifle', 'the selection\'s request: the rifle');
      lacks(t, 'Chesterfield sofa', '⚠ and not the sofa picked beside it');
      await p.evaluate(() => _invClearPicks()); await p.waitForTimeout(300);
    });

    // ── C ───────────────────────────────────────────────────────────────────
    await section('C. the bronze sold with no value is named on the Contents Record', async () => {
      await toDesk(LIV);
      // Restated 2026-10-27: the work bar's papers open on screen first; the page read is the one its Print / Save PDF prints.
      const before = await printCount();
      await press('#inv-workbar button[onclick="printContentsRecord(' + LIV + ')"]', 'Contents Record on the work bar');
      await printFromViewer('Contents Record', before);
      const t = await lastPrint();
      has(t, 'Bronze figure', 'fixture: the bronze is on the record');
      has(t, 'FLAGGED FOR APPRAISAL, NO VALUE RECORDED', '⚠⚠ with its badge, where the client signs');
    });

    // ── D ───────────────────────────────────────────────────────────────────
    await section('D. the rifle and the lamp kept, on the row\'s own box: no request offered, nothing owed', async () => {
      await toDesk(LIV);
      for (const sid of ['g', 't']) {
        const sel = '#inv-row-' + sid + ' select[onchange*="\'disposition\'"]';
        ok(await vis(sel), 'the ' + sid + ' row\'s disposition box is on screen');
        await p.selectOption(sel, 'Keep'); await p.waitForTimeout(900);
      }
      eq(await p.evaluate((id) => _photoRefs[id].filter((r) => r.disposition === 'Keep').map((r) => r.stableId).sort(), LIV), ['g', 't'], 'fixture: both kept');
      await toDesk(LIV);
      eq(await p.locator('#inv-workbar button[onclick="printApprovalRequest(' + LIV + ')"]').count(), 0, '⚠⚠ nothing needs the client\'s signature: no Approval Request on the work bar');
      lacks(await relLine(), 'written approval', 'and the Releases bar owes none');
      // Found on review: a Havellin person typed as the buyer on the row makes the line need the client's signature, and the work
      // bar follows at once (it was repainted only on a figure, so its Approval Request waited for the next full render).
      const rb = await p.evaluate(() => window.__renders = 0);
      await p.evaluate(() => { const r = renderInventoryTab; window.renderInventoryTab = function () { window.__renders++; return r.apply(this, arguments); }; });
      await p.fill('#inv-row-s .inv-recip', 'Ashley Jerome'); await p.press('#inv-row-s .inv-recip', 'Tab'); await p.waitForTimeout(800);
      eq(await p.locator('#inv-workbar button[onclick="printApprovalRequest(' + LIV + ')"]').count(), 1, '⚠⚠ the concierge typed as the desk\'s buyer: the work bar offers the request at once');
      eq(await p.evaluate(() => window.__renders), 0, 'repainted by id, not a full render');
    });

    // ── E ───────────────────────────────────────────────────────────────────
    await section('E. a phone: no horizontal overflow; zero page errors', async () => {
      await p.setViewportSize({ width: 390, height: 844 });
      await p.waitForTimeout(500);
      await toDesk(LIV);
      ok(await overflow() <= 0, 'no horizontal overflow at 390 (' + await overflow() + ')');
      eq(errs, [], 'zero page errors');
    });

    await b.close();
    console.log('\nstep112: ' + pass + ' passed, ' + fail + ' failed');
    process.exit(fail ? 1 : 0);
  } catch (e) {
    console.log('step112 crashed: ' + (e && e.stack || e));
    if (b) await b.close().catch(() => {});
    process.exit(1);
  }
})();
