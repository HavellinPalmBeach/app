// Step 84 — sending the Release Approval Request (2026-10-17; Anthony: "Build the send button").
//
// Drives the REAL page: a probate estate seeded with two lines awaiting approval, one kept, a representative with an
// email, a co-representative without and the estate attorney; the desk's Releases & signed papers card before anything
// is sent; the card's real Send request button over a routed Apps Script (loadMedia, uploadHtml, htmlToPdf) and a
// stubbed Gmail draft; the card's I've sent it pressed; the counts as a line is approved and another put up for sale;
// the dashboard's card and its Open the desk; the blocked case; overflow at 1440 and 390; zero page errors.
// ⚠ RESTATED 2026-10-22 (the desk's re-architecture, one Send request): the work bar carried a second Send request,
// offered while blocked. Section A now pins the one on the Releases card (on screen, its bar open by itself while the
// request is owed), the bulk bar's for a selection, and none on the work bar; B presses the card's; E proves the
// handler's refusal through the bulk bar's, with no send offered anywhere for every line.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step84.js [/abs/path/to/havellin.html]
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
const EST = 8401;

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
    let sheet = {};
    const posts = [];
    await ctx.route(SYNC + '**', async (r) => {
      const req = r.request();
      const json = (o) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
      if (req.method() === 'POST') {
        let body = {}; try { body = JSON.parse(req.postData() || '{}'); } catch (e) {}
        posts.push(body);
        if (body.action === 'uploadHtml') return json({ ok: true, fileUrl: 'https://drive.google.com/file/d/up' + posts.length + '/view', fileId: 'up' + posts.length });
        if (body.action === 'htmlToPdf') return json({ ok: true, base64: Buffer.from('%PDF-1.4 ' + 'x'.repeat(200)).toString('base64') });
        if (body.action === 'getSubfolders') return json({ ok: true, subfolders: null });
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
      window.__opened = [];
      window.open = function (x) { window.__opened.push(String(x)); return null; };
      window.__drafts = [];
      window.gmailCreateDraft = function (mime, cb) { window.__drafts.push(mime); cb(true, { draftId: 'd1', messageId: 'm1' }); };
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
      if (v) { await p.locator(sel).first().click({ timeout: 5000 }).catch((e) => ok(false, (what || sel) + ' — ' + e.message.split('\n')[0])); await p.waitForTimeout(700); }
      return v;
    };
    const txt = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }, sel);
    const html = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.innerHTML : ''; }, sel);
    const val = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.value : null; }, sel);
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const toDesk = async (id) => {
      await p.evaluate((id) => { setCurrentJob(id); populateInventorySelect(); }, id);
      await p.click('.nb[onclick*="\'inventory\'"]'); await p.waitForTimeout(900);
      if (String(await val('#inv-job')) !== String(id)) { await p.selectOption('#inv-job', String(id)); await p.waitForTimeout(900); }
    };
    const record = () => p.evaluate((id) => { const j = jobs.find((x) => x.id === id); return JSON.parse(JSON.stringify((j.docState || {}).approvalRequest || null)); }, EST);
    // ⚠ THE DESK'S FOUR BARS (2026-10-22): the Releases card sits in a fold bar, so it is opened by a real press of its
    // header, and only when its body is hidden.
    const openBar = async (fold, id) => {
      const body = p.locator('#desk-body-' + fold + '-' + id), hd = p.locator('#desk-hd-' + fold + '-' + id);
      if ((await body.count()) === 1 && !(await body.isVisible()) && (await hd.isVisible())) { await p.click('#desk-hd-' + fold + '-' + id); await p.waitForTimeout(300); }
    };
    const sendsOnDesk = () => p.evaluate(() => Array.from(document.querySelectorAll('#inventory-content button[onclick^="sendApprovalRequest("]')).map((x) => x.getAttribute('onclick')));

    // ── Seed: an active probate estate; two lines awaiting approval, one kept ──
    sheet = await p.evaluate(([EST, T0]) => {
      jobs.unshift({ id: EST, hvlId: 'HVL-2610-E841', name: 'Harold Whitcombe', svc: 'probate', matterType: 'probate', addr: '5 E St', city: 'Palm Beach', zip: '33480',
        executor: 'Thomas Whitcombe', executorRole: 'Personal Representative', executorEmail: 't@example.com', deathDate: '2026-04-02', executorAuth: 'received',
        coFiduciaries: [{ id: 'cf1', name: 'Nora Whitcombe', role: 'Co-Personal Representative', email: '', phone: '' }],
        probateAttyName: 'Ann Lowe', probateAttyEmail: 'ann@lowe.law',
        probateCase: '50-2026-CP-001234', docTier: 'values', gate706: 'no', status: 'active', won: true, wonAt: '2026-09-25', approved: true, tc: 'Ashley Jerome',
        created: '2026-09-20', start: '2026-10-06', activatedOn: '2026-10-05', agrApproved: true, agrSent: true, agrSigned: true,
        driveFolder: 'https://drive.google.com/drive/folders/ROOT841', driveSubfolders: { 'Estate Inventory': 'INV841', 'As-Found Record': 'AF841', 'Signed Records': 'SR841' },
        docState: { estimate: { sentAt: '2026-09-24T14:00:00Z' }, agreement: { sentAt: '2026-09-26T14:00:00Z', sig: { signedBy: 'T', signedAt: '2026-09-28' } }, 'invoice:deposit': { sentAt: '2026-09-29T14:00:00Z' } },
        payments: [{ uid: 'e1', stage: 'deposit', amount: 20000, receivedOn: '2026-10-01', method: 'wire', clearedOn: '2026-10-01' }], proceedsStatements: [] });
      estimateStore[EST] = { approved: true, submitted: true, approvedBy: 'Anthony Graziano', approvedAt: 'September 23, 2026', savedAt: T0,
        estimate: { jobId: EST, svc: 'probate', havellinTotal: 40000, fixedPrice: true, fixedAmount: 40000, fixedLines: true, totTC: 100, totPS: 150, tcRate: 150, psRate: 100,
          days: 8, vendors: [], prepItems: [], pkgCost: 0, rooms: [{ idx: 0, name: 'Living Room', st: 'in', vol: 3, cplx: 3 }] } };
      const item = (id, o) => Object.assign({ stableId: id, label: 'inventory', roomIdx: 0, seq: 1, status: 'uploaded', category: 'Furniture', disposition: '',
        objectName: 'Line ' + id, ts: T0, updatedAt: T0, filename: 'HVL_' + EST + '_INV_' + id + '.jpg', driveFileId: 'f-' + id }, o);
      _photoRefs[EST] = [
        item('a', { itemNo: 1, objectName: 'Harbor painting', category: 'Art & Décor', fmv: '2400', disposition: 'Auction', channel: 'Kodner Galleries' }),
        item('b', { itemNo: 2, objectName: 'Table lamp', fmv: '60', disposition: 'Donate', channel: 'Goodwill Palm Beach' }),
        item('c', { itemNo: 3, objectName: 'Grandfather clock', category: 'Clocks', fmv: '2500', disposition: 'Keep' })];
      savePhotoRefs(EST);
      saveJobs(); localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore));
      const out = {}; out[EST] = { items: JSON.parse(localStorage.getItem('hav_media_' + EST) || '[]') }; return out;
    }, [EST, T0]);

    // ── A ───────────────────────────────────────────────────────────────────
    await section('A. the desk before anything is sent: the card says what waits and to whom it will go; one Send request, the card\'s', async () => {
      await toDesk(EST);
      const card = await txt('#inv-releases');
      has(card, 'Approval request', 'the Releases card has the section');
      has(card, '2 lines await written approval; nothing has been sent from the app.', 'what waits, and that nothing went');
      has(card, 'Goes as a PDF to t@example.com, copied to ann@lowe.law and agreements@havellinpalmbeach.com; Nora Whitcombe has no email and signs the printed copy.', 'to whom, and who signs paper');
      eq(await p.locator('#inv-workbar button[onclick^="sendApprovalRequest("]').count(), 0, '⚠ the work bar carries no Send request');
      eq(await p.locator('#inv-releases button[onclick="sendApprovalRequest(' + EST + ')"]').count(), 1, 'the card carries it once');
      eq(await sendsOnDesk(), ['sendApprovalRequest(' + EST + ')'], '⚠⚠ one Send request on the whole desk, nothing selected');
      ok(await vis('#inv-releases button[onclick="sendApprovalRequest(' + EST + ')"]'), '⚠ and it is on screen: the Releases bar opened by itself while the request is owed');
      ok(await vis('#inv-workbar button[onclick="printApprovalRequest(' + EST + ')"]'), 'Approval Request (the print) still on the work bar');
      eq(await p.locator('#inv-releases button[onclick^="invMarkRequestSent("]').count(), 0, 'no confirming tap with nothing drafted');
    });

    // ── B ───────────────────────────────────────────────────────────────────
    await section('B. Send request, pressed: filed dated, the PDF, the draft, the record, the card waiting on its tap', async () => {
      const before = posts.length;
      await openBar('releases', EST);
      await press('#inv-releases button[onclick="sendApprovalRequest(' + EST + ')"]', 'Send request (the card\'s)');
      await p.waitForTimeout(1500);
      const mine = posts.slice(before);
      const up = mine.find((x) => x.action === 'uploadHtml');
      ok(!!up, 'the request was filed to Drive');
      ok(!!up && /^HVL-2610-E841 - Havellin Release Approval Request - [A-Z][a-z]{2} \d{1,2} \d{4}\.html$/.test(up.filename), 'under a DATED name (' + (up && up.filename) + ')');
      eq(up && up.folderId, 'INV841', 'in the Estate Inventory folder');
      has(up && up.html, 'Harbor painting', 'the filed copy is the request');
      ok(mine.some((x) => x.action === 'htmlToPdf'), 'and made a PDF');
      const drafts = await p.evaluate(() => window.__drafts.length);
      eq(drafts, 1, 'one Gmail draft');
      const mime = await p.evaluate(() => window.__drafts[0]);
      has(mime, 'To: t@example.com', 'to the representative');
      has(mime, 'Cc: ann@lowe.law, agreements@havellinpalmbeach.com', 'the attorney and agreements@ copied');
      has(mime, 'application/pdf', 'the PDF attached');
      const rec = await record();
      ok(!!rec && rec.provider === 'gmail' && !rec.sentAt, 'recorded as a Gmail draft, not sent');
      eq(rec && rec.req && rec.req.stableIds, ['a', 'b'], 'what it asked for: the two leaving lines, never the kept one');
      eq(rec && rec.req && rec.req.to, ['t@example.com'], 'and of whom');
      eq(rec && rec.req && rec.req.noEmail, ['Nora Whitcombe'], 'and who signs paper');
      const fb = await txt('#jband-fb-admin');
      has(fb, 'Draft created', 'the band says a draft was created');
      has(fb, 'with the Release Approval Request attached (2 lines)', 'with the PDF');
      has(fb, 'then tap “I’ve sent it” on the Releases & signed papers card', 'and names the tap');
      has(fb, 'Nora Whitcombe has no email on file: print the request for them to sign (Approval Request).', 'and who signs paper');
      const card = await txt('#inv-releases');
      has(card, 'Drafted ', 'the card: drafted');
      has(card, 'to t@example.com, 2 lines', 'to whom, how many');
      has(card, 'Drafted — read it, send it, then confirm', 'the draft line');
      ok(await vis('#inv-releases button[onclick="invMarkRequestSent(' + EST + ')"]'), 'I’ve sent it on screen');
      ok(await vis('#inv-releases button[onclick="openDocDraft(' + EST + ',\'approvalRequest\')"]'), 'Open the draft on screen');
      eq(await p.locator('#inv-releases button[onclick="sendApprovalRequest(' + EST + ')"]').count(), 0, 'no second send while the draft waits');
      eq(await p.evaluate(() => window.__opened.length), 1, 'the draft was opened');
    });

    // ── C ───────────────────────────────────────────────────────────────────
    await section('C. I’ve sent it, pressed: recorded; then a line approved and another put up for sale move the counts', async () => {
      await press('#inv-releases button[onclick="invMarkRequestSent(' + EST + ')"]', 'I’ve sent it');
      const rec = await record();
      ok(!!(rec && rec.sentAt), 'sentAt recorded');
      eq(rec && rec.sentBy, 'Ashley Jerome', 'by the job’s concierge');
      let card = await txt('#inv-releases');
      has(card, 'Sent ', 'the card: sent');
      has(card, 'by Ashley Jerome to t@example.com, 2 lines · 2 lines still unsigned', 'to whom, how many, how many still unsigned');
      has(card, 'Nora Whitcombe had no email: they sign the printed copy.', 'who signs paper');
      eq(await p.locator('#inv-releases button[onclick^="invMarkRequestSent("]').count(), 0, 'no tap once sent');
      ok(await vis('#inv-releases button[onclick="sendApprovalRequest(' + EST + ')"]'), 'a fresh send is offered (two lines still wait)');
      // The representative and the co-representative sign for the painting; the clock goes up for sale.
      await p.evaluate((id) => {
        const a = _photoRefs[id].find((r) => r.stableId === 'a'); a.authBy = 'Thomas Whitcombe; Nora Whitcombe'; a.approvalDate = '2026-10-17'; a.updatedAt = Date.now();
        const c = _photoRefs[id].find((r) => r.stableId === 'c'); c.disposition = 'Sell'; c.channel = 'Palm Beach Estate Buyers'; c.updatedAt = Date.now();
        savePhotoRefs(id); renderInventoryTab();
      }, EST);
      await p.waitForTimeout(700);
      card = await txt('#inv-releases');
      has(card, '2 lines · 1 line still unsigned', 'one of the two still unsigned');
      has(card, '1 line now await approval and were not on it: send a fresh request.', 'the new line is named');
    });

    // ── D ───────────────────────────────────────────────────────────────────
    await section('D. the dashboard’s card, and Open the desk', async () => {
      await p.evaluate((id) => { showPanel('jobs', document.querySelector('.nb[onclick*="\'jobs\'"]')); openClientDashboard(id); }, EST);
      await p.waitForTimeout(900);
      const card = await txt('#dash-approval-' + EST);
      has(card, 'Release approval request', 'the dashboard card');
      has(card, 'by Ashley Jerome to t@example.com, 2 lines · 1 line still unsigned', 'sent, and what is still unsigned (this device holds the manifest)');
      has(card, '1 line now await approval and were not on it: send a fresh request from the desk.', 'and the fresh line');
      await press('#dash-approval-' + EST + ' button[onclick="openJobDeskFor(' + EST + ')"]', 'Open the desk');
      await p.waitForTimeout(600);
      eq(String(await val('#inv-job')), String(EST), 'landed on the desk, on this client');
      ok(await vis('#inv-releases'), 'with the Releases card on screen');
    });

    // ── E ───────────────────────────────────────────────────────────────────
    await section('E. blocked by name: no address at all; and a living client has no fiduciary words', async () => {
      await p.evaluate((id) => { const j = jobs.find((x) => x.id === id); j.executorEmail = ''; j.probateAttyEmail = ''; j.coFiduciaries = []; saveJobs(); renderInventoryTab(); }, EST);
      await p.waitForTimeout(700);
      const card = await txt('#inv-releases');
      has(card, 'The approval request cannot be sent yet: it needs an email for the Personal Representative, a co-representative or the estate attorney (Edit Client).', 'the blocker, in red, by name');
      eq(await p.locator('#inv-releases button[onclick="sendApprovalRequest(' + EST + ')"]').count(), 0, 'and no send that would refuse');
      eq(await sendsOnDesk(), [], '⚠⚠ no Send request anywhere on the desk for every line: none that would refuse');
      // The handler still refuses by name, pressed through the bulk bar's selection send.
      await press('#inv-row-b input[onchange^="_invTogglePick"]', 'the box on the lamp');
      eq(await sendsOnDesk(), ['sendApprovalRequest(' + EST + ',true)'], 'a line selected: the bulk bar\'s selection send, the only one');
      await press('button[onclick="sendApprovalRequest(' + EST + ',true)"]', 'Send request (the selection, blocked)');
      has(await txt('#jband-fb-admin'), 'cannot be sent yet', 'the handler refuses with the same sentence');
      eq(await p.evaluate(() => window.__drafts.length), 1, 'and made no draft');
      await press('button[onclick="_invClearPicks()"]', 'Clear');
      eq(await sendsOnDesk(), [], 'the selection cleared: none again');
    });

    // ── F ───────────────────────────────────────────────────────────────────
    await section('F. no overflow at 1440 and 390; no page errors', async () => {
      ok((await overflow()) <= 0, 'desk at 1440: no horizontal overflow (' + (await overflow()) + ')');
      await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(600);
      ok((await overflow()) <= 0, 'desk at 390: no horizontal overflow (' + (await overflow()) + ')');
      await p.setViewportSize({ width: 1440, height: 1000 });
      eq(errs, [], 'zero page errors');
      eq(dialogs.filter((d) => /^alert/.test(d)), [], 'no blocking alert');
    });

    await b.close();
    console.log('\nstep84: ' + pass + ' passed, ' + fail + ' failed');
    process.exit(fail ? 1 : 0);
  } catch (e) {
    console.log('step84 crashed: ' + (e && e.stack || e));
    if (b) await b.close().catch(() => {});
    process.exit(1);
  }
})();
