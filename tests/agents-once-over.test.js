'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// THE AGENTS' ONCE-OVER (2026-10-26; backend 2026-10-26), on top of 2026-10-25b's (agents-together.test.js).
//
// Anthony: *"do a once over on the two agents - naming and pricing. and make sure they are acting in concert … think simplicity for
// the user of the app, and accuracy for the agents. don't change anything structural … so that naming and pricing are as accurate
// as possible on the first pass and so that TC oversight is minimized and made as simple as possible"*. His answers on the way:
// Agent One to Opus 5.5 (*"Move to Opus 5.5"*), then *"make sure the agents update the model when there are new models so they are
// always the most accurate"* and, on the price, *"our jobs are $10,000 to $40,000 plus … at most 1 to 5 a month"*; collections valued
// by Agent Two once photographed (*"Good to know the value going in"*); antiques and decor categories (*"Yes, both"*); Agent Two
// corrects a research line's category (*"Yes, same rule as the name"*); sharper close-ups (*"Usually yes: make them sharper"*); the
// $250 test on one article (*"One item's price"*); a best estimate over unvalued (*"Best estimate, marked unsure"*).
//
//   M · the model: the newest top-tier model first, the newest Opus behind it, read off the model list, demoted for six hours.
//   S · the one sender (_agSendAll) and Agent Two's loop: a slow, busy, cut-off or rejected request goes to the fallback.
//   P · the prompts and tools: Agent One's naming, notes, cabinet, categories, basis; Agent Two's category, confidence, basis,
//       market, guessed names with their photograph, the evidence and the estate.
//   A · the app: the handoffs (empty frames, typed names, notices, routing, the photo context, the category, collections, the queue,
//       passing failures, close-ups, sharper close-ups) and the desk (Unsure, the review's notice, the desk's words).
// ─────────────────────────────────────────────────────────────────────────────

const vm = require('vm');
const fs = require('fs');
const path = require('path');
const { sandbox, source, fn, matchBrace, domStub } = require('./harness');

const liveLines = (s) => String(s).split('\n')
  .filter((l) => { const t = l.trim(); return !(t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')); })
  .join('\n');

// ─── THE REAL BACKEND: every agent var and function, lifted by name off the file ───
const GS = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'main-sync.gs'), 'utf8');
function gsFn(name) {
  const re = new RegExp('(^|\\n)function\\s+' + name + '\\s*\\(', 'g');
  const m = re.exec(GS);
  if (!m) throw new Error('not in .gs: ' + name);
  const start = m.index + (m[1] ? m[1].length : 0);
  return GS.slice(start, matchBrace(GS, GS.indexOf('{', re.lastIndex)) + 1);
}
function gsVar(name) {
  const m = GS.match(new RegExp('(^|\\n)(var\\s+' + name + '\\s*=[\\s\\S]*?;)\\s*(?:\\/\\/[^\\n]*)?\\n'));
  if (!m) throw new Error('var not in .gs: ' + name);
  return m[2];
}
const GS_AGENT_VARS = (GS.match(/(^|\n)var\s+(AGENT_[A-Z0-9_]+)\s*=/g) || []).map((s) => s.replace(/^\n?var\s+/, '').replace(/\s*=$/, ''));
const GS_AGENT_FNS = (GS.match(/(^|\n)function\s+((?:_ag|_ar|_av|agent)[A-Za-z0-9_]*)\s*\(/g) || [])
  .map((s) => s.replace(/^\n?function\s+/, '').replace(/\s*\($/, ''));

// `reply(body, i, call)` answers each request of each fetchAll; `throwOn(call)` makes a fetchAll throw (UrlFetchApp past its own
// limit); `list` is the model list GET /v1/models answers (null: the call fails); `cache` the script cache's store.
function gsAll({ reply = null, throwOn = null, list = null, cache = {}, props = { ANTHROPIC_API_KEY: 'sk-ant-test' }, tick = 1, noCache = false } = {}) {
  const sent = [], fetched = [], logs = [];
  let t = 1000, call = 0;
  const files = { FID: { type: 'image/jpeg', bytes: [1, 2, 3] }, DET: { type: 'image/jpeg', bytes: [4, 5] }, P2: { type: 'image/jpeg', bytes: [6] } };
  const ctx = {
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null) }) },
    Logger: { log: (m) => logs.push(String(m)) },
    DriveApp: { getFileById: (id) => { const f = files[id]; if (!f) throw new Error('File not found: ' + id);
      return { getBlob: () => ({ getContentType: () => f.type, getBytes: () => f.bytes }) }; } },
    Utilities: { base64Encode: (b) => 'B64(' + b.length + ')' },
    UrlFetchApp: {
      fetch: (url, opt) => { fetched.push({ url, opt });
        if (!list) return { getResponseCode: () => 500, getContentText: () => '{}' };
        return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ data: list }) }; },
      fetchAll: (reqs) => {
        const n = call++;
        sent.push(reqs);
        t += 1000;
        if (throwOn && throwOn(n)) throw new Error('Timeout: ' + reqs[0].url);
        return reqs.map((r, i) => {
          const res = reply ? reply(JSON.parse(r.payload), i, n, r) : { code: 200, body: {} };
          return { getResponseCode: () => res.code || 200, getContentText: () => (typeof res.body === 'string' ? res.body : JSON.stringify(res.body)) };
        });
      },
    },
    Date: function () { return { getTime: () => (t += tick) }; },
    JSON, Math, Number, String, Object, Array, Error, parseInt, parseFloat, isFinite, RegExp,
  };
  // ⚠ CacheService's expiry is 1 to 21,600 seconds; a put outside it throws here, so a day asked for is caught (2026-10-26, on review).
  if (!noCache) ctx.CacheService = { getScriptCache: () => ({ get: (k) => (k in cache ? cache[k].v : null),
    put: (k, v, secs) => { if (!(secs >= 1 && secs <= 21600)) throw new Error('Argument too large: expirationInSeconds'); cache[k] = { v, secs }; } }) };
  vm.createContext(ctx);
  vm.runInContext(GS_AGENT_VARS.map(gsVar).concat([gsVar('BACKEND_VERSION')]).concat(GS_AGENT_FNS.filter((f) => !/^test/.test(f)).map(gsFn)).join('\n'), ctx);
  Object.assign(ctx, { sent, fetched, logs, cache });
  return ctx;
}
const payload = (r) => JSON.parse(r.payload);
const TOOL_ONE = (objects, notices) => ({ stop_reason: 'tool_use', content: [{ type: 'tool_use', name: 'record_contents',
  input: { objects: objects || [{ name: 'Walnut six-drawer dresser, mid-century style', category: 'Furniture', qty: 1, confidence: 'medium', basis: 'form and grain', crop: [0, 0, 1, 1] }], notices: notices || [] } }] });
const SHOT = (over) => Object.assign({ stableId: 's1', fileId: 'FID', room: 'Bedroom' }, over || {});
const CATS = ['Antiques', 'Art & Décor', 'Collectibles', 'Furniture', 'General/Household'];
const CTX1 = { categories: CATS, mustFind: [], fiduciary: true };
const LIST = [
  { id: 'claude-fable-5-1', capabilities: { image_input: { supported: true } } },
  { id: 'claude-fable-6', capabilities: { image_input: { supported: true } } },
  { id: 'claude-fable-6-20270101', capabilities: { image_input: { supported: true } } },
  { id: 'claude-mythos-7' },
  { id: 'claude-opus-5-5' }, { id: 'claude-opus-6-1' }, { id: 'claude-opus-4-8' },
  { id: 'claude-opus-7', capabilities: { image_input: { supported: false } } },
  { id: 'claude-sonnet-9' },
];
const ANSWER2 = (values, unvalued, before) => ({ stop_reason: 'tool_use', content: (before || []).concat([{ type: 'tool_use', name: 'record_values',
  input: { values: values || [], unvalued: unvalued || [] } }]) });
const VAL = (over) => Object.assign({ line: 'L1', name: '', value: 40, low: 30, high: 60, confidence: 'medium', source: 'General estimate',
  basis: 'The going used rate', comps: [], lookup: '', notices: [] }, over || {});
const LINE = (over) => Object.assign({ stableId: 'v1', mode: 'general', name: 'Everyday stainless flatware', category: 'General/Household', qty: 60, condition: '' }, over || {});
const CTX2 = { estate: true, basis: 'Fair Market Value', valuationDate: '2026-06-14', categories: CATS };

// ─── THE REAL APP ────────────────────────────────────────────────────────────
function sp(v) {
  if (v && v.__sync) return v;
  return { __sync: true, then(f) { try { return sp(f ? f(v) : v); } catch (e) { return sr(e); } }, catch() { return this; }, finally(f) { if (f) f(); return this; } };
}
function sr(e) {
  return { __sync: true, then(f, g) { if (!g) return this; try { return sp(g(e)); } catch (e2) { return sr(e2); } },
    catch(h) { try { return sp(h(e)); } catch (e2) { return sr(e2); } }, finally(f) { if (f) f(); return this; } };
}
const AV_FNS = ['agentValueMode', 'agentValueInternal', '_avHasFigure', 'agentValueableRefs', 'agentValueUnreviewed',
  'agentValueStale', 'agentValueSpecialistWorth', '_avValDate', '_avContext', '_avItemPayload', 'agentValueGradesCondition', '_avComp', '_avWrite', 'agentValueWhole', '_avRename', '_avNameIsAgents',
  '_avNoteFailure', 'agentValueApply', '_avTakeValue', '_avStampReviewed', '_invStampBy', 'deviceUser', '_avStart',
  '_avSendNext', '_avFinish', '_avRepaint', '_avStateHtml', '_avState', 'agentValueAuto', 'agentValueAfterRename', 'agentValueAfterCloseUp', 'agentValueRun',
  'agentValueNotices', '_avNoticesHtml', '_avNoticeKinds', '_avNoticeLabel', '_deskShowBtnHtml', '_avSummary', '_avRowBadges', '_avPanelHtml', 'agentValueAgain',
  'invLineReviewed', '_invStampLineReviewed', 'invLineUnsure', 'invLineQty', 'invLineAccepted', 'invLineHold', '_invLineHolds', 'invLineOpen',
  'invValBasisWord', 'invAppraised', 'invLineAppraiser', '_invLinkedAppraiser', '_jobAppraisers', '_apprLabel', '_invHasAppraisal', '_invAppraisalDate',
  '_getPhotoRef', '_setPhotoRef', '_jobInvRefs', '_invHasValue', 'roundCents', 'invIsIntrinsic', 'invCatMeta',
  'invFiduciaryMode', 'isDecedentJob', 'docTierProduces', 'docTierOf', 'docTierDef', 'svcHasDocStep', 'estateValueDate',
  '_avdDate', '_ymdLocal', 'resolveValBasis', '_agNameKey', '_agDetailRefs', 'invLineCloseUps', '_invFileId', 'invAppraisalThreshold',
  'gateDispute', '_gateYes', 'invNeedsAppraisal', 'fmt', '_invMoney', '_invNamed', '_invItemNo', '_andJoin',
  'moneyToNumber', '_readAppsScriptJson', '_invJob', '_invRenderWhenIdle', '_invHasPhoto', 'agentValueLooks', '_avPhotoContext', '_invPhotoSource',
  '_invRoomName', 'agentListedOff', '_invDerivedRefs', '_invPhotoSiblings', '_invCondIsAgents', '_invAgentCondition'];
const AV_VARS = ['_avRun', 'AGENT_CONDITIONS', '_avForceComps', '_avAfter', '_avAutoAgain', 'AGENT_VALUE_BATCH', 'AGENT_VALUE_GENERAL_CEILING', 'AGENT_VALUE_MAX_COMPS',
  'AGENT_VALUE_MARK_RE', 'AGENT_VALUE_NO_MARK_RE', 'AGENT_VALUE_READ_RE', 'AGENT_VALUE_HEDGE_RE', 'AGENT_VALUE_CONFS', 'AGENT_VALUE_SOURCES', 'AGENT_VALUE_OWN',
  'AGENT_VALUE_SALE_DATE_RE', 'INV_TAXONOMY', 'INV_CATEGORIES', 'INV_DEFAULT_CATEGORY', 'INV_APPRAISAL_THRESHOLD', 'INV_APPRAISAL_THRESHOLD_DISPUTED',
  'DECEDENT_SERVICES', 'DOC_TIERS', 'DOC_TIER_FROM_SCOPE', 'JOB_STEPS', 'AGENT_MAX_DETAILS', 'INV_VAL_SOURCES', 'AGENT_LISTED_MAX'];

const ESTATE = (over) => Object.assign({ id: 7, hvlId: 'HVL-0007', svc: 'cleanout', docTier: 'values', deathDate: '2026-06-14', tc: 'Ashley Jerome' }, over || {});
const ROW = (over) => Object.assign({ stableId: 's1', label: 'inventory', roomIdx: 2, objectName: 'Hand-painted plates, likely Italian', namedBy: 'agent',
  agentConf: 'medium', category: 'General/Household', qty: 1, driveFileId: 'FID', ts: 1, disposition: 'Donate' }, over || {});
const RES = (over) => Object.assign({ name: '', fmv: 180, low: 120, high: 240, confidence: 'high', source: 'Auction comps', basis: 'Three sold lots',
  comps: [], lookup: '', notices: [], mode: 'comps', category: '' }, over || {});

function rig(job, refs, over) {
  over = over || {};
  const posts = [], alerts = [];
  let answer = over.answer || (() => ({ ok: true, results: {}, failed: {} }));
  const ctx = sandbox({
    fns: AV_FNS.concat(over.fns || []), vars: AV_VARS.concat(over.vars || []),
    stubs: Object.assign({
      jobs: [Object.assign({}, job)],
      _photoRefs: { [job.id]: (refs || []).map((r) => Object.assign({}, r)) },
      estimateStore: { [job.id]: { estimate: { rooms: [{ idx: 2, name: 'Dining Room', note: 'client says the dining set is Henredon' }] } } },
      _invTouch(r) { r.updatedAt = (r.updatedAt || 0) + 1; return r; },
      savePhotoRefs() {}, _scheduleInventorySync() {}, renderInventoryTab() {}, showSyncBadge() {},
      _todayStr: () => '2026-10-26',
      esc: (x) => String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
      document: domStub({}),
      SHEETS_SYNC_URL: 'https://script.google.com/macros/s/X/exec',
      fetch: (url, opt) => { const body = JSON.parse(opt.body); posts.push(body); const a = answer(body, posts.length - 1);
        return sp({ text: () => sp(JSON.stringify(a)) }); },
      alert: (m) => alerts.push(String(m)),
      confirm: () => true,
    }, over.stubs || {}),
  });
  return { ctx, posts, alerts, setAnswer: (f) => { answer = f; } };
}

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();

  // ═══════════════════════════════ M · THE MODEL ═══════════════════════════════
  group('⚠⚠ M1 · the newest of each line off the model list, never below the floor, never a dated snapshot or another line');
  {
    const g = gsAll();
    eq(g._agModelVersion('claude-fable-5-1', 'top'), [5, 1], 'a top-tier alias reads its version');
    eq(g._agModelVersion('claude-opus-6', 'opus'), [6, 0], 'a whole-number version reads as .0');
    eq(g._agModelVersion('claude-opus-4-5-20251101', 'opus'), null, 'a dated snapshot is never chosen');
    eq(g._agModelVersion('claude-mythos-7', 'top'), null, 'another line is never chosen');
    eq(g._agNewestOf(LIST, 'top'), 'claude-fable-6', '⚠ the newest top-tier model on the list');
    eq(g._agNewestOf(LIST, 'opus'), 'claude-opus-6-1', '⚠ the newest Opus that reads images (Opus 7 here says it does not)');
    eq(g._agNewestOf([{ id: 'claude-opus-4-8' }], 'opus'), 'claude-opus-5-5', 'never below the floor');
    eq(g.AGENT_MODEL_FLOORS, { top: 'claude-fable-5-1', opus: 'claude-opus-5-5' }, 'the floors: today\'s top tier and today\'s Opus');
  }

  group('M2 · the list is read at most every six hours; a list that cannot be read answers the floors, remembered ten minutes');
  {
    const cache = {};
    const g = gsAll({ list: LIST, cache });
    eq(g._agModels('name', 'sk'), { first: 'claude-fable-6', fallback: 'claude-opus-6-1' }, 'first the newest top tier, behind it the newest Opus');
    eq(g.fetched.length, 1, 'the list was read once');
    has(g.fetched[0].url, 'https://api.anthropic.com/v1/models', 'from Anthropic\'s model list');
    eq(g.fetched[0].opt.headers['x-api-key'], 'sk', 'with the key as a header');
    eq(cache.agent_models.secs, 21600, 'and kept six hours');
    g._agModels('value', 'sk');
    eq(g.fetched.length, 1, '…so the next call does not read it again');
    const bad = {}, h = gsAll({ list: null, cache: bad });
    eq(h._agModels('name', 'sk'), { first: 'claude-fable-5-1', fallback: 'claude-opus-5-5' }, '⚠ an unreadable list: the floors');
    eq(bad.agent_models.secs, 600, 'remembered ten minutes, so a run does not ask for every slice');
    eq(gsAll({ noCache: true })._agModels('name', 'sk').first, 'claude-fable-5-1', 'no cache service at all: the floors, nothing thrown');
    const pin = gsAll({ list: LIST, props: { ANTHROPIC_API_KEY: 'k', AGENT_MODEL_PIN: 'claude-opus-5-5' } });
    eq(pin._agModels('name', 'k'), { first: 'claude-opus-5-5', fallback: 'claude-opus-5-5' },
       '⚠ AGENT_MODEL_PIN pins every call, the fallback too: never a newer Opus it was pinned away from (the escape hatch)');
  }

  group('⚠ M3 · a task whose first choice did not fit runs on the fallback for six hours (CacheService\'s ceiling)');
  {
    const cache = {};
    const g = gsAll({ list: LIST, cache });
    g._agSlow('rooms');
    eq(g._agModels('rooms', 'k').first, 'claude-fable-6', 'one request that ran long: still the first choice');
    g._agSlow('rooms');
    eq(g._agModels('rooms', 'k').first, 'claude-opus-6-1', '⚠ twice: the fallback from then on');
    eq([cache.agent_demote_rooms && cache.agent_demote_rooms.secs, cache.agent_slow_rooms && cache.agent_slow_rooms.secs], [21600, 21600],
       '⚠ for six hours, the longest CacheService keeps anything (a day was refused and nothing was kept)');
    eq(g._agModels('name', 'k').first, 'claude-fable-6', 'the other tasks are untouched');
    has(g.logs.join('\n'), 'the first-choice model is set aside for six hours', 'and the log says so');
  }

  // ═══════════════════════════════ S · THE SENDER ═══════════════════════════════
  group('⚠⚠ S1 · Agent One: the newest top tier with the refusal fallback; a slice past the limit goes again on the fallback');
  {
    const g = gsAll({ list: LIST, reply: () => ({ code: 200, body: TOOL_ONE() }) });
    const out = g.agentIdentifyShots({ context: CTX1, shots: [SHOT()] });
    const req = g.sent[0][0];
    eq(payload(req).model, 'claude-fable-6', 'the first choice is the newest top-tier model');
    eq(payload(req).fallbacks, 'default', 'with the server-side refusal fallback');
    eq(req.headers['anthropic-beta'], 'server-side-fallback-2026-07-01', 'and its header');
    eq(payload(req).thinking.type, 'adaptive', 'adaptive thinking (accepted on every current model)');
    eq(payload(req).output_config.effort, 'medium', 'effort set, never left to a default');
    eq([out.model, (out.results.s1 || {}).model], ['claude-fable-6', 'claude-fable-6'], 'the answer names the first choice and the model that answered');
    // Past UrlFetchApp's limit: the slice goes again on the fallback, and nothing named is thrown away.
    const shots = [];
    for (let i = 1; i <= 9; i++) shots.push(SHOT({ stableId: 'p' + i }));
    const t = gsAll({ list: LIST, throwOn: (n) => n === 1, reply: () => ({ code: 200, body: TOOL_ONE() }) });
    const o2 = t.agentIdentifyShots({ context: CTX1, shots });
    eq(o2.ok, true, '⚠ a slow photograph no longer throws the call away');
    eq(Object.keys(o2.results).length, 9, 'all nine named: the first slice, and the second on the fallback');
    eq(payload(t.sent[2][0]).model, 'claude-opus-6-1', 'the slice that ran long went again on the newest Opus');
    eq(o2.timedOut, true, 'and the answer says something ran long');
    const t2 = gsAll({ list: LIST, throwOn: (n) => n >= 1, reply: () => ({ code: 200, body: TOOL_ONE() }) });
    const o3 = t2.agentIdentifyShots({ context: CTX1, shots });
    eq([o3.ok, Object.keys(o3.results).length, Object.keys(o3.failed).length], [true, 8, 1], 'the fallback ran long too: that photograph failed by name, the rest kept');
    has(o3.failed.p9, 'took too long', 'named as such, unnamed and asked again on the next run');
  }

  group('S2 · rejected, busy, cut off or the fallback field refused: each goes again once, the right way');
  {
    const shotOne = (reply, list) => { const g = gsAll({ list: list || LIST, reply }); return { g, out: g.agentIdentifyShots({ context: CTX1, shots: [SHOT()] }) }; };
    let r = shotOne((b) => (b.model === 'claude-fable-6' ? { code: 400, body: { error: { message: 'tools.0: web_search_20260209 is not supported on this model' } } } : { code: 200, body: TOOL_ONE() }));
    eq((r.out.results.s1 || {}).model, 'claude-opus-6-1', '⚠ a request the first choice rejected is answered on the fallback');
    eq(r.g.cache.agent_demote_name && r.g.cache.agent_demote_name.v, '1', '…and the first choice is set aside (six hours)');
    r = shotOne((b) => (b.model === 'claude-fable-6' ? { code: 529, body: { error: { type: 'overloaded_error', message: 'Overloaded' } } } : { code: 200, body: TOOL_ONE() }));
    eq((r.out.results.s1 || {}).model, 'claude-opus-6-1', 'busy: answered on the fallback');
    eq(r.g.cache.agent_demote_name, undefined, '…without setting the first choice aside (busy passes)');
    r = shotOne((b) => (b.model === 'claude-fable-6' ? { code: 200, body: { stop_reason: 'max_tokens', content: [] } } : { code: 200, body: TOOL_ONE() }));
    eq((r.out.results.s1 || {}).model, 'claude-opus-6-1', 'cut off at its ceiling: answered on the fallback');
    r = shotOne((b) => (b.fallbacks ? { code: 400, body: { error: { message: 'fallbacks: not available for this organization' } } } : { code: 200, body: TOOL_ONE() }));
    eq([(r.out.results.s1 || {}).model, r.g.sent.length], ['claude-fable-6', 2], 'the refusal-fallback field refused: sent again on the same model, without it');
    ok(!('fallbacks' in payload(r.g.sent[1][0])) && !r.g.sent[1][0].headers['anthropic-beta'], '…carrying neither the field nor its header');
    r = shotOne(() => ({ code: 400, body: { error: { message: 'messages.0: image could not be read' } } }));
    eq([r.out.failed.s1, r.g.sent.length], ['messages.0: image could not be read', 2], 'rejected by both: failed by name after one try on each');
    eq(r.g.cache.agent_demote_name, undefined, '…and nothing set aside, since the fallback did no better');
    r = shotOne(() => ({ code: 200, body: { stop_reason: 'refusal', stop_details: { category: 'cyber' }, content: [] } }));
    eq([r.out.failed.s1, r.g.sent.length], ['the model declined this image (cyber)', 1], 'a refusal is the whole chain declining (the server already tried its fallback): failed by name');
    const pinned = gsAll({ list: LIST, props: { ANTHROPIC_API_KEY: 'k', AGENT_MODEL_PIN: 'claude-opus-5-5' }, reply: () => ({ code: 529, body: { error: { message: 'Overloaded' } } }) });
    pinned.agentIdentifyShots({ context: CTX1, shots: [SHOT()] });
    eq(pinned.sent.map((x) => payload(x[0]).model), ['claude-opus-5-5'], '⚠ pinned, with a newer Opus on the list: sent once, never to the Opus it was pinned away from');
  }

  group('S3 · the room check through the same sender');
  {
    const shots = (n) => Array.from({ length: n }, (_, i) => ({ id: 's' + i, fileId: 'FID', lines: [{ label: 'X' + i, name: 'Lamp ' + i }] }));
    const ok1 = { stop_reason: 'tool_use', content: [{ type: 'tool_use', name: 'record_doubles', input: { doubles: [] } }] };
    const g = gsAll({ list: LIST, throwOn: (n) => n === 0, reply: () => ({ code: 200, body: ok1 }) });
    const out = g.agentCheckRooms({ context: { fiduciary: true }, rooms: [{ key: '2', room: 'Den', shots: shots(3) }] });
    ok(!!out.results['2'], 'a room whose run went past the limit is read on the fallback');
    eq((out.results['2'] || {}).model, 'claude-opus-6-1', '…which the answer names');
    eq(payload(g.sent[0][0]).fallbacks, 'default', 'with the refusal fallback on the room check too');
  }

  group('⚠⚠ S4 · Agent Two: the fallback for a slow, busy or rejected request; passing failures handed back as retry, never stamped');
  {
    const g = gsAll({ list: LIST, reply: (b) => (b.model === 'claude-fable-6' ? { code: 529, body: { error: { message: 'Overloaded' } } } : { code: 200, body: ANSWER2([VAL()]) }) });
    const out = g.agentValueLines({ context: CTX2, items: [LINE()] });
    eq([out.results.v1 && out.results.v1.model, out.model], ['claude-opus-6-1', 'claude-fable-6'], 'busy on the first choice: valued on the fallback');
    const both = gsAll({ list: LIST, reply: () => ({ code: 529, body: { error: { message: 'Overloaded' } } }) });
    const o2 = both.agentValueLines({ context: CTX2, items: [LINE()] });
    eq([o2.retry.v1, o2.failed.v1], ['Overloaded', undefined], '⚠ busy on both: handed back to ask again, never stamped not valued');
    const rej = gsAll({ list: LIST, cache: {}, reply: (b) => (b.model === 'claude-fable-6' ? { code: 400, body: { error: { message: 'output_config.effort: unsupported' } } } : { code: 200, body: ANSWER2([VAL()]) }) });
    rej.agentValueLines({ context: CTX2, items: [LINE()] });
    eq(rej.cache.agent_demote_value && rej.cache.agent_demote_value.v, '1', 'rejected by the first choice and answered by the fallback: set aside (six hours)');
    const skip = gsAll({ list: LIST, reply: () => ({ code: 200, body: ANSWER2([VAL()]) }) });
    const o3 = skip.agentValueLines({ context: CTX2, items: [LINE(), LINE({ stableId: 'v2' })] });
    eq([o3.retry.v2, o3.failed.v2], ['the model did not answer for this line', undefined], 'a line the model skipped: asked again, not stamped');
    const unv = gsAll({ list: LIST, reply: () => ({ code: 200, body: ANSWER2([], [{ line: 'L1', reason: 'cannot tell what it is' }]) }) });
    eq(unv.agentValueLines({ context: CTX2, items: [LINE()] }).failed.v1, 'cannot tell what it is', 'the model\'s own unvalued stays a verdict');
    const slow = gsAll({ list: LIST, throwOn: (n) => n === 0, reply: () => ({ code: 200, body: ANSWER2([VAL()]) }) });
    const o4 = slow.agentValueLines({ context: CTX2, items: [LINE()] });
    eq([o4.results.v1 && o4.results.v1.model, o4.timedOut], ['claude-opus-6-1', true], 'past the limit on the first choice: valued on the fallback, and it says so');
  }


  group('⚠⚠ S5 · on review: every request the fallback field was refused on goes again without it; nothing resent past the deadline');
  {
    const refused = { code: 400, body: { error: { message: 'fallbacks: not available for this organization' } } };
    const shots = Array.from({ length: 8 }, (_, i) => SHOT({ stableId: 'f' + i }));
    const g = gsAll({ list: LIST, reply: (b) => (b.fallbacks ? refused : { code: 200, body: TOOL_ONE() }) });
    const out = g.agentIdentifyShots({ context: CTX1, shots });
    eq([Object.keys(out.results || {}).length, Object.keys(out.failed || {}).length], [8, 0], '⚠⚠ eight photographs on an account that refuses the field: all eight named, none failed');
    eq(g.sent.map((x) => x.length), [8, 8], 'the slice once with the field, then all of it again without');
    const okR = { stop_reason: 'tool_use', content: [{ type: 'tool_use', name: 'record_doubles', input: { doubles: [] } }] };
    const room = (n) => ({ key: String(n), room: 'Room ' + n, shots: [0, 1, 2].map((i) => ({ id: 'r' + n + i, fileId: 'FID', lines: [{ label: 'X' + n + i, name: 'Lamp ' + i }] })) });
    const h = gsAll({ list: LIST, reply: (b) => (b.fallbacks ? refused : { code: 200, body: okR }) });
    const ro = h.agentCheckRooms({ context: { fiduciary: true }, rooms: [room(1), room(2), room(3)] });
    eq(Object.keys(ro.results || {}).sort(), ['1', '2', '3'], '⚠ three rooms on that account: all three read');
    const busy = { code: 529, body: { error: { message: 'Overloaded' } } };
    const build = (it, model) => ({ url: 'https://api.anthropic.com/v1/messages', payload: JSON.stringify({ model }), headers: {} });
    const late = gsAll({ list: LIST, reply: () => busy });
    const lo = late._agSendAll([{ id: 1 }], build, (res) => late._agReadResult(res), { first: 'A', fallback: 'B' }, 'name', 0, {});
    eq([late.sent.length, lo.answers[0].ok], [1, false], '⚠ past the deadline a busy request is answered as it stands, never sent again (Apps Script\'s six minutes)');
    const early = gsAll({ list: LIST, reply: () => busy });
    early._agSendAll([{ id: 1 }], build, (res) => early._agReadResult(res), { first: 'A', fallback: 'B' }, 'name', Infinity, {});
    eq(early.sent.map((x) => payload(x[0]).model), ['A', 'B'], 'inside it, once on the fallback');
  }

  group('⚠⚠ S6 · on review, Agent Two: continuations per request; nothing resent past the budget; a firearm stays Firearms; the room note and a person\'s category');
  {
    let fb = 0;
    const pause = { stop_reason: 'pause_turn', content: [{ type: 'server_tool_use', id: 'srv1', name: 'web_search', input: { query: 'q' } }] };
    const g = gsAll({ list: LIST, reply: (b) => {
      if (b.model === 'claude-fable-6') return { code: 529, body: { error: { message: 'Overloaded' } } };
      fb++; return fb <= 2 ? { code: 200, body: pause } : { code: 200, body: ANSWER2([VAL({ source: 'Online comps' })]) }; } });
    const out = g.agentValueLines({ context: CTX2, items: [LINE({ mode: 'comps', qty: 1 })] });
    eq([!!(out.results || {}).v1, (out.failed || {}).v1], [true, undefined], '⚠⚠ busy on the first choice, then two pauses on the fallback: valued, its continuations its own');
    let top = 0, fb2 = 0;
    const g2 = gsAll({ list: LIST, reply: (b) => {
      if (b.model === 'claude-fable-6') { top++; return top <= 2 ? { code: 200, body: pause } : { code: 529, body: { error: { message: 'Overloaded' } } }; }
      fb2++; return fb2 <= 2 ? { code: 200, body: pause } : { code: 200, body: ANSWER2([VAL({ source: 'Online comps' })]) }; } });
    const out2 = g2.agentValueLines({ context: CTX2, items: [LINE({ mode: 'comps', qty: 1 })] });
    eq([!!(out2.results || {}).v1, (out2.failed || {}).v1], [true, undefined], '⚠ two pauses on the first choice, then busy: the fallback starts its continuations afresh');
    // AGENT_VALUE_TIME_BUDGET is 120 s: the slice starts inside it, the answer lands past it.
    const slow = gsAll({ list: LIST, tick: 70000, reply: (b) => (b.model === 'claude-fable-6' ? { code: 529, body: { error: { message: 'Overloaded' } } } : { code: 200, body: ANSWER2([VAL()]) }) });
    const so = slow.agentValueLines({ context: CTX2, items: [LINE()] });
    eq([slow.sent.length, (so.retry || {}).v1, (so.results || {}).v1], [1, 'Overloaded', undefined], '⚠ busy past the time budget: handed back to ask again, never a second request');
    const gun = gsAll({ list: LIST, reply: () => ({ code: 200, body: ANSWER2([VAL({ category: 'Antiques', source: 'Online comps' })]) }) });
    const go = gun.agentValueLines({ context: CTX2, items: [LINE({ mode: 'comps', qty: 1, category: 'Firearms', name: 'Percussion pistol, likely 19th century' })] });
    eq(((go.results || {}).v1 || {}).category, '', '⚠⚠ a line filed Firearms is never moved out of it (the firearm protocol keys on the category)');
    const lot = gsAll({ list: LIST, reply: () => ({ code: 200, body: ANSWER2([VAL()]) }) });
    lot.agentValueLines({ context: CTX2, items: [LINE({ fileId: 'FID', name: 'Hand-painted plates, likely Italian', roomNote: 'the dining china was her mother\'s', categoryChecked: true })] });
    const text = payload(lot.sent[0][0]).messages[0].content.filter((c) => c.type === 'text').map((c) => c.text).join('\n');
    has(text, 'Walkthrough note for its room: "the dining china was her mother\'s"', '⚠ a photographed ordinary lot carries the walkthrough\'s room note the app sent');
    has(text, '| Category checked by a person', 'a category a person set is marked');
    has(gsFn('_avSystem'), 'on a line whose name or category a person checked, and on a line filed Firearms', 'and the prompt gives both back as given');
  }

  // ═══════════════════════════════ P · THE PROMPTS ═══════════════════════════════
  group('P1 · Agent One: what tells a thing apart, the notes, the cabinet, the categories, a matched set, people, close-ups, the basis');
  {
    const g = gsAll();
    const sys = g._agSystem(CTX1);
    has(sys, 'Most lines are read later only as your words, without the photograph, so put in the name what tells this one apart', '⚠ the name carries what decides the value');
    has(sys, 'hand-knotted or machine-made where the back or a close-up shows it', 'a rug\'s knot');
    has(sys, 'the maker, and the model where a label is legible', 'a model off a legible label');
    has(sys, 'THE NOTES WITH A PHOTOGRAPH', 'the crew\'s note has its own rules');
    has(sys, 'the size, which goes into the name as they said it', 'a size the crew says goes into the name');
    has(sys, 'Never put the name of the owner, a relative or a recipient in a name.', '⚠⚠ never a family member\'s name in an item\'s name');
    has(sys, 'never record something because the note mentions it', 'the walkthrough note recognises, never invents');
    has(sys, 'One exception: a freestanding bookcase, china cabinet or display cabinet photographed full', 'the cabinet photographed full is the piece and its contents');
    has(sys, 'Antiques is for pieces that look about a hundred years old or more', '⚠ Antiques (Anthony: "Yes, both")');
    has(sys, 'is General/Household unless a signature, an edition number or a maker\'s mark is readable on it', '⚠ mass-produced decor is household goods, unless marked');
    has(sys, 'Where you cannot tell an original from a decorator print, it is Art & Décor.', 'the safe side on an estate');
    has(sys, 'Give a line of its own to anything in these categories: Art & Décor,', 'the category spelled as the list spells it');
    has(sys, 'a matched set of one kind (a sterling flatware service, matching candlesticks) is still one line', 'a set of one kind is one line');
    has(sys, 'a group of mixed things (a crock of utensils, a drawer of odds and ends) is one line with qty 1', 'a mixed group is qty 1');
    has(sys, 'Never describe a person who appears in the photograph', 'people in the photograph');
    has(sys, 'The subject of a painting, print or sculpture is part of the object', '…but a portrait\'s subject is the object');
    has(sys, 'In basis, begin with "Read:" and quote what you read', '⚠ a mark read begins "Read:"');
    has(sys, 'kind "other": anything else a person must see or do that the name cannot carry', 'Look at this is for something to do');
    has(sys, 'hedge in the words themselves: "appears to be", "likely", "in the style', 'the hedged guess stays (Anthony, 2026-10-25)');
    const tool = g._agTool(CATS).input_schema.properties.objects.items.properties;
    has(tool.basis.description, 'begin with "Read:" and quote what it says', 'the tool says it too');
    has(tool.name.description, 'never with a count: how many goes in qty', 'and no count in a name, as before');
    const user = g._agUserContent(SHOT({ details: [{ fileId: 'DET' }] }));
    has(user.slice(-1)[0].text, 'a mark, signature, hallmark or label, its back, a corner, a title page or damage', 'close-ups as the crew takes them');
    has(user.slice(-1)[0].text, 'do NOT record', 'and never recorded as objects of their own');
  }

  group('⚠⚠ P2 · Agent Two: the category under the name\'s rule, confidence on an ordinary lot, the basis as printed, the market, guessed names seen');
  {
    const g = gsAll();
    const sys = g._avSystem(CTX2);
    has(sys, 'THE CATEGORY', 'a category section where the app sends the list');
    has(sys, 'Give every line\'s category back in category: the one given, unless on a RESEARCH line', '⚠ only a research line\'s category changes');
    has(sys, '- Never change a line\'s quantity, and change its category only as THE CATEGORY says.', 'the bar says so');
    lacks(g._avSystem({ estate: true }), 'THE CATEGORY', 'an app that sends no list gets the old rule');
    has(g._avSystem({ estate: true }), '- Never change a line\'s category or its quantity.', '…word for word');
    const props = g._avTool('comps', CATS).input_schema.properties.values.items;
    eq(props.properties.category.enum, CATS, 'the strict tool\'s category is an enum of the app\'s list');
    ok(props.required.indexOf('category') >= 0, 'and required');
    eq(g._avTool('comps', []).input_schema.properties.values.items.properties.category, undefined, 'no list, no field');
    has(sys, 'On an ORDINARY lot, confidence says how well the going rate for that kind of lot is known, not how many sales you cited', '⚠ an everyday lot is not low for citing nothing');
    has(sys, 'never with this line\'s count or its name, so it stays true if a person corrects the count', '⚠ the basis never carries the count');
    has(props.properties.basis.description, 'printed beside the figure on the inventory the family, their attorney or a trustee reads', 'the tool says where it prints');
    has(sys, 'sells used for a fraction of its retail price', 'a retail brand at its second-hand price (the Restoration Hardware mirror)');
    has(sys, 'vintage audio and other collected electronics can hold theirs', '…without pushing vintage audio down');
    has(sys, 'Search for the going used rate of each kind of lot in the batch, not of each line', 'one search per kind of lot');
    has(sys, 'Some ordinary lots come with their photograph, labelled with the line\'s label, because the name is a guess', '⚠⚠ a guessed name is seen (Anthony: "agent 1 guess and agent 2 confirm")');
    has(sys, 'Put a line under unvalued only when you cannot tell what it is, or it is papers or records.', '⚠ a best estimate over unvalued (Anthony)');
    has(props.properties && g._avTool('general', CATS).input_schema.properties.unvalued.description, 'A best estimate on thin evidence goes under values with confidence low, never here.', 'the tool says it too');
    has(sys, 'never put the name of the owner, a relative or a recipient in a name, whatever the crew noted', 'Agent Two keeps family names out too');
    has(sys, 'an overstated or understated figure or an invented comparable', 'the estate warns both ways');
    has(sys, '"Stainless flatware, everyday brand", Quantity 60', 'its own example carries no count');
    ['3,000', '3000', '$500', 'threshold', '$250', '250'].forEach((w) => lacks(sys, w, 'still never told a threshold: ' + w));
  }

  group('P3 · Agent Two\'s request: the room, the shared photograph, a guessed name\'s photograph labelled, research images labelled');
  {
    const g = gsAll();
    const t = g._avLineText('L1', { name: 'Coffee table', qty: 1, room: 'Living Room', photoNote: 'the table is Crate & Barrel', alsoListed: ['Wool rug', 'Brass lamp'] });
    has(t, ' | Room: Living Room', 'the room');
    has(t, 'The crew said over the photograph this line shares (it may be about another thing in it): "the table is Crate & Barrel"', '⚠ the crew\'s note on a shared photograph, marked as possibly another thing\'s');
    has(t, 'Its photograph also shows, listed as lines of their own: Wool rug; Brass lamp', 'what else the photograph shows');
    const gen = g._avUserContent({ mode: 'general', labels: ['L1', 'L2'], items: [LINE({ fileId: 'FID' }), LINE({ stableId: 'v2' })] });
    eq(gen.map((c) => c.type), ['text', 'image', 'text'], 'a guessed name\'s photograph rides in an ordinary batch');
    eq(gen[0].text, 'L1\'s photograph:', 'labelled with its line');
    has(gen[2].text, 'Its photograph is above, labelled L1', 'and the line says so');
    const lost = g._avUserContent({ mode: 'general', labels: ['L1'], items: [LINE({ fileId: 'GONE' })] });
    eq(lost.map((c) => c.type), ['text'], 'a photograph not in Drive costs that lot its picture, never the batch');
    const res = g._avUserContent({ mode: 'comps', labels: ['L1'], items: [LINE({ mode: 'comps', fileId: 'FID', details: [{ fileId: 'DET' }], roomNote: 'Henredon set' })] });
    eq(res.map((c) => c.type === 'text' ? c.text.split('\n')[0] : 'IMG'), ['The photograph:', 'IMG', 'Close-up 1:', 'IMG',
      'RESEARCH. One line to value, with its photograph and close-ups taken of it (a mark, a label, its back, a corner or damage):'], '⚠ each image labelled, so the main frame is never taken for a close-up');
    has(res.slice(-1)[0].text, 'Walkthrough note for this room: "Henredon set"', 'and the walkthrough\'s room note');
  }

  group('⚠⚠ P4 · no sold comparable, no "comps": a researched figure that rests on no sale prints as a general estimate');
  {
    const g = gsAll();
    const seen = { 'liveauctioneers.com/item/1': 1 };
    const none = g._avLineResult(VAL({ source: 'Auction comps', comps: [{ title: 'x', venue: 'v', saleDate: '', price: 50, url: 'https://ebay.com/itm/9', kind: 'asking' }] }), 'comps', { 'ebay.com/itm/9': 1 });
    eq([none.source, none.confidence, none.mode], ['General estimate', 'low', 'comps'], '⚠ asking prices only: General estimate, low, still a research answer (the ceiling never re-sends it)');
    const sold = g._avLineResult(VAL({ source: 'Auction comps', confidence: 'high', comps: [{ title: 'x', venue: 'LA', saleDate: '2026-05', price: 90, url: 'https://www.liveauctioneers.com/item/1', kind: 'sold' }] }), 'comps', seen);
    eq(sold.source, 'Auction comps', 'with a sold comparable it keeps its source');
    eq(g._avLineResult(VAL({ category: 'Furniture' }), 'comps', {}).category, 'Furniture', 'a research line\'s category comes back');
    eq(g._avLineResult(VAL({ category: 'Furniture' }), 'general', {}).category, '', 'an ordinary lot\'s never does');
  }

  group('P5b · testAgentIdentify sends an Items photograph, as production does (never the first JPEG it meets)');
  {
    const g = gsAll({ list: LIST, reply: () => ({ code: 200, body: TOOL_ONE() }) });
    const file = (name, id) => ({ getName: () => name, getId: () => id });
    const iter = (arr) => { let i = 0; return { hasNext: () => i < arr.length, next: () => arr[i++] }; };
    g.ROOT_FOLDER_ID = 'ROOT';
    g.DriveApp.getFolderById = () => ({ getFilesByType: () => iter([file('HVL-0007_Kitchen_BEFORE_1.jpg', 'FID'), file('HVL-0007_Kitchen_INV_2.jpg', 'P2')]), getFolders: () => iter([]) });
    let err = '';
    try { vm.runInContext(gsFn('testAgentIdentify'), g); g.testAgentIdentify(); } catch (e) { err = String(e && e.message || e); }
    eq(err, '', 'the probe runs');
    has(g.logs.join('\n'), 'Photo: HVL-0007_Kitchen_INV_2.jpg', '⚠ the Items photograph, passing the as-found one before it');
    has(g.logs.join('\n'), 'answered in', 'and it prints the seconds and the model');
  }

  // Restated 2026-10-26b (agent-value.test.js S3c): the comparable rule leads the banner; this build's gap is named by its vintage.
  group('P5 · the deployment: at least 2026-10-26, the app relies on it, and the banner names its gap');
  {
    ok(gsAll().BACKEND_VERSION >= '2026-10-26', 'main-sync.gs is 2026-10-26 or later');
    const app = sandbox({ vars: ['BACKEND_MIN_VERSION', 'BACKEND_FEATURE_COST'] });
    ok(app.BACKEND_MIN_VERSION >= '2026-10-26', 'and the app relies on it');
    has(app.BACKEND_FEATURE_COST.version, 'on a deployment older than 2026-10-26, the agents never move to a newer model by themselves', 'the banner names this build\'s gap, by consequence and vintage');
    has(app.BACKEND_FEATURE_COST.version, 'on a deployment older than 2026-10-25b, a name you type or review on the desk', 'and 2026-10-25b\'s after it, by its vintage');
    lacks(GS, "var AGENT_MODEL ", 'no model constant of its own per agent any more');
    lacks(GS, 'AGENT_VALUE_FALLBACK_BETA', 'one refusal-fallback constant for the three calls');
  }

  // ═══════════════════════════════ A · THE APP ═══════════════════════════════
  group('⚠⚠ A1 · an empty answer is not asked again, and its row says nothing to list');
  {
    const S = sandbox({ fns: ['agentNameableRefs', 'agentShotGroups', '_jobInvRefs', '_invFileId'],
      stubs: { _photoRefs: { 7: [ROW({ stableId: 'e', objectName: '', namedBy: undefined, agentConf: 'none' }), ROW({ stableId: 'b', objectName: '', namedBy: undefined })] } } });
    eq(S.agentNameableRefs(7).map((r) => r.stableId), ['b'], '⚠ a photograph Agent One found nothing in is not sent again');
    const row = fn('_renderInvRow');
    has(row, 'nothing to list</span>', 'the row says nothing to list');
    has(row, "ref.agentConf === 'none'", '…read off the empty answer\'s stamp');
    has(row, 'Remove line takes the line off and keeps the photograph', 'and says what to press, the photograph kept');
  }

  group('⚠⚠ A2 · a name typed while a run was out is never written over; the notes are added to, never replaced');
  {
    const refs = [ROW({ stableId: 'p', objectName: '', namedBy: undefined, agentNotices: [{ kind: 'firearm', text: 'long gun case behind the coats' }] }),
                  ROW({ stableId: 'q', objectName: '', namedBy: undefined, derivedFrom: 'p' })];
    // invSplitItemN is stubbed, never lifted (a lifted function overrides the stub): a split here is the defect.
    const S = sandbox({ fns: ['agentApplyResult', '_agWrite', '_invCondIsAgents', '_invAgentCondition', '_agState', '_getPhotoRef', '_setPhotoRef', '_agNameKey'],
      vars: ['_agRun', 'AGENT_CONDITIONS', 'INV_TAXONOMY', 'INV_CATEGORIES', 'INV_DEFAULT_CATEGORY'],
      stubs: { _photoRefs: { 7: refs }, _invTouch: (r) => r, invSplitItemN: () => { throw new Error('must not split'); } } });
    S._getPhotoRef(7, 'q').objectName = 'Grey strongbox';   // typed on the desk while the run was out
    S._getPhotoRef(7, 'q').namedBy = 'desk';
    let threw = '';
    try {
      S.agentApplyResult(7, { srcId: 'p', rows: ['p', 'q'] }, { objects: [{ name: 'Wool coats', category: 'General/Household', qty: 6, confidence: 'high', basis: 'x' },
        { name: 'Metal box', category: 'General/Household', qty: 1, confidence: 'low', basis: 'y' }, { name: 'Gun case', category: 'General/Household', qty: 1, confidence: 'low', basis: 'z' }],
        notices: [{ kind: 'other', text: 'label on the case unreadable' }] });
    } catch (e) { threw = String(e && e.message || e); }
    eq(threw, '', '⚠ a photograph a person has been at is not split for the surplus');
    // 2026-10-26, on review: once a person has been at the photograph nothing is written by position (the first object, the
    // strongbox just typed, would have gone onto the other row); the blank row stays blank for Name shots to ask again.
    eq([S._getPhotoRef(7, 'p').objectName, S._getPhotoRef(7, 'p').agentConf === 'none', S._getPhotoRef(7, 'q').objectName, S._getPhotoRef(7, 'q').namedBy], ['', false, 'Grey strongbox', 'desk'],
       '⚠⚠ the name typed meanwhile stands, still the desk\'s; the blank row stays blank and unstamped, nothing mapped by position');
    eq([S._agState(7).skipped, S._agState(7).again, S._agState(7).named], [1, 1, 0], 'counted as left alone, the photograph to ask again, nothing named');
    eq(S._getPhotoRef(7, 'p').agentNotices.map((n) => n.kind), ['firearm', 'other'], '⚠⚠ the first reading\'s Firearm stays beside the second\'s note');
  }

  group('⚠ A2b · on review: the only row named by hand while the run was out, and the answer saw more: one blank row for Name shots to ask again');
  {
    const minted = [];
    const S = sandbox({ fns: ['agentApplyResult', '_agWrite', '_invCondIsAgents', '_invAgentCondition', '_agState', '_getPhotoRef', '_setPhotoRef', '_agNameKey', '_agStateHtml', '_agFailureKind'],
      vars: ['_agRun', 'AGENT_CONDITIONS', 'INV_TAXONOMY', 'INV_CATEGORIES', 'INV_DEFAULT_CATEGORY'],
      stubs: { _photoRefs: { 7: [ROW({ stableId: 'p', objectName: 'Silver tea service', namedBy: 'desk' })] }, _invTouch: (r) => r, esc: (x) => String(x),
        invSplitItemN: (j, src, n) => { const r = ROW({ stableId: 'n' + minted.length, objectName: '', namedBy: undefined, derivedFrom: src }); minted.push([src, n]); return [r]; } } });
    S.agentApplyResult(7, { srcId: 'p', rows: ['p'] }, { objects: [{ name: 'Silver tea service', category: 'Silver & Precious Metal', qty: 1, confidence: 'high', basis: 'x' },
      { name: 'Pair of brass candlesticks', category: 'General/Household', qty: 2, confidence: 'high', basis: 'y' }], notices: [] });
    eq([S._getPhotoRef(7, 'p').objectName, minted], ['Silver tea service', [['p', 1]]], '⚠ the typed name stands; one blank row is added off the photograph, nothing written by position');
    S._agState(7).total = 1;   // the run sent one photograph
    has(S._agStateHtml(7), '1 left alone: named on the desk meanwhile (press Name shots for what else that photograph shows)', '⚠ the work bar says a row was left alone, and what to press');
    const T = sandbox({ fns: ['agentApplyResult', '_agWrite', '_invCondIsAgents', '_invAgentCondition', '_agState', '_getPhotoRef', '_setPhotoRef', '_agNameKey'], vars: ['_agRun', 'AGENT_CONDITIONS', 'INV_TAXONOMY', 'INV_CATEGORIES', 'INV_DEFAULT_CATEGORY'],
      stubs: { _photoRefs: { 7: [ROW({ stableId: 'p', objectName: 'Silver tea service', namedBy: 'desk' })] }, _invTouch: (r) => r, invSplitItemN: () => { throw new Error('must not split'); } } });
    let threw = '';
    try { T.agentApplyResult(7, { srcId: 'p', rows: ['p'] }, { objects: [{ name: 'Tea service', category: 'General/Household', qty: 1, confidence: 'high', basis: 'x' }], notices: [] }); }
    catch (e) { threw = String(e && e.message || e); }
    eq([threw, T._agState(7).again], ['', 0], 'one object for the one row named by hand: nothing added, nothing to ask again');
  }

  group('A3 · why a photograph was not named, grouped; the close-ups Agent One reads are the first four taken');
  {
    const S = sandbox({ fns: ['_agFailureKind', '_agStateHtml', '_agState'], vars: ['_agRun'], stubs: { esc: (x) => String(x) } });
    eq(['the photograph took too long to come back (Timeout)', 'the model declined this image (cyber)', 'File not found: 1Ab', 'Overloaded', 'the answer was cut off before it finished']
      .map(S._agFailureKind), ['took too long', 'declined by the model: name it by hand', 'not in Drive yet', 'service busy', 'answer cut off'], 'each reason in a few words');
    const st = S._agState(7);
    Object.assign(st, { total: 5, named: 2, failed: 3, failures: { a: 'took too long to come back', b: 'took too long to come back', c: 'the model declined this image' } });
    has(S._agStateHtml(7), '3 could not be read (2 took too long, 1 declined by the model: name it by hand): press Name shots to try again', 'the work bar groups them and says whether trying again helps');
    const D = sandbox({ fns: ['_agDetailRefs', '_invFileId'], vars: ['AGENT_MAX_DETAILS'],
      stubs: { _photoRefs: { 7: [5, 1, 4, 2, 3, 6].map((n) => ({ stableId: 'd' + n, label: 'detail', groupId: 'p', driveFileId: 'F' + n, ts: n })) } } });
    eq(D._agDetailRefs(7, 'p').map((r) => r.ts), [1, 2, 3, 4], '⚠ the first four taken, as the field guide promises, whatever the manifest\'s order');
    const C = sandbox({ fns: ['invLineCloseUps', '_invFileId'], vars: ['AGENT_MAX_DETAILS'],
      stubs: { _photoRefs: { 7: [1, 2, 3, 4, 5].map((n) => ({ stableId: 'd' + n, label: 'detail', groupId: 'p', driveFileId: 'F' + n, ts: n })) } } });
    eq(C.invLineCloseUps(7, { stableId: 'p' }).map((r) => r.ts), [5, 4, 3, 2], '⚠ Agent Two reads the newest first, so a close-up added at the desk is among them');
  }

  group('⚠⚠ A4 · "Read:" is a mark read; the widened net strikes what was not read');
  {
    const V = sandbox({ fns: ['agentValueMode', 'invIsIntrinsic', 'invCatMeta', '_avNameIsAgents'], vars: ['AGENT_VALUE_MARK_RE', 'AGENT_VALUE_NO_MARK_RE', 'AGENT_VALUE_READ_RE', 'INV_TAXONOMY'],
      stubs: { _avForceComps: {} } });
    const mode = (b) => V.agentValueMode({ stableId: 'x', category: 'Furniture', agentBasis: b, namedBy: 'agent', agentConf: 'high' });
    eq(mode('Read: Henredon tag inside drawer'), 'comps', '⚠ a mark read: researched');
    eq(mode('Read: none'), 'general', '"Read: none" is no reading');
    eq(mode('Read: not legible'), 'general', 'nor "Read: not legible"');
    ['maker unknown', 'not signed', 'signature not visible', 'model unclear', 'cannot read the mark', 'mark too blurred to read', 'shape, glaze and construction; nothing legible']
      .forEach((b) => eq(mode(b), 'general', 'an everyday lot: ' + b));
    ['unknown maker', 'unidentified mark on the base'].forEach((b) => eq(mode(b), 'general', 'an everyday lot: ' + b));
    ['label reads Baker Furniture', 'stamp reads 925', 'illegible mark beside a legible Gorham hallmark'].forEach((b) => eq(mode(b), 'comps', 'the net still catches: ' + b));
  }

  group('⚠⚠ A5 · a guessed name is sent with its photograph; the room, the shared note and what else is listed; a typed name without Agent One\'s reasons');
  {
    const refs = [ROW({ stableId: 'p', objectName: 'Coffee table, appears to be walnut', fieldNote: 'the table is Crate & Barrel', agentBasis: 'form' }),
      ROW({ stableId: 'q', objectName: 'Wool rug, likely Persian', derivedFrom: 'p', agentBasis: 'pattern' }),
      // Graded, so they travel as text (2026-10-26b: a line nobody has graded goes with its photograph, checked below).
      ROW({ stableId: 'r', objectName: 'Restoration Hardware wall mirror', namedBy: 'desk', agentBasis: 'wood frame, no visible maker\'s mark', reviewed: true, condition: 'Good', condBy: 'desk' }),
      ROW({ stableId: 't', objectName: 'Everyday stainless flatware', agentConf: 'high', condition: 'Good', condBy: 'agent' }),
      ROW({ stableId: 'u', objectName: 'Everyday stainless flatware', agentConf: 'high' })];
    const R = rig(ESTATE(), refs);
    const p = R.ctx._avItemPayload(7, R.ctx._getPhotoRef(7, 'q'));
    eq([p.mode, p.fileId], ['general', 'FID'], '⚠⚠ an ordinary lot whose name is a hedged guess rides with its photograph');
    eq(p.details, [], '…still an ordinary lot: no close-ups');
    eq([p.room, p.photoNote, p.fieldNote], ['Dining Room', 'the table is Crate & Barrel', ''], '⚠ the room, and the crew\'s note said over the shared photograph');
    eq(p.alsoListed, ['Coffee table, appears to be walnut'], 'and what else is listed off it');
    eq(p.roomNote, 'client says the dining set is Henredon', 'with the photograph, the walkthrough\'s room note');
    const own = R.ctx._avItemPayload(7, R.ctx._getPhotoRef(7, 'p'));
    eq([own.fieldNote, own.photoNote], ['', 'the table is Crate & Barrel'], 'on the photograph\'s own line the shared note travels once, as the photograph\'s');
    const typed = R.ctx._avItemPayload(7, R.ctx._getPhotoRef(7, 'r'));
    eq([typed.nameChecked, typed.agentBasis, typed.fileId], [true, '', ''], '⚠ a name a person typed: marked, without Agent One\'s reasons, never "a guess"');
    eq(R.ctx._avItemPayload(7, R.ctx._getPhotoRef(7, 't')).fileId, '', 'a sure everyday name already graded travels as text, as before');
    eq(R.ctx._avItemPayload(7, R.ctx._getPhotoRef(7, 'u')).fileId, 'FID', '⚠ one nobody has graded goes with its photograph, so Agent Two can grade it (2026-10-26b)');
    eq(R.ctx._avContext(ESTATE()).categories, R.ctx.INV_CATEGORIES, 'the category list rides the context');
  }

  group('⚠⚠ A6 · the category comes back under the name\'s rule; an unknown source is the depth\'s own word');
  {
    const R = rig(ESTATE(), [ROW({ stableId: 'a', category: 'Antiques' }), ROW({ stableId: 'b', category: 'Antiques', reviewed: true }),
      ROW({ stableId: 'c', category: 'Antiques', namedBy: 'desk' }), ROW({ stableId: 'd', objectName: 'Plates' })]);
    R.ctx._avWrite(7, 'a', RES({ category: 'Furniture', name: 'Brass table lamp, 1990s reproduction' }), ESTATE(), {});
    eq([R.ctx._getPhotoRef(7, 'a').category, R.ctx._getPhotoRef(7, 'a').objectName], ['Furniture', 'Brass table lamp, 1990s reproduction'], '⚠ Agent One\'s unreviewed line: category and name corrected together');
    R.ctx._avWrite(7, 'b', RES({ category: 'Furniture' }), ESTATE(), {});
    eq(R.ctx._getPhotoRef(7, 'b').category, 'Antiques', 'a reviewed line keeps its category');
    R.ctx._avWrite(7, 'c', RES({ category: 'Furniture' }), ESTATE(), {});
    eq(R.ctx._getPhotoRef(7, 'c').category, 'Antiques', 'a desk-named line keeps its category');
    // On review (2026-10-26): never out of Firearms (it switches the firearm gates on); into it only adds them; never over a person's bulk category.
    const F = rig(ESTATE(), [ROW({ stableId: 'f', category: 'Firearms', objectName: 'Percussion pistol, likely 19th century' }), ROW({ stableId: 'g', category: 'Antiques' }),
      ROW({ stableId: 'h', category: 'General/Household', catBy: 'desk' })]);
    F.ctx._avWrite(7, 'f', RES({ category: 'Antiques' }), ESTATE(), {});
    F.ctx._avWrite(7, 'g', RES({ category: 'Firearms' }), ESTATE(), {});
    F.ctx._avWrite(7, 'h', RES({ category: 'Collectibles' }), ESTATE(), {});
    eq(['f', 'g', 'h'].map((id) => F.ctx._getPhotoRef(7, id).category), ['Firearms', 'Firearms', 'General/Household'],
       '⚠⚠ a firearm stays Firearms; a gun filed elsewhere may be moved into it; a category set on the bulk bar stands');
    eq([F.ctx._avItemPayload(7, F.ctx._getPhotoRef(7, 'h')).categoryChecked, F.ctx._avItemPayload(7, F.ctx._getPhotoRef(7, 'g')).categoryChecked], [true, false],
       'a person\'s category is marked on the request');
    const store = {};
    const W = sandbox({ fns: ['savePhotoRefs'], stubs: { localStorage: { setItem: (k, v) => { store[k] = v; } }, _warnPhotoStoreFull() {},
      _invReclaimSpace: () => ({ bytes: 0, jobs: [], thumbs: 0 }), _invNoteReclaim() {}, _photoRefs: { 7: [ROW({ catBy: 'desk' })] } } });
    W.savePhotoRefs(7);
    ok(Object.values(store).some((v) => String(v).indexOf('"catBy":"desk"') >= 0), '⚠ catBy survives the save (the whitelist drops a key it does not list)');
    R.ctx._avWrite(7, 'd', RES({ category: 'Not a category', source: 'Mystery', mode: 'general' }), ESTATE(), {});
    eq([R.ctx._getPhotoRef(7, 'd').category, R.ctx._getPhotoRef(7, 'd').valSource], ['General/Household', 'General estimate'], 'a category off the list is ignored; an unknown source on a general lot is a general estimate');
  }

  group('⚠⚠ A7 · a collection once photographed: the walkthrough\'s rough figure goes, for Agent Two to value; a desk figure stays');
  {
    const S = sandbox({ fns: ['collectionLineWithPhoto', 'fieldDispToInv'], vars: ['FIELD_DISPOSITIONS', 'FIELD_DISP_DEFAULT'] });
    const shot = { roomIdx: 2, label: 'inventory', seq: 1, collId: undefined, filename: 'x.jpg', driveFileUrl: null, status: 'uploading', ts: 5 };
    eq(S.collectionLineWithPhoto({ stableId: '7_col1', objectName: 'Coin collection', fmv: 5000, qty: '200' }, shot, {}).fmv, '', '⚠ the walkthrough figure is not carried');
    eq(S.collectionLineWithPhoto({ stableId: '7_col1', objectName: 'Coin collection', fmv: 4200, valuedBy: 'desk' }, shot, {}).fmv, 4200, 'a figure the desk typed stays');
    eq(S.collectionLineWithPhoto({ stableId: '7_col1', objectName: 'Coin collection', fmv: 6100, valSource: 'Appraisal', valuedBy: 'appraiser' }, shot, {}).fmv, 6100, 'an appraisal stays');
    has(fn('collectionUseLine'), '(coll.valuedBy || coll.valSource)', 'Use that line carries a person\'s figure, never the walkthrough\'s ballpark');
  }

  group('⚠ A8 · the automatic run waits for one out, never dropped; Value N lines says so; passing failures asked again once, never stamped');
  {
    const R = rig(ESTATE(), [ROW({ stableId: 'a', objectName: 'Oak dresser', agentConf: 'high' })], { answer: () => ({ ok: true, results: {}, failed: {} }) });
    R.ctx._avState(7).running = true;
    eq(R.ctx.agentValueAuto(7), false, 'a run out: nothing started now');
    eq(R.ctx._avAutoAgain[7], 1, '⚠ but queued');
    R.ctx._avState(7).running = false;
    R.ctx._avFinish(7);
    eq(R.posts.length >= 1 && R.posts[0].action, 'agentValue', '⚠ and sent when the run out finishes');
    const B = rig(ESTATE(), [ROW({ stableId: 'a', objectName: 'Oak dresser' })]);
    B.ctx._avState(7).running = true;
    B.ctx.agentValueRun(7);
    has(B.alerts[0], 'Agent Two is already valuing lines on this job', 'Value N lines pressed while a run is out says so');
    let n = 0;
    const T = rig(ESTATE(), [ROW({ stableId: 'a', objectName: 'Oak dresser', agentConf: 'high' })], { answer: () => (n++ < 2 ? { ok: true, results: {}, failed: {}, retry: { a: 'Overloaded' } } : { ok: true, results: {}, failed: {} }) });
    T.ctx._avStart(7, ESTATE(), ['a'], {});
    eq(T.posts.length, 2, '⚠ a passing failure is sent once more in the run, then left');
    eq([T.ctx._getPhotoRef(7, 'a').valFailed, T.ctx._avState(7).later], [undefined, 1], '…never stamped not valued, counted for the state line');
    has(T.ctx._avStateHtml(7), '1 did not come back (slow or busy): they go with the next run, or press Value N lines', 'the state line says what happens next');
  }

  group('⚠⚠ A9 · a close-up added at the desk sends its line to Agent Two (unreviewed, the agent\'s figure or none); the per-article ceiling');
  {
    const lines = [ROW({ stableId: 'a', objectName: 'Plates, likely Italian' }), ROW({ stableId: 'b', reviewed: true, objectName: 'Plates' }),
      ROW({ stableId: 'c', fmv: 90, valuedBy: 'desk' }), ROW({ stableId: 'd', manual: true, driveFileId: undefined, objectName: 'Cash on hand' })];
    const R = rig(ESTATE(), lines);
    eq(R.ctx.agentValueAfterCloseUp(7, 'a'), true, '⚠ an unreviewed line with no figure: researched with the close-up');
    eq([R.posts.length, R.posts[0].items[0].mode], [1, 'comps'], '…at once, researched');
    const R2 = rig(ESTATE(), lines);
    eq([R2.ctx.agentValueAfterCloseUp(7, 'b'), R2.ctx.agentValueAfterCloseUp(7, 'c'), R2.ctx.agentValueAfterCloseUp(7, 'd')], [false, false, false],
       'never a reviewed line, a desk figure, or a typed line');
    eq(R2.posts.length, 0, 'nothing sent for them');
    eq(R2.ctx.agentValueAfterRename(7, 'd'), false, 'a typed line renamed is not researched on the web either');
    has(fn('invAddCloseUp'), "if (d && d.status === 'uploaded' && _invFileId(d)) agentValueAfterCloseUp(jobId, stableId);", 'the close-up\'s own upload sends it, once it is in Drive');
    has(fn('invRetryCloseUp'), 'agentValueAfterCloseUp(jobId, d.groupId)', '…and a retried one');
    // On review (2026-10-26): with a run out, a close-up is never dropped; a line still waiting in the run goes with it.
    const Q = rig(ESTATE(), [ROW({ stableId: 'a', objectName: 'Plates, likely Italian', valFailed: 'could not tell what it is' }), ROW({ stableId: 'w', objectName: 'Oak dresser' }),
      ROW({ stableId: 'x', objectName: 'Brass lamp', valuedBy: 'agent', fmv: 40, valNameAt: 'Brass lamp', valConf: 'high' })]);
    Object.assign(Q.ctx._avState(7), { running: true, ids: { w: 1, x: 1 }, out: { x: 1 } });
    eq([Q.ctx.agentValueAfterCloseUp(7, 'a'), Q.ctx._avAfter[7] && Q.ctx._avAfter[7].a], [true, 'closeup'], '⚠⚠ a line with no figure, a run out that does not carry it: queued behind it, never dropped');
    eq([Q.ctx.agentValueAfterCloseUp(7, 'w'), (Q.ctx._avAfter[7] || {}).w], [true, undefined], 'a line still waiting in the run goes with it, its request built after the close-up');
    eq([Q.ctx.agentValueAfterCloseUp(7, 'x'), Q.ctx._avAfter[7].x], [true, 'closeup'], 'a line in the request now out is queued (its request was built before)');
    // The run's own record, as _avSendNext writes it while a request is out.
    let snap = null, S2 = null;
    S2 = rig(ESTATE(), [ROW({ stableId: 'a1' }), ROW({ stableId: 'b1' })], { answer: () => {
      const st = S2.ctx._avState(7);
      snap = { ids: Object.keys(st.ids || {}).sort(), out: Object.keys(st.out || {}).sort(), again: S2.ctx.agentValueAgain(ESTATE(), { stableId: 'a1' }) };
      return { ok: true, results: {}, failed: {} }; } });
    S2.ctx._avStart(7, ESTATE(), ['a1', 'b1'], {});
    eq(snap, { ids: ['a1', 'b1'], out: ['a1', 'b1'], again: true }, '⚠ while a request is out the run knows what it holds and what is in the request');
    eq([Object.keys(S2.ctx._avState(7).ids || {}).length, S2.ctx.agentValueAgain(ESTATE(), { stableId: 'a1' })], [0, false], '…and holds nothing once it finishes');
    Q.ctx._avForceComps.z = 1;
    eq([Q.ctx.agentValueAgain(ESTATE(), { stableId: 'w' }), Q.ctx.agentValueAgain(ESTATE(), { stableId: 'z' })], [true, false],
       '⚠ "being valued again" only for a line the run holds or has queued, never off a stale research mark');
    Object.assign(Q.ctx._getPhotoRef(7, 'x'), { reviewed: true, valReviewed: true });   // ticked while the run was out (the tick covers its figure)
    Q.ctx._avState(7).running = false;
    Q.ctx._avFinish(7);
    eq(Q.posts.map((b) => b.items.map((i) => i.stableId)), [['a']], '⚠ at the run\'s end the close-up\'s rules are asked again: the line ticked meanwhile is not reopened');
    const F2 = rig(ESTATE(), [ROW({ stableId: 'r1', objectName: 'Restoration Hardware mirror', valuedBy: 'agent', fmv: 900, valNameAt: 'Restoration Hardware mirror', valConf: 'high' }),
      ROW({ stableId: 'r2', objectName: 'Henckels shears', valuedBy: 'agent', fmv: 20, valNameAt: 'Kitchen shears', valConf: 'high' }),
      ROW({ stableId: 'r3', objectName: 'Oil on canvas, signed', fmv: 4000, valuedBy: 'desk' })]);
    F2.ctx._avAfter[7] = { r1: 'rename', r2: 'rename', r3: 'closeup' };
    F2.ctx._avFinish(7);
    eq(F2.posts.map((b) => b.items.map((i) => i.stableId)), [['r2']],
       'a renamed line the run out already valued under its new name is done; a figure a person recorded meanwhile stands; the stale one goes');
    const A = rig(ESTATE(), [ROW({ stableId: 'g', qty: '24', category: 'General/Household' }), ROW({ stableId: 'h', qty: '1', category: 'General/Household' })]);
    eq(A.ctx.agentValueApply(7, 'g', RES({ mode: 'general', fmv: 300 }), ESTATE(), {}), 'valued', '⚠ 24 plates at $300 together: $12.50 each, an ordinary lot (Anthony: "One item\'s price")');
    eq(A.ctx.agentValueApply(7, 'h', RES({ mode: 'general', fmv: 300 }), ESTATE(), {}), 'research', 'one item at $300: researched, as before');
  }

  group('⚠ A10 · sharper close-ups, every other shot as before');
  {
    eq([sandbox({ vars: ['DETAIL_PHOTO_MAX_W'] }).DETAIL_PHOTO_MAX_W, sandbox({ vars: ['DETAIL_PHOTO_QUALITY'] }).DETAIL_PHOTO_QUALITY], [1200, 0.85], 'close-ups 1,200 px wide at 0.85');
    const seen = [];
    const S = sandbox({ fns: ['_captureShot', 'photoSubfolder', 'fieldDispToInv', '_cleanName', '_photoUid', '_slotRefs', '_setPhotoRef', '_getPhotoRef'],
      vars: ['PHOTO_CAPTURE_LABELS', 'AS_FOUND_SUBFOLDER', 'PHOTO_SUBFOLDER', '_localShotThumbs', '_photoUidSeq', 'INV_DEFAULT_CATEGORY', 'FIELD_DISPOSITIONS', 'FIELD_DISP_DEFAULT', 'DETAIL_PHOTO_MAX_W', 'DETAIL_PHOTO_QUALITY'],
      stubs: { jobs: [{ id: 7, hvlId: 'HVL-0007' }], _photoRefs: { 7: [ROW({ stableId: 'p' })] }, estimateStore: { 7: { estimate: { rooms: [{ idx: 2, name: 'Den' }] } } },
        _photoCaptureJob: () => ({ id: 7, hvlId: 'HVL-0007' }), _photoStamp: () => '2026-10-26_101500', _photoRetryData: {}, _savePendingPhotoData() {}, savePhotoRefs() {},
        _doPhotoUpload() {}, _invCacheLocalThumb() {}, _scheduleInventorySync() {}, compressImage: (d, w, q, cb) => { seen.push([w, q]); cb(d); }, _invTouch: (r) => r } });
    S._captureShot(7, 2, 'detail', 'data:image/jpeg;base64,A', { groupId: 'p' });
    S._captureShot(7, 2, 'inventory', 'data:image/jpeg;base64,B', {});
    S._captureShot(7, 2, 'before', 'data:image/jpeg;base64,C', {});
    eq(seen.filter((x) => x[0] !== 160), [[1200, 0.85], [900, 0.72], [900, 0.72]], '⚠ a close-up at 1,200/0.85; an Items and an as-found shot at 900/0.72 as before');
    has(fn('compressImage'), "g.imageSmoothingQuality = 'high'", 'and the downscale smooths at high quality');
  }

  group('⚠⚠ A11 · the desk: an Unsure chip; never unsure on a figure no paper prints; Look at this quiet per photograph; a removed line\'s notes kept');
  {
    const flags = sandbox({ vars: ['INV_WORK_FLAGS'] }).INV_WORK_FLAGS;
    eq(flags.slice(0, 3).map((f) => f.key), ['unnamed', 'unreviewed', 'unsure'], '⚠ Unsure, third, beside Not reviewed');
    eq(flags[2].label, 'Unsure', 'named as the row\'s hint');
    has(String(flags[2].test), 'invLineUnsure(r, job)', 'its test is the row\'s one hint, with the job');
    const R = rig(ESTATE({ docTier: 'contents' }), []);
    const internal = ESTATE({ docTier: 'contents' });
    const low = ROW({ valuedBy: 'agent', valLow: 20, valHigh: 60, valConf: 'low', agentConf: 'high', valNameAt: 'Hand-painted plates, likely Italian' });
    eq([R.ctx.invLineUnsure(low, internal), R.ctx.invLineUnsure(low, ESTATE()), R.ctx.invLineUnsure(low)], [false, true, true],
       '⚠ a low internal range is not unsure where counsel values; it is on a values tier, and with no job as before');
    eq(R.ctx.invLineUnsure(Object.assign({}, low, { agentConf: 'low' }), internal), true, '…but a guess at the name stays unsure there until a confident figure settles it');
    const S = sandbox({ fns: ['agentNoticeQuiet', 'agentNotices', '_invPhotoSiblings', '_invPhotoSource', '_invDerivedRefs', 'invLineReviewed', 'agentValueUnreviewed', '_avHasFigure', '_invHasValue', '_invJob', '_getPhotoRef', 'agentNoticesOn', '_jobInvRefs',
        'invLineAccepted', 'invLineHold', '_invLineHolds', 'invLineOpen'],
      vars: ['AGENT_NOTICE_KINDS'],
      stubs: { jobs: [ESTATE()], mustFindAllFound: () => false, _photoRefs: { 7: [
        ROW({ stableId: 'p', reviewed: true, agentNotices: [{ kind: 'other', text: 'the case label is blurred' }] }), ROW({ stableId: 'q', derivedFrom: 'p' }),
        ROW({ stableId: 'x', deletedAt: 5, agentNotices: [{ kind: 'firearm', text: 'long gun case' }] }), ROW({ stableId: 'y', derivedFrom: 'x' })] } } });
    const live = S._photoRefs[7].filter((r) => !r.deletedAt);
    const n = S.agentNotices(7, live);
    eq(n.map((x) => [x.kind, x.ref.stableId]), [['firearm', 'y'], ['other', 'p']], '⚠⚠ a removed photograph line\'s Firearm stays on the list, on the live line off it; a Look at this stays while a line off its photograph is unreviewed');
    S._getPhotoRef(7, 'q').reviewed = true;
    eq(S.agentNotices(7, live).map((x) => x.kind), ['firearm'], 'every line off the photograph reviewed: the Look at this goes quiet; the Firearm never');
    const Rec = sandbox({ fns: ['_agRecordNoticesHtml', 'agentNoticesOn', 'agentNoticeQuiet', '_jobInvRefs', '_invPhotoSiblings', '_invPhotoSource', '_invDerivedRefs', 'invLineReviewed',
      'agentValueUnreviewed', '_avHasFigure', '_invHasValue', '_getPhotoRef', 'invLineAccepted', 'invLineHold', '_invLineHolds', 'invLineOpen'], vars: ['AGENT_NOTICE_KINDS'],
      stubs: { esc: (x) => String(x), mustFindAllFound: () => false, _photoRefs: S._photoRefs } });
    has(Rec._agRecordNoticesHtml(ESTATE(), Rec._getPhotoRef(7, 'y')), 'long gun case', '⚠ on review: the carried Firearm is in the record Show the item opens');
    has(Rec._agRecordNoticesHtml(ESTATE(), Rec._getPhotoRef(7, 'y')), 'said of this photograph, whose own line was removed', '…marked as carried');
  }

  group('A12 · the desk\'s words: valuing again for the new name, one specialist note, the duplicate tooltip; Mark reviewed names what it swept');
  {
    const R = rig(ESTATE(), [ROW({ stableId: 'a', objectName: 'Restoration Hardware mirror', valuedBy: 'agent', fmv: 25, valLow: 20, valHigh: 30, valConf: 'high', valNameAt: 'Wooden wall mirror' })]);
    R.ctx._avAfter[7] = { a: 1 };
    const n = R.ctx.agentValueNotices(ESTATE(), R.ctx._jobInvRefs(7));
    has(n[0].text, 'Agent Two is valuing it again for the new name', '⚠ the stale note while the re-value is queued');
    R.ctx._avAfter[7] = {};
    has(R.ctx.agentValueNotices(ESTATE(), R.ctx._jobInvRefs(7))[0].text, 'open the line and Re-value it', 'and the old words when nothing is out');
    const L = rig({ id: 7, svc: 'downsizing_move', tc: 'Ashley Jerome' }, [ROW({ stableId: 's', valuedBy: 'agent', fmv: 3500, valLow: 2000, valHigh: 5000, valConf: 'high',
      valNameAt: 'Hand-painted plates, likely Italian', valNotices: [{ kind: 'specialist', text: 'sell through a ceramics specialist' }] })]);
    eq(L.ctx.agentValueNotices({ id: 7, svc: 'downsizing_move' }, L.ctx._jobInvRefs(7)).filter((x) => x.kind === 'specialist').length, 1, 'one specialist note, never two under one line');
    const reviewed = Object.assign({}, L.ctx._jobInvRefs(7)[0], { reviewed: true, valReviewed: true });
    eq(L.ctx._avRowBadges({ id: 7, svc: 'downsizing_move' }, reviewed).filter((b) => b.indexOf('worth a specialist') >= 0).length, 0, '"worth a specialist" goes once the line is reviewed');
    has(fn('_renderInvRow'), "'May be the same thing as another line in this room.'", 'the duplicate tooltip claims nothing it cannot know');
    // Mark reviewed, driven (on review, 2026-10-26): what it says is read off the job before and after the stamp.
    const lines = [ROW({ stableId: 'A', objectName: 'Wool coats', agentConf: 'high', agentNotices: [{ kind: 'other', text: 'a label on the case is blurred' }] }),
      ROW({ stableId: 'B', objectName: 'Grey strongbox', agentConf: 'high', derivedFrom: 'A' }),
      ROW({ stableId: 'C', objectName: 'Brass lamp, likely Italian', agentConf: 'low' })];
    let pick = [], dupRows = [];
    const B = sandbox({
      fns: ['_invBulkApply', 'agentValueUnreviewed', '_avHasFigure', '_invHasValue', '_avStampReviewed', '_invStampBy', 'deviceUser', '_avTakeValue', '_invKeyOnJob', '_invColOnJob',
            '_getPhotoRef', '_setPhotoRef', '_invJob', 'invFiduciaryMode', 'isDecedentJob', '_invStampLineReviewed', 'invLineUnsure', 'invLineReviewed', 'invLineAccepted', 'invLineHold', '_invLineHolds', 'invLineOpen', 'invAcceptCtx', '_agNameKey', 'agentValueInternal',
            'docTierProduces', 'docTierOf', 'docTierDef', 'svcHasDocStep', 'agentNotices', 'agentNoticesOn', 'agentNoticeQuiet', '_jobInvRefs', '_invPhotoSiblings', '_invPhotoSource', '_invDerivedRefs',
            'agentValueNotices', '_avNoticeKinds', '_avNoticeLabel', 'agentValueStale', 'agentValueSpecialistWorth', 'agentValueAgain', '_avState', '_invNamed', '_invItemNo',
            'invAppraisalThreshold', 'gateDispute', '_gateYes', 'fmt', 'roundCents', 'invNeedsAppraisal', 'invIsIntrinsic', 'invCatMeta', 'invAppraiserFor', '_anArticle'],
      vars: ['INVENTORY_COLUMNS', 'DECEDENT_SERVICES', 'AGENT_VALUE_OWN', 'AGENT_NOTICE_KINDS', '_avRun', '_avAfter', '_avForceComps', 'DOC_TIERS', 'DOC_TIER_FROM_SCOPE', 'JOB_STEPS',
             'INV_APPRAISAL_THRESHOLD', 'INV_APPRAISAL_THRESHOLD_DISPUTED', 'INV_TAXONOMY', 'INV_OPEN_HOLDS'],
      stubs: { jobs: [ESTATE()], _photoRefs: { 7: lines }, _invPicked: () => pick, _invTouch(r) { r.updatedAt = (r.updatedAt || 0) + 1; return r; },
               savePhotoRefs() {}, _scheduleInventorySync() {}, showSyncBadge() {}, renderInventoryTab() {}, _invMatchesFilter: () => true, _invBulkLast: null,
               mustFindAllFound: () => false, agentDuplicateGroups: () => (dupRows.length ? [{ rows: dupRows }] : []) } });
    pick = [lines[0]];
    B._invBulkApply(7, 'reviewed', true);
    lacks(B._invBulkLast.msg, 'carried an agent', '⚠ the photograph\'s own line ticked alone: its Look at this is still on the list (the strongbox is unreviewed), so nothing is claimed');
    pick = [lines[1]];
    B._invBulkApply(7, 'reviewed', true);
    has(B._invBulkLast.msg, '1 carried an agent\u2019s note, now off the list (still in each record): ', '⚠⚠ the strongbox ticked: the note about its photograph goes quiet, and the bar says so');
    has(B._invBulkLast.msg, 'Wool coats', '…naming the line that carries it');
    pick = [lines[2]];
    dupRows = [lines[2], ROW({ stableId: 'D', objectName: 'Brass lamp' })];
    B._avState(7).running = true;
    B._invBulkApply(7, 'reviewed', true);
    has(B._invBulkLast.msg, '1 of them was marked unsure: ', 'the unsure line it swept past');
    // ⚠ The merge's review: a tick no longer takes a pair off Possible duplicates (INV_OPEN_HOLDS), so the bar named a pair as
    // left that was still listed. It names the line that stays open, and what settles it.
    has(B._invBulkLast.msg, '\u26a0 1 stays open: a tick does not settle an unnamed line or a possible duplicate (name it, or Remove or Not duplicates under Possible duplicates): Brass lamp', '⚠⚠ the line still in a possible duplicate stays open, and the bar says what settles it');
    lacks(B._invBulkLast.msg, 'left Possible duplicates', '⚠ …and never that the tick took it off the list');
    has(B._invBulkLast.msg, 'Agent Two is still valuing lines on this job: a figure that lands on one of these after this tick is not covered by it.', 'and that a figure still landing is not covered by the tick');
    dupRows = [];
    pick = [lines[2]];
    B._invBulkApply(7, 'category', 'Furniture');
    eq([lines[2].category, lines[2].catBy, lines[2].namedBy], ['Furniture', 'desk', 'agent'], '⚠ a category set across a selection is the person\'s; the name stays Agent One\'s');
  }

  group('A12b · a name typed on a stale line: Agent Two is asked first, so the notes repaint reading "valuing it again"');
  {
    const seen = [];
    let E = null;
    const job = ESTATE();
    E = rig(job, [ROW({ stableId: 'm', objectName: 'Wooden wall mirror', namedBy: 'agent', valuedBy: 'agent', fmv: 25, valLow: 20, valHigh: 30, valConf: 'high', valNameAt: 'Wooden wall mirror' })], {
      fns: ['_invEdit', 'invUnitValue', '_invQtyCarriesValue', '_invPaintFigures', 'invAppraised', '_invAcceptCtxOf', 'invAcceptCtx', 'agentDuplicateGroups', '_agDupEligible', '_arDupEligible', 'agentNamedTwice', 'invIsFirearm', '_invPhotoNoteOpen', 'invReleaseCautions', 'invBequestElsewhere', 'invAwaitingAppraisal'], vars: ['_agDupSetJob', 'INV_ACCEPT_AMMO_RE', 'INV_RELEASE_CAUTIONS', 'INV_OPEN_HOLDS'],
      stubs: { _invRefreshSummary() {}, _invRefreshGuardrail() {}, _invRefreshFlagStrip() {}, _invRefreshRecords() {}, _invRefreshReleases() {},
        INV_STICKY_FIELDS: [], invStaffRefused: () => '', invBequestFor: () => null, invNoteDispositionMove: () => false, invFillPlanChannel: () => false,
        _invRowDomId: (s) => 'inv-row-' + s, _renderInvRow: () => '<div></div>',
        _invRefreshAgentNotices() { seen.push(E.ctx.agentValueAgain(job, E.ctx._getPhotoRef(7, 'm'))); } } });
    E.ctx._avState(7).running = true;   // a run out: the rename is queued behind it
    let err = '';
    try { E.ctx._invEdit(7, 'm', 'objectName', { value: 'Restoration Hardware wall mirror', type: 'text' }); } catch (e) { err = String(e && e.message || e); }
    eq(err, '', 'the name is typed');
    eq([E.ctx._avAfter[7] && E.ctx._avAfter[7].m, seen[seen.length - 1]], ['rename', true],
       '⚠ queued for Agent Two before the notes repaint, so they read "Agent Two is valuing it again", never "Re-value it"');
    has(E.ctx.document.getElementById('inv-value-notices').innerHTML, 'Agent Two is valuing it again for the new name',
        '⚠⚠ Agent Two\'s notes, repainted by the edit itself, say it is being valued again');
  }

  // ═══════════════════ 2026-10-26b · ANTHONY AT THE DESK, THE SAME DAY ═══════════════════
  group('⚠⚠ B1 · condition off the photograph (Anthony: "Agents grade it"): one list, one ownership rule');
  {
    const S = sandbox({ fns: ['_invCondIsAgents', '_invAgentCondition'], vars: ['AGENT_CONDITIONS', 'INV_CONDITIONS'] });
    eq(S.AGENT_CONDITIONS.filter((c) => S.INV_CONDITIONS.indexOf(c) < 0), [], 'every grade an agent may give is one the desk offers');
    eq(S.AGENT_CONDITIONS.indexOf('Salvage'), -1, 'Salvage is a person\'s call');
    const own = (r) => S._invCondIsAgents(r);
    eq([own({}), own({ condition: 'Good', condBy: 'agent' }), own({ condition: 'Good', condBy: 'agent', reviewed: true }),
        own({ condition: 'Fair', condBy: 'desk' }), own({ condition: '', condBy: 'desk' }), own({ condition: 'Good' })],
       [true, true, false, false, false, false],
       '⚠ a blank or an unreviewed agent grade is the agents\'; a person\'s (even cleared), a reviewed one or one nobody marked stands');
    const r = {};
    eq([S._invAgentCondition(r, 'Good'), r.condition, r.condBy], [true, 'Good', 'agent'], 'a grade is written and marked the agent\'s');
    const d = { condition: 'Fair', condBy: 'desk' };
    eq([S._invAgentCondition(d, 'Excellent'), d.condition], [false, 'Fair'], 'never over a person\'s');
    const x = {};
    eq([S._invAgentCondition(x, 'Salvage'), S._invAgentCondition(x, ''), S._invAgentCondition(x, 'Mint'), x.condition], [false, false, false, undefined],
       'nothing off the list, and an empty grade writes nothing');
    has(fn('_invEdit'), "if (key === 'condition') ref.condBy = 'desk';", 'a grade a person sets on the record is theirs');
    has(fn('_invBulkApply'), "if (key === 'condition') ref.condBy = 'desk';", 'and one set across a selection');
    has(fn('savePhotoRefs'), 'condBy:r.condBy,', 'and the manifest keeps who graded it (a key off the save list is dropped on every save)');
  }

  group('B2 · Agent One grades as it names; never over a grade a person set');
  {
    const S = sandbox({ fns: ['_agWrite', '_invCondIsAgents', '_invAgentCondition', '_getPhotoRef', '_setPhotoRef'],
      vars: ['AGENT_CONDITIONS', 'INV_TAXONOMY', 'INV_CATEGORIES', 'INV_DEFAULT_CATEGORY'],
      stubs: { _photoRefs: { 7: [{ stableId: 'a', label: 'inventory' }, { stableId: 'b', label: 'inventory', condition: 'Poor', condBy: 'desk' }] },
        _invTouch: (r) => r } });
    let err = '';
    try {
      S._agWrite(7, 'a', { name: 'Glossy frameless photographic print, beach scene', category: 'General/Household', qty: 1, confidence: 'medium', basis: 'b', condition: 'Excellent' });
      S._agWrite(7, 'b', { name: 'Upholstered sofa', category: 'Furniture', qty: 1, confidence: 'high', basis: 'b', condition: 'Good' });
    } catch (e) { err = String(e && e.message || e); }
    eq(err, '', 'the answers are written');
    const a = S._getPhotoRef(7, 'a') || {};
    eq([a.condition, a.condBy], ['Excellent', 'agent'], '⚠ the foyer\'s beach print, graded off its photograph as it is named');
    eq((S._getPhotoRef(7, 'b') || {}).condition, 'Poor', 'a grade a person set stands');
    has(fn('_agContext'), 'conditions: AGENT_CONDITIONS', 'Agent One is sent the grades');
  }

  group('B3 · Agent Two grades under the same rule; a line nobody has graded travels with its photograph');
  {
    const job = ESTATE();
    const R = rig(job, [ROW({ stableId: 'g' }), ROW({ stableId: 'h', condition: 'Good', condBy: 'desk' }),
      ROW({ stableId: 'k', condition: 'Good', condBy: 'agent', reviewed: true })]);
    ['g', 'h', 'k'].forEach((id) => R.ctx._avWrite(7, id, RES({ condition: id === 'g' ? 'Fair' : 'Poor' }), job));
    eq(['g', 'h', 'k'].map((id) => R.ctx._getPhotoRef(7, id).condition), ['Fair', 'Good', 'Good'], '⚠ written over a blank; a person\'s and a reviewed grade stand');
    eq(R.ctx._avContext(job).conditions, ['Excellent', 'Good', 'Fair', 'Poor'], 'Agent Two is sent the grades');
    eq(R.ctx.agentValueGradesCondition(ROW({ condition: '' })), true, 'an ungraded photographed line is sent with its photograph');
    eq([R.ctx._avItemPayload(7, R.ctx._getPhotoRef(7, 'h')).conditionChecked, R.ctx._avItemPayload(7, R.ctx._getPhotoRef(7, 'g')).conditionChecked], [true, false],
       '⚠ a person\'s grade is sent marked as theirs; the agents\' own is not (on review)');
    eq([R.ctx.agentValueGradesCondition(ROW({ condition: 'Good', condBy: 'agent' })), R.ctx.agentValueGradesCondition(ROW({ driveFileId: '', filename: '', driveFileUrl: '' }))],
       [false, false], 'one already graded, or with no photograph, is not');
  }

  group('⚠⚠ B4 · the backend: a grade is a field only when the app sends the grades, and Agent Two\'s is kept only off a photograph the request carried');
  {
    const g = gsAll();
    const conds = ['Excellent', 'Good', 'Fair', 'Poor'];
    const t1 = g._agTool(CATS, conds).input_schema.properties.objects.items;
    eq([t1.properties.condition && t1.properties.condition.enum, t1.required.indexOf('condition') >= 0], [conds.concat(['']), true], 'Agent One: one of the grades, or empty');
    eq(g._agTool(CATS).input_schema.properties.objects.items.properties.condition, undefined, 'no grades sent, no field (an older app)');
    // Driven through the request Agent One actually sends (a revert of its one argument stayed green until this).
    const reqBody = JSON.parse(g._agRequestFor({ stableId: 's1', fileId: 'FID' }, { categories: CATS, conditions: conds, mustFind: [] }, 'sk-ant-test', 'claude-fable-5-1').payload);
    eq(reqBody.tools[0].input_schema.properties.objects.items.properties.condition && reqBody.tools[0].input_schema.properties.objects.items.properties.condition.enum,
       conds.concat(['']), '⚠ the naming request carries the grade field when the app sends the grades');
    has(g._agSystem({ categories: CATS, conditions: conds, mustFind: [] }), 'CONDITION\nGrade each line', 'Agent One is told how to grade');
    lacks(g._agSystem({ categories: CATS, mustFind: [] }), 'CONDITION\n', 'and not without the grades');
    const sysOne = g._agSystem({ categories: CATS, conditions: conds, mustFind: ['a coin collection'] });
    ok(sysOne.indexOf('kind "other"') >= 0 && sysOne.indexOf('kind "other"') < sysOne.indexOf('CONDITION\n') && sysOne.indexOf('CONDITION\n') < sysOne.indexOf('Call record_contents'),
       '⚠ CONDITION comes after the notices, never inside them (on review: kind "other" sat under it)');
    has(g.AGENT_CONDITION_TEXT, 'leave it empty where it cannot show it', 'empty where the photograph cannot show it');
    const t2 = g._avTool('general', CATS, conds).input_schema.properties.values.items;
    eq([t2.properties.condition && t2.properties.condition.enum, t2.required.indexOf('condition') >= 0], [conds.concat(['']), true], 'Agent Two: the same field');
    has(g._avSystem(Object.assign({}, CTX2, { conditions: conds })), 'Leave it empty on a lot sent as text alone.', 'Agent Two is told where it may grade');
    has(g._avSystem(Object.assign({}, CTX2, { conditions: conds })), 'A condition set by a person stands, whatever the photograph shows', '⚠ and that a person\'s grade stands (on review)');
    has(g._avLineText('L1', LINE({ condition: 'Poor', conditionChecked: true })), 'Condition: Poor (set by a person: value it in this condition)', 'a person\'s grade travels marked');
    lacks(g._avLineText('L1', LINE({ condition: 'Good' })), 'set by a person', 'an agent\'s does not');
    const h = gsAll({ reply: () => ({ code: 200, body: ANSWER2([VAL({ line: 'L1', condition: 'Fair' }), VAL({ line: 'L2', condition: 'Good' })]) }) });
    const out = h.agentValueLines({ context: Object.assign({}, CTX2, { conditions: conds }), items: [LINE({ stableId: 'txt' }), LINE({ stableId: 'pic', fileId: 'FID' })] });
    const res = (out && out.results) || {};
    eq([res.txt && res.txt.condition, res.pic && res.pic.condition], ['', 'Good'], '⚠⚠ a lot valued as text never comes back graded; one sent with its photograph does');
    const h2 = gsAll({ reply: () => ({ code: 200, body: ANSWER2([VAL({ line: 'L1', condition: 'Salvage' })]) }) });
    const o2 = h2.agentValueLines({ context: Object.assign({}, CTX2, { conditions: conds }), items: [LINE({ stableId: 'pic', fileId: 'FID' })] });
    eq(o2 && o2.results && o2.results.pic && o2.results.pic.condition, '', 'and only one of the grades it was sent');
    // A researched line sent with its photograph grades too (a revert of the research arm's mark stayed green until this).
    const h3 = gsAll({ reply: () => ({ code: 200, body: ANSWER2([VAL({ line: 'L1', condition: 'Fair' })]) }) });
    const o3 = h3.agentValueLines({ context: Object.assign({}, CTX2, { conditions: conds }), items: [LINE({ stableId: 'res', mode: 'comps', fileId: 'FID' })] });
    eq(o3 && o3.results && o3.results.res && o3.results.res.condition, 'Fair', '⚠ a researched line keeps the grade read off its photograph');
    const h4 = gsAll({ reply: () => ({ code: 200, body: ANSWER2([VAL({ line: 'L1', condition: 'Fair' })]) }) });
    const o4 = h4.agentValueLines({ context: Object.assign({}, CTX2, { conditions: conds }), items: [LINE({ stableId: 'res', mode: 'comps' })] });
    eq(o4 && o4.results && o4.results.res && o4.results.res.condition, '', 'and one researched with no photograph never comes back graded');
    has(gsFn('testAgentIdentify'), "conditions: ['Excellent', 'Good', 'Fair', 'Poor']", 'the naming probe asks for grades and prints them');
  }

  group('⚠⚠ B5 · an agent\'s figure reads in whole dollars each (Anthony: "Whole dollars each"): Total = Each × Qty; under a dollar each stays in cents');
  {
    const S = sandbox({ fns: ['agentValueWhole', 'roundCents'] });
    eq([S.agentValueWhole(75, 7), S.agentValueWhole(45, 60), S.agentValueWhole(175.4, 1), S.agentValueWhole(0.5, 1), S.agentValueWhole(640, 8), S.agentValueWhole(0, 3)],
       [77, 45, 175, 0.5, 640, 0], '⚠ the cabbage-ware plates read $11 × 7 = $77; sixty forks at 75¢ stay $45; a single item to the dollar');
    ok(isNaN(S.agentValueWhole('', 2)) && isNaN(S.agentValueWhole(null, 2)) && isNaN(S.agentValueWhole(-5, 1)), 'no figure stays no figure, never $0');
    const job = ESTATE();
    const R = rig(job, [ROW({ stableId: 'cab', qty: 7 })]);
    R.ctx._avWrite(7, 'cab', RES({ fmv: 75, low: 45, high: 120 }), job);
    const c = R.ctx._getPhotoRef(7, 'cab');
    eq([c.fmv, c.valLow, c.valHigh], [77, 42, 119], 'written whole each, its range with it');
    lacks(fn('_invEdit'), 'agentValueWhole', 'a figure a person types stays as typed');
    eq((src.match(/agentValueWhole\(/g) || []).length, 4, 'one definition, read by the one writer for the figure and both ends of its range');
  }

  group('⚠⚠ B6 · Re-value across a selection (Anthony: "Re-value on the bulk bar"): Agent Two\'s own figures and unvalued lines, each at its own depth');
  {
    const job = ESTATE();
    const rows = [ROW({ stableId: 'ag', valuedBy: 'agent', fmv: 75, valConf: 'low', reviewed: true, valReviewed: true }), ROW({ stableId: 'dk', valuedBy: 'desk', fmv: 900 }),
      ROW({ stableId: 'ap', valuedBy: 'appraiser', fmv: 4000, valSource: 'Appraisal' }), ROW({ stableId: 'un', objectName: '', namedBy: undefined }),
      ROW({ stableId: 'nv', objectName: 'Everyday stainless flatware', agentConf: 'high' })];
    let asked = '';
    const R = rig(job, rows, { fns: ['invBulkRevalue', '_invPicked'],
      stubs: { _invPick: { ag: 1, dk: 1, ap: 1, un: 1, nv: 1 }, confirm: (m) => { asked = String(m); return true; } } });
    let n = null, err = '';
    try { n = R.ctx.invBulkRevalue(7); } catch (e) { err = String(e && e.message || e); }
    eq(err, '', 'the press runs');
    eq(n, 2, 'two lines go');
    eq(((R.posts[0] && R.posts[0].items) || []).map((i) => i.stableId).sort(), ['ag', 'nv'], '⚠ Agent Two\'s figure and the unvalued named line; never a desk or appraiser figure, never an unnamed line');
    eq(R.ctx._avForceComps.ag, undefined, 'each at its own depth: nothing forced to research');
    has(asked, '2 carry a value a person or an appraiser recorded and are left as they are.', 'the confirm names what it leaves');
    has(asked, '1 has no name yet and is left for Agent One (Name shots).', 'and the unnamed line');
    has(asked, '1 of them was marked reviewed: the new figure is not covered by that tick.', 'and the reviewed line whose tick does not cover the new figure (the merge\'s review: under the flagged-lines rule it may stand, not "come back unreviewed")');
    const busy = rig(job, rows, { fns: ['invBulkRevalue', '_invPicked'], stubs: { _invPick: { ag: 1 } } });
    busy.ctx._avState(7).running = true;
    eq(busy.ctx.invBulkRevalue(7), false, 'refused while a run is out');
    has(busy.alerts[0] || '', 'already valuing', 'saying so');
    const none = rig(job, rows, { fns: ['invBulkRevalue', '_invPicked'], stubs: { _invPick: { dk: 1 } } });
    eq(none.ctx.invBulkRevalue(7), false, 'nothing of Agent Two\'s in the selection: nothing sent');
    has(none.alerts[0] || '', 'Nothing to value again in this selection.', 'saying so');
    has(fn('_renderInvBulk'), "invBulkRevalue(' + jid + ')", 'the selection bar carries it');
  }

  group('B7 · every photograph in a record opens its file in Drive; the buttons stay beside the photograph');
  {
    const S = sandbox({ fns: ['_invPhotoOpenHtml', '_invCloseUpTileHtml', '_invThumbHTML', '_invFileId'], vars: ['INV_CAT_GLYPH'],
      stubs: { esc: (x) => String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/"/g, '&quot;') } });
    const linked = S._invPhotoOpenHtml(7, { stableId: 'a', driveFileUrl: 'https://drive.google.com/file/d/A/view', driveFileId: 'A' }, 240);
    has(linked, 'href="https://drive.google.com/file/d/A/view" target="_blank" rel="noopener"', 'the photograph opens its file in a new tab');
    has(linked, '>Open in Drive &#8599;</a>', 'with a small link under it');
    lacks(S._invPhotoOpenHtml(7, { stableId: 'b' }, 240), '<a ', 'nothing to open on a shot not yet in Drive');
    has(S._invCloseUpTileHtml(7, { stableId: 'd', driveFileUrl: 'https://drive.google.com/file/d/D/view', driveFileId: 'D', status: 'uploaded' }), 'Open in Drive', '⚠ a close-up opens in Drive too');
    lacks(S._invCloseUpTileHtml(7, { stableId: 'e', status: 'failed', driveFileUrl: 'https://drive.google.com/file/d/E/view' }), 'Open in Drive', 'never one that failed: Retry is its control');
    const panel = fn('_renderInvPanel');
    lacks(panel, 'Open photo in Drive', 'the big button is gone');
    has(panel, 'flex:1 1 260px;min-width:0', '⚠ the buttons take the room beside the photograph, so a long sentence never drops them under it');
    has(panel, 'class="inv-rec-sibs" style="flex:1 1 100%', 'the lines a photograph carries wrap inside that column');
    has(src, '.inv-rec-acts label.btn-s{margin:0;line-height:normal;}', '+ Close-up sits level with the other buttons: no form-label margin, a button\'s line height');
  }

  group('A13 · the naming run hands on what it named, and never values ahead of the room check');
  {
    const has2 = fn('_agFinish');
    has(has2, 'if (st.error && !st.named) return;', 'a run that named something before it failed still hands on');
    has(has2, 'if (_arState(jobId).running) return;', 'a room check already out takes Agent Two at its own tail');
  }
};
