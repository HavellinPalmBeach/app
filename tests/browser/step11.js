// AGENT ONE — naming the shots (2026-09-22). Spec: AGENT_ONE_SPEC.md.
//
// ⚠ Only the browser proves a person can actually press this. The unit suite drives the
//   backend and the writer; this drives the REAL intake, the REAL tab, the REAL button and
//   the REAL fetch, with the naming service stubbed at the network edge — so everything
//   between the click and the manifest is the shipping code.
// ⚠ Read the RENDERED container (#panel-inventory), never document.body.innerHTML: this is a
//   single-file app whose <script> lives in the body, so that string carries the whole
//   JavaScript source and every lacks() against it can never pass. CLAUDE.md records it.
// ⚠ saveIntake lands on the Client Dashboard on an 800ms timer. Let it land before measuring
//   anything, or every element reads offsetParent === null.
// ⚠ The run confirms first — accept the dialog or the button does nothing and the whole
//   script passes for the wrong reason.
const { chromium } = require('playwright');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL ' + m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + '  (got ' + JSON.stringify(a) + ', want ' + JSON.stringify(b) + ')');
const APP = process.env.APP || 'file:///home/user/app/havellin.html';

const ANSWER = {
  ok: true, success: true, model: 'claude-opus-5', done: ['a'], failed: {}, remaining: 0,
  results: { a: { objects: [
    { name: 'Walnut bar console, mid-century', category: 'Furniture', qty: 1,
      confidence: 'high', basis: 'form and finish clear in frame', crop: [0, .3, 1, 1] },
    { name: 'Banksy print, likely a reproduction', category: 'Art & Décor', qty: 1,
      confidence: 'medium', basis: 'image recognisable, edition not visible', crop: [.1, 0, .4, .3] },
    { name: 'appears to be Bang & Olufsen, column speakers, pair', category: 'Electronics & Appliances',
      qty: 2, confidence: 'medium', basis: 'form only, no badge legible', crop: [.6, 0, .9, .4] },
    { name: 'Assorted spirits bottles', category: 'Wine & Spirits', qty: 8,
      confidence: 'low', basis: 'labels not legible at this distance', crop: [0, .2, .5, .6] },
  ], notices: [
    { kind: 'mustfind', text: 'A small floor safe is visible under the console, right of frame.' },
    { kind: 'nfa', text: 'A plain metal tube on the lower shelf may be a suppressor. Confirm before anything moves.' },
  ] } },
};

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  p.on('dialog', d => d.accept());
  await p.goto(APP); await p.waitForTimeout(1500);

  // ── A probate estate with four unnamed shots and one already named ──────────
  await p.click('.nb:has-text("Client Intake")'); await p.waitForTimeout(300);
  const jobId = await p.evaluate(() => {
    const set = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; if (e.onchange) e.onchange(); } };
    set('i-svc', 'probate'); toggleIntakeFields();
    set('i-fname', 'Tripp'); set('i-lname', 'Butler'); set('i-addr', '69 Beach Blvd');
    set('i-city', 'Palm Beach'); set('i-zip', '33480'); set('i-sqft', '3500');
    set('i-ptype', 'Estate'); set('i-start', '2026-10-01');
    const ss = document.getElementById('i-src'); const so = Array.from(ss.options).find(o => o.value);
    if (so) { ss.value = so.value; if (ss.onchange) ss.onchange(); }
    set('i-executor-fname', 'Jane'); set('i-executor-lname', 'Doe');
    set('i-executor-role', 'Personal Representative'); set('i-executor-phone', '(561) 555-0100');
    set('i-executor-email', 'jane@x.com'); set('i-date-of-death', '2026-08-14');
    set('i-matter-type', 'probate'); set('i-probate-case', '2026-CP-001234');
    set('i-letters-date', '2026-08-20'); set('i-probate-atty-firm', 'Comiter Singer');
    set('i-probate-atty-fname', 'Richard'); set('i-probate-atty-lname', 'Comiter');
    set('i-probate-atty-phone', '(561) 626-2101'); set('i-probate-atty-email', 'r@x.com');
    set('i-doc-tier', 'values');
    const mf = document.getElementById('i-mustfind'); if (mf) mf.value = 'a coin collection\na small floor safe';
    saveIntake();
    if (!jobs.length) return { err: (document.getElementById('i-fb') || {}).textContent };
    const j = jobs[0]; j.won = true; j.status = 'won';
    estimateStore[j.id] = { approved: true, approvedBy: 'A', estimate: { jobId: j.id, svc: 'probate',
      havellinTotal: 20000, totTC: 40, totPS: 80, vendors: [], prepItems: [], collections: [],
      rooms: [{ idx: 1, name: 'Entry & Living', st: 'in', note: 'bar console on the far wall' },
              { idx: 4, name: 'Kitchen', st: 'in' }] } };
    const T = Date.now();
    _photoRefs[j.id] = [
      // the bar console — blank, the one the agent will split into four
      { stableId: 'a', label: 'inventory', roomIdx: 1, seq: 1, status: 'uploaded', objectName: '',
        category: 'General/Household', disposition: '', ts: T, driveFileId: 'fa',
        fieldNote: 'good stuff on this shelf' },
      // its close-up of a maker's mark — must ride with it, never a line of its own
      { stableId: 'a_det', label: 'detail', groupId: 'a', roomIdx: 1, seq: 1, status: 'uploaded',
        ts: T, driveFileId: 'fa_det' },
      // a second blank frame
      { stableId: 'c', label: 'inventory', roomIdx: 4, seq: 1, status: 'uploaded', objectName: '',
        category: 'General/Household', disposition: '', ts: T, driveFileId: 'fc' },
      // already named by a person — must be left alone
      { stableId: 'd', label: 'inventory', roomIdx: 4, seq: 2, status: 'uploaded',
        objectName: 'Silver tray', category: 'Silver & Precious Metal', disposition: 'Sell',
        fmv: 1200, ts: T, driveFileId: 'fd' },
      // never reached Drive — cannot be named, there is nothing to look at
      { stableId: 'e', label: 'inventory', roomIdx: 4, seq: 3, status: 'failed', objectName: '',
        category: 'General/Household', ts: T },
    ];
    savePhotoRefs(j.id);
    return j.id;
  });
  if (jobId && jobId.err) { console.log('REFUSED: ' + jobId.err); process.exit(1); }
  ok(!!jobId, 'a probate estate seeded with four unnamed shots');
  await p.waitForTimeout(1300);

  // ── Open the desk tab ───────────────────────────────────────────────────────
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
    const s = document.getElementById('inv-job'); if (s) { s.value = String(id); if (s.onchange) s.onchange(); }
  }, jobId);
  await p.waitForTimeout(600);

  // ── The button ──────────────────────────────────────────────────────────────
  const btn = await p.evaluate(() => {
    const el = Array.from(document.querySelectorAll('#panel-inventory button'))
      .find(x => /^Name \d+ shot/.test(x.textContent.trim()));
    if (!el) return null;
    return { text: el.textContent.trim(), bg: getComputedStyle(el).backgroundColor,
             visible: el.offsetParent !== null };
  });
  ok(!!btn, 'the Name button is on the bar');
  // TWO photographs want naming, not four rows and not five refs: the named tray is skipped,
  // the failed upload has nothing to look at, and the close-up is never a shot of its own.
  eq(btn && btn.text, 'Name 2 shots', '⚠ it counts PHOTOGRAPHS that want naming, not rows');
  ok(btn && btn.visible, 'and it is actually on screen');

  // ── Press it, with the naming service stubbed at the network edge ────────────
  const posted = await p.evaluate(async (payload) => {
    const sent = [];
    // ⚠ agentNameShots refuses outright when this device has no Apps Script URL — correctly,
    //   since there is nothing to ask. A fixture that leaves it blank measures the refusal and
    //   every later assertion passes for the wrong reason.
    SHEETS_SYNC_URL = 'https://script.google.com/macros/s/TEST/exec';
    const real = window.fetch;
    window.fetch = (url, opts) => {
      const body = JSON.parse(opts.body);
      sent.push(body);
      if (body.action !== 'agentIdentify') return real(url, opts);
      // Answer only for the shot we have a scripted result for; the other reports a failure,
      // which must not take the batch down with it.
      const out = JSON.parse(JSON.stringify(payload));
      const ids = body.shots.map(s => s.stableId);
      if (ids.indexOf('a') < 0) { out.results = {}; out.done = []; }
      out.failed = ids.indexOf('c') >= 0 ? { c: 'Drive file not found' } : {};
      return Promise.resolve({ ok: true, text: () => Promise.resolve(JSON.stringify(out)),
                               json: () => Promise.resolve(out) });
    };
    const el = Array.from(document.querySelectorAll('#panel-inventory button'))
      .find(x => /^Name \d+ shot/.test(x.textContent.trim()));
    el.click();
    await new Promise(r => setTimeout(r, 900));
    window.fetch = real;
    return sent.filter(s => s.action === 'agentIdentify');
  }, ANSWER);

  ok(posted.length >= 1, 'it posted to the naming service');
  const req = posted[0];
  eq(req.shots.length, 2, 'two photographs in the request');
  ok(req.context.categories.length >= 13, '⚠ the full category list rides the payload — the server holds none');
  eq(req.context.mustFind, ['a coin collection', 'a small floor safe'], 'and the must-find list goes with it');
  eq(req.context.fiduciary, true, 'and that this is a decedent estate');
  const consoleShot = req.shots.find(s => s.stableId === 'a');
  eq(consoleShot.details.map(d => d.fileId), ['fa_det'],
     "⚠⚠ the maker's-mark close-up rides with its parent, in the same request");
  eq(consoleShot.room, 'Entry & Living', 'with the room');
  eq(consoleShot.roomNote, 'bar console on the far wall', 'and the walkthrough note');
  eq(consoleShot.fieldNote, 'good stuff on this shelf', 'and what the crew said');
  ok(!req.shots.some(s => s.stableId === 'a_det'), 'and the close-up is never a shot of its own');
  ok(!req.shots.some(s => s.stableId === 'd' || s.stableId === 'e'),
     'a named row and an un-uploaded shot are both left out');

  // ── What landed in the manifest ─────────────────────────────────────────────
  await p.waitForTimeout(500);
  const man = await p.evaluate((id) => {
    const live = _photoRefs[id].filter(r => r.label === 'inventory' && !r.deletedAt);
    return live.map(r => ({ id: r.stableId, name: r.objectName, cat: r.category, qty: r.qty,
                            by: r.namedBy, conf: r.agentConf, basis: r.agentBasis,
                            file: r.driveFileId, derived: r.derivedFrom || null,
                            reviewed: !!r.reviewed, fmv: r.fmv, disp: r.disposition,
                            nfa: r.flagNFA, crop: r.crop ? r.crop.length : 0 }));
  }, jobId);

  const fromConsole = man.filter(r => r.file === 'fa');
  eq(fromConsole.length, 4, '⚠⚠ one photograph became four inventory lines');
  eq(fromConsole.map(r => r.name), [
    'Walnut bar console, mid-century',
    'Banksy print, likely a reproduction',
    'appears to be Bang & Olufsen, column speakers, pair',
    'Assorted spirits bottles',
  ], 'each named, in order, hedges intact');
  eq(fromConsole.map(r => r.cat), ['Furniture', 'Art & Décor', 'Electronics & Appliances', 'Wine & Spirits'],
     'and each filed in its own category');
  eq(fromConsole[2].qty, 2, 'the pair carries a quantity');
  eq(fromConsole[3].qty, 8, 'and so does the lot of bottles');
  eq(fromConsole[0].qty, undefined, 'a single article does not');
  eq(fromConsole.filter(r => r.derived === 'a').length, 3, 'three of them are split off the photograph');
  eq(fromConsole.map(r => r.by), ['agent', 'agent', 'agent', 'agent'], 'all four marked agent-named');
  eq(fromConsole.map(r => r.reviewed), [false, false, false, false], '⚠ and NONE of them reviewed');
  eq(fromConsole.map(r => r.conf), ['high', 'medium', 'medium', 'low'], 'each carrying how sure it was');
  ok(fromConsole.every(r => r.crop === 4), 'and a crop box, captured for later');
  ok(fromConsole.every(r => r.fmv === undefined), '⚠⚠ not one of them carries a value');
  ok(fromConsole.every(r => !r.disp), 'and not one carries a disposition');
  ok(fromConsole.every(r => !r.nfa), 'and not one carries an NFA flag');

  const tray = man.find(r => r.id === 'd');
  eq(tray.name, 'Silver tray', 'the row a person had already named is untouched');
  eq(tray.fmv, 1200, 'and keeps its value');
  eq(tray.by, undefined, 'and is not claimed by the agent');

  // ── What a person sees ──────────────────────────────────────────────────────
  const seen = await p.evaluate(() => {
    const el = document.getElementById('panel-inventory');
    return { text: el.innerText, html: el.innerHTML };
  });
  ok(/Banksy print, likely a reproduction/.test(seen.text), 'the hedged name is on screen verbatim');
  ok(/agent/.test(seen.text), 'rows say an agent named them');
  ok(/unsure/.test(seen.text), 'and the low-confidence one says it is unsure');
  ok(/Must find/.test(seen.text), '⚠⚠ the must-find notice renders');
  ok(/floor safe/.test(seen.text), 'naming what was seen');
  ok(/Possible NFA item/.test(seen.text), 'and so does the possible suppressor');
  ok(/Read off the photographs, not off the house/.test(seen.text),
     '⚠ and it says plainly that it is not a search of the house');
  ok(/IN PROGRESS|check them below|1 of 4 in this photo/.test(seen.text),
     'and the tab still says the work is unchecked');

  // ── A desk correction takes the row ─────────────────────────────────────────
  const after = await p.evaluate((id) => {
    const row = _photoRefs[id].find(r => r.objectName === 'appears to be Bang & Olufsen, column speakers, pair');
    _invEdit(id, row.stableId, 'objectName', { value: 'Bang & Olufsen Beolab 8000 speakers, pair', type: 'text' });
    const r = _photoRefs[id].find(x => x.stableId === row.stableId);
    return { name: r.objectName, by: r.namedBy, conf: r.agentConf };
  }, jobId);
  eq(after.by, 'desk', '⚠ correcting the name hands the row to the person who corrected it');
  eq(after.conf, undefined, 'and clears the unchecked badge');
  eq(after.name, 'Bang & Olufsen Beolab 8000 speakers, pair', 'with their reading, not the guess');

  // ── The button withdraws once there is nothing left ──────────────────────────
  const left = await p.evaluate((id) => {
    _photoRefs[id].forEach(r => { if (r.label === 'inventory' && !r.objectName) r.objectName = 'x'; });
    renderInventoryTab();
    return Array.from(document.querySelectorAll('#panel-inventory button'))
      .filter(x => /^Name \d+ shot/.test(x.textContent.trim())).length;
  }, jobId);
  eq(left, 0, 'the button withdraws itself once every shot has a name');

  // ── Layout ──────────────────────────────────────────────────────────────────
  for (const w of [1440, 390]) {
    await p.setViewportSize({ width: w, height: 900 });
    await p.waitForTimeout(250);
    const over = await p.evaluate(() => Math.max(0, document.documentElement.scrollWidth - window.innerWidth));
    eq(over, 0, 'no horizontal overflow at ' + w + 'px');
  }
  eq(errs.length, 0, 'no page errors  ' + JSON.stringify(errs.slice(0, 2)));

  await b.close();
  console.log('  step11: ' + pass + ' checks, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
