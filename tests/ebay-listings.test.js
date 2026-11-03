'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// EBAY'S CURRENT LISTINGS IN AGENT TWO'S RESEARCH (backend 2026-11-02d). eBay answered both Growth Check requests on 2026-11-02:
// the Browse API's search and getItem are not restricted; Marketplace Insights (the sold history) was refused. Anthony: *"Let's just
// assume we can get the listing prices and we take a low, medium, high and try to find an average and get some signal out of
// this … I don't think we're going to get the sold pricing"*, and on the written AI consent eBay did not give: *"if they cut us off,
// who cares? … We'll just do … what we're doing"*.
//
//   E1 · off without the keys: the request, the prompt and the tools exactly as before, whatever the app's context says.
//   E2 · on with the keys: the tool on a research request only, the prompt's paragraph, the survey's page may be eBay's.
//   E3 · the loop, driven through agentValueLines: the sign-in, the search, the turn sent on with the results, the survey medium.
//   E4 · the checks: no more listings than the search showed, a page it never ran, a listing is never a sale.
//   E5 · the limits: three searches a line, two rounds, a model that will not stop, the time budget.
//   E6 · eBay failing: a refused sign-in or a failed search never fails the line; the sign-in held between searches.
//   E7 · a paused turn then a search: the conversation stays well formed.
//   E8 · the probes and the version.
// ─────────────────────────────────────────────────────────────────────────────

const vm = require('vm');
const fs = require('fs');
const path = require('path');
const { matchBrace } = require('./harness');

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
const AGENT_VARS = (GS.match(/(^|\n)var\s+(AGENT_[A-Z0-9_]+)\s*=/g) || []).map((s) => s.replace(/^\n?var\s+/, '').replace(/\s*=$/, ''));
const AGENT_FNS = (GS.match(/(^|\n)function\s+((?:_ag|_ar|_av|agent)[A-Za-z0-9_]*)\s*\(/g) || [])
  .map((s) => s.replace(/^\n?function\s+/, '').replace(/\s*\($/, ''));

const TOKEN_URL = 'https://api.ebay.com/identity/v1/oauth2/token';
const SEARCH_URL = 'https://api.ebay.com/buy/browse/v1/item_summary/search';
const LIST = [{ id: 'claude-fable-5-1', capabilities: { image_input: { supported: true } } }, { id: 'claude-opus-5-5' }];

// Fourteen fixed-price listings of one plate, $30 to $150, one in pounds (left out), one with no price (left out).
const PRICES = [30, 35, 40, 42, 45, 48, 50, 55, 60, 65, 70, 80, 120, 150];
const SUMMARIES = PRICES.map((p, k) => ({ itemId: 'v1|' + (1000 + k) + '|0', legacyItemId: String(2000000000 + k), title: 'Herend Rothschild Bird dinner plate ' + k,
  price: { value: String(p), currency: 'USD' }, condition: k % 2 ? 'Pre-owned' : 'New', itemWebUrl: 'https://www.ebay.com/itm/' + (2000000000 + k) + '?hash=item' + k }))
  .concat([{ itemId: 'v1|9|0', legacyItemId: '2999999999', title: 'In pounds', price: { value: '20', currency: 'GBP' }, itemWebUrl: 'https://www.ebay.com/itm/2999999999' },
    { itemId: 'v1|8|0', legacyItemId: '2888888888', title: 'No price', itemWebUrl: 'https://www.ebay.com/itm/2888888888' }]);
const Q = 'Herend Rothschild Bird dinner plate';
const PAGE = 'https://www.ebay.com/sch/i.html?_nkw=Herend+Rothschild+Bird+dinner+plate&LH_BIN=1';
const ITEM0 = 'https://www.ebay.com/itm/2000000000';

function gs({ props = {}, reply, ebay, token } = {}) {
  const calls = { model: [], search: [], token: [], log: [] };
  const cache = new Map();
  let t = 1000;
  const P = Object.assign({ ANTHROPIC_API_KEY: 'sk-ant-test' }, props);
  const ctx = {
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (P[k] == null ? null : P[k]) }) },
    Logger: { log: (m) => calls.log.push(String(m)) },
    DriveApp: { getFileById: () => ({ getBlob: () => ({ getContentType: () => 'image/jpeg', getBytes: () => [1, 2, 3] }) }) },
    Utilities: { base64Encode: (s) => Buffer.from(String(s)).toString('base64') },
    CacheService: { getScriptCache: () => ({ get: (k) => (cache.has(k) ? cache.get(k) : null), put: (k, v, s) => cache.set(k, v), remove: (k) => cache.delete(k) }) },
    UrlFetchApp: {
      fetch: (url, opt) => {
        if (url === TOKEN_URL) {
          calls.token.push(opt);
          const r = token ? token(opt) : { code: 200, body: { access_token: 'TOK-' + calls.token.length, expires_in: 7200, token_type: 'Application Access Token' } };
          return { getResponseCode: () => r.code, getContentText: () => JSON.stringify(r.body) };
        }
        if (String(url).indexOf(SEARCH_URL) === 0) {
          calls.search.push(Object.assign({ url }, opt));
          const r = ebay ? ebay(url, opt) : { code: 200, body: { total: 37, itemSummaries: SUMMARIES } };
          return { getResponseCode: () => r.code, getContentText: () => JSON.stringify(r.body) };
        }
        return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ data: LIST }) };
      },
      fetchAll: (reqs) => {
        t += 1000;
        return reqs.map((r) => {
          if (String(r.url).indexOf(SEARCH_URL) === 0) {
            calls.search.push(r);
            const e = ebay ? ebay(r.url, r) : { code: 200, body: { total: 37, itemSummaries: SUMMARIES } };
            return { getResponseCode: () => e.code, getContentText: () => JSON.stringify(e.body) };
          }
          const body = JSON.parse(r.payload);
          calls.model.push(body);
          const res = reply ? reply(body, calls.model.length) : { code: 200, body: {} };
          if (res && res.advance) t += res.advance;
          return { getResponseCode: () => res.code || 200, getContentText: () => JSON.stringify(res.body) };
        });
      },
    },
    Date: function () { return { getTime: () => (t += 1) }; },
    console,
  };
  vm.createContext(ctx);
  vm.runInContext(AGENT_VARS.map(gsVar).concat([gsVar('BACKEND_VERSION')]).concat(AGENT_FNS.filter((f) => !/^test/.test(f)).map(gsFn))
    .concat([gsFn('testEbayListings'), gsFn('testAgentValue')]).join('\n'), ctx);
  ctx.__calls = calls;
  ctx.__tick = (n) => { t += n; };
  return ctx;
}
const KEYS = { EBAY_CLIENT_ID: 'Havellin-Havellin-PRD-test', EBAY_CLIENT_SECRET: 'PRD-secret' };
const CATS = ['Antiques', 'Art & Décor', 'Collectibles', 'Furniture', 'General/Household'];
const CTX = { estate: true, basis: 'Fair Market Value', valuationDate: '2026-06-14', categories: CATS };
const LINE = (over) => Object.assign({ stableId: 'v1', mode: 'comps', name: 'Herend Rothschild Bird dinner plates', category: 'Antiques', qty: 8, condition: 'Good' }, over || {});
const GEN = (over) => Object.assign({ stableId: 'g1', mode: 'general', name: 'Stainless flatware', category: 'General/Household', qty: 60, condition: 'Good' }, over || {});
const SURVEY = (over) => Object.assign({ count: 12, low: 30, median: 50, high: 150, url: PAGE }, over || {});
const VAL = (over) => Object.assign({ line: 'L1', name: 'Herend Rothschild Bird dinner plates', value: 320, low: 240, high: 400, confidence: 'medium',
  source: 'Online comps', basis: 'No sales found; twelve close listings for sale; valued below them.', comps: [], lookup: 'herend rothschild bird',
  notices: [], survey: SURVEY(), category: 'Antiques' }, over || {});
const EBAY_CALL = (ids) => ({ stop_reason: 'tool_use', content: [{ type: 'thinking', thinking: 'search eBay first', signature: 'sig' }]
  .concat(ids.map((id, k) => ({ type: 'tool_use', id, name: 'ebay_listings', input: { query: k ? Q + ' ' + k : Q } }))) });
const RECORD = (values) => ({ stop_reason: 'tool_use', content: [{ type: 'tool_use', id: 'rec', name: 'record_values', input: { values, unvalued: [] } }] });
// The model: an eBay search on the first turn of a research request, then the answer.
const TWO_STEP = (vals) => (body, n) => {
  const research = (body.tools || []).some((x) => x.name === 'ebay_listings');
  if (research && body.messages.length === 1) return { body: EBAY_CALL(['eb1']) };
  return { body: RECORD(vals || [VAL()]) };
};
const toolResults = (body) => [].concat(...body.messages.filter((m) => m.role === 'user' && Array.isArray(m.content))
  .map((m) => m.content.filter((b) => b && b.type === 'tool_result')));

module.exports = function ({ group, ok, eq, has, lacks }) {
  group('E1 · off without the keys: as before, whatever the app\'s context says');
  {
    const g = gs({ reply: () => ({ body: RECORD([VAL({ survey: SURVEY({ url: 'https://example.com/not-seen' }) })]) }) });
    eq(g._avEbayOn(), false, 'no keys, no eBay');
    const out = g.agentValueLines({ context: Object.assign({ ebay: true }, CTX), items: [LINE()] });
    const body = g.__calls.model[0];
    eq((body.tools || []).map((x) => x.name || x.type), ['web_search', 'web_fetch', 'record_values'], '⚠ the tools exactly as before: the app\'s context cannot switch eBay on');
    lacks(String(body.system[0].text), 'EBAY\'S LISTINGS', 'the prompt says nothing of eBay');
    lacks(JSON.stringify(body.tools), 'ebay_listings', 'nor the survey\'s page description');
    eq(g.__calls.model.length, 1, 'one request, as before');
    eq([g.__calls.token.length, g.__calls.search.length], [0, 0], 'eBay never asked');
    eq(out.results.v1 && out.results.v1.ebaySearches, undefined, 'no eBay count on the answer');
    const one = gs({ props: { EBAY_CLIENT_ID: 'x' } });
    eq(one._avEbayOn(), false, 'one key alone is not enough');
  }

  group('E2 · on with the keys: the tool on a research request only, the paragraph, the survey\'s page');
  {
    const g = gs({ props: KEYS, reply: TWO_STEP([VAL()]) });
    eq(g._avEbayOn(), true, 'both keys: on');
    g.agentValueLines({ context: CTX, items: [LINE(), GEN()] });
    const research = g.__calls.model.find((b) => /RESEARCH/.test(JSON.stringify(b.messages[0])));
    const ordinary = g.__calls.model.find((b) => /ORDINARY/.test(JSON.stringify(b.messages[0])));
    eq(research.tools.map((x) => x.name), ['web_search', 'web_fetch', 'ebay_listings', 'record_values'], 'research: eBay before the answer\'s tool');
    eq(ordinary.tools.map((x) => x.name), ['web_search', 'record_values'], '⚠ an ordinary lot gets no eBay search (it keeps no survey)');
    const tool = research.tools.find((x) => x.name === 'ebay_listings');
    eq([tool.strict, tool.input_schema.required], [true, ['query']], 'a strict tool taking one query');
    const sys = String(research.system[0].text);
    has(sys, 'EBAY\'S LISTINGS', 'the prompt names it');
    has(sys, 'Every listing it shows is an asking price, never a sale', '…as asking, never sale');
    has(sys, 'count only the close matches into survey', '…counted into the survey by the rule above');
    has(sys, 'a listing of a set of eight at $200 is $25 an article', '…priced per article');
    has(sys, '3 at most', '…three searches at most (the constant)');
    eq(String(ordinary.system[0].text), sys, 'one system prompt for both depths, so the cache holds');
    const surveyUrl = research.tools.find((x) => x.name === 'record_values').input_schema.properties.values.items.properties.survey.properties.url.description;
    has(surveyUrl, 'or the search page ebay_listings named', 'the survey\'s page may be eBay\'s search');
  }

  group('⚠⚠ E3 · the loop: signed in, searched, the turn sent on with the results, a survey of twelve → medium, Listing survey');
  {
    const g = gs({ props: KEYS, reply: TWO_STEP([VAL()]) });
    const out = g.agentValueLines({ context: CTX, items: [LINE()] });
    const r = out.results.v1;
    eq(r && [r.confidence, r.source, r.ebaySearches], ['medium', 'Listing survey', 1], '⚠⚠ twelve close listings on eBay, $40 an article under the $50 middle: medium, Listing survey');
    eq(r && r.survey && [r.survey.count, r.survey.median, r.survey.url], [12, 50, PAGE], 'the survey kept, with eBay\'s search page');
    // The sign-in.
    eq(g.__calls.token.length, 1, 'one sign-in');
    const tk = g.__calls.token[0];
    eq(tk.headers.Authorization, 'Basic ' + Buffer.from('Havellin-Havellin-PRD-test:PRD-secret').toString('base64'), 'client credentials, the App ID and the Cert ID');
    has(tk.payload, 'grant_type=client_credentials', 'the application token');
    has(tk.payload, encodeURIComponent('https://api.ebay.com/oauth/api_scope'), 'the public scope');
    // The search.
    eq(g.__calls.search.length, 1, 'one search');
    const s = g.__calls.search[0];
    eq(s.headers, { Authorization: 'Bearer TOK-1', 'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US' }, 'the token and the US marketplace');
    has(s.url, 'q=' + encodeURIComponent(Q), 'the model\'s query');
    has(s.url, 'filter=' + encodeURIComponent('buyingOptions:{FIXED_PRICE}'), '⚠ fixed-price listings only: a running auction\'s bid is not an asking price');
    has(s.url, 'limit=50', 'fifty asked');
    // The turn sent on.
    eq(g.__calls.model.length, 2, 'two requests: the search, then the answer');
    const second = g.__calls.model[1];
    eq(second.messages.map((m) => m.role), ['user', 'assistant', 'user'], 'the conversation: the line, the turn that searched, the results');
    eq(second.messages[1].content.map((b) => b.type), ['thinking', 'tool_use'], '⚠ the turn echoed whole, its thinking with it');
    const tr = toolResults(second);
    eq([tr.length, tr[0].tool_use_id, !!tr[0].is_error], [1, 'eb1', false], 'one result for the one search');
    const text = String(tr[0].content);
    has(text, 'asking prices, never sales', 'the result says what it is');
    has(text, '37 found, 14 shown', '⚠ fourteen shown: the listing in pounds and the one with no price left out');
    has(text, 'Search page: ' + PAGE, 'the page a person opens');
    has(text, 'lowest $30, middle $52.5, average $63.57, highest $150', '⚠ low, middle (the median), average and high of what it showed, to the cent');
    has(text, '1. Herend Rothschild Bird dinner plate 0 | $30 | New | ' + ITEM0, 'each listing: title, price, condition, its own clean link');
    lacks(text, '?hash=', 'eBay\'s tracking query left off the link');
    lacks(text, 'In pounds', 'no listing priced in another currency');
    eq(g._avEbayStats([10, 20, 30]), { n: 3, low: 10, median: 20, mean: 20, high: 30 }, 'the stats: odd count');
    eq(g._avEbayStats([10, 20, 30, 1000]), { n: 4, low: 10, median: 25, mean: 265, high: 1000 }, '⚠ even count: one high listing moves the average, not the middle');
    eq(g._avEbayStats([]), null, 'nothing priced, no stats');
  }

  group('⚠ E4 · the checks: no more than it showed, a page it never ran, a listing is never a sale');
  {
    const run = (val) => {
      const g = gs({ props: KEYS, reply: TWO_STEP([val]) });
      return g.agentValueLines({ context: CTX, items: [LINE()] }).results.v1;
    };
    const over = run(VAL({ survey: SURVEY({ count: 15 }) }));
    eq([over.survey, over.confidence, over.source], [null, 'low', 'General estimate'], '⚠⚠ fifteen counted where the search showed fourteen: no survey, low, a general estimate');
    const fourteen = run(VAL({ survey: SURVEY({ count: 14 }) }));
    eq([fourteen.survey && fourteen.survey.count, fourteen.confidence], [14, 'medium'], 'fourteen of fourteen stands');
    const other = run(VAL({ survey: SURVEY({ url: 'https://www.ebay.com/sch/i.html?_nkw=herend&LH_BIN=1' }) }));
    eq([other.survey, other.confidence], [null, 'low'], '⚠ an eBay search page the script never ran is not a page');
    const sold = run(VAL({ comps: [{ title: 'Herend plate', venue: 'eBay', saleDate: '2026-10', price: 45, url: ITEM0, kind: 'sold' }] }));
    eq(sold.comps.map((c) => [c.url, c.kind]), [[ITEM0, 'asking']], '⚠⚠ a listing eBay\'s search showed, cited as sold: kept, as asking');
    eq([sold.confidence, sold.source], ['medium', 'Listing survey'], '…so it is still no sale, and the survey decides');
    const noSeen = run(VAL({ comps: [{ title: 'Herend plate', venue: 'eBay', saleDate: '', price: 45, url: 'https://www.ebay.com/itm/2777777777', kind: 'asking' }] }));
    eq([noSeen.comps.length, noSeen.dropped], [0, 1], 'a listing it was never shown is dropped, as any link no tool returned');
    // The app could never make a sale of an eBay listing by passing ebay itself: the server builds it.
    const g = gs({});
    eq(g._avLineResult(VAL({ comps: [{ title: 't', venue: 'v', saleDate: '', price: 45, url: ITEM0, kind: 'sold' }] }), 'comps', { 'ebay.com/itm/2000000000': 1 }, 1).comps[0].kind,
      'sold', 'without the search\'s record the old rule stands (a sold eBay page a web search returned)');
  }

  group('⚠ E5 · the limits: three searches a line, two rounds, a model that will not stop, the time budget');
  {
    // Four searches in one turn: three run, the fourth is told no.
    let g = gs({ props: KEYS, reply: (body) => (body.messages.length === 1 ? { body: EBAY_CALL(['a', 'b', 'c', 'd']) } : { body: RECORD([VAL({ survey: SURVEY({ count: 0, url: '' }) })]) }) });
    let out = g.agentValueLines({ context: CTX, items: [LINE()] });
    eq(g.__calls.search.length, 3, '⚠ three searches run');
    let tr = toolResults(g.__calls.model[1]);
    eq(tr.map((x) => [x.tool_use_id, !!x.is_error]), [['a', false], ['b', false], ['c', false], ['d', true]], 'a result for every call, the fourth an error');
    has(String(tr[3].content), 'No more eBay searches on this line', '…saying why');
    eq(out.results.v1 && out.results.v1.ebaySearches, 3, 'the answer counts three');
    eq(g.__calls.token.length, 1, '⚠ one sign-in for the three');
    // A third round is told no; a fourth stops the line.
    let n = 0;
    // (Bounded at nine turns, so a build that never stops it fails this check instead of hanging the suite.)
    g = gs({ props: KEYS, reply: () => { n++; return n > 8 ? { body: RECORD([VAL()]) } : { body: EBAY_CALL(['r' + n]) }; } });
    out = g.agentValueLines({ context: CTX, items: [LINE()] });
    eq(g.__calls.search.length, 2, 'two rounds searched');
    has(String(toolResults(g.__calls.model[3]).slice(-1)[0].content), 'No more eBay searches', 'the third round told no');
    eq([g.__calls.model.length, out.failed.v1], [4, 'the research kept searching eBay and never recorded a value'], '⚠⚠ a model that searches again after being told no is stopped, never sent round for ever');
    // Past the time budget: answered without a search.
    g = gs({ props: KEYS, reply: (body) => (body.messages.length === 1 ? { body: EBAY_CALL(['late']), advance: 200000 } : { body: RECORD([VAL({ survey: SURVEY({ count: 0, url: '' }) })]) }) });
    out = g.agentValueLines({ context: CTX, items: [LINE()] });
    eq(g.__calls.search.length, 0, 'past the budget, eBay is not asked');
    has(String(toolResults(g.__calls.model[1])[0].content), 'No time is left for eBay searches', '…and the model is told to record');
    ok(!!out.results.v1, 'the line still valued');
  }

  group('⚠ E6 · eBay failing never fails the line; the sign-in held between searches');
  {
    let g = gs({ props: KEYS, token: () => ({ code: 401, body: { error: 'invalid_client', error_description: 'client authentication failed' } }), reply: TWO_STEP([VAL({ survey: SURVEY({ count: 0, url: '' }) })]) });
    let out = g.agentValueLines({ context: CTX, items: [LINE()] });
    const tr = toolResults(g.__calls.model[1])[0];
    eq(!!tr.is_error, true, 'a refused sign-in answers the call as an error');
    has(String(tr.content), 'eBay refused the keys (HTTP 401: invalid_client, client authentication failed)', '…naming what eBay said');
    has(String(tr.content), 'Value the line without eBay', '…and to go on');
    eq([g.__calls.search.length, !!out.results.v1], [0, true], 'no search, and the line still valued');
    g = gs({ props: KEYS, ebay: () => ({ code: 500, body: { errors: [{ message: 'Internal error' }] } }), reply: TWO_STEP([VAL()]) });
    out = g.agentValueLines({ context: CTX, items: [LINE()] });
    has(String(toolResults(g.__calls.model[1])[0].content), 'eBay\'s search failed (HTTP 500: Internal error)', 'a failed search says so');
    eq([out.results.v1.survey, out.results.v1.confidence], [null, 'low'], '⚠ and a survey on the page it failed to show is not kept');
    // Held: a second run inside the token's life signs in no more.
    g = gs({ props: KEYS, reply: TWO_STEP([VAL()]) });
    g.agentValueLines({ context: CTX, items: [LINE()] });
    g.agentValueLines({ context: CTX, items: [LINE({ stableId: 'v2' })] });
    eq([g.__calls.token.length, g.__calls.search.length], [1, 2], '⚠ two runs, one sign-in: the token is held in the script cache');
  }

  group('E7 · a paused turn, then a search, then the answer: the conversation stays well formed');
  {
    const PAUSED = { stop_reason: 'pause_turn', content: [{ type: 'server_tool_use', id: 's1', name: 'web_search', input: { query: 'herend' } },
      { type: 'web_search_tool_result', tool_use_id: 's1', content: [{ type: 'web_search_result', url: 'https://www.herend.com/rothschild', title: 'Herend' }] }] };
    const g = gs({ props: KEYS, reply: (body, n) => (n === 1 ? { body: PAUSED } : n === 2 ? { body: EBAY_CALL(['e1']) } : { body: RECORD([VAL()]) }) });
    const out = g.agentValueLines({ context: CTX, items: [LINE()] });
    eq(g.__calls.model[1].messages.map((m) => m.role), ['user', 'assistant'], 'the pause sent back as the assistant\'s turn');
    const third = g.__calls.model[2];
    eq(third.messages.map((m) => m.role), ['user', 'assistant', 'user'], '⚠ the paused turn and the search are one assistant turn, then the results');
    eq(third.messages[1].content.map((b) => b.type), ['server_tool_use', 'web_search_tool_result', 'thinking', 'tool_use'], '…in the order they came');
    eq(out.results.v1 && out.results.v1.source, 'Listing survey', 'and the answer read');
  }

  group('E8 · the probes and the version');
  {
    const g = gs({ props: KEYS });
    g.testEbayListings();
    const log = g.__calls.log.join('\n');
    has(log, 'ANSWERED in', 'testEbayListings signs in and searches');
    has(log, 'lowest $30, middle $52.5, average $63.57, highest $150', '…and prints the four figures');
    g.testEbayListings();
    eq(g.__calls.token.length, 2, '⚠ a fresh sign-in each run, whatever the cache held: a key replaced is tested, not the old token');
    const m = gs({});
    m.testEbayListings();
    has(m.__calls.log.join('\n'), 'MISSING Script Property: EBAY_CLIENT_ID, EBAY_CLIENT_SECRET', 'with no keys it names both');
    const bad = gs({ props: KEYS, token: () => ({ code: 401, body: { error: 'invalid_client' } }) });
    bad.testEbayListings();
    has(bad.__calls.log.join('\n'), 'SIGN-IN FAILED: eBay refused the keys (HTTP 401: invalid_client)', 'a refused key named');
    has(bad.__calls.log.join('\n'), 'marketplace-account-deletion notice, or an exemption', '…with the keyset\'s likely cause');
    const v = GS.match(/var BACKEND_VERSION = '([^']+)'/)[1];
    // RESTATED on the merge with P15 (2026-11-02e, which carries this 2026-11-02d).
    ok(v >= '2026-11-02d', 'the version moved (' + v + ')');
    has(GS, '⚠ 2026-11-02d', 'and says why');
    const props = (GS.match(/getProperty\('EBAY_[A-Z_]+'\)|_agProp\('EBAY_[A-Z_]+'\)/g) || []);
    ok(props.length >= 2, 'the keys read from Script Properties only');
    const html = fs.readFileSync(path.join(__dirname, '..', 'havellin.html'), 'utf8');
    lacks(html, 'EBAY_CLIENT_SECRET', '⚠ the app never names the secret (the repo is public)');
    lacks(html, 'api.ebay.com', 'nor calls eBay itself');
  }
};
