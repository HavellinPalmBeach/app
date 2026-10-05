// Step 60 — P20 · WA, every co-representative signs the agreement (2026-10-05). Anthony's answer to Q22: each
// co-representative signs in DocuSign beside the client; on the sign-by-hand route the co-signed page is filed as a
// signed record.
//
// Drives the REAL page through its own controls against one fake Apps Script (its stores, htmlToPdf, esignSend,
// esignStatus, esignArchive, uploadHtml and uploadFile answered as the 2026-10-05 deployment would), routed. Seeded: three
// trust-only estates, agreed and approved, the packet not yet sent — one with a co-trustee who has an email, one with a
// second co-trustee who has none, one that goes the hand route.
//
//   A. ✉ Send for signature — DocuSign: the esignSend payload names the co-trustee with the markers measured for him,
//      and the PDF's html carries them on his own block; the backend's echo is recorded; the notice names both signers;
//      the Agreement signed row says he signs there too.
//   B. A second co-trustee with no email: the same press is refused by name with the fix, and nothing is posted.
//   C. ↻ Check DocuSign now, answered completed with both signers: the rail and the track name both, with his day.
//   D. The hand route: 🤝 Handed over in person, ✓ Record the signed agreement; the row flags the co-trustee's signature
//      as not on record (on the rail and the track), the band moves on regardless, and the block under the timeline
//      files the page he signed through its own control (uploadFile into Signed Records); the flag clears.
//   E. The co-signer's markers are white text in the packet, on screen and in print; overflow at 1440 and 390 with the
//      flag and the block on screen; no page errors.
//
//   NODE_PATH=/opt/node22/lib/node_modules node tests/browser/step60.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');

const SYNC = 'https://script.google.com/macros/s/STEP60/exec';
const STORE = { jobs: [], estimates: {} };
const POSTS = [];             // every action or type posted, in order
const PDFS = [], SENDS = [], STATUS = [], ARCHIVES = [], UPLOADS = [];
const ESIGN = {};             // envelopeId -> what esignStatus reports
const A_ID = 6001, B_ID = 6002, D_ID = 6003;

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
        if (body.type === 'job') { STORE.jobs = STORE.jobs.filter((j) => j.id !== (body.payload || {}).id).concat([body.payload]); return json({ ok: true }); }
        if (body.type === 'saveAllEstimates') { Object.assign(STORE.estimates, body.payload || {}); return json({ ok: true }); }
        if (body.action === 'htmlToPdf') { PDFS.push(body.html); return json({ ok: true, base64: Buffer.from('%PDF-1.4 step60 #' + PDFS.length).toString('base64') }); }
        if (body.action === 'esignSend') {
          SENDS.push(body);
          // As the 2026-10-05 deployment answers: who it put on the envelope beside the client.
          return json({ ok: true, envelopeId: 'env-' + (SENDS.length), status: 'sent', sentAt: '',
            coSigners: (body.coSigners || []).map((c, i) => ({ name: c.name, email: c.email, recipientId: String(4 + i) })) });
        }
        if (body.action === 'esignStatus') { STATUS.push(body.envelopeId); return json(Object.assign({ ok: true, envelopeId: body.envelopeId }, ESIGN[body.envelopeId] || { status: 'sent' })); }
        if (body.action === 'esignArchive') { ARCHIVES.push(body); return json({ ok: true, signedUrl: 'https://drive.google.com/file/d/SIG/view', certUrl: 'https://drive.google.com/file/d/CERT/view' }); }
        if (body.action === 'uploadHtml') return json({ ok: true, fileUrl: 'https://drive.google.com/file/d/H' + POSTS.length + '/view', fileId: 'H' + POSTS.length });
        if (body.action === 'uploadFile') {
          UPLOADS.push({ folderId: body.folderId, filename: body.filename, dataUrl: String(body.dataUrl || '').slice(0, 40) });
          return json({ ok: true, fileUrl: 'https://drive.google.com/file/d/UP' + UPLOADS.length + '/view', fileId: 'UP' + UPLOADS.length });
        }
        if (body.action === 'getSubfolders') return json({ ok: true, subfolders: {} });
        return json({ ok: true });
      }
      switch (action) {
        case 'loadJobs': return json({ jobs: STORE.jobs, deletedJobs: [] });
        case 'loadEstimates': return json({ ok: true, estimates: STORE.estimates });
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
    const dialogs = []; p.on('dialog', async (d) => { dialogs.push(d.message()); await d.accept(); });
    await p.goto(APP); await p.waitForTimeout(1800);
    await p.evaluate(() => { const bn = document.getElementById('backend-stale-banner'); if (bn) bn.remove(); });

    const section = async (name, body) => {
      console.log('\n## ' + name);
      await p.evaluate(() => ['doc-viewer-modal', 'sig-modal'].forEach((id) => { const m = document.getElementById(id); if (m) m.style.display = 'none'; })).catch(() => {});
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
    const until = async (f, ms) => { for (let i = 0; i < (ms || 8000) / 150; i++) { if (await f()) return true; await p.waitForTimeout(150); } return false; };
    const settle = async () => {
      for (let i = 0; i < 60; i++) {
        await p.waitForTimeout(150);
        const idle = await p.evaluate(() => !_outboxSending && !_flushing && !_outboxTimer && !Object.keys(_outbox).length && !Object.keys(_pendingWrites).length);
        if (idle) return true;
      }
      return false;
    };
    const openFromList = async (id) => {
      await p.evaluate(() => { const nb = document.querySelector('.nb[onclick*="\'jobs\'"]'); if (nb) nb.click(); });
      await p.waitForTimeout(300);
      const row = '#panel-jobs tr[onclick="openClientDashboard(' + id + ')"]';
      const n = await p.locator(row).count();
      ok(n >= 1, 'the client is on the client list (' + n + ')');
      if (n) { await p.locator(row).first().click(); await p.waitForTimeout(900); }
    };
    const dash = '#client-dashboard-view';
    // The rail's row and the track's step for Agreement signed, as a person reads them.
    const railRow = () => p.evaluate(() => { const r = Array.from(document.querySelectorAll('#client-dashboard-view .jt-row'))
      .find((x) => ((x.querySelector('.jt-lbl') || {}).textContent || '').trim() === 'Agreement signed'); return r ? r.textContent.replace(/\s+/g, ' ').trim() : ''; });
    const trackStep = () => p.evaluate(() => { const s = Array.from(document.querySelectorAll('#client-dashboard-view .jt-step'))
      .find((x) => ((x.querySelector('.jt-slbl') || {}).textContent || '').trim() === 'Signed'); return s ? s.textContent.replace(/\s+/g, ' ').trim() : ''; });
    // The flag lines a layout carries, and whether each is on screen: the track is the desk's layout and the rail the
    // phone's, so each is read at its own width (the other is hidden there by design).
    const flags = (where) => p.evaluate((where) => Array.from(document.querySelectorAll('#client-dashboard-view ' + where + ' .jt-warn'))
      .map((e) => e.textContent.replace(/\s+/g, ' ').trim() + (e.checkVisibility() ? '' : ' [hidden]')), where);
    const atWidth = async (w, body) => { await p.setViewportSize({ width: w, height: w > 800 ? 1000 : 900 }); await p.waitForTimeout(350); try { return await body(); } finally { await p.setViewportSize({ width: 1440, height: 1000 }); await p.waitForTimeout(250); } };

    // ── Seed ────────────────────────────────────────────────────────────────────────────────────────────────
    const DAN = { id: 'cf1', name: 'Daniel Adler', role: 'Trustee', phone: '(561) 555-0103', email: 'dan@adler.example' };
    const MAE = { id: 'cf2', name: 'Mae O\'Neil', role: 'Trustee', phone: '', email: '' };
    await p.evaluate(([A_ID, B_ID, D_ID, DAN, MAE]) => {
      const base = (id, o) => Object.assign({ id, hvlId: 'HVL-2610-' + id, svc: 'cleanout', matterType: 'trust', status: 'won', won: true, approved: true,
        wonAt: '2026-10-01', wonBy: 'Ashley Jerome', wonMethod: 'call', created: 'Sep 28, 2026', walkthrough: '2026-09-29', estimateSentDate: 'September 30, 2026',
        docState: { estimate: { draftedAt: '2026-09-30T14:00:00.000Z', sentAt: '2026-09-30T14:05:00.000Z', provider: 'gmail' } },
        tc: 'Ashley Jerome', addr: '100 Ocean Blvd', city: 'Palm Beach', zip: '33480', deathDate: '2026-08-01', docTier: 'values', gate706: 'no',
        executor: 'Ruth Adler', executorRole: 'Trustee', executorEmail: 'ruth@adler.example', executorPhone: '(561) 555-0101', executorAuth: 'received',
        trustName: 'Adler Family Trust', trustDate: '2015-03-03', start: '2026-10-19',
        driveFolder: 'https://drive.google.com/drive/folders/ROOT' + id, driveSubfolders: { Agreement: 'AGR' + id, 'Signed Records': 'SR' + id, Estimates: 'EST' + id, Invoices: 'INV' + id },
        coFiduciaries: [Object.assign({}, DAN)], at: {}, updatedAt: Date.now() - 86400000, payments: [] }, o);
      jobs = jobs.filter((j) => [A_ID, B_ID, D_ID].indexOf(j.id) < 0);
      jobs.unshift(base(A_ID, { name: 'Harold Adler', fname: 'Harold', lname: 'Adler' }));
      jobs.unshift(base(B_ID, { name: 'Walter Adler', fname: 'Walter', lname: 'Adler', coFiduciaries: [Object.assign({}, DAN), Object.assign({}, MAE)] }));
      jobs.unshift(base(D_ID, { name: 'Edith Adler', fname: 'Edith', lname: 'Adler' }));
      [A_ID, B_ID, D_ID].forEach((id) => {
        estimateStore[id] = { approved: true, submitted: true, approvedBy: 'Anthony Graziano', approvedAt: 'September 30, 2026', savedAt: Date.now() - 86400000,
          estimate: { jobId: id, svc: 'cleanout', havellinTotal: 24000, fixedPrice: false, tcFee: 9000, psFee: 15000, totTC: 60, totPS: 150, tcRate: 150, psRate: 100,
            days: 5, docScope: 'full', docTier: 'values', collections: [], vendors: [], prepItems: [], rooms: [{ idx: 1, name: 'Study', st: 'in', vol: 3, cplx: 3 }] } };
      });
      try { localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore)); } catch (x) {}
      saveJobs(); renderJobs();
    }, [A_ID, B_ID, D_ID, DAN, MAE]);
    await settle();

    // ════════════════════════════════════════════════════════════════════════════════════════════════════
    await section('A. Send for signature — DocuSign: the co-trustee is on the envelope, with his own markers', async () => {
      await openFromList(A_ID);
      has(await txt(dash + ' .jt-next'), 'Send the signing packet', 'fixture: the packet\'s send is the step');
      const sends0 = SENDS.length;
      await press(dash + ' .jt-next button[onclick="docAction(' + A_ID + ',\'agreement\',\'send\')"]', '✉ Send for signature — DocuSign');
      await until(async () => !!((((await job(A_ID)) || {}).docState || {}).agreement || {}).esign);
      eq(SENDS.length - sends0, 1, 'one esignSend');
      const s = SENDS[SENDS.length - 1] || {};
      eq([s.signerName, s.signerEmail], ['Ruth Adler', 'ruth@adler.example'], 'the client is the trustee');
      eq(s.coSigners, [{ name: 'Daniel Adler', email: 'dan@adler.example', anchors: ['coSig1', 'coDate1'] }], '⚠⚠ the co-trustee is sent, with the markers measured for him');
      has((s.anchors || []).join(','), 'coSig1,coDate1', 'and the document says it carries them');
      // The html the PDF was built from: his block, his markers, once each.
      const html = PDFS[PDFS.length - 1] || '';
      eq([html.split('/hcs1/').length - 1, html.split('/hcd1/').length - 1], [1, 1], '⚠⚠ the PDF\'s html carries his signature and date markers, once each');
      const blk = html.slice(html.lastIndexOf('Co-Signer', html.indexOf('/hcs1/')), html.indexOf('/hcd1/'));
      has(blk, 'Daniel Adler', 'on his own block');
      lacks(blk, '/hsc/', 'never the client\'s');
      const es = ((await job(A_ID)).docState.agreement || {}).esign || {};
      eq(es.coSigners, [{ name: 'Daniel Adler', email: 'dan@adler.example', recipientId: '4' }], '⚠⚠ who the backend put on the envelope is recorded');
      has(await txt(dash + ' .jt-fb'), 'Sent to Ruth Adler and Daniel Adler for signature through DocuSign', 'the notice names both');
      has(await railRow(), 'DocuSign is watching for it — Daniel Adler signs there too', 'the Agreement signed row says he signs there too');
      await settle();
    });

    // ════════════════════════════════════════════════════════════════════════════════════════════════════
    await section('B. A second co-trustee with no email: refused by name, with the fix, and nothing is posted', async () => {
      await openFromList(B_ID);
      const posts0 = POSTS.length, pdfs0 = PDFS.length, sends0 = SENDS.length;
      await press(dash + ' .jt-next button[onclick="docAction(' + B_ID + ',\'agreement\',\'send\')"]', '✉ Send for signature — DocuSign');
      await p.waitForTimeout(600);
      has(await txt(dash + ' .jt-fb'), 'Mae O\'Neil has no email recorded. Add it on Edit Client, or send the PDF to sign by hand.', '⚠⚠ refused by name, with the fix');
      eq([PDFS.length - pdfs0, SENDS.length - sends0], [0, 0], '⚠⚠ no PDF built and no envelope asked for');
      eq(POSTS.slice(posts0).filter((x) => x === 'htmlToPdf' || x === 'esignSend'), [], 'nothing posted for it at all');
      const st = ((await job(B_ID)).docState || {}).agreement;
      ok(!st || !st.sentAt, 'and nothing is recorded as sent');
      has(await txt(dash + ' .jt-next'), 'Send the signing packet', 'the step is still the send');
    });

    // ════════════════════════════════════════════════════════════════════════════════════════════════════
    await section('C. Check DocuSign now, answered completed with both signers: the rail and the track name both', async () => {
      await openFromList(A_ID);
      const env = ((await job(A_ID)).docState.agreement.esign || {}).envelopeId;
      ok(!!env, 'fixture: the envelope from A');
      ESIGN[env] = { status: 'completed', completedAt: '2026-10-05T18:00:00Z', signerName: 'Ruth Adler', signerEmail: 'ruth@adler.example', signedAt: '2026-10-04T14:00:00Z',
        coSigners: [{ name: 'Daniel Adler', email: 'dan@adler.example', recipientId: '4', signedAt: '2026-10-05T01:30:00Z' }] };
      // DocuSign may be asked once every 20 minutes per agreement; the send's own stamp is now. Twenty-five minutes on:
      await p.evaluate((id) => { const j = jobs.find((x) => x.id === id); j.docState.agreement.esign.checkedAt = new Date(Date.now() - 25 * 60000).toISOString(); }, A_ID);
      await press(dash + ' .jt-next button[onclick="dashCheckEsign(' + A_ID + ')"]', '↻ Check DocuSign now');
      await until(async () => !!((await job(A_ID)) || {}).agrSigned);
      const sig = (await job(A_ID)).docState.agreement.sig || {};
      eq([sig.signedBy, sig.signedOn], ['Ruth Adler', '2026-10-04'], 'the client\'s signature, on her day');
      eq(sig.coSigners, [{ name: 'Daniel Adler', email: 'dan@adler.example', signedOn: '2026-10-04' }], '⚠⚠ and Daniel\'s, on his own day here (01:30Z on the 5th is the 4th in Palm Beach)');
      const rr = await railRow();
      has(rr, 'Ruth Adler, Daniel Adler', '⚠⚠ the rail names both signers');
      has(rr, 'Electronic signature · ruth@adler.example · Daniel Adler signed in DocuSign Oct 4, 2026', 'with how, and his day');
      has(await trackStep(), 'Ruth Adler, Daniel Adler', '⚠⚠ and so does the track');
      eq([await flags('.jt-rail'), await flags('.jt-track')], [[], []], 'nothing is flagged, on either layout');
      eq(await p.locator(dash + ' #jt-cosign').count(), 0, 'and there is no page to file');
      await settle();
    });

    // ════════════════════════════════════════════════════════════════════════════════════════════════════
    await section('D. The hand route: the client signs by hand, the co-trustee\'s signature is flagged, and filing his page clears it', async () => {
      await openFromList(D_ID);
      const n0 = dialogs.length;
      await press(dash + ' .jt-next button[onclick="dashMarkAgreementSent(' + D_ID + ')"]', '🤝 Handed over in person');
      has(dialogs.slice(n0).join(' | '), 'in person today?', 'it asks first');
      has(await txt(dash + ' .jt-next'), 'Get the agreement signed', 'the timeline waits for the signature');
      await press(dash + ' .jt-next button[onclick="dashMarkAgreementSigned(' + D_ID + ')"]', '✓ Record the signed agreement');
      ok(await vis('#sig-modal'), 'the recorder opens');
      await p.selectOption('#sig-how', 'wet');
      await p.fill('#sig-by', 'Ruth Adler');
      await press('#sig-modal .btn-p', 'Record Signature');
      await until(async () => !!((await job(D_ID)) || {}).agrSigned);
      has(await txt(dash + ' .jt-fb'), 'Daniel Adler’s signature is not on record yet: have them sign the printed signature page, then file it under the timeline.', '⚠ the notice names his signature, owed');
      const flag = 'Not on record: the signature of Daniel Adler. File the page they signed, under the timeline';
      eq(await flags('.jt-track'), ['⚠ ' + flag], '⚠⚠ the track flags it, on screen at 1440 (the desk)');
      eq(await atWidth(390, () => flags('.jt-rail')), ['⚠ ' + flag], '⚠⚠ and the rail, on screen at 390 (a phone)');
      has(await railRow(), 'Ruth Adler', 'the client\'s signature is recorded');
      const next = await txt(dash + ' .jt-next');
      lacks(next, 'Get the agreement signed', '⚠⚠ the band moves on: nothing waits on the co-signature');
      has(next, 'deposit', 'to the deposit');
      const blk = dash + ' #jt-cosign';
      ok(await vis(blk), 'the block is under the timeline');
      has(await txt(blk), 'Daniel Adler — signature not on record', 'naming him');
      has(await txt(blk), 'File the page signed by Daniel Adler', 'with the control');
      // Phone width, with the flag and the control on screen.
      await p.setViewportSize({ width: 390, height: 900 }); await p.waitForTimeout(400);
      eq(await overflow(), 0, 'no horizontal overflow at 390 with the flag and the block');
      ok(await vis(blk + ' label.btn-s'), 'the control is on screen at 390');
      await p.setViewportSize({ width: 1440, height: 1000 }); await p.waitForTimeout(300);
      eq(await overflow(), 0, 'nor at 1440');
      // File the page he signed: the control's own file picker.
      const up0 = UPLOADS.length;
      await p.setInputFiles(blk + ' input[type=file]', { name: 'IMG_6003.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('fake-jpeg-bytes') });
      await until(async () => (((await job(D_ID)) || {}).signedRecords || []).length > 0);
      eq(UPLOADS.length - up0, 1, 'one upload');
      const u = UPLOADS[UPLOADS.length - 1] || {};
      eq(u.folderId, 'SR' + D_ID, '⚠⚠ into the client\'s Signed Records folder');
      ok(/^HVL-2610-6003 - Co-signed agreement page - agreement - \d{4}-\d{2}-\d{2} \d{6}\.jpg$/.test(u.filename || ''), 'named for the client and the paper: ' + u.filename);
      const rec = ((await job(D_ID)).signedRecords || [])[0] || {};
      eq([rec.kind, rec.ref, rec.signedBy, rec.fileId], ['agreement', 'agreement', 'Daniel Adler', 'UP' + UPLOADS.length], '⚠⚠ recorded as a co-signed agreement page, naming him');
      await until(async () => (await p.locator(blk + ' input[type=file]').count()) === 0, 3000);
      eq(await flags('.jt-track'), [], '⚠⚠ the flag clears on the track');
      eq(await flags('.jt-rail'), [], 'and on the rail');
      has(await railRow(), 'Ruth Adler, Daniel Adler', 'the rail names both');
      has(await railRow(), 'Daniel Adler on the co-signed page filed', 'and how his came back');
      has(await txt(blk), '✓ Daniel Adler — on the co-signed page filed', 'the block says so');
      eq(await p.locator(blk + ' input[type=file]').count(), 0, 'and offers no control: nothing is owed');
      ok(await p.locator(blk + ' a[href="https://drive.google.com/file/d/UP' + UPLOADS.length + '/view"]').count() === 1, 'the filed page links to Drive');
      await settle();
      const sheet = (STORE.jobs.find((j) => j.id === D_ID) || {}).signedRecords || [];
      eq(sheet.map((r) => r.kind), ['agreement'], 'and the sheet holds it');
    });

    // ════════════════════════════════════════════════════════════════════════════════════════════════════
    await section('E. The co-signer\'s markers are white in the packet, on screen and in print; overflow; no page errors', async () => {
      await openFromList(A_ID);
      const viewBtn = dash + ' button[onclick="docAction(' + A_ID + ',\'agreement\',\'view\')"]';
      ok(await p.locator(viewBtn).count() >= 1, 'View packet is offered');
      await p.locator(viewBtn).first().click(); await p.waitForTimeout(800);
      const look = () => p.evaluate(() => {
        const m = document.getElementById('doc-viewer-modal');
        const span = m ? Array.from(m.querySelectorAll('span')).find((s) => s.textContent === '/hcs1/') : null;
        if (!span) return null;
        const cs = getComputedStyle(span);
        return { color: cs.color, size: cs.fontSize, display: cs.display, shown: span.checkVisibility() };
      });
      const sc = await look();
      ok(!!sc, 'the viewer carries his signature marker');
      eq(sc && [sc.color, sc.size, sc.display !== 'none', sc.shown], ['rgb(255, 255, 255)', '6px', true, true], '⚠ white, real-sized, rendered: invisible on the page, present in the text layer');
      await p.emulateMedia({ media: 'print' });
      const pc = await look();
      eq(pc && [pc.color, pc.size, pc.display !== 'none'], ['rgb(255, 255, 255)', '6px', true], '⚠ and in print');
      await p.emulateMedia({ media: 'screen' });
      await p.evaluate(() => { const m = document.getElementById('doc-viewer-modal'); if (m) m.style.display = 'none'; });
      await openFromList(D_ID);
      for (const w of [1440, 390]) {
        await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(400);
        eq(await overflow(), 0, 'no horizontal overflow at ' + w + ' with the filed page on screen');
      }
      await p.setViewportSize({ width: 1440, height: 1000 });
      eq(errs, [], 'no page errors');
    });
  } catch (e) {
    fail++; console.log('  ✗ threw: ' + (e && e.stack || e));
  } finally {
    if (b) await b.close().catch(() => {});
    console.log('\n' + pass + ' passed, ' + fail + ' failed');
  }
})();
