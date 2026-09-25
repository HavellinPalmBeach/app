// Step 24 — an accepted change order is part of the hours a job is measured against (2026-09-25).
// Anthony, on the list of what the fixed-price change-order build had found and not fixed: "Fix
// everything you highlighted."
//
//   1. Every hours readout — the dashboard's Hours Log bars, the Job Plan's hours summary, the
//      projection, the Hours fold and the schedule strip — measured against the estimate alone, so
//      a job holding a signed change order read OVERAGE / STOP (or "margin at risk") over the very
//      hours the client had signed for, and the strip's "raise a change order" advice could never
//      clear the overrun it was attached to.
//   2. The estate agreement's §4.2 change-order form printed "Additional Cost Estimate $" and
//      "Revised Total Estimate $" on both bases, including T&M, where a change order carries no price.
//   3. A fee-only Home Prep job's change-order readout said "no approved estimate yet".
//      ⚠ RESTATED 2026-09-25 (step 25): the readout this build wrote — "this engagement bills no hours
//      … hours on a change order are not billed here" — went false the same day, when an accepted
//      change order became the route to add concierge hours to a signed prep job. Section D now
//      asserts the readout that replaced it (the rate, billed on the final on top of the fee), and
//      that the retired sentence is gone. The requirement — never "no approved estimate", and say
//      what is true about how the hours are billed — is unchanged.
//
// Drives the REAL page: the real change-order modal typed into, the real Create and Accept buttons,
// the real dashboard, the real Job Plan, the real print path and the real agreement builder — on a
// T&M job and a fixed-price job.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step24.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  // Short action timeout: run against a build that predates a control, the script should fail the
  // check and move on rather than sit out Playwright's 30-second default on every missing element.
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

  // The real Build Estimate screen, then approved, won and signed — the state a change order lives in.
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

  async function raise(id, tc, ps, desc) {
    await p.evaluate((id) => openChangeOrder(id), id); await p.waitForTimeout(150);
    if (tc) await p.fill('#co-tc-hrs', String(tc));
    if (ps) await p.fill('#co-ps-hrs', String(ps));
    await p.fill('#co-description', desc);
    const seen = { readout: await text('#co-hrs-note'), base: await text('#co-original-hrs'), rev: await text('#co-new-hrs') };
    await p.click('#change-order-modal .btn-p'); await p.waitForTimeout(200);
    seen.coId = await p.evaluate(([id, desc]) => { const c = changeOrders.filter(c => c.jobId === id && c.description === desc).pop(); return c ? c.id : null; }, [id, desc]);
    return seen;
  }
  async function accept(coId, name) {
    await p.evaluate((c) => openCOAcceptModal(c), coId); await p.waitForTimeout(200);
    await p.fill('#coa-client-name', name);
    await p.click('#co-accept-modal .btn-p'); await p.waitForTimeout(200);
    return p.evaluate((c) => { const co = changeOrders.find(x => x.id === c); return !!(co && co.clientApproved); }, coId);
  }
  async function print(coId) {
    await p.evaluate((c) => { window.__prints = []; printChangeOrder(c); }, coId); await p.waitForTimeout(350);
    const got = await p.evaluate(() => window.__prints[0] || null);
    await p.waitForTimeout(700);
    got.text = await T(got.html);
    return got;
  }
  // Every room cleared, 30% more hours logged than the estimate carries, and a start date that puts
  // today on the working day AFTER the plan's last — an overrun on the calendar as well as the hours.
  async function overrun(id, e) {
    return p.evaluate(([id, e]) => {
      const plan = getJobPlan(id);
      e.rooms.forEach(r => { plan.rooms[r.idx] = Object.assign(plan.rooms[r.idx] || {}, { status: 'cleared' }); });
      const tc = Math.ceil((e.totTC || 0) * 1.3), ps = Math.ceil((e.totPS || 0) * 1.3);
      jobLogs[id] = [{ id: Date.now(), date: _todayStr(), activity: 'Rooms', members: [
        { name: 'Anthony Graziano', role: 'TC', hours: tc }, { name: 'Anthony Graziano Jr', role: 'PS', hours: ps }] }];
      const days = estWorkingDays(e), today = _todayStr();
      let d = new Date(today + 'T12:00:00');
      const iso = (x) => x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
      for (let guard = 0; guard < 60 && workingDaysInclusive(iso(d), today) < days + 1; guard++) d.setDate(d.getDate() - 1);
      const job = jobs.find(j => j.id === id);
      job.start = iso(d); job.activatedOn = iso(d);
      return { tc, ps, days, start: job.start, elapsed: workingDaysInclusive(job.start, today) };
    }, [id, e]);
  }
  async function readScreens(id) {
    await p.evaluate((id) => openClientDashboard(id), id); await p.waitForTimeout(500);
    const dash = await text('#client-dashboard-view');
    await p.evaluate((id) => openJobPlanFor(id, 'hours'), id); await p.waitForTimeout(900);
    return { dash, alert: await text('#log-overage-alert'), note: await text('#ls-co-note'),
             estTC: await text('#ls-est-tc'), proj: await text('#projection-output'),
             plan: await text('#job-plan-content'), sched: await text('#plan-sched') };
  }

  // ── A. TIME AND MATERIALS ────────────────────────────────────────────────
  console.log('\n## A. Home Editing, time and materials — over the hours, then a change order signed for them');
  const idH = await make('Hourly');
  const eH = await build(idH, false);
  ok(!eH.fixedPrice && eH.totTC > 0 && eH.totPS > 0, 'an hourly estimate (' + eH.totTC + ' TC / ' + eH.totPS + ' PS)');
  const o = await overrun(idH, eH);
  ok(o.elapsed === o.days + 1, 'today is working day ' + o.elapsed + ' of a ' + o.days + '-day plan');
  const before = await readScreens(idH);
  has(before.dash, '— OVERAGE', 'before: the dashboard bar reads OVERAGE');
  has(before.dash, 'The client must be notified in writing before work continues', 'and the T&M notice');
  has(before.alert, 'The client must be notified in writing before work continues', 'the Job Plan hours summary alerts');
  eq0(before.note, 'no change-order note before there is a change order');
  has(before.proj, 'STOP — Change Order Required', 'the projection says STOP');
  has(before.sched, 'past the proposed length', 'the schedule strip reads an overrun');
  has(before.sched, 'raise a change order if the scope grew', 'and advises a change order');
  has(before.sched, 'Once the client accepts it, its hours lengthen the plan', 'and says what accepting one does');

  // A change order for 50% more on each leg — the extra the job actually needed.
  const addTC = Math.ceil(eH.totTC * 0.5), addPS = Math.ceil(eH.totPS * 0.5);
  const c1 = await raise(idH, addTC, addPS, 'Added the pool house to scope.');
  ok(!!c1.coId, 'the real Create button saved it');
  ok(await accept(c1.coId, 'Pat Hourly'), 'the real Accept button recorded the client’s acceptance');
  const coDays = await p.evaluate(([e, tc, ps]) => (typeof coWorkingDays === 'function' ? coWorkingDays(e, tc, ps) : 0), [eH, addTC, addPS]);
  ok(coDays >= 1, 'the change order adds ' + coDays + ' working day(s) to the plan');

  const after = await readScreens(idH);
  lacks(after.dash, '— OVERAGE', '⚠⚠ after: no OVERAGE on hours the client signed for');
  lacks(after.dash, 'must be notified', '⚠⚠ and nobody is told to notify the client');
  has(after.dash, 'of ' + (eH.totTC + addTC).toFixed(1) + ' hrs estimated', 'the concierge bar reads against the estimate plus the change order');
  has(after.dash, 'incl. +' + addTC.toFixed(1) + ' hrs by change order', 'and says where the extra came from');
  eq0(after.alert, '⚠⚠ the Job Plan hours summary raises no alert');
  has(after.estTC, (eH.totTC + addTC).toFixed(1) + ' hrs', 'its concierge figure carries the change order');
  has(after.note, 'Estimated hours include +' + addTC.toFixed(1) + ' concierge / +' + addPS.toFixed(1) + ' specialist hrs from 1 accepted change order.',
      'and the note under it says so');
  lacks(after.proj, 'STOP', '⚠⚠ the projection no longer says STOP');
  has(after.proj, 'from accepted change orders', 'the projection says its estimated figures carry the change order');
  lacks(after.sched, 'past the proposed length', '⚠⚠ the schedule overrun clears — the advice finally clears the flag it gave');
  has(after.sched, 'Working day ' + o.elapsed + ' of ' + (o.days + coDays), 'the strip counts against the lengthened plan');
  has(after.sched, 'incl. ' + coDays + ' day' + (coDays === 1 ? '' : 's') + ' by change order', 'and says the change order lengthened it');

  // A second change order is measured from where the first left the job, and its printed page says so.
  const base2 = eH.totTC + eH.totPS + addTC + addPS;
  const c2 = await raise(idH, 4, 4, 'Cleared the storage unit as well.');
  ok(c2.base === base2.toFixed(1), 'the second change order starts from the estimate plus the first (' + c2.base + ')');
  has(c2.readout, 'hrs on the estimate and 1 accepted change order becomes ' + (base2 + 8).toFixed(1), 'and its readout names the first');
  const pr2 = await print(c2.coId);
  has(pr2.text, 'Change orders already accepted +' + (addTC + addPS).toFixed(1) + ' hrs', '⚠ the printed second change order names the hours the first added');
  has(pr2.text, 'Revised estimated hours ' + (base2 + 8).toFixed(1), 'and foots at the true total');
  ok(!/\$\s?[\d,]/.test(pr2.text), 'still no dollar figure on a T&M change order');
  const pr1 = await print(c1.coId);
  lacks(pr1.text, 'Change orders already accepted', 'the first change order never shows the second above it');

  // ── B. FIXED PRICE ───────────────────────────────────────────────────────
  console.log('\n## B. Home Editing, fixed price — the margin warning clears on hours the change order priced');
  const idF = await make('Flat');
  const eF = await build(idF, 24000);
  ok(eF.fixedPrice === true, 'a $24,000 fixed fee');
  await overrun(idF, eF);
  const fBefore = await readScreens(idF);
  has(fBefore.dash, 'On a fixed price that is ours to absorb', 'before: the dashboard reads a margin warning');
  has(fBefore.proj, 'margin at risk', 'and the projection');
  const f1 = await raise(idF, Math.ceil(eF.totTC * 0.5), Math.ceil(eF.totPS * 0.5), 'Added the pool house to scope.');
  await accept(f1.coId, 'Pat Flat');
  const fAfter = await readScreens(idF);
  lacks(fAfter.dash, 'ours to absorb', '⚠ after: no margin warning on hours the change order priced');
  lacks(fAfter.proj, 'margin at risk', 'and none on the projection');
  lacks(fAfter.sched, 'past the proposed length', 'and the schedule overrun clears on a fixed price too');

  // ── C. §4.2 OF THE ESTATE AGREEMENT ─────────────────────────────────────
  console.log('\n## C. The estate agreement’s change-order form follows the billing basis');
  const sec = await p.evaluate(([eH, eF]) => {
    const job = Object.assign({}, jobs[0], { svc: 'cleanout', matterType: 'probate', docTier: 'values', deathDate: '2026-08-14',
                                             executor: 'Tripp Butler', executorRole: 'Personal Representative' });
    const T = (h) => { const d = document.createElement('div'); d.innerHTML = h; return d.textContent.replace(/\s+/g, ' '); };
    const cut = (t) => { const a = t.indexOf('4.2'); const b = t.indexOf('4.3', a); return t.slice(a, b > a ? b : a + 1600); };
    const tm = cut(T(probateAgreementHtml(job, Object.assign({}, eH, { svc: 'cleanout' }))));
    const fx = cut(T(probateAgreementHtml(job, Object.assign({}, eF, { svc: 'cleanout' }))));
    return { tm, fx };
  }, [eH, eF]);
  has(sec.tm, 'Additional TC Hours', 'T&M: the form asks for the hours');
  has(sec.tm, 'Revised Estimated Hours', 'and the revised hours');
  has(sec.tm, 'This Change Order does not itself create a charge.', 'and says it creates no charge');
  lacks(sec.tm, 'Additional Cost Estimate', '⚠⚠ T&M: no cost line');
  lacks(sec.tm, 'Revised Total Estimate', '⚠⚠ and no revised total in dollars');
  has(sec.fx, 'Price of This Change', 'fixed: the form names the change order’s price');
  has(sec.fx, 'Revised Fixed Project Fee', 'and the revised fee');
  lacks(sec.fx, 'Additional Cost Estimate', 'and not the old wording');

  // ── D. FEE-ONLY HOME PREP ────────────────────────────────────────────────
  console.log('\n## D. A fee-only Home Prep job’s change-order readout says what is true');
  const prep = await p.evaluate(() => {
    const src = jobs[0];
    const id = Math.max.apply(null, jobs.map(j => j.id)) + 1;
    jobs.unshift(Object.assign({}, src, { id: id, hvlId: 'HVL-PREP', name: 'Prep Client', svc: 'prep' }));
    estimateStore[id] = { approved: true, estimate: { jobId: id, svc: 'prep', totTC: 0, totPS: 0, rooms: [],
      prepEnabled: true, prepItems: [{ cat: 'Painting', cost: 10000 }], prepFee: 3000, havellinTotal: 3000 } };
    openChangeOrder(id);
    document.getElementById('co-tc-hrs').value = '6'; updateCOHours();
    const r = document.getElementById('co-hrs-note').textContent.replace(/\s+/g, ' ');
    const rate = _coJobBasis(id).tcRate, fee = Math.round(prepFeeRate() * 100);
    closeChangeOrder();
    return { r: r, rate: rate, fee: fee };
  });
  lacks(prep.r, 'no approved estimate', '⚠⚠ a priced prep job is never told it has no estimate');
  // Restated (see the header): the hours ARE billed now, at the concierge rate, on top of the fee.
  has(prep.r, '+6.0 concierge hrs at $' + prep.rate + ' an hour', 'it names the hours and the rate they are billed at');
  has(prep.r, 'billed as they are worked on the final invoice', 'and that they are billed on the final as worked');
  has(prep.r, 'on top of the ' + prep.fee + '% site management fee', 'on top of the site management fee, read from the rate');
  has(prep.r, 'priced no concierge hours, so the rate is printed on the change order', 'and why the rate is on the page the client signs');
  lacks(prep.r, 'not billed here', '⚠ the retired "not billed here" sentence is gone — it is false now');
  lacks(prep.r, 'bills no hours', 'and so is "bills no hours"');

  // ── E. Overflow ──────────────────────────────────────────────────────────
  for (const w of [1440, 390]) {
    await p.setViewportSize({ width: w, height: 900 });
    await p.evaluate((id) => openClientDashboard(id), idH); await p.waitForTimeout(400);
    const ovD = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok(ovD <= 0, 'the dashboard fits at ' + w + 'px (overflow ' + ovD + ')');
    await p.evaluate((id) => openJobPlanFor(id, 'hours'), idH); await p.waitForTimeout(700);
    const ovP = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok(ovP <= 0, 'the Job Plan fits at ' + w + 'px (overflow ' + ovP + ')');
  }
  ok(errs.length === 0, 'no page errors (' + errs.join(' | ') + ')');

  await b.close();
  console.log('\nstep24: ' + pass + ' passed, ' + fail + ' failed');

  function eq0(t, m) { ok(String(t).trim() === '', m + '  [got: ' + String(t).slice(0, 80) + ']'); }
})().catch(e => { console.log('THREW ' + (e && e.stack || e)); console.log('step24: ' + pass + ' passed, ' + (fail + 1) + ' failed'); });
