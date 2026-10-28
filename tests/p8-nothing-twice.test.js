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
//     never shown while the work bar said one was flagged. It is recorded for the pair (`dupOKWith`, agentDupCleared).
//   Nothing is merged by itself (CLAUDE.md, Decided).
// ─────────────────────────────────────────────────────────────────────────────
const { sandbox, fn, domStub } = require('./harness.js');

const live = (s) => String(s).split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
const text = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&middot;/g, '·').replace(/&mdash;/g, '—').replace(/&amp;/g, '&')
  .replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
const attempt = (f) => { try { return { ok: true, val: f() }; } catch (e) { return { ok: false, err: String(e && e.message || e) }; } };
const val = (r, dflt) => (r && r.ok ? r.val : (dflt === undefined ? 'threw: ' + (r && r.err) : dflt));

// ─── The desk's side: the grouper, the presses, the room check's writer, what Agent Two waits on ───
const DESK_FNS = ['agentDupCleared', 'agentNamedTwice', 'agentDuplicateGroups', '_agDupEligible', '_arDupEligible', '_agNameKey',
  '_agDupIndex', '_agDupHtml', '_agDupHandle', '_agDupUnhandle', 'agentDropDuplicate', 'agentNotDuplicate', 'agentKeepFirstReading',
  '_invItemNo', '_invRoomName', '_getPhotoRef', '_setPhotoRef', '_jobInvRefs', '_invJob', '_invTombstoneLine', '_invStampBy', 'deviceUser',
  'savePhotoRefs', '_arWrite', '_arStateHtml', '_arState', 'agentValueWaiting', '_avDupReleased', 'agentValueAuto', 'agentValueRun',
  '_avValueButtonHtml', 'agentValueableRefs', '_avHasFigure', '_invHasValue', '_invHasPhoto', '_avState'];
const DESK_VARS = ['AGENT_PASS_GAP_MS', 'AGENT_ROOM_CONF_RANK', 'AGENT_ROOM_CONF_WORDS', '_arRun', '_avRun'];

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
    }, over.stubs || {}),
  });
  c.started = started; c.sent = () => started.map((ids) => ids.slice().sort()); c.badges = badges; c.asked = asked; c.alerts = alerts;
  c.ref = (id) => c._getPhotoRef(7, id);
  c.groups = () => c.agentDuplicateGroups(7).map((g) => g.rows.map((r) => r.stableId));
  return c;
}

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
  'agentDupCleared', 'agentNamedTwice', 'agentDuplicateGroups', '_agDupEligible', '_arDupEligible', '_agNameKey', 'invDoubleCounts',
  'agentNotDuplicate', 'agentDropDuplicate', '_agDupHandle', '_agDupUnhandle', '_getPhotoRef', '_setPhotoRef', '_invTombstoneLine', '_invStampBy',
  'deviceUser', 'agentValueWaiting', '_avDupReleased'];
const PAPER_VARS = ['_agRun', '_avRun', '_arRun', 'AGENT_NOTICE_KINDS',
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
    dupWith: ['s2'], dupConf: 'high', dupWhy: 'The harbor painting: over the sofa in one, close up in the other.', driveFileId: 'F1' }, over1 || {})),
  LINE('s2', 2, 'Harbor painting in gilt frame', 2100, Object.assign({ category: 'Art & Décor', namedBy: 'agent', agentName: 'Harbor painting in gilt frame',
    dupWith: ['s1'], dupConf: 'high', dupWhy: 'The harbor painting: over the sofa in one, close up in the other.', driveFileId: 'F2' }, over2 || {})),
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
    const D = desk([RC('s0', 1, 'Tufted linen three-seat sofa', { dupWith: ['s2'], dupConf: 'low' }), RC('s2', 2, 'Club chair', { dupWith: ['s0'], dupConf: 'low' })]);
    eq(D.groups(), [['s0', 's2']], 'fixture: day one, the room check links the sofa and the armchair');
    D.agentNotDuplicate(7, D._agDupHandle(D.agentDuplicateGroups(7)[0].key));
    eq([D.ref('s0').dupOKWith, D.ref('s2').dupOKWith], [['s2'], ['s0']], '⚠ Not duplicates records, on each line, the line it is separate from');
    eq([D.ref('s0').dupOK, D.ref('s2').dupOK], [undefined, undefined], 'and nothing on the line itself');
    eq(D.groups(), [], 'the pair goes quiet');
    // Day two: a new photograph of the same sofa, which the room check links to s0.
    D._photoRefs[7].push(RC('s6', 6, 'Tufted linen three-seat sofa', { dupWith: ['s0'], dupConf: 'high', dupWhy: 'The same sofa from two sides.' }));
    D.ref('s0').dupWith = ['s6']; D.ref('s0').dupConf = 'high';
    eq(D.groups(), [['s0', 's6']], '⚠⚠ the new double is shown: the armchair answer does not cover it');
    eq(Object.keys(D._agDupIndex(7, D._jobInvRefs(7))).sort(), ['s0', 's6'], 'and both rows wear the chip');
    // The pair's answer stands though one half's newer copy has lost the list.
    const E = desk([RC('a', 1, 'Brass table lamp', { dupOKWith: ['b'] }), RC('b', 2, 'Brass table lamp')]);
    eq(E.groups(), [], 'either half naming the other answers the pair');
    const F = desk([RC('a', 1, 'Brass table lamp', { dupOKWith: ['b'] }), RC('b', 2, 'Brass table lamp'), RC('c', 3, 'Brass table lamp')]);
    eq(F.groups(), [['a', 'b', 'c']], 'a third lamp of the same name is flagged with them, the answered pair joined through it');
    F.agentNotDuplicate(7, F._agDupHandle(F.agentDuplicateGroups(7)[0].key));
    eq([F.ref('a').dupOKWith, F.ref('b').dupOKWith, F.ref('c').dupOKWith], [['b', 'c'], ['a', 'c'], ['a', 'b']], 'Not duplicates again: every pair of the group, with what each held');
    eq(F.groups(), [], 'and quiet');
    // A same-name pair answered, and the room check linking one of them elsewhere.
    const G = desk([RC('a', 1, 'Lamp', { dupOKWith: ['b'], dupWith: ['d'], dupConf: 'medium' }), RC('b', 2, 'Lamp'), RC('d', 4, 'Brass lamp', { dupWith: ['a'], dupConf: 'medium' })]);
    eq(G.groups(), [['a', 'd']], 'the room check\'s link to another line is shown, the answered pair not');
    // The work bar counts only a double the block will show (AGT-03: it said one was flagged that the block did not show).
    const H = desk([RC('a', 1, 'Sofa', { dupOKWith: ['b'] }), RC('b', 2, 'Club chair')]);
    const room = { photos: [{ lines: [H.ref('a')] }, { lines: [H.ref('b')] }] };
    eq(H._arWrite(7, room, { doubles: [{ ids: ['a', 'b'], confidence: 'low', why: 'x' }] }), 0, '⚠ the room check finding an answered pair again counts nothing');
    eq(H.ref('a').dupWith, ['b'], 'though the link is written as the pictures say');
    const H2 = desk([RC('a', 1, 'Sofa', { dupOKWith: ['b'] }), RC('b', 2, 'Club chair'), RC('c', 3, 'Sofa, linen')]);
    const room2 = { photos: [{ lines: [H2.ref('a')] }, { lines: [H2.ref('b')] }, { lines: [H2.ref('c')] }] };
    eq(H2._arWrite(7, room2, { doubles: [{ ids: ['a', 'b'], confidence: 'low', why: 'x' }, { ids: ['a', 'c'], confidence: 'high', why: 'y' }] }), 1, 'and a new one counts');
    // The rule is read by every evidence, never off the line.
    ['_agDupEligible', '_arDupEligible', 'agentNamedTwice'].forEach((f) => lacks(live(fn(f)), 'dupOK', f + ' reads no per-line answer'));
    has(live(fn('agentDuplicateGroups')), 'agentDupCleared(g[i], g[j])', 'the same name, pair by pair');
    has(live(fn('agentDuplicateGroups')), 'agentDupCleared(r, other)', 'the room check\'s link, pair by pair');
    has(live(fn('savePhotoRefs')), 'dupOKWith:r.dupOKWith', 'the answer is on the manifest\'s save list');
    let stored = null;
    const S = desk([RC('a', 1, 'Sofa', { dupOKWith: ['b'] })], { stubs: { localStorage: { setItem: (k, v) => { stored = v; }, getItem: () => null, removeItem() {} } } });
    S.savePhotoRefs(7);
    eq(stored && JSON.parse(stored)[0].dupOKWith, ['b'], '⚠ driven: it survives the save');
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
    has(h, 'Hand-painted majolica dinner plates, yellow bird and blue flower design repeats #73', 'and on each repeat');
    has(D._agDupHtml(7, D._jobInvRefs(7)), '>Keep the first reading</button>', 'Keep the first reading is offered');
    eq((D._agDupHtml(7, D._jobInvRefs(7)).match(/agentDropDuplicate\(/g) || []).length, 4, 'with a Remove on each line still');
    // Without crops, the words of Agent One's two names pair them the same way; a whole-photograph crop counts as none.
    const N = desk(ELLISON().map((r) => Object.assign(r, { crop: undefined })));
    eq(N.agentNamedTwice(N._jobInvRefs(7))[0].repeats.map((p) => [p.line.itemNo, p.of.itemNo]), [[87, 73], [88, 81]], 'no crops: paired by Agent One\'s words');
    const W = desk(ELLISON().map((r) => Object.assign(r, { crop: [0, 0, 1, 1] })));
    eq(W.agentNamedTwice(W._jobInvRefs(7))[0].repeats.map((p) => [p.line.itemNo, p.of.itemNo]), [[87, 73], [88, 81]], 'whole-photograph crops: by the words, not all overlapping');
    // The second reading listing the salad plates first: a whole-photograph crop would pair them with the dinner plates.
    const W2 = desk(ELLISON().map((r) => Object.assign(r, { crop: [0, 0, 1, 1] }, r.itemNo === 88 ? { agentAt: T2 } : r.itemNo === 87 ? { agentAt: T2 + 2 } : {})));
    eq(W2.agentNamedTwice(W2._jobInvRefs(7))[0].repeats.map((p) => [p.line.itemNo, p.of.itemNo]), [[87, 73], [88, 81]], '⚠ whatever order the later reading listed them in');
    // Crops and names disagreeing: the crop decides (the Ellison wordings differ; the parts of the photograph do not).
    const CR = desk(ELLISON().map((r) => Object.assign(r, r.itemNo === 87 ? { agentName: 'Salad plates', objectName: 'Salad plates' } : {})));
    eq(CR.agentNamedTwice(CR._jobInvRefs(7))[0].repeats.map((p) => [p.line.itemNo, p.of.itemNo]), [[87, 73], [88, 81]], 'the crop decides where both have one');
    // A line of the second reading that covers another part of the photograph is new in it.
    const X = desk(ELLISON().concat([PL('p89', 89, 'Ceramic teapot, cobalt glaze', [0.2, 0.05, 0.4, 0.3], { agentAt: T2 + 4, qty: 1 })]));
    const tx = X.agentNamedTwice(X._jobInvRefs(7))[0];
    eq([tx.repeats.map((p) => p.line.itemNo), tx.fresh.map((r) => r.itemNo)], [[87, 88], [89]], '⚠ #89, another part of the photograph, is new in the second reading');
    has(text(X._agDupHtml(7, X._jobInvRefs(7))), '#89 new in the later reading', 'and the block says so');
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
    has(no.asked[0] || '', '#87 Hand-painted majolica dinner plates, yellow bird and blue flower design (repeats #73)', 'naming each line it takes off and what it repeats');
    has(no.asked[0] || '', '#88 Hand-painted majolica salad or dessert plates, matching (repeats #81)', 'both');
    has(no.asked[0] || '', 'No photograph is deleted', 'and what it leaves');
    const D = desk(ELLISON());
    const n = D.agentKeepFirstReading(7, D._agDupHandle(D.agentDuplicateGroups(7)[0].key));
    eq(n, 2, 'two lines taken off');
    eq(D._jobInvRefs(7).map((r) => r.itemNo), [73, 81], '⚠⚠ on the Ellison four, #73 and #81 stay (the three Removes once took both salad lines)');
    eq([D.ref('p87').deletedAt > 0, !!D.ref('p87').deletedBy, D.ref('p88').deletedAt > 0], [true, true, true], 'through the desk\'s removal writer: tombstoned, with who');
    eq(D.groups(), [], 'and the group goes');
    has(D.badges[D.badges.length - 1] || '', '2 repeated lines removed: #87, #88', 'the toast names them');
    // With a line new in the second reading.
    const X = desk(ELLISON().concat([PL('p89', 89, 'Ceramic teapot, cobalt glaze', [0.2, 0.05, 0.4, 0.3], { agentAt: T2 + 4, qty: 1 })]));
    X.agentKeepFirstReading(7, X._agDupHandle(X.agentDuplicateGroups(7)[0].key));
    has(X.asked[0] || '', 'New in the later reading, and kept:\n  · #89 Ceramic teapot, cobalt glaze', 'the question names what it keeps');
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

  group('D · ⚠⚠ Agent Two waits on the later line of a pair that is plainly one thing (ACC-02)');
  {
    const P = (o1, o2) => [RC('s1', 1, 'Oil painting, harbor scene', Object.assign({ dupWith: ['s2'], dupConf: 'high', ts: 10 }, o1 || {})),
      RC('s2', 2, 'Harbor painting in gilt frame', Object.assign({ dupWith: ['s1'], dupConf: 'high', ts: 20 }, o2 || {})),
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
    eq(Object.keys(desk(P({ dupConf: 'medium' }, { dupConf: 'medium' })).agentValueWaiting(7)), [], 'a pair read as very likely one thing is valued as ever');
    eq(Object.keys(desk(P({ dupConf: 'high' }, { dupConf: 'low' })).agentValueWaiting(7)), [], 'one end read less surely: valued');
    eq(Object.keys(desk(P({ ts: 30 })).agentValueWaiting(7)), ['s1'], 'the later photograph waits, whichever number it has');
    eq(Object.keys(desk(P({ dupOKWith: ['s2'] })).agentValueWaiting(7)), [], 'a pair a person answered: nothing waits');
    eq(Object.keys(desk(ELLISON()).agentValueWaiting(7)).sort(), ['p87', 'p88'], 'a photograph read twice: its repeats wait');
    // Not duplicates hands the waiting line to the automatic run; Remove of the earlier line does too.
    const N = desk(P());
    N.agentNotDuplicate(7, N._agDupHandle(N.agentDuplicateGroups(7)[0].key));
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
    // The read decides nothing on either schedule (Q109), and nothing is merged.
    ['printCourtInventory', 'printTrustSchedule', 'printEstateInventoryReport'].forEach((p) => has(live(fn(p)), 'invDoubleCounts(job, ', p + ' reads the one rule'));
    lacks(live(fn('invDoubleCounts')), 'deletedAt', 'the rule never removes a line');
  }
};
