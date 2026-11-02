// Step 132 — approval by where it goes (2026-11-02; Anthony, after the first request through DocuSign: "there should be a button there
// to get approval"; "shouldn't somewhere on the big list of items, it should show that they've been approved"; "Hold unreviewed
// lines"; "that brown bar is anchored to the bottom of the page"). Drives the REAL page on a probate estate with two representatives:
// A: ✓ Approved on the approved painting's row and the headings' counts. B: the Donate heading's Get approval, a flagged lamp held off
// until ticked, the press sending the group as a selection through DocuSign. C: the selection bar at the top, held under the top bar.
// D: Set recipient over a Keep line refused by name. F: overflow at 1440 and 390, zero errors.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step132.js [/abs/path/to/havellin.html]
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
const EST = 12001;

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
    let sheet = {}, sheetDown = false;
    // The Jobs tab as this page last sent it (one device, so its newest copy stands): an estate's send reads the client from the
    // sheet before anything goes (approvalRecordFromSheet, 2026-11-02), and the read answers from here.
    const sheetJobs = {};
    await ctx.route(SYNC + '**', async (r) => {
      if (sheetDown) return r.abort();   // the sheet unreachable (section K): every request to the configured URL fails
      const req = r.request();
      const json = (o) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
      if (req.method() === 'POST') {
        let body = {}; try { body = JSON.parse(req.postData() || '{}'); } catch (e) {}
        if (body.type === 'saveAllJobs') (body.payload || []).forEach((j) => { if (j && j.id != null) sheetJobs[j.id] = j; });
        if (body.type === 'job' && body.payload && body.payload.id != null) sheetJobs[body.payload.id] = body.payload;
        if (body.action === 'uploadHtml') return json({ ok: true, fileUrl: 'https://drive.google.com/file/d/up1/view', fileId: 'up1' });
        if (body.action === 'htmlToPdf') return json({ ok: true, base64: Buffer.from('%PDF-1.4 ' + 'x'.repeat(200)).toString('base64') });
        if (body.action === 'getSubfolders') return json({ ok: true, subfolders: null });
        return json({ ok: true });
      }
      if (/action=loadMedia/.test(req.url())) return json({ ok: true, media: sheet });
      if (/action=loadJobs/.test(req.url())) return json({ ok: true, success: true, jobs: Object.values(sheetJobs), deletedJobs: [], recorded: [] });
      return json({ ok: true });
    });
    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    // What the page asked, and how this step answers it (true: OK, false: Cancel).
    const dialogs = []; let answer = true, promptAnswer = '';
    p.on('dialog', async (d) => {
      dialogs.push(d.type() + ': ' + d.message());
      if (d.type() === 'prompt') { await d.accept(promptAnswer); return; }
      if (answer) await d.accept(); else await d.dismiss();
    });
    await p.goto(APP); await p.waitForTimeout(1600);
    await p.evaluate((u) => {
      SHEETS_SYNC_URL = u;
      window.open = function () { return null; };
      window.gmailCreateDraft = function (mime, cb) { cb(true, { draftId: 'd1', messageId: 'm1' }); };
      window.sendInternalEmail = function () {};
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
    const val = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.value : null; }, sel);
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const line = (id) => p.evaluate(([j, id]) => JSON.parse(JSON.stringify((_photoRefs[j] || []).find((x) => x.stableId === id) || null)), [EST, id]);
    const complete = (id) => p.evaluate(([j, id]) => { const r = (_photoRefs[j] || []).find((x) => x.stableId === id); return invApprovalComplete(r, jobs.find((x) => x.id === j)); }, [EST, id]);
    const toDesk = async (id) => {
      await p.evaluate((id) => { setCurrentJob(id); populateInventorySelect(); }, id);
      await p.click('.nb[onclick*="\'inventory\'"]'); await p.waitForTimeout(900);
      if (String(await val('#inv-job')) !== String(id)) { await p.selectOption('#inv-job', String(id)); await p.waitForTimeout(900); }
    };
    const openBar = async (fold, id) => {
      const body = p.locator('#desk-body-' + fold + '-' + id), hd = p.locator('#desk-hd-' + fold + '-' + id);
      if ((await body.count()) === 1 && !(await body.isVisible()) && (await hd.isVisible())) { await p.click('#desk-hd-' + fold + '-' + id); await p.waitForTimeout(300); }
    };
    const relLine = () => p.evaluate((id) => { const el = document.getElementById('desk-stat-releases-' + id); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }, EST);
    const syncSheet = () => p.evaluate((id) => { const o = {}; o[id] = { items: JSON.parse(localStorage.getItem('hav_media_' + id) || '[]') }; return o; }, EST).then((o) => { sheet = o; });
    const typeIn = async (sel, v, what) => {
      const n = await p.locator(sel).count();
      ok(n === 1 && await vis(sel), what + ' — on screen (' + n + ')');
      if (n === 1) { await p.fill(sel, v); await p.press(sel, 'Tab'); await p.waitForTimeout(700); }
    };
    const dispSel = (id) => 'select[onchange="_invEdit(' + EST + ',\'' + id + '\',\'disposition\',this)"]';
    const recipSel = (id) => 'input.inv-recip[onchange="_invEdit(' + EST + ',\'' + id + '\',\'channel\',this)"]';
    const totalSel = (id) => '#inv-fmv-' + id;

    // ── Seed ────────────────────────────────────────────────────────────────
    sheet = await p.evaluate(([EST, T0]) => {
      // RESTATED on merging P4 (2026-10-27): a firearm's dealer is a Vendor Directory firm under Firearms Dealer (FFL), so this device
      // has loaded a directory that lists the dealers the shotguns below go through and are sold to.
      vendorDirectory = ['Palm Beach Arms', 'Jupiter Guns & Pawn'].map((n) => ({ vendor_name: n, category: 'Firearms Dealer (FFL)', status: 'Active' }));
      try { localStorage.setItem('hav_vendor_dir', JSON.stringify(vendorDirectory)); } catch (e) {}
      jobs.unshift({ id: EST, hvlId: 'HVL-2610-E118', name: 'Harold Ashworth', svc: 'probate', matterType: 'probate', addr: '14 Seaspray Ave', city: 'Palm Beach', zip: '33480',
        executor: 'Thomas Ashworth', executorRole: 'Personal Representative', executorEmail: 'tom@example.com', deathDate: '2026-04-02', executorAuth: 'received',
        coFiduciaries: [{ id: 'cf1', name: 'Nora Ashworth', role: 'Co-Personal Representative', email: 'nora@example.com', phone: '' }],
        probateAttyName: 'Ann Lowe', probateAttyEmail: 'ann@lowe.law',
        probateCase: '50-2026-CP-001234', docTier: 'values', gate706: 'no', status: 'active', won: true, wonAt: '2026-09-25', approved: true, tc: 'Ashley Jerome',
        created: '2026-09-20', start: '2026-10-06', activatedOn: '2026-10-05', agrApproved: true, agrSent: true, agrSigned: true,
        driveFolder: 'https://drive.google.com/drive/folders/ROOT118', driveSubfolders: { 'Estate Inventory': 'INV118', 'As-Found Record': 'AF118', 'Signed Records': 'SR118' },
        docState: { estimate: { sentAt: '2026-09-24T14:00:00Z' }, agreement: { sentAt: '2026-09-26T14:00:00Z', sig: { signedBy: 'T', signedAt: '2026-09-28' } }, 'invoice:deposit': { sentAt: '2026-09-29T14:00:00Z' } },
        payments: [{ uid: 'e1', stage: 'deposit', amount: 20000, receivedOn: '2026-10-01', method: 'wire', clearedOn: '2026-10-01' }], proceedsStatements: [] });
      estimateStore[EST] = { approved: true, submitted: true, approvedBy: 'Anthony Graziano', approvedAt: 'September 23, 2026', savedAt: T0,
        estimate: { jobId: EST, svc: 'probate', havellinTotal: 40000, fixedPrice: true, fixedAmount: 40000, fixedLines: true, totTC: 100, totPS: 150, tcRate: 150, psRate: 100,
          days: 8, vendors: [], prepItems: [], pkgCost: 0, rooms: [{ idx: 0, name: 'Living Room', st: 'in', vol: 3, cplx: 3 }] } };
      const item = (id, o) => Object.assign({ stableId: id, label: 'inventory', roomIdx: 0, seq: 1, status: 'uploaded', category: 'Furniture', disposition: '',
        objectName: 'Line ' + id, ts: T0, updatedAt: T0, filename: 'HVL_' + EST + '_INV_' + id + '.jpg', driveFileId: 'f-' + id, namedBy: 'desk', reviewed: true }, o);
      _photoRefs[EST] = [
        item('a', { itemNo: 1, objectName: 'Harbor scene oil painting', category: 'Art & Décor', fmv: 2400, disposition: 'Auction', channel: 'Kodner Galleries',
          authBy: 'Thomas Ashworth; Nora Ashworth', approvalDate: '2026-10-12', authFor: { disposition: 'Auction', channel: 'Kodner Galleries', fmv: 2400 } }),
        item('b', { itemNo: 2, objectName: 'Walnut dresser', fmv: 450, disposition: 'Sell', channel: 'Palm Beach Estate Buyers' }),
        item('c', { itemNo: 4, objectName: 'Dining chairs', fmv: 300, disposition: 'Donate', channel: 'Goodwill Palm Beach' }),
        item('e', { itemNo: 5, objectName: 'Brass floor lamp', fmv: 40, valuedBy: 'desk', disposition: 'Donate', channel: 'Goodwill Palm Beach', namedBy: 'agent', reviewed: false, needsAppr: true }),
        item('d', { itemNo: 18, objectName: 'Stand mixer', fmv: 80, disposition: 'Keep' })];
      savePhotoRefs(EST);
      saveJobs(); localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore));
      const out = {}; out[EST] = { items: JSON.parse(localStorage.getItem('hav_media_' + EST) || '[]') }; return out;
    }, [EST, T0]);


    const groupHead = (key) => txt('#inv-grph-' + key);
    // ── A ───────────────────────────────────────────────────────────────────
    await section('A. approved shows on the list: ✓ Approved under Who takes it, and the group heading counts', async () => {
      await toDesk(EST);
      has(await txt('#inv-apr-a'), '✓ Approved Oct 12', '⚠⚠ the approved painting reads ✓ Approved Oct 12 on its row');
      ok(await vis('#inv-apr-a'), 'and it is on screen');
      has(await p.evaluate(() => (document.getElementById('inv-apr-a') || {}).title || ''), 'Thomas Ashworth', 'who signed, on hover');
      eq(await txt('#inv-apr-b'), '', 'the dresser, not approved, reads nothing');
      has(await groupHead('Auction'), '✓ 1 of 1 approved', 'the Auction heading: 1 of 1 approved');
      has(await groupHead('Sell'), '0 of 1 approved', 'the Sell heading: 0 of 1');
      lacks(await groupHead('Keep'), 'approved', 'the Keep heading counts nothing');
    });

    // ── B ───────────────────────────────────────────────────────────────────
    await section('B. Get approval on a heading: a flagged line waits for its review; ticked, it goes; the press sends the group', async () => {
      has(await groupHead('Donate'), 'Get approval · 1', '⚠⚠ the Donate heading offers Get approval for the chairs alone');
      await openBar('releases', EST);
      has(await txt('#inv-releases'), '1 line is still flagged for a look, so it is not asked for', 'the card says the lamp waits for a review');
      has(await relLine(), '1 item waits for a review before it is asked for', 'and the Releases bar');
      const box = '#inv-rev-e input[type="checkbox"]';
      ok((await p.locator(box).count()) === 1, 'the lamp\'s Reviewed box is on its row');
      await p.locator(box).first().click(); await p.waitForTimeout(900);
      has(await groupHead('Donate'), 'Get approval · 2', 'ticked, the lamp joins: Get approval · 2');
      await p.evaluate(() => {
        window._sent = null;
        window.approvalRequestEsignRefusal = function () { return ''; };   // the deployment takes the DocuSign route
        window.sendApprovalRequest = function (j, sel, via) { window._sent = { j: j, sel: sel, via: via, picked: Object.keys(_invPick).sort() }; };
      });
      dialogs.length = 0; answer = true;
      await press('#inv-grph-Donate .inv-grp-approve', 'Get approval on the Donate heading');
      has(dialogs[0] || '', 'Send 2 Donate lines for written approval to Thomas Ashworth and Nora Ashworth, to sign in DocuSign?', '⚠ asked first, naming who and how');
      eq(await p.evaluate(() => window._sent), { j: EST, sel: true, via: 'docusign', picked: ['c', 'e'] }, '⚠⚠ the two Donate lines, as a selection, through DocuSign');
      ok(await vis('#inv-bulk-' + EST), 'the selection bar shows them');
    });

    // ── C ───────────────────────────────────────────────────────────────────
    await section('C. the selection bar sits at the top and stays in view; it offers the DocuSign send', async () => {
      const bar = '#inv-bulk-' + EST;
      eq(await p.evaluate((s) => getComputedStyle(document.querySelector(s)).position, bar), 'sticky', 'sticky');
      const before = await p.evaluate((s) => document.querySelector(s).getBoundingClientRect().top, bar);
      await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(400);
      const r = await p.evaluate((s) => { const b = document.querySelector(s).getBoundingClientRect(), t = document.querySelector('.topbar'); return { top: b.top, bottom: b.bottom, tb: t ? t.getBoundingClientRect().bottom : 0 }; }, bar);
      ok(r.top >= r.tb - 2 && r.top <= r.tb + 40, '⚠⚠ scrolled to the foot, the bar is held just under the top bar (' + Math.round(r.top) + ' px, top bar ends ' + Math.round(r.tb) + ')');
      ok(await vis(bar + ' button[onclick="sendApprovalRequest(' + EST + ',true,\'docusign\')"]'), 'Send through DocuSign on the bar');
      ok(before >= 0, 'fixture: the bar was drawn (' + Math.round(before) + ')');
      await p.evaluate(() => window.scrollTo(0, 0));
    });

    // ── D ───────────────────────────────────────────────────────────────────
    await section('D. Set recipient over a Keep line: left as it was, and said', async () => {
      await p.evaluate(() => { _invPick = {}; renderInventoryTab(); }); await p.waitForTimeout(500);
      await p.locator('input[onchange="_invTogglePick(\'d\',this)"]').first().click(); await p.waitForTimeout(600);
      await typeIn('#inv-bulk-recip', 'Owen Ellison', 'the selection bar\'s recipient box');
      dialogs.length = 0;
      await press('#inv-bulk-' + EST + ' button:has-text("Set recipient")', 'Set recipient');
      ok(dialogs.some((d) => /not leaving the property left as it was .*set it to Distribute first\. Nothing was changed\./.test(d)), '⚠⚠ refused by name: set it to Distribute first');
      eq(String((await line('d')).channel || ''), '', 'the mixer takes no recipient');
    });

    // ── F ───────────────────────────────────────────────────────────────────
    await section('F. overflow and errors', async () => {
      await p.evaluate(() => { _invPick = { c: 1 }; renderInventoryTab(); }); await p.waitForTimeout(500);
      eq(await overflow(), 0, 'no sideways scroll at 1440');
      await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(600);
      eq(await overflow(), 0, 'nor at 390');
      eq(errs, [], 'no page errors');
    });

    await b.close();
    console.log('\n' + pass + ' passed, ' + fail + ' failed');
    process.exit(fail ? 1 : 0);
  } catch (e) {
    console.log('  ✗ threw: ' + (e && e.stack || e));
    if (b) await b.close();
    console.log('\n' + pass + ' passed, ' + (fail + 1) + ' failed');
    process.exit(1);
  }
})();
