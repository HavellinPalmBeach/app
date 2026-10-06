'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// AGENT TWO — VALUING THE INVENTORY (P23, 2026-10-06). Spec: AGENT_TWO_SPEC.md.
//
// Anthony, on what it is for: *"the whole point is to save time, not have a human re-enter numbers
// where we don't have to."* His decisions, each pinned below:
//   1. It writes the number, flagged unreviewed; the desk accepts or corrects it in place.
//   2. Every line, estates and living clients alike: sold comparables where a line is worth researching,
//      a general estimate for an ordinary lot.
//   3. Its number stands until an appraisal replaces it, and then its figures go.
//   4. A range that crosses the appraisal threshold flags an appraiser (inside invNeedsAppraisal).
//   5. Where counsel values (tiers contents and none) the figure stays internal: never fmv, valDate or
//      valSource, and no document prints it.
//   6. An unreviewed agent value counts as valued for FINAL; the schedules say how many are unreviewed,
//      and the Court Inventory and the Trust Schedule name each line's basis.
//
// ⚠⚠ THE LOAD-BEARING NETS: the server keeps only comparables a tool actually returned (§4b), and the
// app's one writer never touches a person's record or a figure a person or an appraiser recorded.
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
const GS_VARS = ['AGENT_API', 'AGENT_API_VERSION', 'AGENT_MAX_IMG', 'AGENT_VALUE_MODEL', 'AGENT_VALUE_EFFORT',
  'AGENT_VALUE_MAX_TOKENS', 'AGENT_VALUE_PARALLEL', 'AGENT_VALUE_MAX_LINES', 'AGENT_VALUE_GENERAL_BATCH',
  'AGENT_VALUE_SEARCHES', 'AGENT_VALUE_FETCHES', 'AGENT_VALUE_CONTINUES', 'AGENT_VALUE_MAX_COMPS',
  'AGENT_VALUE_TIME_BUDGET', 'AGENT_VALUE_FALLBACK_BETA', 'AGENT_VALUE_SOURCES', 'AGENT_VALUE_NOTICE_KINDS',
  'AGENT_VALUE_CONF_DOWN'];
const GS_FNS = ['_agProp', '_agMissingProps', '_agImageBlock', '_avCents', '_avTool', '_avTools', '_avSystem',
  '_avLineText', '_avUserContent', '_avBody', '_avHttp', '_avEcho', '_avReadResult', '_avSeenUrls', '_avUrlKey',
  '_avLineResult', 'agentValueLines'];

// `reply(body, i, call)` answers each request of each fetchAll; `throwOn(call)` makes a fetchAll throw, as
// UrlFetchApp does when one request outruns its own limit. `tick` is the clock's step per reading.
function gsCtx({ props = { ANTHROPIC_API_KEY: 'sk-ant-test' }, reply = null, throwOn = null, tick = 1 } = {}) {
  const sent = [];
  let t = 1000;
  const files = { FID: { type: 'image/jpeg', bytes: [1, 2, 3] }, DET: { type: 'image/jpeg', bytes: [4, 5] } };
  const ctx = {
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null) }) },
    Logger: { log() {} },
    DriveApp: { getFileById: (id) => ({ getBlob: () => {
      const f = files[id]; if (!f) throw new Error('File not found: ' + id);
      return { getContentType: () => f.type, getBytes: () => f.bytes };
    } }) },
    Utilities: { base64Encode: (b) => 'B64(' + b.length + ')' },
    UrlFetchApp: {
      fetchAll: (reqs) => {
        const call = sent.length;
        sent.push(reqs);
        if (throwOn && throwOn(call)) throw new Error('Timeout: https://api.anthropic.com/v1/messages');
        return reqs.map((r, i) => {
          const res = reply ? reply(JSON.parse(r.payload), i, call, r) : { code: 200, body: ANSWER([]) };
          return { getResponseCode: () => res.code, getContentText: () => JSON.stringify(res.body) };
        });
      },
    },
    Date: function () { return { getTime: () => (t += tick) }; },
    JSON, Math, Number, String, Object, Array, Error, parseFloat, isFinite, encodeURIComponent,
  };
  vm.createContext(ctx);
  vm.runInContext(GS_VARS.map(gsVar).concat(GS_FNS.map(gsFn)).join('\n'), ctx);
  ctx.sent = sent;
  return ctx;
}

const SOLD_URL = 'https://www.liveauctioneers.com/item/123456_herend-rothschild-bird-dinner-plates';
const FETCH_URL = 'https://www.invaluable.com/auction-lot/herend-rothschild-plates-8-abc';
const MADE_UP = 'https://www.example-auctions.com/lot/999';
const SEARCH = (urls, id) => ({ type: 'web_search_tool_result', tool_use_id: id || 'srvtoolu_1',
  content: urls.map((u) => ({ type: 'web_search_result', url: u, title: 't', encrypted_content: 'ZW5jcnlwdGVk', page_age: '2026' })) });
const FETCHED = (u, id) => ({ type: 'web_fetch_tool_result', tool_use_id: id || 'srvtoolu_2',
  content: { type: 'web_fetch_result', url: u, content: { type: 'document', source: { type: 'text', media_type: 'text/plain', data: 'Sold for $700' } } } });
const ASKED = (u, id) => ({ type: 'server_tool_use', id: id || 'srvtoolu_3', name: 'web_fetch', input: { url: u } });
const VAL = (over) => Object.assign({ line: 'L1', value: 640, low: 480, high: 800, confidence: 'high', source: 'Auction comps',
  basis: 'Median of 4 sold sets of 8, 2025-2026', comps: [], lookup: 'Herend Rothschild Bird dinner plate', notices: [] }, over || {});
const COMP = (over) => Object.assign({ title: 'Herend Rothschild Bird plates, set of 8', venue: 'LiveAuctioneers',
  saleDate: '2026-03-11', price: 700, url: SOLD_URL, kind: 'sold' }, over || {});
function ANSWER(values, unvalued, before) {
  return { stop_reason: 'tool_use', content: (before || []).concat([{ type: 'thinking', thinking: '' },
    { type: 'tool_use', name: 'record_values', input: { values: values || [], unvalued: unvalued || [] } }]) };
}
const LINE = (over) => Object.assign({ stableId: 's1', mode: 'comps', name: 'Herend Rothschild Bird dinner plates, set of 8',
  category: 'Antiques', qty: 8, condition: 'Good', fileId: 'FID', details: [{ fileId: 'DET' }] }, over || {});
const CTXP = { estate: true, basis: 'Fair Market Value', valuationDate: '2026-06-14' };

// ─── THE REAL APP SIDE ───────────────────────────────────────────────────────
const AV_FNS = ['_avValueButtonHtml', 'agentValueMode', 'agentValueInternal', '_avHasFigure', 'agentValueableRefs', 'agentValueUnreviewed',
  'agentValueStale', 'agentValueSpecialistWorth', '_avValDate', '_avContext', '_avItemPayload', '_avComp', '_avWrite',
  '_avNoteFailure', 'agentValueApply', '_avTakeValue', '_avStampReviewed', 'agentValueRun', 'agentRevalue', '_avStart',
  '_avSendNext', '_avFinish', '_avRepaint', '_avStateHtml', '_avState', 'agentValueAccept', 'agentValueUseSale',
  'agentValueNotices', '_avNoticesHtml', '_avSummary', '_avRowBadges', '_avAcceptButtonHtml', '_avPanelHtml',
  'invValBasisWord', '_avUnreviewedStamp',
  // the real rules they read, never stubs of them
  '_getPhotoRef', '_setPhotoRef', '_jobInvRefs', '_invHasValue', 'roundCents', 'invIsIntrinsic', 'invCatMeta',
  'invFiduciaryMode', 'isDecedentJob', 'docTierProduces', 'docTierOf', 'docTierDef', 'svcHasDocStep', 'estateValueDate',
  '_avdDate', '_ymdLocal', 'resolveValBasis', '_agNameKey', '_agDetailRefs', '_invFileId', 'invAppraisalThreshold',
  'gateDispute', '_gateYes', 'invNeedsAppraisal', 'fmt', '_invMoney', '_invNamed', '_invItemNo', '_andJoin',
  'moneyToNumber', '_readAppsScriptJson', '_invJob'];
const AV_VARS = ['_avRun', '_avForceComps', 'AGENT_VALUE_BATCH', 'AGENT_VALUE_GENERAL_CEILING', 'AGENT_VALUE_MAX_COMPS',
  'AGENT_VALUE_MARK_RE', 'AGENT_VALUE_CONFS', 'AGENT_VALUE_SOURCES', 'AGENT_VALUE_OWN', 'AGENT_VALUE_SALE_DATE_RE',
  'INV_TAXONOMY', 'INV_APPRAISAL_THRESHOLD', 'INV_APPRAISAL_THRESHOLD_DISPUTED', 'DECEDENT_SERVICES', 'DOC_TIERS',
  'DOC_TIER_FROM_SCOPE', 'JOB_STEPS', 'AGENT_MAX_DETAILS', 'INV_VAL_SOURCES'];

// A synchronous, already-settled promise (the runner is synchronous), unwrapping a returned thenable like a real one.
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
const ROW = (over) => Object.assign({ stableId: 's1', label: 'inventory', roomIdx: 2, objectName: 'Herend Rothschild Bird dinner plates, set of 8',
  category: 'Antiques', qty: 8, condition: 'Good', driveFileId: 'FID', ts: 1 }, over || {});
const RES = (over) => Object.assign({ fmv: 640, low: 480, high: 800, confidence: 'high', source: 'Auction comps',
  basis: 'Median of 4 sold sets of 8', comps: [COMP()], lookup: 'Herend Rothschild Bird dinner plate', notices: [], mode: 'comps' }, over || {});

function rig(job, refs, over) {
  over = over || {};
  const posts = [], saved = [], alerts = [];
  let answer = over.answer || (() => ({ ok: true, results: {}, failed: {} }));
  const ctx = sandbox({
    fns: AV_FNS, vars: AV_VARS,
    stubs: Object.assign({
      jobs: [Object.assign({}, job)],
      _photoRefs: { [job.id]: (refs || []).map((r) => Object.assign({}, r)) },
      estimateStore: {},
      _invTouch(r) { r.updatedAt = (r.updatedAt || 0) + 1; return r; },
      savePhotoRefs: (j) => saved.push(j),
      _scheduleInventorySync() {},
      renderInventoryTab() {},
      showSyncBadge() {},
      _todayStr: () => '2026-10-06',
      esc: (x) => String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
      document: domStub({}),
      SHEETS_SYNC_URL: 'https://script.google.com/macros/s/X/exec',
      fetch: (url, opt) => { const body = JSON.parse(opt.body); posts.push(body); const a = answer(body, posts.length - 1);
        return sp({ text: () => sp(JSON.stringify(a)) }); },
      alert: (m) => alerts.push(m),
      confirm: () => (over.confirm === undefined ? true : over.confirm),
      window: { confirm: () => true, prompt() {} },
    }, over.stubs || {}),
  });
  return { ctx, posts, saved, alerts, setAnswer: (f) => { answer = f; } };
}

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();

  // ═══════════════════════════════ THE BACKEND ═══════════════════════════════
  group('S1 · the request: the model, effort, search tools, the strict tool, cached prompt and the fallback');
  {
    const g = gsCtx({ reply: () => ({ code: 200, body: ANSWER([VAL({ comps: [COMP()] })], [], [SEARCH([SOLD_URL])]) }) });
    const out = g.agentValueLines({ context: CTXP, items: [LINE()] });
    ok(out.ok, 'it answers');
    const req = g.sent[0][0];
    const body = JSON.parse(req.payload);
    eq(body.model, 'claude-opus-5-5', 'the model the spec names, its own constant');
    eq(body.output_config, { effort: 'medium' }, 'effort set explicitly, medium to start');
    eq(body.thinking, { type: 'adaptive' }, 'adaptive thinking');
    eq(body.max_tokens, 16000, 'the non-streaming ceiling');
    eq(body.tool_choice, { type: 'auto' }, '⚠ auto, never a forced tool choice (a 400 on this model)');
    eq(body.tools.map((t) => t.type || t.name), ['web_search_20260209', 'web_fetch_20260209', 'record_values'], 'search, fetch and the answer tool on a researched line');
    eq(body.tools[0].max_uses, 5, 'five searches for research');
    eq(body.tools[1].max_uses, 2, 'two page reads');
    eq(body.tools[2].strict, true, 'the answer tool is strict');
    eq(body.system[0].cache_control, { type: 'ephemeral' }, 'the system prompt is cached for the job');
    eq(body.fallbacks, 'default', 'the server-side refusal fallback, opted into');
    eq(req.headers['anthropic-beta'], 'server-side-fallback-2026-07-01', 'with its own beta header');
    eq(req.headers['anthropic-version'], '2023-06-01', 'the API version');
    eq(req.headers['x-api-key'], 'sk-ant-test', 'the key from Script Properties');
    eq(body.messages[0].content.filter((c) => c.type === 'image').length, 2, 'the photograph and its close-up ride with a researched line');
    has(body.messages[0].content.slice(-1)[0].text, 'RESEARCH.', 'marked as research');
    has(body.messages[0].content.slice(-1)[0].text, 'L1. Herend Rothschild Bird dinner plates, set of 8 | Category: Antiques | Quantity: 8 | Condition: Good', 'the line as the model reads it');
    lacks(GS, 'code_execution_20', '⚠ no code-execution tool beside the _20260209 web tools (they carry their own)');
  }

  group('S2 · ordinary lots batch as text, and the tool list never changes with the batch (the cache)');
  {
    const g = gsCtx({ reply: (b) => ({ code: 200, body: ANSWER(
      (b.messages[0].content[0].text.match(/^L\d+/gm) || []).map((l) => VAL({ line: l, value: 40, low: 30, high: 60, source: 'General estimate', comps: [], lookup: '' }))) }) });
    const items = [];
    for (let i = 1; i <= 11; i++) items.push(LINE({ stableId: 'g' + i, mode: 'general', name: 'Lot ' + i, category: 'General/Household', fileId: '', details: [] }));
    const out = g.agentValueLines({ context: CTXP, items });
    eq(g.sent[0].length, 2, 'eleven ordinary lots: two requests (eight, then three)');
    const b1 = JSON.parse(g.sent[0][0].payload), b2 = JSON.parse(g.sent[0][1].payload);
    eq(b1.messages[0].content.length, 1, 'text alone: no photograph is sent for an everyday lot');
    eq((b1.messages[0].content[0].text.match(/^L\d+\./gm) || []).length, 8, 'eight lines, labelled L1 to L8');
    eq((b2.messages[0].content[0].text.match(/^L\d+\./gm) || []).length, 3, 'then three');
    eq(JSON.stringify(b1.tools), JSON.stringify(b2.tools), '⚠⚠ the tool list is identical whatever the batch size, so the cached prompt is read back');
    eq(b1.tools.map((t) => t.type || t.name), ['web_search_20260209', 'record_values'], 'no page reads for an ordinary lot');
    eq(Object.keys(out.results).length, 11, 'every line answered');
    eq(out.results.g9.source, 'General estimate', 'its source');
    eq(out.results.g9.lookup, '', 'no WorthPoint lookup on an ordinary lot');
    eq(out.results.g9.confidence, 'high', 'an ordinary lot keeps its confidence without a comparable (the sold rule is research\'s)');
  }

  group('⚠⚠ S3 · NO INVENTED SALES: a comparable whose link no tool returned is dropped, and the line loses confidence');
  {
    const reply = (before, comps, conf) => () => ({ code: 200, body: ANSWER([VAL({ comps, confidence: conf || 'high' })], [], before) });
    let g = gsCtx({ reply: reply([SEARCH([SOLD_URL])], [COMP(), COMP({ url: MADE_UP, title: 'invented' })]) });
    let r = g.agentValueLines({ context: CTXP, items: [LINE()] }).results.s1;
    eq(r.comps.map((c) => c.url), [SOLD_URL], 'the comparable the search returned is kept; the invented one is gone');
    eq(r.dropped, 1, 'and the drop is counted');
    eq(r.confidence, 'medium', 'high falls to medium for having cited something no tool returned');

    // A link only the MODEL typed (its own fetch request) is not evidence.
    g = gsCtx({ reply: reply([ASKED(MADE_UP)], [COMP({ url: MADE_UP })]) });
    r = g.agentValueLines({ context: CTXP, items: [LINE()] }).results.s1;
    eq(r.comps, [], '⚠ the URL the model asked to fetch is not a URL a tool returned');
    eq(r.confidence, 'low', 'and research with no sold comparable left is low whatever else it found');

    // A fetched page counts, and the key ignores scheme, www., a fragment and a trailing slash.
    g = gsCtx({ reply: reply([FETCHED(FETCH_URL)], [COMP({ url: 'http://invaluable.com/auction-lot/herend-rothschild-plates-8-abc/#lot' })]) });
    r = g.agentValueLines({ context: CTXP, items: [LINE()] }).results.s1;
    eq(r.comps.length, 1, 'a page the fetch returned is evidence, however the model wrote its link');
    eq(r.confidence, 'high', 'and nothing was dropped');

    // Whatever the dynamic filter printed counts too: a link inside a tool result's text.
    g = gsCtx({ reply: reply([{ type: 'bash_code_execution_tool_result', tool_use_id: 'x',
      content: { type: 'bash_code_execution_result', stdout: 'match: ' + SOLD_URL + '\n', stderr: '', return_code: 0 } }], [COMP()]) });
    r = g.agentValueLines({ context: CTXP, items: [LINE()] }).results.s1;
    eq(r.comps.length, 1, 'a link printed by the search\'s own filter is a link a tool returned');

    // Only asking prices: the value may stand, but never above low confidence.
    g = gsCtx({ reply: reply([SEARCH([SOLD_URL])], [COMP({ kind: 'asking' })]) });
    r = g.agentValueLines({ context: CTXP, items: [LINE()] }).results.s1;
    eq(r.confidence, 'low', '⚠ research resting on asking prices alone is low');
    eq(r.comps[0].kind, 'asking', 'and the comparable says what it is');

    has(liveLines(gsFn('_avSeenUrls')), "/_tool_result$/", 'only tool RESULT blocks are read for links');
    lacks(liveLines(gsFn('_avSeenUrls')), 'server_tool_use', 'never the model\'s own tool calls');
  }

  group('S4 · the figures are checked: cents, a range round its point, a negative or missing value refused');
  {
    const one = (v) => gsCtx({ reply: () => ({ code: 200, body: ANSWER([VAL(Object.assign({ comps: [] }, v))], [], []) }) })
      .agentValueLines({ context: CTXP, items: [LINE({ mode: 'general', fileId: '' })] });
    let out = one({ value: 1.005, low: 2, high: 0.5 });
    eq(out.results.s1.fmv, 1.01, 'to the cent, half away from zero, 1.005 is 1.01');
    eq([out.results.s1.low, out.results.s1.high], [1.01, 1.01], 'a range that does not hold its point is put round it');
    out = one({ value: -5 });
    eq(out.failed.s1, 'the answer carried no usable value', 'a negative value is refused, never written');
    out = one({ value: null });
    ok(!!out.failed.s1, 'a missing value is refused');
    const g = gsCtx();
    eq([1.005, 2.675, 0.1 + 0.2, 1234.5678, 0].map((x) => g._avCents(x)), [1.01, 2.68, 0.3, 1234.57, 0], 'the backend\'s cents');
    ok([null, undefined, ''].every((x) => isNaN(g._avCents(x))), '⚠ and a missing figure is no figure, never $0');
    const a = sandbox({ fns: ['roundCents'] });
    eq([1.005, 2.675, 0.1 + 0.2, 1234.5678, 0].map((x) => a.roundCents(x)), [1.01, 2.68, 0.3, 1234.57, 0], '⚠ and the app\'s roundCents agrees');
    out = one({ comps: [COMP({ saleDate: '2026-03-11T14:00:00Z' })] });
    eq(out.results.s1.comps, [], '(an ordinary lot\'s comparable needs a returned link too)');
    const g2 = gsCtx({ reply: () => ({ code: 200, body: ANSWER([VAL({ comps: [COMP({ saleDate: '2026-03-11T14:00:00Z' }), COMP({ saleDate: 'March 2026' })] })], [], [SEARCH([SOLD_URL])]) }) });
    const cs = g2.agentValueLines({ context: CTXP, items: [LINE()] }).results.s1.comps;
    eq(cs.map((c) => c.saleDate), ['2026-03-11', ''], 'a sale date kept only in the shape asked for, never cut from a stamp');
  }

  group('S5 · pause_turn: the turn is sent back as it was, and the API resumes it');
  {
    const g = gsCtx({ reply: (b, i, call) => call === 0
      ? { code: 200, body: { stop_reason: 'pause_turn', content: [{ type: 'server_tool_use', id: 'srvtoolu_1', name: 'web_search', input: { query: 'herend' } }, SEARCH([SOLD_URL])] } }
      : { code: 200, body: ANSWER([VAL({ comps: [COMP()] })]) } });
    const out = g.agentValueLines({ context: CTXP, items: [LINE()] });
    eq(g.sent.length, 2, 'two calls: the paused turn, then its continuation');
    const cont = JSON.parse(g.sent[1][0].payload);
    eq(cont.messages.map((m) => m.role), ['user', 'assistant'], '⚠ the user turn and the paused assistant turn, and no "continue" message');
    eq(cont.messages[1].content[1].type, 'web_search_tool_result', 'the paused content goes back as it came');
    eq(out.results.s1.comps.length, 1, 'a link the search returned BEFORE the pause still counts as evidence');
    eq(out.results.s1.confidence, 'high', 'nothing dropped');

    const stuck = gsCtx({ reply: () => ({ code: 200, body: { stop_reason: 'pause_turn', content: [SEARCH([SOLD_URL])] } }) });
    const o2 = stuck.agentValueLines({ context: CTXP, items: [LINE()] });
    eq(stuck.sent.length, 3, 'the original and two continuations, no more');
    eq(o2.failed.s1, 'the research ran long and stopped before it finished', 'then it is answered as unfinished');
  }

  group('S6 · refusals, cut-offs, prose and per-line misses are failures with a reason, never a guess');
  {
    const run = (body, items) => gsCtx({ reply: () => ({ code: 200, body }) }).agentValueLines({ context: CTXP, items: items || [LINE()] });
    eq(run({ stop_reason: 'refusal', stop_details: { category: 'cyber' }, content: [] }).failed.s1, 'the model declined to value this (cyber)', 'a refusal names its category');
    eq(run({ stop_reason: 'max_tokens', content: [] }).failed.s1, 'the answer was cut off before it finished', 'a cut-off answer');
    eq(run({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'These look valuable.' }] }).failed.s1,
       'the model answered in prose instead of recording a value', '⚠ prose is a failure to record, not a finding');
    const two = [LINE({ stableId: 'a', mode: 'general', fileId: '' }), LINE({ stableId: 'b', mode: 'general', fileId: '' }), LINE({ stableId: 'c', mode: 'general', fileId: '' })];
    const out = run(ANSWER([VAL({ line: 'L1', comps: [] })], [{ line: 'L2', reason: 'no resale market for this' }]), two);
    ok(!!out.results.a, 'the line valued is valued');
    eq(out.failed.b, 'no resale market for this', 'a line the model could not value carries its reason');
    eq(out.failed.c, 'the model did not answer for this line', 'a line it skipped is named as skipped');
    const stray = run(ANSWER([VAL({ line: 'L9', comps: [] })]), [LINE({ mode: 'general', fileId: '' })]);
    eq(Object.keys(stray.results), [], 'an answer for a line nobody asked about is dropped');
    eq(run({ code: 500 }, [LINE({ fileId: 'GONE', details: [] })]).failed.s1, 'File not found: GONE', 'a photograph not yet in Drive fails that line alone');
  }

  group('S7 · an account that refuses the fallback field is sent the request again without it, once');
  {
    const g = gsCtx({ reply: (b) => b.fallbacks
      ? { code: 400, body: { error: { type: 'invalid_request_error', message: 'fallbacks: not available for this organization' } } }
      : { code: 200, body: ANSWER([VAL({ comps: [COMP()] })], [], [SEARCH([SOLD_URL])]) } });
    const out = g.agentValueLines({ context: CTXP, items: [LINE(), LINE({ stableId: 's2' })] });
    eq(Object.keys(out.results).sort(), ['s1', 's2'], 'both lines valued');
    eq(g.sent.length, 2, 'one refused call, one resend');
    ok(g.sent[1].every((r) => !('fallbacks' in JSON.parse(r.payload)) && !r.headers['anthropic-beta']), 'the resend carries neither the field nor its header');
    const other = gsCtx({ reply: () => ({ code: 400, body: { error: { message: 'messages: something else is wrong' } } }) });
    eq(other.agentValueLines({ context: CTXP, items: [LINE()] }).failed.s1, 'messages: something else is wrong', 'any other 400 is a failure, named, and never retried');
    eq(other.sent.length, 1, 'once');
  }

  group('S8 · a fetch that outruns its limit fails its slice, named, and the run goes on; the budget hands back the rest');
  {
    const items = [];
    for (let i = 1; i <= 9; i++) items.push(LINE({ stableId: 'c' + i }));
    const g = gsCtx({ throwOn: (call) => call === 0, reply: () => ({ code: 200, body: ANSWER([VAL({ comps: [COMP()] })], [], [SEARCH([SOLD_URL])]) }) });
    const out = g.agentValueLines({ context: CTXP, items });
    eq(out.timedOut, true, 'it says some took too long');
    eq(Object.keys(out.failed).length, 8, 'the eight in the slice that threw are failed');
    has(out.failed.c1, 'took too long', 'named as such');
    ok(!!out.results.c9, 'and the next slice was still valued');
    // The budget: the clock passes it after the first slice, so the second is handed back.
    const slow = gsCtx({ tick: 70000, reply: () => ({ code: 200, body: ANSWER([VAL({ comps: [COMP()] })], [], [SEARCH([SOLD_URL])]) }) });
    const o2 = slow.agentValueLines({ context: CTXP, items });
    eq(Object.keys(o2.results).length, 8, 'one slice valued inside the budget');
    eq(o2.remaining, 1, 'the rest is counted as remaining, for the app to ask again');
    const none = gsCtx({ props: {} }).agentValueLines({ context: CTXP, items });
    eq(none.ok, false, 'no key: refused');
    has(none.error, 'missing Script Property: ANTHROPIC_API_KEY', 'naming the property');
  }

  group('⚠ S9 · the model is never told a threshold, and never asked to rename, decide or advise');
  {
    const g = gsCtx();
    const sys = g._avSystem(CTXP) + g._avSystem({ estate: false });
    ['3,000', '3000', '$500', 'threshold'].forEach((w) => lacks(sys, w, 'the prompt carries no threshold: ' + w));
    has(sys, 'Never change what a line is called', 'a disagreement with the name is a notice');
    has(sys, 'never set the value on asking prices alone', 'asking prices are not sales');
    has(sys, 'Copy its URL exactly', 'the evidence rule is stated to the model as well as enforced');
    has(g._avSystem(CTXP), 'Value as of 2026-06-14, the valuation date for this estate', 'the estate\'s valuation date');
    has(g._avSystem({ estate: true }), 'not recorded yet', 'an estate with no valuation date says so');
    eq(JSON.stringify(g._avTool('comps')).indexOf('"enum":["L1"'), -1, '⚠ no per-request enum of labels in the tool (it would break the cache)');
  }

  group('S10 · dispatch: the action is wired, listed and versioned');
  {
    has(GS, "if (data.action === 'agentValue')    { return jsonOut(agentValueLines(data)); }", 'doPost routes agentValue');
    const acts = (GS.match(/var BACKEND_ACTIONS = \[([\s\S]*?)\];/) || [])[1] || '';
    has(acts, "'agentValue'", 'BACKEND_ACTIONS lists it');
    const bv = (GS.match(/var BACKEND_VERSION = '([^']+)';/) || [])[1];
    ok(bv >= '2026-10-06b', 'BACKEND_VERSION is bumped with the .gs change (' + bv + ')');
    const B = sandbox({ vars: ['BACKEND_NEEDS', 'BACKEND_FEATURE_COST'] });
    ok(B.BACKEND_NEEDS.indexOf('agentValue') >= 0, 'the app asks for it');
    eq(B.BACKEND_FEATURE_COST.agentValue, 'the desk cannot value lines automatically — every value has to be typed by hand', 'and the banner names what an older deployment costs');
    has(gsFn('testAgentValue'), 'agentValueLines(', 'an editor-run probe, argument-free');
  }

  // ══════════════════════════════ THE APP SIDE ══════════════════════════════
  group('A1 · one rule for how deep a line is researched');
  {
    const { ctx } = rig(ESTATE(), []);
    eq(ctx.agentValueMode(ROW()), 'comps', 'an intrinsic category (Antiques) is researched');
    eq(ctx.agentValueMode(ROW({ category: 'Furniture' })), 'general', 'everyday furniture is an ordinary lot');
    eq(ctx.agentValueMode(ROW({ category: 'Furniture', needsAppr: true })), 'comps', 'a line ticked for appraisal is researched');
    eq(ctx.agentValueMode(ROW({ category: 'Furniture', agentBasis: 'Stickley decal legible inside the drawer; label read' })), 'comps', 'a name read off a label goes to research');
    eq(ctx.agentValueMode(ROW({ category: 'General/Household', agentBasis: 'backstamp legible in detail frame' })), 'comps', 'and off a backstamp');
    eq(ctx.agentValueMode(ROW({ category: 'General/Household', agentBasis: 'form only' })), 'general', 'a guess from the form alone is ordinary');
    ctx._avForceComps.s1 = 1;
    eq(ctx.agentValueMode(ROW({ category: 'General/Household' })), 'comps', 'a line a person sent to research, or the ceiling did');
  }

  group('A2 · where counsel values, the figure stays internal (spec §8)');
  {
    const { ctx } = rig(ESTATE(), []);
    eq(ctx.agentValueInternal(ESTATE({ docTier: 'values' })), false, 'values tier: the figure is the line\'s value');
    eq(ctx.agentValueInternal(ESTATE({ docTier: 'appraisals' })), false, 'appraisals tier too');
    eq(ctx.agentValueInternal(ESTATE({ docTier: 'contents' })), true, 'contents tier: internal');
    eq(ctx.agentValueInternal(ESTATE({ docTier: 'none' })), true, 'none tier: internal');
    eq(ctx.agentValueInternal(LIVING()), false, '⚠ a living client has no tier and is never internal');
  }

  group('⚠⚠ A3 · THE ONE WRITER: the figure, its provenance, and nothing a person owns');
  {
    const { ctx } = rig(ESTATE(), [ROW()]);
    ok(ctx._avWrite(7, 's1', RES(), ESTATE(), {}), 'it writes');
    const r = ctx._getPhotoRef(7, 's1');
    eq([r.fmv, r.valLow, r.valHigh], [640, 480, 800], 'the value and its range');
    eq(r.valDate, '2026-06-14', 'the estate\'s valuation date (the date of death)');
    eq(r.valSource, 'Auction comps', 'the source');
    eq(r.valNote, 'Median of 4 sold sets of 8', 'the basis sentence');
    eq([r.valuedBy, r.valConf, r.valNameAt], ['agent', 'high', 'Herend Rothschild Bird dinner plates, set of 8'], 'who, how sure, and the name it valued');
    eq(r.valComps[0].url, SOLD_URL, 'the comparables');
    eq(r.valLookup, 'Herend Rothschild Bird dinner plate', 'the WorthPoint lookup');
    eq(r.valReviewed, undefined, '⚠ unreviewed: the desk accepts it');
    eq([r.objectName, r.category, r.qty], ['Herend Rothschild Bird dinner plates, set of 8', 'Antiques', 8], 'the name, category and quantity are untouched');
    const body = liveLines(fn('_avWrite'));
    ['objectName =', 'category =', 'qty =', 'disposition', 'channel', 'flagNFA', 'flagBequest', 'flagDisputed', 'flagExempt',
     'assetTrack', 'needsAppr', 'authBy', 'approvalDate', 'receiptDoc', 'gross', 'fees', 'itemNo', 'apprId'].forEach((k) => lacks(body, k, 'the writer never touches ' + k));
    ok(!/\bref\.reviewed\b/.test(body), 'nor the line\'s own review tick');

    // A sale date is kept only in the shape the tool asks for, whatever reached the app.
    eq(['2026-03-11T14:00:00Z', '2026-03', '2026', 'March 2026', ''].map((d) => ctx._avComp({ saleDate: d, price: 1, url: SOLD_URL, kind: 'sold' }).saleDate),
       ['2026-03-11', '2026-03', '2026', '', ''], 'a sale date is cut to its date shape, never left as a stamp or prose');

    // A living client: valued today.
    const L = rig(LIVING(), [ROW()]);
    L.ctx._avWrite(7, 's1', RES(), LIVING(), {});
    eq(L.ctx._getPhotoRef(7, 's1').valDate, '2026-10-06', 'a living job is valued on the day of the run');

    // Internal: nothing a document could print.
    const C = rig(ESTATE({ docTier: 'contents' }), [ROW({ valSource: 'Appraisal' })]);
    C.ctx._avWrite(7, 's1', RES(), ESTATE({ docTier: 'contents' }), {});
    const c = C.ctx._getPhotoRef(7, 's1');
    eq([c.fmv, c.valDate, c.valNote], [undefined, undefined, undefined], '⚠⚠ on the contents tier no fmv, valuation date or basis is written');
    eq(c.valSource, 'Appraisal', 'and a source somebody recorded is left alone');
    eq([c.valLow, c.valHigh, c.valuedBy], [480, 800, 'agent'], 'the range stays on the desk');

    // A missing figure writes nothing (roundCents would have made it $0).
    const M = rig(ESTATE(), [ROW()]);
    eq(M.ctx._avWrite(7, 's1', RES({ fmv: null }), ESTATE(), {}), false, '⚠ an answer with no figure writes nothing');
    eq(M.ctx._getPhotoRef(7, 's1').fmv, undefined, 'never a value of $0');
  }

  group('⚠⚠ A4 · a figure somebody else recorded is never overwritten; Re-value replaces only the agent\'s own');
  {
    const { ctx } = rig(ESTATE(), [ROW({ fmv: 900, valuedBy: 'desk' }), ROW({ stableId: 's2', fmv: 5000, valSource: 'Appraisal', valuedBy: 'appraiser' }),
      ROW({ stableId: 's3', fmv: 300, valuedBy: 'agent', valLow: 200, valHigh: 400 }), ROW({ stableId: 's4', fmv: 250 })]);
    eq(ctx._avWrite(7, 's1', RES(), ESTATE(), { revalue: true }), false, 'a desk value stands, even on a Re-value');
    eq(ctx._getPhotoRef(7, 's1').fmv, 900, 'untouched');
    eq(ctx._avWrite(7, 's2', RES(), ESTATE(), { revalue: true }), false, 'an appraisal stands');
    eq(ctx._avWrite(7, 's4', RES(), ESTATE(), { revalue: true }), false, 'a value typed before this build (no valuedBy) stands');
    eq(ctx._avWrite(7, 's3', RES(), ESTATE(), {}), false, 'the agent\'s own is not replaced by an ordinary run');
    eq(ctx._avWrite(7, 's3', RES(), ESTATE(), { revalue: true }), true, 'Re-value replaces it');
    eq(ctx._getPhotoRef(7, 's3').fmv, 640, 'with the new figure');
    const names = ctx.agentValueableRefs(7).map((r) => r.stableId);
    eq(names, [], 'and none of them is sent again by Value the unvalued lines');
  }

  group('A5 · the ceiling: an ordinary lot that comes back above it is researched instead, in the same run');
  {
    const { ctx } = rig(ESTATE(), [ROW({ category: 'Furniture' })]);
    eq(ctx.agentValueApply(7, 's1', RES({ mode: 'general', fmv: 400, source: 'General estimate', comps: [] }), ESTATE(), {}), 'research', 'over $250: sent to research');
    eq(ctx._getPhotoRef(7, 's1').fmv, undefined, 'its first figure is never written');
    eq(ctx.agentValueMode(ctx._getPhotoRef(7, 's1')), 'comps', 'the line is now researched');
    eq(ctx.agentValueApply(7, 's1', RES({ mode: 'comps', fmv: 400 }), ESTATE(), {}), 'valued', 'and the researched figure is written');
    const { ctx: c2 } = rig(ESTATE(), [ROW({ category: 'Furniture' })]);
    eq(c2.agentValueApply(7, 's1', RES({ mode: 'general', fmv: 250, source: 'General estimate', comps: [] }), ESTATE(), {}), 'valued', 'at the ceiling it is an ordinary lot');
  }

  group('⚠⚠ A6 · WHO OWNS A FIGURE: the desk by typing, the appraisal outright (spec §2.3)');
  {
    const agent = () => ROW({ fmv: 640, valLow: 480, valHigh: 800, valComps: [COMP()], valLookup: 'x', valConf: 'high', valuedBy: 'agent',
      valSource: 'Auction comps', valNotices: [{ kind: 'appraiser', text: 'signed' }], valNameAt: 'n', valAgentAt: 1 });
    const { ctx } = rig(ESTATE(), [agent()]);
    let r = ctx._getPhotoRef(7, 's1'); r.fmv = 700; ctx._avTakeValue(r, 'typed');
    eq([r.valuedBy, r.valConf], ['desk', undefined], 'a value typed over the agent\'s is the desk\'s, its confidence cleared');
    eq(r.valSource, 'Auction comps', 'the source is left for the person to change');
    const { ctx: c2 } = rig(ESTATE(), [agent()]);
    r = c2._getPhotoRef(7, 's1'); r.valSource = 'Appraisal'; c2._avTakeValue(r, 'appraisal');
    eq(r.valuedBy, 'appraiser', 'a source set to Appraisal takes the line');
    eq([r.valLow, r.valHigh, r.valComps, r.valLookup, r.valConf, r.valNotices], [undefined, undefined, undefined, undefined, undefined, undefined],
       '⚠ and the agent\'s range, comparables, lookup, confidence and notices go with it');
    eq(r.fmv, 640, 'the figure on the line is the appraisal\'s to keep or correct');
    const { ctx: c3 } = rig(ESTATE(), [Object.assign(agent(), { apprId: 'a1' })]);
    r = c3._getPhotoRef(7, 's1'); r.fmv = 5200; c3._avTakeValue(r, 'typed');
    eq([r.valuedBy, r.valSource, r.valHigh], ['appraiser', 'Appraisal', undefined], 'a value typed over the agent\'s on a line with an appraiser linked is the appraisal');
    // The real handlers ask the one rule.
    has(liveLines(fn('_invEdit')), "if (key === 'fmv') _avTakeValue(ref, 'typed');", '_invEdit asks it for a typed value');
    has(liveLines(fn('_invEdit')), "else if (key === 'valSource' && ref.valSource === 'Appraisal') _avTakeValue(ref, 'appraisal');", 'and for a source set to Appraisal');
    has(liveLines(fn('_invBulkApply')), "if (key === 'valSource' && value === 'Appraisal') _avTakeValue(ref, 'appraisal');", 'and so does the bulk bar');
  }

  group('⚠⚠ A7 · A RANGE THAT CROSSES THE THRESHOLD IS AN APPRAISAL (invNeedsAppraisal, spec §6)');
  {
    const { ctx } = rig(ESTATE(), []);
    const J = ESTATE();
    eq(ctx.invNeedsAppraisal(ROW({ fmv: 2800, valLow: 2500, valHigh: 4000, valuedBy: 'agent' }), J), true, '$2,500 to $4,000 is an appraisal whatever the point says');
    eq(ctx.invNeedsAppraisal(ROW({ fmv: 2800, valLow: 2500, valHigh: 2900, valuedBy: 'agent' }), J), false, 'a range under the threshold is not');
    eq(ctx.invNeedsAppraisal(ROW({ fmv: 2800, valHigh: 4000, valuedBy: 'desk' }), J), false, 'a desk figure reads its own value, not a range it inherited');
    eq(ctx.invNeedsAppraisal(ROW({ valHigh: 3500, valuedBy: 'agent' }), ESTATE({ docTier: 'contents' })), true, 'on an internal tier the range alone recommends the appraisal to counsel');
    eq(ctx.invNeedsAppraisal(ROW({ valHigh: 900, valuedBy: 'agent' }), ESTATE({ docTier: 'contents' })), false, 'and clears a line it puts under the threshold');
    eq(ctx.invNeedsAppraisal(ROW({ fmv: 300, valHigh: 600, valuedBy: 'agent' }), ESTATE({ gateDispute: 'yes' })), true, 'a disputed estate\'s $500');
    eq(ctx.invNeedsAppraisal(ROW({ fmv: 2800, valHigh: 9000, valuedBy: 'agent', category: 'Furniture' }), J), false, 'the category gate is unchanged: furniture is never flagged by value');
    eq(ctx.invNeedsAppraisal(ROW({ fmv: 2800, valHigh: 9000, valuedBy: 'agent' }), LIVING()), false, '⚠ a living job stays the explicit tick');
    eq(ctx.agentValueSpecialistWorth(ROW({ fmv: 2800, valHigh: 9000, valuedBy: 'agent' }), LIVING()), true, 'and there the range is a notice: worth a specialist');
    eq(ctx.agentValueSpecialistWorth(ROW({ fmv: 2800, valHigh: 9000, valuedBy: 'agent' }), J), false, 'never on an estate (the appraisal flag is the answer there)');
  }

  group('A8 · a value made for an earlier name (spec §5a): the Banksy case');
  {
    const { ctx } = rig(ESTATE(), [ROW({ objectName: 'Banksy, Girl with Balloon, original', category: 'Art & Décor' })]);
    ctx._avWrite(7, 's1', RES({ fmv: 250000, low: 200000, high: 300000 }), ESTATE(), {});
    let r = ctx._getPhotoRef(7, 's1');
    eq(ctx.agentValueStale(r), false, 'fresh');
    r.objectName = '  banksy, girl with balloon, ORIGINAL. ';
    eq(ctx.agentValueStale(r), false, 'spacing, case and a trailing stop are the same name');
    r.objectName = 'Banksy, Girl with Balloon, reproduction print';
    eq(ctx.agentValueStale(r), true, 'renamed a reproduction at the desk: the figure was made for something else');
    has(ctx._avRowBadges(ESTATE(), r).join(' '), 'value made for an earlier name', 'the row says so');
    has(ctx._avNoticesHtml(ESTATE(), [r]), 'Value made for an earlier name', 'and so does the work bar, first');
    has(ctx._avPanelHtml(ESTATE(), r), 'Re-value', 'the line\'s record offers Re-value');
  }

  group('A9 · what is sent: named lines with no figure from anybody; unnamed ones are left for Agent One');
  {
    const refs = [ROW({ stableId: 'a' }), ROW({ stableId: 'b', objectName: '' }), ROW({ stableId: 'c', fmv: 100 }),
      ROW({ stableId: 'd', valuedBy: 'agent', valHigh: 300 }), ROW({ stableId: 'e', valFailed: 'no market' }),
      ROW({ stableId: 'f', deletedAt: 5 }), ROW({ stableId: 'g', fmv: '' })];
    const { ctx } = rig(ESTATE({ docTier: 'contents' }), refs);
    eq(ctx.agentValueableRefs(7).map((r) => r.stableId), ['a', 'e', 'g'], 'unvalued, named and live (a failure is asked again; a blank is unvalued)');
    const p = ctx._avItemPayload(7, ctx._getPhotoRef(7, 'a'));
    eq([p.mode, p.fileId, p.qty], ['comps', 'FID', 8], 'a researched line carries its photograph');
    lacks(JSON.stringify(Object.keys(p)), 'disposition', 'and nothing the model must not act on');
    const p2 = ctx._avItemPayload(7, ROW({ stableId: 'x', category: 'Furniture' }));
    eq([p2.mode, p2.fileId, p2.details], ['general', '', []], 'an ordinary lot travels as text');
    eq(ctx._avContext(ESTATE()), { estate: true, basis: 'Fair Market Value', valuationDate: '2026-06-14' }, 'the job\'s context');
    eq(ctx._avContext(LIVING()).valuationDate, '2026-10-06', 'a living job values today');
  }

  group('A10 · the run: by id, re-asked for what was not answered, the ceiling re-sent, named when nothing comes back');
  {
    const refs = [ROW({ stableId: 'a' }), ROW({ stableId: 'b', category: 'Furniture' }), ROW({ stableId: 'c', category: 'Furniture' })];
    const R = rig(ESTATE(), refs, { answer: (body, n) => {
      if (n === 0) return { ok: true, results: { a: RES(), b: RES({ mode: 'general', fmv: 600, source: 'General estimate', comps: [] }) }, failed: {}, remaining: 1 };
      if (n === 1) return { ok: true, results: { c: RES({ mode: 'general', fmv: 40, low: 30, high: 60, source: 'General estimate', comps: [] }), b: RES({ fmv: 650 }) }, failed: {} };
      return { ok: true, results: {}, failed: {} };
    } });
    R.ctx.agentValueRun(7);
    eq(R.posts.length, 2, 'two calls');
    eq(R.posts[0].action, 'agentValue', 'the action');
    eq(R.posts[0].items.map((i) => [i.stableId, i.mode]), [['a', 'comps'], ['b', 'general'], ['c', 'general']], 'every line, with its depth');
    eq(R.posts[1].items.map((i) => [i.stableId, i.mode]), [['c', 'general'], ['b', 'comps']], 'then what was not answered, and the line over the ceiling, researched');
    eq(R.ctx._getPhotoRef(7, 'b').fmv, 650, 'the researched figure, never the ordinary one');
    eq(R.ctx._getPhotoRef(7, 'c').valSource, 'General estimate', 'an ordinary lot\'s source');
    const st = R.ctx._avState(7);
    eq([st.valued, st.researched, st.running, st.error], [3, 1, false, ''], 'three valued, one sent on to research, done');
    has(R.ctx._avStateHtml(7), '3 valued', 'the line under the button says so');

    const E = rig(ESTATE(), [ROW()], { answer: () => ({ ok: true, results: {}, failed: {} }) });
    E.ctx.agentValueRun(7);
    has(E.ctx._avState(7).error, 'answered for none of the 1 lines', '⚠ a call that answers nothing ends the run, named, instead of looping');
    const O = rig(ESTATE(), [ROW()], { answer: () => ({ ok: false, error: 'Unknown action' }) });
    O.ctx.agentValueRun(7);
    eq(O.ctx._avState(7).error, 'Unknown action', 'an old deployment is named, never silent');
    const F = rig(ESTATE(), [ROW()], { answer: () => ({ ok: true, results: {}, failed: { s1: 'no sold comparables found' } }) });
    F.ctx.agentValueRun(7);
    eq(F.ctx._getPhotoRef(7, 's1').valFailed, 'no sold comparables found', 'a failure is recorded on the line, with its reason');
    has(F.ctx._avRowBadges(ESTATE(), F.ctx._getPhotoRef(7, 's1')).join(' '), 'not valued', 'and the row says so');
    const N = rig(ESTATE(), [ROW({ objectName: '' })]);
    N.ctx.agentValueRun(7);
    has(N.alerts[0], 'no name yet', 'nothing named: it says to name the lines first');
    eq(N.posts.length, 0, 'and sends nothing');
  }

  group('A11 · Re-value: one line, researched, never over a person\'s or an appraiser\'s figure');
  {
    const R = rig(ESTATE(), [ROW({ category: 'Furniture', fmv: 300, valuedBy: 'agent', valLow: 200, valHigh: 400, valSource: 'General estimate' }),
      ROW({ stableId: 'd', fmv: 900, valuedBy: 'desk' })], { answer: () => ({ ok: true, results: { s1: RES({ fmv: 450 }) }, failed: {} }) });
    R.ctx.agentRevalue(7, 'd');
    has(R.alerts[0], 'a person recorded', 'a desk value is refused by name');
    eq(R.posts.length, 0, 'and nothing is sent');
    R.ctx.agentRevalue(7, 's1');
    eq(R.posts[0].items[0].mode, 'comps', 'the line goes to research');
    eq(R.ctx._getPhotoRef(7, 's1').fmv, 450, 'and the agent\'s own figure is replaced');
    eq(R.ctx._getPhotoRef(7, 's1').valReviewed, undefined, 'unreviewed again');
  }

  group('A12 · Accept, one line or a selection; the selection touches only lines with an unreviewed agent figure');
  {
    const R = rig(ESTATE(), [ROW({ fmv: 640, valuedBy: 'agent', valHigh: 800 }), ROW({ stableId: 'd', fmv: 900, valuedBy: 'desk', updatedAt: 50 })]);
    R.ctx.agentValueAccept(7, 's1');
    const r = R.ctx._getPhotoRef(7, 's1');
    eq([r.valReviewed, r.valReviewedBy], [true, 'Ashley Jerome'], 'accepted, by the job\'s concierge (as the line\'s own review is)');
    eq(R.ctx.agentValueUnreviewed(r), false, 'no longer unreviewed');
    R.ctx.agentValueAccept(7, 'd');
    eq(R.ctx._getPhotoRef(7, 'd').valReviewed, undefined, 'Accept on a desk figure writes nothing');
    const bulk = liveLines(fn('_invBulkApply'));
    has(bulk, "if (!agentValueUnreviewed(ref)) return;", '⚠ the bulk accept skips every other line, its clock included');
    has(bulk, "key !== 'valReviewed'", 'and passes the placeholder guard, as Mark reviewed does');
    has(liveLines(fn('_renderInvBulk')), "picked.some(agentValueUnreviewed)", 'the bar offers it only while the selection holds one');
  }

  group('A13 · a WorthPoint sale pasted at the desk (spec §4a)');
  {
    const seed = {};
    const doc = { getElementById: (id) => (id in seed ? { value: seed[id] } : null) };
    const R = rig(ESTATE(), [ROW({ fmv: 640, valuedBy: 'agent', valHigh: 800, valComps: [COMP()] }), ROW({ stableId: 'n', valFailed: 'no market' })], { stubs: { document: doc } });
    R.ctx.agentValueUseSale(7, 's1');
    has(R.alerts[0], 'its title, its price and its link', 'refused by name, everything missing at once');
    eq(R.ctx._getPhotoRef(7, 's1').valComps.length, 1, 'and nothing written');
    Object.assign(seed, { 'av-wp-title-s1': 'Herend Rothschild Bird, 8 dinner plates', 'av-wp-price-s1': '$725.50',
      'av-wp-date-s1': '2026-02-01', 'av-wp-url-s1': 'https://www.worthpoint.com/worthopedia/herend-123' });
    R.ctx.agentValueUseSale(7, 's1');
    const r = R.ctx._getPhotoRef(7, 's1');
    eq(r.valComps[0], { title: 'Herend Rothschild Bird, 8 dinner plates', venue: 'WorthPoint', saleDate: '2026-02-01', price: 725.5,
      url: 'https://www.worthpoint.com/worthopedia/herend-123', kind: 'sold', by: 'desk' }, 'the sale goes first in the comparables');
    eq(r.valSource, 'WorthPoint comps', 'the source names it');
    eq(r.valReviewed, true, 'and the value is reviewed');
    eq(r.fmv, 640, 'the figure is the person\'s to change, not the paste\'s');
    Object.assign(seed, { 'av-wp-title-n': 'x', 'av-wp-price-n': '120', 'av-wp-url-n': 'https://www.worthpoint.com/w/1' });
    R.ctx.agentValueUseSale(7, 'n');
    const n = R.ctx._getPhotoRef(7, 'n');
    eq([n.fmv, n.valuedBy, n.valSource], [120, 'desk', 'WorthPoint comps'], 'a line with no figure takes the sale\'s price as a person\'s value');
    const C = rig(ESTATE({ docTier: 'contents' }), [ROW({ valuedBy: 'agent', valHigh: 800, valLow: 500 })], { stubs: { document: doc } });
    Object.assign(seed, { 'av-wp-title-s1': 't' });
    C.ctx.agentValueUseSale(7, 's1');
    const c = C.ctx._getPhotoRef(7, 's1');
    eq([c.valSource, c.fmv], [undefined, undefined], '⚠ where counsel values, no source and no figure are written');
    eq(c.valReviewed, true, 'the internal figure is reviewed all the same');
  }

  group('⚠ A14 · the schedules: an unreviewed agent value counts, the page says how many, and each line names its basis');
  {
    const { ctx } = rig(ESTATE(), []);
    const SRC = sandbox({ vars: ['INV_VAL_SOURCES'] }).INV_VAL_SOURCES;
    ok(SRC.indexOf('General estimate') >= 0 && SRC.indexOf('WorthPoint comps') >= 0, 'the two new sources are on the list');
    SRC.forEach((s) => {
      const w = ctx.invValBasisWord({ fmv: 1, valSource: s });
      ok(!!w && w.toLowerCase() === s.toLowerCase(), 'every source has its word on a schedule: ' + s + ' → ' + w);
    });
    eq(['Appraisal', 'Auction comps', 'General estimate', 'WorthPoint comps'].map((s) => ctx.invValBasisWord({ fmv: 1, valSource: s })),
       ['appraisal', 'auction comps', 'general estimate', 'WorthPoint comps'], 'Anthony\'s four, in the reader\'s words');
    eq(ctx.invValBasisWord({ fmv: '', valSource: 'Appraisal' }), '', 'no value, no basis');
    eq(ctx.invValBasisWord({ fmv: 5, valSource: 'Sotheby\'s estimate' }), 'Sotheby\'s estimate', 'a source typed off the list prints as typed');
    const lines = [ROW({ fmv: 640, valuedBy: 'agent', valHigh: 800 }), ROW({ stableId: 'b', fmv: 90, valuedBy: 'agent', valHigh: 100, valReviewed: true }),
      ROW({ stableId: 'c', fmv: 50, valuedBy: 'desk' }), ROW({ stableId: 'd', valuedBy: 'agent', valHigh: 100 })];
    has(ctx._avUnreviewedStamp(lines), '1 value not yet reviewed', 'one unreviewed figure on the page (an internal range prints nowhere)');
    eq(ctx._avUnreviewedStamp([lines[1], lines[2]]), '', 'none: no stamp');
    // The real schedules carry it, beside the status, and the shared table names the basis.
    has(liveLines(fn('printCourtInventory')), '_avUnreviewedStamp(onSched)', 'the Court Inventory counts its own lines');
    has(liveLines(fn('printTrustSchedule')), '_avUnreviewedStamp(onSched)', 'the Trust Schedule too');
    has(liveLines(fn('printEstateInventoryReport')), '_avUnreviewedStamp(all)', 'and the Estate Inventory Report');
    const sec = sandbox({ fns: ['_invScheduleSection', 'invValBasisWord', '_invHasValue', '_invMoney', 'fmt', 'roundCents'],
      stubs: { esc: (x) => String(x == null ? '' : x) } })._invScheduleSection('Tangible Personal Property',
      [ROW({ fmv: 640, valSource: 'Auction comps' }), ROW({ stableId: 'b', fmv: 40, valSource: 'General estimate', category: 'General/Household', qty: 60 })]);
    has(sec.html, '<th style="padding:2px 6px;">Basis</th>', 'the table has a Basis column');
    has(sec.html, '>auction comps</td>', 'a researched line reads auction comps');
    has(sec.html, '>general estimate</td>', 'an ordinary lot reads general estimate');
    eq(sec.total, 680, 'and the total still adds up its own rows');
    has(sec.html, '<td colspan="3"', 'the subtotal spans the three words columns');
  }

  group('A15 · the desk: the button, the chip, the row, the panel, the notices');
  {
    const { ctx } = rig(ESTATE(), []);
    const unrev = ROW({ fmv: 640, valuedBy: 'agent', valLow: 480, valHigh: 800, valConf: 'low', valSource: 'Auction comps', valNote: 'Median of 4', valNotices: [{ kind: 'appraiser', text: 'signed and numbered' }] });
    const badges = ctx._avRowBadges(ESTATE(), unrev).join(' ');
    has(badges, 'agent value &middot; unsure', 'an unsure agent figure says so on the row');
    has(ctx._avAcceptButtonHtml(7, unrev), "agentValueAccept(7,'s1')", 'Accept sits under the value it accepts');
    eq(ctx._avAcceptButtonHtml(7, ROW({ fmv: 1, valuedBy: 'desk' })), '', 'and nowhere else');
    has(ctx._avNoticesHtml(ESTATE(), [unrev]), 'Appraisal advised', 'its notice reaches the work bar');
    eq(ctx._avNoticesHtml(ESTATE(), [Object.assign({}, unrev, { valReviewed: true })]), '', 'an accepted value has had its look: its notices go quiet');
    const internal = ctx._avRowBadges(ESTATE({ docTier: 'contents' }), ROW({ valuedBy: 'agent', valLow: 480, valHigh: 800 })).join(' ');
    has(internal, 'agent $480&ndash;$800 &middot; internal', 'on the contents tier the range shows on the desk, marked internal');
    has(ctx._avPanelHtml(ESTATE({ docTier: 'contents' }), ROW({ valuedBy: 'agent', valLow: 480, valHigh: 800 })), 'no document prints it', 'and its record says why');
    has(ctx._avRowBadges(LIVING(), ROW({ fmv: 2800, valuedBy: 'agent', valHigh: 9000 })).join(' '), 'worth a specialist', 'a living job\'s range over the threshold');
    eq(ctx._avPanelHtml(ESTATE(), ROW()), '', '⚠ nothing on a line Agent Two has not touched');
    const panel = ctx._avPanelHtml(ESTATE(), Object.assign({}, unrev, { valComps: [COMP(), COMP({ kind: 'asking', url: 'https://x.example/1' })], valLookup: 'Herend Rothschild',
      driveFileUrl: 'https://drive.google.com/file/d/FID/view' }));
    has(panel, 'SOLD', 'the comparables, sold'); has(panel, 'ASKING', 'and asking');
    has(panel, 'WorthPoint search: <code>Herend Rothschild</code>', 'the WorthPoint lookup');
    has(panel, 'Use this sale', 'the paste form');
    has(panel, 'href="https://drive.google.com', 'or the photograph link when the line carries one');
    const flags = sandbox({ vars: ['INV_WORK_FLAGS'], fns: ['agentValueUnreviewed', '_avHasFigure', '_invHasValue'] }).INV_WORK_FLAGS;
    eq(flags[1].key, 'unrevval', 'the Unreviewed values chip sits beside Unnamed shots');
    eq(flags[1].test(unrev), true, 'and counts the one test');
    const bar = liveLines(fn('_renderInvWorkbar'));
    has(bar, '+ _avValueButtonHtml(job)', 'the work bar draws Value N lines');
    const VB = rig(ESTATE(), [ROW({ stableId: 'a' }), ROW({ stableId: 'b', category: 'Furniture' }), ROW({ stableId: 'c', fmv: 5 }), ROW({ stableId: 'd', objectName: '' })]);
    const vb = VB.ctx._avValueButtonHtml(ESTATE());
    has(vb, '>Value 2 lines</button>', '⚠ the button renders, counting the named lines with no figure');
    has(vb, 'onclick="agentValueRun(7)"', 'and presses the run');
    eq(rig(ESTATE(), [ROW({ fmv: 5 })]).ctx._avValueButtonHtml(ESTATE()), '', 'and withdraws once there are none');
    has(rig(ESTATE({ docTier: 'contents' }), [ROW()]).ctx._avValueButtonHtml(ESTATE({ docTier: 'contents' })), 'no document prints it', 'where counsel values its title says the figure stays on the desk');
    has(bar, "'<div id=\"inv-value-state\"", 'with its state line');
    has(bar, '_avNoticesHtml(job, all)', 'and its notices');
  }

  group('⚠ A17 · DRIVEN, NOT GREPPED: the real row, its record and the bulk bar carry Agent Two');
  {
    // The row and its record, rendered by the real functions (Agent One's row rig, with Agent Two's figure on the line).
    const rowRig = (row, job) => sandbox({
      fns: ['_renderInvRow', 'collectionLineUnshot', '_invHasPhoto', '_collPanelHtml', '_arDupEligible', '_avRowBadges', 'agentValueStale', 'agentValueUnreviewed', 'agentValueSpecialistWorth', '_avAcceptButtonHtml',
            '_avHasFigure', '_invHasValue', '_avSummary', 'fmt', 'roundCents', 'agentValueInternal', 'docTierProduces', 'docTierOf', 'docTierDef', 'svcHasDocStep',
            'invAppraisalThreshold', 'gateDispute', '_gateYes', '_agNameKey', '_invRowDomId', '_invRecipientInput', '_renderInvPanel', '_avPanelHtml', '_invMoney', '_invDetailRefs',
            '_invPhotoSiblings', '_invPhotoSource', '_invDerivedRefs', '_getPhotoRef', '_invNamed', '_invItemNo',
            'invDealerRouteOffered', 'invDealerRoute', 'invDealerRouteText', '_invFirearmPanelHtml',
            'invBequestFor', 'jobListEntries', 'invApprovalGap', 'invReceiptOwed', '_invBenListAttr',
            'invRatificationOwed', 'invFiduciaryMode', 'isDecedentJob', 'invReleaseCautions', '_invJob', 'invHavellinRecipient',
            // P22 (merged): the row reads a pickup record and a name left on a line moved off To a person.
            'invPickupRecord', 'signedRecordsOf', 'invChannelLeftover', 'invChannelLeftoverText', '_invPanelLeftoverHtml'],
      vars: ['INV_RELEASE_DISPOSITIONS', 'INVENTORY_COLUMNS', '_invOpen', '_invPick', '_agDupSet', 'DECEDENT_SERVICES', 'INV_RELEASE_CAUTIONS',
             'DOC_TIERS', 'DOC_TIER_FROM_SCOPE', 'JOB_STEPS', 'INV_APPRAISAL_THRESHOLD', 'INV_APPRAISAL_THRESHOLD_DISPUTED'],
      stubs: {
        jobs: [job], _invInput: () => '<input>', _invThumbHTML: () => '<div></div>', _invRoomName: () => 'Dining Room',
        invIsFirearm: () => false, invReleaseBlocked: () => false, invAwaitingAppraisal: () => false,
        custodyEvents: () => [], _invPanelCols: () => [], INV_PANEL_SECTIONS: [], _invPanelCautionHtml: () => '',
        esc: (x) => String(x == null ? '' : x),
        _photoRefs: { 7: [row] },
      },
    });
    const agentRow = ROW({ stableId: 's1', fmv: 640, valLow: 480, valHigh: 800, valuedBy: 'agent', valConf: 'high', valSource: 'Auction comps',
      valComps: [COMP()], valLookup: 'Herend Rothschild', driveFileUrl: 'https://drive.google.com/file/d/FID/view' });
    let R = rowRig(agentRow, ESTATE());
    let html = R._renderInvRow(ESTATE(), R._photoRefs[7][0]);
    has(html, '>agent value<', 'the real row carries the agent-value badge');
    has(html, "agentValueAccept(7,'s1')", 'and Accept under the value');
    lacks(html, 'Agent Two</div>', 'a closed row draws no record');
    R._invOpen.s1 = 1;
    html = R._renderInvRow(ESTATE(), R._photoRefs[7][0]);
    has(html, '>Agent Two</div>', 'the open record carries Agent Two\'s section');
    has(html, 'Use this sale', 'with the WorthPoint paste');
    R = rowRig(ROW({ stableId: 's1', fmv: 900, valuedBy: 'desk' }), ESTATE());
    html = R._renderInvRow(ESTATE(), R._photoRefs[7][0]);
    lacks(html, 'agent value', 'a desk figure carries no agent badge');
    lacks(html, 'agentValueAccept', 'and no Accept');
    R = rowRig(ROW({ stableId: 's1', valuedBy: 'agent', valLow: 480, valHigh: 800 }), ESTATE({ docTier: 'contents' }));
    has(R._renderInvRow(ESTATE({ docTier: 'contents' }), R._photoRefs[7][0]), 'agent $480&ndash;$800 &middot; internal', 'an internal range on the row');

    // The bulk bar's sentence: Accept values keeps its own, the catch-all never overwrites it.
    const picks = [ROW({ stableId: 'a', fmv: 640, valuedBy: 'agent', valHigh: 800 }), ROW({ stableId: 'd', fmv: 900, valuedBy: 'desk', updatedAt: 9 })];
    const B = sandbox({
      fns: ['_invBulkApply', 'agentValueUnreviewed', '_avHasFigure', '_invHasValue', '_avStampReviewed', '_avTakeValue', '_invKeyOnJob', '_invColOnJob',
            '_getPhotoRef', '_setPhotoRef', '_invJob', 'invFiduciaryMode', 'isDecedentJob'],
      vars: ['INVENTORY_COLUMNS', 'DECEDENT_SERVICES', 'AGENT_VALUE_OWN'],
      stubs: { jobs: [ESTATE()], _photoRefs: { 7: picks }, _invPicked: (j) => picks, _invTouch(r) { r.updatedAt = (r.updatedAt || 0) + 1; return r; },
               savePhotoRefs() {}, _scheduleInventorySync() {}, showSyncBadge() {}, renderInventoryTab() {}, _invMatchesFilter: () => true, _invBulkLast: null },
    });
    B._invBulkApply(7, 'valReviewed', 1);
    eq(picks[0].valReviewed, true, 'the agent figure is accepted');
    eq([picks[1].valReviewed, picks[1].updatedAt], [undefined, 9], 'the desk figure is untouched, its clock included');
    eq(B._invBulkLast.msg, '1 value accepted (1 of the 2 selected carried no unreviewed agent value and were left as they were).',
       '⚠ the bar says what it did, and the catch-all "2 items updated" never overwrites it');
    B._invBulkApply(7, 'valSource', 'Appraisal');
    eq([picks[0].valuedBy, picks[0].valHigh], ['appraiser', undefined], 'Appraisal set across a selection takes the agent\'s line outright');
  }

  group('A16 · the manifest keeps every field (a key missing from the whitelist is dropped on every save)');
  {
    const store = {};
    const W = sandbox({ fns: ['savePhotoRefs'], stubs: { localStorage: { setItem: (k, v) => { store[k] = v; } }, _warnPhotoStoreFull() {}, _invReclaimSpace: () => ({ bytes: 0, jobs: [], thumbs: 0 }), _invNoteReclaim() {} } });
    const full = { valLow: 1, valHigh: 2, valComps: [COMP()], valLookup: 'l', valConf: 'low', valNotices: [{ kind: 'name', text: 't' }],
      valuedBy: 'agent', valAgentAt: 3, valNameAt: 'n', valFailed: 'f', valReviewed: true, valReviewedBy: 'Ashley Jerome', valReviewedAt: 4 };
    W._photoRefs = { 7: [Object.assign(ROW(), full)] };
    W.savePhotoRefs(7);
    const back = JSON.parse(store.hav_media_7)[0];
    Object.keys(full).forEach((k) => eq(back[k], full[k], 'the whitelist keeps ' + k));
  }
};
