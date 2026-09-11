'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// "2 unsaved changes — retrying…" that never clears. Reported 2026-09-11 from a job
// site, on a photograph of the chip: saveAllJobPlans and saveAllJobs, both held, both
// carrying the Apps Script login/HTML interstitial as their reason.
//
// ⚠⚠ THE CLASSIFICATION WAS RIGHT AND THE SENDING WAS WRONG. That interstitial really is
// retryable, so nothing above it was at fault — but flushPendingWrites Promise.all'd the
// whole queue, firing every held write SIMULTANEOUSLY. Server-side each store write takes
// LockService.getScriptLock(), and that lock is GLOBAL to the deployment, so two parallel
// whole-store writes make one wait on a lock we are holding ourselves. That is exactly
// the self-inflicted contention the OUTBOX COALESCER was built to remove — reintroduced
// on the one path that only ever runs when writes are already failing, which is why the
// queue could feed itself indefinitely.
//
// So the load-bearing check here is not a wording assertion. It is: how many requests
// does the retry have in flight at once? The outbox answers 1; this answered one per
// queued write.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { sandbox } = require('./harness');

// A synchronous promise we can hold OPEN. The runner's assertions are flat and
// synchronous, so a real Promise resolves on a later microtask and every check would run
// before the code under test did — green, proving nothing. But an immediately-resolving
// thenable is no good either HERE: it would run each response inline and no two requests
// could ever overlap, so the very thing being measured would be impossible to observe in
// either build. This one stays pending until the test answers it.
function mkPromise() {
  let state = 'pending';
  let value;
  const queue = [];
  function settle(st, v) {
    if (state !== 'pending') return;
    state = st; value = v;
    queue.splice(0).forEach((f) => f());
  }
  const self = {
    then(onOk, onErr) {
      const nxt = mkPromise();
      const run = () => {
        try {
          if (state === 'ok') {
            const out = onOk ? onOk(value) : value;
            if (out && typeof out.then === 'function') out.then(nxt.resolve, nxt.reject);
            else nxt.resolve(out);
          } else if (onErr) {
            const out = onErr(value);
            if (out && typeof out.then === 'function') out.then(nxt.resolve, nxt.reject);
            else nxt.resolve(out);
          } else nxt.reject(value);
        } catch (e) { nxt.reject(e); }
      };
      if (state === 'pending') queue.push(run); else run();
      return nxt.promise;
    },
    catch(onErr) { return self.then(null, onErr); },
  };
  return { promise: self, resolve: (v) => settle('ok', v), reject: (e) => settle('err', e) };
}

const HTML_ERR = 'the web app returned a login/HTML page, not data';

// Build a sandbox holding the REAL queue, with a backend whose requests we open and close
// by hand so concurrency is observable.
function rig(opts) {
  opts = opts || {};
  const open = [];          // requests started and not yet answered
  const order = [];         // a readable trace of start/end
  const timers = [];        // every setTimeout the queue arms, with its delay
  const badges = [];
  let peak = 0;

  const ctx = sandbox({
    fns: ['_backendErrorKind', '_writeKey', '_pendingCount', '_pendingWriteLabel',
          '_pendingChipCopy', '_enqueueWrite', '_retrySoon', '_scheduleRetry',
          'flushPendingWrites', 'retryPendingWrites', '_flushOutbox', 'queuedPostSync'],
    vars: ['_pendingWrites', '_retryTimer', '_retryStep', '_flushing', '_retryDelays',
           'SYNC_STUCK_TRIES', '_outbox', '_outboxTimer', '_outboxSending', '_OUTBOX_WINDOW'],
    stubs: {
      SHEETS_SYNC_URL: 'https://script.google.com/macros/s/AAA/exec',
      showSyncBadge(m) { badges.push(String(m)); },
      updatePendingIndicator() {},
      _applyDroppedJobs(ids) { ctx.__dropped = ids; },
      setTimeout(fn, ms) { timers.push({ fn, ms }); return timers.length; },
      clearTimeout() {},
      postSyncTo(target, body) {
        const d = mkPromise();
        open.push({ d, type: (body && body.type) || '?' });
        peak = Math.max(peak, open.length);
        order.push('start ' + ((body && body.type) || '?'));
        return d.promise;
      },
    },
  });

  return {
    ctx, order, badges, timers,
    peak: () => peak,
    openCount: () => open.length,
    // Answer every request that is currently open, oldest first. A sequential sender
    // starts its NEXT request inside one of these resolutions, so the loop keeps going;
    // that is the behaviour, not a trick.
    settle(res) {
      let guard = 0;
      while (open.length) {
        if (++guard > 50) throw new Error('runaway: the queue never stopped sending');
        const r = open.shift();
        order.push('end   ' + r.type);
        r.d.resolve(res);
      }
    },
    queue(types, err) {
      types.forEach((t) => ctx._enqueueWrite('main', { type: t, payload: {} }, null,
        'Sync failed', err === undefined ? HTML_ERR : err, null, true));
    },
  };
}

module.exports = function ({ group, ok, eq, has, lacks }) {

  const src = fs.readFileSync(path.join(__dirname, '..', 'havellin.html'), 'utf8');
  const fnBody = (name) => {
    const at = src.indexOf('function ' + name + '(');
    return src.slice(at, src.indexOf('\n}\n', at));
  };

  group('⚠⚠ the retry sends ONE write at a time, like the outbox');
  {
    // THE DEFECT, measured rather than argued. Three queued writes, none answered yet:
    // how many did the retry put on the wire?
    const r = rig();
    r.queue(['saveAllJobs', 'saveAllJobPlans', 'saveAllEstimates']);
    r.ctx.flushPendingWrites();

    eq(r.openCount(), 1, 'only the first write is on the wire');
    eq(r.peak(), 1, 'and the sweep never has two requests in flight at once');

    // Answering the first is what starts the second, and so on to the end.
    r.settle({ ok: true });
    eq(r.peak(), 1, 'still one at a time all the way through the queue');
    eq(r.ctx._pendingCount(), 0, 'and every write lands');
    eq(r.order.join(' | '),
       'start saveAllJobs | end   saveAllJobs | start saveAllJobPlans | end   saveAllJobPlans '
       + '| start saveAllEstimates | end   saveAllEstimates',
       'strictly one after another, in queue order');
    ok(r.badges.some((b) => /All changes saved/.test(b)), 'the queue reports itself drained');

    // The same shape Anthony saw: two whole-store writes, the server answering with the
    // login/HTML page every time.
    const s = rig();
    s.queue(['saveAllJobPlans', 'saveAllJobs']);
    s.ctx.flushPendingWrites();
    eq(s.openCount(), 1, 'the reported pair go out one at a time too');
    s.settle({ ok: false, error: HTML_ERR });
    eq(s.peak(), 1, 'a failing sweep does not fan out either — that is what fed the loop');
    eq(s.ctx._pendingCount(), 2, 'both stay queued; nothing is lost');

    // The tripwire for the revert: Promise.all over the whole queue is the defect itself.
    lacks(fnBody('flushPendingWrites'), 'Promise.all',
          'the sweep is a sequential chain, not a fan-out');
    has(fnBody('flushPendingWrites'), '.then(next, next);',
        'each attempt hands off to the next one, the way _flushOutbox does');
  }

  group('⚠ the two senders never overlap each other');
  {
    // They post to the SAME deployment and take the SAME global lock, so serialising
    // inside each one is only half the rule.
    const r = rig();
    r.queue(['saveAllJobs']);
    // The backoff timer nulls itself before calling, so this is the state a real retry
    // arrives in — otherwise _retrySoon's one-timer guard makes the test unfalsifiable.
    r.ctx._retryTimer = null; r.timers.length = 0;
    r.ctx._outboxSending = true;
    r.ctx.flushPendingWrites();
    eq(r.openCount(), 0, 'the retry stands down while the outbox is mid-batch');
    eq(r.ctx._flushing, false, 'and does not claim the flush lock on its way out');
    ok(r.timers.some((t) => t.ms === r.ctx._OUTBOX_WINDOW),
       'it re-checks within a batch window rather than waiting out the backoff');

    // Once the batch is done the same call goes through.
    r.ctx._outboxSending = false;
    r.ctx.flushPendingWrites();
    eq(r.openCount(), 1, 'and sends as soon as the outbox is clear');

    // The other direction.
    const o = rig();
    o.ctx.queuedPostSync({ type: 'saveAllJobs', payload: [] }, 'ok', 'fail');
    o.ctx._flushing = true;
    o.ctx._flushOutbox();
    eq(o.openCount(), 0, 'the outbox stands down while a retry sweep is running');
    o.ctx._flushing = false;
    o.ctx._flushOutbox();
    eq(o.openCount(), 1, 'and goes out once the sweep is over');
    has(fnBody('_flushOutbox'), '_outboxSending || _flushing',
        'the guard names both senders');
  }

  group('a sweep still does everything it did before');
  {
    const r = rig();
    let landed = null;
    r.ctx._enqueueWrite('main', { type: 'saveAllJobs', payload: [] }, null, 'Sync failed',
      'Failed to fetch', function (res) { landed = res; }, true);
    r.ctx._retryStep = 3;
    r.ctx.flushPendingWrites();
    r.settle({ ok: true, dropped: ['77'] });
    eq(r.ctx._pendingCount(), 0, 'the landed write leaves the queue');
    ok(landed && landed.ok, 'onLanded fires with the response');
    eq(JSON.stringify(r.ctx.__dropped), '["77"]', 'and jobs the sheet refused are applied');
    eq(r.ctx._retryStep, 0, 'a drained queue resets the backoff');

    // A write that lands while the sweep is walking the keys must not throw.
    const g = rig();
    g.queue(['saveAllJobs', 'saveAllJobPlans']);
    g.ctx.flushPendingWrites();
    delete g.ctx._pendingWrites[Object.keys(g.ctx._pendingWrites)[1]];
    g.settle({ ok: true });
    eq(g.ctx._pendingCount(), 0, 'a key removed mid-sweep is skipped rather than thrown on');
    has(fnBody('flushPendingWrites'), 'if (!w) { next(); return; }',
        'the skip is deliberate, not incidental');

    // A blocked write still stops the backoff being rescheduled.
    const b = rig();
    b.queue(['saveMedia'], 'Unknown type: saveMedia');
    b.timers.length = 0;
    b.ctx.retryPendingWrites();
    b.settle({ ok: false, error: 'Unknown type: saveMedia' });
    eq(b.ctx._pendingCount(), 1, 'it stays queued for a later redeploy');
    eq(b.timers.length, 0, 'and nothing is scheduled — held, not hammered');
  }

  group('⚠ the failure count is per logical target and survives a newer snapshot');
  {
    const r = rig();
    r.queue(['saveAllJobs']);
    const key = Object.keys(r.ctx._pendingWrites)[0];
    eq(r.ctx._pendingWrites[key].tries, 1, 'the send that queued it counts as an attempt');

    r.ctx.flushPendingWrites();
    r.settle({ ok: false, error: HTML_ERR });
    eq(r.ctx._pendingWrites[key].tries, 2, 'a failed retry counts');

    r.ctx.flushPendingWrites();
    r.settle({ ok: false, error: HTML_ERR });   // the catch arm
    eq(r.ctx._pendingWrites[key].tries, 3, 'and so does the next one');

    // ⚠ The payload is replaced by a newer snapshot on every save. The COUNT is about the
    // target, not the payload — resetting it is how a stuck queue on a store somebody is
    // actively editing looks brand new forever.
    r.queue(['saveAllJobs']);
    eq(Object.keys(r.ctx._pendingWrites).length, 1, 'the newer snapshot supersedes, not adds');
    eq(r.ctx._pendingWrites[key].tries, 4, 'and the failure count carries over');

    // A different target keeps its own count.
    r.queue(['saveAllJobPlans']);
    const other = Object.keys(r.ctx._pendingWrites).filter((k) => k !== key)[0];
    eq(r.ctx._pendingWrites[other].tries, 1, 'a separate write starts its own count');
  }

  group('⚠⚠ the chip stops saying "retrying…" once the same failure keeps repeating');
  {
    const r = rig();
    r.queue(['saveAllJobPlans', 'saveAllJobs']);

    // Early on, "retrying" is the honest answer — a real interstitial clears in seconds.
    has(r.ctx._pendingChipCopy().head, 'retrying', 'the first failures read as transient');

    const key = Object.keys(r.ctx._pendingWrites)[0];
    r.ctx._pendingWrites[key].tries = r.ctx.SYNC_STUCK_TRIES - 1;
    has(r.ctx._pendingChipCopy().head, 'retrying', 'and still do one short of the threshold');

    r.ctx._pendingWrites[key].tries = r.ctx.SYNC_STUCK_TRIES;
    const stuck = r.ctx._pendingChipCopy();
    has(stuck.head, 'still failing after 6 attempts', 'then it says how many times');
    has(stuck.head, '2 changes not saved', 'and how much is outstanding');
    lacks(stuck.head, 'retrying…', 'the reassuring wording is gone');

    // The two things a person needs: what usually causes it, and what is at stake.
    has(stuck.note, '/exec', 'the note names the stale URL');
    has(stuck.note, 'Who has access', 'and the deployment access');
    has(stuck.note, 'THIS DEVICE', 'and says the work is only on this device');
    has(stuck.note, 'do not close or reload', 'with the one instruction that matters');

    // ⚠ IT MUST NOT STOP RETRYING. The app cannot tell a wrong URL from a slow network,
    // and giving up on the second would strand a queue that was about to drain.
    r.ctx._retryTimer = null; r.timers.length = 0;
    r.ctx.flushPendingWrites();
    r.settle({ ok: false, error: HTML_ERR });
    ok(r.timers.length > 0, 'a stuck queue is still scheduled to try again');
    ok(!!r.ctx._retryTimer, 'and the timer really is armed');
    eq(r.ctx._pendingWrites[key].blocked, false, 'and is not marked blocked');

    // A definitive verdict still outranks the count — those name a specific fix.
    const s = rig();
    s.queue(['saveMedia'], 'Unknown type: saveMedia');
    s.ctx._pendingWrites[Object.keys(s.ctx._pendingWrites)[0]].tries = 40;
    has(s.ctx._pendingChipCopy().head, 'Apps Script needs redeploying',
        'a stale deployment is still reported as a stale deployment');
    const c = rig();
    c.queue(['saveAllJobs'], 'ReferenceError: saveAllJobsToSheet is not defined');
    c.ctx._pendingWrites[Object.keys(c.ctx._pendingWrites)[0]].tries = 40;
    has(c.ctx._pendingChipCopy().head, 'the Apps Script returned an error',
        'and a crash is still reported as a crash');
  }

  group('⚠⚠ closing the tab over an unsent queue is challenged');
  {
    // The queue is memory-only and loadJobs OVERWRITES the local cache from the sheet on
    // the next load, so an unsent edit is destroyed by the reload rather than delayed.
    // Driven, not grepped: lift the real listener and call the real handler.
    const at = src.indexOf("window.addEventListener('beforeunload'");
    ok(at > 0, 'the guard is registered');
    const snippet = src.slice(at, src.indexOf('\n});\n', at) + 5);

    const handlers = {};
    const ctx = sandbox({
      fns: ['_pendingCount'],
      vars: ['_pendingWrites'],
      stubs: { window: { addEventListener(ev, fn) { handlers[ev] = fn; } } },
    });
    vm.runInContext(snippet, ctx, { filename: 'havellin.html (beforeunload)' });
    ok(typeof handlers.beforeunload === 'function', 'on beforeunload');

    const mkEvent = () => ({ prevented: false, returnValue: undefined,
                             preventDefault() { this.prevented = true; } });

    // Nothing outstanding: the app must NOT interrupt. A prompt on every close is trained
    // past within a day, on an app people close all day.
    const quiet = mkEvent();
    handlers.beforeunload(quiet);
    eq(quiet.prevented, false, 'a drained queue closes without a word');
    eq(quiet.returnValue, undefined, 'and sets no returnValue');

    // Something outstanding: challenge it.
    ctx._pendingWrites = { 'main/saveAllJobs': { target: 'main', body: {} } };
    const loaded = mkEvent();
    const ret = handlers.beforeunload(loaded);
    eq(loaded.prevented, true, 'an unsent write stops the tab closing silently');
    eq(loaded.returnValue, '', 'with the returnValue Chrome and Safari require');
    eq(ret, '', 'and the legacy return value older engines read');

    // ⚠ NOT persisted to localStorage instead — whole-store snapshots against a ~5MB
    // origin quota shared with the inventory manifest, which is the one write that must
    // never fail. A test, so nobody "improves" it into a quota problem.
    const q = src.slice(src.indexOf('function _enqueueWrite('), src.indexOf('function queuedDirectoryWrite('));
    lacks(q, 'localStorage', 'the queue itself never touches localStorage');
  }
};
