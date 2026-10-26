// Step 109 — Anthony at the desk, 2026-10-26b: what he pressed on a client the old agents had valued, and what changed.
//
// Anthony, off the cabbage-ware plates: *"Do we say $10 or do we say $12? … is it accurate down to the penny"* (he took "Whole
// dollars each"); *"Do I need to rerun the agent somehow"* (he took "Re-value on the bulk bar"); *"why doesn't it just grade that
// excellent condition"* (he took "Agents grade it"); *"I just hit that twice and all it did was create number 94 unnamed item,
// number 95 unnamed item"*; *"it also moved … the open photo and drive chain of custody plus another item … down below"*; *"there's
// no way to click on the detail shots and look at them in Drive"*; *"the plus close-up button is slightly out of line"*.
//
// Drives the REAL page with an active trust estate whose kitchen holds the plates (seven, valued by the old agents at $75 as
// "Online comps", a close-up of their underside), the foyer's beach print (named, never valued or graded), a sofa a person
// graded Fair and valued at $400, and one photograph not yet named. Job Admin & Inv through its own nav button:
//   A. The plates' record: the photograph and the close-up each open their file in Drive with a small link; no big button;
//      + Close-up level with the other buttons. + Another item in this photo: the toast names the new line; the buttons stay
//      beside the photograph with the sentence naming its lines; a second press asks first, and Cancel adds nothing.
//   B. The plates, the print and the sofa ticked; Re-value on the selection bar: the confirm names the sofa's figure as left
//      alone; the plates and the print go, each at its own depth, each with its photograph (nobody has graded them), the grades
//      riding the request; the plates come back $75 for seven and read $11 each, $77; the print graded Excellent; the sofa's
//      Fair and $400 untouched.
//   C. Name 1 shot: Agent One is sent the grades and its grade lands on the new line.
//   At 1440 and 390 px no horizontal overflow; zero page errors throughout.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step109.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
const SYNC = 'https://sync.example.test/exec';
const J = 9854;
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
    const net = { value: [], room: [], name: [] };
    let sheet = {};
    await ctx.route(SYNC + '**', async (r) => {
      const req = r.request();
      const json = (o) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
      if (req.method() === 'POST') {
        let body = {}; try { body = JSON.parse(req.postData() || '{}'); } catch (e) {}
        if (body.action === 'agentIdentify') {
          net.name.push(body);
          const results = {};
          (body.shots || []).forEach((s) => { results[s.stableId] = { objects: [{ name: 'Rattan side chair', category: 'Furniture', qty: 1, confidence: 'high',
            basis: 'woven seat and frame', crop: [0, 0, 1, 1], condition: 'Good' }], notices: [], model: 'claude-fable-5-1' }; });
          return json({ ok: true, results: results, failed: {}, model: 'claude-fable-5-1' });
        }
        if (body.action === 'agentRoomCheck') {
          net.room.push(body);
          const results = {}; (body.rooms || []).forEach((rm) => { results[rm.key] = { doubles: [] }; });
          return json({ ok: true, results: results, failed: {}, remaining: [] });
        }
        if (body.action === 'agentValue') {
          net.value.push(body);
          const results = {};
          (body.items || []).forEach((it) => {
            const base = { confidence: 'medium', source: 'General estimate', basis: 'The going used rate', comps: [], lookup: '', notices: [], mode: it.mode || 'general', category: '' };
            if (it.stableId === 'cab') results.cab = Object.assign(base, { fmv: 75, low: 45, high: 120, condition: 'Good',
              name: 'Green cabbage-leaf majolica crescent salad plates, likely Portuguese' });
            else if (it.stableId === 'print') results.print = Object.assign(base, { fmv: 40, low: 25, high: 60, condition: 'Excellent', name: it.name });
            else results[it.stableId] = Object.assign(base, { fmv: 30, low: 20, high: 45, condition: '', name: it.name });
          });
          return json({ ok: true, success: true, results: results, failed: {}, remaining: 0 });
        }
        return json({ ok: true });
      }
      if (/action=loadMedia/.test(req.url())) return json({ ok: true, media: sheet });
      return json({ ok: true });
    });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    const said = []; let dismissBlank = false;
    p.on('dialog', async (d) => {
      said.push(d.message());
      if (dismissBlank && /Add another blank line anyway\?/.test(d.message())) await d.dismiss(); else await d.accept();
    });
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
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const line = (id) => p.evaluate(([j, id]) => { const r = (_photoRefs[j] || []).find((x) => x.stableId === id) || {};
      return { name: r.objectName, fmv: r.fmv, lo: r.valLow, hi: r.valHigh, cond: r.condition || '', condBy: r.condBy || '', by: r.valuedBy, each: invUnitValue(r) }; }, [J, id]);
    const lines = () => p.evaluate((j) => (_photoRefs[j] || []).filter((r) => !r.deletedAt && r.label === 'inventory').length, J);
    // The open record of a line: the block under its row (the padding is the record's own).
    const rec = (id) => '#inv-cu-' + id + ' >> xpath=ancestor::div[contains(@style,"padding:10px 4px 12px 52px")][1]';

    await p.goto(APP); await p.waitForTimeout(1600);
    sheet = await p.evaluate(([J, SYNC]) => {
      SHEETS_SYNC_URL = SYNC;
      try { localStorage.setItem('hav_device_user', 'Anthony Graziano'); } catch (e) {}
      const T = Date.now() - 2 * 86400000;
      jobs.unshift({ id: J, hvlId: 'HVL-2610-OO2', name: 'Margaret Ellison', svc: 'cleanout', matterType: 'trust', addr: '12 Via Mizner', city: 'Palm Beach', zip: '33480',
        executor: 'Katherine Ellison', executorRole: 'Successor Trustee', executorEmail: 'kate@example.com', deathDate: '2026-08-14', executorAuth: 'received',
        trustName: 'Ellison Family Trust', docTier: 'values', gate706: 'no', status: 'active', won: true, wonAt: '2026-10-01', approved: true, tc: 'Ashley Jerome',
        created: '2026-09-28', start: '2026-10-12', activatedOn: '2026-10-10', agrApproved: true, agrSent: true, agrSigned: true, sqft: 3800,
        driveFolder: 'https://drive.google.com/drive/folders/R' + J, driveSubfolders: { 'Estate Inventory': 'INV_OO', 'As-Found Record': 'AF_OO' }, at: {},
        payments: [{ uid: 'd' + J, stage: 'deposit', amount: 12000, receivedOn: '2026-10-08', method: 'wire', clearedOn: '2026-10-08' }] });
      estimateStore[J] = { approved: true, submitted: true, approvedBy: 'Anthony Graziano', savedAt: T,
        estimate: { jobId: J, svc: 'cleanout', havellinTotal: 24000, fixedPrice: true, fixedAmount: 24000, fixedLines: true, totTC: 60, totPS: 90, days: 5,
          vendors: [], prepItems: [], rooms: [{ idx: 2, name: 'Kitchen', st: 'in', vol: 3, cplx: 3 }, { idx: 1, name: 'Foyer', st: 'in', vol: 2, cplx: 2 }] } };
      const photo = (id, file, n, room) => ({ label: 'inventory', collId: null, roomIdx: room == null ? 2 : room, seq: n, status: 'uploaded', ts: T + n * 60000,
        filename: 'HVL-2610-OO2_Kitchen_INV_' + id + '.jpg', driveFileId: file, driveFileUrl: 'https://drive.google.com/file/d/' + file + '/view' });
      const agent = (n, cat) => ({ namedBy: 'agent', agentConf: 'medium', agentAt: T + n * 60000 + 5000, category: cat || 'General/Household', disposition: 'Sell', updatedAt: T + n * 60000 + 5000 });
      _photoRefs[J] = [
        // Valued by the old agents: $75 for seven as "Online comps", a count in the name, no condition.
        Object.assign({ stableId: 'cab', itemNo: 78, qty: 7, fmv: 75, valLow: 45, valHigh: 120, valuedBy: 'agent', valSource: 'Online comps', valConf: 'low', valAgentAt: T,
          objectName: 'Crescent (bone/salad) dishes in green cabbage-leaf majolica-style glazed earthenware, unmarked underside, likely Portuguese cabbageware, set of 7',
          valNameAt: 'Crescent (bone/salad) dishes in green cabbage-leaf majolica-style glazed earthenware, unmarked underside, likely Portuguese cabbageware, set of 7' },
          photo('78', 'FID_CAB', 1), agent(1)),
        { stableId: 'cabd', label: 'detail', groupId: 'cab', roomIdx: 2, status: 'uploaded', ts: T + 90000, filename: 'HVL-2610-OO2_Kitchen_DET_78.jpg',
          driveFileId: 'FID_CABD', driveFileUrl: 'https://drive.google.com/file/d/FID_CABD/view', updatedAt: T + 90000 },
        Object.assign({ stableId: 'print', itemNo: 12, qty: 1, objectName: 'Glossy frameless photographic print, beach scene' }, photo('12', 'FID_PR', 2, 1), agent(2)),
        Object.assign({ stableId: 'sofa', itemNo: 30, qty: 1, objectName: 'Upholstered three-seat sofa', condition: 'Fair', condBy: 'desk', fmv: 400, valuedBy: 'desk' },
          photo('30', 'FID_SO', 3), agent(3, 'Furniture')),
        Object.assign({ stableId: 'new', itemNo: 40, objectName: '', agentAt: 0, updatedAt: T + 4 * 60000 }, photo('40', 'FID_NEW', 4))];
      savePhotoRefs(J); saveJobs(); localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore));
      const out = {}; out[J] = { items: JSON.parse(localStorage.getItem('hav_media_' + J) || '[]') };
      return out;
    }, [J, SYNC]);

    const toDesk = async () => {
      await p.click('.nb[onclick*="\'inventory\'"]'); await p.waitForTimeout(800);
      const cur = await p.evaluate(() => (document.getElementById('inv-job') || {}).value);
      if (String(cur) !== String(J)) { await p.selectOption('#inv-job', String(J)); await p.waitForTimeout(1300); }
      if (await p.locator('#panel-inventory button[onclick="setInvWhen(\'all\')"]').count()) { await p.click('#panel-inventory button[onclick="setInvWhen(\'all\')"]'); await p.waitForTimeout(600); }
    };
    const open = async (id) => {
      if (!(await p.evaluate((id) => !!document.getElementById('inv-cu-' + id), id))) { await p.click('button[onclick="_invToggleOpen(\'' + id + '\')"]'); await p.waitForTimeout(700); }
      return p.evaluate((id) => !!document.getElementById('inv-cu-' + id), id);
    };

    // ── A ─────────────────────────────────────────────────────────────────────────────────────
    await section('A. the plates\' record: photographs open in Drive, the buttons beside the photograph, + Another item says what it did', async () => {
      await toDesk();
      ok(await open('cab'), 'the plates\' record is open');
      const R = rec('cab');
      const hrefs = await p.locator(R + ' >> a.inv-drive-link').evaluateAll((as) => as.map((a) => [a.getAttribute('href'), a.getAttribute('target'), a.textContent.trim()]));
      eq(hrefs, [['https://drive.google.com/file/d/FID_CAB/view', '_blank', 'Open in Drive ↗'], ['https://drive.google.com/file/d/FID_CABD/view', '_blank', 'Open in Drive ↗']],
         '⚠⚠ the photograph and its close-up each open their own file in Drive, in a new tab, with a small link under each');
      eq(await p.locator(R + ' >> a.inv-photo-link').count(), 2, 'and each picture is itself the link');
      lacks(await p.locator(R).first().textContent(), 'Open photo in Drive', 'the big button is gone');
      const tops = await p.evaluate(() => { const acts = document.querySelector('.inv-rec-acts'); if (!acts) return null;
        return [...acts.querySelectorAll('.btn-s')].map((x) => Math.round(x.getBoundingClientRect().top)); });
      ok(tops && tops.length >= 4 && Math.max.apply(null, tops) - Math.min.apply(null, tops) <= 1, '⚠ + Close-up sits level with the other buttons (tops ' + JSON.stringify(tops) + ')');
      const before = await lines();
      await press(R + ' >> button:has-text("Another item in this photo")', '+ Another item in this photo');
      eq(await lines(), before + 1, 'one blank line added off the photograph');
      const toast = await p.evaluate(() => (document.getElementById('sync-badge') || document.body).textContent);
      has(toast, 'added for another thing in this photograph: type its name on its row, or press Name shots and Agent One names it', '⚠⚠ the toast says what the press did and what to do next');
      const geo = await p.evaluate(() => {
        const acts = document.querySelector('.inv-rec-acts'), cell = acts && acts.parentElement.querySelector('.inv-photo-cell');
        if (!acts || !cell) return null;
        const a = acts.getBoundingClientRect(), c = cell.getBoundingClientRect();
        return { beside: a.left >= c.right - 1, top: Math.round(a.top - c.top), sibs: (acts.querySelector('.inv-rec-sibs') || {}).textContent || '' };
      });
      ok(geo && geo.beside && geo.top < 40, '⚠⚠ with two lines on the photograph the buttons stay beside it, not under it (' + JSON.stringify(geo && { beside: geo.beside, top: geo.top }) + ')');
      has(geo && geo.sibs, 'This photograph carries 2 lines', 'the sentence naming its lines wraps inside the column');
      dismissBlank = true;
      const n0 = said.length;
      await press(rec('cab') + ' >> button:has-text("Another item in this photo")', '+ Another item in this photo, again');
      ok(said.slice(n0).some((m) => /has no name yet\. Add another blank line anyway\?/.test(m)), '⚠ a second press while the first blank line is unnamed asks first');
      eq(await lines(), before + 1, 'and Cancel adds nothing');
      dismissBlank = false;
      // The blank line goes again, as Anthony would: Remove line in its record.
      await p.evaluate((j) => { const r = (_photoRefs[j] || []).find((x) => x.derivedFrom === 'cab' && !x.deletedAt); if (r) _invTombstoneLine(j, r); savePhotoRefs(j); renderInventoryTab(); }, J);
      await p.waitForTimeout(400);
      eq(await lines(), before, 'fixture: the blank line taken off again');
    });

    // ── B ─────────────────────────────────────────────────────────────────────────────────────
    await section('B. Re-value on the selection bar: Agent Two again, its own figures only; whole dollars each; condition graded', async () => {
      await p.evaluate(() => { _invOpen = {}; renderInventoryTab(); }); await p.waitForTimeout(400);
      for (const id of ['cab', 'print', 'sofa']) { await p.click('#inv-row-' + id + ' input[title="Select for a bulk change"]'); await p.waitForTimeout(250); }
      const n0 = said.length, v0 = net.value.length;
      await press('#panel-inventory .inv-bulk button:has-text("Re-value")', 'Re-value on the selection bar');
      await p.waitForTimeout(2000);
      const ask = said.slice(n0).join('\n');
      has(ask, 'Value 2 lines again with Agent Two?', 'the confirm counts the lines that go');
      has(ask, '1 carries a value a person or an appraiser recorded and is left as it is.', '⚠ and names the sofa\'s figure as left alone');
      eq(net.value.length, v0 + 1, 'one request out');
      const sent = {}; ((net.value[net.value.length - 1] || {}).items || []).forEach((it) => { sent[it.stableId] = it; });
      eq(Object.keys(sent).sort(), ['cab', 'print'], '⚠⚠ the plates and the print; never the sofa a person valued');
      eq([sent.cab && sent.cab.fileId, sent.print && sent.print.fileId], ['FID_CAB', 'FID_PR'], '⚠ each with its photograph, since nobody has graded it');
      eq(((net.value[net.value.length - 1] || {}).context || {}).conditions, ['Excellent', 'Good', 'Fair', 'Poor'], 'the grades ride the request');
      const cab = await line('cab'), print = await line('print'), sofa = await line('sofa');
      eq([cab.fmv, cab.each, cab.lo, cab.hi], [77, 11, 42, 119], '⚠⚠ $75 for seven reads $11 each, $77, the range with it (Anthony: "Whole dollars each")');
      eq([cab.cond, cab.condBy, print.cond, print.condBy], ['Good', 'agent', 'Excellent', 'agent'], '⚠⚠ condition graded off the photograph (Anthony: "Agents grade it")');
      eq(cab.name, 'Green cabbage-leaf majolica crescent salad plates, likely Portuguese', 'the old name, with its count, corrected');
      eq([sofa.cond, sofa.fmv, sofa.by], ['Fair', 400, 'desk'], 'the sofa\'s grade and figure, a person\'s, untouched');
      const each = await p.evaluate(() => { const r = document.getElementById('inv-row-cab'); const i = r && r.querySelector('.inv-c-each input'); return i ? i.value : ''; });
      eq(each, '$11', 'the row\'s Each box reads $11');
      ok(await open('print'), 'the print\'s record is open');
      eq(await p.evaluate(() => { const s = [...document.querySelectorAll('select')].find((x) => /_invEdit\(\d+,'print','condition'/.test(x.getAttribute('onchange') || '')); return s ? s.value : null; }),
         'Excellent', 'its record\'s Condition reads Excellent');
    });

    // ── C ─────────────────────────────────────────────────────────────────────────────────────
    await section('C. Agent One grades as it names', async () => {
      await p.evaluate(() => { _invOpen = {}; try { _invClearPicks(); } catch (e) {} renderInventoryTab(); }); await p.waitForTimeout(400);
      await press('#inv-workbar button:has-text("Name 1 shot")', 'Name 1 shot on the work bar');
      await p.waitForTimeout(2500);
      eq(net.name.length, 1, 'fixture: Agent One went out');
      eq(((net.name[0] || {}).context || {}).conditions, ['Excellent', 'Good', 'Fair', 'Poor'], 'Agent One is sent the grades');
      const n = await line('new');
      eq([n.name, n.cond, n.condBy], ['Rattan side chair', 'Good', 'agent'], '⚠ its grade lands with the name');
      eq(await overflow(), 0, 'no horizontal overflow at 1440');
      await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(600);
      eq(await overflow(), 0, 'no horizontal overflow at 390');
    });

    eq(errs, [], 'zero page errors');
    console.log('\n' + pass + ' passed, ' + fail + ' failed');
    await b.close();
    process.exit(fail ? 1 : 0);
  } catch (e) {
    console.log('step 109 threw: ' + (e && e.stack || e));
    if (b) await b.close().catch(() => {});
    process.exit(1);
  }
})();
