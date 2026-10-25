'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// THE AGENTS TOGETHER, ONE REVIEW, EACH × QTY (2026-10-24b).
//
// Anthony, off the Ellison kitchen (Agent One named Spanish pájaro plates "Italian majolica" and Agent Two, which researched
// them, could only say so in one of 23 notices): *"if agent 2 gets a better read of what the item is, why doesn't it change
// the name? … never have the number of items in the name"*; *"we are supposed to be making this easy, with one review. not a
// multi tiered review. let's have the agents working together to get the best view of what an item is and what it is worth"*;
// *"without my getting involved unless the confidence is very low or something"*. His answers: Agent Two runs by itself once
// Agent One has named the shots (*"Yes, run it by itself"*); the lines that come to him are *"Doubtful or $500+"*. And the
// wooden mirror that is Restoration Hardware: change the name and the line is valued again (*"maybe it's worth $1500 new, and
// then not $25 used, that's the point"*). And: *"the total value needs to be multiplied by the number in the group … both
// should be editable and the math should happen automatically"*.
//
//   B · the backend: `name` on the tool, the prompt's THE NAME, a person's name marked, no `name` notice, the version.
//   A · the app: the rename (_avWrite), the payload's nameChecked, the chain, a desk rename re-valued, the one rule
//       (deskLookReasons / invLineDone), the one look (the tick), the papers' words, the desk (chip, row, record, notices),
//       and Each × Qty = Total.
// ─────────────────────────────────────────────────────────────────────────────

const vm = require('vm');
const fs = require('fs');
const path = require('path');
const { sandbox, source, fn, matchBrace, domStub } = require('./harness');

const liveLines = (s) => String(s).split('\n')
  .filter((l) => { const t = l.trim(); return !(t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')); })
  .join('\n');

// ─── THE REAL BACKEND ────────────────────────────────────────────────────────
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
  const m = GS.match(new RegExp('(^|\\n)(var\\s+' + name + '\\s*=[\\s\\S]*?;)\\s*(?:\\/\\/[^\\n]*)?\\n'));
  if (!m) throw new Error('var not in .gs: ' + name);
  return m[2];
}
function gsCtx() {
  const ctx = { JSON, Math, Number, String, Object, Array, Error, parseFloat, isFinite };
  vm.createContext(ctx);
  vm.runInContext(['AGENT_VALUE_SOURCES', 'AGENT_VALUE_NOTICE_KINDS', 'AGENT_VALUE_CONF_DOWN', 'AGENT_VALUE_MAX_COMPS', 'AGENT_COUNT_IN_NAME_RE', 'BACKEND_VERSION'].map(gsVar)
    .concat(['_avCents', '_avTool', '_avSystem', '_avLineText', '_avLineResult', '_avUrlKey'].map(gsFn)).join('\n'), ctx);
  return ctx;
}

// ─── THE REAL APP SIDE ───────────────────────────────────────────────────────
const AV_FNS = ['agentValueMode', 'agentValueInternal', '_avHasFigure', 'agentValueableRefs', 'agentValueUnreviewed',
  'agentValueStale', 'agentValueSpecialistWorth', '_avValDate', '_avContext', '_avItemPayload', '_avComp', '_avWrite', '_avNameIsAgents',
  '_avNoteFailure', 'agentValueApply', '_avTakeValue', '_avStampReviewed', '_invStampBy', 'deviceUser', '_avStart',
  '_avSendNext', '_avFinish', '_avRepaint', '_avStateHtml', '_avState', 'agentValueAuto', 'agentValueAfterRename', 'agentValueUseSale',
  'agentValueNotices', '_avNoticesHtml', '_deskShowBtnHtml', '_avSummary', '_avRowBadges', '_avPanelHtml', '_avUnreviewedStamp',
  'deskLookReasons', 'invLineDone', 'deskNeedsLook', '_deskNameConf', '_deskAgentFigure', '_deskAwaitsAgents', 'invLineReviewed',
  '_invStampLineReviewed', '_invSetReviewed', '_invReviewStats', '_invProgressStamp', '_agDupIndex', 'agentDuplicateGroups', '_agDupEligible', '_arDupEligible',
  'invIsFirearm', 'invLineQty', 'invUnitValue', '_invQtyCarriesValue', '_invPaintFigures', '_invEachInput', '_invInputStyle', '_invCtrlMinW',
  'invValBasisWord', 'invAppraised', 'invLineAppraiser', '_invLinkedAppraiser', '_jobAppraisers', '_apprLabel', '_invHasAppraisal', '_invAppraisalDate',
  '_getPhotoRef', '_setPhotoRef', '_jobInvRefs', '_invHasValue', 'roundCents', 'invIsIntrinsic', 'invCatMeta',
  'invFiduciaryMode', 'isDecedentJob', 'docTierProduces', 'docTierOf', 'docTierDef', 'svcHasDocStep', 'estateValueDate',
  '_avdDate', '_ymdLocal', 'resolveValBasis', '_agNameKey', '_agDetailRefs', 'invLineCloseUps', '_invFileId', 'invAppraisalThreshold',
  'gateDispute', '_gateYes', 'invNeedsAppraisal', 'fmt', '_invMoney', '_invNamed', '_invItemNo', '_andJoin',
  'moneyToNumber', '_readAppsScriptJson', '_invJob'];
const AV_VARS = ['_avRun', '_avForceComps', '_avAfter', 'AGENT_VALUE_BATCH', 'AGENT_VALUE_GENERAL_CEILING', 'AGENT_VALUE_MAX_COMPS',
  'AGENT_VALUE_MARK_RE', 'AGENT_VALUE_CONFS', 'AGENT_VALUE_SOURCES', 'AGENT_VALUE_OWN', 'AGENT_VALUE_SALE_DATE_RE', 'AGENT_VALUE_NOTICE_ORDER',
  'INV_TAXONOMY', 'INV_APPRAISAL_THRESHOLD', 'INV_APPRAISAL_THRESHOLD_DISPUTED', 'DECEDENT_SERVICES', 'DOC_TIERS',
  'DOC_TIER_FROM_SCOPE', 'JOB_STEPS', 'AGENT_MAX_DETAILS', 'INV_VAL_SOURCES', 'INV_LINE_INITIAL_MIN', 'DESK_LOOK_REASONS',
  '_agDupSet', 'AGENT_ROOM_CONF_RANK'];

function sp(v) {
  if (v && v.__sync) return v;
  return { __sync: true,
    then(f) { try { return sp(f ? f(v) : v); } catch (e) { return sr(e); } },
    catch() { return this; }, finally(f) { if (f) f(); return this; } };
}
function sr(e) {
  return { __sync: true,
    then(f, g) { if (!g) return this; try { return sp(g(e)); } catch (e2) { return sr(e2); } },
    catch(h) { try { return sp(h(e)); } catch (e2) { return sr(e2); } }, finally(f) { if (f) f(); return this; } };
}

const ESTATE = (over) => Object.assign({ id: 7, hvlId: 'HVL-0007', svc: 'cleanout', docTier: 'values', deathDate: '2026-06-14', tc: 'Ashley Jerome' }, over || {});
const LIVING = (over) => Object.assign({ id: 7, hvlId: 'HVL-0007', svc: 'downsizing_move', tc: 'Ashley Jerome' }, over || {});
const MAJOLICA = 'Hand-painted majolica dinner plates, likely Italian; stack of approximately 6';
const PAJARO = 'Spanish tin-glazed plates, pájaro (bird) pattern, likely Puente del Arzobispo';
const ROW = (over) => Object.assign({ stableId: 's1', label: 'inventory', roomIdx: 2, objectName: MAJOLICA, namedBy: 'agent', agentConf: 'medium',
  category: 'Ceramics & Glass', qty: 1, condition: 'Good', driveFileId: 'FID', ts: 1, disposition: 'Donate' }, over || {});
// A line both agents are sure of, under $500, with a destination: nothing about it needs a person.
const SURE = (over) => ROW(Object.assign({ fmv: 120, valLow: 90, valHigh: 150, valuedBy: 'agent', valConf: 'high', valSource: 'Online comps', valNameAt: MAJOLICA }, over || {}));
const RES = (over) => Object.assign({ name: '', fmv: 180, low: 120, high: 240, confidence: 'high', source: 'Auction comps',
  basis: 'Three sold lots of six', comps: [], lookup: 'pajaro plate Puente del Arzobispo', notices: [], mode: 'comps' }, over || {});

function rig(job, refs, over) {
  over = over || {};
  const posts = [], alerts = [];
  let answer = over.answer || (() => ({ ok: true, results: {}, failed: {} }));
  const dom = domStub({});
  const ctx = sandbox({
    fns: AV_FNS.concat(over.fns || []), vars: AV_VARS,
    stubs: Object.assign({
      jobs: [Object.assign({}, job)],
      _photoRefs: { [job.id]: (refs || []).map((r) => Object.assign({}, r)) },
      estimateStore: {},
      _invTouch(r) { r.updatedAt = (r.updatedAt || 0) + 1; return r; },
      savePhotoRefs() {}, _scheduleInventorySync() {}, renderInventoryTab() {}, showSyncBadge() {},
      _todayStr: () => '2026-10-24',
      esc: (x) => String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
      document: dom,
      SHEETS_SYNC_URL: 'https://script.google.com/macros/s/X/exec',
      fetch: (url, opt) => { const body = JSON.parse(opt.body); posts.push(body); const a = answer(body, posts.length - 1);
        return sp({ text: () => sp(JSON.stringify(a)) }); },
      alert: (m) => alerts.push(m),
      confirm: () => (over.confirm === undefined ? true : over.confirm),
      window: { confirm: () => true, prompt() {} },
    }, over.stubs || {}),
  });
  return { ctx, posts, alerts, dom, setAnswer: (f) => { answer = f; } };
}
const keysOf = (L) => L.map((k) => k.key);
const attempt = (f) => { try { return { ok: true, val: f() }; } catch (e) { return { ok: false, err: String(e && e.message || e) }; } };

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();
  const live = liveLines(src);

  // ═══════════════════════════════ THE BACKEND ═══════════════════════════════
  group('⚠⚠ B1 · the tool carries the better name, required under strict, and no notice kind asks a person to copy one');
  {
    const g = gsCtx();
    const item = g._avTool('comps').input_schema.properties.values.items;
    ok(item.required.indexOf('name') >= 0, 'name is required (strict wants every property required)');
    eq(item.properties.name && item.properties.name.type, 'string', 'a plain string');
    has(item.properties.name.description, 'never a count in it', 'its description forbids a count');
    eq(g.AGENT_VALUE_NOTICE_KINDS.indexOf('name'), -1, '⚠ no `name` notice kind: a better name is written, never raised for a person');
    eq(JSON.stringify(g._avTool('comps')), JSON.stringify(g._avTool('comps')), 'the tool is the same on every request (the cache)');
  }

  group('⚠⚠ B2 · the prompt gives Agent Two the last word on an agent\'s name, values it as that, and never a count in a name');
  {
    const g = gsCtx();
    const sys = g._avSystem({ estate: true, basis: 'Fair Market Value', valuationDate: '2026-06-14' });
    has(sys, 'THE NAME', 'its own section');
    has(sys, 'write the better name in name and value the line as what you say it is', 'the better name, and the value made for it');
    has(sys, 'Never put how many there are in a name', 'never a count');
    has(sys, 'Name checked by a person at the desk', 'a person\'s name named to it');
    has(sys, 'Treat that name as right, value it as named and leave name empty', '…and left alone');
    has(sys, 'a stack of eight plates is valued as eight plates, never as one', 'the line valued at its Quantity (Each × Qty)');
    lacks(sys, 'Do NOT rename', 'the old rule is gone');
    lacks(sys, 'Never change what a line is called', 'and its prohibition');
    lacks(sys, 'kind "name"', 'and its notice');
    ['$500', '500', 'threshold'].forEach((w) => lacks(sys, w, 'still no threshold in the prompt: ' + w));
  }

  group('B3 · a line whose name a person checked is marked so; any other is not');
  {
    const g = gsCtx();
    has(g._avLineText('L1', { name: 'Lamp', nameChecked: true }), 'Name checked by a person at the desk', 'checked: marked');
    lacks(g._avLineText('L1', { name: 'Lamp', nameChecked: false }), 'Name checked', 'not checked: nothing');
  }

  group('B4 · the answer\'s name comes back trimmed, its spaces collapsed, capped; none is empty');
  {
    const g = gsCtx();
    const base = { value: 180, low: 120, high: 240, confidence: 'high', source: 'Auction comps', basis: 'b', comps: [], lookup: '', notices: [] };
    eq(g._avLineResult(Object.assign({}, base, { name: '  Spanish   pájaro plates \n' }), 'comps', {}).name, 'Spanish pájaro plates', 'trimmed and collapsed');
    eq(g._avLineResult(Object.assign({}, base, { name: '' }), 'comps', {}).name, '', 'none is empty');
    eq(g._avLineResult(Object.assign({}, base, { name: 'x'.repeat(400) }), 'comps', {}).name.length, 300, 'capped at 300');
    const n = g._avLineResult(Object.assign({}, base, { notices: [{ kind: 'name', text: 'looks Spanish' }, { kind: 'other', text: 'count them' }] }), 'comps', {}).notices;
    eq(n.map((x) => x.kind), ['other'], 'a `name` notice an answer still carries is dropped');
  }

  group('B5 · the deployment: 2026-10-24b, the app relies on it, and the banner names the gap first');
  {
    const g = gsCtx();
    eq(g.BACKEND_VERSION, '2026-10-24b', 'main-sync.gs is 2026-10-24b');
    const app = sandbox({ vars: ['BACKEND_MIN_VERSION', 'BACKEND_FEATURE_COST'] });
    eq(app.BACKEND_MIN_VERSION, '2026-10-24b', 'and the app relies on it');
    ok(/^Agent Two values a line under the name Agent One gave it/.test(app.BACKEND_FEATURE_COST.version), 'the banner names the newest gap first, by consequence');
    has(app.BACKEND_FEATURE_COST.version, 'on a deployment older than 2026-10-24, a blank line added', 'and the one before it after');
  }

  // ═══════════════════════════════ THE APP ═══════════════════════════════════
  group('⚠⚠ A1 · Agent Two\'s better name is written on a name the agents still have, and the name it replaced is kept');
  {
    const R = rig(ESTATE(), [ROW()]);
    ok(R.ctx._avWrite(7, 's1', RES({ name: PAJARO }), ESTATE(), {}), 'it writes');
    let r = R.ctx._getPhotoRef(7, 's1');
    eq(r.objectName, PAJARO, '⚠ the better name replaces Agent One\'s');
    eq(r.valNameWas, MAJOLICA, 'and Agent One\'s reading is kept on the line');
    eq(r.valNameAt, PAJARO, 'the figure was made for the new name');
    eq(R.ctx.agentValueStale(r), false, 'so it is not a value made for an earlier name');
    eq(r.namedBy, 'agent', 'still the agents\' name');
    // A Re-value that renames again keeps the first name it replaced.
    R.ctx._avWrite(7, 's1', RES({ name: 'Spanish pájaro plates, Talavera de la Reina' }), ESTATE(), { revalue: true });
    r = R.ctx._getPhotoRef(7, 's1');
    eq([r.objectName, r.valNameWas], ['Spanish pájaro plates, Talavera de la Reina', MAJOLICA], 'a second rename keeps Agent One\'s reading as the one replaced');

    // A name a person typed, or ticked reviewed, is theirs.
    const D = rig(ESTATE(), [ROW({ namedBy: 'desk' })]);
    D.ctx._avWrite(7, 's1', RES({ name: PAJARO }), ESTATE(), {});
    eq([D.ctx._getPhotoRef(7, 's1').objectName, D.ctx._getPhotoRef(7, 's1').valNameWas], [MAJOLICA, undefined], '⚠ a name typed on the desk is never replaced');
    const V = rig(ESTATE(), [ROW({ reviewed: true })]);
    V.ctx._avWrite(7, 's1', RES({ name: PAJARO }), ESTATE(), {});
    eq(V.ctx._getPhotoRef(7, 's1').objectName, MAJOLICA, '⚠ nor one a person ticked reviewed');
    // The same name in other case and spacing is not a rename.
    const S = rig(ESTATE(), [ROW()]);
    S.ctx._avWrite(7, 's1', RES({ name: '  ' + MAJOLICA.toUpperCase() + ' ' }), ESTATE(), {});
    eq([S.ctx._getPhotoRef(7, 's1').objectName, S.ctx._getPhotoRef(7, 's1').valNameWas], [MAJOLICA, undefined], 'the same name, cased or spaced otherwise, changes nothing');
    const E = rig(ESTATE(), [ROW()]);
    E.ctx._avWrite(7, 's1', RES({ name: '' }), ESTATE(), {});
    eq(E.ctx._getPhotoRef(7, 's1').objectName, MAJOLICA, 'an empty name leaves the name standing');
  }

  group('A2 · the request says when a person has the name');
  {
    const R = rig(ESTATE(), [ROW({ stableId: 'a' }), ROW({ stableId: 'b', namedBy: 'desk' }), ROW({ stableId: 'c', reviewed: true })]);
    eq(['a', 'b', 'c'].map((id) => R.ctx._avItemPayload(7, R.ctx._getPhotoRef(7, id)).nameChecked), [false, true, true],
      'the agents\' name unchecked; a name typed or reviewed checked');
  }

  group('⚠⚠ A3 · the agents work in a line: Agent One, the room check, then Agent Two, with nothing pressed or asked');
  {
    const lines = [ROW({ stableId: 'a' }), ROW({ stableId: 'b', fmv: 40, valuedBy: 'desk' }), ROW({ stableId: 'c', objectName: '' })];
    const chain = (roomStarts, error) => {
      const seen = [];
      const R = rig(ESTATE(), lines, { confirm: false, fns: ['_agFinish', '_arFinish'], stubs: {
        _agState: () => ({ running: true, error: error || '' }), _arState: () => ({ running: true }),
        agentRoomCheckRun: (j, o) => { seen.push(o && o.auto); return roomStarts; } } });
      return { R, seen };
    };
    let c = chain(false);
    c.R.ctx._agFinish(7);
    eq(c.seen, [true], 'the room check is asked first, by itself');
    eq(c.R.posts.map((p) => p.action), ['agentValue'], '⚠ with no room to check, Agent Two runs at once…');
    eq(c.R.posts[0].items.map((i) => i.stableId), ['a'], '…on the named lines with no figure (never a desk figure, never an unnamed shot)');
    eq(c.R.alerts, [], 'nothing asked, nothing alerted (the confirm says no and it runs all the same)');
    c = chain(true);
    c.R.ctx._agFinish(7);
    eq(c.R.posts.length, 0, 'a room check started: Agent Two waits for its tail');
    c.R.ctx._arFinish(7);
    eq(c.R.posts.map((p) => p.action), ['agentValue'], '⚠ and starts there');
    c = chain(false, 'the naming service could not be reached');
    c.R.ctx._agFinish(7);
    eq([c.seen.length, c.R.posts.length], [0, 0], 'a naming run that failed outright starts neither');
    // agentValueAuto alone: silent with nothing to value, with a run out, with no URL.
    const N = rig(ESTATE(), [ROW({ fmv: 40, valuedBy: 'desk' })]);
    eq([N.ctx.agentValueAuto(7), N.posts.length, N.alerts.length], [false, 0, 0], 'nothing to value: nothing sent, nothing said');
    const U = rig(ESTATE(), [ROW()], { stubs: { SHEETS_SYNC_URL: '' } });
    eq([U.ctx.agentValueAuto(7), U.alerts.length], [false, 0], 'no Apps Script URL: silent');
  }

  group('⚠⚠ A4 · a name a person changes is valued again by itself, researched (the wooden mirror that is Restoration Hardware)');
  {
    const mirror = ROW({ objectName: 'Wooden wall mirror', fmv: 25, valLow: 15, valHigh: 40, valuedBy: 'agent', valConf: 'medium', valSource: 'General estimate', valNameAt: 'Wooden wall mirror', category: 'Furniture' });
    const R = rig(LIVING(), [mirror], { answer: (b) => ({ ok: true, results: { s1: RES({ fmv: 650, low: 450, high: 850, source: 'Online comps' }) }, failed: {} }) });
    const r = R.ctx._getPhotoRef(7, 's1');
    r.objectName = 'Restoration Hardware Strie wall mirror'; r.namedBy = 'desk';
    ok(R.ctx.agentValueAfterRename(7, 's1'), 'sent');
    eq(R.posts.length, 1, 'one request, at once');
    eq(R.posts[0].items[0].mode, 'comps', '⚠ researched against sold comparables, as Re-value sends it');
    eq(R.posts[0].items[0].nameChecked, true, 'with the name typed marked as the person\'s');
    eq(R.ctx._getPhotoRef(7, 's1').fmv, 650, '⚠ the figure made for the wooden mirror is replaced');
    eq(R.ctx._getPhotoRef(7, 's1').objectName, 'Restoration Hardware Strie wall mirror', 'and the name typed stands');
    // Never over a person's or an appraiser's figure; nothing with no name; a name the figure was made for asks nothing.
    const P = rig(LIVING(), [ROW({ fmv: 300, valuedBy: 'desk', namedBy: 'desk' })]);
    eq([P.ctx.agentValueAfterRename(7, 's1'), P.posts.length], [false, 0], 'a person\'s figure: nothing sent');
    const Q = rig(LIVING(), [SURE()]);
    eq([Q.ctx.agentValueAfterRename(7, 's1'), Q.posts.length], [false, 0], 'a figure made for the name it carries: nothing sent');
    const B = rig(LIVING(), [ROW({ objectName: '' })]);
    eq([B.ctx.agentValueAfterRename(7, 's1'), B.posts.length], [false, 0], 'no name: nothing sent');
    // A name typed on a named line with no figure is valued too.
    const F = rig(LIVING(), [ROW({ namedBy: 'desk', objectName: 'Le Creuset Dutch oven' })]);
    eq([F.ctx.agentValueAfterRename(7, 's1'), F.posts.length], [true, 1], 'a named line with no figure: valued');
    // While a run is out the rename waits for its tail.
    const W = rig(LIVING(), [Object.assign({}, mirror, { objectName: 'Restoration Hardware mirror', namedBy: 'desk' })]);
    W.ctx._avState(7).running = true;
    eq([W.ctx.agentValueAfterRename(7, 's1'), W.posts.length], [true, 0], 'a run already out: queued, nothing sent yet');
    W.ctx._avFinish(7);
    eq(W.posts.map((p) => p.items.map((i) => i.stableId)), [['s1']], '⚠ and sent at the run\'s tail');
    // _invEdit asks it on every name typed, once.
    const body = liveLines(fn('_invEdit'));
    eq((body.match(/agentValueAfterRename\(jobId, stableId\)/g) || []).length, 1, 'the row\'s name edit calls it, once');
    has(body, "if (key === 'objectName') agentValueAfterRename(jobId, stableId);", 'on the name alone');
  }

  group('⚠⚠ A5 · the one rule: a line comes to a person only for a reason it carries (doubtful or $500+)');
  {
    const R = rig(ESTATE(), []);
    const L = (o) => SURE(o);
    const reasons = (o) => keysOf(R.ctx.deskLookReasons(L(o), ESTATE()));
    const done = (o) => R.ctx.invLineDone(L(o), ESTATE());
    eq([reasons({}), done({})], [[], true], '⚠ both agents sure, under $500, a destination chosen: done, and nothing asks a person');
    eq(reasons({ fmv: 640, valHigh: 800 }), ['worth'], '$500 or more');
    eq(reasons({ fmv: 499.99 }), [], '…and $499.99 is not');
    eq(reasons({ agentConf: 'low' }), ['low'], 'Agent One unsure');
    eq(reasons({ agentConf: 'low', valNameWas: 'Old name', valNameAt: MAJOLICA }), [], '⚠ …unless Agent Two renamed it and is sure: the last word is its');
    eq(reasons({ valConf: 'low' }), ['low'], 'Agent Two unsure');
    eq(reasons({ category: 'Firearms' }), ['firearm'], 'a firearm');
    eq(reasons({ agentNotices: [{ kind: 'nfa', text: 't' }] }), ['nfa'], 'a possible NFA item');
    eq(reasons({ agentNotices: [{ kind: 'mustfind', text: 't' }] }), ['mustfind'], 'a must-find');
    eq(reasons({ valNotices: [{ kind: 'appraiser', text: 't' }] }), ['appraisal'], 'an appraisal advised');
    eq(reasons({ valNotices: [{ kind: 'worthpoint', text: 't' }, { kind: 'other', text: 'count them' }] }), [], 'a WorthPoint or Look at this note alone brings nobody');
    eq(reasons({ objectName: 'Renamed by hand' }), ['stale'], 'a value made for an earlier name');
    eq(reasons({ fmv: '', valLow: '', valHigh: '', valuedBy: '', valFailed: 'no sold comparable' }), ['unvalued'], 'one Agent Two could not value');
    eq(R.ctx.DESK_LOOK_REASONS.map((k) => k.key).indexOf('dup'), -1, 'a possible duplicate is answered in its own block above the rows, not here');
    eq(reasons({ fmv: 900, valuedBy: 'desk' }), [], '⚠ a figure a person recorded is theirs: $900 asks nobody');
    eq(reasons({ fmv: 900, valuedBy: 'appraiser', valSource: 'Appraisal' }), [], '…nor an appraisal\'s');
    eq(done({ disposition: 'Undecided' }), false, 'not done while its destination is undecided (the family\'s decision)');
    eq(done({ objectName: '' }), false, 'nor with no name (Agent One\'s)');
    eq(done({ fmv: '', valLow: '', valHigh: '', valuedBy: '' }), false, 'nor named and not yet valued (Agent Two\'s)');
    eq(R.ctx.deskNeedsLook(L({ objectName: '' }), ESTATE()), false, 'and a line still with the agents is not a person\'s to check');
    // A person's look covers it, and goes when a figure lands after it.
    const V = rig(ESTATE(), [SURE({ fmv: 640, valHigh: 800 })]);
    V.ctx._invSetReviewed(7, 's1', true);
    let v = V.ctx._getPhotoRef(7, 's1');
    eq([v.reviewed, v.valReviewed, V.ctx.invLineDone(v, ESTATE())], [true, true, true], '⚠ the one tick covers the line and the figure');
    V.ctx._avWrite(7, 's1', RES({ fmv: 700, high: 900 }), ESTATE(), { revalue: true });
    v = V.ctx._getPhotoRef(7, 's1');
    eq([V.ctx.invLineReviewed(v), V.ctx.invLineDone(v, ESTATE())], [false, false], '⚠ a new figure after the look brings the line back');
    eq(V.ctx.invLineReviewed({ namedBy: 'desk', objectName: 'Lamp', disposition: 'Donate', valuedBy: 'agent', fmv: 50, valHigh: 60 }), false,
      'a line named and decided on the desk is reviewed only while no unseen agent figure is on it');
    eq(V.ctx.invLineReviewed({ namedBy: 'desk', objectName: 'Lamp', disposition: 'Donate' }), true, '…and is, without one');
  }

  group('⚠⚠ A6 · the one look: the tick (and Mark reviewed) covers name, count and value; untick undoes both; no Accept anywhere');
  {
    const R = rig(ESTATE(), [SURE({ fmv: 640 })]);
    R.ctx._invSetReviewed(7, 's1', true);
    let r = R.ctx._getPhotoRef(7, 's1');
    // The real _invStampBy: the device's user, else (as here, none set) the job's concierge.
    eq([r.reviewed, r.reviewedBy, r.valReviewed, r.valReviewedBy], [true, 'Ashley Jerome', true, 'Ashley Jerome'], 'one stamp, one name, for the line and its figure');
    R.ctx._invSetReviewed(7, 's1', false);
    r = R.ctx._getPhotoRef(7, 's1');
    eq([r.reviewed, r.valReviewed], [false, undefined], 'unticked: both gone');
    has(liveLines(fn('_invBulkApply')), '_invStampLineReviewed(ref, job);', 'Mark reviewed stamps the same one look');
    lacks(liveLines(fn('_invBulkApply')), "'valReviewed'", 'and Accept values\' key is gone from the bulk handler');
    ['agentValueAccept', '>Accept value<', 'Accept values</button>', '_avAcceptButtonHtml'].forEach((w) => lacks(live, w, '⚠ no second tier: ' + w));
    // A WorthPoint sale pasted is the person's look at the line.
    has(liveLines(fn('agentValueUseSale')), '_invStampLineReviewed(ref, job);', 'a sale pasted reviews the line');
  }

  group('⚠⚠ A7 · the papers say COMPLETE, never REVIEWED, and count what is still to check');
  {
    const R = rig(ESTATE(), []);
    const done2 = [SURE({ stableId: 'a' }), SURE({ stableId: 'b' })];
    const stamp = R.ctx._invProgressStamp(done2, null, ESTATE());
    has(stamp, 'COMPLETE &mdash; all 2 items', '⚠ both done by the agents: COMPLETE');
    lacks(stamp, 'REVIEWED', '⚠⚠ and never a claim that a person reviewed them');
    const half = [SURE({ stableId: 'a' }), SURE({ stableId: 'b', fmv: 640, valHigh: 800 })];
    has(R.ctx._invProgressStamp(half, null, ESTATE()), 'IN PROGRESS &mdash; 1 of 2 items complete', 'one at $640 still to check');
    has(R.ctx._invProgressStamp(half, null, ESTATE()), 'Values and dispositions on lines not yet complete may still change.', 'the caveat in the same words');
    has(R.ctx._avUnreviewedStamp(half, ESTATE()), '1 value still to check', 'the schedules count the one');
    eq(R.ctx._avUnreviewedStamp(done2, ESTATE()), '', 'and nothing where every figure is done');
    // Every paper hands its job to the stamp, so a paper counts what the desk counts.
    ['printContentsList', 'printEstateInventoryReport', 'printDispositionLedger', 'printContentsRecord'].forEach((p) =>
      ok(/_invProgressStamp\([^)]*, job\)/.test(liveLines(fn(p))), p + ' passes its job to the stamp'));
    ['printEstateInventoryReport', 'printCourtInventory', 'printTrustSchedule'].forEach((p) =>
      has(liveLines(fn(p)), '_avUnreviewedStamp(', p + ' counts the values still to check') );
    ['printEstateInventoryReport', 'printCourtInventory', 'printTrustSchedule'].forEach((p) =>
      ok(/_avUnreviewedStamp\([a-zA-Z]+, job\)/.test(liveLines(fn(p))), p + ' passes its job'));
  }

  group('A8 · the desk: To check beside Unnamed shots, the notices of lines still needing a person, the record says what was renamed');
  {
    const flags = sandbox({ vars: ['INV_WORK_FLAGS'], fns: ['invWorkFlags'], stubs: { maivFilingApplies: () => true, invFiduciaryMode: () => true } });
    const F = attempt(() => flags.invWorkFlags(ESTATE()));
    eq(F.ok ? F.val.slice(0, 2).map((f) => [f.key, f.label]) : F.err, [['unnamed', 'Unnamed shots'], ['tocheck', 'To check']], '⚠ To check sits beside Unnamed shots');
    has(liveLines(decl('INV_WORK_FLAGS')), 'deskNeedsLook(r, job)', 'and counts the one rule');
    lacks(liveLines(decl('INV_WORK_FLAGS')), "'unrevval'", 'Unreviewed values is gone');

    const R = rig(ESTATE(), []);
    const sure = SURE({ stableId: 'a', valNotices: [{ kind: 'worthpoint', text: 'check WorthPoint' }] });
    const big = SURE({ stableId: 'b', fmv: 640, valHigh: 800, valNotices: [{ kind: 'other', text: 'count the plates' }] });
    const list = R.ctx.agentValueNotices(ESTATE(), [sure, big]);
    eq(list.map((n) => n.ref.stableId), ['b'], '⚠ only the line still needing a person lists its notes above the rows');
    const rec = R.ctx._avPanelHtml(ESTATE(), SURE({ valNameWas: MAJOLICA, objectName: PAJARO, valNameAt: PAJARO, valNotices: [{ kind: 'worthpoint', text: 'check WorthPoint' }] }));
    has(rec, 'Agent One first named it “' + MAJOLICA + '”; Agent Two’s research renamed it.', '⚠ the record says the name was corrected, and from what');
    has(rec, 'Agent Two noted', 'every note of its is in the record');
    has(rec, 'check WorthPoint', '…including one quiet above the rows');
    lacks(rec, 'Accept value', 'and no Accept');
    eq(R.ctx._avRowBadges(ESTATE(), SURE()), [], 'the row\'s agent badges are gone (the check badge says what a person must see)');
  }

  group('⚠⚠ A9 · Each × Qty = Total: one helper each, the count carries Each, both boxes typed into, the math by itself');
  {
    const R = rig(ESTATE(), []);
    eq([R.ctx.invLineQty({}), R.ctx.invLineQty({ qty: '8' }), R.ctx.invLineQty({ qty: 0 })], [1, 8, 1], 'a line with no count is one');
    eq(R.ctx.invUnitValue({ fmv: 200, qty: '8' }), 25, 'Each read off the total');
    eq(R.ctx.invUnitValue({ fmv: 200, qty: 8, unitVal: 30 }), 30, 'Each typed wins');
    ok(isNaN(R.ctx.invUnitValue({ fmv: '', qty: 8 })), 'no value: no Each');
    // The count carries Each across: the plates.
    const plates = SURE({ fmv: 25, valLow: 15, valHigh: 40, qty: 1 });
    ok(R.ctx._invQtyCarriesValue(Object.assign(plates, { qty: '8' }), 25, 1), 'the count moved the figure');
    eq([plates.fmv, plates.valLow, plates.valHigh], [200, 120, 320], '⚠ 8 plates at $25 each is $200, and the agent\'s range moves with it');
    const appr = ROW({ fmv: 1200, valuedBy: 'appraiser', valSource: 'Appraisal', qty: '6' });
    eq([R.ctx._invQtyCarriesValue(appr, 200, 1), appr.fmv], [false, 1200], 'an appraisal\'s figure is the report\'s, never moved by a count');
  }

  group('⚠⚠ A10 · Each × Qty driven through the row\'s own edit (_invEdit): count, Each, total, a cleared Each');
  {
    const refreshes = { summary: 0, guard: 0, strip: 0 };
    const R = rig(ESTATE(), [SURE({ fmv: 25, valLow: 15, valHigh: 40, qty: 1 })], {
      fns: ['_invEdit'],
      stubs: { _invRefreshSummary: () => refreshes.summary++, _invRefreshGuardrail: () => refreshes.guard++, _invRefreshFlagStrip: () => refreshes.strip++,
        _invRefreshRecords() {}, _invRefreshReleases() {}, INV_STICKY_FIELDS: [], invStaffRefused: () => '', invBequestFor: () => null,
        invNoteDispositionMove: () => false, invFillPlanChannel: () => false, _invRowDomId: (s) => 'inv-row-' + s, _renderInvRow: () => '<div></div>',
        _invRefreshAgentNotices() {} },
    });
    const box = (id, v) => { const el = R.dom.getElementById(id); el.value = v; return el; };
    const field = (v) => ({ value: v, type: 'text' });
    R.ctx._invEdit(7, 's1', 'qty', { value: '8', type: 'number' });
    let r = R.ctx._getPhotoRef(7, 's1');
    eq([r.fmv, r.valuedBy], [200, 'agent'], '⚠ the count from 1 to 8: the total is 8 × $25, still the agent\'s reading');
    eq([R.dom.getElementById('inv-fmv-s1').value, R.dom.getElementById('inv-each-s1').value], ['$200', '$25'], 'both boxes repainted in place');
    R.ctx._invEdit(7, 's1', 'qty', { value: '12', type: 'number' });
    eq(R.ctx._getPhotoRef(7, 's1').fmv, 300, 'the count corrected to 12: $300');
    R.ctx._invEdit(7, 's1', 'unitVal', box('inv-each-s1', '$30'));
    r = R.ctx._getPhotoRef(7, 's1');
    eq([r.unitVal, r.fmv, r.valuedBy], [30, 360, 'desk'], '⚠ Each typed: the total is Each × the count, and the figure is the desk\'s');
    eq(R.dom.getElementById('inv-fmv-s1').value, '$360', 'the total repainted');
    R.ctx._invEdit(7, 's1', 'qty', { value: '10', type: 'number' });
    eq(R.ctx._getPhotoRef(7, 's1').fmv, 300, 'a count changed carries the Each typed');
    R.ctx._invEdit(7, 's1', 'fmv', box('inv-fmv-s1', '$500'));
    r = R.ctx._getPhotoRef(7, 's1');
    eq([r.fmv, r.unitVal, R.ctx.invUnitValue(r)], [500, undefined, 50], '⚠ a total typed: Each is read off it');
    eq(R.dom.getElementById('inv-each-s1').value, '$50', 'and the Each box says so');
    R.ctx._invEdit(7, 's1', 'unitVal', box('inv-each-s1', ''));
    r = R.ctx._getPhotoRef(7, 's1');
    eq([r.fmv, r.unitVal], ['', undefined], 'a cleared Each clears the value: blank, never $0');
    ok(refreshes.guard >= 4 && refreshes.summary >= 4, 'the summary and the guardrail follow every figure moved');
    // Agent Two's figure is the whole line's: an Each typed before it goes.
    const A = rig(ESTATE(), [ROW({ unitVal: 30, qty: 6, fmv: 180, valuedBy: 'desk' })]);
    A.ctx._getPhotoRef(7, 's1').fmv = ''; A.ctx._getPhotoRef(7, 's1').valuedBy = '';
    A.ctx._avWrite(7, 's1', RES({ fmv: 240 }), ESTATE(), {});
    eq([A.ctx._getPhotoRef(7, 's1').fmv, A.ctx._getPhotoRef(7, 's1').unitVal, A.ctx.invUnitValue(A.ctx._getPhotoRef(7, 's1'))], [240, undefined, 40], 'Agent Two\'s whole-line figure: Each read off it');
  }

  group('A11 · the row: Qty, Each, Total under their headings, nothing hung under the value box, and the manifest keeps unitVal');
  {
    const head = liveLines(fn('_renderInvColHead'));
    const iQ = head.indexOf('>Qty<'), iE = head.indexOf('>Each<'), iT = head.indexOf('>Total<');
    ok(iQ > 0 && iQ < iE && iE < iT, 'headings: Qty, then Each, then Total (' + [iQ, iE, iT].join(', ') + ')');
    lacks(head, '>Value<', 'the Value heading is now Total');
    const row = liveLines(fn('_renderInvRow'));
    has(row, '<div class="inv-c inv-c-each" data-cap="Each">\' + _invEachInput(jid, ref) + \'</div>\'', 'the Each box in its column');
    has(row, '<div class="inv-c inv-c-val" data-cap="Total">\' + _invInput(jid, ref, fmvCol, job) + \'</div>\'', '⚠ the Total box alone in its column (Accept no longer hangs under it)');
    const R = rig(ESTATE(), []);
    has(R.ctx._invEachInput(7, ROW({ fmv: 200, qty: 8 })), 'id="inv-each-s1"', 'Each has its id');
    has(R.ctx._invEachInput(7, ROW({ fmv: 200, qty: 8 })), 'value="$25"', 'and reads one article\'s value');
    has(R.ctx._invEachInput(7, ROW({ fmv: 200, qty: 8 })), "_invEdit(7,'s1','unitVal',this)", 'and writes through the row\'s own edit');
    has(src.slice(src.indexOf('<style>'), src.indexOf('</style>')), '.inv-c-each{flex:0 0 92px;min-width:0;}', 'its column width on a laptop');
    has(liveLines(fn('savePhotoRefs')), 'unitVal:r.unitVal', 'the manifest keeps it (a key missing from the whitelist is dropped on every save)');
  }
};

function decl(name) { return require('./harness').decl(name); }
