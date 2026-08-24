'use strict';
// A stuck write that never resolves, reported 2026-08-24 right after a redeploy:
// "green check in the lower right, but a red flag on the left saying 1 unsaved change
// - retrying. it never resolves and the items have not moved on other devices."
//
// Two writes fire on an inventory change — saveInventory (the Drive workbook) and
// saveMedia (the durable manifest). The workbook one succeeded, hence the green check.
// saveMedia hit a backend that did not know the action, which answers with a perfectly
// well-formed { ok:false, error:'Unknown type: saveMedia' }. That is a PERMANENT error,
// and the queue retried it with backoff forever while the chip said "retrying…" and the
// actual reason flashed past in a four-second toast.

const fs = require('fs');
const path = require('path');
const { sandbox } = require('./harness');

module.exports = function ({ group, ok, eq, has, lacks }) {

  group('stale-backend errors are recognised');
  {
    const ctx = sandbox({ fns: ['_isBackendStaleError'] });
    const f = ctx._isBackendStaleError;

    ok(f('Unknown type: saveMedia'), 'an unknown POST type is a stale backend');
    ok(f('Unknown action'), 'so is an unknown GET action');
    ok(f('ReferenceError: saveMediaStore is not defined'),
       'so is a handler the deployed script does not have — a half-applied paste');
    ok(f('TypeError: getMediaForJob is not a function'), 'and the same shape via TypeError');

    // Transient failures must NOT be classified as permanent, or a flaky network would
    // stop retrying and the write would sit there until someone noticed the chip.
    ok(!f('Failed to fetch'), 'a network drop is transient');
    ok(!f('the web app returned a login/HTML page, not data'),
       'the Apps Script interstitial is transient — it works on the next attempt');
    ok(!f('Exceeds the maximum number of characters allowed in a cell'),
       'a cell-size failure is a real bug to fix, not a stale deployment');
    ok(!f(''), 'no error text is not a stale backend');
    ok(!f(null), 'and null does not throw');
  }

  group('a blocked write is held, not hammered');
  {
    const src = fs.readFileSync(path.join(__dirname, '..', 'havellin.html'), 'utf8');
    const enq = src.slice(src.indexOf('function _enqueueWrite('));
    const body = enq.slice(0, enq.indexOf('\n}\n'));

    has(body, 'lastError: errText', 'the reason is stored on the write, not just toasted');
    has(body, 'blocked: stale', 'and the write is marked blocked');
    has(body, 'if (!stale) _scheduleRetry();',
        'a permanent error does NOT schedule another attempt');
    // It must still be queued — the work is not lost, it is waiting for a redeploy.
    has(body, '_pendingWrites[_writeKey(body, target)] =',
        'but it stays in the queue so a later redeploy picks it up');
  }

  group('the chip says what is actually wrong');
  {
    const src = fs.readFileSync(path.join(__dirname, '..', 'havellin.html'), 'utf8');
    const ind = src.slice(src.indexOf('function updatePendingIndicator('));
    const body = ind.slice(0, ind.indexOf('\n}\n'));

    has(body, 'Apps Script needs redeploying',
        'a blocked write names the fix instead of claiming to be retrying');
    has(body, 'w.lastError', 'and the server error reaches the tooltip');
    lacks(body.slice(body.indexOf('if (blocked.length)'), body.indexOf('} else {')),
          'retrying…', 'the blocked branch must not say "retrying" — it is not');

    // Tapping is how you tell it you have fixed the deployment.
    has(body, '_pendingWrites[k].blocked = false',
        'a manual tap clears the blocked flag so a redeploy can be retried');
  }

  group('both writes fire on an inventory change');
  {
    const src = fs.readFileSync(path.join(__dirname, '..', 'havellin.html'), 'utf8');
    const sched = src.slice(src.indexOf('function _scheduleInventorySync('));
    const body = sched.slice(0, sched.indexOf('\n}\n'));
    has(body, "type: 'saveMedia'", 'the durable manifest write');
    has(body, "type: 'saveInventory'", 'and the client workbook write');
    // The manifest is the record; it must not be conditional on a Drive folder existing.
    const mediaAt = body.indexOf("type: 'saveMedia'");
    const guardAt = body.indexOf('job.driveFolder');
    ok(mediaAt >= 0 && guardAt >= 0 && mediaAt < guardAt,
       'the manifest goes first and unconditionally — the workbook write is the guarded one');
  }
};
