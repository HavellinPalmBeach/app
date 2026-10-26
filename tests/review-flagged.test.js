'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// ONLY FLAGGED LINES KEEP A TICK (2026-10-26, Q106; it replaced Q99's $100 floor, review-floor.test.js until then).
//
// Anthony, 2026-10-26: *"we will be obviously going back to the office and looking over the entire inventory list ourselves
// to make sure everything looks right. So the idea that … we need to be like ticking boxes is ridiculous to approve
// everything, because … this is our job at night. The agent identifies everything and then values it. And then we go back
// and we go over the list and we make sure it makes sense. And we verify it with what we saw on site."* He took *"Only
// flagged lines"*. So a line the agents named and valued, with a destination and nothing flagged, stands as it is
// (invLineAccepted), whatever its value (Q106: no limit), and a figure typed on the desk stands the same way (Q105). A
// tick stays only where the app flags something for a person: a note from either agent (on the line, or still open on its
// photograph's line), both agents guessing (Q101), a possible duplicate, a firearm, an NFA flag or ammunition, an
// appraisal, a bequest or a dispute, a release caution, a lot over the Form 706 article cap, a figure made for an earlier
// name, and every line of a disputed estate (Q102). The papers say how many stood as the agents left them (Q100, Q104).
//
//   A · the rule, driven through the real invLineAccepted with its whole chain lifted: what stands, what each flag holds,
//       one fixture each with every earlier step passing (a name, a destination, a figure).
//   B · its readers: invLineReviewed, the Not reviewed chip, the group counts, the row's box in each state, the unsure hint,
//       _invEdit repainting by id when a flag is ticked, the work bar's count, the paint's duplicate index.
//   C · the papers: the stamps' words exactly, and the six printers handing in the job's facts.
//   D · one definition: the rule's and the context's callers, and nothing of the floor left in live code.
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

// Everything this file drives, lifted once by its call tree: the rule and its readers, the desk's row, group head, work bar
// and edit, and the six printers. Only data and the screen's other cards are stubs (each a no-op that records nothing).
const ROOTS = ['invLineAccepted', 'invAcceptCtx', '_invAcceptCtxOf', 'invLineAcceptedOnly', 'invLineReviewed', 'invLineUnsure',
  '_invReviewStats', '_invAcceptedStampWords', '_invProgressStamp', '_avUnreviewedStamp', '_invRevBoxHtml', '_renderInvRow',
  '_invGroupItems', '_renderInvGroupHead', '_renderInvWorkbar', '_invEdit', '_invSetReviewed', '_invReviewRepaint', '_agDupIndex',
  'invWorkFlags', 'printEstateInventoryReport', 'printContentsList', 'printDispositionLedger', 'printCourtInventory',
  'printTrustSchedule', 'printContentsRecord'];
const STUB_NAMES = ['jobs', '_photoRefs', 'estimateStore', 'vendors', 'vendorDirectory', 'contractors', 'document', 'alert',
  '_printDocument', 'showSyncBadge', 'savePhotoRefs', '_scheduleInventorySync', 'renderInventoryTab', '_invRefreshSummary',
  '_invRefreshGuardrail', '_invRefreshFlagStrip', '_invRefreshRecords', '_invRefreshReleases', 'agentValueAfterRename',
  '_invRefreshAgentNotices', '_invPaintFigures', '_renderInvPanel', '_invThumbHTML'];
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
function rig(job, refs) {
  const alerts = [];
  const doc = domStub({});
  const noop = () => {};
  const ctx = sandbox({
    stubs: {
      jobs: [Object.assign({}, job)], _photoRefs: { [job.id]: (refs || []).map((r) => Object.assign({}, r)) },
      estimateStore: { [job.id]: { estimate: { rooms: [{ idx: 1, name: 'Kitchen', st: 'in' }, { idx: 2, name: 'Dining Room', st: 'in' }] } } },
      vendors: [], vendorDirectory: [], contractors: [], document: doc, alert: (m) => alerts.push(String(m)),
      _printDocument: () => true, showSyncBadge: noop, savePhotoRefs: noop, _scheduleInventorySync: noop, renderInventoryTab: noop,
      _invRefreshSummary: noop, _invRefreshGuardrail: noop, _invRefreshFlagStrip: noop, _invRefreshRecords: noop,
      _invRefreshReleases: noop, agentValueAfterRename: noop, _invRefreshAgentNotices: noop, _invPaintFigures: noop,
      _renderInvPanel: () => '', _invThumbHTML: () => '',
    },
  });
  liftedScript().runInContext(ctx);
  return { ctx, doc, alerts, job: ctx.jobs[0], ref: (id) => ctx._photoRefs[job.id].find((r) => r.stableId === id) };
}
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
// What the rule answers for `id` on `job` with `refs` as the job's whole manifest (invAcceptCtx reads every line).
function stands(job, refs, id) {
  const R = rig(job, refs);
  return val(attempt(() => R.ctx.invLineAccepted(R.ref(id || refs[0].stableId), R.ctx.invAcceptCtx(R.job))));
}
// The rendered text of a stamp or page, as a reader sees it.
const text = (h) => String(h == null ? '' : h).replace(/<[^>]+>/g, ' ').replace(/&mdash;/g, '—').replace(/&middot;/g, '·')
  .replace(/&amp;/g, '&').replace(/&rsquo;/g, '’').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const count = (hay, needle) => String(hay).split(needle).length - 1;

module.exports = function ({ group, ok, eq, has, lacks }) {
  // ═══════════════════════════════ A · THE RULE ═══════════════════════════════
  group('⚠⚠ A1 · nothing flagged, the line stands as the agents left it, at any value (Q106: no limit)');
  {
    eq(stands(ESTATE(), [DRAWER()]), true, '⚠⚠ the $40 cutlery drawer stands with nobody ticking it');
    eq(stands(ESTATE(), [TABLE()]), true, '⚠⚠ the $2,500 dining table stands too: no value limit (Q106)');
    eq(stands(ESTATE(), [NAMED('Sterling silver serving spoons', { category: 'Silver & Precious Metal', fmv: 80, valLow: 60, valHigh: 120 })]), true,
      '⚠ a Silver line at $80 stands: a specialist category is no longer a flag');
    eq(stands(ESTATE(), [NAMED('Oil on canvas, harbour scene', { category: 'Art & Décor', fmv: 300, valLow: 200, valHigh: 450 })]), true,
      'nor is Art & Décor at $300');
    eq(stands(ESTATE(), [DRAWER({ disposition: 'Keep' })]), true, 'Keep is a destination');
    eq(stands(ESTATE(), [DRAWER({ fmv: '', valLow: 20, valHigh: 60 })]), true, 'Agent Two\'s range alone is a figure (where counsel values, the range is all it writes)');
    eq(stands(LIVING(), [DRAWER()]), true, 'on living work too');
    eq(stands(ESTATE({ gate706: 'no' }), [DRAWER()]), true, 'and on an estate filing no Form 706');
  }

  group('A2 · a name, a destination and a figure first');
  {
    eq(stands(ESTATE(), [DRAWER({ objectName: '', valNameAt: '' })]), false, 'no name: a person names it');
    eq(stands(ESTATE(), [DRAWER({ objectName: '   ', valNameAt: '   ' })]), false, 'a name of spaces is no name');
    eq(stands(ESTATE(), [DRAWER({ disposition: '' })]), false, 'no destination');
    eq(stands(ESTATE(), [DRAWER({ disposition: 'Undecided' })]), false, '⚠ Undecided is no destination');
    eq(stands(ESTATE(), [DRAWER({ disposition: 'Hold' })]), false, '⚠ Hold is no destination');
    eq(stands(ESTATE(), [DRAWER({ fmv: '', valLow: undefined, valHigh: undefined })]), false, 'no figure from either agent or the desk');
    eq(stands(ESTATE(), [DRAWER({ valuedBy: undefined })]), false, 'a figure nobody owns is not the agents\' or the desk\'s');
    eq(stands(ESTATE(), [DRAWER({ deletedAt: 5 })]), false, 'a removed line: nothing');
  }

  group('⚠⚠ A3 · guessing: either agent alone, the line stands; both, it keeps its tick (Q101)');
  {
    eq(stands(ESTATE(), [DRAWER({ agentConf: 'low' })]), true, '⚠ Agent One alone guessing (Agent Two sure under that name): stands');
    eq(stands(ESTATE(), [DRAWER({ valConf: 'low' })]), true, '⚠ Agent Two alone guessing (Agent One sure): stands');
    eq(stands(ESTATE(), [DRAWER({ agentConf: 'low', valConf: 'low' })]), false, '⚠⚠ both guessing: the tick stays');
    eq(stands(ESTATE(), [DRAWER({ agentConf: undefined, valConf: undefined })]), false, 'a missing confidence reads low, as the badges always read it');
    eq(stands(ESTATE(), [DRAWER({ namedBy: 'desk', agentConf: 'low', valConf: 'low' })]), true, 'a name a person typed is no guess of Agent One\'s');
  }

  group('⚠⚠ A4 · each flag keeps the tick, one fixture each');
  {
    const flags = [
      ['a figure made for an earlier name', ESTATE(), { objectName: 'Sterling flatware, Gorham', valNameAt: 'Stainless flatware and kitchen utensils, drawer d1' }],
      ['a firearm', ESTATE(), { category: 'Firearms', objectName: 'Remington pump shotgun', valNameAt: 'Remington pump shotgun' }],
      ['an NFA flag', ESTATE(), { flagNFA: true }],
      ['a line ticked for appraisal', LIVING(), { needsAppr: true }],
      ['a line linked to an appraiser', ESTATE(), { apprId: 'a1' }],
      ['⚠ at the appraisal threshold, any category ($3,200 sofa; waived, so no release caution)', ESTATE(), { category: 'Furniture', fmv: 3200, valLow: 2800, valHigh: 3600, apprWaived: true }],
      ['⚠ the top of Agent Two\'s range at the threshold ($2,500 to $3,100)', ESTATE(), { category: 'Furniture', fmv: 2500, valLow: 2000, valHigh: 3100, apprWaived: true }],
      ['worth a specialist on living work ($3,500 top)', LIVING(), { fmv: 2000, valLow: 1500, valHigh: 3500 }],
      ['a dispute on the line', ESTATE(), { flagDisputed: true }],
      ['⚠ a lot over the Form 706 article cap (12 at $200 each)', ESTATE(), { qty: 12, fmv: 2400, valLow: 1800, valHigh: 2900 }],
      ['a note from Agent One on the line', ESTATE(), { agentNotices: [{ kind: 'other', text: 'a mark under the base' }] }],
      ['a note from Agent Two on the line', ESTATE(), { valNotices: [{ kind: 'appraiser', text: 'a signed piece' }] }],
      ['⚠ a room-check link (its partner not on the list)', ESTATE(), { dupWith: ['zz'] }],
    ];
    flags.forEach(([what, job, o]) => eq(stands(job, [DRAWER(o)]), false, 'held: ' + what));
    // The controls: what makes each a flag, taken away, lets the same line stand.
    eq(stands(ESTATE({ gate706: 'no' }), [DRAWER({ qty: 12, fmv: 2400, valLow: 1800, valHigh: 2900 })]), true, '…the same lot on an estate filing no 706: no cap, it stands');
    eq(stands(ESTATE(), [DRAWER({ dupWith: ['zz'], dupOK: true })]), true, '…the room-check link marked Not duplicates: it stands');
    eq(stands(LIVING(), [DRAWER({ fmv: 2000, valLow: 1500, valHigh: 2900 })]), true, '…a living line under the specialist figure: it stands');
    // A specific bequest: matched to its beneficiary and going to them, so no release caution; the flag alone holds it.
    const BEQ = ESTATE({ beneficiaries: [{ id: 'b1', name: 'Ruth Adler' }], bequests: [{ id: 'q1', beneficiaryId: 'b1', stableIds: ['d1'], text: 'the flatware' }] });
    eq(stands(BEQ, [DRAWER({ disposition: 'Distribute', channel: 'Ruth Adler' })]), true, 'fixture: a bequest going to its beneficiary, unflagged, stands');
    eq(stands(BEQ, [DRAWER({ disposition: 'Distribute', channel: 'Ruth Adler', flagBequest: true })]), false, '⚠ held: a specific bequest on the line');
  }

  group('⚠ A5 · ammunition goes where a firearm goes, whatever category Agent One filed it under');
  {
    ['Box of 20 gauge target loads', 'Ammunition, assorted .22 rounds', 'Ammo, two boxes of .38 Special', 'Shotshells, two boxes',
     'Shotgun shells, one box', 'Bullets, cast lead', 'Black powder flask and shot pouch', 'Reloading press and dies', 'Gunpowder tin']
      .forEach((n) => eq(stands(ESTATE(), [NAMED(n)]), false, '⚠ held in General/Household: "' + n + '"'));
    ['Ink cartridges, printer', 'Rain gauge, brass', 'Tire pressure gauge', 'Bullet journal and pens']
      .forEach((n) => eq(stands(ESTATE(), [NAMED(n)]), true, 'stands: "' + n + '"'));
  }

  group('⚠⚠ A6 · a note still open on the line\'s photograph holds the lines split off it, until that photograph\'s line is ticked');
  {
    const PHOTO = (o) => NAMED('Stainless flatware in drawer, mixed', Object.assign({ stableId: 'p1', agentNotices: [{ kind: 'other', text: 'a hallmark on one spoon' }] }, o || {}));
    const SPLIT = (o) => NAMED('Serving ladle, stainless', Object.assign({ stableId: 's1', derivedFrom: 'p1' }, o || {}));
    eq(stands(ESTATE(), [PHOTO(), SPLIT()], 's1'), false, '⚠⚠ the ladle split off the photograph: held while the photograph\'s note is open');
    eq(stands(ESTATE(), [PHOTO({ reviewed: true, valReviewed: true }), SPLIT()], 's1'), true, '⚠ the photograph\'s line ticked: the note goes quiet, the ladle stands');
    eq(stands(ESTATE(), [PHOTO({ reviewed: true, valReviewed: true }), SPLIT()], 'p1'), false, '…the photograph\'s own line keeps its tick (its own note)');
    eq(stands(ESTATE(), [PHOTO({ reviewed: true, valReviewed: true, agentNotices: [{ kind: 'firearm', text: 'a rifle behind the door' }] }), SPLIT()], 's1'), false,
      'a firearm note never goes quiet, so the split line stays held');
    const MF = [PHOTO({ agentNotices: [{ kind: 'mustfind', text: 'could be the ring' }] }), SPLIT()];
    eq(stands(ESTATE({ mustFind: 'Grandmother\'s ring', mustFound: {} }), MF, 's1'), false, 'a must-find note holds it while a must-find is open');
    eq(stands(ESTATE({ mustFind: 'Grandmother\'s ring', mustFound: { "grandmother's ring": { at: '2026-10-20', by: 'Ashley Jerome' } } }), MF, 's1'), true,
      '…and goes quiet once every must-find is found (agentNoticeQuiet)');
    eq(stands(ESTATE(), [SPLIT()], 's1'), true, 'a split line whose photograph is not on this device: nothing open');
  }

  group('⚠⚠ A7 · a possible duplicate holds every line of it, and Not duplicates releases them');
  {
    // The same name in one room off two photographs (Agent One's unreviewed lines).
    const twin = (id, o) => NAMED('Brass table lamp, pleated shade', Object.assign({ stableId: id }, o || {}));
    eq([stands(ESTATE(), [twin('a'), twin('b')], 'a'), stands(ESTATE(), [twin('a'), twin('b')], 'b')], [false, false], '⚠⚠ a same-name pair: both held');
    eq([stands(ESTATE(), [twin('a', { dupOK: true }), twin('b', { dupOK: true })], 'a'), stands(ESTATE(), [twin('a', { dupOK: true }), twin('b', { dupOK: true })], 'b')],
      [true, true], '⚠ Not duplicates on the pair: both stand');
    eq(stands(ESTATE(), [twin('a'), twin('b', { roomIdx: 2 })], 'a'), true, 'the same name in two rooms is no pair');
    // The room check's link off the pictures.
    eq([stands(ESTATE(), [DRAWER({ stableId: 'a', dupWith: ['b'] }), DRAWER({ stableId: 'b', dupWith: ['a'] })], 'a'),
        stands(ESTATE(), [DRAWER({ stableId: 'a', dupWith: ['b'] }), DRAWER({ stableId: 'b', dupWith: ['a'] })], 'b')], [false, false], '⚠ a room-check link: both held');
    eq(stands(ESTATE(), [DRAWER({ stableId: 'a', dupWith: ['b'], dupOK: true }), DRAWER({ stableId: 'b', dupWith: ['a'], dupOK: true })], 'a'), true, '…released by Not duplicates');
    // One photograph named twice (agentNamedTwice): two namings neither told what was listed.
    const ONCE = (o) => NAMED('White ironstone dinner plates', Object.assign({ stableId: 'p1', agentAt: 1000, agentListed: 0 }, o || {}));
    const AGAIN = (o) => NAMED('Ironstone plates, white, stacked', Object.assign({ stableId: 'p2', derivedFrom: 'p1', agentAt: 9000, agentListed: 0 }, o || {}));
    eq([stands(ESTATE(), [ONCE(), AGAIN()], 'p1'), stands(ESTATE(), [ONCE(), AGAIN()], 'p2')], [false, false], '⚠⚠ a photograph named twice: both readings held');
    eq([stands(ESTATE(), [ONCE({ dupOK: true }), AGAIN({ dupOK: true })], 'p1'), stands(ESTATE(), [ONCE({ dupOK: true }), AGAIN({ dupOK: true })], 'p2')], [true, true],
      '…released by Not duplicates');
    eq(stands(ESTATE(), [ONCE(), AGAIN({ agentAt: 1500 })], 'p2'), true, 'one naming that split the photograph (within the gap) is no double');
  }

  group('⚠ A8 · a release caution holds the line');
  {
    eq(stands(LIVING(), [DRAWER({ disposition: 'Sell', channel: 'Ashley Jerome' })]), false, '⚠ living work: a line going to someone who works with Havellin');
    eq(stands(LIVING(), [DRAWER({ disposition: 'Sell', channel: 'Ruth Adler' })]), true, '…to anybody else it stands');
    const BEQ = ESTATE({ beneficiaries: [{ id: 'b1', name: 'Ruth Adler' }], bequests: [{ id: 'q1', beneficiaryId: 'b1', stableIds: ['d1'], text: 'the flatware' }] });
    eq(stands(BEQ, [DRAWER({ disposition: 'Donate' })]), false, '⚠ an estate: a bequest going elsewhere (to the charity), its flag not yet set');
  }

  group('⚠⚠ A9 · a disputed estate: no line stands by itself (Q102)');
  {
    eq(stands(ESTATE({ gateDispute: 'yes' }), [DRAWER()]), false, '⚠⚠ intake\'s dispute answered yes: the drawer keeps its tick');
    eq(stands(ESTATE({ gateDispute: 'yes' }), [TABLE()], 't1'), false, '…and the table');
    eq(stands(ESTATE({ svc: 'contested_probate' }), [DRAWER()]), false, '⚠ the contested probate service: likewise');
    eq(stands(ESTATE({ gateDispute: 'no' }), [DRAWER()]), true, 'a dispute answered no: it stands');
  }

  group('⚠ A10 · no facts, no line stands; a desk figure stands, an appraiser\'s never');
  {
    const R = rig(ESTATE(), [DRAWER()]);
    eq(val(attempt(() => R.ctx.invLineAccepted(R.ref('d1'), null))), false, '⚠ no context: held (a reader that hands none in asks for more ticks, never fewer)');
    eq(val(attempt(() => R.ctx.invLineAccepted(R.ref('d1')))), false, 'none at all: held');
    eq(val(attempt(() => R.ctx.invLineAccepted(R.ref('d1'), { dup: {} }))), false, 'a context with no job: held');
    eq(val(attempt(() => R.ctx.invAcceptCtx(null))), null, 'invAcceptCtx with no job: null');
    const fc = val(attempt(() => R.ctx.invAcceptCtx(R.job)));
    ok(fc && fc.job && fc.job.id === 7 && fc.dup && typeof fc.dup === 'object', 'invAcceptCtx: the job and a duplicate index');
    const DESK = (o) => DRAWER(Object.assign({ namedBy: 'desk', valuedBy: 'desk', fmv: 300, valLow: undefined, valHigh: undefined, valConf: undefined, valSource: 'Dealer quote', valNameAt: undefined }, o || {}));
    eq(stands(ESTATE(), [DESK()]), true, '⚠⚠ a figure typed on the desk, nothing flagged: it stands (Q105)');
    eq(stands(ESTATE(), [DESK({ namedBy: 'agent', agentConf: 'low' })]), true, '…under Agent One\'s guess too: Agent Two is not in play');
    eq(stands(ESTATE(), [DESK({ fmv: '' })]), false, 'a desk line with its figure cleared: no figure');
    eq(stands(ESTATE(), [DESK({ needsAppr: true })]), false, 'a desk figure on a flagged line: held');
    eq(stands(ESTATE(), [DESK({ valuedBy: 'appraiser', valSource: 'Appraisal' })]), false, '⚠ an appraiser\'s figure never stands by itself');
    eq(stands(ESTATE(), [DRAWER({ objectName: 'Gorham sterling flatware, Chantilly', valNameAt: 'Stainless flatware, drawer' })]), false,
      '⚠ a stale figure (the name moved since it was valued): held');
  }

  // ═══════════════════════════════ B · ITS READERS ═══════════════════════════════
  group('⚠⚠ B1 · invLineReviewed asks invLineAccepted first, and the unsure hint speaks only where both guessed');
  {
    const R = rig(ESTATE(), [DRAWER(), DRAWER({ stableId: 'f1', needsAppr: true }), TICKED({ stableId: 'f2', needsAppr: true }),
      DRAWER({ stableId: 'g1', agentConf: 'low', valConf: 'low' }), DRAWER({ stableId: 'g2', agentConf: 'low' }), DRAWER({ stableId: 'g3', valConf: 'low' }),
      NAMED('Hall bench', { stableId: 'n1', namedBy: 'desk', valuedBy: undefined, fmv: '', valLow: undefined, valHigh: undefined })]);
    const fc = val(attempt(() => R.ctx.invAcceptCtx(R.job)));
    const rev = (id, c) => val(attempt(() => R.ctx.invLineReviewed(R.ref(id), c)));
    const unsure = (id) => val(attempt(() => R.ctx.invLineUnsure(R.ref(id), fc)));
    eq(rev('d1', fc), true, '⚠⚠ the drawer: reviewed with nobody ticking it, its agent figure unlooked-at');
    eq(rev('d1', null), false, '⚠ …and not without the job\'s facts');
    eq(rev('f1', fc), false, 'a flagged line, unticked: not reviewed');
    eq(rev('f2', fc), true, 'a flagged line, ticked: reviewed');
    eq(rev('n1', fc), true, 'named and decided on the desk, no agent figure: reviewed as before');
    eq(unsure('g1'), true, '⚠⚠ both agents guessing: unsure');
    eq(unsure('g2'), false, '⚠ Agent One alone: no hint (the line stands)');
    eq(unsure('g3'), false, '⚠ Agent Two alone: no hint');
    eq(unsure('d1'), false, 'neither: no hint');
    eq(unsure('f2'), false, 'a ticked line: no hint');
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
    R.ctx._agDupSetJob = 7; R.ctx._agDupSet = { d1: 2 };
    eq(t('d1'), true, '⚠ with the paint\'s index naming the drawer a duplicate, the chip counts it');
    const g2 = groups(), d2 = Array.isArray(g2) ? g2.find((x) => x.key === 'Donate') : null;
    eq(d2 ? d2.reviewed : g2, 1, '…and so does the group count');
    R.ctx._agDupSetJob = 9;
    eq(t('d1'), false, '⚠ another client\'s index is never read: the facts are worked out for this one');
  }

  group('⚠⚠ B3 · the row\'s box in each of its states');
  {
    const DESKFIG = DRAWER({ stableId: 'k1', namedBy: 'desk', valuedBy: 'desk', fmv: 300, valLow: undefined, valHigh: undefined, valConf: undefined, valNameAt: undefined });
    const DESKNAME = NAMED('Hall bench', { stableId: 'k2', namedBy: 'desk', valuedBy: undefined, fmv: '', valLow: undefined, valHigh: undefined });
    const R = rig(ESTATE(), [DRAWER(), DESKFIG, DESKNAME, DRAWER({ stableId: 'f1', needsAppr: true }),
      DRAWER({ stableId: 'e1', reviewed: true, reviewedBy: 'Anthony Graziano' })]);
    const box = (id, withFc) => val(attempt(() => R.ctx._invRevBoxHtml(7, R.ref(id), withFc ? R.ctx.invAcceptCtx(R.job) : undefined)));
    // Standing by the rule alone: ticked in grey, ENABLED, and a press records the person's own look (true, never this.checked).
    const a = box('d1', true);
    has(a, '<input type="checkbox" checked onchange="_invSetReviewed(7,\'d1\',true)"', '⚠⚠ standing: ticked, enabled, and a press passes true');
    lacks(a, 'disabled', '…never disabled');
    has(a, 'accent-color:var(--gray)', '…ticked in grey');
    has(a, 'title="Nothing flagged: the agents’ name and value stand as they are. Tick it to record your own look."', '…its tooltip says why');
    eq(box('d1', false), a, 'the box works out the same facts when none are handed in (_invAcceptCtxOf)');
    // A person's own act: ticked, green, fixed.
    const k = box('k1', true);
    has(k, '<input type="checkbox" checked disabled onchange=', '⚠ a figure typed on the desk: ticked and fixed');
    has(k, 'color:var(--ok-tx)', '…in green');
    has(k, 'title="Reviewed: a figure typed on the desk, nothing flagged"', '…and says so');
    const k2 = box('k2', true);
    has(k2, ' checked disabled', 'named and decided on the desk: ticked and fixed');
    has(k2, 'title="Reviewed: named and decided on the desk"', '…and says so');
    // A flagged line: unticked, a real checkbox.
    const f = box('f1', true);
    has(f, '<input type="checkbox" onchange=', '⚠ a flagged line: unticked');
    has(f, "onchange=\"_invSetReviewed(7,'f1',this.checked)\"", '…a press is the box\'s own state');
    has(f, 'title="Tick when this line has been checked"', '…and its tooltip asks for the look');
    // A name ticked before Agent Two valued the line: the value stands, and the box says whose look it was.
    has(box('e1', true), 'title="Reviewed by Anthony Graziano; Agent Two’s value since stands, nothing flagged. Tick it to record your look at the value."',
      'a tick that predates the figure: named, and offered for the value');
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

  group('⚠ B4 · the row draws the box and the hint off one context');
  {
    const R = rig(ESTATE(), [DRAWER(), DRAWER({ stableId: 'g1', agentConf: 'low', valConf: 'low' }), DRAWER({ stableId: 'g3', valConf: 'low' })]);
    const row = (id) => val(attempt(() => R.ctx._renderInvRow(R.job, R.ref(id))));
    const d = row('d1'), g = row('g1'), g3 = row('g3');
    has(d, "id=\"inv-rev-d1\"", 'fixture: the drawer\'s row drew its box');
    has(d, "checked onchange=\"_invSetReviewed(7,'d1',true)\"", '⚠ the drawer\'s row: its box ticked in grey');
    lacks(d, 'class="inv-unsure"', '…and no unsure hint');
    has(g, 'class="inv-unsure"', '⚠ both guessing: the row says unsure');
    has(g, "onchange=\"_invSetReviewed(7,'g1',this.checked)\"", '…and its box is a real one, unticked');
    lacks(g3, 'class="inv-unsure"', '⚠ Agent Two alone guessing: the line stands, and its row says nothing');
    has(g3, "checked onchange=\"_invSetReviewed(7,'g3',true)\"", '…its box ticked in grey');
    has(live(fn('_renderInvRow')), 'var jid = job.id, _ac = _invAcceptCtxOf(job);', 'the row works out the facts once');
    eq(count(live(fn('_renderInvRow')), '_ac)'), 2, 'and hands them to the hint and the box (invLineUnsure, _invRevBoxHtml)');
  }

  group('⚠⚠ B5 · _invEdit: a flag ticked repaints the box, the group head and the work bar by id');
  {
    const lines = () => [DRAWER(), TICKED({ stableId: 'f2', needsAppr: true })];
    [['needsAppr', 'ticked for appraisal'], ['flagBequest', 'a specific bequest']].forEach(([key, what]) => {
      const R = rig(ESTATE(), lines());
      R.ctx._agDupSetJob = 7; R.ctx._agDupSet = {};
      const before = text(val(attempt(() => R.ctx._renderInvWorkbar(R.job, R.ctx._jobInvRefs(7)))));
      has(before, '2 of 2 reviewed · 1 accepted', key + ': fixture: the work bar counts the drawer as accepted');
      const e = attempt(() => R.ctx._invEdit(7, 'd1', key, { type: 'checkbox', checked: true }));
      ok(e.ok, key + ': the edit runs (' + (e.err || '') + ')');
      const els = R.doc.__els;
      const rb = els['inv-rev-d1'] ? String(els['inv-rev-d1'].outerHTML || '') : '';
      ok(rb.length > 0, '⚠⚠ ' + what + ': the box repainted by id');
      has(rb, '<input type="checkbox" onchange=', '…unticked now');
      has(rb, 'Tick when this line has been checked', '…asking for the look');
      const head = els['inv-grph-Donate'] ? text(els['inv-grph-Donate'].outerHTML) : '';
      has(head, '1 of 2 reviewed', '⚠ ' + what + ': the group head repainted: 1 of 2');
      const wb = els['inv-workbar'] ? text(els['inv-workbar'].outerHTML) : '';
      has(wb, '1 of 2 reviewed', '⚠ ' + what + ': the work bar repainted: 1 of 2');
      lacks(wb, 'accepted', '…and nothing accepted any more');
    });
    // An edit that moves nothing repaints nothing.
    const R = rig(ESTATE(), lines());
    R.ctx._agDupSetJob = 7; R.ctx._agDupSet = {};
    const e = attempt(() => R.ctx._invEdit(7, 'd1', 'condition', { value: 'Fair' }));
    ok(e.ok, 'a condition edit runs (' + (e.err || '') + ')');
    ok(!R.doc.__els['inv-rev-d1'] || !R.doc.__els['inv-rev-d1'].outerHTML, 'a condition changed: the box is left alone (it keeps its focus)');
  }

  group('⚠ B6 · the paint\'s duplicate index: worked out before the filter, and refreshed by an edit');
  {
    // Moved into the room of its same-named twin: the edit refreshes the index first, so the line is held and its box repainted.
    const twin = (id, room) => NAMED('Brass table lamp, pleated shade', { stableId: id, roomIdx: room });
    const R = rig(ESTATE(), [twin('a', 1), twin('b', 2)]);
    R.ctx._agDupSetJob = 7;
    R.ctx._agDupSet = val(attempt(() => R.ctx._agDupIndex(7)));
    eq(R.ctx._agDupSet, {}, 'fixture: two rooms, no pair');
    const e = attempt(() => R.ctx._invEdit(7, 'a', 'roomIdx', { value: '2' }));
    ok(e.ok, 'the room edit runs (' + (e.err || '') + ')');
    eq(R.ctx._agDupSet, { a: 2, b: 2 }, '⚠ the index refreshed by the edit: the pair');
    const rb = R.doc.__els['inv-rev-a'] ? String(R.doc.__els['inv-rev-a'].outerHTML || '') : '';
    ok(rb.indexOf('<input type="checkbox" onchange=') >= 0, '⚠ …and the moved line\'s box repainted, unticked');
    // Another client's index is not touched.
    const R2 = rig(ESTATE(), [twin('a', 1), twin('b', 2)]);
    R2.ctx._agDupSetJob = 9; R2.ctx._agDupSet = { other: 1 };
    attempt(() => R2.ctx._invEdit(7, 'a', 'roomIdx', { value: '2' }));
    eq(R2.ctx._agDupSet, { other: 1 }, 'another client\'s paint index is left as it is');
    // The paint: the index and its job tagged BEFORE the rows are filtered (the Not reviewed chip filters through it).
    const body = live(fn('renderInventoryTab'));
    ok(body.length > 2000 && body.length < 60000, 'fixture: renderInventoryTab read, bounded (' + body.length + ' chars)');
    const ix = '_agDupSet = _agDupIndex(jobId, all);', tag = '_agDupSetJob = jobId;',
      filt = 'var items = all.filter(function(r){ return _invMatchesFilter(r, job); });';
    eq([count(body, ix), count(body, tag), count(body, filt)], [1, 1, 1], 'each once in the paint');
    const a = body.indexOf(ix), b = body.indexOf(tag), c = body.indexOf(filt);
    ok(a >= 0 && b > a && c > b, '⚠ the index, then its job, then the filter (' + [a, b, c].join(' < ') + ')');
  }

  // ═══════════════════════════════ C · THE PAPERS ═══════════════════════════════
  group('⚠⚠ C1 · the stamps say how many stood as the agents left them (Q100)');
  {
    const R = rig(ESTATE(), []);
    const fc = val(attempt(() => R.ctx.invAcceptCtx(R.job)));
    const stood = (n, p) => Array.from({ length: n }, (_, i) => DRAWER({ stableId: (p || 's') + i }));
    const looked = (n, p) => Array.from({ length: n }, (_, i) => (i % 2 ? TICKED({ stableId: (p || 'c') + i })
      : TICKED({ stableId: (p || 'c') + i, needsAppr: true })));
    const open = (n) => Array.from({ length: n }, (_, i) => DRAWER({ stableId: 'o' + i, needsAppr: true }));
    const stamp = (items, o) => text(val(attempt(() => R.ctx._invProgressStamp(items, Object.assign({ fc }, o || {})))));
    has(stamp(looked(42).concat(stood(158))), 'REVIEWED — 42 items checked; 158 accepted as valued', '⚠⚠ Q100, in Anthony\'s words');
    has(stamp(stood(12)), 'REVIEWED — all 12 accepted as valued', 'every line standing');
    const one = stamp(stood(1));
    has(one, 'REVIEWED — 1 accepted as valued', '⚠ exactly one standing: no "all"');
    lacks(one, 'all 1', '…never "all 1"');
    has(stamp(looked(1).concat(stood(1))), 'REVIEWED — 1 item checked; 1 accepted as valued', 'one of each, singular');
    has(stamp(looked(3)), 'REVIEWED — all 3 items', 'none standing: the stamp reads as it always did');
    has(stamp(looked(30).concat(stood(158), open(2))), 'IN PROGRESS — 30 of 32 items checked; 158 accepted as valued', '⚠ in progress, the standing lines beside it');
    has(stamp(looked(1).concat(open(2))), 'IN PROGRESS — 1 of 3 items reviewed', 'in progress with none standing: as it always did');
    has(stamp(looked(1).concat(open(2))), 'Values and dispositions on unreviewed lines may still change.', 'the valued papers\' caveat');
    // The papers that print no figure.
    has(stamp(looked(2).concat(stood(5)), { namesOnly: true }), 'REVIEWED — 2 items checked; 5 accepted as named', '⚠ namesOnly (the ledger, the Contents Record): accepted as named');
    const nIP = stamp(looked(1).concat(stood(5), open(1)), { namesOnly: true });
    has(nIP, 'IN PROGRESS — 1 of 2 items checked; 5 accepted as named', 'namesOnly in progress');
    has(nIP, 'Dispositions on unreviewed lines may still change.', '⚠ namesOnly\'s caveat names only what the page carries');
    lacks(nIP, 'Values and dispositions', '…never the values it does not print');
    const cl = stamp(looked(1).concat(stood(5), open(1)), { noValues: true });
    has(cl, '5 accepted as named', 'noValues (the Contents List): accepted as named');
    has(cl, 'Descriptions and conditions on unreviewed lines may still change.', '…with its own caveat');
    has(stamp([DRAWER({ stableId: 'a' }), DRAWER({ stableId: 'b', namedBy: 'desk' })], { noValues: true }), 'REVIEWED — 1 item checked; 1 accepted as named',
      'noValues reads a person-named line as checked too');
    // A name a person typed is a look on a page that prints names: checked there, accepted on a valued page.
    const pair = [DRAWER({ stableId: 'a' }), DRAWER({ stableId: 'b', namedBy: 'desk' })];
    has(stamp(pair, { namesOnly: true }), 'REVIEWED — 1 item checked; 1 accepted as named', '⚠ a person-named line is checked on a namesOnly paper');
    has(stamp(pair), 'REVIEWED — all 2 accepted as valued', '…and accepted on a valued one (nobody looked at its figure)');
    has(stamp([DRAWER({ stableId: 'a' }), DRAWER({ stableId: 'b', reviewed: true })], { namesOnly: true }), 'REVIEWED — 1 item checked; 1 accepted as named',
      'a name ticked before the figure landed: checked on a namesOnly paper');
    // A figure typed on the desk is a person's look (Q105): checked, never accepted.
    const desk = DRAWER({ stableId: 'k', valuedBy: 'desk', fmv: 300, valLow: undefined, valHigh: undefined, valConf: undefined });
    has(stamp([DRAWER({ stableId: 'a' }), desk]), 'REVIEWED — 1 item checked; 1 accepted as valued', '⚠ a desk figure counts as checked');
    // No facts handed in: nothing stands.
    has(text(val(attempt(() => R.ctx._invProgressStamp(stood(12))))), 'IN PROGRESS — 0 of 12 items reviewed', '⚠ a printer handing in no facts counts nothing as standing');
    const st = val(attempt(() => R.ctx._invReviewStats(looked(4).concat(stood(6), open(2)), fc)));
    eq(st && [st.done, st.total, st.complete, st.accepted], [10, 12, false, 6], 'the counts under the words');
    eq(val(attempt(() => R.ctx._invAcceptedStampWords({ accepted: 0 }))), '', 'none standing: no words');
  }

  group('⚠ C2 · the schedules\' value stamp: two pills, and noAccepted (Q104)');
  {
    const R = rig(ESTATE(), []);
    const fc = val(attempt(() => R.ctx.invAcceptCtx(R.job)));
    const stood = (n) => Array.from({ length: n }, (_, i) => DRAWER({ stableId: 's' + i }));
    const flagged = DRAWER({ stableId: 'x', needsAppr: true, fmv: 500, valLow: 400, valHigh: 600 });
    const av = (items, o) => val(attempt(() => R.ctx._avUnreviewedStamp(items, Object.assign({ fc }, o || {}))));
    const h = av(stood(4).concat([flagged]));
    has(text(h), '1 value not yet reviewed', '⚠ only the flagged agent figure is "not yet reviewed"');
    has(text(h), '4 accepted as valued', '⚠ …and the grey pill says how many stood');
    has(h, 'background:#8a6d3b;', 'the first pill bronze');
    has(h, 'background:#6b6b6b;', 'the second grey');
    eq(count(h, 'display:inline-block'), 2, 'two pills');
    has(text(av(stood(1).concat([flagged, DRAWER({ stableId: 'y', apprId: 'a1' })]))), '2 values not yet reviewed', 'two flagged: plural');
    const na = text(av(stood(4).concat([flagged]), { noAccepted: true }));
    has(na, '1 value not yet reviewed', 'noAccepted keeps the first pill');
    lacks(na, 'accepted as valued', '⚠ noAccepted (the Estate Inventory Report, whose stamp already says it): no grey pill');
    eq(av([TICKED({ stableId: 'a' }), TICKED({ stableId: 'b' })]), '', 'every figure looked at: nothing to say');
    const nofc = text(val(attempt(() => R.ctx._avUnreviewedStamp(stood(4)))));
    has(nofc, '4 values not yet reviewed', '⚠ no facts handed in: every agent figure is unreviewed');
    lacks(nofc, 'accepted', '…and none accepted');
  }

  group('⚠⚠ C3 · the six printers hand in the job\'s facts, and their pages say it');
  {
    const lines = () => [DRAWER({ stableId: 'a' }), DRAWER({ stableId: 'b', namedBy: 'desk' }), DRAWER({ stableId: 'f', needsAppr: true }),
      TICKED({ stableId: 't' })];
    const page = (job, name, refs) => {
      const R = rig(job, refs || lines());
      const out = val(attempt(() => R.ctx[name](7, { asHtml: true })));
      return { html: out && out.html ? out.html : '', why: out && out.why, raw: out };
    };
    // The Estate Inventory Report: the progress stamp names the standing lines once, the value stamp only what waits.
    const eir = page(ESTATE(), 'printEstateInventoryReport');
    ok(eir.html.length > 1000, 'fixture: the Estate Inventory Report printed (' + (eir.why || eir.html.length) + ')');
    has(text(eir.html), 'IN PROGRESS — 1 of 2 items checked; 2 accepted as valued', '⚠⚠ the Estate Inventory Report\'s stamp');
    has(text(eir.html), '1 value not yet reviewed', '…its value stamp names the flagged figure');
    eq(count(text(eir.html), 'accepted as valued'), 1, '⚠ …and the standing values are named once (noAccepted)');
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
    // The Court Inventory and the Trust Schedule: the grey pill in the stamp's own words (Q104).
    const ci = page(ESTATE({ svc: 'probate' }), 'printCourtInventory');
    ok(ci.html.length > 1000, 'fixture: the Court Inventory printed (' + (ci.why || ci.html.length) + ')');
    has(text(ci.html), '2 accepted as valued', '⚠ the Court Inventory\'s grey pill');
    has(text(ci.html), '1 value not yet reviewed', '…beside the flagged figure');
    const ts = page(ESTATE({ matterType: 'trust', trustName: 'Butler Family Trust' }), 'printTrustSchedule');
    ok(ts.html.length > 1000, 'fixture: the Trust Schedule printed (' + (ts.why || ts.html.length) + ')');
    has(text(ts.html), '2 accepted as valued', '⚠ the Trust Schedule\'s grey pill');
    // The Contents Record (living work): accepted as named.
    const cr = page(LIVING(), 'printContentsRecord');
    ok(cr.html.length > 1000, 'fixture: the Contents Record printed (' + (cr.why || cr.html.length) + ')');
    has(text(cr.html), 'IN PROGRESS — 2 of 3 items checked; 1 accepted as named', '⚠ the Contents Record\'s stamp');
    // A disputed estate: the same lines, nothing stands, on every page.
    const dsp = page(ESTATE({ gateDispute: 'yes' }), 'printEstateInventoryReport');
    has(text(dsp.html), 'IN PROGRESS — 1 of 4 items reviewed', '⚠ a disputed estate\'s report: nothing accepted (Q102)');
    lacks(text(dsp.html), 'accepted as', '…not a word of it');
  }

  // ═══════════════════════════════ D · ONE DEFINITION ═══════════════════════════════
  group('D · one rule, one context, read where they should be; nothing of the floor left');
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
    eq(callersOf('invLineAccepted'), ['_avUnreviewedStamp', '_invRevBoxHtml', 'invLineAcceptedOnly', 'invLineReviewed'],
      '⚠ invLineAccepted\'s readers: the review, the accepted count, the value stamp and the row\'s tooltip');
    eq((L.match(/\binvLineAccepted\(/g) || []).length, 5, '…and nothing else calls it (the definition and four calls)');
    eq(callersOf('invLineAcceptedOnly'), ['_avUnreviewedStamp', '_invRevBoxHtml', '_invReviewStats'], 'the accepted count\'s readers');
    eq(callersOf('invAcceptCtx'), ['_invAcceptCtxOf', 'printContentsList', 'printContentsRecord', 'printCourtInventory', 'printDispositionLedger',
      'printEstateInventoryReport', 'printTrustSchedule'], '⚠ invAcceptCtx\'s: the desk\'s context and the six printers');
    eq((L.match(/\binvAcceptCtx\(/g) || []).length, 8, '…and nothing else (the definition and seven calls)');
    eq(callersOf('_invAcceptCtxOf'), ['_invEdit', '_invGroupItems', '_invRevBoxHtml', '_renderInvRow', '_renderInvWorkbar'], 'the desk\'s context: its readers');
    has(live(decl('INV_WORK_FLAGS')), 'return !invLineReviewed(r, _invAcceptCtxOf(job));', '…and the Not reviewed chip');
    ['printContentsList', 'printEstateInventoryReport', 'printCourtInventory', 'printTrustSchedule', 'printDispositionLedger', 'printContentsRecord']
      .forEach((p) => ok(/fc: (invAcceptCtx\(job\)|_ac\b)/.test(live(fn(p))), p + ' hands its stamps the facts'));
    eq((L.match(/\bINV_ACCEPT_AMMO_RE\b/g) || []).length, 2, 'the ammunition words: declared once, read once (by the rule)');
    // The floor is gone, in every form it took.
    ['INV_REVIEW_FLOOR', 'invLineUnderFloor', '_invFloorStampWords', 'agentPhotoNotes', 'floorNamed', 'noFloor', 'under $100', 'Under $100']
      .forEach((n) => lacks(L, n, 'gone from live code: ' + n));
  }
};
