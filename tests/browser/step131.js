// Step 131 (numbered 124 when written, 126 on its branch and 128 on the desk audit's branch; 131 on merging main, whose step 128 landed first) — P9 of the desk audit (2026-10-28): every press lands, and empty photographs leave the list.
//
// EST-09, LIV-08, DOC-19, INV-08, ROW-17, AGT-01: photographs Agent One found nothing in sat in Unnamed shots, in Select all and on
// every paper as blank numbered items, and came off one ▾ at a time. AGT-02: a frame too dark to read read *nothing to list* and its
// note left with the line. ROW-01, NEW-01: Mark reviewed wrote a stuck tick onto blank lines and took a too-dark note off the list.
// ROW-08: under Not reviewed each tick slid the next line under the finger. ROW-05: the name and Who takes it had two boxes each.
// LIV-02: the selection survived bulk actions and filters, and Remove lines took lines nobody could see. INV-07, NEW-07: the
// package's question counted named lines only. ROW-03, ROW-04, SYN-12: the search kept one letter, the first figure typed over
// Agent Two's dropped the focus, and a press straight after an edit did nothing.
//
// Drives the REAL page with an active trust estate on the values tier: a harbour painting valued by Agent Two, a side table to
// Donate, candlesticks to Keep, three Move lines, six lines not yet decided, two photographs Agent One found nothing in (#13 in
// the Dining Room, #14 in the Kitchen) and one too dark to read (#15, its note *Too dark to tell what is on the shelf*). Job
// Admin & Inv through its own nav button, the client through its picker:
//   A. The chips: Unnamed shots 1 (only #15), Nothing to list 2; the work bar's *Remove the 2 with nothing to list*; #15's row
//      reads *could not be read: Too dark …* with + Close-up, and never *nothing to list*.
//   B. Under Not reviewed, two presses on the first row's Reviewed box 150 ms apart, then two on the next row's 600 ms apart:
//      exactly two lines ticked, each row held in place, greyed, its box shut, with Undo; Undo gives the line back unticked.
//   C. Select all on Not yet decided picks the six lines, never #13, #14 or #15 (no line with no name: P9's review); #15 ticked by
//      its own box; Mark reviewed (after the sheet's read) ticks the six, leaves #15 alone and names it; the too-dark note is still
//      on the list above the rows; the selection is cleared and the bar says so until OK.
//   D. The search: *harbor* typed at 400 ms and at 80 ms a key keeps every letter, the box keeps the focus, the list filters.
//   E. A Total typed over Agent Two's figure, then Tab: the focus is on Where it goes and the figure is the desk's; an Each
//      typed on another agent figure, then Where it goes clicked: the focus is on that select.
//   F. A Total typed and No value yet pressed straight away: the first press filters. A name typed and ✓ I've read the list
//      pressed straight away: recorded on the first press. A Total typed and the Estate Inventory PDF pressed straight away:
//      the viewer opens on the first press.
//   G. One box per value: the Donate line's record has no name box and no Who takes it box; the Keep line's keeps Who takes it.
//   H. A picked group folded, a line on screen picked, Remove lines: asked first, the folded lines named and left, only the line
//      on screen removed. A pick and then a chip pressed: the selection is gone.
//   I. Remove the 2 with nothing to list: the sheet read first, one question naming #13 (Dining Room) and #14 (Kitchen), both off
//      as tombstones with their photographs kept; the chip and the press gone; the Estate Inventory PDF prints no blank row;
//      Removed items gives one back.
//   J. The package's question counts the desk's gaps: the photograph not yet named, the lines with no disposition and no value.
//   K. (P9's review) Presses at a person's speed (down, 100 ms, up) straight after an edit that adds or takes away the control
//      beside the one pressed, or with a redraw owed: the last missing figure typed while *Value 1 line* shows, then the Estate
//      Inventory PDF: the PDF, never the CSV; a name typed that quiets #o1's note, then Show the item on #o2's: #o2; the search
//      typed with a redraw owed, then Not reviewed: it filters; a Total typed with a redraw owed, then No value yet: it filters.
//      And the gun cabinet's blank line from + Another item in this photo, answered with the Firearm note again, reads nothing to
//      list with no + Close-up. And a tap on a touch screen straight after a figure that takes Value 1 line off the bar: the PDF.
//   At 1440 and 390 px no horizontal overflow; zero page errors throughout.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step131.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
const SYNC = 'https://sync.example.test/exec';
const J = 12401;
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');
const DARK = 'Too dark to tell what is on the shelf: photograph it again';

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
    const net = { reads: 0, value: 0 };
    let sheet = {};
    await ctx.route(SYNC + '**', async (r) => {
      const req = r.request();
      const json = (o) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
      if (req.method() === 'POST') {
        let body = {}; try { body = JSON.parse(req.postData() || '{}'); } catch (e) {}
        if (body.action === 'agentValue') { net.value++; return json({ ok: true, success: true, results: {}, failed: {}, remaining: 0 }); }
        return json({ ok: true });
      }
      if (/action=loadMedia/.test(req.url())) { net.reads++; return json({ ok: true, media: sheet }); }
      return json({ ok: true });
    });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    const said = [];
    let answer = true;   // what the next dialog answers: OK, or Cancel
    p.on('dialog', async (d) => { said.push(d.message()); if (answer || d.type() === 'alert') await d.accept(); else await d.dismiss(); });
    const section = async (name, body) => {
      console.log('\n## ' + name);
      try { await body(); } catch (e) { fail++; console.log('  ✗ ' + name + ' threw: ' + String(e && e.message || e).split('\n')[0]); }
    };
    const vis = (sel) => p.locator(sel).first().isVisible().catch(() => false);
    const press = async (sel, what) => {
      const n = await p.locator(sel).count();
      const v = n === 1 && await vis(sel);
      ok(v, (what || sel) + ' — one control, on screen (' + n + ')');
      if (v) { await p.click(sel, { timeout: 5000 }).catch((e) => ok(false, (what || sel) + ' — ' + e.message.split('\n')[0])); await p.waitForTimeout(900); }
      return v;
    };
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const txt = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }, sel);
    const line = (sid) => p.evaluate(([j, sid]) => { const r = (_photoRefs[j] || []).find((x) => x.stableId === sid); return r ? JSON.parse(JSON.stringify(r)) : null; }, [J, sid]);
    const live = () => p.evaluate((j) => (_photoRefs[j] || []).filter((r) => r.label === 'inventory' && !r.deletedAt).map((r) => r.stableId).sort(), J);
    const picks = () => p.evaluate(() => Object.keys(_invPick).sort());
    const chips = () => p.evaluate(() => [...document.querySelectorAll('#inv-flagstrip button')].map((x) => x.textContent.replace(/\s+/g, ' ').trim()));
    const active = () => p.evaluate(() => { const a = document.activeElement; return a ? (a.id || (a.tagName + (a.className ? '.' + a.className : ''))) : ''; });
    const viewerOpen = () => p.evaluate(() => { const o = document.getElementById('doc-viewer-modal'); return !!o && o.style.display === 'flex'; });
    const closeViewer = async () => { if (await viewerOpen()) await press('#doc-viewer-modal button[onclick="closeDocViewer()"]', 'Close the viewer'); };
    const eir = async () => {
      await press('#inv-workbar button[onclick="printEstateInventoryReport(' + J + ')"]', 'Estate Inventory PDF, on the work bar');
      ok(await viewerOpen(), 'the Estate Inventory Report opens in the viewer');
      const t = await txt('#doc-viewer-body');
      await closeViewer();
      return t;
    };

    await p.goto(APP); await p.waitForTimeout(1600);
    sheet = await p.evaluate(([J, SYNC, DARK]) => {
      SHEETS_SYNC_URL = SYNC;
      try { localStorage.setItem('hav_device_user', 'Ashley Jerome'); } catch (e) {}
      const T = Date.now() - 2 * 86400000;
      jobs.unshift({ id: J, hvlId: 'HVL-2610-P9', name: 'Ruth Calder', svc: 'cleanout', matterType: 'trust', addr: '40 Via Mizner', city: 'Palm Beach', zip: '33480',
        executor: 'Daniel Calder', executorRole: 'Successor Trustee', executorEmail: 'dan@example.com', probateAttyEmail: 'counsel@example.com', deathDate: '2026-08-14',
        executorAuth: 'received', trustName: 'Calder Family Trust', docTier: 'values', gate706: 'no', status: 'active', won: true, wonAt: '2026-10-01', approved: true,
        tc: 'Ashley Jerome', created: '2026-09-28', start: '2026-10-12', activatedOn: '2026-10-10', agrApproved: true, agrSent: true, agrSigned: true, sqft: 3400,
        driveFolder: 'https://drive.google.com/drive/folders/R' + J, driveSubfolders: { 'Estate Inventory': 'INV_P9', 'As-Found Record': 'AF_P9' }, at: {},
        payments: [{ uid: 'd' + J, stage: 'deposit', amount: 9000, receivedOn: '2026-10-08', method: 'wire', clearedOn: '2026-10-08' }] });
      estimateStore[J] = { approved: true, submitted: true, approvedBy: 'Anthony Graziano', savedAt: T,
        estimate: { jobId: J, svc: 'cleanout', havellinTotal: 18000, fixedPrice: true, fixedAmount: 18000, fixedLines: true, totTC: 50, totPS: 70, days: 4,
          vendors: [], prepItems: [], rooms: [{ idx: 2, name: 'Kitchen', st: 'in', vol: 3, cplx: 3 }, { idx: 3, name: 'Living Room', st: 'in', vol: 3, cplx: 3 },
            { idx: 4, name: 'Dining Room', st: 'in', vol: 3, cplx: 3 }] } };
      let seq = 0;
      const shot = (sid, room, o) => Object.assign({ stableId: sid, itemNo: ++seq, label: 'inventory', collId: null, roomIdx: room, seq: seq, status: 'uploaded', ts: T + seq * 1000,
        filename: 'HVL-2610-P9_F' + sid + '.jpg', driveFileId: 'F' + sid, driveFileUrl: 'https://drive.google.com/file/d/F' + sid + '/view', category: 'General/Household',
        qty: 1, updatedAt: T + seq * 1000 }, o);
      const desk = (name, disp, fmv, o) => Object.assign({ objectName: name, namedBy: 'desk', disposition: disp, fmv: fmv, valuedBy: 'desk', valSource: 'Estimate',
        valDate: '2026-08-14', condition: 'Good' }, o || {});
      _photoRefs[J] = [
        shot('a1', 3, { objectName: 'Oil painting, harbor scene, gilt frame', agentName: 'Oil painting, harbor scene, gilt frame', namedBy: 'agent', agentConf: 'medium',
          agentAt: T, category: 'Art & Décor', disposition: 'Auction', channel: 'Kodner Galleries', fmv: 350, valLow: 250, valHigh: 450, valConf: 'medium',
          valuedBy: 'agent', valSource: 'General estimate', valNote: 'A decorative harbour scene in oils.', valAgentAt: T, valNameAt: 'Oil painting, harbor scene, gilt frame',
          valDate: '2026-08-14', condition: 'Good' }),
        shot('a2', 3, desk('Mahogany drop-leaf side table', 'Donate', 400, { channel: 'Habitat ReStore', category: 'Furniture' })),
        shot('a3', 3, desk('Brass candlesticks, pair', 'Keep', 80)),
        shot('m4', 3, desk('Tufted linen three-seat sofa', 'Move', 900, { category: 'Furniture' })),
        shot('m5', 3, desk('Walnut bookcase', 'Move', 300, { category: 'Furniture' })),
        shot('m6', 3, desk('Brass floor lamp', 'Move', 120)),
        shot('u7', 2, desk('Blue glass vase', '', 60)),
        shot('u8', 2, desk('Set of six ladder-back dining chairs', '', 450, { category: 'Furniture' })),
        shot('u9', 2, desk('Wool area rug, 5 by 8', '', 200)),
        shot('u10', 2, desk('Silver-plated serving tray', '', 40)),
        shot('u11', 2, desk('Ceramic table lamp', '', 35)),
        shot('u12', 2, desk('Framed botanical print', '', 25, { category: 'Art & Décor' })),
        shot('n13', 4, { objectName: '', agentAt: T, agentConf: 'none' }),
        shot('n14', 2, { objectName: '', agentAt: T, agentConf: 'none' }),
        shot('d15', 3, { objectName: '', agentAt: T, agentConf: 'unread', agentNotices: [{ kind: 'other', text: DARK }] }),
        shot('a16', 3, { objectName: 'Gilt mirror, carved frame', agentName: 'Gilt mirror, carved frame', namedBy: 'agent', agentConf: 'medium', agentAt: T,
          category: 'Art & Décor', disposition: 'Auction', channel: 'Kodner Galleries', fmv: 220, valLow: 150, valHigh: 300, valConf: 'medium', valuedBy: 'agent',
          valSource: 'General estimate', valNote: 'A carved gilt mirror.', valAgentAt: T, valNameAt: 'Gilt mirror, carved frame', valDate: '2026-08-14', condition: 'Good' }),
        // A line that stands as the agents left it through the whole step, so ✓ I've read the list is offered (Q107).
        shot('a17', 3, { objectName: 'Walnut side chair, turned legs', agentName: 'Walnut side chair, turned legs', namedBy: 'agent', agentConf: 'medium', agentAt: T,
          category: 'Furniture', disposition: 'Auction', channel: 'Kodner Galleries', fmv: 90, valLow: 60, valHigh: 120, valConf: 'medium', valuedBy: 'agent',
          valSource: 'General estimate', valNote: 'A turned-leg walnut side chair.', valAgentAt: T, valNameAt: 'Walnut side chair, turned legs', valDate: '2026-08-14', condition: 'Good' })];
      _invCloudSeen[J] = true;
      savePhotoRefs(J); saveJobs(); localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore));
      const out = {}; out[J] = { items: JSON.parse(localStorage.getItem('hav_media_' + J) || '[]') };
      return out;
    }, [J, SYNC, DARK]);

    const toDesk = async () => {
      await p.click('.nb[onclick*="\'inventory\'"]'); await p.waitForTimeout(800);
      const cur = await p.evaluate(() => (document.getElementById('inv-job') || {}).value);
      if (String(cur) !== String(J)) { await p.selectOption('#inv-job', String(J)); await p.waitForTimeout(1300); }
      if (await p.locator('#panel-inventory button[onclick="setInvWhen(\'all\')"]').count()) { await p.click('#panel-inventory button[onclick="setInvWhen(\'all\')"]'); await p.waitForTimeout(600); }
    };

    // ── A ─────────────────────────────────────────────────────────────────────────────────────
    await section('A. a pile of its own for the photographs with nothing to list, and a too-dark frame says why', async () => {
      await toDesk();
      const c = await chips();
      ok(c.indexOf('Unnamed shots 1') >= 0, '⚠⚠ Unnamed shots counts only the photograph still waiting for a name: ' + JSON.stringify(c));
      ok(c.indexOf('Nothing to list 2') >= 0, '⚠⚠ Nothing to list 2, its own chip');
      has(await txt('#inv-workbar'), 'Agent One found nothing to list in 2 photographs', 'the work bar says how many');
      ok(await vis('#inv-workbar button[onclick="invRemoveNothingToList(' + J + ')"]'), '⚠⚠ and offers the one press');
      has(await txt('#inv-workbar button[onclick="invRemoveNothingToList(' + J + ')"]'), 'Remove the 2 with nothing to list', 'in those words');
      const d = await txt('#inv-row-d15 .inv-row-sub');
      has(d, 'could not be read: ' + DARK, '⚠⚠ the too-dark frame says why it was not named');
      lacks(d, 'nothing to list', '⚠ and never "nothing to list"');
      ok(await vis('#inv-row-d15 .inv-row-sub label.inv-cu-add'), '⚠ + Close-up on its row');
      has(await txt('#inv-row-n13 .inv-row-sub'), 'nothing to list', 'a photograph with nothing in it says so');
      await press('#inv-flagstrip button[onclick="setInvFlag(\'nothing\')"]', 'the Nothing to list chip');
      eq((await p.evaluate(() => [...document.querySelectorAll('#panel-inventory [id^="inv-row-"]')].map((x) => x.id))).sort(), ['inv-row-n13', 'inv-row-n14'],
        'the chip shows the two photographs and nothing else');
      await press('#inv-flagstrip button[onclick="setInvFlag(\'nothing\')"]', 'the chip again, off');
      eq(await overflow(), 0, 'no horizontal overflow at 1440');
    });

    // ── B ─────────────────────────────────────────────────────────────────────────────────────
    await section('B. under Not reviewed a ticked row stays where it was: a double tap ticks one line', async () => {
      await press('#inv-flagstrip button[onclick="setInvFlag(\'unreviewed\')"]', 'the Not reviewed chip');
      const first = await p.evaluate(() => { const r = document.querySelector('#panel-inventory [id^="inv-rev-"] input'); return r ? r.closest('label').id.replace('inv-rev-', '') : ''; });
      ok(!!first, 'fixture: a row under Not reviewed');
      const at = async (sid) => { const bx = await p.locator('#inv-rev-' + sid + ' input').boundingBox(); return { x: bx.x + bx.width / 2, y: bx.y + bx.height / 2 }; };
      const tickedNow = () => p.evaluate((j) => (_photoRefs[j] || []).filter((r) => r.reviewed && !r.deletedAt).map((r) => r.stableId).sort(), J);
      const t0 = await tickedNow();
      let pt = await at(first);
      await p.mouse.click(pt.x, pt.y); await p.waitForTimeout(150); await p.mouse.click(pt.x, pt.y); await p.waitForTimeout(700);
      const t1 = (await tickedNow()).filter((x) => t0.indexOf(x) < 0);
      eq(t1, [first], '⚠⚠ two presses 150 ms apart tick one line, the one under the finger');
      ok(await p.evaluate((sid) => { const r = document.getElementById('inv-row-' + sid); return !!r && /inv-row-held/.test(r.className); }, first), '⚠⚠ its row stays in place, greyed');
      ok(await p.evaluate((sid) => { const i = document.querySelector('#inv-rev-' + sid + ' input'); return !!i && i.disabled && i.checked; }, first), 'its box ticked and shut to a second press');
      has(await txt('#inv-row-' + first + ' .inv-held-line'), 'Reviewed by Ashley Jerome', 'and it says what was done, with Undo');
      // The next row under Not reviewed, pressed twice 600 ms apart.
      const second = await p.evaluate((f) => { const all = [...document.querySelectorAll('#panel-inventory [id^="inv-rev-"]')].map((x) => x.id.replace('inv-rev-', ''));
        return all.filter((x) => x !== f)[0] || ''; }, first);
      pt = await at(second);
      await p.mouse.click(pt.x, pt.y); await p.waitForTimeout(600); await p.mouse.click(pt.x, pt.y); await p.waitForTimeout(700);
      eq((await tickedNow()).filter((x) => t0.indexOf(x) < 0), [first, second].sort(), '⚠⚠ two presses 600 ms apart tick one more line, never a third');
      await press('#inv-row-' + second + ' .inv-held-undo', 'Undo on the second');
      eq((await line(second)).reviewed, false, 'Undo takes the tick off');
      ok(await p.evaluate((sid) => { const r = document.getElementById('inv-row-' + sid); return !!r && !/inv-row-held/.test(r.className); }, second), 'and the row is an ordinary row under the chip again');
      await press('#inv-flagstrip button[onclick="setInvFlag(\'unreviewed\')"]', 'the chip again, off');
      eq(await p.evaluate(() => Object.keys(_invHeld).length), 0, 'the view changed: nothing held');
    });

    // ── C ─────────────────────────────────────────────────────────────────────────────────────
    await section('C. Select all leaves the empty photographs out; Mark reviewed leaves a line with no name alone, its note on the list', async () => {
      await press('#inv-grph- button[onclick*="_invPickGroup"]', 'Select all on Not yet decided');
      const pk = await picks();
      ok(pk.indexOf('n13') < 0 && pk.indexOf('n14') < 0, '⚠⚠ Select all never picks a photograph Agent One found nothing in');
      ok(pk.indexOf('d15') < 0, '⚠⚠ nor the too-dark frame, nor any line with no name (P9\'s review: it reached the trustee\'s request)');
      ok(pk.indexOf('u7') >= 0 && pk.indexOf('u12') >= 0, 'it picks the undecided lines');
      await p.click('#inv-row-d15 input[onchange*="_invTogglePick"]'); await p.waitForTimeout(700);
      ok((await picks()).indexOf('d15') >= 0, 'fixture: #15 picked by its own box');
      const r0 = net.reads, n0 = said.length;
      await press('#inv-bulk-' + J + ' button:has-text("Mark reviewed")', 'Mark reviewed');
      ok(net.reads > r0, 'the sheet is read first');
      eq((await line('d15')).reviewed, undefined, '⚠⚠ the line with no name is left alone: no stuck tick');
      eq((await line('u9')).reviewed, true, 'the named lines are ticked');
      has(await txt('#inv-agent-notices'), DARK, '⚠⚠ the too-dark note is still on the list above the rows');
      eq(await picks(), [], '⚠⚠ the selection is cleared');
      const bar = await txt('#inv-bulk-' + J);
      has(bar, 'has no name, so it was left alone: #15', 'the bar names the line left alone');
      has(bar, 'The selection is cleared.', 'and says the selection is cleared');
      await press('#inv-bulk-' + J + ' button:has-text("OK")', 'OK on the bar');
      eq(await p.locator('#inv-bulk-' + J).count(), 0, 'and the bar goes');
      ok(said.length === n0, 'no question was asked (nothing off screen)');
    });

    // ── D ─────────────────────────────────────────────────────────────────────────────────────
    await section('D. the search keeps every letter and the focus', async () => {
      for (const delay of [400, 80]) {
        await p.click('#inv-q'); await p.fill('#inv-q', ''); await p.waitForTimeout(400);
        await p.click('#inv-q');
        await p.keyboard.type('harbor', { delay: delay });
        await p.waitForTimeout(700);
        eq(await p.evaluate(() => [document.getElementById('inv-q').value, _invFilter.q]), ['harbor', 'harbor'], '⚠⚠ typed at ' + delay + ' ms a key, the box and the filter hold every letter');
        eq(await active(), 'inv-q', '⚠⚠ and the box keeps the focus');
        eq(await p.evaluate(() => [...document.querySelectorAll('#panel-inventory [id^="inv-row-"]')].map((x) => x.id)), ['inv-row-a1'], 'the list shows the painting');
      }
      await p.keyboard.type(' sc', { delay: 300 }); await p.waitForTimeout(700);
      eq(await p.evaluate(() => document.getElementById('inv-q').value), 'harbor sc', '⚠ a space typed between words stays in the box');
      await press('#panel-inventory button[onclick="invClearFilters()"]', 'Clear filters');
    });

    // ── E ─────────────────────────────────────────────────────────────────────────────────────
    await section('E. the first figure typed over Agent Two\'s keeps the focus', async () => {
      await p.click('#inv-fmv-a1'); await p.fill('#inv-fmv-a1', '500');
      await p.keyboard.press('Tab'); await p.waitForTimeout(700);
      eq((await line('a1')).valuedBy, 'desk', 'fixture: the figure is the desk\'s now');
      ok(await p.evaluate(() => { const a = document.activeElement; return !!a && !!a.closest && !!a.closest('#inv-row-a1 .inv-c-disp'); }), '⚠⚠ Tab lands on Where it goes, in the same row (ROW-04)');
      await p.click('#inv-each-a16'); await p.fill('#inv-each-a16', '180');
      await p.click('#inv-row-a16 .inv-c-disp select'); await p.waitForTimeout(700);
      eq((await line('a16')).valuedBy, 'desk', 'fixture: the Each typed is the desk\'s');
      ok(await p.evaluate(() => { const a = document.activeElement; return !!a && !!a.closest && !!a.closest('#inv-row-a16 .inv-c-disp'); }), '⚠⚠ the select clicked next has the focus');
      await p.keyboard.press('Escape');
    });

    // ── F ─────────────────────────────────────────────────────────────────────────────────────
    await section('F. a press straight after an edit lands', async () => {
      await p.click('#inv-fmv-u7'); await p.fill('#inv-fmv-u7', '75');
      await p.click('#inv-flagstrip button[onclick="setInvFlag(\'noval\')"]'); await p.waitForTimeout(800);
      eq(await p.evaluate(() => _invFilter.flag), 'noval', '⚠⚠ a Total typed, then No value yet: the first press filters (SYN-12)');
      eq((await line('u7')).fmv, 75, 'fixture: the Total was written');
      await press('#panel-inventory button[onclick="invClearFilters()"]', 'Clear filters');
      // The list stands as the agents left it on the mirror? Its figure is the desk's now (E). Give the read line a reason to show.
      const readBtn = '#inv-workbar button[onclick="invMarkListRead(' + J + ')"]';
      const offered = await vis(readBtn);
      ok(offered, 'fixture: ✓ I\'ve read the list is offered (a line stands as the agents left it)');
      if (offered) {
        await p.fill('#inv-row-a2 .inv-name textarea', 'Mahogany drop-leaf side table, Sheraton style');
        await p.click(readBtn); await p.waitForTimeout(800);
        ok(await p.evaluate((j) => !!(jobs.find((x) => x.id === j).invRead || {}).at, J), '⚠⚠ a name typed, then ✓ I\'ve read the list: recorded on the first press');
        eq((await line('a2')).objectName, 'Mahogany drop-leaf side table, Sheraton style', 'fixture: the name was written');
      }
      await p.click('#inv-fmv-u8'); await p.fill('#inv-fmv-u8', '475');
      await p.click('#inv-workbar button[onclick="printEstateInventoryReport(' + J + ')"]'); await p.waitForTimeout(1200);
      ok(await viewerOpen(), '⚠⚠ a Total typed, then the Estate Inventory PDF: the viewer opens on the first press');
      await closeViewer();
    });

    // ── G ─────────────────────────────────────────────────────────────────────────────────────
    await section('G. one box per value in the line\'s record', async () => {
      await press('#inv-row-a2 button.inv-c-open', 'the side table\'s ▾');
      const boxes = await p.evaluate(() => { const r = document.getElementById('inv-row-a2');
        return { names: r.querySelectorAll('[onchange*="\'objectName\'"]').length,
          who: r.querySelectorAll('[onchange*="\'channel\'"]').length, heads: [...r.querySelectorAll('div')].filter((d) => /^(Object Name|Item|Channel \/ Recipient)$/.test(d.textContent.trim())).map((d) => d.textContent.trim()) }; });
      eq(boxes.names, 1, '⚠⚠ one name box, the row\'s (ROW-05)');
      eq(boxes.who, 1, '⚠⚠ one Who takes it box, the row\'s');
      await press('#inv-row-a2 button.inv-c-open', 'shut it');
      await press('#inv-row-a3 button.inv-c-open', 'the candlesticks\' ▾ (Keep: the row has no Who takes it box)');
      eq(await p.evaluate(() => document.getElementById('inv-row-a3').querySelectorAll('[onchange*="\'channel\'"]').length), 1, 'the Keep line\'s record keeps its Who takes it box');
      await press('#inv-row-a3 button.inv-c-open', 'shut it');
    });

    // ── H ─────────────────────────────────────────────────────────────────────────────────────
    await section('H. a press over picks off screen asks first; a filter changed clears the selection', async () => {
      await press('#inv-grph-Move button[onclick*="_invPickGroup"]', 'Select all on Move');
      eq(await picks(), ['m4', 'm5', 'm6'], 'fixture: the three Move lines picked');
      await press('#inv-grph-Move button[onclick*="_invToggleFold"]', 'fold Move');
      await p.click('#inv-row-a3 input[onchange*="_invTogglePick"]'); await p.waitForTimeout(700);
      eq(await picks(), ['a3', 'm4', 'm5', 'm6'], 'fixture: and one line on screen');
      const n0 = said.length;
      await press('#inv-bulk-' + J + ' button:has-text("Remove lines")', 'Remove lines');
      const q = said.slice(n0).find((m) => /not on screen/.test(m)) || '';
      has(q, '3 of the 4 selected lines are not on screen', '⚠⚠ asked first, counting what is off screen');
      has(q, '#4 Tufted linen three-seat sofa', 'and naming it');
      const lv = await live();
      ok(lv.indexOf('m4') >= 0 && lv.indexOf('m5') >= 0 && lv.indexOf('m6') >= 0, '⚠⚠ the folded Move lines are left');
      ok(lv.indexOf('a3') < 0, 'only the line on screen is removed');
      await press('#inv-grph-Move button[onclick*="_invToggleFold"]', 'unfold Move');
      await press('#inv-grph-Move button[onclick*="_invPickGroup"]', 'Select all on Move again');
      await press('#inv-flagstrip button[onclick="setInvFlag(\'undecided\')"]', 'a chip');
      eq(await picks(), [], '⚠⚠ a filter changed: the selection is gone (LIV-02)');
      eq(await p.locator('#inv-bulk-' + J).count(), 0, 'and the bar with it');
      await press('#inv-flagstrip button[onclick="setInvFlag(\'undecided\')"]', 'the chip again, off');
      await p.evaluate(([j]) => { restoreInventoryItem(j, 'a3'); }, [J]); await p.waitForTimeout(500);
    });

    // ── I ─────────────────────────────────────────────────────────────────────────────────────
    await section('I. Remove the 2 with nothing to list: one question, the photographs kept, every paper clean', async () => {
      const before = await eir();
      has(before, 'IN PROGRESS', 'fixture: the report is IN PROGRESS');
      const r0 = net.reads, n0 = said.length;
      await press('#inv-workbar button[onclick="invRemoveNothingToList(' + J + ')"]', 'Remove the 2 with nothing to list');
      ok(net.reads > r0, '⚠ the sheet is read first (P6)');
      const q = said.slice(n0).find((m) => /found nothing to list in/.test(m)) || '';
      has(q, 'Remove the 2 lines Agent One found nothing to list in?', '⚠⚠ one question');
      has(q, '#13 (Dining Room)', 'naming each by number and room');
      has(q, '#14 (Kitchen)', 'both');
      has(q, 'No photograph is deleted', 'and saying the photographs stay');
      const n13 = await line('n13'), n14 = await line('n14');
      ok(!!n13.deletedAt && !!n14.deletedAt && !!n13.deletedBy, '⚠⚠ both off, as tombstones with who');
      eq([n13.driveFileId, n14.driveFileId], ['Fn13', 'Fn14'], 'their photographs untouched');
      eq((await line('d15')).deletedAt, undefined, '⚠⚠ the too-dark frame is not swept away');
      ok((await chips()).every((c) => !/^Nothing to list/.test(c)), 'the chip goes with the pile');
      eq(await p.locator('#inv-workbar button[onclick="invRemoveNothingToList(' + J + ')"]').count(), 0, 'and the press');
      const after = await eir();
      ok(!/\b13\b[^0-9$]{0,6}—/.test(after) && after.indexOf('Dining Room 1 as photographed — not stated') < 0, '⚠⚠ the report prints no blank row for them');
      const restore = '#panel-inventory button[onclick="restoreInventoryItem(' + J + ',\'n13\')"]';
      if (!(await vis(restore))) { await p.evaluate(([j]) => { deskFoldOpen(j, 'history'); renderInventoryTab(); }, [J]); await p.waitForTimeout(400); }
      await press(restore, 'Restore on #13, under Removed items');
      ok(!(await line('n13')).deletedAt, 'Removed items gives it back');
    });

    // ── J ─────────────────────────────────────────────────────────────────────────────────────
    await section('J. the package\'s question counts what the desk counts', async () => {
      const g = await p.evaluate((j) => probatePackageGaps(j), J);
      ok(g.some((x) => /^1 photograph not yet named$/.test(x)), '⚠⚠ the photograph not yet named: ' + JSON.stringify(g));
      ok(g.some((x) => /photograph Agent One found nothing in, not yet taken off the list/.test(x)), '⚠ the one given back, nothing to list');
      ok(g.some((x) => /lines? with no disposition/.test(x)), 'the lines with no disposition');
    });

    // ── K ─────────────────────────────────────────────────────────────────────────────────────
    // A press at a person's speed: the pointer down, 100 ms, then up, so whatever the edit repaints lands between the two.
    const humanPress = async (sel) => {
      // To the middle of the screen, clear of the sticky header (scrollIntoViewIfNeeded left a chip under it).
      await p.evaluate((q) => { const el = document.querySelector(q); if (el) el.scrollIntoView({ block: 'center' }); }, sel); await p.waitForTimeout(250);
      const bx = await p.locator(sel).first().boundingBox();
      const x = bx.x + bx.width / 2, y = bx.y + bx.height / 2;
      ok(await p.evaluate(([q, x, y]) => { const el = document.querySelector(q), at = document.elementFromPoint(x, y); return !!el && !!at && (at === el || el.contains(at)); }, [sel, x, y]),
        'fixture: the pointer is over ' + sel + ' before the press');
      await p.mouse.move(x, y); await p.mouse.down(); await p.waitForTimeout(100); await p.mouse.up(); await p.waitForTimeout(900);
    };
    await section('K. (P9\'s review) a press lands on the control pressed, whatever the edit adds or takes away beside it', async () => {
      await p.evaluate((j) => {
        const T = Date.now() - 86400000;
        const base = (sid, o) => Object.assign({ stableId: sid, label: 'inventory', collId: null, roomIdx: 3, status: 'uploaded', ts: T, updatedAt: T,
          filename: 'HVL-2610-P9_F' + sid + '.jpg', driveFileId: 'F' + sid, driveFileUrl: 'https://drive.google.com/file/d/F' + sid + '/view', category: 'General/Household', qty: 1 }, o);
        _photoRefs[j].push(base('v18', { objectName: 'Pine blanket chest', namedBy: 'desk', disposition: 'Auction', channel: 'Kodner Galleries', condition: 'Good', category: 'Furniture' }));
        ['o1', 'o2', 'o3'].forEach((id, k) => _photoRefs[j].push(base(id, { objectName: 'Box of papers ' + (k + 1), agentName: 'Box of papers ' + (k + 1), namedBy: 'agent',
          agentConf: 'medium', agentAt: T, disposition: 'Keep', fmv: 10, valuedBy: 'desk', valSource: 'Estimate', valDate: '2026-08-14', condition: 'Good',
          agentNotices: [{ kind: 'other', text: 'Look at the papers in box ' + (k + 1) + ': they may include a will' }] })));
        _photoRefs[j].push(base('g20', { objectName: 'Oak gun cabinet, glazed door', agentName: 'Oak gun cabinet, glazed door', namedBy: 'agent', agentConf: 'high', agentAt: T,
          category: 'Furniture', disposition: 'Auction', channel: 'Kodner Galleries', fmv: 400, valuedBy: 'desk', valSource: 'Estimate', valDate: '2026-08-14', condition: 'Good',
          agentNotices: [{ kind: 'firearm', text: 'Long guns visible behind the glass door' }] }));
        _invAssignItemNos(j); savePhotoRefs(j); renderInventoryTab();
        window.__ran = [];
        window.__orig = { pdf: window.printEstateInventoryReport, csv: window.exportInventoryCSV, show: window.deskShowLine };
        window.printEstateInventoryReport = function () { window.__ran.push('pdf'); };
        window.exportInventoryCSV = function () { window.__ran.push('csv'); };
        window.deskShowLine = function (jj, sid) { window.__ran.push('show:' + sid); };
      }, J);
      await p.waitForTimeout(600);
      // 1. The last missing figure, then the Estate Inventory PDF.
      ok(await vis('#inv-workbar button[onclick="agentValueRun(' + J + ')"]'), 'fixture: Value 1 line shows before the Estate Inventory PDF');
      await p.click('#inv-fmv-v18'); await p.fill('#inv-fmv-v18', '125');
      await humanPress('#inv-workbar button[onclick="printEstateInventoryReport(' + J + ')"]');
      eq(await p.evaluate(() => window.__ran.splice(0)), ['pdf'], '⚠⚠ the last figure typed, then the Estate Inventory PDF: the PDF, never the CSV beside it');
      eq((await line('v18')).fmv, 125, 'fixture: the figure was written');
      eq(await p.locator('#inv-workbar button[onclick="agentValueRun(' + J + ')"]').count(), 0, 'and Value 1 line has gone, once the press was done');
      // 2. A name that quiets #o1's note, then Show the item on #o2's.
      const shows = () => p.evaluate(() => [...document.querySelectorAll('#inv-agent-notices button.desk-show')].map((b) => (b.getAttribute('onclick') || '').replace(/^.*,'|'\).*$/g, '')));
      const before = await shows();
      ok(before.indexOf('o1') >= 0 && before.indexOf('o2') >= 0 && before.indexOf('o3') >= 0, 'fixture: the three notes on the list: ' + JSON.stringify(before));
      await p.click('#inv-row-o1 .inv-name textarea'); await p.keyboard.press('End'); await p.keyboard.type(' (deeds)');
      await humanPress('#inv-agent-notices button.desk-show[onclick*="\'o2\'"]');
      eq(await p.evaluate(() => window.__ran.splice(0)), ['show:o2'], '⚠⚠ #o1\'s note quietened under the press: Show the item on #o2\'s shows #o2 (it showed #o3)');
      ok((await shows()).indexOf('o1') < 0, 'and #o1\'s note has gone, once the press was done');
      // 3. The search typed with a redraw owed, then Not reviewed.
      await p.click('#inv-q'); await p.keyboard.type('bo', { delay: 120 }); await p.waitForTimeout(700);
      eq(await p.evaluate(() => { _invRenderWhenIdle(); return [document.activeElement && document.activeElement.id, _invRenderOwed]; }), ['inv-q', true], 'fixture: a redraw owed while the search has the focus');
      await humanPress('#inv-flagstrip button[onclick="setInvFlag(\'unreviewed\')"]');
      eq(await p.evaluate(() => _invFilter.flag), 'unreviewed', '⚠⚠ the redraw owed on leaving the box no longer swallows the press: Not reviewed filters on the first press');
      await press('#panel-inventory button[onclick="invClearFilters()"]', 'Clear filters');
      // 4. A Total typed with a redraw owed, then No value yet.
      await p.click('#inv-fmv-u9'); await p.fill('#inv-fmv-u9', '210');
      await p.evaluate(() => _invRenderWhenIdle());
      await humanPress('#inv-flagstrip button[onclick="setInvFlag(\'noval\')"]');
      eq(await p.evaluate(() => _invFilter.flag), 'noval', '⚠⚠ a Total typed with a redraw owed, then No value yet: it filters on the first press');
      eq((await line('u9')).fmv, 210, 'fixture: the Total was written');
      await press('#panel-inventory button[onclick="invClearFilters()"]', 'Clear filters');
      // 5. The gun cabinet's blank line, answered with the Firearm note again.
      const r = await p.evaluate((j) => {
        const made = invSplitItemN(j, 'g20', 1);
        if (typeof made === 'string') return { err: made };
        const sid = made[0].stableId;
        agentApplyResult(j, { srcId: 'g20', rows: [sid] }, { objects: [], notices: [{ kind: 'firearm', text: 'Long guns visible behind the glass door' }] });
        renderInventoryTab();
        const ref = _photoRefs[j].find((x) => x.stableId === sid), row = document.getElementById(_invRowDomId(sid));
        return { conf: ref.agentConf, row: row ? row.querySelector('.inv-row-sub').textContent.replace(/\s+/g, ' ').trim() : '', cu: !!(row && row.querySelector('label.inv-cu-add')) };
      }, J);
      eq(r.conf, 'none', '⚠⚠ the blank line split off the gun cabinet, answered with its Firearm note again: nothing else in it');
      has(r.row, 'nothing to list', 'its row says nothing to list');
      lacks(r.row, 'could not be read', '⚠ never could not be read');
      ok(!r.cu, 'and offers no + Close-up');
      // 6. A tap on a touch screen (the iPad): the browser sends the tap's mousedown, mouseup and click together after the finger
      // lifts, and the box is left on that mousedown. A figure typed that takes Value 1 line off the bar, then the PDF tapped.
      await p.evaluate((j) => { const T = Date.now() - 86400000;
        _photoRefs[j].push({ stableId: 'v19', label: 'inventory', collId: null, roomIdx: 3, status: 'uploaded', ts: T, updatedAt: T, filename: 'HVL-2610-P9_Fv19.jpg',
          driveFileId: 'Fv19', driveFileUrl: 'https://drive.google.com/file/d/Fv19/view', category: 'Furniture', qty: 1, objectName: 'Cedar hope chest', namedBy: 'desk',
          disposition: 'Auction', channel: 'Kodner Galleries', condition: 'Good' });
        _invAssignItemNos(j); savePhotoRefs(j); renderInventoryTab(); }, J);
      await p.waitForTimeout(600);
      ok(await vis('#inv-workbar button[onclick="agentValueRun(' + J + ')"]'), 'fixture: Value 1 line shows again, for the hope chest');
      await p.click('#inv-fmv-v19'); await p.fill('#inv-fmv-v19', '140');
      const tapSel = '#inv-workbar button[onclick="printEstateInventoryReport(' + J + ')"]';
      await p.evaluate((q) => document.querySelector(q).scrollIntoView({ block: 'center' }), tapSel); await p.waitForTimeout(250);
      const tb = await p.locator(tapSel).boundingBox();
      const cdp = await p.context().newCDPSession(p);
      await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: tb.x + tb.width / 2, y: tb.y + tb.height / 2 }] });
      await p.waitForTimeout(80);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await p.waitForTimeout(900);
      await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false }); await cdp.detach();
      eq(await p.evaluate(() => window.__ran.splice(0)), ['pdf'], '⚠⚠ tapped on a touch screen straight after the figure: the PDF, never the CSV');
      eq((await line('v19')).fmv, 140, 'fixture: the figure was written');
      await p.evaluate(() => { window.printEstateInventoryReport = window.__orig.pdf; window.exportInventoryCSV = window.__orig.csv; window.deskShowLine = window.__orig.show; });
    });

    eq(await overflow(), 0, 'no horizontal overflow at 1440');
    await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(700);
    eq(await overflow(), 0, 'no horizontal overflow at 390');
    eq(errs, [], 'zero page errors');
    console.log('\n' + pass + ' passed, ' + fail + ' failed');
    await b.close();
    process.exit(fail ? 1 : 0);
  } catch (e) {
    console.log('step 131 threw: ' + (e && e.stack || e));
    if (b) await b.close().catch(() => {});
    process.exit(1);
  }
})();
