// Step 72 — P25 group 1, the papers and the money (2026-10-09): Anthony's answers to the job-flow audit's questions, as a
// person meets them, through the real controls.
//
//   A. intake: typing a Palm Beach case number fills the Court (Q53), and a court typed by hand stays
//   B. Build Estimate: a probate plan that ends after the §733.604 deadline is flagged under the projected completion (Q33)
//   C. a Home Prep change order opens on no reason, refuses a save without one, and offers Home Prep's own (Q54)
//   D. Home Prep's second invoice waits on the vendor booking: the band books the vendors on the Job Plan (Q56)
//   E. a walkaway's Deposit Retained card offers the final for the work done, which settles, and a refund above what is
//      due needs its reason (Q49)
//   F. the desk: a living family's Contents Record card (no ledger with nothing sold), its record saying "Disposed of" and
//      carrying the sign-off (Q51); an estate's guardrail saying an appraisal is in progress (Q36); the release request as
//      the firearms' transport authority under one initial (Q35)
//   G. overflow at 1440 and 390; no page errors
//
//   NODE_PATH=/opt/node22/lib/node_modules node tests/browser/step72.js [/abs/path/to/havellin.html]
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
const EST = 7201, WALK = 7202, PREP = 7203, LIVE = 7204, BUILD = 7205;
const PB_COURT = 'Circuit Court for Palm Beach County, Florida, Probate Division';

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
    await ctx.route(SYNC + '**', async (r) => {
      const json = (o) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
      if (r.request().method() === 'POST') return json({ ok: true });
      return json({ ok: true });
    });
    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    const dialogs = [];
    p.on('dialog', async (d) => { dialogs.push(d.type() + ': ' + d.message()); await d.accept(); });
    await p.goto(APP); await p.waitForTimeout(1600);
    await p.evaluate(() => {
      window.open = function () { return null; };
      window.gmailCreateDraft = function (mime, cb) { cb(true, { draftId: 'd1', messageId: 'm1' }); };
      window.sendInternalEmail = function () {};
      window.__prints = [];
      window.print = function () { const pt = document.getElementById('print-target'); window.__prints.push(pt ? pt.innerHTML : ''); };
    });

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
    const dash = async (id) => { await p.evaluate((id) => { showPanel('jobs', document.querySelector('.nb[onclick*="\'jobs\'"]')); openClientDashboard(id); }, id); await p.waitForTimeout(700); };
    const toDesk = async (id) => {
      await p.evaluate((id) => { setCurrentJob(id); populateInventorySelect(); }, id);
      await p.click('.nb[onclick*="\'inventory\'"]'); await p.waitForTimeout(800);
      const sel = await val('#inv-job');
      if (String(sel) !== String(id)) { await p.selectOption('#inv-job', String(id)); await p.waitForTimeout(800); }
    };

    // ── Seed ────────────────────────────────────────────────────────────────
    await p.evaluate(([EST, WALK, PREP, LIVE, BUILD, T0, SYNC]) => {
      const signed = { agrApproved: true, agrSent: true, agrSigned: true, approved: true, won: true, wonAt: '2026-09-25', created: '2026-09-20',
        walkthrough: '2026-09-22', estimateSentDate: 'September 24, 2026', tc: 'Ashley Jerome', city: 'Palm Beach', zip: '33480',
        docState: { estimate: { sentAt: '2026-09-24T14:00:00Z' }, agreement: { sentAt: '2026-09-26T14:00:00Z', sig: { signedBy: 'Client', signedAt: '2026-09-28' } },
          'invoice:deposit': { sentAt: '2026-09-29T14:00:00Z' } } };
      const item = (job, id, o) => Object.assign({ stableId: id, label: 'inventory', roomIdx: 0, seq: 1, status: 'uploaded', category: 'Furniture',
        disposition: '', objectName: 'Line ' + id, ts: T0, updatedAt: T0, filename: 'HVL_' + job + '_INV_' + id + '.jpg', driveFileId: 'f-' + id }, o);
      const rooms = [{ idx: 0, name: 'Living Room', st: 'in', vol: 3, cplx: 3 }];
      // An active probate estate: an appraiser linked to a painting with no report yet, and firearms awaiting written authority.
      jobs.unshift(Object.assign({}, signed, { id: EST, hvlId: 'HVL-2610-E201', name: 'Harold Whitcombe', svc: 'probate', matterType: 'probate',
        addr: '69 Beach Blvd', executor: 'Thomas Whitcombe', executorRole: 'Personal Representative', executorEmail: 't@example.com',
        deathDate: '2026-04-02', executorAuth: 'received', probateCase: '50-2026-CP-001234', docTier: 'values', gate706: 'yes', status: 'active',
        activatedOn: '2026-10-05', start: '2026-10-06', appraisers: [{ id: 'ap1', name: 'M. Wayland', firm: 'Wayland Fine Art' }],
        payments: [{ uid: 'p1', stage: 'deposit', amount: 20000, receivedOn: '2026-10-01', method: 'wire', clearedOn: '2026-10-01' }] }));
      estimateStore[EST] = { approved: true, submitted: true, approvedBy: 'Anthony Graziano', approvedAt: 'September 23, 2026', savedAt: T0,
        estimate: { jobId: EST, svc: 'probate', havellinTotal: 40000, fixedPrice: true, fixedAmount: 40000, fixedLines: true, totTC: 100, totPS: 150,
          tcRate: 150, psRate: 100, days: 8, vendors: [], prepItems: [], pkgCost: 0, rooms: rooms } };
      _photoRefs[EST] = [
        item(EST, 'art', { itemNo: 1, objectName: 'Oil on canvas, harbor scene', category: 'Art & Décor', fmv: '6500', valSource: 'Auction comps', valuedBy: 'agent', apprId: 'ap1', disposition: 'Auction', channel: 'Christie\'s' }),
        item(EST, 'g1', { itemNo: 2, objectName: 'Remington 870 shotgun', category: 'Firearms', serial: 'RS12345', disposition: 'Consign', channel: 'Palm Beach Arms (FFL)', fmv: '400' }),
        item(EST, 'g2', { itemNo: 3, objectName: 'Ruger revolver', category: 'Firearms', serial: '', disposition: 'Consign', channel: 'Palm Beach Arms (FFL)', fmv: '300' })];
      // An hourly walkaway: $9,000 in, 10 concierge and 20 specialist hours worked.
      jobs.unshift(Object.assign({}, signed, { id: WALK, hvlId: 'HVL-2610-W202', name: 'Gone Client', svc: 'home_cleanout', addr: '2 B St',
        email: 'gone@example.com', status: 'closed_retained', lostAt: '2026-10-07T12:00:00Z', lostReason: 'client_ended', lostReasonLabel: 'Client ended the engagement',
        payments: [{ id: 1, uid: 'w1', stage: 'deposit', amount: 5000, receivedOn: '2026-09-29', method: 'wire', clearedOn: '2026-09-29' },
                   { id: 2, uid: 'w2', stage: 'midpoint', amount: 4000, receivedOn: '2026-10-03', method: 'wire', clearedOn: '2026-10-03' }] }));
      estimateStore[WALK] = { approved: true, submitted: true, approvedBy: 'Anthony Graziano', approvedAt: 'September 23, 2026', savedAt: T0,
        estimate: { jobId: WALK, svc: 'home_cleanout', havellinTotal: 10000, totTC: 40, totPS: 40, tcRate: 150, psRate: 100, tcFee: 6000, psFee: 4000,
          days: 4, vendors: [], prepItems: [], pkgCost: 0, rooms: rooms } };
      jobLogs[WALK] = [{ id: 1, date: '2026-10-02', members: [{ role: 'TC', name: 'Ashley Jerome', hours: 10 }, { role: 'PS', name: 'Sam Reyes', hours: 20 }] }];
      _logsState = 'ready';
      // An active Home Prep job with one of two vendors confirmed.
      jobs.unshift(Object.assign({}, signed, { id: PREP, hvlId: 'HVL-2610-P203', name: 'Pat Butler', svc: 'prep', addr: '3 C St', email: 'pat@example.com',
        status: 'active', activatedOn: '2026-10-05', start: '2026-10-06', prepSourcing: { Lpv1: { status: 'Confirmed' }, Lpv2: { status: 'Quote received' } },
        payments: [{ uid: 'q1', stage: 'deposit', amount: 2250, receivedOn: '2026-10-01', method: 'wire', clearedOn: '2026-10-01' }] }));
      estimateStore[PREP] = { approved: true, submitted: true, approvedBy: 'Anthony Graziano', approvedAt: 'September 23, 2026', savedAt: T0,
        estimate: { jobId: PREP, svc: 'prep', havellinTotal: 4500, totTC: 0, totPS: 0, tcRate: 150, psRate: 100, prepEnabled: true, vendors: [], rooms: [],
          prepItems: [{ lid: 'pv1', type: 'Painter', cost: 10000 }, { lid: 'pv2', type: 'Landscaper', cost: 5000 }], prepCost: 15000, prepFee: 4500 } };
      // A living Home Cleanout with nothing sold.
      jobs.unshift(Object.assign({}, signed, { id: LIVE, hvlId: 'HVL-2610-L204', name: 'Jane Doe', svc: 'home_cleanout', addr: '4 D St', email: 'jane@example.com',
        status: 'active', activatedOn: '2026-10-05', start: '2026-10-06',
        payments: [{ uid: 'l1', stage: 'deposit', amount: 5000, receivedOn: '2026-10-01', method: 'wire', clearedOn: '2026-10-01' }] }));
      estimateStore[LIVE] = { approved: true, submitted: true, approvedBy: 'Anthony Graziano', approvedAt: 'September 23, 2026', savedAt: T0,
        estimate: { jobId: LIVE, svc: 'home_cleanout', havellinTotal: 10000, totTC: 40, totPS: 40, tcRate: 150, psRate: 100, days: 4, vendors: [], prepItems: [], pkgCost: 0, rooms: rooms } };
      _photoRefs[LIVE] = [item(LIVE, 'k1', { itemNo: 1, objectName: 'Broken chair', disposition: 'Junk', channel: 'Hauler' }),
                          item(LIVE, 'k2', { itemNo: 2, objectName: 'Dining table', disposition: 'Keep' })];
      // A probate estate at the walkthrough, with a §733.604 deadline the plan will run past.
      jobs.unshift({ id: BUILD, hvlId: 'HVL-2610-B205', name: 'Edith Crane', svc: 'probate', matterType: 'probate', addr: '5 E St', city: 'Palm Beach', zip: '33480',
        executor: 'Ann Crane', executorRole: 'Personal Representative', executorEmail: 'ann@example.com', deathDate: '2026-05-01',
        probateCase: '50-2026-CP-000777', lettersDate: '2026-08-20', probateDeadline: '2026-10-19', docTier: 'values', gate706: 'yes',
        status: 'new', created: '2026-09-20', walkthrough: '2026-09-22', start: '2026-10-14', tc: 'Ashley Jerome', sqft: '4000', payments: [] });
      estimateStore[BUILD] = { approved: false, submitted: false, savedAt: T0,
        estimate: { jobId: BUILD, svc: 'probate', havellinTotal: 30000, totTC: 80, totPS: 160, tcRate: 150, psRate: 100, days: 9, vendors: [], prepItems: [],
          pkgCost: 0, sqft: 4000, rooms: [{ idx: 0, name: 'Living Room', st: 'in', vol: 4, cplx: 4 }, { idx: 1, name: 'Kitchen', st: 'in', vol: 4, cplx: 4 }] } };
      [EST, LIVE].forEach((id) => savePhotoRefs(id));
      saveJobs(); localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore));
      SHEETS_SYNC_URL = SYNC;
    }, [EST, WALK, PREP, LIVE, BUILD, T0, SYNC]);

    // ── A ───────────────────────────────────────────────────────────────────
    await section('A. intake: a Palm Beach case number fills the Court, and a court typed by hand stays', async () => {
      await p.evaluate(() => showPanel('jobs', document.querySelector('.nb[onclick*="\'jobs\'"]'))); await p.waitForTimeout(500);
      await press('#btn-add-client', '+ Add New Client');
      await p.selectOption('#i-svc', 'probate'); await p.waitForTimeout(300);
      await p.selectOption('#i-matter-type', 'probate'); await p.waitForTimeout(300);
      ok(await vis('#i-probate-case'), 'the probate details are on screen');
      ok(await vis('#i-probate-court'), '⚠ with a Court field beside the deadline');
      await p.click('#i-probate-case'); await p.type('#i-probate-case', '50-2026-CP-004321', { delay: 15 });
      eq(await val('#i-probate-court'), PB_COURT, '⚠⚠ the Court fills from the case number');
      await p.fill('#i-probate-court', 'Fifteenth Judicial Circuit, Probate'); await p.dispatchEvent('#i-probate-court', 'input');
      await p.fill('#i-probate-case', ''); await p.type('#i-probate-case', '06-2026-CP-1', { delay: 15 });
      eq(await val('#i-probate-court'), 'Fifteenth Judicial Circuit, Probate', '…and a court typed by hand is left alone');
      await p.evaluate(() => { try { clearIntakeForm(); } catch (e) {} });
    });

    // ── B ───────────────────────────────────────────────────────────────────
    await section('B. Build Estimate flags a plan that ends after the §733.604 deadline', async () => {
      await dash(BUILD);
      // A saved draft: the band offers Submit, and ✎ Edit estimate reopens Build Estimate on it.
      await press('#client-dashboard-view button[onclick="dashEditEstimate(' + BUILD + ')"]', '✎ Edit estimate');
      await p.waitForTimeout(1200);
      ok(await vis('#e-court-deadline-flag'), '⚠⚠ the flag is on screen under the projected completion');
      const f = await txt('#e-court-deadline-flag');
      has(f, 'after the §733.604 inventory deadline of Oct 19, 2026', 'naming the deadline');
      has(f, 'add specialists, move the start, or confirm with counsel that an extension will be sought', '…and what to do about it');
    });

    // ── C ───────────────────────────────────────────────────────────────────
    await section('C. a Home Prep change order: no reason pre-picked, refused without one, Home Prep\'s own list', async () => {
      await dash(PREP);
      await press('#client-dashboard-view button[onclick="openChangeOrder(' + PREP + ')"]', '+ New change order');
      eq(await val('#co-reason'), '', '⚠⚠ the reason opens on nothing');
      const opts = await p.evaluate(() => Array.from(document.querySelectorAll('#co-reason option')).map((o) => o.value));
      eq(opts, ['', 'prep_hours', 'vendor_add', 'vendor', 'scope_remove', 'other'], 'Home Prep\'s own reasons behind the placeholder');
      await p.fill('#co-description', 'Clear the garage for the painter');
      await p.fill('#co-tc-hrs', '3');
      await press('#change-order-modal button[onclick="saveChangeOrder()"]', 'Create Change Order');
      has(await txt('#co-fb'), 'Choose the reason for this change order.', '⚠ refused without a reason');
      await p.selectOption('#co-reason', 'prep_hours');
      await press('#change-order-modal button[onclick="saveChangeOrder()"]', 'Create Change Order');
      eq(await p.evaluate((id) => changeOrders.filter((c) => c.jobId === id).map((c) => c.reason), PREP), ['prep_hours'], 'with one chosen it is saved');
    });

    // ── D ───────────────────────────────────────────────────────────────────
    await section('D. Home Prep\'s second invoice waits on the vendor booking; the band books the vendors', async () => {
      await dash(PREP);
      const band = await txt('#client-dashboard-view .jt-next');
      has(band, 'Book the prep vendors', '⚠⚠ the band says to book the vendors');
      has(await txt('#client-dashboard-view'), '1 of 2 prep vendors confirmed on the Job Plan', '…and counts them');
      await press('#client-dashboard-view button[onclick="openJobPlanFor(' + PREP + ',\'vendors\')"]', '▶ Book the vendors');
      await p.waitForTimeout(800);
      ok(await vis('#phase-body-vendors'), 'it opens the Job Plan on the vendors');
    });

    // ── E ───────────────────────────────────────────────────────────────────
    await section('E. a walkaway: the final for the work done, which settles; a refund above what is due needs its reason', async () => {
      await dash(WALK);
      const card = await txt('#jt-settle-' + WALK);
      ok(/Refund due\s*\$4,000/.test(card), 'the card: $4,000 of the $9,000 goes back  [got ' + card + ']');
      await press('#jt-settle-' + WALK + ' button[onclick="docAction(' + WALK + ',\'invoice\',\'view\',{stage:\'final\'})"]', 'View final invoice, on the card');
      await p.waitForTimeout(800);
      const doc = await txt('#doc-viewer-body');
      has(doc, 'Settlement — the engagement ended early', '⚠⚠ the final settles the walkaway');
      has(doc, 'Refund Due to You', '…with the refund due');
      has(doc, '$4,000', '…of $4,000');
      await p.evaluate(() => { try { closeDocViewer(); } catch (e) { const m = document.getElementById('doc-viewer-modal'); if (m) m.style.display = 'none'; } });
      await press('#jt-settle-' + WALK + ' button[onclick="openRefundModal(' + WALK + ')"]', 'Record refund');
      ok(await vis('#rf-reason'), 'the refund dialog asks for a reason');
      await p.fill('#rf-amount', '4500'); await p.fill('#rf-date', '2026-10-08'); await p.selectOption('#rf-method', 'check');
      await press('#rf-save-btn', 'Record refund');
      has(await txt('#rf-fb'), 'is more than the $4,000 due back on this job. Give the reason', '⚠⚠ above what is due: the reason first');
      await p.fill('#rf-reason', 'goodwill, agreed with the client');
      await press('#rf-save-btn', 'Record refund, with the reason');
      has(dialogs.slice(-1)[0] || '', 'Reason: goodwill, agreed with the client', 'it asks first, naming the reason');
      await dash(WALK);
      has(await txt('#jt-pays-' + WALK), 'goodwill, agreed with the client', 'the refund is on the payments list with its reason');
    });

    // ── F ───────────────────────────────────────────────────────────────────
    await section('F. the desk: the Contents Record a family signs; an appraisal in progress; the firearms\' authority', async () => {
      await toDesk(LIVE);
      ok(await vis('#inv-contents-card'), '⚠⚠ a living job\'s desk carries the Contents Record card');
      eq(await p.locator('#inv-ledger-card').count(), 0, '…and no ledger card, with nothing sold');
      await press('#inv-workbar button[onclick="printContentsRecord(' + LIVE + ')"]', 'Contents Record');
      await p.waitForTimeout(500);
      const rec = await lastPrint();
      has(rec, 'Disposed of', '⚠ the family reads "Disposed of"');
      lacks(rec, 'Junk', '…never "Junk"');
      has(rec, 'Reviewed and accepted as the record of what stayed and what left the property', '⚠⚠ and signs it');
      await toDesk(EST);
      has(await txt('#inv-guardrail'), 'Appraisal in progress', '⚠⚠ a linked painting with no report reads as in progress, not appraised');
      await press('#inv-workbar button[onclick="printApprovalRequest(' + EST + ')"]', 'Approval Request');
      await p.waitForTimeout(500);
      const req = await lastPrint();
      has(req, 'Firearms: written authority', '⚠⚠ the request is the firearms\' transport authority');
      has(req, 'Initial once for all 2 firearms above', '…under one initial for the batch');
      has(req, 'Serial RS12345', 'each firearm by serial');
      has(req, 'not covered for transport', 'and the one with no serial is not covered');
      has(req, 'NOT YET APPRAISED', 'the painting is still not appraised on the request');
    });

    // ── G ───────────────────────────────────────────────────────────────────
    await section('G. overflow and page errors', async () => {
      ok(await overflow() <= 0, 'the desk fits at 1440 (' + await overflow() + ')');
      await p.setViewportSize({ width: 390, height: 844 });
      await dash(WALK);
      ok(await overflow() <= 0, 'the walkaway\'s dashboard fits at 390 (' + await overflow() + ')');
      await dash(PREP);
      ok(await overflow() <= 0, 'the Home Prep dashboard fits at 390 (' + await overflow() + ')');
      eq(errs, [], 'no page errors');
    });
  } catch (e) {
    fail++; console.log('  ✗ threw: ' + String(e && e.message || e).split('\n')[0]);
  } finally {
    if (b) await b.close().catch(() => {});
    console.log('  step72: ' + pass + ' passed, ' + fail + ' failed');
    process.exit(fail ? 1 : 0);
  }
})();
