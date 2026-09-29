// Step 31 (numbered 31 on the merges — the concurrent sessions took 26 to 30) — a change order can be printed and accepted from the screen that shows it (2026-09-29,
// workflow audit H2).
//
// The dead end: printChangeOrder and openCOAcceptModal were called from exactly one place — a hidden
// detail row the client list built for every client and never added to the page. So a change order
// raised from the dashboard's + New could never be printed or accepted; its row read "Awaiting
// acceptance" with nothing to press, and an unaccepted change order moves nothing. Create and Accept
// also printed their notices to #e-fb, a strip on the hidden Build Estimate panel, and redrew nothing,
// so the card went on reading "None issued" under a modal that had just closed. Steps 23–25 passed
// through all of it because they called both functions through page.evaluate; they press the real
// buttons now, and this step is the one that proves the buttons are there.
//
// Plus Q14, Anthony's decision: an hourly change order's hours carry the job's rush premium and discount
// like every other hour; a fixed-price change order is priced at the plain hourly rates; one line on the
// printed change order says so — and only on a job that carries one of them.
//
// Drives the REAL page: the real intake, the real Build Estimate (the expedite toggle and the discount
// box typed into), the client's row in the real list, + New on the Change Orders card, the real modal and
// Create, the row's PDF through the real print path and its Get Acceptance through the real acceptance
// panel, the real dashboard redrawn under each notice, the real client list, at 1440 and 390.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step31.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
let b = null;   // outside the body, so the catch can close it rather than leave node running
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');
(async () => {
  b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  p.setDefaultTimeout(8000);
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  p.on('dialog', async d => { await d.accept(); });
  await p.goto(APP); await p.waitForTimeout(1500);
  await p.evaluate(() => { window.__prints = []; window.print = function () {
    const pt = document.getElementById('print-target');
    window.__prints.push({ html: pt ? pt.innerHTML : '', title: document.title });
  }; });
  const future = (() => { const d = new Date(); d.setDate(d.getDate() + 30);
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10); })();

  // A press that cannot land is a FAILED CHECK, not a crash: against the pre-change build the rest of
  // the run still has something to say about what is missing.
  const click = async (sel) => { try { await p.click(sel, { timeout: 5000 }); return true; } catch (e) { ok(false, 'could not press ' + sel); return false; } };
  async function press(sel) {
    const n = await p.locator(sel).count();
    ok(n === 1, 'one control on screen: ' + sel + ' (' + n + ')');
    if (n !== 1) return false;
    return click(sel);
  }
  const text = (sel) => p.evaluate((sel) => { const e = document.querySelector(sel); return e ? e.textContent.replace(/\s+/g, ' ').trim() : ''; }, sel);
  const T = (h) => p.evaluate((h) => { const d = document.createElement('div');
    d.innerHTML = String(h).replace(/<\/td>/g, ' </td>').replace(/<\/th>/g, ' </th>').replace(/<br>/g, ' ');
    return d.textContent.replace(/\s+/g, ' '); }, h);
  const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

  async function make(last) {
    await p.evaluate(() => { const b = document.getElementById('btn-add-client'); if (b) b.click(); }); await p.waitForTimeout(300);
    const id = await p.evaluate(([wt, last]) => {
      const set = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; if (e.onchange) e.onchange(); } };
      const pick = (id) => { const e = document.getElementById(id); const o = e && Array.from(e.options).find(x => x.value); if (o) { e.value = o.value; if (e.onchange) e.onchange(); } };
      set('i-svc', 'downsizing'); toggleIntakeFields();
      set('i-fname', 'Pat'); set('i-lname', last); set('i-addr', '1 A St'); set('i-city', 'Palm Beach'); set('i-zip', '33480');
      set('i-sqft', '3500'); set('i-phone', '(561) 555-0199'); set('i-email', 'c@example.com'); set('i-home-value', '4200000');
      pick('i-ptype'); pick('i-src'); set('i-walkthrough', wt);
      const st = new Date(wt); st.setDate(st.getDate() + 7); while (st.getDay() === 0 || st.getDay() === 6) st.setDate(st.getDate() + 1);
      set('i-start', st.toISOString().slice(0, 10)); saveIntake(); return (jobs[0] || {}).id;
    }, [future, last]);
    await p.waitForTimeout(1500); return id;
  }
  // The real Build Estimate, with the expedite toggle and the discount box set on the form itself, then
  // approved, won and signed — the state a change order is raised in.
  async function build(id, o) {
    await p.evaluate((id) => dashGoEstimate(id), id); await p.waitForTimeout(700);
    return p.evaluate(([id, o]) => {
      const js = document.getElementById('e-job'); js.value = String(id); if (js.onchange) js.onchange();
      for (let i = 0; i < 6; i++) setRoomState('r' + i, 'in');
      document.getElementById('e-rush').checked = !!o.rush;
      document.getElementById('e-discount').value = String(o.disc || 0);
      calcAll();
      if (o.fixed) {
        const fx = document.getElementById('e-fixed'); fx.checked = true; toggleFixedPrice(); calcAll();
        _fxAmtSet(o.fixed); markFixedAmountEdited(); calcAll();
      }
      const e = JSON.parse(JSON.stringify(currentEstimate));
      estimateStore[id] = { approved: true, approvedBy: 'Anthony Graziano', estimate: e };
      const job = jobs.find(j => j.id === id);
      job.won = true; job.status = 'active'; job.agrSigned = true; job.agrSent = true;
      return e;
    }, [id, o]);
  }
  // The client's own row in the real list — the way anybody reaches a dashboard.
  async function openDash(id) {
    await click('.nb[onclick*="\'jobs\'"]'); await p.waitForTimeout(250);
    await press('tr[onclick="openClientDashboard(' + id + ')"]'); await p.waitForTimeout(400);
  }
  const dashShown = (id) => p.evaluate((id) => { const v = document.getElementById('client-dashboard-view');
    return !!(v && v.offsetParent !== null && _dashboardJobId === id); }, id);
  // The Change Orders card: its rows, and the buttons on each, read off the rendered page.
  const card = () => p.evaluate(() => {
    const c = Array.from(document.querySelectorAll('#client-dashboard-view .card')).find(x => /Raise a change order/.test(x.textContent));
    if (!c) return null;
    return {
      text: c.textContent.replace(/\s+/g, ' '),
      rows: Array.from(c.querySelectorAll('.doc-r')).map(r => ({
        text: r.textContent.replace(/\s+/g, ' ').trim(),
        buttons: Array.from(r.querySelectorAll('button')).map(bt => ({ label: bt.textContent.trim(), call: bt.getAttribute('onclick'),
          bg: getComputedStyle(bt).backgroundColor, visible: bt.offsetParent !== null })) })),
    };
  });
  const fb = () => p.evaluate(() => { const e = document.getElementById('dash-fb');
    return { text: e ? e.textContent.replace(/\s+/g, ' ').trim() : '', visible: !!(e && e.offsetParent !== null) }; });

  // ── A. THE HOURLY JOB ────────────────────────────────────────────────────
  console.log('\n## A. Home Editing, time and materials, expedited, 10% preferred-client discount');
  const idH = await make('Rush');
  const eH = await build(idH, { rush: true, disc: 10 });
  ok(eH.rush === true && eH.discountPct === 10 && !eH.fixedPrice, 'an hourly estimate carrying the premium and the discount');
  ok(Math.round((eH.rushPct || 0) * 100) === 20, 'the premium pinned on the estimate at 20% (' + eH.rushPct + ')');

  await openDash(idH);
  ok(await dashShown(idH), 'the client’s row opens their dashboard');
  const c0 = await card();
  ok(!!c0, 'the dashboard carries the Change Orders card');
  has(c0 && c0.text, 'None issued', 'with nothing issued yet');

  // ── B. CREATE ────────────────────────────────────────────────────────────
  console.log('\n## B. + New, then Create — the notice and the redrawn card, on the screen it was raised from');
  await press('#client-dashboard-view button[onclick="openChangeOrder(' + idH + ')"]'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => document.getElementById('change-order-modal').style.display === 'flex'), '+ New opens the change-order modal');
  await p.fill('#co-tc-hrs', '8'); await p.fill('#co-ps-hrs', '8');
  await p.fill('#co-description', 'Added the pool house to scope.');
  await press('#change-order-modal button:has-text("Create Change Order")'); await p.waitForTimeout(300);
  const coId = await p.evaluate((id) => { const c = changeOrders.filter(c => c.jobId === id).pop(); return c ? c.id : null; }, idH);
  ok(!!coId, 'Create writes the change order');
  ok(await p.evaluate(() => document.getElementById('change-order-modal').style.display === 'none'), 'and closes the modal');
  ok(await dashShown(idH), 'leaving you on the dashboard you raised it from');

  const n1 = await fb();
  ok(n1.visible, '⚠⚠ the notice is on screen, in the dashboard’s own strip');
  has(n1.text, 'created (+8.0 concierge / +8.0 specialist hrs) — waiting on the client', 'naming the change order and what it waits on');
  has(n1.text, 'PDF prints it for them to sign and Get Acceptance records their agreement', 'and the two controls that finish it');
  lacks(n1.text, 'Open the job in Client Dashboard', '⚠ never sending you to the screen you are on');
  const eFb = await p.evaluate(() => (document.getElementById('e-fb') || {}).textContent || '');
  lacks(eFb, 'Change', 'nothing printed to the hidden Build Estimate strip');

  const c1 = await card();
  const row1 = c1 && c1.rows.find(r => r.text.indexOf('CO-' + String(coId).slice(-6)) >= 0);
  ok(!!row1, '⚠⚠ the card is redrawn at once — the new row is on screen');
  lacks(c1 && c1.text, 'None issued', 'and the card no longer reads None issued');
  has(c1 && c1.text, '1 issued', 'it counts one');
  has(row1 && row1.text, 'Awaiting acceptance', 'the row reads Awaiting acceptance …');
  const b1 = row1 ? row1.buttons : [];
  ok(b1.length === 2 && b1[0].label === 'PDF' && /Get Acceptance/i.test(b1[1].label), '⚠⚠ … with PDF and Get Acceptance on it (' + b1.map(x => x.label).join(' · ') + ')');
  ok(b1.length === 2 && b1[0].call === 'printChangeOrder(' + coId + ')' && b1[1].call === 'openCOAcceptModal(' + coId + ')',
     '⚠⚠ each naming this change order');
  ok(b1.length === 2 && b1[1].bg === 'rgb(166, 124, 69)', 'Get Acceptance is the bronze primary (' + (b1[1] ? b1[1].bg : '') + ')');
  ok(b1.every(x => x.visible), 'both are visible');

  // ── C. PDF ───────────────────────────────────────────────────────────────
  console.log('\n## C. PDF — the client’s copy, and Q14 on it');
  await p.evaluate(() => { window.__prints = []; });
  await press('#client-dashboard-view button[onclick="printChangeOrder(' + coId + ')"]'); await p.waitForTimeout(400);
  const pr = await p.evaluate(() => window.__prints[0] || null);
  ok(!!(pr && pr.html), '⚠⚠ the PDF button prints the change order through the real print path');
  ok(/^Havellin Change Order CO-\d{6} - 1 A St - /.test(pr ? pr.title : ''), 'named for what it is (' + (pr ? pr.title : '') + ')');
  const prt = pr ? await T(pr.html) : '';
  has(prt, 'This change order does not itself create a charge.', 'the T&M terms');
  has(prt, 'Like every other hour on this engagement, these hours carry the 20% expedited-delivery premium and the 10% preferred-client discount on the final invoice.',
      '⚠⚠ Q14: the hours carry the job’s premium and discount, in one line');
  ok(!/\$\s?[\d,]/.test(prt), 'and still no dollar figure on a T&M change order');
  await p.waitForTimeout(700);
  ok(await dashShown(idH), 'printing leaves you on the dashboard');

  // ── D. GET ACCEPTANCE ────────────────────────────────────────────────────
  console.log('\n## D. Get Acceptance, then Accept — the row, the notice and the hours all move');
  await press('#client-dashboard-view button[onclick="openCOAcceptModal(' + coId + ')"]'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => document.getElementById('co-accept-modal').style.display === 'flex'), 'Get Acceptance opens the acceptance panel');
  has(await text('#coa-co-ref'), 'CO-' + String(coId).slice(-6), 'on this change order');
  await p.fill('#coa-client-name', 'Pat Rush');
  await press('#co-accept-modal button:has-text("I Accept This Change Order")'); await p.waitForTimeout(300);
  ok(await p.evaluate((c) => { const co = changeOrders.find(x => x.id === c); return !!(co && co.clientApproved && co.clientName === 'Pat Rush'); }, coId),
     'Accept records the client’s agreement');
  ok(await p.evaluate(() => document.getElementById('co-accept-modal').style.display === 'none'), 'and closes the panel');
  const n2 = await fb();
  ok(n2.visible, 'the acceptance notice is on the dashboard');
  has(n2.text, 'Change Order accepted by Pat Rush (+8.0 concierge / +8.0 specialist hrs). These hours bill on the final invoice as they are worked.',
      'saying who accepted and how the hours bill');
  const c2 = await card();
  const row2 = c2 && c2.rows.find(r => r.text.indexOf('CO-' + String(coId).slice(-6)) >= 0);
  has(row2 && row2.text, 'Accepted', '⚠⚠ the row reads Accepted at once');
  has(row2 && row2.text, 'accepted by Pat Rush', 'naming who accepted');
  ok(row2 && row2.buttons.length === 1 && row2.buttons[0].call === 'printChangeOrder(' + coId + ')', '⚠ and offers the PDF alone');
  ok(await p.evaluate(() => document.querySelectorAll('#client-dashboard-view [onclick^="openCOAcceptModal("]').length === 0),
     'nothing left to accept on the screen');
  has(await text('#client-dashboard-view'), 'incl. +8.0 hrs by change order', '⚠⚠ the Hours Log bars now carry the hours the client signed for');

  // ── E. A SECOND, PENDING CHANGE ORDER BESIDE IT ──────────────────────────
  await press('#client-dashboard-view button[onclick="openChangeOrder(' + idH + ')"]'); await p.waitForTimeout(200);
  await p.fill('#co-tc-hrs', '2'); await p.fill('#co-description', 'Cleared the storage unit as well.');
  await press('#change-order-modal button:has-text("Create Change Order")'); await p.waitForTimeout(300);
  const co2 = await p.evaluate((id) => changeOrders.filter(c => c.jobId === id).pop().id, idH);
  const c3 = await card();
  ok(c3 && c3.rows.filter(r => /CO-\d{6}/.test(r.text)).length === 2, 'two change orders on the card');
  const calls = await p.evaluate(() => Array.from(document.querySelectorAll('#client-dashboard-view [onclick]')).map(e => e.getAttribute('onclick')));
  ok(calls.filter(c => c === 'openCOAcceptModal(' + co2 + ')').length === 1 && calls.filter(c => /^openCOAcceptModal\(/.test(c)).length === 1,
     'Get Acceptance on the pending one only');
  ok(calls.filter(c => /^printChangeOrder\(/.test(c)).length === 2, 'a PDF on each');
  ok(calls.length === new Set(calls).size, 'no control on the dashboard twice (' + calls.length + ')');

  // ── F. THE FIXED PRICE ───────────────────────────────────────────────────
  console.log('\n## F. A fixed price at $24,000, expedited, 10% off — the change order is at the plain rates');
  const idF = await make('Flat');
  const eF = await build(idF, { rush: true, disc: 10, fixed: 24000 });
  ok(eF.fixedPrice === true && eF.fixedAmount === 24000 && eF.rush === true, 'a $24,000 fixed fee, expedited');
  await openDash(idF);
  await press('#client-dashboard-view button[onclick="openChangeOrder(' + idF + ')"]'); await p.waitForTimeout(200);
  await p.fill('#co-tc-hrs', '8'); await p.fill('#co-ps-hrs', '8'); await p.fill('#co-description', 'Added the pool house to scope.');
  await press('#change-order-modal button:has-text("Create Change Order")'); await p.waitForTimeout(300);
  const coF = await p.evaluate((id) => changeOrders.filter(c => c.jobId === id).pop().id, idF);
  await p.evaluate(() => { window.__prints = []; });
  await press('#client-dashboard-view button[onclick="printChangeOrder(' + coF + ')"]'); await p.waitForTimeout(400);
  const prF = await p.evaluate(() => window.__prints[0] || null);
  const prFt = prF ? await T(prF.html) : '';
  has(prFt, 'This change order adjusts your fixed project fee by the amount above.', 'the fixed terms');
  has(prFt, '+ $2,000', 'the price is 8 × $150 + 8 × $100 — the plain rate card');
  has(prFt, 'It is priced at the plain hourly rates shown: the expedited-delivery premium and the preferred-client discount in your fixed project fee do not apply to it.',
      '⚠⚠ Q14: said in one line on the fixed page');
  lacks(prFt, '20% expedited', 'with no percentage — the fixed-price estimate never itemised the premium');
  await p.waitForTimeout(700);

  // A plain fixed job with neither prints no line: explaining an absence draws attention to it.
  const idN = await make('Plain');
  await build(idN, { fixed: 24000 });
  await openDash(idN);
  await press('#client-dashboard-view button[onclick="openChangeOrder(' + idN + ')"]'); await p.waitForTimeout(200);
  await p.fill('#co-tc-hrs', '4'); await p.fill('#co-description', 'Garage shelving.');
  await press('#change-order-modal button:has-text("Create Change Order")'); await p.waitForTimeout(300);
  const coN = await p.evaluate((id) => changeOrders.filter(c => c.jobId === id).pop().id, idN);
  await p.evaluate(() => { window.__prints = []; });
  await press('#client-dashboard-view button[onclick="printChangeOrder(' + coN + ')"]'); await p.waitForTimeout(400);
  const prN = await p.evaluate(() => window.__prints[0] || null);
  lacks(prN ? await T(prN.html) : 'x plain hourly rates', 'plain hourly rates', 'a fixed job with neither premium nor discount prints no such line');
  await p.waitForTimeout(700);

  // ── G. THE CLIENT LIST HAS NO DEAD DETAIL ROW ────────────────────────────
  console.log('\n## G. The client list');
  await click('.nb[onclick*="\'jobs\'"]'); await p.waitForTimeout(300);
  const list = await p.evaluate(() => ({ detail: document.querySelectorAll('[id^="detail-"]').length,
    rows: document.querySelectorAll('tr[onclick^="openClientDashboard("]').length,
    // Scoped to the list's own table: the dashboard drilldown lives inside the same panel, hidden but
    // still holding the last client's buttons, so a panel-wide count would read those as the list's.
    coCalls: document.querySelectorAll('#jobs-body [onclick*="ChangeOrder("], #jobs-body [onclick*="openCOAcceptModal("]').length,
    dashShown: (() => { const v = document.getElementById('client-dashboard-view'); return !!(v && v.offsetParent !== null); })() }));
  ok(list.rows >= 3 && !list.dashShown, 'the list is on screen with its clients (' + list.rows + ')');
  ok(list.detail === 0, 'no hidden detail row anywhere in the page');
  ok(list.coCalls === 0, 'and no change-order control on the list — the dashboard card is its one home');

  // ── H. OVERFLOW ──────────────────────────────────────────────────────────
  for (const w of [1440, 390]) {
    await p.setViewportSize({ width: w, height: 900 });
    await openDash(idH);
    const ov = await overflow();
    ok(ov <= 0, 'the dashboard with an accepted and a pending change order fits at ' + w + 'px (overflow ' + ov + ')');
    const rects = await p.evaluate(() => Array.from(document.querySelectorAll('#client-dashboard-view [onclick^="printChangeOrder("], #client-dashboard-view [onclick^="openCOAcceptModal("]'))
      .map(e => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, w: r.width }; }));
    ok(rects.length === 3 && rects.every(r => r.l >= 0 && r.r <= w + 0.5 && r.w > 0), 'all three change-order buttons sit inside the viewport at ' + w + 'px');
  }
  ok(errs.length === 0, 'no page errors (' + errs.join(' | ') + ')');

  await b.close();
  console.log('\nstep31: ' + pass + ' passed, ' + fail + ' failed');
})().catch(async e => {
  console.log('THREW ' + (e && e.stack || e));
  console.log('step31: ' + pass + ' passed, ' + (fail + 1) + ' failed');
  try { if (b) await b.close(); } catch (_) { /* already gone */ }
});
