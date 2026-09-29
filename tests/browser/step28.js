// Step 28 — the bottom Reset button runs the one reset, for the client the screen is bound to
// (2026-09-29, the same day as C1 and step 27).
//
// Measured on the pre-change build: a premium Estate Settlement contracted at Contents list, six rooms,
// $22,505. Reset asked nothing, unticked Premium Estate, set the documentation scope to Full, and kept
// the discount, the move styling, the private note, the collection, the car, the prep line, the planner
// date and a half-typed collection. The same six rooms scored again priced at $17,700 — Premium off took
// $8,900 and Full put $4,095 back, so the new total still looked like a price. It is
// resetEstimateJobState(bound job) now. This drives the REAL page:
//   A. The job priced as contracted, then everything a person can leave on the screen.
//   B. Reset, Cancel: nothing changes.
//   C. Reset, OK: the question names the client and says nothing is saved; the screen is a blank
//      estimate for THIS client — premium and Contents list from the job, the walker from the job,
//      the home value and square footage kept — and the same six rooms price at the contract figure.
//   D. Saved: Reset leaves the saved estimate as it is and says so; Start over then reopens it.
//   E. Locked: out for approval the button is disabled, and calling Reset anyway refuses and clears nothing.
//   F. Overflow at 1440 and 390.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step28.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
// ⚠ Held outside the async body so the catch can close it: run against the pre-change build a check
// throws, and a catch that leaves Chromium open reads as a hang rather than as failures.
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');
const same = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
(async () => {
  b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  p.setDefaultTimeout(8000);
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  const dialogs = []; let answer = true;
  p.on('dialog', async d => { dialogs.push(d.message()); if (d.type() === 'confirm' && !answer) await d.dismiss(); else await d.accept(); });
  await p.goto(APP); await p.waitForTimeout(1500);
  const future = (() => { const d = new Date(); d.setDate(d.getDate() + 30);
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10); })();

  // A premium Estate Settlement, contracted at Contents list, walked by Ashley.
  await p.evaluate(() => { const b = document.getElementById('btn-add-client'); if (b) b.click(); }); await p.waitForTimeout(300);
  const id = await p.evaluate((wt) => {
    const set = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; if (e.onchange) e.onchange(); } };
    const pick = (id) => { const e = document.getElementById(id); const o = e && Array.from(e.options).find(x => x.value); if (o) { e.value = o.value; if (e.onchange) e.onchange(); } };
    set('i-svc', 'cleanout'); toggleIntakeFields();
    set('i-fname', 'Pat'); set('i-lname', 'Resetson'); set('i-addr', '69 Beach Blvd'); set('i-city', 'Palm Beach'); set('i-zip', '33480');
    set('i-sqft', '3500'); set('i-home-value', '4200000');
    set('i-date-of-death', '2026-06-01'); set('i-executor-fname', 'Tripp'); set('i-executor-lname', 'Butler');
    set('i-executor-email', 'tb@example.com'); set('i-executor-phone', '(561) 555-0111'); pick('i-executor-role');
    set('i-matter-type', 'probate'); set('i-doc-tier', 'contents');
    set('i-prem', 'yes'); set('i-site-visit-by', 'Ashley Jerome');
    pick('i-ptype'); pick('i-src'); set('i-walkthrough', wt);
    const st = new Date(wt); st.setDate(st.getDate() + 7); while (st.getDay() === 0 || st.getDay() === 6) st.setDate(st.getDate() + 1);
    set('i-start', st.toISOString().slice(0, 10)); saveIntake(); return (jobs[0] || {}).id;
  }, future);
  await p.waitForTimeout(1500);
  const open = async () => { await p.evaluate((id) => dashGoEstimate(id), id); await p.waitForTimeout(900); };

  const screen = () => p.evaluate(() => {
    const v = (id) => { const e = document.getElementById(id); return e ? (e.type === 'checkbox' ? e.checked : e.value) : '(none)'; };
    return {
      job: v('e-job'), prem: v('e-prem'), scope: _estimateDocScope, discount: v('e-discount'), styling: v('e-move-styling'),
      note: v('e-private-note'), noteVar: _privateWalkNote, by: v('e-prepared-by'), target: v('tp-target'),
      collections: collectionsData.map(c => c.name), vehicles: vehiclesData.map(x => x.desc),
      prep: prepItems.map(x => x.type), vendors: vendors.map(x => x.type),
      newCol: v('new-col-name'), newVeh: v('new-veh-desc'), propval: v('e-propval'), sqft: v('e-sqft'),
      inScope: Array.from(document.querySelectorAll('.scope-toggle')).filter(t => t.getAttribute('data-state') !== 'off').length,
      // The two tables render each line as INPUTS, so a textContent read passes over a full table.
      tableLines: ['collections-body', 'vehicles-body'].map(function (id) {
        var t = document.getElementById(id);
        return t ? Array.from(t.querySelectorAll('input')).map(function (i) { return i.value; }).join(' | ') + ' ' + t.textContent : '(no ' + id + ')';
      }).join(' || '),
      fb: (document.getElementById('e-fb') || {}).textContent || '',
      total: currentEstimate ? currentEstimate.havellinTotal : null,
    };
  });
  const sixRooms = async () => { await p.evaluate(() => { for (let i = 0; i < 6; i++) document.getElementById('chk-r' + i).click(); calcAll(); }); await p.waitForTimeout(150); };
  // Everything a person can leave on this client's screen, through the real controls where there is one.
  const leaveEverything = () => p.evaluate(() => {
    const fire = (el, ev) => el.dispatchEvent(new Event(ev, { bubbles: true }));
    const d = document.getElementById('e-discount'); d.value = '10'; fire(d, 'input'); fire(d, 'change');
    const s = document.getElementById('e-move-styling'); s.checked = true; fire(s, 'change');
    const n = document.getElementById('e-private-note'); n.value = 'The son contests the will.'; fire(n, 'input');
    document.getElementById('new-col-name').value = 'Resetson coin collection';
    document.querySelector('button[onclick="addCollection()"]').click();
    document.getElementById('new-veh-desc').value = '1960 Resetson Corvette';
    document.querySelector('button[onclick="addVehicle()"]').click();
    document.getElementById('new-col-name').value = 'half-typed';
    const t = document.getElementById('tp-target'); t.value = '2026-12-18'; fire(t, 'change');
    const by = document.getElementById('e-prepared-by'); const other = Array.from(by.options).find(o => o.value && o.value !== 'Ashley Jerome');
    if (other) { by.value = other.value; fire(by, 'change'); }
    // The category pickers fill from the vendor directory, empty offline — so these two are pushed the
    // way step 21 does, and drawn through the real renderers.
    prepItems.push({ type: 'Painting', cost: 5000, lid: _srcLid() }); renderPrepItems();
    vendors.push({ type: 'Mover', cost: 3000, lid: _srcLid() }); renderVendors();
    calcAll();
  });
  const pressReset = async (yes) => {
    answer = yes; dialogs.length = 0;
    await p.evaluate(() => { document.getElementById('e-fb').innerHTML = ''; });
    await p.click('button[onclick="resetEstimate()"]'); await p.waitForTimeout(400);
    answer = true;
  };

  // ── A ─────────────────────────────────────────────────────────────────
  console.log('## A. As contracted, then everything left on the screen');
  await open();
  await sixRooms();
  const contract = await screen();
  same([contract.prem, contract.scope], [true, 'capture'], 'the job opens premium, at Contents list (the scope intake recorded)');
  ok(contract.total > 0, 'six rooms price at the contract figure ($' + contract.total + ')');
  await leaveEverything();
  const left = await screen();
  same([left.discount, left.styling, left.note, left.target, left.collections, left.vehicles, left.prep, left.vendors, left.newCol],
    ['10', true, 'The son contests the will.', '2026-12-18', ['Resetson coin collection'], ['1960 Resetson Corvette'], ['Painting'], ['Mover'], 'half-typed'],
    'the screen carries a discount, styling, a private note, a planner date, a collection, a car, a prep line, a vendor and a half-typed line');
  ok(left.by && left.by !== 'Ashley Jerome', 'and names somebody other than the job\'s walker (' + left.by + ')');
  has(left.tableLines, 'Resetson coin collection', 'the collections table shows the coin collection (so the check after Reset can fail)');

  // ── B ─────────────────────────────────────────────────────────────────
  console.log('## B. Reset, then Cancel');
  await pressReset(false);
  ok(dialogs.length === 1, 'Reset asks first (' + dialogs.length + ' question)');
  const kept = await screen();
  same([kept.discount, kept.note, kept.collections, kept.inScope], ['10', 'The son contests the will.', ['Resetson coin collection'], 6],
    'Cancel changes nothing — the discount, the note, the collection and the six rooms are all still there');

  // ── C ─────────────────────────────────────────────────────────────────
  console.log('## C. Reset, then OK');
  await pressReset(true);
  const q = dialogs.join(' | ');
  has(q, 'blank estimate for Pat Resetson', 'the question names the client');
  has(q, 'the private walkthrough note', 'and names the private note among what goes');
  has(q, 'None of it has been saved', 'and says nothing here is saved');
  const r = await screen();
  same(r.job, String(id), 'still bound to the same client');
  same(r.prem, true, '⚠ Premium Estate stays on — it is the job\'s answer (the old Reset unticked it)');
  same(r.scope, 'capture', '⚠ the scope is Contents list, what intake recorded (the old Reset set Full)');
  same(r.by, 'Ashley Jerome', 'who walked the house is the job\'s answer again');
  same([r.propval, r.sqft], ['4200000', '3500'], 'the home value and square footage are the job\'s, untouched');
  same(r.discount, '0', '⚠ no discount');
  same(r.styling, false, 'no move styling');
  same([r.note, r.noteVar], ['', ''], '⚠ no private note, in the box or behind it');
  same(r.target, '', 'no planner date');
  same([r.collections, r.vehicles, r.prep, r.vendors], [[], [], [], []], '⚠ no collection, car, prep line or vendor');
  lacks(r.tableLines, 'Resetson', 'and neither table shows a line of them');
  same([r.newCol, r.newVeh], ['', ''], 'the add-a-line boxes are empty');
  same(r.inScope, 0, 'no room in scope');
  has(r.fb, 'Cleared to a blank estimate.', 'and the line under the button says so');
  await sixRooms();
  const again = await screen();
  same(again.total, contract.total, '⚠⚠ the same six rooms price at the contract figure again ($' + again.total + ' of $' + contract.total + ')');

  // ── D ─────────────────────────────────────────────────────────────────
  console.log('## D. With an estimate saved');
  await leaveEverything();
  await p.evaluate(() => document.querySelector('button[onclick="saveEstimateAndPreview()"]').click());
  await p.waitForTimeout(2200);
  const savedRec = await p.evaluate((id) => estimateStore[id] && JSON.parse(JSON.stringify(estimateStore[id].estimate)), id);
  ok(!!(savedRec && savedRec.rooms && savedRec.rooms.length === 6 && savedRec.discountPct === 10), 'the estimate is saved: six rooms at a 10% discount');
  await open();
  same((await screen()).discount, '10', 'reopened, it reads its saved 10%');
  // ⚠ WAIT OUT THE EARLIER MESSAGES. showFB arms an unconditional 4-second clear on every message, so
  // the Save's and the reopen's own timers can wipe a later message early (a pre-existing race, recorded
  // in CLAUDE.md). Without this wait the check on Reset's line below reads a timer, not Reset.
  await p.waitForTimeout(4300);
  await p.evaluate(() => { const d = document.getElementById('e-discount'); d.value = '12'; d.dispatchEvent(new Event('input', { bubbles: true })); calcAll(); });
  const beforeReset = await p.evaluate((id) => JSON.stringify(estimateStore[id]), id);
  await pressReset(true);
  const qs = dialogs.join(' | ');
  has(qs, 'The saved estimate is not changed unless you press Save', 'the question says the saved estimate is not touched');
  has(qs, 'Start over reopens it instead', 'and points at the button that goes back to it');
  lacks(qs, 'None of it has been saved', 'and never claims nothing is saved');
  const rs = await screen();
  same([rs.discount, rs.note, rs.collections, rs.inScope], ['0', '', [], 0], 'the screen is blank');
  has(rs.fb, 'The saved estimate is unchanged until you press Save', 'and the line under the button says the saved one is unchanged');
  const afterReset = await p.evaluate((id) => JSON.stringify(estimateStore[id]), id);
  ok(afterReset === beforeReset, '⚠ the saved record is exactly as it was before Reset');
  dialogs.length = 0;
  await p.evaluate(() => document.querySelector('button[onclick="startEstimateOver()"]').click());
  await p.waitForTimeout(900);
  has(dialogs.join(' | '), 'reopen the saved estimate', 'Start over then offers the saved estimate');
  const back = await screen();
  same([back.discount, back.collections, back.inScope, back.prem, back.scope], ['10', ['Resetson coin collection'], 6, true, 'capture'],
    'and brings it back: its 10%, its collection, its six rooms, premium, Contents list');

  // ── E ─────────────────────────────────────────────────────────────────
  console.log('## E. Locked');
  const lockedBtn = await p.evaluate(() => { estimateSubmitted = true; applyEstimateLock(); return document.querySelector('button[onclick="resetEstimate()"]').disabled; });
  ok(lockedBtn, 'out for approval, the Reset button is disabled');
  dialogs.length = 0;
  const refused = await p.evaluate(() => { document.getElementById('e-fb').innerHTML = ''; resetEstimate();
    return { fb: document.getElementById('e-fb').textContent, disc: document.getElementById('e-discount').value, n: collectionsData.length,
             rooms: Array.from(document.querySelectorAll('.scope-toggle')).filter(t => t.getAttribute('data-state') !== 'off').length }; });
  same(dialogs.length, 0, '⚠ called anyway, it asks nothing');
  same([refused.disc, refused.n, refused.rooms], ['10', 1, 6], 'and clears nothing — the working copy a manager is reviewing keeps its discount, collection and six rooms');
  has(refused.fb, 'out for manager approval', 'and says why');
  await p.evaluate(() => { estimateSubmitted = false; applyEstimateLock(); });

  // ── F ─────────────────────────────────────────────────────────────────
  for (const w of [1440, 390]) {
    await p.setViewportSize({ width: w, height: 900 });
    await p.waitForTimeout(200);
    const ov = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok(ov <= 0, 'Build Estimate fits at ' + w + 'px (overflow ' + ov + ')');
  }
  ok(errs.length === 0, 'no page errors (' + errs.join(' | ') + ')');

  await b.close();
  console.log('\nstep28: ' + pass + ' passed, ' + fail + ' failed');
})().catch(async e => {
  console.log('THREW ' + (e && e.stack || e));
  console.log('step28: ' + pass + ' passed, ' + (fail + 1) + ' failed');
  try { if (b) await b.close(); } catch (_) { /* already gone */ }
});
