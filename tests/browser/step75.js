// Step 75 — the core-jobs run (2026-10-10). Anthony: "run through a series of jobs again … confirm all workflows, app
// functionality, all paperwork … prioritize TC usability". Five whole jobs ran through the real controls; these are the
// fixes a person sees, pressed as a person presses them.
//
//   A. a finished hourly job whose payments exceed the work: the final (after the manager's PIN) settles, the deposit earned
//      and the rest due back; sending it turns the band's last step into the refund, Record refund opens the recorder on the
//      figure, and the refund recorded closes the step
//   B. Build Estimate with no home value on file saves, with the flag, instead of refusing and sending the concierge to Edit Client
//   C. a fee-only Home Prep's dashboard: the Hours Log card says no hours are billed and offers no log; no Offer discount
//   D. the desk: typing a buyer on a Sell line shows File pickup list at once; a line a person named and decided reads reviewed
//   E. the camera on an estate: a Donate shot takes the confirmed charity at capture; arming a collection drops the latched chip
//   F. overflow at 1440 and 390 (the dashboard, the desk with the appraisal guardrail); no page errors
//
//   NODE_PATH=/opt/node22/lib/node_modules node tests/browser/step75.js [/abs/path/to/havellin.html]
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
const J = 7501, P = 7502, E = 7503, N = 7504;

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
      args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
    await ctx.grantPermissions(['camera']).catch(() => {});
    let sheet = {}; let uploads = 0;
    await ctx.route(SYNC + '**', async (r) => {
      const req = r.request();
      const json = (o) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
      if (req.method() === 'POST') {
        let body = {}; try { body = JSON.parse(req.postData() || '{}'); } catch (e) {}
        if (body.action === 'uploadFile') { uploads++; return json({ ok: true, fileUrl: 'https://drive.google.com/file/d/u' + uploads + '/view', fileId: 'u' + uploads }); }
        if (body.action === 'uploadHtml') return json({ ok: true, fileUrl: 'https://drive.google.com/file/d/h1/view', fileId: 'h1' });
        return json({ ok: true });
      }
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
      window.notifyDept = function () {};
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
    // A document's text with a space between cells, as a reader sees it (textContent runs "refundable$10,850" together).
    const docTxt = (sel) => p.evaluate((s) => { const el = document.querySelector(s); if (!el) return ''; const d = document.createElement('div');
      d.innerHTML = String(el.innerHTML).replace(/<\/td>/g, ' </td>').replace(/<br>/g, ' '); return d.textContent.replace(/\s+/g, ' ').trim(); }, sel);
    const val = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.value : null; }, sel);
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const dash = async (id) => { await p.evaluate((id) => { showPanel('jobs', document.querySelector('.nb[onclick*="\'jobs\'"]')); openClientDashboard(id); }, id); await p.waitForTimeout(700); };
    const band = () => txt('#client-dashboard-view .jt-next');
    const toDesk = async (id) => {
      await p.evaluate((id) => { setCurrentJob(id); populateInventorySelect(); }, id);
      await p.click('.nb[onclick*="\'inventory\'"]'); await p.waitForTimeout(900);
      if (String(await val('#inv-job')) !== String(id)) { await p.selectOption('#inv-job', String(id)); await p.waitForTimeout(900); }
    };

    // ── Seed ──────────────────────────────────────────────────────────────────
    sheet = await p.evaluate(([J, P, E, N, T0]) => {
      vendorDirectory = [{ _row: 41, vendor_name: 'Kodner Galleries', category: 'Auction House', status: 'Active' },
        { _row: 42, vendor_name: 'Goodwill Palm Beach', category: 'Donation Pickup', status: 'Active' }];
      const est = { jobId: J, svc: 'downsizing_move', havellinTotal: 21700, grandTotal: 21700, totTC: 90, totPS: 82, tcRate: 150, psRate: 100, tcFee: 13500, psFee: 8200,
        days: 7, vendors: [], prepItems: [], pkgCost: 0, smf: 0, prepFee: 0, discountPct: 0, fixedPrice: false, rush: false, collections: [], vehicles: [],
        rooms: [{ idx: 0, name: 'Living Room', st: 'in', vol: 3, cplx: 3 }, { idx: 1, name: 'Kitchen', st: 'in', vol: 3, cplx: 3 }] };
      // A: the Home Transition closed with its hours under the deposit and the midpoint taken on the estimate.
      jobs.unshift({ id: J, hvlId: 'HVL-2610-J501', name: 'Robert Mercer', fname: 'Robert', lname: 'Mercer', svc: 'downsizing_move', addr: '2210 S Ocean Blvd', city: 'Palm Beach',
        zip: '33480', phone: '(561) 555-0101', email: 'rm@example.com', status: 'closed', won: true, wonAt: '2026-09-25', approved: true, tc: 'Ashley Jerome', created: '2026-09-20',
        start: '2026-10-05', walkthrough: '2026-09-22', activatedOn: '2026-10-05', deliveredOn: '2026-10-09', deliveredBy: 'Ashley Jerome', agrApproved: true, agrApprovedBy: 'Anthony Graziano',
        estimateSentDate: 'September 24, 2026', estimateSentTotal: 21700, acceptedTotal: 21700, agrSent: true, agrSigned: true,
        docState: { estimate: { sentAt: '2026-09-24T14:00:00Z' }, agreement: { sentAt: '2026-09-26T14:00:00Z', sig: { signedBy: 'Robert Mercer', signedAt: '2026-09-28' } },
          'invoice:deposit': { sentAt: '2026-09-29T14:00:00Z' }, 'invoice:midpoint': { sentAt: '2026-10-07T14:00:00Z' } },
        payments: [{ uid: 'p1', stage: 'deposit', amount: 10850, receivedOn: '2026-10-01', method: 'wire', clearedOn: '2026-10-01' },
                   { uid: 'p2', stage: 'midpoint', amount: 5425, receivedOn: '2026-10-07', method: 'wire', clearedOn: '2026-10-07' }],
        vendorRatings: {} });
      estimateStore[J] = { approved: true, submitted: true, approvedBy: 'Anthony Graziano', approvedAt: 'September 23, 2026', savedAt: T0, estimate: est };
      jobLogs[J] = [{ id: 1, date: '2026-10-06', activity: 'Sorting', members: [{ role: 'TC', name: 'Ashley Jerome', hours: 20 }, { role: 'PS', name: 'Anthony Graziano Jr', hours: 30 }] }];
      // B: a living client with no home value, estimate not yet built.
      jobs.unshift({ id: N, hvlId: 'HVL-2610-N504', name: 'Joan Harper', fname: 'Joan', lname: 'Harper', svc: 'home_cleanout', addr: '5 Seaview Ave', city: 'Palm Beach', zip: '33480',
        phone: '(561) 555-0144', email: 'jh@example.com', status: 'new', sqft: 2400, propVal: '', tc: 'Ashley Jerome', created: '2026-10-08', walkthrough: '2026-10-09', start: '2026-10-20', payments: [] });
      // C: the fee-only Home Prep, active.
      jobs.unshift({ id: P, hvlId: 'HVL-2610-P502', name: 'David Kessler', fname: 'David', lname: 'Kessler', svc: 'prep', addr: '140 Clarke Ave', city: 'Palm Beach', zip: '33480',
        phone: '(561) 555-0102', email: 'dk@example.com', status: 'active', won: true, wonAt: '2026-10-01', approved: true, tc: 'Ashley Jerome', created: '2026-09-28', start: '2026-10-12',
        activatedOn: '2026-10-06', estimateSentDate: 'September 30, 2026', estimateSentTotal: 4620, acceptedTotal: 4620, agrApproved: true, agrSent: true, agrSigned: true,
        docState: { estimate: { sentAt: '2026-09-30T14:00:00Z' }, agreement: { sentAt: '2026-10-01T14:00:00Z', sig: { signedBy: 'David Kessler', signedAt: '2026-10-02' } }, 'invoice:deposit': { sentAt: '2026-10-03T14:00:00Z' } },
        payments: [{ uid: 'p3', stage: 'deposit', amount: 2310, receivedOn: '2026-10-04', method: 'check' }], prepSourcing: {} });
      estimateStore[P] = { approved: true, submitted: true, approvedBy: 'Anthony Graziano', approvedAt: 'September 30, 2026', savedAt: T0,
        estimate: { jobId: P, svc: 'prep', totTC: 0, totPS: 0, tcRate: 150, psRate: 100, tcFee: 0, psFee: 0, prepEnabled: true, prepCost: 15400, prepFee: 4620, havellinTotal: 4620, grandTotal: 20020,
          prepItems: [{ id: 'p1', lid: 'p1', type: 'Full Interior Paint', cost: 9800 }, { id: 'p2', lid: 'p2', type: 'Landscaping', cost: 3200 }, { id: 'p3', lid: 'p3', type: 'Handyman Services', cost: 2400 }],
          pkgCost: 0, smf: 0, vendors: [], discountPct: 0, rush: false, fixedPrice: false, rooms: [], collections: [], vehicles: [] } };
      // D, E: an active probate estate with the charity and the auction house confirmed, two lines on the desk, a collection owed a photograph.
      jobs.unshift({ id: E, hvlId: 'HVL-2610-E503', name: 'Harold Brennan', fname: 'Harold', lname: 'Brennan', svc: 'probate', addr: '1180 N Lake Way', city: 'Palm Beach', zip: '33480',
        executor: 'Michael Brennan', executorRole: 'Personal Representative', executorPhone: '(561) 555-0103', executorEmail: 'mb@example.com', deathDate: '2026-06-02', executorAuth: 'received',
        matterType: 'probate', probateCase: '50-2026-CP-004412', docTier: 'appraisals', docLevel: 'formal', status: 'active', won: true, wonAt: '2026-09-25', approved: true, tc: 'Ashley Jerome',
        created: '2026-09-20', start: '2026-10-06', activatedOn: '2026-10-05', estimateSentDate: 'September 24, 2026', estimateSentTotal: 49000, acceptedTotal: 49000, agrApproved: true, agrSent: true, agrSigned: true,
        docState: { estimate: { sentAt: '2026-09-24T14:00:00Z' }, agreement: { sentAt: '2026-09-26T14:00:00Z', sig: { signedBy: 'Michael Brennan', signedAt: '2026-09-28' } }, 'invoice:deposit': { sentAt: '2026-09-29T14:00:00Z' } },
        payments: [{ uid: 'p4', stage: 'deposit', amount: 24500, receivedOn: '2026-10-01', method: 'wire', clearedOn: '2026-10-01' }],
        vendorSourcing: { Lv1: { status: 'Confirmed', vendorName: 'Goodwill Palm Beach' }, Lv2: { status: 'Confirmed', vendorName: 'Kodner Galleries' } }, driveFolder: 'https://drive.google.com/drive/folders/f1',
        driveSubfolders: { 'Estate Inventory': 'sf1', 'As-Found Record': 'sf2' } });
      estimateStore[E] = { approved: true, submitted: true, approvedBy: 'Anthony Graziano', approvedAt: 'September 23, 2026', savedAt: T0,
        estimate: { jobId: E, svc: 'probate', havellinTotal: 49000, grandTotal: 49000, fixedPrice: true, fixedAmount: 49000, fixedLines: true, totTC: 120, totPS: 200, tcRate: 150, psRate: 100,
          tcFee: 18000, psFee: 20000, days: 10, vendors: [{ lid: 'v1', type: 'Donation Organization', cost: 0 }, { lid: 'v2', type: 'Auction House', cost: 0 }], prepItems: [], pkgCost: 0,
          collections: [{ id: 'c1', name: 'Coin collection', disp: 'auction', qty: 1, value: 2500 }],
          rooms: [{ idx: 0, name: 'Living Room', st: 'in', vol: 3, cplx: 3 }, { idx: 1, name: 'Library', st: 'in', vol: 3, cplx: 3 }] } };
      const item = (id, o) => Object.assign({ stableId: id, label: 'inventory', roomIdx: 0, seq: 1, status: 'uploaded', category: 'Furniture', disposition: '', objectName: 'Line ' + id,
        ts: T0, updatedAt: T0, filename: 'HVL-2610-E503_Living Room_INV_' + id + '.jpg', driveFileId: 'f-' + id, driveFileUrl: 'https://drive.google.com/file/d/f-' + id + '/view', namedBy: 'desk' }, o);
      _photoRefs[E] = [item('a1', { objectName: 'Walnut desk', disposition: 'Sell', channel: '' }), item('a2', { objectName: 'Oil painting', category: 'Art & Décor', disposition: 'Keep', fmv: '4000', ts: T0 + 1, updatedAt: T0 + 1 })];
      savePhotoRefs(E);
      saveJobs(); localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore));
      const back = JSON.parse(localStorage.getItem('hav_media_' + E) || '[]');
      return { [E]: { items: back } };
    }, [J, P, E, N, T0]);

    // ── A ───────────────────────────────────────────────────────────────────
    await section('A. a finished hourly job whose payments exceed the work settles, and the band asks for the refund', async () => {
      await dash(J);
      has(await band(), 'Send the final invoice', 'fixture: the band is on the final invoice');
      await press('#client-dashboard-view button[onclick="docAction(' + J + ',\'invoice\',\'view\',{stage:\'final\'})"]', '👁 View final invoice');
      has(await txt('#dash-fb'), 'needs a manager PIN', 'the final is 72% off the estimate: the PIN first');
      await press('#client-dashboard-view button[onclick="dashApproveInvoice(' + J + ',\'final\')"]', '🔑 Manager approval');
      await p.fill('#inv-pin-input', '3010'); await p.waitForTimeout(800);
      const notice = await txt('#dash-fb');
      has(notice, 'approved for release by Anthony Graziano at a refund of $5,425 to the client', '⚠ the approval notice reads the refund as one, never "$-5,425"');
      await press('#client-dashboard-view button[onclick="docAction(' + J + ',\'invoice\',\'view\',{stage:\'final\'})"]', '👁 View final invoice');
      const doc = await docTxt('#doc-viewer-body');
      has(doc, 'Settlement — the payments received exceed the work done', '⚠⚠ the final settles');
      has(doc, 'Deposit — earned on signature, not refundable $10,850', 'the deposit the agreement makes earned on signature');
      has(doc, 'Refund Due to You $5,425', '⚠⚠ the midpoint goes back, never the deposit');
      lacks(doc, 'Credit: $10,050', 'and no credit of the whole excess');
      await p.evaluate(() => { try { closeDocViewer(); } catch (e) { const m = document.getElementById('doc-viewer-modal'); if (m) m.style.display = 'none'; } });
      await press('#client-dashboard-view button[onclick="docAction(' + J + ',\'invoice\',\'send\',{stage:\'final\'})"]', '✉ Send final invoice');
      await press('#client-dashboard-view button[onclick="markDocSent(' + J + ',\'invoice:final\')"]', '✓ I’ve sent it');
      const b2 = await band();
      has(b2, 'Send the client their refund', '⚠⚠ the band\'s last step is the refund');
      lacks(b2, 'Collect the final payment', 'never "Collect the final payment" of a negative figure');
      await press('#client-dashboard-view .jt-band button[onclick="openRefundModal(' + J + ')"], #client-dashboard-view button[onclick="openRefundModal(' + J + ')"]', '↩ Record refund');
      ok(await vis('#rf-save-btn'), 'the refund recorder opens');
      eq(await val('#rf-amount'), '5425', '⚠ on the refund the final states');
      await p.selectOption('#rf-method', 'check'); await p.fill('#rf-reference', 'Cheque 2210');
      await press('#rf-save-btn', 'Record refund →');
      await p.waitForTimeout(800);
      eq(await p.evaluate((id) => (jobs.find((j) => j.id === id).payments || []).filter((x) => x.stage === 'refund').map((x) => x.amount), J), [5425], 'the refund is on the job');
      await dash(J);
      has(await txt('#client-dashboard-view'), '$5,425 refunded', 'the rail\'s last row reads refunded');
      has(await band(), 'Complete', 'and the job is complete');
      eq(await p.locator('#client-dashboard-view button[onclick="dashRecordPayment(' + J + ',\'final\')"]').count(), 0, 'Record payment is never offered on that final');
    });

    // ── B ───────────────────────────────────────────────────────────────────
    await section('B. Build Estimate with no home value on file saves, with the flag', async () => {
      await dash(N);
      await press('#client-dashboard-view button[onclick="dashGoEstimate(' + N + ')"]', 'Build estimate');
      await p.waitForTimeout(800);
      // The room sections open folded: a person opens the first section, then ticks a room and scores it.
      if (!(await vis('#chk-r0'))) await press('[onclick="toggleRoomSection(0)"]', 'the first room section');
      ok(await vis('#chk-r0'), 'fixture: the room grid is on screen');
      await p.click('#chk-r0'); await p.waitForTimeout(200);
      await p.fill('#vol-r0', '3'); await p.fill('#cplx-r0', '3'); await p.waitForTimeout(400);
      has(await txt('#propval-warn'), 'No home value on file', '⚠ the warning under the total is a flag, not "required — set before saving"');
      await press('button[onclick="saveEstimateAndPreview()"]', 'Save Estimate');
      await p.waitForTimeout(1200);
      const saved = await p.evaluate((id) => !!(estimateStore[id] && estimateStore[id].estimate && (estimateStore[id].estimate.rooms || []).length), N);
      eq(saved, true, '⚠⚠ the estimate saved (it refused "Property value is required" and sent the concierge to Edit Client)');
      const fb = await p.evaluate(() => { const e = document.getElementById('e-fb'); const d = document.getElementById('dash-fb'); return ((e && e.textContent) || '') + ' ' + ((d && d.textContent) || ''); });
      has(fb, 'No home value on file', 'and the notice names the gap');
    });

    // ── C ───────────────────────────────────────────────────────────────────
    await section('C. a fee-only Home Prep\'s dashboard: no hours log to open, no discount to offer', async () => {
      await dash(P);
      const v = await txt('#client-dashboard-view');
      has(v, 'No hours are billed on this engagement', '⚠ the Hours Log card says why there is no log');
      eq(await p.locator('#client-dashboard-view button[onclick="goToJobLog(' + P + ')"]').count(), 0, '…and offers no + Log Hours Today');
      eq(await p.locator('#client-dashboard-view button[onclick="dashOfferDiscount(' + P + ')"]').count(), 0, '⚠ Offer discount is withheld: no labour to discount');
      has(await band(), 'Book the prep vendors', 'fixture: the band books the vendors');
      await press('#client-dashboard-view button[onclick="openJobPlanFor(' + P + ',\'vendors\')"]', '▶ Book the vendors');
      await p.waitForTimeout(900);
      const open = await p.evaluate(() => { const d = document.querySelector('#job-plan-content details.plan-tool, #job-plan-content details'); return d ? d.open : null; });
      ok(open === true || open === null, 'the vendors fold is open on arrival (' + open + ')');
    });

    // ── D ───────────────────────────────────────────────────────────────────
    await section('D. the desk: a buyer typed on a Sell line shows File pickup list at once; a named, decided line reads reviewed', async () => {
      await toDesk(E);
      lacks(await txt('#inv-releases'), 'File pickup list', 'fixture: no pickup list while the Sell line names nobody');
      const inp = '#inv-row-a1 input[onchange*="\'channel\'"], [id$="a1"] input[onchange*="\'channel\'"]';
      const n = await p.locator(inp).count();
      ok(n >= 1, 'the Sell line\'s recipient box is on screen (' + n + ')');
      if (n) { await p.locator(inp).first().fill('Palm Beach Estate Buyers'); await p.locator(inp).first().dispatchEvent('change'); await p.waitForTimeout(700); }
      has(await txt('#inv-releases'), 'File pickup list', '⚠ File pickup list appears without leaving the tab');
      // Three boxes: the two lines a person named and decided, and the coin collection's own line (the walkthrough's, unnamed by anybody).
      const rev = await p.evaluate(() => Array.from(document.querySelectorAll('input[type=checkbox][onchange*="_invSetReviewed"]')).map((c) => [c.checked, c.disabled]));
      eq(rev.filter((x) => x[0]).length, 2, '⚠ both lines, named and decided by a person, read reviewed without a tick (' + rev.length + ' boxes)');
      eq(rev.filter((x) => x[0]).every((x) => x[1]), true, '…and those boxes cannot be unticked: it is not a tick');
      eq(rev.filter((x) => !x[0]).length, 1, 'the collection\'s line, nobody\'s name yet, is not');
    });

    // ── E ───────────────────────────────────────────────────────────────────
    await section('E. the camera on an estate: a Donate shot takes the confirmed charity; arming a collection drops the chip', async () => {
      await p.evaluate((id) => openJobPlanFor(id), E); await p.waitForTimeout(1500);
      await press('#plan-rooms-' + E + ' .rl-row[onclick="openRoomWorkspace(' + E + ',1)"]', 'the Library\'s card');
      await press('#room-ws button.ws-cam[onclick="openFieldCamera(' + E + ',1,\'inventory\')"]', 'Items');
      await p.waitForTimeout(1200);
      ok(await vis('#field-cam .fc-shutter'), 'fixture: the camera is open');
      await press('#field-cam .fc-chip[onclick="fieldCamSetDisp(\'donate\')"]', 'the Donate chip');
      await press('#field-cam .fc-shutter:not(.fc-closeup)', 'the shutter');
      await p.waitForTimeout(1500);
      const shot = await p.evaluate((id) => (_photoRefs[id] || []).filter((r) => r.roomIdx === 1 && r.label === 'inventory').map((r) => [r.disposition, r.channel || '', r.channelFrom || '']), E);
      eq(shot, [['Donate', 'Goodwill Palm Beach', 'plan']], '⚠⚠ the line shot with Donate takes the confirmed charity at capture');
      await press('#field-cam .fc-colls .fc-tog', 'the coin collection chip');
      const chip = await p.evaluate(() => { const on = document.querySelector('#field-cam .fc-chip.on'); return on ? on.textContent.trim() : ''; });
      eq(chip, 'Undecided', '⚠ arming the collection drops the latched Donate chip');
      await press('#field-cam .fc-done', 'Done');
      await p.evaluate(() => { try { closeRoomWorkspace(); } catch (e) {} });
    });

    // ── F ───────────────────────────────────────────────────────────────────
    await section('F. overflow and page errors', async () => {
      await dash(J);
      ok(await overflow() <= 0, 'the dashboard fits at 1440 (' + await overflow() + ')');
      await p.setViewportSize({ width: 390, height: 844 });
      await dash(J);
      ok(await overflow() <= 0, 'the dashboard fits at 390 (' + await overflow() + ')');
      await toDesk(E);
      const o = await overflow();
      ok(o <= 0, '⚠ the desk with the appraisal guardrail fits at 390 (' + o + ')');
      eq(errs, [], 'no page errors');
    });
  } catch (e) {
    fail++; console.log('  ✗ threw: ' + String(e && e.message || e).split('\n')[0]);
  } finally {
    if (b) await b.close().catch(() => {});
    console.log('  step75: ' + pass + ' passed, ' + fail + ' failed');
    process.exit(fail ? 1 : 0);
  }
})();
