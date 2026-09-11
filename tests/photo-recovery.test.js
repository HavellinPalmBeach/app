'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Two ways a room photo became permanent furniture on the crew's field screen.
// Reported 2026-09-11, from a job, on a screenshot of four room cards:
//   "those 'retrys' should clear or something once you do retry, or upload a new image"
//   "one says 'uploading' but never does"
//
// ⚠⚠ "Uploading…" WAS A TERMINAL STATE. A fetch has no timeout. Every failure path in
// _doPhotoUpload resolves — uploadToDrive catches, fetchSubfolderIds catches — but a
// request that never settles reaches none of them, and a stalled auth redirect is exactly
// that. The ref then sits at 'uploading' for the rest of the job: no count, no error, no
// Retry, nothing to press. A state with no exit is worse than a failure, because a failure
// at least offers the fix. The app already learned this on the vendor form.
//
// ⚠⚠ AND A FAILED SHOT COULD NEVER BE CLEARED. Retry clears one that LANDS; a shot that
// cannot land had no exit either, so three red "not saved" flags stood on a card whose
// Before photo had since gone up perfectly well. A red warning that cannot be acted on is
// the fastest way to train people past every other red warning.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const { sandbox } = require('./harness');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'havellin.html'), 'utf8');
const fnBody = (name) => {
  const at = SRC.indexOf('function ' + name + '(');
  return SRC.slice(at, SRC.indexOf('\n}\n', at));
};

// Drive the REAL upload path. `hang` leaves the Drive request pending forever, which is
// the reported failure and the one no catch block can see.
function rig(opts) {
  opts = opts || {};
  const badges = [];
  const timers = [];
  const saved = [];
  let confirmAnswer = opts.confirm === undefined ? true : opts.confirm;

  const ctx = sandbox({
    fns: ['_doPhotoUpload', '_getPhotoRef', '_setPhotoRef', '_slotRefs', '_slotStatusHtml',
          'dismissFailedPhoto'],
    vars: ['PHOTO_UPLOAD_TIMEOUT_MS'],
    stubs: {
      jobs: [{ id: 1, driveFolder: 'https://drive.google.com/drive/folders/FOLDER' }],
      _photoRefs: { 1: [] },
      _photoRetryData: { s1: 'data:image/jpeg;base64,AAA' },
      SHEETS_SYNC_URL: 'https://script.google.com/macros/s/AAA/exec',
      showSyncBadge: (m) => badges.push(String(m)),
      savePhotoRefs: (j) => saved.push(j),
      _savePendingPhotoData() {},
      _updatePhotoStatusEl() {},
      _invTouch(r) { r.updatedAt = 1; },
      confirm: () => confirmAnswer,
      setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; },
      clearTimeout: (id) => { if (id) timers[id - 1] = null; },
      // The subfolder resolves; the UPLOAD is what hangs — the realistic shape, since the
      // stall is in the request Google is redirecting, not in our lookup.
      resolveSubfolderId: (job, name, cb) => cb('SUB'),
      uploadToDrive: (folderId, filename, dataUrl, onDone) => {
        if (opts.hang) return;                 // never settles — no catch can see this
        onDone(!!opts.ok, opts.ok ? 'https://drive/x' : null, opts.ok ? 'FID' : null);
      },
    },
  });
  return {
    ctx, badges, timers, saved,
    setConfirm(v) { confirmAnswer = v; },
    fireWatchdog() { timers.filter(Boolean).forEach((t) => t.fn()); },
    ref: () => ctx._photoRefs[1][0],
  };
}

const seed = (r, status) => {
  r.ctx._photoRefs[1] = [{ stableId: 's1', roomIdx: 2, label: 'before', seq: 1,
                           status: status || 'uploading', filename: 'kitchen.jpg' }];
};

module.exports = function ({ group, ok, eq, has, lacks }) {

  group('⚠⚠ "Uploading…" can no longer be the last word');
  {
    const r = rig({ hang: true });
    seed(r);
    r.ctx._doPhotoUpload(1, 'data:image/jpeg;base64,AAA', 'kitchen.jpg', 's1', 'Estate Inventory');
    eq(r.ref().status, 'uploading', 'while the request is genuinely in flight it says so');
    ok(r.timers.some((t) => t && t.ms === r.ctx.PHOTO_UPLOAD_TIMEOUT_MS),
       'and a watchdog is armed against it never coming back');

    r.fireWatchdog();
    eq(r.ref().status, 'failed', 'a request that never settles ends as a failure, not as limbo');
    ok(r.badges.some((b) => /never answered/.test(b)), 'and says what happened');
    ok(r.badges.some((b) => /still held on this device/.test(b) && /Retry/.test(b)),
       '⚠ naming the one thing that matters: the image is still here, so Retry can work');

    // The slot now renders something a person can act on, which it did not before.
    const html = r.ctx._slotStatusHtml(1, 2, 'before');
    has(html, 'shot 1 not saved', 'the card shows the failure');
    has(html, 'retryPhotoUpload(1', 'with a Retry');
    lacks(html, 'Uploading', 'and no longer claims to be uploading');
  }

  group('⚠ the verdict is written once, or a late answer overwrites a real one');
  {
    // The dangerous ordering: the watchdog fires, THEN the slow upload succeeds.
    const r = rig({ hang: true });
    seed(r);
    let late = null;
    r.ctx.uploadToDrive = (f, n, d, onDone) => { late = onDone; };
    r.ctx._doPhotoUpload(1, 'data:image/jpeg;base64,AAA', 'kitchen.jpg', 's1', 'Estate Inventory');
    r.fireWatchdog();
    eq(r.ref().status, 'failed', 'the watchdog settles it');
    const before = r.saved.length;
    if (late) late(true, 'https://drive/x', 'FID');
    eq(r.ref().status, 'failed', 'and a response arriving afterwards does not re-write the verdict');
    eq(r.saved.length, before, 'nor save again');
    has(fnBody('_doPhotoUpload'), 'if (_settled) return;', 'the guard is deliberate');

    // The converse and the common case: a shot that lands clears the watchdog.
    const good = rig({ ok: true });
    seed(good);
    good.ctx._doPhotoUpload(1, 'data:image/jpeg;base64,AAA', 'kitchen.jpg', 's1', 'Estate Inventory');
    eq(good.ref().status, 'uploaded', 'a normal upload still lands');
    eq(good.timers.filter(Boolean).length, 0, 'and the watchdog is cleared, not left to fire later');
    good.fireWatchdog();
    eq(good.ref().status, 'uploaded', 'so nothing can turn it back into a failure');
  }

  group('⚠⚠ a shot that cannot land can be cleared off the card');
  {
    const r = rig({ ok: false });
    seed(r, 'failed');
    // ⚠ A NEEDLE FOR THE CALL ALONE COULD NOT FAIL, and reverting is what showed it: a
    // button rendered `hidden` still carries its onclick, so `has(html, 'dismissFailedPhoto')`
    // was green over a control nobody can press. Read the rendered element the way a person
    // would — it has to be THERE and it has to be REACHABLE.
    const card = r.ctx._slotStatusHtml(1, 2, 'before');
    const btn = (card.match(/<button[^>]*dismissFailedPhoto[^>]*>/) || [''])[0];
    ok(btn, 'the card renders a discard control');
    lacks(btn, 'hidden', 'not hidden');
    lacks(btn, 'disabled', 'not disabled');
    lacks(btn, 'display:none', 'and not styled out of existence');
    has(btn, 'cursor:pointer', 'it reads as something to press');

    // ⚠ It destroys the image, so it never happens on one tap.
    r.setConfirm(false);
    r.ctx.dismissFailedPhoto(1, 's1');
    ok(!r.ref().deletedAt, 'declining the confirm changes nothing');
    ok(r.ctx._photoRetryData.s1, 'and the bytes are still there to retry');

    r.setConfirm(true);
    r.ctx.dismissFailedPhoto(1, 's1');
    ok(r.ref().deletedAt > 0, 'confirming removes it');
    ok(!r.ctx._photoRetryData.s1, 'and lets go of the image, which the wording promised');
    eq(r.saved.length > 0, true, 'the removal is persisted');

    // ⚠ TOMBSTONE, NOT SPLICE — absence reads as "the other device has not seen it yet",
    // so a splice would be undone by the next merge from the other laptop.
    eq(r.ctx._photoRefs[1].length, 1, 'the row stays in the store as a tombstone');
    ok(r.ref().updatedAt, 'stamped, so the removal wins the per-item merge');

    // And it really leaves every reading of the slot.
    eq(r.ctx._slotRefs(1, 2, 'before').length, 0, 'the slot no longer counts it');
    eq(r.ctx._slotStatusHtml(1, 2, 'before'), '', 'and the card is clean');
    has(fnBody('_slotRefs'), '!r.deletedAt',
        '⚠ the filter tests the tombstone — it did not, so a removed photo went on warning');
  }

  group('⚠ an uploaded photo is not dismissable, and that is not an oversight');
  {
    const r = rig({ ok: true });
    seed(r, 'uploaded');
    r.ctx.dismissFailedPhoto(1, 's1');
    ok(!r.ref().deletedAt,
       'this control exists to clear a DEAD shot; deleting a filed photograph is a different act');
  }
};
