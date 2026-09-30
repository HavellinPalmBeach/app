// Step 30 — a manager's approval is a fact about ONE job (2026-09-29, workflow audit H1 + M1).
//
// H1: the ±15% final-invoice PIN lived in three page globals, so the PIN entered for job B released
// job A's final too, went on releasing B's after more hours moved the figure, and was forgotten on a
// reload. It is recorded on the job now (`docState['invoice:final'].approval = {by, at, amtDue}`) and
// honoured only while the final still asks for that figure.
// M1: the agreement's "Approved for Sending" band read the page globals too, so A's agreement — the
// HTML converted for DocuSign — named B's approver and B's date. It reads the job now, and every client
// document kind hides the band in its PDF.
//
// Drives the REAL page: the real intake and Build Estimate for two clients, the real Client Dashboard,
// the rail's own Manager approval button, the real PIN modal typed into, the real docAction print and
// view paths, a real reload, the real agreement builders, and the real `_exportDoc` copy of the page
// rendered in its own tab to measure what the PDF converter would see.
//
//   NODE_PATH=/opt/node22/lib/node_modules node tests/browser/step30.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
// ⚠ The browser is held OUTSIDE the async body so the catch can close it — run against a build that
// predates this change a check throws, and a Chromium left open reads as a hang.
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
  const hookPrint = () => p.evaluate(() => { window.__prints = []; window.print = function () {
    const pt = document.getElementById('print-target');
    window.__prints.push({ html: pt ? pt.innerHTML : '', title: document.title });
  }; });
  await p.goto(APP); await p.waitForTimeout(1500); await hookPrint();
  const future = (() => { const d = new Date(); d.setDate(d.getDate() + 30);
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10); })();
  const TODAY_LONG = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  async function make(last) {
    await p.evaluate(() => { const b = document.getElementById('btn-add-client'); if (b) b.click(); }); await p.waitForTimeout(300);
    const id = await p.evaluate(([wt, last]) => {
      const set = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; if (e.onchange) e.onchange(); } };
      const pick = (id) => { const e = document.getElementById(id); const o = e && Array.from(e.options).find(x => x.value); if (o) { e.value = o.value; if (e.onchange) e.onchange(); } };
      set('i-svc', 'downsizing'); toggleIntakeFields();
      set('i-fname', 'Pat'); set('i-lname', last); set('i-addr', '1 A St'); set('i-city', 'Palm Beach'); set('i-zip', '33480');
      set('i-sqft', '3500'); set('i-phone', '(561) 555-0199'); set('i-email', 'c@example.com'); set('i-home-value', '4200000');
      pick('i-ptype'); pick('i-src'); set('i-walkthrough', wt);
      const st = new Date(wt); st.setDate(st.getDate() + 7); while (st.getDay() === 0 || st.getDay() === 6) st.setDate(st.getDate() + 1);
      set('i-start', st.toISOString().slice(0, 10)); saveIntake(); return (jobs[0] || {}).id;
    }, [future, last]);
    await p.waitForTimeout(1500); return id;
  }
  // The real Build Estimate screen, approved, won, signed, funded — then 40% over its hours, so the
  // final needs the manager's PIN. Everything saved to this device, so a reload reads it back.
  async function build(id, approver) {
    await p.evaluate((id) => dashGoEstimate(id), id); await p.waitForTimeout(700);
    return p.evaluate(([id, approver]) => {
      const js = document.getElementById('e-job'); js.value = String(id); if (js.onchange) js.onchange();
      for (let i = 0; i < 6; i++) setRoomState('r' + i, 'in');
      calcAll();
      const e = JSON.parse(JSON.stringify(currentEstimate));
      estimateStore[id] = { approved: true, approvedBy: approver, estimate: e };
      const job = jobs.find(j => j.id === id);
      job.tc = 'Ashley Jerome'; job.won = true; job.status = 'active'; job.agrSigned = true; job.agrSent = true; job.approved = true;
      job.payments = [{ id: 1, uid: 'd' + id, stage: 'deposit', amount: depositTargetFor(job), method: 'wire', date: _todayStr(), clearedOn: _todayStr() },
                      { id: 2, uid: 'm' + id, stage: 'midpoint', amount: Math.round(e.havellinTotal * 0.25), method: 'wire', date: _todayStr(), clearedOn: _todayStr() }];
      // Walked to the FINAL: every earlier step done, the work delivered — the only state in which the
      // rail offers the final and its Manager approval button.
      const iso = new Date().toISOString();
      job.estimateSentDate = _todayStr(); job.wonAt = _todayStr(); job.activatedOn = _todayStr();
      job.docState = { estimate: { sentAt: iso }, agreement: { sentAt: iso }, 'invoice:deposit': { sentAt: iso }, 'invoice:midpoint': { sentAt: iso } };
      job.status = 'closed'; job.deliveredOn = _todayStr();
      jobLogs[id] = [{ id: 1, date: _todayStr(), activity: 'work', members: [
        { name: 'Ashley Jerome', role: 'TC', hours: Math.round(e.totTC * 1.4) }, { name: 'Crew', role: 'PS', hours: Math.round(e.totPS * 1.4) }] }];
      saveJobs();
      localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore));
      localStorage.setItem('havellin_logs_v3', JSON.stringify(jobLogs));
      return { totTC: e.totTC, totPS: e.totPS };
    }, [id, approver]);
  }
  const fin = (id) => p.evaluate((id) => { const d = invoiceHtml(jobs.find(j => j.id === id), 'final');
    return { req: d.requiresApproval, due: d.amtDue, pct: Math.round(d.variancePct * 100), band: (d.html.match(/class="approved-stamp"/g) || []).length, html: d.html }; }, id);
  const blocker = (id) => p.evaluate((id) => DOC_ACTIONS.invoice.blocker({ job: jobs.find(j => j.id === id), stage: 'final', kind: 'invoice' }, 'print'), id);
  const printFinal = async (id) => { await p.evaluate((id) => { window.__prints = []; docAction(id, 'invoice', 'print', { stage: 'final' }); }, id);
    await p.waitForTimeout(400); const got = await p.evaluate(() => window.__prints[0] || null); await p.waitForTimeout(700); return got; };
  const dashText = () => p.evaluate(() => { const e = document.getElementById('dash-fb'); return e ? e.textContent.replace(/\s+/g, ' ') : ''; });
  const modal = () => p.evaluate(() => { const m = document.getElementById('inv-pin-modal'); return { shown: getComputedStyle(m).display !== 'none', job: m.dataset.jobId || '' }; });
  // The rail's own button, found by its label on the rendered dashboard and pressed.
  async function pressManagerApproval(id) {
    await p.evaluate((id) => goToClientDashboard(id), id); await p.waitForTimeout(500);
    const sel = await p.evaluate(() => {
      // The visible one: the rail and the desk track are two layouts of one timeline, and CSS hides one.
      const bt = Array.from(document.querySelectorAll('#client-dashboard-view button'))
        .find(x => /Manager approval/.test(x.textContent) && x.getClientRects().length > 0 && getComputedStyle(x).visibility !== 'hidden');
      if (!bt) return ''; bt.setAttribute('data-step30', 'mgr'); return '[data-step30="mgr"]';
    });
    ok(!!sel, 'the rail offers Manager approval on the final');
    if (sel) { await p.click(sel); await p.waitForTimeout(300); }
  }

  console.log('\n## A. Two clients, both 40% over their hours — both finals refused');
  const idA = await make('Alder'); await build(idA, 'Anthony Graziano');
  const idB = await make('Birch'); await build(idB, 'Ashley Jerome');
  const lit = await p.evaluate((id) => { const job = jobs.find(j => j.id === id);
    const n = jobTimelineNext(jobTimeline(job, estimateStore[id], jobLogEntries(id), changeOrders.filter(c => c.jobId === id)));
    return n ? n.key : '(none)'; }, idB);
  ok(lit === 'final_invoiced', 'fixture: B\'s rail is lit on the final invoice (' + lit + ')');
  const A0 = await fin(idA), B0 = await fin(idB);
  ok(A0.req && B0.req, 'both finals need the PIN (A ' + A0.pct + '%, B ' + B0.pct + '%)');
  has(await blocker(idA), 'needs a manager PIN', 'A is refused');
  has(await blocker(idB), 'needs a manager PIN', 'B is refused');
  ok(!(await printFinal(idA)), 'A\'s final does not reach the print path');

  console.log('\n## B. The PIN for B, typed on B\'s dashboard through the rail button and the real modal');
  await pressManagerApproval(idB);
  const m1 = await modal();
  ok(m1.shown, 'the PIN modal opens');
  ok(m1.job === String(idB), 'bound to B (' + m1.job + ')');
  await p.fill('#inv-pin-input', '4020'); await p.waitForTimeout(500);
  ok(!(await modal()).shown, 'a good PIN closes it');
  has(await dashText(), 'approved for release by Ashley Jerome', 'the dashboard says who approved it');
  has(await dashText(), '$' + B0.due.toLocaleString('en-US'), 'and at what figure');
  const recB = await p.evaluate((id) => ((jobs.find(j => j.id === id).docState || {})['invoice:final'] || {}).approval || null, idB);
  ok(recB && recB.by === 'Ashley Jerome' && recB.amtDue === B0.due, 'B\'s record carries {by, at, amtDue}: ' + JSON.stringify(recB));
  const recA = await p.evaluate((id) => ((jobs.find(j => j.id === id).docState || {})['invoice:final'] || {}).approval || null, idA);
  ok(recA === null, 'nothing was written on A');
  has(await blocker(idA), 'needs a manager PIN', '⚠⚠ A is STILL refused — the PIN for B used to release it');
  ok(!(await printFinal(idA)), '⚠⚠ and A\'s final still does not print');
  const prB = await printFinal(idB);
  ok(!!prB && /Final Invoice/.test(prB.html), 'B\'s final prints');
  ok((await fin(idB)).band === 1 && (await fin(idA)).band === 0, 'B\'s final carries the band, A\'s does not');
  const saved = await p.evaluate((id) => { const s = JSON.parse(localStorage.getItem('havellin_jobs_v3') || '[]');
    const j = s.find(x => x.id === id); return j && j.docState && j.docState['invoice:final'] ? j.docState['invoice:final'].approval : null; }, idB);
  ok(saved && saved.by === 'Ashley Jerome', 'the approval is saved to this device with the job');

  console.log('\n## C. More hours on B move the figure — the approval stops counting, and says why');
  await p.evaluate((id) => { jobLogs[id][0].members[0].hours += 20; localStorage.setItem('havellin_logs_v3', JSON.stringify(jobLogs)); }, idB);
  const B1 = await fin(idB);
  ok(B1.due > B0.due, 'the final now asks for more (' + B1.due + ' from ' + B0.due + ')');
  const blk = await blocker(idB);
  has(blk, 'needs a manager PIN', '⚠⚠ B is refused again — it used to go on printing at a figure nobody had seen');
  has(blk, 'Ashley Jerome approved it at $' + B0.due.toLocaleString('en-US'), 'the refusal names the approval on file');
  ok(B1.band === 0, 'and the band comes off');
  await pressManagerApproval(idB);
  ok((await modal()).shown, 'the rail button asks for the PIN again');
  await p.evaluate(() => { document.getElementById('inv-pin-modal').style.display = 'none'; });
  await p.evaluate((id) => { jobLogs[id][0].members[0].hours -= 20; localStorage.setItem('havellin_logs_v3', JSON.stringify(jobLogs)); }, idB);
  const Bback = await fin(idB);
  ok(Bback.due === B0.due && (await blocker(idB)) === '', 'back at the approved figure, the record describes it again and is honoured');
  await pressManagerApproval(idB);
  ok(!(await modal()).shown, 'already approved: the rail button does not ask twice');
  has(await dashText(), 'already approved for release', 'it says so instead');

  console.log('\n## D. A reload keeps it — the approval is on the record, not in the page');
  await p.reload(); await p.waitForTimeout(2000); await hookPrint();
  const after = await p.evaluate(([a, b2]) => ({ haveA: !!jobs.find(j => j.id === a), haveB: !!jobs.find(j => j.id === b2) }), [idA, idB]);
  ok(after.haveA && after.haveB, 'both clients are back after the reload');
  ok((await blocker(idB)) === '', '⚠⚠ B is still approved after a reload — it used to be forgotten');
  has(await blocker(idA), 'needs a manager PIN', 'A is still refused');
  const prB2 = await printFinal(idB);
  ok(!!prB2, 'B\'s final prints after the reload');

  console.log('\n## E. On screen the band shows; on paper and in the PDF it never does');
  await p.evaluate((id) => docAction(id, 'invoice', 'view', { stage: 'final' }), idB); await p.waitForTimeout(400);
  const viewer = await p.evaluate(() => { const s = document.querySelector('#doc-viewer-body .approved-stamp');
    return s ? { shown: getComputedStyle(s).display !== 'none', text: s.textContent } : null; });
  ok(viewer && viewer.shown, 'the viewer shows the band on screen');
  has(viewer && viewer.text, 'Approved by Ashley Jerome', 'naming the approver on file');
  await p.evaluate(() => closeDocViewer());
  // The print path: the band is in the print target, and the print stylesheet hides it.
  await p.evaluate((id) => { window.print = function () {}; docAction(id, 'invoice', 'print', { stage: 'final' }); }, idB);
  await p.emulateMedia({ media: 'print' }); await p.waitForTimeout(100);
  const onPaper = await p.evaluate(() => { const s = document.querySelector('#print-target .approved-stamp'); return s ? getComputedStyle(s).display : 'absent'; });
  ok(onPaper === 'none', 'under print media the band is hidden (' + onPaper + ')');
  await p.emulateMedia({ media: 'screen' }); await p.waitForTimeout(900); await hookPrint();
  // The PDF: `_exportDoc`'s copy of the page, with each kind's pdfCss, rendered on SCREEN media —
  // the server-side conversion is not a print, which is the whole reason pdfCss carries the rule.
  const kinds = await p.evaluate(() => DOC_KINDS.slice());
  const probe = '<div class="approved-stamp"><div class="approved-stamp-text">Approved</div><div class="approved-stamp-sub">Approved by X on Y</div></div><p>body</p>';
  const docs = await p.evaluate(([kinds, probe]) => {
    const out = {}; kinds.forEach(k => { out[k] = _exportDoc('t', probe, DOC_ACTIONS[k].pdfCss || ''); });
    out.__none = _exportDoc('t', probe, ''); return out; }, [kinds, probe]);
  const pdfPage = await b.newPage({ viewport: { width: 816, height: 1056 } });
  for (const k of kinds) {
    await pdfPage.setContent(docs[k]);
    const d = await pdfPage.evaluate(() => getComputedStyle(document.querySelector('.approved-stamp')).display);
    ok(d === 'none', k + ': the document handed to the PDF converter hides the band (' + d + ')');
  }
  await pdfPage.setContent(docs.__none);
  const ctl = await pdfPage.evaluate(() => getComputedStyle(document.querySelector('.approved-stamp')).display);
  ok(ctl !== 'none', 'control: without the kind\'s pdfCss the same copy SHOWS the band (' + ctl + ') — the rule is what hides it');
  await pdfPage.close();

  console.log('\n## F. The agreements name THEIR job\'s approval, on both forms');
  // A was approved by Anthony on September 1; B is approved today through the real commit hook.
  await p.evaluate((id) => { const j = jobs.find(x => x.id === id);
    j.agrApproved = true; j.agrApprovedBy = 'Anthony Graziano'; j.agrApprovedAt = 'September 1, 2026'; saveJobs(); }, idA);
  const bandOf = (h) => { const m = String(h).match(/Approved by ([^<]+?) on ([^<]+?)<\/div>/); return m ? m[1] + ' | ' + m[2] : '(no band)'; };
  const fresh = await p.evaluate((id) => agreementHtml(jobs.find(j => j.id === id), null), idA);
  ok(bandOf(fresh) === 'Anthony Graziano | September 1, 2026', '⚠ on a fresh page A shows its own approval (' + bandOf(fresh) + ') — it used to show none');
  await p.evaluate((id) => { window.print = function () {}; docAction(id, 'agreement', 'print'); }, idB); await p.waitForTimeout(1200); await hookPrint();
  const bRec = await p.evaluate((id) => { const j = jobs.find(x => x.id === id); return [j.agrApprovedBy, j.agrApprovedAt]; }, idB);
  ok(bRec[0] === 'Ashley Jerome' && bRec[1] === TODAY_LONG, 'B is approved by Ashley, today, through the real stamp: ' + bRec.join(' / '));
  // ⚠ RESTATED 2026-09-30 (audit P14): the page globals that then described B are deleted, so nothing on the
  // page can hold another job's approval for a band to read.
  const pg = await p.evaluate(() => [typeof agrApproved, typeof agrApprovedBy, typeof agrApprovedAt]);
  ok(pg.every((t) => t === 'undefined'), 'the page keeps no copy of B\'s approval (' + pg.join(', ') + ')');
  const aStd = await p.evaluate((id) => agreementHtml(jobs.find(j => j.id === id), null), idA);
  ok(bandOf(aStd) === 'Anthony Graziano | September 1, 2026', '⚠⚠ A\'s agreement STILL names Anthony, September 1 (' + bandOf(aStd) + ') — it used to read Ashley, today');
  const aPacket = await p.evaluate((id) => signingPacketHtml(id), idA);
  ok(bandOf(aPacket) === 'Anthony Graziano | September 1, 2026', '⚠ the signing packet — the DocuSign HTML — carries A\'s own approval');
  const aEstate = await p.evaluate((id) => { const j = JSON.parse(JSON.stringify(jobs.find(x => x.id === id)));
    j.svc = 'probate'; j.executor = 'Tripp Butler'; j.matterType = 'probate'; j.deathDate = '2026-01-15';
    return agreementHtml(j, null); }, idA);
  has(aEstate, 'Tripp Butler', 'fixture: the estate form');
  ok(bandOf(aEstate) === 'Anthony Graziano | September 1, 2026', 'and the estate form names A\'s approval too (' + bandOf(aEstate) + ')');
  ok(bandOf(await p.evaluate((id) => agreementHtml(jobs.find(j => j.id === id), null), idB)) === 'Ashley Jerome | ' + TODAY_LONG, 'while B names its own');
  await p.evaluate((id) => docAction(id, 'agreement', 'view'), idA); await p.waitForTimeout(400);
  has(await p.evaluate(() => { const s = document.querySelector('#doc-viewer-body .approved-stamp'); return s ? s.textContent : ''; }),
    'Approved by Anthony Graziano on September 1, 2026', 'the viewer shows A\'s packet with A\'s band');
  await p.evaluate(() => closeDocViewer());

  console.log('\n## G. Overflow');
  for (const w of [1440, 390]) {
    await p.setViewportSize({ width: w, height: 900 });
    await p.evaluate((id) => goToClientDashboard(id), idB); await p.waitForTimeout(400);
    const ovD = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok(ovD <= 0, 'the dashboard fits at ' + w + 'px (overflow ' + ovD + ')');
    await p.evaluate((id) => docAction(id, 'invoice', 'view', { stage: 'final' }), idB); await p.waitForTimeout(300);
    const ovV = await p.evaluate(() => { const bx = document.querySelector('#doc-viewer-modal .modal-box, #doc-viewer-modal > div');
      const r = bx ? bx.getBoundingClientRect() : { left: 0, right: 0 }; return { l: r.left, r: r.right, vw: window.innerWidth,
        ov: document.documentElement.scrollWidth - document.documentElement.clientWidth }; });
    ok(ovV.l >= 0 && ovV.r <= ovV.vw + 0.5 && ovV.ov <= 0, 'the invoice viewer with its band fits at ' + w + 'px');
    await p.evaluate(() => closeDocViewer());
  }
  ok(errs.length === 0, 'no page errors (' + errs.join(' | ') + ')');

  await b.close();
  console.log('\nstep30: ' + pass + ' passed, ' + fail + ' failed');
})().catch(async e => {
  console.log('THREW ' + (e && e.stack || e));
  console.log('step30: ' + pass + ' passed, ' + (fail + 1) + ' failed');
  try { if (b) await b.close(); } catch (_) { /* already gone */ }
});
