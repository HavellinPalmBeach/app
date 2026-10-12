// Step 76 — Who uses this device (2026-10-12; Anthony's answer to Q59). The app has no sign-in, so Settings is told once
// per phone or laptop who uses it, every internal stamp names that person, and the client's papers keep naming the job's
// concierge. Pressed as a person presses it:
//
//   A. a fresh device: the Clients tab carries the amber note; Settings (the gear) offers the roster; Ashley is picked and
//      saved through the real Save Settings; the key is stored and the note is gone
//   B. Mark cleared on a cheque, through the real button on the payments list: the list reads "· Ashley Jerome"
//   C. the device switched to Anthony: a Reviewed tick on the desk reads "Reviewed by Anthony Graziano" while the client's
//      deposit invoice still names Ashley, the job's concierge
//   D. Not set again: the note is back; overflow at 1440 and 390 on the Clients tab and with Settings open; no page errors
//
//   NODE_PATH=/opt/node22/lib/node_modules node tests/browser/step76.js [/abs/path/to/havellin.html]
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
const P = 7602, E = 7603;

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
    const stored = () => p.evaluate(() => { try { return localStorage.getItem('hav_device_user'); } catch (e) { return 'threw'; } });
    const clients = async () => { await p.evaluate(() => { showPanel('jobs', document.querySelector('.nb[onclick*="\'jobs\'"]')); if (typeof closeClientDashboard === 'function') closeClientDashboard(); }); await p.waitForTimeout(500); };
    const dash = async (id) => { await p.evaluate((id) => { showPanel('jobs', document.querySelector('.nb[onclick*="\'jobs\'"]')); openClientDashboard(id); }, id); await p.waitForTimeout(700); };
    const desk = async (id) => {
      await p.evaluate((id) => { setCurrentJob(id); populateInventorySelect(); }, id);
      await p.click('.nb[onclick*="\'inventory\'"]'); await p.waitForTimeout(900);
      const cur = await p.evaluate(() => { const el = document.querySelector('#inv-job'); return el ? el.value : ''; });
      if (String(cur) !== String(id)) { await p.selectOption('#inv-job', String(id)); await p.waitForTimeout(900); }
    };
    const setDevice = async (name) => {
      await press('button[onclick="openSettings()"]', 'the Settings gear');
      ok(await vis('#set-device-user'), 'the Who uses this device picker is in Settings');
      await p.selectOption('#set-device-user', name);
      await press('#settings-modal button[onclick="saveSettings()"]', 'Save Settings');
    };

    // ── Seed: a fee-only Home Prep with an uncleared cheque, and a probate estate with an agent-named line on the desk ──
    sheet = await p.evaluate(([P, E, T0]) => {
      jobs.unshift({ id: P, hvlId: 'HVL-2610-P602', name: 'David Kessler', fname: 'David', lname: 'Kessler', svc: 'prep', addr: '140 Clarke Ave', city: 'Palm Beach', zip: '33480',
        phone: '(561) 555-0102', email: 'dk@example.com', status: 'active', won: true, wonAt: '2026-10-01', approved: true, tc: 'Ashley Jerome', created: '2026-09-28', start: '2026-10-12',
        activatedOn: '2026-10-06', estimateSentDate: 'September 30, 2026', estimateSentTotal: 4620, acceptedTotal: 4620, agrApproved: true, agrApprovedBy: 'Anthony Graziano', agrSent: true, agrSigned: true,
        docState: { estimate: { sentAt: '2026-09-30T14:00:00Z' }, agreement: { sentAt: '2026-10-01T14:00:00Z', sig: { signedBy: 'David Kessler', signedAt: '2026-10-02' } }, 'invoice:deposit': { sentAt: '2026-10-03T14:00:00Z' } },
        payments: [{ uid: 'p3', stage: 'deposit', amount: 2310, receivedOn: '2026-10-04', method: 'check', recordedBy: 'Anthony Graziano' }], prepSourcing: {} });
      estimateStore[P] = { approved: true, submitted: true, approvedBy: 'Anthony Graziano', approvedAt: 'September 30, 2026', savedAt: T0,
        estimate: { jobId: P, svc: 'prep', totTC: 0, totPS: 0, tcRate: 150, psRate: 100, tcFee: 0, psFee: 0, prepEnabled: true, prepCost: 15400, prepFee: 4620, havellinTotal: 4620, grandTotal: 20020,
          prepItems: [{ id: 'p1', lid: 'p1', type: 'Full Interior Paint', cost: 9800 }, { id: 'p2', lid: 'p2', type: 'Landscaping', cost: 3200 }, { id: 'p3', lid: 'p3', type: 'Handyman Services', cost: 2400 }],
          pkgCost: 0, smf: 0, vendors: [], discountPct: 0, rush: false, fixedPrice: false, rooms: [], collections: [], vehicles: [] } };
      jobs.unshift({ id: E, hvlId: 'HVL-2610-E603', name: 'Harold Brennan', fname: 'Harold', lname: 'Brennan', svc: 'probate', addr: '1180 N Lake Way', city: 'Palm Beach', zip: '33480',
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
      _photoRefs[E] = [{ stableId: 'a1', label: 'inventory', roomIdx: 0, seq: 1, status: 'uploaded', category: 'Furniture', disposition: '', objectName: 'Walnut desk', namedBy: 'agent',
        ts: T0, updatedAt: T0, filename: 'HVL-2610-E603_Living Room_INV_a1.jpg', driveFileId: 'f-a1', driveFileUrl: 'https://drive.google.com/file/d/f-a1/view' }];
      savePhotoRefs(E);
      saveJobs(); localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore));
      try { localStorage.removeItem('hav_device_user'); } catch (e) {}
      _paintDeviceUserNote();
      const back = JSON.parse(localStorage.getItem('hav_media_' + E) || '[]');
      return { [E]: { items: back } };
    }, [P, E, T0]);

    await section('A. a fresh device: the note on the Clients tab, the picker in Settings, Ashley saved through the real control', async () => {
      await clients();
      eq(await stored(), null, 'fixture: nothing stored on this device');
      ok(await vis('#device-user-note'), 'the amber note is on the Clients tab');
      const note = await txt('#device-user-note');
      has(note, 'Who uses this device is not set', 'and says what is not set');
      has(note, 'Settings', 'and where to set it');
      await press('button[onclick="openSettings()"]', 'the Settings gear');
      ok(await vis('#set-device-user'), 'Who uses this device is in Settings');
      const options = await p.evaluate(() => [...document.querySelectorAll('#set-device-user option')].map((o) => [o.value, o.selected]));
      eq(options[0], ['', true], 'opens on Not set');
      eq(options.slice(1).map((o) => o[0]), ['Anthony Graziano', 'Anthony Graziano Jr', 'Ashley Jerome'], 'the roster and the managers, once each');
      await p.selectOption('#set-device-user', 'Ashley Jerome');
      await press('#settings-modal button[onclick="saveSettings()"]', 'Save Settings');
      eq(await stored(), 'Ashley Jerome', '⚠⚠ the pick is stored on this device');
      eq(await txt('#device-user-note'), '', 'and the note is gone');
      ok(!(await vis('#settings-modal')), 'the modal closed');
    });

    await section('B. Mark cleared, through the real button: the payments list names the device\'s user', async () => {
      await dash(P);
      const btn = '#client-dashboard-view button[onclick*="markPaymentCleared("]';
      ok(await vis(btn), 'Mark cleared is offered on the uncleared cheque');
      await press(btn, 'Mark cleared');
      ok(dialogs.some((d) => /Mark the .* as cleared today/.test(d)), 'it asked first');
      const list = await p.evaluate(() => { const el = document.querySelector('#client-dashboard-view'); return el ? el.textContent.replace(/\s+/g, ' ') : ''; });
      has(list, 'Cleared', 'the list reads cleared');
      const rec = await p.evaluate((id) => { const j = jobs.find((x) => x.id === id); return j.payments[0]; }, P);
      eq(rec.clearedBy, 'Ashley Jerome', '⚠⚠ clearedBy is Ashley, the device\'s user, not the approver who recorded the cheque');
      has(list, 'Ashley Jerome', 'and the list prints her beside the clearing');
      ok(/^\d{4}-\d{2}-\d{2}$/.test(rec.clearedOn || ''), 'cleared today');
    });

    await section('C. the device switched to Anthony: the desk\'s Reviewed tick names him; the client\'s invoice still names Ashley', async () => {
      await clients();
      await setDevice('Anthony Graziano');
      eq(await stored(), 'Anthony Graziano', 'the device is Anthony\'s now');
      await desk(E);
      const box = 'input[type="checkbox"][onchange*="_invSetReviewed("]';
      ok(await vis(box), 'the agent-named line offers its Reviewed box');
      await press(box, 'Reviewed');
      const line = await p.evaluate((id) => (_photoRefs[id] || []).find((r) => r.stableId === 'a1') || {}, E);
      eq([line.reviewed, line.reviewedBy], [true, 'Anthony Graziano'], '⚠⚠ reviewed by Anthony, who is at the device, not Ashley the concierge');
      const title = await p.evaluate(() => { const el = document.querySelector('input[type="checkbox"][onchange*="_invSetReviewed("]'); const l = el && el.closest('label'); return l ? l.title : ''; });
      has(title, 'Reviewed by Anthony Graziano', 'the box says who');
      const inv = await p.evaluate((id) => { const j = jobs.find((x) => x.id === id); const r = invoiceHtml(j, 'deposit'); return r && r.html ? r.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ') : ''; }, E);
      const named = await p.evaluate((id) => { const j = jobs.find((x) => x.id === id); return docConciergeName(j, estimateStore[id] && estimateStore[id].estimate); }, E);
      eq(named, 'Ashley Jerome', '⚠⚠ the client\'s papers name the job\'s concierge, whoever is at the device');
      has(inv, 'Ashley Jerome', 'the deposit invoice carries her name');
    });

    await section('D. Not set again: the note is back; overflow; no page errors', async () => {
      await clients();
      await setDevice('');
      eq(await stored(), '', 'stored as not set');
      has(await txt('#device-user-note'), 'not set', 'the note is back on the Clients tab');
      eq(await overflow(), 0, 'no horizontal overflow at 1440 with the note');
      await press('button[onclick="openSettings()"]', 'the Settings gear');
      eq(await overflow(), 0, 'none with Settings open');
      await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(500);
      eq(await overflow(), 0, 'none at 390 with Settings open');
      await press('#settings-modal button.btn-s', 'Cancel');
      eq(await overflow(), 0, 'none at 390 on the Clients tab with the note');
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
