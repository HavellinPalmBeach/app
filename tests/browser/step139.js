// Step 139 — the walkthrough agent (2026-11-05; WALKTHROUGH_AGENT_SPEC.md), through the real presses.
//   A. Build Estimate on a client not yet won, rooms scored, a walkthrough photo on the office: Review walkthrough under the
//      rooms sends the rooms, their photos, the notes and the private note to the Apps Script (stubbed).
//   B. The suggestion lands under the office's own row, amber; Use 5 sets the volume through the box's own handler and the line goes;
//      the vendor suggestion's Add puts the line on the estimate.
//   C. The bar offers the crew plan; it opens over the app, Edit plan and Save keep the room links, and it is the person's now.
//   D. Review walkthrough again asks first over the person's plan; Cancel checks the estimate only and keeps the plan.
//   E. The Job Plan: Next up heads In the house in place of How the sorting runs, its page a tap away; it moves when a room is
//      cleared; the room's lines sit inside the room behind a press; Re-plan from the full plan sends the change.
//   F. Overflow at 1440 and 390, no page errors.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step139.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0, b = null;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗ ' + m); } };
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [found: ' + n + ']');
const PLAN = {
  context: ['She tires after lunch: sort with her in the mornings only.', 'Her son is sometimes home; confirm each morning that he is out before the crew goes in.'],
  order: [{ step: 'Sort the papers with her', room: 'Office 1', after: '', vendor: '' },
          { step: 'Donation run', room: '', after: 'Office 1', vendor: 'Junk Removal' },
          { step: 'Edit the closet and build the shelving', room: 'Walk-in Closet', after: '', vendor: '' }],
  conditions: ['Sorting with her mornings only, until 12.'],
  ifCant: ['Son home: do the drop-offs and the papers at the desk.'],
  length: 'About 3 days with 3 of us, 4 to 5 with 2.',
  rooms: [{ room: 'Office 1', lines: ['Shred pile by the door.'] }, { room: 'Walk-in Closet', lines: ['Measure for the shelving first.'] }]
};
(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
    p.setDefaultTimeout(8000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    let answerConfirm = true; const dialogs = [];
    p.on('dialog', async (d) => { dialogs.push(d.message()); if (d.type() === 'confirm') await (answerConfirm ? d.accept() : d.dismiss()); else await d.accept(); });
    const asked = [];
    await p.route('https://script.example/**', async (route) => {
      let body = {}; try { body = JSON.parse(route.request().postData() || '{}'); } catch (e) {}
      if (body.action === 'agentWalkthroughReview') {
        asked.push(body);
        if (body.update || asked.length === 1) await new Promise((r) => setTimeout(r, 2500));   // a run takes a while: the screen must say so meanwhile   // a Re-plan takes a while: the window must say so meanwhile
        const sug = body.mode === 'plan' ? [] : [{ room: 'Office 1', field: 'vol', to: 5, why: 'Boxes to the ceiling on every wall.' },
                                                  { room: 'Office 1', field: 'vendor', vendor: body.context.vendorChoices[0] || 'Junk Removal', why: 'A bolted desk to take down.' }];
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, mode: body.mode, suggestions: sug,
          looks: {}, plan: body.mode === 'check' ? null : PLAN, failed: {}, model: 'claude-fable-5-1', planModel: 'claude-fable-5-1' }) });
      }
      return route.abort();
    });
    await p.goto(APP); await p.waitForTimeout(1500);
    const future = (() => { const d = new Date(); d.setDate(d.getDate() + 30); while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); })();
    const id = await p.evaluate((wt) => {
      const bt = document.getElementById('btn-add-client'); if (bt) bt.click();
      const set = (i, v) => { const e = document.getElementById(i); if (e) { e.value = v; if (e.onchange) e.onchange(); } };
      const pick = (i) => { const e = document.getElementById(i); const x = e && Array.from(e.options).find((o) => o.value); if (x) { e.value = x.value; if (e.onchange) e.onchange(); } };
      set('i-svc', 'downsizing'); toggleIntakeFields();
      set('i-fname', 'Rhea'); set('i-lname', 'Calder'); set('i-addr', '12 Sunrise Ave'); set('i-city', 'Palm Beach'); set('i-zip', '33480');
      set('i-sqft', '3500'); set('i-phone', '(561) 555-0139'); set('i-email', 'r@example.com'); set('i-home-value', '3000000');
      pick('i-ptype'); pick('i-src'); set('i-walkthrough', wt);
      const n = document.getElementById('i-notes'); if (n) n.value = 'Client tires in the afternoon.';
      const st = new Date(wt); st.setDate(st.getDate() + 7); while (st.getDay() === 0 || st.getDay() === 6) st.setDate(st.getDate() + 1);
      set('i-start', st.toISOString().slice(0, 10)); saveIntake(); return (jobs[0] || {}).id;
    }, future);
    await p.waitForTimeout(1500);
    await p.evaluate((id) => dashGoEstimate(id), id); await p.waitForTimeout(1200);
    const rowOf = (name) => p.evaluate((name) => { let ri = 0, hit = null; ROOMS.forEach((s) => s.rooms.forEach((r) => { if (r.name === name && !hit) hit = 'r' + ri; ri++; })); return hit; }, name);
    const oId = await rowOf('Office 1'), cId = await rowOf('Walk-in Closet');
    ok(oId && cId, 'the office and the closet have rows (' + oId + ', ' + cId + ')');
    // Tick both (each section opened by its header), and put a walkthrough photo on the office (the 📷 itself is step 137's).
    for (const rid of [oId, cId]) {
      const shut = await p.evaluate((rid) => !document.getElementById('row-' + rid).checkVisibility(), rid);
      if (shut) await p.evaluate((rid) => document.getElementById('row-' + rid).closest('.room-sec').querySelector('.sec-hdr').click(), rid);
      await p.click('#chk-' + rid);
    }
    await p.evaluate(([oId]) => {
      _walkPhotosSet(oId, [{ fileId: 'F1', url: 'https://drive.google.com/file/d/F1/view', ts: 1, by: 'Anthony Graziano', name: 'x.jpg' }]);
      _privateWalkNote = 'Son home Tuesdays and Thursdays.'; _privateNotePaint();
      SHEETS_SYNC_URL = 'https://script.example/exec';
      calcAll();
    }, [oId]);

    // ── A ──
    console.log('## A. Review walkthrough sends the rooms, the photos and the notes');
    const btn = p.locator('#walk-review-btn');
    ok(await btn.isVisible(), 'Review walkthrough is on the screen');
    // 2026-11-05 (Anthony: lost under the rooms): it sits beside the client and Start over, above the room grid.
    const pos = await p.evaluate(() => { const b = document.getElementById('walk-review-btn'), g = document.getElementById('room-table-wrap'),
      nm = document.getElementById('e-job-name'),
      so = Array.from(document.querySelectorAll('button')).find((x) => x.textContent.trim() === 'Start over' && x.checkVisibility());
      const r = (e) => e ? e.getBoundingClientRect() : null;
      return { b: r(b), g: r(g), nm: r(nm), so: r(so), soCard: !!(so && so.closest('#est-save-card')) }; });
    ok(pos.b && pos.g && pos.b.top < pos.g.top, '⚠ above the room grid (' + (pos.b && Math.round(pos.b.top)) + ' < ' + (pos.g && Math.round(pos.g.top)) + ')');
    ok(pos.b && pos.nm && Math.abs((pos.b.top + pos.b.bottom) / 2 - (pos.nm.top + pos.nm.bottom) / 2) < 14, '…in the client\'s row');
    // Anthony, the same evening: "I don't think we should have that button at the top. That's too easy to fat finger".
    ok(pos.soCard && pos.so.top > pos.g.top, '⚠ Start over is at the foot, beside Save and Reset, never at the top');
    await btn.click(); await p.waitForTimeout(600);
    const rb = await p.evaluate(() => { const b = document.getElementById('walk-review-btn'); return { t: b && b.textContent, d: b && b.disabled,
      line: (document.getElementById('walk-review-msg') || {}).textContent || '' }; });
    ok(rb.d === true && /Reviewing/.test(rb.t || ''), '⚠ while it runs the button reads Reviewing… and cannot be pressed again (' + rb.t + ')');
    has(rb.line, 'Reviewing the walkthrough', '…and the line under the row says what it is doing');
    await p.waitForTimeout(3000);
    ok(asked.length === 1, 'one call to the Apps Script');
    const a0 = asked[0] || { rooms: [], context: {} };
    ok(a0.mode === 'full', 'the estimate check and the plan (' + a0.mode + ')');
    const office = a0.rooms.find((r) => r.name === 'Office 1') || {};
    ok(JSON.stringify(office.photos) === '["F1"]', 'the office goes with its walkthrough photo (' + JSON.stringify(office.photos) + ')');
    has(a0.context.privateNote, 'Son home Tuesdays', 'the private note goes along');
    has(a0.context.notes, 'tires in the afternoon', 'and the intake notes');

    // ── B ──
    console.log('## B. the suggestions on their rows: Use 5, Add the vendor');
    const sugRows = await p.evaluate(() => Array.from(document.querySelectorAll('tr.wsug-row')).map((t) => ({ prev: t.previousElementSibling && t.previousElementSibling.id, txt: t.textContent })));
    ok(sugRows.length === 2, 'two amber lines (' + sugRows.length + ')');
    const os = sugRows.find((r) => r.prev === 'row-' + oId) || {};
    has(os.txt, 'Photos suggest volume 5: Boxes to the ceiling', '⚠ the office\'s line sits right under the office\'s own row');
    // 2026-11-05c (Anthony: "Score + vendor"): a room carries a score and a vendor line, the vendor under the score.
    const vs = await p.evaluate((oId) => { const r = document.getElementById('row-' + oId); const a = r && r.nextElementSibling, b2 = a && a.nextElementSibling;
      return [a && a.className, a && a.textContent, b2 && b2.className, b2 && b2.textContent]; }, oId);
    ok(vs[0] === 'wsug-row' && vs[2] === 'wsug-row', '⚠ both of the office\'s lines sit under its row (' + vs[0] + ', ' + vs[2] + ')');
    has(vs[1], 'volume 5', '…the score first');
    has(vs[3], 'a vendor line', '…the vendor line under it');
    has(vs[3], 'A bolted desk to take down', '…with its own reason');
    // 2026-11-05 (Anthony: "it should tell you which rooms there are suggestions"): the rooms under the line, each a press to its row.
    const look = await p.evaluate(() => Array.from(document.querySelectorAll('#walk-review-rooms button')).map((b) => b.textContent.trim()));
    ok(look.length === 1 && /Office 1/.test(look[0]), '⚠ the line names the room with suggestions, once for its two lines (' + JSON.stringify(look) + ')');
    await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(200);
    await p.click('#walk-review-rooms button'); await p.waitForTimeout(900);
    const inView = await p.evaluate((oId) => { const r = document.getElementById('row-' + oId).getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }, oId);
    ok(inView, '…and pressing it brings the room\'s row into view');
    const before = await p.evaluate(() => currentEstimate.grandTotal);
    await p.click('tr.wsug-row button:has-text("Use 5")'); await p.waitForTimeout(500);
    ok(await p.evaluate((oId) => document.getElementById('vol-' + oId).value, oId) === '5', 'Use 5 sets the volume box');
    ok(await p.evaluate((oId) => !!_volHandSet[oId], oId), '…as typing it would (the room is hand-scored now)');
    ok(await p.evaluate(() => currentEstimate.grandTotal) > before, '…and the estimate is priced on it');
    ok(await p.evaluate(() => document.querySelectorAll('tr.wsug-row').length) === 1, 'the office\'s line goes');
    const vType = await p.evaluate(() => (_walkSug[_estJobId()].items.find((s) => s.field === 'vendor') || {}).vendor);
    await p.click('tr.wsug-row button:has-text("Add")'); await p.waitForTimeout(500);
    ok(await p.evaluate((t) => vendors.concat(prepItems).some((v) => v.type === t), vType), 'Add puts the vendor line on the estimate (' + vType + ')');
    ok(await p.evaluate(() => document.querySelectorAll('tr.wsug-row').length) === 0, 'and its line goes');
    ok(await p.evaluate(() => !document.getElementById('walk-review-rooms')), '⚠ with nothing left to look at, the room list goes too');
    has(await p.evaluate(() => document.getElementById('walk-review-msg').textContent), 'the crew plan is written', 'the line under the row says what came back');

    // ── C ──
    console.log('## C. the crew plan: open, edit, save');
    await p.click('#walk-review-bar button:has-text("Crew plan")'); await p.waitForTimeout(400);
    let modal = await p.evaluate(() => { const m = document.getElementById('cp-modal'); return m ? { vis: m.checkVisibility(), t: m.textContent } : null; });
    ok(modal && modal.vis, 'the crew plan opens over the app');
    has(modal && modal.t, 'Her son is sometimes home', 'the context, as written');
    has(modal && modal.t, 'Internal: for the concierges, never for the client', 'it says who it is for');
    await p.click('#cp-modal button:has-text("Edit plan")'); await p.waitForTimeout(300);
    const orderTxt = await p.inputValue('#cp-ed-order');
    has(orderTxt, 'After Office 1: Donation run (vendor: ', 'the order edits as lines that keep their rooms');
    await p.fill('#cp-ed-conditions', 'Sorting with her mornings only, until 12.\nNo yard work in the rain.');
    await p.click('#cp-modal button:has-text("Save plan")'); await p.waitForTimeout(400);
    const cp = await p.evaluate((id) => crewPlanOf(id), id);
    ok(cp && cp.edited === true, '⚠ saved, it is the person\'s plan now');
    ok(cp && cp.order[1].after === 'Office 1', 'the step riding with the office still rides with it');
    has(await p.evaluate(() => document.getElementById('cp-modal').textContent), 'No yard work in the rain.', 'the edit shows');
    await p.click('#cp-modal button:has-text("Close")'); await p.waitForTimeout(200);

    // ── D ──
    console.log('## D. a run over a person\'s plan asks first');
    answerConfirm = false; dialogs.length = 0;
    await p.click('#walk-review-btn'); await p.waitForTimeout(1500);
    ok(dialogs.some((d) => /You’ve edited this crew plan/.test(d)), 'it asks before replacing the plan');
    ok(asked[1] && asked[1].mode === 'check', '⚠ Cancel: the estimate is checked again, nothing more (' + (asked[1] && asked[1].mode) + ')');
    has(JSON.stringify(await p.evaluate((id) => crewPlanOf(id).conditions, id)), 'No yard work in the rain.', '…and the person\'s plan is kept');
    answerConfirm = true;

    // ── E ──
    console.log('## E. the Job Plan: Next up, the room, Re-plan');
    await p.evaluate((id) => {
      flushCalcAll();
      estimateStore[id] = { estimate: JSON.parse(JSON.stringify(currentEstimate)), approved: true, submitted: true, approvedBy: 'Anthony Graziano', savedAt: Date.now() };
      const j = jobs.find((x) => x.id === id);
      Object.assign(j, { status: 'active', won: true, wonAt: '2026-11-01', approved: true, agrApproved: true, agrSent: true, agrSigned: true, activatedOn: '2026-11-03',
        depositReceived: true, payments: [{ id: 1, uid: 'p1', stage: 'deposit', amount: 5000, date: '2026-11-01', method: 'wire', clearedOn: '2026-11-01' }] });
      openJobPlanFor(id);
    }, id);
    await p.waitForTimeout(1200);
    const jp = await p.evaluate((id) => { const c = document.getElementById('cp-next-' + id); const flow = document.getElementById('job-plan-content');
      return { card: c ? c.textContent : '', vis: !!(c && c.checkVisibility()), flow: flow ? flow.textContent : '',
               guide: c ? !!c.querySelector('a[href="sorting-guide.html"]') : false }; }, id);
    ok(jp.vis, 'Next up is on the Job Plan');
    has(jp.card, 'Office 1: Sort the papers with her', 'the next step');
    has(jp.card, 'Sorting with her mornings only, until 12.', 'the conditions always');
    lacks(jp.flow, 'How the sorting runs', '⚠ the generic block is gone where the job has its own plan');
    ok(jp.guide, '…its page still a tap away on the card');
    await p.evaluate((id) => { const est = estimateStore[id].estimate; const r = est.rooms.find((x) => x.name === 'Office 1');
      setPlanRoomStatus(id, r.idx, 'locked'); setPlanRoomStatus(id, r.idx, 'cleared'); _repaintPlan(id); }, id);
    await p.waitForTimeout(500);
    const jp2 = await p.evaluate((id) => (document.getElementById('cp-next-' + id) || {}).textContent || '', id);
    lacks(jp2, 'Sort the papers with her', '⚠ the office cleared: its step passes');
    has(jp2, 'Walk-in Closet: Edit the closet', 'and the closet is next');
    await p.evaluate((id) => { const r = estimateStore[id].estimate.rooms.find((x) => x.name === 'Walk-in Closet'); openRoomWorkspace(id, r.idx); }, id);
    await p.waitForTimeout(500);
    const ws = await p.evaluate(() => { const d = document.querySelector('#room-ws details.cp-room'); return d ? { open: d.open, t: d.textContent } : null; });
    ok(ws && ws.open === false, '⚠ the room\'s lines sit inside the room, behind a press, shut');
    has(ws && ws.t, 'Measure for the shelving first.', 'its lines');
    await p.click('#room-ws details.cp-room summary'); await p.waitForTimeout(200);
    ok(await p.evaluate(() => document.querySelector('#room-ws details.cp-room').open), 'a tap opens them');
    await p.evaluate(() => closeRoomWorkspace()); await p.waitForTimeout(200);
    await p.click('#cp-next-' + id + ' button:has-text("Open the full plan")'); await p.waitForTimeout(400);
    await p.fill('#cp-update', 'Anthony Jr has class from 12 to 5:30 this semester.');
    dialogs.length = 0;
    await p.click('#cp-modal button:has-text("Re-plan")'); await p.waitForTimeout(700);
    ok(dialogs.some((d) => /You’ve edited this crew plan/.test(d)), 'Re-plan over the person\'s plan asks first');
    // 2026-11-05 (Anthony: "I'm just sitting here now with the screen waiting for something to happen and kind of unsure").
    const busy = await p.evaluate(() => { const b = document.getElementById('cp-replan-btn'), t = document.getElementById('cp-update');
      return { b: b && b.textContent, dis: b && b.disabled, ro: t && t.readOnly, v: t && t.value, box: (document.getElementById('cp-modal-box') || {}).textContent || '' }; });
    ok(busy.dis === true && /Re-planning/.test(busy.b || ''), '⚠ while it runs the button reads Re-planning… and cannot be pressed again (' + busy.b + ')');
    ok(busy.ro === true && /class from 12/.test(busy.v || ''), '…what was typed stays in the box, locked');
    has(busy.box, 'You can close this; the plan updates when it lands', '…and the window says it is working and can be closed');
    await p.waitForTimeout(3200);
    const a3 = asked[asked.length - 1] || {};
    ok(a3.mode === 'plan', '⚠ from the Job Plan the plan alone, the price locked (' + a3.mode + ')');
    has(a3.update, 'class from 12 to 5:30', 'with what changed');
    ok(await p.evaluate((id) => crewPlanOf(id).edited === false, id), 'OK: the fresh plan replaces it');
    const done = await p.evaluate(() => { const b = document.getElementById('cp-replan-btn'), t = document.getElementById('cp-update');
      return { b: b && b.textContent, dis: b && b.disabled, v: t && t.value, line: (document.getElementById('cp-run-line') || {}).textContent || '' }; });
    ok(done.dis === false && /Re-plan/.test(done.b || '') && !/Re-planning/.test(done.b || ''), 'when it lands the button is back');
    ok(done.v === '', '⚠ …the box is empty: what was typed went in');
    has(done.line, 're-planned with: “Anthony Jr has class from 12 to 5:30', '…and the line says so, in its words');
    await p.click('#cp-modal button:has-text("Close")'); await p.waitForTimeout(200);

    // ── F ──
    console.log('## F. overflow and errors');
    const over = () => p.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
    ok(await over() === 0, 'no horizontal overflow at 1440');
    await p.setViewportSize({ width: 390, height: 844 });
    await p.evaluate((id) => openJobPlanFor(id), id); await p.waitForTimeout(800);
    ok(await over() === 0, 'no horizontal overflow on the Job Plan at 390');
    await p.evaluate((id) => openCrewPlan(id), id); await p.waitForTimeout(300);
    ok(await over() === 0, '…nor with the full plan open');
    ok(errs.length === 0, 'no page errors' + (errs.length ? ' (' + errs.slice(0, 2).join(' | ') + ')' : ''));
  } catch (e) {
    fail++; console.log('  CRASH ' + (e && e.stack));
  } finally {
    if (b) await b.close();
  }
  console.log(`step139: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
