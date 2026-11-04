'use strict';
// THE WALKTHROUGH'S OWN CAMERA, AND THE YARDS ON THE ROOM GRID (2026-11-04).
//
// Anthony, off the first live walkthrough: "we really needed to take pictures of each room and the yard at the
// walkthrough/estimate phase. And the yard is not even an area of the home that we have in the app to even price …
// we should have front yard and back yard as 'rooms' in exterior & auxiliary." The camera on the Job Plan files only
// on a won client (`_photoCaptureJob`), so nothing photographed a prospect's house; and the grid had no yard.
// Each group drives the real code: the engine through driveCalcAll, the photo path through the real upload function
// over a stubbed Drive.

const { sandbox, domStub, driveCalcAll, source } = require('./harness');

module.exports = function ({ group, ok, eq, has, lacks }) {
  const SRC = source();

  function attempt(f) { try { return f(); } catch (e) { return { __err: String(e && e.message || e) }; } }
  function rowIdOf(ctx, name) {
    let ri = 0, found = null;
    ctx.ROOMS.forEach((sec) => sec.rooms.forEach((r) => { if (r.name === name && found == null) found = 'r' + ri; ri++; }));
    return found;
  }

  // ═══ A · THE YARDS ═══
  group('A · Front Yard and Back Yard sit under Exterior & Auxiliary, weighted 2.0, priced on top of the house');
  {
    const c = sandbox({ vars: ['ROOMS', 'ROOM_WEIGHT', 'EXTERIOR_ROOMS'], fns: ['engineIsExterior', 'engineRoomWeight'] });
    const sec = c.ROOMS.find((s) => s.section === 'Exterior & Auxiliary');
    ['Front Yard', 'Back Yard'].forEach((n) => {
      ok(sec && sec.rooms.some((r) => r.name === n), n + ' is a row under Exterior & Auxiliary');
      // ⚠ read off the catalogue itself: engineRoomWeight answers 2.0 for a row with no weight at all (the sweep found it).
      eq(c.ROOM_WEIGHT[n], 2.0, n + ' is weighted 2.0 in ROOM_WEIGHT (between the shed, 1.65, and the furnished patio, 2.2)');
      eq(c.engineIsExterior(n), true, n + ' is exterior: its load is added on top, never averaged into the square footage');
    });
    const all = [];
    c.ROOMS.forEach((s) => s.rooms.forEach((r) => all.push(s.section + '|' + r.name)));
    eq(all.filter((k) => /Yard$/.test(k)).length, 2, 'exactly two yard rows in the whole grid');
  }

  group('A2 · through the real engine: a back yard scored full raises the quote, and a light one never lowers it');
  {
    const base = ['Living Room', 'Kitchen', 'Primary Suite', 'Primary Bath'];
    const a = attempt(() => driveCalcAll({ svc: 'downsizing', rooms: base }).est);
    const b = attempt(() => driveCalcAll({ svc: 'downsizing', rooms: base.concat([{ name: 'Back Yard', vol: 5 }]) }).est);
    const b1 = attempt(() => driveCalcAll({ svc: 'downsizing', rooms: base.concat([{ name: 'Back Yard', vol: 1 }]) }).est);
    ok(a && b && !a.__err && !b.__err, 'both estimates price' + ((a && a.__err) || (b && b.__err) || ''));
    if (a && b && !a.__err && !b.__err) {
      ok(b.grandTotal > a.grandTotal, 'a full back yard adds to the quote (' + a.grandTotal + ' → ' + b.grandTotal + ')');
      ok(b1.grandTotal >= a.grandTotal, 'a light one never takes anything off: exterior load is absolute (' + b1.grandTotal + ')');
      const room = (b.rooms || []).find((r) => r.name === 'Back Yard');
      ok(room && room.section === 'Exterior & Auxiliary', 'the yard rides the estimate as a room of its section');
    }
  }

  // ═══ B · THE PHOTOS RIDE THE ESTIMATE'S ROOM ═══
  group('B · calcAll carries a room\'s walkthrough photos onto its record, and a room with none saves as it always did');
  {
    const d = attempt(() => driveCalcAll({ svc: 'downsizing', rooms: ['Kitchen', 'Living Room', { name: 'Dining Room', state: 'excl' }] }));
    ok(d && !d.__err, 'the estimate prices' + ((d && d.__err) || ''));
    if (d && !d.__err) {
      const kId = rowIdOf(d.ctx, 'Kitchen'), dId = rowIdOf(d.ctx, 'Dining Room');
      const P = [{ fileId: 'F1', url: 'https://drive.google.com/file/d/F1/view', ts: '2026-11-04T15:00:00Z', by: 'Anthony Graziano', name: 'x.jpg' }];
      d.doc.getElementById('wph-' + kId).value = JSON.stringify(P);
      d.doc.getElementById('wph-' + dId).value = JSON.stringify([{ fileId: 'F2', url: 'u2' }]);
      d.ctx.calcAll();
      const rooms = d.ctx.currentEstimate.rooms || [];
      const k = rooms.find((r) => r.name === 'Kitchen'), lr = rooms.find((r) => r.name === 'Living Room');
      const dr = rooms.find((r) => r.name === 'Dining Room');
      eq(k && k.photos && k.photos.map((p) => p.fileId), ['F1'], 'the kitchen carries its photo');
      eq(lr && Object.prototype.hasOwnProperty.call(lr, 'photos'), false, 'the living room, with none, has no photos key at all');
      eq(dr && dr.excluded && dr.photos && dr.photos[0].fileId, 'F2', 'a room marked ✕ keeps its photos too (the house as found)');
      d.doc.getElementById('wph-' + kId).value = '{not json';
      d.ctx.calcAll();
      const k2 = (d.ctx.currentEstimate.rooms || []).find((r) => r.name === 'Kitchen');
      eq(k2 && Object.prototype.hasOwnProperty.call(k2, 'photos'), false, 'an unreadable box reads as none, never a throw');
    }
  }

  group('B2 · the lock snapshot freezes them with the note');
  {
    const c = sandbox({ fns: ['buildLockSnapshot'] });
    const est = { rooms: [{ name: 'Kitchen', idx: 9, note: 'n', photos: [{ fileId: 'F1' }] }, { name: 'Den', idx: 2 }] };
    c.buildLockSnapshot(est, 'Anthony');
    eq(((est.lockedRooms[0] || {}).photos || []).map((p) => p.fileId), ['F1'], 'the locked room keeps its photos');
    eq((est.lockedRooms[1] || {}).photos, [], 'a room with none locks with an empty list');
  }

  // ═══ C · TAKING ONE ═══
  function rig(opt) {
    opt = opt || {};
    const doc = domStub({ 'e-job': '7', 'name-r3': { tagName: 'SPAN', textContent: 'Kitchen' }, 'wph-r3': '' });
    const sent = [], badges = [];
    let calcs = 0;
    const job = Object.assign({ id: 7, name: 'Margaret Lowe', hvlId: 'HVL-2611-007', driveFolder: 'https://drive/x', driveSubfolders: { 'Walkthrough Photos': { id: 'W1' } } }, opt.job || {});
    const ctx = sandbox({
      fns: ['walkPhotosOf', '_walkPhotosSet', '_walkPhotoPaint', '_walkRoomName', '_walkPhotoName', '_walkPhotoSend', 'walkPhotoRetry',
        'walkPhotosOwed', '_walkPhotoViewerRepaint', '_walkPhotosClear', 'walkPhotoRefusal', 'resolveSubfolderId', '_subfolderId', '_syncOwedOnUnload'],
      vars: ['WALK_PHOTO_SUBFOLDER', '_walkShotsLive', '_walkThumbs', '_walkSeq', '_walkViewer'],
      stubs: {
        document: doc, jobs: [job], SHEETS_SYNC_URL: 'https://script', fetchSubfolderIds: (j, cb) => cb(),
        uploadToDrive: (folderId, name, data, cb) => sent.push({ folderId, name, data, cb }),
        showSyncBadge: (m, e) => badges.push(m), scheduleCalcAll: () => { calcs++; }, _invStampBy: () => 'Ashley Jerome',
        _pendingWrites: {}, _outbox: {}, _outboxSending: false, _flushing: false, _invSyncTimer: {},
      },
    });
    return { ctx, doc, sent, badges, job, calcs: () => calcs };
  }

  group('C · a photo is recorded once Drive has it: in the Walkthrough Photos folder, with its link, day and who took it');
  {
    const r = rig();
    const shot = { uid: 'u1', jobId: 7, room: 'Kitchen', data: 'data:image/jpeg;base64,AAA', status: 'uploading' };
    r.ctx._walkShotsLive.r3 = [shot];
    r.ctx._walkPhotoSend('r3', shot);
    eq(r.sent.length, 1, 'one upload');
    eq(r.sent[0] && r.sent[0].folderId, 'W1', 'into the client\'s Walkthrough Photos folder');
    ok(r.sent[0] && /^HVL-2611-007 Walkthrough Kitchen /.test(r.sent[0].name), 'named for the client and the room: ' + (r.sent[0] && r.sent[0].name));
    eq(r.ctx.walkPhotosOf('r3').length, 0, 'nothing is recorded while it uploads');
    eq(r.ctx.walkPhotosOwed(), true, 'and the page owes it (the guard as the page goes asks)');
    eq(r.ctx._syncOwedOnUnload(), true, '_syncOwedOnUnload says so');
    if (r.sent[0]) r.sent[0].cb(true, 'https://drive/F9', 'F9');
    const got = r.ctx.walkPhotosOf('r3');
    eq(got.map((p) => p.fileId), ['F9'], 'once Drive answers, the photo is on the room');
    eq(got[0] && got[0].url, 'https://drive/F9', 'with its link');
    eq(got[0] && got[0].by, 'Ashley Jerome', 'and who took it (the device\'s user)');
    eq(r.ctx.walkPhotosOwed(), false, 'nothing owed now');
    eq(r.ctx._syncOwedOnUnload(), false, 'and the guard lets the page go');
    ok(r.calcs() >= 1, 'the estimate is recomputed, so the photo reaches the record and the unsaved-draft copy');
    eq(r.doc.getElementById('wph-n-r3').textContent, '📷 1', 'the row\'s count reads 1');
  }

  group('C2 · a failed upload is held with its bytes and Retry sends it again; nothing is recorded until it lands');
  {
    const r = rig();
    const shot = { uid: 'u1', jobId: 7, room: 'Kitchen', data: 'D', status: 'uploading' };
    r.ctx._walkShotsLive.r3 = [shot];
    r.ctx._walkPhotoSend('r3', shot);
    if (r.sent[0]) r.sent[0].cb(false);
    eq(shot.status, 'failed', 'the shot is marked failed');
    eq(r.ctx.walkPhotosOf('r3').length, 0, 'nothing recorded');
    ok(r.badges.some((b) => /did not reach Drive/.test(b) && /retry/i.test(b)), 'the badge says so and where Retry is');
    ok(/not saved/.test(r.doc.getElementById('wph-n-r3').textContent), 'the row\'s count says not saved');
    eq(r.ctx._syncOwedOnUnload(), true, 'the page asks before it is closed on it');
    r.ctx.walkPhotoRetry('r3', 'u1');
    eq(r.sent.length, 2, 'Retry sends it again');
    if (r.sent[1]) r.sent[1].cb(true, 'u', 'F2');
    eq(r.ctx.walkPhotosOf('r3').map((p) => p.fileId), ['F2'], 'and it is recorded once it lands');
  }

  group('C3 · an answer that lands after the estimate moved to another client is never recorded on the wrong one');
  {
    const r = rig();
    const shot = { uid: 'u1', jobId: 7, room: 'Kitchen', data: 'D', status: 'uploading' };
    r.ctx._walkShotsLive.r3 = [shot];
    r.ctx._walkPhotoSend('r3', shot);
    r.doc.getElementById('e-job').value = '8';
    if (r.sent[0]) r.sent[0].cb(true, 'u', 'F3');
    eq(r.ctx.walkPhotosOf('r3').length, 0, 'not written onto the grid now showing another client');
    ok(r.badges.some((b) => /in Drive but not on the estimate/.test(b) && /Margaret Lowe/.test(b)), 'the badge names the client and says where the photo is');
  }

  group('C4 · an older client folder with no Walkthrough Photos folder files them beside the estimate');
  {
    const r = rig({ job: { driveSubfolders: { Estimates: { id: 'E1' } } } });
    const shot = { uid: 'u1', jobId: 7, room: 'Kitchen', data: 'D', status: 'uploading' };
    r.ctx._walkShotsLive.r3 = [shot];
    r.ctx._walkPhotoSend('r3', shot);
    eq(r.sent[0] && r.sent[0].folderId, 'E1', 'the Estimates folder');
    const r2 = rig({ job: { driveSubfolders: {} } });
    const s2 = { uid: 'u2', jobId: 7, room: 'Kitchen', data: 'D', status: 'uploading' };
    r2.ctx._walkShotsLive.r3 = [s2];
    r2.ctx._walkPhotoSend('r3', s2);
    eq(r2.sent.length, 0, 'with neither, nothing is sent');
    eq(s2.status, 'failed', 'and the shot is held as not saved, never dropped');
  }

  group('C5 · who may take one: a client with a Drive folder, on an estimate not yet submitted; no won gate');
  {
    const r = rig();
    const W = (job, locked) => r.ctx.walkPhotoRefusal(job, locked);
    has(W(null, false), 'Choose the client', 'no client: named');
    has(W(r.job, true), 'locked', 'a submitted or approved estimate: named');
    has(W({ id: 1 }, false), 'no Google Drive folder', 'no folder: named, with the fix');
    eq(W(Object.assign({}, r.job, { status: 'new' }), false), '', 'a client not yet won takes photos (the walkthrough comes before the yes)');
  }

  group('C6 · a room turned off takes its photos off the grid, as it takes its note');
  {
    const r = rig();
    r.ctx._walkPhotosSet('r3', [{ fileId: 'F1', url: 'u' }]);
    r.ctx._walkShotsLive.r3 = [{ uid: 'x', status: 'failed' }];
    r.ctx._walkPhotosClear('r3');
    eq(r.ctx.walkPhotosOf('r3').length, 0, 'cleared');
    eq(r.ctx.walkPhotosOwed(), false, 'and nothing of the last client is held for the next');
    const body = SRC.slice(SRC.indexOf('function setRoomState('), SRC.indexOf('function toggleRoom('));
    ok(body.length > 500 && body.length < 9000, 'setRoomState sliced (' + body.length + ')');
    has(body, '_walkPhotosClear(id);', 'setRoomState clears them where it clears the note');
  }

  // ═══ D · NEVER INVENTORY; THE PLAN'S BRIEF ═══
  group('D · walkthrough photos never enter the inventory manifest, so Agent One, the desk and the papers never see them');
  {
    const a = SRC.indexOf('// ─── WALKTHROUGH PHOTOS (2026-11-04)'), b = SRC.indexOf('// ─── PS SLOT HELPERS');
    const blk = a > 0 && b > a ? SRC.slice(a, b).split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n') : '';
    ok(blk.length > 4000, 'the block sliced, comments stripped (' + blk.length + ')');
    ['_photoRefs', '_setPhotoRef', '_captureShot', 'savePhotoRefs', '_photoCaptureJob'].forEach((n) => lacks(blk, n, 'no ' + n));
    const cf = SRC.slice(SRC.indexOf('function createDriveJobFolder('), SRC.indexOf('function createDriveJobFolder(') + 3000);
    has(cf, 'WALK_PHOTO_SUBFOLDER]', 'a new client\'s folder is made with its Walkthrough Photos folder');
  }

  group('D2 · the Job Plan\'s room brief offers them a press away, and the viewer opens each in Drive');
  {
    const c = sandbox({ fns: ['walkPhotoBriefHtml', 'walkPhotoViewerHtml', '_walkTileHtml', 'esc', 'fmtDate2'], vars: ['_walkThumbs'] });
    eq(c.walkPhotoBriefHtml(7, { idx: 3 }), '', 'none, nothing drawn');
    const h = c.walkPhotoBriefHtml(7, { idx: 3, photos: [{ fileId: 'a' }, { fileId: 'b' }] });
    has(h, 'Walkthrough photos (2)', 'two, counted');
    has(h, 'openPlanWalkPhotos(7,3)', 'and the press opens that room\'s');
    const v = c.walkPhotoViewerHtml('Walkthrough photos — Kitchen', [{ fileId: 'a', url: 'https://drive/a', ts: '2026-11-04T15:00:00Z', by: 'Ashley' }],
      [{ uid: 'u9', data: 'data:x', status: 'failed' }], 'r3');
    has(v, 'href="https://drive/a"', 'a photo links to its file');
    has(v, 'target="_blank"', 'in a new tab');
    has(v, "walkPhotoRetry('r3','u9')", 'a held one offers Retry');
    has(v, 'never go on a client paper', 'and the viewer says what they are for');
    const ws = SRC.slice(SRC.indexOf('function _paintRoomWorkspace('), SRC.indexOf('function _paintRoomWorkspace(') + 4000);
    has(ws, 'walkPhotoBriefHtml(jobId, room)', 'the room workspace draws the brief');
  }

  group('D3 · the old room photos\' dead click handler is gone from the grid');
  {
    const g = SRC.slice(SRC.indexOf('function buildRoomTable('), SRC.indexOf('function buildRoomTable(') + 9000);
    lacks(g, "closest('.rm-photo')", 'no .rm-photo listener');
    lacks(SRC, 'removeRoomPhoto(', 'nothing calls a removeRoomPhoto that does not exist');
    has(g, 'walkPhotoControlsHtml(id)', 'each row draws the camera');
  }
};
