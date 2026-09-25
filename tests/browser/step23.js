// Step 23 — on a fixed price the change-order trigger is SCOPE, never the 15%, and the change order
// carries its price (2026-09-25). Anthony: "Is a 15% over run change order necessary on a fixed price
// job, or should it be a 'Change of Scope' or something that triggers a change order?"
//
// Seven screens spoke the time-and-materials rule on a flat-fee job: the change-order readout, the note
// above its hours boxes, the acceptance panel, the printed change order, the Client Dashboard's Hours
// Log, the Job Plan's hours summary and projection, and the line under the hours fold. On a fixed price
// they now name the price (the change order) or the margin (the hours); on T&M they read as before.
//
// Drives the REAL page: the real change-order modal typed into, the real Create and Accept buttons, the
// real print path (window.print stubbed to read the print target), the real invoices across three
// stages, the real dashboard and the real Job Plan — on a fixed-price job and a T&M job side by side.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step23.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  p.on('dialog', async d => { await d.accept(); });
  await p.goto(APP); await p.waitForTimeout(1500);
  // window.print is where _printDocument hands off; read the print target at that moment.
  await p.evaluate(() => { window.__prints = []; window.print = function () {
    const pt = document.getElementById('print-target');
    window.__prints.push({ html: pt ? pt.innerHTML : '', title: document.title });
  }; });
  const future = (() => { const d = new Date(); d.setDate(d.getDate() + 30);
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10); })();

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

  // Build an estimate on the real Build Estimate screen, then approve it and mark the client won —
  // the state a change order is raised in. fixed: false | number (the flat fee).
  async function build(id, fixed) {
    await p.evaluate((id) => dashGoEstimate(id), id); await p.waitForTimeout(700);
    return p.evaluate(([id, fixed]) => {
      const js = document.getElementById('e-job'); js.value = String(id); if (js.onchange) js.onchange();
      for (let i = 0; i < 6; i++) setRoomState('r' + i, 'in');
      calcAll();
      if (fixed) {
        const fx = document.getElementById('e-fixed'); fx.checked = true; toggleFixedPrice(); calcAll();
        _fxAmtSet(fixed); markFixedAmountEdited(); calcAll();
      }
      const e = JSON.parse(JSON.stringify(currentEstimate));
      estimateStore[id] = { approved: true, approvedBy: 'Anthony Graziano', estimate: e };
      const job = jobs.find(j => j.id === id);
      job.won = true; job.status = 'active'; job.agrSigned = true; job.agrSent = true;
      return e;
    }, [id, fixed]);
  }

  const T = (h) => p.evaluate((h) => { const d = document.createElement('div');
    d.innerHTML = String(h).replace(/<\/td>/g, ' </td>').replace(/<\/th>/g, ' </th>').replace(/<br>/g, ' ');
    return d.textContent.replace(/\s+/g, ' '); }, h);
  const text = (sel) => p.evaluate((sel) => { const e = document.querySelector(sel); return e ? e.textContent.replace(/\s+/g, ' ') : ''; }, sel);

  // Raise a change order through the real modal; returns the readout seen while typing and the new id.
  async function raise(id, tc, ps, desc) {
    await p.evaluate((id) => openChangeOrder(id), id); await p.waitForTimeout(150);
    if (tc) await p.fill('#co-tc-hrs', String(tc));
    if (ps) await p.fill('#co-ps-hrs', String(ps));
    await p.fill('#co-description', desc);
    const seen = {
      shown: await p.evaluate(() => document.getElementById('change-order-modal').style.display),
      reasons: await p.evaluate(() => Array.from(document.getElementById('co-reason').options).map(o => o.value + '|' + o.textContent)),
      reason: await p.evaluate(() => document.getElementById('co-reason').value),
      basis: await text('#co-basis-note'), readout: await text('#co-hrs-note'),
    };
    await p.click('#change-order-modal .btn-p'); await p.waitForTimeout(200);
    seen.coId = await p.evaluate(([id, desc]) => { const c = changeOrders.filter(c => c.jobId === id && c.description === desc).pop(); return c ? c.id : null; }, [id, desc]);
    seen.closed = await p.evaluate(() => document.getElementById('change-order-modal').style.display === 'none');
    return seen;
  }
  async function accept(coId, name) {
    await p.evaluate((c) => openCOAcceptModal(c), coId); await p.waitForTimeout(200);
    const seen = { summary: await text('#coa-summary'), terms: await text('#coa-terms') };
    await p.fill('#coa-client-name', name);
    await p.click('#co-accept-modal .btn-p'); await p.waitForTimeout(200);
    seen.accepted = await p.evaluate((c) => { const co = changeOrders.find(x => x.id === c); return !!(co && co.clientApproved); }, coId);
    return seen;
  }
  async function print(coId) {
    await p.evaluate((c) => { window.__prints = []; printChangeOrder(c); }, coId); await p.waitForTimeout(350);
    const got = await p.evaluate(() => window.__prints[0] || null);
    await p.waitForTimeout(700);
    got.after = await p.evaluate(() => ({ target: document.getElementById('print-target').innerHTML.length,
      visible: Array.from(document.querySelectorAll('.panel')).filter(x => getComputedStyle(x).display !== 'none').length }));
    got.text = await T(got.html);
    return got;
  }
  // Over the hours: every room cleared, and 30% more hours logged than the job is AUTHORISED for —
  // the estimate plus its accepted change orders. ⚠ Restated 2026-09-25 (step24): this fixture logged
  // 30% over the ESTIMATE, and both jobs here hold accepted change orders by this point, which since
  // that date raise the line the hours are measured against. 130% of the estimate is inside it now,
  // correctly — so the fixture has to overrun what the client actually authorised.
  async function overrun(id, e) {
    await p.evaluate(([id, e]) => {
      const plan = getJobPlan(id);
      e.rooms.forEach(r => { plan.rooms[r.idx] = Object.assign(plan.rooms[r.idx] || {}, { status: 'cleared' }); });
      const co = (typeof coAcceptedHours === 'function') ? coAcceptedHours(id) : { tc: 0, ps: 0 };
      const tc = Math.ceil(((e.totTC || 0) + co.tc) * 1.3), ps = Math.ceil(((e.totPS || 0) + co.ps) * 1.3);
      jobLogs[id] = [{ id: Date.now(), date: '2026-09-24', activity: 'Rooms', members: [
        { name: 'Anthony Graziano', role: 'TC', hours: tc }, { name: 'Anthony Graziano Jr', role: 'PS', hours: ps }] }];
    }, [id, e]);
  }

  // ── A. FIXED PRICE ───────────────────────────────────────────────────────
  console.log('\n## A. Home Editing, fixed price at $24,000');
  const idF = await make('Flat');
  const eF = await build(idF, 24000);
  ok(eF.fixedPrice === true && eF.fixedAmount === 24000, 'the estimate is a $24,000 fixed fee (' + eF.fixedAmount + ')');
  ok(eF.tcRate === 150 && eF.psRate === 100, 'at the standard $150 / $100 rates');

  const c1 = await raise(idF, 20, 20, 'Added the pool house to scope.');
  ok(c1.shown === 'flex', 'the change-order modal opens');
  ok(c1.reasons.length === 6 && c1.reason === 'scope_add', 'six reasons, filled from the one list, defaulting to scope addition');
  ok(c1.reasons.indexOf('scope_add|Scope addition — new rooms or services') >= 0, 'each option carries its label');
  has(c1.basis, 'On a fixed price the change order is the charge', 'the note above the boxes says the change order is the charge');
  has(c1.basis, 'The trigger is a change in scope, never the hours.', 'and that the trigger is scope');
  lacks(c1.basis, 'carries no price', 'not the T&M note');
  has(c1.readout, '+20.0 concierge / +20.0 specialist hrs at $150 / $100 an hour', 'the readout prices the hours at the job’s rates');
  has(c1.readout, '+ $5,000 on the fixed project fee, which goes from $24,000 to $29,000.', 'and names the change to the fee and the fee it leaves');
  has(c1.readout, 'This is the price printed on the change order and added to the final invoice, whatever the work actually takes.', 'and that it is the price');
  lacks(c1.readout, '15%', 'no 15% on a fixed-price change order');
  ok(c1.coId && c1.closed, 'the real Create button saved it and closed the modal');

  const a1 = await accept(c1.coId, 'Pat Flat');
  has(a1.summary, 'Reason: Scope addition — new rooms or services', 'the acceptance panel prints the reason’s label');
  lacks(a1.summary, 'scope_add', 'never the internal key');
  ok(/Change to the fixed project fee\s*\+ \$5,000/.test(a1.summary), 'the client signs under the change to the fixed fee');
  ok(/Revised fixed project fee\s*\$29,000/.test(a1.summary), 'and the revised fee');
  has(a1.summary, 'Priced at +20.0 concierge hrs at $150/hr · +20.0 specialist hrs at $100/hr.', 'and what it was priced at');
  lacks(a1.summary, 'No charge is created', 'not the T&M sentence');
  has(a1.terms, 'and to the change to the fixed project fee shown above, which is added on the final invoice.', 'the terms sentence names the fee');
  ok(a1.accepted, 'the real Accept button recorded it');
  const est1 = await p.evaluate((id) => jobs.find(j => j.id === id).havellinEst, idF);
  ok(est1 === eF.havellinTotal + 5000, 'the job’s figure moves by the change order’s price (' + est1 + ')');

  const p1 = await print(c1.coId);
  ok(!!p1.html, 'the change order printed through the real print path');
  has(p1.text, 'Fixed project fee in your agreement $24,000', 'the printed change order starts from the agreed fee');
  has(p1.text, '+ $5,000', 'carries its price');
  has(p1.text, '+20.0 concierge hrs at $150/hr · +20.0 specialist hrs at $100/hr', 'with the hours and rates behind it');
  has(p1.text, 'Revised fixed project fee $29,000', 'and the revised fee');
  has(p1.text, 'This change order adjusts your fixed project fee by the amount above.', 'and says it is the charge');
  lacks(p1.text, 'does not itself create a charge', 'not the T&M sentence');
  lacks(p1.text, 'Hours on the approved estimate', 'no hour count for the agreed scope on a fixed-price page');
  has(p1.text, 'Reason: Scope addition — new rooms or services', 'the reason’s label');
  ok(/^Havellin Change Order CO-\d{6} - 1 A St - /.test(p1.title), 'the PDF is named after the change order (' + p1.title + ')');
  ok(p1.after.target === 0 && p1.after.visible === 1, 'the print target clears and one panel is left on screen');

  // A second, small change order: the first one sits above it, and the fee follows.
  const c2 = await raise(idF, 0, 2, 'Cleared the storage unit as well.');
  has(c2.readout, '+ $200 on the fixed project fee, which goes from $29,000 to $29,200.', 'the second readout starts from the fee after the first');
  has(c2.readout, '($24,000 agreed, plus $5,000 of change orders already accepted.)', 'and says where that figure came from');
  await accept(c2.coId, 'Pat Flat');
  const p2 = await print(c2.coId);
  has(p2.text, 'Change orders already accepted + $5,000', 'change order #2 prints the one before it');
  has(p2.text, 'Revised fixed project fee $29,200', 'and the fee after both');
  const p1b = await print(c1.coId);
  lacks(p1b.text, 'Change orders already accepted', 'change order #1 never shows #2 above it');

  // The three invoices on the fixed job.
  const inv = await p.evaluate((id) => {
    const job = jobs.find(j => j.id === id);
    const T = (h) => { const d = document.createElement('div'); d.innerHTML = h.replace(/<\/td>/g, ' </td>').replace(/<\/th>/g, ' </th>'); return d.textContent.replace(/\s+/g, ' '); };
    const dep = invoiceHtml(job, 'deposit');
    job.payments = [{ id: 1, uid: 'p1', stage: 'deposit', amount: dep.amtDue, method: 'wire', date: '2026-09-24', clearedOn: '2026-09-24' }];
    const mid = invoiceHtml(job, 'midpoint');
    job.payments.push({ id: 2, uid: 'p2', stage: 'midpoint', amount: mid.amtDue, method: 'wire', date: '2026-09-24', clearedOn: '2026-09-24' });
    const fin = invoiceHtml(job, 'final');
    const d = document.createElement('div'); d.innerHTML = fin.html;
    const coTbl = Array.from(d.querySelectorAll('table')).find(t => /Added the pool house/.test(t.textContent));
    return { dep: dep.amtDue, mid: mid.amtDue, fin: fin.amtDue, blocked: fin.blocked, pin: fin.requiresApproval, t: T(fin.html),
      coHead: coTbl ? Array.from(coTbl.querySelectorAll('th')).map(x => x.textContent.trim()) : [],
      coText: coTbl ? T(coTbl.outerHTML) : '' };
  }, idF);
  console.log('   deposit', inv.dep, 'midpoint', inv.mid, 'final', inv.fin);
  ok(inv.dep === 12000 && inv.mid === 6000, 'deposit and midpoint stay anchored to the $24,000 fee');
  ok(inv.fin === 24000 + 5200 - 12000 - 6000, 'the final adds exactly the two signed prices (' + inv.fin + ')');
  ok(!inv.blocked && !inv.pin, 'a fixed final is neither blocked nor held for a PIN');
  ok(inv.coHead.indexOf('Amount') >= 0, 'the Approved Change Orders table carries an Amount column (' + inv.coHead.join(' | ') + ')');
  has(inv.coText, 'Added the pool house to scope.', 'the first change order is listed');
  has(inv.coText, '+ $5,000', 'at its signed price');
  has(inv.coText, '+ $200', 'the second at its signed price');
  has(inv.coText, '+ $5,200', 'and the two add up');
  has(inv.t, 'Each is charged at the price on the change order you accepted and added to the fixed project fee above', 'the invoice says where the figure came from');
  has(inv.t, 'Approved Change Orders (2) + $5,200', 'the payment summary row');
  lacks(inv.t, 'billed in the hours above', 'no hours claim on a fixed-price invoice');

  // Over the hours on the fixed job: a margin warning, never a stop.
  await overrun(idF, eF);
  await p.evaluate((id) => openClientDashboard(id), idF); await p.waitForTimeout(500);
  const dashF = await text('#client-dashboard-view');
  has(dashF, 'On a fixed price that is ours to absorb', 'the dashboard Hours Log: ours to absorb');
  has(dashF, 'If the extra time is work beyond the agreed scope, raise a change order before doing more of it.', 'and a change order only for scope');
  lacks(dashF, 'must be notified', 'no client-notice duty on a flat fee');
  await p.evaluate((id) => openJobPlanFor(id, 'hours'), idF); await p.waitForTimeout(900);
  const alertF = await text('#log-overage-alert');
  const projF = await text('#projection-output');
  const planF = await text('#job-plan-content');
  has(alertF, 'On a fixed price that is ours to absorb', 'the Job Plan hours summary reads the same sentence');
  has(projF, 'Over the estimated hours — margin at risk', 'the projection headline is a margin warning');
  has(projF, 'On a fixed price that comes out of the margin, not the client\'s bill, and it is not a reason to stop.', 'the red band says so');
  lacks(projF, 'STOP', 'no STOP on a fixed-price job');
  has(planF, 'On a fixed price, over the line is a margin warning, not a stop', 'the line under the hours fold');
  lacks(planF, 'Change Order before the next room', 'not the T&M line');

  // ── B. TIME AND MATERIALS, unchanged ─────────────────────────────────────
  console.log('\n## B. Home Editing, time and materials');
  const idH = await make('Hourly');
  const eH = await build(idH, false);
  // ⚠ Built straight after the fixed-price client WITHOUT saving it — the path that used to hand
  // this client the fixed-price tick (fixed 2026-09-25 in applyOpenedEstimate).
  ok(!eH.fixedPrice, 'an hourly estimate — the last client’s fixed price did not carry over');
  const h1 = await raise(idH, 20, 20, 'Added the pool house to scope.');
  has(h1.basis, 'A change order carries no price and bills nothing on its own', 'the T&M note');
  ok(/hrs on the estimate becomes .* \([+−]\d+\.\d%\)/.test(h1.readout), 'the T&M readout measures against the estimate’s hours (' + h1.readout.slice(0, 90) + ')');
  ok(/15% (threshold|the client already agreed to)/.test(h1.readout), 'and against the 15%');
  lacks(h1.readout, '$', 'no dollar figure in the T&M readout');
  const ha = await accept(h1.coId, 'Pat Hourly');
  has(ha.summary, 'No charge is created by this change order.', 'the T&M acceptance creates no charge');
  has(ha.summary, 'Reason: Scope addition — new rooms or services', 'and prints the reason’s label too');
  has(ha.terms, 'and the additional hours it is expected to take', 'the T&M terms sentence');
  const hp = await print(h1.coId);
  has(hp.text, 'This change order does not itself create a charge.', 'the T&M printed change order creates no charge');
  has(hp.text, 'Hours on the approved estimate', 'and foots in hours');
  ok(!/\$\s?[\d,]/.test(hp.text), 'no dollar figure anywhere on the T&M change order');
  await overrun(idH, eH);
  await p.evaluate((id) => openClientDashboard(id), idH); await p.waitForTimeout(500);
  has(await text('#client-dashboard-view'), 'The client must be notified in writing before work continues', 'the T&M dashboard keeps the notice duty');
  await p.evaluate((id) => openJobPlanFor(id, 'hours'), idH); await p.waitForTimeout(900);
  has(await text('#log-overage-alert'), 'The client must be notified in writing before work continues', 'the T&M hours summary too');
  const projH = await text('#projection-output');
  has(projH, 'STOP — Change Order Required', 'the T&M projection still says STOP');
  has(await text('#job-plan-content'), 'Stop — Change Order before the next room.', 'and the T&M line under the fold');

  // ── C. Overflow with each modal open ─────────────────────────────────────
  for (const w of [1440, 390]) {
    await p.setViewportSize({ width: w, height: 900 });
    await p.evaluate((id) => { openChangeOrder(id); document.getElementById('co-tc-hrs').value = '20'; updateCOHours(); }, idF); await p.waitForTimeout(200);
    const ov1 = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const box = await p.evaluate(() => { const r = document.querySelector('#change-order-modal > div').getBoundingClientRect(); return { l: r.left, r: r.right }; });
    ok(ov1 <= 0 && box.l >= 0 && box.r <= w, 'change-order modal fits at ' + w + 'px (overflow ' + ov1 + ', box ' + Math.round(box.l) + '–' + Math.round(box.r) + ')');
    await p.evaluate(() => closeChangeOrder());
    await p.evaluate((c) => openCOAcceptModal(c), c1.coId); await p.waitForTimeout(200);
    const ov2 = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const box2 = await p.evaluate(() => { const r = document.querySelector('#co-accept-modal > div').getBoundingClientRect(); return { l: r.left, r: r.right }; });
    ok(ov2 <= 0 && box2.l >= 0 && box2.r <= w, 'acceptance modal fits at ' + w + 'px (overflow ' + ov2 + ', box ' + Math.round(box2.l) + '–' + Math.round(box2.r) + ')');
    await p.evaluate(() => closeCOAcceptModal());
  }
  ok(errs.length === 0, 'no page errors (' + errs.join(' | ') + ')');

  await b.close();
  console.log('\nstep23: ' + pass + ' passed, ' + fail + ' failed');
})().catch(e => { console.log('THREW ' + (e && e.stack || e)); console.log('step23: ' + pass + ' passed, ' + (fail + 1) + ' failed'); });
