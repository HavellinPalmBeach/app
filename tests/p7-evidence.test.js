'use strict';
// P7 OF THE DESK AUDIT (2026-10-27): NO FIGURE THE EVIDENCE DOES NOT SUPPORT. The critical part, as the plan and Anthony's
// decisions set it (audits/2026-10-27-desk/PLAN.md, P7; the findings ACC-01, GAP1-05, ACC-11's first half, VAL-02, ACC-03,
// DOC-01, VAL-27, GAP2-02 and RT-05):
//
//   S · the server (main-sync.gs, backend 2026-10-27e): a basis never names more sales than were kept, and a figure whose every
//       sale was left out says it rests on no sale; Etsy's market, category, shop and search pages and the shop pages of 1stDibs
//       and Chairish are results pages; one page cited twice counts once; a dealer marketplace or a retail store always asks;
//   A · Appraisal means an appraiser's figure: chosen over somebody else's figure it asks first and takes that figure off, the
//       appraiser's is typed after; never set across a selection; "appraisal (appraiser not named)" where nobody is recorded;
//   D · the §20.2031-6(b) sentence reads the top of each Agent Two range and carries the stamp's words while its figures stand
//       as the agents left them;
//   F · the Form 706 aggregate is "already over" once the valued articles pass $3,000, every such article is owed the sworn
//       appraisal (a flag: the worklist's packets and the desk's notice), and the class table counts articles;
//   E · a floor is a floor: the Estate Inventory Report states one by the Court Inventory's own rule, its probate estate and the
//       property outside it subtotalled, one helper read by the three papers.
//
// Every path through the real code: the server's functions lifted off main-sync.gs, the app's off havellin.html by their real
// call tree (q93-appraisal-source.test.js's closure), the handlers driven with the control a person uses.

const vm = require('vm');
const fs = require('fs');
const path = require('path');
const { sandbox, source, fn, decl, domStub, matchBrace } = require('./harness');

const SRC = source();
const GS = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'main-sync.gs'), 'utf8');
const code = (t) => String(t).split('\n').filter((l) => !l.trim().startsWith('//')).map((l) => l.replace(/\s\/\/\s.*$/, '')).join('\n');
const bare = (t) => code(t).replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, "''");
const textOf = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&middot;/g, '·').replace(/&rsquo;/g, '’').replace(/&mdash;/g, '—')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const attempt = (f) => { try { return { ok: true, val: f() }; } catch (e) { return { ok: false, err: String(e && e.message || e) }; } };

// ─── THE BACKEND: every agent var and function, lifted by name (listing-survey.test.js's lift) ───
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
function gsAll(reply) {
  const logs = [];
  let t = 1000;
  const ctx = {
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k === 'ANTHROPIC_API_KEY' ? 'sk-ant-test' : null) }) },
    Logger: { log: (m) => logs.push(String(m)) },
    DriveApp: { getFileById: () => ({ getBlob: () => ({ getContentType: () => 'image/jpeg', getBytes: () => [1, 2, 3] }) }) },
    Utilities: { base64Encode: (b) => 'B64(' + b.length + ')' },
    UrlFetchApp: {
      fetch: () => ({ getResponseCode: () => 200, getContentText: () => JSON.stringify({ data: [{ id: 'claude-fable-5-1', capabilities: { image_input: { supported: true } } }, { id: 'claude-opus-5-5' }] }) }),
      fetchAll: (reqs) => { t += 1000; return reqs.map((r, i) => { const res = reply ? reply(JSON.parse(r.payload), i) : { code: 200, body: {} };
        return { getResponseCode: () => res.code || 200, getContentText: () => JSON.stringify(res.body) }; }); },
    },
    CacheService: { getScriptCache: () => ({ get: () => null, put() {} }) },
    Date: function () { return { getTime: () => (t += 1) }; },
    JSON, Math, Number, String, Object, Array, Error, parseInt, parseFloat, isFinite, RegExp,
  };
  vm.createContext(ctx);
  vm.runInContext(GS_AGENT_VARS.map(gsVar).concat([gsVar('BACKEND_VERSION')]).concat(GS_AGENT_FNS.filter((f) => !/^test/.test(f)).map(gsFn)).join('\n'), ctx);
  ctx.logs = logs;
  return ctx;
}
const g = gsAll();
const seenOf = (urls) => { const s = {}; urls.forEach((u) => { s[g._avUrlKey(u)] = 1; }); return s; };
const COMP = (over) => Object.assign({ title: 'Harbour scene, oil on canvas', venue: 'Kodner Galleries', saleDate: '2025-11', price: 3800,
  url: 'https://www.kodner.com/lot/77', kind: 'sold' }, over || {});
const VAL = (over) => Object.assign({ line: 'L1', name: 'Oil on canvas, harbour scene', value: 4200, low: 3000, high: 5500, confidence: 'medium',
  source: 'Auction comps', basis: "Four sold comparables at Christie's and Kodner, 2025 to 2026; the median, less for a small tear.",
  comps: [], lookup: 'harbour scene oil', notices: [] }, over || {});
const INVENTED = [1, 2, 3, 4].map((i) => COMP({ title: 'Harbour scene ' + i, venue: i < 3 ? "Christie's" : 'Kodner', saleDate: '2025-0' + i,
  price: 4000 + i, url: 'https://made.up/lot/' + i }));
// The Ellison cabbage ware's three stored comparables (GAP1/comps.js): three "dealer listings", one Etsy market page.
const ELLISON = 'https://www.etsy.com/market/bordallo_pinheiro_plate_cabbage';
const ELLISON_COMPS = [180, 70, 39.95].map((p) => ({ title: 'Bordallo Pinheiro cabbage plate', venue: 'Etsy dealer', saleDate: '', price: p, url: ELLISON, kind: 'asking' }));

// ─── THE APP: the real call tree of the roots, the data and the screen's other cards stubbed ───
const ALL_FNS = new Set((SRC.match(/(^|\n)function\s+([A-Za-z0-9_$]+)\s*\(/g) || []).map((s) => s.replace(/^\n?function\s+/, '').replace(/\s*\($/, '')));
const ALL_VARS = new Set((SRC.match(/(^|\n)var\s+([A-Za-z0-9_$]+)\s*=/g) || []).map((s) => s.replace(/^\n?var\s+/, '').replace(/\s*=$/, '')));
function closure(roots, stop) {
  const stopSet = new Set(stop || []);
  const fns = new Set(), vars = new Set();
  const queue = roots.map((r) => ['f', r]);
  while (queue.length) {
    const [k, name] = queue.shift();
    if (stopSet.has(name)) continue;
    let body;
    if (k === 'f') { if (fns.has(name)) continue; fns.add(name); try { body = bare(fn(name)); } catch (e) { continue; } }
    else { if (vars.has(name)) continue; vars.add(name); try { body = bare(decl(name)); } catch (e) { continue; } }
    for (const m of body.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)) if (ALL_FNS.has(m[1]) && !stopSet.has(m[1])) queue.push(['f', m[1]]);
    for (const m of body.matchAll(/[(,]\s*([A-Za-z_$][\w$]*)\s*[,)]/g)) if (ALL_FNS.has(m[1]) && !stopSet.has(m[1])) queue.push(['f', m[1]]);
    for (const m of body.matchAll(/\b([A-Za-z_$][\w$]*)\b/g)) if (ALL_VARS.has(m[1]) && !stopSet.has(m[1])) queue.push(['v', m[1]]);
  }
  return { fns: [...fns], vars: [...vars] };
}
function callersOf(name) {
  const out = new Set();
  const re = new RegExp('\\b' + name + '\\(', 'g');
  let m;
  while ((m = re.exec(SRC))) {
    const def = SRC.lastIndexOf('\nfunction ', m.index);
    if (def < 0) continue;
    const f = /^\nfunction\s+([A-Za-z0-9_$]+)\s*\(/.exec(SRC.slice(def, def + 120));
    if (!f || f[1] === name) continue;
    let body = '';
    try { body = bare(fn(f[1])); } catch (e) { continue; }
    if (new RegExp('\\b' + name + '\\(').test(body)) out.add(f[1]);
  }
  return [...out].sort();
}

const STOP = ['jobs', '_photoRefs', 'estimateStore', 'jobPlanStore', 'vendorDirectory', 'document', 'window', 'SHEETS_SYNC_URL', '_invCloudSeen',
  '_invCloudFailed', 'savePhotoRefs', '_scheduleInventorySync', 'renderInventoryTab', 'showSyncBadge', '_invRefreshFlagStrip', '_invRefreshRecords',
  '_invRefreshReleases', '_invRefreshAgentNotices', '_deskFoldHeadsRepaint', '_todayStr', 'saveJobs', 'syncJobToSheets', '_invThumbHTML',
  'setTimeout', 'clearTimeout', '_printDocument', '_invPrintThumb', 'alert', '_invRefreshSummary', '_invRefreshGuardrail', '_renderInvWorkbar'];
const ROOTS = ['invListSeen', '_invEdit', '_invBulkApply', '_renderInvBulk', '_avTakeValue', 'invAppraisalSourceAsk', 'invValBasisWord', 'invAppraisalSourceText',
  'agentValueableRefs', '_avWrite', 'maivAggregate', 'maivStatement_', 'maivOwedLines', 'maivOwedText', '_maivWorklistBlock', '_maivSummaryNotice',
  '_apprGroups', 'printAppraisalWorklist', '_renderInventorySummary', '_avUnreviewedStamp', '_avStampText', '_avStampCounts', 'invAcceptCtx',
  'printEstateInventoryReport', 'printCourtInventory', 'printTrustSchedule', 'invTotalFloor', '_invFloorTotalHtml', '_invScheduleSection',
  'invAwaitingAppraisal', 'invNeedsAppraisal'];
let _cl = null;
function rig(job, rows, o) {
  o = o || {};
  _cl = _cl || closure(ROOTS, STOP);
  const said = [], badges = [];
  const C = sandbox({ fns: _cl.fns, vars: _cl.vars, stubs: {
    jobs: [job], _photoRefs: { [job.id]: rows.map((r) => Object.assign({}, r)) }, estimateStore: { [job.id]: { estimate: { svc: job.svc, rooms: [{ idx: 0, name: 'Study' }, { idx: 1, name: 'Garage' }] } } },
    jobPlanStore: {}, vendorDirectory: [], document: domStub({}),
    window: { confirm: (m) => { said.push(String(m)); return o.answer !== false; } },
    SHEETS_SYNC_URL: 'https://script.google.com/macros/s/P7/exec', _invCloudSeen: { [job.id]: true }, _invCloudFailed: {},
    savePhotoRefs() {}, _scheduleInventorySync() {}, renderInventoryTab() {}, showSyncBadge(m) { badges.push(String(m)); },
    _invRefreshFlagStrip() {}, _invRefreshRecords() {}, _invRefreshReleases() {}, _invRefreshAgentNotices() {}, _deskFoldHeadsRepaint() {},
    _todayStr: () => '2026-10-27', saveJobs() {}, syncJobToSheets() {}, _invThumbHTML: () => '<i></i>', setTimeout: () => 1, clearTimeout() {},
    _printDocument() {}, _invPrintThumb: () => '', alert(m) { said.push(String(m)); }, _invRefreshSummary() {}, _invRefreshGuardrail() {},
    _renderInvWorkbar: () => '',
  } });
  C.said = said; C.badges = badges;
  return C;
}
const ESTATE = (o) => Object.assign({ id: 7, hvlId: 'HVL-2610-P7', svc: 'probate', matterType: 'probate', name: 'Estate of Harold Ashworth',
  deathDate: '2026-06-14', gate706: 'yes', docTier: 'values', status: 'active', won: true, executor: 'Ruth Adler', executorEmail: 'ruth@x.com',
  executorRole: 'Personal Representative', probateAttyEmail: 'counsel@law.com', tc: 'Ashley Jerome', docState: {}, at: {}, appraisers: [] }, o || {});
const LINE = (o) => Object.assign({ stableId: 's1', label: 'inventory', itemNo: 40, objectName: 'Oil on canvas still life, signed lower left',
  category: 'Art & Décor', disposition: 'Keep', roomIdx: 0, ts: 1, updatedAt: 1, fmv: '', namedBy: 'desk', reviewed: true }, o || {});
// Agent Two's $4,800 painting (VAL-02's fixture): its range, its confidence, its basis, nobody's look.
const AGENT = (o) => LINE(Object.assign({ fmv: 4800, valLow: 3200, valHigh: 7500, valConf: 'low', valuedBy: 'agent', valSource: 'Online comps',
  valNote: 'Two signed still lifes sold online, 2025.', valAgentAt: 5, valNameAt: 'Oil on canvas still life, signed lower left' }, o || {}));
const ref = (C, id) => C._photoRefs[7].filter((r) => r.stableId === (id || 's1'))[0];
const edit = (C, key, value, id) => attempt(() => C._invEdit(7, id || 's1', key, { value: value, type: key === 'valSource' ? 'select-one' : 'text' }));

module.exports = function ({ group, ok, eq, has, lacks }) {

  // ═══════════════════════════════ S · THE SERVER ═══════════════════════════════
  group('⚠⚠ S1 · a basis never names more sales than were kept (ACC-01)');
  {
    const four = g._avLineResult(VAL({ comps: INVENTED }), 'comps', {}, 1);
    eq([four.fmv, four.source, four.confidence, four.dropped], [4200, 'General estimate', 'low', 4], 'four sales no tool returned: the figure stays a general estimate, low, as before');
    eq(four.basis, 'No sale the research could show: a best estimate of what this kind of thing sells for.', '⚠⚠ and the basis says it rests on no sale, never "Four sold comparables at Christie\'s and Kodner"');
    lacks(four.basis, 'Christie', '…naming no sale nobody can find');
    eq(four.basisRewritten, true, 'the answer says the sentence was the server\'s');
    const one = g._avLineResult(VAL({ confidence: 'high', comps: INVENTED.slice(0, 3).concat([COMP()]) }), 'comps', seenOf([COMP().url]), 1);
    eq([one.source, one.confidence, one.comps.length], ['Auction comps', 'medium', 1], 'one of the four real: still auction comps, a level of confidence lost for the three');
    eq(one.basis, 'One sale the research could show: Kodner Galleries, 2025-11.', '⚠⚠ and the basis names the one sale kept, by venue and date, never "four"');
    const two = [COMP(), COMP({ url: 'https://www.kodner.com/lot/78', saleDate: '2026-02' })];
    const honest = g._avLineResult(VAL({ basis: 'Two sold comparables at Kodner, 2025 to 2026; the median.', comps: two }), 'comps', seenOf(two.map((c) => c.url)), 1);
    eq([honest.basis, honest.basisRewritten], ['Two sold comparables at Kodner, 2025 to 2026; the median.', false], 'a sentence naming no more sales than were kept stands as the model wrote it');
    const uncounted = g._avLineResult(VAL({ basis: 'Christie\'s sold a close match in 2025; adjusted for size.', comps: INVENTED.slice(0, 1) }), 'comps', {}, 1);
    eq(uncounted.basis, 'No sale the research could show: a best estimate of what this kind of thing sells for.', '⚠ every sale the model cited left out: it says so, whatever the sentence counted');
    const gen = g._avLineResult(VAL({ basis: 'The going used rate for everyday stainless flatware.', source: 'General estimate' }), 'general', {}, 60);
    eq(gen.basis, 'The going used rate for everyday stainless flatware.', 'an ordinary lot\'s going-rate sentence, citing no sale, is left alone');
    const genCount = g._avLineResult(VAL({ basis: 'Three similar sets sold on eBay for about $40.', source: 'General estimate' }), 'general', {}, 60);
    eq(genCount.basis, 'No sale the research could show: a best estimate of what this kind of thing sells for.', '…but an ordinary lot naming sales it did not list is the server\'s sentence too');
    // A survey stands: the sentence says what the figure rests on.
    const SURVEY_URL = 'https://www.ebay.com/sch/i.html?_nkw=desert+rose+plate';
    const sv = g._avLineResult(VAL({ value: 30, low: 20, high: 45, basis: 'Two sold comparables on eBay; valued below the listings.', comps: [COMP({ url: 'https://made.up/x' })],
      survey: { count: 12, low: 25, median: 48, high: 120, url: SURVEY_URL } }), 'comps', seenOf([SURVEY_URL]), 1);
    eq([sv.source, sv.basis], ['Listing survey', 'No sale the research could show; 12 close listings for sale were counted, the middle asking price $48 each.'],
      'a listing survey that stands: the sentence names the listings counted, and no sale');
    const sv2 = g._avLineResult(VAL({ value: 30, low: 20, high: 45, basis: 'Two sold comparables on eBay.', comps: [], survey: { count: 12, low: 25, median: 47.5, high: 120, url: SURVEY_URL } }), 'comps', seenOf([SURVEY_URL]), 1);
    has(sv2.basis, 'the middle asking price $47.50 each.', '…its middle price to the cent');
    // How a sentence's sales are counted.
    [["Four sold comparables at Christie's and Kodner, 2025 to 2026", 4], ['Three similar plates sold at Bonhams in 2025', 3], ['A sale at Kodner in 2024 for $3,800', 1],
     ['Several recent auction sales', 2], ['a few sales on eBay', 2], ['Twelve close listings for sale, $25 to $120 each', 0], ['The going sale price for used flatware', 0],
     ['Typical estate sale prices for everyday dishes', 0], ['No sold comparables found; valued below the listings', 0], ['2015 Bonhams service sale and two eBay asking prices', 0],
     ['Similar plates fetched $1,200 sold at Bonhams', 0]]
      .forEach(([t, n]) => eq(g._avSalesNamed(t, true), n, 'a sentence\'s sales: "' + t + '" names ' + n));
    eq([g._avSalesNamed('Recent auction sales of comparable scenes', true), g._avSalesNamed('Recent auction sales of comparable scenes', false), g._avSalesNamed('with no recent sales, a best reading', true)], [2, 0, 0],
      'a plural claim with no count reads as two at research depth, none on an ordinary lot, none said with "no"');
    // ⚠⚠ P7's review: a researched line with no sale kept never prints a sentence that speaks of a sale, counted or not.
    const NONE = 'No sale the research could show: a best estimate of what this kind of thing sells for.';
    ["Christie's sold a comparable pair in 2024; Kodner another in 2025.", 'Similar pieces have sold at auction for $700 to $900.',
     "Comparable Herend services realized $700 to $900 at Bonhams and Christie's.", 'Bonhams sold a similar eight-plate service in 2015.',
     'Sold examples at Kodner and Leslie Hindman, 2024 to 2025.', 'A matching set hammered at $720 at Bonhams in 2015.',
     'A close match went for $640 in 2025; adjusted for a chip.', 'No sale found; Christie\'s sold a similar pair in 2024.']
      .forEach((b) => {
        const r = g._avLineResult(VAL({ basis: b, comps: [] }), 'comps', {}, 1);
        eq([r.source, r.basis, r.basisRewritten], ['General estimate', NONE, true], '⚠⚠ no sale kept, a sale spoken of: the server\'s sentence, never "' + b + '"');
      });
    const REPL = 'https://www.replacements.com/p/herend-plate-123';
    const repl = g._avLineResult(VAL({ basis: 'Similar plates sold at Replacements for $90 each.', comps: [COMP({ venue: 'Replacements', url: REPL, price: 90, kind: 'asking' })] }), 'comps', seenOf([REPL]), 1);
    eq([repl.source, repl.basis], ['General estimate', 'No sale the research could show: a best estimate, with 1 asking price on the record.'], '⚠ an asking price said to have sold: the server\'s sentence, naming the asking price');
    ['No sold comparable was found; valued from the maker\'s retail price less wear.', 'Unmarked; the style suggests a 1970s reproduction, decorative value only.',
     'With no recent sales to point to, a best reading of the decorative market.', 'The tools ran out before I found any sold comparables; a best reading.',
     'Asking prices run well above what these sell for; a best reading of the going rate.']
      .forEach((b) => eq(g._avLineResult(VAL({ basis: b, comps: [] }), 'comps', {}, 1).basis, b, 'a sentence claiming no sale stands as the model wrote it: "' + b + '"'));
    eq(g._avLineResult(VAL({ basis: 'The going used rate for stainless flatware, from recent eBay sales.', source: 'General estimate' }), 'general', {}, 60).basis,
      'The going used rate for stainless flatware, from recent eBay sales.', 'an ordinary lot\'s going rate is left alone: the rule is the research depth\'s');
    eq([g._avClaimsSale('Typical estate sale prices for everyday dishes'), g._avClaimsSale('Twelve close listings for sale at $25 to $120'), g._avClaimsSale('Lot 45 at Kodner')],
      [false, false, true], 'an estate sale and a listing for sale are no sale; a lot number is');
  }

  group('⚠⚠ S2 · Etsy\'s market, category, shop and search pages and the shop pages of 1stDibs and Chairish are results pages (GAP1-05)');
  {
    ['https://www.etsy.com/market/bordallo_pinheiro_plate_cabbage', 'https://www.etsy.com/c/home-and-living/kitchen-and-dining', 'https://www.etsy.com/search?q=cabbage+plate',
     'https://www.etsy.com/shop/VintageFinds', 'https://www.etsy.com/uk/market/cabbage_plate', 'https://www.1stdibs.com/furniture/seating/chairs/',
     'https://www.1stdibs.com/dealers/palm-beach-antiques/shop/', 'https://www.chairish.com/shop/palmbeachdealer', 'https://www.chairish.com/collection/cabbage-ware',
     'https://www.ebay.com/sch/i.html?_nkw=cabbage', 'https://www.ebay.com/b/Bordallo-Pinheiro/1234']
      .forEach((u) => eq(g._avResultsPage(u), true, 'a results page: ' + u));
    ['https://www.etsy.com/listing/123456789/bordallo-pinheiro-cabbage-plate', 'https://www.etsy.com/uk/listing/123456789/x',
     'https://www.1stdibs.com/furniture/seating/chairs/pair-of-regency-chairs/id-f_23456789/', 'https://www.chairish.com/product/12345678/cabbage-plate',
     'https://www.ebay.com/itm/123456789', 'https://www.liveauctioneers.com/item/123456_harbour-scene']
      .forEach((u) => eq(g._avResultsPage(u), false, 'one item\'s own page: ' + u));
  }

  group('⚠⚠ S3 · one page counts once, and a dealer marketplace or a retail store always asks, whatever the model says');
  {
    const L = 'https://www.etsy.com/listing/555/bordallo-cabbage-plate';
    const r = g._avLineResult(VAL({ value: 75, low: 40, high: 120, basis: 'Three sold comparables on Etsy.', comps: ELLISON_COMPS.map((c) => Object.assign({}, c, { url: L, kind: 'sold' })) }), 'comps', seenOf([L]), 1);
    eq([r.comps.length, r.unfit], [1, 2], '⚠ three comparables citing one page: one kept, the other two left out');
    eq(r.comps[0].kind, 'asking', '⚠⚠ an Etsy listing the model called sold is an asking price');
    eq([r.source, r.confidence], ['General estimate', 'low'], '…so the line rests on no sale: a general estimate, low');
    eq(r.basis, 'No sale the research could show: a best estimate, with 1 asking price on the record.', '…and its basis says so');
    ['https://www.replacements.com/p/franciscan-desert-rose/123', 'https://www.rubylane.com/item/1234-5678', 'https://www.1stdibs.com/furniture/x/id-f_1/',
     'https://www.chairish.com/product/1/x', 'https://www.wayfair.com/decor/pdp/mirror-w001.html', 'https://www.rh.com/catalog/product/product.jsp?productId=1',
     'https://uk.etsy.com/listing/1/x'].forEach((u) => eq(g._avAskingHost(u), true, 'always asking: ' + u));
    ['https://www.ebay.com/itm/1', 'https://www.liveauctioneers.com/item/1', 'https://www.notetsy.com/listing/1'].forEach((u) => eq(g._avAskingHost(u), false, 'the model\'s own word stands: ' + u));
    const ebay = 'https://www.ebay.com/itm/987654';
    const sold = g._avLineResult(VAL({ value: 75, basis: 'One sold comparable on eBay.', comps: [COMP({ venue: 'eBay', url: ebay, price: 70 })] }), 'comps', seenOf([ebay]), 1);
    eq([sold.comps[0].kind, sold.source, sold.basis], ['sold', 'Auction comps', 'One sold comparable on eBay.'], 'an eBay sale stays a sale');
    // ⚠⚠ P7's review: one sale cited with and without a query string is one page.
    const A = 'https://www.ebay.com/itm/123456789', B = 'https://www.ebay.com/itm/123456789?hash=item1c&var=0';
    const twice = g._avLineResult(VAL({ value: 90, low: 60, high: 120, confidence: 'high', source: 'Online comps', basis: 'Two sold comparables on eBay, 2026.',
      comps: [COMP({ venue: 'eBay', url: A, price: 90 }), COMP({ venue: 'eBay', url: B, price: 90 })] }), 'comps', seenOf([A, B]), 1);
    eq([twice.comps.length, twice.unfit], [1, 1], '⚠⚠ one sale cited with and without its query: one kept, the other left out');
    eq(twice.basis, 'One sale the research could show: eBay, 2025-11.', '…and the basis says one, never "Two sold comparables"');
    [['https://www.etsy.com/listing/333/herend-plate', 'https://www.etsy.com/listing/333'], ['https://www.liveauctioneers.com/item/123456_harbour-scene', 'https://www.liveauctioneers.com/item/123456'],
     ['https://www.ebay.com/itm/Herend-Rothschild-plate/123456789', 'https://www.ebay.com/itm/123456789'], ['https://www.bonhams.com/auction/28521/lot/45/a-pair-of-vases/', 'https://www.bonhams.com/auction/28521/lot/45#x']]
      .forEach(([u, v]) => eq(g._avPageKey(u), g._avPageKey(v), 'one page: ' + u + ' and ' + v));
    [['https://www.bonhams.com/auction/28521/lot/45', 'https://www.bonhams.com/auction/28521/lot/46'], ['https://www.kodner.com/catalogue/2025/lot-12', 'https://www.kodner.com/catalogue/2025/lot-13'],
     ['https://www.ebay.com/sch/i.html?_nkw=herend', 'https://www.ebay.com/itm/1']]
      .forEach(([u, v]) => ok(g._avPageKey(u) !== g._avPageKey(v), 'two pages: ' + u + ' and ' + v));
    const strict = g._avLineResult(VAL({ basis: 'One sold comparable on eBay.', comps: [COMP({ venue: 'eBay', url: B, price: 90 })] }), 'comps', seenOf([A]), 1);
    eq([strict.dropped, strict.comps.length], [1, 0], '⚠ the seen check still matches the tool\'s own URL exactly: a query the tool never returned is dropped');
  }

  group('⚠⚠ S4 · the three stored Ellison #78 comparables give none: the cabbage ware is a general estimate');
  {
    const r = g._avLineResult(VAL({ value: 75, low: 40, high: 180, source: 'Online comps', basis: 'Three dealer listings at $40 to $180.', comps: ELLISON_COMPS }), 'comps', seenOf([ELLISON]), 8);
    eq([r.comps.length, r.unfit, r.source, r.confidence], [0, 3, 'General estimate', 'low'], '⚠⚠ an Etsy market page is no comparable: none kept, never "online comps"');
  }

  group('S5 · through the action: what one real answer becomes, and the probe prints a sentence it rewrote');
  {
    const SEARCH = { type: 'web_search_tool_result', tool_use_id: 'srv1', content: [{ type: 'web_search_result', url: COMP().url, title: 'Kodner lot 77' }] };
    const reply = () => ({ code: 200, body: { stop_reason: 'tool_use', content: [SEARCH, { type: 'tool_use', name: 'record_values', input: { values: [
      VAL({ comps: INVENTED.slice(0, 3).concat([COMP()]), category: 'Art & Décor' })], unvalued: [] } }] } });
    const G = gsAll(reply);
    const out = G.agentValueLines({ context: { estate: true, basis: 'Fair Market Value', valuationDate: '2026-06-14', categories: ['Art & Décor'] },
      items: [{ stableId: 'v1', mode: 'comps', name: 'Oil on canvas, harbour scene', category: 'Art & Décor', qty: 1, condition: 'Good' }] });
    const r = out.results && out.results.v1;
    ok(!!r, 'answered');
    eq(r && r.basis, 'One sale the research could show: Kodner Galleries, 2025-11.', '⚠ the basis that reaches the app names only the sale kept');
    const sys = G._avSystem(true);
    has(sys, 'Etsy, 1stDibs, Chairish, Ruby Lane, Replacements and retail stores show asking prices, never sales', 'the prompt\'s first net: those sites ask');
    has(sys, 'The basis names only the sales you list in comps', '…and the basis names only the sales listed');
    has(JSON.stringify(G._avTool('comps')), 'It names no more sales than comps lists.', 'the tool\'s basis field says so too');
    has(gsFn('testAgentValue'), "basis rewritten: it named more sales than were kept", 'testAgentValue prints a sentence the server rewrote');
  }

  group('S6 · the deployment: 2026-10-27e, the app relies on it, and the banner names this gap first');
  {
    ok(((GS.match(/var BACKEND_VERSION = '([^']+)';/) || [])[1] || '') >= '2026-10-27e', 'main-sync.gs is 2026-10-27e or later, carrying 2026-10-27d');
    const B = sandbox({ vars: ['BACKEND_MIN_VERSION', 'BACKEND_FEATURE_COST'] });
    ok(B.BACKEND_MIN_VERSION >= '2026-10-27e', 'the app relies on it');
    // RESTATED 2026-10-28 (the cell-cap probe's backend, which carries this one): a newer gap leads the banner, and this one follows
    // under its own vintage, every clause before it newer.
    const _v7 = B.BACKEND_FEATURE_COST.version, _at7 = _v7.indexOf('on a deployment older than 2026-10-27e, a figure Agent Two researched can carry a basis sentence citing sales nobody could find');
    const _newer7 = (_v7.slice(0, Math.max(0, _at7)).match(/on a deployment older than (\d{4}-\d{2}-\d{2}[a-z]?),/g) || []).map((x) => x.replace(/^on a deployment older than /, '').replace(/,$/, ''));
    ok(/^a figure Agent Two researched can carry a basis sentence citing sales nobody could find/.test(_v7) || (_at7 > 0 && _newer7.length > 0 && _newer7.every((x) => x > '2026-10-27e')),
      '⚠ the stale banner names it first, or first after the newer gaps (' + _newer7.join(', ') + ')');
    has(B.BACKEND_FEATURE_COST.version, '; on a deployment older than 2026-10-27d, a release approval recorded on one device', '…then 2026-10-27d\'s gap, by its vintage');
  }

  // ═══════════════════════════════ A · APPRAISAL MEANS AN APPRAISER'S FIGURE ═══════════════════════════════
  group('⚠⚠ A1 · Appraisal chosen over Agent Two\'s figure asks first; OK takes the figure off; the appraiser\'s is typed after (VAL-02)');
  {
    const no = rig(ESTATE(), [AGENT()], { answer: false });
    edit(no, 'valSource', 'Appraisal');
    has(no.said.join(' | '), 'carries Agent Two’s estimate of $4,800, not an appraisal', '⚠ it asks, naming the estimate');
    eq([ref(no).fmv, ref(no).valSource, ref(no).valuedBy, ref(no).valHigh], [4800, 'Online comps', 'agent', 7500], 'Cancel: the line is as it was');
    const C = rig(ESTATE(), [AGENT()]);
    C.document.getElementById('inv-fmv-s1').value = '$4,800';   // the row's Total box, as drawn
    let sums = 0; C._invRefreshSummary = () => { sums++; };
    edit(C, 'valSource', 'Appraisal');
    eq(C.document.getElementById('inv-fmv-s1').value, '', '⚠ the row\'s Total box is repainted blank at once');
    eq(sums, 1, '…and the summary with it');
    const r = ref(C);
    eq([r.fmv, r.valSource, r.valuedBy], ['', 'Appraisal', 'appraiser'], '⚠⚠ OK: Agent Two\'s figure comes off; the source is Appraisal, waiting for the appraiser\'s figure');
    eq([r.valLow, r.valHigh, r.valConf, r.valNote], [undefined, undefined, undefined, undefined], '…its range, confidence and basis with it');
    eq(attempt(() => C.invAppraised(r)).val, false, 'and nothing is appraised yet: no figure is the appraisal\'s');
    edit(C, 'fmv', '$5,200');
    eq([ref(C).fmv, ref(C).valSource, ref(C).valuedBy], [5200, 'Appraisal', 'appraiser'], '⚠⚠ the figure typed after the choice is the appraisal');
    eq(attempt(() => C.invAppraised(ref(C))).val, true, '…and the line is appraised');
    // A figure a person recorded, and none at all.
    const D = rig(ESTATE(), [LINE({ fmv: 900, valSource: 'Dealer quote', valuedBy: 'desk' })]);
    edit(D, 'valSource', 'Appraisal');
    has(D.said.join(' | '), 'carries a value of $900 recorded before Appraisal was chosen, not an appraisal', 'a desk figure asks too');
    eq([ref(D).fmv, ref(D).valSource], ['', 'Appraisal'], '…and goes on OK');
    const E = rig(ESTATE(), [LINE({ fmv: '' })]);
    edit(E, 'valSource', 'Appraisal');
    eq([E.said.length, ref(E).valSource], [0, 'Appraisal'], 'nothing on the line: nothing to ask');
    const A = rig(ESTATE(), [LINE({ fmv: 5200, valSource: 'Appraisal', valuedBy: 'appraiser' })]);
    eq(attempt(() => A.invAppraisalSourceAsk(ref(A))).val, '', 'an appraiser\'s own figure: nothing to ask');
    // The writer's half: a caller that asks nothing still never makes another's figure the appraisal.
    const W = rig(ESTATE(), [AGENT()]);
    const w = ref(W); w.valSource = 'Appraisal';
    attempt(() => W._avTakeValue(w, 'appraisal', W.jobs[0]));
    eq([w.fmv, w.valuedBy], ['', 'appraiser'], '⚠ _avTakeValue\'s appraisal arm takes another\'s figure off whoever asked');
  }

  group('⚠⚠ A2 · never across a selection: the bar does not offer it, the handler refuses it');
  {
    const C = rig(ESTATE(), [AGENT(), AGENT({ stableId: 's2', itemNo: 41 })]);
    C._invPick = { s1: 1, s2: 1 };
    const bar = attempt(() => C._renderInvBulk(C.jobs[0])).val || '';
    has(bar, 'Set valuation source', 'fixture: the bar offers the valuation source on an estate');
    const menu = (bar.match(/Set valuation source[\s\S]*?<\/select>/) || [''])[0];
    lacks(menu, '>Appraisal<', '⚠⚠ Appraisal is not on its menu');
    has(menu, '>Dealer quote<', '…the other sources are');
    attempt(() => C._invBulkApply(7, 'valSource', 'Appraisal'));
    eq([ref(C).fmv, ref(C).valSource, ref(C, 's2').valSource], [4800, 'Online comps', 'Online comps'], '⚠⚠ the handler refuses it: forty estimates never read as appraisals');
    has(C.said.join(' | '), 'Appraisal is never set across a selection', '…and says why');
  }

  group('⚠ A3 · "appraisal (appraiser not named)" where nobody is recorded; the appraiser where one is');
  {
    const C = rig(ESTATE(), [LINE({ fmv: 5200, valSource: 'Appraisal', valuedBy: 'appraiser' }),
      LINE({ stableId: 's2', itemNo: 41, fmv: 900, valSource: 'Appraisal', valuedBy: 'appraiser', apprDoc: 'Marie Wayland · Wayland Fine Art' })]);
    eq(attempt(() => C.invValBasisWord(ref(C), 7)).val, 'appraisal (appraiser not named)', '⚠⚠ the schedules\' basis says nobody is named');
    eq(attempt(() => C.invValBasisWord(ref(C, 's2'), 7)).val, 'appraisal · Marie Wayland · Wayland Fine Art', '…and names the appraiser where one is recorded');
    eq(attempt(() => C.invAppraisalSourceText(ref(C), 7)).val, 'Appraisal (appraiser not named)', 'the line, its record and the report\'s source column likewise');
    const court = attempt(() => C.printCourtInventory(7, { asHtml: true })).val || {};
    has(textOf(court.html), 'appraisal (appraiser not named)', 'the Court Inventory prints it');
    const rep = attempt(() => C.printEstateInventoryReport(7, { asHtml: true })).val || {};
    has(textOf(rep.html), 'Appraisal (appraiser not named)', 'the Estate Inventory Report prints it');
    // ⚠ P7's review: Appraisal chosen and no figure yet reads pending, never a bare "Appraisal", on the report's source column.
    const P = rig(ESTATE(), [LINE({ fmv: '', valSource: 'Appraisal', valuedBy: 'appraiser' }), LINE({ stableId: 's2', itemNo: 41, fmv: '', valSource: 'Appraisal', valuedBy: 'appraiser', apprWaived: true, apprWaiveReason: 'counsel' })]);
    eq(attempt(() => P.invAppraisalSourceText(ref(P), 7)).val, 'Appraisal (appraiser not named) · pending', '⚠ the namer: owed, nobody named');
    eq(attempt(() => P.invAppraisalSourceText(ref(P, 's2'), 7)).val, 'Appraisal (appraiser not named) · waived', '…and waived, said so');
    const prep = (attempt(() => P.printEstateInventoryReport(7, { asHtml: true })).val || {}).html || '';
    has(textOf(prep), '— Appraisal (appraiser not named) · pending', '⚠⚠ the report\'s source column: pending, beside no figure');
    lacks(prep.replace(/<td[^>]*>/g, '<td>'), '<td>Appraisal</td>', '…never a bare "Appraisal"');
  }

  group('⚠ A4 · Agent Two never fills a line waiting on its appraiser\'s figure');
  {
    const C = rig(ESTATE(), [LINE({ fmv: '', valSource: 'Appraisal', valuedBy: 'appraiser', driveFileId: 'F1' }), LINE({ stableId: 's2', itemNo: 41, fmv: '' })]);
    eq(attempt(() => C.agentValueableRefs(7).map((r) => r.stableId)).val, ['s2'], 'Value N lines and the automatic run leave it out');
    eq(attempt(() => C._avWrite(7, 's1', { fmv: 3000, low: 2000, high: 4000, confidence: 'medium', source: 'Online comps', basis: 'x', comps: [], mode: 'comps' }, C.jobs[0], {})).val,
      false, '⚠ and the writer refuses it: the person\'s Appraisal stands');
    eq([ref(C).valSource, ref(C).fmv], ['Appraisal', ''], '…nothing written');
  }

  group('⚠⚠ A5 · Appraisal chosen over Agent Two\'s $9,000 sofa keeps it on the guardrail, the worklist and the release caution (P7\'s review)');
  {
    const SOFA = (o) => AGENT(Object.assign({ objectName: 'Camelback sofa, carved mahogany frame', valNameAt: 'Camelback sofa, carved mahogany frame', category: 'Furniture',
      fmv: 9000, valLow: 6000, valHigh: 12000, valSource: 'Auction comps', disposition: 'Auction', channel: 'Kodner Galleries' }, o || {}));
    const C = rig(ESTATE({ docLevel: 'formal' }), [SOFA()]);
    const j = C.jobs[0];
    eq([attempt(() => C.invNeedsAppraisal(ref(C), j)).val, attempt(() => C.invAwaitingAppraisal(ref(C), 7)).val], [true, true], 'fixture: $9,000, ranged to $12,000, routes on its value');
    edit(C, 'valSource', 'Appraisal');
    const r = ref(C);
    eq([r.fmv, r.valSource, r.valuedBy, r.valHigh], ['', 'Appraisal', 'appraiser', undefined], 'fixture: OK took Agent Two\'s figure and its range off');
    eq([attempt(() => C.invNeedsAppraisal(r, j)).val, attempt(() => C.invAwaitingAppraisal(r, 7)).val], [true, true], '⚠⚠ it still needs, and still awaits, the appraisal');
    eq((attempt(() => C.invReleaseCautions(r, 7)).val || []).map((c) => c.key), ['needsAppraisal'], '⚠⚠ …and the release request still says it has not been appraised yet');
    eq(attempt(() => C.invAppraisalSourceText(r, 7)).val, 'Appraisal (appraiser not named) · pending', '…its source reads pending');
    const wl = textOf((attempt(() => C.printAppraisalWorklist(7, { asHtml: true })).val || {}).html);
    has(wl, 'Camelback sofa, carved mahogany frame', '⚠⚠ the worklist still lists it');
    lacks(wl, 'No individual item is currently flagged', '…never "nothing flagged"');
    has(textOf((attempt(() => C.printCourtInventory(7, { asHtml: true })).val || {}).html), '1 item pending appraisal', '⚠ the Court Inventory\'s DRAFT names the appraisal pending');
    eq(attempt(() => C.agentValueableRefs(7).length).val, 0, '…and Agent Two still leaves it to the appraiser');
    edit(C, 'fmv', '$11,000');
    eq([attempt(() => C.invAppraised(ref(C))).val, attempt(() => C.invAwaitingAppraisal(ref(C), 7)).val], [true, false], 'the appraiser\'s figure typed: appraised, no longer awaiting');
    // A waiver answers it; a vehicle routes too (a person's choice, not the collector flag); a living job keeps the tick rule.
    const W = rig(ESTATE(), [SOFA({ fmv: '', valSource: 'Appraisal', valuedBy: 'appraiser', valLow: undefined, valHigh: undefined, apprWaived: true, apprWaiveReason: 'counsel' })]);
    eq(attempt(() => W.invAwaitingAppraisal(ref(W), 7)).val, false, 'waived: nothing awaits');
    const V = rig(ESTATE(), [LINE({ category: 'Vehicles & Watercraft', objectName: 'Mercedes sedan', fmv: '', valSource: 'Appraisal', valuedBy: 'appraiser' })]);
    eq(attempt(() => V.invNeedsAppraisal(ref(V), V.jobs[0])).val, true, 'a vehicle with Appraisal chosen and no figure needs it too');
    const L = rig(ESTATE({ svc: 'downsizing_move', matterType: '' }), [SOFA({ fmv: '', valSource: 'Appraisal', valuedBy: 'appraiser', valLow: undefined, valHigh: undefined })]);
    eq([attempt(() => L.invNeedsAppraisal(ref(L), L.jobs[0])).val, attempt(() => L.invAppraisalSourceText(ref(L), 7)).val], [false, 'Appraisal (appraiser not named) · pending'],
      'a living job: the flag stays the tick, and its source still says pending');
    eq(callersOf('invAppraisalChosen'), ['_invPanelAppraisalHtml', 'invAppraisalSourceText', 'invNeedsAppraisal', 'printEstateInventoryReport'], 'one answer, read by the rule, the namer, the record and the report');
  }

  // ═══════════════════════════════ D · THE §20.2031-6(b) SENTENCE (ACC-03) ═══════════════════════════════
  const ART = (i, o) => LINE(Object.assign({ stableId: 'a' + i, itemNo: 10 + i, objectName: 'Oil on board, landscape ' + i, fmv: [900, 950, 950][i - 1] || 400,
    valLow: 500, valHigh: 1500, valuedBy: 'agent', valSource: 'Online comps', valConf: 'medium', valAgentAt: 5, valNameAt: 'Oil on board, landscape ' + i,
    namedBy: 'desk', reviewed: true, disposition: 'Keep' }, o || {}));
  group('⚠⚠ D1 · the top of each Agent Two range is read: $2,800 recorded, ranges to $4,500, over the aggregate');
  {
    const C = rig(ESTATE(), [ART(1), ART(2), ART(3)]);
    const a = attempt(() => C.maivAggregate(C._photoRefs[7], C.jobs[0])).val || {};
    eq([a.total, a.top, a.over, a.settled], [2800, 4500, true, true], '⚠⚠ recorded $2,800, the top of the ranges $4,500: over');
    const said = attempt(() => C.maivStatement_(a)).val || '';
    has(said, 'total $2,800, and the top of Agent Two’s ranges for them reaches $4,500, over the $3,000 aggregate.', 'the sentence names both figures');
    const wl = textOf((attempt(() => C.printAppraisalWorklist(7, { asHtml: true })).val || {}).html);
    has(wl, 'An expert appraisal must be filed with the return.', '⚠⚠ the worklist: an expert appraisal must be filed');
    lacks(wl, 'does not require an expert appraisal', '…never "does not require" off three guesses nobody looked at');
    has(said, 'Of these figures: 3 values as Agent Two left them; list not yet read by Havellin.', '⚠ the stamp\'s words: three of Agent Two\'s figures standing as it left them');
    // The sentence's words and the schedules' pill read one count.
    const pill = textOf(attempt(() => C._avUnreviewedStamp(C._photoRefs[7], { fc: C.invAcceptCtx(C.jobs[0], C._photoRefs[7]) })).val);
    has(pill, '3 values as Agent Two left them; list not yet read by Havellin', '…the same words as the schedules\' pill');
    // A figure on a line the app flags (no destination yet) is "not yet reviewed", in the pill's words too.
    const F = rig(ESTATE(), [ART(1, { disposition: '' }), ART(2), ART(3)]);
    const fs_ = attempt(() => F.maivStatement_(F.maivAggregate(F._photoRefs[7], F.jobs[0]))).val || '';
    has(fs_, 'Of these figures: 1 value not yet reviewed; 2 values as Agent Two left them; list not yet read by Havellin.', 'a flagged line\'s figure: not yet reviewed, beside those standing');
    // RESTATED (P7's review): the stamp's own question whether a figure is still nobody's look reads the same count.
    eq(callersOf('_avStampCounts').sort(), ['_avStampText', '_avStampUnread', '_avUnreviewedStamp'], 'one count, read by the pill, the sentence and the unread question');
    // ⚠ The text and the pills say the same words, a flagged figure, figures standing unread, and the same once the list is read.
    const pills = (P, items) => (String(attempt(() => P._avUnreviewedStamp(items, { fc: P.invAcceptCtx(P.jobs[0], items) })).val || '').match(/<div[^>]*>([\s\S]*?)<\/div>/g) || [])
      .map((d) => textOf(d).trim()).join('; ');
    const words = (P, items) => attempt(() => P._avStampText(items, P.invAcceptCtx(P.jobs[0], items))).val;
    const M = rig(ESTATE(), [ART(1, { disposition: '' }), ART(2), ART(3)]);
    eq(words(M, M._photoRefs[7]), pills(M, M._photoRefs[7]), 'unread: the sentence\'s words are the pills\'');
    M.jobs[0].invRead = { at: Date.UTC(2026, 9, 26, 15), by: 'Anthony Graziano', seen: attempt(() => M.invListSeen(7)).val };
    has(words(M, M._photoRefs[7]), 'accepted as valued · list read by Anthony Graziano', 'fixture: the list read');
    eq(words(M, M._photoRefs[7]), pills(M, M._photoRefs[7]), '…and once read, the same words again');
  }

  group('D2 · under the aggregate at the top of the ranges: "does not require", saying the figures are not all a person\'s');
  {
    const C = rig(ESTATE(), [ART(1, { fmv: 600, valHigh: 900 }), ART(2, { fmv: 700, valHigh: 1000 })]);
    const wl = textOf((attempt(() => C.printAppraisalWorklist(7, { asHtml: true })).val || {}).html);
    has(wl, 'Below the $3,000 aggregate, the top of each Agent Two range included, so §20.2031-6(b) does not require an expert appraisal to be filed with the return, on figures not all yet looked at by a person (above).',
      '⚠ the conclusion says what it rests on');
    has(wl, 'Of these figures: 2 values as Agent Two left them; list not yet read by Havellin.', '…and the sentence above carries the stamp\'s words');
    const P = rig(ESTATE(), [ART(1, { fmv: 600, valHigh: 900, valReviewed: true }), LINE({ stableId: 'a2', itemNo: 12, fmv: 700, valuedBy: 'desk', valSource: 'Dealer quote' })]);
    const pw = textOf((attempt(() => P.printAppraisalWorklist(7, { asHtml: true })).val || {}).html);
    has(pw, 'so §20.2031-6(b) does not require an expert appraisal to be filed with the return. Re-check', 'figures a person has looked at: the conclusion as it always read');
    lacks(pw, 'Of these figures', '…with no stamp\'s words');
    // ⚠ P7's review: once the list is read, the figures are a person's look, and the conclusion no longer says they are not.
    const R = rig(ESTATE(), [ART(1, { fmv: 600, valHigh: 900 }), ART(2, { fmv: 700, valHigh: 1000 })]);
    R.jobs[0].invRead = { at: Date.UTC(2026, 9, 26, 15), by: 'Anthony Graziano', seen: attempt(() => R.invListSeen(7)).val };
    const rw = textOf((attempt(() => R.printAppraisalWorklist(7, { asHtml: true })).val || {}).html);
    has(rw, 'Of these figures: 2 accepted as valued · list read by Anthony Graziano', 'fixture: the list read, and the sentence names its reader');
    has(rw, 'so §20.2031-6(b) does not require an expert appraisal to be filed with the return. Re-check', '⚠⚠ the conclusion as it always read');
    lacks(rw, 'not all yet looked at by a person', '…never that the figures are not all a person\'s');
    eq([attempt(() => R.maivAggregate(R._photoRefs[7], R.jobs[0])).val.unread, attempt(() => C.maivAggregate(C._photoRefs[7], C.jobs[0])).val.unread], [false, true],
      'the aggregate\'s unread: false once read, true before');
    // …but a figure on a line the app flags is not yet reviewed whatever the read says, and the conclusion still says so.
    const F = rig(ESTATE(), [ART(1, { fmv: 600, valHigh: 900, disposition: '' }), ART(2, { fmv: 700, valHigh: 1000 })]);
    F.jobs[0].invRead = { at: Date.UTC(2026, 9, 26, 15), by: 'Anthony Graziano', seen: attempt(() => F.invListSeen(7)).val };
    const fw = textOf((attempt(() => F.printAppraisalWorklist(7, { asHtml: true })).val || {}).html);
    has(fw, 'Of these figures: 1 value not yet reviewed; 1 accepted as valued · list read by Anthony Graziano', 'fixture: one figure flagged, one standing, the list read');
    has(fw, 'on figures not all yet looked at by a person (above).', '⚠ a figure not yet reviewed is still nobody\'s look, read or not');
  }

  // ═══════════════════════════════ F · THE FORM 706 AGGREGATE (GAP2-02, RT-05) ═══════════════════════════════
  const MAIV8 = () => [
    LINE({ stableId: 'm1', itemNo: 1, objectName: 'Brenner oil, harbour', category: 'Art & Décor', fmv: 1600, valuedBy: 'desk', valSource: 'Dealer quote' }),
    LINE({ stableId: 'm2', itemNo: 2, objectName: 'Gorham sterling goblets', category: 'Silver & Precious Metal', qty: 12, fmv: 1800, valuedBy: 'desk', valSource: 'Dealer quote' }),
    LINE({ stableId: 'm3', itemNo: 3, objectName: 'Heriz rug', category: 'Rugs & Carpets', fmv: 2200, valuedBy: 'desk', valSource: 'Dealer quote' }),
    LINE({ stableId: 'm4', itemNo: 4, objectName: 'Pearl necklace', category: 'Jewelry & Watches', fmv: 1400, valuedBy: 'desk', valSource: 'Dealer quote' }),
    LINE({ stableId: 'm5', itemNo: 5, objectName: 'Federal card table', category: 'Antiques', fmv: 900, valuedBy: 'desk', valSource: 'Dealer quote' }),
    LINE({ stableId: 'm6', itemNo: 6, objectName: 'Coin collection', category: 'Collectibles', fmv: 400, valuedBy: 'desk', valSource: 'Dealer quote' }),
    LINE({ stableId: 'm7', itemNo: 7, objectName: 'Signed print', category: 'Art & Décor', fmv: 180, valuedBy: 'desk', valSource: 'Dealer quote' }),
    LINE({ stableId: 'm8', itemNo: 8, objectName: 'Unsigned bronze', category: 'Art & Décor', fmv: '' }),
  ];
  group('⚠⚠ F1 · already over the $3,000 aggregate whatever the remaining one is worth (GAP2-02)');
  {
    const C = rig(ESTATE(), MAIV8());
    const a = attempt(() => C.maivAggregate(C._photoRefs[7])).val || {};
    eq([a.total, a.count, a.lines, a.unvalued, a.over, a.settled], [8480, 19, 8, 1, true, false], 'eight lines, nineteen articles, $8,480 valued, one bronze unvalued');
    const said = attempt(() => C.maivStatement_(a)).val || '';
    has(said, '19 articles of marked artistic or intrinsic value total at least $8,480: already over the $3,000 aggregate whatever the remaining 1 is worth, so an expert appraisal must be filed with the return.',
      '⚠⚠ the sentence says over, not "cannot be tested yet"');
    lacks(said, 'cannot be tested', '…and never cannot be tested');
    const wl = (attempt(() => C.printAppraisalWorklist(7, { asHtml: true })).val || {}).html || '';
    has(textOf(wl), 'An expert appraisal must be filed with the return.', 'the worklist\'s tail: the requirement');
    has(textOf(wl), 'The 1 article with no value yet is part of it too.', '…and the unvalued article is part of it');
    lacks(textOf(wl), 'The aggregate cannot be tested', '…never the untested tail');
    has(wl, '<td style="padding:2px 6px;border-bottom:1px solid #eee;">Silverware</td><td style="padding:2px 6px;border-bottom:1px solid #eee;text-align:right;">12</td>',
      '⚠ the class table counts twelve goblets as twelve articles, not one line');
    const note = attempt(() => C._maivSummaryNotice(C.jobs[0], a)).val || '';
    has(textOf(note), 'Expert appraisal required with the return.', 'the desk\'s notice says it too');
    // Under the aggregate with one unvalued: as before.
    const U = rig(ESTATE(), [LINE({ stableId: 'u1', category: 'Art & Décor', fmv: 900, valuedBy: 'desk' }), LINE({ stableId: 'u2', itemNo: 2, category: 'Antiques', fmv: '' })]);
    const ua = attempt(() => U.maivAggregate(U._photoRefs[7])).val || {};
    has(attempt(() => U.maivStatement_(ua)).val, 'cannot be tested yet', 'at or under $3,000 with an article unvalued: it cannot be tested yet, as before');
    eq(attempt(() => U._maivSummaryNotice(U.jobs[0], ua)).val.indexOf('Value them before the return is prepared') > 0, true, '…and the desk asks for the values');
  }

  group('⚠⚠ F2 · past the aggregate every such article is owed the sworn appraisal, as a flag (RT-05)');
  {
    const rows = MAIV8();
    rows[3].valSource = 'Appraisal'; rows[3].valuedBy = 'appraiser'; rows[3].apprDoc = 'Marie Wayland';   // the pearls appraised
    rows[4].apprWaived = true; rows[4].apprWaiveReason = 'counsel: family piece, valued by agreement';  // the table waived
    const C = rig(ESTATE(), rows);
    const a = attempt(() => C.maivAggregate(C._photoRefs[7])).val || {};
    const owed = (attempt(() => C.maivOwedLines(C.jobs[0], a)).val || []).map((r) => r.itemNo);
    eq(owed, [1, 2, 3, 6, 7, 8], '⚠⚠ every article not appraised or waived is owed, whatever its own figure ($180 print included)');
    eq(rows.filter((r) => attempt(() => C.invNeedsAppraisal(r, C.jobs[0])).val).map((r) => r.itemNo), [8], 'fixture: the per-item test flags only the unvalued bronze');
    const wl = (attempt(() => C.printAppraisalWorklist(7, { asHtml: true })).val || {}).html || '';
    has(textOf(wl), '6 items are owed the sworn appraisal with the return: #1 Brenner oil, harbour, #2 Gorham sterling goblets, #3 Heriz rug, #6 Coin collection, #7 Signed print, #8 Unsigned bronze.',
      '⚠ the worklist names them');
    has(textOf(wl), 'Signed print · owed the sworn appraisal (§20.2031-6(b) aggregate)', '…and each joins its specialist\'s packet, marked');
    lacks(textOf(wl), 'Pearl necklace · owed', 'an appraised article is not owed');
    has(textOf(attempt(() => C._maivSummaryNotice(C.jobs[0], a)).val), '6 items are owed the sworn appraisal with the return', 'the desk\'s notice names them too');
    // A flag: nothing waits on it.
    eq(rows.filter((r) => attempt(() => C.invAwaitingAppraisal(r, 7)).val).map((r) => r.itemNo), [8], '⚠ nothing new waits on it: the schedules\' DRAFT reads the per-item rule alone');
    // Not on an estate filing no 706, nor under the aggregate.
    const N = rig(ESTATE({ gate706: 'no' }), MAIV8());
    eq(attempt(() => N.maivOwedLines(N.jobs[0], N.maivAggregate(N._photoRefs[7]))).val.length, 0, 'an estate filing no 706: nobody is owed it');
    const L = rig(ESTATE({ svc: 'downsizing_move', matterType: '' }), MAIV8());
    eq(attempt(() => L.maivOwedLines(L.jobs[0], L.maivAggregate(L._photoRefs[7]))).val.length, 0, 'a living client: nobody');
    const Under = rig(ESTATE(), [LINE({ stableId: 'x', category: 'Art & Décor', fmv: 900, valuedBy: 'desk' })]);
    eq(attempt(() => Under.maivOwedLines(Under.jobs[0], Under.maivAggregate(Under._photoRefs[7]))).val.length, 0, 'under the aggregate: nobody');
    eq(callersOf('maivOwedLines'), ['_apprGroups', '_maivSummaryNotice', '_maivWorklistBlock', 'printAppraisalWorklist'], 'one rule, read by the packets, the worklist and the desk\'s notice');
  }

  group('⚠⚠ F3 · an open double count is counted once: never "already over … must be filed" by counting one painting twice (the integration\'s review)');
  {
    // One harbour painting photographed twice, both lines valued before the room check linked them as plainly one thing, and an
    // unvalued bronze: $4,500 counting both, $2,400 counting the painting once.
    const LINKP = (o) => ({ dupWith: [o], dupPairs: { [o]: { conf: 'high', why: 'The harbour painting twice.' } } });
    const PA = (o) => LINE(Object.assign({ stableId: 'a1', itemNo: 11, objectName: 'Oil on canvas, harbour scene, gilt frame', fmv: 2400, valSource: 'Estimate', valuedBy: 'desk',
      ts: 1, namedBy: 'agent', agentName: 'Oil on canvas, harbour scene, gilt frame', driveFileId: 'F1' }, LINKP('a2'), o || {}));
    const PB = (o) => LINE(Object.assign({ stableId: 'a2', itemNo: 12, objectName: 'Harbour painting in gilt frame', fmv: 2100, valSource: 'Estimate', valuedBy: 'desk',
      ts: 2, namedBy: 'agent', agentName: 'Harbour painting in gilt frame', driveFileId: 'F2' }, LINKP('a1'), o || {}));
    const BR = (o) => LINE(Object.assign({ stableId: 'a3', itemNo: 13, objectName: 'Bronze figure of a heron, signed', fmv: '', ts: 3 }, o || {}));
    const C = rig(ESTATE(), [PA(), PB(), BR()]);
    const a = attempt(() => C.maivAggregate(C._photoRefs[7], C.jobs[0])).val || {};
    eq([a.total, a.over, a.waits, a.settled, a.dbl && a.dbl.total, a.dbl && a.dbl.unvalued], [4500, false, true, false, 2400, 1],
      '⚠⚠ over only by counting both lines: not over, the test waits on the decision (counted once: $2,400, the bronze still unvalued)');
    const said = attempt(() => C.maivStatement_(a)).val || '';
    lacks(said, 'already over', '⚠⚠ the sentence never says already over');
    lacks(said, 'must be filed', '…nor that an expert appraisal must be filed');
    has(said, '2 articles of marked artistic or intrinsic value total at least $2,400, counting once the possible double count not yet decided (#11 and #12), and at least $4,500 counting both lines: the $3,000 aggregate cannot be tested until it is decided whether the pair is one item or two, and 1 still has no value recorded.',
      '⚠ it gives both figures and says the test waits on the decision');
    eq((attempt(() => C.maivOwedLines(C.jobs[0], a)).val || []).map((r) => r.itemNo), [], '⚠⚠ nothing is owed the sworn appraisal for it');
    const note = textOf(attempt(() => C._maivSummaryNotice(C.jobs[0], a)).val || '');
    lacks(note, 'Expert appraisal required', 'the desk\'s notice does not say the appraisal is required');
    has(note, 'Answer it under Possible duplicates', '…and says what settles it');
    const wl = textOf((attempt(() => C.printAppraisalWorklist(7, { asHtml: true })).val || {}).html || '');
    lacks(wl, 'An expert appraisal must be filed with the return.', '⚠⚠ the worklist in the package does not say it must be filed');
    lacks(wl, 'owed the sworn appraisal', '…nor mark a line owed it, in its block or its packets');
    const packed = Object.keys(attempt(() => C._apprGroups(7)).val || {}).reduce((acc, k) => acc.concat(C._apprGroups(7)[k].map((r) => r.stableId)), []).sort();
    eq(packed, ['a3'], '⚠ and the packets carry the bronze alone, on its own rule: neither painting joins one as owed');
    has(wl, 'The aggregate cannot be tested until Havellin has decided whether each possible double count named above is one item or more, and every article above carries a value.',
      'its tail says the test waits, in the schedules\' words');
    eq(textOf((attempt(() => C.printCourtInventory(7, { asHtml: true })).val || {}).html).indexOf('1 possible double count not yet decided: #11 and #12') > 0, true,
      'fixture: the Court Inventory beside it is DRAFT for the same pair');
    // Every article valued, over only counting both lines: untested all the same, in the untested tone.
    const W = rig(ESTATE(), [PA(), PB(), BR({ fmv: 100, valuedBy: 'desk', valSource: 'Estimate' })]);
    const wa = attempt(() => W.maivAggregate(W._photoRefs[7], W.jobs[0])).val || {};
    eq([wa.settled, wa.over, wa.waits], [true, false, true], 'every article valued, $4,600 counting both, $2,500 counting once: waits');
    has(attempt(() => W.maivStatement_(wa)).val, '2 articles of marked artistic or intrinsic value total $2,500, counting once the possible double count not yet decided (#11 and #12), and $4,600 counting both lines: the $3,000 aggregate cannot be tested until it is decided whether the pair is one item or two.',
      '⚠ never "under" or "over": the test waits on the decision');
    const wwl = (attempt(() => W.printAppraisalWorklist(7, { asHtml: true })).val || {}).html || '';
    has(wwl, '<div style="margin-top:14px;border:1px solid #8a6d3b;', 'the aggregate\'s block is drawn in the untested tone');
    has(textOf(wwl), 'The aggregate cannot be tested until Havellin has decided whether each possible double count named above is one item or more. An untested total',
      '…and its tail asks for the decision alone');
    has(textOf(attempt(() => W._maivSummaryNotice(W.jobs[0], wa)).val || ''), 'Answer it under Possible duplicates', 'the desk\'s notice too');
    // The later line waiting on Agent Two, unvalued (P8's wait): counted once it is the earlier line's article, nothing left unvalued.
    const P8W = rig(ESTATE(), [PA(), PB({ fmv: '', valSource: '', valuedBy: undefined }), BR({ fmv: 900, valuedBy: 'desk', valSource: 'Estimate' })]);
    const pw = attempt(() => P8W.maivAggregate(P8W._photoRefs[7], P8W.jobs[0])).val || {};
    eq([pw.over, pw.unvalued, pw.dbl && pw.dbl.unvalued, pw.dbl && pw.dbl.count], [true, 1, 0, 2], 'over counted once; the waiting line is the earlier one\'s article');
    has(attempt(() => P8W.maivStatement_(pw)).val, '2 articles of marked artistic or intrinsic value total at least $3,300, counting once the possible double count not yet decided (#11 and #12): already over the $3,000 aggregate, so an expert appraisal must be filed with the return.',
      '⚠ never "whatever the remaining 1 is worth" for the waiting line');
    // The higher figure is the one kept, whichever line comes first.
    [[2400, 2100], [2100, 2400]].forEach(([x, y]) => {
      const H = rig(ESTATE(), [PA({ fmv: x }), PB({ fmv: y }), BR({ fmv: 900, valuedBy: 'desk', valSource: 'Estimate' })]);
      const ha = attempt(() => H.maivAggregate(H._photoRefs[7], H.jobs[0])).val || {};
      eq([ha.dbl && ha.dbl.total, ha.over], [3300, true], 'the pair at $' + x + ' and $' + y + ': counted once at its higher figure, $3,300, over');
    });
    // Over even counted once: said, the double count named, every article owed.
    const O = rig(ESTATE(), [PA(), PB(), BR({ fmv: 900, valuedBy: 'desk', valSource: 'Estimate' })]);
    const oa = attempt(() => O.maivAggregate(O._photoRefs[7], O.jobs[0])).val || {};
    eq([oa.over, oa.waits, oa.dbl && oa.dbl.total], [true, false, 3300], 'counted once it is still over ($3,300): over');
    has(attempt(() => O.maivStatement_(oa)).val, '2 articles of marked artistic or intrinsic value total $3,300, counting once the possible double count not yet decided (#11 and #12), over the $3,000 aggregate.',
      '⚠ the sentence says over on the figures counted once, and says so');
    eq((attempt(() => O.maivOwedLines(O.jobs[0], oa)).val || []).map((r) => r.itemNo), [11, 12, 13], 'and every article is owed the sworn appraisal');
    // Answered (Not duplicates on both lines): two paintings, and the aggregate is over as P7 said.
    const A = rig(ESTATE(), [PA({ dupOKIn: ['n1'] }), PB({ dupOKIn: ['n1'] }), BR()]);
    const aa = attempt(() => A.maivAggregate(A._photoRefs[7], A.jobs[0])).val || {};
    eq([aa.over, aa.waits, aa.dbl], [true, false, null], 'Not duplicates pressed: two items, over');
    has(attempt(() => A.maivStatement_(aa)).val, 'already over the $3,000 aggregate whatever the remaining 1 is worth, so an expert appraisal must be filed with the return.', '…and said as P7 says it');
    eq((attempt(() => A.maivOwedLines(A.jobs[0], aa)).val || []).map((r) => r.itemNo), [11, 12, 13], '…every article owed');
    // Under either way: as before.
    const Un = rig(ESTATE(), [PA({ fmv: 900 }), PB({ fmv: 800 }), BR({ fmv: 300, valuedBy: 'desk', valSource: 'Estimate' })]);
    const una = attempt(() => Un.maivAggregate(Un._photoRefs[7], Un.jobs[0])).val || {};
    eq([una.over, una.waits], [false, false], 'under counting both lines: under');
    has(attempt(() => Un.maivStatement_(una)).val, 'total $2,000, under the $3,000 aggregate.', '…said with every line counted, the larger figure');
    has(code(fn('maivAggregate')), 'invDoubleCountUnits(job, refs)', 'the aggregate reads the schedules\' own double counts');
    has(code(fn('_apprGroups')), 'maivAggregate(_all, _j)', 'and the packets read it with the job, as the worklist\'s block does');
  }

  // ═══════════════════════════════ E · A FLOOR IS A FLOOR (DOC-01, VAL-27) ═══════════════════════════════
  group('⚠⚠ E1 · the Estate Inventory Report states a floor by the Court Inventory\'s own rule, the estate and the property outside it subtotalled');
  {
    const rows = [LINE({ stableId: 'e1', itemNo: 1, objectName: 'Sofa', category: 'Furniture', fmv: 1200, valuedBy: 'desk', valSource: 'Dealer quote' }),
      LINE({ stableId: 'e2', itemNo: 2, objectName: 'Dining table', category: 'Furniture', fmv: 3275, valuedBy: 'desk', valSource: 'Dealer quote' }),
      LINE({ stableId: 'e3', itemNo: 20, objectName: 'Nightstand', category: 'Furniture', fmv: '' }),
      LINE({ stableId: 'e4', itemNo: 23, objectName: 'Copper cookware set', category: 'General/Household', fmv: '' }),
      LINE({ stableId: 'e5', itemNo: 30, objectName: 'Mercedes sedan', category: 'Vehicles & Watercraft', fmv: 14000, valuedBy: 'desk', valSource: 'Dealer quote', assetTrack: 'Non-probate', roomIdx: 1 }),
      LINE({ stableId: 'e6', itemNo: 31, objectName: 'Household chairs', category: 'Furniture', fmv: 10000, valuedBy: 'desk', valSource: 'Dealer quote', flagExempt: true })];
    const C = rig(ESTATE(), rows);
    const rep = textOf((attempt(() => C.printEstateInventoryReport(7, { asHtml: true })).val || {}).html);
    has(rep, 'Probate estate, exempt property included, recorded so far (Fair Market Value) — not a complete total: $14,475', '⚠⚠ the probate estate, exempt included: a floor, $14,475');
    // RESTATED (P7's review): the outside subtotal names the tracks it adds, and the exempt line listed with the carved-out property
    // is said to be counted in the probate estate, so the subtotals agree with the blocks above them.
    has(rep, 'Non-probate property, outside the probate estate (Fair Market Value): $14,000', '…the property outside it: $14,000, complete, named by its track');
    has(rep, 'Exempt property is counted in the probate estate: it is listed above with the carved-out property and claimed under §732.402, not excluded from the estate (#31 Household chairs).',
      '⚠ the exempt line listed with the carved-out property is said to be counted in the probate estate');
    lacks(rep, 'Exempt, Non-probate property, outside', '…never "exempt" in the outside subtotal');
    const X = rig(ESTATE(), [rows[0], rows[5]]);
    const xr = textOf((attempt(() => X.printEstateInventoryReport(7, { asHtml: true })).val || {}).html);
    has(xr, 'Total estimated fair market value: $11,200', 'only exempt property carved out: one total, no subtotals');
    has(xr, 'Exempt property is counted in the probate estate: it is listed above with the carved-out property and claimed under §732.402, not excluded from the estate (#31 Household chairs).',
      '…and the sentence still says the exempt line is counted in it');
    const T0 = rig(ESTATE({ svc: 'cleanout', matterType: 'trust' }), [rows[0], rows[5]]);
    lacks(textOf((attempt(() => T0.printEstateInventoryReport(7, { asHtml: true })).val || {}).html), 'Exempt property is counted', 'a trust-only matter carves nothing out, and says nothing of it');
    has(rep, 'Total recorded so far (Fair Market Value) — not a complete total: $28,475', '⚠⚠ and the whole: a floor, never "Total estimated fair market value: $28,475"');
    has(rep, '2 items are recorded without a value and are NOT included above, so this figure is a floor rather than a total: #20 Nightstand, #23 Copper cookware set.', '…naming the lines');
    lacks(rep, 'Total estimated fair market value', 'no complete total over a floor');
    const court = textOf((attempt(() => C.printCourtInventory(7, { asHtml: true })).val || {}).html);
    has(court, 'Total recorded so far (Fair Market Value) — not a complete total: $14,475', '⚠ the Court Inventory\'s floor is the Report\'s probate subtotal, to the cent');
    has(court, 'so this figure is a floor rather than a total: #20 Nightstand, #23 Copper cookware set.', '…in the same words');
    // Every line valued, on a trust-only matter: one complete total, no subtotals.
    const T = rig(ESTATE({ svc: 'cleanout', matterType: 'trust' }), [rows[0], rows[1]]);
    const tr = textOf((attempt(() => T.printEstateInventoryReport(7, { asHtml: true })).val || {}).html);
    has(tr, 'Total estimated fair market value: $4,475', 'every line valued: the complete total, as it always read');
    lacks(tr, 'Probate estate,', '…no subtotal where the matter has no probate estate');
    const ts = textOf((attempt(() => T.printTrustSchedule(7, { asHtml: true })).val || {}).html);
    ok(/Total tangible personal property held in trust \(Fair Market Value\): \$4,475|Total recorded so far/.test(ts), 'the Trust Schedule\'s total through the same line');
    // One helper, read by the three papers.
    eq(callersOf('_invFloorTotalHtml'), ['printCourtInventory', 'printEstateInventoryReport', 'printTrustSchedule'], '⚠ one floor rule, three papers');
    eq(callersOf('invTotalFloor'), ['printCourtInventory', 'printEstateInventoryReport', 'printTrustSchedule'], '…and one sum');
    eq(attempt(() => C.invTotalFloor([{ fmv: 0 }, { fmv: '' }, { fmv: '12.505' }])).val, { total: 12.51, unvalued: [{ fmv: '' }] }, 'a recorded $0 is a figure, a blank is not; to the cent');
  }

  // ═══════════════════════════════ G · THE PAPER OUTSIDE THE APP ═══════════════════════════════
  group('G · the four documents say what changed, and the counsel bundle carries the 706 reading as drafted');
  {
    const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
    [['manual.html', read('manual.html')], ['MANUAL.md', read('MANUAL.md')], ['concierge-guide.html', read('concierge-guide.html')], ['CONCIERGE_GUIDE.md', read('CONCIERGE_GUIDE.md')]]
      .forEach(([f, t]) => {
        has(t, 'appraiser not named', f + ': an appraisal with nobody named says so');
        has(t, 'already over', f + ': the aggregate is over whatever the rest are worth');
        has(t, 'not a complete total', f + ': the Estate Inventory PDF\'s floor');
        ok(/never <em>Appraisal<\/em>|never \*Appraisal\*/.test(t), f + ': the selection bar sets no Appraisal');
      });
    [read('manual.html'), read('MANUAL.md')].forEach((t, i) => {
      const f = i ? 'MANUAL.md' : 'manual.html';
      has(t, '2026-10-27e', f + ': the redeploy note');
      has(t, 'No sale the research could show', f + ': the server\'s sentence');
      has(t, 'Ruby Lane, Replacements', f + ': the asking hosts');
    });
    const bundle = read('COUNSEL_REVIEW_BUNDLE.md');
    has(bundle, '### D22. The §20.2031-6(b) aggregate: over $3,000 whatever the rest are worth, and every such article owed the sworn appraisal', '⚠ the bundle\'s D22');
    has(bundle, '| **4** | the first **706 estate** | D3, D22 |', '…under the first 706 estate\'s priority');
  }
};
