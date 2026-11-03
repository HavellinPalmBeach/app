'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// USE A SALE, AND FOUR PAGE READS (2026-11-02). Anthony, off the eBay developer account: *"what are people going to use an API for
// if you can't get pricing out of it?"* eBay holds its sold history back from apps and gives it to its sellers in Seller Hub's
// Product Research. Asked what to do, he took *"Rename to 'Use a sale'"* and *"Agent Two reads 4 pages"*.
//
//   A · the form: one rule for the source a pasted sale names, by its link (invSaleSource), and for who sold it where the box is
//       blank (invSaleVenue); the form's words.
//   B · the desk audit's Ask 14 (answered 2026-10-28): a sale more than 15% from the line's figure is asked about once: use the
//       sale, or keep the figure and file the sale only; within it the sale supports the figure, as before.
//   C · the backend: a research line reads four pages; the version.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const { sandbox, fn, domStub } = require('./harness');

const liveLines = (s) => String(s).split('\n')
  .filter((l) => { const t = l.trim(); return !(t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')); })
  .join('\n');
const GS = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'main-sync.gs'), 'utf8');

// The agents-in-concert sandbox's lists (agents-together.test.js).
const APP_FNS = ['invHavellinRecipient', 'invAwaitingAppraisal', 'invBequestElsewhere', 'invReleaseCautions', '_invPhotoNoteOpen', 'invLineOpen', '_gate706', 'maivFilingApplies', 'invLotSplitState', 'agentValueMode', 'agentValueInternal', '_avHasFigure', 'agentValueableRefs', 'agentValueUnreviewed',
  'agentValueStale', 'agentValueSpecialistWorth', '_avValDate', '_avContext', '_avItemPayload', '_avComp', '_avWrite', '_avRename', '_avNameIsAgents', 'agentValueGradesCondition', '_invCondIsAgents', '_invAgentCondition', 'agentValueWhole',
  '_avNoteFailure', 'agentValueApply', '_avTakeValue', '_avStampReviewed', '_invStampBy', 'deviceUser', '_avStart',
  '_avSendNext', '_avFinish', '_avRepaint', '_avStateHtml', '_avState', 'agentValueAuto', 'agentValueWaiting', 'agentValueAfterRename', 'agentValueUseSale',
  'agentValueNotices', '_avNoticesHtml', '_avNoticeKinds', '_avNoticeLabel', '_deskShowBtnHtml', '_avSummary', '_avRowBadges', '_avPanelHtml',
  'invLineReviewed', '_invStampLineReviewed', '_invSetReviewed', 'invLineUnsure',
  'agentDuplicateGroups', '_arPair', '_arPairOpen', 'agentDupCleared', '_agDupEligible', '_arDupEligible', 'agentNamedTwice',
  'invLineQty', 'invUnitValue', '_invQtyCarriesValue', '_invPaintFigures', '_invEachInput', '_invInputStyle', '_invCtrlMinW',
  'invValBasisWord', 'invAppraised', 'invLineAppraiser', '_invLinkedAppraiser', '_jobAppraisers', '_apprLabel', '_invHasAppraisal', '_invAppraisalDate',
  '_getPhotoRef', '_setPhotoRef', '_jobInvRefs', '_invHasValue', 'roundCents', 'invIsIntrinsic', 'invCatMeta',
  'invFiduciaryMode', 'isDecedentJob', 'docTierProduces', 'docTierOf', 'docTierDef', 'svcHasDocStep', 'estateValueDate',
  '_avdDate', '_ymdLocal', 'resolveValBasis', '_agNameKey', '_agDetailRefs', 'invLineCloseUps', '_invFileId', 'invAppraisalThreshold',
  'gateDispute', '_gateYes', 'invNeedsAppraisal', 'invAppraisalChosen', 'fmt', '_invMoney', '_invNamed', '_invItemNo', '_andJoin',
  'moneyToNumber', '_readAppsScriptJson', '_invJob', '_invRenderWhenIdle', '_invHasPhoto', 'invIsFirearm', 'invLineAccepted', 'invLineHold', '_invLineHolds', 'invLineAcceptedOnly', 'invIsMAIV', 'invMAIVDefaultCat', 'agentValueLooks', '_avPhotoContext', '_invPhotoSource', '_invRoomName', 'agentListedOff', 'agentValueAgain', '_avSurveyOf', '_withDeviceKey', 'deviceKey', 'invSaleSource', 'invSaleVenue', 'invSaleFarOff', '_invSaleHost', 'agentValueAdvised', 'agentValueAdvice', 'agentValueAdviceVerb', 'invValueStandardMoved', 'invValueStandardWords', 'invLineValueDate', 'estateAvdOn', 'invAppraisalInProgress', 'invApprInProgressBadge'];
const APP_VARS = ['INV_LOT_ARTICLE_CAP', 'INV_RELEASE_CAUTIONS', 'INV_ACCEPT_AMMO_RE', '_agDupSetJob', 'INV_OPEN_HOLDS', '_avRun', '_avForceComps', '_avAfter', '_avDupHeld', 'AGENT_VALUE_BATCH', 'AGENT_VALUE_GENERAL_CEILING', 'AGENT_VALUE_WHOLE_FROM', 'AGENT_VALUE_MAX_COMPS', 'AGENT_CONDITIONS',
  'AGENT_VALUE_MARK_RE', 'AGENT_VALUE_NO_MARK_RE', 'AGENT_VALUE_CONFS', 'AGENT_VALUE_SOURCES', 'AGENT_VALUE_OWN', 'AGENT_VALUE_SALE_DATE_RE',
  'INV_TAXONOMY', 'INV_APPRAISAL_THRESHOLD', 'INV_APPRAISAL_THRESHOLD_DISPUTED', 'DECEDENT_SERVICES', 'DOC_TIERS',
  'DOC_TIER_FROM_SCOPE', 'JOB_STEPS', 'AGENT_MAX_DETAILS', 'INV_VAL_SOURCES', '_agDupSet', 'AGENT_ROOM_CONF_RANK', 'AGENT_PASS_GAP_MS', 'MAIV_OTHER', 'MAIV_BY_CATEGORY', 'AGENT_VALUE_READ_RE', 'AGENT_VALUE_HEDGE_RE', 'AGENT_LISTED_MAX', '_avAutoAgain', 'INV_CATEGORIES', 'INV_SALE_AUCTION_HOSTS', 'INV_SALE_ASK_PCT'];
const ESTATE = (over) => Object.assign({ id: 7, hvlId: 'HVL-0007', svc: 'cleanout', docTier: 'values', deathDate: '2026-06-14', tc: 'Ashley Jerome' }, over || {});
const LIVING = (over) => Object.assign({ id: 7, hvlId: 'HVL-0007', svc: 'downsizing_move', tc: 'Ashley Jerome' }, over || {});
const ROW = (over) => Object.assign({ stableId: 's1', label: 'inventory', roomIdx: 2, objectName: 'Sterling silver candelabra, pair', namedBy: 'agent',
  agentConf: 'high', category: 'Silver', qty: 1, condition: 'Good', driveFileId: 'FID', ts: 1, disposition: 'Sell' }, over || {});
// Agent Two's $4,200 for the pair, its sentence and its comparable.
const AGENT = (over) => ROW(Object.assign({ fmv: 4200, valLow: 3800, valHigh: 4600, valuedBy: 'agent', valConf: 'medium', valSource: 'Auction comps',
  valNote: 'Two sold pairs at regional houses, 2025', valNameAt: 'Sterling silver candelabra, pair',
  valComps: [{ title: 'Pair of sterling candelabra', venue: 'Hindman', saleDate: '2025-05', price: 4400, url: 'https://hindmanauctions.com/items/1', kind: 'sold', by: 'agent' }] }, over || {}));
const SALE = (sid, price, url, venue) => ({ ['av-wp-title-' + sid]: 'Pair of sterling candelabra, Gorham', ['av-wp-price-' + sid]: String(price),
  ['av-wp-date-' + sid]: '2026-09-14', ['av-wp-venue-' + sid]: venue || '', ['av-wp-url-' + sid]: url });
const EBAY = 'https://www.ebay.com/itm/123456789012';

function rig(job, refs, answer) {
  const seed = {}, alerts = [], asked = [];
  const ctx = sandbox({
    fns: APP_FNS, vars: APP_VARS,
    stubs: {
      jobs: [Object.assign({}, job)],
      _photoRefs: { [job.id]: (refs || []).map((r) => Object.assign({}, r)) },
      estimateStore: {},
      _invTouch(r) { r.updatedAt = (r.updatedAt || 0) + 1; return r; },
      savePhotoRefs() {}, _scheduleInventorySync() {}, renderInventoryTab() {},
      _invJob: (id) => (id === job.id ? job : null),
      _todayStr: () => '2026-11-02',
      esc: (x) => String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
      document: { getElementById: (id) => (id in seed ? { value: seed[id] } : null) },
      alert: (m) => alerts.push(m),
      confirm: (m) => { asked.push(m); return answer === undefined ? true : answer; },
    },
  });
  return { ctx, seed, alerts, asked, line: (id) => ctx._getPhotoRef(job.id, id || 's1') };
}

module.exports = function ({ group, ok, eq, has, lacks }) {
  group('⚠⚠ A1 · the source a pasted sale names follows its link');
  {
    const { ctx } = rig(ESTATE(), []);
    [['https://www.worthpoint.com/worthopedia/gorham-123', 'WorthPoint comps'],
     [EBAY, 'Online comps'], ['https://ebay.co.uk/itm/9', 'Online comps'], ['https://www.ebay.com/sch/i.html?_nkw=x', 'Online comps'],
     ['https://www.liveauctioneers.com/item/77', 'Auction comps'], ['https://hindmanauctions.com/items/1', 'Auction comps'],
     ['https://www.invaluable.com/auction-lot/x', 'Auction comps'], ['https://fineart.ha.com/itm/silver/1', 'Auction comps'],
     ['https://www.sothebys.com/en/buy/auction/2025/x', 'Auction comps'], ['https://www.kodner.com/lot/5', 'Auction comps'],
     ['https://notha.com/x', 'Online comps'], ['https://www.etsy.com/listing/1', 'Online comps'], ['not a link', 'Online comps']]
      .forEach(([u, want]) => eq(ctx.invSaleSource(u), want, u));
    eq([ctx.invSaleVenue(EBAY), ctx.invSaleVenue('https://m.ebay.com/itm/1'), ctx.invSaleVenue('https://www.worthpoint.com/w/1'),
        ctx.invSaleVenue('https://www.liveauctioneers.com/item/77')], ['eBay', 'eBay', 'WorthPoint', 'liveauctioneers.com'], 'who sold it, where the box is blank');
  }

  group('A2 · an eBay sale on a line with no figure: its price, Online comps, eBay, the line reviewed, nothing asked');
  {
    const R = rig(ESTATE(), [ROW({ valFailed: 'no market found' })]);
    Object.assign(R.seed, SALE('s1', '$1,150', EBAY));
    R.ctx.agentValueUseSale(7, 's1');
    const r = R.line();
    eq([r.fmv, r.valSource, r.valuedBy, r.reviewed], [1150, 'Online comps', 'desk', true], '⚠⚠ the sale is the line\'s figure, from online comps, the line reviewed');
    eq([r.valComps[0].venue, r.valComps[0].kind, r.valComps[0].by, r.valComps[0].price], ['eBay', 'sold', 'desk', 1150], 'filed first, eBay, sold, the desk\'s');
    eq(R.asked, [], 'nothing asked: there was no figure to differ from');
    eq(R.ctx.invValBasisWord(r), 'online comps', 'the schedules say online comps');
  }

  group('A3 · the form says what it takes, and a refusal names the sale');
  {
    const R = rig(ESTATE(), [AGENT()]);
    const h = String(R.ctx._avPanelHtml(ESTATE(), R.line()));
    has(h, '>Use a sale</summary>', 'the form is Use a sale');
    lacks(h, 'Use a WorthPoint sale', 'never WorthPoint alone');
    has(h, 'A sold price you found: eBay’s Product Research (in Seller Hub), WorthPoint or an auction house’s results. Its link says where it came from.', 'and says where a sale comes from');
    has(h, 'Use this sale</button>', 'its button');
    R.ctx.agentValueUseSale(7, 's1');
    has(R.alerts[0], 'Add its title, its price and its link from the sale first. Nothing was changed.', 'a sale with nothing typed is refused by name');
  }

  group('⚠⚠ B1 · Ask 14: a sale more than 15% from the figure is asked about once; OK uses the sale');
  {
    const R = rig(ESTATE(), [AGENT()], true);
    Object.assign(R.seed, SALE('s1', 1100, 'https://www.liveauctioneers.com/item/77', 'Kodner Galleries'));
    R.ctx.agentValueUseSale(7, 's1');
    eq(R.asked.length, 1, 'asked once');
    has(R.asked[0], 'This sale ($1,100) is 74% below the line\'s figure ($4,200).', 'naming both figures and how far apart');
    has(R.asked[0], 'OK: use the sale. The line\'s value becomes $1,100, from auction comps.', 'what OK does');
    has(R.asked[0], 'Cancel: keep $4,200 and file the sale under it only.', 'what Cancel does');
    const r = R.line();
    eq([r.fmv, r.valSource, r.valuedBy, r.reviewed], [1100, 'Auction comps', 'desk', true], '⚠⚠ OK: the sale is the figure, the person\'s, from auction comps, the line reviewed');
    eq([r.valNote, r.valConf], [undefined, undefined], 'Agent Two\'s sentence and confidence go with its figure');
    eq([r.valComps[0].venue, r.valComps[0].price, r.valComps.length], ['Kodner Galleries', 1100, 2], 'the sale filed first, the venue as typed');
  }

  group('⚠⚠ B2 · Cancel keeps the figure and files the sale only: it names nothing');
  {
    const R = rig(ESTATE(), [AGENT()], false);
    Object.assign(R.seed, SALE('s1', 1100, EBAY));
    R.ctx.agentValueUseSale(7, 's1');
    const r = R.line();
    eq([r.fmv, r.valSource, r.valuedBy, r.valNote], [4200, 'Auction comps', 'agent', 'Two sold pairs at regional houses, 2025'], '⚠⚠ the figure, its source and its sentence stand: the sale never relabels them (ACC-04)');
    eq([r.valComps[0].price, r.valComps[0].by, r.valReviewed], [1100, 'desk', true], 'the sale filed first, the line reviewed (the person looked)');
  }

  group('B3 · within 15% the sale supports the figure and names its source, as before; the edge');
  {
    const near = rig(ESTATE(), [AGENT()], false);
    Object.assign(near.seed, SALE('s1', 3900, EBAY));
    near.ctx.agentValueUseSale(7, 's1');
    eq(near.asked, [], 'nothing asked within 15%');
    eq([near.line().fmv, near.line().valSource], [4200, 'Online comps'], 'the figure kept, the sale\'s source named');
    const R = rig(ESTATE(), []);
    eq([R.ctx.invSaleFarOff(4200, 3570), R.ctx.invSaleFarOff(4200, 4830), R.ctx.invSaleFarOff(4200, 3569.99), R.ctx.invSaleFarOff(4200, 4830.01)],
       [false, false, true, true], 'exactly 15% either way is within; a cent past it asks');
    eq([R.ctx.invSaleFarOff(0, 100), R.ctx.invSaleFarOff('', 100)], [false, false], 'no figure: nothing to ask');
    eq(R.ctx.INV_SALE_ASK_PCT, 15, 'Anthony\'s 15%');
  }

  group('B4 · where counsel values: nothing asked, nothing printed, the sale filed');
  {
    const R = rig(ESTATE({ docTier: 'contents' }), [ROW({ valuedBy: 'agent', valLow: 3800, valHigh: 4600 })], true);
    Object.assign(R.seed, SALE('s1', 1100, EBAY));
    R.ctx.agentValueUseSale(7, 's1');
    const r = R.line();
    eq([R.asked.length, r.fmv, r.valSource], [0, undefined, undefined], 'no question, no figure, no source');
    eq([r.valComps[0].price, r.valReviewed], [1100, true], 'the sale filed, the line reviewed');    // A figure left from before the tier moved to Contents (CLAUDE.md, P23 found in passing): still nothing asked, nothing written over it.
    const L = rig(ESTATE({ docTier: 'contents' }), [AGENT()], true);
    Object.assign(L.seed, SALE('s1', 1100, EBAY));
    L.ctx.agentValueUseSale(7, 's1');
    eq([L.asked.length, L.line().fmv, L.line().valSource], [0, 4200, 'Auction comps'], '⚠ a leftover figure: no question, the sale never writes a printable figure where counsel values');
  }

  group('C · the backend: a research line reads four pages; the deployment');
  {
    const m = GS.match(/\nvar AGENT_VALUE_FETCHES\s*=\s*(\d+);/);
    eq(m && Number(m[1]), 4, 'four page reads on a research line (Anthony: "Agent Two reads 4 pages")');
    ok(/max_uses: AGENT_VALUE_FETCHES/.test(liveLines(GS)), 'the fetch tool reads the constant');
    // RESTATED at the merge with P13 and again 2026-11-02j (the release request's envelope as its own record): a later deployment
    // (2026-11-02c, carrying both 2026-11-02b builds) carries this one.
    const _bv = (GS.match(/var BACKEND_VERSION = '([^']+)';/) || [])[1] || '';
    ok(_bv >= '2026-11-02', 'main-sync.gs is 2026-11-02 or later, carrying it and 2026-10-28 (' + _bv + ')');
  }

  group('D · one rule, its readers');
  {
    const use = liveLines(fn('agentValueUseSale'));
    has(use, 'var source = invSaleSource(url);', 'the handler asks the one rule');
    has(use, 'invSaleFarOff(cur, comp.price)', 'and the one 15% test');
    lacks(use, "ref.valSource = 'WorthPoint comps'", 'and names no source of its own');
  }
};
