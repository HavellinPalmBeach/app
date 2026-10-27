'use strict';
// photography-guide.html — the field method for the room's camera (2026-10-06), rewritten the same day in plain
// words for a beginner (Anthony: *"write this to a human who does not understand the code or the app"*, and *"write
// this in human speak and cut it down to size"*).
//
// ⚠⚠ WHY THIS EXISTS. Anthony, 2026-10-06: *"if there is a blue vase and I take a picture of it on a dresser and then I
// take another picture zoomed in on the blue vase … the agent should realize it's the same [vase]."* It does not, unless
// the zoom is a close-up (the Close-up shutter, since P25): the app names each item photo on its own and lists everything in it. The
// guide teaches the method, and to do that it says how the app treats a photo: the first four close-ups are read, a
// close-up never adds an item, the destination and the Appraise flag stick to one thing per photo, a note said after a
// close-up goes on its item, the $100 rule on a Form 706 estate, the duplicate check's batches of 12 sharing 6, a
// walkthrough collection already on the list, and (2026-10-26, Q103) one piece of a flatware, china or glass group turned
// over for a close-up of its mark, which rides with the group to the naming.
//
// ⚠ EACH OF THOSE IS A SENTENCE A PERSON ACTS ON, so each is held here to the code that makes it true, driven where it
// can be. When the app changes one, this file goes red on purpose: update the guide's sentence, then this check, in the
// same commit. The last group holds the plain words: the guide's text uses none of the build's shorthand.

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
    fns: ['agentShotGroups', 'agentNameableRefs', '_agDetailRefs', '_agShotPayload', 'agentListedOff', '_agWrite', '_invCondIsAgents', '_invAgentCondition',
          'agentApplyResult', '_agState', 'invSplitItemN', '_invSplitSource', '_getPhotoRef', '_setPhotoRef', '_jobInvRefs',
          '_invFileId', '_photoUid', '_invPhotoSource', '_invRoomName', '_invDetailRefs',
          '_agNameKey', '_agDupEligible', 'agentDuplicateGroups', 'agentNamedTwice', '_arDupEligible', '_arWrite',
          '_importableFromEstimate', '_importedSourceSet', '_pushInvLine',
          '_collDispToInv', '_collDispNeedsAppr', '_guessCategory', '_numOrBlank',
          // P24: the walkthrough's collections join the inventory by themselves and wait for a photograph.
          'collectionLinesEnsure', '_collLinesOf', 'collectionLineId', 'collectionLineUnshot', '_invHasPhoto',
          'collectionsAwaitingPhoto', 'collectionLineWithPhoto', 'collectionUseLine', '_invJob', 'fieldDispToInv',
          '_invTombstoneLine', '_invItemNo', '_invNamed', '_avHasFigure', '_invHasValue', '_invJob', 'invFirearmSettle', 'invIsFirearm', 'invFirearmDispRefusal', 'invFiduciaryMode', 'isDecedentJob', 'invFirearmSettle', 'invIsFirearm', 'invFirearmDispRefusal', 'invFiduciaryMode', 'isDecedentJob', 'invIsFirearm', 'invFirearmDispRefusal', 'invFiduciaryMode', 'isDecedentJob'],
    vars: ['_agRun', 'AGENT_CONDITIONS', 'AGENT_MAX_DETAILS', 'AGENT_LISTED_MAX', 'INV_TAXONOMY', 'INV_CATEGORIES', 'INV_DEFAULT_CATEGORY',
           'INV_SPLIT_MAX', '_photoUidSeq', 'AGENT_ROOM_CONF_RANK', 'AGENT_PASS_GAP_MS', 'COLL_LINE_WEAK_STAMP',
           'FIELD_DISPOSITIONS', 'FIELD_DISP_DEFAULT', 'INV_FIREARM_NEVER', 'DECEDENT_SERVICES'],
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
  const live = (src) => String(src).split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');

  // ═══════════════════════════════════════════════════════════════════════════
  group('the guide is a page of its own, reached from the playbook and the manual (both copies)');
  {
    ok(guide.length > 5000, 'the guide reads as a document (' + guide.length + ' characters of text)');
    ['concierge-guide.html', 'CONCIERGE_GUIDE.md', 'manual.html', 'MANUAL.md'].forEach((f) => {
      ok(read(f).includes(GUIDE_FILE), f + ' links the guide');
    });
    const hrefs = [...guideHtml.matchAll(/href="([^"#:]+\.html)"/g)].map((m) => m[1]);
    ok(hrefs.length >= 3, 'the guide links its neighbours (' + hrefs.join(', ') + ')');
    hrefs.forEach((h) => ok(fs.existsSync(path.join(ROOT, h)), 'and ' + h + ' is in the repo'));
    // Every time the page names the protocol a beginner has to follow, it is a link to it (the sweep's one green).
    eq(count(guideHtml, 'Firearms Protocol</a>'), count(guide, 'Firearms Protocol'), 'every mention of the Firearms Protocol is a link to it');
    has(guide, 'Shooting a room', 'the pocket card is on it');
    // And from the app since 2026-10-19 (Anthony, with the Job Plan open: "where is the one to 'photographing a house'?"): one
    // line at the top of the In the house stage and under the room workspace's three steps, opening over the app.
    const link = sandbox({ fns: ['photoGuideLinkHtml', 'guideLinkHtml'], vars: ['PHOTO_GUIDE_DOC'], stubs: { esc: (s) => String(s) } });
    eq(link.PHOTO_GUIDE_DOC, GUIDE_FILE, 'the app names the guide\'s file');
    const a = link.photoGuideLinkHtml();
    has(a, 'href="' + GUIDE_FILE + '"', 'the link points at it');
    has(a, 'Read Photographing a House', 'and reads Read Photographing a House');
    has(a, 'openGuidePage(event', 'and opens over the app, like the stage guides');
    has(live(fn('renderJobPlan')), 'photoGuideLinkHtml()', 'the In the house stage carries it');
    has(live(fn('_paintRoomWorkspace')), 'photoGuideLinkHtml()', 'and so does every room\'s workspace');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('"the app only reads the first four": the close-ups that ride with an item, on both sides of the wire');
  {
    eq(count(guide, 'the app only reads the first four'), 1, 'the guide says so, beside the close-ups');
    const details = [1, 2, 3, 4, 5, 6].map((i) => DETAIL({ stableId: 'd' + i, driveFileId: 'D' + i, ts: 1100 + i }));
    const ctx = rig([ROW()].concat(details));
    eq(ctx.AGENT_MAX_DETAILS, 4, 'the app sends four');
    const payload = ctx._agShotPayload(7, { srcId: 's1', rows: ['s1'] });
    eq(payload && payload.details.length, 4, 'six close-ups taken, four in the payload');
    eq(payload && payload.details.map((d) => d.fileId), ['D1', 'D2', 'D3', 'D4'], 'the first four taken ("most important first")');

    // The backend reads no more than four whatever it is sent.
    const box = { _agImageBlock: (id) => ({ type: 'image', id }), String, Math };
    vm.createContext(box);
    vm.runInContext(gsFn('_agUserContent') + '\n' + gsFn('_agListedText') + '\nvar AGENT_LISTED_MAX = 30;', box);
    const content = box._agUserContent({ fileId: 'FID', room: 'Bedroom',
      details: details.map((d) => ({ fileId: d.driveFileId })) });
    eq(content.filter((b) => b.type === 'image').length, 5, 'the item and four close-ups reach the model');
  }

  group('"worth more than $100": the rule on an estate filing a Form 706');
  {
    has(guide, 'worth more than $100', 'the guide names the figure');
    has(guide, 'Form 706', 'and when it applies');
    const ctx = sandbox({ vars: ['INV_LOT_ARTICLE_CAP'] });
    eq(ctx.INV_LOT_ARTICLE_CAP, 100, 'the app flags a group on the same figure');
  }

  group('the kinds of thing the app lists separately are the ones the guide names, in the app’s words');
  {
    const sys = gsFn('_agSystem');
    const m = sys.match(/Give a line of its own to anything in these categories: ([^.]*)\./);
    ok(!!m, 'the naming prompt still names its own-line categories');
    const names = m ? m[1].replace(/'\s*\+\s*'/g, '').split(/,\s*/).map((s) => s.trim()).filter(Boolean) : [];
    ok(names.length >= 9, 'and there are ' + names.length + ' of them');
    const taxonomy = sandbox({ vars: ['INV_TAXONOMY'] }).INV_TAXONOMY.map((t) => fold(t.cat));
    const g = fold(guide);
    names.forEach((n) => {
      ok(taxonomy.includes(fold(n)), '"' + n + '" is an app category');
      ok(count(g, fold(n)) >= 1, '"' + n + '" is in the guide’s own-photo list');
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RESTATED 2026-10-24 (Anthony, the towels: "Take the destination"): the destination goes with every thing in the photo,
  // the Appraise flag with one.
  group('rule 3: the destination goes with the photo, the Appraise flag with one thing');
  {
    eq(count(guide, 'comes back with the same destination and no Appraise flag'), 1, 'the guide says what the other things in the photo carry');
    lacks(guide, 'comes back with no destination', '⚠ and no longer that they come back with none');
    const ctx = rig([ROW({ disposition: 'Sell', needsAppr: true }), DETAIL()]);
    ctx.agentApplyResult(7, { srcId: 's1', rows: ['s1'] }, { notices: [], objects: [
      { name: 'Mahogany dresser', category: 'Furniture', qty: 1, confidence: 'high', basis: '', crop: [] },
      { name: 'Cobalt art glass vase, likely Murano', category: 'Art & Décor', qty: 1, confidence: 'medium', basis: '', crop: [] },
      { name: 'Brass table lamp', category: 'General/Household', qty: 1, confidence: 'medium', basis: '', crop: [] },
    ] });
    const lines = ctx._jobInvRefs(7);
    eq(lines.length, 3, 'one item photo of a dressed dresser makes three items on the list');
    const first = lines.find((r) => r.stableId === 's1');
    const split = lines.filter((r) => r.derivedFrom === 's1');
    eq(first && [first.disposition, first.needsAppr], ['Sell', true], 'the photo\u2019s own item keeps the destination and the flag');
    eq(split.map((r) => [r.disposition, !!r.needsAppr]), [['Sell', false], ['Sell', false]],
       'the rest come back with the same destination and no Appraise flag');
    has(guide, 'It has the photo\u2019s destination: change it if it is going somewhere else, and move the Appraise flag to the right item.', 'and the desk step says so');
    // "Your choice stays selected until you change it. Appraise marks the next photo only."
    has(guide, 'Your choice stays selected until you change it', 'the guide says the destination stays selected');
    has(guide, 'marks the next photo only', 'and that the flag does not');
    const commit = live(fn('_fieldCamCommit'));
    has(commit, 'st.appr = false;', 'the camera clears the flag after every photo');
    lacks(commit, 'st.disp =', 'and leaves the destination as it was');
    has(live(fn('fieldCamSetDisp')), '_fieldCam.disp = key;', 'which only a tap on a destination changes');
  }

  // RESTATED (2026-10-10, the core-jobs run): a note said after a close-up goes on the item the close-up is of
  // (_fieldNoteAppend), so the desk and Agent One read it; a note already on a detail record is still not sent.
  group('step 5: a note said after a close-up goes on the item it is a close-up of');
  {
    has(guide, 'goes on the thing the close-up is of', 'the guide says so');
    lacks(guide, 'stays on the close-up', '⚠ and no longer says it is lost');
    const ctx = rig([ROW({ fieldNote: 'Venetian glass' }), DETAIL({ fieldNote: 'promised to Karen' })]);
    const payload = ctx._agShotPayload(7, { srcId: 's1', rows: ['s1'] });
    eq(payload && payload.fieldNote, 'Venetian glass', 'the app is sent the item’s own note');
    eq(JSON.stringify(payload).includes('Karen'), false, 'a note sitting on a detail record is not sent');
    eq(ctx._jobInvRefs(7).map((r) => r.fieldNote), ['Venetian glass'], 'the list carries the item’s note alone');
  }

  group('the duplicate check: each room’s photos compared together, in batches of 12 sharing 6 (P24)');
  {
    has(guide, 'compares all the photos of each room', 'the guide says what the check does');
    lacks(guide, 'shot spot', '⚠ Anthony replaced setting each photographed thing aside with the check (2026-10-06)');
    // Two items named two ways off two photos: the name rule cannot see them, the check's finding can.
    const named = (id, name) => ROW({ stableId: id, driveFileId: 'F' + id, filename: id + '.jpg', objectName: name, namedBy: 'agent' });
    const ctx = rig([named('a', 'Blue vase'), named('b', 'Cobalt art glass vase, likely Murano')]);
    eq(ctx.agentDuplicateGroups(7).length, 0, 'before the check: one vase named two ways is not flagged by name');
    const room = { roomIdx: 4, photos: [{ srcId: 'a', lines: [ctx._getPhotoRef(7, 'a')] }, { srcId: 'b', lines: [ctx._getPhotoRef(7, 'b')] }] };
    eq(ctx._arWrite(7, room, { doubles: [{ ids: ['a', 'b'], why: 'The cobalt vase: on the dresser in one, close up in the other.', confidence: 'high' }] }), 1,
       'the check’s answer is written on the two items');
    const g = ctx.agentDuplicateGroups(7);
    eq(g.length === 1 ? [g[0].rows.length, g[0].why] : g.length, [2, 'The cobalt vase: on the dresser in one, close up in the other.'],
       'after it: one group under Possible duplicates, with what the photos showed');
    has(guide, 'Possible duplicates', 'which the guide names as the place to look');
    // ⚠ 12 and 6 since the first live run (2026-10-06: eight photographs in 32 s, against UrlFetchApp's 60 s).
    has(guide, 'overlapping batches of 12', 'the guide states the batch');
    has(guide, 'within six of each other are always compared', 'and what the overlap guarantees');
    const win = GS.match(/var\s+AGENT_ROOM_WINDOW\s*=\s*(\d+)/), lap = GS.match(/var\s+AGENT_ROOM_OVERLAP\s*=\s*(\d+)/);
    eq([win ? +win[1] : NaN, lap ? +lap[1] : NaN], [12, 6], 'and the backend reads a room in runs of 12 sharing 6');
  }

  group('collections: already on the list, and the photo goes onto the collection (P24)');
  {
    has(guide, 'It is already on the inventory', 'the guide says a collection needs no adding');
    has(guide, 'tap it, then shoot it', 'and the pocket card says how it is photographed');
    has(guide, 'Use that line', 'and the review names the button that joins one photographed as an ordinary item');
    const est = { rooms: [{ idx: 4, name: 'Study', note: '' }],
                  collections: [{ id: 1700000000000, name: 'Coin collection', disp: 'appraise', qty: '200', value: '' }] };
    const ctx = rig([], { estimateStore: { 7: { estimate: est } } });
    eq(ctx.collectionLinesEnsure(7), 1, 'the walkthrough’s collection is on the list by itself');
    const id = '7_col1700000000000';
    const line = ctx._getPhotoRef(7, id);
    eq([ctx.collectionLineUnshot(line), ctx.collectionsAwaitingPhoto(7).length], [true, 1], 'waiting for its photo');
    // The camera set to it: the photo is filed under the collection's own entry (`_captureShot` with `into`).
    const shot = { roomIdx: 4, label: 'inventory', seq: 3, collId: null, filename: 'HVL_Study_INV_3.jpg', driveFileUrl: null, status: 'uploading', ts: 9 };
    const filled = ctx.collectionLineWithPhoto(line, shot, { fieldDisp: 'undecided' });
    eq([filled.stableId, filled.roomIdx, filled.needsAppr, String(filled.sourceCollId), filled.objectName],
       [id, 4, true, '1700000000000', ''], 'the entry keeps its id, link and instruction, in the room it was shot, and is named from the photo');
    has(filled.fieldNote, 'From the walkthrough: Coin collection (200)', 'with the walkthrough’s words for the app to read');
    ctx._setPhotoRef(7, filled);
    eq([ctx.collectionLineUnshot(ctx._getPhotoRef(7, id)), ctx.collectionsAwaitingPhoto(7).length], [false, 0], 'and it is photographed: nothing owed');
    eq(ctx._jobInvRefs(7).length, 1, '⚠⚠ one entry for the collection, never two');

    // Photographed as an ordinary item: Use that line hands the collection to it and the count stays one.
    const desk = rig([ROW({ stableId: 'p1', filename: 'p1.jpg', objectName: 'Morgan dollars in albums' })], { estimateStore: { 7: { estimate: est } } });
    desk.collectionLinesEnsure(7);
    eq(desk._jobInvRefs(7).length, 2, 'fixture: the collection’s entry and the item photographed of it');
    eq(desk.collectionUseLine(7, id, 'p1'), true, 'Use that line hands the collection to the photographed item');
    eq(desk._jobInvRefs(7).map((r) => [r.stableId, String(r.sourceCollId), r.needsAppr]), [['p1', '1700000000000', true]],
       'one entry, the photographed one, carrying the collection and its instruction');
  }

  group('rule 2: a close-up never adds a new item to the list');
  {
    has(guide, 'never adds a new item to the list', 'the guide says so');
    const ctx = rig([ROW(), DETAIL()]);
    eq(ctx._jobInvRefs(7).map((r) => r.stableId), ['s1'], 'the close-up is not an item on the list');
    eq(ctx.agentShotGroups(7).length, 1, 'and is not sent to be named on its own');
  }

  // 2026-10-26 (Q103, as Anthony revised it: "we will look over everything, but don't need tic boxes"): sterling that looks like
  // stainless is caught in the house, never by a tick on the desk. The guide tells the crew to turn one piece of a flatware,
  // china or glass group over and take a close-up of the mark; the camera files that close-up with the group's one item and it
  // rides with that item to the naming, which is told to read a mark (STERLING, 18/10, a backstamp). No rule for tableware.
  group('Q103: turn one piece of a flatware, china or glass group over and take a close-up of the mark, and the naming reads it');
  {
    has(guide, 'Flatware, china and glass Turn one piece over, even in a group, and take a close-up of the mark underneath ("Sterling", "18/10", a maker’s stamp): sterling and stainless look alike from above.',
      'the guide says so, in the close-ups table');
    eq(count(guide, 'Turn one piece over'), 1, 'once');
    lacks(guide, 'China and glass The mark on the bottom', 'the row it replaced is gone');
    // The camera's Close-up is filed with the item just photographed: the group's one item.
    const commit = live(fn('_fieldCamCommit'));
    has(commit, "var label = st.mode === 'inventory' ? ((st.detail && st.last) ? 'detail' : 'inventory') : st.mode;", 'the Close-up shutter files a close-up…');
    has(commit, "groupId: label === 'detail' ? st.last : null", '…against the last item photographed');
    // …and rides with that item to the naming: the group photo and the mark under one piece, in one request.
    const ctx = rig([ROW({ fieldNote: 'set of 12' }), DETAIL({ stableId: 'm1', driveFileId: 'MARK' })]);
    const payload = ctx._agShotPayload(7, { srcId: 's1', rows: ['s1'] });
    eq(payload && payload.details.map((d) => d.fileId), ['MARK'], 'the close-up of the mark is in the group’s request');
    const box = { _agImageBlock: (id) => ({ type: 'image', id }), String, Math };
    vm.createContext(box);
    vm.runInContext(gsFn('_agUserContent') + '\n' + gsFn('_agListedText') + '\nvar AGENT_LISTED_MAX = 30;', box);
    const content = box._agUserContent({ fileId: 'FID', room: 'Kitchen', details: payload ? payload.details : [] });
    eq(content.filter((b) => b.type === 'image').map((b) => b.id), ['FID', 'MARK'], '⚠ and reaches the model beside the group photo');
    const asked = content.filter((b) => b.type === 'text').map((b) => b.text).join(' ');
    // Restated on the merge of main's once-over (backend 2026-10-26): the request now names what a close-up is as the crew takes it
    // (a mark, signature, hallmark or label, its back, a corner, a title page or damage) and still asks for it to be read and used
    // to name the object, which is what Q103 relies on.
    has(asked, 'is a close-up of the thing photographed: a mark, signature, hallmark or label, its back, a corner, a title page or damage. Read any words or marks on it and use it to name the object', '⚠ with the instruction to read the mark and name the group by it');
    has(gsFn('_agSystem'), 's mark, signature or hallmark is readable on them. ', 'everyday dishes stay household goods unless a mark is readable: the mark is what changes the name');
    // The desk asks no tick of tableware for it (Q103): the review's rule names no silver, stainless, china or glass. Since the
    // reviewers' round (2026-10-26) the rule is invLineHold, which says why a line is held; invLineAccepted asks it.
    has(live(fn('invLineAccepted')), 'return !invLineHold(ref, fc);', 'fixture: the rule is invLineHold');
    // Since the second reviews (2026-10-26) invLineHold is the first of _invLineHolds' reasons, where the rule is written.
    const rule = live(fn('invLineAccepted')) + live(fn('invLineHold')) + live(fn('_invLineHolds'));
    ok(rule.length > 400, 'fixture: the review rule read (' + rule.length + ' chars)');
    ok(!/stainless|sterling|flatware|china|glass|silver/i.test(rule), '⚠ no tableware rule in the review');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('plain words: the guide uses none of the build’s shorthand (Anthony, 2026-10-06: "write this in human speak")');
  {
    // The visible text, with the one button label that carries the word "line" taken out.
    // Two button labels carry the word: *Use that line* (P24) and *Remove lines* (2026-10-19).
    const words = guide.replace(/Use that line/g, ' ').replace(/Remove lines/g, ' ');
    [['the desk', /\bthe desk\b/i], ['an "Items shot"', /\bItems shots?\b/i], ['Agent One or Two', /\bAgent (?:One|Two)\b/i],
     ['"line" for an item on the list', /\bline\b/i], ['"lot" for a group', /\blots?\b/i], ['"chip" for a destination', /\bchips?\b(?! and cracks)/i],
     ['"frame" for a photo', /\bframes?\b/i], ['"unflagged"', /\bunflagged\b/i], ['"the agent"', /\bthe agents?\b/i]]
      .forEach(([what, re]) => {
        const m = words.match(re);
        ok(!m, 'no ' + what + (m ? ' (found: "…' + words.slice(Math.max(0, m.index - 30), m.index + 30) + '…")' : ''));
      });
    // 2,000 until 2026-10-19; Anthony, after the first practice job: *"this photography guide needs to be way more detailed"*,
    // so *What goes on the list*, the drawers rule and the cloth took it to about 2,550. Still none of the build's words.
    ok(guide.split(/\s+/).length < 2700, 'and it is short: ' + guide.split(/\s+/).length + ' words, from 2,770 before the rewrite');
  }

  // P25 (Q40, Q41; Anthony, 2026-10-09): the camera's controls the guide names are the camera's.
  group('the camera as the guide names it: one press of Close-up, Next: Items, and the as-found tick on an estate only');
  {
    const paint = fn('_fieldCamPaint');
    has(guide, 'press Close-up', 'the guide says to press Close-up');
    eq(count(guide, 'Detail of last'), 0, '⚠ and never the two-tap toggle it replaced');
    has(paint, '>Close-up</button>', 'the camera has a Close-up button');
    has(paint, 'onclick="fieldCamShootDetail()"', 'which takes a close-up of the last thing in one press');
    has(guide, 'in the camera, goes straight on to the item photos of the same room', 'the guide names Next: Items');
    has(paint, 'Next: Items', 'and the camera offers it');
    has(guide, 'On an estate, then tick As-found pass complete', 'the tick is an estate\'s');
    has(fn('_roomFoundDoneHtml'), "if (!decedent) return '';", 'and the app offers it on an estate only');
  }
  // ═══════════════════════════════════════════════════════════════════════════
  // 2026-10-19 (Anthony, the first practice job in his own apartment: the Items pass photographed the inside of every
  // drawer and the inventory came back as *"hundreds and hundreds of items, like golf balls and scotch tape dispensers"*;
  // a photograph of socks in an open drawer came back as the socks AND "Wood dresser with white-lined drawer"). The
  // guide gained *What goes on the list*, the drawers rule, the cloth and the desk's Remove lines; each sentence that
  // promises something of the app is held here, to the prompt the backend sends and to the bulk bar.
  group('what goes on the list (2026-10-19): drawers are searched, never photographed; one kind per group; the surface is background');
  {
    has(guide, 'What goes on the list', 'the section');
    has(guide, 'No item photo at all', 'with the third column: what gets no item photo');
    has(guide, 'Never the inside of a drawer, cabinet or closet', 'the camera table says it of Items');
    has(guide, 'never photograph the inside of one', 'and the drawers paragraph says it again');
    has(guide, 'One kind per photo. Two kinds in one photo come back as two items.', 'a group is one kind');
    has(guide, 'The surface does not count', 'and what a thing sits on is background');
    has(guide, 'one item named for the drawer', 'a mixed drawer kept together is one item named for the drawer');
    // Each of those is a promise about Agent One's naming, held to the prompt the backend sends (one source line each).
    const sys = gsFn('_agSystem');
    has(sys, 'qty 30, not thirty entries', 'the prompt groups ordinary goods of one kind (the group photo)');
    has(sys, 'What it sits on or in is background, not an object', 'the surface is background');
    has(sys, 'unless that piece of furniture is itself the only thing in the frame', 'and furniture photographed alone is still a line');
    // 2026-10-26: a full bookcase or china cabinet the crew cannot empty is photographed once, whole, as it stands, so there is no
    // other photograph of the piece; the prompt's one exception to the surface rule lists it and its contents. The guide says so
    // beside the instruction and names it among the surface section's exceptions.
    has(guide, 'photograph it once, whole, as it stands. The app lists the piece and its contents as two items.', 'a full bookcase or china cabinet: the piece and its contents, two items');
    has(guide, 'The exceptions are furniture alone in a photo, which is how furniture is photographed (cleared, drawers closed, last), and a full bookcase or china cabinet.', '…and the surface section names it among the exceptions');
    lacks(guide, 'The one exception is', '⚠ and no longer says there is only one');
    has(sys, 'a freestanding bookcase, china cabinet or display cabinet photographed full', 'the prompt lists the piece photographed full');
    has(sys, 'is both: one line for the piece of furniture, and its contents under the rules here', '…and its contents');
    // And what a person says at the camera: the maker and the size go into the name (the prompt's notes rule, 2026-10-25b and -26).
    has(guide, 'The maker and size go into the name.', 'the guide says a maker and a size said at the camera go into the name');
    has(sys, 'note names the maker or brand ("Crate & Barrel coffee table"), put it in the name', 'the prompt puts the maker in the name');
    has(sys, 'and the size, which goes into the name as they said it', '…and the size');
    ok(((/var BACKEND_VERSION = '([^']+)'/.exec(GS) || [])[1] || '') >= '2026-10-26', 'the cabinet and the size are a redeploy, and the backend says so');
    has(sys, 'mixed small everyday things is ONE line for the whole of it', 'a mixed drawer is one line named for the drawer');
    has(sys, 'Opened or used-up consumables (food, toiletries and cosmetics, cleaning supplies, medicines), worn', 'the used-up is not inventory');
    has(sys, 'inventoriable: leave them out. A frame holding nothing else is an empty list.', 'and a frame of nothing else is an empty list');
    lacks(live(sys), '$100', '⚠ the agent is still never told the $100-an-article threshold (AGENT_ONE_SPEC §2a)');
    // 2026-10-19 or later: the inventory reset build of the same evening took 2026-10-19b, and the version only moves forward.
    ok(((/var BACKEND_VERSION = '([^']+)'/.exec(GS) || [])[1] || '') >= '2026-10-19', 'the prompt change is a redeploy, and the backend says so (' + ((/var BACKEND_VERSION = '([^']+)'/.exec(GS) || [])[1]) + ')');
  }

  group('Remove lines on the bulk bar (2026-10-19): the selection off the inventory, photographs kept, one save, Removed items giving them back');
  {
    has(guide, 'Remove lines', 'the guide names the button for a room photographed drawer by drawer');
    has(guide, 'Work each row, not each', 'and says the row is the work and the full record the exception');
    const bar = fn('_renderInvBulk');
    has(bar, "invBulkRemove(' + jid + ')", 'the bulk bar offers it');
    has(bar, '>Remove lines</button>', 'under that name');
    const body = live(fn('invBulkRemove'));
    lacks(body, 'discardShot', 'it never routes through the shot binner');
    lacks(body, 'driveTrashed', 'and never marks a photograph trashed');
    has(body, '_invTombstoneLine(', 'it removes through the desk\'s one removal writer');
    let saves = 0; const asked = [];
    const mk = (id, o) => Object.assign({ stableId: id, label: 'inventory', roomIdx: 4, seq: 1, status: 'uploaded', ts: 1000, itemNo: +id.slice(1),
      objectName: 'Line ' + id, filename: id + '.jpg', driveFileId: 'F' + id, category: 'General/Household', disposition: '' }, o || {});
    const found = { stableId: 'af1', label: 'before', roomIdx: 4, seq: 1, status: 'uploaded', ts: 900, filename: 'af.jpg', driveFileId: 'FAF' };
    const refs = [mk('l1'), mk('l2', { derivedFrom: 'l1', driveFileId: 'Fl1' }), mk('l3'), found];
    const ctx = sandbox({
      fns: ['invBulkRemove', '_invPicked', '_invTombstoneLine', '_jobInvRefs', '_getPhotoRef', '_setPhotoRef', '_invItemNo', '_invJob'],
      vars: ['_invPick', '_invBulkLast'],
      stubs: { jobs: [{ id: 7, hvlId: 'HVL-0007', svc: 'cleanout' }], _photoRefs: { 7: refs },
        savePhotoRefs() { saves++; }, _invTouch(r) { r.updatedAt = 1; return r; }, _scheduleInventorySync() {}, renderInventoryTab() {},
        showSyncBadge() {}, alert() {}, _invStampBy: () => 'Ashley Jerome',
        window: { confirm: (m) => { asked.push(m); return asked.length !== 1; } } },
    });
    ctx._invPick = { l1: 1, l2: 1, af1: 1 };   // the as-found shot "ticked" too: _invPicked reads the live inventory lines alone
    eq(ctx.invBulkRemove(7), false, 'the question refused: nothing removed');
    eq(ctx._jobInvRefs(7).length, 3, 'three lines still live');
    eq(saves, 0, 'and nothing saved');
    eq(ctx.invBulkRemove(7), 2, 'the question accepted: two lines removed');
    has(asked[1], 'Remove 2 lines from the inventory?', 'the question counts the lines');
    has(asked[1], '#1 Line l1', 'and names them');
    lacks(asked[1], 'af1', 'the as-found shot ticked with them is not among the lines: only live inventory lines can be picked');
    has(asked[1], 'No photograph is deleted', 'and says the photographs stay');
    eq(ctx._jobInvRefs(7).map((r) => r.stableId), ['l3'], 'the third line stays live');
    const gone = refs.filter((r) => r.deletedAt);
    eq(gone.map((r) => [r.stableId, r.deletedBy, r.driveFileId]), [['l1', 'Ashley Jerome', 'Fl1'], ['l2', 'Ashley Jerome', 'Fl1']],
       'each removed line is a stamped tombstone that keeps its photograph');
    eq(found.deletedAt, undefined, 'the as-found shot is untouched');
    eq(saves, 1, '⚠ the manifest is saved once, not once per line');
    eq(Object.keys(ctx._invPick).length, 0, 'and the selection is cleared');
  }

  // 2026-10-26b (Anthony: "Agents grade it"): an Items photo is how the thing's condition is graded.
  group('the Items photo is graded for condition, as the guide says');
  {
    has(guide, 'Everything the app can see in it goes on the list, graded for condition.', 'the guide says so');
    has(fn('_agContext'), 'conditions: AGENT_CONDITIONS', 'Agent One is sent the grades');
    has(fn('_agWrite'), '_invAgentCondition(ref, obj.condition)', 'and its grade lands on the item it names');
  }
};
