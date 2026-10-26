'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// THE PAGES SAY IT: ONLY FLAGGED LINES TAKE A TICK, AND THE LIST IS READ (2026-10-26, Q106 to Q108; Q106 replaced Q99's
// $100 line of the day before, and carries Q100 to Q105). Group E of review-floor.test.js (9787be9), restated for the rule as
// built and for the reviewers' round.
//
// Anthony: *"we will be obviously going back to the office and looking over the entire inventory list ourselves to make sure
// everything looks right … this is our job at night … And we verify it with what we saw on site."* He took *"Only flagged
// lines"*, then *"One 'List read' press"* (Q107) and *"Show it, no tick"* (Q108). The manual and the playbook, HTML and
// markdown, each carry the two notes once, and:
//
//   A · the Q106 note names what stands and what keeps a tick, and every flag it names is held by the real invLineHold with a
//       real context (each driven on a line that otherwise stands), as is every thing it says stands or is no longer a flag
//       (the lot cap, an appraisal's figure, a room-check line whose partner went, a removed photograph's note, Agent Two's
//       note under a figure the desk typed), and the ammunition words it lists are the code's;
//   B · it quotes the row's tooltips exactly as _invRevBoxHtml prints them (the reason a line is held, off INV_HOLD_WORDS),
//       and the work bar's words as _invProgressBar does;
//   C · it quotes the stamps' words exactly as _invProgressStamp, _invAcceptedStampWords and _avUnreviewedStamp print them,
//       read and not read, on fixtures with the counts the pages quote, and the printers hand in the options the pages describe;
//   D · the sentences elsewhere on the pages are restated, no sentence of the $100 line or of round one's errors is left, and
//       AGENT_TWO_SPEC §13 says it;
//   E · the list read (Q107): the press, what it records, a later change, the line's three states and the schedules' words,
//       driven through invMarkListRead, invListRead, invListChangedAt, _invListReadHtml and _avReadWords;
//   F · the hint on any guess (Q108), driven through invLineUnsure.
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
// The rule and its reasons, its context, the row's box, the work bar's count and line, the press, and the three stamps, by
// their real call tree; only data, the save and the bar's redraw are stubbed.
const ROOTS = ['invLineHold', 'invLineAccepted', 'invAcceptCtx', 'invLineAcceptedOnly', 'invLineReviewed', 'invLineUnsure', '_invReviewStats',
  '_invAcceptedStampWords', '_invProgressStamp', '_avUnreviewedStamp', '_avReadWords', '_invRevBoxHtml', '_invProgressBar',
  'invMarkListRead', 'invListRead', 'invListReadWords', 'invListChangedAt', '_invListReadHtml'];
const STUBS = ['jobs', '_photoRefs', 'estimateStore', 'vendors', 'vendorDirectory', 'contractors', 'document', '_saveJobEdit', '_renderInvWorkbar'];
let _script = null;
function liftedScript() {
  if (_script) return _script;
  const c = closure(ROOTS, STUBS);
  const ordered = c.vars.map((name) => ({ name, at: SRC.search(new RegExp('(^|\\n)var\\s+' + name + '\\s*=')) }))
    .sort((a, b) => a.at - b.at).map((v) => v.name);
  _script = new vm.Script([...ordered.map(decl), ...c.fns.map(fn)].join('\n\n'), { filename: 'havellin.html (extracted)' });
  return _script;
}
function rig(job, refs) {
  const ctx = sandbox({ stubs: { jobs: [Object.assign({}, job)], _photoRefs: { [job.id]: refs || [] }, estimateStore: {}, vendors: [],
    vendorDirectory: [], contractors: [], document: { getElementById: () => null },
    _saveJobEdit(j) { ctx.__saves = (ctx.__saves || []).concat([j]); }, _renderInvWorkbar: () => '' } });
  liftedScript().runInContext(ctx);
  return ctx;
}
// A call that may throw on a broken build: a revert must fail its assertions, not end the file.
function attempt(f) { try { return { ok: true, val: f() }; } catch (e) { return { ok: false, err: String(e && e.message || e) }; } }
// Dates print in Eastern time (the app's), read off a fixed noon, never the clock.
const eastern = (f) => { const prev = process.env.TZ; process.env.TZ = 'America/New_York'; try { return f(); } finally { process.env.TZ = prev; } };
const AT = Date.UTC(2026, 9, 26, 16, 0);
const READ = { invRead: { at: AT, by: 'Anthony Graziano' } };

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
      ['both agents guessing', /both/, 'guess', ESTATE(), [DRAWER({ agentConf: 'low', valConf: 'low' })]],
      ['a possible duplicate', /possible duplicate/i, 'duplicate', ESTATE(), [DRAWER({ objectName: 'Brass table lamp', valNameAt: 'Brass table lamp' }),
        DRAWER({ stableId: 'd2', ts: 2, objectName: 'Brass table lamp', valNameAt: 'Brass table lamp' })]],
      ['⚠ a possible duplicate both halves of which were ticked: a tick never answers it', /never answers|does not settle/, 'duplicate', ESTATE(),
        [TICKED({ objectName: 'Brass table lamp', valNameAt: 'Brass table lamp' }), TICKED({ stableId: 'd2', ts: 2, objectName: 'Brass table lamp', valNameAt: 'Brass table lamp' })]],
      ['a firearm', /firearm/, 'firearm', ESTATE(), [NAMED('Remington pump shotgun', { category: 'Firearms' })]],
      ['an NFA flag or item', /NFA/, 'firearm', ESTATE(), [DRAWER({ flagNFA: true })]],
      ['ammunition', /ammunition/, 'firearm', ESTATE(), [NAMED('Box of 20 gauge target loads')]],
      ['…in the name Agent One first gave', /ammunition/, 'firearm', ESTATE(), [NAMED('Box of target loads', { valNameFrom: 'Box of 20 gauge target loads' })]],
      ['an appraisal: ticked for one', /appraiser/, 'appraisal', LIVING(), [DRAWER({ needsAppr: true })]],
      ['an appraisal: linked to an appraiser', /linked to (an appraiser|one)/, 'appraisal', ESTATE(), [DRAWER({ apprId: 'a1' })]],
      ['an appraisal: $3,000 or more, any category', /\$3,000/, 'appraisal', ESTATE(), [NAMED('Leather sofa', { category: 'Furniture', fmv: 3200, valLow: 2800, valHigh: 3600, apprWaived: true })]],
      ['an appraisal: worth a specialist on living work', /specialist/, 'appraisal', LIVING(), [DRAWER({ fmv: 2000, valLow: 1500, valHigh: 3500 })]],
      ['a specific bequest', /bequest/, 'bequest', ESTATE(), [DRAWER({ flagBequest: true })]],
      ['a dispute on the line', /dispute/, 'disputed', ESTATE(), [DRAWER({ flagDisputed: true })]],
      ['a caution on its release', /caution/, 'caution', LIVING({ tc: 'Ashley Jerome' }), [DRAWER({ disposition: 'Distribute', channel: 'Ashley Jerome' })]],
      ['a value made for an earlier name', /earlier name|name changed/, 'stale', ESTATE(), [DRAWER({ objectName: 'Sterling flatware, Gorham', valNameAt: 'Stainless flatware and kitchen utensils, drawer d1' })]],
      ['every line of a disputed estate', /disputed estate/, 'dispute', ESTATE({ gateDispute: 'yes' }), [DRAWER()]],
      ['…and of a contested probate (the manual names it)', /disputed estate/, 'dispute', ESTATE({ svc: 'contested_probate' }), [DRAWER()]],
    ];
    // What the pages say stands: no value limit, the specialist categories no flag of their own, one agent alone guessing, a
    // figure typed on the desk (Q105), an appraisal's figure typed from the report, the lot cap no tick, living work as estates.
    const STANDS = [
      ['the cutlery drawer', ESTATE(), [DRAWER()]],
      ['⚠ a $2,400 dining table: no value limit', ESTATE(), [NAMED('Mahogany dining table, six chairs', { category: 'Furniture', disposition: 'Sell', fmv: 2400, valLow: 2000, valHigh: 2900 })]],
      ['⚠ a painting at $300: art no flag of its own', ESTATE(), [NAMED('Oil on canvas, harbour scene', { category: 'Art & Décor', fmv: 300, valLow: 200, valHigh: 450 })]],
      ['⚠ silver at $80: silver no flag of its own', ESTATE(), [NAMED('Sterling silver serving spoons', { category: 'Silver & Precious Metal', fmv: 80, valLow: 60, valHigh: 120 })]],
      ['Agent One alone guessing', ESTATE(), [DRAWER({ agentConf: 'low' })]],
      ['Agent Two alone guessing', ESTATE(), [DRAWER({ valConf: 'low' })]],
      ['a figure typed on the desk (Q105)', ESTATE(), [DRAWER(DESKFIG)]],
      ['⚠⚠ an appraisal\'s figure typed from the report: the appraisal holds the line no longer', ESTATE(), [NAMED('Oil on canvas, signed', Object.assign({ category: 'Art & Décor' }, APPRAISED))]],
      ['⚠⚠ a lot over the Form 706 article cap: not a tick', ESTATE(), [DRAWER({ qty: 12, fmv: 2400, valLow: 1800, valHigh: 2900 })]],
      ['the range alone where counsel values', ESTATE({ docTier: 'contents' }), [DRAWER({ fmv: '' })]],
      ['living work', LIVING(), [DRAWER()]],
      ['the photograph note\'s control: its first line ticked, the note quiet', ESTATE(), [DRAWER({ stableId: 'd2', derivedFrom: 'p1', driveFileId: 'Fp1' }),
        TICKED({ stableId: 'p1', driveFileId: 'Fp1', agentNotices: [{ kind: 'other', text: 'a hallmark on one spoon' }] })]],
      ['⚠ a removed photograph line\'s note holds the lines split off it no longer', ESTATE(), [DRAWER({ stableId: 'd2', derivedFrom: 'p1', driveFileId: 'Fp1' }),
        DRAWER({ stableId: 'p1', driveFileId: 'Fp1', deletedAt: 9, agentNotices: [{ kind: 'other', text: 'a hallmark on one spoon' }] })]],
      ['⚠ Agent Two\'s note under a figure the desk typed', ESTATE(), [DRAWER(Object.assign({ valNotices: [{ kind: 'appraiser', text: 'a signed piece' }] }, DESKFIG))]],
      ['⚠ a line the room check linked to one since removed', ESTATE(), [DRAWER({ dupWith: ['d2'], dupWhy: 'one vase', dupConf: 'high', dupChkAt: 5 }),
        DRAWER({ stableId: 'd2', ts: 2, objectName: 'Blue vase', valNameAt: 'Blue vase', deletedAt: 9, dupWith: ['d1'] })]],
      ['the caution\'s control: given to somebody who is not Havellin\'s', LIVING({ tc: 'Ashley Jerome' }), [DRAWER({ disposition: 'Distribute', channel: 'Karen Smith' })]],
      ['the duplicate\'s control: two lamps named apart', ESTATE(), [DRAWER({ objectName: 'Brass table lamp', valNameAt: 'Brass table lamp' }),
        DRAWER({ stableId: 'd2', ts: 2, objectName: 'Pair of brass candlesticks', valNameAt: 'Pair of brass candlesticks' })]],
      ['the duplicate answered: Not duplicates', ESTATE(), [DRAWER({ objectName: 'Brass table lamp', valNameAt: 'Brass table lamp', dupOK: true }),
        DRAWER({ stableId: 'd2', ts: 2, objectName: 'Brass table lamp', valNameAt: 'Brass table lamp', dupOK: true })]],
    ];
    STANDS.forEach(([what, job, refs]) => eq(hold(job, refs), '', 'the code: stands: ' + what));
    FLAGS.forEach(([what, , why, job, refs]) => eq(hold(job, refs), why, 'the code: keeps its tick: ' + what));
    eq(stands(ESTATE(), [DRAWER()]), true, 'invLineAccepted is invLineHold answering nothing');
    // And what a line needs before anything stands: a name, a destination that is one, a figure.
    [['no destination', { disposition: '' }, 'nodest'], ['Not yet decided', { disposition: 'Undecided' }, 'nodest'], ['Hold', { disposition: 'Hold' }, 'nodest'],
     ['no figure', { fmv: '', valLow: undefined, valHigh: undefined }, 'nofigure'],
     ['⚠ Agent Two\'s range alone where the papers state values', { fmv: '' }, 'nofigure'],
     ['an appraiser\'s line with no appraisal\'s figure on it', { valuedBy: 'appraiser' }, 'nofigure']]
      .forEach(([what, o, why]) => eq(hold(ESTATE(), [DRAWER(o)]), why, 'the code: does not stand: ' + what));

    PAGES.forEach(([f, title]) => {
      const raw = readPage(f), t = dec(raw);
      ok(t.length > 100000, f + ': fixture: the page read (' + t.length + ' chars)');
      eq(raw.split(title).length - 1, 1, f + ': ⚠⚠ the note, once');
      const note = dec(noteOf(raw, title));
      ok(note.length > 1500, f + ': fixture: the note sliced (' + note.length + ' chars)');
      ok(note.length < 9000, f + ': fixture: and only the note (' + note.length + ' chars)');
      has(note, 'we will be obviously going back to the office', f + ': Anthony\'s words');
      ok(/\$100 line .*gone|\$100 line of 2026-10-25 is gone/.test(note), f + ': ⚠ it says what changed: the $100 line is gone');
      has(note, 'no value limit', f + ': there is no value limit');
      ok(/name, (its )?destination and (its )?value|a name, a destination .* and a figure/.test(note), f + ': what stands: a name, a destination and a value');
      ok(/(figure|value) you typed|value you type yourself/.test(note), f + ': a figure typed on the desk is the look (Q105)');
      has(note, 'appraisal\'s figure typed from the report', f + ': ⚠ and so is an appraisal\'s figure');
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
       ['the range alone where counsel values', /range with no figure stands only where counsel values/], ['a removed photograph line', /unless that line was removed/],
       ['notes while they count', /Agent One's until it goes quiet, Agent Two's while the value is still Agent Two's/],
       ['a line named and decided on the desk on a disputed estate', /a line you named and decided yourself is reviewed by that act there too/]]
        .forEach(([what, re]) => ok(re.test(note), f + ': the manual\'s note names ' + what));
      // The manual's ammunition words are the code's, and so are the things it says stand.
      const m = /ammunition in the name or in the name Agent One first gave \(([^)]*)\)/.exec(note);
      ok(!!m, f + ': fixture: the ammunition words read');
      // "(<words>, or a round, cartridge or shell named with its calibre or gauge: <examples>; <what stands> stands)"
      const parts = m ? m[1].split(/[;:]/) : ['', '', ''];
      const words = (parts[0] || '').split(', or a round')[0].split(',').map((w) => w.trim()).filter(Boolean);
      const examples = (parts[1] || '').split(',').map((w) => w.trim()).filter(Boolean);
      const standsWords = (parts[2] || '').replace(/\s*stands\s*$/, '').split(/,|\bor\b/).map((w) => w.replace(/^(an?|the)\s+/, '').trim()).filter(Boolean);
      ok(words.length >= 12 && examples.length === 4 && standsWords.length === 4, f + ': fixture: ' + words.length + ' words, ' + examples.length + ' examples, ' + standsWords.length + ' that stand');
      const C = rig(ESTATE(), []);
      const ammo = C.INV_ACCEPT_AMMO_RE;
      words.concat(examples).forEach((w) => ok(ammo && ammo.test(w), f + ': ⚠ the code holds "' + w + '"'));
      standsWords.forEach((w) => ok(ammo && !ammo.test(w), f + ': ⚠ and lets "' + w + '" stand'));
      eq(hold(ESTATE(), [NAMED('12-gauge extension cord')]), '', f + ': …a 12-gauge extension cord stands, driven');
    });
    PLAYBOOKS.forEach((f) => {
      const note = dec(noteOf(readPage(f), PAGES[2][1]));
      const C = rig(ESTATE(), []);
      ['.22', '12 ga shells', 'gunpowder', 'primers', 'reloading supplies'].forEach((w) => { has(note, w, f + ': the playbook names ' + w); ok(C.INV_ACCEPT_AMMO_RE.test(w), '…and the code holds it'); });
      has(note, 'a 12-gauge extension cord is not', f + ': and what is not');
      ok(!C.INV_ACCEPT_AMMO_RE.test('12-gauge extension cord'), '…which the code lets stand');
    });
  }

  // ═══ B · THE ROW ═══
  group('B · the row\'s tooltips, the reason a line is held, and the work bar, quoted exactly as the code prints them');
  {
    const box = (job, refs) => { const C = rig(job, refs); const r = attempt(() => C._invRevBoxHtml(job.id, C._photoRefs[job.id][0], C.invAcceptCtx(C.jobs[0], C._photoRefs[job.id]))); return r.ok ? r.val : 'threw: ' + r.err; };
    const title = (h) => { const m = /title="([^"]*)"/.exec(h); return m ? dec(m[1]) : ''; };
    const stand = box(ESTATE(), [DRAWER()]), desk = box(ESTATE(), [DRAWER(DESKFIG)]), appr = box(ESTATE(), [NAMED('Oil on canvas, signed', APPRAISED)]);
    const mine = box(ESTATE(), [DRAWER({ namedBy: 'desk' })]), early = box(ESTATE(), [DRAWER({ reviewed: true, reviewedBy: 'Ashley Jerome' })]);
    const held = box(ESTATE(), [DRAWER({ agentConf: 'low', valConf: 'low' })]);
    const dupBox = box(ESTATE(), [DRAWER({ objectName: 'Brass table lamp', valNameAt: 'Brass table lamp' }), DRAWER({ stableId: 'd2', ts: 2, objectName: 'Brass table lamp', valNameAt: 'Brass table lamp' })]);
    eq(title(stand), "Nothing flagged: the agents' name and value stand as they are. Tick it to record your own look.", 'the standing line\'s tooltip');
    has(stand, ' checked', '…ticked');
    has(stand, 'accent-color:var(--gray)', '…in grey');
    lacks(stand, ' disabled', '…and pressable');
    has(stand, ",true)", '⚠ a press records a look (it never reads the grey tick as one to take off)');
    eq(title(mine), "Nothing flagged: the name and Agent Two's value stand. Tick it to record your own look.", 'where the name is the desk\'s');
    eq(title(desk), 'Reviewed: a figure recorded on the desk, nothing flagged', 'the desk figure\'s tooltip');
    eq(title(appr), 'Reviewed: a figure recorded on the desk, nothing flagged', '⚠ …and the appraisal\'s figure typed from the report');
    has(desk, ' disabled', '…ticked and fixed');
    has(desk, 'color:var(--ok-tx)', '…in green');
    eq(title(early), "Reviewed by Ashley Jerome; Agent Two's value since stands, nothing flagged. Tick it to record your look at the value.", '⚠ a tick before Agent Two\'s value landed is not a look at it');
    eq(title(held), 'Needs a look: both agents were guessing. Tick it once checked.', '⚠⚠ a held line says why');
    eq(title(dupBox), 'Needs a look: a possible duplicate: answer it under Possible duplicates. Tick it once checked.', '…a possible duplicate');
    const bar = (() => { const C = rig(ESTATE(), []); const r = attempt(() => C._invProgressBar({ done: 3, total: 5, accepted: 2, complete: false })); return r.ok ? dec(r.val) : 'threw: ' + r.err; })();
    has(bar, '3 of 5 reviewed · 2 accepted', 'the work bar\'s count');
    // Every reason the manual lists is the code's, and every reason the code gives a line is listed.
    const WORDS = rig(ESTATE(), []).INV_HOLD_WORDS || {};
    ok(Object.keys(WORDS).length >= 15, 'fixture: the reasons read (' + Object.keys(WORDS).length + ')');
    PAGES.forEach(([f]) => {
      const t = dec(readPage(f));
      has(t, "Nothing flagged: the agents' name and value stand as they are. Tick it to record your own look.", f + ': ⚠ the tooltip, word for word');
      has(t, 'Reviewed: a figure recorded on the desk, nothing flagged', f + ': the desk figure\'s, word for word');
      has(t, 'Needs a look: both agents were guessing. Tick it once checked.', f + ': ⚠ a held line\'s, word for word');
    });
    MANUALS.forEach((f) => {
      const t = dec(readPage(f)), note = dec(noteOf(readPage(f), READ_NOTES[f]));
      has(t, 'the work bar reads N of M reviewed · K accepted', f + ': the work bar, as it reads');
      has(t, "Nothing flagged: the name and Agent Two's value stand. Tick it to record your own look.", f + ': where the name is the desk\'s');
      has(t, "Agent Two's value since stands, nothing flagged. Tick it to record your look at the value.", f + ': a tick before the value');
      Object.keys(WORDS).forEach((k) => has(note, dec(WORDS[k]), f + ': ⚠ names the reason "' + k + '" in the code\'s words'));
    });
    PLAYBOOKS.forEach((f) => has(dec(readPage(f)), 'The bar at the top tracks you (N of M reviewed · K accepted)', f + ': the work bar, as it reads'));
  }

  // ═══ C · THE PAPERS ═══
  group('⚠⚠ C · the stamps the pages quote are the code\'s, read and not read, on the counts they quote (Q100, Q104, Q107)');
  {
    const lines = (n, pre, o) => Array.from({ length: n }, (_, i) => DRAWER(Object.assign({ stableId: pre + i }, o || {})));
    const checked = (n) => lines(n, 'c', { reviewed: true, reviewedBy: 'Ashley Jerome', valReviewed: true });
    const left = (n) => lines(n, 's');
    const stamp = (items, opt, job) => {
      const C = rig(job || ESTATE(), items);
      const r = attempt(() => eastern(() => C._invProgressStamp(C._photoRefs[7], Object.assign({ fc: C.invAcceptCtx(C.jobs[0], C._photoRefs[7]) }, opt || {}))));
      return r.ok ? dec(r.val) : 'threw: ' + r.err;
    };
    const valueStamp = (items, job) => {
      const C = rig(job || ESTATE(), items);
      const r = attempt(() => eastern(() => C._avUnreviewedStamp(C._photoRefs[7], { fc: C.invAcceptCtx(C.jobs[0], C._photoRefs[7]) })));
      return r.ok ? dec(r.val) : 'threw: ' + r.err;
    };
    const R = ESTATE(READ);
    const later = (items) => items.map((r, i) => (i === 3 ? Object.assign({}, r, { updatedAt: AT + 60000 }) : r));
    const W = {
      unread: stamp(checked(42).concat(left(158))),
      done: stamp(checked(42).concat(left(158)), {}, R),
      changed: stamp(later(checked(42).concat(left(158))), {}, R),
      open: stamp(checked(30).concat(left(158), [DRAWER({ stableId: 'o1', disposition: 'Undecided' }), DRAWER({ stableId: 'o2', flagDisputed: true })]), {}, R),
      all: stamp(left(12), {}, R),
      named: stamp(checked(42).concat(left(158)), { namesOnly: true }, R),
      list: stamp(checked(42).concat(left(158)), { noValues: true }, R),
      sched: valueStamp(left(158).concat([DRAWER({ stableId: 'x1', flagDisputed: true }), DRAWER({ stableId: 'x2', agentNotices: [{ kind: 'other', text: 'a mark' }] })])),
      schedRead: valueStamp(left(158), R),
      schedChanged: valueStamp(later(left(158)), R),
      schedOpen: valueStamp(left(3).concat([DRAWER({ stableId: 'u1', disposition: 'Undecided' })])),
      none: stamp(checked(3)),
      one: stamp(checked(1)),
    };
    has(W.unread, 'IN PROGRESS — 42 items checked; 158 accepted as valued; the list not yet read', '⚠⚠ every line checked or standing, the list not read: IN PROGRESS');
    has(W.unread, 'This is a working copy issued during the engagement. Every item is named and decided; the list has not been read through.', '…under its caveat');
    has(W.done, 'REVIEWED — read by Anthony Graziano, October 26, 2026; 42 items checked; 158 accepted as valued', '⚠⚠ read: the stamp, in Anthony\'s words, naming the read (' + W.done.slice(0, 70) + ')');
    has(W.changed, 'IN PROGRESS — 42 items checked; 158 accepted as valued; the list not yet read since it last changed', '⚠ a change after the read: back to IN PROGRESS');
    has(W.changed, 'the list has not been read through since it last changed.', '…and its caveat says so');
    has(W.open, 'IN PROGRESS — 30 of 32 items checked; 158 accepted as valued', 'in progress, read or not');
    has(W.all, 'REVIEWED — read by Anthony Graziano, October 26, 2026; 12 accepted as valued', 'all of them standing');
    lacks(W.all, 'all 12', '…never "all 12 accepted"');
    has(W.named, 'REVIEWED — read by Anthony Graziano, October 26, 2026; 42 items checked; 158 accepted as named', 'a page that prints no value (the ledger, the Contents Record)');
    has(W.list, '158 accepted as named', 'the Contents List');
    has(W.sched, '2 values not yet reviewed', '⚠ the schedules count only the values on lines that do not stand…');
    has(W.sched, '158 accepted as valued · list not yet read', '…and how many stand, in the stamp\'s words (Q104), and that the list is not read (Q107)');
    has(W.schedRead, '158 accepted as valued · list read by Anthony Graziano, October 26, 2026', 'the schedules\' grey count, read');
    has(W.schedChanged, '158 accepted as valued · list not yet read since it changed', '…and changed since');
    has(W.schedOpen, '1 value not yet reviewed', '⚠ …a value on a line not yet decided counts as not yet reviewed');
    has(W.none, 'REVIEWED — all 3 items', 'nothing standing by itself: the stamp reads as it always did, with no read');
    has(W.one, 'REVIEWED — 1 item', '…one item');
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
    has(live(fn('printCourtInventory')), '_avUnreviewedStamp(onSched, { fc: invAcceptCtx(job) })', 'the Court Inventory prints the grey count');
    has(live(fn('printTrustSchedule')), '_avUnreviewedStamp(onSched, { fc: invAcceptCtx(job) })', 'and the Trust Schedule');

    PAGES.forEach(([f]) => {
      const t = dec(readPage(f));
      has(t, 'REVIEWED — read by Anthony Graziano, October 26, 2026; 42 items checked; 158 accepted as valued', f + ': ⚠⚠ the stamp, as the code prints it');
      has(t, 'IN PROGRESS — 30 of 32 items checked; 158 accepted as valued', f + ': the stamp in progress');
      has(t, 'IN PROGRESS — 42 items checked; 158 accepted as valued; the list not yet read', f + ': ⚠ …and before the read');
      has(t, 'the list not yet read since it last changed', f + ': …and after a change');
      has(t, '158 accepted as named', f + ': the pages that print no value');
      has(t.toLowerCase(), 'the contents list, the disposition ledger and the contents record', f + ': …named, all three');
      ok(/grey (N|158) accepted as valued/.test(t), f + ': the schedules\' grey count');
      has(t, 'N values not yet reviewed', f + ': …beside N values not yet reviewed');
      ok(/values on (lines|items) (that do not stand \(flagged, or not yet decided\)|still flagged or not yet decided)/.test(t), f + ': ⚠ …which counts the values on lines that do not stand');
      lacks(t, 'REVIEWED — 42 items checked', f + ': ⚠ never REVIEWED without the read');
      lacks(t, 'REVIEWED — all 12 accepted as valued', f + ': …nor "all 12"');
    });
    MANUALS.forEach((f) => {
      const t = dec(readPage(f));
      has(t, 'REVIEWED — read by Anthony Graziano, October 26, 2026; 12 accepted as valued', f + ': all standing, read');
      has(t, 'This is a working copy issued during the engagement. Every item is named and decided; the list has not been read through.', f + ': the caveat');
      has(t, '158 accepted as valued · list read by Anthony Graziano, October 26, 2026', f + ': the schedules\' words, read');
      has(t, '158 accepted as valued · list not yet read', f + ': …not read');
      has(t, '· list not yet read since it changed', f + ': …changed since');
      has(t, 'REVIEWED — all 3 items', f + ': nothing standing: as it always did');
      has(t, "the Estate Inventory PDF's own stamp names them, so it prints no second count", f + ': the report prints no second count');
      has(t, 'REVIEWED — read by Anthony Graziano, October 26, 2026; 42 items checked; 158 accepted as named', f + ': the Contents Record\'s stamp, in its own words');
      has(t, "A line whose value a person ticked or typed counts as checked and never as accepted; a tick given before Agent Two's value landed is not a look at that value", f + ': ⚠ what counts as checked');
    });
    PLAYBOOKS.forEach((f) => has(dec(readPage(f)), 'REVIEWED — read by Anthony Graziano, October 26, 2026; 42 items checked; 158 accepted as named', f + ': the Contents Record\'s stamp'));
  }

  // ═══ D · THE REST OF THE PAGES ═══
  group('D · the sentences elsewhere are restated, nothing of the $100 line or round one\'s errors is left, and the spec says it');
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
      'A line a person ticked, or whose figure a person typed, counts as checked', 'linked by the room check', 'Finish the review and it prints REVIEWED.'];
    PAGES.forEach(([f]) => {
      const t = dec(readPage(f));
      GONE.forEach((w) => lacks(t, w, f + ': ⚠ gone: "' + w + '"'));
      has(t, 'tick covers the name, the count and', f + ': the one look stays');
    });
    MANUALS.forEach((f) => {
      const t = dec(readPage(f));
      has(t, 'Every row comes back unchecked, and once it is decided only a flagged one waits for a tick (restated 2026-10-26)', f + ': the Agent One note, restated');
      has(t, 'until every line is named, valued and decided and every flagged line ticked, and, where a line stands as the agents left it, until the list is read since its last change', f + ': the stamp\'s rule, with the read');
      has(t, 'A name you typed with a destination chosen still counts as reviewed by itself, and stays so once Agent Two has valued it, with nothing flagged', f + ': a name you typed, restated');
      has(t, "the Court Inventory and the Trust Schedule leave out of that count the values on lines that stand with nothing flagged, so it counts Agent Two's values on lines that do not stand (flagged, or not yet decided)", f + ': the schedules\' count, restated');
      has(t, 'a line one agent alone was guessing on stands once it is decided, and keeps its unsure until a person looks', f + ': the unsure hint, restated (Q108)');
      has(t, 'Since 2026-10-26 the tick is wanted only where the app flags something', f + ': the desk\'s Reviewed, restated');
      has(t, "the papers also wait for ✓ I've read the list on the work bar after the last change", f + ': …with the read');
      has(t, 'Correcting either name settles a same-name pair on its own. Ticking the row reviewed does not', f + ': ⚠ the duplicates note, restated');
      has(t, 'only those on lines that do not stand, flagged or not yet decided', f + ': the Court Inventory\'s entry, restated');
    });
    PLAYBOOKS.forEach((f) => {
      const t = dec(readPage(f));
      has(t, "A row's Reviewed box is ticked in grey, and nobody ticked it", f + ': the symptom row');
      has(t, 'Read each line against what you saw in the house and fix what is wrong. Tick Reviewed on a line the app flags as you finish it', f + ': the desk step, restated');
      has(t, "When you have read the whole list, press ✓ I've read the list on the work bar (new 2026-10-26)", f + ': ⚠ the read, a step of its own');
      has(t, 'a value Agent Two gave after you named it included; the tick is for a line the app flags', f + ': a name you typed, restated');
      has(t, 'Since 2026-10-26 it shows on an item with nothing flagged too, whose box is ticked in grey', f + ': ⚠ the unsure row, restated (Q108)');
      has(t, "until every item is named, valued and decided and every flagged one ticked, and, where an item stands as the agents left it, until you press I've read the list after your last change", f + ': the stamp\'s rule, with the read');
      has(t, 'Correcting either name settles a same-name pair on its own. Ticking the row reviewed does not', f + ': ⚠ the duplicates note, restated');
      has(t, 'Correcting either name does the same thing; ticking the row reviewed does not (since 2026-10-26).', f + ': ⚠ the nightstands, restated');
      has(t, "Finish the review, then press ✓ I've read the list on the work bar, and it prints REVIEWED with who read it and when", f + ': the IN PROGRESS symptom, restated');
    });
    // The work bar's sentence the pages follow is the code's.
    has(SRC, 'stamp until every flagged item is ticked and the list is read since its last change &mdash; they are never withheld.', 'the work bar says it in those words');
    MANUALS.forEach((f) => has(dec(readPage(f)), 'Client documents print with an IN PROGRESS stamp until every flagged item is ticked and the list is read since its last change — they are never withheld.', f + ': ⚠ …and the manual quotes them'));
    // The spec, read with its line breaks undone.
    const spec = rd('AGENT_TWO_SPEC.md').replace(/\n\s+/g, ' ');
    has(spec, '**Only flagged lines take a tick (2026-10-26, Q106; it replaced the $100 line of 2026-10-25, Q99', 'AGENT_TWO_SPEC §13 carries the rule');
    lacks(spec, '**Under $100, no tick (2026-10-25', '…in place of the $100 entry');
    has(spec, '`invLineAccepted(ref, fc)`', '…by its predicate');
    has(spec, 'A lot over the Form 706 article cap is not a hold', '⚠ …the lot cap no hold');
    lacks(spec, '`_arDupEligible` or an open duplicate group', '⚠ …a room-check link alone no hold');
    has(spec, '**The list read, the hint on any guess, and the reason a line is held (2026-10-26, Q107 and Q108):**', '…and the round two entry');
    ['`invMarkListRead(jobId)`', '`invListChangedAt(jobId)`', '`invListRead(job)`', '`_avReadWords`', '`invLineHold(ref, fc)`', '`INV_HOLD_WORDS`'].forEach((w) => has(spec, w, '…naming ' + w));
    lacks(live(SRC), 'INV_REVIEW_FLOOR', 'and the code carries no $100 line for a page to describe');
  }

  // ═══ E · THE LIST READ (Q107) ═══
  group('⚠⚠ E · the list read: the press, what it records, a later change, the line\'s words and the schedules\', as the pages say');
  {
    const job = ESTATE({ tc: 'Ashley Jerome' });
    const items = [DRAWER(), DRAWER({ stableId: 'd2', ts: 2, objectName: 'Brass table lamp', valNameAt: 'Brass table lamp' })];
    const line = (C, j) => { const r = attempt(() => eastern(() => dec(C._invListReadHtml(j, { total: 2 })))); return r.ok ? r.val : 'threw: ' + r.err; };
    // Not read.
    const C0 = rig(job, items);
    eq(line(C0, C0.jobs[0]), "List not read yet · ✓ I've read the list", 'not read: the line and the press');
    // The press records who and when, as a person's edit: the device's user, else the job's concierge.
    C0.localStorage.setItem('hav_device_user', 'Anthony Graziano');
    const p = attempt(() => C0.invMarkListRead(7));
    ok(p.ok, 'the press runs (' + (p.err || 'ok') + ')');
    const rec = C0.jobs[0].invRead || {};
    eq([rec.by, typeof rec.at, (C0.__saves || []).length, (C0.__saves || [])[0] === C0.jobs[0]], ['Anthony Graziano', 'number', 1, true],
      '⚠⚠ who (the device\'s user) and when, on the job, saved as a person\'s edit');
    const C1 = rig(job, items);
    attempt(() => C1.invMarkListRead(7));
    eq((C1.jobs[0].invRead || {}).by, 'Ashley Jerome', '…else the job\'s concierge');
    eq(attempt(() => C0.invListRead(C0.jobs[0]).current).val, true, 'read just now: current');
    // Read, with a fixed day.
    const C2 = rig(ESTATE(READ), items);
    eq(line(C2, C2.jobs[0]), '✓ List read by Anthony Graziano, October 26, 2026', '⚠ read: green, naming who and when, with no press');
    ok(/color:var\(--ok-tx\)/.test(C2._invListReadHtml(C2.jobs[0], { total: 2 })), '…in green');
    eq(attempt(() => eastern(() => C2.invListReadWords(C2.invListRead(C2.jobs[0])))).val, 'read by Anthony Graziano, October 26, 2026', 'the words a paper prints');
    // A later change (a name, a value, a tick, a removal: any line's clock) makes it the read of an earlier list.
    const C3 = rig(ESTATE(READ), [items[0], Object.assign({}, items[1], { updatedAt: AT + 60000 })]);
    eq(line(C3, C3.jobs[0]), "List read by Anthony Graziano, October 26, 2026 · changed since · ✓ I've read the list", '⚠⚠ changed since, and the press again');
    eq(attempt(() => C3.invListRead(C3.jobs[0]).current).val, false, '…no longer current');
    const C4 = rig(ESTATE(READ), [items[0], Object.assign({}, items[1], { updatedAt: AT + 60000, deletedAt: AT + 60000 })]);
    eq(attempt(() => C4.invListChangedAt(7)).val, AT + 60000, '⚠ a removal is a change');
    has(live(fn('_invSetReviewed')), '_setPhotoRef(jobId, _invTouch(ref));', 'a tick moves the line\'s clock, so it is a change');
    has(live(fn('_renderInvWorkbar')), '_invListReadHtml(job, st)', 'the line is on the work bar');
    // The pages say it.
    [...MANUALS, ...PLAYBOOKS].forEach((f) => {
      const t = dec(readPage(f)), note = dec(noteOf(readPage(f), READ_NOTES[f]));
      ok(note.length > 800, f + ': ⚠⚠ the read note (' + note.length + ' chars)');
      eq(readPage(f).split(READ_NOTES[f]).length - 1, 1, f + ': …once');
      has(note, "✓ I've read the list", f + ': the press, by its label');
      has(note, '✓ List read by Anthony Graziano, October 26, 2026', f + ': the line once read, word for word');
      has(note, 'List read by Anthony Graziano, October 26, 2026 · changed since', f + ': …and changed since');
      ok(/a name, a value, (a count, )?a destination, a tick, a removal, or a value Agent Two (writes|adds) by itself/.test(note), f + ': ⚠ what counts as a change, Agent Two\'s own runs included');
      ok(/[Pp]ress it last/.test(note), f + ': press it last');
      ok(/needs? no read|need no read|the press changes nothing on them/.test(note), f + ': a list every line of which a person checked needs none');
      has(t, 'IN PROGRESS', f + ': fixture');
    });
    MANUALS.forEach((f) => {
      const note = dec(noteOf(readPage(f), READ_NOTES[f]));
      has(note, 'List not read yet', f + ': the line before any read');
      ['job.invRead', 'invMarkListRead', 'invListRead', 'invListChangedAt'].forEach((w) => has(note, w, f + ': names ' + w));
      has(note, "the device's user, as Settings records it, else the job's concierge", f + ': who');
    });
  }

  // ═══ F · THE HINT ON ANY GUESS (Q108) ═══
  group('F · the hint shows wherever either agent was guessing, on a line that stands too, until a person looks (Q108)');
  {
    // The context is handed in as the row once did (round one): the hint must not read it, so a line that stands still shows it.
    const unsure = (job, refs) => { const C = rig(job, refs); const r = attempt(() => { const fc = C.invAcceptCtx(C.jobs[0], C._photoRefs[7]);
      return [C.invLineAccepted(C._photoRefs[7][0], fc), C.invLineUnsure(C._photoRefs[7][0], fc)]; }); return r.ok ? r.val : r.err; };
    eq(unsure(ESTATE(), [DRAWER({ valConf: 'low' })]), [true, true], '⚠⚠ Agent Two guessing alone: the line stands and shows unsure');
    eq(unsure(ESTATE(), [DRAWER(Object.assign({ agentConf: 'low' }, DESKFIG))]), [true, true], '⚠ Agent One\'s guess under a figure the desk typed: stands, unsure');
    eq(unsure(ESTATE(), [DRAWER({ agentConf: 'low' })]), [true, false], '…Agent One\'s guess Agent Two has valued under that name: settled');
    eq(unsure(ESTATE(), [DRAWER({ agentConf: 'low', valConf: 'low' })]), [false, true], 'both guessing: held, and unsure');
    eq(unsure(ESTATE(), [TICKED({ valConf: 'low' })]), [true, false], '⚠ the tick takes it');
    eq(unsure(ESTATE(), [DRAWER({ agentConf: 'low', namedBy: 'desk', valuedBy: 'desk', valLow: undefined, valHigh: undefined, valConf: undefined })]), [true, false], '…and so does a name typed on Agent One\'s guess');
    has(live(fn('invLineUnsure')), 'function invLineUnsure(ref) {', 'it takes no context: a person\'s look only');
    has(live(fn('_renderInvRow')), 'if (invLineUnsure(ref))', 'the row asks it so');
    MANUALS.forEach((f) => {
      const note = dec(noteOf(readPage(f), READ_NOTES[f]));
      has(note, 'shows wherever either agent was guessing', f + ': the hint on any guess');
      has(note, 'on a line that stands as well', f + ': …a line that stands too');
      has(note, "your tick, or, for Agent One's guess, a name you type", f + ': …until a person looks');
      has(note, 'The tick is still wanted only where both were guessing', f + ': …and the tick only where both');
      has(note, 'Show it, no tick', f + ': Anthony\'s words');
    });
    PLAYBOOKS.forEach((f) => {
      const note = dec(noteOf(readPage(f), READ_NOTES[f]));
      has(note, 'unsure shows wherever either agent was guessing, on an item with nothing flagged too', f + ': the hint on any guess');
      has(note, "Your tick takes it away (on Agent One's guess, so does typing the name); only an item both were guessing on wants the tick.", f + ': …until a person looks');
    });
  }
};
