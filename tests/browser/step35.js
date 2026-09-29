// Step 35 — Edit estimate goes once the signing packet is out, and a won client stays won through a
// re-priced estimate (2026-09-29, the two items flagged by step 29's build). Written as step 34 and
// renumbered on the merge: the concurrent feedback-strip / draft-copy session took 34 first.
//
// Anthony: "yes, withdraw Edit estimate once the packet is sent. if we are offering a discount, and
// therefore it is 'pending' how is it also 'won'?"
//
// Drives the REAL page: the real Client Dashboard and its rail, the real Edit estimate and Offer
// discount buttons, the real discount pop-up typed into and its Apply button, the real manager PIN
// modal (typed, so its own oninput fires checkPin), the real Deny modal, the real Build Estimate
// banner, and the real client list with its real Pending Approval filter button.
//
//   A. once the packet is out (the boolean, or DocuSign's record alone), Edit estimate is gone and
//      the door refuses; the estimate stays approved and Build Estimate says why it is locked
//   B. before the packet, Edit estimate is still there and still works
//   C. a WON client offered a discount reads "Won · Pending Re-approval", is on the Pending Approval
//      filter, and reads "Won" again after the manager's PIN — or after a deny
//   D. a client who has NOT said yes goes through the same steps reading exactly as before
//   E. overflow at 1440 and 390; no page errors
//
//   NODE_PATH=/opt/node22/lib/node_modules node tests/browser/step35.js [/abs/path/to/havellin.html]
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
    window.__mails = []; window.sendInternalEmail = function (to, subj, lines) { window.__mails.push({ subj: subj }); };
    window.open = function () { return null; };
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
  // The real Build Estimate, six rooms in scope; then approved and (optionally) won, the way the
  // manager's PIN and the Won modal leave a job.
  async function build(id, o) {
    await p.evaluate((id) => dashGoEstimate(id), id); await p.waitForTimeout(700);
    return p.evaluate(([id, o]) => {
      const js = document.getElementById('e-job'); js.value = String(id); if (js.onchange) js.onchange();
      for (let i = 0; i < 6; i++) setRoomState('r' + i, 'in');
      document.getElementById('e-discount').value = '0';
      calcAll();
      const e = JSON.parse(JSON.stringify(currentEstimate));
      estimateStore[id] = { approved: true, approvedBy: 'Anthony Graziano', estimate: e };
      const job = jobs.find(j => j.id === id);
      job.approved = true; job.status = 'approved'; job.estimateSentDate = 'September 20, 2026';
      Object.assign(job, o.job || {});
      // ⚠ NOT saveEstimateState(): it rebuilds the record from the page's approval globals, which
      // describe whichever estimate was last open, and would write this one back unapproved.
      saveJobs(); try { localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore)); } catch (x) {}
      return e;
    }, [id, o || {}]);
  }
  const text = (sel) => p.evaluate((sel) => { const e = document.querySelector(sel); return e ? e.textContent.replace(/\s+/g, ' ') : ''; }, sel);
  const click = async (sel) => { try { await p.click(sel); return true; } catch (e) { ok(false, 'could not press ' + sel); return false; } };
  const fill = async (sel, v) => { try { await p.fill(sel, v); return true; } catch (e) { ok(false, 'could not type into ' + sel); return false; } };
  const dash = async (id) => { await p.evaluate((id) => { showPanel('jobs', document.querySelector('.nb[onclick*="\'jobs\'"]')); openClientDashboard(id); }, id); await p.waitForTimeout(500); };
  const buttons = () => p.evaluate(() => Array.from(document.querySelectorAll('#client-dashboard-view button'))
    .map(x => ({ t: x.textContent.replace(/\s+/g, ' ').trim(), c: x.getAttribute('onclick') || '' })));
  // The status chip is the first badge in the header's chip row.
  const chip = () => p.evaluate(() => { const e = document.querySelector('#client-dashboard-view .dash-chips .badge'); return e ? e.textContent.trim() : ''; });
  const state = (id) => p.evaluate((id) => { const j = jobs.find(x => x.id === id), r = estimateStore[id] || {};
    return { status: j.status, won: isJobWon(j), approved: !!r.approved, submitted: !!r.submitted, agrApproved: !!j.agrApproved,
             pct: r.estimate ? r.estimate.discountPct : null }; }, id);
  // The real client list: the nav, the All filter, then the row's Status cell.
  const listCell = async (id, filter) => {
    await p.evaluate(() => { showPanel('jobs', document.querySelector('.nb[onclick*="\'jobs\'"]')); }); await p.waitForTimeout(250);
    await click('button.fb[onclick*="setFilter(\'' + (filter || 'all') + '\'"]'); await p.waitForTimeout(250);
    return p.evaluate((id) => {
      const rows = Array.from(document.querySelectorAll('#jobs-body tr'));
      const row = rows.find(r => (r.getAttribute('onclick') || '').indexOf('(' + id + ')') >= 0 || r.innerHTML.indexOf('(' + id + ')') >= 0);
      if (!row) return null;
      const cells = Array.from(row.children).map(c => c.textContent.replace(/\s+/g, ' ').trim());
      const i = JOB_LIST_COLS.indexOf('status');
      return cells[i] || '';
    }, id);
  };
  const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

  // ── A. the packet is out ─────────────────────────────────────────────────
  console.log('\n## A. once the signing packet is out, Edit estimate is gone and the door refuses');
  const idS = await make('Sent');
  await build(idS, { job: { won: true, status: 'won', agrApproved: true, agrApprovedBy: 'Anthony Graziano', agrApprovedAt: 'September 21, 2026',
    agrSent: true, agrSentAt: 'September 22, 2026' } });
  await dash(idS);
  const bS = await buttons();
  ok(!bS.some(x => /dashEditEstimate/.test(x.c)), '⚠⚠ no Edit estimate anywhere on the dashboard once the packet is sent');
  ok(!bS.some(x => /dashOfferDiscount/.test(x.c)), 'nor Offer discount (the rule it shares)');
  ok(bS.some(x => x.c === "docAction(" + idS + ",'estimate','view')"), 'the estimate can still be read');
  await p.evaluate((id) => dashEditEstimate(id), idS); await p.waitForTimeout(300);
  has(await text('#dash-fb'), 'The signing packet has gone to the client with this price as its Exhibit A.', '⚠⚠ the door refuses, on the dashboard');
  has(await text('#dash-fb'), 'change order, not an edit to the estimate', 'naming the route that remains');
  const sS = await state(idS);
  ok(sS.approved && sS.agrApproved, '⚠⚠ and nothing was un-approved — the estimate and the agreement both stand');
  ok(await p.evaluate(() => document.getElementById('panel-jobs').classList.contains('active')), 'nor did it navigate to Build Estimate');
  // DocuSign writes the record and never the boolean.
  const idD = await make('Docu');
  await build(idD, { job: { won: true, status: 'won', agrApproved: true, agrApprovedBy: 'Anthony Graziano', agrApprovedAt: 'September 21, 2026',
    docState: { agreement: { sentAt: '2026-09-22T10:00:00Z', sentBy: 'Ashley Jerome', esign: { envelopeId: 'env-1', provider: 'docusign' } } } } });
  await dash(idD);
  ok(!(await buttons()).some(x => /dashEditEstimate/.test(x.c)), '⚠ gone on a DocuSign send too (the record, not the boolean)');
  await p.evaluate((id) => dashEditEstimate(id), idD); await p.waitForTimeout(300);
  ok((await state(idD)).approved, 'and the door refuses there as well');
  // Build Estimate, reached by the view door, says why the form is locked.
  await p.evaluate((id) => dashGoEstimate(id), idS); await p.waitForTimeout(700);
  has(await text('#est-approved-banner'), 'Estimate Locked — Signing Packet Sent', '⚠ Build Estimate’s banner names the packet');
  lacks(await text('#est-approved-banner'), 'use Edit Estimate or Offer Discount', 'and offers neither withdrawn button');
  // The retired tab's panel door, primed the way the dashboard primes it.
  await dash(idS);
  await p.evaluate((id) => { _primeEstimateFor(id); editEstimateFromCE(); }, idS); await p.waitForTimeout(300);
  ok((await state(idS)).approved, '⚠ the Client Estimate panel’s own Edit door refuses too');
  ok(await p.evaluate(() => getComputedStyle(document.getElementById('btn-edit-est')).display === 'none'), 'and its button is hidden');
  // A signed agreement: the door used to check nothing at all.
  const idG = await make('Signed');
  await build(idG, { job: { won: true, status: 'active', agrApproved: true, agrSent: true, agrSigned: true, agrSignedAt: 'September 23, 2026' } });
  await p.evaluate((id) => dashEditEstimate(id), idG); await p.waitForTimeout(300);
  ok((await state(idG)).approved, '⚠ a signed agreement’s estimate cannot be un-approved from the door');

  // ── B. before the packet ─────────────────────────────────────────────────
  console.log('\n## B. before the packet goes out, Edit estimate is there and works');
  const idE = await make('Before');
  await build(idE, { job: { won: true, status: 'won' } });
  await dash(idE);
  ok((await buttons()).some(x => x.c === 'dashEditEstimate(' + idE + ')'), 'Edit estimate is on the rail');
  await click('button[onclick="dashEditEstimate(' + idE + ')"]'); await p.waitForTimeout(700);
  ok(await p.evaluate(() => document.getElementById('panel-estimate').classList.contains('active')), 'the real button opens Build Estimate');
  const sE = await state(idE);
  ok(!sE.approved, 'with the estimate un-approved, so it can be edited');
  ok(sE.status === 'won' && sE.won, 'and the client is still won');

  // ── C. a won client re-priced ────────────────────────────────────────────
  console.log('\n## C. a won client offered a discount stays won — pending re-approval, then won again');
  const idW = await make('Won');
  await build(idW, { job: { won: true, status: 'won', wonBy: 'Ashley Jerome', wonMethod: 'call', wonAt: '2026-09-21' } });
  await dash(idW);
  ok((await chip()) === 'Won', 'the header reads Won');
  await click('button[onclick="dashOfferDiscount(' + idW + ')"]'); await p.waitForTimeout(300);
  await fill('#dm-pct', '10'); await p.evaluate(() => updateDiscountModal());
  await click('#discount-modal .btn-p'); await p.waitForTimeout(500);
  const sW = await state(idW);
  ok(sW.pct === 10 && !sW.approved && sW.submitted, 'the real pop-up applied 10% and sent the estimate back to the manager');
  ok(sW.status === 'pending' && sW.won, 'the job holds pending — the manager’s signal — and is still won');
  await dash(idW);
  ok((await chip()) === 'Won · Pending Re-approval', '⚠⚠ the header reads BOTH facts: Won · Pending Re-approval (was "Pending Approval")');
  ok((await listCell(idW)) === 'Won · Pending Re-approval', '⚠⚠ and so does the client list');
  ok((await listCell(idW, 'pending')) === 'Won · Pending Re-approval', '⚠ it is on the real Pending Approval filter, where the manager works from');
  // The real rail offers the PIN; the real PIN modal is typed into.
  await dash(idW);
  ok((await buttons()).some(x => x.c === 'dashApproveEstimate(' + idW + ')'), 'the rail offers Manager approval');
  await click('button[onclick="dashApproveEstimate(' + idW + ')"]'); await p.waitForTimeout(300);
  await fill('#pin-input', '3010'); await p.waitForTimeout(600);
  const sW2 = await state(idW);
  ok(sW2.approved && sW2.pct === 10, 'the real PIN approved the discounted estimate');
  ok(sW2.status === 'won', '⚠⚠ and the job reads WON again — never "Approved — Awaiting Client" on a client who said yes');
  await dash(idW);
  ok((await chip()) === 'Won', 'the header reads Won');
  ok((await listCell(idW)) === 'Won', 'the list reads Won');
  ok((await listCell(idW, 'pending')) === null, 'and it has left the Pending Approval filter');
  // A deny sends the price back to the concierge — and must not send the client back to "New".
  await dash(idW);
  await click('button[onclick="dashOfferDiscount(' + idW + ')"]'); await p.waitForTimeout(300);
  await fill('#dm-pct', '5'); await p.evaluate(() => updateDiscountModal());
  await click('#discount-modal .btn-p'); await p.waitForTimeout(500);
  ok((await state(idW)).status === 'pending', 'a second discount holds pending again');
  await dash(idW);
  await click('button[onclick="dashDenyEstimate(' + idW + ')"]'); await p.waitForTimeout(300);
  await fill('#deny-reason', 'Hold the original price.'); await fill('#deny-pin', '3010');
  await click('#deny-modal button[onclick="submitDeny()"]'); await p.waitForTimeout(500);
  const sW3 = await state(idW);
  ok(!sW3.approved && !sW3.submitted, 'the real deny sent it back to the concierge');
  ok(sW3.status === 'won' && sW3.won, '⚠⚠ and the job reads WON — a deny used to write "New" over a client who had said yes');
  await dash(idW);
  ok((await chip()) === 'Won', 'the header reads Won after the deny');

  // ── D. before the yes, nothing changed ───────────────────────────────────
  console.log('\n## D. a client who has not said yes reads exactly as before');
  const idN = await make('NotYet');
  await build(idN, {});
  await dash(idN);
  ok((await chip()) === 'Approved — Awaiting Client', 'an approved estimate awaiting the client reads Approved — Awaiting Client');
  await click('button[onclick="dashOfferDiscount(' + idN + ')"]'); await p.waitForTimeout(300);
  await fill('#dm-pct', '10'); await p.evaluate(() => updateDiscountModal());
  await click('#discount-modal .btn-p'); await p.waitForTimeout(500);
  await dash(idN);
  ok((await chip()) === 'Pending Approval', 'a discount reads Pending Approval — no "Won"');
  ok((await listCell(idN, 'pending')) === 'Pending Approval', 'on the Pending Approval filter');
  await dash(idN);
  await click('button[onclick="dashApproveEstimate(' + idN + ')"]'); await p.waitForTimeout(300);
  await fill('#pin-input', '3010'); await p.waitForTimeout(600);
  const sN = await state(idN);
  ok(sN.status === 'approved' && !sN.won, 'the PIN returns it to approved, still not won');
  await dash(idN);
  ok((await chip()) === 'Approved — Awaiting Client', 'reading Approved — Awaiting Client');

  // ── E. overflow, errors ──────────────────────────────────────────────────
  console.log('\n## E. overflow and page errors');
  await dash(idW);
  ok((await overflow()) <= 0, 'the dashboard at 1440px has no horizontal overflow');
  await listCell(idW);
  ok((await overflow()) <= 0, 'nor the client list');
  await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(300);
  await dash(idW);
  ok((await overflow()) <= 0, 'the dashboard at 390px has no horizontal overflow');
  ok(errs.length === 0, 'no page errors' + (errs.length ? ' — ' + errs.slice(0, 3).join(' | ') : ''));

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  await b.close();
  process.exit(fail ? 1 : 0);
})().catch(async e => { console.log('THREW: ' + (e && e.stack || e)); console.log(pass + ' passed, ' + (fail + 1) + ' failed'); if (b) await b.close(); process.exit(1); });
