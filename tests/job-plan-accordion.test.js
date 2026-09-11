'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// "when i expand a job plan stage, it automatically shuts on me within seconds. i can't
// do anything." Reported 2026-09-11, from a job, minutes after the first real batch of
// room photographs went up.
//
// ⚠⚠ TWO FAULTS, AND EITHER ONE ALONE MAKES THE TAB UNUSABLE.
//
// 1. loadJobPlanTab ends with `refreshPhotoRefs(jobId, function(changed){ if (changed)
//    loadJobPlanTab(); })` — and `changed` was an unconditional true the moment the server
//    held ANY item for that job. So the tab re-entered itself forever, one network round
//    trip per cycle, rewriting #job-plan-content each time. Latent since 2026-09-10 and
//    invisible until there were photos in the sheet to come back: with an empty manifest
//    the length guard above it short-circuits.
//
// 2. Even one legitimate redraw shut every phase, because the accordion lived entirely in
//    an inline `display` style. The Job Plan redraws for good reasons — a photo landing
//    from the other device, the estimate store arriving, a directory going stale — and each
//    one closed whatever the crew had open, mid-room, with nothing to explain it.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const { sandbox } = require('./harness');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'havellin.html'), 'utf8');
const fnBody = (name) => {
  const at = SRC.indexOf('function ' + name + '(');
  return SRC.slice(at, SRC.indexOf('\n}\n', at));
};

// A synchronous thenable, so the real fetch chain runs inside the runner's flat order.
function syncOk(v) {
  return { then(f) { const o = f(v); return (o && typeof o.then === 'function') ? o : syncOk(o); },
           catch() { return this; } };
}

function rig(remoteItems, localItems) {
  const saved = [];
  const ctx = sandbox({
    fns: ['refreshPhotoRefs'],
    vars: [],
    stubs: {
      SHEETS_SYNC_URL: 'https://script.google.com/macros/s/AAA/exec',
      _photoRefs: { 7: localItems || [] },
      _invCloudSeen: {},
      savePhotoRefs: (j) => saved.push(j),
      // The REAL merge is covered by media-merge.test.js; what matters here is only
      // whether refreshPhotoRefs can tell a no-op from a real change.
      mergeMediaItems: (local, remote) => {
        const out = local.slice();
        remote.forEach((r) => {
          const i = out.findIndex((x) => x.stableId === r.stableId);
          if (i >= 0) { if ((r.updatedAt || 0) > (out[i].updatedAt || 0)) out[i] = r; }
          else out.push(r);
        });
        return out;
      },
      fetch: () => syncOk({ json: () => syncOk({ ok: true, media: { 7: { items: remoteItems } } }) }),
    },
  });
  return { ctx, saved };
}

module.exports = function ({ group, ok, eq, has, lacks }) {

  group('⚠⚠ "changed" means the merge moved something, not "the server has photos"');
  {
    const item = { stableId: 's1', roomIdx: 2, label: 'before', status: 'uploaded', updatedAt: 10 };

    // THE DEFECT: the device already holds exactly what the server sent.
    const same = rig([item], [item]);
    let changed = null;
    same.ctx.refreshPhotoRefs(7, (c) => { changed = c; });
    eq(changed, false, 'a merge that moves nothing reports no change — this is what looped');
    eq(same.saved.length, 1, '⚠ but it still saves: this device may not have written the merge locally');
    ok(same.ctx._invCloudSeen[7], 'and it still records that the server copy was seen');

    // A real change still reports one, or a photo from the other device never appears.
    const fresh = rig([item, { stableId: 's2', roomIdx: 3, label: 'before', updatedAt: 11 }], [item]);
    fresh.ctx.refreshPhotoRefs(7, (c) => { changed = c; });
    eq(changed, true, 'a new shot from the other device does report a change');
    eq(fresh.ctx._photoRefs[7].length, 2, 'and it really arrives');

    // An edit to a shot this device already has counts too.
    const edited = rig([Object.assign({}, item, { status: 'failed', updatedAt: 99 })], [item]);
    edited.ctx.refreshPhotoRefs(7, (c) => { changed = c; });
    eq(changed, true, 'so does a newer version of a shot already here');

    // Nothing on the server at all: unchanged, and no save.
    const none = rig([], [item]);
    none.ctx.refreshPhotoRefs(7, (c) => { changed = c; });
    eq(changed, false, 'an empty remote manifest is not a change');
    eq(none.saved.length, 0, 'and writes nothing');

    // ⚠⚠ THE LOAD-BEARING CHECK IS THE LOOP, NOT THE FLAG. Reverting `changed` to a bare
    // true fails only one assertion above, and a defect that re-renders a tab forever
    // deserves more than that. So drive the real recursion: loadJobPlanTab's callback is
    // `if (changed) loadJobPlanTab()`, and the only thing between that and an unbounded
    // loop is refreshPhotoRefs being honest. Nothing has changed on the server, so ONE
    // pass is the correct answer and anything more is the reported bug.
    // ⚠ The cap CATCHES rather than throws: a runaway must read as this one assertion
    // failing, not as the whole file dying before the accordion group ever runs.
    const drive = (r, cap) => {
      let n = 0;
      try {
        (function again() {
          n++;
          if (n > cap) throw new Error('cap');
          r.ctx.refreshPhotoRefs(7, function(c){ if (c) again(); });
        })();
      } catch (e) { if (e.message !== 'cap') throw e; return cap + 1; }
      return n;
    };
    const loop = rig([item], [item]);
    const renders = drive(loop, 25);
    eq(renders, 1, '⚠⚠ the tab renders ONCE and stops — more than one is the reported bug');
    eq(loop.saved.length, 1, 'and writes once, rather than once per network round trip');

    // The converse, so the fix is not simply "never re-render": a real change still drives
    // exactly one more pass and then settles.
    const live = rig([item, { stableId: 's9', roomIdx: 4, label: 'before', updatedAt: 12 }], [item]);
    const passes = drive(live, 25);
    eq(passes, 2, 'a photo from the other device redraws once, then the next pass is a no-op');
    eq(live.ctx._photoRefs[7].length, 2, 'and it is on screen');

    // ⚠ The recursion itself is the thing to keep an eye on. The callback is allowed to
    // re-render — it MUST, for a photo from the other device to show — so the only thing
    // standing between it and an infinite loop is `changed` being honest.
    has(fnBody('loadJobPlanTab'), 'refreshPhotoRefs(jobId, function(changed){ if (changed) loadJobPlanTab(); });',
        'loadJobPlanTab still re-renders on a real change');
    lacks(fnBody('refreshPhotoRefs'), 'if (cb) cb(true);',
          'and refreshPhotoRefs no longer reports one unconditionally');
  }

  group('⚠⚠ a redraw does not shut the phase the crew is working in');
  {
    const s = sandbox({ fns: ['planPhaseWrap', 'togglePhase'], vars: ['_planOpenPhases'],
                        stubs: { document: { getElementById: () => null } } });

    // First render: everything closed, as it has always been.
    const shut = s.planPhaseWrap('p1', 'Phase 1', 'body');
    has(shut, 'id="phase-body-p1" style="display:none', 'a phase starts closed');
    has(shut, '>▶<', 'with a closed chevron');

    // The crew opens it. Drive the REAL toggle against a real element.
    const el = { style: { display: 'none' } }, chev = { textContent: '▶' };
    s.document = { getElementById: (id) => id === 'phase-body-p1' ? el
                                         : id === 'phase-chev-p1' ? chev : null };
    s.togglePhase('p1');
    eq(el.style.display, '', 'it opens');
    eq(s._planOpenPhases.p1, true, 'and that is remembered');

    // Now the tab redraws — a photo landing, the estimate store arriving, anything.
    const after = s.planPhaseWrap('p1', 'Phase 1', 'body');
    lacks(after, 'id="phase-body-p1" style="display:none', 'the redraw leaves it OPEN');
    has(after, '>▼<', 'chevron included, so the control matches what it shows');

    // A phase nobody opened is still closed after the same redraw.
    has(s.planPhaseWrap('p2', 'Phase 2', 'body'), 'id="phase-body-p2" style="display:none',
        'and a phase nobody opened stays shut');

    // Closing it again is remembered too, or a redraw would re-open what you just shut.
    s.togglePhase('p1');
    eq(el.style.display, 'none', 'it closes');
    ok(!s._planOpenPhases.p1, 'and the memory is cleared, not just overwritten');
    has(s.planPhaseWrap('p1', 'Phase 1', 'body'), 'id="phase-body-p1" style="display:none',
        'so the next redraw keeps it shut');

    // ⚠ SESSION STATE, NOT A RECORD. Which phase somebody has open is nobody else's
    // business and must never reach the plan store or the sheet.
    lacks(fnBody('togglePhase'), 'saveJobPlan', 'opening a phase saves nothing');
    lacks(fnBody('togglePhase'), '_planTouch', 'and stamps nothing');
    ok(/var _planOpenPhases = \{\};/.test(SRC), 'it is plain module state');
  }

  // ⚠⚠ PRINT JOB PLAN IS RETIRED AND MUST NOT COME BACK BY ACCIDENT (2026-09-11).
  // Anthony: *"Print job plan is useless. Too long printing all the cards. Let's scrap that
  // for now and revisit."* Measured before removing it: an 18-room probate plan printed 9
  // Letter pages carrying 36 room cards for 18 rooms — every room renders twice, in the
  // Phase 1 sort grid and again in the Phase 2 pack grid — and 72 checkboxes, all of them
  // status buttons and Take Photo controls that are inert on paper.
  //
  // This group replaces the whole of tests/job-plan-print.test.js. The old file asserted
  // that the printed copy opened every phase body; the requirement now is that there is no
  // printer at all, which is a claim about ABSENCE and therefore needs its own check —
  // deleting the suite alone would have left the removal untested.
  group('⚠⚠ THE JOB PLAN HAS NO PRINT PATH, AND CANNOT REGROW ONE SILENTLY');
  {
    // ⚠ COMMENT-STRIPPED ON PURPOSE, AND THIS IS THE FIFTH TIME THIS REPO HAS PAID FOR IT:
    // the retirement note left at the old site has to NAME both functions to be worth
    // reading, so a raw needle over the source trips on the explanation of the fix. The
    // requirement is genuinely "no LIVE reference", so the comments come out first.
    const live = SRC.split('\n')
      .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*') && !l.trim().startsWith('/*'))
      .join('\n');
    lacks(live, 'function printJobPlan', 'printJobPlan is deleted, not hidden');
    lacks(live, 'function _jpExpandForPrint', 'and so is its expander');
    lacks(live, 'printJobPlan(', 'nothing calls it');
    lacks(live, '_jpExpandForPrint(', 'nothing calls the expander either');
    lacks(live, 'btn-plan-pdf', 'the button is gone from the tab header and from loadJobPlanTab');
    lacks(fnBody('loadJobPlanTab'), 'printBtn',
          'and the loader keeps no handle to show or hide');

    // ⚠ THE RETIREMENT IS EXPLAINED WHERE THE CODE WAS, because a deletion with no note is
    // indistinguishable from an accident and comes back as one.
    has(SRC, 'PRINT JOB PLAN IS RETIRED', 'the removal says why, at the site it was removed from');

    // ⚠ WHAT WENT WITH IT. The standing-flags brief reached paper ONLY because the printer
    // carried #job-plan-header along with the content. It is screen-only now, and that is a
    // real loss on the one panel that carries the firearms rule — stated here so a revisit
    // knows what it has to give back rather than rediscovering it on a job.
    has(SRC, 'SCREEN-ONLY brief', 'and says plainly that the crew brief lost its paper route');
    has(SRC, 'standingFlagsBlock(job)', 'the brief itself is untouched and still renders');
  }
};
