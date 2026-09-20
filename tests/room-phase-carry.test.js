'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// A ROOM HAS TWO TAPS AND NO OTHERS (2026-09-19).
//
// This file used to pin the five-state room lifecycle split across two grids — Phase 1
// capped at `locked`, Phase 2 owning `packed → complete`, and the 2026-09-12 note that a
// room below `locked` had to SAY so on the Phase 2 card instead of lighting nothing. All
// of that went with the grids. What replaced it is smaller and the rules are these:
//
//   LOCK    — sorted and shot. The concierge's decisions in this room are final; the
//             midpoint invoice waits on every room reaching it.
//   CLEARED — empty, and the after-photo is in. The specialists' work here is done.
//
// ⚠⚠ ON AN ESTATE OR PROBATE JOB, LOCK IS REFUSED UNTIL AN AS-FOUND SHOT EXISTS. The
// as-found pass — every drawer, cabinet and closet shot with its contents undisturbed —
// is the one step whose order can never be reversed, and the only proof of what was in
// the house the morning the team walked in. Anthony's call, 2026-09-19: refuse on
// estate and probate, flag on a living-client job. It is the first room control in the
// app that refuses rather than flags, and it is the setter that refuses, not just the
// button, so nothing reaching around the workspace can lock a room it would not.
//
// ⚠ LEGACY VALUES ARE NORMALISED ON READ. A plan written before today still holds
// `packed`; a device on the old build may still write `sorting`. Both mean one thing
// everywhere, and nothing in the store is migrated.
// ─────────────────────────────────────────────────────────────────────────────

const { sandbox, source, domStub, fn } = require('./harness');

// ⚠ LINE-BASED, NOT A REGEX OVER THE WHOLE FILE. The usual `/\/\*[\s\S]*?\*\//` stripper pairs
// the `/*` inside every `accept="image/*"` attribute with a distant `*/` and silently eats
// ~170KB of live code — which made an absence check over the result pass over code that
// was still there. Found by measuring `live.length`, not by reading.
const liveLines = (s) => String(s).split('\n')
  .filter((l) => { const t = l.trim(); return !(t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')); })
  .join('\n');

const ESTATE = { id: 7, name: 'Butler Estate', svc: 'probate', won: true, status: 'won', tc: 'Ashley Jerome' };
const LIVING = { id: 8, name: 'Ellsworth', svc: 'downsizing', won: true, status: 'won' };
const SHOT = (jobId, roomIdx, label) => ({ stableId: jobId + '_r' + roomIdx + '_' + label + '_x', roomIdx, label,
                                           seq: 1, collId: null, status: 'uploaded', ts: 1 });

function rig(refs) {
  const painted = [];
  const ctx = sandbox({
    fns: ['planRoomStatusBtns', 'setPlanRoomStatus', 'roomStatusNormalize', '_invJob', 'lockRefusal',
      '_roomFoundAttest',
          'lockFlag', 'clearedFlag', '_shotCount', '_slotRefs', 'isDecedentJob', '_planRoomStatus',
          'setRoomStatus', 'getJobPlan', '_planTouch', '_roomFoundDone', 'setRoomFoundDone', '_todayStr',
          '_roomFoundDoneHtml'],
    vars: ['ROOM_STATUSES', 'ROOM_STATUS_META', 'ROOM_STATUS_LEGACY', 'TC_DONE_STATUSES', 'PS_DONE_STATUSES',
           'DECEDENT_SERVICES', 'jobPlanStore', '_roomWs'],
    stubs: {
      jobs: [Object.assign({}, ESTATE), Object.assign({}, LIVING)],
      _photoRefs: refs || {},
      saveJobPlan() {}, renderProjection() {},
      _paintRoomWorkspace() { painted.push('ws'); }, _repaintPlan() { painted.push('plan'); },
      esc: (x) => String(x == null ? '' : x), fmtDate2: (d) => String(d || ''),
      document: domStub({}),
    },
  });
  return { ctx, painted };
}
// The lit buttons are the ones painted with the state's colour.
const lit = (html) => (html.match(/<button[^>]*class="ws-btn on"[^>]*>([^<]*)/g) || []).length;

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ THREE STATES, TWO TAPS, AND NOTHING ELSE');
  {
    const { ctx } = rig({ 7: [SHOT(7, 3, 'before')] });
    eq(ctx.ROOM_STATUSES, ['pending', 'locked', 'cleared'], 'the vocabulary is three words');
    Object.keys(ctx.ROOM_STATUS_META).forEach((k) => ok(ctx.ROOM_STATUSES.indexOf(k) >= 0, k + ' is one of them'));

    const pending = ctx.planRoomStatusBtns(7, 3, 'pending');
    has(pending, "setPlanRoomStatus(7,3,'locked')", 'a pending room offers Lock');
    lacks(pending, "'cleared'", '⚠ and not Cleared — Cleared comes after Lock');
    has(pending, 'Cleared comes after Lock', 'and says so');
    eq(lit(pending), 0, 'nothing is lit');

    const locked = ctx.planRoomStatusBtns(7, 3, 'locked');
    has(locked, "setPlanRoomStatus(7,3,'cleared')", 'a locked room offers Cleared');
    has(locked, "setPlanRoomStatus(7,3,'pending')", 'and its lit Lock steps back on a second tap — a mis-tap is undone in the room');
    eq(lit(locked), 1, 'Lock is lit');

    const cleared = ctx.planRoomStatusBtns(7, 3, 'cleared');
    eq(lit(cleared), 2, 'both are lit');
    has(cleared, "setPlanRoomStatus(7,3,'locked')", 'and Cleared steps back to Locked');

    ['sorting', 'packed', 'complete'].forEach((old) => {
      [pending, locked, cleared].forEach((h) => lacks(h, "'" + old + "'", 'no button ever writes ' + old));
    });
    lacks(pending + locked + cleared, 'plan-room-status-p1', 'and the two-grid ids are gone');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ ON AN ESTATE JOB, LOCK IS REFUSED WITHOUT AN AS-FOUND SHOT — and the setter refuses too');
  {
    const bare = rig({ 7: [] });
    const html = bare.ctx.planRoomStatusBtns(7, 3, 'pending');
    ok(/<button[^>]*disabled[^>]*>[^<]*Lock/.test(html), 'the Lock button is disabled');
    has(html, 'Shoot the room as found first', 'and the reason is on screen');
    has(html, 'ws-why err', 'painted as a refusal, not a hint');

    eq(bare.ctx.setPlanRoomStatus(7, 3, 'locked'), 'Shoot the room as found first. On an estate job nothing is locked without it.',
       '⚠⚠ the SETTER refuses, so nothing reaching around the button can lock it');
    ok(!bare.ctx.jobPlanStore[7] || !bare.ctx.jobPlanStore[7].rooms || !bare.ctx.jobPlanStore[7].rooms[3],
       'and the store is untouched');
    eq(bare.ctx._roomWs.msg, 'Shoot the room as found first. On an estate job nothing is locked without it.',
       'the refusal is handed to the workspace to show');

    // ⚠⚠ RESTATED 2026-09-20: A SHOT IS NO LONGER THE WHOLE GATE. These three pinned "one
    // as-found photograph and the room can lock", which was the rule and was not the standard.
    // The field copy has told the crew since 2026-09-19 to shoot every drawer, cabinet and
    // closet open; the gate under it accepted a single wide frame, and one wide frame is not
    // an answer to "was there a watch in the desk". The app cannot count drawers, so a person
    // attests and their name goes on it.
    const shot = rig({ 7: [SHOT(7, 3, 'before')] });
    const half = shot.ctx.planRoomStatusBtns(7, 3, 'pending');
    ok(/<button[^>]*disabled/.test(half), 'a shot alone no longer unlocks Lock');
    has(half, 'every drawer, cabinet and closet', 'and the second half of the gate names the standard');
    lacks(half, 'Shoot the room as found first', 'it is past the first half, so it stops saying that');
    eq(shot.ctx.setPlanRoomStatus(7, 3, 'locked'),
       'Confirm the as-found pass first — every drawer, cabinet and closet opened and photographed. Tick it under the As found camera.',
       '⚠⚠ the SETTER refuses here too, so nothing reaching around the tick can lock it');

    // Attested, and the room can lock.
    shot.ctx.setRoomFoundDone(7, 3, true);
    ok(shot.ctx._roomFoundDone(7, 3), 'the attestation is recorded');
    eq(shot.ctx.jobPlanStore[7].rooms[3].foundDone.by, 'Ashley Jerome', '⚠ with WHO said it, frozen at the tick');
    ok(shot.ctx.jobPlanStore[7].rooms[3].foundDone.at, 'and the day they said it');
    ok(shot.ctx.jobPlanStore[7].at && shot.ctx.jobPlanStore[7].at['rooms:3'] > 0,
       '⚠ and stamped, or the other device puts it back to unattested on the next sync');
    const ok1 = shot.ctx.planRoomStatusBtns(7, 3, 'pending');
    ok(!/<button[^>]*disabled/.test(ok1), 'with the shot AND the tick the button is live');
    eq(shot.ctx.setPlanRoomStatus(7, 3, 'locked'), '', 'the setter accepts');
    eq(shot.ctx.jobPlanStore[7].rooms[3].status, 'locked', 'and writes it');
    ok(shot.painted.indexOf('plan') >= 0, 'and the plan is repainted so the room list catches up');

    // ⚠ UNTICKING IS A REAL OPERATION and must reclose the gate, or a mis-tap could never be
    // corrected once the room was locked.
    shot.ctx.setRoomFoundDone(7, 3, false);
    ok(!shot.ctx._roomFoundDone(7, 3), 'the attestation can be withdrawn');
    ok(shot.ctx.lockRefusal(shot.ctx.jobs[0], 7, 3), 'and the gate closes again behind it');

    // ⚠ THE ORDER OF THE TWO HALVES IS THE MESSAGE. No shots at all must still say SHOOT IT,
    // never "tick the box" — the box is not the work.
    const attestedOnly = rig({ 7: [] });
    attestedOnly.ctx.setRoomFoundDone(7, 3, true);
    has(attestedOnly.ctx.lockRefusal(attestedOnly.ctx.jobs[0], 7, 3), 'Shoot the room as found first',
        '⚠ a tick with no photograph behind it is refused on the FIRST half, not the second');

    // A failed shot still counts as an as-found shot: the bytes are held on the device and
    // Retry will land it. Refusing here would strand a room on a bad signal.
    const failed = rig({ 7: [Object.assign(SHOT(7, 3, 'before'), { status: 'failed' })] });
    failed.ctx.setRoomFoundDone(7, 3, true);
    eq(failed.ctx.lockRefusal(failed.ctx.jobs[0], 7, 3), '', 'a shot held on the device is a shot');
  }

  // ⚠⚠ THE GATE HAS TO BE REACHABLE OR IT IS NOT A GATE, IT IS A DEAD END. Lock now waits on an
  // attestation; if the control that makes it were ever dropped from the workspace the room
  // could never be locked again, and every source check on the refusal would still pass. That
  // is the shape this build reverted and found GREEN, so it is pinned in both directions: the
  // control renders and is wired, and the workspace really emits it.
  group('⚠⚠ THE ATTESTATION TICK IS ON THE SCREEN THE CONCIERGE IS STANDING IN FRONT OF');
  {
    const { ctx } = rig({ 7: [SHOT(7, 3, 'before')] });
    const off = ctx._roomFoundDoneHtml(7, 3, true);
    has(off, 'setRoomFoundDone(7,3,this.checked)', 'wired to the one writer');
    has(off, 'type="checkbox"', 'and it is a real control');
    has(off, 'every drawer, cabinet and closet', 'stating the standard it is attesting to');
    has(off, 'Lock waits on this', '⚠ and on an estate job it says what it is holding up');
    // The global form rule is label{text-transform:uppercase}, which turned a stage of plan
    // checkboxes into a wall of capitals once already.
    has(off, 'text-transform:none', '⚠ and it opts out of the global label rule explicitly');

    ctx.setRoomFoundDone(7, 3, true);
    const on = ctx._roomFoundDoneHtml(7, 3, true);
    has(on, 'checked', 'a recorded attestation reads back as ticked');
    has(on, 'Ashley Jerome', '⚠ naming who said it');
    lacks(on, 'Lock waits on this', 'and it stops saying it is holding anything up');

    // On a living-client job Lock is never refused, so the line must not claim it is.
    lacks(ctx._roomFoundDoneHtml(7, 3, false), 'Lock waits on this',
          'the warning is decedent-only, like the gate it describes');

    // ⚠ AND THE WORKSPACE REALLY CALLS IT. Driven separately from the gate, because a control
    // that renders correctly and is never placed is exactly the dead end above.
    has(fn('_paintRoomWorkspace'), '_roomFoundDoneHtml(jobId, roomIdx, decedent)',
        '⚠⚠ the room workspace emits the tick — without this the gate is unsatisfiable');
  }

  group('⚠ ON A LIVING-CLIENT JOB IT FLAGS AND NEVER REFUSES — the owner is standing there');
  {
    const bare = rig({ 8: [] });
    const html = bare.ctx.planRoomStatusBtns(8, 3, 'pending');
    ok(!/<button[^>]*disabled/.test(html), 'the Lock button is live');
    has(html, 'No as-found shots on this room', 'with an amber flag');
    has(html, 'ws-why warn', 'painted as a warning');
    lacks(html, 'ws-why err', 'never as a refusal');
    eq(bare.ctx.setPlanRoomStatus(8, 3, 'locked'), '', 'and the setter accepts');
    eq(bare.ctx.jobPlanStore[8].rooms[3].status, 'locked', 'and writes it');

    const shot = rig({ 8: [SHOT(8, 3, 'before')] });
    lacks(shot.ctx.planRoomStatusBtns(8, 3, 'pending'), 'No as-found shots', 'the flag clears with one shot');
  }

  group('⚠ CLEARED ONLY AFTER LOCK, and Cleared without an after-photo is flagged, not refused');
  {
    const r = rig({ 7: [SHOT(7, 3, 'before')] });
    eq(r.ctx.setPlanRoomStatus(7, 3, 'cleared'), 'Lock the room first.', 'a pending room cannot skip to Cleared');
    // Lock is the step this group depends on, and since 2026-09-20 Lock wants the as-found
    // pass attested as well as shot. Ticking it here keeps this group about Cleared.
    r.ctx.setRoomFoundDone(7, 3, true);
    r.ctx.setPlanRoomStatus(7, 3, 'locked');
    has(r.ctx.planRoomStatusBtns(7, 3, 'locked'), 'No after photo on this room yet', 'a locked room with no after-photo says so');
    eq(r.ctx.setPlanRoomStatus(7, 3, 'cleared'), '', 'but Cleared is accepted — it flags, it does not refuse');
    eq(r.ctx.jobPlanStore[7].rooms[3].status, 'cleared', 'and lands');
    const withAfter = rig({ 7: [SHOT(7, 3, 'before'), SHOT(7, 3, 'after')] });
    withAfter.ctx.setRoomFoundDone(7, 3, true);
    lacks(withAfter.ctx.planRoomStatusBtns(7, 3, 'locked'), 'No after photo', 'and the flag clears with an after shot');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ LEGACY VALUES ARE NORMALISED ON READ, NEVER MIGRATED');
  {
    const { ctx } = rig({});
    eq(ctx.roomStatusNormalize('sorting'), 'pending', 'sorting was a state nobody read');
    eq(ctx.roomStatusNormalize('packed'), 'cleared', 'packed and complete were one fact in two words');
    eq(ctx.roomStatusNormalize('complete'), 'cleared', '…so both read as cleared');
    eq(ctx.roomStatusNormalize('locked'), 'locked', 'locked is unchanged');
    eq(ctx.roomStatusNormalize(undefined), 'pending', 'nothing recorded is pending');
    eq(ctx.roomStatusNormalize('garbage'), 'pending', 'and so is a value from nowhere');

    // A store still holding the old word reads and writes the new one.
    ctx.jobPlanStore[7] = { rooms: { 3: { status: 'packed' } } };
    eq(ctx._planRoomStatus(7, 3), 'cleared', 'a room packed on the old build reads as cleared');
    ctx.setRoomStatus(7, 4, 'packed');
    eq(ctx.jobPlanStore[7].rooms[4].status, 'cleared', '⚠ and a write of the old word lands as the new one');
    ok(ctx.TC_DONE_STATUSES.locked && ctx.TC_DONE_STATUSES.cleared && !ctx.TC_DONE_STATUSES.packed,
       'the concierge-done set is locked + cleared');
    ok(ctx.PS_DONE_STATUSES.cleared && !ctx.PS_DONE_STATUSES.locked && !ctx.PS_DONE_STATUSES.packed,
       'the specialist-done set is cleared alone');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ ONE ROOM CONTROL, ONE WRITER — and the old grids are gone');
  {
    const live = liveLines(src);
    ok(live.length > src.length * 0.5, 'the stripper kept the code (found ' + live.length + ' of ' + src.length + ' chars)');
    ok(live.indexOf('function setPlanRoomStatus(') > 0, 'and the setter is in what it kept');
    eq((src.match(/function planRoomStatusBtns\(/g) || []).length, 1, 'one definition of the buttons');
    eq((src.match(/function setPlanRoomStatus\(/g) || []).length, 1, 'one definition of the setter');
    lacks(live, 'plan-room-block-p1', 'the Phase 1 room grid is gone');
    lacks(live, 'plan-room-block-p2', 'and the Phase 2 grid');
    lacks(live, "['p1','p2'].forEach", 'so there is no two-grid repaint to keep in step');
    // The setter, not the button, is where the refusal lives.
    const setter = live.slice(live.indexOf('function setPlanRoomStatus('));
    has(setter.slice(0, setter.indexOf('\n}\n')), 'lockRefusal(', 'the setter consults the refusal itself');
    has(setter.slice(0, setter.indexOf('\n}\n')), "'Lock the room first.'", 'and the order of the two taps');
  }
};
