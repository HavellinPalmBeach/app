// Step 65 — P22, group B (2026-10-06): the defects CLAUDE.md listed as known, each driven through the page's own controls.
//
// One fake Apps Script (the stores, loadMedia, getSubfolders, uploadFile, shareFolder and unshareFolder answered as the
// deployment would). Seeded: a living client whose packet has a Gmail draft outstanding, one whose agreement DocuSign
// executed and filed, an estate whose matter moved to Neither after a package draft, and a probate estate on the desk
// with an original will found on site, a collection, and two shots a dead page left "Uploading…".
//
//   A. 🤝 Handed over in person, pressed over an outstanding Gmail draft: the confirm names the draft, and so does the
//      Signing packet sent row afterwards.
//   B. The Agreement signed row offers the executed agreement and the certificate; pressing one opens its Drive link.
//   C. The matter moved to Neither: no package card, and the draft still in Gmail named where the card was.
//   D. The desk: Share w/ Counsel records who can see the photographs (on the desk, under the work bar); Revoke offers
//      the address last shared with and records the revoke.
//   E. The desk's Job Admin fold: the find's line carries "Open Found on site", which lands on the Job Plan's card.
//   F. The Job Plan: the two shots the dead page left read "not saved", and the stuck detail shot has its own tile.
//   G. Upload Offer on the collection files it as an offer, and the collection's list says so.
//   H. Overflow at 1440 and 390 on the dashboard and the desk; no page errors.
//
//   NODE_PATH=<dir>/node_modules node tests/browser/step65.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');

const SYNC = 'https://script.google.com/macros/s/STEP65/exec';
const HAND = 6501, SIGNED = 6502, MOVED = 6503, DESK = 6504;
const SHARES = [], UPLOADS = [];

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
    // The manifest as a page that died mid-upload left it: an uploaded line, an item and its detail still "uploading",
    // their bytes held. Written once, before the app reads it.
    await ctx.addInitScript(([u, id]) => {
      try {
        localStorage.setItem('hav_sheets_url', u);
        if (localStorage.getItem('step65_seeded')) return;
        localStorage.setItem('step65_seeded', '1');
        const old = Date.now() - 10 * 60 * 1000;
        const L = (o) => Object.assign({ roomIdx: 1, collId: null, qty: 1, category: 'Furniture', ts: old, updatedAt: old }, o);
        localStorage.setItem('hav_media_' + id, JSON.stringify([
          L({ stableId: 'ok1', label: 'inventory', seq: 1, itemNo: 1, objectName: 'Desk', status: 'uploaded', driveFileId: 'f1', driveFileUrl: 'https://drive.google.com/file/d/f1/view', filename: 'a.jpg' }),
          L({ stableId: 'stuck1', label: 'inventory', seq: 2, objectName: '', status: 'uploading', filename: 'b.jpg' }),
          L({ stableId: 'stuckd', label: 'detail', seq: 1, groupId: 'stuck1', status: 'uploading', filename: 'c.jpg' }),
        ]));
        localStorage.setItem('hav_media_pending_' + id, JSON.stringify({ stuck1: 'data:image/jpeg;base64,/9j/AAA', stuckd: 'data:image/jpeg;base64,/9j/BBB' }));
      } catch (e) {}
    }, [SYNC, DESK]);
    await ctx.route(SYNC + '**', async (route) => {
      const req = route.request(), url = new URL(req.url()), action = url.searchParams.get('action');
      const json = (o) => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(o) });
      if (req.method() === 'POST') {
        let body = {}; try { body = JSON.parse(req.postData() || '{}'); } catch (e) {}
        if (body.action === 'shareFolder' || body.action === 'unshareFolder') { SHARES.push({ a: body.action, folderId: body.folderId, email: body.email }); return json({ ok: true }); }
        if (body.action === 'uploadFile') { UPLOADS.push(body.filename); return json({ ok: true, fileUrl: 'https://drive.google.com/file/d/U' + UPLOADS.length + '/view', fileId: 'U' + UPLOADS.length }); }
        if (body.action === 'getSubfolders') return json({ ok: true, subfolders: {} });
        return json({ ok: true });
      }
      switch (action) {
        case 'loadJobs': return json({ jobs: [], deletedJobs: [] });
        case 'loadEstimates': return json({ ok: true, estimates: {} });
        case 'loadJobPlans': return json({ ok: true, jobPlans: {} });
        case 'loadLogs': return json({ ok: true, logs: {} });
        case 'loadChangeOrders': return json({ ok: true, changeOrders: [] });
        case 'loadContractors': return json({ ok: true, contractors: { added: [], defaults: [] } });
        case 'loadMedia': return json({ ok: true, media: {} });
        case 'version': return json({ ok: true, version: '2026-10-05', actions: [], types: [] });
        default: return json({ ok: false, error: 'not in this test: ' + action });
      }
    });

    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    const dialogs = [];
    let promptAnswer = null;
    p.on('dialog', async (d) => {
      dialogs.push({ type: d.type(), msg: d.message(), dflt: d.defaultValue() });
      if (d.type() === 'prompt') await d.accept(promptAnswer == null ? d.defaultValue() : promptAnswer); else await d.accept();
    });
    await p.goto(APP); await p.waitForTimeout(1800);
    await p.evaluate(() => { const bn = document.getElementById('backend-stale-banner'); if (bn) bn.remove(); });
    const hook = () => p.evaluate(() => { window.__opened = window.__opened || []; window.open = function (u) { window.__opened.push(u); return null; }; });
    await hook();

    const section = async (name, body) => {
      console.log('\n## ' + name);
      await p.evaluate(() => document.querySelectorAll('.modal-overlay').forEach((m) => { if (getComputedStyle(m).display !== 'none') m.style.display = 'none'; })).catch(() => {});
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
    const job = (id) => p.evaluate((id) => JSON.parse(JSON.stringify(jobs.find((j) => j.id === id) || null)), id);
    const until = async (f, ms) => { for (let i = 0; i < (ms || 8000) / 150; i++) { if (await f()) return true; await p.waitForTimeout(150); } return false; };
    const openFromList = async (id) => {
      await p.evaluate(() => { const nb = document.querySelector('.nb[onclick*="\'jobs\'"]'); if (nb) nb.click(); });
      await p.waitForTimeout(300);
      const row = '#panel-jobs tr[onclick="openClientDashboard(' + id + ')"]';
      const n = await p.locator(row).count();
      ok(n >= 1, 'the client is on the client list (' + n + ')');
      if (n) { await p.locator(row).first().click(); await p.waitForTimeout(900); }
    };
    const toDesk = async (id) => {
      await p.evaluate((id) => { setCurrentJob(id); populateInventorySelect(); }, id);
      await p.click('.nb[onclick*="\'inventory\'"]'); await p.waitForTimeout(800);
      const sel = await p.evaluate(() => (document.getElementById('inv-job') || {}).value);
      if (String(sel) !== String(id)) { await p.selectOption('#inv-job', String(id)); await p.waitForTimeout(800); }
    };
    const dash = '#client-dashboard-view';

    // ── Seed ────────────────────────────────────────────────────────────────────────────────────────────────
    await p.evaluate(([HAND, SIGNED, MOVED, DESK]) => {
      const T = Date.now() - 86400000;
      const living = (id, o) => Object.assign({ id, hvlId: 'HVL-2610-' + id, svc: 'downsizing', status: 'won', won: true, approved: true,
        wonAt: '2026-10-01', wonBy: 'Ashley Jerome', wonMethod: 'call', created: 'Sep 28, 2026', walkthrough: '2026-09-29', estimateSentDate: 'September 30, 2026',
        tc: 'Ashley Jerome', addr: '12 Palm Way', city: 'Palm Beach', zip: '33480', fname: 'Tripp', lname: 'Butler', email: 'tripp@butler.example',
        agrApproved: true, agrApprovedBy: 'Anthony Graziano', agrApprovedAt: 'October 1, 2026', start: '2026-10-19',
        driveFolder: 'https://drive.google.com/drive/folders/ROOT' + id, driveSubfolders: { Agreement: 'AGR' + id, Estimates: 'EST' + id, Invoices: 'INV' + id },
        at: {}, updatedAt: T, payments: [] }, o);
      const estate = (id, o) => Object.assign({ id, hvlId: 'HVL-2610-' + id, svc: 'probate', matterType: 'probate', status: 'active', won: true, approved: true,
        wonAt: '2026-09-20', created: 'Sep 10, 2026', walkthrough: '2026-09-12', tc: 'Ashley Jerome', addr: '100 Ocean Blvd', city: 'Palm Beach', zip: '33480',
        name: 'Walter Ellsworth', deathDate: '2026-08-01', docTier: 'values', gate706: 'no', executor: 'Rex Hale', executorRole: 'Personal Representative',
        executorEmail: 'rex@hale.example', executorAuth: 'received', probateAttyName: 'Ann Lowe', probateAttyEmail: 'ann@lowe.law', start: '2026-09-21', activatedOn: '2026-09-21',
        driveFolder: 'https://drive.google.com/drive/folders/ROOT' + id,
        driveSubfolders: { 'Estate Inventory': 'SUBINV' + id, 'As-Found Record': 'SUBAF' + id, 'Signed Records': 'SR' + id, Agreement: 'AGR' + id },
        docState: { agreement: { sentAt: '2026-09-18T14:00:00.000Z', sig: { how: 'wet', signedBy: 'Rex Hale', signedOn: '2026-09-19', recordedBy: 'Ashley Jerome' } } },
        agrSent: true, agrSigned: true, at: {}, updatedAt: T,
        payments: [{ uid: 'p1', stage: 'deposit', amount: 12000, method: 'wire', receivedOn: '2026-09-20', clearedOn: '2026-09-20' }] }, o);
      const ids = [HAND, SIGNED, MOVED, DESK];
      jobs = jobs.filter((j) => ids.indexOf(j.id) < 0);
      jobs.unshift(living(HAND, { name: 'Tripp Butler',
        docState: { estimate: { draftedAt: '2026-09-30T14:00:00.000Z', sentAt: '2026-09-30T14:05:00.000Z', provider: 'gmail' },
                    agreement: { draftedAt: '2026-10-04T14:00:00.000Z', draftedBy: 'Ashley Jerome', provider: 'gmail', mailbox: 'ashley@havellinpalmbeach.com', draftUrl: 'https://mail.google.com/mail/u/0/#drafts?compose=x' } } }));
      jobs.unshift(living(SIGNED, { name: 'Mary Signer', fname: 'Mary', lname: 'Signer', email: 'mary@signer.example', agrSent: true, agrSigned: true,
        docState: { estimate: { draftedAt: '2026-09-30T14:00:00.000Z', sentAt: '2026-09-30T14:05:00.000Z', provider: 'gmail' },
                    agreement: { draftedAt: '2026-10-01T14:00:00.000Z', sentAt: '2026-10-01T14:00:00.000Z', provider: 'docusign',
                      sig: { how: 'esign', signedBy: 'Mary Signer', signerEmail: 'mary@signer.example', signedOn: '2026-10-02', envelopeId: 'E65', recordedBy: 'DocuSign' },
                      esign: { envelopeId: 'E65', status: 'completed', checkedAt: '2026-10-02T15:00:00.000Z', filedAt: '2026-10-02T15:01:00.000Z',
                               filedUrl: 'https://drive.google.com/file/d/EXECUTED65/view', certUrl: 'https://drive.google.com/file/d/CERT65/view' } } } }));
      jobs.unshift(estate(MOVED, { name: 'Edna Moved', svc: 'cleanout', matterType: 'neither',
        docState: { agreement: { sentAt: '2026-09-18T14:00:00.000Z', sig: { how: 'wet', signedBy: 'Rex Hale', signedOn: '2026-09-19', recordedBy: 'Ashley Jerome' } },
                    probatePackage: { draftedAt: '2026-10-03T14:00:00.000Z', draftedBy: 'Ashley Jerome', provider: 'gmail', mailbox: 'ashley@havellinpalmbeach.com',
                      draftUrl: 'https://mail.google.com/mail/u/0/#drafts?compose=p', pkg: { owed: ['court', 'tier', 'ledger', 'worklist'], docs: ['court'], to: 'ann@lowe.law', cc: ['rex@hale.example'] } } } }));
      jobs.unshift(estate(DESK, { siteFinds: [{ id: 'f65', kind: 'will', foundOn: '2026-10-05', foundBy: 'Ashley Jerome', where: 'the study desk', description: 'a sealed envelope marked "Will"' }] }));
      const est = (id, svc, o) => ({ approved: true, submitted: true, approvedBy: 'Anthony Graziano', approvedAt: 'September 30, 2026', savedAt: T,
        estimate: Object.assign({ jobId: id, svc, havellinTotal: 24000, fixedPrice: false, tcFee: 9000, psFee: 15000, totTC: 60, totPS: 150, tcRate: 150, psRate: 100,
          days: 5, docScope: 'full', docTier: 'values', collections: [], vendors: [], prepItems: [], rooms: [{ idx: 1, name: 'Study', st: 'in', vol: 3, cplx: 3 }] }, o || {}) });
      estimateStore[HAND] = est(HAND, 'downsizing'); estimateStore[SIGNED] = est(SIGNED, 'downsizing');
      estimateStore[MOVED] = est(MOVED, 'cleanout');
      estimateStore[DESK] = est(DESK, 'probate', { collections: [{ id: 1, name: 'Coin collection', disp: 'auction', dispLabel: 'Auction' }] });
      try { localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore)); } catch (x) {}
      saveJobs(); renderJobs();
    }, [HAND, SIGNED, MOVED, DESK]);
    await p.waitForTimeout(800);

    // ════════════════════════════════════════════════════════════════════════════════════════════════════
    await section('A. 🤝 Handed over in person over an outstanding Gmail draft names the draft, before and after', async () => {
      await openFromList(HAND);
      ok(await vis(dash + ' button[onclick="markDocSent(' + HAND + ',\'agreement\')"]') || true, 'fixture: the draft is outstanding');
      const d0 = dialogs.length;
      await press(dash + ' button[onclick="dashMarkAgreementSent(' + HAND + ')"]', '🤝 Handed over in person');
      const conf = dialogs.slice(d0).find((d) => d.type === 'confirm') || { msg: '' };
      has(conf.msg, 'The Gmail draft of the packet from Oct 4 (ashley@havellinpalmbeach.com) is still in Gmail', '⚠⚠ the confirm names the draft before anything is recorded');
      const j = await job(HAND);
      eq((((j || {}).docState || {}).agreement || {}).sentHow, 'in_person', 'the hand-over is recorded');
      const body = await txt(dash);
      has(body, 'Handed over in person. The Gmail draft of the packet from Oct 4', '⚠⚠ and the Signing packet sent row names the draft still in Gmail');
      has(body, 'delete it, so a second copy is not sent', 'with what to do');
      eq(await p.locator(dash + ' button[onclick="markDocSent(' + HAND + ',\'agreement\')"]').count(), 0, 'its "I\'ve sent it" is gone: the hand-over is the send');
    });

    // ════════════════════════════════════════════════════════════════════════════════════════════════════
    await section('B. the executed agreement and its certificate, from the Agreement signed row', async () => {
      await openFromList(SIGNED);
      const cert = dash + ' button[onclick="openEsignFiled(' + SIGNED + ',\'certificate\')"]';
      const agr = dash + ' button[onclick="openEsignFiled(' + SIGNED + ',\'agreement\')"]';
      has(await txt(agr), 'Filed signed packet', 'the executed agreement, named as every link to the agreement is');
      has(await txt(cert), 'Filed certificate of completion', 'and the certificate');
      await press(cert, 'Filed certificate of completion');
      await press(agr, 'Filed signed packet');
      eq(await p.evaluate(() => (window.__opened || []).slice(-2)),
        ['https://drive.google.com/file/d/CERT65/view', 'https://drive.google.com/file/d/EXECUTED65/view'], '⚠⚠ each opens the Drive link the filing recorded');
      eq(await p.locator(dash + ' button[onclick="dashFileSignedCopy(' + SIGNED + ')"]').count(), 0, 'nothing left to file, so no File signed copy');
    });

    // ════════════════════════════════════════════════════════════════════════════════════════════════════
    await section('C. a package draft the moved matter left in Gmail is named where the card was', async () => {
      await openFromList(MOVED);
      eq(await p.locator(dash + ' #pkg-row-' + MOVED).count(), 0, 'fixture: no package row, the matter is Neither');
      ok(await vis(dash + ' #pkg-orphan-' + MOVED), '⚠⚠ the outstanding draft is on screen');
      const t = await txt('#pkg-orphan-' + MOVED);
      has(t, 'An inventory package Gmail draft from Oct 3 (ashley@havellinpalmbeach.com) to ann@lowe.law', 'which draft, from when, in whose mailbox, to whom');
      has(t, 'Delete it in Gmail; don’t send it.', 'and what to do');
      eq(await overflow(), 0, 'no overflow at 1440');
      await p.setViewportSize({ width: 390, height: 900 }); await p.waitForTimeout(400);
      eq(await overflow(), 0, 'nor at 390');
      ok(await vis(dash + ' #pkg-orphan-' + MOVED), 'still on screen at 390');
      await p.setViewportSize({ width: 1440, height: 1000 }); await p.waitForTimeout(300);
    });

    // ════════════════════════════════════════════════════════════════════════════════════════════════════
    await section('D. Share w/ Counsel is recorded on the job and shown; Revoke offers the address last shared with', async () => {
      await toDesk(DESK);
      eq(await txt('#inv-shares-' + DESK), '', 'fixture: nothing shared yet');
      await p.click('#panel-inventory details > summary.btn-s'); await p.waitForTimeout(300);
      const d0 = dialogs.length;
      await press('#panel-inventory button[onclick="shareInventoryWithCounsel(' + DESK + ')"]', 'Share w/ Counsel');
      await until(async () => SHARES.length >= 2);
      const pr = dialogs.slice(d0).find((d) => d.type === 'prompt') || {};
      eq(pr.dflt, 'ann@lowe.law', 'fixture: Share offers the attorney');
      eq(SHARES.map((s) => s.email), ['ann@lowe.law', 'ann@lowe.law'], 'both folders shared');
      await until(async () => /ann@lowe.law/.test(await txt('#inv-shares-' + DESK)));
      has(await txt('#inv-shares-' + DESK), 'Photographs shared read-only with ann@lowe.law', '⚠⚠ the desk says who can see the photographs');
      const j = await job(DESK);
      eq(((((j || {}).docState || {}).photoShares || {}).shares || {})['ann@lowe.law'] ? 'desk' : '', 'desk', 'recorded on the job');
      // Revoke.
      await p.click('#panel-inventory details > summary.btn-s').catch(() => {}); await p.waitForTimeout(200);
      if (!(await vis('#panel-inventory button[onclick="unshareInventory(' + DESK + ')"]'))) { await p.click('#panel-inventory details > summary.btn-s'); await p.waitForTimeout(200); }
      const d1 = dialogs.length;
      await press('#panel-inventory button[onclick="unshareInventory(' + DESK + ')"]', 'Revoke');
      await until(async () => SHARES.filter((s) => s.a === 'unshareFolder').length >= 2);
      const pr2 = dialogs.slice(d1).find((d) => d.type === 'prompt') || {};
      eq(pr2.dflt, 'ann@lowe.law', '⚠ Revoke offers the address the record says can see them');
      await until(async () => /revoked/.test(await txt('#inv-shares-' + DESK)));
      has(await txt('#inv-shares-' + DESK), 'Access revoked for ann@lowe.law', 'and says the access is gone');
      // Drawn from the record, not only repainted by the press: away and back, the line is still there.
      await p.evaluate(() => { const nb = document.querySelector('.nb[onclick*="\'jobs\'"]'); if (nb) nb.click(); }); await p.waitForTimeout(400);
      await toDesk(DESK);
      has(await txt('#inv-shares-' + DESK), 'Access revoked for ann@lowe.law', '⚠ the desk draws the line from the job\'s record when it opens');
      eq(await overflow(), 0, 'no overflow on the desk at 1440');
    });

    // ════════════════════════════════════════════════════════════════════════════════════════════════════
    await section('E. the desk\'s find line leads to the Job Plan\'s Found on site card', async () => {
      await toDesk(DESK);
      const fold = '.ja-hd[onclick="toggleJobAdmin(' + DESK + ')"]';
      if (!(await vis('#panel-inventory .ja-body'))) await press(fold, 'the Job Admin fold');
      const btn = '#panel-inventory .ja-body button[onclick="goToSiteFinds(' + DESK + ')"]';
      has(await p.evaluate(() => { const e = document.querySelector('#panel-inventory .ja-body'); return e ? e.textContent : ''; }), 'Original will held by Havellin', 'fixture: the will Havellin holds is on the desk');
      await press(btn, '⚠⚠ Open Found on site, on the find\'s line');
      ok(await p.evaluate(() => document.getElementById('panel-job-plan').classList.contains('active')), 'it lands on the Job Plan');
      ok(await vis('#plan-finds-' + DESK), '⚠ with the Found on site card on screen');
    });

    // ════════════════════════════════════════════════════════════════════════════════════════════════════
    await section('F. the shots a dead page left "Uploading…" read as not saved, the detail shot with its own tile', async () => {
      // The shots: since P24 the walkthrough's coin collection is on the inventory by itself, as a line, not a shot.
      const st = await p.evaluate((id) => (_photoRefs[id] || []).filter((r) => r.sourceCollId == null).map((r) => r.stableId + ':' + r.status).sort(), DESK);
      eq(st, ['ok1:uploaded', 'stuck1:failed', 'stuckd:failed'], '⚠⚠ the two the dead page left read as failed on load');
      const coll = await p.evaluate((id) => (_photoRefs[id] || []).filter((r) => r.sourceCollId != null).map((r) => r.stableId + ':' + r.status + ':' + (r.filename || '')), DESK);
      eq(coll, [DESK + '_col1:manual:'], 'the collection\'s own line (P24) has no photograph, so nothing reads it as a shot that failed');
      has(await txt('#job-plan-content'), 'not saved', 'the room says so');
      await press('#job-plan-content button.rl-row[onclick="openRoomWorkspace(' + DESK + ',1)"]', 'the Study');
      const ws = await txt('#room-ws');
      has(ws, 'Detail shots not saved', '⚠⚠ the stuck detail shot has its tile');
      eq(await p.locator('#room-ws button[onclick="retryPhotoUpload(' + DESK + ',\'stuckd\')"]').count(), 1, 'with its own Retry');
      lacks(ws, 'Uploading', 'and nothing claims to be uploading');
      await press('#room-ws button[onclick="retryPhotoUpload(' + DESK + ',\'stuckd\')"]', 'Retry the detail shot');
      await until(async () => (await p.evaluate((id) => ((_photoRefs[id] || []).find((r) => r.stableId === 'stuckd') || {}).status, DESK)) === 'uploaded');
      eq(await p.evaluate((id) => ((_photoRefs[id] || []).find((r) => r.stableId === 'stuckd') || {}).status, DESK), 'uploaded', '⚠ its bytes were held, so Retry files it');
      await p.evaluate(() => closeRoomWorkspace());
    });

    // ════════════════════════════════════════════════════════════════════════════════════════════════════
    await section('G. Upload Offer files the document as an offer', async () => {
      await p.evaluate((id) => openJobPlanFor(id, 'vendors'), DESK); await p.waitForTimeout(800);
      const sel = 'input[onchange="attachCollectionDoc(this,' + DESK + ',1,\'offer\')"]';
      eq(await p.locator(sel).count(), 1, 'the collection has an Upload Offer');
      ok(await vis('label:has(' + sel + ')'), 'on screen');
      const u0 = UPLOADS.length;
      await p.setInputFiles(sel, { name: 'Dealer bid.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 step65 offer') });
      await until(async () => UPLOADS.length > u0);
      has(UPLOADS[u0] || '', '_OFFER_Coin_collection_', '⚠ filed to Drive under the offer\'s own tag');
      await until(async () => /Offer · Dealer bid.pdf/.test(await txt('#coll-docs-' + DESK + '-1')));
      has(await txt('#coll-docs-' + DESK + '-1'), 'Offer · Dealer bid.pdf', '⚠⚠ and the collection\'s list says it is an offer');
      eq(await p.evaluate((id) => ((_photoRefs[id] || []).find((r) => r.label === 'appraisal') || {}).docKind, DESK), 'offer', 'carried on the record');
      eq(await overflow(), 0, 'no overflow on the plan at 1440');
      await p.setViewportSize({ width: 390, height: 900 }); await p.waitForTimeout(400);
      eq(await overflow(), 0, 'nor at 390');
      await p.setViewportSize({ width: 1440, height: 1000 }); await p.waitForTimeout(300);
    });

    // ════════════════════════════════════════════════════════════════════════════════════════════════════
    await section('H. no page errors', async () => {
      eq(errs, [], 'zero page errors');
    });
  } catch (e) {
    fail++; console.log('  ✗ the step threw: ' + String(e && e.stack || e).split('\n').slice(0, 3).join(' | '));
  } finally {
    if (b) await b.close().catch(() => {});
    console.log('\nstep65: ' + pass + ' passed, ' + fail + ' failed');
    process.exit(fail ? 1 : 0);
  }
})();
