// Step 69 — P23, Agent Two values the lines (2026-10-06). Spec: AGENT_TWO_SPEC.md. Anthony: "the whole point is to
// save time, not have a human re-enter numbers where we don't have to."
//
// Drives the REAL page through its own controls: + Add New Client typed into and saved, the Job Admin & Inv tab, the
// work bar's Value N lines, the row's Accept value, the line's record (▾) with its comparables, WorthPoint search and
// Use this sale, the row's name box, the bulk bar's Accept values, the More menu's Court Inventory. The valuing service
// is stubbed at the network edge (window.fetch, action agentValue), so everything between the press and the manifest is
// the shipping code. What is seeded is state a person could not type in one sitting: an estimate behind each client and
// inventory lines already named by Agent One.
//
//   A. a values-tier probate estate: Value 4 lines counts the named lines with no figure (not the desk's, not the
//      unnamed one), confirms, posts each line with its depth (the Antiques line researched with its photograph, the
//      ordinary lots as text), writes the figures unreviewed, re-sends the ordinary lot that came back over $250 to be
//      researched, and records the line it could not value with its reason
//   B. the desk: agent-value badges, Accept under the value, the Unreviewed values chip, Agent Two's notices, the
//      "not valued" line; Accept pressed on a row
//   C. the line's record: the comparables, the WorthPoint search, a WorthPoint sale pasted and used
//   D. a name changed under an agent's figure: "made for an earlier name", on the row and at the top
//   E. the bulk bar's Accept values touches only the lines with an unreviewed agent figure
//   F. the Court Inventory printed from the More menu: a Basis column naming each line's basis, the count of values not
//      yet reviewed beside the status, and FINAL withheld from nothing on their account
//   G. a contents-tier estate: the figure stays internal (no value written, the range on the desk, marked internal)
//   H. a living Home Transition: a range past the threshold reads "worth a specialist"
//   I. overflow at 1440 and 390 (the desk with a record open); no page errors
//
//   NODE_PATH=/opt/node22/lib/node_modules node tests/browser/step69.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL ' + m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + '  (got ' + JSON.stringify(a) + ', want ' + JSON.stringify(b) + ')');

const SOLD = 'https://www.liveauctioneers.com/item/123456_herend-rothschild-bird-dinner-plates';
const COMP = { title: 'Herend Rothschild Bird dinner plates, set of 8', venue: 'LiveAuctioneers', saleDate: '2026-03-11', price: 700, url: SOLD, kind: 'sold' };

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  const dialogs = []; p.on('dialog', d => { dialogs.push(d.message()); d.accept(); });
  try {
    await p.goto(APP); await p.waitForTimeout(1500);

    // ── Clients, through the real intake ───────────────────────────────────────
    // + Add New Client lives on the Client Dashboard, so each intake starts there.
    const toDashboard = async () => { await p.click('.nb:has-text("Client Dashboard")'); await p.waitForTimeout(400); };
    const addEstate = async (last, tier) => {
      await toDashboard();
      await p.click('#btn-add-client'); await p.waitForTimeout(300);
      const id = await p.evaluate(([last, tier]) => {
        const set = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; if (e.onchange) e.onchange(); } };
        set('i-svc', 'probate'); toggleIntakeFields();
        set('i-fname', 'Tripp'); set('i-lname', last); set('i-addr', '69 Beach Blvd ' + last);
        set('i-city', 'Palm Beach'); set('i-zip', '33480'); set('i-sqft', '3500');
        set('i-ptype', 'Estate'); set('i-start', '2026-11-05');
        const ss = document.getElementById('i-src'); const so = Array.from(ss.options).find(o => o.value);
        if (so) { ss.value = so.value; if (ss.onchange) ss.onchange(); }
        set('i-executor-fname', 'Jane'); set('i-executor-lname', 'Doe');
        set('i-executor-role', 'Personal Representative'); set('i-executor-phone', '(561) 555-0100');
        set('i-executor-email', 'jane@x.com'); set('i-date-of-death', '2026-06-14');
        set('i-matter-type', 'probate'); set('i-probate-case', '2026-CP-00' + last.length);
        set('i-letters-date', '2026-06-20'); set('i-probate-atty-firm', 'Comiter Singer');
        set('i-probate-atty-fname', 'Richard'); set('i-probate-atty-lname', 'Comiter');
        set('i-probate-atty-phone', '(561) 626-2101'); set('i-probate-atty-email', 'r@x.com');
        set('i-doc-tier', tier);
        saveIntake();
        const j = jobs[0];
        if (!j || j.name.indexOf(last) < 0) return { err: (document.getElementById('i-fb') || {}).textContent };
        j.won = true; j.status = 'won';
        estimateStore[j.id] = { approved: true, approvedBy: 'A', estimate: { jobId: j.id, svc: 'probate',
          havellinTotal: 20000, totTC: 40, totPS: 80, vendors: [], prepItems: [], collections: [],
          rooms: [{ idx: 1, name: 'Dining Room', st: 'in' }, { idx: 4, name: 'Kitchen', st: 'in' }] } };
        return j.id;
      }, [last, tier]);
      await p.waitForTimeout(1300);
      return id;
    };
    const ROWS = (T) => [
      { stableId: 'a', label: 'inventory', roomIdx: 1, seq: 1, status: 'uploaded', objectName: 'Herend Rothschild Bird dinner plates, set of 8',
        category: 'Antiques', qty: 8, condition: 'Good', disposition: '', ts: T, driveFileId: 'fa', driveFileUrl: 'https://drive.google.com/file/d/fa/view',
        namedBy: 'agent', agentBasis: 'backstamp legible in detail frame' },
      { stableId: 'a_det', label: 'detail', groupId: 'a', roomIdx: 1, seq: 1, status: 'uploaded', ts: T, driveFileId: 'fa_det' },
      { stableId: 'b', label: 'inventory', roomIdx: 4, seq: 1, status: 'uploaded', objectName: 'Stainless flatware, service for 12, everyday brand',
        category: 'General/Household', qty: 60, condition: 'Good', disposition: '', ts: T, driveFileId: 'fb', namedBy: 'agent', agentBasis: 'form only' },
      { stableId: 'c', label: 'inventory', roomIdx: 1, seq: 2, status: 'uploaded', objectName: 'Mahogany dining table, pedestal base',
        category: 'Furniture', qty: 1, condition: 'Good', disposition: '', ts: T, driveFileId: 'fc', driveFileUrl: 'https://drive.google.com/file/d/fc/view',
        namedBy: 'agent', agentBasis: 'form and finish clear in frame' },
      { stableId: 'd', label: 'inventory', roomIdx: 4, seq: 2, status: 'uploaded', objectName: 'Silver tray', category: 'Silver & Precious Metal',
        disposition: 'Sell', fmv: 1200, valuedBy: 'desk', ts: T, driveFileId: 'fd' },
      { stableId: 'e', label: 'inventory', roomIdx: 4, seq: 3, status: 'uploaded', objectName: '', category: 'General/Household', ts: T, driveFileId: 'fe' },
      { stableId: 'f', label: 'inventory', roomIdx: 4, seq: 4, status: 'uploaded', objectName: 'Hand-painted ceramic lamp, unmarked',
        category: 'Art & Décor', qty: 1, condition: 'Fair', disposition: '', ts: T, driveFileId: 'ff', namedBy: 'agent' },
    ];
    const seed = (id) => p.evaluate(([id, rows]) => { _photoRefs[id] = rows; savePhotoRefs(id); }, [id, ROWS(Date.now())]);
    const openDesk = async (id) => {
      await p.click('.nb:has-text("Job Admin")'); await p.waitForTimeout(500);
      await p.selectOption('#inv-job', String(id)); await p.waitForTimeout(700);
    };
    // The valuing service, stubbed at the network edge. Everything else passes through, as step 11 does.
    const stub = (answers) => p.evaluate((answers) => {
      SHEETS_SYNC_URL = 'https://script.google.com/macros/s/TEST/exec';
      window.__avPosts = [];
      const real = window.__realFetch || (window.__realFetch = window.fetch);
      window.fetch = (url, opts) => {
        let body = null; try { body = JSON.parse((opts && opts.body) || 'null'); } catch (e) {}
        if (!body || body.action !== 'agentValue') return real(url, opts);
        window.__avPosts.push(body);
        const a = answers[Math.min(window.__avPosts.length - 1, answers.length - 1)];
        return Promise.resolve({ ok: true, text: () => Promise.resolve(JSON.stringify(a)) });
      };
    }, answers);

    const J = await addEstate('Butler', 'values');
    if (!J || J.err) { console.log('REFUSED: ' + (J && J.err)); throw new Error('intake refused'); }
    await seed(J);
    await openDesk(J);

    // ── A · the button and the run ─────────────────────────────────────────────
    const btnText = await p.evaluate(() => {
      const el = Array.from(document.querySelectorAll('#panel-inventory button')).find(x => /^Value \d+ line/.test(x.textContent.trim()));
      return el ? { text: el.textContent.trim(), visible: el.checkVisibility() } : null;
    });
    eq(btnText && btnText.text, 'Value 4 lines', '⚠ it counts the NAMED lines with no figure: not the desk\'s tray, not the unnamed line');
    ok(btnText && btnText.visible, 'and it is on screen');
    await stub([
      { ok: true, success: true, model: 'claude-opus-5-5', remaining: 0,
        results: {
          a: { fmv: 640, low: 480, high: 800, confidence: 'high', source: 'Auction comps', basis: 'Median of 4 sold sets of 8, 2025-2026',
               comps: [COMP], lookup: 'Herend Rothschild Bird dinner plate', notices: [{ kind: 'appraiser', text: 'a full service may be worth a specialist' }], mode: 'comps' },
          b: { fmv: 45, low: 40, high: 60, confidence: 'medium', source: 'General estimate', basis: 'Everyday stainless, service for 12, sells for $40 to $60', comps: [], lookup: '', notices: [], mode: 'general' },
          c: { fmv: 600, low: 400, high: 800, confidence: 'medium', source: 'General estimate', basis: 'Pedestal tables resell for $400 to $800', comps: [], lookup: '', notices: [], mode: 'general' } },
        failed: { f: 'no sold comparables found for an unmarked lamp' } },
      { ok: true, success: true, model: 'claude-opus-5-5', remaining: 0,
        results: { c: { fmv: 550, low: 450, high: 700, confidence: 'medium', source: 'Online comps', basis: 'Three sold mahogany pedestal tables, 2025-2026',
                        comps: [Object.assign({}, COMP, { title: 'Mahogany pedestal dining table', price: 525, url: 'https://www.ebth.com/items/mahogany-table' })],
                        lookup: 'mahogany pedestal dining table', notices: [], mode: 'comps' } }, failed: {} },
    ]);
    await p.click('#panel-inventory button:has-text("Value 4 lines")');
    await p.waitForTimeout(1200);
    ok(dialogs.some(m => /^Value 4 lines on this job\?/.test(m)), 'it asks first');
    ok(dialogs.some(m => /researched against sold comparables/.test(m)), 'and says how deep each line goes');
    const posts = await p.evaluate(() => window.__avPosts);
    eq(posts.length, 2, 'two calls: the run, then the line sent on to research');
    eq(posts[0].items.map(i => [i.stableId, i.mode]), [['a', 'comps'], ['b', 'general'], ['c', 'general'], ['f', 'comps']], 'every line with its depth');
    eq(posts[0].items[0].fileId, 'fa', 'the researched line carries its photograph');
    eq(posts[0].items[0].details, [{ fileId: 'fa_det' }], "⚠ and its maker's-mark close-up");
    eq(posts[0].items[1].fileId, '', 'an ordinary lot travels as text');
    eq(posts[0].context, { estate: true, basis: 'Fair Market Value', valuationDate: '2026-06-14' }, 'valued at the date of death');
    eq(posts[1].items.map(i => [i.stableId, i.mode]), [['c', 'comps']], '⚠ the ordinary lot over $250 is researched, in the same run');
    const man = await p.evaluate((id) => _photoRefs[id].filter(r => r.label === 'inventory').map(r => ({ id: r.stableId, fmv: r.fmv, src: r.valSource,
      by: r.valuedBy, conf: r.valConf, rev: !!r.valReviewed, fail: r.valFailed || '', date: r.valDate, name: r.objectName })), J);
    const by = (id) => man.find(r => r.id === id);
    eq([by('a').fmv, by('a').src, by('a').by, by('a').rev, by('a').date], [640, 'Auction comps', 'agent', false, '2026-06-14'], 'the plates: valued, unreviewed, at the date of death');
    eq([by('b').fmv, by('b').src], [45, 'General estimate'], 'the flatware: a general estimate');
    eq([by('c').fmv, by('c').src], [550, 'Online comps'], '⚠ the table: the researched figure, never the ordinary $600');
    eq([by('d').fmv, by('d').by], [1200, 'desk'], 'the desk\'s tray is untouched');
    eq([by('e').fmv, by('e').by], [undefined, undefined], 'the unnamed line is untouched');
    eq([by('f').fmv, by('f').fail], [undefined, 'no sold comparables found for an unmarked lamp'], 'the lamp: not valued, with the reason');

    // ── B · what the desk shows ────────────────────────────────────────────────
    const rowText = (sid) => p.evaluate((sid) => { const el = document.getElementById('inv-row-' + sid); return el ? el.textContent : ''; }, sid);
    ok(/agent value/.test(await rowText('a')), 'the plates\' row says agent value');
    ok(/Accept value/.test(await rowText('a')), 'with Accept under it');
    ok(!/Accept value/.test(await rowText('d')), 'the desk\'s tray has no Accept');
    ok(/not valued/.test(await rowText('f')), 'the lamp\'s row says not valued');
    const chip = () => p.evaluate(() => { const el = Array.from(document.querySelectorAll('#panel-inventory button')).find(x => /^Unreviewed values/.test(x.textContent.trim())); return el ? el.textContent.trim() : ''; });
    eq(await chip(), 'Unreviewed values 3', 'the chip counts three unreviewed figures');
    const top = await p.evaluate(() => (document.getElementById('inv-value-notices') || {}).textContent || '');
    ok(/Appraisal advised/.test(top), 'Agent Two\'s notice is at the top');
    ok(/3 valued/.test(await p.evaluate(() => (document.getElementById('inv-value-state') || {}).textContent || '')), 'and the line under the button says what happened');
    await p.click('#inv-row-a button:has-text("Accept value")');
    await p.waitForTimeout(400);
    const acc = await p.evaluate((id) => { const r = _photoRefs[id].find(x => x.stableId === 'a'); return [r.valReviewed, r.valReviewedBy]; }, J);
    eq(acc[0], true, 'Accept pressed on the row accepts the plates\' value');
    eq(await chip(), 'Unreviewed values 2', 'and the chip falls to two');
    ok(!/Accept value/.test(await rowText('a')), 'and the button goes');

    // ── C · the line's record ──────────────────────────────────────────────────
    await p.click('#inv-row-c button[title="Open the full record"]');
    await p.waitForTimeout(400);
    const rec = await rowText('c');
    ok(/Agent Two/.test(rec), 'the record has Agent Two\'s section');
    ok(/SOLD/.test(rec) && /Mahogany pedestal dining table/.test(rec), 'with its comparable');
    ok(/WorthPoint search: mahogany pedestal dining table/.test(rec), 'and the WorthPoint search');
    ok(/Photograph/.test(rec), 'beside the photograph');
    await p.click('#inv-row-c summary:has-text("Use a WorthPoint sale")');
    await p.fill('#av-wp-title-c', 'Antique mahogany pedestal table, 72in');
    await p.fill('#av-wp-price-c', '575');
    await p.fill('#av-wp-date-c', '2026-01-20');
    await p.fill('#av-wp-url-c', 'https://www.worthpoint.com/worthopedia/mahogany-pedestal-123');
    await p.click('#inv-row-c button:has-text("Use this sale")');
    await p.waitForTimeout(400);
    const wp = await p.evaluate((id) => { const r = _photoRefs[id].find(x => x.stableId === 'c'); return { src: r.valSource, rev: !!r.valReviewed, first: r.valComps[0], fmv: r.fmv }; }, J);
    eq(wp.src, 'WorthPoint comps', 'the WorthPoint sale names the source');
    eq(wp.rev, true, 'and accepts the value');
    eq([wp.first.title, wp.first.price, wp.first.by], ['Antique mahogany pedestal table, 72in', 575, 'desk'], 'the sale goes first in the comparables');
    eq(wp.fmv, 550, 'the figure stays the person\'s to change');

    // ── D · a name changed under an agent's figure ─────────────────────────────
    await p.fill('#inv-row-b input[type="text"]', 'Sterling silver flatware, Gorham Chantilly, service for 12');
    await p.press('#inv-row-b input[type="text"]', 'Tab');
    await p.waitForTimeout(400);
    const staleTop = await p.evaluate(() => (document.getElementById('inv-value-notices') || {}).textContent || '');
    ok(/Value made for an earlier name/.test(staleTop), '⚠ a rename under an agent\'s figure is named at the top at once');
    await p.evaluate(() => renderInventoryTab()); await p.waitForTimeout(300);
    ok(/value made for an earlier name/.test(await rowText('b')), 'and on the row');

    // ── E · Accept values across a selection ───────────────────────────────────
    await p.click('#inv-row-b input[title="Select for a bulk change"]');
    await p.click('#inv-row-d input[title="Select for a bulk change"]');
    await p.waitForTimeout(300);
    const dBefore = await p.evaluate((id) => _photoRefs[id].find(x => x.stableId === 'd').updatedAt, J);
    await p.click('button:has-text("Accept values")');
    await p.waitForTimeout(400);
    const bulk = await p.evaluate((id) => ({ b: !!_photoRefs[id].find(x => x.stableId === 'b').valReviewed, dAt: _photoRefs[id].find(x => x.stableId === 'd').updatedAt,
      d: _photoRefs[id].find(x => x.stableId === 'd').valReviewed }), J);
    eq(bulk.b, true, 'the flatware\'s agent figure is accepted');
    eq([bulk.d, bulk.dAt === dBefore], [undefined, true], '⚠ the desk\'s tray in the same selection is left exactly as it was, its clock included');
    ok(/1 value accepted \(1 of the 2 selected carried no unreviewed agent value/.test(await p.evaluate(() => document.getElementById('panel-inventory').textContent)), 'and the bar says so');
    await p.evaluate(() => _invClearPicks()); await p.waitForTimeout(200);

    // ── F · the Court Inventory, from the More menu ────────────────────────────
    // b's name changed (still an agent figure, accepted); make one figure unreviewed again so the stamp has a count.
    await p.evaluate((id) => { const r = _photoRefs[id].find(x => x.stableId === 'b'); delete r.valReviewed; savePhotoRefs(id); renderInventoryTab(); }, J);
    await p.evaluate(() => { window.__printed = ''; window.__realPrint = window.__realPrint || window.print;
      window.print = () => { window.__printed = document.getElementById('print-target').innerHTML; }; });
    await p.click('#inv-workbar summary:has-text("More")');
    await p.click('#inv-workbar button:has-text("Court Inventory")');
    await p.waitForTimeout(700);
    const court = await p.evaluate(() => window.__printed);
    ok(/<th[^>]*>Basis<\/th>/.test(court), 'the Court Inventory has a Basis column');
    ok(/>auction comps<\/td>/.test(court), 'the plates read auction comps');
    ok(/>WorthPoint comps<\/td>/.test(court), 'the table reads WorthPoint comps');
    ok(/>general estimate<\/td>/.test(court), 'the flatware reads general estimate');
    ok(/1 value not yet reviewed/.test(court), '⚠ the page counts the figure nobody has accepted');
    ok(/DRAFT/.test(court) && /not yet valued/.test(court), 'the unvalued lamp still makes it a draft (a floor), as always');
    ok(!/value(s)? not yet reviewed[^<]*DRAFT/.test(court), 'and the count is beside the status, not a reason for it');

    // ── G · a contents-tier estate: internal ───────────────────────────────────
    const K = await addEstate('Kimball', 'contents');
    if (!K || K.err) throw new Error('second intake refused: ' + (K && K.err));
    await seed(K);
    await openDesk(K);
    await stub([{ ok: true, success: true, remaining: 0, failed: {},
      results: { a: { fmv: 640, low: 480, high: 800, confidence: 'high', source: 'Auction comps', basis: 'Median of 4', comps: [COMP], lookup: 'Herend', notices: [], mode: 'comps' },
                 b: { fmv: 45, low: 40, high: 60, confidence: 'medium', source: 'General estimate', basis: 'x', comps: [], lookup: '', notices: [], mode: 'general' },
                 c: { fmv: 200, low: 150, high: 250, confidence: 'medium', source: 'General estimate', basis: 'x', comps: [], lookup: '', notices: [], mode: 'general' },
                 f: { fmv: 90, low: 60, high: 120, confidence: 'low', source: 'Auction comps', basis: 'x', comps: [], lookup: 'lamp', notices: [], mode: 'comps' } } }]);
    const kBtn = await p.evaluate(() => { const el = Array.from(document.querySelectorAll('#panel-inventory button')).find(x => /^Value \d+ line/.test(x.textContent.trim())); return el ? el.title : ''; });
    ok(/no document prints it/.test(kBtn), 'the button says the figures stay on the desk');
    await p.click('#panel-inventory button:has-text("Value 4 lines")');
    await p.waitForTimeout(900);
    ok(dialogs.some(m => /Counsel values the property on this engagement/.test(m)), 'and so does its question');
    const kMan = await p.evaluate((id) => _photoRefs[id].filter(r => r.stableId === 'a' || r.stableId === 'c').map(r => [r.fmv, r.valSource, r.valLow, r.valHigh, r.valuedBy]), K);
    eq(kMan[0], [undefined, undefined, 480, 800, 'agent'], '⚠⚠ no value and no source written where counsel values; the range stays on the desk');
    ok(/agent \$480–\$800 · internal/.test(await rowText('a')), 'the row shows the range, marked internal');
    const kMore = await p.evaluate(() => Array.from(document.querySelectorAll('#inv-workbar button')).map(x => x.textContent.trim()));
    ok(kMore.indexOf('Court Inventory') < 0 && kMore.indexOf('Estate Inventory PDF') < 0, 'and no valued schedule is offered on this engagement');

    // ── H · a living Home Transition ───────────────────────────────────────────
    await toDashboard();
    await p.click('#btn-add-client'); await p.waitForTimeout(300);
    const L = await p.evaluate(() => {
      const set = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; if (e.onchange) e.onchange(); } };
      const pick = (id) => { const e = document.getElementById(id); const x = e && Array.from(e.options).find(x => x.value); if (x) { e.value = x.value; if (e.onchange) e.onchange(); } };
      set('i-svc', 'downsizing_move'); toggleIntakeFields();
      set('i-fname', 'Pat'); set('i-lname', 'Lennox'); set('i-addr', '12 Ocean Ave'); set('i-city', 'Palm Beach'); set('i-zip', '33480');
      set('i-sqft', '3500'); set('i-phone', '(561) 555-0199'); set('i-email', 'c@example.com'); set('i-dest-sqft', '2000');
      pick('i-ptype'); pick('i-src'); set('i-start', '2026-11-12'); saveIntake();
      const j = jobs[0]; if (!j || j.name.indexOf('Lennox') < 0) return null;
      estimateStore[j.id] = { approved: true, approvedBy: 'A', estimate: { jobId: j.id, svc: 'downsizing_move', havellinTotal: 9000, vendors: [], prepItems: [], collections: [],
        rooms: [{ idx: 1, name: 'Living Room', st: 'in' }] } };
      _photoRefs[j.id] = [{ stableId: 'w', label: 'inventory', roomIdx: 1, seq: 1, status: 'uploaded', objectName: 'Oil on canvas, harbour scene, signed lower right',
        category: 'Art & Décor', qty: 1, disposition: '', ts: Date.now(), driveFileId: 'fw', fmv: 2800, valLow: 2200, valHigh: 9000, valuedBy: 'agent',
        valConf: 'low', valSource: 'Auction comps', valDate: '2026-10-06' }];
      savePhotoRefs(j.id);
      return j.id;
    });
    await p.waitForTimeout(1300);
    ok(!!L, 'a living client');
    await openDesk(L);
    ok(/worth a specialist/.test(await rowText('w')), 'a living client\'s range past the threshold reads worth a specialist');
    const lFlag = await p.evaluate((id) => invNeedsAppraisal(_photoRefs[id][0], jobs.find(j => j.id === id)), L);
    eq(lFlag, false, '⚠ and is never the appraisal flag on a living job (the tick alone)');

    // ── I · layout ─────────────────────────────────────────────────────────────
    await openDesk(J);
    await p.click('#inv-row-c button[title="Open the full record"]'); await p.waitForTimeout(300);
    for (const w of [1440, 390]) {
      await p.setViewportSize({ width: w, height: 900 });
      await p.waitForTimeout(250);
      const over = await p.evaluate(() => Math.max(0, document.documentElement.scrollWidth - window.innerWidth));
      eq(over, 0, 'no horizontal overflow at ' + w + 'px with a record open');
    }
    eq(errs.length, 0, 'no page errors  ' + JSON.stringify(errs.slice(0, 2)));
  } catch (e) {
    fail++; console.log('  THREW ' + (e && e.stack || e));
  } finally {
    await b.close();
  }
  console.log('  step69: ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
