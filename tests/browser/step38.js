// Step 38 — Re-open a closed job, and a final that no longer claims a midpoint invoice nobody sent
// (2026-09-29). Anthony, answering two of the four things the H3 build flagged: "yes to 2 and 3, reword
// the final and add Re-open". Written as step 29 and renumbered 36, 37, then 38 on three merges: the
// document-claims, work-done and stale-draft builds took those numbers first.
//
// Drives the REAL page: the real Close job and Re-open job buttons on the Client Dashboard band and the real
// questions they ask (Cancel, then OK), the real rail, the real Job Plan the Re-open lands on, the real client
// list's ✕, and the real final invoice opened in the real document viewer. ⚠ Today is PINNED through
// `_todayStr`, the app's one wall-clock read. A Gmail draft cannot be made from a headless page, so a draft is
// written as the record the send path writes — which is all the rail and the Re-open read.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step38.js [/abs/path/to/havellin.html]
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
  p.on('dialog', async (d) => { dialogs.push({ type: d.type(), msg: d.message() }); if (answer || d.type() === 'alert') await d.accept(); else await d.dismiss(); });
  await p.goto(APP); await p.waitForTimeout(1500);
  const overflow = () => p.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
  const setToday = (d) => p.evaluate((d) => { window._todayStr = function () { return d; }; }, d);

  // Two six-working-day Estate Settlements activated Wednesday 23 September (halfway Friday the 25th, planned
  // end the 30th), every room cleared. 7201 has its midpoint invoice SENT and unpaid; 7202 never sent one and
  // its deposit came in $50 short — inside the 1% the funding test allows, so the job is funded and its rail
  // reads normally, while the final still has a gap to name. 40 TC @150 + 100 PS @100 = $16,000, and the hours
  // logged reproduce it, so the final is not held for a variance and reads exactly what it bills.
  await p.evaluate(() => {
    const mk = (id, name) => ({ id, hvlId: 'HVL-26' + id, name, fname: name.split(' ')[0], lname: name.split(' ').slice(-1)[0],
      sqft: '3000', svc: 'cleanout', addr: '210 Worth Ave', city: 'Palm Beach', email: 'x' + id + '@example.com', phone: '(561) 555-0100',
      start: '2026-09-23', activatedOn: '2026-09-23', walkthrough: '2026-09-10', created: '2026-09-08', status: 'active', won: true,
      wonAt: '2026-09-12', approved: true, estimateSentDate: 'Sep 11, 2026', agrApproved: true, agrApprovedBy: 'Anthony Graziano',
      agrSent: true, agrSigned: true, depositReceived: true, depositReceivedAt: '2026-09-19', tc: 'Ashley Jerome',
      payments: [{ id: 1, uid: 'p1' + id, stage: 'deposit', amount: id === 7202 ? 7950 : 8000, date: '2026-09-19', method: 'wire', clearedOn: '2026-09-19' }],
      docState: { 'invoice:deposit': { draftedAt: '2026-09-15T15:00:00Z', sentAt: '2026-09-15T15:00:00Z' } } });
    const est = (id) => ({ jobId: id, svc: 'cleanout', days: 6, totTC: 40, totPS: 100, tcFee: 6000, psFee: 10000, pkgCost: 0, smf: 0,
      prepFee: 0, tcRate: 150, psRate: 100, havellinTotal: 16000, havellinTotalFull: 16000, psCount: 2, fixedPrice: false, rush: false,
      discountPct: 0, discountAmt: 0, preparedBy: 'Ashley Jerome',
      rooms: [{ idx: 1, name: 'Kitchen', section: 'Kitchen & Utility', vol: 3, cplx: 3, tcH: 20, psH: 50 },
              { idx: 2, name: 'Study', section: 'Entry & Living', vol: 3, cplx: 3, tcH: 20, psH: 50 }],
      vendors: [], collections: [], prepItems: [] });
    [mk(7201, 'Cordelia ZZ Pemberton'), mk(7202, 'Ambrose ZZ Kittredge')].forEach((j) => {
      jobs.unshift(j);
      estimateStore[j.id] = { estimate: est(j.id), approved: true, submitted: true, approvedBy: 'Anthony Graziano', savedAt: Date.now() };
      jobPlanStore[j.id] = { rooms: { 1: { status: 'cleared' }, 2: { status: 'cleared' } } };
      jobLogs[j.id] = [{ id: 1, date: '2026-09-28', activity: 'clearance',
        members: [{ name: 'Ashley Jerome', role: 'TC', hours: 40 }, { name: 'Contractor TBD', role: 'PS', hours: 100 }] }];
    });
    jobs.find((x) => x.id === 7201).docState['invoice:midpoint'] = { draftedAt: '2026-09-25T15:00:00Z', sentAt: '2026-09-25T15:00:00Z' };
    saveJobs();
  });

  const openDash = async (id) => {
    await p.evaluate((id) => { showPanel('jobs', document.querySelector('.nb[onclick*="\'jobs\'"]')); openClientDashboard(id); }, id);
    await p.waitForTimeout(300);
  };
  const band = () => p.evaluate(() => {
    const nx = document.querySelector('#client-dashboard-view .jt-next');
    const t = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');
    return {
      step: t(nx && nx.querySelector('.jt-next-step')),
      filled: nx ? Array.from(nx.querySelectorAll('.jt-btn-p')).map((x) => ({ t: t(x), c: x.getAttribute('onclick') })) : [],
      outline: nx ? Array.from(nx.querySelectorAll('button.jt-btn:not(.jt-btn-p)')).map((x) => ({ t: t(x), c: x.getAttribute('onclick') })) : [],
      page: document.getElementById('client-dashboard-view').innerHTML,
    };
  });
  const rail = () => p.evaluate(() => Array.from(document.querySelectorAll('#client-dashboard-view .jt-rail .jt-row')).map((r) => ({
    cls: r.className.replace('jt-row ', ''), lbl: (r.querySelector('.jt-lbl') || {}).textContent, sub: (r.querySelector('.jt-sub') || {}).textContent || '' })));
  const job = (id) => p.evaluate((id) => JSON.parse(JSON.stringify(jobs.find((x) => x.id === id))), id);
  const press = async (sel) => { await p.click(sel); await p.waitForTimeout(400); };
  const BTN = (id) => '#client-dashboard-view .jt-next button[onclick="activateOrCycle(' + id + ')"]';

  // ── A. CLOSE, THEN THE RE-OPEN ON THE BAND ─────────────────────────────
  console.log('\n## A. A closed job carries Re-open job beside Send final invoice');
  await setToday('2026-09-30');
  await openDash(7201);
  answer = true; dialogs.length = 0;
  await press(BTN(7201));
  has((dialogs[0] || {}).msg, 'Until the final invoice goes out, Re-open can undo the close.', '⚠ the close question now says Re-open can undo it');
  lacks((dialogs[0] || {}).msg, 'cannot be re-opened', 'and no longer that it cannot');
  eq((await job(7201)).deliveredOn, '2026-09-30', 'closed, handed over today');
  let s = await band();
  eq(s.filled.map((x) => x.c), ["docAction(7201,'invoice','send',{stage:'final'})"], 'Send final invoice is the one filled button');
  const reo = s.outline.filter((x) => x.c === 'activateOrCycle(7201)');
  eq(reo.map((x) => x.t), ['↺ Re-open job'], '⚠⚠ Re-open job sits beside it, as an outline, once');
  eq((s.page.match(/activateOrCycle\(7201\)/g) || []).length, 1, 'and nowhere else on the page');
  let onc = await p.evaluate(() => Array.from(document.querySelectorAll('#client-dashboard-view [onclick]')).map((e) => e.getAttribute('onclick')));
  eq(onc.length, new Set(onc).size, 'every control on the closed job\'s dashboard is unique');

  // Cancel changes nothing.
  answer = false; dialogs.length = 0;
  const before = await job(7201);
  await press(BTN(7201));
  eq(dialogs.length, 1, 'pressing Re-open asks once');
  const q0 = (dialogs[0] || {}).msg || '';
  has(q0, 'Re-open this job?', 'the question says what it is');
  has(q0, 'It was closed on Sep 30, 2026 by Anthony Graziano.', 'names the close it would undo');
  has(q0, 'clears that handover date', 'says the handover date goes');
  eq(await job(7201), before, '⚠ Cancel leaves the job exactly as it was');
  eq(await p.evaluate(() => document.querySelector('.panel.active').id), 'panel-jobs', 'and goes nowhere');

  // ── B. A FINAL DRAFTED, THEN RE-OPEN → OK ──────────────────────────────
  console.log('\n## B. A final drafted after the close is voided by the Re-open, which lands on the Job Plan');
  await p.evaluate(() => { const j = jobs.find((x) => x.id === 7201);
    const st = docState(j, 'invoice:final');
    Object.assign(st, { draftedAt: '2026-09-30T16:00:00Z', draftedBy: 'Anthony Graziano', draftUrl: 'https://mail.google.com/mail/u/0/#drafts?compose=x',
      pdfOk: true, filedAt: '2026-09-30T16:01:00Z', filedUrl: 'https://drive.google.com/file/d/x/view',
      provider: 'gmail', mailbox: 'anthony@havellinpalmbeach.com' }); saveJobs(); });
  await openDash(7201);
  s = await band();
  eq(s.filled.map((x) => x.c), ["markDocSent(7201,'invoice:final')"], 'with a final drafted, the band waits on "I\'ve sent it"');
  answer = true; dialogs.length = 0;
  await press(BTN(7201));
  const q1 = (dialogs[0] || {}).msg || '';
  has(q1, 'The final invoice drafted on Sep 30 billed the job as it stood at the close and no longer applies — delete that draft in Gmail (anthony@havellinpalmbeach.com).',
      '⚠⚠ the question says the draft is stale and to delete it in Gmail, naming the mailbox');
  has(q1, 'The copy filed to Drive is replaced when the final goes out.', 'and what happens to the Drive copy');
  const j1 = await job(7201);
  eq(j1.status, 'active', 'OK: the job is active again');
  ok(!('deliveredOn' in j1), '⚠⚠ the handover stamp is cleared');
  eq((j1.reopens || []).map((e) => [e.closedOn, e.closedBy, e.reopenedOn, e.finalDraftVoided]),
     [['2026-09-30', 'Anthony Graziano', '2026-09-30', '2026-09-30T16:00:00Z']], 'the close it undid is kept on the record, with the voided draft');
  eq(Object.keys(j1.docState['invoice:final']), ['staleDrafts'], 'the stale draft is off the record — kept only in the draft history');
  eq(j1.docState['invoice:final'].staleDrafts, [{ draftedAt: '2026-09-30T16:00:00Z', provider: 'gmail',
    mailbox: 'anthony@havellinpalmbeach.com', why: 'reopen' }], '⚠⚠ which remembers the day, the mailbox and why it went stale');
  eq(j1.activatedOn, '2026-09-23', 'the day the job really started is untouched');
  const landed = await p.evaluate(() => ({ panel: document.querySelector('.panel.active').id, pick: (document.getElementById('plan-job') || {}).value,
    now: Array.from(document.querySelectorAll('#job-plan-content .stg-cur')).map((e) => e.id) }));
  eq(landed.panel, 'panel-job-plan', '⚠ it lands on the Job Plan');
  eq(landed.pick, '7201', 'on this client');
  eq(landed.now, ['stage-p2'], 'with NOW back on Midpoint & pickups — not Close-out');

  await openDash(7201);
  s = await band();
  eq(s.step, 'Collect the midpoint payment', '⚠⚠ the dashboard band is back on the step the job was on');
  eq(s.filled.map((x) => x.c), ["dashRecordPayment(7201,'midpoint')"], 'Record payment is its filled button');
  eq(s.outline.filter((x) => x.c === 'activateOrCycle(7201)').map((x) => x.t), ['■ Close job'], 'Close job is back beside it');
  lacks(s.page, 'Re-open job', 'and Re-open is gone');
  const r1 = await rail();
  eq(r1.filter((r) => r.cls === 'jt-open').length, 0, 'no row is drawn open any more');
  eq((r1.filter((r) => r.lbl === 'Work complete')[0] || {}).sub, 'Re-opened — the earlier close was undone', '⚠ Work complete says the job was re-opened');
  eq((r1.filter((r) => r.lbl === 'Final invoice sent')[0] || {}).sub,
     'The Gmail draft from Sep 30 (anthony@havellinpalmbeach.com) was made before the job was re-opened — delete it, don’t send it',
     '⚠⚠ and the final\'s row goes on naming the draft the Re-open retired');
  lacks(s.page, "openDocDraft(7201,'invoice:final')", 'no link to the voided draft survives');
  onc = await p.evaluate(() => Array.from(document.querySelectorAll('#client-dashboard-view [onclick]')).map((e) => e.getAttribute('onclick')));
  eq(onc.length, new Set(onc).size, 'every control on the re-opened job\'s dashboard is unique');
  await p.evaluate(() => { showPanel('jobs', document.querySelector('.nb[onclick*="\'jobs\'"]')); closeClientDashboard(); renderJobs(); });
  await p.waitForTimeout(200);
  ok(await p.evaluate(() => !!document.querySelector('#panel-jobs button[onclick*="openCloseoutModal(7201)"]')),
     'the client list offers ✕ again — a job back in progress can still be lost');

  // ── C. CLOSED AGAIN, TWO DAYS LATER ────────────────────────────────────
  console.log('\n## C. Closed again: a new handover day, the question asked again, a FRESH final to send');
  await setToday('2026-10-02');
  await openDash(7201);
  answer = true; dialogs.length = 0;
  await press(BTN(7201));
  has((dialogs[0] || {}).msg, 'Oct 2, 2026', 'the early-close question is asked again, naming the new day');
  eq((await job(7201)).deliveredOn, '2026-10-02', '⚠ the new close stamps its own day');
  s = await band();
  eq(s.filled.map((x) => x.c), ["docAction(7201,'invoice','send',{stage:'final'})"], '⚠⚠ the band SENDS a fresh final — never "I\'ve sent it" over the stale draft');
  eq(s.outline.filter((x) => x.c === 'activateOrCycle(7201)').map((x) => x.t), ['↺ Re-open job'], 'and Re-open is offered again');
  // A fresh final drafted through the REAL writer (the Gmail call itself cannot run headless): the row names the
  // new draft AND the older one, so two finals in one mailbox are never left for somebody to tell apart.
  await p.evaluate(() => { _gmailUserEmail = 'ashley@havellinpalmbeach.com';
    docRecordSent({ job: jobs.find((x) => x.id === 7201), key: 'invoice:final' }, { provider: 'gmail', draftUrl: 'https://mail.google.com/y', pdfOk: true }); });
  await openDash(7201);
  eq(((await rail()).filter((r) => r.lbl === 'Final invoice sent')[0] || {}).sub,
     'Drafted — read it, send it, then confirm. Delete the older Gmail draft from Sep 30 (anthony@havellinpalmbeach.com) — it was made before the job was re-opened',
     '⚠⚠ a fresh final is drafted: the row says send it, and delete the one the Re-open retired');
  s = await band();
  eq(s.filled.map((x) => x.c), ["markDocSent(7201,'invoice:final')"], 'and the band waits on "I\'ve sent it" for the FRESH draft');

  // ── D. THE FINAL GOES OUT: NO RE-OPEN ──────────────────────────────────
  console.log('\n## D. Once the final has gone out, nothing re-opens the job');
  await p.evaluate(() => { const j = jobs.find((x) => x.id === 7201);
    Object.assign(docState(j, 'invoice:final'), { draftedAt: '2026-10-02T15:00:00Z', sentAt: '2026-10-02T15:30:00Z' }); saveJobs(); });
  await openDash(7201);
  eq(((await rail()).filter((r) => r.lbl === 'Final invoice sent')[0] || {}).sub, '',
     'once the final is sent, the row stops naming the retired draft');
  s = await band();
  lacks(s.page, 'Re-open job', '⚠⚠ no Re-open anywhere on the page');
  lacks(s.page, 'activateOrCycle(7201)', 'and no control reaches the transition');
  dialogs.length = 0;
  const beforeD = await job(7201);
  await p.evaluate(() => activateOrCycle(7201));
  await p.waitForTimeout(300);
  eq(dialogs.map((d) => d.type), ['alert'], 'called directly, it refuses with an alert and asks nothing');
  has((dialogs[0] || {}).msg, 'its final invoice has already gone out to the client', 'naming why');
  eq(await job(7201), beforeD, 'and nothing on the job moves');

  // ── E. THE FINAL, WITH THE MIDPOINT NEVER SENT ─────────────────────────
  console.log('\n## E. The final invoice of a job closed with its midpoint never sent');
  await setToday('2026-09-30');
  await openDash(7202);
  answer = true; dialogs.length = 0;
  await press(BTN(7202));
  eq((await job(7202)).status, 'closed', 'closed with the midpoint never sent');
  await p.evaluate(() => docAction(7202, 'invoice', 'view', { stage: 'final' }));
  await p.waitForTimeout(400);
  const inv = await p.evaluate(() => ({ open: getComputedStyle(document.getElementById('doc-viewer-modal')).display,
    t: (document.getElementById('doc-viewer-body') || {}).textContent.replace(/\s+/g, ' ') }));
  eq(inv.open, 'flex', 'the real final invoice opens in the viewer');
  has(inv.t, '25% midpoint — billed on this invoice', '⚠⚠ the midpoint is billed ON the final, not "invoiced at project midpoint"');
  has(inv.t, 'Outstanding from the deposit invoice — carried into the balance below', 'the short deposit is outstanding from the deposit invoice alone');
  lacks(inv.t, 'deposit and midpoint invoices', 'no midpoint invoice is named that never went out');
  lacks(inv.t, 'fees trued to actuals', 'and the old midpoint row is gone');
  // textContent runs the label cell into the amount cell with no space between them.
  has(inv.t, 'Outstanding from the deposit invoice — carried into the balance below+$50', 'the $50 short on the deposit, named against the deposit invoice');
  has(inv.t, '$8,050', 'the balance is the job less what arrived — $16,000 less $7,950');
  await p.evaluate(() => closeDocViewer());

  // The same document for the job whose midpoint WAS sent: the old wording, because it is true there.
  await p.evaluate(() => { const j = jobs.find((x) => x.id === 7201); delete j.docState['invoice:final'].sentAt; saveJobs(); });
  await p.evaluate(() => docAction(7201, 'invoice', 'view', { stage: 'final' }));
  await p.waitForTimeout(400);
  const inv2 = await p.evaluate(() => (document.getElementById('doc-viewer-body') || {}).textContent.replace(/\s+/g, ' '));
  has(inv2, '25% midpoint — fees trued to actuals', 'a midpoint that was sent is named as sent');
  has(inv2, 'Outstanding from the deposit and midpoint invoices', 'with both invoices on the gap');
  await p.evaluate(() => closeDocViewer());

  // ── F. THE LEGACY CLOSED JOB ───────────────────────────────────────────
  console.log('\n## F. A job closed before the handover stamp shipped is offered Re-open, never Activate');
  await p.evaluate(() => { const j = jobs.find((x) => x.id === 7202);
    delete j.deliveredOn; delete j.deliveredAt; delete j.deliveredBy; saveJobs(); });
  await openDash(7202);
  s = await band();
  eq(s.step, 'Activate the job', 'with no handover stamp its lit step is Job active');
  eq(s.filled.length, 0, '⚠ which carries no Activate button on a closed job');
  eq(s.outline.filter((x) => x.c === 'activateOrCycle(7202)').map((x) => x.t), ['↺ Re-open job'], 'Re-open job instead, once');
  lacks(s.page, 'Activate job', 'Activate job is nowhere on the page');

  // ── G. LAYOUT ──────────────────────────────────────────────────────────
  const ov = []; for (const w of [1440, 390]) { await p.setViewportSize({ width: w, height: 900 }); await openDash(7202); ov.push(await overflow()); }
  eq(ov, [0, 0], 'the dashboard with Re-open on its band fits at 1440 and 390');

  ok(errs.length === 0, 'no page errors (' + errs.join(' | ') + ')');
  await b.close();
  console.log('\nstep38: ' + pass + ' passed, ' + fail + ' failed');
})().catch(async (e) => {
  console.log('THREW ' + (e && e.stack || e));
  console.log('step38: ' + pass + ' passed, ' + (fail + 1) + ' failed');
  try { if (b) await b.close(); } catch (_) { /* already gone */ }
});
