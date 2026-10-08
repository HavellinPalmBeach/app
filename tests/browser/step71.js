// Step 71 — the job-flow audit (2026-10-08). Anthony: "run through a job in each category … make sure the actual
// operational job of the transition concierge and the property specialist is not overly complicated … find
// inconsistencies or bugs". Seven whole jobs ran through the real controls; these are the fixes a person sees.
//
// Drives the REAL page through its own controls: the Job Plan (its stage cards, a Before Day 1 tick, the pre-job call
// note, a room card, the in-page camera with Chromium's fake camera and its Done), the Client Dashboard (the band's
// Record payment on the deposit invoice row, the real payment recorder, the strip's View deposit invoice and the
// document viewer). The Apps Script URL is answered by a route as the real script would answer it (loadMedia returns
// the manifest with each item's keys in the order the sheet keeps them; every write is accepted).
//
//   A. a job whose photographs are on the sheet: the Job Plan renders and STOPS (it re-rendered itself without end, 193
//      times in 6 s, because the refresh read key order as a change), and a note typed into it survives
//   B. ticking a Before Day 1 box moves the stage's "N of M ticked" at once
//   C. the unsaved-changes chip steps aside while the camera is open (it covered the shutter on a phone), and is back on Done
//   D. a deposit cheque handed over at signing is recorded from the deposit invoice's row, before any invoice is sent,
//      and the band moves on to activation
//   E. a probate estate's deposit invoice bills the estate and names the representative, never the decedent as client
//   F. overflow at 1440 and 390 (the Job Plan, the dashboard); no page errors
//
//   NODE_PATH=/opt/node22/lib/node_modules node tests/browser/step71.js [/abs/path/to/havellin.html]
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
const J = 7101, L = 7102;

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
      args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
    await ctx.grantPermissions(['camera']).catch(() => {});
    // The Apps Script, as a route. loadMedia hands back this job's manifest with every item's keys REVERSED — the same
    // items, in the order the sheet stores what a device posted rather than the order savePhotoRefs writes them.
    const net = { media: 0, posts: 0 };
    let sheetItems = [];
    await ctx.route(SYNC + '**', async (r) => {
      const req = r.request();
      const json = (o) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
      if (req.method() === 'POST') { net.posts++; return json({ ok: true }); }
      if (/action=loadMedia/.test(req.url())) { net.media++; return json({ ok: true, media: { [J]: { items: sheetItems } } }); }
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
    }, SYNC);

    const section = async (name, body) => {
      console.log('\n## ' + name);
      try { await body(); } catch (e) { fail++; console.log('  ✗ ' + name + ' threw: ' + String(e && e.message || e).split('\n')[0]); }
    };
    const vis = (sel) => p.locator(sel).first().isVisible().catch(() => false);
    const press = async (sel, what) => {
      const n = await p.locator(sel).count();
      const v = n === 1 && await vis(sel);
      ok(v, (what || sel) + ' — one control, on screen (' + n + ')');
      if (v) { await p.click(sel, { timeout: 5000 }).catch((e) => ok(false, (what || sel) + ' — ' + e.message.split('\n')[0])); await p.waitForTimeout(500); }
      return v;
    };
    const txt = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }, sel);
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

    // ── Seed: an active probate estate whose photographs are on the sheet, and a living client who has just signed ──
    sheetItems = await p.evaluate(([J, L, T0]) => {
      jobs.unshift({ id: J, hvlId: 'HVL-2610-P101', name: 'Harold Whitcombe', fname: 'Harold', lname: 'Whitcombe', svc: 'probate',
        addr: '69 Beach Blvd', city: 'Palm Beach', zip: '33480', executor: 'Thomas Whitcombe', executorRole: 'Personal Representative',
        executorPhone: '(561) 555-0101', executorEmail: 't@example.com', deathDate: '2026-04-02', executorAuth: 'received',
        matterType: 'probate', probateCase: '50-2026-CP-001234', docTier: 'values', status: 'active', won: true, wonAt: '2026-09-25',
        approved: true, tc: 'Ashley Jerome', created: '2026-09-20', start: '2026-10-06', activatedOn: '2026-10-05',
        agrApproved: true, agrSent: true, agrSigned: true,
        docState: { estimate: { sentAt: '2026-09-24T14:00:00Z' }, agreement: { sentAt: '2026-09-26T14:00:00Z', sig: { signedBy: 'Thomas Whitcombe', signedAt: '2026-09-28' } },
                    'invoice:deposit': { sentAt: '2026-09-29T14:00:00Z' } },
        payments: [{ uid: 'p1', stage: 'deposit', amount: 25600, date: '2026-10-01', method: 'wire', cleared: '2026-10-01' }] });
      estimateStore[J] = { approved: true, submitted: true, approvedBy: 'Anthony Graziano', approvedAt: 'September 23, 2026', savedAt: T0,
        estimate: { jobId: J, svc: 'probate', havellinTotal: 51200, grandTotal: 56500, fixedPrice: true, fixedAmount: 51200, fixedLines: true,
          totTC: 120, totPS: 200, tcRate: 150, psRate: 100, tcFee: 18000, psFee: 20000, days: 8, vendors: [], prepItems: [], pkgCost: 0,
          rooms: [{ idx: 0, name: 'Living Room', st: 'in', vol: 3, cplx: 3 }, { idx: 1, name: 'Library', st: 'in', vol: 3, cplx: 3 }] } };
      const item = (id, o) => Object.assign({ stableId: id, label: 'inventory', roomIdx: 0, seq: 1, status: 'uploaded', category: 'Furniture',
        disposition: '', objectName: 'Line ' + id, ts: T0, updatedAt: T0, itemNo: 1, filename: 'HVL-2610-P101_Living Room_INV_' + id + '.jpg',
        driveFileId: 'f-' + id, driveFileUrl: 'https://drive.google.com/file/d/f-' + id + '/view' }, o);
      _photoRefs[J] = [item('a1', { itemNo: 1 }), item('a2', { itemNo: 2, ts: T0 + 1, updatedAt: T0 + 1 }),
        item('b1', { label: 'before', itemNo: undefined, objectName: undefined, ts: T0 + 2, updatedAt: T0 + 2 })];
      savePhotoRefs(J);
      // What the sheet holds: the same items, each one's keys in reverse order.
      const back = JSON.parse(localStorage.getItem('hav_media_' + J) || '[]').map((it) => {
        const o = {}; Object.keys(it).reverse().forEach((k) => { o[k] = it[k]; }); return o;
      });
      jobs.unshift({ id: L, hvlId: 'HVL-2610-L102', name: 'Pat Butler', fname: 'Pat', lname: 'Butler', svc: 'home_cleanout',
        addr: '1 A St', city: 'Palm Beach', zip: '33480', phone: '(561) 555-0199', email: 'pat@example.com',
        status: 'won', won: true, wonAt: '2026-10-02', approved: true, tc: 'Ashley Jerome', created: '2026-09-28', start: '2026-10-19',
        walkthrough: '2026-09-30', estimateSentDate: 'October 1, 2026', estimateSentTotal: 10000, acceptedTotal: 10000,
        agrApproved: true, agrSent: true, agrSigned: true,
        docState: { estimate: { sentAt: '2026-10-01T14:00:00Z' }, agreement: { sentAt: '2026-10-02T14:00:00Z', sig: { signedBy: 'Pat Butler', signedAt: '2026-10-07' } } },
        payments: [] });
      estimateStore[L] = { approved: true, submitted: true, approvedBy: 'Anthony Graziano', approvedAt: 'September 30, 2026', savedAt: T0,
        estimate: { jobId: L, svc: 'home_cleanout', havellinTotal: 10000, grandTotal: 10000, totTC: 20, totPS: 40, tcRate: 150, psRate: 100,
          tcFee: 3000, psFee: 4000, days: 3, vendors: [], prepItems: [], pkgCost: 0, rooms: [{ idx: 0, name: 'Kitchen', st: 'in', vol: 3, cplx: 3 }] } };
      saveJobs(); localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore));
      return back;
    }, [J, L, T0]);

    // ── A ───────────────────────────────────────────────────────────────────
    await section('A. the Job Plan of a job whose photographs are on the sheet renders and stops', async () => {
      await p.evaluate((j) => openJobPlanFor(j), J); await p.waitForTimeout(2500);
      ok(net.media >= 1, 'fixture: the plan read the manifest from the sheet (' + net.media + ')');
      ok(await p.locator('#job-plan-content .plan-flow').count() === 1, 'fixture: the plan is on screen');
      await p.evaluate(() => {
        window.__planWrites = 0;
        const host = document.getElementById('job-plan-content');
        new MutationObserver((list) => { window.__planWrites += list.length; }).observe(host, { childList: true });
      });
      const media0 = net.media;
      await p.waitForTimeout(5000);
      const writes = await p.evaluate(() => window.__planWrites);
      ok(writes <= 1, '⚠⚠ the plan stops re-rendering itself: ' + writes + ' rewrites in 5 s (it was one per round trip, without end)');
      ok(net.media - media0 <= 1, '…and stops asking the sheet for the manifest (' + (net.media - media0) + ' more reads)');
      const note = '#p0-call-notes-' + J;
      ok(await vis(note), 'the pre-job call note is on screen');
      await p.click(note); await p.type(note, 'Daughter Claire decides; keys under the mat', { delay: 25 });
      await p.waitForTimeout(3000);
      eq(await p.evaluate((s) => { const e = document.querySelector(s); return e ? e.value : null; }, note), 'Daughter Claire decides; keys under the mat',
        '⚠ a note typed into the plan survives (a redraw used to wipe it mid-sentence)');
    });

    // ── B ───────────────────────────────────────────────────────────────────
    await section('B. a Before Day 1 tick moves the stage\'s count at once', async () => {
      const before = await txt('#stage-p0 .stg-count');
      has(before, '0 of ', 'fixture: nothing ticked on Before Day 1 (' + before + ')');
      await press('#job-plan-content input[onchange^="togglePlanTask(' + J + ',\'precall\'"]', 'the pre-job call box');
      has(await txt('#stage-p0 .stg-count'), '1 of ', '⚠⚠ the stage reads one ticked straight away');
    });

    // ── C ───────────────────────────────────────────────────────────────────
    await section('C. the unsaved-changes chip steps aside while the camera is open', async () => {
      await p.setViewportSize({ width: 390, height: 844 });
      await p.evaluate(() => { _pendingWrites['test:x'] = { target: 'main', body: { type: 'saveJobs' }, tries: 2 }; updatePendingIndicator(); });
      const chipOn = () => p.evaluate(() => { const e = document.getElementById('sync-pending'); return !!(e && e.checkVisibility()); });
      ok(await chipOn(), 'fixture: the chip shows an unsaved change');
      await press('#plan-rooms-' + J + ' .rl-row[onclick="openRoomWorkspace(' + J + ',0)"]', 'the Living Room\'s card');
      await press('#room-ws button.ws-cam[onclick="openFieldCamera(' + J + ',0,\'before\')"]', 'As found');
      await p.waitForTimeout(800);
      ok(await vis('#field-cam .fc-shutter'), 'fixture: the camera is open with its shutter');
      eq(await chipOn(), false, '⚠⚠ the chip is not over the shutter');
      await press('#field-cam .fc-done', 'Done');
      ok(await chipOn(), 'and it is back once the camera closes');
      await p.evaluate(() => { delete _pendingWrites['test:x']; updatePendingIndicator(); try { closeRoomWorkspace(); } catch (e) {} });
      ok(await overflow() <= 0, 'the Job Plan fits at 390 (' + await overflow() + ')');
      await p.setViewportSize({ width: 1440, height: 1000 });
    });

    // ── D ───────────────────────────────────────────────────────────────────
    const dash = async (id) => { await p.evaluate((id) => { showPanel('jobs', document.querySelector('.nb[onclick*="\'jobs\'"]')); openClientDashboard(id); }, id); await p.waitForTimeout(700); };
    await section('D. a deposit cheque handed over at signing is recorded before any invoice', async () => {
      await dash(L);
      has(await txt('#client-dashboard-view .jt-next'), 'Send the deposit invoice', 'fixture: the band is on the deposit invoice, none sent');
      await press('#client-dashboard-view button[onclick="dashRecordPayment(' + L + ',\'deposit\')"]', '✓ Record payment, on the deposit invoice\'s row');
      ok(await vis('#dep-save-btn'), 'the payment recorder opens');
      await p.fill('#dep-amount', '5000');
      await p.selectOption('#dep-method', 'check');
      await p.fill('#dep-reference', 'Cheque 1042');
      await press('#dep-save-btn', 'Record Deposit');
      await p.waitForTimeout(800);
      eq(await p.evaluate((id) => (jobs.find((j) => j.id === id).payments || []).map((x) => [x.stage, x.amount, x.method]), L), [['deposit', 5000, 'check']],
        'the cheque is on the job');
      await dash(L);
      const band = await txt('#client-dashboard-view .jt-next');
      lacks(band, 'Send the deposit invoice', '⚠⚠ the band no longer asks for an invoice for money already in hand');
      has(band, 'Activate the job', 'it moves on to activation');
    });

    // ── E ───────────────────────────────────────────────────────────────────
    await section('E. a probate estate\'s deposit invoice bills the estate', async () => {
      await dash(J);
      const view = '#client-dashboard-view button[onclick="docAction(' + J + ',\'invoice\',\'view\',{stage:\'deposit\'})"]';
      await press(view, 'View deposit invoice');
      await p.waitForTimeout(800);
      const doc = await txt('#doc-viewer-body');
      has(doc, 'Estate of Harold Whitcombe', '⚠⚠ the invoice bills the estate');
      has(doc, 'Authorized Representative', 'and names the representative');
      has(doc, 'Thomas Whitcombe', '…by name');
      lacks(doc, 'Client Harold Whitcombe', 'never the decedent as the client');
      await p.evaluate(() => { try { closeDocViewer(); } catch (e) { const m = document.getElementById('doc-viewer-modal'); if (m) m.style.display = 'none'; } });
    });

    // ── F ───────────────────────────────────────────────────────────────────
    await section('F. overflow and page errors', async () => {
      ok(await overflow() <= 0, 'the dashboard fits at 1440 (' + await overflow() + ')');
      await p.setViewportSize({ width: 390, height: 844 });
      await dash(J);
      ok(await overflow() <= 0, 'the dashboard fits at 390 (' + await overflow() + ')');
      eq(errs, [], 'no page errors');
    });
  } catch (e) {
    fail++; console.log('  ✗ threw: ' + String(e && e.message || e).split('\n')[0]);
  } finally {
    if (b) await b.close().catch(() => {});
    console.log('  step71: ' + pass + ' passed, ' + fail + ' failed');
    process.exit(fail ? 1 : 0);
  }
})();
