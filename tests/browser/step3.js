const { chromium } = require('playwright');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL ' + m); } };
const eq = (a, b, m) => ok(a === b, m + '  (got ' + JSON.stringify(a) + ', want ' + JSON.stringify(b) + ')');

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto(process.env.APP || 'file:///home/user/app/havellin.html'); await p.waitForTimeout(1500);
  await p.click('.nb:has-text("Client Intake")'); await p.waitForTimeout(300);

  console.log('\n=== THE MENU IS FILLED FROM THE CATALOGUE, AT LOAD ===');
  const menu = await p.evaluate(() => {
    document.getElementById('i-svc').value = 'cleanout'; toggleIntakeFields();
    const s = document.getElementById('i-doc-tier');
    return { visible: s.getClientRects().length > 0, value: s.value,
             opts: Array.from(s.options).map(o => o.value),
             labels: Array.from(s.options).map(o => o.textContent),
             catalogue: DOC_TIERS.map(t => t.key),
             label: s.previousElementSibling ? s.previousElementSibling.textContent : '' };
  });
  eq(menu.visible, true, 'the tier is asked on an Estate Settlement');
  eq(menu.opts.join(','), ',contents,values,appraisals,none', 'four tiers plus a blank, in reading order');
  eq(menu.opts.slice(1).join(','), menu.catalogue.join(','), 'and they ARE the catalogue, not a second list');
  eq(menu.value, '', 'it opens BLANK — the tier has no default');
  ok(/What are we contracted to produce/.test(menu.label), 'labelled as a deliverable, not as a pricing setting');
  ok(/Inventory \+ appraisals/.test(menu.labels.join('|')), 'the top tier reads in full');

  const svcs = await p.evaluate(() => {
    const r = {};
    for (const svc of ['cleanout','probate','contested_probate','downsizing','downsizing_move','home_cleanout','prep']) {
      document.getElementById('i-svc').value = svc; toggleIntakeFields();
      r[svc] = document.getElementById('i-doc-tier').getClientRects().length > 0;
    }
    document.getElementById('i-svc').value = 'cleanout'; toggleIntakeFields();
    return r;
  });
  ['cleanout','probate','contested_probate'].forEach(s => eq(svcs[s], true, s + ' is asked what we produce'));
  ['downsizing','downsizing_move','home_cleanout','prep'].forEach(s => eq(svcs[s], false, s + ' is not — it produces no documentation'));

  console.log('\n=== THE TOP TIER TURNS STRICT MODE ON, WITH THE REASON ON SCREEN ===');
  const strict = await p.evaluate(() => {
    const read = (tier) => {
      document.getElementById('i-svc').value = 'cleanout';
      document.getElementById('i-gate-706').value = 'no';
      document.getElementById('i-gate-dispute').value = 'no';
      const s = document.getElementById('i-doc-tier');
      s.value = tier; if (s.onchange) s.onchange();
      const lvl = document.getElementById('i-doclevel');
      const out = document.getElementById('i-gate-readout');
      return { disabled: !!lvl.disabled, txt: (out.innerText||'').replace(/\s+/g,' ').trim(),
               readoutVisible: out.getClientRects().length > 0 };
    };
    const r = { values: read('values'), appraisals: read('appraisals'), back: read('contents') };
    // and with a 706 on top, the FACT wins over the CHOICE
    document.getElementById('i-gate-706').value = 'yes';
    const s = document.getElementById('i-doc-tier'); s.value = 'appraisals'; if (s.onchange) s.onchange();
    r.both = (document.getElementById('i-gate-readout').innerText||'').replace(/\s+/g,' ').trim();
    document.getElementById('i-gate-706').value = 'no'; s.value = ''; if (s.onchange) s.onchange();
    return r;
  });
  eq(strict.values.disabled, false, 'a valued inventory leaves the documentation level settable');
  ok(!/Strict Mode/.test(strict.values.txt), 'and is not in Strict Mode');
  eq(strict.appraisals.disabled, true, 'the top tier disables the level rather than pretending it can be lowered');
  ok(/Strict Mode/.test(strict.appraisals.txt), 'and says Strict Mode');
  ok(/Inventory \+ appraisals/.test(strict.appraisals.txt), 'naming the answer that did it: ' + JSON.stringify(strict.appraisals.txt.slice(0,190)));
  eq(strict.appraisals.readoutVisible, true, 'and the reason is VISIBLE, not rendered into a hidden div');
  eq(strict.back.disabled, false, 'stepping back down releases it again');
  ok(/Form 706/.test(strict.both), 'with a 706 on top the reader is told the FACT, not the choice: ' + JSON.stringify(strict.both.slice(0,140)));

  console.log('\n=== SAVE: THE TIER IS THE TRUTH, THE SCOPE IS THE MIRROR ===');
  const saved = await p.evaluate(() => {
    const set = (id, v) => {
      const e = document.getElementById(id); if (!e) return;
      if (e.tagName === 'SELECT') {
        const o = Array.from(e.options).find(x => x.value === v) || Array.from(e.options).find(x => x.value);
        if (o) e.value = o.value; if (e.onchange) e.onchange(); return;
      }
      e.value = v;
    };
    set('i-svc','cleanout'); toggleIntakeFields();
    set('i-fname','Tripp'); set('i-lname','Butler'); set('i-addr','69 Beach Blvd');
    set('i-city','Palm Beach'); set('i-zip','33480'); set('i-sqft','3500');
    set('i-ptype','Estate'); set('i-src','Attorney'); set('i-start','2026-10-01');
    set('i-executor-fname','Jane'); set('i-executor-lname','Doe');
    set('i-executor-role','Trustee'); set('i-executor-phone','(561) 555-0100');
    set('i-executor-email','jane@x.com'); set('i-date-of-death','2026-08-14');
    set('i-matter-type','trust'); set('i-gate-706','no');
    // ⚠ i-gate-dispute's BLANK is "no" — there is no 'no' option, so the fuzzy setter's
    // "first option with a value" fallback picks 'yes' and manufactures a dispute.
    document.getElementById('i-gate-dispute').value = '';
    set('i-doc-tier','contents');
    const n0 = jobs.length; saveIntake();
    const j = jobs[0];
    return { made: jobs.length - n0, docTier: j && j.docTier, docScope: j && j.docScope,
             id: j && j.id, afterReset: document.getElementById('i-doc-tier').value };
  });
  eq(saved.made, 1, 'a blank tier does NOT refuse the save — the attorney may genuinely not have decided');
  eq(saved.docTier, 'contents', 'the tier reaches the job');
  eq(saved.docScope, 'capture', 'and the pricing scope is mirrored off it, never set independently');
  eq(saved.afterReset, '', "the form resets blank, so the last client's tier cannot ride onto the next");

  console.log('\n=== A JOB RECORDED BEFORE THE TIER EXISTED ===');
  const legacy = await p.evaluate((jobId) => {
    const job = jobs.find(x => x.id === jobId);
    const read = (scope) => {
      delete job.docTier; job.docScope = scope;
      showEditClient(jobId);
      const s = document.getElementById('ec-doc-tier');
      const v = s.value;
      document.getElementById('edit-client-modal').style.display = 'none';
      return v;
    };
    return { full: read('full'), capture: read('capture'), none: read('none') };
  }, saved.id);
  eq(legacy.full, 'values', 'a legacy Full job reads as Inventory with values');
  eq(legacy.capture, 'contents', 'a legacy Capture only job as Contents list');
  eq(legacy.none, 'none', 'and None as None');
  ok(legacy.full !== 'appraisals', 'and NEVER as the top tier — that would put every estate on the books into Strict Mode');

  console.log('\n=== EDIT CLIENT CORRECTS IT, AND REPAINTS ===');
  const ec = await p.evaluate((jobId) => {
    const job = jobs.find(x => x.id === jobId);
    delete job.docTier; job.docScope = 'capture';
    showEditClient(jobId);
    document.getElementById('ec-gate-706').value = 'no';
    document.getElementById('ec-gate-dispute').value = '';
    const s = document.getElementById('ec-doc-tier');
    const out = document.getElementById('ec-gate-readout');
    // ⚠ THERE IS NO ec-doclevel, BY DESIGN — Edit Client has no documentation-level control,
    // so this readout is the ONLY thing that can explain the floor. That is what makes the
    // repaint load-bearing rather than cosmetic.
    const noLevelControl = !document.getElementById('ec-doclevel');
    s.onchange();   // paint it against the gates just set
    const before = { prefill: s.value, visible: s.getClientRects().length > 0, noLevelControl,
                     txt: (out.innerText||'').replace(/\s+/g,' ').trim() };
    s.value = 'appraisals'; s.onchange();
    const after = { txt: (out.innerText||'').replace(/\s+/g,' ').trim(),
                    visible: out.getClientRects().length > 0 };
    saveClientEdit(jobId);
    const j = jobs.find(x => x.id === jobId);
    return { before, after, docTier: j.docTier, docScope: j.docScope };
  }, saved.id);
  eq(ec.before.visible, true, 'Edit Client offers the tier on an Estate Settlement');
  eq(ec.before.prefill, 'contents', 'prefilled through the migration');
  eq(ec.before.noLevelControl, true, 'Edit Client has no documentation-level dropdown, so the readout is the only explanation there is');
  ok(!/Strict Mode/.test(ec.before.txt), 'a Contents list engagement with both gates clear is not in Strict Mode: ' + JSON.stringify(ec.before.txt.slice(0,110)));
  ok(/Strict Mode/.test(ec.after.txt), 'correcting the tier to appraisals puts it into Strict Mode on the spot');
  ok(/Inventory \+ appraisals/.test(ec.after.txt), 'and the readout repaints with the reason: ' + JSON.stringify(ec.after.txt.slice(0,150)));
  eq(ec.after.visible, true, 'visibly');
  eq(ec.docTier, 'appraisals', 'and the correction is saved');
  eq(ec.docScope, 'full', 'with the scope mirrored off it');

  console.log('\n=== BUILD ESTIMATE SEEDS OFF THE TIER, AND NAMES IT WHEN THEY DISAGREE ===');
  await p.evaluate(() => { const m = document.getElementById('edit-client-modal'); if (m) m.style.display = 'none'; });
  const est = await p.evaluate((jobId) => {
    const job = jobs.find(x => x.id === jobId);
    const seed = (tier, scope) => {
      job.docTier = tier; job.docScope = scope;
      return seedDocScopeFromJob(job);
    };
    const r = { contents: seed('contents','capture'), values: seed('values','full'),
                none: seed('none','none'), legacy: (delete job.docTier, job.docScope='capture', seedDocScopeFromJob(job)) };
    job.docTier = 'contents'; job.docScope = 'capture';
    r.agree = _docScopeIntakeNote(job, 'capture');
    r.disagree = _docScopeIntakeNote(job, 'full');
    job.docTier = ''; job.docScope = '';
    r.unanswered = _docScopeIntakeNote(job, 'full');
    return r;
  }, saved.id);
  eq(est.contents, 'capture', 'a Contents list engagement opens the estimate at Capture only');
  eq(est.values, 'full', 'Inventory with values at Full');
  eq(est.none, 'none', 'None at None');
  eq(est.legacy, 'capture', 'and a legacy job opens exactly where it always did');
  eq(est.agree, '', 'agreeing says nothing');
  ok(/Intake recorded Contents list/.test(est.disagree), 'disagreeing names the TIER, which is the word the attorney was told: ' + JSON.stringify(est.disagree));
  ok(!/Capture only;/.test(est.disagree), 'and not our pricing word for it');
  eq(est.unanswered, '', 'an unanswered tier claims nothing about what intake recorded');

  console.log('\n=== PRICING IS UNMOVED ===');
  const price = await p.evaluate(() => {
    const rooms = [{name:'Kitchen',vol:3,cplx:3},{name:'Primary Bedroom',vol:3,cplx:3}];
    const run = s => computeEngineV3(3500, rooms, 'cleanout', 2, 10, s);
    const byTier = t => run(docTierScope(t));
    return { contents: JSON.stringify(byTier('contents').byStep) === JSON.stringify(run('capture').byStep),
             values:   JSON.stringify(byTier('values').byStep)   === JSON.stringify(run('full').byStep),
             none:     JSON.stringify(byTier('none').byStep)     === JSON.stringify(run('none').byStep),
             topTwoSame: JSON.stringify(byTier('values').byStep) === JSON.stringify(byTier('appraisals').byStep),
             psFull: run('full').totPS, psCap: run('capture').totPS, psNone: run('none').totPS };
  });
  eq(price.contents, true, 'Contents list prices exactly as Capture only always did');
  eq(price.values, true, 'Inventory with values exactly as Full');
  eq(price.none, true, 'None exactly as None');
  eq(price.topTwoSame, true, 'and the top two are the same number — they differ in standard, not in hours');
  console.log('    measured PS hours: full ' + price.psFull + ' · capture ' + price.psCap + ' · none ' + price.psNone);
  ok(price.psFull > price.psCap && price.psCap > price.psNone, 'the three really are three different prices');

  console.log('\n=== OVERFLOW ===');
  for (const w of [1440, 390]) {
    await p.setViewportSize({ width: w, height: 900 });
    await p.evaluate(() => { document.getElementById('i-svc').value = 'probate'; toggleIntakeFields(); });
    await p.waitForTimeout(250);
    const of = await p.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
    eq(of, 0, 'no horizontal overflow at ' + w + 'px');
  }
  // the tier cell and the date-of-death cell each keep their control on its own baseline
  await p.setViewportSize({ width: 1440, height: 1000 });
  await p.evaluate(() => { document.getElementById('i-svc').value = 'cleanout'; toggleIntakeFields(); });
  const align = await p.evaluate(() => {
    const g = id => document.getElementById(id).getBoundingClientRect();
    return { dod: Math.round(g('i-date-of-death').top), matter: Math.round(g('i-matter-type').top),
             tier: Math.round(g('i-doc-tier').top) };
  });
  ok(Math.abs(align.dod - align.matter) <= 2, 'date of death and matter type share a baseline (' + align.dod + ' / ' + align.matter + ')');
  ok(align.tier > align.matter, 'and the tier is on the row below (' + align.tier + ')');

  eq(errs.length, 0, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
