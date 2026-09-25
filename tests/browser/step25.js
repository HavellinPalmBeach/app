// Step 25 — a change order can add concierge hours to a Home Prep job signed with vendors only
// (2026-09-25). Anthony: "if we have a live job that only quoted vendors, there's no way to then add
// transition concierge hours" — correct — and "Yes to 1." to the route.
//
// The gap: declutter hours live on the estimate and the estimate locks at signature, so a vendors-only
// prep job had no hours log, its final billed the 30% fee alone, and a change order's hours were billed
// nowhere. The route: an ACCEPTED change order adding concierge hours opens the hours log, the Budget &
// Fee card and the desk card measure against it, the final bills the logged hours at the concierge rate
// on top of the fee — and the change order itself states that rate, because the fee-only agreement
// named none. ⚠ Then the same day, Anthony: "I think we should mention the hourly rates in the home prep
// agreement." §3.3 now states the concierge rate itself, so section H reads it off the real agreement and
// checks it is the rate on the printed page, and a Premium Estate prep job shows both follow the estimate.
//
// Drives the REAL page: the real intake, the real Build Estimate on a prep job, the real change-order
// modal typed into and its real Create button, the real acceptance panel and its Accept button, the real
// Job Plan (the log appearing, the real team sign-off, hours typed and the real Save), the real Budget &
// Fee card, the band on the dashboard, the desk card, the real print path, the real invoices and the
// real agreement builder — with a Home Editing job beside it to show nothing leaks onto T&M.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step25.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
// ⚠ The browser is held OUTSIDE the async body so the catch can close it. Run against a build that
// predates this change, a check throws, and a catch that leaves Chromium open leaves node running until
// something kills it — which reads as a hang rather than as the failures it actually found.
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');
(async () => {
  b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
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

  async function make(svc, last) {
    await p.evaluate(() => { const b = document.getElementById('btn-add-client'); if (b) b.click(); }); await p.waitForTimeout(300);
    const id = await p.evaluate(([wt, svc, last]) => {
      const set = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; if (e.onchange) e.onchange(); } };
      const pick = (id) => { const e = document.getElementById(id); const o = e && Array.from(e.options).find(x => x.value); if (o) { e.value = o.value; if (e.onchange) e.onchange(); } };
      set('i-svc', svc); toggleIntakeFields();
      set('i-fname', 'Pat'); set('i-lname', last); set('i-addr', '1 A St'); set('i-city', 'Palm Beach'); set('i-zip', '33480');
      set('i-sqft', '3500'); set('i-phone', '(561) 555-0199'); set('i-email', 'c@example.com'); set('i-home-value', '4200000');
      pick('i-ptype'); pick('i-src'); set('i-walkthrough', wt);
      const st = new Date(wt); st.setDate(st.getDate() + 7); while (st.getDay() === 0 || st.getDay() === 6) st.setDate(st.getDate() + 1);
      set('i-start', st.toISOString().slice(0, 10)); saveIntake(); return (jobs[0] || {}).id;
    }, [future, svc, last]);
    await p.waitForTimeout(1500); return id;
  }

  // The real Build Estimate screen, then approved, won, signed and funded — the state a live job is in.
  async function build(id, prep, prem) {
    await p.evaluate((id) => dashGoEstimate(id), id); await p.waitForTimeout(700);
    return p.evaluate(([id, prep, prem]) => {
      const js = document.getElementById('e-job'); js.value = String(id); if (js.onchange) js.onchange();
      // A Premium Estate job, through the estimate's own checkbox — the value calcAll reads to price the rate.
      if (prem) { document.getElementById('e-prem').checked = true; jobs.find(j => j.id === id).premium = true; }
      if (prep) {
        prepItems.length = 0;
        [['Painting', 20000], ['Landscaping', 9000], ['Cleaning', 6000], ['Staging', 10000]]
          .forEach(([t, c]) => prepItems.push({ type: t, cost: c, lid: _srcLid() }));
        renderPrepItems();
      } else {
        for (let i = 0; i < 6; i++) setRoomState('r' + i, 'in');
      }
      calcAll();
      const e = JSON.parse(JSON.stringify(currentEstimate));
      estimateStore[id] = { approved: true, approvedBy: 'Anthony Graziano', estimate: e };
      const job = jobs.find(j => j.id === id);
      job.tc = 'Ashley Jerome'; job.won = true; job.status = 'active'; job.agrSigned = true; job.agrSent = true;
      job.approved = true;
      job.payments = [{ id: 1, uid: 'd' + id, stage: 'deposit', amount: depositTargetFor(job), method: 'wire',
                        date: _todayStr(), clearedOn: _todayStr() }];
      saveJobs();
      return e;
    }, [id, prep, !!prem]);
  }

  // A press or a keystroke that cannot land is a FAILED CHECK, not a crash: against a build that
  // predates a control the rest of the run still has something to say.
  const click = async (sel) => { try { await p.click(sel); return true; } catch (e) { ok(false, 'could not press ' + sel); return false; } };
  const fill = async (sel, v) => { try { await p.fill(sel, v); return true; } catch (e) { ok(false, 'could not type into ' + sel); return false; } };
  const T = (h) => p.evaluate((h) => { const d = document.createElement('div');
    d.innerHTML = String(h).replace(/<\/td>/g, ' </td>').replace(/<\/th>/g, ' </th>').replace(/<br>/g, ' ');
    return d.textContent.replace(/\s+/g, ' '); }, h);
  const text = (sel) => p.evaluate((sel) => { const e = document.querySelector(sel); return e ? e.textContent.replace(/\s+/g, ' ') : ''; }, sel);
  const logShown = () => p.evaluate(() => { const ls = document.getElementById('plan-log-section');
    return !!ls && getComputedStyle(ls).display !== 'none' && ls.offsetParent !== null; });
  async function openPlan(id) { await p.evaluate((id) => openJobPlanFor(id, 'hours'), id); await p.waitForTimeout(900); }
  async function print(coId) {
    await p.evaluate((c) => { window.__prints = []; printChangeOrder(c); }, coId); await p.waitForTimeout(350);
    const got = await p.evaluate(() => window.__prints[0] || null);
    await p.waitForTimeout(700);
    if (got) got.text = await T(got.html);
    return got || { html: '', text: '', title: '' };
  }
  const desk = (id) => p.evaluate((id) => {
    const job = jobs.find(j => j.id === id), est = estimateStore[id].estimate;
    const l = planDerivedLines(id, job, est, 'admin').find(x => x.key === 'hours_logged');
    return l ? { ok: l.ok, detail: l.detail } : null;
  }, id);
  const finalSub = (id) => p.evaluate((id) => {
    const job = jobs.find(j => j.id === id);
    const r = jobTimeline(job, estimateStore[id], jobLogEntries(id), changeOrders.filter(c => c.jobId === id))
      .find(x => x.key === 'final_invoiced');
    return r ? (r.sub || '') : 'NO ROW';
  }, id);

  // ── A. THE VENDORS-ONLY PREP JOB, AS SIGNED ─────────────────────────────
  console.log('\n## A. A Home Prep job signed with vendors only — no hours anywhere, as before');
  const idP = await make('prep', 'Vendors');
  const eP = await build(idP, true);
  ok(eP.svc === 'prep' && (eP.totTC || 0) === 0 && eP.prepFee === 13500, 'a vendors-only prep estimate: $45,000 of trades, a $13,500 fee, no hours');
  const agrBefore = await p.evaluate((id) => agreementHtml(jobs.find(j => j.id === id), estimateStore[id].estimate), idP);
  const flags0 = await p.evaluate((id) => { const job = jobs.find(j => j.id === id), e = estimateStore[id].estimate;
    return { quote: estimateIsFeeOnly(e, job), job: (typeof jobIsFeeOnly === 'function') ? jobIsFeeOnly(e, job) : null }; }, idP);
  ok(flags0.quote === true && flags0.job === true, 'the quote and the job both read fee-only');
  await openPlan(idP);
  ok(!(await logShown()), 'the Job Plan shows no hours log');
  lacks(await text('#job-plan-content'), 'Logged to date', 'and the Budget & Fee card no logged-hours row');
  ok((await desk(idP)) === null, 'the desk card carries no hours line');

  // ── B. THE CHANGE ORDER ─────────────────────────────────────────────────
  console.log('\n## B. The change order — concierge hours only, and the readout states the rate');
  await p.evaluate((id) => openChangeOrder(id), idP); await p.waitForTimeout(200);
  const box = await p.evaluate(() => { const e = document.getElementById('co-ps-hrs'); return { dis: e.disabled, ph: e.placeholder }; });
  ok(box.dis === true, '⚠ the specialist box is off on Home Prep');
  ok(box.ph === 'Not used on Home Prep', 'and says why (' + box.ph + ')');
  const note = await text('#co-basis-note');
  has(note, 'concierge hours for hands-on work', 'the note says what a prep change order is');
  has(note, 'at $150 an hour', 'and names the rate');
  has(note, 'Coordinating the vendors is covered by the fee and is never billed as hours', 'vendor coordination stays inside the fee');
  await fill('#co-tc-hrs', '8');
  await fill('#co-description', 'Clear the garage so the painters can start.');
  const readout = await text('#co-hrs-note');
  has(readout, '+8.0 concierge hrs at $150 an hour', '⚠⚠ the readout states the hours and the rate');
  has(readout, 'about $1,200 at the estimated hours', 'and what they come to');
  // Restated the same day: §3.3 of the prep agreement states the rate now, so the readout says where it comes from.
  has(readout, 'the rate is the one its agreement states in Section 3.3, and the change order prints it again',
      'and that the rate is the agreement’s, restated on the signed page');
  lacks(readout, 'so the rate is printed on the change order', 'never the old reason');
  lacks(readout, 'not billed here', '⚠⚠ the old "billed nowhere" sentence is gone');
  // The specialist box cannot be reached around: a value forced into it is refused on save.
  await p.evaluate(() => { document.getElementById('co-ps-hrs').value = '4'; });
  await click('#change-order-modal .btn-p'); await p.waitForTimeout(200);
  has(await text('#co-fb'), 'Home Prep has no specialists', '⚠ a forced specialist figure is refused where the record is written');
  const none = await p.evaluate((id) => changeOrders.filter(c => c.jobId === id).length, idP);
  ok(none === 0, 'and nothing was saved');
  await p.evaluate(() => { document.getElementById('co-ps-hrs').value = ''; });
  await click('#change-order-modal .btn-p'); await p.waitForTimeout(200);
  const coId = await p.evaluate((id) => { const c = changeOrders.filter(c => c.jobId === id).pop(); return c ? c.id : null; }, idP);
  ok(!!coId, 'the real Create button saved it');
  const draft = await p.evaluate((id) => { const job = jobs.find(j => j.id === id), e = estimateStore[id].estimate;
    return (typeof jobIsFeeOnly === 'function') ? jobIsFeeOnly(e, job) : null; }, idP);
  ok(draft === true, '⚠ a draft authorises nothing — the job still bills no hours');
  await openPlan(idP);
  ok(!(await logShown()), 'and the Job Plan still shows no log for it');

  // ── C. THE ACCEPTANCE ───────────────────────────────────────────────────
  console.log('\n## C. The client accepts — and the panel they sign under names the rate');
  await p.evaluate((c) => openCOAcceptModal(c), coId); await p.waitForTimeout(200);
  const sum = await text('#coa-summary');
  has(sum, 'Rate$150 an hour, billed as worked', '⚠⚠ the acceptance panel states the rate');
  has(sum, 'about $1,200', 'and what the hours come to');
  lacks(sum, 'No charge is created', 'not the T&M sentence — here the hours are a new charge');
  has(await text('#coa-terms'), 'the rate of $150 an hour', 'the acceptance sentence names it too');
  await fill('#coa-client-name', 'Pat Vendors');
  await click('#co-accept-modal .btn-p'); await p.waitForTimeout(250);
  const acc = await p.evaluate((c) => { const co = changeOrders.find(x => x.id === c); return !!(co && co.clientApproved); }, coId);
  ok(acc, 'the real Accept button recorded the client’s acceptance');
  const flags1 = await p.evaluate((id) => { const job = jobs.find(j => j.id === id), e = estimateStore[id].estimate;
    return { quote: estimateIsFeeOnly(e, job), job: (typeof jobIsFeeOnly === 'function') ? jobIsFeeOnly(e, job) : null }; }, idP);
  ok(flags1.job === false, '⚠⚠ the JOB now bills hours');
  ok(flags1.quote === true, '⚠⚠ and the QUOTE is unchanged — it is what the client signed');
  const agrAfter = await p.evaluate((id) => agreementHtml(jobs.find(j => j.id === id), estimateStore[id].estimate), idP);
  ok(agrAfter === agrBefore, '⚠⚠ the agreement renders byte-identical after the acceptance');

  // ── D. THE JOB PLAN OPENS ITS LOG ───────────────────────────────────────
  console.log('\n## D. The Job Plan opens its hours log, and every readout measures against the 8 hours');
  await openPlan(idP);
  ok(await logShown(), '⚠⚠ the hours log is on screen');
  ok(await p.evaluate((id) => String(document.getElementById('log-job').value) === String(id), idP), 'bound to this job');
  const plan0 = await text('#job-plan-content');
  has(plan0, 'Added by change order (+8.0 concierge hrs × $150)', 'the Budget & Fee card names the change order’s hours');
  has(plan0, '+ $1,200', 'and prices them');
  has(plan0, 'Logged to date0.0 hrs', 'and shows nothing logged yet');
  has(plan0, 'Declutter complete (8.0 hrs authorised, +8.0 concierge hrs by change order)', 'the checklist gains the step');
  has(await text('#ls-est-tc'), '8.0 hrs', 'the hours summary reads 8 concierge hours, not "No estimate"');
  has(await text('#ls-co-note'), '+8.0 concierge hrs from 1 accepted change order', 'and says where they came from');
  const d0 = await desk(idP);
  ok(!!d0 && d0.ok === false, 'the desk card gains an open hours line');
  has(d0 ? d0.detail : '', 'a change order added hours; log them before the final goes out, or it bills the management fee alone',
      '⚠ saying what an empty log will do');
  const s0 = await finalSub(idP);
  has(s0, 'A change order added 8.0 concierge hours and none are logged', '⚠⚠ the final-invoice step says it too');
  await p.evaluate((id) => openClientDashboard(id), idP); await p.waitForTimeout(500);
  has(await text('#client-dashboard-view'), 'none are logged — log them on the Job Plan first, or this final bills the management fee alone',
      'and the dashboard’s timeline prints it');

  // ── E. HOURS LOGGED THROUGH THE REAL FORM ───────────────────────────────
  console.log('\n## E. The concierge logs the hours through the real form');
  await openPlan(idP);
  await p.evaluate((id) => confirmJobTeam(id), idP); await p.waitForTimeout(300);
  const tcName = await p.evaluate(() => { const e = document.getElementById('log-m0-name'); return e ? e.value : ''; });
  ok(tcName === 'Ashley Jerome', 'the concierge row is Ashley (' + tcName + ')');
  await p.evaluate(() => { document.getElementById('log-date').value = _todayStr(); });
  await fill('#log-activity', 'Cleared the garage for the painters');
  await fill('#log-m0-hrs', '8');
  await click('#btn-save-hours'); await p.waitForTimeout(400);
  const logged = await p.evaluate((id) => (jobLogEntries(id) || []).reduce((a, e) => a + (e.members || [])
    .filter(m => m.role === 'TC').reduce((x, m) => x + (Number(m.hours) || 0), 0), 0), idP);
  ok(logged === 8, '⚠⚠ the real Save recorded 8 concierge hours on the prep job (' + logged + ')');
  await openPlan(idP);
  has(await text('#job-plan-content'), 'Logged to date8.0 hrs', 'the Budget & Fee card reads them');
  const d1 = await desk(idP);
  ok(!!d1 && d1.ok === true, 'the desk line goes green');
  has(d1 ? d1.detail : '', '8 hrs against 8 estimated — the final invoice trues to the log', 'against the authorised 8');
  ok((await finalSub(idP)) === '', 'and the final-invoice step says nothing once they are logged');

  // ── F. THE PRINTED CHANGE ORDER ─────────────────────────────────────────
  console.log('\n## F. The printed change order — the rate on the page the client signs, restating the agreement');
  const pr = await print(coId);
  has(pr.title, 'Havellin Change Order', 'it prints through the real path, named for what it is');
  has(pr.text, 'Rate for these hours $150 an hour, billed as worked', '⚠⚠ the rate is on the page the client signs');
  has(pr.text, 'Revised estimated concierge hours 8.0', 'the hours foot at 8');
  has(pr.text, 'This change order adds concierge hours, billed at $150 an hour.', 'and it says what it does');
  lacks(pr.text, 'does not itself create a charge', '⚠⚠ never the T&M sentence, which would say the opposite here');

  // ── G. THE INVOICES ─────────────────────────────────────────────────────
  console.log('\n## G. The final bills the fee plus exactly the logged change-order hours');
  const inv = await p.evaluate((id) => {
    const job = jobs.find(j => j.id === id);
    const T = (h) => { const d = document.createElement('div'); d.innerHTML = h.replace(/<\/td>/g, ' </td>').replace(/<\/th>/g, ' </th>'); return d.textContent.replace(/\s+/g, ' '); };
    job.payments = [];
    const dep = invoiceHtml(job, 'deposit');
    job.payments = [{ id: 1, uid: 'p1', stage: 'deposit', amount: dep.amtDue, method: 'wire', date: _todayStr(), clearedOn: _todayStr() }];
    const mid = invoiceHtml(job, 'midpoint');
    job.payments.push({ id: 2, uid: 'p2', stage: 'midpoint', amount: mid.amtDue, method: 'wire', date: _todayStr(), clearedOn: _todayStr() });
    const fin = invoiceHtml(job, 'final');
    return { dep: dep.amtDue, mid: mid.amtDue, fin: fin.amtDue, blocked: fin.blocked, pin: fin.requiresApproval, t: T(fin.html) };
  }, idP);
  console.log('   deposit', inv.dep, 'midpoint', inv.mid, 'final', inv.fin);
  ok(Math.round(inv.dep + inv.mid + inv.fin) === 13500 + 1200, '⚠⚠ the engagement collects the $13,500 fee plus the $1,200 logged — $14,700 (' + Math.round(inv.dep + inv.mid + inv.fin) + ')');
  ok(!inv.blocked && !inv.pin, 'the final is neither blocked nor held for a PIN');
  has(inv.t, 'Ashley Jerome TC 8.0 $150/hr $1,200', 'the hours sit in the hours table at the rate');
  has(inv.t, 'These concierge hours are billed as they were logged, at $150 an hour', 'the change-order note says how they bill');

  // ── H. THE AGREEMENT ────────────────────────────────────────────────────
  console.log('\n## H. The agreement: §3.3 names the route AND the rate, §3.8 names the Change Order');
  const agr = await T(agrAfter);
  has(agr, 'No Transition Concierge or Property Specialist hours are billed on this engagement', '§3.3 still states the engagement as signed');
  has(agr, 'is billed only if Client signs a Change Order under Section 3.8 stating the Transition Concierge hours',
      '⚠⚠ and the one route to hours');
  has(agr, "billed as worked at Contractor's Transition Concierge rate of $150/hour, in addition to the management fee",
      '⚠⚠ at the concierge rate, in the contract before anyone signs (2026-09-25)');
  lacks(agr, 'Property Specialist services are billed at', 'the concierge rate only — the form bills no specialist hours');
  const agrRate = (/Transition Concierge rate of \$(\d+)\/hour/.exec(agr) || [])[1];
  const coRate = (/Rate for these hours \$(\d+) an hour/.exec(pr.text) || [])[1];
  ok(!!agrRate && agrRate === coRate, '⚠⚠ the agreement and the printed change order state one rate ($' + agrRate + ' / $' + coRate + ')');
  has(agr, 'Hands-on work Contractor is asked to do after signing is documented in a written Change Order signed by both Parties',
      '§3.8 names the Change Order it points at');

  // ── H2. A PREMIUM ESTATE PREP JOB ───────────────────────────────────────
  console.log('\n## H2. A Premium Estate prep job — the agreement and the change order both follow the estimate');
  const idQ = await make('prep', 'Premium');
  const eQ = await build(idQ, true, true);
  ok(eQ.tcRate === 185, 'the real Build Estimate pins the premium concierge rate (' + eQ.tcRate + ')');
  const agrQ = await T(await p.evaluate((id) => agreementHtml(jobs.find(j => j.id === id), estimateStore[id].estimate), idQ));
  has(agrQ, "Transition Concierge rate of $185/hour", '⚠⚠ its agreement states $185 an hour');
  lacks(agrQ, '$150/hour', 'and not the standard rate anywhere');
  await p.evaluate((id) => openChangeOrder(id), idQ); await p.waitForTimeout(200);
  await fill('#co-tc-hrs', '4');
  const rq = await text('#co-hrs-note');
  has(rq, '+4.0 concierge hrs at $185 an hour', '⚠⚠ and the change-order readout names the same $185');
  has(rq, 'the rate is the one its agreement states in Section 3.3', 'and says that is where the rate comes from');
  await p.evaluate(() => closeChangeOrder());

  // ── I. A HOME EDITING JOB BESIDE IT ─────────────────────────────────────
  console.log('\n## I. The same modal on a Home Editing job straight afterwards — nothing leaks onto T&M');
  const idH = await make('downsizing', 'Hourly');
  await build(idH, false);
  await p.evaluate((id) => openChangeOrder(id), idP); await p.waitForTimeout(150);
  await p.evaluate(() => closeChangeOrder());
  await p.evaluate((id) => openChangeOrder(id), idH); await p.waitForTimeout(200);
  const hb = await p.evaluate(() => { const e = document.getElementById('co-ps-hrs'); return { dis: e.disabled, ph: e.placeholder }; });
  ok(hb.dis === false, '⚠⚠ the specialist box is back on for a labour job after a prep job had it off');
  ok(hb.ph === 'e.g. 16 (negative to reduce)', 'with its own hint (' + hb.ph + ')');
  has(await text('#co-basis-note'), 'A change order carries no price and bills nothing on its own', 'and the T&M note');
  await fill('#co-tc-hrs', '10'); await fill('#co-ps-hrs', '10');
  has(await text('#co-hrs-note'), 'hrs on the estimate becomes', 'the T&M readout, measured in hours');
  lacks(await text('#co-hrs-note'), '$', 'and no price');
  await p.evaluate(() => closeChangeOrder());

  // ── J. Overflow ─────────────────────────────────────────────────────────
  for (const w of [1440, 390]) {
    await p.setViewportSize({ width: w, height: 900 });
    await openPlan(idP);
    const ovP = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok(ovP <= 0, 'the prep Job Plan with its hours log fits at ' + w + 'px (overflow ' + ovP + ')');
    await p.evaluate((id) => openClientDashboard(id), idP); await p.waitForTimeout(400);
    const ovD = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok(ovD <= 0, 'the dashboard fits at ' + w + 'px (overflow ' + ovD + ')');
    await p.evaluate((id) => openChangeOrder(id), idP); await p.waitForTimeout(200);
    const ovM = await p.evaluate(() => { const m = document.querySelector('#change-order-modal .modal, #change-order-modal > div');
      const r = m ? m.getBoundingClientRect() : { left: 0, right: 0 }; return { l: r.left, r: r.right, vw: window.innerWidth }; });
    ok(ovM.l >= 0 && ovM.r <= ovM.vw + 0.5, 'the change-order modal sits inside the viewport at ' + w + 'px');
    await p.evaluate(() => closeChangeOrder());
  }
  ok(errs.length === 0, 'no page errors (' + errs.join(' | ') + ')');

  await b.close();
  console.log('\nstep25: ' + pass + ' passed, ' + fail + ' failed');
})().catch(async e => {
  console.log('THREW ' + (e && e.stack || e));
  console.log('step25: ' + pass + ' passed, ' + (fail + 1) + ' failed');
  try { if (b) await b.close(); } catch (_) { /* already gone */ }
});
