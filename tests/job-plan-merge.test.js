'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// ⚠⚠ ASHLEY LOCKED EVERY ROOM AND NONE OF IT WAS ON ANTHONY'S MACHINE (2026-09-11).
//
// The Job Plan is the ONE surface two people genuinely work at the same time — one
// standing in the house, one at the desk — and it was the store with the crudest merge in
// the app. saveJobPlanStore used _mergeStoreByKey, which keeps the newer WHOLE record for a
// jobId. So the last device to save any part of a plan overwrote all of it: eight locked
// rooms lost to one changed checkbox, silently, with both people believing it had synced.
//
// ⚠ AND UNION-BY-KEY ALONE WOULD NOT HAVE FIXED IT, which is the part worth keeping. Every
// device posts the WHOLE store, so the loser's payload carries a value for every room the
// winner locked — the stale one it loaded before she did it. Union still has to choose, and
// with only a record-level timestamp the stale room looks exactly as fresh as the real
// edit. A key therefore has to record its own last write: plan.at['rooms:3'].
//
// ⚠ AN UNSTAMPED KEY IS THE WEAKEST CLAIM, NOT THE FRESHEST. Falling back to the record's
// savedAt would hand every untouched room to whoever saved last, which IS the defect.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { matchBrace, sandbox, source } = require('./harness');

const GS = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'main-sync.gs'), 'utf8');

function gsFn(src, name) {
  const re = new RegExp('(^|\\n)function\\s+' + name + '\\s*\\(', 'g');
  const m = re.exec(src);
  if (!m) throw new Error('not in .gs: ' + name);
  const start = m.index + (m[1] ? m[1].length : 0);
  const open = src.indexOf('{', re.lastIndex);
  const close = matchBrace(src, open);
  if (close === -1) throw new Error('unbalanced: ' + name);
  return src.slice(start, close + 1);
}
function gsVar(src, name) {
  const m = src.match(new RegExp('(^|\\n)(var\\s+' + name + '\\s*=[^;]*;)'));
  if (!m) throw new Error('not in .gs: var ' + name);
  return m[2];
}

// The REAL merge out of main-sync.gs, in a vm. Nothing is reimplemented here.
function server() {
  const ctx = { console };
  vm.createContext(ctx);
  vm.runInContext([gsVar(GS, 'PLAN_KEYED_MAPS'),
                   gsFn(GS, '_planStamp'), gsFn(GS, '_mergePlanRecord'),
                   gsFn(GS, '_mergePlanStore')].join('\n\n'), ctx,
                  { filename: 'main-sync.gs (extracted)' });
  return ctx;
}

module.exports = function ({ group, ok, eq, has, lacks }) {

  const S = server();
  const merge = (a, b) => S._mergePlanRecord(a, b);

  group('⚠⚠ the reported case: eight locked rooms against one stale device');
  {
    // Ashley, at the desk at 10:00, locks every room she has worked.
    const ashley = { savedAt: 1000, rooms: {}, at: {} };
    for (let i = 1; i <= 8; i++) {
      ashley.rooms[i] = { status: 'locked' };
      ashley.at['rooms:' + i] = 1000;
    }
    ashley.rooms[0] = { status: 'pending' };

    // Anthony's iPad loaded BEFORE she did that, so it holds every room at 'pending'. He
    // changes room 0 and saves at 10:05 — a newer record, and under the old rule that is
    // all it took to erase her morning.
    const anthony = { savedAt: 2000, rooms: {}, at: { 'rooms:0': 2000 } };
    for (let i = 0; i <= 8; i++) anthony.rooms[i] = { status: 'pending' };
    anthony.rooms[0] = { status: 'sorting' };

    const out = merge(ashley, anthony);
    const locked = Object.keys(out.rooms).filter((k) => out.rooms[k].status === 'locked');
    eq(locked.length, 8, 'all eight of her locked rooms survive his newer save');
    eq(out.rooms[3].status, 'locked', 'a room he never touched keeps HER answer');
    eq(out.rooms[0].status, 'sorting', 'and the one room he did touch keeps his');

    // The old rule, stated so the regression is unmistakable.
    const wholeRecordWins = anthony;
    eq(Object.keys(wholeRecordWins.rooms).filter((k) => wholeRecordWins.rooms[k].status === 'locked').length,
       0, 'under the old whole-record merge every one of them was gone');

    // Order must not matter — whichever device happens to save second gets the same answer.
    const flipped = merge(anthony, ashley);
    eq(Object.keys(flipped.rooms).filter((k) => flipped.rooms[k].status === 'locked').length, 8,
       'and the same holds whichever way round the two arrive');
    eq(flipped.rooms[0].status, 'sorting', 'including the room he changed');
  }

  group('⚠ a stamped key beats an unstamped one whatever savedAt says');
  {
    const stamped   = { savedAt: 1, rooms: { 5: { status: 'locked' } },  at: { 'rooms:5': 1 } };
    const unstamped = { savedAt: 9, rooms: { 5: { status: 'pending' } } };
    eq(merge(stamped, unstamped).rooms[5].status, 'locked',
       'the device that actually touched it wins, though its record is far older');
    eq(merge(unstamped, stamped).rooms[5].status, 'locked', 'and in the other order too');

    // Both stamped: the later edit wins, so UNLOCKING later really does stick.
    const relocked = { savedAt: 2, rooms: { 5: { status: 'pending' } }, at: { 'rooms:5': 50 } };
    eq(merge(stamped, relocked).rooms[5].status, 'pending',
       'a genuinely later edit still wins — this is not a one-way ratchet');

    // Neither stamped: exactly what a plan written before today already did.
    const oldA = { savedAt: 1, rooms: { 5: { status: 'locked' } } };
    const oldB = { savedAt: 9, rooms: { 5: { status: 'pending' } } };
    eq(merge(oldA, oldB).rooms[5].status, 'pending',
       'with no stamps on either side savedAt decides, so legacy records are unmoved');
  }

  group('every keyed map on a plan gets the same treatment');
  {
    const desk = {
      savedAt: 1,
      rooms: { 1: { status: 'locked' } },
      collections: { c1: { status: 'handed-off' } },
      notes: { 'phase0': 'Executor rang, letters on the way' },
      tasks: { 'flags-read': true },
      at: { 'rooms:1': 10, 'collections:c1': 10, 'notes:phase0': 10, 'tasks:flags-read': 10 },
    };
    const field = {
      savedAt: 99,
      rooms: { 1: { status: 'pending' }, 2: { status: 'sorting' } },
      collections: { c1: { status: 'pending' } },
      notes: { 'phase0': '', 'phase2': 'garage done' },
      tasks: { 'flags-read': false },
      at: { 'rooms:2': 99, 'notes:phase2': 99 },
    };
    const out = merge(desk, field);
    eq(out.rooms[1].status, 'locked', 'rooms');
    eq(out.collections.c1.status, 'handed-off', 'collections');
    eq(out.notes.phase0, 'Executor rang, letters on the way', 'notes — a blank does not erase a note');
    eq(out.tasks['flags-read'], true, 'tasks — an untouched checkbox does not untick itself');
    eq(out.rooms[2].status, 'sorting', 'and what only the field device has still arrives');
    eq(out.notes.phase2, 'garage done', 'on every map');
  }

  group('the stamps and the scalars');
  {
    const a = { savedAt: 1, rooms: { 1: {} }, at: { 'rooms:1': 10 }, lastProjection: 'old' };
    const b = { savedAt: 2, rooms: { 2: {} }, at: { 'rooms:2': 20 }, lastProjection: 'new' };
    const out = merge(a, b);
    eq(out.at['rooms:1'], 10, 'a stamp the newer record never saw is kept');
    eq(out.at['rooms:2'], 20, 'alongside its own');
    eq(out.lastProjection, 'new', 'a scalar still follows the newer record');
    eq(out.savedAt, 2, 'including savedAt');

    // Newest per key when both hold one, or a device that re-sends an old stamp would
    // make a room look untouched again.
    const c = { savedAt: 1, rooms: { 1: {} }, at: { 'rooms:1': 5 } };
    eq(merge(a, c).at['rooms:1'], 10, 'the stamps themselves take the newer of the two');

    // Absent sides.
    eq(merge(null, b), b, 'nothing on the sheet yet means take what arrived');
    eq(merge(a, null), a, 'and an empty payload does not wipe what is there');
    ok(!('at' in merge({ savedAt: 1, rooms: { 1: {} } }, { savedAt: 2, rooms: { 1: {} } })),
       'a merge of two legacy records invents no stamp map');
  }

  group('the store walks every job and touches no other');
  {
    const existing = { A: { savedAt: 1, rooms: { 1: { status: 'locked' } }, at: { 'rooms:1': 1 } },
                       B: { savedAt: 1, rooms: { 9: { status: 'locked' } }, at: { 'rooms:9': 1 } } };
    const incoming = { A: { savedAt: 5, rooms: { 1: { status: 'pending' } } } };
    const out = S._mergePlanStore(existing, incoming);
    eq(out.A.rooms[1].status, 'locked', 'the job in the payload merges per key');
    eq(out.B.rooms[9].status, 'locked', 'and a job absent from the payload is untouched');
    eq(Object.keys(out).sort().join(','), 'A,B', 'nothing is added or dropped');
  }

  group('⚠ saveJobPlanStore uses it, and _mergeStoreByKey is still right for the others');
  {
    const body = gsFn(GS, 'saveJobPlanStore');
    has(body, '_mergePlanStore(getJobPlanStore(), incoming)', 'the plan store merges per key');
    lacks(body, '_mergeStoreByKey', 'and no longer takes the newer whole record');
    // The estimate store legitimately IS one record per job — a saved estimate is a single
    // priced snapshot, not a thing two people edit half of each. Do not "fix" it too.
    has(gsFn(GS, 'saveEstimateStore'), '_mergeStoreByKey(getEstimateStore(), incoming)',
        'the estimate store deliberately keeps whole-record-wins');
    has(GS, "var BACKEND_VERSION = '2026-09-11b';",
        '⚠ the deployment must identify itself, or the banner cannot tell it from the old one');
  }

  group('⚠ the app stamps at every write site, or the merge has nothing to read');
  {
    const ctx = sandbox({
      fns: ['_planTouch', 'getJobPlan', 'saveJobPlan', 'savePlanNote', 'setRoomStatus',
            'setCollStatus', 'togglePlanTask'],
      vars: ['jobPlanStore'],
      stubs: { postSyncBadge() {}, renderProjection() {}, renderPlanTaskState() {},
               document: { getElementById() { return null; } } },
    });
    const JOB = 7;
    ctx.setRoomStatus(JOB, 3, 'locked');
    ctx.savePlanNote(JOB, 'phase0', 'letters received');
    ctx.setCollStatus(JOB, 'c9', 'handed-off');
    ctx.togglePlanTask(JOB, 'flags-read', true);

    const plan = ctx.jobPlanStore[JOB];
    ok(plan.at && plan.at['rooms:3'] > 0, 'locking a room stamps it');
    ok(plan.at['notes:phase0'] > 0, 'so does writing a note');
    ok(plan.at['collections:c9'] > 0, 'and a collection');
    ok(plan.at['tasks:flags-read'] > 0, 'and a checklist tick');
    eq(plan.rooms[3].status, 'locked', 'and the value itself is unchanged');

    // ⚠ THE LEAVES ARE UNTOUCHED ON PURPOSE — the stamp lives in one flat map beside them,
    // so nothing that reads plan.rooms[i] has to learn a new shape.
    eq(JSON.stringify(plan.rooms[3]), '{"status":"locked"}',
       'the room object gained no field of its own');
    eq(plan.notes.phase0, 'letters received', 'nor did the note');

    // Drive the real merge with what the real app just produced — the two ends must meet.
    const stale = { savedAt: (plan.savedAt || 0) + 5000, rooms: { 3: { status: 'pending' } },
                    notes: { phase0: '' }, collections: { c9: { status: 'pending' } },
                    tasks: { 'flags-read': false } };
    const out = merge(JSON.parse(JSON.stringify(plan)), stale);
    eq(out.rooms[3].status, 'locked', 'a newer stale device does not unlock the room');
    eq(out.notes.phase0, 'letters received', 'nor blank the note');
    eq(out.tasks['flags-read'], true, 'nor untick the checkbox');
    eq(out.collections.c9.status, 'handed-off', 'nor reset the collection');
  }
};
