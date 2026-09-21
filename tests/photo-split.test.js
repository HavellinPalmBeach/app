'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// ONE PHOTOGRAPH, MANY INVENTORY LINES (2026-09-20).
//
// Anthony, off a photograph of a bar console: *"this same picture is going to serve as
// reference to multiple items — four bottles of booze, a Banksy, a hutch — so we really
// don't have to photograph each individual item unless let's say we know it's extremely
// valuable and we want to take a picture of the front and the back, or this Banksy if it
// was real we would zoom in on the signature of the artist, or if it's China we'd flip it
// over and get the maker's mark."*
//
// He is describing how the work is actually done, and the manifest could not express it:
// one shot was one line, so five objects in one frame meant either five photographs of one
// shelf or four objects going unrecorded.
//
//   1. A DERIVED ROW IS A FULL INVENTORY LINE. Its own permanent item number, name,
//      category, value, disposition, flags and custody — they are different objects and a
//      receipt cites each one separately.
//   2. AND IT IS NOT A PHOTOGRAPH. `_slotRefs` answers "how many shots are in this slot"
//      and drives the room card's counts, the as-found Lock gate and the `seq` on the next
//      shot. Counting a derived line there would tell the crew they had shot the room more
//      thoroughly than they had.
//   3. IT IS NOT `groupId`. A DETAIL shot is a second photograph of ONE object and is never
//      a line. This is the converse — one photograph, several objects — and collapsing the
//      two would put a close-up of a signature on the court schedule as a separate asset.
// ─────────────────────────────────────────────────────────────────────────────

const { sandbox, source, fn } = require('./harness');

const liveLines = (s) => String(s).split('\n')
  .filter((l) => { const t = l.trim(); return !(t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')); })
  .join('\n');

const SRC = (over) => Object.assign({
  stableId: 's_bar', roomIdx: 4, label: 'inventory', collId: null, seq: 1,
  filename: 'HVL-0007_Living_INV_1.jpg',
  driveFileUrl: 'https://drive.google.com/file/d/FID/view', driveFileId: 'FID',
  status: 'uploaded', ts: 1000,
  objectName: 'Bar console', category: 'Furniture', disposition: 'Keep',
  fmv: '900', condition: 'Good', flagBequest: 1, needsAppr: 1, itemNo: 12,
}, over || {});

function rig(refs, over) {
  over = over || {};
  const alerts = [];
  const saved = [];
  const ctx = sandbox({
    fns: ['invSplitItem', 'invSplitItemClick', '_invDerivedRefs', '_invPhotoSource',
          '_invPhotoSiblings', '_getPhotoRef', '_setPhotoRef', '_slotRefs', '_jobInvRefs',
          '_invFileId', '_photoUid', '_invNamed', '_invItemNo', '_invAssignItemNos'],
    vars: ['_photoUidSeq', 'INV_DEFAULT_CATEGORY'],
    stubs: {
      jobs: [{ id: 7, hvlId: 'HVL-0007' }],
      _photoRefs: { 7: refs || [] },
      savePhotoRefs: (j) => saved.push(j),
      _invTouch(r) { r.updatedAt = 1; return r; },
      _scheduleInventorySync() {},
      renderInventoryTab() {},
      alert: (m) => alerts.push(String(m)),
    },
  });
  return { ctx, alerts, saved };
}

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ THE SPLIT COPIES THE IMAGE AND NOTHING ELSE');
  {
    const { ctx, saved } = rig([SRC()]);
    const line = ctx.invSplitItem(7, 's_bar');
    ok(typeof line === 'object', 'it returns the new row');

    eq(line.driveFileId, 'FID', 'the new line points at the same file in Drive');
    eq(line.driveFileUrl, 'https://drive.google.com/file/d/FID/view', 'and the same link');
    eq(line.filename, 'HVL-0007_Living_INV_1.jpg', 'and names the same photograph');
    eq(line.roomIdx, 4, 'and is in the same room');
    eq(line.derivedFrom, 's_bar', 'and records which photograph it came out of');
    ok(line.stableId !== 's_bar', 'with an id of its own');
    eq(line.status, 'uploaded', 'it is already in Drive by construction, so it never uploads');

    // ⚠ NOTHING ELSE IS COPIED, and that is the load-bearing half. A prefilled answer on a
    // blank line is the silence-reads-as-Keep defect the Undecided default exists to stop.
    eq(line.objectName, '', 'no name — it is a different object');
    eq(line.disposition, '', 'no disposition: it lands in Not yet decided, where it belongs');
    eq(line.category, ctx.INV_DEFAULT_CATEGORY, 'the default category, not the source\'s Furniture');
    ['fmv', 'condition', 'flagBequest', 'needsAppr', 'itemNo', 'custodyLog'].forEach((k) => {
      ok(line[k] === undefined || line[k] === '' || line[k] === 0,
         k + ' is not inherited — a bequest on the console says nothing about the bottle beside it');
    });
    eq(line.ts, 1000,
       '\u26a0 it takes the SOURCE\u2019s timestamp, not now \u2014 `ts` means when the photograph was taken '
       + 'everywhere else in the manifest, and stamping the split scatters one frame\u2019s objects across '
       + 'the sort and across the Today filter');
    eq(saved.length, 1, 'and it is persisted');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ ONE FRAME\u2019S LINES SORT TOGETHER, SOURCE FIRST');
  {
    const { ctx } = rig([SRC(), SRC({ stableId: 's_later', objectName: 'Sideboard', ts: 5000,
                                      driveFileId: 'F2', itemNo: 20 })]);
    ctx.invSplitItem(7, 's_bar');
    ctx.invSplitItem(7, 's_bar');
    const order = ctx._jobInvRefs(7).map((r) => r.stableId);
    eq(order[0], 's_bar', 'the photograph first');
    ok(order[1].indexOf('_d') > 0 && order[2].indexOf('_d') > 0,
       'then everything split out of it, in the order it was split');
    eq(order[3], 's_later',
       '\u26a0 and the NEXT photograph after all of them \u2014 a split taken today does not jump to the '
       + 'end of a 200-item manifest, away from the objects it shared a frame with');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ A DERIVED ROW IS A LINE EVERYWHERE, AND A PHOTOGRAPH NOWHERE');
  {
    const { ctx } = rig([SRC()]);
    ctx.invSplitItem(7, 's_bar');
    ctx.invSplitItem(7, 's_bar');
    ctx.invSplitItem(7, 's_bar');

    eq(ctx._jobInvRefs(7).length, 4, 'the console and three more objects are four inventory lines');
    eq(ctx._slotRefs(7, 4, 'inventory').length, 1,
       '⚠ and ONE photograph — the room card must not read four shots where one was taken');

    // The next shot's sequence number comes off _slotRefs. Counting derived lines there
    // would skip three numbers on files that do not exist.
    eq(ctx._slotRefs(7, 4, 'inventory').length + 1, 2, 'so the next shot in that slot is seq 2');

    // Item numbers: separate objects get separate permanent numbers.
    const nos = ctx._invAssignItemNos(7).map((r) => r.itemNo);
    eq(new Set(nos).size, 4, 'every line is numbered, and no two share a number');
    ok(nos.indexOf(12) >= 0, 'the source keeps the number it was already issued');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ IT REFUSES ON A SHOT THAT HAS NOT REACHED DRIVE');
  {
    const notUp = rig([SRC({ status: 'failed', driveFileUrl: null, driveFileId: null })]);
    const out = notUp.ctx.invSplitItem(7, 's_bar');
    eq(typeof out, 'string', 'it refuses');
    has(out, 'has not reached Google Drive',
        '⚠ because a line split off it would carry no image AND NEVER GET ONE — it would print '
        + 'on the attorney\'s schedule with an empty photo box for the rest of the engagement');
    has(out, 'Press Retry', 'and names the fix');
    eq(notUp.ctx._jobInvRefs(7).length, 1, 'and nothing is created');

    const beforeShot = rig([SRC({ label: 'before' })]);
    eq(typeof beforeShot.ctx.invSplitItem(7, 's_bar'), 'string',
       'an as-found shot cannot be split: it is evidence, never a line');
    const gone = rig([SRC({ deletedAt: 1 })]);
    eq(typeof gone.ctx.invSplitItem(7, 's_bar'), 'string', 'nor a discarded one');
    eq(typeof rig([]).ctx.invSplitItem(7, 'nope'), 'string', 'nor one that is not on the job');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ SPLITTING A DERIVED LINE SPLITS OFF THE PHOTOGRAPH, NEVER OFF THE LINE');
  {
    const { ctx } = rig([SRC()]);
    const a = ctx.invSplitItem(7, 's_bar');
    const b = ctx.invSplitItem(7, a.stableId);
    eq(b.derivedFrom, 's_bar',
       '⚠ no chains — everything in one frame points at the one photograph, so removing the '
       + 'middle line cannot orphan the ones after it');
    eq(ctx._invDerivedRefs(7, 's_bar').length, 2, 'both hang off the source');
    eq(ctx._invDerivedRefs(7, a.stableId).length, 0, 'and nothing hangs off a line');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('THE SIBLING READERS, WHICH IS WHAT STOPS TWO IDENTICAL THUMBNAILS READING AS A DUPLICATE');
  {
    const { ctx } = rig([SRC()]);
    const a = ctx.invSplitItem(7, 's_bar');
    eq(ctx._invPhotoSiblings(7, ctx._getPhotoRef(7, 's_bar')).length, 2, 'the source sees both lines');
    eq(ctx._invPhotoSiblings(7, a).length, 2, 'and so does the derived one');
    eq(ctx._invPhotoSiblings(7, a)[0].stableId, 's_bar', 'source first, so the list reads in capture order');
    eq(ctx._invPhotoSource(7, a).stableId, 's_bar', 'a derived line resolves to its photograph');
    eq(ctx._invPhotoSource(7, ctx._getPhotoRef(7, 's_bar')).stableId, 's_bar',
       'and an ordinary line resolves to itself');

    // A lone line is not "1 of 1" — the cue has to stay off every ordinary row or it is noise
    // on the whole manifest.
    const lone = rig([SRC()]);
    eq(lone.ctx._invPhotoSiblings(7, lone.ctx._getPhotoRef(7, 's_bar')).length, 1,
       'an unsplit photograph has one line and the row says nothing');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ DISCARDING THE PHOTOGRAPH TAKES ITS LINES, NAMES THEM, AND ASKS DRIVE ONCE');
  {
    const asked = [];
    const trashed = [];
    let msg = '';
    const ctx = sandbox({
      fns: ['discardShot', '_getPhotoRef', '_setPhotoRef', '_invDerivedRefs', '_invDetailRefs',
            '_invFileId', '_shotDesc', '_trashShotFiles', '_invNamed', '_invItemNo'],
      vars: ['_localShotThumbs'],
      stubs: {
        jobs: [{ id: 7 }],
        _photoRefs: { 7: [
          SRC(),
          { stableId: 'd1', derivedFrom: 's_bar', roomIdx: 4, label: 'inventory', collId: null,
            driveFileId: 'FID', driveFileUrl: 'u', status: 'uploaded', ts: 2000,
            objectName: 'Banksy print', itemNo: 13 },
          { stableId: 'd2', derivedFrom: 's_bar', roomIdx: 4, label: 'inventory', collId: null,
            driveFileId: 'FID', driveFileUrl: 'u', status: 'uploaded', ts: 3000,
            objectName: 'Bang & Olufsen speaker', itemNo: 14 },
        ] },
        _photoRetryData: {}, _savePendingPhotoData() {}, savePhotoRefs() {},
        _invTouch(r) { r.updatedAt = 1; return r; },
        _invThumbCache: () => ({}), _invSaveThumbCache() {}, _scheduleInventorySync() {},
        _updatePhotoStatusEl() {}, _fieldCam: { open: false }, renderInventoryTab() {},
        SHEETS_SYNC_URL: 'https://script.example/exec',
        driveTrashFile: (id, cb) => { trashed.push(id); cb(true); },
        showSyncBadge: (m) => asked.push(String(m)),
        confirm: (m) => { msg = m; return true; },
        alert: () => {},
      },
    });
    ok(ctx.discardShot(7, 's_bar'), 'the discard goes through');

    has(msg, '2 inventory lines were split out of this photograph',
        'the confirm says the lines go with it');
    has(msg, '#13 Banksy print', '⚠ and NAMES them — "2 lines" invites a yes');
    has(msg, '#14 Bang & Olufsen speaker', 'both of them');
    has(msg, 'Restore', 'and says the removal is undoable');

    ['s_bar', 'd1', 'd2'].forEach((id) => {
      ok(!!ctx._getPhotoRef(7, id).deletedAt, id + ' is tombstoned, never spliced');
      eq(ctx._getPhotoRef(7, id).driveTrashed, 1, 'and stamped, so Restore can say the image is gone');
    });
    eq(trashed.length, 1,
       '⚠ Drive is asked ONCE — all three rows carry the same file id, and asking three times '
       + 'would land two loud refusals on screen over a delete that worked');
    eq(trashed[0], 'FID', 'for the right file');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ THE FIELD KEY SURVIVES A SAVE AND A MERGE');
  {
    // Third time this file's project has recorded it: a manifest key not on the whitelist is
    // dropped silently on every save, and one not on the sticky list is dropped by the merge.
    const w = liveLines(fn('savePhotoRefs'));
    has(w, 'derivedFrom:r.derivedFrom', 'derivedFrom is on the savePhotoRefs whitelist');
    const st = sandbox({ vars: ['INV_STICKY_FIELDS'] });
    ok(st.INV_STICKY_FIELDS.indexOf('derivedFrom') >= 0,
       '⚠ and on INV_STICKY_FIELDS — losing it turns a line back into a phantom photograph, '
       + 'inflating the room count and offering a Retry for bytes that do not exist');

    // The one filter that must know about it, and the ones that must not.
    has(liveLines(fn('_slotRefs')), '!r.derivedFrom', 'the slot count excludes a derived line');
    lacks(liveLines(fn('_jobInvRefs')), 'derivedFrom',
          '⚠ and the inventory view does NOT — it is a full line on every document');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('THE CONTROL IS ON THE DESK AND ON NO OTHER SURFACE');
  {
    const panel = liveLines(fn('_renderInvPanel'));
    has(panel, 'invSplitItemClick', 'the item panel offers it');
    has(panel, 'Another item in this photo', 'in those words');
    has(panel, 'ref.manual ?', '⚠ and not on a manual line — cash and an account have no photograph to split');

    // ⚠ NOT IN THE FIELD. Splitting is naming work, and the 2026-09-19 camera exists so the
    // field types nothing at all.
    ['_captureShot', '_fieldCamPaint', '_fieldCamShellHtml', '_roomShotStripHtml'].forEach((f) => {
      lacks(liveLines(fn(f)), 'invSplitItem', f + ' does not offer it');
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // ⚠ DRIVEN, NOT GREPPED — the first version of this asserted 'in this photo' against the
  // SOURCE of _renderInvRow, and wrapping the whole cue in `false ? … : ''` left it green:
  // the string is still in the file, and the row it renders no longer carries it. Caught by
  // reverting, not by reading. Same for the panel's control.
  group('⚠ THE RENDERED ROW SAYS HOW MANY OBJECTS SHARE THE FRAME');
  {
    const rowCtx = sandbox({
      fns: ['_renderInvRow', '_invRecipientInput', '_renderInvPanel', '_invDetailRefs', '_invPhotoSiblings',
            '_invPhotoSource', '_invDerivedRefs', '_getPhotoRef', '_invNamed', '_invItemNo'],
      vars: ['INV_RELEASE_DISPOSITIONS', 'INVENTORY_COLUMNS', '_invOpen', '_invPick'],
      stubs: {
        _invInput: () => '', _invThumbHTML: () => '<div></div>', _invRoomName: () => 'Entry & Living',
        invIsFirearm: () => false, invReleaseBlocked: () => false, invAwaitingAppraisal: () => false,
        custodyEvents: () => [], _invPanelCols: () => [], INV_PANEL_SECTIONS: [],
        _photoRefs: { 1: [
          { stableId: 'p', label: 'inventory', objectName: 'Bar console', itemNo: 12,
            driveFileId: 'FID', driveFileUrl: 'u', roomIdx: 1, ts: 1 },
          { stableId: 'd1', derivedFrom: 'p', label: 'inventory', objectName: 'Banksy print',
            itemNo: 13, driveFileId: 'FID', driveFileUrl: 'u', roomIdx: 1, ts: 2 },
          { stableId: 'd2', derivedFrom: 'p', label: 'inventory', objectName: 'B&O speaker',
            itemNo: 14, driveFileId: 'FID', driveFileUrl: 'u', roomIdx: 1, ts: 3 },
        ] },
      },
    });
    const shared = rowCtx._renderInvRow({ id: 1 }, rowCtx._getPhotoRef(1, 'p'));
    has(shared, '1 of 3 in this photo',
        'a row whose photograph carries three lines says so \u2014 two identical thumbnails read cold '
        + 'look exactly like a duplicated import, which somebody would then "tidy up" by deleting one');
    const derivedRow = rowCtx._renderInvRow({ id: 1 }, rowCtx._getPhotoRef(1, 'd1'));
    has(derivedRow, '1 of 3 in this photo', 'and so does the derived one');

    // The converse, or the cue is noise on every ordinary row in the manifest.
    const loneCtx = sandbox({
      fns: ['_renderInvRow', '_invRecipientInput', '_invDetailRefs', '_invPhotoSiblings', '_invPhotoSource',
            '_invDerivedRefs', '_getPhotoRef', '_invItemNo'],
      vars: ['INV_RELEASE_DISPOSITIONS', 'INVENTORY_COLUMNS', '_invOpen', '_invPick'],
      stubs: {
        _invInput: () => '', _invThumbHTML: () => '<div></div>', _invRoomName: () => 'Entry & Living',
        invIsFirearm: () => false, invReleaseBlocked: () => false, invAwaitingAppraisal: () => false,
        _photoRefs: { 1: [{ stableId: 'p', label: 'inventory', objectName: 'Sideboard',
                            driveFileId: 'X', roomIdx: 1, ts: 1 }] },
      },
    });
    lacks(loneCtx._renderInvRow({ id: 1 }, loneCtx._getPhotoRef(1, 'p')), 'in this photo',
          'an unsplit photograph says nothing');

    // And the panel's control, rendered rather than grepped.
    rowCtx._invOpen.p = true;
    const open = rowCtx._renderInvRow({ id: 1 }, rowCtx._getPhotoRef(1, 'p'));
    has(open, "invSplitItemClick(1,'p')", 'the open panel offers the split, wired to the real handler');
    has(open, 'Another item in this photo', 'in those words');
    has(open, '#13 Banksy print', 'and names every line already in the frame');
    rowCtx._invOpen.p = false;
    rowCtx._photoRefs[1].push({ stableId: 'm', label: 'inventory', manual: 1, objectName: 'Cash in the safe', roomIdx: 1, ts: 9 });
    rowCtx._invOpen.m = true;
    const manual = rowCtx._renderInvRow({ id: 1 }, rowCtx._getPhotoRef(1, 'm'));
    lacks(manual, 'invSplitItemClick',
          '\u26a0 and NOT on a manual line \u2014 cash and an account have no photograph to split');
  }
};
