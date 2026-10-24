// Step 96 — test clients (2026-10-23; Anthony: dummy clients beside the first live ones, left out of the figures).
// Through the real controls:
//
//   A. a list of live and test clients: the four tiles and Win / Loss count the live ones; each test client badged TEST
//   B. Edit Client on a live client: pick Test client, Save Changes, and the tiles drop it and its row and header gain TEST
//   C. the same control unmarks it
//   D. Client Intake shows Client record, opening on Live client; overflow at 1440 and 390; no page errors
//
//   NODE_PATH=<dir>/node_modules node tests/browser/step96.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    p.on('dialog', async (d) => { await d.accept(); });
    await p.goto(APP); await p.waitForTimeout(1600);

    const section = async (name, body) => {
      console.log('\n## ' + name);
      try { await body(); } catch (e) { fail++; console.log('  ✗ ' + name + ' threw: ' + String(e && e.message || e).split('\n')[0]); }
    };
    const txt = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }, sel);
    const tiles = async () => ({ tot: await txt('#m-tot'), act: await txt('#m-act'), pip: await txt('#m-pip') });
    const rowOf = (name) => p.evaluate((n) => { const r = [...document.querySelectorAll('#jobs-body tr')].find((tr) => tr.textContent.indexOf(n) >= 0); return r ? r.innerHTML : ''; }, name);
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

    await p.evaluate(() => {
      const base = { svc: 'downsizing_move', addr: '1 Live St', city: 'Palm Beach', zip: '33480', phone: '(561) 555-0100', email: 'a@example.com', sqft: '3000', ptype: 'Single Family Home', destAddr: '2 New St', destCity: 'Jupiter', destSqft: '1800', created: '2026-10-20', tc: 'Ashley Jerome', src: '', re: 'unknown', priority: 'normal' };
      jobs.length = 0;
      jobs.push(Object.assign({}, base, { id: 9601, hvlId: 'HVL-9601', name: 'Live Active', fname: 'Live', lname: 'Active', status: 'active', won: true, havellinEst: 30000 }));
      jobs.push(Object.assign({}, base, { id: 9602, hvlId: 'HVL-9602', name: 'Live New', fname: 'Live', lname: 'New', status: 'new', havellinEst: 12000 }));
      jobs.push(Object.assign({}, base, { id: 9603, hvlId: 'HVL-9603', name: 'Dummy Won', fname: 'Dummy', lname: 'Won', status: 'active', won: true, havellinEst: 90000, test: true }));
      jobs.push(Object.assign({}, base, { id: 9604, hvlId: 'HVL-9604', name: 'Dummy Lost', fname: 'Dummy', lname: 'Lost', status: 'lost', havellinEst: 5000, test: true }));
      _jobsState = 'ready';
      saveJobs();
      goToClientDashboard();
      renderJobs();
    });
    await p.waitForTimeout(400);

    await section('A. the figures count live clients; test clients are listed, badged', async () => {
      eq(await tiles(), { tot: '2', act: '1', pip: '$42,000' }, 'Total Jobs, Active and Pipeline read the two live clients');
      has(await rowOf('Dummy Won'), '>TEST<', 'the test client\'s row carries TEST');
      ok((await rowOf('Live Active')).indexOf('>TEST<') < 0, 'a live row does not');
      const wl = await p.evaluate(() => { const f = winLossFigures(); return [f.won.length, f.lost.length]; });
      eq(wl, [1, 0], 'Win / Loss: one won, none lost (the test won and the test lost are out)');
      ok(await p.locator('#jobs-body tr', { hasText: 'Dummy Won' }).first().isVisible(), 'the test client is on screen under All');
    });

    await section('B. Edit Client marks a live client as test', async () => {
      await p.locator('#jobs-body tr', { hasText: 'Live New' }).first().click();
      await p.waitForTimeout(600);
      const edit = p.locator('button', { hasText: 'Edit Client' }).first();
      ok(await edit.isVisible(), 'Edit Client is on the dashboard');
      await edit.click(); await p.waitForTimeout(400);
      const sel = p.locator('#ec-test');
      ok(await sel.isVisible(), 'the Client record control is in the modal');
      eq(await sel.inputValue(), 'live', 'it opens on Live client');
      await sel.selectOption('test');
      await p.locator('button', { hasText: 'Save Changes' }).first().click();
      await p.waitForTimeout(600);
      eq(await p.evaluate(() => jobs.find((j) => j.id === 9602).test), true, 'the record is marked test');
      has(await p.evaluate(() => { const v = document.getElementById('client-dashboard-view'); return v ? v.innerHTML : ''; }), 'b-test', 'the dashboard header badges it');
      await p.evaluate(() => goToClientDashboard()); await p.waitForTimeout(400);
      eq(await tiles(), { tot: '1', act: '1', pip: '$30,000' }, 'and the tiles drop it');
      has(await rowOf('Live New'), '>TEST<', 'its row carries TEST');
    });

    await section('C. the same control unmarks it', async () => {
      await p.locator('#jobs-body tr', { hasText: 'Live New' }).first().click(); await p.waitForTimeout(600);
      await p.locator('button', { hasText: 'Edit Client' }).first().click(); await p.waitForTimeout(400);
      eq(await p.locator('#ec-test').inputValue(), 'test', 'it opens on Test client');
      await p.locator('#ec-test').selectOption('live');
      await p.locator('button', { hasText: 'Save Changes' }).first().click(); await p.waitForTimeout(600);
      await p.evaluate(() => goToClientDashboard()); await p.waitForTimeout(400);
      eq(await tiles(), { tot: '2', act: '1', pip: '$42,000' }, 'back in the figures');
      ok((await rowOf('Live New')).indexOf('>TEST<') < 0, 'and the badge is gone');
    });

    await section('D. Client Intake asks it; overflow; errors', async () => {
      ok(await overflow() <= 0, 'no horizontal overflow on the list at 1440 (' + await overflow() + ')');
      await p.locator('#btn-add-client').click(); await p.waitForTimeout(500);
      const sel = p.locator('#i-test');
      ok(await sel.isVisible(), 'Client record is on the intake form');
      eq(await sel.inputValue(), 'live', 'opening on Live client');
      ok(await overflow() <= 0, 'no horizontal overflow on intake at 1440');
      await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(400);
      ok(await sel.isVisible(), 'and at 390');
      ok(await overflow() <= 0, 'no horizontal overflow on intake at 390 (' + await overflow() + ')');
      eq(errs, [], 'no page errors');
    });

    await b.close();
    console.log('\n' + pass + ' passed, ' + fail + ' failed');
  } catch (e) {
    console.log('  ✗ threw: ' + (e && e.stack || e));
    if (b) await b.close().catch(() => {});
    console.log('\n' + pass + ' passed, ' + (fail + 1) + ' failed');
  }
})();
