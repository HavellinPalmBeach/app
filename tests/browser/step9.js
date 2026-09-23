// Step 9 of ESTATE_SCOPE_SPEC, second half — §20.2031-6(a), the grouping cap, built where
// the per-article data still exists.
//
// ⚠ The unit suite proves the predicate, the gate and the three surfaces in isolation. Only
// this proves that somebody at the desk, on the real Inventory tab, can SEE the arithmetic
// at the moment the lot is created — which is the entire reason this rule is implementable
// at all. A lot row carries one name, one value and one quantity; nothing downstream can
// split it, so a readout nobody reaches is the same as no rule.
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

  // ── A probate estate with the 706 question UNANSWERED, which is the default on every new
  //    estate and therefore the case that matters. Three collections on the estimate: one
  //    that groups badly, one that groups fine, one with no value at all.
  await p.click('#btn-add-client');   // the real + Add New Client button — Intake left the nav 2026-09-23 await p.waitForTimeout(300);
  const jobId = await p.evaluate(() => {
    const set = (id,v) => { const e=document.getElementById(id); if(e){e.value=v; if(e.onchange) e.onchange();} };
    set('i-svc','cleanout'); toggleIntakeFields();
    set('i-fname','Tripp'); set('i-lname','Butler'); set('i-addr','69 Beach Blvd');
    set('i-city','Palm Beach'); set('i-zip','33480'); set('i-sqft','3500');
    set('i-ptype','Estate'); set('i-start','2026-10-01');
    const ss=document.getElementById('i-src'); const so=Array.from(ss.options).find(o=>o.value);
    if(so){ss.value=so.value; if(ss.onchange)ss.onchange();}
    set('i-executor-fname','Jane'); set('i-executor-lname','Doe');
    set('i-executor-role','Personal Representative'); set('i-executor-phone','(561) 555-0100');
    set('i-executor-email','jane@x.com'); set('i-date-of-death','2026-08-14');
    set('i-matter-type','probate');
    document.getElementById('i-gate-706').value = '';       // ⚠ THE DEFAULT — unknown counts as yes
    document.getElementById('i-gate-dispute').value = '';
    set('i-doc-tier','values');
    saveIntake();
    if(!jobs.length) return {err:(document.getElementById('i-fb')||{}).textContent};
    const j=jobs[0]; j.won=true; j.status='won';
    estimateStore[j.id]={approved:true,approvedBy:'A',estimate:{jobId:j.id,svc:'cleanout',
      havellinTotal:20000,totTC:40,totPS:80,vendors:[],prepItems:[],
      collections:[{id:9001,name:'Sterling flatware service',value:'5000',qty:6,disp:'sell'},
                   {id:9002,name:'Kitchen sundries',value:'800',qty:40,disp:'donate'},
                   {id:9003,name:'Boxed china',value:'Unknown',qty:25,disp:'appraise'}],
      rooms:[{idx:1,name:'Entry & Living',st:'in'},{idx:4,name:'Kitchen',st:'in'}]}};
    _photoRefs[j.id]=[];
    savePhotoRefs(j.id);
    return j.id;
  });
  if (jobId && jobId.err) { console.log('REFUSED: '+jobId.err); process.exit(1); }
  ok(!!jobId, 'a probate estate seeded with the 706 question unanswered — the default');

  // ⚠ `saveIntake` lands you on the Client Dashboard on an **800ms timer**, so a script that
  // navigates straight afterwards is yanked back off the tab it just opened and every element
  // reads `offsetParent === null`. That is the app working as designed and it cost a round
  // here — CLAUDE.md records the same class of wrong probe three times. Let it land first.
  await p.waitForTimeout(1300);

  // ── THE CAPTURE-TIME READOUT, on the real Inventory tab, in the real import panel ───────
  // ⚠ CLICK THE REAL NAV BUTTON, and assert the panel actually became active. CLAUDE.md
  // records this trap twice: a navigation that silently does not take leaves every element
  // reading `offsetParent === null`, and the readout looks hidden when it is simply on a
  // panel nobody switched to. Measure the navigation, do not assume it.
  await p.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('.nb')).find(b => /Job Admin/.test(b.textContent));
    if (btn) btn.click();
  });
  await p.waitForTimeout(500);
  ok(await p.evaluate(() => {
    const el = document.getElementById('panel-inventory');
    return !!el && getComputedStyle(el).display !== 'none';
  }), 'the Job Admin & Inv tab really opened');
  await p.evaluate((id) => {
    const s=document.getElementById('inv-job'); if(s){ s.value=String(id); if(s.onchange) s.onchange(); }
  }, jobId);
  await p.waitForTimeout(600);

  const panel = await p.evaluate(() => {
    const el = document.getElementById('panel-inventory');
    const hint = (c) => { const h=document.getElementById('imp-hint-'+c); return h ? h.textContent.trim() : null; };
    return { c1: hint(9001), c2: hint(9002), c3: hint(9003),
             visible: !!document.getElementById('imp-hint-9001'),
             offsetOK: (() => { const h=document.getElementById('imp-hint-9001'); return !!(h && h.offsetParent !== null); })() };
  });
  ok(panel.visible, 'the import panel carries a readout row for every collection');
  ok(panel.offsetOK, 'and it is actually on screen, not in a hidden container');
  ok(/above the \$100/.test(panel.c1 || ''), 'the $5,000 six-piece lot warns: above the $100 cap');
  ok(/averages \$833 an article/.test(panel.c1 || ''), 'with the arithmetic in front of the person choosing');
  ok(/Itemize it/.test(panel.c1 || ''), 'and names the fix, which is the selector immediately beside it');
  ok(/inside the \$100/.test(panel.c2 || ''), 'the 40-piece $800 lot is confirmed INSIDE the cap, not left silent');
  ok(/cannot be tested/.test(panel.c3 || ''), 'the unpriced collection says the cap cannot be tested');

  // ⚠ Switching the mode to Itemize IS the fix, so the panel stops talking about it.
  const afterItemize = await p.evaluate(() => {
    const s = document.getElementById('imp-mode-9001'); s.value = 'itemize';
    if (s.onchange) s.onchange(); else _impLotHint(jobs[0].id, 9001);
    return (document.getElementById('imp-hint-9001')||{}).textContent.trim();
  });
  eq(afterItemize, '', 'choosing Itemize clears the warning — itemising is the fix');

  const afterQty = await p.evaluate(() => {
    const s = document.getElementById('imp-mode-9001'); s.value = 'lot';
    if (s.onchange) s.onchange();
    const q = document.getElementById('imp-qty-9001'); q.value = '80';
    if (q.oninput) q.oninput();
    return (document.getElementById('imp-hint-9001')||{}).textContent.trim();
  });
  ok(/inside the \$100/.test(afterQty), 'raising the count to 80 brings the same $5,000 inside the cap, live');

  // ── THE DESK CHIP, on a real manifest with a real lot ───────────────────────────────────
  const chips = await p.evaluate((id) => {
    const it=(sid,o)=>Object.assign({stableId:id+'_'+sid,label:'inventory',roomIdx:1,ts:1,
      status:'uploaded',category:'Silver & Precious Metal',condition:'Good',
      driveFileId:'f'+sid,driveFileUrl:'https://drive.google.com/file/d/f'+sid+'/view'},o||{});
    _photoRefs[id]=[it('a',{objectName:'Sterling flatware service',qty:'6',fmv:'5000'}),
                    it('b',{objectName:'Kitchen sundries',qty:'40',fmv:'800'}),
                    it('c',{objectName:'Boxed china',qty:'25',fmv:''})];
    savePhotoRefs(id); renderInventoryTab();
    const el = document.getElementById('panel-inventory');
    const j = jobs.find(x=>x.id===id);
    return { keys: invWorkFlags(j).map(f=>f.key),
             text: (el ? el.textContent : ''),
             lots: invLotsToSplit(_jobInvRefs(id), j).map(r=>r.objectName),
             untested: invLotsUntestable(_jobInvRefs(id), j).map(r=>r.objectName) };
  }, jobId);
  ok(chips.keys.indexOf('lotsplit') >= 0, 'the desk shows a "Lots to split" chip on a 706 estate');
  ok(/Lots to split/.test(chips.text), 'and it is rendered on the tab, not merely in the catalogue');
  eq(chips.lots.join('|'), 'Sterling flatware service', 'exactly the lot that is over the cap');
  eq(chips.untested.join('|'), 'Boxed china', 'and the unpriced lot is held separately as untestable');

  // ── THE WORKLIST DOCUMENT — (a) beside (b), on one page ─────────────────────────────────
  const print = (fn, patch) => p.evaluate(({id,fn,patch}) => {
    const j = jobs.find(x=>x.id===id);
    if (patch) Object.keys(patch).forEach(k => { j[k] = patch[k]; });
    let cap=null; const rp=window.print;
    window.print=()=>{cap=document.getElementById('print-target').innerHTML;};
    const alerts=[]; const ra=window.alert; window.alert=m=>alerts.push(String(m));
    window[fn](id);
    return new Promise(res=>setTimeout(()=>{window.print=rp;window.alert=ra;
      res({html:cap||'',alerts:alerts});},900));
  }, {id:jobId, fn, patch});

  const wl = await print('printAppraisalWorklist');
  ok(/20\.2031-6\(a\)/.test(wl.html), 'the worklist cites §20.2031-6(a)');
  ok(/20\.2031-6\(b\)/.test(wl.html), 'beside §20.2031-6(b) — one regulation, one page');
  ok(/Sterling flatware service/.test(wl.html), 'names the lot that is over the cap');
  ok(/Boxed china/.test(wl.html), 'and the one that cannot be tested');
  ok(!/Kitchen sundries/.test(wl.html.split('20.2031-6(a)')[1] || ''),
     'and leaves the lot inside the cap off the action list');
  ok(/Split/.test(wl.html), 'the document names the fix');
  ok(/not a lot inside the cap/.test(wl.html) || /cannot be tested/.test(wl.html),
     'an untested lot is never reported as clear');

  // ── THE GATE: an estate that files NO 706 has no floor in Florida law, so nothing fires ──
  const noFiling = await p.evaluate((id) => {
    const j = jobs.find(x=>x.id===id); j.gate706 = 'no';
    renderInventoryTab();
    const el = document.getElementById('panel-inventory');
    return { keys: invWorkFlags(j).map(f=>f.key),
             text: (el ? el.textContent : ''),
             lots: invLotsToSplit(_jobInvRefs(id), j).length,
             hint: (document.getElementById('imp-hint-9001')||{}).textContent || '' };
  }, jobId);
  ok(noFiling.keys.indexOf('lotsplit') < 0, 'an estate filing no 706 gets NO chip at all');
  ok(!/Lots to split/.test(noFiling.text), 'and nothing on the tab');
  eq(noFiling.lots, 0, 'and no lot is flagged');
  eq(noFiling.hint.trim(), '', 'and the capture readout goes quiet — Florida sets no floor');

  const wl2 = await print('printAppraisalWorklist');
  ok(!/20\.2031-6\(a\)/.test(wl2.html), 'the worklist drops the (a) block entirely on that estate');
  ok(/20\.2031-6\(b\)/.test(wl2.html), 'while (b) still reports the aggregate as a guide');

  // ── And the documentation LEVEL is not what moves it: force Strict Mode with a dispute on
  //    the same no-706 estate. Strict Mode without a return due must claim no federal floor.
  const strictNo706 = await p.evaluate((id) => {
    const j = jobs.find(x=>x.id===id); j.gateDispute = 'yes';
    return { formal: isFormalDoc(j), lots: invLotsToSplit(_jobInvRefs(id), j).length };
  }, jobId);
  ok(strictNo706.formal, 'a recorded dispute forces Strict Mode');
  eq(strictNo706.lots, 0, '⚠ and STILL no grouping cap — the level is not what moves this, the 706 gate is');

  // ── layout ──────────────────────────────────────────────────────────────────────────────
  await p.evaluate((id) => { const j=jobs.find(x=>x.id===id); j.gate706=''; j.gateDispute=''; renderInventoryTab(); }, jobId);
  await p.waitForTimeout(300);
  const of1440 = await p.evaluate(() => Math.max(0, document.documentElement.scrollWidth - window.innerWidth));
  await p.setViewportSize({ width: 390, height: 900 }); await p.waitForTimeout(400);
  const of390 = await p.evaluate(() => Math.max(0, document.documentElement.scrollWidth - window.innerWidth));
  eq(of1440, 0, 'no overflow at 1440');
  eq(of390, 0, 'no overflow at 390');
  eq(errs.length, 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));

  await b.close();
  console.log('  step9: ' + pass + ' passed, ' + fail + ' failed, ' + errs.length + ' page errors');
  process.exit(fail ? 1 : 0);
})();
