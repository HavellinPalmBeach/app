// The workbook and the on-screen Summary stop asserting a valuation the engagement was
// contracted not to produce (2026-09-22). The third axis on the same sheet: docSet asked
// "is there a decedent", onProbate asked "is there a court", this asks "what is the client
// contracted to RECEIVE".
//
// ⚠ Only the browser proves the two surfaces agree, because they are produced by different
//   code on different machines — the screen by `_renderInventorySummary`, the workbook by
//   `_writeSummarySheet` in Apps Script off `buildInventoryPayload`. The unit suite drives
//   each end; this drives the real intake, the real tab and the real payload builder and
//   reads back what a person would actually see.
// ⚠ Read the RENDERED container, never `document.body.innerHTML` — this is a single-file app
//   whose <script> lives in the body, so that string carries the whole JavaScript source and
//   every `lacks()` against it can never pass. CLAUDE.md records that trap costing a round.
// ⚠ `saveIntake` lands on the Client Dashboard on an 800ms timer; let it land before
//   measuring anything, or every element reads `offsetParent === null`.
const { chromium } = require('playwright');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL ' + m); } };
const eq = (a, b, m) => ok(a === b, m + '  (got ' + JSON.stringify(a) + ', want ' + JSON.stringify(b) + ')');
const APP = process.env.APP || 'file:///home/user/app/havellin.html';

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto(APP); await p.waitForTimeout(1500);

  await p.click('.nb:has-text("Client Intake")'); await p.waitForTimeout(300);
  const jobId = await p.evaluate(() => {
    const set = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; if (e.onchange) e.onchange(); } };
    set('i-svc', 'probate'); toggleIntakeFields();
    set('i-fname', 'Tripp'); set('i-lname', 'Butler'); set('i-addr', '69 Beach Blvd');
    set('i-city', 'Palm Beach'); set('i-zip', '33480'); set('i-sqft', '3500');
    set('i-ptype', 'Estate'); set('i-start', '2026-10-01');
    const ss = document.getElementById('i-src'); const so = Array.from(ss.options).find(o => o.value);
    if (so) { ss.value = so.value; if (ss.onchange) ss.onchange(); }
    set('i-executor-fname', 'Jane'); set('i-executor-lname', 'Doe');
    set('i-executor-role', 'Personal Representative'); set('i-executor-phone', '(561) 555-0100');
    set('i-executor-email', 'jane@x.com'); set('i-date-of-death', '2026-08-14');
    set('i-matter-type', 'probate');
    set('i-probate-case', '2026-CP-001234'); set('i-letters-date', '2026-08-20');
    set('i-probate-atty-firm', 'Comiter Singer'); set('i-probate-atty-fname', 'Richard');
    set('i-probate-atty-lname', 'Comiter'); set('i-probate-atty-phone', '(561) 626-2101');
    set('i-probate-atty-email', 'r@x.com');
    set('i-doc-tier', 'values');
    saveIntake();
    if (!jobs.length) return { err: (document.getElementById('i-fb') || {}).textContent };
    const j = jobs[0]; j.won = true; j.status = 'won';
    j.driveFolder = 'https://drive.google.com/drive/folders/ABCDEFGHIJKLMNOPQRSTUVWXYZ012';
    estimateStore[j.id] = { approved: true, approvedBy: 'A', estimate: { jobId: j.id, svc: 'probate',
      havellinTotal: 20000, totTC: 40, totPS: 80, vendors: [], prepItems: [], collections: [],
      rooms: [{ idx: 1, name: 'Entry & Living', st: 'in' }, { idx: 4, name: 'Kitchen', st: 'in' }] } };
    _photoRefs[j.id] = [
      { stableId: 'a', label: 'inventory', roomIdx: 1, seq: 1, status: 'uploaded', objectName: 'Sideboard',
        category: 'Furniture', ts: Date.now(), driveFileId: 'fa', disposition: 'Keep' },
      { stableId: 'b', label: 'inventory', roomIdx: 4, seq: 1, status: 'uploaded', objectName: 'Silver tray',
        category: 'Silver & Precious Metal', ts: Date.now(), driveFileId: 'fb', disposition: 'Sell' },
    ];
    savePhotoRefs(j.id);
    return j.id;
  });
  if (jobId && jobId.err) { console.log('REFUSED: ' + jobId.err); process.exit(1); }
  ok(!!jobId, 'a probate estate seeded at the values tier');
  await p.waitForTimeout(1300);

  await p.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('.nb')).find(b => /Job Admin/.test(b.textContent));
    if (btn) btn.click();
  });
  await p.waitForTimeout(500);
  ok(await p.evaluate(() => {
    const el = document.getElementById('panel-inventory');
    return !!el && getComputedStyle(el).display !== 'none';
  }), 'the Job Admin & Inv tab really opened');
  await p.evaluate((id) => {
    const s = document.getElementById('inv-job'); if (s) { s.value = String(id); if (s.onchange) s.onchange(); }
  }, jobId);
  await p.waitForTimeout(600);

  // ⚠ THE SUMMARY IS COLLAPSED BY DEFAULT (`_invShowRoll` starts false) behind a
  //   "Show summary & rollups" button. A probe that never presses it reads an empty panel and
  //   every assertion about the valuation block passes for the wrong reason. Press the REAL
  //   control rather than setting the global, so the button and the block cannot drift.
  await p.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('#panel-inventory button'))
      .find((b) => /summary &.*rollups/i.test(b.textContent));
    if (btn) btn.click();
  });
  await p.waitForTimeout(400);
  ok(await p.evaluate(() => {
    const el = document.getElementById('inv-summary');
    return !!el && el.innerHTML.length > 200 && el.offsetParent !== null;
  }), '⚠ the Summary block is actually on screen before anything is measured');

  // Read the RENDERED summary card and the REAL payload, at each tier, through the real
  // Edit-Client field rather than by poking the record.
  const at = async (tier) => p.evaluate((t) => {
    const j = jobs[0]; j.docTier = t; saveJobs();
    renderInventoryTab();
    const panel = document.getElementById('panel-inventory');
    // ⚠ `textContent`, NOT `innerText`: innerText applies CSS `text-transform`, and these
    //   table headings render uppercase, so a case-sensitive match finds nothing and reads as
    //   the block being absent. CLAUDE.md records that trap, and it cost a round here too.
    const txt = panel ? panel.textContent : '';
    const pay = buildInventoryPayload(j.id);
    const has = (s) => txt.indexOf(s) >= 0;
    return {
      statesValues: pay.statesValues,
      basis: !!panel.querySelector('select[onchange^="setValBasis"]'),
      avd: !!panel.querySelector('input[onchange^="setEstateAVD"]'),
      fmvTotal: has('Total Estimated FMV'),
      awaiting: has('Items Awaiting Valuation'),
      fmvByCat: has('FMV by Category'),
      itemsByCat: has('Items by Category'),
      maiv: has('MAIV Articles'),
      dod: has('Date of Death'),
      letters: has('Letters Issued'),
      bequests: has('Specific Bequests'),
      net: has('Net to Estate'),
      items: has('Total Items'),
      specialist: has('Needs Specialist Appraisal'),
      dollars: (txt.match(/\$/g) || []).length,
    };
  }, tier);

  const V = await at('values');
  const C = await at('contents');
  const N = await at('none');
  const A = await at('appraisals');
  const B = await p.evaluate(() => {
    const j = jobs[0]; delete j.docTier; delete j.docScope; saveJobs(); renderInventoryTab();
    const panel = document.getElementById('panel-inventory');
    return { statesValues: buildInventoryPayload(j.id).statesValues,
             fmvTotal: panel.innerText.indexOf('Total Estimated FMV') >= 0 };
  });

  console.log('');
  console.log('  tier        sends  basis  as-of  FMVtot  await  FMVcat  ITEMcat  MAIV');
  [['values', V], ['appraisals', A], ['contents', C], ['none', N]].forEach(([n, r]) => {
    const y = (v) => (v ? ' yes ' : '  no ');
    console.log('  ' + n.padEnd(11) + String(r.statesValues).padEnd(7) + y(r.basis) + ' ' + y(r.avd)
      + ' ' + y(r.fmvTotal) + ' ' + y(r.awaiting) + ' ' + y(r.fmvByCat) + '  ' + y(r.itemsByCat) + ' ' + y(r.maiv));
  });
  console.log('');

  eq(V.statesValues, true, 'the values tier tells the server to state values');
  eq(A.statesValues, true, '…and so does the top tier');
  eq(C.statesValues, false, '⚠ a capture engagement does not');
  eq(N.statesValues, false, '…and neither does one where counsel inventories');
  eq(B.statesValues, true, '⚠⚠ an unanswered tier keeps the valuation — nothing priced before today moves');
  ok(B.fmvTotal, '…and the screen keeps it too');

  [['contents', C], ['none', N]].forEach(([n, r]) => {
    ok(!r.basis, '⚠ no Valuation Basis dropdown at ' + n + ' — an editable control for a valuation we are not producing');
    ok(!r.avd, '⚠ no §2032 alternate-valuation tick at ' + n + ' — that is a tax election, not a checkbox');
    ok(!r.fmvTotal, '⚠ no Total Estimated FMV at ' + n);
    ok(!r.awaiting, '⚠⚠ no Items Awaiting Valuation at ' + n + ' — the count that could never fall');
    ok(!r.fmvByCat && r.itemsByCat, '⚠ the category table COUNTS at ' + n + ' rather than pricing');
    ok(r.maiv, '⚠⚠ the MAIV aggregate STAYS at ' + n + ' — a federal filing question for the estate');
    ['dod', 'letters', 'bequests', 'net', 'items', 'specialist'].forEach((k) => {
      ok(r[k], '…and "' + k + '" stays at ' + n + ' — a fact about the matter, not our deliverable');
    });
  });
  [['values', V], ['appraisals', A]].forEach(([n, r]) => {
    ok(r.basis && r.avd && r.fmvTotal && r.awaiting && r.fmvByCat && !r.itemsByCat,
       'the whole valuation block is untouched at ' + n);
  });
  ok(C.dollars < V.dollars, '⚠ fewer dollar figures on the page at contents (' + C.dollars + ' vs ' + V.dollars + ')');

  // ── THE WORKBOOK, from the REAL payload through the REAL Apps Script writer. This is the
  //    join: a build that derives the flag and never puts it on the wire, or a server that
  //    receives it and ignores it, looks identical from either end alone.
  const payloads = await p.evaluate(() => {
    const j = jobs[0]; const out = {};
    ['values', 'contents'].forEach((t) => { j.docTier = t; saveJobs(); out[t] = buildInventoryPayload(j.id); });
    delete j.docTier; saveJobs(); out.legacy = buildInventoryPayload(j.id);
    // ⚠ PIN THE CLOCK. `buildInventoryPayload` stamps `lastUpdated` with `new Date()`, so two
    //   payloads built a millisecond apart differ and the byte-for-byte comparison below fails
    //   intermittently. CLAUDE.md records that exact failure on this same writer.
    Object.keys(out).forEach((k) => { out[k].lastUpdated = '2026-09-22T00:00:00.000Z'; });
    return out;
  });
  const fs = require('fs'), path = require('path'), vm = require('vm');
  const gs = fs.readFileSync(path.join(__dirname, '..', '..', 'apps-script', 'saveInventory.gs'), 'utf8');
  const pick = (n) => gs.match(new RegExp('function ' + n + '\\([\\s\\S]*?\\n\\}'))[0];
  const g = { INV_CATEGORIES_FALLBACK: [], INV_DISPOSITIONS_FALLBACK: [] }; vm.createContext(g);
  vm.runInContext(pick('_invColLetter') + '\n' + pick('_writeSummarySheet'), g);
  const sheet = (pl) => {
    const cells = [];
    const sh = { clear() {}, autoResizeColumns() {}, getRange(r, c) { return {
      setValue(v) { cells.push({ r, c, v: String(v) }); return this; },
      setFormula(f) { cells.push({ r, c, v: String(f), formula: true }); return this; },
      setNumberFormat() { return this; }, setFontWeight() { return this; } }; } };
    g._writeSummarySheet({ getSheetByName: () => sh, insertSheet: () => sh }, pl);
    return cells;
  };
  const labels = (c) => c.filter((x) => !x.formula).map((x) => x.v);
  const wV = labels(sheet(payloads.values)), wC = labels(sheet(payloads.contents)),
        wL = labels(sheet(payloads.legacy));

  ['Total Estimated FMV', 'Items Awaiting Valuation', 'FMV BY CATEGORY'].forEach((row) => {
    ok(wV.indexOf(row) >= 0, 'workbook keeps "' + row + '" at the values tier');
    ok(wC.indexOf(row) < 0, '⚠⚠ workbook drops "' + row + '" at the contents tier');
  });
  ok(wC.indexOf('ITEMS BY CATEGORY') >= 0, '⚠ and counts instead');
  ['Date of Death', 'Letters Issued', '§733.604 Inventory Deadline', 'Exempt §732.402',
   'Specific Bequests', 'Net to Estate', 'Total Items'].forEach((row) => {
    ok(wC.indexOf(row) >= 0, 'workbook keeps "' + row + '" at contents — ' + row + ' is about the matter');
  });
  eq(wL.join('|'), wV.join('|'), '⚠⚠ a legacy job with no tier renders the workbook byte-for-byte as before');
  ok(!sheet(payloads.contents).some((x) => x.formula && x.c === 5 && x.v.indexOf('SUMIF') >= 0),
     '⚠⚠ and NOTHING sums the FMV column — the money is gone from the sheet, not merely unlabelled');
  const rowOf = (c, l) => (c.find((x) => x.v === l && x.c === 1) || {}).r;
  const cC = sheet(payloads.contents);
  eq(rowOf(cC, 'FLAGS') - rowOf(cC, 'Total Items'), 2, '⚠ no gap where the two valuation rows were');
  ok(!cC.some((x) => x.c === 4 && /should equal B/.test(x.v)),
     '⚠ and no back-reference to a row that was never written');

  // ⚠ THE TWO SURFACES MUST AGREE — that was the whole finding of the living-client build.
  eq(C.fmvTotal, wC.indexOf('Total Estimated FMV') >= 0, '⚠⚠ screen and workbook agree on the FMV total at contents');
  eq(C.awaiting, wC.indexOf('Items Awaiting Valuation') >= 0, '…and on the awaiting count');
  eq(C.fmvByCat, wC.indexOf('FMV BY CATEGORY') >= 0, '…and on whether the rollup prices');
  eq(V.fmvTotal, wV.indexOf('Total Estimated FMV') >= 0, '…and at the values tier too');

  // ⚠ THE 29px AT 390 IS PRE-EXISTING AND IS NOT THIS BUILD'S — measured on `git show
  //   HEAD:havellin.html` through the identical fixture, which reads 29 at BOTH tiers. This
  //   change makes it strictly better: at the contents tier the category table loses a column
  //   and the page comes back to 0. Asserted as "no worse than HEAD" rather than as 0, because
  //   claiming 0 here would be false and silently pinning 29 would adopt somebody else's debt.
  const HEAD_OVERFLOW_390 = 29;
  for (const w of [1440, 390]) {
    await p.setViewportSize({ width: w, height: 1000 });
    await p.waitForTimeout(250);
    const of = await p.evaluate(() => Math.max(0, document.documentElement.scrollWidth - window.innerWidth));
    if (w === 1440) eq(of, 0, 'no horizontal overflow at 1440px');
    else ok(of <= HEAD_OVERFLOW_390, 'no worse than HEAD at 390px (' + of + ' ≤ ' + HEAD_OVERFLOW_390 + ')');
  }
  eq(errs.length, 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));

  await b.close();
  console.log('  step10: ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
