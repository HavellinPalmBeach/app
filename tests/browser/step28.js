// Step 28 — Close job and the midpoint (2026-09-29, workflow audit H3 and M8).
//
//   H3: "a finished job can't be closed, or sent its final invoice, until a midpoint payment is
//        recorded … With the midpoint invoice sent and unpaid, the band reads 'Collect the midpoint
//        payment' and nothing can close the job; the only way out is to record money that hasn't
//        arrived."
//   M8: "on activation day the band's filled button is 'Send midpoint invoice', while the estimate
//        says the midpoint is due at the project midpoint."
//
// Both were reproduced on the old build before anything changed. This drives the REAL page: the real
// Client Dashboard and its band, the real Close job button and the real question it asks (answered
// Cancel, then OK), the real rail and track, the real Job Plan, and the real client list. ⚠ Today is
// PINNED through `_todayStr`, the app's one wall-clock read, so the dates mean the same thing on every
// day this is re-run.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step28.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL ' + m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + ' (got ' + JSON.stringify(a) + ')');
const has = (s, n, m) => ok(String(s).indexOf(n) >= 0, m + ' (in ' + JSON.stringify(String(s).slice(0, 400)) + ')');
const lacks = (s, n, m) => ok(String(s).indexOf(n) < 0, m + ' (found ' + JSON.stringify(n) + ')');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let b;

(async () => {
  b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  let answer = true; const dialogs = [];
  p.on('dialog', async (d) => { dialogs.push(d.message()); if (answer) await d.accept(); else await d.dismiss(); });
  await p.goto(APP); await p.waitForTimeout(1500);
  const overflow = () => p.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
  const setToday = (d) => p.evaluate((d) => { window._todayStr = function () { return d; }; }, d);

  // Two Estate Settlement jobs, six working days each, activated Wednesday 23 September: working days
  // 23, 24, 25, 28, 29, 30 — so the halfway point is Friday the 25th. 7101 will have its midpoint
  // invoice SENT and unpaid (the audit's case); 7102 will never send one.
  await p.evaluate(() => {
    const mk = (id, name) => ({ id, hvlId: 'HVL-26' + id, name, fname: name.split(' ')[0], lname: name.split(' ').slice(-1)[0],
      sqft: '3000', svc: 'cleanout', addr: '200 Worth Ave', city: 'Palm Beach', email: 'x' + id + '@example.com', phone: '(561) 555-0100',
      start: '2026-09-23', activatedOn: '2026-09-23', walkthrough: '2026-09-10', created: '2026-09-08', status: 'active', won: true,
      wonAt: '2026-09-12', approved: true, estimateSentDate: 'Sep 11, 2026', agrApproved: true, agrApprovedBy: 'Anthony Graziano',
      agrSent: true, agrSigned: true, depositReceived: true, depositReceivedAt: '2026-09-19', tc: 'Ashley Jerome',
      payments: [{ id: 1, uid: 'p1' + id, stage: 'deposit', amount: 10000, date: '2026-09-19', method: 'wire', clearedOn: '2026-09-19' }],
      docState: { 'invoice:deposit': { draftedAt: '2026-09-15T15:00:00Z', sentAt: '2026-09-15T15:00:00Z' } } });
    const est = (id) => ({ jobId: id, svc: 'cleanout', days: 6, totTC: 10, totPS: 20, havellinTotal: 20000, psCount: 2,
      rooms: [{ idx: 1, name: 'Kitchen', section: 'Kitchen & Utility', vol: 3, cplx: 3, tcH: 5, psH: 10 },
              { idx: 2, name: 'Study', section: 'Entry & Living', vol: 3, cplx: 3, tcH: 5, psH: 10 }],
      vendors: [], collections: [], prepItems: [] });
    [mk(7101, 'Harriet ZZ Whitcombe'), mk(7102, 'Edmund ZZ Farrow')].forEach((j) => {
      jobs.unshift(j);
      estimateStore[j.id] = { estimate: est(j.id), approved: true, submitted: true, approvedBy: 'Anthony Graziano', savedAt: Date.now() };
    });
    saveJobs();
  });

  const openDash = async (id) => {
    await p.evaluate((id) => { showPanel('jobs', document.querySelector('.nb[onclick*="\'jobs\'"]')); openClientDashboard(id); }, id);
    await p.waitForTimeout(300);
  };
  const band = (id) => p.evaluate((id) => {
    const nx = document.querySelector('#client-dashboard-view .jt-next');
    const t = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');
    return {
      step: t(nx && nx.querySelector('.jt-next-step')),
      filled: nx ? Array.from(nx.querySelectorAll('.jt-btn-p')).map((x) => ({ t: t(x), c: x.getAttribute('onclick') })) : [],
      outline: nx ? Array.from(nx.querySelectorAll('button.jt-btn:not(.jt-btn-p)')).map((x) => ({ t: t(x), c: x.getAttribute('onclick') })) : [],
      page: document.getElementById('client-dashboard-view').innerHTML,
    };
  }, id);

  // ── A. ACTIVATION DAY (M8) ─────────────────────────────────────────────
  console.log('\n## A. Activation day — the midpoint invoice is not the filled button');
  await setToday('2026-09-23');
  await openDash(7101);
  let s = await band(7101);
  eq(s.step, 'Do the work — the midpoint invoice is due at the halfway point', 'the band says to do the work, and when the invoice falls due');
  eq(s.filled.length, 0, '⚠⚠ the band has NO filled button on activation day (it was Send midpoint invoice)');
  const sendEarly = s.outline.filter((x) => /Send midpoint invoice/.test(x.t))[0] || { t: '', c: '' };
  eq(sendEarly.t, '✉ Send midpoint invoice — due around Sep 25, 2026', 'the send is an outline button naming the halfway day');
  eq(sendEarly.c, "docAction(7101,'invoice','send',{stage:'midpoint'})", 'and it is the same send every document uses');
  ok(s.outline.some((x) => x.c === 'activateOrCycle(7101)' && /Close job/.test(x.t)), 'Close job sits beside it from day one');
  has(s.page, 'Planned halfway point Sep 25, 2026', 'the rail row carries the same day as its plan');
  const ovA = []; for (const w of [1440, 390]) { await p.setViewportSize({ width: w, height: 900 }); await openDash(7101); ovA.push(await overflow()); }
  eq(ovA, [0, 0], 'the activation-day dashboard fits at 1440 and 390');
  await p.setViewportSize({ width: 1440, height: 1000 });

  // ── B. THE HALFWAY DAY ─────────────────────────────────────────────────
  console.log('\n## B. On the halfway day the midpoint invoice is the filled button again');
  await setToday('2026-09-25');
  await openDash(7101);
  s = await band(7101);
  eq(s.filled.map((x) => x.c), ["docAction(7101,'invoice','send',{stage:'midpoint'})"], 'Send midpoint invoice is the one filled button on the 25th');
  eq(s.step, 'Send the midpoint invoice', 'and the band reads the ordinary step');

  // ── B2. EVERY ROOM LOCKED, BEFORE THE HALFWAY DAY ─────────────────────
  // The Job Plan has always called every room locked the project midpoint (its red banner, its derived
  // line); the band must not say "not yet" beside a banner saying "you're at the project midpoint".
  console.log('\n## B2. Every room locked before the halfway day — the band and the Job Plan agree it is due');
  await setToday('2026-09-24');
  await p.evaluate(() => { jobPlanStore[7101] = { rooms: { 1: { status: 'locked' }, 2: { status: 'locked' } } }; });
  await openDash(7101);
  s = await band(7101);
  eq(s.step, 'Send the midpoint invoice', 'every room locked on day 2: the band asks for the midpoint');
  eq(s.filled.map((x) => x.c), ["docAction(7101,'invoice','send',{stage:'midpoint'})"], 'and Send midpoint invoice is its filled button');
  ok(await p.evaluate(() => openJobPlanFor(7101)), 'the Job Plan opens on the same job');
  await p.waitForTimeout(500);
  const planB2 = await p.evaluate(() => ({ html: (document.getElementById('job-plan-content') || {}).innerHTML || '',
    prim: ((document.querySelector('#jband-slot-plan .jt-btn-p') || { getAttribute: () => '' }).getAttribute('onclick')) }));
  has(planB2.html, 'All rooms are locked', 'the Job Plan carries its red project-midpoint banner');
  has(planB2.html, 'collection takes time', 'and its Midpoint invoice sent line still asks for it');
  eq(planB2.prim, "docAction(7101,'invoice','send',{stage:'midpoint'})", '⚠⚠ and the Job Plan\'s band asks for the same invoice, beside it');

  // ── C. H3: EVERY ROOM CLEARED, MIDPOINT SENT AND UNPAID ────────────────
  console.log('\n## C. The audit\'s case — every room cleared, midpoint invoice sent and unpaid');
  await setToday('2026-09-30');
  await p.evaluate(() => {
    const j = jobs.find((x) => x.id === 7101);
    j.docState['invoice:midpoint'] = { draftedAt: '2026-09-25T15:00:00Z', sentAt: '2026-09-25T15:00:00Z' };
    jobPlanStore[7101] = { rooms: { 1: { status: 'cleared' }, 2: { status: 'cleared' } } };
    saveJobs();
  });
  await openDash(7101);
  s = await band(7101);
  eq(s.step, 'Collect the midpoint payment', 'the band is on collecting the midpoint');
  eq(s.filled.map((x) => x.c), ["dashRecordPayment(7101,'midpoint')"], 'Record payment is the filled button');
  ok(s.outline.some((x) => x.c === 'activateOrCycle(7101)'), '⚠⚠ and Close job is reachable from that band — the dead end is gone');

  // Press Close, answer Cancel.
  answer = false; dialogs.length = 0;
  await p.click('#client-dashboard-view .jt-next button[onclick="activateOrCycle(7101)"]');
  await p.waitForTimeout(300);
  eq(dialogs.length, 1, 'pressing Close asks once');
  has(dialogs[0] || '', 'No midpoint payment is recorded', 'naming the unpaid midpoint');
  has(dialogs[0] || '', 'the final invoice bills everything not yet paid', 'and what the final does about it');
  has(dialogs[0] || '', 'Sep 30, 2026', 'and today as the handover date');
  // Restated 2026-09-29: the question said a closed job "cannot be re-opened" until Re-open landed (step 29).
  has(dialogs[0] || '', 'Until the final invoice goes out, Re-open can undo the close', 'and that Re-open can undo it until the final goes out');
  lacks(dialogs[0] || '', 'cannot be re-opened', 'and no longer that it cannot');
  const cancelled = await p.evaluate(() => { const j = jobs.find((x) => x.id === 7101); return { st: j.status, d: j.deliveredOn || '' }; });
  eq(cancelled, { st: 'active', d: '' }, 'Cancel leaves the job active with no handover date stamped');

  // Press it again, answer OK.
  answer = true; dialogs.length = 0;
  await p.click('#client-dashboard-view .jt-next button[onclick="activateOrCycle(7101)"]');
  await p.waitForTimeout(400);
  const closed = await p.evaluate(() => { const j = jobs.find((x) => x.id === 7101); return { st: j.status, d: j.deliveredOn || '' }; });
  eq(closed, { st: 'closed', d: '2026-09-30' }, 'OK closes the job and stamps today as the handover');
  s = await band(7101);
  eq(s.step, 'Send the final invoice', '⚠⚠ the band moves to the FINAL invoice');
  eq(s.filled.map((x) => x.c), ["docAction(7101,'invoice','send',{stage:'final'})"], 'and Send final invoice is its one filled button');
  ok(!s.outline.some((x) => /Close job/.test(x.t)), 'a closed job is offered no Close');
  eq(s.outline.filter((x) => x.c === 'activateOrCycle(7101)').map((x) => x.t), ['↺ Re-open job'], 'the one transition on its band is Re-open job (2026-09-29)');
  const rail = await p.evaluate(() => Array.from(document.querySelectorAll('#client-dashboard-view .jt-rail .jt-row')).map((r) => ({
    cls: r.className.replace('jt-row ', ''), lbl: (r.querySelector('.jt-lbl') || {}).textContent, sub: (r.querySelector('.jt-sub') || {}).textContent || '' })));
  const mr = rail.filter((r) => r.lbl === 'Midpoint payment')[0] || {};
  eq(mr.cls, 'jt-open', 'the midpoint payment is drawn OPEN on the rail');
  eq(mr.sub, 'Unpaid — the final invoice carries it', 'saying what settles it');
  eq((rail.filter((r) => r.lbl === 'Final invoice sent')[0] || {}).cls, 'jt-cur', 'and the final invoice is the current step');
  has(s.page, "dashRecordPayment(7101,'midpoint')", 'the midpoint payment can still be recorded, from the strip');
  has(s.page, 'Record midpoint payment', 'under a label that names the stage');
  lacks(s.page, "docAction(7101,'invoice','send',{stage:'midpoint'})", 'nothing on the page sends the midpoint a second time');
  eq((s.page.match(/activateOrCycle\(7101\)/g) || []).length, 1, 'the transition is on the page once — the Re-open, in the band');
  const onc = await p.evaluate(() => Array.from(document.querySelectorAll('#client-dashboard-view [onclick]')).map((e) => e.getAttribute('onclick')));
  eq(onc.length, new Set(onc).size, 'every control on the closed job\'s dashboard is unique');

  // The colour of the open state, measured rather than assumed — on the track (desk) and the rail (phone).
  const trackNode = await p.evaluate(() => { const n = document.querySelector('#client-dashboard-view .jt-step.jt-open .jt-node');
    return n ? getComputedStyle(n).borderTopColor : null; });
  eq(trackNode, 'rgb(133, 79, 11)', 'the open node on the desk track is amber (--warn-tx)');
  await p.setViewportSize({ width: 390, height: 900 }); await openDash(7101);
  const railNode = await p.evaluate(() => { const r = document.querySelector('#client-dashboard-view .jt-rail .jt-row.jt-open');
    return r ? { vis: r.offsetParent !== null, c: getComputedStyle(r, '::before').borderTopColor } : null; });
  eq(railNode, { vis: true, c: 'rgb(133, 79, 11)' }, 'and on the phone rail, visible and amber');
  eq(await overflow(), 0, 'the closed job\'s dashboard fits at 390');
  await p.setViewportSize({ width: 1440, height: 1000 }); await openDash(7101);
  eq(await overflow(), 0, 'and at 1440');

  // The final goes out and is paid — both written as the record, then redrawn.
  await p.evaluate(() => { const j = jobs.find((x) => x.id === 7101);
    j.docState['invoice:final'] = { draftedAt: '2026-10-01T15:00:00Z', sentAt: '2026-10-01T15:00:00Z' };
    j.payments.push({ id: 3, uid: 'p3', stage: 'final', amount: 10000, date: '2026-10-05', method: 'check' }); saveJobs(); });
  await setToday('2026-10-05'); await openDash(7101);
  s = await band(7101);
  has(s.step, 'Every milestone on this job is recorded', 'once the final is paid the band reads Complete');
  has(s.page, 'Paid with the final invoice', 'and the midpoint row says the final settled it');
  lacks(s.page, 'jt-row jt-open', 'nothing is left open');
  lacks(s.page, 'Re-open job', 'and once the final has gone out nothing offers Re-open');

  // ── D. THE MIDPOINT INVOICE NEVER WENT OUT ─────────────────────────────
  console.log('\n## D. The midpoint invoice was never sent — close from its own band');
  await setToday('2026-09-29');
  await p.evaluate(() => { jobPlanStore[7102] = { rooms: { 1: { status: 'cleared' }, 2: { status: 'cleared' } } }; });
  await openDash(7102);
  s = await band(7102);
  eq(s.filled.map((x) => x.c), ["docAction(7102,'invoice','send',{stage:'midpoint'})"], 'past the halfway point the midpoint send is the filled button');
  answer = true; dialogs.length = 0;
  await p.click('#client-dashboard-view .jt-next button[onclick="activateOrCycle(7102)"]');
  await p.waitForTimeout(400);
  s = await band(7102);
  eq(s.filled.map((x) => x.c), ["docAction(7102,'invoice','send',{stage:'final'})"], 'closed: the final is the filled button');
  const rail2 = await p.evaluate(() => Array.from(document.querySelectorAll('#client-dashboard-view .jt-rail .jt-row')).map((r) => ({
    cls: r.className.replace('jt-row ', ''), lbl: (r.querySelector('.jt-lbl') || {}).textContent, sub: (r.querySelector('.jt-sub') || {}).textContent || '' })));
  eq(rail2.filter((r) => /^Midpoint/.test(r.lbl)).map((r) => [r.cls, r.sub]),
     [['jt-open', 'Not sent — the final invoice bills it'], ['jt-open', 'Unpaid — the final invoice carries it']],
     'both midpoint rows are open, each saying the final carries it');
  lacks(s.page, "docAction(7102,'invoice','send',{stage:'midpoint'})", 'and the midpoint send is gone from the page');

  // ── E. THE JOB PLAN ────────────────────────────────────────────────────
  console.log('\n## E. The Job Plan of a job closed with its midpoint unpaid is in Close-out');
  ok(await p.evaluate(() => openJobPlanFor(7102)), 'the Job Plan opens on the closed job');
  await p.waitForTimeout(500);
  const plan = await p.evaluate(() => {
    const prim = document.querySelector('#jband-slot-plan .jt-btn-p');
    return { now: Array.from(document.querySelectorAll('#job-plan-content .stg-cur')).map((e) => e.id),
      band: ((document.querySelector('#jband-slot-plan .jt-next-step') || {}).textContent || '').trim(),
      prim: prim ? prim.getAttribute('onclick') : '' };
  });
  eq(plan.now, ['stage-p4'], 'the NOW marker is on Close-out, not on Midpoint & pickups');
  eq(plan.band, 'Send the final invoice', 'the Job Plan\'s band says the same as the dashboard\'s');
  eq(plan.prim, "docAction(7102,'invoice','send',{stage:'final'})", 'with the same filled button');
  // Every room is cleared here, so before the close the red project-midpoint banner stood over this plan.
  const planE = await p.evaluate(() => (document.getElementById('job-plan-content') || {}).innerHTML || '');
  lacks(planE, 'All rooms are locked', '⚠ the red "send the midpoint" banner stands down on a closed job');
  has(planE, 'not sent — the job is closed, so the final invoice bills it', 'and Midpoint invoice sent says the final bills it');
  lacks(planE, "openInvoiceFor(7102,'midpoint')", 'with nothing left on the plan that opens the midpoint invoice');

  // ── F. THE CLIENT LIST ─────────────────────────────────────────────────
  console.log('\n## F. The client list carries no dead Status button, and nothing is left calling one');
  await p.evaluate(() => { showPanel('jobs', document.querySelector('.nb[onclick*="\'jobs\'"]')); closeClientDashboard(); renderJobs(); });
  await p.waitForTimeout(200);
  const list = await p.evaluate(() => ({ status: Array.from(document.querySelectorAll('#panel-jobs button')).filter((x) => x.textContent.trim() === 'Status').length,
    fn: typeof window.cycleStatus, rows: document.querySelectorAll('#panel-jobs button[onclick*="openClientDashboard"]').length }));
  eq(list.status, 0, 'no Status button on the client list');
  eq(list.fn, 'undefined', 'and no cycleStatus function behind one');
  ok(list.rows >= 2, 'the rows still open their client (' + list.rows + ')');

  ok(errs.length === 0, 'no page errors (' + errs.join(' | ') + ')');
  await b.close();
  console.log('\nstep28: ' + pass + ' passed, ' + fail + ' failed');
})().catch(async (e) => {
  console.log('THREW ' + (e && e.stack || e));
  console.log('step28: ' + pass + ' passed, ' + (fail + 1) + ' failed');
  try { if (b) await b.close(); } catch (_) { /* already gone */ }
});
