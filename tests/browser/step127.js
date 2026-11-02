// Step 127 — 🔍 Walkthrough on the Job Plan header (2026-11-02). Anthony, asked where the private walkthrough note goes once
// the estimate is approved (it is on the client dashboard's 🔍 Walkthrough, never on the Job Plan), took the button: the
// dashboard's own page, the note at its top, one press away and never drawn open on the iPad in the house.
//   A. A client priced with a private note and saved; the Job Plan opened for them: the header carries 🔍 Walkthrough beside
//      the Drive link, and the note's words are nowhere on the plan.
//   B. Pressed: the walkthrough opens over the plan, the private note first, and it offers no Print.
//   C. Closed: back on the plan. A client with no estimate gets no button.
//   D. At 390 px the button is on screen and opens the same page; no overflow at 1440 or 390, no page errors.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step127.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
(async () => {
  b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  p.setDefaultTimeout(8000);
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  p.on('dialog', async d => { await d.accept(); });
  await p.goto(APP); await p.waitForTimeout(1500);
  const future = (() => { const d = new Date(); d.setDate(d.getDate() + 30);
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10); })();

  async function make(last) {
    await p.evaluate(() => { const b = document.getElementById('btn-add-client'); if (b) b.click(); }); await p.waitForTimeout(300);
    const id = await p.evaluate(([wt, last]) => {
      const set = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; if (e.onchange) e.onchange(); } };
      const pick = (id) => { const e = document.getElementById(id); const x = e && Array.from(e.options).find(x => x.value); if (x) { e.value = x.value; if (e.onchange) e.onchange(); } };
      set('i-svc', 'downsizing_move'); toggleIntakeFields();
      set('i-fname', 'Pat'); set('i-lname', last); set('i-addr', '12 ' + last + ' Way'); set('i-city', 'Palm Beach'); set('i-zip', '33480');
      set('i-sqft', '3500'); set('i-phone', '(561) 555-0199'); set('i-email', 'c@example.com'); set('i-dest-sqft', '2000');
      set('i-home-value', '4000000');
      pick('i-ptype'); pick('i-src'); set('i-walkthrough', wt);
      const st = new Date(wt); st.setDate(st.getDate() + 7); while (st.getDay() === 0 || st.getDay() === 6) st.setDate(st.getDate() + 1);
      set('i-start', st.toISOString().slice(0, 10)); saveIntake(); return (jobs[0] || {}).id;
    }, [future, last]);
    await p.waitForTimeout(1500); return id;
  }
  // Build estimate, pressed on the client's own band where it is offered, else its handler.
  const open = async (id) => {
    const btn = p.locator('#client-dashboard-view button[onclick="dashGoEstimate(' + id + ')"]').first();
    if (await btn.isVisible().catch(() => false)) await btn.click();
    else await p.evaluate((id) => dashGoEstimate(id), id);
    await p.waitForTimeout(1200);
  };
  const save = async () => { await p.click('button[onclick="saveEstimateAndPreview()"]'); await p.waitForTimeout(2200); };
  const saved = (id) => p.evaluate((id) => { const r = estimateStore[id] && estimateStore[id].estimate;
    return r ? { note: r.privateNote || '', rooms: (r.rooms || []).length, r0: ((r.rooms || [])[0] || {}).note || '' } : null; }, id);
  const box = () => p.evaluate(() => { const n = document.getElementById('e-private-note');
    return n ? { v: n.value, ch: n.clientHeight, sh: n.scrollHeight, vis: n.checkVisibility() } : null; });

  const NOTE = 'The son disagrees about the piano. Gate code changes Friday.';
  const toPlan = async (id) => { await p.evaluate((id) => openJobPlanFor(id), id); await p.waitForTimeout(1500); };
  const viewer = () => p.evaluate(() => {
    const m = document.getElementById('doc-viewer-modal'), b = document.getElementById('doc-viewer-body'), pr = document.getElementById('doc-viewer-print');
    return { open: !!(m && m.style.display !== 'none' && m.checkVisibility()), text: b ? b.textContent : '',
             print: !!(pr && pr.checkVisibility()) };
  });

  // ── A ──
  console.log('## A. the header carries the button, and not the note');
  const id = await make('Plan');
  await open(id);
  await p.evaluate((n) => { for (let i = 0; i < 4; i++) document.getElementById('chk-r' + i).click();
    const t = document.getElementById('e-private-note'); t.value = n; t.dispatchEvent(new Event('input', { bubbles: true })); }, NOTE);
  await save();
  const sv = await saved(id);
  ok(sv && sv.note === NOTE, 'the estimate saved with its private note (' + JSON.stringify(sv && sv.note) + ')');
  // The Job Plan draws for an approved estimate on a won job (loadJobPlanTab): the manager's approval and the client's yes,
  // set on the records as those two presses leave them (their own steps drive the presses).
  await p.evaluate((id) => {
    const r = estimateStore[id]; r.approved = true; r.approvedBy = 'Anthony Graziano'; r.approvedAt = '2026-11-02';
    const j = jobs.find(x => x.id === id); j.approved = true; j.status = 'won'; j.won = true; j.wonAt = '2026-11-02';
  }, id);
  await toPlan(id);
  const btn = p.locator('#plan-walkthrough-' + id);
  ok(await btn.isVisible().catch(() => false), '⚠ the Job Plan header shows 🔍 Walkthrough');
  const hdr = await p.evaluate(() => (document.getElementById('job-plan-header') || {}).textContent || '');
  has(hdr, 'Walkthrough', 'in the header card');
  const plan = await p.evaluate(() => (document.getElementById('panel-job-plan') || {}).textContent || '');
  ok(plan.indexOf('piano') < 0, '⚠ the private note is nowhere on the plan until the button is pressed');

  // ── B ──
  console.log('## B. pressed: the walkthrough, the note first, no Print');
  await btn.click(); await p.waitForTimeout(500);
  const v = await viewer();
  ok(v.open, '⚠ the walkthrough opens over the Job Plan');
  has(v.text, 'Private walkthrough notes', 'with its private band');
  has(v.text, 'The son disagrees about the piano', 'and the note');
  ok(v.text.indexOf('piano') >= 0 && v.text.indexOf('piano') < v.text.indexOf('Rooms walked'), 'the note above the rooms');
  ok(!v.print, 'and no Print: the page carries the private note');

  // ── C ──
  console.log('## C. closed; a client with no estimate gets no button');
  await p.evaluate(() => closeDocViewer()); await p.waitForTimeout(200);
  ok(!(await viewer()).open, 'closed');
  ok(await p.locator('#panel-job-plan').isVisible(), 'back on the Job Plan');
  const id2 = await make('Bare');
  await toPlan(id2);
  const st = await p.evaluate(() => _estStoreState);
  ok(await p.locator('#plan-walkthrough-' + id2).count() === 0, 'a client with no estimate has no 🔍 Walkthrough on the plan (estimates ' + st + ')');

  // ── D ──
  console.log('## D. a phone, overflow, errors');
  await toPlan(id);
  for (const w of [1440, 390]) {
    await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(300);
    const ov = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok(ov <= 0, 'no horizontal overflow at ' + w + ' px (' + ov + ')');
    const b2 = p.locator('#plan-walkthrough-' + id);
    await b2.scrollIntoViewIfNeeded().catch(() => {});
    ok(await b2.isVisible().catch(() => false), 'the button is on screen at ' + w + ' px');
  }
  await p.locator('#plan-walkthrough-' + id).click(); await p.waitForTimeout(500);
  const v2 = await viewer();
  ok(v2.open && v2.text.indexOf('piano') >= 0, 'and on a phone it opens the same page');
  ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));

  await b.close();
  console.log(pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch(async e => { console.log('THREW: ' + (e && e.stack || e)); try { if (b) await b.close(); } catch (x) {} console.log(pass + ' passed, ' + (fail + 1) + ' failed'); process.exit(1); });
