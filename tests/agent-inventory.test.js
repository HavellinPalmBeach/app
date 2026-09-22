'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// AGENT ONE — NAMING THE SHOTS (2026-09-22). Spec: AGENT_ONE_SPEC.md.
//
// Anthony, on what the field is for: *"the whole point is that we don't take the time to name
// objects in the field. we just capture per room and the agent names."*
//
// `_captureShot` has written `objectName:''` with the comment "the desk names it" since the
// 2026-09-19 rebuild. This is the thing that does the desk's half of it, and the FIELD IS
// UNCHANGED — a test below pins that this build adds no naming step to capture.
//
// The three decisions Anthony made on 2026-09-22, each pinned here:
//   1. WRITES DIRECTLY, FLAGS UNCHECKED. Not a proposal queue. `reviewed` stays false and the
//      existing IN PROGRESS stamp is the whole gate.
//   2. AS DETAILED AS THE FRAME SUPPORTS. Overruling a more conservative first draft — the
//      B&O speakers and the "likely a reproduction" Banksy were both right and both useful.
//      ⚠ That makes the DETAIL SHOT a build requirement: the crew already flips the china over
//      to photograph the maker's mark, and those frames must reach the model grouped with
//      their parent or the one photograph that proves the attribution is the one it never sees.
//   3. LOW CONFIDENCE IS NAMED, MARKED AND PAINTED AMBER. A blank is indistinguishable from a
//      row the agent never reached.
//
// ⚠⚠ THE LOAD-BEARING NET IS §1 OF THE SPEC: the agent writes objectName, category and qty and
// NOTHING ELSE. Values are Agent Two's and are barred outright at the `contents` tier by the
// signed agreement; disposition stays Undecided by design; flagNFA is a gate with no override.
// ─────────────────────────────────────────────────────────────────────────────

const vm = require('vm');
const fs = require('fs');
const path = require('path');
const { sandbox, source, fn, matchBrace } = require('./harness');

const liveLines = (s) => String(s).split('\n')
  .filter((l) => { const t = l.trim(); return !(t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')); })
  .join('\n');

// ─── DRIVING THE REAL BACKEND ────────────────────────────────────────────────
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

// A vm holding the real Agent One backend over stubbed Apps Script globals. `fetchAll` is the
// seam: every call goes through it, so replacing it drives the real request building and the
// real response reading with no network and no key.
function gsCtx({ props = { ANTHROPIC_API_KEY: 'sk-ant-test' }, reply = null, files = null, now = null } = {}) {
  const sent = [];
  let t = 1000;
  const blobFor = (id) => {
    const f = (files || {})[id];
    if (!f) throw new Error('File not found: ' + id);
    return { getContentType: () => f.type, getBytes: () => f.bytes };
  };
  const ctx = {
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null) }) },
    Logger: { log() {} },
    DriveApp: { getFileById: (id) => ({ getBlob: () => blobFor(id) }) },
    Utilities: { base64Encode: (b) => 'B64(' + b.length + ')' },
    UrlFetchApp: {
      fetchAll: (reqs) => {
        sent.push(reqs);
        t += 1000;
        return reqs.map((r, i) => {
          const res = reply ? reply(JSON.parse(r.payload), i, sent) : { code: 200, body: TOOL_OK() };
          return { getResponseCode: () => res.code, getContentText: () => JSON.stringify(res.body) };
        });
      },
    },
    Date: now ? function () { return { getTime: () => (t += now) }; } : function () { return { getTime: () => t }; },
    JSON, Math, Number, String, Object, Array, Error, encodeURIComponent,
  };
  ctx.Date.now = () => t;
  vm.createContext(ctx);
  vm.runInContext([
    gsVar('AGENT_API'), gsVar('AGENT_API_VERSION'), gsVar('AGENT_MODEL'), gsVar('AGENT_EFFORT'),
    gsVar('AGENT_MAX_TOKENS'), gsVar('AGENT_PARALLEL'), gsVar('AGENT_MAX_SHOTS'),
    gsVar('AGENT_TIME_BUDGET'), gsVar('AGENT_MAX_IMG'),
    gsFn('_agProp'), gsFn('_agMissingProps'), gsFn('_agImageBlock'), gsFn('_agTool'),
    gsFn('_agSystem'), gsFn('_agUserContent'), gsFn('_agRequestFor'), gsFn('_agReadResult'),
    gsFn('agentIdentifyShots'),
  ].join('\n'), ctx);
  ctx.sent = sent;
  return ctx;
}

const CATS = ['Art & Décor', 'Antiques', 'Furniture', 'General/Household', 'Firearms',
              'Electronics & Appliances', 'Jewelry & Watches'];
const TOOL_OK = (objects, notices) => ({
  stop_reason: 'tool_use',
  content: [
    { type: 'thinking', thinking: '' },
    { type: 'tool_use', name: 'record_contents', input: {
        objects: objects || [{ name: 'Rolled-arm sofa', category: 'Furniture', qty: 1,
                               confidence: 'high', basis: 'clearly visible', crop: [0, 0, 1, 1] }],
        notices: notices || [] } },
  ],
});
const FILES = { FID: { type: 'image/jpeg', bytes: [1, 2, 3] }, DET: { type: 'image/jpeg', bytes: [4, 5] } };
const SHOT = (over) => Object.assign({ stableId: 's1', fileId: 'FID', room: 'Kitchen' }, over || {});
const CTXP = { categories: CATS, mustFind: [], fiduciary: true };

// ─── DRIVING THE REAL APP SIDE ───────────────────────────────────────────────
const ROW = (over) => Object.assign({
  stableId: 's1', roomIdx: 4, label: 'inventory', seq: 1, status: 'uploaded', ts: 1000,
  filename: 'HVL-0007_Kitchen_INV_1.jpg', driveFileUrl: 'https://drive.google.com/file/d/FID/view',
  driveFileId: 'FID', objectName: '', category: 'General/Household', disposition: '',
}, over || {});

function rig(refs, over) {
  over = over || {};
  const saved = [], synced = [];
  const ctx = sandbox({
    fns: ['agentNameableRefs', 'agentShotGroups', '_agDetailRefs', '_agShotPayload', '_agContext',
          '_agWrite', 'agentApplyResult', '_agState', 'agentNotices', '_agStateHtml',
          'invSplitItemN', 'invSplitItem', '_getPhotoRef', '_setPhotoRef', '_jobInvRefs',
          '_invFileId', '_photoUid', '_invPhotoSource', '_invRoomName', '_invDerivedRefs'],
    vars: ['_agRun', 'AGENT_NOTICE_KINDS', 'AGENT_BATCH', 'AGENT_MAX_DETAILS',
           'INV_TAXONOMY', 'INV_CATEGORIES', 'INV_DEFAULT_CATEGORY', 'INV_SPLIT_MAX', '_photoUidSeq'],
    stubs: Object.assign({
      jobs: [{ id: 7, hvlId: 'HVL-0007', svc: 'cleanout' }],
      _photoRefs: { 7: refs || [] },
      estimateStore: { 7: { estimate: { rooms: [{ idx: 4, name: 'Kitchen', note: 'china in the hutch' }] } } },
      savePhotoRefs: (j) => saved.push(j),
      _invTouch(r) { r.updatedAt = 1; return r; },
      _scheduleInventorySync: (j) => synced.push(j),
      renderInventoryTab() {},
      mustFindItems: () => [{ key: 'k1', text: 'a coin collection', found: null },
                            { key: 'k2', text: 'dad’s watch', found: { at: '2026-09-20' } }],
      invFiduciaryMode: () => true,
      matterTypeOf: () => 'probate',
      esc: (x) => String(x == null ? '' : x),
      document: { getElementById: () => null },
    }, over.stubs || {}),
  });
  return { ctx, saved, synced };
}

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();

  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠⚠ THE AGENT WRITES THREE FIELDS AND NOTHING ELSE');
  {
    const { ctx } = rig([ROW()]);
    ctx._agWrite(7, 's1', { name: 'B&O Beolab 8000 speakers, pair', category: 'Electronics & Appliances',
                            qty: 2, confidence: 'high', basis: 'badge legible', crop: [0, 0, .5, .5] });
    const r = ctx._getPhotoRef(7, 's1');
    eq(r.objectName, 'B&O Beolab 8000 speakers, pair', 'it writes the name');
    eq(r.category, 'Electronics & Appliances', 'it writes the category');
    eq(r.qty, 2, 'it writes the quantity on a lot');
    eq(r.namedBy, 'agent', 'and stamps who named it');
    eq(r.agentConf, 'high', 'and how sure it was');

    // ⚠⚠ THE LOAD-BEARING NET. Not today's key list — the RULE. Values are Agent Two's and the
    // `contents` tier promises "no opinion of value" on a signed agreement; disposition stays
    // Undecided by design; flagNFA is a legal gate with no override; needsAppr is derived from
    // the category and a second writer is the drift this codebase keeps paying for.
    const body = liveLines(fn('_agWrite'));
    ['fmv', 'valDate', 'valSource', 'valNote', 'disposition', 'flagNFA', 'flagBequest',
     'flagDisputed', 'flagExempt', 'assetTrack', 'needsAppr', 'authBy', 'approvalDate',
     'channel', 'gross', 'fees', 'receiptDoc', 'itemNo'].forEach((k) => {
      lacks(body, k, 'the one writer never touches ' + k);
    });

    // And the row itself must come back clean, whatever the model sent.
    const { ctx: c2 } = rig([ROW()]);
    c2._agWrite(7, 's1', { name: 'x', category: 'Furniture', qty: 1, confidence: 'low', basis: '',
                           crop: [0, 0, 1, 1], fmv: 90000, disposition: 'Auction', flagNFA: 1 });
    const r2 = c2._getPhotoRef(7, 's1');
    eq(r2.fmv, undefined, 'a value in the response reaches the manifest nowhere');
    eq(r2.disposition, '', 'and neither does a disposition');
    eq(r2.flagNFA, undefined, 'and neither does an NFA flag');
  }

  group('⚠ REVIEWED STAYS FALSE — THAT IS THE WHOLE GATE');
  {
    const { ctx } = rig([ROW()]);
    ctx._agWrite(7, 's1', { name: 'Sofa', category: 'Furniture', qty: 1, confidence: 'high', basis: '', crop: [] });
    eq(!!ctx._getPhotoRef(7, 's1').reviewed, false, 'the agent never marks a row reviewed');
    lacks(liveLines(fn('_agWrite')), 'reviewed =', 'and does not write the field at all');
    // Review gates nothing and locks nothing — the 2026-09-01 rule, unchanged by this build.
    lacks(liveLines(fn('agentApplyResult')), 'reviewed', 'nor does the applier');
  }

  group('⚠ QTY 1 IS THE DEFAULT AND SAYS NOTHING');
  {
    const { ctx } = rig([ROW()]);
    ctx._agWrite(7, 's1', { name: 'Sofa', category: 'Furniture', qty: 1, confidence: 'high', basis: '', crop: [] });
    eq(ctx._getPhotoRef(7, 's1').qty, undefined, 'a single article does not write a quantity');
  }

  group('⚠ AN UNRECOGNISED CATEGORY FILES IN THE DEFAULT RATHER THAN LOSING THE NAME');
  {
    const { ctx } = rig([ROW()]);
    ctx._agWrite(7, 's1', { name: 'Sedan chair', category: 'Palanquins', qty: 1, confidence: 'low', basis: '', crop: [] });
    const r = ctx._getPhotoRef(7, 's1');
    eq(r.category, 'General/Household', 'an unknown category falls to the default');
    eq(r.objectName, 'Sedan chair', 'and the name survives it');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠⚠ ONE PHOTOGRAPH, N OBJECTS — IT SPLITS AND NAMES');
  {
    const { ctx, saved } = rig([ROW()]);
    ctx.agentApplyResult(7, { srcId: 's1', rows: ['s1'] }, { objects: [
      { name: 'Bar console, walnut', category: 'Furniture', qty: 1, confidence: 'high', basis: '', crop: [] },
      { name: 'Banksy print, likely a reproduction', category: 'Art & Décor', qty: 1, confidence: 'medium', basis: 'recognisable image, edition not visible', crop: [] },
      { name: 'appears to be Bang & Olufsen, column speakers, pair', category: 'Electronics & Appliances', qty: 2, confidence: 'medium', basis: 'form only', crop: [] },
    ], notices: [] });

    const lines = ctx._jobInvRefs(7);
    eq(lines.length, 3, 'one frame became three lines');
    eq(lines.map((r) => r.objectName), [
      'Bar console, walnut',
      'Banksy print, likely a reproduction',
      'appears to be Bang & Olufsen, column speakers, pair',
    ], 'each carries its own name, in order');
    eq(lines.every((r) => r.driveFileId === 'FID'), true, 'and all three share the one photograph');
    eq(lines.filter((r) => r.derivedFrom === 's1').length, 2, 'the two extra rows are derived from it');
    eq(lines.every((r) => r.namedBy === 'agent'), true, 'all three are marked agent-named');
    eq(lines.every((r) => !r.reviewed), true, 'and none of them reviewed');
    ok(saved.length >= 1, 'and the manifest was written');
  }

  group('⚠ A FRAME SOMEBODY ALREADY SPLIT BY HAND IS NAMED, NOT RE-SPLIT');
  {
    const { ctx } = rig([ROW(), ROW({ stableId: 's1b', derivedFrom: 's1' })]);
    ctx.agentApplyResult(7, { srcId: 's1', rows: ['s1', 's1b'] }, { objects: [
      { name: 'Tea service', category: 'Silver & Precious Metal', qty: 1, confidence: 'high', basis: '', crop: [] },
      { name: 'Mahogany side table', category: 'Antiques', qty: 1, confidence: 'medium', basis: '', crop: [] },
    ], notices: [] });
    const lines = ctx._jobInvRefs(7);
    eq(lines.length, 2, 'two blank rows, two objects, still two lines');
    eq(lines.map((r) => r.objectName), ['Tea service', 'Mahogany side table'], 'both named');
  }

  group('⚠ FEWER OBJECTS THAN BLANK ROWS LEAVES THE SURPLUS ALONE');
  {
    const { ctx } = rig([ROW(), ROW({ stableId: 's1b', derivedFrom: 's1' })]);
    ctx.agentApplyResult(7, { srcId: 's1', rows: ['s1', 's1b'] }, { objects: [
      { name: 'Tea service', category: 'Silver & Precious Metal', qty: 1, confidence: 'high', basis: '', crop: [] },
    ], notices: [] });
    const lines = ctx._jobInvRefs(7);
    eq(lines.length, 2, 'nothing is removed');
    eq(lines[1].objectName, '', 'somebody split that frame for a reason the photograph may not show');
  }

  group('⚠⚠ "NOTHING IN FRAME" IS A REAL ANSWER AND IS NOT "NOT PROCESSED"');
  {
    const { ctx } = rig([ROW()]);
    ctx.agentApplyResult(7, { srcId: 's1', rows: ['s1'] }, { objects: [], notices: [] });
    const r = ctx._getPhotoRef(7, 's1');
    eq(r.objectName, '', 'naming an empty frame would be inventing an object, so it stays blank');
    ok(r.agentAt > 0, 'but it IS stamped, so the desk can tell a wall from a shot never reached');
    eq(r.agentConf, 'none', 'and says which');
    eq(ctx._agState(7).empty, 1, 'and it is counted separately from a failure');
  }

  group('⚠⚠ A MUST-FIND NOTICE IS PERSISTED ON THE ROW, NOT HELD IN THE SESSION');
  {
    const { ctx } = rig([ROW()]);
    ctx.agentApplyResult(7, { srcId: 's1', rows: ['s1'] }, {
      objects: [{ name: 'Writing desk', category: 'Antiques', qty: 1, confidence: 'high', basis: '', crop: [] }],
      notices: [{ kind: 'mustfind', text: 'A wall safe is visible behind the painting, left of frame.' }],
    });
    const r = ctx._getPhotoRef(7, 's1');
    eq(r.agentNotices.length, 1, 'the notice rides the row');
    // A must-find sighting is far too important to be lost on a reload.
    has(JSON.stringify(r.agentNotices), 'wall safe', 'and carries what was seen');

    const list = ctx.agentNotices(7, ctx._jobInvRefs(7));
    eq(list.length, 1, 'and the desk can read it back');
    eq(list[0].label, 'Must find', 'under the heading that matters');
  }

  group('⚠ THE NOTICES ARE ORDERED BY WHAT YOU MUST NOT SCROLL PAST');
  {
    const { ctx } = rig([ROW({ agentNotices: [{ kind: 'other', text: 'a' }] }),
                         ROW({ stableId: 's2', agentNotices: [{ kind: 'nfa', text: 'b' }] }),
                         ROW({ stableId: 's3', agentNotices: [{ kind: 'mustfind', text: 'c' }] })]);
    const list = ctx.agentNotices(7, ctx._jobInvRefs(7));
    eq(list.map((n) => n.kind), ['mustfind', 'nfa', 'other'], 'must-find, then NFA, then the rest');
    eq(list[0].cls, 'a-err', 'and the first two are the ones painted as errors');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠ WHAT WANTS NAMING, AND WHAT DOES NOT');
  {
    const { ctx } = rig([
      ROW(),                                                        // blank, has a file — yes
      ROW({ stableId: 'named', objectName: 'Sideboard' }),           // already named — no
      ROW({ stableId: 'gone', deletedAt: 1 }),                       // tombstoned — no
      ROW({ stableId: 'nofile', driveFileId: null, driveFileUrl: null }), // not in Drive — no
      ROW({ stableId: 'det', label: 'detail', groupId: 's1' }),      // a close-up — never a line
      ROW({ stableId: 'before', label: 'before' }),                  // as-found evidence — no
    ]);
    eq(ctx.agentNameableRefs(7).map((r) => r.stableId), ['s1'],
       'only blank inventory lines whose photograph actually reached Drive');
  }

  group('⚠⚠ ONE REQUEST PER PHOTOGRAPH, NOT PER ROW');
  {
    const { ctx } = rig([ROW(), ROW({ stableId: 's1b', derivedFrom: 's1' }),
                         ROW({ stableId: 's1c', derivedFrom: 's1' }),
                         ROW({ stableId: 's2', driveFileId: 'FID2' })]);
    const groups = ctx.agentShotGroups(7);
    eq(groups.length, 2, 'three blank rows off one frame is ONE group, not three');
    eq(groups[0].rows.length, 3, 'and it carries all three rows');
    eq(groups[0].srcId, 's1', 'keyed on the photograph');
    // Sending it once per row would analyse the same picture three times and get three
    // different opinions of how many objects are in it.
  }

  group('⚠⚠ THE DETAIL FRAMES RIDE WITH THEIR PARENT — THE MAKER’S MARK IS WHY THEY EXIST');
  {
    const { ctx } = rig([ROW(), ROW({ stableId: 'd1', label: 'detail', groupId: 's1', driveFileId: 'DET' })]);
    const dets = ctx._agDetailRefs(7, 's1');
    eq(dets.length, 1, 'the close-up is found by its groupId');

    const payload = ctx._agShotPayload(7, { srcId: 's1', rows: ['s1'] });
    eq(payload.details.length, 1, 'and rides in the SAME request as the object it belongs to');
    eq(payload.details[0].fileId, 'DET', 'as an extra image');
    eq(payload.room, 'Kitchen', 'with the room');
    eq(payload.roomNote, 'china in the hutch', 'and the walkthrough note');
    // ⚠ AND NEVER AS A SHOT OF ITS OWN. _jobInvRefs excludes label:'detail' by design; a detail
    // frame minting a line would put a photograph of a hallmark on the court inventory as a
    // separate asset.
    eq(ctx.agentShotGroups(7).length, 1, 'the close-up is not a group of its own');
  }

  group('⚠ THE CATEGORY LIST AND THE MUST-FIND LIST ARE SENT, NEVER HELD SERVER-SIDE');
  {
    const { ctx } = rig([ROW()]);
    const c = ctx._agContext({ id: 7 });
    eq(c.categories, ctx.INV_CATEGORIES, 'the real taxonomy rides the payload');
    ok(c.categories.length >= 13, 'all of it — saveInventory.gs once drifted to 6 against 13');
    eq(c.mustFind, ['a coin collection'], 'only what is still outstanding is worth looking for');
    eq(c.fiduciary, true, 'and whether this is a decedent estate');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠ A DESK EDIT TAKES OWNERSHIP OF THE ROW');
  {
    const editBody = liveLines(fn('_invEdit'));
    has(editBody, "ref.namedBy = 'desk'", 'correcting the name or the category stamps the desk');
    has(editBody, 'delete ref.agentConf', 'and clears the unchecked-guess badge');
    // ⚠ namedBy IS DELIBERATELY NOT STICKY. INV_STICKY_FIELDS is for records of things that
    // HAPPENED which a merge must never lose; a name is a judgement somebody revises, and a
    // desk correction has to be able to beat the agent's guess on the other device.
    const st = sandbox({ vars: ['INV_STICKY_FIELDS'] });
    eq(st.INV_STICKY_FIELDS.indexOf('namedBy'), -1, 'so a desk correction can win a merge');
    eq(st.INV_STICKY_FIELDS.indexOf('agentConf'), -1, 'and so can clearing the badge');
  }

  group('⚠⚠ THE NEW FIELDS SURVIVE A REAL SAVE — THE WHITELIST HAS BITTEN THREE TIMES');
  {
    const wl = fn('savePhotoRefs');
    ['namedBy', 'agentAt', 'agentConf', 'agentBasis', 'agentNotices', 'crop'].forEach((k) => {
      has(wl, k + ':r.' + k, k + ' is on the savePhotoRefs whitelist');
    });
    // Driven, not grepped: a key missing from that literal is dropped silently on every save.
    let stored = null;
    const ctx = sandbox({
      fns: ['savePhotoRefs', '_setPhotoRef', '_getPhotoRef'],
      stubs: {
        _photoRefs: { 7: [ROW({ namedBy: 'agent', agentAt: 5, agentConf: 'low', agentBasis: 'form only',
                                agentNotices: [{ kind: 'nfa', text: 'tube' }], crop: [0, 0, 1, 1] })] },
        localStorage: { setItem: (k, v) => { stored = v; }, getItem: () => null, removeItem() {} },
        alert() {}, _invReclaimSpace: () => ({ bytes: 0, jobs: [], thumbs: 0 }),
        showSyncBadge() {}, _savePendingPhotoData() {},
      },
    });
    ctx.savePhotoRefs(7);
    const back = JSON.parse(stored)[0];
    eq(back.namedBy, 'agent', 'namedBy round-trips');
    eq(back.agentConf, 'low', 'agentConf round-trips');
    eq(back.agentBasis, 'form only', 'agentBasis round-trips');
    eq(back.agentNotices.length, 1, 'the notices round-trip');
    eq(back.crop.length, 4, 'and so does the crop box');
  }

  group('⚠ THE ROW SAYS AN AGENT NAMED IT AND NOBODY HAS CHECKED IT');
  {
    const row = liveLines(fn('_renderInvRow'));
    has(row, "ref.namedBy === 'agent' && !ref.reviewed", 'the badge is on an unchecked agent guess');
    has(row, 'var(--bronze)', 'and it is bronze');
    // ⚠ NEVER RED. Red on this strip means "stop, do not touch" — a held firearm — and a
    // second red would cost the first one its meaning.
    const seg = row.slice(row.indexOf("ref.namedBy === 'agent'"), row.indexOf("ref.namedBy === 'agent'") + 600);
    lacks(seg, '#c0392b', 'a second red on this strip would cost the firearms badge its meaning');
  }

  group('⚠ THE FIELD IS UNCHANGED — IT STILL TYPES NOTHING');
  {
    const cap = liveLines(fn('_captureShot'));
    has(cap, "ref.objectName = ''", 'a field shot still lands blank');
    lacks(cap, 'agentIdentify', 'nothing fires from the camera');
    lacks(cap, 'agentNameShots', 'and no naming step was added to capture');
    // The whole point, in Anthony's words: "we just capture per room and the agent names."
    const run = liveLines(fn('agentNameShots'));
    has(run, 'confirm(', 'the run is a deliberate act at the desk, and it says what it will do');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // THE BACKEND
  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠ A MISSING KEY IS NAMED, AND NOTHING IS SENT');
  {
    const c = gsCtx({ props: {} });
    const out = c.agentIdentifyShots({ context: CTXP, shots: [SHOT()] });
    eq(out.ok, false, 'it refuses');
    has(out.error, 'ANTHROPIC_API_KEY', 'and names the property, never "not configured"');
    eq(c.sent.length, 0, 'and asks for nothing');
  }

  group('⚠⚠ NO CATEGORY LIST IS A REFUSAL, NEVER A GUESS');
  {
    const c = gsCtx();
    const out = c.agentIdentifyShots({ context: { categories: [] }, shots: [SHOT()] });
    eq(out.ok, false, 'it refuses rather than inventing a taxonomy');
    has(out.error, 'app bug', 'and says whose bug it is');
    eq(c.sent.length, 0, 'nothing is sent');
    // saveInventory.gs once held its own copy and drifted to 6 against 13, silently dropping
    // seven categories off the client's workbook. This end holds no copy at all.
    lacks(liveLines(gsFn('agentIdentifyShots')), 'Furniture', 'the backend names no category of its own');
    lacks(liveLines(gsFn('_agTool')), 'Furniture', 'and neither does the tool it builds');
  }

  group('⚠⚠ THE REQUEST — MODEL, THINKING, TOOL AND IMAGE');
  {
    const c = gsCtx({ files: FILES });
    c.agentIdentifyShots({ context: CTXP, shots: [SHOT()] });
    const body = JSON.parse(c.sent[0][0].payload);

    eq(body.model, 'claude-opus-5', 'it runs on Opus 5');
    eq(body.thinking.type, 'adaptive', 'with adaptive thinking');
    eq(body.output_config.effort, 'medium', 'at medium effort — identification is perception, not reasoning');
    ok(body.max_tokens > 0, 'and a token ceiling');

    // ⚠ strict WITH tool_choice auto PLUS an instruction, never a forced tool_choice: forced
    // tool use is removed on the newest models and this shape works on every one of them.
    eq(body.tool_choice.type, 'auto', 'the tool is not forced');
    eq(body.tools[0].strict, true, 'but the arguments are guaranteed to validate');
    eq(body.tools[0].input_schema.additionalProperties, false, 'which strict mode requires');
    eq(body.tools[0].input_schema.properties.objects.items.properties.category.enum, CATS,
       'and the category is an enum built from the list the APP sent');

    const img = body.messages[0].content[0];
    eq(img.type, 'image', 'the photograph goes in as an image block');
    eq(img.source.media_type, 'image/jpeg', 'with the media type Drive reported');
    has(c.sent[0][0].headers['x-api-key'], 'sk-ant', 'and the key is a header, never a query string');
    eq(body.system[0].cache_control.type, 'ephemeral', 'the system prompt is cached — it is identical all job');
  }

  group('⚠ THE PROMPT FORBIDS WHAT THE SCHEMA DOES NOT');
  {
    const c = gsCtx({ files: FILES });
    c.agentIdentifyShots({ context: CTXP, shots: [SHOT()] });
    const sys = JSON.parse(c.sent[0][0].payload).system[0].text;
    has(sys, 'Never state or estimate a value', 'no values — that is Agent Two, and the contract at the contents tier');
    has(sys, 'Never say what should happen', 'no dispositions — Undecided is the deliberate default');
    has(sys, 'hedge in the words', 'and it hedges when it is inferring rather than reading');
    has(sys, 'suppressor', 'it is told what an NFA item looks like, which is the recognition risk');
    has(sys, 'qty 30, not thirty entries', 'and told to lot ordinary household goods');
  }

  group('⚠ THE MUST-FIND LIST REACHES THE PROMPT ONLY WHEN THERE IS ONE');
  {
    const withList = gsCtx({ files: FILES });
    withList.agentIdentifyShots({ context: Object.assign({}, CTXP, { mustFind: ['a coin collection'] }), shots: [SHOT()] });
    has(JSON.parse(withList.sent[0][0].payload).system[0].text, 'a coin collection', 'it is named in the prompt');

    const without = gsCtx({ files: FILES });
    without.agentIdentifyShots({ context: CTXP, shots: [SHOT()] });
    lacks(JSON.parse(without.sent[0][0].payload).system[0].text, 'kind "mustfind"',
          'and the whole instruction is absent when the family asked for nothing');
  }

  group('⚠⚠ THE DETAIL FRAMES ARE EXTRA IMAGES IN ONE REQUEST, NOT REQUESTS OF THEIR OWN');
  {
    const c = gsCtx({ files: FILES });
    c.agentIdentifyShots({ context: CTXP, shots: [SHOT({ details: [{ fileId: 'DET' }] })] });
    eq(c.sent[0].length, 1, 'one photograph plus its close-up is ONE call');
    const content = JSON.parse(c.sent[0][0].payload).messages[0].content;
    eq(content.filter((b) => b.type === 'image').length, 2, 'carrying both images');
    has(content[content.length - 1].text, 'close-up', 'and telling the model what the second one is');
    has(content[content.length - 1].text, 'do NOT record', 'and not to record it as an object');
  }

  group('⚠ A HAPPY ANSWER COMES BACK KEYED BY THE SHOT');
  {
    const c = gsCtx({ files: FILES });
    const out = c.agentIdentifyShots({ context: CTXP, shots: [SHOT()] });
    eq(out.ok, true, 'it succeeds');
    eq(out.done, ['s1'], 'and says which shots are done');
    eq(out.results.s1.objects[0].name, 'Rolled-arm sofa', 'with the objects against the shot id');
    eq(out.remaining, 0, 'and nothing left');
  }

  group('⚠⚠ A PROSE ANSWER IS A FAILURE, NOT AN EMPTY ROOM');
  {
    const c = gsCtx({ files: FILES, reply: () => ({ code: 200, body: {
      stop_reason: 'end_turn', content: [{ type: 'text', text: 'I see a sofa and a lamp.' }] } }) });
    const out = c.agentIdentifyShots({ context: CTXP, shots: [SHOT()] });
    eq(out.done.length, 0, 'nothing is recorded');
    has(out.failed.s1, 'prose', 'and it says why');
    // ⚠ CONFLATING THESE WOULD SILENTLY MARK A FULL ROOM AS EMPTY. tool_choice is `auto`, so
    // the model CAN answer in prose; that is a failure to record, not a finding of nothing.
    eq(out.results.s1, undefined, 'it does not come back as a frame with nothing in it');
  }

  group('⚠ A REFUSAL, A CUT-OFF AND AN HTTP ERROR EACH NAME THEMSELVES');
  {
    const refusal = gsCtx({ files: FILES, reply: () => ({ code: 200, body: {
      stop_reason: 'refusal', stop_details: { type: 'refusal', category: 'privacy' }, content: [] } }) });
    const r1 = refusal.agentIdentifyShots({ context: CTXP, shots: [SHOT()] });
    has(r1.failed.s1, 'declined', 'a refusal is an HTTP 200 and is checked before reading content');
    has(r1.failed.s1, 'privacy', 'and carries the category');

    const cut = gsCtx({ files: FILES, reply: () => ({ code: 200, body: { stop_reason: 'max_tokens', content: [] } }) });
    has(cut.agentIdentifyShots({ context: CTXP, shots: [SHOT()] }).failed.s1, 'cut off', 'a truncated answer is not a result');

    const http = gsCtx({ files: FILES, reply: () => ({ code: 429, body: { error: { message: 'rate limited' } } }) });
    has(http.agentIdentifyShots({ context: CTXP, shots: [SHOT()] }).failed.s1, 'rate limited', 'and the server’s own words come through');
  }

  group('⚠ A FILE THAT HAS NOT LANDED IN DRIVE IS ORDINARY, NOT FATAL');
  {
    const c = gsCtx({ files: FILES });
    const out = c.agentIdentifyShots({ context: CTXP, shots: [SHOT(), SHOT({ stableId: 's2', fileId: 'MISSING' })] });
    eq(out.done, ['s1'], 'the good one still comes back');
    ok(!!out.failed.s2, 'and the missing one is reported rather than killing the batch');
  }

  group('⚠ A NON-IMAGE IS REFUSED BEFORE IT IS SENT');
  {
    const c = gsCtx({ files: { FID: { type: 'application/pdf', bytes: [1] } } });
    const out = c.agentIdentifyShots({ context: CTXP, shots: [SHOT()] });
    has(out.failed.s1, 'not an image', 'a PDF in the photo slot does not reach the API');
    eq(c.sent.length, 0, 'nothing was sent at all');
  }

  group('⚠⚠ IT STOPS ON ITS OWN CLOCK AND HANDS BACK WHAT IS LEFT');
  {
    // Apps Script's ceiling is six minutes. getDriveThumbnails already answers this way: stop
    // before the clock runs out, say how many are left, let the app ask again.
    const shots = [];
    for (let i = 0; i < 40; i++) shots.push(SHOT({ stableId: 's' + i }));
    const c = gsCtx({ files: FILES, now: 200000 });   // each batch burns 200s of a 240s budget
    const out = c.agentIdentifyShots({ context: CTXP, shots: shots });
    eq(out.ok, true, 'it still answers');
    ok(out.remaining > 0, 'and says how many it did not reach');
    ok(out.done.length < 40, 'having stopped short rather than failing the batch whole');
    ok(out.done.length > 0, 'but it did real work first');
  }

  group('⚠ AND IT CAPS ONE INVOCATION WHATEVER THE CALLER ASKS FOR');
  {
    const shots = [];
    for (let i = 0; i < 300; i++) shots.push(SHOT({ stableId: 's' + i }));
    const c = gsCtx({ files: FILES });
    const out = c.agentIdentifyShots({ context: CTXP, shots: shots });
    ok(out.done.length <= c.AGENT_MAX_SHOTS, 'never more than the cap in one call');
    ok(out.remaining > 0, 'and the rest is handed back');
  }

  group('⚠ IT GOES OUT IN PARALLEL, NOT ONE AT A TIME');
  {
    const shots = [];
    for (let i = 0; i < 8; i++) shots.push(SHOT({ stableId: 's' + i }));
    const c = gsCtx({ files: FILES });
    c.agentIdentifyShots({ context: CTXP, shots: shots });
    eq(c.sent.length, 1, 'eight photographs are one fetchAll, not eight fetches');
    eq(c.sent[0].length, 8, 'all eight in flight together');
    has(liveLines(gsFn('agentIdentifyShots')), 'fetchAll', 'through fetchAll');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠⚠ THE JOIN — REAL BACKEND ANSWER INTO THE REAL MANIFEST');
  {
    // A build that computes the right answer and writes it nowhere contains every string a
    // source check looks for. This hands what the backend really produced to the writer that
    // really runs and reads the manifest back.
    const be = gsCtx({ files: FILES, reply: () => ({ code: 200, body: TOOL_OK([
      { name: 'Bang & Olufsen Beolab 8000 speakers, pair', category: 'Electronics & Appliances',
        qty: 2, confidence: 'high', basis: 'badge legible in detail frame', crop: [0, 0, .5, 1] },
      { name: 'Banksy print, likely a reproduction', category: 'Art & Décor',
        qty: 1, confidence: 'medium', basis: 'image recognisable, edition not visible', crop: [.5, 0, 1, 1] },
    ], [{ kind: 'mustfind', text: 'A small safe sits under the console.' }]) }) });
    const answer = be.agentIdentifyShots({ context: CTXP, shots: [SHOT()] });
    eq(answer.ok, true, 'the backend answered');

    const { ctx, saved } = rig([ROW()]);
    ctx.agentApplyResult(7, { srcId: 's1', rows: ['s1'] }, answer.results.s1);

    const lines = ctx._jobInvRefs(7);
    eq(lines.length, 2, 'one photograph became two lines');
    eq(lines[0].objectName, 'Bang & Olufsen Beolab 8000 speakers, pair', 'the attribution survives the join');
    eq(lines[0].qty, 2, 'and so does the pair');
    eq(lines[0].category, 'Electronics & Appliances', 'filed correctly');
    eq(lines[1].objectName, 'Banksy print, likely a reproduction', 'and the hedge survives it verbatim');
    eq(lines[1].agentConf, 'medium', 'marked for what it is');
    eq(lines.every((r) => r.namedBy === 'agent' && !r.reviewed), true, 'both unchecked, waiting for a person');
    eq(lines.every((r) => r.fmv === undefined), true, 'and neither carries a value');
    eq(ctx._getPhotoRef(7, 's1').agentNotices[0].kind, 'mustfind', 'and the safe is on the record');
    ok(saved.length >= 1, 'written to the manifest');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠ THE DEPLOYMENT DECLARES ITSELF');
  {
    has(GS, "'agentIdentify'", 'the action is on BACKEND_ACTIONS');
    has(GS, "data.action === 'agentIdentify'", 'and is dispatched');
    has(src, "'agentIdentify'", 'and the app names it in BACKEND_NEEDS');
    has(src, 'agentIdentify:', 'with what breaks when the deployment predates it');
    // ⚠ testAgentIdentify TAKES NO ARGUMENTS. The Apps Script Run menu cannot pass any — the
    // same reason testEsignAuth and pruneQuoStale work the way they do.
    has(GS, 'function testAgentIdentify()', 'and there is an editor probe that takes none');
  }
};
