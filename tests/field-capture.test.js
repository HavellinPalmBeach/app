'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// THE FIELD CAPTURE REBUILD (2026-09-19) — the plain-word tests from the plan, driven.
//
//   Two photos of one object produce one line.
//   A shot taken with no chip chosen files as Undecided, never as Keep.
//   The disposition chip survives from one shot to the next; the Appraise flag does not.
//   The camera returns to the room only when the concierge says so, not after every shot.
//   The filename carries no object name and no category — the desk names the line.
//   A room has two status taps and no others (see room-phase-carry.test.js).
//   Every "derived, not ticked" line reads the record the app already holds.
//   Checkbox ids are names, never a prefix plus an array index.
//   Job Admin is on the Inventory tab and nowhere on the Job Plan.
//   Firearms flagged at intake is the first thing on the Job Plan.
//
// Why this exists, in one anecdote (Anthony's): two friends bought clutter-removal
// franchises; the physical work is simple, and what killed one of their jobs was the
// inventory — a spreadsheet that took forever. So the field gets a faster camera and a
// cleaner screen, and the inventory gets the investment. Nothing here is a marketed
// feature; Havellin sells an attorney-ready inventory, and how it is made is internal.
// ─────────────────────────────────────────────────────────────────────────────

const { sandbox, source, fn, domStub } = require('./harness');

// ⚠ LINE-BASED, NOT A REGEX OVER THE WHOLE FILE. The usual `/\/\*[\s\S]*?\*\//` stripper pairs
// the `/*` inside every `accept="image/*"` attribute with a distant `*/` and silently eats
// ~170KB of live code — which made an absence check over the result pass over code that
// was still there. Found by measuring `live.length`, not by reading.
const liveLines = (s) => String(s).split('\n')
  .filter((l) => { const t = l.trim(); return !(t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')); })
  .join('\n');

const JOB = { id: 1, hvlId: 'HVL-0007', name: 'Butler Estate', svc: 'probate', won: true, status: 'won' };
const EST = { svc: 'probate', rooms: [{ idx: 0, name: 'Kitchen', tcH: 1, psH: 2 }] };

// The capture core with every side effect recorded and every async step made synchronous —
// compressImage hands the bytes straight back, so seq and id are taken in order.
function captureRig(over) {
  const uploads = [], synced = [], saved = [];
  const ctx = sandbox({
    fns: ['_captureShot', 'fieldDispToInv', '_cleanName', '_photoUid', '_slotRefs', '_getPhotoRef',
          '_setPhotoRef', '_fieldNoteAppend', '_invDetailRefs', '_jobInvRefs', '_invTouch', '_invAssignItemNos'],
    vars: ['_photoUidSeq', 'FIELD_DISPOSITIONS', 'FIELD_DISP_DEFAULT', 'PHOTO_CAPTURE_LABELS',
           '_localShotThumbs', 'INV_DEFAULT_CATEGORY'],
    stubs: Object.assign({
      jobs: [Object.assign({}, JOB)], _photoRefs: { 1: [] },
      estimateStore: { 1: { estimate: EST, approved: true } },
      _photoCaptureJob: (jid) => (jid === 1 ? Object.assign({}, JOB) : null),
      _photoStamp: () => '2026-09-19_101500',
      _photoRetryData: {}, _savePendingPhotoData() {},
      savePhotoRefs: (j) => saved.push(j),
      // The upload lands at once, so the completion path (thumbnail cache, manifest sync) runs.
      _doPhotoUpload: (jobId, dataUrl, filename, stableId, sub, onDone) => { uploads.push({ filename, stableId, sub }); if (onDone) onDone(); },
      _invCacheLocalThumb() {}, _scheduleInventorySync: (j) => synced.push(j),
      compressImage: (d, w, q, cb) => cb(d),
    }, over || {}),
  });
  return { ctx, uploads, synced, saved, refs: () => ctx._photoRefs[1] };
}

// The camera overlay against a DOM stub and a fake media device. `grant` decides what
// getUserMedia does: a stream, a refusal, or (absent) no in-page camera at all.
function cameraRig(grant) {
  const dom = domStub({});
  const tracks = [{ stopped: 0, stop() { this.stopped++; } }];
  const stream = { getTracks: () => tracks };
  // ⚠ A hand-rolled SYNCHRONOUS thenable, the house pattern: the runner's checks are flat and
  // synchronous, and a real Promise resolves on a later microtask — every check would run
  // before the camera had answered, green, proving nothing.
  const getUserMedia = grant === 'ok'
    ? () => ({ then(f) { f(stream); return { catch() {} }; } })
    : () => ({ then() { return { catch(g) { g({ name: 'NotAllowedError' }); } }; } });
  const nav = grant === 'none' ? {} : { mediaDevices: { getUserMedia } };
  const uploads = [];
  const ctx = sandbox({
    fns: ['openFieldCamera', 'closeFieldCamera', '_fieldCamStop', '_fieldCamGoNative', '_fieldCamShellHtml',
          '_fieldCamPaint', 'fieldCamSetDisp', 'fieldCamToggleAppr', 'fieldCamToggleDetail', '_fieldCamCommit',
          'fieldCamTypedNote', 'fieldCamNoteDraft', '_fieldCamPendingNote', '_fieldCamFlushNote',
          'fieldCamTalkStart', '_fieldCamRoomName', '_planRoom', '_getPhotoRef',
          '_captureShot', 'fieldDispToInv', '_cleanName', '_photoUid', '_slotRefs', '_setPhotoRef',
          '_fieldNoteAppend', '_invTouch', '_invDetailRefs'],
    vars: ['_fieldCam', 'FIELD_CAM_MODES', 'FIELD_DISPOSITIONS', 'FIELD_DISP_DEFAULT', 'PHOTO_CAPTURE_LABELS',
           '_localShotThumbs', '_photoUidSeq', 'INV_DEFAULT_CATEGORY'],
    stubs: {
      document: dom, navigator: nav,
      jobs: [Object.assign({}, JOB)], _photoRefs: { 1: [] },
      estimateStore: { 1: { estimate: EST, approved: true } },
      _photoCaptureJob: () => Object.assign({}, JOB),
      _photoStamp: () => '2026-09-19_101500',
      _photoRetryData: {}, _savePendingPhotoData() {}, savePhotoRefs() {},
      _doPhotoUpload: (j, d, filename, stableId) => uploads.push({ filename, stableId }),
      _invCacheLocalThumb() {}, _scheduleInventorySync() {},
      compressImage: (d, w, q, cb) => cb(d),
      _roomWs: { open: false }, _paintRoomWorkspace() {}, _repaintPlan() {},
      showSyncBadge() {}, setTimeout: () => 0,
    },
  });
  return { ctx, dom, tracks, uploads,
           ui: () => dom.getElementById('fc-ui').innerHTML,
           overlay: () => dom.getElementById('field-cam') };
}

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();
  const live = liveLines(src);
  ok(live.length > src.length * 0.5 && live.indexOf('function setPlanRoomStatus(') > 0,
     'the comment stripper kept the live code (found ' + live.length + ' of ' + src.length + ' chars)');

  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠⚠ THE FIELD TYPES NOTHING — a shot carries the pile, the flag and the note, never a name');
  {
    const r = captureRig();
    ok(r.ctx._captureShot(1, 0, 'inventory', 'data:image/jpeg;base64,AAA', { fieldDisp: 'sell', needsAppr: true }),
       'an item shot is accepted');
    const ref = r.refs()[0];
    eq(ref.label, 'inventory', 'it is an inventory line');
    eq(ref.objectName, '', '⚠⚠ with NO name — the desk names it');
    eq(ref.category, r.ctx.INV_DEFAULT_CATEGORY, 'and the default category — the desk files it');
    eq(ref.disposition, 'Sell', 'the field pile is the manifest disposition');
    eq(ref.needsAppr, true, 'and the flag rides the line');
    eq(ref.status, 'uploading', 'and it goes up');
    eq(r.uploads[0].sub, 'Estate Inventory', 'into the one photo folder');

    // ⚠ THE FILENAME CARRIES NO OBJECT NAME AND NO CATEGORY. Drive cannot rename after upload
    // and neither exists at capture time. Job, room, sequence, timestamp — the line links to it.
    eq(ref.filename, 'HVL-0007_Kitchen_INV_1_2026-09-19_101500.jpg', 'job, room, sequence, timestamp');
    lacks(ref.filename, 'General', 'no category');
    lacks(ref.filename, 'Item', 'and no placeholder name either');

    // The as-found and after passes are evidence, never lines.
    r.ctx._captureShot(1, 0, 'before', 'data:image/jpeg;base64,BBB', {});
    r.ctx._captureShot(1, 0, 'after', 'data:image/jpeg;base64,CCC', {});
    const before = r.refs().filter((x) => x.label === 'before')[0];
    eq(before.filename, 'HVL-0007_Kitchen_before_1_2026-09-19_101500.jpg', 'an as-found shot is named for its pass');
    ok(!('disposition' in before), 'and carries no disposition — it is not an item');
    eq(r.ctx._jobInvRefs(1).length, 1, '⚠ evidence shots never become inventory lines');
    eq(r.synced.length, 1, 'and only the inventory line schedules the manifest sync');
  }

  group('⚠⚠ NO CHIP CHOSEN FILES AS UNDECIDED, NEVER AS KEEP — and the five piles map to the desk\'s seven');
  {
    const r = captureRig();
    r.ctx._captureShot(1, 0, 'inventory', 'data:image/jpeg;base64,AAA', {});
    eq(r.refs()[0].disposition, '', '⚠⚠ an unsorted shot lands in "Not yet decided" — the worklist — not in Keep');
    eq(r.ctx.FIELD_DISP_DEFAULT, 'undecided', 'because Undecided is the default');
    eq(r.ctx.FIELD_DISPOSITIONS.map((d) => d.key), ['keep', 'donate', 'sell', 'remove', 'undecided'],
       'five chips: the piles a room is sorted into');
    eq(r.ctx.fieldDispToInv('keep'), 'Keep', 'Keep is Keep');
    eq(r.ctx.fieldDispToInv('donate'), 'Donate', 'Donate is Donate');
    eq(r.ctx.fieldDispToInv('sell'), 'Sell', 'Sell is Sell — the desk refines it into Auction, Consign or Sell');
    eq(r.ctx.fieldDispToInv('remove'), 'Junk', '⚠ Remove is the manifest\'s Junk');
    eq(r.ctx.fieldDispToInv('undecided'), '', 'Undecided is the empty bucket');
    eq(r.ctx.fieldDispToInv('hold'), '', '⚠ Hold is a desk flag, never a pile — the field cannot say it');
    eq(r.ctx.fieldDispToInv('appraise'), '', 'and Appraise is a toggle, not a pile');
  }

  group('⚠⚠ TWO PHOTOS OF ONE OBJECT PRODUCE ONE LINE');
  {
    const r = captureRig();
    r.ctx._captureShot(1, 0, 'inventory', 'data:image/jpeg;base64,AAA', { fieldDisp: 'sell' });
    const primary = r.refs()[0];
    r.ctx._captureShot(1, 0, 'detail', 'data:image/jpeg;base64,BBB', { groupId: primary.stableId });
    const detail = r.refs()[1];
    eq(detail.label, 'detail', 'the second shot is a detail');
    eq(detail.groupId, primary.stableId, 'linked to the primary at capture');
    eq(r.ctx._jobInvRefs(1).length, 1, '⚠⚠ one line on the manifest, not two');
    eq(r.ctx._invDetailRefs(1, primary.stableId).map((d) => d.stableId), [detail.stableId],
       'and the detail is found from the primary');
    has(detail.filename, '_DETAIL_', 'named as a detail in Drive');

    // Item numbers are issued to lines. A detail shot must never consume one — a number,
    // once issued, is spent forever, and a receipt has to cite an object, not a close-up.
    const numbered = r.ctx._invAssignItemNos(1);
    eq(numbered.length, 1, 'numbering walks the lines');
    eq(numbered[0].itemNo, 1, 'the primary is #1');
    ok(!detail.itemNo, '⚠ the detail is not numbered');

    // A detail with nothing to be a detail OF is an item shot — never a dropped photograph.
    const r2 = captureRig();
    r2.ctx._captureShot(1, 0, 'detail', 'data:image/jpeg;base64,AAA', { groupId: null });
    eq(r2.refs()[0].label, 'inventory', 'a detail toggled with no primary files as an item');

    // The desk's workbook walks the same numbered lines, so a detail cannot reach counsel as a row.
    has(fn('buildInventoryPayload'), '_invAssignItemNos(jobId)', 'the workbook rows come off the numbered lines');
    has(fn('_jobInvRefs'), "r.label === 'inventory'", 'and a line is an inventory-labelled ref, nothing else');
  }

  group('⚠ THE NOTE APPENDS, AND ONLY A REAL SHOT TAKES ONE');
  {
    const r = captureRig();
    r.ctx._captureShot(1, 0, 'inventory', 'data:image/jpeg;base64,AAA', {});
    const id = r.refs()[0].stableId;
    ok(r.ctx._fieldNoteAppend(1, id, 'signed on the base'), 'a note lands');
    ok(r.ctx._fieldNoteAppend(1, id, "Mom's from Italy"), 'a second one');
    eq(r.refs()[0].fieldNote, "signed on the base Mom's from Italy", 'appended, never replaced');
    ok(!r.ctx._fieldNoteAppend(1, id, '   '), 'blank says nothing');
    ok(!r.ctx._fieldNoteAppend(1, 'nope', 'x'), 'and a shot that does not exist takes nothing');
    eq(r.synced.length, 3, 'each note on an inventory line re-syncs the manifest');

    // The refusals: an unknown label, and a job the client has not accepted.
    ok(!r.ctx._captureShot(1, 0, 'selfie', 'data:image/jpeg;base64,AAA', {}), 'an unknown label is refused');
    ok(!r.ctx._captureShot(2, 0, 'inventory', 'data:image/jpeg;base64,AAA', {}), 'and so is an unwon job');
    eq(r.refs().length, 1, 'neither recorded anything');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠⚠ THE CAMERA STAYS OPEN UNTIL DONE — the chip latches, the toggles reset');
  {
    const c = cameraRig('ok');
    ok(c.ctx.openFieldCamera(1, 0, 'inventory'), 'the camera opens on a won job');
    eq(c.overlay().style.display, 'flex', 'full screen');
    has(c.overlay().innerHTML, '<video id="fc-video" autoplay muted playsinline>', '⚠ a live viewfinder, inline and muted — iOS refuses autoplay otherwise');
    const v = c.dom.getElementById('fc-video');
    eq(v.srcObject && typeof v.srcObject.getTracks, 'function', 'the stream is attached');
    v.onloadedmetadata();
    eq(c.ctx._fieldCam.ready, true, 'and the shutter arms once the stream has a frame');
    has(c.ui(), 'onclick="fieldCamShoot()"', 'the shutter is ours');
    lacks(c.ui(), 'fieldCamNativeShot', 'not the native input');

    // Pick a pile, flag the next shot, shoot.
    c.ctx.fieldCamSetDisp('donate');
    c.ctx.fieldCamToggleAppr();
    ok(/fc-tog on" onclick="fieldCamToggleAppr\(\)"/.test(c.ui()), 'Appraise paints lit');
    ok(/fc-tog on" onclick="fieldCamToggleDetail\(\)"/.test(c.ui()) === false, 'Detail is not lit');
    has(c.ui(), 'onclick="fieldCamToggleDetail()" disabled', '⚠ and cannot be lit yet — there is no last item to be a detail of');
    ok(c.ctx._fieldCamCommit('data:image/jpeg;base64,AAA'), 'shot one');
    eq(c.ctx._fieldCam.open, true, '⚠⚠ THE CAMERA IS STILL OPEN');
    eq(c.overlay().style.display, 'flex', 'and still on screen');
    eq(c.ctx._fieldCam.disp, 'donate', '⚠⚠ THE CHIP SURVIVES to the next shot');
    eq(c.ctx._fieldCam.appr, false, '⚠⚠ THE APPRAISE FLAG DOES NOT');
    eq(c.ctx._fieldCam.count, 1, 'one shot counted');
    eq(c.dom.getElementById('fc-count').textContent, '1 shot', 'and said');
    const first = c.ctx._photoRefs[1][0];
    eq(first.disposition, 'Donate', 'the pile reached the record');
    eq(first.needsAppr, true, 'and so did the flag, on this shot only');

    // Shot two: same chip, no flag, as a detail of the first.
    lacks(c.ui(), 'onclick="fieldCamToggleDetail()" disabled', 'Detail is offered now there is a last item');
    c.ctx.fieldCamToggleDetail();
    eq(c.ctx._fieldCam.detail, true, 'toggled');
    c.ctx._fieldCamCommit('data:image/jpeg;base64,BBB');
    const second = c.ctx._photoRefs[1][1];
    eq(second.label, 'detail', 'the second shot is a detail');
    eq(second.groupId, first.stableId, 'of the first');
    eq(c.ctx._fieldCam.detail, false, '⚠ and the detail toggle resets too');
    eq(c.ctx._fieldCam.last, first.stableId, 'the primary is still the first — a detail never becomes the primary');
    eq(c.ctx._fieldCam.disp, 'donate', 'the chip is still latched');
    eq(c.ctx._fieldCam.open, true, 'and the camera is still open after two shots');

    // Shot three: a new item under the same chip.
    c.ctx._fieldCamCommit('data:image/jpeg;base64,CCC');
    const third = c.ctx._photoRefs[1][2];
    eq(third.label, 'inventory', 'the third is a new item');
    eq(third.disposition, 'Donate', 'still in the Donate pile');
    eq(third.needsAppr, false, 'not flagged — the flag was for shot one alone');
    eq(c.ctx._fieldCam.last, third.stableId, 'and it is the primary now');

    // A typed note lands on the last shot.
    c.dom.getElementById('fc-note-input').value = 'promised to Karen';
    ok(c.ctx.fieldCamTypedNote(), 'the note is taken');
    eq(third.fieldNote, 'promised to Karen', 'on the last shot');
    eq(c.dom.getElementById('fc-note-input').value, '', 'and the box clears');

    // Done, and only Done.
    eq(c.tracks[0].stopped, 0, 'the stream is live until Done');
    c.ctx.closeFieldCamera();
    eq(c.ctx._fieldCam.open, false, 'Done closes it');
    eq(c.overlay().style.display, 'none', 'off screen');
    eq(c.tracks[0].stopped, 1, '⚠ and the camera hardware is released');
    eq(c.uploads.length, 3, 'three uploads went out');

    // ⚠ NOTHING ON THE SHOT PATH CLOSES THE CAMERA. Pinned at source as well as driven.
    lacks(fn('_fieldCamCommit'), 'closeFieldCamera', '_fieldCamCommit never closes it');
    lacks(fn('_captureShot'), 'closeFieldCamera', 'nor does the capture core');
    lacks(fn('_fieldNoteAppend'), 'closeFieldCamera', 'nor a note');
  }

  // ⚠⚠ THE THREE THINGS THAT COMMIT A TYPED NOTE, AND THERE IS NO FOURTH. Reported from the
  // field 2026-09-20: "we don't need to hit add, it's another step." There is no Add button
  // now, so what has to hold is that Enter, the next shutter and Done each save the words —
  // and that they save them against the RIGHT photograph.
  group('⚠⚠ a typed note is committed by Done, by the next shutter, and by Enter');
  {
    // ── Done. Measured on the real page before this was built: the note came back null while
    //    the photograph saved perfectly, so the words were silently destroyed.
    const c = cameraRig('ok');
    c.ctx.openFieldCamera(1, 0, 'before');
    c.ctx._fieldCamCommit('data:image/jpeg;base64,AAA');
    const shot = c.ctx._photoRefs[1][0];
    c.ctx.fieldCamNoteDraft('water stain on the sill');
    c.dom.getElementById('fc-note-input').value = 'water stain on the sill';
    c.ctx.closeFieldCamera();
    eq(shot.fieldNote, 'water stain on the sill',
       '⚠ Done SAVES the note — it used to blank the overlay and throw it away');
    eq(c.ctx._fieldCam.open, false, 'and still closes the camera');

    // ── The next shutter, and this is the one that files it on the wrong object when it is
    //    wrong: `lastAny` moves the instant the next shot lands.
    const d = cameraRig('ok');
    d.ctx.openFieldCamera(1, 0, 'inventory');
    d.ctx._fieldCamCommit('data:image/jpeg;base64,AAA');
    const first = d.ctx._photoRefs[1][0];
    d.ctx.fieldCamNoteDraft('mahogany side table');
    d.dom.getElementById('fc-note-input').value = 'mahogany side table';
    d.ctx._fieldCamCommit('data:image/jpeg;base64,BBB');
    const second = d.ctx._photoRefs[1][1];
    eq(first.fieldNote, 'mahogany side table',
       '⚠⚠ the words land on the shot they were typed about');
    ok(!second.fieldNote, 'and NOT on the object photographed next');
    eq(d.ctx._fieldCam.noteFor, null, 'the draft is spent');

    // ── And the box does not carry it into the next note.
    d.ctx.fieldCamNoteDraft('walnut chest');
    d.dom.getElementById('fc-note-input').value = 'walnut chest';
    d.ctx.closeFieldCamera();
    eq(second.fieldNote, 'walnut chest', 'the second note is the second shot\u2019s');
    eq(first.fieldNote, 'mahogany side table', 'and the first is untouched');
  }

  // ⚠ THE BUTTON IS GONE, DELIBERATELY — the converse of the group above. A control that does
  // a fourth time what three other things already do is a step that exists to be forgotten.
  group('⚠ there is no Add / Save-note button to forget');
  {
    const c = cameraRig('ok');
    c.ctx.openFieldCamera(1, 0, 'inventory');
    c.ctx._fieldCamCommit('data:image/jpeg;base64,AAA');
    const ui = c.ui();
    lacks(ui, '>Add<', 'no Add button');
    lacks(ui, 'Save note', 'and nothing renamed to Save note either');
    has(ui, 'id="fc-note-input"', 'the box itself is still there');
    has(ui, 'fieldCamNoteDraft(this.value)', 'and every keystroke is kept');
    has(ui, 'saved automatically', 'the placeholder says so, since nothing else can');
  }

  group('⚠ THE CAMERA DEGRADES TO THE NATIVE INPUT ON THE SAME SURFACE');
  {
    const refused = cameraRig('refused');
    refused.ctx.openFieldCamera(1, 0, 'inventory');
    eq(refused.ctx._fieldCam.native, true, 'a refused permission drops to native');
    has(refused.dom.getElementById('fc-stage').innerHTML, 'Camera permission was refused', 'and says why');
    has(refused.ui(), 'fieldCamNativeShot(this)', 'the shutter is the native input now');
    has(refused.ui(), 'capture="environment"', 'opening the phone\'s camera');
    has(refused.ui(), "fieldCamSetDisp('keep')", '⚠ with the same chips');
    has(refused.ui(), 'fieldCamToggleAppr()', 'and the same toggle — one UI, two ways of producing the bytes');
    lacks(refused.ui(), 'fieldCamShoot()', 'and no dead shutter');

    const none = cameraRig('none');
    none.ctx.openFieldCamera(1, 0, 'before');
    eq(none.ctx._fieldCam.native, true, 'no in-page camera at all drops to native too');
    lacks(none.ui(), 'fieldCamSetDisp', 'and the as-found pass has no chips — evidence is not sorted');
    lacks(none.ui(), 'fieldCamToggleAppr', 'and no Appraise');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠⚠ DERIVED, NOT TICKED — every line reads the record the app already holds');
  {
    const calls = [];
    const d = sandbox({
      fns: ['planDerivedLines', 'planDerivedHtml', 'planTaskCtx', '_planRooms', 'roomStatusNormalize',
            'firearmsFlaggedAtIntake', 'houseFlagsOf', '_jobInvRefs', '_srcLineKey'],
      vars: ['TC_DONE_STATUSES', 'PS_DONE_STATUSES', 'ROOM_STATUS_META', 'ROOM_STATUS_LEGACY', 'jobPlanStore',
             'estimateStore', 'INV_RELEASE_DISPOSITIONS', 'FIREARMS_PROTOCOL_DOC', 'HOUSE_FLAGS', 'changeOrders'],
      stubs: {
        isFormalDoc: () => false,
        isAgreementSigned: (j) => { calls.push('isAgreementSigned'); return !!j.sig; },
        isJobFunded: (j) => { calls.push('isJobFunded'); return !!j.funded; },
        depositPaidTotal: () => 12858,
        docSentAt: (j, k, s) => { calls.push('docSentAt:' + k + ':' + s); return (j.sent || {})[k + ':' + s] || null; },
        stagePaidTotal: (j, s) => { calls.push('stagePaidTotal:' + s); return (j.paid || {})[s] || 0; },
        jobLogEntries: () => [{ members: [{ role: 'TC', hours: 4 }, { role: 'PS', hours: 8 }] }],
        _photoRefs: { 7: [] },
      },
    });
    const est = { svc: 'probate', totTC: 10, totPS: 20, vendors: [{ type: 'Junk removal', lid: 'a' }],
                  rooms: [{ idx: 0, name: 'Kitchen' }, { idx: 1, name: 'Garage' }, { idx: 2, name: 'Bath', excluded: true }] };
    d.estimateStore[7] = { estimate: est, approved: true };
    d.changeOrders.push({ jobId: 7, clientApproved: true }, { jobId: 7, clientApproved: false }, { jobId: 8, clientApproved: false });
    const job = { id: 7, svc: 'probate', executorAuth: 'received', probateAttyName: 'Pressly', probateDeadline: '2026-11-19',
                  sent: { 'invoice:midpoint': '2026-09-20' }, paid: { midpoint: 0 }, vendorSourcing: { La: { status: 'Confirmed' } } };
    d.jobPlanStore[7] = { rooms: { 0: { status: 'locked' }, 1: { status: 'packed' } } };

    const p0 = d.planDerivedLines(7, job, est, 'p0');
    const k = (lines) => lines.map((l) => l.key + ':' + (l.ok ? 'ok' : 'open'));
    eq(k(p0), ['agreement_signed:open', 'deposit_received:open', 'letters:ok', 'attorney_on_file:ok', 'deadline_733604:ok'],
       'Phase 0 reads the signature, the deposit, the Letters, the attorney and the deadline');
    ok(calls.indexOf('isAgreementSigned') >= 0 && calls.indexOf('isJobFunded') >= 0,
       '⚠⚠ off the SAME predicates the Client Dashboard uses — not a private copy');

    eq(k(d.planDerivedLines(7, job, est, 'p1')), ['rooms_locked:ok'], 'Phase 1: every in-scope room is locked (packed counts — it is cleared)');
    has(d.planDerivedLines(7, job, est, 'p1')[0].detail, '2 of 2', 'the excluded room is not counted');

    const p2 = d.planDerivedLines(7, job, est, 'p2');
    eq(k(p2), ['midpoint_sent:ok', 'midpoint_received:open', 'vendors_confirmed:ok'],
       'Phase 2 reads the send record, the recorded payments and the sourcing status');
    ok(calls.indexOf('docSentAt:invoice:midpoint') >= 0, '⚠⚠ "midpoint invoice sent" is the DOCUMENT RECORD');
    ok(calls.indexOf('stagePaidTotal:midpoint') >= 0, '⚠⚠ and "received" is the PAYMENTS LIST');
    ok(p2[1].action && /openInvoiceFor\(7,'midpoint'\)/.test(p2[1].action.call) || /openInvoiceFor\(7,'midpoint'\)/.test(p2[0].action.call),
       'with the one door to the invoice');

    const p4 = d.planDerivedLines(7, job, est, 'p4');
    eq(k(p4), ['rooms_cleared:open', 'hours_logged:ok', 'change_orders:open', 'final_invoice_sent:open'], 'Phase 4');
    has(p4[0].detail, '1 of 2', 'one room cleared (the legacy packed one)');
    has(p4[1].detail, '12 hrs against 30 estimated', 'hours off the log');
    has(p4[2].detail, '1 of 2', 'change orders off the change-order store, this job only');

    const html = d.planDerivedHtml(7, job, est, 'p2');
    has(html, 'id="plan-derived-p2-7"', 'rendered as one block');
    has(html, 'pl-line pl-ok', 'a green line');
    has(html, 'pl-line pl-open', 'and an open one');
    lacks(html, 'type="checkbox"', '⚠⚠ NOT ONE CHECKBOX — these cannot be ticked');
  }

  group('⚠⚠ THE MIDPOINT\'S PRIVATE BOOLEANS ARE GONE, not left dead');
  {
    lacks(live, 'midpointInvoiceSent', 'nothing live reads or writes job.midpointInvoiceSent');
    lacks(live, 'midpointReceived', 'nor job.midpointReceived');
    lacks(live, 'function setMidpointSent', 'the setter is deleted');
    lacks(live, 'function midpointGateHtml', 'and the gate that rendered the boxes');
    has(fn('defaultInvStage'), "docSentAt(job, 'invoice', 'midpoint')", 'the invoice-stage default reads the send record instead');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠⚠ CHECKBOXES ARE NAMED, NEVER prefix + array index');
  {
    const t = sandbox({ fns: ['planTasksFor', 'planTaskCtx', 'firearmsFlaggedAtIntake', 'houseFlagsOf'],
                        vars: ['PLAN_TASKS', 'JOB_ADMIN_TASKS', 'FIREARMS_PROTOCOL_DOC', 'HOUSE_FLAGS'],
                        stubs: { isFormalDoc: () => false } });
    const keys = t.PLAN_TASKS.map((x) => x.key);
    eq(new Set(keys).size, keys.length, 'every key is distinct');
    keys.concat(t.JOB_ADMIN_TASKS.map((x) => x.key)).forEach((key) => {
      ok(/^[a-z][a-z_]+[a-z]$/.test(key), key + ' is a name — no digits, so no list can be re-ordered under it');
    });
    t.PLAN_TASKS.forEach((x) => ok(x.phase && x.sec && x.label, x.key + ' has a phase, a section and a label'));

    // The old positional prefixes are gone from live code.
    ['p0_admin_', 'p0_crew_', 'p0_access_', 'p0_auth_', 'p1_gate_', 'p1_coc_', 'p1_doc_', 'p2_gate_', 'p2_vx_',
     'p4_fin_', 'p4_court_', 'p4_done_', 'dc_p'].forEach((pre) => lacks(live, "'" + pre, pre + ' keys are gone'));
    lacks(live, 'function chks(prefix, list)', 'and so is the closure that minted them');

    // Which boxes a job gets.
    const on = (job, est) => t.planTasksFor(t.PLAN_TASKS, null, t.planTaskCtx(job, est)).map((x) => x.key);
    const estate = on({ svc: 'cleanout', houseFlags: { firearms: { on: true, note: 'hall safe' } } }, { svc: 'cleanout' });
    ['precall', 'access_tested', 'crew_briefed', 'coi_provided', 'firearms_in_place', 'nfa_check',
     'docs_sequestered', 'cash_logged', 'coc_pickup_present', 'shred_done', 'broom_clean', 'home_empty',
     'satisfaction_call', 'review_ask', 'referral_ask'].forEach((key) => ok(estate.indexOf(key) >= 0, 'estate settlement keeps ' + key));
    // ⚠⚠ RESTATED 2026-09-20, NOT DELETED. This list pinned `nda_signed` as a box every labour
    // job gets. Anthony: *"we do not require NDAs for staff on all jobs. confidentiality is baked
    // into our 1099 employment agreements."* So the box asked a person to attest to a signature
    // nobody takes, and the estate agreement's §7 bullet promising it was corrected in the same
    // commit. The requirement is now the converse, and it is the one worth pinning: the box is
    // gone from every service, and nothing may put it back without the process behind it.
    ok(estate.indexOf('nda_signed') < 0,
       '⚠⚠ and NOT a per-job NDA — confidentiality is standing, in the contractor agreement');
    ok(estate.indexOf('pr_authority') < 0, 'but not the probate gate — no Letters on an estate settlement');
    ok(estate.indexOf('mv_eta') < 0 && estate.indexOf('nh_floorplan') < 0, 'nor move day');
    ok(estate.length >= 14 && estate.length <= 22, 'about fifteen to twenty (found ' + estate.length + ')');

    const probate = on({ svc: 'probate' }, { svc: 'probate' });
    ok(probate.indexOf('pr_authority') >= 0, 'probate keeps the PR-authority box on the field surface');
    ok(probate.indexOf('firearms_in_place') >= 0, 'and the firearms boxes on every documentation job, flagged or not');

    const living = on({ svc: 'downsizing' }, { svc: 'downsizing' });
    ok(living.indexOf('firearms_in_place') < 0, 'a living-client job with no firearms flag has no firearms box');
    ok(living.indexOf('docs_sequestered') < 0 && living.indexOf('shred_done') < 0 && living.indexOf('home_empty') < 0,
       'nor the estate boxes');
    const livingArmed = on({ svc: 'downsizing', houseFlags: { firearms: { on: true } } }, { svc: 'downsizing' });
    ok(livingArmed.indexOf('firearms_in_place') >= 0 && livingArmed.indexOf('nfa_check') >= 0,
       '⚠ but firearms flagged at intake puts them on any job');

    const move = on({ svc: 'downsizing_move', re: 'yes' }, { svc: 'downsizing_move' });
    eq(move.filter((x) => x.indexOf('mv_') === 0).length, 13, 'Home Transition keeps the whole move-day sequence');
    eq(move.filter((x) => x.indexOf('nh_') === 0).length, 5, 'and the new-home prep');
    ok(move.indexOf('re_handoff') >= 0 && move.indexOf('re_disclosed') >= 0, 'and the RE handoff when the client came through real estate');

    const admin = (job, est) => t.planTasksFor(t.JOB_ADMIN_TASKS, null, t.planTaskCtx(job, est)).map((x) => x.key);
    ok(admin({ svc: 'probate' }, { svc: 'probate' }).indexOf('ct_inventory') >= 0, 'Job Admin carries the court list on probate');
    ok(admin({ svc: 'cleanout' }, { svc: 'cleanout' }).indexOf('ct_inventory') < 0, 'and not on an estate settlement');
    ok(admin({ svc: 'downsizing' }, { svc: 'downsizing' }).indexOf('fin_proceeds') < 0, 'nor proceeds on a job that sells nothing');
  }

  group('⚠ JOB ADMIN IS ON THE INVENTORY TAB, and reading a tick never mints a plan');
  {
    const a = sandbox({
      fns: ['renderJobAdmin', 'planTaskCtx', 'planTasksFor', '_planTaskDone', 'planDerivedLines', 'planDerivedHtml',
            'planTaskSectionsHtml', 'planSubsec', 'chkGrid', 'planChk', '_planRooms', 'roomStatusNormalize',
            'firearmsFlaggedAtIntake', 'houseFlagsOf', '_jobInvRefs', '_srcLineKey'],
      vars: ['JOB_ADMIN_TASKS', '_jobAdminOpen', 'jobPlanStore', 'estimateStore', 'TC_DONE_STATUSES', 'PS_DONE_STATUSES',
             'ROOM_STATUS_META', 'ROOM_STATUS_LEGACY', 'INV_RELEASE_DISPOSITIONS', 'FIREARMS_PROTOCOL_DOC', 'HOUSE_FLAGS', 'changeOrders'],
      stubs: { isFormalDoc: () => false, isJobWon: (j) => !!j.won, docSentAt: () => null, jobLogEntries: () => [],
               isAgreementSigned: () => false, isJobFunded: () => false, depositPaidTotal: () => 0, stagePaidTotal: () => 0,
               _photoRefs: { 7: [] } },
    });
    a.estimateStore[7] = { estimate: { svc: 'probate', rooms: [{ idx: 0, name: 'Kitchen' }] }, approved: true };
    eq(a.renderJobAdmin(7, { id: 7, svc: 'probate', won: false }), '', 'nothing for a job the client has not accepted');
    const folded = a.renderJobAdmin(7, { id: 7, svc: 'probate', won: true });
    has(folded, 'class="ja-card"', 'a card for a won job');
    has(folded, 'toggleJobAdmin(7)', 'folded, with a header to open it');
    has(folded, '0 of 12 ticked', 'counting the probate list');
    lacks(folded, 'type="checkbox"', 'no boxes until opened');
    a._jobAdminOpen[7] = true;
    const open = a.renderJobAdmin(7, { id: 7, svc: 'probate', won: true });
    has(open, "'ct_filed'", 'opened, the court list is there');
    has(open, "'fin_vendor_invoices'", 'and the financial close');
    has(open, 'plan-derived-p4-7', 'above the close-out facts the app derives');
    ok(!a.jobPlanStore[7], '⚠⚠ rendering twelve unticked boxes minted NO plan record for the job');

    has(fn('renderInventoryTab'), 'renderJobAdmin(jobId, job)', 'the Inventory tab renders it, first');
    lacks(fn('renderJobPlan'), 'renderJobAdmin', 'the Job Plan does not');
    lacks(fn('renderJobPlan'), 'JOB_ADMIN_TASKS', 'nor its list');
    has(fn('planChk'), '_planTaskDone(jobId, key)', 'planChk reads without minting');
    lacks(fn('planChk'), 'getJobPlan', 'and never through the accessor that does');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠⚠ THE JOB PLAN, DRIVEN — rooms once, firearms first, the old boxes gone');
  {
    const dom = domStub({});
    const j = sandbox({
      fns: ['renderJobPlan', 'planTaskCtx', 'planTasksFor', 'planTasksHtml', 'planTaskSectionsHtml', 'planSubsec', 'chkGrid',
            'planChk', '_planTaskDone', 'planPhaseWrap', 'planDerivedHtml', 'planDerivedLines', '_planRooms', '_planRoomStatus',
            '_planRoomListHtml', '_shotCount', '_slotRefs', 'roomStatusNormalize', 'firearmsBannerHtml', 'firearmsWorkspaceLine',
            'firearmsFlaggedAtIntake', '_firearmsRow', 'houseFlagsOf', '_jobInvRefs', '_srcLineKey',
            // The stages (2026-09-19, evening): the gate chips, the fold counts, the current stage.
            'planGateChipsHtml', 'vendorSourcingProgress', 'planStageMeta', 'planHoursMeta', 'planHoursMetaHtml', '_hrsTxt', '_todayStr',
            // The open job body (2026-09-20): stage cards on a thread, marked off the stage the job is in.
            'planStageCard', 'planStageState', 'planCurrentStage'],
      vars: ['SVC_LABELS', '_planOpenPhases', 'PLAN_TASKS', 'PLAN_FLOW', 'FIREARMS_PROTOCOL_DOC', 'HOUSE_FLAGS', 'jobPlanStore', 'estimateStore',
             'TC_DONE_STATUSES', 'PS_DONE_STATUSES', 'ROOM_STATUS_META', 'ROOM_STATUS_LEGACY', 'INV_RELEASE_DISPOSITIONS', 'changeOrders'],
      stubs: {
        document: dom, isFormalDoc: () => false,
        // The brief renders through its host since 2026-09-19 (a Found tick repaints it in place).
        _sfHost: () => '<div id="sf-host-plan"><div class="sf-brief">BRIEF</div></div>',
        renderVendorSourcing: () => '', renderVendorScorecard: () => '', renderDailyCloseBlock: () => '',
        _importableFromEstimate: () => ({ collections: [], vehicles: [] }), getPlanNote: () => '',
        paymentSplit: () => ({ midpoint: 1000 }),
        // The header carries the dashboard's schedule strip since 2026-09-20; job-plan-stages drives the real one.
        planScheduleHtml: () => '<div class="plan-sched">STRIP</div>',
        docSentAt: () => null, isAgreementSigned: () => false, isJobFunded: () => false, depositPaidTotal: () => 0,
        stagePaidTotal: () => 0, jobLogEntries: () => [], _photoRefs: { 7: [] },
      },
    });
    const est = { svc: 'cleanout', rooms: [{ idx: 0, name: 'Kitchen', tcH: 1, psH: 2 }, { idx: 1, name: 'Garage', tcH: 2, psH: 4, note: 'boat gear' },
                                            { idx: 2, name: 'Guest Bath', excluded: true, note: 'owner keeps' }] };
    j.estimateStore[7] = { estimate: est, approved: true };
    const job = { id: 7, name: 'Butler Estate', svc: 'cleanout', won: true, houseFlags: { firearms: { on: true, note: 'Two in the hall safe' } } };
    const out = j.renderJobPlan(7, job, est);
    const hdr = dom.getElementById('job-plan-header').innerHTML;

    // The banner.
    eq(hdr.indexOf('<div class="fa-banner">'), 0, '⚠⚠ FIREARMS IS THE FIRST THING ON THE TAB');
    has(hdr, 'Two in the hall safe', 'carrying what intake wrote down');
    has(hdr, 'firearms-protocol.html', 'and the protocol link');
    ok(hdr.indexOf('fa-banner') < hdr.indexOf('Client:'), 'above the client line');
    has(hdr, 'BRIEF', 'and the standing-flags brief still follows');
    ok(hdr.indexOf('Client:') < hdr.indexOf('<div class="plan-sched">STRIP') && hdr.indexOf('plan-sched') < hdr.indexOf('BRIEF'),
       'the schedule strip sits under the client line and above the brief (2026-09-20)');

    // Rooms, once.
    eq((out.match(/openRoomWorkspace\(7,0\)/g) || []).length, 1, 'the kitchen is one row');
    eq((out.match(/openRoomWorkspace\(7,1\)/g) || []).length, 1, 'the garage is one row');
    eq((out.match(/openRoomWorkspace\(7,2\)/g) || []).length, 0, '⚠ the excluded bath is not a row');
    has(out, 'rl-excl', 'it is named in the not-in-scope line instead');
    has(out, 'Guest Bath', 'by name');
    has(out, 'boat gear', 'and a room note rides its row');
    lacks(out, 'plan-room-block-p1', 'no Phase 1 grid');
    lacks(out, 'plan-room-block-p2', 'no Phase 2 grid — a room is drawn once');
    has(out, 'id="plan-rooms-7"', 'inside the container the repaint rewrites');
    // ⚠ FOUND IN THE BROWSER, NOT BY A TEST. The first cut put the room list inside Phase 1, and
    // every phase starts CLOSED (job-plan-accordion pins that) — so the whole field surface sat
    // behind a tap on "Phase 1", and the driven Playwright run could not click a room at all.
    // domStub has no notion of display, so nothing in this file could see it. The rooms sit
    // ABOVE the accordion now; the assertion is on rendered ORDER, which is what a closed body hides.
    // ⚠ RESTATED 2026-09-19 (evening). The rooms sat ABOVE every fold for a day; Anthony read that as out
    // of order (vendors and the pre-job call come first in a real job). The requirement was never
    // "first" — it was NEVER INSIDE A CLOSED BODY. They sit between Before Day 1 and Hours now, and the
    // end marker planPhaseWrap emits is what lets a string prove it. job-plan-stages.test.js has the rest.
    // ⚠ RESTATED 2026-09-20. The folds came off the job body: only the two tools (Vendors, Hours) fold, at
    // the top, and the rooms are an open card on the flow AFTER both have closed. Same requirement, one
    // fewer way to break it.
    ok(out.indexOf('id="plan-rooms-7"') > out.lastIndexOf('<!--/stage-hours-->') && out.indexOf('id="plan-rooms-7"') > out.indexOf('<!--/stage-p0-->')
       && out.indexOf('id="plan-rooms-7"') < out.indexOf('<!--/stage-rooms-->'),
       '⚠ the room list sits in its own open card after every fold has closed — never inside a closed body');
    eq((out.match(/id="phase-body-/g) || []).length, 2, 'and there are exactly two folds on the plan, both tools');

    // The lines and the boxes.
    // ⚠ RESTATED 2026-09-19 (evening). Before Day 1's derived lines are the GATE CHIPS at the top of the
    // plan and the rooms-locked line is the count on the rooms header; only Midpoint & pickups and
    // Close-out still draw a derived block. Four surfaces, one rule each.
    has(out, 'id="plan-gates-7"', 'the gates render as a chip row');
    ['agreement_signed', 'deposit_received', 'attorney_on_file'].forEach((k) => has(out, 'data-gate="' + k + '"', k + ' is a gate chip'));
    has(out, '<span class="stg-count">0 of 2 locked &middot; 0 cleared</span>', 'the rooms card heading carries the locked count');
    ['p2', 'p4'].forEach((ph) => has(out, 'plan-derived-' + ph + '-7', ph + ' still has its derived lines'));
    lacks(out, 'plan-derived-p0-7', 'and Before Day 1 does not repeat the chips as lines');
    ["'firearms_in_place'", "'nfa_check'", "'docs_sequestered'", "'cash_logged'", "'coc_pickup_present'", "'shred_done'",
     "'broom_clean'", "'home_empty'", "'satisfaction_call'", "'precall'", "'crew_briefed'"]
      .forEach((k) => has(out, k, k + ' is a real box'));
    // ⚠ RESTATED 2026-09-20: driven on the real plan, the per-job NDA box is not on it. See the
    // kept-list group above for why — the obligation is in the contractor agreement, not a tick.
    lacks(out, "'nda_signed'", '⚠⚠ and the per-job NDA box is not drawn on any job');
    ["'fin_vendor_invoices'", "'ct_inventory'", "'rec_archived'"].forEach((k) => lacks(out, k, k + ' is desk work, not on the plan'));
    ["'pr_authority'", "'mv_eta'", "'nh_floorplan'", "'re_disclosed'"].forEach((k) => lacks(out, k, k + ' does not apply to this job'));
    const boxes = (out.match(/type="checkbox"/g) || []).length;
    ok(boxes >= 14 && boxes <= 22, 'about fifteen to twenty boxes on an estate settlement (found ' + boxes + ')');
    has(out, 'Job Admin', 'and the plan says where the desk work went');
    lacks(out, 'Daily projection checked and signed off', 'the per-day self-attestation is gone');

    // A living-client job with nothing flagged: no banner, no firearms boxes.
    const dom2 = domStub({});
    j.document = dom2;
    j.estimateStore[8] = { estimate: { svc: 'downsizing', rooms: [{ idx: 0, name: 'Den', tcH: 1, psH: 1 }] }, approved: true };
    const out2 = j.renderJobPlan(8, { id: 8, name: 'Ellsworth', svc: 'downsizing', won: true }, j.estimateStore[8].estimate);
    lacks(dom2.getElementById('job-plan-header').innerHTML, 'fa-banner', 'no banner without the flag');
    lacks(out2, "'firearms_in_place'", 'no firearms box');
    lacks(out2, "'home_empty'", 'a downsizing does not empty the home');
    ok((out2.match(/type="checkbox"/g) || []).length < boxes, 'and fewer boxes than an estate');
  }

  group('⚠ THE FIREARMS BANNER — big, red, and only when intake said so');
  {
    const f = sandbox({ fns: ['firearmsBannerHtml', 'firearmsWorkspaceLine', 'firearmsFlaggedAtIntake', '_firearmsRow', 'houseFlagsOf'],
                        vars: ['FIREARMS_PROTOCOL_DOC', 'HOUSE_FLAGS'] });
    eq(f.firearmsBannerHtml({ houseFlags: {} }), '', 'nothing when not flagged');
    eq(f.firearmsBannerHtml({}), '', 'nothing on a job intake never asked');
    const b = f.firearmsBannerHtml({ houseFlags: { firearms: { on: true, note: '' } } });
    has(b, 'class="fa-banner"', 'a banner when flagged');
    has(b, 'FIREARMS IN THIS HOUSE', 'that says what it is');
    has(b, 'written authority', 'and the standing rule');
    has(b, 'Ticked at intake, no detail recorded', 'and that nobody wrote down where');
    has(b, 'href="firearms-protocol.html"', 'with the protocol');
    has(f.firearmsWorkspaceLine({ houseFlags: { firearms: { on: true } } }), 'class="fa-line"', 'and the room workspace carries a slim line');
    has(fn('_paintRoomWorkspace'), 'firearmsWorkspaceLine(job)', 'rendered on every room of a flagged job');
    has(src, '.fa-banner{background:#8b1e1e', 'it is red');
    has(fn('renderJobPlan'), 'var hdr = firearmsBannerHtml(job) +', 'and it is the first thing in the header');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠ THE INVENTORY TAB — unnamed shots are the first pile, the note and the details ride the row');
  {
    const w = sandbox({ vars: ['INV_WORK_FLAGS'],
                        stubs: { _invNeedsValue: () => false, invNeedsAppraisal: () => false, invIsFirearm: () => false,
                                 invReleaseBlocked: () => false } });
    eq(w.INV_WORK_FLAGS[0].key, 'unnamed', '"Unnamed shots" is the first worklist reason');
    ok(w.INV_WORK_FLAGS[0].test({ objectName: '' }), 'a field shot with no name is on it');
    ok(!w.INV_WORK_FLAGS[0].test({ objectName: 'Sideboard' }), 'and drops off once named');

    const rowCtx = sandbox({
      fns: ['_renderInvRow', '_renderInvPanel', '_invDetailRefs'],
      vars: ['INVENTORY_COLUMNS', '_invOpen', '_invPick'],
      stubs: { _invInput: () => '', _invThumbHTML: (j, r, px) => '<div data-thumb-id="' + (r.driveFileId || '') + '" style="w:' + px + '"></div>',
               _invItemNo: () => '3', _invRoomName: () => 'Kitchen', invIsFirearm: () => false, invReleaseBlocked: () => false,
               invAwaitingAppraisal: () => false, custodyEvents: () => [], _invPanelCols: () => [], INV_PANEL_SECTIONS: [],
               _photoRefs: { 1: [{ stableId: 'd1', label: 'detail', groupId: 'p', driveFileId: 'DFILE', ts: 2 }] } },
    });
    const ref = { stableId: 'p', label: 'inventory', objectName: '', seq: 4, category: 'General/Household', fieldNote: 'signed on the base' };
    const row = rowCtx._renderInvRow({ id: 1 }, ref);
    has(row, 'Unnamed', 'an unnamed line says so');
    has(row, 'shot 4', 'and which shot it was');
    has(row, 'signed on the base', 'the field note is on the row');
    has(row, '+1 detail shot', 'and the detail count');
    rowCtx._invOpen.p = true;
    const open = rowCtx._renderInvRow({ id: 1 }, ref);
    has(open, "_invEdit(1,'p','fieldNote',this)", 'the panel lets the desk edit the note');
    has(open, 'Detail shots \u00b7 1', 'and shows the linked close-ups');
    has(open, 'data-thumb-id="DFILE"', 'as thumbnails the painter can fill');
  }

  group('⚠ THE TWO NEW KEYS SURVIVE A SAVE AND A MERGE');
  {
    const s = sandbox({ fns: ['savePhotoRefs', 'invStickyValue', '_invHasVal'], vars: ['INV_STICKY_FIELDS'],
                        stubs: { _photoRefs: { 1: [{ stableId: 'a', label: 'inventory', fieldNote: 'promised to Karen', groupId: null },
                                                    { stableId: 'b', label: 'detail', groupId: 'a' }] }, _warnPhotoStoreFull() {} } });
    s.savePhotoRefs(1);
    const back = JSON.parse(s.__store['hav_media_1']);
    eq(back[0].fieldNote, 'promised to Karen', '⚠ fieldNote is on the whitelist — a key left off it is dropped silently on every save');
    eq(back[1].groupId, 'a', 'and so is groupId');
    ok(s.INV_STICKY_FIELDS.indexOf('fieldNote') >= 0 && s.INV_STICKY_FIELDS.indexOf('groupId') >= 0,
       'both are sticky — taken in the room, never re-derivable at the desk');
    eq(s.invStickyValue({ stableId: 'a', updatedAt: 20 }, { stableId: 'a', fieldNote: 'promised to Karen', updatedAt: 10 }, 'fieldNote'),
       'promised to Karen', 'so a newer record that never saw the note keeps it');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠ THE OLD WORLD IS GONE, NOT HIDDEN — and the new surfaces are where they must be');
  {
    ['function attachJobPlanInventoryPhoto', 'function _renderRoomInventoryCapture', 'function _selectInvDisp',
     'function _selectInvAppr', 'function _paintInvApprNote', 'function _renderRoomInventoryList',
     'function _updateRoomInventoryEl', 'function _renderRoomPhotoControls', 'function _slotStatusHtml',
     'function attachJobPlanPhoto', 'inv-name-', 'inv-cat-', 'window.prompt(\'Name this item']
      .forEach((needle) => lacks(live, needle, needle + ' is deleted'));
    eq((src.match(/function _captureShot\(/g) || []).length, 1, 'one writer of a shot');
    lacks(live, 'capture="environment" style="display:none;" onchange="attachJobPlanPhoto', 'no native inputs on room cards');

    // The overlays are siblings of the panels, never inside the container the plan rewrites.
    const ws = src.indexOf('<div id="room-ws"'), cam = src.indexOf('<div id="field-cam"></div>');
    ok(ws > 0 && cam > 0, 'both containers exist in the markup');
    const jp = src.indexOf('<div id="job-plan-content">');
    ok(ws < jp && cam < jp, 'and sit outside #job-plan-content, which innerHTML rewrites on every redraw');
    has(src, '#room-ws{position:fixed;inset:0;', 'the workspace overlay is fixed over the whole viewport');
    has(src, '#field-cam{position:fixed', 'and so is the camera');
    has(src, 'z-index:1200', 'above the modal layer');
    // ⚠ A POP-UP, NOT A PAGE (2026-09-19, late evening). Anthony read the full-screen takeover as leaving
    // the Job Plan for a new web page. The overlay is a dimmed backdrop now and the dialog is .ws-panel,
    // centred and capped on a desk, the whole screen on a phone; the backdrop and Esc both close it.
    has(src, '#room-ws{position:fixed;inset:0;background:rgba(', 'the overlay is a dimmed backdrop, not a cream page');
    has(src, '.ws-panel{display:flex;flex-direction:column;width:100%;max-width:760px;', 'the dialog is capped at 760px on a desk');
    has(src, '@media (max-width:820px){#room-ws{padding:0;}.ws-panel{max-width:none;max-height:none;height:100%;border-radius:0;}}', 'and IS the screen on a phone');
    has(src, '<div id="room-ws" onclick="if(event.target===this)closeRoomWorkspace()">', 'a tap on the backdrop closes it — the house pattern on every modal overlay');
    has(fn('_paintRoomWorkspace'), '<div class="ws-panel" role="dialog" aria-modal="true">', 'the painter wraps the workspace in the panel');
    const esc = src.slice(src.indexOf("document.addEventListener('keydown', function(e){\n  if (e.key !== 'Escape') return;"));
    has(esc.slice(0, 700), 'if (_roomWs.open) { closeRoomWorkspace(); return; }', 'Esc closes the workspace like any other dialog');
    ok(esc.indexOf('if (_fieldCam.open) { closeFieldCamera(); return; }') < esc.indexOf('if (_roomWs.open)'), 'and the camera above it closes first');
  }
};
