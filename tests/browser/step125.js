// Step 125 — the private walkthrough note dictated on Build Estimate is saved with the estimate and is
// there when the estimate is opened again (2026-11-02; Anthony, off a real client: *"the microphone worked
// fine … when I saved it and went back to the estimate, they're gone … the private walkthrough note should
// stick in the client estimate so that when we go back … we can read the notes"*; and *"the private
// walkthrough notes field isn't very big … it filled up pretty quickly"*).
//
// Measured on the build before the fix: the microphone wrote the words into the box and into
// `_privateWalkNote`, but nothing recomputed the estimate (typing does, through the room grid's input
// listener; a script setting `.value` fires no input event), so `currentEstimate.privateNote` still held
// the note as it stood at the last recompute, and Save wrote that: empty. The room note's microphone had the
// same gap. A note typed and saved inside the 250 ms debounce was lost the same way.
//   A. Four rooms in scope, the note dictated through the real 🎤 (a fake recogniser answering), Save pressed
//      at once: the saved record carries the words.
//   B. Back on the dashboard, Build estimate again: the words are in the box, and in the Walkthrough view.
//   C. A long dictation: the box grows with it (every line visible, no scroll inside it), and again on reopen.
//   D. A room's note dictated through its 🎤 and saved at once is on the saved room.
//   E. A note typed and saved at once (inside the debounce) is saved.
//   F. Overflow at 1440 and 390, no page errors.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step125.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
(async () => {
  b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  p.setDefaultTimeout(8000);
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  p.on('dialog', async d => { await d.accept(); });
  // A recogniser that answers when the test says so. The page reads window.SpeechRecognition when 🎤 is
  // pressed, so it is installed before the page's script runs and the real button starts it.
  await p.addInitScript(() => {
    window._fakeRecs = [];
    window.SpeechRecognition = function () { window._fakeRecs.push(this); };
    window.SpeechRecognition.prototype.start = function () { this.started = true; };
    window.SpeechRecognition.prototype.stop = function () { this.started = false; if (this.onend) this.onend(); };
    window.SpeechRecognition.prototype.abort = window.SpeechRecognition.prototype.stop;
    // Say a final phrase into the newest recogniser, the way Chrome hands one back.
    window._say = function (text) {
      const r = window._fakeRecs[window._fakeRecs.length - 1];
      const res = [{ 0: { transcript: text }, isFinal: true, length: 1 }];
      r.onresult({ resultIndex: 0, results: res });
    };
  });
  await p.goto(APP); await p.waitForTimeout(1500);
  const future = (() => { const d = new Date(); d.setDate(d.getDate() + 30);
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10); })();

  async function make(last) {
    await p.evaluate(() => { const b = document.getElementById('btn-add-client'); if (b) b.click(); }); await p.waitForTimeout(300);
    const id = await p.evaluate(([wt, last]) => {
      const set = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; if (e.onchange) e.onchange(); } };
      const pick = (id) => { const e = document.getElementById(id); const x = e && Array.from(e.options).find(x => x.value); if (x) { e.value = x.value; if (e.onchange) e.onchange(); } };
      set('i-svc', 'downsizing_move'); toggleIntakeFields();
      set('i-fname', 'Pat'); set('i-lname', last); set('i-addr', '12 ' + last + ' Way'); set('i-city', 'Palm Beach'); set('i-zip', '33480');
      set('i-sqft', '3500'); set('i-phone', '(561) 555-0199'); set('i-email', 'c@example.com'); set('i-dest-sqft', '2000');
      set('i-home-value', '4000000');
      pick('i-ptype'); pick('i-src'); set('i-walkthrough', wt);
      const st = new Date(wt); st.setDate(st.getDate() + 7); while (st.getDay() === 0 || st.getDay() === 6) st.setDate(st.getDate() + 1);
      set('i-start', st.toISOString().slice(0, 10)); saveIntake(); return (jobs[0] || {}).id;
    }, [future, last]);
    await p.waitForTimeout(1500); return id;
  }
  // Build estimate, pressed on the client's own band where it is offered, else its handler.
  const open = async (id) => {
    const btn = p.locator('#client-dashboard-view button[onclick="dashGoEstimate(' + id + ')"]').first();
    if (await btn.isVisible().catch(() => false)) await btn.click();
    else await p.evaluate((id) => dashGoEstimate(id), id);
    await p.waitForTimeout(1200);
  };
  const save = async () => { await p.click('button[onclick="saveEstimateAndPreview()"]'); await p.waitForTimeout(2200); };
  const saved = (id) => p.evaluate((id) => { const r = estimateStore[id] && estimateStore[id].estimate;
    return r ? { note: r.privateNote || '', rooms: (r.rooms || []).length, r0: ((r.rooms || [])[0] || {}).note || '' } : null; }, id);
  const box = () => p.evaluate(() => { const n = document.getElementById('e-private-note');
    return n ? { v: n.value, ch: n.clientHeight, sh: n.scrollHeight, vis: n.checkVisibility() } : null; });

  const SAID = 'Called the daughter Tuesday. The son disagrees about the piano and the boat. Gate code changes Friday.';

  // ── A. dictated, then Save at once ─────────────────────────────────────
  console.log('## A. the note dictated through the real microphone, then Save at once');
  const idA = await make('Dictate');
  await open(idA);
  await p.evaluate(() => { for (let i = 0; i < 4; i++) document.getElementById('chk-r' + i).click(); calcAll(); });
  const startH = (await box()).ch;
  await p.click('#pnote-mic-btn');
  ok(await p.evaluate(() => window._fakeRecs.length > 0 && window._fakeRecs[window._fakeRecs.length - 1].started), 'the 🎤 starts the recogniser');
  await p.evaluate((t) => window._say(t), SAID);
  await p.click('#pnote-mic-btn');   // stop
  has((await box()).v, 'the piano and the boat', 'the words are in the box');
  await save();
  const sA = await saved(idA);
  ok(sA && sA.rooms === 4, 'the estimate saved, four rooms (' + JSON.stringify(sA) + ')');
  has(sA && sA.note, 'the piano and the boat', '⚠ the saved estimate carries the dictated note');

  // ── B. back to the estimate ────────────────────────────────────────────
  console.log('## B. Build estimate again: the note is there');
  ok(await p.locator('#client-dashboard-view').isVisible().catch(() => false), 'Save landed on the client\'s dashboard');
  await open(idA);
  has((await box()).v, 'the piano and the boat', '⚠ reopened, the box reads the note');
  const walk = await p.evaluate((id) => { const j = jobs.find(x => x.id === id); const d = document.createElement('div');
    d.innerHTML = walkthroughHtml(j, estimateStore[id].estimate); return d.textContent; }, idA);
  has(walk, 'the piano and the boat', 'and the Walkthrough view reads it');

  // ── C. a long note grows the box ───────────────────────────────────────
  console.log('## C. a long dictation: the box grows with it');
  await p.click('#pnote-mic-btn');
  for (let i = 0; i < 14; i++) await p.evaluate((t) => window._say(t), 'Item ' + (i + 1) + ' from the call: she wants the dining set kept for the grandson and the rest offered to the auction house.');
  await p.click('#pnote-mic-btn');
  const bc = await box();
  ok(bc.ch > startH, 'the box is taller than it started (' + startH + ' → ' + bc.ch + ' px)');
  ok(bc.sh <= bc.ch + 2, '⚠ every line shows: nothing scrolls inside the box (scroll ' + bc.sh + ', shown ' + bc.ch + ')');
  await save();
  has((await saved(idA)).note, 'Item 14 from the call', 'the long note saved whole');
  await open(idA);
  const bc2 = await box();
  has(bc2.v, 'Item 14 from the call', 'reopened, the long note reads whole');
  ok(bc2.vis && bc2.sh <= bc2.ch + 2, '⚠ and the reopened box shows all of it (scroll ' + bc2.sh + ', shown ' + bc2.ch + ')');

  // ── D. a room's note dictated, then Save at once ───────────────────────
  console.log('## D. a room\'s note through its own microphone');
  await p.evaluate(() => { const b = document.getElementById('room-media-btns-r0'); if (b) b.style.display = 'flex'; });
  await p.click('#mic-btn-r0');
  await p.evaluate(() => window._say('Grand piano by the stairs, needs a specialist mover.'));
  await p.click('#mic-btn-r0');
  await save();
  has((await saved(idA)).r0, 'Grand piano by the stairs', '⚠ the dictated room note is on the saved room');

  // ── E. typed and saved inside the debounce ─────────────────────────────
  console.log('## E. a note typed and saved at once');
  const idE = await make('Typed');
  await open(idE);
  const be = await box();
  ok(be.v === '' && be.ch === startH, 'the next client\'s box is empty and back to its first size (' + be.ch + ' of ' + startH + ' px), not the last note\'s');
  await p.evaluate(() => { for (let i = 0; i < 4; i++) document.getElementById('chk-r' + i).click(); calcAll(); });
  await p.click('#e-private-note');
  await p.keyboard.type('Hoarding in the garage.', { delay: 5 });
  await p.click('button[onclick="saveEstimateAndPreview()"]');   // no wait: inside the 250 ms debounce
  await p.waitForTimeout(2200);
  has((await saved(idE)).note, 'Hoarding in the garage', '⚠ the typed note is saved though Save came inside the debounce');

  // ── F. overflow ────────────────────────────────────────────────────────
  console.log('## F. overflow and errors');
  await open(idA);
  for (const w of [1440, 390]) {
    await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(300);
    const ov = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok(ov <= 0, 'no horizontal overflow at ' + w + ' px (' + ov + ')');
    const bw = await box();
    ok(bw.vis && bw.sh <= bw.ch + 2, 'the note box shows the whole note at ' + w + ' px');
  }
  ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));

  await b.close();
  console.log(pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch(async e => { console.log('THREW: ' + (e && e.stack || e)); try { if (b) await b.close(); } catch (x) {} console.log(pass + ' passed, ' + (fail + 1) + ' failed'); process.exit(1); });
