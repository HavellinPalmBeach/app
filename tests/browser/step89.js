// Step 89 — the hours fold is named for the crew it holds (2026-10-19). Anthony, from the first scripted run, with a
// screenshot of the HOURS & DAILY CLOSE bar: "this should be called 'Job Crew, Hours & Daily Close' … we couldn't find
// where to log the crew." The Job Team & Hours roster and Save & Confirm Job Team sit inside that fold, which is shut
// until somebody opens it, so a bar named for the hours alone said nothing about them.
//
// Drives the REAL page: a won Home Transition with an approved estimate, the Job Plan from the nav, the two fold bars as
// drawn, the gate chip's fix sentence under the chips, the bar pressed with the mouse, the roster and the confirm button
// visible once it is open (checkVisibility: a fold body is display:none while shut), overflow at 1440 and 390 with the
// fold open, zero page errors.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step89.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ' in ' + JSON.stringify(String(t).slice(0, 300)) + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');
const JOB = 8901;
const BAR = '.plan-fold .sec-hdr[onclick="togglePhase(\'hours\')"]';
const CONFIRM = '#log-team-rows button[onclick="confirmJobTeam(' + JOB + ')"]';   // a DOM selector: checkVisibility runs in the page

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    p.on('dialog', async (d) => { await d.accept(); });
    await p.goto(APP); await p.waitForTimeout(1500);
    const overflow = () => p.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
    const txt = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.textContent.replace(/\s+/g, ' ').trim() : null; }, sel);
    const visible = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return !!(el && el.checkVisibility && el.checkVisibility()); }, sel);

    // A won Home Transition with an approved estimate, the deposit in: the plan renders and the team waits to be confirmed.
    await p.evaluate((id) => {
      window._todayStr = function () { return '2026-10-19'; };
      const job = { id: id, hvlId: 'HVL-2610-CREW', name: 'Martha ZZ Whitcomb', fname: 'Martha', lname: 'Whitcomb', sqft: '3400', svc: 'downsizing_move',
        addr: '210 Seaspray Ave', city: 'Palm Beach', email: 'martha@example.com', phone: '(561) 555-0189',
        start: '2026-10-26', walkthrough: '2026-10-12', created: '2026-10-10', status: 'won', won: true, wonAt: '2026-10-15',
        tc: 'Ashley Jerome', approved: true, agrApproved: true, agrSent: true, agrSigned: true,
        depositReceived: true, depositReceivedAt: '2026-10-16', destAddr: '400 S Ocean Blvd', destCity: 'Palm Beach', destSqft: '2200',
        payments: [{ id: 1, uid: 'p1', stage: 'deposit', amount: 9738, date: '2026-10-16', method: 'wire', clearedOn: '2026-10-16' }],
        docState: { 'invoice:deposit': { sentAt: '2026-10-15T15:00:00Z' } } };
      jobs.unshift(job);
      const est = { jobId: id, svc: 'downsizing_move', preparedBy: 'Anthony Graziano', days: 6, totTC: 60, totPS: 70, havellinTotal: 19476, psCount: 2,
        psSlots: [{ slot: 1, type: 'contractor_standard', costRate: 30, label: 'contractor_standard' },
                  { slot: 2, type: 'contractor_standard', costRate: 30, label: 'contractor_standard' }],
        rooms: [{ idx: 1, name: 'Kitchen', section: 'Kitchen & Utility', vol: 3, cplx: 3, tcH: 10, psH: 20 },
                { idx: 2, name: 'Primary Suite', section: 'Second Floor', vol: 3, cplx: 3, tcH: 10, psH: 20 }],
        vendors: [{ type: 'Moving Company', cost: 6000, lid: 'v3' }], collections: [], prepItems: [] };
      estimateStore[id] = { estimate: est, approved: true, submitted: true, approvedBy: 'Anthony Graziano', savedAt: Date.now() };
      saveJobs();
    }, JOB);

    console.log('\n## the Job Plan from the nav');
    await p.evaluate((id) => { showPanel('jobs', document.querySelector('.nb[onclick*="\'jobs\'"]')); openClientDashboard(id); }, JOB);
    await p.waitForTimeout(300);
    await p.click('.nb:has-text("Job Plan")'); await p.waitForTimeout(600);
    eq(await p.evaluate(() => (document.getElementById('plan-job') || {}).value), String(JOB), 'the plan is on this client');

    console.log('\n## the two fold bars, as drawn');
    const bars = await p.evaluate(() => Array.from(document.querySelectorAll('.plan-fold .sec-hdr')).map((el) => el.textContent.replace(/\s+/g, ' ').trim()));
    eq(bars.length, 2, 'two tools fold above the job');
    has(bars[0], 'Vendors & partners', 'the first is Vendors & partners');
    has(bars[1], 'Job crew, hours & daily close', '⚠⚠ the second is named for the crew first — it read "Hours & daily close" and nobody found the team');
    lacks(bars[1], 'Hours & daily close', '…and not the old title (the whole bar text)');
    // textContent, not innerText: the bar's capitals are the stylesheet's, and the same rule dresses both folds.
    const dress = await p.evaluate((s) => { const el = document.querySelector(s); return el ? getComputedStyle(el).textTransform : null; }, BAR);
    eq(dress, 'uppercase', 'the bar wears the stylesheet\'s capitals, as the Vendors bar does (the screen reads JOB CREW, HOURS & DAILY CLOSE)');
    eq(await p.evaluate(() => (document.getElementById('phase-body-hours') || { style: {} }).style.display), 'none', 'the fold starts shut');
    eq(await visible(CONFIRM), false, '…so Save & Confirm Job Team is not on screen yet');

    console.log('\n## the gate chip sends people to the fold by its title');
    const fixes = await txt('#plan-gates-' + JOB + ' .gate-fixes');
    has(fixes, 'Job team confirmed: not yet', 'the team is not confirmed');
    has(fixes, 'press Save & Confirm Job Team under Job crew, hours & daily close, below', '⚠⚠ the fix names the fold as the bar reads');
    lacks(fixes, 'under Hours & daily close', '…never the old name, which no bar carries');

    console.log('\n## press the bar: the roster and the confirm button are inside');
    await p.click(BAR); await p.waitForTimeout(300);
    eq(await p.evaluate(() => (document.getElementById('phase-body-hours') || { style: {} }).style.display) !== 'none', true, 'the fold opened');
    eq(await visible('#log-m0-name'), true, 'the concierge row is on screen');
    eq(await p.evaluate(() => { const s = document.getElementById('log-m0-name'); return s && s.options[s.selectedIndex] ? s.options[s.selectedIndex].text : null; }), 'Ashley Jerome', '…holding the intake concierge');
    eq(await visible('#log-m1-name'), true, 'and the first specialist row');
    eq(await visible(CONFIRM), true, '⚠⚠ Save & Confirm Job Team is on screen — this is where the crew is logged');

    console.log('\n## overflow and errors');
    eq(await overflow(), 0, 'no horizontal overflow at 1440 with the fold open');
    await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(400);
    eq(await overflow(), 0, 'no horizontal overflow at 390 with the fold open');
    has(await txt(BAR), 'Job crew, hours & daily close', 'the bar reads the same on a phone');
    await p.setViewportSize({ width: 1440, height: 1000 }); await p.waitForTimeout(200);
    eq(errs, [], 'zero page errors');
  } catch (e) {
    fail++; console.log('  ✗ threw: ' + String(e && e.stack || e));
  } finally {
    if (b) await b.close();
    console.log('\n' + pass + ' passed, ' + fail + ' failed');
  }
})();
