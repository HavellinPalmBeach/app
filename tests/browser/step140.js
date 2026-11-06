// Step 140 — Home Preparation, never "for sale" (2026-11-05). Anthony, with a Home Editing client preparing a
// home they are staying in: "call it home preparation rather than home preparation for sale … so that we can
// service clients who aren't selling their homes, and the contracts and estimates and everything read
// appropriately." He took one neutral wording for every client: the service is Home Preparation, the 30% fee
// the Home Preparation Fee, and no client paper says the home is going on the market.
//
// Drives the REAL page: intake's service picker (the option a person picks), the Save Client button, the
// Build Estimate screen on a prep job, the dashboard's own View on the estimate and the agreement (the
// document viewer), and a Home Editing job carrying a painter beside it, whose agreement is the standard
// form a staying-put client signs. Overflow at 1440 and 390 on the estimate in the viewer.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step140.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');
// The house is never assumed to be for sale. A sale of the client's THINGS stays, as it should: the standard form's §8
// (no guarantee of an item's sale price) and a Home Editing plan's items for sale are about contents, not the home.
const SALE_WORDS = ['Home Sale', 'home sale', 'Prep for Sale', 'Property for sale', 'preparation for sale', 'show-ready',
  'Show-Ready', 'property for market', 'photograph and list', 'move the sale price', 'in anticipation of sale', 'a buyer will see'];
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
  const click = async (sel) => { try { await p.click(sel, { timeout: 5000 }); return true; } catch (e) { ok(false, 'could not press ' + sel); return false; } };
  async function press(sel) {
    const n = await p.locator(sel).count();
    ok(n >= 1, 'on screen: ' + sel + ' (' + n + ')');
    if (n < 1) return false;
    try { await p.locator(sel).first().click({ timeout: 5000 }); return true; } catch (e) { ok(false, 'could not press ' + sel); return false; }
  }
  const text = (sel) => p.evaluate((sel) => { const e = document.querySelector(sel); return e ? e.textContent.replace(/\s+/g, ' ') : ''; }, sel);
  // The client's dashboard as a person reaches it: the Clients tab, then the client's row.
  async function openDash(id) {
    await click('.nb[onclick*="\'jobs\'"]'); await p.waitForTimeout(250);
    await press('tr[onclick="openClientDashboard(' + id + ')"]'); await p.waitForTimeout(500);
  }
  const viewerOpen = () => p.evaluate(() => { const o = document.getElementById('doc-viewer-modal'); return !!o && o.style.display === 'flex'; });

  // ── A. INTAKE: THE OPTION A PERSON PICKS ─────────────────────────────────
  console.log('\n## A. Intake offers Home Preparation, and the client saves under it');
  await click('#btn-add-client'); await p.waitForTimeout(400);
  const opt = await p.evaluate(() => { const o = Array.from(document.getElementById('i-svc').options).find(x => x.value === 'prep'); return o ? o.textContent : ''; });
  ok(opt === 'Home Preparation', 'the service picker reads Home Preparation (' + opt + ')');
  try { await p.selectOption('#i-svc', 'prep'); } catch (e) { ok(false, 'could not pick Home Preparation'); }
  await p.waitForTimeout(200);
  await p.evaluate((wt) => {
    const set = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; if (e.onchange) e.onchange(); } };
    const pick = (id) => { const e = document.getElementById(id); const o = e && Array.from(e.options).find(x => x.value); if (o) { e.value = o.value; if (e.onchange) e.onchange(); } };
    set('i-fname', 'Dana'); set('i-lname', 'Staysput'); set('i-addr', '9 Ocean Blvd'); set('i-city', 'Palm Beach'); set('i-zip', '33480');
    set('i-sqft', '3500'); set('i-phone', '(561) 555-0142'); set('i-email', 'dana@example.com'); set('i-home-value', '4200000');
    pick('i-ptype'); pick('i-src'); set('i-walkthrough', wt);
    const st = new Date(wt); st.setDate(st.getDate() + 7); while (st.getDay() === 0 || st.getDay() === 6) st.setDate(st.getDate() + 1);
    set('i-start', st.toISOString().slice(0, 10));
  }, future);
  await click('button[onclick="saveIntake()"]'); await p.waitForTimeout(1500);
  const idP = await p.evaluate(() => { const j = jobs.find(x => x.name && x.name.indexOf('Staysput') >= 0); return j ? j.id : null; });
  ok(!!idP, 'Save Client made the Home Preparation client');
  has(await text('#client-dashboard-view'), 'Home Preparation', 'its dashboard names the service');
  lacks(await text('#client-dashboard-view'), 'for Sale', 'and never "for Sale"');

  // ── B. THE ESTIMATE AND THE AGREEMENT, THROUGH THE DASHBOARD'S OWN VIEW ──
  console.log('\n## B. The estimate and the agreement read right for a client staying put');
  async function buildPrep(id) {
    await p.evaluate((id) => dashGoEstimate(id), id); await p.waitForTimeout(700);
    // The Build Estimate screen's own words for the prep cards, before anything is typed.
    has(await text('#vendors-card-title'), 'Home Preparation — Managed Vendors', 'Build Estimate heads the vendor card Home Preparation');
    const dc = await text('#est-declutter-card');
    has(dc, 'Home Preparation Fee', 'the declutter card names the Home Preparation Fee');
    lacks(dc, 'a buyer', 'and speaks of no buyer');
    return p.evaluate((id) => {
      const js = document.getElementById('e-job'); js.value = String(id); if (js.onchange) js.onchange();
      prepItems.length = 0;
      [['Painting', 20000], ['Landscaping', 9000], ['Cleaning', 6000]].forEach(([t, c]) => prepItems.push({ type: t, cost: c, lid: _srcLid() }));
      renderPrepItems(); calcAll();
      const e = JSON.parse(JSON.stringify(currentEstimate));
      estimateStore[id] = { approved: true, approvedBy: 'Anthony Graziano', estimate: e };
      const job = jobs.find(j => j.id === id);
      job.tc = 'Ashley Jerome'; job.won = true; job.status = 'won'; job.approved = true;
      saveJobs();
      return e;
    }, id);
  }
  const eP = await buildPrep(idP);
  ok(eP && eP.svc === 'prep' && eP.prepFee === 10500, 'a vendors-only prep estimate: $35,000 of trades, a $10,500 fee');
  await openDash(idP);

  async function viewDoc(id, kind) {
    if (await viewerOpen()) await click('#doc-viewer-modal button[onclick="closeDocViewer()"]');
    const sel = '#client-dashboard-view [onclick="docAction(' + id + ",'" + kind + "','view')" + '"]';
    await press(sel); await p.waitForTimeout(600);
    ok(await viewerOpen(), 'View opens the ' + kind + ' in the document viewer');
    return text('#doc-viewer-body');
  }
  const ce = await viewDoc(idP, 'estimate');
  has(ce, 'Home Preparation', 'the estimate names the service Home Preparation');
  has(ce, 'Home Preparation Fee', 'and the fee the Home Preparation Fee');
  has(ce, 'We prepare the home by managing every vendor the work needs', 'its narrative prepares the home');
  has(ce, 'Due at handover of the finished work', 'the final falls due at handover of the finished work');
  for (const w of SALE_WORDS) lacks(ce, w, 'no "' + w + '" on the estimate');
  // Overflow, on the page a person reads.
  for (const w of [1440, 390]) {
    await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(250);
    const ov = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok(ov <= 0, 'no sideways overflow at ' + w + ' px with the estimate open (' + ov + ')');
  }
  await p.setViewportSize({ width: 1440, height: 1000 });

  const agr = await viewDoc(idP, 'agreement');
  has(agr, 'Home Preparation', 'the agreement names the service Home Preparation');
  has(agr, 'home preparation project-management services', '§1.1 names the service without a sale');
  has(agr, 'carry out the preparation work on the Property described in the Estimate', '…and its work as the Estimate describes it');
  has(agr, 'Home Preparation Fee', 'the fee is the Home Preparation Fee');
  for (const w of SALE_WORDS) lacks(agr, w, 'no "' + w + '" on the agreement');

  // ── C. A HOME EDITING CLIENT WITH A PAINTER: THE STANDARD FORM ───────────
  console.log('\n## C. A Home Editing client with a prep vendor signs the standard form, which assumes no sale');
  if (await viewerOpen()) await click('#doc-viewer-modal button[onclick="closeDocViewer()"]');
  await click('.nb[onclick*="\'jobs\'"]'); await p.waitForTimeout(250);
  await click('#btn-add-client'); await p.waitForTimeout(400);
  try { await p.selectOption('#i-svc', 'downsizing'); } catch (e) { ok(false, 'could not pick Home Editing'); }
  await p.evaluate((wt) => {
    const set = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; if (e.onchange) e.onchange(); } };
    const pick = (id) => { const e = document.getElementById(id); const o = e && Array.from(e.options).find(x => x.value); if (o) { e.value = o.value; if (e.onchange) e.onchange(); } };
    set('i-fname', 'Lee'); set('i-lname', 'Editing'); set('i-addr', '3 Lake Way'); set('i-city', 'Palm Beach'); set('i-zip', '33480');
    set('i-sqft', '3000'); set('i-phone', '(561) 555-0177'); set('i-email', 'lee@example.com'); set('i-home-value', '3000000');
    pick('i-ptype'); pick('i-src'); set('i-walkthrough', wt);
    const st = new Date(wt); st.setDate(st.getDate() + 7); while (st.getDay() === 0 || st.getDay() === 6) st.setDate(st.getDate() + 1);
    set('i-start', st.toISOString().slice(0, 10));
  }, future);
  await click('button[onclick="saveIntake()"]'); await p.waitForTimeout(1500);
  const idE = await p.evaluate(() => { const j = jobs.find(x => x.name && x.name.indexOf('Editing') >= 0 && x.svc === 'downsizing'); return j ? j.id : null; });
  ok(!!idE, 'Save Client made the Home Editing client');
  await p.evaluate((id) => dashGoEstimate(id), idE); await p.waitForTimeout(700);
  const eE = await p.evaluate((id) => {
    const js = document.getElementById('e-job'); js.value = String(id); if (js.onchange) js.onchange();
    for (let i = 0; i < 6; i++) setRoomState('r' + i, 'in');
    prepItems.length = 0; prepItems.push({ type: 'Painting', cost: 8000, lid: _srcLid() }); renderPrepItems();
    calcAll();
    const e = JSON.parse(JSON.stringify(currentEstimate));
    estimateStore[id] = { approved: true, approvedBy: 'Anthony Graziano', estimate: e };
    const job = jobs.find(j => j.id === id);
    job.tc = 'Ashley Jerome'; job.won = true; job.status = 'won'; job.approved = true;
    saveJobs(); return e;
  }, idE);
  ok(eE && eE.prepFee === 2400, 'the painter carries the 30% fee on Home Editing ($2,400)');
  await openDash(idE);
  const ceE = await viewDoc(idE, 'estimate');
  has(ceE, 'Home Preparation Fee', 'the Home Editing estimate names the Home Preparation Fee');
  for (const w of SALE_WORDS) lacks(ceE, w, 'no "' + w + '" on the Home Editing estimate');
  // The fee's band in the services table is headed by the work, the row under it naming the fee: a straight rename
  // read "Home Preparation — Home Preparation Fee".
  lacks(ceE, 'Home Preparation — Home Preparation Fee', 'the fee band does not say its name twice');
  has(ceE, 'Home Preparation Fee on the home prep vendors listed below', 'and the row under it names the fee');
  const agrE = await viewDoc(idE, 'agreement');
  has(agrE, 'basic home preparation and staging (excluding real estate brokerage', 'the standard form offers home preparation with the brokerage exclusion');
  has(agrE, 'Home Preparation Fee', 'and charges the Home Preparation Fee on the painter');
  for (const w of SALE_WORDS) lacks(agrE, w, 'no "' + w + '" on the Home Editing agreement');

  // ── D. THE JOB PLAN, AS THE CONCIERGE OPENS IT ────────────────────────────
  console.log('\n## D. The Home Preparation Job Plan names the service and checks the work against the scope');
  if (await viewerOpen()) await click('#doc-viewer-modal button[onclick="closeDocViewer()"]');
  await click('.nb[onclick*="\'job-plan\'"]'); await p.waitForTimeout(300);
  try { await p.selectOption('#plan-job', String(idP)); } catch (e) { ok(false, 'could not pick the client on the Job Plan'); }
  await p.waitForTimeout(900);
  const plan = await text('#panel-job-plan');
  has(plan, 'Home Preparation', 'the plan names the service Home Preparation');
  has(plan, 'All prep work completed and inspected against the approved scope', 'the finishing box checks the work against the approved scope');
  for (const w of SALE_WORDS) lacks(plan, w, 'no "' + w + '" on the Job Plan');

  ok(errs.length === 0, 'no page errors (' + errs.slice(0, 3).join(' | ') + ')');
  await b.close();
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch(async e => { console.log('CRASH ' + e.stack); try { if (b) await b.close(); } catch (_) {} console.log('\n' + pass + ' passed, ' + (fail + 1) + ' failed'); process.exit(1); });
