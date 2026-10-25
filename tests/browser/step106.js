// Step 106 — one photograph named twice, and Agent Two correcting the name as it values (2026-10-25).
//
// Anthony, off the Ellison kitchen (*"Agent Two raised 23 things to look at"*), picked *Fix both now*, then: *"Why doesn't
// agent 1 guess and agent 2 confirm or update upon pricing. No need to flag inconsistencies. Just update the the best of
// their ability and if I see something that is off on the desk review, I'll change it."*
//
// Drives the REAL page with an active trust estate whose kitchen photograph carries the four Ellison lines, #73 and #81
// from one naming and #87 and #88 from a second seven minutes later, beside a copper-pan photograph and a lamp named at
// the desk. Job Admin & Inv through its own nav button, the client through its picker:
//   A. Possible duplicates shows *One photograph named twice* with the four lines under their own names; Remove pressed on
//      #87 and on #88 takes both off and the block goes; #73 and #81 stay.
//   B. Value N lines pressed on the work bar, Agent Two a route answering as the script does: the plates corrected (likely
//      Spanish), the pans confirmed, the lamp (named at the desk) given a different name. The plates' row shows the
//      corrected name, the pans' and the lamp's are unchanged; the list above the rows is one entry per line with notes,
//      *Agent Two noted N lines to look at*; the plates' record reads *Name updated from "…"* and lists its note.
//   At 1440 and 390 px no horizontal overflow; zero page errors throughout.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step106.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
const SYNC = 'https://sync.example.test/exec';
const J = 9851;
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');
const DIN1 = 'Hand-painted tin-glazed earthenware dinner plates, yellow bird and blue flower, likely Italian';
const SAL1 = 'Hand-painted tin-glazed earthenware salad plates, matching';
const DIN2 = 'Hand-painted majolica dinner plates, yellow bird and blue flower design';
const SAL2 = 'Hand-painted majolica salad or dessert plates, matching';
const SPANISH = 'Hand-painted tin-glazed dinner plates, yellow bird pattern, likely Spanish';

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
          // Answered as agentValueLines answers: a result per line sent, keyed on its stableId, each with the name it
          // valued under (the given one or the correction) and its notes.
          const results = {};
          (body.items || []).forEach((it) => {
            const base = { low: 40, high: 120, confidence: 'low', source: 'Online comps', basis: 'No sold comparable; a best estimate', comps: [], lookup: '', notices: [], mode: 'general' };
            if (it.stableId === 'pl73') results[it.stableId] = Object.assign(base, { fmv: 75, name: SPANISH, notices: [{ kind: 'other', text: 'A larger stack of the same pattern is in the photograph.' }] });
            else if (it.stableId === 'pl81') results[it.stableId] = Object.assign(base, { fmv: 60, name: SAL1, notices: [] });
            else if (it.stableId === 'pan') results[it.stableId] = Object.assign(base, { fmv: 90, name: 'Copper saucepans', notices: [{ kind: 'appraiser', text: 'Stamped Mauviel: worth a specialist look.' }] });
            else if (it.stableId === 'lamp') results[it.stableId] = Object.assign(base, { fmv: 45, name: 'Brass student lamp, Victorian style', notices: [] });
          });
          return json({ ok: true, success: true, results: results, failed: {}, remaining: 0 });
        }
        if (body.action === 'agentRoomCheck') return json({ ok: true, results: {}, failed: {}, remaining: [] });
        return json({ ok: true });
      }
      if (/action=loadMedia/.test(req.url())) return json({ ok: true, media: sheet });
      return json({ ok: true });
    });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    const said = []; p.on('dialog', async (d) => { said.push(d.message()); await d.accept(); });
    const section = async (name, body) => {
      console.log('\n## ' + name);
      try { await body(); } catch (e) { fail++; console.log('  ✗ ' + name + ' threw: ' + String(e && e.message || e).split('\n')[0]); }
    };
    const vis = (sel) => p.locator(sel).first().isVisible().catch(() => false);
    const press = async (sel, what) => {
      const n = await p.locator(sel).count();
      const v = n === 1 && await vis(sel);
      ok(v, (what || sel) + ' — one control, on screen (' + n + ')');
      if (v) { await p.click(sel, { timeout: 5000 }).catch((e) => ok(false, (what || sel) + ' — ' + e.message.split('\n')[0])); await p.waitForTimeout(700); }
      return v;
    };
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const txt = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }, sel);
    const live = () => p.evaluate((j) => (_photoRefs[j] || []).filter((r) => r.label === 'inventory' && !r.deletedAt)
      .map((r) => ({ id: r.stableId, no: r.itemNo, name: r.objectName || '', from: r.valNameFrom || '' })), J);

    await p.goto(APP); await p.waitForTimeout(1600);
    sheet = await p.evaluate(([J, SYNC, DIN1, SAL1, DIN2, SAL2]) => {
      SHEETS_SYNC_URL = SYNC;
      try { localStorage.setItem('hav_device_user', 'Ashley Jerome'); } catch (e) {}
      const T = Date.now() - 2 * 86400000, A1 = T + 3600000, A2 = A1 + 7 * 60000;
      jobs.unshift({ id: J, hvlId: 'HVL-2610-EK', name: 'Margaret Ellison', svc: 'cleanout', matterType: 'trust', addr: '12 Via Mizner', city: 'Palm Beach', zip: '33480',
        executor: 'Katherine Ellison', executorRole: 'Successor Trustee', executorEmail: 'kate@example.com', deathDate: '2026-08-14', executorAuth: 'received',
        trustName: 'Ellison Family Trust', docTier: 'values', gate706: 'no', status: 'active', won: true, wonAt: '2026-10-01', approved: true, tc: 'Ashley Jerome',
        created: '2026-09-28', start: '2026-10-12', activatedOn: '2026-10-10', agrApproved: true, agrSent: true, agrSigned: true, sqft: 3800,
        driveFolder: 'https://drive.google.com/drive/folders/R' + J, driveSubfolders: { 'Estate Inventory': 'INV_EK', 'As-Found Record': 'AF_EK' }, at: {},
        payments: [{ uid: 'd' + J, stage: 'deposit', amount: 12000, receivedOn: '2026-10-08', method: 'wire', clearedOn: '2026-10-08' }] });
      estimateStore[J] = { approved: true, submitted: true, approvedBy: 'Anthony Graziano', savedAt: T,
        estimate: { jobId: J, svc: 'cleanout', havellinTotal: 24000, fixedPrice: true, fixedAmount: 24000, fixedLines: true, totTC: 60, totPS: 90, days: 5,
          vendors: [], prepItems: [], rooms: [{ idx: 2, name: 'Kitchen', st: 'in', vol: 3, cplx: 3 }] } };
      const photo = (id, file) => ({ label: 'inventory', collId: null, roomIdx: 2, seq: 5, status: 'uploaded', ts: T, filename: 'HVL-2610-EK_Kitchen_INV_' + id + '.jpg',
        driveFileId: file, driveFileUrl: 'https://drive.google.com/file/d/' + file + '/view' });
      const plates = photo('5', 'FID_PLATES');
      const agent = (at) => ({ namedBy: 'agent', agentConf: 'medium', agentAt: at, category: 'General/Household', updatedAt: at });
      _photoRefs[J] = [
        Object.assign({ stableId: 'pl73', itemNo: 73, objectName: DIN1, qty: 8 }, plates, agent(A1)),
        Object.assign({ stableId: 'pl81', itemNo: 81, derivedFrom: 'pl73', objectName: SAL1, qty: 6 }, plates, agent(A1 + 3)),
        Object.assign({ stableId: 'pl87', itemNo: 87, derivedFrom: 'pl73', objectName: DIN2, qty: 6 }, plates, agent(A2)),
        Object.assign({ stableId: 'pl88', itemNo: 88, derivedFrom: 'pl73', objectName: SAL2, qty: 6 }, plates, agent(A2 + 2)),
        Object.assign({ stableId: 'pan', itemNo: 90, objectName: 'Copper saucepans', qty: 4 }, photo('6', 'FID_PAN'), agent(A1 + 9000)),
        Object.assign({ stableId: 'lamp', itemNo: 91, objectName: 'Brass desk lamp', qty: 1, namedBy: 'desk', category: 'General/Household', updatedAt: T }, photo('7', 'FID_LAMP'))];
      savePhotoRefs(J); saveJobs(); localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore));
      const out = {}; out[J] = { items: JSON.parse(localStorage.getItem('hav_media_' + J) || '[]') };
      return out;
    }, [J, SYNC, DIN1, SAL1, DIN2, SAL2]);

    const toDesk = async () => {
      await p.click('.nb[onclick*="\'inventory\'"]'); await p.waitForTimeout(800);
      const cur = await p.evaluate(() => (document.getElementById('inv-job') || {}).value);
      if (String(cur) !== String(J)) { await p.selectOption('#inv-job', String(J)); await p.waitForTimeout(1300); }
      if (await p.locator('#panel-inventory button[onclick="setInvWhen(\'all\')"]').count()) { await p.click('#panel-inventory button[onclick="setInvWhen(\'all\')"]'); await p.waitForTimeout(600); }
    };

    // ── A ─────────────────────────────────────────────────────────────────────────────────────
    await section('A. the plates\' photograph named twice: one group under Possible duplicates, and Remove pressed on the repeats', async () => {
      await toDesk();
      const block = await p.evaluate(() => {
        const g = [...document.querySelectorAll('#panel-inventory .inv-dup-group')].map((x) => x.textContent.replace(/\s+/g, ' '));
        return g;
      });
      eq(block.length, 1, 'one group under Possible duplicates');
      has(block[0] || '', 'One photograph named twice', 'headed for what it is');
      has(block[0] || '', 'Agent One read it twice, so the later lines may repeat the earlier ones', 'and why');
      [DIN1, SAL1, DIN2, SAL2].forEach((n) => has(block[0] || '', n, 'the line under its own name: ' + n.slice(0, 40)));
      lacks(block[0] || '', 'Copper saucepans', 'the pans, another photograph named once, are not in it');
      has(await p.evaluate(() => { const r = document.getElementById('inv-row-pl87'); return r ? r.textContent : ''; }), 'possible duplicate', 'and #87\'s row wears the chip');
      await press('.inv-dup-group button[onclick="agentDropDuplicate(' + J + ',\'pl87\')"]', 'Remove on #87');
      has(said[said.length - 1] || '', 'Remove item #87', 'it asks first, naming the item');
      await press('.inv-dup-group button[onclick="agentDropDuplicate(' + J + ',\'pl88\')"]', 'Remove on #88');
      eq((await live()).map((x) => x.no), [73, 81, 90, 91], '⚠⚠ #87 and #88 are off the inventory; #73 and #81 stay');
      eq(await p.locator('#panel-inventory .inv-dup-group').count(), 0, '⚠ and nothing is left to flag');
      eq(await p.evaluate((j) => (_photoRefs[j] || []).filter((r) => r.deletedAt).map((r) => [r.stableId, !!r.driveFileId]), J), [['pl87', true], ['pl88', true]],
        'removed as tombstones, the photograph untouched');
    });

    // ── B ─────────────────────────────────────────────────────────────────────────────────────
    await section('B. Value N lines: Agent Two corrects the plates\' name, confirms the pans\', leaves the desk\'s lamp alone; one entry per line', async () => {
      await press('#inv-workbar button:has-text("Value 4 lines")', 'Value 4 lines, on the work bar');
      await p.waitForTimeout(1800);
      has(said.find((m) => /Value 4 lines on this job/.test(m)) || '', 'a name Agent One gave that nobody has reviewed may come back corrected', 'the confirm says a name may come back corrected');
      eq(net.value.length, 1, 'fixture: one request to the valuing service');
      const L = await live();
      const by = {}; L.forEach((x) => { by[x.id] = x; });
      eq([by.pl73 && by.pl73.name, by.pl73 && by.pl73.from], [SPANISH, DIN1], '⚠⚠ the plates carry the name Agent Two valued them under, Agent One\'s kept on the line');
      eq([by.pl81 && by.pl81.name, by.pl81 && by.pl81.from], [SAL1, ''], 'the salad plates, confirmed, are unchanged');
      eq([by.lamp && by.lamp.name, by.lamp && by.lamp.from], ['Brass desk lamp', ''], '⚠⚠ the lamp, named at the desk, keeps its name');
      await p.evaluate(() => renderInventoryTab()); await p.waitForTimeout(500);
      const rowName = await p.evaluate(() => { const t = document.querySelector('#inv-row-pl73 .inv-name textarea'); return t ? t.value : ''; });
      eq(rowName, SPANISH, 'the plates\' row shows the corrected name');
      const notes = await txt('#inv-value-notices');
      has(notes, 'Agent Two noted 2 lines to look at', '⚠ the heading counts lines');
      eq(await p.locator('#inv-value-notices .av-note-line').count(), 2, 'one entry per line with a note');
      lacks(notes, 'Name may be wrong', 'no flag for a name');
      has(notes, 'Look at this · A larger stack of the same pattern is in the photograph.', 'the plates\' note');
      has(notes, 'Appraisal advised · Stamped Mauviel', 'the pans\' note');
      // The plates' record: the name it replaced, and its note.
      await press('button[onclick="_invToggleOpen(\'pl73\')"]', '#73\'s ▾');
      const rec = await p.evaluate(() => { const r = document.querySelector('#panel-inventory .av-renamed'); return r ? r.textContent : ''; });
      has(rec, 'Name updated from “' + DIN1 + '”', '⚠ the record names the name it replaced');
      has(await txt('#panel-inventory .av-notes'), 'Look at this · A larger stack of the same pattern is in the photograph.', 'and lists the note');
      eq(await overflow(), 0, 'no horizontal overflow at 1440');
      await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(600);
      eq(await overflow(), 0, 'no horizontal overflow at 390');
    });

    eq(errs, [], 'zero page errors');
    console.log('\n' + pass + ' passed, ' + fail + ' failed');
    await b.close();
    process.exit(fail ? 1 : 0);
  } catch (e) {
    console.log('step 106 threw: ' + (e && e.stack || e));
    if (b) await b.close().catch(() => {});
    process.exit(1);
  }
})();
