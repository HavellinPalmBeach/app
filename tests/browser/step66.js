// Step 66 — P22 · group C, the desk's known defects (2026-10-05).
//
// Drives the REAL page through its own controls on the Job Admin & Inv desk and the Job Plan: a row's disposition
// select, the row's record (▾) and its Keep the name, Removed items' Show all and Restore, the bulk bar's checkboxes,
// its Set disposition… and Mark reviewed, the workbar's Approval Request, the Authorized By box, the Releases & signed
// papers card, and the Job Plan's Hours Log toggle. Seeded: a probate estate with a firearm going to the decedent's
// daughter, fourteen removed lines and a line whose photograph was binned with its two detail shots, a filed receipt
// whose signer has no line now, an estate line recorded as going to the concierge, and a line two co-representatives
// signed on different days; a living client with an inventory and an hours log whose crew name and activity carry markup.
//
//   A. item 1: the firearm moved off To a person keeps the daughter's name, flagged on the row and in its record, and
//      is not cleared to carry until Keep the name (or a dealer typed); the record names the named principal (item 3)
//   B. item 2: Removed items shows the twelve most recent, then all fourteen; Restore gives back the detail shots
//   C. item 9: the bulk bar says what Keep and Mark reviewed did; the Authorized By box reads "(Oct 1, 2026)" and a
//      save left as shown keeps the stored form; an estate line going to the concierge is flagged on the row and the
//      request; item 6: the receipt with no line now stays on the card, labelled
//   D. item 5: the living request says who prepared it once; item 8: the plan asks for the client's signed ledger;
//      item 4: the hours log prints what the crew typed as text
//   E. overflow at 1440 and 390, no page errors
//
//   NODE_PATH=<dir>/node_modules node tests/browser/step66.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');

const SYNC = 'https://script.google.com/macros/s/STEP66/exec';
const T0 = Date.parse('2026-09-24T15:00:00Z');
const EST = 6601, LIVING = 6603;

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
    await ctx.route(SYNC + '**', (r) => r.fulfill({ status: 200, contentType: 'application/json',
      headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ ok: true }) }));
    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    const dialogs = [];
    p.on('dialog', async (d) => { dialogs.push(d.type() + ': ' + d.message()); await d.accept(); });
    await p.goto(APP); await p.waitForTimeout(1600);
    await p.evaluate(() => { window.open = function () { return null; }; window.__prints = [];
      window.print = function () { const pt = document.getElementById('print-target'); window.__prints.push(pt ? pt.innerHTML : ''); }; });
    await p.evaluate((u) => { SHEETS_SYNC_URL = u; }, SYNC);

    const section = async (name, body) => {
      console.log('\n## ' + name);
      try { await body(); } catch (e) { fail++; console.log('  ✗ ' + name + ' threw: ' + String(e && e.message || e).split('\n')[0]); }
    };
    const vis = (sel) => p.locator(sel).first().isVisible().catch(() => false);
    const press = async (sel, what) => {
      const n = await p.locator(sel).count();
      const v = n === 1 && await vis(sel);
      ok(v, (what || sel) + ' — one control, on screen (' + n + ')');
      if (v) { await p.click(sel, { timeout: 5000 }).catch((e) => ok(false, (what || sel) + ' — ' + e.message.split('\n')[0])); await p.waitForTimeout(400); }
      return v;
    };
    const txt = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }, sel);
    const T = (h) => p.evaluate((h) => { const d = document.createElement('div');
      d.innerHTML = String(h).replace(/<\/td>/g, ' </td>').replace(/<\/div>/g, ' </div>').replace(/<br>/g, ' '); return d.textContent.replace(/\s+/g, ' '); }, h);
    const until = async (f, ms) => { for (let i = 0; i < (ms || 6000) / 150; i++) { if (await f()) return true; await p.waitForTimeout(150); } return false; };
    const printCount = () => p.evaluate(() => window.__prints.length);
    const printClosed = () => until(() => p.evaluate(() => { const pt = document.getElementById('print-target');
      return !!pt && pt.style.display === 'none' && !!document.querySelector('.panel.active'); }));
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const line = (id, sid) => p.evaluate(([id, sid]) => JSON.parse(JSON.stringify((_photoRefs[id] || []).find((r) => r.stableId === sid) || null)), [id, sid]);
    const toDesk = async (id) => {
      await p.evaluate((id) => { setCurrentJob(id); populateInventorySelect(); }, id);
      await p.click('.nb[onclick*="\'inventory\'"]'); await p.waitForTimeout(700);
      const sel = await p.evaluate(() => (document.getElementById('inv-job') || {}).value);
      if (String(sel) !== String(id)) { await p.selectOption('#inv-job', String(id)); await p.waitForTimeout(700); }
    };
    const rowText = (sid) => txt('#inv-row-' + sid);
    const pick = async (sid) => { await p.click('#inv-row-' + sid + ' input[type=checkbox][title="Select for a bulk change"]'); await p.waitForTimeout(300); };
    const openRec = async (sid) => { await p.click('#inv-row-' + sid + ' button[title="Open the full record"]'); await p.waitForTimeout(400); };
    const requestOf = async (id) => {
      const before = await printCount();
      await press('#inv-workbar button[onclick="printApprovalRequest(' + id + ')"]', 'Approval Request');
      await until(async () => (await printCount()) > before, 4000);
      const h = (await printCount()) > before ? await p.evaluate(() => window.__prints.slice(-1)[0]) : '';
      await printClosed();
      return h;
    };

    // ── Seed ──────────────────────────────────────────────────────────────────────────────────────────────
    await p.evaluate(([T0, EST, LIVING]) => {
      const base = { status: 'active', won: true, wonAt: '2026-09-17', approved: true, tc: 'Ashley Jerome', city: 'Palm Beach', zip: '33480',
        created: '2026-09-10', start: '2026-09-21', activatedOn: '2026-09-21', driveFolder: 'https://drive.google.com/drive/folders/ROOT66', docTier: 'values',
        driveSubfolders: { 'Estate Inventory': 'SUB-INV', 'As-Found Record': 'SUB-AF', 'Signed Records': 'SIGNED-66' }, updatedAt: T0 };
      const L = (id, o) => Object.assign({ stableId: id, label: 'inventory', collId: null, roomIdx: 1, seq: 1, status: 'uploaded', qty: 1,
        category: 'Furniture', condition: 'Good', ts: T0, updatedAt: T0, driveFileId: 'f-' + id, driveFileUrl: 'https://drive.google.com/file/d/f-' + id + '/view' }, o);
      const est = (id, svc) => ({ approved: true, submitted: true, approvedBy: 'Anthony Graziano', savedAt: T0,
        estimate: { jobId: id, svc, havellinTotal: 20000, totTC: 40, totPS: 80, days: 4, collections: [], vendors: [], prepItems: [],
          rooms: [{ idx: 1, name: 'Study', st: 'in' }, { idx: 4, name: 'Kitchen', st: 'in' }] } });
      jobs.unshift(
        Object.assign({ id: EST, hvlId: 'HVL-2610-E661', name: 'Tripp Butler Sr', fname: 'Tripp', lname: 'Butler', svc: 'probate', matterType: 'probate',
          addr: '12 Ocean Way', deathDate: '2026-03-01', executorAuth: 'received', executor: 'Tripp Butler', executorRole: 'Personal Representative',
          executorEmail: 'tripp@butler.example', coFiduciaries: [{ id: 'cf1', name: 'Smith, John', role: 'Co-Personal Representative' }],
          signedRecords: [{ id: 'sr1', kind: 'receipt', ref: 'Sam Jones', stableIds: ['gone-line'], signedBy: 'Sam Jones', filedAt: T0,
            fileUrl: 'https://drive.google.com/file/d/RC1/view', label: 'Signed receipt — Sam Jones' }] }, base),
        Object.assign({ id: LIVING, hvlId: 'HVL-2610-L663', name: 'Margaret Ellsworth', fname: 'Margaret', lname: 'Ellsworth', svc: 'downsizing_move',
          addr: '14 Coconut Row', destAddr: '801 Sunset Ave', docTier: '' }, base));
      estimateStore[EST] = est(EST, 'probate');
      estimateStore[LIVING] = est(LIVING, 'downsizing_move');
      const removed = [];
      for (let i = 1; i <= 14; i++) removed.push(L('r' + i, { itemNo: 20 + i, objectName: 'Removed line ' + i, deletedAt: T0 + i * 60000, deletedBy: 'Ashley Jerome' }));
      _photoRefs[EST] = [
        L('g1', { itemNo: 1, objectName: 'Shotgun', category: 'Firearms', serial: 'SN-881', disposition: 'Distribute', channel: 'Marie Delgado (daughter)',
                  authBy: 'Tripp Butler; Smith, John', approvalDate: '2026-09-28' }),
        L('k1', { itemNo: 2, objectName: 'Sideboard', fmv: '900', disposition: 'Sell', channel: 'Kodner Galleries' }),
        L('k2', { itemNo: 3, objectName: 'Hall mirror', fmv: '200', disposition: 'Sell', channel: 'Kodner Galleries' }),
        L('c1', { itemNo: 4, objectName: 'Wall clock', fmv: '150', disposition: 'Distribute', channel: 'Ashley Jerome' }),
        L('a1', { itemNo: 5, objectName: 'Writing desk', fmv: '700', disposition: 'Sell', channel: 'Kodner Galleries',
                  authBy: 'Tripp Butler (2026-10-01); Smith, John (2026-10-08)', approvalDate: '2026-10-08' }),
        // The bin took this photograph and its two close-ups in one press; a third close-up was binned on its own earlier.
        L('p1', { itemNo: 6, objectName: 'Bar console', deletedAt: T0 + 3600000, driveTrashed: 1 }),
        { stableId: 'd1', roomIdx: 1, label: 'detail', groupId: 'p1', seq: 1, status: 'uploaded', driveFileId: 'fd1', ts: T0, updatedAt: T0 + 3600000, deletedAt: T0 + 3600000, deletedWith: 'p1' },
        { stableId: 'd2', roomIdx: 1, label: 'detail', groupId: 'p1', seq: 2, status: 'uploaded', driveFileId: 'fd2', ts: T0, updatedAt: T0 + 3600000, deletedAt: T0 + 3600000, deletedWith: 'p1' },
        { stableId: 'd3', roomIdx: 1, label: 'detail', groupId: 'p1', seq: 3, status: 'uploaded', driveFileId: 'fd3', ts: T0, updatedAt: T0 + 60, deletedAt: T0 + 60 },
      ].concat(removed);
      _photoRefs[LIVING] = [L('v1', { itemNo: 1, objectName: 'Armchair', disposition: 'Donate', channel: 'Goodwill' })];
      [EST, LIVING].forEach((id) => savePhotoRefs(id));
      jobLogs[LIVING] = [{ id: 1, date: '2026-10-01', activity: '<img src=x onerror="window.__xss=1">Sorting <b>study</b>',
        members: [{ name: '<b>Eve</b> Ortiz', role: 'PS', hours: 2 }, { name: 'Ashley Jerome', role: 'TC', hours: 1.5 }] }];
      saveJobs();
      localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore));
    }, [T0, EST, LIVING]).catch((e) => ok(false, 'seed: ' + e.message.split('\n')[0]));

    // ════════════════════════════════════════════════════════════════════════════════════════════════════
    await section('A. a firearm moved off To a person: the name is kept and flagged, and is not the dealer until a person says so', async () => {
      await toDesk(EST);
      const sel = '#inv-row-g1 select[onchange*="\'disposition\'"]';
      ok(await vis(sel), 'the row\'s disposition select is on screen');
      await p.selectOption(sel, 'Sell'); await p.waitForTimeout(700);
      eq((await line(EST, 'g1')).channel, 'Marie Delgado (daughter)', '⚠⚠ the daughter\'s name is kept: nothing clears a person\'s typing');
      has(await rowText('g1'), 'still names Marie Delgado (daughter)', '⚠ the row flags it');
      await openRec('g1');
      const rec = await rowText('g1');
      has(rec, 'Not cleared to carry: No dealer named — Channel / Recipient still names Marie Delgado (daughter), the person this line was going to.',
          '⚠⚠ the firearm is not cleared to carry on a leftover name');
      has(rec, 'Channel / Recipient still names Marie Delgado (daughter), from when this line went to a person.', 'the record says why');
      await press('#inv-row-g1 button[onclick^="invKeepChannel"]', 'Keep the name');
      await p.waitForTimeout(300);
      const after = await rowText('g1');
      lacks(after, 'still names', 'the flag comes off once a person keeps the name');
      has(after, 'Cleared to carry. Havellin’s named principal alone takes it to Marie Delgado (daughter)', 'and the record names the named principal (item 3)');
      lacks(after, 'Anthony Graziano alone', 'never a person by name');
      eq((await line(EST, 'g1')).channel, 'Marie Delgado (daughter)', 'the channel is as typed');
    });

    // ════════════════════════════════════════════════════════════════════════════════════════════════════
    await section('B. Removed items: every removal reachable; Restore gives the detail shots back', async () => {
      await toDesk(EST);
      const card = () => p.evaluate(() => { const b = document.getElementById('inv-removed-all');
        const c = b ? b.closest('.card') : [...document.querySelectorAll('.card')].find((x) => /Removed items/.test(x.textContent));
        return c ? c.textContent.replace(/\s+/g, ' ') : ''; });
      let c = await card();
      has(c, 'Removed line 14', 'the newest removal is listed');
      lacks(c, 'Removed line 2 ', 'twelve at first');
      await press('#inv-removed-all', 'Show all');
      c = await card();
      has(c, 'Removed line 1 ', '⚠⚠ every removal is reachable');
      has(c, 'Bar console', 'the binned item too');
      has(c, '2 detail shots removed with it', 'which says its close-ups went with it');
      await press('button[onclick="restoreInventoryItem(' + EST + ',\'p1\')"]', 'Restore the Bar console');
      const [p1, d1, d2, d3] = [await line(EST, 'p1'), await line(EST, 'd1'), await line(EST, 'd2'), await line(EST, 'd3')];
      ok(!p1.deletedAt, 'the item is back');
      ok(!d1.deletedAt && !d2.deletedAt, '⚠⚠ with the two detail shots the bin took with it');
      ok(!!d3.deletedAt, '⚠ never the one binned on its own');
      await press('#inv-removed-all', 'Show the 12 most recent');
    });

    // ════════════════════════════════════════════════════════════════════════════════════════════════════
    await section('C. the bulk bar, the Authorized By box, the staff flag, the orphan receipt', async () => {
      await toDesk(EST);
      await pick('k1'); await pick('k2');
      await p.selectOption('select[onchange^="_invBulkApply(' + EST + ',\'disposition\'"]', 'Keep');
      await p.waitForTimeout(500);
      const bar = await p.evaluate(() => { const b = document.querySelector('button[onclick*="\'reviewed\',1"]'); return b ? b.parentElement.textContent.replace(/\s+/g, ' ') : ''; });
      has(bar, 'Keep set on 2 items', '⚠⚠ the bar says Keep was set, never "2 items updated"');
      await press('button[onclick="_invBulkApply(' + EST + ',\'reviewed\',1)"]', 'Mark reviewed');
      const bar2 = await p.evaluate(() => { const b = document.querySelector('button[onclick*="\'reviewed\',1"]'); return b ? b.parentElement.textContent.replace(/\s+/g, ' ') : ''; });
      has(bar2, '2 items marked reviewed.', '⚠⚠ and Mark reviewed says so');
      await p.evaluate(() => _invClearPicks()); await p.waitForTimeout(300);
      // The Authorized By box, on a line two co-representatives signed on different days (one name with a comma in it).
      await openRec('a1');
      const box = '#inv-row-a1 input[onchange*="\'authBy\'"]';
      ok(await vis(box), 'the Authorized By box is on screen');
      eq(await p.inputValue(box), 'Tripp Butler (Oct 1, 2026); Smith, John (Oct 8, 2026)', '⚠⚠ it reads each day as a person writes it, and "Smith, John" whole');
      lacks(await rowText('a1'), 'approval incomplete', '⚠ "Smith, John" is matched whole, so the approval is complete');
      await p.fill(box, 'Tripp Butler (Oct 1, 2026); Smith, John (Oct 9, 2026)');
      await p.press(box, 'Tab'); await p.waitForTimeout(400);
      eq((await line(EST, 'a1')).authBy, 'Tripp Butler (2026-10-01); Smith, John (2026-10-09)', '⚠ a corrected day is saved in the stored form');
      // The estate line going to the concierge, written before anything refused it.
      has(await rowText('c1'), 'Ashley Jerome works with Havellin', '⚠⚠ the row flags it');
      const h = await requestOf(EST), t = await T(h);
      has(t, 'Property recorded as going to someone who works with Havellin', '⚠⚠ the request names it above the table');
      has(t, 'Please do not initial them.', 'and asks that it not be initialled');
      // The receipt whose signer has no line now.
      const rel = await txt('#inv-releases');
      has(rel, 'Sam Jones', 'the receipt\'s signer is on the card');
      has(rel, 'No line on the inventory goes to them now; the receipt they signed stays here and in Drive.', '⚠ kept, labelled');
      ok(rel.indexOf('Sam Jones') < rel.indexOf('No line on the inventory goes to them now'), 'the label under the name');
      ok(await p.locator('#inv-releases a[href="https://drive.google.com/file/d/RC1/view"]').count() === 1, 'with its link');
    });

    // ════════════════════════════════════════════════════════════════════════════════════════════════════
    await section('D. the living request, the ledger the client signs, the hours log', async () => {
      await toDesk(LIVING);
      const h = await requestOf(LIVING);
      eq((h.match(/Prepared by Havellin Palm Beach, LLC/g) || []).length, 1, '⚠⚠ the living request says who prepared it once');
      await p.evaluate((id) => openJobPlanFor(id, 'hours'), LIVING); await p.waitForTimeout(900);
      has(await p.evaluate(() => (document.getElementById('panel-job-plan') || { textContent: '' }).textContent.replace(/\s+/g, ' ')), 'Disposition Ledger signed by the client',
          '⚠⚠ the plan asks for the client\'s signed ledger');
      await press('#log-history-toggle', 'View hours log');
      const wrap = await p.evaluate(() => { const w = document.getElementById('log-history-wrap');
        return { text: w.textContent.replace(/\s+/g, ' '), imgs: w.querySelectorAll('img').length, bold: w.querySelectorAll('td b').length }; });
      has(wrap.text, '<b>Eve</b> Ortiz', '⚠⚠ the crew name prints as typed, as text');
      has(wrap.text, '<img src=x onerror="window.__xss=1">Sorting <b>study</b>', '⚠⚠ and so does the activity');
      eq([wrap.imgs, wrap.bold], [0, 0], 'no markup from the record reaches the page');
      eq(await p.evaluate(() => window.__xss || 0), 0, 'and nothing ran');
    });

    // ════════════════════════════════════════════════════════════════════════════════════════════════════
    await section('E. overflow at 1440 and 390, no page errors', async () => {
      await toDesk(EST);
      await openRec('g1');
      ok(await overflow() <= 0, 'the desk fits at 1440 (' + await overflow() + ')');
      await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(400);
      await toDesk(EST);
      ok(await overflow() <= 0, 'the desk fits at 390 (' + await overflow() + ')');
      await p.setViewportSize({ width: 1440, height: 1000 });
      eq(errs, [], 'no page errors');
    });

    console.log('\n' + pass + ' passed, ' + fail + ' failed');
    await b.close();
    process.exit(fail ? 1 : 0);
  } catch (e) {
    console.log('  ✗ the step threw: ' + (e && e.stack || e));
    try { if (b) await b.close(); } catch (x) {}
    console.log('\n' + pass + ' passed, ' + (fail + 1) + ' failed');
    process.exit(1);
  }
})();
