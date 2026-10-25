// Step 107 — the agents in a line, one look per item, and Each × Qty = Total (2026-10-25b).
//
// Anthony, off the Ellison kitchen: *"we are supposed to be making this easy, with one review. not a multi tiered review"*;
// *"just figure out the best way for the agents to work together and to most accurately identify, describe, name, and price
// or value each item and minimize the work for the transition concierge"*; the mirror: *"maybe it's worth $1500 new, and then
// not $25 used, that's the point"*; the plates: *"the total value needs to be multiplied by the number in the group … both
// should be editable and the math should happen automatically"*.
//
// Drives the REAL page with an active trust estate whose kitchen has three photographs Agent One has named and nobody has
// valued: a wall mirror it was unsure of, a stack of eight plates, and kitchen shears. Job Admin & Inv through its own nav
// button, the client through its picker:
//   A. Check 1 room pressed on the work bar; the room check answers no doubles and Agent Two values the kitchen by itself:
//      one request, no confirm, the mirror sent to research, the plates and the shears as everyday lots. No Accept value
//      anywhere; the chip reads Not reviewed; the mirror's row says unsure.
//   B. The plates' row: Each $25 and Total $200 under the headings Qty · Each · Total, the boxes level with the count and
//      under their own headings. Qty typed 12: Total $300. Each typed $30: Total $360. Total typed $240: Each $20.
//   C. The mirror's name retyped "Restoration Hardware wall mirror, weathered oak frame": Agent Two values it again by itself,
//      researched, the name sent as checked by a person; its answer offers the generic name back and the typed name stands,
//      $450. The unsure hint goes. One tick on Reviewed and the Not reviewed count drops by one, the value accepted with it.
//   D. The shears renamed "Henckels kitchen shears" while Agent Two's answer is held back; the plates' name box is clicked
//      and typed into before it lands. The answer lands and the box keeps its focus and every typed letter; leaving the box
//      redraws, the shears' new figure on screen.
//   At 1440 and 390 px no horizontal overflow, and on a phone each box names itself; zero page errors throughout.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step107.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
const SYNC = 'https://sync.example.test/exec';
const J = 9852;
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');
const RH = 'Restoration Hardware wall mirror, weathered oak frame';

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
    const net = { value: [], room: [] };
    let hold = null;   // a promise the valuing route waits on (D)
    let sheet = {};
    await ctx.route(SYNC + '**', async (r) => {
      const req = r.request();
      const json = (o) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
      if (req.method() === 'POST') {
        let body = {}; try { body = JSON.parse(req.postData() || '{}'); } catch (e) {}
        if (body.action === 'agentRoomCheck') {
          net.room.push(body);
          const results = {}; (body.rooms || []).forEach((rm) => { results[rm.key] = { doubles: [] }; });
          return json({ ok: true, results: results, failed: {}, remaining: [] });
        }
        if (body.action === 'agentValue') {
          net.value.push(body);
          if (hold) await hold;
          const results = {};
          (body.items || []).forEach((it) => {
            const base = { confidence: 'medium', source: 'Online comps', basis: 'Going rate', comps: [], lookup: '', notices: [], mode: it.mode || 'general' };
            if (it.stableId === 'mir' && !it.nameChecked) results.mir = Object.assign(base, { fmv: 25, low: 15, high: 40, confidence: 'low', name: 'Wooden wall mirror' });
            // Offered the generic name back on a name a person typed: the typed name must stand.
            else if (it.stableId === 'mir') results.mir = Object.assign(base, { fmv: 450, low: 350, high: 600, source: 'Auction comps', name: 'Wooden wall mirror' });
            else if (it.stableId === 'pl') results.pl = Object.assign(base, { fmv: 200, low: 160, high: 240, name: 'White porcelain dinner plates' });
            else if (it.stableId === 'sh' && !it.nameChecked) results.sh = Object.assign(base, { fmv: 15, low: 10, high: 20, name: 'Kitchen shears' });
            else if (it.stableId === 'sh') results.sh = Object.assign(base, { fmv: 70, low: 55, high: 90, name: 'Henckels kitchen shears' });
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
      const v = n === 1 && await vis(sel);
      ok(v, (what || sel) + ' — one control, on screen (' + n + ')');
      if (v) { await p.click(sel, { timeout: 5000 }).catch((e) => ok(false, (what || sel) + ' — ' + e.message.split('\n')[0])); await p.waitForTimeout(700); }
      return v;
    };
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const txt = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }, sel);
    const line = (id) => p.evaluate(([j, id]) => { const r = (_photoRefs[j] || []).find((x) => x.stableId === id) || {};
      return { name: r.objectName, qty: r.qty, fmv: r.fmv, unit: r.unitVal, by: r.valuedBy, rev: !!r.reviewed, vrev: !!r.valReviewed, namedBy: r.namedBy }; }, [J, id]);
    const box = (sel) => p.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), v: e.value }; }, sel);
    // Type into a box and leave it, as a person does: the change fires on the way out.
    const typeIn = async (sel, value) => { await p.fill(sel, value); await p.press(sel, 'Tab'); await p.waitForTimeout(900); };
    const chipCount = async () => { const t = await txt('#panel-inventory button[onclick="setInvFlag(\'unreviewed\')"]'); const m = /(\d+)/.exec(t); return m ? +m[1] : null; };

    await p.goto(APP); await p.waitForTimeout(1600);
    sheet = await p.evaluate(([J, SYNC]) => {
      SHEETS_SYNC_URL = SYNC;
      try { localStorage.setItem('hav_device_user', 'Ashley Jerome'); } catch (e) {}
      const T = Date.now() - 2 * 86400000;
      jobs.unshift({ id: J, hvlId: 'HVL-2610-EK2', name: 'Margaret Ellison', svc: 'cleanout', matterType: 'trust', addr: '12 Via Mizner', city: 'Palm Beach', zip: '33480',
        executor: 'Katherine Ellison', executorRole: 'Successor Trustee', executorEmail: 'kate@example.com', deathDate: '2026-08-14', executorAuth: 'received',
        trustName: 'Ellison Family Trust', docTier: 'values', gate706: 'no', status: 'active', won: true, wonAt: '2026-10-01', approved: true, tc: 'Ashley Jerome',
        created: '2026-09-28', start: '2026-10-12', activatedOn: '2026-10-10', agrApproved: true, agrSent: true, agrSigned: true, sqft: 3800,
        driveFolder: 'https://drive.google.com/drive/folders/R' + J, driveSubfolders: { 'Estate Inventory': 'INV_EK', 'As-Found Record': 'AF_EK' }, at: {},
        payments: [{ uid: 'd' + J, stage: 'deposit', amount: 12000, receivedOn: '2026-10-08', method: 'wire', clearedOn: '2026-10-08' }] });
      estimateStore[J] = { approved: true, submitted: true, approvedBy: 'Anthony Graziano', savedAt: T,
        estimate: { jobId: J, svc: 'cleanout', havellinTotal: 24000, fixedPrice: true, fixedAmount: 24000, fixedLines: true, totTC: 60, totPS: 90, days: 5,
          vendors: [], prepItems: [], rooms: [{ idx: 2, name: 'Kitchen', st: 'in', vol: 3, cplx: 3 }] } };
      const photo = (id, file, n) => ({ label: 'inventory', collId: null, roomIdx: 2, seq: n, status: 'uploaded', ts: T + n * 60000, filename: 'HVL-2610-EK2_Kitchen_INV_' + id + '.jpg',
        driveFileId: file, driveFileUrl: 'https://drive.google.com/file/d/' + file + '/view' });
      const agent = (conf, n) => ({ namedBy: 'agent', agentConf: conf, agentAt: T + n * 60000 + 5000, category: 'General/Household', disposition: 'Sell', updatedAt: T + n * 60000 + 5000 });
      _photoRefs[J] = [
        Object.assign({ stableId: 'mir', itemNo: 1, objectName: 'Wooden wall mirror', qty: 1, agentBasis: 'form only' }, photo('1', 'FID_MIR', 1), agent('low', 1)),
        Object.assign({ stableId: 'pl', itemNo: 2, objectName: 'White porcelain dinner plates', qty: 8 }, photo('2', 'FID_PL', 2), agent('high', 2)),
        Object.assign({ stableId: 'sh', itemNo: 3, objectName: 'Kitchen shears', qty: 1 }, photo('3', 'FID_SH', 3), agent('medium', 3))];
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
    await section('A. the room check, then Agent Two by itself: one request, no confirm, the unsure mirror researched', async () => {
      await toDesk();
      await press('#inv-workbar button:has-text("Check 1 room")', 'Check 1 room, on the work bar');
      await p.waitForTimeout(2200);
      eq(net.room.length, 1, 'fixture: the room check went out once');
      eq(net.value.length, 1, '⚠⚠ Agent Two went out by itself after it, once');
      eq(said.filter((m) => /Value \d+ lines? on this job/.test(m)).length, 0, 'and asked nobody first: nothing to confirm');
      const sent = {}; ((net.value[0] || {}).items || []).forEach((it) => { sent[it.stableId] = it; });
      eq(Object.keys(sent).sort(), ['mir', 'pl', 'sh'], 'every named line with no value went');
      eq([sent.mir && sent.mir.mode, sent.pl && sent.pl.mode, sent.sh && sent.sh.mode], ['comps', 'general', 'general'], '⚠ the mirror Agent One was unsure of is researched; the others are everyday lots');
      eq([sent.mir && sent.mir.nameChecked, sent.pl && sent.pl.nameChecked], [false, false], 'Agent One\'s names are sent as its own, open to correction');
      eq((await line('pl')).fmv, 200, 'the plates valued as eight plates, the whole line');
      const desk = await txt('#panel-inventory');
      lacks(desk, 'Accept value', '⚠ no Accept value anywhere on the desk');
      lacks(desk, 'Unreviewed values', 'and no second-tier chip');
      eq(await chipCount(), 3, 'the one chip: Not reviewed, 3');
      has(await txt('#inv-row-mir'), 'unsure', 'the mirror\'s row says unsure, where the agents were guessing');
      lacks(await txt('#inv-row-pl'), 'unsure', 'the plates\' does not');
      lacks(await txt('#inv-row-pl'), 'agent value', 'and no agent-value badge on a figure');
    });

    // ── B ─────────────────────────────────────────────────────────────────────────────────────
    await section('B. Each × Qty = Total on the plates\' row, the boxes level and under their headings', async () => {
      const each = '#inv-each-pl', total = '#inv-fmv-pl', qty = '#inv-row-pl .inv-qty';
      eq([(await box(each) || {}).v, (await box(total) || {}).v], ['$25', '$200'], '⚠⚠ Each $25, Total $200: one plate\'s value and the stack\'s');
      const heads = await p.evaluate(() => [...document.querySelectorAll('#panel-inventory .inv-colhead')].slice(0, 1).map((h) => [...h.children].map((c) => c.textContent.trim()).filter(Boolean)));
      has((heads[0] || []).join(' · '), 'Qty · Each · Total', 'the headings read Qty · Each · Total');
      const q = await box(qty), e = await box(each), t = await box(total);
      ok(q && e && t && Math.abs(q.y - e.y) <= 2 && Math.abs(e.y - t.y) <= 2, '⚠ the value boxes sit level with the count (' + [q && q.y, e && e.y, t && t.y].join(', ') + ')');
      const colx = await p.evaluate(() => {
        const row = document.getElementById('inv-row-pl'), grp = row && row.closest('.inv-group, [id^="inv-grp"]') || document;
        const h = (grp.querySelector('.inv-colhead') || document.querySelector('.inv-colhead'));
        const hx = (c) => { const el = h && h.querySelector('.inv-c-' + c); return el ? Math.round(el.getBoundingClientRect().left) : null; };
        const rx = (c) => { const el = row && row.querySelector('.inv-c-' + c); return el ? Math.round(el.getBoundingClientRect().left) : null; };
        return { each: [hx('each'), rx('each')], val: [hx('val'), rx('val')] };
      });
      ok(colx.each[0] != null && Math.abs(colx.each[0] - colx.each[1]) <= 2, 'Each sits under its heading (' + colx.each.join(' / ') + ')');
      ok(colx.val[0] != null && Math.abs(colx.val[0] - colx.val[1]) <= 2, 'Total sits under its heading (' + colx.val.join(' / ') + ')');
      await typeIn(qty, '12');
      eq([(await line('pl')).fmv, (await box(total) || {}).v, (await box(each) || {}).v], [300, '$300', '$25'], '⚠⚠ Qty 12: Total $300 at the same Each, on the line and on screen');
      await typeIn(each, '30');
      eq([(await line('pl')).fmv, (await box(total) || {}).v], [360, '$360'], 'Each $30: Total $360');
      await typeIn(total, '240');
      eq([(await line('pl')).fmv, (await box(each) || {}).v], [240, '$20'], 'Total $240: Each $20');
      eq((await line('pl')).by, 'desk', 'a figure typed is the desk\'s');
    });

    // ── C ─────────────────────────────────────────────────────────────────────────────────────
    await section('C. the mirror renamed: valued again by itself, researched, priced as typed; one tick reviews it', async () => {
      const before = net.value.length;
      await typeIn('#inv-row-mir .inv-name textarea', RH);
      await p.waitForTimeout(1600);
      eq(net.value.length, before + 1, '⚠⚠ the rename sent the mirror to Agent Two by itself');
      const it = ((net.value[net.value.length - 1] || {}).items || [])[0] || {};
      eq([it.stableId, it.mode, it.nameChecked, it.name], ['mir', 'comps', true, RH], 'researched, the typed name sent as checked by a person');
      const m = await line('mir');
      eq([m.name, m.fmv, m.by], [RH, 450, 'agent'], '⚠⚠ the typed name stands (the generic one offered back is refused) and it is priced as that: $450');
      await p.evaluate(() => renderInventoryTab()); await p.waitForTimeout(500);
      lacks(await txt('#inv-row-mir'), 'unsure', 'the unsure hint has gone: a person has named it');
      const n0 = await chipCount();
      await press('#inv-row-mir input[type="checkbox"][onchange*="_invSetReviewed"]', 'the mirror\'s Reviewed tick');
      const m2 = await line('mir');
      eq([m2.rev, m2.vrev], [true, true], '⚠ one tick: the line reviewed and its value accepted with it');
      eq(await chipCount(), n0 - 1, 'Not reviewed drops by one');
    });

    // ── D ─────────────────────────────────────────────────────────────────────────────────────
    await section('D. a run answering while somebody types elsewhere keeps their box and their letters', async () => {
      let release; hold = new Promise((res) => { release = res; });
      const before = net.value.length;
      await typeIn('#inv-row-sh .inv-name textarea', 'Henckels kitchen shears');
      await p.waitForTimeout(600);
      eq(net.value.length, before + 1, 'fixture: the shears went to Agent Two, its answer held back');
      await p.click('#inv-row-pl .inv-name textarea');
      await p.keyboard.press('End');
      await p.keyboard.type(', gold rim');
      release(); hold = null;
      await p.waitForTimeout(1500);
      eq((await line('sh')).fmv, 70, 'fixture: the answer has landed on the line');
      const st = await p.evaluate(() => { const a = document.activeElement; return { inPl: !!(a && a.closest && a.closest('#inv-row-pl')), v: a && a.value }; });
      ok(st.inPl, '⚠⚠ the plates\' name box still has the focus');
      has(st.v || '', ', gold rim', '⚠⚠ and every letter typed into it');
      // Tab moves into the next box on the row, which is still somebody working: the redraw keeps waiting.
      await p.press('#inv-row-pl .inv-name textarea', 'Tab'); await p.waitForTimeout(900);
      has((await line('pl')).name, ', gold rim', 'leaving the box saves what was typed');
      eq((await box('#inv-fmv-sh') || {}).v, '$15', 'tabbed into the next box: still waiting');
      // Done with the boxes: a click on the headings, nothing to type in.
      await p.click('#panel-inventory .inv-colhead'); await p.waitForTimeout(900);
      eq((await box('#inv-fmv-sh') || {}).v, '$70', '⚠ and once out of the boxes the redraw that waited puts the shears\' new figure on screen');
      eq(await overflow(), 0, 'no horizontal overflow at 1440');
      await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(600);
      eq(await overflow(), 0, 'no horizontal overflow at 390');
      const caps = await p.evaluate(() => {
        const row = document.getElementById('inv-row-pl');
        const cap = (c) => { const el = row && row.querySelector('.inv-c-' + c); return el ? getComputedStyle(el, '::before').content : ''; };
        return [cap('each'), cap('val')];
      });
      eq(caps, ['"Each"', '"Total"'], 'on a phone each box names itself');
    });

    eq(errs, [], 'zero page errors');
    console.log('\n' + pass + ' passed, ' + fail + ' failed');
    await b.close();
    process.exit(fail ? 1 : 0);
  } catch (e) {
    console.log('step 107 threw: ' + (e && e.stack || e));
    if (b) await b.close().catch(() => {});
    process.exit(1);
  }
})();
