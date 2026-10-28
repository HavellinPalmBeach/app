'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// P8 OF THE DESK AUDIT (2026-10-27): NOTHING COUNTED TWICE. The critical part.
//
//   ACC-02, INV-01: the room check linked two lines of one harbour painting as plainly one thing, and the Court Inventory
//     printed FINAL with a signature block over a total holding both. An open possible duplicate on a schedule is now a
//     double count not yet decided: "1 possible double count not yet decided: #1 and #2", DRAFT, the signature withheld, on
//     the Court Inventory and the Trust Schedule; named under the IN PROGRESS stamp on the Estate Inventory Report
//     (invDoubleCounts). Agent Two waits on the later line of a pair the room check read as plainly one thing, and on a
//     repeat of a photograph read twice (agentValueWaiting), until a person answers it.
//   GAP1-03: "One photograph named twice" drew four identical pictures with nothing pairing a repeat to its original, and
//     the three Removes took both salad-plate lines. Each repeat is paired with its original ("#87 repeats #73"), and
//     Keep the first reading, asked first, takes off only the matched repeats; a line new in the later reading stays.
//   INV-05, AGT-03: Not duplicates set `dupOK` on the line, and a double the room check found later with another line was
//     never shown while the work bar said one was flagged. It is recorded for the pair (`dupOKIn`, one id per press on every
//     line of the group, agentDupCleared).
//   Nothing is merged by itself (CLAUDE.md, Decided).
//   P8's review (2026-10-27): Keep the first reading pressed twice took a real stack (matched once now, removed lines
//     included, and only the same words pair lines the crops cannot place); an answered pair's sentence and confidence
//     headed another pair and held Agent Two on a low one (`dupPairs`, _arPair); a rename, a close-up or a press mid-chain
//     went round the wait (_avDupHeld); a photograph read twice printed as one double count across four lines; one press
//     grew the manifest as the square of the group; the package's question said nothing of a double count.
// ─────────────────────────────────────────────────────────────────────────────
const { sandbox, fn, domStub } = require('./harness.js');

const live = (s) => String(s).split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
const text = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&middot;/g, '·').replace(/&mdash;/g, '—').replace(/&amp;/g, '&')
  .replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
const attempt = (f) => { try { return { ok: true, val: f() }; } catch (e) { return { ok: false, err: String(e && e.message || e) }; } };
const val = (r, dflt) => (r && r.ok ? r.val : (dflt === undefined ? 'threw: ' + (r && r.err) : dflt));

// ─── The desk's side: the grouper, the presses, the room check's writer, what Agent Two waits on ───
const DESK_FNS = ['agentDupCleared', 'agentNamedTwice', 'agentDuplicateGroups', '_arPair', '_arPairOpen', '_agDupEligible', '_arDupEligible', '_agNameKey',
  '_agDupIndex', '_agDupHtml', '_agDupHandle', '_agDupUnhandle', 'agentDropDuplicate', 'agentNotDuplicate', 'agentKeepFirstReading',
  '_invItemNo', '_invRoomName', '_getPhotoRef', '_setPhotoRef', '_jobInvRefs', '_invJob', '_invTombstoneLine', '_invStampBy', 'deviceUser',
  'savePhotoRefs', '_arWrite', '_arStateHtml', '_arState', 'agentValueWaiting', '_avDupReleased', 'agentValueAuto', 'agentValueRun',
  '_avValueButtonHtml', 'agentValueableRefs', '_avHasFigure', '_invHasValue', '_invHasPhoto', '_avState', '_arLineWhy',
  'agentValueAfterRename', 'agentValueAfterCloseUp', 'agentValueStale', '_avFinish'];
const DESK_VARS = ['AGENT_PASS_GAP_MS', 'AGENT_ROOM_CONF_RANK', 'AGENT_ROOM_CONF_WORDS', '_arRun', '_avRun', '_agRun', '_avDupHeld', '_avForceComps', '_avAfter', '_avAutoAgain'];

function desk(refs, over) {
  over = over || {};
  const started = [], badges = [], asked = [], alerts = [];
  let clock = 1760000000000;
  class D extends Date { static now() { return clock++; } }
  const c = sandbox({
    fns: DESK_FNS, vars: DESK_VARS,
    stubs: Object.assign({
      Date: D,
      jobs: [{ id: 7, hvlId: 'HVL-0008', name: 'Margaret Ellison', svc: 'cleanout', matterType: 'trust', tc: 'Ashley Jerome' }],
      _photoRefs: { 7: refs },
      estimateStore: { 7: { estimate: { rooms: [{ idx: 2, name: 'Kitchen' }, { idx: 3, name: 'Living Room' }] } } },
      _invTouch(r) { r.updatedAt = clock++; return r; },
      _scheduleInventorySync() {}, renderInventoryTab() {}, _invThumbHTML: () => '<i class="thumb"></i>',
      showSyncBadge: (m) => badges.push(m),
      alert: (m) => alerts.push(m),
      window: { confirm: (m) => { asked.push(m); return over.answer !== false; } },
      confirm: (m) => { asked.push(m); return over.answer !== false; },
      SHEETS_SYNC_URL: 'https://script.example/exec',
      _avStart: (jobId, job, ids) => { started.push(ids.slice()); },
      agentValueInternal: () => false, agentValueMode: () => 'general',
      invLineReviewed: () => false,   // a close-up's rule asks it; the review is not what this measures
      _invRenderWhenIdle() {},
    }, over.stubs || {}),
  });
  c.started = started; c.sent = () => started.map((ids) => ids.slice().sort()); c.badges = badges; c.asked = asked; c.alerts = alerts;
  c.ref = (id) => c._getPhotoRef(7, id);
  c.groups = () => c.agentDuplicateGroups(7).map((g) => g.rows.map((r) => r.stableId));
  c.keep = () => { const g = c.agentDuplicateGroups(7).filter((x) => x.twice)[0]; return g ? c.agentKeepFirstReading(7, c._agDupHandle(g.key)) : 'no group'; };
  c.notDup = (i) => c.agentNotDuplicate(7, c._agDupHandle(c.agentDuplicateGroups(7)[i || 0].key));
  c.live = () => c._jobInvRefs(7).map((r) => r.itemNo);
  return c;
}
// A room-check link with that pair's own answer (`dupPairs`, P8's review).
const LINK = (o, conf, why) => ({ dupWith: [o], dupPairs: { [o]: { conf: conf || 'high', why: why || 'The harbor painting twice.' } } });

// A room-check line (P24's fields), named by Agent One.
const RC = (id, no, name, over) => Object.assign({ stableId: id, itemNo: no, label: 'inventory', roomIdx: 3, objectName: name, agentName: name,
  namedBy: 'agent', agentConf: 'medium', category: 'Art & Décor', qty: 1, ts: no, filename: 'F_' + id + '.jpg', driveFileId: 'FID_' + id,
  updatedAt: 500 }, over || {});

// The Ellison photograph (GAP1-03): #73 and #81 from one naming, #87 and #88 from a second seven minutes later, each with the
// crop Agent One gave it: the larger stack on the right, the smaller on the left.
const T1 = 1760000000000, T2 = T1 + 7 * 60 * 1000;
const PL = (id, n, name, crop, over) => Object.assign({ stableId: id, itemNo: n, label: 'inventory', roomIdx: 2, objectName: name, agentName: name,
  namedBy: 'agent', agentConf: 'medium', category: 'General/Household', qty: 6, ts: 1000, filename: 'HVL-0008_Kitchen_INV_5.jpg',
  driveFileId: 'FID_P', crop: crop, updatedAt: 500 }, id === 'p73' ? {} : { derivedFrom: 'p73' }, over || {});
const ELLISON = () => [
  PL('p73', 73, 'Hand-painted tin-glazed earthenware dinner plates, yellow bird and blue flower', [0.46, 0.38, 1, 0.78], { agentAt: T1, qty: 8 }),
  PL('p81', 81, 'Hand-painted tin-glazed earthenware salad plates, matching', [0.03, 0.43, 0.45, 0.78], { agentAt: T1 + 3, qty: 16 }),
  PL('p87', 87, 'Hand-painted majolica dinner plates, yellow bird and blue flower design', [0.5, 0.4, 0.98, 0.8], { agentAt: T2 }),
  PL('p88', 88, 'Hand-painted majolica salad or dessert plates, matching', [0.05, 0.42, 0.44, 0.8], { agentAt: T2 + 2 }),
];

// ─── The papers: the trust-schedule test's lifts, with the double counts ───
const PAPER_FNS = ['invLineReviewed', 'invLineOpen', '_invDocPartyHead', 'invConditionText',
  'printTrustSchedule', 'printCourtInventory', '_avUnreviewedStamp', 'printEstateInventoryReport', 'jobOnProbateTrack', '_invScheduleSection', 'invValBasisWord',
  '_invTrack', '_invTrackDefault', '_invOnTrustSchedule', '_invOnProbateSchedule',
  '_invIsExempt', '_invIsProbateAsset', '_invExcludedTracks', '_invHasValue',
  'invDocContractBlock', 'docTierProduces', 'docTierOf', 'docTierDef', 'docTierScope', 'docTierScopeMirror',
  'svcHasDocStep', 'matterDef', 'matterTypeOf', 'invProbateRows', 'invFiduciaryMode',
  'isDecedentJob', '_invAssignItemNos', '_jobInvRefs', 'savePhotoRefs',
  'isFormalDoc', 'resolveDocLevel', 'docLevelFloor', 'gateDispute',
  '_gateYes', '_gate706', '_invGuardrailItems', 'invAwaitingAppraisal', 'invAppraised', '_invJob',
  'invNeedsAppraisal', 'invIsIntrinsic', 'invCatMeta', 'invAppraisalThreshold',
  '_invHasAppraisal', '_jobAppraisers', 'resolveValBasis', 'estateValueDate', '_invMoney',
  '_invDocName', '_invItemNo', '_invGroupItems', 'invIsFirearm', '_invDispLabel', '_invRoomName', '_planRooms',
  '_invProgressStamp',
  '_invReviewStats', '_invDocHead', 'invAppraiserFor', '_invFileId', '_invNeedsValue',
  'weArrangeAppraisals', 'appraisalDuty', 'estimateAppraiserLines', 'estimateAppraiserNames', 'jobAppraisalDuty', 'approvedEstimateFor', 'estimateDocScope', 'docScopeDef', '_agrOtherAppraisalsBy',
  'roundCents', 'fmt', 'trustInstrumentTitle', 'scheduleSigners', 'scheduleSignLines', 'jobFiduciaries', 'jobListEntries',
  'invLineAccepted', 'invLineHold', '_invLineHolds', '_invPhotoNoteOpen', 'invLineAcceptedOnly', '_invAcceptedStampWords',
  'invIsMAIV', 'invMAIVDefaultCat', 'invAcceptCtx', '_invAcceptCtxOf', 'invListRead', 'agentNoticesOn',
  'agentValueUnreviewed', 'agentValueInternal', 'agentValueStale', 'agentValueSpecialistWorth', '_avHasFigure', 'agentNoticeQuiet',
  'agentDupCleared', 'agentNamedTwice', 'agentDuplicateGroups', '_arPair', '_arPairOpen', '_agDupEligible', '_arDupEligible', '_agNameKey', 'invDoubleCounts',
  'agentNotDuplicate', 'agentDropDuplicate', '_agDupHandle', '_agDupUnhandle', '_getPhotoRef', '_setPhotoRef', '_invTombstoneLine', '_invStampBy',
  'deviceUser', 'agentValueWaiting', '_avDupReleased'];
const PAPER_VARS = ['_agRun', '_avRun', '_arRun', '_avDupHeld', 'AGENT_NOTICE_KINDS',
  'INV_CONTRACT_DOCS', 'DOC_TIERS', 'DOC_TIER_FROM_SCOPE', 'JOB_STEPS', 'DECEDENT_SERVICES',
  'MATTER_TYPES', 'INV_ASSET_TRACKS', 'INV_TAXONOMY', 'INV_APPRAISAL_THRESHOLD',
  'EXEMPT_CAP_732_402', 'AGR_NOT_AN_ACCOUNTING', 'INV_CATEGORIES', '_invShowRoll', 'INV_GROUP_ORDER', 'INV_CAT_GLYPH', 'INV_UNDECIDED', 'INV_DISPOSITIONS', 'INV_DEFAULT_CATEGORY', 'DOC_SCOPES',
  'AS_FOUND_SUBFOLDER', 'PHOTO_SUBFOLDER', 'MAIV_OTHER', 'MAIV_BY_CATEGORY', '_agDupSetJob', 'INV_OPEN_HOLDS', 'INV_ACCEPT_AMMO_RE',
  'AGENT_PASS_GAP_MS', 'AGENT_ROOM_CONF_RANK'];
const ESTATE = { id: 7, hvlId: 'HVL-0007', name: 'Tripp Butler', svc: 'cleanout', gate706: 'no', docTier: 'values', deathDate: '2026-08-14',
  addr: '69 Beach Blvd', city: 'Palm Beach', executor: 'Ruth Butler', executorRole: 'Personal Representative' };
const LINE = (id, no, name, fmv, over) => Object.assign({ stableId: id, itemNo: no, label: 'inventory', roomIdx: 3, objectName: name, category: 'Furniture',
  condition: 'Good', qty: 1, fmv: fmv, valSource: 'Estimate', valuedBy: 'desk', disposition: 'Auction', reviewed: true, ts: no, updatedAt: 500 }, over || {});
const PAINTINGS = (over1, over2) => [
  LINE('s1', 1, 'Oil painting, harbor scene, gilt frame', 2400, Object.assign({ category: 'Art & Décor', namedBy: 'agent', agentName: 'Oil painting, harbor scene, gilt frame',
    driveFileId: 'F1' }, LINK('s2', 'high', 'The harbor painting: over the sofa in one, close up in the other.'), over1 || {})),
  LINE('s2', 2, 'Harbor painting in gilt frame', 2100, Object.assign({ category: 'Art & Décor', namedBy: 'agent', agentName: 'Harbor painting in gilt frame',
    driveFileId: 'F2' }, LINK('s1', 'high', 'The harbor painting: over the sofa in one, close up in the other.'), over2 || {})),
  LINE('s3', 3, 'Chesterfield sofa', 1200),
];
function papers(job, items) {
  const printed = [];
  const c = sandbox({
    fns: PAPER_FNS, vars: PAPER_VARS,
    stubs: { document: domStub({}), jobs: [Object.assign({}, ESTATE, job || {})], _photoRefs: { 7: items },
      _printDocument: (html, title) => printed.push({ html: html, title: title }),
      _invTouch(r) { r.updatedAt = (r.updatedAt || 0) + 1; return r; },
      renderInventoryTab() {}, showSyncBadge() {}, _scheduleInventorySync() {}, agentValueAuto() {},
      invReleaseCautions: () => [], _invPrintThumb: () => '', _invThumbFor: () => '' },   // the release cautions are not what this measures
  });
  c.print = (name) => { const r = attempt(() => c[name](7, { asHtml: true })); return r.ok ? (r.val && r.val.html) || '' : 'threw: ' + r.err; };
  return c;
}

module.exports = function ({ group, ok, eq, has, lacks }) {

  group('A · ⚠⚠ Not duplicates is recorded for the pair: a double found later with another line is shown (INV-05, AGT-03)');
  {
    const D = desk([RC('s0', 1, 'Tufted linen three-seat sofa', LINK('s2', 'low')), RC('s2', 2, 'Club chair', LINK('s0', 'low'))]);
    eq(D.groups(), [['s0', 's2']], 'fixture: day one, the room check links the sofa and the armchair');
    D.notDup();
    const w0 = D.ref('s0').dupOKIn || [], w2 = D.ref('s2').dupOKIn || [];
    eq([w0.length, w2.length, w0[0] === w2[0] && !!w0[0]], [1, 1, true], '⚠ Not duplicates records one id on each line of the group, the press\'s own');
    eq([D.ref('s0').dupOK, D.ref('s0').dupOKWith, D.ref('s2').dupOK], [undefined, undefined, undefined], 'and nothing on the line itself, and no list of the other lines');
    eq(D.groups(), [], 'the pair goes quiet');
    // Day two: a new photograph of the same sofa, which the room check links to s0.
    D._photoRefs[7].push(RC('s6', 6, 'Tufted linen three-seat sofa', LINK('s0', 'high', 'The same sofa from two sides.')));
    Object.assign(D.ref('s0'), LINK('s6', 'high', 'The same sofa from two sides.'));
    eq(D.groups(), [['s0', 's6']], '⚠⚠ the new double is shown: the armchair answer does not cover it');
    eq(Object.keys(D._agDupIndex(7, D._jobInvRefs(7))).sort(), ['s0', 's6'], 'and both rows wear the chip');
    // A pair is answered when both lines carry one press's id.
    eq(desk([RC('a', 1, 'Brass table lamp', { dupOKIn: ['n1'] }), RC('b', 2, 'Brass table lamp', { dupOKIn: ['n1'] })]).groups(), [], 'both lines carrying one press\'s id: answered');
    eq(desk([RC('a', 1, 'Brass table lamp', { dupOKIn: ['n1'] }), RC('b', 2, 'Brass table lamp', { dupOKIn: ['n2'] })]).groups(), [['a', 'b']], 'two presses on other groups answer nothing between them');
    eq(desk([RC('a', 1, 'Brass table lamp', { dupOKIn: ['n1'] }), RC('b', 2, 'Brass table lamp')]).groups(), [['a', 'b']],
      '⚠ one half\'s newer copy without the id shows the pair again: the safe direction');
    const F = desk([RC('a', 1, 'Brass table lamp', { dupOKIn: ['n1'] }), RC('b', 2, 'Brass table lamp', { dupOKIn: ['n1'] }), RC('c', 3, 'Brass table lamp')]);
    eq(F.groups(), [['a', 'b', 'c']], 'a third lamp of the same name is flagged with them, the answered pair joined through it');
    F.notDup();
    const fa = F.ref('a').dupOKIn || [], fb = F.ref('b').dupOKIn || [], fc = F.ref('c').dupOKIn || [];
    eq([fa.length, fb.length, fc.length, fa[0], fa[1] === fb[1] && fb[1] === fc[0]], [2, 2, 1, 'n1', true], 'Not duplicates again: one more id on every line, after what each held');
    eq(F.groups(), [], 'and quiet');
    // ⚠ An earlier answer stands (P8's review: a press that replaced what a line held brought an answered pair back).
    const K = desk([RC('a', 1, 'Lamp', Object.assign({ dupOKIn: ['n1'] }, LINK('b', 'low', 'x'))), RC('b', 2, 'Lamp shade', LINK('a', 'low', 'x')), RC('c', 3, 'Lamp', { dupOKIn: ['n1'] })]);
    eq(K.groups(), [['a', 'b']], 'fixture: the lamps answered, the room check linking one to a shade');
    K.notDup();
    eq(K.groups(), [], '⚠ answering the shade keeps the lamps\' earlier answer: the press adds to what a line held');
    // One press is one short id a line, never a list of the others (P8's review: 403 KB for 120 lines of one name).
    const big = [];
    for (let i = 0; i < 120; i++) big.push(RC('4_r3_inventory_' + String(1e9 + i), i + 1, 'Shelf of hardcover books'));
    const BG = desk(big), before = JSON.stringify(BG._photoRefs[7]).length;
    BG.notDup();
    const grew = JSON.stringify(BG._photoRefs[7]).length - before;
    ok(grew > 0 && grew < 120 * 60, '⚠⚠ one press on 120 lines of one name adds about one short id a line (' + grew + ' characters; the list of the others on each line added 403,000)');
    eq(BG.groups(), [], 'and answers every pair');
    // A same-name pair answered, and the room check linking one of them elsewhere.
    const G = desk([RC('a', 1, 'Lamp', Object.assign({ dupOKIn: ['n1'] }, LINK('d', 'medium', 'y'))), RC('b', 2, 'Lamp', { dupOKIn: ['n1'] }), RC('d', 4, 'Brass lamp', LINK('a', 'medium', 'y'))]);
    eq(G.groups(), [['a', 'd']], 'the room check\'s link to another line is shown, the answered pair not');
    // The work bar counts only a double the block will show (AGT-03: it said one was flagged that the block did not show).
    const H = desk([RC('a', 1, 'Sofa', { dupOKIn: ['n1'] }), RC('b', 2, 'Club chair', { dupOKIn: ['n1'] })]);
    const room = { photos: [{ lines: [H.ref('a')] }, { lines: [H.ref('b')] }] };
    eq(H._arWrite(7, room, { doubles: [{ ids: ['a', 'b'], confidence: 'low', why: 'x' }] }), 0, '⚠ the room check finding an answered pair again counts nothing');
    eq(H.ref('a').dupWith, ['b'], 'though the link is written as the pictures say');
    const H2 = desk([RC('a', 1, 'Sofa', { dupOKIn: ['n1'] }), RC('b', 2, 'Club chair', { dupOKIn: ['n1'] }), RC('c', 3, 'Sofa, linen')]);
    const room2 = { photos: [{ lines: [H2.ref('a')] }, { lines: [H2.ref('b')] }, { lines: [H2.ref('c')] }] };
    eq(H2._arWrite(7, room2, { doubles: [{ ids: ['a', 'b'], confidence: 'low', why: 'x' }, { ids: ['a', 'c'], confidence: 'high', why: 'y' }] }), 1, 'and a new one counts');
    // The rule is read by every evidence, never off the line.
    ['_agDupEligible', '_arDupEligible', 'agentNamedTwice'].forEach((f) => lacks(live(fn(f)), 'dupOK', f + ' reads no per-line answer'));
    has(live(fn('agentDuplicateGroups')), 'agentDupCleared(g[i], g[j])', 'the same name, pair by pair');
    has(live(fn('_arPairOpen')), 'agentDupCleared(r, other)', 'the room check\'s link, pair by pair');
    has(live(fn('savePhotoRefs')), 'dupOKIn:r.dupOKIn', 'the answer is on the manifest\'s save list');
    has(live(fn('savePhotoRefs')), 'dupPairs:r.dupPairs', 'and each pair\'s own room-check answer');
    let stored = null;
    const S = desk([RC('a', 1, 'Sofa', Object.assign({ dupOKIn: ['n1'] }, LINK('b', 'medium', 'z')))], { stubs: { localStorage: { setItem: (k, v) => { stored = v; }, getItem: () => null, removeItem() {} } } });
    S.savePhotoRefs(7);
    const sv = stored ? JSON.parse(stored)[0] : {};
    eq([sv.dupOKIn, sv.dupPairs], [['n1'], { b: { conf: 'medium', why: 'z' } }], '⚠ driven: both survive the save');
  }

  group('B · ⚠⚠ one photograph named twice: each repeat paired with its original (GAP1-03)');
  {
    const D = desk(ELLISON());
    const t = D.agentNamedTwice(D._jobInvRefs(7));
    eq(t.map((x) => x.rows.map((r) => r.itemNo)), [[73, 81, 87, 88]], 'fixture: the four Ellison lines, one photograph read twice');
    eq(t[0].repeats.map((p) => [p.line.itemNo, p.of.itemNo]), [[87, 73], [88, 81]], '⚠⚠ #87 repeats #73, #88 repeats #81, by the part of the photograph each covers');
    eq(t[0].fresh, [], 'and nothing is new in the second reading');
    const g = D.agentDuplicateGroups(7);
    eq(g.map((x) => [x.twice, x.repeats.map((p) => p.line.stableId)]), [[true, ['p87', 'p88']]], 'the group carries the pairs');
    const h = text(D._agDupHtml(7, D._jobInvRefs(7)));
    has(h, 'Agent One read it twice, so the later lines may repeat the earlier ones: #87 repeats #73 · #88 repeats #81', '⚠ the block says which repeats which');
    has(h, 'Hand-painted majolica dinner plates, yellow bird and blue flower design repeats #73 Hand-painted tin-glazed', 'and on each repeat');
    has(D._agDupHtml(7, D._jobInvRefs(7)), '>Keep the first reading</button>', 'Keep the first reading is offered');
    eq((D._agDupHtml(7, D._jobInvRefs(7)).match(/agentDropDuplicate\(/g) || []).length, 4, 'with a Remove on each line still');
    // ⚠⚠ Where the crops cannot place them, only the same words pair two lines (P8's review: half the words paired dinner plates
    // with salad plates, and Keep took a real stack). The Ellison wordings differ, so nothing is matched and Keep is not offered.
    const N = desk(ELLISON().map((r) => Object.assign(r, { crop: undefined })));
    const tn = N.agentNamedTwice(N._jobInvRefs(7))[0];
    eq([tn.repeats.length, tn.fresh.map((r) => r.itemNo)], [0, [87, 88]], '⚠⚠ no crops and other words: not matched, left to a person');
    lacks(N._agDupHtml(7, N._jobInvRefs(7)), 'Keep the first reading</button>', 'and Keep the first reading is not offered');
    has(text(N._agDupHtml(7, N._jobInvRefs(7))), '#87 not matched · #88 not matched', 'the block says they are not matched (never that they are new)');
    const W = desk(ELLISON().map((r) => Object.assign(r, { crop: [0, 0, 1, 1] })));
    eq(W.agentNamedTwice(W._jobInvRefs(7))[0].repeats.length, 0, 'a whole-photograph crop counts as none');
    // The same words, in any order and case, pair them, whatever order the later reading listed them in.
    const SAME = (r) => Object.assign(r, { crop: [0, 0, 1, 1] }, r.itemNo === 87 ? { agentName: 'dinner plates, Hand-painted tin-glazed earthenware: yellow bird, blue flower' }
      : r.itemNo === 88 ? { agentName: 'Salad plates, hand-painted tin-glazed earthenware, matching', agentAt: T2 - 1 } : {});
    const SW = desk(ELLISON().map(SAME));
    eq(SW.agentNamedTwice(SW._jobInvRefs(7))[0].repeats.map((p) => [p.line.itemNo, p.of.itemNo]), [[87, 73], [88, 81]], '⚠ the same words: paired, in either order');
    // The reviewer's fixture: whole-photograph crops, the dinner plates read twice and a stack of salad plates new in the second.
    const WP = (id, n, name, at) => PL(id, n, name, [0, 0, 1, 1], { agentAt: at });
    const DS = () => [WP('p73', 73, 'White porcelain dinner plates', T1), WP('p87', 87, 'White porcelain dinner plates', T2), WP('p88', 88, 'White porcelain salad plates', T2 + 2)];
    const t1 = desk(DS()).agentNamedTwice(DS())[0];
    eq([t1.repeats.map((p) => [p.line.itemNo, p.of.itemNo]), t1.fresh.map((r) => r.itemNo)], [[[87, 73]], [88]], '⚠⚠ dinner plates repeat dinner plates; the salad plates are not matched');
    const t2 = desk([DS()[0], DS()[2]]);
    eq([t2.agentNamedTwice(t2._jobInvRefs(7))[0].repeats.length, Object.keys(t2.agentValueWaiting(7))], [0, []], 'the salad plates alone in the second reading: no repeat, and Agent Two waits on nothing');
    // ⚠ Each earlier line is repeated at most once by one reading: two later lines over one stack, the closer one repeats it.
    const TY = desk([PL('p73', 73, 'Dinner plates', [0.5, 0.4, 1, 0.8], { agentAt: T1 }), PL('p87', 87, 'Dinner plates', [0.5, 0.4, 1, 0.8], { agentAt: T2 }),
      PL('p88', 88, 'Dinner plates, top of the stack', [0.55, 0.4, 1, 0.75], { agentAt: T2 + 2 })]);
    const ty = TY.agentNamedTwice(TY._jobInvRefs(7))[0];
    eq([ty.repeats.map((p) => [p.line.itemNo, p.of.itemNo]), ty.fresh.map((r) => r.itemNo)], [[[87, 73]], [88]], '⚠ one earlier line, one repeat by one reading; the other later line is not matched');
    // ⚠ A pair a person answered is never matched as a repeat: a third reading repeats the first instead.
    const C1 = [0.1, 0.1, 0.5, 0.5], T3b = T2 + 5 * 60 * 1000;
    const AQ = desk([PL('p73', 73, 'Teapot', C1, { agentAt: T1, dupOKIn: ['n1'] }), PL('p87', 87, 'Teapot', C1, { agentAt: T2, dupOKIn: ['n1'] }), PL('p95', 95, 'Teapot', C1, { agentAt: T3b })]);
    const aq = AQ.agentNamedTwice(AQ._jobInvRefs(7))[0];
    eq([aq.repeats.map((p) => [p.line.itemNo, p.of.itemNo]), aq.fresh.map((r) => r.itemNo)], [[[95, 73]], [87]], '⚠ #87, said to be its own teapot, repeats nothing; #95 repeats #73');
    // ⚠ A line not matched in one reading is matched in a later one: a third reading repeating it.
    const FC = desk([PL('p73', 73, 'Teapot', [0, 0, 0.3, 0.3], { agentAt: T1 }), PL('p87', 87, 'Sugar bowl', [0.6, 0.6, 0.9, 0.9], { agentAt: T2 }),
      PL('p95', 95, 'Sugar bowl, lidded', [0.6, 0.6, 0.9, 0.9], { agentAt: T3b })]);
    eq(FC.agentNamedTwice(FC._jobInvRefs(7))[0].repeats.map((p) => [p.line.itemNo, p.of.itemNo]), [[95, 87]], '⚠ the sugar bowl new in the second reading is repeated by the third');
    // The block names both lines on the repeat (P8's review: a number alone hid the mismatch).
    const DB = desk(ELLISON());
    has(text(DB._agDupHtml(7, DB._jobInvRefs(7))), 'Hand-painted majolica dinner plates, yellow bird and blue flower design repeats #73 Hand-painted tin-glazed earthenware dinner plates, yellow bird and blue flower',
      '⚠ the repeat\'s line names its original by number and name');
    // Crops and names disagreeing: the crop decides (the Ellison wordings differ; the parts of the photograph do not).
    const CR = desk(ELLISON().map((r) => Object.assign(r, r.itemNo === 87 ? { agentName: 'Salad plates', objectName: 'Salad plates' } : {})));
    eq(CR.agentNamedTwice(CR._jobInvRefs(7))[0].repeats.map((p) => [p.line.itemNo, p.of.itemNo]), [[87, 73], [88, 81]], 'the crop decides where both have one');
    // A line of the second reading that covers another part of the photograph is new in it.
    const X = desk(ELLISON().concat([PL('p89', 89, 'Ceramic teapot, cobalt glaze', [0.2, 0.05, 0.4, 0.3], { agentAt: T2 + 4, qty: 1 })]));
    const tx = X.agentNamedTwice(X._jobInvRefs(7))[0];
    eq([tx.repeats.map((p) => p.line.itemNo), tx.fresh.map((r) => r.itemNo)], [[87, 88], [89]], '⚠ #89, another part of the photograph, is new in the second reading');
    has(text(X._agDupHtml(7, X._jobInvRefs(7))), '#89 not matched', 'and the block says so');
    has(text(X._agDupHtml(7, X._jobInvRefs(7))), 'Ceramic teapot, cobalt glaze not matched to the first reading', 'on its line too');
    // A third reading's repeats pair with the first reading's lines.
    const T3 = T2 + 5 * 60 * 1000;
    const Y = desk(ELLISON().concat([PL('p95', 95, 'Hand-painted dinner plates, yellow bird', [0.47, 0.37, 0.99, 0.79], { agentAt: T3 })]));
    eq(Y.agentNamedTwice(Y._jobInvRefs(7))[0].repeats.map((p) => [p.line.itemNo, p.of.itemNo]), [[87, 73], [88, 81], [95, 73]], 'a third reading\'s repeat names the first reading\'s line');
  }

  group('C · ⚠⚠ Keep the first reading: asked first, takes off only the matched repeats, keeps a line new in the later reading');
  {
    const no = desk(ELLISON(), { answer: false });
    no.agentKeepFirstReading(7, no._agDupHandle(no.agentDuplicateGroups(7)[0].key));
    eq(no._jobInvRefs(7).length, 4, 'Cancel: nothing removed');
    has(no.asked[0] || '', 'Keep the first reading of this photograph?', 'it asks first');
    has(no.asked[0] || '', '#87 Hand-painted majolica dinner plates, yellow bird and blue flower design\n      repeats #73 Hand-painted tin-glazed earthenware dinner plates, yellow bird and blue flower',
      '⚠ naming each line it takes off and the line it repeats, both by number and name (P8\'s review)');
    has(no.asked[0] || '', '#88 Hand-painted majolica salad or dessert plates, matching\n      repeats #81 Hand-painted tin-glazed earthenware salad plates, matching', 'both');
    has(no.asked[0] || '', 'No photograph is deleted', 'and what it leaves');
    let stored = null;
    const D = desk(ELLISON(), { stubs: { localStorage: { setItem: (k, v) => { stored = v; }, getItem: () => null, removeItem() {} } } });
    const n = D.agentKeepFirstReading(7, D._agDupHandle(D.agentDuplicateGroups(7)[0].key));
    eq(n, 2, 'two lines taken off');
    const sv = stored ? JSON.parse(stored).filter((r) => r.deletedAt).map((r) => r.stableId).sort() : 'nothing saved';
    eq(sv, ['p87', 'p88'], '⚠ and the manifest is saved with both removals (the removal writer defers, so the press saves once)');
    eq(D._jobInvRefs(7).map((r) => r.itemNo), [73, 81], '⚠⚠ on the Ellison four, #73 and #81 stay (the three Removes once took both salad lines)');
    eq([D.ref('p87').deletedAt > 0, !!D.ref('p87').deletedBy, D.ref('p88').deletedAt > 0], [true, true, true], 'through the desk\'s removal writer: tombstoned, with who');
    eq(D.groups(), [], 'and the group goes');
    has(D.badges[D.badges.length - 1] || '', '2 repeated lines removed: #87, #88', 'the toast names them');
    // With a line new in the second reading.
    const X = desk(ELLISON().concat([PL('p89', 89, 'Ceramic teapot, cobalt glaze', [0.2, 0.05, 0.4, 0.3], { agentAt: T2 + 4, qty: 1 })]));
    X.agentKeepFirstReading(7, X._agDupHandle(X.agentDuplicateGroups(7)[0].key));
    has(X.asked[0] || '', 'Not matched to a line of the first reading, and kept:\n  · #89 Ceramic teapot, cobalt glaze', 'the question names what it keeps');
    eq(X._jobInvRefs(7).map((r) => r.itemNo), [73, 81, 89], '⚠ #89 stays');
    const left = X.agentDuplicateGroups(7);
    eq(left.map((g) => [g.rows.map((r) => r.itemNo), g.repeats.length, g.fresh.map((r) => r.itemNo)]), [[[73, 81, 89], 0, [89]]],
      '⚠ and the group stays for a person: nothing answers whether it repeats something the crops did not match');
    lacks(X._agDupHtml(7, X._jobInvRefs(7)), 'Keep the first reading</button>', 'with nothing left to keep, the press goes');
    X.agentNotDuplicate(7, X._agDupHandle(left[0].key));
    eq(X.groups(), [], 'Not duplicates answers it');
    // A third reading after Not duplicates: the new lines are shown again.
    X._photoRefs[7].push(PL('p95', 95, 'Hand-painted dinner plates, yellow bird', [0.47, 0.37, 0.99, 0.79], { agentAt: T2 + 5 * 60 * 1000 }));
    eq(X.agentDuplicateGroups(7).map((g) => g.repeats.map((p) => [p.line.itemNo, p.of.itemNo])), [[[95, 73]]], 'a later reading still shows, paired');
    // Nothing to keep: refused by name, nothing removed.
    const Z = desk(ELLISON().map((r) => Object.assign(r, { crop: [0.1 * r.itemNo % 1, 0, 0.1 * r.itemNo % 1 + 0.05, 0.05], agentName: 'Thing ' + r.itemNo, objectName: 'Thing ' + r.itemNo })));
    const zr = Z.agentKeepFirstReading(7, Z._agDupHandle(Z.agentDuplicateGroups(7)[0].key));
    eq([zr, Z._jobInvRefs(7).length], [false, 4], 'no repeat matched: nothing removed');
    has(Z.alerts[0] || '', 'No line of the later reading matches a line of the first', 'and it says why');
  }

  group('C2 · ⚠⚠ Keep the first reading pressed again never takes a line it kept; removed lines keep the matching (P8\'s review)');
  {
    // The reviewer's fixture, through the press: whole-photograph crops, the dinner plates read twice, a new stack of salad plates.
    const WP = (id, n, name, at) => PL(id, n, name, [0, 0, 1, 1], { agentAt: at });
    const D = desk([WP('p73', 73, 'White porcelain dinner plates', T1), WP('p87', 87, 'White porcelain dinner plates', T2), WP('p88', 88, 'White porcelain salad plates', T2 + 2)]);
    has(text(D._agDupHtml(7, D._jobInvRefs(7))), '#87 repeats #73 · #88 not matched', 'fixture: the block before the first press');
    eq(D.keep(), 1, 'the first press takes #87');
    has(D.asked[0] || '', 'Not matched to a line of the first reading, and kept:\n  · #88 White porcelain salad plates', 'and says it keeps #88');
    eq(D.live(), [73, 88], 'the salad plates stay');
    const after = D.agentDuplicateGroups(7);
    eq(after.map((g) => [g.rows.map((r) => r.itemNo), g.repeats.length, g.fresh.map((r) => r.itemNo)]), [[[73, 88], 0, [88]]],
      '⚠⚠ after it, #88 is still not matched: #73 stays taken by the removed #87');
    lacks(D._agDupHtml(7, D._jobInvRefs(7)), 'Keep the first reading</button>', 'and Keep is no longer offered');
    eq(D.keep(), false, '⚠⚠ a second press takes nothing');
    eq(D.live(), [73, 88], '⚠⚠ the salad-plate stack is still on the inventory');
    has(D.alerts[0] || '', 'No line of the later reading matches a line of the first', 'and it says why');
    // ⚠⚠ The removed repeat keeps the original it took, whatever the crops would say of what is left: two later lines over one
    // stack, the closer one taken off, and the other is never offered against the same original afterwards.
    const TY = desk([PL('p73', 73, 'Dinner plates', [0.5, 0.4, 1, 0.8], { agentAt: T1 }), PL('p87', 87, 'Dinner plates', [0.5, 0.4, 1, 0.8], { agentAt: T2 }),
      PL('p88', 88, 'Dinner plates, top of the stack', [0.55, 0.4, 1, 0.75], { agentAt: T2 + 2 })]);
    eq(TY.keep(), 1, 'fixture: Keep takes #87, the closer repeat of #73');
    const ty = TY.agentDuplicateGroups(7)[0];
    eq([ty.repeats.length, ty.fresh.map((r) => r.itemNo)], [0, [88]], '⚠⚠ #88 is still not matched: the removed #87 keeps #73');
    eq([TY.keep(), TY.live()], [false, [73, 88]], '⚠⚠ and a second press takes nothing');
    // A repeat whose original was removed is the copy that stands: never offered to Keep.
    const R = desk(ELLISON());
    R.agentDropDuplicate(7, 'p73');
    const rg = R.agentDuplicateGroups(7)[0];
    eq([rg.rows.map((r) => r.itemNo), rg.repeats.map((p) => [p.line.itemNo, p.of.itemNo]), rg.fresh.map((r) => r.itemNo)], [[81, 87, 88], [[88, 81]], []],
      '⚠ the first reading\'s #73 removed: #87 repeats nothing still listed, and is neither a repeat nor unmatched');
    eq([R.keep(), R.live()], [1, [81, 87]], '⚠ Keep takes #88 alone: #87, the dinner plates that stand, stays');
    // Two photographs read twice in one room: Keep on one takes only its own repeats.
    const B = (id, n, name, crop, at, from) => PL(id, n, name, crop, Object.assign({ agentAt: at, qty: 1, filename: 'B.jpg', driveFileId: 'FID_B' }, { derivedFrom: from }));
    const TWO = desk([PL('p1', 1, 'Dinner plates', [0, 0, 0.5, 0.5], { agentAt: T1, qty: 1, derivedFrom: undefined }), PL('p2', 2, 'Dinner plates', [0, 0, 0.5, 0.5], { agentAt: T2, qty: 1, derivedFrom: 'p1' }),
      B('b1', 11, 'Teapot', [0.5, 0.5, 1, 1], T1 + 100, undefined), B('b2', 12, 'Teapot', [0.5, 0.5, 1, 1], T2 + 100, 'b1')]);
    const tg = TWO.agentDuplicateGroups(7);
    eq(tg.map((g) => [g.rows.map((r) => r.itemNo), g.repeats.map((p) => p.line.itemNo)]), [[[1, 2], [2]], [[11, 12], [12]]], 'fixture: two photographs, each read twice, two groups');
    TWO.agentKeepFirstReading(7, TWO._agDupHandle(tg[0].key));
    eq(TWO.live(), [1, 11, 12], '⚠ Keep on the plates takes the plates\' repeat alone, never the teapot\'s');
    // Keep frees what Agent Two waited on, as Remove does.
    const LP = desk([PL('p1', 1, 'Brass table lamp', [0.2, 0.2, 0.6, 0.8], { agentAt: T1, qty: 1, roomIdx: 3, ts: 10, derivedFrom: undefined }),
      PL('p5', 5, 'Brass table lamp with linen shade', [0.2, 0.2, 0.6, 0.8], Object.assign({ agentAt: T2, qty: 1, roomIdx: 3, ts: 10, derivedFrom: 'p1' }, LINK('q9'))),
      RC('q9', 9, 'Lamp, brass, pleated shade', Object.assign({ ts: 20 }, LINK('p5')))]);
    eq(Object.keys(LP.agentValueWaiting(7)).sort(), ['p5', 'q9'], 'fixture: the repeat waits on the first reading, the lamp photographed again on the repeat');
    LP.keep();
    eq(LP.sent(), [['p1', 'q9']], '⚠ Keep the first reading: what waited on the repeat is valued by itself');
  }

  group('D · ⚠⚠ Agent Two waits on the later line of a pair that is plainly one thing (ACC-02)');
  {
    const P = (o1, o2) => [RC('s1', 1, 'Oil painting, harbor scene', Object.assign(LINK('s2'), { ts: 10 }, o1 || {})),
      RC('s2', 2, 'Harbor painting in gilt frame', Object.assign(LINK('s1'), { ts: 20 }, o2 || {})),
      RC('s3', 3, 'Chesterfield sofa')];
    const D = desk(P());
    eq(Object.keys(D.agentValueWaiting(7)), ['s2'], 'the line photographed later waits');
    eq(D.agentValueWaiting(7).s2.stableId, 's1', 'on the earlier one');
    D.agentValueAuto(7);
    eq(D.sent(), [['s1', 's3']], '⚠⚠ the automatic run values the earlier line and leaves the later one');
    has(D._avValueButtonHtml(D.jobs[0]), 'Value 2 lines', 'Value N lines counts what it would send');
    D.agentValueRun(7);
    has(D.asked[0] || '', '1 line waits on a possible duplicate (#2 and #1): Remove the extra line or press Not duplicates', 'Value N lines says what waits, and how to free it');
    eq(D.sent()[1], ['s1', 's3'], 'and leaves it out');
    eq(Object.keys(desk(P(LINK('s2', 'medium'), LINK('s1', 'medium'))).agentValueWaiting(7)), [], 'a pair read as very likely one thing is valued as ever');
    eq(Object.keys(desk(P(LINK('s2', 'low'), LINK('s1', 'low'))).agentValueWaiting(7)), [], 'and one read as possibly one thing');
    eq(Object.keys(desk(P({ dupPairs: undefined })).agentValueWaiting(7)), ['s2'], 'the pair\'s answer read off either line');
    eq(Object.keys(desk(P({ ts: 30 })).agentValueWaiting(7)), ['s1'], 'the later photograph waits, whichever number it has');
    eq(Object.keys(desk(P({ dupOKIn: ['n1'] }, { dupOKIn: ['n1'] })).agentValueWaiting(7)), [], 'a pair a person answered: nothing waits');
    eq(Object.keys(desk(ELLISON()).agentValueWaiting(7)).sort(), ['p87', 'p88'], 'a photograph read twice: its repeats wait');
    // Not duplicates hands the waiting line to the automatic run; Remove of the earlier line does too.
    const N = desk(P());
    N.notDup();
    eq(N.sent(), [['s1', 's2', 's3']], '⚠ Not duplicates: the later line is valued by itself, with the rest');
    const R = desk(P());
    R.agentDropDuplicate(7, 's1');
    eq(R.sent(), [['s2', 's3']], 'Remove of the earlier line: the later one is valued');
    const R2 = desk(P());
    R2.agentDropDuplicate(7, 's2');
    eq(R2.started, [], 'Remove of the later line frees nothing, and starts nothing');
    eq(desk(P()).agentValueRun(7), undefined, 'fixture: the run returns nothing');
    const all = desk(P().slice(0, 2).map((r, i) => i === 0 ? Object.assign(r, { fmv: 500, valuedBy: 'desk' }) : r));
    all.agentValueRun(7);
    has(all.alerts[0] || '', '1 line waits on a possible duplicate', 'only a waiting line left: it says so, and sends nothing');
    eq(all.started, [], 'nothing sent');
    // A released line that already has a figure is no reason to run (the release hands on what waited, nothing else).
    const FG = desk(P(null, { fmv: 2100, valuedBy: 'desk' }));
    FG.notDup();
    eq(FG.started, [], 'a released line with a figure of its own: nothing is started');
  }

  group('D2 · ⚠⚠ each pair\'s own room-check answer heads its group and decides the wait (P8\'s review)');
  {
    // Day one: the room check links the sofa and the armchair as plainly one thing; a person says they are two things.
    const S = desk([RC('a', 10, 'Tufted linen sofa'), RC('b', 11, 'Club armchair'), RC('c', 12, 'Linen sofa, three-seat', { ts: 30 })]);
    const room = { photos: ['a', 'b', 'c'].map((id) => ({ lines: [S.ref(id)] })) };
    S._arWrite(7, room, { doubles: [{ ids: ['a', 'b'], confidence: 'high', why: 'The same armchair in the corner.' }] });
    S.notDup();
    eq(S.groups(), [], 'fixture: day one answered');
    // Day two: the check reads the room again, still linking the armchair pair, and now the two sofas, less surely.
    S._arWrite(7, room, { doubles: [{ ids: ['a', 'b'], confidence: 'high', why: 'The same armchair in the corner.' },
      { ids: ['a', 'c'], confidence: 'low', why: 'Two sofas of a similar colour; could be one.' }] });
    const g = S.agentDuplicateGroups(7);
    eq(g.map((x) => [x.rows.map((r) => r.stableId), x.why, x.conf]), [[['a', 'c'], 'Two sofas of a similar colour; could be one.', 'low']],
      '⚠⚠ the new group is headed by its own pair\'s sentence and confidence, never the answered armchair pair\'s');
    has(text(S._agDupHtml(7, S._jobInvRefs(7))), 'Two sofas of a similar colour; could be one. room check: possibly one thing', 'the block says so');
    eq(Object.keys(S.agentValueWaiting(7)), [], '⚠⚠ and Agent Two waits on nothing: the pair was read as low');
    eq(S._arLineWhy(7, S.ref('a')), 'Two sofas of a similar colour; could be one.', 'the row\'s chip reads the line\'s open pair, not the answered one');
    // A line linked high to one line and low to another: only the high pair waits.
    const W = desk([RC('a', 10, 'Tufted linen sofa', { ts: 10 }), RC('b', 11, 'Club armchair', { ts: 20 }), RC('c', 12, 'Linen sofa, three-seat', { ts: 30 }), RC('d', 13, 'Oak side table', { ts: 5 })]);
    const room2 = { photos: ['a', 'b', 'c', 'd'].map((id) => ({ lines: [W.ref(id)] })) };
    W._arWrite(7, room2, { doubles: [{ ids: ['a', 'b'], confidence: 'high', why: 'x' }] });
    W.notDup();
    W._arWrite(7, room2, { doubles: [{ ids: ['a', 'b'], confidence: 'high', why: 'x' }, { ids: ['a', 'c'], confidence: 'low', why: 'y' }, { ids: ['c', 'd'], confidence: 'high', why: 'z' }] });
    const w = W.agentValueWaiting(7);
    eq(Object.keys(w).map((k) => k + ' on ' + w[k].stableId), ['c on d'], '⚠⚠ the high pair\'s later line waits; the low pair holds nothing back');
  }

  group('D3 · ⚠⚠ a rename, a close-up or a press mid-chain never goes round the wait (P8\'s review)');
  {
    const P = () => [RC('s1', 1, 'Oil painting, harbor scene', Object.assign(LINK('s2'), { ts: 10 })),
      RC('s2', 2, 'Harbor painting in gilt frame', Object.assign(LINK('s1'), { ts: 20 })), RC('s3', 3, 'Chesterfield sofa', { fmv: 900, valuedBy: 'desk' })];
    const D = desk(P());
    D.ref('s2').objectName = 'Harbor scene oil on canvas, gilt frame';
    eq(D.agentValueAfterRename(7, 's2'), false, '⚠⚠ the waiting line renamed: Agent Two is not sent it');
    eq(D.agentValueAfterCloseUp(7, 's2'), false, '⚠⚠ nor once a close-up is added to it');
    eq(D.started, [], 'nothing started');
    eq(D._avDupHeld[7], { s2: 'closeup' }, 'the press is held for the line');
    D.notDup();
    eq(D.sent(), [['s1'], ['s2']], '⚠ released: the earlier line valued by the run, the held line on its own, once each');
    eq(D._avForceComps.s2, 1, 'researched, as the close-up asked');
    eq(D._avDupHeld[7], {}, 'and the hold is taken');
    // A rename queued behind a run that was out, its line come to wait meanwhile: held at the run's end, never sent by it.
    const Q = desk([RC('s1', 1, 'Oil painting, harbor scene', { ts: 10 }), RC('s2', 2, 'Harbor painting in gilt frame', { ts: 20 })]);
    Q._avRun[7] = { running: true, ids: {}, out: {} };
    eq(Q.agentValueAfterRename(7, 's2'), true, 'fixture: renamed while a run is out, queued behind it');
    Object.assign(Q.ref('s1'), LINK('s2')); Object.assign(Q.ref('s2'), LINK('s1'));
    Q._avFinish(7);
    eq(Q.started, [], '⚠ the run ends: the queued line, now waiting, is not sent');
    eq(Q._avDupHeld[7], { s2: 'rename' }, 'and is held for its release');
    // A rename of a line that does not wait goes as ever.
    const E = desk(P());
    eq(E.agentValueAfterRename(7, 's1'), true, 'the earlier line renamed: valued at once');
    // Not duplicates while the room check or Agent One is out: the chain's own end values what is freed.
    const M = desk(P());
    M._arRun[7] = { running: true };
    M.notDup();
    eq(M.started, [], '⚠⚠ a press while the room check is out starts nothing');
    const A1 = desk(P());
    A1._agRun[7] = { running: true };
    A1.notDup();
    eq(A1.started, [], 'nor while Agent One is out');
  }

  group('E · ⚠⚠ the schedules: an open double count is DRAFT, named, its signature withheld (ACC-02, INV-01)');
  {
    // Probate: the Court Inventory.
    const C = papers({ matterType: 'probate' }, PAINTINGS());
    const ci = C.print('printCourtInventory'), ct = text(ci);
    has(ct, 'DRAFT — 1 possible double count not yet decided: #1 and #2', '⚠⚠ the status names it in the words asked for');
    lacks(ct, 'Reviewed and adopted by', 'and the adoption block is withheld');
    has(ct, 'a final copy is issued once Havellin has decided whether each pair is one item or two', 'the draft box says what issues the final copy');
    has(ct, 'Both lines of each possible double count are in the total above, so it may count an item twice: #1 Oil painting, harbor scene, gilt frame ($2,400) and #2 Harbor painting in gilt frame ($2,100).',
      'and, on a page with no number column, which lines and figures');
    has(ct, '$5,700', 'the page still prints, its total as recorded (nothing merged)');
    // The EIR names it under its stamp.
    const er = text(C.print('printEstateInventoryReport'));
    has(er, 'IN PROGRESS', 'the Estate Inventory Report is IN PROGRESS for it');
    has(er, '1 possible double count not yet decided: #1 and #2. Both lines of each are in the total below', '⚠ and names the pair under its stamp');
    // Not duplicates: FINAL.
    C.agentNotDuplicate(7, C._agDupHandle(C.agentDuplicateGroups(7)[0].key));
    const ci2 = text(C.print('printCourtInventory'));
    lacks(ci2, 'double count', 'Not duplicates pressed: nothing named');
    has(ci2, 'FINAL', 'FINAL');
    has(ci2, 'Reviewed and adopted by', 'with its adoption block');
    // Remove: FINAL, the total without the extra line.
    const R = papers({ matterType: 'probate' }, PAINTINGS());
    R.agentDropDuplicate(7, 's2');
    const ri = text(R.print('printCourtInventory'));
    has(ri, 'FINAL', 'Remove pressed: FINAL');
    has(ri, '$3,600', 'over the total without it');
    // The Trust Schedule on a trust-only matter: the same rule.
    const T = papers({ matterType: 'trust', trustName: 'Butler Family Trust' }, PAINTINGS());
    const ts = text(T.print('printTrustSchedule'));
    has(ts, 'DRAFT — 1 possible double count not yet decided: #1 and #2', '⚠ the Trust Schedule too');
    lacks(ts, 'Received for the trust', 'its receipt line withheld');
    has(ts, 'may count an item twice', 'and the note under its total');
    T.agentNotDuplicate(7, T._agDupHandle(T.agentDuplicateGroups(7)[0].key));
    const ts2 = text(T.print('printTrustSchedule'));
    eq([ts2.indexOf('FINAL') >= 0, ts2.indexOf('Received for the trust') >= 0, ts2.indexOf('double count') >= 0], [true, true, false], 'Not duplicates: FINAL, received, nothing named');
    // Only the page's own lines: a pair split across the two schedules counts on neither.
    const B = papers({ matterType: 'both' }, PAINTINGS({ assetTrack: 'Trust' }, { assetTrack: 'Probate' }));
    lacks(text(B.print('printCourtInventory')), 'double count', 'one line on each schedule: the Court Inventory counts it once');
    lacks(text(B.print('printTrustSchedule')), 'double count', 'and so does the Trust Schedule');
    // Several, in one sentence.
    const many = PAINTINGS().concat([LINE('s4', 4, 'Pair of brass candlesticks', 300, { namedBy: 'agent', agentName: 'Pair of brass candlesticks', driveFileId: 'F4' }),
      LINE('s5', 5, 'Pair of brass candlesticks', 300, { namedBy: 'agent', agentName: 'Pair of brass candlesticks', driveFileId: 'F5' })]);
    has(text(papers({ matterType: 'probate' }, many).print('printCourtInventory')), '2 possible double counts not yet decided: #1 and #2; #4 and #5', 'two, in one sentence');
    // A schedule with nothing doubled is as it was.
    const plain = papers({ matterType: 'probate' }, [LINE('s3', 3, 'Chesterfield sofa', 1200)]);
    const pt = text(plain.print('printCourtInventory'));
    has(pt, 'FINAL', 'nothing doubled: FINAL');
    lacks(pt, 'double count', 'and nothing said');
    // ⚠⚠ A photograph read twice: each repeat with its original is its own double count (P8's review: one across four lines).
    const PLATE = (id, n, name, crop, fmv, over) => LINE(id, n, name, fmv, Object.assign({ roomIdx: 2, namedBy: 'agent', agentName: name, agentConf: 'medium',
      category: 'General/Household', qty: 8, ts: 1000, filename: 'HVL_Kitchen_INV_5.jpg', driveFileId: 'FID_P', crop: crop }, id === 'p73' ? {} : { derivedFrom: 'p73' }, over || {}));
    const FOUR = () => [
      PLATE('p73', 73, 'Hand-painted tin-glazed earthenware dinner plates, yellow bird and blue flower', [0.46, 0.38, 1, 0.78], 240, { agentAt: T1 }),
      PLATE('p81', 81, 'Hand-painted tin-glazed earthenware salad plates, matching', [0.03, 0.43, 0.45, 0.78], 160, { agentAt: T1 + 3 }),
      PLATE('p87', 87, 'Hand-painted majolica dinner plates, yellow bird and blue flower design', [0.5, 0.4, 0.98, 0.8], 220, { agentAt: T2 }),
      PLATE('p88', 88, 'Hand-painted majolica salad or dessert plates, matching', [0.05, 0.42, 0.44, 0.8], 150, { agentAt: T2 + 2 })];
    const TF = papers({ matterType: 'trust', trustName: 'Ellison Family Trust' }, FOUR());
    const tf = text(TF.print('printTrustSchedule'));
    has(tf, 'DRAFT — 2 possible double counts not yet decided: #87 and #73; #88 and #81', '⚠⚠ the Ellison four: two double counts, each repeat with its original');
    has(tf, 'Both lines of each possible double count are in the total above, so it may count an item twice: #87 Hand-painted majolica dinner plates, yellow bird and blue flower design ($220) and #73',
      'the note pairs them the same way');
    // A line of the later reading not matched to the first is named apart.
    const FIVE = FOUR().concat([PLATE('p89', 89, 'Ceramic teapot, cobalt glaze', [0.2, 0.05, 0.4, 0.3], 90, { agentAt: T2 + 4, qty: 1 })]);
    const tv = text(papers({ matterType: 'trust', trustName: 'Ellison Family Trust' }, FIVE).print('printTrustSchedule'));
    has(tv, '2 possible double counts not yet decided: #87 and #73; #88 and #81; #89 not matched to the first reading of its photograph', 'a line not matched is named apart, never counted as a pair');
    has(tv, '#89 Ceramic teapot, cobalt glaze ($90) was read again off the same photograph and not matched to a line of the first reading.', 'and so in the note');
    // A group of three: every line, not both.
    const TRIO = PAINTINGS().slice(2).concat(['s4', 's5', 's6'].map((id, i) => LINE(id, 4 + i, 'Pair of brass candlesticks', 300, { namedBy: 'agent', agentName: 'Pair of brass candlesticks', driveFileId: 'F' + id })));
    const T3P = papers({ matterType: 'probate' }, TRIO);
    const t3 = text(T3P.print('printCourtInventory'));
    has(t3, '1 possible double count not yet decided: #4, #5 and #6', 'three lines of one name: one double count');
    has(t3, 'Every line of each possible double count is in the total above', '⚠ never "both lines" for three');
    has(t3, 'a final copy is issued once Havellin has decided whether each possible double count is one item or more', 'and the final copy\'s words fit it');
    has(text(T3P.print('printEstateInventoryReport')), 'Every line of each is in the total below until it is decided whether they are one item or more.', 'the Estate Inventory Report\'s sentence too');
    // Seven: six named, then the count of the rest.
    const SEVEN = [];
    for (let i = 0; i < 7; i++) ['a', 'b'].forEach((x, j) => SEVEN.push(LINE('g' + i + x, 10 + i * 2 + j, 'Side chair ' + String.fromCharCode(65 + i), 100, { namedBy: 'agent', agentName: 'Side chair ' + String.fromCharCode(65 + i), driveFileId: 'F' + i + x })));
    const s7 = text(papers({ matterType: 'probate' }, SEVEN).print('printCourtInventory'));
    has(s7, '7 possible double counts not yet decided: #10 and #11; #12 and #13; #14 and #15; #16 and #17; #18 and #19; #20 and #21; and 1 more', '⚠ six named, then how many more');
    lacks(s7, '#22 and #23', 'the seventh not named');
    // The estate package's question names it (P8's review: the confirm that makes an interim copy deliberate said nothing).
    const PK = sandbox({ fns: PAPER_FNS.concat(['probatePackageGaps', '_planRoomStatus']), vars: PAPER_VARS,
      stubs: { document: domStub({}), jobs: [Object.assign({}, ESTATE, { matterType: 'probate' })], _photoRefs: { 7: PAINTINGS() }, jobPlanStore: {},
        invReleaseCautions: () => [], _invPrintThumb: () => '', _invThumbFor: () => '' } });
    const gaps = val(attempt(() => PK.probatePackageGaps(7)), []);
    ok(Array.isArray(gaps) && gaps.indexOf('1 possible double count not yet decided: #1 and #2') >= 0, '⚠⚠ the package\'s question names the double count (' + JSON.stringify(gaps) + ')');
    PK._photoRefs[7] = PAINTINGS(LINK('s2', 'high', 'x'), Object.assign(LINK('s1', 'high', 'x'), { deletedAt: 9 }));
    const gaps2 = val(attempt(() => PK.probatePackageGaps(7)), []);
    ok(Array.isArray(gaps2) && !gaps2.some((x) => /double count/.test(x)), '…and nothing once it is answered');
    has(live(fn('probatePackageGaps')), 'invDoubleCounts(job, ', 'the package reads the one rule');
    // The read decides nothing on either schedule (Q109), and nothing is merged.
    ['printCourtInventory', 'printTrustSchedule', 'printEstateInventoryReport'].forEach((p) => has(live(fn(p)), 'invDoubleCounts(job, ', p + ' reads the one rule'));
    lacks(live(fn('invDoubleCounts')), 'deletedAt', 'the rule never removes a line');
  }
};
