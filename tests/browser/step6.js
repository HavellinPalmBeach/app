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

  await p.click('.nb:has-text("Client Intake")'); await p.waitForTimeout(300);
  const jobId = await p.evaluate(() => {
    const set = (id,v) => { const e=document.getElementById(id); if(e){e.value=v; if(e.onchange) e.onchange();} };
    set('i-svc','probate'); toggleIntakeFields();
    set('i-fname','Tripp'); set('i-lname','Butler'); set('i-addr','69 Beach Blvd');
    set('i-city','Palm Beach'); set('i-zip','33480'); set('i-sqft','3500');
    set('i-ptype','Estate'); set('i-start','2026-10-01');
    const ss=document.getElementById('i-src'); const so=Array.from(ss.options).find(o=>o.value);
    if(so){ss.value=so.value; if(ss.onchange)ss.onchange();}
    set('i-executor-fname','Jane'); set('i-executor-lname','Doe');
    set('i-executor-role','Personal Representative'); set('i-executor-phone','(561) 555-0100');
    set('i-executor-email','jane@x.com'); set('i-date-of-death','2026-08-14');
    set('i-matter-type','probate'); set('i-gate-706','no');
    document.getElementById('i-gate-dispute').value='';
    set('i-doc-tier','none');
    set('i-probate-case','502026CP001234');
    set('i-probate-atty-fname','Richard'); set('i-probate-atty-lname','Comiter');
    set('i-probate-atty-firm','Comiter Singer'); set('i-probate-atty-phone','(561) 626-2101');
    set('i-probate-atty-email','rc@x.com');
    saveIntake();
    if(!jobs.length) return {err:(document.getElementById('i-fb')||{}).textContent};
    const j=jobs[0]; j.won=true; j.status='won';
    estimateStore[j.id]={approved:true,approvedBy:'A',estimate:{jobId:j.id,svc:'probate',
      havellinTotal:20000,totTC:40,totPS:80,collections:[],vendors:[],prepItems:[],
      rooms:[{idx:1,name:'Entry & Living',st:'in'},{idx:4,name:'Kitchen',st:'in'}]}};
    const it=(id,o)=>Object.assign({stableId:j.id+'_'+id,label:'inventory',roomIdx:1,ts:1,
      status:'uploaded',objectName:'Sideboard',category:'Furniture',condition:'Good',fmv:'4000',
      driveFileId:'f'+id,driveFileUrl:'https://drive.google.com/file/d/f'+id+'/view'},o||{});
    _photoRefs[j.id]=[it('a',{objectName:'Sargent portrait'}),it('b',{roomIdx:4,objectName:'Tabriz rug'})];
    savePhotoRefs(j.id);
    return j.id;
  });
  if (jobId && jobId.err) { console.log('REFUSED: '+jobId.err); process.exit(1); }
  ok(!!jobId, 'a won probate estate seeded at tier `none`');

  await p.click('.nb:has-text("Job Admin")'); await p.waitForTimeout(500);
  const read = (patch) => p.evaluate(({id,patch}) => {
    const j = jobs.find(x=>x.id===id);
    if (patch.dropTier) { delete j.docTier; delete j.docScope; }
    else if (patch.docTier!==undefined) j.docTier=patch.docTier;
    if (patch.matterType!==undefined) j.matterType=patch.matterType;
    if (patch.svc) j.svc=patch.svc;
    const sel=document.getElementById('inv-job');
    if(sel){sel.value=String(id); if(sel.onchange)sel.onchange();}
    renderInventoryTab();
    const panel=document.getElementById('panel-inventory');
    const html=panel.innerHTML;
    const primaryBtn=Array.from(panel.querySelectorAll('button')).find(e=>/gray-dk/.test(e.getAttribute('style')||''));
    return {
      primary: primaryBtn ? primaryBtn.textContent.trim() : '(none)',
      schedule: /printEstateInventoryReport\(/.test(html),
      court: /printCourtInventory\(/.test(html),
      contentsList: /printContentsList\(/.test(html),
      approval: /printApprovalRequest\(/.test(html),
      ledger: /printDispositionLedger\(/.test(html),
      worklist: /printAppraisalWorklist\(/.test(html),
      asFound: /printAsFoundRecord\(/.test(html),
      csv: /exportInventoryCSV\(/.test(html),
      note: /No valued schedule on this engagement/.test(panel.textContent),
    };
  }, {id:jobId, patch});

  let r = await read({ docTier: 'none' });
  eq(r.primary, 'Approval Request', '⚠⚠ tier none: the primary is the release approval');
  ok(!r.schedule, '… the "Estate Inventory — Asset Schedule" button is GONE');
  ok(!r.court, '… and so is the §733.604 court schedule');
  ok(!r.contentsList, '… no contents list either — counsel inventories');
  ok(r.ledger && r.worklist && r.asFound && r.csv, '… everything we DO produce is still offered');
  ok(r.note, '… and the strip says why the schedule is absent');

  r = await read({ docTier: 'contents' });
  eq(r.primary, 'Contents List', 'tier contents: the photographed list');
  ok(!r.schedule && !r.court, '… both valued documents withheld');
  ok(r.note, '… with the reason on screen');

  r = await read({ docTier: 'values' });
  eq(r.primary, 'Estate Inventory PDF', 'tier values: the valued schedule');
  ok(r.court, '… and the court schedule is back');
  ok(!r.note, '… and nothing is explained, because nothing is withheld');

  r = await read({ docTier: 'appraisals' });
  eq(r.primary, 'Estate Inventory PDF', 'tier appraisals: the same');
  r = await read({ dropTier: true });
  eq(r.primary, 'Estate Inventory PDF', '⚠ a legacy job with NEITHER tier nor scope behaves exactly as it did');
  const scoped = await read({ docTier: 'none' });
  ok(!scoped.schedule, '⚠ but a job carrying only the legacy scope `none` is still read as None');
  ok(r.court, '… court schedule included');

  // The printers refuse with the same sentence, driven through the real call.
  await read({ docTier: 'contents' });
  const refused = await p.evaluate((id) => {
    const out = []; const ra = window.alert; let printed = 0;
    const rp = window.print; window.print = () => { printed++; };
    window.alert = (m) => out.push(String(m));
    printEstateInventoryReport(id); printCourtInventory(id);
    return new Promise(res => setTimeout(() => { window.alert = ra; window.print = rp;
      res({ alerts: out, printed }); }, 600));
  }, jobId);
  eq(refused.printed, 0, '⚠ neither document prints when reached directly');
  eq(refused.alerts.length, 2, 'and each refuses out loud');
  ok(/does not include valuation/.test(refused.alerts[0]), 'the schedule names the engagement');
  ok(/733\.604/.test(refused.alerts[1]), 'the court schedule names the filing');

  // A trust matter still renders and explains itself — step 2's design, deliberately kept.
  const trust = await p.evaluate((id) => {
    const j = jobs.find(x=>x.id===id); j.docTier='values'; j.matterType='trust';
    (_photoRefs[id]||[]).forEach(r => { r.assetTrack='Trust'; });
    let cap=null; const rp=window.print; window.print=()=>{cap=document.getElementById('print-target').innerHTML;};
    printCourtInventory(id);
    return new Promise(res=>setTimeout(()=>{window.print=rp;res(cap||'');},900));
  }, jobId);
  const tt = String(trust).replace(/<[^>]+>/g,' ').replace(/&mdash;/g,'—').replace(/\s+/g,' ');
  ok(tt.length > 200, 'on a trust matter the court schedule still renders …');
  ok(/not being administered through probate/.test(tt), '… and says so on its face');
  ok(/no final copy of THIS schedule will follow/.test(tt),
     '⚠⚠ and the DRAFT block no longer promises a copy that is never coming');
  ok(!/a final copy is issued once the outstanding items are valued/.test(tt),
     '⚠ the old constant sentence is gone from this case');

  const of = async (w) => { await p.setViewportSize({width:w,height:900}); await p.waitForTimeout(250);
    return p.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth)); };
  eq(await of(1440), 0, 'overflow at 1440');
  eq(await of(390), 0, 'overflow at 390');
  eq(errs.length, 0, 'page errors: ' + JSON.stringify(errs.slice(0,3)));

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  await b.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
