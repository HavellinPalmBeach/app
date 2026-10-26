'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// THE PAGES SAY IT: ONLY FLAGGED LINES TAKE A TICK (2026-10-26, Q106; it replaced Q99's $100 line of the day before, and
// carries Q100 to Q105). Group E of review-floor.test.js (9787be9), restated for the rule as built.
//
// Anthony: *"we will be obviously going back to the office and looking over the entire inventory list ourselves to make sure
// everything looks right … this is our job at night … And we verify it with what we saw on site."* He took *"Only flagged
// lines"*. The manual and the playbook, HTML and markdown, each carry the note once, and:
//
//   A · the note names what stands and what keeps a tick, and every flag it names is held by the real invLineAccepted with a
//       real context (each driven on a line that otherwise stands), as is every thing it says is no longer a flag;
//   B · it quotes the row's two tooltips exactly as _invRevBoxHtml prints them, and the work bar's words as _invProgressBar does;
//   C · it quotes the stamps' words exactly as _invProgressStamp, _invAcceptedStampWords and _avUnreviewedStamp print them, on
//       fixtures with the counts the pages quote, and the printers hand in the options the pages describe;
//   D · the sentences elsewhere on the pages are restated, no sentence of the $100 line is left, and AGENT_TWO_SPEC §13 says it.
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
// The rule, its context, the row's box, the work bar's count and the three stamps, by their real call tree; only data is stubbed.
const ROOTS = ['invLineAccepted', 'invAcceptCtx', 'invLineAcceptedOnly', 'invLineReviewed', 'invLineUnsure', '_invReviewStats',
  '_invAcceptedStampWords', '_invProgressStamp', '_avUnreviewedStamp', '_invRevBoxHtml', '_invProgressBar'];
const STUBS = ['jobs', '_photoRefs', 'estimateStore', 'vendors', 'vendorDirectory', 'contractors', 'document'];
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
    vendorDirectory: [], contractors: [], document: { getElementById: () => null } } });
  liftedScript().runInContext(ctx);
  return ctx;
}
// A call that may throw on a broken build: a revert must fail its assertions, not end the file.
function attempt(f) { try { return { ok: true, val: f() }; } catch (e) { return { ok: false, err: String(e && e.message || e) }; } }

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
// What the rule answers for the first line of `refs` on `job`, `refs` being the job's whole list.
function stands(job, refs) {
  const C = rig(job, refs);
  const r = attempt(() => C.invLineAccepted(C._photoRefs[job.id][0], C.invAcceptCtx(C.jobs[0], C._photoRefs[job.id])));
  return r.ok ? r.val : 'threw: ' + r.err;
}
// The text a reader sees, from a page's HTML or markdown, or from what the code prints.
const dec = (h) => String(h).replace(/&mdash;/g, '—').replace(/&middot;/g, '·').replace(/&rsquo;|&lsquo;/g, "'")
  .replace(/&ldquo;|&rdquo;/g, '"').replace(/&hellip;/g, '…').replace(/&eacute;/g, 'é').replace(/&amp;/g, '&').replace(/<[^>]+>/g, ' ')
  .replace(/\*\*?|`/g, '').replace(/[’‘]/g, "'").replace(/\s+/g, ' ').replace(/\s+([,.;:)])/g, '$1').replace(/\(\s+/g, '(').trim();
// A note: in HTML its <div class="note"> to the </div>; in markdown its one quoted line.
function noteOf(raw, title) {
  const at = raw.indexOf(title);
  if (at < 0) return '';
  const end = /\.md$/.test(raw.__name || '') ? raw.indexOf('\n', at) : raw.indexOf('</div>', at);
  return raw.slice(at, end < 0 ? at + 6000 : end);
}
const PAGES = [['manual.html', 'Only flagged lines take a tick (2026-10-26, Q106)'], ['MANUAL.md', 'Only flagged lines take a tick (2026-10-26, Q106)'],
  ['concierge-guide.html', 'Only flagged lines take a tick (new 2026-10-26, Q106)'], ['CONCIERGE_GUIDE.md', 'Only flagged lines take a tick (new 2026-10-26, Q106)']];
function readPage(f) { const s = new String(rd(f)); s.__name = f; return s; }

module.exports = function ({ group, ok, eq, has, lacks }) {
  // ═══ A · WHAT STANDS AND WHAT KEEPS A TICK ═══
  group('⚠⚠ A · each page carries the note once, names what stands and every flag, and the code holds each one');
  {
    // The flags every page names, each as the pages word it and as the code holds it: a fixture that stands but for this one thing.
    const FLAGS = [
      ['a note from either agent', /note from Agent One or Agent Two/, ESTATE(), [DRAWER({ agentNotices: [{ kind: 'other', text: 'a mark under the base' }] })]],
      ['…Agent Two\'s too', /note from Agent One or Agent Two/, ESTATE(), [DRAWER({ valNotices: [{ kind: 'appraiser', text: 'a signed piece' }] })]],
      ['an Agent One note still open on the first line off its photograph', /first (line|item) off its photo/, ESTATE(),
        [DRAWER({ stableId: 'd2', derivedFrom: 'p1', driveFileId: 'Fp1' }), DRAWER({ stableId: 'p1', driveFileId: 'Fp1', agentNotices: [{ kind: 'other', text: 'a hallmark on one spoon' }] })]],
      ['both agents guessing', /both/, ESTATE(), [DRAWER({ agentConf: 'low', valConf: 'low' })]],
      ['a possible duplicate', /possible duplicate/i, ESTATE(), [DRAWER({ objectName: 'Brass table lamp', valNameAt: 'Brass table lamp' }),
        DRAWER({ stableId: 'd2', ts: 2, objectName: 'Brass table lamp', valNameAt: 'Brass table lamp' })]],
      ['a firearm', /firearm/, ESTATE(), [NAMED('Remington pump shotgun', { category: 'Firearms' })]],
      ['an NFA flag or item', /NFA/, ESTATE(), [DRAWER({ flagNFA: true })]],
      ['ammunition', /ammunition/, ESTATE(), [NAMED('Box of 20 gauge target loads')]],
      ['an appraisal: ticked for one', /appraiser/, LIVING(), [DRAWER({ needsAppr: true })]],
      ['an appraisal: linked to an appraiser', /linked to (an appraiser|one)/, ESTATE(), [DRAWER({ apprId: 'a1' })]],
      ['an appraisal: $3,000 or more, any category', /\$3,000/, ESTATE(), [NAMED('Leather sofa', { category: 'Furniture', fmv: 3200, valLow: 2800, valHigh: 3600, apprWaived: true })]],
      ['an appraisal: worth a specialist on living work', /specialist/, LIVING(), [DRAWER({ fmv: 2000, valLow: 1500, valHigh: 3500 })]],
      ['a specific bequest', /bequest/, ESTATE(), [DRAWER({ flagBequest: true })]],
      ['a dispute on the line', /dispute/, ESTATE(), [DRAWER({ flagDisputed: true })]],
      ['a caution on its release', /caution/, LIVING({ tc: 'Ashley Jerome' }), [DRAWER({ disposition: 'Distribute', channel: 'Ashley Jerome' })]],
      ['a lot over the Form 706 article cap', /Form 706/, ESTATE(), [DRAWER({ qty: 12, fmv: 2400, valLow: 1800, valHigh: 2900 })]],
      ['a value made for an earlier name', /earlier name|name changed/, ESTATE(), [DRAWER({ objectName: 'Sterling flatware, Gorham', valNameAt: 'Stainless flatware and kitchen utensils, drawer d1' })]],
      ['every line of a disputed estate', /disputed estate/, ESTATE({ gateDispute: 'yes' }), [DRAWER()]],
      ['…and of a contested probate (the manual names it)', /disputed estate/, ESTATE({ svc: 'contested_probate' }), [DRAWER()]],
    ];
    // What the pages say stands: no value limit, the specialist categories no flag of their own, one agent alone guessing, a
    // figure typed on the desk (Q105), living work as estates.
    const STANDS = [
      ['the cutlery drawer', ESTATE(), [DRAWER()]],
      ['⚠ a $2,400 dining table: no value limit', ESTATE(), [NAMED('Mahogany dining table, six chairs', { category: 'Furniture', disposition: 'Sell', fmv: 2400, valLow: 2000, valHigh: 2900 })]],
      ['⚠ a painting at $300: art no flag of its own', ESTATE(), [NAMED('Oil on canvas, harbour scene', { category: 'Art & Décor', fmv: 300, valLow: 200, valHigh: 450 })]],
      ['⚠ silver at $80: silver no flag of its own', ESTATE(), [NAMED('Sterling silver serving spoons', { category: 'Silver & Precious Metal', fmv: 80, valLow: 60, valHigh: 120 })]],
      ['Agent One alone guessing', ESTATE(), [DRAWER({ agentConf: 'low' })]],
      ['Agent Two alone guessing', ESTATE(), [DRAWER({ valConf: 'low' })]],
      ['a figure typed on the desk (Q105)', ESTATE(), [DRAWER({ valuedBy: 'desk', valLow: undefined, valHigh: undefined, valConf: undefined })]],
      ['living work', LIVING(), [DRAWER()]],
      ['the photograph note\'s control: its first line ticked, the note quiet', ESTATE(), [DRAWER({ stableId: 'd2', derivedFrom: 'p1', driveFileId: 'Fp1' }),
        TICKED({ stableId: 'p1', driveFileId: 'Fp1', agentNotices: [{ kind: 'other', text: 'a hallmark on one spoon' }] })]],
      ['the caution\'s control: given to somebody who is not Havellin\'s', LIVING({ tc: 'Ashley Jerome' }), [DRAWER({ disposition: 'Distribute', channel: 'Karen Smith' })]],
      ['the lot cap\'s control: the same lot on an estate filing no 706', ESTATE({ gate706: 'no' }), [DRAWER({ qty: 12, fmv: 2400, valLow: 1800, valHigh: 2900 })]],
      ['the duplicate\'s control: two lamps named apart', ESTATE(), [DRAWER({ objectName: 'Brass table lamp', valNameAt: 'Brass table lamp' }),
        DRAWER({ stableId: 'd2', ts: 2, objectName: 'Pair of brass candlesticks', valNameAt: 'Pair of brass candlesticks' })]],
    ];
    STANDS.forEach(([what, job, refs]) => eq(stands(job, refs), true, 'the code: stands: ' + what));
    FLAGS.forEach(([what, , job, refs]) => eq(stands(job, refs), false, 'the code: keeps its tick: ' + what));
    // And what a line needs before anything stands: a name, a destination that is one, a figure.
    [['no destination', { disposition: '' }], ['Not yet decided', { disposition: 'Undecided' }], ['Hold', { disposition: 'Hold' }],
     ['no figure', { fmv: '', valLow: undefined, valHigh: undefined }], ['an appraiser\'s figure', { valuedBy: 'appraiser' }]]
      .forEach(([what, o]) => eq(stands(ESTATE(), [DRAWER(o)]), false, 'the code: does not stand: ' + what));

    PAGES.forEach(([f, title]) => {
      const raw = readPage(f), t = dec(raw);
      ok(t.length > 100000, f + ': fixture: the page read (' + t.length + ' chars)');
      eq(raw.split(title).length - 1, 1, f + ': ⚠⚠ the note, once');
      const note = dec(noteOf(raw, title));
      ok(note.length > 1500, f + ': fixture: the note sliced (' + note.length + ' chars)');
      ok(note.length < 6000, f + ': fixture: and only the note (' + note.length + ' chars)');
      has(note, 'we will be obviously going back to the office', f + ': Anthony\'s words');
      ok(/\$100 line .*gone|\$100 line of 2026-10-25 is gone/.test(note), f + ': ⚠ it says what changed: the $100 line is gone');
      has(note, 'no value limit', f + ': there is no value limit');
      ok(/name, (its )?destination and (its )?value|a name, a destination .* and a figure/.test(note), f + ': what stands: a name, a destination and a value');
      ok(/(figure|value) you typed|value you type yourself/.test(note), f + ': a figure typed on the desk is the look (Q105)');
      FLAGS.forEach(([what, re]) => ok(re.test(note), f + ': names ' + what));
      ok(/no longer/.test(note) && /painting with its value and destination stands like a lamp/.test(note), f + ': the specialist categories are no flag of their own');
      ok(/one of them unsure is not enough|with only one of them guessing, the line stands/.test(note), f + ': one agent alone guessing stands');
      has(note, 'turn one piece of a flatware, china or glass group over', f + ': ⚠ the sterling that looks like stainless is the photography guide\'s close-up (Q103)');
      has(note, 'Photographing a House', f + ': …named');
    });
    ['manual.html', 'MANUAL.md'].forEach((f) => {
      const note = dec(noteOf(readPage(f), PAGES[0][1]));
      [['ammunition words', /ammunition, ammo, shotshells, bullets, gunpowder, black powder, reloading, a gauge/], ['Hold', /Hold/],
       ['the photograph\'s first line', /first line off its photograph/], ['the room check', /room check/], ['Contested Probate', /Contested Probate/],
       ['an appraiser\'s figure keeps its tick', /appraiser's figure keeps its tick/]]
        .forEach(([what, re]) => ok(re.test(note), f + ': the manual\'s note names ' + what));
    });
    // The manual's ammunition words are the code's.
    const ammo = rig(ESTATE(), []).INV_ACCEPT_AMMO_RE;
    ok(!!ammo, 'fixture: the ammunition words read');
    ['ammunition', 'ammo', 'shotshells', 'bullets', 'gunpowder', 'black powder', 'reloading', '12 gauge'].forEach((w) => ok(ammo && ammo.test(w), 'the code holds "' + w + '"'));
  }

  // ═══ B · THE ROW ═══
  group('B · the row\'s two tooltips and the work bar, quoted exactly as the code prints them');
  {
    const box = (job, line) => { const C = rig(job, [line]); const r = attempt(() => C._invRevBoxHtml(job.id, C._photoRefs[job.id][0], C.invAcceptCtx(C.jobs[0], C._photoRefs[job.id]))); return r.ok ? r.val : 'threw: ' + r.err; };
    const title = (h) => { const m = /title="([^"]*)"/.exec(h); return m ? dec(m[1]) : ''; };
    const stand = box(ESTATE(), DRAWER()), desk = box(ESTATE(), DRAWER({ valuedBy: 'desk', valLow: undefined, valHigh: undefined }));
    eq(title(stand), "Nothing flagged: the agents' name and value stand as they are. Tick it to record your own look.", 'the standing line\'s tooltip');
    has(stand, ' checked', '…ticked');
    has(stand, 'accent-color:var(--gray)', '…in grey');
    lacks(stand, ' disabled', '…and pressable');
    has(stand, ",true)", '⚠ a press records a look (it never reads the grey tick as one to take off)');
    eq(title(desk), 'Reviewed: a figure typed on the desk, nothing flagged', 'the desk figure\'s tooltip');
    has(desk, ' disabled', '…ticked and fixed');
    has(desk, 'color:var(--ok-tx)', '…in green');
    const bar = (() => { const C = rig(ESTATE(), []); const r = attempt(() => C._invProgressBar({ done: 3, total: 5, accepted: 2, complete: false })); return r.ok ? dec(r.val) : 'threw: ' + r.err; })();
    has(bar, '3 of 5 reviewed · 2 accepted', 'the work bar\'s count');
    PAGES.forEach(([f, title_]) => {
      const t = dec(readPage(f));
      has(t, "Nothing flagged: the agents' name and value stand as they are. Tick it to record your own look.", f + ': ⚠ the tooltip, word for word');
      has(t, 'Reviewed: a figure typed on the desk, nothing flagged', f + ': the desk figure\'s, word for word');
    });
    ['manual.html', 'MANUAL.md'].forEach((f) => has(dec(readPage(f)), 'the work bar reads N of M reviewed · K accepted', f + ': the work bar, as it reads'));
    ['concierge-guide.html', 'CONCIERGE_GUIDE.md'].forEach((f) => has(dec(readPage(f)), 'The bar at the top tracks you (N of M reviewed · K accepted)', f + ': the work bar, as it reads'));
  }

  // ═══ C · THE PAPERS ═══
  group('⚠⚠ C · the stamps the pages quote are the code\'s, on the counts they quote (Q100, Q104)');
  {
    const lines = (n, pre, o) => Array.from({ length: n }, (_, i) => DRAWER(Object.assign({ stableId: pre + i }, o || {})));
    const checked = (n) => lines(n, 'c', { reviewed: true, reviewedBy: 'Ashley Jerome', valReviewed: true });
    const left = (n) => lines(n, 's');
    const stamp = (items, opt) => {
      const C = rig(ESTATE(), items);
      const r = attempt(() => C._invProgressStamp(C._photoRefs[7], Object.assign({ fc: C.invAcceptCtx(C.jobs[0], C._photoRefs[7]) }, opt || {})));
      return r.ok ? dec(r.val) : 'threw: ' + r.err;
    };
    const valueStamp = (items) => {
      const C = rig(ESTATE(), items);
      const r = attempt(() => C._avUnreviewedStamp(C._photoRefs[7], { fc: C.invAcceptCtx(C.jobs[0], C._photoRefs[7]) }));
      return r.ok ? dec(r.val) : 'threw: ' + r.err;
    };
    const W = {
      done: stamp(checked(42).concat(left(158))),
      open: stamp(checked(30).concat(left(158), [DRAWER({ stableId: 'o1', disposition: 'Undecided' }), DRAWER({ stableId: 'o2', flagDisputed: true })])),
      all: stamp(left(12)),
      named: stamp(checked(42).concat(left(158)), { namesOnly: true }),
      list: stamp(checked(42).concat(left(158)), { noValues: true }),
      sched: valueStamp(left(158).concat([DRAWER({ stableId: 'x1', flagDisputed: true }), DRAWER({ stableId: 'x2', agentNotices: [{ kind: 'other', text: 'a mark' }] })])),
      none: stamp(checked(3)),
    };
    has(W.done, 'REVIEWED — 42 items checked; 158 accepted as valued', '⚠⚠ the stamp, in Anthony\'s words (' + W.done.slice(0, 60) + ')');
    has(W.open, 'IN PROGRESS — 30 of 32 items checked; 158 accepted as valued', 'in progress');
    has(W.all, 'REVIEWED — all 12 accepted as valued', 'all of them standing');
    has(W.named, 'REVIEWED — 42 items checked; 158 accepted as named', 'a page that prints no value (the ledger, the Contents Record)');
    has(W.list, '158 accepted as named', 'the Contents List');
    has(W.sched, '2 values not yet reviewed', '⚠ the schedules count only the flagged values as not yet reviewed…');
    has(W.sched, '158 accepted as valued', '…and how many stand, in the stamp\'s words (Q104)');
    has(W.none, 'REVIEWED — all 3 items', 'nothing standing by itself: the stamp reads as it always did');
    // The one source of those words.
    const C = rig(ESTATE(), []);
    eq([C._invAcceptedStampWords({ accepted: 158 }, false), C._invAcceptedStampWords({ accepted: 158 }, true), C._invAcceptedStampWords({ accepted: 0 }, false)],
      ['158 accepted as valued', '158 accepted as named', ''], 'the stamp\'s words, valued and named, and none where nothing stands');
    // The printers hand in what the pages say: the three pages that print no value ask for names, the Estate Inventory PDF names
    // them once, and every printer hands in the job's facts.
    has(live(fn('printContentsList')), '_invProgressStamp(rec.items, { noValues: true, fc: invAcceptCtx(job) })', 'the Contents List asks without values');
    has(live(fn('printDispositionLedger')), '_invProgressStamp(L.items, { namesOnly: true, fc: invAcceptCtx(job) })', 'the Disposition Ledger asks for names');
    has(live(fn('printContentsRecord')), '_invProgressStamp(rec.items, { namesOnly: true, fc: invAcceptCtx(job) })', 'the Contents Record asks for names');
    has(live(fn('printEstateInventoryReport')), '_avUnreviewedStamp(all, { noAccepted: true, fc: _ac })', 'the Estate Inventory PDF prints no second count');
    has(live(fn('printCourtInventory')), '_avUnreviewedStamp(onSched, { fc: invAcceptCtx(job) })', 'the Court Inventory prints the grey count');
    has(live(fn('printTrustSchedule')), '_avUnreviewedStamp(onSched, { fc: invAcceptCtx(job) })', 'and the Trust Schedule');

    PAGES.forEach(([f]) => {
      const t = dec(readPage(f));
      has(t, 'REVIEWED — 42 items checked; 158 accepted as valued', f + ': ⚠⚠ the stamp, as the code prints it');
      has(t, 'IN PROGRESS — 30 of 32 items checked; 158 accepted as valued', f + ': the stamp in progress');
      has(t, '158 accepted as named', f + ': the pages that print no value');
      has(t.toLowerCase(), 'the contents list, the disposition ledger and the contents record', f + ': …named, all three');
      ok(/grey (N|158) accepted as valued/.test(t), f + ': the schedules\' grey count');
      has(t, 'N values not yet reviewed', f + ': …beside N values not yet reviewed');
    });
    ['manual.html', 'MANUAL.md'].forEach((f) => {
      const t = dec(readPage(f));
      has(t, 'REVIEWED — all 12 accepted as valued', f + ': all standing');
      has(t, "the Estate Inventory PDF's own stamp names them, so it prints no second count", f + ': the report prints no second count');
      has(t, 'REVIEWED — 42 items checked; 158 accepted as named', f + ': the Contents Record\'s stamp, in its own words');
    });
    has(dec(readPage('concierge-guide.html')), 'REVIEWED — 42 items checked; 158 accepted as named', 'concierge-guide.html: the Contents Record\'s stamp');
    has(dec(readPage('CONCIERGE_GUIDE.md')), 'REVIEWED — 42 items checked; 158 accepted as named', 'CONCIERGE_GUIDE.md: the Contents Record\'s stamp');
  }

  // ═══ D · THE REST OF THE PAGES ═══
  group('D · the sentences elsewhere are restated, nothing of the $100 line is left, and the spec says it');
  {
    const GONE = ['Under $100, no tick', 'Under $100 and nothing flagged', 'under $100 accepted as valued', 'everyday items accepted as named',
      'under $100 with nothing flagged', 'is under $100 with nothing flagged', '$120 and want your tick', 'topping out at $40', 'Always left for your tick',
      'Always left for a person', 'counts as the review', 'Nothing Agent One names is marked reviewed', 'Until every line is ticked the document prints',
      'wants the tick, unless that value is under $100', 'is ticked and greyed'];
    PAGES.forEach(([f]) => {
      const t = dec(readPage(f));
      GONE.forEach((w) => lacks(t, w, f + ': ⚠ gone: "' + w + '"'));
      has(t, 'tick covers the name, the count and', f + ': the one look stays');
    });
    ['manual.html', 'MANUAL.md'].forEach((f) => {
      const t = dec(readPage(f));
      has(t, 'Every row comes back unchecked, and once it is decided only a flagged one waits for a tick (restated 2026-10-26)', f + ': the Agent One note, restated');
      has(t, 'until every line is named, valued and decided and every flagged line ticked', f + ': the stamp\'s rule, in the work bar\'s words');
      has(t, 'A name you typed with a destination chosen still counts as reviewed by itself, and stays so once Agent Two has valued it, with nothing flagged', f + ': a name you typed, restated');
      has(t, 'the Court Inventory and the Trust Schedule leave out of that count the values on lines that stand with nothing flagged', f + ': the schedules\' count, restated');
      has(t, 'a line one agent alone was guessing on stands once it is decided', f + ': the unsure hint, restated');
      has(t, 'Since 2026-10-26 the tick is wanted only where the app flags something', f + ': the desk\'s Reviewed, restated');
    });
    ['concierge-guide.html', 'CONCIERGE_GUIDE.md'].forEach((f) => {
      const t = dec(readPage(f));
      has(t, "A row's Reviewed box is ticked in grey, and nobody ticked it", f + ': the symptom row');
      has(t, 'Read each line against what you saw in the house and fix what is wrong. Tick Reviewed on a line the app flags as you finish it', f + ': the desk step, restated');
      has(t, 'a value Agent Two gave after you named it included; the tick is for a line the app flags', f + ': a name you typed, restated');
      has(t, 'and so does choosing the destination once the item has its value, where only one of them was guessing', f + ': the unsure row, restated');
      has(t, 'until every item is named, valued and decided and every flagged one ticked', f + ': the stamp\'s rule');
    });
    // The work bar's sentence the pages follow is the code's.
    has(SRC, 'until every line is named, valued and decided and every flagged line ticked &mdash; they are never withheld.', 'the work bar says it in those words');
    // The spec.
    const spec = rd('AGENT_TWO_SPEC.md');
    has(spec, '**Only flagged lines take a tick (2026-10-26, Q106; it replaced the $100 line of 2026-10-25, Q99', 'AGENT_TWO_SPEC §13 carries the rule');
    lacks(spec, '**Under $100, no tick (2026-10-25', '…in place of the $100 entry');
    has(spec, '`invLineAccepted(ref, fc)`', '…by its predicate');
    lacks(live(SRC), 'INV_REVIEW_FLOOR', 'and the code carries no $100 line for a page to describe');
  }
};
