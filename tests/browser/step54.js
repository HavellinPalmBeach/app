// Step 54 — P19 · W1, the client record (2026-10-03): Anthony's calls 1, 4 and 5, and his "yes" to the sale question.
//
// Drives the REAL page through its own controls: + Add New Client typed into and saved with Save Client, the
// dashboard read back, the band's Activate job, the dashboard's ✎ Edit Client and the modal's own controls saved with
// Save Changes. What is seeded is state a person could not type in one sitting: the new client moved on to won, signed
// and funded, with an approved estimate behind it.
//
//   A. intake: the authority control's label follows the matter type as it changes — Certification of Trust on a
//      trust, the Letters on probate, no control on Neither — and the trust's details and the property-sale question
//      appear where the matter holds a trust; a co-trustee added with + Add a co-representative; Save Client records
//      the trust, the sale answer and the co-trustee (stamped on its own key)
//   B. the dashboard: the Certification of Trust chip in the client card, the Trust card with its Certification chip,
//      the trust's details, the property sale, Co-Trustees with the one-signer sentence, and the Form 706 line in red
//      inside thirty days
//   C. won, signed and funded: activation is refused — no Activate in the band, the rail names the Certification, the
//      handler refuses with it — and the strip prints the 706 date in red; Edit Client names the Certification, switches
//      to the Letters live when the matter is changed to Probate and back, records the Certification as Received, and
//      the band then offers Activate job, which activates
//   D. Edit Client's co-representatives: one added with + Add a co-representative, one removed with ✕ (asked first)
//   E. overflow at 1440 and 390 (the dashboard, the intake rows and the modal); no page errors
//
//   NODE_PATH=/opt/node22/lib/node_modules node tests/browser/step54.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');
const C_GATE = 'The successor trustee’s Certification of Trust must be received';

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
    const p = await ctx.newPage();
    p.setDefaultTimeout(8000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    const dialogs = []; let answer = true;
    p.on('dialog', async (d) => { dialogs.push(d.message()); if (answer) await d.accept(); else await d.dismiss(); });
    await p.goto(APP); await p.waitForTimeout(1500);
    await p.evaluate(() => { window.open = function () { return null; }; });

    const section = async (name, body) => {
      console.log('\n## ' + name);
      try { await body(); } catch (e) { fail++; console.log('  ✗ ' + name + ' threw: ' + String(e && e.message || e).split('\n')[0]); }
    };
    // checkVisibility, not offsetParent: the modal is position:fixed, whose offsetParent is always null.
    const shown = (sel) => p.evaluate((s) => { const e = document.querySelector(s); return !!(e && e.checkVisibility()); }, sel);
    const txt = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }, sel);
    // The words of an element as a reader takes them: every text node, spaced (textContent runs a label into its value,
    // and innerText applies the labels' text-transform).
    const words = (sel) => p.evaluate((s) => { const el = document.querySelector(s); if (!el) return '';
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); const out = []; let n;
      while ((n = w.nextNode())) out.push(n.nodeValue);
      return out.join(' ').replace(/\s+/g, ' ').trim(); }, sel);
    const job = (id) => p.evaluate((id) => JSON.parse(JSON.stringify(jobs.find((x) => x.id === id) || {})), id);
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const date = async (sel, v) => { await p.fill(sel, v); await p.dispatchEvent(sel, 'change'); };
    const press = async (sel, what) => {
      const n = await p.locator(sel).count();
      const v = n >= 1 && await p.locator(sel).first().isVisible().catch(() => false);
      ok(v, (what || sel) + ' — on screen (' + n + ')');
      if (v) { await p.locator(sel).first().click({ timeout: 5000 }).catch((e) => ok(false, (what || sel) + ' — ' + e.message.split('\n')[0])); await p.waitForTimeout(450); }
      return v;
    };
    // The card on the dashboard whose heading is `title`, read alone.
    const card = (title) => p.evaluate((t) => {
      const hd = Array.from(document.querySelectorAll('#client-dashboard-view .card .d-sec-hdr')).find((e) => e.textContent.trim() === t);
      const c = hd && hd.closest('.card'); if (!c) return '';
      const w = document.createTreeWalker(c, NodeFilter.SHOW_TEXT); const out = []; let n;
      while ((n = w.nextNode())) out.push(n.nodeValue);
      return out.join(' ').replace(/\s+/g, ' ').trim();
    }, title);

    // Dates off the page's own clock. The Form 706 is due nine months after death; a death nine months before a day
    // 10–20 days ahead (one whose date every month has) puts the return inside the thirty days that turn it red.
    const today = await p.evaluate(() => _todayStr());
    const ymd = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const [ty, tm, td] = today.split('-').map(Number);
    let N = 10, due;
    for (; N <= 20; N++) { due = new Date(ty, tm - 1, td + N); if (due.getDate() <= 28) break; }
    const death = ymd(new Date(due.getFullYear(), due.getMonth() - 9, due.getDate()));
    const DUE = ymd(due);
    const DUE_TXT = due.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const wd = (days) => { const d = new Date(ty, tm - 1, td + days); while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1); return ymd(d); };
    const START = wd(14);
    let ID = null;

    // ── A. intake ─────────────────────────────────────────────────────────
    await section('A. intake: the paper, the trust and the sale follow the matter; a co-trustee added; Save Client records them', async () => {
      await p.click('#btn-add-client'); await p.waitForTimeout(400);
      await p.selectOption('#i-svc', 'cleanout');
      await p.fill('#i-fname', 'Walter'); await p.fill('#i-lname', 'Adler');
      await p.fill('#i-addr', '69 Beach Blvd'); await p.fill('#i-city', 'Palm Beach'); await p.fill('#i-zip', '33480');
      await p.fill('#i-sqft', '4200'); await p.selectOption('#i-ptype', 'Estate'); await p.selectOption('#i-src', 'Family');
      await date('#i-start', START);
      const look = async (mt) => {
        await p.selectOption('#i-matter-type', mt); await p.waitForTimeout(120);
        return { cell: await shown('#i-executor-auth-cell'), lbl: await txt('#i-executor-auth-lbl'), hint: await txt('#i-executor-auth-hint'),
                 trust: await shown('#trust-fields'), sale: await shown('#i-probate-sale') };
      };
      let v = await look('trust');
      eq([v.cell, v.lbl], [true, 'Certification of Trust'], '⚠⚠ Trust: the control names the Certification of Trust');
      has(v.hint, '§736.1017', 'its hint cites the statute');
      eq([v.trust, v.sale], [true, true], 'and the trust\'s details and the property-sale question appear');
      v = await look('probate');
      eq([v.cell, v.lbl, v.trust, v.sale], [true, 'Letters of Administration', false, true], 'Probate: the Letters, no trust details, the sale with the court record');
      v = await look('neither');
      eq([v.cell, v.trust, v.sale], [false, false, false], '⚠ Neither: no paper is named, and no trust or sale is asked');
      v = await look('both');
      eq([v.lbl, v.trust], ['Letters of Administration', true], 'Both: the Letters, and the trust it pours into');
      v = await look('trust');
      eq(v.lbl, 'Certification of Trust', 'and back to Trust, live');
      await p.fill('#i-executor-fname', 'Rex'); await p.fill('#i-executor-lname', 'Hale');
      await p.selectOption('#i-executor-role', 'Trustee');
      await p.fill('#i-executor-phone', '5615550101'); await p.fill('#i-executor-email', 'rex@hale.example');
      eq(await p.inputValue('#i-executor-auth'), 'pending', 'the Certification is left Pending, as it would be on the call');
      await p.fill('#i-trust-name', 'The Adler Family Revocable Trust');
      await date('#i-trust-date', '2019-04-02'); await date('#i-trustee-accepted', wd(-20));
      await p.selectOption('#i-probate-sale', 'yes');
      await date('#i-date-of-death', death); await p.selectOption('#i-gate-706', 'yes');
      await press('#i-cofid-add', '+ Add a co-representative');
      ok(await shown('#i-cofid-0-name'), 'a co-representative row appears');
      await p.fill('#i-cofid-0-name', 'Daniel Adler'); await p.selectOption('#i-cofid-0-role', 'Trustee');
      await p.fill('#i-cofid-0-phone', '5615550103'); await p.fill('#i-cofid-0-email', 'dan@adler.example');
      // A second row, left empty, is no one.
      await press('#i-cofid-add', '+ Add a co-representative, again');
      // 390 px with the rows on screen: nothing runs off the page.
      await p.setViewportSize({ width: 390, height: 900 }); await p.waitForTimeout(300);
      eq(await overflow(), 0, 'no horizontal overflow at 390 with the co-representative rows on the intake form');
      await p.setViewportSize({ width: 1440, height: 1000 }); await p.waitForTimeout(200);
      await p.click('button[onclick="saveIntake()"]'); await p.waitForTimeout(900);
      ID = await p.evaluate(() => (jobs[0] || {}).id);
      const j = await job(ID);
      eq([j.fname, j.matterType], ['Walter', 'trust'], 'the client was created through the real Save Client');
      eq([j.trustName, j.trustDate, j.trusteeAcceptedOn, j.probateSale], ['The Adler Family Revocable Trust', '2019-04-02', wd(-20), 'yes'],
         '⚠⚠ the trust, its date, the trustee\'s acceptance and the property sale are recorded');
      eq((j.coFiduciaries || []).map((c) => [c.name, c.role, c.email]), [['Daniel Adler', 'Trustee', 'dan@adler.example']], '⚠⚠ the co-trustee is recorded; the empty row is no one');
      const cid = ((j.coFiduciaries || [])[0] || {}).id;
      ok(!!cid && typeof (j.at || {})['coFiduciaries:' + cid] === 'number', 'stamped on its own key');
      eq(j.executorAuth, 'pending', 'the Certification is recorded Pending');
    });

    // ── B. the dashboard ──────────────────────────────────────────────────
    await section('B. the dashboard: the chip, the Trust card and the 706 line', async () => {
      ok(await shown('#client-dashboard-view'), 'Save Client landed on the new client');
      const chips = await p.evaluate(() => Array.from(document.querySelectorAll('#client-dashboard-view .dash-chips .badge')).map((e) => e.textContent.trim()));
      ok(chips.indexOf('⚠ Certification of Trust pending') >= 0, '⚠⚠ the client card\'s chip names the Certification of Trust  [' + chips.join(' | ') + ']');
      ok(chips.every((c) => c.indexOf('Executor auth') < 0 && c.indexOf('Letters') < 0), 'and never the Letters');
      const view = await words('#client-dashboard-view');
      has(view, 'Certification of Trust Pending', 'the client card names the paper');
      lacks(view, 'Letters of Admin', 'never the Letters');
      has(view, 'Co-representatives Daniel Adler · Trustee', 'and lists the co-trustee');
      const tc = await card('Trust Information');
      has(tc, 'Trust Information Certification of Trust pending — blocker', '⚠⚠ the Trust card carries the Certification chip');
      has(tc, 'Trust name The Adler Family Revocable Trust Trust dated Apr 2, 2019', 'the trust itself');
      has(tc, 'Property sale yes', 'the property sale');
      has(tc, 'Role Trustee Certification of Trust Pending', 'the Certification beside the trustee');
      has(tc, 'Co-Trustees Name Daniel Adler Role Trustee', 'Co-Trustees');
      // RESTATED 2026-10-05 (P20): Anthony decided (Q22) that each co-trustee signs the agreement beside the trustee, in
      // DocuSign or on the printed page; the card says so where it said DocuSign went to one signer (step 60 drives both).
      has(tc, 'Each signs the agreement beside Rex Hale: in DocuSign, which needs their email, or on the printed page when it is signed by hand.', 'how each co-trustee signs');
      lacks(tc, 'A DocuSign envelope goes to Rex Hale alone.', 'never the old one-signer sentence');
      lacks(tc, 'on paper', 'and nothing prescribed beyond the two routes');
      has(tc, 'Form 706 due ' + DUE_TXT + ' — in ' + N + ' days', '⚠ the Form 706 date, ' + N + ' days out');
      const red = await p.evaluate(() => { const e = document.querySelector('#client-dashboard-view .est-706'); return e ? getComputedStyle(e).color : ''; });
      eq(red, 'rgb(163, 45, 45)', 'in red inside thirty days');
      lacks(tc, 'Authorization', 'no "Authorization", the Letters\' word, on a trust');
    });

    // ── C. won, signed, funded: activation refused until the Certification is Received ──
    await section('C. activation waits on the Certification; Edit Client switches the paper live, and Received lets it go', async () => {
      await p.evaluate(([id, start]) => {
        const j = jobs.find((x) => x.id === id);
        Object.assign(j, { status: 'won', won: true, wonAt: '2026-09-29', wonBy: 'Anthony Graziano', wonMethod: 'call', approved: true,
          estimateSentDate: 'September 28, 2026', walkthrough: '2026-09-20', agrApproved: true, agrApprovedBy: 'Anthony Graziano',
          agrSent: true, agrSentAt: 'Sep 29, 2026', agrSigned: true, agrSignedAt: 'Sep 30, 2026', depositReceived: true, depositReceivedAt: '2026-10-01',
          payments: [{ id: 1, uid: 'p54', stage: 'deposit', amount: 12000, receivedOn: '2026-10-01', method: 'wire', clearedOn: '2026-10-01' }],
          docState: Object.assign({}, j.docState || {}, { 'invoice:deposit': { draftedAt: '2026-09-30T14:00:00.000Z', sentAt: '2026-09-30T14:00:00.000Z', provider: 'gmail' } }) });
        estimateStore[id] = { approved: true, submitted: true, approvedBy: 'Anthony Graziano', approvedAt: 'September 27, 2026', savedAt: Date.now(),
          estimate: { jobId: id, svc: 'cleanout', havellinTotal: 24000, days: 6, totTC: 30, totPS: 60, rooms: [{ idx: 1, name: 'Study', st: 'in', vol: 3, cplx: 3 }], vendors: [] } };
        saveJobs(); openClientDashboard(id);
      }, [ID, START]);
      await p.waitForTimeout(500);
      const band = await txt('#client-dashboard-view .jt-next');
      has(band, C_GATE, '⚠⚠ the band names what holds the job: the Certification of Trust');
      has(band, 'the Certification of Trust must be received before work can start', 'and the fix says so');
      eq(await p.locator('#client-dashboard-view .jt-next button[onclick="activateOrCycle(' + ID + ')"]').count(), 0, 'and offers no Activate job');
      const strip = await p.evaluate(() => { const s = document.querySelector('#client-dashboard-view .jt-sched'); return s ? s.innerHTML : ''; });
      has(strip, 'jt-s-err">⚠ Form 706 due ' + DUE_TXT + ' — in ' + N + ' days', '⚠ the schedule strip prints the 706 date, red');
      dialogs.length = 0;
      await p.evaluate((id) => activateOrCycle(id), ID);
      await p.waitForTimeout(300);
      has(dialogs.join(' | '), '• ' + C_GATE, '⚠ the handler refuses too, naming the Certification');
      eq((await job(ID)).status, 'won', 'and the job is not active');
      // Edit Client: the paper, live.
      await press('#client-dashboard-view button[onclick="dashEditClient(' + ID + ')"]', '✎ Edit Client');
      eq(await txt('#ec-exec-auth-lbl'), 'Certification of Trust', 'Edit Client names the Certification of Trust');
      ok(await shown('#ec-trust-fields') && await shown('#ec-probate-sale'), 'with the trust\'s details and the sale question');
      eq(await p.inputValue('#ec-trust-name'), 'The Adler Family Revocable Trust', 'prefilled');
      await p.selectOption('#ec-matter-type', 'probate'); await p.waitForTimeout(150);
      eq([await txt('#ec-exec-auth-lbl'), await shown('#ec-trust-fields')], ['Letters of Administration', false], '⚠⚠ switched to Probate mid-edit: the Letters, live');
      await p.selectOption('#ec-matter-type', 'neither'); await p.waitForTimeout(150);
      eq([await shown('#ec-exec-auth'), await shown('#ec-probate-sale')], [false, false], 'Neither: no paper, no sale question');
      await p.selectOption('#ec-matter-type', 'trust'); await p.waitForTimeout(150);
      eq(await txt('#ec-exec-auth-lbl'), 'Certification of Trust', 'and back to Trust');
      await p.selectOption('#ec-exec-auth', 'received');
      await p.setViewportSize({ width: 390, height: 900 }); await p.waitForTimeout(300);
      eq(await overflow(), 0, 'no horizontal overflow at 390 with Edit Client open');
      await p.setViewportSize({ width: 1440, height: 1000 }); await p.waitForTimeout(200);
      await press('#edit-client-modal button[onclick="saveClientEdit(' + ID + ')"]', 'Save Changes');
      eq((await job(ID)).executorAuth, 'received', 'the Certification recorded as Received');
      await p.evaluate((id) => openClientDashboard(id), ID); await p.waitForTimeout(400);
      has(await card('Trust Information'), 'Certification of Trust received', 'the Trust card says so');
      ok(await press('#client-dashboard-view .jt-next button[onclick="activateOrCycle(' + ID + ')"]', '▶ Activate job, offered now'), 'the band offers Activate job');
      await p.waitForTimeout(400);
      eq((await job(ID)).status, 'active', '⚠⚠ and it activates');
    });

    // ── D. Edit Client's co-representatives ──────────────────────────────────
    await section('D. Edit Client: a co-trustee added, another removed (asked first)', async () => {
      await p.evaluate((id) => { showPanel('jobs', document.querySelector('.nb[onclick*="\'jobs\'"]')); openClientDashboard(id); }, ID);
      await p.waitForTimeout(400);
      await press('#client-dashboard-view button[onclick="dashEditClient(' + ID + ')"]', '✎ Edit Client');
      eq(await p.inputValue('#ec-cofid-0-name'), 'Daniel Adler', 'the recorded co-trustee is drawn');
      await press('#ec-cofid-add', '+ Add a co-representative');
      await p.fill('#ec-cofid-1-name', 'Mae O\'Neil'); await p.selectOption('#ec-cofid-1-role', 'Trustee'); await p.fill('#ec-cofid-1-email', 'mae@oneil.example');
      dialogs.length = 0;
      await press('#ec-cofid-0 button[onclick="removeCoFiduciaryRow(\'ec\',0)"]', '✕ Remove on Daniel Adler');
      has(dialogs[0] || '', 'Remove Daniel Adler from the co-representatives on this estate?', '⚠ asked first');
      ok(!(await shown('#ec-cofid-0-name')), 'the row comes off the form');
      await press('#edit-client-modal button[onclick="saveClientEdit(' + ID + ')"]', 'Save Changes');
      const j = await job(ID);
      eq((j.coFiduciaries || []).map((c) => c.name), ['Mae O\'Neil'], '⚠⚠ Daniel removed, Mae added');
      const daniel = Object.keys(j.at || {}).filter((k) => /^coFiduciaries:/.test(k));
      eq(daniel.length, 2, 'both changes stamped on their own keys (the removal included)');
      await p.evaluate((id) => openClientDashboard(id), ID); await p.waitForTimeout(400);
      const tc = await card('Trust Information');
      has(tc, 'Co-Trustees Name Mae O\'Neil Role Trustee', 'the card lists Mae');
      lacks(tc, 'Daniel Adler', 'and not Daniel');
    });

    // ── E. widths and errors ────────────────────────────────────────────────
    await section('E. overflow at 1440 and 390 with the Trust card on screen; no page errors', async () => {
      eq(await overflow(), 0, 'no horizontal overflow at 1440');
      await p.setViewportSize({ width: 390, height: 900 }); await p.waitForTimeout(400);
      eq(await overflow(), 0, 'no horizontal overflow at 390');
      await p.setViewportSize({ width: 1440, height: 1000 });
      eq(errs, [], 'no page errors');
    });
  } catch (e) {
    fail++; console.log('  ✗ threw: ' + String(e && e.stack || e).split('\n').slice(0, 3).join(' | '));
  } finally {
    if (b) await b.close().catch(() => {});
    console.log('\n' + pass + ' passed, ' + fail + ' failed');
  }
})();
