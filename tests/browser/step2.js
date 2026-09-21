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

  console.log('\n=== INTAKE ===');
  const shown = await p.evaluate(() => {
    const r = {};
    for (const svc of ['cleanout', 'probate', 'contested_probate', 'downsizing', 'prep']) {
      document.getElementById('i-svc').value = svc; toggleIntakeFields();
      const e = document.getElementById('i-matter-type');
      r[svc] = e.getClientRects().length > 0;
    }
    document.getElementById('i-svc').value = 'cleanout'; toggleIntakeFields();
    const sel = document.getElementById('i-matter-type');
    return { r, value: sel.value,
             opts: Array.from(sel.options).map(o => o.value),
             label: sel.previousElementSibling ? sel.previousElementSibling.textContent : '' };
  });
  ['cleanout','probate','contested_probate'].forEach(s => eq(shown.r[s], true, s + ' is asked the matter type'));
  ['downsizing','prep'].forEach(s => eq(shown.r[s], false, s + ' is not — living-client work has no matter type'));
  eq(shown.value, '', 'it opens BLANK — guessing probate is the defect this field exists to stop');
  eq(shown.opts.join(','), ',probate,trust,both,neither', 'the four answers plus a forced choice');
  ok(/How is this estate being administered/.test(shown.label), 'labelled in words a person would say on a call');

  // The three gate-cells in the estate block sit on their own baselines.
  const align = await p.evaluate(() => {
    const t = id => Math.round(document.getElementById(id).getBoundingClientRect().top);
    return { dod: t('i-date-of-death'), matter: t('i-matter-type'), scope: t('i-doc-tier') };
  });
  ok(Math.abs(align.dod - align.matter) <= 2, 'date of death and matter type share a baseline (' + align.dod + ' / ' + align.matter + ')');
  ok(align.scope > align.matter, 'and the scope question is on the row below');

  console.log('\n=== SAVE ===');
  const saved = await p.evaluate(() => {
    const set = (id, v) => {
      const e = document.getElementById(id); if (!e) return;
      if (e.tagName === 'SELECT') {
        const o = Array.from(e.options).find(x => x.value === v) || Array.from(e.options).find(x => x.value);
        if (o) e.value = o.value; if (e.onchange) e.onchange(); return;
      }
      e.value = v;
    };
    set('i-fname','Tripp'); set('i-lname','Butler'); set('i-addr','69 Beach Blvd');
    set('i-city','Palm Beach'); set('i-zip','33480'); set('i-sqft','3500');
    set('i-ptype','Estate'); set('i-src','Attorney'); set('i-start','2026-10-01');
    set('i-executor-fname','Jane'); set('i-executor-lname','Doe');
    set('i-executor-role','Trustee'); set('i-executor-phone','(561) 555-0100');
    set('i-executor-email','jane@x.com'); set('i-date-of-death','2026-08-14');
    document.getElementById('i-matter-type').value = '';
    const n0 = jobs.length; saveIntake();
    const refused = { msg: (document.getElementById('i-fb').innerText||'').replace(/\s+/g,' ').trim(), made: jobs.length - n0 };
    document.getElementById('i-matter-type').value = 'trust';
    saveIntake();
    const j = jobs[0];
    return { refused, made: jobs.length - n0, matterType: j && j.matterType, id: j && j.id,
             afterReset: document.getElementById('i-matter-type').value };
  });
  ok(/How this estate is being administered/.test(saved.refused.msg), 'no matter type is refused by name');
  eq(saved.refused.made, 0, 'and nothing is written');
  eq(saved.made, 1, 'with an answer it saves');
  eq(saved.matterType, 'trust', 'and the answer reaches the job');
  eq(saved.afterReset, '', 'the form resets blank, so the last client\'s answer cannot ride onto the next');

  console.log('\n=== EDIT CLIENT ===');
  const ec = await p.evaluate((jobId) => {
    showEditClient(jobId);
    const s = document.getElementById('ec-matter-type');
    const visible = s.getClientRects().length > 0;
    const prefill = s.value;
    s.value = 'both';
    saveClientEdit(jobId);
    const j = jobs.find(x => x.id === jobId);
    return { visible, prefill, saved: j.matterType };
  }, saved.id);
  eq(ec.visible, true, 'Edit Client offers it on an Estate Settlement');
  eq(ec.prefill, 'trust', 'prefilled from the job');
  eq(ec.saved, 'both', 'and a correction is saved');

  console.log('\n=== COURT INVENTORY ===');
  const court = await p.evaluate((jobId) => {
    const job = jobs.find(x => x.id === jobId);
    const mk = (id, name, fmv, track) => ({ stableId: id, label: 'inventory', jobId: jobId,
      objectName: name, category: 'Furniture', fmv: fmv, assetTrack: track, condition: 'Good', ts: Number(id.slice(1)) });
    const out = {};
    const render = (mt, track) => {
      job.matterType = mt;
      _photoRefs[jobId] = [ mk('i1','Chesterfield sofa','4000',track),
                            mk('i2','Dining suite','9000',track),
                            mk('i3','Bedroom set','6000',track) ];
      printCourtInventory(jobId);
      const h = document.getElementById('print-target').innerHTML;
      const iBlock = h.indexOf('is the wrong instrument for it');
      const iTable = h.indexOf('Tangible Personal Property</div>');
      return { final: h.indexOf('#357a50') > 0, signed: h.indexOf('Reviewed and adopted by') > 0,
               block: iBlock > 0, above: iBlock > 0 && iTable > 0 ? iBlock < iTable : null,
               total: (/Total[^:]*: *&nbsp;\$([\d,]+)/.exec(h) || [])[1] };
    };
    out.trustTracked   = render('', 'Trust');
    out.probateNormal  = render('', 'Probate');
    out.trustMatter    = render('trust', 'Probate');
    out.bothMatter     = render('both', 'Probate');
    return out;
  }, saved.id);
  eq(court.trustTracked.final, false, 'an all-carved-out schedule is no longer FINAL');
  eq(court.trustTracked.signed, false, 'and is not offered for adoption');
  eq(court.trustTracked.total, '0', 'its total really is $0 — which is why signing it was the defect');
  eq(court.probateNormal.final, true, 'a real probate schedule still finalises');
  eq(court.probateNormal.signed, true, 'and is still adoptable');
  eq(court.probateNormal.total, '19,000', 'with the property on it');
  eq(court.trustMatter.block, true, 'a trust matter says on its face that this is the wrong instrument');
  eq(court.trustMatter.above, true, 'and says it ABOVE the table');
  eq(court.trustMatter.final, false, 'and is never FINAL, whatever the item tracks say');
  eq(court.trustMatter.signed, false, 'and never signed');
  eq(court.bothMatter.final, true, 'a pour-over will still finalises its probate half');
  eq(court.bothMatter.block, false, 'and is not told it has no probate in it');

  console.log('\n=== OVERFLOW ===');
  await p.evaluate(() => { const m = document.getElementById('edit-client-modal'); if (m) m.style.display = 'none';
                           document.getElementById('print-target').innerHTML = ''; });
  for (const w of [1440, 390]) {
    await p.setViewportSize({ width: w, height: 900 });
    await p.evaluate(() => { document.getElementById('i-svc').value = 'probate'; toggleIntakeFields(); });
    await p.waitForTimeout(250);
    const of = await p.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
    eq(of, 0, 'no horizontal overflow at ' + w + 'px');
  }
  eq(errs.length, 0, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
