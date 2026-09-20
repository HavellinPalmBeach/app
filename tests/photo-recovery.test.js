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
// ⚠ A needle over a function body matches the COMMENTS in it, and a comment worth reading
// has to quote the line it is explaining. That is what this file's own `textContent` check
// tripped on. Line-based, not /* */: `accept="image/*"` makes a regex stripper eat 166KB.
const liveBody = (name) => fnBody(name).split('\n')
  .filter((l) => !/^\s*\/\//.test(l)).join('\n');

// Drive the REAL upload path. `hang` leaves the Drive request pending forever, which is
// the reported failure and the one no catch block can see.
function rig(opts) {
  opts = opts || {};
  const badges = [];
  const timers = [];
  const saved = [];
  const trashed = [];
  let confirmAnswer = opts.confirm === undefined ? true : opts.confirm;

  const ctx = sandbox({
    // The room workspace's shot strip is where a failed shot shows now (2026-09-19); the
    // per-slot badge it replaced lived on room cards that no longer exist.
    fns: ['_doPhotoUpload', '_getPhotoRef', '_setPhotoRef', '_slotRefs', '_roomShotStripHtml',
          '_invDetailRefs', '_invFileId', '_roomShotThumbStyle',
          'discardShot', '_shotDesc', '_trashShotFiles',
          '_invDerivedRefs', '_invNamed', '_invItemNo'],
    vars: ['PHOTO_UPLOAD_TIMEOUT_MS', '_localShotThumbs'],
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
      _invThumbCache: () => ({}),
      _invSaveThumbCache() {},
      _scheduleInventorySync() {},
      _fieldCam: { open: false },
      // The real wire is driven in the browser; here we only need to know a delete really
      // went out for the right file, which is the half a source check cannot see.
      driveTrashFile: (fileId, cb) => { trashed.push(fileId); cb(!opts.driveFails, 'nope'); },
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
    ctx, badges, timers, saved, trashed,
    setConfirm(v) { confirmAnswer = v; },
    fireWatchdog() { timers.filter(Boolean).forEach((t) => t.fn()); },
    ref: () => ctx._photoRefs[1][0],
  };
}

const seed = (r, status, label) => {
  // ⚠ THE LABEL IS LOAD-BEARING SINCE 2026-09-20 and used to be incidental. This fixture is
  // shared by the watchdog, the retry and the discard groups; it said 'before' throughout,
  // which made every discard test accidentally exercise an AS-FOUND shot — the one shot the
  // discard now refuses. Anthony's "just delete it on device and drive... there is no probate
  // risk here" was about a fat-fingered ITEM shot re-taken a second later, which is what this
  // seeds now. The as-found refusal has a group of its own below.
  r.ctx._photoRefs[1] = [{ stableId: 's1', roomIdx: 2, label: label || 'inventory', seq: 1,
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

    // The room's shot strip now renders something a person can act on, which it did not before.
    const html = r.ctx._roomShotStripHtml(1, 2);
    has(html, 'not saved', 'the strip shows the failure');
    has(html, 'Item 1', 'against the shot it belongs to');
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
    // button rendered `hidden` still carries its onclick, so a needle for the call alone
    // was green over a control nobody can press. Read the rendered element the way a person
    // would — it has to be THERE and it has to be REACHABLE.
    // ⚠ THE CONTROL IS THE BIN ON THE THUMBNAIL NOW, on every shot rather than only a red
    // one. The ✕ that used to sit beside Retry was a second control destroying the same
    // thing on the same tile. What has to stay true is what it always was: it is THERE and
    // it is REACHABLE.
    const card = r.ctx._roomShotStripHtml(1, 2);
    const btn = (card.match(/<button[^>]*class="ws-del"[^>]*>/) || [''])[0];
    ok(btn, 'the strip renders a discard control');
    has(btn, 'discardShot(1,', 'wired to the one discard');
    lacks(btn, 'hidden', 'not hidden');
    lacks(btn, 'disabled', 'and not disabled');
    has(card, 'retryPhotoUpload(1,', 'and Retry is still beside it — discarding is not the only way out');

    // ⚠ It destroys the image, so it never happens on one tap.
    r.setConfirm(false);
    r.ctx.discardShot(1, 's1');
    ok(!r.ref().deletedAt, 'declining the confirm changes nothing');
    ok(r.ctx._photoRetryData.s1, 'and the bytes are still there to retry');

    r.setConfirm(true);
    r.ctx.discardShot(1, 's1');
    ok(r.ref().deletedAt > 0, 'confirming removes it');
    ok(!r.ctx._photoRetryData.s1, 'and lets go of the image, which the wording promised');
    eq(r.saved.length > 0, true, 'the removal is persisted');

    // ⚠ TOMBSTONE, NOT SPLICE — absence reads as "the other device has not seen it yet",
    // so a splice would be undone by the next merge from the other laptop.
    eq(r.ctx._photoRefs[1].length, 1, 'the row stays in the store as a tombstone');
    ok(r.ref().updatedAt, 'stamped, so the removal wins the per-item merge');

    // And it really leaves every reading of the slot.
    eq(r.ctx._slotRefs(1, 2, 'inventory').length, 0, 'the slot no longer counts it');
    eq(r.ctx._roomShotStripHtml(1, 2), '', 'and the strip is clean');
    eq(r.trashed.length, 0, '⚠ a shot that never reached Drive asks Drive to delete nothing');
    has(fnBody('_slotRefs'), '!r.deletedAt',
        '⚠ the filter tests the tombstone — it did not, so a removed photo went on warning');
  }

  // ⚠⚠ THIS GROUP IS THE CONVERSE OF THE ONE IT REPLACES, AND THE OLD ONE WAS RIGHT UNTIL
  // 2026-09-20. It pinned "an uploaded photo is not dismissable, and that is not an oversight"
  // — true while nothing could remove a file from Drive, and the reason a crummy shot that
  // uploaded perfectly had no control anywhere. Reported from the field: "i took a crummy
  // picture and i want to be able to delete it." The requirement now is the other way round,
  // and the half worth pinning is that the Drive file really goes with it.
  group('⚠⚠ a shot that DID land is discardable too — and it leaves Drive with it');
  {
    const r = rig({ ok: true });
    seed(r, 'uploaded');
    r.ref().driveFileId = 'FID1';

    r.setConfirm(false);
    r.ctx.discardShot(1, 's1');
    ok(!r.ref().deletedAt, 'it destroys a photograph, so it never happens on one tap');
    eq(r.trashed.length, 0, 'and nothing is touched in Drive until it is confirmed');

    r.setConfirm(true);
    ok(r.ctx.discardShot(1, 's1'), 'confirming removes it');
    ok(r.ref().deletedAt > 0, 'the row is tombstoned');
    ok(r.ref().updatedAt, 'stamped, so the removal wins the per-item merge');
    eq(r.ctx._photoRefs[1].length, 1, 'tombstone, never a splice');
    eq(r.ctx._slotRefs(1, 2, 'inventory').length, 0, 'gone from every reading of the slot');
    eq(r.trashed.join(','), 'FID1', '⚠ and the file really left the client\u2019s Drive folder');

    ok(!r.ctx.discardShot(1, 's1'), 'a second press finds nothing to do');
    eq(r.trashed.length, 1, 'so Drive is not asked twice');
  }

  // ⚠⚠ FOUND IN THE BROWSER, NOT BY A TEST, AND NO STUB COULD HAVE SEEN IT. The strip emitted
  // the delete button and the RENDERED tile did not have one — `_invPaintThumbs` cleared the
  // placeholder glyph with `el.textContent = ''`, which takes every child ELEMENT with it. So
  // the control vanished off exactly the thumbnails that had a photograph to look at, which
  // are the ones you want to bin. Pinned at source because the painter has no return value to
  // drive: what must stay true is that it clears TEXT and never children.
  group('⚠⚠ painting a thumbnail must not delete the controls sitting on it');
  {
    const body = liveBody('_invPaintThumbs');
    ok(body.length > 60 && body.indexOf('backgroundSize') > 0,
       'the comment stripper kept the live code');
    lacks(body, "textContent = ''", 'it does not wipe the element wholesale');
    has(body, 'nodeType === 3', 'it removes text nodes only');
    has(body, 'removeChild', 'one at a time, leaving elements alone');
    // The converse: it still has to clear the glyph, or a photo paints behind a camera icon.
    has(body, 'backgroundImage', 'and it still paints the photograph');
  }

  // ⚠⚠ A DETAIL SHOT IS A CLOSE-UP OF THIS OBJECT, so binning the object takes them with it.
  // Left behind they would be photographs of a thing that is no longer on the manifest, filed
  // under a `groupId` pointing at a tombstone — and `_invDetailRefs` would go on counting them
  // on a row that is gone.
  group('⚠⚠ binning an item takes its detail shots, and their files, with it');
  {
    const r = rig({ ok: true });
    r.ctx._photoRefs[1] = [
      { stableId: 'i1', roomIdx: 2, label: 'inventory', seq: 1, status: 'uploaded',
        objectName: 'Side table', driveFileId: 'FID_ITEM', filename: 'a.jpg' },
      { stableId: 'd1', roomIdx: 2, label: 'detail', seq: 1, status: 'uploaded',
        groupId: 'i1', driveFileId: 'FID_DET', filename: 'b.jpg' },
      { stableId: 'i2', roomIdx: 2, label: 'inventory', seq: 2, status: 'uploaded',
        objectName: 'Lamp', driveFileId: 'FID_OTHER', filename: 'c.jpg' },
    ];
    const byId = (id) => r.ctx._photoRefs[1].find((x) => x.stableId === id);

    ok(r.ctx.discardShot(1, 'i1'), 'the item goes');
    ok(byId('i1').deletedAt > 0, 'tombstoned');
    ok(byId('d1').deletedAt > 0, '⚠ and so is its detail shot');
    ok(!byId('i2').deletedAt, 'while the object beside it is untouched');
    eq(r.trashed.sort().join(','), 'FID_DET,FID_ITEM',
       '⚠ both files leave Drive — and the other item\u2019s does not');
    ok(byId('i1').driveTrashed && byId('d1').driveTrashed,
       'both rows say where the photograph went, so the undo buffer can tell the truth');
    eq(r.ctx._invDetailRefs(1, 'i1').length, 0, 'and the detail stops counting against the row');
  }

  group('⚠ the local removal does not wait on Drive, and a Drive refusal says so');
  {
    const r = rig({ ok: true, driveFails: true });
    seed(r, 'uploaded');
    r.ref().driveFileId = 'FID9';
    r.ctx.discardShot(1, 's1');
    ok(r.ref().deletedAt > 0,
       '⚠ what was asked for is the bad photograph off the screen — a Drive refusal must not block that');
    ok(r.badges.some(function(b){ return /could not be removed from Google Drive/.test(b); }),
       'and the failure speaks, because the row has already gone from the manifest');
  }

  // ⚠⚠ AND THE ONE SHOT THAT IS NOT DISCARDABLE AT ALL. Anthony's 2026-09-20 call — "just
  // delete it on device and drive... there is no probate risk here" — was about a fat-fingered
  // ITEM shot re-taken a second later. The as-found pass is the case it did not consider and
  // the case where the claim is false: it is the record of the property's condition on arrival
  // and the only answer to "there was a gold Rolex in my father's desk drawer" once the house
  // is empty. You do not curate an evidence set. Refused on BOTH bins, because the camera's own
  // and the room strip both route through discardShot.
  group('⚠⚠ AN AS-FOUND SHOT CANNOT BE DISCARDED — the evidence set is not curated');
  {
    const r = rig({ ok: true });
    seed(r, 'uploaded', 'before');
    r.ref().driveFileId = 'FID9';
    r.setConfirm(true);

    eq(r.ctx.discardShot(1, 's1'), false, 'the discard is refused outright');
    ok(!r.ref().deletedAt, 'the row is not tombstoned');
    eq(r.trashed.length, 0, '⚠ and nothing is asked of Drive — the file stays in the client folder');
    eq(r.ctx._slotRefs(1, 2, 'before').length, 1, 'the shot is still on the slot');

    // ⚠ IT REFUSES BEFORE THE CONFIRM, not after one. A dialog that asks and then declines
    // teaches people the control is broken rather than that the rule exists.
    const quiet = rig({ ok: true });
    seed(quiet, 'uploaded', 'before');
    quiet.setConfirm(false);
    eq(quiet.ctx.discardShot(1, 's1'), false, 'declining changes nothing either');

    // The refusal has to SAY what it is protecting and what to do instead, or it reads as a bug.
    const body = fnBody('discardShot');
    has(body, "ref.label === 'before'", 'keyed on the pass, never on a label list that could drift');
    has(body, 'Shoot another', 'and it names the alternative rather than only saying no');
    // And the item case is untouched — proven by the group above, pinned here as the converse.
    ok(body.indexOf("ref.label === 'before'") < body.indexOf('confirm('),
       '⚠ the refusal is ahead of the confirm in the function, so the dialog never opens on one');
  }

  // ⚠ A FLOOR, NOT A "did you bump it" CHECK — it states what THIS feature needs, so it
  // survives the next real bump instead of breaking on it. `trashFile` landed in 2026-09-20a;
  // on any deployment older than that, a photo binned in the field comes off the job and
  // STAYS IN THE CLIENT'S DRIVE FOLDER, which is the one half of the delete a person cannot
  // see from the app.
  group('⚠ the backend can actually delete a file, and the app can say when it cannot');
  {
    const GS = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'main-sync.gs'), 'utf8');
    has(GS, "data.action === 'trashFile'", 'trashFile is dispatched');
    has(GS, "'trashFile'", 'and declared, so the version probe reports it');
    has(GS, 'supportsAllDrives', '⚠ and it asks the Shared Drive the estate folders live on');
    const bv = (GS.match(/var BACKEND_VERSION = '([^']+)';/) || [])[1] || '';
    ok(bv >= '2026-09-20a',
       '⚠ BACKEND_VERSION is at or past the release that added trashFile (found ' + bv + ')');
    has(SRC, "'trashFile'", 'the app lists it in BACKEND_NEEDS, so a stale deployment draws the banner');
    has(SRC, 'still stays in the client', 'and the banner says what that costs, in consequences');
  }
};
