// Step 81 — the Keys & access card: the custody log for every key, fob, remote and code (2026-10-16; KEY_CUSTODY_SPEC.md).
//
// Drives the REAL card on a Home Transition's Job Plan through its real controls: a batch received (a front door key ×2 and
// an alarm code) lands in the device user's hands; Close job on the band is refused while they are held, naming them; the
// alarm code is marked lost and reads red on the card and on the client dashboard; the key is returned; the close now goes
// through, wipes the code's digits and files the record; the printed record carries no digits. Phone width is measured
// with the card open.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step81.js [/abs/path/to/havellin.html]
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
const MM = 8101;

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
    const uploads = [];
    await ctx.route(SYNC + '**', async (r) => {
      const req = r.request();
      const json = (o) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
      if (req.method() === 'POST') {
        try { const body = JSON.parse(req.postData() || '{}'); if (body.action === 'uploadHtml') uploads.push(body); } catch (e) {}
        return json({ ok: true, fileUrl: 'https://drive.google.com/file/d/up1/view', fileId: 'up1' });
      }
      if (/action=loadMedia/.test(req.url())) return json({ ok: true, media: {} });
      return json({ ok: true });
    });
    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    const dialogs = [];
    p.on('dialog', async (d) => { dialogs.push(d.message()); await d.accept(); });
    await p.goto(APP); await p.waitForTimeout(1600);
    await p.evaluate((u) => {
      SHEETS_SYNC_URL = u;
      localStorage.setItem('hav_device_user', 'Ashley Jerome');
      window.open = function () { return null; };
      window.__printed = ''; window.print = function () { var t = document.getElementById('print-target'); window.__printed = t ? t.innerHTML : ''; };
    }, SYNC);
    const vis = (sel) => p.locator(sel).first().isVisible().catch(() => false);
    const press = async (sel, what) => {
      const v = await vis(sel);
      ok(v, what + ' — on screen');
      if (v) { await p.locator(sel).first().click({ timeout: 5000 }); await p.waitForTimeout(700); }
      return v;
    };
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const fill = async (id, v) => { await p.fill('#' + id, v); };

    // An active Home Transition, signed and funded, with nothing recorded on the card yet.
    await p.evaluate(([MM, T0]) => {
      jobs.unshift({ id: MM, hvlId: 'HVL-2610-M811', name: 'Ruth Adler', fname: 'Ruth', lname: 'Adler', svc: 'downsizing_move', addr: '200 Seaview Ave', city: 'Palm Beach',
        email: 'ruth@example.com', phone: '(561) 555-0100', sqft: '3200', beds: '3', baths: '2', propVal: '4200000', status: 'active', won: true, wonAt: '2026-09-24', start: '2026-10-06',
        activatedOn: '2026-10-05', tc: 'Ashley Jerome', agrApproved: true, agrSent: true, agrSigned: true,
        docState: { estimate: { sentAt: '2026-09-24T14:00:00Z' }, agreement: { sentAt: '2026-09-26T14:00:00Z', sig: { signedBy: 'Ruth Adler', signedAt: '2026-09-28' } } }, at: {},
        payments: [{ uid: 'p1', stage: 'deposit', amount: 7325, receivedOn: '2026-10-01', method: 'wire', clearedOn: '2026-10-01' }],
        driveFolder: 'https://drive.google.com/drive/folders/f1' });
      estimateStore[MM] = { approved: true, submitted: true, approvedBy: 'Anthony Graziano', approvedAt: 'September 23, 2026', savedAt: T0,
        estimate: { jobId: MM, svc: 'downsizing_move', havellinTotal: 14650, grandTotal: 14650, totTC: 40, totPS: 60, tcRate: 150, psRate: 100, tcFee: 6000, psFee: 6000, days: 5,
          vendors: [], prepItems: [], pkgCost: 0, collections: [], psSlots: [], rooms: [{ idx: 0, name: 'Living Room', st: 'in', vol: 3, cplx: 3 }] } };
      saveJobs(); localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore));
      _logsState = 'ready';
    }, [MM, T0]);

    // The Job Plan, through the real nav; the card on Before Day 1.
    const plan = async () => {
      await p.evaluate((id) => { setCurrentJob(id); }, MM);
      await p.click('.nb[onclick*="\'job-plan\'"]'); await p.waitForTimeout(900);
      const cur = await p.evaluate(() => { const el = document.querySelector('#plan-job'); return el ? el.value : ''; });
      if (String(cur) !== String(MM)) { await p.selectOption('#plan-job', String(MM)); await p.waitForTimeout(900); }
    };
    await plan();
    ok(await vis('#plan-access-' + MM), 'the Keys & access card is on the Job Plan');
    const inStage = await p.evaluate((id) => { const el = document.getElementById('plan-access-' + id); return !!(el && el.closest('#stage-p0')); }, MM);
    ok(inStage, 'inside the Before Day 1 stage');

    // Record what we received: a front door key ×2 and the alarm code, from Ruth, taken by the device's user.
    await press('#plan-access-' + MM + ' button[onclick*="\'receive\'"]', 'Record what we received');
    eq(await p.inputValue('#acc-to'), 'Ashley Jerome', 'taken by: the device\'s user, filled in');
    await fill('acc-from', 'Ruth Adler');
    await p.selectOption('#acc-kind-1', 'key'); await fill('acc-label-1', 'front door'); await fill('acc-qty-1', '2');
    await press('#acc-rows-wrap button[onclick*="accessAddRow"]', '+ Another item');
    await p.selectOption('#acc-kind-2', 'code'); await fill('acc-label-2', 'alarm'); await fill('acc-code-2', '4521');
    await fill('acc-to', '');
    await press('#acc-save-btn', 'Record (with nobody taking them)');
    has(await p.evaluate(() => document.getElementById('acc-fb').textContent), 'who took it for Havellin', 'refused by name in the dialog');
    await fill('acc-to', 'Ashley Jerome');
    await press('#acc-save-btn', 'Record');
    let card = await p.evaluate((id) => document.getElementById('plan-access-' + id).innerHTML, MM);
    eq((card.match(/Held by <strong>Ashley Jerome<\/strong>/g) || []).length, 2, 'both items read held by Ashley Jerome');
    has(card, 'front door ×2', 'the key with its quantity');
    has(card, 'Code: <strong>4521</strong>', 'the code is on its item, readable (Q72)');
    has(card, '2 received \u00b7 0 returned to the client \u00b7 2 held by Ashley Jerome', 'the count line');
    const ids = await p.evaluate((id) => jobs.find((j) => j.id === id).accessItems.map((i) => String(i.id)), MM);
    eq(ids.length, 2, 'two items on the job');

    // Close job on the band is refused while they are held.
    dialogs.length = 0;
    await press('#jband-slot-plan button[onclick*="activateOrCycle(' + MM + ')"]', '■ Close job');
    has(dialogs.join('\n'), 'Return every key and access item to the client', '⚠⚠ Close job is refused while an item is held');
    has(dialogs.join('\n'), 'front door ×2: held by Ashley Jerome', 'naming the item and its holder');
    eq(await p.evaluate((id) => jobs.find((j) => j.id === id).status, MM), 'active', 'the job stays active');

    // The alarm code goes missing: red on the card and on the client dashboard (Q74).
    await press('.acc-item[data-access="' + ids[1] + '"] button[onclick*="\'lost\'"]', 'Mark lost on the alarm code');
    await press('#acc-save-btn', 'Record it as lost (no explanation)');
    has(await p.evaluate(() => document.getElementById('acc-fb').textContent), 'what happened', 'refused without the explanation');
    await fill('acc-note', 'written on a card that went in the shredding');
    await press('#acc-save-btn', 'Record it as lost');
    card = await p.evaluate((id) => document.getElementById('plan-access-' + id).innerHTML, MM);
    has(card, 'pl-red', 'the card carries a red line');
    has(card, 'Access item lost: alarm', 'naming the item');
    const red = await p.evaluate((id) => { const el = document.querySelector('#plan-access-' + id + ' .pl-red .pl-lbl'); return el ? getComputedStyle(el).color : ''; }, MM);
    ok(/rgb\((1\d\d|2\d\d), /.test(red), 'and it is painted red (' + red + ')');
    await p.evaluate((id) => { showPanel('jobs', document.querySelector('.nb[onclick*="\'jobs\'"]')); openClientDashboard(id); }, MM); await p.waitForTimeout(800);
    ok(await vis('#dash-access-' + MM), 'the client dashboard carries the Keys & access card');
    const dash = await p.evaluate((id) => document.getElementById('dash-access-' + id).innerHTML, MM);
    has(dash, 'pl-red', 'red there too');
    has(dash, '1 lost', 'with the count');
    await press('#dash-access-' + MM + ' button[onclick*="goToAccessCard"]', 'Open Keys & access (from the dashboard)');
    ok(await vis('#plan-access-' + MM), 'lands on the card');

    // Return the key; the close goes through, wipes the code and files the record.
    await press('#plan-access-' + MM + ' > .fos-acts button[onclick*="\'return\'"]', 'Return to client');
    eq(await p.inputValue('#acc-to'), 'Ruth Adler', 'to the client by default');
    eq(await p.isChecked('#acc-tick-' + ids[0]), true, 'the held key is pre-ticked');
    await press('#acc-save-btn', 'Record the return');
    card = await p.evaluate((id) => document.getElementById('plan-access-' + id).innerHTML, MM);
    has(card, 'Returned to <strong>Ruth Adler</strong>', 'the key is back with the client');
    await plan();
    dialogs.length = 0;
    await press('#jband-slot-plan button[onclick*="activateOrCycle(' + MM + ')"]', '■ Close job (again)');
    await p.waitForTimeout(1200);
    lacks(dialogs.join('\n'), 'Return every key', 'a lost item with its explanation does not block the close');
    eq(await p.evaluate((id) => jobs.find((j) => j.id === id).status, MM), 'closed', 'the job closed');
    const after = await p.evaluate((id) => { const j = jobs.find((x) => x.id === id); return { codes: j.accessItems.map((i) => i.code || ''), cleared: j.accessEvents.filter((e) => e.kind === 'code_cleared').length, filed: !!(j.docState.accessRecord && j.docState.accessRecord.filedAt) }; }, MM);
    eq(after.codes, ['', ''], '⚠⚠ Q72: the digits are wiped as the job closes');
    eq(after.cleared, 1, 'with an entry on the history');
    ok(after.filed, 'the custody record was filed to Drive as the job closed');
    const up = uploads.filter((u) => /Key and Access Custody Record/.test(u.filename))[0];
    ok(!!up, 'under its undated name');
    lacks(up ? up.html : '4521', '4521', 'and the filed page carries no digits');

    // The printed record, from the card.
    await plan();
    await press('#plan-access-' + MM + ' button[onclick*="printAccessRecord("]', 'Print the custody record');
    await p.waitForTimeout(800);
    const printed = await p.evaluate(() => window.__printed || '');
    ok(printed.length > 500, 'printed (' + printed.length + ' chars)');
    const plain = printed.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    has(plain, 'Key and Access Custody Record', 'its title');
    has(plain, 'returned to Ruth Adler', 'the key\'s return');
    has(plain, 'written on a card that went in the shredding', 'the lost item\'s explanation');
    has(plain, 'cleared at close', 'the code reads cleared at close');
    lacks(plain, '4521', '⚠⚠ never the digits');

    eq(await overflow(), 0, 'no horizontal overflow at 1440');
    await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(500);
    ok((await overflow()) <= 0, 'no horizontal overflow on the Job Plan with the card at 390');
    await press('#plan-access-' + MM + ' button[onclick*="\'receive\'"]', 'the receipt dialog on a phone');
    ok((await overflow()) <= 0, 'no horizontal overflow with the dialog open at 390');
    await press('#acc-modal button[onclick*="closeAccessDialog"]', 'Cancel');
    eq(errs, [], 'no page errors');
  } catch (e) { fail++; console.log('step81 CRASH ' + (e && e.stack || e)); }
  if (b) await b.close();
  console.log(`step81: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
