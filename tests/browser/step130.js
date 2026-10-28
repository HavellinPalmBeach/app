// Step 130 — The release request carries the stamp the other papers carry, and a figure typed on the desk says why (P10 of the desk
// audit, 2026-10-28; EST-04, NEW-02, VAL-28, LIV-22, DOC-14, DOC-15, LIV-01, VAL-07, ROW-10; Anthony's answer to Ask 8).
//
// Drives the REAL page with one probate estate on the values tier filing a Form 706 (so Formal): #1 a walnut dresser both agents
// guessed at ($450, Sell to Kodner Galleries), #2 a copper cookware set Agent Two put at $40 ($30 to $50, Donate to Goodwill), #3 a
// Rolex the desk typed at $4,800 with no reason (its appraisal waived, Consign to Kodner), #5 a brass lamp Agent Two valued and that
// stands ($80, Donate to Goodwill); and a living client with a ⚑ oil painting Agent Two valued at $1,200 for sale. Job Admin & Inv
// through its own nav button and the client through its picker.
//   A: #2's row Total box: $300 typed (Tab to leave it): the agent's range comes off, the one-tap reason opens under the row with
//      the five reasons and Not now; The going rate, pressed: recorded with the device's user; the row says nothing more.
//   B: #3's row reads "basis not stated ▾" in amber; the work bar's No basis gathers it alone; pressed, the rows are #3's.
//   C: the work bar's Approval Request, in the viewer, in print media: the stamp in the Report's words (IN PROGRESS, 1 accepted as
//      valued, the values' pill), #1 marked "Needs a look: both agents were guessing", #5 unmarked, each value with its basis.
//   D: Releases, Send request: asked once, naming #1 and the unread list; Cancel: nothing drafted, the desk under Not reviewed with
//      #1's record open; the notice says what to do.
//   E: More ▾ Court Inventory: DRAFT, "1 valued line with no basis stated (#3 Rolex Datejust)"; #3's amber press, An appraiser's
//      verbal opinion: the Court Inventory FINAL (still Formal, nothing else holding it), the basis printed beside the figure.
//   F: the Donations card's Print Donation Record: the stamp over Goodwill's lines.
//   G: the living client: the Contents Record carries FLAGGED FOR APPRAISAL, ONLY HAVELLIN'S ESTIMATE ($1,200) ON RECORD.
//   H: at 1440 and 390 px no horizontal overflow; zero page errors.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step130.js [/abs/path/to/havellin.html]
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
const EST = 13001, LIV = 13002;

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    let sheet = {};
    const posts = [];
    await ctx.route(SYNC + '**', async (r) => {
      const req = r.request();
      const json = (o) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(o) });
      if (req.method() === 'POST') {
        let body = {}; try { body = JSON.parse(req.postData() || '{}'); } catch (e) {}
        posts.push(body.action || body.type || '');
        if (body.action === 'uploadHtml') return json({ ok: true, fileUrl: 'https://drive.google.com/file/d/up/view', fileId: 'up' });
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
    // Every dialog is answered OK unless a section sets `answer` to false; a prompt is answered with `reply`.
    const said = []; let answer = true;
    p.on('dialog', async (d) => { said.push(d.type() + ': ' + d.message()); if (answer) await d.accept(); else await d.dismiss(); });
    await p.goto(APP); await p.waitForTimeout(1600);
    await p.evaluate((u) => {
      SHEETS_SYNC_URL = u;
      try { localStorage.setItem('hav_device_user', 'Ashley Jerome'); } catch (e) {}
      window.open = function () { return null; };
      window.__drafts = [];
      window.gmailCreateDraft = function (mime, cb) { window.__drafts.push(mime); cb(true, { draftId: 'd1', messageId: 'm1' }); };
      window.__prints = [];
      window.print = function () { const pt = document.getElementById('print-target'); window.__prints.push(pt ? pt.innerHTML : ''); };
      // Agent Two is never asked here: a figure typed would otherwise send nothing, but a rename would.
      agentValueAuto = function () { return false; };
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
    const line = (id, sid) => p.evaluate(([id, sid]) => JSON.parse(JSON.stringify((_photoRefs[id] || []).filter((r) => r.stableId === sid)[0] || null)), [id, sid]);
    const toDesk = async (id) => {
      await p.evaluate((id) => { setCurrentJob(id); populateInventorySelect(); }, id);
      await p.click('.nb[onclick*="\'inventory\'"]'); await p.waitForTimeout(900);
      if (String(await val('#inv-job')) !== String(id)) { await p.selectOption('#inv-job', String(id)); await p.waitForTimeout(1000); }
    };
    const openBar = async (fold, id) => {
      const body = p.locator('#desk-body-' + fold + '-' + id), hd = p.locator('#desk-hd-' + fold + '-' + id);
      if ((await body.count()) === 1 && !(await body.isVisible()) && (await hd.isVisible())) { await p.click('#desk-hd-' + fold + '-' + id); await p.waitForTimeout(300); }
    };
    const viewerOpen = () => p.evaluate(() => { const o = document.getElementById('doc-viewer-modal'); return !!o && o.style.display === 'flex'; });
    // The page's words with a space between cells (textContent runs adjacent cells together).
    const viewerText = () => p.evaluate(() => {
      const o = document.getElementById('doc-viewer-modal');
      const f = o && o.querySelector('iframe');
      const d = f && (f.contentDocument || (f.contentWindow && f.contentWindow.document));
      const el = d ? d.body : o;
      if (!el) return '';
      const t = document.createElement('div'); t.innerHTML = el.innerHTML.replace(/</g, ' <');
      return t.textContent.replace(/\s+/g, ' ').trim();
    });
    const viewerHtml = () => p.evaluate(() => {
      const o = document.getElementById('doc-viewer-modal');
      const f = o && o.querySelector('iframe');
      const d = f && (f.contentDocument || (f.contentWindow && f.contentWindow.document));
      return d && d.body ? d.body.innerHTML : (o ? o.innerHTML : '');
    });
    const close = () => press('#doc-viewer-modal button[onclick="closeDocViewer()"]', 'Close the viewer');
    const more = async (f, id) => { if (!(await vis('#inv-more button[onclick="' + f + '(' + id + ')"]'))) await press('#inv-more > summary', 'More ▾'); };
    const syncSheet = () => p.evaluate((ids) => { const o = {}; ids.forEach((id) => { o[id] = { items: JSON.parse(localStorage.getItem('hav_media_' + id) || '[]') }; }); return o; }, [EST, LIV]).then((o) => { sheet = o; });
    const typeIn = async (sel, v, what) => {
      const n = await p.locator(sel).count();
      ok(n === 1 && await vis(sel), what + ' — on screen (' + n + ')');
      if (n === 1) { await p.fill(sel, v); await p.press(sel, 'Tab'); await p.waitForTimeout(800); }
    };

    // ── Seed ──
    await p.evaluate(([EST, LIV, T0]) => {
      const job = (id, o) => Object.assign({ id: id, addr: '12 Ocean Blvd', city: 'Palm Beach', zip: '33480', status: 'active', won: true, wonAt: '2026-09-25', approved: true,
        tc: 'Ashley Jerome', created: '2026-09-20', start: '2026-10-06', activatedOn: '2026-10-05', agrApproved: true, agrSent: true, agrSigned: true, docState: {}, at: {}, appraisers: [],
        driveFolder: 'https://drive.google.com/drive/folders/ROOT' + id, driveSubfolders: { 'Estate Inventory': 'INV' + id, 'As-Found Record': 'AF' + id, 'Signed Records': 'SR' + id },
        payments: [{ uid: 'd' + id, stage: 'deposit', amount: 20000, receivedOn: '2026-10-01', method: 'wire', clearedOn: '2026-10-01' }] }, o);
      jobs.unshift(job(EST, { hvlId: 'HVL-2610-P10', name: 'Harold Ashworth', svc: 'probate', matterType: 'probate', executor: 'Ruth Ashworth', executorRole: 'Personal Representative',
        executorEmail: 'ruth@example.com', deathDate: '2026-04-02', executorAuth: 'received', probateAttyName: 'Ann Lowe', probateAttyEmail: 'ann@lowe.law',
        probateCase: '50-2026-CP-004321', docTier: 'values', gate706: 'yes' }));
      jobs.unshift(job(LIV, { hvlId: 'HVL-2610-P10L', name: 'Margaret Hale', fname: 'Margaret', email: 'meg@example.com', svc: 'downsizing_move' }));
      const est = (id, svc) => ({ approved: true, submitted: true, approvedBy: 'Anthony Graziano', savedAt: T0,
        estimate: { jobId: id, svc: svc, havellinTotal: 40000, fixedPrice: true, fixedAmount: 40000, fixedLines: true, totTC: 100, totPS: 150, tcRate: 150, psRate: 100,
          days: 8, vendors: [], prepItems: [], pkgCost: 0, rooms: [{ idx: 0, name: 'Study', st: 'in', vol: 3, cplx: 3 }] } });
      estimateStore[EST] = est(EST, 'probate'); estimateStore[LIV] = est(LIV, 'downsizing_move');
      jobPlanStore[EST] = { rooms: { 0: { status: 'locked' } }, tasks: {}, at: {} };
      jobPlanStore[LIV] = { rooms: { 0: { status: 'locked' } }, tasks: {}, at: {} };
      const item = (id, o) => Object.assign({ stableId: id, label: 'inventory', roomIdx: 0, status: 'uploaded', category: 'Furniture', ts: T0, updatedAt: T0,
        filename: 'HVL_' + id + '_INV_.jpg', driveFileId: 'f-' + id, namedBy: 'agent', agentConf: 'high', qty: 1, condition: 'Good' }, o);
      _photoRefs[EST] = [
        item('d1', { itemNo: 1, objectName: 'Walnut dresser', agentConf: 'low', fmv: 450, valLow: 300, valHigh: 600, valConf: 'low', valuedBy: 'agent', valSource: 'General estimate',
          valAgentAt: T0, valNameAt: 'Walnut dresser', disposition: 'Sell', channel: 'Kodner Galleries' }),
        item('d2', { itemNo: 2, objectName: 'Copper cookware set', category: 'General/Household', fmv: 40, valLow: 30, valHigh: 50, valConf: 'high', valuedBy: 'agent',
          valSource: 'General estimate', valAgentAt: T0, valNameAt: 'Copper cookware set', disposition: 'Donate', channel: 'Goodwill Palm Beach' }),
        item('d3', { itemNo: 3, objectName: 'Rolex Datejust', category: 'Jewelry & Watches', fmv: 4800, valuedBy: 'desk', apprWaived: true, apprWaiveReason: 'sold to a dealer',
          disposition: 'Consign', channel: 'Kodner Galleries' }),
        item('d5', { itemNo: 5, objectName: 'Brass lamp', fmv: 80, valConf: 'high', valuedBy: 'agent', valSource: 'General estimate', valAgentAt: T0, valNameAt: 'Brass lamp',
          disposition: 'Donate', channel: 'Goodwill Palm Beach' })];
      _photoRefs[LIV] = [
        item('l1', { itemNo: 1, objectName: 'Oil painting, harbour scene', category: 'Art & Décor', needsAppr: true, fmv: 1200, valLow: 900, valHigh: 1600, valConf: 'high',
          valuedBy: 'agent', valSource: 'Online comps', valAgentAt: T0, valNameAt: 'Oil painting, harbour scene', disposition: 'Sell', channel: 'Kodner Galleries' })];
      savePhotoRefs(EST); savePhotoRefs(LIV);
      saveJobs(); localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore));
      _logsState = 'ready';
    }, [EST, LIV, T0]);
    await syncSheet();

    // ── A ──
    await section('A. a figure typed on the row: the agent\'s range comes off and the one-tap reason opens; one press records it', async () => {
      await toDesk(EST);
      ok(await vis('#inv-row-d2'), 'the cookware\'s row');
      await typeIn('#inv-fmv-d2', '300', 'the cookware\'s Total box');
      const l = await line(EST, 'd2');
      eq([l.fmv, l.valuedBy, l.valLow, l.valHigh, l.valSource], [300, 'desk', undefined, undefined, undefined], '⚠⚠ the desk\'s figure, Agent Two\'s range and source gone (VAL-07)');
      const why = await txt('#inv-why-d2');
      has(why, 'Why $300?', 'the reason opened by itself under the row');
      ['A sale’s link', 'Havellin’s own sale', 'The going rate', 'A condition adjustment', 'An appraiser’s verbal opinion', 'Not now'].forEach((w) => has(why, w, 'offered: ' + w));
      await press('#inv-why-d2 button[onclick*="\'rate\'"]', 'The going rate');
      const r = await line(EST, 'd2');
      eq([r.valWhy, r.valWhyBy], ['rate', 'Ashley Jerome'], '⚠⚠ recorded, with the device\'s user');
      eq(await txt('#inv-why-d2'), '', 'and the row says nothing more');
      eq(await val('#inv-fmv-d2'), '$300', 'the figure stays as typed');
      // A desk figure typed again: the row is not redrawn, so the reason is painted under it by id, and the old one comes off.
      await typeIn('#inv-fmv-d2', '320', 'the cookware\'s Total box, again');
      has(await txt('#inv-why-d2'), 'Why $320?', '⚠ a new figure asks its own reason');
      eq((await line(EST, 'd2')).valWhy, undefined, 'the reason for $300 is gone');
      await press('#inv-why-d2 button.inv-why-skip', 'Not now');
      eq(await txt('#inv-why-d2'), '', 'Not now: under $500 the row says nothing (Havellin estimate (staff) on the papers)');
      await typeIn('#inv-fmv-d2', '300', 'the cookware\'s Total box, back to $300');
      await press('#inv-why-d2 button[onclick*="\'rate\'"]', 'The going rate, again');
    });

    // ── B ──
    await section('B. $500 or more with no reason: amber on its row, and No basis gathers it', async () => {
      has(await txt('#inv-why-d3'), 'basis not stated', '⚠ the Rolex\'s row says it has no basis');
      ok(await p.evaluate(() => { const el = document.querySelector('#inv-why-d3 .inv-why-open'); return !!el && getComputedStyle(el).color === 'rgb(138, 90, 30)'; }), 'in amber');
      const chip = '#inventory-content button[onclick="setInvFlag(\'nobasis\')"]';
      has(await txt(chip), 'No basis', 'the work bar\'s No basis');
      has(await txt(chip), '1', '…counting the one line');
      await press(chip, 'No basis');
      const rows = await p.evaluate(() => Array.from(document.querySelectorAll('[id^="inv-row-"]')).map((x) => x.id).filter((x) => /^inv-row-d\d$/.test(x)));
      eq(rows, ['inv-row-d3'], '⚠ pressed: the rows are the Rolex alone');
      await press(chip, 'No basis, off');
    });

    // ── C ──
    await section('C. the Approval Request, in print media: the Report\'s stamp, the flagged line marked, each value with its basis', async () => {
      await press('#inv-workbar button[onclick="printApprovalRequest(' + EST + ')"]', 'Approval Request');
      ok(await viewerOpen(), 'it opens in the viewer');
      // Print / Save PDF in print media: the page printed carries the stamp, visible on the printed sheet.
      await p.emulateMedia({ media: 'print' });
      const before = await p.evaluate(() => (window.__prints || []).length);
      await p.evaluate(() => {
        const orig = window.print;
        window.print = function () {
          const pt = document.getElementById('print-target');
          const stamp = pt ? Array.from(pt.querySelectorAll('div')).filter((x) => /^IN PROGRESS/.test(x.textContent.trim()))[0] : null;
          window.__stampSeen = !!stamp && stamp.checkVisibility();
          window.__printOver = pt ? pt.scrollWidth - pt.clientWidth : -1;
          orig.call(window);
        };
        printDocViewer();
      });
      await p.waitForTimeout(900);
      ok((await p.evaluate(() => (window.__prints || []).length)) === before + 1, 'Print / Save PDF printed it');
      ok(await p.evaluate(() => window.__stampSeen === true), '⚠ the stamp is on the printed sheet, in print media');
      await p.emulateMedia({ media: 'screen' });
      await p.waitForTimeout(400);
      const t = await viewerText(), h = await viewerHtml();
      has(t, 'IN PROGRESS — 2 of 3 items checked; 1 accepted as valued', '⚠⚠ the stamp in the Report\'s words (EST-04, NEW-02)');
      has(t, '1 value not yet reviewed', 'and the values\' pill (bronze)');
      has(h, 'background:#8a6d3b', 'bronze until the list is read');
      has(t, 'Walnut dresser Furniture · Study Needs a look: both agents were guessing', '⚠ the flagged line marked (DOC-14)');
      lacks(t, 'Brass lamp Furniture · Study Needs a look', 'the line that stands is not');
      has(t, '$450 general estimate', 'each value with its basis (DOC-15)');
      has(t, '$300 the going rate · Ashley Jerome', 'the reason just picked, with who');
      has(t, '$4,800 basis not stated', 'and the Rolex\'s none');
      await close();
    });

    // ── D ──
    await section('D. Send request asks once, naming the flagged line and the unread list; Cancel opens it on the desk', async () => {
      await syncSheet();
      await openBar('releases', EST);
      const drafts = await p.evaluate(() => window.__drafts.length);
      answer = false; said.length = 0;
      await press('#inv-releases button[onclick="sendApprovalRequest(' + EST + ')"]', 'Send request (the card\'s)');
      await p.waitForTimeout(1500);
      answer = true;
      const asks = said.filter((s) => /^confirm:/.test(s));
      eq(asks.length, 1, '⚠⚠ asked once');
      has(asks[0] || '', '1 line on this request is still flagged and not yet checked: #1 Walnut dresser (both agents were guessing).', 'naming the line and why');
      has(asks[0] || '', 'The list has not been read, and 1 line on the request stands as the agents left it.', 'and the unread list');
      eq(await p.evaluate(() => window.__drafts.length), drafts, 'Cancel: no draft');
      eq(await p.evaluate(() => _invFilter.flag), 'unreviewed', '⚠ the desk under Not reviewed');
      ok(await vis('#inv-row-d1'), 'with the dresser on screen');
      ok(await p.evaluate(() => !!_invOpen.d1), 'and its record open');
      has(await txt('#jband-fb-admin'), 'Not sent. Check the flagged line (under Not reviewed), then press Send request again.', 'the notice says what to do');
      await p.evaluate(() => invClearFilters());
    });

    // ── E ──
    await section('E. Formal: the Court Inventory is DRAFT for the value with no basis; the reason picked on the row, and it is FINAL', async () => {
      await toDesk(EST);
      await more('printCourtInventory', EST);
      await press('#inv-more button[onclick="printCourtInventory(' + EST + ')"]', 'Court Inventory');
      let t = await viewerText();
      has(t, 'DRAFT — 1 valued line with no basis stated (#3 Rolex Datejust)', '⚠⚠ DRAFT, naming the line (VAL-07)');
      has(t, 'Rolex Datejust Good basis not stated $4,800', 'the basis column says so, in the row');
      await close();
      await press('#inv-why-d3 .inv-why-open', 'the Rolex\'s basis not stated ▾');
      await press('#inv-why-d3 button[onclick*="\'verbal\'"]', 'An appraiser’s verbal opinion');
      eq((await line(EST, 'd3')).valWhy, 'verbal', 'recorded');
      await press('#inv-row-d3 button[title="Open the full record"]', 'the Rolex\'s ▾');
      has(await txt('#inv-whyrec-d3'), 'Valuation basis an appraiser’s verbal opinion · Ashley Jerome Change the reason', 'its record shows the basis, with the press to change it');
      await press('#inv-row-d3 button[title="Open the full record"]', 'the Rolex\'s ▴');
      await more('printCourtInventory', EST);
      await press('#inv-more button[onclick="printCourtInventory(' + EST + ')"]', 'Court Inventory, again');
      t = await viewerText();
      lacks(t, 'with no basis stated', 'no longer a reason');
      ok(/\bFINAL\b/.test(t) && !/DRAFT/.test(t), '⚠ and the schedule is FINAL (the read never holds it, Q109)');
      has(t, 'an appraiser’s verbal opinion · Ashley Jerome $4,800', 'and the basis printed beside the figure');
      await close();
    });

    // ── F ──
    await section('F. the Donation Record carries the stamp over its charity\'s lines', async () => {
      await toDesk(EST);
      await openBar('closing', EST);
      const before = await p.evaluate(() => (window.__prints || []).length);
      await press('#inv-donations-card button[onclick^="printDonationRecord(' + EST + '"]', 'Print Donation Record');
      await p.waitForTimeout(800);
      const h = await p.evaluate(() => (window.__prints || []).slice(-1)[0] || '');
      ok((await p.evaluate(() => (window.__prints || []).length)) > before, 'it printed');
      const t = h.replace(/<[^>]+>/g, ' ').replace(/&mdash;/g, '—').replace(/\s+/g, ' ');
      has(t, 'Donation Record', 'the Donation Record');
      has(t, 'IN PROGRESS', '⚠ stamped (VAL-28)');
    });

    // ── G ──
    await section('G. a living ⚑ line valued by Agent Two keeps its caution on the client\'s Contents Record (LIV-01)', async () => {
      await syncSheet();
      await toDesk(LIV);
      const btn = '#inv-workbar button[onclick^="printContentsRecord(' + LIV + '"]';
      if (!(await vis(btn))) await press('#inv-more > summary', 'More ▾');
      await press(btn, 'Contents Record');
      await p.waitForTimeout(500);
      let t = await viewerOpen() ? await viewerText() : (await p.evaluate(() => (window.__prints || []).slice(-1)[0] || '')).replace(/<[^>]+>/g, ' ');
      has(t, 'FLAGGED FOR APPRAISAL, ONLY HAVELLIN’S ESTIMATE ($1,200) ON RECORD', '⚠⚠ the badge stays, saying what is on record');
      if (await viewerOpen()) await close();
    });

    // ── H ──
    await section('H. no horizontal overflow at 1440 and 390; zero page errors', async () => {
      await toDesk(EST);
      ok(await overflow() <= 0, 'no horizontal overflow at 1440 (' + await overflow() + ')');
      await p.setViewportSize({ width: 390, height: 844 });
      await p.waitForTimeout(500);
      await toDesk(EST);
      ok(await overflow() <= 0, 'no horizontal overflow at 390 (' + await overflow() + ')');
      eq(errs, [], 'zero page errors');
    });

    await b.close();
    console.log('\nstep130: ' + pass + ' passed, ' + fail + ' failed');
    process.exit(fail ? 1 : 0);
  } catch (e) {
    console.log('step130 crashed: ' + (e && e.stack || e));
    if (b) await b.close().catch(() => {});
    process.exit(1);
  }
})();
