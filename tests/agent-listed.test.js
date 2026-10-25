'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// AGENT ONE IS TOLD WHAT IS ALREADY LISTED OFF A PHOTOGRAPH, AND ITS NAMES CARRY NO COUNT (2026-10-24).
//
// Anthony, off the Ellison plates: one kitchen photograph carried four lines, #73 and #87 both the dinner plates and #81
// and #88 both the salad plates, in two wordings (*"you should definitely fix whatever you say is wrong with agent one,
// and I can do a redeploy"*); and the dinner plates were named *… approx. 7 in stack* where there were eight (*"I don't
// think we should put the number of items in a name … I took the picture of the top of a stack of plates, and it only
// registered as 1, but there were 7 more underneath it"*).
//
//   A blank line on a photograph already named is sent with the lines already named off it (agentListedOff), and the
//   backend asks only for what is not among them (_agListedText); a photograph named for the first time reads as before.
//   An empty answer stamps the blank rows it was asked about, never a named line.
//   The naming prompt puts no count in a name: how many is qty, from the crew's note where it gives one.
//   The backend is 2026-10-24 and the app relies on it; the pages say so.
// ─────────────────────────────────────────────────────────────────────────────

const vm = require('vm');
const fs = require('fs');
const path = require('path');
const { sandbox, matchBrace } = require('./harness');

const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const GS = read('apps-script/main-sync.gs');
const SRC = read('havellin.html');
function gsFn(name) {
  const re = new RegExp('(^|\\n)function\\s+' + name + '\\s*\\(', 'g');
  const m = re.exec(GS);
  if (!m) throw new Error('not in .gs: ' + name);
  const start = m.index + (m[1] ? m[1].length : 0);
  return GS.slice(start, matchBrace(GS, GS.indexOf('{', re.lastIndex)) + 1);
}
function gsVar(name) {
  const m = GS.match(new RegExp('(^|\\n)(var\\s+' + name + '\\s*=[\\s\\S]*?;)'));
  if (!m) throw new Error('var not in .gs: ' + name);
  return m[2];
}
const live = (s) => String(s).split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

// ─── The real backend, its one network seam (fetchAll) recording what is sent ───
function backend() {
  const sent = [];
  const ctx = {
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k === 'ANTHROPIC_API_KEY' ? 'sk-ant-test' : null) }) },
    Logger: { log() {} },
    DriveApp: { getFileById: () => ({ getBlob: () => ({ getContentType: () => 'image/jpeg', getBytes: () => [1, 2, 3] }) }) },
    Utilities: { base64Encode: (b) => 'B64(' + b.length + ')' },
    UrlFetchApp: { fetchAll: (reqs) => { sent.push.apply(sent, reqs.map((r) => JSON.parse(r.payload)));
      return reqs.map(() => ({ getResponseCode: () => 200, getContentText: () => JSON.stringify({ stop_reason: 'tool_use',
        content: [{ type: 'tool_use', name: 'record_contents', input: { objects: [], notices: [] } }] }) })); } },
    Date: function () { return { getTime: () => 1000 }; },
    JSON, Math, Number, String, Object, Array, Error, parseInt,
  };
  vm.createContext(ctx);
  vm.runInContext(['AGENT_API', 'AGENT_API_VERSION', 'AGENT_MODEL', 'AGENT_EFFORT', 'AGENT_MAX_TOKENS', 'AGENT_PARALLEL',
    'AGENT_MAX_SHOTS', 'AGENT_TIME_BUDGET', 'AGENT_MAX_IMG', 'AGENT_LISTED_MAX', 'AGENT_COUNT_IN_NAME_RE'].map(gsVar)
    .concat(['_agProp', '_agMissingProps', '_agImageBlock', '_agTool', '_agSystem', '_agUserContent', '_agListedText',
      '_agRequestFor', '_agReadResult', 'agentIdentifyShots'].map(gsFn)).join('\n'), ctx);
  ctx.sent = sent;
  return ctx;
}
const userText = (req) => ((req && req.messages && req.messages[0].content) || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n');

// ─── The real app side ───
const PHOTO = { roomIdx: 2, label: 'inventory', status: 'uploaded', ts: 1000, filename: 'HVL_Kitchen_INV_5.jpg',
  driveFileId: 'FID_P', driveFileUrl: 'https://drive.google.com/file/d/FID_P/view' };
const P = () => Object.assign({ stableId: 'p', itemNo: 73, objectName: 'Hand-painted majolica dinner plates, yellow bird and blue flower', qty: 8,
  category: 'Collectibles', namedBy: 'agent', agentConf: 'high', updatedAt: 500, fieldNote: 'Italian plates going to Katherine' }, PHOTO);
const S = () => Object.assign({ stableId: 's', itemNo: 81, derivedFrom: 'p', objectName: 'Hand-painted majolica salad plates, matching', qty: 6,
  category: 'Collectibles', namedBy: 'desk', updatedAt: 600 }, PHOTO);
const BLANK = (id, n) => Object.assign({ stableId: id, itemNo: n, derivedFrom: 'p', objectName: '', category: 'General/Household', updatedAt: 700 }, PHOTO);
function app(refs) {
  return sandbox({
    fns: ['agentListedOff', 'agentNameableRefs', 'agentShotGroups', '_agDetailRefs', '_agShotPayload', '_agContext', '_agWrite',
      'agentApplyResult', '_agState', 'invSplitItemN', '_getPhotoRef', '_setPhotoRef', '_jobInvRefs', '_invFileId', '_photoUid',
      '_invPhotoSource', '_invRoomName'],
    vars: ['_agRun', 'AGENT_MAX_DETAILS', 'AGENT_LISTED_MAX', 'INV_TAXONOMY', 'INV_CATEGORIES', 'INV_DEFAULT_CATEGORY', 'INV_SPLIT_MAX', '_photoUidSeq'],
    stubs: {
      jobs: [{ id: 7, hvlId: 'HVL-0009', svc: 'cleanout' }], _photoRefs: { 7: refs },
      estimateStore: { 7: { estimate: { rooms: [{ idx: 2, name: 'Kitchen', note: '' }] } } },
      savePhotoRefs() {}, _scheduleInventorySync() {}, _invTouch(r) { r.updatedAt = 999; return r; },
      mustFindItems: () => [], invFiduciaryMode: () => true, matterTypeOf: () => 'trust',
    },
  });
}

module.exports = function ({ group, ok, eq, has, lacks }) {

  group('A · agentListedOff: the named lines off the photograph, never a row asked about, a removed line or another photograph\'s');
  {
    const A = app([P(), S(), BLANK('b1', 87), BLANK('b2', 88),
      Object.assign(BLANK('gone', 90), { objectName: 'Removed line', deletedAt: 5 }),
      Object.assign({ stableId: 'o', objectName: 'Copper pans', qty: 4, driveFileId: 'FID_O' }, PHOTO, { driveFileId: 'FID_O' })]);
    eq(A.agentListedOff(7, 'p', ['b1', 'b2']), [{ name: 'Hand-painted majolica dinner plates, yellow bird and blue flower', qty: 8 },
      { name: 'Hand-painted majolica salad plates, matching', qty: 6 }], '⚠⚠ the dinner plates and the salad plates, each with its count, the photograph\'s own line first');
    eq(A.agentListedOff(7, 'p', ['p', 'b1']).map((l) => l.name), ['Hand-painted majolica salad plates, matching'], 'a row asked about is never listed, named or not');
    const many = app([P()].concat(Array.from({ length: 40 }, (x, i) => Object.assign(BLANK('d' + i, 100 + i), { objectName: 'Line ' + i, ts: 2000 + i }))));
    eq(many.agentListedOff(7, 'p', []).length, many.AGENT_LISTED_MAX, 'capped at ' + many.AGENT_LISTED_MAX);
    eq(app([Object.assign(P(), { objectName: '' })]).agentListedOff(7, 'p', ['p']), [], 'a photograph named for the first time lists nothing');
  }

  group('B · ⚠⚠ the join: the app sends the listed lines, and the request Agent One reads names them and asks only for what is not among them');
  {
    const A = app([P(), S(), BLANK('b1', 87), BLANK('b2', 88)]);
    const groups = A.agentShotGroups(7);
    eq(groups.map((g) => [g.srcId, g.rows]), [['p', ['b1', 'b2']]], 'the two blank lines go as one photograph');
    const payload = A._agShotPayload(7, groups[0]);
    eq((payload.listed || []).length, 2, 'the payload carries the two lines already named');
    const B = backend();
    const out = B.agentIdentifyShots({ context: { categories: A.INV_CATEGORIES, mustFind: [], fiduciary: true }, shots: [JSON.parse(JSON.stringify(payload))] });
    ok(out.ok, 'the backend answers');
    const t = userText(B.sent[0]);
    has(t, 'This photograph is already on the inventory. These objects in it are listed already:', 'the request says the photograph is already on the list');
    has(t, '  - Hand-painted majolica dinner plates, yellow bird and blue flower (qty 8)', 'naming the dinner plates, with their count');
    has(t, '  - Hand-painted majolica salad plates, matching (qty 6)', 'and the salad plates');
    has(t, 'Record ONLY the objects in it that are NOT already listed above', '⚠⚠ and asks only for what is not among them');
    has(t, 'however you would word it', 'in any wording');
    has(t, 'If everything inventoriable in it is already listed, record an empty list.', 'with an empty list the answer when nothing else is there');
    // A photograph named for the first time reads exactly as before.
    const F = app([Object.assign(P(), { objectName: '', namedBy: '' })]);
    const fp = F._agShotPayload(7, F.agentShotGroups(7)[0]);
    eq(fp.listed, [], 'a first naming sends no list');
    const B2 = backend();
    B2.agentIdentifyShots({ context: { categories: F.INV_CATEGORIES, mustFind: [] }, shots: [JSON.parse(JSON.stringify(fp))] });
    lacks(userText(B2.sent[0]), 'already on the inventory', 'and its request says nothing of one');
    eq(B2._agListedText([{ name: '  ', qty: 3 }]), '', 'a blank name is no line');
  }

  group('C · an empty answer stamps the blank rows asked about, never a named line; one object fills one row and touches nothing else');
  {
    const A = app([P(), S(), BLANK('b1', 87), BLANK('b2', 88)]);
    const g = A.agentShotGroups(7)[0];
    const before = JSON.stringify([A._getPhotoRef(7, 'p'), A._getPhotoRef(7, 's')]);
    A.agentApplyResult(7, g, { objects: [], notices: [] });
    eq(JSON.stringify([A._getPhotoRef(7, 'p'), A._getPhotoRef(7, 's')]), before, '⚠ the dinner plates and the salad plates untouched (no empty stamp on a named line)');
    eq(['b1', 'b2'].map((id) => A._getPhotoRef(7, id).agentConf), ['none', 'none'], 'the two blank rows stamped: nothing else in the photograph');
    eq(A._jobInvRefs(7).length, 4, 'and no line added');
    const A2 = app([P(), S(), BLANK('b1', 87), BLANK('b2', 88)]);
    A2.agentApplyResult(7, A2.agentShotGroups(7)[0], { notices: [], objects: [
      { name: 'Hand-painted majolica serving platter', category: 'Collectibles', qty: 1, confidence: 'high', basis: 'edge of the frame', crop: [0, 0, 1, 1] }] });
    eq([A2._getPhotoRef(7, 'b1').objectName, A2._getPhotoRef(7, 'b2').objectName], ['Hand-painted majolica serving platter', ''], 'the one new object fills one row; the other stays blank for the desk');
    eq([A2._getPhotoRef(7, 'p').objectName, A2._getPhotoRef(7, 's').objectName],
       ['Hand-painted majolica dinner plates, yellow bird and blue flower', 'Hand-painted majolica salad plates, matching'], 'the named lines keep their names');
    const F = app([Object.assign(P(), { objectName: '', namedBy: '', agentConf: undefined })]);
    F.agentApplyResult(7, F.agentShotGroups(7)[0], { objects: [], notices: [] });
    eq(F._getPhotoRef(7, 'p').agentConf, 'none', 'a first naming that finds nothing stamps the photograph\'s line, as before');
  }

  group('D · the naming prompt: no count in a name; the count is qty, from the crew\'s note where it gives one');
  {
    const B = backend();
    const sys = B._agSystem({ categories: ['Collectibles', 'General/Household'], mustFind: [] });
    has(sys, 'Never put how many there are in the name: no "set of 8", "pair", "30 pieces", "approx. 7 in stack" or "stack of 6".', '⚠⚠ the rule, with the words the Ellison plates came back with');
    has(sys, 'The count goes in qty and nowhere else', 'the count is qty\'s');
    has(sys, 'When the crew\'s note gives a count ("set of 8", "twelve of them"), use it for qty; otherwise qty is what you can see.', 'taken from the crew\'s note where it gives one');
    has(sys, 'qty 30, not thirty entries', 'a lot is still one line (the photography guide\'s group photo)');
    // Every example name the prompt offers obeys the rule (the old ones were "Flatware service, 30 pieces" and "…, pair").
    const examples = (sys.match(/Good: "[^"]+"/g) || []).concat(sys.match(/"Sterling flatware service"/g) || []);
    ok(examples.length >= 4, 'the prompt still offers its example names (' + examples.length + ')');
    eq(examples.filter((e) => B.AGENT_COUNT_IN_NAME_RE.test(e)), [], 'and not one carries a count');
    lacks(sys, 'Flatware service, 30 pieces', 'the old lot example is gone');
    lacks(sys, 'speakers, pair"', 'and the old speakers example');
    const tool = B._agTool(['Collectibles']).input_schema.properties.objects.items.properties;
    has(tool.name.description, 'never with a count: how many goes in qty', 'the tool\'s own words for the name say so');
    has(tool.qty.description, 'from the crew\'s note where it gives one', 'and for qty');
    // The warning testAgentIdentify prints catches the words the plates came back with, and passes a clean name.
    ['Hand-painted tin-glazed earthenware dinner plates; approx. 7 in stack', 'Hand-painted majolica dinner plates, stack of approximately 6',
     'Bang & Olufsen Beolab 8000 speakers, pair', 'Flatware service, 30 pieces'].forEach((n) => ok(B.AGENT_COUNT_IN_NAME_RE.test(n), 'caught: ' + n));
    ok(!B.AGENT_COUNT_IN_NAME_RE.test('Hand-painted majolica dinner plates, yellow bird and blue flower'), 'a clean name passes');
    has(gsFn('testAgentIdentify'), 'AGENT_COUNT_IN_NAME_RE.test(', 'testAgentIdentify says so on the first run after the redeploy');
  }

  group('E · the deployment: 2026-10-24, the app relies on it, and the banner names what an older one gets wrong');
  {
    const bv = /var BACKEND_VERSION = '([^']+)'/.exec(GS)[1];
    const mv = /var BACKEND_MIN_VERSION = '([^']+)'/.exec(SRC)[1];
    // RESTATED 2026-10-24b (Agent Two's better name, agents-together.test.js B5): this build's backend is carried by every later
    // one, and the banner names its gap by its vintage, after the newer one.
    ok(bv >= '2026-10-24', 'main-sync.gs is 2026-10-24 or later (' + bv + ')');
    ok(mv >= '2026-10-24', 'and the app relies on it (' + mv + ')');
    const C = sandbox({ vars: ['BACKEND_FEATURE_COST'] });
    has(C.BACKEND_FEATURE_COST.version, 'on a deployment older than 2026-10-24, a blank line added to a photograph already named (Another item in this photo) makes Agent One read the whole photograph again',
       'the banner names this gap by its vintage, by consequence');
    has(C.BACKEND_FEATURE_COST.version, 'on a deployment older than 2026-10-19b, a client', 'and the inventory reset\'s gap after it, by its vintage');
  }

  group('F · the pages say it: the manual and the playbook in both copies, Photographing a House');
  {
    const title = 'The count is in Qty, never in the name; and a photograph already on the list is not read twice (2026-10-24';
    has(read('manual.html'), title, 'the manual');
    has(read('MANUAL.md'), title, 'its markdown copy');
    has(read('concierge-guide.html'), 'a name never carries a count: how many is the Qty box alone', 'the playbook');
    has(read('CONCIERGE_GUIDE.md'), 'a name never carries a count: how many is the Qty box alone', 'its markdown copy');
    lacks(read('concierge-guide.html'), 'Beolab 8000 speakers, pair', 'the playbook\'s example name lost its count');
    lacks(read('CONCIERGE_GUIDE.md'), 'Beolab 8000 speakers, pair', 'in both copies');
    const g = read('photography-guide.html');
    has(g, 'its\n            name without a number', 'Photographing a House says the name carries no number');
    has(g, 'so say the count (&ldquo;set of 8&rdquo;): the app uses it.', 'and to say the count');
    lacks(g, 'Flatware, 30 pieces', 'and no longer shows a name with a count in it');
  }

  group('G · the app\'s side is live code, on the one request path');
  {
    has(live(SRC.slice(SRC.indexOf('function _agShotPayload('), SRC.indexOf('function agentListedOff('))), 'listed: agentListedOff(jobId, group.srcId, group.rows)', 'the payload builds it');
    has(live(gsFn('_agUserContent')), 'txt += _agListedText(shot.listed);', 'and the backend reads it into the request');
  }
};
