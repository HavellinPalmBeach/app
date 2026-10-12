'use strict';
// Step 77 — Who recorded a custody event (2026-10-12; found building Q59, Anthony: build it now). The chain of custody
// log recorded the party, the date, the method and the receipt and no Havellin person, so the package's *Release
// Approvals and Chain of Custody* record could not say who logged a release. Each event now carries `by` off
// `_invStampBy` (the device's user, else the job's concierge). Pressed as a person presses it:
//
//   A. the device is Ashley's (through the real Settings control); on the desk the line's record is opened, Chain of
//      custody pressed, an event typed and added: the list reads "recorded by Ashley Jerome", the stored event says so,
//      the button's badge counts it
//   B. the device switched to Anthony: a second event names him; the record the package files, rendered, carries a
//      Recorded by column with each event's own name, and prints without overflow
//   C. overflow at 1440 and 390 with the dialog open; no page errors
//
//   NODE_PATH=/opt/node22/lib/node_modules node tests/browser/step77.js [/abs/path/to/havellin.html]
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
const E = 7703;

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
    await ctx.route(SYNC + '**', async (r) => {
      const req = r.request();
      const json = (o) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
      if (req.method() === 'POST') return json({ ok: true });
      if (/action=loadMedia/.test(req.url())) return json({ ok: true, media: sheet });
      return json({ ok: true });
    });
    let sheet = {};
    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    const dialogs = [];
    p.on('dialog', async (d) => { dialogs.push(d.type() + ': ' + d.message()); await d.accept(); });
    await p.goto(APP); await p.waitForTimeout(1600);
    await p.evaluate((u) => { SHEETS_SYNC_URL = u; window.open = function () { return null; }; }, SYNC);

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
    const events = () => p.evaluate((id) => JSON.parse(JSON.stringify(((_photoRefs[id] || []).find((r) => r.stableId === 'a1') || {}).custodyLog || [])), E);
    const clients = async () => { await p.evaluate(() => { showPanel('jobs', document.querySelector('.nb[onclick*="\'jobs\'"]')); if (typeof closeClientDashboard === 'function') closeClientDashboard(); }); await p.waitForTimeout(500); };
    const desk = async (id) => {
      await p.evaluate((id) => { setCurrentJob(id); populateInventorySelect(); }, id);
      await p.click('.nb[onclick*="\'inventory\'"]'); await p.waitForTimeout(900);
      const cur = await p.evaluate(() => { const el = document.querySelector('#inv-job'); return el ? el.value : ''; });
      if (String(cur) !== String(id)) { await p.selectOption('#inv-job', String(id)); await p.waitForTimeout(900); }
    };
    const setDevice = async (name) => {
      await clients();
      await press('button[onclick="openSettings()"]', 'the Settings gear');
      ok(await vis('#set-device-user'), 'the Who uses this device picker is in Settings');
      await p.selectOption('#set-device-user', name);
      await press('#settings-modal button[onclick="saveSettings()"]', 'Save Settings');
    };
    const custodyBtn = 'button[onclick="openCustodyModal(' + E + ',\'a1\')"]';
    // The ▾ toggles the record open and shut, and the desk remembers it across a redraw: press it only while shut.
    const openRecord = async () => {
      if (!(await vis(custodyBtn))) await press('button.icon-btn[onclick="_invToggleOpen(\'a1\')"]', 'the line\'s ▾ (open the full record)');
      ok(await vis(custodyBtn), 'the record offers Chain of custody');
    };
    const addEvent = async (action, party, date, method, receipt) => {
      await p.selectOption('#cust-action', action);
      await p.fill('#cust-party', party);
      await p.fill('#cust-date', date);
      await p.fill('#cust-method', method);
      await p.fill('#cust-receipt', receipt);
      await press('#custody-modal button[onclick="addCustodyEvent()"]', 'Add event');
    };

    // ── Seed: a probate estate with one named line on the desk ──
    sheet = await p.evaluate(([E, T0]) => {
      jobs.unshift({ id: E, hvlId: 'HVL-2610-E703', name: 'Harold Brennan', fname: 'Harold', lname: 'Brennan', svc: 'probate', addr: '1180 N Lake Way', city: 'Palm Beach', zip: '33480',
        executor: 'Michael Brennan', executorRole: 'Personal Representative', executorPhone: '(561) 555-0103', executorEmail: 'mb@example.com', deathDate: '2026-06-02', executorAuth: 'received',
        matterType: 'probate', probateCase: '50-2026-CP-004412', docTier: 'appraisals', docLevel: 'formal', status: 'active', won: true, wonAt: '2026-09-25', approved: true, tc: 'Ashley Jerome',
        created: '2026-09-20', start: '2026-10-06', activatedOn: '2026-10-05', estimateSentDate: 'September 24, 2026', estimateSentTotal: 49000, acceptedTotal: 49000, agrApproved: true,
        agrApprovedBy: 'Anthony Graziano', agrSent: true, agrSigned: true,
        docState: { estimate: { sentAt: '2026-09-24T14:00:00Z' }, agreement: { sentAt: '2026-09-26T14:00:00Z', sig: { signedBy: 'Michael Brennan', signedAt: '2026-09-28' } }, 'invoice:deposit': { sentAt: '2026-09-29T14:00:00Z' } },
        payments: [{ uid: 'p4', stage: 'deposit', amount: 24500, receivedOn: '2026-10-01', method: 'wire', clearedOn: '2026-10-01' }],
        driveFolder: 'https://drive.google.com/drive/folders/f1', driveSubfolders: { 'Estate Inventory': 'sf1', 'As-Found Record': 'sf2' } });
      estimateStore[E] = { approved: true, submitted: true, approvedBy: 'Anthony Graziano', approvedAt: 'September 23, 2026', savedAt: T0,
        estimate: { jobId: E, svc: 'probate', havellinTotal: 49000, grandTotal: 49000, fixedPrice: true, fixedAmount: 49000, fixedLines: true, totTC: 120, totPS: 200, tcRate: 150, psRate: 100,
          tcFee: 18000, psFee: 20000, days: 10, vendors: [], prepItems: [], pkgCost: 0, collections: [],
          rooms: [{ idx: 0, name: 'Living Room', st: 'in', vol: 3, cplx: 3 }] } };
      _photoRefs[E] = [{ stableId: 'a1', label: 'inventory', roomIdx: 0, seq: 1, itemNo: 1, status: 'uploaded', category: 'Art', disposition: 'Auction', channel: "Sotheby's", objectName: 'Sargent portrait',
        namedBy: 'desk', fmv: '12000', ts: T0, updatedAt: T0, filename: 'HVL-2610-E703_Living Room_INV_a1.jpg', driveFileId: 'f-a1', driveFileUrl: 'https://drive.google.com/file/d/f-a1/view' }];
      savePhotoRefs(E);
      saveJobs(); localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore));
      try { localStorage.removeItem('hav_device_user'); } catch (e) {}
      _paintDeviceUserNote();
      const back = JSON.parse(localStorage.getItem('hav_media_' + E) || '[]');
      return { [E]: { items: back } };
    }, [E, T0]);

    await section('A. Ashley\'s device: the line\'s record, Chain of custody, an event added through the dialog', async () => {
      await setDevice('Ashley Jerome');
      await desk(E);
      await openRecord();
      has(await txt(custodyBtn), 'Chain of custody', 'named Chain of custody');
      lacks(await txt(custodyBtn), '(', 'with no count yet');
      await press(custodyBtn, 'Chain of custody');
      ok(await p.locator('#custody-modal').evaluate((el) => el.checkVisibility()), 'the dialog is open');
      has(await txt('#custody-list'), 'No custody events logged yet', 'fixture: an empty log');
      await addEvent('Released', "Sotheby's", '2026-10-08', 'Collected on site', 'SBY-4471');
      const list = await txt('#custody-list');
      has(list, 'Released', 'the event is listed');
      has(list, "Sotheby's", 'with the party');
      has(list, 'SBY-4471', 'and the receipt');
      has(list, 'recorded by Ashley Jerome', '⚠⚠ and who at Havellin recorded it: the device\'s user');
      const ev = await events();
      eq(ev.length, 1, 'one event stored');
      eq(ev[0].by, 'Ashley Jerome', '⚠⚠ stored on the event (`by`), so the sheet carries it and the record can print it');
      eq([ev[0].action, ev[0].party, ev[0].date, ev[0].method, ev[0].receipt], ['Released', "Sotheby's", '2026-10-08', 'Collected on site', 'SBY-4471'], 'with everything typed');
      ok(ev[0].cid, 'and its own identity');
      has(await txt(custodyBtn), '(1)', 'the button\'s badge counts it');
      eq(await p.evaluate(() => document.getElementById('cust-party').value), '', 'the party box is emptied for the next event');
    });

    await section('B. Anthony\'s device: a second event names him; the record the package files prints Recorded by per event', async () => {
      await press('#custody-modal button[onclick="closeCustodyModal()"]', 'Close');
      await setDevice('Anthony Graziano');
      await desk(E);
      await openRecord();
      await press(custodyBtn, 'Chain of custody (1)');
      await addEvent('Received', 'Havellin storage', '2026-10-09', 'Hand-carry', '');
      const list = await txt('#custody-list');
      has(list, 'recorded by Ashley Jerome', 'the first event keeps Ashley');
      has(list, 'recorded by Anthony Graziano', '⚠⚠ the second names Anthony, who is at the device now');
      const ev = await events();
      eq(ev.map((e) => e.by), ['Ashley Jerome', 'Anthony Graziano'], 'each event carries its own recorder');
      // The record the package files, rendered as a page and measured off it.
      const html = await p.evaluate((id) => probatePackageRecordHtml(id), E);
      const r = await ctx.newPage();
      await r.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;">' + html + '</body></html>');
      await r.waitForTimeout(300);
      // The custody table is the one headed Event (the approvals table is absent while nothing is approved).
      const heads = await r.evaluate(() => [...document.querySelectorAll('table')].map((t) => [...t.querySelectorAll('thead th')].map((h) => h.textContent.trim())));
      const ci = heads.findIndex((h) => h.indexOf('Event') >= 0);
      eq(heads[ci], ['Item #', 'Item', 'Date', 'Event', 'Party', 'Method', 'Receipt / reference', 'Recorded by'], '⚠⚠ the custody table carries a Recorded by column, after the receipt');
      const rows = await r.evaluate((i) => { const t = document.querySelectorAll('table')[i]; return t ? [...t.querySelectorAll('tbody tr')].map((tr) => [...tr.querySelectorAll('td')].map((c) => c.textContent.replace(/\s+/g, ' ').trim())) : []; }, ci);
      eq(rows.map((c) => [c[2], c[3], c[4], c[7]]), [['Oct 8, 2026', 'Released', "Sotheby's", 'Ashley Jerome'], ['Oct 9, 2026', 'Received', 'Havellin storage', 'Anthony Graziano']],
        '⚠⚠ each event names who recorded it, in the order the events happened');
      eq(rows[0][0], '1', 'under the item\'s number');
      has(await r.evaluate(() => document.body.textContent.replace(/\s+/g, ' ')), 'Release Approvals and Chain of Custody', 'headed as the package names it');
      await r.setViewportSize({ width: 739, height: 1000 });
      await r.emulateMedia({ media: 'print' });
      eq(await r.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 0, 'no horizontal overflow at Letter width in print');
      await r.close();
    });

    await section('C. overflow with the dialog open; no page errors', async () => {
      eq(await overflow(), 0, 'no horizontal overflow at 1440 with the dialog open');
      await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(500);
      eq(await overflow(), 0, 'none at 390 with the dialog open');
      ok(await p.locator('#custody-modal').evaluate((el) => el.checkVisibility()), 'the dialog is still open at 390');
      await press('#custody-modal button[onclick="closeCustodyModal()"]', 'Close');
      eq(await overflow(), 0, 'none at 390 on the desk');
      await p.setViewportSize({ width: 1440, height: 1000 }); await p.waitForTimeout(300);
      eq(errs, [], 'zero page errors');
    });

    await b.close();
    console.log('\n' + pass + ' passed, ' + fail + ' failed');
    process.exit(fail ? 1 : 0);
  } catch (e) {
    console.log('FATAL ' + (e && e.stack || e));
    if (b) await b.close().catch(() => {});
    console.log('\n' + pass + ' passed, ' + (fail + 1) + ' failed');
    process.exit(1);
  }
})();
