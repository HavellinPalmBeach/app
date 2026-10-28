'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// A LISTING SURVEY COUNTS (2026-10-27). Anthony, off the eBay developer account: *"What is the rule around asking prices? I guess
// they can never set a value, but I mean if we see literally dozens of listings on eBay and Etsy, can't we use that to
// triangulate some sort of value even if we don't have true sold comps"*; he took *"A listing survey counts"*: ten or more close
// listings and no sale, valued below where they are listed, medium confidence (no unsure hint), and the paper says it rests on
// listings, not sales; a handful stays low.
//
//   S · the backend: the survey checked (a whole count, three prices in order, a page a tool returned), the one rule in
//       _avLineResult (no sale, AGENT_VALUE_SURVEY_MIN or more, one article at or under the middle price: medium at most, source
//       Listing survey), driven through agentValueLines with the line's count; the tool and the prompt; the version.
//   A · the app: the one writer keeps the survey, the source word on the papers, the line's record shows the page, the desk's
//       hint, the save's whitelist, an appraisal taking it off.
// ─────────────────────────────────────────────────────────────────────────────

const vm = require('vm');
const fs = require('fs');
const path = require('path');
const { sandbox, source, fn, matchBrace } = require('./harness');

const liveLines = (s) => String(s).split('\n')
  .filter((l) => { const t = l.trim(); return !(t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')); })
  .join('\n');

// ─── THE REAL BACKEND: every agent var and function, lifted by name off the file (agents-once-over.test.js's lift) ───
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
function gsAll({ reply = null, list = null } = {}) {
  const sent = [], logs = [];
  let t = 1000;
  const ctx = {
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k === 'ANTHROPIC_API_KEY' ? 'sk-ant-test' : null) }) },
    Logger: { log: (m) => logs.push(String(m)) },
    DriveApp: { getFileById: () => ({ getBlob: () => ({ getContentType: () => 'image/jpeg', getBytes: () => [1, 2, 3] }) }) },
    Utilities: { base64Encode: (b) => 'B64(' + b.length + ')' },
    UrlFetchApp: {
      fetch: () => (list ? { getResponseCode: () => 200, getContentText: () => JSON.stringify({ data: list }) }
                         : { getResponseCode: () => 500, getContentText: () => '{}' }),
      fetchAll: (reqs) => { sent.push(reqs); t += 1000;
        return reqs.map((r, i) => { const res = reply ? reply(JSON.parse(r.payload), i) : { code: 200, body: {} };
          return { getResponseCode: () => res.code || 200, getContentText: () => JSON.stringify(res.body) }; }); },
    },
    CacheService: { getScriptCache: () => ({ get: () => null, put() {} }) },
    Date: function () { return { getTime: () => (t += 1) }; },
    JSON, Math, Number, String, Object, Array, Error, parseInt, parseFloat, isFinite, RegExp,
  };
  vm.createContext(ctx);
  vm.runInContext(GS_AGENT_VARS.map(gsVar).concat([gsVar('BACKEND_VERSION')]).concat(GS_AGENT_FNS.filter((f) => !/^test/.test(f)).map(gsFn)).join('\n'), ctx);
  Object.assign(ctx, { sent, logs });
  return ctx;
}
const LIST = [{ id: 'claude-fable-5-1', capabilities: { image_input: { supported: true } } }, { id: 'claude-opus-5-5' }];
const CATS = ['Antiques', 'Art & Décor', 'Collectibles', 'Furniture', 'General/Household'];
const CTX = { estate: true, basis: 'Fair Market Value', valuationDate: '2026-06-14', categories: CATS };
const RESULTS = 'https://www.ebay.com/sch/i.html?_nkw=franciscan+desert+rose+dinner+plate';
const ASK1 = 'https://www.etsy.com/listing/123/franciscan-desert-rose-dinner-plate';
// Twelve close listings counted off an eBay results page a search returned, $25 to $120 each, the middle at $48.
const SURVEY = (over) => Object.assign({ count: 12, low: 25, median: 48, high: 120, url: RESULTS }, over || {});
const SEEN = { 'ebay.com/sch/i.html?_nkw=franciscan+desert+rose+dinner+plate': 1, 'etsy.com/listing/123/franciscan-desert-rose-dinner-plate': 1 };
const ASKING = [{ title: 'Franciscan Desert Rose dinner plate', venue: 'Etsy', saleDate: '', price: 45, url: ASK1, kind: 'asking' }];
const VAL = (over) => Object.assign({ line: 'L1', name: 'Franciscan Desert Rose dinner plates', value: 30, low: 20, high: 45, confidence: 'medium',
  source: 'Online comps', basis: 'No sales found; twelve close listings at $25 to $120; valued below them', comps: ASKING, lookup: 'franciscan desert rose',
  notices: [], survey: SURVEY() }, over || {});
const SEARCHED = { type: 'web_search_tool_result', tool_use_id: 'srv1', content: [{ type: 'web_search_result', url: RESULTS, title: 'eBay results' },
  { type: 'web_search_result', url: ASK1, title: 'Etsy' }] };
const ANSWER = (values) => ({ stop_reason: 'tool_use', content: [SEARCHED, { type: 'tool_use', name: 'record_values', input: { values: values, unvalued: [] } }] });
const LINE = (over) => Object.assign({ stableId: 'v1', mode: 'comps', name: 'Franciscan Desert Rose dinner plates', category: 'Collectibles', qty: 1, condition: 'Good' }, over || {});

// ─── THE REAL APP ────────────────────────────────────────────────────────────
const ESTATE = (over) => Object.assign({ id: 7, hvlId: 'HVL-0007', svc: 'cleanout', docTier: 'values', deathDate: '2026-06-14', tc: 'Ashley Jerome' }, over || {});
const ROW = (over) => Object.assign({ stableId: 's1', label: 'inventory', roomIdx: 2, objectName: 'Franciscan Desert Rose dinner plates', namedBy: 'agent',
  agentConf: 'high', category: 'Collectibles', qty: 8, condition: 'Good', driveFileId: 'FID', ts: 1, disposition: 'Sell' }, over || {});
const RES = (over) => Object.assign({ name: '', fmv: 240, low: 160, high: 320, confidence: 'medium', source: 'Listing survey',
  basis: 'No sales found; twelve close listings at $25 to $120 each; valued below them', comps: [], lookup: 'franciscan desert rose', notices: [],
  survey: SURVEY(), mode: 'comps' }, over || {});
// The agents-in-concert sandbox's lists (agents-together.test.js), with the survey's own check.
const APP_FNS = ['invHavellinRecipient', 'invAwaitingAppraisal', 'invBequestElsewhere', 'invReleaseCautions', '_invPhotoNoteOpen', 'invLineOpen', '_gate706', 'maivFilingApplies', 'invLotSplitState', 'agentValueMode', 'agentValueInternal', '_avHasFigure', 'agentValueableRefs', 'agentValueUnreviewed',
  'agentValueStale', 'agentValueSpecialistWorth', '_avValDate', '_avContext', '_avItemPayload', '_avComp', '_avWrite', '_avRename', '_avNameIsAgents', 'agentValueGradesCondition', '_invCondIsAgents', '_invAgentCondition', 'agentValueWhole',
  '_avNoteFailure', 'agentValueApply', '_avTakeValue', '_avStampReviewed', '_invStampBy', 'deviceUser', '_avStart',
  '_avSendNext', '_avFinish', '_avRepaint', '_avStateHtml', '_avState', 'agentValueAuto', 'agentValueWaiting', 'agentValueAfterRename', 'agentValueUseSale',
  'agentValueNotices', '_avNoticesHtml', '_avNoticeKinds', '_avNoticeLabel', '_deskShowBtnHtml', '_avSummary', '_avRowBadges', '_avPanelHtml',
  'invLineReviewed', '_invStampLineReviewed', '_invSetReviewed', 'invLineUnsure',
  'agentDuplicateGroups', 'agentDupCleared', '_agDupEligible', '_arDupEligible', 'agentNamedTwice',
  'invLineQty', 'invUnitValue', '_invQtyCarriesValue', '_invPaintFigures', '_invEachInput', '_invInputStyle', '_invCtrlMinW',
  'invValBasisWord', 'invAppraised', 'invLineAppraiser', '_invLinkedAppraiser', '_jobAppraisers', '_apprLabel', '_invHasAppraisal', '_invAppraisalDate',
  '_getPhotoRef', '_setPhotoRef', '_jobInvRefs', '_invHasValue', 'roundCents', 'invIsIntrinsic', 'invCatMeta',
  'invFiduciaryMode', 'isDecedentJob', 'docTierProduces', 'docTierOf', 'docTierDef', 'svcHasDocStep', 'estateValueDate',
  '_avdDate', '_ymdLocal', 'resolveValBasis', '_agNameKey', '_agDetailRefs', 'invLineCloseUps', '_invFileId', 'invAppraisalThreshold',
  'gateDispute', '_gateYes', 'invNeedsAppraisal', 'fmt', '_invMoney', '_invNamed', '_invItemNo', '_andJoin',
  'moneyToNumber', '_readAppsScriptJson', '_invJob', '_invRenderWhenIdle', '_invHasPhoto', 'invIsFirearm', 'invLineAccepted', 'invLineHold', '_invLineHolds', 'invLineAcceptedOnly', 'invIsMAIV', 'invMAIVDefaultCat', 'agentValueLooks', '_avPhotoContext', '_invPhotoSource', '_invRoomName', 'agentListedOff', 'agentValueAgain'].concat(['_avSurveyOf']);
const APP_VARS = ['INV_LOT_ARTICLE_CAP', 'INV_RELEASE_CAUTIONS', 'INV_ACCEPT_AMMO_RE', '_agDupSetJob', 'INV_OPEN_HOLDS', '_avRun', '_avForceComps', '_avAfter', 'AGENT_VALUE_BATCH', 'AGENT_VALUE_GENERAL_CEILING', 'AGENT_VALUE_WHOLE_FROM', 'AGENT_VALUE_MAX_COMPS', 'AGENT_CONDITIONS',
  'AGENT_VALUE_MARK_RE', 'AGENT_VALUE_NO_MARK_RE', 'AGENT_VALUE_CONFS', 'AGENT_VALUE_SOURCES', 'AGENT_VALUE_OWN', 'AGENT_VALUE_SALE_DATE_RE',
  'INV_TAXONOMY', 'INV_APPRAISAL_THRESHOLD', 'INV_APPRAISAL_THRESHOLD_DISPUTED', 'DECEDENT_SERVICES', 'DOC_TIERS',
  'DOC_TIER_FROM_SCOPE', 'JOB_STEPS', 'AGENT_MAX_DETAILS', 'INV_VAL_SOURCES', '_agDupSet', 'AGENT_ROOM_CONF_RANK', 'AGENT_PASS_GAP_MS', 'MAIV_OTHER', 'MAIV_BY_CATEGORY', 'AGENT_VALUE_READ_RE', 'AGENT_VALUE_HEDGE_RE', 'AGENT_LISTED_MAX', '_avAutoAgain', 'INV_CATEGORIES'];
function rig(job, refs) {
  return sandbox({
    fns: APP_FNS, vars: APP_VARS,
    stubs: {
      jobs: [Object.assign({}, job)],
      _photoRefs: { [job.id]: (refs || []).map((r) => Object.assign({}, r)) },
      estimateStore: {},
      _invTouch(r) { r.updatedAt = (r.updatedAt || 0) + 1; return r; },
      savePhotoRefs() {}, _scheduleInventorySync() {},
      _invJob: (id) => (id === job.id ? job : null),
      _todayStr: () => '2026-10-27',
      esc: (x) => String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
    },
  });
}
const attempt = (f) => { try { return { ok: true, val: f() }; } catch (e) { return { ok: false, err: String(e && e.message || e) }; } };

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();

  // ═══════════════════════════════ THE BACKEND ═══════════════════════════════
  group('⚠⚠ S1 · the one rule: no sale, ten or more close listings on a page a tool returned, one article under the middle price');
  {
    const g = gsAll();
    eq(g.AGENT_VALUE_SURVEY_MIN, 10, 'Anthony\'s ten');
    const r = g._avLineResult(VAL(), 'comps', SEEN, 1);
    eq([r.confidence, r.source], ['medium', 'Listing survey'], '⚠⚠ twelve listed, $30 under the $48 middle, no sale: medium, and the paper says listings');
    eq(r.survey && [r.survey.count, r.survey.low, r.survey.median, r.survey.high, r.survey.url], [12, 25, 48, 120, RESULTS], 'the survey comes back, the results page with it');
    eq(g._avLineResult(VAL({ confidence: 'high' }), 'comps', SEEN, 1).confidence, 'medium', '⚠ medium at most: listings never make a figure high');
    const low = g._avLineResult(VAL({ confidence: 'low' }), 'comps', SEEN, 1);
    eq([low.confidence, low.source], ['low', 'Listing survey'], 'never lifted from the model\'s own low; the source still says what it rests on');
    const few = g._avLineResult(VAL({ survey: SURVEY({ count: 9 }) }), 'comps', SEEN, 1);
    eq([few.confidence, few.source], ['low', 'General estimate'], '⚠ a handful (nine) stays low, a general estimate, as before');
    eq(few.survey && few.survey.count, 9, '…its count kept on the record all the same');
    const unseen = g._avLineResult(VAL({ survey: SURVEY({ url: 'https://www.ebay.com/sch/i.html?_nkw=made+up' }) }), 'comps', SEEN, 1);
    eq([unseen.confidence, unseen.source, unseen.survey], ['low', 'General estimate', null], '⚠ a page no tool returned: no survey, low, a general estimate (the comparables\' guard)');
  }

  group('⚠ S2 · one article against the middle price, through the line\'s count');
  {
    const g = gsAll();
    const eight = g._avLineResult(VAL({ value: 480, low: 320, high: 560 }), 'comps', SEEN, 8);
    eq([eight.confidence, eight.source], ['low', 'General estimate'], '⚠ eight plates at $480 is $60 each, above the $48 middle: listings do not carry it');
    const twelve = g._avLineResult(VAL({ value: 480, low: 320, high: 560 }), 'comps', SEEN, 12);
    eq([twelve.confidence, twelve.source], ['medium', 'Listing survey'], 'twelve at $480 is $40 each, under the middle: they do');
    eq(g._avLineResult(VAL({ value: 48 }), 'comps', SEEN, 1).confidence, 'medium', 'at the middle price exactly: under it counts');
    eq(g._avLineResult(VAL({ value: 49 }), 'comps', SEEN).confidence, 'low', 'no count sent: one article ($49, over the middle)');
    const out = gsAll({ list: LIST, reply: () => ({ code: 200, body: ANSWER([VAL({ value: 480, low: 320, high: 560 })]) }) })
      .agentValueLines({ context: CTX, items: [LINE({ qty: 12 })] });
    eq(out.results.v1 && [out.results.v1.confidence, out.results.v1.source], ['medium', 'Listing survey'], '⚠⚠ driven through agentValueLines: the line\'s own count reaches the check');
    const out8 = gsAll({ list: LIST, reply: () => ({ code: 200, body: ANSWER([VAL({ value: 480, low: 320, high: 560 })]) }) })
      .agentValueLines({ context: CTX, items: [LINE({ qty: 8 })] });
    eq(out8.results.v1 && out8.results.v1.confidence, 'low', '…and eight at the same figure stays low');
    eq(out.results.v1 && out.results.v1.survey && out.results.v1.survey.count, 12, 'the survey rides the answer to the app');
  }

  group('S3 · what it never changes: a sale beats a survey, an ordinary lot has none, a dropped comparable still costs a level');
  {
    const g = gsAll();
    const sold = g._avLineResult(VAL({ confidence: 'high', source: 'Auction comps', comps: ASKING.concat([{ title: 'Desert Rose plate', venue: 'eBay', saleDate: '2026-05', price: 22,
      url: 'https://www.ebay.com/itm/555', kind: 'sold' }]) }), 'comps', Object.assign({ 'ebay.com/itm/555': 1 }, SEEN), 1);
    eq([sold.confidence, sold.source], ['high', 'Auction comps'], 'a sold comparable: the survey decides nothing');
    eq(sold.survey && sold.survey.count, 12, '…and still sits on the record');
    const gen = g._avLineResult(VAL({ source: 'General estimate' }), 'general', SEEN, 1);
    eq([gen.survey, gen.source], [null, 'General estimate'], 'an ordinary lot never carries one');
    const dropped = g._avLineResult(VAL({ comps: ASKING.concat([{ title: 'x', venue: 'v', saleDate: '', price: 40, url: 'https://made.up/item/1', kind: 'asking' }]) }), 'comps', SEEN, 1);
    eq([dropped.confidence, dropped.source], ['low', 'Listing survey'], '⚠ a comparable no tool returned costs its level first (medium to low); the survey never lifts it back');
    eq(dropped.dropped, 1, '…and is counted dropped');
  }

  group('S4 · a survey the server cannot check is never on the line');
  {
    const g = gsAll();
    [['a part count', { count: 10.5 }], ['no listings', { count: 0, url: '' }], ['a free price', { low: 0 }], ['out of order', { low: 60 }],
     ['a high under the middle', { high: 40 }], ['a missing price', { median: '' }], ['not a link', { url: 'ebay results' }]].forEach(([why, over]) => {
      eq(g._avSurvey(SURVEY(over), SEEN), null, why);
    });
    eq(g._avSurvey(null, SEEN), null, 'none sent');
    eq(g._avSurvey(SURVEY({ low: 25.004 }), SEEN).low, 25, 'prices to the cent');
  }

  group('S5 · the tool and the prompt say it, from the one constant');
  {
    const g = gsAll();
    const sv = g._avTool('comps').input_schema.properties.values.items;
    ok(!!sv.properties.survey && sv.required.indexOf('survey') >= 0, 'a research line\'s tool asks for the survey (strict: required)');
    eq(sv.properties.survey && sv.properties.survey.required, ['count', 'low', 'median', 'high', 'url'], 'its five fields');
    eq(sv.properties.survey && sv.properties.survey.properties.count.type, 'integer', 'a whole count');
    has(sv.properties.survey && sv.properties.survey.properties.url.description, 'A results page is fine here.', 'a results page may be the page counted');
    ok(!g._avTool('general').input_schema.properties.values.items.properties.survey, 'an ordinary lot\'s tool has none');
    const sys = String(g._avSystem(CTX));
    has(sys, 'LISTINGS ARE A CEILING.', 'the prompt\'s rule');
    has(sys, 'value such a line below where they are listed: at or under the middle price, nearer the low end', 'valued below them');
    has(sys, 'With 10 or more close listings and no sale, confidence may be medium; with fewer, it is low.', 'the number off AGENT_VALUE_SURVEY_MIN');
    has(sys, 'or there is no sale but 10 or more close listings and the value sits below them.', 'the confidence scale names it');
    has(sys, 'never set the value on a few asking prices alone', 'a few asking prices still never set it');
    ['$500', 'threshold'].forEach((w) => lacks(sys, w, 'still no threshold in the prompt: ' + w));
    has(gsFn('testAgentValue'), "Logger.log('      listing survey: ' + r.survey.count", 'testAgentValue prints the survey');
  }

  // RESTATED on merging P1 of the desk audit (2026-10-27b, "Nothing is lost"): that deployment carries this one and leads the
  // banner with the sheet's own safety; the survey's gap follows it, by its vintage.
  // and RESTATED again for P5 (backend 2026-10-27d): a later deployment carries this one, so the version is at least 2026-10-27
  // and the banner names the survey gap by its vintage after the newer ones.
  group('S6 · the deployment: 2026-10-27 or later, the app relies on it, and the banner names the survey gap by its vintage');
  {
    ok(((GS.match(/var BACKEND_VERSION = '([^']+)';/) || [])[1] || '') >= '2026-10-27', 'main-sync.gs is 2026-10-27 or later, carrying 2026-10-26c');
    const B = sandbox({ vars: ['BACKEND_MIN_VERSION', 'BACKEND_FEATURE_COST'] });
    ok(B.BACKEND_MIN_VERSION >= '2026-10-27', 'the app relies on it');
    ok(/on a deployment older than 2026-10-27, an item Agent Two researched and found no sale for stays marked unsure, and its paper reads general estimate, however many close listings it counted; on a deployment older than 2026-10-26b, a search page/
      .test(B.BACKEND_FEATURE_COST.version), 'the banner names the survey gap by its vintage, then 2026-10-26b\'s');
  }

  // ═══════════════════════════════ THE APP ═══════════════════════════════════
  group('⚠⚠ A1 · the one writer keeps the survey and the source; a Re-value with none takes the old one off');
  {
    const R = rig(ESTATE(), [ROW()]);
    ok(R._avWrite(7, 's1', RES(), ESTATE(), {}), 'written');
    const r = R._getPhotoRef(7, 's1');
    eq([r.valSource, r.valConf, r.fmv], ['Listing survey', 'medium', 240], 'the source and the confidence as the server sent them');
    eq(r.valSurvey, { count: 12, low: 25, median: 48, high: 120, url: RESULTS }, 'the survey on the line');
    R._avWrite(7, 's1', RES({ survey: null, source: 'General estimate', confidence: 'low' }), ESTATE(), { revalue: true });
    eq(R._getPhotoRef(7, 's1').valSurvey, undefined, 'a Re-value that counted none: the old survey goes');
    R._avWrite(7, 's1', RES({ survey: SURVEY({ url: 'javascript:alert(1)' }) }), ESTATE(), { revalue: true });
    eq(R._getPhotoRef(7, 's1').valSurvey, undefined, 'a survey that is not a link is never written');
    ok(R.AGENT_VALUE_SOURCES.indexOf('Listing survey') >= 0, 'the app takes the source from the server');
  }

  group('A2 · a figure the desk types drops the survey\'s source; an appraisal takes the survey off with the agent\'s fields');
  {
    const R = rig(ESTATE(), [ROW()]);
    R._avWrite(7, 's1', RES(), ESTATE(), {});
    const r = R._getPhotoRef(7, 's1');
    r.fmv = 200; R._avTakeValue(r, 'typed', ESTATE());
    eq([r.valuedBy, r.valSource, r.valNote], ['desk', undefined, undefined], 'typed over: the desk\'s figure, the agent\'s source and sentence gone');
    const A = rig(ESTATE(), [ROW()]);
    A._avWrite(7, 's1', RES(), ESTATE(), {});
    const a = A._getPhotoRef(7, 's1');
    a.valSource = 'Appraisal'; A._avTakeValue(a, 'appraisal', ESTATE());
    eq([a.valuedBy, a.valSurvey], ['appraiser', undefined], 'an appraisal takes the line outright, the survey with it (AGENT_VALUE_OWN)');
    ok(A.AGENT_VALUE_OWN.indexOf('valSurvey') >= 0, 'on the agent\'s own list');
  }

  group('⚠ A3 · the papers: the basis says listing survey');
  {
    const R = rig(ESTATE(), []);
    ok(R.INV_VAL_SOURCES.indexOf('Listing survey') >= 0, 'on the source list a person picks from too');
    eq(R.invValBasisWord({ fmv: 240, valSource: 'Listing survey' }), 'listing survey', 'its word on a schedule');
    const sec = sandbox({ fns: ['invConditionText', '_invScheduleSection', 'invValBasisWord', 'invAppraised', 'invLineAppraiser', '_invHasValue', '_invMoney', 'fmt', 'roundCents'],
      stubs: { esc: (x) => String(x == null ? '' : x) } })._invScheduleSection('Tangible Personal Property', [ROW({ fmv: 240, valSource: 'Listing survey' })]);
    has(sec.html, '>listing survey</td>', '⚠ the Court Inventory\'s and the Trust Schedule\'s table prints it in the Basis column');
  }

  group('⚠ A4 · the line\'s record shows what was counted and the page; nothing where none was');
  {
    const R = rig(ESTATE(), [ROW()]);
    R._avWrite(7, 's1', RES(), ESTATE(), {});
    const h = attempt(() => R._avPanelHtml(ESTATE(), R._getPhotoRef(7, 's1')));
    ok(h.ok, 'the record draws' + (h.ok ? '' : ': ' + h.err));
    has(h.val, 'LISTED</span> 12 close listings for sale, $25 to $120 each, middle $48', 'what was counted, in plain words');
    has(h.val, '<a href="' + RESULTS.replace(/&/g, '&amp;') + '" target="_blank" rel="noopener">the page counted</a>', 'and the page, to open');
    has(h.val, 'Listing survey', 'the source beside the figure');
    const N = rig(ESTATE(), [ROW()]);
    N._avWrite(7, 's1', RES({ survey: null, source: 'General estimate', confidence: 'low' }), ESTATE(), {});
    lacks(String(attempt(() => N._avPanelHtml(ESTATE(), N._getPhotoRef(7, 's1'))).val), 'av-survey', 'none counted: no line for it');
  }

  group('⚠ A5 · the desk: a survey-backed figure carries no unsure hint; a low one still does');
  {
    const R = rig(ESTATE(), [ROW()]);
    R._avWrite(7, 's1', RES(), ESTATE(), {});
    eq(R.invLineUnsure(R._getPhotoRef(7, 's1'), ESTATE()), false, '⚠⚠ medium on twelve listings: no unsure (Anthony: "no unsure hint")');
    const L = rig(ESTATE(), [ROW()]);
    L._avWrite(7, 's1', RES({ survey: null, source: 'General estimate', confidence: 'low' }), ESTATE(), {});
    eq(L.invLineUnsure(L._getPhotoRef(7, 's1'), ESTATE()), true, 'a handful, low: unsure, as before');
  }

  group('A6 · the survey survives the save (the whitelist drops a key it does not list)');
  {
    const store = {};
    const W = sandbox({ fns: ['savePhotoRefs'], stubs: { localStorage: { setItem: (k, v) => { store[k] = v; } }, _warnPhotoStoreFull() {},
      _invReclaimSpace: () => ({ bytes: 0, jobs: [], thumbs: 0 }), _invNoteReclaim() {}, _photoRefs: { 7: [ROW({ valSurvey: { count: 12, low: 25, median: 48, high: 120, url: RESULTS } })] } } });
    W.savePhotoRefs(7);
    ok(Object.values(store).some((v) => String(v).indexOf('"valSurvey":{"count":12') >= 0), '⚠ valSurvey is saved');
    has(liveLines(fn('savePhotoRefs')), 'valSurvey:r.valSurvey', 'by name on the list');
  }

  group('A7 · one copy of the check on each side, and each side\'s readers');
  {
    const live = liveLines(src);
    eq((live.match(/_avSurveyOf\(/g) || []).length, 3, 'the app\'s check: its definition, the writer and the record');
    const gsLive = liveLines(GS);
    eq((gsLive.match(/_avSurvey\(/g) || []).length, 2, 'the server\'s: its definition and _avLineResult');
    eq((gsLive.match(/AGENT_VALUE_SURVEY_MIN/g) || []).length, 4, 'the constant: declared, the rule, the prompt\'s rule and the confidence scale');
  }
};
