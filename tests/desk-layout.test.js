'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// THE DESK'S LAYOUT (2026-10-22): Job Admin & Inv in the order of an evening at the desk.
//
// Anthony, 2026-10-22, asked whether to build the new desk under the feature freeze: *"Build all of it now."*
// The tab runs top to bottom: the job today (client line, band, must-finds), Job Admin, tonight's items (the work
// bar, the vehicles still to bring in, the chips, the filter, the rows, the bulk bar), then four fold bars, each one
// line until opened: Releases & signed papers, Values & appraisals, Closing the job, Removed items & snapshots. The
// summary stays last, outside every bar.
//
//   A · the fold machinery: a bar flips in place (never a render), a person's open or shut wins both ways and outlives
//       every full redraw, per job, for the session only; the caret is secCaret's; the five folds look alike.
//   B · the order, driven through the real renderInventoryTab with each card stubbed to a marker, and the literals
//       other suites pin; the Releases host, Open the desk, a snapshot and the summary land where a person can see them.
//
// Each later group of the build adds its own groups here (the status lines, the Urgent strip, the trims, …).
// ─────────────────────────────────────────────────────────────────────────────

const { sandbox, source, fn, decl, domStub } = require('./harness');

const SRC = source();
const ALL_FNS = new Set((SRC.match(/(^|\n)function\s+([A-Za-z0-9_$]+)\s*\(/g) || []).map((s) => s.replace(/^\n?function\s+/, '').replace(/\s*\($/, '')));
const ALL_VARS = new Set((SRC.match(/(^|\n)var\s+([A-Za-z0-9_$]+)\s*=/g) || []).map((s) => s.replace(/^\n?var\s+/, '').replace(/\s*=$/, '')));
const codeOnly = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).map((l) => l.replace(/\s\/\/\s.*$/, '')).join('\n')
  .replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, "''");
// ⚠ LINE BY LINE, NEVER A BLOCK-COMMENT REGEX (it eats ~170 KB here because of `accept="image/*"`).
const noComments = (t) => String(t).split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
// The first <style> block only: the JS builds that tag inside quoted strings too.
const CSS = SRC.slice(SRC.indexOf('<style>'), SRC.indexOf('</style>'));

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
function lift(roots, stubs) {
  const c = closure(roots, Object.keys(stubs || {}));
  return sandbox({ fns: c.fns, vars: c.vars, stubs: stubs || {} });
}
// A call that may throw on the unfixed code: a revert must fail its assertions, not end the file.
function attempt(f) { try { return { ok: true, val: f() }; } catch (e) { return { ok: false, err: String(e && e.message || e) }; } }

// A DOM that holds the tab's markup as ONE STRING, so what a press changes is read back from the same markup a full
// render writes. An element is found by its id in that string; its style.display, a caret's text and an attribute are
// read from and written into the markup itself, so "flipped in place" and "drawn shut by the next render" are the same
// observation. An id that is not in the markup is null, as in a browser.
function liveDom(selectedJobId) {
  let html = '';
  const log = { scrolls: [] };
  const tagAt = (id) => {
    const at = html.indexOf('id="' + id + '"');
    if (at < 0) return null;
    const start = html.lastIndexOf('<', at);
    return { start, end: html.indexOf('>', at) + 1 };
  };
  const tagOf = (id) => { const t = tagAt(id); return html.slice(t.start, t.end); };
  const setTag = (id, tag) => { const t = tagAt(id); html = html.slice(0, t.start) + tag + html.slice(t.end); };
  const el = (id) => {
    if (!tagAt(id)) return null;
    return {
      id,
      style: {
        get display() { const m = /style="([^"]*)"/.exec(tagOf(id)); const d = m && /display:\s*([a-z-]*)/.exec(m[1]); return d ? d[1] : ''; },
        set display(v) {
          let tag = tagOf(id);
          const m = /style="([^"]*)"/.exec(tag);
          const rest = m ? m[1].replace(/display:\s*[a-z-]*;?/, '') : '';
          const st = 'display:' + (v || '') + ';' + rest;
          tag = m ? tag.replace(/style="[^"]*"/, 'style="' + st + '"') : tag.replace(/>$/, ' style="' + st + '">');
          setTag(id, tag);
        },
      },
      get textContent() { const t = tagAt(id); return html.slice(t.end, html.indexOf('<', t.end)); },
      set textContent(v) { const t = tagAt(id); html = html.slice(0, t.end) + String(v) + html.slice(html.indexOf('<', t.end)); },
      getAttribute(k) { const m = new RegExp(' ' + k + '="([^"]*)"').exec(tagOf(id)); return m ? m[1] : null; },
      setAttribute(k, v) {
        let tag = tagOf(id);
        const re = new RegExp(' ' + k + '="[^"]*"');
        tag = re.test(tag) ? tag.replace(re, ' ' + k + '="' + v + '"') : tag.replace(/>$/, ' ' + k + '="' + v + '">');
        setTag(id, tag);
      },
      get outerHTML() {
        const t = tagAt(id);
        const name = /^<([a-zA-Z]+)/.exec(html.slice(t.start))[1];
        const re = new RegExp('<' + name + '[\\s>]|</' + name + '>', 'g');
        re.lastIndex = t.start;
        let depth = 0, m;
        while ((m = re.exec(html))) { if (m[0][1] === '/') { if (!--depth) return html.slice(t.start, m.index + m[0].length); } else depth++; }
        throw new Error('liveDom: unbalanced markup around #' + id);
      },
      set outerHTML(v) { const o = this.outerHTML; const t = tagAt(id); html = html.slice(0, t.start) + v + html.slice(t.start + o.length); },
      scrollIntoView(opt) { log.scrolls.push({ id, opt }); },
      querySelectorAll() { return []; },
    };
  };
  const cont = { get innerHTML() { return html; }, set innerHTML(v) { html = String(v); }, querySelectorAll() { return []; }, style: {} };
  const sel = { value: String(selectedJobId) };
  return {
    getElementById(id) { if (id === 'inventory-content') return cont; if (id === 'inv-job') return sel; return el(String(id)); },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    get html() { return html; },
    set html(v) { html = String(v); },
    log,
  };
}

// The text inside the element with this id (its own markup, tags stripped).
function inner(html, id) {
  const at = html.indexOf('id="' + id + '"');
  if (at < 0) return null;
  const start = html.lastIndexOf('<', at);
  const name = /^<([a-zA-Z]+)/.exec(html.slice(start))[1];
  const re = new RegExp('<' + name + '[\\s>]|</' + name + '>', 'g');
  re.lastIndex = start;
  let depth = 0, m;
  while ((m = re.exec(html))) { if (m[0][1] === '/') { if (!--depth) return html.slice(html.indexOf('>', at) + 1, m.index); } else depth++; }
  return null;
}
// How deep in <div>s a point in the markup sits: 0 is a direct child of the tab's container.
function depthAt(html, at) {
  const pre = html.slice(0, at);
  return (pre.match(/<div[\s>]/g) || []).length - (pre.match(/<\/div>/g) || []).length;
}
const ENT = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&middot;': '·' };
const textOf = (h) => String(h == null ? '' : h).replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, (m) => (ENT[m] !== undefined ? ENT[m] : m)).replace(/\s+/g, ' ').trim();

// ── The desk, every card a marker, so the test reads the ASSEMBLY: what renderInventoryTab puts where. ──
const ESTATE = () => ({ id: 7, name: 'Ashworth', svc: 'probate', won: true });
const REFS = () => [{ stableId: 'a', label: 'inventory', objectName: 'Clock' }, { stableId: 'b', label: 'inventory', objectName: 'Desk' }];
function desk(jobO, cards) {
  const dom = liveDom(7);
  const S = Object.assign({ rel: '<div class="card" id="inv-releases">REL</div>', bq: '<div class="card" id="inv-bequests">BQ<datalist id="inv-ben-list-7"></datalist></div>',
    ledger: '<div class="card" id="inv-ledger-card">LEDGER</div><div class="card" id="inv-proceeds-card">PS</div><div class="card" id="inv-donations-card">DON</div>',
    removed: '<div class="card" id="m-removed">REMOVED</div>', snaps: '<div class="card" id="inv-snapshots">SNAPS</div>', vehicles: '<div class="card" id="m-import">VEHICLES</div>',
    bulk: '<div id="m-bulk" style="position:sticky;bottom:0;">BULK</div>' }, cards || {});
  const log = { renders: 0, thumbs: [], ja: 0 };
  const job = Object.assign(ESTATE(), jobO || {});
  const refs = REFS();
  const stubs = {
    document: dom, jobs: [job], _photoRefs: { 7: refs }, estimateStore: { 7: { estimate: { svc: job.svc } } },
    _invThumbFailed: {}, _invShowRoll: false, _agDupSet: null,
    jobInfoHeaderHtml: () => '<div id="m-hdr">HDR</div>',
    jobProgressBlockHtml: () => '<div id="m-band">BAND</div>',
    renderCloseoutCard: (jid, j, host) => '<div class="card co-card"><div id="closeout-' + host + '-' + jid + '">CLOSEOUT</div></div>',
    isJobWon: (j) => !!j.won,
    _sfHost: (id) => '<div id="' + id + '">MUSTFIND</div>',
    renderJobAdmin: () => { log.ja++; return '<div class="ja-card" id="m-ja">JA</div>'; },
    _renderInvWorkbar: () => '<div id="inv-workbar">WORKBAR</div>',
    _renderInventoryImportPanel: () => S.vehicles,
    _renderInvFlagStrip: () => 'CHIPS',
    _renderInvFilterRow: () => '<div id="m-filter">FILTER</div>',
    _renderDuplicateImportNotice: () => '<div id="m-dupimp">DUPIMP</div>',
    _agDupHtml: () => '<div id="m-agdup">AGDUP</div>',
    _invGroupItems: (j, items) => [items],
    _renderInvGroup: (j, g) => '<div id="m-rows">ROWS ' + g.length + '</div>',
    _renderInvBulk: () => S.bulk,
    _renderInvReleasesCard: () => S.rel,
    _renderInvBequestCard: () => S.bq,
    _renderAppraiserRoster: () => '<div class="card" id="m-roster">ROSTER</div>',
    _renderAppraisalGuardrail: () => 'GUARDRAIL',
    _renderLedgerCards: () => S.ledger,
    _renderRemovedRows: () => S.removed,
    _renderInventorySnapshots: () => S.snaps,
    _renderInventorySummary: () => 'SUMMARY',
    _invEnsureLoaded() {}, collectionLinesEnsure() {}, _invAssignItemNos: () => refs, _invApplyWhenDefault() {},
    _invMatchesFilter: () => true, _agDupIndex: () => ({}), _invEnsureThumbs() {},
    _invPaintThumbs: (jid, root) => { log.thumbs.push({ jid, root: root ? root.id : null }); },
  };
  const C = lift(['renderInventoryTab', 'toggleDeskFold', 'deskFoldOpen'], stubs);
  const real = C.renderInventoryTab;
  C.renderInventoryTab = function () { log.renders++; return real.apply(this, arguments); };
  return { C, dom, log, S, job, render: () => { const r = attempt(() => real.call(C)); log.renderErr = r.err; return dom.html; } };
}

module.exports = function ({ group, ok, eq, has, lacks }) {
  const prevTZ = process.env.TZ;
  process.env.TZ = 'America/New_York';
  try {
    groupA({ group, ok, eq, has, lacks });
    groupB({ group, ok, eq, has, lacks });
  } finally {
    process.env.TZ = prevTZ;
  }
};

// ═══ A · THE FOLD MACHINERY ═══════════════════════════════════════════════════
function groupA({ group, ok, eq, has, lacks }) {
  group('A1 · a bar is the shared dark bar: caret, title, its line, then a body hidden while shut, never dropped');
  {
    const W = sandbox({ fns: ['_deskFold', '_deskFoldIsOpen', '_deskKey', '_deskStatHtml', 'secCaret', 'esc'], vars: ['_deskOpen', 'DESK_FOLD_TONES'] });
    const open = W._deskFold(7, 'releases', 'Releases & signed papers', { show: true, openByDefault: true, bits: [] }, '<p id="B">BODY</p>');
    has(open, '<div class="desk-fold" id="desk-fold-releases-7">', 'the bar has its own wrapper, by job and fold');
    has(open, 'class="sec-hdr sec-toggle"', '⚠ the bar IS the shared `.sec-hdr .sec-toggle`, never a copy of it');
    has(open, 'onclick="toggleDeskFold(7,\'releases\')"', 'its header is the press');
    has(open, 'role="button" tabindex="0" aria-expanded="true"', 'a button to the keyboard and to a screen reader, saying it is open');
    has(open, 'onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();this.click();}"', 'Enter or Space presses it');
    const caretAt = open.indexOf('id="desk-chev-releases-7"'), titleAt = open.indexOf('Releases &amp; signed papers'), statAt = open.indexOf('class="desk-stat" id="desk-stat-releases-7"');
    ok(caretAt > 0 && caretAt < titleAt && titleAt < statAt, '⚠ caret LEFT, then the title, then the line at the end of the bar (Anthony, 2026-09-20)');
    has(open, '<span class="sec-caret" id="desk-chev-releases-7">' + W.secCaret(true) + '</span>', 'the caret is secCaret\'s, open');
    has(open, 'class="desk-fold-body" id="desk-body-releases-7" style="display:;"', 'open: the body shows');
    has(open, '<p id="B">BODY</p>', 'with the cards inside it');
    eq(W._deskOpen['7:releases'], true, 'an open default is written down, so the bar never shuts by itself');
    const shut = W._deskFold(7, 'values', 'Values & appraisals', { show: true, openByDefault: false, bits: [] }, '<p id="V">VALUES</p>');
    has(shut, 'id="desk-body-values-7" style="display:none;"', 'shut: the body is hidden');
    has(shut, '<p id="V">VALUES</p>', '⚠⚠ and still in the page: the by-id hosts, the datalist and every text read keep working');
    has(shut, '<span class="sec-caret" id="desk-chev-values-7">' + W.secCaret(false) + '</span>', 'its caret reads shut');
    ok(!('7:values' in W._deskOpen), 'a shut default is not written down (a later open default may still open it)');
    const gone = W._deskFold(7, 'history', 'Removed items & snapshots', { show: false, openByDefault: true, bits: [] }, '');
    has(gone, '<div class="desk-fold" id="desk-fold-history-7" style="display:none;">', 'a bar with nothing to show is hidden whole');
    has(W._deskFold(7, 'x', 'T', { show: true, bits: [{ text: '2 <b>owed</b>', tone: 'amber' }, { text: 'quiet', tone: 'nope' }] }, ''),
      '<span class="desk-st-amber">2 &lt;b&gt;owed&lt;/b&gt;</span> &middot; <span class="desk-st-grey">quiet</span>',
      'the line is text only, escaped, each part in its tone (an unknown tone reads grey)');
  }

  group('A2 · the header flips the bar IN PLACE: no render, the choice recorded, photographs painted on open');
  {
    const D = desk();
    D.render();
    ok(!D.log.renderErr, 'the desk renders (' + (D.log.renderErr || 'ok') + ')');
    eq(D.dom.getElementById('desk-body-releases-7').style.display, '', 'fixture: the Releases bar is drawn open');
    D.log.renders = 0;
    const r = attempt(() => D.C.toggleDeskFold(7, 'releases'));
    ok(r.ok, 'the press runs (' + (r.err || 'ok') + ')');
    eq(D.log.renders, 0, '⚠⚠ ZERO full renders: a redraw takes a half-typed note, a search or a recipient box with it');
    eq(D.dom.getElementById('desk-body-releases-7').style.display, 'none', 'the body is hidden where it stands');
    eq(D.dom.getElementById('desk-chev-releases-7').textContent, D.C.secCaret(false), 'the caret flips through secCaret');
    eq(D.dom.getElementById('desk-hd-releases-7').getAttribute('aria-expanded'), 'false', 'and the header says it is shut');
    has(inner(D.dom.html, 'desk-body-releases-7'), 'REL', 'the card is still in the page, hidden');
    eq(D.C._deskOpen['7:releases'], false, 'the shut is recorded as a choice');
    D.log.thumbs = [];
    attempt(() => D.C.toggleDeskFold(7, 'releases'));
    eq(D.log.renders, 0, 'opening again: still no render');
    eq(D.dom.getElementById('desk-body-releases-7').style.display, '', 'open again');
    eq(D.C._deskOpen['7:releases'], true, 'recorded open');
    eq(D.log.thumbs, [{ jid: 7, root: 'desk-body-releases-7' }], 'the photographs inside the opened body are painted, in that body only');
  }

  group('A3 · a person\'s shut beats an open default, outlives every full redraw, and is per job');
  {
    const D = desk();
    D.render();
    attempt(() => D.C.toggleDeskFold(7, 'closing'));
    const again = D.render();
    has(again, 'id="desk-body-closing-7" style="display:none;"', '⚠⚠ the next full render (a sheet read, a tick, an edit) draws it SHUT, as it was left');
    has(again, '<span class="sec-caret" id="desk-chev-closing-7">' + D.C.secCaret(false) + '</span>', 'with its caret shut');
    has(again, 'id="desk-body-releases-7" style="display:;"', 'the other bars keep their own state');
    has(inner(again, 'desk-body-closing-7'), 'CLOSEOUT', 'and the shut bar still carries its cards');
    // Another client's desk on the same device: its own defaults, untouched by this one's shut.
    const W = sandbox({ fns: ['_deskFold', '_deskFoldIsOpen', '_deskKey', '_deskStatHtml', 'secCaret', 'esc'], vars: ['_deskOpen', 'DESK_FOLD_TONES'] });
    W._deskOpen['7:closing'] = false;
    has(W._deskFold(8, 'closing', 'Closing the job', { show: true, openByDefault: true, bits: [] }, 'X'), 'id="desk-body-closing-8" style="display:;"',
      'per job: job 8 opens on its own default');
    has(W._deskFold(7, 'closing', 'Closing the job', { show: true, openByDefault: true, bits: [] }, 'X'), 'id="desk-body-closing-7" style="display:none;"',
      '⚠ job 7 stays as its person left it, whatever the default says');
    W._deskOpen['7:values'] = true;
    eq(W._deskFoldIsOpen(7, 'values', { openByDefault: false }), true, '⚠ an open bar never shuts by itself when what opened it resolves');
  }

  group('A4 · deskFoldOpen opens a bar for code (Open the desk, a snapshot), in place and for the next render');
  {
    const D = desk();
    D.render();
    attempt(() => D.C.toggleDeskFold(7, 'history'));
    eq(D.dom.getElementById('desk-body-history-7').style.display, 'none', 'fixture: shut by hand');
    D.log.renders = 0;
    attempt(() => D.C.deskFoldOpen(7, 'history'));
    eq(D.dom.getElementById('desk-body-history-7').style.display, '', 'opened where it stands');
    eq(D.dom.getElementById('desk-chev-history-7').textContent, D.C.secCaret(true), 'caret open');
    eq(D.log.renders, 0, 'without a render of its own');
    eq(D.C._deskOpen['7:history'], true, 'and recorded, so the render that follows draws it open');
    const W = sandbox({ fns: ['deskFoldOpen', '_deskFoldPaint', '_deskKey', 'secCaret'], vars: ['_deskOpen'], stubs: { document: { getElementById: () => null } } });
    ok(attempt(() => W.deskFoldOpen(9, 'releases')).ok && W._deskOpen['9:releases'] === true, 'with no desk on screen it records the open and touches nothing');
  }

  group('A5 · view state, never saved: nothing reaches localStorage, and the sources say so');
  {
    const D = desk();
    D.render();
    attempt(() => D.C.toggleDeskFold(7, 'values'));
    attempt(() => D.C.deskFoldOpen(7, 'history'));
    eq(Object.keys(D.C.__store), [], '⚠ toggling and opening wrote nothing to the device');
    ['_deskFoldIsOpen', 'toggleDeskFold', 'deskFoldOpen', '_deskFoldPaint', '_deskFold'].forEach((f) =>
      lacks(noComments(fn(f)), 'localStorage', f + ' never touches storage'));
    has(decl('_deskOpen'), 'var _deskOpen = {};', 'session memory, one object');
    // the one caret: every writer reads secCaret and carries no glyph of its own (fold-consistency nets the whole file)
    ['_deskFold', '_deskFoldPaint'].forEach((f) => has(noComments(fn(f)), 'secCaret(', f + ' takes the caret from secCaret'));
  }

  group('A6 · the five folds on the tab look alike: Job Admin shares the bar\'s rules, the bars reset its uppercase');
  {
    has(CSS, '.sec-hdr,.ja-hd{background:var(--gray-dk);', '⚠ Job Admin\'s header IS the dark bar, by a shared selector, never a copy');
    has(CSS, '.sec-toggle,.ja-hd{cursor:pointer;', 'with the toggle\'s flex row and pointer');
    has(CSS, '.sec-caret,.ja-hd > span:first-child{', 'and its caret entity sized and coloured as the caret');
    lacks(CSS, 'font-size:12.5px;font-weight:700;}\n.ja-hd .ja-n', 'the old white Job Admin bar is gone');
    const stat = (CSS.match(/\.ja-hd \.ja-n,\.desk-stat\{[^}]*\}/) || [''])[0];
    has(stat, 'text-transform:none', '⚠ the count and the line reset the bar\'s uppercase (as .stage-meta does)');
    has(stat, 'margin-left:auto', 'and sit at the right-hand end');
    has(stat, 'white-space:normal', 'and wrap rather than push a phone wide');
    has((CSS.match(/\.desk-fold \.sec-hdr\{[^}]*\}/) || [''])[0], 'flex-wrap:wrap', 'the bar wraps its line under the title on a phone');
    has((CSS.match(/\.desk-fold-body\{[^}]*\}/) || [''])[0], 'border-radius:0 0 4px 4px', 'the body closes the 4px bar above it');
    has((CSS.match(/\.ja-body\{[^}]*\}/) || [''])[0], 'border-radius:0 0 4px 4px', 'and so does Job Admin\'s');
    ['red', 'amber', 'ok', 'grey'].forEach((t) => ok(new RegExp('\\.desk-st-' + t + '\\{color:').test(CSS), 'the ' + t + ' tone is drawn'));
    // Job Admin's own markup is unchanged: steps 4, 15, 56, 57, 58, 65 and 73 press and read it.
    const ja = noComments(fn('renderJobAdmin'));
    has(ja, '\'<div class="ja-hd" onclick="toggleJobAdmin(\' + jobId + \')">\'', 'its header, class and press, as the browser steps find them');
    has(ja, "(open ? '&#9662;' : '&#9656;')", 'its caret entity');
  }

  group('A7 · one catalogue of the bars; a title names what its body draws');
  {
    const T = sandbox({ fns: ['deskFoldTitle'], vars: ['DESK_FOLDS'] });
    eq(Object.keys(T.DESK_FOLDS), ['releases', 'values', 'closing', 'history'], 'four bars, in the tab\'s order');
    eq(T.deskFoldTitle('releases', '<div id="inv-releases"></div>'), 'Releases & signed papers', 'Releases alone');
    eq(T.deskFoldTitle('releases', '<div id="inv-releases"></div><div class="card" id="inv-bequests"></div>'), 'Releases & signed papers · Beneficiaries & bequests',
      'with the bequests card drawn, the title names it');
    eq(T.deskFoldTitle('closing', '<div id="closeout-admin-7"></div><div id="inv-records"><div id="inv-ledger-card"></div><div id="inv-proceeds-card"></div><div id="inv-donations-card"></div></div>'),
      'Closing the job: close-out call, vendor ratings, Disposition Ledger, proceeds, donations', '⚠ an estate\'s Closing title names every card inside');
    eq(T.deskFoldTitle('closing', '<div id="closeout-admin-7"></div><div id="inv-records"><div id="inv-contents-card"></div><div id="inv-donations-card"></div></div>'),
      'Closing the job: close-out call, vendor ratings, Contents Record, donations', '⚠ a living job\'s names the Contents Record, the one paper the family signs');
    eq(T.deskFoldTitle('closing', '<div id="inv-records" data-job="7"></div>'), 'Closing the job', 'nothing drawn, nothing named');
    eq(T.deskFoldTitle('values', 'X'), 'Values & appraisals', 'Values');
    eq(T.deskFoldTitle('history', 'X'), 'Removed items & snapshots', 'History');
    eq(T.deskFoldTitle('nope', 'X'), '', 'an unknown bar has no title');
  }
}

// ═══ B · THE ORDER ════════════════════════════════════════════════════════════
function groupB({ group, ok, eq, has, lacks }) {
  group('B1 · the order of an evening: the job today, Job Admin, tonight\'s items, the four bars, the summary last');
  {
    const D = desk();
    const h = D.render();
    ok(!D.log.renderErr, 'the desk renders (' + (D.log.renderErr || 'ok') + ')');
    const at = (needle) => h.indexOf(needle);
    const seq = [['the client line', 'id="m-hdr"'], ['the band', 'id="jband-slot-admin"'], ['the must-finds', 'id="sf-host-desk"'], ['Job Admin', 'id="m-ja"'],
      ['the work bar', 'id="inv-workbar"'], ['the vehicles still to bring in', 'id="m-import"'], ['the chips', 'id="inv-flagstrip"'], ['the filter', 'id="m-filter"'],
      ['the duplicate imports', 'id="m-dupimp"'], ['Possible duplicates', 'id="m-agdup"'], ['the rows', 'id="m-rows"'], ['the bulk bar', 'id="m-bulk"'],
      ['Releases', 'id="desk-fold-releases-7"'], ['Values', 'id="desk-fold-values-7"'], ['Closing', 'id="desk-fold-closing-7"'],
      ['Removed items & snapshots', 'id="desk-fold-history-7"'], ['the summary', 'id="inv-summary"']];
    seq.forEach(([what, n]) => ok(at(n) > -1, what + ' is drawn'));
    for (let i = 1; i < seq.length; i++) ok(at(seq[i - 1][1]) < at(seq[i][1]), '⚠ ' + seq[i - 1][0] + ' comes before ' + seq[i][0]);
    const top0 = (n) => (at(n) < 0 ? -1 : depthAt(h, h.lastIndexOf('<', at(n))));
    eq(top0('id="m-bulk"'), 0, '⚠⚠ the bulk bar is outside every wrapper, so it still sticks to the foot of the tab');
    eq(top0('id="inv-summary"'), 0, 'the summary is outside every bar, last');
    eq(top0('id="m-import"'), 0, 'the vehicles sit in the items, not in a bar');
    eq(top0('id="desk-fold-releases-7"'), 0, 'and each bar is a direct child of the tab, not nested in another');
    // what sits in which bar
    has(inner(h, 'desk-body-releases-7'), 'id="inv-releases"', 'Releases holds the releases card');
    ok(inner(h, 'desk-body-releases-7').indexOf('id="inv-releases"') < inner(h, 'desk-body-releases-7').indexOf('id="inv-bequests"'), '…then the bequests card');
    has(inner(h, 'desk-body-releases-7'), 'id="inv-ben-list-7"', '⚠ the beneficiaries datalist is in the page, open or shut, for every To a person box');
    const vals = inner(h, 'desk-body-values-7');
    ok(vals.indexOf('id="m-roster"') > -1 && vals.indexOf('id="m-roster"') < vals.indexOf('<div id="inv-guardrail">'),
      '⚠ Values: the roster FIRST, then the guardrail, so its "add them to the roster above first" is true');
    has(vals, '<div id="inv-guardrail">GUARDRAIL</div>', 'the guardrail\'s host, repainted by id');
    const close = inner(h, 'desk-body-closing-7');
    ok(close.indexOf('id="closeout-admin-7"') > -1 && close.indexOf('id="closeout-admin-7"') < close.indexOf('<div id="inv-records" data-job="7">'),
      '⚠ Closing: the close-out card (out of the evening\'s way at the top), then the close-out papers\' host');
    has(close, 'LEDGER', 'the ledger inside it');
    ok(at('id="closeout-admin-7"') > at('id="m-rows"'), 'the close-out card is no longer above the items');
    const hist = inner(h, 'desk-body-history-7');
    ok(hist.indexOf('REMOVED') > -1 && hist.indexOf('REMOVED') < hist.indexOf('id="inv-snapshots"'), 'History: removed items, then the snapshots');
    lacks(close + vals + hist + inner(h, 'desk-body-releases-7'), 'id="m-bulk"', 'no bar holds the bulk bar');
    // the titles, built from what each body drew
    eq(textOf(inner(h, 'desk-ttl-releases-7')), 'Releases & signed papers · Beneficiaries & bequests', 'an estate\'s Releases title names the bequests');
    eq(textOf(inner(h, 'desk-ttl-closing-7')), 'Closing the job: close-out call, vendor ratings, Disposition Ledger, proceeds, donations', 'Closing names its cards');
    eq(D.log.ja, 1, 'Job Admin is drawn once');
  }

  group('B2 · while the status lines are a placeholder, every bar with anything in it is drawn OPEN: nothing is hidden yet');
  {
    // ⚠ RESTATED BY THE NEXT GROUP OF THE BUILD, ON PURPOSE: the bars' lines and their open rules replace this.
    const D = desk();
    const h = D.render();
    ['releases', 'values', 'closing', 'history'].forEach((f) => {
      has(h, 'id="desk-body-' + f + '-7" style="display:;"', f + ' is drawn open');
      has(h, '<div class="desk-fold" id="desk-fold-' + f + '-7">', f + ' is shown');
    });
    const E = desk({}, { removed: '', snaps: '' });
    has(E.render(), '<div class="desk-fold" id="desk-fold-history-7" style="display:none;">', 'nothing removed and no snapshot: the history bar is hidden whole');
  }

  group('B3 · the Releases card keeps answering \'\' when it has nothing; the desk draws its host, hidden, so a repaint can fill it');
  {
    const D = desk({ svc: 'downsizing' }, { rel: '', bq: '' });
    const h = D.render();
    has(inner(h, 'desk-body-releases-7'), '<div id="inv-releases" style="display:none;"></div>', '⚠ the empty card\'s host is drawn, hidden, inside the Releases bar');
    eq(textOf(inner(h, 'desk-ttl-releases-7')), 'Releases & signed papers', 'a living job\'s title names no bequests');
    // _invRefreshReleases fills that host, and puts an emptied card back to it.
    const dom = liveDom(7);
    dom.html = '<div id="wrap"><div id="inv-releases" style="display:none;"></div></div>';
    const S = { rel: '<div class="card" id="inv-releases">Approval request</div>' };
    const R = lift(['_invRefreshReleases'], { document: dom, _invJob: () => ({ id: 7 }), _jobInvRefs: () => [], _renderInvReleasesCard: () => S.rel });
    R._invRefreshReleases(7);
    eq(dom.html, '<div id="wrap"><div class="card" id="inv-releases">Approval request</div></div>', '⚠ a card that starts to say something is drawn where the host stood');
    S.rel = '';
    R._invRefreshReleases(7);
    eq(dom.html, '<div id="wrap"><div id="inv-releases" style="display:none;"></div></div>', '⚠ a card that empties is put back to the hidden host, not left saying what is no longer true');
    // the source pins other suites read (p19-releases)
    const tab = noComments(fn('renderInventoryTab'));
    has(tab, '_renderInvReleasesCard(job, all)', 'the desk draws the releases card');
    has(tab, '_renderInvBequestCard(job, all)', 'and the bequests card');
  }

  group('B4 · Home Prep\'s desk is unchanged: header, band, must-finds, Job Admin and the close-out, and no bar');
  {
    const D = desk({ svc: 'prep' });
    const h = D.render();
    lacks(h, 'desk-fold', 'no fold bar on a prep job');
    ['id="m-hdr"', 'id="sf-host-desk"', 'id="m-ja"', 'id="closeout-admin-7"'].forEach((n) => has(h, n, 'prep draws ' + n));
    ok(h.indexOf('id="m-ja"') < h.indexOf('id="closeout-admin-7"'), 'the close-out under Job Admin, open, as before');
    lacks(h, 'WORKBAR', 'and none of the inventory');
  }

  group('B5 · the literals other suites pin are where they read them');
  {
    const r = noComments(fn('renderInventoryTab'));
    const iPrep = r.indexOf("if (job.svc === 'prep') {");
    ok(iPrep > 0 && r.indexOf('var top = jobInfoHeaderHtml(job)') < iPrep, 'the header and band come before the prep arm (job-closeout)');
    has(r, "'<div id=\"jband-slot-admin\">' + jobProgressBlockHtml(jobId, 'admin')", 'the band literal (job-closeout)');
    ok(r.indexOf("_sfHost('sf-host-desk', job)") > -1 && r.indexOf("_sfHost('sf-host-desk', job)") < r.indexOf('renderJobAdmin(jobId, job)'), 'the must-finds above Job Admin (intake-house-flags)');
    has(r, "'<div id=\"inv-records\" data-job=\"' + esc(String(jobId)) + '\">' + _renderLedgerCards(job, all) + '</div>'", 'the close-out papers\' host, exactly (p19-ledger)');
    ok(r.indexOf('_agDupHtml(jobId, all)') > -1 && r.indexOf('_agDupHtml(jobId, all)') < r.indexOf('+ body'), 'Possible duplicates before the rows (agent-inventory)');
    const raw = SRC.slice(SRC.indexOf('function renderInventoryTab('));
    has(raw.slice(0, 900), '_invEnsureLoaded(jobId)', 'the render hydrates first (loading)');
    eq((r.match(/_invApplyWhenDefault\(jobId, all\)/g) || []).length, 1, 'one once-per-client filter default (p15-followups)');
    ok(r.indexOf('collectionLinesEnsure(jobId)') < r.indexOf('_invAssignItemNos(jobId)'), 'collections before the numbering (room-check)');
    ok(r.indexOf('_renderInventoryImportPanel(jobId)') > r.indexOf('_renderInvWorkbar(job, all)') && r.indexOf('_renderInventoryImportPanel(jobId)') < r.indexOf('+ body'),
      'the vehicles panel sits under the work bar, above the rows');
    eq((r.match(/fold\('(releases|values|closing|history)'/g) || []).length, 4, 'four bars, each drawn once');
  }

  group('B6 · Open the desk opens the Releases bar BEFORE the tab draws, then scrolls to the card');
  {
    const seen = {};
    const dom = {
      querySelector: (s) => (/inventory/.test(s) ? { click() { seen.atClick = JSON.stringify(D._deskOpen); } } : null),
      getElementById: (id) => (id === 'inv-job' ? { value: '7' } : id === 'inv-releases' ? { scrollIntoView(o) { seen.scroll = o; } } : null),
    };
    const D = lift(['openJobDeskFor'], { document: dom, jobs: [{ id: 7 }], setCurrentJob() {}, closeClientDashboard() {} });
    const r = attempt(() => D.openJobDeskFor(7));
    ok(r.ok && r.val === true, 'the press lands on the desk (' + (r.err || r.val) + ')');
    eq(seen.atClick, '{"7:releases":true}', '⚠⚠ the bar is recorded open before the nav button draws the tab, so the render draws it open');
    eq(seen.scroll, { block: 'start' }, 'and the card is scrolled to');
  }

  group('B7 · a snapshot just taken opens Removed items & snapshots before the render, so the new row is in view');
  {
    const seen = [];
    const job = { id: 7, invSnapshots: [] };
    // Read defensively: on a revert that drops the open, `_deskOpen` is not even reached from the snapshot's call graph.
    const hist = () => (S._deskOpen || {})['7:history'];
    const S = lift(['takeInventorySnapshot'], { jobs: [job], document: domStub({}), _invAssignItemNos: () => [], _snapItemOf: () => ({}), estateValueDate: () => '',
      _jobTouch() {}, saveJobs() {}, syncJobToSheets() {}, renderInventoryTab() { seen.push(hist()); } });
    S.window.prompt = () => 'Filed with court';
    const r = attempt(() => S.takeInventorySnapshot(7));
    ok(r.ok, 'the snapshot runs (' + (r.err || 'ok') + ')');
    eq(job.invSnapshots.length, 1, 'fixture: a snapshot was taken');
    eq(seen, [true], '⚠ the history bar is open when the tab redraws');
    S.window.prompt = () => null;
    seen.length = 0;
    if (S._deskOpen) S._deskOpen['7:history'] = false;
    attempt(() => S.takeInventorySnapshot(7));
    eq([seen.length, hist()], [0, false], 'Cancel takes nothing and opens nothing');
  }

  group('B8 · Show summary & rollups scrolls the summary into view when it opens (it is the foot of the tab now)');
  {
    const scrolls = [];
    const R = lift(['invToggleRollups'], { renderInventoryTab() {}, document: { getElementById: (id) => (id === 'inv-summary' ? { scrollIntoView(o) { scrolls.push(o); } } : null) } });
    attempt(() => R.invToggleRollups());
    eq([R._invShowRoll, scrolls.length], [true, 1], '⚠ opened: scrolled to');
    attempt(() => R.invToggleRollups());
    eq([R._invShowRoll, scrolls.length], [false, 1], 'shut: no scroll');
  }
}
