// A FEE-ONLY ESTIMATE IS A BUILT ESTIMATE (2026-09-22). Anthony's first dummy client.
//
// Home Prep for Sale has NO ROOM GRID, so `est.rooms` is `[]` on every prep job ever priced.
// `estBuilt` tested the room count, so it was false forever, `walked` reads it, the rail lit
// `walkthrough` as the earliest gap, and `Submit for approval` renders ONLY while its own row
// is live. A priced, saved job with no way forward. The walkthrough row's primary then opened
// Edit Client, which carried no walkthrough field — so the one route the app named was a dead end.
//
// ⚠ ONLY THE BROWSER PROVES THIS. The unit suite drives `jobTimeline` and `jobTimelineActions`,
//   but "the rail says estimate_approved" and "a person can see and press a submit button" are
//   two claims, and the defect lived in the gap between them.
// ⚠ The prep card's category dropdown is fed by the vendor directory (a separate Apps Script),
//   so this pushes onto the SAME `prepItems` array `addFromVendorGroup` writes to. The rail and
//   Edit Client are what is under test, not the dropdown.
// ⚠ `saveClientEdit` TAKES THE JOB ID. Calling it bare returns at `if (!job) return` and the
//   edit silently does nothing — this script's first run read that as a broken fix.
// ⚠ The viewport option is `viewport`, NOT `viewportSize`.
const { chromium } = require('playwright');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL ' + m); } };
const eq = (a, b, m) => ok(a === b, m + '  (got ' + JSON.stringify(a) + ', want ' + JSON.stringify(b) + ')');
const APP = process.env.APP || 'file:///home/user/app/havellin.html';

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  const dlg = []; p.on('dialog', async d => { dlg.push(d.message()); await d.dismiss(); });
  await p.goto(APP); await p.waitForTimeout(1500);

  // A weekday a month out — dateChainGuard refuses weekends, and the whole point is a
  // walkthrough that has NOT happened yet.
  const future = (() => { const d = new Date(); d.setDate(d.getDate() + 30);
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10); })();

  await p.click('#btn-add-client');   // the real + Add New Client button — Intake left the nav 2026-09-23 await p.waitForTimeout(300);
  const made = await p.evaluate((wt) => {
    const set = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; if (e.onchange) e.onchange(); } };
    const pick = (id) => { const e = document.getElementById(id);
      const o = e && Array.from(e.options).find(x => x.value); if (o) { e.value = o.value; if (e.onchange) e.onchange(); } };
    set('i-svc', 'prep'); toggleIntakeFields();
    set('i-fname', 'Margaret'); set('i-lname', 'ZZ Whitfield');
    set('i-addr', '231 Seaspray Ave'); set('i-city', 'Palm Beach'); set('i-zip', '33480');
    set('i-sqft', '3500'); set('i-phone', '(561) 555-0142'); set('i-email', 'm@example.com');
    pick('i-ptype'); pick('i-src');
    set('i-walkthrough', wt);
    const st = new Date(wt); st.setDate(st.getDate() + 7);
    while (st.getDay() === 0 || st.getDay() === 6) st.setDate(st.getDate() + 1);
    set('i-start', st.toISOString().slice(0, 10));
    saveIntake();
    return (jobs[0] || {}).id;
  }, future);
  await p.waitForTimeout(1600);
  ok(!!made, 'the prep client was created');

  // Build Estimate is a screen off the client's timeline now (2026-09-23), opened by the band's
  // own button — the tab this script used to click is gone.
  await p.evaluate((id) => dashGoEstimate(id), made); await p.waitForTimeout(600);
  const est = await p.evaluate((id) => {
    const js = document.getElementById('e-job'); js.value = String(id); if (js.onchange) js.onchange();
    calcAll();
    [['Painting', 18000], ['Cleaning', 6000], ['Landscaping', 9000], ['Staging', 12000]]
      .forEach(([t, c]) => prepItems.push({ type: t, cost: c, lid: _srcLid() }));
    renderPrepItems(); calcAll(); saveEstimateAndPreview();
    return { rooms: (currentEstimate || {}).rooms ? currentEstimate.rooms.length : -1,
             hav: (currentEstimate || {}).havellinTotal, lines: prepItems.length };
  }, made);
  await p.waitForTimeout(1600);
  eq(est.lines, 4, 'four prep trades on the estimate');
  eq(est.hav, 13500, '30% of $45,000 — the fee is the whole Havellin total');

  const seen = await p.evaluate((id) => {
    showPanel('jobs', document.querySelector('.nb[onclick*="\'jobs\'"]'));
    openClientDashboard(id);
    const v = document.getElementById('client-dashboard-view');
    const band = v.querySelector('.jt-next');
    const prim = band && band.querySelector('.jt-btn-p');
    const rows = jobTimeline(jobs.filter(j => j.id === id)[0], estimateStore[id], [], []);
    return { rooms: (estimateStore[id].estimate.rooms || []).length,
             prep: (estimateStore[id].estimate.prepItems || []).length,
             built: (rows.filter(r => r.key === 'estimate_built')[0] || {}).done,
             walked: (rows.filter(r => r.key === 'walkthrough')[0] || {}).done,
             next: (jobTimelineNext(rows) || {}).key,
             primary: prim ? prim.innerText.trim() : '(none)',
             submit: v.innerText.indexOf('Submit for approval') >= 0 };
  }, made);

  eq(seen.rooms, 0, 'the saved estimate really has NO rooms — this service has no grid');
  eq(seen.prep, 4, '…and its substance is the prep lines');
  eq(seen.built, true, '⚠ it still reads as a BUILT estimate');
  eq(seen.walked, true, '⚠ so the walkthrough reads done, though the date is a month out');
  eq(seen.next, 'estimate_approved', 'the band lands on approval, not on the walkthrough');
  eq(seen.primary, 'Submit for approval', '⚠⚠ and the button a person can actually press is Submit');
  eq(seen.submit, true, 'it is really in the rendered dashboard');

  // The dead end the walkthrough row used to send you to.
  const ec = await p.evaluate((id) => {
    showEditClient(id);
    const el = document.getElementById('ec-walkthrough');
    return { exists: !!el, visible: !!(el && el.offsetParent !== null), value: el ? el.value : null };
  }, made);
  eq(ec.exists, true, '⚠ Edit Client carries the walkthrough date');
  eq(ec.visible, true, '…and it is on screen, not in a hidden block');
  eq(ec.value, future, '…prefilled from the job');

  const after = await p.evaluate((id) => {
    const d = new Date(); d.setDate(d.getDate() - 7);
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
    const want = d.toISOString().slice(0, 10);
    document.getElementById('ec-walkthrough').value = want;
    saveClientEdit(id);   // ⚠ takes the id; bare it returns at `if (!job) return`
    return { want: want, got: (jobs.filter(j => j.id === id)[0] || {}).walkthrough };
  }, made);
  eq(after.got, after.want, '⚠ and the correction actually saves');

  eq(errs.length, 0, 'no page errors' + (errs.length ? ' -> ' + errs[0].slice(0, 90) : ''));
  console.log('  step13: ' + pass + ' passed, ' + fail + ' failed, ' + errs.length + ' page errors');
  await b.close();
  process.exit(fail ? 1 : 0);
})();
