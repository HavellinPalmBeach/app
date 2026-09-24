// Step 21 — the 30% home prep fee adds up on the estimate and sits ON TOP of a fixed fee
// (2026-09-23). Anthony, off a Home Transition estimate carrying a painter, a pressure washer and a
// pool clean: "the $250 in GC fees don't appear to be added to the Havellin Services total. where's
// the error?" — and then, on fixed price, "yes, fix both."
//
// Drives the REAL page: bundled prep on T&M and fixed price, the estate form, a record saved before
// the change (fee inside its flat fee), the three invoices, the emails, reopening an old fixed
// estimate on Build Estimate, and overflow at 1440 / 390.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step21.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const has = (t, n, m) => ok(t.indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(t.indexOf(n) < 0, m + '  [present: ' + n + ']');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  const dlg = []; p.on('dialog', async d => { dlg.push(d.message()); await d.accept(); });
  await p.goto(APP); await p.waitForTimeout(1500);
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
      set('i-dest-addr', '2 B St'); set('i-dest-city', 'Jupiter'); set('i-dest-sqft', '2200');
      if (svc === 'cleanout') {
        set('i-date-of-death', '2026-06-01'); set('i-executor-fname', 'Tripp'); set('i-executor-lname', 'Butler'); set('i-executor-email', 'tb@example.com');
        set('i-executor-phone', '(561) 555-0111'); pick('i-executor-role'); set('i-matter-type', 'probate');
        set('i-doc-tier', 'values');
      }
      pick('i-ptype'); pick('i-src'); set('i-walkthrough', wt);
      const st = new Date(wt); st.setDate(st.getDate() + 7); while (st.getDay() === 0 || st.getDay() === 6) st.setDate(st.getDate() + 1);
      set('i-start', st.toISOString().slice(0, 10)); saveIntake(); return (jobs[0] || {}).id;
    }, [future, svc, last]);
    await p.waitForTimeout(1500); return id;
  }

  // Build an estimate on job `id`; returns the snapshot. fixed: false | 'suggested' | number
  async function build(id, fixed) {
    await p.evaluate((id) => dashGoEstimate(id), id); await p.waitForTimeout(700);
    return p.evaluate(([id, fixed]) => {
      const js = document.getElementById('e-job'); js.value = String(id); if (js.onchange) js.onchange();
      for (let i = 0; i < 10; i++) setRoomState('r' + i, 'in');
      prepItems.length = 0;
      [['Painting', 500], ['Pressure Washing', 150], ['Pool & Spa Service', 100]].forEach(([t, c]) => prepItems.push({ type: t, cost: c, lid: _srcLid() }));
      renderPrepItems(); calcAll();
      if (fixed) {
        const fx = document.getElementById('e-fixed'); fx.checked = true; toggleFixedPrice(); calcAll();
        if (typeof fixed === 'number') { _fxAmtSet(fixed); markFixedAmountEdited(); calcAll(); }
      }
      return { snap: JSON.parse(JSON.stringify(currentEstimate)), sugg: window._fixedPriceSuggested || 0 };
    }, [id, fixed]);
  }

  // Parse the client estimate's services table (the first .ce-tbl with a Havellin Services Total).
  async function ceCheck(id, snap) {
    return p.evaluate(([id, e]) => {
      const job = jobs.find(j => j.id === id);
      const d = document.createElement('div'); d.innerHTML = clientEstimateHtml(e, job);
      const tbls = Array.from(d.querySelectorAll('table'));
      const svc = tbls.find(t => /Havellin Services Total/.test(t.textContent));
      const money = (s) => Number(String(s).replace(/[^0-9.\-]/g, '')) || 0;
      let rowsSum = 0, total = 0, rows = [];
      Array.from(svc.querySelectorAll('tr')).forEach(tr => {
        const tds = tr.querySelectorAll('td'); if (!tds.length) return;
        const last = tds[tds.length - 1].textContent.trim();
        const lbl = tds[0].textContent.replace(/\s+/g, ' ').trim();
        if (/Havellin Services Total/.test(lbl)) { total = money(last); return; }
        if (/^\$|^[−-] \$|^\+ \$/.test(last)) {
          let v = money(last); if (/^[−-]/.test(last)) v = -Math.abs(v);
          if (/Subtotal \(before discount\)/.test(lbl)) return;
          rowsSum += v; rows.push([lbl.slice(0, 60), v]);
        }
      });
      const t = d.textContent.replace(/\s+/g, ' ');
      const iSvc = t.indexOf('Havellin Services Total'), iPrep = t.indexOf('Home Prep for Sale — Site Management');
      const prepBand = t.indexOf('Home Prep', iSvc + 10);
      return { rowsSum, total, rows, text: t, feeRowInSvc: iPrep >= 0 && iPrep < iSvc };
    }, [id, snap]);
  }

  // ── A. Home Transition, T&M, bundled prep ────────────────────────────────
  console.log('\n## A. Home Transition, T&M, bundled prep');
  const idA = await make('downsizing_move', 'Hourly');
  const A = await build(idA, false);
  ok(A.snap.prepFee === 225, 'prep fee is 30% of $750 → $225 (got ' + A.snap.prepFee + ')');
  const ceA = await ceCheck(idA, A.snap);
  console.log('   rows', JSON.stringify(ceA.rows), 'total', ceA.total);
  ok(ceA.rowsSum === ceA.total, 'T&M: the services rows add up to the Havellin Services Total (' + ceA.rowsSum + ' vs ' + ceA.total + ')');
  ok(ceA.total === A.snap.havellinTotal, 'and that total is the snapshot total');
  ok(ceA.feeRowInSvc, 'the site-management row sits above the services total');
  has(ceA.text, 'site management line in Havellin Services above', 'the prep section says where the fee is');
  lacks(ceA.text, 'Havellin GC / Site Management Fee (30% of prep vendors)', 'the old below-the-total fee row is gone');

  // ── B. Same kind of job, FIXED PRICE ─────────────────────────────────────
  console.log('\n## B. Home Transition, fixed price, bundled prep');
  const idB = await make('downsizing_move', 'Fixed');
  const B0 = await build(idB, 'suggested');
  const B = await build(idB, 20000);
  const sB = B.snap;
  console.log('   fixedAmount', sB.fixedAmount, 'prepFee', sB.prepFee, 'havellinTotal', sB.havellinTotal, 'grand', sB.grandTotal, 'suggested', B0.sugg, 'prepOnTop', sB.prepFeeOnTop);
  ok(sB.fixedPrice === true && sB.fixedAmount === 20000, 'fixed at $20,000');
  ok(sB.prepFeeOnTop === true, 'the record carries the on-top marker');
  ok(sB.havellinTotal === 20000 + sB.prepFee, 'the Havellin total is the flat fee plus the prep fee');
  ok(sB.grandTotal === 20000 + sB.prepFee + (sB.vendorCost || 0) + (sB.prepCost || 0), 'the grand total adds the vendors at cost');
  const suggExpect = await p.evaluate((s) => Math.round((s.havellinTotalFull ? (s.havellinTotalFull - s.prepFee) : 0) * (1 + fixedPriceBuffer(s.svc))), B0.snap);
  ok(B0.sugg === suggExpect, 'the suggested fee excludes the prep fee (' + B0.sugg + ' vs ' + suggExpect + ')');
  const ceB = await ceCheck(idB, sB);
  console.log('   rows', JSON.stringify(ceB.rows), 'total', ceB.total);
  ok(ceB.rowsSum === ceB.total, 'fixed: the rows add up (' + ceB.rowsSum + ' vs ' + ceB.total + ')');
  ok(ceB.rows.some(r => /Fixed Project Fee/.test(r[0]) && r[1] === 20000), 'the fixed row states the flat fee alone');
  ok(ceB.rows.some(r => /General contracting/.test(r[0]) && r[1] === sB.prepFee), 'the prep fee is its own row');
  has(ceB.text, 'which is not part of the fixed fee and is charged on what those vendors actually bill', 'the fixed Terms say the fee is outside the flat fee');
  has(ceB.text, 'apart from the home prep vendors', 'the fixed-fee blurb carves the prep vendors out');

  // Agreement — living client, standard form
  const agrB = await p.evaluate(([id, e]) => { const d = document.createElement('div'); d.innerHTML = agreementHtml(jobs.find(j => j.id === id), e); return d.textContent.replace(/\s+/g, ' '); }, [idB, sB]);
  has(agrB, 'fixed price of $20,000', '§3.1 states the flat fee');
  has(agrB, 'The Home Sale Preparation Fee in Section 3.5 is charged in addition to the fixed price', '§3.1 says the prep fee is additional');
  has(agrB, 'fixed project fee of $20,000', '§3.3 states the flat fee');
  has(agrB, 'is not part of the fixed project fee and is charged in addition to it', '§3.3 carves the prep fee out');
  has(agrB, 'included in the fixed project fee under Section 3.3', '§3.5 no longer says coordination is billed as TC time');
  has(agrB, 'calculated on what those vendors actually invoice and charged in addition to the fixed project fee', '§3.5 states the fee on top');
  has(agrB, 'at its estimated amount of $' + sB.prepFee.toLocaleString(), '§3.2 names the estimated prep fee in the schedule');
  has(agrB, 'is earned as the preparation work is performed', '§12.2 earns the prep fee on the vendor work');
  has(agrB, 'and the Home Sale Preparation Fee owed under that Section', '§12.4 invoices it on termination');
  has(agrB, 'deposit is earned on signature and is not refundable', 'the deposit stays non-refundable');
  lacks(agrB, 'billed as Transition Concierge time under Section 3.3', 'no clause bills coordination as hours on a fixed fee');
  const depExp = Math.round(0.5 * sB.havellinTotal);
  has(agrB, '$' + depExp.toLocaleString(), 'the agreement deposit is 50% of flat + est. prep fee ($' + depExp + ')');

  // Invoices across the three stages, with the painter's actual quote above the estimate
  const inv = await p.evaluate(([id, e]) => {
    const job = jobs.find(j => j.id === id);
    estimateStore[id] = { approved: true, approvedBy: 'Anthony Graziano', estimate: e };
    const T = (h) => { const d = document.createElement('div'); d.innerHTML = h.replace(/<\/td>/g, ' </td>'); return d.textContent.replace(/\s+/g, ' '); };
    const out = {};
    const dep = invoiceHtml(job, 'deposit'); out.dep = { amt: dep.amtDue, t: T(dep.html) };
    // the painter actually bills $900, not $500
    const k = _srcLineKey(e.prepItems[0], 0);
    job.prepSourcing = job.prepSourcing || {}; job.prepSourcing[k] = { quote: 900, status: 'Confirmed', vendorName: 'Brush Co' };
    job.payments = [{ id: 1, uid: 'p1', stage: 'deposit', amount: out.dep.amt, method: 'wire', date: '2026-09-24', clearedOn: '2026-09-24' }];
    const mid = invoiceHtml(job, 'midpoint'); out.mid = { amt: mid.amtDue, t: T(mid.html) };
    job.payments.push({ id: 2, uid: 'p2', stage: 'midpoint', amount: mid.amtDue, method: 'wire', date: '2026-09-24', clearedOn: '2026-09-24' });
    const fin = invoiceHtml(job, 'final'); out.fin = { amt: fin.amtDue, t: T(fin.html), blocked: fin.blocked, pin: fin.requiresApproval };
    return out;
  }, [idB, sB]);
  const prepAct = Math.round((900 + 150 + 100) * 0.30); // 345
  console.log('   deposit', inv.dep.amt, 'midpoint', inv.mid.amt, 'final', inv.fin.amt, 'prepFee actual', prepAct);
  ok(inv.dep.amt === Math.round(0.5 * (20000 + sB.prepFee)), 'deposit = 50% of flat + prep fee on the quotes');
  has(inv.dep.t, 'Fixed project fee — full scope of work per agreement $20,000', 'deposit invoice states the flat fee');
  has(inv.dep.t, 'Home Prep for Sale — GC / Site Management Fee (30%) $' + sB.prepFee, 'deposit invoice itemises the prep fee on the quotes');
  has(inv.dep.t, 'shown here on the prep vendors\' quotes and trued to their actual invoices', 'and says it trues up');
  ok(inv.mid.amt === Math.round(0.75 * (20000 + prepAct)) - inv.dep.amt, 'midpoint = 75% of flat + ACTUAL prep fee, less the deposit received');
  // Two of the three prep lines are still on their estimates, so the line carries the est. tag.
  ok(/GC \/ Site Management Fee \(30%\) est\. \$345/.test(inv.mid.t), 'midpoint invoice bills the prep fee on the actual painter quote, tagged est. while two lines still are');
  ok(inv.fin.amt === (20000 + prepAct) - inv.dep.amt - inv.mid.amt, 'final closes out flat + actual prep fee exactly (' + inv.fin.amt + ')');
  has(inv.fin.t, 'Havellin Services Total $' + (20000 + prepAct).toLocaleString(), 'final services total = flat + actual prep fee');
  has(inv.fin.t, 'Home prep site management fee — on the prep vendors\' actual invoices $' + prepAct, 'payment summary names the prep fee');
  has(inv.fin.t, 'Havellin\'s fee on the home preparation vendors is the 30% general contracting and site management fee shown above', 'the vendor note points at a line that is there');
  ok(!inv.fin.blocked, 'a fixed final is never blocked for hours');
  lacks(inv.fin.t, 'billed in the hours above', 'no hours claim on a fixed-price invoice');

  // Emails
  const em = await p.evaluate(([id, e]) => { const job = jobs.find(j => j.id === id); return { txt: buildEstimateEmailText(e, job), html: buildEstimateEmailHtml(e, job) }; }, [idB, sB]);
  has(em.txt, 'Fixed Project Fee: $20,000', 'text email states the flat fee');
  has(em.txt, 'Home Prep Site Management Fee (30%): $' + sB.prepFee, 'and the prep fee as its own line');
  has(em.html, 'The fixed project fee above is firm', 'HTML email: only the flat fee is called firm');
  has(em.html, 'charged on what those vendors actually bill', 'and the prep fee follows the bills');

  // ── C. Estate Settlement, fixed, estate form ──────────────────────────────
  console.log('\n## C. Estate Settlement, fixed price, estate form');
  const idC = await make('cleanout', 'Estate');
  ok(idC !== idB, 'the estate client was created (dialogs: ' + dlg.join(' / ') + ')');
  console.log('   estate job', idC, (await p.evaluate((id) => (jobs.find(j => j.id === id) || {}).svc, idC)));
  await build(idC, 'suggested'); const C = await build(idC, 30000); const sC = C.snap;
  const agrC = await p.evaluate(([id, e]) => { const d = document.createElement('div'); d.innerHTML = agreementHtml(jobs.find(j => j.id === id), e); return d.textContent.replace(/\s+/g, ' '); }, [idC, sC]);
  has(agrC, 'Fee Structure', 'estate form, fixed arm');
  has(agrC, 'fixed price of $30,000', 'the estate form states the flat fee');
  has(agrC, 'the concierge time spent coordinating them is included in the fixed project fee below', 'vendor row: coordination inside the flat fee');
  has(agrC, 'which is not part of the fixed project fee below: it is charged in addition to it', 'prep row: fee outside the flat fee');
  has(agrC, 'It is charged in addition to it, at thirty percent (30%) of what the home sale preparation vendors', 'Fixed Project Fee paragraph carries the prep fee');
  has(agrC, '(50% of fixed price + est. prep fee)', 'payment labels name both parts');
  has(agrC, 'and the Home Sale Preparation Fee on actual vendor invoices', 'final payment trigger names the prep fee');
  has(agrC, 'The Home Sale Preparation Fee is earned as the preparation work is performed', '§8.1 earns it on the work');
  has(agrC, 'and the Home Sale Preparation Fee owed will be issued', '§8.1 final invoice names it');
  lacks(agrC, 'billed at the TC rate above, except', 'no TC-rate billing claim on the fixed estate form');
  const ceC = await ceCheck(idC, sC);
  ok(ceC.rowsSum === ceC.total, 'estate fixed: rows add up (' + ceC.rowsSum + ' vs ' + ceC.total + ')');

  // ── D. A fixed record saved before today (fee INSIDE the flat fee) ────────
  console.log('\n## D. Legacy fixed record');
  const L = Object.assign({}, sB); delete L.prepFeeOnTop; L.havellinTotal = L.fixedAmount; L.grandTotal = L.fixedAmount + (L.vendorCost || 0) + (L.prepCost || 0);
  const legacy = await p.evaluate(([id, e]) => {
    const job = jobs.find(j => j.id === id); job.payments = []; job.prepSourcing = {};
    estimateStore[id] = { approved: true, approvedBy: 'Anthony Graziano', estimate: e };
    const T = (h) => { const d = document.createElement('div'); d.innerHTML = h.replace(/<\/td>/g, ' </td>'); return d.textContent.replace(/\s+/g, ' '); };
    const dep = invoiceHtml(job, 'deposit'); const fin = invoiceHtml(job, 'final');
    const a = T(agreementHtml(job, e));
    return { dep: dep.amtDue, depT: T(dep.html), finT: T(fin.html), fin: fin.amtDue, agr: a };
  }, [idB, L]);
  ok(legacy.dep === Math.round(0.5 * L.fixedAmount), 'legacy deposit is 50% of the flat fee alone — never the fee twice');
  lacks(legacy.depT, 'GC / Site Management Fee (30%)', 'no separate prep line on a legacy record');
  has(legacy.finT, 'fee on the home preparation vendors is included in the fixed project fee', 'the legacy vendor note says the fee is inside');
  has(legacy.agr, 'On this engagement that fee is included in the fixed project fee under Section 3.3', 'legacy §3.5 says so too');
  lacks(legacy.agr, 'charged in addition to the fixed price', 'no second charge claimed on a legacy record');
  const ceL = await ceCheck(idB, L);
  ok(ceL.rowsSum === ceL.total, 'legacy estimate rows add up (' + ceL.rowsSum + ' vs ' + ceL.total + ')');
  lacks(ceL.text, 'Home Prep for Sale — Site Management', 'legacy estimate prints no separate fee row');

  // ── F. Reopening a fixed fee saved before the change ─────────────────────
  const idR = await make('downsizing_move', 'Reopen');
  const rR = await build(idR, 20000);
  ok(rR.snap.fixedAmount === 20000 && rR.snap.prepFeeOnTop === true && rR.snap.havellinTotal === 20000 + rR.snap.prepFee,
     'a fee saved today: flat 20000 + prep ' + rR.snap.prepFee + ' on top = ' + rR.snap.havellinTotal);
  const prep = rR.snap.prepFee;
  // Make it the record an older build would have saved: the prep fee inside the flat fee, no marker.
  const out = await p.evaluate(([id, s]) => {
    const legacy = JSON.parse(JSON.stringify(s)); delete legacy.prepFeeOnTop;
    legacy.fixedAmount = 20000; legacy.havellinTotal = 20000; legacy.fixedSuggested = 18000;
    legacy.grandTotal = 20000 + (legacy.vendorCost || 0) + (legacy.prepCost || 0);
    estimateStore[id] = { estimate: legacy, approved: false, submitted: false, savedAt: Date.now() };
    neutralizeEstimateView();
    const js = document.getElementById('e-job'); js.value = String(id);
    applyOpenedEstimate(id, jobs.find(j => j.id === id), 'ready');
    calcAll();
    const note = document.getElementById('fixed-price-note');
    return { field: document.getElementById('e-fixed-amount').value, moved: _fixedPrepMovedOut, basis: _fixedAmountBasis,
             note: note ? note.textContent : '', snap: JSON.parse(JSON.stringify(currentEstimate)) };
  }, [idR, rR.snap]);
  ok(out.moved === prep, 'reopening moves the prep fee out of the flat fee: ' + out.moved);
  ok(out.field === '$' + (20000 - prep).toLocaleString(), 'the fee box reads the flat fee without it: ' + out.field);
  ok(out.basis === 0, 'the old suggestion is not read back, so no drift warning fires');
  has(out.note, 'This fee was saved under the old rule, with the prep fee inside it:', 'the panel says what happened');
  has(out.note, "so the client's total is unchanged", 'and that the total is unchanged');
  ok(out.snap.havellinTotal === 20000, '⚠⚠ the re-priced total is the SAME 20000, not 20000 + the fee again: ' + out.snap.havellinTotal);
  ok(out.snap.fixedAmount === 20000 - prep && out.snap.prepFeeOnTop === true, 'saved under the new rule: flat ' + out.snap.fixedAmount + ', fee on top');
  // Switching jobs clears it.
  const idO = await make('downsizing', 'Other');
  const cleared = await p.evaluate((idO) => { editEstimateForJob(idO); return _fixedPrepMovedOut; }, idO);
  await p.waitForTimeout(800);
  const cleared2 = await p.evaluate(() => _fixedPrepMovedOut);
  ok(cleared === 0 && cleared2 === 0, 'opening another client clears it');

  // ── E. Overflow ──────────────────────────────────────────────────────────
  for (const w of [1440, 390]) {
    await p.setViewportSize({ width: w, height: 900 });
    await p.evaluate(([id, e]) => { estimateStore[id] = { approved: true, approvedBy: 'Anthony Graziano', estimate: e }; docAction(id, 'estimate', 'view'); }, [idB, sB]);
    await p.waitForTimeout(400);
    const ov = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok(ov <= 0, 'no horizontal overflow at ' + w + 'px with the estimate open (' + ov + ')');
    await p.evaluate(() => { if (typeof closeDocViewer === 'function') closeDocViewer(); });
  }
  ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  await b.close();
})();
