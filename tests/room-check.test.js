'use strict';
// P24 (2026-10-06): the room check, and the walkthrough's collections on the inventory from the start.
//
// ⚠⚠ WHY THIS EXISTS. Anthony, offered a field rule that set every photographed thing aside so no later frame caught it:
// *"Fix option 2 above with room level check. That's an obvious fix and will help with our fake client we are doing
// tomorrow with full inventory."* And then: *"definitely fix the collection double count. collections should
// automatically be in inventory and obviously need photo documentation."*
//   • Agent One reads every Items shot alone, so one thing in two frames came back as two lines, and Possible duplicates
//     caught it only when both lines had the same name. The room check reads a room's photographs together (backend
//     `agentCheckRooms`, action `agentRoomCheck`), and the app writes its answer on the lines (`_arWrite`) and shows it
//     under Possible duplicates. It flags; it never merges.
//   • A walkthrough collection reached the inventory only through an Add button, while the same collection shot in the
//     house was already a line: counted twice. Now each collection is one line by itself (`collectionLinesEnsure`), the
//     room camera fills that line (`_captureShot` with `into`), and the desk can hand it to a line already shot
//     (`collectionUseLine`).
// Every check below drives the real code: the backend over stubbed Apps Script globals, the app in a sandbox.

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { sandbox, source, fn, matchBrace, domStub } = require('./harness');

const liveLines = (s) => String(s).split('\n')
  .filter((l) => { const t = l.trim(); return !(t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')); })
  .join('\n');

// ─── THE BACKEND ─────────────────────────────────────────────────────────────────────────────
const GS = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'main-sync.gs'), 'utf8');
function gsFn(name) {
  const re = new RegExp('(^|\\n)function\\s+' + name + '\\s*\\(', 'g');
  const m = re.exec(GS);
  if (!m) throw new Error('not in .gs: ' + name);
  const start = m.index + (m[1] ? m[1].length : 0);
  const open = GS.indexOf('{', re.lastIndex);
  return GS.slice(start, matchBrace(GS, open) + 1);
}
function gsVar(name) {
  const m = GS.match(new RegExp('(^|\\n)(var\\s+' + name + '\\s*=[\\s\\S]*?;)'));
  if (!m) throw new Error('var not in .gs: ' + name);
  return m[2];
}
const AR_VARS = ['AGENT_API', 'AGENT_API_VERSION', 'AGENT_ROOM_MODEL', 'AGENT_ROOM_EFFORT', 'AGENT_ROOM_MAX_TOKENS',
  'AGENT_ROOM_WINDOW', 'AGENT_ROOM_OVERLAP', 'AGENT_ROOM_MAX_SHOTS', 'AGENT_ROOM_MAX_ROOMS', 'AGENT_ROOM_PARALLEL',
  'AGENT_ROOM_TIME_BUDGET', 'AGENT_ROOM_CONF_RANK', 'AGENT_ROOM_WHY_MAX', 'AGENT_MAX_IMG'];
const AR_FNS = ['_agProp', '_agMissingProps', '_agImageBlock', '_arWindows', '_arTool', '_arSystem', '_arWindowContent',
  '_arRequestFor', '_arReadResult', '_arWhy', '_arDoubles', '_arMergeDoubles', 'agentCheckRooms'];

// `reply(body, i, sent)` answers each request; `files` the images by Drive id; `throwFetch` makes fetchAll throw.
function gs(opts) {
  opts = opts || {};
  const sent = [];
  let t = 1000;
  const files = opts.files || {};
  const ctx = {
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => ((opts.props || { ANTHROPIC_API_KEY: 'sk-ant-test' })[k] || null) }) },
    Logger: { log() {} },
    DriveApp: { getFileById: (id) => ({ getBlob: () => {
      const f = files[id] || (opts.anyFile ? { type: 'image/jpeg', bytes: [1, 2, 3] } : null);
      if (!f) throw new Error('File not found: ' + id);
      return { getContentType: () => f.type, getBytes: () => f.bytes };
    } }) },
    Utilities: { base64Encode: (b) => 'B64(' + b.length + ')' },
    UrlFetchApp: {
      fetchAll: (reqs) => {
        if (opts.throwFetch) throw new Error('Timeout: https://api.anthropic.com/v1/messages');
        sent.push(reqs);
        t += (opts.tick || 1000);
        return reqs.map((r, i) => {
          const res = opts.reply ? opts.reply(JSON.parse(r.payload), i, sent) : { code: 200, body: OK([]) };
          return { getResponseCode: () => res.code, getContentText: () => JSON.stringify(res.body) };
        });
      },
    },
    Date: function () { return { getTime: () => t }; },
    JSON, Math, Number, String, Object, Array, Error,
  };
  vm.createContext(ctx);
  vm.runInContext(AR_VARS.map(gsVar).concat(AR_FNS.map(gsFn)).join('\n'), ctx);
  ctx.sent = sent;
  return ctx;
}
const OK = (doubles) => ({ stop_reason: 'tool_use', content: [
  { type: 'thinking', thinking: '' },
  { type: 'tool_use', name: 'record_doubles', input: { doubles: doubles } }] });
const SHOT = (fid, lines) => ({ fileId: fid, lines: lines });
const L = (id, name, cat) => ({ id: id, name: name, category: cat || 'Art & Décor', qty: 1 });

// ─── THE APP ─────────────────────────────────────────────────────────────────────────────────
const ROW = (over) => Object.assign({
  stableId: 's1', roomIdx: 4, label: 'inventory', seq: 1, status: 'uploaded', ts: 1000,
  filename: 'HVL-0007_Bedroom_INV_1.jpg', driveFileUrl: 'https://drive.google.com/file/d/FID/view',
  driveFileId: 'FID', objectName: 'Mahogany dresser', category: 'Furniture', disposition: '',
}, over || {});

const APP_FNS = ['agentRoomsToCheck', '_arCheckable', '_arRoomPayload', 'agentRoomCheckRun', '_arSendNext', '_arWrite',
  '_arFinish', '_arRepaint', '_arStateHtml', '_arState', '_arCheckButtonHtml', '_arDupEligible',
  'agentDuplicateGroups', '_agDupEligible', '_agNameKey', '_agDupHtml', '_agDupHandle', '_agDupUnhandle', 'agentNotDuplicate',
  '_jobInvRefs', '_getPhotoRef', '_setPhotoRef', '_invFileId', '_invRoomName', '_invItemNo', '_invJob',
  // the collections
  'collectionLinesEnsure', '_collLinesOf', 'collectionLineId', 'collectionOf', 'collectionLineUnshot', '_invHasPhoto',
  'collectionLinesUnshot', 'collectionsAwaitingPhoto', 'collectionLineWithPhoto', 'collectionPieceOf', 'collectionUseLine',
  '_collPanelHtml', '_collLineStatusHtml', '_roomCollectionsHtml', '_pushInvLine', '_collDispToInv', '_collDispNeedsAppr',
  '_guessCategory', '_numOrBlank', '_invNamed', '_invTombstoneLine', '_avHasFigure', '_invHasValue', 'fieldDispToInv',
  '_importableFromEstimate', '_importedSourceSet', '_apprEstimateFlags', '_renderInventoryImportPanel', '_vehicleLineName',
  '_renderCollPhotoCapture'];
const APP_VARS = ['_arRun', 'AGENT_ROOM_BATCH_SHOTS', 'AGENT_ROOM_CONF_RANK', 'AGENT_ROOM_CONF_WORDS', 'COLL_LINE_WEAK_STAMP',
  'INV_DEFAULT_CATEGORY', 'FIELD_DISPOSITIONS', 'FIELD_DISP_DEFAULT', 'INV_TAXONOMY', 'INV_CATEGORIES', 'COLL_DOC_KINDS'];

const EST = (colls, vehicles) => ({ estimate: { rooms: [{ idx: 4, name: 'Bedroom', note: '' }, { idx: 5, name: 'Study', note: '' }],
  collections: colls || [], vehicles: vehicles || [] } });

function app(refs, over) {
  over = over || {};
  const log = { saved: 0, synced: 0, renders: 0, alerts: [], confirms: [], posts: [] };
  const answers = (over.answers || []).slice();
  const ctx = sandbox({
    fns: APP_FNS.concat(over.fns || []),
    vars: APP_VARS.concat(over.vars || []),
    stubs: Object.assign({
      jobs: [Object.assign({ id: 7, hvlId: 'HVL-0007', svc: 'cleanout', name: 'Adler Estate' }, over.job || {})],
      _photoRefs: { 7: refs || [] },
      estimateStore: { 7: over.est || EST() },
      SHEETS_SYNC_URL: over.url === undefined ? 'https://script.google.com/macros/s/X/exec' : over.url,
      _invCloudSeen: over.seen === undefined ? { 7: true } : over.seen,
      isJobWon: () => over.won !== false,
      invFiduciaryMode: () => true,
      savePhotoRefs: () => { log.saved++; },
      _scheduleInventorySync: () => { log.synced++; },
      renderInventoryTab: () => { log.renders++; },
      _invTouch: (r) => { r.updatedAt = 99; return r; },
      _invStampBy: () => 'Ashley Jerome',
      esc: (x) => String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'),
      _invThumbHTML: (j, r) => '<i data-thumb="' + r.stableId + '"></i>',
      alert: (m) => log.alerts.push(m),
      confirm: (m) => { log.confirms.push(m); return over.confirm !== false; },
      window: { confirm: (m) => { log.confirms.push(m); return over.confirm !== false; } },
      document: domStub({}),
      fmtColVal: (v) => String(v),
      _readAppsScriptJson: (r) => r, showSyncBadge() {},
      _renderCollDocs: () => '',   // the card's document list, not the rule under test
      fetch: (url, init) => {
        log.posts.push(JSON.parse(init.body));
        const a = answers.length ? answers.shift() : { ok: true, results: {}, failed: {}, remaining: [] };
        if (a instanceof Error) return { then: () => ({ then: () => ({ catch: (g) => g(a) }) }) };
        return { then: (f) => { const d = f(a); return { then: (g) => { g(d); return { catch() {} }; } }; } };
      },
    }, over.stubs || {}),
  });
  return { ctx, log };
}

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();

  // ═══ THE BACKEND ═════════════════════════════════════════════════════════════════════════
  group('backend · the runs a room is read in: twelve at a time, sharing six, so neighbours always meet');
  {
    const c = gs();
    // ⚠ MEASURED (Anthony's first live run, 2026-10-06): eight photographs took 32 s and UrlFetchApp cuts a request off at
    // about 60 s, so a run carries twelve, not twenty-four.
    eq([c.AGENT_ROOM_WINDOW, c.AGENT_ROOM_OVERLAP, c.AGENT_ROOM_PARALLEL], [12, 6, 6], 'runs of 12 sharing 6, six at a time');
    eq(c._arWindows(0), [], 'nothing to read');
    eq(c._arWindows(1), [[0, 1]], 'one photograph is one run');
    eq(c._arWindows(12), [[0, 12]], 'a room of 12 is one run');
    eq(c._arWindows(13), [[0, 12], [6, 13]], 'a room of 13 is two runs sharing 6');
    eq(c._arWindows(30), [[0, 12], [6, 18], [12, 24], [18, 30]], 'and 30 is four');
    // For every size up to the cap: two shots within six always share a run, two twelve or more apart never do, and the
    // last run reaches the end.
    let gap = '', apart = '';
    for (let n = 2; n <= 160 && !gap && !apart; n++) {
      const w = c._arWindows(n);
      for (let i = 0; i < n && !gap; i++) {
        for (let j = i + 1; j < n && j - i <= 6; j++) if (!w.some((x) => x[0] <= i && j < x[1])) { gap = n + ': ' + i + '/' + j; break; }
        for (let j = i + 12; j < n; j++) if (w.some((x) => x[0] <= i && j < x[1])) { apart = n + ': ' + i + '/' + j; break; }
      }
      if (w[w.length - 1][1] !== n) gap = n + ': the last run stops short';
    }
    eq(gap, '', 'two photographs within six of each other always share a run, and the last run reaches the end');
    eq(apart, '', 'two twelve or more apart never do (what the guide says)');
  }

  group('backend · the request: one room\'s photographs, each introduced by its lines, labels minted here');
  {
    const c = gs({ anyFile: true, reply: () => ({ code: 200, body: OK([]) }) });
    const out = c.agentCheckRooms({ context: { fiduciary: true }, rooms: [{ key: '4', room: 'Bedroom', shots: [
      SHOT('F1', [L('a', 'Mahogany dresser', 'Furniture'), L('b', 'Blue vase')]),
      SHOT('F2', [L('c', 'Cobalt art glass vase, likely Murano')]) ] }] });
    eq(out.ok, true, 'it answers');
    const body = JSON.parse(c.sent[0][0].payload);
    eq([body.model, body.thinking.type, body.output_config.effort, body.max_tokens], ['claude-opus-5-5', 'adaptive', 'low', 16000],
       'Opus 5.5, adaptive thinking at low effort, the non-streaming ceiling');
    eq([body.tools.length, body.tools[0].name, body.tools[0].strict, body.tool_choice.type], [1, 'record_doubles', true, 'auto'],
       'one strict tool, chosen by instruction rather than forced');
    eq(body.tools[0].input_schema.properties.doubles.items.properties.lines.items, { type: 'string' },
       '⚠ the line labels are plain strings, never an enum (checked on the server)');
    ok(body.system[0].cache_control && body.system[0].cache_control.type === 'ephemeral', 'the system prompt is cached');
    has(body.system[0].text, 'Look at the pictures, not the names', 'it is told to compare pictures');
    has(body.system[0].text, 'Two lines from the same photograph are never one object', 'and the one-photograph rule');
    has(body.system[0].text, 'overstates the estate', 'an estate is told what a double costs');
    lacks(body.system[0].text, '$', 'and it is never told a value or a threshold');
    // The first live run wrote 300 characters naming its own labels ("P8 shows it all, P6 is a close shot…"), which mean
    // nothing at the desk: the sentence is asked short and plain.
    has(body.system[0].text, 'one short sentence (under 25 words)', 'the sentence is asked short');
    has(body.system[0].text, 'with no P or L label in it', 'and without the labels the desk never sees');
    has(body.tools[0].input_schema.properties.doubles.items.properties.why.description, 'never a label (no P1, no L2)',
        'and the tool says so too');
    const user = body.messages[0].content;
    eq(user.filter((b) => b.type === 'image').length, 2, 'both photographs ride the request');
    has(user[1].text, 'P1 · lines named from it: L1 "Mahogany dresser" (Furniture); L2 "Blue vase" (Art & Décor)', 'each photograph is introduced by its lines');
    has(user[3].text, 'P2 · lines named from it: L3 "Cobalt art glass vase, likely Murano"', 'and the labels run on across photographs');
    lacks(JSON.stringify(user), '"a"', '⚠ the app\'s ids never reach the model');
  }

  group('backend · the answer back through the labels: unknown, one-photograph and repeated lines dropped');
  {
    const c = gs();
    const labels = { L1: { id: 'a', photo: 'P1' }, L2: { id: 'b', photo: 'P1' }, L3: { id: 'c', photo: 'P2' } };
    eq(c._arDoubles([{ lines: ['L2', 'l3'], why: 'the vase twice', confidence: 'high' }], labels),
       [{ ids: ['b', 'c'], why: 'the vase twice', confidence: 'high' }], 'a double across two photographs, a lower-case label read');
    eq(c._arDoubles([{ lines: ['L1', 'L2'], why: 'x', confidence: 'high' }], labels), [], '⚠ two lines off one photograph are never one object');
    eq(c._arDoubles([{ lines: ['L9', 'L3'], why: 'x', confidence: 'high' }], labels), [], 'a label the request did not carry is dropped');
    eq(c._arDoubles([{ lines: ['__proto__', 'constructor', 'L3'], why: 'x', confidence: 'high' }], labels), [], 'and so are names off the prototype');
    eq(c._arDoubles([{ lines: ['L2', 'L2', 'L3'], why: 'x', confidence: 'certain' }], labels)[0].confidence, 'low', 'an unknown confidence reads low');
    eq(c._arMergeDoubles([{ ids: ['c', 'b'], why: 'low one', confidence: 'low' }, { ids: ['b', 'c'], why: 'high one', confidence: 'high' }]),
       [{ ids: ['b', 'c'], why: 'high one', confidence: 'high' }], 'overlapping runs that find one double keep it once, at the higher confidence');
    // The first live run's own sentence, which the old 300-character slice cut mid-clause ("…so the overlap is").
    const long = 'The same oak sideboard, Banksy-style canvas and items on top: P8 shows it all, P6 is a close shot of the right '
      + 'half (orchid, dog photos in acrylic frames, paw-print dish), and P7 is a close shot of the left half (navy bar '
      + 'tray, Decoy wine, basket ice bucket, boat photo, wood bowl), so the overlap is the whole sideboard.';
    const cut = c._arDoubles([{ lines: ['L2', 'L3'], why: long, confidence: 'high' }], labels)[0].why;
    ok(cut.length <= c.AGENT_ROOM_WHY_MAX, 'a sentence that runs on is cut to the desk\'s length (' + cut.length + ')');
    const kept = cut.slice(0, -1);
    eq([cut.slice(-1), long.startsWith(kept), /^[\s,;:.)]/.test(long.slice(kept.length))], ['\u2026', true, true],
       'cut at a word, never inside one, with an ellipsis: ' + JSON.stringify(cut.slice(-30)));
    eq(c._arWhy('  The cobalt vase:\n on the sideboard   in one, close up in the other. '), 'The cobalt vase: on the sideboard in one, close up in the other.',
       'a short sentence stands as written, on one line');
  }

  group('backend · a room answers whole: every run back, or failed by name, or remaining');
  {
    const shots = (n) => Array.from({ length: n }, (_, i) => SHOT('F' + i, [L('l' + i, 'thing ' + i, 'Furniture')]));
    // 30 photographs: two runs. The double straddles the overlap; both runs see it.
    const c = gs({ anyFile: true, reply: (body) => {
      const txt = body.messages[0].content.filter((x) => x.type === 'text').map((x) => x.text).join('\n');
      const has20 = txt.includes('"thing 20"'), has18 = txt.includes('"thing 18"');
      if (!(has20 && has18)) return { code: 200, body: OK([]) };
      const lab = (name) => { const m = txt.match(new RegExp('(L\\d+) "' + name + '"')); return m ? m[1] : 'L0'; };
      return { code: 200, body: OK([{ lines: [lab('thing 18'), lab('thing 20')], why: 'the same lamp', confidence: 'medium' }]) };
    } });
    const out = c.agentCheckRooms({ context: {}, rooms: [{ key: '4', room: 'Bedroom', shots: shots(30) }, { key: '5', room: 'Study', shots: shots(1) }] });
    eq(c.sent[0].length, 4, 'four runs for the room of thirty, sent together; none for the room of one');
    eq(out.results['4'].doubles, [{ ids: ['l18', 'l20'], why: 'the same lamp', confidence: 'medium' }], 'found in both runs, reported once');
    eq(out.results['5'], { doubles: [], photos: 1 }, 'a room of one photograph is answered without a call');
    eq(out.model, 'claude-opus-5-5', 'and the answer names the model');

    const miss = gs({ props: {} }).agentCheckRooms({ rooms: [{ key: '4', shots: shots(2) }] });
    eq([miss.ok, /ANTHROPIC_API_KEY/.test(miss.error)], [false, true], 'no key is refused, naming the Script Property');
    const img = gs({ files: { F0: { type: 'image/jpeg', bytes: [1] } } }).agentCheckRooms({ rooms: [{ key: '4', shots: shots(2) }] });
    has(img.failed['4'], 'File not found: F1', 'a photograph not in Drive fails its room by name');
    const slow = gs({ anyFile: true, throwFetch: true }).agentCheckRooms({ rooms: [{ key: '4', shots: shots(3) }] });
    has(slow.failed['4'], 'took too long', 'UrlFetchApp\'s own limit fails the room as took too long');
    const late = gs({ anyFile: true, tick: 250000 }).agentCheckRooms({ rooms: [{ key: '4', shots: shots(100) }] });
    eq([Object.keys(late.results).length, late.remaining], [0, ['4']], 'a room the clock did not finish comes back as remaining');
    const many = gs({ anyFile: true }).agentCheckRooms({ rooms: Array.from({ length: 14 }, (_, i) => ({ key: 'r' + i, shots: shots(2) })) });
    eq([Object.keys(many.results).length, many.remaining], [12, ['r12', 'r13']], 'past twelve rooms a call, the rest are remaining');
    const prose = gs({ anyFile: true, reply: () => ({ code: 200, body: { stop_reason: 'end_turn', content: [{ type: 'text', text: 'Looks fine.' }] } }) })
      .agentCheckRooms({ rooms: [{ key: '4', shots: shots(2) }] });
    has(prose.failed['4'], 'prose', '⚠ prose is a failure to record, never a room with nothing counted twice');
    const refused = gs({ anyFile: true, reply: () => ({ code: 200, body: { stop_reason: 'refusal', content: [] } }) })
      .agentCheckRooms({ rooms: [{ key: '4', shots: shots(2) }] });
    has(refused.failed['4'], 'declined', 'a refusal is a failure by name');
  }

  group('backend · the deployment says it has the action, and dispatches it');
  {
    has(gsVar('BACKEND_ACTIONS'), "'agentRoomCheck'", 'BACKEND_ACTIONS lists it');
    has(GS, "if (data.action === 'agentRoomCheck') { return jsonOut(agentCheckRooms(data)); }", 'doPost dispatches it');
    eq(/var BACKEND_VERSION = '([^']+)'/.exec(GS)[1], '2026-10-06d', 'the version moved');
    const c = gs();
    const a = app([]).ctx;
    eq(JSON.stringify(a.AGENT_ROOM_CONF_RANK), JSON.stringify(c.AGENT_ROOM_CONF_RANK), 'the app ranks confidence as the server does');
    has(src, "'agentRoomCheck'", 'and the app names the action it needs');
  }

  group('backend · testAgentRoomCheck times one full run of the fullest room: Items photographs only, in the order taken');
  {
    const iter = (arr) => { let i = 0; return { hasNext: () => i < arr.length, next: () => arr[i++] }; };
    const file = (name) => ({ getName: () => name, getId: () => 'id:' + name });
    let fid = 0;
    const folder = (files, subs) => { const id = 'F' + (++fid); return { getId: () => id, getFilesByType: () => iter(files), getFolders: () => iter(subs || []) }; };
    // Fifteen Items shots of the living room, numbered against the clock so a sort by name would disagree with the order
    // taken; three close-ups and an as-found shot beside them; a smaller kitchen.
    const living = Array.from({ length: 15 }, (_, i) => file('HVL-1_Living_Room_INV_' + (i + 1) + '_2026-10-07_' + (100000 + i * 10) + '.jpg'));
    const others = [file('HVL-1_Living_Room_DETAIL_1_2026-10-07_099999.jpg'), file('HVL-1_Living_Room_DETAIL_2_2026-10-07_100001.jpg'),
      file('HVL-1_Living_Room_DETAIL_3_2026-10-07_100002.jpg'), file('HVL-1_Living_Room_ASFOUND_1_2026-10-07_090000.jpg')]
      .concat(Array.from({ length: 5 }, (_, i) => file('HVL-1_Kitchen_INV_' + (i + 1) + '_2026-10-07_08000' + i + '.jpg')));
    // The kitchen listed first, so a test that took the first room it met would read the wrong one.
    const inv = folder(others.slice(4).concat(others.slice(0, 2), living.slice().reverse(), others.slice(2, 4)));
    const run = (clock) => {
      const logs = [], sent = [];
      const ctx = {
        ROOT_FOLDER_ID: 'ROOT',
        PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k === 'ANTHROPIC_API_KEY' ? 'sk-ant-test' : null) }) },
        DriveApp: { getFolderById: () => folder([], [folder([], [inv])]) },
        Logger: { log: (m) => logs.push(String(m)) },
        Date: function () { return { getTime: () => clock.shift() }; },
        agentCheckRooms: (d) => { sent.push(d); return { ok: true, model: 'claude-opus-5-5', failed: {},
          results: { probe: { doubles: [{ ids: ['line1', 'line2'], why: 'The oak sideboard, whole and close up.', confidence: 'high' }], photos: 12 } } }; },
        JSON, Math, String, Object, Array, Number, Error,
      };
      vm.createContext(ctx);
      vm.runInContext(['AGENT_ROOM_WINDOW'].map(gsVar).concat(['_agProp', '_agMissingProps', 'testAgentRoomCheck'].map(gsFn)).join('\n'), ctx);
      ctx.testAgentRoomCheck();
      return { logs, sent };
    };
    const a = run([1000, 31000]);
    const shots = (a.sent[0] && a.sent[0].rooms[0].shots) || [];
    eq(shots.length, 12, 'one full run: twelve photographs');
    eq(shots.map((x) => x.fileId), living.slice(0, 12).map((f) => f.getId()), '⚠ the living room\'s Items shots, first twelve in the order taken');
    ok(!shots.some((x) => /DETAIL|ASFOUND|Kitchen/.test(x.fileId)), 'never a close-up, an as-found shot or another room');
    ok(a.logs.some((l) => /15 Items photographs; reading the first 12, one full run/.test(l)), 'it says which room and how many');
    ok(a.logs.some((l) => /read 12 photographs in one run in 30s/.test(l)), 'and how long the run took');
    ok(!a.logs.some((l) => /CLOSE TO THE LIMIT/.test(l)), 'thirty seconds is inside the limit');
    const b = run([1000, 51000]);
    ok(b.logs.some((l) => /CLOSE TO THE LIMIT/.test(l)), '⚠ fifty seconds says lower the run before a full house');
  }

  // ═══ THE APP: WHAT IS SENT, AND WHAT COMES BACK ══════════════════════════════════════════════
  group('app · the rooms owed a check, and what each sends');
  {
    const rows = [
      ROW({ stableId: 'a', ts: 30 }),
      ROW({ stableId: 'a2', derivedFrom: 'a', ts: 30, objectName: 'Blue vase', category: 'Art & Décor' }),
      ROW({ stableId: 'b', ts: 10, objectName: 'Cobalt vase', driveFileId: 'FB' }),
      ROW({ stableId: 'u', ts: 40, objectName: '' }),                                   // not named yet
      ROW({ stableId: 'up', ts: 50, driveFileId: '', driveFileUrl: null, status: 'uploading' }),   // not in Drive yet
      ROW({ stableId: 'x', ts: 60, deletedAt: 5 }),                                     // removed
      ROW({ stableId: 'c', roomIdx: 5, ts: 70, driveFileId: 'FC' }),                    // a room of one photograph
      ROW({ stableId: 'd1', roomIdx: 6, ts: 80, driveFileId: 'FD1', dupChkAt: 9 }),     // a room already checked
      ROW({ stableId: 'd2', roomIdx: 6, ts: 90, driveFileId: 'FD2', dupChkAt: 9 }),
    ];
    const { ctx } = app(rows);
    const rooms = ctx.agentRoomsToCheck(7);
    eq(rooms.map((r) => r.roomIdx), [4], 'only the room with two photographs and a line not yet checked');
    eq(rooms[0].photos.map((p) => [p.srcId, p.lines.map((l) => l.stableId)]), [['b', ['b']], ['a', ['a', 'a2']]],
       'its photographs in the order taken, each with every line named off it (a split frame\'s lines together)');
    const pay = ctx._arRoomPayload(7, rooms[0]);
    eq([pay.key, pay.room, pay.shots.length, pay.shots[1].lines.map((l) => l.id)], ['4', 'Bedroom', 2, ['a', 'a2']], 'the payload is the room by key and name');
    ctx._getPhotoRef(7, 'd2').dupChkAt = 0;
    eq(ctx.agentRoomsToCheck(7).map((r) => r.roomIdx), [4, 6], 'a line in a checked room with no stamp makes the room owed again');
  }

  group('app · the one writer: the answer on the lines, and nothing else touched');
  {
    const rows = [ROW({ stableId: 'a' }), ROW({ stableId: 'b', driveFileId: 'FB', dupWith: ['z'], dupWhy: 'old', dupConf: 'low' }),
                  ROW({ stableId: 'c', driveFileId: 'FC' })];
    const { ctx } = app(rows);
    const room = { roomIdx: 4, photos: [{ srcId: 'a', lines: [ctx._getPhotoRef(7, 'a')] }, { srcId: 'b', lines: [ctx._getPhotoRef(7, 'b')] },
                                       { srcId: 'c', lines: [ctx._getPhotoRef(7, 'c')] }] };
    const n = ctx._arWrite(7, room, { doubles: [
      { ids: ['a', 'c'], why: 'the vase on the dresser and close up', confidence: 'medium' },
      { ids: ['a', 'c', 'ghost'], why: 'plainly the vase', confidence: 'high' },
      { ids: ['ghost', 'c'], why: 'not sent', confidence: 'high' }] });
    eq(n, 2, 'two doubles recorded; one naming a line that was not sent is not');
    const A = ctx._getPhotoRef(7, 'a'), B = ctx._getPhotoRef(7, 'b'), C = ctx._getPhotoRef(7, 'c');
    eq([A.dupWith, A.dupWhy, A.dupConf, C.dupWith], [['c'], 'plainly the vase', 'high', ['a']], 'both ways, at the higher confidence');
    eq([B.dupWith, B.dupWhy, B.dupConf], [undefined, undefined, undefined], 'a line the new look does not repeat is no longer flagged');
    ok([A, B, C].every((r) => r.dupChkAt > 0 && r.updatedAt === 99), 'every line sent is stamped as checked, and touched');
    const body = liveLines(fn('_arWrite'));
    ['objectName', 'fmv', 'disposition', 'needsAppr', 'reviewed', 'category', 'qty', 'deletedAt ='].forEach((k) => {
      ok(!new RegExp('r\\.' + k.replace(' =', '') + '\\s*=').test(body) && !body.includes('delete r.' + k), 'the writer never writes ' + k);
    });
    has(src, 'dupWith:r.dupWith, dupWhy:r.dupWhy, dupConf:r.dupConf, dupChkAt:r.dupChkAt,', 'and the manifest keeps the four fields');
  }

  group('app · Possible duplicates: names and pictures, one grouping, still off two photographs');
  {
    const rows = [
      ROW({ stableId: 'a', namedBy: 'agent', objectName: 'Blue vase', dupWith: ['c'], dupWhy: 'the vase twice', dupConf: 'high', reviewed: true }),
      ROW({ stableId: 'c', namedBy: 'agent', objectName: 'Cobalt vase', driveFileId: 'FC', dupWith: ['a'], dupWhy: 'the vase twice', dupConf: 'high' }),
      ROW({ stableId: 'n1', namedBy: 'agent', objectName: 'Nightstand', driveFileId: 'N1' }),
      ROW({ stableId: 'n2', namedBy: 'agent', objectName: 'nightstand.', driveFileId: 'N2' }),
      ROW({ stableId: 'p', namedBy: 'agent', objectName: 'Lamp', driveFileId: 'P', dupWith: ['q'] }),
      ROW({ stableId: 'q', namedBy: 'agent', objectName: 'Lamp shade', derivedFrom: 'p', driveFileId: 'P', dupWith: ['p'] }),
      ROW({ stableId: 'r', roomIdx: 5, namedBy: 'agent', objectName: 'Rug', driveFileId: 'R', dupWith: ['s'] }),
      ROW({ stableId: 's', roomIdx: 4, namedBy: 'agent', objectName: 'Runner', driveFileId: 'S', dupWith: ['r'] }),
    ];
    const { ctx, log } = app(rows);
    const g = ctx.agentDuplicateGroups(7);
    eq(g.map((x) => x.rows.map((r) => r.stableId).sort().join('+')), ['a+c', 'n1+n2'],
       'the room check\'s pair (reviewed or not) and the same-name pair; never one photograph, never two rooms');
    eq([g[0].why, g[0].conf, g[1].sameName], ['the vase twice', 'high', true], 'each group says which evidence');
    const html = ctx._agDupHtml(7, ctx._jobInvRefs(7));
    has(html, 'the vase twice', 'the block leads a room-check group with what the pictures showed');
    has(html, 'room check: plainly one thing', 'and how sure it was');
    has(html, '>Blue vase<', 'naming each line under its photograph');
    has(html, 'Nightstand', 'a same-name group still leads with the name');
    ctx.agentNotDuplicate(7, ctx._agDupHandle(g[0].key));
    eq(ctx.agentDuplicateGroups(7).length, 1, 'Not duplicates quiets the pair');
    eq(log.renders > 0, true, 'and the tab redraws');
    ctx._getPhotoRef(7, 'n2').deletedAt = 3;
    eq(ctx.agentDuplicateGroups(7).length, 0, 'removing one line dissolves its group');
  }

  group('app · the run: the queue by room, failures by name, an old deployment named');
  {
    // Fresh rows for every rig: a run stamps the lines it checked.
    const mk = () => [ROW({ stableId: 'a', ts: 1 }), ROW({ stableId: 'b', driveFileId: 'FB', ts: 2 }),
                      ROW({ stableId: 'c', roomIdx: 5, driveFileId: 'FC', ts: 3 }), ROW({ stableId: 'd', roomIdx: 5, driveFileId: 'FD', ts: 4 })];
    const R = app(mk(), { answers: [
      { ok: true, results: { 4: { doubles: [{ ids: ['a', 'b'], why: 'the dresser twice', confidence: 'high' }] } }, failed: {}, remaining: [] },
      { ok: true, results: {}, failed: { 5: 'took too long (Timeout)' }, remaining: [] }] });
    eq(R.ctx.agentRoomCheckRun(7), true, 'it runs');
    has(R.log.confirms[0], 'Check 2 rooms for anything photographed twice?', 'asked first, by count');
    has(R.log.confirms[0], 'Nothing is removed', 'saying nothing is removed');
    eq(R.log.posts.map((p) => [p.action, p.rooms.map((r) => r.key)]), [['agentRoomCheck', ['4', '5']], ['agentRoomCheck', ['5']]],
       'whole rooms packed into a call; the room the answer did not reach goes again on its own');
    eq(R.log.posts[0].context, { fiduciary: true }, 'with the estate flag');
    eq(R.ctx._getPhotoRef(7, 'a').dupWith, ['b'], 'the answer lands on the lines');
    const st = R.ctx._arState(7);
    eq([st.running, st.done, st.doubles, st.failed], [false, 2, 1, 1], 'two rooms done: one double, one room that could not be read');
    has(R.ctx._arStateHtml(7), 'Study: took too long', 'the failure is named with its room');
    has(R.ctx._arStateHtml(7), '1 possible double flagged under Possible duplicates', 'and the double is counted');

    const small = app(mk(), { answers: [{ ok: true, results: { 4: { doubles: [] } }, failed: {}, remaining: [] },
                                        { ok: true, results: { 5: { doubles: [] } }, failed: {}, remaining: [] }] });
    small.ctx.AGENT_ROOM_BATCH_SHOTS = 2;
    small.ctx.agentRoomCheckRun(7);
    eq(small.log.posts.map((p) => p.rooms.map((r) => r.key)), [['4'], ['5']], 'at two photographs a call, one room a call');
    const old = app(mk(), { answers: [{ ok: false, error: 'Unknown action: agentRoomCheck' }] });
    old.ctx.agentRoomCheckRun(7);
    has(old.ctx._arStateHtml(7), 'Unknown action: agentRoomCheck', '⚠ an older deployment is named, never silent');
    const deaf = app(mk(), { answers: [{ ok: true, results: {}, failed: {}, remaining: ['4', '5'] }] });
    deaf.ctx.agentRoomCheckRun(7);
    has(deaf.ctx._arStateHtml(7), 'answered for none', 'a call that answers for no room ends the run, named');
    const quiet = app([ROW({ stableId: 'a', dupChkAt: 1 })]);
    eq([quiet.ctx.agentRoomCheckRun(7, { auto: true }), quiet.log.alerts.length, quiet.log.posts.length], [false, 0, 0],
       'after a naming run with nothing to check it asks nothing and says nothing');
    quiet.ctx.agentRoomCheckRun(7);
    has(quiet.log.alerts[0], 'Every room has been checked', 'pressed by hand with nothing owed, it says so');
  }

  group('app · the button on the work bar, and the naming run that hands on to it');
  {
    const rows = [ROW({ stableId: 'a' }), ROW({ stableId: 'b', driveFileId: 'FB' })];
    const { ctx } = app(rows);
    has(ctx._arCheckButtonHtml({ id: 7 }), 'Check 1 room</button>', 'offered while a room is owed a check');
    has(ctx._arCheckButtonHtml({ id: 7 }), 'agentRoomCheckRun(7)', 'and it runs the check');
    ctx._arState(7).running = true;
    eq(ctx._arCheckButtonHtml({ id: 7 }), '', 'withdrawn while a check runs');
    ctx._arState(7).running = false;
    rows.forEach((r) => { r.dupChkAt = 5; });
    eq(ctx._arCheckButtonHtml({ id: 7 }), '', 'and once nothing is owed');
    const bar = fn('_renderInvWorkbar');
    ok(bar.indexOf('_arCheckButtonHtml(job)') > bar.indexOf('agentNameShots(') && bar.indexOf('_arCheckButtonHtml(job)') < bar.indexOf('_avValueButtonHtml(job)'),
       'between Name N shots and Value N lines: a line counted twice is a line valued twice');
    // The naming run's tail.
    const calls = [];
    const s = sandbox({ fns: ['_agFinish', '_agState'], vars: ['_agRun'],
      stubs: { savePhotoRefs() {}, _scheduleInventorySync() {}, renderInventoryTab() {}, agentRoomCheckRun: (j, o) => calls.push([j, o]) } });
    s._agFinish(7);
    eq(calls, [[7, { auto: true }]], 'a naming run that finished hands on to the room check by itself');
    s._agState(8).error = 'Unknown action';
    s._agFinish(8);
    eq(calls.length, 1, 'one that failed outright does not');
  }

  // ═══ THE COLLECTIONS ═════════════════════════════════════════════════════════════════════════
  const COLL = (over) => Object.assign({ id: 1700000000000, name: 'Coin collection', disp: 'appraise', qty: '200', value: '5000' }, over || {});

  group('collections · one line each, by itself, once: never on a prep job, before the win, or before the sheet is read');
  {
    const made = (over) => { const a = app([], Object.assign({ est: EST([COLL()]) }, over)); return [a.ctx.collectionLinesEnsure(7), a]; };
    eq(made({ job: { svc: 'prep' } })[0], 0, 'a prep job keeps no inventory');
    eq(made({ won: false })[0], 0, 'nothing before the client says yes');
    eq(made({ seen: {} })[0], 0, 'nothing before this device has read the job from the sheet');
    const [n, A] = made({});
    eq(n, 1, 'one line for the one collection');
    const line = A.ctx._getPhotoRef(7, '7_col1700000000000');
    eq([line.objectName, line.category, line.disposition, line.qty, line.fmv, line.needsAppr, line.manual, line.updatedAt, line.ts],
       ['Coin collection', 'Collectibles', '', '200', 5000, true, true, 1, 1700000000000],
       'the walkthrough\'s name, guessed category, instruction, count and value; manual, the weakest clock, the collection\'s own time');
    eq([A.log.saved, A.log.synced], [1, 1], 'saved and sent once');
    eq(A.ctx.collectionLinesEnsure(7), 0, 'never twice');
    line.deletedAt = 4;
    eq(A.ctx.collectionLinesEnsure(7), 0, 'never again once a person took it off');
    const took = app([ROW({ stableId: 'p1', sourceCollId: 1700000000000 })], { est: EST([COLL()]) });
    eq(took.ctx.collectionLinesEnsure(7), 0, 'and never beside a photographed line that took it over');
    has(fn('renderInventoryTab'), 'collectionLinesEnsure(jobId);', 'the desk makes them on its render');
    ok(fn('renderInventoryTab').indexOf('collectionLinesEnsure(jobId)') < fn('renderInventoryTab').indexOf('_invAssignItemNos(jobId)'),
       'before numbering, so a new line is numbered in the same pass');
    has(fn('_invRefreshFromCloud'), 'var made = collectionLinesEnsure(jobId);', 'and after the desk reads the sheet');
  }

  group('collections · waiting for a photograph: the one test, and the one answer');
  {
    const rows = [
      ROW({ stableId: '7_col1', objectName: 'Coin collection', sourceCollId: 1, manual: true, filename: '', driveFileUrl: null, driveFileId: '', roomIdx: null }),
      ROW({ stableId: 'p2', objectName: 'Stamp albums', sourceCollId: 2, filename: 'x.jpg', driveFileId: '', driveFileUrl: null, status: 'uploading' }),
      ROW({ stableId: '7_col3', objectName: 'Dolls', sourceCollId: 3, manual: true, filename: '', driveFileUrl: null, driveFileId: '', deletedAt: 5 }),
    ];
    const { ctx } = app(rows, { est: EST([COLL({ id: 1 }), COLL({ id: 2, name: 'Stamps' }), COLL({ id: 3, name: 'Dolls' }), COLL({ id: 4, name: 'Records' })]) });
    eq(ctx.collectionLinesUnshot(7).map((r) => r.stableId), ['7_col1'], 'the line with no photograph is waiting; one still uploading is not');
    eq(ctx.collectionsAwaitingPhoto(7).map((c) => c.id), [1, 4],
       'waiting: the unphotographed one and the one not on the inventory yet; a removed one has had its answer');
    eq(ctx._apprEstimateFlags(7).collections, 2, 'the worklist counts the ones flagged to appraise that are still waiting');
    eq(app([], { job: { svc: 'prep' }, est: EST([COLL()]) }).ctx.collectionsAwaitingPhoto(7), [], 'nothing on a prep job');
  }

  group('collections · the camera fills the line: its id and number kept, the photograph and room added');
  {
    const placeholder = ROW({ stableId: '7_col1', itemNo: 12, objectName: 'Coin collection', category: 'Collectibles', qty: '200',
      disposition: 'Auction', fmv: 5000, needsAppr: true, sourceCollId: 1, manual: true, status: 'manual', filename: '',
      driveFileUrl: null, driveFileId: undefined, roomIdx: null, reviewed: true, namedBy: 'desk' });
    const uploads = [];
    const ctx = sandbox({
      fns: ['_captureShot', 'photoSubfolder', 'fieldDispToInv', '_cleanName', '_photoUid', '_slotRefs', '_setPhotoRef', '_getPhotoRef',
            'collectionLineUnshot', '_invHasPhoto', 'collectionLineWithPhoto', '_invFileId'],
      vars: ['PHOTO_CAPTURE_LABELS', 'AS_FOUND_SUBFOLDER', 'PHOTO_SUBFOLDER', '_localShotThumbs', '_photoUidSeq', 'INV_DEFAULT_CATEGORY',
             'FIELD_DISPOSITIONS', 'FIELD_DISP_DEFAULT'],
      stubs: {
        jobs: [{ id: 7, hvlId: 'HVL-0007' }], _photoRefs: { 7: [placeholder] },
        estimateStore: { 7: { estimate: { rooms: [{ idx: 4, name: 'Study' }] } } },
        _photoCaptureJob: () => ({ id: 7, hvlId: 'HVL-0007' }), _photoStamp: () => '2026-10-07_101500',
        _photoRetryData: {}, _savePendingPhotoData() {}, savePhotoRefs() {},
        _doPhotoUpload: (j, d, filename, stableId) => uploads.push({ filename, stableId }),
        _invCacheLocalThumb() {}, _scheduleInventorySync() {}, compressImage: (d, w, q, cb) => cb(d),
        _invTouch: (r) => { r.updatedAt = 99; return r; },
      },
    });
    ctx._captureShot(7, 4, 'inventory', 'data:image/jpeg;base64,AAA', { into: '7_col1', fieldDisp: 'undecided', needsAppr: false });
    const L1 = ctx._getPhotoRef(7, '7_col1');
    eq(ctx._photoRefs[7].length, 1, '⚠⚠ no second line: the shot is the collection\'s');
    eq([L1.itemNo, L1.roomIdx, L1.label, L1.status, L1.manual, L1.objectName, L1.qty, L1.needsAppr, L1.disposition, String(L1.sourceCollId), L1.reviewed, L1.namedBy],
       [12, 4, 'inventory', 'uploading', undefined, '', '200', true, 'Auction', '1', undefined, undefined],
       'its number, count, instruction, disposition and link stay; the room, the photograph and a fresh name to come');
    has(L1.filename, 'Study_INV_', 'filed as an Items shot of the room it was taken in');
    eq(L1.fieldNote, 'From the walkthrough: Coin collection (200).', 'with the walkthrough\'s words for the agent');
    eq(uploads.map((u) => u.stableId), ['7_col1'], 'and the upload is for that line');
    ctx._captureShot(7, 4, 'inventory', 'data:image/jpeg;base64,BBB', { into: '7_col1', fieldDisp: 'sell' });
    eq(ctx._photoRefs[7].length, 2, 'armed again once it has a photograph, the next shot is an ordinary Items line, never lost');
    eq(ctx._photoRefs[7][1].disposition, 'Sell', 'with the field\'s chip');
  }

  group('collections · the camera and the room\'s brief offer them, armed per shot');
  {
    const ph = ROW({ stableId: '7_col1', objectName: 'Coin collection', sourceCollId: 1, manual: true, filename: '', driveFileUrl: null, driveFileId: '', roomIdx: null });
    const { ctx } = app([ph], { fns: ['fieldCamToggleColl', 'fieldCamToggleDetail'], vars: ['_fieldCam'] });
    const brief = ctx._roomCollectionsHtml(7, 4);
    has(brief, 'From the walkthrough, not photographed yet.', 'the room\'s brief names them');
    has(brief, "openFieldCamera(7,4,'inventory',{coll:'7_col1'})", 'one tap opens Items with the collection armed');
    ctx._fieldCam = { open: true, jobId: 7, last: 'x', detail: true, coll: null };
    const paints = [];
    ctx._fieldCamPaint = () => paints.push(1);
    ctx.fieldCamToggleColl('7_col1');
    eq([ctx._fieldCam.coll, ctx._fieldCam.detail], ['7_col1', false], 'arming a collection turns the detail toggle off');
    ctx.fieldCamToggleDetail();
    eq([ctx._fieldCam.coll, ctx._fieldCam.detail], [null, true], 'and the detail toggle disarms it');
    has(fn('_fieldCamCommit'), "into: (label === 'inventory' && st.coll) ? st.coll : null,", 'the shutter passes the armed collection to the capture');
    has(fn('_fieldCamCommit'), 'st.coll = null;', 'and the arming lasts one shot');
    has(fn('_fieldCamPaint'), 'collectionLinesUnshot(st.jobId)', 'the camera\'s chips read the one test');
    has(fn('_paintRoomWorkspace'), '_roomCollectionsHtml(jobId, roomIdx)', 'and the room draws the brief');
    ph.filename = 'y.jpg';
    eq(ctx._roomCollectionsHtml(7, 4), '', 'gone once photographed');
  }

  group('collections · the desk: the chip, the panel, and handing the line to one already shot');
  {
    const ph = () => ROW({ stableId: '7_col1', itemNo: 3, objectName: 'Coin collection', category: 'Collectibles', sourceCollId: 1, manual: true,
      filename: '', driveFileUrl: null, driveFileId: '', roomIdx: null, disposition: 'Auction', needsAppr: true, fmv: 5000 });
    const shot = () => ROW({ stableId: 'p1', itemNo: 9, objectName: 'Morgan dollars in albums', category: 'Collectibles', disposition: '' });
    const other = () => ROW({ stableId: 'p2', itemNo: 10, objectName: 'Desk lamp', category: 'General/Household', driveFileId: 'F2' });
    const A = app([ph(), other(), shot()], { est: EST([COLL({ id: 1 })]) });
    const panel = A.ctx._collPanelHtml({ id: 7 }, A.ctx._getPhotoRef(7, '7_col1'));
    has(panel, 'No photograph yet. In the house', 'the panel says where to take it');
    has(panel, 'Use that line', 'and offers the line already shot');
    ok(panel.indexOf('p1') < panel.indexOf('p2'), 'the same category first');
    eq(A.ctx._collPanelHtml({ id: 7 }, A.ctx._getPhotoRef(7, 'p1')), '', 'nothing on any other line');
    has(src, '&#128247; no photograph yet</span>', 'the row carries the chip');
    has(fn('_renderInvPanel'), '_collPanelHtml(job, ref)', 'and the line\'s record draws the panel');
    has(fn('renderJobPlan'), '_pendBanner + _collBanner', 'the plan draws its collections banner');
    eq(A.ctx.collectionUseLine(7, '7_col1', ''), false, 'nothing picked: refused');
    eq(A.ctx.collectionUseLine(7, '7_col1', 'p1'), true, 'the desk hands it over');
    const P = A.ctx._getPhotoRef(7, 'p1'), C = A.ctx._getPhotoRef(7, '7_col1');
    eq([String(P.sourceCollId), P.disposition, P.needsAppr, P.fmv, P.objectName], ['1', 'Auction', true, 5000, 'Morgan dollars in albums'],
       'the shot line takes the link and the walkthrough\'s instructions where it had none, and keeps its own name');
    eq([!!C.deletedAt, C.deletedBy], [true, 'Ashley Jerome'], 'the collection\'s own line comes off, stamped');
    eq(A.ctx._jobInvRefs(7).filter((r) => r.sourceCollId != null).length, 1, '⚠⚠ the collection is counted once');
    const B = app([ph(), shot()], { confirm: false, est: EST([COLL({ id: 1 })]) });
    eq([B.ctx.collectionUseLine(7, '7_col1', 'p1'), B.ctx._getPhotoRef(7, 'p1').sourceCollId], [false, undefined], 'nothing changes when cancelled');
    const D = app([ph(), shot(), ROW({ stableId: 'p3', sourceCollId: 2 })], { est: EST([COLL({ id: 1 })]) });
    eq(D.ctx.collectionUseLine(7, '7_col1', 'p3'), false, 'a line already another collection\'s is refused');
    has(D.log.alerts[0], 'already the line of a collection', 'by name');
  }

  group('collections · the Collection Partners card reads the line; the import panel offers vehicles only');
  {
    const A = app([ROW({ stableId: '7_col1', itemNo: 3, sourceCollId: 1, manual: true, filename: '', driveFileUrl: null, driveFileId: '', roomIdx: null })],
      { est: EST([COLL({ id: 1 })], [{ id: 9, desc: '1965 Mustang', year: '1965', collector: true }]) });
    has(A.ctx._collLineStatusHtml(7, 1), 'Not photographed yet', 'the card says the line is waiting');
    A.ctx._getPhotoRef(7, '7_col1').filename = 'x.jpg';
    A.ctx._getPhotoRef(7, '7_col1').roomIdx = 5;
    has(A.ctx._collLineStatusHtml(7, 1), 'Photographed on the inventory: #3 in Study', 'and then where it was photographed');
    // Driven, not read (the P24 sweep: a needle on the source stayed green with the branch forced off).
    const card = A.ctx._renderCollPhotoCapture(7, 1);
    has(card, 'coll-line-status', 'on a job that keeps an inventory the card reads the line');
    lacks(card, 'Capture Asset Photo', 'and keeps no photograph of its own');
    const P = app([], { job: { svc: 'prep' }, est: EST([COLL({ id: 1 })]) });
    const prepCard = P.ctx._renderCollPhotoCapture(7, 1);
    has(prepCard, 'Capture Asset Photo', 'a prep job keeps its asset photograph');
    lacks(prepCard, 'coll-line-status', 'and has no inventory line to read');
    const panel = A.ctx._renderInventoryImportPanel(7);
    has(panel, '1965 Mustang', 'the import panel offers the vehicle');
    lacks(panel, 'Coin collection', 'and no collection');
    has(panel, 'collections are on the inventory already', 'saying where they are');
    eq(Object.keys(A.ctx._importableFromEstimate(7)), ['vehicles'], 'the import answers vehicles alone');
    lacks(src, 'function materializeCollection(', 'the collection import is gone');
    lacks(src, 'function _impLotHintHtml(', 'and its capture-time readout with it');
  }
};
