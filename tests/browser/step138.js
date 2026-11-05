// Step 138 — the job's day count is the days the hours log holds hours on (2026-11-05).
//
// Anthony, off test clients reading "day 14 of 9" in red: "we weren't in the house for 3 days because something came
// up … I'm logging my 3rd day of work, not my 13th." The strip counted working days since activation; it now counts the
// days with hours logged, and the halfway and the planned end are counted forward from today by the days still to work.
//
// This drives the REAL page: the estimate is built by the real Build Estimate screen (the real room toggles, the real
// calcAll), the job is activated two and a half weeks before today with three days of hours on the log, and the reading
// is taken off the real Job Plan header and Client Dashboard strips. ⚠ Today is PINNED.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step138.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL ' + m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + ' (got ' + JSON.stringify(a) + ')');
const has = (s, n, m) => ok(String(s).indexOf(n) >= 0, m + ' (in ' + JSON.stringify(String(s).slice(0, 500)) + ')');
const lacks = (s, n, m) => ok(String(s).indexOf(n) < 0, m + ' (found ' + JSON.stringify(n) + ')');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  p.on('dialog', async (d) => { await d.accept(); });
  try {
    await p.goto(APP); await p.waitForTimeout(1500);
    const overflow = () => p.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));

    await p.evaluate(() => {
      window._todayStr = function () { return '2026-10-21'; };   // a Wednesday, thirteen working days after the start
      jobs.unshift({ id: 7138, hvlId: 'HVL-2610-DAYS', name: 'Rhea Calder', fname: 'Rhea', lname: 'Calder', sqft: '2400',
        svc: 'downsizing', addr: '12 Sunrise Ave', city: 'Palm Beach', email: 'rhea@example.com', phone: '(561) 555-0138',
        beds: '3', baths: '2', propVal: '1500000', start: '2026-10-05', walkthrough: '2026-09-28', created: '2026-09-25',
        status: 'won', won: true, wonAt: '2026-09-30', tc: 'Ashley Jerome' });
      saveJobs();
    });

    // The estimate, the way a concierge builds one: the real screen and the real room ticks.
    await p.evaluate(() => openEstimateScreen(7138));
    await p.waitForTimeout(800);
    const want = ['Living Room', 'Kitchen', 'Primary Suite', 'Bedroom 2'];
    const ids = await p.evaluate((names) => {
      const out = []; const used = new Set(); let ri = 0;
      ROOMS.forEach((sec) => sec.rooms.forEach((r) => {
        const id = 'r' + ri; ri++;
        const i = names.findIndex((n, k) => n === r.name && !used.has(k));
        if (i >= 0) { used.add(i); out.push(id); }
      }));
      return out;
    }, want);
    eq(ids.length, 4, 'four rooms of the house are on the grid');
    const shut = await p.evaluate(() => Array.from(document.querySelectorAll('[id^="sec-body-"]'))
      .filter((el) => el.style.display === 'none').map((el) => el.id.replace('sec-body-', '')));
    for (const si of shut) await p.click(`.sec-hdr.sec-toggle[onclick="toggleRoomSection(${si})"]`);
    for (const id of ids) await p.click('#chk-' + id);
    await p.waitForTimeout(600);
    const est = await p.evaluate(() => JSON.parse(JSON.stringify(currentEstimate)));
    ok(est && est.rooms && est.rooms.filter((r) => !r.excluded).length === 4, 'the real calcAll priced four rooms');

    // Approved at four days; activated on the 5th; worked the 5th, the 6th and today. The family kept the crew out for
    // two weeks in between.
    await p.evaluate((e) => {
      e.days = 4;
      estimateStore[7138] = { estimate: e, approved: true, submitted: true, approvedBy: 'Anthony Graziano', savedAt: Date.now() };
      const j = jobs.find((x) => x.id === 7138);
      Object.assign(j, { status: 'active', activatedOn: '2026-10-05', approved: true, agrApproved: true, agrSent: true, agrSigned: true,
        depositReceived: true, payments: [{ id: 1, uid: 'p1', stage: 'deposit', amount: 5000, date: '2026-10-01', method: 'wire', clearedOn: '2026-10-01' }] });
      const day = (id, date) => ({ id, date, activity: 'Sorting', members: [{ name: 'Ashley Jerome', role: 'TC', hours: 3 }, { name: 'Crew', role: 'PS', hours: 3 }] });
      jobLogs[7138] = [day(1, '2026-10-05'), day(2, '2026-10-06'), day(3, '2026-10-21')];
      saveJobs();
    }, est);

    const strip = async (sel) => p.evaluate((s) => ((document.querySelector(s) || {}).textContent || '').replace(/\s+/g, ' ').trim(), sel);
    await p.evaluate(() => openJobPlanFor(7138));
    await p.waitForTimeout(900);
    const plan = await strip('#plan-sched');
    has(plan, 'Started Oct 5, 2026', 'the Job Plan strip reads the recorded start');
    has(plan, 'Day 3 of 4 worked', '⚠⚠ three days with hours logged: day 3 of 4, not working day 13');
    has(plan, '1 day of work to go', '…one day of work left');
    lacks(plan, 'past the proposed length', '⚠⚠ nothing reads as an overrun for the days nobody worked');
    lacks(plan, 'Working day', '…and the old calendar count is gone');
    has(plan, 'Planned end Oct 22, 2026', '…the planned end is the next working day, today’s hours being in');
    has(plan, 'Halfway Oct 6, 2026', '…and the halfway is the day the second day was worked');
    const red = await p.evaluate(() => !!document.querySelector('#plan-sched .jt-s-err'));
    ok(!red, '⚠ no red line on the strip');

    // A day with no hours moves only the dates still ahead: tomorrow, with nothing logged, is still day 3.
    await p.evaluate(() => { window._todayStr = function () { return '2026-10-22'; }; openJobPlanFor(7138); });
    await p.waitForTimeout(900);
    const next = await strip('#plan-sched');
    has(next, 'Day 3 of 4 worked', 'the next morning, before its hours are in, it is still day 3');
    has(next, 'Planned end Oct 22, 2026', '…and today can still be the last day');

    await p.evaluate(() => openClientDashboard(7138));
    await p.waitForTimeout(800);
    const dash = await strip('#client-dashboard-view .jt-sched');
    has(dash, 'Day 3 of 4 worked', 'the Client Dashboard strip reads the same');
    eq(await overflow(), 0, 'no horizontal overflow at 1440');

    await p.setViewportSize({ width: 390, height: 844 });
    await p.evaluate(() => openJobPlanFor(7138));
    await p.waitForTimeout(700);
    eq(await overflow(), 0, 'no horizontal overflow on the Job Plan at 390');
    eq(errs, [], 'no page errors');
  } catch (e) {
    fail++; console.log('  CRASH ' + (e && e.stack));
  } finally {
    await b.close();
  }
  console.log(`step138: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
