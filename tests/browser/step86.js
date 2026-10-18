// Step 86 — the intake form rearranged (2026-10-18; Anthony: the representative and the estate details flow under the
// client, all the contact information together, the columns closer to one length) and the documentation level saying
// what it means on a living service.
//
// Drives the REAL page: + Add New Client, the service picked through the select on all seven services; at 1440 the left
// card holds every contact block and the right card the documentation questions; Save Client sits under both cards and
// its refusal still lands in #i-fb; the Notes label; the level's words, option and hint on a living service, an estate
// and back; the order at 390px; overflow at both widths; zero page errors.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step86.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    const dialogs = []; p.on('dialog', async (d) => { dialogs.push(d.type() + ': ' + d.message()); await d.accept(); });
    await p.goto(APP); await p.waitForTimeout(1500);
    const section = async (name, body) => {
      console.log('\n## ' + name);
      try { await body(); } catch (e) { fail++; console.log('  ✗ ' + name + ' threw: ' + String(e && e.message || e).split('\n')[0]); }
    };
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const pick = async (svc, matter) => {
      await p.selectOption('#i-svc', svc); await p.waitForTimeout(150);
      if (matter) { await p.selectOption('#i-matter-type', matter); await p.waitForTimeout(150); }
    };
    // Which card an element is in (1 or 2), and its page y.
    const where = (ids) => p.evaluate((ids) => {
      const cards = Array.from(document.querySelectorAll('#panel-intake .grid2 > .card'));
      const out = {};
      ids.forEach((id) => {
        const el = document.getElementById(id);
        out[id] = el ? { card: cards.findIndex((c) => c.contains(el)) + 1, y: Math.round(el.getBoundingClientRect().top + window.scrollY), shown: el.checkVisibility() } : null;
      });
      return out;
    }, ids);
    const level = () => p.evaluate(() => {
      const sel = document.getElementById('i-doclevel'), hint = document.getElementById('i-doclevel-hint');
      return { opt0: sel.options[0].textContent, stdHidden: !!sel.options[1].hidden, disabled: sel.disabled, value: sel.value,
               hint: hint.textContent.replace(/\s+/g, ' ').trim(), readout: document.getElementById('i-gate-readout').checkVisibility(),
               block: getComputedStyle(document.getElementById('i-doclevel-block')).display };
    });

    // ── A ─────────────────────────────────────────────────────────────
    await section('A. the real + Add New Client, and the columns at 1440', async () => {
      await p.locator('button:has-text("Add New Client")').first().click(); await p.waitForTimeout(500);
      ok(await p.locator('#panel-intake').isVisible(), 'the intake screen is up');
      eq(await p.evaluate(() => document.querySelectorAll('#panel-intake .grid2 > .card').length), 2, 'two cards');
      has(await p.evaluate(() => document.getElementById('i-notes').previousElementSibling.textContent.replace(/\s+/g, ' ').trim()),
          'anything not covered above', 'the Notes label no longer counts two questions');
      await pick('probate', 'probate');
      const w = await where(['i-phone', 'i-executor-phone', 'i-probate-atty-phone', 'i-date-of-death', 'i-matter-type', 'i-probate-sale',
                             'i-probate-case', 'i-ptype', 'i-sqft', 'i-mustfind', 'i-notes', 'i-doc-tier', 'i-gate-706', 'i-gate-readout', 'i-doclevel']);
      ['i-phone', 'i-executor-phone', 'i-probate-atty-phone', 'i-date-of-death', 'i-matter-type', 'i-probate-sale', 'i-probate-case', 'i-ptype', 'i-sqft']
        .forEach((id) => eq(w[id].card, 1, 'LEFT card carries ' + id));
      ['i-mustfind', 'i-notes', 'i-doc-tier', 'i-gate-706', 'i-gate-readout', 'i-doclevel'].forEach((id) => eq(w[id].card, 2, 'RIGHT card carries ' + id));
      ok(w['i-phone'].y < w['i-executor-phone'].y && w['i-executor-phone'].y < w['i-probate-atty-phone'].y,
         'the three contact blocks read in a row: the deceased, the representative, the attorney');
      ok(w['i-probate-atty-phone'].y < w['i-date-of-death'].y && w['i-probate-case'].y < w['i-ptype'].y,
         'then the estate details and the court record, then the property block');
      ok(w['i-doc-tier'].y < w['i-gate-706'].y && w['i-gate-706'].y < w['i-gate-readout'].y && w['i-gate-readout'].y < w['i-doclevel'].y,
         'the documentation questions read tier, gates, readout, level');
      ['i-probate-sale', 'i-probate-case', 'i-doc-tier', 'i-gate-706', 'i-executor-phone'].forEach((id) => ok(w[id].shown, id + ' is on screen on a probate intake'));
      const save = await p.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('#panel-intake .grid2 > .card')).map((c) => c.getBoundingClientRect().bottom);
        const btn = Array.from(document.querySelectorAll('#panel-intake button')).find((x) => /Save Client/.test(x.textContent));
        const r = btn.getBoundingClientRect();
        return { below: r.top >= Math.max.apply(null, cards), inCard: !!btn.closest('.card'), left: Math.round(r.left) };
      });
      ok(save.below && !save.inCard, 'Save Client sits under both cards, outside either (' + JSON.stringify(save) + ')');
      ok((await overflow()) <= 0, 'no horizontal overflow at 1440 (' + (await overflow()) + ')');
      // The button still refuses an empty form into #i-fb.
      await p.locator('#panel-intake button:has-text("Save Client")').click(); await p.waitForTimeout(400);
      const fb = await p.evaluate(() => (document.getElementById('i-fb').textContent || '').replace(/\s+/g, ' ').trim());
      ok(fb.length > 0 && /required|missing|name/i.test(fb), 'Save Client refuses the empty form in #i-fb (' + fb.slice(0, 80) + ')');
    });

    // ── B ─────────────────────────────────────────────────────────────
    await section('B. the documentation level says what it means on this service', async () => {
      await pick('downsizing_move');
      let l = await level();
      eq(l.opt0, 'Standard — the normal job', 'Home Transition: the first option reads Standard');
      eq(l.stdHidden, true, 'and the explicit Standard option is withheld');
      eq(l.disabled, false, 'the control is live');
      eq(l.readout, false, 'the estate readout is not shown');
      has(l.hint, 'chain-of-custody', 'the hint names what Formal adds');
      has(l.hint, 'photographed', 'and says the house is photographed either way');
      lacks(l.hint, 'Form 706', 'and does not talk about a 706');
      // Formal by hand on a living job survives a switch to an estate and back.
      await p.selectOption('#i-doclevel', 'formal'); await p.waitForTimeout(100);
      await pick('cleanout', 'trust');
      l = await level();
      eq(l.opt0, 'Auto — set by the answers above', 'Estate Settlement: the first option reads Auto');
      eq(l.stdHidden, false, 'the Standard option is back');
      eq(l.disabled, true, 'the gates decide it (the 706 is unanswered)');
      eq(l.readout, true, 'and the readout is on screen, in the right card');
      has(l.hint, 'Form 706', 'the estate hint is back, as HTML');
      ok(await p.evaluate(() => /<em>|<strong>/.test(document.getElementById('i-doclevel-hint').innerHTML)), 'with its emphasis intact');
      await pick('home_cleanout');
      l = await level();
      eq(l.value, 'formal', 'Home Cleanout: the Formal picked by hand comes back');
      eq(l.disabled, false, 'live again');
      await pick('prep');
      eq((await level()).block, 'none', 'Home Prep: no level control');
      const seven = {};
      for (const svc of ['prep', 'downsizing', 'downsizing_move', 'home_cleanout', 'cleanout', 'probate', 'contested_probate']) {
        await pick(svc); seven[svc] = (await level()).opt0;
      }
      eq(seven, { prep: 'Standard — the normal job', downsizing: 'Standard — the normal job', downsizing_move: 'Standard — the normal job',
                  home_cleanout: 'Standard — the normal job', cleanout: 'Auto — set by the answers above', probate: 'Auto — set by the answers above',
                  contested_probate: 'Auto — set by the answers above' }, 'the first option follows the family on all seven');
    });

    // ── C ─────────────────────────────────────────────────────────────
    await section('C. the phone: one column, the people first on an estate, the house first on a living job', async () => {
      await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(500);
      await pick('probate', 'probate');
      ok((await overflow()) <= 0, 'no horizontal overflow at 390 (' + (await overflow()) + ')');
      let w = await where(['i-phone', 'i-executor-phone', 'i-probate-atty-phone', 'i-probate-case', 'i-ptype', 'i-mustfind', 'i-doclevel']);
      ok(w['i-phone'].y < w['i-executor-phone'].y && w['i-executor-phone'].y < w['i-probate-atty-phone'].y && w['i-probate-atty-phone'].y < w['i-probate-case'].y
         && w['i-probate-case'].y < w['i-ptype'].y && w['i-ptype'].y < w['i-mustfind'].y && w['i-mustfind'].y < w['i-doclevel'].y,
         'probate at 390: deceased, representative, attorney, court record, property, the two questions, the level (' + JSON.stringify(w) + ')');
      console.log('  probate at 390: property type y=' + w['i-ptype'].y + ', must-find y=' + w['i-mustfind'].y);
      await pick('downsizing_move');
      w = await where(['i-phone', 'i-ptype', 'i-dest-addr', 'i-mustfind', 'i-doclevel']);
      ok(w['i-phone'].y < w['i-ptype'].y && w['i-ptype'].y < w['i-dest-addr'].y && w['i-dest-addr'].y < w['i-mustfind'].y && w['i-mustfind'].y < w['i-doclevel'].y,
         'Home Transition at 390: client, property, destination, the two questions, the level (' + JSON.stringify(w) + ')');
      console.log('  Home Transition at 390: property type y=' + w['i-ptype'].y);
      await p.setViewportSize({ width: 1440, height: 1000 });
      eq(errs, [], 'zero page errors');
      eq(dialogs.filter((d) => /^alert/.test(d)), [], 'no blocking alert');
    });

    await b.close();
    console.log('\nstep86: ' + pass + ' passed, ' + fail + ' failed');
    process.exit(fail ? 1 : 0);
  } catch (e) {
    console.log('step86 crashed: ' + (e && e.stack || e));
    if (b) await b.close().catch(() => {});
    process.exit(1);
  }
})();
