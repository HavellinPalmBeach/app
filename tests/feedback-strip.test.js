'use strict';
// The feedback strip — the line under a button that says what just happened, or why nothing did.
//
// ⚠⚠ A MESSAGE WAS WIPED BY THE TIMER OF THE ONE BEFORE IT (2026-09-29). showFB wrote the message and
// armed `setTimeout(… innerHTML = '' …, 4000)` on whatever the strip held four seconds later. Every
// message armed one and none was ever cancelled, so a message written within four seconds of another
// was cleared by the OLDER one's timer. Measured on the real page: a message written three seconds
// after another was gone a second and a half later. It was recorded twice as "a per-element timer is
// the fix", and that would not have been enough: the drilldown's notices are painted by a REDRAW, not
// by showFB, so an older showFB's timer would still have wiped them. The rule now is that a message's
// timer clears THAT message and nothing else.
//
// The real showFB never ran in a test before this: every suite stubs it. A domStub cannot drive it —
// its innerHTML is a plain string with no nodes behind it — so the strip here is a small fake that
// does the four things a real element does that showFB depends on: an innerHTML write replaces every
// child and DETACHES the old ones, childNodes lists what is there, removeChild detaches one, and a
// detached node's parentNode is null. The clock is fake too, so four seconds are counted, not waited.

const { sandbox } = require('./harness');

function makeDoc() {
  const byId = {};
  function mkStrip(id) {
    const strip = { id, childNodes: [] };
    Object.defineProperty(strip, 'innerHTML', {
      get() { return strip.childNodes.map((n) => n.html).join(''); },
      set(v) {
        strip.childNodes.forEach((n) => { n.parentNode = null; });
        strip.childNodes = [];
        if (v) strip.childNodes.push({ html: String(v), parentNode: strip });
      },
    });
    Object.defineProperty(strip, 'textContent', { get() { return strip.innerHTML.replace(/<[^>]*>/g, ''); } });
    strip.removeChild = (n) => {
      const i = strip.childNodes.indexOf(n);
      if (i < 0) throw new Error('removeChild: not a child of #' + id);   // the real DOM throws here too
      strip.childNodes.splice(i, 1); n.parentNode = null; return n;
    };
    return strip;
  }
  return {
    getElementById(id) { return Object.prototype.hasOwnProperty.call(byId, id) ? byId[id] : null; },
    add(id) { byId[id] = mkStrip(id); return byId[id]; },
    // A redraw: renderClientDashboard rewrites the drilldown, so the strip is a NEW element with the same
    // id. The old one is detached from the page but keeps its own children, exactly as in a browser.
    redraw(id, html) { const old = byId[id]; const now = mkStrip(id); if (html) now.innerHTML = html; byId[id] = now; return { old, now }; },
    drop(id) { delete byId[id]; },
  };
}

// clearTimeout is real here, not a no-op, so a different design (a per-strip timer that cancels the last
// one) is measured on what it does rather than failing on a ReferenceError.
function makeClock() {
  let now = 0, seq = 0;
  let q = [];
  return {
    setTimeout(fn, ms) { const id = ++seq; q.push({ id, at: now + (ms || 0), fn }); q.sort((a, b) => a.at - b.at || a.id - b.id); return id; },
    clearTimeout(id) { q = q.filter((t) => t.id !== id); },
    advance(ms) {
      const until = now + ms;
      while (q.length && q[0].at <= until) { const t = q.shift(); now = t.at; t.fn(); }
      now = until;
    },
    pending() { return q.length; },
  };
}

function rig(ids = ['e-fb', 'dash-fb']) {
  const doc = makeDoc();
  ids.forEach((id) => doc.add(id));
  const clock = makeClock();
  const ctx = sandbox({ fns: ['showFB'], stubs: { document: doc, setTimeout: clock.setTimeout, clearTimeout: clock.clearTimeout } });
  const text = (id) => { const s = doc.getElementById(id); return s ? s.textContent : '(gone)'; };
  // Read defensively: a timer that throws must fail the check that follows, not stop the file.
  const advance = (ms) => { try { clock.advance(ms); return null; } catch (e) { return e; } };
  return { ctx, doc, clock, text, advance };
}

module.exports = function ({ group, ok, eq }) {
  group('one message is written, then clears itself at four seconds — not before');
  {
    const r = rig();
    r.ctx.showFB('e-fb', 'ok', 'Saved.');
    eq(r.doc.getElementById('e-fb').innerHTML, '<div class="alert a-ok">Saved.</div>', 'it is written as one alert in the class for its kind');
    eq(r.clock.pending(), 1, 'and arms one clear');
    r.advance(3999);
    eq(r.text('e-fb'), 'Saved.', 'still there at 3.999 seconds');
    r.advance(1);
    eq(r.text('e-fb'), '', 'gone at four');
    eq(r.doc.getElementById('e-fb').childNodes.length, 0, 'and the strip is truly empty, so the :empty rule hides it again');
  }

  group('⚠⚠ A MESSAGE WRITTEN WITHIN FOUR SECONDS OF ANOTHER LIVES ITS OWN FOUR SECONDS');
  {
    const r = rig();
    r.ctx.showFB('e-fb', 'ok', 'first message');
    r.advance(3000);
    r.ctx.showFB('e-fb', 'warn', 'second message');
    eq(r.text('e-fb'), 'second message', 'the second replaces the first');
    const thrown = r.advance(1500);
    ok(!thrown, 'the first message\'s timer fires without throwing' + (thrown ? ' — threw ' + thrown.message : ''));
    eq(r.text('e-fb'), 'second message', '⚠ at 4.5 seconds the FIRST message\'s timer has fired, and the second message is still there (the old clear wiped it here)');
    r.advance(2499);
    eq(r.text('e-fb'), 'second message', 'it is still there a moment before its own four seconds are up');
    r.advance(1);
    eq(r.text('e-fb'), '', 'and goes at exactly four seconds after it was written');
  }

  group('Save pressed twice: the same refusal, three seconds apart');
  {
    // The same text twice is the case a person actually meets — the second press of a refused Save.
    const r = rig();
    const msg = 'No rooms scored — check at least one room and set volume/complexity before saving.';
    r.ctx.showFB('e-fb', 'warn', msg);
    r.advance(3000);
    r.ctx.showFB('e-fb', 'warn', msg);
    r.advance(1500);
    eq(r.text('e-fb'), msg, '⚠ the second refusal is still on screen a second and a half after it was written');
    r.advance(2500);
    eq(r.text('e-fb'), '', 'and clears on its own four seconds');
  }

  group('⚠⚠ A NOTICE PAINTED BY A REDRAW IS NOT WIPED BY AN OLDER MESSAGE\'S TIMER');
  {
    // This is why a per-strip timer would not have been enough: renderClientDashboard rewrites the
    // drilldown and paints _dashNotice into a NEW #dash-fb, and that never comes through showFB.
    const r = rig();
    r.ctx.showFB('dash-fb', 'ok', 'Agreement recorded as sent. Record the signature when it comes back.');
    r.advance(1000);
    const { old, now } = r.doc.redraw('dash-fb', '<div class="alert a-ok">Signature recorded — signed by Tripp Butler.</div>');
    r.advance(3500);
    eq(r.text('dash-fb'), 'Signature recorded — signed by Tripp Butler.', '⚠ the redraw\'s notice is still there after the older message\'s four seconds');
    eq(now.childNodes.length, 1, 'the new strip was not touched at all');
    eq(old.childNodes.length, 0, 'the older message was taken off the strip it was written to — which the redraw had already replaced');
  }

  group('anything written into the strip since — a progress line — is left alone');
  {
    // _dashSendState writes "Building the PDF…" straight into the strip while a send is in flight.
    const r = rig();
    r.ctx.showFB('dash-fb', 'warn', 'Record the signed agreement before the deposit.');
    r.advance(1000);
    r.doc.getElementById('dash-fb').innerHTML = '<div class="alert a-info">Building the PDF…</div>';
    r.advance(3500);
    eq(r.text('dash-fb'), 'Building the PDF…', 'the progress line outlives the older message\'s timer');
  }

  group('two strips are two clocks');
  {
    const r = rig();
    r.ctx.showFB('e-fb', 'ok', 'on the estimate');
    r.advance(3000);
    r.ctx.showFB('dash-fb', 'ok', 'on the dashboard');
    r.advance(1500);
    eq([r.text('e-fb'), r.text('dash-fb')], ['', 'on the dashboard'], 'the estimate\'s message goes at its four seconds and the dashboard\'s stays');
  }

  group('a strip that has gone, or been emptied, by the time the timer fires');
  {
    const r = rig();
    r.ctx.showFB('e-fb', 'ok', 'about to be dropped');
    r.doc.drop('e-fb');
    let thrown = r.advance(4000);
    ok(!thrown, 'the strip taken out of the page: the timer does not throw' + (thrown ? ' — threw ' + thrown.message : ''));
    const r2 = rig();
    r2.ctx.showFB('e-fb', 'ok', 'about to be emptied');
    r2.doc.getElementById('e-fb').innerHTML = '';
    thrown = r2.advance(4000);
    ok(!thrown, 'the strip emptied by another hand: the timer does not throw' + (thrown ? ' — threw ' + thrown.message : ''));
    eq(r2.text('e-fb'), '', 'and it stays empty');
  }

  group('a missing strip is a no-op, and the kinds map to their classes');
  {
    const r = rig();
    let thrown = null;
    try { r.ctx.showFB('no-such-strip', 'err', 'nobody sees this'); } catch (e) { thrown = e; }
    ok(!thrown, 'showFB on a strip that is not on the page does not throw');
    eq(r.clock.pending(), 0, 'and arms nothing');
    const want = { ok: 'a-ok', warn: 'a-warn', err: 'a-err', info: 'a-info', nonsense: 'a-warn' };
    Object.keys(want).forEach((k) => {
      r.ctx.showFB('e-fb', k, 'x');
      eq(r.doc.getElementById('e-fb').innerHTML, '<div class="alert ' + want[k] + '">x</div>', `'${k}' renders as .${want[k]}`);
    });
  }
};
