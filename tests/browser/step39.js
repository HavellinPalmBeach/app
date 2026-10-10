// Step 39 — lifecycle and payment loose ends (2026-09-29, workflow audit M4–M7 / fix pack P10).
//
// Five things the audit found, each a place where the app wrote the wrong record or offered nothing:
//   M4  A client who paid part of the deposit and walked away was marked a plain loss, and the money vanished.
//   M5  An Estate Settlement on a probate matter activated with no Letters on file and had nowhere to record the case.
//   M6  The payment recorder opened blank for the midpoint and the final, under a "Record Deposit" button.
//   M7  After 8pm Eastern every date the app defaulted or stamped was tomorrow's (the UTC date).
//   Q12 After a part cheque the ACH link asked for the whole deposit — and, once the invoice went out, was not offered at all.
//   Q19 A two-concierge estimate confirmed its team with the second concierge slot empty.
// plus the lows: Home Prep's middle payment, the final's View/Print before any hours, the attorney chip, a closed plan.
//
// Drives the REAL page: the estimate is built on the real Build Estimate screen (the real room toggles, the real
// Concierges control, the real calcAll); every step is taken by pressing the band's own buttons, the client list's
// ✕, the real modals' own controls and Save buttons, the real intake form, Edit Client and the Job Plan team sign-off.
// ⚠ THE CLOCK IS PINNED AT 9:30PM EASTERN (01:30 UTC THE NEXT DAY) through Playwright's clock, not by
// overriding `_todayStr` — the point is that the app's OWN clock read gives the local date at that hour.
// Approvals, sends and a Gmail draft cannot be made from a headless page, so an approved estimate and a sent
// document are written as the records those paths write, which is all the band reads.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step39.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL ' + m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + ' (got ' + JSON.stringify(a) + ')');
const has = (s, n, m) => ok(String(s).indexOf(n) >= 0, m + ' (in ' + JSON.stringify(String(s).slice(0, 400)) + ')');
const lacks = (s, n, m) => ok(String(s).indexOf(n) < 0, m + ' (found ' + JSON.stringify(n) + ')');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
const SYNC = 'https://script.google.com/macros/s/FAKE/exec';
let b;

const HOUSE = ['Entryway / Foyer', 'Living Room', 'Dining Room', 'Family Room / Great Room', 'Half Bath',
  'Kitchen', 'Laundry Room', 'Office 1', 'Primary Suite', 'Primary Bath', 'Walk-in Closet',
  'Bedroom 2', 'Bathroom 2', 'Bedroom 3', 'Bathroom 3', 'Garage (2-car)'];

(async () => {
  b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
  const p = await ctx.newPage();
  // ⚠ 9:30PM ON TUESDAY 29 SEPTEMBER, EASTERN. In UTC it is already Wednesday the 30th.
  await p.clock.install({ time: new Date('2026-09-29T21:30:00-04:00') });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const dialogs = []; p.on('dialog', async (d) => { dialogs.push({ type: d.type(), msg: d.message() }); await d.accept(); });
  const posts = [];
  await ctx.route(SYNC + '*', async (route) => {
    let body = {}; try { body = JSON.parse(route.request().postData() || '{}'); } catch (e) {}
    posts.push(body);
    if (body.action === 'stripeLink') {
      return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ ok: true, url: 'https://buy.stripe.com/test_' + body.jobId, linkId: 'plink_' + body.jobId }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
  });
  await p.goto(APP); await p.waitForTimeout(1500);
  const overflow = () => p.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
  const job = (id) => p.evaluate((i) => JSON.parse(JSON.stringify(jobs.find((x) => x.id === i))), id);
  const bandText = () => p.evaluate(() => { const el = document.querySelector('#client-dashboard-view .jt-next'); return el ? el.textContent : ''; });
  const dashText = () => p.evaluate(() => { const el = document.getElementById('client-dashboard-view'); return el ? el.textContent : ''; });
  // Navigation only (it is not under test): the app's own one way back onto a client — nav first, drilldown second.
  const openDash = async (id) => { await shut(); await p.evaluate((i) => goToClientDashboard(i), id); await p.waitForTimeout(250); };
  // ⚠ NONE OF THESE THROWS. A control that is missing or hidden is a FAILED CHECK, and the step runs on — so the
  // pre-change build reports every place it differs, rather than stopping at the first.
  const vis = (sel) => p.locator(sel).first().isVisible().catch(() => false);
  const press = async (sel, what) => {
    const v = await vis(sel);
    ok(v, what + ' — the control is on screen');
    if (v) { await p.click(sel, { timeout: 5000 }).catch((e) => ok(false, what + ' — ' + e.message.split('\n')[0])); await p.waitForTimeout(350); }
    return v;
  };
  const choose = async (sel, value, what) => {
    const v = await vis(sel);
    ok(v, (what || sel) + ' — on screen to choose from');
    if (v) { await p.selectOption(sel, value, { timeout: 5000 }).catch((e) => ok(false, (what || sel) + ' — ' + e.message.split('\n')[0])); await p.waitForTimeout(200); }
  };
  const type = async (sel, value, what) => {
    const v = await vis(sel);
    ok(v, (what || sel) + ' — on screen to type into');
    if (v) { await p.fill(sel, value, { timeout: 5000 }).catch((e) => ok(false, (what || sel) + ' — ' + e.message.split('\n')[0])); await p.waitForTimeout(150); }
  };
  // A save the app refused leaves its modal open (the pre-change build refuses several below); close it the way
  // Cancel does before moving on, or every later press lands on the overlay.
  const shut = () => p.evaluate(() => document.querySelectorAll('.modal-overlay').forEach((m) => {
    if (getComputedStyle(m).display !== 'none') m.style.display = 'none'; }));
  const nav = async (panel) => { await shut(); await p.click('.nb[onclick*="\'' + panel + '\'"]', { timeout: 5000 }).catch(() => ok(false, 'nav ' + panel)); await p.waitForTimeout(300); };
  const val = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.value : null; }, sel);
  const txt = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.textContent : null; }, sel);
  const shown = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return !!el && el.offsetParent !== null; }, sel);

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  // A. ONE HOME CLEANOUT FROM ITS ESTIMATE TO ITS DEPOSIT, ALL AT 9:30PM ON THE 29TH (M7, Q19)
  // ═══════════════════════════════════════════════════════════════════════════════════════════
  await p.evaluate(() => {
    jobs.unshift({ id: 7391, hvlId: 'HVL-2609-EVEN', name: 'Tripp Butler', fname: 'Tripp', lname: 'Butler', sqft: '3500',
      svc: 'home_cleanout', addr: '69 Beach Blvd', city: 'Palm Beach', email: 'tripp@example.com', phone: '(561) 555-0101',
      beds: '3', baths: '3', halfBaths: '1', propVal: '1500000', start: '2026-10-05', walkthrough: '2026-09-22',
      created: '2026-09-15', status: 'new', tc: 'Ashley Jerome' });
    saveJobs();
  });
  await openDash(7391);
  await press('#client-dashboard-view .jt-next button[onclick="dashGoEstimate(7391)"]', 'the band\'s Build estimate');
  await p.waitForTimeout(600);
  const ids = await p.evaluate((names) => {
    const out = []; const used = new Set(); let ri = 0;
    ROOMS.forEach((sec) => sec.rooms.forEach((r) => {
      const id = 'r' + ri; ri++;
      const i = names.findIndex((n, k) => n === r.name && !used.has(k));
      if (i >= 0) { used.add(i); out.push(id); }
    }));
    return out;
  }, HOUSE);
  eq(ids.length, HOUSE.length, 'every room of the house is on the grid');
  const closed = await p.evaluate(() => Array.from(document.querySelectorAll('[id^="sec-body-"]'))
    .filter((el) => el.style.display === 'none').map((el) => el.id.replace('sec-body-', '')));
  for (const si of closed) await p.click(`.sec-hdr.sec-toggle[onclick="toggleRoomSection(${si})"]`);
  for (const id of ids) await p.click('#chk-' + id);
  // ⚠ Q19's premise, set the way a person sets it: the estimate staffs TWO concierges.
  await choose('#e-tc-count', '2', 'the Concierges control');
  await p.waitForTimeout(500);
  const est = await p.evaluate(() => JSON.parse(JSON.stringify(currentEstimate)));
  eq(est && est.rooms && est.rooms.filter((r) => !r.excluded).length, HOUSE.length, 'the real calcAll priced the house');
  ok(est && est.needsTC2 === true, 'the Concierges control put a second concierge on the estimate');
  const total = est.havellinTotal;
  ok(total > 10000, 'a realistic total: $' + total);
  await press('#panel-estimate .screen-back', 'the estimate screen\'s way back to the client');
  ok(await shown('#client-dashboard-view'), '…which lands on the Client Dashboard');

  // Approved and sent (a PIN and a Gmail draft cannot be driven headless): the records those two paths write.
  await p.evaluate((e) => {
    estimateStore[7391] = { estimate: e, approved: true, submitted: true, approvedBy: 'Anthony Graziano', savedAt: Date.now() };
    Object.assign(jobs.find((x) => x.id === 7391), { status: 'approved', approved: true, estimateSentDate: 'Sep 25, 2026' });
    saveJobs();
  }, est);
  await openDash(7391);

  // ── M7: the client said yes this evening. ─────────────────────────────────────────────────
  await press('#client-dashboard-view .jt-next button[onclick="openWonModal(7391)"]', 'the band\'s Client accepted — mark won');
  eq(await val('#won-date'), '2026-09-29', '⚠⚠ M7: the acceptance date opens on TODAY — it read the 30th after 8pm Eastern');
  await choose('#won-method', 'email', 'how they accepted');
  await type('#won-note', 'We would like to go ahead — please send the agreement.', 'what they said');
  await press('#won-modal .btn-p', 'Mark as Won');
  let j = await job(7391);
  eq([j.status, j.won, j.wonAt], ['won', true, '2026-09-29'], 'won, dated the 29th');

  // ── M7: the signed agreement came back this evening. ──────────────────────────────────────
  await p.evaluate(() => { Object.assign(jobs.find((x) => x.id === 7391), { agrApproved: true, agrApprovedBy: 'Anthony Graziano',
    agrApprovedAt: '2026-09-26', agrSent: true, agrSentAt: '2026-09-26' }); saveJobs(); });
  await openDash(7391);
  await press('#client-dashboard-view .jt-next button[onclick="dashMarkAgreementSigned(7391)"]', 'the band\'s Record the signed agreement');
  eq(await val('#sig-on'), '2026-09-29', '⚠⚠ M7: the signature date opens on today');
  eq(await val('#sig-by'), 'Tripp Butler', 'prefilled with the client, who is the signer');
  await choose('#sig-how', 'wet', 'how it was signed');
  await press('#sig-modal .btn-p', 'Record Signature');
  j = await job(7391);
  const sig = (j.docState && j.docState.agreement && j.docState.agreement.sig) || {};
  eq([j.agrSigned, sig.signedOn, sig.signedBy], [true, '2026-09-29', 'Tripp Butler'], 'signed by the client, on the 29th');

  // ── M7: the deposit wire landed this evening. ─────────────────────────────────────────────
  await p.evaluate(() => { const x = jobs.find((y) => y.id === 7391);
    x.docState['invoice:deposit'] = { draftedAt: '2026-09-27T14:00:00Z', sentAt: '2026-09-27T14:05:00Z' }; saveJobs(); });
  await openDash(7391);
  await press('#client-dashboard-view .jt-next button[onclick="dashRecordPayment(7391,\'deposit\')"]', 'the band\'s Record payment on the deposit');
  eq(await txt('#dep-modal-title'), 'Record Deposit', 'the recorder is on the deposit');
  eq(Number(await val('#dep-amount')), Math.round(total * 0.5), 'prefilled with the 50% deposit');
  eq(await val('#dep-date'), '2026-09-29', '⚠⚠ M7: the date received opens on today, not tomorrow');
  await choose('#dep-method', 'wire', 'how it was paid');
  await press('#dep-save-btn', 'Record Deposit');
  j = await job(7391);
  const depPay = (j.payments || []).filter((x) => x.stage === 'deposit')[0] || {};
  eq([depPay.amount, depPay.receivedOn, depPay.clearedOn], [Math.round(total * 0.5), '2026-09-29', '2026-09-29'],
    'the wire is recorded, received and cleared on the 29th');

  // ── M7: activated this evening; the hours form opens on today. Q19: the second concierge slot. ──
  await openDash(7391);
  dialogs.length = 0;
  await press('#client-dashboard-view .jt-next button[onclick="activateOrCycle(7391)"]', 'the band\'s Activate job');
  ok(dialogs.some((d) => /Activate this job today/.test(d.msg)), 'activating before the target start asks first (accepted)');
  j = await job(7391);
  eq([j.status, j.activatedOn], ['active', '2026-09-29'], '⚠⚠ M7: activated on the 29th — the date every schedule figure counts from');
  await p.waitForTimeout(500);
  eq(await p.evaluate(() => (document.getElementById('plan-job') || {}).value), '7391', 'Activate landed on this client\'s Job Plan');
  eq(await val('#log-date'), '2026-09-29', '⚠⚠ M7: the hours form opens on today — an evening entry landed on tomorrow in the log that bills the client');


  // ── Q19: the estimate staffs two concierges; the team cannot be confirmed with the second slot empty. ──
  await press('.sec-hdr.sec-toggle[onclick="togglePhase(\'hours\')"]', 'the Hours & daily close fold, where the team is signed off');
  ok(await shown('#log-tc2-name'), 'the Job Plan offers a Transition Concierge 2 row, because the estimate staffs one');
  eq(await val('#log-tc2-name'), '', '…and it is empty');
  eq(await val('#log-m0-name'), 'Ashley Jerome', 'the concierge from intake is on the first row');
  const psSlots = await p.evaluate(() => Array.from(document.querySelectorAll('select[id^="log-m"][id$="-name"]'))
    .map((el) => el.id).filter((id) => id !== 'log-m0-name'));
  ok(psSlots.length >= 2, 'the specialist rows the estimate priced are drawn (' + psSlots.length + ')');
  for (const id of psSlots) await choose('#' + id, 'Contractor TBD', 'specialist ' + id);
  await press('button[onclick="confirmJobTeam(7391)"]', 'Confirm job team');
  let fb = await txt('#log-fb');
  has(fb, 'staffs two Transition Concierges and the second slot has no name', '⚠⚠ Q19: refused, naming the empty second concierge slot');
  has(fb, 'Contractor — TC', '…and the placeholder to use for one not picked yet');
  eq(await p.evaluate(() => !!(getJobCrew(7391) || {}).confirmed), false, 'the team is NOT confirmed');
  await choose('#log-tc2-name', 'Contractor — TC', 'the Transition Concierge 2 row');
  dialogs.length = 0;
  await press('button[onclick="confirmJobTeam(7391)"]', 'Confirm job team again');
  ok(dialogs.some((d) => /concierge slot is still/.test(d.msg)), 'a placeholder concierge is called out before it is accepted, like a TBD specialist');
  eq(await p.evaluate(() => !!(getJobCrew(7391) || {}).confirmed), true, 'with the placeholder in the second slot the team confirms');
  has(await txt('#log-fb'), 'Job team confirmed', '…and says so');

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  // B. THE MIDPOINT, THREE DAYS LATER AT 9:30PM: RECORDED WITHOUT TYPING THE AMOUNT (M6, M7)
  // ═══════════════════════════════════════════════════════════════════════════════════════════
  await p.clock.setSystemTime(new Date('2026-10-02T21:30:00-04:00'));   // Friday evening; UTC is Saturday
  await p.evaluate(() => { const x = jobs.find((y) => y.id === 7391);
    x.docState['invoice:midpoint'] = { draftedAt: '2026-10-01T14:00:00Z', sentAt: '2026-10-01T14:05:00Z' }; saveJobs(); });
  await openDash(7391);
  has(await bandText(), 'Collect the midpoint payment', 'the band is on the midpoint payment');
  // What the client's own invoice says is due — read off the real document in the real viewer, never re-derived here.
  await press('#client-dashboard-view .jt-next button[onclick="docAction(7391,\'invoice\',\'view\',{stage:\'midpoint\'})"]',
    'the band\'s View midpoint invoice');
  const invText = await p.evaluate(() => document.getElementById('doc-viewer-body').textContent);
  // RESTATED (2026-10-10, the core-jobs run): the box reads *(to 75%)*, with the 75% to date on a row above it.
  const m = /Midpoint Payment Due Now \(to 75%\)\s*\$([\d,]+)/.exec(invText);
  ok(!!m, 'the invoice states its Midpoint Payment Due Now');
  const due = m ? Number(m[1].replace(/,/g, '')) : -1;
  eq(due, Math.round(total * 0.75) - depPay.amount, 'the 75% due by the midpoint, less the deposit received — $' + due);
  await press('button[onclick="closeDocViewer()"]', 'the viewer\'s Close');
  await press('#client-dashboard-view .jt-next button[onclick="dashRecordPayment(7391,\'midpoint\')"]', 'the band\'s Record payment on the midpoint');
  eq(await txt('#dep-modal-title'), 'Record Midpoint Payment', '⚠ the recorder names the midpoint');
  eq(await txt('#dep-save-btn'), 'Record Midpoint Payment →', '⚠⚠ M6: …and so does its button — it read "Record Deposit →" on every stage');
  eq(Number(await val('#dep-amount')), due, '⚠⚠ M6: the amount is prefilled with what the invoice asks for — it opened BLANK');
  eq(await val('#dep-date'), '2026-10-02', '⚠⚠ M7: dated today, Friday — not Saturday');
  has(await p.evaluate(() => document.getElementById('dep-modal-sub').textContent), 'The midpoint invoice asks for $' + due.toLocaleString('en-US'),
    'the modal says where the figure came from');
  await choose('#dep-method', 'check', 'how it was paid');
  await press('#dep-save-btn', 'Record Midpoint Payment, WITHOUT TYPING AN AMOUNT');
  j = await job(7391);
  const midPay = (j.payments || []).filter((x) => x.stage === 'midpoint')[0] || {};
  eq([midPay.amount, midPay.receivedOn, midPay.clearedOn], [due, '2026-10-02', null],
    '⚠⚠ the midpoint cheque is recorded at the invoice\'s figure, on Friday, uncleared until the bank confirms');
  lacks(await bandText(), 'Collect the midpoint payment', 'the band moves past the midpoint payment');
  has(await dashText(), 'recorded against Midpoint (25%)', 'the confirmation names the stage');

  // Final View/Print wait for logged hours (a P10 low): an hourly job with an empty timesheet cannot price its final,
  // so the strip under the rail no longer offers two final-invoice buttons that refuse on the press.
  const dashHtml = await p.evaluate(() => document.getElementById('client-dashboard-view').innerHTML);
  lacks(dashHtml, "docAction(7391,'invoice','view',{stage:'final'})", '⚠ no View final invoice while no hours are logged');
  lacks(dashHtml, "docAction(7391,'invoice','print',{stage:'final'})", '⚠ …and no Print — both refused on the press');
  has(dashHtml, "docAction(7391,'invoice','view',{stage:'midpoint'})", 'the midpoint invoice is still there to read');

  // A job copied off the realistic estimate above, for the sections below.
  const clone = (id, over) => p.evaluate(([id, over]) => {
    const e = JSON.parse(JSON.stringify(estimateStore[7391].estimate)); e.jobId = id;
    Object.assign(e, over.est || {});
    const base = { id, hvlId: 'HVL-26-' + id, sqft: '3500', svc: 'home_cleanout', addr: id + ' Worth Ave', city: 'Palm Beach',
      phone: '(561) 555-0199', start: '2026-10-12', walkthrough: '2026-09-20', created: '2026-09-14', status: 'won', won: true,
      wonAt: '2026-09-24', approved: true, estimateSentDate: 'Sep 22, 2026', agrApproved: true, agrApprovedBy: 'Anthony Graziano',
      agrSent: true, agrSentAt: '2026-09-25', agrSigned: true, tc: 'Ashley Jerome', payments: [] };
    const jj = Object.assign(base, over.job);
    jobs.unshift(jj);
    estimateStore[id] = { estimate: e, approved: true, submitted: true, approvedBy: 'Anthony Graziano', savedAt: Date.now() };
    saveJobs();
  }, [id, over]);

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  // C. Q12 — $2,000 BY CHEQUE AGAINST THE DEPOSIT: THE ACH LINK IS OFFERED, AND ASKS FOR THE BALANCE
  // ═══════════════════════════════════════════════════════════════════════════════════════════
  await p.evaluate((u) => { SHEETS_SYNC_URL = u; }, SYNC);   // the backend links are minted through; the route above answers
  await clone(7392, { job: { name: 'Cordelia Pemberton', fname: 'Cordelia', lname: 'Pemberton', email: 'cp@example.com',
    docState: { 'invoice:deposit': { draftedAt: '2026-09-28T14:00:00Z', sentAt: '2026-09-28T14:05:00Z' } },
    payments: [{ id: 1, uid: 'q12a', stage: 'deposit', amount: 2000, receivedOn: '2026-09-30', method: 'check', clearedOn: null }] } });
  const target = Math.round(total * 0.5);
  await openDash(7392);
  has(await bandText(), 'Collect the deposit', 'the band is on the deposit, the invoice having gone out');
  posts.length = 0;
  await press('#client-dashboard-view .jt-next button[onclick="dashStripeLink(7392,\'deposit\')"]',
    '⚠⚠ Q12: the ACH link, offered beside Record payment — it was withdrawn the moment the deposit invoice went out');
  await p.waitForTimeout(600);
  const mint = posts.filter((x) => x.action === 'stripeLink');
  eq(mint.length, 1, 'one link is minted');
  eq((mint[0] || {}).amount, target - 2000, '⚠⚠ Q12: for the balance, $' + (target - 2000) + ' — the whole $' + target + ' deposit less the $2,000 cheque');
  has((mint[0] || {}).description || '', 'Deposit (50%) balance', 'the client reads "balance" on Stripe\'s own page');
  has(await dashText(), 'https://buy.stripe.com/test_7392', 'the link is shown, to go out with the invoice');
  // A second cheque arrives; the link already in the client's hands now asks for too much.
  await press('#client-dashboard-view .jt-next button[onclick="dashRecordPayment(7392,\'deposit\')"]', 'Record payment on the deposit');
  eq(Number(await val('#dep-amount')), target - 2000, 'the recorder opens on the same balance');
  await type('#dep-amount', '1000', 'the amount');
  await choose('#dep-method', 'check', 'how it was paid');
  dialogs.length = 0;
  await press('#dep-save-btn', 'Record Deposit');
  ok(dialogs.some((d) => /partial payment/.test(d.msg)), 'a short deposit is challenged as partial (accepted)');
  posts.length = 0;
  await press('#client-dashboard-view .jt-next button[onclick="dashStripeLink(7392,\'deposit\')"]', 'the ACH link again');
  await p.waitForTimeout(400);
  eq(posts.filter((x) => x.action === 'stripeLink').length, 0, 'one link per stage: nothing is minted a second time');
  const warn = await dashText();
  has(warn, 'asks for $' + (target - 2000).toLocaleString('en-US') + ', but only $' + (target - 3000).toLocaleString('en-US') + ' is outstanding',
    '⚠⚠ Q12: the link is NOT handed over as current — it asks for more than is owed now');
  has(warn, 'would overpay by $1,000', '…naming the overpayment');
  has(warn, 'Deactivate it in the Stripe Dashboard', '…and where to switch it off');

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  // D. M4 — $2,000 OF THE DEPOSIT, THEN THE CLIENT WALKS: CLOSED — DEPOSIT RETAINED, THE $2,000 NAMED
  // ═══════════════════════════════════════════════════════════════════════════════════════════
  await clone(7393, { job: { name: 'Ambrose Kittredge', fname: 'Ambrose', lname: 'Kittredge', email: 'ak@example.com', havellinEst: total,
    payments: [{ id: 1, uid: 'm4a', stage: 'deposit', amount: 2000, receivedOn: '2026-09-25', method: 'check', clearedOn: null }] } });
  await nav('jobs');
  await press('#panel-jobs button[onclick*="openCloseoutModal(7393)"]', 'the client list\'s ✕ on Kittredge');
  const coSub = await txt('#closeout-sub');
  has(coSub, '$2,000 has already been received', '⚠⚠ M4: the modal names the money already received');
  has(coSub, 'closed — deposit retained', '…and says it is recorded as retained, not lost');
  eq(await txt('#closeout-modal button[onclick="confirmMarkLost()"]'), 'Close — Retain $2,000', '⚠ the button says what it keeps');
  await choose('#closeout-reason', 'price', 'the reason');
  await press('#closeout-modal button[onclick="confirmMarkLost()"]', 'Close — Retain $2,000');
  j = await job(7393);
  eq([j.status, j.won], ['closed_retained', true], '⚠⚠ M4: Closed — Deposit Retained, still won — it was a plain loss with won cleared');
  const lostAt = j.lostAt;
  await press('#wl-tile-won', 'the Win / Loss Won tile');
  const wonRow = await p.evaluate(() => { const r = document.querySelector('#wl-list-won tr[onclick="openClientDashboard(7393)"]'); return r ? r.textContent : ''; });
  has(wonRow, '$2,000', '⚠⚠ M4: the Won list names the $2,000 kept — it appeared nowhere');
  has(wonRow, 'retained', '…as retained');
  await openDash(7393);
  const dead = await dashText();
  has(dead, '$2,000 retained', 'the rail\'s one row names what was kept');
  has(dead, 'Oct 2, 2026', '⚠ M7: …dated Friday — the stamp is a UTC timestamp written at 9:30pm, already Saturday in UTC');
  lacks(dead, 'Oct 3, 2026', '…not Saturday');
  // Amend the reason the next morning: the date we recorded the loss must not move.
  await p.clock.setSystemTime(new Date('2026-10-03T10:00:00-04:00'));
  await nav('jobs');
  await press('#panel-jobs button[onclick="setFilter(\'closed\',this)"]', 'the Closed filter');
  await press('#panel-jobs button[onclick*="openCloseoutModal(7393)"]', 'the ✕ on the retained job, to amend the reason');
  eq(await val('#closeout-reason'), 'price', 'the modal reopens on the recorded reason');
  await choose('#closeout-reason', 'timing', 'the amended reason');
  await press('#closeout-modal button[onclick="confirmMarkLost()"]', 'save the amended reason');
  j = await job(7393);
  eq([j.lostReason, j.lostAt], ['timing', lostAt], '⚠ M4: the reason is amended and the date we recorded the loss is NOT moved');
  await p.clock.setSystemTime(new Date('2026-10-02T21:30:00-04:00'));

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  // E. M5 — AN ESTATE SETTLEMENT ON A PROBATE MATTER: THE COURT RECORD, AND NO ACTIVATION WITHOUT LETTERS
  // ═══════════════════════════════════════════════════════════════════════════════════════════
  await nav('jobs');
  await press('#btn-add-client', '+ Add New Client');
  await choose('#i-svc', 'cleanout', 'the service');
  ok(await shown('#estate-fields'), 'an Estate Settlement asks the estate questions');
  eq(await shown('#probate-fields'), false, 'the court record waits for the matter type');
  await choose('#i-matter-type', 'probate', 'how the estate is administered');
  ok(await shown('#probate-fields'), '⚠⚠ M5: a probate matter shows the court record — case number, Letters, the §733.604 clock');
  await choose('#i-matter-type', 'trust', 'how the estate is administered');
  eq(await shown('#probate-fields'), false, '…a trust matter hides it again');
  await press('#panel-intake .screen-back', 'the intake screen\'s way back');

  await clone(7394, { job: { svc: 'cleanout', name: 'Estate of Harold Wexley', fname: 'Harold', lname: 'Wexley', email: '',
    deathDate: '2026-08-14', matterType: 'probate', docTier: 'values', gate706: 'no', executorAuth: 'pending',
    executorFname: 'Margaret', executorLname: 'Wexley', executor: 'Margaret Wexley', executorRole: 'Personal Representative',
    executorPhone: '(561) 555-0144', executorEmail: 'mwexley@example.com',
    probateAttyName: 'Richard Comiter', probateAttyFname: 'Richard', probateAttyLname: 'Comiter', probateAttyFirm: 'Comiter Singer',
    probateAttyPhone: '(561) 555-0150', probateAttyEmail: 'rc@example.com',
    docState: { 'invoice:deposit': { draftedAt: '2026-09-28T14:00:00Z', sentAt: '2026-09-28T14:05:00Z' } },
    payments: [{ id: 1, uid: 'm5a', stage: 'deposit', amount: Math.round(total * 0.5), receivedOn: '2026-09-29', method: 'wire', clearedOn: '2026-09-29' }],
    depositReceived: true }, est: { svc: 'cleanout' } });
  await openDash(7394);
  const blk = await bandText();
  has(blk, 'Letters', '⚠⚠ M5: activation is blocked on the Letters — it activated with none on file');
  ok(!(await p.$('#client-dashboard-view .jt-next button[onclick="activateOrCycle(7394)"]')), 'and there is no Activate button to press');
  await press('#client-dashboard-view button[onclick="dashEditClient(7394)"]', 'Edit Client');
  ok(await shown('#ec-probate-fields'), '⚠⚠ M5: Edit Client carries the court record on an Estate Settlement on a probate matter');
  ok(await shown('#ec-letters-date'), '⚠ …with the Letters date, which was asked only at intake — weeks before Letters issue');
  await choose('#ec-exec-auth', 'received', 'Letters of Administration');
  await type('#ec-letters-date', '2026-09-18', 'Letters Issued');
  if (await vis('#ec-letters-date')) await p.dispatchEvent('#ec-letters-date', 'change');
  eq(await val('#ec-probate-deadline'), '2026-11-17', 'the §733.604 deadline follows the Letters — 60 days');
  await press('#edit-client-modal button[onclick="saveClientEdit(7394)"]', 'Save Changes');
  j = await job(7394);
  eq([j.executorAuth, j.lettersDate, j.probateDeadline], ['received', '2026-09-18', '2026-11-17'], 'saved: the Letters, their date and the deadline');
  await openDash(7394);
  ok(!!(await p.$('#client-dashboard-view .jt-next button[onclick="activateOrCycle(7394)"]')), 'with the Letters on file the band offers Activate');
  await p.evaluate(() => openJobPlanFor(7394));
  await p.waitForTimeout(500);
  const chips = await p.evaluate(() => (document.getElementById('job-plan-content') || {}).textContent || '');
  has(chips, 'Letters of Administration on file', 'the Job Plan asks for the Letters on this matter');
  has(chips, '§733.604 inventory deadline', '…and the §733.604 deadline');
  has(chips, 'Estate attorney on file', '…and the attorney, which a probate estate has');

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  // F. THE LOWS: a trust matter's attorney chip; a closed plan; Home Prep's second payment
  // ═══════════════════════════════════════════════════════════════════════════════════════════
  await clone(7397, { job: { svc: 'cleanout', name: 'Estate of Lila Marsh', fname: 'Lila', lname: 'Marsh', email: '',
    deathDate: '2026-07-30', matterType: 'trust', docTier: 'values', gate706: 'no', executorAuth: 'notneeded',
    executorFname: 'Owen', executorLname: 'Marsh', executor: 'Owen Marsh', executorRole: 'Trustee', executorEmail: 'om@example.com',
    status: 'active', activatedOn: '2026-09-28', depositReceived: true,
    payments: [{ id: 1, uid: 'tr1', stage: 'deposit', amount: Math.round(total * 0.5), receivedOn: '2026-09-25', method: 'wire', clearedOn: '2026-09-25' }] },
    est: { svc: 'cleanout' } });
  await p.evaluate(() => openJobPlanFor(7397));
  await p.waitForTimeout(500);
  const trustPlan = await p.evaluate(() => (document.getElementById('job-plan-content') || {}).textContent || '');
  lacks(trustPlan, 'Estate attorney on file', '⚠ a trust administration with no counsel of record is not asked for an attorney it may not have');
  lacks(trustPlan, 'Letters of Administration on file', '…nor for Letters, which a trust matter has none of');

  await clone(7396, { job: { name: 'Beatrice Holloway', fname: 'Beatrice', lname: 'Holloway', email: 'bh@example.com',
    // Closed before the write-once delivery stamp existed (2026-07-30): the status, and no deliveredOn.
    status: 'closed', activatedOn: '2026-07-14', depositReceived: true,
    payments: [{ id: 1, uid: 'cl1', stage: 'deposit', amount: Math.round(total * 0.5), receivedOn: '2026-09-10', method: 'wire', clearedOn: '2026-09-10' }] } });
  await p.evaluate(() => openJobPlanFor(7396));
  await p.waitForTimeout(500);
  const nowCard = await p.evaluate(() => { const n = document.querySelector('#job-plan-content .stg-now');
    const t = n && n.closest('.stg-title'); return t ? t.textContent : ''; });
  has(nowCard, 'Close-out', '⚠ a closed job\'s plan marks Close-out as NOW, even one closed before the delivery stamp existed');
  lacks(nowCard, 'Before Day 1', '…never Before Day 1');

  await p.evaluate((t) => {
    jobs.unshift({ id: 7395, hvlId: 'HVL-26-PREP', name: 'Marisol Vega', fname: 'Marisol', lname: 'Vega', email: 'mv@example.com',
      phone: '(561) 555-0171', svc: 'prep', addr: '12 Via Mizner', city: 'Palm Beach', sqft: '2800', start: '2026-09-28',
      walkthrough: '2026-09-18', created: '2026-09-12', status: 'active', activatedOn: '2026-09-28', won: true, wonAt: '2026-09-21',
      approved: true, estimateSentDate: 'Sep 20, 2026', agrApproved: true, agrApprovedBy: 'Anthony Graziano', agrSent: true,
      agrSentAt: '2026-09-22', agrSigned: true, depositReceived: true, tc: 'Ashley Jerome',
      docState: { 'invoice:deposit': { draftedAt: '2026-09-23T14:00:00Z', sentAt: '2026-09-23T14:05:00Z' } },
      payments: [{ id: 1, uid: 'pp1', stage: 'deposit', amount: 1500, receivedOn: '2026-09-24', method: 'wire', clearedOn: '2026-09-24' }] });
    estimateStore[7395] = { approved: true, submitted: true, approvedBy: 'Anthony Graziano', savedAt: Date.now(),
      estimate: { jobId: 7395, svc: 'prep', prepEnabled: true, prepItems: [{ type: 'Painting', cost: 10000, lid: 'a1' }], prepCost: 10000,
        prepFee: 3000, havellinTotal: 3000, havellinTotalFull: 3000, tcFee: 0, psFee: 0, pkgCost: 0, smf: 0, totTC: 0, totPS: 0,
        tcRate: 150, psRate: 100, discountPct: 0, discountAmt: 0, fixedPrice: false, rush: false, vendors: [], rooms: [], preparedBy: 'Ashley Jerome' } };
    saveJobs();
  }, total);
  await openDash(7395);
  const prepBand = await bandText();
  has(prepBand, 'second invoice', '⚠ Home Prep\'s middle payment is its Second payment on the band, as its estimate calls it');
  lacks(prepBand.toLowerCase(), 'midpoint', '…never the "midpoint", which a prep engagement does not have');
  has(await dashText(), 'Second payment', 'the rail\'s row reads Second payment too');

  // ── Overflow, both widths ────────────────────────────────────────────────────────────────
  await openDash(7391);
  eq(await overflow(), 0, 'no horizontal overflow on the dashboard at 1440');
  await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(300);
  eq(await overflow(), 0, 'no horizontal overflow on the dashboard at 390');
  await p.evaluate(() => openJobPlanFor(7391)); await p.waitForTimeout(400);
  eq(await overflow(), 0, 'no horizontal overflow on the Job Plan at 390');
  eq(errs, [], 'no page errors');
  console.log(`\nstep39: ${pass} passed, ${fail} failed`);
  if (errs.length) console.log('page errors:', errs);
  await b.close();
  process.exit(fail || errs.length ? 1 : 0);
})().catch(async (e) => { console.log('CRASH', e.stack); try { await b.close(); } catch (x) {} process.exit(1); });
