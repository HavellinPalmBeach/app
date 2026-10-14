// Step 79 — the Premium Estate hint fires at $10M, not $5M (2026-10-14, Anthony on the pricing grid).
//
// The home value prices nothing; its one reader on Build Estimate is the hint under the Premium Estate
// toggle. It fired at $5M, and at coastal Palm Beach County prices ($1,500 to $3,000 a square foot) nearly
// every home clears that, so it fired on everything. Anthony: "Raise the Premium hint threshold to $10M."
//
// This drives the REAL page: a client recorded at $5M – $10M opens Build Estimate with no hint; the value
// is raised through the real Edit Client box and its Save Changes button; Build Estimate then shows the
// hint, and ticking the real Premium Estate toggle clears it.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step79.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL ' + m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + ' (got ' + JSON.stringify(a) + ')');
const has = (s, n, m) => ok(String(s).indexOf(n) >= 0, m + ' (in ' + JSON.stringify(String(s).slice(0, 300)) + ')');
const lacks = (s, n, m) => ok(String(s).indexOf(n) < 0, m + ' (found ' + JSON.stringify(n) + ')');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  p.on('dialog', async (d) => { await d.accept(); });
  await p.goto(APP); await p.waitForTimeout(1500);
  const overflow = () => p.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
  const badge = () => p.evaluate(() => ((document.getElementById('prop-mult-badge') || {}).textContent || '').replace(/\s+/g, ' ').trim());

  // A living client on the island, recorded at intake's $5M – $10M bucket (stored as 7,500,000).
  await p.evaluate(() => {
    jobs.unshift({ id: 7901, hvlId: 'HVL-2610-HINT', name: 'Vera Lindqvist', fname: 'Vera', lname: 'Lindqvist', sqft: '2000',
      svc: 'home_cleanout', addr: '2 Sloans Curve Dr', city: 'Palm Beach', email: 'vera@example.com', phone: '(561) 555-0179',
      beds: '2', baths: '2', halfBaths: '0', propVal: '7500000', created: '2026-10-10', status: 'new', tc: 'Ashley Jerome' });
    saveJobs();
  });
  await p.evaluate(() => openEstimateScreen(7901));
  await p.waitForTimeout(800);
  eq(await p.evaluate(() => document.getElementById('e-propval').value), '7500000', 'Build Estimate carries the client\'s recorded value');
  lacks(await badge(), 'consider the Premium Estate rate', 'at $5M – $10M there is no Premium Estate hint (it fired here until 2026-10-14)');
  eq(await overflow(), 0, 'no horizontal overflow at 1440');

  // Raise the value through the real Edit Client box and Save Changes.
  await p.evaluate(() => openClientDashboard(7901));
  await p.waitForTimeout(600);
  await p.evaluate(() => dashEditClient(7901));
  await p.waitForTimeout(500);
  eq(await p.evaluate(() => document.getElementById('edit-client-modal').style.display !== 'none'), true, 'Edit Client is open');
  await p.fill('#ec-home-value', '14000000');
  await p.click('#edit-client-modal button.btn-p');
  await p.waitForTimeout(800);
  eq(await p.evaluate(() => jobs.find((j) => j.id === 7901).propVal), '14000000', 'Save Changes recorded $14,000,000 (the $10M – $20M bucket)');

  await p.evaluate(() => openEstimateScreen(7901));
  await p.waitForTimeout(800);
  eq(await p.evaluate(() => document.getElementById('e-propval').value), '14000000', 'Build Estimate reopens on the new value');
  const hint = await badge();
  has(hint, 'consider the Premium Estate rate', 'at $10M and up the hint shows');
  has(hint, 'High-value property', 'and names the property');
  await p.click('#e-prem + span.slider');   // the real toggle (the checkbox itself is hidden)
  await p.waitForTimeout(400);
  lacks(await badge(), 'consider the Premium Estate rate', 'ticking the real Premium Estate toggle clears it');
  await p.click('#e-prem + span.slider');   // the real toggle (the checkbox itself is hidden)
  await p.waitForTimeout(400);
  has(await badge(), 'consider the Premium Estate rate', 'and unticking it brings it back');

  await p.setViewportSize({ width: 390, height: 844 });
  await p.waitForTimeout(400);
  eq(await overflow(), 0, 'no horizontal overflow on Build Estimate at 390');
  eq(errs, [], 'no page errors');
  await b.close();
  console.log(`step79: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log('step79 CRASH ' + e.stack); process.exit(1); });
