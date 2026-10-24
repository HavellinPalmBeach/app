// Step 103 — the desk's row as columns under headings, and a split line taking its photograph's destination (2026-10-24).
//
// Anthony, off the desk after a practice run: the value and recipient boxes had no heading ("maybe we can just label those
// two columns"), the count was in the record ("viewable at the headline level … so if it counts things wrong, we can quickly
// update it"), the full photo was in the record ("the link to the drive … at the headline level"), and a long name was cut
// off ("wrap the description text"). And the towels: one photograph of plates, bath towels and hand towels, Donate pressed
// in the house; Agent One split it into three and the bath towels sat in Not yet decided. He chose "Take the destination":
// a line split off a photograph starts with the photograph's destination and its recipient.
//
// Drives the REAL page through its own controls, on a living Home Cleanout:
//   A. the headings over each open group read Photo · # · Item · Qty · Value · Where it goes (· Who takes it where the rows
//      carry the box), each starting where its box starts on the first row, at 1440 and at 1024;
//   B. Name 1 shot pressed on the work bar, Agent One (a route, answering as the script does) finding plates, bath towels and
//      hand towels in the one photograph: all three lines in the Donate group, each Habitat for Humanity in Who takes it,
//      their counts 8, 4 and 1 in the Qty boxes, the spoken note on the photograph's own line only;
//   C. the bath towels' count typed into its box on the row (5, Tab): recorded; the line's record (▾ pressed) carries no
//      second count box;
//   D. the long name wraps: its box as tall as its text with nothing hidden; a longer name typed into it grows the box;
//      Enter ends the edit and the name is recorded;
//   E. the row's photograph pressed: the photograph's file in Drive opens in a new tab;
//   F. ➕ Another item in this photo pressed in the plates' record: the new line lands in Donate, Habitat for Humanity in
//      its box, no note;
//   G. at 390: no headings, each box named above it, nothing past the right edge; zero page errors.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step103.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
const SYNC = 'https://sync.example.test/exec';
const J = 9702;
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
    const net = { posts: [], name: [] };
    let sheet = {};
    await ctx.route(SYNC + '**', async (r) => {
      const req = r.request();
      const json = (o) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
      if (req.method() === 'POST') {
        let body = {}; try { body = JSON.parse(req.postData() || '{}'); } catch (e) {}
        net.posts.push(body);
        if (body.action === 'agentIdentify') return json(net.name.shift() || { ok: true, results: {}, failed: {}, remaining: 0 });
        if (body.action === 'agentRoomCheck') return json({ ok: true, results: {}, failed: {}, remaining: [] });
        return json({ ok: true });
      }
      if (/action=loadMedia/.test(req.url())) return json({ ok: true, media: sheet });
      return json({ ok: true });
    });
    // The photograph's file in Drive, answered here so the new tab has somewhere to land.
    await ctx.route('https://drive.google.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>Drive</title>photo' }));
    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    p.on('dialog', (d) => d.accept());
    const section = async (name, body) => {
      console.log('\n## ' + name);
      try { await body(); } catch (e) { fail++; console.log('  ✗ ' + name + ' threw: ' + String(e && e.message || e).split('\n')[0]); }
    };
    const vis = (sel) => p.locator(sel).first().isVisible().catch(() => false);
    const press = async (sel, what) => {
      const n = await p.locator(sel).count();
      const v = n === 1 && await vis(sel);
      ok(v, (what || sel) + ' — one control, on screen (' + n + ')');
      if (v) { await p.click(sel, { timeout: 5000 }).catch((e) => ok(false, (what || sel) + ' — ' + e.message.split('\n')[0])); await p.waitForTimeout(500); }
      return v;
    };
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const refs = () => p.evaluate((j) => JSON.parse(JSON.stringify((_photoRefs[j] || []).filter((r) => r.label === 'inventory' && !r.deletedAt))), J);
    const byName = async (start) => (await refs()).find((r) => String(r.objectName || '').indexOf(start) === 0) || null;

    await p.goto(APP); await p.waitForTimeout(1600);
    sheet = await p.evaluate(([J, SYNC]) => {
      SHEETS_SYNC_URL = SYNC;
      try { localStorage.setItem('hav_device_user', 'Ashley Jerome'); } catch (e) {}
      const T = Date.now() - 6 * 86400000;
      jobs.unshift({ id: J, hvlId: 'HVL-2610-C970', name: 'Robert Hale', fname: 'Robert', svc: 'home_cleanout', addr: '44 Sandpiper Ln', city: 'Jupiter', zip: '33458',
        email: 'rhale@example.com', phone: '(561) 555-0144', docTier: '', status: 'active', won: true, wonAt: '2026-10-01', approved: true, tc: 'Ashley Jerome', sqft: 3100,
        created: '2026-09-28', start: '2026-10-06', activatedOn: '2026-10-05', agrApproved: true, agrSent: true, agrSigned: true,
        driveFolder: 'https://drive.google.com/drive/folders/ROOT970', driveSubfolders: { 'Estate Inventory': 'INV970', 'As-Found Record': 'AF970' },
        payments: [{ uid: 'c1', stage: 'deposit', amount: 9000, receivedOn: '2026-10-01', method: 'wire', clearedOn: '2026-10-01' }] });
      estimateStore[J] = { approved: true, submitted: true, approvedBy: 'Anthony Graziano', savedAt: T,
        estimate: { jobId: J, svc: 'home_cleanout', havellinTotal: 12000, totTC: 30, totPS: 60, days: 4, vendors: [], prepItems: [],
          rooms: [{ idx: 0, name: 'Entryway / Foyer', st: 'in' }, { idx: 1, name: 'Kitchen', st: 'in' }] } };
      const L = (id, o) => Object.assign({ stableId: id, label: 'inventory', collId: null, roomIdx: 1, seq: 1, status: 'uploaded', category: 'General/Household',
        disposition: '', objectName: '', ts: T, updatedAt: T, filename: 'HVL-2610-C970_' + id + '.jpg', driveFileId: 'F-' + id,
        driveFileUrl: 'https://drive.google.com/file/d/F-' + id + '/view' }, o);
      _photoRefs[J] = [
        // The counter: Donate pressed in the house, the recipient taken from the Job Plan, the note said over it; not yet named.
        L('k80', { itemNo: 80, disposition: 'Donate', channel: 'Habitat for Humanity', fieldNote: 'all going to Habitat for Humanity, small plates and towels' }),
        L('a91', { itemNo: 91, roomIdx: 0, category: 'Art & Décor', needsAppr: true, namedBy: 'agent', agentConf: 'medium',
          objectName: 'Square frameless family photograph, color image printed on mounted panel (appears to be canvas or acrylic/gallery-wrap style), approx. 20 x 20 in., wall-mounted in the entry' }),
        L('e18', { itemNo: 18, roomIdx: 1, objectName: 'Stand mixer', disposition: 'Keep', namedBy: 'desk' })];
      savePhotoRefs(J); saveJobs();
      const out = {}; out[J] = { items: JSON.parse(localStorage.getItem('hav_media_' + J) || '[]') };
      return out;
    }, [J, SYNC]);
    const toDesk = async () => {
      await p.click('.nb[onclick*="\'inventory\'"]'); await p.waitForTimeout(800);
      const cur = await p.evaluate(() => (document.getElementById('inv-job') || {}).value);
      if (String(cur) !== String(J)) { await p.selectOption('#inv-job', String(J)); await p.waitForTimeout(1300); }
      if (await p.locator('#panel-inventory button[onclick="setInvWhen(\'all\')"]').count()) { await p.click('#panel-inventory button[onclick="setInvWhen(\'all\')"]'); await p.waitForTimeout(600); }
    };
    // Each heading's left edge against its box's on the group's first row.
    const lineUp = () => p.evaluate(() => {
      const out = [];
      document.querySelectorAll('#inventory-content [id^="inv-grp-"]').forEach((g) => {
        if (/^inv-grph-/.test(g.id)) return;
        const head = g.querySelector('.inv-colhead'), row = g.querySelector('[id^="inv-row-"] .inv-row-main');
        if (!head || !row) return;
        const words = [...head.children].map((s) => s.textContent.trim()).filter(Boolean);
        let worst = 0;
        [...head.children].forEach((s) => {
          const c = [...s.classList].find((k) => /^inv-c-/.test(k));
          const box = row.querySelector('.' + c) || (c === 'inv-c-pick' ? row.querySelector('input[type=checkbox]') : null);
          if (!box) { worst = 999; return; }
          worst = Math.max(worst, Math.abs(Math.round(s.getBoundingClientRect().left - box.getBoundingClientRect().left)));
        });
        out.push({ group: g.id.slice(8), words: words, worst: worst });
      });
      return out;
    });

    await section('A. the headings over each open group, each over its box', async () => {
      await toDesk();
      for (const w of [1440, 1024]) {
        await p.setViewportSize({ width: w, height: 1000 }); await p.waitForTimeout(400);
        const L = await lineUp();
        eq(L.map((x) => x.group), ['', 'Keep', 'Donate'], w + ' px: a row of headings over each open group (Not yet decided, Keep, Donate)');
        L.forEach((x) => {
          eq(x.words, ['Photo', '#', 'Item', 'Qty', 'Value', 'Where it goes'].concat(x.group === 'Donate' ? ['Who takes it'] : []),
             w + ' px, ' + (x.group || 'Not yet decided') + ': the headings name every box, Who takes it only where something leaves');
          ok(x.worst <= 1, w + ' px, ' + (x.group || 'Not yet decided') + ': ⚠ each heading starts where its box starts (worst ' + x.worst + ' px)');
        });
        eq(await overflow(), 0, w + ' px: nothing past the right edge');
      }
      await p.setViewportSize({ width: 1440, height: 1000 }); await p.waitForTimeout(300);
    });

    await section('B. Agent One splits the counter photograph: all three go where the photograph was going', async () => {
      net.name.push({ ok: true, failed: {}, remaining: 0, results: { k80: { notices: [], objects: [
        { name: 'White ceramic salad/dessert plates, coupe form', category: 'General/Household', qty: 8, confidence: 'medium', basis: '', crop: [0, 0, 1, 1] },
        { name: 'White cotton terry bath towels, folded', category: 'General/Household', qty: 4, confidence: 'medium', basis: '', crop: [0, 0, 1, 1] },
        { name: 'White cotton terry hand towels / washcloths, folded', category: 'General/Household', qty: 1, confidence: 'medium', basis: '', crop: [0, 0, 1, 1] }] } } });
      await press('#inv-workbar button:has-text("Name 1 shot")', 'Name 1 shot');
      await p.waitForTimeout(2500);
      const all = await refs();
      const three = all.filter((r) => r.stableId === 'k80' || r.derivedFrom === 'k80');
      eq(three.map((r) => [String(r.objectName).split(',')[0], r.disposition, r.channel || '']), [
        ['White ceramic salad/dessert plates', 'Donate', 'Habitat for Humanity'],
        ['White cotton terry bath towels', 'Donate', 'Habitat for Humanity'],
        ['White cotton terry hand towels / washcloths', 'Donate', 'Habitat for Humanity']], '⚠⚠ the towels go where the photograph was going, with its recipient');
      eq(three.map((r) => r.fieldNote || ''), ['all going to Habitat for Humanity, small plates and towels', '', ''], 'the note stays on the photograph’s own line');
      // On screen: in the Donate group, each with its count and its recipient in the boxes.
      const shown = await p.evaluate((ids) => ids.map((id) => {
        const row = document.getElementById('inv-row-' + id);
        if (!row) return null;
        const grp = row.closest('[id^="inv-grp-"]');
        return { grp: grp ? grp.id.slice(8) : null, qty: (row.querySelector('input.inv-qty') || {}).value, who: (row.querySelector('input.inv-recip') || {}).value };
      }), three.map((r) => r.stableId));
      eq(shown, [{ grp: 'Donate', qty: '8', who: 'Habitat for Humanity' }, { grp: 'Donate', qty: '4', who: 'Habitat for Humanity' }, { grp: 'Donate', qty: '1', who: 'Habitat for Humanity' }],
         'on the desk: all three under Donate, their counts in the Qty boxes, Habitat for Humanity in Who takes it');
      const L = await lineUp();
      const d = L.find((x) => x.group === 'Donate');
      eq(d && d.words, ['Photo', '#', 'Item', 'Qty', 'Value', 'Where it goes', 'Who takes it'], 'the Donate group heads Who takes it, over the box Anthony asked about');
      ok(d && d.worst <= 1, '…each heading over its box (worst ' + (d && d.worst) + ' px)');
      eq(L.find((x) => x.group === '') ? 'still' : 'gone', 'still', 'Not yet decided still holds the family photograph');
    });

    await section('C. the count typed on the row; none in the record', async () => {
      const bath = await byName('White cotton terry bath towels');
      const box = '#inv-row-' + (bath && bath.stableId) + ' input.inv-qty';
      ok(await vis(box), 'the bath towels’ Qty box is on the row');
      await p.fill(box, '5'); await p.press(box, 'Tab'); await p.waitForTimeout(500);
      eq(String((await byName('White cotton terry bath towels') || {}).qty), '5', '⚠ the count corrected on the row is recorded');
      await press('#inv-row-' + bath.stableId + ' button[onclick^="_invToggleOpen"]', 'the ▾ on the bath towels');
      eq(await p.locator('#inv-row-' + bath.stableId + ' input[onchange*="\'qty\'"]').count(), 1, 'one count box for the line, the row’s: the record carries none');
      ok(await vis('#inv-row-' + bath.stableId + ' button[onclick^="invRemoveLine("]'), 'fixture: the record is open (Remove line on screen)');
      await press('#inv-row-' + bath.stableId + ' button[onclick^="_invToggleOpen"]', 'the ▾ again, shut');
    });

    await section('D. the long name wraps, and grows as it is typed', async () => {
      const box = '#inv-row-a91 textarea';
      const m = () => p.evaluate((s) => { const t = document.querySelector(s); return t ? { h: t.clientHeight, sh: t.scrollHeight, v: t.value } : null; }, box);
      const before = await m();
      ok(before && before.h > 30, 'the name runs onto a second line (' + (before && before.h) + ' px tall)');
      ok(before && before.sh <= before.h + 1, '⚠ nothing of it hidden: the box is as tall as its text (' + (before && before.sh) + ' / ' + (before && before.h) + ')');
      has(before && before.v, 'wall-mounted in the entry', 'the whole name, its end included, is in the box');
      const longer = before.v + '; second panel of the same family behind it, matching frame, same wall, both going to the same place in the end';
      await p.click(box); await p.fill(box, longer); await p.waitForTimeout(200);
      const grown = await m();
      ok(grown && grown.h > before.h && grown.sh <= grown.h + 1, 'typed longer, the box grows with it (' + before.h + ' → ' + (grown && grown.h) + ' px)');
      await p.press(box, 'Enter'); await p.waitForTimeout(500);
      eq(await p.evaluate(() => document.activeElement && document.activeElement.tagName), 'BODY', 'Enter ends the edit');
      eq((await refs()).find((r) => r.stableId === 'a91').objectName, longer, '…and the name is recorded, with no line break in it');
    });

    await section('E. the row’s photograph opens its file in Drive', async () => {
      const a = '#inv-row-a91 a.inv-photo-link';
      eq(await p.evaluate((s) => { const el = document.querySelector(s); return el ? [el.getAttribute('href'), el.getAttribute('target')] : null; }, a),
         ['https://drive.google.com/file/d/F-a91/view', '_blank'], 'the photograph links the line’s file, in a new tab');
      const [tab] = await Promise.all([ctx.waitForEvent('page', { timeout: 5000 }), p.click(a)]);
      await tab.waitForLoadState().catch(() => {});
      eq(tab.url(), 'https://drive.google.com/file/d/F-a91/view', '⚠ pressed, the full photograph opens in Drive');
      await tab.close();
    });

    await section('F. Another item in this photo: the new line goes where the photograph was going', async () => {
      const before = (await refs()).length;
      await press('#inv-row-k80 button[onclick^="_invToggleOpen"]', 'the ▾ on the plates');
      await press('#inv-row-k80 button[onclick^="invSplitItemClick("]', '➕ Another item in this photo');
      const all = await refs();
      eq(all.length, before + 1, 'one new line');
      const nu = all.filter((r) => r.derivedFrom === 'k80' && !r.objectName)[0] || {};
      eq([nu.disposition, nu.channel, nu.fieldNote || ''], ['Donate', 'Habitat for Humanity', ''], 'Donate and Habitat for Humanity, and no note');
      const g = await p.evaluate((id) => { const r = document.getElementById('inv-row-' + id); const gg = r && r.closest('[id^="inv-grp-"]'); return gg ? gg.id.slice(8) : null; }, nu.stableId);
      eq(g, 'Donate', 'drawn under Donate, beside the photograph’s other lines');
      eq(await p.evaluate((id) => (document.querySelector('#inv-row-' + id + ' input.inv-recip') || {}).value, nu.stableId), 'Habitat for Humanity', 'its Who takes it box reads the recipient');
    });

    await section('G. at 390: no headings, each box named, nothing off the edge; zero page errors', async () => {
      await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(500);
      eq(await p.evaluate(() => [...document.querySelectorAll('.inv-colhead')].filter((h) => h.checkVisibility()).length), 0, 'no headings on a phone');
      const caps = await p.evaluate(() => {
        const row = document.getElementById('inv-row-k80');
        return ['qty', 'val', 'disp', 'who'].map((c) => { const el = row && row.querySelector('.inv-c-' + c); return el ? getComputedStyle(el, '::before').content : null; });
      });
      eq(caps, ['"Qty"', '"Value"', '"Where it goes"', '"Who takes it"'], 'each box names itself above it');
      eq(await overflow(), 0, 'nothing past the right edge at 390');
      const t = await p.evaluate(() => { const x = document.querySelector('#inv-row-a91 textarea'); return x ? [x.clientHeight, x.scrollHeight] : null; });
      ok(t && t[1] <= t[0] + 1, 'the long name still shows whole at 390 (' + (t && t.join(' / ')) + ')');
      await p.setViewportSize({ width: 1440, height: 1000 });
      eq(errs, [], 'zero page errors');
    });
  } catch (e) {
    fail++; console.log('  ✗ step103 threw: ' + (e && e.stack || e));
  } finally {
    if (b) await b.close();
  }
  console.log('\nstep103: ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
