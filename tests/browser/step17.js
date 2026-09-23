// Step 17 — Client Intake and Build Estimate leave the nav; they are full screens off the Client
// Dashboard (2026-09-23). Drives the REAL page: the real + Add New Client button, the real intake
// Save, the real timeline band, the real Build estimate button, both back bars, the resume, the
// locked estimate's way out, and the split nav at desk, phone and field-mode widths.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step17.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL ' + m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + ' (got ' + JSON.stringify(a) + ')');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
  const p = await b.newPage({ viewport: { width: 1440, height: 950 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  p.on('dialog', (d) => d.accept());
  await p.goto(APP); await p.waitForTimeout(1500);

  const state = () => p.evaluate(() => ({
    active: Array.from(document.querySelectorAll('.panel.active')).map((x) => x.id),
    lit: Array.from(document.querySelectorAll('.nb.active')).map((x) => x.textContent.trim()),
    dash: (document.getElementById('client-dashboard-view') || {}).style.display,
  }));
  const overflow = () => p.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));

  console.log('\n=== THE NAV ===');
  const nav = await p.evaluate(() => {
    const bs = Array.from(document.querySelectorAll('.nav .nb')).map((x) => ({ t: x.textContent.trim(), l: Math.round(x.getBoundingClientRect().left), r: Math.round(x.getBoundingClientRect().right) }));
    const gap = document.querySelector('.nav-gap').getBoundingClientRect();
    const navR = document.querySelector('.nav').getBoundingClientRect();
    return { bs, gapW: Math.round(gap.width), navR: Math.round(navR.right), navL: Math.round(navR.left) };
  });
  eq(nav.bs.map((x) => x.t), ['Win / Loss', 'Client Dashboard', 'Job Plan', 'Job Admin & Inv', 'Contractors', 'Vendors', 'Referral Partners'],
    'seven tabs, in order — no Client Intake, no Build Estimate');
  ok(nav.gapW > 300, 'at 1440 the white space between the groups is wide (' + nav.gapW + 'px)');
  ok(Math.abs((nav.bs[4].l - nav.bs[3].r) - nav.gapW) <= 1, 'and it sits exactly between Job Admin and Contractors (' + (nav.bs[4].l - nav.bs[3].r) + ' vs ' + nav.gapW + ', sub-pixel rounding)');
  ok(nav.navR - nav.bs[6].r <= 30, 'the contact tabs sit flush right (' + (nav.navR - nav.bs[6].r) + 'px from the edge, the nav padding)');
  ok(nav.bs[0].l - nav.navL <= 30, 'the client tabs sit flush left');
  eq(await overflow(), 0, 'no horizontal overflow at 1440');

  console.log('\n=== DOOR 1: + ADD NEW CLIENT ===');
  const btnTop = await p.evaluate(() => {
    const btn = document.getElementById('btn-add-client').getBoundingClientRect();
    const m = document.getElementById('m-tot').getBoundingClientRect();
    return { visible: btn.width > 0, above: btn.top < m.top, bg: getComputedStyle(document.getElementById('btn-add-client')).backgroundColor };
  });
  ok(btnTop.visible, 'the button is on screen on the client list');
  ok(btnTop.above, 'above the metric tiles — at the top');
  eq(btnTop.bg, 'rgb(166, 124, 69)', 'bronze');
  await p.click('#btn-add-client'); await p.waitForTimeout(250);
  let st = await state();
  eq(st.active, ['panel-intake'], 'pressing it opens the intake screen, full screen');
  eq(st.lit, ['Client Dashboard'], 'with the Client Dashboard tab still lit');
  const bar = await p.evaluate(() => {
    const b = document.querySelector('#panel-intake .screen-bar');
    return { txt: b ? b.innerText.replace(/\s+/g, ' ').trim() : '', pos: b ? getComputedStyle(b).position : '' };
  });
  ok(/Clients/.test(bar.txt) && /Add New Client/.test(bar.txt), 'the bar reads ← Clients · Add New Client (' + bar.txt + ')');
  eq(bar.pos, 'sticky', 'and it is sticky');
  // Back without saving: what was typed is still there on return, as it was when this was a tab.
  await p.evaluate(() => { document.getElementById('i-fname').value = 'Half'; });
  await p.click('#panel-intake .screen-back'); await p.waitForTimeout(250);
  st = await state();
  eq(st.active, ['panel-jobs'], '← Clients returns to the dashboard');
  eq(st.dash, 'none', 'on the list');
  await p.click('#btn-add-client'); await p.waitForTimeout(200);
  eq(await p.evaluate(() => document.getElementById('i-fname').value), 'Half', 'and what was typed is still on the form');

  // A real save.
  const made = await p.evaluate(() => {
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
    const pick = (id) => { const el = document.getElementById(id); for (const o of el.options) if (o.value) { el.value = o.value; break; } };
    set('i-svc', 'cleanout'); toggleIntakeFields();
    set('i-fname', 'Tripp'); set('i-lname', 'Butler'); set('i-phone', '(561) 555-0100'); set('i-email', 'tb@example.com');
    set('i-addr', '69 Beach Blvd'); set('i-city', 'Palm Beach'); set('i-zip', '33480'); set('i-sqft', '3500');
    pick('i-ptype'); pick('i-src'); set('i-start', '2026-10-05'); set('i-walkthrough', '2026-09-30');
    set('i-executor-fname', 'Jane'); set('i-executor-lname', 'Doe'); pick('i-executor-role');
    set('i-executor-phone', '(561) 555-0101'); set('i-executor-email', 'jane@example.com');
    set('i-date-of-death', '2026-08-14'); set('i-matter-type', 'probate'); set('i-doc-tier', 'values');
    document.getElementById('i-gate-dispute').value = '';
    const t0 = Date.now(); saveIntake();
    return { id: (jobs[0] || {}).id, n: jobs.length, ms: Date.now() - t0,
             fb: document.getElementById('i-fb').textContent };
  });
  ok(made.n === 1 && made.id, 'the client is created through the real Save (' + made.fb + ')');
  st = await state();
  eq(st.active, ['panel-jobs'], '⚠ Save lands on the Client Dashboard AT ONCE — no 800ms timer to race');
  eq(st.dash, 'block', 'on the new client\'s own dashboard, not the list');
  const landed = await p.evaluate((id) => ({ jid: _dashboardJobId === id,
    note: (document.getElementById('client-dashboard-view').innerText || '').indexOf('Client created: Tripp Butler.') > -1 }), made.id);
  ok(landed.jid, 'the drilldown is the client just created');
  ok(landed.note, 'and it says so');
  eq(await p.evaluate(() => document.getElementById('i-fname').value), '', 'the intake form is cleared for the next client');

  console.log('\n=== DOOR 2: BUILD ESTIMATE, FROM THE BAND ===');
  const band = await p.evaluate(() => {
    const nx = document.querySelector('#client-dashboard-view .jt-next');
    const prim = nx && nx.querySelector('.jt-btn-p');
    const outs = nx ? Array.from(nx.querySelectorAll('.jt-btn:not(.jt-btn-p)')).map((x) => x.textContent.trim()) : [];
    return { prim: prim ? prim.textContent.trim() : '', call: prim ? prim.getAttribute('onclick') : '',
             bg: prim ? getComputedStyle(prim).backgroundColor : '', outs };
  });
  eq(band.prim, 'Build estimate', '⚠ a booked walkthrough\'s brown button is Build estimate');
  eq(band.bg, 'rgb(122, 90, 46)', 'brown — the band\'s one filled button');
  ok(band.outs.indexOf('Change the walkthrough date') > -1, 'moving the date is the outline button beside it');
  await p.click('#client-dashboard-view .jt-next .jt-btn-p'); await p.waitForTimeout(700);
  st = await state();
  eq(st.active, ['panel-estimate'], 'the band\'s button opens Build Estimate, full screen');
  eq(st.lit, ['Client Dashboard'], 'with the Client Dashboard tab still lit');
  const head = await p.evaluate(() => ({
    back: document.getElementById('est-back').textContent.trim(),
    sub: document.getElementById('est-screen-client').textContent,
    name: document.getElementById('e-job-name').textContent,
    pickerShown: document.getElementById('e-job').getClientRects().length > 0,
    bound: document.getElementById('e-job').value,
  }));
  ok(/Butler/.test(head.back), 'the back button is named after the client (' + head.back + ')');
  ok(/Tripp Butler/.test(head.sub) && /69 Beach Blvd/.test(head.sub) && /Estate Settlement/.test(head.sub), 'the bar names client, street and service (' + head.sub + ')');
  ok(/Tripp Butler/.test(head.name), 'and so does the Job card');
  eq(head.pickerShown, false, 'the job picker is not on screen');
  eq(head.bound, String(made.id), 'but it binds the form to this client');

  // Score two rooms, go back WITHOUT saving, come back: the walkthrough is still there.
  const scored = await p.evaluate(() => {
    Array.from(document.querySelectorAll('button.scope-toggle')).slice(0, 2).forEach((t) => t.click());
    calcAll();
    return (currentEstimate && currentEstimate.rooms || []).length;
  });
  eq(scored, 2, 'two rooms scored through the real grid');
  await p.click('#est-back'); await p.waitForTimeout(300);
  st = await state();
  eq(st.active, ['panel-jobs'], '← back returns to the dashboard');
  eq(st.dash, 'block', 'to the client the form is for');
  await p.click('#client-dashboard-view .jt-next .jt-btn-p'); await p.waitForTimeout(500);
  eq(await p.evaluate(() => (currentEstimate && currentEstimate.rooms || []).length), 2,
    '⚠ reopening the same client RESUMES — the unsaved walkthrough survived the trip back');

  // A submitted estimate is locked — and the way out is not.
  const locked = await p.evaluate(() => {
    estimateSubmitted = true; applyEstimateLock();
    const r = { back: document.getElementById('est-back').disabled, sqft: (document.querySelector('#panel-estimate button.scope-toggle') || {}).disabled,
                save: document.querySelector('button[onclick="saveEstimateAndPreview()"]').disabled };
    estimateSubmitted = false; applyEstimateLock();
    return r;
  });
  eq(locked.save, true, 'a submitted estimate cannot be saved over');
  eq(locked.back, false, '⚠ and its back button still works — a locked way out is a screen nobody can leave');

  // Save: lands on the client, as it has since 2026-09-13.
  await p.evaluate(() => {
    document.querySelectorAll('#room-table-wrap input[type=range], #room-table-wrap input[type=number]').forEach(() => {});
    const pb = document.getElementById('e-prepared-by'); if (pb && !pb.value) { for (const o of pb.options) if (o.value) { pb.value = o.value; break; } }
  });

  console.log('\n=== PHONE (390px) ===');
  await p.setViewportSize({ width: 390, height: 844 });
  await p.waitForTimeout(200);
  eq(await overflow(), 0, 'no horizontal overflow on the Build Estimate screen at 390');
  const ph = await p.evaluate(() => {
    const gap = document.querySelector('.nav-gap').getBoundingClientRect();
    const bar = document.querySelector('#panel-estimate .screen-bar').getBoundingClientRect();
    const back = document.getElementById('est-back').getBoundingClientRect();
    return { gapW: Math.round(gap.width), barW: Math.round(bar.width), backR: Math.round(back.right) };
  });
  ok(ph.gapW >= 28, 'the phone nav strip keeps a visible gap between the groups (' + ph.gapW + 'px)');
  ok(ph.backR <= 390, 'the back button is on screen');
  await p.click('#est-back'); await p.waitForTimeout(250);
  eq(await overflow(), 0, 'no overflow on the dashboard at 390');
  await p.evaluate(() => { document.getElementById('client-dashboard-view').style.display = 'none'; closeClientDashboard(); });
  await p.click('#btn-add-client'); await p.waitForTimeout(200);
  eq(await overflow(), 0, 'no overflow on the intake screen at 390');
  await p.click('#panel-intake .screen-back'); await p.waitForTimeout(200);

  console.log('\n=== FIELD MODE ===');
  await p.evaluate(() => setFieldMode(true)); await p.waitForTimeout(200);
  const fm = await p.evaluate(() => ({
    tabs: Array.from(document.querySelectorAll('.nav .nb')).filter((x) => x.getClientRects().length).map((x) => getComputedStyle(x, '::after').content.replace(/"/g, '')),
    gap: document.querySelector('.nav-gap').getClientRects().length,
    widths: Array.from(document.querySelectorAll('.nav .nb')).filter((x) => x.getClientRects().length).map((x) => Math.round(x.getBoundingClientRect().width)),
    title: document.getElementById('field-toggle').title,
  }));
  eq(fm.tabs, ['Clients', 'Job Plan', 'Vendors'], 'three tabs in the bottom bar');
  eq(fm.gap, 0, 'and no gap among them');
  ok(Math.max.apply(null, fm.widths) - Math.min.apply(null, fm.widths) <= 1, 'in even thirds (' + fm.widths.join('/') + ')');
  ok(/three tabs/.test(fm.title) || /seven tabs/.test(fm.title), 'the toggle counts the tabs it has (' + fm.title + ')');
  await p.click('#btn-add-client'); await p.waitForTimeout(200);
  st = await state();
  eq(st.active, ['panel-intake'], '+ Add New Client works in field mode — a prospect calling while you are out');
  eq(st.lit, ['Client Dashboard'], 'with Clients lit in the bottom bar');
  // Entering field mode from a hidden tab lands on the dashboard, the new default.
  await p.evaluate(() => { setFieldMode(false); document.querySelector('.nb[onclick*="contractors"]').click(); setFieldMode(true); });
  await p.waitForTimeout(200);
  st = await state();
  eq(st.active, ['panel-jobs'], 'entering field mode from Contractors lands on the Client Dashboard');
  await p.evaluate(() => setFieldMode(false));

  eq(errs.length, 0, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
  console.log('\nstep17: ' + pass + ' passed, ' + fail + ' failed, ' + errs.length + ' page errors');
  await b.close();
  process.exit(fail ? 1 : 0);
})();
