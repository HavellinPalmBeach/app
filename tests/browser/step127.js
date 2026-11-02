// Step 127 (renumbered from 124 on merging main, whose steps 124 to 126 landed first) — the estate's release request through DocuSign survives a device that had not reloaded (2026-11-02; Anthony chose
// the fix of the 2026-10-26c finding: "a device whose copy of the job predates an envelope can still send a request, and its
// stamped docState.approvalRequest wins the whole-record merge, so the envelope's record is gone from every device").
//
// Drives TWO REAL PAGES (A, Anthony's laptop, and B, Ashley's iPad, two browser contexts) over one emulated sheet whose Jobs tab
// runs the REAL saveAllJobsToSheet / saveJobToSheet / getJobsFromSheet / _mergeJobRecord out of apps-script/main-sync.gs, and
// whose inventory merges through saveInventory.gs's _mergeMediaItems. A trust with two trustees, a painting going to auction and
// a lamp to a charity; both pages hold the morning's copy of the client.
//   A. A presses Send through DocuSign: one envelope, on its own key on the sheet, the request holding only its id.
//   B. B, loaded before that and holding the morning's copy, presses Send request: the press reads the client from the sheet
//      first and is refused by name, nothing filed, made a PDF, drafted or sent; B's card then shows the envelope, out for
//      signature, with Check DocuSign and no send.
//   C. B's copy put back to the morning's (as a third device would still hold it), Send through DocuSign pressed: refused the
//      same way. One esignSendRequest in the whole route log; the sheet's envelope as A sent it.
//   D. (found on review) the race the Apps Script is the last word on: B's copy morning's again, and its read before the send
//      answered by the sheet as it stood a moment before A's envelope reached it, so the press goes as far as DocuSign's post, where
//      the Apps Script refuses a second envelope (`refused: 'out'`). B says it as the Apps Script's refusal, never DocuSign's and
//      never with a doubled stop or advice to email the same lines, reads the client again and its card shows the envelope.
//   E. A reloads from the sheet and still reads the envelope; no horizontal overflow at 1440 and 390 on either page; zero page
//      errors.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step127.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), vm = require('vm');
const { matchBrace } = require(path.join(__dirname, '..', 'harness'));
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const J = (x) => JSON.parse(JSON.stringify(x));

// ── THE SHEET: the REAL job merge out of main-sync.gs over an in-memory Jobs tab (step 46's), the REAL inventory merge ──
const ROOT = path.join(__dirname, '..', '..');
const GS = fs.readFileSync(path.join(ROOT, 'apps-script', 'main-sync.gs'), 'utf8');
function gsFn(name) {
  const re = new RegExp('(^|\\n)function\\s+' + name + '\\s*\\(', 'g');
  const m = re.exec(GS); if (!m) throw new Error('not in .gs: ' + name);
  const start = m.index + (m[1] ? m[1].length : 0), open = GS.indexOf('{', re.lastIndex);
  return GS.slice(start, matchBrace(GS, open) + 1);
}
function gsVar(name) {
  const m = GS.match(new RegExp('(^|\\n)(var\\s+' + name + '\\s*=[\\s\\S]*?;)\\n')); if (!m) throw new Error('not in .gs: var ' + name);
  return m[2];
}
function fakeSheet(name, header) {
  const rows = header ? [header.slice()] : [];
  return {
    getName: () => name, getLastRow: () => rows.length,
    getLastColumn: () => rows.reduce((m, r) => Math.max(m, r.length), 0),
    appendRow(r) { rows.push(r.slice()); },
    getDataRange() { return { getValues: () => rows.map((r) => r.slice()) }; },
    getRange(r, c, nr, nc) {
      return {
        getValues() { const out = []; for (let i = 0; i < nr; i++) { const row = rows[r - 1 + i] || [], cells = [];
          for (let j = 0; j < nc; j++) cells.push(row[c - 1 + j] === undefined ? '' : row[c - 1 + j]); out.push(cells); } return out; },
        setValues(v) { v.forEach((cells, i) => { while (rows.length < r + i) rows.push([]); const row = rows[r - 1 + i];
          cells.forEach((cell, j) => { row[c - 1 + j] = cell; }); }); },
        clearContent() { for (let i = 0; i < nr; i++) { const row = rows[r - 1 + i]; if (!row) continue;
          for (let j = 0; j < nc; j++) row[c - 1 + j] = ''; }
          while (rows.length > 1 && rows[rows.length - 1].every((x) => x === '' || x === undefined)) rows.pop(); },
      };
    },
  };
}
const S = {
  console, Logger: { log() {} }, Date, JSON, Math, Number, String, Object, Array,
  LockService: { getScriptLock: () => ({ waitLock() {}, tryLock() { return true; }, releaseLock() {} }) },
  // The job ledger and the deleted-client refusal have their own suites: stubbed, so this step measures the merge.
  _jobRefusal: () => null, _presentJobIds: () => ({}), getJobLedger: () => ({ seen: {}, since: 0 }), _ledgerMarkSeen: () => {},
  _jobsTabUnread: () => '', _recordedDeletes: () => [],
};
const SHEETS = { Jobs: fakeSheet('Jobs', ['ID', 'HVL ID', 'Name', 'Email', 'Phone', 'Address', 'City', 'Zip', 'Service', 'Status', 'Created', 'Data JSON']) };
S.SpreadsheetApp = { flush() {}, openById: () => ({ getSheetByName: (n) => SHEETS[n] || null, insertSheet(n) { SHEETS[n] = fakeSheet(n); return SHEETS[n]; } }) };
vm.createContext(S);
vm.runInContext([gsVar('SHEET_ID'), gsVar('JOB_KEYED_LISTS'), gsVar('JOB_KEYED_MAPS'), gsVar('JOB_LIST_KEY'), gsVar('JOB_PAYMENT_STICKY'),
  gsVar('BACKEND_VERSION'), gsVar('BACKEND_ACTIONS'), gsVar('BACKEND_TYPES'), gsVar('SHEET_CELL_MAX'),
  ...['getJobsFromSheet', 'saveAllJobsToSheet', 'saveJobToSheet', '_jobStamp', '_jobListKey', '_mergeJobKeyed', '_mergeJobRecord', '_paymentSticky',
    '_lockOrBusy', '_jobRowOf', '_jobRowTooLarge', '_commas'].map(gsFn)].join('\n\n'), S, { filename: 'main-sync.gs (extracted)' });
const INV = { Logger: { log() {} }, console }; vm.createContext(INV);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'apps-script', 'saveInventory.gs'), 'utf8'), INV, { filename: 'saveInventory.gs' });

const SYNC = 'https://sync.example.test/exec';
const T0 = Date.parse('2026-10-10T15:00:00Z');
const ID = 12401;
const ENV = 'approvalEnv:env-124';
const OUT_WORDS = 'A request is out for signature in DocuSign: no new request goes until it is complete, or until it is voided in DocuSign.';
const sheetJob = () => J(S.getJobsFromSheet().find((j) => j && j.id === ID) || null);
const shared = { media: {}, estimates: {}, net: [] };   // net: every request either page made, in order: [device, action]

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

    async function device(tag, who) {
      const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
      const d = { tag, ctx, errs: [], dialogs: [] };
      await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
      await ctx.route(SYNC + '**', async (r) => {
        const req = r.request();
        const json = (o) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(o) });
        let body = {}; if (req.method() === 'POST') { try { body = JSON.parse(req.postData() || '{}'); } catch (e) {} }
        const action = body.action || body.type || ((/action=([A-Za-z]+)/.exec(req.url()) || [])[1]) || '';
        shared.net.push({ dev: tag, action, body: action === 'esignSendRequest' ? { envKey: body.envKey, signers: (body.signers || []).map((x) => x.name) } : undefined });
        if (action === 'saveAllJobs') { S.saveAllJobsToSheet(body.payload || []); return json({ ok: true, success: true, dropped: [] }); }
        if (action === 'job') { S.saveJobToSheet(body.payload); return json({ ok: true, success: true, dropped: [] }); }
        if (action === 'loadJobs') {
          const list = S.getJobsFromSheet();
          // Section D: one read answered by the sheet as it stood before A's envelope reached it (B's morning copy in its place).
          if (shared.staleRead === tag) { shared.staleRead = null; const i = list.findIndex((j) => j && j.id === ID); if (i >= 0) list[i] = JSON.parse(shared.morning); }
          return json({ ok: true, success: true, jobs: list, deletedJobs: [], recorded: [] });
        }
        if (action === 'loadMedia') return json({ ok: true, success: true, media: J(shared.media) });
        if (action === 'saveMedia') {
          const pl = body.payload || {}, k = String(pl.jobId);
          shared.media[k] = Object.assign({}, shared.media[k] || {}, { items: J(INV._mergeMediaItems(J((shared.media[k] && shared.media[k].items) || []), J(pl.items || []))) });
          return json({ ok: true, success: true, jobId: k });
        }
        if (action === 'loadEstimates') return json({ ok: true, success: true, estimates: J(shared.estimates) });
        if (action === 'loadContractors') return json({ ok: true, success: true, contractors: { added: [], defaults: [] } });
        if (action === 'version') return json({ ok: true, success: true, version: S.BACKEND_VERSION, actions: S.BACKEND_ACTIONS, types: S.BACKEND_TYPES, deviceKey: 'off' });
        if (action === 'uploadHtml') return json({ ok: true, fileUrl: 'https://drive.google.com/file/d/up' + shared.net.length + '/view', fileId: 'up' + shared.net.length });
        if (action === 'htmlToPdf') return json({ ok: true, base64: Buffer.from('%PDF-1.4 ' + 'x'.repeat(200)).toString('base64') });
        if (action === 'getSubfolders') return json({ ok: true, subfolders: null });
        // Section D: the Apps Script's refusal of a second envelope, in the words and shape esignSendRequestForJob answers it
        // (p2-device-key.test.js holds the server to them).
        if (action === 'esignSendRequest' && shared.refuseOut === tag) return json({ ok: false, refused: 'out',
          error: 'The envelope was not created: a release request for this client is already out for signature in DocuSign (sent November 2, 2026). '
            + 'Reload the app to see it; if it has just been signed or voided, open the client so the app checks DocuSign, then send again.' });
        if (action === 'esignSendRequest') return json({ ok: true, envelopeId: 'env-124', status: 'sent',
          signers: (body.signers || []).map((s, i) => ({ name: s.name, email: s.email, recipientId: String(i + 1), n: i + 1 })) });
        if (action === 'esignStatus') return json({ ok: true, envelopeId: body.envelopeId, status: 'sent', signers: [] });
        if (action === 'getDriveThumbnails') return json({ ok: true, thumbs: {} });
        return json({ ok: true, success: true });
      });
      const p = await ctx.newPage(); p.setDefaultTimeout(15000);
      p.on('pageerror', (e) => d.errs.push(String(e)));
      p.on('dialog', async (dl) => { d.dialogs.push(dl.type() + ': ' + dl.message()); await dl.accept(); });
      d.p = p;
      await p.goto(APP); await p.waitForTimeout(1500);
      // The URL in Settings (kept, so a reload reads the sheet at start-up) and who uses the device; Gmail and new tabs stubbed.
      await p.evaluate(([u, w]) => {
        SHEETS_SYNC_URL = u;
        try { localStorage.setItem('hav_sheets_url', u); localStorage.setItem('hav_device_user', w); } catch (e) {}
        _backendActions = ['esignSendRequest'];   // the deployment answers that it has the action (the version probe's answer)
        window.__drafts = [];
        window.gmailCreateDraft = function (mime, cb) { window.__drafts.push(mime); cb(true, { draftId: 'd1', messageId: 'm1' }); };
        window.open = function () { return null; };
      }, [SYNC, who]);
      d.sent = (a) => shared.net.filter((x) => x.dev === tag && x.action === a);
      return d;
    }

    // The client both pages hold, the same copy on each: a trust, two trustees with email, two lines leaving, the estimate approved.
    const seed = (d) => d.p.evaluate(([ID, T0]) => {
      jobs.unshift({ id: ID, hvlId: 'HVL-2611-E124', name: 'Margaret Ellison', svc: 'cleanout', matterType: 'trust', addr: '5 E St', city: 'Palm Beach', zip: '33480',
        executor: 'Thomas Ellison', executorRole: 'Trustee', executorEmail: 'tom@example.com', deathDate: '2026-04-02', executorAuth: 'received',
        coFiduciaries: [{ id: 'cf1', name: 'Catherine Ellison-Reyes', role: 'Co-Trustee', email: 'cat@example.com', phone: '' }],
        docTier: 'values', gate706: 'no', status: 'active', won: true, wonAt: '2026-09-25', approved: true, tc: 'Ashley Jerome', created: '2026-09-20', start: '2026-10-06',
        activatedOn: '2026-10-05', agrApproved: true, agrSent: true, agrSigned: true, probateAttyName: 'Ann Lowe', probateAttyEmail: 'ann@lowe.law',
        driveFolder: 'https://drive.google.com/drive/folders/ROOT' + ID, driveSubfolders: { 'Estate Inventory': 'INV' + ID, 'As-Found Record': 'AF' + ID, 'Signed Records': 'SR' + ID },
        docState: {}, at: {}, updatedAt: T0,
        payments: [{ uid: 'e' + ID, stage: 'deposit', amount: 20000, receivedOn: '2026-10-01', method: 'wire', clearedOn: '2026-10-01' }] });
      estimateStore[ID] = { approved: true, submitted: true, approvedBy: 'Anthony Graziano', approvedAt: 'September 23, 2026', savedAt: T0,
        estimate: { jobId: ID, svc: 'cleanout', havellinTotal: 40000, fixedPrice: true, fixedAmount: 40000, fixedLines: true, totTC: 100, totPS: 150, tcRate: 150, psRate: 100,
          days: 8, vendors: [], prepItems: [], pkgCost: 0, rooms: [{ idx: 0, name: 'Living Room', st: 'in', vol: 3, cplx: 3 }] } };
      const item = (sid, o) => Object.assign({ stableId: sid, label: 'inventory', roomIdx: 0, seq: 1, status: 'uploaded', category: 'Furniture', disposition: '',
        ts: T0, updatedAt: T0, filename: 'HVL_' + ID + '_INV_' + sid + '.jpg', driveFileId: 'f-' + sid, namedBy: 'desk', reviewed: true }, o);
      _photoRefs[ID] = [
        item('a', { itemNo: 1, objectName: 'Harbor painting', category: 'Art & Décor', fmv: '2400', disposition: 'Auction', channel: 'Kodner Galleries' }),
        item('b', { itemNo: 2, objectName: 'Table lamp', fmv: '60', disposition: 'Donate', channel: 'Goodwill Palm Beach' })];
      savePhotoRefs(ID);
      saveJobs(); localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore));
      const media = {}; media[ID] = { items: JSON.parse(localStorage.getItem('hav_media_' + ID) || '[]') };
      return { media, est: estimateStore[ID] };
    }, [ID, T0]);

    const section = async (name, body) => {
      console.log('\n## ' + name);
      try { await body(); } catch (e) { fail++; console.log('  ✗ ' + name + ' threw: ' + String(e && e.message || e).split('\n')[0]); }
    };
    const until = async (p, f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < (ms || 10000)) { if (await f()) return true; await p.waitForTimeout(250); } return false; };
    const txt = (d, sel) => d.p.evaluate((s) => { const el = document.querySelector(s); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }, sel);
    const vis = (d, sel) => d.p.locator(sel).first().isVisible().catch(() => false);
    const press = async (d, sel, what) => {
      const n = await d.p.locator(sel).count();
      const v = n >= 1 && await vis(d, sel);
      ok(v, d.tag + ': ' + (what || sel) + ' — on screen (' + n + ')');
      if (v) { await d.p.locator(sel).first().click({ timeout: 5000 }).catch((e) => ok(false, (what || sel) + ' — ' + e.message.split('\n')[0])); }
      return v;
    };
    const overflow = (d) => d.p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const toDesk = async (d) => {
      const p = d.p;
      await p.evaluate((id) => { setCurrentJob(id); populateInventorySelect(); }, ID);
      await p.click('.nb[onclick*="\'inventory\'"]'); await p.waitForTimeout(900);
      if (String(await p.evaluate(() => (document.getElementById('inv-job') || {}).value)) !== String(ID)) { await p.selectOption('#inv-job', String(ID)); await p.waitForTimeout(900); }
    };
    const openBar = async (d, fold) => {
      const p = d.p, body = p.locator('#desk-body-' + fold + '-' + ID), hd = p.locator('#desk-hd-' + fold + '-' + ID);
      if ((await body.count()) === 1 && !(await body.isVisible()) && (await hd.isVisible())) { await p.click('#desk-hd-' + fold + '-' + ID); await p.waitForTimeout(300); }
    };
    // What a page holds of the request and its envelopes.
    const held = (d) => d.p.evaluate(([id, k]) => {
      const j = jobs.find((x) => x.id === id) || {}, ds = j.docState || {}, at = j.at || {};
      return { env: ds[k] ? JSON.parse(JSON.stringify(ds[k])) : null, envKeys: Object.keys(ds).filter((x) => x.indexOf('approvalEnv:') === 0),
               ptr: ((ds.approvalRequest || {}).req || {}).envelopeId || null, reqAt: at['docState:approvalRequest'] || null, updatedAt: j.updatedAt || null };
    }, [ID, ENV]);
    const SEND = '#inv-releases button[onclick="sendApprovalRequest(' + ID + ')"]';
    const SEND_DS = '#inv-releases button[onclick="sendApprovalRequestEsign(' + ID + ')"]';
    const CHECK = '#inv-releases button[onclick="approvalEnvelopeCheckNow(' + ID + ')"]';
    const ANY_SEND = '#inv-releases button[onclick^="sendApprovalRequest"], #inv-releases button[onclick^="invRecordRequestApproval"]';

    const A = await device('A', 'Anthony Graziano');
    const B = await device('B', 'Ashley Jerome');
    const seeded = await seed(A); await seed(B);
    shared.media = seeded.media; shared.estimates = {}; shared.estimates[ID] = seeded.est;
    ok(await until(A.p, async () => !!sheetJob(), 8000), 'fixture: the sheet holds the client');
    await toDesk(A); await toDesk(B);
    await openBar(A, 'releases'); await openBar(B, 'releases');

    // ── A ───────────────────────────────────────────────────────────────────
    let sentEnv = null, morning = null;
    await section('A. A presses Send through DocuSign: one envelope, on its own key on the sheet; the request holds only its id', async () => {
      ok(await vis(B, SEND) && await vis(B, SEND_DS), 'fixture: B, loaded before the send, offers Send request and Send through DocuSign');
      morning = await B.p.evaluate((id) => JSON.stringify(jobs.find((x) => x.id === id)), ID);
      await press(A, SEND_DS, 'Send through DocuSign');
      ok(await until(A.p, async () => A.sent('esignSendRequest').length > 0, 10000), 'the envelope was asked for');
      eq(A.sent('esignSendRequest').map((x) => x.body), [{ envKey: 1, signers: ['Thomas Ellison', 'Catherine Ellison-Reyes'] }], 'one envelope, both trustees, the post marked as keeping it on its own key');
      ok(await until(A.p, async () => { const s = sheetJob(); return !!(s && s.docState && s.docState[ENV]); }, 12000), '⚠⚠ the sheet holds the envelope on its own key');
      const s = sheetJob() || {}, e = (s.docState || {})[ENV] || {};
      eq([e.id, e.status, e.stableIds], ['env-124', 'sent', ['a', 'b']], 'the envelope with the lines it carried');
      eq(((s.docState || {}).approvalRequest || {}).req && s.docState.approvalRequest.req.envelopeId, 'env-124', 'and the request on the sheet points at it');
      sentEnv = J(e);
      await openBar(A, 'releases');
      has(await txt(A, '#inv-releases'), 'Out for signature in DocuSign since', 'A\'s card: out for signature');
    });

    // ── B ───────────────────────────────────────────────────────────────────
    await section('B. B, on the morning\'s copy, presses Send request: it reads the sheet first and is refused by name; its card then shows the envelope', async () => {
      const h0 = await held(B);
      eq([h0.envKeys, h0.ptr], [[], null], 'fixture: B\'s copy has no envelope and no request (it has not read the sheet since)');
      ok(await vis(B, SEND), 'fixture: B\'s card still offers Send request');
      const n0 = shared.net.length;
      await press(B, SEND, 'Send request');
      await B.p.waitForTimeout(2500);
      const mine = shared.net.slice(n0).filter((x) => x.dev === 'B').map((x) => x.action);
      ok(mine.indexOf('loadJobs') >= 0, '⚠⚠ the press read the client from the sheet first');
      eq(mine.filter((a) => ['uploadHtml', 'htmlToPdf', 'esignSendRequest'].indexOf(a) >= 0), [], '⚠⚠ nothing filed, made a PDF or sent');
      eq(await B.p.evaluate(() => window.__drafts.length), 0, '⚠⚠ no Gmail draft (before 2026-11-02 the draft went, and its record erased the envelope on every device)');
      has(await txt(B, '#jband-fb-admin'), OUT_WORDS, '⚠⚠ refused by name');
      await openBar(B, 'releases');
      const card = await txt(B, '#inv-releases');
      has(card, 'Out for signature in DocuSign since', '⚠⚠ B\'s card now shows the envelope another device sent');
      has(card, 'to Thomas Ellison and Catherine Ellison-Reyes, 2 lines', 'to whom, and what it carried');
      ok(await vis(B, CHECK), 'with Check DocuSign');
      eq(await B.p.locator(ANY_SEND).count(), 0, 'and no send and no record by hand past it');
      const h1 = await held(B);
      eq([h1.envKeys, h1.ptr], [[ENV], 'env-124'], 'B holds the sheet\'s envelope and request');
      eq(h1.updatedAt, h0.updatedAt, 'what B took from the sheet moved no clock of its own');
    });

    // ── C ───────────────────────────────────────────────────────────────────
    await section('C. the morning\'s copy again (a third device\'s), Send through DocuSign pressed: refused the same way; one envelope in the whole log', async () => {
      await B.p.evaluate((m) => { const j = JSON.parse(m), i = jobs.findIndex((x) => x.id === j.id); jobs[i] = j;
        try { localStorage.setItem('havellin_jobs_v3', JSON.stringify(jobs)); } catch (e) {} }, morning);
      await toDesk(B); await openBar(B, 'releases');
      eq((await held(B)).envKeys, [], 'fixture: B holds the morning\'s copy again');
      ok(await vis(B, SEND_DS), 'fixture: and its card offers Send through DocuSign');
      const n0 = shared.net.length;
      await press(B, SEND_DS, 'Send through DocuSign');
      await B.p.waitForTimeout(2500);
      const mine = shared.net.slice(n0).filter((x) => x.dev === 'B').map((x) => x.action);
      ok(mine.indexOf('loadJobs') >= 0, '⚠⚠ the press read the client from the sheet first');
      eq(mine.filter((a) => ['uploadHtml', 'htmlToPdf', 'esignSendRequest'].indexOf(a) >= 0), [], '⚠⚠ nothing filed, made a PDF or sent');
      has(await txt(B, '#jband-fb-admin'), OUT_WORDS, '⚠⚠ refused by name');
      await openBar(B, 'releases');
      has(await txt(B, '#inv-releases'), 'Out for signature in DocuSign since', 'B\'s card shows the envelope again');
      ok(await vis(B, CHECK), 'with Check DocuSign');
      eq(shared.net.filter((x) => x.action === 'esignSendRequest').map((x) => x.dev), ['A'], '⚠⚠ one esignSendRequest in the whole route log, A\'s');
      await B.p.waitForTimeout(2500);   // whatever B saved meanwhile reaches the sheet
      const s = sheetJob() || {};
      eq((s.docState || {})[ENV], sentEnv, '⚠⚠ the sheet\'s envelope is as A sent it');
      eq(((s.docState || {}).approvalRequest || {}).req && s.docState.approvalRequest.req.envelopeId, 'env-124', 'and the request still points at it');
    });

    // ── D ───────────────────────────────────────────────────────────────────
    await section('D. the race: B\'s read finds no envelope, the Apps Script refuses the second one; B says so as its refusal and shows the envelope', async () => {
      shared.morning = morning;
      await B.p.evaluate((m) => { const j = JSON.parse(m), i = jobs.findIndex((x) => x.id === j.id); jobs[i] = j;
        try { localStorage.setItem('havellin_jobs_v3', JSON.stringify(jobs)); } catch (e) {} }, morning);
      await toDesk(B); await openBar(B, 'releases');
      ok(await vis(B, SEND_DS), 'fixture: B holds the morning\'s copy again, and its card offers Send through DocuSign');
      shared.staleRead = 'B'; shared.refuseOut = 'B';
      const n0 = shared.net.length, dl0 = B.dialogs.length;
      await press(B, SEND_DS, 'Send through DocuSign');
      ok(await until(B.p, async () => (await txt(B, '#jband-fb-admin')).indexOf('Not sent:') >= 0, 12000), 'B answers');
      const mine = shared.net.slice(n0).filter((x) => x.dev === 'B').map((x) => x.action);
      eq([mine.filter((a) => a === 'esignSendRequest').length, mine.filter((a) => a === 'loadJobs').length], [1, 2],
        'fixture: the read found nothing, the post went and was refused, and B read the client again');
      const fb = await txt(B, '#jband-fb-admin');
      has(fb, 'Not sent: a release request for this client is already out for signature in DocuSign (sent ', '⚠⚠ said as the Apps Script\'s refusal of a second envelope');
      has(fb, 'It is on the Releases card now; no new request goes until it is complete in DocuSign, or voided there.', 'and where the envelope now shows');
      ok(!/DocuSign did not take|\.\.|Send request to email it/.test(fb), '⚠⚠ never DocuSign\'s answer, never a doubled stop, never "email it" (' + fb.slice(0, 120) + ')');
      await openBar(B, 'releases');
      has(await txt(B, '#inv-releases'), 'Out for signature in DocuSign since', '⚠⚠ B\'s card shows the envelope at once');
      ok(await vis(B, CHECK), 'with Check DocuSign');
      eq(await B.p.locator(ANY_SEND).count(), 0, 'and no send past it');
      eq(B.dialogs.slice(dl0), [], 'no alert');
      await B.p.waitForTimeout(2000);
      eq(((sheetJob() || {}).docState || {})[ENV], sentEnv, 'the sheet\'s envelope is as A sent it');
    });

    // ── E ───────────────────────────────────────────────────────────────────
    await section('E. A reloads from the sheet and still reads the envelope; no overflow at 1440 and 390; zero page errors', async () => {
      const loads0 = A.sent('loadJobs').length;
      await A.p.reload(); await A.p.waitForTimeout(2500);
      ok(A.sent('loadJobs').length > loads0, 'fixture: the reloaded page read the client list from the sheet');
      await toDesk(A); await openBar(A, 'releases');
      const h = await held(A);
      eq([h.env && h.env.id, h.env && h.env.status, h.ptr], ['env-124', 'sent', 'env-124'], '⚠⚠ A still holds the envelope and the request pointing at it');
      has(await txt(A, '#inv-releases'), 'Out for signature in DocuSign since', '⚠⚠ and its card reads it');
      ok(await vis(A, CHECK), 'with Check DocuSign');
      eq(await A.p.locator(ANY_SEND).count(), 0, 'and no send past it');
      for (const d of [A, B]) {
        for (const w of [1440, 390]) {
          await d.p.setViewportSize({ width: w, height: 900 }); await d.p.waitForTimeout(500);
          await openBar(d, 'releases');
          eq(await overflow(d), 0, d.tag + ': no horizontal overflow at ' + w + ' with the envelope on the card');
        }
      }
      eq(A.errs.concat(B.errs), [], 'zero page errors on either page');
    });
  } catch (e) { fail++; console.log('  ✗ threw: ' + (e && e.stack || e)); }
  if (b) await b.close().catch(() => {});
  console.log('\nstep127: ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
