// Step 97 — blank boxes (2026-10-23; Anthony: "on any forms, remove the example stuff that is in the fields … in the
// worst case, they look like they are already filled out. just need blank boxes to fill in, no suggestions").
// Through the real controls:
//
//   A. the whole page at boot: no input or textarea carries a placeholder but the four search bars
//   B. Client Intake on a Home Transition: every box on screen blank, the Move Destination's four included, the client's
//      name boxes labelled First name / Last name, the must-find rule on its label, a ticked house row's prompt over an
//      empty box
//   C. an estate service: the blocked phone and email boxes blank, the Court's hint on its label
//   D. Edit Client on a seeded client: every box in the modal carries no placeholder, and the home value claims no refusal
//   E. at 390 px: the same boxes blank and no horizontal overflow; no page errors
//
//   NODE_PATH=<dir>/node_modules node tests/browser/step97.js [/abs/path/to/havellin.html]
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
    // Every box under a container that a person can see, with what it shows: its value and its placeholder.
    const shown = (root) => p.evaluate((r) => {
      const host = document.querySelector(r);
      if (!host) return null;
      return [...host.querySelectorAll('input, textarea')]
        .filter((e) => e.type !== 'hidden' && e.type !== 'checkbox' && e.type !== 'radio' && e.type !== 'search' && e.checkVisibility())
        .map((e) => ({ id: e.id || e.className || e.type, value: e.value, ph: e.placeholder }));
    }, root);
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

    await section('A. the whole page: no box but a search bar carries a placeholder', async () => {
      const all = await p.evaluate(() => [...document.querySelectorAll('input, textarea')].length);
      ok(all > 150, 'the page really holds its boxes (' + all + ')');
      const withPh = await p.evaluate(() => [...document.querySelectorAll('input[placeholder], textarea[placeholder]')]
        .filter((e) => e.type !== 'search').map((e) => e.id + ' → ' + e.placeholder));
      eq(withPh, [], 'no input or textarea has a placeholder');
      eq(await p.evaluate(() => [...document.querySelectorAll('input[type="search"][placeholder]')].length), 3,
        'the three directory search bars keep their hint (the desk\'s is drawn with the inventory)');
    });

    await section('B. Client Intake on a Home Transition: blank boxes, labels outside them', async () => {
      await p.locator('#btn-add-client').click(); await p.waitForTimeout(500);
      await p.selectOption('#i-svc', 'downsizing_move'); await p.waitForTimeout(300);
      const boxes = await shown('#panel-intake');
      ok(boxes && boxes.length > 20, 'the form is on screen (' + (boxes || []).length + ' boxes)');
      eq((boxes || []).filter((x) => x.ph !== ''), [], 'no box on the form shows a placeholder');
      eq((boxes || []).filter((x) => x.value !== '' && x.id !== 'i-date' && !/date/.test(x.id)).map((x) => x.id), [],
        'and none opens holding text');
      for (const id of ['i-dest-addr', 'i-dest-city', 'i-dest-sqft', 'i-dest-contact']) {
        const v = await p.evaluate((i) => { const e = document.getElementById(i); return e ? { vis: e.checkVisibility(), ph: e.placeholder, val: e.value } : null; }, id);
        eq(v, { vis: true, ph: '', val: '' }, 'the Move Destination\'s ' + id + ' is on screen and blank');
      }
      const names = await p.evaluate(() => ['i-fname', 'i-lname'].map((i) => {
        const e = document.getElementById(i); const l = e && e.previousElementSibling;
        return l && l.tagName === 'LABEL' ? l.textContent.replace(/\s+/g, ' ').trim() : '';
      }));
      eq(names, ['First name *', 'Last name *'], 'the client\'s two name boxes are labelled, not hinted');
      has(await txt('#i-house-find label'), 'One line per item: what it is, and where they think it might be.', 'the must-find rule is on its label');
      await p.locator('#i-hf-firearms').check(); await p.waitForTimeout(200);
      const flag = await p.evaluate(() => {
        const w = document.getElementById('i-hfw-firearms'); const a = w && w.querySelector('.hf-ask'); const t = document.getElementById('i-hfn-firearms');
        return { ask: a ? a.textContent : '', askShown: !!(a && a.checkVisibility()), ph: t ? t.placeholder : '?', val: t ? t.value : '?', after: !!(a && a.nextElementSibling === t) };
      });
      ok(flag.askShown && /authorized to take possession/.test(flag.ask), 'a ticked row\'s prompt shows over its notes box (' + flag.ask + ')');
      ok(flag.after && flag.ph === '' && flag.val === '', 'and the notes box under it is blank');
      ok(await overflow() <= 0, 'no horizontal overflow on intake at 1440');
    });

    await section('C. an estate service: the blocked boxes blank, the Court\'s hint on its label', async () => {
      await p.selectOption('#i-svc', 'probate'); await p.waitForTimeout(300);
      const blocked = await p.evaluate(() => ['i-phone', 'i-email'].map((i) => { const e = document.getElementById(i); return { dis: e.disabled, ph: e.placeholder, val: e.value }; }));
      eq(blocked, [{ dis: true, ph: '', val: '' }, { dis: true, ph: '', val: '' }], 'the deceased\'s phone and email are blocked and say nothing inside');
      ok(await p.evaluate(() => document.getElementById('i-deceased-note').checkVisibility()), 'the note under the name says why');
      const court = await p.evaluate(() => { const e = document.getElementById('i-probate-court'); const l = e && e.previousElementSibling; return { lbl: l ? l.textContent : '', ph: e ? e.placeholder : '?' }; });
      has(court.lbl, '(filled from the case number)', 'the Court says it fills itself, on its label');
      eq(court.ph, '', 'and its box is blank');
      eq(((await shown('#panel-intake')) || []).filter((x) => x.ph !== ''), [], 'no box on the estate form shows a placeholder');
    });

    await section('D. Edit Client: every box in the modal blank of hints', async () => {
      await p.evaluate(() => {
        jobs.length = 0;
        jobs.push({ id: 9701, hvlId: 'HVL-9701', name: 'Ruth Adler', fname: 'Ruth', lname: 'Adler', svc: 'downsizing_move', addr: '1 Ocean Blvd',
          city: 'Palm Beach', zip: '33480', phone: '(561) 555-0100', email: 'r@example.com', sqft: '3000', ptype: 'Single Family Home',
          destAddr: '', destCity: '', destSqft: '', created: '2026-10-20', tc: 'Ashley Jerome', status: 'new', priority: 'normal' });
        _jobsState = 'ready'; saveJobs(); goToClientDashboard(); renderJobs();
      });
      await p.waitForTimeout(400);
      await p.locator('#jobs-body tr', { hasText: 'Ruth Adler' }).first().click(); await p.waitForTimeout(600);
      await p.locator('button', { hasText: 'Edit Client' }).first().click(); await p.waitForTimeout(400);
      const inModal = await p.evaluate(() => {
        const m = document.getElementById('edit-client-modal');
        return m && m.checkVisibility() ? [...m.querySelectorAll('input, textarea')].map((e) => ({ id: e.id, ph: e.placeholder })) : null;
      });
      ok(inModal && inModal.length > 20, 'the modal is open (' + (inModal || []).length + ' boxes)');
      eq((inModal || []).filter((x) => x.ph !== ''), [], 'none carries a placeholder');
      eq(await p.evaluate(() => ['ec-dest-addr', 'ec-dest-city', 'ec-dest-sqft', 'ec-dest-contact'].map((i) => { const e = document.getElementById(i); return e ? e.value : '?'; })),
        ['', '', '', ''], 'the destination\'s four are blank where nothing is recorded');
      const mf = await p.evaluate(() => { const d = document.getElementById('ec-house-find'); return d ? d.textContent.replace(/\s+/g, ' ') : ''; });
      has(mf, '(one line per item: what it is, and where they think it might be)', 'Edit Client says one line per item on its label');
      // 2026-10-23 (Anthony: fix the wording): a blank home value has not stopped the estimate since 2026-10-10.
      const hv = await p.evaluate(() => { const e = document.getElementById('ec-home-value'); const d = e && e.closest('.df'); return d ? d.textContent.replace(/\s+/g, ' ') : ''; });
      has(hv, '(market / Zillow estimate)', 'the home value\'s label reads as intake\'s');
      ok(hv.indexOf('will not save') < 0, 'and claims no refusal the estimate does not make (' + hv.slice(0, 80) + ')');
      await p.locator('#edit-client-modal button', { hasText: 'Cancel' }).first().click();
      await p.waitForTimeout(300);
    });

    await section('E. at 390: the intake boxes blank, no overflow, no page errors', async () => {
      await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(300);
      await p.evaluate(() => goToClientDashboard()); await p.waitForTimeout(300);
      await p.locator('#btn-add-client').click(); await p.waitForTimeout(500);
      await p.selectOption('#i-svc', 'downsizing_move'); await p.waitForTimeout(300);
      eq(((await shown('#panel-intake')) || []).filter((x) => x.ph !== ''), [], 'no box on the phone form shows a placeholder');
      ok(await p.evaluate(() => document.getElementById('i-dest-contact').checkVisibility()), 'the move-in contact box is on screen');
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
