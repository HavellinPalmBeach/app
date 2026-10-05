// Step 63 — P21, Anthony's answers to Q28–Q32 (2026-10-05: "yes to all, build P21").
//
// Drives the REAL page through its own controls against one fake Apps Script (its stores, htmlToPdf and esignSend
// answered as the 2026-10-05 deployment would) and the Gmail drafts API, routed. Seeded: four trust-only estates,
// agreed and approved, the packet not yet sent.
//
//   A. The signing packet, opened from the dashboard on a trust with a co-trustee: the signature page names who signs
//      before the work begins ("until the Client and Havellin have signed"), never "both signatures"; printed at Letter.
//   B. 📄 Send as PDF to sign by hand: the Gmail draft's text and html parts say "Each co-representative named on the
//      signature page signs it too." right after "sign and return it"; a client with nobody beside them gets the email
//      as it always was.
//   C. ✉ Send for signature — DocuSign with the co-trustee recorded at the client's own address: the envelope goes, and
//      the notice is amber and names who shares which address; a send with two addresses stays green and says nothing.
//   D. Overflow at 1440 and 390 with the amber notice on screen; no page errors.
//
//   NODE_PATH=/opt/node22/lib/node_modules node tests/browser/step63.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');

const SYNC = 'https://script.google.com/macros/s/STEP63/exec';
const BOX = 'anthony@havellinpalmbeach.com';
const STORE = { jobs: [], estimates: {} };
const POSTS = [], PDFS = [], SENDS = [], DRAFTS = [];
const PAPER_ID = 6301, SHARED_ID = 6302, ALONE_ID = 6303, CLEAN_ID = 6304;
const Q30_NEW = 'No work will begin until the Client and Havellin have signed and the deposit has been received.';
const Q30_OLD = 'until both signatures are obtained';
const Q31_SENT = 'When you are ready, sign and return it and we will confirm the schedule.';
const Q31_LINE = 'Each co-representative named on the signature page signs it too.';

// The parts of a captured MIME draft, decoded: [{type, body}] for every text part.
function mimeParts(mime) {
  const out = [];
  const bounds = [...String(mime).matchAll(/boundary="([^"]+)"/g)].map((m) => m[1]);
  bounds.forEach((bd) => {
    String(mime).split('--' + bd).slice(1).forEach((chunk) => {
      const i = chunk.indexOf('\r\n\r\n'); if (i < 0) return;
      const head = chunk.slice(0, i), body = chunk.slice(i + 4);
      const type = ((/Content-Type:\s*([^;\r\n]+)/i.exec(head) || [])[1] || '').trim();
      if (!/^text\//.test(type)) return;
      const b64 = /Content-Transfer-Encoding:\s*base64/i.test(head);
      out.push({ type, body: b64 ? Buffer.from(body.replace(/\r\n/g, '').replace(/--$/, ''), 'base64').toString('utf8') : body });
    });
  });
  return out;
}
const flat = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&rsquo;/g, '’')
  .replace(/&nbsp;/g, ' ').replace(/&mdash;/g, '—').replace(/&middot;/g, '·').replace(/\s+/g, ' ').trim();

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
        if (body.action === 'htmlToPdf') { PDFS.push(body.html); return json({ ok: true, base64: Buffer.from('%PDF-1.4 step63 #' + PDFS.length + ' ' + 'x'.repeat(120)).toString('base64') }); }
        if (body.action === 'esignSend') {
          SENDS.push(body);
          // As the 2026-10-05 deployment answers: who it put on the envelope beside the client, at which address.
          return json({ ok: true, envelopeId: 'env-63-' + SENDS.length, status: 'sent', sentAt: '',
            coSigners: (body.coSigners || []).map((c, i) => ({ name: c.name, email: c.email, recipientId: String(4 + i) })) });
        }
        if (body.action === 'uploadHtml') return json({ ok: true, fileUrl: 'https://drive.google.com/file/d/H' + POSTS.length + '/view', fileId: 'H' + POSTS.length });
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
    await p.evaluate(() => { const bn = document.getElementById('backend-stale-banner'); if (bn) bn.remove(); });
    // The page's own hooks for what a headless browser cannot do: a Google sign-in popup (the token is handed over and
    // the Gmail API is routed), a new tab, and the print dialog (captured with the page width at that moment).
    const hook = () => p.evaluate(() => {
      window.gmailAuth = function (cb) { cb('tok-step63'); };
      window.open = function () { return null; };
      window.__prints = window.__prints || [];
      window.print = function () { const pt = document.getElementById('print-target');
        window.__prints.push({ html: pt ? pt.innerHTML : '', over: document.documentElement.scrollWidth - document.documentElement.clientWidth }); };
    });
    await hook();

    const section = async (name, body) => {
      console.log('\n## ' + name);
      await p.evaluate(() => document.querySelectorAll('.modal-overlay').forEach((m) => { if (getComputedStyle(m).display !== 'none') m.style.display = 'none'; })).catch(() => {});
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
    const notice = () => p.evaluate(() => { const a = document.querySelector('#client-dashboard-view .alert'); return a ? { cls: a.className, text: a.textContent.replace(/\s+/g, ' ').trim() } : { cls: '', text: '' }; });

    // ── Seed ────────────────────────────────────────────────────────────────────────────────────────────────
    const DAN = { id: 'cf1', name: 'Daniel Adler', role: 'Trustee', phone: '(561) 555-0103', email: 'dan@adler.example' };
    await p.evaluate(([PAPER_ID, SHARED_ID, ALONE_ID, CLEAN_ID, DAN]) => {
      const base = (id, o) => Object.assign({ id, hvlId: 'HVL-2610-' + id, svc: 'cleanout', matterType: 'trust', status: 'won', won: true, approved: true,
        wonAt: '2026-10-01', wonBy: 'Ashley Jerome', wonMethod: 'call', created: 'Sep 28, 2026', walkthrough: '2026-09-29', estimateSentDate: 'September 30, 2026',
        docState: { estimate: { draftedAt: '2026-09-30T14:00:00.000Z', sentAt: '2026-09-30T14:05:00.000Z', provider: 'gmail' } },
        tc: 'Ashley Jerome', addr: '100 Ocean Blvd', city: 'Palm Beach', zip: '33480', deathDate: '2026-08-01', docTier: 'values', gate706: 'no',
        executor: 'Ruth Adler', executorRole: 'Trustee', executorEmail: 'ruth@adler.example', executorPhone: '(561) 555-0101', executorAuth: 'received',
        trustName: 'Adler Family Trust', trustDate: '2015-03-03', start: '2026-10-19',
        driveFolder: 'https://drive.google.com/drive/folders/ROOT' + id, driveSubfolders: { Agreement: 'AGR' + id, 'Signed Records': 'SR' + id, Estimates: 'EST' + id, Invoices: 'INV' + id },
        coFiduciaries: [Object.assign({}, DAN)], at: {}, updatedAt: Date.now() - 86400000, payments: [] }, o);
      const ids = [PAPER_ID, SHARED_ID, ALONE_ID, CLEAN_ID];
      jobs = jobs.filter((j) => ids.indexOf(j.id) < 0);
      jobs.unshift(base(PAPER_ID, { name: 'Harold Adler', fname: 'Harold', lname: 'Adler' }));
      jobs.unshift(base(SHARED_ID, { name: 'Walter Adler', fname: 'Walter', lname: 'Adler', coFiduciaries: [Object.assign({}, DAN, { email: 'ruth@adler.example' })] }));
      jobs.unshift(base(ALONE_ID, { name: 'Edith Adler', fname: 'Edith', lname: 'Adler', coFiduciaries: [] }));
      jobs.unshift(base(CLEAN_ID, { name: 'Clara Adler', fname: 'Clara', lname: 'Adler' }));
      ids.forEach((id) => {
        estimateStore[id] = { approved: true, submitted: true, approvedBy: 'Anthony Graziano', approvedAt: 'September 30, 2026', savedAt: Date.now() - 86400000,
          estimate: { jobId: id, svc: 'cleanout', havellinTotal: 24000, fixedPrice: false, tcFee: 9000, psFee: 15000, totTC: 60, totPS: 150, tcRate: 150, psRate: 100,
            days: 5, docScope: 'full', docTier: 'values', collections: [], vendors: [], prepItems: [], rooms: [{ idx: 1, name: 'Study', st: 'in', vol: 3, cplx: 3 }] } };
      });
      try { localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore)); } catch (x) {}
      saveJobs(); renderJobs();
    }, [PAPER_ID, SHARED_ID, ALONE_ID, CLEAN_ID, DAN]);
    await settle();

    // ════════════════════════════════════════════════════════════════════════════════════════════════════
    await section('A. the signing packet: the signature page names who signs before the work begins (Q30)', async () => {
      await openFromList(PAPER_ID);
      const view = dash + ' button[onclick="docAction(' + PAPER_ID + ',\'agreement\',\'view\')"]';
      ok(await p.locator(view).count() >= 1, 'View the signing packet is offered on the dashboard');
      await p.locator(view).first().click(); await p.waitForTimeout(700);
      const h = await p.evaluate(() => { const v = document.getElementById('doc-viewer-body'); return v ? v.innerHTML : ''; });
      ok(h.length > 20000, 'fixture: the packet is open in the viewer (' + h.length + ')');
      const sp = h.slice(Math.max(0, h.indexOf('agr-sig-page')));
      ok(sp.length > 1000 && sp.length < h.length, 'fixture: its signature page');
      has(flat(sp), Q30_NEW, '⚠⚠ the signature page names who signs before the work begins');
      lacks(flat(h), Q30_OLD, '⚠⚠ and never counts "both signatures"');
      ok(flat(sp).indexOf(Q30_NEW) < flat(sp).indexOf('Co-Signer'), 'above the co-trustee\'s block it is about');
      has(flat(sp), 'Daniel Adler', 'fixture: the co-trustee\'s block is on the page');
      // Printed, under print media at Letter width.
      const before = await p.evaluate(() => (window.__prints || []).length);
      await p.setViewportSize({ width: 816, height: 1056 });
      await p.emulateMedia({ media: 'print' });
      await p.evaluate((id) => docAction(id, 'agreement', 'print'), PAPER_ID);
      await until(async () => (await p.evaluate(() => (window.__prints || []).length)) > before, 5000);
      const pr = await p.evaluate(() => (window.__prints || []).slice(-1)[0] || { html: '', over: 0 });
      has(flat(pr.html), Q30_NEW, 'the printed packet carries it');
      ok(pr.html.length > 20000 && pr.over <= 0, '⚠ and fits a Letter page in print (' + pr.over + ')');
      await p.emulateMedia({ media: 'screen' });
      await p.setViewportSize({ width: 1440, height: 1000 });
      await p.waitForTimeout(800); await hook();
      await p.evaluate(() => closeDocViewer());
    });

    // ════════════════════════════════════════════════════════════════════════════════════════════════════
    await section('B. 📄 Send as PDF to sign by hand: the email says each co-representative signs too (Q31)', async () => {
      await openFromList(PAPER_ID);
      const d0 = DRAFTS.length;
      await press(dash + ' button[onclick="docAction(' + PAPER_ID + ",'agreement','send',{via:'paper'})\"]", '📄 Send as PDF to sign by hand');
      await until(async () => DRAFTS.length > d0, 10000);
      eq(DRAFTS.length - d0, 1, '⚠ one Gmail draft');
      const parts = mimeParts(DRAFTS[d0] || '');
      const plain = (parts.find((x) => x.type === 'text/plain') || {}).body || '';
      const html = (parts.find((x) => x.type === 'text/html') || {}).body || '';
      ok(plain.length > 100 && html.length > 500, 'fixture: the draft\'s text and html parts (' + plain.length + ', ' + html.length + ')');
      has(plain, Q31_SENT + ' ' + Q31_LINE, '⚠⚠ the text part says it, right after "sign and return it"');
      has(flat(html), Q31_SENT + ' ' + Q31_LINE, '⚠⚠ and the html part, in the same paragraph');
      eq([plain.split(Q31_LINE).length - 1, flat(html).split(Q31_LINE).length - 1], [1, 1], 'once in each');
      has(plain, 'Dear Ruth', 'fixture: addressed to the trustee');
      await settle();
      // A client with nobody beside them gets the email as it always was.
      await openFromList(ALONE_ID);
      const d1 = DRAFTS.length;
      await press(dash + ' button[onclick="docAction(' + ALONE_ID + ",'agreement','send',{via:'paper'})\"]", '📄 Send as PDF to sign by hand (nobody beside the client)');
      await until(async () => DRAFTS.length > d1, 10000);
      const parts2 = mimeParts(DRAFTS[d1] || '');
      const plain2 = (parts2.find((x) => x.type === 'text/plain') || {}).body || '';
      const html2 = (parts2.find((x) => x.type === 'text/html') || {}).body || '';
      ok(plain2.length > 100, 'fixture: the second draft');
      has(plain2, Q31_SENT, 'the sentence is there');
      lacks(plain2 + flat(html2), Q31_LINE, '⚠ and nothing about co-representatives');
      await settle();
    });

    // ════════════════════════════════════════════════════════════════════════════════════════════════════
    await section('C. ✉ DocuSign with a co-trustee at the client\'s address: the envelope goes and the notice names it (Q32)', async () => {
      await openFromList(SHARED_ID);
      const s0 = SENDS.length;
      await press(dash + ' .jt-next button[onclick="docAction(' + SHARED_ID + ',\'agreement\',\'send\')"]', '✉ Send for signature — DocuSign');
      await until(async () => !!((((await job(SHARED_ID)) || {}).docState || {}).agreement || {}).esign);
      eq(SENDS.length - s0, 1, '⚠ the envelope goes: nothing is refused until the sandbox says DocuSign refuses it');
      const s = SENDS[SENDS.length - 1] || {};
      eq([s.signerEmail, (s.coSigners || []).map((c) => c.email)], ['ruth@adler.example', ['ruth@adler.example']], 'fixture: the client and the co-trustee at one address');
      const n = await notice();
      has(n.cls, 'a-warn', '⚠⚠ the notice is amber');
      has(n.text, 'Sent to Ruth Adler and Daniel Adler for signature through DocuSign', 'it says who the envelope went to');
      has(n.text, 'Ruth Adler and Daniel Adler are on the envelope at one email address (ruth@adler.example): make sure each of them signs for themselves.',
          '⚠⚠ and names who shares which address');
      // Measured with the amber notice on screen.
      eq(await overflow(), 0, 'no horizontal overflow at 1440 with the notice');
      await p.setViewportSize({ width: 390, height: 900 }); await p.waitForTimeout(400);
      eq(await overflow(), 0, 'nor at 390');
      ok(await vis(dash + ' .alert'), 'the notice is on screen at 390');
      await p.setViewportSize({ width: 1440, height: 1000 }); await p.waitForTimeout(300);
      await settle();
      // Two addresses: the send it always was, green and silent about addresses.
      await openFromList(CLEAN_ID);
      await press(dash + ' .jt-next button[onclick="docAction(' + CLEAN_ID + ',\'agreement\',\'send\')"]', '✉ Send for signature — DocuSign (two addresses)');
      await until(async () => !!((((await job(CLEAN_ID)) || {}).docState || {}).agreement || {}).esign);
      const n2 = await notice();
      has(n2.cls, 'a-ok', 'a send with two addresses reads ok');
      lacks(n2.text, 'one email address', 'and says nothing of addresses');
      await settle();
    });

    // ════════════════════════════════════════════════════════════════════════════════════════════════════
    await section('D. no page errors', async () => {
      eq(errs, [], 'zero page errors');
    });
  } catch (e) {
    fail++; console.log('  ✗ the step threw: ' + String(e && e.stack || e).split('\n').slice(0, 3).join(' | '));
  } finally {
    if (b) await b.close().catch(() => {});
    console.log('\nstep63: ' + pass + ' passed, ' + fail + ' failed');
    process.exit(fail ? 1 : 0);
  }
})();
