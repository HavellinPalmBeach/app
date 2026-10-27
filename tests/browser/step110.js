// Step 110 — the release request as a letter, only for what has somewhere to go, and a draft that can be redone (2026-10-26;
// Anthony at the desk on the Ellison test client: "make it just sound like … a letter asking them for their release and
// initialing"; "Hold them off"; "Keep theirs"; "the only thing I can do is mark I've sent it or open the draft").
//
// Drives the REAL page: a probate estate with a representative and a co-representative, a painting going to auction, a lamp
// to a charity and a sofa to be donated with nobody named. A: the card and the Releases bar say the sofa waits for a taker;
// the print is a letter, the sofa off it, one initial box (the painting's). B: the card's Send request, pressed: the notice
// names the held sofa; the card offers Discard draft. C: the sofa's taker typed on its row: it joins what waits for the next
// request. D: the lamp's value typed on its row: the card flags the draft, the tap and Discard draft stay (restated on review:
// the first build refused the tap). E: Discard draft pressed: asked first, the card forgets it and offers the send; a fresh
// send carries all three. F: overflow at 1440 and 390, zero errors.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step110.js [/abs/path/to/havellin.html]
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
const EST = 11001;

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

    // ── Seed: an active probate estate; a painting to auction, a lamp to a charity, a sofa to donate with nobody named ──
    sheet = await p.evaluate(([EST, T0]) => {
      jobs.unshift({ id: EST, hvlId: 'HVL-2610-E110', name: 'Harold Whitcombe', svc: 'probate', matterType: 'probate', addr: '5 E St', city: 'Palm Beach', zip: '33480',
        executor: 'Thomas Whitcombe', executorRole: 'Personal Representative', executorEmail: 't@example.com', deathDate: '2026-04-02', executorAuth: 'received',
        coFiduciaries: [{ id: 'cf1', name: 'Nora Whitcombe', role: 'Co-Personal Representative', email: 'nora@example.com', phone: '' }],
        probateAttyName: 'Ann Lowe', probateAttyEmail: 'ann@lowe.law',
        probateCase: '50-2026-CP-001234', docTier: 'values', gate706: 'no', status: 'active', won: true, wonAt: '2026-09-25', approved: true, tc: 'Ashley Jerome',
        created: '2026-09-20', start: '2026-10-06', activatedOn: '2026-10-05', agrApproved: true, agrSent: true, agrSigned: true,
        driveFolder: 'https://drive.google.com/drive/folders/ROOT110', driveSubfolders: { 'Estate Inventory': 'INV110', 'As-Found Record': 'AF110', 'Signed Records': 'SR110' },
        docState: { estimate: { sentAt: '2026-09-24T14:00:00Z' }, agreement: { sentAt: '2026-09-26T14:00:00Z', sig: { signedBy: 'T', signedAt: '2026-09-28' } }, 'invoice:deposit': { sentAt: '2026-09-29T14:00:00Z' } },
        payments: [{ uid: 'e1', stage: 'deposit', amount: 20000, receivedOn: '2026-10-01', method: 'wire', clearedOn: '2026-10-01' }], proceedsStatements: [] });
      estimateStore[EST] = { approved: true, submitted: true, approvedBy: 'Anthony Graziano', approvedAt: 'September 23, 2026', savedAt: T0,
        estimate: { jobId: EST, svc: 'probate', havellinTotal: 40000, fixedPrice: true, fixedAmount: 40000, fixedLines: true, totTC: 100, totPS: 150, tcRate: 150, psRate: 100,
          days: 8, vendors: [], prepItems: [], pkgCost: 0, rooms: [{ idx: 0, name: 'Living Room', st: 'in', vol: 3, cplx: 3 }] } };
      const item = (id, o) => Object.assign({ stableId: id, label: 'inventory', roomIdx: 0, seq: 1, status: 'uploaded', category: 'Furniture', disposition: '',
        objectName: 'Line ' + id, ts: T0, updatedAt: T0, filename: 'HVL_' + EST + '_INV_' + id + '.jpg', driveFileId: 'f-' + id, namedBy: 'desk', reviewed: true }, o);
      _photoRefs[EST] = [
        item('a', { itemNo: 1, objectName: 'Harbor painting', category: 'Art & Décor', fmv: '2400', disposition: 'Auction', channel: 'Kodner Galleries' }),
        item('b', { itemNo: 2, objectName: 'Table lamp', fmv: '60', disposition: 'Donate', channel: 'Goodwill Palm Beach' }),
        item('c', { itemNo: 3, objectName: 'Chesterfield sofa', fmv: '300', disposition: 'Donate', channel: '' })];
      savePhotoRefs(EST);
      saveJobs(); localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore));
      const out = {}; out[EST] = { items: JSON.parse(localStorage.getItem('hav_media_' + EST) || '[]') }; return out;
    }, [EST, T0]);
    // The sheet follows this device's saves, so the send's read of the sheet hands back what the desk shows.
    const syncSheet = () => p.evaluate((id) => { const o = {}; o[id] = { items: JSON.parse(localStorage.getItem('hav_media_' + id) || '[]') }; return o; }, EST).then((o) => { sheet = o; });
    const relLine = () => p.evaluate((id) => { const el = document.getElementById('desk-stat-releases-' + id); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }, EST);
    const typeIn = async (sel, v, what) => {
      const n = await p.locator(sel).count();
      ok(n === 1 && await vis(sel), what + ' — on screen (' + n + ')');
      // Typed, then Tab out of the box, as a person leaves it: the box's change fires once, natively, before anything else is pressed.
      if (n === 1) { await p.fill(sel, v); await p.press(sel, 'Tab'); await p.waitForTimeout(700); }
    };

    // ── A ───────────────────────────────────────────────────────────────────
    await section('A. the sofa waits for a taker: said on the card and the bar; the print is a letter, the sofa off it, one initial box', async () => {
      await toDesk(EST);
      await openBar('releases', EST);
      const card = await txt('#inv-releases');
      has(card, '1 line waits for somebody to be named to take it, so it is not asked for', '⚠⚠ the card says the sofa waits for a taker');
      has(card, '2 lines await written approval; nothing has been sent from the app.', 'and the two that can go');
      has(await relLine(), '1 item waits for somebody to be named to take it', 'the Releases bar says so too');
      ok(await vis('#inv-releases button[onclick="sendApprovalRequest(' + EST + ')"]'), 'Send request on screen');
      await press('#inv-workbar button[onclick="printApprovalRequest(' + EST + ')"]', 'Approval Request (the print)');
      const h = await p.evaluate(() => (window.__prints || []).slice(-1)[0] || '');
      const letter = await p.evaluate((h) => { const d = document.createElement('div'); d.innerHTML = h; const l = d.querySelector('.inv-req-letter'); return l ? l.textContent.replace(/\s+/g, ' ').trim() : ''; }, h);
      has(letter, 'Dear Thomas Whitcombe and Nora Whitcombe,', '⚠ the letter is addressed to both');
      has(letter, 'The items listed below are ready to leave the property. Before anything is moved, we ask for the written approval of each of you.', 'in Anthony’s words');
      has(letter, 'signed by both of you.', 'both of you');
      lacks(h, 'Verbal approval', 'no sentence about verbal approval');
      has(h, 'Harbor painting', 'the painting is on it');
      has(h, 'Table lamp', 'the lamp is on it');
      lacks(h, 'Chesterfield sofa', '⚠⚠ the sofa is not: nobody is named to take it');
      eq((h.match(/class="inv-own-init"/g) || []).length, 1, 'one initial box, the $2,400 painting’s');
      lacks(h, 'initialled with its group', 'and no line says it is initialled with its group');
      ok(await overflow() <= 0, 'no horizontal overflow at 1440 (' + await overflow() + ')');
    });

    // ── B ───────────────────────────────────────────────────────────────────
    await section('B. Send request, pressed: the notice names the held sofa; the record keeps a fingerprint; Discard draft offered', async () => {
      await syncSheet();
      await openBar('releases', EST);
      await press('#inv-releases button[onclick="sendApprovalRequest(' + EST + ')"]', 'Send request (the card’s)');
      await p.waitForTimeout(1500);
      eq(await p.evaluate(() => window.__drafts.length), 1, 'one Gmail draft');
      const rec = await record();
      eq(rec && rec.req && rec.req.stableIds, ['a', 'b'], 'it carried the painting and the lamp');
      ok(!!(rec && rec.req && typeof rec.req.sig === 'string' && rec.req.sig.length <= 8), 'and kept one short fingerprint of where each went, to whom and its value');
      has(await txt('#jband-fb-admin'), '1 item waits for somebody to be named to take it and is not on it.', '⚠ the band names the held sofa');
      await openBar('releases', EST);
      ok(await vis('#inv-releases button[onclick="discardApprovalRequestDraft(' + EST + ')"]'), '⚠ Discard draft on screen beside the tap');
      ok(await vis('#inv-releases button[onclick="invMarkRequestSent(' + EST + ')"]'), 'I’ve sent it on screen');
      has(await txt('#inv-releases'), '1 line waits for somebody to be named to take it', 'the card still names the sofa');
    });

    // ── C ───────────────────────────────────────────────────────────────────
    await section('C. the sofa’s taker typed on its row: it joins what waits for the next request', async () => {
      await typeIn('#inv-row-c .inv-recip', 'Habitat ReStore', 'the sofa’s Who takes it');
      await openBar('releases', EST);
      const card = await txt('#inv-releases');
      lacks(card, 'somebody to be named', 'the sofa no longer waits for a taker');
      has(card, '1 more line awaits written approval and is not on this draft: send the draft, tap I’ve sent it, then send a fresh request.', '⚠ it waits for the next request');
      eq(await p.evaluate((id) => { const j = jobs.find((x) => x.id === id); return draftOutstanding(j, 'approvalRequest'); }, EST), true, 'the draft still waits: nothing on it changed');
    });

    // ── D ───────────────────────────────────────────────────────────────────
    await section('D. the lamp’s value typed on its row: the card flags the draft; the tap and Discard draft stay', async () => {
      await typeIn('#inv-fmv-b', '90', 'the lamp’s Total');
      await openBar('releases', EST);
      const card = await txt('#inv-releases');
      has(card, '1 line on this draft changed after it was made (where it goes, who takes it or its value). Not sent yet? Discard draft, then send a fresh request. Already sent? Tap I’ve sent it.',
        '⚠⚠ the card flags the changed line, and both ways on');
      ok(await vis('#inv-releases button[onclick="invMarkRequestSent(' + EST + ')"]'), '⚠ never a refusal: the tap is still there (the draft may already have gone)');
      ok(await vis('#inv-releases button[onclick="discardApprovalRequestDraft(' + EST + ')"]'), 'and Discard draft');
      has(await relLine(), '1 item on the draft changed since it was made', 'the Releases bar says so');
    });

    // ── E ───────────────────────────────────────────────────────────────────
    await section('E. Discard draft, pressed: asked first, the card forgets it and offers the send; a fresh send carries all three', async () => {
      const before = dialogs.length;
      await press('#inv-releases button[onclick="discardApprovalRequestDraft(' + EST + ')"]', 'Discard draft');
      ok(dialogs.slice(before).some((d) => /^confirm: Discard this draft of the Release Approval Request\?/.test(d)), '⚠ it asked first (' + dialogs.slice(before).join(' | ').slice(0, 160) + ')');
      let rec = await record();
      ok(!!rec && !rec.draftedAt && !rec.req, '⚠⚠ the draft and what it carried are gone');
      eq((rec && rec.staleDrafts || []).map((d) => d.why), ['discarded'], 'kept as discarded');
      await openBar('releases', EST);
      let card = await txt('#inv-releases');
      has(card, 'was discarded on the desk — delete it, don’t send it', 'the card names the draft to delete');
      has(card, '3 lines await written approval; nothing has been sent from the app.', 'all three wait');
      await syncSheet();
      await press('#inv-releases button[onclick="sendApprovalRequest(' + EST + ')"]', 'Send request again');
      await p.waitForTimeout(1500);
      eq(await p.evaluate(() => window.__drafts.length), 2, 'a second draft');
      rec = await record();
      eq(((rec && rec.req && rec.req.stableIds) || []).slice().sort(), ['a', 'b', 'c'], '⚠ the sofa, the lamp and the painting');
      ok(rec && rec.req && typeof rec.req.sig === 'string' && !rec.req.lines, 'recorded with one fingerprint, never a copy of each line');
      await openBar('releases', EST);
      card = await txt('#inv-releases');
      lacks(card, 'changed after it was made', 'the fresh draft carries no flag');
    });

    // ── F ───────────────────────────────────────────────────────────────────
    await section('F. a phone: no horizontal overflow; zero page errors', async () => {
      await p.setViewportSize({ width: 390, height: 844 });
      await p.waitForTimeout(500);
      await toDesk(EST);
      ok(await overflow() <= 0, 'no horizontal overflow at 390 (' + await overflow() + ')');
      eq(errs, [], 'zero page errors');
    });

    await b.close();
    console.log('\nstep110: ' + pass + ' passed, ' + fail + ' failed');
    process.exit(fail ? 1 : 0);
  } catch (e) {
    console.log('step110 crashed: ' + (e && e.stack || e));
    if (b) await b.close().catch(() => {});
    process.exit(1);
  }
})();
