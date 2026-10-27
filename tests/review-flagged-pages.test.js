'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// THE PAGES SAY IT: ONLY FLAGGED LINES TAKE A TICK, AND THE LIST IS READ (2026-10-26, Q106 to Q109; Q106 replaced Q99's
// $100 line of the day before, and carries Q100 to Q105). Group E of review-floor.test.js (9787be9), restated for the rule as
// built, for the reviewers' round, and (round three) for the second review and Q109.
//
// Anthony: *"we will be obviously going back to the office and looking over the entire inventory list ourselves to make sure
// everything looks right … this is our job at night … And we verify it with what we saw on site."* He took *"Only flagged
// lines"*, then *"One 'List read' press"* (Q107), *"Show it, no tick"* (Q108) and *"Bronze until read"* (Q109). The manual and
// the playbook, HTML and markdown, each carry the two notes once, and:
//
//   A · the Q106 note names what stands and what keeps a tick, and every flag it names is held by the real invLineHold with a
//       real context (each driven on a line that otherwise stands), as is every thing it says stands or is no longer a flag
//       (the lot cap, an appraisal's figure or its waiver, a room-check line whose partner went, a removed photograph's
//       Look at this, Agent Two's note under a figure the desk typed), and the ammunition words it lists are the code's;
//   B · it quotes the row's tooltips exactly as _invRevBoxHtml prints them (every reason a line is held, off INV_HOLD_WORDS;
//       what a tick does not settle, and the bronze box ticked over it), and the work bar's words as _invProgressBar does;
//   C · it quotes the stamps' words exactly as _invProgressStamp, _invAcceptedStampWords, _avUnreviewedStamp and
//       _avAcceptedPill print them, read and not read, on fixtures with the counts the pages quote, and the printers hand in
//       the options the pages describe;
//   D · the sentences elsewhere on the pages are restated, no sentence of the $100 line, of round one's errors or of the
//       second review's is left, the work bar's sentence is the one the real bar draws, and AGENT_TWO_SPEC §13 says it;
//   E · the list read (Q107): the press, what it records (a fingerprint of what the papers print, never a time), what
//       changes it and what never does, the press waiting for the sheet, the line's states, and the package's question,
//       driven through invMarkListRead, invListRead, invListSeen, invListReadRefusal, _invListReadHtml and probatePackageGaps;
//   F · the hint on any guess (Q108), driven through invLineUnsure, with what settles each agent's guess;
//   G · the second review's rules the pages state: a tick never settles a line with no name or an open possible duplicate,
//       a ticked Undecided or Hold line counts, a pair stays one through a rename, a firearm note outlives its line, a
//       waiver answers the appraisal.
//
// review-flagged.test.js holds the rule itself; this file holds the pages to it.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { sandbox, source, fn, decl } = require('./harness');

const ROOT = path.join(__dirname, '..');
const rd = (f) => { try { return fs.readFileSync(path.join(ROOT, f), 'utf8'); } catch (e) { return ''; } };
const SRC = source();
const ALL_FNS = new Set((SRC.match(/(^|\n)function\s+([A-Za-z0-9_$]+)\s*\(/g) || []).map((s) => s.replace(/^\n?function\s+/, '').replace(/\s*\($/, '')));
const ALL_VARS = new Set((SRC.match(/(^|\n)var\s+([A-Za-z0-9_$]+)\s*=/g) || []).map((s) => s.replace(/^\n?var\s+/, '').replace(/\s*=$/, '')));
// ⚠ LINE BY LINE, NEVER A BLOCK-COMMENT REGEX (it eats ~170 KB here because of `accept="image/*"`).
const live = (t) => String(t).split('\n').filter((l) => !l.trim().startsWith('//')).map((l) => l.replace(/\s\/\/\s.*$/, '')).join('\n');
const codeOnly = (t) => live(t).replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, "''");

// The functions and vars `roots` reach; `stop` names what the test supplies.
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
// The rule and its reasons, its context, the row's box, the work bar's count and line, the press and what it reads, the three
// stamps and the schedules' pill, the package's question, the notices above the rows and the duplicate groups, by their real
// call tree; only data, the save, the sheet's state and the bar's redraw are stubbed.
const ROOTS = ['invLineHold', '_invLineHolds', 'invLineOpen', 'invLineAccepted', 'invAcceptCtx', 'invLineAcceptedOnly', 'invLineReviewed',
  'invLineUnsure', '_invReviewStats', '_invAcceptedStampWords', '_invProgressStamp', '_avUnreviewedStamp', '_avAcceptedPill', '_invRevBoxHtml',
  '_invProgressBar', 'invMarkListRead', 'invListRead', 'invListReadWords', 'invListSeen', 'invListReadRefusal', '_invListReadHtml', '_invReadKey',
  'probatePackageGaps', 'agentNotices', 'agentDuplicateGroups'];
const STUBS = ['jobs', '_photoRefs', 'estimateStore', 'vendors', 'vendorDirectory', 'contractors', 'document', '_saveJobEdit', '_renderInvWorkbar',
  'SHEETS_SYNC_URL', '_invCloudSeen', '_invCloudFailed', 'jobPlanStore', 'alert'];
function compile(roots, stop) {
  const c = closure(roots, stop);
  const ordered = c.vars.map((name) => ({ name, at: SRC.search(new RegExp('(^|\\n)var\\s+' + name + '\\s*=')) }))
    .sort((a, b) => a.at - b.at).map((v) => v.name);
  return new vm.Script([...ordered.map(decl), ...c.fns.map(fn)].join('\n\n'), { filename: 'havellin.html (extracted)' });
}
let _script = null;
const liftedScript = () => (_script = _script || compile(ROOTS, STUBS));
// `o`: the sheet's state (`url`, `seen`, `failed`), as the desk holds it; by default no URL (a device with nothing to read).
function rig(job, refs, o) {
  o = o || {};
  const ctx = sandbox({ stubs: { jobs: [Object.assign({}, job)], _photoRefs: { [job.id]: refs || [] }, estimateStore: {}, vendors: [],
    vendorDirectory: [], contractors: [], document: { getElementById: () => null }, jobPlanStore: {},
    SHEETS_SYNC_URL: o.url || '', _invCloudSeen: o.seen || {}, _invCloudFailed: o.failed || {},
    alert(m) { ctx.__alerts = (ctx.__alerts || []).concat([String(m)]); },
    _saveJobEdit(j) { ctx.__saves = (ctx.__saves || []).concat([j]); }, _renderInvWorkbar: () => '' } });
  liftedScript().runInContext(ctx);
  return ctx;
}
// The work bar itself, on its real call tree (it lifts ~1,000 functions, so it has its own script).
let _bar = null;
function workbar(job, refs) {
  _bar = _bar || compile(['_renderInvWorkbar'], STUBS.filter((s) => s !== '_renderInvWorkbar'));
  const ctx = sandbox({ stubs: { jobs: [job], _photoRefs: { [job.id]: refs }, estimateStore: {}, vendors: [], vendorDirectory: [], contractors: [],
    document: { getElementById: () => null }, jobPlanStore: {}, SHEETS_SYNC_URL: '', _invCloudSeen: {}, _invCloudFailed: {}, alert() {}, _saveJobEdit() {} } });
  _bar.runInContext(ctx);
  return ctx;
}
// A call that may throw on a broken build: a revert must fail its assertions, not end the file.
function attempt(f) { try { return { ok: true, val: f() }; } catch (e) { return { ok: false, err: String(e && e.message || e) }; } }
// Dates print in Eastern time (the app's), read off a fixed noon, never the clock.
const eastern = (f) => { const prev = process.env.TZ; process.env.TZ = 'America/New_York'; try { return f(); } finally { process.env.TZ = prev; } };
const AT = Date.UTC(2026, 9, 26, 16, 0);
// ⚠ A READ IS A FINGERPRINT OF THE LIST IT SAW (the second review): record it off the rig's own list, as the press does.
const readNow = (C, by) => { C.jobs[0].invRead = { at: AT, by: by == null ? 'Anthony Graziano' : by, seen: C.invListSeen(C.jobs[0].id) }; return C; };

const ESTATE = (o) => Object.assign({ id: 7, hvlId: 'HVL-0007', name: 'Butler Estate', svc: 'cleanout', matterType: 'probate', docTier: 'values',
  deathDate: '2026-06-14', executor: 'Tripp Butler', tc: 'Ashley Jerome', won: true, status: 'won', addr: '69 Beach Blvd' }, o || {});
const LIVING = (o) => Object.assign({ id: 7, hvlId: 'HVL-0007', name: 'Ellsworth', svc: 'downsizing_move', tc: 'Ashley Jerome', won: true,
  status: 'won', addr: '12 Ocean Way' }, o || {});
// Agent One's name and Agent Two's figure, both fairly sure, a destination chosen, nothing flagged: the cutlery drawer. Each
// line gets a name of its own, so a list of them is no duplicate group.
const DRAWER = (o) => {
  const id = (o && o.stableId) || 'd1';
  const name = (o && o.objectName) || 'Stainless flatware and kitchen utensils, drawer ' + id;
  return Object.assign({ stableId: id, label: 'inventory', roomIdx: 1, ts: 1, objectName: name, namedBy: 'agent', agentConf: 'medium',
    category: 'General/Household', qty: 1, condition: 'Good', disposition: 'Donate', driveFileId: 'F' + id, valuedBy: 'agent', fmv: 40,
    valLow: 20, valHigh: 60, valConf: 'medium', valSource: 'General estimate', valNameAt: name }, o || {});
};
const NAMED = (name, o) => DRAWER(Object.assign({ objectName: name, valNameAt: name }, o || {}));
const TICKED = (o) => DRAWER(Object.assign({ reviewed: true, reviewedBy: 'Ashley Jerome', valReviewed: true }, o || {}));
// Two lamps Agent One named alike off two photographs in one room (`agentName`, Agent One's own reading, as _agWrite keeps it).
const LAMP = (id, o) => DRAWER(Object.assign({ stableId: id, ts: id === 'd1' ? 1 : 2, objectName: 'Brass table lamp', valNameAt: 'Brass table lamp', agentName: 'Brass table lamp' }, o || {}));
// A figure the desk typed: no range, no confidence of Agent Two's.
const DESKFIG = { valuedBy: 'desk', valLow: undefined, valHigh: undefined, valConf: undefined };
// The appraisal's figure typed from the report, on a line linked to its appraiser and ticked for one.
const APPRAISED = { valuedBy: 'appraiser', valSource: 'Appraisal', apprId: 'a1', apprDoc: 'Palm Beach Appraisals', needsAppr: true, fmv: 4500, valLow: undefined, valHigh: undefined, valConf: undefined };
// What the rule answers for the first line of `refs` on `job`, `refs` being the job's whole list: '' where it stands.
function hold(job, refs) {
  const C = rig(job, refs);
  const r = attempt(() => C.invLineHold(C._photoRefs[job.id][0], C.invAcceptCtx(C.jobs[0], C._photoRefs[job.id])));
  return r.ok ? r.val : 'threw: ' + r.err;
}
function stands(job, refs) {
  const C = rig(job, refs);
  const r = attempt(() => C.invLineAccepted(C._photoRefs[job.id][0], C.invAcceptCtx(C.jobs[0], C._photoRefs[job.id])));
  return r.ok ? r.val : 'threw: ' + r.err;
}
function reviewed(job, refs) {
  const C = rig(job, refs);
  const r = attempt(() => C.invLineReviewed(C._photoRefs[job.id][0], C.invAcceptCtx(C.jobs[0], C._photoRefs[job.id])));
  return r.ok ? r.val : 'threw: ' + r.err;
}
// The text a reader sees, from a page's HTML or markdown, or from what the code prints.
const dec = (h) => String(h).replace(/&#(\d+);/g, (m, n) => String.fromCodePoint(+n)).replace(/&mdash;/g, '—').replace(/&middot;/g, '·')
  .replace(/&rsquo;|&lsquo;/g, "'").replace(/&ldquo;|&rdquo;/g, '"').replace(/&hellip;/g, '…').replace(/&eacute;/g, 'é').replace(/&amp;/g, '&')
  .replace(/<[^>]+>/g, ' ').replace(/\*\*?|`/g, '').replace(/[’‘]/g, "'").replace(/\s+/g, ' ').replace(/\s+([,.;:)])/g, '$1').replace(/\(\s+/g, '(').trim();
// A note: in HTML its <div class="note"> to the </div>; in markdown its one quoted line.
function noteOf(raw, title) {
  const at = raw.indexOf(title);
  if (at < 0) return '';
  const end = /\.md$/.test(raw.__name || '') ? raw.indexOf('\n', at) : raw.indexOf('</div>', at);
  return raw.slice(at, end < 0 ? at + 9000 : end);
}
const PAGES = [['manual.html', 'Only flagged lines take a tick (2026-10-26, Q106)'], ['MANUAL.md', 'Only flagged lines take a tick (2026-10-26, Q106)'],
  ['concierge-guide.html', 'Only flagged lines take a tick (new 2026-10-26, Q106)'], ['CONCIERGE_GUIDE.md', 'Only flagged lines take a tick (new 2026-10-26, Q106)']];
// The Q107/Q108 note, each page's own title.
const READ_NOTES = { 'manual.html': 'The list read, the hint on any guess, and the box that says why (2026-10-26, Q107 and Q108)',
  'MANUAL.md': 'The list read, the hint on any guess, and the box that says why (2026-10-26, Q107 and Q108)',
  'concierge-guide.html': 've read the list, and the hint on any guess (new 2026-10-26, Q107 and Q108)',
  'CONCIERGE_GUIDE.md': 've read the list, and the hint on any guess (new 2026-10-26, Q107 and Q108)' };
const MANUALS = ['manual.html', 'MANUAL.md'], PLAYBOOKS = ['concierge-guide.html', 'CONCIERGE_GUIDE.md'];
function readPage(f) { const s = new String(rd(f)); s.__name = f; return s; }
const title = (h) => { const m = /title="([^"]*)"/.exec(h || ''); return m ? dec(m[1]) : ''; };

module.exports = function ({ group, ok, eq, has, lacks }) {
  // ═══ A · WHAT STANDS AND WHAT KEEPS A TICK ═══
  group('⚠⚠ A · each page carries the note once, names what stands and every flag, and the code holds each one');
  {
    // The flags every page names, each as the pages word it, the reason the code gives, and a fixture that stands but for it.
    const FLAGS = [
      ['a note from either agent', /note from Agent One or Agent Two/, 'note', ESTATE(), [DRAWER({ agentNotices: [{ kind: 'other', text: 'a mark under the base' }] })]],
      ['…Agent Two\'s too', /note from Agent One or Agent Two/, 'valnote', ESTATE(), [DRAWER({ valNotices: [{ kind: 'appraiser', text: 'a signed piece' }] })]],
      ['an Agent One note still open on the first line off its photograph', /first (line|item) off its photo/, 'photonote', ESTATE(),
        [DRAWER({ stableId: 'd2', derivedFrom: 'p1', driveFileId: 'Fp1' }), DRAWER({ stableId: 'p1', driveFileId: 'Fp1', agentNotices: [{ kind: 'other', text: 'a hallmark on one spoon' }] })]],
      ['⚠ a Firearm note on a photograph line since removed (the second review)', /Firearm.{0,40}Possible NFA item.{0,30}note holds|firearm note there counts even after you remove/, 'photonote', ESTATE(),
        [DRAWER({ stableId: 'd2', derivedFrom: 'p1', driveFileId: 'Fp1' }), DRAWER({ stableId: 'p1', driveFileId: 'Fp1', deletedAt: 9, agentNotices: [{ kind: 'firearm', text: 'a rifle case on the shelf' }] })]],
      ['both agents guessing', /both/, 'guess', ESTATE(), [DRAWER({ agentConf: 'low', valConf: 'low' })]],
      ['a possible duplicate', /possible duplicate/i, 'duplicate', ESTATE(), [LAMP('d1'), LAMP('d2')]],
      ['⚠ a possible duplicate both halves of which were ticked: a tick never answers it', /never answers|does not settle/, 'duplicate', ESTATE(),
        [LAMP('d1', { reviewed: true, reviewedBy: 'Ashley Jerome', valReviewed: true }), LAMP('d2', { reviewed: true, reviewedBy: 'Ashley Jerome', valReviewed: true })]],
      ['⚠ …nor a rename or a category change on one half (the second review)', /correcting the name or the category of either half does not part it|nor does renaming one or changing its category/, 'duplicate', ESTATE(),
        [LAMP('d1', { objectName: 'Pair of brass candlesticks', valNameAt: 'Pair of brass candlesticks', namedBy: 'desk', category: 'Lighting' }), LAMP('d2')]],
      ['a firearm', /firearm/, 'firearm', ESTATE(), [NAMED('Remington pump shotgun', { category: 'Firearms' })]],
      ['an NFA flag or item', /NFA/, 'firearm', ESTATE(), [DRAWER({ flagNFA: true })]],
      ['ammunition', /ammunition/, 'firearm', ESTATE(), [NAMED('Box of 20 gauge target loads')]],
      ['…in the name Agent One first gave', /ammunition/, 'firearm', ESTATE(), [NAMED('Box of target loads', { valNameFrom: 'Box of 20 gauge target loads' })]],
      ['an appraisal: ticked for one', /appraiser/, 'appraisal', LIVING(), [DRAWER({ needsAppr: true })]],
      ['an appraisal: linked to an appraiser', /linked to (an appraiser|one)/, 'appraisal', ESTATE(), [DRAWER({ apprId: 'a1' })]],
      ['an appraisal: $3,000 or more, any category', /\$3,000/, 'appraisal', ESTATE(), [NAMED('Leather sofa', { category: 'Furniture', fmv: 3200, valLow: 2800, valHigh: 3600 })]],
      ['an appraisal: worth a specialist on living work', /specialist/, 'appraisal', LIVING(), [DRAWER({ fmv: 2000, valLow: 1500, valHigh: 3500 })]],
      ['a specific bequest', /bequest/, 'bequest', ESTATE(), [DRAWER({ flagBequest: true })]],
      ['a dispute on the line', /dispute/, 'disputed', ESTATE(), [DRAWER({ flagDisputed: true })]],
      ['a caution on its release', /caution/, 'caution', LIVING({ tc: 'Ashley Jerome' }), [DRAWER({ disposition: 'Distribute', channel: 'Ashley Jerome' })]],
      ['a value made for an earlier name', /earlier name|name changed/, 'stale', ESTATE(), [DRAWER({ objectName: 'Sterling flatware, Gorham', valNameAt: 'Stainless flatware and kitchen utensils, drawer d1' })]],
      ['⚠ a value nobody has checked (a walkthrough collection\'s figure)', /value nobody has checked/, 'unowned', ESTATE(), [DRAWER({ valuedBy: undefined, valConf: undefined, valLow: undefined, valHigh: undefined, fmv: 500 })]],
      ['every line of a disputed estate', /disputed estate/, 'dispute', ESTATE({ gateDispute: 'yes' }), [DRAWER()]],
      ['…and of a contested probate (the manual names it)', /disputed estate/, 'dispute', ESTATE({ svc: 'contested_probate' }), [DRAWER()]],
    ];
    // What the pages say stands: no value limit, the specialist categories no flag of their own, one agent alone guessing, a
    // figure typed on the desk (Q105), an appraisal's figure typed from the report or the appraisal waived, the lot cap no
    // tick, living work as estates.
    const STANDS = [
      ['the cutlery drawer', ESTATE(), [DRAWER()]],
      ['⚠ a $2,400 dining table: no value limit', ESTATE(), [NAMED('Mahogany dining table, six chairs', { category: 'Furniture', disposition: 'Sell', fmv: 2400, valLow: 2000, valHigh: 2900 })]],
      ['⚠ a painting at $300: art no flag of its own', ESTATE(), [NAMED('Oil on canvas, harbour scene', { category: 'Art & Décor', fmv: 300, valLow: 200, valHigh: 450 })]],
      ['⚠ silver at $80: silver no flag of its own', ESTATE(), [NAMED('Sterling silver serving spoons', { category: 'Silver & Precious Metal', fmv: 80, valLow: 60, valHigh: 120 })]],
      ['Agent One alone guessing', ESTATE(), [DRAWER({ agentConf: 'low' })]],
      ['Agent Two alone guessing', ESTATE(), [DRAWER({ valConf: 'low' })]],
      ['a figure typed on the desk (Q105)', ESTATE(), [DRAWER(DESKFIG)]],
      ['⚠⚠ an appraisal\'s figure typed from the report: the appraisal holds the line no longer', ESTATE(), [NAMED('Oil on canvas, signed', Object.assign({ category: 'Art & Décor' }, APPRAISED))]],
      ['⚠⚠ the appraisal waived (the second review): a $3,200 sofa stands', ESTATE(), [NAMED('Leather sofa', { category: 'Furniture', fmv: 3200, valLow: 2800, valHigh: 3600, apprWaived: true })]],
      ['⚠⚠ a lot over the Form 706 article cap: not a tick', ESTATE(), [DRAWER({ qty: 12, fmv: 2400, valLow: 1800, valHigh: 2900 })]],
      ['the range alone where counsel values', ESTATE({ docTier: 'contents' }), [DRAWER({ fmv: '' })]],
      ['living work', LIVING(), [DRAWER()]],
      // A Look at this goes quiet once every line off its photograph is reviewed (main's 2026-10-26; its own line alone, before).
      ['the photograph note\'s control: every line off the photograph ticked, the note quiet', ESTATE(), [TICKED({ stableId: 'd2', derivedFrom: 'p1', driveFileId: 'Fp1' }),
        TICKED({ stableId: 'p1', driveFileId: 'Fp1', agentNotices: [{ kind: 'other', text: 'a hallmark on one spoon' }] })]],
      ['⚠ Agent Two\'s note under a figure the desk typed', ESTATE(), [DRAWER(Object.assign({ valNotices: [{ kind: 'appraiser', text: 'a signed piece' }] }, DESKFIG))]],
      ['⚠ a line the room check linked to one since removed', ESTATE(), [DRAWER({ dupWith: ['d2'], dupWhy: 'one vase', dupConf: 'high', dupChkAt: 5 }),
        DRAWER({ stableId: 'd2', ts: 2, objectName: 'Blue vase', valNameAt: 'Blue vase', deletedAt: 9, dupWith: ['d1'] })]],
      ['the caution\'s control: given to somebody who is not Havellin\'s', LIVING({ tc: 'Ashley Jerome' }), [DRAWER({ disposition: 'Distribute', channel: 'Karen Smith' })]],
      ['the duplicate\'s control: two lamps Agent One named apart', ESTATE(), [LAMP('d1'), LAMP('d2', { objectName: 'Pair of brass candlesticks', valNameAt: 'Pair of brass candlesticks', agentName: 'Pair of brass candlesticks' })]],
      ['the duplicate answered: Not duplicates', ESTATE(), [LAMP('d1', { dupOK: true }), LAMP('d2', { dupOK: true })]],
    ];
    STANDS.forEach(([what, job, refs]) => eq(hold(job, refs), '', 'the code: stands: ' + what));
    FLAGS.forEach(([what, , why, job, refs]) => eq(hold(job, refs), why, 'the code: keeps its tick: ' + what));
    // ⚠ The merge with main's 2026-10-26 (agentNoticesOn): a removed photograph line's notes ride on the first line still listed, so
    // they hold the photograph's lines as its live line's do; and the photograph's own line ticked alone no longer quiets them.
    eq(hold(ESTATE(), [DRAWER({ stableId: 'd2', derivedFrom: 'p1', driveFileId: 'Fp1' }),
      TICKED({ stableId: 'p1', driveFileId: 'Fp1', agentNotices: [{ kind: 'other', text: 'a hallmark on one spoon' }] })]), 'photonote',
      'the code: keeps its tick: ⚠ the photograph\'s own line ticked alone, a line off it not yet looked at: the note still open');
    eq(hold(ESTATE(), [DRAWER({ stableId: 'd2', derivedFrom: 'p1', driveFileId: 'Fp1' }),
      DRAWER({ stableId: 'p1', driveFileId: 'Fp1', deletedAt: 9, agentNotices: [{ kind: 'other', text: 'a hallmark on one spoon' }] })]), 'photonote',
      'the code: keeps its tick: ⚠⚠ a removed photograph line\'s Look at this rides on and holds the lines split off it');
    eq(stands(ESTATE(), [DRAWER()]), true, 'invLineAccepted is invLineHold answering nothing');
    // And what a line needs before anything stands: a name, a destination that is one, a figure somebody owns.
    [['no destination', { disposition: '' }, 'nodest'], ['Not yet decided', { disposition: 'Undecided' }, 'nodest'], ['Hold', { disposition: 'Hold' }, 'onhold'],
     ['no figure', { fmv: '', valLow: undefined, valHigh: undefined }, 'nofigure'],
     ['⚠ Agent Two\'s range alone where the papers state values', { fmv: '' }, 'nofigure'],
     ['an appraiser\'s line with no appraisal\'s figure on it', { valuedBy: 'appraiser' }, 'nofigure']]
      .forEach(([what, o, why]) => eq(hold(ESTATE(), [DRAWER(o)]), why, 'the code: does not stand: ' + what));

    PAGES.forEach(([f, ttl]) => {
      const raw = readPage(f), t = dec(raw);
      ok(t.length > 100000, f + ': fixture: the page read (' + t.length + ' chars)');
      eq(raw.split(ttl).length - 1, 1, f + ': ⚠⚠ the note, once');
      const note = dec(noteOf(raw, ttl));
      ok(note.length > 1500, f + ': fixture: the note sliced (' + note.length + ' chars)');
      ok(note.length < 9000, f + ': fixture: and only the note (' + note.length + ' chars)');
      has(note, 'we will be obviously going back to the office', f + ': Anthony\'s words');
      ok(/\$100 line .*gone|\$100 line of 2026-10-25 is gone/.test(note), f + ': ⚠ it says what changed: the $100 line is gone');
      has(note, 'no value limit', f + ': there is no value limit');
      ok(/name, (its )?destination and (its )?value|a name, a destination .* and a figure/.test(note), f + ': what stands: a name, a destination and a value');
      ok(/(figure|value) you typed|value you type yourself/.test(note), f + ': a figure typed on the desk is the look (Q105)');
      has(note, 'appraisal\'s figure typed from the report', f + ': ⚠ and so is an appraisal\'s figure');
      ok(/the appraisal('s figure is (on the line|in)) or the appraisal is waived/.test(note), f + ': ⚠ …or its waiver (the second review)');
      FLAGS.forEach(([what, re]) => ok(re.test(note), f + ': names ' + what));
      ok(/Form 706 (article cap|estate) is not a tick/.test(note) && /Lots to split/.test(note), f + ': ⚠ the lot cap is not a tick: Lots to split asks for it');
      ok(/every (line|item) Agent One or Agent Two named or valued/.test(note), f + ': ⚠ on a disputed estate, every line the agents named or valued');
      ok(/no longer/.test(note) && /painting with its value and destination stands like a lamp/.test(note), f + ': the specialist categories are no flag of their own');
      ok(/one of them unsure is not enough|with only one of them guessing, the line stands/.test(note), f + ': one agent alone guessing stands');
      has(note, 'turn one piece of a flatware, china or glass group over', f + ': ⚠ the sterling that looks like stainless is the photography guide\'s close-up (Q103)');
      has(note, 'Photographing a House', f + ': …named');
    });
    MANUALS.forEach((f) => {
      const note = dec(noteOf(readPage(f), PAGES[0][1]));
      [['Hold', /Hold/], ['the photograph\'s first line', /first line off its photograph/], ['the room check', /room check/], ['Contested Probate', /Contested Probate/],
       ['the range alone where counsel values', /range with no figure stands only where counsel values/],
       ['⚠ a removed photograph line\'s notes riding on and holding (the merge with main\'s 2026-10-26)', /that line removed, its notes ride on the first line still listed and hold the photograph's lines the same/],
       ['notes while they count', /Agent One's until it goes quiet, Agent Two's while the value is still Agent Two's/],
       ['a line named and decided on the desk on a disputed estate', /a line you named and decided yourself is reviewed by that act there too/],
       ['what Waive records', /Waive, which records who decided and why/]]
        .forEach(([what, re]) => ok(re.test(note), f + ': the manual\'s note names ' + what));
      // The manual's ammunition words are the code's, and so are the things it says stand, in the shape the note gives them:
      // "(<words>, or a calibre or gauge named with …: <examples>; <what stands> stand; restated …)".
      const m = /ammunition in the name or in the name Agent One first gave \(([^)]*)\)/.exec(note);
      ok(!!m, f + ': fixture: the ammunition words read');
      const parts = m ? m[1].split(';') : ['', '', ''];
      const head = (parts[0] || '').split(':');
      const words = (head[0] || '').split(', or a calibre or gauge')[0].split(',').map((w) => w.trim()).filter(Boolean);
      const examples = (head[1] || '').split(',').map((w) => w.trim()).filter(Boolean);
      const standsWords = (parts[1] || '').replace(/\s*stand\s*$/, '').split(/,|\band\b/).map((w) => w.replace(/^\s*(an?|the)\s+/, '').trim()).filter(Boolean);
      ok(words.length >= 14 && examples.length === 4 && standsWords.length === 5, f + ': fixture: ' + words.length + ' words, ' + examples.length + ' examples, ' + standsWords.length + ' that stand');
      const C = rig(ESTATE(), []);
      const ammo = C.INV_ACCEPT_AMMO_RE;
      words.concat(examples).forEach((w) => ok(ammo && ammo.test(w), f + ': ⚠ the code holds "' + w + '"'));
      standsWords.forEach((w) => ok(ammo && !ammo.test(w), f + ': ⚠ and lets "' + w + '" stand'));
      ok(/restated 2026-10-26, the second review: Box of 22 LR rounds stood, and the patio chairs, the tea and the paint were held/.test(parts[2] || ''), f + ': ⚠ and says what the second review changed');
      eq(hold(ESTATE(), [NAMED('12-gauge extension cord')]), '', f + ': …a 12-gauge extension cord stands, driven');
      eq(hold(ESTATE(), [NAMED('Box of 22 LR rounds')]), 'firearm', f + ': …and a box of 22 LR rounds is held, driven');
    });
    PLAYBOOKS.forEach((f) => {
      const note = dec(noteOf(readPage(f), PAGES[2][1]));
      const C = rig(ESTATE(), []);
      ['.22', '22 LR', '12 ga shells', 'gunpowder', 'small rifle primers', 'reloading supplies'].forEach((w) => { has(note, w, f + ': the playbook names ' + w); ok(C.INV_ACCEPT_AMMO_RE.test(w), '…and the code holds it'); });
      has(note, 'a 12-gauge extension cord is not, nor are black powder-coated patio chairs or paint primers', f + ': and what is not');
      ['12-gauge extension cord', 'black powder-coated patio chairs', 'paint primers'].forEach((w) => ok(!C.INV_ACCEPT_AMMO_RE.test(w), '…which the code lets stand: ' + w));
    });
  }

  // ═══ B · THE ROW ═══
  group('B · the row\'s tooltips, every reason a line is held, what a tick does not settle, and the work bar, quoted as the code prints them');
  {
    const box = (job, refs, i) => { const C = rig(job, refs); const r = attempt(() => C._invRevBoxHtml(job.id, C._photoRefs[job.id][i || 0], C.invAcceptCtx(C.jobs[0], C._photoRefs[job.id]))); return r.ok ? r.val : 'threw: ' + r.err; };
    const stand = box(ESTATE(), [DRAWER()]), desk = box(ESTATE(), [DRAWER(DESKFIG)]), appr = box(ESTATE(), [NAMED('Oil on canvas, signed', APPRAISED)]);
    const mine = box(ESTATE(), [DRAWER({ namedBy: 'desk' })]), early = box(ESTATE(), [DRAWER({ reviewed: true, reviewedBy: 'Ashley Jerome' })]);
    const held = box(ESTATE(), [DRAWER({ agentConf: 'low', valConf: 'low' })]);
    const two = box(ESTATE(), [DRAWER({ agentConf: 'low', valConf: 'low', agentNotices: [{ kind: 'other', text: 'a mark under the base' }] })]);
    const dupBox = box(ESTATE(), [LAMP('d1'), LAMP('d2')]);
    const noname = box(ESTATE(), [DRAWER({ objectName: '', valNameAt: '' })]);
    const nonameToo = box(ESTATE(), [DRAWER({ objectName: '', valNameAt: '', agentConf: 'low', valConf: 'low' })]);
    const stuck = box(ESTATE(), [LAMP('d1', { reviewed: true, reviewedBy: 'Ashley Jerome', valReviewed: true }), LAMP('d2', { reviewed: true, reviewedBy: 'Ashley Jerome', valReviewed: true })]);
    eq(title(stand), "Nothing flagged: the agents' name and value stand as they are. Tick it to record your own look.", 'the standing line\'s tooltip');
    has(stand, ' checked', '…ticked');
    has(stand, 'accent-color:var(--gray)', '…in grey');
    lacks(stand, ' disabled', '…and pressable');
    has(stand, ",true)", '⚠ a press records a look (it never reads the grey tick as one to take off)');
    eq(title(mine), "Nothing flagged: the name and Agent Two's value stand. Tick it to record your own look.", 'where the name is the desk\'s');
    eq(title(desk), 'Reviewed: a figure recorded on the desk, nothing flagged', 'the desk figure\'s tooltip');
    eq(title(appr), "Reviewed: the appraisal's figure, nothing flagged", '⚠ …and the appraisal\'s figure typed from the report, in words of its own (the second review)');
    has(desk, ' disabled', '…ticked and fixed');
    has(desk, 'color:var(--ok-tx)', '…in green');
    eq(title(early), "Reviewed by Ashley Jerome; Agent Two's value since stands, nothing flagged. Tick it to record your look at the value.", '⚠ a tick before Agent Two\'s value landed is not a look at it');
    eq(title(held), 'Needs a look: both agents were guessing. Tick it once checked.', '⚠⚠ a held line says why');
    eq(title(two), "Needs a look: both agents were guessing; Agent One's note on it. Tick it once checked.", '⚠⚠ …every reason, not the first alone (the second review)');
    eq(title(dupBox), 'Still open: a possible duplicate: Remove one or press Not duplicates, under Possible duplicates. A tick does not settle it.', '⚠ a possible duplicate: still open, and what settles it');
    eq(title(noname), 'Still open: no name yet: name it. A tick does not settle it.', '⚠ no name: still open');
    eq(title(nonameToo), 'Still open: no name yet: name it. A tick does not settle it. Also needs a look: both agents were guessing.', '…and the rest after it');
    eq(title(stuck), 'Ticked by Ashley Jerome, but still open: a possible duplicate: Remove one or press Not duplicates, under Possible duplicates. A tick does not settle it.', '⚠⚠ a tick over an open duplicate is kept and named');
    has(stuck, ' checked', '…drawn ticked');
    has(stuck, 'accent-color:var(--bronze)', '…in bronze');
    has(stuck, 'color:var(--bronze-dk)', '…its label too');
    const bar = (() => { const C = rig(ESTATE(), []); const r = attempt(() => C._invProgressBar({ done: 3, total: 5, accepted: 2, complete: false })); return r.ok ? dec(r.val) : 'threw: ' + r.err; })();
    has(bar, '3 of 5 reviewed · 2 accepted', 'the work bar\'s count');
    // Every reason the manual lists is the code's, and every reason the code gives a line is listed.
    const WORDS = rig(ESTATE(), []).INV_HOLD_WORDS || {};
    ok(Object.keys(WORDS).length >= 17, 'fixture: the reasons read (' + Object.keys(WORDS).length + ')');
    PAGES.forEach(([f]) => {
      const t = dec(readPage(f));
      has(t, "Nothing flagged: the agents' name and value stand as they are. Tick it to record your own look.", f + ': ⚠ the tooltip, word for word');
      has(t, 'Reviewed: a figure recorded on the desk, nothing flagged', f + ': the desk figure\'s, word for word');
      has(t, "Reviewed: the appraisal's figure, nothing flagged", f + ': ⚠ the appraisal\'s, word for word');
      has(t, 'Needs a look: both agents were guessing. Tick it once checked.', f + ': ⚠ a held line\'s, word for word');
    });
    MANUALS.forEach((f) => {
      const t = dec(readPage(f)), note = dec(noteOf(readPage(f), READ_NOTES[f]));
      has(t, 'the work bar reads N of M reviewed · K accepted', f + ': the work bar, as it reads');
      has(t, "Nothing flagged: the name and Agent Two's value stand. Tick it to record your own look.", f + ': where the name is the desk\'s');
      has(t, "Agent Two's value since stands, nothing flagged. Tick it to record your look at the value.", f + ': a tick before the value');
      Object.keys(WORDS).forEach((k) => has(note, dec(WORDS[k]), f + ': ⚠ names the reason "' + k + '" in the code\'s words'));
      [two, noname, stuck].forEach((h) => has(note, title(h), f + ': ⚠ quotes the box: ' + title(h).slice(0, 50) + '…'));
      has(note, 'names every reason, not the first alone', f + ': every reason');
      has(note, 'with Also needs a look: … where something else wants a look too', f + ': …and the rest after what a tick does not settle');
      has(note, 'stays ticked, in bronze', f + ': the bronze box');
    });
    PLAYBOOKS.forEach((f) => {
      const t = dec(readPage(f));
      has(t, 'The bar at the top tracks you (N of M reviewed · K accepted)', f + ': the work bar, as it reads');
      has(t, 'it names every reason it wants you', f + ': ⚠ every reason');
      has(t, 'A box ticked in bronze is ticked but still open', f + ': ⚠ the bronze box');
      has(t, "A row's Reviewed box is ticked in bronze", f + ': …and its symptom row');
    });
  }

  // ═══ C · THE PAPERS ═══
  group('⚠⚠ C · the stamps and the schedules\' count the pages quote are the code\'s, read and not read, on the counts they quote (Q100, Q104, Q107, Q109)');
  {
    const lines = (n, pre, o) => Array.from({ length: n }, (_, i) => DRAWER(Object.assign({ stableId: pre + i }, o || {})));
    const checked = (n) => lines(n, 'c', { reviewed: true, reviewedBy: 'Ashley Jerome', valReviewed: true });
    const left = (n) => lines(n, 's');
    // `read`: 'now' records a read of the list as rigged; 'changed' records it, then changes what the papers print of a line.
    const paper = (fnName, items, opt, job, read) => {
      const C = rig(job || ESTATE(), items);
      if (read) readNow(C, read === 'anon' ? '' : undefined);
      if (read === 'changed') C._photoRefs[7][3].fmv = 55;
      const r = attempt(() => eastern(() => C[fnName](C._photoRefs[7], Object.assign({ fc: C.invAcceptCtx(C.jobs[0], C._photoRefs[7]) }, opt || {}))));
      return r.ok ? r.val : 'threw: ' + r.err;
    };
    const stamp = (items, opt, job, read) => dec(paper('_invProgressStamp', items, opt, job, read));
    const W = {
      unread: stamp(checked(42).concat(left(158))),
      done: stamp(checked(42).concat(left(158)), {}, null, 'now'),
      anon: stamp(checked(42).concat(left(158)), {}, null, 'anon'),
      changed: stamp(checked(42).concat(left(158)), {}, null, 'changed'),
      open: stamp(checked(30).concat(left(158), [DRAWER({ stableId: 'o1', disposition: 'Undecided' }), DRAWER({ stableId: 'o2', flagDisputed: true })]), {}, null, 'now'),
      all: stamp(left(12), {}, null, 'now'),
      named: stamp(checked(42).concat(left(158)), { namesOnly: true }, null, 'now'),
      list: stamp(checked(42).concat(left(158)), { noValues: true }, null, 'now'),
      none: stamp(checked(3)),
      one: stamp(checked(1)),
      some: stamp(checked(1).concat([DRAWER({ stableId: 'u1', flagDisputed: true })])),
      zero: stamp([DRAWER({ stableId: 'u1', flagDisputed: true })]),
    };
    has(W.unread, 'IN PROGRESS — 42 items checked; 158 accepted as valued; the list not yet read', '⚠⚠ every line checked or standing, the list not read: IN PROGRESS');
    has(W.unread, 'This is a working copy issued during the engagement. Every item needing a closer look has been checked; the list as a whole has not been read through.', '⚠⚠ …under its caveat, which claims only what the app witnessed (the second review)');
    lacks(W.unread, 'named and decided', '⚠ …never that every item is named and decided');
    has(W.done, 'REVIEWED — read by Anthony Graziano, October 26, 2026; 42 items checked; 158 accepted as valued', '⚠⚠ read: the stamp, in Anthony\'s words, naming the read (' + W.done.slice(0, 70) + ')');
    has(W.anon, 'REVIEWED — read October 26, 2026; 42 items checked; 158 accepted as valued', '⚠ …the day alone where no name was recorded (never "read by the desk")');
    has(W.changed, 'IN PROGRESS — 42 items checked; 158 accepted as valued; the list not yet read since it last changed', '⚠ a change after the read: back to IN PROGRESS');
    has(W.changed, 'the list as a whole has not been read through since it last changed.', '…and its caveat says so');
    has(W.open, 'IN PROGRESS — 30 of 32 items checked; 158 accepted as valued', 'in progress, read or not');
    has(W.all, 'REVIEWED — read by Anthony Graziano, October 26, 2026; 12 accepted as valued', 'all of them standing');
    lacks(W.all, 'all 12', '…never "all 12 accepted"');
    has(W.named, 'REVIEWED — read by Anthony Graziano, October 26, 2026; 42 items checked; 158 accepted as named', 'a page that prints no value (the ledger, the Contents Record)');
    has(W.list, '158 accepted as named', 'the Contents List');
    has(W.none, 'REVIEWED — all 3 items', 'nothing standing by itself: the stamp reads as it always did, with no read');
    has(W.one, 'REVIEWED — 1 item', '…one item');
    has(W.some, 'IN PROGRESS — 1 of 2 items reviewed', 'nothing standing and the review incomplete: N of M items reviewed');
    has(W.zero, 'IN PROGRESS — 0 of 1 item reviewed', '…a list of one in the singular (the second review)');
    // The schedules' count (Q104), bronze until read (Q109).
    const pill = (items, read) => paper('_avUnreviewedStamp', items, {}, null, read);
    const P = {
      sched: pill(left(158).concat([DRAWER({ stableId: 'x1', flagDisputed: true }), DRAWER({ stableId: 'x2', agentNotices: [{ kind: 'other', text: 'a mark' }] })])),
      schedRead: pill(left(158), 'now'),
      schedChanged: pill(left(158), 'changed'),
      schedOne: pill(left(1)),
      schedOpen: pill(left(3).concat([DRAWER({ stableId: 'u1', disposition: 'Undecided' })])),
    };
    has(dec(P.sched), '2 values not yet reviewed', '⚠ the schedules count only the values on lines that do not stand…');
    has(dec(P.sched), '158 values as Agent Two left them; list not yet read by Havellin', '⚠⚠ …and how many stand, in bronze words until the list is read (Q109)');
    has(P.sched, 'background:#8a6d3b;border-radius:3px;padding:1px 8px;margin:0 0 12px 6px;">158 values', '⚠⚠ …in bronze');
    has(dec(P.schedRead), '158 accepted as valued · list read by Anthony Graziano, October 26, 2026', 'the schedules\' count, read');
    has(P.schedRead, 'background:#6b6b6b;border-radius:3px;padding:1px 8px;margin:0 0 12px 6px;">158 accepted', '…in grey');
    has(dec(P.schedChanged), '158 values as Agent Two left them; list not yet read by Havellin since it last changed', '…and changed since: bronze again');
    has(dec(P.schedOne), '1 value as Agent Two left it; list not yet read by Havellin', '…one in the singular');
    has(dec(P.schedOpen), '1 value not yet reviewed', '⚠ …a value on a line not yet decided counts as not yet reviewed');
    // ⚠ FINAL EITHER WAY (Q109): the read decides the pill and never the schedules' status.
    ['printCourtInventory', 'printTrustSchedule'].forEach((p) => { const b = live(fn(p)); lacks(b, 'invListRead', p + ': the read never decides its status'); has(b, '_avUnreviewedStamp(onSched, { fc: invAcceptCtx(job) })', p + ': …it prints the pill beside the status'); });
    // The one source of those words.
    const C = rig(ESTATE(), []);
    eq([C._invAcceptedStampWords({ accepted: 158 }, false), C._invAcceptedStampWords({ accepted: 158 }, true), C._invAcceptedStampWords({ accepted: 0 }, false)],
      ['158 accepted as valued', '158 accepted as named', ''], 'the stamp\'s words, valued and named, and none where nothing stands');
    // The printers hand in what the pages say: the three pages that print no value ask for names, the Estate Inventory PDF names
    // them once, and every printer hands in the job's facts (and so the read).
    has(live(fn('printContentsList')), '_invProgressStamp(rec.items, { noValues: true, fc: invAcceptCtx(job) })', 'the Contents List asks without values');
    has(live(fn('printDispositionLedger')), '_invProgressStamp(L.items, { namesOnly: true, fc: invAcceptCtx(job) })', 'the Disposition Ledger asks for names');
    has(live(fn('printContentsRecord')), '_invProgressStamp(rec.items, { namesOnly: true, fc: invAcceptCtx(job) })', 'the Contents Record asks for names');
    has(live(fn('printEstateInventoryReport')), '_avUnreviewedStamp(all, { noAccepted: true, fc: _ac })', 'the Estate Inventory PDF prints no second count');

    PAGES.forEach(([f]) => {
      const t = dec(readPage(f));
      has(t, 'REVIEWED — read by Anthony Graziano, October 26, 2026; 42 items checked; 158 accepted as valued', f + ': ⚠⚠ the stamp, as the code prints it');
      has(t, 'IN PROGRESS — 30 of 32 items checked; 158 accepted as valued', f + ': the stamp in progress');
      has(t, 'IN PROGRESS — 42 items checked; 158 accepted as valued; the list not yet read', f + ': ⚠ …and before the read');
      has(t, 'the list not yet read since it last changed', f + ': …and after a change');
      has(t, '158 accepted as named', f + ': the pages that print no value');
      has(t.toLowerCase(), 'the contents list, the disposition ledger and the contents record', f + ': …named, all three');
      has(t, '158 values as Agent Two left them; list not yet read by Havellin', f + ': ⚠⚠ the schedules\' bronze count, in the code\'s words (Q109)');
      has(t, '158 accepted as valued · list read by Anthony Graziano, October 26, 2026', f + ': …and the grey one, read');
      ok(/Court Inventory and the Trust Schedule stay FINAL either way/.test(t), f + ': ⚠ …the schedules FINAL either way');
      ok(/Bronze until read/.test(t), f + ': …in Anthony\'s words');
      has(t, 'N values not yet reviewed', f + ': …beside N values not yet reviewed');
      ok(/values on (lines|items) (that do not stand \(flagged, or not yet decided\)|still flagged or not yet decided)/.test(t), f + ': ⚠ …which counts the values on lines that do not stand');
      lacks(t, 'REVIEWED — 42 items checked', f + ': ⚠ never REVIEWED without the read');
      lacks(t, 'REVIEWED — all 12 accepted as valued', f + ': …nor "all 12"');
    });
    MANUALS.forEach((f) => {
      const t = dec(readPage(f));
      has(t, 'REVIEWED — read by Anthony Graziano, October 26, 2026; 12 accepted as valued', f + ': all standing, read');
      has(t, 'This is a working copy issued during the engagement. Every item needing a closer look has been checked; the list as a whole has not been read through.', f + ': ⚠ the caveat, word for word');
      has(t, '1 value as Agent Two left it', f + ': …one in the singular');
      has(t, 'REVIEWED — all 3 items', f + ': nothing standing: as it always did');
      has(t, "the Estate Inventory PDF's own stamp names them, so it prints no second count", f + ': the report prints no second count');
      has(t, 'REVIEWED — read by Anthony Graziano, October 26, 2026; 42 items checked; 158 accepted as named', f + ': the Contents Record\'s stamp, in its own words');
      has(t, "A line whose value a person ticked or typed counts as checked and never as accepted; a tick given before Agent Two's value landed is not a look at that value", f + ': ⚠ what counts as checked');
      has(t, 'bronze until the list is read and grey once it is (Q104, Q109', f + ': ⚠ the Q106 note\'s count, restated');
      has(t, 'bronze until the list is read and grey, naming the read, once it is (Q109)', f + ': ⚠ the Court Inventory\'s entry, restated');
    });
    PLAYBOOKS.forEach((f) => {
      const t = dec(readPage(f));
      has(t, 'REVIEWED — read by Anthony Graziano, October 26, 2026; 42 items checked; 158 accepted as named', f + ': the Contents Record\'s stamp');
      has(t, 'how many stand as Agent Two left them: in bronze until you have read the list, then in grey, 158 accepted as valued', f + ': ⚠ the Q106 note\'s count, restated');
    });
  }

  // ═══ D · THE REST OF THE PAGES ═══
  group('D · the sentences elsewhere are restated, nothing of the $100 line or either review\'s errors is left, the work bar\'s sentence is the real bar\'s, and the spec says it');
  {
    const GONE = ['Under $100, no tick', 'Under $100 and nothing flagged', 'under $100 accepted as valued', 'everyday items accepted as named',
      'under $100 with nothing flagged', 'is under $100 with nothing flagged', '$120 and want your tick', 'topping out at $40', 'Always left for your tick',
      'Always left for a person', 'counts as the review', 'Nothing Agent One names is marked reviewed', 'Until every line is ticked the document prints',
      'wants the tick, unless that value is under $100', 'is ticked and greyed',
      // Round one's sentences the reviewers found untrue (2026-10-26).
      "an appraiser's figure keeps its tick", 'a lot over the Form 706 article cap; a value made', 'a group over $100 an article on a Form 706 estate; and',
      'On a disputed estate every item wants it.', 'and every line of a disputed estate', 'Reviewed: a figure typed on the desk',
      'or ticking the row reviewed, settles it on its own', 'Correcting either name or ticking the row reviewed does the same thing',
      'or once the line stands by itself', 'and so does choosing the destination once the item has its value',
      'A line a person ticked, or whose figure a person typed, counts as checked', 'linked by the room check', 'Finish the review and it prints REVIEWED.',
      // The second review's (2026-10-26).
      'until every line is named, valued and decided and every flagged line ticked', 'until every item is named, valued and decided and every flagged one ticked',
      "under the work bar's sentence", 'on the work bar, under its sentence', 'Change anything after (a name, a value, a destination, a tick',
      'a name, a value, a count, a destination, a tick, a removal', 'Every item is named and decided; the list has not been read through',
      '· list not yet read since it changed', 'add it to the grey count', 'print a grey 158 accepted as valued', 'a grey N accepted as valued sits beside it',
      'with a grey count of those accepted as valued', 'The moment you edit the name or the category the hint clears', 'Edit the name or the category and the hint clears',
      "so does typing the name where Agent One was guessing", 'Correcting either name settles a same-name pair on its own',
      'Correcting either name does the same thing', "an agent's note on it", 'answer it under Possible duplicates', 'a note on the first item off its photograph',
      'Every client document carries the IN PROGRESS stamp until every line is named', 'Change anything after and press it again',
      'centerfire, primers, reloading supplies', 'gunpowder, primers, reloading supplies', '(the list not yet read since it changed)'];
    PAGES.forEach(([f]) => {
      const t = dec(readPage(f));
      GONE.forEach((w) => lacks(t, w, f + ': ⚠ gone: "' + w + '"'));
      has(t, 'tick covers the name, the count and', f + ': the one look stays');
    });
    MANUALS.forEach((f) => {
      const t = dec(readPage(f));
      has(t, 'Every row comes back unchecked, and once it is decided only a flagged one waits for a tick (restated 2026-10-26)', f + ': the Agent One note, restated');
      has(t, "until every line stands with nothing flagged or has had a person's look (a tick, or a name you typed with a destination chosen; a tick settles neither a line with no name nor an open possible duplicate), and, where a line stands as the agents left it, until the list is read since its last change", f + ': ⚠ the stamp\'s rule, restated (the second review)');
      has(t, "Edit the name or the category and the row is yours, and Agent One's guess with it; a value Agent Two made with low confidence keeps the hint until your tick, a figure you type, or Agent Two valuing the line again with confidence (restated 2026-10-26: this said any edit of the name or the category cleared the hint)", f + ': ⚠ the hint, restated');
      has(t, 'A name you typed with a destination chosen still counts as reviewed by itself, and stays so once Agent Two has valued it, with nothing flagged', f + ': a name you typed, restated');
      has(t, "the Court Inventory and the Trust Schedule leave out of that count the values on lines that stand with nothing flagged, so it counts Agent Two's values on lines that do not stand (flagged, or not yet decided)", f + ': the schedules\' count, restated');
      has(t, 'a line one agent alone was guessing on stands once it is decided, and keeps its unsure until a person looks', f + ': the unsure hint, restated (Q108)');
      has(t, "gone with the tick, with a figure you type (since 2026-10-26, Q105), or, for Agent One's guess, with a name you type", f + ': ⚠ …and a figure typed takes it');
      has(t, 'Since 2026-10-26 the tick is wanted only where the app flags something', f + ': the desk\'s Reviewed, restated');
      has(t, "the papers also wait for ✓ I've read the list on the work bar after the last change", f + ': …with the read');
      has(t, 'Since 2026-10-26 neither correcting either name nor ticking the row reviewed settles a same-name pair (until then each did, and left the other half standing as the agents left it): the pair is compared under the name Agent One gave', f + ': ⚠ the duplicates note, restated (the second review)');
      has(t, 'off different photographs (since 2026-10-26 the name Agent One gave, whatever either line is called now)', f + ': …and the block\'s description');
      has(t, 'only those on lines that do not stand, flagged or not yet decided', f + ': the Court Inventory\'s entry, restated');
      has(t, "or (since 2026-10-26) while a line stands as the agents left it and the list is not read since its last change, asks first, naming the gaps (the list not yet read, or … since it last changed)", f + ': ⚠ the package\'s question, in the package\'s table');
    });
    PLAYBOOKS.forEach((f) => {
      const t = dec(readPage(f));
      has(t, "A row's Reviewed box is ticked in grey, and nobody ticked it", f + ': the symptom row');
      has(t, 'Read each line against what you saw in the house and fix what is wrong. Tick Reviewed on a line the app flags as you finish it', f + ': the desk step, restated');
      has(t, "When you have read the whole list, press ✓ I've read the list on the work bar (new 2026-10-26)", f + ': ⚠ the read, a step of its own');
      has(t, 'It records who read it and when, for the list as it stood', f + ': ⚠ …vouching for the list as it stood');
      has(t, 'Change what the papers print after (a name, a count, a value, where it goes, who takes it, the condition or the room, or remove an item), on any device, and press it again; a tick changes nothing. While the list is still loading from the sheet, or the sheet is unreachable, the press waits.', f + ': ⚠ …what unreads it, and the press waiting');
      has(t, 'a value Agent Two gave after you named it included; the tick is for a line the app flags', f + ': a name you typed, restated');
      has(t, 'Since 2026-10-26 it shows on an item with nothing flagged too, whose box is ticked in grey', f + ': ⚠ the unsure row, restated (Q108)');
      has(t, 'your Reviewed tick clears it, and so does a value you type, or correcting the name or category where Agent One was guessing', f + ': ⚠ …with what clears it');
      has(t, "until every item stands with nothing flagged or has had your look (a tick, or a name you typed with a destination chosen; a tick does not settle an item with no name or an open possible duplicate), and, where an item stands as the agents left it, until you press I've read the list after your last change to what the papers print", f + ': ⚠ the stamp\'s rule, restated');
      has(t, "Correct the name or the category and Agent One's guess is settled; a value Agent Two was unsure of keeps the hint until your tick, a value you type, or Agent Two valuing it again with confidence (restated 2026-10-26: this said any edit cleared it)", f + ': ⚠ the hint, restated');
      has(t, 'Since 2026-10-26 neither correcting either name nor ticking the row reviewed settles a same-name pair (until then each did)', f + ': ⚠ the duplicates note, restated');
      has(t, 'Correcting either name, or ticking the row reviewed, does not (since 2026-10-26; a corrected name did until then).', f + ': ⚠ the nightstands, restated');
      has(t, "Finish the review, then press ✓ I've read the list on the work bar, and it prints REVIEWED with who read it and when", f + ': the IN PROGRESS symptom, restated');
      has(t, 'change what the papers print after, on any device, and it goes back to IN PROGRESS', f + ': …and what sends it back');
      has(t, 'a line with no name, or one of an open possible duplicate, wants naming, or Remove or Not duplicates, since a tick does not settle it', f + ': ⚠ …and what a tick does not settle');
      has(t, 'or (since 2026-10-26) an item stands as the agents left it and the list is not read since its last change, asks first, naming the gaps', f + ': ⚠ the package\'s question');
    });
    // ⚠⚠ THE WORK BAR'S SENTENCE IS THE REAL BAR'S, in each of its states (the second review: the bar dropped it in the one state
    // where the read alone was owed, and said "ticked").
    const sentence = (job, refs) => {
      const C = workbar(job, refs);
      const r = attempt(() => { const h = dec(C._renderInvWorkbar(C.jobs[0], refs)); const m = /Client documents print[^—]*— they are never withheld\./.exec(h); return m ? m[0] : ''; });
      return r.ok ? r.val : 'threw: ' + r.err;
    };
    const both = 'Client documents print with an IN PROGRESS stamp until every flagged item is checked and the list is read since its last change — they are never withheld.';
    const readOnly = 'Client documents print with an IN PROGRESS stamp until the list is read since its last change — they are never withheld.';
    const flagsOnly = 'Client documents print with an IN PROGRESS stamp until every flagged item is checked — they are never withheld.';
    eq(sentence(ESTATE(), [DRAWER(), DRAWER({ stableId: 'd2', flagDisputed: true })]), both, '⚠ a flagged line waits and a line stands unread: both clauses');
    eq(sentence(ESTATE(), [DRAWER(), DRAWER({ stableId: 'd2' })]), readOnly, '⚠⚠ every flagged item checked, the read owed: the sentence is still drawn, naming the read alone');
    eq(sentence(ESTATE(), [TICKED(), DRAWER({ stableId: 'd2', flagDisputed: true })]), flagsOnly, '…nothing standing: the flags alone');
    eq(sentence(ESTATE(), [TICKED(), TICKED({ stableId: 'd2' })]), '', '…every line checked: no sentence');
    const readJob = (() => { const C = rig(ESTATE(), [DRAWER(), DRAWER({ stableId: 'd2' })]); readNow(C); return C.jobs[0]; })();
    eq(sentence(readJob, [DRAWER(), DRAWER({ stableId: 'd2' })]), '', '…and read since its last change: no sentence');
    MANUALS.forEach((f) => {
      const t = dec(readPage(f));
      has(t, both, f + ': ⚠ …and the manual quotes it');
      has(t, readOnly, f + ': …in both forms');
      has(t, 'drawn while the papers print IN PROGRESS, the read alone included', f + ': …and when it is drawn');
    });
    // The spec, read with its line breaks undone.
    const spec = rd('AGENT_TWO_SPEC.md').replace(/\n\s+/g, ' ');
    has(spec, '**Only flagged lines take a tick (2026-10-26, Q106; it replaced the $100 line of 2026-10-25, Q99', 'AGENT_TWO_SPEC §13 carries the rule');
    lacks(spec, '**Under $100, no tick (2026-10-25', '…in place of the $100 entry');
    has(spec, '`invLineAccepted(ref, fc)`', '…by its predicate');
    has(spec, 'A lot over the Form 706 article cap is not a hold', '⚠ …the lot cap no hold');
    lacks(spec, '`_arDupEligible` or an open duplicate group', '⚠ …a room-check link alone no hold');
    has(spec, '**The list read, the hint on any guess, and the reason a line is held (2026-10-26, Q107 and Q108', '…and the round two entry');
    has(spec, 'restated the same day after the second review, with Q109', '…restated for round three');
    ['`invMarkListRead(jobId)`', '`invListSeen(jobId)`', '`invListRead(job)`', '`invListReadRefusal(jobId)`', '`_avAcceptedPill(f, fc, pill)`',
     '`_invLineHolds(ref, fc, every, only)`', '`invLineHold(ref, fc)`', '`INV_HOLD_WORDS`', '`INV_OPEN_HOLDS`', '`invLineOpen(ref, fc)`', '`INV_READ_FIELDS`',
     '`agentNoticesOn`', '`agentName`', '`apprWaived`', '`probatePackageGaps`']
      .forEach((w) => has(spec, w, '…naming ' + w));
    // ⚠ The merge with main's 2026-10-26: a removed photograph line's notes, all of them, ride on and hold the photograph's lines
    // (under the second review only a Firearm or NFA note did, agentNoticeLoud, which is gone).
    lacks(spec, 'off a removed line only a Firearm or NFA note holds', '⚠ …no longer that only a Firearm or NFA note outlives its line');
    lacks(spec, '`agentNoticeLoud`', '…nor the helper that said it');
    has(spec, 'a removed photograph line\'s notes, all of them, ride on the first line still listed off it, `agentNoticesOn`', '⚠⚠ …every note rides on the first line still listed');
    has(spec, 'any note on it not yet quiet holds every line off the photograph until each is reviewed', '⚠ …and holds the photograph\'s lines until each is reviewed');
    has(spec, 'a filter on the row\'s hint, never a tick or a review of its own', '…and the Unsure chip is a filter, never a tick');
    has(spec, 'The read is a fingerprint, never a time', '⚠ …and what the read is');
    has(spec, '`_avReadWords` is gone', '…and what went');
    lacks(live(SRC), 'INV_REVIEW_FLOOR', 'and the code carries no $100 line for a page to describe');
  }

  // ═══ E · THE LIST READ (Q107) ═══
  group('⚠⚠ E · the list read: the press, the fingerprint it records, what changes it and what never does, the sheet, and the pages');
  {
    const job = ESTATE({ tc: 'Ashley Jerome' });
    const items = () => [DRAWER(), DRAWER({ stableId: 'd2', ts: 2, objectName: 'Brass table lamp', valNameAt: 'Brass table lamp' })];
    const ST = { total: 2, accepted: 2, complete: true };
    const line = (C, st) => { const r = attempt(() => eastern(() => dec(C._invListReadHtml(C.jobs[0], st || ST)))); return r.ok ? r.val : 'threw: ' + r.err; };
    const current = (C) => { const r = attempt(() => C.invListRead(C.jobs[0]).current); return r.ok ? r.val : 'threw: ' + r.err; };
    // Not read.
    const C0 = rig(job, items());
    eq(line(C0), "List not read yet · ✓ I've read the list", 'not read: the line and the press');
    // The press records who, when and what the list said, as a person's edit: the device's user, else the job's concierge.
    C0.localStorage.setItem('hav_device_user', 'Anthony Graziano');
    const p = attempt(() => C0.invMarkListRead(7));
    ok(p.ok, 'the press runs (' + (p.err || 'ok') + ')');
    const rec = C0.jobs[0].invRead || {};
    eq([rec.by, typeof rec.at, (C0.__saves || []).length, (C0.__saves || [])[0] === C0.jobs[0]], ['Anthony Graziano', 'number', 1, true],
      '⚠⚠ who (the device\'s user) and when, on the job, saved as a person\'s edit');
    eq(rec.seen, attempt(() => C0.invListSeen(7)).val, '⚠⚠ …and the list as it stood: its fingerprint');
    ok(/^2:[0-9a-f]+$/.test(String(rec.seen)), '…a count and a hash, a few characters, never the list (' + rec.seen + ')');
    const C1 = rig(job, items());
    attempt(() => C1.invMarkListRead(7));
    eq((C1.jobs[0].invRead || {}).by, 'Ashley Jerome', '…else the job\'s concierge');
    eq(current(C0), true, 'read just now: current');
    // Read, with a fixed day.
    const C2 = readNow(rig(ESTATE(), items()));
    eq(line(C2), '✓ List read by Anthony Graziano, October 26, 2026', '⚠ read: green, naming who and when, with no press');
    ok(/color:var\(--ok-tx\)/.test(C2._invListReadHtml(C2.jobs[0], ST)), '…in green');
    eq(attempt(() => eastern(() => C2.invListReadWords(C2.invListRead(C2.jobs[0])))).val, 'read by Anthony Graziano, October 26, 2026', 'the words a paper prints');
    eq(attempt(() => eastern(() => C2.invListReadWords({ at: AT, by: '' }))).val, 'read October 26, 2026', '⚠ …the day alone where no name was recorded (never "read by the desk")');
    // ⚠⚠ WHAT CHANGES IT: each field the papers print, on any line, removed lines included; and nothing else.
    const after = (mutate, label, want) => {
      const C = readNow(rig(ESTATE(), items()));
      const r = attempt(() => { mutate(C._photoRefs[7], C); return C.invListRead(C.jobs[0]).current; });
      eq(r.ok ? r.val : 'threw: ' + r.err, want, label);
      return C;
    };
    const CH = after((L) => { L[1].objectName = 'Brass candlestick'; }, '⚠⚠ a name changed: changed since', false);
    eq(line(CH), "List read by Anthony Graziano, October 26, 2026 · changed since · ✓ I've read the list", '…and the line says so, with the press again');
    after((L) => { L[1].category = 'Lighting'; }, 'a category', false);
    after((L) => { L[1].qty = 2; }, 'a count', false);
    after((L) => { L[1].fmv = 55; }, 'a value', false);
    after((L) => { L[1].valHigh = 90; }, '…its range', false);
    after((L) => { L[1].valSource = 'Auction comps'; }, '…its source', false);
    after((L) => { L[1].disposition = 'Sell'; }, 'a destination', false);
    after((L) => { L[1].channel = 'Goodwill'; }, 'who takes it', false);
    after((L) => { L[1].condition = 'Fair'; }, 'the condition', false);
    after((L) => { L[1].roomIdx = 2; }, 'the room', false);
    after((L) => { L[1].deletedAt = AT + 1; }, '⚠ a removal', false);
    after((L) => { L.push(DRAWER({ stableId: 'd3' })); }, 'a line added', false);
    after((L) => { L[0].reviewed = true; L[0].reviewedBy = 'Ashley Jerome'; L[0].valReviewed = true; L[0].updatedAt = AT + 60000; }, '⚠⚠ a tick: still current (the second review: it unread the list)', true);
    after((L) => { L[0].dupChkAt = AT + 60000; L[0].updatedAt = AT + 60000; }, '⚠⚠ a room check that found nothing: still current', true);
    after((L) => { L[0].authBy = 'Tripp Butler'; L[0].approvalDate = '2026-10-27'; L[0].custody = [{ id: 'e1', action: 'Released' }]; L[0].itemNo = 14; L[0].agentNotices = [{ kind: 'other', text: 'x' }]; },
      '…an approval, a custody event, an item number, a note: still current', true);
    after((L) => { L.push({ stableId: 'zz', label: 'before', roomIdx: 1, ts: 9 }); L.push(DRAWER({ stableId: 'col', collId: 'c1' })); }, '…an as-found shot or a photograph filed to a collection: still current', true);
    // A merge from another device, whatever the clocks: the sheet's copy of a line changed before the press, landing after it.
    after((L) => { L[1] = Object.assign({}, L[1], { disposition: 'Junk', updatedAt: AT - 3600000 }); }, '⚠⚠ a merge from another device carrying an older clock: changed since', false);
    // A restore gives the list back as it was read.
    const CR = readNow(rig(ESTATE(), items()));
    CR._photoRefs[7][1].deletedAt = AT + 1; const was = current(CR); delete CR._photoRefs[7][1].deletedAt;
    eq([was, current(CR)], [false, true], '⚠ a removal unreads it, and the restore gives the read back: it vouches for the list, not a time');
    // A device's clock running fast or slow changes nothing: the time is recorded, never compared.
    const CK = readNow(rig(ESTATE(), items()));
    CK.jobs[0].invRead.at = AT + 1e10; const fast = current(CK); CK.jobs[0].invRead.at = 1; const slow = current(CK);
    eq([fast, slow], [true, true], '⚠ a clock running fast or slow: still current');
    const CT = rig(ESTATE({ invRead: { at: AT, by: 'Anthony Graziano' } }), items());
    eq(current(CT), false, '…and a time with no fingerprint vouches for nothing');
    eq(attempt(() => C0.INV_READ_FIELDS.join(',')).val, 'objectName,category,qty,fmv,valLow,valHigh,valSource,disposition,channel,condition,roomIdx,valNote,valDate,apprId,apprDoc,assetTrack,flagExempt,serial', 'the fields it reads: what the papers print of a line');
    // ⚠⚠ THE PRESS WAITS FOR THE SHEET.
    const URL = 'https://sync.example.test/exec';
    const CL = rig(ESTATE(), items(), { url: URL, seen: {} });
    eq(line(CL), 'List not read yet · the list is still loading from the sheet: the press waits for it', '⚠⚠ loading: the line says so in place of the button');
    attempt(() => CL.invMarkListRead(7));
    eq([CL.jobs[0].invRead, (CL.__saves || []).length, CL.__alerts], [undefined, 0, ['Not recorded: the list is still loading from the sheet. Press it once the list has been read from the sheet.']],
      '⚠⚠ …and a press reached anyway records nothing, and says so');
    const CF = rig(ESTATE(), items(), { url: URL, seen: { 7: true }, failed: { 7: true } });
    eq(line(CF), "List not read yet · the sheet is unreachable: this is this device's copy: the press waits for it", '⚠ unreachable: the same');
    attempt(() => CF.invMarkListRead(7));
    eq(CF.jobs[0].invRead, undefined, '…recording nothing');
    const CS = rig(ESTATE(), items(), { url: URL, seen: { 7: true } });
    eq(line(CS), "List not read yet · ✓ I've read the list", '…and once the sheet is read, the press');
    // The host is always drawn, carrying what it drew; its content only while a line stands as the agents left it.
    const empty = attempt(() => C2._invListReadHtml(C2.jobs[0], { total: 2, accepted: 0, complete: true })).val || '';
    ok(/^<div id="inv-read-7" data-rk="[a-z]*"[^>]*><\/div>$/.test(empty), '⚠ a list a person checked line by line: the host, empty (' + empty.slice(0, 80) + ')');
    has(live(fn('_invEdit')), '_invReadLineRepaint(', '_invEdit redraws the work bar when what the line drew moved');
    has(live(fn('_invRefreshFromCloud')), '_invReadLineRepaint(', '…and so does a sheet read that changed nothing');
    has(live(fn('_renderInvWorkbar')), '_invListReadHtml(job, st)', 'the line is on the work bar');
    // ⚠ THE PACKAGE ASKS (the second review): its question names an unread list.
    const gaps = (C) => { const r = attempt(() => C.probatePackageGaps(7)); return r.ok ? r.val : 'threw: ' + r.err; };
    const PK = rig(ESTATE({ status: 'active' }), items());
    eq(gaps(PK), ['the list not yet read'], '⚠⚠ the package names the list not yet read');
    readNow(PK); eq(gaps(PK), [], '…read: nothing');
    PK._photoRefs[7][0].fmv = 41; eq(gaps(PK), ['the list not yet read since it last changed'], '…changed since: says so');
    eq(gaps(rig(ESTATE({ status: 'active' }), [TICKED(), TICKED({ stableId: 'd2' })])), [], '…a list a person checked line by line: no read asked');
    // The pages say it.
    [...MANUALS, ...PLAYBOOKS].forEach((f) => {
      const t = dec(readPage(f)), note = dec(noteOf(readPage(f), READ_NOTES[f]));
      ok(note.length > 800, f + ': ⚠⚠ the read note (' + note.length + ' chars)');
      eq(readPage(f).split(READ_NOTES[f]).length - 1, 1, f + ': …once');
      has(note, "✓ I've read the list", f + ': the press, by its label');
      has(note, '✓ List read by Anthony Graziano, October 26, 2026', f + ': the line once read, word for word');
      has(note, 'List read by Anthony Graziano, October 26, 2026 · changed since', f + ': …and changed since');
      has(note, 'for the list as it stood', f + ': ⚠⚠ what the read vouches for');
      ok(/a value Agent Two (writes|adds) by itself/.test(note), f + ': ⚠ what counts as a change, Agent Two\'s own runs included');
      ok(/on this device or (another|any other)/.test(note), f + ': ⚠ …made on any device');
      ok(/a removal or a restore|a line removed or restored/.test(note), f + ': …a removal or a restore');
      ok(/A tick( does not undo the read|, a room check)/.test(note), f + ': ⚠⚠ …and a tick never unreads it');
      ok(/[Pp]ress it last/.test(note), f + ': press it last');
      ok(/needs? no read|need no read/.test(note), f + ': a list every line of which a person checked needs none');
      has(note, 'the list is still loading from the sheet: the press waits for it', f + ': ⚠⚠ the press waits for the sheet, in the line\'s words');
      has(note, "the sheet is unreachable: this is this device's copy: the press waits for it", f + ': …both');
      has(note, 'read October 26, 2026', f + ': ⚠ …the day alone where nobody was recorded');
      ok(/the list not yet read/.test(note) && /package/.test(note), f + ': ⚠ the package asks');
      has(t, 'IN PROGRESS', f + ': fixture');
    });
    MANUALS.forEach((f) => {
      const note = dec(noteOf(readPage(f), READ_NOTES[f]));
      has(note, 'List not read yet', f + ': the line before any read');
      ['job.invRead', 'invMarkListRead', 'invListRead', 'invListSeen', 'invListReadRefusal'].forEach((w) => has(note, w, f + ': names ' + w));
      has(note, "the device's user, as Settings records it, else the job's concierge", f + ': who');
      has(note, 'Not recorded: the list is still loading from the sheet. Press it once the list has been read from the sheet.', f + ': ⚠ the refusal, word for word');
      // ⚠ Every field the press reads is named, in the order the code reads them, and nothing it does not read.
      has(note, "the name, category, count, value and range, the value's source, the destination, who takes it, the condition, the room, the basis sentence, the valuation date, the appraiser, the asset track, the §732.402 exempt mark, a firearm's serial, and whether the line was removed", f + ': ⚠⚠ what the papers print of a line, as INV_READ_FIELDS reads it');
      has(note, 'the agents are still at work on this list', f + ': ⚠ the press waits while an agent is at work (the merge\'s review)');
      has(note, 'Not recorded: the list changed while it was on screen. It has been redrawn: read what changed, then press again.', f + ': ⚠ …and over a redraw owed, word for word');
      has(note, "A tick, a room check, a sign-out, an approval, an item number or an agent's note changes nothing", f + ': ⚠ …and what it never reads');
      has(note, 'never a time', f + ': …a fingerprint, never a time');
    });
    PLAYBOOKS.forEach((f) => {
      const note = dec(noteOf(readPage(f), READ_NOTES[f]));
      has(note, '(a name, a count, a value, where it goes, who takes it, the condition or the room, a removal or a restore, or a value Agent Two adds by itself), on this device or any other', f + ': ⚠ what unreads it');
    });
  }

  // ═══ F · THE HINT ON ANY GUESS (Q108) ═══
  group('F · the hint shows wherever either agent was guessing, on a line that stands too, until a person looks (Q108), and a person\'s figure is a look');
  {
    // The hint takes the job as the row hands it in, and reads no context: a line that stands still shows it. (Restated in the
    // merge's review: it handed the context in where main's signature takes the job, and passed by not reading it.)
    const unsure = (job, refs) => { const C = rig(job, refs); const r = attempt(() => { const fc = C.invAcceptCtx(C.jobs[0], C._photoRefs[7]);
      return [C.invLineAccepted(C._photoRefs[7][0], fc), C.invLineUnsure(C._photoRefs[7][0], C.jobs[0])]; }); return r.ok ? r.val : r.err; };
    eq(unsure(ESTATE(), [DRAWER({ valConf: 'low' })]), [true, true], '⚠⚠ Agent Two guessing alone: the line stands and shows unsure');
    eq(unsure(ESTATE(), [DRAWER({ agentConf: 'low' })]), [true, false], '…Agent One\'s guess Agent Two has valued under that name: settled');
    eq(unsure(ESTATE(), [DRAWER({ agentConf: 'low', valNameAt: 'an earlier name' })]), [false, true], '…Agent One\'s guess not yet valued under its name: unsure');
    eq(unsure(ESTATE(), [DRAWER({ agentConf: 'low', valConf: 'low' })]), [false, true], 'both guessing: held, and unsure');
    eq(unsure(ESTATE(), [TICKED({ valConf: 'low' })]), [true, false], '⚠ the tick takes it');
    eq(unsure(ESTATE(), [DRAWER(Object.assign({ agentConf: 'low' }, DESKFIG))]), [true, false], '⚠⚠ a figure the desk typed takes Agent One\'s guess (Q105; the second review: it asked for a tick over a box fixed ticked)');
    eq(unsure(ESTATE(), [DRAWER(Object.assign({ valConf: 'low' }, DESKFIG))]), [true, false], '⚠ …and stands in for Agent Two\'s');
    eq(unsure(ESTATE(), [NAMED('Oil on canvas, signed', Object.assign({ category: 'Art & Décor', agentConf: 'low' }, APPRAISED))]), [true, false], '…as does the appraisal\'s figure');
    eq(unsure(ESTATE(), [DRAWER({ agentConf: 'low', valNameAt: 'an earlier name' })])[1], true, 'Agent One\'s guess…');
    eq(unsure(ESTATE(), [DRAWER({ agentConf: undefined, namedBy: 'desk', valNameAt: 'an earlier name' })])[1], false, '⚠ …settled by a name or a category corrected (the desk\'s)');
    eq(unsure(ESTATE(), [DRAWER({ agentConf: undefined, valConf: 'low', namedBy: 'desk', category: 'Kitchen' })])[1], true, '⚠⚠ …never Agent Two\'s: its low value keeps the hint after the name or the category is corrected');
    eq(unsure(ESTATE(), [DRAWER({ agentConf: undefined, namedBy: 'desk', objectName: 'Henckels kitchen shears', valNameAt: 'Henckels kitchen shears', valConf: 'high' })]), [true, false], '…until Agent Two values it again with confidence');
    // Since the merge with main's 2026-10-26 it takes the job (never a context: main's "never where counsel values"), and asks
    // invLineReviewed with no context, so a person's look alone settles it.
    has(live(fn('invLineUnsure')), 'function invLineUnsure(ref, job) {', 'it takes the job, never a context');
    has(live(fn('invLineUnsure')), 'invLineReviewed(ref)) return false;', '⚠ …and asks a person\'s look only: invLineReviewed with no context');
    has(live(fn('_renderInvRow')), 'if (invLineUnsure(ref, job))', 'the row asks it so, with its job');
    // A correction of the name or the category is the desk's: what the pages call settling Agent One's guess.
    has(live(fn('_invEdit')), "if (key === 'objectName' || key === 'category') {\n    ref.namedBy = 'desk';\n    delete ref.agentConf;", 'correcting the name or the category makes the row the desk\'s');
    MANUALS.forEach((f) => {
      const note = dec(noteOf(readPage(f), READ_NOTES[f]));
      has(note, 'shows wherever either agent was guessing', f + ': the hint on any guess');
      has(note, 'on a line that stands as well', f + ': …a line that stands too');
      has(note, "it goes once a person looks: your tick; a figure you type, or the appraisal's typed from the report (since 2026-10-26: Q105, a figure a person records is the look); for Agent One's guess, a name or a category you correct; for Agent Two's, Agent Two valuing the line again with confidence", f + ': ⚠ …until a person looks, and what settles whose');
      has(note, 'The tick is still wanted only where both were guessing', f + ': …and the tick only where both');
      has(note, 'Show it, no tick', f + ': Anthony\'s words');
    });
    PLAYBOOKS.forEach((f) => {
      const note = dec(noteOf(readPage(f), READ_NOTES[f]));
      has(note, 'unsure shows wherever either agent was guessing, on an item with nothing flagged too', f + ': the hint on any guess');
      has(note, "Your tick takes it away, and so does a value you type; on Agent One's guess so does correcting the name or category, and on Agent Two's, Agent Two valuing it again with confidence. Only an item both were guessing on wants the tick.", f + ': ⚠ …until a person looks');
    });
  }

  // ═══ G · THE SECOND REVIEW'S RULES ═══
  group('⚠⚠ G · what a tick does not settle, a ticked Undecided or Hold line, a pair through a rename, a firearm note outliving its line, a waiver');
  {
    const tk = { reviewed: true, reviewedBy: 'Ashley Jerome', valReviewed: true };
    // A tick on a line with no name, or on a line of an open possible duplicate, is not a review; on Undecided or Hold it is.
    eq(reviewed(ESTATE(), [DRAWER(Object.assign({ objectName: '', valNameAt: '' }, tk))]), false, '⚠⚠ a ticked line with no name: not checked');
    eq(reviewed(ESTATE(), [LAMP('d1', tk), LAMP('d2', tk)]), false, '⚠⚠ a ticked half of an open pair: not checked');
    eq(reviewed(ESTATE(), [LAMP('d1', Object.assign({ dupOK: true }, tk)), LAMP('d2', Object.assign({ dupOK: true }, tk))]), true, '…Not duplicates answers it');
    eq(reviewed(ESTATE(), [DRAWER(Object.assign({ disposition: 'Undecided' }, tk))]), true, '⚠ a ticked line still Not yet decided: checked');
    eq(reviewed(ESTATE(), [DRAWER(Object.assign({ disposition: 'Hold' }, tk))]), true, '…on Hold: checked');
    // And the stamp: both halves of a pair ticked never print REVIEWED (ticking both Brass candlesticks did, counting one twice).
    const C = rig(ESTATE(), [LAMP('d1', tk), LAMP('d2', tk)]);
    const st = attempt(() => dec(C._invProgressStamp(C._photoRefs[7], { fc: C.invAcceptCtx(C.jobs[0], C._photoRefs[7]) })));
    has(st.ok ? st.val : st.err, 'IN PROGRESS — 0 of 2 items reviewed', '⚠⚠ both halves ticked: the papers stay IN PROGRESS');
    // A pair Agent One named alike stays a pair through a rename or a category change, until Remove or Not duplicates.
    const groups = (refs) => { const G = rig(ESTATE(), refs); const r = attempt(() => G.agentDuplicateGroups(7, refs).map((g) => g.rows.map((x) => x.stableId).sort())); return r.ok ? r.val : r.err; };
    eq(groups([LAMP('d1'), LAMP('d2')]), [['d1', 'd2']], 'the pair');
    eq(groups([LAMP('d1', { objectName: 'Pair of brass candlesticks', namedBy: 'desk' }), LAMP('d2')]), [['d1', 'd2']], '⚠⚠ …through a name corrected on the desk');
    eq(groups([LAMP('d1', { category: 'Lighting', namedBy: 'desk' }), LAMP('d2')]), [['d1', 'd2']], '⚠ …through a category changed');
    eq(groups([LAMP('d1', { objectName: 'Pair of brass candlesticks', namedBy: 'desk', dupOK: true }), LAMP('d2', { dupOK: true })]), [], '…until Not duplicates');
    has(live(fn('_agWrite')), 'ref.agentName = ref.objectName', 'Agent One\'s own reading is kept as it names');
    // Every note outlives the line it was raised on (the merge with main's 2026-10-26, agentNoticesOn; under the second review
    // only a Firearm or a Possible NFA item did): it rides on the photograph's first line still listed and holds its lines.
    const shelf = (kind) => [DRAWER({ stableId: 'p1', driveFileId: 'Fp1', objectName: 'Closet shelf', deletedAt: 9, agentNotices: [{ kind, text: 'a rifle case on the shelf' }] }),
      DRAWER({ stableId: 'p2', driveFileId: 'Fp1', derivedFrom: 'p1', objectName: 'Hard rifle case' }), DRAWER({ stableId: 'p3', driveFileId: 'Fp1', derivedFrom: 'p1', objectName: 'Wool blankets' })];
    const notes = (refs) => { const N = rig(ESTATE(), refs); const r = attempt(() => N.agentNotices(7, refs.filter((x) => !x.deletedAt)).map((n) => [n.kind, n.ref && n.ref.stableId])); return r.ok ? r.val : r.err; };
    eq(notes(shelf('firearm')), [['firearm', 'p2']], '⚠⚠ a Firearm note on a removed line: above the rows, against the photograph\'s first line still listed');
    eq(notes(shelf('nfa')), [['nfa', 'p2']], '…a Possible NFA item too');
    eq(notes(shelf('other')), [['other', 'p2']], '⚠⚠ …a Look at this as well, since the merge with main\'s 2026-10-26 (it went with its line)');
    eq(hold(ESTATE(), [shelf('other')[2], shelf('other')[0], shelf('other')[1]]), 'photonote', '⚠ …and it holds the photograph\'s lines still listed');
    has(live(fn('_agRecordNoticesHtml')), 'said of this photograph, whose own line was removed', '…and the carrying line\'s record says where it came from (the manual quotes it)');
    eq([hold(ESTATE(), shelf('firearm').slice(1).concat(shelf('firearm')[0])), hold(ESTATE(), [shelf('firearm')[2], shelf('firearm')[0]])], ['photonote', 'photonote'],
      '⚠ …and it holds the photograph\'s lines still listed, by the note');
    // A waiver answers the appraisal, and the row follows at once.
    eq([hold(ESTATE(), [NAMED('Leather sofa', { category: 'Furniture', fmv: 3200, valLow: 2800, valHigh: 3600 })]),
      hold(ESTATE(), [NAMED('Leather sofa', { category: 'Furniture', fmv: 3200, valLow: 2800, valHigh: 3600, apprWaived: true })])], ['appraisal', ''], '⚠⚠ a $3,200 sofa waits on an appraisal until it is waived');
    has(live(fn('waiveAppraisal')), '_invReviewRepaint(jobId, ref)', '…and Waive repaints its box, its group and the work bar');
    // The pages.
    MANUALS.forEach((f) => {
      const note = dec(noteOf(readPage(f), READ_NOTES[f]));
      has(note, 'a line with no name, and a line of an open possible duplicate', f + ': ⚠ what a tick does not settle');
      has(note, 'A line ticked while still Not yet decided or on Hold counts as checked', f + ': …and a ticked Undecided or Hold line');
      has(note, 'compared under the name Agent One gave, so a tick, a name corrected or a category changed on one half does not part them', f + ': ⚠ a pair through a rename');
      has(note, 'remove the line a Firearm or Possible NFA item note was raised on', f + ': ⚠ a firearm note outlives its line');
      lacks(note, 'a removed line takes a Look at this or a Must find with it', f + ': ⚠ gone: a removed line takes no note with it (the merge with main\'s 2026-10-26)');
      has(note, 'every note it carried stays above the rows against the first line still listed off the same photograph', f + ': ⚠⚠ …every note it carried stays');
      has(note, "said of this photograph, whose own line was removed", f + ': …in that line\'s record, in the record\'s words');
      has(note, 'a Look at this until every line off the photograph is reviewed, a Must find until every must-find is found', f + ': …and holds the lines until it goes quiet');
      has(note, 'A waived appraisal answers the appraisal\'s flag', f + ': ⚠ a waiver');
    });
    PLAYBOOKS.forEach((f) => {
      const note = dec(noteOf(readPage(f), READ_NOTES[f]));
      has(note, 'A box ticked in bronze is ticked but still open: an item with no name, or a possible duplicate, which a tick does not settle', f + ': ⚠ what a tick does not settle');
      has(note, 'An item ticked while still Not yet decided or on Hold counts as checked', f + ': …and a ticked Undecided or Hold item');
      // Every note outlives its item since the merge with main's 2026-10-26 (under the second review only a firearm note did).
      has(note, 'A note Agent One raised stays above the rows even if you remove the item it was raised on', f + ': ⚠ a note outlives its item');
      has(note, "it rides on the first item still listed off that photo, and still wants the tick on that photo's other items until it goes quiet, which a firearm note never does", f + ': ⚠⚠ …riding on the first item still listed, and holding the others');
      lacks(note, 'A firearm note stays above the rows', f + ': ⚠ gone: only a firearm note outliving its item');
      has(dec(readPage(f)), 'said of this photograph, whose own line was removed', f + ': …and the carrying item\'s record, in the record\'s words');
      has(note, "Waiving an appraisal settles its flag as the appraisal's figure does", f + ': ⚠ a waiver');
    });
  }
};
