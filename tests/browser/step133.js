// Step 133 — the line's record, answer first (2026-11-02n; Anthony, off the record of seven cabbage-ware plates on a trust: "This whole
// thing is overwhelming … I don't even know what to do with it", then "should things like condition just default? some of these
// decisions are not decisions at all"; he took Answer first and the rule).
//
// Drives the REAL page with an active trust estate (no Form 706) whose kitchen holds the plates (Undecided, Agent Two's low figure from
// three Etsy prices, a Look at this note), a shotgun on Hold, a mirror sold at auction and a rug the family disagrees about. Job Admin
// & Inv through its own nav button; each record opened by its own ▾:
//   A. The plates: what it is worth first, its note under To do, the research shut; one sentence of what the app filled in; nothing
//      that does not apply (MAIV, §732.402, NFA, the photo link, an approval, the sale's figures); the two folds shut.
//   B. ✎ Correct what was filled in, opened by its summary, shows Category, Room and Condition; Good chosen there says so in the
//      sentence at once, and the fold stays open through the redraw a category choice makes.
//   C. Something unusual about this item?, opened by its summary: Send to an appraiser ticked; it stays open, and on the rug the
//      family disagrees about it is open by itself.
//   D. The shotgun: its serial and NFA boxes in view, never folded. The mirror: Leaving the property with Approved by, Sold for,
//      Fees, Net, Date it left and Receipt; Sold for typed.
//   At 1440 and 390 px no horizontal overflow; zero page errors throughout.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step133.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
const SYNC = 'https://sync.example.test/exec';
const J = 13301;
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
    let sheet = {};
    await ctx.route(SYNC + '**', async (r) => {
      const req = r.request();
      const json = (o) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
      if (req.method() === 'POST') {
        let body = {}; try { body = JSON.parse(req.postData() || '{}'); } catch (e) {}
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
    p.on('dialog', async (d) => { await d.accept(); });
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
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    // The open record of a line: the row's container holds it under the row.
    const rec = (id) => '#inv-row-' + id;
    const recText = (id) => p.evaluate((id) => { const el = document.getElementById('inv-row-' + id); return el ? el.textContent.replace(/\s+/g, ' ') : ''; }, id);
    // What a person can SEE of a record (innerText leaves out what a shut <details> hides).
    const recSeen = (id) => p.evaluate((id) => { const el = document.getElementById('inv-row-' + id); return el ? el.innerText.replace(/\s+/g, ' ') : ''; }, id);
    const foldOpen = (id, cls) => p.evaluate(([id, cls]) => { const d = document.querySelector('#inv-row-' + id + ' details.' + cls); return d ? d.open : null; }, [id, cls]);
    const labelsIn = (id, cls) => p.evaluate(([id, cls]) => [...document.querySelectorAll('#inv-row-' + id + ' .' + cls + ' .inv-rec-f > div:first-child')]
      .map((d) => d.textContent.trim()), [id, cls]);

    await p.goto(APP); await p.waitForTimeout(1600);
    sheet = await p.evaluate(([J, SYNC]) => {
      SHEETS_SYNC_URL = SYNC;
      window.print = function () {};
      try { localStorage.setItem('hav_device_user', 'Anthony Graziano'); } catch (e) {}
      const T = Date.now() - 2 * 86400000;
      jobs.unshift({ id: J, hvlId: 'HVL-2611-RC1', name: 'Helen Ellison', svc: 'cleanout', matterType: 'trust', trustName: 'Ellison Family Trust', trustDate: '2015-03-03',
        addr: '1 Ocean Blvd', city: 'Palm Beach', zip: '33480', executor: 'Thomas Ellison', executorRole: 'Successor Trustee', executorEmail: 'thomas@example.com',
        deathDate: '2026-08-14', executorAuth: 'received', docTier: 'values', gate706: 'no',
        status: 'active', won: true, wonAt: '2026-10-01', approved: true, tc: 'Ashley Jerome', created: '2026-09-28', start: '2026-10-12', activatedOn: '2026-10-10',
        agrApproved: true, agrSent: true, agrSigned: true,
        driveFolder: 'https://drive.google.com/drive/folders/R' + J, driveSubfolders: { 'Estate Inventory': 'INV_RC', 'As-Found Record': 'AF_RC' }, at: {}, docState: {},
        payments: [{ uid: 'd' + J, stage: 'deposit', amount: 15000, receivedOn: '2026-10-08', method: 'wire', clearedOn: '2026-10-08' }] });
      estimateStore[J] = { approved: true, submitted: true, approvedBy: 'Anthony Graziano', savedAt: T,
        estimate: { jobId: J, svc: 'cleanout', havellinTotal: 30000, fixedPrice: true, fixedAmount: 30000, fixedLines: true, totTC: 80, totPS: 120, days: 6,
          vendors: [], prepItems: [], rooms: [{ idx: 2, name: 'Kitchen', st: 'in', vol: 3, cplx: 3 }] } };
      const line = (id, n, o) => Object.assign({ stableId: id, itemNo: 40 + n, qty: 1, label: 'inventory', collId: null, roomIdx: 2, seq: n, status: 'uploaded', ts: T + n * 60000,
        filename: 'HVL-2611-RC1_Kitchen_INV_' + n + '.jpg', driveFileId: 'F_' + id, driveFileUrl: 'https://drive.google.com/file/d/F_' + id + '/view',
        namedBy: 'agent', agentConf: 'high', agentAt: T + n * 60000 + 5000, updatedAt: T + n * 60000 + 5000, category: 'General/Household', disposition: 'Undecided' }, o);
      _photoRefs[J] = [
        { stableId: 'af1', label: 'before', roomIdx: 2, seq: 1, collId: null, status: 'uploaded', ts: T, updatedAt: T, filename: 'HVL-2611-RC1_Kitchen_before_1.jpg',
          driveFileId: 'F_AF', driveFileUrl: 'https://drive.google.com/file/d/F_AF/view' },
        line('pl', 1, { objectName: 'Green cabbage-ware crescent side plates', qty: 7, fmv: 75, valLow: 45, valHigh: 120, valuedBy: 'agent', valConf: 'low',
          valSource: 'Online comps', valDate: '2026-08-14', valNote: 'Etsy asking prices for related plates run about $35 to $60 a piece.',
          valNameAt: 'Green cabbage-ware crescent side plates', valAgentAt: T + 69000, valLookup: 'Portuguese cabbage ware crescent salad plate',
          valComps: [{ title: 'Bordallo Pinheiro luncheon plates, set of three', venue: 'Etsy', price: 180, url: 'https://www.etsy.com/listing/1', kind: 'asking', by: 'agent' }],
          valNotices: [{ kind: 'other', text: 'Check the mark on the underside under raking light.' }] }),
        line('gun', 2, { objectName: 'Remington 870 shotgun', category: 'Firearms', disposition: 'Hold', namedBy: 'desk', reviewed: true }),
        line('mir', 3, { objectName: 'Gilt wood mirror', category: 'Furniture', disposition: 'Auction', channel: 'Kodner Galleries', fmv: 600, valuedBy: 'desk', valSource: 'Dealer quote', namedBy: 'desk' }),
        line('rug', 4, { objectName: 'Tabriz rug', category: 'Rugs & Carpets', disposition: 'Undecided', flagDisputed: true, fmv: 2400, valuedBy: 'desk', valSource: 'Dealer quote', namedBy: 'desk' })];
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
      if (!(await p.evaluate((id) => !!document.querySelector('#inv-row-' + id + ' .inv-rec-facts'), id))) await press('button[onclick="_invToggleOpen(\'' + id + '\')"]', id + '\'s ▾');
      return p.evaluate((id) => !!document.querySelector('#inv-row-' + id + ' .inv-rec-facts'), id);
    };
    await toDesk();

    // ── A ─────────────────────────────────────────────────────────────────────────────────────
    await section('A. The plates: what it is worth first, one sentence of what the app filled in, nothing that does not apply, the folds shut', async () => {
      ok(await open('pl'), 'the plates\' record is open');
      const seen = await recSeen('pl');
      // innerText applies text-transform: the two headings are uppercase on screen.
      has(seen.toLowerCase(), 'what it’s worth · agent two', 'the figure first');
      has(seen, '$75', '…the figure');
      has(seen.toLowerCase(), 'to do', 'Agent Two\'s note under To do');
      ok(seen.indexOf('$75') < seen.indexOf('Kitchen · General/Household'), '…before the sentence of what the app filled in');
      has(seen, 'Check the mark on the underside', '…in view');
      has(seen, 'See the research (1 price)', 'the research, by its summary');
      lacks(seen, 'Bordallo Pinheiro luncheon plates', '⚠ …shut: the comparable is not on screen');
      has(seen, 'Kitchen · General/Household · condition as photographed', '⚠ the sentence of what the app filled in');
      has(seen, 'Valued as of Aug 14, 2026 · Online comps · trust property', '…and the value\'s date, its source and whose property it is');
      ['MAIV', '§732.402', 'NFA', 'Photo Link', 'Approved by', 'Sold for', 'Date it left', 'Asset Track', 'Flags & Track', 'Valuation Basis']
        .forEach((w) => lacks(seen, w, '⚠ not on the plates\' record: "' + w + '"'));
      eq(await foldOpen('pl', 'inv-rec-fix'), false, '✎ Correct what was filled in is shut');
      eq(await foldOpen('pl', 'inv-rec-odd'), false, 'Something unusual about this item? is shut');
      ok(!(await vis(rec('pl') + ' select[onchange*="\'category\'"]')), '⚠ the category box is not on screen until asked for');
      lacks(seen, 'Photograph', 'no second photograph link beside the search');
      eq(await overflow(), 0, 'no horizontal overflow at 1440');
    });

    // ── B ─────────────────────────────────────────────────────────────────────────────────────
    await section('B. ✎ Correct what was filled in: the boxes, a condition chosen says so at once, the fold stays open through a redraw', async () => {
      await press(rec('pl') + ' details.inv-rec-fix > summary', '✎ Correct what was filled in');
      eq(await foldOpen('pl', 'inv-rec-fix'), true, 'open');
      eq(await labelsIn('pl', 'inv-rec-fix'), ['Category', 'Room', 'Condition', 'Valued as of', 'Where the value came from', 'What the value rests on'], 'its boxes, in plain words');
      const cond = rec('pl') + ' details.inv-rec-fix select[onchange*="\'condition\'"]';
      ok(await vis(cond), 'the Condition box on screen');
      await p.selectOption(cond, 'Good'); await p.waitForTimeout(700);
      has(await recSeen('pl'), 'Kitchen · General/Household · Good condition', '⚠ the sentence says so at once');
      eq(await p.evaluate((J) => (_photoRefs[J].find((r) => r.stableId === 'pl') || {}).condition, J), 'Good', 'and the line records it');
      const cat = rec('pl') + ' details.inv-rec-fix select[onchange*="\'category\'"]';
      await p.selectOption(cat, 'Collectibles'); await p.waitForTimeout(900);
      eq(await foldOpen('pl', 'inv-rec-fix'), true, '⚠ the fold stays open through the row\'s redraw');
      has(await recSeen('pl'), 'Kitchen · Collectibles · Good condition', 'and the sentence follows the category');
      await press(rec('pl') + ' details.inv-rec-fix > summary', '✎ Correct … shut again');
      eq(await foldOpen('pl', 'inv-rec-fix'), false, 'shut');
    });

    // ── C ─────────────────────────────────────────────────────────────────────────────────────
    await section('C. Something unusual about this item?: Send to an appraiser ticked; open by itself where something is set', async () => {
      await press(rec('pl') + ' details.inv-rec-odd > summary', 'Something unusual about this item?');
      eq(await labelsIn('pl', 'inv-rec-odd'), ['Serial number', 'Send to an appraiser', 'Appraiser or report', 'Left to someone by name in the trust', 'The family disagrees about it', 'Belongs to'],
        'the exceptions, in plain words');
      const ap = rec('pl') + ' details.inv-rec-odd input[type="checkbox"][onchange*="\'needsAppr\'"]';
      await press(ap, 'Send to an appraiser');
      eq(await p.evaluate((J) => !!(_photoRefs[J].find((r) => r.stableId === 'pl') || {}).needsAppr, J), true, 'recorded');
      await p.evaluate(() => renderInventoryTab()); await p.waitForTimeout(700);
      eq(await foldOpen('pl', 'inv-rec-odd'), true, '⚠ open after a full redraw too');
      ok(await open('rug'), 'the rug\'s record is open');
      eq(await foldOpen('rug', 'inv-rec-odd'), true, '⚠ the rug the family disagrees about: open by itself');
      ok(await p.locator(rec('rug') + ' details.inv-rec-odd input[onchange*="\'flagDisputed\'"]').isChecked(), 'its dispute ticked, in view');
    });

    // ── D ─────────────────────────────────────────────────────────────────────────────────────
    await section('D. The shotgun\'s serial and NFA in view; the mirror\'s leaving, only on a line that is leaving', async () => {
      ok(await open('gun'), 'the shotgun\'s record is open');
      eq(await p.evaluate(() => [...document.querySelectorAll('#inv-row-gun .inv-rec-facts > div > div > .inv-rec-f > div:first-child')].map((d) => d.textContent.trim())),
        ['Serial number', 'NFA item (federally registered)'], '⚠ in view, outside both folds');
      ok(await vis(rec('gun') + ' .inv-rec-facts input[onchange*="\'serial\'"]'), 'the serial box on screen');
      await p.fill(rec('gun') + ' .inv-rec-facts input[onchange*="\'serial\'"]', 'RS12345'); await p.press(rec('gun') + ' .inv-rec-facts input[onchange*="\'serial\'"]', 'Tab'); await p.waitForTimeout(600);
      eq(await p.evaluate((J) => (_photoRefs[J].find((r) => r.stableId === 'gun') || {}).serial, J), 'RS12345', 'the serial recorded');
      ok(await open('mir'), 'the mirror\'s record is open');
      eq(await labelsIn('mir', 'inv-rec-go'), ['Approved by', 'Sold for', 'Fees', 'Net', 'Date it left', 'Receipt'], '⚠ leaving: its approval, the sale\'s figures, the day and the receipt');
      has(await recSeen('mir'), 'No written approval recorded', 'the approval line, in view');
      const gross = rec('mir') + ' .inv-rec-go input[onchange*="\'gross\'"]';
      await p.fill(gross, '550'); await p.press(gross, 'Tab'); await p.waitForTimeout(600);
      eq(await p.evaluate((J) => (_photoRefs[J].find((r) => r.stableId === 'mir') || {}).gross, J), 550, 'Sold for recorded');
      eq(await labelsIn('pl', 'inv-rec-go'), [], 'the plates, Undecided: no Leaving the property');
      await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(700);
      eq(await overflow(), 0, 'no horizontal overflow at 390 with four records open');
    });

    eq(errs, [], 'zero page errors');
    console.log('\n' + pass + ' passed, ' + fail + ' failed');
    await b.close();
    process.exit(fail ? 1 : 0);
  } catch (e) {
    console.log('step 133 threw: ' + (e && e.stack || e));
    if (b) await b.close().catch(() => {});
    process.exit(1);
  }
})();
