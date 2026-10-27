'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// ONE PHOTOGRAPH NAMED TWICE, AND THE NOTES THAT WERE NOT WORTH A PERSON'S TIME (2026-10-25).
//
// Anthony, off the Ellison kitchen (*"Agent Two raised 23 things to look at … why agent two has flagged so many things
// about what agent one did … make sure they're more in sync so that literally every item is not an exception"*), picked
// *Fix both now*: the double count and the noise.
//
//   A photograph read twice by Agent One shows under Possible duplicates (agentNamedTwice): every line one answer writes
//   carries one agentAt and how many lines the request was told were listed (agentListed); two namings told nothing are
//   two readings of the whole photograph. A naming told what was listed is a reading of what was new.
//   Agent One still guesses, hedged, in a short name, and files everyday dishes as household goods; Agent Two confirms or
//   corrects the name as it values (Anthony: "agent 1 guess and agent 2 confirm or update upon pricing. No need to flag"),
//   written only over an unreviewed Agent One name (_avRename), the name it replaced kept in the record.
//   A mark nobody could read does not send a line to research (AGENT_VALUE_NO_MARK_RE).
//   Agent Two values the count as given, reads condition off the photograph, and raises a notice only for something to
//   do; "name" and "worthpoint" are no longer among its kinds.
//   The list above the rows is one entry per line, and the line's record lists every note it points to.
//   The backend is 2026-10-25 and the app relies on it; the pages say so.
// ─────────────────────────────────────────────────────────────────────────────

const vm = require('vm');
const fs = require('fs');
const path = require('path');
const { sandbox, matchBrace, fn } = require('./harness');

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
const text = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&middot;/g, '·').replace(/&mdash;/g, '—').replace(/\s+/g, ' ').trim();
const attempt = (f) => { try { return { val: f() }; } catch (e) { return { err: String(e && e.message || e) }; } };

// ─── The backend's two prompts, lifted ───
function gs() {
  const ctx = { JSON, Math, Number, String, Object, Array, Error, parseInt, parseFloat, isFinite };
  vm.createContext(ctx);
  vm.runInContext(['AGENT_VALUE_SOURCES', 'AGENT_VALUE_NOTICE_KINDS', 'AGENT_VALUE_MAX_COMPS', 'AGENT_VALUE_CONF_DOWN', 'AGENT_VALUE_RESULTS_SEGMENTS', 'AGENT_VALUE_RESULTS_PARAMS', 'AGENT_VALUE_NO_PRICE_RE', 'AGENT_VALUE_TEXT_MAX', 'AGENT_VALUE_ABBREV_RE'].map(gsVar)
    .concat(['_avCents', '_avUrlKey', '_avResultsPage', '_avClip', '_avLineResult'].map(gsFn)).join('\n'), ctx);
  return ctx;
}
function backend() {
  const ctx = { JSON, Math, Number, String, Object, Array, Error, parseInt, parseFloat, isFinite };
  vm.createContext(ctx);
  vm.runInContext(['AGENT_VALUE_SOURCES', 'AGENT_VALUE_NOTICE_KINDS', 'AGENT_COUNT_IN_NAME_RE'].map(gsVar)
    .concat(['_agSystem', '_avSystem', '_avTool', '_avLineText'].map(gsFn)).join('\n'), ctx);
  return ctx;
}

// ─── The real app side: the naming writer, the detector, Possible duplicates ───
const PHOTO = { roomIdx: 2, label: 'inventory', status: 'uploaded', ts: 1000, filename: 'HVL-0009_Kitchen_INV_5.jpg',
  driveFileId: 'FID_P', driveFileUrl: 'https://drive.google.com/file/d/FID_P/view' };
// The Ellison photograph as it came back: #73 and #81 from the first naming, #87 and #88 from a second one, minutes later.
const T1 = 1760000000000, T2 = T1 + 7 * 60 * 1000;
const L = (id, n, name, over) => Object.assign({ stableId: id, itemNo: n, objectName: name, category: 'Collectibles', namedBy: 'agent',
  agentConf: 'medium', updatedAt: 500 }, PHOTO, id === 'p' ? {} : { derivedFrom: 'p' }, over || {});
const ELLISON = () => [
  L('p', 73, 'Hand-painted tin-glazed earthenware dinner plates, yellow bird and blue flower', { agentAt: T1, qty: 8 }),
  L('s81', 81, 'Hand-painted tin-glazed earthenware salad plates, matching', { agentAt: T1 + 3, qty: 6 }),
  L('s87', 87, 'Hand-painted majolica dinner plates, yellow bird and blue flower design', { agentAt: T2, qty: 6 }),
  L('s88', 88, 'Hand-painted majolica salad or dessert plates, matching', { agentAt: T2 + 2, qty: 6 }),
];
function app(refs, over) {
  over = over || {};
  const removed = [], badges = [];
  let clock = over.clock || T1;
  // The clock moves a millisecond on every read, as a real one moves between writes, so one stamp per answer is measured.
  class D extends Date { static now() { return clock++; } }
  const ctx = sandbox({
    fns: ['agentListedOff', 'agentNameableRefs', 'agentShotGroups', '_agDetailRefs', '_agShotPayload', '_agContext', '_agWrite', '_invCondIsAgents', '_invAgentCondition',
      'agentApplyResult', '_agState', '_agSendNext', 'invSplitItemN', '_invSplitSource', '_getPhotoRef', '_setPhotoRef', '_jobInvRefs', '_invFileId', '_photoUid',
      '_invPhotoSource', '_invRoomName', 'agentNamedTwice', 'agentDuplicateGroups', '_agDupEligible', '_arDupEligible', '_agNameKey',
      '_agDupIndex', '_agDupHtml', '_agDupHandle', '_agDupUnhandle', 'agentDropDuplicate', 'agentNotDuplicate', '_invItemNo',
      'savePhotoRefs', 'collectionLineWithPhoto'],
    vars: ['_agRun', 'AGENT_CONDITIONS', 'AGENT_MAX_DETAILS', 'AGENT_LISTED_MAX', 'AGENT_BATCH', 'AGENT_PASS_GAP_MS', 'AGENT_ROOM_CONF_RANK', 'AGENT_ROOM_CONF_WORDS',
      'INV_TAXONOMY', 'INV_CATEGORIES', 'INV_DEFAULT_CATEGORY', 'INV_SPLIT_MAX', '_photoUidSeq'],
    stubs: Object.assign({
      Date: D,
      jobs: [{ id: 7, hvlId: 'HVL-0009', svc: 'cleanout' }], _photoRefs: { 7: refs },
      estimateStore: { 7: { estimate: { rooms: [{ idx: 2, name: 'Kitchen', note: '' }] } } },
      localStorage: { setItem() {}, getItem: () => null, removeItem() {} },
      _scheduleInventorySync() {}, _invTouch(r) { r.updatedAt = 999; return r; },
      mustFindItems: () => [], invFiduciaryMode: () => true, matterTypeOf: () => 'trust',
      esc: (x) => String(x == null ? '' : x), _invThumbHTML: () => '<i class="thumb"></i>',
      renderInventoryTab() {}, showSyncBadge: (m) => badges.push(m), window: { confirm: () => true },
      _invTombstoneLine(jobId, ref) { ref.deletedAt = 5; removed.push(ref.stableId); },
      _agRepaint() {}, _agFinish() {}, SHEETS_SYNC_URL: 'https://script.example/exec',
      _readAppsScriptJson: (x) => x,
    }, over.stubs || {}),
  });
  ctx.tick = (ms) => { clock += ms; };
  ctx.removed = removed; ctx.badges = badges;
  return ctx;
}
// A synchronous, already-settled promise, as the runner is synchronous.
function sp(v) { return { then(f) { const r = f ? f(v) : v; return (r && r.then) ? r : sp(r); }, catch() { return this; } }; }

module.exports = function ({ group, ok, eq, has, lacks }) {

  group('A · ⚠⚠ one answer, one stamp: every line it writes carries one agentAt, and how many lines the request was told were listed');
  {
    const A = app([Object.assign(L('p', 73, '', { namedBy: '' }), { agentConf: undefined, agentAt: undefined })], { clock: T1 });
    const g = A.agentShotGroups(7)[0];
    A.agentApplyResult(7, g, { notices: [], objects: [
      { name: 'Hand-painted plates, yellow bird and blue flower pattern, cobalt rim', category: 'General/Household', qty: 8, confidence: 'medium', basis: '', crop: [] },
      { name: 'Hand-painted side plates, same pattern', category: 'General/Household', qty: 6, confidence: 'medium', basis: '', crop: [] },
      { name: 'Hand-painted serving platter, same pattern', category: 'General/Household', qty: 1, confidence: 'medium', basis: '', crop: [] }] });
    const lines = A._jobInvRefs(7);
    eq(lines.length, 3, 'fixture: a first naming of three objects, two split off');
    eq(new Set(lines.map((r) => r.agentAt)).size, 1, '⚠⚠ the three lines share the one stamp of their answer, though the clock moved between writes');
    ok(lines[0].agentAt >= T1, 'fixture: the answer\'s time');
    eq(lines.map((r) => r.agentListed), [undefined, undefined, undefined], 'and a first naming was told nothing was listed');
    // A blank line added to the photograph (Another item in this photo) goes with the three listed; the request that
    // carried them stamps what it writes with that count. Driven through the real _agSendNext.
    A._photoRefs[7].push(Object.assign(L('b1', 90, ''), { namedBy: '', agentAt: undefined, agentConf: undefined }));
    A.tick(60000);
    let sent = null;
    A.fetch = (url, opt) => { sent = JSON.parse(opt.body); return sp({ ok: true, results: { p: { notices: [], objects: [
      { name: 'Hand-painted gravy boat, same pattern', category: 'General/Household', qty: 1, confidence: 'medium', basis: '', crop: [] }] } }, failed: {} }); };
    A._agSendNext(7, A.jobs[0], A.agentShotGroups(7), 0);
    eq(sent && sent.shots[0].listed.length, 3, 'fixture: the request carried the three listed lines');
    const b1 = A._getPhotoRef(7, 'b1');
    eq([b1.objectName, b1.agentListed], ['Hand-painted gravy boat, same pattern', 3], '⚠⚠ the new line records that its naming was told of three');
    ok(b1.agentAt > lines[0].agentAt + 59000, 'fixture: a later naming');
    eq(A._jobInvRefs(7).length, 4, 'and nothing else was added');
    eq(A.agentNamedTwice(A._jobInvRefs(7)), [], '⚠⚠ a naming told what was listed is not a second reading');
    // A blank row named again by a naming told nothing loses an earlier count.
    const B = app([Object.assign(L('p', 73, '', { namedBy: '' }), { agentListed: 2 })]);
    B.agentApplyResult(7, B.agentShotGroups(7)[0], { notices: [], objects: [{ name: 'Copper pans', category: 'General/Household', qty: 3, confidence: 'high', basis: '', crop: [] }] });
    eq(B._getPhotoRef(7, 'p').agentListed, undefined, 'a count from an earlier naming does not survive a naming told nothing');
    // The field is kept on a real save, and a collection's line filled by a photograph is named afresh.
    has(fn('savePhotoRefs'), 'agentListed:r.agentListed', 'agentListed is on the savePhotoRefs whitelist');
    let stored = null;
    const S = app([L('p', 73, 'Copper pans', { agentAt: T1, agentListed: 2 })], { stubs: { localStorage: { setItem: (k, v) => { stored = v; }, getItem: () => null, removeItem() {} } } });
    S.savePhotoRefs(7);
    eq(stored && JSON.parse(stored)[0].agentListed, 2, '⚠ driven: it survives the save (the whitelist has dropped a field three times)');
    has(fn('collectionLineWithPhoto'), "'agentConf', 'agentListed', 'agentName', 'agentBasis'", 'a collection\'s line filled by a photograph drops it with the other naming stamps');
  }

  group('B · agentNamedTwice: two namings told nothing are one photograph read twice; anything else is not');
  {
    const A = app(ELLISON());
    const t = A.agentNamedTwice(A._jobInvRefs(7));
    eq(t.map((x) => [x.srcId, x.rows.map((r) => r.itemNo)]), [['p', [73, 81, 87, 88]]], '⚠⚠ the Ellison photograph: four lines from two readings, in the order the desk draws them');
    eq(app(ELLISON().slice(0, 2)).agentNamedTwice(ELLISON().slice(0, 2)), [], 'one naming of two stacks is two things seen at once');
    const told = ELLISON(); told[2].agentListed = 2; told[3].agentListed = 2;
    eq(A.agentNamedTwice(told), [], 'a second naming told the two listed is a reading of what was new');
    // A line written before one stamp per answer: an answer writes its lines milliseconds apart, never seconds.
    const legacy = ELLISON().slice(0, 2).concat([L('s82', 82, 'Hand-painted platter', { agentAt: T1 + 900 })]);
    eq(A.agentNamedTwice(legacy), [], 'lines written within ' + A.AGENT_PASS_GAP_MS + ' ms of each other are one naming');
    // Two devices naming the same unnamed photograph at once: both told nothing, seconds apart.
    const race = ELLISON(); race[2].agentAt = T1 + 9000; race[3].agentAt = T1 + 9001;
    eq(A.agentNamedTwice(race).map((x) => x.rows.length), [4], 'two devices reading it seconds apart are two readings');
    // What a person settled stays settled.
    const sep = ELLISON().map((r) => Object.assign(r, { dupOK: 1 }));
    eq(A.agentNamedTwice(sep), [], 'Not duplicates pressed: quiet');
    const gone = ELLISON(); gone[2].deletedAt = 5; gone[3].deletedAt = 5;
    eq(A.agentNamedTwice(gone), [], 'the second reading\'s lines removed: quiet');
    const one = ELLISON(); one[2].deletedAt = 5;
    eq(A.agentNamedTwice(one).map((x) => x.rows.map((r) => r.itemNo)), [[73, 81, 88]], 'one of them removed: the other is still a second reading');
    const hand = ELLISON().slice(0, 2).concat([Object.assign(L('s90', 90, 'Gravy boat'), { namedBy: 'desk', agentAt: undefined })]);
    eq(A.agentNamedTwice(hand), [], 'a line a person named is no naming of Agent One\'s');
    const empty = ELLISON().slice(0, 2).concat([Object.assign(L('s91', 91, ''), { agentAt: T2, agentConf: 'none' })]);
    eq(A.agentNamedTwice(empty), [], 'an empty answer\'s stamp on a blank line is no reading');
    const other = ELLISON().slice(0, 2).concat([L('q', 95, 'Copper pans', { agentAt: T2, derivedFrom: undefined, driveFileId: 'FID_Q' })]);
    eq(A.agentNamedTwice(other), [], 'another photograph named later is another photograph');
  }

  group('C · ⚠⚠ Possible duplicates shows it, though every line is off one photograph; Remove and Not duplicates settle it');
  {
    const A = app(ELLISON());
    const groups = A.agentDuplicateGroups(7);
    eq(groups.map((g) => [g.twice, g.rows.map((r) => r.itemNo)]), [[true, [73, 81, 87, 88]]], '⚠⚠ one group, marked as a photograph named twice');
    eq(Object.keys(A._agDupIndex(7, A._jobInvRefs(7))).sort(), ['p', 's81', 's87', 's88'], 'each row carries the possible-duplicate chip');
    const h = text(A._agDupHtml(7, A._jobInvRefs(7)));
    has(h, 'One photograph named twice', 'the block says what it is');
    has(h, 'Agent One read it twice, so the later lines may repeat the earlier ones', 'and why the lines may be one thing');
    has(h, 'or Agent One read one photograph twice', 'the block\'s opening sentence names the third evidence');
    ['Hand-painted majolica dinner plates', 'Hand-painted majolica salad or dessert plates'].forEach((n) => has(h, n, 'each line under its own name: ' + n));
    eq((A._agDupHtml(7, A._jobInvRefs(7)).match(/agentDropDuplicate\(/g) || []).length, 4, 'a Remove on each line');
    // Remove the second reading's two lines: quiet.
    A.agentDropDuplicate(7, 's87');
    eq(A.agentDuplicateGroups(7).map((g) => g.rows.length), [3], 'one removed: the other is still flagged with the first reading');
    A.agentDropDuplicate(7, 's88');
    eq(A.removed, ['s87', 's88'], 'fixture: both went through the desk\'s removal writer');
    eq(A.agentDuplicateGroups(7), [], '⚠ both removed: nothing left to flag');
    // Not duplicates: quiet, and the lines say so.
    const N = app(ELLISON());
    const g = N.agentDuplicateGroups(7)[0];
    N.agentNotDuplicate(7, N._agDupHandle(g.key));
    eq(N._jobInvRefs(7).map((r) => r.dupOK), [1, 1, 1, 1], 'Not duplicates marks every line of the group');
    eq(N.agentDuplicateGroups(7), [], 'and the group goes quiet');
    // ⚠ The old rule stands: a matching pair split off one frame in one naming is never shown.
    const P = app([L('p', 1, 'Brass table lamp', { agentAt: T1 }), L('s2', 2, 'Brass table lamp', { agentAt: T1 + 1 })]);
    eq(P.agentDuplicateGroups(7), [], 'two matching lamps named off one photograph at once are two lamps');
  }

  group('D · Agent One: it still guesses, hedged (Anthony: "agent 1 guess"), in a short name, and everyday dishes as household goods');
  {
    const B = backend();
    const sys = B._agSystem({ categories: ['Collectibles', 'General/Household'], mustFind: [] });
    has(sys, 'hedge in the words themselves: "appears to be", "likely", "in the style', '⚠⚠ the hedged guess stays (Anthony, 2026-10-25: "agent 1 guess and agent 2 confirm or update")');
    has(sys, 'Keep a name to one short line, about fifteen words at most', 'a name is one short line');
    has(sys, 'A group line names the kind and what it holds in a few words, never every piece.', 'a group line does not list every piece');
    has(sys, 'Everyday dishes, glassware, cookware, kitchen tools and table linens are General/Household, however decorative or hand-painted, unless a maker\'s mark, signature or hallmark is readable on them.',
      '⚠⚠ everyday dishes are household goods, however decorative');
    has(sys, 'Collectibles is for things people collect as such', 'and Collectibles is for collectibles');
    has(B._agSystem({ categories: ['General/Household'], mustFind: [], fiduciary: true }), 'That is the reason for the hedging rule above', 'the estate paragraph names the rule it explains');
    const good = (sys.match(/Good: "[^"]+"/g) || []);
    ok(good.length >= 4, 'it offers its example names (' + good.length + ')');
    has(good.join(' '), 'Kitchen utensils: wooden spoons, spatulas, whisks, tongs', 'a group line\'s example names the kind, not every piece');
    eq(good.filter((e) => B.AGENT_COUNT_IN_NAME_RE.test(e)), [], 'and no example carries a count (2026-10-24\'s rule)');
  }

  group('E · Agent Two: confirms or corrects the name; the count as given; condition off the photograph; a notice only for something to do');
  {
    const B = backend();
    const sys = B._avSystem({ estate: true, basis: 'Fair Market Value', valuationDate: '2026-08-14' });
    has(sys, 'Your job is to confirm or correct that name, say what each line is WORTH', '⚠⚠ its job now includes the name');
    has(sys, 'Give every line\'s name back in name, as you value it: the same words where they are right, or the name your research and the photograph support', 'the name comes back with the value');
    has(sys, 'never put a count in it (how many is the Quantity), and hedge an attribution you are inferring rather than reading', 'under Agent One\'s naming rules');
    has(sys, 'Never write that a name was wrong: correct it, and a person checks it at the desk.', '⚠⚠ no flag for a name (Anthony: "No need to flag inconsistencies")');
    lacks(sys, 'kind "name"', 'no name notice kind in the prompt');
    lacks(sys, 'Never change what a line is called', 'the old bar on renaming is gone');
    has(sys, 'Never change a line\'s category or its quantity.', 'its category and quantity stay the line\'s');
    const vprops = B._avTool('comps').input_schema.properties.values.items;
    ok(vprops.required.indexOf('name') > -1 && vprops.properties.name && vprops.properties.name.type === 'string', '⚠ the strict tool asks for the name on every value');
    has(sys, 'Value the quantity on the line as given: a stack or a box hides what is under the top one, so never question the count from the photograph.', '⚠ the count is the line\'s');
    has(sys, 'Condition is usually not written on the line, because the crew photographs rather than writes.', 'condition is usually unwritten, and why');
    // 2026-10-26: wherever a photograph is sent (a research line, or an ordinary lot whose name is a guess), else ordinary.
    has(sys, 'Read it from the photograph wherever one is sent, assume ordinary used condition on a lot sent as text alone', 'read off the photograph, or ordinary');
    lacks(sys, 'Adjust for the condition recorded on the line.', 'the old sentence that read a blank as a gap is gone');
    has(sys, 'A notice is for something a person must DO about the line', 'a notice is for something to do (restated 2026-10-26b: it is asked short now)');
    has(sys, 'Most lines need none; never give a line more than one.', '⚠⚠ one notice at most, most lines none');
    has(sys, 'Never raise a notice about the name (correct it instead), because the condition is not recorded, because a count is approximate, because your search ran out or found no sold comparable, or to suggest a WorthPoint check',
      '⚠⚠ the notes the Ellison kitchen was full of are named and barred');
    lacks(sys, 'kind "worthpoint"', 'no WorthPoint notice kind in the prompt');
    const kinds = vprops.properties.notices.items.properties.kind.enum;
    eq(kinds.slice().sort(), ['appraiser', 'other', 'specialist'], '⚠ and the strict tool can send neither a name nor a WorthPoint notice');
    eq(B.AGENT_VALUE_NOTICE_KINDS.slice().sort(), ['appraiser', 'other', 'specialist'], 'the three kinds left');
    has(B._avLineText('L1', { name: 'Hand-painted plates', category: 'General/Household', qty: 8 }), '| Condition: not written down', 'a line with no condition reads as not written down');
    has(B._avLineText('L1', { name: 'Hand-painted plates', qty: 8, condition: 'Good' }), '| Condition: Good', 'a recorded condition as recorded');
  }

  group('E2 · ⚠⚠ the corrected name is written over an unreviewed Agent One name, never a person\'s; the record keeps the old one');
  {
    const R = (over) => Object.assign({ stableId: 's1', label: 'inventory', roomIdx: 2, category: 'Collectibles', qty: 6, driveFileId: 'FID', ts: 1,
      objectName: 'Hand-painted majolica dinner plates, likely Italian', namedBy: 'agent' }, over || {});
    const RESV = (over) => Object.assign({ fmv: 75, low: 40, high: 120, confidence: 'low', source: 'Online comps', basis: 'No sold comparable',
      comps: [], lookup: 'Spanish bird plate', notices: [], mode: 'comps', name: 'Hand-painted tin-glazed plates, yellow bird pattern, likely Spanish' }, over || {});
    const W = (refs) => sandbox({ fns: ['_avWrite', 'agentValueWhole', 'invLineQty', '_avRename', '_agNameKey', '_avHasFigure', '_invHasValue', 'agentValueInternal', '_avValDate', '_avComp',
      'agentValueStale', '_getPhotoRef', '_setPhotoRef', 'roundCents', 'estateValueDate', '_avdDate', '_ymdLocal', '_todayStr', '_avNameIsAgents', '_invCondIsAgents', '_invAgentCondition'],
      vars: ['AGENT_CONDITIONS', 'AGENT_VALUE_MAX_COMPS', 'AGENT_VALUE_CONFS', 'AGENT_VALUE_SOURCES', 'AGENT_VALUE_SALE_DATE_RE'],
      stubs: { _photoRefs: { 7: refs }, _invTouch: (r) => r, invFiduciaryMode: () => true, docTierProduces: () => true } });
    const job = { id: 7, svc: 'cleanout', docTier: 'values', deathDate: '2026-08-14' };
    let A = W([R()]);
    ok(A._avWrite(7, 's1', RESV(), job, {}), 'fixture: valued');
    let r = A._getPhotoRef(7, 's1');
    eq(r.objectName, 'Hand-painted tin-glazed plates, yellow bird pattern, likely Spanish', '⚠⚠ the name Agent Two values under replaces Agent One\'s');
    eq(r.valNameFrom, 'Hand-painted majolica dinner plates, likely Italian', 'Agent One\'s is kept on the line');
    eq([r.valNameAt, A.agentValueStale(r)], ['Hand-painted tin-glazed plates, yellow bird pattern, likely Spanish', false], 'the figure is for the new name: not stale');
    eq([r.namedBy, r.reviewed, r.category, r.qty], ['agent', undefined, 'Collectibles', 6], 'still unreviewed for the desk; category and count untouched');
    // A Re-value under yet another name keeps the first (Agent One's) as the one replaced.
    A._avWrite(7, 's1', RESV({ name: 'Hand-painted Spanish plates, Puente del Arzobispo type' }), job, { revalue: true });
    eq([A._getPhotoRef(7, 's1').objectName, A._getPhotoRef(7, 's1').valNameFrom], ['Hand-painted Spanish plates, Puente del Arzobispo type', 'Hand-painted majolica dinner plates, likely Italian'], 'a Re-value renames again, Agent One\'s name still the one on record');
    // Never a person's name.
    A = W([R({ namedBy: 'desk', objectName: 'Dinner plates, Spanish' })]);
    A._avWrite(7, 's1', RESV(), job, {});
    eq([A._getPhotoRef(7, 's1').objectName, A._getPhotoRef(7, 's1').valNameFrom], ['Dinner plates, Spanish', undefined], '⚠⚠ a name the desk typed stands');
    A = W([R({ reviewed: true })]);
    A._avWrite(7, 's1', RESV(), job, {});
    eq(A._getPhotoRef(7, 's1').objectName, 'Hand-painted majolica dinner plates, likely Italian', '⚠⚠ an Agent One name a person reviewed stands');
    A = W([R()]);
    A._avWrite(7, 's1', RESV({ name: '  hand-painted majolica dinner plates, LIKELY ITALIAN. ' }), job, {});
    eq([A._getPhotoRef(7, 's1').objectName, A._getPhotoRef(7, 's1').valNameFrom], ['Hand-painted majolica dinner plates, likely Italian', undefined], 'the same name, however spaced or cased, changes nothing');
    A = W([R()]);
    A._avWrite(7, 's1', RESV({ name: '' }), job, {});
    eq(A._getPhotoRef(7, 's1').objectName, 'Hand-painted majolica dinner plates, likely Italian', 'no name in the answer (an older deployment): the name stands');
    A = W([R()]);
    eq(A._avWrite(7, 's1', RESV({ fmv: '' }), job, {}), false, 'fixture: an answer with no figure writes nothing');
    eq(A._getPhotoRef(7, 's1').objectName, 'Hand-painted majolica dinner plates, likely Italian', '⚠ and renames nothing: the name rides the figure');
    // The replaced name survives a real save (the whitelist has dropped a field three times).
    let kept = null;
    const SV = sandbox({ fns: ['savePhotoRefs', '_setPhotoRef', '_getPhotoRef'], stubs: { _photoRefs: { 7: [R({ valNameFrom: 'Agent One\'s name' })] },
      localStorage: { setItem: (k, v) => { kept = v; }, getItem: () => null, removeItem() {} } } });
    SV.savePhotoRefs(7);
    eq(kept && JSON.parse(kept)[0].valNameFrom, 'Agent One\'s name', '⚠ valNameFrom survives the save');
    // The record says what it replaced, quietly; the list above the rows says nothing of it.
    const V = sandbox({ fns: ['_avPanelHtml', '_avNoticeLabel', '_avNoticeKinds', 'agentValueUnreviewed', 'agentValueStale', '_avHasFigure', '_invHasValue', 'agentValueInternal', '_agNameKey',
      'agentValueNotices', '_avNoticesHtml', 'agentValueSpecialistWorth', '_deskShowBtnHtml', '_invNamed', '_invItemNo', 'agentValueAgain', '_avState'], vars: ['_avRun', '_avAfter', '_avForceComps'],
      stubs: { esc: (x) => String(x == null ? '' : x), fmt: (x) => '$' + x, _invMoney: (x) => '$' + x, invFiduciaryMode: () => true, docTierProduces: () => true, invNeedsAppraisal: () => false } });
    const renamed = R({ objectName: 'Hand-painted tin-glazed plates, yellow bird pattern, likely Spanish', valNameFrom: 'Hand-painted majolica dinner plates, likely Italian',
      valuedBy: 'agent', fmv: 75, valLow: 40, valHigh: 120, valConf: 'low', valNameAt: 'Hand-painted tin-glazed plates, yellow bird pattern, likely Spanish', valNotices: [] });
    has(text(V._avPanelHtml(job, renamed)), 'Name updated from “Hand-painted majolica dinner plates, likely Italian”', 'the record names the name it replaced');
    lacks(V._avPanelHtml(job, R({ valuedBy: 'agent', fmv: 75, valLow: 40, valHigh: 120, valNameAt: R().objectName })), 'Name updated', 'and says nothing where nothing was renamed');
    eq(V._avNoticesHtml(job, [renamed]), '', '⚠⚠ no entry above the rows for a renamed line (no flag)');
    // The backend hands the name through, trimmed.
    const g = gs();
    const res = g._avLineResult({ value: 75, low: 40, high: 120, confidence: 'low', source: 'Online comps', basis: 'b', comps: [], lookup: '', notices: [],
      name: '  Hand-painted   Spanish plates  ' }, 'general', {});
    eq(res.name, 'Hand-painted Spanish plates', 'the backend passes the name through, its spacing tidied');
  }

  group('F · ⚠ a mark nobody could read does not send a line to research');
  {
    const V = sandbox({ fns: ['agentValueMode', 'invIsIntrinsic', 'invCatMeta', '_avNameIsAgents'], vars: ['AGENT_VALUE_MARK_RE', 'AGENT_VALUE_NO_MARK_RE', 'AGENT_VALUE_READ_RE', 'INV_TAXONOMY'],
      stubs: { _avForceComps: {} } });
    const mode = (basis, cat) => V.agentValueMode({ stableId: 'x', category: cat || 'General/Household', agentBasis: basis });
    eq(mode('illegible painted script mark on underside'), 'general', '⚠⚠ the Ellison plates\' basis: an everyday lot');
    eq(mode('no visible maker\'s mark'), 'general', 'no mark seen');
    eq(mode('the mark is illegible'), 'general', 'a mark that is illegible');
    eq(mode('blurred backstamp on the base'), 'general', 'a blurred backstamp');
    eq(mode('Herend backstamp legible on the base'), 'comps', 'a backstamp read is still research');
    eq(mode('signed lower right'), 'comps', 'so is a signature');
    eq(mode('no mark, but signed on the base'), 'comps', 'a signature beside a missing mark is still read');
    eq(mode('illegible mark', 'Collectibles'), 'comps', 'and an intrinsic category is research whatever the mark');
  }

  group('G · the list above the rows: one entry per line; the rest in each line\'s record, which lists every note');
  {
    const ROWV = (id, n, notices, over) => Object.assign({ stableId: id, itemNo: n, label: 'inventory', roomIdx: 2, objectName: 'Line ' + n, category: 'General/Household',
      fmv: 50, valLow: 25, valHigh: 90, valConf: 'low', valSource: 'Online comps', valuedBy: 'agent', valNameAt: 'Line ' + n, valNotices: notices }, over || {});
    const V = sandbox({ fns: ['agentValueNotices', '_avNoticeKinds', '_avNoticeLabel', '_avNoticesHtml', '_deskShowBtnHtml', '_invNamed', '_invItemNo',
      'agentValueStale', 'agentValueUnreviewed', 'agentValueSpecialistWorth', '_avHasFigure', '_invHasValue', '_avPanelHtml', 'agentValueInternal', '_agNameKey', 'agentValueAgain', '_avState'], vars: ['_avRun', '_avAfter', '_avForceComps'],
      stubs: { esc: (x) => String(x == null ? '' : x), fmt: (x) => '$' + x, _invMoney: (x) => '$' + x, invFiduciaryMode: () => true, docTierProduces: () => true,
        invNeedsAppraisal: () => false } });
    const job = { id: 7, svc: 'cleanout' };
    const three = [{ kind: 'name', text: 'looks Spanish, not Italian' }, { kind: 'worthpoint', text: 'search ended early' }, { kind: 'other', text: 'count the plates' }];
    const rows = [ROWV('a', 81, three), ROWV('b', 87, [{ kind: 'appraiser', text: 'signed' }])];
    const html = V._avNoticesHtml(job, rows);
    const t = text(html);
    has(t, 'Agent Two noted 2 lines to look at', '⚠⚠ the heading counts lines, not notes');
    eq((html.match(/class="a-warn av-note-line"/g) || []).length, 2, '⚠⚠ one entry per line');
    eq((html.match(/deskShowLine\(7,'a'\)/g) || []).length, 1, 'one Show the item for a line with three notes');
    ['Name may be wrong · looks Spanish, not Italian', 'Check WorthPoint · search ended early', 'Look at this · count the plates', 'Appraisal advised · signed'].forEach((w) => has(t, w, 'each note under its line: ' + w));
    ok(t.indexOf('#87') > t.indexOf('#81') ? t.indexOf('#81') < t.indexOf('#87') : true, 'fixture: the lines in the list\'s order');
    lacks(html, 'raised', 'no count of notes in the heading');
    // Twelve lines drawn; the rest named and sent to their records.
    const many = Array.from({ length: 13 }, (x, i) => ROWV('m' + i, 100 + i, [{ kind: 'other', text: 'note ' + i }]));
    const hm = V._avNoticesHtml(job, many);
    eq((hm.match(/class="a-warn av-note-line"/g) || []).length, 12, 'twelve lines drawn');
    has(text(hm), '1 more line: each one’s notes are in its record, under Agent Two.', 'the thirteenth named, and where its notes are');
    // ⚠⚠ The record lists them, accepted or not: the sentence above points at something.
    const panel = text(V._avPanelHtml(job, ROWV('a', 81, three)));
    ['Name may be wrong · looks Spanish, not Italian', 'Check WorthPoint · search ended early', 'Look at this · count the plates'].forEach((w) => has(panel, w, 'the record lists it: ' + w));
    has(text(V._avPanelHtml(job, ROWV('a', 81, three, { valReviewed: true }))), 'Name may be wrong · looks Spanish, not Italian', 'and keeps it once the value is accepted');
    eq(V._avNoticesHtml(job, [ROWV('a', 81, three, { valReviewed: true })]), '', 'while the list above the rows goes quiet on an accepted value, as before');
    eq(V._avNoticeLabel('nonsense'), 'Look at this', 'a kind the desk does not know reads as Look at this');
  }

  // RESTATED 2026-10-25b (agents-together.test.js B4): a later deployment carries this one, and the banner names 25b's gap
  // first and this one after it, by its vintage.
  group('H · the deployment: 2026-10-25 or later, the app relies on it, and the banner names what an older one gets wrong');
  {
    ok(/var BACKEND_VERSION = '([^']+)'/.exec(GS)[1] >= '2026-10-25', 'main-sync.gs is 2026-10-25 or later');
    ok(/var BACKEND_MIN_VERSION = '([^']+)'/.exec(SRC)[1] >= '2026-10-25', 'and the app relies on it');
    const C = sandbox({ vars: ['BACKEND_FEATURE_COST'] });
    ok(C.BACKEND_FEATURE_COST.version.indexOf('on a deployment older than 2026-10-25, Agent Two flags a name it disagrees with (\u201cName may be wrong\u201d) instead of correcting it') > 0, 'the banner names this gap, by consequence and by its vintage');
    has(C.BACKEND_FEATURE_COST.version, 'puts a note on nearly every item it values', 'the notes');
    has(C.BACKEND_FEATURE_COST.version, 'Agent One files everyday dishes as collectibles', 'and Agent One\'s category');
    has(C.BACKEND_FEATURE_COST.version, 'on a deployment older than 2026-10-24, a blank line added to a photograph already named', 'and 2026-10-24\'s gap after it, by its vintage');
  }

  group('I · the pages say it: the manual and the playbook in both copies, and the specs');
  {
    const title = 'One photograph named twice, and fewer notes from the agents (2026-10-25';
    has(read('manual.html'), title, 'the manual');
    has(read('MANUAL.md'), title, 'its markdown copy');
    const pb = 'One photograph named twice (new 2026-10-25)';
    has(read('concierge-guide.html'), pb, 'the playbook');
    has(read('CONCIERGE_GUIDE.md'), pb, 'its markdown copy');
    has(read('AGENT_ONE_SPEC.md'), 'Everyday dishes are household goods (2026-10-25)', 'Agent One\'s spec');
    has(read('AGENT_TWO_SPEC.md'), 'Agent Two confirms or corrects the name (2026-10-25)', 'Agent Two\'s spec');
  }

  group('J · live code on the one path');
  {
    const apply = live(fn('agentApplyResult'));
    eq((apply.match(/_agWrite\([^)]*, pass\)/g) || []).length, 2, '⚠ both writes in an answer take its one pass: the blank rows and the split');
    has(apply, 'var pass = { at: Date.now(), listed: group.listedN || 0 };', 'the pass is the answer\'s time and what it was told');
    has(live(fn('_agSendNext')), 'g.listedN = (payload.listed || []).length;', 'what it was told is read off the payload it sent');
    has(live(fn('agentDuplicateGroups')), 'agentNamedTwice(rows).forEach(', 'Possible duplicates reads the detector');
    has(live(fn('agentValueMode')), ".replace(AGENT_VALUE_NO_MARK_RE, ' ')", 'the mode strikes an unread mark before it tests');
    has(live(fn('agentValueNotices')), 'var order = _avNoticeKinds();', 'the list reads the one catalogue of words');
    has(live(fn('agentValueRun')), 'A name Agent One gave that nobody has reviewed may come back corrected, and a name you typed or reviewed is valued as named.', 'Value N lines\' confirm says a name may come back corrected (and, since 2026-10-25b, that a person\'s name is valued as named)');
    has(live(fn('agentValueRun')), 'Nothing else on the line changes.', '…and that nothing else changes');
    const w = live(fn('_avWrite'));
    eq((w.match(/_avRename\(ref, res\.name\)/g) || []).length, 1, '⚠ the one writer renames through _avRename, once');
    ok(w.indexOf('_avRename(ref, res.name)') > w.indexOf('if (isNaN(fmv)) return false;'), 'after the figure is known to be written');
    ok(w.indexOf('_avRename(ref, res.name)') < w.indexOf('ref.valNameAt = String(ref.objectName'), 'and before the name it valued is recorded');
  }
};
