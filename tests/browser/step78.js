// Step 78 — The triage bar, 2026-10-13: what the job-flow audit and the core-jobs run found and left open, pressed as a
// person presses it (tests/triage-2026-10-13.test.js drives each rule; this step proves the joins on the real page).
//
//   A. a walkaway's one rail row names what is kept and the refund due, and agrees with the Walkaway settlement card;
//      Record refund through the real dialog, and the row names what is kept
//   B. a Home Prep second invoice sent before the vendors are booked goes, and its notice says how many are unbooked
//   C. the desk's More ▾ menu stays open while a Reviewed tick redraws the desk, and stays closed once closed
//   D. the Court Inventory, from that menu, prints *not stated* for a valued line with no basis
//   E. the hours log refuses a date after today by name and writes nothing; today's entry saves
//   F. Build Estimate on a fee-only Home Prep shows no concierge fee, specialist fee or materials row
//   G. overflow at 1440 and 390 (the walkaway's dashboard, the desk with the menu open, the Job Plan); no page errors
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step78.js [/abs/path/to/havellin.html]
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
const WALK = 7801, PREP = 7802, EST = 7803;

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
    const net = { posts: 0 };
    await ctx.route(SYNC + '**', async (r) => {
      const req = r.request();
      const json = (o) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
      if (req.method() === 'POST') { net.posts++; return json({ ok: true }); }
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
    await p.evaluate((u) => {
      SHEETS_SYNC_URL = u;
      window.open = function () { return null; };
      // The print dialog: keep what was handed to it (the real _printDocument clears the target afterwards).
      window.__printed = ''; window.print = function () { var t = document.getElementById('print-target'); window.__printed = t ? t.innerHTML : ''; };
      // A Gmail draft that lands at once, so the send's notice is the app's own words and nothing navigates away.
      gmailCreateDraft = function (mime, cb) { cb(true, { draftId: 'd-78' }); };
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
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const widest = () => p.evaluate(() => {
      const w = document.documentElement.clientWidth; let out = [];
      document.querySelectorAll('body *').forEach((el) => { const r = el.getBoundingClientRect(); if (r.right > w + 1 && r.width > 0 && el.checkVisibility()) out.push(el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : '') + ' right=' + Math.round(r.right)); });
      return out.slice(0, 6);
    });
    const dash = async (id) => { await p.evaluate((id) => { showPanel('jobs', document.querySelector('.nb[onclick*="\'jobs\'"]')); openClientDashboard(id); }, id); await p.waitForTimeout(800); };
    const desk = async (id) => {
      await p.evaluate((id) => { setCurrentJob(id); populateInventorySelect(); }, id);
      await p.click('.nb[onclick*="\'inventory\'"]'); await p.waitForTimeout(900);
      const cur = await p.evaluate(() => { const el = document.querySelector('#inv-job'); return el ? el.value : ''; });
      if (String(cur) !== String(id)) { await p.selectOption('#inv-job', String(id)); await p.waitForTimeout(900); }
    };
    const dashText = () => p.evaluate(() => { const el = document.querySelector('#client-dashboard-view'); return el ? el.textContent.replace(/\s+/g, ' ') : ''; });

    // ── Seed ────────────────────────────────────────────────────────────────────
    sheet = await p.evaluate(([WALK, PREP, EST, T0]) => {
      const signed = { city: 'Palm Beach', zip: '33480', status: 'active', won: true, wonAt: '2026-09-25', approved: true, tc: 'Ashley Jerome', created: '2026-09-20',
        start: '2026-10-06', activatedOn: '2026-10-05', estimateSentDate: 'September 24, 2026', agrApproved: true, agrApprovedBy: 'Anthony Graziano', agrSent: true, agrSigned: true,
        docState: { estimate: { sentAt: '2026-09-24T14:00:00Z' }, agreement: { sentAt: '2026-09-26T14:00:00Z', sig: { signedBy: 'Client', signedAt: '2026-09-28' } },
                    'invoice:deposit': { sentAt: '2026-09-29T14:00:00Z', asked: 5000 } }, at: {} };
      const rooms = [{ idx: 0, name: 'Living Room', st: 'in', vol: 3, cplx: 3 }, { idx: 1, name: 'Kitchen', st: 'in', vol: 3, cplx: 3 }];
      // An hourly walkaway: $9,000 in, 10 concierge and 20 specialist hours worked ($3,500), so the deposit is what is earned.
      jobs.unshift(Object.assign({}, signed, { id: WALK, hvlId: 'HVL-2610-W801', name: 'Gone Client', fname: 'Gone', lname: 'Client', svc: 'home_cleanout', addr: '2 B St',
        email: 'gone@example.com', status: 'closed_retained', lostAt: '2026-10-07T12:00:00Z', lostReason: 'client_ended', lostReasonLabel: 'Client ended the engagement',
        estimateSentTotal: 10000, acceptedTotal: 10000,
        payments: [{ id: 1, uid: 'w1', stage: 'deposit', amount: 5000, receivedOn: '2026-09-29', method: 'wire', clearedOn: '2026-09-29' },
                   { id: 2, uid: 'w2', stage: 'midpoint', amount: 4000, receivedOn: '2026-10-03', method: 'wire', clearedOn: '2026-10-03' }] }));
      estimateStore[WALK] = { approved: true, submitted: true, approvedBy: 'Anthony Graziano', approvedAt: 'September 23, 2026', savedAt: T0,
        estimate: { jobId: WALK, svc: 'home_cleanout', havellinTotal: 10000, grandTotal: 10000, totTC: 40, totPS: 40, tcRate: 150, psRate: 100, tcFee: 6000, psFee: 4000,
          days: 4, vendors: [], prepItems: [], pkgCost: 0, rooms: rooms } };
      jobLogs[WALK] = [{ id: 1, date: '2026-10-02', members: [{ role: 'TC', name: 'Ashley Jerome', hours: 10 }, { role: 'PS', name: 'Sam Reyes', hours: 20 }] }];
      // An active Home Prep, fee-only, one of three vendors confirmed.
      jobs.unshift(Object.assign({}, signed, { id: PREP, hvlId: 'HVL-2610-P802', name: 'Pat Butler', fname: 'Pat', lname: 'Butler', svc: 'prep', addr: '3 C St', email: 'pat@example.com',
        estimateSentTotal: 4620, acceptedTotal: 4620, prepSourcing: { Lpv1: { status: 'Confirmed' }, Lpv2: { status: 'Quote received' }, Lpv3: { status: 'To contact' } },
        docState: Object.assign({}, signed.docState, { 'invoice:deposit': { sentAt: '2026-09-29T14:00:00Z', asked: 2310 } }),
        payments: [{ uid: 'q1', stage: 'deposit', amount: 2310, receivedOn: '2026-10-01', method: 'wire', clearedOn: '2026-10-01' }] }));
      estimateStore[PREP] = { approved: true, submitted: true, approvedBy: 'Anthony Graziano', approvedAt: 'September 23, 2026', savedAt: T0,
        estimate: { jobId: PREP, svc: 'prep', havellinTotal: 4620, grandTotal: 20020, totTC: 0, totPS: 0, tcRate: 150, psRate: 100, tcFee: 0, psFee: 0, prepEnabled: true, vendors: [], rooms: [],
          prepItems: [{ id: 'pv1', lid: 'pv1', type: 'Full Interior Paint', cost: 9800 }, { id: 'pv2', lid: 'pv2', type: 'Landscaping', cost: 3200 }, { id: 'pv3', lid: 'pv3', type: 'Handyman Services', cost: 2400 }],
          prepCost: 15400, prepFee: 4620, pkgCost: 0, smf: 0, discountPct: 0, rush: false, fixedPrice: false, collections: [], vehicles: [], sqft: 3500, propVal: 1500000 } };
      // A probate estate on the desk, with two valued lines: one with a basis, one without; its crew confirmed, its deposit wired.
      jobs.unshift(Object.assign({}, signed, { id: EST, hvlId: 'HVL-2610-E803', name: 'Harold Brennan', fname: 'Harold', lname: 'Brennan', svc: 'probate', addr: '1180 N Lake Way',
        executor: 'Michael Brennan', executorRole: 'Personal Representative', executorPhone: '(561) 555-0103', executorEmail: 'mb@example.com', deathDate: '2026-06-02', executorAuth: 'received',
        matterType: 'probate', probateCase: '50-2026-CP-004412', docTier: 'values', docLevel: 'formal', estimateSentTotal: 49000, acceptedTotal: 49000,
        crew: { tc: { name: 'Ashley Jerome', locked: true }, tc2: { name: '', locked: false }, ps: [{ name: 'Sam Reyes', locked: true }], confirmed: true, confirmedAt: '2026-10-04' },
        payments: [{ uid: 'p4', stage: 'deposit', amount: 24500, receivedOn: '2026-10-01', method: 'wire', clearedOn: '2026-10-01' }],
        driveFolder: 'https://drive.google.com/drive/folders/f1', driveSubfolders: { 'Estate Inventory': 'sf1', 'As-Found Record': 'sf2' } }));
      estimateStore[EST] = { approved: true, submitted: true, approvedBy: 'Anthony Graziano', approvedAt: 'September 23, 2026', savedAt: T0,
        estimate: { jobId: EST, svc: 'probate', havellinTotal: 49000, grandTotal: 49000, fixedPrice: true, fixedAmount: 49000, fixedLines: true, totTC: 120, totPS: 200, tcRate: 150, psRate: 100,
          tcFee: 18000, psFee: 20000, days: 10, vendors: [], prepItems: [], pkgCost: 0, collections: [], psSlots: [{ tier: 'contractor_standard', name: 'Sam Reyes' }],
          rooms: [{ idx: 0, name: 'Living Room', st: 'in', vol: 3, cplx: 3 }] } };
      const line = (id, over) => Object.assign({ stableId: id, label: 'inventory', roomIdx: 0, seq: 1, status: 'uploaded', category: 'Furniture', disposition: 'Keep', namedBy: 'desk',
        ts: T0, updatedAt: T0, filename: 'HVL-2610-E803_Living Room_INV_' + id + '.jpg', driveFileId: 'f-' + id, driveFileUrl: 'https://drive.google.com/file/d/f-' + id + '/view' }, over);
      _photoRefs[EST] = [line('a1', { itemNo: 1, objectName: 'Walnut desk', fmv: '1200', valSource: '', namedBy: 'agent', reviewed: false }),
                         line('a2', { itemNo: 2, objectName: 'Wing chair', fmv: '300', valSource: 'Appraisal', apprId: 'ap1' })];
      savePhotoRefs(EST);
      saveJobs(); localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore));
      _logsState = 'ready';
      const back = JSON.parse(localStorage.getItem('hav_media_' + EST) || '[]');
      return { [EST]: { items: back } };
    }, [WALK, PREP, EST, T0]);

    await section('A. the walkaway\'s one row names what is kept and the refund due, and the dialog records the refund', async () => {
      await dash(WALK);
      const row = await p.evaluate(() => { const r = [...document.querySelectorAll('#client-dashboard-view .jt-row')].find((x) => /deposit retained/i.test(x.textContent)); return r ? r.textContent.replace(/\s+/g, ' ').trim() : ''; });
      has(row, 'Closed — deposit retained', 'the terminal row');
      has(row, '$5,000 retained · $4,000 refund due', '⚠⚠ it names what is kept and what goes back, never $9,000 retained');
      lacks(row, '$9,000', 'the whole sum is not claimed');
      const card = await txt('#jt-settle-' + WALK);
      has(card, 'Walkaway settlement', 'the card under it');
      has(card, '$4,000', 'agrees on the refund due');
      has(card, '$5,000', 'and on what was earned');
      const btn = '#client-dashboard-view button[onclick*="openRefundModal("]';
      await press(btn, 'Record refund');
      ok(await vis('#refund-modal'), 'the refund dialog opened');
      eq(await p.evaluate(() => document.getElementById('rf-amount').value), '4000', 'opened on the amount due');
      await p.selectOption('#rf-method', { index: 1 }).catch(() => {});
      await p.fill('#rf-payee', 'Gone Client');
      await press('#refund-modal button[onclick*="saveRefund("]', 'the dialog\'s Record refund');
      const rec = await p.evaluate((id) => (jobs.find((j) => j.id === id).payments || []).filter((x) => x.stage === 'refund').map((x) => x.amount), WALK);
      eq(rec, [4000], 'the refund is recorded on the payments list');
      const after = await p.evaluate(() => { const r = [...document.querySelectorAll('#client-dashboard-view .jt-row')].find((x) => /deposit retained/i.test(x.textContent)); return r ? r.textContent.replace(/\s+/g, ' ').trim() : ''; });
      has(after, '$5,000 retained', 'the row now names what is kept');
      lacks(after, 'refund due', 'and nothing more is due');
    });

    await section('B. a Home Prep second invoice sent before the vendors are booked goes, and the notice says so', async () => {
      await dash(PREP);
      const band = await txt('#client-dashboard-view .jt-next') || await dashText();
      has(band, 'Book the vendors', 'the band says to book the vendors (1 of 3 confirmed)');
      const send = '#client-dashboard-view button[onclick*="docAction(' + PREP + ",'invoice','send'" + '"][onclick*="midpoint"]';
      const n = await p.locator(send).count();
      ok(n >= 1, 'the send is offered as an outline beside it (' + n + ')');
      await press(send, '✉ Send second invoice — once the vendors are confirmed');
      await p.waitForTimeout(1500);
      const text = await dashText();
      has(text, 'Draft created', 'the draft was made');
      has(text, 'Sent before every preparation vendor is booked: 1 of 3 confirmed on the Job Plan.', '⚠⚠ and the notice names the vendors still unbooked');
      const st = await p.evaluate((id) => (jobs.find((j) => j.id === id).docState || {})['invoice:midpoint'] || null, PREP);
      ok(!!(st && st.draftedAt), 'the send is recorded (never refused)');
    });

    await section('C. More ▾ stays open across a desk redraw, and closed once closed', async () => {
      await desk(EST);
      const isOpen = () => p.evaluate(() => { const d = document.getElementById('inv-more'); return d ? !!d.open : null; });
      eq(await isOpen(), false, 'the menu draws closed');
      await press('#inv-more > summary', 'More ▾');
      eq(await isOpen(), true, 'open');
      ok(await vis('button[onclick*="printCourtInventory("]'), 'the Court Inventory is under it');
      const box = 'input[type="checkbox"][onchange*="_invSetReviewed(' + EST + ",'a1'" + '"]';
      await press(box, 'Reviewed on the agent-named line (redraws the desk)');
      eq(await p.evaluate((id) => (_photoRefs[id] || []).find((r) => r.stableId === 'a1').reviewed, EST), true, 'fixture: the tick landed and the desk redrew');
      eq(await isOpen(), true, '⚠⚠ the menu is still open after the redraw');
      await press('#inv-more > summary', 'More ▾ again, to close it');
      eq(await isOpen(), false, 'closed');
      await press(box, 'Reviewed off again');
      eq(await isOpen(), false, 'and it stays closed through that redraw');
    });

    await section('D. the Court Inventory prints *not stated* for a valued line with no basis', async () => {
      await press('#inv-more > summary', 'More ▾');
      await press('button[onclick*="printCourtInventory("]', 'Court Inventory');
      await p.waitForTimeout(800);
      const printed = await p.evaluate(() => window.__printed || '');
      ok(printed.length > 2000, 'the schedule printed (' + printed.length + ' chars)');
      has(printed, '<span style="color:#A32D2D;">not stated</span>', '⚠⚠ the desk line with no basis reads not stated, in red');
      has(printed, '>appraisal</td>', 'the appraised line names its basis');
      const plain = printed.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      has(plain, 'Walnut desk', 'both lines are on it');
      has(plain, 'Wing chair', '…');
    });

    await section('E. the hours log refuses a date after today, by name, and writes nothing', async () => {
      await p.evaluate((j) => openJobPlanFor(j), EST); await p.waitForTimeout(2000);
      await p.evaluate(() => { if (!_planOpenPhases.hours) togglePhase('hours'); }); await p.waitForTimeout(600);
      ok(await vis('#btn-save-hours'), 'Save Hours Entry is on screen');
      const today = await p.evaluate(() => _todayStr());
      const tomorrow = new Date(today + 'T12:00:00Z'); tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      const tmr = tomorrow.toISOString().slice(0, 10);
      await p.fill('#log-date', tmr);
      await p.fill('#log-m0-hrs', '1');
      const before = await p.evaluate((id) => (jobLogs[id] || []).length, EST);
      await press('#btn-save-hours', 'Save Hours Entry (tomorrow)');
      has(await txt('#log-fb'), 'That date is after today. Hours are logged for days already worked.', '⚠⚠ refused by name');
      eq(await p.evaluate((id) => (jobLogs[id] || []).length, EST), before, 'and nothing was written');
      await p.fill('#log-date', today);
      await p.fill('#log-m0-hrs', '1');
      await press('#btn-save-hours', 'Save Hours Entry (today)');
      eq(await p.evaluate((id) => (jobLogs[id] || []).length, EST), before + 1, 'today\'s entry saves');
      lacks(await txt('#log-fb'), 'after today', 'with no word about the date');
    });

    await section('F. Build Estimate on a fee-only Home Prep shows no $0 fee rows', async () => {
      await dash(PREP);
      await p.evaluate((id) => openEstimateScreen(id), PREP); await p.waitForTimeout(1500);
      const disp = (id) => p.evaluate((id) => { const el = document.getElementById(id); return el ? getComputedStyle(el).display : 'missing'; }, id);
      eq([await disp('s-tc-fee-row'), await disp('s-ps-fee-row'), await disp('s-pkg-row')], ['none', 'none', 'none'], '⚠⚠ the concierge fee, specialist fee and materials rows are hidden');
      eq(await disp('s-prep-fee-row'), 'table-row', 'the Home Sale Preparation Fee row shows');
      has(await txt('#s-prep-fee'), '$4,620', 'at 30% of the quotes');
      has(await txt('#s-havellin'), '$4,620', 'and the services subtotal is the fee');
    });

    await section('G. overflow at 1440 and 390; no page errors', async () => {
      await dash(WALK);
      ok(await overflow() <= 0, 'the walkaway\'s dashboard fits at 1440 (' + await overflow() + ')');
      await desk(EST);
      await press('#inv-more > summary', 'More ▾');
      ok(await overflow() <= 0, 'the desk with the menu open fits at 1440 (' + await overflow() + ')');
      await p.setViewportSize({ width: 390, height: 844 });
      await dash(WALK);
      ok(await overflow() <= 0, 'the walkaway\'s dashboard fits at 390 (' + await overflow() + ')');
      await desk(EST);
      const o = await overflow();
      ok(o <= 0, 'the desk fits at 390 (' + o + ')' + (o > 0 ? ' widest: ' + JSON.stringify(await widest()) : ''));
      await p.evaluate((j) => openJobPlanFor(j), EST); await p.waitForTimeout(1500);
      ok(await overflow() <= 0, 'the Job Plan fits at 390 (' + await overflow() + ')');
      eq(errs, [], 'no page errors');
    });
  } catch (e) {
    fail++; console.log('  ✗ threw: ' + String(e && e.message || e).split('\n')[0]);
  } finally {
    if (b) await b.close().catch(() => {});
    console.log('  step78: ' + pass + ' passed, ' + fail + ' failed');
    process.exit(fail ? 1 : 0);
  }
})();
