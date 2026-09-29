// Step 27 — a fresh estimate starts clean: nothing of the last client's estimate reaches the next
// (2026-09-29, workflow audit finding C1). Written as step 26 and renumbered on the merge: a
// concurrent session's H4 fix took 26 first.
//
// Measured on the pre-change build: client A priced with a 10% discount, move styling, a private
// walkthrough note, a coin collection, a car, a planner date, a renamed "Other" row and a room note,
// then ← Clients WITHOUT saving (the bar keeps the work, by design), then client B's Build estimate —
// and B opened carrying all of it. B's client estimate printed A's collection, A's car and a discount
// line; B's Walkthrough view read A's family note; B named A's concierge as the walker; A's $4.2M home
// value rode onto B, which had none, and B then saved past "Property value is required". Save was no
// better: the discount, styling, note and walker survived the Save into the next client.
//
// The fix is ONE reset (resetEstimateJobState) that every open, fresh build, Save and Start over runs;
// tests/estimate-reset.test.js is the net under it. This drives the REAL page end to end:
//   A. A priced through the real controls — the discount box, the styling box, the note box, the
//      notes modal's Save, the Other row's name box, the + Add buttons, the planner date.
//   B. ← Clients and back to A: the unsaved work is still there (the resume the bar promises).
//   C. ← Clients, then B's Build estimate: every one of those is gone, and so is A's home value.
//   D. B's client estimate and Walkthrough view carry none of it; B's Save is refused on its own
//      missing home value; on fixed price B's flat fee is its own suggestion with no discount.
//   E. A priced again and SAVED, then B again — the Save path — clean.
//   F. A reopened: every one of them comes back from A's own record; only the planner date does not,
//      because no record carries it.
//   G. Start over says what it will do: back to the saved estimate on A, the intake answers on B.
//   H. Overflow at 1440 and 390.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step27.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
// ⚠ The browser is held OUTSIDE the async body so the catch can close it — run against the pre-change
// build a check throws, and a catch that leaves Chromium open reads as a hang rather than as failures.
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
  const dialogs = []; p.on('dialog', async d => { dialogs.push(d.message()); await d.accept(); });
  await p.goto(APP); await p.waitForTimeout(1500);
  const future = (() => { const d = new Date(); d.setDate(d.getDate() + 30);
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10); })();

  async function make(last, o) {
    await p.evaluate(() => { const b = document.getElementById('btn-add-client'); if (b) b.click(); }); await p.waitForTimeout(300);
    const id = await p.evaluate(([wt, last, o]) => {
      const set = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; if (e.onchange) e.onchange(); } };
      const pick = (id) => { const e = document.getElementById(id); const x = e && Array.from(e.options).find(x => x.value); if (x) { e.value = x.value; if (e.onchange) e.onchange(); } };
      set('i-svc', 'downsizing_move'); toggleIntakeFields();
      set('i-fname', 'Pat'); set('i-lname', last); set('i-addr', o.addr); set('i-city', 'Palm Beach'); set('i-zip', '33480');
      set('i-sqft', '3500'); set('i-phone', '(561) 555-0199'); set('i-email', 'c@example.com'); set('i-dest-sqft', '2000');
      if (o.homeValue) set('i-home-value', o.homeValue);
      if (o.tc) set('i-tc', o.tc);
      if (o.svb) set('i-site-visit-by', o.svb);
      pick('i-ptype'); pick('i-src'); set('i-walkthrough', wt);
      const st = new Date(wt); st.setDate(st.getDate() + 7); while (st.getDay() === 0 || st.getDay() === 6) st.setDate(st.getDate() + 1);
      set('i-start', st.toISOString().slice(0, 10)); saveIntake(); return (jobs[0] || {}).id;
    }, [future, last, o]);
    await p.waitForTimeout(1500); return id;
  }
  const open = async (id) => { await p.evaluate((id) => dashGoEstimate(id), id); await p.waitForTimeout(900); };
  const back = async () => { await p.click('#est-back'); await p.waitForTimeout(600); };

  // Everything a person can leave on this screen, read the way they would see it.
  const screen = () => p.evaluate(() => {
    const v = (id) => { const e = document.getElementById(id); return e ? (e.type === 'checkbox' ? e.checked : e.value) : '(none)'; };
    const custom = Array.from(document.querySelectorAll('input[id^="name-r"]'))[0];
    const notesBtn = document.getElementById('notes-btn-r0');
    return {
      job: v('e-job'), discount: v('e-discount'), styling: v('e-move-styling'), note: v('e-private-note'), noteVar: _privateWalkNote,
      by: v('e-prepared-by'), propval: v('e-propval'), target: v('tp-target'), prem: v('e-prem'),
      newCol: v('new-col-name'), newVeh: v('new-veh-desc'),
      collections: collectionsData.map(c => c.name), vehicles: vehiclesData.map(x => x.desc),
      // The two tables render each line as INPUTS, so their text is in the values, not in textContent —
      // a textContent read would pass on a table full of the last client's lines.
      tableLines: ['collections-body', 'vehicles-body'].map(function (id) {
        var t = document.getElementById(id);
        return t ? Array.from(t.querySelectorAll('input')).map(function (i) { return i.value; }).join(' | ') + ' ' + t.textContent : '(no ' + id + ')';
      }).join(' || '),
      inScope: Array.from(document.querySelectorAll('.scope-toggle')).filter(t => t.getAttribute('data-state') !== 'off').length,
      customName: custom ? custom.value : '(none)', roomNote: v('note-r0'),
      noteBtn: notesBtn ? [notesBtn.style.color, notesBtn.style.fontWeight, notesBtn.textContent] : null,
    };
  });

  // A, priced through the real controls.
  async function priceA() {
    await p.evaluate(() => {
      const fire = (el, ev) => el.dispatchEvent(new Event(ev, { bubbles: true }));
      for (let i = 0; i < 6; i++) document.getElementById('chk-r' + i).click();          // the real scope toggles
      const d = document.getElementById('e-discount'); d.value = '10'; fire(d, 'input'); fire(d, 'change');
      const s = document.getElementById('e-move-styling'); s.checked = true; fire(s, 'change');
      const n = document.getElementById('e-private-note'); n.value = 'The son contests the will.'; fire(n, 'input');
      const custom = Array.from(document.querySelectorAll('input[id^="name-r"]'))[0];
      custom.value = 'Alpha wine cellar'; fire(custom, 'input');
      document.getElementById('chk-' + custom.id.slice(5)).click();
      document.getElementById('new-col-name').value = 'Alpha coin collection';
      document.querySelector('button[onclick="addCollection()"]').click();
      document.getElementById('new-veh-desc').value = '1960 Alpha Corvette';
      document.querySelector('button[onclick="addVehicle()"]').click();
      document.getElementById('new-col-name').value = 'Alpha half-typed';
      const t = document.getElementById('tp-target'); t.value = '2026-12-18'; fire(t, 'change');
      openNotesModal('r0');
    });
    await p.fill('#notes-modal-text', 'Piano by the stairs');
    await p.click('button[onclick="saveNotesModal()"]');
    await p.waitForTimeout(200);
  }
  const isA = (s, label) => {
    same(s.discount, '10', label + ': the 10% discount');
    same(s.styling, true, label + ': move styling');
    same(s.note, 'The son contests the will.', label + ': the private note');
    same(s.by, 'Ashley Jerome', label + ': walked by Ashley');
    same(s.collections, ['Alpha coin collection'], label + ': the coin collection');
    same(s.vehicles, ['1960 Alpha Corvette'], label + ': the car');
    same(s.customName, 'Alpha wine cellar', label + ': the renamed Other row');
    same(s.roomNote, 'Piano by the stairs', label + ': the room note');
  };

  const idA = await make('Alpha', { addr: '1 Alpha Way', homeValue: '4200000', tc: 'Ashley Jerome', svb: 'Ashley Jerome' });
  const idB = await make('Bravo', { addr: '2 Bravo Rd' });
  ok(idA && idB && idA !== idB, 'two clients: A with a home value and a concierge, B with neither');

  // ── A. A priced ────────────────────────────────────────────────────────
  console.log('## A. A priced through the real controls');
  await open(idA);
  await priceA();
  const sA = await screen();
  isA(sA, 'A as priced');
  same(sA.target, '2026-12-18', 'A as priced: the planner date');
  same(sA.newCol, 'Alpha half-typed', 'A as priced: a collection half-typed in the add box');
  same(sA.noteBtn && sA.noteBtn[2], '📝 Walkthrough', 'A as priced: the room shows its note');
  has(sA.tableLines, 'Alpha coin collection', 'A as priced: the collections table shows the coin collection (so B\'s check can fail)');
  has(sA.tableLines, '1960 Alpha Corvette', 'A as priced: the vehicles table shows the car');

  // ── B. The resume ─────────────────────────────────────────────────────
  console.log('## B. ← Clients and straight back to A: the unsaved work is kept');
  await back();
  await open(idA);
  const sA2 = await screen();
  isA(sA2, 'A resumed');
  same(sA2.target, '2026-12-18', 'A resumed: the planner date');

  // ── C. B fresh, after an unsaved A ─────────────────────────────────────
  console.log('## C. ← Clients, then B: nothing of A');
  await back();
  await open(idB);
  const fresh = (s, label) => {
    same(s.job, String(idB), label + ': the screen is B\'s');
    same(s.discount, '0', label + ': ⚠ no discount');
    same(s.styling, false, label + ': no move styling');
    same([s.note, s.noteVar], ['', ''], label + ': ⚠ no private note, in the box or behind it');
    same(s.by, '', label + ': ⚠ nobody named as walking B\'s house');
    same(s.propval, '', label + ': ⚠ no home value — B has none on file, and A\'s $4.2M did not ride over');
    same(s.target, '', label + ': no planner date');
    same(s.prem, false, label + ': not Premium Estate');
    same([s.newCol, s.newVeh], ['', ''], label + ': the add-a-line boxes are empty');
    same([s.collections, s.vehicles], [[], []], label + ': ⚠ no collection and no car');
    lacks(s.tableLines, 'Alpha', label + ': and neither table shows a line of A\'s');
    has(s.tableLines, 'No collections flagged', label + ': the collections table reads empty');
    has(s.tableLines, 'No vehicles or watercraft', label + ': and so does the vehicles table');
    same(s.inScope, 0, label + ': no room in scope');
    same(s.customName, 'Other', label + ': the renamed row reads Other again');
    same(s.roomNote, '', label + ': no room note');
    same(s.noteBtn && s.noteBtn.slice(0, 2), ['var(--gray)', ''], label + ': and no room shows a note');
    same(s.noteBtn && s.noteBtn[2], '📝', label + ': its label back to the bare glyph');
  };
  fresh(await screen(), 'B after an unsaved A');

  // ── D. B's documents, B's Save, B on fixed price ──────────────────────
  console.log('## D. B\'s client estimate, Walkthrough view, Save and fixed price');
  const docB = await p.evaluate((id) => {
    for (let i = 0; i < 6; i++) document.getElementById('chk-r' + i).click();
    calcAll();
    const job = jobs.find(j => j.id === id);
    const text = (html) => { const d = document.createElement('div'); d.innerHTML = html; return d.textContent.replace(/\s+/g, ' '); };
    return { doc: text(clientEstimateHtml(currentEstimate, job)), walk: text(walkthroughHtml(job, JSON.parse(JSON.stringify(currentEstimate)))),
             disc: currentEstimate.discountPct, sty: currentEstimate.moveStyling, note: currentEstimate.privateNote,
             by: currentEstimate.preparedBy, cols: (currentEstimate.collections || []).length, vehs: (currentEstimate.vehicles || []).length };
  }, idB);
  lacks(docB.doc, 'Alpha coin collection', 'B\'s client estimate names no collection of A\'s');
  lacks(docB.doc, 'Alpha Corvette', 'and no car of A\'s');
  lacks(docB.doc, 'Preferred Client Discount', 'and prints no discount line');
  lacks(docB.walk, 'contests the will', '⚠ B\'s Walkthrough view does not read A\'s family note');
  lacks(docB.walk, 'Ashley Jerome', 'and does not name A\'s walker');
  same([docB.disc || 0, !!docB.sty, docB.note || '', docB.by || '', docB.cols, docB.vehs], [0, false, '', '', 0, 0],
    'B\'s own estimate record carries none of it');
  await p.evaluate(() => { document.getElementById('e-fb').innerHTML = ''; });
  await p.evaluate(() => document.querySelector('button[onclick="saveEstimateAndPreview()"]').click());
  await p.waitForTimeout(300);
  has(await p.evaluate(() => document.getElementById('e-fb').textContent), 'Property value is required',
    '⚠ B\'s Save is refused on B\'s own missing home value');
  ok(!(await p.evaluate((id) => !!estimateStore[id], idB)), 'and nothing is saved for B');
  const fxB = await p.evaluate(() => {
    const f = document.getElementById('e-fixed'); f.click(); calcAll();
    const flat = _fxAmtGet(); const sug = window._fixedPriceSuggested;
    const d = document.createElement('div'); d.innerHTML = clientEstimateHtml(currentEstimate, jobs.find(j => j.id === currentEstimate.jobId));
    const t = d.textContent; f.click(); calcAll();
    return { flat, sug, line: t.indexOf('Preferred Client Discount') >= 0 };
  });
  ok(fxB.flat > 0 && fxB.flat === fxB.sug, '⚠ on fixed price B\'s flat fee is its own suggestion ($' + fxB.flat + ' of $' + fxB.sug + ') — no leaked discount cut into it');
  ok(!fxB.line, 'and no discount line');

  // ── E. A saved, then B — the Save path ────────────────────────────────
  console.log('## E. A priced again and saved, then B');
  await back();
  await open(idA);
  await priceA();
  await p.evaluate(() => document.querySelector('button[onclick="saveEstimateAndPreview()"]').click());
  await p.waitForTimeout(2200);
  ok(await p.evaluate((id) => !!(estimateStore[id] && estimateStore[id].estimate && estimateStore[id].estimate.rooms.length), idA), 'A is saved');
  await open(idB);
  fresh(await screen(), 'B after a SAVED A');

  // ── F. A reopened ─────────────────────────────────────────────────────
  console.log('## F. A reopened: everything back from A\'s own record');
  await back();
  await open(idA);
  const sA3 = await screen();
  isA(sA3, 'A reopened');
  same(sA3.propval, '4200000', 'A reopened: its own home value');
  same(sA3.prem, false, 'A reopened: Premium Estate as priced (off)');
  same(sA3.target, '', 'A reopened: no planner date — no record carries it, it is a question asked on site');
  same(sA3.noteBtn && sA3.noteBtn.slice(0, 2), ['var(--bronze)', '600'], 'A reopened: the room with a note shows it');

  // ── G. Start over says what it will do ────────────────────────────────
  console.log('## G. Start over');
  dialogs.length = 0;
  await p.evaluate(() => { document.getElementById('e-discount').value = '12'; });
  await p.evaluate(() => document.querySelector('button[onclick="startEstimateOver()"]').click());
  await p.waitForTimeout(900);
  has(dialogs.join(' | '), 'reopen the saved estimate', 'on A (saved) the question says it goes back to the saved estimate');
  same((await screen()).discount, '10', 'and it does — the saved 10%, not the unsaved 12%');
  await back();
  await open(idB);
  await p.evaluate(() => { document.getElementById('e-discount').value = '12'; });
  dialogs.length = 0;
  await p.evaluate(() => document.querySelector('button[onclick="startEstimateOver()"]').click());
  await p.waitForTimeout(900);
  has(dialogs.join(' | '), 'start again from the intake answers', 'on B (nothing saved) it says it starts from the intake answers');
  has(dialogs.join(' | '), 'private walkthrough note', 'and names the private note among what goes');
  same((await screen()).discount, '0', 'and the discount goes');

  // ── H. Overflow ───────────────────────────────────────────────────────
  for (const w of [1440, 390]) {
    await p.setViewportSize({ width: w, height: 900 });
    await p.waitForTimeout(200);
    const ov = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok(ov <= 0, 'Build Estimate fits at ' + w + 'px (overflow ' + ov + ')');
  }
  ok(errs.length === 0, 'no page errors (' + errs.join(' | ') + ')');

  await b.close();
  console.log('\nstep27: ' + pass + ' passed, ' + fail + ' failed');
})().catch(async e => {
  console.log('THREW ' + (e && e.stack || e));
  console.log('step27: ' + pass + ' passed, ' + (fail + 1) + ' failed');
  try { if (b) await b.close(); } catch (_) { /* already gone */ }
});
