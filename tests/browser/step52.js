// Step 52 — P18 · W-A, the trust package (2026-10-02): Anthony's answer A ("1 - yes").
//
// Drives the REAL page through its own controls against one fake Apps Script (its jobs and estimates stores, loadMedia,
// getSubfolders, uploadHtml, htmlToPdf and shareFolder answered as the deployment would) and the Gmail API, routed, as
// step 51 does. What is seeded is state a person could not type in one sitting: an active estate on each matter type,
// each with an inventory on the sheet.
//
//   A. A trust-only estate shows the Trust card (Trust Information; Trustee's Attorney; Trustee; no case number, court
//      deadline or authorization chip, though the record still carries a case number). 📧 Send trust package: the
//      inventory read from the sheet, both photograph folders shared with the trustee's attorney, one Gmail draft to
//      the attorney copying the trustee and agreements@, the Trust Schedule attached and no Court Inventory, no court
//      in its words; then ✓ I've sent it, and the card says who sent it and to whom.
//   B. The same estate with no attorney recorded: the card names the trustee, and the draft goes to the trustee,
//      copying agreements@ alone, greeting the trustee, with the Trust Schedule attached.
//   C. A Neither estate shows no card and no package.
//   D. A probate estate is unchanged: the Probate card, its chip and case number, 📧 Send probate package, a draft to
//      the estate attorney with the Court Inventory attached.
//   E. overflow at 1440 and 390 with the Trust card on screen, its button on screen at 390; no page errors.
//
//   NODE_PATH=/opt/node22/lib/node_modules node tests/browser/step52.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');

const SYNC = 'https://script.google.com/macros/s/STEP52/exec';
const BOX = 'anthony@havellinpalmbeach.com';
const AGREEMENTS = 'agreements@havellinpalmbeach.com';
const STORE = { jobs: [], estimates: {}, media: {} };
const POSTS = [];             // every action or type posted, in order
const UPLOADS = [], PDFS = [], SHARES = [], DRAFTS = [];

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
    await ctx.addInitScript((u) => { try { localStorage.setItem('hav_sheets_url', u); } catch (e) {} }, SYNC);
    await ctx.route(SYNC + '**', async (route) => {
      const req = route.request(), url = new URL(req.url()), action = url.searchParams.get('action');
      const json = (o) => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(o) });
      if (req.method() === 'POST') {
        let body = {}; try { body = JSON.parse(req.postData() || '{}'); } catch (e) {}
        POSTS.push(body.type || body.action || '?');
        if (body.type === 'saveAllJobs') { STORE.jobs = body.payload || []; return json({ ok: true }); }
        if (body.type === 'saveAllEstimates') { Object.assign(STORE.estimates, body.payload || {}); return json({ ok: true }); }
        if (body.action === 'getSubfolders') return json({ ok: true, subfolders: {} });
        if (body.action === 'uploadHtml') {
          UPLOADS.push({ folderId: body.folderId, filename: body.filename, html: body.html });
          return json({ ok: true, fileUrl: 'https://drive.google.com/file/d/up' + UPLOADS.length + '/view', fileId: 'up' + UPLOADS.length });
        }
        if (body.action === 'htmlToPdf') { PDFS.push(body.html); return json({ ok: true, base64: Buffer.from('%PDF-1.4 step52 #' + PDFS.length + ' ' + 'x'.repeat(120)).toString('base64') }); }
        if (body.action === 'shareFolder') { SHARES.push({ folderId: body.folderId, email: body.email }); return json({ ok: true, url: 'https://drive.google.com/drive/folders/' + body.folderId }); }
        return json({ ok: true });
      }
      switch (action) {
        case 'loadJobs': return json({ jobs: STORE.jobs, deletedJobs: [] });
        case 'loadEstimates': return json({ ok: true, estimates: STORE.estimates });
        case 'loadJobPlans': return json({ ok: true, jobPlans: {} });
        case 'loadLogs': return json({ ok: true, logs: {} });
        case 'loadChangeOrders': return json({ ok: true, changeOrders: [] });
        case 'loadContractors': return json({ ok: true, contractors: { added: [], defaults: [] } });
        case 'loadMedia': {
          const id = url.searchParams.get('jobId');
          return json({ ok: true, media: id ? { [id]: STORE.media[id] || { items: [] } } : STORE.media });
        }
        case 'version': return json({ ok: false, error: 'Unknown action' });
        default: return json({ ok: false, error: 'not in this test: ' + action });
      }
    });
    await ctx.route('https://gmail.googleapis.com/gmail/v1/users/me/drafts', async (r) => {
      const body = JSON.parse(r.request().postData() || '{}');
      DRAFTS.push(Buffer.from(String(body.message && body.message.raw || '').replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'r-' + DRAFTS.length, message: { id: 'm-' + DRAFTS.length } }) });
    });
    await ctx.route('https://www.googleapis.com/oauth2/v3/userinfo', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ email: BOX }) }));

    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    p.on('dialog', async (d) => { await d.accept(); });
    await p.goto(APP); await p.waitForTimeout(1800);
    // A headless browser has no Google sign-in popup and no second tab: the token is handed over (the Gmail API is
    // routed) and window.open is caught.
    const hook = () => p.evaluate(() => { window.gmailAuth = function (cb) { cb('tok-step52'); }; window.__opened = window.__opened || [];
      window.open = function (u) { window.__opened.push(String(u)); return null; }; });
    await hook();

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
    // The card that carries a package row: the row's own card, read alone.
    const cardTxt = (id) => p.evaluate((id) => { const r = document.getElementById('pkg-row-' + id); const c = r && r.closest('.card');
      return c ? c.textContent.replace(/\s+/g, ' ').trim() : ''; }, id);
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const job = (id) => p.evaluate((id) => JSON.parse(JSON.stringify(jobs.find((j) => j.id === id) || null)), id);
    const settle = async () => {
      for (let i = 0; i < 60; i++) {
        await p.waitForTimeout(150);
        const idle = await p.evaluate(() => !_outboxSending && !_flushing && !_outboxTimer && !Object.keys(_outbox).length && !Object.keys(_pendingWrites).length);
        if (idle) return true;
      }
      return false;
    };
    const until = async (f, ms) => { for (let i = 0; i < (ms || 8000) / 150; i++) { if (await f()) return true; await p.waitForTimeout(150); } return false; };
    const openFromList = async (id) => {
      await p.evaluate(() => { const nb = document.querySelector('.nb[onclick*="\'jobs\'"]'); if (nb) nb.click(); });
      await p.waitForTimeout(300);
      const row = '#panel-jobs tr[onclick="openClientDashboard(' + id + ')"]';
      const n = await p.locator(row).count();
      ok(n >= 1, 'the client is on the client list (' + n + ')');
      if (n) { await p.locator(row).first().click(); await p.waitForTimeout(900); }
      await hook();
    };
    const dash = '#client-dashboard-view';

    async function seed(j, est) {
      await p.evaluate(([j, est]) => {
        jobs.unshift(j);
        if (est) { estimateStore[j.id] = { approved: true, approvedBy: 'Anthony Graziano', approvedAt: 'September 20, 2026', estimate: est, savedAt: Date.now() };
          try { localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore)); } catch (x) {}
          postSyncBadge({ type: 'saveAllEstimates', payload: estimateStore }, 'ok', 'fail'); }
        saveJobs(); renderJobs();
      }, [j, est]);
      await settle();
    }
    const EST = (id, svc) => ({ jobId: id, svc: svc, havellinTotal: 24000, fixedPrice: false, rooms: [{ idx: 1, name: 'Study', st: 'in', vol: 3, cplx: 3 }],
      vendors: [], prepItems: [], totTC: 40, totPS: 60, tcRate: 150, psRate: 100 });
    // An active estate, signed and funded, administered by a successor trustee. ⚠ It still carries a case number and a
    // court deadline from an earlier answer to the matter question: neither may reach the Trust card or the email.
    const BASE = (id, o) => Object.assign({
      id, hvlId: 'HVL-00' + id, name: 'Walter Ellsworth ' + id, svc: 'cleanout', status: 'active', won: true, approved: true, wonAt: '2026-09-21', wonBy: 'Ashley Jerome', wonMethod: 'email',
      addr: '69 Beach Blvd', city: 'Palm Beach', zip: '33480', tc: 'Ashley Jerome', agrApprovedBy: 'Anthony Graziano', agrApproved: true, agrApprovedAt: 'September 21, 2026',
      matterType: 'trust', docTier: 'values', deathDate: '2026-08-01', probateCase: '2026-CP-0099' + id, probateDeadline: '2026-11-20', executorAuth: 'pending',
      executor: 'Rex Hale', executorRole: 'Successor Trustee', executorEmail: 'rex@hale.example', executorPhone: '(561) 555-0101',
      probateAttyName: 'Ann Lowe', probateAttyFirm: 'Lowe & Co', probateAttyEmail: 'ann@lowe.law', probateAttyPhone: '(561) 555-0102',
      estimateSentDate: 'September 20, 2026', walkthrough: '2026-09-15', start: '2026-09-28', docLevel: 'standard',
      driveFolder: 'https://drive.google.com/drive/folders/ROOT' + id,
      driveSubfolders: { 'Estate Inventory': 'INV' + id, 'As-Found Record': 'AF' + id, 'Agreement': 'AGR' + id },
      agrSigned: true, agrSent: true,
      docState: { estimate: { draftedAt: '2026-09-20T14:00:00.000Z', sentAt: '2026-09-20T14:05:00.000Z', provider: 'gmail' },
        agreement: { sentAt: '2026-09-21T14:00:00.000Z', draftedAt: '2026-09-21T13:00:00.000Z', provider: 'gmail',
          sig: { how: 'wet', signedBy: 'Rex Hale', signedOn: '2026-09-22', provider: 'manual', recordedBy: 'Anthony Graziano', recordedAt: '2026-09-22T15:00:00.000Z' } } },
      at: {}, updatedAt: Date.now() - 86400000, payments: [{ id: 1, uid: 'p-' + id, stage: 'deposit', amount: 12000, method: 'wire', receivedOn: '2026-09-23', clearedOn: '2026-09-23' }],
      depositReceived: true, activatedOn: '2026-09-28',
    }, o || {});
    const T0 = Date.now() - 3 * 86400000;
    const MEDIA = (id) => ({ items: [
      { stableId: 'a' + id, label: 'inventory', collId: null, roomIdx: 1, status: 'uploaded', ts: T0, updatedAt: T0, itemNo: 1, objectName: 'Sargent portrait',
        category: 'Art & Décor', qty: 1, condition: 'Good', fmv: 48000, valSource: 'Appraisal', disposition: 'Auction', channel: 'Christie’s',
        authBy: 'Rex Hale', approvalDate: '2026-09-25', driveFileId: 'fa' + id, driveFileUrl: 'https://drive.google.com/file/d/fa' + id + '/view',
        custodyLog: [{ cid: 'c1', at: T0, action: 'Released', party: 'Christie’s', date: '2026-09-26', method: 'Courier', receipt: 'CH-0091' }] },
      { stableId: 'b' + id, label: 'inventory', collId: null, roomIdx: 1, status: 'uploaded', ts: T0, updatedAt: T0, itemNo: 2, objectName: 'Dining chairs (8)',
        category: 'Furniture', qty: 8, condition: 'Good', fmv: '', driveFileId: 'fb' + id, driveFileUrl: 'https://drive.google.com/file/d/fb' + id + '/view' },
      { stableId: 'd' + id, label: 'appraisal', collId: '3', roomIdx: null, status: 'uploaded', ts: T0, objectName: 'Christies appraisal.pdf',
        filename: 'HVL-00' + id + '_APPRSL_Art_1.pdf', driveFileUrl: 'https://drive.google.com/file/d/APPR' + id + '/view' }] });
    // A Gmail draft's headers, attachments and plain-text body, read back the way a mail client does.
    const readDraft = (mime) => {
      const head = (n) => ((new RegExp('^' + n + ': (.*)$', 'm')).exec(mime) || [])[1] || '';
      const alt = (/boundary="(ALT-[^"]+)"/.exec(mime) || [])[1];
      const parts = alt ? mime.split('--' + alt) : [];
      const dec = (q) => q ? Buffer.from(q.slice(q.indexOf('\r\n\r\n') + 4).replace(/\r\n/g, ''), 'base64').toString('utf8') : '';
      return { to: head('To'), cc: head('Cc'), names: [...mime.matchAll(/filename="([^"]+)"/g)].map((m) => m[1].replace(/ - 69 Beach Blvd - .*$/, '')),
        text: dec(parts[1]), html: dec(parts[2]), crlf: (mime.match(/(^|[^\r])\n/g) || []).length === 0 };
    };
    const sendAndRead = async (id, label) => {
      const d0 = DRAFTS.length;
      await press(dash + ' #pkg-row-' + id + ' button[onclick*="sendProbatePackage(' + id + ')"]', label);
      await until(async () => DRAFTS.length > d0 && !!((((await job(id)) || {}).docState || {}).probatePackage || {}).draftedAt, 20000);
      eq(DRAFTS.length - d0, 1, '⚠⚠ one Gmail draft');
      return readDraft(DRAFTS[d0] || '');
    };

    // ════════════════════════════════════════════════════════════════════════════════════════════════════
    await section('A. a trust-only estate: the Trust card, and its package to the trustee\'s attorney', async () => {
      STORE.media[61] = MEDIA(61);
      await seed(BASE(61), EST(61, 'cleanout'));
      await openFromList(61);
      ok(await vis(dash + ' #pkg-row-61'), '⚠⚠ a trust-only matter has a package row now');
      const card = await cardTxt(61);
      has(card, 'Trust Information', 'on a card named for trust matters');
      lacks(await txt(dash), 'Probate Information', 'and no Probate card');
      has(card, 'Trustee’s Attorney', 'the attorney block, headed for the trustee\'s attorney');
      has(card, 'Ann Lowe', 'with the attorney recorded');
      has(card, 'Successor Trustee', 'and the trustee, with their role');
      // RESTATED 2026-10-03 (P19): 'blocker' came off this list. The successor trustee's Certification of Trust is a gate on
      // a trust job since P19 (Anthony's call 1), so the Trust card carries its chip, named for the paper — never
      // "Authorization", which is the Letters' word and stays off. No court record, as before.
      ['Case number', '2026-CP-009961', 'Court deadline', 'Authorization'].forEach((w) => lacks(card, w, '⚠ no court record or Letters chip on the Trust card: ' + w));
      has(card, 'Certification of Trust pending — blocker', 'its chip names the Certification of Trust (P19)');
      has(card, 'Trust package', 'the row is labelled for the trust route');
      has(card, 'Carries the Trust Schedule, Estate Inventory Report and Appraisal Worklist', 'it says what it carries before it goes');
      has(card, 'to ann@lowe.law.', 'and to whom');
      const s0 = SHARES.length, u0 = UPLOADS.length;
      const d = await sendAndRead(61, '📧 Send trust package');
      eq(d.to, 'ann@lowe.law', '⚠⚠ to the trustee\'s attorney');
      eq(d.cc, 'rex@hale.example, ' + AGREEMENTS, 'copying the trustee and agreements@');
      ok(d.crlf, 'every line break CRLF');
      eq(d.names, ['Havellin Trust Schedule', 'Havellin Estate Inventory', 'Havellin Appraisal Worklist'], '⚠⚠ the Trust Schedule attached, and no Court Inventory');
      ok(!UPLOADS.slice(u0).some((u) => /Court Inventory/.test(u.filename)), 'no Court Inventory filed either');
      has(d.text, 'Dear Ann,', 'the attorney greeted');
      has(d.text, 'Attached are Havellin’s inventory documents for the Walter Ellsworth 61 trust administration, 69 Beach Blvd, Palm Beach', 'naming the trust administration');
      has(d.text, 'In the trust’s Google Drive folder:', 'the trust’s folder');
      has(d.text, 'If you need anything further for the administration of the trust, reply here and we will send it.', 'the closing');
      ['filing', 'Estate of', 'Case ', '2026-CP-009961'].forEach((w) => lacks(d.text + d.html, w, '⚠ no court language in the email: ' + w));
      ok(!/court|probate/i.test(d.text), '⚠ the text names no court and no probate');
      has(d.text, 'Release approvals and chain of custody: https://drive.google.com/file/d/up', 'the release and custody record, linked');
      eq(SHARES.slice(s0), [{ folderId: 'AF61', email: 'ann@lowe.law' }, { folderId: 'INV61', email: 'ann@lowe.law' }], 'both photograph folders shared with the attorney');
      const ts = (UPLOADS.slice(u0).find((u) => /Trust Schedule/.test(u.filename)) || {}).html || '';
      has(ts, 'Schedule of Tangible Personal Property Held in Trust', 'the Trust Schedule is the desk\'s own page');
      has(await txt(dash + ' .jt-fb'), 'Draft created in ' + BOX + ' for ann@lowe.law, copied to rex@hale.example and ' + AGREEMENTS, 'the notice says where the draft is');
      has(await txt(dash + ' #pkg-row-61'), 'Drafted — read it, send it, then confirm', 'the card waits on the confirming tap');
      await press(dash + ' #pkg-row-61 button[onclick*="markDocSent(61,\'probatePackage\')"]', '✓ I\'ve sent it');
      ok(!!((await job(61)).docState.probatePackage || {}).sentAt, 'the send is recorded, on the one package record');
      has(await txt(dash + ' #pkg-row-61'), 'by Anthony Graziano, to ann@lowe.law', 'who sent it, and to whom');
      ok(await vis(dash + ' #pkg-row-61 button[onclick*="sendProbatePackage(61)"]'), 'and a fresh trust package can go');
      await settle();
      ok(!!(((STORE.jobs.find((j) => j.id === 61) || {}).docState || {}).probatePackage || {}).sentAt, 'the record reached the sheet');
    });

    // ════════════════════════════════════════════════════════════════════════════════════════════════════
    await section('B. no attorney recorded: the trust package goes to the trustee', async () => {
      STORE.media[62] = MEDIA(62);
      await seed(BASE(62, { probateAttyName: '', probateAttyFirm: '', probateAttyEmail: '', probateAttyPhone: '' }), EST(62, 'cleanout'));
      await openFromList(62);
      has(await cardTxt(62), 'to the trustee, rex@hale.example.', '⚠ the card says it goes to the trustee before anybody presses');
      const s0 = SHARES.length;
      const d = await sendAndRead(62, '📧 Send trust package, to the trustee');
      eq(d.to, 'rex@hale.example', '⚠⚠ to the trustee');
      eq(d.cc, AGREEMENTS, 'copying agreements@ alone');
      has(d.text, 'Dear Rex,', 'the trustee greeted');
      eq(d.names, ['Havellin Trust Schedule', 'Havellin Estate Inventory', 'Havellin Appraisal Worklist'], 'the Trust Schedule attached');
      eq(SHARES.slice(s0), [{ folderId: 'AF62', email: 'rex@hale.example' }, { folderId: 'INV62', email: 'rex@hale.example' }], 'the folders shared with the trustee');
      has(await txt(dash + ' .jt-fb'), 'for rex@hale.example, copied to ' + AGREEMENTS, 'and the notice names them');
    });

    // ════════════════════════════════════════════════════════════════════════════════════════════════════
    await section('C. a Neither estate: no card and no package', async () => {
      await seed(BASE(63, { matterType: 'neither' }), EST(63, 'cleanout'));
      await openFromList(63);
      has(await txt(dash), 'Estate of Walter Ellsworth 63', 'fixture: the dashboard is on the Neither estate');
      eq(await p.locator(dash + ' #pkg-row-63').count(), 0, '⚠ no package row');
      const t = await txt(dash);
      lacks(t, 'Trust Information', 'no Trust card');
      lacks(t, 'Probate Information', 'no Probate card');
      eq(await p.locator(dash + ' button[onclick*="sendProbatePackage("]').count(), 0, 'and no send anywhere on the dashboard');
    });

    // ════════════════════════════════════════════════════════════════════════════════════════════════════
    await section('D. a probate estate is unchanged', async () => {
      STORE.media[64] = MEDIA(64);
      await seed(BASE(64, { svc: 'probate', matterType: 'probate', executorRole: 'Personal Representative', executorAuth: 'received' }), EST(64, 'probate'));
      await openFromList(64);
      const card = await cardTxt(64);
      has(card, 'Probate Information', 'the Probate card');
      has(card, 'Authorization received', 'its authorization chip');
      has(card, 'Case number', 'the case number');
      has(card, '2026-CP-009964', 'as recorded');
      has(card, 'Probate Attorney', 'the probate attorney');
      has(card, 'Executor', 'the executor');
      has(card, 'Probate package', 'the probate package row');
      lacks(await txt(dash), 'Trust Information', 'and no Trust card');
      const d = await sendAndRead(64, '📧 Send probate package');
      eq(d.to, 'ann@lowe.law', 'to the estate attorney');
      eq(d.cc, 'rex@hale.example, ' + AGREEMENTS, 'copying the personal representative and agreements@');
      eq(d.names, ['Havellin Court Inventory', 'Havellin Estate Inventory', 'Havellin Appraisal Worklist'], 'the Court Inventory attached, as before');
      has(d.text, 'Attached are Havellin’s inventory documents for the Estate of Walter Ellsworth 64, 69 Beach Blvd, Palm Beach', 'the estate named as before');
      has(d.text, 'If you need anything further for the filing, reply here and we will send it.', 'and the probate route\'s closing');
    });

    // ════════════════════════════════════════════════════════════════════════════════════════════════════
    await section('E. overflow at 1440 and 390; no page errors', async () => {
      await openFromList(61);
      ok(await vis(dash + ' #pkg-row-61'), 'fixture: the Trust card is on screen');
      eq(await overflow(), 0, 'no horizontal overflow at 1440 with the Trust card');
      await p.setViewportSize({ width: 390, height: 900 });
      await p.waitForTimeout(400);
      eq(await overflow(), 0, 'none at 390');
      ok(await vis(dash + ' #pkg-row-61 button'), 'the package row\'s button is on screen at 390');
      await openFromList(62);
      eq(await overflow(), 0, 'none at 390 with the trustee-addressed card');
      await p.setViewportSize({ width: 1440, height: 1000 });
      eq(errs, [], 'no page errors');
    });

    console.log('\n' + pass + ' passed, ' + fail + ' failed');
    await b.close();
    process.exit(fail ? 1 : 0);
  } catch (e) {
    console.log('  ✗ the step threw: ' + (e && e.stack || e));
    try { if (b) await b.close(); } catch (x) {}
    console.log('\n' + pass + ' passed, ' + (fail + 1) + ' failed');
    process.exit(1);
  }
})();
