'use strict';
// P15 OF THE DESK AUDIT (2026-10-28): THE VALUE FOLLOWS THE JOB'S STANDARD, MARKET AND DATE. As the plan sets it (audits/2026-10-27-desk/
// PLAN.md, P15; the findings ACC-09, VAL-08, ACC-10, VAL-09, ACC-12, VAL-11, VAL-06, AGT-06, VAL-16, VAL-21, and Ask 14, ACC-04):
//
//   S · the server (main-sync.gs, backend 2026-10-28b, carrying the cell-cap fix's 2026-10-28): the standard by class in place of "not retail", each basis with its own words,
//       the buyer's premium on every comparable, a like item's asking price as Replacement Value's evidence, a line's own value date;
//   B · the basis: asked first, "(counsel only)" where fair market value is the law's, the agent's figures made at another basis named
//       with Re-value, the column and the total by the basis, a line's own basis printed where it differs;
//   D · the §2032 date: offered only on a Form 706 estate once the date has passed, asked first, a line that left inside the six months
//       valued as of the day it left, a line's own date printed where it differs;
//   V · Agent Two's appraisal and specialist advice reaches the list and never goes with a tick: Add to appraisal list / Send to a
//       specialist;
//   W · the worklist by the appraiser each line is linked to, and Send worklist;
//   X · Waive records who and when, prints, and can be undone;
//   O · an overdue report on the Values bar, and no stale "Expected back";
//   C · an appraisal in progress said on the request and the sign-out;
//   K · Ask 14: a WorthPoint sale more than 15% from the line's figure asks once.
//
// Every path through the real code: the server's functions lifted off main-sync.gs, the app's off havellin.html by their real call
// tree (p7-evidence.test.js's closure), the handlers driven as a person presses them.

const vm = require('vm');
const fs = require('fs');
const path = require('path');
const { sandbox, source, fn, decl, domStub, matchBrace } = require('./harness');

const SRC = source();
const GS = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'main-sync.gs'), 'utf8');
const code = (t) => String(t).split('\n').filter((l) => !l.trim().startsWith('//')).map((l) => l.replace(/\s\/\/\s.*$/, '')).join('\n');
const bare = (t) => code(t).replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, "''");
const textOf = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&middot;/g, '·').replace(/&rsquo;/g, '’').replace(/&mdash;/g, '—')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#9888;/g, '⚠').replace(/\s+/g, ' ');
const attempt = (f) => { try { return { ok: true, val: f() }; } catch (e) { return { ok: false, err: String(e && e.message || e) }; } };

// ─── THE BACKEND ───
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
const g = (function () {
  const ctx = { JSON, Math, Number, String, Object, Array, Error, parseInt, parseFloat, isFinite, RegExp, Date,
    Logger: { log() {} }, PropertiesService: { getScriptProperties: () => ({ getProperty: () => null }) } };
  vm.createContext(ctx);
  vm.runInContext(GS_AGENT_VARS.map(gsVar).concat([gsVar('BACKEND_VERSION')]).concat(GS_AGENT_FNS.filter((f) => !/^test/.test(f)).map(gsFn)).join('\n'), ctx);
  return ctx;
})();
const seenOf = (urls) => { const s = {}; urls.forEach((u) => { s[g._avUrlKey(u)] = 1; }); return s; };
const VAL = (over) => Object.assign({ line: 'L1', name: 'Bronze figure of a dancer', value: 4200, low: 3000, high: 5500, confidence: 'medium',
  source: 'Auction comps', basis: 'Two sold comparables at auction, buyer’s premium included.', comps: [], lookup: 'bronze dancer', notices: [] }, over || {});

// ─── THE APP: the real call tree of the roots ───
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

const STOP = ['jobs', '_photoRefs', 'estimateStore', 'jobPlanStore', 'vendorDirectory', 'document', 'window', 'SHEETS_SYNC_URL', '_invCloudSeen',
  '_invCloudFailed', 'savePhotoRefs', '_scheduleInventorySync', 'renderInventoryTab', 'showSyncBadge', '_invRefreshFlagStrip', '_invRefreshRecords',
  '_invRefreshReleases', '_invRefreshAgentNotices', '_deskFoldHeadsRepaint', '_todayStr', 'saveJobs', 'syncJobToSheets', '_invThumbHTML',
  'setTimeout', 'clearTimeout', '_printDocument', '_invPrintThumb', 'alert', '_invRefreshSummary', '_invRefreshGuardrail', '_renderInvWorkbar',
  '_avStart', 'invReadFirst', 'refreshPhotoRefs', 'uploadHtmlToDrive', 'docPdfBase64', 'gmailCreateDraft', 'resolveSubfolderId', '_docNotice',
  '_invEnsureLoaded', 'deskFoldOpen', '_invReviewRepaint', 'gmailDraftUrl', '_exportDoc', 'buildMimeMessage'];
const ROOTS = ['setValBasis', 'setEstateAVD', '_renderValueSettings', 'agentValueRevalueStandard', 'invValueStandardMoved', 'invValueStandardStale',
  'invLineStandardNote', 'invLineValueDate', 'estateAvdOffered', 'estateValueDate', 'estateValueDateLabel', 'invValBasisLocked', '_avWrite', '_avTakeValue',
  '_avItemPayload', 'invLineHold', 'invAcceptCtx', 'printCourtInventory', 'printTrustSchedule', 'printEstateInventoryReport', '_invScheduleSection',
  'invNeedsAppraisal', 'agentValueAdvice', 'agentValueAdvised', 'agentValueAddToAppraisal', '_invGuardrailItems', '_renderAppraisalGuardrail',
  'invWorkFlags', '_avNoticesHtml', '_avPanelHtml', '_avRowBadges', '_apprGroupList', '_apprGroups', 'printAppraisalWorklist', 'sendAppraisalWorklist',
  '_renderAppraiserRoster', 'waiveAppraisal', 'undoWaiveAppraisal', 'invApprWaiverText', '_invPanelAppraisalHtml', 'apprReportOverdue', 'deskFoldState',
  'invReleaseCautions', '_invCautionBadges', 'signoutSheetHtml', 'signoutGroups', '_signoutBodyHtml', 'agentValueUseSale', '_renderInventorySummary',
  'invAwaitingAppraisal', 'invApprInProgressBadge'];
let _cl = null;
function rig(job, rows, o) {
  o = o || {};
  _cl = _cl || closure(ROOTS, STOP);
  const said = [], badges = [], started = [], notices = [], drafts = [];
  const C = sandbox({ fns: _cl.fns, vars: _cl.vars, stubs: {
    jobs: [job], _photoRefs: { [job.id]: rows.map((r) => Object.assign({}, r)) },
    estimateStore: { [job.id]: { estimate: { svc: job.svc, rooms: [{ idx: 0, name: 'Study' }, { idx: 1, name: 'Garage' }] } } },
    jobPlanStore: {}, vendorDirectory: [], document: o.dom || domStub({}),
    window: { confirm: (m) => { said.push(String(m)); return typeof o.answer === 'function' ? o.answer(String(m)) : o.answer !== false; },
              prompt: (m) => { said.push(String(m)); return o.reason === undefined ? 'The family is keeping it' : o.reason; }, open() {} },
    SHEETS_SYNC_URL: 'https://script.google.com/macros/s/P15/exec', _invCloudSeen: { [job.id]: true }, _invCloudFailed: {},
    savePhotoRefs() {}, _scheduleInventorySync() {}, renderInventoryTab() {}, showSyncBadge(m) { badges.push(String(m)); },
    _invRefreshFlagStrip() {}, _invRefreshRecords() {}, _invRefreshReleases() {}, _invRefreshAgentNotices() {}, _deskFoldHeadsRepaint() {},
    _todayStr: () => o.today || '2026-10-28', saveJobs() {}, syncJobToSheets() {}, _invThumbHTML: () => '<i></i>', setTimeout: () => 1, clearTimeout() {},
    _printDocument() {}, _invPrintThumb: () => '', alert(m) { said.push(String(m)); }, _invRefreshSummary() {}, _invRefreshGuardrail() {},
    _renderInvWorkbar: () => '', _avStart(jobId, j, ids, opts) { started.push({ ids: ids.slice(), opts: opts }); },
    invReadFirst: () => false, refreshPhotoRefs: (id, cb) => cb(false, true), uploadHtmlToDrive: (f, n, h, cb) => cb(true, 'https://drive/wl'),
    docPdfBase64: (spec, html, cb) => cb('PDF64'), gmailCreateDraft: (mime, cb) => { drafts.push(String(mime)); cb(true, { messageId: 'm1' }); },
    resolveSubfolderId: (j, name, cb) => cb('FOLDER'), _docNotice: (k, m) => notices.push([k, String(m)]), _invEnsureLoaded() {}, deskFoldOpen() {},
    _invReviewRepaint() {}, gmailDraftUrl: () => 'https://mail/d', _exportDoc: (t, h) => h,
    buildMimeMessage: (m) => JSON.stringify({ to: m.to, cc: m.cc, subject: m.subject, text: m.text, att: (m.attachments || []).map((a) => a.name) }),
  } });
  Object.assign(C, { said, badges, started, notices, drafts });
  return C;
}
const ESTATE = (o) => Object.assign({ id: 7, hvlId: 'HVL-2610-P15', svc: 'probate', matterType: 'probate', name: 'Estate of Harold Ashworth',
  deathDate: '2026-04-02', gate706: 'yes', docTier: 'values', status: 'active', won: true, executor: 'Ruth Adler', executorEmail: 'ruth@x.com',
  executorRole: 'Personal Representative', probateAttyEmail: 'counsel@law.com', tc: 'Ashley Jerome', docState: {}, at: {}, appraisers: [],
  addr: '412 Seaview Ave, Palm Beach' }, o || {});
const LIVING = (o) => ESTATE(Object.assign({ svc: 'downsizing_move', matterType: '', gate706: '', docTier: '', deathDate: '', name: 'Margaret Lowe', executor: '' }, o || {}));
const LINE = (o) => Object.assign({ stableId: 's1', label: 'inventory', itemNo: 40, objectName: 'Bronze figure of a dancer', category: 'Art & Décor',
  disposition: 'Keep', roomIdx: 0, ts: 1, updatedAt: 1, fmv: '', namedBy: 'desk', reviewed: true }, o || {});
// Agent Two's figure, made at Fair Market Value as of the date of death.
const AGENT = (o) => LINE(Object.assign({ fmv: 1600, valLow: 800, valHigh: 2400, valConf: 'medium', valuedBy: 'agent', valSource: 'Auction comps',
  valNote: 'Two sold comparables at auction, buyer’s premium included.', valAgentAt: 5, valNameAt: 'Bronze figure of a dancer', valDate: '2026-04-02',
  valBasis: 'Fair Market Value' }, o || {}));
const ADVISED = (o) => AGENT(Object.assign({ valNotices: [{ kind: 'appraiser', text: 'Signed and the comparables disagree widely: a qualified appraisal is advisable.' }] }, o || {}));
const CARLA = { id: 501, name: 'Carla Mendes', firm: 'Mendes Fine Art', credential: 'ISA', independent: true, effectiveDate: '2026-04-02', dueDate: '2026-10-20', email: 'carla@mendesart.com' };
const ref = (C, id) => C._photoRefs[7].filter((r) => r.stableId === (id || 's1'))[0];

module.exports = function ({ group, ok, eq, has, lacks }) {

  // ═══════════════════════════════ S · THE SERVER ═══════════════════════════════
  group('⚠⚠ S1 · the standard by class, each basis its own words (ACC-12, ACC-09)');
  {
    const fmv = g._avSystem({ estate: true, basis: 'Fair Market Value', valuationDate: '2026-04-02', categories: [], conditions: [] });
    has(fmv, 'most commonly sold to the public', 'Fair Market Value: the market where the thing is most commonly sold to the public');
    has(fmv, 'art, antiques, silver and jewellery at auction, at the price the buyer paid (the hammer plus the buyer\'s premium)', '…art, antiques, silver and jewellery at auction, premium in');
    has(fmv, 'branded furniture, decor and electronics on the used or resale market', '…branded furniture, decor and electronics on the resale market');
    has(fmv, 'Name the market in the basis sentence', '…and the basis sentence names the market');
    lacks(fmv, 'It is not retail', '⚠⚠ never the blanket "not retail"');
    has(fmv, 'Where a page shows the hammer alone, add the premium the house states in its terms', '⚠ a hammer-only result is grossed up by the stated premium, or labelled');
    const rv = g._avSystem({ estate: true, basis: 'Replacement Value', valuationDate: '2026-04-02', categories: [], conditions: [] });
    has(rv, 'what it would cost to replace the thing with one of like kind and quality', '⚠⚠ Replacement Value has its own paragraph');
    has(rv, 'The asking prices of like items are the evidence here', '…where a like item\'s asking price is the evidence');
    has(rv, 'except on Replacement Value, where the asking price of a like item is what it costs to replace it', '…and the evidence rule says so');
    lacks(rv, 'Value every line on that basis and say so in the basis sentence where it matters', '…never the one-sentence paragraph it had');
    has(rv, 'low and high bracket its value on that basis', '…and its range is that basis\'s');
    has(g._avSystem({ basis: 'Liquidation Value', categories: [], conditions: [] }), 'what the thing would fetch in a quick sale', 'Liquidation Value has its own paragraph');
    has(g._avSystem({ basis: 'Marketable Cash Value', categories: [], conditions: [] }), 'after the seller\'s commission and fees', 'Marketable Cash Value has its own paragraph');
    const tool = g._avTool('comps', [], [], 'Fair Market Value');
    const cp = tool.input_schema.properties.values.items.properties.comps.items;
    ok(cp.required.indexOf('premium') >= 0, 'every comparable says whether its price includes the buyer\'s premium (strict: required)');
    eq(JSON.stringify(cp.properties.premium.enum), JSON.stringify(['included', 'added', 'hammer only', 'none']), '…from the four answers');
    has(tool.input_schema.properties.values.items.properties.basis.description, 'and in which market', 'the basis field asks for the market');
    has(tool.input_schema.properties.values.items.properties.low.description, 'realistically sell for', 'on Fair Market Value the range is what it would sell for');
    has(g._avTool('comps', [], [], 'Replacement Value').input_schema.properties.values.items.properties.low.description, 'on the basis given', '…on another basis, that basis\'s');
  }

  group('⚠⚠ S2 · the premium kept; a like item\'s asking price is Replacement Value\'s evidence; a line\'s own date');
  {
    const U = 'https://www.liveauctioneers.com/item/777_bronze-dancer';
    const r = g._avLineResult(VAL({ comps: [{ title: 'Bronze dancer', venue: 'LA', saleDate: '2025-10', price: 3900, url: U, kind: 'sold', premium: 'added' }] }), 'comps', seenOf([U]), 1);
    eq(r.comps[0].premium, 'added', 'a hammer grossed up by the house\'s premium says so on the comparable');
    eq(g._avLineResult(VAL({ comps: [{ title: 'x', venue: 'LA', saleDate: '', price: 3900, url: U, kind: 'sold', premium: 'maybe' }] }), 'comps', seenOf([U]), 1).comps[0].premium, '',
      'an answer off the list is said as not known, never guessed');
    const RH = 'https://www.ebay.com/itm/55555';
    const ask = { title: 'Same mirror, like new', venue: 'eBay', saleDate: '', price: 900, url: RH, kind: 'asking', premium: 'none' };
    const onFmv = g._avLineResult(VAL({ value: 600, low: 400, high: 900, source: 'Online comps', basis: 'One listing.', comps: [ask] }), 'comps', seenOf([RH]), 1, 'Fair Market Value');
    eq([onFmv.source, onFmv.confidence], ['General estimate', 'low'], 'on Fair Market Value an asking price alone is still no sale: a general estimate, low');
    const onRv = g._avLineResult(VAL({ value: 900, low: 800, high: 1100, source: 'Online comps', confidence: 'medium', basis: 'The asking price of the same mirror like new.', comps: [ask] }), 'comps', seenOf([RH]), 1, 'Replacement Value');
    eq([onRv.source, onRv.confidence], ['Online comps', 'medium'], '⚠⚠ on Replacement Value the like item\'s asking price is the evidence: never forced to a general estimate');
    has(g._avLineText('L1', { name: 'Sofa', qty: 1, valueDate: '2026-07-10' }), 'Value as of 2026-07-10, the day it left the estate', 'a line valued as of its own day is told so');
    lacks(g._avLineText('L1', { name: 'Sofa', qty: 1, valueDate: '' }), 'Value as of', '…and a line with none reads as before');
    has(gsFn('agentValueLines'), '_avLineResult(hit.v, p.unit.mode, seen, it.qty, ctx.basis)', 'the job\'s basis reaches the check');
  }

  group('S3 · the version, and the app\'s copy of the premium list held equal to the server\'s');
  {
    eq(g.BACKEND_VERSION, '2026-10-28b', 'the backend is 2026-10-28b (main took 2026-10-28 for the cell-cap fix, which this carries)');
    const app = sandbox({ fns: [], vars: ['BACKEND_MIN_VERSION', 'AGENT_VALUE_PREMIUMS'] });
    eq(app.BACKEND_MIN_VERSION, '2026-10-28b', 'the app asks for it');
    eq(JSON.stringify(app.AGENT_VALUE_PREMIUMS), JSON.stringify(g.AGENT_VALUE_PREMIUMS), 'one list of premium answers on both sides');
  }

  // ═══════════════════════════════ B · THE BASIS ═══════════════════════════════
  group('⚠⚠ B1 · where fair market value is the law\'s standard, another basis is counsel\'s (VAL-08)');
  {
    const C = rig(ESTATE(), [AGENT()]);
    has(C.invValBasisLocked(ESTATE()), '§733.604', 'the probate track');
    has(C.invValBasisLocked(ESTATE({ svc: 'cleanout', matterType: 'neither', gate706: 'yes' })), 'Form 706', 'a 706 estate');
    has(C.invValBasisLocked(ESTATE({ svc: 'cleanout', matterType: 'neither', gate706: '' })), 'Form 706', 'an unanswered 706 counts as filing, as the floor reads it');
    has(C.invValBasisLocked(ESTATE({ svc: 'cleanout', matterType: 'trust', gate706: 'no' })), 'trust', 'a trust matter: the Trust Schedule states the carrying value');
    eq(C.invValBasisLocked(ESTATE({ svc: 'cleanout', matterType: 'neither', gate706: 'no' })), '', 'Neither, filing no 706: any basis with the ordinary question');
    eq(C.invValBasisLocked(LIVING()), '', 'living work has no estate standard');
    const card = C._renderValueSettings(C.jobs[0], '2026-10-28');
    has(card, '>Liquidation Value (counsel only)</option>', 'the other bases read "(counsel only)" on the select');
    has(card, 'value="Fair Market Value" selected>Fair Market Value</option>', '…and Fair Market Value is offered plainly');
    const N = rig(ESTATE({ svc: 'cleanout', matterType: 'neither', gate706: 'no' }), []);
    lacks(N._renderValueSettings(N.jobs[0], '2026-10-28'), 'counsel only', 'nothing marked counsel only where any basis may be chosen');
  }

  group('⚠⚠ B2 · changing the basis asks first, names the agent figures made at the old basis, and offers Re-value (ACC-09, VAL-08)');
  {
    const C = rig(ESTATE(), [AGENT(), LINE({ stableId: 's2', itemNo: 41, objectName: 'Walnut chest', fmv: 900, valuedBy: 'desk', category: 'Furniture' })], { answer: false });
    const no = attempt(() => C.setValBasis(7, 'Liquidation Value'));
    eq([no.ok, no.val, C.jobs[0].valBasis], [true, false, undefined], 'Cancel: nothing written');
    has(C.said[0], 'Liquidation Value is counsel’s to choose: the §733.604 inventory is stated at fair market value', '⚠⚠ the question says the basis is counsel\'s');
    has(C.said[0], '1 value Agent Two made at Fair Market Value stays as it is until valued again', '…names the agent\'s figures made at the old basis');
    has(C.said[0], 'the Valuation card offers Re-value', '…and where Re-value is');
    has(C.said[0], '1 value you or an appraiser recorded is not changed: check it against Liquidation Value', '…and the ones a person recorded, to check');
    const Y = rig(ESTATE(), [AGENT()]);
    eq(Y.setValBasis(7, 'Liquidation Value'), true, 'OK: the basis changes');
    eq([Y.jobs[0].valBasis, Y.jobs[0].valBasisBy], ['Liquidation Value', 'Ashley Jerome'], '…with who changed it');
    eq(Y.invValueStandardMoved(ref(Y), Y.jobs[0]), 'basis', '⚠⚠ the agent\'s figure is named as made at another basis, never restated');
    eq(Y.invLineHold(ref(Y), Y.invAcceptCtx(Y.jobs[0])), 'standard', '…and it keeps its tick until valued again');
    const card = textOf(Y._renderValueSettings(Y.jobs[0], '2026-10-28'));
    has(card, '1 value Agent Two made at another basis or date: #40 Bronze figure of a dancer (at Fair Market Value)', 'the Valuation card names it');
    has(card, 'Re-value 1 line', '…and offers Re-value');
    eq(Y.agentValueRevalueStandard(7), 1, 'Re-value sends it');
    eq(JSON.stringify(Y.started[0]), JSON.stringify({ ids: ['s1'], opts: { revalue: true } }), '…as a Re-value of the agent\'s own figure');
    has(textOf(Y.deskFoldState(7, Y.jobs[0], 'values', Y._photoRefs[7], '2026-10-28').bits.map((b) => b.text).join(' | ')), '1 value made at another basis or date: Re-value on the Valuation card',
      'the Values bar says it, and opens for it');
    eq(Y.deskFoldState(7, Y.jobs[0], 'values', Y._photoRefs[7], '2026-10-28').openByDefault, true, '…open');
    // Nothing a person recorded is ever held for it.
    eq(Y.invValueStandardMoved(LINE({ fmv: 900, valuedBy: 'desk' }), Y.jobs[0]), '', 'a figure a person recorded is never "made at another basis"');
  }

  group('⚠⚠ B3 · the column, the footer and the total by the basis; a line\'s own basis printed where it differs (VAL-08)');
  {
    const C = rig(ESTATE({ valBasis: 'Liquidation Value' }), [AGENT(), LINE({ stableId: 's2', itemNo: 41, objectName: 'Walnut chest', fmv: 900, valuedBy: 'desk', category: 'Furniture', valSource: 'Dealer quote' })]);
    const ci = C.printCourtInventory(7, { asHtml: true });
    ok(ci && ci.html, 'the Court Inventory builds');
    const t = textOf(ci && ci.html);
    has(t, 'Liquidation value (total)', '⚠⚠ the column reads the basis, never "FMV (total)" under a heading of Liquidation Value');
    lacks(t, 'FMV (total)', '…nowhere');
    has(t, 'Total tangible personal property (Liquidation Value)', 'the total by the basis');
    has(t, 'Values are estimated liquidation value as of date of death', 'the footer by the basis');
    has(t, 'at Fair Market Value', '⚠ the agent\'s line made at Fair Market Value says so under its basis');
    const eir = C.printEstateInventoryReport(7, { asHtml: true });
    has(textOf(eir && eir.html), 'Liquidation value (total)', 'the Estate Inventory Report\'s column by the basis');
    const ts = C.printTrustSchedule(7, { asHtml: true });
    const C2 = rig(ESTATE({ svc: 'cleanout', matterType: 'trust', valBasis: 'Replacement Value' }), [AGENT({ assetTrack: 'Trust' })]);
    const tt = textOf(C2.printTrustSchedule(7, { asHtml: true }).html);
    has(tt, 'Replacement value (total)', 'the Trust Schedule\'s column by the basis');
    has(tt, 'These figures are not the fair market value at which property received from a decedent enters the trust’s records', '⚠ and on another basis it never claims the carrying value');
    ok(!!ts, 'the trust schedule on a probate job still answers');
  }

  group('B4 · the agent records the basis with its figure; a person\'s figure or an appraisal takes it off');
  {
    const C = rig(ESTATE({ valBasis: 'Replacement Value', matterType: 'neither', svc: 'cleanout', gate706: 'no' }), [LINE({ fmv: '', valuedBy: '' })]);
    eq(C._avWrite(7, 's1', { fmv: 900, low: 800, high: 1100, confidence: 'medium', source: 'Online comps', basis: 'b', comps: [], mode: 'comps' }, C.jobs[0], {}), true, 'Agent Two writes');
    eq([ref(C).valBasis, ref(C).valDate], ['Replacement Value', '2026-04-02'], '…the basis and the date it valued at');
    const r = ref(C); r.fmv = 750; C._avTakeValue(r, 'typed', C.jobs[0]);
    eq(r.valBasis, undefined, 'a figure typed over it takes the agent\'s basis off');
    const a = AGENT(); C._avTakeValue(a, 'appraisal', C.jobs[0]);
    eq(a.valBasis, undefined, '…as does an appraisal');
  }

  // ═══════════════════════════════ D · THE DATE ═══════════════════════════════
  group('⚠⚠ D1 · the §2032 tick only on a Form 706 estate, and only once the date has passed (ACC-10, VAL-09)');
  {
    const C = rig(ESTATE(), []);
    eq(JSON.stringify(C.estateAvdOffered(ESTATE({ gate706: 'no' }), '2026-10-28')), JSON.stringify({ show: false, open: false, date: '' }), 'no 706: no tick');
    eq(JSON.stringify(C.estateAvdOffered(ESTATE({ gate706: '' }), '2026-10-28')), JSON.stringify({ show: false, open: false, date: '' }), 'an unanswered 706: no tick (it is elected on a return filed)');
    eq(JSON.stringify(C.estateAvdOffered(ESTATE({ deathDate: '2026-06-01' }), '2026-10-28')), JSON.stringify({ show: true, open: false, date: '2026-12-01' }), 'a 706 estate before the date: shown, not yet open');
    eq(C.estateAvdOffered(ESTATE(), '2026-10-28').open, true, '…and once it has passed (Oct 2, 2026 for a death on Apr 2), open');
    has(textOf(C._renderValueSettings(ESTATE({ deathDate: '2026-06-01' }), '2026-10-28')), '§2032 alternate valuation date: Dec 1, 2026, six months after death. It can be chosen once that day has passed.', 'before the date, the date in grey');
    lacks(C._renderValueSettings(ESTATE({ deathDate: '2026-06-01' }), '2026-10-28'), 'id="inv-avd-7"', '…and no tick');
    has(C._renderValueSettings(ESTATE(), '2026-10-28'), 'onchange="setEstateAVD(7,this.checked)"', 'after, the tick');
    lacks(C._renderValueSettings(ESTATE({ gate706: 'no' }), '2026-10-28'), '§2032', 'no 706: nothing about §2032');
    const N = rig(ESTATE({ gate706: 'no' }), []);
    eq(N.setEstateAVD(7, true, '2026-10-28'), false, 'the handler refuses on a non-706 estate');
    has(N.said[0], 'elected on a Form 706, and this estate is not recorded as filing one', '…by name');
    eq(N.jobs[0].avd, undefined, '…nothing written');
    const E = rig(ESTATE({ deathDate: '2026-06-01' }), []);
    eq(E.setEstateAVD(7, true, '2026-10-28'), false, 'and before the date');
    has(E.said[0], 'The alternate valuation date is Dec 1, 2026, six months after death. It can be chosen once that day has passed.', '…by name');
  }

  group('⚠⚠ D2 · elected: asked first, every value stated as of that day, an item that left inside it as of its day');
  {
    const rows = [AGENT(), AGENT({ stableId: 's2', itemNo: 41, objectName: 'Silver tea service', disposition: 'Auction', dispDate: '2026-07-10' }),
      LINE({ stableId: 's3', itemNo: 42, objectName: 'Walnut chest', fmv: 900, valuedBy: 'desk', category: 'Furniture', valDate: '2026-04-02' })];
    const C = rig(ESTATE(), rows, { answer: false });
    eq(C.setEstateAVD(7, true, '2026-10-28'), false, 'Cancel: nothing written');
    has(C.said[0], 'Use the §2032 alternate valuation date, Oct 2, 2026?', 'the question names the day');
    has(C.said[0], 'an item sold or given out before it as of the day it left', '…the rule for an item that left inside the six months');
    has(C.said[0], '2 values Agent Two made as of Apr 2, 2026 print with their own date until valued again: the Valuation card offers Re-value', '…and the agent\'s figures made as of the old day');
    has(C.said[0], '1 value you or an appraiser recorded keeps its own date', '…and a person\'s, which keeps its date');
    const Y = rig(ESTATE(), rows);
    eq(Y.setEstateAVD(7, true, '2026-10-28'), true, 'OK: elected');
    eq([Y.estateValueDate(Y.jobs[0]), Y.estateValueDateLabel(Y.jobs[0])], ['2026-10-02', 'the alternate valuation date'], 'every value stated as of the alternate date');
    eq(Y.invLineValueDate(ref(Y, 's2'), Y.jobs[0]), '2026-07-10', '⚠⚠ the tea service sold inside the six months: valued as of the day it left (§2032(a)(1))');
    eq(Y.invLineValueDate(ref(Y, 's1'), Y.jobs[0]), '2026-10-02', '…the rest as of the alternate date');
    eq(Y.invValueStandardMoved(ref(Y, 's1'), Y.jobs[0]), 'date', 'the agent\'s figure made as of the date of death is named');
    eq(Y.invValueStandardMoved(ref(Y, 's2'), Y.jobs[0]), 'date', '…and the tea service\'s');
    eq(Y._avItemPayload(7, ref(Y, 's2')).valueDate, '2026-07-10', 'Agent Two is sent the tea service\'s own day');
    eq(Y._avItemPayload(7, ref(Y, 's1')).valueDate, '', '…and nothing for a line valued as of the heading\'s');
    const t = textOf(Y.printCourtInventory(7, { asHtml: true }).html);
    has(t, 'as of the alternate valuation date (Oct 2, 2026)', 'the Court Inventory\'s heading');
    has(t, 'as of Apr 2, 2026', '⚠⚠ a line\'s own date printed where it differs from the heading');
    // The 706 answer moved off Yes: the election no longer counts.
    const M = rig(ESTATE({ avd: true, gate706: 'no' }), []);
    eq([M.estateValueDate(M.jobs[0]), M.estateValueDateLabel(M.jobs[0])], ['2026-04-02', 'date of death'], '⚠ a tick on an estate no longer filing a 706 counts for nothing');
  }

  // ═══════════════════════════════ V · AGENT TWO'S ADVICE ═══════════════════════════════
  group('⚠⚠ V1 · on an estate the advice reaches the guardrail and the worklist, and a tick never drops it (VAL-06, AGT-06)');
  {
    const C = rig(ESTATE(), [ADVISED({ reviewed: false })]);
    eq(C.invNeedsAppraisal(ref(C), C.jobs[0]), true, 'advised: on the appraisal list by the one rule');
    eq(C._invGuardrailItems(7).map((r) => r.stableId), ['s1'], '…on the guardrail');
    has(textOf(C._renderAppraisalGuardrail(C.jobs[0])), 'Agent Two advised it: Signed and the comparables disagree widely', '…with its words');
    has(C._renderAppraisalGuardrail(C.jobs[0]), '>Add to appraisal list</button>', '…and the press');
    ref(C).valReviewed = true; ref(C).reviewed = true;
    eq(C.invNeedsAppraisal(ref(C), C.jobs[0]), true, '⚠⚠ the row\'s tick never drops it');
    has(textOf(C.printAppraisalWorklist(7, { asHtml: true }).html), 'Bronze figure of a dancer · advised by Agent Two, not yet decided', '⚠⚠ the worklist carries it, marked as advised');
    eq(C.agentValueAddToAppraisal(7, 's1'), true, 'Add to appraisal list');
    eq([ref(C).needsAppr, ref(C).needsApprBy], [true, 'Ashley Jerome'], '…a person\'s decision, with who');
    eq(C.agentValueAdvised(ref(C), C.jobs[0]), false, '…and no longer only advised');
    lacks(textOf(C.printAppraisalWorklist(7, { asHtml: true }).html), 'advised by Agent Two', '…the worklist then lists it as flagged');
    C.waiveAppraisal(7, 's1');
    eq(C._invGuardrailItems(7).length, 0, 'a waiver takes it off the guardrail');
  }

  group('⚠⚠ V2 · on a client\'s own home the advice counts under To a specialist until decided, with Send to a specialist');
  {
    const C = rig(LIVING(), [AGENT({ valNotices: [{ kind: 'specialist', text: 'It should sell through a specialist auction house.' }] })]);
    eq(C.invNeedsAppraisal(ref(C), C.jobs[0]), false, 'the rule stays the tick on living work');
    eq(C.agentValueAdvised(ref(C), C.jobs[0]), true, '…the advice stands, undecided');
    // Below the specialist figure (its range tops at $2,400), so only the advice holds it: as an appraisal, never as a note a tick answers.
    eq(C.invLineHold(ref(C), C.invAcceptCtx(C.jobs[0])), 'appraisal', '⚠ the line keeps its tick for the advice');
    const chip = C.invWorkFlags(C.jobs[0]).filter((f) => f.key === 'appr')[0];
    eq([chip.label, chip.test(ref(C), C.jobs[0])], ['To a specialist', true], '⚠⚠ counted under To a specialist');
    eq(C._invGuardrailItems(7).length, 1, '…and on the guardrail');
    has(C._renderAppraisalGuardrail(C.jobs[0]), '>Send to a specialist</button>', 'the living press');
    has(C._avPanelHtml(C.jobs[0], ref(C)), '>Send to a specialist</button>', '…in the line\'s record');
    has(C._avNoticesHtml(C.jobs[0], C._photoRefs[7]), '>Send to a specialist</button>', '…and on the notes above the rows');
    eq(C.agentValueAddToAppraisal(7, 's1'), true, 'pressed');
    eq([ref(C).needsAppr, C.invNeedsAppraisal(ref(C), C.jobs[0]), chip.test(ref(C), C.jobs[0])], [true, true, true], '…going to a specialist, by the tick it writes');
    // The app's own worth-a-specialist off the range, until decided (a tick took it off).
    const W = rig(LIVING(), [AGENT({ valHigh: 4500, valNotices: [] })]);
    W._photoRefs[7][0].valReviewed = true;
    ok(W._avRowBadges(W.jobs[0], ref(W)).join('').indexOf('worth a specialist') >= 0, '⚠ a reviewed line keeps "worth a specialist" until somebody decides it');
    W.waiveAppraisal(7, 's1');
    ok(W._avRowBadges(W.jobs[0], ref(W)).join('').indexOf('worth a specialist') < 0, '…and a waiver decides it');
  }

  // ═══════════════════════════════ W · THE WORKLIST BY APPRAISER ═══════════════════════════════
  group('⚠⚠ W1 · the worklist groups by the appraiser each line is linked to, then by specialist (VAL-11)');
  {
    const rows = [AGENT({ apprId: 501, apprDoc: 'Carla Mendes' }), LINE({ stableId: 's2', itemNo: 7, objectName: 'Diamond brooch', category: 'Jewelry & Watches', fmv: '' })];
    const C = rig(ESTATE({ appraisers: [CARLA] }), rows);
    const gl = C._apprGroupList(7);
    eq(gl.map((x) => [x.label, x.refs.map((r) => r.stableId)]), [['Carla Mendes · Mendes Fine Art (ISA)', ['s1']], ['Jewelry & Watch Appraiser', ['s2']]],
      '⚠⚠ the $1,600 bronze linked to Carla is in her group, not flagged by any rule; the brooch under its specialist');
    eq(gl[0].apprId, 501, 'her group knows whose it is');
    const t = textOf(C.printAppraisalWorklist(7, { asHtml: true }).html);
    has(t, 'Carla Mendes · Mendes Fine Art (ISA) · appraiser engaged (1)', 'the worklist heads her group');
    const one = textOf(C.printAppraisalWorklist(7, { asHtml: true, apprId: 501 }).html);
    has(one, 'Bronze figure of a dancer', 'her own packet carries her line');
    lacks(one, 'Diamond brooch', '…and nothing else');
    lacks(one, '§20.2031-6(b)', '…nor the estate\'s other business');
  }

  group('⚠⚠ W2 · Send worklist: a draft to the appraiser with their packet, recorded as drafted');
  {
    const C = rig(ESTATE({ appraisers: [Object.assign({}, CARLA)] }), [AGENT({ apprId: 501, apprDoc: 'Carla Mendes' })]);
    has(C._renderAppraiserRoster(C.jobs[0]), '>Send worklist (1)</button>', 'the roster row offers it, with the count');
    eq(C.sendAppraisalWorklist(7, 501), true, 'pressed');
    const d = JSON.parse(C.drafts[0]);
    eq([d.to, d.cc], ['carla@mendesart.com', 'agreements@havellinpalmbeach.com'], 'to her, agreements@ copied');
    eq(d.subject, 'Havellin Palm Beach — Appraisal Worklist for 412 Seaview Ave', 'under the property\'s street');
    has(d.text, 'the 1 item we have asked you to appraise', 'its words count what is in it');
    has(d.text, 'Please value each as of Apr 2, 2026, the date of death.', '…and the date to value it as of');
    eq(d.att.length, 1, 'the PDF attached');
    eq([C.jobs[0].appraisers[0].worklist.n, C.jobs[0].appraisers[0].worklist.provider], [1, 'gmail'], 'recorded as drafted, never as sent');
    const E = rig(ESTATE({ appraisers: [Object.assign({}, CARLA)] }), [LINE()]);
    eq(E._renderAppraiserRoster(E.jobs[0]).indexOf('Send worklist') < 0, true, 'nothing linked to her: no Send worklist');
    E.sendAppraisalWorklist(7, 501);
    has(E.notices[0][1], 'Nothing linked to Carla Mendes is still waiting on an appraisal', '…and the handler says so');
    eq(E.drafts.length, 0, '…drafting nothing');
  }

  // ═══════════════════════════════ X · WAIVE ═══════════════════════════════
  group('⚠⚠ X1 · Waive records who and when, prints, and can be undone (VAL-16)');
  {
    const C = rig(ESTATE(), [LINE({ category: 'Jewelry & Watches', objectName: 'Pearl necklace', fmv: 3500, valuedBy: 'desk' })]);
    C.waiveAppraisal(7, 's1');
    const r = ref(C);
    eq([r.apprWaived, r.apprWaivedBy, r.apprWaiveReason, r.apprWaiveLog.length], [true, 'Ashley Jerome', 'The family is keeping it', 1], 'who, why, and the act on the log');
    ok(!!r.apprWaivedAt, '…and when');
    has(C.invApprWaiverText(r), 'Waived by Ashley Jerome on ', 'one sentence for it');
    has(textOf(C.printCourtInventory(7, { asHtml: true }).html), 'Appraisals waived. #40 Pearl necklace, flagged for appraisal: waived by Ashley Jerome on', '⚠⚠ the Court Inventory names the waiver');
    has(textOf(C.printEstateInventoryReport(7, { asHtml: true }).html), 'Waived by Ashley Jerome on', 'the Estate Inventory Report\'s flag list too');
    has(C._invPanelAppraisalHtml(C.jobs[0], r), '>Undo waiver</button>', 'the line\'s record offers Undo waiver');
    eq(C.undoWaiveAppraisal(7, 's1'), true, 'undone (asked first)');
    has(C.said[C.said.length - 1], 'Undo the waiver on #40 Pearl necklace?', '…asked first');
    eq([ref(C).apprWaived, ref(C).apprWaiveLog.map((e) => e.act)], [false, ['waived', 'undone']], 'the waiver stays on its record as undone');
    eq(C._invGuardrailItems(7).length, 1, 'and the line is back on the guardrail');
  }

  // ═══════════════════════════════ O · OVERDUE ═══════════════════════════════
  group('⚠⚠ O1 · an overdue report on the Values bar; the flag list never a stale "Expected back" (VAL-21)');
  {
    const C = rig(ESTATE({ appraisers: [CARLA] }), [AGENT({ apprId: 501, apprDoc: 'Carla Mendes', category: 'Art & Décor', fmv: 3500, valHigh: 4000 })]);
    eq(C.apprReportOverdue(C.jobs[0], CARLA, '2026-10-28').days, 8, 'due Oct 20, a line still waiting, today Oct 28: 8 days overdue');
    eq(C.apprReportOverdue(C.jobs[0], CARLA, '2026-10-20'), null, 'not on the day itself');
    has(C.deskFoldState(7, C.jobs[0], 'values', C._photoRefs[7], '2026-10-28').bits.map((b) => b.text + '/' + b.tone).join(' | '),
      'Carla Mendes: report due Oct 20, 2026 (8 days overdue)/amber', '⚠⚠ the Values bar says it, in amber');
    has(textOf(C.printEstateInventoryReport(7, { asHtml: true }).html), 'Oct 20, 2026 (8 days overdue)', 'the flag list says the report is overdue');
    const A = rig(ESTATE({ appraisers: [CARLA], signedRecords: [{ id: 'sr1', kind: 'appraisal_report', ref: '501', stableIds: ['s1'], filedAt: new Date(2026, 9, 24, 12).getTime() }] }),
      [AGENT({ apprId: 501, apprDoc: 'Carla Mendes', fmv: 3800, valSource: 'Appraisal', valuedBy: 'appraiser', valHigh: '' })]);
    eq(A.apprReportOverdue(A.jobs[0], CARLA, '2026-10-28'), null, 'appraised: nothing overdue');
    const ft = textOf(A.printEstateInventoryReport(7, { asHtml: true }).html);
    has(ft, 'report filed Oct 24, 2026', '⚠ an appraised line says its report was filed');
    lacks(ft, 'Oct 20, 2026', '…never the due date it came back against');
  }

  // ═══════════════════════════════ C · APPRAISAL IN PROGRESS ═══════════════════════════════
  group('⚠⚠ C1 · an appraisal in progress said on the request and the sign-out (VAL-11)');
  {
    const C = rig(ESTATE({ appraisers: [CARLA] }), [AGENT({ apprId: 501, apprDoc: 'Carla Mendes', disposition: 'Auction', channel: 'Kodner Galleries' }),
      LINE({ stableId: 's2', itemNo: 7, objectName: 'Diamond brooch', category: 'Jewelry & Watches', fmv: '', apprId: 501, apprDoc: 'Carla Mendes', disposition: 'Auction', channel: 'Kodner Galleries' })]);
    eq(C.invReleaseCautions(ref(C), 7).map((c) => c.key), ['apprInProgress'], '⚠⚠ the bronze linked to Carla, no rule flagging it: APPRAISAL IN PROGRESS');
    has(C._invCautionBadges(ref(C), 7), 'APPRAISAL IN PROGRESS WITH CARLA MENDES · MENDES FINE ART (ISA)', '…naming her');
    eq(C.invReleaseCautions(ref(C, 's2'), 7).map((c) => c.key), ['needsAppraisal'], 'the brooch the rules flag: NOT YET APPRAISED, never both');
    has(C._invCautionBadges(ref(C, 's2'), 7), 'NOT YET APPRAISED · APPRAISAL IN PROGRESS WITH CARLA MENDES', '…its badge naming the appraisal in progress');
    const sheet = C.signoutSheetHtml(C.jobs[0], { kind: 'pickup', taker: 'Kodner Galleries' }, [ref(C)], null);
    has(sheet, 'APPRAISAL IN PROGRESS WITH CARLA MENDES', '⚠⚠ the sign-out sheet Kodner signs says it');
    const out = C.signoutSheetHtml(C.jobs[0], { kind: 'appraisal_out', taker: 'Carla Mendes' }, [ref(C)], null);
    lacks(out, 'APPRAISAL IN PROGRESS', '…the appraiser\'s own hand-off does not');
    const L = rig(LIVING({ appraisers: [CARLA] }), [AGENT({ apprId: 501, apprDoc: 'Carla Mendes', disposition: 'Sell', channel: 'Kodner Galleries' })]);
    eq(L.invReleaseCautions(ref(L), 7).map((c) => c.key), ['apprInProgress'], 'on a client\'s own home too');
  }

  // ═══════════════════════════════ K · ASK 14 ═══════════════════════════════
  group('⚠⚠ K1 · a WorthPoint sale far from the line\'s figure asks once (Anthony, Ask 14; ACC-04)');
  {
    const dom = (price) => domStub({ 'av-wp-title-s1': { value: 'Bronze dancer, signed' }, 'av-wp-price-s1': { value: String(price) }, 'av-wp-url-s1': { value: 'https://www.worthpoint.com/worthopedia/1' },
      'av-wp-date-s1': { value: '2026-03-02' }, 'av-wp-venue-s1': { value: 'WorthPoint' } });
    const base = () => AGENT({ fmv: 4200, valLow: 3000, valHigh: 5500, reviewed: false, namedBy: 'agent' });
    const keep = rig(ESTATE(), [base()], { answer: false, dom: dom(1100) });
    eq(keep.agentValueUseSale(7, 's1'), 'filed', 'Cancel: filed only');
    has(keep.said[0], 'The WorthPoint sale is $1,100 and #40 Bronze figure of a dancer is valued at $4,200: 74% apart.', '⚠⚠ asked once, both figures named');
    const k = ref(keep);
    eq([k.fmv, k.valSource, k.valuedBy, !!k.valReviewed, !!k.reviewed], [4200, 'Auction comps', 'agent', false, false], '⚠⚠ filed only: the figure, its source, its owner and its review untouched');
    eq([k.valComps[0].price, k.valComps[0].by], [1100, 'desk'], '…the sale first among the comparables');
    const use = rig(ESTATE(), [base()], { answer: true, dom: dom(1100) });
    eq(use.agentValueUseSale(7, 's1'), 'used', 'OK: the sale is used');
    const u = ref(use);
    eq([u.fmv, u.valuedBy, u.valSource, u.valNote], [1100, 'desk', 'WorthPoint comps', 'WorthPoint sale, 2026-03-02: $1,100.'], '⚠⚠ the sale is the figure, the desk\'s, its basis the sale');
    eq(u.valHigh, undefined, '…the agent\'s range off');
    ok(!!u.reviewed, '…and the line reviewed: a sale a person pasted is their look');
    const near = rig(ESTATE(), [base()], { dom: dom(3900) });
    near.agentValueUseSale(7, 's1');
    eq([near.said.length, ref(near).fmv, ref(near).valSource], [0, 4200, 'WorthPoint comps'], 'within 15%: no question, the sale supports the figure as before');
  }

  // ═══════════════════════════════ R · THE READERS COUNTED ═══════════════════════════════
  group('R1 · one rule each, read where it applies');
  {
    const body = (n) => code(fn(n));
    ['_renderValueSettings', 'deskFoldState', '_invLineHolds', 'agentRevalue'].forEach(() => {});
    has(body('_invLineHolds'), "invValueStandardMoved(ref, job) && held('standard')", 'the hold reads the standard');
    has(body('invNeedsAppraisal'), 'agentValueAdvice(ref, job)', 'the appraisal rule reads the advice');
    has(body('_apprGroupList'), 'invAppraisalInProgress(r, jobId)', 'the worklist reads the link');
    eq((SRC.match(/job\.avd \? 'the alternate valuation date'/g) || []).length, 0, '⚠ no paper carries its own copy of the date\'s words any more');
    has(body('_avWrite'), 'ref.valBasis = resolveValBasis(job)', 'the writer records the basis');
  }
};
