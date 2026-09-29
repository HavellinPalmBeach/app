// Step 34 (numbered 34 on the merge — the concurrent change-order card session took 33) — the line under a button keeps its own four seconds, and what Reset and Start over discard
// stays discarded on this device (2026-09-29, the two items the Reset build left open).
//
// Measured on the pre-change build before anything was changed:
//   • a message written three seconds after another was gone a second and a half later — every message
//     armed an unconditional four-second clear and none was ever cancelled, so the OLDER one's timer
//     wiped the newer one;
//   • offline with nothing saved, Start over put the four rooms it had just discarded straight back
//     under "restored an unsaved draft" — this device's unsaved-draft copy (saveEstimateScratch) refuses
//     an empty-rooms state, so the clear never overwrote it, and the reopen restored it;
//   • Reset blanked the screen and left that copy standing: a reload and an offline open brought all four
//     rooms back.
//
// ⚠ THE NETWORK IS ABORTED, NOT ABSENT. With no sync URL at all the app answers "offline" synchronously,
// which puts the open's messages in a different order from a phone with no signal. Here the URL is set
// and every request to it is aborted, so the open fails the way it does in the field.
//   A. Two messages three seconds apart: the second lives its own four seconds.
//   B. Save pressed twice, three seconds apart, through the real button: the second refusal stays.
//   C. On the Client Dashboard: a notice painted by a redraw is not wiped by an older message's timer.
//   D. Start over, offline, nothing saved: the discarded rooms do not come back; the copy is gone.
//   E. Start over, Cancel: the rooms and the copy stay.
//   F. Reset, then a reload and an offline open: nothing comes back.
//   G. The safety net still works: rooms scored, a reload with no button pressed, an offline open — the
//      unsaved draft comes back, named as one.
//   H. Only this client's copy: Reset on one client leaves another client's draft where it is.
//   I. Overflow at 1440 and 390; no page errors.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step34.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
const SYNC = 'https://script.google.com/macros/s/STEP33-OFFLINE/exec';
let pass = 0, fail = 0;
// ⚠ Held outside the async body so the catch can close it: against the pre-change build a check can
// throw, and a catch that leaves Chromium open reads as a hang rather than as failures.
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');
const same = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
(async () => {
  b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  p.setDefaultTimeout(8000);
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  const dialogs = []; let answer = true;
  p.on('dialog', async d => { dialogs.push(d.message()); if (d.type() === 'confirm' && !answer) await d.dismiss(); else await d.accept(); });
  // Every request to the sync URL fails, as it does with no signal.
  await p.route(SYNC + '**', (r) => r.abort('internetdisconnected'));
  await p.goto(APP); await p.waitForTimeout(600);
  await p.evaluate((u) => { localStorage.setItem('hav_sheets_url', u); }, SYNC);
  await p.reload(); await p.waitForTimeout(1500);
  ok(await p.evaluate((u) => SHEETS_SYNC_URL === u, SYNC), 'the sync URL is set, so the open goes to the network and fails there');

  const future = (() => { const d = new Date(); d.setDate(d.getDate() + 30);
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10); })();
  const addClient = async (first, last) => {
    await p.evaluate(() => { const b = document.getElementById('btn-add-client'); if (b) b.click(); }); await p.waitForTimeout(300);
    const id = await p.evaluate(([wt, first, last]) => {
      const set = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; if (e.onchange) e.onchange(); } };
      const pick = (id) => { const e = document.getElementById(id); const o = e && Array.from(e.options).find(x => x.value); if (o) { e.value = o.value; if (e.onchange) e.onchange(); } };
      set('i-svc', 'downsizing'); toggleIntakeFields();
      set('i-fname', first); set('i-lname', last); set('i-addr', '12 Ocean Blvd'); set('i-city', 'Palm Beach'); set('i-zip', '33480');
      set('i-sqft', '3000'); set('i-home-value', '2500000'); set('i-phone', '(561) 555-0100'); set('i-email', last.toLowerCase() + '@example.com');
      pick('i-ptype'); pick('i-src'); set('i-walkthrough', wt);
      const st = new Date(wt); st.setDate(st.getDate() + 7); while (st.getDay() === 0 || st.getDay() === 6) st.setDate(st.getDate() + 1);
      set('i-start', st.toISOString().slice(0, 10)); saveIntake(); return (jobs[0] || {}).id;
    }, [future, first, last]);
    await p.waitForTimeout(1500);
    return id;
  };
  const id = await addClient('Sam', 'Scratchley');
  ok(!!id, 'a client is created (' + id + ')');

  const open = async (jid) => { await p.evaluate((x) => dashGoEstimate(x), jid); await p.waitForTimeout(1200); };
  const inScope = () => p.evaluate(() => Array.from(document.querySelectorAll('.scope-toggle')).filter(t => t.getAttribute('data-state') !== 'off').length);
  const draft = () => p.evaluate(() => { const s = localStorage.getItem('havellin_est_scratch'); if (!s) return null;
    const d = JSON.parse(s); return { jobId: d.jobId, rooms: (d.estimate && d.estimate.rooms || []).length }; });
  const strip = (sel) => p.evaluate((s) => (document.querySelector(s) || {}).textContent || '', sel || '#e-fb');
  const four = async () => { await p.evaluate(() => { for (let i = 0; i < 4; i++) document.getElementById('chk-r' + i).click(); calcAll(); }); await p.waitForTimeout(800); };
  const press = async (sel, yes) => { answer = yes; dialogs.length = 0; await p.click(sel); await p.waitForTimeout(1200); answer = true; };

  // ── A ─────────────────────────────────────────────────────────────────
  console.log('## A. Two messages three seconds apart');
  await open(id);
  // Wait out whatever the open itself wrote, so the only timers running are the two measured here.
  await p.waitForTimeout(4300);
  const a = await p.evaluate(async () => {
    const wait = (ms) => new Promise(r => setTimeout(r, ms));
    const read = () => (document.getElementById('e-fb') || {}).textContent || '';
    showFB('e-fb', 'ok', 'first message');
    await wait(3000);
    showFB('e-fb', 'warn', 'second message');
    // ⚠ The margins are a full second or more on purpose: a setTimeout fires AT LEAST on time and later under
    // load, so reading half a second after the first timer could catch it not yet fired and pass the old build.
    await wait(2500);
    const mid = read();
    await wait(2500);
    return { mid, end: read() };
  });
  same(a.mid, 'second message', '⚠⚠ at 5.5 seconds the first message\'s timer has fired and the second message is still there (it was wiped here)');
  same(a.end, '', 'and it goes on its own four seconds');

  // ── B ─────────────────────────────────────────────────────────────────
  console.log('## B. Save pressed twice, three seconds apart');
  const SAVE = 'button[onclick="saveEstimateAndPreview()"]';
  await p.evaluate(() => { document.getElementById('e-fb').innerHTML = ''; });
  await p.click(SAVE);
  const firstRefusal = await strip();
  has(firstRefusal, 'No rooms scored', 'the first press is refused, and the line says why');
  await p.waitForTimeout(3000);
  await p.click(SAVE);
  await p.waitForTimeout(2500);
  has(await strip(), 'No rooms scored', '⚠⚠ two and a half seconds after the second press, the refusal is still on screen');
  await p.waitForTimeout(2500);
  same(await strip(), '', 'and it clears on its own four seconds');

  // ── C ─────────────────────────────────────────────────────────────────
  console.log('## C. A notice painted by a redraw, on the Client Dashboard');
  await p.evaluate((x) => goToClientDashboard(x), id); await p.waitForTimeout(700);
  const c1 = await p.evaluate(() => { const t = _dashFbTarget('agr-fb'); showFB(t, 'ok', 'Agreement recorded as sent.');
    window.__oldStrip = document.getElementById('dash-fb'); return { target: t, text: document.getElementById('dash-fb').textContent }; });
  same(c1.target, 'dash-fb', 'a handler\'s message lands on the dashboard\'s own strip');
  same(c1.text, 'Agreement recorded as sent.', 'and is shown there');
  await p.waitForTimeout(1000);
  const c2 = await p.evaluate((x) => { dashNotice('ok', 'Signature recorded — signed by Tripp Butler.'); _dashRedraw(x);
    const s = document.getElementById('dash-fb'); return { replaced: s !== window.__oldStrip, text: s.textContent }; }, id);
  ok(c2.replaced, 'the redraw replaces the strip');
  same(c2.text, 'Signature recorded — signed by Tripp Butler.', 'and paints its notice into the new one');
  await p.waitForTimeout(4500);
  same(await strip('#dash-fb'), 'Signature recorded — signed by Tripp Butler.',
    '⚠⚠ after the older message\'s four seconds the redraw\'s notice is still there (the old clear looked the strip up again and wiped it)');

  // ── D ─────────────────────────────────────────────────────────────────
  console.log('## D. Start over, offline, nothing saved');
  await open(id);
  await four();
  same(await inScope(), 4, 'four rooms scored');
  same(await draft(), { jobId: id, rooms: 4 }, 'and this device holds its unsaved-draft copy of them');
  ok(!(await p.evaluate((x) => !!estimateStore[x], id)), 'nothing is saved for this client');
  await press('button[onclick="startEstimateOver()"]', true);
  has(dialogs.join(' | '), 'start again from the intake answers', 'Start over promises the intake answers');
  same(await inScope(), 0, '⚠⚠ and keeps the promise: the four discarded rooms do NOT come back');
  const dFb = await strip();
  lacks(dFb, 'restored an unsaved draft', 'nothing is restored as an unsaved draft');
  has(dFb, 'no estimate for "Sam Scratchley" is stored on this device', 'the line says nothing is stored here');
  same(await draft(), null, '⚠ the unsaved-draft copy is gone');

  // ── E ─────────────────────────────────────────────────────────────────
  console.log('## E. Start over, Cancel');
  await four();
  same(await draft(), { jobId: id, rooms: 4 }, 'four rooms again, and their copy');
  await press('button[onclick="startEstimateOver()"]', false);
  same(await inScope(), 4, 'Cancel keeps the rooms');
  same(await draft(), { jobId: id, rooms: 4 }, 'and the copy');

  // ── F ─────────────────────────────────────────────────────────────────
  console.log('## F. Reset, a reload, an offline open');
  await press('button[onclick="resetEstimate()"]', true);
  has(dialogs.join(' | '), 'blank estimate for Sam Scratchley', 'Reset asks, naming the client');
  same(await inScope(), 0, 'the screen is blank');
  same(await draft(), null, '⚠ and this device\'s copy of the build is gone with it');
  await p.reload(); await p.waitForTimeout(1500);
  await open(id);
  same(await inScope(), 0, '⚠⚠ reloaded and opened offline, the discarded rooms do NOT come back');
  lacks(await strip(), 'restored an unsaved draft', 'nothing is restored as an unsaved draft');

  // ── G ─────────────────────────────────────────────────────────────────
  console.log('## G. The safety net still works');
  await four();
  same(await draft(), { jobId: id, rooms: 4 }, 'four rooms scored and copied');
  await p.reload(); await p.waitForTimeout(1500);
  await open(id);
  same(await inScope(), 4, 'a reload with no button pressed, then an offline open: the unsaved draft comes back');
  has(await strip(), 'restored an unsaved draft', 'named as an unsaved draft');

  // ── H ─────────────────────────────────────────────────────────────────
  console.log('## H. Only this client\'s copy');
  const id2 = await addClient('Dana', 'Draftwell');
  ok(!!id2 && id2 !== id, 'a second client (' + id2 + ')');
  await open(id2);
  await four();
  same(await draft(), { jobId: id2, rooms: 4 }, 'the device\'s one draft slot now holds the second client\'s build');
  await open(id);
  const firstNow = await inScope();
  await press('button[onclick="resetEstimate()"]', true);
  same(await draft(), { jobId: id2, rooms: 4 }, 'a Reset on the first client (' + firstNow + ' rooms on screen) leaves the second client\'s draft where it is');

  // ── I ─────────────────────────────────────────────────────────────────
  for (const w of [1440, 390]) {
    await p.setViewportSize({ width: w, height: 900 });
    await p.waitForTimeout(200);
    const ov = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok(ov <= 0, 'Build Estimate fits at ' + w + 'px (overflow ' + ov + ')');
  }
  ok(errs.length === 0, 'no page errors (' + errs.join(' | ') + ')');

  await b.close();
  console.log('\nstep34: ' + pass + ' passed, ' + fail + ' failed');
})().catch(async e => {
  console.log('THREW ' + (e && e.stack || e));
  console.log('step34: ' + pass + ' passed, ' + (fail + 1) + ' failed');
  try { if (b) await b.close(); } catch (_) { /* already gone */ }
});
