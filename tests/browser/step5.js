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

  // ── Seed a won probate estate through the REAL intake form ──────────────────
  await p.click('.nb:has-text("Client Intake")'); await p.waitForTimeout(300);
  const jobId = await p.evaluate(() => {
    const set = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; if (e.onchange) e.onchange(); } };
    set('i-svc','probate'); toggleIntakeFields();
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
    set('i-doc-tier','contents');
    set('i-probate-case','502026CP001234');
    set('i-probate-atty-fname','Richard'); set('i-probate-atty-lname','Comiter');
    set('i-probate-atty-firm','Comiter Singer'); set('i-probate-atty-phone','(561) 626-2101');
    set('i-probate-atty-email','rc@x.com');
    saveIntake();
    if (!jobs.length) return { err: (document.getElementById('i-fb')||{}).textContent || '(none)' };
    const j = jobs[0];
    j.won = true; j.status = 'won';
    estimateStore[j.id] = { approved: true, approvedBy: 'Anthony Graziano',
      estimate: { jobId: j.id, svc: 'probate', havellinTotal: 20000, totTC: 40, totPS: 80,
        rooms: [ { idx: 1, name: 'Entry & Living', st: 'in', vol: 3, cplx: 3, note: 'family very sensitive here' },
                 { idx: 4, name: 'Kitchen', st: 'in', vol: 3, cplx: 3 },
                 { idx: 9, name: 'Study', st: 'in', vol: 3, cplx: 3 },
                 { idx: 15, name: 'Garage (2-car)', st: 'excl', excluded: true } ],
        collections: [], vendors: [], prepItems: [] } };
    // The manifest, seeded on the real store the tab hydrates from.
    const it = (id, o) => Object.assign({ stableId: j.id + '_' + id, label: 'inventory', roomIdx: 1,
      ts: Date.UTC(2026,8,20,15,0), status: 'uploaded', objectName: 'Sideboard', category: 'Furniture',
      condition: 'Good', driveFileId: 'f' + id,
      driveFileUrl: 'https://drive.google.com/file/d/f' + id + '/view' }, o || {});
    _photoRefs[j.id] = [
      it('a', { roomIdx: 1, objectName: 'Sargent portrait', category: 'Art & Décor', fmv: 48000, valSource: 'Appraisal', valNote: 'Sothebys comp lot 41' }),
      it('b', { roomIdx: 1, objectName: '', condition: '' }),
      it('c', { roomIdx: 4, objectName: 'Dining suite', condition: 'Fair', qty: 8, flagBequest: true, disposition: 'Keep' }),
      it('d', { roomIdx: 4, objectName: 'Tabriz rug', flagDisputed: true, disposition: 'Auction', gross: 9000, fees: 900 }),
      it('e', { roomIdx: 99, objectName: 'Orphan chair', condition: 'Poor' }),
      it('f', { roomIdx: null, manual: true, objectName: '1965 Mustang', category: 'Vehicles & Watercraft', serial: 'VIN-4471' }),
      it('g', { roomIdx: 4, objectName: 'Unsaved lamp', driveFileId: '', driveFileUrl: '' }),
    ];
    savePhotoRefs(j.id);
    return j.id;
  });
  if (jobId && jobId.err) { console.log('SAVE REFUSED: ' + jobId.err); await b.close(); process.exit(1); }
  ok(!!jobId, 'a won probate estate at tier `contents` seeded through the real intake form');

  // ── The strip, on the real Job Admin & Inv tab ───────────────────────────────
  await p.click('.nb:has-text("Job Admin")'); await p.waitForTimeout(500);
  const strip = async (patch) => p.evaluate(({ id, patch }) => {
    const j = jobs.find(x => x.id === id);
    if (patch.dropTier) delete j.docTier; else if (patch.docTier !== undefined) j.docTier = patch.docTier;
    if (patch.docScope !== undefined) j.docScope = patch.docScope;
    if (patch.svc) j.svc = patch.svc;
    const sel = document.getElementById('inv-job');
    if (sel) { sel.value = String(id); if (sel.onchange) sel.onchange(); }
    renderInventoryTab();
    const html = document.getElementById('panel-inventory').innerHTML;
    const btns = Array.from(document.querySelectorAll('#panel-inventory button, #panel-inventory .btn-s'))
      .map(e => (e.getAttribute('onclick') || '') + '|' + (e.textContent || '').trim());
    return {
      contentsList: /printContentsList\(/.test(html),
      estateReport: /printEstateInventoryReport\(/.test(html),
      contentsRecord: /printContentsRecord\(/.test(html),
      primary: (btns.find(x => /printContentsList|printEstateInventoryReport|printContentsRecord/.test(x)) || '').split('|')[1],
    };
  }, { id: jobId, patch });

  let s = await strip({});
  ok(s.contentsList, 'the Contents List button is on the strip at tier contents');
  ok(!s.estateReport, '… and the valued Estate Inventory Report is NOT (its FMV column would print empty)');
  eq(s.primary, 'Contents List', 'it is the primary button');

  s = await strip({ docTier: 'values' });
  ok(!s.contentsList && s.estateReport, 'at tier values the asset schedule is the primary instead');
  s = await strip({ docTier: 'appraisals' });
  ok(!s.contentsList && s.estateReport, 'and at the top tier');
  s = await strip({ docTier: 'none' });
  ok(!s.contentsList, 'a None-tier estate is not offered the Contents List — counsel does the whole inventory');
  ok(!s.estateReport, '⚠ nor the valued schedule, as of step 6 — we did not inventory it');
  s = await strip({ dropTier: true, docScope: '' });
  ok(!s.contentsList && s.estateReport, 'a legacy job with no tier behaves exactly as it did before today');

  // ── The rendered document, off the REAL printer ──────────────────────────────
  await strip({ docTier: 'contents' });
  const doc = await p.evaluate((id) => {
    let captured = null, title = null;
    const realPrint = window.print, realTitle = document.title;
    window.print = () => { captured = document.getElementById('print-target').innerHTML; title = document.title; };
    printContentsList(id);
    // _printDocument defers the dialog by a frame; wait for it synchronously is not possible,
    // so read the target after the timeout the real path uses.
    return new Promise(res => setTimeout(() => {
      window.print = realPrint;
      res({ html: captured || document.getElementById('print-target').innerHTML, title, after: document.title, realTitle });
    }, 900));
  }, jobId);

  const html = doc.html || '';
  const txt = html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&middot;/g, '·')
    .replace(/&mdash;/g, '—').replace(/&#9888;/g, '⚠').replace(/&rsquo;/g, '’')
    .replace(/\s+/g, ' ').trim();
  ok(html.length > 2000, 'the document rendered (' + html.length + ' bytes)');
  ok(/Contents List/.test(doc.title || ''), 'the print title names it: ' + doc.title);
  ok(/69 Beach Blvd/.test(doc.title || ''), 'and the property');
  eq(doc.after, doc.realTitle, 'the page title is restored afterwards');

  // THE RULE: no value, in any form.
  ok(!/\$/.test(html), '⚠⚠ not one dollar sign on the page');
  ok(!/48,?000|9,?000|900\b/.test(txt), 'no recorded figure prints');
  ok(!/FMV|Fair Market Value|Net received|Estimated value/i.test(txt), 'and no value column');
  ok(!/Sothebys comp/.test(txt), 'nor the valuation basis note');
  ok(!/date of death/i.test(txt), 'and the header asserts no valuation date');

  // Room-first, walkthrough order.
  const heads = [...html.matchAll(/border-bottom:1px solid #333[^"]*">([^<]*)</g)]
    .map(m => m[1].replace(/&amp;/g, '&').trim());
  eq(heads.join(' > '), 'Entry & Living > Kitchen > Study > Room 99 > Unassigned / estate-wide',
     'room-first, in walkthrough order, off-plan then unassigned last');
  ok(/Study/.test(txt) && /nothing listed/.test(txt), 'the empty room in scope is named on the page');
  ok(/Not in scope on this engagement: Garage \(2-car\)/.test(txt), 'and the excluded room is reported as an answer, not a gap');
  ok(!/family very sensitive/.test(txt), '⚠ the room note stays internal');

  // The gap block, above the list.
  ok(/This list is not yet complete/.test(txt), 'the gap block is on the page');
  ok(html.indexOf('This list is not yet complete') < html.indexOf('Entry &amp; Living'),
     '⚠ and ABOVE the first room heading');
  ok(/1 room in scope with nothing listed — Study/.test(txt), 'naming the empty room');
  ok(/1 photographed item not yet named/.test(txt), 'the unnamed item');
  ok(/1 item with no condition recorded/.test(txt), 'the blank condition');
  ok(/has not reached the estate’s Drive folder/.test(txt), 'and the photograph that never uploaded');

  // The three promised fields plus the flags.
  ok(/Sargent portrait/.test(txt), 'description');
  ok(/Art & Décor/.test(txt), 'with the category under it');
  ok(/Serial VIN-4471/.test(txt), 'and a serial where one exists');
  ok(/Fair/.test(txt), 'condition');
  ok(/not recorded/.test(txt), 'a blank condition says so');
  ok(/DESIGNATED TO A NAMED PERSON/.test(txt), 'the bequest flag');
  ok(/DISPUTED — HELD/.test(txt), 'the dispute flag');
  ok(/SPECIALIST SUGGESTED/.test(txt), 'the specialist flag');
  ok(!/NOT YET APPRAISED/.test(txt), '⚠ never the release request’s wording');
  ok(/IN PROGRESS/.test(txt), 'the progress stamp');
  ok(/Descriptions and conditions on unreviewed lines/.test(txt), 'with the caveat that fits this document');
  ok(!/Values and dispositions on unreviewed/.test(txt), '⚠ and not the one that does not');
  ok(/responsibility of the Client and the estate attorney/.test(txt), 'and the footer names who values it');

  // Nothing carved out.
  ok(!/carved out|Non-Probate/i.test(txt), 'nothing is carved out of it');

  // ── The values-tier arm, on the same estate ─────────────────────────────────
  const valArm = await p.evaluate((id) => {
    const j = jobs.find(x => x.id === id); j.docTier = 'values';
    const realPrint = window.print; let cap = null;
    window.print = () => { cap = document.getElementById('print-target').innerHTML; };
    printContentsList(id);
    return new Promise(res => setTimeout(() => { window.print = realPrint;
      res(cap || document.getElementById('print-target').innerHTML); }, 900));
  }, jobId);
  const vt = String(valArm).replace(/<[^>]+>/g, ' ').replace(/&mdash;/g, '—').replace(/\s+/g, ' ');
  ok(/Estate Inventory — Asset Schedule/.test(vt), 'at tier values it points at the valued document …');
  ok(!/responsibility of the Client and the estate attorney/.test(vt),
     '… and does NOT tell counsel to value a list we were paid to value');
  await p.evaluate((id) => { jobs.find(x => x.id === id).docTier = 'contents'; }, jobId);

  // ── Overflow + page errors ──────────────────────────────────────────────────
  const of = async (w) => { await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(250);
    return p.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth)); };
  eq(await of(1440), 0, 'overflow at 1440');
  eq(await of(390), 0, 'overflow at 390');
  await p.setViewportSize({ width: 1440, height: 1000 });
  eq(errs.length, 0, 'page errors: ' + JSON.stringify(errs.slice(0, 3)));

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  await b.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
