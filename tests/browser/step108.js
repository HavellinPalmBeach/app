// Step 108 — the agents' once-over (2026-10-26): what the TC sees after the agents have worked a room.
//
// Anthony: *"make sure they are acting in concert … so that naming and pricing are as accurate as possible on the first pass and so
// that TC oversight is minimized and made as simple as possible"*.
//
// Drives the REAL page with an active trust estate whose kitchen has four Items photographs Agent One has read: one it found
// nothing in (a drawer of socks), a stack of plates whose origin it guessed ("likely Italian"), a lamp it was unsure of, filed
// Antiques, and everyday flatware it was sure of. Job Admin & Inv through its own nav button, the client through its picker:
//   A. The empty photograph's row reads *nothing to list* and no Name shots button asks to send it again. Check 1 room pressed:
//      Agent Two follows by itself; the plates (a guess) go as an everyday lot WITH their photograph and the room; the lamp is
//      researched; the flatware goes as text. Its answers land: the plates renamed Spanish, the lamp re-filed Furniture as a
//      1990s reproduction, the lamp's figure unsure.
//   B. The Unsure chip, third on the strip, counts 1; pressed, the lamp is the line on screen and the plates are not.
//   C. The plates and the lamp ticked and Mark reviewed pressed: the bar names the unsure line it swept past.
//   C2. (On review) Mark reviewed on one of two lines off a photograph claims nothing off the list; on the second, the note left it.
//   D. + Close-up added to the flatware's record (unreviewed, Agent Two's figure): once in Drive, Agent Two values the flatware
//      again by itself, researched, with the close-up.
//   At 1440 and 390 px no horizontal overflow; zero page errors throughout.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step108.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
const SYNC = 'https://sync.example.test/exec';
const J = 9853;
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');
// A real JPEG (1x1), so the browser's image decode in compressImage succeeds.
const jpeg = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
    const net = { value: [], room: [], uploads: [] };
    let sheet = {};
    await ctx.route(SYNC + '**', async (r) => {
      const req = r.request();
      const json = (o) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
      if (req.method() === 'POST') {
        let body = {}; try { body = JSON.parse(req.postData() || '{}'); } catch (e) {}
        if (body.action === 'uploadFile') {
          net.uploads.push(body.filename);
          const n = net.uploads.length;
          return json({ ok: true, fileUrl: 'https://drive.google.com/file/d/cu' + n + '/view', fileId: 'cu' + n });
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
            const base = { confidence: 'high', source: 'General estimate', basis: 'The going used rate', comps: [], lookup: '', notices: [], mode: it.mode || 'general', category: '' };
            if (it.stableId === 'pl') results.pl = Object.assign(base, { fmv: 200, low: 160, high: 240, name: 'Hand-painted tin-glazed plates, yellow bird pattern, likely Spanish' });
            else if (it.stableId === 'lamp') results.lamp = Object.assign(base, { fmv: 120, low: 60, high: 180, confidence: 'low', category: 'Furniture', name: 'Brass table lamp, 1990s reproduction' });
            else if (it.stableId === 'fw') results.fw = Object.assign(base, { fmv: it.mode === 'comps' ? 75 : 50, low: 40, high: 90, name: it.name });
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
    const said = []; p.on('dialog', async (d) => { said.push(d.message()); await d.accept(); });
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
    const txt = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }, sel);
    const line = (id) => p.evaluate(([j, id]) => { const r = (_photoRefs[j] || []).find((x) => x.stableId === id) || {};
      return { name: r.objectName, cat: r.category, fmv: r.fmv, conf: r.valConf, by: r.valuedBy, rev: !!r.reviewed, from: r.valNameFrom || '' }; }, [J, id]);

    await p.goto(APP); await p.waitForTimeout(1600);
    sheet = await p.evaluate(([J, SYNC]) => {
      SHEETS_SYNC_URL = SYNC;
      try { localStorage.setItem('hav_device_user', 'Ashley Jerome'); } catch (e) {}
      const T = Date.now() - 2 * 86400000;
      jobs.unshift({ id: J, hvlId: 'HVL-2610-OO1', name: 'Margaret Ellison', svc: 'cleanout', matterType: 'trust', addr: '12 Via Mizner', city: 'Palm Beach', zip: '33480',
        executor: 'Katherine Ellison', executorRole: 'Successor Trustee', executorEmail: 'kate@example.com', deathDate: '2026-08-14', executorAuth: 'received',
        trustName: 'Ellison Family Trust', docTier: 'values', gate706: 'no', status: 'active', won: true, wonAt: '2026-10-01', approved: true, tc: 'Ashley Jerome',
        created: '2026-09-28', start: '2026-10-12', activatedOn: '2026-10-10', agrApproved: true, agrSent: true, agrSigned: true, sqft: 3800,
        driveFolder: 'https://drive.google.com/drive/folders/R' + J, driveSubfolders: { 'Estate Inventory': 'INV_OO', 'As-Found Record': 'AF_OO' }, at: {},
        payments: [{ uid: 'd' + J, stage: 'deposit', amount: 12000, receivedOn: '2026-10-08', method: 'wire', clearedOn: '2026-10-08' }] });
      estimateStore[J] = { approved: true, submitted: true, approvedBy: 'Anthony Graziano', savedAt: T,
        estimate: { jobId: J, svc: 'cleanout', havellinTotal: 24000, fixedPrice: true, fixedAmount: 24000, fixedLines: true, totTC: 60, totPS: 90, days: 5,
          vendors: [], prepItems: [], rooms: [{ idx: 2, name: 'Kitchen', st: 'in', vol: 3, cplx: 3 }] } };
      const photo = (id, file, n) => ({ label: 'inventory', collId: null, roomIdx: 2, seq: n, status: 'uploaded', ts: T + n * 60000, filename: 'HVL-2610-OO1_Kitchen_INV_' + id + '.jpg',
        driveFileId: file, driveFileUrl: 'https://drive.google.com/file/d/' + file + '/view' });
      const agent = (conf, n, cat) => ({ namedBy: 'agent', agentConf: conf, agentAt: T + n * 60000 + 5000, category: cat || 'General/Household', disposition: 'Sell', updatedAt: T + n * 60000 + 5000 });
      _photoRefs[J] = [
        Object.assign({ stableId: 'emp', itemNo: 1, objectName: '', agentAt: T + 5000, agentConf: 'none', updatedAt: T + 5000 }, photo('1', 'FID_EMP', 1)),
        Object.assign({ stableId: 'pl', itemNo: 2, objectName: 'Hand-painted plates, yellow bird pattern, likely Italian', qty: 8, agentBasis: 'glaze and pattern; nothing legible' }, photo('2', 'FID_PL', 2), agent('medium', 2)),
        Object.assign({ stableId: 'lamp', itemNo: 3, objectName: 'Brass table lamp', qty: 1, agentBasis: 'form only' }, photo('3', 'FID_LA', 3), agent('low', 3, 'Antiques')),
        Object.assign({ stableId: 'fw', itemNo: 4, objectName: 'Everyday stainless flatware', qty: 60 }, photo('4', 'FID_FW', 4), agent('high', 4)),
        // C2 (on review): one photograph, two lines; Agent One's Look at this sits on the photograph's own line. Valued by the desk, so
        // Agent Two leaves both alone.
        Object.assign({ stableId: 'co', itemNo: 5, objectName: 'Wool coats', qty: 6, fmv: 60, valuedBy: 'desk', valSource: 'Online comps',
          agentNotices: [{ kind: 'other', text: 'a label on the strongbox is blurred' }] }, photo('5', 'FID_CO', 5), agent('high', 5)),
        Object.assign({ stableId: 'sb', itemNo: 6, objectName: 'Grey strongbox', qty: 1, fmv: 20, valuedBy: 'desk', valSource: 'Online comps', derivedFrom: 'co' },
          photo('5', 'FID_CO', 6), agent('high', 6))];
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

    // ── A ─────────────────────────────────────────────────────────────────────────────────────
    await section('A. nothing to list; the room check, then Agent Two: the guessed name seen, the lamp researched and re-filed', async () => {
      await toDesk();
      has(await txt('#inv-row-emp'), 'nothing to list', '⚠ the photograph Agent One found nothing in says so on its row');
      eq(await p.locator('#inv-workbar button:has-text("Name 1 shot")').count(), 0, '⚠ and no Name shots button asks to send it again');
      await press('#inv-workbar button:has-text("Check 1 room")', 'Check 1 room, on the work bar');
      await p.waitForTimeout(2500);
      eq(net.room.length, 1, 'fixture: the room check went out once');
      eq(net.value.length, 1, 'Agent Two went out by itself after it');
      const sent = {}; ((net.value[0] || {}).items || []).forEach((it) => { sent[it.stableId] = it; });
      eq(Object.keys(sent).sort(), ['fw', 'lamp', 'pl'], 'every named line with no value, never the empty photograph');
      eq([sent.pl && sent.pl.mode, sent.pl && sent.pl.fileId, sent.pl && sent.pl.room], ['general', 'FID_PL', 'Kitchen'], '⚠⚠ the guessed plates: an everyday lot WITH their photograph and the room');
      eq([sent.lamp && sent.lamp.mode, sent.fw && sent.fw.mode, sent.fw && sent.fw.fileId], ['comps', 'general', ''], 'the unsure lamp researched; the sure flatware as text');
      ok(Array.isArray((net.value[0] || {}).context && net.value[0].context.categories), 'the category list rides the request');
      const pl = await line('pl'), lamp = await line('lamp');
      eq([pl.name, pl.from], ['Hand-painted tin-glazed plates, yellow bird pattern, likely Spanish', 'Hand-painted plates, yellow bird pattern, likely Italian'], '⚠ the plates renamed from what Agent Two saw, the old name kept on the record');
      eq([lamp.cat, lamp.name], ['Furniture', 'Brass table lamp, 1990s reproduction'], '⚠⚠ the lamp re-filed Furniture with its corrected name (Anthony: "same rule as the name")');
      has(await txt('#inv-row-lamp'), 'unsure', 'the lamp\'s figure was a guess: unsure');
      lacks(await txt('#inv-row-pl'), 'unsure', 'the plates\' was not');
    });

    // ── B ─────────────────────────────────────────────────────────────────────────────────────
    await section('B. the Unsure chip gathers the guesses', async () => {
      const chips = await p.evaluate(() => [...document.querySelectorAll('#panel-inventory button[onclick^="setInvFlag("]')].map((x) => x.getAttribute('onclick')).slice(0, 3));
      eq(chips, ["setInvFlag('unnamed')", "setInvFlag('unreviewed')", "setInvFlag('unsure')"], '⚠ Unsure, third, beside Not reviewed');
      has(await txt('#panel-inventory button[onclick="setInvFlag(\'unsure\')"]'), '1', 'counting the one unsure line');
      await press('#panel-inventory button[onclick="setInvFlag(\'unsure\')"]', 'the Unsure chip');
      ok(await vis('#inv-row-lamp'), '⚠ pressed: the lamp is on screen');
      ok(!(await vis('#inv-row-pl')) && !(await vis('#inv-row-fw')), '…and the sure lines are not');
      await press('#panel-inventory button[onclick="setInvFlag(\'unsure\')"]', 'the Unsure chip again, to show everything');
      ok(await vis('#inv-row-pl'), 'everything back');
    });

    // ── C ─────────────────────────────────────────────────────────────────────────────────────
    await section('C. Mark reviewed names the unsure line it swept past', async () => {
      await p.click('#inv-row-pl input[title="Select for a bulk change"]');
      await p.click('#inv-row-lamp input[title="Select for a bulk change"]');
      await p.waitForTimeout(300);
      await press('#panel-inventory button:has-text("Mark reviewed")', 'Mark reviewed on the bulk bar');
      const panel = await txt('#panel-inventory');
      has(panel, '2 items marked reviewed.', 'the bar says what it did');
      has(panel, '1 of them was marked unsure: #3', '⚠⚠ and names the unsure line the sweep passed');
      eq([(await line('pl')).rev, (await line('lamp')).rev], [true, true], 'both reviewed (a flag, never a refusal)');
      await p.evaluate(() => { try { _invClearPicks(); } catch (e) {} }); await p.waitForTimeout(200);
    });

    // ── C2 ────────────────────────────────────────────────────────────────────────────────────
    await section('C2. on review: Mark reviewed claims a note off the list only when it has left it (a Look at this goes quiet per photograph)', async () => {
      const notes = () => p.evaluate(() => { const el = [...document.querySelectorAll('#panel-inventory div')].find((d) => /^Agent One raised \d+ thing/.test(d.textContent.trim()));
        return el ? el.parentElement.textContent.replace(/\s+/g, ' ') : ''; });
      has(await notes(), 'a label on the strongbox is blurred', 'fixture: the note is on the list above the rows');
      await p.click('#inv-row-co input[title="Select for a bulk change"]'); await p.waitForTimeout(300);
      await press('#panel-inventory button:has-text("Mark reviewed")', 'Mark reviewed on the coats alone');
      lacks(await txt('#panel-inventory'), 'carried an agent', '⚠⚠ the coats ticked alone: the strongbox off the same photograph is unreviewed, so no note is claimed off the list');
      has(await notes(), 'a label on the strongbox is blurred', '…and the note is indeed still there');
      await p.evaluate(() => { try { _invClearPicks(); } catch (e) {} }); await p.waitForTimeout(200);
      await p.click('#inv-row-sb input[title="Select for a bulk change"]'); await p.waitForTimeout(300);
      await press('#panel-inventory button:has-text("Mark reviewed")', 'Mark reviewed on the strongbox');
      has(await txt('#panel-inventory'), '1 carried an agent\u2019s note, now off the list (still in each record): #5', '⚠⚠ the strongbox ticked: the bar says the note left the list, naming the line that carries it');
      lacks(await notes(), 'a label on the strongbox is blurred', '…and it has');
      await p.evaluate(() => { try { _invClearPicks(); } catch (e) {} }); await p.waitForTimeout(200);
    });

    // ── D ─────────────────────────────────────────────────────────────────────────────────────
    await section('D. + Close-up on the flatware: Agent Two values it again by itself, with the close-up', async () => {
      const before = net.value.length;
      await p.evaluate(() => { try { setInvFlag('all'); } catch (e) {} renderInventoryTab(); });
      await p.waitForTimeout(500);
      const tog = 'button[onclick="_invToggleOpen(\'fw\')"]';
      if (!(await p.evaluate(() => !!document.getElementById('inv-cu-fw')))) { await p.click(tog); await p.waitForTimeout(600); }
      ok(await p.evaluate(() => !!document.getElementById('inv-cu-fw')), 'the flatware\'s record is open');
      const add = '#inv-cu-fw >> xpath=ancestor::div[contains(@style,"padding:10px 4px 12px 52px")][1] >> label.inv-cu-add';
      ok(await vis(add), '+ Close-up on screen in the record');
      const [chooser] = await Promise.all([p.waitForEvent('filechooser', { timeout: 5000 }), p.click(add)]);
      await chooser.setFiles({ name: 'IMG_0920.jpg', mimeType: 'image/jpeg', buffer: jpeg });
      await p.waitForTimeout(2500);
      eq(net.uploads.length, 1, 'fixture: the close-up went to Drive');
      eq(net.value.length, before + 1, '⚠⚠ and Agent Two went out again by itself');
      const it = ((net.value[net.value.length - 1] || {}).items || [])[0] || {};
      eq([it.stableId, it.mode], ['fw', 'comps'], 'for the flatware, researched');
      ok((it.details || []).some((d) => d.fileId === 'cu1'), '⚠ with the close-up just added');
      eq((await line('fw')).fmv, 75, 'its new figure on the line');
      eq(await overflow(), 0, 'no horizontal overflow at 1440');
      await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(600);
      eq(await overflow(), 0, 'no horizontal overflow at 390');
    });

    eq(errs, [], 'zero page errors');
    console.log('\n' + pass + ' passed, ' + fail + ' failed');
    await b.close();
    process.exit(fail ? 1 : 0);
  } catch (e) {
    console.log('step 108 threw: ' + (e && e.stack || e));
    if (b) await b.close().catch(() => {});
    process.exit(1);
  }
})();
