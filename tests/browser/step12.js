// POSSIBLE DUPLICATES — two frames of one credenza (2026-09-22).
//
// Anthony: *"we take two pictures of that bar ... it's not going to think it's more of the
// same items is it"*. It does — `agentShotGroups` keys on the PHOTOGRAPH, so every frame is
// its own request and the model carries no memory between them.
//
// ⚠ Only the browser proves a person can press this. The unit suite drives the grouping rule;
//   this drives the REAL tab, the REAL block and the REAL buttons.
// ⚠ Read the RENDERED container (#panel-inventory), never document.body.innerHTML — this is a
//   single-file app whose <script> lives in the body, so that string carries the whole source.
// ⚠ saveIntake lands on the Client Dashboard on an 800ms timer. Let it land first.
// ⚠ Both actions confirm or badge — accept the dialog or the script passes for the wrong reason.
const { chromium } = require('playwright');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL ' + m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + '  (got ' + JSON.stringify(a) + ', want ' + JSON.stringify(b) + ')');
const APP = process.env.APP || 'file:///home/user/app/havellin.html';

// Two Items-pass frames of ONE bar console, plus the split case that must NOT flag and a
// matching pair in another room that is genuinely two objects.
const SEED = `
  const T = Date.now();
  const A = (o) => Object.assign({ label: 'inventory', status: 'uploaded', ts: T,
    category: 'Furniture', disposition: '', namedBy: 'agent', agentConf: 'high' }, o);
  _photoRefs[JOB] = [
    // frame one of the credenza, and a line split off it
    A({ stableId: 'f1',  roomIdx: 1, seq: 1, driveFileId: 'F1', itemNo: 1,
        objectName: 'Walnut bar console' }),
    A({ stableId: 'f1b', roomIdx: 1, derivedFrom: 'f1', driveFileId: 'F1', itemNo: 2,
        objectName: 'Assorted spirits bottles', category: 'Wine & Spirits' }),
    // frame TWO of the same credenza — the duplicate. Note the trailing full stop.
    A({ stableId: 'f2',  roomIdx: 1, seq: 2, driveFileId: 'F2', itemNo: 3,
        objectName: 'Walnut bar console.' }),
    // ⚠ TWO MATCHING LAMPS SPLIT OFF ONE FRAME — two real objects, never flagged
    A({ stableId: 'g1',  roomIdx: 4, seq: 1, driveFileId: 'G1', itemNo: 4,
        objectName: 'Brass table lamp' }),
    A({ stableId: 'g1b', roomIdx: 4, derivedFrom: 'g1', driveFileId: 'G1', itemNo: 5,
        objectName: 'Brass table lamp' }),
  ];
  savePhotoRefs(JOB);
`;

const panel = () => document.getElementById('panel-inventory').innerText;

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  p.on('dialog', d => d.accept());
  await p.goto(APP); await p.waitForTimeout(1500);

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
    saveIntake();
    if (!jobs.length) return { err: (document.getElementById('i-fb') || {}).textContent };
    const j = jobs[0]; j.won = true; j.status = 'won';
    estimateStore[j.id] = { approved: true, approvedBy: 'A', estimate: { jobId: j.id, svc: 'probate',
      havellinTotal: 20000, totTC: 40, totPS: 80, vendors: [], prepItems: [], collections: [],
      rooms: [{ idx: 1, name: 'Entry & Living', st: 'in' }, { idx: 4, name: 'Kitchen', st: 'in' }] } };
    return j.id;
  });
  if (jobId && jobId.err) { console.log('REFUSED: ' + jobId.err); process.exit(1); }
  ok(!!jobId, 'a probate estate seeded');
  await p.waitForTimeout(1300);

  const seed = async () => {
    await p.evaluate((args) => {
      const [js, id] = args;
      // eslint-disable-next-line no-new-func
      new Function('JOB', js)(id);
      const s = document.getElementById('inv-job'); if (s) { s.value = String(id); if (s.onchange) s.onchange(); }
    }, [SEED, jobId]);
    await p.waitForTimeout(500);
  };

  await p.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('.nb')).find(b => /Job Admin/.test(b.textContent));
    if (btn) btn.click();
  });
  await p.waitForTimeout(400);
  await seed();

  // ── The block ───────────────────────────────────────────────────────────────
  const blk = await p.evaluate(() => {
    const el = Array.from(document.querySelectorAll('#panel-inventory .a-warn'))
      .find(x => /Possible duplicates/.test(x.textContent));
    if (!el) return null;
    const btns = Array.from(el.querySelectorAll('button')).map(b => b.textContent.trim());
    return { text: el.innerText, btns, thumbs: el.querySelectorAll('[data-thumb-id]').length,
             visible: el.offsetParent !== null };
  });
  ok(!!blk, '⚠ the Possible duplicates block renders');
  ok(blk && blk.visible, 'and is actually on screen');
  ok(blk && /Walnut bar console/.test(blk.text), 'it names the object');
  ok(blk && /Entry & Living/.test(blk.text), 'and the room');
  ok(blk && /#1\b/.test(blk.text) && /#3\b/.test(blk.text), 'and both item numbers — 1 and 3');
  ok(blk && !/Brass table lamp/.test(blk.text),
     '⚠⚠ and NOT the two lamps split off one frame — those are two real objects');
  ok(blk && !/Assorted spirits/.test(blk.text), 'nor the other line off the same frame');
  eq(blk && blk.thumbs, 2, 'both photographs are in the block, which is the point of it');
  eq(blk && blk.btns.filter(t => t === 'Remove').length, 2, 'Remove on each line');
  eq(blk && blk.btns.filter(t => t === 'Not duplicates').length, 1, 'and one Not duplicates for the pair');

  // ── The chips on the rows ───────────────────────────────────────────────────
  const chips = await p.evaluate(() => {
    const out = {};
    Array.from(document.querySelectorAll('#panel-inventory span'))
      .filter(s => s.textContent.trim() === 'possible duplicate')
      .forEach(s => { out.n = (out.n || 0) + 1; out.colour = getComputedStyle(s).color; });
    return out;
  });
  eq(chips.n, 2, 'both contested rows carry a chip');
  // ⚠ BRONZE, NEVER RED. Red on this strip means a held firearm; a second red costs the first
  //   its meaning.
  eq(chips.colour, 'rgb(166, 124, 69)', 'and it is bronze, not red');

  // ── Remove one ──────────────────────────────────────────────────────────────
  const after = await p.evaluate((id) => {
    agentDropDuplicate(id, 'f2');
    const live = _jobInvRefs(id);
    const gone = _getPhotoRef(id, 'f2');
    return { live: live.length, names: live.map(r => r.objectName),
             tombstoned: !!gone.deletedAt, trashed: !!gone.driveTrashed,
             fileId: gone.driveFileId, kept: gone.objectName };
  }, jobId);
  eq(after.live, 4, 'the duplicate line comes off — 5 lines become 4');
  ok(!after.names.includes('Walnut bar console.'), 'and it is the one you removed');
  ok(after.names.includes('Walnut bar console'), 'the one you kept stays');
  ok(after.tombstoned, 'tombstoned, so a merge from the other device cannot undo it');
  // ⚠⚠ THE PHOTOGRAPH IS EVIDENCE OF THE ROOM whatever the desk decides about the LINE.
  eq(after.trashed, false, '⚠⚠ and the photograph is NOT trashed in Drive');
  eq(after.fileId, 'F2', 'the row still points at it, so Restore gives the line back whole');

  await p.waitForTimeout(400);
  ok(await p.evaluate(() => !Array.from(document.querySelectorAll('#panel-inventory .a-warn'))
       .some(x => /Possible duplicates/.test(x.textContent))), 'the block clears once it is settled');
  // ⚠ textContent, NOT innerText — innerText applies CSS text-transform and `.sec` is
  //   uppercase, so a case-sensitive match against the heading finds nothing. CLAUDE.md
  //   records this trap in the runner's own header.
  ok(await p.evaluate(() => /Removed items/.test(document.getElementById('panel-inventory').textContent)),
     'and Removed items offers it back');

  // ── The other answer: they really are two objects ───────────────────────────
  await seed();
  const nd = await p.evaluate((id) => {
    const el = Array.from(document.querySelectorAll('#panel-inventory button'))
      .find(b => b.textContent.trim() === 'Not duplicates');
    if (!el) return null;
    el.click();
    return { live: _jobInvRefs(id).length,
             cleared: _jobInvRefs(id).filter(r => r.dupOK).map(r => r.stableId).sort() };
  }, jobId);
  eq(nd && nd.live, 5, '⚠ NOTHING is removed — both objects are real');
  eq(nd && nd.cleared, ['f1', 'f2'], 'and the pair is cleared as a pair');
  await p.waitForTimeout(400);
  ok(await p.evaluate(() => !Array.from(document.querySelectorAll('#panel-inventory .a-warn'))
       .some(x => /Possible duplicates/.test(x.textContent))), 'so it stops flagging');
  eq(await p.evaluate(() => Array.from(document.querySelectorAll('#panel-inventory span'))
       .filter(s => s.textContent.trim() === 'possible duplicate').length, 0), 0, 'and the chips go with it');

  // ── A desk edit takes the row out of the pool on its own ────────────────────
  await seed();
  const edited = await p.evaluate((id) => {
    const r = _getPhotoRef(id, 'f2'); r.objectName = 'Oak sideboard'; r.namedBy = 'desk';
    delete r.agentConf; _setPhotoRef(id, r); savePhotoRefs(id); renderInventoryTab();
    return Array.from(document.querySelectorAll('#panel-inventory .a-warn'))
      .some(x => /Possible duplicates/.test(x.textContent));
  }, jobId);
  eq(edited, false, 'correcting one name settles it without touching the flag');

  // ── Layout ──────────────────────────────────────────────────────────────────
  await seed();
  const of1440 = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  await p.setViewportSize({ width: 390, height: 900 }); await p.waitForTimeout(500);
  const of390 = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok(of1440 <= 0, 'no overflow at 1440  (' + of1440 + ')');
  ok(of390 <= 0, 'no overflow at 390  (' + of390 + ')');
  ok(await p.evaluate(() => {
    const el = Array.from(document.querySelectorAll('#panel-inventory .a-warn'))
      .find(x => /Possible duplicates/.test(x.textContent));
    return !!el && el.offsetParent !== null;
  }), 'and the block is still reachable on a phone');

  eq(errs, [], 'no page errors');
  console.log('step12: ' + pass + ' passed, ' + fail + ' failed');
  await b.close();
  process.exit(fail ? 1 : 0);
})();
