// Step 113 — the estate's release approval request through DocuSign (2026-10-26c; Anthony: "definitely docusign"; a
// representative with no email: "Refuse, name them").
//
// Drives the REAL page: a trust with two trustees, a painting going to auction and a lamp to a charity. A: the Releases card
// leads with Send through DocuSign; pressed, both trustees go on one envelope with their own markers, and the card says it is
// out for signature, with Check DocuSign and no send or record by hand. B: twenty-one minutes on, DocuSign answers that both
// have signed: Check DocuSign pressed, each trustee's day lands on both lines, the signed copy is filed and linked. C: a third
// trustee with no email: the card names them and leads with the email route. D: 390 px, zero page errors.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step113.js [/abs/path/to/havellin.html]
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
const EST = 11301, THREE = 11302;

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
    let sheet = {};
    const posts = [];
    let statusAnswer = null;
    await ctx.route(SYNC + '**', async (r) => {
      const req = r.request();
      const json = (o) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
      if (req.method() === 'POST') {
        let body = {}; try { body = JSON.parse(req.postData() || '{}'); } catch (e) {}
        posts.push(body);
        if (body.action === 'uploadHtml') return json({ ok: true, fileUrl: 'https://drive.google.com/file/d/up' + posts.length + '/view', fileId: 'up' + posts.length });
        if (body.action === 'htmlToPdf') return json({ ok: true, base64: Buffer.from('%PDF-1.4 ' + 'x'.repeat(200)).toString('base64') });
        if (body.action === 'getSubfolders') return json({ ok: true, subfolders: null });
        if (body.action === 'esignSendRequest') return json({ ok: true, envelopeId: 'env-113', status: 'sent',
          signers: (body.signers || []).map((s, i) => ({ name: s.name, email: s.email, recipientId: String(i + 1), n: i + 1 })) });
        if (body.action === 'esignStatus') return json(statusAnswer || { ok: true, envelopeId: body.envelopeId, status: 'sent', signers: [] });
        if (body.action === 'esignArchive') return json({ ok: true, signedUrl: 'https://drive.google.com/file/d/signed113/view', signedId: 'signed113', certUrl: 'https://drive.google.com/file/d/cert113/view' });
        return json({ ok: true });
      }
      if (/action=loadMedia/.test(req.url())) return json({ ok: true, media: sheet });
      return json({ ok: true });
    });
    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    p.on('dialog', async (d) => { await d.accept(); });
    await p.goto(APP); await p.waitForTimeout(1600);
    await p.evaluate((u) => {
      SHEETS_SYNC_URL = u;
      _backendActions = ['esignSendRequest'];   // the deployment answers that it has the action (the version probe's answer)
      window.__drafts = [];
      window.gmailCreateDraft = function (mime, cb) { window.__drafts.push(mime); cb(true, { draftId: 'd1', messageId: 'm1' }); };
      window.open = function () { return null; };
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
      if (v) { await p.locator(sel).first().click({ timeout: 5000 }).catch((e) => ok(false, (what || sel) + ' — ' + e.message.split('\n')[0])); await p.waitForTimeout(900); }
      return v;
    };
    const txt = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }, sel);
    const val = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.value : null; }, sel);
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const toDesk = async (id) => {
      await p.evaluate((id) => { setCurrentJob(id); populateInventorySelect(); }, id);
      await p.click('.nb[onclick*="\'inventory\'"]'); await p.waitForTimeout(900);
      if (String(await val('#inv-job')) !== String(id)) { await p.selectOption('#inv-job', String(id)); await p.waitForTimeout(900); }
    };
    const openBar = async (fold, id) => {
      const body = p.locator('#desk-body-' + fold + '-' + id), hd = p.locator('#desk-hd-' + fold + '-' + id);
      if ((await body.count()) === 1 && !(await body.isVisible()) && (await hd.isVisible())) { await p.click('#desk-hd-' + fold + '-' + id); await p.waitForTimeout(300); }
    };
    const relLine = (id) => p.evaluate((id) => { const el = document.getElementById('desk-stat-releases-' + id); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }, id);

    // ── Seed: a trust, two trustees with email; and a probate with a third co-representative who has none ──
    sheet = await p.evaluate(([EST, THREE, T0]) => {
      const base = (id, o) => Object.assign({ id, svc: 'cleanout', addr: '5 E St', city: 'Palm Beach', zip: '33480', deathDate: '2026-04-02', executorAuth: 'received',
        docTier: 'values', gate706: 'no', status: 'active', won: true, wonAt: '2026-09-25', approved: true, tc: 'Ashley Jerome', created: '2026-09-20', start: '2026-10-06',
        activatedOn: '2026-10-05', agrApproved: true, agrSent: true, agrSigned: true, probateAttyName: 'Ann Lowe', probateAttyEmail: 'ann@lowe.law',
        driveFolder: 'https://drive.google.com/drive/folders/ROOT' + id, driveSubfolders: { 'Estate Inventory': 'INV' + id, 'As-Found Record': 'AF' + id, 'Signed Records': 'SR' + id },
        docState: {}, payments: [{ uid: 'e' + id, stage: 'deposit', amount: 20000, receivedOn: '2026-10-01', method: 'wire', clearedOn: '2026-10-01' }] }, o);
      jobs.unshift(base(EST, { hvlId: 'HVL-2610-E113', name: 'Margaret Ellison', matterType: 'trust', executor: 'Thomas Ellison', executorRole: 'Trustee', executorEmail: 'tom@example.com',
        coFiduciaries: [{ id: 'cf1', name: 'Catherine Ellison-Reyes', role: 'Co-Trustee', email: 'cat@example.com', phone: '' }] }));
      jobs.unshift(base(THREE, { hvlId: 'HVL-2610-E114', name: 'Harold Brennan', svc: 'probate', matterType: 'probate', probateCase: '50-2026-CP-001234',
        executor: 'Rex Hale', executorRole: 'Personal Representative', executorEmail: 'rex@example.com',
        coFiduciaries: [{ id: 'cf2', name: 'Lee Hale', role: 'Co-Personal Representative', email: '', phone: '' }] }));
      const out = {};
      [EST, THREE].forEach((id) => {
        estimateStore[id] = { approved: true, submitted: true, approvedBy: 'Anthony Graziano', approvedAt: 'September 23, 2026', savedAt: T0,
          estimate: { jobId: id, svc: 'cleanout', havellinTotal: 40000, fixedPrice: true, fixedAmount: 40000, fixedLines: true, totTC: 100, totPS: 150, tcRate: 150, psRate: 100,
            days: 8, vendors: [], prepItems: [], pkgCost: 0, rooms: [{ idx: 0, name: 'Living Room', st: 'in', vol: 3, cplx: 3 }] } };
        const item = (sid, o) => Object.assign({ stableId: sid, label: 'inventory', roomIdx: 0, seq: 1, status: 'uploaded', category: 'Furniture', disposition: '',
          ts: T0, updatedAt: T0, filename: 'HVL_' + id + '_INV_' + sid + '.jpg', driveFileId: 'f-' + sid, namedBy: 'desk', reviewed: true }, o);
        _photoRefs[id] = [
          item('a', { itemNo: 1, objectName: 'Harbor painting', category: 'Art & Décor', fmv: '2400', disposition: 'Auction', channel: 'Kodner Galleries' }),
          item('b', { itemNo: 2, objectName: 'Table lamp', fmv: '60', disposition: 'Donate', channel: 'Goodwill Palm Beach' })];
        savePhotoRefs(id);
        out[id] = { items: JSON.parse(localStorage.getItem('hav_media_' + id) || '[]') };
      });
      saveJobs(); localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore));
      return out;
    }, [EST, THREE, T0]);

    // ── A ───────────────────────────────────────────────────────────────────
    await section('A. Send through DocuSign leads; pressed, both trustees on one envelope; out for signature, nothing by hand past it', async () => {
      await toDesk(EST);
      await openBar('releases', EST);
      has(await txt('#inv-releases'), 'Goes through DocuSign to Thomas Ellison and Catherine Ellison-Reyes, each initialling and signing on screen', 'the card says where it goes');
      ok(await p.locator('#inv-releases button.btn-bronze[onclick="sendApprovalRequestEsign(' + EST + ')"]').isVisible(), '⚠⚠ Send through DocuSign leads');
      ok(await p.locator('#inv-releases button[onclick="sendApprovalRequest(' + EST + ')"]').isVisible(), 'the PDF by email beside it');
      await press('#inv-releases button[onclick="sendApprovalRequestEsign(' + EST + ')"]', 'Send through DocuSign');
      await p.waitForTimeout(1500);
      const sent = posts.filter((x) => x.action === 'esignSendRequest');
      eq(sent.length, 1, 'one envelope asked for');
      eq((sent[0] && sent[0].signers || []).map((x) => [x.name, x.anchors]), [['Thomas Ellison', ['reqInit1', 'reqSig1', 'reqDate1']], ['Catherine Ellison-Reyes', ['reqInit2', 'reqSig2', 'reqDate2']]],
        '⚠⚠ both trustees, each with the markers measured off the page');
      eq(await p.evaluate(() => window.__drafts.length), 0, 'no Gmail draft');
      await openBar('releases', EST);
      const card = await txt('#inv-releases');
      has(card, 'Out for signature in DocuSign since', '⚠⚠ the card: out for signature');
      has(card, 'nothing to record by hand', 'nothing to press');
      ok(await p.locator('#inv-releases button[onclick="approvalEnvelopeCheckNow(' + EST + ')"]').isVisible(), 'Check DocuSign on screen');
      eq(await p.locator('#inv-releases button[onclick^="sendApprovalRequest"], #inv-releases button[onclick^="invRecordRequestApproval"]').count(), 0, 'no send and no record by hand');
      has(await relLine(EST), '2 out for signature in DocuSign', 'the Releases bar says so');
      ok(await overflow() <= 0, 'no horizontal overflow at 1440 (' + await overflow() + ')');
    });

    // ── B ───────────────────────────────────────────────────────────────────
    await section('B. twenty-one minutes on, both have signed: Check DocuSign pressed, each trustee\'s day on both lines, the copy filed and linked', async () => {
      // The envelope was checked as it went; DocuSign's floor is twenty minutes, so the clock of its last check is moved back.
      await p.evaluate((id) => { const e = jobs.find((j) => j.id === id).docState.approvalRequest.req.envelope; e.checkedAt = new Date(Date.now() - 21 * 60000).toISOString(); }, EST);
      statusAnswer = { ok: true, envelopeId: 'env-113', status: 'completed', completedAt: '2026-10-19T15:00:00Z', signers: [
        { recipientId: '1', name: 'Thomas Ellison', email: 'tom@example.com', status: 'completed', signedAt: '2026-10-18T14:00:00Z' },
        { recipientId: '2', name: 'Catherine Ellison-Reyes', email: 'cat@example.com', status: 'completed', signedAt: '2026-10-19T15:00:00Z' }] };
      await press('#inv-releases button[onclick="approvalEnvelopeCheckNow(' + EST + ')"]', 'Check DocuSign');
      await p.waitForTimeout(1500);
      eq(await p.evaluate((id) => _photoRefs[id].map((r) => [r.stableId, r.authBy, r.approvalDate]), EST), [
        ['a', 'Thomas Ellison (2026-10-18); Catherine Ellison-Reyes (2026-10-19)', '2026-10-19'],
        ['b', 'Thomas Ellison (2026-10-18); Catherine Ellison-Reyes (2026-10-19)', '2026-10-19']], '⚠⚠ each trustee\'s own day, on both lines');
      eq(posts.filter((x) => x.action === 'esignArchive').map((x) => x.what), ['release approval request'], 'the executed copy fetched and filed');
      await openBar('releases', EST);
      const card = await txt('#inv-releases');
      has(card, 'Signed in DocuSign by Thomas Ellison (Oct 18, 2026); Catherine Ellison-Reyes (Oct 19, 2026), 2 lines · every line on it approved', '⚠⚠ the card says who signed when');
      ok(await p.locator('#inv-releases a[href="https://drive.google.com/file/d/signed113/view"]').first().isVisible(), 'the signed copy in Drive, linked');
      lacks(await relLine(EST), 'not filed', 'the bar owes no filing');
    });

    // ── C ───────────────────────────────────────────────────────────────────
    await section('C. a co-representative with no email: named, and the email route leads', async () => {
      await toDesk(THREE);
      await openBar('releases', THREE);
      const card = await txt('#inv-releases');
      has(card, 'Not through DocuSign: Lee Hale has no email on file (Edit Client), and everyone who signs is on the one envelope.', '⚠⚠ Anthony\'s answer: named');
      eq(await p.locator('#inv-releases button[onclick="sendApprovalRequestEsign(' + THREE + ')"]').count(), 0, 'no DocuSign send');
      ok(await p.locator('#inv-releases button.btn-bronze[onclick="sendApprovalRequest(' + THREE + ')"]').isVisible(), 'Send request leads');
    });

    // ── D ───────────────────────────────────────────────────────────────────
    await section('D. a phone: no horizontal overflow; zero page errors', async () => {
      await p.setViewportSize({ width: 390, height: 844 });
      await p.waitForTimeout(500);
      await toDesk(EST);
      ok(await overflow() <= 0, 'no horizontal overflow at 390 (' + await overflow() + ')');
      eq(errs, [], 'zero page errors');
    });

    await b.close();
    console.log('\nstep113: ' + pass + ' passed, ' + fail + ' failed');
    process.exit(fail ? 1 : 0);
  } catch (e) {
    console.log('step113 crashed: ' + (e && e.stack || e));
    if (b) await b.close().catch(() => {});
    process.exit(1);
  }
})();
