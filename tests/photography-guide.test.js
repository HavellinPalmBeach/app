'use strict';
// photography-guide.html — the field method for the room's camera (2026-10-06).
//
// ⚠⚠ WHY THIS EXISTS. Anthony, 2026-10-06: *"if there is a blue vase and I take a picture of it on a
// dresser and then I take another picture zoomed in on the blue vase … the agent should realize it's
// the same [vase]. I'm not entirely sure if that's the case."* It is not: Agent One reads each Items
// shot alone and writes a line for everything in it, so the zoom is a second vase unless it was taken
// as a Detail. The guide teaches the method that keeps a thing in one frame, and to do that it states
// how the app reads a picture: up to four close-ups ride with their item, the shot is kept at 900
// pixels, a frame the agent splits gives the chip and ⚑ to its first line only, a note said over a
// close-up reaches nobody, Possible duplicates compares names, and a walkthrough collection shot in
// the house is still listed as not brought in.
//
// ⚠ EACH OF THOSE IS A SENTENCE A CONCIERGE ACTS ON, so each is held here to the code that makes it
// true, driven where it can be. Four of them describe gaps the method works around (the guide's
// "Where the app still leans on you" box, and Open work in CLAUDE.md). When one is fixed this file
// goes red on purpose: update the guide's sentence, then this check, in the same commit.

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { sandbox, fn, matchBrace } = require('./harness');

const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const GUIDE_FILE = 'photography-guide.html';

// The guide as a reader sees it: tags and comments out, entities decoded, whitespace folded, accents
// kept. `fold` also drops the accents, for comparing the app's category names with the backend's.
function text(html) {
  return String(html)
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&eacute;/g, 'é')
    .replace(/&rsquo;|&lsquo;/g, '’').replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&middot;/g, '·').replace(/&sect;/g, '§').replace(/&#\d+;/g, ' ')
    .replace(/\s+/g, ' ');
}
const fold = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const count = (hay, needle) => hay.split(needle).length - 1;

const GS = read('apps-script/main-sync.gs');
function gsFn(name) {
  const re = new RegExp('(^|\\n)function\\s+' + name + '\\s*\\(', 'g');
  const m = re.exec(GS);
  if (!m) throw new Error('not in .gs: ' + name);
  const start = m.index + (m[1] ? m[1].length : 0);
  const open = GS.indexOf('{', re.lastIndex);
  return GS.slice(start, matchBrace(GS, open) + 1);
}

const ROW = (over) => Object.assign({
  stableId: 's1', roomIdx: 4, label: 'inventory', seq: 1, status: 'uploaded', ts: 1000,
  filename: 'HVL-0007_Bedroom_INV_1.jpg', driveFileUrl: 'https://drive.google.com/file/d/FID/view',
  driveFileId: 'FID', objectName: '', category: 'General/Household', disposition: '',
}, over || {});
const DETAIL = (over) => Object.assign({
  stableId: 'd1', roomIdx: 4, label: 'detail', groupId: 's1', seq: 1, status: 'uploaded', ts: 1100,
  filename: 'HVL-0007_Bedroom_DETAIL_1.jpg', driveFileUrl: 'https://drive.google.com/file/d/DID/view',
  driveFileId: 'DID',
}, over || {});

function rig(refs, stubs) {
  return sandbox({
    fns: ['agentShotGroups', 'agentNameableRefs', '_agDetailRefs', '_agShotPayload', '_agWrite',
          'agentApplyResult', '_agState', 'invSplitItemN', '_getPhotoRef', '_setPhotoRef', '_jobInvRefs',
          '_invFileId', '_photoUid', '_invPhotoSource', '_invRoomName', '_invDetailRefs',
          '_agNameKey', '_agDupEligible', 'agentDuplicateGroups', '_arDupEligible', '_arWrite',
          '_importableFromEstimate', '_importedSourceSet', '_pushInvLine',
          '_collDispToInv', '_collDispNeedsAppr', '_guessCategory', '_numOrBlank',
          // P24: the walkthrough's collections join the inventory by themselves and wait for a photograph.
          'collectionLinesEnsure', '_collLinesOf', 'collectionLineId', 'collectionLineUnshot', '_invHasPhoto',
          'collectionsAwaitingPhoto', 'collectionLineWithPhoto', 'collectionUseLine', '_invJob', 'fieldDispToInv',
          '_invTombstoneLine', '_invItemNo', '_invNamed', '_avHasFigure', '_invHasValue'],
    vars: ['_agRun', 'AGENT_MAX_DETAILS', 'INV_TAXONOMY', 'INV_CATEGORIES', 'INV_DEFAULT_CATEGORY',
           'INV_SPLIT_MAX', '_photoUidSeq', 'AGENT_ROOM_CONF_RANK', 'COLL_LINE_WEAK_STAMP',
           'FIELD_DISPOSITIONS', 'FIELD_DISP_DEFAULT'],
    stubs: Object.assign({
      jobs: [{ id: 7, hvlId: 'HVL-0007', svc: 'cleanout' }],
      _photoRefs: { 7: refs || [] },
      estimateStore: { 7: { estimate: { rooms: [{ idx: 4, name: 'Bedroom', note: '' }] } } },
      savePhotoRefs() {},
      _invTouch(r) { r.updatedAt = 1; return r; },
      _scheduleInventorySync() {},
      renderInventoryTab() {},
      alert() {},
      document: { getElementById: () => null },
      isJobWon: () => true, SHEETS_SYNC_URL: '', _invCloudSeen: {},
      window: { confirm: () => true }, _invStampBy: () => 'Ashley Jerome',
    }, stubs || {}),
  });
}

module.exports = function ({ group, ok, eq, has, lacks }) {
  const guideHtml = read(GUIDE_FILE);
  const guide = text(guideHtml);

  // ═══════════════════════════════════════════════════════════════════════════
  group('the guide is a page of its own, reached from the playbook and the manual (both copies)');
  {
    ok(guide.length > 8000, 'the guide reads as a document (' + guide.length + ' characters of text)');
    ['concierge-guide.html', 'CONCIERGE_GUIDE.md', 'manual.html', 'MANUAL.md'].forEach((f) => {
      ok(read(f).includes(GUIDE_FILE), f + ' links the guide');
    });
    const hrefs = [...guideHtml.matchAll(/href="([^"#:]+\.html)"/g)].map((m) => m[1]);
    ok(hrefs.length >= 3, 'the guide links its neighbours (' + hrefs.join(', ') + ')');
    hrefs.forEach((h) => ok(fs.existsSync(path.join(ROOT, h)), 'and ' + h + ' is in the repo'));
    has(guide, 'Shooting a room', 'the field card is on it');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('"read up to four": the close-ups that ride with an item, on both sides of the wire');
  {
    eq(count(guide, 'read up to four'), 2, 'the guide says so twice: the table of shots and the close-ups stage');
    const details = [1, 2, 3, 4, 5, 6].map((i) => DETAIL({ stableId: 'd' + i, driveFileId: 'D' + i, ts: 1100 + i }));
    const ctx = rig([ROW()].concat(details));
    eq(ctx.AGENT_MAX_DETAILS, 4, 'the app sends four');
    const payload = ctx._agShotPayload(7, { srcId: 's1', rows: ['s1'] });
    eq(payload && payload.details.length, 4, 'six close-ups taken, four in the payload');

    // The backend reads no more than four whatever it is sent.
    const box = { _agImageBlock: (id) => ({ type: 'image', id }), String, Math };
    vm.createContext(box);
    vm.runInContext(gsFn('_agUserContent'), box);
    const content = box._agUserContent({ fileId: 'FID', room: 'Bedroom',
      details: details.map((d) => ({ fileId: d.driveFileId })) });
    eq(content.filter((b) => b.type === 'image').length, 5, 'the item and four close-ups reach the model');
  }

  group('"900-pixel": the copy the app keeps of every shot');
  {
    has(guide, '900-pixel', 'the guide names the size');
    const cap = fn('_captureShot');
    eq(count(cap, 'compressImage(rawDataUrl, 900,'), 1, '_captureShot keeps a 900-pixel copy');
  }

  group('"$100": the lot cap on an estate filing a Form 706');
  {
    has(guide, 'worth more than $100', 'the guide names the cap');
    has(guide, '§20.2031-6(a)', 'and its source');
    const ctx = sandbox({ vars: ['INV_LOT_ARTICLE_CAP'] });
    eq(ctx.INV_LOT_ARTICLE_CAP, 100, 'the app flags a lot on the same figure');
  }

  group('the categories the agent gives a line each are the ones the guide names, in the app’s words');
  {
    const sys = gsFn('_agSystem');
    const m = sys.match(/Give a line of its own to anything in these categories: ([^.]*)\./);
    ok(!!m, 'the agent’s prompt still names its own-line categories');
    const names = m ? m[1].replace(/'\s*\+\s*'/g, '').split(/,\s*/).map((s) => s.trim()).filter(Boolean) : [];
    ok(names.length >= 9, 'and there are ' + names.length + ' of them');
    const taxonomy = sandbox({ vars: ['INV_TAXONOMY'] }).INV_TAXONOMY.map((t) => fold(t.cat));
    const g = fold(guide);
    names.forEach((n) => {
      ok(taxonomy.includes(fold(n)), '"' + n + '" is an app category');
      ok(count(g, fold(n)) >= 2, '"' + n + '" is in the guide’s table of shots and its own-frame list');
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('rule 03 and the quick way: a split frame gives the chip and the flag to its first line only');
  {
    eq(count(guide, 'come back Undecided and unflagged'), 2, 'the guide says what the other lines carry, in rule 03 and in its gaps box');
    const ctx = rig([ROW({ disposition: 'Sell', needsAppr: true, fieldNote: 'Mom’s, from Venice' }),
                     DETAIL()]);
    ctx.agentApplyResult(7, { srcId: 's1', rows: ['s1'] }, { notices: [], objects: [
      { name: 'Mahogany dresser', category: 'Furniture', qty: 1, confidence: 'high', basis: '', crop: [] },
      { name: 'Cobalt art glass vase, likely Murano', category: 'Art & Décor', qty: 1, confidence: 'medium', basis: '', crop: [] },
      { name: 'Brass table lamp', category: 'General/Household', qty: 1, confidence: 'medium', basis: '', crop: [] },
    ] });
    const lines = ctx._jobInvRefs(7);
    eq(lines.length, 3, 'one Items shot of a dressed dresser makes three lines');
    const first = lines.find((r) => r.stableId === 's1');
    const split = lines.filter((r) => r.derivedFrom === 's1');
    eq(first && [first.disposition, first.needsAppr], ['Sell', true], 'the first line keeps the chip and the flag');
    eq(split.map((r) => [r.disposition, !!r.needsAppr]), [['', false], ['', false]],
       'the lines split off come back Undecided and unflagged (the guide’s rule 03 and its desk step 3)');
    eq(split.map((r) => r.fieldNote || ''), ['', ''], 'and without the note');
    eq(ctx._invDetailRefs(7, 's1').length, 1, 'the close-up sits under the first line at the desk');
    eq(split.map((r) => ctx._invDetailRefs(7, r.stableId).length), [0, 0],
       'and under no line split off it (the guide’s gaps box)');
  }

  group('stage 5 and the gaps box: a note said over a close-up reaches neither agent nor desk');
  {
    has(guide, 'stays on the close-up', 'the guide says so');
    const ctx = rig([ROW({ fieldNote: 'Venetian glass' }), DETAIL({ fieldNote: 'promised to Karen' })]);
    const payload = ctx._agShotPayload(7, { srcId: 's1', rows: ['s1'] });
    eq(payload && payload.fieldNote, 'Venetian glass', 'the agent is sent the item’s own note');
    eq(JSON.stringify(payload).includes('Karen'), false, 'and nothing said over its close-up');
    eq(ctx._jobInvRefs(7).map((r) => r.fieldNote), ['Venetian glass'], 'the desk’s line carries the item’s note alone');
  }

  group('the room check: a room read together, and its finding under Possible duplicates (P24)');
  {
    has(guide, 'reads each room’s photographs together', 'the guide says what the room check does');
    lacks(guide, 'shot spot', '⚠ Anthony replaced setting each shot thing aside with the room check (2026-10-06)');
    // Two lines named two ways off two photographs: the name rule cannot see them, the room check's finding can.
    const named = (id, name) => ROW({ stableId: id, driveFileId: 'F' + id, filename: id + '.jpg', objectName: name, namedBy: 'agent' });
    const ctx = rig([named('a', 'Blue vase'), named('b', 'Cobalt art glass vase, likely Murano')]);
    eq(ctx.agentDuplicateGroups(7).length, 0, 'before the check: one vase named two ways is not flagged by name');
    const room = { roomIdx: 4, photos: [{ srcId: 'a', lines: [ctx._getPhotoRef(7, 'a')] }, { srcId: 'b', lines: [ctx._getPhotoRef(7, 'b')] }] };
    eq(ctx._arWrite(7, room, { doubles: [{ ids: ['a', 'b'], why: 'the cobalt vase on the dresser in one and close up in the other', confidence: 'high' }] }), 1,
       'the room check’s answer is written on the two lines');
    const g = ctx.agentDuplicateGroups(7);
    eq(g.length === 1 ? [g[0].rows.length, g[0].why] : g.length, [2, 'the cobalt vase on the dresser in one and close up in the other'],
       'after it: one group, with what the pictures showed');
    // The runs a big room is read in, as the guide states them.
    // ⚠ 12 and 6 since the first live run (2026-10-06: eight photographs in 32 s, against UrlFetchApp's 60 s).
    has(guide, 'overlapping runs of 12', 'the guide states the run');
    has(guide, 'within six of each other are always read together', 'and what the overlap guarantees');
    const win = GS.match(/var\s+AGENT_ROOM_WINDOW\s*=\s*(\d+)/), lap = GS.match(/var\s+AGENT_ROOM_OVERLAP\s*=\s*(\d+)/);
    eq([win ? +win[1] : NaN, lap ? +lap[1] : NaN], [12, 6], 'and the backend reads a room in runs of 12 sharing 6');
  }

  group('collections: on the inventory by themselves, and the camera’s shot goes on the collection’s line (P24)');
  {
    has(guide, 'It is on the inventory already', 'the guide says a collection needs no import');
    has(guide, 'tap it, then shoot it', 'and the field card says how it is photographed');
    const est = { rooms: [{ idx: 4, name: 'Study', note: '' }],
                  collections: [{ id: 1700000000000, name: 'Coin collection', disp: 'appraise', qty: '200', value: '' }] };
    const ctx = rig([], { estimateStore: { 7: { estimate: est } } });
    eq(ctx.collectionLinesEnsure(7), 1, 'the walkthrough’s collection is a line by itself');
    const id = '7_col1700000000000';
    const line = ctx._getPhotoRef(7, id);
    eq([ctx.collectionLineUnshot(line), ctx.collectionsAwaitingPhoto(7).length], [true, 1], 'waiting for its photograph');
    // The camera armed for it: the shot is filed under the line's own id (`_captureShot` with `into`).
    const shot = { roomIdx: 4, label: 'inventory', seq: 3, collId: null, filename: 'HVL_Study_INV_3.jpg', driveFileUrl: null, status: 'uploading', ts: 9 };
    const filled = ctx.collectionLineWithPhoto(line, shot, { fieldDisp: 'undecided' });
    eq([filled.stableId, filled.roomIdx, filled.needsAppr, String(filled.sourceCollId), filled.objectName],
       [id, 4, true, '1700000000000', ''], 'the line keeps its id, link and instruction, in the room it was shot, and is named from the picture');
    has(filled.fieldNote, 'From the walkthrough: Coin collection (200)', 'with the walkthrough’s words for the agent to read');
    ctx._setPhotoRef(7, filled);
    eq([ctx.collectionLineUnshot(ctx._getPhotoRef(7, id)), ctx.collectionsAwaitingPhoto(7).length], [false, 0], 'and it is photographed: nothing owed');
    eq(ctx._jobInvRefs(7).length, 1, '⚠⚠ one line for the collection, never two');

    // The desk's half: shot as an ordinary line, the collection's line hands over to it and the count stays one.
    const desk = rig([ROW({ stableId: 'p1', filename: 'p1.jpg', objectName: 'Morgan dollars in albums' })], { estimateStore: { 7: { estimate: est } } });
    desk.collectionLinesEnsure(7);
    eq(desk._jobInvRefs(7).length, 2, 'fixture: the collection’s line and the line shot of it');
    eq(desk.collectionUseLine(7, id, 'p1'), true, 'the desk hands the collection to the line shot of it');
    eq(desk._jobInvRefs(7).map((r) => [r.stableId, String(r.sourceCollId), r.needsAppr]), [['p1', '1700000000000', true]],
       'one line, the photographed one, carrying the collection and its instruction');
  }

  group('a Detail never makes a line');
  {
    has(guide, 'never becomes a line', 'the guide says so');
    const ctx = rig([ROW(), DETAIL()]);
    eq(ctx._jobInvRefs(7).map((r) => r.stableId), ['s1'], 'the close-up is not an inventory line');
    eq(ctx.agentShotGroups(7).length, 1, 'and is not sent to be named on its own');
  }
};
