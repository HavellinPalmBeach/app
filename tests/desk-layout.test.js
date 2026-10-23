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
//   C, D, E · each bar's line and when it opens (G2).
//   F · the Urgent strip (G3): the desk's derived lines split by one rule, deskNowLine, between the strip above the band, the
//       incident banner and Job Admin, each line in exactly one; the strip's place on every service; I called Anthony pressed
//       on the strip with no Job Plan card in the page; Job Admin's count repainted by id.
//   H · the trims (G4): the client line's Target Start only where no schedule strip is drawn; the work bar's line under its
//       title the HVL id alone; one Send request on the desk for every waiting line (the Releases card's) and one for a
//       selection (the bulk bar's), the work bar none; the tab's subtitle in the new order.
//
// Each later group of the build adds its own groups here.
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
// The closure walk is the slow part, so it is remembered per roots-and-stubs (each call is still a fresh sandbox).
const _closures = new Map();
function lift(roots, stubs) {
  const key = roots.join(',') + '|' + Object.keys(stubs || {}).sort().join(',');
  if (!_closures.has(key)) _closures.set(key, closure(roots, Object.keys(stubs || {})));
  const c = _closures.get(key);
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
      get innerHTML() { const o = this.outerHTML; const t = tagAt(id); return o.slice(t.end - t.start, o.lastIndexOf('</')); },
      set innerHTML(v) { const o = this.outerHTML; const t = tagAt(id); const close = o.lastIndexOf('</'); html = html.slice(0, t.end) + v + html.slice(t.start + close); },
      insertAdjacentHTML(pos, v) {
        const o = this.outerHTML; const t = tagAt(id); const close = t.start + o.lastIndexOf('</');
        const at = { beforebegin: t.start, afterbegin: t.end, beforeend: close, afterend: t.start + o.length }[pos];
        html = html.slice(0, at) + v + html.slice(at);
      },
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
// ⚠ SINCE THE BARS' LINES (2026-10-22): a line on the estate waits on written approval, so Releases opens by its own rule
// (Anthony's Q2), and the job has a snapshot, so the history bar is drawn (shut: it never opens by itself).
const ESTATE = () => ({ id: 7, name: 'Ashworth', svc: 'probate', won: true, invSnapshots: [{ ts: 1, label: 'Filed', count: 2 }] });
const REFS = () => [{ stableId: 'a', label: 'inventory', objectName: 'Clock' }, { stableId: 'b', label: 'inventory', objectName: 'Desk', disposition: 'Donate' }];
function desk(jobO, cards, opt) {
  opt = opt || {};
  const dom = liveDom(7);
  const S = Object.assign({ rel: '<div class="card" id="inv-releases">REL</div>', bq: '<div class="card" id="inv-bequests">BQ<datalist id="inv-ben-list-7"></datalist></div>',
    ledger: '<div class="card" id="inv-ledger-card">LEDGER</div><div class="card" id="inv-proceeds-card">PS</div><div class="card" id="inv-donations-card">DON</div>',
    removed: '<div class="card" id="m-removed">REMOVED</div>', snaps: '<div class="card" id="inv-snapshots">SNAPS</div>', vehicles: '<div class="card" id="m-import">VEHICLES</div>',
    bulk: '<div id="m-bulk" style="position:sticky;bottom:0;">BULK</div>' }, cards || {});
  const log = { renders: 0, thumbs: [], ja: 0 };
  const job = Object.assign(ESTATE(), jobO || {});
  const refs = opt.refs || REFS();
  const stubs = Object.assign({
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
    jobPlanStore: {}, vendorDirectory: [], SHEETS_SYNC_URL: '', _invCloudSeen: {},
  }, opt.stubs || {});
  // `opt.real`: the cards drawn by their real functions rather than a marker (the Urgent strip's group reads Job Admin's count).
  (opt.real || []).forEach((k) => { delete stubs[k]; });
  const C = lift(['renderInventoryTab', 'toggleDeskFold', 'deskFoldOpen'].concat(opt.real || [], opt.roots || []), stubs);
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
    groupC({ group, ok, eq, has, lacks });
    groupD({ group, ok, eq, has, lacks });
    groupE({ group, ok, eq, has, lacks });
    groupF({ group, ok, eq, has, lacks });
    groupH({ group, ok, eq, has, lacks });
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
    eq(D.dom.getElementById('desk-body-releases-7').style.display, '', 'fixture: the Releases bar is drawn open (a line waits on written approval, Q2)');
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
    // ⚠ restated 2026-10-22: Closing opens by itself at the close only, so the fixture is a job handed over.
    const D = desk({ status: 'closed', deliveredOn: '2026-10-20' });
    D.render();
    eq(D.dom.getElementById('desk-body-closing-7').style.display, '', 'fixture: at the close the Closing bar opens by itself');
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
    eq(D.dom.getElementById('desk-body-history-7').style.display, 'none', 'fixture: the history bar is drawn shut (it never opens by itself)');
    attempt(() => D.C.toggleDeskFold(7, 'history'));
    attempt(() => D.C.toggleDeskFold(7, 'history'));
    eq(D.dom.getElementById('desk-body-history-7').style.display, 'none', 'fixture: opened, then shut by hand');
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

  group('B2 · each bar is drawn open or shut by its own rule, and a bar with nothing in it is hidden whole');
  {
    // ⚠ RESTATED 2026-10-22 (the placeholder drew every bar open; the lines and the open rules replaced it, as B2 said
    // they would): on this fixture a line waits on written approval, so Releases opens (Q2); nothing waits on an
    // appraisal, the job is not at its close, and history never opens by itself.
    const D = desk();
    const h = D.render();
    has(h, 'id="desk-body-releases-7" style="display:;"', 'releases is drawn open: a line waits on written approval');
    ['values', 'closing', 'history'].forEach((f) => has(h, 'id="desk-body-' + f + '-7" style="display:none;"', f + ' is drawn shut'));
    ['releases', 'values', 'closing', 'history'].forEach((f) => has(h, '<div class="desk-fold" id="desk-fold-' + f + '-7">', f + ' is shown'));
    eq(textOf(inner(h, 'desk-stat-releases-7')), '1 item needs written approval: send a request · no beneficiaries recorded', 'and the Releases bar says why, in its line');
    eq(textOf(inner(h, 'desk-stat-history-7')), '0 removed · 1 snapshot', 'the history bar counts what it holds');
    const E = desk({ invSnapshots: [] }, { removed: '', snaps: '' });
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

// ═══ G2 · THE BARS' LINES AND OPEN RULES (2026-10-22) ═══════════════════════════════════════════════════════════════
// deskFoldState is the one reader of what each bar says shut and of when it opens by itself, run here on the REAL
// readers (the approval request, the signing acts, the sign-out list, the receipts, the bequests, the guardrail, the
// hand-offs, the close-out card, the close's refusals, the papers), never on a figure worked out by hand.
const TODAY = '2026-10-22';
const T0 = Date.parse('2026-10-20T16:00:00Z');
const ON = (d) => Date.parse(d + 'T16:00:00Z');
const LINE = (id, o) => Object.assign({ stableId: id, label: 'inventory', collId: null, roomIdx: 0, status: 'uploaded', ts: T0, updatedAt: T0,
  objectName: 'Thing ' + id, category: 'Furniture', qty: 1 }, o || {});
const PROBATE = (o) => Object.assign({ id: 7, hvlId: 'HVL-0007', name: 'Ashworth', addr: '14 Seaspray Ave', svc: 'probate', status: 'active', won: true,
  matterType: 'probate', executor: 'Ruth Adler', executorEmail: 'ruth@adler.example', driveFolder: 'https://drive.google.com/drive/folders/R7',
  docState: {}, at: {}, payments: [] }, o || {});
const LIVING = (o) => Object.assign({ id: 7, hvlId: 'HVL-0007', name: 'Margaret Ellis', addr: '9 Dunbar Rd', svc: 'downsizing_move', status: 'active', won: true,
  email: 'meg@ellis.example', docTier: 'contents', driveFolder: 'https://drive.google.com/drive/folders/R7', docState: {}, at: {}, payments: [] }, o || {});
// The four bars' answers for one job and its lines, on the real readers. `o`: {url, seen, est, plan} for the unread case,
// the estimate store and the plan store.
const BARS_ROOTS = ['deskFoldState', 'jobCloseBlockers', '_renderInvReleasesCard', '_renderInvBequestCard', '_renderAppraisalGuardrail'];
const BARS_STATE = ['jobs', '_photoRefs', 'estimateStore', 'jobPlanStore', 'vendorDirectory', 'SHEETS_SYNC_URL', '_invCloudSeen', 'document'];
let _barsCl = null;   // the closure is walked once; each call is a fresh sandbox over it
function bars(job, rows, o) {
  o = o || {};
  _barsCl = _barsCl || closure(BARS_ROOTS, BARS_STATE);
  const C = sandbox({ fns: _barsCl.fns, vars: _barsCl.vars, stubs: {
    jobs: [job], _photoRefs: { 7: rows }, estimateStore: o.noEst ? {} : { 7: o.est || { estimate: { svc: job.svc, rooms: [] } } }, jobPlanStore: o.plan || {},
    vendorDirectory: [], SHEETS_SYNC_URL: o.url || '', _invCloudSeen: o.seen || {}, document: domStub({}),
  } });
  const all = rows.filter((r) => !r.deletedAt);
  const at = (f) => { const r = attempt(() => C.deskFoldState(7, job, f, all, TODAY)); return r.ok ? r.val : { show: null, openByDefault: null, bits: [], err: r.err }; };
  const out = { C, all, releases: at('releases'), values: at('values'), closing: at('closing'), history: at('history') };
  out.line = (f) => out[f].bits.map((b) => b.text).join(' · ');
  out.tones = (f) => out[f].bits.map((b) => b.tone);
  return out;
}

function groupC({ group, ok, eq, has, lacks }) {
  group('C1 · the first evening: undecided lines, nothing recorded — every bar shut, and each says what it holds');
  {
    const B = bars(PROBATE(), [LINE('a'), LINE('b')]);
    ['releases', 'values', 'closing', 'history'].forEach((f) => ok(!B[f].err, f + ' answers (' + (B[f].err || 'ok') + ')'));
    eq([B.releases.show, B.releases.openByDefault], [true, false], 'Releases: drawn (an estate always has its bequests card), shut');
    eq(B.line('releases'), '✓ nothing waiting · no beneficiaries recorded', 'nothing waits, and the empty roster is said');
    eq(B.tones('releases'), ['ok', 'grey'], 'the ✓ green, the roster grey');
    eq([B.values.show, B.values.openByDefault, B.line('values')], [true, false, '✓ nothing needs an appraisal · no appraisers yet'], 'Values: shut, nothing waits');
    eq([B.closing.show, B.closing.openByDefault, B.line('closing'), B.tones('closing')], [true, false, 'close-out 0 of 3 done', ['grey']],
      '⚠ Closing: drawn (the close-out card), shut, grey before the close');
    eq(B.history.show, false, 'History: nothing removed and no snapshot, so not drawn');
  }

  group('C2 · items decided: lines wait on written approval and no request carried them — Releases opens (Q2)');
  {
    const rows = [LINE('a', { disposition: 'Sell', channel: 'Sotheby’s' }), LINE('b', { disposition: 'Donate', channel: 'Goodwill' }), LINE('c', { disposition: 'Keep' })];
    const B = bars(PROBATE(), rows);
    eq(B.releases.openByDefault, true, '⚠⚠ opens by itself: a request is owed');
    eq(B.line('releases'), '2 items need written approval: send a request · no beneficiaries recorded', 'and says so, the Keep line not counted');
    eq(B.tones('releases')[0], 'amber', 'in amber');
    lacks(B.line('releases'), 'sign out', 'nothing is ready to sign out until the approval is on record');
    const one = bars(PROBATE(), [LINE('a', { disposition: 'Junk' })]);
    eq(one.line('releases').split(' · ')[0], '1 item needs written approval: send a request', 'one line, in the singular');
  }

  group('C3 · the request drafted: it waits on I’ve sent it — open; sent: shut, and the lines still unsigned are counted');
  {
    const rows = () => [LINE('a', { disposition: 'Sell', channel: 'Sotheby’s' }), LINE('b', { disposition: 'Donate', channel: 'Goodwill' })];
    const req = { to: ['ruth@adler.example'], cc: [], noEmail: [], stableIds: ['a', 'b'], asked: 2, ratify: 0 };
    const drafted = PROBATE({ docState: { approvalRequest: { draftedAt: '2026-10-21T20:00:00.000Z', provider: 'gmail', req } } });
    let B = bars(drafted, rows());
    eq([B.releases.openByDefault, B.line('releases')], [true, 'Request drafted: tap I’ve sent it · no beneficiaries recorded'], '⚠ drafted: open, and the tap named');
    lacks(B.line('releases'), 'need written approval', 'the lines it carries are not "owed" a request again');
    const sent = PROBATE({ docState: { approvalRequest: { draftedAt: '2026-10-21T20:00:00.000Z', sentAt: '2026-10-21T21:00:00.000Z', req } } });
    B = bars(sent, rows());
    eq([B.releases.openByDefault, B.line('releases'), B.tones('releases')[0]], [false, '2 on the request still unsigned · no beneficiaries recorded', 'grey'],
      'sent: shut, grey, what is out for signature counted');
    // A line decided after the request went: owed a fresh one, so the bar opens again.
    B = bars(sent, rows().concat([LINE('c', { disposition: 'Junk' })]));
    eq([B.releases.openByDefault, B.line('releases')], [true, '1 item needs written approval: send a request · 2 on the request still unsigned · no beneficiaries recorded'],
      '⚠ a line the request never carried opens it again');
  }

  group('C4 · signed back: an approval recorded with no copy filed opens it; the sign-out reads amber until today’s paper is filed');
  {
    const signed = (o) => Object.assign({ authBy: 'Ruth Adler', approvalDate: '2026-10-21' }, o);
    const rows = [LINE('a', signed({ disposition: 'Sell', channel: 'Sotheby’s' })), LINE('b', signed({ disposition: 'Donate', channel: 'Goodwill' }))];
    let B = bars(PROBATE(), rows);
    eq(B.releases.openByDefault, true, '⚠⚠ a signed approval with no copy filed opens the bar (Q2)');
    eq(B.line('releases'), '1 signed approval not filed to Drive · 2 ready to sign out · no beneficiaries recorded', 'and says what is owed');
    eq(B.tones('releases').slice(0, 2), ['amber', 'amber'], 'the sign-out amber: nothing is filed for either taker today');
    const filedApproval = { id: 's1', kind: 'approval', ref: '2026-10-21 Ruth Adler', signedOn: '2026-10-21', stableIds: ['a', 'b'], filedAt: ON('2026-10-21') };
    B = bars(PROBATE({ signedRecords: [filedApproval] }), rows);
    eq([B.releases.openByDefault, B.line('releases')], [false, '2 ready to sign out · no beneficiaries recorded'], 'the copy filed: shut, the sign-out still said');
    eq(B.tones('releases')[0], 'amber', 'amber while a ready taker has no paper today');
    // Sotheby's signed for its line today; Goodwill has a paper of today too (an earlier list), so nothing ready is unpapered.
    const pick = { id: 'p1', kind: 'pickup', ref: 'Sotheby’s', stableIds: ['a'], filedAt: ON(TODAY) };
    const don = { id: 'd1', kind: 'donation', ref: 'Goodwill', stableIds: [], filedAt: ON(TODAY) };
    B = bars(PROBATE({ signedRecords: [filedApproval, pick, don] }), rows);
    eq([B.line('releases'), B.tones('releases')[0]], ['1 ready to sign out · no beneficiaries recorded', 'grey'], 'a paper filed today for every ready taker: grey');
    // A release to a person is said once, as its receipt owed; its taker's want of a paper does not colour the sign-out.
    const ann = LINE('d', signed({ disposition: 'Distribute', channel: 'Ann Adler' }));
    B = bars(PROBATE({ signedRecords: [filedApproval, pick, don] }), rows.concat([ann]));
    eq([B.line('releases'), B.tones('releases').slice(0, 2)], ['1 signed receipt owed · 1 ready to sign out · no beneficiaries recorded', ['amber', 'grey']],
      '⚠ the receipt owed in amber; the sign-out still grey (Goodwill has today\'s paper; Ann\'s line is the receipt, already said)');
  }

  group('C5 · the estate\'s own owed papers: ratification, receipts, and the bequest checks, each named once');
  {
    // #a left without approval (ratification owed); #b released to a person with no receipt; #c matched to a bequest and
    // proposed for sale; #d flagged Specific Bequest with no bequest behind it.
    const rows = [LINE('a', { disposition: 'Sell', channel: 'Sotheby’s', dispDate: '2026-10-19' }),
      LINE('b', { disposition: 'Distribute', channel: 'Ann Adler', authBy: 'Ruth Adler', approvalDate: '2026-10-18' }),
      LINE('c', { disposition: 'Auction', channel: 'Christie’s', flagBequest: true }), LINE('d', { flagBequest: true, disposition: 'Keep' })];
    const job = PROBATE({ beneficiaries: [{ id: 'b1', name: 'Ann Adler' }], bequests: [{ id: 'q1', description: 'the clock', beneficiaryId: 'b1', stableIds: ['c'] },
      { id: 'q2', description: 'the piano', beneficiaryId: 'b1', stableIds: [] }],
      signedRecords: [{ id: 's1', kind: 'approval', ref: '2026-10-18 Ruth Adler', signedOn: '2026-10-18', stableIds: ['b'], filedAt: ON('2026-10-18') }] });
    const B = bars(job, rows);
    eq(B.line('releases'), '1 item needs written approval: send a request · 1 for ratification · 1 signed receipt owed · 1 designated item going elsewhere · '
      + '1 flagged bequest with no bequest behind it · 1 bequest not yet found',
      '⚠ each owed paper once: #a under ratification (not again as needing approval), #c needing approval, #b its receipt');
    eq(B.releases.openByDefault, true, 'open: #c is owed a request');
  }

  group('C6 · at the close: Closing opens, and names everything Close job refuses on, each by name');
  {
    const rows = [LINE('a', { disposition: 'Keep' })];
    const est = { estimate: { svc: 'probate', rooms: [{ idx: 0, name: 'Study' }] } };
    const plan = { 7: { rooms: { 0: { status: 'cleared' } } } };
    const blockers = { vendorSourcing: { m: { vendorId: 'v1', vendorName: 'Ace Movers', status: 'Confirmed' } },
      accessItems: [{ id: 'k1', kind: 'key', label: 'Front door', qty: 1 }],
      incidents: [{ id: 'i1', entry: 'report', kind: 'injury', occurredOn: '2026-10-19', recordedAt: 1 }] };
    const mid = { payments: [{ uid: 'p1', stage: 'midpoint', amount: 5000, method: 'wire', receivedOn: '2026-10-15' }] };
    // Every room cleared and the midpoint paid: the Close-out stage (planCurrentStage), the job still active.
    let B = bars(PROBATE(Object.assign({}, blockers, mid)), rows, { est, plan });
    eq(B.closing.openByDefault, true, '⚠⚠ the Close-out stage opens it');
    eq(B.line('closing'), '1 vendor not yet rated · 1 key or access item still held · 1 incident open · Disposition Ledger not signed yet · close-out 0 of 3 done',
      'naming the vendor, the key, the incident, and the ledger to be signed');
    eq(B.tones('closing').slice(0, 4), ['amber', 'amber', 'amber', 'amber'], 'each amber');
    eq(B.C.jobCloseBlockers(PROBATE(Object.assign({}, blockers, mid))).length, 3, 'fixture: Close job refuses on exactly those three');
    // The midpoint paid but a room not cleared: mid-job, shut, grey, no blocker named (they are not owed yet).
    B = bars(PROBATE(Object.assign({}, blockers, mid)), rows, { est, plan: { 7: { rooms: { 0: { status: 'locked' } } } } });
    eq([B.closing.openByDefault, B.line('closing'), B.tones('closing')], [false, 'close-out 0 of 3 done', ['grey']],
      '⚠⚠ NOT on the band\'s lit row: mid-job (Work complete is lit from the midpoint payment) it stays shut and grey');
    // Handed over, closed with the deposit retained, lost: the close, whatever the rooms say.
    [['deliveredOn', PROBATE({ deliveredOn: '2026-10-20', status: 'closed' })], ['closed_retained', PROBATE({ status: 'closed_retained' })],
     ['lost', PROBATE({ status: 'lost', won: false })]].forEach(([what, j]) => {
      const b = bars(j, rows);
      eq(b.closing.openByDefault, true, what + ': open');
    });
    // A walkaway: the deposit retained, a key still held: named.
    B = bars(PROBATE({ status: 'closed_retained', accessItems: blockers.accessItems }), rows);
    has(B.line('closing'), '1 key or access item still held', 'a walkaway names the key still held');
  }

  group('C7 · Closing mid-job: amber where a line has left with its paper owed, red where a statement disagrees');
  {
    const rows = [LINE('a', { disposition: 'Sell', channel: 'Sotheby’s', gross: 500, fees: 50, dispDate: '2026-10-18' }),
      LINE('b', { disposition: 'Donate', channel: 'Goodwill', dispDate: '2026-10-15' }), LINE('c', { disposition: 'Sell', channel: 'Sotheby’s' })];
    let B = bars(PROBATE(), rows);
    eq(B.closing.openByDefault, false, 'shut mid-job');
    eq(B.line('closing'), '1 donated line gone with no receipt · 1 sold line gone on no statement · close-out 0 of 3 done · 0 of 1 donated line receipted · 1 sold line on no statement yet',
      'the donated line gone unreceipted and the sold line gone unstated, amber; the rest grey');
    eq(B.tones('closing'), ['amber', 'amber', 'grey', 'grey', 'grey'], 'in those tones');
    const st = { id: 'ps1', vendor: 'Sotheby’s', gross: 900, fees: 50, netPaid: 850, lines: [{ stableId: 'a', itemNo: 1 }] };
    B = bars(PROBATE({ proceedsStatements: [st] }), rows);
    eq(B.closing.openByDefault, true, '⚠ a statement that disagrees with its lines opens it');
    eq([B.line('closing').split(' · ')[0], B.tones('closing')[0]], ['1 proceeds statement disagrees with its lines', 'red'], 'in red, first');
  }

  group('C8 · Values: red as the guardrail on Formal, open while an item waits with no appraiser linked; the hand-offs');
  {
    const art = (o) => LINE('a', Object.assign({ objectName: 'Oil on canvas', category: 'Art & Décor', fmv: 9000 }, o));
    let B = bars(PROBATE({ docLevel: 'formal' }), [art()]);
    eq([B.values.openByDefault, B.line('values'), B.tones('values')], [true, '1 needs an appraisal (1 with no appraiser linked) · no appraisers yet', ['red', 'grey']],
      '⚠⚠ Formal, nobody linked: open, red');
    const sm = { appraisers: [{ id: 1, name: 'Jane Smith', credential: 'ASA' }] };
    B = bars(PROBATE(Object.assign({ docLevel: 'formal' }, sm)), [art({ apprId: 1 })]);
    eq([B.values.openByDefault, B.line('values')], [false, '1 needs an appraisal, each linked · 1 ready to hand to Jane Smith (under Releases & signed papers) · 1 appraiser'],
      'linked: shut, still red (the guardrail is red on Formal whatever is linked), the hand-off pointed to the sign-out list');
    eq(B.tones('values')[0], 'red', 'red');
    const out = { id: 'h1', kind: 'appraisal_out', ref: 'Jane Smith', stableIds: ['a'], signedOn: '2026-10-12', filedAt: ON('2026-10-12') };
    // gate706 'no': no Form 706, no dispute, so the documentation level is Standard and the guardrail amber.
    B = bars(PROBATE(Object.assign({ signedRecords: [out], gate706: 'no' }, sm)), [art({ apprId: 1 })]);
    eq(B.line('values'), '1 needs an appraisal, each linked · 1 out with Jane Smith since Oct 12, 2026 · 1 appraiser', 'out with the appraiser: since when');
    eq(B.tones('values')[0], 'amber', 'Standard: amber, as the guardrail');
    // A living job: the ⚑ tick is the flag.
    B = bars(LIVING(), [LINE('a', { needsAppr: true, objectName: 'Rolex' })]);
    eq([B.values.openByDefault, B.tones('values')[0]], [true, 'amber'], 'a living ⚑ line with nobody linked opens it, amber');
  }

  group('C9 · a cold device: until the manifest is read from the sheet every bar says "loading…", and none opens off the cache');
  {
    const rows = [LINE('a', { disposition: 'Sell', channel: 'Sotheby’s' }), LINE('x', { deletedAt: T0 })];
    const art = LINE('z', { objectName: 'Oil on canvas', category: 'Art & Décor', fmv: 9000 });
    let B = bars(PROBATE({ docLevel: 'formal', invSnapshots: [{ ts: 1 }] }), rows.concat([art]), { url: 'https://sync.example.test/exec', seen: {} });
    ['releases', 'values', 'closing', 'history'].forEach((f) => {
      eq([B.line(f), B.tones(f)], ['loading…', ['grey']], '⚠⚠ ' + f + ': "loading…", never a ✓ or a count of nothing');
      eq(B[f].openByDefault, false, f + ': does not open by itself off the cached copy');
    });
    eq([B.releases.show, B.values.show, B.history.show], [true, true, true], 'each bar is still drawn');
    B = bars(PROBATE({ docLevel: 'formal' }), rows.concat([art]), { url: 'https://sync.example.test/exec', seen: { 7: true } });
    eq([B.releases.openByDefault, B.values.openByDefault], [true, true], 'read: the rules apply');
    // Handed over: Closing opens off the job itself, which is not the manifest.
    B = bars(PROBATE({ deliveredOn: '2026-10-20', status: 'closed' }), rows, { url: 'https://sync.example.test/exec', seen: {} });
    eq([B.closing.openByDefault, B.line('closing')], [true, 'loading…'], 'a closed job\'s Closing opens, and still claims nothing about the papers');
  }

  group('C10 · Removed items & snapshots: counted in grey, and never open by itself');
  {
    const rows = [LINE('a'), LINE('x', { deletedAt: T0 }), LINE('y', { deletedAt: T0 })];
    const B = bars(PROBATE({ status: 'closed', deliveredOn: '2026-10-20', invSnapshots: [{ ts: 1 }, { ts: 2, voidedAt: 3, voidReason: 'wrong' }] }), rows);
    eq([B.history.show, B.history.openByDefault, B.line('history'), B.tones('history')], [true, false, '2 removed · 2 snapshots (1 voided)', ['grey', 'grey']],
      'drawn, shut even at the close, grey');
  }

  group('C12 · the close-out card is drawn only with the estimate on this device, and the Closing line says only what is drawn');
  {
    let B = bars(PROBATE(), [], { noEst: true });
    eq([B.closing.show, B.line('closing')], [false, ''], 'won, no estimate here and no lines: no close-out card, no papers, no Closing bar');
    B = bars(PROBATE(), [LINE('a')], { noEst: true });
    eq(B.closing.show, true, 'with a line, the papers\' cards are drawn: the bar is');
    lacks(B.line('closing'), 'close-out', '⚠ and its line never counts a close-out card it does not draw');
    B = bars(PROBATE({ won: false, status: 'approved' }), []);
    eq(B.closing.show, false, 'not won: no close-out card');
  }

  group('C11 · living work: no request ever owed and nothing signed — the Releases bar is not drawn');
  {
    let B = bars(LIVING(), [LINE('a'), LINE('b', { disposition: 'Keep' })]);
    eq(B.releases.show, false, 'a living job with nothing leaving: no Releases bar');
    B = bars(LIVING(), [LINE('a', { disposition: 'Donate', channel: 'Goodwill' })]);
    eq([B.releases.show, B.releases.openByDefault], [true, true], 'a line leaving: drawn, and the client\'s approval is owed (Q2)');
    eq(B.line('releases'), '1 item needs written approval: send a request · 1 ready to sign out', '⚠ and on living work a line may be signed out meanwhile, so both are said');
    lacks(B.line('releases'), 'beneficiar', 'no estate words on living work');
  }
}

// Who calls `name` in live code: every function whose comment-stripped body has `name(`.
function callersOf(name) {
  const out = new Set();
  const re = new RegExp('\\b' + name.replace(/\$/g, '\\$') + '\\(', 'g');
  let m;
  while ((m = re.exec(SRC))) {
    const def = SRC.lastIndexOf('\nfunction ', m.index);
    if (def < 0) continue;
    const f = /^\nfunction\s+([A-Za-z0-9_$]+)\s*\(/.exec(SRC.slice(def, def + 120));
    if (!f || f[1] === name) continue;
    let body = '';
    try { body = codeOnly(fn(f[1])); } catch (e) { continue; }
    if (new RegExp('\\b' + name.replace(/\$/g, '\\$') + '\\(').test(body)) out.add(f[1]);
  }
  return [...out].sort();
}
// How many times a function's live body calls `name`.
const callsIn = (f, name) => (codeOnly(fn(f)).match(new RegExp('\\b' + name + '\\(', 'g')) || []).length;

function groupD({ group, ok, eq, has, lacks }) {
  group('D1 · one reader of each bar\'s line: deskFoldState, read by the render and the heads repaint, and nothing else');
  {
    eq(callersOf('deskFoldState'), ['_deskFoldHeadsRepaint', 'renderInventoryTab'], '⚠ the full render and the by-id repaint ask the one answer');
    eq(callsIn('renderInventoryTab', 'deskFoldState'), 1, 'once, inside the one fold() helper every bar is drawn through');
    eq(callersOf('_deskStatHtml'), ['_deskFold', '_deskFoldHeadsRepaint'], 'and the line is drawn by one painter, on both paths');
    eq(callersOf('_deskCloseoutShown'), ['deskFoldState', 'renderInventoryTab'], 'whether the close-out card is drawn: one question, asked by the render and the line');
  }

  group('D2 · no second copy of any rule: the line is built from the cards\' own functions');
  {
    const body = codeOnly(fn('deskFoldState'));
    ['approvalRequestState', 'draftOutstanding', 'invApprovalBatches', 'signoutGroups', 'invRatificationOwed', 'invReceiptOwed', 'invBequestChecks',
     '_invGuardrailItems', 'invAppraisalInProgress', 'isFormalDoc', 'invOutForAppraisal', '_jobAppraisers', 'proceedsReconciliation', 'closeoutState',
     'unratedVendorsForJob', 'accessHeldItems', 'openIncidents', 'ledgerDerivedLines', 'invRecordedGone', 'invDonationReceipted', 'donationGroups',
     'planCurrentStage', '_invRemovedRows'].forEach((r) => ok(new RegExp('\\b' + r + '\\(').test(body), 'reads ' + r));
    // the fields and lists those readers own, never read here directly
    ['authBy', 'approvalDate', 'INV_RELEASE_DISPOSITIONS', 'INV_SALE_DISPOSITIONS', 'apprId', 'fmv', 'flagBequest', 'channel', 'accessItemOpen',
     'accessItemsOf', 'incidentStatus', 'docLevel', 'stagePaidTotal', 'rooms'].forEach((t) =>
      ok(!new RegExp('\\b' + t + '\\b').test(body), 'no ' + t + ' of its own'));
    eq(callersOf('invBequestChecks'), ['_renderInvBequestCard', 'deskFoldState'], 'the bequests\' three checks: one definition, the card and the line');
    lacks(codeOnly(fn('_renderInvBequestCard')), 'INV_RELEASE_CAUTIONS', 'the card no longer works the checks out itself');
    eq(callersOf('accessHeldItems'), ['accessCloseBlocker', 'accessTerminalFlag', 'deskFoldState'], 'the keys held: one list, the refusal, the flag and the line');
    eq((SRC.match(/accessItemOpen\(x\.st\)/g) || []).length, 1, 'the held filter is written once');
  }

  group('D3 · the line agrees with the cards inside the bar, on every fixture');
  {
    const fixtures = [
      ['estate, first evening', PROBATE(), [LINE('a'), LINE('b')]],
      ['estate, decided', PROBATE(), [LINE('a', { disposition: 'Sell', channel: 'Sotheby’s' })]],
      ['estate, Formal, unlinked', PROBATE(), [LINE('a', { category: 'Art & Décor', fmv: 9000 })]],
      ['estate, Standard, linked', PROBATE({ gate706: 'no', appraisers: [{ id: 1, name: 'Jane Smith' }] }), [LINE('a', { category: 'Art & Décor', fmv: 9000, apprId: 1 })]],
      ['living, nothing leaving', LIVING(), [LINE('a', { disposition: 'Keep' })]],
      ['living, a line leaving', LIVING(), [LINE('a', { disposition: 'Donate', channel: 'Goodwill' })]],
      ['living, ⚑', LIVING(), [LINE('a', { needsAppr: true })]],
      ['living, empty', LIVING(), []],
    ];
    fixtures.forEach(([what, job, rows]) => {
      const B = bars(job, rows);
      const card = attempt(() => !!(B.C._renderInvReleasesCard(job, B.all) || B.C._renderInvBequestCard(job, B.all)));
      eq(B.releases.show, card.val, what + ': ⚠ the Releases bar is drawn exactly where either of its cards draws');
      const g = String(B.C._renderAppraisalGuardrail(job) || '');
      const tone = /a-err/.test(g) ? 'red' : /a-warn/.test(g) ? 'amber' : '';
      eq(B.tones('values').indexOf('red') >= 0 ? 'red' : B.tones('values').indexOf('amber') >= 0 ? 'amber' : '', tone, what + ': ⚠ the Values bar\'s tone is the guardrail\'s own');
    });
    // At the close, the line names exactly what Close job refuses on.
    const est = { estimate: { svc: 'probate', rooms: [] } };
    [[{}, 0], [{ vendorSourcing: { m: { vendorId: 'v1', vendorName: 'Ace', status: 'Confirmed' } } }, 1],
     [{ accessItems: [{ id: 'k1', kind: 'key', label: 'Door' }], incidents: [{ id: 'i1', entry: 'report', kind: 'damage', recordedAt: 1 }] }, 2]].forEach(([o, n]) => {
      const job = PROBATE(Object.assign({ deliveredOn: '2026-10-20', status: 'closed_retained' }, o));
      const B = bars(job, [], { est });
      const named = B.closing.bits.filter((b) => /not yet rated|still held|open$/.test(b.text)).length;
      eq([named, B.C.jobCloseBlockers(job).length], [n, n], '⚠ ' + n + ' refusal' + (n === 1 ? '' : 's') + ': each named on the line, no more and no fewer');
    });
  }

  group('D4 · the heads follow every by-id repaint of a card inside a bar');
  {
    ['_invRefreshRecords', '_invRefreshGuardrail', '_repaintCloseout', 'togglePlanTask'].forEach((f) =>
      eq(callsIn(f, '_deskFoldHeadsRepaint'), 1, f + ' ends with the bars\' lines'));
    eq(callsIn('_invRefreshReleases', '_deskFoldHeadsRepaint'), 2, '_invRefreshReleases on both of its paths');
    eq(callsIn('_invRefreshFromCloud', '_deskFoldHeadsRepaint'), 1, 'and a sheet read that changed nothing still ends the bars\' "loading…"');
    has(codeOnly(fn('_invSplitRepaint')), '_invRefreshRecords(jobId)', 'the split reaches them through the records\' repaint');
    has(codeOnly(fn('_invEdit')), '_invRefreshRecords(jobId)', 'and every edit on the row');
  }

  group('D5 · every pointer to a card inside a bar names the bar by its catalogue title (as the crew fold\'s fix sentence does)');
  {
    const T = sandbox({ fns: [], vars: ['DESK_FOLDS'] }).DESK_FOLDS;
    const R = T.releases.title, CL = T.closing.title, H = T.history.title;
    const amp = (t) => t.replace(/&/g, '&amp;');
    eq([R, CL, H], ['Releases & signed papers', 'Closing the job', 'Removed items & snapshots'], 'fixture: the titles');
    const P = lift(['jobCloseBlockers', 'ledgerCloseFlag', '_cpWhere', 'fileDispositionLedger', 'ledgerDerivedLines', 'donationReceiptLine', 'proceedsLine', 'proceedsReceivedLine', 'noDraftToConfirm'],
      { jobs: [], _photoRefs: { 7: [LINE('a', { disposition: 'Donate' }), LINE('b', { disposition: 'Sell' })] }, estimateStore: {}, jobPlanStore: {}, vendorDirectory: [] });
    const where = ', under ' + CL + ' on Job Admin & Inv';
    has(P.jobCloseBlockers(PROBATE({ vendorSourcing: { m: { vendorId: 'v1', vendorName: 'Ace', status: 'Confirmed' } } }))[0] || '',
      'The scorecard is in the Close-out card: on the Job Plan, and under ' + CL + ' on Job Admin & Inv.', 'the close\'s refusal');
    has(P.ledgerCloseFlag(PROBATE()), 'file the signed copy on the Disposition Ledger card' + where + '.', 'the close question\'s ledger flag');
    const CP = P.CLOSEOUT_PAPERS || {};
    eq(attempt(() => P._cpWhere(CP.ledger)).val, ' (under ' + CL + ' on Job Admin & Inv)', 'the close-out papers\' notices: the ledger');
    eq(attempt(() => P._cpWhere(CP.contents)).val, ' (under ' + CL + ' on Job Admin & Inv)', 'the Contents Record');
    eq(attempt(() => P._cpWhere(CP.incidents)).val, ' (Job Plan, In the house)', 'the Incident Record keeps its own place');
    has((P.ledgerDerivedLines(7, PROBATE())[0] || {}).detail, 'print it from the Disposition Ledger card' + where + ', have it signed', 'the ledger\'s derived line');
    has((P.ledgerDerivedLines(7, LIVING())[0] || {}).detail, 'file the signed copy on the Contents Record card' + where, 'the Contents Record\'s');
    has((P.donationReceiptLine(PROBATE(), P._photoRefs[7]) || {}).detail, 'on the Donations card' + where, 'the donations line');
    has((P.proceedsLine(PROBATE(), P._photoRefs[7]) || {}).detail, '— the Proceeds statements card' + where, 'the proceeds line');
    has((P.proceedsReceivedLine(PROBATE(), P._photoRefs[7]) || {}).detail, 'on the Proceeds statements card' + where, 'the proceeds received line');
    has(P.noDraftToConfirm(PROBATE({ docState: { approvalRequest: { req: { stableIds: [] } } } }), 'approvalRequest'), '(Job Admin & Inv, under ' + R + ')', 'the request\'s missing draft');
    // The rest are notices, confirms and titles inside handlers and rows, read off the live source, each counted.
    const src = (f) => codeOnly(fn(f)).length ? fn(f).split('\n').filter((l) => !l.trim().startsWith('//')).join('\n') : '';
    const count = (f, needle, n, what) => eq(src(f).split(needle).length - 1, n, what + ' (' + f + ')');
    count('sendApprovalRequest', 'tap “I’ve sent it” on the ' + R + ' card.', 1, 'the send\'s notice names the card, which is the bar\'s namesake');
    count('_renderInvRow', 'Check it back in under ' + R + ' on Job Admin & Inv', 1, 'the out-with-the-appraiser chip');
    count('_renderInvRow', 'file the signed copy under ' + R + ' on Job Admin & Inv.', 1, 'the no-signed-receipt chip');
    count('_renderInvRow', 'specific bequests card, under ' + amp(R) + ' on Job Admin &amp; Inv', 1, 'the bequest chip');
    count('_invEdit', 'Beneficiaries & specific bequests card, under ' + R + ' on Job Admin & Inv', 1, 'the bequest flag\'s refusal');
    count('planDerivedLines', 'under ' + amp(R) + ' on Job Admin &amp; Inv', 1, 'the Job Plan\'s receipts line');
    [['invRemoveLine', 1, ''], ['invBulkRemove', 2, ''], ['agentDropDuplicate', 1, ''], ['collectionUseLine', 1, ''],
     ['_collLineStatusHtml', 1, 'amp'], ['_agDupHtml', 1, 'amp'], ['_renderInvPanel', 1, 'amp'], ['_renderInvBulk', 1, 'amp']].forEach(([f, n, a]) =>
      count(f, 'Removed items, under ' + (a ? amp(H) + ' on Job Admin &amp; Inv' : H + ' on Job Admin & Inv') + ', gives', n, 'the way back from a removal'));
    // and none of the old places is still named in live code
    const live = SRC.split('\n').filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*') && !l.trim().startsWith('/*')).map((l) => l.replace(/\s\/\/\s.*$/, '')).join('\n');
    // (comments are about two fifths of this file: 0.60 measured on 2026-10-22, so a strip that ate code would fall well below half)
    ok(live.length > SRC.length * 0.5, 'fixture: the stripped source is most of the file');
    ['Releases card when', 'below the inventory', 'at the foot of this tab', 'at the foot of the tab, gives', 'Disposition Ledger card (Job Admin & Inv)',
     'Donations card, Job Admin & Inv', 'Removed items gives', 'Removed items below', 'Removed items on Job Admin', 'signed papers on the Job Admin &amp; Inv tab',
     'Close-out card on the Job Plan and on Job Admin'].forEach((old) => lacks(live, old, '⚠ no pointer still says "' + old + '"'));
  }
}

// What each bar shows over the items: whether it is drawn, open or shut, its line, its title and its caret.
function heads(html) {
  const tag = (id) => { const at = html.indexOf('id="' + id + '"'); return at < 0 ? null : html.slice(html.lastIndexOf('<', at), html.indexOf('>', at) + 1); };
  return ['releases', 'values', 'closing', 'history'].map((f) => {
    const id = f + '-7', w = tag('desk-fold-' + id), b = tag('desk-body-' + id);
    return { f, drawn: !!w && !/display:\s*none/.test(w), open: !!b && !/display:\s*none/.test(b),
             line: textOf(inner(html, 'desk-stat-' + id)), title: textOf(inner(html, 'desk-ttl-' + id)), caret: inner(html, 'desk-chev-' + id) };
  });
}
const TickDate = (t) => class extends Date { constructor(...a) { if (a.length) super(...a); else { t += 60000; super(t); } } static now() { t += 60000; return t; } };

function groupE({ group, ok, eq, has, lacks }) {
  // After a by-id repaint, the bars read exactly what a full render of the same data writes: the repaint is held to the
  // render, the way the split's repaint is held to it byte for byte (p14).
  const settle = (D, act) => {
    const before = heads(D.dom.html);
    const r = attempt(act);
    const partial = heads(D.dom.html);
    D.render();
    return { r, before, partial, full: heads(D.dom.html) };
  };
  const line = (H, f) => (H.filter((x) => x.f === f)[0] || {}).line;

  group('E1 · a recipient typed on the row (_invEdit channel): the Releases line follows, as a full render draws it');
  {
    const rows = [LINE('a', { disposition: 'Donate' }), LINE('b', { disposition: 'Keep' })];
    const D = desk(LIVING(), {}, { refs: rows, roots: ['_invEdit'], stubs: { savePhotoRefs() {}, _scheduleInventorySync() {}, showSyncBadge() {}, alert() {},
      _invRefreshSummary() {} } });
    D.render();
    eq(line(heads(D.dom.html), 'releases'), '1 item needs written approval: send a request', 'fixture: the donation is owed a request');
    const s = settle(D, () => D.C._invEdit(7, 'a', 'channel', { value: 'Goodwill', type: 'text' }));
    ok(s.r.ok, 'the edit runs (' + (s.r.err || 'ok') + ')');
    eq(line(s.partial, 'releases'), '1 item needs written approval: send a request · 1 ready to sign out', '⚠ the charity named: ready to sign out, said at once');
    eq(s.partial, s.full, '⚠⚠ every bar reads what a full render draws');
    eq(D.log.renders, 0, 'the edit drew no full render: it repainted by id');
  }

  group('E2 · a split (_invSplitRepaint) that leaves a line needing an appraisal: the Values bar opens and says so, as a full render');
  {
    const rows = [LINE('a', { objectName: 'Watch box', itemNo: 1 })];
    // One group and one room, drawn as markers with the ids the split looks them up by: the rows are not what is measured.
    const rowHtml = (r) => '<div id="row-' + r.stableId + '">ROW</div>';
    const D = desk(LIVING(), {}, { refs: rows, roots: ['_invSplitRepaint'], stubs: { _invRefreshSummary() {}, _invRefreshFlagStrip() {},
      _invPhotoSiblings: () => [], _renderInvRow: (j, r) => rowHtml(r),
      _invGroupItems: (j, items) => [{ key: 'G', items, rooms: [{ key: 'R', items }] }],
      _renderInvGroup: (j, g) => '<div id="g-G"><div id="gh-G">GH</div><div id="rm-GR"><div id="rmh-GR">RH</div>' + g.items.map(rowHtml).join('') + '</div></div>',
      _invGroupDomId: (k) => 'g-' + k, _invGroupHeadDomId: (k) => 'gh-' + k, _invRoomDomId: (g, r) => 'rm-' + g + r, _invRoomHeadDomId: (g, r) => 'rmh-' + g + r,
      _invRowDomId: (id) => 'row-' + id, _renderInvRoomHead: () => '<div id="rmh-GR">RH</div>', _renderInvGroupHead: () => '<div id="gh-G">GH</div>' } });
    D.render();
    const v0 = heads(D.dom.html).filter((x) => x.f === 'values')[0];
    eq([v0.open, v0.line], [false, '✓ nothing needs an appraisal · no appraisers yet'], 'fixture: Values shut, nothing waiting');
    // A collection's piece keeps the collection's ⚑ (collectionPieceOf): the split adds a line flagged for a specialist.
    const piece = LINE('a2', { objectName: '', needsAppr: true, derivedFrom: 'a', ts: T0 + 1 });
    D.C._photoRefs[7].push(piece);
    const s = settle(D, () => D.C._invSplitRepaint(7, piece));
    ok(s.r.ok, 'the repaint runs (' + (s.r.err || 'ok') + ')');
    const v = s.partial.filter((x) => x.f === 'values')[0];
    eq([v.open, v.line], [true, '1 needs an appraisal (1 with no appraiser linked) · no appraisers yet'], '⚠ the bar opened by its rule, and its line moved');
    eq(s.partial, s.full, '⚠⚠ every bar reads what a full render draws');
  }

  group('E3 · a tick on the close-out card (togglePlanTask): the Closing line follows');
  {
    const est = { estimate: { svc: 'probate', rooms: [] } };
    const D = desk(PROBATE(), {}, { refs: [LINE('a')], roots: ['togglePlanTask'], stubs: { estimateStore: { 7: est }, saveJobPlan() {} } });
    D.render();
    eq(line(heads(D.dom.html), 'closing'), 'close-out 0 of 3 done', 'fixture');
    const s = settle(D, () => D.C.togglePlanTask(7, 'satisfaction_call', true, null));
    ok(s.r.ok, 'the tick runs (' + (s.r.err || 'ok') + ')');
    eq(line(s.partial, 'closing'), 'close-out 1 of 3 done', '⚠ the call ticked: the shut bar says so');
    eq(s.partial, s.full, '⚠⚠ every bar reads what a full render draws');
  }

  group('E4 · the request drafted (sendApprovalRequest\'s tail) opens Releases, a person\'s shut aside; I\'ve sent it (invMarkRequestSent) follows');
  {
    const rows = [LINE('a', { disposition: 'Sell', channel: 'Sotheby’s', itemNo: 1 }), LINE('b', { disposition: 'Donate', channel: 'Goodwill', itemNo: 2 })];
    const notices = [];
    const D = desk(PROBATE(), {}, { refs: rows, roots: ['sendApprovalRequest', 'invMarkRequestSent'], stubs: {
      SHEETS_SYNC_URL: 'https://sync.example.test/exec', _invCloudSeen: { 7: true }, Date: TickDate(T0),
      refreshPhotoRefs: (id, cb) => cb(false), _invEnsureLoaded() {},
      printApprovalRequest: (jid) => ({ html: '<p>request</p>', title: 'Request', items: rows, asked: rows, ratify: [] }),
      resolveSubfolderId: (j, n, cb) => cb('INV7'), uploadHtmlToDrive: (f, n, h, cb) => cb(true, 'https://drive.google.com/file/d/REQ/view'),
      _exportDoc: () => '', docPdfBase64: (spec, html, cb) => cb('QUJD'), buildMimeMessage: () => 'MIME', gmailCreateDraft: (m, cb) => cb(true, { messageId: 'm1' }),
      setTimeout: () => 0, clearTimeout() {}, _docNotice: (t, m) => notices.push(String(m)), _dashSendState() {}, showSyncBadge() {},
      saveJobs() {}, syncJobToSheets() {}, dashNotice() {}, _dashRedraw() {}, window: { open() {} } } });
    D.render();
    const r0 = heads(D.dom.html).filter((x) => x.f === 'releases')[0];
    eq([r0.open, r0.line], [true, '2 items need written approval: send a request · no beneficiaries recorded'], 'fixture: owed a request, so open (Q2)');
    attempt(() => D.C.toggleDeskFold(7, 'releases'));
    eq(heads(D.dom.html)[0].open, false, 'fixture: the person shut it');
    let s = settle(D, () => D.C.sendApprovalRequest(7));
    ok(s.r.ok && s.r.val === true, 'the send runs (' + (s.r.err || s.r.val) + ')');
    has(notices.join(' | '), 'tap “I’ve sent it” on the Releases & signed papers card', 'fixture: the notice sends them to the card');
    const r1 = s.partial.filter((x) => x.f === 'releases')[0];
    eq([r1.open, r1.line], [true, 'Request drafted: tap I’ve sent it · no beneficiaries recorded'], '⚠⚠ the bar the notice names is open, and its line names the tap');
    eq(s.partial, s.full, '⚠⚠ every bar reads what a full render draws');
    s = settle(D, () => D.C.invMarkRequestSent(7));
    ok(s.r.ok && s.r.val === true, 'the tap runs (' + (s.r.err || s.r.val) + ')');
    eq(line(s.partial, 'releases'), '2 on the request still unsigned · no beneficiaries recorded', 'sent: what is out for signature, grey');
    eq(s.partial, s.full, '⚠⚠ every bar reads what a full render draws');
    // A send that fails still ends with the bar open: its notice says to press Send request again on the card.
    D.C._deskOpen['7:releases'] = false;
    D.C.uploadHtmlToDrive = (f, n, h, cb) => cb(false);
    D.C.docPdfBase64 = (spec, html, cb) => cb('', 'no answer');
    D.C.jobs[0].docState = {};
    D.render();
    attempt(() => D.C.sendApprovalRequest(7));
    eq(D.C._deskOpen['7:releases'], true, '⚠ a send that came to nothing opens the bar too');
    // And one that never answers: the watchdog's notice says to check Gmail before pressing Send request again.
    let watch = null;
    D.C._deskOpen['7:releases'] = false;
    D.C.setTimeout = (f) => { watch = f; return 1; };
    D.C.refreshPhotoRefs = () => {};   // the sheet never answers
    D.C._docBusy = null;
    attempt(() => D.C.sendApprovalRequest(7));
    eq(D.C._deskOpen['7:releases'], false, 'fixture: still waiting, nothing opened yet');
    attempt(() => watch && watch());
    eq(D.C._deskOpen['7:releases'], true, '⚠ the watchdog\'s end opens it as well');
  }

  group('E5 · the sheet\'s first read lands with nothing new: the bars stop saying "loading…" and open by their rules');
  {
    const rows = [LINE('a', { disposition: 'Donate', channel: 'Goodwill' })];
    const seen = {};
    const D = desk(PROBATE(), {}, { refs: rows, roots: ['_invRefreshFromCloud'], stubs: {
      SHEETS_SYNC_URL: 'https://sync.example.test/exec', _invCloudSeen: seen,
      refreshPhotoRefs: (id, cb) => { seen[id] = true; cb(false); } } });
    D.render();
    eq(heads(D.dom.html).map((x) => x.line), ['loading…', 'loading…', 'loading…', 'loading…'], 'fixture: a cold device');
    eq(heads(D.dom.html)[0].open, false, 'and Releases shut off the cache');
    const s = settle(D, () => D.C._invRefreshFromCloud());
    ok(s.r.ok, 'the read runs (' + (s.r.err || 'ok') + ')');
    eq(D.log.renders, 0, 'fixture: the read changed nothing, so the tab was not redrawn');
    eq([s.partial[0].open, s.partial[0].line], [true, '1 item needs written approval: send a request · no beneficiaries recorded'], '⚠⚠ read: the line, and the bar open by its rule');
    eq(s.partial, s.full, '⚠⚠ every bar reads what a full render draws');
  }

  group('E7 · a card that appears inside a bar by a by-id repaint is named in the bar\'s title at once');
  {
    const D = desk(PROBATE(), { ledger: '<div class="card" id="inv-ledger-card">LEDGER</div>' }, { refs: [LINE('a')], roots: ['_invRefreshRecords'] });
    D.render();
    eq(heads(D.dom.html).filter((x) => x.f === 'closing')[0].title, 'Closing the job: close-out call, vendor ratings, Disposition Ledger', 'fixture: no proceeds card yet');
    D.S.ledger += '<div class="card" id="inv-proceeds-card">PS</div>';
    const s = settle(D, () => D.C._invRefreshRecords(7));
    ok(s.r.ok, 'the repaint runs (' + (s.r.err || 'ok') + ')');
    eq(s.partial.filter((x) => x.f === 'closing')[0].title, 'Closing the job: close-out call, vendor ratings, Disposition Ledger, proceeds',
      '⚠ the proceeds card drawn by the records\' repaint: the title names it');
    eq(s.partial, s.full, '⚠⚠ every bar reads what a full render draws');
  }

  group('E8 · a bar with nothing in it appears, and one emptied goes, on the heads repaint alone');
  {
    const D = desk(PROBATE({ invSnapshots: [] }), {}, { refs: [LINE('a')], roots: ['_deskFoldHeadsRepaint'] });
    D.render();
    eq(heads(D.dom.html).filter((x) => x.f === 'history')[0].drawn, false, 'fixture: nothing removed, no snapshot: History not drawn');
    D.C._photoRefs[7].push(LINE('x', { deletedAt: T0 }));
    let s = settle(D, () => D.C._deskFoldHeadsRepaint(7));
    eq([s.partial.filter((x) => x.f === 'history')[0].drawn, s.partial.filter((x) => x.f === 'history')[0].line], [true, '1 removed · 0 snapshots'], '⚠ a line removed: drawn, counted');
    eq(s.partial, s.full, 'as a full render draws it');
    D.C._photoRefs[7].pop();
    s = settle(D, () => D.C._deskFoldHeadsRepaint(7));
    eq(s.partial.filter((x) => x.f === 'history')[0].drawn, false, 'restored: hidden again');
    eq(s.partial, s.full, 'as a full render draws it');
    // Another client on the desk, or none: nothing is touched.
    D.dom.getElementById('inv-job').value = '8';
    eq(attempt(() => D.C._deskFoldHeadsRepaint(7)).val, false, 'the desk shows another client: no repaint');
  }

  group('E6 · Close job refused: the Closing bar is opened before the alert, wherever it was pressed');
  {
    const seen = [];
    const job = PROBATE({ vendorSourcing: { m: { vendorId: 'v1', vendorName: 'Ace', status: 'Confirmed' } } });
    const A = lift(['applyJobTransition'], { jobs: [job], _photoRefs: {}, estimateStore: {}, jobPlanStore: {}, vendorDirectory: [], document: { getElementById: () => null } });
    A.alert = () => seen.push(JSON.stringify(A._deskOpen || {}));
    const r = attempt(() => A.applyJobTransition(job));
    ok(r.ok && r.val === false, 'refused (' + (r.err || r.val) + ')');
    eq(seen, ['{"7:closing":true}'], '⚠⚠ the bar is recorded open before the refusal is said, so the desk draws it open with the scorecard in it');
    // the desk open on this job: flipped where it stands
    const D = desk(PROBATE({ vendorSourcing: job.vendorSourcing }), {}, { roots: ['applyJobTransition'], stubs: { alert() {} } });
    D.render();
    eq(heads(D.dom.html).filter((x) => x.f === 'closing')[0].open, false, 'fixture: Closing shut mid-job');
    attempt(() => D.C.applyJobTransition(D.C.jobs[0]));
    eq(heads(D.dom.html).filter((x) => x.f === 'closing')[0].open, true, '⚠ on the desk the bar opens in place');
  }
}

// ═══ F · THE URGENT STRIP ═════════════════════════════════════════════════════
// The desk's derived lines on the real readers: Found on site, the keys, the incidents, the matter type, and the rest.
const NOW_ROOTS = ['renderJobAdmin', 'deskAlertsHtml', 'incidentHeaderHtml', '_jobAdminParts', 'jobAdminHeadText', 'deskNowLine', 'incidentLines'];
const NOW_STATE = ['jobs', '_photoRefs', 'estimateStore', 'jobPlanStore', 'vendorDirectory', 'SHEETS_SYNC_URL', '_invCloudSeen', 'document', '_todayStr'];
let _nowCl = null;
function nowRig(job, rows) {
  _nowCl = _nowCl || closure(NOW_ROOTS, NOW_STATE);
  const C = sandbox({ fns: _nowCl.fns, vars: _nowCl.vars, stubs: {
    jobs: [job], _photoRefs: { 7: rows || [] }, estimateStore: { 7: { estimate: { svc: job.svc, rooms: [] } } }, jobPlanStore: {},
    vendorDirectory: [], SHEETS_SYNC_URL: '', _invCloudSeen: {}, document: domStub({}), _todayStr: () => TODAY,
  } });
  return C;
}
// Every derived line of the desk, with where it was placed and how it is drawn.
const REPORT = (id, kind, on, o) => Object.assign({ id, entry: 'report', kind, occurredOn: on, occurredTime: '10:00', where: 'Study', what: 'What happened',
  present: '', reportedBy: 'Ashley Jerome', recordedBy: 'Ashley Jerome', f1: 'x', recordedAt: Number(id.slice(1)) }, o || {});
const UPDATE = (id, of, act, o) => Object.assign({ id, entry: 'update', of, act, by: 'Ashley Jerome', at: 100 + Number(id.slice(1)) }, o || {});
const URGENT = (o) => PROBATE(Object.assign({
  matterType: '',   // unanswered: the court's and the trustee's lists withheld
  probateAttyName: 'Ann Lowe',
  siteFinds: [
    { id: 'w1', kind: 'will', foundOn: TODAY, where: 'study', foundBy: 'Ashley Jerome', description: 'Sealed envelope' },
    { id: 'w2', kind: 'will', foundOn: '2026-10-14', handedOn: '2026-10-15', handedTo: 'Ann Lowe', description: 'Envelope' },              // deposit due in 3 days
    { id: 'w3', kind: 'will', foundOn: '2026-09-30', handedOn: '2026-10-01', handedTo: 'Ann Lowe', description: 'Envelope' }],             // deposit overdue
  signedRecords: [{ id: 's1', kind: 'will', ref: 'w3', signedBy: 'Ann Lowe', signedOn: '2026-10-01', url: 'https://drive.google.com/file/d/W3/view' }],
  accessItems: [{ id: 'k1', kind: 'key', label: 'Front door', qty: 1, receivedFrom: 'Ruth Adler', receivedOn: '2026-10-01' },
                { id: 'k2', kind: 'fob', label: 'Garage fob', qty: 1, receivedFrom: 'Ruth Adler', receivedOn: '2026-10-01' }],
  accessEvents: [{ id: 'e1', itemId: 'k1', kind: 'received', on: '2026-10-01', from: 'Ruth Adler', to: 'Ashley Jerome', recordedAt: 1 },
                 { id: 'e2', itemId: 'k1', kind: 'lost', on: '2026-10-20', from: 'Ashley Jerome', note: 'dropped at the beach', recordedAt: 2 },
                 { id: 'e3', itemId: 'k2', kind: 'received', on: '2026-10-01', from: 'Ruth Adler', to: 'Ashley Jerome', recordedAt: 3 }],
  incidents: [
    REPORT('i1', 'damage', TODAY, { estValue: 300 }),                         // inside its 24 hours
    REPORT('i2', 'damage', '2026-10-19', { estValue: 900 }),                  // past them, the client told
    UPDATE('u1', 'i2', 'client_notified', { on: '2026-10-19' }),
    REPORT('i3', 'vulnerable', '2026-10-21', { yn: 'no' }),                   // the call owed, the hotline not called
    REPORT('i4', 'injury', '2026-10-10', { yn: 'yes' }),                      // resolved, the call made
    UPDATE('u2', 'i4', 'alerted', { how: 'call' }), UPDATE('u3', 'i4', 'resolved', { note: 'Bandaged; back at work' })],
}, o || {}));
const WANT = { will_held_w1: 'strip', will_receipt_w2: 'strip', will_deposit_w2: 'strip', will_receipt_w3: 'admin', will_deposit_w3: 'strip',
  access_lost_k1: 'strip', access_items: 'admin', matter_type: 'strip', doc_tier: 'admin',
  inc_open_i1: 'strip', inc_client_i1: 'strip', inc_report_i1: 'strip', inc_open_i2: 'strip', inc_client_i2: 'admin', inc_report_i2: 'strip', inc_carrier_i2: 'strip',
  inc_call_i3: 'banner', inc_open_i3: 'strip', inc_hotline_i3: 'strip' };
// The lines drawn in a derived block: [label, class] each, in order.
const drawnLines = (html, id) => {
  const h = inner(html, id);
  if (h == null) return null;
  return [...h.matchAll(/<div class="pl-line ([^"]*)"><span class="pl-dot">[^<]*<\/span><span class="pl-lbl">([^<]*)<\/span>/g)].map((m) => [m[2], m[1]]);
};

function groupF({ group, ok, eq, has, lacks }) {
  group('F1 · every derived line of the desk lands in exactly one place: the strip, the banner or Job Admin');
  {
    const job = URGENT();
    const C = nowRig(job, [LINE('a')]);
    const P = attempt(() => C._jobAdminParts(7, job));
    ok(P.ok && !!P.val, 'the parts answer (' + (P.err || 'ok') + ')');
    const parts = P.val || { lines: [], strip: [], banner: [], admin: [] };
    const where = {};
    parts.lines.forEach((l) => { where[l.key] = C.deskNowLine(l, job); });
    eq(parts.strip.length + parts.banner.length + parts.admin.length, parts.lines.length, '⚠⚠ no line dropped and none drawn twice: the three places add up to the list');
    ok(parts.lines.every((l) => ['strip', 'banner', 'admin'].indexOf(where[l.key]) >= 0), 'each line answers one of the three');
    ['strip', 'banner', 'admin'].forEach((k) => ok(parts[k].every((l) => where[l.key] === k), 'the ' + k + ' list holds exactly the lines placed there'));
    Object.keys(WANT).forEach((k) => eq(where[k], WANT[k], k + ' → ' + WANT[k]));
    const rest = parts.lines.filter((l) => !(l.key in WANT));
    ok(rest.length >= 3, 'fixture: the desk\'s other lines are there too (' + rest.map((l) => l.key).join(', ') + ')');
    ok(rest.every((l) => where[l.key] === 'admin' && !l.red), 'every other line stays in Job Admin, and none of them is red');
    lacks(parts.lines.map((l) => l.key).join(' '), '_i4', 'the resolved injury, its call made, has no line at all');

    // Drawn: the strip and Job Admin, each read back off its markup.
    C._jobAdminOpen[7] = true;
    const strip = String(attempt(() => C.deskAlertsHtml(7, job)).val || '');
    const ja = String(attempt(() => C.renderJobAdmin(7, job)).val || '');
    const S = drawnLines(strip, 'desk-now-7') || [], A = drawnLines(ja, 'plan-derived-admin-7') || [];
    eq(S.length, parts.strip.length, '⚠ the strip draws its ' + parts.strip.length + ' lines');
    eq(A.length, parts.admin.length, '⚠ Job Admin draws its ' + parts.admin.length + ', and no more');
    const labels = [...new Set(parts.lines.map((l) => l.label))];
    labels.forEach((lb) => {
      const n = (list) => list.filter((x) => x[0] === lb).length;
      eq([n(S), n(A)], [parts.strip.filter((l) => l.label === lb).length, parts.admin.filter((l) => l.label === lb).length], 'drawn once, in its place: ' + textOf(lb));
    });
    // The banner: the desk's own copy, with the call.
    has(inner(strip, 'inc-hdr-desk-7'), 'CALL ANTHONY IMMEDIATELY', '⚠ the banner at the top of the strip asks for the call');
    has(inner(strip, 'inc-hdr-desk-7'), 'incidentRecordCall(7,\'i3\')', 'with I called Anthony on the vulnerable adult concern');
    lacks(textOf(strip + ja), 'Call Anthony immediately: (617)', 'so the call\'s line is drawn nowhere else');
    // The order and the tones.
    eq(S[0], ['Original will held by Havellin', 'pl-open pl-red'], '⚠⚠ the will Havellin holds leads the strip, red');
    const firstAmber = S.findIndex((x) => /pl-amber/.test(x[1])), lastRed = S.map((x) => /pl-red/.test(x[1])).lastIndexOf(true);
    ok(firstAmber > lastRed, 'red first, then amber');
    ok(S.every((x) => /pl-red|pl-amber/.test(x[1])), 'every line in the strip is red or amber, never the grey of an open line');
    eq((S.filter((x) => x[0] === 'Matter type recorded')[0] || [])[1], 'pl-open pl-amber', '⚠ the unanswered matter type, amber, in the strip');
    eq((S.filter((x) => x[0] === 'Original will deposited with the clerk').map((x) => x[1])), ['pl-open pl-red', 'pl-open pl-amber'], 'the overdue deposit red, the one due in 3 days amber');
    eq((A.filter((x) => x[0] === 'Original will handed over against a signed receipt')[0] || [])[1], 'pl-ok', 'the receipt filed: green, in Job Admin');
    // Open Incidents once: the banner offers it, so the incident lines under it do not.
    eq((strip.match(/goToIncidents\(7\)/g) || []).length, 1, '⚠ Open Incidents once in the strip, on the banner');
    eq((strip.match(/goToSiteFinds\(7\)/g) || []).length, 4, 'each open Found on site line keeps Open Found on site');
    eq((strip.match(/goToAccessCard\(7\)/g) || []).length, 1, 'the lost key keeps Open Keys & access');
    // The two banners never share an id: the Job Plan's and the desk's are in the page at once.
    has(String(C.incidentHeaderHtml(job)), '<div id="inc-hdr-7">', 'the Job Plan\'s banner');
    has(strip, '<div id="inc-hdr-desk-7">', 'the desk\'s, its own id');
    lacks(strip, 'id="inc-hdr-7"', 'the strip never carries the Job Plan\'s id');
    lacks(strip, 'gray-dk', 'no control above the work bar wears gray-dk (browser step 6 takes the first as the primary document)');
    // The count covers Job Admin's lines only.
    const open = (list) => list.filter((l) => !l.ok).length;
    const n = open(parts.admin);
    eq(textOf(inner(ja, 'ja-n-7')), parts.done + ' of ' + parts.tasks.length + ' ticked · ' + n + ' derived items still open', 'Job Admin\'s count, by its own id');
    eq(n, open(parts.lines) - parts.strip.length - parts.banner.length, '⚠ and it no longer counts what the strip and the banner say');
  }

  group('F2 · deskNowLine, rule by rule');
  {
    const job = URGENT();
    const C = nowRig(job, []);
    const at = (l, j) => C.deskNowLine(l, j === undefined ? job : j);
    eq(at({ key: 'will_held_w1', ok: true }), 'admin', 'a line done is never urgent');
    eq(at({ key: 'rooms_cleared', ok: false, red: true }), 'strip', 'any red line, whatever its key');
    eq(at({ key: 'will_receipt_w2', ok: false }), 'strip', 'a Found on site line not yet done');
    eq(at({ key: 'cash_held_c1', ok: false }), 'strip', 'cash too');
    eq(at({ key: 'access_lost_k9', ok: false }), 'strip', 'a lost key');
    eq(at({ key: 'access_items', ok: false }), 'admin', 'keys still held: Job Admin (the Closing bar names them at the close)');
    eq(at({ key: 'inc_client_i1', ok: false }), 'strip', 'an incident line not yet done');
    eq(at({ key: 'matter_type', ok: false }), 'strip', 'an unanswered matter type');
    eq(at({ key: 'matter_type', ok: true }), 'admin', 'an answered one: Job Admin, green');
    eq(at({ key: 'doc_tier', ok: false }), 'admin', 'the tier unanswered stays in Job Admin');
    eq(at({ key: 'inc_call_i3', ok: false, red: true }), 'banner', '⚠ the call owed: the banner says it');
    eq(at({ key: 'inc_call_zz', ok: false, red: true }), 'strip', 'a call the banner does not ask for (no such incident): red, in the strip, never dropped');
    eq(at({ key: 'inc_call_i3', ok: false, red: true }, null), 'strip', 'no job to ask: the strip');
    eq(at(null), 'admin', 'nothing: Job Admin');
    // The matter type's line exists only on an estate: planDerivedLines asks it there alone.
    const L = nowRig(LIVING({ matterType: '' }), [])._jobAdminParts(7, LIVING({ matterType: '' }));
    ok(L && L.lines.every((l) => l.key !== 'matter_type'), 'a living client has no matter type line, so nothing amber on its strip from it');
  }

  group('F3 · Open Incidents is dropped from a line only while the banner above offers it');
  {
    // A resolved damage incident whose client was never told: the banner says nothing, so the line keeps its way to the card.
    const quiet = PROBATE({ incidents: [REPORT('i1', 'damage', '2026-10-15', { estValue: 100 }), UPDATE('u1', 'i1', 'resolved', { note: 'Glued' })] });
    let C = nowRig(quiet, []);
    let strip = String(C.deskAlertsHtml(7, quiet));
    eq(textOf(inner(strip, 'inc-hdr-desk-7')), '', 'fixture: no banner (nothing open, no call owed)');
    has(textOf(inner(strip, 'desk-now-7')), 'Incident 1 (property damage): client notified within 24 hours', 'the line, in the strip');
    eq((strip.match(/goToIncidents\(7\)/g) || []).length, 2, '⚠ with Open Incidents on each of its two lines (the client notice and the report)');
    // An open complaint: the amber chip offers Open Incidents, so the open line does not.
    const chip = PROBATE({ incidents: [REPORT('i1', 'complaint', '2026-10-20')] });
    C = nowRig(chip, []);
    strip = String(C.deskAlertsHtml(7, chip));
    has(inner(strip, 'inc-hdr-desk-7'), '1 open incident on this job', 'fixture: the amber chip');
    has(textOf(inner(strip, 'desk-now-7')), 'Incident 1 (client complaint) open', 'the open line, in the strip, amber');
    eq((strip.match(/goToIncidents\(7\)/g) || []).length, 1, '⚠ Open Incidents once, on the chip');
  }

  group('F4 · the strip sits between the client line and the band on every service, and takes no room when nothing is urgent');
  {
    [['an estate', {}], ['Home Prep', { svc: 'prep' }]].forEach(([what, o]) => {
      const D = desk(o);
      const h = D.render();
      ok(!D.log.renderErr, what + ': the desk renders (' + (D.log.renderErr || 'ok') + ')');
      const at = (n) => h.indexOf(n);
      ok(at('id="m-hdr"') > -1 && at('id="m-hdr"') < at('id="desk-alerts-7"') && at('id="desk-alerts-7"') < at('id="jband-slot-admin"'),
        '⚠ ' + what + ': the client line, the strip, the band');
      ok(at('id="jband-slot-admin"') < at('id="sf-host-desk"'), what + ': the must-finds after the band, as before');
      eq(depthAt(h, h.lastIndexOf('<', at('id="desk-alerts-7"'))), 0, what + ': the strip is a child of the tab, never inside a fold');
    });
    // The fixture estate's matter type is unanswered: said in the strip, amber.
    const est = desk().render();
    has(textOf(inner(est, 'desk-now-7')), 'Matter type recorded', 'the estate\'s unanswered matter type is in the strip');
    // A living job with nothing urgent: the host is drawn and says nothing.
    const liv = desk({ svc: 'downsizing' }).render();
    eq(textOf(inner(liv, 'desk-alerts-7')), '', '⚠ nothing urgent: the strip is empty');
    lacks(inner(liv, 'desk-alerts-7'), 'pl-derived', 'not even an empty list');
    // Firearms flagged at intake: the one line the room's camera pins, with the protocol a tap away.
    const fa = desk({ svc: 'downsizing', houseFlags: { firearms: { on: true, note: 'Gun safe in the closet' } } }).render();
    has(inner(fa, 'desk-alerts-7'), '<div class="fa-line">&#9888; Firearms flagged on this job &mdash; photograph in place, nothing moves.', 'the firearms line, in the strip');
    has(inner(fa, 'desk-alerts-7'), 'firearms-protocol.html', 'with the protocol a tap away');
  }

  group('F5 · I called Anthony on the strip, with no Job Plan card in the page: the banner and the strip repaint by id');
  {
    const job = PROBATE({ matterType: 'probate', incidents: [REPORT('i1', 'injury', '2026-10-21', { yn: 'yes' })] });
    const badges = [];
    const D = desk(job, {}, { roots: ['incidentRecordCall'], stubs: { saveJobs() {}, syncJobToSheets() {}, showSyncBadge: (m) => badges.push(String(m)),
      _todayStr: () => TODAY, deviceUser: () => 'Anthony Graziano Jr' } });
    D.render();
    const s0 = inner(D.dom.html, 'desk-alerts-7');
    has(s0, 'CALL ANTHONY IMMEDIATELY', 'fixture: the call is owed, in the strip\'s banner');
    eq(D.dom.getElementById('plan-incidents-7'), null, 'fixture: the Job Plan\'s Incidents card is not in the page');
    const r = attempt(() => D.C.incidentRecordCall(7, 'i1'));
    ok(r.ok && r.val === true, 'the press records the call (' + (r.err || r.val) + ')');
    has(badges.join(' | '), 'Call to Anthony recorded on Incident 1', 'and says so');
    const s1 = inner(D.dom.html, 'desk-alerts-7');
    lacks(s1, 'CALL ANTHONY IMMEDIATELY', '⚠⚠ the strip\'s banner no longer asks for the call');
    has(s1, 'Incident 1: injury, Study', '⚠ it reads the open injury, red, as the Job Plan\'s does');
    eq(D.log.renders, 0, 'by id: no full render');
    D.render();
    eq(inner(D.dom.html, 'desk-alerts-7'), s1, '⚠⚠ exactly what a full render draws');
  }

  group('F6 · Job Admin\'s count, and its lines when open, follow a tick and every by-id repaint of the desk\'s cards');
  {
    const est = { estimate: { svc: 'probate', rooms: [] } };
    const count = (h) => textOf(inner(h, 'ja-n-7'));
    const block = (h) => inner(h, 'plan-derived-admin-7');
    const D = desk(PROBATE(), {}, { refs: [LINE('a')], real: ['renderJobAdmin'], roots: ['togglePlanTask', '_invRefreshRecords'],
      stubs: { estimateStore: { 7: est }, saveJobPlan() {}, _todayStr: () => TODAY } });
    D.C._jobAdminOpen[7] = true;
    D.render();
    const c0 = count(D.dom.html);
    ok(/^0 of \d+ ticked · \d+ derived items still open$/.test(c0), 'fixture: ' + c0);
    let r = attempt(() => D.C.togglePlanTask(7, 'fin_vendor_invoices', true, null));
    ok(r.ok, 'the tick runs (' + (r.err || 'ok') + ')');
    const c1 = count(D.dom.html);
    ok(/^1 of /.test(c1), '⚠ the tick is counted at once: ' + c1);
    eq(D.log.renders, 0, 'by id: no full render');
    const b1 = block(D.dom.html);
    D.render();
    eq([count(D.dom.html), block(D.dom.html)], [c1, b1], '⚠⚠ the count and the lines are what a full render draws');
    // A signed ledger filed: _invRefreshRecords repaints the records, and Job Admin's line turns green with them.
    const n0 = Number((/· (\d+) derived/.exec(count(D.dom.html)) || [])[1]);
    D.C.jobs[0].signedRecords = [{ id: 'L1', kind: 'ledger', ref: 'ledger', signedBy: 'Ruth Adler', signedOn: TODAY, url: 'https://drive.google.com/file/d/L1/view' }];
    r = attempt(() => D.C._invRefreshRecords(7));
    ok(r.ok, 'the repaint runs (' + (r.err || 'ok') + ')');
    eq(Number((/· (\d+) derived/.exec(count(D.dom.html)) || [])[1]), n0 - 1, '⚠ the ledger signed: one fewer still open, at once');
    has(block(D.dom.html), 'pl-line pl-ok"><span class="pl-dot">&#10003;</span><span class="pl-lbl">Disposition Ledger signed', 'and the line is green in the open card');
    const c2 = count(D.dom.html), b2 = block(D.dom.html);
    D.render();
    eq([count(D.dom.html), block(D.dom.html)], [c2, b2], '⚠⚠ as a full render draws them');
    // Home Prep: the bars' heads stand down there, the count does not.
    const Pp = desk({ svc: 'prep' }, {}, { refs: [], real: ['renderJobAdmin'], roots: ['togglePlanTask'],
      stubs: { estimateStore: { 7: { estimate: { svc: 'prep', rooms: [], vendors: [] } } }, saveJobPlan() {}, _todayStr: () => TODAY } });
    Pp.render();
    const p0 = count(Pp.dom.html);
    attempt(() => Pp.C.togglePlanTask(7, 'fin_vendor_invoices', true, null));
    ok(/^0 of /.test(p0) && /^1 of /.test(count(Pp.dom.html)), '⚠ on Home Prep\'s desk too: ' + p0 + ' → ' + count(Pp.dom.html));
  }

  group('F7 · one rule, its readers counted; the repaints reach it before they stand down');
  {
    eq(callersOf('deskNowLine'), ['_jobAdminParts'], '⚠ the one rule, asked in one place');
    eq(callersOf('_jobAdminParts'), ['_deskNowRepaint', 'deskAlertsHtml', 'jobAdminHeadText', 'renderJobAdmin'], 'Job Admin\'s parts: the card, its count, the strip and the repaint');
    eq(callersOf('jobAdminHeadText'), ['_deskNowRepaint', 'renderJobAdmin'], 'the count: drawn by the card, repainted by id');
    eq(callersOf('incidentBannerState'), ['deskAlertsHtml', 'deskNowLine', 'incidentHeaderHtml'], 'what the banner draws: one answer, for the banner, the rule and the strip');
    eq(callersOf('deskAlertsHtml'), ['_deskNowRepaint', 'renderInventoryTab'], 'the strip: the full render and the repaint');
    eq(callersOf('_deskNowRepaint'), ['_deskFoldHeadsRepaint', '_repaintIncidents'], 'repainted after every by-id repaint of the desk, and after an incident\'s act');
    const live = noComments(SRC);
    eq((live.match(/planDerivedLines\(jobId, job, est, 'admin'\)/g) || []).length, 1, 'the desk\'s list is built once, in _jobAdminParts');
    eq((live.match(/planDerivedHtml\(jobId, job, est, 'admin'\)/g) || []).length, 0, 'and never drawn whole');
    const ri = codeOnly(fn('_repaintIncidents'));
    ok(ri.indexOf('_deskNowRepaint(jobId)') > -1 && ri.indexOf('_deskNowRepaint(jobId)') < ri.indexOf('if (!el) return false'),
      '⚠⚠ _repaintIncidents repaints the desk BEFORE it returns for want of the Job Plan\'s card');
    const hr = codeOnly(fn('_deskFoldHeadsRepaint'));
    ok(hr.indexOf('_deskNowRepaint(jobId)') > -1 && hr.indexOf('_deskNowRepaint(jobId)') < hr.indexOf("job.svc === ''"),
      'and the heads repaint reaches it before it stands down on Home Prep');
    has(noComments(fn('renderInventoryTab')), "var top = jobInfoHeaderHtml(job) + deskAlertsHtml(jobId, job) + '<div id=\"jband-slot-admin\">'", 'the strip is in the top both arms draw');
  }
}

// ═══ H · THE TRIMS (G4, 2026-10-22) ═══════════════════════════════════════════════════════════════════════════════════
// What the top of the tab said twice is said once: the client line names the client and the address, so the work bar's
// line under Inventory Review is the HVL id alone; the schedule strip says the start (the target before, the real day
// after), so the client line's Target Start is drawn only where no strip is; and the release approval request has one
// send for every waiting line, on the Releases card, and one for a selection, on the bulk bar.
function groupH({ group, ok, eq, has, lacks }) {
  // The client line, drawn by the real jobInfoHeaderHtml over the real strip (planScheduleHtml → jobSchedule), the clock
  // stopped at TODAY. `o.est` false: no estimate on this device.
  const header = (jobO, o) => {
    o = o || {};
    const job = Object.assign({ id: 7, hvlId: 'HVL-0007', name: 'Ashworth', addr: '14 Seaspray Ave', city: 'Palm Beach', svc: 'probate',
      status: 'won', won: true, start: '2026-11-02', docState: {}, at: {}, payments: [] }, jobO || {});
    const est = { svc: job.svc, days: 6, rooms: [{ idx: 0, name: 'Living Room', st: 'in', vol: 3, cplx: 3 }] };
    const C = lift(['jobInfoHeaderHtml'], { jobs: [job], estimateStore: o.est === false ? {} : { 7: { estimate: est } }, jobPlanStore: {},
      changeOrders: [], _todayStr: () => TODAY });
    const r = attempt(() => C.jobInfoHeaderHtml(job));
    const h = r.ok ? String(r.val) : '';
    const strip = (/<div class="plan-sched" id="admin-sched">/.test(h) && inner(h, 'admin-sched')) || '';
    return { r, h, text: textOf(h), strip: textOf(strip), hasStrip: h.indexOf('id="admin-sched"') > -1 };
  };

  group('H1 · the client line\'s Target Start only where no schedule strip is drawn; where one is, the strip says the start');
  {
    const planned = header();
    ok(planned.r.ok, 'the header draws (' + (planned.r.err || 'ok') + ')');
    ok(planned.hasStrip, 'fixture: a won estate with an estimate draws the strip');
    has(planned.strip, 'Target start Nov 2, 2026', 'the strip says the target start');
    lacks(planned.text, 'Target Start:', '⚠ the client line does not say it again');
    eq((planned.text.match(/Nov 2, 2026/g) || []).length, 1, 'the target start is printed once on the line and the strip together');
    has(planned.text, 'Client: Ashworth', 'the client');
    has(planned.text, 'Property: 14 Seaspray Ave, Palm Beach, FL', 'and the address stay');

    const running = header({ status: 'active', activatedOn: '2026-10-19', start: '2026-10-12' });
    ok(running.hasStrip, 'fixture: a running job draws the strip');
    has(running.strip, 'Started Oct 19, 2026', 'the strip says the day it really started');
    lacks(running.text, 'Target Start:', '⚠⚠ no Target Start beside it');
    lacks(running.text, 'Oct 12, 2026', '⚠⚠ and the stale target start is printed nowhere on the line (it read Target Start: Oct 12 over Started Oct 19)');

    const noEst = header({}, { est: false });
    ok(!noEst.hasStrip, 'fixture: no estimate on this device, no strip');
    has(noEst.text, 'Target Start: Nov 2, 2026', 'the client line keeps the target start where no strip says it');

    const prep = header({ svc: 'prep' });
    ok(!prep.hasStrip, 'fixture: Home Prep draws no strip');
    has(prep.text, 'Target Start: Nov 2, 2026', 'Home Prep keeps it');
    has(prep.text, 'Timeline: Vendor-driven', 'beside its vendor-driven line');

    const dead = header({ status: 'lost' });
    ok(!dead.hasStrip, 'fixture: a lost job draws no strip (the strip says nothing for it)');
    has(dead.text, 'Target Start: Nov 2, 2026', 'and keeps it');

    const nostart = header({ start: '' });
    ok(nostart.hasStrip, 'fixture: an estimate with no target start draws the strip');
    has(nostart.strip, 'No target start on this job', 'which says so, with its fix');
    lacks(nostart.text, 'Target Start:', 'and the line does not print a blank one beside it');
  }

  group('H2 · the work bar\'s line under Inventory Review is the HVL id alone: the name and the address are the client line\'s');
  {
    const bar = (jobO) => {
      const job = PROBATE(jobO);
      const C = lift(['_renderInvWorkbar'], { jobs: [job], _photoRefs: { 7: [LINE('a')] }, estimateStore: { 7: { estimate: { svc: job.svc, rooms: [] } } },
        jobPlanStore: {}, vendorDirectory: [], SHEETS_SYNC_URL: '', _invCloudSeen: {}, document: domStub({}) });
      const r = attempt(() => C._renderInvWorkbar(job, C._jobInvRefs(7)));
      return r.ok ? String(r.val) : '<!-- threw: ' + r.err + ' -->';
    };
    const b = bar();
    has(b, 'Inventory Review</div>', 'fixture: the real work bar (' + b.slice(0, 40) + ')');
    const sub = /Inventory Review<\/div>(<div[^>]*>([^<]*)<\/div>)?<\/div>/.exec(b);
    eq(sub && sub[2], 'HVL-0007', '⚠ the line under the title is the HVL id alone');
    lacks(b, 'Ashworth', '⚠ the client\'s name is not repeated on the bar');
    lacks(b, '14 Seaspray Ave', '⚠ nor the address');
    const none = bar({ hvlId: '' });
    ok(/Inventory Review<\/div><\/div>/.test(none), 'with no HVL id the title stands alone (no empty line under it)');
  }

  group('H3 · one Send request on the desk: the Releases card\'s for every waiting line, the bulk bar\'s for a selection, the work bar none');
  {
    const rows = () => [LINE('a', { itemNo: 1, objectName: 'Harbor painting', disposition: 'Auction', channel: 'Kodner Galleries' }),
      LINE('b', { itemNo: 2, objectName: 'Table lamp', disposition: 'Donate', channel: 'Goodwill' }),
      LINE('c', { itemNo: 3, objectName: 'Clock', disposition: 'Keep' })];
    const real = ['_renderInvWorkbar', '_renderInvReleasesCard', '_renderInvBulk'];
    const run = (jobO, picks) => {
      const r = rows();
      const D = desk(PROBATE(jobO), {}, { refs: r, real, stubs: { SHEETS_SYNC_URL: 'https://sync.example.test/exec', _invCloudSeen: { 7: true },
        _invAssignItemNos: () => r } });
      (picks || []).forEach((id) => { D.C._invPick[id] = 1; });
      const html = D.render();
      return { D, html, err: D.log.renderErr };
    };
    const sends = (h) => (h.match(/sendApprovalRequest\(7[^)]*\)/g) || []);

    const A = run();
    ok(!A.err, 'the desk draws with the real work bar, Releases card and bulk bar (' + (A.err || 'ok') + ')');
    has(inner(A.html, 'inv-workbar') || '', 'printApprovalRequest(7)', 'fixture: the real work bar, its print of the request still on it');
    eq(sends(A.html), ['sendApprovalRequest(7)'], '⚠⚠ two lines wait: ONE Send request on the whole desk');
    has(inner(A.html, 'inv-releases') || '', 'onclick="sendApprovalRequest(7)"', 'and it is the Releases card\'s');
    lacks(inner(A.html, 'inv-workbar') || '', 'sendApprovalRequest(', '⚠ the work bar carries none');
    lacks(textOf(inner(A.html, 'inv-workbar') || ''), 'Send request', 'and no button reads so');
    eq(A.D.C.deskFoldState(7, A.D.job, 'releases', A.D.C._jobInvRefs(7)).openByDefault, true,
      'the card\'s bar opens by itself while the send is owed (Q2), so the one send is on screen when it is needed');

    const S = run({}, ['a']);
    eq(sends(S.html).sort(), ['sendApprovalRequest(7)', 'sendApprovalRequest(7,true)'], 'a line selected: the bulk bar adds the selection\'s send, and only that');
    const iRecip = S.html.indexOf('id="inv-bulk-recip"'), iSel = S.html.indexOf('onclick="sendApprovalRequest(7,true)"');
    ok(iRecip > -1 && iSel > iRecip, 'the selection\'s is on the bulk bar, beside its Who took them… box (' + iRecip + ', ' + iSel + ')');
    lacks(inner(S.html, 'inv-workbar') || '', 'sendApprovalRequest(', 'and the work bar still carries none');

    const B = run({ executorEmail: '' });
    ok(!B.err, 'blocked: the desk draws (' + (B.err || 'ok') + ')');
    eq(sends(B.html), [], '⚠⚠ blocked (nobody to send to): no Send request anywhere on the desk, never one that would refuse');
    has(textOf(inner(B.html, 'inv-releases') || ''), 'The approval request cannot be sent yet', 'the card says why, on screen, where the send would be');
  }

  group('H4 · the tab\'s subtitle reads the desk in its new order');
  {
    const at = SRC.indexOf('<div class="panel" id="panel-inventory">');
    const panel = SRC.slice(at, SRC.indexOf('<div id="inventory-content"></div>', at));
    ok(at > 0 && panel.length > 200 && panel.length < 3000, 'the panel\'s static markup was found (' + panel.length + ' characters)');
    const sub = textOf(inner(panel, 'inv-subtitle') || '').replace(/&rsquo;/g, '’');
    eq(sub, 'Start at the top: anything flagged above the brown band, then its next step, then tonight’s items. Each bar below the items says in one line what it holds: amber or red means it needs you.',
      'the subtitle names the order: what is flagged above the band, its step, tonight\'s items, then the bars');
    lacks(panel, 'produce the client', 'the old subtitle is gone');
    eq((panel.match(/id="inv-subtitle"/g) || []).length, 1, 'once');
  }
}
