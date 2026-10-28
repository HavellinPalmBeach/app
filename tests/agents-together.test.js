'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// THE AGENTS IN CONCERT, ONE LOOK PER LINE, EACH × QTY (2026-10-25b), on top of 2026-10-25's (agent-named-twice.test.js:
// Agent Two confirming or correcting Agent One's name as it values, the notes cut to what a person must do).
//
// Anthony, 2026-10-24 and -25: *"we are supposed to be making this easy, with one review. not a multi tiered review. let's have
// the agents working together to get the best view of what an item is and what it is worth"*; *"I want the two agents working in
// concert to get the best possible information first. And then … the transition concierge is going to go back and go through
// every item on the list … I don't want them conflicting with each other and sending up a bunch of flags that need to be
// cleared"*; *"just figure out the best way for the agents to work together and to most accurately identify, describe, name, and
// price or value each item and minimize the work for the transition concierge"*. And the wooden mirror: *"something that gets
// valued at $25 as a wooden mirror, is really a restoration hardware mirror … how can we update that simply by me changing the
// name and re-running the valuation?"*; the plates: *"the total value needs to be multiplied by the number in the group … both
// should be editable and the math should happen automatically"*; the brand: *"Type it in the name"*.
//
//   B · the backend: a person's name marked and given back, a brand priced as that brand, the line valued at its Quantity,
//       a brand the crew says put into Agent One's name, the version.
//   A · the app: one rule for who has the name; Agent Two researching a line Agent One was unsure of; the chain; a name changed
//       valued again; the one look (no Accept, Not reviewed); the one hint (unsure); the same-name duplicates on Agent One's
//       reading; Each × Qty = Total, driven through the row's own edit.
// ─────────────────────────────────────────────────────────────────────────────

const vm = require('vm');
const fs = require('fs');
const path = require('path');
const { sandbox, source, fn, decl, matchBrace, domStub } = require('./harness');

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
  const ctx = { JSON, Math, Number, String, Object, Array, Error, parseInt, parseFloat, isFinite };
  vm.createContext(ctx);
  vm.runInContext(['AGENT_VALUE_SOURCES', 'AGENT_VALUE_NOTICE_KINDS', 'AGENT_VALUE_CONF_DOWN', 'AGENT_VALUE_MAX_COMPS', 'AGENT_VALUE_RESULTS_SEGMENTS', 'AGENT_VALUE_RESULTS_PARAMS', 'AGENT_VALUE_NO_PRICE_RE', 'AGENT_VALUE_TEXT_MAX', 'AGENT_VALUE_ABBREV_RE', 'BACKEND_VERSION', 'AGENT_VALUE_SURVEY_MIN', 'AGENT_VALUE_ITEM_PATHS', 'AGENT_VALUE_ASKING_HOSTS', 'AGENT_VALUE_COUNT_WORDS', 'AGENT_VALUE_SALE_NOUN', 'AGENT_VALUE_NUM_WORDS'].map(gsVar)
    .concat(['_avCents', '_avTool', '_avSystem', '_avLineText', '_avLineResult', '_avUrlKey', '_avResultsPage', '_avClip', '_avSurvey', '_avHostOf', '_avListedHost', '_avAskingHost', '_avSalesNamed', '_avKeptBasis'].map(gsFn)).join('\n'), ctx);
  return ctx;
}

// ─── THE REAL APP SIDE ───────────────────────────────────────────────────────
const AV_FNS = ['invHavellinRecipient', 'invAwaitingAppraisal', 'invBequestElsewhere', 'invReleaseCautions', '_invPhotoNoteOpen', 'invLineOpen', '_gate706', 'maivFilingApplies', 'invLotSplitState', 'agentValueMode', 'agentValueInternal', '_avHasFigure', 'agentValueableRefs', 'agentValueUnreviewed',
  'agentValueStale', 'agentValueSpecialistWorth', '_avValDate', '_avContext', '_avItemPayload', '_avComp', '_avWrite', '_avRename', '_avNameIsAgents', 'agentValueGradesCondition', '_invCondIsAgents', '_invAgentCondition', 'agentValueWhole',
  '_avNoteFailure', 'agentValueApply', '_avTakeValue', '_avStampReviewed', '_invStampBy', 'deviceUser', '_avStart',
  '_avSendNext', '_avFinish', '_avRepaint', '_avStateHtml', '_avState', 'agentValueAuto', 'agentValueAfterRename', 'agentValueUseSale',
  'agentValueNotices', '_avNoticesHtml', '_avNoticeKinds', '_avNoticeLabel', '_deskShowBtnHtml', '_avSummary', '_avRowBadges', '_avPanelHtml',
  'invLineReviewed', '_invStampLineReviewed', '_invSetReviewed', 'invLineUnsure',
  'agentDuplicateGroups', '_agDupEligible', '_arDupEligible', 'agentNamedTwice',
  'invLineQty', 'invUnitValue', '_invQtyCarriesValue', '_invPaintFigures', '_invEachInput', '_invInputStyle', '_invCtrlMinW',
  'invValBasisWord', 'invAppraised', 'invLineAppraiser', '_invLinkedAppraiser', '_jobAppraisers', '_apprLabel', '_invHasAppraisal', '_invAppraisalDate',
  '_getPhotoRef', '_setPhotoRef', '_jobInvRefs', '_invHasValue', 'roundCents', 'invIsIntrinsic', 'invCatMeta',
  'invFiduciaryMode', 'isDecedentJob', 'docTierProduces', 'docTierOf', 'docTierDef', 'svcHasDocStep', 'estateValueDate',
  '_avdDate', '_ymdLocal', 'resolveValBasis', '_agNameKey', '_agDetailRefs', 'invLineCloseUps', '_invFileId', 'invAppraisalThreshold',
  'gateDispute', '_gateYes', 'invNeedsAppraisal', 'fmt', '_invMoney', '_invNamed', '_invItemNo', '_andJoin',
  'moneyToNumber', '_readAppsScriptJson', '_invJob', '_invRenderWhenIdle', '_invHasPhoto', 'invIsFirearm', 'invLineAccepted', 'invLineHold', '_invLineHolds', 'invLineAcceptedOnly', 'invIsMAIV', 'invMAIVDefaultCat', 'agentValueLooks', '_avPhotoContext', '_invPhotoSource', '_invRoomName', 'agentListedOff', 'agentValueAgain', '_avSurveyOf', '_withDeviceKey', 'deviceKey'];
const AV_VARS = ['INV_LOT_ARTICLE_CAP', 'INV_RELEASE_CAUTIONS', 'INV_ACCEPT_AMMO_RE', '_agDupSetJob', 'INV_OPEN_HOLDS', '_avRun', '_avForceComps', '_avAfter', 'AGENT_VALUE_BATCH', 'AGENT_VALUE_GENERAL_CEILING', 'AGENT_VALUE_WHOLE_FROM', 'AGENT_VALUE_MAX_COMPS', 'AGENT_CONDITIONS',
  'AGENT_VALUE_MARK_RE', 'AGENT_VALUE_NO_MARK_RE', 'AGENT_VALUE_CONFS', 'AGENT_VALUE_SOURCES', 'AGENT_VALUE_OWN', 'AGENT_VALUE_SALE_DATE_RE',
  'INV_TAXONOMY', 'INV_APPRAISAL_THRESHOLD', 'INV_APPRAISAL_THRESHOLD_DISPUTED', 'DECEDENT_SERVICES', 'DOC_TIERS',
  'DOC_TIER_FROM_SCOPE', 'JOB_STEPS', 'AGENT_MAX_DETAILS', 'INV_VAL_SOURCES', '_agDupSet', 'AGENT_ROOM_CONF_RANK', 'AGENT_PASS_GAP_MS', 'MAIV_OTHER', 'MAIV_BY_CATEGORY', 'AGENT_VALUE_READ_RE', 'AGENT_VALUE_HEDGE_RE', 'AGENT_LISTED_MAX', '_avAutoAgain', 'INV_CATEGORIES'];

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
const MAJOLICA = 'Hand-painted majolica dinner plates, likely Italian';
const PAJARO = 'Hand-painted tin-glazed plates, yellow bird pattern, likely Spanish, Puente del Arzobispo type';
const ROW = (over) => Object.assign({ stableId: 's1', label: 'inventory', roomIdx: 2, objectName: MAJOLICA, namedBy: 'agent', agentConf: 'medium',
  category: 'General/Household', qty: 1, condition: 'Good', driveFileId: 'FID', ts: 1, disposition: 'Donate' }, over || {});
// A line both agents were sure of, valued by Agent Two under Agent One's name.
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
      _todayStr: () => '2026-10-25',
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
const attempt = (f) => { try { return { ok: true, val: f() }; } catch (e) { return { ok: false, err: String(e && e.message || e) }; } };

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();
  const live = liveLines(src);

  // ═══════════════════════════════ THE BACKEND ═══════════════════════════════
  group('⚠⚠ B1 · a person\'s name is marked to Agent Two, given back as it was and valued as named');
  {
    const g = gsCtx();
    has(g._avLineText('L1', { name: 'Restoration Hardware wall mirror', nameChecked: true }), ' | Name checked by a person', 'a name a person checked: marked');
    lacks(g._avLineText('L1', { name: 'Wooden wall mirror', nameChecked: false }), 'Name checked', 'the agents\' name: not marked');
    const sys = g._avSystem({ estate: true, basis: 'Fair Market Value', valuationDate: '2026-06-14' });
    has(sys, 'A line marked "Name checked by a person" was named or checked by someone who saw the thing itself: give that name back exactly as given and value the line as that', '⚠ THE NAME says how to treat it');
    has(sys, '- Never rename a line whose name a person checked: give its name back as it was.', 'and WHAT YOU MUST NEVER DO says it again');
    has(g._avTool('comps').input_schema.properties.values.items.properties.name.description, 'always the name given on a line whose name a person checked', 'the tool\'s own words for name too');
    has(sys, 'Give every line\'s name back in name, as you value it', '2026-10-25\'s rule stands: every line\'s name comes back');
  }

  group('B2 · a brand is priced as that brand; the line is valued at its Quantity, which the desk divides for Each');
  {
    const g = gsCtx();
    const sys = g._avSystem({ estate: false });
    has(sys, 'A maker or brand in the name is part of what the lot is: price that brand ("Henckels kitchen shears"), never the generic kind.', 'the brand');
    has(sys, 'so a stack of eight plates is valued as eight plates, never as one.', 'the Quantity, and the desk\'s Each');
    has(sys, 'never question the count from the photograph', '2026-10-25\'s count rule stands beside it');
    ['$500', 'threshold'].forEach((w) => lacks(sys, w, 'still no threshold in the prompt: ' + w));
  }

  group('B3 · Agent One puts a brand the crew says into the name');
  {
    const body = gsFn('_agSystem');
    has(body, 'When the crew\\\'s note names the maker or brand ("Crate & Barrel coffee table"), put it in the name as ', 'the rule');
    has(gsFn('_agUserContent'), 'The crew said:', 'and the crew\'s note reaches Agent One with the photograph');
  }

  group('B4 · the deployment: at least 2026-10-25b, the app relies on it, and the banner names its gap by vintage');
  {
    // Restated to the rule (2026-10-26, as agent-named-twice H was): at least this build, its gap named by its vintage.
    ok(gsCtx().BACKEND_VERSION >= '2026-10-25b', 'main-sync.gs is 2026-10-25b or later');
    const app = sandbox({ vars: ['BACKEND_MIN_VERSION', 'BACKEND_FEATURE_COST'] });
    ok(app.BACKEND_MIN_VERSION >= '2026-10-25b', 'and the app relies on it');
    has(app.BACKEND_FEATURE_COST.version, 'on a deployment older than 2026-10-25b, a name you type or review on the desk', 'the banner names this build\'s gap by its vintage');
    has(app.BACKEND_FEATURE_COST.version, 'on a deployment older than 2026-10-25, Agent Two flags a name it disagrees with', 'and 2026-10-25\'s after it, by its vintage');
  }

  // ═══════════════════════════════ THE APP ═══════════════════════════════════
  group('⚠⚠ A1 · who has the name is one rule, read by the rename and by the request');
  {
    const R = rig(ESTATE(), [ROW({ stableId: 'a' }), ROW({ stableId: 'b', namedBy: 'desk' }), ROW({ stableId: 'c', reviewed: true }),
      ROW({ stableId: 'd', namedBy: undefined, collId: 'c1' })]);
    eq(['a', 'b', 'c', 'd'].map((id) => R.ctx._avNameIsAgents(R.ctx._getPhotoRef(7, id))), [true, false, false, false],
      'Agent One\'s unreviewed name is the agents\'; typed, ticked or a walkthrough collection\'s is a person\'s');
    eq(['a', 'b', 'c', 'd'].map((id) => R.ctx._avItemPayload(7, R.ctx._getPhotoRef(7, id)).nameChecked), [false, true, true, true],
      '⚠ the request marks every person\'s name');
    has(liveLines(fn('_avRename')), '!_avNameIsAgents(ref)', 'the rename asks the same rule');
    // Driven: Agent Two's corrected name lands on the agents' name only.
    ['a', 'b', 'c', 'd'].forEach((id) => R.ctx._avWrite(7, id, RES({ name: PAJARO }), ESTATE(), {}));
    eq(['a', 'b', 'c', 'd'].map((id) => R.ctx._getPhotoRef(7, id).objectName), [PAJARO, MAJOLICA, MAJOLICA, MAJOLICA], 'renamed only where the agents had the name');
    eq(R.ctx._getPhotoRef(7, 'a').valNameFrom, MAJOLICA, 'Agent One\'s reading kept on the line');
  }

  group('⚠⚠ A2 · where Agent One was unsure what a thing is, Agent Two looks at the photograph and researches it');
  {
    const R = rig(ESTATE(), []);
    eq(R.ctx.agentValueMode(ROW({ agentConf: 'low' })), 'comps', '⚠ an unsure name: researched, with its photograph and close-ups');
    eq(R.ctx.agentValueMode(ROW({ agentConf: 'medium' })), 'general', 'a sure everyday name: an ordinary lot, as before');
    eq(R.ctx.agentValueMode(ROW({ agentConf: 'low', namedBy: 'desk' })), 'general', 'a name a person typed is not Agent One\'s guess any more');
    eq(R.ctx.agentValueMode(ROW({ agentConf: 'low', reviewed: true })), 'general', 'nor one a person ticked');
    const R2 = rig(ESTATE(), [ROW({ agentConf: 'low' })]);
    const p = R2.ctx._avItemPayload(7, R2.ctx._getPhotoRef(7, 's1'));
    eq([p.mode, p.fileId], ['comps', 'FID'], 'and the request carries the photograph');
  }

  group('⚠⚠ A3 · the agents work in a line: Agent One, the room check, then Agent Two, with nothing pressed or asked');
  {
    const lines = [ROW({ stableId: 'a' }), ROW({ stableId: 'b', fmv: 40, valuedBy: 'desk' }), ROW({ stableId: 'c', objectName: '' })];
    const chain = (roomStarts, error) => {
      const seen = [];
      const R = rig(ESTATE(), lines, { confirm: false, fns: ['_agFinish', '_arFinish', 'agentValueAuto', '_invRenderWhenIdle', '_invHasPhoto'], stubs: {
        _agState: () => ({ running: true, error: error || '' }), _arState: () => ({ running: false }),
        agentRoomCheckRun: (j, o) => { seen.push(o && o.auto); return roomStarts; } } });
      return { R, seen };
    };
    let c = chain(false);
    c.R.ctx._agFinish(7);
    eq(c.seen, [true], 'the room check is asked first, by itself');
    eq(c.R.posts.map((p) => p.action), ['agentValue'], '⚠ with no room to check, Agent Two runs at once…');
    eq(((c.R.posts[0] || {}).items || []).map((i) => i.stableId), ['a'], '…on the named lines with no figure (never a desk figure, never an unnamed shot)');
    eq(c.R.alerts, [], 'nothing asked, nothing alerted (the confirm says no and it runs all the same)');
    c = chain(true);
    c.R.ctx._agFinish(7);
    eq(c.R.posts.length, 0, 'a room check started: Agent Two waits for its tail');
    c.R.ctx._arFinish(7);
    eq(c.R.posts.map((p) => p.action), ['agentValue'], '⚠ and starts there');
    c = chain(false, 'the naming service could not be reached');
    c.R.ctx._agFinish(7);
    eq([c.seen.length, c.R.posts.length], [0, 0], 'a naming run that failed outright starts neither');
    const N = rig(ESTATE(), [ROW({ fmv: 40, valuedBy: 'desk' })]);
    eq([N.ctx.agentValueAuto(7), N.posts.length, N.alerts.length], [false, 0, 0], 'nothing to value: nothing sent, nothing said');
    const U = rig(ESTATE(), [ROW()], { stubs: { SHEETS_SYNC_URL: '' } });
    eq([U.ctx.agentValueAuto(7), U.alerts.length], [false, 0], 'no Apps Script URL: silent');
  }

  group('⚠⚠ A4 · a name a person changes is valued again by itself, researched, as named (the wooden mirror that is Restoration Hardware)');
  {
    const mirror = ROW({ objectName: 'Wooden wall mirror', fmv: 25, valLow: 15, valHigh: 40, valuedBy: 'agent', valConf: 'medium', valSource: 'General estimate', valNameAt: 'Wooden wall mirror', category: 'Furniture' });
    const R = rig(LIVING(), [mirror], { answer: () => ({ ok: true, results: { s1: RES({ name: 'Wooden wall mirror', fmv: 650, low: 450, high: 850, source: 'Online comps' }) }, failed: {} }) });
    const r = R.ctx._getPhotoRef(7, 's1');
    r.objectName = 'Restoration Hardware Strie wall mirror'; r.namedBy = 'desk';
    ok(R.ctx.agentValueAfterRename(7, 's1'), 'sent');
    eq(R.posts.length, 1, 'one request, at once');
    eq([R.posts[0].items[0].mode, R.posts[0].items[0].nameChecked], ['comps', true], '⚠ researched against sold comparables, the name typed marked as the person\'s');
    eq(R.ctx._getPhotoRef(7, 's1').fmv, 650, '⚠ the figure made for the wooden mirror is replaced');
    eq(R.ctx._getPhotoRef(7, 's1').objectName, 'Restoration Hardware Strie wall mirror', '⚠⚠ and the name typed stands, even where an answer hands back the generic one');
    const P = rig(LIVING(), [ROW({ fmv: 300, valuedBy: 'desk', namedBy: 'desk' })]);
    eq([P.ctx.agentValueAfterRename(7, 's1'), P.posts.length], [false, 0], 'a person\'s figure: nothing sent');
    const Q = rig(LIVING(), [SURE()]);
    eq([Q.ctx.agentValueAfterRename(7, 's1'), Q.posts.length], [false, 0], 'a figure made for the name it carries: nothing sent');
    const B = rig(LIVING(), [ROW({ objectName: '' })]);
    eq([B.ctx.agentValueAfterRename(7, 's1'), B.posts.length], [false, 0], 'no name: nothing sent');
    const F = rig(LIVING(), [ROW({ namedBy: 'desk', objectName: 'Le Creuset Dutch oven' })]);
    eq([F.ctx.agentValueAfterRename(7, 's1'), F.posts.length], [true, 1], 'a name typed on a line with no figure: valued');
    const W = rig(LIVING(), [Object.assign({}, mirror, { objectName: 'Restoration Hardware mirror', namedBy: 'desk' })]);
    W.ctx._avState(7).running = true;
    eq([W.ctx.agentValueAfterRename(7, 's1'), W.posts.length], [true, 0], 'a run already out: queued, nothing sent yet');
    W.ctx._avFinish(7);
    eq(W.posts.map((p) => p.items.map((i) => i.stableId)), [['s1']], '⚠ and sent at the run\'s tail');
    const body = liveLines(fn('_invEdit'));
    eq((body.match(/agentValueAfterRename\(jobId, stableId\)/g) || []).length, 1, 'the row\'s name edit calls it, once');
    has(body, "if (key === 'objectName') agentValueAfterRename(jobId, stableId);", 'on the name alone');
  }

  group('⚠⚠ A5 · one look per line: the tick covers name, count and value; no Accept anywhere; Not reviewed counts what is left');
  {
    const R = rig(ESTATE(), [SURE({ fmv: 640 })]);
    R.ctx._invSetReviewed(7, 's1', true);
    let r = R.ctx._getPhotoRef(7, 's1');
    eq([r.reviewed, r.valReviewed, r.reviewedBy, r.valReviewedBy], [true, true, 'Ashley Jerome', 'Ashley Jerome'], '⚠ one stamp, one name, the line and its figure');
    eq(R.ctx.invLineReviewed(r), true, 'reviewed');
    R.ctx._avWrite(7, 's1', RES({ fmv: 700, high: 900 }), ESTATE(), { revalue: true });
    eq(R.ctx.invLineReviewed(R.ctx._getPhotoRef(7, 's1')), false, '⚠ a new figure after the look brings the line back');
    R.ctx._invSetReviewed(7, 's1', true);
    R.ctx._invSetReviewed(7, 's1', false);
    r = R.ctx._getPhotoRef(7, 's1');
    eq([r.reviewed, r.valReviewed], [false, undefined], 'unticked: both gone');
    eq(R.ctx.invLineReviewed({ namedBy: 'desk', objectName: 'Lamp', disposition: 'Donate', valuedBy: 'agent', fmv: 150, valHigh: 180 }), false,
      'a line named and decided on the desk is reviewed only while no unseen agent figure is on it');
    eq(R.ctx.invLineReviewed({ namedBy: 'desk', objectName: 'Lamp', disposition: 'Donate' }), true, '…and is, without one');
    has(liveLines(fn('_invBulkApply')), '_invStampLineReviewed(ref, job);', 'Mark reviewed stamps the same one look');
    lacks(liveLines(fn('_invBulkApply')), "'valReviewed'", 'and Accept values\' key is gone from the bulk handler');
    has(liveLines(fn('agentValueUseSale')), '_invStampLineReviewed(ref, job);', 'a sale pasted is the person\'s look at the line');
    ['agentValueAccept', '>Accept value<', 'Accept values</button>', '_avAcceptButtonHtml', "'unrevval'"].forEach((w) => lacks(live, w, '⚠ no second tier: ' + w));
    const F = sandbox({ vars: ['INV_WORK_FLAGS', 'MAIV_OTHER', 'MAIV_BY_CATEGORY', '_agDupSetJob', 'INV_OPEN_HOLDS', 'INV_ACCEPT_AMMO_RE'], fns: ['invLineReviewed', 'invLineOpen', 'agentValueUnreviewed', '_avHasFigure', '_invHasValue', 'invLineAccepted', 'invLineHold', '_invLineHolds', 'invLineAcceptedOnly', '_invAcceptCtxOf', '_arDupEligible', 'invAcceptCtx', '_invListReadHtml', 'invListRead'] }).INV_WORK_FLAGS;
    eq([F[1].key, F[1].label], ['unreviewed', 'Not reviewed'], 'Not reviewed sits beside Unnamed shots');
    eq([F[1].test(SURE()), F[1].test(SURE({ reviewed: true, valReviewed: true }))], [true, false], 'and counts the one rule');
  }

  group('⚠⚠ A6 · the one hint: unsure, only while unreviewed and whoever had the last word was guessing; no agent badges');
  {
    const R = rig(ESTATE(), []);
    const u = (o) => R.ctx.invLineUnsure(SURE(o));
    eq(u({}), false, 'both sure: nothing');
    eq(u({ valConf: 'low' }), true, 'Agent Two unsure of its figure');
    eq(u({ agentConf: 'low', fmv: '', valuedBy: undefined, valNameAt: undefined }), true, 'Agent One unsure of a name still its own, and nobody has valued it');
    eq(u({ agentConf: 'low', valNameAt: 'Plates, likely Italian' }), true, '…or Agent Two valued it under an earlier name');
    eq(u({ agentConf: 'low' }), false, '⚠ Agent Two researched it under this very name, sure: its look settles Agent One\'s guess');
    eq(u({ agentConf: 'low', valNameFrom: 'Plates, likely Italian', valNameAt: MAJOLICA }), false, '⚠ Agent Two renamed it, sure: its word is the last');
    // ⚠ A FIGURE A PERSON RECORDED IS THEIR LOOK AT THE LINE (Q105; the second review, 2026-10-26: the hint asked for a tick
    // over a box already ticked and disabled, and nothing could clear it): typed on the desk, or the appraisal's.
    eq(u({ agentConf: 'low', valuedBy: 'desk' }), false, '⚠ a figure a person typed is their look (Q105): the guess is settled');
    eq(u({ agentConf: 'low', valuedBy: 'appraiser', valSource: 'Appraisal' }), false, '…and so is the appraisal\'s figure');
    eq(u({ agentConf: 'low', valuedBy: 'desk', fmv: '' }), true, '…a figure, not the owner alone: a desk line with no figure is still Agent One\'s guess');
    eq(u({ agentConf: 'low', namedBy: 'desk' }), false, 'a name a person typed');
    eq(u({ valConf: 'low', reviewed: true, valReviewed: true }), false, '⚠ gone with the line\'s one tick');
    eq(R.ctx._avRowBadges(ESTATE(), SURE({ valConf: 'low' })), [], 'no agent value badge');
    const row = liveLines(fn('_renderInvRow'));
    has(row, 'if (invLineUnsure(ref, job)) {', 'the row draws the one hint (with the job, 2026-10-26: never on a figure where counsel values)');
    lacks(row, "'agent &middot; unsure' : 'agent'", 'and no Agent One badge on every named line');
  }

  group('A7 · two photographs Agent One named alike stay joined after Agent Two words its corrections apart');
  {
    const R = rig(ESTATE(), []);
    const a = SURE({ stableId: 'a', valNameFrom: MAJOLICA, objectName: 'Spanish plates, pájaro pattern', driveFileId: 'F1', agentAt: 1 });
    const b = SURE({ stableId: 'b', valNameFrom: MAJOLICA, objectName: 'Talavera-style bird plates', driveFileId: 'F2', agentAt: 9000 });
    const groups = R.ctx.agentDuplicateGroups(7, [a, b]);
    eq(groups.length, 1, '⚠ one group, joined on Agent One\'s own reading');
    has(liveLines(fn('agentDuplicateGroups')), '_agNameKey(r.agentName || r.valNameFrom || r.objectName)', 'keyed there (Agent One\'s own reading first, since the second review)');
  }

  group('⚠⚠ A8 · Each × Qty = Total: one helper each, the count carries Each, a typed Each counts only while it makes the total');
  {
    const R = rig(ESTATE(), []);
    eq([R.ctx.invLineQty({}), R.ctx.invLineQty({ qty: '8' }), R.ctx.invLineQty({ qty: 0 })], [1, 8, 1], 'a line with no count is one');
    eq(R.ctx.invUnitValue({ fmv: 200, qty: '8' }), 25, 'Each read off the total');
    eq(R.ctx.invUnitValue({ fmv: 240, qty: 8, unitVal: 30 }), 30, 'Each typed, while it makes the total');
    eq(R.ctx.invUnitValue({ fmv: 240, qty: 12, unitVal: 30 }), 20, '⚠ a count written elsewhere (a naming, a merge): Each read off the total again');
    ok(isNaN(R.ctx.invUnitValue({ fmv: '', qty: 8, unitVal: 30 })), 'no value: no Each');
    const plates = SURE({ fmv: 25, valLow: 15, valHigh: 40, qty: 1 });
    ok(R.ctx._invQtyCarriesValue(Object.assign(plates, { qty: '8' }), 25, 1), 'the count moved the figure');
    eq([plates.fmv, plates.valLow, plates.valHigh], [200, 120, 320], '⚠ 8 plates at $25 each is $200, and the agent\'s range moves with it');
    const appr = ROW({ fmv: 1200, valuedBy: 'appraiser', valSource: 'Appraisal', qty: '6' });
    eq([R.ctx._invQtyCarriesValue(appr, 200, 1), appr.fmv], [false, 1200], 'an appraisal\'s figure is the report\'s, never moved by a count');
    const A = rig(ESTATE(), [ROW({ unitVal: 30, qty: 6 })]);
    A.ctx._avWrite(7, 's1', RES({ fmv: 240 }), ESTATE(), {});
    eq([A.ctx._getPhotoRef(7, 's1').unitVal, A.ctx.invUnitValue(A.ctx._getPhotoRef(7, 's1'))], [undefined, 40], 'Agent Two\'s whole-line figure: Each read off it');
  }

  group('⚠⚠ A9 · Each × Qty driven through the row\'s own edit (_invEdit): count, Each, total, a cleared Each');
  {
    const refreshes = { summary: 0, guard: 0 };
    const R = rig(ESTATE(), [SURE({ fmv: 25, valLow: 15, valHigh: 40, qty: 1 })], {
      fns: ['_invEdit', 'invUnitValue', 'invLineQty', '_invQtyCarriesValue', '_invPaintFigures', 'agentValueAfterRename', 'invAppraised', 'agentValueStale', '_avHasFigure', '_invAcceptCtxOf', 'invAcceptCtx', '_invListReadHtml', 'invListRead', 'invAppraisalSourceAsk'],
      stubs: { _invRefreshSummary: () => refreshes.summary++, _invRefreshGuardrail: () => refreshes.guard++, _invRefreshFlagStrip() {},
        _invRefreshRecords() {}, _invRefreshReleases() {}, INV_STICKY_FIELDS: [], invStaffRefused: () => '', invBequestFor: () => null,
        invNoteDispositionMove: () => false, invFillPlanChannel: () => false, _invRowDomId: (s) => 'inv-row-' + s, _renderInvRow: () => '<div></div>',
        _invRefreshAgentNotices() {} },
    });
    const box = (id, v) => { const el = R.dom.getElementById(id); el.value = v; return el; };
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
  }

  // ═══ A11 · WHAT THE BUILD'S REVIEW FOUND (2026-10-25b) ═══
  group('⚠⚠ A11 · the review: a renamed line\'s accepted figure, the automatic run\'s lines, a failed check, an answer for a line not sent, the redraw that waits');
  {
    const EDIT_FNS = ['_invEdit', 'invUnitValue', 'invLineQty', '_invQtyCarriesValue', '_invPaintFigures', 'agentValueAfterRename', 'invAppraised', 'agentValueStale', '_avHasFigure', '_invAcceptCtxOf', 'invAcceptCtx', '_invListReadHtml', 'invListRead', 'invAppraisalSourceAsk'];
    const EDIT_STUBS = { _invRefreshSummary() {}, _invRefreshGuardrail() {}, _invRefreshFlagStrip() {}, _invRefreshRecords() {}, _invRefreshReleases() {},
      INV_STICKY_FIELDS: [], invStaffRefused: () => '', invBequestFor: () => null, invNoteDispositionMove: () => false, invFillPlanChannel: () => false,
      _invRowDomId: (s) => 'inv-row-' + s, _renderInvRow: () => '<div></div>', _invRefreshAgentNotices() {}, SHEETS_SYNC_URL: '' };
    // 1. A person's rename: the agent figure accepted for the old name is accepted no longer (the $25 wooden mirror).
    const E = rig(LIVING(), [SURE({ reviewed: true, valReviewed: true, valReviewedBy: 'Ashley Jerome', valReviewedAt: 5 })], { fns: EDIT_FNS, stubs: EDIT_STUBS });
    const er = attempt(() => E.ctx._invEdit(7, 's1', 'objectName', { value: 'Restoration Hardware wall mirror', type: 'text' }));
    ok(er.ok, 'the name is typed (' + (er.err || 'ok') + ')');
    const e = E.ctx._getPhotoRef(7, 's1');
    eq([e.valReviewed, e.valReviewedBy, e.reviewed], [undefined, undefined, true], '⚠⚠ the figure made for the old name is no longer accepted…');
    eq(E.ctx.invLineReviewed(e), false, '…so the line is not reviewed until it is valued as named and looked at');
    const P = rig(LIVING(), [ROW({ fmv: 300, valuedBy: 'desk', reviewed: true })], { fns: EDIT_FNS, stubs: EDIT_STUBS });
    attempt(() => P.ctx._invEdit(7, 's1', 'objectName', { value: 'Restoration Hardware wall mirror', type: 'text' }));
    eq(P.ctx.invLineReviewed(P.ctx._getPhotoRef(7, 's1')), true, 'a person\'s own figure: the line stays reviewed');
    // 2. The automatic run takes the photographed lines it has not already failed on; Value N lines still offers the rest.
    const A = rig(ESTATE(), [ROW({ stableId: 'a' }), ROW({ stableId: 'f', valFailed: 'no sold comparables found' }),
      ROW({ stableId: 'm', driveFileId: '', manual: true, objectName: 'Cash on hand' })]);
    ok(A.ctx.agentValueAuto(7), 'the automatic run goes');
    eq(A.posts.length ? A.posts[0].items.map((i) => i.stableId) : [], ['a'], '⚠ with the photographed line alone: never the one it could not value, never a typed line');
    eq(A.ctx.agentValueableRefs(7).map((r) => r.stableId), ['a', 'f', 'm'], 'Value N lines still offers both');
    const A2 = rig(ESTATE(), [ROW({ stableId: 'f', valFailed: 'x' })]);
    eq([A2.ctx.agentValueAuto(7), A2.posts.length], [false, 0], 'nothing left but what it could not value: nothing sent');
    // 3. Never after a room check that failed outright; after one that ran, at once.
    const failed = rig(ESTATE(), [ROW()], { fns: ['_arFinish'], stubs: { _arState: () => ({ running: true, error: 'the room check could not be reached' }) } });
    failed.ctx._arFinish(7);
    eq(failed.posts.length, 0, '⚠ a room check that failed: Agent Two waits (a line counted twice is a line valued twice)');
    const ran = rig(ESTATE(), [ROW()], { fns: ['_arFinish'], stubs: { _arState: () => ({ running: true, error: '' }) } });
    ran.ctx._arFinish(7);
    eq(ran.posts.length, 1, 'one that ran: Agent Two at once');
    // 4. Only what a call sent is answered: an answer for another line ends the run, named, never a loop.
    const Z = rig(ESTATE(), [ROW({ stableId: 'b' })], { answer: () => ({ ok: true, results: { other: RES({ fmv: 5 }) }, failed: { gone: 'x' } }) });
    attempt(() => Z.ctx.agentValueAuto(7));
    eq(Z.posts.length, 1, '⚠⚠ an answer naming a line it did not send: one request, never sent again and again');
    has(Z.ctx._avState(7).error || '', 'answered for none of the 1 lines', 'named, as a call that answers nothing is');
    eq(Z.ctx._getPhotoRef(7, 'b').fmv, undefined, 'and nothing written');
    // 5. A run's tail never redraws the desk under somebody typing.
    let renders = 0, listeners = [];
    const mk = (tag) => ({ tagName: tag, addEventListener: (t, f) => listeners.push(f), removeEventListener: (t, f) => { listeners = listeners.filter((x) => x !== f); } });
    const box1 = mk('TEXTAREA'), box2 = mk('INPUT'), btn = mk('BUTTON');
    const panel = { contains: (el) => el === box1 || el === box2 || el === btn };
    const doc = { activeElement: box1, getElementById: (id) => (id === 'panel-inventory' ? panel : null) };
    const timers = [];
    const W = sandbox({ fns: ['_invRenderWhenIdle'], stubs: { document: doc, renderInventoryTab: () => { renders++; }, setTimeout: (f) => { timers.push(f); return 0; } } });
    W._invRenderWhenIdle(); W._invRenderWhenIdle();
    eq([renders, listeners.length], [0, 1], '⚠⚠ a box on the desk has the focus: no redraw under it, and asked twice it waits once');
    doc.activeElement = box2; listeners.slice().forEach((f) => f()); timers.splice(0).forEach((f) => f());
    eq(renders, 0, 'tabbed into the next box: still waiting');
    doc.activeElement = btn; listeners.slice().forEach((f) => f()); timers.splice(0).forEach((f) => f());
    eq(renders, 1, 'out of the boxes: one redraw');
    doc.activeElement = { tagName: 'TEXTAREA' }; W._invRenderWhenIdle();
    eq(renders, 2, 'a box elsewhere on the page is not the desk\'s: redrawn at once');
    ['_avFinish', '_arFinish', '_agFinish'].forEach((n) => {
      const b = liveLines(fn(n));
      has(b, '_invRenderWhenIdle();', n + ' ends on the redraw that waits');
      lacks(b, 'renderInventoryTab()', n + ' never redraws straight over the boxes');
    });
  }

  group('A10 · the row: Qty, Each, Total under their headings, nothing hung under the value box, and the manifest keeps unitVal');
  {
    const head = liveLines(fn('_renderInvColHead'));
    const iQ = head.indexOf('>Qty<'), iE = head.indexOf('>Each<'), iT = head.indexOf('>Total<');
    ok(iQ > 0 && iQ < iE && iE < iT, 'headings: Qty, then Each, then Total (' + [iQ, iE, iT].join(', ') + ')');
    const row = liveLines(fn('_renderInvRow'));
    has(row, '<div class="inv-c inv-c-each" data-cap="Each">\' + _invEachInput(jid, ref) + \'</div>\'', 'the Each box in its column');
    has(row, '<div class="inv-c inv-c-val" data-cap="Total">\' + _invInput(jid, ref, fmvCol, job) + \'</div>\'', '⚠ the Total box alone in its column (Accept no longer hangs under it)');
    const R = rig(ESTATE(), []);
    const each = R.ctx._invEachInput(7, ROW({ fmv: 200, qty: 8 }));
    ['id="inv-each-s1"', 'value="$25"', "_invEdit(7,'s1','unitVal',this)"].forEach((w) => has(each, w, 'the Each box: ' + w));
    has(src.slice(src.indexOf('<style>'), src.indexOf('</style>')), '.inv-c-each{flex:0 0 92px;min-width:0;}', 'its column width on a laptop');
    const wl = liveLines(fn('savePhotoRefs'));
    ['unitVal:r.unitVal', 'valNameFrom:r.valNameFrom'].forEach((w) => has(wl, w, 'the manifest keeps ' + w.split(':')[0]));
  }
  // ═══ C · THE PAGES SAY IT (2026-10-25b) ═══
  // The manual and the playbook in both copies carry the build's note, its claims, and no live instruction to press
  // Accept value: every remaining mention says it is gone.
  group('C · the pages say it: the manual and the playbook, HTML and markdown, and the specs');
  {
    const rd = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
    const dec = (h) => String(h).replace(/&times;/g, '×').replace(/&divide;/g, '÷').replace(/&rsquo;/g, '’').replace(/&amp;/g, '&')
      .replace(/<[^>]+>/g, '').replace(/\*\*?|`/g, '').replace(/[’']/g, "'").replace(/\s+/g, ' ');
    const manTitle = 'The agents in a line, one look per item, and Each × Qty (2026-10-25b';
    const pbTitle = 'The agents in a line, and one look per item (new 2026-10-25b)';
    [['manual.html', manTitle], ['MANUAL.md', manTitle], ['concierge-guide.html', pbTitle], ['CONCIERGE_GUIDE.md', pbTitle]].forEach(([f, title]) => {
      const t = dec(rd(f));
      has(t, title, f + ': the note');
      [['the line', 'the room check'], ['the one look', "tick covers the name, the count and"], ['a name changed is valued again', 'valued again by itself'],
       ['the brand in the name', 'Restoration Hardware wall mirror'], ['the hint', 'unsure'], ['Each and Total', 'Each'], ['Not reviewed or no Accept value', 'Accept value']]
        .forEach(([what, w]) => has(t, w, f + ': ' + what));
      // Every remaining "Accept value" is in a sentence saying it is gone.
      const sents = t.split(/(?<=[.!?])\s+/).filter((x) => /Accept values?\b/.test(x));
      ok(sents.length >= 1, f + ': fixture: Accept value is named where it is retired');
      sents.forEach((x) => ok(/gone|went|until 2026-10-25b|Until 2026-10-25b|no Accept value|no \*?Accept value|any more/i.test(x), f + ': "Accept value" only as retired (' + x.slice(0, 90) + '…)'));
      lacks(t, 'Unreviewed values count at the top filters to them', f + ': the old chip sentence is gone');
    });
    [['manual.html', 'Qty · Each · Total · Where it goes'], ['MANUAL.md', 'Qty · Each · Total · Where it goes'],
     ['concierge-guide.html', 'Qty · Each · Total · Where it goes'], ['CONCIERGE_GUIDE.md', 'Qty · Each · Total · Where it goes']]
      .forEach(([f, w]) => has(dec(rd(f)).replace(/&middot;/g, '·'), w, f + ': the row\'s headings'));
    has(rd('manual.html'), 'REQUIRES AN APPS SCRIPT REDEPLOY &mdash; 2026-10-25b', 'the manual\'s §2: one redeploy');
    has(rd('MANUAL.md'), 'REQUIRES AN APPS SCRIPT REDEPLOY — 2026-10-25b', '…in both copies');
    has(rd('AGENT_TWO_SPEC.md'), 'The agents in a line, one look per item, and Each × Qty (2026-10-25b)', 'Agent Two\'s spec, §13');
    has(rd('AGENT_ONE_SPEC.md'), 'A maker the crew names goes into the name (2026-10-25b)', 'Agent One\'s spec');
  }
};
