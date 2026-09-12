'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// "Why don't the 'locked' from phase 1 carry to starting point in stage 2?"
// Reported 2026-09-12, after the Apps Script redeploy and after moving to a single
// Google account in the browser — so neither sync cause was live any more.
//
// ⚠⚠ THE LOCK DOES CARRY, AND THAT WAS MEASURED BEFORE ANYTHING WAS CHANGED. Both grids
// read the same `plan.rooms[idx].status`, and setPlanRoomStatus repaints both. Driven in a
// browser: lock all three rooms in Phase 1 and the Phase 2 card reads badge LOCKED with the
// `locked` button lit, live AND after a full loadJobPlanTab() re-render.
//
// ⚠⚠ WHAT DOES NOT CARRY IS EVERY STATE BELOW IT. Phase 2's row is locked/packed/complete,
// so a room at `pending` or `sorting` lights NOTHING — three grey buttons, no reading at all.
// A control showing nothing selected reads as state that failed to arrive, which is exactly
// the report. The status was always there; the button row had no way to say so.
// ─────────────────────────────────────────────────────────────────────────────

const { sandbox, source } = require('./harness');

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();
  const s = sandbox({ fns: ['planRoomStatusBtns'] });
  const btns = (status, phase) => s.planRoomStatusBtns(7, 3, status, phase);
  // The lit button is the one rendered bold — that is the only thing that says "you are here".
  const lit = (html) => {
    const out = [];
    const re = /<button[^>]*font-weight:(\d+)[^>]*>([a-z\-]+)<\/button>/g;
    let m;
    while ((m = re.exec(html))) if (m[1] === '700') out.push(m[2]);
    return out;
  };

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ A LOCK MADE IN PHASE 1 IS LIT IN PHASE 2 — the reported case, pinned');
  {
    eq(lit(btns('locked', 'p1')).join(','), 'locked', 'Phase 1 lights it');
    eq(lit(btns('locked', 'p2')).join(','), 'locked',
       '⚠ and so does Phase 2 — both rows read the same stored status');
    // The two later states belong to Phase 2 and must light there too, or the crew loses
    // its place the moment it advances a room.
    eq(lit(btns('packed', 'p2')).join(','), 'packed', 'packed lights in Phase 2');
    eq(lit(btns('complete', 'p2')).join(','), 'complete', 'complete lights in Phase 2');
    // One definition of the row: Phase 2 owns packed → complete and Phase 1 caps at locked,
    // so a crew cannot drive a room to complete from the sort grid and skip the midpoint.
    lacks(btns('pending', 'p1'), '>packed<', 'Phase 1 still cannot reach packed');
    lacks(btns('pending', 'p1'), '>complete<', 'nor complete');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ AND A ROOM BELOW LOCKED NOW SAYS SO INSTEAD OF GOING BLANK');
  {
    ['pending', 'sorting'].forEach((st) => {
      eq(lit(btns(st, 'p2')).length, 0,
         st + ': no Phase 2 button can be lit — the row does not carry that state');
      has(btns(st, 'p2'), 'Still ' + st,
          '⚠ so the card says where the room actually is, in words');
      has(btns(st, 'p2'), 'Phase 1', 'and names where the fix is');
    });
    // The converse is what stops it becoming noise: a room Phase 2 CAN draw says nothing.
    ['locked', 'packed', 'complete'].forEach((st) => {
      lacks(btns(st, 'p2'), 'Still ', st + ': nothing to explain, so nothing is said');
    });
    // And Phase 1 never carries it — there the three states are all drawable.
    ['pending', 'sorting', 'locked'].forEach((st) => {
      lacks(btns(st, 'p1'), 'Still ', 'Phase 1 (' + st + ') never carries the note');
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ IT FLAGS AND NEVER REFUSES — the standing rule, on the one control in the room');
  {
    // Locking from the Phase 2 card is legitimate: the crew is standing in the room. The
    // split exists to stop Phase 1 reaching `complete`, not to stop Phase 2 reaching `locked`.
    const p2 = btns('pending', 'p2');
    has(p2, "setPlanRoomStatus(7,3,'locked')", 'the lock button is still live on a pending room');
    lacks(p2, 'disabled', 'nothing is disabled');
    lacks(p2, 'pointer-events:none', 'and nothing is made unpressable another way');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ THE NOTE LIVES IN THE BUTTON WRAPPER, so the live repaint carries it for free');
  {
    // setPlanRoomStatus repaints #plan-room-status-<phase>-<idx> on BOTH grids. Anything
    // rendered outside that wrapper would need a second call site, and a second call site is
    // how the two grids come to disagree — which is the defect this file exists about.
    const body = src.slice(src.indexOf('function setPlanRoomStatus('));
    const fn = body.slice(0, body.indexOf('\n}\n'));
    has(fn, "['p1','p2'].forEach", 'the repaint still covers both grids');
    has(fn, 'planRoomStatusBtns(jobId, roomIdx, status, pk)',
        'and rebuilds the whole wrapper, note included');
    // The note must be INSIDE what that function returns, not appended by a caller.
    const pb = src.slice(src.indexOf('function planRoomStatusBtns('));
    has(pb.slice(0, pb.indexOf('\n}\n')), 'Still ',
        'the note is produced by planRoomStatusBtns itself');
  }
};
