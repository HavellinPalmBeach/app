const { chromium } = require('playwright');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL ' + m); } };
const eq = (a, b, m) => ok(a === b, m + '  (got ' + JSON.stringify(a) + ', want ' + JSON.stringify(b) + ')');

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto(process.env.APP || 'file:///home/user/app/havellin.html'); await p.waitForTimeout(1500);

  // ── Seed a won estate job through the REAL intake form ──────────────────────
  await p.click('.nb:has-text("Client Intake")'); await p.waitForTimeout(300);
  const jobId = await p.evaluate(() => {
    const set = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; if (e.onchange) e.onchange(); } };
    set('i-svc','cleanout'); toggleIntakeFields();
    set('i-fname','Tripp'); set('i-lname','Butler'); set('i-addr','69 Beach Blvd');
    set('i-city','Palm Beach'); set('i-zip','33480'); set('i-sqft','3500');
    set('i-ptype','Estate'); set('i-start','2026-10-01');
    const srcSel = document.getElementById('i-src');
    const srcOpt = Array.from(srcSel.options).find(o => o.value);
    if (srcOpt) { srcSel.value = srcOpt.value; if (srcSel.onchange) srcSel.onchange(); }
    set('i-executor-fname','Jane'); set('i-executor-lname','Doe');
    set('i-executor-role','Personal Representative'); set('i-executor-phone','(561) 555-0100');
    set('i-executor-email','jane@x.com'); set('i-date-of-death','2026-08-14');
    set('i-matter-type','probate'); set('i-gate-706','no');
    document.getElementById('i-gate-dispute').value = '';
    set('i-doc-tier','values');
    saveIntake();
    if (!jobs.length) {
      const fb = document.getElementById('i-fb');
      return { err: (fb ? fb.textContent : '(no i-fb)') + ' | role=' + document.getElementById('i-executor-role').value
                    + ' matter=' + document.getElementById('i-matter-type').value
                    + ' dod=' + document.getElementById('i-date-of-death').value };
    }
    const j = jobs[0];
    j.won = true; j.status = 'won';
    estimateStore[j.id] = { approved: true, approvedBy: 'Anthony Graziano',
      estimate: { jobId: j.id, svc: 'cleanout', havellinTotal: 20000, totTC: 40, totPS: 80,
                  rooms: [{ idx: 0, name: 'Kitchen', st: 'in', vol: 3, cplx: 3 }], collections: [], vendors: [], prepItems: [] } };
    return j.id;
  });
  if (jobId && jobId.err) { console.log('SAVE REFUSED: ' + jobId.err); await b.close(); process.exit(1); }
  ok(!!jobId, 'a won Estate Settlement seeded through the real intake form');

  // ── The rendered desk card, read off the real Inventory tab ─────────────────
  await p.click('.nb:has-text("Job Admin")'); await p.waitForTimeout(400);
  console.log('  [debug] jobId=' + JSON.stringify(jobId) + ' ids=' + JSON.stringify(await p.evaluate(() => jobs.map(j => j.id))));
  const read = async (patch) => p.evaluate(({ id, patch }) => {
    const j = jobs.find(x => x.id === id);
    ['matterType','docTier'].forEach(k => { if (k in patch) j[k] = patch[k]; });
    if (patch.appraisers !== undefined) { if (patch.appraisers) j.appraisers = patch.appraisers; else delete j.appraisers; }
    if (patch.dropTier) delete j.docTier;
    if (patch.docScope !== undefined) j.docScope = patch.docScope;
    _jobAdminOpen[id] = true;
    const sel = document.getElementById('inv-job');
    if (sel) { sel.value = String(id); if (sel.onchange) sel.onchange(); }
    if (typeof renderInventoryTab === 'function') renderInventoryTab();
    const card = document.querySelector('.ja-card');
    if (!card) return { missing: true };
    const boxes = Array.from(card.querySelectorAll('input[type=checkbox]'))
      .map(e => (e.getAttribute('onchange') || '').match(/'([a-z_]+)'/))
      .filter(Boolean).map(m => m[1]);
    const n = card.querySelector('.ja-n');
    const derived = Array.from(card.querySelectorAll('#plan-derived-admin-' + id + ' .pl-line'))
      .map(e => ({ ok: e.className.indexOf('pl-ok') >= 0,
                   lbl: (e.querySelector('.pl-lbl') || {}).textContent || '',
                   det: (e.querySelector('.pl-det') || {}).textContent || '' }));
    return { count: n ? n.textContent.trim() : '', boxes, derived,
             p4block: !!card.querySelector('#plan-derived-p4-' + id),
             ct: boxes.filter(k => k.indexOf('ct_') === 0).map(k => k.slice(3)),
             txt: (card.innerText || '').replace(/\s+/g, ' '),
             visible: card.getClientRects().length > 0 };
  }, { id: jobId, patch });

  console.log('\n=== AN ESTATE SETTLEMENT ADMINISTERING A PROBATE ESTATE — IT USED TO GET NOTHING ===');
  const estate = await read({ matterType: 'probate', docTier: 'values' });
  eq(estate.missing, undefined, 'the Job Admin card renders on the Inventory tab');
  eq(estate.visible, true, 'and is on screen');
  eq(estate.ct.join(' '), 'inventory nonprobate served filed accounting pr_signoff',
     '⚠ the compliance list is there — on the service that had NONE at any tier');
  ok(/0 of 11 ticked/.test(estate.count), 'counted: ' + JSON.stringify(estate.count));
  ok(/733\.604/.test(estate.txt), 'the §733.604 verification is on the rendered card');
  ok(/florida court/i.test(estate.txt), 'under the compliance heading (innerText applies text-transform, so match case-insensitively)');

  console.log('\n=== THE SAME ESTATE, CONTRACTED AT EACH TIER ===');
  const top = await read({ docTier: 'appraisals' });
  eq(top.ct.join(' '), 'inventory appraisals nonprobate served filed accounting pr_signoff', 'the top tier attaches the reports too');
  ok(/0 of 12 ticked/.test(top.count), 'twelve: ' + JSON.stringify(top.count));

  const contents = await read({ docTier: 'contents' });
  eq(contents.ct.join(' '), 'nonprobate served filed accounting pr_signoff', 'a contents list states no values, so nothing asks us to verify one');
  ok(!/date-of-death FMV on every line/.test(contents.txt), 'the instruction is gone from the rendered card');

  const none = await read({ docTier: 'none' });
  eq(none.ct.join(' '), 'served filed accounting pr_signoff', '⚠ contracted at None, the three deliverable checks are gone');
  ok(/0 of 9 ticked/.test(none.count), 'nine: ' + JSON.stringify(none.count));
  ok(/proof of service/.test(none.txt), 'and the court procedure stays — it happens whoever built the schedule');

  console.log('\n=== A REPORT ON THE RECORD BRINGS THE ATTACH BOX BACK ===');
  const apprNo = await read({ docTier: 'contents', appraisers: null });
  ok(apprNo.ct.indexOf('appraisals') < 0, 'a contents engagement with no appraiser is not told to attach reports');
  const apprYes = await read({ appraisers: [{ id: 1, name: 'Marie Wayland' }] });
  ok(apprYes.ct.indexOf('appraisals') >= 0, '⚠ one on the record and the box is back — it never silently drops off a job holding one');

  console.log('\n=== A TRUST MATTER GETS NO COURT LIST AND CITES NO STATUTE ===');
  const trust = await read({ matterType: 'trust', docTier: 'values', appraisers: null });
  eq(trust.ct.length, 0, 'no §733.604 checklist on a matter with no probate in it');
  ok(!/733\.604/.test(trust.txt), '⚠ and nothing on the rendered card cites the wrong statute');
  ok(!/florida court/i.test(trust.txt), 'no court section at all');
  ok(/0 of 5 ticked/.test(trust.count), 'the financial close and the archive remain: ' + JSON.stringify(trust.count));
  ok(/vendor invoices/.test(trust.txt), 'so the desk is not left with an empty card');

  const both = await read({ matterType: 'both' });
  eq(both.ct.join(' '), 'inventory nonprobate served filed accounting pr_signoff', 'a pour-over will keeps the probate half');

  console.log('\n=== A JOB RECORDED BEFORE EITHER FIELD EXISTED ===');
  const legacy = await p.evaluate((id) => {
    const j = jobs.find(x => x.id === id);
    j.svc = 'probate'; delete j.matterType; delete j.docTier; delete j.appraisers; j.docScope = 'full';
    estimateStore[id].estimate.svc = 'probate';
    _jobAdminOpen[id] = true;
    const sel = document.getElementById('inv-job'); if (sel) { sel.value = String(id); if (sel.onchange) sel.onchange(); }
    renderInventoryTab();
    const card = document.querySelector('.ja-card');
    const boxes = Array.from(card.querySelectorAll('input[type=checkbox]'))
      .map(e => (e.getAttribute('onchange') || '').match(/'([a-z_]+)'/)).filter(Boolean).map(m => m[1]);
    return { ct: boxes.filter(k => k.indexOf('ct_') === 0).map(k => k.slice(3)),
             count: card.querySelector('.ja-n').textContent.trim() };
  }, jobId);
  eq(legacy.ct.join(' '), 'inventory nonprobate served filed accounting pr_signoff',
     'a probate job with neither field keeps the checklist it has today');
  ok(/0 of 11 ticked/.test(legacy.count), 'eleven — the one it loses is the attach box, which the migration refuses to claim: ' + JSON.stringify(legacy.count));

  console.log('\n=== THE CARD SAYS WHY ITS LIST LOOKS THE WAY IT DOES ===');
  const line = (r, lbl) => r.derived.find(d => d.lbl === lbl);
  const answered = await read({ matterType: 'probate', docTier: 'values', appraisers: null });
  eq(answered.p4block, false, 'the desk card renders its own derived block, not the Job Plan close-out one');
  ok(!!line(answered, 'Matter type recorded'), 'the matter type is named on the card');
  eq(line(answered, 'Matter type recorded').ok, true, 'green once recorded');
  ok(/Probate/.test(line(answered, 'Matter type recorded').det), 'naming the answer: ' + JSON.stringify(line(answered, 'Matter type recorded').det));
  eq(line(answered, 'Contracted to produce').ok, true, 'and the tier reads green');
  ok(/Inventory with values/.test(line(answered, 'Contracted to produce').det), 'naming the tier the client was told');

  const unanswered = await p.evaluate((id) => {
    const j = jobs.find(x => x.id === id);
    j.svc = 'cleanout'; estimateStore[id].estimate.svc = 'cleanout';
    delete j.matterType; delete j.docTier; delete j.docScope;
    _jobAdminOpen[id] = true;
    const sel = document.getElementById('inv-job'); if (sel) { sel.value = String(id); if (sel.onchange) sel.onchange(); }
    renderInventoryTab();
    const card = document.querySelector('.ja-card');
    const d = Array.from(card.querySelectorAll('.pl-line')).map(e => ({
      ok: e.className.indexOf('pl-ok') >= 0,
      lbl: (e.querySelector('.pl-lbl') || {}).textContent || '',
      det: (e.querySelector('.pl-det') || {}).textContent || '' }));
    const boxes = Array.from(card.querySelectorAll('input[type=checkbox]'))
      .map(e => (e.getAttribute('onchange') || '').match(/'([a-z_]+)'/)).filter(Boolean).map(m => m[1]);
    return { d, ct: boxes.filter(k => k.indexOf('ct_') === 0).length };
  }, jobId);
  const um = unanswered.d.find(x => x.lbl === 'Matter type recorded');
  eq(um.ok, false, '⚠ an unanswered matter type reads OPEN on an Estate Settlement');
  ok(/withheld until it is/.test(um.det), 'and says what is being withheld because of it: ' + JSON.stringify(um.det));
  eq(unanswered.ct, 0, 'which is exactly the empty court section it explains');
  const ut = unanswered.d.find(x => x.lbl === 'Contracted to produce');
  eq(ut.ok, false, 'and an unanswered tier reads open');
  ok(/before the agreement goes out/.test(ut.det), 'naming when it has to be answered by');

  console.log('\n=== THE JOB PLAN — pr_authority follows the matter, not the sale ===');
  const plan = await p.evaluate((id) => {
    const j = jobs.find(x => x.id === id);
    const run = (svc, matter) => {
      j.svc = svc; estimateStore[id].estimate.svc = svc;
      if (matter) j.matterType = matter; else delete j.matterType;
      const html = renderJobPlan(id, j, estimateStore[id].estimate);
      return html.indexOf("'pr_authority'") >= 0;
    };
    const r = { estateProbate: run('cleanout', 'probate'), estateNone: run('cleanout', null),
                probateTrust: run('probate', 'trust'), probateUnanswered: run('probate', null),
                transition: run('downsizing_move', null) };
    j.svc = 'cleanout'; estimateStore[id].estimate.svc = 'cleanout'; j.matterType = 'probate';
    return r;
  }, jobId);
  eq(plan.estateProbate, true, '⚠ an Estate Settlement administering a probate estate is finally asked to confirm PR authority');
  eq(plan.estateNone, false, 'and one with no matter recorded claims nothing');
  eq(plan.probateTrust, false, 'a probate job recorded as a trust administration has a successor trustee instead');
  eq(plan.probateUnanswered, true, 'an unanswered probate job keeps it, through the service fallback');
  eq(plan.transition, false, 'a Home Transition is never asked');

  console.log('\n=== A LIVING JOB IS BYTE-IDENTICAL ===');
  const living = await p.evaluate((id) => {
    const j = jobs.find(x => x.id === id);
    const out = {};
    ['home_cleanout','downsizing','downsizing_move','prep'].forEach(svc => {
      j.svc = svc; estimateStore[id].estimate.svc = svc;
      j.matterType = 'probate'; j.docTier = 'appraisals';
      _jobAdminOpen[id] = true;
      const sel = document.getElementById('inv-job'); if (sel) { sel.value = String(id); if (sel.onchange) sel.onchange(); }
      renderInventoryTab();
      const card = document.querySelector('.ja-card');
      const boxes = card ? Array.from(card.querySelectorAll('input[type=checkbox]'))
        .map(e => (e.getAttribute('onchange') || '').match(/'([a-z_]+)'/)).filter(Boolean).map(m => m[1]) : [];
      out[svc] = boxes.filter(k => k.indexOf('ct_') === 0).length;
    });
    j.svc = 'cleanout'; estimateStore[id].estimate.svc = 'cleanout'; delete j.docTier;
    return out;
  }, jobId);
  ['home_cleanout','downsizing','downsizing_move','prep'].forEach(s =>
    eq(living[s], 0, s + ' is offered no compliance list even with both fields written onto it'));

  console.log('\n=== OVERFLOW ===');
  for (const w of [1440, 390]) {
    await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(250);
    const o = await p.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
    eq(o, 0, 'overflow ' + w + 'px');
  }
  eq(errs.length, 0, 'page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));

  console.log('\n' + pass + ' checks, ' + fail + ' failed');
  await b.close();
  process.exit(fail ? 1 : 0);
})();
