// Step 134 (130 until P14 took it, 132 until main's approval by where it goes took that, 133 until main's line record took that) — The value follows the job's standard, market and date (P15 of the desk audit, 2026-10-28; ACC-09, VAL-08, ACC-10,
// VAL-09, VAL-06, AGT-06, VAL-11, VAL-16, VAL-21, and Anthony's Ask 14).
//
// Drives the REAL page with one probate estate filing a Form 706, on the values tier, its date of death Apr 2, 2026: Agent Two's
// bronze dancer with an "Appraisal advised" note, an oil linked to Carla Mendes (her report due five days ago) going to Kodner at
// auction, a tea service sold inside the six months, a pearl necklace the desk valued at $3,500, and Agent Two's $4,200 chest for
// the WorthPoint check. Job Admin & Inv through its own nav button and the client through its picker; the Values & appraisals bar
// opened by its header. A: the basis select reads "(counsel only)"; Liquidation Value asks first, naming the agent's figures made at
// Fair Market Value (Cancel puts the select back), OK changes it; the Valuation card names them with Re-value; the Court Inventory's
// column reads "Liquidation value (total)" and a line made at Fair Market Value says so; back to Fair Market Value. B: the §2032
// tick asks first; OK states the values as of Oct 2, 2026, and the Court Inventory prints a line's own date; untick. C: Agent Two's
// advice on the guardrail; the row's Reviewed tick leaves it there; Add to appraisal list records the decision. D: Waive (a prompt)
// on the necklace; its record names who and when, with Undo waiver; Undo (asked) puts it back. E: More ▾ → Appraisal Worklist groups
// Carla's oil under her; Send worklist drafts her packet to her; the row reads "Worklist drafted". F: the Values bar names her
// overdue report. G: the Approval Request names the appraisal in progress on the oil. H: Use a sale far from the figure (main's rule since 2026-11-02)
// asks once; Cancel files the sale only. I: 1440 and 390 px, no horizontal overflow; zero page errors.
// P15's review (2026-10-28): J: the basis select while Agent Two is valuing says so and is put back; K: on a set of eight plates the
// Use a sale form asks for the price for one, and one plate's sale at their value asks nothing; E carries the photograph inside
// Carla's PDF, never a link into Havellin's Drive; L: on a client's own home Send to a specialist takes the item off the guardrail.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step134.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');
const SYNC = 'https://script.google.com/macros/s/STEP130/exec';
const T0 = Date.parse('2026-10-10T15:00:00Z');
const EST = 13001;

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    let sheet = {};
    const posts = [], pdfs = [];
    await ctx.route(SYNC + '**', async (r) => {
      const req = r.request();
      const json = (o) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(o) });
      if (req.method() === 'POST') {
        let body = {}; try { body = JSON.parse(req.postData() || '{}'); } catch (e) {}
        posts.push(body.action || body.type || '');
        if (body.action === 'uploadHtml') return json({ ok: true, fileUrl: 'https://drive.google.com/file/d/WL/view' });
        if (body.action === 'htmlToPdf') { pdfs.push(String(body.html || '')); return json({ ok: true, base64: 'UERGLTEuNA==' }); }
        // The photographs the appraiser's packet asks for (P15's review): one tiny JPEG per file id asked.
        if (body.action === 'getThumbnails') { const t = {}; (body.fileIds || []).forEach((id) => { t[id] = 'data:image/jpeg;base64,/9j/STEP130' + id; }); return json({ ok: true, thumbs: t, missing: [] }); }
        return json({ ok: true });
      }
      if (/action=loadMedia/.test(req.url())) return json({ ok: true, media: sheet });
      return json({ ok: true });
    });
    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    // Every dialog is answered OK unless a section sets `answer` to false; a prompt is given `reason`.
    const said = []; let answer = true, reason = 'The family is keeping it';
    p.on('dialog', async (d) => { said.push(d.message()); if (!answer) return d.dismiss(); return d.type() === 'prompt' ? d.accept(reason) : d.accept(); });
    await p.goto(APP); await p.waitForTimeout(1600);
    await p.evaluate((u) => {
      SHEETS_SYNC_URL = u;
      try { localStorage.setItem('hav_device_user', 'Ashley Jerome'); } catch (e) {}
      window.open = function () { return null; };
      window.print = function () {};
      // Agent Two is never asked here: a run would value lines this step leaves as they are on purpose.
      agentValueAuto = function () { return false; };
      // The Gmail draft, captured (the app sends nothing itself; a person sends the draft).
      window.__mime = [];
      gmailCreateDraft = function (mime, cb) { window.__mime.push(String(mime)); cb(true, { messageId: 'm1' }); };
      // The email's own words, as the person reads them in the draft (the MIME body is encoded).
      window.__mimeText = [];
      var _bmm = buildMimeMessage;
      buildMimeMessage = function (m) { window.__mimeText.push(String((m && m.text) || '')); return _bmm.apply(this, arguments); };
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
      if (v) { await p.locator(sel).first().click({ timeout: 5000 }).catch((e) => ok(false, (what || sel) + ' — ' + e.message.split('\n')[0])); await p.waitForTimeout(800); }
      return v;
    };
    const txt = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }, sel);
    const val = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.value : null; }, sel);
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const line = (sid) => p.evaluate(([id, sid]) => (_photoRefs[id] || []).filter((r) => r.stableId === sid)[0] || null, [EST, sid]);
    const job = () => p.evaluate((id) => jobs.find((j) => j.id === id), EST);
    const toDesk = async () => {
      await p.click('.nb[onclick*="\'inventory\'"]'); await p.waitForTimeout(900);
      if (String(await val('#inv-job')) !== String(EST)) { await p.selectOption('#inv-job', String(EST)); await p.waitForTimeout(1200); }
    };
    const openValues = async () => {
      if (!(await vis('#desk-body-values-' + EST))) await press('#desk-hd-values-' + EST, 'the Values & appraisals bar');
    };
    const viewerOpen = () => p.evaluate(() => { const o = document.getElementById('doc-viewer-modal'); return !!o && o.style.display === 'flex'; });
    const close = () => press('#doc-viewer-modal button[onclick="closeDocViewer()"]', 'Close');
    const more = async (f) => { if (!(await vis('#inv-more button[onclick="' + f + '(' + EST + ')"]'))) await press('#inv-more > summary', 'More ▾'); };
    const record = async (sid) => { if (!(await vis('#inv-row-' + sid + ' .inv-panel, #inv-panel-' + sid))) await press('#inv-row-' + sid + ' button[title="Open the full record"]', 'the ▾ of ' + sid); };

    // ── Seed ──
    sheet = await p.evaluate(([EST, T0]) => {
      const due = new Date(); due.setDate(due.getDate() - 5);
      const dueStr = due.getFullYear() + '-' + String(due.getMonth() + 1).padStart(2, '0') + '-' + String(due.getDate()).padStart(2, '0');
      jobs.unshift({ id: EST, hvlId: 'HVL-2610-P15', name: 'Harold Ashworth', svc: 'probate', matterType: 'probate', addr: '12 Ocean Blvd', city: 'Palm Beach', zip: '33480',
        status: 'active', won: true, wonAt: '2026-09-25', approved: true, tc: 'Ashley Jerome', created: '2026-09-20', start: '2026-10-06', activatedOn: '2026-10-05',
        agrApproved: true, agrSent: true, agrSigned: true, docState: {}, at: {},
        appraisers: [{ id: 501, name: 'Carla Mendes', firm: 'Mendes Fine Art', credential: 'ISA', independent: true, effectiveDate: '2026-04-02', dueDate: dueStr, email: 'carla@mendesart.com' }],
        executor: 'Ruth Ashworth', executorRole: 'Personal Representative', executorEmail: 'ruth@example.com', deathDate: '2026-04-02', executorAuth: 'received',
        probateAttyName: 'Ann Lowe', probateAttyEmail: 'ann@lowe.law', probateCase: '50-2026-CP-004321', docTier: 'values', gate706: 'yes',
        driveFolder: 'https://drive.google.com/drive/folders/ROOT' + EST, driveSubfolders: { 'Estate Inventory': 'INV' + EST, 'As-Found Record': 'AF' + EST, 'Signed Records': 'SR' + EST },
        payments: [{ uid: 'd' + EST, stage: 'deposit', amount: 20000, receivedOn: '2026-10-01', method: 'wire', clearedOn: '2026-10-01' }] });
      estimateStore[EST] = { approved: true, submitted: true, approvedBy: 'Anthony Graziano', savedAt: T0,
        estimate: { jobId: EST, svc: 'probate', havellinTotal: 40000, fixedPrice: true, fixedAmount: 40000, fixedLines: true, totTC: 100, totPS: 150, tcRate: 150, psRate: 100,
          days: 8, vendors: [], prepItems: [], pkgCost: 0, rooms: [{ idx: 0, name: 'Study', st: 'in', vol: 3, cplx: 3 }] } };
      jobPlanStore[EST] = { rooms: { 0: { status: 'locked' } }, tasks: {}, at: {} };
      const item = (id, o) => Object.assign({ stableId: id, label: 'inventory', roomIdx: 0, status: 'uploaded', category: 'Furniture', disposition: 'Keep',
        objectName: 'Line ' + id, ts: T0, updatedAt: T0, filename: 'HVL_' + EST + '_INV_' + id + '.jpg', driveFileId: 'f-' + id, namedBy: 'desk', reviewed: true }, o);
      const agent = (o) => Object.assign({ valuedBy: 'agent', valConf: 'medium', valSource: 'Auction comps', valNote: 'Two sold comparables at auction, buyer’s premium included.',
        valAgentAt: T0, valDate: '2026-04-02', valBasis: 'Fair Market Value' }, o);
      _photoRefs[EST] = [
        item('br', agent({ itemNo: 1, objectName: 'Bronze figure of a dancer', category: 'Art & Décor', fmv: 1600, valLow: 800, valHigh: 2400, valNameAt: 'Bronze figure of a dancer',
          reviewed: false, valNotices: [{ kind: 'appraiser', text: 'Signed and the comparables disagree widely: a qualified appraisal is advisable.' }] })),
        item('oil', agent({ itemNo: 2, objectName: 'Oil on canvas, harbour scene', category: 'Art & Décor', fmv: 1600, valLow: 1200, valHigh: 2200, valNameAt: 'Oil on canvas, harbour scene',
          apprId: 501, apprDoc: 'Carla Mendes · Mendes Fine Art (ISA)', disposition: 'Auction', channel: 'Kodner Galleries',
          // Ticked by a person (since main's approval by where it goes, an unreviewed line is held off the request; G reads the request).
          valReviewed: true, valReviewedAt: T0, valReviewedBy: 'Ashley Jerome' })),
        item('ts', agent({ itemNo: 3, objectName: 'Sterling tea service', category: 'Silver & Precious Metal', fmv: 2000, valLow: 1500, valHigh: 2600, valNameAt: 'Sterling tea service',
          disposition: 'Auction', channel: 'Kodner Galleries', dispDate: '2026-07-10' })),
        item('pn', { itemNo: 4, objectName: 'Pearl necklace', category: 'Jewelry & Watches', fmv: 3500, valuedBy: 'desk', valSource: 'Dealer quote' }),
        item('ch', agent({ itemNo: 5, objectName: 'Walnut chest on stand', category: 'Furniture', fmv: 4200, valLow: 3000, valHigh: 5500, valNameAt: 'Walnut chest on stand',
          namedBy: 'agent', reviewed: false, valLookup: 'walnut chest on stand' })),
        item('pl', agent({ itemNo: 6, objectName: 'Herend Rothschild Bird dinner plates', category: 'Antiques', qty: 8, fmv: 720, valLow: 560, valHigh: 880,
          valNameAt: 'Herend Rothschild Bird dinner plates', namedBy: 'agent', reviewed: false, valLookup: 'herend rothschild bird' }))];
      savePhotoRefs(EST);
      saveJobs(); localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore));
      _logsState = 'ready';
      const out = {}; out[EST] = { items: JSON.parse(localStorage.getItem('hav_media_' + EST) || '[]') }; return out;
    }, [EST, T0]);

    // ── A ──
    await section('A. the basis: "(counsel only)", asked first naming the agent\'s figures, the card\'s Re-value, the column by the basis', async () => {
      await toDesk();
      await openValues();
      const sel = '#inv-valbasis-' + EST;
      ok(await vis(sel), 'the Valuation card\'s basis select');
      const opts = await p.evaluate((s) => Array.from(document.querySelector(s).options).map((o) => o.textContent.trim()), sel);
      eq(opts, ['Fair Market Value', 'Marketable Cash Value (counsel only)', 'Replacement Value (counsel only)', 'Liquidation Value (counsel only)'],
        '⚠⚠ on the probate track every other basis reads (counsel only)');
      answer = false; said.length = 0;
      await p.selectOption(sel, 'Liquidation Value'); await p.waitForTimeout(800);
      answer = true;
      has(said.join(' | '), 'Liquidation Value is counsel’s to choose: the §733.604 inventory is stated at fair market value', '⚠⚠ the question says it is counsel\'s');
      // Five since P15's review: the set of eight plates (K) is Agent Two's too.
      has(said.join(' | '), '5 values Agent Two made at Fair Market Value stay as they are until valued again', '…naming the agent\'s figures made at the old basis');
      eq([await val(sel), (await job()).valBasis || ''], ['Fair Market Value', ''], 'Cancel: the select put back, nothing written');
      said.length = 0;
      await p.selectOption(sel, 'Liquidation Value'); await p.waitForTimeout(1200);
      eq((await job()).valBasis, 'Liquidation Value', 'OK: the basis changes');
      await openValues();
      has(await txt('#inv-val-settings'), '5 values Agent Two made at another basis or date', '⚠⚠ the Valuation card names them');
      ok(await vis('#inv-val-settings button[onclick="agentValueRevalueStandard(' + EST + ')"]'), '…with Re-value');
      has(await txt('#desk-stat-values-' + EST), 'values made at another basis or date: Re-value on the Valuation card', 'the Values bar says it');
      answer = false; said.length = 0;
      await press('#inv-val-settings button[onclick="agentValueRevalueStandard(' + EST + ')"]', 'Re-value 5 lines');
      await p.waitForTimeout(800);
      answer = true;
      has(said.join(' | '), 'Value 5 lines again at Liquidation Value as of Apr 2, 2026?', 'Re-value asks first, naming the standard (Cancel: nothing sent)');
      await more('printCourtInventory');
      await press('#inv-more button[onclick="printCourtInventory(' + EST + ')"]', 'Court Inventory');
      ok(await viewerOpen(), 'the Court Inventory in the viewer');
      const ci = await txt('#doc-viewer-body');
      has(ci, 'Liquidation value (total)', '⚠⚠ the column reads the basis');
      lacks(ci, 'FMV (total)', '…never "FMV (total)" under a Liquidation heading');
      has(ci, 'at Fair Market Value', '⚠ an agent figure made at Fair Market Value says so on its line');
      await close();
      await openValues();
      await p.selectOption(sel, 'Fair Market Value'); await p.waitForTimeout(1200);
      eq((await job()).valBasis, 'Fair Market Value', 'and back to Fair Market Value (asked, OK)');
    });

    // ── B ──
    await section('B. the §2032 date: asked first; values as of it; a line\'s own date printed', async () => {
      await openValues();
      const tick = '#inv-avd-' + EST;
      ok(await vis(tick), 'the §2032 tick, on a 706 estate whose alternate date has passed');
      said.length = 0;
      await p.click(tick); await p.waitForTimeout(1200);
      has(said.join(' | '), 'Use the §2032 alternate valuation date, Oct 2, 2026?', 'asked first, naming the day');
      has(said.join(' | '), 'an item sold or given out before it as of the day it left', '…and the rule for an item that left inside the six months');
      eq((await job()).avd, true, 'OK: elected');
      const tsDate = await p.evaluate((id) => invLineValueDate(_getPhotoRef(id, 'ts'), _invJob(id)), EST);
      eq(tsDate, '2026-07-10', '⚠⚠ the tea service sold inside the six months is valued as of the day it left');
      await more('printCourtInventory');
      await press('#inv-more button[onclick="printCourtInventory(' + EST + ')"]', 'Court Inventory');
      const ci = await txt('#doc-viewer-body');
      has(ci, 'as of the alternate valuation date (Oct 2, 2026)', 'the heading states the alternate date');
      has(ci, 'as of Apr 2, 2026', '⚠⚠ a line whose figure was made as of the date of death prints its own date');
      await close();
      await openValues();
      await p.click(tick); await p.waitForTimeout(1200);
      eq((await job()).avd, false, 'untick (asked, OK): back to the date of death');
    });

    // ── C ──
    await section('C. Agent Two\'s advice: on the guardrail, a tick never drops it, Add to appraisal list records the decision', async () => {
      await openValues();
      has(await txt('#inv-guardrail'), 'Agent Two advised it: Signed and the comparables disagree widely', '⚠⚠ the advice is on the guardrail');
      await p.evaluate(() => { _invFilter.when = 'all'; renderInventoryTab(); }); await p.waitForTimeout(600);
      const box = '#inv-rev-br input[type="checkbox"]';
      ok(await vis(box), 'the bronze\'s Reviewed tick');
      await p.click(box); await p.waitForTimeout(800);
      ok(!!(await line('br')).reviewed, 'fixture: ticked');
      await openValues();
      has(await txt('#inv-guardrail'), 'Bronze figure of a dancer', '⚠⚠ the tick leaves it on the guardrail');
      await press('#inv-guardrail button[onclick="agentValueAddToAppraisal(' + EST + ',\'br\')"]', 'Add to appraisal list');
      const r = await line('br');
      eq([r.needsAppr, r.needsApprBy], [true, 'Ashley Jerome'], 'recorded as a person\'s decision, with who');
    });

    // ── D ──
    await section('D. Waive records who and when; Undo waiver (asked) puts it back', async () => {
      await openValues();
      await press('#inv-guardrail button[onclick="waiveAppraisal(' + EST + ',\'pn\')"]', 'Waive the necklace');
      const w = await line('pn');
      eq([w.apprWaived, w.apprWaivedBy, w.apprWaiveReason], [true, 'Ashley Jerome', 'The family is keeping it'], 'who and why');
      ok(!!w.apprWaivedAt, '…and when');
      await p.evaluate(() => renderInventoryTab()); await p.waitForTimeout(500);
      await record('pn');
      has(await txt('#inv-row-pn'), 'Waived by Ashley Jerome on', 'the record names the waiver');
      said.length = 0;
      await press('#inv-row-pn button[onclick="undoWaiveAppraisal(' + EST + ',\'pn\')"]', 'Undo waiver');
      has(said.join(' | '), 'Undo the waiver on #4 Pearl necklace?', 'asked first');
      const u = await line('pn');
      eq([u.apprWaived, (u.apprWaiveLog || []).map((e) => e.act)], [false, ['waived', 'undone']], 'undone, the waiver kept on its record');
    });

    // ── E ──
    await section('E. the worklist by appraiser; Send worklist drafts Carla\'s packet', async () => {
      await more('printAppraisalWorklist');
      await press('#inv-more button[onclick="printAppraisalWorklist(' + EST + ')"]', 'Appraisal Worklist');
      ok(await viewerOpen(), 'the worklist in the viewer');
      const wl = await txt('#doc-viewer-body');
      has(wl, 'Carla Mendes · Mendes Fine Art (ISA) · appraiser engaged (1)', '⚠⚠ Carla\'s own group, first');
      has(wl, 'Oil on canvas, harbour scene', '…the oil linked to her, which no rule flags');
      await close();
      await openValues();
      await press('button[onclick="sendAppraisalWorklist(' + EST + ',501)"]', 'Send worklist (1)');
      await p.waitForTimeout(1500);
      const mime = await p.evaluate(() => window.__mime.join('\n'));
      has(mime, 'carla@mendesart.com', 'the draft is to her');
      has(mime, 'agreements@havellinpalmbeach.com', '…agreements@ copied');
      const wk = (await job()).appraisers[0].worklist || {};
      eq([wk.n, wk.provider], [1, 'gmail'], 'recorded as drafted');
      // P15's review: the photograph is inside her packet, fetched for it, and nothing links into Havellin's Drive.
      ok(posts.indexOf('getThumbnails') >= 0, 'the packet asked the server for the photograph');
      const pdf = pdfs[pdfs.length - 1] || '';
      has(pdf, '<img src="data:image/jpeg;base64,/9j/STEP130f-oil"', '⚠⚠ the oil\'s photograph is in the PDF itself');
      lacks(pdf, 'drive.google.com', '⚠⚠ …and no link into Havellin\'s Drive');
      const words = await p.evaluate(() => window.__mimeText.join('\n'));
      has(words, 'condition and photograph.', 'the email says the photographs are in it');
      lacks(words, 'a link to its photograph', '…never that it links them');
      await openValues();
      has(await txt('#inv-guardrail') + ' ' + await txt('#desk-body-values-' + EST), 'Worklist drafted', 'the roster row says it was drafted, never sent');
    });

    // ── F ──
    await section('F. the overdue report on the Values bar', async () => {
      const bar = await txt('#desk-stat-values-' + EST);
      has(bar, 'Carla Mendes: report due', '⚠⚠ the bar names her report');
      has(bar, '(5 days overdue)', '…five days overdue');
    });

    // ── G ──
    await section('G. the Approval Request names the appraisal in progress on the oil', async () => {
      await p.evaluate(() => renderInventoryTab()); await p.waitForTimeout(500);
      const btn = '#inv-workbar button[onclick="printApprovalRequest(' + EST + ')"]';
      if (!(await vis(btn))) await more('printApprovalRequest');
      const where = (await vis(btn)) ? btn : '#inv-more button[onclick="printApprovalRequest(' + EST + ')"]';
      await press(where, 'Approval Request');
      ok(await viewerOpen(), 'the request in the viewer');
      const rq = await txt('#doc-viewer-body');
      has(rq, 'APPRAISAL IN PROGRESS WITH CARLA MENDES', '⚠⚠ the line the auction house would take says its appraisal is in progress');
      has(rq, 'Property on this request is being appraised', '…with the notice above the table');
      await close();
    });

    // ── H ──
    await section('H. a sale far from the figure asks once; Cancel files the sale only (Ask 14, Use a sale\'s rule since the merge with main)', async () => {
      await p.evaluate(() => { _invOpen = {}; renderInventoryTab(); }); await p.waitForTimeout(500);
      await record('ch');
      await press('#inv-row-ch details summary', 'Use a sale');
      await p.fill('#av-wp-title-ch', 'Walnut chest on stand, 19th c.');
      await p.fill('#av-wp-price-ch', '1100');
      await p.fill('#av-wp-url-ch', 'https://www.worthpoint.com/worthopedia/walnut-chest-1');
      answer = false; said.length = 0;
      await press('#inv-row-ch button[onclick="agentValueUseSale(' + EST + ',\'ch\')"]', 'Use this sale');
      answer = true;
      has(said.join(' | '), 'This sale ($1,100) is 74% below the line\'s figure ($4,200).', '⚠⚠ asked once, both figures named');
      const c = await line('ch');
      eq([c.fmv, c.valSource, c.valuedBy, (c.valComps || [])[0] && c.valComps[0].price], [4200, 'Auction comps', 'agent', 1100], 'Cancel: the figure untouched, the sale filed first');
    });

    // ── J ──
    await section('J. the basis while Agent Two is valuing: refused by name, the select put back (P15\'s review)', async () => {
      await openValues();
      await p.evaluate((id) => { _avState(id).running = true; }, EST);
      said.length = 0;
      await p.selectOption('#inv-valbasis-' + EST, 'Liquidation Value'); await p.waitForTimeout(800);
      has(said.join(' | '), 'Agent Two is valuing lines on this job: change the basis once it has finished. Nothing was changed.', '⚠⚠ the press says why');
      eq([await val('#inv-valbasis-' + EST), (await job()).valBasis], ['Fair Market Value', 'Fair Market Value'], '…the select put back, nothing written');
      await p.evaluate((id) => { _avState(id).running = false; }, EST);
    });

    // ── K ──
    await section('K. a set of eight: the Use a sale form asks for the price for one, weighed against one plate (P15\'s review)', async () => {
      await p.evaluate(() => { _invOpen = {}; _invFilter.when = 'all'; renderInventoryTab(); }); await p.waitForTimeout(500);
      await record('pl');
      await press('#inv-row-pl details summary', 'Use a sale');
      has(await txt('#inv-row-pl details'), 'Price is for', '⚠ the form asks what the price is for');
      eq(await val('#av-wp-per-pl'), 'each', '…one piece, as it opens');
      await p.fill('#av-wp-title-pl', 'Herend Rothschild Bird dinner plate');
      await p.fill('#av-wp-price-pl', '90');
      await p.fill('#av-wp-url-pl', 'https://www.worthpoint.com/worthopedia/herend-plate-1');
      said.length = 0;
      await press('#inv-row-pl button[onclick="agentValueUseSale(' + EST + ',\'pl\')"]', 'Use this sale');
      const pl = await line('pl');
      eq([said.length, pl.fmv, pl.valSource, (pl.valComps || [])[0] && pl.valComps[0].each], [0, 720, 'WorthPoint comps', true],
        '⚠⚠ one plate sold at $90 supports eight at $90 each: no question, the figure stands, the sale filed as one piece\'s');
    });

    // ── L ──
    await section('L. on a client\'s own home Send to a specialist takes the item off the guardrail (P15\'s review)', async () => {
      const LIV = EST + 1;
      await p.evaluate(([LIV, T0]) => {
        jobs.unshift({ id: LIV, hvlId: 'HVL-2610-P15L', name: 'Margaret Lowe', svc: 'downsizing_move', addr: '9 Lake Trail', city: 'Palm Beach', zip: '33480',
          status: 'active', won: true, wonAt: '2026-09-25', approved: true, tc: 'Ashley Jerome', created: '2026-09-20', start: '2026-10-06', activatedOn: '2026-10-05',
          agrApproved: true, agrSent: true, agrSigned: true, docState: {}, at: {}, appraisers: [], destAddr: '1 New Rd', destCity: 'Jupiter',
          driveFolder: 'https://drive.google.com/drive/folders/ROOT' + LIV, driveSubfolders: { 'Estate Inventory': 'INV' + LIV, 'As-Found Record': 'AF' + LIV },
          payments: [{ uid: 'd' + LIV, stage: 'deposit', amount: 5000, receivedOn: '2026-10-01', method: 'wire', clearedOn: '2026-10-01' }] });
        estimateStore[LIV] = { approved: true, submitted: true, approvedBy: 'Anthony Graziano', savedAt: T0,
          estimate: { jobId: LIV, svc: 'downsizing_move', havellinTotal: 12000, totTC: 30, totPS: 40, tcRate: 150, psRate: 100, days: 4, vendors: [], prepItems: [], pkgCost: 0,
            rooms: [{ idx: 0, name: 'Study', st: 'in', vol: 3, cplx: 3 }] } };
        jobPlanStore[LIV] = { rooms: { 0: { status: 'locked' } }, tasks: {}, at: {} };
        _photoRefs[LIV] = [{ stableId: 'cl', label: 'inventory', roomIdx: 0, status: 'uploaded', itemNo: 1, objectName: 'Mantel clock, French, gilt bronze', category: 'Antiques',
          disposition: 'Sell', channel: 'Kodner Galleries', ts: T0, updatedAt: T0, filename: 'HVL_' + LIV + '_INV_cl.jpg', driveFileId: 'f-cl', namedBy: 'desk', reviewed: true,
          fmv: 1800, valLow: 1200, valHigh: 2400, valuedBy: 'agent', valConf: 'medium', valSource: 'Auction comps', valNote: 'Two sold comparables at auction.', valAgentAt: T0,
          valNameAt: 'Mantel clock, French, gilt bronze', valNotices: [{ kind: 'specialist', text: 'It should sell through a specialist auction house.' }] }];
        savePhotoRefs(LIV); saveJobs();
      }, [LIV, T0]);
      sheet = await p.evaluate(([EST, LIV]) => { const out = {}; [EST, LIV].forEach((id) => { out[id] = { items: JSON.parse(localStorage.getItem('hav_media_' + id) || '[]') }; }); return out; }, [EST, LIV]);
      await p.click('.nb[onclick*="\'inventory\'"]'); await p.waitForTimeout(900);
      await p.selectOption('#inv-job', String(LIV)); await p.waitForTimeout(1500);
      if (!(await vis('#desk-body-values-' + LIV))) await press('#desk-hd-values-' + LIV, 'the Values & appraisals bar');
      has(await txt('#inv-guardrail'), 'Mantel clock', 'the advised clock is on the guardrail, undecided');
      await press('#inv-guardrail button[onclick="agentValueAddToAppraisal(' + LIV + ',\'cl\')"]', 'Send to a specialist');
      const c = await p.evaluate((id) => _getPhotoRef(id, 'cl'), LIV);
      eq([c.toSpecialist, c.toSpecialistBy, c.needsAppr || null], [true, 'Ashley Jerome', null], '⚠⚠ recorded as going to a specialist, never as needing an appraisal');
      lacks(await txt('#inv-guardrail'), 'Mantel clock', '⚠⚠ …and it leaves the guardrail');
      has(await txt('#desk-stat-values-' + LIV), '✓ none waiting on a specialist', '…and the Values bar no longer asks for one (P14\'s living words since the merge)');
      await p.selectOption('#inv-job', String(EST)); await p.waitForTimeout(1200);
    });

    // ── I ──
    await section('I. 1440 and 390 px: no horizontal overflow; zero page errors', async () => {
      ok((await overflow()) <= 0, 'no horizontal overflow at 1440 (' + (await overflow()) + ')');
      await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(500);
      await toDesk();
      await openValues();
      ok((await overflow()) <= 0, 'no horizontal overflow at 390 with the Values bar open (' + (await overflow()) + ')');
      eq(errs, [], 'zero page errors');
    });

    await b.close();
    console.log('\n' + pass + ' passed, ' + fail + ' failed');
    process.exit(fail ? 1 : 0);
  } catch (e) {
    console.log('  ✗ threw: ' + (e && e.stack || e));
    if (b) await b.close().catch(() => {});
    console.log('\n' + pass + ' passed, ' + (fail + 1) + ' failed');
    process.exit(1);
  }
})();
