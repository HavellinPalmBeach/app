// Step 88 — the agreement signed on the iPad (P29, 2026-10-18; Anthony: "if we're dealing with older people and we're in
// person can we just show them the iPad and let them read the agreement … should we just have the ability to sign an
// agreement on the iPad"; every service, a fourth route beside DocuSign, the PDF to sign by hand and Handed over in person).
//
// Drives the REAL page: a trust estate with two co-representatives, agreed and approved; the band's Sign on the iPad beside
// the send; the dialog with the packet readable and a pad per signer; the refusal before a signature; signatures drawn
// with the mouse for the representative and one co-representative, the other unticked, the opt-out box ticked; Sign and
// file over a routed htmlToPdf and a stubbed upload; the record, the rail row, the flag for the one still owed, the filed
// copy's link; a living client offered the same; a failed PDF named with the paper route; overflow at 1440 and 390 with
// the dialog open; zero page errors. Since 2026-10-19 (the first Ellison run): the signer's printed name and role written on
// the estate form's lines in the filed copy, and the signed copy drafted to the representative in Gmail (stubbed) with the
// PDF attached, recorded on the signature and read on the rail.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step88.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');

const SYNC = 'https://script.google.com/macros/s/STEP88/exec';
const T0 = Date.parse('2026-10-19T15:00:00Z');
const EST = 8801, LIV = 8802;

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
    let pdfFail = false; const pdfs = [];
    await ctx.route(SYNC + '**', async (r) => {
      const req = r.request();
      const json = (o) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(o) });
      if (req.method() === 'POST') {
        let body = {}; try { body = JSON.parse(req.postData() || '{}'); } catch (e) {}
        if (body.action === 'htmlToPdf') {
          pdfs.push(body.html || '');
          if (pdfFail) return json({ ok: false, error: 'conversion boom' });
          return json({ ok: true, base64: Buffer.from('%PDF-1.4 signed ' + 'x'.repeat(100)).toString('base64') });
        }
      }
      return json({ ok: true });
    });
    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    const dialogs = []; p.on('dialog', async (d) => { dialogs.push(d.type() + ': ' + d.message()); await d.accept(); });
    await p.goto(APP); await p.waitForTimeout(1600);
    await p.evaluate((u) => {
      SHEETS_SYNC_URL = u;
      localStorage.setItem('hav_device_user', 'Ashley Jerome');
      window.open = function () { return null; };
      window.__uploads = [];
      resolveSubfolderId = function (job, name, cb) { cb('SIGNED-88'); };
      uploadToDrive = function (folderId, filename, dataUrl, cb) { window.__uploads.push({ folderId, filename, bytes: dataUrl.length, pdf: /^data:application\/pdf/.test(dataUrl) }); cb(true, 'https://drive.google.com/file/d/S' + window.__uploads.length + '/view', 'S' + window.__uploads.length); };
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
      if (v) { await p.locator(sel).first().click({ timeout: 5000 }).catch((e) => ok(false, (what || sel) + ' — ' + e.message.split('\n')[0])); await p.waitForTimeout(400); }
      return v;
    };
    const txt = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }, sel);
    const until = async (f, ms) => { for (let i = 0; i < (ms || 8000) / 150; i++) { if (await f()) return true; await p.waitForTimeout(150); } return false; };
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const job = (id) => p.evaluate((id) => JSON.parse(JSON.stringify(jobs.find((j) => j.id === id) || null)), id);
    const dash = '#client-dashboard-view';
    const toDash = async (id) => { await p.evaluate((id) => goToClientDashboard(id), id); await p.waitForTimeout(700); };
    const modalOpen = () => p.evaluate(() => document.getElementById('agr-sign-modal').style.display === 'flex');
    const railRow = (label) => p.evaluate((label) => { const r = Array.from(document.querySelectorAll('#client-dashboard-view .jt-row'))
      .find((x) => ((x.querySelector('.jt-lbl') || {}).textContent || '').replace(/\s+/g, ' ').trim().indexOf(label) === 0); return r ? r.textContent.replace(/\s+/g, ' ') : ''; }, label);
    // A signature drawn with the mouse on a pad: three strokes across the canvas.
    const draw = async (sel) => {
      await p.evaluate((s) => { const el = document.querySelector(s); if (el) el.scrollIntoView({ block: 'center' }); }, sel);
      await p.waitForTimeout(150);
      const box = await p.locator(sel).boundingBox();
      ok(!!box && box.width > 200, sel + ' is on screen (' + (box ? Math.round(box.width) : 0) + ' px wide)');
      if (!box) return;
      for (let s = 0; s < 3; s++) {
        await p.mouse.move(box.x + 30 + s * 90, box.y + 40);
        await p.mouse.down();
        for (let i = 1; i <= 8; i++) await p.mouse.move(box.x + 30 + s * 90 + i * 8, box.y + 40 + Math.sin(i) * 20);
        await p.mouse.up();
      }
      await p.waitForTimeout(100);
    };

    // ── Seed ─────────────────────────────────────────────────────────────────────
    await p.evaluate(([T0, EST, LIV]) => {
      const base = () => ({ status: 'won', won: true, wonAt: '2026-10-01', wonBy: 'Ashley Jerome', approved: true, agrApproved: true, agrApprovedBy: 'Anthony Graziano',
        tc: 'Ashley Jerome', city: 'Palm Beach', zip: '33480', created: 'Sep 28, 2026', walkthrough: '2026-09-29', estimateSentDate: 'September 30, 2026', start: '2026-11-02',
        driveFolder: 'https://drive.google.com/drive/folders/ROOT88', driveSubfolders: { 'Signed Records': 'SIGNED-88', 'Agreement': 'AGR-88' },
        docState: {}, at: {}, payments: [], signedRecords: [], updatedAt: T0 });
      const est = (jobId, svc) => ({ jobId, svc, tcFee: 6000, psFee: 8000, pkgCost: 0, pkgLabel: '', smf: 0, prepFee: 0, havellinTotal: 14000, totalEst: 14000, totTC: 40, totPS: 80,
        tcRate: 150, psRate: 100, discountPct: 0, fixedPrice: false, rush: false, docScope: 'full', docTier: 'values', days: 4, tcCount: 1,
        vendors: [], prepItems: [], rooms: [{ idx: 1, name: 'Study', st: 'in', vol: 3, cplx: 3 }], collections: [], vehicles: [] });
      jobs.unshift(Object.assign({ id: EST, hvlId: 'HVL-2610-S881', name: 'Harold Adler', fname: 'Harold', lname: 'Adler', svc: 'cleanout', matterType: 'trust',
        addr: '100 Ocean Blvd', deathDate: '2026-08-01', executor: 'Ruth Adler', executorRole: 'Trustee', executorEmail: 'ruth@adler.example', executorAuth: 'received',
        trustName: 'Adler Family Trust', trustDate: '2015-03-03', docTier: 'values', havellinEst: 14000, totalEst: 14000,
        coFiduciaries: [{ id: 'cf1', name: 'Daniel Adler', role: 'Co-Trustee', email: 'dan@adler.example' }, { id: 'cf2', name: 'Mae O\'Neil', role: 'Co-Trustee', email: 'mae@oneil.example' }] }, base()));
      jobs.unshift(Object.assign({ id: LIV, hvlId: 'HVL-2610-S882', name: 'Jane Doe', fname: 'Jane', lname: 'Doe', email: 'jane@x.com', phone: '(561) 555-0100', svc: 'downsizing_move',
        addr: '12 Ocean Blvd', destAddr: '5 Harbor Way', destSqft: 1800, havellinEst: 14000, totalEst: 14000 }, base()));
      estimateStore[EST] = { approved: true, submitted: true, approvedBy: 'Anthony Graziano', approvedAt: 'September 30, 2026', savedAt: T0, estimate: est(EST, 'cleanout') };
      estimateStore[LIV] = { approved: true, submitted: true, approvedBy: 'Anthony Graziano', approvedAt: 'September 30, 2026', savedAt: T0, estimate: est(LIV, 'downsizing_move') };
      saveJobs();
      try { localStorage.setItem('estimateStore', JSON.stringify(estimateStore)); } catch (e) {}
    }, [T0, EST, LIV]);

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
    await section('A. the band offers Sign on the iPad beside the send, and the dialog opens on the packet', async () => {
      await toDash(EST);
      has(await txt(dash + ' .jt-next'), 'Send the signing packet', 'fixture: the packet\'s send is the step');
      const btn = dash + ' button[onclick="dashSignAgreementOnPad(' + EST + ')"]';
      has(await txt(btn), 'Sign on the iPad', '⚠⚠ the band offers Sign on the iPad');
      ok(await p.locator(dash + ' button[onclick="dashMarkAgreementSent(' + EST + ')"]').count() === 1, 'Handed over in person still beside it');
      ok(await p.locator(dash + ' button[onclick*="\'agreement\',\'send\'"]').count() >= 1, 'and the send');
      await press(btn, 'Sign on the iPad');
      ok(await modalOpen(), 'the dialog is on screen');
      const doc = await txt('#as-doc');
      has(doc, 'Exhibit A', 'the packet is readable in the dialog: Exhibit A');
      has(doc, 'Signature Page', 'and the estate form\'s signature page');
      eq(await p.locator('#as-signers canvas.as-pad').count(), 4, 'four pads: the representative, two co-representatives, Havellin');
      eq(await p.locator('#as-signers input.as-here').count(), 2, 'a present-today tick per co-representative');
      has(await txt('#as-signers'), 'Ruth Adler', 'the representative named');
      has(await txt('#as-signers'), 'Anthony Graziano, Managing Member', 'Havellin\'s countersigner named');
      ok(await vis('#as-mko'), 'the marketing opt-out tick');
      eq(await overflow(), 0, 'no horizontal overflow at 1440 with the dialog open');
    });

    await section('B. a tap is not a signature: refused by name, nothing made or filed', async () => {
      await press('#as-done-btn', 'Sign and file');
      has(await txt('#as-fb'), 'No signature yet from Ruth Adler', 'refused by name');
      eq([pdfs.length, await p.evaluate(() => window.__uploads.length)], [0, 0], 'nothing made or filed');
      ok(await modalOpen(), 'the dialog stays open');
    });

    await section('C. signed by the representative and one co-representative, the other unticked, the opt-out ticked: filed and recorded', async () => {
      // The signed copy's Gmail draft (2026-10-19): the mailbox stubbed on the page, the draft measured.
      await p.evaluate(() => {
        window.__drafts = [];
        window.gmailCreateDraft = (mime, cb) => { window.__drafts.push(mime); cb(true, { messageId: 'd88' }); };
        window.open = () => null;
      });
      await draw('#as-pad-client');
      await p.evaluate(() => { document.getElementById('as-here-co1').checked = false; document.getElementById('as-mko').checked = true; });
      await draw('#as-pad-co2');
      await press('#as-done-btn', 'Sign and file');
      ok(await until(async () => !(await modalOpen()), 8000), 'the dialog closes once the copy is filed');
      const ups = await p.evaluate(() => window.__uploads);
      eq(ups.length, 1, 'one PDF filed');
      ok(ups[0] && ups[0].pdf && /Signed agreement/.test(ups[0].filename) && ups[0].folderId === 'SIGNED-88', 'a PDF under its kind, into Signed Records: ' + JSON.stringify(ups[0]));
      eq(pdfs.length, 1, 'made through htmlToPdf once');
      eq((pdfs[0].match(/data:image\/png;base64,/g) || []).length, 2, 'two signatures drawn into the packet: the representative\'s and Mae\'s');
      lacks(pdfs[0], '/hsc/', 'the client\'s marker replaced'); lacks(pdfs[0], '/hcs1/', 'Daniel\'s marker removed'); lacks(pdfs[0], '/hsh/', 'Havellin\'s removed'); lacks(pdfs[0], '/mko/', 'the opt-out\'s removed');
      has(pdfs[0], '&#9746;', 'the opt-out box ticked on the page');
      has(pdfs[0], 'Execution Record', 'the execution record at the foot');
      has(pdfs[0], 'in the presence of Ashley Jerome', 'naming who held the device');
      has(pdfs[0], 'countersignature is not on this copy', 'and that Havellin did not countersign');
      // The printed name and role lines (2026-10-19): filled for each signer who signed, blank for Daniel, no slot left.
      has(pdfs[0], '<div class="sig-line"><span style="font-size:11px;">Ruth Adler</span></div>', '⚠⚠ the representative\'s printed name on her line');
      has(pdfs[0], '<div class="sig-line"><span style="font-size:11px;">Trustee</span></div>', 'and her role');
      has(pdfs[0], '<div class="sig-line"><span style="font-size:11px;">Mae O&#39;Neil</span></div>', 'Mae\'s printed name on hers');
      lacks(pdfs[0], 'agr-fill', 'no fill slot left in the filed copy');
      // The signed copy to the client (2026-10-19): one draft, the representative, the co-representatives and agreements@ copied, the PDF attached.
      const drafts = await p.evaluate(() => window.__drafts.map((m) => String(m)));
      eq(drafts.length, 1, '⚠⚠ one Gmail draft for the signed copy');
      has(drafts[0], 'To: ruth@adler.example', 'to the representative');
      has(drafts[0], 'Cc: dan@adler.example, mae@oneil.example, agreements@havellinpalmbeach.com', 'the co-representatives and agreements@ copied');
      const subj = (drafts[0].match(/^Subject: (.*)$/m) || [])[1] || '';
      has(Buffer.from(subj.replace(/^=\?UTF-8\?B\?/i, '').replace(/\?=$/, ''), 'base64').toString('utf8'), 'signed copy', 'the subject says what it is');
      has(drafts[0], 'Content-Type: application/pdf', 'the PDF attached');
      const j = await job(EST);
      const st = (j.docState || {}).agreement || {};
      eq([st.sentHow, st.sig && st.sig.how, st.sig && st.sig.signedBy, st.sig && st.sig.provider, !!(st.sig && st.sig.filedUrl), st.sig && st.sig.mktOptOut], ['ipad', 'ipad', 'Ruth Adler', 'ipad', true, true], '⚠⚠ the send and the signature on the record');
      eq((st.sig.coSigners || []).map((c) => [c.name, c.how]), [['Mae O\'Neil', 'ipad']], 'Mae on the record, how ipad');
      eq((j.signedRecords || []).map((r) => [r.kind, r.ref, !!r.glass, r.signedBy]), [['signed_agreement', 'packet', true, 'Ruth Adler; Mae O\'Neil']], 'the signed record');
      const notice = await txt(dash);
      has(notice, 'Agreement signed on the iPad by Ruth Adler, Mae O\'Neil', 'the notice');
      has(notice, 'Daniel Adler’s signature is not on record yet', 'names the one still owed');
      const row = await railRow('Agreement signed');
      has(row, 'Signed on the iPad', 'the rail row says how');
      has(row, 'Mae O\'Neil signed on the iPad', 'and that Mae did');
      has(row, 'countersignature is not on the filed copy', 'and that Havellin did not countersign');
      has(row, 'Daniel Adler', 'and flags Daniel');
      eq([st.sig.copy && st.sig.copy.provider, st.sig.copy && st.sig.copy.to], ['gmail', 'ruth@adler.example'], 'the draft recorded on the signature');
      has(row, 'signed copy drafted in Gmail for ruth@adler.example (send it)', 'and the rail says so, never sent');
      has(notice, 'The signed copy is drafted in', 'the notice says where the draft is');
      has(await txt(dash + ' .jt-next'), 'deposit', 'the band moves on to the deposit');
      ok(await p.locator(dash + ' button[onclick="openEsignFiled(' + EST + ',\'agreement\')"]').count() === 1, 'the filed signed packet is offered');
      has(await txt(dash + ' button[onclick="openEsignFiled(' + EST + ',\'agreement\')"]'), 'iPad', 'named as the iPad copy');
      ok(await p.locator(dash + ' button[onclick="dashSignAgreementOnPad(' + EST + ')"]').count() === 0, 'and the route is withdrawn once signed');
      has(await txt('#jt-cosign'), 'Daniel Adler — signature not on record', 'the co-representatives block names Daniel');
      has(await txt('#jt-cosign'), 'Mae O\'Neil — signed on the iPad', 'and Mae');
    });

    await section('D. a living client is offered the same: the client and Havellin, no co-signer tick', async () => {
      await toDash(LIV);
      await press(dash + ' button[onclick="dashSignAgreementOnPad(' + LIV + ')"]', 'Sign on the iPad on a Home Transition');
      ok(await modalOpen(), 'the dialog opens');
      eq(await p.locator('#as-signers canvas.as-pad').count(), 2, 'two pads: the client and Havellin');
      eq(await p.locator('#as-signers input.as-here').count(), 0, 'no present-today tick');
      has(await txt('#as-signers'), 'Jane Doe', 'the client named');
      has(await txt('#as-doc'), 'Acknowledgment', 'the standard form\'s signature page');
    });

    await section('E. a failed PDF: named, the paper route offered, nothing recorded, the dialog kept', async () => {
      pdfFail = true;
      await draw('#as-pad-client');
      await press('#as-done-btn', 'Sign and file');
      ok(await until(async () => /conversion boom/.test(await txt('#as-fb')), 6000), 'the failure named');
      has(await txt('#as-fb'), 'Handed over in person', 'the paper route offered');
      has(await txt('#as-fb'), 'signatures are still on the pads', 'the signatures kept');
      ok(await modalOpen(), 'the dialog stays open');
      const j = await job(LIV);
      eq([!!j.agrSigned, !!((j.docState || {}).agreement || {}).sentAt, (j.signedRecords || []).length], [false, false, 0], 'nothing recorded');
      pdfFail = false;
    });

    await section('F. phone width with the dialog open', async () => {
      await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(400);
      ok(await modalOpen(), 'still open');
      eq(await overflow(), 0, 'no horizontal overflow at 390');
      const box = await p.locator('#as-pad-client').boundingBox();
      ok(!!box && box.width > 250 && box.width <= 390, 'the pad fits the phone (' + (box ? Math.round(box.width) : 0) + ' px)');
      await press('#agr-sign-modal button[onclick="closeAgreementSignDialog()"]', 'Cancel');
      ok(!(await modalOpen()), 'closed');
      await p.setViewportSize({ width: 1440, height: 1000 });
    });

    eq(errs, [], 'zero page errors');
  } catch (e) {
    fail++; console.log('  ✗ step threw: ' + (e && e.stack || e));
  } finally {
    if (b) await b.close();
  }
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
