'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// ONLY FLAGGED LINES KEEP A TICK (2026-10-26, Q106; it replaced Q99's $100 floor, review-floor.test.js until then),
// THE LIST READ (Q107) AND THE UNSURE HINT ON A STANDING LINE (Q108).
//
// Anthony, 2026-10-26: *"we will be obviously going back to the office and looking over the entire inventory list ourselves
// to make sure everything looks right. So the idea that … we need to be like ticking boxes is ridiculous to approve
// everything, because … this is our job at night. The agent identifies everything and then values it. And then we go back
// and we go over the list and we make sure it makes sense. And we verify it with what we saw on site."* He took *"Only
// flagged lines"*. So a line the agents named and valued, with a destination and nothing flagged, stands as it is
// (invLineAccepted, which is !invLineHold), whatever its value (Q106: no limit), and a figure typed on the desk, or an
// appraisal's typed from the report, stands the same way (Q105). A tick stays only where the app flags something, and the
// rule names why (invLineHold's reason, INV_HOLD_WORDS on the row's box): a note from either agent not yet quiet (on the
// line, or on its photograph's live line), both agents guessing (Q101), a possible duplicate (answered only by Remove or Not
// duplicates, never by a tick), a firearm, an NFA flag or ammunition, an appraisal until its figure is on the line, a
// bequest or a dispute, a release caution, a figure made for an earlier name, and every line of a disputed estate (Q102).
// The Form 706 lot cap is no longer a hold (a tick does not split a lot).
// Q107 (*"One 'List read' press"*): the night's read is recorded once, `job.invRead` ({at, by}), by *I've read the list* on
// the work bar; a line changed after it makes it the read of an earlier list. Where a line stands as the agents left it, a
// paper is REVIEWED only over a current read, and names it. Q108 (*"Show it, no tick"*): *unsure* shows wherever either agent
// was guessing, a standing line included, until a person's look.
//
//   A · the rule, driven through the real invLineHold / invLineAccepted with its whole chain lifted: every reason, one
//       fixture each with every earlier step passing (a name, a destination, a figure), and its words on the box; what
//       stands; what no longer holds since round two.
//   B · its readers: invLineReviewed, the Not reviewed chip, the group counts, the row's box in each state, the unsure hint,
//       _invEdit repainting by id, the work bar's count, the paint's duplicate index, and the list read end to end.
//   C · the papers: the stamps' words exactly in all four read states, and the six printers handing in the job's facts.
//   D · one definition: the rule's, the reasons', the context's and the read's callers; nothing of the floor left.
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
// edit and Not duplicates, the list read and its press, and the six printers. Only data, the job's save and the screen's other
// cards are stubs (each a no-op, or a recorder where a test reads what was asked of it).
const ROOTS = ['invLineHold', 'invLineAccepted', 'invAcceptCtx', '_invAcceptCtxOf', 'invLineAcceptedOnly', 'invLineReviewed', 'invLineUnsure',
  '_invReviewStats', '_invAcceptedStampWords', '_invProgressStamp', '_avUnreviewedStamp', '_avReadWords', '_invRevBoxHtml', '_renderInvRow',
  '_invGroupItems', '_renderInvGroupHead', '_renderInvWorkbar', '_invEdit', '_invSetReviewed', '_invReviewRepaint', '_agDupIndex',
  'agentDuplicateGroups', 'agentNotDuplicate', '_agDupHandle', 'invListChangedAt', 'invListRead', 'invListReadWords', 'invMarkListRead',
  '_invListReadHtml', 'invWorkFlags', 'printEstateInventoryReport', 'printContentsList', 'printDispositionLedger', 'printCourtInventory',
  'printTrustSchedule', 'printContentsRecord'];
const STUB_NAMES = ['jobs', '_photoRefs', 'estimateStore', 'vendors', 'vendorDirectory', 'contractors', 'document', 'alert',
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
// `opt.user`: the device's user as Settings records it (hav_device_user); `opt.now`: the sandbox's clock, so nothing here
// reads the real one (the code under test stamps Date.now(); a test pins what it reads).
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
  return { ctx, doc, alerts, saved, synced, job: ctx.jobs[0], ref: (id) => ctx._photoRefs[job.id].find((r) => r.stableId === id) };
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
// A figure typed on the desk (Q105).
const DESK = (o) => DRAWER(Object.assign({ namedBy: 'desk', valuedBy: 'desk', fmv: 300, valLow: undefined, valHigh: undefined, valConf: undefined,
  valSource: 'Dealer quote', valNameAt: undefined }, o || {}));
// A photograph's first line carrying Agent One's note, and a line split off that photograph.
const PHOTO = (o) => NAMED('Stainless flatware in drawer, mixed', Object.assign({ stableId: 'p1', agentNotices: [{ kind: 'other', text: 'a hallmark on one spoon' }] }, o || {}));
const SPLIT = (o) => NAMED('Serving ladle, stainless', Object.assign({ stableId: 's1', derivedFrom: 'p1' }, o || {}));
// The same name in one room off two photographs (Agent One's lines).
const TWIN = (id, o) => NAMED('Brass table lamp, pleated shade', Object.assign({ stableId: id }, o || {}));
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
// The rendered text of a stamp or page, as a reader sees it.
const text = (h) => String(h == null ? '' : h).replace(/<[^>]+>/g, ' ').replace(/&mdash;/g, '—').replace(/&middot;/g, '·')
  .replace(/&#10003;/g, '✓').replace(/&amp;/g, '&').replace(/&rsquo;/g, '’').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const count = (hay, needle) => String(hay).split(needle).length - 1;
// Noon Eastern on 2026-10-26, 16:00 UTC: the same calendar day in Eastern and in UTC (the container), where the suite runs.
// Never the real clock.
const READ_AT = Date.UTC(2026, 9, 26, 16, 0, 0);
const READ_WORDS = 'read by Anthony Graziano, October 26, 2026';
// The work bar's list-read line, cut out of the bar by its id.
const readLine = (wb, jid) => {
  const s = String(wb || ''), at = s.indexOf('<div id="inv-read-' + (jid || 7) + '"');
  return at < 0 ? '' : s.slice(at, s.indexOf('</div>', at) + 6);
};

module.exports = function ({ group, ok, eq, has, lacks }) {
  // ═══════════════════════════════ A · THE RULE ═══════════════════════════════
  group('⚠⚠ A0 · every reason invLineHold gives, one fixture each, and its words on the row\'s box');
  {
    const WORDS = {
      dispute: 'a disputed estate: every item takes a tick', noname: 'no name yet', nodest: 'no destination yet',
      nofigure: 'no value yet', stale: 'its value was made for an earlier name', guess: 'both agents were guessing',
      firearm: 'a firearm or ammunition', appraisal: 'waiting on an appraisal', bequest: 'a specific bequest',
      disputed: 'marked disputed', note: 'an agent’s note on it', valnote: 'Agent Two’s note on it',
      photonote: 'a note on the first item off its photograph', duplicate: 'a possible duplicate: answer it under Possible duplicates',
      caution: 'a release caution',
    };
    const R0 = rig(ESTATE(), []);
    eq(val(attempt(() => JSON.parse(JSON.stringify(R0.ctx.INV_HOLD_WORDS)))), WORDS, '⚠ INV_HOLD_WORDS: one sentence per reason, in these words');
    // Each fixture is the drawer with ONE thing changed; the reason is the first the rule meets.
    const CASES = [
      ['dispute', ESTATE({ gateDispute: 'yes' }), [DRAWER()]],
      ['noname', ESTATE(), [DRAWER({ objectName: '', valNameAt: '' })]],
      ['nodest', ESTATE(), [DRAWER({ disposition: 'Undecided' })]],
      ['nofigure', ESTATE(), [DRAWER({ fmv: '', valLow: undefined, valHigh: undefined })]],
      ['stale', ESTATE(), [DRAWER({ objectName: 'Sterling flatware, Gorham', valNameAt: 'Stainless flatware and kitchen utensils, drawer d1' })]],
      ['guess', ESTATE(), [DRAWER({ agentConf: 'low', valConf: 'low' })]],
      ['firearm', ESTATE(), [DRAWER({ flagNFA: true })]],
      ['appraisal', ESTATE(), [DRAWER({ apprId: 'a1' })]],
      ['bequest', ESTATE(), [DRAWER({ flagBequest: true })]],
      ['disputed', ESTATE(), [DRAWER({ flagDisputed: true })]],
      ['note', ESTATE(), [DRAWER({ agentNotices: [{ kind: 'other', text: 'a mark under the base' }] })]],
      ['valnote', ESTATE(), [DRAWER({ valNotices: [{ kind: 'appraiser', text: 'a signed piece' }] })]],
      ['photonote', ESTATE(), [PHOTO(), SPLIT()], 's1'],
      ['duplicate', ESTATE(), [TWIN('a'), TWIN('b')], 'a'],
      ['caution', LIVING(), [DRAWER({ disposition: 'Sell', channel: 'Ashley Jerome' })]],
    ];
    eq(CASES.map((c) => c[0]).sort(), Object.keys(WORDS).sort(), 'fixture: one case per reason with words');
    CASES.forEach(([why, job, refs, id]) => {
      const R = rig(job, refs);
      const ref = R.ref(id || refs[0].stableId), fc = val(attempt(() => R.ctx.invAcceptCtx(R.job)));
      eq(val(attempt(() => R.ctx.invLineHold(ref, fc))), why, '⚠ invLineHold: ' + why);
      eq(val(attempt(() => R.ctx.invLineAccepted(ref, fc))), false, '…and invLineAccepted is its negation: held (' + why + ')');
      has(val(attempt(() => R.ctx._invRevBoxHtml(7, ref, fc))), 'title="Needs a look: ' + WORDS[why] + '. Tick it once checked."',
        '⚠ the box says why (' + why + ')');
    });
    // The two reasons no box shows: a removed line, and a reader that hands in no facts.
    const R = rig(ESTATE(), [DRAWER({ deletedAt: 5 }), DRAWER({ stableId: 'd2' })]);
    const fc = val(attempt(() => R.ctx.invAcceptCtx(R.job)));
    eq(val(attempt(() => R.ctx.invLineHold(R.ref('d1'), fc))), 'gone', 'a removed line: gone');
    eq(val(attempt(() => R.ctx.invLineHold(R.ref('d2'), null))), 'nocontext', '⚠ no facts handed in: nocontext');
    eq(val(attempt(() => R.ctx.invLineHold(R.ref('d2'), fc))), '', '…the drawer with them: \'\', it stands');
    eq(val(attempt(() => R.ctx.invLineAccepted(R.ref('d2'), fc))), true, '…and invLineAccepted says so');
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

  group('A2 · a name, a destination and a figure first');
  {
    eq(hold(ESTATE(), [DRAWER({ objectName: '', valNameAt: '' })]), 'noname', 'no name: a person names it');
    eq(hold(ESTATE(), [DRAWER({ objectName: '   ', valNameAt: '   ' })]), 'noname', 'a name of spaces is no name');
    eq(hold(ESTATE(), [DRAWER({ disposition: '' })]), 'nodest', 'no destination');
    eq(hold(ESTATE(), [DRAWER({ disposition: 'Undecided' })]), 'nodest', '⚠ Undecided is no destination');
    eq(hold(ESTATE(), [DRAWER({ disposition: 'Hold' })]), 'nodest', '⚠ Hold is no destination');
    eq(hold(ESTATE(), [DRAWER({ fmv: '', valLow: undefined, valHigh: undefined })]), 'nofigure', 'no figure from either agent or the desk');
    eq(hold(ESTATE(), [DRAWER({ valuedBy: undefined })]), 'nofigure', 'a figure nobody owns is not the agents\' or the desk\'s');
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
      ['appraisal', '⚠ at the appraisal threshold, any category ($3,200 sofa; waived, so no release caution)', ESTATE(), { category: 'Furniture', fmv: 3200, valLow: 2800, valHigh: 3600, apprWaived: true }],
      ['appraisal', '⚠ the top of Agent Two\'s range at the threshold ($2,500 to $3,100)', ESTATE(), { category: 'Furniture', fmv: 2500, valLow: 2000, valHigh: 3100, apprWaived: true }],
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

  group('⚠⚠ A5 · ammunition goes where a firearm goes: a round, cartridge or shell beside a calibre or gauge, and the words for it');
  {
    ['Box of .22 LR cartridges', '.38 Special rounds, two boxes', 'Box of 9mm Luger rounds', '12 ga shells', '410 bore shells',
     'Box of 20 gauge target loads', 'Ammunition, assorted', 'Ammo, two boxes', 'Shotshells, two boxes', 'Shotgun shells, one box',
     'Gunpowder tin', 'Black powder flask and shot pouch', 'Smokeless powder, one pound', 'Buckshot, bag', 'Birdshot, bag',
     'Rimfire cartridges, mixed', 'Centerfire brass, sorted', 'Primers, large rifle', 'Reloading press and dies', 'Reloading supplies, mixed',
     'Reloading equipment, bench', 'Rounds of .45 ACP', 'Cartridges for a rifle']
      .forEach((n) => eq(hold(ESTATE(), [NAMED(n)]), 'firearm', '⚠ held in General/Household: "' + n + '"'));
    // ⚠ A gauge or a cartridge alone is not ammunition (the reviews: a bare "12-gauge" held an extension cord).
    ['18-gauge brad nailer', '12-gauge extension cord', '14 gauge wire, spool', 'Ink cartridges, printer', 'Bullet journal and pens',
     '35mm film camera', 'Rain gauge, brass', 'Tire pressure gauge', 'Shell collection, seashells']
      .forEach((n) => eq(stands(ESTATE(), [NAMED(n)]), true, '⚠ stands: "' + n + '"'));
    // ⚠ Agent One's first reading counts too (valNameFrom), so Agent Two's correction never takes the word away.
    const RENAMED = NAMED('Vintage cardboard box, printed', { valNameFrom: 'Box of .22 LR cartridges' });
    eq(hold(ESTATE(), [RENAMED]), 'firearm', '⚠⚠ Agent Two renamed the box; Agent One\'s reading named the cartridges: held');
    eq(stands(ESTATE(), [NAMED('Vintage cardboard box, printed', { valNameFrom: 'Vintage shoe box' })]), true, '…a first reading with no ammunition: it stands');
  }

  group('⚠⚠ A6 · a note still open on the line\'s photograph holds the lines split off it, until it is quiet or its line is removed');
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
    // ⚠⚠ The reviews: a removed dresser's note held its socks and belts for good, and showed nowhere.
    eq(stands(ESTATE(), [PHOTO({ deletedAt: 9 }), SPLIT()], 's1'), true, '⚠⚠ the photograph\'s line removed: its note no longer holds the ladle');
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
    // ⚠⚠ The reviews: the tick on one half released the other, which then stood with the item counted twice.
    const R = rig(ESTATE(), [TWIN('a'), TWIN('b')], { user: 'Anthony Graziano' });
    const p = attempt(() => R.ctx._invSetReviewed(7, 'a', true));
    ok(p.ok, 'the tick on one half runs (' + (p.err || '') + ')');
    eq(R.ref('a').reviewed, true, 'fixture: the half is ticked');
    const fc1 = val(attempt(() => R.ctx.invAcceptCtx(R.job)));
    eq([val(attempt(() => R.ctx.invLineHold(R.ref('a'), fc1))), val(attempt(() => R.ctx.invLineHold(R.ref('b'), fc1)))], ['duplicate', 'duplicate'],
      '⚠⚠ one half ticked: both still held as a possible duplicate');
    eq(val(attempt(() => R.ctx.invLineReviewed(R.ref('b'), fc1))), false, '⚠ …and the other half is not reviewed (nothing counts it twice under REVIEWED)');
    // Not duplicates, through the real handler: the group's key as the Possible duplicates card hands it in.
    const g = val(attempt(() => R.ctx.agentDuplicateGroups(7)));
    ok(Array.isArray(g) && g.length === 1 && g[0].rows.length === 2, 'fixture: one group of two on the card');
    const nd = attempt(() => R.ctx.agentNotDuplicate(7, R.ctx._agDupHandle(g[0].key)));
    ok(nd.ok, 'Not duplicates runs (' + (nd.err || '') + ')');
    const fc2 = val(attempt(() => R.ctx.invAcceptCtx(R.job)));
    eq([!!R.ref('a').dupOK, !!R.ref('b').dupOK], [true, true], 'Not duplicates marks both');
    eq([val(attempt(() => R.ctx.invLineHold(R.ref('a'), fc2))), val(attempt(() => R.ctx.invLineHold(R.ref('b'), fc2)))], ['', ''], '⚠⚠ …and releases both');
    eq(val(attempt(() => R.ctx.invLineAcceptedOnly(R.ref('b'), fc2))), true, '…the unticked half now stands as the agents left it');
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
    ok(fc && fc.job && fc.job.id === 7 && fc.dup && typeof fc.dup === 'object', 'invAcceptCtx: the job and a duplicate index');
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
    const DESKFIG = DESK({ stableId: 'k1', valSource: undefined });
    const DESKNAME = NAMED('Hall bench', { stableId: 'k2', namedBy: 'desk', valuedBy: undefined, fmv: '', valLow: undefined, valHigh: undefined });
    const DESKNAMED_AGENTFIG = NAMED('Hall bench, oak', { stableId: 'k3', namedBy: 'desk' });
    const R = rig(ESTATE(), [DRAWER(), DESKFIG, DESKNAME, DESKNAMED_AGENTFIG, DRAWER({ stableId: 'f1', needsAppr: true }),
      DRAWER({ stableId: 'e1', reviewed: true, reviewedBy: 'Anthony Graziano' })]);
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
    const k2 = box('k2', true);
    has(k2, ' checked disabled', 'named and decided on the desk: ticked and fixed');
    has(k2, 'title="Reviewed: named and decided on the desk"', '…and says so');
    // A flagged line: unticked, a real checkbox, and the box says why.
    const f = box('f1', true);
    has(f, '<input type="checkbox" onchange=', '⚠ a flagged line: unticked');
    has(f, "onchange=\"_invSetReviewed(7,'f1',this.checked)\"", '…a press is the box\'s own state');
    has(f, 'title="Needs a look: waiting on an appraisal. Tick it once checked."', '⚠⚠ …and its tooltip names the flag');
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
    [['needsAppr', 'ticked for appraisal', 'waiting on an appraisal'], ['flagBequest', 'a specific bequest', 'a specific bequest']].forEach(([key, what, words]) => {
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
      has(rb, 'Needs a look: ' + words + '. Tick it once checked.', '…saying why');
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
    const R = rig(ESTATE(), [TWIN('a', { roomIdx: 1 }), TWIN('b', { roomIdx: 2 })]);
    R.ctx._agDupSetJob = 7;
    R.ctx._agDupSet = val(attempt(() => R.ctx._agDupIndex(7)));
    eq(R.ctx._agDupSet, {}, 'fixture: two rooms, no pair');
    const e = attempt(() => R.ctx._invEdit(7, 'a', 'roomIdx', { value: '2' }));
    ok(e.ok, 'the room edit runs (' + (e.err || '') + ')');
    eq(R.ctx._agDupSet, { a: 2, b: 2 }, '⚠ the index refreshed by the edit: the pair');
    const rb = R.doc.__els['inv-rev-a'] ? String(R.doc.__els['inv-rev-a'].outerHTML || '') : '';
    ok(rb.indexOf('<input type="checkbox" onchange=') >= 0, '⚠ …and the moved line\'s box repainted, unticked');
    has(rb, 'Needs a look: a possible duplicate: answer it under Possible duplicates. Tick it once checked.', '…sending the person to Possible duplicates');
    // Another client's index is not touched.
    const R2 = rig(ESTATE(), [TWIN('a', { roomIdx: 1 }), TWIN('b', { roomIdx: 2 })]);
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

  group('⚠⚠ B7 · the list read (Q107): when the list last changed, whether the read is current, its words');
  {
    // The manifest: two live lines, a removed one (changed last), and shots and photographs that are not lines.
    const M = [DRAWER({ stableId: 'a', ts: 100, updatedAt: 500 }), DRAWER({ stableId: 'b', ts: 200 }),
      DRAWER({ stableId: 'c', ts: 300, updatedAt: 900, deletedAt: 900 }),
      { stableId: 'af', label: 'before', roomIdx: 1, ts: 50, updatedAt: 5000 }, { stableId: 'dt', label: 'detail', groupId: 'a', roomIdx: 1, ts: 60, updatedAt: 6000 },
      { stableId: 'cp', label: 'inventory', collId: '3', roomIdx: 1, ts: 70, updatedAt: 7000 }];
    const R = rig(ESTATE(), M);
    eq(val(attempt(() => R.ctx.invListChangedAt(7))), 900, '⚠⚠ the newest change of an inventory line, a removal included; never a shot or a collection photograph');
    const R1 = rig(ESTATE(), M.filter((r) => r.stableId !== 'c'));
    eq(val(attempt(() => R1.ctx.invListChangedAt(7))), 500, '…with no removal: the newest live line (updatedAt, else its ts)');
    eq(val(attempt(() => rig(ESTATE(), [DRAWER({ ts: 250 })]).ctx.invListChangedAt(7))), 250, 'a line never edited: its ts');
    eq(val(attempt(() => rig(ESTATE(), []).ctx.invListChangedAt(7))), 0, 'no lines: 0');
    // invListRead: none, current, stale, exactly at the last change.
    eq(val(attempt(() => R.ctx.invListRead(R.job))), null, 'nobody has pressed: null');
    eq(val(attempt(() => R.ctx.invListRead(null))), null, 'no job: null');
    const rd = (inv) => val(attempt(() => rig(ESTATE({ invRead: inv }), M).ctx.invListRead(Object.assign(ESTATE(), { invRead: inv }))));
    eq(rd({ at: READ_AT, by: 'Anthony Graziano' }), { at: READ_AT, by: 'Anthony Graziano', current: true }, '⚠⚠ read after the last change: current');
    eq(rd({ at: 800, by: 'Anthony Graziano' }), { at: 800, by: 'Anthony Graziano', current: false }, '⚠⚠ read before the removal at 900: stale');
    eq(rd({ at: 900, by: 'Ashley Jerome' }), { at: 900, by: 'Ashley Jerome', current: true }, 'read at the very moment of the last change: not older, current');
    eq(rd({ at: 1000 }), { at: 1000, by: '', current: true }, 'no name recorded: by \'\'');
    eq(rd({ by: 'Anthony Graziano' }), null, 'a read with no time is no read');
    eq(val(attempt(() => R.ctx.invListReadWords({ at: READ_AT, by: 'Anthony Graziano' }))), READ_WORDS, '⚠ its words: "read by Anthony Graziano, October 26, 2026"');
    eq(val(attempt(() => R.ctx.invListReadWords({ at: READ_AT, by: '' }))), 'read by the desk, October 26, 2026', 'with no name: the desk');
  }

  group('⚠⚠ B8 · the work bar\'s list-read line, its press, and _invEdit making it the read of an earlier list');
  {
    const LINES = () => [DRAWER({ ts: 100 }), TICKED({ stableId: 'f2', needsAppr: true, ts: 200 })];
    const bar = (R) => String(val(attempt(() => R.ctx._renderInvWorkbar(R.job, R.ctx._jobInvRefs(7)))));
    // Never read: grey, and the press.
    const R = rig(ESTATE(), LINES(), { user: 'Anthony Graziano', now: READ_AT });
    const never = readLine(bar(R));
    ok(never.length > 0, 'fixture: the work bar draws #inv-read-7');
    eq(text(never), 'List not read yet · ✓ I’ve read the list', '⚠⚠ never read: "List not read yet", and the press');
    has(never, 'color:var(--gray)', '…in grey');
    has(never, '<button class="btn-s" onclick="invMarkListRead(7)"', '…the press calls invMarkListRead for this client');
    const Ro = rig(ESTATE(), LINES().concat([DRAWER({ stableId: 'f3', needsAppr: true })]));
    has(text(bar(Ro)), 'Client documents print with an IN PROGRESS stamp until every flagged item is ticked and the list is read since its last change — they are never withheld.',
      'a flag still open: the work bar\'s sentence names the read too');
    // ⚠⚠ The press, as the button runs it: the onclick's own code in the page's context.
    const call = (/onclick="(invMarkListRead\(\d+\))"/.exec(never) || [])[1];
    eq(call, 'invMarkListRead(7)', 'fixture: the button\'s onclick');
    const pr = attempt(() => vm.runInContext(call || 'null', R.ctx));
    ok(pr.ok, 'the press runs (' + (pr.err || '') + ')');
    eq(R.job.invRead, { at: READ_AT, by: 'Anthony Graziano' }, '⚠⚠ job.invRead: when, and the device\'s user');
    eq([R.job.updatedAt, R.saved.length, R.synced], [READ_AT, 1, [7]], '⚠⚠ a person\'s edit (_saveJobEdit): the job\'s clock moved, saved once and synced');
    const wb = R.doc.__els['inv-workbar'] ? String(R.doc.__els['inv-workbar'].outerHTML || '') : '';
    const cur = readLine(wb);
    eq(text(cur), '✓ List ' + READ_WORDS, '⚠⚠ the work bar repainted: "✓ List read by Anthony Graziano, October 26, 2026"');
    has(cur, 'color:var(--ok-tx)', '…in green');
    lacks(cur, 'invMarkListRead', '…and no press while it is current');
    // With no device user, the concierge.
    const Rc = rig(ESTATE(), LINES(), { now: READ_AT });
    attempt(() => Rc.ctx.invMarkListRead(7));
    eq(Rc.job.invRead && Rc.job.invRead.by, 'Ashley Jerome', 'no device user set: the job\'s concierge (_invStampBy)');
    // ⚠⚠ A line changed after the read: _invEdit repaints the line by id, and the papers go back to IN PROGRESS.
    const Re = rig(ESTATE({ invRead: { at: READ_AT, by: 'Anthony Graziano' } }), LINES(), { now: READ_AT + 60000 });
    eq(text(readLine(bar(Re))), '✓ List ' + READ_WORDS, 'fixture: current before the edit');
    const fcB = val(attempt(() => Re.ctx.invAcceptCtx(Re.job)));
    has(text(val(attempt(() => Re.ctx._invProgressStamp(Re.ctx._jobInvRefs(7), { fc: fcB })))), 'REVIEWED — ' + READ_WORDS + '; 1 item checked; 1 accepted as valued',
      'fixture: the stamp REVIEWED over the read');
    const e = attempt(() => Re.ctx._invEdit(7, 'd1', 'condition', { value: 'Fair' }));
    ok(e.ok, 'a condition edit runs (' + (e.err || '') + ')');
    const el = Re.doc.__els['inv-read-7'];
    const rp = el ? String(el.outerHTML || '') : '';
    eq(text(rp), 'List ' + READ_WORDS + ' · changed since · ✓ I’ve read the list', '⚠⚠ _invEdit repainted #inv-read-7 by id: "changed since", and the press again');
    ok(!Re.doc.__els['inv-workbar'] || !Re.doc.__els['inv-workbar'].outerHTML, '…by id: the work bar itself left alone');
    const fcA = val(attempt(() => Re.ctx.invAcceptCtx(Re.job)));
    has(text(val(attempt(() => Re.ctx._invProgressStamp(Re.ctx._jobInvRefs(7), { fc: fcA })))),
      'IN PROGRESS — 1 item checked; 1 accepted as valued; the list not yet read since it last changed', '⚠⚠ …and the stamp went back to IN PROGRESS');
    // No lines: no line on the bar.
    eq(val(attempt(() => rig(ESTATE(), []).ctx._invListReadHtml(ESTATE(), { total: 0 }))), '', 'an empty list: nothing to read, no line');
  }

  // ═══════════════════════════════ C · THE PAPERS ═══════════════════════════════
  group('⚠⚠ C1 · the stamps say how many stood as the agents left them (Q100), and who read the list (Q107)');
  {
    const stood = (n, p) => Array.from({ length: n }, (_, i) => DRAWER({ stableId: (p || 's') + i }));
    const looked = (n, p) => Array.from({ length: n }, (_, i) => (i % 2 ? TICKED({ stableId: (p || 'c') + i })
      : TICKED({ stableId: (p || 'c') + i, needsAppr: true })));
    const open = (n) => Array.from({ length: n }, (_, i) => DRAWER({ stableId: 'o' + i, needsAppr: true }));
    // The stamp over `items`, the rig's manifest the same lines (invListChangedAt reads it), the job's read as given.
    const stamp = (items, o, inv) => {
      const R = rig(ESTATE(inv ? { invRead: inv } : {}), items);
      return text(val(attempt(() => R.ctx._invProgressStamp(R.ctx._photoRefs[7], Object.assign({ fc: R.ctx.invAcceptCtx(R.job) }, o || {})))));
    };
    const READ = { at: READ_AT, by: 'Anthony Graziano' };
    const later = (items) => items.map((r, i) => (i === 0 ? Object.assign({}, r, { updatedAt: READ_AT + 1000 }) : r));
    // 1 · nothing accepted: no read needed, the stamp as it always read.
    has(stamp(looked(3)), 'REVIEWED — all 3 items', '⚠ none standing: REVIEWED with no read, as it always did');
    const one = stamp(looked(1));
    has(one, 'REVIEWED — 1 item', '⚠ a one-line list: "1 item"');
    lacks(one, 'all 1', '…never "all 1 items"');
    lacks(stamp(looked(3)), 'read', '…and it names no read');
    // 2 · accepted, and the list read since its last change.
    const big = looked(42).concat(stood(158));
    has(stamp(big, {}, READ), 'REVIEWED — ' + READ_WORDS + '; 42 items checked; 158 accepted as valued', '⚠⚠ Q100 and Q107, in Anthony\'s words');
    has(stamp(stood(12), {}, READ), 'REVIEWED — ' + READ_WORDS + '; 12 accepted as valued', 'every line standing');
    has(stamp(looked(1).concat(stood(1)), {}, READ), 'REVIEWED — ' + READ_WORDS + '; 1 item checked; 1 accepted as valued', 'one of each, singular');
    // 3 · accepted, never read.
    const nr = stamp(big);
    has(nr, 'IN PROGRESS — 42 items checked; 158 accepted as valued; the list not yet read', '⚠⚠ every line reviewed, the list never read: IN PROGRESS');
    has(nr, 'This is a working copy issued during the engagement. Every item is named and decided; the list has not been read through.', '⚠ …with its caveat');
    lacks(nr, 'REVIEWED', '…never REVIEWED');
    lacks(nr, 'since it last changed', '…and no "since": nobody read it');
    has(stamp(stood(12)), 'IN PROGRESS — 12 accepted as valued; the list not yet read', 'every line standing, never read');
    // 4 · accepted, read before a change.
    const st = stamp(later(big), {}, READ);
    has(st, 'IN PROGRESS — 42 items checked; 158 accepted as valued; the list not yet read since it last changed', '⚠⚠ read, then a line changed: IN PROGRESS');
    has(st, 'Every item is named and decided; the list has not been read through since it last changed.', '…its caveat says since');
    lacks(st, READ_WORDS, '…and the stale read is never printed as the read');
    // In progress (a flagged line unticked): the standing lines beside it, no read words, as before.
    const ip = stamp(looked(30).concat(stood(158), open(2)), {}, READ);
    has(ip, 'IN PROGRESS — 30 of 32 items checked; 158 accepted as valued', '⚠ in progress, the standing lines beside it');
    lacks(ip, 'read', '…and no read named while a flag waits');
    has(stamp(looked(1).concat(open(2))), 'IN PROGRESS — 1 of 3 items reviewed', 'in progress with none standing: as it always did');
    has(stamp(looked(1).concat(open(2))), 'Values and dispositions on unreviewed lines may still change.', 'the valued papers\' caveat');
    // The papers that print no figure.
    has(stamp(looked(2).concat(stood(5)), { namesOnly: true }, READ), 'REVIEWED — ' + READ_WORDS + '; 2 items checked; 5 accepted as named',
      '⚠ namesOnly (the ledger, the Contents Record): accepted as named, read');
    has(stamp(looked(2).concat(stood(5)), { namesOnly: true }), 'IN PROGRESS — 2 items checked; 5 accepted as named; the list not yet read', '…and unread');
    const nIP = stamp(looked(1).concat(stood(5), open(1)), { namesOnly: true });
    has(nIP, 'IN PROGRESS — 1 of 2 items checked; 5 accepted as named', 'namesOnly in progress');
    has(nIP, 'Dispositions on unreviewed lines may still change.', '⚠ namesOnly\'s caveat names only what the page carries');
    lacks(nIP, 'Values and dispositions', '…never the values it does not print');
    const cl = stamp(looked(1).concat(stood(5), open(1)), { noValues: true });
    has(cl, '5 accepted as named', 'noValues (the Contents List): accepted as named');
    has(cl, 'Descriptions and conditions on unreviewed lines may still change.', '…with its own caveat');
    has(stamp([DRAWER({ stableId: 'a' }), DRAWER({ stableId: 'b', namedBy: 'desk' })], { noValues: true }, READ), 'REVIEWED — ' + READ_WORDS + '; 1 item checked; 1 accepted as named',
      'noValues reads a person-named line as checked too');
    // A name a person typed is a look on a page that prints names: checked there, accepted on a valued page.
    const pair = [DRAWER({ stableId: 'a' }), DRAWER({ stableId: 'b', namedBy: 'desk' })];
    has(stamp(pair, { namesOnly: true }, READ), 'REVIEWED — ' + READ_WORDS + '; 1 item checked; 1 accepted as named', '⚠ a person-named line is checked on a namesOnly paper');
    has(stamp(pair, {}, READ), 'REVIEWED — ' + READ_WORDS + '; 2 accepted as valued', '…and accepted on a valued one (nobody looked at its figure)');
    has(stamp([DRAWER({ stableId: 'a' }), DRAWER({ stableId: 'b', reviewed: true })], { namesOnly: true }, READ), 'REVIEWED — ' + READ_WORDS + '; 1 item checked; 1 accepted as named',
      'a name ticked before the figure landed: checked on a namesOnly paper');
    // A figure typed on the desk is a person's look (Q105): checked, never accepted.
    const desk = DESK({ stableId: 'k', namedBy: 'agent' });
    has(stamp([DRAWER({ stableId: 'a' }), desk], {}, READ), 'REVIEWED — ' + READ_WORDS + '; 1 item checked; 1 accepted as valued', '⚠ a desk figure counts as checked');
    has(stamp([desk], {}), 'REVIEWED — 1 item', '…and a list of nothing but people\'s figures needs no read');
    // No facts handed in: nothing stands, and no read is asked.
    const R0 = rig(ESTATE({ invRead: READ }), stood(12));
    has(text(val(attempt(() => R0.ctx._invProgressStamp(R0.ctx._photoRefs[7])))), 'IN PROGRESS — 0 of 12 items reviewed', '⚠ a printer handing in no facts counts nothing as standing');
    const s = val(attempt(() => R0.ctx._invReviewStats(looked(4).concat(stood(6), open(2)), R0.ctx.invAcceptCtx(R0.job))));
    eq(s && [s.done, s.total, s.complete, s.accepted], [10, 12, false, 6], 'the counts under the words');
    eq(val(attempt(() => R0.ctx._invAcceptedStampWords({ accepted: 0 }))), '', 'none standing: no words');
  }

  group('⚠⚠ C2 · the schedules\' value stamp: two pills, the grey one naming the read, and noAccepted (Q104, Q107)');
  {
    const stood = (n) => Array.from({ length: n }, (_, i) => DRAWER({ stableId: 's' + i }));
    const flagged = DRAWER({ stableId: 'x', needsAppr: true, fmv: 500, valLow: 400, valHigh: 600 });
    const av = (items, o, inv) => {
      const R = rig(ESTATE(inv ? { invRead: inv } : {}), items);
      return val(attempt(() => R.ctx._avUnreviewedStamp(R.ctx._photoRefs[7], Object.assign({ fc: R.ctx.invAcceptCtx(R.job) }, o || {}))));
    };
    const h = av(stood(4).concat([flagged]));
    has(text(h), '1 value not yet reviewed', '⚠ only the flagged agent figure is "not yet reviewed"');
    has(text(h), '4 accepted as valued · list not yet read', '⚠⚠ …and the grey pill says how many stood, and that nobody read the list');
    has(h, 'background:#8a6d3b;', 'the first pill bronze');
    has(h, 'background:#6b6b6b;', 'the second grey');
    eq(count(h, 'display:inline-block'), 2, 'two pills');
    const READ = { at: READ_AT, by: 'Anthony Graziano' };
    has(text(av(stood(4), {}, READ)), '4 accepted as valued · list ' + READ_WORDS, '⚠⚠ read since the last change: who and when');
    const stale = text(av(stood(4).map((r, i) => (i ? r : Object.assign({}, r, { updatedAt: READ_AT + 1 }))), {}, READ));
    has(stale, '4 accepted as valued · list not yet read since it changed', '⚠⚠ read before a change: not yet read since it changed');
    lacks(stale, READ_WORDS, '…the stale read never printed');
    has(text(av(stood(1).concat([flagged, DRAWER({ stableId: 'y', apprId: 'a1' })]))), '2 values not yet reviewed', 'two flagged: plural');
    const na = text(av(stood(4).concat([flagged]), { noAccepted: true }));
    has(na, '1 value not yet reviewed', 'noAccepted keeps the first pill');
    lacks(na, 'accepted as valued', '⚠ noAccepted (the Estate Inventory Report, whose stamp already says it): no grey pill');
    eq(av([TICKED({ stableId: 'a' }), TICKED({ stableId: 'b' })]), '', 'every figure looked at: nothing to say');
    const R = rig(ESTATE(), stood(4));
    const nofc = text(val(attempt(() => R.ctx._avUnreviewedStamp(R.ctx._photoRefs[7]))));
    has(nofc, '4 values not yet reviewed', '⚠ no facts handed in: every agent figure is unreviewed');
    lacks(nofc, 'accepted', '…and none accepted');
    eq(val(attempt(() => R.ctx._avReadWords(null))), ' &middot; list not yet read', '_avReadWords with no facts: not read');
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
    has(text(ci.html), '2 accepted as valued · list not yet read', '⚠ the Court Inventory\'s grey pill');
    has(text(ci.html), '1 value not yet reviewed', '…beside the flagged figure');
    const ts = page(ESTATE({ matterType: 'trust', trustName: 'Butler Family Trust' }), 'printTrustSchedule');
    ok(ts.html.length > 1000, 'fixture: the Trust Schedule printed (' + (ts.why || ts.html.length) + ')');
    has(text(ts.html), '2 accepted as valued', '⚠ the Trust Schedule\'s grey pill');
    // The Contents Record (living work): accepted as named.
    const cr = page(LIVING(), 'printContentsRecord');
    ok(cr.html.length > 1000, 'fixture: the Contents Record printed (' + (cr.why || cr.html.length) + ')');
    has(text(cr.html), 'IN PROGRESS — 2 of 3 items checked; 1 accepted as named', '⚠ the Contents Record\'s stamp');
    // ⚠⚠ The list read reaches the pages: every flag answered and the list read, the printers name the read (Q107).
    const READ = { at: READ_AT, by: 'Anthony Graziano' };
    // Numbered already, as the desk numbers a line on its first paint: a number issued now is a write (_invTouch) after the read.
    const done = () => [DRAWER({ stableId: 'a', itemNo: 1 }), DRAWER({ stableId: 'b', namedBy: 'desk', itemNo: 2 }), TICKED({ stableId: 't', itemNo: 3 })];
    const eirR = page(ESTATE({ invRead: READ }), 'printEstateInventoryReport', done());
    has(text(eirR.html), 'REVIEWED — ' + READ_WORDS + '; 1 item checked; 2 accepted as valued', '⚠⚠ the Estate Inventory Report over a read list: REVIEWED, and by whom');
    const eirN = page(ESTATE(), 'printEstateInventoryReport', done());
    has(text(eirN.html), 'IN PROGRESS — 1 item checked; 2 accepted as valued; the list not yet read', '⚠⚠ …the same list unread: IN PROGRESS');
    has(text(page(ESTATE({ svc: 'probate', invRead: READ }), 'printCourtInventory', done()).html), '2 accepted as valued · list ' + READ_WORDS, '⚠ the Court Inventory\'s pill names the read');
    has(text(page(LIVING({ invRead: READ }), 'printContentsRecord', done()).html), 'REVIEWED — ' + READ_WORDS + '; 2 items checked; 1 accepted as named', '⚠ the Contents Record too');
    // A disputed estate: the same lines, nothing stands, on every page, and no read is asked.
    const dsp = page(ESTATE({ gateDispute: 'yes' }), 'printEstateInventoryReport');
    has(text(dsp.html), 'IN PROGRESS — 1 of 4 items reviewed', '⚠ a disputed estate\'s report: nothing accepted (Q102)');
    lacks(text(dsp.html), 'accepted as', '…not a word of it');
  }

  // ═══════════════════════════════ D · ONE DEFINITION ═══════════════════════════════
  group('D · one rule, its reasons, one context, one read, read where they should be; nothing of the floor left');
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
    eq(callersOf('invLineHold'), ['_invRevBoxHtml', 'invLineAccepted'], '⚠ invLineHold\'s readers: the yes/no and the box that names the reason');
    eq(calls('invLineHold'), 3, '…and nothing else (the definition and two calls)');
    eq(callersOf('invLineAccepted'), ['_avUnreviewedStamp', '_invRevBoxHtml', 'invLineAcceptedOnly', 'invLineReviewed'],
      '⚠ invLineAccepted\'s readers: the review, the accepted count, the value stamp and the row\'s tooltip');
    eq(calls('invLineAccepted'), 5, '…and nothing else (the definition and four calls)');
    has(live(fn('invLineAccepted')), 'return !invLineHold(ref, fc);', 'invLineAccepted is the reason\'s negation, nothing of its own');
    eq(callersOf('invLineAcceptedOnly'), ['_avUnreviewedStamp', '_invRevBoxHtml', '_invReviewStats'], 'the accepted count\'s readers');
    eq(callersOf('invAcceptCtx'), ['_invAcceptCtxOf', 'printContentsList', 'printContentsRecord', 'printCourtInventory', 'printDispositionLedger',
      'printEstateInventoryReport', 'printTrustSchedule'], '⚠ invAcceptCtx\'s: the desk\'s context and the six printers');
    eq(calls('invAcceptCtx'), 8, '…and nothing else (the definition and seven calls)');
    eq(callersOf('_invAcceptCtxOf'), ['_invEdit', '_invGroupItems', '_invRevBoxHtml', '_renderInvRow', '_renderInvWorkbar'], 'the desk\'s context: its readers');
    has(live(decl('INV_WORK_FLAGS')), 'return !invLineReviewed(r, _invAcceptCtxOf(job));', '…and the Not reviewed chip');
    ['printContentsList', 'printEstateInventoryReport', 'printCourtInventory', 'printTrustSchedule', 'printDispositionLedger', 'printContentsRecord']
      .forEach((p) => ok(/fc: (invAcceptCtx\(job\)|_ac\b)/.test(live(fn(p))), p + ' hands its stamps the facts'));
    // ⚠ The hint is the line's alone (Q108): one reader, handed no facts.
    eq(callersOf('invLineUnsure'), ['_renderInvRow'], 'invLineUnsure: the row alone');
    eq(calls('invLineUnsure'), 2, '…called once');
    has(live(fn('invLineUnsure')), 'invLineReviewed(ref))', '⚠ …and it asks for a person\'s look, never the rule\'s');
    // Every reason has its words, and every word a reason (gone and nocontext draw no box).
    const H = live(fn('invLineHold'));
    const reasons = new Set([...H.matchAll(/return '([a-z]+)'/g), ...H.matchAll(/\? '([a-z]+)' :/g)].map((m) => m[1]));
    const words = Object.keys(vm.runInNewContext(decl('INV_HOLD_WORDS') + '; INV_HOLD_WORDS'));
    eq([...reasons].sort(), ['gone', 'nocontext'].concat(words).sort(), '⚠ invLineHold\'s reasons: each with words in INV_HOLD_WORDS, and no words without a reason');
    eq((L.match(/\bINV_HOLD_WORDS\b/g) || []).length, 2, 'INV_HOLD_WORDS: declared once, read once (by the box)');
    has(live(fn('_invRevBoxHtml')), 'INV_HOLD_WORDS[hold]', '…the box\'s tooltip');
    eq((L.match(/\bINV_ACCEPT_AMMO_RE\b/g) || []).length, 3, 'the ammunition words: declared once, read twice by the rule (the name and Agent One\'s first reading)');
    eq(count(H, 'INV_ACCEPT_AMMO_RE.test('), 2, '…both reads inside invLineHold');
    has(H, 'INV_ACCEPT_AMMO_RE.test(String(ref.valNameFrom', '…one of them valNameFrom');
    // The list read: one writer, one reader of the change, one reader of the read.
    eq((L.match(/\.invRead\s*=/g) || []).length, 1, '⚠ job.invRead written in one place');
    has(live(fn('invMarkListRead')), 'job.invRead = { at: Date.now(), by: _invStampBy(job) };', '…invMarkListRead, by the device\'s user');
    has(live(fn('invMarkListRead')), '_saveJobEdit(job', '…as a person\'s edit');
    eq(callersOf('invListChangedAt'), ['invListRead'], 'invListChangedAt: read only by invListRead');
    eq(callersOf('invListRead'), ['_avReadWords', '_invListReadHtml', '_invProgressStamp'], '⚠ invListRead: the stamp, the grey pill and the work bar');
    eq(callersOf('invMarkListRead'), ['_invListReadHtml'], 'the press: the work bar\'s button alone');
    eq(callersOf('_invListReadHtml'), ['_invEdit', '_renderInvWorkbar'], 'the line: the work bar, and _invEdit\'s repaint by id');
    // The floor is gone, in every form it took.
    ['INV_REVIEW_FLOOR', 'invLineUnderFloor', '_invFloorStampWords', 'agentPhotoNotes', 'floorNamed', 'noFloor', 'under $100', 'Under $100']
      .forEach((n) => lacks(L, n, 'gone from live code: ' + n));
  }
};
