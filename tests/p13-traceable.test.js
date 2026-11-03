'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// P13 OF THE DESK AUDIT (2026-10-28): EVERY LINE TRACEABLE TO ITS PHOTOGRAPH AND NUMBER.
//
//   ROW-02: the thumbnail cache's budget was spent on the session's own copy: after the first full redraw, 142 of 300 rows
//     showed a photograph and the rest the category glyph for the session. Only the stored copy is trimmed now, and an id the
//     server never reached at its size budget is asked again.
//   EST-06, DOC-03: the papers drew only what that capped cache held (110 to 149 photographs on a 300-line house) and told
//     counsel to "re-open this tab with a connection". Each paper fetches its own lines' photographs before it prints, uncapped,
//     into a map kept in memory only (never localStorage), and the sentence is gone; the sends fetch before they build.
//   DOC-06, INV-10: "Photographs are reference-numbered to the line items above" with no link anywhere. Each line's photograph
//     and number link to its file in Drive, and the footer says only that (drafted for Anthony).
//   ACC-20, DOC-05, VAL-13: the Court Inventory and the Trust Schedule carried no item number. Item # and Room columns, one set of
//     column widths, rows by number.
//   VAL-29, DOC-25, INV-09: lots print "(8 × $90)"; on a Form 706 estate a lot over $100 an article is marked on its line, and a
//     group recorded with no count (Agent One's `group`, the 2026-11-02b backend) reads "grouped, untested".
//   INV-18: a count left in a name is hinted on the row. INV-16: a removal carries its reason and the papers' "Numbers not used"
//     footnote explains each gap. INV-20: the summary counts lines and articles.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const { sandbox, fn, domStub } = require('./harness.js');

const live = (s) => String(s).split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
const text = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&middot;/g, '·').replace(/&mdash;/g, '—').replace(/&amp;/g, '&')
  .replace(/&rsquo;/g, '’').replace(/&#(\d+);/g, (m, n) => String.fromCodePoint(+n)).replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
const attempt = (f) => { try { return { ok: true, val: f() }; } catch (e) { return { ok: false, err: String(e && e.message || e) }; } };
const count = (s, needle) => String(s).split(needle).length - 1;
const GS = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'main-sync.gs'), 'utf8');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'havellin.html'), 'utf8');

// A thumbnail at the size the server hands back (about 10 KB before base64, the audit's 14,003 characters as a data URI).
const THUMB = (id) => 'data:image/jpeg;base64,' + id + 'A'.repeat(13980);

// A fetch the test answers by hand: each call is recorded with its body, and answered (or failed) when the test says, through the
// app's own .then chain (fetch → _readAppsScriptJson → the handler), synchronously.
function manualFetch(calls) {
  return function (url, opts) {
    const body = JSON.parse((opts && opts.body) || '{}');
    const chain = [];
    let catcher = null;
    const t = { then(f) { chain.push(f); return t; }, catch(f) { catcher = f; return t; } };
    calls.push({ url, body, answer(v) { let x = v; chain.forEach((f) => { x = f(x); }); }, fail(e) { if (catcher) catcher(e || new Error('offline')); } });
    return t;
  };
}
// Answer a getThumbnails call: every id it asked for, or the first `n` only (the server's size budget), with `missing` named.
const answerThumbs = (call, o) => {
  o = o || {};
  const ids = call.body.fileIds || [];
  const give = ids.slice(0, o.n == null ? ids.length : o.n).filter((id) => (o.missing || []).indexOf(id) < 0);
  const thumbs = {};
  give.forEach((id) => { thumbs[id] = THUMB(id); });
  call.answer({ ok: true, thumbs, missing: o.missing || [] });
};

// ─── The desk's thumbnail cache (ROW-02) ───
const CACHE_FNS = ['_invThumbKey', '_invThumbCache', '_invSaveThumbCache', '_invFileId', '_invThumbFor', '_invMissingThumbIds', '_invEnsureThumbs'];
const CACHE_VARS = ['_invThumbs', '_invThumbTried', '_invThumbBusy', '_invThumbFailed', 'INV_THUMB_BATCH', 'INV_THUMB_CACHE_MAX'];
const SHOT = (i) => ({ stableId: 's' + i, label: 'inventory', itemNo: i + 1, objectName: 'Line ' + (i + 1), driveFileId: 'F' + i,
  driveFileUrl: 'https://drive.google.com/file/d/F' + i + '/view', roomIdx: 1, ts: i, status: 'uploaded' });
function cacheRig(n) {
  const calls = [];
  const refs = [];
  for (let i = 0; i < n; i++) refs.push(SHOT(i));
  const c = sandbox({ fns: CACHE_FNS, vars: CACHE_VARS, stubs: {
    _photoRefs: { 7: refs }, SHEETS_SYNC_URL: 'https://script.example/exec', fetch: manualFetch(calls),
    _withDeviceKey: (u) => u, _readAppsScriptJson: (x) => x, _invPaintThumbs() {},
  } });
  c.calls = calls;
  return c;
}

// ─── The papers ───
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
  '_invProgressStamp', '_invReviewStats', '_invDocHead', '_invWaivedNoteHtml', 'invValBasisShort', 'invLineStandardNote', 'estateValueDateLabel', 'estateAvdOn', 'invAppraiserFor', '_invFileId', '_invNeedsValue',
  'weArrangeAppraisals', 'appraisalDuty', 'estimateAppraiserLines', 'estimateAppraiserNames', 'jobAppraisalDuty', 'approvedEstimateFor', 'estimateDocScope', 'docScopeDef', '_agrOtherAppraisalsBy',
  'roundCents', 'fmt', 'trustInstrumentTitle', 'scheduleSigners', 'scheduleSignLines', 'jobFiduciaries', 'jobListEntries',
  'invLineAccepted', 'invLineHold', '_invLineHolds', '_invPhotoNoteOpen', 'invLineAcceptedOnly', '_invAcceptedStampWords',
  'invIsMAIV', 'invMAIVDefaultCat', 'invAcceptCtx', '_invAcceptCtxOf', 'invListRead', 'agentNoticesOn',
  'agentValueUnreviewed', 'agentValueInternal', 'agentValueStale', 'agentValueSpecialistWorth', '_avHasFigure', 'agentNoticeQuiet',
  'agentDupCleared', 'agentNamedTwice', 'agentDuplicateGroups', '_arPair', '_arPairOpen', '_agDupEligible', '_arDupEligible', '_agNameKey', 'invDoubleCounts', 'invDoubleCountUnits',
  '_getPhotoRef', '_setPhotoRef', '_invStampBy', 'deviceUser',
  'invAppraisalChosen', '_avStampCounts', 'invTotalFloor', '_invFloorTotalHtml',
  // P13's own: the print-only fetch, the links, the footer, the lots, the numbers not used.
  'invInventoryWord', 'invTrustOnlyMatter', 'invDriveFolderWords', 'invPhotosFirst', 'invPrintPhotoIds', 'invFetchPrintPhotos', '_invPrintPump', '_invPrintBatch', 'invPrintPhotoWords', '_invPhotosOpt',
  '_invPrintThumbSrc', '_invPrintThumb', '_invThumbCache', '_invThumbKey', '_invPaperPhotoUrl', '_invItemNoLinkHtml', 'invPaperPhotoSentence',
  'invLotLineHtml', 'invLotWords', 'invLotMarkWords', 'invGroupUncounted', 'invLotSplitState', 'invLotsUntestable', 'invLotArticleValue', 'maivFilingApplies', 'invUnitValue', 'invLineQty',
  'invNumbersNotUsedHtml', 'invNumbersNotUsedText', 'invNumbersNotUsed', 'invRemovedWhyText', '_invRemovedRows', '_invTombstoneLine',
  // P13's review: the group mark's record and its answer.
  '_invPanelGroupHtml', 'invMarkOneArticle'];
const PAPER_VARS = ['_agRun', '_avRun', '_arRun', '_avDupHeld', 'AGENT_NOTICE_KINDS',
  'INV_CONTRACT_DOCS', 'DOC_TIERS', 'DOC_TIER_FROM_SCOPE', 'JOB_STEPS', 'DECEDENT_SERVICES',
  'MATTER_TYPES', 'INV_ASSET_TRACKS', 'INV_TAXONOMY', 'INV_APPRAISAL_THRESHOLD',
  'EXEMPT_CAP_732_402', 'AGR_NOT_AN_ACCOUNTING', 'INV_CATEGORIES', '_invShowRoll', 'INV_GROUP_ORDER', 'INV_CAT_GLYPH', 'INV_UNDECIDED', 'INV_DISPOSITIONS', 'INV_DEFAULT_CATEGORY', 'DOC_SCOPES',
  'AS_FOUND_SUBFOLDER', 'PHOTO_SUBFOLDER', 'MAIV_OTHER', 'MAIV_BY_CATEGORY', '_agDupSetJob', 'INV_OPEN_HOLDS', 'INV_ACCEPT_AMMO_RE',
  'AGENT_PASS_GAP_MS', 'AGENT_ROOM_CONF_RANK',
  '_invThumbs', '_invPrintThumbs', '_invPrintNoThumb', '_invPrintFetch', 'INV_PRINT_PHOTO_PARALLEL', 'INV_PRINT_PHOTO_WATCHDOG_MS', 'INV_THUMB_BATCH',
  'INV_PAPER_PHOTO_TXT', 'INV_REMOVED_WHY_WORDS', 'INV_LOT_ARTICLE_CAP'];
const ESTATE = { id: 7, hvlId: 'HVL-0007', name: 'Tripp Butler', svc: 'probate', matterType: 'probate', gate706: 'no', docTier: 'values', deathDate: '2026-08-14',
  addr: '69 Beach Blvd', city: 'Palm Beach', executor: 'Ruth Butler', executorRole: 'Personal Representative', probateCase: '2026-CP-001234' };
const LINE = (id, no, name, fmv, over) => Object.assign({ stableId: id, itemNo: no, label: 'inventory', roomIdx: 1, objectName: name, category: 'Furniture',
  condition: 'Good', qty: 1, fmv: fmv, valSource: 'Estimate', valuedBy: 'desk', disposition: 'Auction', channel: 'Kodner Galleries', reviewed: true, ts: no, updatedAt: 500,
  driveFileId: 'F' + id, driveFileUrl: 'https://drive.google.com/file/d/F' + id + '/view', status: 'uploaded' }, over || {});
const ROOMS = { 7: { estimate: { rooms: [{ idx: 1, name: 'Living Room' }, { idx: 2, name: 'Kitchen' }, { idx: 3, name: 'Dining Room' }] } } };
function papers(job, items, over) {
  over = over || {};
  const printed = [], badges = [], calls = [], timers = [];
  const c = sandbox({
    fns: PAPER_FNS, vars: PAPER_VARS,
    stubs: Object.assign({ document: domStub({}), jobs: [Object.assign({}, ESTATE, job || {})], _photoRefs: { 7: items }, estimateStore: ROOMS,
      _printDocument: (html, title) => printed.push({ html: html, title: title }),
      _invTouch(r) { r.updatedAt = (r.updatedAt || 0) + 1; return r; },
      renderInventoryTab() {}, showSyncBadge: (m, warn) => badges.push({ m: m, warn: !!warn }), _scheduleInventorySync() {}, agentValueAuto() {},
      invReleaseCautions: () => [], SHEETS_SYNC_URL: over.url === undefined ? 'https://script.example/exec' : over.url,
      fetch: manualFetch(calls), _withDeviceKey: (u) => u, _readAppsScriptJson: (x) => x,
      setTimeout: (f, ms) => { timers.push({ f: f, ms: ms }); return timers.length; }, clearTimeout() {} }, over.stubs || {}),
  });
  c.printed = printed; c.badges = badges; c.calls = calls; c.timers = timers;
  c.print = (name, opt) => { const r = attempt(() => c[name](7, opt || { asHtml: true })); return r.ok ? (r.val && r.val.html) || '' : 'threw: ' + r.err; };
  c.thumbsAsked = () => calls.filter((x) => x.body.action === 'getThumbnails');
  return c;
}

// ─── P13's review (2026-10-28): a root's own call graph, for the acts too large to list by hand (the row's edit, the close-out filer) ───
const { source: _source, decl: _decl } = require('./harness.js');
const _SRCALL = _source();
const _ALL_FNS = new Set((_SRCALL.match(/(^|\n)function\s+([A-Za-z0-9_$]+)\s*\(/g) || []).map((x) => x.replace(/^\n?function\s+/, '').replace(/\s*\($/, '')));
const _ALL_VARS = new Set((_SRCALL.match(/(^|\n)var\s+([A-Za-z0-9_$]+)\s*=/g) || []).map((x) => x.replace(/^\n?var\s+/, '').replace(/\s*=$/, '')));
const _codeOnly = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).map((l) => l.replace(/\s\/\/\s.*$/, '')).join('\n')
  .replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, "''");
function closureLift(roots, stop, stubs) {
  const stopSet = new Set((stop || []).concat(Object.keys(stubs || {})));
  const fns = new Set(), vars = new Set(), queue = roots.map((r) => ['f', r]);
  while (queue.length) {
    const [k, name] = queue.shift();
    if (stopSet.has(name)) continue;
    let body;
    if (k === 'f') { if (fns.has(name)) continue; fns.add(name); try { body = _codeOnly(fn(name)); } catch (e) { continue; } }
    else { if (vars.has(name)) continue; vars.add(name); try { body = _codeOnly(_decl(name)); } catch (e) { continue; } }
    for (const m of body.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)) if (_ALL_FNS.has(m[1]) && !stopSet.has(m[1])) queue.push(['f', m[1]]);
    for (const m of body.matchAll(/[(,]\s*([A-Za-z_$][\w$]*)\s*[,)]/g)) if (_ALL_FNS.has(m[1]) && !stopSet.has(m[1])) queue.push(['f', m[1]]);
    for (const m of body.matchAll(/\b([A-Za-z_$][\w$]*)\b/g)) if (_ALL_VARS.has(m[1]) && !stopSet.has(m[1])) queue.push(['v', m[1]]);
  }
  return sandbox({ fns: [...fns], vars: [...vars], stubs: stubs || {} });
}
// The four lines of P8's Ellison plates: #73 dinner plates and #81 salad plates read first; #87 repeats #73, #88 repeats #81.
const _T1 = 1760000000000, _T2 = _T1 + 7 * 60 * 1000;
const PLATE = (id, n, name, crop, over) => Object.assign({ stableId: id, itemNo: n, label: 'inventory', roomIdx: 2, objectName: name, agentName: name,
  namedBy: 'agent', agentConf: 'medium', category: 'General/Household', qty: 6, ts: 1000, filename: 'HVL-0007_Kitchen_INV_5.jpg',
  driveFileId: 'FID_P', crop: crop, updatedAt: 500 }, id === 'p73' ? {} : { derivedFrom: 'p73' }, over || {});
const PLATES = () => [
  PLATE('p73', 73, 'Hand-painted tin-glazed earthenware dinner plates, yellow bird and blue flower', [0.46, 0.38, 1, 0.78], { agentAt: _T1, qty: 8 }),
  PLATE('p81', 81, 'Hand-painted tin-glazed earthenware salad plates, matching', [0.03, 0.43, 0.45, 0.78], { agentAt: _T1 + 3, qty: 16 }),
  PLATE('p87', 87, 'Hand-painted majolica dinner plates, yellow bird and blue flower design', [0.5, 0.4, 0.98, 0.8], { agentAt: _T2 }),
  PLATE('p88', 88, 'Hand-painted majolica salad or dessert plates, matching', [0.05, 0.42, 0.44, 0.8], { agentAt: _T2 + 2 })];
// A room-check line: each link with its own answer (dupPairs).
const RCL = (id, no, name, others, over) => Object.assign({ stableId: id, itemNo: no, label: 'inventory', roomIdx: 2, objectName: name, agentName: name,
  namedBy: 'agent', agentConf: 'medium', category: 'Art & Décor', qty: 1, ts: no, filename: 'F_' + id + '.jpg', driveFileId: 'FID_' + id, updatedAt: 500,
  dupChkAt: 1, dupWith: others, dupPairs: Object.fromEntries(others.map((o) => [o, { conf: 'high', why: 'the same painting' }])) }, over || {});
const DUP_FNS = ['agentDupCleared', 'agentNamedTwice', 'agentDuplicateGroups', '_arPair', '_arPairOpen', '_agDupEligible', '_arDupEligible', '_agNameKey',
  'agentDropDuplicate', 'agentDupPartner', 'agentKeepFirstReading', '_invItemNo', '_getPhotoRef', '_setPhotoRef', '_jobInvRefs', '_invJob', '_invTombstoneLine',
  '_invStampBy', 'deviceUser', 'savePhotoRefs', 'invNumbersNotUsedText', 'invNumbersNotUsed', 'invRemovedWhyText', '_invRemovedRows', '_agDupUnhandle', '_agDupHandle'];
const DUP_VARS = ['AGENT_PASS_GAP_MS', 'AGENT_ROOM_CONF_RANK', 'AGENT_ROOM_CONF_WORDS', 'INV_REMOVED_WHY_WORDS'];
function dupRig(rows) {
  let clock = 1760100000000;
  class D extends Date { static now() { return clock++; } }
  return sandbox({ fns: DUP_FNS, vars: DUP_VARS, stubs: {
    Date: D, jobs: [Object.assign({}, ESTATE, { matterType: 'trust', svc: 'cleanout', tc: 'Ashley Jerome' })], _photoRefs: { 7: rows },
    estimateStore: ROOMS, _invTouch(r) { r.updatedAt = clock++; return r; }, _scheduleInventorySync() {}, renderInventoryTab() {}, showSyncBadge() {}, alert() {},
    window: { confirm: () => true }, confirm: () => true, SHEETS_SYNC_URL: '', invReadFirst: () => false,
    agentValueWaiting: () => ({}), _avDupReleased() {}, localStorage: { getItem: () => null, setItem() {}, removeItem() {} } } });
}

module.exports = function ({ group, ok, eq, has, lacks }) {

  group('A · ⚠⚠ the desk keeps the session\'s photographs; only the stored copy is trimmed (ROW-02)');
  {
    // The audit's measure: 300 lines, a 14,003-character thumbnail each, the 2,000,000-character budget.
    const C = cacheRig(300);
    for (let b = 0; b < 5; b++) {
      C._invEnsureThumbs(7);
      const call = C.calls[C.calls.length - 1];
      if (call && !call.done) { call.done = true; answerThumbs(call); }
    }
    let k = 0;
    while (C.calls.some((x) => !x.done) && k++ < 10) { const x = C.calls.find((y) => !y.done); x.done = true; answerThumbs(x); }
    const held = Object.keys(C._invThumbs[7] || {}).length;
    eq(held, 300, '⚠⚠ every one of the 300 photographs is still in the session\'s cache after the saves (the audit: 142)');
    let painted = 0;
    C._photoRefs[7].forEach((r) => { if (C._invThumbFor(7, r)) painted++; });
    eq(painted, 300, 'so a full redraw (one Reviewed tick) paints a photograph on every row');
    const stored = JSON.parse(C.__store.hav_media_thumb_7 || '{}');
    const sn = Object.keys(stored).length, len = (C.__store.hav_media_thumb_7 || '').length;
    ok(sn > 100 && sn < 300 && len <= C.INV_THUMB_CACHE_MAX, 'the copy written to localStorage is trimmed to the budget (' + sn + ' kept, ' + len + ' characters)');
    ok(stored.F299 && !stored.F0, 'and keeps the newest, dropping the oldest');
    eq(C.calls.filter((x) => x.body.action === 'getThumbnails').length, 5, 'five batches of sixty, no refetch');
    // A batch the server cut short at its size budget: the ids it never reached are asked again; one Drive cannot serve is not.
    const D = cacheRig(60);
    D._invEnsureThumbs(7);
    answerThumbs(D.calls[0], { n: 40, missing: ['F45'] });
    eq(D.calls.length, 2, '⚠ the server stopped at its budget, so the app asks again for the rest (it marked them tried for good)');
    const again = D.calls[1] ? D.calls[1].body.fileIds : [];
    eq([again.length, again.indexOf('F45') < 0, again[0]], [19, true, 'F40'], 'exactly the nineteen it never reached, never the one Drive said it cannot serve');
    has(live(fn('_invSaveThumbCache')), 'var stored = {}', 'the trimmed copy is its own object');
    lacks(live(fn('_invSaveThumbCache')), 'delete cache[', '⚠⚠ nothing deletes from the session\'s cache');
  }

  group('B · ⚠⚠ a paper fetches its own lines\' photographs before it prints, uncapped, writing nothing to localStorage (EST-06, DOC-03)');
  {
    const lines = [];
    for (let i = 1; i <= 300; i++) lines.push(LINE('L' + i, i, 'Line ' + i, 100, { roomIdx: 1 + (i % 3) }));
    const P = papers({}, lines);
    // The desk's capped cache holds 110 of them, as the audit measured.
    P._invThumbs[7] = {};
    for (let i = 1; i <= 110; i++) P._invThumbs[7]['FL' + i] = THUMB('FL' + i);
    const storeBefore = JSON.stringify(P.__store);
    P.printEstateInventoryReport(7);
    eq(P.printed.length, 0, 'the press does not print yet: it gathers the photographs first');
    const asked = P.thumbsAsked();
    eq(asked.length, 3, 'three batches out at once');
    eq(asked.map((x) => x.body.fileIds.length), [60, 60, 60], 'sixty ids a batch, the server\'s own cap');
    ok(asked.every((x) => x.body.fileIds.every((id) => !P._invThumbs[7][id])), 'only the photographs this session holds none of');
    ok(P.badges.some((b) => /^Gathering 190 photographs from Drive for the Estate Inventory PDF/.test(b.m)), 'the person printing is told: Gathering 190 photographs…');
    asked.forEach((x) => answerThumbs(x));
    const more = P.thumbsAsked().slice(3);
    eq(more.map((x) => x.body.fileIds.length), [10], 'the last ten go once a batch is back');
    more.forEach((x) => answerThumbs(x));
    eq(P.printed.length, 1, 'then the page prints, once');
    const html = P.printed[0] ? P.printed[0].html : '';
    eq(count(html, '<img src="data:image/jpeg'), 300, '⚠⚠ every one of the 300 lines carries its photograph (the audit: 110 to 149)');
    lacks(text(html), 're-open this tab', '⚠⚠ no "re-open this tab" to a reader who has no tab');
    lacks(text(html), 'on this device', 'nor anything about this device');
    eq(JSON.stringify(P.__store), storeBefore, '⚠⚠ the print-only fetch wrote nothing to localStorage');
    eq(Object.keys(P._invThumbs[7]).length, 110, 'and nothing into the desk\'s cache or its budget: the photographs are the print map\'s');
    eq(Object.keys(P._invPrintThumbs[7] || {}).length, 190, 'which holds the 190 it fetched, in memory');
    // Printed again: nothing to fetch.
    P.printEstateInventoryReport(7);
    eq([P.printed.length, P.thumbsAsked().length], [2, 4], 'a second print asks for nothing and prints at once');
    // The send's page (asHtml) never fetches: its caller does, first.
    const Q = papers({}, [LINE('a', 1, 'Sideboard', 900)]);
    has(Q.print('printEstateInventoryReport'), 'Sideboard', 'a page built for a send prints at once');
    eq(Q.thumbsAsked().length, 0, 'and asks for no photograph itself');
    // No Apps Script URL: nothing to fetch from, the page prints with what is held.
    const N = papers({}, [LINE('a', 1, 'Sideboard', 900)], { url: '' });
    N.printEstateInventoryReport(7);
    eq([N.printed.length, N.thumbsAsked().length], [1, 0], 'no URL: printed at once, nothing asked');
  }

  group('C · a photograph that cannot be drawn is linked, in words, and the person printing is told how many');
  {
    const P = papers({}, [LINE('a', 1, 'Sideboard', 900), LINE('b', 2, 'Hall mirror', 300), LINE('c', 3, 'Typed lamp', 40, { manual: true, driveFileId: '', driveFileUrl: '' }),
      LINE('d', 4, 'Lost lamp', 40, { driveFileId: '', driveFileUrl: '' })]);
    P.printEstateInventoryReport(7);
    const call = P.thumbsAsked()[0];
    eq(call ? call.body.fileIds : [], ['Fa', 'Fb'], 'only the lines with a file in Drive are asked for');
    answerThumbs(call, { missing: ['Fb'] });
    const html = P.printed[0] ? P.printed[0].html : '';
    has(html, '<a class="inv-paper-photo" href="https://drive.google.com/file/d/Fa/view"', 'the photograph links to its file');
    has(html, '<a class="inv-paper-photo inv-paper-nothumb" href="https://drive.google.com/file/d/Fb/view"', '⚠ one Drive could not draw still links to it…');
    has(html, '>photo</a>', '…and says "photo", never a category glyph');
    has(html, '>no photo</div>', 'a typed line says "no photo"');
    has(html, '>not in Drive</div>', 'one photographed and never uploaded says "not in Drive"');
    ok(!/[\u{1F4E6}\u{1FA91}\u{1F5BC}]/u.test(html), '⚠ no category glyph on the paper (EST-06: they read as a broken page)');
    ok(P.badges.some((b) => b.warn && b.m === '1 photograph could not be drawn from Drive, so its line links to the photograph in Drive instead.'),
      'the person printing is told, the reader never');
    eq(P._invPrintNoThumb.Fb, 1, 'and Drive\'s refusal is remembered, so the next paper does not ask again');
    P.printEstateInventoryReport(7);
    eq(P.thumbsAsked().length, 1, 'it does not');
    // A batch that fails, or never answers, lets go and the paper prints with links.
    const F = papers({}, [LINE('a', 1, 'Sideboard', 900)]);
    F.printEstateInventoryReport(7);
    F.thumbsAsked()[0].fail(new Error('offline'));
    eq(F.printed.length, 1, 'a failed fetch still prints (flag, never block)');
    has(F.printed[0] ? F.printed[0].html : '', 'href="https://drive.google.com/file/d/Fa/view"', 'with the line linked');
    const W = papers({}, [LINE('a', 1, 'Sideboard', 900)]);
    W.printEstateInventoryReport(7);
    const dog = W.timers.filter((t) => t.ms === W.INV_PRINT_PHOTO_WATCHDOG_MS)[0];
    ok(!!dog, 'each batch arms its watchdog');
    if (dog) dog.f();
    eq(W.printed.length, 1, '⚠ a batch that never answers lets go after INV_PRINT_PHOTO_WATCHDOG_MS, and the paper prints');
    answerThumbs(W.thumbsAsked()[0]);
    eq(W.printed.length, 1, 'an answer after that prints nothing more…');
    ok(!!(W._invPrintThumbs[7] || {}).Fa, '…and is kept for the next paper');
    // A batch the server cut short at its size budget: the ids it never reached are asked again, Drive's refusals are not.
    const cut = [];
    for (let i = 1; i <= 60; i++) cut.push(LINE('c' + i, i, 'Line ' + i, 10));
    const K = papers({}, cut);
    K.printEstateInventoryReport(7);
    answerThumbs(K.thumbsAsked()[0], { n: 40, missing: ['Fc41'] });
    const again = K.thumbsAsked()[1] ? K.thumbsAsked()[1].body.fileIds : [];
    eq([again.length, again[0], again.indexOf('Fc41')], [19, 'Fc42', -1], '⚠ the nineteen the server never reached are asked again, never the one Drive cannot serve');
    if (K.thumbsAsked()[1]) answerThumbs(K.thumbsAsked()[1]);
    eq(K.printed.length, 1, 'then the page prints');
    eq(count(K.printed[0] ? K.printed[0].html : '', '<img src="data:image/jpeg'), 59, 'with all fifty-nine Drive could serve');
    // Two presses while one fetch is out: the second joins it, and asks nothing of its own.
    const J = papers({}, [LINE('a', 1, 'Sideboard', 900)]);
    J.printEstateInventoryReport(7);
    J.printEstateInventoryReport(7);
    eq([J.thumbsAsked().length, J.printed.length], [1, 0], '⚠ a second press while the fetch is out joins it: one request, nothing printed yet');
    answerThumbs(J.thumbsAsked()[0]);
    eq([J.thumbsAsked().length, J.printed.length], [1, 2], 'and both print once it lands, nothing asked twice');
    // The schedules draw no photograph, so they never wait on one.
    const S2 = papers({}, [LINE('a', 1, 'Sideboard', 900)]);
    S2.printCourtInventory(7);
    eq([S2.thumbsAsked().length, S2.printed.length], [0, 1], 'the Court Inventory prints at once: its number links, it draws no photograph');
  }

  group('D · ⚠⚠ each line\'s number links to its photograph, and the footer says only that (DOC-06, INV-10)');
  {
    const P = papers({}, [LINE('a', 1, 'Sideboard', 900), LINE('b', 2, 'Typed lamp', 40, { manual: true, driveFileId: '', driveFileUrl: '' })]);
    const R = P.print('printEstateInventoryReport');
    has(R, '<a class="inv-no-link" href="https://drive.google.com/file/d/Fa/view" style="color:inherit;">1</a>', 'the Report\'s Ref links to the photograph');
    lacks(R, 'reference-numbered', '⚠⚠ the false claim is gone');
    has(text(R), 'Where an item has a photograph, its number links to it in Drive; the photographs are retained for seven years.', 'the drafted sentence, which is true');
    eq(P.INV_PAPER_PHOTO_TXT, 'Where an item has a photograph, its number links to it in Drive; the photographs are retained for seven years.', 'one constant');
    const T = papers({}, [LINE('b', 2, 'Typed lamp', 40, { manual: true, driveFileId: '', driveFileUrl: '' })]);
    lacks(T.print('printEstateInventoryReport'), 'its number links to it', 'a page with no photograph on it does not say so');
    const C = P.print('printCourtInventory');
    has(C, 'href="https://drive.google.com/file/d/Fa/view"', 'the Court Inventory\'s number links too');
    has(text(C), 'its number links to it in Drive', 'and its footer says so');
    // A line whose file id was kept but no link (an older capture) links by the id.
    eq(P._invPaperPhotoUrl({ driveFileId: 'XYZ1234567' }), 'https://drive.google.com/file/d/XYZ1234567/view', 'a file id alone links to its page');
    eq(P._invPaperPhotoUrl({ manual: true }), '', 'a typed line links nowhere');
  }

  group('E · ⚠⚠ the schedules carry Item # and Room, one set of widths, by number (ACC-20, DOC-05, VAL-13)');
  {
    const P = papers({}, [
      // Photographed in another order than numbered (a restore, a split, a collection's line): the rows still run by number.
      LINE('s23', 23, 'Remington 870 pump shotgun', 500, { category: 'Collectibles', roomIdx: 2, ts: 1 }),
      LINE('s11', 11, 'Remington 870 pump shotgun', 500, { category: 'Collectibles', roomIdx: 1, ts: 2 }),
      LINE('s9', 9, 'Nightstand', 150, { roomIdx: 1, ts: 3 }),
      LINE('s3', 3, 'Grandfather clock', 3500, { roomIdx: 3, ts: 4 }),
    ]);
    const C = P.print('printCourtInventory');
    const heads = (C.match(/<thead>[\s\S]*?<\/thead>/g) || []).map((h) => text(h));
    eq(heads, ['Item # Description Room Condition Basis FMV (total)', 'Item # Description Room Condition Basis FMV (total)'], 'every table heads Item #, Description, Room, Condition, Basis, FMV');
    const cg = C.match(/<colgroup>[\s\S]*?<\/colgroup>/g) || [];
    eq([cg.length, cg[0] === cg[1]], [2, true], 'one set of column widths on every table');
    eq(count(C, 'table-layout:fixed'), 2, 'fixed layout, so the columns do not move from one category to the next');
    const rows = text(C);
    ok(rows.indexOf('11 Remington 870 pump shotgun Living Room') >= 0 && rows.indexOf('23 Remington 870 pump shotgun Kitchen') > rows.indexOf('11 Remington'),
      '⚠⚠ the two shotguns are told apart by number and room, in number order');
    ok(rows.indexOf('3 Grandfather clock Dining Room') >= 0 && rows.indexOf('9 Nightstand Living Room') > rows.indexOf('3 Grandfather clock'), 'and a category runs by number');
    const T = papers({ matterType: 'trust', trustName: 'Butler Family Trust' }, [LINE('s5', 5, 'Hall mirror', 300, { roomIdx: 2 })]);
    const ts = T.print('printTrustSchedule');
    has(text(ts), 'Item # Description Room Condition Basis FMV (total)', 'the Trust Schedule too');
    has(text(ts), '5 Hall mirror Kitchen', 'with the number and the room on the row');
    has(ts, '<td colspan="5"', 'the subtotal spans the five columns before the figure');
  }

  group('F · ⚠⚠ a lot says what each article is worth; on a Form 706 estate the cap is marked on its line (VAL-29, DOC-25, INV-09)');
  {
    const P = papers({ gate706: 'yes' }, [
      LINE('c', 1, 'Copper cookware', 720, { qty: 8, unitVal: 90, category: 'General/Household' }),
      LINE('f', 2, 'Sterling flatware service', 1800, { qty: 12, category: 'Silver & Precious Metal' }),
      LINE('p', 3, 'Cabbage-ware plates', 75, { qty: 7, category: 'General/Household' }),
      LINE('u', 4, 'Ironstone platters', undefined, { qty: 6, valSource: '', category: 'General/Household' }),
      LINE('d', 5, 'Sideboard drawer contents: candles, napkin rings, coasters', 180, { agentGroup: true, category: 'General/Household' }),
      LINE('e', 6, 'Kitchen drawer contents: string, tape', 40, { agentGroup: true, category: 'General/Household' }),
      LINE('s', 7, 'Walnut sideboard', 900),
    ]);
    eq(['c', 'f', 'p', 'u', 'd', 'e', 's'].map((id) => P.invLotSplitState(P._getPhotoRef(7, id), P.jobs[0])),
      ['', 'over', '', 'unvalued', 'nocount', '', ''], 'the four answers: over, a count with no value, a group with no count over $100, and nothing to say');
    eq(P.invLotWords(P._getPhotoRef(7, 'c')), '8 × $90', '"8 × $90": Each × Qty');
    eq(P.invLotWords(P._getPhotoRef(7, 'p')), '7 articles, averaging $10.71', 'an average where Each × Qty does not make the total to the cent');
    eq(P.invLotWords(P._getPhotoRef(7, 'u')), '6 articles', 'a count with no value');
    eq(P.invLotWords(P._getPhotoRef(7, 's')), '', 'nothing on a single article');
    const C = text(P.print('printCourtInventory'));
    has(C, 'Copper cookware (8 × $90)', '⚠ the schedule prints (8 × $90), never "valued as a lot"');
    lacks(C, 'valued as a lot', 'the old words are gone');
    has(C, 'Sterling flatware service (12 × $150) ⚠ averages $150 an article: itemise it for the Form 706', '⚠⚠ the over-cap lot is marked on its own line');
    has(C, 'Ironstone platters (6 articles) ⚠ grouped, untested', 'a lot with no value reads grouped, untested');
    has(C, 'Sideboard drawer contents: candles, napkin rings, coasters ⚠ grouped, untested', '⚠⚠ a group with no count over $100 reads grouped, untested');
    lacks(C, 'string, tape ⚠', 'a group under $100 cannot hold an article over the cap: no mark');
    has(text(P.print('printEstateInventoryReport')), 'Sterling flatware service (12 × $150) ⚠ averages $150 an article', 'the Estate Inventory Report marks it too');
    const N = papers({ gate706: 'no' }, [LINE('f', 2, 'Sterling flatware service', 1800, { qty: 12 })]);
    const nt = text(N.print('printCourtInventory'));
    has(nt, 'Sterling flatware service (12 × $150)', 'without a Form 706 the per-article figure still prints');
    lacks(nt, 'itemise it for the Form 706', 'and no mark: the cap governs a 706 schedule alone');
    eq(P.invLotsUntestable(P._photoRefs[7], P.jobs[0]).map((r) => r.stableId), ['u', 'd'], 'the untestable lots: the unvalued one and the group with no count');
    // The worklist's lot block: the group with no count is listed and the clearance is not said over it.
    const W = sandbox({ fns: ['invGroupUncounted', '_lotSplitWorklistBlock', 'invLotsToSplit', 'invLotsUntestable', 'invLotSplitState', 'invLotArticleValue', 'maivFilingApplies', 'isDecedentJob',
      '_gate706', '_gateYes', '_invItemNo', '_invMoney', 'fmt', 'roundCents'], vars: ['INV_LOT_ARTICLE_CAP', 'DECEDENT_SERVICES'] });
    const J = Object.assign({}, ESTATE, { gate706: 'yes' });
    const wb = text(W._lotSplitWorklistBlock(J, [LINE('c', 1, 'Copper cookware', 720, { qty: 8 }), LINE('d', 5, 'Sideboard drawer contents', 180, { agentGroup: true })]));
    has(wb, '#5 Sideboard drawer contents not counted $180 not testable', 'the worklist lists the group with no count');
    has(wb, '1 grouped line holds more than one article with no count recorded, so the cap cannot be tested on it', '…and says why');
    lacks(wb, 'permits them to stand', '⚠⚠ the clearance is never printed over a group nobody tested');
    has(text(W._lotSplitWorklistBlock(J, [LINE('c', 1, 'Copper cookware', 720, { qty: 8 })])), 'permits them to stand as groups', 'and is, where every lot was tested');
  }

  group('G · Agent One marks a group (the 2026-11-02b backend), and the app keeps the mark');
  {
    const props = (GS.match(/group:\s*\{ type: 'boolean'[^}]*\}/) || [''])[0];
    has(props, "type: 'boolean'", 'record_contents carries a boolean group');
    ok(/required: \['name', 'category', 'qty', 'group', 'confidence', 'basis', 'crop'\]/.test(GS), 'required, so the strict tool answers it on every line');
    has(GS, "'Set group to true on every line that holds more than one article", 'and the prompt says when');
    // RESTATED at the merges with the cell-cap fix (backend 2026-10-28) and with 2026-11-02, which reached main first: this build is 2026-11-02b, carrying them.
    ok(((GS.match(/var BACKEND_VERSION = '([^']+)';/) || [])[1] || '') >= '2026-11-02c', 'main-sync.gs is 2026-11-02c or later (the version carrying both 2026-11-02b builds)');
    const B = sandbox({ vars: ['BACKEND_MIN_VERSION', 'BACKEND_FEATURE_COST'] });
    ok(B.BACKEND_MIN_VERSION >= '2026-11-02c', 'the app relies on it');
    const _v13 = B.BACKEND_FEATURE_COST.version, _p13 = 'a drawer, box or shelf of things Agent One names as one line on a Form 706 estate is not marked as a group';
    // RESTATED on the merge with main's envelope fix (both named 2026-11-02b; 2026-11-02c carries both): the gap is named under
    // 2026-11-02c's vintage, the first, after the envelope's.
    const _at13 = _v13.indexOf(', and ' + _p13);
    // RESTATED on merging P15 (2026-11-02d, which carries 2026-11-02c): 2026-11-02c's vintage now follows P15's, and the gap is under it.
    const _c13 = _v13.indexOf('; on a deployment older than 2026-11-02c, ');
    ok(_c13 > 0 && _v13.indexOf('; on a deployment older than ') === _c13 && _at13 > _c13 && _v13.indexOf('; on a deployment older than ', _c13 + 1) > _at13,
      'and the stale banner names it under 2026-11-02c\'s vintage, which carries it, after P15\'s 2026-11-02e');
    ok(_v13.indexOf('; on a deployment older than 2026-10-28, two devices saving') > _at13 && _at13 >= 0, '…then 2026-10-28\'s gap, by its vintage');
    has(B.BACKEND_FEATURE_COST.version, '; on a deployment older than 2026-10-27e, a figure Agent Two researched', '…then 2026-10-27e\'s gap, by its vintage');
    const A = sandbox({ fns: ['_agWrite', '_getPhotoRef', '_setPhotoRef', '_invAgentCondition', '_invCondIsAgents'], vars: ['INV_CATEGORIES', 'INV_TAXONOMY', 'INV_DEFAULT_CATEGORY', 'AGENT_CONDITIONS'],
      stubs: { _photoRefs: { 7: [{ stableId: 'a', label: 'inventory' }, { stableId: 'b', label: 'inventory', agentGroup: true }, { stableId: 'c', label: 'inventory', agentGroup: true }] }, _invTouch: (r) => r } });
    A._agWrite(7, 'a', { name: 'Sideboard drawer contents: candles, napkin rings', category: 'General/Household', qty: 1, group: true, confidence: 'high', basis: 'x' });
    A._agWrite(7, 'b', { name: 'Walnut sideboard', category: 'Furniture', qty: 1, group: false, confidence: 'high', basis: 'x' });
    A._agWrite(7, 'c', { name: 'Walnut sideboard', category: 'Furniture', qty: 1, confidence: 'high', basis: 'x' });
    eq(['a', 'b', 'c'].map((id) => A._getPhotoRef(7, id).agentGroup), [true, undefined, true], 'written where the answer says, taken off on false, left alone by an older deployment\'s answer');
    has(live(fn('savePhotoRefs')), 'agentGroup:r.agentGroup', 'on the manifest\'s save list');
  }

  group('H · a count left in a name is hinted on the row (INV-18)');
  {
    const S = sandbox({ fns: ['invNameCarriesCount', 'invLineQty'], vars: ['INV_COUNT_IN_NAME_RE'] });
    const hit = ['Set of 8 mahogany dining chairs', 'Pair of Staffordshire spaniels', 'Staffordshire spaniels, pair', 'Dinner plates, approx. 7 in stack',
      'Sterling flatware, 30 pieces', 'Stack of 6 dinner plates', 'Sterling flatware service for 12', 'Mahogany dining chairs (8)', 'A dozen crystal goblets'];
    eq(hit.filter((n) => !S.invNameCarriesCount({ objectName: n })), [], 'every count the server\'s log warns of, and the rest, is caught');
    const fine = ['Box of holiday ornaments', 'Lot of hand tools', 'Kitchen drawer contents: string, tape', 'Oil on canvas, 24 x 36 in', 'Walnut six-drawer dresser',
      'Set of hand tools in a red case'];
    eq(fine.filter((n) => S.invNameCarriesCount({ objectName: n })), [], 'a container line, a size or a set with no number is not');
    const SR = new Function('return ' + (GS.match(/var AGENT_COUNT_IN_NAME_RE = (\/.*\/[a-z]*);/) || [, '/$^/'])[1])();
    eq(hit.slice(0, 6).filter((n) => SR.test(n) && !S.invNameCarriesCount({ objectName: n })), [], 'what the server\'s probe warns of, the row hints too');
    const row = live(fn('_renderInvRow'));
    has(row, "invNameCarriesCount(ref)", 'the row asks it');
    has(row, 'count in the name</span>', 'and says "count in the name"');
  }

  group('I · ⚠⚠ a removal carries its reason, and the papers explain each gap in the numbers (INV-16)');
  {
    const lines = [LINE('a', 1, 'Sideboard', 900), LINE('b', 2, 'Sideboard', 900), LINE('c', 3, 'Walnut dresser', 400), LINE('d', 4, '', undefined, { agentConf: 'none', valSource: '' }),
      LINE('e', 5, '', undefined, { valSource: '' }), LINE('f', 6, 'Ottoman', 80), LINE('g', 7, 'Lamp', 30), LINE('h', 8, 'Rug', 200), LINE('k', 9, 'Desk', 300)];
    const P = papers({}, lines);
    const R = (id) => P._getPhotoRef(7, id);
    P._invTombstoneLine(7, R('b'), { why: 'dup', of: 'a' });
    P._invTombstoneLine(7, R('d'));
    P._invTombstoneLine(7, R('e'));
    P._invTombstoneLine(7, R('f'));
    P._invTombstoneLine(7, R('g'));
    P._invTombstoneLine(7, R('h'));
    eq(['b', 'd', 'e', 'f'].map((id) => R(id).removedWhy), ['dup', 'empty', 'blank', 'desk'], 'the press\'s reason, else what the line was when it came off');
    eq(R('b').removedOf, 'a', 'and the line it repeats');
    eq(P.invNumbersNotUsedText(7), 'Numbers not used: #2 a duplicate of #1; #4 nothing to list in its photograph; #5 a blank line, never named; #6 to #8 taken off the list at the desk. '
      + 'A number is never given to another item, so each line taken off the list leaves its number unused.', 'the footnote: each gap and why, runs of one reason joined');
    has(text(P.print('printEstateInventoryReport')), 'Numbers not used: #2 a duplicate of #1', 'on the Estate Inventory Report');
    has(text(P.print('printCourtInventory')), 'Numbers not used: #2 a duplicate of #1', 'and the Court Inventory');
    // A number another line holds again (Restore, or a collision) is not a gap.
    R('c').itemNo = 4;
    lacks(P.invNumbersNotUsedText(7), '#4 nothing', 'a number a live line holds now is no gap');
    // Nothing removed: no footnote.
    eq(papers({}, [LINE('a', 1, 'Sideboard', 900)]).invNumbersNotUsedHtml(7), '', 'nothing taken off: nothing said');
    // The other presses name their reason.
    has(live(fn('agentDropDuplicate')), "why: 'dup', of:", 'Remove under Possible duplicates records a duplicate of the group\'s other line');
    has(live(fn('agentKeepFirstReading')), "why: 'repeat', of: p.of.stableId", 'Keep the first reading, the line it repeats');
    has(live(fn('collectionUseLine')), "why: 'joined', of: line.stableId", 'Use that line, the line it joined');
    has(live(fn('discardShot')), "r.removedWhy = 'photo'", 'the room\'s bin, its photograph deleted');
    has(live(fn('restoreInventoryItem')), 'delete ref.removedWhy', 'Restore takes the reason off');
    ['removedWhy:r.removedWhy', 'removedOf:r.removedOf'].forEach((k) => has(live(fn('savePhotoRefs')), k, 'on the manifest\'s save list: ' + k));
    has(live(fn('_renderRemovedRows')), 'invRemovedWhyText(r, jobId)', 'Removed items shows why');
    // Every paper with item numbers carries the footnote.
    ['printEstateInventoryReport', 'printCourtInventory', 'printTrustSchedule', 'printDispositionLedger', 'printContentsList', 'printContentsRecord']
      .forEach((f) => has(live(fn(f)), 'invNumbersNotUsedHtml(jobId)', f + ' prints Numbers not used'));
  }

  group('J · the summary counts lines and articles (INV-20)');
  {
    const S = sandbox({ fns: ['invGroupUncounted', '_renderInventorySummary', 'invLineQty', 'invFiduciaryMode', 'isDecedentJob', 'invProbateRows', 'matterDef', 'matterTypeOf', 'invStatesEstateValues',
      'docTierProduces', 'docTierOf', 'docTierDef', 'svcHasDocStep', 'roundCents', 'resolveValBasis', 'invValBasisShort'],
      vars: ['INV_CATEGORIES', 'INV_TAXONOMY', 'INV_DISPOSITIONS', 'DECEDENT_SERVICES', 'MATTER_TYPES', 'DOC_TIERS', 'DOC_TIER_FROM_SCOPE', 'JOB_STEPS'],
      stubs: { invNeedsAppraisal: () => false, _money: (v) => '$' + v, _invMoney: (v) => '$' + v, fmtDate2: (d) => d, _invValueAsOfHtml: () => '', _invDateTime: () => 'now',
        maivAggregate: () => ({ count: 0, total: 0, settled: true }), inventoryNetLabel: () => 'Net to Estate', _maivSummaryNotice: () => '' } });
    const a = attempt(() => text(S._renderInventorySummary(ESTATE, [LINE('a', 1, 'Books', 40, { qty: 40, category: 'General/Household' }), LINE('b', 2, 'Chairs', 800, { qty: 8 }), LINE('c', 3, 'Sideboard', 900)])));
    const t = a.ok ? a.val : 'threw: ' + a.err;
    has(t, 'Total Lines 3', 'three lines');
    has(t, 'Total Articles 49', '⚠ holding forty-nine articles');
    has(t, 'Lines Articles', 'and the category table counts both');
    lacks(t, 'Total Items', '"items" no longer means lines here and articles on the schedules');
  }

  group('K · the sends and the close-out filing fetch their pages\' photographs first (DOC-03)');
  {
    const pkg = live(fn('sendProbatePackage'));
    ok(pkg.indexOf('invPrintPhotoIds(jobId, _jobInvRefs(jobId))') > pkg.indexOf('refreshPhotoRefs(') && pkg.indexOf('invFetchPrintPhotos(jobId, _pkgIds') > 0,
      'the estate package: after the sheet is read, every line\'s missing photograph, before a page is built');
    ok(pkg.indexOf('var _pkgBuild = function') < pkg.indexOf('var owed = probatePackageDocs(job)'), 'the pages are built inside the fetch\'s answer');
    const req = live(fn('sendApprovalRequest'));
    ok(req.indexOf('invPrintPhotoIds(jobId, r.items') > 0 && req.indexOf('var r2 = printApprovalRequest(') > req.indexOf('invFetchPrintPhotos(jobId, _reqIds'),
      'the release request: its lines\' photographs, then the page built again with them');
    has(live(fn('_fileCloseoutPaper')), 'invFetchPrintPhotos(jobId, _ids', 'the close-out filer fetches for a paper with photographs');
    ok(/contents: \{[^}]*photos: true/.test(SRC), '…the Contents Record');
    ['printContentsList', 'printEstateInventoryReport', 'printApprovalRequest', 'printContentsRecord', 'printAsFoundRecord']
      .forEach((f) => has(live(fn(f)), 'invPhotosFirst(jobId, ', f + ' gathers its own photographs first'));
  }

  // ═══════════════════════════════ P13'S REVIEW (2026-10-28) ═══════════════════════════════
  group('L · ⚠⚠ Remove under Possible duplicates names the line the group\'s own evidence pairs it with, never the lowest number (the review\'s must-fix)');
  {
    const words = (R) => R.invNumbersNotUsedText(7).replace(/\. A number is never given.*$/, '');
    let R = dupRig(PLATES());
    const g = R.agentDuplicateGroups(7)[0] || { repeats: [] };
    eq(g.repeats.map((p) => p.line.itemNo + '>' + p.of.itemNo), ['87>73', '88>81'], 'fixture: the group\'s own evidence, #87 repeats #73 and #88 repeats #81');
    R.agentDropDuplicate(7, 'p88');
    eq(R._getPhotoRef(7, 'p88').removedOf, 'p81', '⚠⚠ Remove on #88, a repeat: recorded as a duplicate of #81, the line it repeats');
    eq(words(R), 'Numbers not used: #88 a duplicate of #81', '…and the footnote on the schedules says so (it said "#88 a duplicate of #73")');
    R = dupRig(PLATES());
    R.agentDropDuplicate(7, 'p73');
    eq(words(R), 'Numbers not used: #73 a duplicate of #87', '⚠⚠ Remove on #73, an original a later reading repeats: a duplicate of #87 (it said "of #81", dinner plates of salad plates)');
    R = dupRig(PLATES());
    R.agentDropDuplicate(7, 'p81');
    eq(words(R), 'Numbers not used: #81 a duplicate of #88', 'Remove on #81: the line repeating it, #88');
    // A room-check chain: #1~#2 and #2~#3 linked, #1 and #3 never.
    R = dupRig([RCL('a', 1, 'Harbour painting', ['b']), RCL('b', 2, 'Seascape oil', ['a', 'c']), RCL('c', 3, 'Framed seascape', ['b'])]);
    R.agentDropDuplicate(7, 'c');
    eq(words(R), 'Numbers not used: #3 a duplicate of #2', '⚠⚠ a chain: #3 is a duplicate of #2, the line the room check paired it with, never #1');
    // The surest link where a line has two.
    const two = [RCL('a', 1, 'Harbour painting', ['c']), RCL('b', 2, 'Seascape oil', ['c']), RCL('c', 3, 'Framed seascape', ['a', 'b'])];
    two[2].dupPairs = { a: { conf: 'low', why: 'similar frame' }, b: { conf: 'high', why: 'the same painting' } };
    two[0].dupPairs = { c: { conf: 'low', why: 'similar frame' } };
    R = dupRig(two);
    R.agentDropDuplicate(7, 'c');
    eq(words(R), 'Numbers not used: #3 a duplicate of #2', 'two links: the surer one names the partner');
    // Same name: two lines, the other one; three, nobody (no single partner), and the paper says "a duplicate".
    const same = (n) => Array.from({ length: n }, (_, i) => Object.assign(RCL('s' + i, 10 + i, 'Brass candlestick', []), { dupWith: undefined, dupPairs: undefined, dupChkAt: undefined, category: 'General/Household' }));
    R = dupRig(same(2));
    R.agentDropDuplicate(7, 's1');
    eq(words(R), 'Numbers not used: #11 a duplicate of #10', 'a same-name pair: the other line');
    R = dupRig(same(3));
    R.agentDropDuplicate(7, 's2');
    eq([R._getPhotoRef(7, 's2').removedWhy, R._getPhotoRef(7, 's2').removedOf], ['dup', undefined], '⚠ three of one name: recorded as a duplicate, naming nobody');
    eq(words(R), 'Numbers not used: #12 a duplicate', '…and the footnote says "a duplicate"');
    // A group joined by a name and a room-check link: the line joined by its name alone names its namesake, never the third line.
    const mix = [Object.assign(RCL('n1', 21, 'Brass candlestick', []), { dupWith: undefined, dupPairs: undefined, dupChkAt: undefined, category: 'General/Household' }),
      Object.assign(RCL('n2', 22, 'Brass candlestick', ['n3']), { category: 'General/Household' }), Object.assign(RCL('n3', 23, 'Pewter candlestick', ['n2']), { category: 'General/Household' })];
    R = dupRig(mix);
    eq((R.agentDuplicateGroups(7)[0] || { rows: [] }).rows.map((r) => r.itemNo), [21, 22, 23], 'fixture: one group of three, by name and by the room check');
    R.agentDropDuplicate(7, 'n1');
    eq(words(R), 'Numbers not used: #21 a duplicate of #22', 'the line joined by its name: a duplicate of its namesake');
    // The rule itself, DOM-free, on the group as agentDuplicateGroups hands it.
    const P = dupRig(PLATES()), G0 = P.agentDuplicateGroups(7)[0];
    eq(['p73', 'p81', 'p87', 'p88'].map((id) => P.agentDupPartner(G0, id)), ['p87', 'p88', 'p73', 'p81'], 'agentDupPartner: each line\'s partner off the group');
    eq(P.agentDupPartner(null, 'p73'), '', 'no group: nobody');
    // Keep the first reading still records each repeat against its own original.
    const K = dupRig(PLATES());
    K.agentKeepFirstReading(7, K._agDupHandle(K.agentDuplicateGroups(7)[0].key), {});
    eq(words(K), 'Numbers not used: #87 a duplicate of #73; #88 a duplicate of #81', 'Keep the first reading: each repeat a duplicate of the line it repeats');
  }

  group('M · ⚠ Agent One\'s group mark is shown in the line\'s record and a person\'s answer settles it: One article, or a count typed in Qty');
  {
    // The review's line: a drawer itemised, the line left renamed "Brass candlestick", $500, count 1, on a Form 706 estate.
    const P = papers({ gate706: 'yes', tc: 'Ashley Jerome' }, [LINE('bc', 8, 'Brass candlestick', 500, { agentGroup: true, category: 'General/Household' }), LINE('s', 9, 'Walnut sideboard', 900)]);
    const bc = () => P._getPhotoRef(7, 'bc');
    eq([{ agentGroup: true }, { agentGroup: true, qty: 1 }, { agentGroup: true, qty: 6 }, { agentGroup: true, groupBy: 'desk' }, { qty: 1 }, null].map((r) => P.invGroupUncounted(r)),
      [true, true, false, false, false, false], 'invGroupUncounted: a marked line with no count and no person\'s answer');
    eq(P.invLotSplitState(bc(), P.jobs[0]), 'nocount', 'fixture: it reads as a group with no count');
    const rec = text(P._invPanelGroupHtml(P.jobs[0], bc()));
    has(rec, 'A group with no count. Agent One read this line as more than one article, and no count is recorded.', '⚠ the line\'s record shows the mark');
    has(P._invPanelGroupHtml(P.jobs[0], bc()), "invMarkOneArticle(7,'bc')", '…with One article');
    eq(P._invPanelGroupHtml(P.jobs[0], P._getPhotoRef(7, 's')), '', 'a line with no mark shows nothing');
    eq(P.invMarkOneArticle(7, 'bc'), true, 'One article pressed');
    eq([bc().groupBy, bc().groupWho], ['desk', 'Ashley Jerome'], '⚠⚠ recorded as a person\'s answer, with who');
    eq(P.invLotSplitState(bc(), P.jobs[0]), '', '⚠⚠ and the lot rule reads it: one article, nothing to test');
    lacks(text(P.print('printCourtInventory')), 'Brass candlestick ⚠ grouped, untested', '⚠⚠ the Court Inventory no longer prints "grouped, untested" over it');
    has(text(P._invPanelGroupHtml(P.jobs[0], bc())), 'it was recorded as one article by Ashley Jerome', 'the record says who answered');
    eq(P.invMarkOneArticle(7, 'bc'), false, 'a second press does nothing');
    has(live(fn('savePhotoRefs')), 'groupBy:r.groupBy', 'the answer is on the manifest\'s save list');
    has(live(fn('_renderInvPanel')), '_invPanelGroupHtml(job, ref)', 'the record draws it');
    // The worklist: the remedy nothing read is gone, and its clearance comes back once the line is answered.
    const W = sandbox({ fns: ['invGroupUncounted', '_lotSplitWorklistBlock', 'invLotsToSplit', 'invLotsUntestable', 'invLotSplitState', 'invLotArticleValue', 'maivFilingApplies', 'isDecedentJob',
      '_gate706', '_gateYes', '_invItemNo', '_invMoney', 'fmt', 'roundCents'], vars: ['INV_LOT_ARTICLE_CAP', 'DECEDENT_SERVICES'] });
    const J = Object.assign({}, ESTATE, { gate706: 'yes' });
    const wb = text(W._lotSplitWorklistBlock(J, [LINE('c', 1, 'Copper cookware', 720, { qty: 8 }), LINE('d', 5, 'Sideboard drawer contents', 180, { agentGroup: true })]));
    has(wb, 'so the cap cannot be tested on it: record the count, itemise it, or record that it is a single article.', 'the worklist names only remedies the app records');
    lacks(wb, 'properly grouped', '⚠ never "record on the line why it is properly grouped", which nothing read');
    has(text(W._lotSplitWorklistBlock(J, [LINE('c', 1, 'Copper cookware', 720, { qty: 8 }), LINE('d', 5, 'Sideboard drawer contents', 180, { agentGroup: true, groupBy: 'desk' })])),
      'permits them to stand as groups', '⚠ answered, the clearance is printed again');
    has(text(W._lotSplitWorklistBlock(J, [LINE('c', 1, 'Copper cookware', 720, { qty: 8 }), LINE('d', 5, 'Sideboard drawer contents', 180, { agentGroup: true, groupBy: 'desk' })])),
      '1 grouped lot lists more than one article', '…and a line recorded as one article is no grouped lot');
    // A count typed in Qty, through the row's own edit.
    const doc = domStub({});
    const E = closureLift(['_invEdit'], ['renderInventoryTab', '_renderInvRow', '_renderInvWorkbar', '_renderInvBulk', 'agentValueAfterRename', '_avNoticesHtml', '_invRefreshAgentNotices',
      '_invRefreshSummary', '_invRefreshGuardrail', '_invRefreshFlagStrip', '_invRefreshRecords', '_invRefreshReleases', '_invReviewRepaint', '_invReadLineRepaint', 'savePhotoRefs',
      'invFillPlanChannel', '_deskFoldHeadsRepaint', '_deskNowRepaint', '_invSplitRepaint'], {
      document: doc, jobs: [Object.assign({}, ESTATE, { gate706: 'yes', tc: 'Ashley Jerome' })], _photoRefs: { 7: [LINE('sd', 6, 'Sideboard drawer contents: candles, napkin rings', 180, { agentGroup: true, category: 'General/Household' })] },
      estimateStore: ROOMS, vendorDirectory: [], _invTouch(r) { r.updatedAt = (r.updatedAt || 0) + 1; return r; }, savePhotoRefs() {}, renderInventoryTab() {}, _renderInvRow: () => '<div></div>',
      _renderInvWorkbar: () => '<div></div>', _renderInvBulk: () => '<div></div>', agentValueAfterRename() {}, _avNoticesHtml: () => '', _invRefreshAgentNotices() {}, _invRefreshSummary() {},
      _invRefreshGuardrail() {}, _invRefreshFlagStrip() {}, _invRefreshRecords() {}, _invRefreshReleases() {}, _invReviewRepaint() {}, _invReadLineRepaint() {},
      invFillPlanChannel: () => false, _deskFoldHeadsRepaint() {}, _deskNowRepaint() {}, _invSplitRepaint() {}, showSyncBadge() {}, alert() {}, window: { confirm: () => true }, localStorage: { getItem: () => null, setItem() {} } });
    const ed = attempt(() => E._invEdit(7, 'sd', 'qty', { value: '1', type: 'number' }));
    ok(ed.ok, 'the row\'s edit ran' + (ed.ok ? '' : ': ' + ed.err));
    const sd = E._getPhotoRef(7, 'sd') || {};
    eq([sd.groupBy, sd.groupWho], ['desk', 'Ashley Jerome'], '⚠⚠ a count typed in Qty on a marked line is a person\'s answer (one, here)');
    has(String((doc.getElementById('inv-grp-sd') || {}).outerHTML || ''), 'it was recorded as one article by Ashley Jerome', '⚠ the record\'s mark is repainted by id as the count lands (no redraw of the tab)');
    eq(P.invLotSplitState(sd, P.jobs[0]), '', '…so the lot rule no longer reads it as a group with no count');
  }

  group('N · ⚠ the summary counts a group with no count apart, and says so (the review: "Total Articles 3" over a drawer)');
  {
    const S = sandbox({ fns: ['invGroupUncounted', '_renderInventorySummary', 'invLineQty', 'invFiduciaryMode', 'isDecedentJob', 'invProbateRows', 'matterDef', 'matterTypeOf', 'invStatesEstateValues',
      'docTierProduces', 'docTierOf', 'docTierDef', 'svcHasDocStep', 'roundCents', 'resolveValBasis', 'invValBasisShort'],
      vars: ['INV_CATEGORIES', 'INV_TAXONOMY', 'INV_DISPOSITIONS', 'DECEDENT_SERVICES', 'MATTER_TYPES', 'DOC_TIERS', 'DOC_TIER_FROM_SCOPE', 'JOB_STEPS'],
      stubs: { invNeedsAppraisal: () => false, _money: (v) => '$' + v, _invMoney: (v) => '$' + v, fmtDate2: (d) => d, _invValueAsOfHtml: () => '', _invDateTime: () => 'now',
        maivAggregate: () => ({ count: 0, total: 0, settled: true }), inventoryNetLabel: () => 'Net to Estate', _maivSummaryNotice: () => '' } });
    const G1 = { category: 'General/Household', agentGroup: true };
    const run = (rows) => { const a = attempt(() => text(S._renderInventorySummary(ESTATE, rows))); return a.ok ? a.val : 'threw: ' + a.err; };
    const t = run([LINE('d', 1, 'Sideboard drawer contents: candles, napkin rings, corkscrews, coasters', 180, G1), LINE('k', 2, 'Kitchen drawer of utensils', 40, G1), LINE('s', 3, 'Sideboard', 900)]);
    has(t, 'Total Lines 3', 'three lines');
    has(t, 'Total Articles 1, plus 2 grouped lines not counted', '⚠⚠ the two groups with no count are counted apart and named');
    has(t, 'General/Household 2 0 + 2 grouped', 'the category table says the same');
    has(t, 'Total 3 1 + 2 grouped', '…and its total');
    const t2 = run([LINE('d', 1, 'Sideboard drawer', 180, Object.assign({ qty: 5, groupBy: 'desk' }, G1)), LINE('s', 2, 'Sideboard', 900)]);
    has(t2, 'Total Articles 6', 'a group whose count was recorded counts its count');
    lacks(t2, 'grouped', 'and nothing is said apart');
  }

  group('O · ⚠ the package, the request\'s send and the close-out filer tell the sender how many photographs could not be drawn, and a notice saying so is not "ok"');
  {
    const pkg = live(fn('sendProbatePackage'));
    has(pkg, "invPrintPhotoWords(jobId, _jobInvRefs(jobId)) : '';", 'the package reads what its pages could not draw, as they are built');
    has(pkg, "if (_photoSaid) bits.push('On the pages: ' + _photoSaid);", '…says it in the notice');
    has(pkg, '!unfiled.length && !_photoSaid &&', '…and a notice saying it is not clean');
    // Only where a page the package owes draws photographs (the Estate Inventory Report, the Contents List).
    const PD = sandbox({ fns: ['probatePackageDrawsPhotos'] });
    eq([['court', 'schedule', 'ledger', 'worklist'], ['trustee', 'contents', 'ledger', 'worklist'], ['court', 'ledger', 'worklist'], ['ledger', 'worklist'], [], null]
      .map((o) => PD.probatePackageDrawsPhotos(o)), [true, true, false, false, false, false], 'probatePackageDrawsPhotos: the Report or the Contents List, and nothing else');
    has(pkg, "var _pkgPhotos = (typeof probatePackageDrawsPhotos === 'function') ? probatePackageDrawsPhotos(probatePackageDocs(job)) : true;", 'the package asks it of the pages it owes');
    has(pkg, "var _photoSaid = (_pkgPhotos && ", '…before it says anything of photographs');
    has(pkg, "var _pkgIds = (_pkgPhotos && ", '…and before it fetches any');
    const req = live(fn('sendApprovalRequest')), es = live(fn('approvalRequestSendEsign'));
    has(req, "r.photoSaid = (typeof invPrintPhotoWords === 'function') ? invPrintPhotoWords(jobId, items || []) : '';", 'the request reads what its page could not draw');
    has(req, "if (r.photoSaid) bits.push('On the request: ' + r.photoSaid);", '…says it on the email route');
    has(es, "if (r.photoSaid) bits.push('On the request: ' + r.photoSaid);", '…and on the DocuSign route');
    has(es, "_docNotice(filedUrl && !r.photoSaid ? 'ok' : 'warn'", '…where a page with undrawn photographs is not "ok"');
    // The close-out filer, driven: the Contents Record filed with every batch failed, then with every photograph drawn.
    const LIV = { id: 7, hvlId: 'HVL-0007', name: 'Margaret Hale', svc: 'downsizing_move', addr: '9 Dunbar Rd', city: 'Palm Beach', docTier: 'contents', tc: 'Ashley Jerome',
      driveFolder: 'https://drive.google.com/drive/folders/ROOT7', docState: {}, at: {} };
    const filer = (thumbs) => {
      const out = { badges: [], notices: [] };
      const c = closureLift(['fileContentsRecord'], ['refreshPhotoRefs', 'resolveSubfolderId', 'uploadHtmlToDrive', 'saveJobs', 'syncJobToSheets', 'showSyncBadge', '_docNotice',
        '_ledgerCardRepaint', '_invEnsureLoaded', 'invFetchPrintPhotos', '_printDocument', '_repaintIncidents'], {
        jobs: [JSON.parse(JSON.stringify(LIV))], estimateStore: ROOMS, jobPlanStore: {}, _photoRefs: { 7: [LINE('a', 1, 'Sofa', 400, { disposition: 'Keep' }), LINE('b', 2, 'Lamp', 40, { disposition: 'Keep' })] },
        SHEETS_SYNC_URL: 'https://script.example/exec', _invCloudSeen: { 7: true }, document: domStub({}), vendorDirectory: [], setTimeout: () => 0, clearTimeout() {},
        refreshPhotoRefs: (id, cb) => cb(false, true), resolveSubfolderId: (j, sub, cb) => cb('INV7'), _invEnsureLoaded() {},
        invFetchPrintPhotos: (id, ids, done) => { if (thumbs) { c._invPrintThumbs[7] = {}; ids.forEach((x) => { c._invPrintThumbs[7][x] = 'data:image/jpeg;base64,AA'; }); } done({ got: thumbs ? ids.length : 0, failed: thumbs ? 0 : ids.length }); },
        uploadHtmlToDrive: (f, name, html, cb) => cb(true, 'https://drive.google.com/file/d/up1/view', { fileId: 'up1' }),
        saveJobs() {}, syncJobToSheets() {}, _ledgerCardRepaint() {}, _repaintIncidents() {},
        showSyncBadge: (m, warn) => out.badges.push({ m: String(m), warn: !!warn }), _docNotice: (t, m) => out.notices.push({ t, m: String(m) }) });
      out.c = c;
      return out;
    };
    const F1 = filer(false);
    const r1 = attempt(() => F1.c.fileContentsRecord(7, { auto: true }));
    ok(r1.ok, 'the close files the Contents Record' + (r1.ok ? '' : ': ' + r1.err));
    const b1 = F1.badges[F1.badges.length - 1] || {};
    eq([b1.warn, /Contents Record filed to Drive: 2 photographs could not be drawn from Drive, so their lines link to the photograph in Drive instead\./.test(b1.m || '')], [true, true],
      '⚠⚠ every batch failed: the badge says how many could not be drawn, in amber, never ✓ (' + (b1.m || '') + ')');
    const F2 = filer(false);
    attempt(() => F2.c.fileContentsRecord(7, {}));
    const n2 = F2.notices[F2.notices.length - 1] || {};
    eq([n2.t, /2 photographs could not be drawn from Drive/.test(n2.m || '')], ['warn', true], 'from the card: the notice says it, as a warning');
    const F3 = filer(true);
    attempt(() => F3.c.fileContentsRecord(7, { auto: true }));
    const b3 = F3.badges[F3.badges.length - 1] || {};
    eq([b3.warn, b3.m], [false, 'Contents Record filed to Drive ✓'], 'every photograph drawn: ✓, as before');
  }

  group('P · ⚠ the counsel bundle quotes the footer and the Numbers not used footnote as the papers print them (the review: D23 held neither)');
  {
    // Read off the code, never retyped here: the footer is its constant, the footnote the sentence invNumbersNotUsedText ends with.
    const BUNDLE = fs.readFileSync(path.join(__dirname, '..', 'COUNSEL_REVIEW_BUNDLE.md'), 'utf8');
    const footer = sandbox({ vars: ['INV_PAPER_PHOTO_TXT'] }).INV_PAPER_PHOTO_TXT || '';
    const nnu = (live(fn('invNumbersNotUsedText')).match(/'\. (A number is never given to another item[^']*)'/) || [])[1] || '';
    ok(footer.length > 40 && /photograph/.test(footer), 'the footer is read off its constant (' + footer + ')');
    ok(nnu.length > 40, 'the footnote\'s closing sentence is read off invNumbersNotUsedText (' + nnu + ')');
    const d23 = BUNDLE.slice(BUNDLE.indexOf('### D23.'), BUNDLE.indexOf('\n### ', BUNDLE.indexOf('### D23.') + 8));
    ok(d23.length > 400, 'D23 is in the bundle (' + d23.length + ' characters)');
    has(d23, footer, '⚠⚠ D23 quotes the footer word for word (drafted, not reviewed)');
    has(d23, nnu, '⚠⚠ D23 quotes the footnote word for word');
  }
};
