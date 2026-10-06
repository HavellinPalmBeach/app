// Step 51 — P17 · W3, documents and Drive (2026-10-01): Anthony's answers 4, 9 and 11.
//
// Drives the REAL page through its own controls against one fake Apps Script (its jobs, estimates and change-order
// stores, loadMedia, getSubfolders, esignStatus, esignArchive, uploadHtml, htmlToPdf and shareFolder answered as the
// deployment would) and the Gmail API, routed. What is seeded is state a person could not type in one sitting: an
// estate signed through DocuSign, an accepted-and-signed job with a change order raised, a probate estate with an
// inventory on the sheet.
//
//   A. DocuSign completes on opening the client and the executed copy cannot be filed (no Agreement folder): the
//      notice names File signed copy; the strip under the timeline offers it; the folder exists now; one press posts
//      esignArchive for the envelope and records both files; the button is gone. A second estate whose archive
//      reached DocuSign and failed: a press inside the 20 minutes is refused with the time; past it, the press files
//      the agreement and the certificate does not come back — the button stays — and a later press files it.
//   B. Get Acceptance on a change order, the client's name typed, I Accept: the accepted copy is uploaded into the
//      Change Orders folder under its undated name, with the typed acceptance and the date; the card shows the filed
//      copy. Drive fails on another: the card offers File to Drive, and the press files it.
//   C. The Probate card's 📧 Send probate package: the inventory read from the sheet, both photograph folders shared
//      with the attorney, five filings, four PDFs, one Gmail draft — its To, Cc, four attachments (the Disposition
//      Ledger since P19) and links read
//      back — then ✓ I've sent it, and the card says who sent it and when. With no attorney email it is refused by
//      name and nothing is asked of anyone.
//   D. overflow at 1440 and 390 with the Probate card and the change order card on screen; no page errors.
//
//   NODE_PATH=/opt/node22/lib/node_modules node tests/browser/step51.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');

const SYNC = 'https://script.google.com/macros/s/STEP51/exec';
const BOX = 'anthony@havellinpalmbeach.com';
const STORE = { jobs: [], estimates: {}, changeOrders: [], media: {} };
const SUBFOLDERS = {};        // jobId -> {name: {id, url}} getSubfolders answers with
const POSTS = [];             // every action or type posted, in order
const UPLOADS = [], PDFS = [], SHARES = [], ARCHIVES = [], DRAFTS = [];
const ESIGN = {};             // envelopeId -> what esignStatus reports
const ARCHIVE = {};           // envelopeId -> what esignArchive answers, in turn
const FAIL = { upload: null };

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
        if (body.type === 'saveAllChangeOrders') { STORE.changeOrders = body.payload || []; return json({ ok: true }); }
        if (body.action === 'getSubfolders') {
          const id = Number(String(body.folderId || '').replace(/\D/g, ''));
          return json({ ok: true, subfolders: SUBFOLDERS[id] || {} });
        }
        if (body.action === 'esignStatus') return json(Object.assign({ ok: true, envelopeId: body.envelopeId }, ESIGN[body.envelopeId] || { status: 'sent' }));
        if (body.action === 'esignArchive') {
          ARCHIVES.push(body);
          const q = ARCHIVE[body.envelopeId] || [];
          return json(q.length ? q.shift() : { ok: false, error: 'not in this test' });
        }
        if (body.action === 'uploadHtml') {
          UPLOADS.push({ folderId: body.folderId, filename: body.filename, html: body.html });
          if (FAIL.upload && FAIL.upload.test(body.filename)) return json({ ok: false, error: 'Drive is unavailable' });
          return json({ ok: true, fileUrl: 'https://drive.google.com/file/d/up' + UPLOADS.length + '/view', fileId: 'up' + UPLOADS.length });
        }
        if (body.action === 'htmlToPdf') { PDFS.push(body.html); return json({ ok: true, base64: Buffer.from('%PDF-1.4 step51 #' + PDFS.length + ' ' + 'x'.repeat(120)).toString('base64') }); }
        if (body.action === 'shareFolder') { SHARES.push({ folderId: body.folderId, email: body.email }); return json({ ok: true, url: 'https://drive.google.com/drive/folders/' + body.folderId }); }
        return json({ ok: true });
      }
      switch (action) {
        case 'loadJobs': return json({ jobs: STORE.jobs, deletedJobs: [] });
        case 'loadEstimates': return json({ ok: true, estimates: STORE.estimates });
        case 'loadJobPlans': return json({ ok: true, jobPlans: {} });
        case 'loadLogs': return json({ ok: true, logs: {} });
        case 'loadChangeOrders': return json({ ok: true, changeOrders: STORE.changeOrders });
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
    const dialogs = []; p.on('dialog', async (d) => { dialogs.push(d.message()); await d.accept(); });
    await p.goto(APP); await p.waitForTimeout(1800);
    // A headless browser has no Google sign-in popup and no second tab: the token is handed over (the Gmail API is
    // routed) and window.open is caught.
    const hook = () => p.evaluate(() => { window.gmailAuth = function (cb) { cb('tok-step51'); }; window.__opened = window.__opened || [];
      window.open = function (u) { window.__opened.push(String(u)); return null; }; });
    await hook();

    const section = async (name, body) => {
      console.log('\n## ' + name);
      await p.evaluate(() => ['co-accept-modal', 'change-order-modal', 'doc-viewer-modal']
        .forEach((id) => { const m = document.getElementById(id); if (m) m.style.display = 'none'; })).catch(() => {});
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
    const strip = dash + ' .jt-quick';

    // A job record as the dashboard would hold it after these steps, written through the page's own save.
    async function seed(j, est, extra) {
      await p.evaluate(([j, est, extra]) => {
        jobs.unshift(j);
        if (est) { estimateStore[j.id] = { approved: true, approvedBy: 'Anthony Graziano', approvedAt: 'September 20, 2026', estimate: est, savedAt: Date.now() };
          try { localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore)); } catch (x) {}
          postSyncBadge({ type: 'saveAllEstimates', payload: estimateStore }, 'ok', 'fail'); }
        if (extra && extra.co) { changeOrders.push(extra.co); saveChangeOrders(); }
        saveJobs(); renderJobs();
      }, [j, est, extra || null]);
      await settle();
    }
    const EST = (id) => ({ jobId: id, svc: 'probate', havellinTotal: 24000, fixedPrice: false, rooms: [{ idx: 1, name: 'Study', st: 'in', vol: 3, cplx: 3 }],
      vendors: [], prepItems: [], totTC: 40, totPS: 60, tcRate: 150, psRate: 100 });
    const BASE = (id, o) => Object.assign({
      id, hvlId: 'HVL-00' + id, name: 'Walter Ellsworth ' + id, svc: 'probate', status: 'active', won: true, approved: true, wonAt: '2026-09-21', wonBy: 'Ashley Jerome', wonMethod: 'email',
      addr: '69 Beach Blvd', city: 'Palm Beach', zip: '33480', tc: 'Ashley Jerome', agrApprovedBy: 'Anthony Graziano', agrApproved: true, agrApprovedAt: 'September 21, 2026',
      matterType: 'probate', docTier: 'values', deathDate: '2026-08-01', probateCase: '2026-CP-0012' + id, executorAuth: 'received',
      executor: 'Rex Hale', executorRole: 'Personal Representative', executorEmail: 'rex@hale.example', executorPhone: '(561) 555-0101',
      probateAttyName: 'Ann Lowe', probateAttyFirm: 'Lowe & Co', probateAttyEmail: 'ann@lowe.law', probateAttyPhone: '(561) 555-0102',
      estimateSentDate: 'September 20, 2026', walkthrough: '2026-09-15', start: '2026-09-28', docLevel: 'standard',
      driveFolder: 'https://drive.google.com/drive/folders/ROOT' + id, driveSubfolders: {},
      docState: { estimate: { draftedAt: '2026-09-20T14:00:00.000Z', sentAt: '2026-09-20T14:05:00.000Z', provider: 'gmail' } },
      at: {}, updatedAt: Date.now() - 86400000, payments: [{ id: 1, uid: 'p-' + id, stage: 'deposit', amount: 12000, method: 'wire', receivedOn: '2026-09-23', clearedOn: '2026-09-23' }],
      depositReceived: true, activatedOn: '2026-09-28',
    }, o || {});
    // Out for signature through DocuSign: the arrival check will find it completed.
    const ENVELOPE = (id, env) => ({ agrSent: true, agrSentAt: 'September 21, 2026', status: 'won', activatedOn: '', depositReceived: false, payments: [],
      docState: { estimate: { draftedAt: '2026-09-20T14:00:00.000Z', sentAt: '2026-09-20T14:05:00.000Z', provider: 'gmail' },
        agreement: { draftedAt: '2026-09-21T13:00:00.000Z', sentAt: '2026-09-21T13:00:00.000Z', sentBy: 'Anthony Graziano', provider: 'docusign',
          esign: { envelopeId: env, status: 'sent', checkedAt: '2026-09-21T13:00:00.000Z' } } } });

    // ════════════════════════════════════════════════════════════════════════════════════════════════════
    await section('A. DocuSign completes, the filing fails, and File signed copy files it', async () => {
      ESIGN['env-A'] = { status: 'completed', completedAt: '2026-09-23T15:00:00Z', signerName: 'Rex Hale', signerEmail: 'rex@hale.example', signedAt: '2026-09-22T19:00:00Z' };
      ARCHIVE['env-A'] = [{ ok: true, signedUrl: 'https://drive.google.com/file/d/SIGA/view', certUrl: 'https://drive.google.com/file/d/CERTA/view', signedId: 'SIGA', certId: 'CERTA' }];
      SUBFOLDERS[51] = {};   // no Agreement folder yet
      await seed(BASE(51, ENVELOPE(51, 'env-A')), EST(51));
      await openFromList(51);
      const signed = await until(async () => !!((await job(51)) || {}).agrSigned);
      ok(signed, 'opening the client asks DocuSign and records the signature');
      eq(ARCHIVES.length, 0, 'fixture: with no Agreement folder the executed copy was not fetched');
      const fb = await txt(dash + ' .jt-fb');
      has(fb, 'create the Drive folder, then press File signed copy on the timeline', '⚠⚠ the notice names the button');
      lacks(fb, 'download', 'and no longer says to download it from DocuSign');
      has(await txt(strip), 'File signed copy', 'the strip under the timeline offers File signed copy');
      SUBFOLDERS[51] = { Agreement: { id: 'AGR51', url: 'https://drive.google.com/drive/folders/AGR51' } };
      await press(strip + ' button[onclick="dashFileSignedCopy(51)"]', '📁 File signed copy');
      await until(async () => !!(((await job(51)) || {}).docState.agreement.esign || {}).filedUrl);
      eq(ARCHIVES.length, 1, 'one press, one request');
      const a = ARCHIVES[0] || {};
      eq([a.envelopeId, a.folderId, a.baseName], ['env-A', 'AGR51', 'HVL-0051 - Havellin Services Agreement'], '⚠⚠ esignArchive for this envelope, into the Agreement folder, under the stable name');
      const es = ((await job(51)).docState.agreement.esign) || {};
      eq([es.filedUrl, es.certUrl], ['https://drive.google.com/file/d/SIGA/view', 'https://drive.google.com/file/d/CERTA/view'], 'both recorded');
      has(await txt(dash + ' .jt-fb'), 'Signed agreement and certificate of completion filed to Drive', 'and it says so');
      lacks(await txt(strip), 'File signed copy', 'the button is gone');
      await settle();
      ok(!!((STORE.jobs.find((j) => j.id === 51) || {}).docState.agreement.esign || {}).filedUrl, 'and the record reached the sheet');

      // A second estate: the archive reached DocuSign and failed.
      ESIGN['env-B'] = { status: 'completed', completedAt: '2026-09-23T15:00:00Z', signerName: 'Rex Hale', signerEmail: 'rex@hale.example', signedAt: '2026-09-22T19:00:00Z' };
      ARCHIVE['env-B'] = [{ ok: false, error: 'HTTP 500: DocuSign is unavailable' },
                          { ok: true, signedUrl: 'https://drive.google.com/file/d/SIGB/view', signedId: 'SIGB', certError: 'HTTP 404' },
                          { ok: true, signedUrl: 'https://drive.google.com/file/d/SIGB/view', signedId: 'SIGB', certUrl: 'https://drive.google.com/file/d/CERTB/view' }];
      SUBFOLDERS[52] = { Agreement: { id: 'AGR52', url: '' } };
      await seed(BASE(52, ENVELOPE(52, 'env-B')), EST(52));
      await openFromList(52);
      await until(async () => ARCHIVES.length === 2);
      has(await txt(dash + ' .jt-fb'), 'press File signed copy on the timeline to try again, from', 'the failure names the button and when');
      await press(strip + ' button[onclick="dashFileSignedCopy(52)"]', '📁 File signed copy, at once');
      eq(ARCHIVES.length, 2, '⚠⚠ inside DocuSign\'s window the press asks nothing');
      has(await txt(dash + ' .jt-fb'), 'held until', 'and says until when');
      // Twenty-five minutes pass.
      await p.evaluate(() => { const st = jobs.find((j) => j.id === 52).docState.agreement.esign; st.fileAskedAt = new Date(Date.now() - 25 * 60000).toISOString(); });
      await press(strip + ' button[onclick="dashFileSignedCopy(52)"]', '📁 File signed copy, later');
      await until(async () => ARCHIVES.length === 3 && !!(((await job(52)) || {}).docState.agreement.esign || {}).filedUrl);
      has(await txt(dash + ' .jt-fb'), 'the certificate of completion could not be retrieved (HTTP 404)', 'the certificate did not come back, and it says so');
      has(await txt(strip), 'File signed copy', 'the button stays while the certificate is missing');
      await p.evaluate(() => { const st = jobs.find((j) => j.id === 52).docState.agreement.esign; st.fileAskedAt = new Date(Date.now() - 25 * 60000).toISOString(); });
      await press(strip + ' button[onclick="dashFileSignedCopy(52)"]', '📁 File signed copy, for the certificate');
      await until(async () => !!(((await job(52)) || {}).docState.agreement.esign || {}).certUrl);
      const es2 = (await job(52)).docState.agreement.esign;
      eq([es2.filedUrl, es2.certUrl], ['https://drive.google.com/file/d/SIGB/view', 'https://drive.google.com/file/d/CERTB/view'], 'both recorded now');
      lacks(await txt(strip), 'File signed copy', 'and the button is gone');
    });

    // ════════════════════════════════════════════════════════════════════════════════════════════════════
    await section('B. accepting a change order files the accepted copy to the Change Orders folder', async () => {
      const coId = 1759180000053;
      SUBFOLDERS[53] = { 'Change Orders': { id: 'CO53', url: '' } };
      await seed(BASE(53, { svc: 'cleanout', matterType: 'neither', driveSubfolders: { 'Change Orders': 'CO53' } }), Object.assign(EST(53), { svc: 'cleanout' }),
        { co: { id: coId, jobId: 53, description: 'Add the garage and the attic', reason: 'scope', tcHrs: 6, psHrs: 10, createdAt: 'September 29, 2026', clientApproved: false, updatedAt: Date.now() } });
      await openFromList(53);
      const before = UPLOADS.length;
      await press(dash + ' button[onclick="openCOAcceptModal(' + coId + ')"]', 'Get Acceptance');
      await p.fill('#coa-client-name', 'Rex Hale');
      await press('#co-accept-modal button[onclick="acceptChangeOrder()"]', '✓ I Accept This Change Order');
      await until(async () => UPLOADS.length > before && await p.evaluate((id) => !!(changeOrders.find((c) => c.id === id) || {}).filedUrl, coId));
      const u = UPLOADS[before] || {};
      eq(u.folderId, 'CO53', '⚠⚠ uploaded into the client\'s Change Orders folder');
      eq(u.filename, 'HVL-0053 - Havellin Change Order CO-000053.html', 'under its undated name, so a re-file replaces it');
      has(u.html, 'Client Accepted', 'the accepted copy');
      const co = await p.evaluate((id) => JSON.parse(JSON.stringify(changeOrders.find((c) => c.id === id))), coId);
      has(u.html, 'Rex Hale</strong> accepted this change order on ' + co.clientAcceptedAt, 'with the typed name and the date');
      ok(!!co.filedAt && /up\d+/.test(co.filedId || '') && !!co.filedUrl, 'recorded on the change order: when, its Drive id, its link');
      has(await txt(dash), 'Change Order accepted by Rex Hale', 'the acceptance notice is still the one on screen');
      await press(dash + ' button[onclick="openChangeOrderFiled(' + coId + ')"]', '📁 Filed copy on the card');
      eq((await p.evaluate(() => window.__opened.slice(-1)))[0], co.filedUrl, 'which opens the copy in Drive');
      await settle();
      ok(!!(STORE.changeOrders.find((c) => c.id === coId) || {}).filedUrl, 'and the record reached the sheet');

      // Drive fails on the next one.
      const co2 = 1759180000054;
      FAIL.upload = /CO-000054/;
      await p.evaluate((id) => { changeOrders.push({ id, jobId: 53, description: 'Second storage unit', reason: 'scope', tcHrs: 2, psHrs: 4, createdAt: 'September 30, 2026', clientApproved: false, updatedAt: Date.now() }); saveChangeOrders(); _dashRedraw(53); }, co2);
      await press(dash + ' button[onclick="openCOAcceptModal(' + co2 + ')"]', 'Get Acceptance on the second');
      await p.fill('#coa-client-name', 'Rex Hale');
      await press('#co-accept-modal button[onclick="acceptChangeOrder()"]', '✓ I Accept, with Drive down');
      await p.waitForTimeout(600);
      ok(!(await p.evaluate((id) => (changeOrders.find((c) => c.id === id) || {}).filedUrl, co2)), 'the upload failed: nothing recorded as filed');
      FAIL.upload = null;
      await press(dash + ' button[onclick="fileChangeOrder(' + co2 + ')"]', '📁 File to Drive on its row');
      await until(async () => !!(await p.evaluate((id) => (changeOrders.find((c) => c.id === id) || {}).filedUrl, co2)));
      has(await txt(dash + ' .jt-fb'), 'CO-000054 filed to the client’s Change Orders folder in Drive', 'the press files it, and says so');
      eq(await p.locator(dash + ' button[onclick="openChangeOrderFiled(' + co2 + ')"]').count(), 1, 'and the card shows its filed copy');
    });

    // ════════════════════════════════════════════════════════════════════════════════════════════════════
    let pkgId = 55;
    await section('C. the probate package: one Gmail draft to the attorney, four PDFs, the links, then I\'ve sent it', async () => {
      const T0 = Date.now() - 3 * 86400000;
      STORE.media[pkgId] = { items: [
        { stableId: 'a', label: 'inventory', collId: null, roomIdx: 1, status: 'uploaded', ts: T0, updatedAt: T0, itemNo: 1, objectName: 'Sargent portrait',
          category: 'Art & Décor', qty: 1, condition: 'Good', fmv: 48000, valSource: 'Appraisal', disposition: 'Auction', channel: 'Christie’s',
          authBy: 'Rex Hale', approvalDate: '2026-09-25', driveFileId: 'fa', driveFileUrl: 'https://drive.google.com/file/d/fa/view',
          custodyLog: [{ cid: 'c1', at: T0, action: 'Released', party: 'Christie’s', date: '2026-09-26', method: 'Courier', receipt: 'CH-0091' }] },
        { stableId: 'b', label: 'inventory', collId: null, roomIdx: 1, status: 'uploaded', ts: T0, updatedAt: T0, itemNo: 2, objectName: 'Dining chairs (8)',
          category: 'Furniture', qty: 8, condition: 'Good', fmv: '', driveFileId: 'fb', driveFileUrl: 'https://drive.google.com/file/d/fb/view' },
        { stableId: 'd1', label: 'appraisal', collId: '3', roomIdx: null, status: 'uploaded', ts: T0, objectName: 'Christies appraisal.pdf',
          filename: 'HVL-0055_APPRSL_Art_1.pdf', driveFileUrl: 'https://drive.google.com/file/d/APPR1/view' }] };
      await seed(BASE(pkgId, { driveSubfolders: { 'Estate Inventory': 'INV55', 'As-Found Record': 'AF55', 'Agreement': 'AGR55' }, agrSigned: true, agrSent: true,
        docState: { estimate: { draftedAt: '2026-09-20T14:00:00.000Z', sentAt: '2026-09-20T14:05:00.000Z', provider: 'gmail' },
          agreement: { sentAt: '2026-09-21T14:00:00.000Z', draftedAt: '2026-09-21T13:00:00.000Z', provider: 'gmail',
            sig: { how: 'wet', signedBy: 'Rex Hale', signedOn: '2026-09-22', provider: 'manual', recordedBy: 'Anthony Graziano', recordedAt: '2026-09-22T15:00:00.000Z' } } } }), EST(pkgId));
      await openFromList(pkgId);
      const card = dash + ' #pkg-row-' + pkgId;
      ok(await vis(card), 'the Probate card carries the package row');
      lacks(await txt(dash), 'Package Sent', 'the self-attested toggle is gone');
      has(await txt(card), 'Carries the Court Inventory, Estate Inventory Report, Disposition Ledger and Appraisal Worklist', 'it says what it carries before it goes (the ledger since P19)');
      has(await txt(card), 'to ann@lowe.law', 'and to whom');
      const d0 = DRAFTS.length, u0 = UPLOADS.length, p0 = PDFS.length, s0 = SHARES.length;
      await press(card + ' button[onclick*="sendProbatePackage(' + pkgId + ')"]', '📧 Send probate package');
      await until(async () => DRAFTS.length > d0 && !!(((await job(pkgId)) || {}).docState.probatePackage || {}).draftedAt, 20000);
      eq(DRAFTS.length - d0, 1, '⚠⚠ one Gmail draft');
      const mime = DRAFTS[d0] || '';
      const head = (n) => ((new RegExp('^' + n + ': (.*)$', 'm')).exec(mime) || [])[1] || '';
      eq(head('To'), 'ann@lowe.law', 'to the estate attorney');
      eq(head('Cc'), 'rex@hale.example, agreements@havellinpalmbeach.com', 'copying the personal representative and agreements@');
      eq((mime.match(/(^|[^\r])\n/g) || []).length, 0, 'every line break CRLF');
      const names = [...mime.matchAll(/filename="([^"]+)"/g)].map((m) => m[1].replace(/ - 69 Beach Blvd - .*$/, ''));
      eq(names, ['Havellin Court Inventory', 'Havellin Estate Inventory', 'Havellin Disposition Ledger', 'Havellin Appraisal Worklist'], '⚠⚠ four PDFs attached (the Disposition Ledger since P19)');
      const alt = (/boundary="(ALT-[^"]+)"/.exec(mime) || [])[1];
      const plain = alt ? mime.split('--' + alt)[1] : '';
      const body = Buffer.from(plain.slice(plain.indexOf('\r\n\r\n') + 4).replace(/\r\n/g, ''), 'base64').toString('utf8');
      has(body, 'Christies appraisal.pdf: https://drive.google.com/file/d/APPR1/view', 'the filed appraisal report, linked');
      has(body, 'As-Found Record photographs: https://drive.google.com/drive/folders/AF55', 'the As-Found Record folder, linked');
      has(body, 'Estate Inventory photographs: https://drive.google.com/drive/folders/INV55', 'the Estate Inventory folder, linked');
      has(body, 'Release approvals and chain of custody: https://drive.google.com/file/d/up', 'the release approvals and custody log, linked to their filed record');
      // P22 (2026-10-06): and with the representative the package copies, so the email's links do not refuse them.
      eq(SHARES.slice(s0), [{ folderId: 'AF55', email: 'ann@lowe.law' }, { folderId: 'AF55', email: 'rex@hale.example' },
                            { folderId: 'INV55', email: 'ann@lowe.law' }, { folderId: 'INV55', email: 'rex@hale.example' }], 'both folders shared with the attorney, and with the copied representative');
      eq(UPLOADS.slice(u0).map((u) => u.folderId + ' ' + u.filename), ['INV55 HVL-0055 - Havellin Release Approvals and Chain of Custody.html',
        'INV55 HVL-0055 - Havellin Court Inventory.html', 'INV55 HVL-0055 - Havellin Estate Inventory Report.html', 'INV55 HVL-0055 - Havellin Disposition Ledger.html',
        'INV55 HVL-0055 - Havellin Appraisal Worklist.html'],
         'every document filed to the Estate Inventory folder too, undated');
      eq(PDFS.length - p0, 4, 'four PDFs built');
      const court = (UPLOADS.slice(u0).find((u) => /Court Inventory/.test(u.filename)) || {}).html || '';
      has(court, 'DRAFT', 'a Court Inventory with a line still to value goes out as a DRAFT');
      has(court, 'not a complete total', 'its total a floor');
      const fb = await txt(dash + ' .jt-fb');
      has(fb, 'Draft created in ' + BOX + ' for ann@lowe.law', 'the notice says where the draft is');
      has(await txt(card), 'I’ve sent it', 'the card waits on the confirming tap');
      has(await txt(card), 'Drafted — read it, send it, then confirm', 'with the draft\'s own line');
      await press(card + ' button[onclick*="markDocSent(' + pkgId + ',\'probatePackage\')"]', '✓ I\'ve sent it');
      const st = (await job(pkgId)).docState.probatePackage || {};
      ok(!!st.sentAt, 'the send is recorded');
      has(await txt(card), 'Sent ', 'the card says it was sent');
      has(await txt(card), 'by Anthony Graziano, to ann@lowe.law', 'by whom, and to whom');
      ok(await vis(card + ' button[onclick*="sendProbatePackage(' + pkgId + ')"]'), 'and a fresh package can go');
      await settle();
      ok(!!(((STORE.jobs.find((j) => j.id === pkgId) || {}).docState || {}).probatePackage || {}).sentAt, 'the record reached the sheet');

      // No attorney email: refused by name, nothing asked of anyone.
      await seed(BASE(56, { probateAttyEmail: '', driveSubfolders: { 'Estate Inventory': 'INV56', 'As-Found Record': 'AF56' } }), EST(56));
      await openFromList(56);
      const n0 = POSTS.length, dd = DRAFTS.length;
      has(await txt(dash + ' #pkg-row-56'), 'it needs the estate attorney’s email', 'the card says what is missing before anybody presses');
      await press(dash + ' #pkg-row-56 button[onclick*="sendProbatePackage(56)"]', '📧 Send probate package, with no attorney email');
      has(await txt(dash + ' .jt-fb'), 'The probate package cannot be sent yet: it needs the estate attorney’s email', '⚠ refused by name');
      eq([POSTS.length - n0, DRAFTS.length - dd], [0, 0], 'and nothing is asked of anyone');
    });

    // ════════════════════════════════════════════════════════════════════════════════════════════════════
    await section('D. overflow at 1440 and 390; no page errors', async () => {
      await openFromList(pkgId);
      eq(await overflow(), 0, 'no horizontal overflow at 1440 with the Probate card');
      await p.setViewportSize({ width: 390, height: 900 });
      await p.waitForTimeout(400);
      eq(await overflow(), 0, 'none at 390');
      ok(await vis(dash + ' #pkg-row-' + pkgId + ' button'), 'the package row\'s button is on screen at 390');
      await openFromList(53);
      eq(await overflow(), 0, 'none at 390 with the change order card');
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
