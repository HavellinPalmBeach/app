'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// THE MANIFEST WRITE IS THE ONE THAT MUST NEVER FAIL (2026-09-21).
//
// `hav_media_<id>` is only ever removed when a job is DELETED (_purgeLocalJobRecords), never
// when one is finished — so a device carries every estate it has ever worked. Measured off
// the real 53-key whitelist: ~476 bytes a fresh split row and ~791 once it is named and
// valued, so a 1,200-line estate is ~0.9MB and a 3,000-line one ~2.5MB, against a ~5MB origin
// quota the 2MB thumbnail cache already shares. The third estate is where it lands, and one
// photograph splitting into many lines is what gets it there faster.
//
// The failure loses the RECORD rather than time: the lines are in memory, the write throws,
// one alert fires, and the next reload has none of them. So the write reclaims what the sheet
// can hand back and tries once more.
//
//   ⚠ SAFE TO DROP MEANS THE SHEET CAN HAND IT BACK. Not the open job, not a job whose write
//     is still queued or still inside its debounce, and not at all when there is no backend —
//     there the device IS the record.
//   ⚠ AND NEVER `hav_media_pending_<id>`. Those are the bytes of a photograph that FAILED to
//     reach Drive: the only copy in existence, and Retry is the only thing that can file them.
// ─────────────────────────────────────────────────────────────────────────────

const { sandbox, fn } = require('./harness');

const liveLines = (s) => String(s).split('\n')
  .filter((l) => { const t = l.trim(); return !(t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')); })
  .join('\n');

// A localStorage that runs out of room the way a real one does: setItem throws once the
// store would go past the cap, and it enumerates, which is how the reclaim finds anything.
function quotaLS(seed, cap) {
  const store = Object.assign({}, seed || {});
  const used = () => Object.keys(store).reduce((n, k) => n + k.length + store[k].length, 0);
  return {
    store,
    ls: {
      getItem(k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem(k, v) {
        v = String(v);
        const had = Object.prototype.hasOwnProperty.call(store, k) ? k.length + store[k].length : 0;
        if (used() - had + k.length + v.length > cap) {
          const e = new Error('QuotaExceededError'); e.name = 'QuotaExceededError'; throw e;
        }
        store[k] = v;
      },
      removeItem(k) { delete store[k]; },
      get length() { return Object.keys(store).length; },
      key(i) { const ks = Object.keys(store); return i >= 0 && i < ks.length ? ks[i] : null; },
    },
  };
}

const ROW = (i) => ({
  stableId: 's' + i, roomIdx: 1, label: 'inventory', collId: null, seq: i,
  filename: 'HVL-0007_Living_INV_' + i + '.jpg', driveFileId: 'F' + i,
  status: 'uploaded', ts: 1000 + i, objectName: 'Object ' + i,
});

function rig(opts) {
  opts = opts || {};
  const seed = Object.assign({
    'hav_media_8': 'x'.repeat(opts.otherSize == null ? 1200 : opts.otherSize),
  }, opts.seed || {});
  const seedBytes = Object.keys(seed).reduce((n, k) => n + k.length + seed[k].length, 0);
  const cap = opts.cap != null ? opts.cap : seedBytes + (opts.slack == null ? 20 : opts.slack);
  const { store, ls } = quotaLS(seed, cap);
  const alerts = [];
  const badges = [];
  const ctx = sandbox({
    fns: ['savePhotoRefs', '_invReclaimSpace', '_invManifestEvictable', '_invNoteReclaim',
          '_warnPhotoStoreFull'],
    vars: ['_photoStoreWarned'],
    stubs: {
      localStorage: ls,
      console: { warn() {}, log() {}, error() {} },
      SHEETS_SYNC_URL: opts.url === undefined ? 'https://script.google.com/a/macros/x/exec' : opts.url,
      _photoRefs: { 7: (opts.rows || [1, 2, 3]).map(ROW) },
      _invSyncTimer: opts.timers || {},
      _pendingWrites: opts.pending || {},
      _outbox: opts.outbox || {},
      showSyncBadge: (m) => badges.push(String(m)),
      alert: (m) => alerts.push(String(m)),
    },
  });
  return { ctx, store, alerts, badges };
}

module.exports = function ({ group, ok, eq, has, lacks }) {

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ A FULL DEVICE RECLAIMS AND WRITES AGAIN RATHER THAN LOSING THE RECORD');
  {
    const { ctx, store, alerts, badges } = rig();
    ok(store['hav_media_8'] !== undefined, 'a finished job is sitting on the device to begin with');
    ctx.savePhotoRefs(7);
    ok(store['hav_media_7'] !== undefined, '⚠ the manifest under way IS SAVED');
    eq(JSON.parse(store['hav_media_7']).length, 3, 'with every row on it');
    eq(store['hav_media_8'], undefined, 'and the finished job was cleared to make the room');
    eq(alerts.length, 0, 'nobody is told the record was lost, because it was not');
    eq(badges.length, 1, 'the badge says what was cleared');
    has(badges[0], 'cleared', 'in those words');
    has(badges[0], 'KB', 'and names how much');

    // The converse: with room to spare nothing is touched and nothing is announced.
    const room = rig({ slack: 500000 });
    room.ctx.savePhotoRefs(7);
    ok(room.store['hav_media_7'] !== undefined, 'a device with room saves normally');
    ok(room.store['hav_media_8'] !== undefined, '⚠ and clears nothing');
    eq(room.badges.length, 0, 'and says nothing');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ IT NEVER TAKES THE BYTES OF A PHOTOGRAPH THAT NEVER REACHED DRIVE');
  {
    // hav_media_pending_<id> is the only copy in existence of a shot that FAILED to upload.
    // Trading it for room would swap a recoverable record for an unrecoverable photograph.
    const { ctx, store } = rig({
      otherSize: 700,
      seed: { 'hav_media_pending_8': 'p'.repeat(700) },
    });
    ctx.savePhotoRefs(7);
    ok(store['hav_media_pending_8'] !== undefined,
       '⚠ the failed-upload bytes survive, whatever it costs');
    eq(store['hav_media_8'], undefined, 'the re-fetchable manifest is what goes instead');
    // Driven rather than grepped: a device holding NOTHING but failed-upload bytes has
    // nothing this function may take, however badly it needs the room.
    const only = rig({ seed: { 'hav_media_pending_8': 'p'.repeat(900) }, otherSize: 0 });
    delete only.store['hav_media_8'];
    eq(only.ctx._invReclaimSpace(7).bytes, 0, 'and there is nothing it will free from them');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ WHAT IT REFUSES TO DROP, AND EACH ONE WOULD LOSE WORK');
  {
    // The job being written. On the happy path dropping it is invisible, because the retry
    // writes it straight back — which is exactly why the first version of this check could
    // not fail. What it is really guarding is the path where the retry ALSO fails: drop the
    // old copy to make room, miss anyway, and the device has lost the rows it already had as
    // well as the ones it could not save.
    const own = rig({ seed: { 'hav_media_7': 'old' }, otherSize: 1200 });
    own.ctx.savePhotoRefs(7);
    eq(JSON.parse(own.store['hav_media_7'] || '[]').length, 3,
       'on the happy path it is overwritten, which is the point');

    const doomed = rig({
      seed: { 'hav_media_7': 'AN OLDER MANIFEST' },
      otherSize: 300,
      rows: Array.from({ length: 15 }, (_, i) => i + 1),
    });
    doomed.ctx.savePhotoRefs(7);
    eq(doomed.alerts.length, 1, 'a write too big to rescue still fails');
    eq(doomed.store['hav_media_8'], undefined, 'having spent the finished job trying');
    eq(doomed.store['hav_media_7'], 'AN OLDER MANIFEST',
       '\u26a0 but what this device ALREADY had is still there \u2014 it lost the new rows, not the old ones');

    // A debounced write still waiting: the sheet has not seen those rows yet.
    const timer = rig({ timers: { 8: 99 } });
    timer.ctx.savePhotoRefs(7);
    ok(timer.store['hav_media_8'] !== undefined,
       '⚠ a job whose sync is still inside the debounce is kept');
    eq(timer.alerts.length, 1, 'and the write fails loudly rather than quietly taking it');

    // A write queued after a failure: same reason, one step further along.
    const queued = rig({ pending: { 'main/saveMedia:8': { tries: 3 } } });
    queued.ctx.savePhotoRefs(7);
    ok(queued.store['hav_media_8'] !== undefined, 'a job with a queued write is kept');

    const outboxed = rig({ outbox: { 'main/saveMedia:8': { target: 'main' } } });
    outboxed.ctx.savePhotoRefs(7);
    ok(outboxed.store['hav_media_8'] !== undefined, 'and so is one still in the outbox');

    // No backend at all: localStorage IS the record, so there is nothing to fetch it back from.
    const offline = rig({ url: '' });
    offline.ctx.savePhotoRefs(7);
    ok(offline.store['hav_media_8'] !== undefined,
       '⚠ with no sheet configured NOTHING is dropped — the device is the only copy');
    eq(offline.alerts.length, 1, 'and the old warning is what fires');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ THUMBNAILS GO FIRST, BECAUSE A CACHE IS ALWAYS SAFE TO LOSE');
  {
    const { ctx, store } = rig({
      otherSize: 400,
      seed: { 'hav_media_thumb_8': 't'.repeat(900), 'hav_media_thumb_7': 'k'.repeat(120) },
    });
    ctx.savePhotoRefs(7);
    eq(store['hav_media_thumb_8'], undefined, 'another job’s thumbnails go');
    ok(store['hav_media_thumb_7'] !== undefined,
       '⚠ but not the open job’s — those are the pictures on the screen');
    ok(store['hav_media_8'] !== undefined,
       'and the cache alone freed enough, so the manifest beside it was never touched');
    ok(store['hav_media_7'] !== undefined, 'the write landed');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ WHEN THERE IS GENUINELY NOTHING TO RECLAIM IT STILL WARNS');
  {
    // The old behaviour has to survive, or a device with one enormous job goes quiet on a
    // failure that really did lose the record.
    const { ctx, store, alerts } = rig({ seed: {}, otherSize: 0, cap: 40 });
    delete store['hav_media_8'];
    ctx.savePhotoRefs(7);
    eq(store['hav_media_7'], undefined, 'the write really did fail');
    eq(alerts.length, 1, '⚠ and the person is told, in the words they were told before');
    has(alerts[0], 'out of local storage', 'naming the cause');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ IT FINDS ANYTHING AT ALL ONLY BECAUSE localStorage ENUMERATES');
  {
    // Driven against the harness's OWN localStorage rather than the quota rig above, because
    // the rig brings its own and would hide this: without length/key() the walk is
    // `0 < undefined`, the loop never runs, and the reclaim reports "nothing to free" on a
    // device that is full of it. A stub that does not match the real contract is worse than
    // no stub, and the real one enumerates.
    const ctx = sandbox({
      fns: ['_invReclaimSpace', '_invManifestEvictable'],
      stubs: {
        console: { warn() {}, log() {}, error() {} },
        SHEETS_SYNC_URL: 'https://x/exec',
        _invSyncTimer: {}, _pendingWrites: {}, _outbox: {},
      },
    });
    ctx.localStorage.setItem('hav_media_8', 'y'.repeat(500));
    ctx.localStorage.setItem('hav_media_thumb_8', 't'.repeat(200));
    ctx.localStorage.setItem('hav_media_pending_8', 'p'.repeat(300));
    ctx.localStorage.setItem('hav_media_7', 'mine');
    ctx.localStorage.setItem('havellin_jobs_v3', 'j'.repeat(400));

    const t1 = ctx._invReclaimSpace(7, 1);
    eq(t1.thumbs, 1, 'tier 1 finds the other job\u2019s thumbnails');
    eq(t1.jobs.length, 0, 'and touches no manifest');
    ok(t1.bytes > 200, 'and reports what it freed');

    const t2 = ctx._invReclaimSpace(7, 2);
    eq(t2.jobs.join(','), '8', 'tier 2 finds the other job\u2019s manifest, by id');
    eq(ctx.localStorage.getItem('hav_media_8'), null, 'and it is gone');
    eq(ctx.localStorage.getItem('hav_media_7'), 'mine', 'the open job is not');
    ok(ctx.localStorage.getItem('hav_media_pending_8') !== null, 'nor the failed-upload bytes');
    ok(ctx.localStorage.getItem('havellin_jobs_v3') !== null,
       '\u26a0 and it stays out of every store that is not the photo manifest');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ `_invSyncTimer` MEANS "STILL WAITING", WHICH IT DID NOT BEFORE');
  {
    // It was set and never cleared. Harmless while nothing read it; the eviction guard reads
    // it now, and a timer id left standing marks every job that has ever synced as unsafe.
    // ⚠ The clear has to happen INSIDE the callback, not around it: `_invSyncTimer[id] =
    // setTimeout(...)` assigns the id AFTER the callback would have run under a synchronous
    // stub, so a stub that fires immediately would read as failing on correct code.
    let fire = null;
    const ctx = sandbox({
      fns: ['_scheduleInventorySync'],
      stubs: {
        SHEETS_SYNC_URL: 'https://x/exec',
        _invSyncTimer: {},
        _invCloudSeen: {},
        jobs: [{ id: 8 }],
        setTimeout: (f) => { fire = f; return 4242; },
        clearTimeout() {},
        postSyncBadge() {},
        buildMediaPayload: () => ({ jobId: '8', items: [] }),
      },
    });
    ctx._scheduleInventorySync(8);
    eq(ctx._invSyncTimer[8], 4242, 'while the debounce is running the timer id is held');
    ok(typeof fire === 'function', 'and the callback is armed');
    fire();
    ok(!ctx._invSyncTimer[8], '⚠ and the moment it fires the flag is cleared');
  }
};
