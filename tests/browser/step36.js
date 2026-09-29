// Step 36 — work done is measured against the rooms (2026-09-29, workflow audit H5 / fix pack P8).
//
// "Work done" divided the room hours earned by the estimate's whole total, which also carries the
// concierge's off-site coordination, move day and the round-up to whole billable hours — none of it
// on any room. So a job with every room cleared read 56–74% done, and a cleanout finished on day 3 of
// its plan told the crew it would run late. Anthony, Q3: "room work only — logged hours already show
// the rest."
//
// This drives the REAL page: the estimate is built by the real Build Estimate screen (the real room
// toggles, the real calcAll), the rooms are cleared through the real room workspace buttons for the
// last room, and the reading is taken off the real Job Plan header and Client Dashboard strips.
// ⚠ Today is PINNED so the working days mean the same thing on every re-run.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step36.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL ' + m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + ' (got ' + JSON.stringify(a) + ')');
const has = (s, n, m) => ok(String(s).indexOf(n) >= 0, m + ' (in ' + JSON.stringify(String(s).slice(0, 400)) + ')');
const lacks = (s, n, m) => ok(String(s).indexOf(n) < 0, m + ' (found ' + JSON.stringify(n) + ')');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));

const HOUSE = ['Entryway / Foyer', 'Living Room', 'Dining Room', 'Family Room / Great Room', 'Half Bath',
  'Kitchen', 'Laundry Room', 'Mudroom / Utility Entry', 'Office 1', 'Library',
  'Primary Suite', 'Primary Bath', 'Walk-in Closet', 'Bedroom 2', 'Bathroom 2', 'Bedroom 3', 'Bathroom 3', 'Bedroom 4',
  'Garage (2-car)', 'Storage Room / Oversized Closets', 'Furnished Patio', 'Screened Porch'];

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  p.on('dialog', async (d) => { await d.accept(); });
  await p.goto(APP); await p.waitForTimeout(1500);
  const overflow = () => p.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));

  await p.evaluate(() => {
    window._todayStr = function () { return '2026-09-23'; };   // Wednesday: working day 3 of a job started Monday
    jobs.unshift({ id: 7101, hvlId: 'HVL-2609-WORK', name: 'Tripp Butler', fname: 'Tripp', lname: 'Butler', sqft: '3500',
      svc: 'home_cleanout', addr: '69 Beach Blvd', city: 'Palm Beach', email: 'tripp@example.com', phone: '(561) 555-0101',
      beds: '4', baths: '3', halfBaths: '1', propVal: '1500000', start: '2026-09-21', walkthrough: '2026-09-15', created: '2026-09-10',
      status: 'won', won: true, wonAt: '2026-09-17', tc: 'Ashley Jerome' });
    saveJobs();
  });

  // ── Build the estimate the way a concierge does: open the screen, tick the rooms. ─────────────
  await p.evaluate(() => openEstimateScreen(7101));
  await p.waitForTimeout(800);
  const ids = await p.evaluate((names) => {
    const out = []; const used = new Set(); let ri = 0;
    ROOMS.forEach((sec) => sec.rooms.forEach((r) => {
      const id = 'r' + ri; ri++;
      const i = names.findIndex((n, k) => n === r.name && !used.has(k));
      if (i >= 0) { used.add(i); out.push(id); }
    }));
    return out;
  }, HOUSE);
  eq(ids.length, 22, 'all 22 rooms of the house are on the grid');
  // The room sections open collapsed; open each one the way a person does, by its header.
  const shut = await p.evaluate(() => Array.from(document.querySelectorAll('[id^="sec-body-"]'))
    .filter((el) => el.style.display === 'none').map((el) => el.id.replace('sec-body-', '')));
  for (const si of shut) await p.click(`.sec-hdr.sec-toggle[onclick="toggleRoomSection(${si})"]`);
  for (const id of ids) await p.click('#chk-' + id);
  await p.waitForTimeout(600);
  const est = await p.evaluate(() => JSON.parse(JSON.stringify(currentEstimate)));
  eq(est && est.rooms && est.rooms.filter((r) => !r.excluded).length, 22, 'the real calcAll priced 22 rooms');
  const roomHrs = est.rooms.reduce((s, r) => s + r.tcH + r.psH, 0);
  ok(roomHrs < est.totTC + est.totPS, `the premise, on the page: the rooms carry ${roomHrs.toFixed(1)} of ${est.totTC + est.totPS} estimated hours`);
  const oldPct = Math.round(100 * roomHrs / (est.totTC + est.totPS));

  // File it as the approved estimate, start the job Monday, log two crew-days of hours.
  await p.evaluate((e) => {
    // The audit's case exactly: a FOUR-day plan with every room cleared on day 3 (the engine planned 5 here).
    e.days = 4;
    estimateStore[7101] = { estimate: e, approved: true, submitted: true, approvedBy: 'Anthony Graziano', savedAt: Date.now() };
    const j = jobs.find((x) => x.id === 7101);
    Object.assign(j, { status: 'active', activatedOn: '2026-09-21', approved: true, agrApproved: true, agrSent: true, agrSigned: true,
      depositReceived: true, payments: [{ id: 1, uid: 'p1', stage: 'deposit', amount: 5000, date: '2026-09-18', method: 'wire', clearedOn: '2026-09-18' }] });
    jobLogs[7101] = [
      { id: 1, date: '2026-09-21', activity: 'Day 1', members: [{ name: 'Ashley Jerome', role: 'TC', hours: 8 }, { name: 'Crew', role: 'PS', hours: 16 }] },
      { id: 2, date: '2026-09-22', activity: 'Day 2', members: [{ name: 'Ashley Jerome', role: 'TC', hours: 8 }, { name: 'Crew', role: 'PS', hours: 16 }] }];
    saveJobs();
  }, est);

  // Every room but the last is locked and cleared by its handler; the last goes through the real workspace buttons.
  const idxs = est.rooms.filter((r) => !r.excluded).map((r) => r.idx);
  await p.evaluate((xs) => { xs.slice(0, -1).forEach((i) => { setPlanRoomStatus(7101, i, 'locked'); setPlanRoomStatus(7101, i, 'cleared'); }); }, idxs);
  await p.evaluate(() => openJobPlanFor(7101));
  await p.waitForTimeout(800);
  const last = idxs[idxs.length - 1];
  const before = await p.evaluate(() => (document.getElementById('plan-sched') || {}).textContent || '');
  ok(!/100% of the work done/.test(before), 'with one room still pending the strip is short of 100%');
  await p.evaluate((i) => openRoomWorkspace(7101, i), last);
  await p.waitForTimeout(300);
  await p.click('#plan-room-status-' + last + ' button:first-child');   // Lock
  await p.waitForTimeout(200);
  await p.click('#plan-room-status-' + last + ' button:nth-child(2)');  // Cleared
  await p.waitForTimeout(200);
  eq(await p.evaluate((i) => roomStatusNormalize(getJobPlan(7101).rooms[i] && getJobPlan(7101).rooms[i].status), last), 'cleared',
     'the last room was cleared through the real Lock and Cleared buttons');
  await p.evaluate(() => closeRoomWorkspace());
  await p.waitForTimeout(400);

  const plan = await p.evaluate(() => (document.getElementById('plan-sched') || {}).textContent.replace(/\s+/g, ' ').trim());
  has(plan, '100% of the work done', 'the Job Plan header reads 100% of the work done');
  lacks(plan, 'past the planned end', 'and does not say the job will run past its planned end');
  lacks(plan, `${oldPct}% of the work done`, `where the old basis read ${oldPct}%`);
  has(plan, 'Working day 3', 'it is working day 3');

  await p.evaluate(() => openClientDashboard(7101));
  await p.waitForTimeout(800);
  const dash = await p.evaluate(() => {
    const el = document.querySelector('#client-dashboard-view .jt-sched') || document.getElementById('client-dashboard-view');
    return (el ? el.textContent : '').replace(/\s+/g, ' ');
  });
  has(dash, '100% of the work done', 'the Client Dashboard strip reads 100% too');
  lacks(dash, 'past the planned end', '…and raises no pace flag');
  eq(await overflow(), 0, 'no horizontal overflow at 1440');

  await p.setViewportSize({ width: 390, height: 844 });
  await p.evaluate(() => openJobPlanFor(7101));
  await p.waitForTimeout(600);
  eq(await overflow(), 0, 'no horizontal overflow on the Job Plan at 390');

  eq(errs, [], 'no page errors');
  await b.close();
  console.log(`step36: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log('step36 CRASH ' + e.stack); process.exit(1); });
