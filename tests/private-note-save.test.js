'use strict';
// THE PRIVATE WALKTHROUGH NOTE DICTATED ON BUILD ESTIMATE IS SAVED WITH IT (2026-11-02).
//
// Anthony, off a real client: *"the microphone worked fine … when I saved it and went back to the estimate,
// they're gone."* Measured on the page (browser step 125): the microphone wrote the words into the box and
// into `_privateWalkNote`, but a script setting `.value` fires no input event, so the room grid's listener
// never recomputed the estimate, `currentEstimate.privateNote` kept the note as it stood at the last
// recompute, and Save wrote that. The room note's microphone had the same gap, and a note typed and saved
// inside the 250 ms debounce was lost the same way. Each group below drives the real function.

const { sandbox, domStub } = require('./harness');

module.exports = function ({ group, ok, eq, has }) {
  // A recogniser the test answers, a debounce the test fires, and a calcAll that records what it saw.
  function rig(extraFns, extraStubs) {
    const recs = [];
    function SR() { recs.push(this); }
    SR.prototype.start = function () { this.started = true; };
    SR.prototype.stop = function () { if (this.onend) this.onend(); };
    const doc = domStub({
      'e-private-note': { tagName: 'TEXTAREA', value: '' },
    });
    // The box sits in its .pnote-grow wrapper, whose data-v is the hidden copy that sizes it.
    const box = doc.getElementById('e-private-note');
    box.parentNode = { dataset: { v: '' } };
    const timers = [];
    const log = [];
    const ctx = sandbox({
      fns: ['_privateNotePaint', 'scheduleCalcAll', 'flushCalcAll', 'startPrivateNoteTranscription', 'startRoomTranscription'].concat(extraFns || []),
      vars: ['_calcAllT', '_privateWalkNote'],
      stubs: Object.assign({
        document: doc,
        window: { SpeechRecognition: SR },
        _activeRecognitions: {},
        setTimeout: (f) => { timers.push(f); return timers.length; },
        clearTimeout: (t) => { if (t) timers[t - 1] = null; },
        calcAll: () => { log.push('calc:' + ctx._privateWalkNote + '|' + doc.getElementById('note-r0').value); },
        showFB: (id, kind, msg) => { log.push('fb'); },
        openNotesModal: () => {},
      }, extraStubs || {}),
    });
    const say = (text) => recs[recs.length - 1].onresult({ resultIndex: 0,
      results: [{ 0: { transcript: text }, isFinal: true, length: 1 }] });
    return { ctx, doc, box, recs, say, timers, log };
  }

  group('A. the private note dictated: a recompute is owed, and it carries the words');
  {
    const r = rig();
    r.ctx.startPrivateNoteTranscription();
    ok(r.recs.length === 1 && r.recs[0].started, 'the microphone starts a recogniser');
    r.say('Gate code changes Friday.');
    eq(r.ctx._privateWalkNote, 'Gate code changes Friday.', 'the words are the note');
    eq(r.box.value, 'Gate code changes Friday.', 'and the box reads them');
    eq(r.box.parentNode.dataset.v, 'Gate code changes Friday.', 'and the hidden copy that sizes the box carries them');
    ok(r.timers.filter(Boolean).length === 1, '⚠ a recompute is scheduled, as typing schedules one');
    r.say('The son disagrees about the piano.');
    eq(r.ctx._privateWalkNote, 'Gate code changes Friday. The son disagrees about the piano.', 'a second phrase is added after the first');
    r.ctx.flushCalcAll();
    eq(r.log, ['calc:Gate code changes Friday. The son disagrees about the piano.|'], '⚠ the recompute runs once, over the whole note');
    r.ctx.flushCalcAll();
    eq(r.log.length, 1, 'and a flush with nothing owed recomputes nothing');
  }

  group('B. a room note dictated: a recompute is owed');
  {
    const r = rig();
    r.ctx.startRoomTranscription('r0');
    r.say('Grand piano by the stairs.');
    eq(r.doc.getElementById('note-r0').value, 'Grand piano by the stairs.', 'the words are the room\'s note');
    ok(r.timers.filter(Boolean).length === 1, '⚠ a recompute is scheduled');
    r.ctx.flushCalcAll();
    eq(r.log, ['calc:|Grand piano by the stairs.'], 'and it reads the room\'s note');
  }

  group('C. Save and Submit run a recompute still owed before they read the estimate');
  {
    // Save: a note typed a moment ago (the debounce still out), then Save with no client bound, which refuses
    // after the flush; the order of the log says the recompute came first.
    const r = rig(['saveEstimateAndPreview'], { estimateApproved: false, currentEstimate: null });
    r.box.value = 'Hoarding in the garage.';
    r.ctx._privateWalkNote = 'Hoarding in the garage.';
    r.ctx.scheduleCalcAll();
    r.ctx.saveEstimateAndPreview();
    eq(r.log, ['calc:Hoarding in the garage.|', 'fb'], '⚠ Save recomputes first, then answers');
    eq(r.timers.filter(Boolean).length, 0, 'and nothing is left owed');

    const s = rig(['submitForApproval'], {
      currentEstimate: { jobId: 0 },
      estimateSubmitBlocker: () => { s.log.push('blocker'); return { msg: 'stop' }; },
    });
    s.ctx._privateWalkNote = 'Side gate sticks.';
    s.ctx.scheduleCalcAll();
    s.ctx.submitForApproval({ silent: true });
    eq(s.log, ['calc:Side gate sticks.|', 'blocker'], '⚠ Submit recomputes before it reads the estimate');

    // Nothing owed: neither one recomputes on its own account.
    const t = rig(['saveEstimateAndPreview'], { estimateApproved: false, currentEstimate: null });
    t.ctx.saveEstimateAndPreview();
    eq(t.log, ['fb'], 'with nothing typed, Save adds no recompute');
  }

  group('D. the one painter of the box');
  {
    const r = rig();
    r.ctx._privateWalkNote = 'Line one.\nLine two.';
    r.ctx._privateNotePaint();
    eq(r.box.value, 'Line one.\nLine two.', 'the box reads the note, line breaks kept');
    eq(r.box.parentNode.dataset.v, 'Line one.\nLine two.', 'and so does the hidden copy');
    r.ctx._privateWalkNote = '';
    r.ctx._privateNotePaint();
    eq([r.box.value, r.box.parentNode.dataset.v], ['', ''], 'an empty note empties both');
  }
};
