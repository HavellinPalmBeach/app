// Step 115 — a listing survey counts (2026-10-27; Anthony, off the new eBay developer account: *"if we see literally dozens of
// listings on eBay and Etsy, can't we use that to triangulate some sort of value even if we don't have true sold comps"*; he
// took *"A listing survey counts"*).
//
// Drives the REAL page with an active probate estate whose kitchen holds two researched lines Agent One named with confidence:
// twelve Franciscan Desert Rose dinner plates and a Lladró figurine. The route answers Agent Two's request through the REAL
// server check (`_avLineResult`, lifted off apps-script/main-sync.gs), fed what a model would say: no sale for either, twelve
// close listings counted for the plates ($25 to $120 each, the middle $48, the figure $30 each), four for the figurine.
//   A. Value 2 lines on the work bar: the request carries each line's count and depth; the plates come back medium, Listing
//      survey, with no unsure on their row; the figurine low, General estimate, unsure.
//   B. The plates' record: LISTED · 12 close listings for sale, $25 to $120 each, middle $48, and the page counted, opening the
//      results page in a new tab; the figure's source and confidence beside it; Valuation Source reads Listing survey.
//   C. More ▾ → Court Inventory, on screen: the plates' Basis reads listing survey, the figurine's general estimate.
//   At 1440 and 390 px no horizontal overflow; zero page errors throughout.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step115.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const vm = require('vm');
const fs = require('fs');
const path = require('path');
const { matchBrace } = require('../harness');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
const SYNC = 'https://sync.example.test/exec';
const J = 11501;
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');

// ─── The real server check, off the backend beside this page ───
const GS = fs.readFileSync(path.join(__dirname, '..', '..', 'apps-script', 'main-sync.gs'), 'utf8');
const gsFn = (name) => { const re = new RegExp('(^|\\n)function\\s+' + name + '\\s*\\(', 'g'); const m = re.exec(GS);
  if (!m) throw new Error('not in .gs: ' + name); return GS.slice(m.index + (m[1] ? m[1].length : 0), matchBrace(GS, GS.indexOf('{', re.lastIndex)) + 1); };
const gsVar = (name) => { const m = GS.match(new RegExp('(^|\\n)(var\\s+' + name + '\\s*=[\\s\\S]*?;)\\s*(?:\\/\\/[^\\n]*)?\\n'));
  if (!m) throw new Error('var not in .gs: ' + name); return m[2]; };
const SERVER = { JSON, Math, Number, String, Object, Array, Error, parseInt, parseFloat, isFinite, RegExp };
vm.createContext(SERVER);
vm.runInContext(['AGENT_VALUE_SOURCES', 'AGENT_VALUE_NOTICE_KINDS', 'AGENT_VALUE_CONF_DOWN', 'AGENT_VALUE_MAX_COMPS', 'AGENT_VALUE_RESULTS_SEGMENTS',
  'AGENT_VALUE_RESULTS_PARAMS', 'AGENT_VALUE_NO_PRICE_RE', 'AGENT_VALUE_TEXT_MAX', 'AGENT_VALUE_ABBREV_RE', 'AGENT_VALUE_SURVEY_MIN', 'AGENT_VALUE_ITEM_PATHS', 'AGENT_VALUE_ASKING_HOSTS', 'AGENT_VALUE_COUNT_WORDS', 'AGENT_VALUE_SALE_WORD_RE', 'AGENT_VALUE_SALE_NEGATION_RE', 'AGENT_VALUE_SALE_NOUN', 'AGENT_VALUE_NUM_WORDS'].map(gsVar)
  .concat(['_avCents', '_avUrlKey', '_avResultsPage', '_avClip', '_avSurvey', '_avLineResult', '_avHostOf', '_avListedHost', '_avAskingHost', '_avSalesNamed', '_avKeptBasis', '_avPageKey', '_avClaimsSale'].map(gsFn)).join('\n'), SERVER);
const RESULTS = 'https://www.ebay.com/sch/i.html?_nkw=franciscan+desert+rose+dinner+plate';
const FIG = 'https://www.ebay.com/sch/i.html?_nkw=lladro+girl+with+goose';
const ASK = 'https://www.etsy.com/listing/123/franciscan-desert-rose-dinner-plate';
// The pages the search "returned" on the request: the results pages and one listing.
const SEEN = {};
[RESULTS, FIG, ASK].forEach((u) => { SEEN[SERVER._avUrlKey(u)] = 1; });
// What the model would say for each line (no sale for either), run through the real check with the count the app sent.
const MODEL = {
  rose: { line: 'L1', name: 'Franciscan Desert Rose dinner plates', value: 360, low: 300, high: 480, confidence: 'medium', source: 'Online comps',
    basis: 'No sales found; twelve close listings at $25 to $120 each; valued below them', lookup: 'franciscan desert rose dinner plate', notices: [],
    comps: [{ title: 'Franciscan Desert Rose dinner plate', venue: 'Etsy', saleDate: '', price: 45, url: ASK, kind: 'asking' }],
    survey: { count: 12, low: 25, median: 48, high: 120, url: RESULTS } },
  fig: { line: 'L1', name: 'Lladro porcelain figurine, girl with goose', value: 60, low: 40, high: 90, confidence: 'medium', source: 'Online comps',
    basis: 'No sales found; four listings', lookup: 'lladro girl with goose', notices: [], comps: [],
    survey: { count: 4, low: 55, median: 85, high: 140, url: FIG } },
};

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
    const net = { value: [] };
    let sheet = {};
    await ctx.route(SYNC + '**', async (r) => {
      const req = r.request();
      const json = (o) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
      if (req.method() === 'POST') {
        let body = {}; try { body = JSON.parse(req.postData() || '{}'); } catch (e) {}
        if (body.action === 'agentValue') {
          net.value.push(body);
          const results = {}, failed = {};
          (body.items || []).forEach((it) => {
            const v = MODEL[it.stableId];
            if (!v) { failed[it.stableId] = 'not in the fixture'; return; }
            const res = SERVER._avLineResult(JSON.parse(JSON.stringify(v)), it.mode, SEEN, it.qty);
            res.condition = '';
            results[it.stableId] = Object.assign(JSON.parse(JSON.stringify(res)), { model: 'claude-fable-5-1' });
          });
          return json({ ok: true, success: true, results: results, failed: failed, retry: {}, remaining: 0, model: 'claude-fable-5-1' });
        }
        if (body.action === 'getSubfolders') return json({ ok: true, subfolders: null });
        return json({ ok: true });
      }
      if (/action=loadMedia/.test(req.url())) return json({ ok: true, media: sheet });
      return json({ ok: true });
    });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    const said = [];
    p.on('dialog', async (d) => { said.push(d.message()); await d.accept(); });
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
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const line = (id) => p.evaluate(([j, id]) => { const r = (_photoRefs[j] || []).find((x) => x.stableId === id) || {};
      return { fmv: r.fmv, conf: r.valConf, src: r.valSource, by: r.valuedBy, survey: r.valSurvey || null }; }, [J, id]);
    const viewerOpen = () => p.evaluate(() => { const o = document.getElementById('doc-viewer-modal'); return !!o && o.style.display === 'flex'; });

    await p.goto(APP); await p.waitForTimeout(1600);
    sheet = await p.evaluate(([J, SYNC]) => {
      SHEETS_SYNC_URL = SYNC;
      window.print = function () {};
      try { localStorage.setItem('hav_device_user', 'Anthony Graziano'); } catch (e) {}
      const T = Date.now() - 2 * 86400000;
      jobs.unshift({ id: J, hvlId: 'HVL-2610-LS1', name: 'Dorothy Pruitt', svc: 'probate', matterType: 'probate', addr: '40 Seaspray Ave', city: 'Palm Beach', zip: '33480',
        executor: 'Ellen Pruitt', executorRole: 'Personal Representative', executorEmail: 'ellen@example.com', deathDate: '2026-07-02', executorAuth: 'received',
        probateAttyName: 'Ann Lowe', probateAttyEmail: 'ann@lowe.law', probateCase: '50-2026-CP-004321', docTier: 'values', gate706: 'no',
        status: 'active', won: true, wonAt: '2026-10-01', approved: true, tc: 'Ashley Jerome', created: '2026-09-28', start: '2026-10-12', activatedOn: '2026-10-10',
        agrApproved: true, agrSent: true, agrSigned: true,
        driveFolder: 'https://drive.google.com/drive/folders/R' + J, driveSubfolders: { 'Estate Inventory': 'INV_LS', 'As-Found Record': 'AF_LS' }, at: {}, docState: {},
        payments: [{ uid: 'd' + J, stage: 'deposit', amount: 15000, receivedOn: '2026-10-08', method: 'wire', clearedOn: '2026-10-08' }] });
      estimateStore[J] = { approved: true, submitted: true, approvedBy: 'Anthony Graziano', savedAt: T,
        estimate: { jobId: J, svc: 'probate', havellinTotal: 30000, fixedPrice: true, fixedAmount: 30000, fixedLines: true, totTC: 80, totPS: 120, days: 6,
          vendors: [], prepItems: [], rooms: [{ idx: 2, name: 'Kitchen', st: 'in', vol: 3, cplx: 3 }] } };
      const photo = (id, file, n) => ({ label: 'inventory', collId: null, roomIdx: 2, seq: n, status: 'uploaded', ts: T + n * 60000,
        filename: 'HVL-2610-LS1_Kitchen_INV_' + id + '.jpg', driveFileId: file, driveFileUrl: 'https://drive.google.com/file/d/' + file + '/view' });
      const agent = (n) => ({ namedBy: 'agent', agentConf: 'high', agentAt: T + n * 60000 + 5000, category: 'Collectibles', disposition: 'Sell', channel: 'Kodner Galleries',
        condition: 'Good', condBy: 'desk', updatedAt: T + n * 60000 + 5000 });
      _photoRefs[J] = [
        { stableId: 'af1', label: 'before', roomIdx: 2, seq: 1, collId: null, status: 'uploaded', ts: T, updatedAt: T, filename: 'HVL-2610-LS1_Kitchen_before_1.jpg',
          driveFileId: 'F_AF', driveFileUrl: 'https://drive.google.com/file/d/F_AF/view' },
        Object.assign({ stableId: 'rose', itemNo: 21, qty: 12, objectName: 'Franciscan Desert Rose dinner plates' }, photo('21', 'FID_ROSE', 1), agent(1)),
        Object.assign({ stableId: 'fig', itemNo: 22, qty: 1, objectName: 'Lladro porcelain figurine, girl with goose' }, photo('22', 'FID_FIG', 2), agent(2))];
      savePhotoRefs(J); saveJobs(); localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore));
      const out = {}; out[J] = { items: JSON.parse(localStorage.getItem('hav_media_' + J) || '[]') };
      return out;
    }, [J, SYNC]);

    const toDesk = async () => {
      await p.evaluate((id) => { setCurrentJob(id); populateInventorySelect(); }, J);
      await p.click('.nb[onclick*="\'inventory\'"]'); await p.waitForTimeout(900);
      const cur = await p.evaluate(() => (document.getElementById('inv-job') || {}).value);
      if (String(cur) !== String(J)) { await p.selectOption('#inv-job', String(J)); await p.waitForTimeout(1300); }
      if (await p.locator('#panel-inventory button[onclick="setInvWhen(\'all\')"]').count()) { await p.click('#panel-inventory button[onclick="setInvWhen(\'all\')"]'); await p.waitForTimeout(600); }
    };
    const open = async (id) => {
      if (!(await p.evaluate((id) => !!document.getElementById('inv-cu-' + id), id))) { await p.click('button[onclick="_invToggleOpen(\'' + id + '\')"]'); await p.waitForTimeout(700); }
      return p.evaluate((id) => !!document.getElementById('inv-cu-' + id), id);
    };
    const unsureOn = (id) => p.evaluate((id) => { const r = document.getElementById('inv-row-' + id); return r ? !!r.querySelector('.inv-unsure') : null; }, id);

    // ── A ─────────────────────────────────────────────────────────────────────────────────────
    await section('A. Value 2 lines: twelve close listings carry the plates to medium and Listing survey; four leave the figurine unsure', async () => {
      await toDesk();
      await press('#inv-workbar button:has-text("Value 2 lines")', 'Value 2 lines on the work bar');
      for (let i = 0; i < 30 && net.value.length === 0; i++) await p.waitForTimeout(150);
      await p.waitForTimeout(1500);
      eq(net.value.length, 1, 'one request to Agent Two');
      const sent = {}; ((net.value[0] || {}).items || []).forEach((it) => { sent[it.stableId] = it; });
      eq([sent.rose && sent.rose.mode, sent.rose && sent.rose.qty, sent.fig && sent.fig.mode], ['comps', 12, 'comps'], '⚠ both researched, the plates with their count of twelve');
      const rose = await line('rose'), fig = await line('fig');
      eq([rose.fmv, rose.conf, rose.src, rose.by], [360, 'medium', 'Listing survey', 'agent'], '⚠⚠ the plates: $360 for twelve ($30 each, under the $48 middle), medium, Listing survey');
      eq(rose.survey, { count: 12, low: 25, median: 48, high: 120, url: RESULTS }, 'the survey kept on the line');
      eq([fig.fmv, fig.conf, fig.src], [60, 'low', 'General estimate'], '⚠ the figurine: four listings is a handful, low, a general estimate');
      eq(await unsureOn('rose'), false, '⚠⚠ no unsure on the plates\' row (Anthony: "no unsure hint")');
      eq(await unsureOn('fig'), true, 'unsure on the figurine\'s');
    });

    // ── B ─────────────────────────────────────────────────────────────────────────────────────
    await section('B. The plates\' record: what was counted, and the page to open', async () => {
      ok(await open('rose'), 'the plates\' record is open');
      const sv = await txt('#inv-row-rose ~ div .av-survey');
      const svAny = sv || await p.evaluate(() => { const el = document.querySelector('.av-survey'); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; });
      eq(svAny, 'LISTED 12 close listings for sale, $25 to $120 each, middle $48 · the page counted', '⚠⚠ how many, at what prices, in plain words');
      const link = await p.evaluate(() => { const a = document.querySelector('.av-survey a'); return a ? [a.getAttribute('href'), a.getAttribute('target'), a.getAttribute('rel')] : null; });
      eq(link, [RESULTS, '_blank', 'noopener'], 'the page counted opens the results page in a new tab');
      const panel = await p.evaluate(() => { const el = document.querySelector('.av-survey'); return el ? el.parentElement.textContent.replace(/\s+/g, ' ') : ''; });
      has(panel, 'Listing survey', 'the source beside the figure');
      has(panel, 'medium confidence', 'and its confidence');
      const src = await p.evaluate(() => { const s = [...document.querySelectorAll('select')].find((x) => /_invEdit\(\d+,'rose','valSource'/.test(x.getAttribute('onchange') || ''));
        return s ? [s.value, [...s.options].map((o) => o.value).indexOf('Listing survey') >= 0] : null; });
      eq(src, ['Listing survey', true], 'Valuation Source reads Listing survey, an option a person may pick too');
      eq(await overflow(), 0, 'no horizontal overflow at 1440 with the record open');
    });

    // ── C ─────────────────────────────────────────────────────────────────────────────────────
    await section('C. More ▾ → Court Inventory: the Basis column says what each figure rests on', async () => {
      await p.evaluate(() => { _invOpen = {}; renderInventoryTab(); }); await p.waitForTimeout(400);
      if (!(await vis('#inv-more button[onclick="printCourtInventory(' + J + ')"]'))) await press('#inv-more > summary', 'More ▾');
      await press('#inv-more button[onclick="printCourtInventory(' + J + ')"]', 'Court Inventory');
      ok(await viewerOpen(), 'the Court Inventory is on screen');
      const rows = await p.evaluate(() => [...document.querySelectorAll('#doc-viewer-body tr')].map((tr) => tr.textContent.replace(/\s+/g, ' ').trim()));
      const roseRow = rows.find((t) => /Franciscan Desert Rose/.test(t)) || '', figRow = rows.find((t) => /Lladro/.test(t)) || '';
      has(roseRow, 'listing survey', '⚠⚠ the plates\' basis: listing survey');
      lacks(roseRow, 'general estimate', '…never a general estimate');
      has(figRow, 'general estimate', 'the figurine\'s: general estimate');
      await press('#doc-viewer-modal button[onclick="closeDocViewer()"]', 'Close');
      await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(600);
      eq(await overflow(), 0, 'no horizontal overflow at 390');
    });

    eq(errs, [], 'zero page errors');
    console.log('\n' + pass + ' passed, ' + fail + ' failed');
    await b.close();
    process.exit(fail ? 1 : 0);
  } catch (e) {
    console.log('step 115 threw: ' + (e && e.stack || e));
    if (b) await b.close().catch(() => {});
    process.exit(1);
  }
})();
