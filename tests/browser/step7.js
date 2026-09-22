// Step 7 — the trustee's schedule, and the asset-track default that follows the matter type.
// ⚠ The dead end this closes runs BOTH ways and only a real page proves it: leave the track
// alone and the probate schedule lists the whole house; set it to Trust and every document
// empties. Driven on the real intake form, the real strip and the real printers.
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
    set('i-svc','cleanout'); toggleIntakeFields();
    set('i-fname','Tripp'); set('i-lname','Butler'); set('i-addr','69 Beach Blvd');
    set('i-city','Palm Beach'); set('i-zip','33480'); set('i-sqft','3500');
    set('i-ptype','Estate'); set('i-start','2026-10-01');
    const ss=document.getElementById('i-src'); const so=Array.from(ss.options).find(o=>o.value);
    if(so){ss.value=so.value; if(ss.onchange)ss.onchange();}
    set('i-executor-fname','Jane'); set('i-executor-lname','Doe');
    set('i-executor-role','Trustee'); set('i-executor-phone','(561) 555-0100');
    set('i-executor-email','jane@x.com'); set('i-date-of-death','2026-08-14');
    set('i-matter-type','trust'); set('i-gate-706','no');
    document.getElementById('i-gate-dispute').value='';
    set('i-doc-tier','values');
    saveIntake();
    if(!jobs.length) return {err:(document.getElementById('i-fb')||{}).textContent};
    const j=jobs[0]; j.won=true; j.status='won';
    estimateStore[j.id]={approved:true,approvedBy:'A',estimate:{jobId:j.id,svc:'cleanout',
      havellinTotal:20000,totTC:40,totPS:80,collections:[],vendors:[],prepItems:[],
      rooms:[{idx:1,name:'Entry & Living',st:'in'},{idx:4,name:'Kitchen',st:'in'}]}};
    // ⚠ NO assetTrack ON ANY LINE. This is the common case and the one the step exists for.
    const it=(id,o)=>Object.assign({stableId:j.id+'_'+id,label:'inventory',roomIdx:1,ts:1,
      status:'uploaded',category:'Furniture',condition:'Good',
      driveFileId:'f'+id,driveFileUrl:'https://drive.google.com/file/d/f'+id+'/view'},o||{});
    _photoRefs[j.id]=[it('a',{objectName:'Chesterfield sofa',fmv:'4000'}),
                      it('b',{roomIdx:4,objectName:'Dining suite',fmv:'9000'}),
                      it('c',{objectName:'Bedroom set',fmv:'6000'})];
    savePhotoRefs(j.id);
    return j.id;
  });
  if (jobId && jobId.err) { console.log('REFUSED: '+jobId.err); process.exit(1); }
  ok(!!jobId, 'a won trust estate seeded at tier `values`, with NO asset track set on any line');

  const print = (fn, patch) => p.evaluate(({id,fn,patch}) => {
    const j = jobs.find(x=>x.id===id);
    if (patch) Object.keys(patch).forEach(k => { j[k] = patch[k]; });
    let cap=null; const rp=window.print, rt=document.title;
    window.print=()=>{cap=document.getElementById('print-target').innerHTML;};
    const alerts=[]; const ra=window.alert; window.alert=m=>alerts.push(String(m));
    window[fn](id);
    return new Promise(res=>setTimeout(()=>{window.print=rp;window.alert=ra;
      res({html:cap||'',alerts:alerts,title:rt});},900));
  }, {id:jobId, fn, patch});
  const txt = h => String(h).replace(/<[^>]+>/g,' ').replace(/&[a-z]+;/g,' ').replace(/\s+/g,' ');

  // ── THE DEAD END, BOTH DIRECTIONS ────────────────────────────────────────
  const trust = await print('printTrustSchedule');
  const tt = txt(trust.html);
  ok(/19,000/.test(tt), '⚠⚠ the Trust Schedule carries the $19,000 — it used to be listed nowhere at all');
  ok(trust.html.indexOf('#357a50') > 0, 'and it is FINAL');
  ok(/Successor Trustee/.test(tt), 'with a successor-trustee signature block');
  ok(/Received for the trust/.test(tt), 'who RECEIVES it rather than adopting it');
  ok(!/Reviewed and adopted by/.test(tt), 'and never adopts it');
  ok(!/Personal Representative/.test(tt), 'no personal representative appears on it');
  ok(!/733\.604/.test(tt), 'nor the probate inventory statute');

  const court = await print('printCourtInventory');
  const ct = txt(court.html);
  ok(court.html.indexOf('#357a50') < 0, '⚠⚠ and the same job’s Court Inventory correctly refuses');
  ok(/\$0/.test(ct), 'totalling $0 …');
  ok(!/Reviewed and adopted by/.test(ct), '… with no adoption block on it');

  // ── THE TRACK DEFAULT, READ OFF THE REAL DROPDOWN ────────────────────────
  await p.click('.nb:has-text("Job Admin")'); await p.waitForTimeout(400);
  const pick = await p.evaluate((id) => {
    const s=document.getElementById('inv-job'); if(s){ s.value=String(id); if(s.onchange) s.onchange(); }
    return true;
  }, jobId);
  ok(pick, 'the Job Admin & Inv tab is on the seeded job');
  await p.waitForTimeout(500);
  // ⚠ THE ASSET TRACK CELL IS IN THE EXPANDED ITEM PANEL, NOT THE ROW. The 29-column table was
  // deleted on 2026-09-01 and the `group` metadata became the panel's four sections, so a sweep
  // of the collapsed tab finds nothing and reads as the control being absent. Open every row.
  const sel = await p.evaluate((id) => {
    (_jobInvRefs(id)||[]).forEach(r => { _invOpen[r.stableId] = 1; });
    renderInventoryTab();
    const host = document.getElementById('panel-inventory');
    const out = [];
    host.querySelectorAll('select').forEach(s => {
      const o = Array.from(s.options).map(x=>x.text);
      if (o.indexOf('Probate')>=0 && o.indexOf('Trust')>=0 && o.indexOf('Homestead')>=0)
        out.push(s.value || (s.options[s.selectedIndex]||{}).text);
    });
    return out;
  }, jobId);
  ok(sel.length > 0, 'the Asset Track cells are on screen (' + sel.length + ')');
  eq(sel.filter(v => v === 'Trust').length, sel.length,
     '⚠⚠ every untouched Asset Track cell reads Trust on a trust matter — screen and document agree');

  // ── THE STRIP ────────────────────────────────────────────────────────────
  // ⚠⚠ READ THE RENDERED TAB, NEVER `document.body.innerHTML`. This is a single-file app whose
  // <script> lives in the body, so body.innerHTML carries THE ENTIRE SOURCE — every `has()`
  // against it passes on the function declaration and every `lacks()` can never pass at all.
  // Caught here by a withheld-button assertion that failed while the gate was working perfectly.
  const strip = await p.evaluate(() => document.getElementById('panel-inventory').innerHTML);
  ok(/printTrustSchedule\(/.test(strip), 'the Trust Schedule is offered under More …');
  ok(/printCourtInventory\(/.test(strip), '… beside the Court Inventory, which is not gated by matter');

  // ── THE TIER GATE, REACHED DIRECTLY ──────────────────────────────────────
  const blocked = await print('printTrustSchedule', { docTier: 'contents' });
  eq(blocked.html, '', '⚠ at the contents tier the printer refuses when reached directly');
  eq(blocked.alerts.length, 1, 'and says so out loud');
  ok(/the accounting it supports are the trustee/.test(blocked.alerts[0] || ''),
     'naming whose the schedule is instead');
  const hidden = await p.evaluate((id) => {
    const j=jobs.find(x=>x.id===id); j.docTier='contents'; renderInventoryTab();
    const h=document.getElementById('panel-inventory').innerHTML; j.docTier='values'; renderInventoryTab();
    return h;
  }, jobId);
  ok(!/printTrustSchedule\(/.test(hidden), '⚠ and the button is withheld on the strip at the same tier');
  ok(/the Trust Schedule are withheld for that reason/.test(hidden), 'with the strip explaining the absence');

  // ── THE CONVERSE: a probate matter must not move ─────────────────────────
  const proCourt = await print('printCourtInventory', { matterType: 'probate' });
  const pc = txt(proCourt.html);
  ok(proCourt.html.indexOf('#357a50') > 0, '⚠ a probate matter still finalises its court schedule');
  ok(/19,000/.test(pc), 'carrying the whole $19,000 …');
  ok(/Reviewed and adopted by/.test(pc), '… with the adoption block back');
  const proTrust = await print('printTrustSchedule', { matterType: 'probate' });
  ok(proTrust.html.indexOf('#357a50') < 0, 'and the Trust Schedule refuses there instead');
  ok(/has no trust in it/.test(txt(proTrust.html)), 'naming what the estate is, on its own face');

  // ── THE AGREEMENT (D10) ──────────────────────────────────────────────────
  const agr = await p.evaluate((id) => {
    const j = jobs.find(x=>x.id===id);
    const est = estimateStore[id].estimate;
    const out = {};
    ['trust','probate','both','neither',''].forEach(m => {
      j.matterType = m;
      out[m || 'blank'] = probateAgreementHtml(j, est).replace(/<[^>]+>/g,' ').replace(/&[a-z]+;/g,' ').replace(/\s+/g,' ');
    });
    j.matterType = 'trust';
    return out;
  }, jobId);
  ok(/Florida Trust Administration Support/.test(agr.trust), '⚠⚠ a trust matter signs a trust compliance section');
  ok(!/Letters of Administration issuance/.test(agr.trust), '⚠⚠ with no 60-day Letters deadline on it');
  ok(!/Florida Probate Compliance/.test(agr.trust), 'and no probate compliance heading');
  ok(/does not prepare trust accountings/.test(agr.trust), 'carrying the boundary that keeps us out of fiduciary work');
  ok(/736\.08135/.test(agr.trust), 'citing what it supports');
  ok(/Written trustee approval/.test(agr.trust), 'and the authorisation table names the trustee');
  ok(/successor trustee, the Client has accepted the trusteeship/.test(agr.trust),
     'with the trustee’s own authority warranty in §5.1');
  ok(/Florida Probate Compliance/.test(agr.probate), 'a probate matter is unchanged');
  eq(agr.probate, agr.blank, '⚠⚠ and an UNANSWERED matter signs the probate wording byte for byte');
  ok(/733\.604/.test(agr.both) && /does not prepare trust accountings/.test(agr.both),
     'a pour-over matter signs both halves');
  ok(!/733\.604/.test(agr.neither) && /no statutory inventory is required/.test(agr.neither),
     'and a family distribution signs neither');
  ['trust','probate','both','neither','blank'].forEach(m =>
    ok(/5\.2 /.test(agr[m]) && /Section 8/.test(agr[m]) === /Section 8/.test(agr.probate),
       'the subsection keeps its number on ' + m));

  const of = async (w) => { await p.setViewportSize({width:w,height:900}); await p.waitForTimeout(250);
    return p.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth)); };
  eq(await of(1440), 0, 'overflow at 1440');
  eq(await of(390), 0, 'overflow at 390');
  eq(errs.length, 0, 'page errors: ' + JSON.stringify(errs.slice(0,3)));

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  await b.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
