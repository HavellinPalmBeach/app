// Step 64 — P22 · group A (2026-10-06): loose ends off "Known, not fixed", each driven through the page's own controls.
//
//   A. the dashboard: every red activation chip's fix is printed under the chips (it was a tooltip an iPad cannot hover)
//   B. ✎ Edit Client on a Probate service whose matter is a trust: no court record, the attorney offered, not required;
//      + Add a co-representative offers the co-representative's own roles; a row naming the representative is refused by
//      name, and a real co-trustee is saved
//   C. Build Estimate: in field mode the Probate flag is beside the service picker; a service switched on Edit Client
//      reaches the build open on that client (its picker and its total)
//   D. an estimate submitted before the documentation tier moved: Manager approval refuses it before the PIN pad opens;
//      Edit Client keeps the sq ft while the estimate is out for approval, and says why
//   E. the payment recorder lists a deposit migrated from before payment records as "amount inferred", never "· —"
//   F. Build Estimate's declutter box says its 40-hour cap
//   G. a device whose hours log could not be read (requests to the configured URL aborted): the close-out dialog says what
//      the job earned waits on the log, and prints no refund figure
//   H. overflow at 1440 and 390; no page errors
//
// What is seeded is state a person could not type in one sitting (a won client, a submitted estimate, an old deposit
// record); everything else is pressed. The jobs backend is answered by a route.
//
//   NODE_PATH=<dir>/node_modules node tests/browser/step64.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');

const SYNC = 'https://script.google.com/macros/s/STEP64/exec';
const SYNC_OFF = 'https://script.google.com/macros/s/STEP64OFF/exec';

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
    await ctx.route(SYNC + '**', (route) => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ ok: true }) }));
    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    const dialogs = [];
    p.on('dialog', async (d) => { dialogs.push(d.message()); await d.accept(); });
    await p.goto(APP); await p.waitForTimeout(1800);
    await p.evaluate((u) => { SHEETS_SYNC_URL = u; window.open = function () { return null; }; }, SYNC);

    const section = async (name, body) => {
      console.log('\n## ' + name);
      await p.evaluate(() => document.querySelectorAll('.modal-overlay').forEach((m) => { if (getComputedStyle(m).display !== 'none') m.style.display = 'none'; })).catch(() => {});
      try { await body(); } catch (e) { fail++; console.log('  ✗ ' + name + ' threw: ' + String(e && e.message || e).split('\n')[0]); }
    };
    const shown = (sel) => p.evaluate((s) => { const e = document.querySelector(s); return !!(e && e.checkVisibility()); }, sel);
    const words = (sel) => p.evaluate((s) => { const el = document.querySelector(s); if (!el) return '';
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); const out = []; let n;
      while ((n = w.nextNode())) out.push(n.nodeValue);
      return out.join(' ').replace(/\s+/g, ' ').trim(); }, sel);
    const press = async (sel, what) => {
      const n = await p.locator(sel).count();
      const v = n >= 1 && await p.locator(sel).first().isVisible().catch(() => false);
      ok(v, (what || sel) + ' — on screen (' + n + ')');
      if (v) { await p.locator(sel).first().click({ timeout: 5000 }).catch((e) => ok(false, (what || sel) + ' — ' + e.message.split('\n')[0])); await p.waitForTimeout(450); }
      return v;
    };
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const at390 = async (what) => {
      await p.setViewportSize({ width: 390, height: 900 }); await p.waitForTimeout(300);
      eq(await overflow(), 0, 'no horizontal overflow at 390 — ' + what);
      await p.setViewportSize({ width: 1440, height: 1000 }); await p.waitForTimeout(200);
      eq(await overflow(), 0, 'nor at 1440 — ' + what);
    };
    const job = (id) => p.evaluate((id) => JSON.parse(JSON.stringify(jobs.find((x) => x.id === id) || {})), id);
    const toDash = async (id) => { await p.evaluate((id) => goToClientDashboard(id), id); await p.waitForTimeout(500); };
    const seed = (j, rec) => p.evaluate(([j, rec]) => { jobs = jobs.filter((x) => x.id !== j.id); jobs.unshift(j);
      if (rec) estimateStore[j.id] = rec; else delete estimateStore[j.id]; saveJobs(); }, [j, rec || null]);
    const today = await p.evaluate(() => _todayStr());
    const [ty, tm, td] = today.split('-').map(Number);
    const ymd = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const wd = (days) => { const d = new Date(ty, tm - 1, td + days); while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1); return ymd(d); };
    const START = wd(14);
    const ESTATE = (id, extra) => Object.assign({ id, hvlId: 'HVL-2610-' + id, name: 'Walter Adler', fname: 'Walter', lname: 'Adler', svc: 'cleanout',
      sqft: '3200', addr: id + ' Beach Blvd', city: 'Palm Beach', zip: '33480', ptype: 'Single Family Home', src: 'Family', deathDate: '2026-02-10',
      docTier: 'values', gate706: 'no', gateDispute: 'no', matterType: 'trust', executorAuth: 'pending',
      executor: 'Rex Hale', executorFname: 'Rex', executorLname: 'Hale', executorRole: 'Trustee', executorPhone: '(561) 555-0101', executorEmail: 'rex@hale.example',
      start: START, walkthrough: today, created: today, status: 'new', tc: 'Ashley Jerome', payments: [], docState: {}, at: {}, updatedAt: Date.now() }, extra || {});

    // ── A ──────────────────────────────────────────────────────────────────────────────────────────────────────────
    const ID_A = 6401;
    await section('A. the activation chips\' fixes are printed, not only hovered', async () => {
      await seed(ESTATE(ID_A, { status: 'won', won: true, approved: true, wonAt: today, wonBy: 'Anthony Graziano', wonMethod: 'call' }),
        { estimate: { jobId: ID_A, svc: 'cleanout', havellinTotal: 24000, rooms: [{ name: 'Study', st: 'in', vol: 3, cplx: 3 }] }, approved: true, submitted: true, approvedBy: 'Anthony Graziano' });
      await toDash(ID_A);
      const chips = await p.evaluate(() => Array.from(document.querySelectorAll('#client-dashboard-view .dash-chips .badge[title]'))
        .filter((s) => /^⚠/.test(s.textContent)).map((s) => [s.textContent.replace(/^⚠\s*/, ''), s.getAttribute('title')]));
      ok(chips.length === 3, 'fixture: three red chips (' + chips.map((c) => c[0]).join(', ') + ')');
      ok(await shown('#client-dashboard-view .dash-chip-fixes'), '⚠⚠ the fixes are on screen, no hover needed');
      const fx = await words('#client-dashboard-view .dash-chip-fixes');
      chips.forEach((c) => has(fx, c[0] + ': ' + c[1], 'the fix for ' + c[0] + ', in the tooltip\'s own words'));
      has(fx, 'Certification of Trust pending: Contact Rex Hale — (561) 555-0101', 'whom to chase, by name and number');
      await at390('the dashboard with three fixes printed');
    });

    // ── B ──────────────────────────────────────────────────────────────────────────────────────────────────────────
    const ID_B = 6402;
    await section('B. Edit Client on Probate with a trust: no court record; co-representatives\' own roles; the representative refused', async () => {
      await seed(ESTATE(ID_B, { svc: 'probate', probateCase: '' }));
      await toDash(ID_B);
      await press('#client-dashboard-view button[onclick="dashEditClient(' + ID_B + ')"]', '✎ Edit Client');
      eq(await shown('#ec-probate-fields'), false, '⚠⚠ the court record is not shown: no court on a trust');
      eq(await words('#ec-atty-req-note'), '(if there is one — many estate settlements never open probate)', 'the attorney is offered');
      eq(await p.evaluate(() => Array.from(document.querySelectorAll('.ec-req-probate')).filter((e) => e.checkVisibility()).length), 0, 'and no asterisk on it');
      await p.selectOption('#ec-matter-type', 'probate'); await p.waitForTimeout(200);
      ok(await shown('#ec-probate-fields'), 'answered Probate: the court record is back, live');
      eq(await words('#ec-atty-req-note'), '(all fields required)', 'and required');
      await p.selectOption('#ec-matter-type', 'trust'); await p.waitForTimeout(200);
      await press('#ec-cofid-add', '+ Add a co-representative');
      const roles = await p.evaluate(() => Array.from(document.querySelectorAll('#ec-cofid-0-role option')).map((o) => o.value));
      eq(roles, ['', 'Co-Personal Representative', 'Co-Trustee', 'Other'], '⚠⚠ the co-representative\'s own roles: no Estate Attorney, no Family Member');
      await p.fill('#ec-cofid-0-name', 'Rex Hale'); await p.selectOption('#ec-cofid-0-role', 'Co-Trustee');
      const before = dialogs.length;
      await press('#edit-client-modal button[onclick="saveClientEdit(' + ID_B + ')"]', 'Save Changes');
      has(dialogs.slice(before).join(' | '), 'Rex Hale is the representative on this estate, so cannot also be a co-representative', '⚠⚠ refused by name');
      eq(((await job(ID_B)).coFiduciaries || []).length, 0, 'nothing recorded');
      ok(await shown('#edit-client-modal'), 'the modal stays open to fix it');
      await p.fill('#ec-cofid-0-name', 'Daniel Adler');
      await press('#edit-client-modal button[onclick="saveClientEdit(' + ID_B + ')"]', 'Save Changes again');
      const j = await job(ID_B);
      eq((j.coFiduciaries || []).map((c) => [c.name, c.role]), [['Daniel Adler', 'Co-Trustee']], 'a real co-trustee is saved, with the role');
      lacks(await words('#client-dashboard-view'), 'Probate case number', '⚠ the save does not ask for a case number');
    });

    // ── C ──────────────────────────────────────────────────────────────────────────────────────────────────────────
    await section('C. Build Estimate: the field-mode flag; a service switched on Edit Client reaches the open build', async () => {
      await toDash(ID_B);
      await press('#client-dashboard-view .jt-next button[onclick="dashGoEstimate(' + ID_B + ')"]', 'the band\'s Build estimate');
      await p.waitForTimeout(600);
      eq(await p.inputValue('#e-svc'), 'probate', 'fixture: the build prices Probate');
      ok(await shown('#e-svc-flag .alert'), 'on a desk the flag is under the total');
      eq(await shown('#e-svc-flag-field .alert'), false, 'and only there');
      await press('#field-toggle', '📱 Field');
      ok(await p.evaluate(() => document.body.classList.contains('field-mode')), 'fixture: field mode is on');
      eq(await shown('#e-svc-flag .alert'), false, 'fixture: field mode hides the summary, and the flag in it');
      ok(await shown('#e-svc-flag-field .alert'), '⚠⚠ the flag is on screen beside the service picker');
      eq(await words('#e-svc-flag-field'), await p.evaluate(() => document.getElementById('e-svc-flag').textContent.replace(/\s+/g, ' ').trim()), 'in the same words');
      await at390('Build Estimate in field mode with the flag');
      await press('#field-toggle', '📱 Field off');
      const totalBefore = await words('#s-total');
      await press('#est-back', '← Back to client');
      await press('#client-dashboard-view button[onclick="dashEditClient(' + ID_B + ')"]', '✎ Edit Client');
      await p.selectOption('#ec-svc', 'cleanout'); await p.waitForTimeout(200);
      await press('#edit-client-modal button[onclick="saveClientEdit(' + ID_B + ')"]', 'Save Changes (Estate Settlement)');
      eq((await job(ID_B)).svc, 'cleanout', 'fixture: the job is Estate Settlement now');
      await press('#client-dashboard-view .jt-next button[onclick="dashGoEstimate(' + ID_B + ')"]', 'Build estimate again');
      await p.waitForTimeout(600);
      eq(await p.inputValue('#e-svc'), 'cleanout', '⚠⚠ the open build follows the service Edit Client saved');
      has(await words('#e-svc-note'), 'the job is now Estate Settlement', 'and its note says so');
      ok((await words('#s-total')) !== totalBefore, 'repriced (' + totalBefore + ' → ' + (await words('#s-total')) + ')');
      eq(await shown('#e-svc-flag .alert'), false, 'and the flag is gone');
      await press('#est-back', '← Back to client');
    });

    // ── D ──────────────────────────────────────────────────────────────────────────────────────────────────────────
    const ID_D = 6403;
    await section('D. out for approval: the tier moved refuses approval before the PIN; Edit Client keeps the sq ft', async () => {
      await seed(ESTATE(ID_D, { status: 'pending', docTier: 'values' }),
        { estimate: { jobId: ID_D, svc: 'cleanout', docScope: 'capture', docTier: 'contents', havellinTotal: 18000, rooms: [{ name: 'Study', st: 'in', vol: 3, cplx: 3 }] },
          submitted: true, savedAt: Date.now() });
      await toDash(ID_D);
      await press('#client-dashboard-view button[onclick="dashApproveEstimate(' + ID_D + ')"]', 'Manager approval');
      eq(await shown('#pin-modal'), false, '⚠⚠ the PIN pad does not open');
      has(await words('#client-dashboard-view'), 'Cannot approve — the documentation tier on this client changed to Inventory with values after this estimate was saved, and it is still priced at Capture only.',
        'the notice names both tiers');
      has(await words('#client-dashboard-view'), 'Deny it: it reopens for editing', 'and the way out');
      await press('#client-dashboard-view button[onclick="dashEditClient(' + ID_D + ')"]', '✎ Edit Client');
      await p.fill('#ec-sqft', '5000');
      const before = dialogs.length;
      await press('#edit-client-modal button[onclick="saveClientEdit(' + ID_D + ')"]', 'Save Changes');
      const said = dialogs.slice(before).join(' | ');
      has(said, 'Approx. sqft cannot be changed on this job.', '⚠⚠ held while out for approval');
      has(said, 'The estimate is out for manager approval, so these feed the price a manager is deciding on', 'in the words of its state');
      eq((await job(ID_D)).sqft, '3200', 'the sq ft is kept');
    });

    // ── E ──────────────────────────────────────────────────────────────────────────────────────────────────────────
    const ID_E = 6404;
    const sent = () => ({ draftedAt: new Date().toISOString(), sentAt: new Date().toISOString(), sentBy: 'Anthony Graziano', provider: 'gmail' });
    await section('E. the recorder lists an old deposit as "amount inferred"', async () => {
      await seed({ id: ID_E, hvlId: 'HVL-2610-' + ID_E, name: 'Ruth Older', fname: 'Ruth', lname: 'Older', svc: 'downsizing', sqft: '2000', addr: '1 Old Rd',
        city: 'Palm Beach', zip: '33480', phone: '(561) 555-0144', email: 'ruth@example.com', start: START, status: 'active', won: true, approved: true,
        activatedOn: today, agrSigned: true, agrSent: true, agrApproved: true, depositReceived: true, depositReceivedAt: '2026-08-01', at: {}, created: today, tc: 'Ashley Jerome',
        walkthrough: today, estimateSentDate: 'October 1, 2026',
        // The estimate, the deposit and the midpoint invoices have gone, so the lit step is to record the midpoint's payment.
        docState: { estimate: sent(), 'invoice:deposit': sent(), 'invoice:midpoint': sent() } },
        { estimate: { jobId: ID_E, svc: 'downsizing', rooms: [{ name: 'Study', st: 'in', vol: 3, cplx: 3 }], havellinTotal: 8000, tcFee: 4800, psFee: 3200, totTC: 32, totPS: 32, tcRate: 150, psRate: 100 }, approved: true, submitted: true, approvedBy: 'Anthony Graziano' });
      ok(!(await job(ID_E)).payments, 'fixture: a deposit recorded before payment records (no payments list)');
      await toDash(ID_E);
      const btn = await p.locator('#client-dashboard-view button[onclick^="dashRecordPayment(' + ID_E + '"]').count();
      if (btn) await press('#client-dashboard-view button[onclick^="dashRecordPayment(' + ID_E + '"]', 'Record payment');
      else { ok(false, 'a Record payment control is offered on the dashboard'); return; }
      await p.selectOption('#dep-stage', 'deposit'); await p.waitForTimeout(200);
      const prior = await words('#dep-prior');
      has(prior, 'amount inferred — predates payment records', 'the inference named');
      lacks(prior, '· —', '⚠⚠ never "· —" for a method nobody recorded');
    });

    // ── F ──────────────────────────────────────────────────────────────────────────────────────────────────────────
    const ID_F = 6405;
    await section('F. the declutter box says its cap', async () => {
      await seed({ id: ID_F, hvlId: 'HVL-2610-' + ID_F, name: 'Pat Prep', fname: 'Pat', lname: 'Prep', svc: 'prep', sqft: '2400', addr: '5 Prep Ln', city: 'Palm Beach',
        zip: '33480', phone: '(561) 555-0155', email: 'pat@example.com', start: START, status: 'new', docState: {}, at: {}, created: today, tc: 'Ashley Jerome', walkthrough: today });
      await toDash(ID_F);
      await press('#client-dashboard-view .jt-next button[onclick="dashGoEstimate(' + ID_F + ')"]', 'the band\'s Build estimate');
      await p.waitForTimeout(600);
      has(await words('#est-declutter-card'), 'whole hours, at most 40', 'the label says the cap');
      await p.fill('#e-declutter-hrs', '45'); await p.dispatchEvent('#e-declutter-hrs', 'input'); await p.waitForTimeout(300);
      has(await words('#e-declutter-hint'), 'The declutter box takes at most 40 hours: 45 is priced as 40.', '⚠⚠ past the cap, the hint says so');
      await p.fill('#e-declutter-hrs', '6'); await p.dispatchEvent('#e-declutter-hrs', 'input'); await p.waitForTimeout(300);
      lacks(await words('#e-declutter-hint'), 'at most 40', 'and not under it');
      await press('#est-back', '← Back to client');
    });

    // ── H ──────────────────────────────────────────────────────────────────────────────────────────────────────────
    await section('H. the screens fit, and no page errors', async () => {
      await toDash(ID_B);
      await at390('the client card with a co-trustee');
      eq(errs, [], 'no page errors');
    });

    // ── G: a second device, whose requests to the configured URL are aborted ─────────────────────────────────────
    await section('G. a device whose hours log could not be read: the close-out waits on the log', async () => {
      const ID_G = 6406;
      const ctx2 = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
      await ctx2.route(SYNC_OFF + '**', (route) => route.abort());
      const J = { id: ID_G, hvlId: 'HVL-2610-' + ID_G, name: 'Gone Client', fname: 'Gone', lname: 'Client', svc: 'downsizing', sqft: '2000', addr: '9 Gone Rd',
        city: 'Palm Beach', zip: '33480', phone: '(561) 555-0166', email: 'gone@example.com', start: START, status: 'active', won: true, approved: true,
        activatedOn: today, docState: {}, at: {}, created: today, tc: 'Ashley Jerome', updatedAt: Date.now(),
        payments: [{ id: 1, uid: 'g1', stage: 'deposit', amount: 6000, method: 'wire', receivedOn: today, clearedOn: today, recordedBy: 'Anthony Graziano' }] };
      const EST = { [ID_G]: { estimate: { jobId: ID_G, svc: 'downsizing', havellinTotal: 12000, tcFee: 7200, psFee: 4800, totTC: 48, totPS: 48, tcRate: 150, psRate: 100 },
        approved: true, submitted: true, approvedBy: 'Anthony Graziano' } };
      await ctx2.addInitScript(([u, j, e]) => {
        try { localStorage.setItem('hav_sheets_url', u); localStorage.setItem('havellin_jobs_v3', JSON.stringify([j]));
          localStorage.setItem('havellin_est_v4', JSON.stringify(e)); localStorage.setItem('havellin_logs_v3', JSON.stringify({})); } catch (x) {}
      }, [SYNC_OFF, J, EST]);
      const p2 = await ctx2.newPage();
      const errs2 = []; p2.on('pageerror', (x) => errs2.push(String(x)));
      p2.on('dialog', async (d) => { await d.accept(); });
      await p2.goto(APP); await p2.waitForTimeout(2500);
      eq(await p2.evaluate(() => [SHEETS_SYNC_URL ? 'url set' : 'no url', _logsState]), ['url set', 'offline'], 'fixture: the log could not be read from the configured URL');
      const sel = '#jobs-tbody button[onclick*="openCloseoutModal(' + ID_G + ')"], button[onclick*="openCloseoutModal(' + ID_G + ')"]';
      const n = await p2.locator(sel).count();
      ok(n >= 1, 'the client list offers ✕ Close out / mark lost (' + n + ')');
      if (n) { await p2.locator(sel).first().click(); await p2.waitForTimeout(400); }
      const sub = await p2.evaluate(() => (document.getElementById('closeout-sub') || {}).textContent || '');
      has(sub, 'What it has earned cannot be worked out until its hours log loads on this device', '⚠⚠ the close-out waits on the log, by name');
      lacks(sub, 'Refund due', 'and prints no refund figure');
      eq(errs2, [], 'no page errors on the second device');
      await ctx2.close();
    });

    console.log('\n' + pass + ' passed, ' + fail + ' failed');
    await b.close();
    process.exit(fail ? 1 : 0);
  } catch (e) {
    console.log('✗ threw: ' + (e && e.stack || e));
    console.log('\n' + pass + ' passed, ' + (fail + 1) + ' failed');
    if (b) await b.close().catch(() => {});
    process.exit(1);
  }
})();
