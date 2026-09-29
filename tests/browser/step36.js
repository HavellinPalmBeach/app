// Step 36 — a raise after Won asks the client again, a draft made before a price change says so, and
// Edit estimate waits for the manager's PIN (2026-09-29). Anthony's answers to the three things the
// Edit-estimate build (step 35) left open: "1 yes, 2 warning is fine, 3 hide until PIN".
//
// Drives the REAL page: the real Client Dashboard and its rail, the real Send estimate / I've sent it /
// Client accepted buttons (only `gmailCreateDraft` is stubbed, so the real docAction → docSend → provider →
// docRecordSent chain runs), the real Edit estimate, the real Build Estimate Save, the real Submit for
// approval, the real manager PIN typed into its modal, the real discount pop-up and the real Won modal.
//
//   A. a won client's estimate edited UP and re-approved: the send is lit again for the revised estimate,
//      the acceptance reopens, the packet is a preview, the status reads "Won · Awaiting Re-acceptance",
//      the Job Plan stays open; the revised estimate sent and the new yes recorded through the modal
//      (which asks about the new figure) brings the packet back — the earlier yes kept beside it
//   B. a draft made before a discount (and before an edit) says so on its row, its button becomes an
//      ordinary send, the confirming tap is refused on it, and a fresh draft goes through as normal
//   C. Edit estimate is withheld on every row while the manager has the estimate, and the door refuses
//   D. before the client's yes, a raise reopens the send only; a job recorded before today is asked nothing
//   E. overflow at 1440 and 390 (the Won modal at 390 included); no page errors
//
//   NODE_PATH=/opt/node22/lib/node_modules node tests/browser/step36.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
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
    // Captured rather than sent: a mailto in a headless browser navigates away from the page under test.
    window.__mails = []; window.sendInternalEmail = function (to, subj) { window.__mails.push({ subj: subj }); };
    window.__opened = []; window.open = function (u) { window.__opened.push(String(u || '')); return null; };
    // ⚠ The ONE stub on the send path: Gmail itself. Everything from the band's button to the send record is real.
    window.__drafts = 0;
    window.gmailCreateDraft = function (mime, cb) { window.__drafts++; cb(true, { draftId: 'r-' + window.__drafts, messageId: 'm-' + window.__drafts }); };
  });
  const future = (() => { const d = new Date(); d.setDate(d.getDate() + 30);
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10); })();

  async function make(last) {
    await p.evaluate(() => { const b = document.getElementById('btn-add-client'); if (b) b.click(); }); await p.waitForTimeout(300);
    const id = await p.evaluate(([wt, last]) => {
      const set = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; if (e.onchange) e.onchange(); } };
      const pick = (id) => { const e = document.getElementById(id); const o = e && Array.from(e.options).find(x => x.value); if (o) { e.value = o.value; if (e.onchange) e.onchange(); } };
      set('i-svc', 'home_cleanout'); toggleIntakeFields();
      set('i-fname', 'Pat'); set('i-lname', last); set('i-addr', '1 A St'); set('i-city', 'Palm Beach'); set('i-zip', '33480');
      set('i-sqft', '3500'); set('i-phone', '(561) 555-0199'); set('i-email', 'c@example.com'); set('i-home-value', '4200000');
      pick('i-ptype'); pick('i-src'); set('i-walkthrough', wt);
      const st = new Date(wt); st.setDate(st.getDate() + 7); while (st.getDay() === 0 || st.getDay() === 6) st.setDate(st.getDate() + 1);
      set('i-start', st.toISOString().slice(0, 10)); saveIntake(); return (jobs[0] || {}).id;
    }, [future, last]);
    await p.waitForTimeout(1500); return id;
  }
  // The real Build Estimate, six rooms in scope; then approved the way the manager's PIN leaves it.
  // ⚠ NOT saveEstimateState(): it rebuilds the record from the page's approval GLOBALS, which describe whichever
  // estimate was last open, and would write this one back unapproved (step 35 records the trap).
  async function build(id, o) {
    await p.evaluate((id) => dashGoEstimate(id), id); await p.waitForTimeout(700);
    return p.evaluate(([id, o]) => {
      const js = document.getElementById('e-job'); js.value = String(id); if (js.onchange) js.onchange();
      for (let i = 0; i < 6; i++) setRoomState('r' + i, 'in');
      document.getElementById('e-discount').value = '0';
      calcAll();
      const e = JSON.parse(JSON.stringify(currentEstimate));
      if (o.total) e.havellinTotal = o.total;
      estimateStore[id] = { approved: true, approvedBy: 'Anthony Graziano', estimate: e };
      const job = jobs.find(j => j.id === id);
      job.approved = true; job.status = 'approved';
      Object.assign(job, o.job || {});
      saveJobs(); try { localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore)); } catch (x) {}
      return e.havellinTotal;
    }, [id, o || {}]);
  }
  const text = (sel) => p.evaluate((sel) => { const e = document.querySelector(sel); return e ? e.textContent.replace(/\s+/g, ' ') : ''; }, sel);
  const fill = async (sel, v) => { try { await p.fill(sel, v); return true; } catch (e) { ok(false, 'could not type into ' + sel); return false; } };
  const dash = async (id) => { await p.evaluate((id) => { showPanel('jobs', document.querySelector('.nb[onclick*="\'jobs\'"]')); openClientDashboard(id); }, id); await p.waitForTimeout(500); };
  const buttons = () => p.evaluate(() => Array.from(document.querySelectorAll('#client-dashboard-view button'))
    .map(x => ({ t: x.textContent.replace(/\s+/g, ' ').trim(), c: x.getAttribute('onclick') || '' })));
  // Presses the ONE button on the dashboard carrying exactly this onclick — the count is asserted, so a control
  // rendered twice (or not at all) is caught rather than pressed blind.
  const press = async (call, what) => {
    const n = await p.evaluate((call) => Array.from(document.querySelectorAll('#client-dashboard-view button'))
      .filter(x => x.getAttribute('onclick') === call).length, call);
    if (n !== 1) { ok(false, (what || call) + ' — expected one button, found ' + n); return false; }
    try { await p.click('#client-dashboard-view button[onclick="' + call + '"]'); } catch (e) { ok(false, 'could not press ' + call); return false; }
    await p.waitForTimeout(500); return true;
  };
  const band = () => p.evaluate(() => { const e = document.querySelector('#client-dashboard-view .jt-next'); return e ? e.textContent.replace(/\s+/g, ' ') : ''; });
  const bandPrimary = () => p.evaluate(() => { const e = document.querySelector('#client-dashboard-view .jt-next .jt-btn-p');
    return e ? { t: e.textContent.replace(/\s+/g, ' ').trim(), c: e.getAttribute('onclick') || '' } : { t: '', c: '' }; });
  const rail = () => p.evaluate(() => { const e = document.querySelector('#client-dashboard-view .jt'); return e ? e.textContent.replace(/\s+/g, ' ') : ''; });
  const chip = () => p.evaluate(() => { const e = document.querySelector('#client-dashboard-view .dash-chips .badge'); return e ? e.textContent.trim() : ''; });
  const job = (id) => p.evaluate((id) => JSON.parse(JSON.stringify(jobs.find(x => x.id === id) || {})), id);
  const lit = (id) => p.evaluate((id) => { const j = jobs.find(x => x.id === id), r = estimateStore[id];
    const n = jobTimelineNext(jobTimeline(j, r, jobLogEntries(id), [])); return n ? n.key : ''; }, id);
  const money = (x) => p.evaluate((x) => fmtMoney(x), x);
  const listCell = async (id) => {
    await p.evaluate(() => { showPanel('jobs', document.querySelector('.nb[onclick*="\'jobs\'"]')); }); await p.waitForTimeout(250);
    try { await p.click('button.fb[onclick*="setFilter(\'all\'"]'); } catch (e) {}
    await p.waitForTimeout(250);
    return p.evaluate((id) => {
      const row = Array.from(document.querySelectorAll('#jobs-body tr'))
        .find(r => (r.getAttribute('onclick') || '').indexOf('(' + id + ')') >= 0 || r.innerHTML.indexOf('(' + id + ')') >= 0);
      if (!row) return null;
      const cells = Array.from(row.children).map(c => c.textContent.replace(/\s+/g, ' ').trim());
      return cells[JOB_LIST_COLS.indexOf('status')] || '';
    }, id);
  };
  const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  // The real Won modal, answered the way a person does: the method picked, the note typed, the button pressed.
  const answerWon = async (method, note) => {
    try { await p.selectOption('#won-method', method); } catch (e) { ok(false, 'could not pick the method'); }
    await fill('#won-note', note);
    try { await p.click('#won-modal button[onclick="confirmMarkWon()"]'); } catch (e) { ok(false, 'could not press the Won modal button'); }
    await p.waitForTimeout(600);
  };
  // The real PIN, typed — the modal's own oninput fires checkPin.
  const pin = async () => { await fill('#pin-input', '3010'); await p.waitForTimeout(700); };

  // ── A. a raise after Won ─────────────────────────────────────────────────
  console.log('\n## A. a won client’s estimate edited up asks the client again — and the job stays won');
  const idA = await make('Raise');
  const P1 = await build(idA);
  await dash(idA);
  // The estimate goes out the real way: Send estimate, then I've sent it.
  ok(await press('docAction(' + idA + ",'estimate','send')", 'Send estimate'), 'the band sends the estimate');
  ok(await press('markDocSent(' + idA + ",'estimate')", 'I’ve sent it'), 'and the send is confirmed');
  ok((await job(idA)).estimateSentTotal === P1, '⚠ the send recorded the price that went (' + P1 + ')');
  // The client says yes, through the real modal.
  ok(await press('openWonModal(' + idA + ')', 'Client accepted — mark won'), 'the acceptance button');
  has(await text('#won-modal'), 'Client Accepted the Estimate', 'a first yes reads as one');
  await answerWon('email', 'Accepted by email');
  const jA1 = await job(idA);
  ok(jA1.won === true && jA1.acceptedTotal === P1, '⚠ won, with the price they said yes to recorded (' + P1 + ')');
  // The estimate edited UP: the real Edit estimate, two more rooms, the real Save, Submit and PIN.
  await dash(idA);
  ok(await press('dashEditEstimate(' + idA + ')', 'Edit estimate'), 'Edit estimate before the packet');
  await p.waitForTimeout(500);
  ok(await p.evaluate(() => document.getElementById('panel-estimate').classList.contains('active')), 'Build Estimate is open, unlocked');
  // ⚠ Ticking two more rooms does not raise it: volume is averaged over the rooms scored and applied to the whole
  // sqft. The house turning out fuller than the walkthrough scored it — the real Packed chip — does.
  try { await p.click('#volpreset-packed'); } catch (e) { ok(false, 'could not press the Packed chip'); }
  await p.waitForTimeout(400);
  const P2 = await p.evaluate(() => { calcAll(); return currentEstimate.havellinTotal; });
  ok(P2 > P1, 'the house scored fuller raises the price (' + P1 + ' → ' + P2 + ')');
  try { await p.click('button[onclick="saveEstimateAndPreview()"]'); } catch (e) { ok(false, 'could not press Save'); }
  await p.waitForTimeout(1200);
  await dash(idA);
  ok(await press('dashSubmitEstimate(' + idA + ')', 'Submit for approval'), 'submitted to the manager');
  ok(await press('dashApproveEstimate(' + idA + ')', 'Manager approval'), 'the rail offers the PIN');
  await pin();
  const was = await money(P1), now = await money(P2);
  const fbA = await text('#dash-fb');
  has(fbA, 'The client accepted ' + was + ' and the approved estimate is now ' + now, '⚠⚠ the manager is told where the PIN was typed');
  has(fbA, 'record their acceptance again before the signing packet goes out', 'and what the concierge now owes the client');
  const tcMail = await p.evaluate(() => { const m = window.__opened.filter(u => /^mailto:/.test(u) && /Estimate%20Approved/.test(u)).pop();
    return m ? decodeURIComponent(m.split('&body=')[1] || '') : ''; });
  has(tcMail, 'record their acceptance again before the signing packet goes out', '⚠ the concierge’s email carries the same sentence');
  const jA2 = await job(idA);
  ok(jA2.won === true && jA2.status === 'won', '⚠ the job is still WON after the re-approval');
  await dash(idA);
  ok((await lit(idA)) === 'estimate_sent', '⚠⚠ the lit step is the send again — the client has the estimate at ' + was);
  const bpA = await bandPrimary();
  ok(bpA.t.indexOf('Send revised estimate') >= 0, '⚠ the one filled button sends the REVISED estimate (' + bpA.t + ')');
  has(await rail(), 'Sent at ' + was + ' — the approved estimate is now ' + now + ', so the client needs the revised one', 'the send row names both figures');
  has(await rail(), 'Accepted ' + was + ' — the approved estimate is now ' + now + ', so they are asked again', 'and the acceptance row says why it reopened');
  ok((await chip()) === 'Won · Awaiting Re-acceptance', '⚠⚠ the header reads both facts: Won · Awaiting Re-acceptance (' + (await chip()) + ')');
  ok((await listCell(idA)) === 'Won · Awaiting Re-acceptance', 'and so does the client list');
  await dash(idA);
  ok(!(await buttons()).some(x => /'agreement','send'/.test(x.c)), '⚠ nothing offers to send the packet at the new price');
  await p.evaluate((id) => docAction(id, 'agreement', 'print'), idA); await p.waitForTimeout(400);
  has(await text('#dash-fb'), 'before the agreement goes out', '⚠ printing the packet is refused, in the packet’s words');
  await p.evaluate((id) => docAction(id, 'agreement', 'view'), idA); await p.waitForTimeout(600);
  ok(await p.evaluate(() => getComputedStyle(document.getElementById('doc-viewer-modal')).display !== 'none'), 'the packet opens in the viewer');
  has(await text('#doc-viewer-title'), 'PREVIEW', 'the packet may be READ — a preview at the new price');
  ok(await p.evaluate(() => getComputedStyle(document.getElementById('doc-viewer-print')).display === 'none'), 'with no Print on it');
  await p.evaluate(() => { if (typeof closeDocViewer === 'function') closeDocViewer(); });
  // The Job Plan stays open: the job is won.
  await p.evaluate((id) => openJobPlanFor(id), idA); await p.waitForTimeout(700);
  const planA = await text('#job-plan-content');
  lacks(planA, 'has not been won yet', '⚠ the Job Plan stays open — staffing does not wait on the re-acceptance');
  lacks(planA, 'Job Plan generates once', 'and the raised estimate is approved, so the plan renders');
  // The revised estimate goes out, the real way.
  await dash(idA);
  ok(await press('docAction(' + idA + ",'estimate','send')", 'Send revised estimate'), 'the revised estimate is drafted');
  ok(await press('markDocSent(' + idA + ",'estimate')", 'I’ve sent it (revised)'), '⚠ a SECOND draft after a send waits on its confirming tap');
  ok((await job(idA)).estimateSentTotal === P2, 'the send now records the revised price (' + P2 + ')');
  ok((await lit(idA)) === 'client_accepted', '⚠⚠ and the acceptance is the lit step');
  ok((await bandPrimary()).t.indexOf('Client accepted the revised price') >= 0, 'the button names the revised price');
  ok((await buttons()).some(x => x.c === 'openCloseoutModal(' + idA + ')'), 'with Mark lost beside it — a client can say no to a higher price');
  // The real modal asks about the NEW figure.
  ok(await press('openWonModal(' + idA + ')', 'Client accepted the revised price'), 'the acceptance modal opens');
  ok((await text('#won-title')) === 'Client Accepted the Revised Price', '⚠⚠ the modal names what is being accepted');
  const subA = await text('#won-sub');
  has(subA, 'They accepted ' + was, 'the figure they accepted');
  has(subA, now, 'and the one they are being asked about now');
  has(subA, 'nothing about staffing changes', 'and that the job is already won');
  ok((await text('#won-go')).indexOf('Record Acceptance') === 0, 'the button records an acceptance, not a win');
  // The modal at a phone width, while it is open.
  await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(300);
  ok(await p.evaluate(() => { const r = document.querySelector('#won-modal .modal-box').getBoundingClientRect(); return r.left >= 0 && r.right <= window.innerWidth + 0.5; }),
    'the Won modal fits the phone width');
  await p.setViewportSize({ width: 1440, height: 1000 }); await p.waitForTimeout(300);
  await answerWon('call', 'Said yes to the revised figure on the phone');
  const jA3 = await job(idA);
  ok(jA3.acceptedTotal === P2, '⚠⚠ the price they said yes to is now the approved one (' + P2 + ')');
  ok(Array.isArray(jA3.priorAcceptances) && jA3.priorAcceptances.length === 1 && jA3.priorAcceptances[0].total === P1
    && jA3.priorAcceptances[0].method === 'email', '⚠ the earlier yes is kept beside it — figure, method and all');
  has(await text('#sync-status'), 'Acceptance of the revised price recorded', 'the confirmation says what was recorded');
  await dash(idA);
  ok((await chip()) === 'Won', 'the header reads Won again');
  ok((await lit(idA)) === 'agreement_sent', 'and the packet is the next step');
  ok((await bandPrimary()).c === 'docAction(' + idA + ",'agreement','send')", 'with its send button back');

  // ── B. a draft made before a price change ────────────────────────────────
  console.log('\n## B. a draft made before a discount — and before an edit — says so, and is never recorded as sent');
  const idB = await make('Stale');
  const PB = await build(idB);
  await dash(idB);
  ok(await press('docAction(' + idB + ",'estimate','send')", 'Send estimate'), 'the estimate is drafted');
  ok((await buttons()).some(x => x.c === 'markDocSent(' + idB + ",'estimate')"), 'and waits on its confirming tap');
  // A discount before it was ever sent.
  ok(await press('dashOfferDiscount(' + idB + ')', 'Offer discount'), 'Offer discount');
  await fill('#dm-pct', '10'); await p.evaluate(() => updateDiscountModal());
  try { await p.click('#discount-modal .btn-p'); } catch (e) { ok(false, 'could not press Apply'); }
  await p.waitForTimeout(600);
  const fbB = await text('#dash-fb');
  has(fbB, 'A draft made before this still has the old price', '⚠ the discount’s confirmation names the draft still in the mailbox');
  ok((await job(idB)).docState.estimate.staleWhy === 'discount-revised', 'the draft is marked, with why');
  await dash(idB);
  ok(await press('dashApproveEstimate(' + idB + ')', 'Manager approval'), 'the manager re-approves');
  await pin();
  await dash(idB);
  const railB = await rail();
  has(railB, 'The estimate draft in Gmail was made before the discount changed the price — delete it', '⚠⚠ the row names the stale draft');
  const bpB = await bandPrimary();
  ok(bpB.c === 'docAction(' + idB + ",'estimate','send')", '⚠⚠ the one filled button is an ordinary send — never “I’ve sent it” on the old price (' + bpB.t + ')');
  ok(!(await buttons()).some(x => x.c === 'markDocSent(' + idB + ",'estimate')"), 'the confirming tap is not offered');
  ok((await buttons()).some(x => /Open the old estimate draft to delete it/.test(x.t)), 'the old draft is offered to delete');
  await p.evaluate((id) => markDocSent(id, 'estimate'), idB); await p.waitForTimeout(400);
  has(await text('#dash-fb'), 'made before the price changed', '⚠ the door behind the button refuses it too');
  ok(!(await job(idB)).estimateSentDate, 'and nothing was recorded as sent');
  // A fresh draft at the price that stands goes through as normal.
  ok(await press('docAction(' + idB + ",'estimate','send')", 'Send estimate (fresh)'), 'a fresh draft');
  const jB = await job(idB);
  ok(!jB.docState.estimate.staleAt, 'carries no mark');
  ok(await press('markDocSent(' + idB + ",'estimate')", 'I’ve sent it (fresh)'), 'and its confirming tap is back');
  ok((await job(idB)).estimateSentTotal < PB, 'the send records the discounted price');
  // An edit marks a draft the same way.
  const idE = await make('Edited');
  await build(idE);
  await dash(idE);
  ok(await press('docAction(' + idE + ",'estimate','send')", 'Send estimate'), 'drafted');
  ok(await press('dashEditEstimate(' + idE + ')', 'Edit estimate'), 'then Edit estimate');
  await p.waitForTimeout(500);
  ok((await job(idE)).docState.estimate.staleWhy === 'estimate-edited', '⚠ an edit marks the draft still waiting');
  has(await text('#sync-status'), 'still has the old price', 'and the warning is the toast left on screen');
  await dash(idE);
  has(await rail(), 'made before the estimate was edited', 'the row names the edit');

  // ── C. out for approval ──────────────────────────────────────────────────
  console.log('\n## C. Edit estimate waits for the PIN');
  const idC = await make('Pending');
  await build(idC, { job: { estimateSentDate: 'September 20, 2026' } });
  await dash(idC);
  ok(await press('dashOfferDiscount(' + idC + ')', 'Offer discount'), 'a discount sends it to the manager');
  await fill('#dm-pct', '5'); await p.evaluate(() => updateDiscountModal());
  try { await p.click('#discount-modal .btn-p'); } catch (e) { ok(false, 'could not press Apply'); }
  await p.waitForTimeout(600);
  await dash(idC);
  ok((await lit(idC)) === 'estimate_approved', 'the manager’s step is lit');
  const bC = await buttons();
  ok(!bC.some(x => /dashEditEstimate/.test(x.c)), '⚠⚠ no Edit estimate anywhere on the dashboard while a manager has the estimate');
  ok(bC.some(x => x.c === 'dashApproveEstimate(' + idC + ')'), 'the PIN is the one next move');
  await p.evaluate((id) => dashEditEstimate(id), idC); await p.waitForTimeout(400);
  has(await text('#dash-fb'), 'out for manager approval, so it cannot be edited', '⚠ the door refuses');
  has(await text('#dash-fb'), 'once a manager approves it or denies it', 'saying when it opens again');
  ok(await p.evaluate(() => document.getElementById('panel-jobs').classList.contains('active')), 'and Build Estimate was not opened');
  ok(await p.evaluate((id) => !!(estimateStore[id] && estimateStore[id].submitted), idC), 'the estimate is still with the manager');
  await dash(idC);
  ok(await press('dashApproveEstimate(' + idC + ')', 'Manager approval'), 'the PIN');
  await pin();
  await dash(idC);
  ok((await buttons()).some(x => x.c === 'dashEditEstimate(' + idC + ')'), 'once approved, Edit estimate is back');

  // ── D. before the yes, and a job recorded before today ───────────────────
  console.log('\n## D. before the yes a raise reopens the send only; a job recorded before today is asked nothing');
  const idD = await make('PreWon');
  const PD = await build(idD, { job: { estimateSentDate: 'September 18, 2026' } });
  await p.evaluate(([id, t]) => { const j = jobs.find(x => x.id === id); j.estimateSentTotal = t; saveJobs(); }, [idD, PD - 1500]);
  await dash(idD);
  ok((await lit(idD)) === 'estimate_sent', 'the send is lit again');
  ok((await bandPrimary()).t.indexOf('Send revised estimate') >= 0, 'for the revised estimate');
  ok((await chip()) === 'Approved — Awaiting Client', 'the status is unchanged — nobody has said yes');
  lacks(await rail(), 'so they are asked again', 'and the acceptance row asks nothing');
  const idL = await make('Legacy');
  await build(idL, { job: { won: true, status: 'won', wonAt: '2026-09-12', wonBy: 'Ashley Jerome', wonMethod: 'email',
    estimateSentDate: 'September 10, 2026' } });
  await dash(idL);
  ok((await chip()) === 'Won', 'a job recorded before today reads Won — there is no figure to compare');
  ok((await lit(idL)) === 'agreement_sent', 'and the packet is next, as it always was');

  // ── E. overflow, errors ──────────────────────────────────────────────────
  console.log('\n## E. overflow and page errors');
  await dash(idB);
  ok((await overflow()) <= 0, 'the dashboard with a stale draft at 1440px has no horizontal overflow');
  await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(300);
  await dash(idB);
  ok((await overflow()) <= 0, 'nor at 390px');
  await dash(idD);
  ok((await overflow()) <= 0, 'the revised-estimate band at 390px has none');
  ok(errs.length === 0, 'no page errors' + (errs.length ? ' — ' + errs.slice(0, 3).join(' | ') : ''));

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  await b.close();
  process.exit(fail ? 1 : 0);
})().catch(async e => { console.log('THREW: ' + (e && e.stack || e)); console.log(pass + ' passed, ' + (fail + 1) + ' failed'); if (b) await b.close(); process.exit(1); });
