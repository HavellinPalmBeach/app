// Step 67 — P22 group D (2026-10-05): the estate's own dates do not wait for a plan.
// CLAUDE.md, Open work: "jtScheduleHtml prints neither the court deadline nor the 706 date on a job not yet started, and
// the strip is absent before an estimate exists, so on Neither or an unanswered Estate Settlement (no card) the 706 date
// is nowhere on screen; planGateChipsHtml draws an ok chip's label alone, so a recorded §733.604 deadline's date is not
// on the plan's chip row."
//
// Drives the REAL page through its own controls (the Clients nav, the client's row, the Job Plan nav) against one
// routed Apps Script. What is seeded is state a person could not type in one sitting: estates with and without an
// approved estimate.
//
//   A. An Estate Settlement on a matter recorded Neither, 706 answered yes, NO estimate: the dashboard's Schedule strip
//      carries the Form 706 date and nothing of a plan; there is no Probate or Trust card, so the strip is the one place.
//   B. A probate matter with its §733.604 deadline recorded and NO estimate: the court deadline, then the 706 date.
//   C. A living client with no estimate: no strip at all (the strip never explains an absence).
//   D. A won probate estate with an approved estimate and NO target start: the strip names the missing start AND carries
//      the court deadline and the 706 date. On its Job Plan the §733.604 chip is green and carries the date.
//   E. Overflow at 1440 and 390 with the strip on screen; no page errors.
//
//   NODE_PATH=/path/to/node_modules tests/browser/run.sh 67
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');

const SYNC = 'https://script.google.com/macros/s/STEP67/exec';
const STORE = { jobs: [], estimates: {} };

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
    await ctx.addInitScript((u) => { try { localStorage.setItem('hav_sheets_url', u); } catch (e) {} }, SYNC);
    await ctx.route(SYNC + '**', async (route) => {
      const req = route.request(), url = new URL(req.url()), action = url.searchParams.get('action');
      const json = (o) => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(o) });
      if (req.method() === 'POST') {
        let body = {}; try { body = JSON.parse(req.postData() || '{}'); } catch (e) {}
        if (body.type === 'saveAllJobs') { STORE.jobs = body.payload || []; return json({ ok: true }); }
        if (body.type === 'saveAllEstimates') { Object.assign(STORE.estimates, body.payload || {}); return json({ ok: true }); }
        return json({ ok: true });
      }
      switch (action) {
        case 'loadJobs': return json({ jobs: STORE.jobs, deletedJobs: [] });
        case 'loadEstimates': return json({ ok: true, estimates: STORE.estimates });
        case 'loadJobPlans': return json({ ok: true, jobPlans: {} });
        case 'loadLogs': return json({ ok: true, logs: {} });
        case 'loadChangeOrders': return json({ ok: true, changeOrders: [] });
        case 'loadContractors': return json({ ok: true, contractors: { added: [], defaults: [] } });
        case 'loadMedia': return json({ ok: true, media: {} });
        case 'version': return json({ ok: false, error: 'Unknown action' });
        default: return json({ ok: false, error: 'not in this test: ' + action });
      }
    });

    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    p.on('dialog', async (d) => { await d.accept(); });
    await p.goto(APP); await p.waitForTimeout(1800);

    const section = async (name, body) => {
      console.log('\n## ' + name);
      try { await body(); } catch (e) { fail++; console.log('  ✗ ' + name + ' threw: ' + String(e && e.message || e).split('\n')[0]); }
    };
    const val = (sel) => p.evaluate((s) => { const e = document.querySelector(s); return e ? e.value : null; }, sel);
    const txt = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }, sel);
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const settle = async () => {
      for (let i = 0; i < 60; i++) {
        await p.waitForTimeout(150);
        const idle = await p.evaluate(() => !_outboxSending && !_flushing && !_outboxTimer && !Object.keys(_outbox).length && !Object.keys(_pendingWrites).length);
        if (idle) return true;
      }
      return false;
    };
    // Open a client the way a person does: the Clients nav, then the row.
    const openDash = async (id) => {
      await p.evaluate(() => { const nb = document.querySelector('.nb[onclick*="\'jobs\'"]'); if (nb) nb.click(); });
      await p.waitForTimeout(300);
      const row = '#panel-jobs tr[onclick="openClientDashboard(' + id + ')"]';
      const n = await p.locator(row).count();
      ok(n >= 1, 'client ' + id + ' is on the client list (' + n + ')');
      if (n) { await p.locator(row).first().click(); await p.waitForTimeout(700); }
      ok(await p.evaluate(() => document.getElementById('client-dashboard-view').checkVisibility()), 'its dashboard is on screen');
    };
    const strip = () => txt('#client-dashboard-view .jt-sched');
    const stripCount = () => p.locator('#client-dashboard-view .jt-sched').count();
    // An estate: each scenario overrides what it needs. No estimate is seeded unless the scenario passes one.
    const seed = async (j, est) => {
      await p.evaluate(([j, est]) => {
        jobs = jobs.filter((x) => x.id !== j.id);
        jobs.unshift(j);
        if (est) {
          estimateStore[j.id] = { approved: true, approvedBy: 'Anthony Graziano', approvedAt: 'September 20, 2026', estimate: est, savedAt: Date.now() };
          try { localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore)); } catch (x) {}
          postSyncBadge({ type: 'saveAllEstimates', payload: estimateStore }, 'ok', 'fail');
        }
        saveJobs(); renderJobs();
      }, [j, est || null]);
      await settle();
    };
    const ESTATE = (id, extra) => Object.assign({ id: id, hvlId: 'HVL-2610-' + id, name: 'Estate of Walter Adler', fname: 'Walter', lname: 'Adler',
      svc: 'cleanout', docTier: 'values', addr: '69 Beach Blvd', city: 'Palm Beach', zip: '33480',
      deathDate: '2026-02-10', gate706: 'yes', executor: 'Rex Hale', executorFname: 'Rex', executorLname: 'Hale', executorRole: 'Executor',
      executorEmail: 'rex@example.com', executorPhone: '(561) 555-0101', executorAuth: 'pending',
      tc: 'Ashley Jerome', status: 'new', created: '2026-09-20', start: '2026-10-19' }, extra || {});
    const EST = (id, svc) => ({ jobId: id, svc: svc || 'cleanout', havellinTotal: 24000, fixedPrice: false, totTC: 40, totPS: 60, days: 5,
      rooms: [{ idx: 0, name: 'Study', st: 'in', vol: 3, cplx: 3 }, { idx: 1, name: 'Primary Suite', st: 'in', vol: 3, cplx: 3 }],
      collections: [], vendors: [], prepItems: [] });

    // ── A ────────────────────────────────────────────────────────────────────────────────────────────
    await section('A. Neither, 706 yes, no estimate: the strip carries the 706 date, and nothing of a plan', async () => {
      await seed(ESTATE(6701, { matterType: 'neither' }));
      eq(await p.evaluate(() => !!estimateStore[6701]), false, 'fixture: no estimate on this client');
      await openDash(6701);
      eq(await stripCount(), 1, '⚠⚠ the Schedule strip is on the dashboard before any estimate exists');
      const s = await strip();
      has(s, 'Form 706 due Nov 10, 2026', '⚠⚠ carrying the Form 706 date: nine months after February 10');
      lacks(s, 'working day', 'and nothing of a plan the job does not have');
      lacks(s, 'Target start', '(no target start either: there is no length to count from)');
      lacks(await txt('#client-dashboard-view'), 'Probate Information', 'fixture: no Probate card on Neither');
      lacks(await txt('#client-dashboard-view'), 'Trust Information', 'nor a Trust card, so the strip is the one place the date is');
    });

    // ── B ────────────────────────────────────────────────────────────────────────────────────────────
    await section('B. probate, deadline recorded, no estimate: the court deadline, then the 706 date', async () => {
      await seed(ESTATE(6702, { svc: 'probate', matterType: 'probate', probateDeadline: '2026-12-15', probateCase: '2026-CP-001234',
        name: 'Estate of Mae Lyle', fname: 'Mae', lname: 'Lyle' }));
      await openDash(6702);
      const s = await strip();
      has(s, 'Court deadline Dec 15, 2026', '⚠ the court deadline, before any estimate');
      has(s, 'Form 706 due Nov 10, 2026', 'and the 706 date');
      ok(s.indexOf('Court deadline') >= 0 && s.indexOf('Form 706') > s.indexOf('Court deadline'), 'the 706 date after the court deadline');
    });

    // ── C ────────────────────────────────────────────────────────────────────────────────────────────
    await section('C. a living client with no estimate: no strip at all', async () => {
      await seed(ESTATE(6703, { svc: 'downsizing', matterType: '', deathDate: '', gate706: '', executor: '', executorFname: '', executorLname: '',
        name: 'Ruth Baker', fname: 'Ruth', lname: 'Baker', phone: '(561) 555-0199', email: 'ruth@example.com' }));
      await openDash(6703);
      eq(await stripCount(), 0, 'no strip: nothing to say, and the strip never explains an absence');
    });

    // ── D ────────────────────────────────────────────────────────────────────────────────────────────
    await section('D. a won probate estate, no target start: the dates beside the missing start; the §733.604 chip carries its date', async () => {
      await seed(ESTATE(6704, { svc: 'probate', matterType: 'probate', probateDeadline: '2026-12-15', probateCase: '2026-CP-004321',
        probateAttyName: 'Richard Comiter', probateAttyFirm: 'Comiter Law', probateAttyEmail: 'rc@example.com',
        name: 'Estate of Ida Moss', fname: 'Ida', lname: 'Moss', start: '', status: 'won', won: true, wonAt: '2026-09-29', approved: true }), EST(6704, 'probate'));
      await openDash(6704);
      const s = await strip();
      has(s, 'No target start on this job', 'the missing start is named');
      has(s, 'Court deadline Dec 15, 2026', '⚠⚠ and the court deadline sits beside it');
      has(s, 'Form 706 due Nov 10, 2026', '⚠⚠ and the 706 date');
      has(s, 'Set one in Edit Client to get a target end.', 'with the fix');
      ok(s.indexOf('Form 706') < s.indexOf('Set one in Edit Client'), 'the dates on the strip, the fix under them');

      // E-1: overflow with the strip on screen.
      ok(await overflow() <= 0, 'the dashboard fits at 1440 (' + await overflow() + ')');
      await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(300);
      ok(await overflow() <= 0, 'and at 390 (' + await overflow() + ')');
      const sw = await p.evaluate(() => { const c = document.querySelector('#client-dashboard-view .jt-sched'); return c ? c.scrollWidth - c.clientWidth : 99; });
      ok(sw <= 0, 'the strip does not overflow itself at 390 (' + sw + ')');
      await p.setViewportSize({ width: 1440, height: 1000 }); await p.waitForTimeout(300);

      await p.click('.nb:has-text("Job Plan")'); await p.waitForTimeout(900);
      eq(await val('#plan-job'), '6704', 'the Job Plan opens on that client');
      const chip = await p.evaluate(() => { const c = document.querySelector('#plan-gates-6704 [data-gate="deadline_733604"]'); return c ? { t: c.textContent, ok: c.classList.contains('gate-ok') } : null; });
      eq(chip && chip.ok, true, 'the §733.604 chip is green with the deadline recorded');
      has(chip && chip.t, '§733.604 inventory deadline Dec 15, 2026', '⚠⚠ and carries its date on the chip row');
      ok(await p.evaluate(() => { const c = document.querySelector('#plan-gates-6704 [data-gate="deadline_733604"]'); return !!c && c.checkVisibility(); }), 'on screen');
      has(await txt('#plan-sched'), 'Court deadline Dec 15, 2026', 'the plan header carries the same strip, with the court deadline');
      ok(await overflow() <= 0, 'the Job Plan fits at 1440 (' + await overflow() + ')');
      await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(300);
      ok(await overflow() <= 0, 'and at 390 (' + await overflow() + ')');
      await p.setViewportSize({ width: 1440, height: 1000 });
    });

    // ── E ────────────────────────────────────────────────────────────────────────────────────────────
    await section('E. no page errors', async () => {
      eq(errs, [], 'no page errors');
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
