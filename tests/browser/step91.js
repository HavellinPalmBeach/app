// Step 91 — the incident guide (2026-10-19; Anthony: "create an .html 'incident report guide' and link it to the app").
//
// Drives the REAL page: an active Home Transition's Job Plan with the Incidents card carrying *Read Reporting an Incident*;
// the link pressed with the mouse opens the page over the plan (no new tab), headed by the page's name, the page rendered in
// the frame, Close emptying it; a damage incident recorded through the real dialog leaves the link on the repainted card; the
// same on a 390 px phone; the page itself at 1440 and 390 with no horizontal overflow, its pocket card and its links to the
// neighbouring guides, and in print media; zero page errors.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step91.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
const GUIDE = APP.replace(/havellin\.html$/, 'incident-guide.html');
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');
const SYNC = 'https://sync.example.test/exec';
const T0 = Date.parse('2026-10-05T15:00:00Z');
const MM = 9001;

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
    await ctx.route(SYNC + '**', async (r) => {
      const json = (o) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(o) });
      if (r.request().method() === 'POST') {
        let body = {}; try { body = JSON.parse(r.request().postData() || '{}'); } catch (e) {}
        if (body.action === 'uploadFile') return json({ ok: true, fileUrl: 'https://drive.google.com/file/d/INC1/view', fileId: 'INC1' });
        if (body.action === 'getSubfolders') return json({ ok: true, subfolders: { 'Incident Reports': 'IR90' } });
        return json({ ok: true });
      }
      if (/action=loadMedia/.test(r.request().url())) return json({ ok: true, media: {} });
      return json({ ok: true });
    });
    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    p.on('dialog', async (d) => { await d.accept(); });
    await p.goto(APP); await p.waitForTimeout(1600);
    await p.evaluate((u) => { SHEETS_SYNC_URL = u; localStorage.setItem('hav_device_user', 'Ashley Jerome'); }, SYNC);
    const section = async (name, body) => {
      console.log('\n## ' + name);
      try { await body(); } catch (e) { fail++; console.log('  ✗ ' + name + ' threw: ' + String(e && e.message || e).split('\n')[0]); }
    };
    const vis = (sel) => p.locator(sel).first().isVisible().catch(() => false);
    const press = async (sel, what) => {
      const n = await p.locator(sel).count();
      const v = n >= 1 && await vis(sel);
      ok(v, (what || sel) + ' — on screen (' + n + ')');
      if (v) { await p.locator(sel).first().click({ timeout: 5000 }).catch((e) => ok(false, (what || sel) + ' — ' + e.message.split('\n')[0])); await p.waitForTimeout(700); }
      return v;
    };
    const txt = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }, sel);
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const plan = async (id) => {
      await p.click('.nb[onclick*="\'job-plan\'"]'); await p.waitForTimeout(900);
      const cur = await p.evaluate(() => document.getElementById('plan-job').value);
      if (String(cur) !== String(id)) { await p.selectOption('#plan-job', String(id)); await p.waitForTimeout(900); }
    };
    const LINK = '#plan-incidents-' + MM + ' a[href="incident-guide.html"]';
    const panelOpen = () => p.evaluate(() => document.getElementById('guide-modal').checkVisibility());
    const openAndCheck = async (where) => {
      const pagesBefore = ctx.pages().length;
      await press(LINK, 'Read Reporting an Incident (' + where + ')');
      eq(ctx.pages().length, pagesBefore, where + ': no new tab opened');
      ok(await panelOpen(), where + ': the guide panel is over the plan');
      eq(await p.evaluate(() => document.getElementById('guide-title').textContent), 'Reporting an Incident', where + ': headed Reporting an Incident');
      ok(/incident-guide\.html$/.test(await p.evaluate(() => document.getElementById('guide-frame').getAttribute('src'))), where + ': the page is in the frame');
      await p.waitForTimeout(900);
      has(await p.frameLocator('#guide-frame').locator('h1').textContent().catch(() => ''), 'Reporting an Incident', where + ': the page itself rendered inside it');
      ok(/incident-guide\.html$/.test(await p.evaluate(() => document.getElementById('guide-open').getAttribute('href'))), where + ': Open in its own tab points at the page');
      await press('#guide-modal button', 'Close (' + where + ')');
      ok(!(await panelOpen()), where + ': Close hides the panel');
      eq(await p.evaluate(() => document.getElementById('guide-frame').getAttribute('src')), 'about:blank', where + ': and empties the frame');
    };

    // ── Seed: an active Home Transition with no incident ──
    await p.evaluate(([MM, T0]) => {
      jobs.unshift({ id: MM, hvlId: 'HVL-2610-M901', name: 'Ruth Adler', fname: 'Ruth', lname: 'Adler', svc: 'downsizing_move', addr: '901 Seaview Ave', city: 'Palm Beach',
        email: 'ruth@example.com', phone: '(561) 555-0100', sqft: '3200', beds: '3', baths: '2', propVal: '4200000', status: 'active', won: true, wonAt: '2026-09-24', start: '2026-10-06',
        activatedOn: '2026-10-05', tc: 'Ashley Jerome', agrApproved: true, agrSent: true, agrSigned: true, at: {}, incidents: [],
        docState: { estimate: { sentAt: '2026-09-24T14:00:00Z' }, agreement: { sentAt: '2026-09-26T14:00:00Z', sig: { signedBy: 'Ruth Adler', signedAt: '2026-09-28' } } },
        payments: [{ uid: 'p' + MM, stage: 'deposit', amount: 7325, receivedOn: '2026-10-01', method: 'wire', clearedOn: '2026-10-01' }],
        driveFolder: 'https://drive.google.com/drive/folders/f' + MM, driveSubfolders: { 'Incident Reports': 'IR90' }, destAddr: '1 Devonshire Way', destSqft: '1800' });
      estimateStore[MM] = { approved: true, submitted: true, approvedBy: 'Anthony Graziano', approvedAt: 'September 23, 2026', savedAt: T0,
        estimate: { jobId: MM, svc: 'downsizing_move', havellinTotal: 14650, grandTotal: 14650, totTC: 40, totPS: 60, tcRate: 150, psRate: 100, tcFee: 6000, psFee: 6000, days: 5,
          vendors: [], prepItems: [], pkgCost: 0, collections: [], psSlots: [], rooms: [{ idx: 0, name: 'Living Room', st: 'in', vol: 3, cplx: 3 }] } };
      saveJobs(); localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore));
      _logsState = 'ready';
    }, [MM, T0]);

    // ── A ─────────────────────────────────────────────────────────────────────────────────────
    await section('A. the Incidents card carries the link under its note; pressed, the page opens over the plan', async () => {
      await plan(MM);
      ok(await vis('#plan-incidents-' + MM), 'the Incidents card is on the plan');
      eq(await p.locator(LINK).count(), 1, 'Read Reporting an Incident linked once on it');
      eq(await txt(LINK), 'Read Reporting an Incident →', 'in those words');
      eq(await p.locator('#plan-incidents-' + MM + ' a[target="_blank"]').count(), 0, '⚠ nothing on the card opens a new tab');
      const card = await txt('#plan-incidents-' + MM);
      ok(card.indexOf('A vulnerable adult concern stays internal') < card.indexOf('Read Reporting an Incident'), 'the link sits under the note');
      await openAndCheck('desk');
    });

    // ── B ─────────────────────────────────────────────────────────────────────────────────────
    await section('B. a damage incident recorded through the real dialog: the repainted card keeps the link beside the incident', async () => {
      await press('button[onclick="openIncident(' + MM + ',\'report\')"]', 'Report an incident');
      await press('#inc-kind-damage', 'Property damage');
      await p.fill('#inc-where', 'Study'); await p.fill('#inc-what', 'The crystal decanter slipped off the tray while it was being wrapped.');
      await p.fill('#inc-f1', 'Waterford decanter, item 14'); await p.fill('#inc-money', '900');
      if (!(await p.evaluate(() => document.getElementById('inc-reported-by').value))) await p.fill('#inc-reported-by', 'Ashley Jerome');
      await press('#inc-save-btn', 'Record');
      eq(await p.evaluate((id) => jobs.find((j) => j.id === id).incidents.filter((e) => e.entry === 'report').length, MM), 1, 'one report on the job');
      has(await txt('#plan-incidents-' + MM), 'Incident 1 · Property damage', 'the card shows it');
      has(await txt('#plan-incidents-' + MM), 'client notified within 24 hours', 'with the §6.3 reminder the page describes');
      eq(await p.locator(LINK).count(), 1, 'and still carries the link once');
      await openAndCheck('with an incident');
    });

    // ── C ─────────────────────────────────────────────────────────────────────────────────────
    await section('C. on a 390 px phone: the link on screen, the panel full screen, no overflow', async () => {
      await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(700);
      await plan(MM);
      ok((await overflow()) <= 0, 'no horizontal overflow at 390 (' + (await overflow()) + 'px)');
      await p.locator(LINK).first().scrollIntoViewIfNeeded().catch(() => {});
      await openAndCheck('phone');
      await p.setViewportSize({ width: 1440, height: 1000 }); await p.waitForTimeout(500);
      await plan(MM);
      eq(await overflow(), 0, 'no horizontal overflow at 1440');
      eq(errs, [], 'zero page errors on the app');
    });

    // ── D ─────────────────────────────────────────────────────────────────────────────────────
    await section('D. the page itself: its sections, the pocket card, its neighbours, no overflow at 1440 and 390, print media', async () => {
      const g = await ctx.newPage();
      const gerrs = []; g.on('pageerror', (e) => gerrs.push(String(e)));
      await g.goto(GUIDE); await g.waitForTimeout(600);
      eq(await g.evaluate(() => document.querySelector('h1').textContent), 'Reporting an Incident', 'headed');
      const h2 = await g.evaluate(() => Array.from(document.querySelectorAll('h2')).map((h) => h.textContent.trim()));
      ['The first ten minutes', 'What counts', 'Recording it', 'Property damage: the six promises', 'The call to Anthony', 'A vulnerable adult', 'Afterwards', 'Where it ends up', 'Tricky spots', 'Something went wrong']
        .forEach((s) => ok(h2.indexOf(s) >= 0, 'section ' + s));
      eq(await g.locator('.card ol li').count(), 10, 'ten pocket-card items');
      eq(await g.locator('input[type=checkbox]').count(), 0, '⚠ nothing to tick');
      const body = await g.evaluate(() => document.querySelector('.wrap').textContent.replace(/\s+/g, ' '));
      has(body, '(617) 650-6588', 'Anthony’s number');
      has(body, '1-800-962-2873', 'the hotline');
      has(body, 'Above $500, engage the insurance carrier', 'the $500 floor');
      for (const f of ['sorting-guide.html', 'packing-guide.html', 'move-day-guide.html', 'first-night-guide.html', 'photography-guide.html', 'firearms-protocol.html', 'concierge-guide.html'])
        eq(await g.locator('a[href="' + f + '"]').count() >= 1, true, 'links ' + f);
      eq(await g.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 0, 'no horizontal overflow at 1440');
      await g.setViewportSize({ width: 390, height: 844 }); await g.waitForTimeout(400);
      ok((await g.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 0, 'no horizontal overflow at 390');
      const tbl = await g.evaluate(() => { const t = document.querySelector('.tbl-scroll'); return t ? [t.scrollWidth > t.clientWidth, getComputedStyle(t).overflowX] : null; });
      ok(tbl && tbl[1] === 'auto', 'a wide table scrolls inside its own box on a phone');
      await g.emulateMedia({ media: 'print' }); await g.waitForTimeout(300);
      eq(await g.evaluate(() => getComputedStyle(document.querySelector('.card')).breakBefore), 'page', 'in print the pocket card starts its own page');
      eq(await g.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(255, 255, 255)', 'and prints on white');
      eq(gerrs, [], 'zero page errors on the page');
      await g.close();
    });
  } catch (e) {
    fail++; console.log('  ✗ step91 threw: ' + (e && e.stack || e));
  } finally {
    if (b) await b.close();
  }
  console.log('\nstep91: ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
