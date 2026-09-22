// Step 8 of ESTATE_SCOPE_SPEC — gate the estimate on the two contract questions.
//
// ⚠ The unit suite proves the predicate and the three doors. Only this proves that a person
// standing on Build Estimate can see the notice, still gets a number, and is really refused
// when they press Save — which is the whole point of the step.
//
// ⚠ Read the RENDERED container, never `document.body.innerHTML`: this is a single-file app
// whose <script> lives in the body, so that string carries the entire JavaScript source and
// every `lacks()` against it can never pass. CLAUDE.md records that trap costing a round.
const { chromium } = require('playwright');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL ' + m); } };
const eq = (a, b, m) => ok(a === b, m + '  (got ' + JSON.stringify(a) + ', want ' + JSON.stringify(b) + ')');
const APP = process.env.APP || 'file:///home/user/app/havellin.html';

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto(APP); await p.waitForTimeout(1500);

  // ── A probate estate saved with BOTH contract questions blank. Intake accepts that
  //    deliberately (step 3's decision) — the attorney may genuinely not have decided yet.
  await p.click('.nb:has-text("Client Intake")'); await p.waitForTimeout(300);
  const jobId = await p.evaluate(() => {
    const set = (id,v) => { const e=document.getElementById(id); if(e){e.value=v; if(e.onchange) e.onchange();} };
    set('i-svc','probate'); toggleIntakeFields();
    set('i-fname','Tripp'); set('i-lname','Butler'); set('i-addr','69 Beach Blvd');
    set('i-city','Palm Beach'); set('i-zip','33480'); set('i-sqft','3500');
    set('i-ptype','Estate'); set('i-start','2026-10-01'); set('i-home-value','4200000');
    const ss=document.getElementById('i-src'); const so=Array.from(ss.options).find(o=>o.value);
    if(so){ss.value=so.value; if(ss.onchange)ss.onchange();}
    set('i-executor-fname','Jane'); set('i-executor-lname','Doe');
    set('i-executor-role','Personal Representative'); set('i-executor-phone','(561) 555-0100');
    set('i-executor-email','jane@x.com'); set('i-date-of-death','2026-08-14');
    set('i-matter-type','probate');           // required at intake since step 2
    set('i-gate-706','no');
    document.getElementById('i-gate-dispute').value='';
    set('i-doc-tier','');                     // ⚠ THE BLANK. Intake accepts it.
    set('i-probate-case','502026CP001234');
    set('i-probate-atty-fname','Richard'); set('i-probate-atty-lname','Comiter');
    set('i-probate-atty-firm','Comiter Singer'); set('i-probate-atty-phone','(561) 626-2101');
    set('i-probate-atty-email','rc@x.com');
    saveIntake();
    if(!jobs.length) return {err:(document.getElementById('i-fb')||{}).textContent};
    return jobs[0].id;
  });
  if (jobId && jobId.err) { console.log('REFUSED: '+jobId.err); process.exit(1); }
  ok(!!jobId, 'a probate estate saved with the tier left blank');

  // ── Build Estimate: score three rooms through the REAL grid.
  await p.click('.nb:has-text("Build Estimate")'); await p.waitForTimeout(400);
  const scored = await p.evaluate((id) => {
    const sel = document.getElementById('e-job');
    sel.value = String(id); if (sel.onchange) sel.onchange();
    // The real scope toggle, by the class the renderer emits. One tap: blank -> in scope.
    const tog = Array.from(document.querySelectorAll('button.scope-toggle')).slice(0, 3);
    tog.forEach(t => t.click());
    calcAll();
    const tot = document.getElementById('s-havellin');
    return { rooms: (currentEstimate && currentEstimate.rooms || []).length,
             total: tot ? tot.textContent.trim() : '' };
  }, jobId);
  eq(scored.rooms, 3, 'three rooms ticked into scope through the real grid');

  const gate = await p.evaluate(() => {
    const el = document.getElementById('e-contract-gate');
    const sum = document.getElementById('s-havellin');
    return {
      present: !!el,
      txt: el ? el.innerText.trim() : '',
      bg: el && el.firstElementChild ? getComputedStyle(el.firstElementChild).backgroundColor : '',
      priced: sum ? sum.textContent.trim() : ''
    };
  });

  // ⚠⚠ THE LOAD-BEARING PAIR: it refuses to COMMIT, never to compute. `calcAll` runs on
  //    every room tick, so gating it would blank the screen under somebody mid-walkthrough —
  //    and the tier is answered BETTER with a number in front of you.
  ok(gate.present, 'the notice slot renders on the estimate');
  ok(/Not a quote yet/.test(gate.txt), 'and it says outright that this is not a quote yet');
  ok(/top of the scale/.test(gate.txt),
     'and names the consequence — a blank tier prices at the TOP, not at nothing');
  ok(/what the agreement would then promise in writing/.test(gate.txt),
     'and that the agreement would promise it in writing');
  ok(/\$[\d,]+/.test(gate.priced) && !/\$0\b/.test(gate.priced),
     'the job is STILL PRICED — the gate never blanks the walkthrough  (' + gate.priced + ')');

  // ── Save is refused, by name, and writes nothing.
  const saved = await p.evaluate(() => {
    const before = JSON.stringify(estimateStore);
    saveEstimateAndPreview();
    const fb = document.getElementById('e-fb');
    return { msg: fb ? fb.innerText.trim() : '', changed: JSON.stringify(estimateStore) !== before };
  });
  ok(/Not ready to quote/.test(saved.msg), 'Save refuses');
  ok(/What we are contracted to produce/.test(saved.msg), 'and names the unanswered question');
  ok(/Edit Client/.test(saved.msg), 'and says where to answer it');
  ok(/walkthrough on this screen is kept/.test(saved.msg),
     'and that the walkthrough is not lost  (the refusal has to be safe to act on)');
  eq(saved.changed, false, 'and nothing was written');

  // ── Submit is refused by the same definition, from its own door.
  const sub = await p.evaluate(() => {
    const r = submitForApproval();
    return { code: r && r.code, submitted: estimateSubmitted };
  });
  eq(sub.code, 'contract', 'Submit refuses through the same shared definition');
  eq(sub.submitted, false, 'and nothing is submitted');

  // ── Answer it on the job and every door opens. Same estimate, same rooms.
  const after = await p.evaluate((id) => {
    const j = jobs.find(x => x.id === id);
    j.docTier = 'values';
    calcAll();
    const el = document.getElementById('e-contract-gate');
    const before = JSON.stringify(estimateStore);
    saveEstimateAndPreview();
    const fb = document.getElementById('e-fb');
    return {
      notice: el ? el.innerText.trim() : '',
      msg: fb ? fb.innerText.trim() : '',
      wrote: JSON.stringify(estimateStore) !== before,
      rooms: (currentEstimate && currentEstimate.rooms || []).length
    };
  }, jobId);
  eq(after.notice, '', 'answering the tier clears the notice');
  ok(!/Not ready to quote/.test(after.msg), 'and Save no longer refuses');
  eq(after.wrote, true, 'and the estimate is written');
  eq(after.rooms, 3, 'with the three scored rooms intact — nothing was lost to the refusal');

  // ── The converse, or the gate would just be refusing everything. A LIVING job has no
  //    matter type by construction (`matterTypeOf` gates on `invFiduciaryMode`) and Home
  //    Editing prices no documentation step, so neither question is asked of it.
  const living = await p.evaluate((id) => {
    const j = jobs.find(x => x.id === id);
    j.svc = 'downsizing'; delete j.docTier; delete j.docScope; delete j.matterType;
    calcAll();
    const el = document.getElementById('e-contract-gate');
    return { notice: el ? el.innerText.trim() : '', blk: !!estimateContractBlocker(j) };
  }, jobId);
  eq(living.notice, '', 'a Home Editing job is asked neither question');
  eq(living.blk, false, 'and is never gated');

  // ── A legacy estate job — recorded before the tier field existed — is NOT blank.
  const legacy = await p.evaluate((id) => {
    const j = jobs.find(x => x.id === id);
    j.svc = 'probate'; j.matterType = 'probate';
    delete j.docTier; j.docScope = 'full';       // what every pre-step-3 job carries
    calcAll();
    const el = document.getElementById('e-contract-gate');
    return { tier: docTierOf(j), notice: el ? el.innerText.trim() : '' };
  }, jobId);
  eq(legacy.tier, 'values', 'a legacy job migrates through docScope and reads `values`');
  eq(legacy.notice, '', 'so it is not gated — no job priced before today is blocked');

  // ── Layout.
  for (const w of [1440, 390]) {
    await p.setViewportSize({ width: w, height: 900 });
    await p.waitForTimeout(250);
    const ov = await p.evaluate(() => Math.max(0, document.documentElement.scrollWidth - window.innerWidth));
    eq(ov, 0, 'overflow ' + w);
  }
  eq(errs.length, 0, 'page errors');

  await b.close();
  console.log('  step8: ' + pass + ' passed, ' + fail + ' failed, ' + errs.length + ' page errors');
  process.exit(fail ? 1 : 0);
})();
