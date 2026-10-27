// Step 118 — an approval means what was signed (2026-10-27; the desk audit's P5; Anthony, Ask 5: "When the value crosses $500 or
// the appraisal threshold, or rises more than 25%"; "Someone who approved $2,400 did not approve $24,000.").
//
// Drives the REAL page: a probate estate with two representatives; a painting both approved Oct 12 for Auction · Kodner Galleries
// at $2,400, a dresser and chairs waiting on approval, a stand mixer kept. A: the painting's Where it goes, changed on its row to To a
// person: asked once, in Anthony's words; Cancel puts the select back and the approval stands; OK writes it, the row reads
// "previously approved for …", the sign-out row for Kodner goes, and Send request is offered. B: its Total typed within Ask 5's rule
// asks nothing; past it, asks. C: the record: Authorized By read, never typed; Correct… with a reason. D: Send request and I've sent
// it, then the chairs retyped to another charity on the row: the card and the Releases bar say so; Record the signed request starts
// it unticked. E: the bulk bar over the mixer and the approved painting offers no Record approval; with the dresser, it does.
// The review's six findings (2026-10-27), through the real controls: G: the bulk bar's Record approval over the retyped chairs lists
// where they go now, flags them and starts them unticked. H: the painting moved to Keep asks nothing and carries no warning; its
// record shows the approval as history; back to Auction, covered again. I: a firearm approved for one dealer: Change dealer asks,
// Cancel keeps it, OK holds it at authority. J: a client's own home: Record approval opens with the signer blank. K: the sheet
// unreachable after a reload: Record the signed request is not offered, and is once the read lands (the merge, the sixth, is a
// test's: approval-pinned M1).
// F: overflow at 1440 and 390, zero errors.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step118.js [/abs/path/to/havellin.html]
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
const EST = 11801;

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
    let sheet = {}, sheetDown = false;
    await ctx.route(SYNC + '**', async (r) => {
      if (sheetDown) return r.abort();   // the sheet unreachable (section K): every request to the configured URL fails
      const req = r.request();
      const json = (o) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
      if (req.method() === 'POST') {
        let body = {}; try { body = JSON.parse(req.postData() || '{}'); } catch (e) {}
        if (body.action === 'uploadHtml') return json({ ok: true, fileUrl: 'https://drive.google.com/file/d/up1/view', fileId: 'up1' });
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
        item('d', { itemNo: 18, objectName: 'Stand mixer', fmv: 80, disposition: 'Keep' })];
      savePhotoRefs(EST);
      saveJobs(); localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore));
      const out = {}; out[EST] = { items: JSON.parse(localStorage.getItem('hav_media_' + EST) || '[]') }; return out;
    }, [EST, T0]);

    // ── A ───────────────────────────────────────────────────────────────────
    await section('A. the painting retyped on its row: asked once; Cancel keeps it approved; OK leaves it waiting, "previously approved for …"', async () => {
      await toDesk(EST);
      await openBar('releases', EST);
      ok(await complete('a'), 'fixture: the painting is approved by both');
      has(await txt('#inv-releases'), 'Kodner Galleries', 'fixture: a sign-out row for Kodner');
      answer = false; dialogs.length = 0;
      await p.selectOption(dispSel('a'), 'Distribute'); await p.waitForTimeout(800);
      eq(dialogs.length, 1, 'asked once');
      has(dialogs[0] || '', 'Approved Oct 12, 2026 by Thomas and Nora for Auction · Kodner Galleries: this change goes on the next request.', '⚠⚠ in Anthony\'s words');
      eq([await val(dispSel('a')), (await line('a')).disposition], ['Auction', 'Auction'], '⚠ Cancel: the select and the line back to Auction');
      ok(await complete('a'), 'and the approval stands');
      answer = true; dialogs.length = 0;
      await p.selectOption(dispSel('a'), 'Distribute'); await p.waitForTimeout(1000);
      eq(dialogs.length, 1, 'asked once more');
      eq((await line('a')).disposition, 'Distribute', 'OK: written');
      ok(!(await complete('a')), '⚠⚠ and the approval no longer counts');
      eq((await line('a')).authBy, 'Thomas Ashworth; Nora Ashworth', 'the approval stays on the line, as what was signed');
      has(await txt('#inv-row-a'), 'previously approved for Auction · Kodner Galleries', '⚠⚠ the row says so');
      await openBar('releases', EST);
      const card = await txt('#inv-releases');
      lacks(card, 'Sign out 1 to Kodner', 'no sign-out to Kodner any more');
      ok(await vis('#inv-releases button[onclick="sendApprovalRequest(' + EST + ')"]'), 'and Send request is offered');
      // Put back: covered again.
      answer = true;
      await p.selectOption(dispSel('a'), 'Auction'); await p.waitForTimeout(1000);
      ok(await complete('a'), '⚠ put back as approved: the approval covers it again');
    });

    // ── B ───────────────────────────────────────────────────────────────────
    await section('B. the painting\'s Total: within Ask 5\'s rule nothing is asked; past it, asked', async () => {
      dialogs.length = 0; answer = false;
      await typeIn(totalSel('a'), '2900', 'the Total box');
      eq(dialogs.length, 0, '$2,900 (21% up): nothing asked');
      ok(await complete('a'), 'still approved');
      await typeIn(totalSel('a'), '24000', 'the Total box');
      eq(dialogs.length, 1, '$24,000: asked');
      has(dialogs[0] || '', 'At $24,000, the signed approval no longer covers it', 'naming the value');
      eq((await line('a')).fmv, 2900, '⚠ Cancel: the figure as it was');
      eq(await val(totalSel('a')), '$2,900', 'and the box shows it');
    });

    // ── C ───────────────────────────────────────────────────────────────────
    await section('C. the record: Authorized By is read, never typed; Correct… with a reason', async () => {
      await press('#inv-row-a .inv-c-open', '▾ the painting\'s record');
      lacks(await p.evaluate(() => { const el = document.querySelector('.inv-auth-read'); return el ? el.parentNode.innerHTML : ''; }), '<input', '⚠⚠ no box to type a name into');
      has(await txt('.inv-auth-read'), 'Signed: Thomas Ashworth; Nora Ashworth (Oct 12, 2026)', 'who signed, readably');
      await press('.inv-auth-fix-btn', 'Correct…');
      eq(await txt('#ia-title'), 'Correct a recorded approval', 'the dialog, titled');
      await p.fill('#ia-fix-who', 'Thomas Ashworth; Nora Ashworth');
      await p.fill('#ia-fix-date', '2026-10-13');
      await press('#ia-fix-save', 'Save correction');
      has(await txt('#ia-fb'), 'say why it is being corrected', 'no reason: refused');
      await p.fill('#ia-fix-why', 'dated the 13th on the paper');
      await press('#ia-fix-save', 'Save correction');
      eq((await line('a')).approvalDate, '2026-10-13', 'corrected');
      has(await txt('.inv-auth-fix'), '“dated the 13th on the paper”', 'and the record says why');
      ok(await complete('a'), 'and what it approved is untouched');
    });

    // ── D ───────────────────────────────────────────────────────────────────
    await section('D. a line changed after the request went: flagged on the card and the bar; Record the signed request starts it unticked', async () => {
      await syncSheet();
      await openBar('releases', EST);
      await press('#inv-releases button[onclick="sendApprovalRequest(' + EST + ')"]', 'Send request');
      await p.waitForTimeout(800);
      await openBar('releases', EST);
      await press('#inv-releases button[onclick="invMarkRequestSent(' + EST + ')"]', 'I\'ve sent it');
      const req = await p.evaluate((id) => { const j = jobs.find((x) => x.id === id); return JSON.parse(JSON.stringify(((j.docState || {}).approvalRequest || {}).req || null)); }, EST);
      ok(!!(req && typeof req.terms === 'string' && req.terms.split(';').length === req.stableIds.length), 'the request records its terms line by line');
      answer = true;
      await typeIn(recipSel('c'), 'Habitat ReStore', 'the chairs\' Who takes it');
      await openBar('releases', EST);
      has(await txt('#inv-releases'), '1 line changed after this request went (where it goes, who takes it or its value)', '⚠⚠ the card says so (REL-02)');
      has(await relLine(), '1 item changed since the request went: send a fresh request', 'and the Releases bar');
      await press('#inv-releases button[onclick="invRecordRequestApproval(' + EST + ')"]', 'Record the signed request');
      const boxes = await p.evaluate(() => Array.from(document.querySelectorAll('#ia-lines input[type=checkbox]')).map((x) => x.checked));
      const names = await p.evaluate(() => Array.from(document.querySelectorAll('#ia-lines label')).map((x) => x.textContent.replace(/\s+/g, ' ').trim()));
      const ci = names.findIndex((t) => t.indexOf('Dining chairs') >= 0), di = names.findIndex((t) => t.indexOf('Walnut dresser') >= 0);
      ok(ci >= 0 && di >= 0, 'both lines listed');
      eq([boxes[di], boxes[ci]], [true, false], '⚠⚠ the dresser ticked; the chairs, changed since, unticked');
      has(names[ci] || '', 'changed after the request went', 'and saying why');
      await press('#inv-approval-modal button[onclick="closeInvApproval()"]', 'Cancel');
    });

    // ── E ───────────────────────────────────────────────────────────────────
    await section('E. the bulk bar takes only lines still waiting: the mixer and the approved painting, no Record approval', async () => {
      await p.evaluate((id) => { _invPick = { d: 1, a: 1 }; renderInventoryTab(); }, EST);
      await p.waitForTimeout(500);
      lacks(await p.evaluate((id) => { const el = document.getElementById('inv-bulk-' + id); return el ? el.innerHTML : ''; }, EST), 'invRecordApproval(', '⚠⚠ no Record approval over a Keep line and an approved one');
      await p.evaluate(() => { _invPick = { d: 1, a: 1, b: 1 }; renderInventoryTab(); });
      await p.waitForTimeout(500);
      has(await p.evaluate((id) => { const el = document.getElementById('inv-bulk-' + id); return el ? el.innerHTML : ''; }, EST), 'invRecordApproval(', 'with the dresser, it is offered');
      await p.evaluate(() => { _invPick = {}; renderInventoryTab(); });
    });

    // ── G ───────────────────────────────────────────────────────────────────
    const bulkBtn = '#inv-bulk-' + EST + ' button[onclick="invRecordApproval(' + EST + ')"]';
    const pickBox = (id) => '#inv-row-' + id + ' input[onchange="_invTogglePick(\'' + id + '\',this)"]';
    await section('G. the bulk bar\'s Record approval over the chairs retyped since the request went: where they go now, flagged, unticked', async () => {
      await press(pickBox('c'), 'the chairs\' pick box');
      await press(bulkBtn, 'the bulk bar\'s Record approval');
      const sel = await txt('#ia-sel-lines');
      has(sel, 'Dining chairs · Donate · Habitat ReStore', '⚠ each line with where it goes and who takes it');
      has(sel, 'changed after the request went: tick it only if the signed copy shows it as it reads now', '⚠⚠ the chairs flagged');
      eq(await p.evaluate(() => Array.from(document.querySelectorAll('#ia-sel-lines input[type=checkbox]')).map((x) => x.checked)), [false], '⚠⚠ their box starts unticked');
      await press('#ia-fid-0', 'Thomas\'s signature'); await press('#ia-fid-1', 'Nora\'s signature');
      await press('#ia-save-btn', 'Record approval');
      has(await txt('#ia-fb'), 'Not recorded: no line is ticked.', 'unticked: nothing recorded');
      eq((await line('c')).authBy, undefined, '⚠⚠ the Goodwill paper never approves Habitat ReStore');
      await press('#inv-approval-modal button[onclick="closeInvApproval()"]', 'Cancel');
      await press(pickBox('c'), 'the chairs\' pick box, off');
    });

    // ── H ───────────────────────────────────────────────────────────────────
    await section('H. the painting kept: nothing asked, no warning; its record shows the approval as history; back to Auction, covered', async () => {
      dialogs.length = 0; answer = false;
      await p.selectOption(dispSel('a'), 'Keep'); await p.waitForTimeout(900);
      eq(dialogs.length, 0, '⚠⚠ kept: nothing asked');
      eq((await line('a')).disposition, 'Keep', 'written');
      lacks(await txt('#inv-row-a'), 'previously approved', '⚠⚠ the row carries no warning');
      if (!(await vis('#inv-row-a ~ * .inv-auth-aside')) && !(await vis('.inv-auth-aside'))) await press('#inv-row-a .inv-c-open', '▾ the painting\'s record');
      has(await txt('.inv-auth-aside'), 'Not leaving the property now, so nothing is owed; it covers the line again if it goes back there.', 'the record shows it as history');
      await openBar('releases', EST);
      has(await txt('#inv-releases'), '#1 is not leaving the property now: this approval is kept as the record of what was signed.', 'the card says so, apart');
      await p.selectOption(dispSel('a'), 'Auction'); await p.waitForTimeout(900);
      eq(dialogs.length, 0, 'back to Auction: nothing asked');
      ok(await complete('a'), 'and the approval covers it again');
    });

    // ── I ───────────────────────────────────────────────────────────────────
    await section('I. a firearm approved through one dealer: Change dealer asks; Cancel keeps it; OK holds it at authority', async () => {
      await p.evaluate(([EST, T0]) => {
        _photoRefs[EST].push({ stableId: 'g', label: 'inventory', roomIdx: 0, seq: 9, status: 'uploaded', itemNo: 30, objectName: 'Remington 870 shotgun', category: 'Firearms',
          disposition: 'Distribute', channel: 'Cousin Pete Ashworth', serial: 'RS123', viaDealer: 'Palm Beach Arms', viaDealerBy: 'Anthony Graziano', viaDealerAt: T0, fmv: 400,
          ts: T0, updatedAt: T0, filename: 'HVL_' + EST + '_INV_g.jpg', driveFileId: 'f-g', namedBy: 'desk', reviewed: true,
          authBy: 'Thomas Ashworth; Nora Ashworth', approvalDate: '2026-10-12', authFor: { disposition: 'Distribute', channel: 'Cousin Pete Ashworth', fmv: 400, dealer: 'Palm Beach Arms' } });
        savePhotoRefs(EST); renderInventoryTab();
      }, [EST, T0]);
      await p.waitForTimeout(600);
      const blocked = () => p.evaluate((id) => invTransportBlocked((_photoRefs[id] || []).find((x) => x.stableId === 'g'), jobs.find((x) => x.id === id)), EST);
      eq(await blocked(), '', 'fixture: cleared to carry to Palm Beach Arms');
      if (!(await vis('button[onclick="invSetDealerRoute(' + EST + ',\'g\',true)"]'))) await press('#inv-row-g .inv-c-open', '▾ the shotgun\'s record');
      dialogs.length = 0; answer = false; promptAnswer = 'Jupiter Guns & Pawn';
      await press('button[onclick="invSetDealerRoute(' + EST + ',\'g\',true)"]', 'Change dealer');
      eq(dialogs.length, 2, 'the dealer asked for, then the question');
      has(dialogs[1] || '', 'for Distribute · Cousin Pete Ashworth, through Palm Beach Arms: this change goes on the next request.', '⚠⚠ naming the dealer approved');
      has(dialogs[1] || '', 'so it is not cleared to carry until it is approved again', 'in a firearm\'s words');
      eq((await line('g')).viaDealer, 'Palm Beach Arms', '⚠ Cancel: the route as it was');
      dialogs.length = 0; answer = true;
      await press('button[onclick="invSetDealerRoute(' + EST + ',\'g\',true)"]', 'Change dealer');
      eq((await line('g')).viaDealer, 'Jupiter Guns & Pawn', 'OK: recorded');
      eq(await blocked(), 'authority', '⚠⚠ held: nobody signed for Jupiter Guns & Pawn');
      has(await txt('#inv-row-g'), 'previously approved for Distribute · Cousin Pete Ashworth, through Palm Beach Arms', 'the row says so');
    });

    // ── J ───────────────────────────────────────────────────────────────────
    const LIV = 11802;
    await section('J. a client\'s own home: Record approval over a firearm opens with the signer blank (REL-05)', async () => {
      await p.evaluate(([LIV, T0]) => {
        jobs.unshift({ id: LIV, hvlId: 'HVL-2610-L118', name: 'Robert Hale', svc: 'downsizing_move', addr: '9 Ocean Blvd', city: 'Palm Beach', zip: '33480', email: 'robert@hale.example',
          docTier: 'contents', status: 'active', won: true, wonAt: '2026-09-25', approved: true, tc: 'Ashley Jerome', created: '2026-09-20', start: '2026-10-06', activatedOn: '2026-10-05',
          agrApproved: true, agrSent: true, agrSigned: true, driveFolder: 'https://drive.google.com/drive/folders/ROOTL118', docState: {},
          payments: [{ uid: 'l1', stage: 'deposit', amount: 5000, receivedOn: '2026-10-01', method: 'wire', clearedOn: '2026-10-01' }] });
        _photoRefs[LIV] = [{ stableId: 'h', label: 'inventory', roomIdx: 0, seq: 1, status: 'uploaded', itemNo: 1, objectName: 'Shotgun', category: 'Firearms', disposition: 'Sell',
          channel: 'Palm Beach Arms', serial: 'X1', fmv: 300, ts: T0, updatedAt: T0, filename: 'HVL_' + LIV + '_INV_h.jpg', driveFileId: 'f-h', namedBy: 'desk', reviewed: true }];
        savePhotoRefs(LIV); saveJobs();
      }, [LIV, T0]);
      await toDesk(LIV);
      await press('#inv-row-h input[onchange="_invTogglePick(\'h\',this)"]', 'the shotgun\'s pick box');
      await press('#inv-bulk-' + LIV + ' button[onclick="invRecordApproval(' + LIV + ')"]', 'the bulk bar\'s Record approval');
      ok(await vis('#ia-signer'), 'the signer box on screen');
      eq(await val('#ia-signer'), '', '⚠⚠ blank: typed from the signed copy, never the client\'s name');
      await press('#ia-save-btn', 'Record approval, nothing typed');
      has(await txt('#ia-fb'), 'Enter who signed the approval, as signed.', 'refused');
      await press('#inv-approval-modal button[onclick="closeInvApproval()"]', 'Cancel');
      await p.evaluate(() => { _invPick = {}; });
    });

    // ── K ───────────────────────────────────────────────────────────────────
    await section('K. the sheet unreachable after a reload: Record the signed request is not offered until the inventory is read', async () => {
      await p.evaluate((u) => { localStorage.setItem('hav_sheets_url', u); }, SYNC);
      sheetDown = true;
      await p.reload(); await p.waitForTimeout(2200);
      await toDesk(EST);
      await openBar('releases', EST);
      const st = await p.evaluate((id) => { const j = jobs.find((x) => x.id === id); return JSON.parse(JSON.stringify(((j || {}).docState || {}).approvalRequest || null)); }, EST);
      ok(!!(st && st.sentAt), 'fixture: the request went before the reload');
      ok(await p.evaluate((id) => !_invCloudSeen[id], EST), 'fixture: this device has not read the inventory from the sheet');
      ok((await p.locator('#inv-releases').count()) === 1, 'the Releases card is drawn from this device\'s copy');
      lacks(await p.evaluate(() => { const el = document.getElementById('inv-releases'); return el ? el.innerHTML : ''; }), 'invRecordRequestApproval(', '⚠⚠ no Record the signed request until the inventory is read');
      // The sheet back: the desk asks again by itself (every 15 s while it shows the client), and the read repaints the card.
      sheetDown = false;
      await p.waitForTimeout(17000);
      ok(await p.evaluate((id) => !!_invCloudSeen[id], EST), 'the sheet read once it is reachable again');
      ok(await vis('#inv-releases button[onclick="invRecordRequestApproval(' + EST + ')"]'), '⚠ and Record the signed request is offered, with nothing else redrawing the tab');
    });

    // ── F ───────────────────────────────────────────────────────────────────
    await section('F. no overflow at 1440 and 390; zero page errors', async () => {
      eq(await overflow(), 0, 'no horizontal overflow at 1440');
      await p.setViewportSize({ width: 390, height: 900 }); await p.waitForTimeout(500);
      eq(await overflow(), 0, 'none at 390');
      eq(errs, [], 'zero page errors');
    });

    await b.close();
  } catch (e) {
    fail++; console.log('  ✗ threw: ' + String(e && e.stack || e));
    if (b) await b.close();
  }
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
