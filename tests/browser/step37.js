// Step 37 — a Gmail draft a price change left behind is named, and is never confirmed as sent (2026-09-29).
//
// Anthony: "just flag a previous Gmail draft if a discount is offered."
//
// Measured on the build before this, through the same buttons: a signing packet drafted by email at the
// old price, a 10% discount, the manager's PIN — and the band then offered only "✓ I've sent it" and the
// link to that old draft. Pressing the first recorded the old-price packet as SENT. The discount's own
// confirmation was painted onto a strip the redraw wiped on the same tick.
//
// Drives the REAL page: the real Client Dashboard, the real paper-route Send button (Gmail's drafts API
// is routed, so the real MIME the app builds is read back), the real Offer discount button and pop-up,
// its Apply button, the real manager PIN modal typed into, and the real "✓ I've sent it" button.
//
//   A. a packet drafted by email offers the confirming tap and the link to the draft, as before
//   B. the pop-up names that draft BEFORE the discount, and keeps it on screen while you type
//   C. the confirmation after Apply names it too, and survives the redraw
//   D. after the discount and after the manager's PIN: no confirming tap and no draft link anywhere,
//      Send is back, the row names the old draft, and a direct markDocSent is refused
//   E. a fresh send: a second draft at the NEW price, the notice says which to delete, the old one is
//      kept on record, the tap is back over the new draft and records it
//   F. the edit door: an estimate drafted by email, then Edit estimate — the row names it the same way
//   G. overflow at 1440 and 390; no page errors
//   H. Submit for approval: the notice the same watch used to wipe stays on screen (run before G)
//
//   NODE_PATH=/opt/node22/lib/node_modules node tests/browser/step37.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
const SYNC = 'https://script.google.com/macros/s/STEP36/exec';
const BOX = 'anthony@havellinpalmbeach.com';
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');
// The day a draft is named by, worked out HERE rather than asked of the page: the calendar the browser
// runs on (timezoneId below), never a slice of the UTC stamp.
const dayOf = (iso) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' });
const money = (n) => '$' + Math.round(n).toLocaleString('en-US');
(async () => {
  b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
  const p = await ctx.newPage();
  p.setDefaultTimeout(8000);
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  p.on('dialog', async d => { await d.accept(); });
  const drafts = [];   // every draft the app asked Gmail to create, raw MIME
  await p.route('https://gmail.googleapis.com/gmail/v1/users/me/drafts', async (r) => {
    const body = JSON.parse(r.request().postData() || '{}');
    const raw = Buffer.from(String(body.message && body.message.raw || '').replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    drafts.push(raw);
    await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'r-' + drafts.length, message: { id: 'm-' + drafts.length } }) });
  });
  await p.route(SYNC + '**', async (r) => {
    let body = {}; try { body = JSON.parse(r.request().postData() || '{}'); } catch (e) {}
    if (body.action === 'htmlToPdf') return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, base64: 'JVBERi0xLjQK' }) });
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, fileUrl: 'https://drive.google.com/file/d/f1/view', fileId: 'f1' }) });
  });
  const htmlOf = (raw) => { const out = []; const re = /Content-Type: text\/html; charset="UTF-8"\r\nContent-Transfer-Encoding: base64\r\n\r\n([\s\S]*?)\r\n--/g; let m;
    while ((m = re.exec(raw))) out.push(Buffer.from(m[1].replace(/\r\n/g, ''), 'base64').toString('utf8')); return out.join(''); };

  await p.goto(APP); await p.waitForTimeout(1500);
  await p.evaluate(([u, box]) => {
    SHEETS_SYNC_URL = u;
    window.gmailAuth = function (cb) { cb('tok-step37'); };
    _gmailUserEmail = box;
    // Captured rather than sent: a mailto in a headless browser navigates away from the page under test.
    window.__mails = []; window.sendInternalEmail = function (to, subj) { window.__mails.push(subj); };
    window.open = function () { return null; };
  }, [SYNC, BOX]);
  const future = (() => { const d = new Date(); d.setDate(d.getDate() + 30);
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10); })();

  async function make(last) {
    await p.evaluate(() => { const b = document.getElementById('btn-add-client'); if (b) b.click(); }); await p.waitForTimeout(300);
    const id = await p.evaluate(([wt, last]) => {
      const set = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; if (e.onchange) e.onchange(); } };
      const pick = (id) => { const e = document.getElementById(id); const o = e && Array.from(e.options).find(x => x.value); if (o) { e.value = o.value; if (e.onchange) e.onchange(); } };
      set('i-svc', 'home_cleanout'); toggleIntakeFields();
      set('i-fname', 'Tripp'); set('i-lname', last); set('i-addr', '69 Beach Blvd'); set('i-city', 'Palm Beach'); set('i-zip', '33480');
      set('i-sqft', '3500'); set('i-phone', '(561) 555-0199'); set('i-email', 'tripp@example.com'); set('i-home-value', '4200000');
      pick('i-ptype'); pick('i-src'); set('i-walkthrough', wt);
      const st = new Date(wt); st.setDate(st.getDate() + 7); while (st.getDay() === 0 || st.getDay() === 6) st.setDate(st.getDate() + 1);
      set('i-start', st.toISOString().slice(0, 10)); saveIntake(); return (jobs[0] || {}).id;
    }, [future, last]);
    await p.waitForTimeout(1500); return id;
  }
  // The real Build Estimate, six rooms in scope; then approved (and optionally won) the way the manager's
  // PIN and the Won modal leave a job, with the estimate already sent (or not).
  async function price(id, won, estSent) {
    await p.evaluate((id) => dashGoEstimate(id), id); await p.waitForTimeout(700);
    return p.evaluate(([id, won, estSent]) => {
      const js = document.getElementById('e-job'); js.value = String(id); if (js.onchange) js.onchange();
      for (let i = 0; i < 6; i++) setRoomState('r' + i, 'in');
      document.getElementById('e-discount').value = '0';
      calcAll();
      const e = JSON.parse(JSON.stringify(currentEstimate));
      estimateStore[id] = { approved: true, approvedBy: 'Anthony Graziano', approvedAt: 'September 20, 2026', estimate: e };
      const job = jobs.find(j => j.id === id);
      job.approved = true; job.status = won ? 'won' : 'approved';
      if (won) { job.won = true; job.wonAt = '2026-09-21'; job.wonBy = 'Ashley Jerome'; job.wonMethod = 'email'; }
      if (estSent) {
        job.estimateSentDate = 'September 20, 2026';
        job.docState = { estimate: { draftedAt: '2026-09-20T14:00:00.000Z', sentAt: '2026-09-20T14:05:00.000Z', provider: 'gmail' } };
      }
      saveJobs(); try { localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore)); } catch (x) {}
      return { total: e.havellinTotal, deposit: paymentSplit(e.havellinTotal).deposit };
    }, [id, won, estSent]);
  }
  const dash = async (id) => { await p.evaluate((id) => { showPanel('jobs', document.querySelector('.nb[onclick*="\'jobs\'"]')); openClientDashboard(id); }, id); await p.waitForTimeout(500); };
  const calls = () => p.evaluate(() => Array.from(document.querySelectorAll('#client-dashboard-view button'))
    .map(x => x.getAttribute('onclick') || ''));
  const band = () => p.evaluate(() => { const e = document.querySelector('#client-dashboard-view .jt-next'); return e ? e.textContent.replace(/\s+/g, ' ').trim() : '(no band)'; });
  const fb = () => p.evaluate(() => { const e = document.getElementById('dash-fb'); return { text: e ? e.textContent.replace(/\s+/g, ' ').trim() : '', html: e ? e.innerHTML : '' }; });
  const rowOf = (id, key) => p.evaluate(([id, key]) => { const j = jobs.find(x => x.id === id);
    const r = jobTimeline(j, estimateStore[j.id], jobLogs[j.id] || [], []).find(x => x.key === key); return r ? { state: r.state, sub: r.sub || '' } : null; }, [id, key]);
  const rec = (id, key) => p.evaluate(([id, key]) => JSON.parse(JSON.stringify(((jobs.find(j => j.id === id) || {}).docState || {})[key] || null)), [id, key]);
  const click = async (sel) => { try { await p.click(sel); return true; } catch (e) { ok(false, 'could not press ' + sel); return false; } };
  const fill = async (sel, v) => { try { await p.fill(sel, v); return true; } catch (e) { ok(false, 'could not type into ' + sel); return false; } };
  const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

  // ── A. the packet drafted by email ───────────────────────────────────────
  console.log('\n## A. a signing packet drafted by email, at the old price');
  const id = await make('Butler');
  const est0 = await price(id, true, true);
  await p.evaluate((id) => { window.__id = id; }, id);
  await dash(id);
  const paperSel = '#client-dashboard-view button[onclick="docAction(' + id + ",'agreement','send',{via:'paper'})\"]";
  ok((await calls()).some(c => c === 'docAction(' + id + ",'agreement','send',{via:'paper'})"), 'the packet row offers the paper route');
  await click(paperSel); await p.waitForTimeout(3000);
  ok(drafts.length === 1, 'pressing it creates one Gmail draft — ' + drafts.length);
  const html1 = htmlOf(drafts[0] || '');
  has(html1, money(est0.deposit), 'the draft names the deposit at the old price');
  const r1 = await rec(id, 'agreement') || {};
  ok(!!r1.draftedAt && !r1.sentAt, 'the packet is recorded as drafted, not sent');
  ok(r1.mailbox === BOX, 'and records whose drafts folder it is in — ' + r1.mailbox);
  const day1 = r1.draftedAt ? dayOf(r1.draftedAt) : '?';
  await dash(id);
  let cs = await calls();
  ok(cs.indexOf('markDocSent(' + id + ",'agreement')") >= 0, 'the band offers ✓ I’ve sent it over the live draft');
  ok(cs.indexOf('openDocDraft(' + id + ",'agreement')") >= 0, 'and the link to the draft');
  has(await band(), 'Drafted — read it, send it, then confirm', 'the band says the draft is waiting');

  // ── B. the pop-up, before the discount ───────────────────────────────────
  console.log('\n## B. the pop-up names the draft BEFORE the discount');
  await click('#client-dashboard-view button[onclick="dashOfferDiscount(' + id + ')"]'); await p.waitForTimeout(400);
  const w0 = await p.evaluate(() => { const e = document.getElementById('dm-drafts'); return { text: e ? e.textContent.replace(/\s+/g, ' ').trim() : '', html: e ? e.innerHTML : '', shown: !!(e && e.offsetParent) }; });
  ok(w0.shown, 'the warning is on screen in the pop-up');
  has(w0.html, 'a-warn', 'as a warning');
  has(w0.text, 'The signing packet was drafted in Gmail on ' + day1 + ' (' + BOX + ') and has not been confirmed sent', 'naming the draft, its day and its mailbox');
  has(w0.text, 'A discount leaves that draft at the old price — delete it', 'and what the discount does to it');
  has(w0.text, 'Already sent it? Cancel and tap “I’ve sent it” instead', 'and what to do if it has already gone');
  await fill('#dm-pct', '10'); await p.evaluate(() => updateDiscountModal()); await p.waitForTimeout(150);
  has(await p.evaluate(() => (document.getElementById('dm-drafts') || {}).textContent || ''), 'drafted in Gmail on ' + day1,
      'typing the percentage leaves it on screen — its own slot, not the refusal strip');
  // Counted, so C can prove the approval watch's own redraw ran: the discount submits the estimate, the
  // watch fires at once, and its redraw is what used to take the confirmation off the screen.
  await p.evaluate(() => { window.__renders = 0; window.__rcd = renderClientDashboard;
    window.renderClientDashboard = function () { window.__renders++; return window.__rcd.apply(this, arguments); }; });
  await click('#discount-modal .btn-p'); await p.waitForTimeout(800);
  const renders = await p.evaluate(() => { const n = window.__renders; window.renderClientDashboard = window.__rcd; return n; });

  // ── C. the confirmation after Apply ──────────────────────────────────────
  console.log('\n## C. the confirmation names it, and survives the redraw');
  ok(renders >= 2, 'the dashboard was redrawn again after Apply, by the approval watch — ' + renders + ' renders');
  const f1 = await fb();
  has(f1.text, 'Discount applied.', 'the discount is confirmed on the dashboard it was pressed from');
  has(f1.text, '⚠ The Gmail draft of the signing packet from ' + day1 + ' (' + BOX + ') has the old price — delete it, don’t send it.',
      'and the draft it just left out of date is named');
  has(f1.text, 'if the old one already reached the client, tell them a revised one is coming', 'with what to tell the client');
  has(f1.html, 'a-warn', 'as a warning');
  const j1 = await p.evaluate((id) => { const j = jobs.find(x => x.id === id); return { at: j.priceChangedAt || '', why: j.priceChangeWhy || '' }; }, id);
  ok(!!j1.at && j1.why === 'discount', 'the job records when the price moved, and why');
  ok(((await rec(id, 'agreement')) || {}).draftedAt === r1.draftedAt, 'and the draft’s own record is untouched');

  // ── D. no tap, no link, Send is back ─────────────────────────────────────
  console.log('\n## D. after the discount and after the manager’s PIN');
  await dash(id);
  cs = await calls();
  ok(!cs.some(c => /^markDocSent\(/.test(c)), 'awaiting the manager: no ✓ I’ve sent it anywhere on the dashboard');
  ok(!cs.some(c => /^openDocDraft\(/.test(c)), 'and no link to the old draft');
  has((await rowOf(id, 'agreement_sent')).sub, 'The Gmail draft from ' + day1 + ' (' + BOX + ') has the old price — delete it, don’t send it',
      'the packet row names the old draft while the estimate waits');
  await click('#client-dashboard-view button[onclick="dashApproveEstimate(' + id + ')"]'); await p.waitForTimeout(300);
  await fill('#pin-input', '3010'); await p.waitForTimeout(600);
  const st3 = await p.evaluate((id) => { const r = estimateStore[id]; return { approved: !!r.approved, total: r.estimate.havellinTotal, deposit: paymentSplit(r.estimate.havellinTotal).deposit }; }, id);
  ok(st3.approved && st3.total < est0.total, 'the manager re-approves at the discounted price — ' + money(st3.total));
  await dash(id);
  cs = await calls();
  ok(!cs.some(c => /^markDocSent\(/.test(c)), '⚠⚠ no ✓ I’ve sent it — it would have recorded the old-price packet as sent');
  ok(!cs.some(c => /^openDocDraft\(/.test(c)), '⚠ and no link to the old draft');
  ok(cs.indexOf('docAction(' + id + ",'agreement','send')") >= 0, 'Send for signature is back');
  ok(cs.indexOf('docAction(' + id + ",'agreement','send',{via:'paper'})") >= 0, 'with the paper route beside it');
  const bd = await band();
  has(bd, 'A discount changed the price after this was prepared', 'the band says what to do in the app');
  has(bd, 'The Gmail draft from ' + day1 + ' (' + BOX + ') has the old price — delete it, don’t send it', '⚠ and names the old draft');
  lacks(bd, 'Drafted — read it, send it', 'and no longer tells anyone to send it');
  await p.evaluate((id) => markDocSent(id, 'agreement'), id); await p.waitForTimeout(500);
  const r3 = (await rec(id, 'agreement')) || {};
  ok(!r3.sentAt && !(await p.evaluate((id) => isAgreementSent(jobs.find(j => j.id === id)), id)),
     '⚠⚠ a direct markDocSent is refused — the old-price packet is NOT recorded as sent');
  has((await fb()).text, 'There is no draft of the signing packet waiting to be confirmed.', 'and it says why');

  // ── E. a fresh send ──────────────────────────────────────────────────────
  console.log('\n## E. a fresh packet at the new price');
  await dash(id);
  await click(paperSel); await p.waitForTimeout(3000);
  ok(drafts.length === 2, 'a second Gmail draft is created — ' + drafts.length);
  const html2 = htmlOf(drafts[1] || '');
  has(html2, money(st3.deposit), 'it names the NEW deposit');
  lacks(html2, money(est0.deposit), 'and not the old one');
  has((await fb()).text, '⚠ Delete the older Gmail draft from ' + day1 + ' (' + BOX + ') — it has the old price.',
      'the send says which draft to delete, while there are two');
  const r4 = (await rec(id, 'agreement')) || {};
  ok(Array.isArray(r4.staleDrafts) && r4.staleDrafts.length === 1 && r4.staleDrafts[0].draftedAt === r1.draftedAt,
     'the old draft is kept on record — it is still in a mailbox');
  ok(!!r4.draftedAt && r4.draftedAt > j1.at, 'and the fresh draft is stamped after the price moved');
  await dash(id);
  cs = await calls();
  ok(cs.indexOf('markDocSent(' + id + ",'agreement')") >= 0, 'the tap is back — over the NEW draft');
  ok(cs.indexOf('openDocDraft(' + id + ",'agreement')") >= 0, 'and the link opens the new one');
  has(await band(), 'Drafted — read it, send it, then confirm. Delete the older Gmail draft from ' + day1 + ' (' + BOX + ') — it has the old price',
      'the band tells the two drafts apart');
  await click('#client-dashboard-view button[onclick="markDocSent(' + id + ",'agreement')\"]"); await p.waitForTimeout(1500);
  ok(await p.evaluate((id) => isAgreementSent(jobs.find(j => j.id === id)), id), 'pressing it records the NEW packet as sent');
  ok(((await rowOf(id, 'agreement_sent')) || {}).sub === '', 'and the row has nothing left to say');

  // ── F. the edit door ─────────────────────────────────────────────────────
  console.log('\n## F. an estimate drafted by email, then Edit estimate');
  const id2 = await make('Ellsworth');
  await price(id2, false, false);
  await dash(id2);
  await click('#client-dashboard-view button[onclick="docAction(' + id2 + ",'estimate','send')\"]"); await p.waitForTimeout(3000);
  const e1 = (await rec(id2, 'estimate')) || {};
  ok(!!e1.draftedAt && !e1.sentAt, 'the estimate is drafted by email, not sent');
  const dayE = e1.draftedAt ? dayOf(e1.draftedAt) : '?';
  await dash(id2);
  ok((await calls()).indexOf('markDocSent(' + id2 + ",'estimate')") >= 0, 'the estimate row offers ✓ I’ve sent it');
  await click('#client-dashboard-view button[onclick="dashEditEstimate(' + id2 + ')"]'); await p.waitForTimeout(800);
  ok(await p.evaluate((id) => jobs.find(j => j.id === id).priceChangeWhy === 'edit', id2), 'Edit estimate notes the change as an edit');
  await dash(id2);
  cs = await calls();
  ok(!cs.some(c => c === 'markDocSent(' + id2 + ",'estimate')"), 'the estimate draft is no longer confirmable');
  ok(!cs.some(c => c === 'openDocDraft(' + id2 + ",'estimate')"), 'nor linked');
  has((await rowOf(id2, 'estimate_sent')).sub, 'The Gmail draft from ' + dayE + ' (' + BOX + ') was made before the estimate was edited — delete it, don’t send it',
      'and its row says it was made before the edit');

  // ── H. the other notice the watch's redraw took ──────────────────────────
  // Submitting an estimate starts the same approval watch, which fires at once — so "Submitted for manager
  // approval" was painted and then taken off the screen by the watch's own redraw a moment later.
  console.log('\n## H. Submit for approval: its notice survives the watch it starts');
  const id4 = await make('Hale');
  await price(id4, false, false);
  await p.evaluate((id) => { const r = estimateStore[id]; r.approved = false; r.approvedBy = ''; r.approvedAt = '';
    const j = jobs.find(x => x.id === id); j.approved = false; j.status = 'new'; saveJobs();
    try { localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore)); } catch (x) {} }, id4);
  await dash(id4);
  ok((await calls()).indexOf('dashSubmitEstimate(' + id4 + ')') >= 0, 'the band offers Submit for approval');
  await p.evaluate(() => { window.__renders = 0; window.__rcd = renderClientDashboard;
    window.renderClientDashboard = function () { window.__renders++; return window.__rcd.apply(this, arguments); }; });
  await click('#client-dashboard-view button[onclick="dashSubmitEstimate(' + id4 + ')"]'); await p.waitForTimeout(1500);
  const renders4 = await p.evaluate(() => { const n = window.__renders; window.renderClientDashboard = window.__rcd; return n; });
  ok(await p.evaluate((id) => !!(estimateStore[id] && estimateStore[id].submitted), id4), 'the estimate is submitted');
  ok(renders4 >= 2, 'the approval watch redrew the dashboard after the press — ' + renders4 + ' renders');
  has((await fb()).text, 'Submitted for manager approval', '⚠ and the confirmation is still on screen');
  await dash(id4);
  lacks((await fb()).text, 'Submitted for manager approval', 'the next redraw a person causes clears it');
  await p.evaluate(() => { if (typeof stopApprovalWatch === 'function') stopApprovalWatch(); });

  // ── G. overflow, errors ──────────────────────────────────────────────────
  console.log('\n## G. overflow and page errors');
  await dash(id);
  ok((await overflow()) <= 0, 'the dashboard at 1440px has no horizontal overflow');
  // A third client with a live packet draft, so the pop-up's warning can be measured on a phone.
  const id3 = await make('Farrell');
  await price(id3, true, true);
  await dash(id3);
  await click('#client-dashboard-view button[onclick="docAction(' + id3 + ",'agreement','send',{via:'paper'})\"]"); await p.waitForTimeout(3000);
  await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(300);
  await dash(id3);
  ok((await overflow()) <= 0, 'the dashboard at 390px has no horizontal overflow');
  await click('#client-dashboard-view button[onclick="dashOfferDiscount(' + id3 + ')"]'); await p.waitForTimeout(400);
  const m390 = await p.evaluate(() => { const e = document.getElementById('dm-drafts'); const r = e && e.getBoundingClientRect();
    return { shown: !!(e && e.offsetParent), text: e ? e.textContent : '', right: r ? r.right : 9999, over: document.documentElement.scrollWidth - document.documentElement.clientWidth }; });
  ok(m390.shown && m390.text.indexOf('drafted in Gmail') >= 0, 'the pop-up’s warning is on screen at 390px');
  ok(m390.right <= 390 && m390.over <= 0, 'inside the viewport, with no horizontal overflow — right edge ' + Math.round(m390.right));
  ok(errs.length === 0, 'no page errors' + (errs.length ? ' — ' + errs.slice(0, 3).join(' | ') : ''));

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  await b.close();
  process.exit(fail ? 1 : 0);
})().catch(async e => { console.log('THREW: ' + (e && e.stack || e)); console.log(pass + ' passed, ' + (fail + 1) + ' failed'); if (b) await b.close(); process.exit(1); });
