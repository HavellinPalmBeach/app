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

  group('only the server can diagnose the server');
  {
    const ctx = sandbox({ fns: ['_backendErrorKind'] });
    const f = ctx._backendErrorKind;

    // 'stale' is a CLAIM about the deployment, so it needs the server's own words.
    eq(f('Unknown type: saveMedia', true), 'stale', 'an unknown POST type is proof of a stale deployment');
    // ⚠⚠ "Unknown action" USED TO BE READ AS STALE TOO, and half the time that is wrong.
    // Reported 2026-09-11: saveAllJobPlans came back with it and the chip said "Apps Script
    // needs redeploying" over a deployment that had just executed. Only doGet emits that
    // string — doPost's fallback names the type — so a POST answered with it never reached
    // the writing half of the script at all, and a redeploy changes nothing.
    // ⚠ THE TEXT CANNOT SETTLE IT; WHAT WE SENT CAN, which is why the body is an argument.
    eq(f('Unknown action', true, { action: 'createFolder' }), 'stale',
       'an action WE asked for that doGet does not know really is an old deployment');
    eq(f('Unknown action', true, { action: 'version' }), 'stale', 'same for the version probe');
    eq(f('Unknown action', true, { type: 'saveAllJobPlans', payload: {} }), 'route',
       'but a store write answered by the GET router was MIS-ROUTED, not out of date');
    eq(f('Unknown action', true), 'stale',
       'with nothing to go on it keeps the old reading, so every existing caller is unmoved');
    eq(f('Unknown type: saveAllJobPlans', true, { type: 'saveAllJobPlans' }), 'stale',
       'and a named unknown type is still proof of staleness whatever the body says');

    // A server crash is held (retrying it is pointless) but is NOT proof of staleness —
    // a live bug on a current deployment throws exactly the same shape. Reported
    // 2026-09-01: "we haven't changed the apps script for a re-deploy i dont think."
    eq(f('ReferenceError: saveMediaStore is not defined', true), 'crash',
       'a missing handler is a crash, not proof the deployment is old');
    eq(f('TypeError: getMediaForJob is not a function', true), 'crash', 'same shape via TypeError');

    // THE BUG. These messages come out of our own catch block — a fetch failure or a
    // bug in havellin.html — and used to be read as a verdict on the Apps Script.
    eq(f('TypeError: v.category.split is not a function', false), '',
       'a client-side TypeError is never a backend diagnosis');
    eq(f('ReferenceError: renderVendorsTab is not defined', false), '',
       'nor is a client-side ReferenceError');

    // Transient failures must stay retryable, or a flaky network stops retrying and the
    // write sits there until someone notices the chip.
    eq(f('Failed to fetch', true), '', 'a network drop is transient');
    eq(f('the web app returned a login/HTML page, not data', true), '',
       'the Apps Script interstitial is transient — it works on the next attempt');
    eq(f('Exceeds the maximum number of characters allowed in a cell', true), '',
       'a cell-size failure is a real bug to fix, not a stale deployment');
    eq(f('', true), '', 'no error text diagnoses nothing');
    eq(f(null, true), '', 'and null does not throw');
  }

  group('every enqueue path declares where its error came from');
  {
    const src = fs.readFileSync(path.join(__dirname, '..', 'havellin.html'), 'utf8');

    const enq = src.slice(src.indexOf('function _enqueueWrite('));
    const body = enq.slice(0, enq.indexOf('\n}\n'));
    has(body, 'var kind = _backendErrorKind(errText, fromServer, body);',
        'the classifier is given the provenance AND what was sent, not just the text');
    has(body, 'lastError: errText', 'the reason is stored on the write, not just toasted');
    has(body, 'blocked: stale', 'and the write is marked blocked');
    has(body, 'if (!stale) _scheduleRetry();',
        'a permanent error does NOT schedule another attempt');
    // It must still be queued — the work is not lost, it is waiting for a redeploy.
    // ⚠ This used to pin the exact expression `_pendingWrites[_writeKey(body, target)] =`
    // and broke on a true change (the key was hoisted into a local so the previous
    // entry's failure count could be carried over). State the requirement instead.
    has(body, 'var key = _writeKey(body, target);', 'it keys off the logical target');
    has(body, '_pendingWrites[key] = {',
        'and stays in the queue so a later redeploy picks it up');

    // A bare _enqueueWrite call would default fromServer to undefined — falsy, so it
    // fails safe (retryable) — but leaving one is how the misdiagnosis creeps back.
    const sites = [];
    for (let at = src.indexOf('_enqueueWrite('); at !== -1; at = src.indexOf('_enqueueWrite(', at + 1)) {
      if (src.slice(at - 9, at) === 'function ') continue;   // the declaration itself
      sites.push(src.slice(at, src.indexOf(';', at) + 1));
    }
    ok(sites.length >= 3, 'all three enqueue sites are still here');
    sites.forEach((c) => {
      ok(/,\s*(true|false|!\(d && d\.clientError\))\s*\)/.test(c.replace(/\s+/g, ' ')),
         'enqueue site passes fromServer explicitly: ' + c.slice(0, 60).replace(/\s+/g, ' '));
    });

    // The outbox: a { ok:false } body is the server; a thrown error never is.
    const ob = src.slice(src.indexOf('function _flushOutbox('));
    const obBody = ob.slice(0, ob.indexOf('\n}\n'));
    has(obBody, 'res && res.error, null, true', 'a server rejection is flagged as such');
    has(obBody, 'e && e.message, null, false', 'a thrown error is not');

    // The directory path shares one callback for both, so the data has to carry it.
    const post = src.slice(src.indexOf('function _appsScriptPost('));
    has(post.slice(0, post.indexOf('\n}\n')), 'clientError: true',
        'a fetch/parse failure tags itself so queuedDirectoryWrite can tell them apart');
  }

  group('a retry re-reads the verdict instead of trusting the first one');
  {
    const src = fs.readFileSync(path.join(__dirname, '..', 'havellin.html'), 'utf8');
    const fl = src.slice(src.indexOf('function flushPendingWrites('));
    const body = fl.slice(0, fl.indexOf('\n}\n'));
    has(body, 'w.kind = _backendErrorKind(res && res.error, true, w.body);',
        'each attempt reclassifies against what the server said THIS time, for what we sent');
    has(body, "w.kind = '';", 'and a thrown error clears the block so it keeps retrying');
    has(body, 'return !_pendingWrites[key].blocked;',
        'a queue of nothing but blocked writes stops scheduling retries');
  }

  group('what the chip actually says, driven end to end');
  {
    const scheduled = [];
    const ctx = sandbox({
      fns: ['_backendErrorKind', '_writeKey', '_pendingCount', '_enqueueWrite', '_pendingChipCopy'],
      vars: ['_pendingWrites', 'SYNC_STUCK_TRIES'],
      stubs: {
        showSyncBadge() {},
        updatePendingIndicator() {},
        _scheduleRetry() { scheduled.push(1); },
      },
    });
    const enqueue = (type, err, fromServer) =>
      ctx._enqueueWrite('main', { type, payload: {} }, null, 'Sync failed', err, null, fromServer);

    // 1. The server does not know the action. Only this earns the redeploy claim.
    enqueue('saveMedia', 'Unknown type: saveMedia', true);
    has(ctx._pendingChipCopy().head, 'Apps Script needs redeploying',
        'an unknown type names the redeploy');
    eq(scheduled.length, 0, 'and is held rather than retried');

    // 2. The server threw on a deployment nobody has touched. Reported 2026-09-01.
    ctx._pendingWrites = {};
    scheduled.length = 0;
    enqueue('saveAllJobs', 'TypeError: sheet.getRange is not a function', true);
    const crash = ctx._pendingChipCopy();
    has(crash.head, 'the Apps Script returned an error', 'a crash is reported as a crash');
    lacks(crash.head, 'needs redeploying',
          'and never sends anyone to redeploy a script they have not changed');
    lacks(crash.note, 'needs redeploying', 'the note does not either');
    has(crash.note, 'half-applied', 'it offers the paste as one possibility, not the verdict');
    eq(scheduled.length, 0, 'a deterministic server error is still held, not hammered');

    // 3. THE BUG: the same words, thrown on THIS side of the wire.
    ctx._pendingWrites = {};
    scheduled.length = 0;
    enqueue('saveAllJobs', 'TypeError: v.category.split is not a function', false);
    has(ctx._pendingChipCopy().head, 'retrying',
        'a client-side TypeError is a retry, not a verdict on the Apps Script');
    eq(scheduled.length, 1, 'and it schedules another attempt');

    // 4. An ordinary network drop.
    ctx._pendingWrites = {};
    scheduled.length = 0;
    enqueue('saveAllJobs', 'Failed to fetch', true);
    has(ctx._pendingChipCopy().head, 'retrying', 'a network drop keeps retrying');

    // 5. THE 2026-09-11 REPORT: a store write answered by the GET router. The old build
    //    said "Apps Script needs redeploying" here, which is the wrong instruction — the
    //    script ran, the request simply never got to the half that writes.
    ctx._pendingWrites = {};
    scheduled.length = 0;
    enqueue('saveAllJobPlans', 'Unknown action', true);
    const routed = ctx._pendingChipCopy();
    has(routed.head, 'Apps Script URL and its access', 'it names the URL and the access setting');
    lacks(routed.head, 'needs redeploying', 'and does NOT send anyone to redeploy');
    lacks(routed.note, 'New version', 'the note does not prescribe a redeploy either');
    has(routed.note, 'RE-DEPLOYING WILL NOT FIX IT', 'it says so outright');
    has(routed.note, '/exec', 'and names the three things to check: the URL form');
    has(routed.note, 'Who has access', 'the deployment access');
    has(routed.note, 'Vendor', 'and that it must be the jobs script, not a directory one');
    has(routed.note, 'Nothing is lost', 'while saying the work is still held');
    eq(scheduled.length, 0, 'it is held rather than hammered — the same POST will do the same thing');

    // 6. One blocked write among several still surfaces the blocker, and the count is
    //    of everything outstanding — the chip is the only place the total is shown.
    ctx._pendingWrites = {};
    scheduled.length = 0;
    enqueue('saveAllJobs', 'Failed to fetch', true);
    enqueue('saveMedia', 'Unknown type: saveMedia', true);
    const mixed = ctx._pendingChipCopy();
    has(mixed.head, '2 changes not saved', 'both are counted');
    has(mixed.head, 'Apps Script needs redeploying', 'and the blocker sets the wording');
  }

  group('the reason is on screen, not only in a tooltip');
  {
    const src = fs.readFileSync(path.join(__dirname, '..', 'havellin.html'), 'utf8');
    const ind = src.slice(src.indexOf('function updatePendingIndicator('));
    const body = ind.slice(0, ind.indexOf('\n}\n'));

    // A phone has no hover, so a tooltip is not a report — that is what left the last
    // one unreadable on the device the failure happened on.
    has(body, "getElementById('sync-pending-detail')", 'the detail panel exists');
    has(body, 'esc(w.lastError)', "and carries the server's own words, escaped");
    has(body, '_pendingWriteLabel(w, k)', 'naming which write and which backend');
    has(body, 'retryPendingWrites()', 'with retry as a deliberate button, not a stray tap');

    // Tapping is how you READ it; it must no longer silently clear the block.
    lacks(body, '_pendingWrites[k].blocked = false',
          'tapping the chip opens the detail rather than clearing the blocked flag');
    const retry = src.slice(src.indexOf('function retryPendingWrites('));
    has(retry.slice(0, retry.indexOf('\n}\n')), '_pendingWrites[k].blocked = false',
        'the explicit Try again is what says the deployment was fixed');
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
