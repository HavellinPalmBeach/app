// Step 20 — seven reports off one dummy client's Job Plan (2026-09-23). Anthony, off Robert & Jean
// ZZ Ellsworth (Home Transition):
//
//   "the activate job button on the client dashboard should take you to the job plan … document
//    shredding gets lumped into end of job logistics automatically … if it changes, the dates on
//    the top of the job plan need to update and you need to do away with the old ones like the
//    target start date and target midpoint … I was assigned to do the walkthrough, but Ashley was
//    assigned as the transition concierge at client intake … on the job plan, I was listed as the
//    default … we were able to lock in a team where both property specialists were Anthony Jr …
//    we'd also like an indicator for … locking in the job team … the next stage is midpoint
//    invoice sent … makes it seem like we've already done that."
//
// Every one was reproduced in this browser on the old build before anything was built. This drives
// the REAL page: the real client dashboard, the real Activate button (and its question), the real
// nav, the real Edit Client save, the real team selects and confirm button, the real add-a-vendor
// menu, and "+ Log Hours Today". ⚠ Today is PINNED (the app's one wall-clock read, `_todayStr`), so
// the dates below mean the same thing on every day this is re-run.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step20.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL ' + m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + ' (got ' + JSON.stringify(a) + ')');
const has = (s, n, m) => ok(String(s).indexOf(n) >= 0, m + ' (in ' + JSON.stringify(String(s).slice(0, 400)) + ')');
const lacks = (s, n, m) => ok(String(s).indexOf(n) < 0, m + ' (found ' + JSON.stringify(n) + ')');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  let answer = true; const dialogs = [];
  p.on('dialog', async (d) => { dialogs.push(d.message()); if (answer) await d.accept(); else await d.dismiss(); });
  await p.goto(APP); await p.waitForTimeout(1500);
  const overflow = () => p.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));

  await p.evaluate(() => {
    window._todayStr = function () { return '2026-09-23'; };
    const job = { id: 7001, hvlId: 'HVL-2609-TZAK', name: 'Robert & Jean ZZ Ellsworth', fname: 'Robert', lname: 'Ellsworth', sqft: '3200', svc: 'downsizing_move',
      addr: '1180 S Ocean Blvd', city: 'Manalapan', email: 'robert@example.com', phone: '(561) 555-0100',
      start: '2026-10-05', walkthrough: '2026-09-20', created: '2026-09-18', status: 'won', won: true, wonAt: '2026-09-21',
      tc: 'Ashley Jerome', approved: true, estimateSentDate: 'Sep 21, 2026', agrApproved: true, agrSent: true, agrSigned: true,
      depositReceived: true, depositReceivedAt: '2026-09-22', destAddr: '880 Lake Drive', destCity: 'Delray Beach', destSqft: '2500',   // a string, as the intake form stores it
      payments: [{ id: 1, uid: 'p1', stage: 'deposit', amount: 9738, date: '2026-09-22', method: 'wire', clearedOn: '2026-09-22' }],
      docState: { 'invoice:deposit': { sentAt: '2026-09-21T15:00:00Z' } } };
    jobs.unshift(job);
    // Anthony walked the house (preparedBy); Ashley was assigned at intake (job.tc).
    const est = { jobId: 7001, svc: 'downsizing_move', preparedBy: 'Anthony Graziano', days: 6, totTC: 60, totPS: 70,
      havellinTotal: 19476, psCount: 2,
      psSlots: [{ slot: 1, type: 'contractor_standard', costRate: 30, label: 'contractor_standard' },
                { slot: 2, type: 'contractor_standard', costRate: 30, label: 'contractor_standard' }],
      rooms: [{ idx: 1, name: 'Kitchen', section: 'Kitchen & Utility', vol: 3, cplx: 3, tcH: 10, psH: 20 },
              { idx: 2, name: 'Primary Suite', section: 'Second Floor', vol: 3, cplx: 3, tcH: 10, psH: 20 }],
      // The estimate chose a hauler and a donation partner — so those two logistics categories are covered.
      vendors: [{ type: 'Junk Removal / Hauling', cost: 1500, lid: 'v1' }, { type: 'Donation Organization', cost: 0, lid: 'v2' },
                { type: 'Moving Company', cost: 6000, lid: 'v3' }],
      collections: [], prepItems: [] };
    estimateStore[7001] = { estimate: est, approved: true, submitted: true, approvedBy: 'Anthony Graziano', savedAt: Date.now() };
    saveJobs();
  });

  const planState = () => p.evaluate(() => {
    const txt = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : null);
    const vs = document.getElementById('vendor-sourcing-7001');
    const add = vs ? vs.querySelector('select[onchange^="addLogisticsLine"]') : null;
    const tcSel = document.getElementById('log-m0-name');
    const job = jobs.find((j) => j.id === 7001);
    return {
      panel: (document.querySelector('.panel.active') || {}).id,
      planJob: (document.getElementById('plan-job') || {}).value,
      sched: txt(document.getElementById('plan-sched')),
      band: txt(document.querySelector('#jband-slot-plan .jt-next-step')),
      chips: Array.from(document.querySelectorAll('#plan-gates-7001 .gate-chip')).map((c) => ({ t: txt(c), ok: c.classList.contains('gate-ok') })),
      fixes: txt(document.querySelector('#plan-gates-7001 .gate-fixes')),
      logiRows: vs ? (vs.innerHTML.match(/setLogisticsVendor\(7001,'(\w+)'/g) || []) : null,
      logiBlock: vs ? /End-of-Job Logistics/.test(vs.textContent) : null,
      addOpts: add ? Array.from(add.options).map((o) => o.textContent) : null,
      vendorsMeta: txt(document.getElementById('stage-meta-vendors')),
      tcShown: tcSel && tcSel.selectedIndex >= 0 ? tcSel.options[tcSel.selectedIndex].text : null,
      crewTC: job && job.crew && job.crew.tc ? job.crew.tc.name : null,
    };
  });

  console.log('\n=== THE DASHBOARD, BEFORE ACTIVATION ===');
  await p.evaluate(() => { showPanel('jobs', document.querySelector('.nb[onclick*="\'jobs\'"]')); openClientDashboard(7001); });
  await p.waitForTimeout(300);
  const d0 = await p.evaluate(() => ({ step: (document.querySelector('#client-dashboard-view .jt-next-step') || {}).textContent,
    prim: ((document.querySelector('#client-dashboard-view .jt-btn-p') || {}).textContent || '').trim() }));
  eq(d0.step, 'Activate the job', '#7 the band says the STEP to take, in the imperative');
  has(d0.prim, 'Activate', 'the band’s one filled button is Activate');

  console.log('\n=== #1/#3 THE JOB PLAN FROM THE NAV, BEFORE ACTIVATION ===');
  await p.click('.nb:has-text("Job Plan")'); await p.waitForTimeout(500);
  const j0 = await planState();
  eq(j0.planJob, '7001', '⚠ opening a client and tapping Job Plan lands on THAT client (it landed on "Select a job")');
  has(j0.sched, 'Target start Oct 5, 2026', 'a job not yet started runs on its target start');
  has(j0.sched, 'Target end Oct 12, 2026', '…and its target end');
  eq(j0.band, 'Activate the job', 'the Job Plan band reads the step too');
  eq(j0.tcShown, 'Ashley Jerome', '⚠⚠ #4 the concierge select shows the INTAKE concierge');
  eq(j0.crewTC, 'Ashley Jerome', '⚠⚠ #4 …and the crew record holds the same name (it held the walkthrough person)');
  eq(j0.logiRows, [], '⚠⚠ #2 no end-of-job logistics row stands on the job — no Document Shredding waiting for a vendor');
  eq(j0.logiBlock, false, '…and no End-of-Job Logistics block at all');
  eq(j0.addOpts, ['+ Add an end-of-job vendor…', 'Dumpster Rental', 'Move-Out / Final Cleaning', 'Document Shredding'],
     '#2 the uncovered categories are OFFERED — junk and donation are already on the estimate, so not again');
  const teamChip0 = j0.chips.filter((c) => c.t.indexOf('Job team confirmed') >= 0)[0];
  ok(!!teamChip0, '⚠⚠ #6 a Job team chip sits on the row');
  ok(teamChip0 && !teamChip0.ok, '…red until the team is confirmed');
  has(j0.fixes, 'Save & Confirm Job Team', '…with the fix under the row');
  ok(j0.chips.some((c) => /Vendors lined up/.test(c.t)), 'beside Vendors lined up');

  console.log('\n=== #3 A TARGET START MOVED IN EDIT CLIENT MOVES THE PLAN’S DATES ===');
  await p.click('.nb:has-text("Client Dashboard")'); await p.waitForTimeout(300);
  await p.evaluate(() => { openClientDashboard(7001); showEditClient(7001); });
  await p.waitForTimeout(250);
  await p.fill('#ec-start', '2026-10-12');
  dialogs.length = 0;
  await p.evaluate(() => saveClientEdit(7001)); await p.waitForTimeout(300);
  // The save goes through; the one thing it says is the standing stale-document flag, because the
  // signed agreement states the old start — and it says it in a sentence now ("the signed agreement
  // state the old dates" until today).
  eq(dialogs.length, 1, 'the Edit Client save raises the stale-dates flag and nothing else');
  has(dialogs[0] || '', 'The signed agreement states the old dates', '…in a sentence that opens on a capital and agrees with itself');
  eq(await p.evaluate(() => jobs.find((x) => x.id === 7001).start), '2026-10-12', '…and the new target start is on the record');
  await p.click('.nb:has-text("Job Plan")'); await p.waitForTimeout(500);
  const jm = await planState();
  has(jm.sched, 'Target start Oct 12, 2026', '⚠⚠ walking back onto the tab shows the NEW target start');
  has(jm.sched, 'Target end Oct 19, 2026', '…and every date counted from it');
  lacks(jm.sched, 'Oct 5, 2026', '…with the old one gone');
  // Put it back to the reported state for the activation.
  await p.evaluate(() => { const j = jobs.find((x) => x.id === 7001); j.start = '2026-10-05'; saveJobs(); });

  console.log('\n=== #1/#3 ACTIVATE, AHEAD OF THE TARGET START ===');
  await p.click('.nb:has-text("Client Dashboard")'); await p.waitForTimeout(250);
  await p.evaluate(() => openClientDashboard(7001)); await p.waitForTimeout(250);
  answer = false; dialogs.length = 0;
  await p.click('#client-dashboard-view .jt-btn-p'); await p.waitForTimeout(400);
  const c1 = await p.evaluate(() => { const j = jobs.find((x) => x.id === 7001); return { status: j.status, act: j.activatedOn || '',
    panel: (document.querySelector('.panel.active') || {}).id }; });
  eq(dialogs.length, 1, '⚠⚠ activating twelve days ahead of the target start ASKS first');
  has(dialogs[0] || '', 'Oct 5, 2026', '…naming the target start');
  has(dialogs[0] || '', 'Sep 23, 2026', '…and today');
  has(dialogs[0] || '', 'cannot be changed afterwards', '…and why it asks');
  eq(c1, { status: 'won', act: '', panel: 'panel-jobs' }, 'Cancel activates nothing, stamps nothing, and stays put');

  answer = true; dialogs.length = 0;
  await p.click('#client-dashboard-view .jt-btn-p'); await p.waitForTimeout(700);
  const j1 = await planState();
  const act = await p.evaluate(() => { const j = jobs.find((x) => x.id === 7001); return { status: j.status, act: j.activatedOn,
    dash: document.getElementById('client-dashboard-view').style.display }; });
  eq(act.status, 'active', 'OK activates it');
  eq(act.act, '2026-09-23', '…stamped today');
  eq(j1.panel, 'panel-job-plan', '⚠⚠ #1 THE ACTIVATION LANDS ON THE JOB PLAN');
  eq(j1.planJob, '7001', '…on this client');
  has(j1.sched, 'Started Sep 23, 2026', '#3 the strip reads the start this press stamped');
  has(j1.sched, 'Working day 1 of 6', '…where the job is');
  has(j1.sched, '5 working days to go', '…what is left');
  has(j1.sched, 'Halfway Sep 25, 2026', '⚠⚠ …the halfway, counted from the REAL start');
  has(j1.sched, 'Planned end Sep 30, 2026', '⚠⚠ …and ONE end, counted from it');
  ['target was', 'now ending', 'Oct 5, 2026', 'Oct 7, 2026', 'Oct 12, 2026', 'Target end', 'Target start'].forEach((s) =>
    lacks(j1.sched, s, '⚠⚠ #3 "' + s + '" is gone from the strip'));
  eq(j1.band, 'Send the midpoint invoice', '⚠⚠ #7 NEXT reads "Send the midpoint invoice" — not "Midpoint invoice sent"');

  console.log('\n=== #5 ONE PERSON, ONE SLOT — and #6 the chip follows the team ===');
  // The team sits in the Hours & daily close fold — a tool, closed until somebody opens it.
  await p.evaluate(() => { const b = document.getElementById('phase-body-hours'); if (b && b.style.display === 'none') togglePhase('hours'); });
  await p.waitForTimeout(150);
  const s1 = await p.evaluate(() => {
    const sel1 = document.getElementById('log-m1-name');
    sel1.value = 'Anthony Graziano Jr'; sel1.dispatchEvent(new Event('change'));
    const opts2 = Array.from(document.getElementById('log-m2-name').options).map((o) => o.value);
    return { ps0: jobs.find((x) => x.id === 7001).crew.ps[0].name, slot2Offers: opts2.indexOf('Anthony Graziano Jr') >= 0 };
  });
  eq(s1.ps0, 'Anthony Graziano Jr', 'a specialist picked in slot 1 is taken');
  eq(s1.slot2Offers, false, '⚠ …and leaves slot 2’s list at once, without a redraw of the rows');
  const s2 = await p.evaluate(() => {
    // A stale list — a second device, or a select drawn a moment earlier — offering him anyway.
    const sel2 = document.getElementById('log-m2-name');
    const o = document.createElement('option'); o.value = 'Anthony Graziano Jr'; o.textContent = 'Anthony Graziano Jr'; sel2.appendChild(o);
    sel2.value = 'Anthony Graziano Jr'; sel2.dispatchEvent(new Event('change'));
    const fb = document.getElementById('log-fb');
    return { ps1: jobs.find((x) => x.id === 7001).crew.ps[1].name, shown: document.getElementById('log-m2-name').value,
             fb: fb ? fb.textContent : '' };
  });
  eq(s2.ps1, '', '⚠⚠ picking him into slot 2 as well is REFUSED — the record does not take it');
  eq(s2.shown, '', '…and the select goes back to what the record holds');
  has(s2.fb, 'already on this team as Property Specialist 1', '…with the reason on screen');
  await p.evaluate(() => { const s = document.getElementById('log-m2-name'); s.value = 'Contractor TBD'; s.dispatchEvent(new Event('change')); });
  dialogs.length = 0;
  await p.click('#log-team-rows button.btn-p:has-text("Save & Confirm Job Team")'); await p.waitForTimeout(400);
  const c2 = await p.evaluate(() => { const c = jobs.find((x) => x.id === 7001).crew; return { confirmed: c.confirmed, tc: c.tc.name, ps: c.ps.map((x) => x.name) }; });
  eq(c2, { confirmed: true, tc: 'Ashley Jerome', ps: ['Anthony Graziano Jr', 'Contractor TBD'] },
     'the team confirms with Ashley running it, AJ once and a TBD — the TBD question answered');
  const chips2 = await planState();
  const teamChip2 = chips2.chips.filter((c) => c.t.indexOf('Job team confirmed') >= 0)[0];
  ok(teamChip2 && teamChip2.ok, '⚠ #6 the chip turns GREEN on the confirm — no redraw of the plan needed');

  // A crew that already carries a duplicate (another device, or confirmed before the rule): the
  // chip goes red and the confirm refuses it.
  await p.evaluate(() => { reviseJobTeam(7001); const c = jobs.find((x) => x.id === 7001).crew; c.ps[1].name = 'Anthony Graziano Jr';
    c.ps[1].locked = false; saveJobs(); buildLogTeamRows(); _repaintPlanGates(7001); });
  await p.waitForTimeout(200);
  const dupState = await planState();
  const teamChip3 = dupState.chips.filter((c) => c.t.indexOf('Job team confirmed') >= 0)[0];
  ok(teamChip3 && !teamChip3.ok, '⚠⚠ a team carrying one person in two slots reads RED');
  has(dupState.fixes, 'Anthony Graziano Jr is in 2 slots', '…and says who');
  await p.evaluate(() => confirmJobTeam(7001)); await p.waitForTimeout(150);
  const c3 = await p.evaluate(() => ({ confirmed: jobs.find((x) => x.id === 7001).crew.confirmed, fb: document.getElementById('log-fb').textContent }));
  eq(c3.confirmed, false, '⚠⚠ the confirm REFUSES that team (it confirmed with both slots Anthony Jr on the old build)');
  has(c3.fb, 'is in 2 slots', '…and names it');
  await p.evaluate(() => { const c = jobs.find((x) => x.id === 7001).crew; c.ps[1].name = 'Contractor TBD'; saveJobs(); buildLogTeamRows(); confirmJobTeam(7001); });
  await p.waitForTimeout(200);

  console.log('\n=== #2 AN END-OF-JOB VENDOR IS ADDED ON THE JOB, AND COMES OFF ===');
  // The Vendors fold is a tool: open it, then use the real add menu.
  await p.evaluate(() => { const b = document.getElementById('phase-body-vendors'); if (b && b.style.display === 'none') togglePhase('vendors'); });
  await p.selectOption('#vendor-sourcing-7001 select[onchange^="addLogisticsLine"]', 'shred'); await p.waitForTimeout(250);
  const a1 = await planState();
  eq(a1.logiRows, ["setLogisticsVendor(7001,'shred'"], 'adding Document Shredding puts ONE line on the job');
  eq(a1.logiBlock, true, '…under End-of-Job Logistics');
  ok(a1.addOpts && a1.addOpts.indexOf('Document Shredding') < 0, '…and it leaves the add menu');
  has(a1.vendorsMeta, 'of 4 confirmed', '⚠ the Vendors fold count moves with it, in place');
  const vChip = a1.chips.filter((c) => /Vendors lined up/.test(c.t))[0];
  ok(vChip && !vChip.ok, '…and the Vendors chip counts the unconfirmed line');
  dialogs.length = 0;
  await p.click('#vendor-sourcing-7001 button:has-text("Remove")'); await p.waitForTimeout(250);
  const a2 = await planState();
  eq(a2.logiRows, [], 'Remove takes it off');
  eq(dialogs.length, 0, '…without a question — nothing was recorded on it');
  ok(a2.addOpts && a2.addOpts.indexOf('Document Shredding') >= 0, '…and it is offered again');

  console.log('\n=== #1 "+ Log Hours Today" LANDS ON THE HOURS, OPEN ===');
  await p.click('.nb:has-text("Client Dashboard")'); await p.waitForTimeout(250);
  await p.evaluate(() => openClientDashboard(7001)); await p.waitForTimeout(250);
  const dashBand = await p.evaluate(() => (document.querySelector('#client-dashboard-view .jt-next-step') || {}).textContent);
  eq(dashBand, 'Send the midpoint invoice', '#7 the dashboard band reads the step too');
  await p.click('#client-dashboard-view button:has-text("+ Log Hours Today")'); await p.waitForTimeout(600);
  const lh = await p.evaluate(() => ({ panel: (document.querySelector('.panel.active') || {}).id, job: document.getElementById('plan-job').value,
    hoursOpen: (document.getElementById('phase-body-hours') || { style: {} }).style.display !== 'none',
    logInSlot: !!document.querySelector('#plan-hours-slot #plan-log-section') }));
  eq(lh, { panel: 'panel-job-plan', job: '7001', hoursOpen: true, logInSlot: true },
     '⚠ it opens the Job Plan on this client WITH the hours fold open and the log in it');

  console.log('\n=== WIDTHS ===');
  eq(await overflow(), 0, 'no horizontal overflow on the Job Plan at 1440');
  await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(300);
  eq(await overflow(), 0, 'no horizontal overflow on the Job Plan at 390');
  await p.evaluate(() => { const b = document.getElementById('phase-body-vendors'); if (b && b.style.display === 'none') togglePhase('vendors'); });
  await p.waitForTimeout(150);
  eq(await overflow(), 0, '…nor with the Vendors fold and its add menu open');

  eq(errs.length, 0, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
  console.log('\nstep20: ' + pass + ' passed, ' + fail + ' failed, ' + errs.length + ' page errors');
  await b.close();
  process.exit(fail ? 1 : 0);
})();
