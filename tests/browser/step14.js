// THE MARK-LOST ✕ SURVIVED THE JOB (2026-09-22). Anthony, off the client list:
//
//   "after we won the client and have completed the job, the 'x' at the end of the client
//    record in client dashboard should be deactivated b/c this is the lost button, which is
//    rightly there during the course of the job b/c the client could cancel mid-job, but
//    once the final invoice is paid, it should not be there."
//
// ⚠ ONLY THE BROWSER PROVES THIS. `jobIsSettled` returning true and a person not being able
//   to press ✕ are two claims, and the gap between them is where this kind of defect lives —
//   a source check cannot tell a rendered control from a withheld one.
// ⚠ It drives the REAL renderJobs against seeded jobs and reads the real DOM back, then
//   presses the real button and calls the real handler on a settled job.
// ⚠ The viewport option is `viewport`, NOT `viewportSize`.
const { chromium } = require('playwright');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL ' + m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b),
  m + '  (got ' + JSON.stringify(a) + ', want ' + JSON.stringify(b) + ')');
const APP = process.env.APP || 'file:///home/user/app/havellin.html';

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  const dlg = []; p.on('dialog', async d => { dlg.push(d.message()); await d.dismiss(); });
  await p.goto(APP); await p.waitForTimeout(1500);

  // Five jobs across the lifecycle, seeded into the live array and rendered by the real
  // renderer. Two are settled; three are not.
  const seeded = await p.evaluate(() => {
    jobs.length = 0;
    jobs.push(
      { id: 901, name: 'A Live Estate',   svc: 'cleanout', status: 'active', won: true,
        havellinEst: 19940, depositReceived: true,
        payments: [{ stage: 'deposit', amount: 9970 }] },
      { id: 902, name: 'B Midway',        svc: 'probate',  status: 'active', won: true,
        havellinEst: 31000, depositReceived: true,
        payments: [{ stage: 'deposit', amount: 15500 }, { stage: 'midpoint', amount: 7750 }] },
      { id: 903, name: 'C Delivered',     svc: 'cleanout', status: 'closed', won: true,
        havellinEst: 19940, depositReceived: true, deliveredOn: '2026-09-20',
        payments: [{ stage: 'deposit', amount: 9970 }, { stage: 'midpoint', amount: 4985 }] },
      { id: 904, name: 'D Final Paid',    svc: 'downsizing', status: 'active', won: true,
        havellinEst: 12050, depositReceived: true,
        payments: [{ stage: 'deposit', amount: 6025 }, { stage: 'final', amount: 3012 }] },
      { id: 905, name: 'E Not Started',   svc: 'prep',     status: 'new', won: false,
        havellinEst: 13500 }
    );
    currentFilter = 'all';
    showPanel('jobs', document.querySelector('.nb'));
    renderJobs();
    const body = document.getElementById('jobs-body');
    const ids = Array.from(body.querySelectorAll('button[onclick*="openCloseoutModal("]'))
      .map(el => Number(/openCloseoutModal\((\d+)\)/.exec(el.getAttribute('onclick'))[1]))
      .sort((x, y) => x - y);
    const names = Array.from(body.querySelectorAll('tr'))
      .map(r => r.textContent).filter(t => /A Live|B Midway|C Delivered|D Final|E Not Started/.test(t)).length;
    return {
      ids,
      listed: names,
      opens: body.querySelectorAll('button[onclick*="openClientDashboard("]').length,
      settled: [901, 902, 903, 904, 905].map(id => jobIsSettled(jobs.find(j => j.id === id))),
      disabledMarks: body.querySelectorAll('button[disabled]').length,
    };
  });

  eq(seeded.settled, [false, false, true, true, false], 'jobIsSettled across the five jobs');
  eq(seeded.ids, [901, 902, 905], '✕ renders on the three unsettled jobs and no others');
  ok(seeded.ids.indexOf(903) < 0, 'the delivered job has NO close-out button');
  ok(seeded.ids.indexOf(904) < 0, 'the final-paid job has NO close-out button');
  eq(seeded.listed, 5, 'all five are still listed — the row is withheld, not the job');
  eq(seeded.opens, 5, 'and every row still has Open → , so nothing else moved');
  eq(seeded.disabledMarks, 0, 'hidden rather than disabled — no dead control on screen');

  // The live one really opens.
  const opened = await p.evaluate(() => {
    document.querySelector('#jobs-body button[onclick*="openCloseoutModal(901)"]').click();
    return { shown: document.getElementById('closeout-modal').style.display, bound: closeoutJobId };
  });
  eq(opened.shown, 'flex', 'pressing ✕ on a live job opens the close-out modal');
  eq(opened.bound, 901, 'and binds that job');
  await p.evaluate(() => closeCloseoutModal());

  // ⚠ THE HANDLER GATE. The button is withheld, so this is the only way in — which is why
  // the refusal has to exist: the rail carries its own `Mark lost` secondary and anything
  // added later would be a third door.
  dlg.length = 0;
  const refused = await p.evaluate(() => {
    closeoutJobId = 0;
    openCloseoutModal(903);
    return { shown: document.getElementById('closeout-modal').style.display, bound: closeoutJobId };
  });
  await p.waitForTimeout(200);
  ok(refused.shown !== 'flex', 'reaching the handler directly on a delivered job does not open it');
  eq(refused.bound, 0, 'and binds nothing, so a stray Confirm cannot land on it');
  eq(dlg.length, 1, 'it refuses out loud');
  ok(/cannot be marked lost/.test(dlg[0] || ''), 'the refusal says what it will not do');
  ok(/delivered/.test(dlg[0] || ''), 'and why');
  ok(/collections/.test(dlg[0] || ''), 'and names what an outstanding final actually is');
  ok(!/final payment is recorded/.test(dlg[0] || ''),
    'a delivered job with no final payment is not told one was recorded');

  dlg.length = 0;
  await p.evaluate(() => { closeoutJobId = 0; openCloseoutModal(904); });
  await p.waitForTimeout(200);
  eq(dlg.length, 1, 'the final-paid job refuses too');
  ok(/final payment is recorded/.test(dlg[0] || ''), 'and its wording names the payment');

  // ⚠ THE JOB IS UNTOUCHED BY THE REFUSAL. A gate that half-wrote would be worse than none.
  const intact = await p.evaluate(() => {
    const j = jobs.find(x => x.id === 903);
    return { status: j.status, won: j.won, lostReason: j.lostReason || '', lostAt: j.lostAt || '' };
  });
  eq(intact, { status: 'closed', won: true, lostReason: '', lostAt: '' },
    'the delivered job is unchanged after the refusal');

  // ⚠ A LOST JOB KEEPS THE CONTROL, so its reason stays amendable — and it lives under the
  // Lost filter, because every other filter predicate ends `j.status !== 'lost'`.
  const lostView = await p.evaluate(() => {
    jobs.push({ id: 906, name: 'F Lost', svc: 'prep', status: 'lost', won: false,
      lostReason: 'price', lostReasonLabel: 'Price / estimate too high', lostEst: 8400,
      lostAt: '2026-07-20T12:00:00Z' });
    currentFilter = 'all'; renderJobs();
    const inAll = /F Lost/.test(document.getElementById('jobs-body').textContent);
    currentFilter = 'lost'; renderJobs();
    const body = document.getElementById('jobs-body');
    return { inAll, inLost: /F Lost/.test(body.textContent),
      btn: !!body.querySelector('button[onclick*="openCloseoutModal(906)"]') };
  });
  eq(lostView.inAll, false, 'a lost job is not in the default client list');
  eq(lostView.inLost, true, 'the Lost filter is where it lives');
  eq(lostView.btn, true, 'and it keeps ✕ there, so the reason can be amended');

  // Layout, both widths.
  await p.evaluate(() => { currentFilter = 'all'; renderJobs(); });
  const w1440 = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  await p.setViewportSize({ width: 390, height: 844 });
  await p.waitForTimeout(300);
  const w390 = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok(w1440 <= 0, 'no horizontal overflow at 1440  (' + w1440 + ')');
  ok(w390 <= 0, 'no horizontal overflow at 390  (' + w390 + ')');

  eq(errs.length, 0, 'no page errors  ' + JSON.stringify(errs.slice(0, 3)));

  await b.close();
  console.log('step14: ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
