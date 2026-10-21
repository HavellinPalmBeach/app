'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// THE CAMERA'S VOICE NOTE IS A TAP, NEVER A HOLD (2026-10-21).
//
// Anthony and Ashley, the first photography run: "when you hit the button, it kind of times out. You can't do it ... it's
// not staying on and you can't record anything", while typing in the box worked. The button was hold-to-talk, and the
// press itself repainted the strip (_fieldCamPaint rewrites #fc-ui with innerHTML), destroying the button under the
// finger: the phone cancelled the press, pointercancel / pointerleave called stop, and the microphone closed before a
// word was heard. Now: tap 🎤 Talk, speak, tap Stop (or take the next photograph, or press Done); a pause does not end
// the note, the words go on the shot they were said about, and a refusal is said on the strip.
// ─────────────────────────────────────────────────────────────────────────────

const { sandbox, fn, domStub } = require('./harness');

const JOB = { id: 1, hvlId: 'HVL-0007', name: 'Butler Estate', svc: 'probate', won: true, status: 'won' };
const EST = { svc: 'probate', rooms: [{ idx: 0, name: 'Kitchen', tcH: 1, psH: 2 }] };

function rig() {
  const dom = domStub({});
  const tracks = [{ stop() {} }];
  const stream = { getTracks: () => tracks };
  const getUserMedia = () => ({ then(f) { f(stream); return { catch() {} }; } });
  const sessions = [];
  // A fake recogniser: the test says what it hears and when it ends, as the browser would.
  function FakeSR() { this.started = 0; this.stopped = 0; this.aborted = 0; sessions.push(this); }
  FakeSR.prototype.start = function () { this.started++; };
  FakeSR.prototype.stop = function () { this.stopped++; };
  FakeSR.prototype.abort = function () { this.aborted++; };
  FakeSR.prototype.say = function (text, isFinal) {
    const r = [{ transcript: text }]; r.isFinal = !!isFinal;
    this.onresult({ resultIndex: 0, results: [r] });
  };
  FakeSR.prototype.end = function () { this.onend(); };
  FakeSR.prototype.fail = function (error) { this.onerror({ error }); this.onend(); };
  const clock = { now: Date.parse('2026-10-21T14:00:00Z') };
  const timers = [];
  const ctx = sandbox({
    fns: ['openFieldCamera', 'closeFieldCamera', '_fieldCamStop', '_fieldCamGoNative', '_fieldCamShellHtml',
          '_fieldCamPaint', 'fieldCamSetDisp', 'fieldCamToggleAppr', 'fieldCamToggleDetail', '_fieldCamCommit',
          'fieldDispChips', '_jobHasDestination', '_invJob',
          'fieldCamTypedNote', 'fieldCamNoteDraft', '_fieldCamPendingNote', '_fieldCamFlushNote',
          'fieldCamTalk', 'fieldCamTalkStart', 'fieldCamTalkStop', '_fieldCamTalkRun', '_fieldCamTalkSave',
          '_fieldTalkStatus', 'fieldTalkErrorText',
          '_fieldCamRoomName', '_planRoom', '_getPhotoRef',
          '_captureShot', 'photoSubfolder', 'fieldDispToInv', '_cleanName', '_photoUid', '_slotRefs', '_setPhotoRef',
          '_fieldNoteAppend', '_invTouch', '_invDetailRefs',
          'collectionLinesUnshot', 'collectionLineUnshot', '_invHasPhoto', '_jobInvRefs', 'collectionLineWithPhoto', 'fieldCamToggleColl'],
    vars: ['_fieldCam', 'FIELD_CAM_MODES', 'FIELD_DISPOSITIONS', 'FIELD_DISP_DEFAULT', 'PHOTO_CAPTURE_LABELS',
           'AS_FOUND_SUBFOLDER', 'PHOTO_SUBFOLDER', 'FIELD_TALK_MAX_MS', 'FIELD_TALK_MAX_RUNS', 'FIELD_TALK_STOP_WAIT_MS',
           '_localShotThumbs', '_photoUidSeq', 'INV_DEFAULT_CATEGORY'],
    stubs: {
      document: dom, navigator: { mediaDevices: { getUserMedia } },
      window: { webkitSpeechRecognition: FakeSR },
      Date: { now: () => clock.now, parse: Date.parse },
      jobs: [Object.assign({}, JOB)], _photoRefs: { 1: [] },
      estimateStore: { 1: { estimate: EST, approved: true } },
      _photoCaptureJob: () => Object.assign({}, JOB),
      _photoStamp: () => '2026-10-21_100000',
      _photoRetryData: {}, _savePendingPhotoData() {}, savePhotoRefs() {},
      _doPhotoUpload() {}, _invCacheLocalThumb() {}, _scheduleInventorySync() {},
      compressImage: (d, w, q, cb) => cb(d),
      _roomWs: { open: false }, _paintRoomWorkspace() {}, _repaintPlan() {},
      showSyncBadge() {}, setTimeout: (f, ms) => { timers.push({ f, ms }); return timers.length; },
    },
  });
  const ui = () => dom.getElementById('fc-ui').innerHTML;
  const refs = () => ctx._photoRefs[1] || [];
  const note = (i) => { const r = refs().filter((x) => x.label === 'inventory')[i]; return r ? (r.fieldNote || '') : null; };
  return { ctx, dom, ui, sessions, clock, timers, refs, note };
}
function open(r) {
  r.ctx.openFieldCamera(1, 0, 'inventory');
  r.dom.getElementById('fc-video').videoWidth = 1920;
  const v = r.dom.getElementById('fc-video'); if (v.onloadedmetadata) v.onloadedmetadata();
}

module.exports = function ({ group, ok, eq, has, lacks }) {
  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠⚠ the button is a tap, so the repaint that follows the press cannot cancel it');
  {
    const r = rig(); open(r);
    has(r.ui(), 'disabled onclick="fieldCamTalk()"', 'no talking before there is a shot to talk about');
    r.ctx._fieldCamCommit('data:image/jpeg;base64,AAA');
    has(r.ui(), 'onclick="fieldCamTalk()"', 'offered once there is a last shot');
    lacks(r.ui(), 'disabled onclick="fieldCamTalk()"', 'and pressable');
    has(r.ui(), '&#127908; Talk', 'labelled Talk');
    lacks(r.ui(), 'onpointerdown', '⚠⚠ nothing on the strip hangs on a held press any more');
    lacks(r.ui(), 'onpointerleave', 'nor stops when the finger is lifted off a repainted button');
    lacks(r.ui(), 'Hold to talk', 'and it no longer says hold');

    ok(r.ctx.fieldCamTalk(), 'one tap starts it');
    eq(r.sessions.length, 1, 'one recogniser');
    eq(r.sessions[0].started, 1, 'started');
    has(r.ui(), 'Stop &amp; save', '⚠⚠ it STAYS ON after the repaint: the button now reads Stop');
    has(r.ui(), 'fc-talk on', 'and is lit');
    has(r.ui(), 'Listening', 'the strip says it is listening');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠ a pause does not end the note: the browser ending a session starts another until Stop');
  {
    const r = rig(); open(r);
    r.ctx._fieldCamCommit('data:image/jpeg;base64,AAA');
    r.ctx.fieldCamTalk();
    r.sessions[0].say('signed on the base', true);
    eq(r.dom.getElementById('fc-talk-status').textContent, 'Listening… signed on the base', 'heard so far, on the strip');
    r.sessions[0].fail('no-speech');   // Chrome's silence, or Safari's own end after a pause
    eq(r.sessions.length, 2, '⚠⚠ a new session took over (the old one TIMED OUT, which was the report)');
    eq(r.ctx._fieldCam.talking, true, 'still talking');
    eq(r.note(0), '', 'nothing saved yet');
    const s1 = r.sessions[1] || r.sessions[0];
    s1.say('promised to Karen', false);   // still interim when Stop is tapped
    ok(r.ctx.fieldCamTalk(), 'the second tap stops it');
    eq(s1.stopped, 1, 'the browser is asked for its last words');
    s1.end();
    eq(r.note(0), 'signed on the base promised to Karen', '⚠⚠ both halves of the note land on the shot, the unfinished words too');
    eq(r.ctx._fieldCam.talking, false, 'and the microphone is off');
    has(r.ui(), '&#127908; Talk', 'the button is back to Talk');
    eq(r.sessions.length, 2, 'Stop does not start another session');

    // Words still unfinished when the browser ends a session on its own are kept, not overwritten by the next session.
    r.ctx.fieldCamTalk();
    const a = r.sessions[r.sessions.length - 1];
    a.say('a pair of', false);
    a.end();
    const b2 = r.sessions[r.sessions.length - 1];
    ok(b2 !== a, 'a new session after the browser ended the last');
    b2.say('brass lamps', false);
    r.ctx.fieldCamTalk();
    b2.end();
    has(r.note(0), 'a pair of brass lamps', '⚠ the words left unfinished at the browser\'s end are kept');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('the words go on the shot they were said about: the next photograph and Done both save them');
  {
    const r = rig(); open(r);
    r.ctx._fieldCamCommit('data:image/jpeg;base64,AAA');
    r.ctx.fieldCamTalk();
    r.sessions[0].say('the side table', true);
    r.ctx._fieldCamCommit('data:image/jpeg;base64,BBB');   // shot without tapping Stop
    eq(r.sessions[0].stopped, 1, 'the next photograph stops the talking');
    r.sessions[0].end();
    eq(r.ctx._fieldCam.talking, false, 'and the microphone is off');
    eq(r.note(0), 'the side table', '⚠⚠ onto the shot it was started on');
    eq(r.note(1), '', 'never the new one');

    r.ctx.fieldCamTalk();
    r.sessions[1].say('chipped leg', false);
    r.ctx.closeFieldCamera();
    eq(r.sessions[1].aborted, 1, 'Done lets the microphone go');
    eq(r.note(1), 'chipped leg', '⚠ and keeps what was heard');
    eq(r.sessions.length, 2, 'and nothing restarts after Done');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('Stop saves even if the browser never answers; a refusal is said on the strip; the note ends by itself');
  {
    const r = rig(); open(r);
    r.ctx._fieldCamCommit('data:image/jpeg;base64,AAA');
    r.ctx.fieldCamTalk();
    r.sessions[0].say('pair of lamps', true);
    r.ctx.fieldCamTalkStop();
    const t = r.timers.filter((x) => x.ms === r.ctx.FIELD_TALK_STOP_WAIT_MS);
    eq(t.length, 1, 'a fallback is set');
    if (t[0]) t[0].f();
    eq(r.note(0), 'pair of lamps', '⚠ the note is saved without the end event');
    r.sessions[0].end();
    eq(r.note(0), 'pair of lamps', 'and a late end event does not save it twice');

    r.ctx.fieldCamTalk();
    r.sessions[1].fail('service-not-allowed');
    eq(r.sessions.length, 2, 'a refusal is not retried');
    eq(r.ctx._fieldCam.talking, false, 'the microphone is off');
    has(r.ui(), 'fc-talk-msg', '⚠ the refusal is on the strip, where the person is looking');
    has(r.ui(), 'Dictation', 'naming what to turn on');
    has(r.ui(), 'keyboard’s microphone', 'and the way that always works');
    r.ctx._fieldCamCommit('data:image/jpeg;base64,BBB');
    lacks(r.ui(), 'fc-talk-msg', 'the message goes with the next photograph');

    r.ctx.fieldCamTalk();   // on
    r.ctx.fieldCamTalk();   // and straight off, nothing said
    r.sessions[2].end();   // nothing said at all
    has(r.ui(), 'Nothing was heard', 'silence is said, never a silent nothing');

    r.ctx.fieldCamTalk();
    r.sessions[3].say('crate of records', true);
    r.clock.now += r.ctx.FIELD_TALK_MAX_MS + 1;
    r.sessions[3].end();
    eq(r.ctx._fieldCam.talking, false, '⚠ past the ceiling the microphone closes by itself');
    eq(r.note(1), 'crate of records', 'and saves');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('the old hold-to-talk wiring is gone from the code');
  {
    const paint = fn('_fieldCamPaint');
    lacks(paint, 'onpointerdown="fieldCamTalk', 'no pointerdown on the talk button');
    has(paint, 'onclick="fieldCamTalk()"', 'a click');
    has(fn('_fieldCamCommit'), 'fieldCamTalkStop()', 'the shutter stops a note being spoken');
    has(fn('_fieldCamStop'), '_fieldCamTalkSave(st)', 'Done saves it');
  }
};
