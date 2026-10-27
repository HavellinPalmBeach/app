'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// ONLY FLAGGED LINES KEEP A TICK (2026-10-26, Q106; it replaced Q99's $100 floor, review-floor.test.js until then),
// THE LIST READ (Q107), THE UNSURE HINT ON A STANDING LINE (Q108) AND THE SCHEDULES' PILL, BRONZE UNTIL READ (Q109).
//
// Anthony, 2026-10-26: *"we will be obviously going back to the office and looking over the entire inventory list ourselves
// to make sure everything looks right. So the idea that … we need to be like ticking boxes is ridiculous to approve
// everything, because … this is our job at night. The agent identifies everything and then values it. And then we go back
// and we go over the list and we make sure it makes sense. And we verify it with what we saw on site."* He took *"Only
// flagged lines"*. So a line the agents named and valued, with a destination and nothing flagged, stands as it is
// (invLineAccepted, which is !invLineHold), whatever its value (Q106: no limit), and a figure typed on the desk, or an
// appraisal's typed from the report, stands the same way (Q105). A tick stays only where the app flags something, and the
// rule names why: one rule, _invLineHolds (invLineHold is its first reason; `every` lists them all, for the row's box;
// `only` asks some alone, for invLineOpen), in this order: a disputed estate (Q102); a firearm, an NFA flag or ammunition;
// no name; no destination (none, or Undecided); on Hold; no figure, or a figure nobody owns (a walkthrough collection's);
// a figure made for an earlier name; both agents guessing (Q101); an appraisal until its figure is on the line or it is
// waived; a bequest or a dispute on the line; a note not yet quiet (Agent One's on the line or on its photograph's line,
// Agent Two's while the figure is its own); a possible duplicate; a release caution. The Form 706 lot cap is not a hold.
// Two of them a tick cannot settle (INV_OPEN_HOLDS, invLineOpen): no name, and an open possible duplicate (the second
// reviews: ticking both Brass candlesticks printed REVIEWED with the item counted twice). Undecided and Hold ticked are
// reviewed: a state a person may leave a line in at night.
// Q107 (*"One 'List read' press"*): the night's read is recorded once, `job.invRead` ({at, by, seen}), by *I've read the
// list* on the work bar. ⚠ THE READ IS A FINGERPRINT, NEVER A TIME (round three): `seen` is invListSeen, a count and an
// FNV-1a hash over every inventory line (removed ones marked) of what the papers print of it (INV_READ_FIELDS); the read is
// current while the list still says that. A tick, a room check, a custody event, an approval, an item number or a notice
// never unreads it; another device's change landing late does, whatever the clocks say. It is pressed only on a copy that
// has read the sheet (invListReadRefusal). Where a line stands as the agents left it, a paper is REVIEWED only over a
// current read, and names it. Q108 (*"Show it, no tick"*): *unsure* shows wherever either agent was guessing, a standing
// line included, until a person's look, and a figure a person recorded is one (Q105). Q109 (*"Bronze until read"*): the
// Court Inventory and the Trust Schedule stay FINAL, and their pill for the standing values is bronze until the list is
// read, grey and naming the reader after.
//
//   A · the rule, driven through the real _invLineHolds / invLineHold / invLineAccepted with its whole chain lifted: every
//       reason, one fixture each with every earlier step passing, and its words on the box; the order; `every` and `only`;
//       what stands; what a tick cannot answer; the ammunition words in both of the reviews' lists, in full.
//   B · its readers: invLineReviewed, the Not reviewed chip, the group counts, the row's box in each state (stuck included),
//       the unsure hint, _invEdit repainting by id (the other half of a pair too), the paint's duplicate index and lines by
//       id, Agent One's own reading (agentName) holding a pair, the loud notices outliving their line, the waiver, and the
//       list read end to end: its fingerprint, its refusal, its press, its words, its work-bar line and sentence, the
//       package's gap.
//   C · the papers: the stamps' words exactly in every read state, Q109's pill in both colours, and the six printers
//       handing in the job's facts.
//   D · one definition: the rule's, the reasons', the context's and the read's callers; nothing of the floor or of the
//       time-stamped read left.
// ─────────────────────────────────────────────────────────────────────────────

const vm = require('vm');
const { sandbox, source, fn, decl, domStub } = require('./harness');

const SRC = source();
const ALL_FNS = new Set((SRC.match(/(^|\n)function\s+([A-Za-z0-9_$]+)\s*\(/g) || []).map((s) => s.replace(/^\n?function\s+/, '').replace(/\s*\($/, '')));
const ALL_VARS = new Set((SRC.match(/(^|\n)var\s+([A-Za-z0-9_$]+)\s*=/g) || []).map((s) => s.replace(/^\n?var\s+/, '').replace(/\s*=$/, '')));
// ⚠ LINE BY LINE, NEVER A BLOCK-COMMENT REGEX (it eats ~170 KB here because of `accept="image/*"`).
const live = (t) => String(t).split('\n').filter((l) => !l.trim().startsWith('//')).map((l) => l.replace(/\s\/\/\s.*$/, '')).join('\n');
const codeOnly = (t) => live(t).replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, "''");

// The functions and vars `roots` reach; `stop` names what the test supplies (a stub, or state, never lifted over it).
function closure(roots, stop) {
  const stopSet = new Set(stop || []);
  const fns = new Set(), vars = new Set();
  const queue = roots.map((r) => ['f', r]);
  while (queue.length) {
    const [k, name] = queue.shift();
    if (stopSet.has(name)) continue;
    let body;
    if (k === 'f') { if (fns.has(name)) continue; fns.add(name); try { body = codeOnly(fn(name)); } catch (e) { continue; } }
    else { if (vars.has(name)) continue; vars.add(name); try { body = codeOnly(decl(name)); } catch (e) { continue; } }
    for (const m of body.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)) if (ALL_FNS.has(m[1]) && !stopSet.has(m[1])) queue.push(['f', m[1]]);
    for (const m of body.matchAll(/[(,]\s*([A-Za-z_$][\w$]*)\s*[,)]/g)) if (ALL_FNS.has(m[1]) && !stopSet.has(m[1])) queue.push(['f', m[1]]);
    for (const m of body.matchAll(/\b([A-Za-z_$][\w$]*)\b/g)) if (ALL_VARS.has(m[1]) && !stopSet.has(m[1])) queue.push(['v', m[1]]);
  }
  return { fns: [...fns], vars: [...vars] };
}

// Everything this file drives, lifted once by its call tree: the rule and its readers, the desk's row, group head, work bar,
// edit and Not duplicates, the list read, its fingerprint, its refusal and its press, the writers whose stamps must never
// unread it (the tick, the room check, the item numbers, Agent One's naming) and those that must (the merge, a removal, a
// restore), the waiver, the package's gaps, and the six printers. Only data, the job's save and the screen's other cards
// are stubs (each a no-op, or a recorder where a test reads what was asked of it).
const ROOTS = ['_invLineHolds', 'invLineHold', 'invLineOpen', 'invLineAccepted', 'invAcceptCtx', '_invAcceptCtxOf', 'invLineAcceptedOnly',
  'invLineReviewed', 'invLineUnsure', '_invPhotoNoteOpen', '_invReviewStats', '_invAcceptedStampWords', '_invProgressStamp', '_avUnreviewedStamp',
  '_avAcceptedPill', '_invRevBoxHtml', '_renderInvRow', '_invGroupItems', '_renderInvGroupHead', '_renderInvWorkbar', '_invEdit', '_invSetReviewed',
  '_invReviewRepaint', '_agDupIndex', 'agentDuplicateGroups', 'agentNotDuplicate', '_agDupHandle', 'agentNotices', 'invListSeen', 'invListRead',
  'invListReadWords', 'invListReadRefusal', 'invMarkListRead', '_invReadKey', '_invListReadHtml', 'invWorkFlags', 'waiveAppraisal', '_agWrite',
  '_arWrite', 'mergeMediaItems', '_invTombstoneLine', 'restoreInventoryItem', '_invAssignItemNos', 'probatePackageGaps', 'collectionLineWithPhoto',
  'printEstateInventoryReport', 'printContentsList', 'printDispositionLedger', 'printCourtInventory', 'printTrustSchedule', 'printContentsRecord'];
const STUB_NAMES = ['jobs', '_photoRefs', 'estimateStore', 'vendors', 'vendorDirectory', 'contractors', 'document', 'alert', 'window',
  '_printDocument', 'showSyncBadge', 'savePhotoRefs', '_scheduleInventorySync', 'renderInventoryTab', '_invRefreshSummary',
  '_invRefreshGuardrail', '_invRefreshFlagStrip', '_invRefreshRecords', '_invRefreshReleases', 'agentValueAfterRename',
  '_invRefreshAgentNotices', '_invPaintFigures', '_renderInvPanel', '_invThumbHTML', 'saveJobs', 'syncJobToSheets'];
// The lifted code is extracted and compiled ONCE and run in each fresh sandbox (a rig per fixture): extracting ~300 bodies
// from the 2.7 MB source on every rig took a minute. The vars go first, in source order, as harness.sandbox emits them.
let _script = null;
function liftedScript() {
  if (_script) return _script;
  const c = closure(ROOTS, STUB_NAMES);
  const ordered = c.vars.map((name) => ({ name, at: SRC.search(new RegExp('(^|\\n)var\\s+' + name + '\\s*=')) }))
    .sort((a, b) => a.at - b.at).map((v) => v.name);
  _script = new vm.Script([...ordered.map(decl), ...c.fns.map(fn)].join('\n\n'), { filename: 'havellin.html (extracted)' });
  return _script;
}
// Noon Eastern on 2026-10-26, 16:00 UTC: the same calendar day in Eastern and in UTC (the container), where the suite runs.
// Never the real clock.
const READ_AT = Date.UTC(2026, 9, 26, 16, 0, 0);
const READ_WORDS = 'read by Anthony Graziano, October 26, 2026';
// `opt.user`: the device's user as Settings records it (hav_device_user); `opt.now`: the sandbox's clock, so nothing here
// reads the real one (the code under test stamps Date.now(); a test pins what it reads); `opt.prompt`: what a prompt
// answers (the waiver's reason); `opt.read`: the list read on the job, true for Anthony's read of the list as the rig holds
// it (its own fingerprint, worked out by the real invListSeen), or an object laid over that.
function rig(job, refs, opt) {
  opt = opt || {};
  const alerts = [], saved = [], synced = [];
  const doc = domStub({});
  const noop = () => {};
  const ctx = sandbox({
    stubs: {
      jobs: [Object.assign({}, job)], _photoRefs: { [job.id]: (refs || []).map((r) => Object.assign({}, r)) },
      estimateStore: { [job.id]: { estimate: { rooms: [{ idx: 1, name: 'Kitchen', st: 'in' }, { idx: 2, name: 'Dining Room', st: 'in' }] } } },
      vendors: [], vendorDirectory: [], contractors: [], document: doc, alert: (m) => alerts.push(String(m)),
      window: { prompt: () => (opt.prompt == null ? '' : opt.prompt), confirm: () => true, print: noop },
      _printDocument: () => true, showSyncBadge: noop, savePhotoRefs: noop, _scheduleInventorySync: noop, renderInventoryTab: noop,
      _invRefreshSummary: noop, _invRefreshGuardrail: noop, _invRefreshFlagStrip: noop, _invRefreshRecords: noop,
      _invRefreshReleases: noop, agentValueAfterRename: noop, _invRefreshAgentNotices: noop, _invPaintFigures: noop,
      _renderInvPanel: () => '', _invThumbHTML: () => '',
      saveJobs: () => saved.push(1), syncJobToSheets: (j) => synced.push(j && j.id),
    },
  });
  if (opt.user) ctx.localStorage.setItem('hav_device_user', opt.user);
  if (opt.now != null) vm.runInContext('Date.now = function () { return ' + Number(opt.now) + '; };', ctx);
  liftedScript().runInContext(ctx);
  const R = { ctx, doc, alerts, saved, synced, job: ctx.jobs[0], ref: (id) => ctx._photoRefs[job.id].find((r) => r.stableId === id) };
  if (opt.read) markRead(R, opt.read === true ? {} : opt.read);
  return R;
}
// Anthony's read of the list as it stands now (or `o` laid over it): what invMarkListRead records, without its refusal.
function markRead(R, o) {
  R.job.invRead = Object.assign({ at: READ_AT, by: 'Anthony Graziano', seen: val(attempt(() => R.ctx.invListSeen(R.job.id))) }, o || {});
  return R.job.invRead;
}
const setClock = (R, t) => vm.runInContext('Date.now = function () { return ' + Number(t) + '; };', R.ctx);
// A call that may throw on a broken build: a revert must fail its assertions, not end the file.
function attempt(f) { try { return { ok: true, val: f() }; } catch (e) { return { ok: false, err: String(e && e.message || e) }; } }
const val = (r) => (r.ok ? r.val : 'threw: ' + r.err);

const ESTATE = (o) => Object.assign({ id: 7, hvlId: 'HVL-0007', name: 'Butler Estate', svc: 'cleanout', matterType: 'probate', docTier: 'values',
  deathDate: '2026-06-14', executor: 'Tripp Butler', tc: 'Ashley Jerome', won: true, status: 'won', addr: '69 Beach Blvd' }, o || {});
const LIVING = (o) => Object.assign({ id: 7, hvlId: 'HVL-0007', name: 'Ellsworth', svc: 'downsizing_move', tc: 'Ashley Jerome', won: true,
  status: 'won', addr: '12 Ocean Way' }, o || {});
// A line Agent One named and Agent Two valued, both fairly sure, with a destination and nothing flagged: the cutlery drawer.
// Every flag fixture below is this line with ONE thing changed, so every step before the flag passes.
const DRAWER = (o) => {
  const id = (o && o.stableId) || 'd1';
  const name = (o && o.objectName) || 'Stainless flatware and kitchen utensils, drawer ' + id;
  return Object.assign({ stableId: id, label: 'inventory', roomIdx: 1, ts: 1, objectName: name, namedBy: 'agent', agentConf: 'medium',
    category: 'General/Household', qty: 1, condition: 'Good', disposition: 'Donate', driveFileId: 'F' + id, valuedBy: 'agent', fmv: 40,
    valLow: 20, valHigh: 60, valConf: 'medium', valSource: 'General estimate', valNameAt: name }, o || {});
};
// The drawer under another name, Agent Two's figure made under that same name (agentValueStale quiet).
const NAMED = (name, o) => DRAWER(Object.assign({ objectName: name, valNameAt: name }, o || {}));
const TABLE = (o) => NAMED('Mahogany dining table, six chairs', Object.assign({ stableId: 't1', roomIdx: 2, category: 'Furniture', disposition: 'Sell',
  fmv: 2500, valLow: 2000, valHigh: 2900, valSource: 'Auction comps' }, o || {}));
// The line as a person would leave it after a tick: the one look, name, count and value together.
const TICKED = (o) => DRAWER(Object.assign({ reviewed: true, reviewedBy: 'Ashley Jerome', valReviewed: true }, o || {}));
// A figure typed on the desk (Q105).
const DESK = (o) => DRAWER(Object.assign({ namedBy: 'desk', valuedBy: 'desk', fmv: 300, valLow: undefined, valHigh: undefined, valConf: undefined,
  valSource: 'Dealer quote', valNameAt: undefined }, o || {}));
// A photograph's first line carrying Agent One's note, and a line split off that photograph.
const PHOTO = (o) => NAMED('Stainless flatware in drawer, mixed', Object.assign({ stableId: 'p1', agentNotices: [{ kind: 'other', text: 'a hallmark on one spoon' }] }, o || {}));
const SPLIT = (o) => NAMED('Serving ladle, stainless', Object.assign({ stableId: 's1', derivedFrom: 'p1' }, o || {}));
// The same name in one room off two photographs (Agent One's lines, its own reading recorded as _agWrite records it).
const TWIN = (id, o) => NAMED('Brass table lamp, pleated shade', Object.assign({ stableId: id, agentName: 'Brass table lamp, pleated shade' }, o || {}));
// What the rule answers for `id` on `job` with `refs` as the job's whole manifest (invAcceptCtx reads every line).
function stands(job, refs, id) {
  const R = rig(job, refs);
  return val(attempt(() => R.ctx.invLineAccepted(R.ref(id || refs[0].stableId), R.ctx.invAcceptCtx(R.job))));
}
// Why: invLineHold's reason ('' where the line stands).
function hold(job, refs, id) {
  const R = rig(job, refs);
  return val(attempt(() => R.ctx.invLineHold(R.ref(id || refs[0].stableId), R.ctx.invAcceptCtx(R.job))));
}
// Every reason, in order (the box's), and the reasons `only` asks.
function holds(job, refs, id, only) {
  const R = rig(job, refs);
  return val(attempt(() => R.ctx._invLineHolds(R.ref(id || refs[0].stableId), R.ctx.invAcceptCtx(R.job), true, only)));
}
// The rendered text of a stamp or page, as a reader sees it.
const text = (h) => String(h == null ? '' : h).replace(/<[^>]+>/g, ' ').replace(/&mdash;/g, '—').replace(/&middot;/g, '·')
  .replace(/&#10003;/g, '✓').replace(/&amp;/g, '&').replace(/&rsquo;/g, '’').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const count = (hay, needle) => String(hay).split(needle).length - 1;
// The work bar's list-read line, cut out of the bar by its id.
const readLine = (wb, jid) => {
  const s = String(wb || ''), at = s.indexOf('<div id="inv-read-' + (jid || 7) + '"');
  return at < 0 ? '' : s.slice(at, s.indexOf('</div>', at) + 6);
};
// The sheet's state as this device knows it: a backend set (`url`), the manifest read (`seen`), the last read failed
// (`failed`). Written defensively: a revert that stops the code reading one of them stops the harness lifting it too, and
// that must fail the checks, not throw and end the file.
function sheet(X, o) {
  attempt(() => {
    if (o.url !== undefined) X.ctx.SHEETS_SYNC_URL = o.url;
    if (!X.ctx._invCloudSeen) X.ctx._invCloudSeen = {};
    if (!X.ctx._invCloudFailed) X.ctx._invCloudFailed = {};
    if (o.seen !== undefined) { if (o.seen) X.ctx._invCloudSeen[X.job.id] = true; else delete X.ctx._invCloudSeen[X.job.id]; }
    if (o.failed !== undefined) { if (o.failed) X.ctx._invCloudFailed[X.job.id] = true; else delete X.ctx._invCloudFailed[X.job.id]; }
  });
}
// What an element was last painted with (the domStub keeps each write), '' where nothing painted it.
const painted = (R, id) => (R.doc.__els[id] ? String(R.doc.__els[id].outerHTML || '') : '');
// The work bar's sentence about the IN PROGRESS stamp, as a reader sees it ('' where the bar draws none).
const sentence = (wb) => { const m = /Client documents print with[^—]*— they are never withheld\./.exec(text(wb)); return m ? m[0] : ''; };

// ⚠ THE REVIEWS' TWO LISTS, IN FULL (2026-10-26; INV_ACCEPT_AMMO_RE's comment names this file as where they live).
// Every name in AMMO_HOLD is ammunition, however Agent One words it, and holds its line wherever it is filed; every name in
// AMMO_STAND is not, and a gauge, a calibre-like number, a shell, a primer or "black powder" beside it never holds a line.
// Noun-first, as Agent One writes a name (the round-three build's review): held since the same day.
const AMMO_HOLD = ['Primers, large rifle', 'Rifle primers', 'Rifle cartridges, assorted', 'Pistol cartridges, mixed calibers', 'Shells, 12 gauge',
  'Rounds, 9mm', 'Box of 9mm', 'Bullets, .308 reloading', 'Powder, Hodgdon H4350', 'IMR 4064 powder, 1 lb',
  'Box of 22 LR rounds', 'Bulk 22LR', '308 Winchester cartridges', 'Box of 30-06 cartridges', '6.5 Creedmoor rounds',
  'Hornady 6.5 Creedmoor Precision Hunter', '5.56 NATO rounds, loose', '7.62x39 rounds in can', '357 Magnum cartridges, box', '44 Magnum rounds',
  'Box of 40 S&W', 'Box of 9mm FMJ', '12 gauge Federal Top Gun shells, 4 boxes', 'Box of .22 LR cartridges', '410 bore shells', '20 gauge target loads',
  'Box of .22', '.38 Special rounds', 'Black powder, 1 lb can', 'CCI small rifle primers', '.410 shotshells', '.45 ACP', '50 BMG rounds',
  'Rounds for a rifle', '.30-30 Winchester', '.22 rifle'];
const AMMO_STAND = ['Rifle scope, Leupold', 'Pistol grip shower head', 'Powder room vanity', 'Body powder, sealed', 'Socket set, 10mm',
  'Rifle case, black, latched', 'Shells and coral, decorative', 'Rounds of golf, framed scorecards', 'Drill bits, 9mm masonry',
  'Set of 4 black powder-coated aluminum patio chairs', 'Black powder coat steel bistro table, 2 chairs',
  'Brown Jordan patio set, black powder coated frames', 'Gunpowder green tea, sealed tins', 'Paint primers and stains, sealed cans',
  'Makeup primers and foundations', 'Sea shells for 2 glass display jars', 'Router bits, .25 in. shank', 'Coin jar, .25 and .10 coins',
  '18-gauge brad nailer', '12-gauge extension cord', '14 gauge wire', 'Ink cartridges', 'Bullet journal', '35mm film camera', 'Jar of 50 shells',
  'National Geographic, 44 magazines', 'Brita filter, 3 cartridges'];

module.exports = function ({ group, ok, eq, has, lacks }) {
  // ═══════════════════════════════ A · THE RULE ═══════════════════════════════
  group('⚠⚠ A0 · every reason the rule gives, one fixture each, and its words on the row\'s box');
  {
    // In the declaration's order (eq compares the JSON text).
    const WORDS = {
      dispute: 'a disputed estate: every item takes a tick', firearm: 'a firearm or ammunition',
      noname: 'no name yet: name it', nodest: 'no destination yet (choose where it goes)', onhold: 'on Hold',
      nofigure: 'no value yet', unowned: 'a value nobody has checked', stale: 'its value was made for an earlier name',
      guess: 'both agents were guessing', appraisal: 'waiting on an appraisal', bequest: 'a specific bequest',
      disputed: 'marked disputed', note: 'Agent One’s note on it', valnote: 'Agent Two’s note on it',
      photonote: 'Agent One’s note on its photograph',
      duplicate: 'a possible duplicate: Remove one or press Not duplicates, under Possible duplicates',
      caution: 'a release caution',
    };
    const R0 = rig(ESTATE(), []);
    eq(val(attempt(() => JSON.parse(JSON.stringify(R0.ctx.INV_HOLD_WORDS)))), WORDS, '⚠ INV_HOLD_WORDS: one sentence per reason, in these words');
    eq(val(attempt(() => JSON.parse(JSON.stringify(R0.ctx.INV_OPEN_HOLDS)))), { noname: 1, duplicate: 1 }, '⚠ INV_OPEN_HOLDS: no name and a possible duplicate, the two a tick cannot settle');
    // Each fixture is the drawer with ONE thing changed; the reason is the only one the rule meets.
    const CASES = [
      ['dispute', ESTATE({ gateDispute: 'yes' }), [DRAWER()]],
      ['firearm', ESTATE(), [DRAWER({ flagNFA: true })]],
      ['noname', ESTATE(), [DRAWER({ objectName: '', valNameAt: '' })]],
      ['nodest', ESTATE(), [DRAWER({ disposition: 'Undecided' })]],
      ['onhold', ESTATE(), [DRAWER({ disposition: 'Hold' })]],
      ['nofigure', ESTATE(), [DRAWER({ fmv: '', valLow: undefined, valHigh: undefined })]],
      ['unowned', ESTATE(), [DRAWER({ valuedBy: undefined })]],
      ['stale', ESTATE(), [DRAWER({ objectName: 'Sterling flatware, Gorham', valNameAt: 'Stainless flatware and kitchen utensils, drawer d1' })]],
      ['guess', ESTATE(), [DRAWER({ agentConf: 'low', valConf: 'low' })]],
      ['appraisal', ESTATE(), [DRAWER({ apprId: 'a1' })]],
      // A bequest matched and going to its beneficiary, so its flag is the only thing on it (an unmatched flag is a release caution too).
      ['bequest', ESTATE({ beneficiaries: [{ id: 'b1', name: 'Ruth Adler' }], bequests: [{ id: 'q1', beneficiaryId: 'b1', stableIds: ['d1'], text: 'the flatware' }] }),
        [DRAWER({ flagBequest: true, disposition: 'Distribute', channel: 'Ruth Adler' })]],
      // A dispute on the line is a release caution as well, always: `every` names both, in the rule's order.
      ['disputed', ESTATE(), [DRAWER({ flagDisputed: true, disposition: 'Keep' })], undefined, ['disputed', 'caution']],
      ['note', ESTATE(), [DRAWER({ agentNotices: [{ kind: 'other', text: 'a mark under the base' }] })]],
      ['valnote', ESTATE(), [DRAWER({ valNotices: [{ kind: 'appraiser', text: 'a signed piece' }] })]],
      ['photonote', ESTATE(), [PHOTO(), SPLIT()], 's1'],
      ['duplicate', ESTATE(), [TWIN('a'), TWIN('b')], 'a'],
      ['caution', LIVING(), [DRAWER({ disposition: 'Sell', channel: 'Ashley Jerome' })]],
    ];
    eq(CASES.map((c) => c[0]).sort(), Object.keys(WORDS).sort(), 'fixture: one case per reason with words');
    CASES.forEach(([why, job, refs, id, every]) => {
      const R = rig(job, refs);
      const ref = R.ref(id || refs[0].stableId), fc = val(attempt(() => R.ctx.invAcceptCtx(R.job)));
      eq(val(attempt(() => R.ctx.invLineHold(ref, fc))), why, '⚠ invLineHold: ' + why);
      eq(val(attempt(() => R.ctx._invLineHolds(ref, fc, true))), every || [why], '…and `every` lists it first' + (every ? ', with what the same fact also is: ' : ', alone (one thing changed): ') + why);
      eq(val(attempt(() => R.ctx.invLineAccepted(ref, fc))), false, '…and invLineAccepted is its negation: held (' + why + ')');
      const title = ({ noname: 1, duplicate: 1 })[why] ? 'title="Still open: ' + WORDS[why] + '. A tick does not settle it."'
        : 'title="Needs a look: ' + (every || [why]).map((k) => WORDS[k]).join('; ') + '. Tick it once checked."';
      has(val(attempt(() => R.ctx._invRevBoxHtml(7, ref, fc))), title, '⚠ the box says why (' + why + ')');
    });
    // The two reasons no box shows: a removed line, and a reader that hands in no facts.
    const R = rig(ESTATE(), [DRAWER({ deletedAt: 5 }), DRAWER({ stableId: 'd2' })]);
    const fc = val(attempt(() => R.ctx.invAcceptCtx(R.job)));
    eq(val(attempt(() => R.ctx.invLineHold(R.ref('d1'), fc))), 'gone', 'a removed line: gone');
    eq(val(attempt(() => R.ctx._invLineHolds(R.ref('d1'), fc, true))), ['gone'], '…`every` too');
    eq(val(attempt(() => R.ctx.invLineHold(R.ref('d2'), null))), 'nocontext', '⚠ no facts handed in: nocontext');
    eq(val(attempt(() => R.ctx._invLineHolds(R.ref('d2'), null, true))), ['nocontext'], '…`every` too');
    eq(val(attempt(() => R.ctx.invLineHold(R.ref('d2'), fc))), '', '…the drawer with them: \'\', it stands');
    eq(val(attempt(() => R.ctx._invLineHolds(R.ref('d2'), fc, true))), [], '…`every` lists nothing');
    eq(val(attempt(() => R.ctx.invLineAccepted(R.ref('d2'), fc))), true, '…and invLineAccepted says so');
  }

  group('⚠⚠ A0b · the order: a disputed estate, then a firearm, before a name, a destination or a figure is asked');
  {
    const UNNAMED = { objectName: '', valNameAt: '' }, NOFIG = { fmv: '', valLow: undefined, valHigh: undefined };
    eq(hold(ESTATE(), [DRAWER(Object.assign({ flagNFA: true }, UNNAMED))]), 'firearm', '⚠⚠ an NFA flag on a line with no name: firearm first');
    eq(hold(ESTATE(), [DRAWER(Object.assign({ category: 'Firearms' }, UNNAMED))]), 'firearm', '⚠⚠ a line filed under Firearms, unnamed: firearm first');
    eq(hold(ESTATE(), [DRAWER(Object.assign({ flagNFA: true }, NOFIG))]), 'firearm', '⚠⚠ a firearm with no figure: firearm, before no value yet');
    eq(hold(ESTATE(), [DRAWER({ flagNFA: true, disposition: 'Undecided' })]), 'firearm', '…before no destination');
    eq(hold(ESTATE({ gateDispute: 'yes' }), [DRAWER({ flagNFA: true })]), 'dispute', 'a disputed estate before all of them');
    eq(holds(ESTATE(), [DRAWER(Object.assign({ flagNFA: true }, UNNAMED, NOFIG))]), ['firearm', 'noname', 'nofigure'],
      '⚠ `every`: firearm, no name, no value, in that order');
    eq(hold(ESTATE(), [DRAWER(Object.assign({ disposition: 'Hold' }, UNNAMED))]), 'noname', 'no name before on Hold');
    eq(hold(ESTATE(), [DRAWER(Object.assign({ disposition: 'Hold' }, NOFIG))]), 'onhold', 'on Hold before no value yet');
    eq(hold(ESTATE(), [DRAWER(Object.assign({ disposition: 'Undecided' }, NOFIG))]), 'nodest', 'no destination before no value yet');
  }

  group('⚠⚠ A0c · `every` lists every reason in order; `only` asks the reasons it names alone');
  {
    const MANY = DRAWER({ objectName: '', valNameAt: '', disposition: 'Hold', fmv: '', valLow: undefined, valHigh: undefined, flagBequest: true, flagDisputed: true });
    eq(holds(ESTATE(), [MANY]), ['noname', 'onhold', 'nofigure', 'bequest', 'disputed', 'caution'],
      '⚠⚠ `every`: no name, on Hold, no value, the bequest, the dispute and their release caution, in order');
    eq(hold(ESTATE(), [MANY]), 'noname', 'invLineHold: the first of them');
    eq(holds(ESTATE(), [MANY], 'd1', { bequest: 1 }), ['bequest'], '⚠ `only` {bequest}: the bequest alone');
    eq(holds(ESTATE(), [MANY], 'd1', { onhold: 1, disputed: 1 }), ['onhold', 'disputed'], '`only` two: those two, in the rule\'s order');
    eq(holds(ESTATE(), [MANY], 'd1', { duplicate: 1 }), [], '`only` a reason the line does not have: nothing');
    const R = rig(ESTATE(), [MANY]);
    const fc = val(attempt(() => R.ctx.invAcceptCtx(R.job)));
    eq(val(attempt(() => R.ctx._invLineHolds(R.ref('d1'), fc, false, { onhold: 1, disputed: 1 }))), ['onhold'], '`only` without `every`: the first it asks');
    eq(val(attempt(() => R.ctx._invLineHolds(R.ref('d1'), fc))), ['noname'], 'neither: the first reason alone');
    // The two answers before any reason: no `only` makes them ask anything else.
    eq(val(attempt(() => R.ctx._invLineHolds(R.ref('d1'), null, true, { bequest: 1 }))), ['nocontext'], 'no facts: nocontext, whatever is asked');
  }

  group('⚠⚠ A1 · nothing flagged, the line stands as the agents left it, at any value (Q106: no limit)');
  {
    eq(stands(ESTATE(), [DRAWER()]), true, '⚠⚠ the $40 cutlery drawer stands with nobody ticking it');
    eq(stands(ESTATE(), [TABLE()]), true, '⚠⚠ the $2,500 dining table stands too: no value limit (Q106)');
    eq(stands(ESTATE(), [NAMED('Sterling silver serving spoons', { category: 'Silver & Precious Metal', fmv: 80, valLow: 60, valHigh: 120 })]), true,
      '⚠ a Silver line at $80 stands: a specialist category is no longer a flag');
    eq(stands(ESTATE(), [NAMED('Oil on canvas, harbour scene', { category: 'Art & Décor', fmv: 300, valLow: 200, valHigh: 450 })]), true,
      'nor is Art & Décor at $300');
    eq(stands(ESTATE(), [DRAWER({ disposition: 'Keep' })]), true, 'Keep is a destination');
    eq(stands(LIVING(), [DRAWER()]), true, 'on living work too');
    eq(stands(ESTATE({ gate706: 'no' }), [DRAWER()]), true, 'and on an estate filing no Form 706');
  }

  group('⚠⚠ A1b · Agent Two\'s range alone stands only where counsel values; a tier that states values needs a figure');
  {
    const RANGE = DRAWER({ fmv: '', valLow: 20, valHigh: 60 });
    eq(stands(ESTATE({ docTier: 'contents' }), [RANGE]), true, '⚠⚠ the contents tier (agentValueInternal): the range is all Agent Two writes, and it stands');
    eq(hold(ESTATE(), [RANGE]), 'nofigure', '⚠⚠ the values tier: a range with no figure is no value yet (a paper prints it as —)');
    eq(hold(LIVING(), [RANGE]), 'nofigure', '⚠ living work: likewise');
    eq(stands(ESTATE(), [DRAWER()]), true, '…the same line with its figure on the values tier: it stands');
  }

  group('A2 · a name, a destination and a figure');
  {
    eq(hold(ESTATE(), [DRAWER({ objectName: '', valNameAt: '' })]), 'noname', 'no name: a person names it');
    eq(hold(ESTATE(), [DRAWER({ objectName: '   ', valNameAt: '   ' })]), 'noname', 'a name of spaces is no name');
    eq(hold(ESTATE(), [DRAWER({ disposition: '' })]), 'nodest', 'no destination');
    eq(hold(ESTATE(), [DRAWER({ disposition: 'Undecided' })]), 'nodest', '⚠ Undecided is no destination');
    eq(hold(ESTATE(), [DRAWER({ disposition: 'Hold' })]), 'onhold', '⚠ Hold is its own reason: on Hold');
    eq(hold(ESTATE(), [DRAWER({ fmv: '', valLow: undefined, valHigh: undefined })]), 'nofigure', 'no figure from either agent or the desk');
    eq(hold(ESTATE(), [DRAWER({ valuedBy: undefined })]), 'unowned', '⚠⚠ a figure nobody owns (a walkthrough collection\'s): a value nobody has checked');
    eq(hold(ESTATE(), [DRAWER({ valuedBy: undefined, fmv: '', valLow: undefined, valHigh: undefined })]), 'nofigure', '…and with no figure either: no value yet');
    eq(hold(ESTATE(), [DRAWER({ valuedBy: undefined, fmv: 0 })]), 'unowned', 'a $0 nobody owns is still a figure nobody checked');
    eq(hold(ESTATE(), [DRAWER({ deletedAt: 5 })]), 'gone', 'a removed line: nothing');
  }

  group('⚠⚠ A3 · guessing: either agent alone, the line stands; both, it keeps its tick (Q101)');
  {
    eq(stands(ESTATE(), [DRAWER({ agentConf: 'low' })]), true, '⚠ Agent One alone guessing (Agent Two sure under that name): stands');
    eq(stands(ESTATE(), [DRAWER({ valConf: 'low' })]), true, '⚠ Agent Two alone guessing (Agent One sure): stands');
    eq(hold(ESTATE(), [DRAWER({ agentConf: 'low', valConf: 'low' })]), 'guess', '⚠⚠ both guessing: the tick stays');
    eq(hold(ESTATE(), [DRAWER({ agentConf: undefined, valConf: undefined })]), 'guess', 'a missing confidence reads low, as the badges always read it');
    eq(stands(ESTATE(), [DRAWER({ namedBy: 'desk', agentConf: 'low', valConf: 'low' })]), true, 'a name a person typed is no guess of Agent One\'s');
  }

  group('⚠⚠ A4 · each flag keeps the tick, one fixture each, with its reason');
  {
    const flags = [
      ['stale', 'a figure made for an earlier name', ESTATE(), { objectName: 'Sterling flatware, Gorham', valNameAt: 'Stainless flatware and kitchen utensils, drawer d1' }],
      ['firearm', 'a firearm', ESTATE(), { category: 'Firearms', objectName: 'Remington pump shotgun', valNameAt: 'Remington pump shotgun' }],
      ['firearm', 'an NFA flag', ESTATE(), { flagNFA: true }],
      ['appraisal', 'a line ticked for appraisal', LIVING(), { needsAppr: true }],
      ['appraisal', 'a line linked to an appraiser', ESTATE(), { apprId: 'a1' }],
      ['appraisal', '⚠ at the appraisal threshold, any category ($3,200 sofa)', ESTATE(), { category: 'Furniture', fmv: 3200, valLow: 2800, valHigh: 3600 }],
      ['appraisal', '⚠ the top of Agent Two\'s range at the threshold ($2,500 to $3,100)', ESTATE(), { category: 'Furniture', fmv: 2500, valLow: 2000, valHigh: 3100 }],
      ['appraisal', 'worth a specialist on living work ($3,500 top)', LIVING(), { fmv: 2000, valLow: 1500, valHigh: 3500 }],
      ['disputed', 'a dispute on the line', ESTATE(), { flagDisputed: true }],
      ['note', 'a note from Agent One on the line', ESTATE(), { agentNotices: [{ kind: 'other', text: 'a mark under the base' }] }],
      ['valnote', 'a note from Agent Two on the line', ESTATE(), { valNotices: [{ kind: 'appraiser', text: 'a signed piece' }] }],
    ];
    flags.forEach(([why, what, job, o]) => eq(hold(job, [DRAWER(o)]), why, 'held: ' + what));
    // The controls: what makes each a flag, taken away, lets the same line stand.
    eq(stands(LIVING(), [DRAWER({ fmv: 2000, valLow: 1500, valHigh: 2900 })]), true, '…a living line under the specialist figure: it stands');
    // A specific bequest: matched to its beneficiary and going to them, so no release caution; the flag alone holds it.
    const BEQ = ESTATE({ beneficiaries: [{ id: 'b1', name: 'Ruth Adler' }], bequests: [{ id: 'q1', beneficiaryId: 'b1', stableIds: ['d1'], text: 'the flatware' }] });
    eq(stands(BEQ, [DRAWER({ disposition: 'Distribute', channel: 'Ruth Adler' })]), true, 'fixture: a bequest going to its beneficiary, unflagged, stands');
    eq(hold(BEQ, [DRAWER({ disposition: 'Distribute', channel: 'Ruth Adler', flagBequest: true })]), 'bequest', '⚠ held: a specific bequest on the line');
  }

  group('⚠⚠ A4b · a recorded waiver answers the appraisal (apprWaived), and nothing else does');
  {
    const SOFA = (o) => DRAWER(Object.assign({ category: 'Furniture', fmv: 3200, valLow: 2800, valHigh: 3600 }, o || {}));
    eq(hold(ESTATE(), [SOFA()]), 'appraisal', 'fixture: the $3,200 sofa waits on an appraisal');
    eq(stands(ESTATE(), [SOFA({ apprWaived: true, apprWaiveReason: 'Anthony: an ordinary sofa' })]), true, '⚠⚠ waived: it stands');
    eq(stands(ESTATE(), [DRAWER({ category: 'Furniture', fmv: 2500, valLow: 2000, valHigh: 3100, apprWaived: true })]), true, '…the range at the threshold, waived: it stands');
    eq(stands(ESTATE(), [DRAWER({ apprId: 'a1', apprWaived: true })]), true, '⚠ linked to an appraiser and waived: it stands');
    eq(stands(LIVING(), [DRAWER({ needsAppr: true, apprWaived: true })]), true, 'ticked for appraisal on living work, waived: it stands');
    eq(stands(LIVING(), [DRAWER({ fmv: 2000, valLow: 1500, valHigh: 3500, apprWaived: true })]), true, 'worth a specialist, waived: it stands');
    eq(hold(ESTATE(), [SOFA({ apprWaived: true, flagBequest: true, disposition: 'Keep' })]), 'bequest', 'the waiver answers the appraisal alone: a bequest still holds');
  }

  group('⚠⚠ A5 · ammunition goes where a firearm goes: both of the reviews\' lists, in full');
  {
    eq([AMMO_HOLD.length, AMMO_STAND.length], [36, 27], 'fixture: the reviews\' lists, every name (36 that hold, 27 that stand, the noun-first names included)');
    // Filed under General/Household, as Agent One files a box of rounds it does not recognise.
    AMMO_HOLD.forEach((n) => eq(hold(ESTATE(), [NAMED(n)]), 'firearm', '⚠ held in General/Household: "' + n + '"'));
    AMMO_STAND.forEach((n) => eq(stands(ESTATE(), [NAMED(n)]), true, '⚠ stands: "' + n + '"'));
    // The words a gunsmith's list uses on their own, which the reviews kept.
    ['Ammunition, assorted', 'Ammo, two boxes', 'Shotshells, two boxes', 'Shotgun shells, one box', 'Gunpowder tin', 'Black powder flask and shot pouch',
     'Smokeless powder, one pound', 'Buckshot, bag', 'Birdshot, bag', 'Rimfire cartridges, mixed', 'Centerfire brass, sorted', 'Reloading press and dies',
     'Reloading supplies, mixed', 'Reloading equipment, bench', 'Percussion caps, #11', 'Large rifle primers', 'Rounds of .45 ACP', 'Cartridges for a rifle',
     'Box of 9mm Luger rounds', '12 ga shells']
      .forEach((n) => eq(hold(ESTATE(), [NAMED(n)]), 'firearm', 'held: "' + n + '"'));
    ['Rain gauge, brass', 'Tire pressure gauge', 'Shell collection, seashells', 'Bullet journal and pens', '14 gauge wire, spool']
      .forEach((n) => eq(stands(ESTATE(), [NAMED(n)]), true, 'stands: "' + n + '"'));
    // ⚠ Agent One's first reading counts too (valNameFrom), so Agent Two's correction never takes the word away.
    const RENAMED = NAMED('Vintage cardboard box, printed', { valNameFrom: 'Box of .22 LR cartridges' });
    eq(hold(ESTATE(), [RENAMED]), 'firearm', '⚠⚠ Agent Two renamed the box; Agent One\'s reading named the cartridges: held');
    eq(stands(ESTATE(), [NAMED('Vintage cardboard box, printed', { valNameFrom: 'Vintage shoe box' })]), true, '…a first reading with no ammunition: it stands');
    eq(stands(ESTATE(), [NAMED('Patio chairs, set of 4', { valNameFrom: 'Set of 4 black powder-coated aluminum patio chairs' })]), true,
      '…and a first reading of powder-coated chairs holds nothing');
    // The comment that sends a reader here says so.
    has(SRC.slice(SRC.indexOf('var INV_ACCEPT_AMMO_RE') - 600, SRC.indexOf('var INV_ACCEPT_AMMO_RE')), 'review-flagged.test.js', 'the regex\'s comment names this file as where its lists live');
  }

  group('⚠⚠ A6 · a note still open on the line\'s photograph holds the lines split off it, until it is quiet; a removed photograph line\'s firearm note still holds them');
  {
    eq(hold(ESTATE(), [PHOTO(), SPLIT()], 's1'), 'photonote', '⚠⚠ the ladle split off the photograph: held while the photograph\'s note is open');
    eq(hold(ESTATE(), [PHOTO(), SPLIT()], 'p1'), 'note', '…the photograph\'s own line: held by its own note');
    eq(stands(ESTATE(), [PHOTO({ reviewed: true, valReviewed: true }), SPLIT()], 's1'), true, '⚠ the photograph\'s line ticked: the note goes quiet, the ladle stands');
    // ⚠ The line's own note goes quiet with the tick too (agentNoticeQuiet), as the photograph's does for the ladle.
    const R = rig(ESTATE(), [PHOTO({ reviewed: true, reviewedBy: 'Ashley Jerome', valReviewed: true }), SPLIT()]);
    const fc = val(attempt(() => R.ctx.invAcceptCtx(R.job)));
    eq(val(attempt(() => R.ctx.invLineHold(R.ref('p1'), fc))), '', '⚠⚠ …and the photograph\'s own line, ticked: its own note quiet, nothing holds it');
    eq(val(attempt(() => R.ctx.invLineAcceptedOnly(R.ref('p1'), fc))), false, '…counted as checked by the person who ticked it, never as accepted');
    eq(hold(ESTATE(), [PHOTO({ reviewed: true, valReviewed: true, agentNotices: [{ kind: 'firearm', text: 'a rifle behind the door' }] }), SPLIT()], 's1'), 'photonote',
      'a firearm note never goes quiet, so the split line stays held');
    const MF = [PHOTO({ agentNotices: [{ kind: 'mustfind', text: 'could be the ring' }] }), SPLIT()];
    eq(hold(ESTATE({ mustFind: 'Grandmother\'s ring', mustFound: {} }), MF, 's1'), 'photonote', 'a must-find note holds it while a must-find is open');
    eq(stands(ESTATE({ mustFind: 'Grandmother\'s ring', mustFound: { "grandmother's ring": { at: '2026-10-20', by: 'Ashley Jerome' } } }), MF, 's1'), true,
      '…and goes quiet once every must-find is found (agentNoticeQuiet)');
    eq(stands(ESTATE(), [SPLIT()], 's1'), true, 'a split line whose photograph is not on this device: nothing open');
    // ⚠⚠ Removed: a Look at this and a Must find go with their line (the reviews: a removed dresser's note held its socks
    // and belts for good, and showed nowhere); a Firearm or a Possible NFA never does (the second review: removing the closet
    // shelf it was raised on let the rifle case off the same photograph stand).
    eq(stands(ESTATE(), [PHOTO({ deletedAt: 9 }), SPLIT()], 's1'), true, '⚠⚠ the photograph\'s line removed: its Look at this no longer holds the ladle');
    eq(stands(ESTATE({ mustFind: 'Grandmother\'s ring', mustFound: {} }), [PHOTO({ deletedAt: 9, agentNotices: [{ kind: 'mustfind', text: 'could be the ring' }] }), SPLIT()], 's1'), true,
      '…nor its Must find, a must-find still open');
    eq(hold(ESTATE(), [PHOTO({ deletedAt: 9, agentNotices: [{ kind: 'firearm', text: 'a rifle case on the shelf' }] }), SPLIT()], 's1'), 'photonote',
      '⚠⚠ …but its Firearm note still holds the line split off the photograph');
    eq(hold(ESTATE(), [PHOTO({ deletedAt: 9, agentNotices: [{ kind: 'nfa', text: 'a short barrel' }] }), SPLIT()], 's1'), 'photonote', '⚠ …and its Possible NFA note');
    eq(hold(ESTATE(), [PHOTO({ deletedAt: 9, agentNotices: [{ kind: 'other', text: 'a mark' }, { kind: 'firearm', text: 'a rifle' }] }), SPLIT()], 's1'), 'photonote',
      '…a loud note among quiet ones is enough');
  }

  group('⚠⚠ A6a · the photograph\'s line is read from the facts handed in (fc.byId), else the manifest');
  {
    // The manifest's copy of the photograph's line has no note; the copy the facts carry has one: the facts are read first.
    const R = rig(ESTATE(), [PHOTO({ agentNotices: [] }), SPLIT()]);
    const fc = val(attempt(() => R.ctx.invAcceptCtx(R.job)));
    ok(fc && fc.byId && fc.byId.p1 === R.ref('p1') && fc.byId.s1 === R.ref('s1'), '⚠ invAcceptCtx: the lines by id, the manifest\'s own objects');
    eq(val(attempt(() => R.ctx.invLineHold(R.ref('s1'), fc))), '', 'fixture: no note on the photograph\'s line, the ladle stands');
    const withNote = Object.assign({}, R.ref('p1'), { agentNotices: [{ kind: 'other', text: 'a hallmark' }] });
    const fc2 = Object.assign({}, fc, { byId: Object.assign({}, fc.byId, { p1: withNote }) });
    eq(val(attempt(() => R.ctx._invPhotoNoteOpen(R.ref('s1'), R.job, fc2))), true, '⚠⚠ _invPhotoNoteOpen reads the photograph\'s line from fc.byId');
    eq(val(attempt(() => R.ctx.invLineHold(R.ref('s1'), fc2))), 'photonote', '…and the rule holds the ladle on it');
    // The other way round: the manifest has the note, the facts a quiet copy: the facts win.
    const R2 = rig(ESTATE(), [PHOTO(), SPLIT()]);
    const f2 = val(attempt(() => R2.ctx.invAcceptCtx(R2.job)));
    const quiet = Object.assign({}, R2.ref('p1'), { agentNotices: [] });
    eq(val(attempt(() => R2.ctx.invLineHold(R2.ref('s1'), Object.assign({}, f2, { byId: { p1: quiet } })))), '', '…a quiet copy in the facts: the ladle stands');
    // Not in the facts (a removed line, or the paint's index from before a split): the manifest's copy.
    eq(val(attempt(() => R2.ctx.invLineHold(R2.ref('s1'), Object.assign({}, f2, { byId: {} })))), 'photonote', '⚠ not in fc.byId: the manifest\'s copy is read (_getPhotoRef)');
    eq(val(attempt(() => R2.ctx.invLineHold(R2.ref('s1'), { job: R2.job, dup: {} }))), 'photonote', 'facts with no byId at all: likewise');
    eq(val(attempt(() => R2.ctx._invPhotoNoteOpen(R2.ref('p1'), R2.job, f2))), false, 'a line not split off anything: no photograph note');
    // The desk's facts: the paint's lines by id where the paint is this client's.
    R2.ctx._agDupSetJob = 7; R2.ctx._agDupSet = {}; R2.ctx._agDupById = { p1: quiet };
    const fd = val(attempt(() => R2.ctx._invAcceptCtxOf(R2.job)));
    ok(fd && fd.byId && fd.byId.p1 === quiet, '⚠ _invAcceptCtxOf: the paint\'s _agDupById where it is this client\'s');
    eq(val(attempt(() => R2.ctx.invLineHold(R2.ref('s1'), fd))), '', '…and the rule reads it');
    R2.ctx._agDupSetJob = 9;
    const fo = val(attempt(() => R2.ctx._invAcceptCtxOf(R2.job)));
    ok(fo && fo.byId && fo.byId.p1 === R2.ref('p1'), '…another client\'s paint: worked out now from the manifest');
  }

  group('⚠⚠ A6b · a line\'s own Agent One note holds it only while it is not quiet');
  {
    const OWN = DRAWER({ agentNotices: [{ kind: 'mustfind', text: 'could be the ring' }] });
    eq(hold(ESTATE({ mustFind: 'Grandmother\'s ring', mustFound: {} }), [OWN]), 'note', '⚠ its own must-find note, a must-find still open: held');
    eq(stands(ESTATE({ mustFind: 'Grandmother\'s ring', mustFound: { "grandmother's ring": { at: '2026-10-20', by: 'Ashley Jerome' } } }), [OWN]), true,
      '⚠⚠ every must-find found: the note is quiet, the line stands');
    eq(hold(ESTATE(), [DRAWER({ agentNotices: [{ kind: 'nfa', text: 'a short barrel' }] })]), 'note', 'a Possible NFA note never goes quiet');
  }

  group('⚠⚠ A6c · Agent Two\'s note counts only while the figure is Agent Two\'s');
  {
    const NOTE = [{ kind: 'appraiser', text: 'a signed piece' }];
    eq(hold(ESTATE(), [DRAWER({ valNotices: NOTE })]), 'valnote', 'on Agent Two\'s own figure: held');
    eq(stands(ESTATE(), [DESK({ valNotices: NOTE })]), true, '⚠⚠ a figure typed on the desk over it: the note is about a figure no longer on the line, it stands');
  }

  group('⚠⚠ A7 · a possible duplicate holds every line of it; a tick never answers it, Not duplicates does');
  {
    eq([hold(ESTATE(), [TWIN('a'), TWIN('b')], 'a'), hold(ESTATE(), [TWIN('a'), TWIN('b')], 'b')], ['duplicate', 'duplicate'], '⚠⚠ a same-name pair: both held');
    eq(stands(ESTATE(), [TWIN('a'), TWIN('b', { roomIdx: 2 })], 'a'), true, 'the same name in two rooms is no pair');
    // ⚠⚠ The reviews: the tick on one half released the other, which then stood with the item counted twice; then ticking
    // both halves printed REVIEWED over the item counted twice.
    const R = rig(ESTATE(), [TWIN('a'), TWIN('b')], { user: 'Anthony Graziano' });
    const p = attempt(() => R.ctx._invSetReviewed(7, 'a', true));
    ok(p.ok, 'the tick on one half runs (' + (p.err || '') + ')');
    eq(R.ref('a').reviewed, true, 'fixture: the half is ticked');
    const fc1 = val(attempt(() => R.ctx.invAcceptCtx(R.job)));
    eq([val(attempt(() => R.ctx.invLineHold(R.ref('a'), fc1))), val(attempt(() => R.ctx.invLineHold(R.ref('b'), fc1)))], ['duplicate', 'duplicate'],
      '⚠⚠ one half ticked: both still held as a possible duplicate');
    eq([val(attempt(() => R.ctx.invLineReviewed(R.ref('a'), fc1))), val(attempt(() => R.ctx.invLineReviewed(R.ref('b'), fc1)))], [false, false],
      '⚠⚠ …and neither is reviewed, the ticked half included (a tick cannot settle a possible duplicate)');
    attempt(() => R.ctx._invSetReviewed(7, 'b', true));
    const fcB = val(attempt(() => R.ctx.invAcceptCtx(R.job)));
    eq([R.ref('a').reviewed, R.ref('b').reviewed], [true, true], 'fixture: both halves ticked');
    eq([val(attempt(() => R.ctx.invLineReviewed(R.ref('a'), fcB))), val(attempt(() => R.ctx.invLineReviewed(R.ref('b'), fcB)))], [false, false],
      '⚠⚠ both halves ticked: still neither reviewed');
    const stB = val(attempt(() => R.ctx._invReviewStats(R.ctx._jobInvRefs(7), fcB)));
    eq(stB && [stB.done, stB.total, stB.complete], [0, 2, false], '⚠⚠ …so the papers never read REVIEWED over the item counted twice');
    has(text(val(attempt(() => R.ctx._invProgressStamp(R.ctx._jobInvRefs(7), { fc: fcB })))), 'IN PROGRESS — 0 of 2 items reviewed', '…the stamp says so');
    // Not duplicates, through the real handler: the group's key as the Possible duplicates card hands it in.
    const g = val(attempt(() => R.ctx.agentDuplicateGroups(7)));
    ok(Array.isArray(g) && g.length === 1 && g[0].rows.length === 2, 'fixture: one group of two on the card');
    const nd = attempt(() => R.ctx.agentNotDuplicate(7, R.ctx._agDupHandle(g[0].key)));
    ok(nd.ok, 'Not duplicates runs (' + (nd.err || '') + ')');
    const fc2 = val(attempt(() => R.ctx.invAcceptCtx(R.job)));
    eq([!!R.ref('a').dupOK, !!R.ref('b').dupOK], [true, true], 'Not duplicates marks both');
    eq([val(attempt(() => R.ctx.invLineHold(R.ref('a'), fc2))), val(attempt(() => R.ctx.invLineHold(R.ref('b'), fc2)))], ['', ''], '⚠⚠ …and releases both');
    eq([val(attempt(() => R.ctx.invLineReviewed(R.ref('a'), fc2))), val(attempt(() => R.ctx.invLineReviewed(R.ref('b'), fc2)))], [true, true], '…both reviewed now');
    // The room check's link off the pictures.
    eq([hold(ESTATE(), [DRAWER({ stableId: 'a', dupWith: ['b'] }), DRAWER({ stableId: 'b', dupWith: ['a'] })], 'a'),
        hold(ESTATE(), [DRAWER({ stableId: 'a', dupWith: ['b'] }), DRAWER({ stableId: 'b', dupWith: ['a'] })], 'b')], ['duplicate', 'duplicate'], '⚠ a room-check link: both held');
    eq(stands(ESTATE(), [DRAWER({ stableId: 'a', dupWith: ['b'], dupOK: true }), DRAWER({ stableId: 'b', dupWith: ['a'], dupOK: true })], 'a'), true, '…released by Not duplicates');
    // ⚠⚠ A room-check survivor: its partner removed, no group is left, and nothing holds it (the link alone never did).
    eq(stands(ESTATE(), [DRAWER({ stableId: 'a', dupWith: ['b'] }), DRAWER({ stableId: 'b', dupWith: ['a'], deletedAt: 9 })], 'a'), true,
      '⚠⚠ the room check\'s pair, one half removed: the survivor stands');
    eq(stands(ESTATE(), [DRAWER({ dupWith: ['zz'] })]), true, '⚠ a link to a line not on the list: no group, it stands');
    // One photograph named twice (agentNamedTwice): two namings neither told what was listed.
    const ONCE = (o) => NAMED('White ironstone dinner plates', Object.assign({ stableId: 'p1', agentAt: 1000, agentListed: 0 }, o || {}));
    const AGAIN = (o) => NAMED('Ironstone plates, white, stacked', Object.assign({ stableId: 'p2', derivedFrom: 'p1', agentAt: 9000, agentListed: 0 }, o || {}));
    eq([hold(ESTATE(), [ONCE(), AGAIN()], 'p1'), hold(ESTATE(), [ONCE(), AGAIN()], 'p2')], ['duplicate', 'duplicate'], '⚠⚠ a photograph named twice: both readings held');
    eq([stands(ESTATE(), [ONCE({ dupOK: true }), AGAIN({ dupOK: true })], 'p1'), stands(ESTATE(), [ONCE({ dupOK: true }), AGAIN({ dupOK: true })], 'p2')], [true, true],
      '…released by Not duplicates');
    eq(stands(ESTATE(), [ONCE(), AGAIN({ agentAt: 1500 })], 'p2'), true, 'one naming that split the photograph (within the gap) is no double');
  }

  group('⚠⚠ A7b · a pair is Agent One\'s reading (agentName): a desk rename or a category change on one half keeps it');
  {
    // ⚠ _agWrite records Agent One's own reading on every naming.
    const W = rig(ESTATE(), [{ stableId: 'x', label: 'inventory', roomIdx: 1, ts: 1, objectName: '' }, { stableId: 'y', label: 'inventory', roomIdx: 1, ts: 2, objectName: '' }]);
    const w = attempt(() => W.ctx._agWrite(7, 'x', { name: 'Brass table lamp, pleated shade', category: 'General/Household', qty: 1, confidence: 'medium' }));
    ok(w.ok && w.val === true, '_agWrite runs (' + (w.err || '') + ')');
    eq([W.ref('x').objectName, W.ref('x').agentName, W.ref('x').namedBy], ['Brass table lamp, pleated shade', 'Brass table lamp, pleated shade', 'agent'],
      '⚠⚠ _agWrite writes agentName, Agent One\'s own reading, beside the name');
    attempt(() => W.ctx._agWrite(7, 'y', { name: '', category: 'General/Household', confidence: 'low' }));
    eq(W.ref('y').agentName, undefined, 'an empty name writes no reading');
    // ⚠ It survives the save: savePhotoRefs' whitelist (it has dropped a field three times), driven for real.
    let stored = null;
    const S = sandbox({ fns: ['savePhotoRefs'], stubs: { _photoRefs: { 7: [TWIN('a', { agentName: 'Brass lamp' })] },
      localStorage: { setItem: (k, v) => { stored = v; }, getItem: () => null, removeItem() {} } } });
    attempt(() => S.savePhotoRefs(7));
    eq(stored && JSON.parse(stored)[0].agentName, 'Brass lamp', '⚠⚠ agentName survives savePhotoRefs (on its whitelist)');
    // ⚠ And a collection's line filled by a photograph drops it with the other naming stamps (Agent One names it afresh).
    const CL = rig(LIVING(), []);
    const filled = val(attempt(() => CL.ctx.collectionLineWithPhoto(
      { stableId: 'cl', label: 'inventory', sourceCollId: 'c1', objectName: 'Stamp albums', agentName: 'Stamp albums', namedBy: 'agent', qty: 3, fmv: 900 },
      { roomIdx: 1, label: 'inventory', seq: 4, filename: 'x.jpg', driveFileUrl: 'u', status: 'saved', ts: 50 }, {})));
    ok(filled && typeof filled === 'object', 'fixture: collectionLineWithPhoto runs (' + (typeof filled === 'string' ? filled : 'ok') + ')');
    eq(filled && [filled.agentName, filled.namedBy, filled.objectName], [undefined, undefined, ''], '⚠ collectionLineWithPhoto drops agentName with the naming');
    // Eligibility: named by Agent One, or carrying its reading after a person renamed it.
    const E = rig(ESTATE(), []);
    const elig = (r) => val(attempt(() => E.ctx._agDupEligible(Object.assign({ label: 'inventory', roomIdx: 1 }, r))));
    eq(elig({ objectName: 'Lamp', namedBy: 'agent' }), true, 'named by Agent One: a candidate');
    eq(elig({ objectName: 'Pair of lamps', namedBy: 'desk', agentName: 'Lamp' }), true, '⚠⚠ renamed on the desk, Agent One\'s reading kept: still a candidate');
    eq(elig({ objectName: 'Lamp', namedBy: 'desk' }), false, 'named on the desk with no reading of Agent One\'s: not one');
    eq(elig({ objectName: 'Lamp', namedBy: 'agent', dupOK: true }), false, 'Not duplicates: not one');
    eq(elig({ objectName: 'Lamp', namedBy: 'agent', deletedAt: 3 }), false, 'removed: not one');
    eq(elig({ objectName: 'Lamp', namedBy: 'agent', roomIdx: null }), false, 'in no room: not one');
    eq(elig({ objectName: 'Lamp', namedBy: 'agent', reviewed: true }), true, '⚠ ticked: still one (a tick never answers it)');
    eq(elig({ objectName: '', namedBy: 'desk', agentName: 'Lamp' }), true, '⚠ its name cleared, Agent One\'s reading kept: still one');
    // Grouped on Agent One's reading, whatever the name on the line says now.
    const grp = (rows) => {
      const G = rig(ESTATE(), rows);
      const gs = val(attempt(() => G.ctx.agentDuplicateGroups(7)));
      return Array.isArray(gs) ? gs.map((x) => x.rows.map((r) => r.stableId).sort()) : gs;
    };
    eq(grp([TWIN('a', { objectName: 'Pair of brass lamps', namedBy: 'desk' }), TWIN('b')]), [['a', 'b']], '⚠⚠ one half renamed on the desk: the pair stands under Agent One\'s reading');
    eq(grp([TWIN('a', { objectName: 'Brass lamp, Stiffel', valNameFrom: 'Brass table lamp, pleated shade', namedBy: 'agent' }), TWIN('b')]), [['a', 'b']],
      'one half corrected by Agent Two: likewise');
    eq(grp([TWIN('a', { agentName: undefined, objectName: 'Brass lamp, Stiffel', valNameFrom: 'Brass table lamp, pleated shade' }), TWIN('b')]), [['a', 'b']],
      'no reading recorded: Agent Two\'s valNameFrom, as before');
    // ⚠⚠ Through the real edit: a rename and a category change on one half keep the pair, and its other half held.
    [['objectName', 'Pair of brass lamps, pleated'], ['category', 'Lighting']].forEach(([key, value]) => {
      const R = rig(ESTATE(), [TWIN('a'), TWIN('b')]);
      R.ctx._agDupSetJob = 7; R.ctx._agDupSet = val(attempt(() => R.ctx._agDupIndex(7)));
      const e = attempt(() => R.ctx._invEdit(7, 'a', key, { value }));
      ok(e.ok, key + ': the edit runs (' + (e.err || '') + ')');
      eq([R.ref('a')[key], R.ref('a').namedBy, R.ref('a').agentName], [value, 'desk', 'Brass table lamp, pleated shade'], key + ': fixture: the desk\'s edit, Agent One\'s reading kept');
      const fc = val(attempt(() => R.ctx.invAcceptCtx(R.job)));
      // (A rename also makes Agent Two's figure one made for an earlier name, which comes first; the pair is among its reasons.)
      ok((val(attempt(() => R.ctx._invLineHolds(R.ref('a'), fc, true))) || []).indexOf('duplicate') >= 0, '⚠⚠ ' + key + ' changed on one half: it is still held as a possible duplicate');
      eq(val(attempt(() => R.ctx.invLineHold(R.ref('b'), fc))), 'duplicate', '⚠⚠ …and so is its other half');
      eq([val(attempt(() => R.ctx.invLineOpen(R.ref('a'), fc))), val(attempt(() => R.ctx.invLineOpen(R.ref('b'), fc)))], ['duplicate', 'duplicate'], '…open on both: a tick will not settle it');
      eq(R.ctx._agDupSet, { a: 2, b: 2 }, key + ': the paint\'s index still names the pair');
    });
  }

  group('⚠ A8 · a release caution holds the line');
  {
    eq(hold(LIVING(), [DRAWER({ disposition: 'Sell', channel: 'Ashley Jerome' })]), 'caution', '⚠ living work: a line going to someone who works with Havellin');
    eq(stands(LIVING(), [DRAWER({ disposition: 'Sell', channel: 'Ruth Adler' })]), true, '…to anybody else it stands');
    const BEQ = ESTATE({ beneficiaries: [{ id: 'b1', name: 'Ruth Adler' }], bequests: [{ id: 'q1', beneficiaryId: 'b1', stableIds: ['d1'], text: 'the flatware' }] });
    eq(hold(BEQ, [DRAWER({ disposition: 'Donate' })]), 'caution', '⚠ an estate: a bequest going elsewhere (to the charity), its flag not yet set');
  }

  group('⚠⚠ A9 · a disputed estate: no line stands by itself (Q102)');
  {
    eq(hold(ESTATE({ gateDispute: 'yes' }), [DRAWER()]), 'dispute', '⚠⚠ intake\'s dispute answered yes: the drawer keeps its tick');
    eq(hold(ESTATE({ gateDispute: 'yes' }), [TABLE()], 't1'), 'dispute', '…and the table');
    eq(hold(ESTATE({ svc: 'contested_probate' }), [DRAWER()]), 'dispute', '⚠ the contested probate service: likewise');
    eq(stands(ESTATE({ gateDispute: 'no' }), [DRAWER()]), true, 'a dispute answered no: it stands');
  }

  group('⚠ A10 · no facts, no line stands; a desk figure stands, and so does an appraisal\'s typed from the report');
  {
    const R = rig(ESTATE(), [DRAWER()]);
    eq(val(attempt(() => R.ctx.invLineAccepted(R.ref('d1'), null))), false, '⚠ no context: held (a reader that hands none in asks for more ticks, never fewer)');
    eq(val(attempt(() => R.ctx.invLineAccepted(R.ref('d1')))), false, 'none at all: held');
    eq(val(attempt(() => R.ctx.invLineAccepted(R.ref('d1'), { dup: {} }))), false, 'a context with no job: held');
    eq(val(attempt(() => R.ctx.invAcceptCtx(null))), null, 'invAcceptCtx with no job: null');
    const fc = val(attempt(() => R.ctx.invAcceptCtx(R.job)));
    ok(fc && fc.job && fc.job.id === 7 && fc.dup && typeof fc.dup === 'object' && fc.byId && fc.byId.d1 === R.ref('d1'),
      'invAcceptCtx: the job, a duplicate index, and the lines by id');
    const sub = val(attempt(() => R.ctx.invAcceptCtx(R.job, [])));
    eq(sub && sub.byId ? Object.keys(sub.byId) : sub, [], 'handed its lines: those, and none of the manifest\'s');
    eq(stands(ESTATE(), [DESK()]), true, '⚠⚠ a figure typed on the desk, nothing flagged: it stands (Q105)');
    eq(stands(ESTATE(), [DESK({ namedBy: 'agent', agentConf: 'low' })]), true, '…under Agent One\'s guess too: Agent Two is not in play');
    eq(hold(ESTATE(), [DESK({ fmv: '' })]), 'nofigure', 'a desk line with its figure cleared: no figure');
    eq(hold(ESTATE(), [DESK({ needsAppr: true })]), 'appraisal', 'a desk figure on a flagged line: held');
    eq(stands(ESTATE(), [DESK({ valuedBy: 'appraiser', valSource: 'Appraisal' })]), true, '⚠⚠ an appraisal\'s figure typed from the report is a person\'s figure: it stands');
    eq(hold(ESTATE(), [DESK({ valuedBy: 'appraiser', valSource: 'Dealer quote' })]), 'nofigure', '⚠ "appraiser" with no Appraisal source is no appraisal\'s figure');
  }

  group('⚠⚠ A11 · an appraisal\'s figure on the line releases the appraisal flags (ticked, linked, at the threshold, worth a specialist)');
  {
    const APPR = (o) => DRAWER(Object.assign({ category: 'Furniture', needsAppr: true, apprId: 'a1', fmv: 5000, valLow: undefined, valHigh: undefined,
      valConf: undefined, valuedBy: 'appraiser', valSource: 'Appraisal', valNameAt: undefined }, o || {}));
    const ROSTER = { appraisers: [{ id: 'a1', name: 'Worth Avenue Appraisals' }] };
    eq(stands(ESTATE(ROSTER), [APPR()]), true, '⚠⚠ ticked, linked and $5,000 (over the threshold), the appraisal\'s figure on it: it stands');
    eq(hold(ESTATE(ROSTER), [APPR({ valuedBy: 'agent', valSource: 'Auction comps', valLow: 4000, valHigh: 6000, valConf: 'medium', valNameAt: 'Stainless flatware and kitchen utensils, drawer d1' })]),
      'appraisal', '…the same line on Agent Two\'s figure: waiting on the appraisal');
    eq(stands(LIVING(ROSTER), [APPR()]), true, 'on living work too');
    eq(hold(ESTATE(ROSTER), [APPR({ fmv: '' })]), 'nofigure', 'linked, the report not back: no value yet');
    // ⚠⚠ Through the real edit: the figure typed from the report, on a linked line, is the appraisal's (Q93) and releases it.
    const R = rig(ESTATE(ROSTER), [DRAWER({ stableId: 'v1', category: 'Furniture', fmv: 2500, valLow: 2000, valHigh: 3100, apprId: 'a1' })]);
    const fc0 = val(attempt(() => R.ctx.invAcceptCtx(R.job)));
    eq(val(attempt(() => R.ctx.invLineHold(R.ref('v1'), fc0))), 'appraisal', 'fixture: linked, Agent Two\'s figure on it: held');
    const e = attempt(() => R.ctx._invEdit(7, 'v1', 'fmv', { value: '$4,000' }));
    ok(e.ok, 'the figure typed runs (' + (e.err || '') + ')');
    const v = R.ref('v1');
    eq([v.fmv, v.valuedBy, v.valSource], [4000, 'appraiser', 'Appraisal'], 'fixture: _invEdit records it as the appraisal\'s');
    eq(val(attempt(() => R.ctx.invLineHold(v, R.ctx.invAcceptCtx(R.job)))), '', '⚠⚠ …and the appraisal flags no longer hold the line');
    eq(val(attempt(() => R.ctx.invLineReviewed(v, R.ctx.invAcceptCtx(R.job)))), true, '…it is reviewed: a person\'s figure');
    eq(val(attempt(() => R.ctx.invLineAcceptedOnly(v, R.ctx.invAcceptCtx(R.job)))), false, '…as checked, never as accepted');
  }

  group('⚠⚠ A12 · what no longer holds since round two');
  {
    eq(stands(ESTATE(), [DRAWER({ qty: 12, fmv: 2400, valLow: 1800, valHigh: 2900 })]), true,
      '⚠⚠ a lot over the Form 706 article cap (12 at $200 each) stands: a tick does not split a lot; Lots to split asks for that');
    eq(stands(ESTATE({ gate706: 'no' }), [DRAWER({ qty: 12, fmv: 2400, valLow: 1800, valHigh: 2900 })]), true, '…as on an estate filing no 706');
  }

  group('⚠⚠ A13 · what a tick cannot answer (invLineOpen): no name, an open possible duplicate; Undecided and Hold ticked are reviewed');
  {
    const R = rig(ESTATE(), [TICKED({ stableId: 'n', objectName: '', valNameAt: '' }), TICKED({ stableId: 'u', disposition: 'Undecided' }),
      TICKED({ stableId: 'h', disposition: 'Hold' }), TICKED({ stableId: 'f', flagNFA: true, objectName: '', valNameAt: '' }),
      TICKED({ stableId: 'q', needsAppr: true }), DRAWER({ stableId: 'o' }), TWIN('a', { reviewed: true, reviewedBy: 'Ashley Jerome', valReviewed: true }), TWIN('b')]);
    const fc = val(attempt(() => R.ctx.invAcceptCtx(R.job)));
    const open = (id, c) => val(attempt(() => R.ctx.invLineOpen(R.ref(id), c === undefined ? fc : c)));
    const rev = (id, c) => val(attempt(() => R.ctx.invLineReviewed(R.ref(id), c === undefined ? fc : c)));
    eq([open('n'), open('a'), open('b')], ['noname', 'duplicate', 'duplicate'], '⚠⚠ invLineOpen: no name, and both halves of an open pair');
    eq(open('f'), 'noname', '⚠ an unnamed firearm: open for its name (only the open reasons are asked, whatever comes first)');
    eq([open('u'), open('h'), open('q'), open('o')], ['', '', '', ''], 'Undecided, Hold, a flag a tick answers, a standing line: nothing open');
    eq(open('n', null), '', 'no facts: nothing open (the old behaviour)');
    eq([rev('n'), rev('a'), rev('f')], [false, false, false], '⚠⚠ ticked, and still open: not reviewed (no name; a possible duplicate; an unnamed firearm)');
    eq([rev('u'), rev('h')], [true, true], '⚠⚠ Undecided or Hold, ticked: reviewed (a state a person may leave a line in at night)');
    eq(rev('q'), true, 'a flag answered by its tick: reviewed');
    eq(rev('n', null), true, 'no facts: a tick reads as it did before (nothing is known to be open)');
    const st = val(attempt(() => R.ctx._invReviewStats(R.ctx._jobInvRefs(7), fc)));
    eq(st && [st.done, st.total, st.accepted], [4, 8, 1], 'the counts: Undecided, Hold, the flag answered and the standing line; nothing else');
    // Naming the line, and Not duplicates, are what settle them.
    R.ref('n').objectName = 'Hand mirror, silver-backed';
    R.ref('n').valNameAt = 'Hand mirror, silver-backed';
    eq(rev('n', val(attempt(() => R.ctx.invAcceptCtx(R.job)))), true, '⚠ named: the tick reviews it');
  }

  // ═══════════════════════════════ B · ITS READERS ═══════════════════════════════
  group('⚠⚠ B1 · invLineReviewed asks invLineAccepted first; the unsure hint shows wherever either agent guessed, until a look (Q108)');
  {
    const R = rig(ESTATE(), [DRAWER(), DRAWER({ stableId: 'f1', needsAppr: true }), TICKED({ stableId: 'f2', needsAppr: true }),
      DRAWER({ stableId: 'g1', agentConf: 'low', valConf: 'low' }), DRAWER({ stableId: 'g2', agentConf: 'low' }), DRAWER({ stableId: 'g3', valConf: 'low' }),
      NAMED('Hall bench', { stableId: 'n1', namedBy: 'desk', valuedBy: undefined, fmv: '', valLow: undefined, valHigh: undefined }),
      DRAWER({ stableId: 'g4', agentConf: 'low', valConf: 'low', objectName: 'Cast iron skillet', valNameAt: 'Iron pan' })], { user: 'Anthony Graziano' });
    const fc = val(attempt(() => R.ctx.invAcceptCtx(R.job)));
    const rev = (id, c) => val(attempt(() => R.ctx.invLineReviewed(R.ref(id), c)));
    const unsure = (id) => val(attempt(() => R.ctx.invLineUnsure(R.ref(id))));
    eq(rev('d1', fc), true, '⚠⚠ the drawer: reviewed with nobody ticking it, its agent figure unlooked-at');
    eq(rev('d1', null), false, '⚠ …and not without the job\'s facts');
    eq(rev('f1', fc), false, 'a flagged line, unticked: not reviewed');
    eq(rev('f2', fc), true, 'a flagged line, ticked: reviewed');
    eq(rev('n1', fc), true, 'named and decided on the desk, no agent figure: reviewed as before');
    eq(unsure('g1'), true, '⚠⚠ both agents guessing: unsure (and held)');
    eq(val(attempt(() => R.ctx.invLineAccepted(R.ref('g3'), fc))), true, 'fixture: Agent Two alone guessing, the line stands');
    eq(unsure('g3'), true, '⚠⚠ Q108: …and still shows unsure, a cue for the night\'s read');
    eq(unsure('g2'), false, 'Agent One\'s guess settled by Agent Two\'s figure under that very name: no hint');
    eq(unsure('g4'), true, 'Agent One\'s guess with Agent Two\'s figure made under another name: unsure');
    eq(unsure('d1'), false, 'neither: no hint');
    eq(unsure('f2'), false, 'a ticked line: no hint');
    // ⚠⚠ The hint goes with a tick, on a standing line as on a held one.
    const t = attempt(() => R.ctx._invSetReviewed(7, 'g3', true));
    ok(t.ok, 'the tick runs (' + (t.err || '') + ')');
    eq(unsure('g3'), false, '⚠⚠ ticked: the hint goes');
    eq(R.ref('g3').reviewedBy, 'Anthony Graziano', '…the look recorded by the device\'s user');
  }

  group('⚠⚠ B1b · a figure a person recorded is their look: no unsure hint over it (Q105)');
  {
    const R = rig(ESTATE(), [DESK({ stableId: 'k', namedBy: 'agent', agentConf: 'low' }),
      DESK({ stableId: 'ap', namedBy: 'agent', agentConf: 'low', valuedBy: 'appraiser', valSource: 'Appraisal', fmv: 5000 }),
      DESK({ stableId: 'k0', namedBy: 'agent', agentConf: 'low', fmv: '' }), DRAWER({ stableId: 'ag', agentConf: 'low', valConf: 'low' })]);
    const unsure = (id) => val(attempt(() => R.ctx.invLineUnsure(R.ref(id))));
    eq(unsure('k'), false, '⚠⚠ Agent One\'s guess under a figure typed on the desk: no hint (the box was already ticked and fixed)');
    eq(unsure('ap'), false, '⚠ …under the appraisal\'s figure: likewise');
    eq(unsure('k0'), true, 'the desk\'s box cleared, no figure: Agent One\'s guess shows again');
    eq(unsure('ag'), true, 'control: both agents guessing, no person\'s figure: unsure');
    const row = val(attempt(() => R.ctx._renderInvRow(R.job, R.ref('k'))));
    lacks(row, 'class="inv-unsure"', '⚠ the row over a desk figure draws no hint');
  }

  group('⚠⚠ B2 · the Not reviewed chip and the group counts count only the flagged lines, through the desk\'s own context');
  {
    const R = rig(ESTATE(), [DRAWER(), DRAWER({ stableId: 'f1', needsAppr: true }), TICKED({ stableId: 'f2', needsAppr: true })]);
    const chip = val(attempt(() => R.ctx.invWorkFlags(R.job).find((f) => f.key === 'unreviewed')));
    ok(chip && chip.label === 'Not reviewed', 'fixture: the Not reviewed chip is on the estate\'s strip');
    const t = (id) => (chip && chip.test ? val(attempt(() => chip.test(R.ref(id), R.job))) : 'no chip');
    eq([t('d1'), t('f1'), t('f2')], [false, true, false], '⚠⚠ only the flagged, unticked line is counted');
    const groups = () => val(attempt(() => R.ctx._invGroupItems(R.job, R.ctx._photoRefs[7].slice())));
    const g = groups(), donate = Array.isArray(g) ? g.find((x) => x.key === 'Donate') : null;
    eq(donate ? [donate.reviewed, donate.items.length] : g, [2, 3], '⚠ the Donate group: 2 of 3 reviewed (the drawer by the rule, f2 by its tick)');
    // ⚠ The chip and the groups read the paint's duplicate index when it is this job's (_invAcceptCtxOf), never the grouper per row.
    R.ctx._agDupSetJob = 7; R.ctx._agDupSet = { d1: 2 }; R.ctx._agDupById = {};
    eq(t('d1'), true, '⚠ with the paint\'s index naming the drawer a duplicate, the chip counts it');
    const g2 = groups(), d2 = Array.isArray(g2) ? g2.find((x) => x.key === 'Donate') : null;
    eq(d2 ? d2.reviewed : g2, 1, '…and so does the group count');
    R.ctx._agDupSetJob = 9;
    eq(t('d1'), false, '⚠ another client\'s index is never read: the facts are worked out for this one');
  }

  group('⚠⚠ B3 · the row\'s box in each of its states');
  {
    const DESKFIG = DESK({ stableId: 'k1', valSource: undefined });
    const DESKNAME = NAMED('Hall bench', { stableId: 'k2', namedBy: 'desk', valuedBy: undefined, fmv: '', valLow: undefined, valHigh: undefined });
    const DESKNAMED_AGENTFIG = NAMED('Hall bench, oak', { stableId: 'k3', namedBy: 'desk' });
    const APPRFIG = DESK({ stableId: 'k4', valuedBy: 'appraiser', valSource: 'Appraisal', fmv: 5000 });
    const R = rig(ESTATE(), [DRAWER(), DESKFIG, DESKNAME, DESKNAMED_AGENTFIG, APPRFIG, DRAWER({ stableId: 'f1', needsAppr: true }),
      DRAWER({ stableId: 'e1', reviewed: true, reviewedBy: 'Anthony Graziano' }),
      DRAWER({ stableId: 'm1', flagBequest: true, flagDisputed: true, disposition: 'Keep' }),
      DRAWER({ stableId: 'n1', objectName: '', valNameAt: '' }), DRAWER({ stableId: 'n2', objectName: '', valNameAt: '', disposition: 'Hold' }),
      TICKED({ stableId: 'n3', objectName: '', valNameAt: '' }), TICKED({ stableId: 'u1', disposition: 'Undecided' }),
      TWIN('a'), TWIN('b', { reviewed: true, reviewedBy: 'Ashley Jerome', valReviewed: true }),
      TWIN('c', { roomIdx: 2, objectName: '', namedBy: 'desk' }), TWIN('c2', { roomIdx: 2 })]);
    const box = (id, withFc) => val(attempt(() => R.ctx._invRevBoxHtml(7, R.ref(id), withFc ? R.ctx.invAcceptCtx(R.job) : undefined)));
    // Standing by the rule alone: ticked in grey, ENABLED, and a press records the person's own look (true, never this.checked).
    const a = box('d1', true);
    has(a, '<input type="checkbox" checked onchange="_invSetReviewed(7,\'d1\',true)"', '⚠⚠ standing: ticked, enabled, and a press passes true');
    lacks(a, 'disabled', '…never disabled');
    has(a, 'accent-color:var(--gray)', '…ticked in grey');
    has(a, 'title="Nothing flagged: the agents’ name and value stand as they are. Tick it to record your own look."', '…its tooltip says why');
    eq(box('d1', false), a, 'the box works out the same facts when none are handed in (_invAcceptCtxOf)');
    has(box('k3', true), 'title="Nothing flagged: the name and Agent Two’s value stand. Tick it to record your own look."',
      '⚠ a name typed on the desk over Agent Two\'s figure: the name and the value stand');
    // A person's own act: ticked, green, fixed.
    const k = box('k1', true);
    has(k, '<input type="checkbox" checked disabled onchange=', '⚠ a figure typed on the desk: ticked and fixed');
    has(k, 'color:var(--ok-tx)', '…in green');
    has(k, 'title="Reviewed: a figure recorded on the desk, nothing flagged"', '⚠ …and says so');
    const k4 = box('k4', true);
    has(k4, 'title="Reviewed: the appraisal’s figure, nothing flagged"', '⚠⚠ the appraisal\'s figure: says it is the appraisal\'s');
    has(k4, ' checked disabled', '…ticked and fixed');
    const k2 = box('k2', true);
    has(k2, ' checked disabled', 'named and decided on the desk: ticked and fixed');
    has(k2, 'title="Reviewed: named and decided on the desk"', '…and says so');
    // A flagged line: unticked, a real checkbox, and the box says why: every reason, in the rule's order.
    const f = box('f1', true);
    has(f, '<input type="checkbox" onchange=', '⚠ a flagged line: unticked');
    has(f, "onchange=\"_invSetReviewed(7,'f1',this.checked)\"", '…a press is the box\'s own state');
    has(f, 'title="Needs a look: waiting on an appraisal; a release caution. Tick it once checked."', '⚠⚠ …and its tooltip names the flag, and the caution the same fact raises');
    has(box('m1', true), 'title="Needs a look: a specific bequest; marked disputed; a release caution. Tick it once checked."', '⚠⚠ two flags: the tooltip names each, in order');
    // A tick that predates the figure: named, and offered for the value.
    has(box('e1', true), 'title="Reviewed by Anthony Graziano; Agent Two’s value since stands, nothing flagged. Tick it to record your look at the value."',
      'a tick that predates the figure: named, and offered for the value');
    // ⚠⚠ What a tick cannot settle: "Still open", with what does settle it, and the rest beside it.
    const n1 = box('n1', true);
    has(n1, 'title="Still open: no name yet: name it. A tick does not settle it."', '⚠⚠ no name: "Still open", and a tick does not settle it');
    has(n1, '<input type="checkbox" onchange=', '…unticked, a real box');
    has(box('n2', true), 'title="Still open: no name yet: name it. A tick does not settle it. Also needs a look: on Hold."', '⚠ …and what else holds it, after');
    has(box('a', true), 'title="Still open: a possible duplicate: Remove one or press Not duplicates, under Possible duplicates. A tick does not settle it."',
      '⚠⚠ a possible duplicate: Remove one or press Not duplicates');
    has(box('c', true), 'title="Still open: no name yet: name it; a possible duplicate: Remove one or press Not duplicates, under Possible duplicates. A tick does not settle these.'
      + ' Also needs a look: its value was made for an earlier name."', '⚠ both at once: "these", and the rest after');
    // ⚠⚠ Ticked, and still open ("stuck"): kept checked, in bronze, naming who ticked it and what does settle it.
    const n3 = box('n3', true);
    has(n3, 'title="Ticked by Ashley Jerome, but still open: no name yet: name it. A tick does not settle it."', '⚠⚠ ticked with no name: "Ticked by …, but still open"');
    has(n3, '<input type="checkbox" checked onchange="_invSetReviewed(7,\'n3\',this.checked)"', '⚠ …drawn checked and enabled: a press takes the tick off');
    has(n3, 'color:var(--bronze-dk)', '⚠ …its label in bronze');
    has(n3, 'accent-color:var(--bronze)', '…its tick in bronze');
    lacks(n3, 'var(--ok-tx)', '…never green');
    const b = box('b', true);
    has(b, 'title="Ticked by Ashley Jerome, but still open: a possible duplicate: Remove one or press Not duplicates, under Possible duplicates. A tick does not settle it."',
      '⚠⚠ a ticked half of an open pair: stuck too');
    has(b, 'accent-color:var(--bronze)', '…in bronze');
    R.ref('n3').reviewedBy = '';
    has(box('n3', true), 'title="Ticked, but still open: no name yet: name it. A tick does not settle it."', 'with nobody recorded: "Ticked, but still open"');
    // Undecided ticked: reviewed, green.
    const u1 = box('u1', true);
    has(u1, 'title="Reviewed by Ashley Jerome"', '⚠ Undecided, ticked: reviewed by whoever ticked it');
    has(u1, 'color:var(--ok-tx)', '…green');
    // After a press: the person's look recorded, green, its name in the tooltip, and no longer counted as accepted.
    const p = attempt(() => R.ctx._invSetReviewed(7, 'd1', true));
    ok(p.ok, 'the press runs (' + (p.err || '') + ')');
    const d = R.ref('d1');
    eq([d.reviewed, d.valReviewed, d.reviewedBy], [true, true, 'Ashley Jerome'], '⚠ the press records the one look: the line and its value, by the device\'s user else the concierge');
    const after = box('d1', true);
    has(after, 'title="Reviewed by Ashley Jerome"', '⚠ after the tick: "Reviewed by Ashley Jerome"');
    has(after, 'color:var(--ok-tx)', '…green');
    has(after, "<input type=\"checkbox\" checked onchange=\"_invSetReviewed(7,'d1',this.checked)\"", '…enabled, and a press now takes the tick off');
    eq(val(attempt(() => R.ctx.invLineAcceptedOnly(R.ref('d1'), R.ctx.invAcceptCtx(R.job)))), false, '…and the papers count it as checked, never accepted');
  }

  group('⚠ B4 · the row draws the box off the desk\'s context and the hint off the line alone');
  {
    const R = rig(ESTATE(), [DRAWER(), DRAWER({ stableId: 'g1', agentConf: 'low', valConf: 'low' }), DRAWER({ stableId: 'g3', valConf: 'low' })]);
    const row = (id) => val(attempt(() => R.ctx._renderInvRow(R.job, R.ref(id))));
    const d = row('d1'), g = row('g1'), g3 = row('g3');
    has(d, "id=\"inv-rev-d1\"", 'fixture: the drawer\'s row drew its box');
    has(d, "checked onchange=\"_invSetReviewed(7,'d1',true)\"", '⚠ the drawer\'s row: its box ticked in grey');
    lacks(d, 'class="inv-unsure"', '…and no unsure hint');
    has(g, 'class="inv-unsure"', '⚠ both guessing: the row says unsure');
    has(g, "onchange=\"_invSetReviewed(7,'g1',this.checked)\"", '…and its box is a real one, unticked');
    has(g, 'title="Needs a look: both agents were guessing. Tick it once checked."', '…saying why');
    has(g3, 'class="inv-unsure"', '⚠⚠ Agent Two alone guessing (Q108): the line stands and its row still says unsure');
    has(g3, "checked onchange=\"_invSetReviewed(7,'g3',true)\"", '…its box ticked in grey');
    const body = live(fn('_renderInvRow'));
    has(body, 'var jid = job.id, _ac = _invAcceptCtxOf(job);', 'the row works out the facts once');
    eq(count(body, '_ac)'), 1, 'and hands them to the box alone (_invRevBoxHtml)');
    eq(count(body, 'invLineUnsure(ref)'), 1, '⚠ the hint asks the line alone (Q108: a person\'s look, not the rule)');
  }

  group('⚠⚠ B5 · _invEdit: a flag ticked repaints the box, the group head and the work bar by id');
  {
    const lines = () => [DRAWER(), TICKED({ stableId: 'f2', needsAppr: true })];
    // Each flag on this Donate line is a release caution as well (not yet appraised; a bequest flag with no bequest behind it).
    [['needsAppr', 'ticked for appraisal', 'waiting on an appraisal; a release caution'], ['flagBequest', 'a specific bequest', 'a specific bequest; a release caution']].forEach(([key, what, words]) => {
      const R = rig(ESTATE(), lines());
      R.ctx._agDupSetJob = 7; R.ctx._agDupSet = {}; R.ctx._agDupById = {};
      const before = text(val(attempt(() => R.ctx._renderInvWorkbar(R.job, R.ctx._jobInvRefs(7)))));
      has(before, '2 of 2 reviewed · 1 accepted', key + ': fixture: the work bar counts the drawer as accepted');
      const e = attempt(() => R.ctx._invEdit(7, 'd1', key, { type: 'checkbox', checked: true }));
      ok(e.ok, key + ': the edit runs (' + (e.err || '') + ')');
      const rb = painted(R, 'inv-rev-d1');
      ok(rb.length > 0, '⚠⚠ ' + what + ': the box repainted by id');
      has(rb, '<input type="checkbox" onchange=', '…unticked now');
      has(rb, 'Needs a look: ' + words + '. Tick it once checked.', '…saying why');
      const head = text(painted(R, 'inv-grph-Donate'));
      has(head, '1 of 2 reviewed', '⚠ ' + what + ': the group head repainted: 1 of 2');
      const wb = text(painted(R, 'inv-workbar'));
      has(wb, '1 of 2 reviewed', '⚠ ' + what + ': the work bar repainted: 1 of 2');
      lacks(wb, 'accepted', '…and nothing accepted any more');
    });
    // An edit that moves nothing repaints nothing.
    const R = rig(ESTATE(), lines());
    R.ctx._agDupSetJob = 7; R.ctx._agDupSet = {}; R.ctx._agDupById = {};
    const e = attempt(() => R.ctx._invEdit(7, 'd1', 'condition', { value: 'Fair' }));
    ok(e.ok, 'a condition edit runs (' + (e.err || '') + ')');
    eq(painted(R, 'inv-rev-d1'), '', 'a condition changed: the box is left alone (it keeps its focus)');
  }

  group('⚠⚠ B6 · the paint\'s duplicate index: worked out before the filter, refreshed by an edit, and the other half repainted');
  {
    // Moved into the room of its same-named twin: the edit refreshes the index first, so the line is held and its box repainted,
    // and so is its other half's (the second review: only the edited row was repainted).
    const R = rig(ESTATE(), [TWIN('a', { roomIdx: 1 }), TWIN('b', { roomIdx: 2 })]);
    R.ctx._agDupSetJob = 7; R.ctx._agDupById = {};
    R.ctx._agDupSet = val(attempt(() => R.ctx._agDupIndex(7)));
    eq(R.ctx._agDupSet, {}, 'fixture: two rooms, no pair');
    const e = attempt(() => R.ctx._invEdit(7, 'a', 'roomIdx', { value: '2' }));
    ok(e.ok, 'the room edit runs (' + (e.err || '') + ')');
    eq(R.ctx._agDupSet, { a: 2, b: 2 }, '⚠ the index refreshed by the edit: the pair');
    const ra = painted(R, 'inv-rev-a');
    ok(ra.indexOf('<input type="checkbox" onchange=') >= 0, '⚠ …and the moved line\'s box repainted, unticked');
    has(ra, 'Still open: a possible duplicate: Remove one or press Not duplicates, under Possible duplicates. A tick does not settle it.', '…sending the person to Possible duplicates');
    const rb = painted(R, 'inv-rev-b');
    ok(rb.length > 0, '⚠⚠ the other half\'s box repainted too, by id');
    has(rb, 'Still open: a possible duplicate', '…now held as a possible duplicate');
    has(rb, '<input type="checkbox" onchange=', '…unticked');
    // Parted: moved back out, the other half stands again, its box repainted.
    const R2 = rig(ESTATE(), [TWIN('a', { roomIdx: 2 }), TWIN('b', { roomIdx: 2 })]);
    R2.ctx._agDupSetJob = 7; R2.ctx._agDupById = {};
    R2.ctx._agDupSet = val(attempt(() => R2.ctx._agDupIndex(7)));
    eq(R2.ctx._agDupSet, { a: 2, b: 2 }, 'fixture: a pair in one room');
    attempt(() => R2.ctx._invEdit(7, 'a', 'roomIdx', { value: '1' }));
    eq(R2.ctx._agDupSet, {}, 'moved out: no pair');
    const pb = painted(R2, 'inv-rev-b');
    ok(pb.length > 0, '⚠⚠ parted: the other half\'s box repainted');
    has(pb, "checked onchange=\"_invSetReviewed(7,'b',true)\"", '…standing again, ticked in grey');
    // An edit that joins or parts nothing repaints no other line.
    const R3 = rig(ESTATE(), [TWIN('a', { roomIdx: 2 }), TWIN('b', { roomIdx: 2 }), DRAWER({ stableId: 'z' })]);
    R3.ctx._agDupSetJob = 7; R3.ctx._agDupById = {};
    R3.ctx._agDupSet = val(attempt(() => R3.ctx._agDupIndex(7)));
    attempt(() => R3.ctx._invEdit(7, 'z', 'condition', { value: 'Fair' }));
    eq([painted(R3, 'inv-rev-a'), painted(R3, 'inv-rev-b'), painted(R3, 'inv-rev-z')], ['', '', ''], 'an edit that moves no pair repaints no box');
    // Another client's index is not touched.
    const R4 = rig(ESTATE(), [TWIN('a', { roomIdx: 1 }), TWIN('b', { roomIdx: 2 })]);
    R4.ctx._agDupSetJob = 9; R4.ctx._agDupSet = { other: 1 };
    attempt(() => R4.ctx._invEdit(7, 'a', 'roomIdx', { value: '2' }));
    eq(R4.ctx._agDupSet, { other: 1 }, 'another client\'s paint index is left as it is');
    eq(painted(R4, 'inv-rev-b'), '', '…and no other half is repainted off it');
    // The paint: the index, its job and the lines by id set BEFORE the rows are filtered (the Not reviewed chip filters through it).
    const body = live(fn('renderInventoryTab'));
    ok(body.length > 2000 && body.length < 60000, 'fixture: renderInventoryTab read, bounded (' + body.length + ' chars)');
    const ix = '_agDupSet = _agDupIndex(jobId, all);', tag = '_agDupSetJob = jobId;', byId = '_agDupById = {};',
      fill = 'all.forEach(function(r) { _agDupById[r.stableId] = r; });',
      filt = 'var items = all.filter(function(r){ return _invMatchesFilter(r, job); });';
    eq([count(body, ix), count(body, tag), count(body, byId), count(body, fill), count(body, filt)], [1, 1, 1, 1, 1], 'each once in the paint');
    const a = body.indexOf(ix), b = body.indexOf(tag), c = body.indexOf(byId), d = body.indexOf(fill), f = body.indexOf(filt);
    ok(a >= 0 && b > a && c > b && d > c && f > d, '⚠ the index, its job, the lines by id, then the filter (' + [a, b, c, d, f].join(' < ') + ')');
  }

  group('⚠⚠ B7 · THE READ IS A FINGERPRINT (invListSeen): what moves it, what never does');
  {
    // The manifest: two live lines, a removed one, and shots and a collection document that are not lines.
    const M = () => [DRAWER({ stableId: 'a', ts: 100, updatedAt: 500 }), DRAWER({ stableId: 'b', ts: 200 }),
      DRAWER({ stableId: 'c', ts: 300, updatedAt: 900, deletedAt: 900 }),
      { stableId: 'af', label: 'before', roomIdx: 1, ts: 50, updatedAt: 5000 }, { stableId: 'dt', label: 'detail', groupId: 'a', roomIdx: 1, ts: 60, updatedAt: 6000 },
      { stableId: 'cp', label: 'inventory', collId: '3', roomIdx: 1, ts: 70, updatedAt: 7000 }];
    const R = rig(ESTATE(), M());
    const fp = (X) => val(attempt(() => X.ctx.invListSeen(7)));
    const f0 = fp(R);
    ok(/^3:[0-9a-f]{1,8}$/.test(String(f0)), '⚠⚠ "<count>:<hex>": three lines (the removed one counted), never a shot or a collection document (' + f0 + ')');
    eq(val(attempt(() => JSON.parse(JSON.stringify(R.ctx.INV_READ_FIELDS)))),
      ['objectName', 'category', 'qty', 'fmv', 'valLow', 'valHigh', 'valSource', 'disposition', 'channel', 'condition', 'roomIdx'],
      '⚠ INV_READ_FIELDS: what the papers print of a line');
    eq(fp(rig(ESTATE(), [])), '0:811c9dc5', 'no lines: a count of 0 and FNV-1a\'s offset basis');
    eq(fp(rig(ESTATE(), M().reverse())), f0, '⚠⚠ the same list on two copies built in different orders: the same fingerprint');
    eq(fp(rig(ESTATE(), M().filter((r) => r.label !== 'inventory' || r.stableId !== 'cp').filter((r) => r.label === 'inventory'))), f0, 'the shots and the collection document change nothing');
    eq(fp(rig(ESTATE(), M().concat([{ stableId: 'af2', label: 'before', roomIdx: 2, ts: 80 }]))), f0, '…nor does another as-found shot');
    // ⚠⚠ Every field the papers print moves it, one at a time.
    const CHANGE = { objectName: 'Silver flatware', category: 'Furniture', qty: 3, fmv: 41, valLow: 21, valHigh: 61, valSource: 'Dealer quote',
      disposition: 'Sell', channel: 'Ruth Adler', condition: 'Fair', roomIdx: 2 };
    Object.keys(CHANGE).forEach((k) => {
      const X = rig(ESTATE(), M());
      X.ref('b')[k] = CHANGE[k];
      ok(fp(X) !== f0 && /^3:/.test(String(fp(X))), '⚠⚠ moved by ' + k);
    });
    // A field cleared moves it too (a blank is "not valued", and a paper prints it so).
    const Xc = rig(ESTATE(), M()); Xc.ref('a').fmv = '';
    ok(fp(Xc) !== f0, 'a figure cleared moves it');
    // A removal and a restore, through the real writers.
    const Xr = rig(ESTATE(), M(), { user: 'Anthony Graziano' });
    attempt(() => Xr.ctx._invTombstoneLine(7, Xr.ref('b')));
    const fr = fp(Xr);
    ok(!!Xr.ref('b').deletedAt && fr !== f0 && /^3:/.test(String(fr)), '⚠⚠ a removal (_invTombstoneLine) moves it; the count stays (the line is still on the manifest)');
    const Xs = rig(ESTATE(), M());
    attempt(() => Xs.ctx.restoreInventoryItem(7, 'c'));
    ok(!Xs.ref('c').deletedAt && fp(Xs) !== f0, '⚠⚠ a restore (restoreInventoryItem) moves it');
    ok(fp(rig(ESTATE(), M().concat([DRAWER({ stableId: 'e' })]))).indexOf('4:') === 0, 'a new line: four lines');
    // ⚠⚠ What never moves it: the stamps that are not what the papers print.
    const S = rig(ESTATE(), M(), { user: 'Anthony Graziano', now: READ_AT });
    const tick = attempt(() => S.ctx._invSetReviewed(7, 'a', true));
    ok(tick.ok && S.ref('a').reviewed === true, 'fixture: a tick (' + (tick.err || 'ok') + ')');
    eq(fp(S), f0, '⚠⚠ a tick never moves it');
    const arw = attempt(() => S.ctx._arWrite(7, { photos: [{ lines: [S.ref('a'), S.ref('b')] }] }, { doubles: [] }));
    ok(arw.ok && S.ref('a').dupChkAt === READ_AT && S.ref('b').dupChkAt === READ_AT, 'fixture: a room check that found nothing (_arWrite stamps dupChkAt) (' + (arw.err || 'ok') + ')');
    eq(fp(S), f0, '⚠⚠ …never moves it');
    attempt(() => S.ctx._invAssignItemNos(7));
    ok(S.ref('a').itemNo > 0 && S.ref('b').itemNo > 0, 'fixture: item numbers issued (_invAssignItemNos)');
    eq(fp(S), f0, '⚠⚠ …never moves it');
    S.ref('a').custodyLog = [{ id: 'e1', at: READ_AT, action: 'Released', to: 'Goodwill', by: 'Anthony Graziano' }];
    S.ref('a').authBy = 'Tripp Butler'; S.ref('a').approvalDate = '2026-10-26';
    S.ref('b').agentNotices = [{ kind: 'other', text: 'a mark' }]; S.ref('b').valNotices = [{ kind: 'appraiser', text: 'signed' }];
    S.ref('b').updatedAt = READ_AT + 1e10; S.ref('b').reviewedBy = 'Ashley Jerome'; S.ref('b').dupOK = true; S.ref('b').valConf = 'high';
    eq(fp(S), f0, '⚠⚠ …nor a custody event, an approval, a notice from either agent, a clock, a reviewer, Not duplicates or a confidence');
  }

  group('⚠⚠ B7b · the read is current while the list still says what was read: never a time');
  {
    const M = () => [DRAWER({ stableId: 'a', ts: 100, updatedAt: 50 }), DRAWER({ stableId: 'b', ts: 200, updatedAt: 60 })];
    const cur = (X) => { const r = val(attempt(() => X.ctx.invListRead(X.job))); return r && typeof r === 'object' ? r.current : r; };
    // The press, through the real handler.
    const R = rig(ESTATE(), M(), { user: 'Anthony Graziano', now: READ_AT });
    const pr = attempt(() => R.ctx.invMarkListRead(7));
    ok(pr.ok, 'the press runs (' + (pr.err || '') + ')');
    const seen0 = val(attempt(() => R.ctx.invListSeen(7)));
    eq(R.job.invRead, { at: READ_AT, by: 'Anthony Graziano', seen: seen0 }, '⚠⚠ job.invRead: when, the device\'s user, and the fingerprint of the list read');
    eq(val(attempt(() => R.ctx.invListRead(R.job))), { at: READ_AT, by: 'Anthony Graziano', current: true }, '⚠ invListRead: current');
    // ⚠⚠ What never unreads it, through the real writers.
    attempt(() => R.ctx._invSetReviewed(7, 'a', true));
    eq(cur(R), true, '⚠⚠ a tick never unreads it');
    attempt(() => R.ctx._arWrite(7, { photos: [{ lines: [R.ref('a'), R.ref('b')] }] }, { doubles: [] }));
    eq(cur(R), true, '⚠⚠ a room check that found nothing never unreads it (the second review: it did)');
    attempt(() => R.ctx._invAssignItemNos(7));
    eq(cur(R), true, '⚠ item numbers issued');
    R.ref('b').custodyLog = [{ id: 'e1', at: READ_AT, action: 'Released', to: 'Goodwill' }];
    R.ref('b').authBy = 'Tripp Butler'; R.ref('b').approvalDate = '2026-10-26';
    R.ref('b').agentNotices = [{ kind: 'other', text: 'a mark' }];
    eq(cur(R), true, '⚠ a custody event, an approval, a notice');
    // ⚠⚠ Another device's change landing after the press, stamped before it (the second reviews: the time rule counted it as
    // read). Our copy of the line was last touched at 60; theirs was renamed at 600, before the press at READ_AT, and lands after.
    const Mg = rig(ESTATE(), M(), { user: 'Anthony Graziano', now: READ_AT });
    attempt(() => Mg.ctx.invMarkListRead(7));
    eq(cur(Mg), true, 'fixture: read');
    const theirs = Object.assign({}, Mg.ref('b'), { objectName: 'Silver flatware, Gorham', updatedAt: 600 });
    ok(theirs.updatedAt > Mg.ref('b').updatedAt && theirs.updatedAt < (Mg.job.invRead || {}).at, 'fixture: their copy is newer than ours (600 > 60) and older than the press');
    const mm = attempt(() => { Mg.ctx._photoRefs[7] = Mg.ctx.mergeMediaItems(Mg.ctx._photoRefs[7], [theirs]); });
    ok(mm.ok, 'the merge runs (' + (mm.err || '') + ')');
    eq(Mg.ref('b').objectName, 'Silver flatware, Gorham', 'fixture: the merge took their name');
    eq(cur(Mg), false, '⚠⚠ a merged change landing after the press, stamped before it: unread');
    // A merge that brings only what is not printed (their tick, their room check) leaves it read.
    const Mq = rig(ESTATE(), M(), { user: 'Anthony Graziano', now: READ_AT });
    attempt(() => Mq.ctx.invMarkListRead(7));
    const ticked = Object.assign({}, Mq.ref('b'), { reviewed: true, reviewedBy: 'Ashley Jerome', dupChkAt: 600, updatedAt: 600 });
    attempt(() => { Mq.ctx._photoRefs[7] = Mq.ctx.mergeMediaItems(Mq.ctx._photoRefs[7], [ticked]); });
    eq([Mq.ref('b').reviewedBy, cur(Mq)], ['Ashley Jerome', true], '⚠ their tick and room check merged in: still read');
    // ⚠⚠ A line stamped in the future by a fast clock, its fields unchanged: still read.
    const F = rig(ESTATE(), M(), { user: 'Anthony Graziano', now: READ_AT });
    attempt(() => F.ctx.invMarkListRead(7));
    const future = Object.assign({}, F.ref('a'), { updatedAt: READ_AT + 1e10 });
    attempt(() => { F.ctx._photoRefs[7] = F.ctx.mergeMediaItems(F.ctx._photoRefs[7], [future]); });
    eq(F.ref('a').updatedAt, READ_AT + 1e10, 'fixture: the future-stamped copy won the merge');
    eq(cur(F), true, '⚠⚠ a future-stamped line with nothing printed changed: the read stands');
    // ⚠ A device clock running fast or slow changes nothing.
    const fast = rig(ESTATE(), M(), { user: 'Anthony Graziano', now: READ_AT + 365 * 864e5 });
    attempt(() => fast.ctx.invMarkListRead(7));
    eq(cur(fast), true, 'fixture: pressed on a clock a year fast');
    attempt(() => fast.ctx._invEdit(7, 'a', 'condition', { value: 'Fair' }));
    eq(cur(fast), false, '⚠⚠ …a change after it still unreads it (a time rule would call it read for a year)');
    const slow = rig(ESTATE(), [DRAWER({ stableId: 'a', updatedAt: READ_AT })], { user: 'Anthony Graziano', now: 1000 });
    attempt(() => slow.ctx.invMarkListRead(7));
    eq(cur(slow), true, '⚠⚠ pressed on a clock running decades slow, behind every line\'s stamp: current all the same');
    // A removal unreads it; a restore of a line removed when the list was read unreads it too.
    const Rm = rig(ESTATE(), M(), { user: 'Anthony Graziano', now: READ_AT });
    attempt(() => Rm.ctx.invMarkListRead(7));
    attempt(() => Rm.ctx._invTombstoneLine(7, Rm.ref('b')));
    eq(cur(Rm), false, '⚠⚠ a removal unreads it');
    const Rs = rig(ESTATE(), M().concat([DRAWER({ stableId: 'c', deletedAt: 70 })]), { user: 'Anthony Graziano', now: READ_AT });
    attempt(() => Rs.ctx.invMarkListRead(7));
    attempt(() => Rs.ctx.restoreInventoryItem(7, 'c'));
    eq([!!Rs.ref('c').deletedAt, cur(Rs)], [false, false], '⚠⚠ a restore of a line the read saw removed unreads it');
    // A read with no fingerprint, or no time, is no current read; no job, none.
    eq(val(attempt(() => R.ctx.invListRead(null))), null, 'no job: null');
    eq(val(attempt(() => R.ctx.invListRead(Object.assign({}, R.job, { invRead: undefined })))), null, 'nobody has pressed: null');
    eq(val(attempt(() => R.ctx.invListRead(Object.assign({}, F.job, { invRead: { by: 'Anthony Graziano', seen: seen0 } })))), null, 'a read with no time is no read');
    eq(val(attempt(() => F.ctx.invListRead(Object.assign({}, F.job, { invRead: { at: READ_AT, by: 'Anthony Graziano' } })))),
      { at: READ_AT, by: 'Anthony Graziano', current: false }, '⚠ a read with no fingerprint vouches for no list: never current');
    eq(val(attempt(() => F.ctx.invListRead(Object.assign({}, F.job, { invRead: { at: READ_AT, seen: (F.job.invRead || {}).seen } })))),
      { at: READ_AT, by: '', current: true }, 'no name recorded: by \'\'');
  }

  group('⚠⚠ B7c · its words, with and without a name');
  {
    const R = rig(ESTATE(), []);
    eq(val(attempt(() => R.ctx.invListReadWords({ at: READ_AT, by: 'Anthony Graziano' }))), READ_WORDS, '⚠ "read by Anthony Graziano, October 26, 2026"');
    eq(val(attempt(() => R.ctx.invListReadWords({ at: READ_AT, by: '' }))), 'read October 26, 2026', '⚠⚠ no name: the day alone, never "the desk"');
    eq(val(attempt(() => R.ctx.invListReadWords({ at: READ_AT }))), 'read October 26, 2026', '…nor one recorded at all');
    lacks(live(fn('invListReadWords')), 'the desk', 'the build\'s shorthand is gone from the words');
  }

  group('⚠⚠ B8 · pressed only on a copy that has read the sheet (invListReadRefusal): the press withheld, and refused');
  {
    const LINES = () => [DRAWER({ ts: 100 }), TICKED({ stableId: 'f2', needsAppr: true, ts: 200 })];
    const bar = (X) => String(val(attempt(() => X.ctx._renderInvWorkbar(X.job, X.ctx._jobInvRefs(7)))));
    const LOADING = 'the list is still loading from the sheet', AWAY = 'the sheet is unreachable: this is this device’s copy';
    const R = rig(ESTATE(), LINES(), { user: 'Anthony Graziano', now: READ_AT });
    eq(val(attempt(() => R.ctx.invListReadRefusal(7))), '', 'no backend set on this device: nothing to wait for, the press is offered');
    sheet(R, { url: 'https://script.google.com/macros/s/x/exec' });
    eq(val(attempt(() => R.ctx.invListReadRefusal(7))), LOADING, '⚠⚠ a backend set, the sheet not yet read: "' + LOADING + '"');
    // The work bar: no button, the reason in bronze.
    const w = readLine(bar(R));
    eq(text(w), 'List not read yet · ' + LOADING + ': the press waits for it', '⚠⚠ the work bar withholds the press and says why');
    has(w, 'color:var(--bronze-dk)', '…in bronze');
    lacks(w, 'invMarkListRead', '⚠ …no button at all');
    // ⚠⚠ And the handler refuses by itself (the onclick of a bar drawn before the read failed is still on a phone's screen).
    const p = attempt(() => R.ctx.invMarkListRead(7));
    ok(p.ok, 'the refused press runs (' + (p.err || '') + ')');
    eq(R.alerts, ['Not recorded: ' + LOADING + '. Press it once the list has been read from the sheet.'], '⚠⚠ refused by name');
    eq([R.job.invRead, R.saved.length, R.synced.length, R.job.updatedAt], [undefined, 0, 0, undefined], '⚠⚠ …and nothing recorded, saved or synced');
    eq(painted(R, 'inv-workbar'), '', '…nor the work bar redrawn');
    // The sheet unreachable: this device's copy.
    sheet(R, { seen: true, failed: true });
    eq(val(attempt(() => R.ctx.invListReadRefusal(7))), AWAY, '⚠⚠ the last read failed: "' + AWAY + '"');
    eq(text(readLine(bar(R))), 'List not read yet · ' + AWAY + ': the press waits for it', '…the work bar says so');
    attempt(() => R.ctx.invMarkListRead(7));
    eq(R.alerts[1], 'Not recorded: ' + AWAY + '. Press it once the list has been read from the sheet.', '⚠ refused by name');
    eq(R.job.invRead, undefined, '…nothing recorded');
    // A failed read before any landed reads as unreachable, as the bars on the same screen say (deskFoldState); RESTATED for
    // the build's browser step, where the line said "still loading" over bars saying the sheet was unreachable.
    const R2 = rig(ESTATE(), LINES());
    sheet(R2, { url: 'https://x', failed: true });
    eq(val(attempt(() => R2.ctx.invListReadRefusal(7))), AWAY, '⚠ no read landed and the last failed: unreachable, as the bars say (asked again by the retry)');
    // Read: the press is offered, and records.
    sheet(R, { failed: false });
    eq(val(attempt(() => R.ctx.invListReadRefusal(7))), '', 'the sheet read: nothing refuses');
    const on = readLine(bar(R));
    eq(text(on), 'List not read yet · ✓ I’ve read the list', '⚠ the press is back');
    attempt(() => R.ctx.invMarkListRead(7));
    eq(R.job.invRead && R.job.invRead.by, 'Anthony Graziano', '⚠ …and records');
    // A read already on record, then the device loses the sheet: the stale line still names it, and the press waits.
    const R3 = rig(ESTATE(), LINES(), { read: true });
    R3.ref('d1').condition = 'Fair';
    sheet(R3, { url: 'https://x', seen: true, failed: true });
    eq(text(readLine(bar(R3))), 'List ' + READ_WORDS + ' · changed since · ' + AWAY + ': the press waits for it', 'an older read: named, changed since, and the press waits');
    // A current read is shown whatever the sheet's state: it was taken on a copy that had read it.
    const R4 = rig(ESTATE(), LINES(), { read: true });
    sheet(R4, { url: 'https://x' });
    eq(text(readLine(bar(R4))), '✓ List ' + READ_WORDS, 'a current read: shown as read');
  }

  group('⚠⚠ B9 · the work bar\'s line: its host always, empty unless a line stands; its key (_invReadKey)');
  {
    const LINES = () => [DRAWER({ ts: 100 }), TICKED({ stableId: 'f2', needsAppr: true, ts: 200 })];
    const bar = (X) => String(val(attempt(() => X.ctx._renderInvWorkbar(X.job, X.ctx._jobInvRefs(7)))));
    const key = (X) => val(attempt(() => X.ctx._invReadKey(X.job, X.ctx._invReviewStats(X.ctx._jobInvRefs(7), X.ctx._invAcceptCtxOf(X.job)))));
    // Never read: grey, and the press.
    const R = rig(ESTATE(), LINES(), { user: 'Anthony Graziano', now: READ_AT });
    const never = readLine(bar(R));
    ok(never.length > 0, 'fixture: the work bar draws #inv-read-7');
    eq(text(never), 'List not read yet · ✓ I’ve read the list', '⚠⚠ never read: "List not read yet", and the press');
    has(never, 'color:var(--gray)', '…in grey');
    has(never, 'data-rk="can"', '⚠ the host carries the state it drew: complete, a line accepted, never read');
    eq(key(R), 'can', '…which is _invReadKey\'s');
    has(never, '<button class="btn-s" onclick="invMarkListRead(7)"', '…the press calls invMarkListRead for this client');
    // ⚠⚠ The press, as the button runs it: the onclick's own code in the page's context.
    const call = (/onclick="(invMarkListRead\(\d+\))"/.exec(never) || [])[1];
    eq(call, 'invMarkListRead(7)', 'fixture: the button\'s onclick');
    const pr = attempt(() => vm.runInContext(call || 'null', R.ctx));
    ok(pr.ok, 'the press runs (' + (pr.err || '') + ')');
    eq(R.job.invRead, { at: READ_AT, by: 'Anthony Graziano', seen: val(attempt(() => R.ctx.invListSeen(7))) }, '⚠⚠ job.invRead: when, the device\'s user, the list it saw');
    eq([R.job.updatedAt, R.saved.length, R.synced], [READ_AT, 1, [7]], '⚠⚠ a person\'s edit (_saveJobEdit): the job\'s clock moved, saved once and synced');
    const cur = readLine(painted(R, 'inv-workbar'));
    eq(text(cur), '✓ List ' + READ_WORDS, '⚠⚠ the work bar repainted: "✓ List read by Anthony Graziano, October 26, 2026"');
    has(cur, 'color:var(--ok-tx)', '…in green');
    has(cur, 'data-rk="car"', '…its key: read');
    lacks(cur, 'invMarkListRead', '…and no press while it is current');
    // With no device user, the concierge.
    const Rc = rig(ESTATE(), LINES(), { now: READ_AT });
    attempt(() => Rc.ctx.invMarkListRead(7));
    eq(Rc.job.invRead && Rc.job.invRead.by, 'Ashley Jerome', 'no device user set: the job\'s concierge (_invStampBy)');
    // Read, then changed.
    const Rs = rig(ESTATE(), LINES(), { read: true });
    Rs.ref('d1').condition = 'Fair';
    const st = readLine(bar(Rs));
    eq(text(st), 'List ' + READ_WORDS + ' · changed since · ✓ I’ve read the list', '⚠ read before a change: named, "changed since", and the press again');
    has(st, 'data-rk="cas"', '…its key: stale');
    // ⚠⚠ Nothing standing as the agents left it: the host, empty (a list every line of which a person checked asks no read).
    const Rn = rig(ESTATE(), [TICKED({ stableId: 'f2', needsAppr: true })]);
    const nn = readLine(bar(Rn));
    eq(nn, '<div id="inv-read-7" data-rk="cn" style="font-size:10.5px;color:var(--gray);"></div>', '⚠⚠ nothing accepted: the host alone, empty, no margin');
    eq(text(bar(Rn)).indexOf('read the list'), -1, '…no press anywhere on the bar');
    // No lines: an empty host with an empty key.
    eq(val(attempt(() => rig(ESTATE(), []).ctx._invListReadHtml(ESTATE(), { total: 0 }))), '<div id="inv-read-7" data-rk="" style="font-size:10.5px;color:var(--gray);"></div>',
      'an empty list: the host, empty');
    // The key's other letters.
    const Ro = rig(ESTATE(), [DRAWER({ stableId: 'f1', needsAppr: true })]);
    eq(key(Ro), 'on', 'a flag open, nothing accepted, never read: "on"');
    const Rw = rig(ESTATE(), LINES());
    sheet(Rw, { url: 'https://x' });
    // The refusal's own words, so a line drawn while loading is redrawn once the read fails or lands (_invReadLineRepaint).
    eq(key(Rw), 'can' + 'the list is still loading from the sheet', 'the sheet not read: the refusal added, in its own words');
    eq(val(attempt(() => Rw.ctx._invReadKey(Rw.job, { total: 0 }))), '', 'no lines: \'\'');
    eq(val(attempt(() => Rw.ctx._invReadKey(Rw.job, null))), '', 'no counts: \'\'');
  }

  group('⚠⚠ B10 · _invEdit redraws the work bar when the state its read line drew moved, and only then');
  {
    const LINES = () => [DRAWER({ ts: 100 }), TICKED({ stableId: 'f2', needsAppr: true, ts: 200 })];
    const keyNow = (X) => val(attempt(() => X.ctx._invReadKey(X.job, X.ctx._invReviewStats(X.ctx._jobInvRefs(7), X.ctx._invAcceptCtxOf(X.job)))));
    // The host as the last paint drew it: its data-rk.
    const drawn = (X) => { X.doc.getElementById('inv-read-7').setAttribute('data-rk', keyNow(X)); };
    // ⚠⚠ Read, then a printed field changed: the bar redrawn, the read named as changed since, and the papers IN PROGRESS.
    const Re = rig(ESTATE(), LINES(), { read: true, now: READ_AT + 60000 });
    drawn(Re);
    eq(Re.doc.getElementById('inv-read-7').getAttribute('data-rk'), 'car', 'fixture: the bar drew a current read');
    const fcB = val(attempt(() => Re.ctx.invAcceptCtx(Re.job)));
    has(text(val(attempt(() => Re.ctx._invProgressStamp(Re.ctx._jobInvRefs(7), { fc: fcB })))), 'REVIEWED — ' + READ_WORDS + '; 1 item checked; 1 accepted as valued',
      'fixture: the stamp REVIEWED over the read');
    const e = attempt(() => Re.ctx._invEdit(7, 'd1', 'condition', { value: 'Fair' }));
    ok(e.ok, 'a condition edit runs (' + (e.err || '') + ')');
    const wb = painted(Re, 'inv-workbar');
    ok(wb.length > 0, '⚠⚠ the work bar redrawn by id (its read line and its sentence)');
    eq(text(readLine(wb)), 'List ' + READ_WORDS + ' · changed since · ✓ I’ve read the list', '⚠⚠ …"changed since", and the press again');
    has(readLine(wb), 'data-rk="cas"', '…its key: stale');
    eq(sentence(wb), 'Client documents print with an IN PROGRESS stamp until the list is read since its last change — they are never withheld.', '…and its sentence names the read');
    const fcA = val(attempt(() => Re.ctx.invAcceptCtx(Re.job)));
    has(text(val(attempt(() => Re.ctx._invProgressStamp(Re.ctx._jobInvRefs(7), { fc: fcA })))),
      'IN PROGRESS — 1 item checked; 1 accepted as valued; the list not yet read since it last changed', '⚠⚠ …and the stamp went back to IN PROGRESS');
    // ⚠⚠ An edit that changes nothing the papers print: the key is the same, the bar left alone (nothing on it moved).
    const Rn = rig(ESTATE(), LINES(), { read: true });
    drawn(Rn);
    const n = attempt(() => Rn.ctx._invEdit(7, 'd1', 'fieldNote', { value: 'blue painter\'s tape on the base' }));
    ok(n.ok, 'a field note edit runs (' + (n.err || '') + ')');
    eq(painted(Rn, 'inv-workbar'), '', '⚠⚠ the key unchanged: the work bar is not redrawn');
    eq(val(attempt(() => Rn.ctx.invListRead(Rn.job).current)), true, '…and the read stands');
    // ⚠ Never read, a printed field changed: still never read, the key unchanged, nothing redrawn.
    const Rv = rig(ESTATE(), LINES());
    drawn(Rv);
    attempt(() => Rv.ctx._invEdit(7, 'd1', 'condition', { value: 'Fair' }));
    eq(painted(Rv, 'inv-workbar'), '', '⚠ never read, a condition changed: the same key, nothing redrawn');
    // ⚠ A host drawn in another state (the sheet landed since, a tick elsewhere): redrawn.
    const Rx = rig(ESTATE(), LINES());
    Rx.doc.getElementById('inv-read-7').setAttribute('data-rk', 'canw');
    attempt(() => Rx.ctx._invEdit(7, 'd1', 'fieldNote', { value: 'x' }));
    ok(painted(Rx, 'inv-workbar').length > 0, '⚠ a host drawn while the sheet was unread: redrawn on the next edit');
    // ⚠ The last standing line flagged: the read is no longer owed, and the key says so.
    const Rf = rig(ESTATE(), LINES());
    drawn(Rf);
    attempt(() => Rf.ctx._invEdit(7, 'd1', 'flagBequest', { type: 'checkbox', checked: true }));
    const wf = painted(Rf, 'inv-workbar');
    ok(wf.length > 0, 'the last standing line flagged: the bar redrawn');
    has(readLine(wf), 'data-rk="on"', '…its key: a flag open, nothing accepted, never read');
    eq(text(readLine(wf)), '', '…and no read line (nothing stands as the agents left it)');
  }

  group('⚠⚠ B11 · the work bar\'s sentence in each state');
  {
    const bar = (X) => String(val(attempt(() => X.ctx._renderInvWorkbar(X.job, X.ctx._jobInvRefs(7)))));
    const S = 'Client documents print with an IN PROGRESS stamp until ';
    const END = ' — they are never withheld.';
    const sent = (refs, opt) => sentence(bar(rig(ESTATE(), refs, opt)));
    const FLAG = (id) => DRAWER({ stableId: id, needsAppr: true }), CHECKED = (id) => TICKED({ stableId: id, needsAppr: true }), STOOD = (id) => DRAWER({ stableId: id });
    eq(sent([FLAG('f1'), CHECKED('c1')]), S + 'every flagged item is checked' + END, '⚠ a flag open, nothing accepted: the flags alone');
    eq(sent([FLAG('f1'), CHECKED('c1'), STOOD('s1')]), S + 'every flagged item is checked and the list is read since its last change' + END,
      '⚠⚠ a flag open and a line standing, never read: the flags and the read');
    eq(sent([FLAG('f1'), CHECKED('c1'), STOOD('s1')], { read: true }), S + 'every flagged item is checked' + END, '…the list read: the flags alone');
    eq(sent([CHECKED('c1'), STOOD('s1')]), S + 'the list is read since its last change' + END,
      '⚠⚠ every flag checked, a line standing, never read: the read alone (the second review: the sentence went in the one state where the read was all that was owed)');
    const Rs = rig(ESTATE(), [CHECKED('c1'), STOOD('s1')], { read: true });
    Rs.ref('s1').condition = 'Fair';
    eq(sentence(bar(Rs)), S + 'the list is read since its last change' + END, '…read, then changed: the read again');
    eq(sent([CHECKED('c1'), STOOD('s1')], { read: true }), '', '⚠⚠ every flag checked and the list read: no sentence (the papers print REVIEWED)');
    eq(sent([CHECKED('c1')]), '', 'nothing standing, every flag checked: none (REVIEWED needs no read)');
    eq(sent([]), '', 'no lines: none');
  }

  group('⚠⚠ B12 · the loud notices outlive their line: listed above the rows against the photograph\'s first line still listed');
  {
    const R = rig(ESTATE(), [PHOTO({ deletedAt: 9, agentNotices: [{ kind: 'firearm', text: 'a rifle case on the shelf' }, { kind: 'other', text: 'a hallmark' },
      { kind: 'nfa', text: 'a short barrel' }] }), SPLIT(), SPLIT({ stableId: 's2', objectName: 'Belt, leather', valNameAt: 'Belt, leather', ts: 5 })]);
    const ns = val(attempt(() => R.ctx.agentNotices(7, R.ctx._jobInvRefs(7))));
    ok(Array.isArray(ns), 'agentNotices runs (' + (typeof ns === 'string' ? ns : 'ok') + ')');
    const by = (k) => (Array.isArray(ns) ? ns.filter((n) => n.kind === k) : []);
    eq(by('firearm').map((n) => [n.text, n.ref && n.ref.stableId]), [['a rifle case on the shelf', 's1']], '⚠⚠ the removed line\'s Firearm note: listed, against its heir (the first line still listed off the photograph)');
    eq(by('nfa').map((n) => [n.text, n.ref && n.ref.stableId]), [['a short barrel', 's1']], '⚠ …and its Possible NFA note');
    eq(by('other'), [], '⚠ its Look at this: not listed (it went with its line)');
    eq(val(attempt(() => R.ctx.agentNoticeLoud('firearm'))) && val(attempt(() => R.ctx.agentNoticeLoud('nfa'))), true, 'agentNoticeLoud: firearm and nfa');
    eq([val(attempt(() => R.ctx.agentNoticeLoud('other'))), val(attempt(() => R.ctx.agentNoticeLoud('mustfind')))], [false, false], '…never a Look at this or a Must find');
    // No heir left on the list: nothing to list it against.
    const R2 = rig(ESTATE(), [PHOTO({ deletedAt: 9, agentNotices: [{ kind: 'firearm', text: 'a rifle' }] }), SPLIT({ deletedAt: 9 })]);
    eq(val(attempt(() => R2.ctx.agentNotices(7, R2.ctx._jobInvRefs(7)))), [], 'every line off the photograph removed: nothing listed');
    // The live photograph line's own: listed against itself, as ever.
    const R3 = rig(ESTATE(), [PHOTO({ agentNotices: [{ kind: 'firearm', text: 'a rifle' }] }), SPLIT()]);
    const n3 = val(attempt(() => R3.ctx.agentNotices(7, R3.ctx._jobInvRefs(7))));
    eq(Array.isArray(n3) ? n3.map((n) => [n.kind, n.ref.stableId]) : n3, [['firearm', 'p1']], 'a live photograph line: its own note, against itself');
  }

  group('⚠⚠ B13 · a waiver repaints the row\'s box, its group and the work bar');
  {
    const R = rig(ESTATE(), [DRAWER({ stableId: 'v', category: 'Furniture', fmv: 3200, valLow: 2800, valHigh: 3600 }), TICKED({ stableId: 't' })],
      { prompt: 'Anthony: an ordinary sofa, no appraisal' });
    eq(val(attempt(() => R.ctx.invLineHold(R.ref('v'), R.ctx.invAcceptCtx(R.job)))), 'appraisal', 'fixture: the sofa waits on an appraisal');
    const w = attempt(() => R.ctx.waiveAppraisal(7, 'v'));
    ok(w.ok, 'waiveAppraisal runs (' + (w.err || '') + ')');
    eq([R.ref('v').apprWaived, R.ref('v').apprWaiveReason], [true, 'Anthony: an ordinary sofa, no appraisal'], 'fixture: the waiver recorded');
    const box = painted(R, 'inv-rev-v');
    ok(box.length > 0, '⚠⚠ the row\'s box repainted by id');
    has(box, "checked onchange=\"_invSetReviewed(7,'v',true)\"", '…standing now, ticked in grey');
    ok(text(painted(R, 'inv-grph-Donate')).indexOf('2 of 2 reviewed') >= 0, '⚠ its group head repainted: 2 of 2');
    has(text(painted(R, 'inv-workbar')), '2 of 2 reviewed · 1 accepted', '⚠ the work bar repainted');
    // No reason given: nothing recorded, nothing repainted.
    const R2 = rig(ESTATE(), [DRAWER({ stableId: 'v', category: 'Furniture', fmv: 3200, valLow: 2800, valHigh: 3600 })]);
    attempt(() => R2.ctx.waiveAppraisal(7, 'v'));
    eq([R2.ref('v').apprWaived, painted(R2, 'inv-rev-v')], [undefined, ''], 'no reason given: nothing recorded or repainted');
  }

  group('⚠⚠ B14 · the package names the read still owed (probatePackageGaps)');
  {
    // Every room locked, so the read is the only gap (two rooms in the rig's estimate).
    const gaps = (refs, opt) => {
      const R = rig(ESTATE(), refs, opt);
      attempt(() => { R.ctx.jobPlanStore[7] = { rooms: { 1: { status: 'locked' }, 2: { status: 'locked' } } }; });
      if (opt && opt.after) opt.after(R);
      return val(attempt(() => R.ctx.probatePackageGaps(7)));
    };
    eq(gaps([DRAWER(), TICKED({ stableId: 't' })]), ['the list not yet read'], '⚠⚠ a line standing, never read: "the list not yet read"');
    eq(gaps([DRAWER(), TICKED({ stableId: 't' })], { read: true }), [], '…read: no gap');
    eq(gaps([DRAWER(), TICKED({ stableId: 't' })], { read: true, after: (R) => { R.ref('d1').condition = 'Fair'; } }), ['the list not yet read since it last changed'],
      '⚠ read, then changed: "since it last changed"');
    eq(gaps([TICKED({ stableId: 't' })]), [], 'nothing standing: no read owed');
    eq(gaps([DRAWER({ stableId: 'f', needsAppr: true })]), [], 'a flag open, nothing standing: no read owed (the flag is the desk\'s)');
    eq(gaps([DRAWER(), DRAWER({ stableId: 'u', disposition: '' })]), ['1 line with no disposition', 'the list not yet read'], 'beside the other gaps, last');
    eq(gaps([DRAWER()], { after: (R) => { R.job.gateDispute = 'yes'; } }), [], 'a disputed estate: nothing stands, no read owed');
  }

  // ═══════════════════════════════ C · THE PAPERS ═══════════════════════════════
  group('⚠⚠ C1 · the stamps say how many stood as the agents left them (Q100), and who read the list (Q107)');
  {
    const stood = (n, p) => Array.from({ length: n }, (_, i) => DRAWER({ stableId: (p || 's') + i }));
    const looked = (n, p) => Array.from({ length: n }, (_, i) => (i % 2 ? TICKED({ stableId: (p || 'c') + i })
      : TICKED({ stableId: (p || 'c') + i, needsAppr: true })));
    const open = (n) => Array.from({ length: n }, (_, i) => DRAWER({ stableId: 'o' + i, needsAppr: true }));
    // The stamp over `items`, the rig's manifest the same lines; `read`: 'current' (read as it stands) or 'stale' (read, then
    // the first line's condition changed).
    const stamp = (items, o, read) => {
      const R = rig(ESTATE(), items, read ? { read: true } : {});
      if (read === 'stale') R.ref(items[0].stableId).condition = 'Fair';
      return text(val(attempt(() => R.ctx._invProgressStamp(R.ctx._photoRefs[7], Object.assign({ fc: R.ctx.invAcceptCtx(R.job) }, o || {})))));
    };
    // 1 · nothing accepted: no read needed, the stamp as it always read.
    has(stamp(looked(3)), 'REVIEWED — all 3 items', '⚠ none standing: REVIEWED with no read, as it always did');
    const one = stamp(looked(1));
    has(one, 'REVIEWED — 1 item', '⚠ a one-line list: "1 item"');
    lacks(one, 'all 1', '…never "all 1 items"');
    lacks(stamp(looked(3)), 'read', '…and it names no read');
    // 2 · accepted, and the list read since its last change.
    const big = looked(42).concat(stood(158));
    has(stamp(big, {}, 'current'), 'REVIEWED — ' + READ_WORDS + '; 42 items checked; 158 accepted as valued', '⚠⚠ Q100 and Q107, in Anthony\'s words');
    has(stamp(stood(12), {}, 'current'), 'REVIEWED — ' + READ_WORDS + '; 12 accepted as valued', 'every line standing');
    has(stamp(looked(1).concat(stood(1)), {}, 'current'), 'REVIEWED — ' + READ_WORDS + '; 1 item checked; 1 accepted as valued', 'one of each, singular');
    // 3 · accepted, never read.
    const nr = stamp(big);
    has(nr, 'IN PROGRESS — 42 items checked; 158 accepted as valued; the list not yet read', '⚠⚠ every line reviewed, the list never read: IN PROGRESS');
    has(nr, 'This is a working copy issued during the engagement. Every item needing a closer look has been checked; the list as a whole has not been read through.',
      '⚠⚠ …with its caveat, claiming only what the app witnessed');
    lacks(nr, 'named and decided', '⚠⚠ never "named and decided" (it printed over a ticked Undecided line, and on the Contents List)');
    lacks(nr, 'REVIEWED', '…never REVIEWED');
    lacks(nr, 'since it last changed', '…and no "since": nobody read it');
    has(stamp(stood(12)), 'IN PROGRESS — 12 accepted as valued; the list not yet read', 'every line standing, never read');
    // 4 · accepted, read before a change.
    const st = stamp(big, {}, 'stale');
    has(st, 'IN PROGRESS — 42 items checked; 158 accepted as valued; the list not yet read since it last changed', '⚠⚠ read, then a line changed: IN PROGRESS');
    has(st, 'Every item needing a closer look has been checked; the list as a whole has not been read through since it last changed.', '…its caveat says since');
    lacks(st, READ_WORDS, '…and the stale read is never printed as the read');
    // ⚠⚠ A ticked Undecided line: complete, and the caveat claims nothing about its disposition.
    const und = stamp([TICKED({ stableId: 'u', disposition: 'Undecided' }), DRAWER({ stableId: 's' })]);
    has(und, 'IN PROGRESS — 1 item checked; 1 accepted as valued; the list not yet read', 'a ticked Undecided line beside a standing one: complete, read owed');
    lacks(und, 'decided', '⚠⚠ …and the stamp never says it is decided');
    // In progress (a flagged line unticked): the standing lines beside it, no read words, as before.
    const ip = stamp(looked(30).concat(stood(158), open(2)), {}, 'current');
    has(ip, 'IN PROGRESS — 30 of 32 items checked; 158 accepted as valued', '⚠ in progress, the standing lines beside it');
    lacks(ip, 'read', '…and no read named while a flag waits');
    has(stamp(looked(1).concat(open(2))), 'IN PROGRESS — 1 of 3 items reviewed', 'in progress with none standing: as it always did');
    has(stamp(open(1)), 'IN PROGRESS — 0 of 1 item reviewed', '⚠ a one-line list in progress: "0 of 1 item reviewed"');
    lacks(stamp(open(1)), '1 items', '…never "1 items"');
    has(stamp(looked(1).concat(open(2))), 'Values and dispositions on unreviewed lines may still change.', 'the valued papers\' caveat');
    // ⚠⚠ Ticked, and still open: neither half of a pair counted as checked, so the stamp stays IN PROGRESS.
    const pair = [TWIN('a', { reviewed: true, reviewedBy: 'Ashley Jerome', valReviewed: true }), TWIN('b', { reviewed: true, reviewedBy: 'Ashley Jerome', valReviewed: true })];
    has(stamp(pair, {}, 'current'), 'IN PROGRESS — 0 of 2 items reviewed', '⚠⚠ both halves of a possible duplicate ticked: IN PROGRESS, never REVIEWED');
    has(stamp([TICKED({ stableId: 'n', objectName: '', valNameAt: '' }), TICKED({ stableId: 't' })]), 'IN PROGRESS — 1 of 2 items reviewed', '⚠ a ticked line with no name: not counted');
    // The papers that print no figure.
    has(stamp(looked(2).concat(stood(5)), { namesOnly: true }, 'current'), 'REVIEWED — ' + READ_WORDS + '; 2 items checked; 5 accepted as named',
      '⚠ namesOnly (the ledger, the Contents Record): accepted as named, read');
    has(stamp(looked(2).concat(stood(5)), { namesOnly: true }), 'IN PROGRESS — 2 items checked; 5 accepted as named; the list not yet read', '…and unread');
    const nIP = stamp(looked(1).concat(stood(5), open(1)), { namesOnly: true });
    has(nIP, 'IN PROGRESS — 1 of 2 items checked; 5 accepted as named', 'namesOnly in progress');
    has(nIP, 'Dispositions on unreviewed lines may still change.', '⚠ namesOnly\'s caveat names only what the page carries');
    lacks(nIP, 'Values and dispositions', '…never the values it does not print');
    const cl = stamp(looked(1).concat(stood(5), open(1)), { noValues: true });
    has(cl, '5 accepted as named', 'noValues (the Contents List): accepted as named');
    has(cl, 'Descriptions and conditions on unreviewed lines may still change.', '…with its own caveat');
    const clr = stamp(looked(2).concat(stood(5)), { noValues: true });
    has(clr, 'Every item needing a closer look has been checked; the list as a whole has not been read through.', '⚠ the Contents List\'s complete-but-unread caveat: no disposition claimed');
    has(stamp([DRAWER({ stableId: 'a' }), DRAWER({ stableId: 'b', namedBy: 'desk' })], { noValues: true }, 'current'), 'REVIEWED — ' + READ_WORDS + '; 1 item checked; 1 accepted as named',
      'noValues reads a person-named line as checked too');
    // A name a person typed is a look on a page that prints names: checked there, accepted on a valued page.
    const pr2 = [DRAWER({ stableId: 'a' }), DRAWER({ stableId: 'b', namedBy: 'desk' })];
    has(stamp(pr2, { namesOnly: true }, 'current'), 'REVIEWED — ' + READ_WORDS + '; 1 item checked; 1 accepted as named', '⚠ a person-named line is checked on a namesOnly paper');
    has(stamp(pr2, {}, 'current'), 'REVIEWED — ' + READ_WORDS + '; 2 accepted as valued', '…and accepted on a valued one (nobody looked at its figure)');
    has(stamp([DRAWER({ stableId: 'a' }), DRAWER({ stableId: 'b', reviewed: true })], { namesOnly: true }, 'current'), 'REVIEWED — ' + READ_WORDS + '; 1 item checked; 1 accepted as named',
      'a name ticked before the figure landed: checked on a namesOnly paper');
    // A figure typed on the desk is a person's look (Q105): checked, never accepted.
    const desk = DESK({ stableId: 'k', namedBy: 'agent' });
    has(stamp([DRAWER({ stableId: 'a' }), desk], {}, 'current'), 'REVIEWED — ' + READ_WORDS + '; 1 item checked; 1 accepted as valued', '⚠ a desk figure counts as checked');
    has(stamp([desk], {}), 'REVIEWED — 1 item', '…and a list of nothing but people\'s figures needs no read');
    // A read with no name: the day alone.
    const Rn = rig(ESTATE(), stood(2), { read: { by: '' } });
    has(text(val(attempt(() => Rn.ctx._invProgressStamp(Rn.ctx._photoRefs[7], { fc: Rn.ctx.invAcceptCtx(Rn.job) })))), 'REVIEWED — read October 26, 2026; 2 accepted as valued',
      '⚠ a read with nobody named: "read October 26, 2026"');
    // No facts handed in: nothing stands, and no read is asked.
    const R0 = rig(ESTATE(), stood(12), { read: true });
    has(text(val(attempt(() => R0.ctx._invProgressStamp(R0.ctx._photoRefs[7])))), 'IN PROGRESS — 0 of 12 items reviewed', '⚠ a printer handing in no facts counts nothing as standing');
    const s = val(attempt(() => R0.ctx._invReviewStats(looked(4).concat(stood(6), open(2)), R0.ctx.invAcceptCtx(R0.job))));
    eq(s && [s.done, s.total, s.complete, s.accepted], [10, 12, false, 6], 'the counts under the words');
    eq(val(attempt(() => R0.ctx._invAcceptedStampWords({ accepted: 0 }))), '', 'none standing: no words');
  }

  group('⚠⚠ C2 · the schedules\' value stamp: the standing values\' pill, bronze until the list is read and grey after (Q104, Q109)');
  {
    const stood = (n) => Array.from({ length: n }, (_, i) => DRAWER({ stableId: 's' + i }));
    const flagged = DRAWER({ stableId: 'x', needsAppr: true, fmv: 500, valLow: 400, valHigh: 600 });
    const av = (items, o, read) => {
      const R = rig(ESTATE(), items, read ? { read: read === 'stale' ? true : read } : {});
      if (read === 'stale') R.ref(items[0].stableId).condition = 'Fair';
      return val(attempt(() => R.ctx._avUnreviewedStamp(R.ctx._photoRefs[7], Object.assign({ fc: R.ctx.invAcceptCtx(R.job) }, o || {}))));
    };
    const BRONZE = 'background:#8a6d3b;', GREY = 'background:#6b6b6b;';
    // ⚠⚠ Unread: bronze, and whose read is owed.
    const h = av(stood(4).concat([flagged]));
    has(text(h), '1 value not yet reviewed', '⚠ only the flagged agent figure is "not yet reviewed"');
    has(text(h), '4 values as Agent Two left them; list not yet read by Havellin', '⚠⚠ Q109: the standing values\' pill says whose read is owed');
    eq(count(h, BRONZE), 2, '⚠⚠ …both pills bronze');
    lacks(h, GREY, '…none grey (a grey pill above the signature line read as an approval)');
    lacks(text(h), 'accepted as valued', '…and no "accepted" until the list is read');
    eq(count(h, 'display:inline-block'), 2, 'two pills');
    has(text(av(stood(1))), '1 value as Agent Two left it; list not yet read by Havellin', '⚠ one value: "1 value as Agent Two left it"');
    // ⚠⚠ Read: grey, naming the reader.
    const rd = av(stood(4), {}, true);
    has(text(rd), '4 accepted as valued · list ' + READ_WORDS, '⚠⚠ read since the last change: grey, who and when');
    has(rd, GREY, '…grey');
    lacks(rd, BRONZE, '…and nothing bronze');
    has(text(av(stood(4), {}, { by: '' })), '4 accepted as valued · list read October 26, 2026', 'a read with nobody named: the day alone');
    // Read before a change: bronze again, since.
    const stale = av(stood(4), {}, 'stale');
    has(text(stale), '4 values as Agent Two left them; list not yet read by Havellin since it last changed', '⚠⚠ read before a change: bronze, "since it last changed"');
    has(stale, BRONZE, '…bronze');
    lacks(text(stale), READ_WORDS, '…the stale read never printed');
    has(text(av(stood(1).concat([flagged, DRAWER({ stableId: 'y', apprId: 'a1' })]))), '2 values not yet reviewed', 'two flagged: plural');
    const na = text(av(stood(4).concat([flagged]), { noAccepted: true }));
    has(na, '1 value not yet reviewed', 'noAccepted keeps the first pill');
    lacks(na, 'as Agent Two left', '⚠ noAccepted (the Estate Inventory Report, whose stamp already says it): no second pill');
    lacks(na, 'accepted as valued', '…in either colour');
    eq(av([TICKED({ stableId: 'a' }), TICKED({ stableId: 'b' })]), '', 'every figure looked at: nothing to say');
    const R = rig(ESTATE(), stood(4));
    const nofc = text(val(attempt(() => R.ctx._avUnreviewedStamp(R.ctx._photoRefs[7]))));
    has(nofc, '4 values not yet reviewed', '⚠ no facts handed in: every agent figure is unreviewed');
    lacks(nofc, 'as Agent Two left', '…and none standing');
    // The pill alone, as the stamp calls it.
    const pill = (t, bg) => '[' + bg + '|' + t + ']';
    eq(val(attempt(() => R.ctx._avAcceptedPill(3, null, pill))), '[#8a6d3b|3 values as Agent Two left them; list not yet read by Havellin]', '_avAcceptedPill with no facts: bronze, no since');
  }

  group('⚠⚠ C3 · the six printers hand in the job\'s facts, and their pages say it');
  {
    const lines = () => [DRAWER({ stableId: 'a' }), DRAWER({ stableId: 'b', namedBy: 'desk' }), DRAWER({ stableId: 'f', needsAppr: true }),
      TICKED({ stableId: 't' })];
    const page = (job, name, refs, opt) => {
      const R = rig(job, refs || lines(), opt);
      const out = val(attempt(() => R.ctx[name](7, { asHtml: true })));
      return { html: out && out.html ? out.html : '', why: out && out.why, raw: out };
    };
    // The Estate Inventory Report: the progress stamp names the standing lines once, the value stamp only what waits.
    const eir = page(ESTATE(), 'printEstateInventoryReport');
    ok(eir.html.length > 1000, 'fixture: the Estate Inventory Report printed (' + (eir.why || eir.html.length) + ')');
    has(text(eir.html), 'IN PROGRESS — 1 of 2 items checked; 2 accepted as valued', '⚠⚠ the Estate Inventory Report\'s stamp');
    has(text(eir.html), '1 value not yet reviewed', '…its value stamp names the flagged figure');
    eq(count(text(eir.html), 'accepted as valued'), 1, '⚠ …and the standing values are named once (noAccepted)');
    lacks(text(eir.html), 'as Agent Two left', '…with no second pill');
    // The Contents List (the contents tier: Agent Two's range only, never printed): accepted as named.
    const cl = page(ESTATE({ docTier: 'contents' }), 'printContentsList', lines().map((r) => Object.assign(r, { fmv: '' })));
    ok(cl.html.length > 1000, 'fixture: the Contents List printed (' + (cl.why || cl.html.length) + ')');
    has(text(cl.html), 'IN PROGRESS — 2 of 3 items checked; 1 accepted as named', '⚠⚠ the Contents List\'s stamp: accepted as named, the desk-named line checked');
    lacks(text(cl.html), 'accepted as valued', '…never as valued');
    // The Disposition Ledger: a name a person typed is a look there, so it counts as checked.
    const dl = page(ESTATE(), 'printDispositionLedger');
    ok(dl.html.length > 1000, 'fixture: the Disposition Ledger printed (' + (dl.why || dl.html.length) + ')');
    has(text(dl.html), 'IN PROGRESS — 2 of 3 items checked; 1 accepted as named', '⚠⚠ the ledger\'s stamp: the desk-named line checked');
    has(text(dl.html), 'Dispositions on unreviewed lines may still change.', '…with the namesOnly caveat');
    // ⚠⚠ The Court Inventory and the Trust Schedule (Q109): the pill bronze until the list is read.
    const ci = page(ESTATE({ svc: 'probate' }), 'printCourtInventory');
    ok(ci.html.length > 1000, 'fixture: the Court Inventory printed (' + (ci.why || ci.html.length) + ')');
    has(text(ci.html), '2 values as Agent Two left them; list not yet read by Havellin', '⚠⚠ the Court Inventory\'s pill, unread: bronze, whose read is owed');
    has(text(ci.html), '1 value not yet reviewed', '…beside the flagged figure');
    lacks(ci.html, 'background:#6b6b6b;', '…nothing grey');
    const ts = page(ESTATE({ matterType: 'trust', trustName: 'Butler Family Trust' }), 'printTrustSchedule');
    ok(ts.html.length > 1000, 'fixture: the Trust Schedule printed (' + (ts.why || ts.html.length) + ')');
    has(text(ts.html), '2 values as Agent Two left them; list not yet read by Havellin', '⚠ the Trust Schedule\'s pill, unread');
    // The Contents Record (living work): accepted as named.
    const cr = page(LIVING(), 'printContentsRecord');
    ok(cr.html.length > 1000, 'fixture: the Contents Record printed (' + (cr.why || cr.html.length) + ')');
    has(text(cr.html), 'IN PROGRESS — 2 of 3 items checked; 1 accepted as named', '⚠ the Contents Record\'s stamp');
    // ⚠⚠ The list read reaches the pages: every flag answered and the list read, the printers name the read (Q107).
    // ⚠ No item numbers yet: the printers issue them as they print (_invAssignItemNos), and a number is no change to the list
    // read (the second reviews: under the time rule, a number issued after the read unread it).
    const done = () => [DRAWER({ stableId: 'a' }), DRAWER({ stableId: 'b', namedBy: 'desk' }), TICKED({ stableId: 't' })];
    const eirR = page(ESTATE(), 'printEstateInventoryReport', done(), { read: true });
    has(text(eirR.html), 'REVIEWED — ' + READ_WORDS + '; 1 item checked; 2 accepted as valued', '⚠⚠ the Estate Inventory Report over a read list: REVIEWED, and by whom (its numbers issued as it printed)');
    const eirN = page(ESTATE(), 'printEstateInventoryReport', done());
    has(text(eirN.html), 'IN PROGRESS — 1 item checked; 2 accepted as valued; the list not yet read', '⚠⚠ …the same list unread: IN PROGRESS');
    has(text(eirN.html), 'Every item needing a closer look has been checked; the list as a whole has not been read through.', '…with the caveat');
    const ciR = page(ESTATE({ svc: 'probate' }), 'printCourtInventory', done(), { read: true });
    has(text(ciR.html), '2 accepted as valued · list ' + READ_WORDS, '⚠⚠ the Court Inventory\'s pill names the read (Q109: grey once read)');
    has(ciR.html, 'background:#6b6b6b;', '…grey');
    has(text(ciR.html), 'FINAL', '⚠ …and the schedule stays FINAL');
    const ciN = page(ESTATE({ svc: 'probate' }), 'printCourtInventory', done());
    has(text(ciN.html), 'FINAL', '⚠⚠ Q109: unread, the Court Inventory stays FINAL');
    has(text(ciN.html), '2 values as Agent Two left them; list not yet read by Havellin', '…its pill bronze');
    const tsN = page(ESTATE({ matterType: 'trust', trustName: 'Butler Family Trust' }), 'printTrustSchedule', done());
    has(text(tsN.html), 'FINAL', '⚠ the Trust Schedule too');
    has(text(page(LIVING(), 'printContentsRecord', done(), { read: true }).html), 'REVIEWED — ' + READ_WORDS + '; 2 items checked; 1 accepted as named', '⚠ the Contents Record too');
    // A disputed estate: the same lines, nothing stands, on every page, and no read is asked.
    const dsp = page(ESTATE({ gateDispute: 'yes' }), 'printEstateInventoryReport');
    has(text(dsp.html), 'IN PROGRESS — 1 of 4 items reviewed', '⚠ a disputed estate\'s report: nothing accepted (Q102)');
    lacks(text(dsp.html), 'accepted as', '…not a word of it');
  }

  // ═══════════════════════════════ D · ONE DEFINITION ═══════════════════════════════
  group('D · one rule, its reasons, one context, one read, read where they should be; nothing of the floor or the time-stamped read left');
  {
    const L = live(SRC);
    ok(L.length > SRC.length * 0.5 && L.length < SRC.length, 'fixture: the live source is most of the file (' + L.length + ' of ' + SRC.length + ')');
    // Every function whose live body calls `name`.
    const callersOf = (name) => {
      const out = new Set();
      const re = new RegExp('\\b' + name + '\\(', 'g');
      let m;
      while ((m = re.exec(SRC))) {
        const def = SRC.lastIndexOf('\nfunction ', m.index);
        if (def < 0) continue;
        const f = /^\nfunction\s+([A-Za-z0-9_$]+)\s*\(/.exec(SRC.slice(def, def + 120));
        if (!f || f[1] === name) continue;
        let body = '';
        try { body = live(fn(f[1])); } catch (e) { continue; }
        if (new RegExp('\\b' + name + '\\(').test(body)) out.add(f[1]);
      }
      return [...out].sort();
    };
    const calls = (name) => (L.match(new RegExp('\\b' + name + '\\(', 'g')) || []).length;
    // The rule: one, with its first reason and the open ones its readers.
    eq(callersOf('_invLineHolds'), ['_invRevBoxHtml', 'invLineHold', 'invLineOpen'], '⚠ _invLineHolds\' readers: the first reason, the open ones, and the box that names every one');
    eq(calls('_invLineHolds'), 4, '…and nothing else (the definition and three calls)');
    eq(live(fn('invLineHold')).replace(/\s+/g, ' ').trim(), "function invLineHold(ref, fc) { return _invLineHolds(ref, fc)[0] || ''; }", 'invLineHold is the rule\'s first reason, nothing of its own');
    eq(callersOf('invLineHold'), ['invLineAccepted'], '⚠ invLineHold\'s reader: the yes/no');
    eq(calls('invLineHold'), 2, '…and nothing else');
    eq(callersOf('invLineOpen'), ['invLineReviewed'], 'invLineOpen: the review alone');
    has(live(fn('invLineOpen')), '_invLineHolds(ref, fc, false, INV_OPEN_HOLDS)', '…asking the rule for the open reasons alone');
    eq(callersOf('invLineAccepted'), ['_avUnreviewedStamp', '_invRevBoxHtml', 'invLineAcceptedOnly', 'invLineReviewed'],
      '⚠ invLineAccepted\'s readers: the review, the accepted count, the value stamp and the row\'s tooltip');
    eq(calls('invLineAccepted'), 5, '…and nothing else (the definition and four calls)');
    has(live(fn('invLineAccepted')), 'return !invLineHold(ref, fc);', 'invLineAccepted is the reason\'s negation, nothing of its own');
    eq(callersOf('invLineAcceptedOnly'), ['_avUnreviewedStamp', '_invRevBoxHtml', '_invReviewStats'], 'the accepted count\'s readers');
    eq(callersOf('invAcceptCtx'), ['_invAcceptCtxOf', 'printContentsList', 'printContentsRecord', 'printCourtInventory', 'printDispositionLedger',
      'printEstateInventoryReport', 'printTrustSchedule', 'probatePackageGaps'], '⚠ invAcceptCtx\'s: the desk\'s context, the six printers and the package\'s gaps');
    eq(calls('invAcceptCtx'), 9, '…and nothing else (the definition and eight calls)');
    eq(callersOf('_invAcceptCtxOf'), ['_invEdit', '_invGroupItems', '_invReadLineRepaint', '_invRevBoxHtml', '_renderInvRow', '_renderInvWorkbar'], 'the desk\'s context: its readers');
    has(live(decl('INV_WORK_FLAGS')), 'return !invLineReviewed(r, _invAcceptCtxOf(job));', '…and the Not reviewed chip');
    ['printContentsList', 'printEstateInventoryReport', 'printCourtInventory', 'printTrustSchedule', 'printDispositionLedger', 'printContentsRecord']
      .forEach((p) => ok(/fc: (invAcceptCtx\(job\)|_ac\b)/.test(live(fn(p))), p + ' hands its stamps the facts'));
    eq(callersOf('_invPhotoNoteOpen'), ['_invLineHolds'], 'the photograph\'s note: the rule alone');
    has(live(fn('_invPhotoNoteOpen')), 'fc.byId[ref.derivedFrom]', '…reading the facts\' lines by id first');
    eq(callersOf('agentNoticeLoud'), ['_invPhotoNoteOpen', 'agentNotices'], 'what outlives its line: one answer, read by the rule and the list above the rows');
    // ⚠ The hint is the line's alone (Q108): one reader, handed no facts.
    eq(callersOf('invLineUnsure'), ['_renderInvRow'], 'invLineUnsure: the row alone');
    eq(calls('invLineUnsure'), 2, '…called once');
    has(live(fn('invLineUnsure')), 'invLineReviewed(ref))', '⚠ …and it asks for a person\'s look, never the rule\'s');
    // Every reason has its words, and every word a reason (gone and nocontext draw no box).
    const H = live(fn('_invLineHolds'));
    const reasons = new Set([...H.matchAll(/held\('([a-z]+)'\)/g), ...H.matchAll(/return \['([a-z]+)'\]/g)].map((m) => m[1]));
    for (const m of H.matchAll(/\? '([a-z]+)' : '([a-z]+)'/g)) { reasons.add(m[1]); reasons.add(m[2]); }
    const words = Object.keys(vm.runInNewContext(decl('INV_HOLD_WORDS') + '; INV_HOLD_WORDS'));
    eq([...reasons].sort(), ['gone', 'nocontext'].concat(words).sort(), '⚠ the rule\'s reasons: each with words in INV_HOLD_WORDS, and no words without a reason');
    const asked = [...H.matchAll(/ask\('([a-z]+)'\)/g)].map((m) => m[1]);
    eq(asked.length, new Set(asked).size, 'each reason asked once');
    ok(Object.keys(vm.runInNewContext(decl('INV_OPEN_HOLDS') + '; INV_OPEN_HOLDS')).every((k) => words.indexOf(k) >= 0), 'every open reason is a reason with words');
    eq((L.match(/\bINV_HOLD_WORDS\b/g) || []).length, 2, 'INV_HOLD_WORDS: declared once, read once (by the box)');
    has(live(fn('_invRevBoxHtml')), 'INV_HOLD_WORDS[k]', '…the box\'s tooltip');
    eq((L.match(/\bINV_OPEN_HOLDS\b/g) || []).length, 5, 'INV_OPEN_HOLDS: declared once, read by invLineOpen and the box alone');
    eq(count(live(fn('invLineOpen')), 'INV_OPEN_HOLDS') + count(live(fn('_invRevBoxHtml')), 'INV_OPEN_HOLDS'), 4, '…twice each');
    eq((L.match(/\bINV_ACCEPT_AMMO_RE\b/g) || []).length, 3, 'the ammunition words: declared once, read twice by the rule (the name and Agent One\'s first reading)');
    eq(count(H, 'INV_ACCEPT_AMMO_RE.test('), 2, '…both reads inside _invLineHolds');
    has(H, 'INV_ACCEPT_AMMO_RE.test(String(ref.valNameFrom', '…one of them valNameFrom');
    // The list read: one writer, one fingerprint, one refusal, one reader of the read.
    eq((L.match(/\.invRead\s*=/g) || []).length, 1, '⚠ job.invRead written in one place');
    has(live(fn('invMarkListRead')), 'job.invRead = { at: Date.now(), by: _invStampBy(job), seen: invListSeen(jobId) };', '…invMarkListRead, by the device\'s user, with the list it saw');
    has(live(fn('invMarkListRead')), '_saveJobEdit(job', '…as a person\'s edit');
    const mk = live(fn('invMarkListRead'));
    ok(mk.indexOf('invListReadRefusal(jobId)') >= 0 && mk.indexOf('invListReadRefusal(jobId)') < mk.indexOf('job.invRead ='), '⚠ …refusing before it writes');
    eq(callersOf('invListSeen'), ['invListRead', 'invMarkListRead'], '⚠ the fingerprint: taken by the press, compared by the read');
    eq((L.match(/\bINV_READ_FIELDS\b/g) || []).length, 2, 'INV_READ_FIELDS: declared once, read by the fingerprint alone');
    eq(callersOf('invListRead'), ['_avAcceptedPill', '_invListReadHtml', '_invProgressStamp', '_invReadKey', '_renderInvWorkbar', 'probatePackageGaps'],
      '⚠ invListRead: the stamp, the pill, the work bar\'s line, its key and its sentence, and the package\'s gaps');
    eq(callersOf('invListReadRefusal'), ['_invListReadHtml', '_invReadKey', 'invMarkListRead'], 'the refusal: the press, its line and its key');
    eq(callersOf('invListReadWords'), ['_avAcceptedPill', '_invListReadHtml', '_invProgressStamp'], 'the read\'s words: the pill, the line and the stamp');
    eq(callersOf('invMarkListRead'), ['_invListReadHtml'], 'the press: the work bar\'s button alone');
    eq(callersOf('_invListReadHtml'), ['_renderInvWorkbar'], 'the line: the work bar alone (_invEdit redraws the bar, never the line)');
    eq(callersOf('_invReadKey'), ['_invListReadHtml', '_invReadLineRepaint'], 'the key: drawn on the host, compared by the one repaint');
    eq(callersOf('_invReadLineRepaint'), ['_invEdit', '_invRefreshFromCloud'], '⚠ the repaint: after an edit, and after a sheet read that changed nothing (the build\'s browser step)');
    eq(callersOf('_avAcceptedPill'), ['_avUnreviewedStamp'], 'the standing values\' pill: the value stamp alone');
    eq(callersOf('_invReviewRepaint'), ['_invEdit', 'waiveAppraisal'], 'the box\'s repaint by id: the edit and the waiver');
    // The time-stamped read is gone, in every form it took; so is the floor.
    ['invListChangedAt', '_avReadWords', 'rd.at >= ', 'list not yet read\' + (rd ? \' since it changed\'', 'read by the desk', '\'the desk\')',
      'Every item is named and decided']
      .forEach((n) => lacks(L, n, 'gone from live code: ' + n));
    ['INV_REVIEW_FLOOR', 'invLineUnderFloor', '_invFloorStampWords', 'agentPhotoNotes', 'floorNamed', 'noFloor', 'under $100', 'Under $100']
      .forEach((n) => lacks(L, n, 'gone from live code: ' + n));
  }
};
