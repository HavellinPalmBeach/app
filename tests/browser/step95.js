// Step 95 — the camera's voice note is a tap (2026-10-21; Anthony and Ashley, the first photography run: the voice button
// "kind of times out ... it's not staying on and you can't record anything"). On a touch phone, through the real controls:
//
//   A. the Items camera on a 390 px touch screen: shoot, TAP 🎤 Talk, and it stays on through the repaint (it was hold to
//      talk, and the press repainted the strip and cancelled itself)
//   B. a pause: the browser ends its session and a new one takes over; Stop saves both halves onto the shot
//   C. the next photograph saves a note still being spoken onto the shot it was said about
//   D. a refused microphone is said on the strip; overflow at 390; no page errors
//
// The browser's recogniser is a fake the step drives (`window.__sr`): headless Chromium has no speech service.
//
//   NODE_PATH=<dir>/node_modules node tests/browser/step95.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const LIVE = 9501;
const T0 = Date.parse('2026-10-05T15:00:00Z');

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
      args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    await ctx.grantPermissions(['camera']).catch(() => {});
    await ctx.addInitScript(() => {
      window.__sr = [];
      function FakeSR() { this.started = 0; this.stopped = 0; window.__sr.push(this); }
      FakeSR.prototype.start = function () { this.started++; };
      FakeSR.prototype.stop = function () { this.stopped++; var me = this; setTimeout(function () { me.onend && me.onend(); }, 50); };
      FakeSR.prototype.abort = function () { var me = this; setTimeout(function () { me.onend && me.onend(); }, 0); };
      window.__say = function (text, fin) { var s = window.__sr[window.__sr.length - 1]; var r = [{ transcript: text }]; r.isFinal = !!fin; s.onresult({ resultIndex: 0, results: [r] }); };
      window.__end = function () { var s = window.__sr[window.__sr.length - 1]; s.onend(); };
      window.__fail = function (err) { var s = window.__sr[window.__sr.length - 1]; s.onerror({ error: err }); s.onend(); };
      window.webkitSpeechRecognition = FakeSR; window.SpeechRecognition = FakeSR;
    });
    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    p.on('dialog', async (d) => { await d.accept(); });
    await p.goto(APP); await p.waitForTimeout(1600);

    const section = async (name, body) => {
      console.log('\n## ' + name);
      try { await body(); } catch (e) { fail++; console.log('  ✗ ' + name + ' threw: ' + String(e && e.message || e).split('\n')[0]); }
    };
    const tap = async (sel, what) => {
      const loc = p.locator(sel).first();
      const v = await loc.isVisible().catch(() => false);
      ok(v, (what || sel) + ' — on screen');
      if (v) { await loc.tap({ timeout: 5000 }).catch((e) => ok(false, (what || sel) + ' — ' + e.message.split('\n')[0])); await p.waitForTimeout(400); }
      return v;
    };
    const txt = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }, sel);
    const notes = () => p.evaluate((id) => (_photoRefs[id] || []).filter((r) => r.label === 'inventory').map((r) => r.fieldNote || ''), LIVE);
    const sessions = () => p.evaluate(() => window.__sr.length);

    await p.evaluate(([LIVE, T0]) => {
      jobs.unshift({ id: LIVE, hvlId: 'HVL-2610-V951', name: 'Vera Lane', svc: 'home_cleanout', addr: '9 Talk St', email: 'vera@example.com', city: 'Palm Beach',
        zip: '33480', won: true, wonAt: '2026-09-25', approved: true, status: 'active', activatedOn: '2026-10-05', tc: 'Ashley Jerome', created: '2026-09-20',
        payments: [{ uid: 'v1', stage: 'deposit', amount: 5000, receivedOn: '2026-10-01', method: 'wire', clearedOn: '2026-10-01' }] });
      estimateStore[LIVE] = { approved: true, submitted: true, savedAt: T0, estimate: { jobId: LIVE, svc: 'home_cleanout', tcRate: 150, psRate: 100, vendors: [],
        prepItems: [], pkgCost: 0, rooms: [{ idx: 0, name: 'Den', st: 'in', vol: 3, cplx: 3 }] } };
      _photoRefs[LIVE] = [];
      saveJobs();
      // Uploads go nowhere in this step; the shot's line is what is measured.
      window._doPhotoUpload = function () {};
      openFieldCamera(LIVE, 0, 'inventory');
    }, [LIVE, T0]);
    await p.waitForFunction(() => _fieldCam.ready, null, { timeout: 8000 }).catch(() => {});

    await section('A. tap Talk and it stays on', async () => {
      ok(await p.evaluate(() => _fieldCam.ready), 'the in-page camera is live');
      await tap('#field-cam .fc-shutter:not(.fc-closeup)', 'the shutter');
      eq((await notes()).length, 1, 'one item shot');
      has(await txt('#field-cam .fc-talk'), 'Talk', 'the button reads Talk');
      await tap('#field-cam .fc-talk', '🎤 Talk');
      await p.waitForTimeout(600);
      eq(await p.evaluate(() => _fieldCam.talking), true, '⚠⚠ still on after the finger is lifted and the strip repainted');
      has(await txt('#field-cam .fc-talk'), 'Stop', 'the button reads Stop');
      has(await txt('#fc-talk-status'), 'Listening', 'the strip says it is listening');
      eq(await sessions(), 1, 'one recogniser started');
    });

    await section('B. a pause does not end it; Stop saves both halves', async () => {
      await p.evaluate(() => window.__say('signed on the base', true));
      has(await txt('#fc-talk-status'), 'signed on the base', 'heard so far, on the strip');
      await p.evaluate(() => window.__fail('no-speech'));
      await p.waitForTimeout(200);
      eq(await sessions(), 2, '⚠ the browser ended its session, and a new one took over');
      eq(await p.evaluate(() => _fieldCam.talking), true, 'still talking');
      await p.evaluate(() => window.__say('promised to Karen', false));
      await tap('#field-cam .fc-talk', 'Stop & save');
      await p.waitForTimeout(400);
      eq(await notes(), ['signed on the base promised to Karen'], '⚠⚠ the whole note is on the shot');
      has(await txt('#field-cam .fc-talk'), 'Talk', 'and the button is back to Talk');
      has(await txt('#field-cam .fc-last'), 'signed on the base promised to Karen', 'the note shows under the last shot');
    });

    await section('C. the next photograph saves a note still being spoken onto its own shot', async () => {
      await tap('#field-cam .fc-shutter:not(.fc-closeup)', 'the shutter (item two)');
      await tap('#field-cam .fc-talk', '🎤 Talk');
      await p.evaluate(() => window.__say('chipped leg', true));
      await tap('#field-cam .fc-shutter:not(.fc-closeup)', 'the shutter (item three), without Stop');
      await p.waitForTimeout(400);
      const n = await notes();
      eq(n.length, 3, 'three items');
      eq(n[1], 'chipped leg', '⚠ the note is on the shot it was said about');
      eq(n[2], '', 'and not the new one');
    });

    await section('D. a refused microphone is said on the strip; overflow; errors', async () => {
      await tap('#field-cam .fc-talk', '🎤 Talk');
      await p.evaluate(() => window.__fail('not-allowed'));
      await p.waitForTimeout(300);
      has(await txt('#field-cam .fc-talk-msg'), 'not allowed', 'the refusal is on the strip');
      has(await txt('#field-cam .fc-talk-msg'), 'keyboard', 'with the way round it');
      const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      eq(over, 0, 'no horizontal overflow at 390');
      await tap('#field-cam .fc-done', 'Done');
      eq(errs, [], 'no page errors');
    });

    await b.close();
  } catch (e) {
    fail++; console.log('  ✗ threw: ' + (e && e.message || e));
    if (b) await b.close().catch(() => {});
  }
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
