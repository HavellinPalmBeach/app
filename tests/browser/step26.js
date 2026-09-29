// Step 26 — client documents say only what the estimate prices (2026-09-29, off the 2026-09-28 workflow
// audit: H6, M2, M3, the document lows, Q8 and Q11).
//
// Drives the REAL page: the real intake, the real Build Estimate (rush, the concierge control, the
// specialist crew, the discount box), the real client estimate, the real agreement builders, the real
// invoices, the real Client Dashboard and its rail, the real discount pop-up typed into and its real
// Apply button, and the real document viewer — so each claim is checked where a person reads it.
//
//   A. H6  the rush line says priority scheduling, and names crew only when the estimate staffs it
//   B. M2  the final's Original Estimate is the estimate alone, with the change order on its own line
//   C. M3  the discount pop-up: 0 removes the discount, a blank is refused, the agreement is revoked
//   D. M3  once the signing packet is out, Offer discount is gone and the door refuses
//   E. Q11 the packet can be READ before the client says yes — and only read
//   F. Q8  the agreement names the premium and the discount; no "(None — $0)" materials clause
//   G. the invoice refusal names the invoice; overflow at 1440 and 390; no page errors
//
//   NODE_PATH=/opt/node22/lib/node_modules node tests/browser/step26.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
// Held outside the async body so the catch can close it (see step25).
let b = null;
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
  await p.evaluate(() => {
    window.__prints = []; window.print = function () {
      const pt = document.getElementById('print-target');
      window.__prints.push({ html: pt ? pt.innerHTML : '', title: document.title });
    };
    // The manager email is captured rather than sent: in a headless browser a mailto fallback is a
    // navigation away from the page under test.
    window.__mails = []; window.sendInternalEmail = function (to, subj, lines) { window.__mails.push({ subj: subj, text: lines.join('\n') }); };
  });
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

  // The real Build Estimate: six rooms in scope, then the levers this step is about, then calcAll.
  async function build(id, o) {
    await p.evaluate((id) => dashGoEstimate(id), id); await p.waitForTimeout(700);
    return p.evaluate(([id, o]) => {
      const js = document.getElementById('e-job'); js.value = String(id); if (js.onchange) js.onchange();
      for (let i = 0; i < 6; i++) setRoomState('r' + i, 'in');
      document.getElementById('e-rush').checked = !!o.rush;
      const d = document.getElementById('e-discount'); d.value = String(o.disc || 0);
      // Each build starts from the ordinary crew: one concierge, the recommended specialists. The
      // controls keep their last value across a rebuild of the same job, as they do for a person.
      document.getElementById('e-tc-count').value = '1'; _tc2UserSet = false; _crewUserSet = false;
      calcAll();
      if (o.tc2) { document.getElementById('e-tc-count').value = '2'; _tc2UserSet = true; calcAll(); }
      if (o.psExtra) {
        const rec = currentEstimate.psRecommended;
        document.getElementById('ps-crew-size').value = String(Math.min(6, rec + o.psExtra)); _crewUserSet = true; calcAll();
      }
      const e = JSON.parse(JSON.stringify(currentEstimate));
      estimateStore[id] = { approved: true, approvedBy: 'Anthony Graziano', estimate: e };
      const job = jobs.find(j => j.id === id);
      job.approved = true; job.status = 'approved'; job.estimateSentDate = 'September 20, 2026';
      Object.assign(job, o.job || {});
      saveJobs();
      return e;
    }, [id, o || {}]);
  }
  const T = (h) => p.evaluate((h) => { const d = document.createElement('div');
    d.innerHTML = String(h).replace(/<\/td>/g, ' </td>').replace(/<\/th>/g, ' </th>').replace(/<br>/g, ' ');
    return d.textContent.replace(/\s+/g, ' '); }, h);
  const text = (sel) => p.evaluate((sel) => { const e = document.querySelector(sel); return e ? e.textContent.replace(/\s+/g, ' ') : ''; }, sel);
  const click = async (sel) => { try { await p.click(sel); return true; } catch (e) { ok(false, 'could not press ' + sel); return false; } };
  const fill = async (sel, v) => { try { await p.fill(sel, v); return true; } catch (e) { ok(false, 'could not type into ' + sel); return false; } };
  const dash = async (id) => { await p.evaluate((id) => { showPanel('jobs', document.querySelector('.nb[onclick*="\'jobs\'"]')); openClientDashboard(id); }, id); await p.waitForTimeout(500); };
  const buttons = () => p.evaluate(() => Array.from(document.querySelectorAll('#client-dashboard-view button'))
    .map(x => ({ t: x.textContent.replace(/\s+/g, ' ').trim(), c: x.getAttribute('onclick') || '' })));
  const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

  // ── A. H6 ────────────────────────────────────────────────────────────────
  console.log('\n## A. H6 — the rush line is priority scheduling; crew is named only when it is staffed');
  const idR = await make('home_cleanout', 'Rush');
  const eR = await build(idR, { rush: true, job: { won: true, status: 'won' } });
  ok(eR.rush && eR.rushAmt > 0, 'a real rush estimate, premium $' + eR.rushAmt);
  ok(eR.psRecommended >= 2 && eR.psCount === eR.psRecommended, 'the snapshot records the recommended crew beside the crew chosen (' + eR.psCount + '/' + eR.psRecommended + ')');
  const ceR = await T(await p.evaluate((id) => clientEstimateHtml(estimateStore[id].estimate, jobs.find(j => j.id === id)), idR));
  has(ceR, 'Expedited Delivery (20%) Priority scheduling to meet the timeline you requested', '⚠⚠ the estimate’s rush line says what the premium buys');
  lacks(ceR, 'second Transition Concierge', 'and claims no second concierge the estimate does not staff');
  lacks(ceR, 'expanded', 'nor an expanded crew');
  lacks(ceR, 'compress the project calendar', 'the retired sentence is gone');
  const eR2 = await build(idR, { rush: true, tc2: true, job: { won: true, status: 'won' } });
  ok(!!eR2.needsTC2, 'the concierge control set to 2 reaches the record');
  has(await T(await p.evaluate((id) => clientEstimateHtml(estimateStore[id].estimate, jobs.find(j => j.id === id)), idR)),
      'with a second Transition Concierge working in parallel', 'a second concierge actually staffed is named');
  const eR3 = await build(idR, { rush: true, psExtra: 1, job: { won: true, status: 'won' } });
  ok(eR3.psCount === eR3.psRecommended + 1, 'a crew set above the recommendation reaches the record (' + eR3.psCount + ' over ' + eR3.psRecommended + ')');
  const ceR3 = await T(await p.evaluate((id) => clientEstimateHtml(estimateStore[id].estimate, jobs.find(j => j.id === id)), idR));
  has(ceR3, 'with an expanded crew of ' + eR3.psCount + ' Property Specialists working in parallel', 'an expanded crew actually staffed is named, with its size');
  lacks(ceR3, 'second Transition Concierge', 'without inventing a second concierge');
  // The invoices read the same sentence off the same record.
  const invR = await p.evaluate((id) => {
    const job = jobs.find(j => j.id === id), e = estimateStore[id].estimate;
    jobLogs[id] = [{ date: '2026-09-21', activity: 'work', members: [
      { name: 'Anthony Graziano', role: 'TC', hours: e.totTC }, { name: 'Anthony Graziano Jr', role: 'PS', hours: e.totPS }] }];
    return { dep: invoiceHtml(job, 'deposit').html, fin: invoiceHtml(job, 'final').html };
  }, idR);
  has(await T(invR.fin), 'Priority scheduling to meet the timeline you requested, with an expanded crew', 'the final’s rush line is the estimate’s');
  has(await T(invR.dep), 'Priority scheduling to meet the timeline you requested', 'and so is the deposit invoice’s');
  lacks(await T(invR.dep), 'Compressing the project calendar', 'never the old advance-invoice wording');

  // ── B. M2 ────────────────────────────────────────────────────────────────
  console.log('\n## B. M2 — the final states the estimate alone, and the change order on its own line');
  const idM = await make('home_cleanout', 'Change');
  const eM = await build(idM, { job: { won: true, status: 'active', agrSigned: true, agrSent: true } });
  const m2 = await p.evaluate((id) => {
    const job = jobs.find(j => j.id === id), e = estimateStore[id].estimate;
    changeOrders.push({ id: Date.now(), jobId: id, tcHrs: 10, psHrs: 10, reason: 'scope_add', description: 'Garage added',
      createdAt: '2026-09-22', clientApproved: true, clientName: 'Pat Change', clientAcceptedAt: '2026-09-22' });
    jobLogs[id] = [{ date: '2026-09-21', activity: 'work', members: [
      { name: 'Anthony Graziano', role: 'TC', hours: e.totTC + 10 }, { name: 'Anthony Graziano Jr', role: 'PS', hours: e.totPS + 10 }] }];
    const split = paymentSplit(e.havellinTotal);
    job.payments = [{ id: 1, uid: 'm1', stage: 'deposit', amount: split.deposit, method: 'wire', date: '2026-09-15', clearedOn: '2026-09-15' },
                    { id: 2, uid: 'm2', stage: 'midpoint', amount: split.midpoint, method: 'wire', date: '2026-09-20', clearedOn: '2026-09-20' }];
    const d = invoiceHtml(job, 'final');
    const box = document.createElement('div'); box.innerHTML = d.html;
    const rows = Array.from(box.querySelectorAll('.pay-tbl tr')).map(r => r.textContent.replace(/\s+/g, ' ').trim());
    return { rows, total: e.havellinTotal, split };
  }, idM);
  const iOrig = m2.rows.findIndex(r => /^Original Estimate/.test(r));
  ok(iOrig >= 0, 'the payment summary has its Original Estimate row');
  has(m2.rows[iOrig] || '', '$' + m2.total.toLocaleString(), '⚠⚠ it prints the estimate alone ($' + m2.total.toLocaleString() + ')');
  has(m2.rows[iOrig + 1] || '', 'Approved Change Orders (1)', 'with the change order on the line directly beneath it');
  has(m2.rows[iOrig + 1] || '', '+10.0 concierge', 'stated in hours');
  has(m2.rows.join(' | '), '$' + m2.split.deposit.toLocaleString(), 'the deposit shown is half of the figure above it');

  // ── C. M3 — the pop-up ───────────────────────────────────────────────────
  console.log('\n## C. M3 — the discount pop-up removes a discount with 0, refuses a blank, and revokes the agreement');
  const idD = await make('home_cleanout', 'Discount');
  const eD = await build(idD, { disc: 10, job: { won: true, status: 'won', agrApproved: true, agrApprovedBy: 'Anthony Graziano', agrApprovedAt: 'September 21, 2026' } });
  ok(eD.discountPct === 10 && eD.discountAmt > 0, 'a real 10% discount on the estimate ($' + eD.discountAmt + ')');
  await dash(idD);
  const btnsD = await buttons();
  ok(btnsD.some(x => x.c === 'dashOfferDiscount(' + idD + ')'), 'Offer discount is on the rail while the packet has not gone out');
  await click('button[onclick="dashOfferDiscount(' + idD + ')"]'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.getElementById('discount-modal').style.display === 'flex'), 'the real button opens the pop-up');
  ok(await p.evaluate(() => document.getElementById('dm-pct').value) === '10', 'showing the discount on the estimate');
  has(await text('#discount-modal'), '0 removes the discount', 'the pop-up says how to take it off');
  await fill('#dm-pct', ''); await p.evaluate(() => updateDiscountModal());
  ok((await text('#dm-revised')) === '—', 'a blank previews nothing');
  await click('#discount-modal .btn-p'); await p.waitForTimeout(250);
  has(await text('#dm-fb'), 'between 0% and 15%', '⚠ a blank is refused, in the pop-up, naming the real range');
  const still = await p.evaluate((id) => ({ pct: currentEstimate.discountPct, agr: jobs.find(j => j.id === id).agrApproved }), idD);
  ok(still.pct === 10 && still.agr === true, 'and nothing changed — the discount and the agreement are untouched');
  await fill('#dm-pct', '0'); await p.evaluate(() => updateDiscountModal());
  const pre = eD.havellinTotal + eD.discountAmt;
  ok((await text('#dm-revised')) === '$' + pre.toLocaleString(), '0 previews the total with the discount taken off ($' + pre.toLocaleString() + ')');
  await click('#discount-modal .btn-p'); await p.waitForTimeout(400);
  const after = await p.evaluate((id) => { const job = jobs.find(j => j.id === id), rec = estimateStore[id];
    return { pct: rec.estimate.discountPct, amt: rec.estimate.discountAmt, total: rec.estimate.havellinTotal, approved: rec.approved,
             agr: job.agrApproved, why: job.agrRevokedBy, modal: document.getElementById('discount-modal').style.display,
             mail: (window.__mails[0] || {}).text || '' }; }, idD);
  ok(after.pct === 0 && after.amt === 0, '⚠⚠ 0 REMOVED the discount (it used to become 1%)');
  ok(after.total === pre, 'the total is back to $' + pre.toLocaleString());
  ok(after.approved === false, 'and the estimate goes back to the manager');
  ok(after.agr === false && after.why === 'discount-revised', '⚠⚠ the agreement’s approval is withdrawn, naming why');
  ok(after.modal !== 'flex', 'the pop-up closes');
  has(after.mail, 'has removed the client discount', 'the manager is told it was removed');
  has(after.mail, 'Discount: removed', 'not "Proposed discount: 0%"');
  await dash(idD);
  has(await text('#client-dashboard-view'), 'A discount changed the price after this was prepared', 'the rail says why the packet must be re-approved');

  // ── D. M3 — after the packet is out ──────────────────────────────────────
  console.log('\n## D. M3 — once the signing packet has gone out, a price change is a change order');
  const idS = await make('home_cleanout', 'Sent');
  await build(idS, { disc: 5, job: { won: true, status: 'won', agrApproved: true, agrApprovedBy: 'Anthony Graziano',
    agrApprovedAt: 'September 21, 2026', docState: { agreement: { sentAt: '2026-09-22T10:00:00Z', sentBy: 'Ashley Jerome' } } } });
  await dash(idS);
  ok(!(await buttons()).some(x => /dashOfferDiscount/.test(x.c)), '⚠⚠ Offer discount is gone once the packet has been sent (a DocuSign send writes only the record)');
  await p.evaluate((id) => dashOfferDiscount(id), idS); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.getElementById('discount-modal').style.display !== 'flex'), 'and the handler does not open the pop-up');
  has(await text('#dash-fb'), 'signing packet has gone to the client', 'it says why, on the dashboard');
  has(await text('#dash-fb'), 'change order', 'naming the route that remains');

  // ── E. Q11 ───────────────────────────────────────────────────────────────
  console.log('\n## E. Q11 — the packet may be read before the client says yes, and only read');
  const idQ = await make('downsizing', 'Preview');
  await build(idQ, {});
  await dash(idQ);
  const btnsQ = await buttons();
  ok(btnsQ.some(x => x.c === "docAction(" + idQ + ",'agreement','view')"), 'the packet can be opened from the rail before the yes');
  ok(!btnsQ.some(x => /'agreement','(print|send|file)'/.test(x.c)), '⚠ and nothing on the rail prints, sends or files it');
  await p.evaluate((id) => docAction(id, 'agreement', 'view'), idQ); await p.waitForTimeout(400);
  has(await text('#doc-viewer-title'), 'Signing Packet — PREVIEW', 'the viewer titles it PREVIEW');
  ok(await p.evaluate(() => getComputedStyle(document.getElementById('doc-viewer-print')).display === 'none'), '⚠ the viewer offers no Print');
  has(await text('#doc-viewer-body'), 'Exhibit A', 'and shows the real packet, estimate and all');
  const stamp = await p.evaluate((id) => { const j = jobs.find(x => x.id === id); return { agr: !!j.agrApproved, filed: !!(j.docState && j.docState.agreement && j.docState.agreement.filedAt) }; }, idQ);
  ok(!stamp.agr && !stamp.filed, '⚠⚠ reading it stamped no approval and filed nothing');
  await p.evaluate(() => closeDocViewer()); await p.waitForTimeout(150);
  await p.evaluate((id) => { window.__prints = []; docAction(id, 'agreement', 'print'); }, idQ); await p.waitForTimeout(700);
  ok(await p.evaluate(() => window.__prints.length === 0), 'printing it before the yes is refused');
  has(await text('#dash-fb'), 'nothing to put under contract', 'saying why');
  await p.evaluate((id) => { const j = jobs.find(x => x.id === id); j.won = true; j.status = 'won'; saveJobs(); }, idQ);
  await p.evaluate((id) => docAction(id, 'agreement', 'view'), idQ); await p.waitForTimeout(400);
  const tWon = await text('#doc-viewer-title');
  ok(tWon.indexOf('PREVIEW') < 0 && tWon.indexOf('Signing Packet') >= 0, 'once won, the viewer shows the packet as itself');
  ok(await p.evaluate(() => getComputedStyle(document.getElementById('doc-viewer-print')).display !== 'none'), 'with Print');
  await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(300);
  ok((await overflow()) <= 0, 'the viewer at 390px has no horizontal overflow');
  await p.setViewportSize({ width: 1440, height: 1000 });
  await p.evaluate(() => closeDocViewer());

  // ── F. Q8 and materials ──────────────────────────────────────────────────
  console.log('\n## F. Q8 — the agreement names the premium and the discount; no "(None — $0)"');
  const idA = await make('downsizing', 'Terms');
  const eA = await build(idA, { rush: true, disc: 10, job: { won: true, status: 'won' } });
  const agr = await T(await p.evaluate((id) => agreementHtml(jobs.find(j => j.id === id), estimateStore[id].estimate), idA));
  has(agr, 'an expedited-delivery premium of twenty percent (20%) of Contractor’s fees is charged', '⚠⚠ the fee clause names the premium Exhibit A itemizes');
  has(agr, 'A preferred-client discount of ten percent (10%) applies to Contractor’s labor fees and to the expedited-delivery premium charged on them',
      'and the discount, reaching the premium as the estimate computes it');
  ok(eA.pkgCost === 0, 'no materials package on this estimate');
  lacks(agr, '(None — $0)', '⚠ §3.6 no longer quotes "(None — $0)"');
  has(agr, 'No moving or packing materials package is quoted on the Estimate, and none is billed.', 'it says none is quoted');
  const est2 = await T(await p.evaluate((id) => clientEstimateHtml(estimateStore[id].estimate, jobs.find(j => j.id === id)), idA));
  lacks(est2, 'None — $0', 'and the estimate quotes it nowhere either');

  // ── G. the gate wording, overflow, errors ────────────────────────────────
  console.log('\n## G. The invoice refusal names the invoice; overflow and page errors');
  const idG = await make('home_cleanout', 'Gate');
  await build(idG, {});
  await p.evaluate((id) => { estimateStore[id].approved = false; }, idG);
  await dash(idG);
  await p.evaluate((id) => docAction(id, 'invoice', 'view', { stage: 'deposit' }), idG); await p.waitForTimeout(300);
  has(await text('#dash-fb'), 'The estimate must be approved before the invoice can be drawn.', '⚠ the invoice refusal names the invoice');
  lacks(await text('#dash-fb'), 'before the agreement can be drawn', 'not the agreement');
  await dash(idD);
  ok((await overflow()) <= 0, 'the dashboard at 1440px has no horizontal overflow');
  await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(300);
  ok((await overflow()) <= 0, 'nor at 390px');
  ok(errs.length === 0, 'no page errors' + (errs.length ? ' — ' + errs.slice(0, 3).join(' | ') : ''));

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  await b.close();
  process.exit(fail ? 1 : 0);
})().catch(async e => { console.log('THREW: ' + (e && e.stack || e)); console.log(pass + ' passed, ' + (fail + 1) + ' failed'); if (b) await b.close(); process.exit(1); });
