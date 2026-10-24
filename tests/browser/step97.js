// Step 97 — The Evening Desk (2026-10-23; Anthony, 2026-10-22: "let's write a 'how to use the admin/inventory tab best
// practices document' (with a better name LOL) so ashley and I know how to use it. and embed a link at the top of the tab like
// the photography field guide").
//
// Drives the REAL page: Job Admin & Inv opened through its own nav button with no client chosen, then on an active probate
// estate and on a Home Prep job, each picked through the tab's own client picker; on each, *Read The Evening Desk* at the top
// of the tab, pressed with the mouse: the page opens over the app (no new tab), headed by its name, rendered in the frame,
// Open in its own tab pointing at it, Close hiding the panel and emptying the frame; the same on a 390 px phone, the tab with no
// sideways scroll. Then the page itself at 1440 and 390, in light and in dark: no horizontal overflow, nothing past the right
// edge, its own background in each theme, its sections, the pocket card and its neighbours, and in print media; zero page
// errors throughout.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step97.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
const GUIDE = APP.replace(/havellin\.html$/, 'evening-desk-guide.html');
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const SYNC = 'https://sync.example.test/exec';
const EST = 9701, PREP = 9702;

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
    // The page's web fonts are not this step's subject: refused at once, so a slow network cannot stall a measure.
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    await ctx.route(SYNC + '**', async (r) => {
      const json = (o) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
      if (/action=loadMedia/.test(r.request().url())) return json({ ok: true, media: {} });
      if (/action=getDriveThumbnails/.test(r.request().url())) return json({ ok: true, thumbs: {} });
      return json({ ok: true });
    });
    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    p.on('dialog', async (d) => { await d.accept(); });
    await p.goto(APP); await p.waitForTimeout(1600);
    await p.evaluate((u) => { SHEETS_SYNC_URL = u; try { localStorage.setItem('hav_device_user', 'Ashley Jerome'); } catch (e) {} window.open = function () { return null; }; }, SYNC);
    const section = async (name, body) => {
      console.log('\n## ' + name);
      try { await body(); } catch (e) { fail++; console.log('  ✗ ' + name + ' threw: ' + String(e && e.message || e).split('\n')[0]); }
    };
    const overflow = (pg) => (pg || p).evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const LINK = '#panel-inventory a[href="evening-desk-guide.html"]';
    const panelOpen = () => p.evaluate(() => document.getElementById('guide-modal').checkVisibility());

    // ── Seed: an active probate estate with a few items, and a Home Prep job ──
    await p.evaluate(([EST, PREP]) => {
      const T = Date.now() - 6 * 86400000;
      jobs.unshift({ id: EST, hvlId: 'HVL-2610-E970', name: 'Eleanor Ashworth', svc: 'probate', matterType: 'probate', addr: '210 Via Bellaria', city: 'Palm Beach', zip: '33480',
        executor: 'Thomas Ashworth', executorRole: 'Personal Representative', executorEmail: 't.ashworth@example.com', deathDate: '2026-04-02', executorAuth: 'received',
        probateAttyName: 'Ann Lowe', probateAttyEmail: 'ann@lowe.law', docTier: 'values', gate706: 'yes', status: 'active', won: true, wonAt: '2026-09-25', approved: true,
        tc: 'Ashley Jerome', created: '2026-09-20', start: '2026-10-06', activatedOn: '2026-10-05', agrApproved: true, agrSent: true, agrSigned: true, sqft: 4200,
        mustFind: 'Father’s pocket watch', driveFolder: 'https://drive.google.com/drive/folders/ROOT970', at: {},
        docState: { agreement: { sentAt: '2026-09-26T14:00:00Z', sig: { signedBy: 'Thomas Ashworth', signedAt: '2026-09-28' } }, 'invoice:deposit': { sentAt: '2026-09-29T14:00:00Z' } },
        payments: [{ uid: 'e1', stage: 'deposit', amount: 20000, receivedOn: '2026-10-01', method: 'wire', clearedOn: '2026-10-01' }] });
      estimateStore[EST] = { approved: true, submitted: true, approvedBy: 'Anthony Graziano', savedAt: T,
        estimate: { jobId: EST, svc: 'probate', havellinTotal: 40000, fixedPrice: true, fixedAmount: 40000, fixedLines: true, totTC: 100, totPS: 150, tcRate: 150, psRate: 100, days: 8,
          vendors: [], prepItems: [], pkgCost: 0, rooms: [{ idx: 0, name: 'Living Room', st: 'in', vol: 3, cplx: 3 }, { idx: 1, name: 'Kitchen', st: 'in', vol: 3, cplx: 3 }] } };
      const item = (id, o) => Object.assign({ stableId: id, label: 'inventory', roomIdx: 0, status: 'uploaded', category: 'Furniture', disposition: '', objectName: '', ts: T, updatedAt: T,
        filename: 'HVL_' + EST + '_INV_' + id + '.jpg', driveFileId: 'f-' + id, driveFileUrl: 'https://drive.google.com/file/d/f-' + id + '/view' }, o);
      _photoRefs[EST] = [
        item('a1', { itemNo: 1, objectName: 'Harbor scene oil painting', category: 'Art & Décor', fmv: '2400', disposition: 'Auction', channel: 'Kodner Galleries', namedBy: 'desk' }),
        item('a2', { itemNo: 2, roomIdx: 1, objectName: 'Copper cookware set', category: 'General/Household', namedBy: 'agent' })];
      savePhotoRefs(EST);
      jobs.unshift({ id: PREP, hvlId: 'HVL-2610-P970', name: 'Margaret Whitfield', svc: 'prep', addr: '9 Banyan Rd', city: 'Palm Beach', zip: '33480', email: 'mw@example.com',
        status: 'active', won: true, approved: true, tc: 'Ashley Jerome', created: '2026-09-20', start: '2026-11-02', activatedOn: '2026-10-20',
        agrApproved: true, agrSent: true, agrSigned: true, driveFolder: 'https://drive.google.com/drive/folders/R' + PREP, docState: {}, payments: [], at: {} });
      estimateStore[PREP] = { approved: true, submitted: true, estimate: { jobId: PREP, svc: 'prep', havellinTotal: 3000, rooms: [], vendors: [], prepItems: [] } };
      saveJobs(); localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore));
    }, [EST, PREP]);

    // The desk through its own nav button; a client through its own picker ('' leaves none chosen).
    const toDesk = async (id) => {
      await p.click('.nb[onclick*="\'inventory\'"]'); await p.waitForTimeout(800);
      const cur = String(await p.evaluate(() => (document.getElementById('inv-job') || {}).value));
      if (cur !== String(id)) { await p.selectOption('#inv-job', String(id)); await p.waitForTimeout(1000); }
    };
    const openAndCheck = async (where) => {
      eq(await p.locator(LINK).count(), 1, where + ': Read The Evening Desk linked once at the top of the tab');
      ok(await p.locator(LINK).isVisible(), where + ': on screen');
      eq((await p.locator(LINK).textContent()).trim(), 'Read The Evening Desk →', where + ': in those words');
      const y = await p.evaluate(() => {
        const a = document.querySelector('#panel-inventory a[href="evening-desk-guide.html"]');
        const c = document.getElementById('inventory-content');
        return [Math.round(a.getBoundingClientRect().top), Math.round(c.getBoundingClientRect().top)];
      });
      ok(y[0] < y[1], where + ': above everything the tab draws for a client (' + y.join(' < ') + ')');
      const pagesBefore = ctx.pages().length;
      await p.locator(LINK).click(); await p.waitForTimeout(700);
      eq(ctx.pages().length, pagesBefore, where + ': no new tab opened');
      ok(await panelOpen(), where + ': ⚠⚠ the guide opens over the app');
      eq(await p.evaluate(() => document.getElementById('guide-title').textContent), 'The Evening Desk', where + ': headed The Evening Desk');
      ok(/evening-desk-guide\.html$/.test(await p.evaluate(() => document.getElementById('guide-frame').getAttribute('src'))), where + ': the guide in the frame');
      ok(/evening-desk-guide\.html$/.test(await p.evaluate(() => document.getElementById('guide-open').getAttribute('href'))), where + ': Open in its own tab points at it');
      await p.waitForTimeout(700);
      has(await p.frameLocator('#guide-frame').locator('h1').textContent().catch(() => ''), 'The Evening Desk', where + ': the page itself rendered inside it');
      ok(await p.locator('#panel-inventory').isVisible(), where + ': the tab is still behind it (nothing navigated)');
      await p.locator('#guide-modal button', { hasText: 'Close' }).click(); await p.waitForTimeout(400);
      ok(!(await panelOpen()), where + ': Close hides the panel');
      eq(await p.evaluate(() => document.getElementById('guide-frame').getAttribute('src')), 'about:blank', where + ': and empties the frame');
    };

    // ── A ─────────────────────────────────────────────────────────────────────────────────────
    await section('A. no client chosen: the link at the top of the tab opens the guide over the app', async () => {
      await toDesk('');
      eq(String(await p.evaluate(() => document.getElementById('inv-job').value)), '', 'fixture: no client chosen');
      has(await p.evaluate(() => document.getElementById('inventory-content').textContent), 'Select a client', 'fixture: the tab asks for a client');
      await openAndCheck('no client');
    });

    // ── B ─────────────────────────────────────────────────────────────────────────────────────
    await section('B. on an estate: the link above the client line, the strip and the band', async () => {
      await toDesk(EST);
      ok(await p.locator('#inventory-content .job-hdr').isVisible(), 'fixture: the estate’s desk is drawn');
      ok(await p.locator('#desk-fold-releases-' + EST).count() === 1, 'fixture: with its bars');
      await openAndCheck('estate');
      eq(await overflow(), 0, 'the estate’s desk: no sideways scroll at 1440');
    });

    // ── C ─────────────────────────────────────────────────────────────────────────────────────
    await section('C. on a Home Prep job: the link is there too', async () => {
      await toDesk(PREP);
      ok(await p.locator('#inventory-content .ja-card').isVisible(), 'fixture: the Home Prep desk (Job Admin) is drawn');
      eq(await p.locator('#inventory-content [id^="desk-fold-"]').count(), 0, 'fixture: no bars on Home Prep');
      await openAndCheck('Home Prep');
    });

    // ── D ─────────────────────────────────────────────────────────────────────────────────────
    await section('D. on a 390 px phone: the link on screen, the guide over the app, no sideways scroll', async () => {
      await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(600);
      await toDesk(EST);
      eq(await overflow(), 0, 'no sideways scroll at 390');
      const r = await p.evaluate(() => { const a = document.querySelector('#panel-inventory a[href="evening-desk-guide.html"]').getBoundingClientRect(); return [Math.round(a.left), Math.round(a.right), document.documentElement.clientWidth]; });
      ok(r[0] >= 0 && r[1] <= r[2], 'the link inside the screen (' + r.join(', ') + ')');
      await openAndCheck('phone');
      await p.setViewportSize({ width: 1440, height: 1000 }); await p.waitForTimeout(400);
      eq(errs, [], 'zero page errors on the app');
    });

    // ── E ─────────────────────────────────────────────────────────────────────────────────────
    await section('E. the page itself: 1440 and 390, light and dark, print', async () => {
      for (const scheme of ['light', 'dark']) {
        const gctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: scheme });
        await gctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
        const g = await gctx.newPage();
        const gerrs = []; g.on('pageerror', (e) => gerrs.push(String(e)));
        await g.goto(GUIDE); await g.waitForTimeout(500);
        eq(await g.evaluate(() => document.querySelector('h1').textContent), 'The Evening Desk', scheme + ': headed');
        const bg = await g.evaluate(() => getComputedStyle(document.body).backgroundColor);
        eq(bg, scheme === 'dark' ? 'rgb(23, 20, 15)' : 'rgb(250, 248, 244)', scheme + ': the page’s own background');
        for (const w of [1440, 390]) {
          await g.setViewportSize({ width: w, height: 900 }); await g.waitForTimeout(300);
          eq(await overflow(g), 0, scheme + ' ' + w + ': no horizontal overflow');
          const past = await g.evaluate(() => {
            const W = document.documentElement.clientWidth;
            return Array.from(document.querySelectorAll('.wrap *')).filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.right > W + 1 && !el.closest('.tbl-scroll'); })
              .map((el) => el.tagName + ':' + el.textContent.trim().slice(0, 30)).slice(0, 5);
          });
          eq(past, [], scheme + ' ' + w + ': nothing past the right edge');
        }
        if (scheme === 'light') {
          const h2 = await g.evaluate(() => Array.from(document.querySelectorAll('h2')).map((h) => h.textContent.trim()));
          ['Before you sit down', '1. The top of the page', '2. Job Admin', '3. Tonight’s items', '4. The four bars', 'Estate, living work, Home Prep', 'The week of a job',
           'Rules that never bend', 'Tricky spots', 'Something went wrong'].forEach((s) => ok(h2.indexOf(s) >= 0, 'section ' + s));
          const h3 = await g.evaluate(() => Array.from(document.querySelectorAll('section h3')).map((h) => h.textContent.trim()));
          // The four bars' headings, read off the live app's own catalogue.
          const titles = await p.evaluate(() => Object.keys(DESK_FOLDS).map((k) => DESK_FOLDS[k].title));
          ok(titles.length === 4 && titles.every((t) => h3.indexOf(t) >= 0), 'the four bars by the app’s own titles: ' + titles.join(' / '));
          eq(await g.locator('.card ol li').count(), 9, 'nine pocket-card items');
          eq(await g.locator('input[type=checkbox]').count(), 0, '⚠ nothing to tick');
          for (const f of ['photography-guide.html', 'incident-guide.html', 'sorting-guide.html', 'packing-guide.html', 'move-day-guide.html', 'first-night-guide.html', 'firearms-protocol.html', 'concierge-guide.html'])
            ok(await g.locator('a[href="' + f + '"]').count() >= 1, 'links ' + f);
          await g.setViewportSize({ width: 390, height: 844 }); await g.waitForTimeout(300);
          const tbl = await g.evaluate(() => { const t = document.querySelector('.tbl-scroll'); return t ? getComputedStyle(t).overflowX : null; });
          eq(tbl, 'auto', 'a wide table scrolls inside its own box on a phone');
          await g.emulateMedia({ media: 'print' }); await g.waitForTimeout(300);
          eq(await g.evaluate(() => getComputedStyle(document.querySelector('.card')).breakBefore), 'page', 'in print the pocket card starts its own page');
          eq(await g.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(255, 255, 255)', 'and prints on white');
        }
        eq(gerrs, [], scheme + ': zero page errors on the page');
        await gctx.close();
      }
    });
  } catch (e) {
    fail++; console.log('  ✗ step97 threw: ' + (e && e.stack || e));
  } finally {
    if (b) await b.close();
  }
  console.log('\nstep97: ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
