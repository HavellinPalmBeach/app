const { chromium } = require('playwright');
const path = process.argv[2] || '/home/user/app/havellin.html';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  FAIL ' + m); } };
const eq = (a, b, m) => ok(a === b, m + '  (got ' + JSON.stringify(a) + ', want ' + JSON.stringify(b) + ')');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto('file://' + path);
  await page.waitForTimeout(1500);

  const setSvc = async (v) => {
    await page.evaluate((v) => {
      document.getElementById('i-svc').value = v;
      toggleIntakeFields();
    }, v);
    await page.waitForTimeout(120);
  };
  const vis = (id) => page.evaluate((id) => {
    const el = document.getElementById(id);
    if (!el) return 'MISSING';
    return el.getClientRects().length > 0 ? 'shown' : 'hidden';
  }, id);

  console.log('\n=== CLIENT INTAKE ===');
  await page.click('#btn-add-client');   // Client Intake is a screen off the dashboard now (2026-09-23)
  await page.waitForTimeout(200);

  await setSvc('cleanout');
  eq(await vis('estate-fields'), 'shown',  'Estate Settlement: the decedent block is shown');
  eq(await vis('probate-fields'), 'hidden','Estate Settlement: no court record');
  eq(await vis('estate-auth-fields'), 'shown', 'Estate Settlement: authorized rep shown');
  for (const id of ['i-date-of-death','i-doc-tier','i-gate-706','i-gate-dispute','i-gate-readout',
                    'i-probate-atty-fname','i-probate-atty-firm','i-probate-atty-email']) {
    eq(await vis(id), 'shown', 'Estate Settlement reaches ' + id);
  }
  for (const id of ['i-probate-case','i-letters-date','i-probate-deadline','i-probate-sale']) {
    eq(await vis(id), 'hidden', 'Estate Settlement is not asked ' + id);
  }
  const cleanoutMarks = await page.evaluate(() => ({
    marks: Array.from(document.querySelectorAll('.req-probate')).map(e => getComputedStyle(e).display),
    note: document.getElementById('i-atty-req-note').textContent,
    readout: (document.getElementById('i-gate-readout').innerText || '').replace(/\s+/g, ' ').trim(),
    readoutClass: (document.querySelector('#i-gate-readout .alert') || {}).className || '',
    doclevelDisabled: document.getElementById('i-doclevel').disabled,
  }));
  eq(cleanoutMarks.marks.length, 5, 'five attorney asterisks exist');
  eq(cleanoutMarks.marks.every(d => d === 'none'), true, 'and all five are withheld on an Estate Settlement');
  ok(/never open probate/.test(cleanoutMarks.note), 'the heading says the attorney is optional here');
  ok(/Strict Mode/.test(cleanoutMarks.readout), 'the readout explains Strict Mode ON SCREEN (it used to render into a hidden div)');
  ok(/a-warn/.test(cleanoutMarks.readoutClass), 'and is amber while the 706 question is open');
  eq(cleanoutMarks.doclevelDisabled, true, 'the documentation-level dropdown is disabled, and now says why');

  // The cell alignment the widened .gate-cell rule buys.
  const align = await page.evaluate(() => {
    const a = document.getElementById('i-date-of-death').getBoundingClientRect();
    const b = document.getElementById('i-matter-type').getBoundingClientRect();
    return { dod: Math.round(a.top), scope: Math.round(b.top) };
  });
  ok(Math.abs(align.dod - align.scope) <= 2,
     'the date input and the select beside it (matter type, since 2026-09-21) share a baseline (' + align.dod + ' vs ' + align.scope + ')');

  await setSvc('probate');
  eq(await vis('estate-fields'), 'shown',  'Probate: the decedent block is shown too');
  eq(await vis('probate-fields'), 'shown', 'Probate: and the court record');
  const probateMarks = await page.evaluate(() => ({
    marks: Array.from(document.querySelectorAll('.req-probate')).map(e => getComputedStyle(e).display),
    note: document.getElementById('i-atty-req-note').textContent,
  }));
  eq(probateMarks.marks.every(d => d === 'inline'), true, 'the asterisks come back on probate');
  ok(/all fields required/.test(probateMarks.note), 'and the heading says so');

  await setSvc('downsizing');
  eq(await vis('estate-fields'), 'hidden',  'a downsizing is asked none of it');
  eq(await vis('probate-fields'), 'hidden', 'nor the court record');
  eq(await page.evaluate(() => document.getElementById('i-doclevel').disabled), false,
     'and its documentation level is freely settable');

  console.log('\n=== SAVE REFUSAL ===');
  await setSvc('cleanout');
  const refusal = await page.evaluate(() => {
    // A <select> silently rejects a value with no matching option, so pick a real one.
    const set = (id, v) => {
      const e = document.getElementById(id); if (!e) return;
      if (e.tagName === 'SELECT') {
        const opt = Array.from(e.options).find(o => o.value === v)
                 || Array.from(e.options).find(o => o.value);
        if (opt) e.value = opt.value;
        if (e.onchange) e.onchange();
        return;
      }
      e.value = v;
    };
    set('i-fname','Tripp'); set('i-lname','Butler'); set('i-addr','69 Beach Blvd');
    set('i-city','Palm Beach'); set('i-zip','33480'); set('i-sqft','3500');
    set('i-ptype','Estate'); set('i-src','Attorney'); set('i-start','2026-10-01');
    set('i-executor-fname','Jane'); set('i-executor-lname','Doe');
    set('i-executor-role','Personal Representative');
    set('i-executor-phone','(561) 555-0100'); set('i-executor-email','jane@x.com'); set('i-matter-type','probate');
    set('i-date-of-death','');
    const before = jobs.length;
    saveIntake();
    return { msg: (document.getElementById('i-fb').innerText||'').replace(/\s+/g,' ').trim(), made: jobs.length - before };
  });
  ok(/Date of death/.test(refusal.msg), 'an Estate Settlement with no date of death is refused by name');
  eq(refusal.made, 0, 'and nothing is written');

  const saved = await page.evaluate(() => {
    document.getElementById('i-date-of-death').value = '2026-08-14';
    document.getElementById('i-gate-706').value = 'no';
    document.getElementById('i-doc-tier').value = 'contents';
    const before = jobs.length;
    saveIntake();
    const j = jobs[0];
    return { made: jobs.length - before, deathDate: j && j.deathDate, gate706: j && j.gate706,
             docScope: j && j.docScope, svc: j && j.svc, id: j && j.id,
             msg: (document.getElementById('i-fb').innerText||'').replace(/\s+/g,' ').trim() };
  });
  eq(saved.made, 1, 'with a date of death it saves, and the attorney is not demanded  [' + saved.msg + ']');
  eq(saved.deathDate, '2026-08-14', 'the date of death reaches the job');
  eq(saved.gate706, 'no', 'so does the 706 answer');
  eq(saved.docScope, 'capture', 'and the scope answer somebody was actually shown');

  console.log('\n=== EDIT CLIENT ===');
  const ec = await page.evaluate((jobId) => {
    showEditClient(jobId);
    const v = (id) => { const e = document.getElementById(id); return e ? (e.offsetParent !== null) : null; };
    return {
      dod: v('ec-date-of-death'), g706: v('ec-gate-706'), gdis: v('ec-gate-dispute'),
      atty: v('ec-atty-firm'), readout: v('ec-gate-readout'),
      caseNo: v('ec-probate-case'),
      readoutText: (document.getElementById('ec-gate-readout').innerText||'').replace(/\s+/g,' ').trim(),
      order: document.querySelector('#edit-client-modal').innerHTML.indexOf('ec-estate-auth-fields')
           < document.querySelector('#edit-client-modal').innerHTML.indexOf('ec-probate-fields'),
      marks: Array.from(document.querySelectorAll('.ec-req-probate')).map(e => getComputedStyle(e).display),
    };
  }, saved.id);
  eq(ec.dod, true,  'Edit Client offers the date of death on an Estate Settlement');
  eq(ec.g706, true, 'and the 706 gate — Strict Mode is no longer a one-way door');
  eq(ec.gdis, true, 'and the dispute gate');
  eq(ec.atty, true, 'and the estate attorney the Job Plan asks for by name');
  eq(ec.caseNo, false, 'and withholds the court record on a matter with no case');
  eq(ec.order, true, 'the estate block precedes the probate block, as intake orders them');
  eq(ec.marks.every(d => d === 'none'), true, 'the attorney asterisks are withheld here too');
  ok(ec.readoutText.length > 0, 'the readout is painted on open: ' + ec.readoutText.slice(0, 70));

  const live = await page.evaluate(() => {
    const before = (document.getElementById('ec-gate-readout').innerText||'').trim();
    document.getElementById('ec-gate-706').value = '';
    ecDocGateChange();
    const after = (document.getElementById('ec-gate-readout').innerText||'').replace(/\s+/g,' ').trim();
    return { before, after };
  });
  ok(/Strict Mode/.test(live.after), 'changing the gate repaints the readout live');

  const written = await page.evaluate((jobId) => {
    document.getElementById('ec-gate-706').value = 'yes';
    document.getElementById('ec-gate-dispute').value = 'yes';
    document.getElementById('ec-date-of-death').value = '2026-08-15';
    document.getElementById('ec-atty-fname').value = 'Richard';
    document.getElementById('ec-atty-lname').value = 'Comiter';
    document.getElementById('ec-atty-firm').value = 'Comiter Singer';
    document.getElementById('ec-doc-tier').value = 'none';
    saveClientEdit(jobId);
    const j = jobs.find(x => x.id === jobId);
    return { gate706: j.gate706, gateDispute: j.gateDispute, deathDate: j.deathDate,
             atty: j.probateAttyName, firm: j.probateAttyFirm, scope: j.docScope,
             caseNo: j.probateCase || '' };
  }, saved.id);
  eq(written.gate706, 'yes', 'the corrected 706 answer is saved from Edit Client');
  eq(written.gateDispute, 'yes', 'and the dispute answer');
  eq(written.deathDate, '2026-08-15', 'and the date of death');
  eq(written.atty, 'Richard Comiter', 'and the estate attorney, on a service that never opens probate');
  eq(written.firm, 'Comiter Singer', 'with their firm');
  eq(written.scope, 'none', 'and the inventory answer');
  eq(written.caseNo, '', 'and no court record is invented for a matter that has none');

  const ecProbate = await page.evaluate(() => {
    document.getElementById('edit-client-modal').style.display = 'none';
    const j = jobs[0]; j.svc = 'probate';
    showEditClient(j.id);
    const v = (id) => { const e = document.getElementById(id); return e ? (e.offsetParent !== null) : null; };
    return { caseNo: v('ec-probate-case'), atty: v('ec-atty-firm'),
             marks: Array.from(document.querySelectorAll('.ec-req-probate')).map(e => getComputedStyle(e).display) };
  });
  eq(ecProbate.caseNo, true, 'a probate matter gets the court record back');
  eq(ecProbate.atty, true, 'and still has the attorney');
  eq(ecProbate.marks.every(d => d === 'inline'), true, 'with its asterisks restored');

  const toggled = await page.evaluate(() => {
    document.getElementById('ec-svc').value = 'cleanout';
    ecToggleProbate();
    return { caseNo: document.getElementById('ec-probate-fields').style.display,
             marks: Array.from(document.querySelectorAll('.ec-req-probate')).map(e => getComputedStyle(e).display) };
  });
  eq(toggled.caseNo, 'none', 'switching the service mid-edit hides the court record');
  eq(toggled.marks.every(d => d === 'none'), true, 'and the asterisks follow it');

  console.log('\n=== OVERFLOW ===');
  await page.evaluate(() => { const m = document.getElementById('edit-client-modal'); if (m) m.style.display = 'none'; });
  for (const w of [1440, 390]) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.evaluate(() => { document.getElementById('i-svc').value = 'probate'; toggleIntakeFields(); });
    await page.waitForTimeout(250);
    const of = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
    eq(of, 0, 'no horizontal overflow at ' + w + 'px');
  }

  eq(errs.length, 0, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await browser.close();
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
