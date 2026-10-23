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
//   I · the review aids and Anthony's Q3 (G5): Show the item on both agents' notices, lifting only the filter that hides the
//       line; a Needs you chip showing the whole job; the earlier-days hint (words, never a second All); the must-finds
//       shrinking to one green line once all are found; the two stale sentences; and the agent's notes quiet once they have
//       had their look, still read in the line's record.
//   J · values and the quieter forms (G6): the valuation basis and the §2032 date at the head of the Values & appraisals bar,
//       the summary stating them as text; + Add an appraiser, + Add a beneficiary and + Add a specific bequest, each form
//       shown in place, open by itself while its list is empty (the appraisers' while an item waits), a person's open or
//       Cancel winning, Edit opening the form before filling it, a save putting it back to its default; since the G6 review,
//       the appraisers' form following the by-id repaints with the bar (never off an unread manifest), its Cancel clearing it,
//       and the basis select showing the basis the job records.
//   K · Record the signed request (G7): on the Releases card inside its bar, once on the desk; the press opens Record
//       approval on the lines the request carried, recorded over the real save and drawn again by the real render, with the
//       person's selection on the bulk bar still standing; the bulk bar's Record approval as it was.
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
    groupI({ group, ok, eq, has, lacks });
    groupJ({ group, ok, eq, has, lacks });
    groupK({ group, ok, eq, has, lacks });
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

  group('H4 · the tab\'s subtitle reads the desk in its new order, every block named, and true on Home Prep too');
  {
    const at = SRC.indexOf('<div class="panel" id="panel-inventory">');
    const panel = SRC.slice(at, SRC.indexOf('<div id="inventory-content"></div>', at));
    ok(at > 0 && panel.length > 200 && panel.length < 3000, 'the panel\'s static markup was found (' + panel.length + ' characters)');
    const sub = textOf(inner(panel, 'inv-subtitle') || '').replace(/&rsquo;/g, '’');
    // ⚠ RESTATED ON REVIEW (2026-10-22): it skipped the must-finds and Job Admin, its "its next step" could be read as the
    // items', and on Home Prep (no items, no bars; renderInventoryTab's prep branch) it named both as though they were there.
    eq(sub, 'Start at the top: anything flagged above the brown band, then the band’s next step, the must-finds and Job Admin’s desk paperwork. '
      + 'On every service but Home Prep, tonight’s items come next, then the bars below them, each saying in one line what it holds: amber or red means it needs you.',
      'the subtitle names the order: what is flagged above the band, the band\'s step, the must-finds, Job Admin, tonight\'s items, then the bars');
    // The order it names is the order renderInventoryTab draws, read off the render's own source (each block once).
    const body = noComments(fn('renderInventoryTab'));
    const pos = ['deskAlertsHtml(jobId, job)', 'jobProgressBlockHtml(jobId, \'admin\')', '_sfHost(\'sf-host-desk\', job)\n    + renderJobAdmin(jobId, job)', '_renderInvWorkbar(job, all)', 'fold(\'releases\''].map((n) => body.indexOf(n));
    ok(pos.every((p) => p > -1), 'fixture: the render\'s blocks were found (' + pos.join(', ') + ')');
    ok(pos.every((p, i) => !i || pos[i - 1] < p), 'the strip, the band, the must-finds and Job Admin, the items, the bars: the subtitle\'s order is the render\'s');
    has(body, 'if (job.svc === \'prep\') {\n    cont.innerHTML = top + _sfHost(\'sf-host-desk\', job) + renderJobAdmin(jobId, job) + closeout;', 'and Home Prep\'s desk stops at Job Admin and the close-out, as the subtitle says');
    lacks(panel, 'produce the client', 'the old subtitle is gone');
    lacks(sub, 'then its next step', 'the ambiguous "its" is gone');
    eq((panel.match(/id="inv-subtitle"/g) || []).length, 1, 'once');
  }

  group('H5 · a draft waiting and a line it never carried: the card names the line and the way round, the bar line asks nothing the desk does not offer');
  {
    // Found on review: with the work bar's send gone, this state had the bar's line say "send a request" over a card that
    // offered no send (a draft waits) and never mentioned the line. The way round is the card's own order, driven here
    // through the real tap: the draft sent, I've sent it, then the fresh request the next state's card offers.
    const rows = (more) => [LINE('a', { itemNo: 1, objectName: 'Harbor painting', disposition: 'Auction', channel: 'Kodner Galleries' }),
      LINE('b', { itemNo: 2, objectName: 'Table lamp', disposition: 'Donate', channel: 'Goodwill' }),
      LINE('c', { itemNo: 3, objectName: 'Clock', disposition: 'Keep' })].concat(more ? [LINE('d', { itemNo: 4, objectName: 'Rug', disposition: 'Junk' })] : []);
    const real = ['_renderInvWorkbar', '_renderInvReleasesCard', '_renderInvBulk'];
    const drafted = () => ({ approvalRequest: { draftedAt: '2026-10-19T15:00:00.000Z', provider: 'gmail', draftUrl: 'https://mail.google.com/mail/u/0/#drafts/x',
      req: { to: ['ruth@adler.example'], cc: [], noEmail: [], viaCounsel: false, stableIds: ['a'], asked: 1, ratify: 0 } } });
    const run = (more) => {
      const r = rows(more);
      const D = desk(PROBATE({ docState: drafted() }), {}, { refs: r, real, roots: ['invMarkRequestSent'], stubs: {
        SHEETS_SYNC_URL: 'https://sync.example.test/exec', _invCloudSeen: { 7: true }, _invAssignItemNos: () => r, Date: TickDate(T0),
        saveJobs() {}, syncJobToSheets() {}, dashNotice() {}, _dashRedraw() {}, _docNotice() {}, showSyncBadge() {} } });
      return { D, html: D.render() };
    };
    const sends = (h) => (h.match(/sendApprovalRequest\(7[^)]*\)/g) || []);
    const card = (h) => textOf(inner(h, 'inv-releases') || '');
    const relHead = (h) => heads(h).filter((x) => x.f === 'releases')[0] || {};

    const A = run();
    ok(!A.D.log.renderErr, 'the desk draws with the real work bar, Releases card and bulk bar (' + (A.D.log.renderErr || 'ok') + ')');
    has(inner(A.html, 'inv-releases') || '', 'onclick="invMarkRequestSent(7)"', 'fixture: the draft waits on its tap, on the card');
    const R = relHead(A.html);
    eq([R.open, R.line], [true, 'Request drafted: tap I’ve sent it · 1 more item needs written approval: send a fresh request once the draft has gone · no beneficiaries recorded'],
      '⚠⚠ the bar opens (Q2), and its line names the draft first, then the line it never carried and when its request goes');
    eq(A.D.C.deskFoldState(7, A.D.job, 'releases', A.D.C._jobInvRefs(7)).bits.slice(0, 2).map((b) => b.tone), ['amber', 'amber'], 'both in amber');
    lacks(R.line, 'written approval: send a request', '⚠⚠ never "send a request" while the desk offers no send');
    eq(sends(A.html), [], 'fixture: no Send request anywhere while the draft waits (the card\'s rule; the work bar carries none)');
    has(card(A.html), '&#9888; 1 more line awaits written approval and is not on this draft: send the draft, tap I’ve sent it, then send a fresh request.',
      '⚠⚠ the card names the line the draft never carried, and the way round, in the card\'s order');
    eq((card(A.html).match(/not on this draft/g) || []).length, 1, 'said once');

    const two = run(true);
    has(card(two.html), '2 more lines await written approval and are not on this draft', 'two lines: the card in the plural');
    has(relHead(two.html).line, '2 more items need written approval: send a fresh request once the draft has gone', 'and the bar\'s line');

    // The way round, through the real tap: I've sent it, and the card that follows offers the fresh request it promised.
    const t = attempt(() => A.D.C.invMarkRequestSent(7));
    ok(t.ok && t.val === true, 'I\'ve sent it runs (' + (t.err || t.val) + ')');
    const partial = A.D.dom.html;
    eq(sends(partial), ['sendApprovalRequest(7)'], '⚠⚠ the next state offers the send, once, on the card (repainted by id)');
    has(inner(partial, 'inv-releases') || '', 'onclick="sendApprovalRequest(7)"', 'on the Releases card');
    has(card(partial), 'not on it: send a fresh request.', 'with the card\'s fresh-request line');
    lacks(card(partial), 'not on this draft', 'and the draft\'s sentence gone with the draft');
    eq(relHead(partial).line, '1 item needs written approval: send a request · 1 on the request still unsigned · no beneficiaries recorded',
      'the bar\'s line now says "send a request", over the send it offers');
    const pHeads = heads(partial);
    A.D.render();
    eq(pHeads, heads(A.D.dom.html), '⚠ the bars after the tap read what a full render draws');

    // A draft with no line outside it says nothing more (the C3 fixture's line, here on the card).
    const none = desk(PROBATE({ docState: drafted() }), {}, { refs: rows().slice(0, 1).concat([rows()[2]]), real, stubs: {
      SHEETS_SYNC_URL: 'https://sync.example.test/exec', _invCloudSeen: { 7: true } } });
    const nh = none.render();
    has(inner(nh, 'inv-releases') || '', 'onclick="invMarkRequestSent(7)"', 'fixture: the draft alone, waiting on its tap');
    lacks(card(nh), 'more line', 'nothing about a line the draft did not carry, where there is none');
    eq(relHead(nh).line, 'Request drafted: tap I’ve sent it · no beneficiaries recorded', 'and the bar\'s line as C3 has it');
  }
}

// The text a person reads, with the two entities group I's blocks draw (the dash and the tick) read as the characters they are.
const readOf = (h) => textOf(String(h == null ? '' : h).replace(/&mdash;/g, '—').replace(/&#10003;/g, '✓'));
// ═══ I · THE REVIEW AIDS AND ANTHONY'S Q3 (G5) ═════════════════════════════════
// Anthony, 2026-10-22, Q3 ("Should Agent One's notes go quiet?"): *"Quiet once reviewed."* A Look at this leaves the list
// above the rows once its line is reviewed and is still read in the line's record; a Must find once every intake must-find
// is recorded found; a Firearm and a Possible NFA item always stay. And the review aids the evening needs: Show the item on
// each notice, a chip that shows the whole job, the leftovers Today hides named in words, the must-finds shrinking.
function groupI({ group, ok, eq, has, lacks }) {
  const EARLY = ON('2026-10-18'), Y = ON('2026-10-19');
  // The real tonight's items: the work bar, the chips, the filter, the groups and the rows, on a clock that reads T0 (noon on
  // Oct 20 in Palm Beach), so Today, Last 7 days and the earlier-days count are the real code's answers.
  const REAL_ITEMS = ['_renderInvWorkbar', '_renderInvFlagStrip', '_renderInvFilterRow', '_invGroupItems', '_renderInvGroup', '_invMatchesFilter', '_renderInvBulk'];
  const tonight = (jobO, rows, o) => {
    o = o || {};
    const D = desk(jobO || PROBATE(), {}, { refs: rows, real: REAL_ITEMS.concat(o.real || []), roots: ['deskShowLine', 'setInvFlag', 'setInvWhen', '_invRefreshFlagStrip',
      '_invRefreshAgentNotices', 'sfToggleFoundDesk', 'toggleMustFound', '_invEdit', '_mfHandle', '_mustFindKey'].concat(o.roots || []), stubs: Object.assign({
      SHEETS_SYNC_URL: 'https://sync.example.test/exec', _invCloudSeen: { 7: true }, Date: TickDate(T0), _invAssignItemNos: () => rows.filter((r) => !r.deletedAt),
      savePhotoRefs() {}, _scheduleInventorySync() {}, showSyncBadge() {}, alert() {}, _invRefreshSummary() {}, saveJobs() {}, syncJobToSheets() {},
    }, o.stubs || {}) });
    return D;
  };
  const rowIds = (h) => (h.match(/id="inv-row-([^"]+)"/g) || []).map((m) => m.slice(12, -1));
  const shows = (h) => (h.match(/deskShowLine\(7,'[^']*'\)/g) || []);

  group('I1 · Show the item: lifts only the part of the filter that hides the line, unfolds its group, opens its record, draws once, scrolls to it');
  {
    const rows = () => [
      LINE('w', { itemNo: 31, roomIdx: 1, objectName: 'Ring box', namedBy: 'agent', ts: EARLY, agentNotices: [{ kind: 'mustfind', text: 'a small blue ring box on the dresser' }] }),
      LINE('t', { itemNo: 40, roomIdx: 0, objectName: 'Table lamp', namedBy: 'agent', ts: T0 }),
      LINE('k', { itemNo: 41, roomIdx: 0, objectName: 'Armchair', disposition: 'Keep', namedBy: 'desk', ts: T0 })];
    const job = PROBATE({ mustFind: 'Grandmother’s ring' });
    const D = tonight(job, rows());
    D.C._invFilter.when = 'today';
    const h0 = D.render();
    ok(!D.log.renderErr, 'the real tonight\'s items draw (' + (D.log.renderErr || 'ok') + ')');
    eq(rowIds(h0).sort(), ['k', 't'], 'fixture: Today hides the ring box, shot two days ago');
    const notes = inner(h0, 'inv-agent-notices') || '';
    has(readOf(notes), 'Must find', 'fixture: Agent One\'s Must find is above the rows, read over every line');
    eq(shows(notes), ['deskShowLine(7,\'w\')'], '⚠ the notice carries one Show the item, for its own line');
    ok(/<button type="button" class="desk-show" onclick="deskShowLine\(7,'w'\)">Show the item<\/button>/.test(notes), 'a button, in the bronze outline');
    lacks(notes, 'gray-dk', '⚠ never the dark fill the tab\'s primary document wears (browser step 6 takes the first such button)');
    const before = D.log.renders, scrolls = D.dom.log.scrolls.length;
    const r = attempt(() => D.C.deskShowLine(7, 'w'));
    ok(r.ok && r.val === true, 'Show the item runs and finds the row (' + (r.err || r.val) + ')');
    eq(D.log.renders - before, 1, '⚠ the desk is drawn once');
    eq(D.C._invFilter.when, 'all', '⚠⚠ the day was what hid it: When is All now');
    const h1 = D.dom.html;
    ok(rowIds(h1).indexOf('w') > -1, '⚠⚠ the ring box\'s row is on the desk');
    const row = inner(h1, 'inv-row-w') || '';
    has(row, 'From the field', '⚠⚠ with its record open');
    has(row, 'Remove line', 'the whole record, its own controls');
    eq(D.C._invOpen.w, 1, 'opened as the ▾ would open it');
    const sc = D.dom.log.scrolls.slice(scrolls);
    eq(sc.map((x) => [x.id, x.opt && x.opt.block]), [['inv-row-w', 'start']], '⚠ and the row is brought to the top of the screen');

    // Every other part the person set stays, unless it is what hides the line.
    const E = tonight(job, rows());
    Object.assign(E.C._invFilter, { when: 'today', room: '1', q: '', flag: '' });
    E.render();
    attempt(() => E.C.deskShowLine(7, 'w'));
    eq(E.C._invFilter, { when: 'all', room: '1', q: '', flag: '' }, '⚠ the room the person picked is the ring box\'s room: it stays picked');
    const F = tonight(job, rows());
    Object.assign(F.C._invFilter, { when: 'week', room: '0', q: 'lamp', flag: 'undecided' });
    F.C._invFold[''] = 1;
    F.render();
    eq(rowIds(F.dom.html), [], 'fixture: the room, the search and a folded Not yet decided group hide it (the week does not)');
    attempt(() => F.C.deskShowLine(7, 'w'));
    eq(F.C._invFilter, { when: 'week', room: '', q: '', flag: 'undecided' }, '⚠⚠ only the room and the search are lifted: Last 7 days and the chip did not hide it');
    eq(F.C._invFold[''], undefined, '⚠ its group is unfolded');
    has(inner(F.dom.html, 'inv-row-w') || '', 'From the field', 'and its record is open on the desk');
    // A line gone from the inventory: nothing to show, nothing drawn.
    const g0 = F.log.renders;
    eq(attempt(() => F.C.deskShowLine(7, 'nope')).val, false, 'a line no longer on the inventory is refused');
    eq(F.log.renders, g0, 'and nothing is drawn for it');

    // Agent Two's notices carry it too.
    const v = LINE('v', { itemNo: 5, objectName: 'Oil painting', category: 'Art & Décor', valuedBy: 'agent', fmv: 900, valLow: 600, valHigh: 1200, valSource: 'Auction comps',
      valNameAt: 'Oil painting', ts: EARLY, valNotices: [{ kind: 'worthpoint', text: 'a signed print may be worth more' }] });
    const V = tonight(job, [v, LINE('t2', { ts: T0 })]);
    V.C._invFilter.when = 'today';
    const hv = V.render();
    eq(shows(inner(hv, 'inv-value-notices') || ''), ['deskShowLine(7,\'v\')'], 'Agent Two\'s notice carries one Show the item, for its line');
    attempt(() => V.C.deskShowLine(7, 'v'));
    has(inner(V.dom.html, 'inv-row-v') || '', 'From the field', 'and it lands on the painting\'s open record');
  }

  group('I2 · a Needs you chip counts the whole job, so pressing it shows the whole job: When goes to All, and its count is the rows drawn');
  {
    const rows = [LINE('a', { ts: EARLY }), LINE('b', { ts: Y }), LINE('c', { ts: T0 }), LINE('d', { ts: T0, disposition: 'Keep', namedBy: 'desk' })];
    const D = tonight(PROBATE(), rows);
    D.C._invFilter.when = 'today';
    const h0 = D.render();
    const chip = /onclick="setInvFlag\('undecided'\)"[^>]*>Not yet decided <strong>(\d+)<\/strong>/.exec(inner(h0, 'inv-flagstrip') || '');
    eq(chip && chip[1], '3', 'fixture: the chip counts three undecided lines over the whole job');
    eq(rowIds(h0).sort(), ['c', 'd'], 'fixture: Today draws two of the four');
    attempt(() => D.C.setInvFlag('undecided'));
    eq([D.C._invFilter.flag, D.C._invFilter.when], ['undecided', 'all'], '⚠⚠ the chip pressed: its filter on, and When to All');
    eq(rowIds(D.dom.html).sort(), ['a', 'b', 'c'], '⚠⚠ the rows drawn are the three the chip counted (under Today it drew one, with nothing saying why)');
    attempt(() => D.C.setInvWhen('week'));
    attempt(() => D.C.setInvFlag('undecided'));
    eq([D.C._invFilter.flag, D.C._invFilter.when], ['', 'week'], 'pressed off: the chip\'s filter goes and When stays as the person last set it');
    has(fn('setInvFlag'), "if (_invFilter.flag) _invFilter.when = 'all'", 'one line, in the chip\'s own handler');
  }

  group('I3 · Today names the leftovers it hides: words in the filter row, never a second All, counting only what All would show');
  {
    const rows = () => [LINE('a', { ts: EARLY, roomIdx: 0 }), LINE('b', { ts: Y, roomIdx: 1 }), LINE('c', { ts: Y, disposition: 'Donate' }),
      LINE('d', { ts: T0 }), LINE('e', { ts: EARLY, disposition: 'Undecided' })];
    const D = tonight(PROBATE(), rows());
    D.C._invFilter.when = 'today';
    const h = D.render();
    const hint = inner(h, 'inv-earlier');
    // The field's Undecided chip stores '' (FIELD_DISPOSITIONS). The hint reads the Not yet decided chip's own test, so it
    // counts exactly what the chip counts: a line whose sheet reads "Undecided" (e) is on neither.
    eq(readOf(hint), '2 from earlier days still undecided: press All', '⚠⚠ the two lines shot on earlier days and still undecided, named');
    ok(inner(h, 'inv-earlier') !== null && !/<button|onclick/.test(hint), '⚠ words, not a control');
    eq((h.match(/onclick="setInvWhen\('all'\)"/g) || []).length, 1, '⚠⚠ one All on the desk: the filter\'s own (browser step 44 presses exactly one)');
    has(CSS, '.inv-earlier{', 'styled as a note in the warning colour');
    // Only what All would show: a line the room also hides is not counted.
    D.C._invFilter.room = '1';
    eq(readOf(inner(D.render(), 'inv-earlier')), '1 from earlier days still undecided: press All', 'with a room picked, only the leftovers in that room');
    D.C._invFilter.room = '';
    attempt(() => D.C.setInvWhen('all'));
    eq(readOf(inner(D.dom.html, 'inv-earlier')), '', 'on All, nothing to say');
    ok(D.dom.html.indexOf('id="inv-earlier"') > -1, 'and its host stays drawn, empty, for the repaint');
    ok(rowIds(D.dom.html).indexOf('a') > -1 && rowIds(D.dom.html).indexOf('b') > -1, 'All shows them');
    eq(readOf(inner((() => { D.C._invFilter.when = 'week'; return D.render(); })(), 'inv-earlier')), '', 'Last 7 days says nothing (Today is the evening\'s default, and the hint is for it)');
    // A split (or any row edit) repaints it by id, as a full render would draw it.
    const S = tonight(PROBATE(), rows());
    S.C._invFilter.when = 'today';
    S.render();
    S.C._photoRefs[7].push(LINE('f', { ts: Y }));
    attempt(() => S.C._invRefreshFlagStrip(7));
    const partial = inner(S.dom.html, 'inv-earlier');
    eq(readOf(partial), '3 from earlier days still undecided: press All', '⚠ the count repainted in place after a line was added');
    eq(partial, inner(S.render(), 'inv-earlier'), '⚠ equal to what a full render writes');
  }

  group('I4 · the desk\'s must-finds, once all are found: one green line, Show found per job for the session, the safety row always');
  {
    const C = lift(['standingFlagsBlock', '_sfHost', 'sfToggleFoundDesk', '_repaintStandingFlags', 'toggleMustFound', '_mustFindKey'], {
      jobs: [], document: null, saveJobs() {}, syncJobToSheets() {}, _todayStr: () => TODAY, _invStampBy: () => 'Ashley Jerome' });
    const J = (o) => Object.assign({ id: 7, name: 'Ashworth', mustFind: 'Grandmother’s ring\nDeed box', safetyNotes: 'Loose stair rail to the attic.',
      mustFound: {}, at: {} }, o || {});
    const both = { [C._mustFindKey('Grandmother’s ring')]: { at: '2026-10-20', by: 'Ashley Jerome' }, [C._mustFindKey('Deed box')]: { at: '2026-10-21', by: 'Ashley Jerome' } };
    const open = C.standingFlagsBlock(J({ mustFound: { [C._mustFindKey('Deed box')]: both[C._mustFindKey('Deed box')] } }), { desk: true });
    eq((open.match(/>Found it</g) || []).length, 1, 'fixture: one still missing, with its Found it');
    lacks(open, 'sf-allfound', 'and no all-found line while one is missing');
    const done = C.standingFlagsBlock(J({ mustFound: both }), { desk: true });
    has(readOf(done), 'Must find ✓ All 2 must-finds found', '⚠⚠ every one found: one green line says so');
    has(done, 'class="sf-row sf-done sf-allfound"', 'in the found rows\' green');
    eq((done.match(/onclick="sfToggleFoundDesk\(7\)">Show found</g) || []).length, 1, 'with Show found');
    lacks(done, 'Undo', '⚠ the found rows are folded under it');
    lacks(readOf(done), 'Grandmother', 'their wording too');
    has(readOf(done), 'Loose stair rail to the attic.', '⚠ the safety row always shows');
    lacks(done, 'gray-dk', 'and nothing above the work bar wears the dark fill');
    has(readOf(C.standingFlagsBlock(J({ mustFind: 'Deed box', mustFound: { [C._mustFindKey('Deed box')]: both[C._mustFindKey('Deed box')] } }), { desk: true })),
      '✓ The must-find is found', 'one must-find, said in the singular');
    // The other shapes are unchanged: the plan, the dashboard and the room still list each found row.
    const dash = C.standingFlagsBlock(J({ mustFound: both }), {});
    lacks(dash, 'sf-allfound', 'the dashboard\'s brief is unchanged');
    eq((dash.match(/Undo/g) || []).length, 2, 'and still lists each found row with its Undo');
    // No job id: the line, and no button to press.
    lacks(C.standingFlagsBlock(J({ id: undefined, mustFound: both }), { desk: true }), 'sfToggleFoundDesk', 'a job with no id draws the line without the button');

    // Show found, Undo and Found it, pressed through the desk's host and repainted by id.
    const job = J({ mustFound: Object.assign({}, both) }), other = J({ id: 8, mustFound: Object.assign({}, both) });
    C.jobs.push(job, other);
    C.document = liveDom(7);
    C.document.html = C._sfHost('sf-host-desk', job);
    const host = () => C.document.html;
    attempt(() => C.sfToggleFoundDesk(7));
    eq((host().match(/>Undo</g) || []).length, 2, '⚠ Show found: the found rows, each with its Undo');
    has(host(), '>Hide found<', 'and the line offers Hide found');
    lacks(C.standingFlagsBlock(other, { desk: true }), 'Undo', 'per job: another client\'s desk still folds its own');
    const undo = /onclick="toggleMustFound\(7,'([^']+)'\)">Undo</.exec(host());
    attempt(() => C.toggleMustFound(7, undo[1]));
    lacks(host(), 'sf-allfound', '⚠ Undo: one missing again, and the all-found line goes');
    eq((host().match(/>Found it</g) || []).length, 1, 'its Found it back');
    const found = /onclick="toggleMustFound\(7,'([^']+)'\)">Found it</.exec(host());
    attempt(() => C.toggleMustFound(7, found[1]));
    has(readOf(host()), '✓ All 2 must-finds found', 'Found it again: the line is back');
    attempt(() => C.sfToggleFoundDesk(7));
    lacks(host(), 'Undo', 'Hide found folds them again');
    // Session only: nothing of it is saved.
    lacks(noComments(fn('sfToggleFoundDesk')), 'localStorage', 'Show found is never saved');
    lacks(noComments(fn('standingFlagsBlock')), 'localStorage', 'nor read from storage');
  }

  group('I5 · Q3: a Look at this goes quiet once its line is reviewed, a Must find once every must-find is found; Firearm and NFA never');
  {
    const N = (kind, text) => ({ kind, text });
    const rows = () => [
      LINE('o1', { itemNo: 1, namedBy: 'agent', reviewed: false, agentNotices: [N('other', 'a crack along the top rail')] }),
      LINE('o2', { itemNo: 2, namedBy: 'agent', reviewed: true, agentNotices: [N('other', 'the drawer pulls do not match')] }),
      LINE('o3', { itemNo: 3, namedBy: 'desk', objectName: 'Side table', disposition: 'Donate', agentNotices: [N('other', 'one leg reglued')] }),
      LINE('m1', { itemNo: 4, namedBy: 'agent', reviewed: true, agentNotices: [N('mustfind', 'a ring box on the dresser')] }),
      LINE('f1', { itemNo: 5, namedBy: 'agent', reviewed: true, agentNotices: [N('firearm', 'a long gun in the closet'), N('nfa', 'a tube that may be a suppressor')] })];
    const notesOf = (C, job) => readOf(C._agNoticesHtml(7, C._photoRefs[7]));
    // `_mustFindKey` lifted by name: the fixtures key their found records with it, whatever the code under test reaches.
    const C = lift(['_agNoticesHtml', '_agRecordNoticesHtml', 'agentNotices', '_mustFindKey'], { jobs: [], _photoRefs: { 7: rows() }, estimateStore: { 7: { estimate: { rooms: [] } } } });
    const missing = PROBATE({ mustFind: 'Grandmother’s ring' });
    C.jobs.push(missing);
    const t0 = notesOf(C, missing);
    has(t0, 'a crack along the top rail', 'an unreviewed line\'s Look at this is listed');
    lacks(t0, 'the drawer pulls do not match', '⚠⚠ a reviewed line\'s Look at this is not (ticked Reviewed)');
    lacks(t0, 'one leg reglued', '⚠⚠ nor one reviewed by being named and decided on the desk (invLineReviewed, the one rule)');
    has(t0, 'a ring box on the dresser', '⚠ a Must find stays while a must-find is missing, its line reviewed or not');
    has(t0, 'a long gun in the closet', '⚠ a Firearm stays');
    has(t0, 'a tube that may be a suppressor', '⚠ a Possible NFA item stays');
    has(t0, 'Agent One raised 4 things to look at', 'the heading counts only what it lists');
    eq(shows(C._agNoticesHtml(7, C._photoRefs[7])), ["deskShowLine(7,'m1')", "deskShowLine(7,'f1')", "deskShowLine(7,'f1')", "deskShowLine(7,'o1')"],
      'each listed notice carries one Show the item for its own line, in the order that matters (Must find, NFA, Firearm, Look at this)');
    // Every must-find found: the Must find goes quiet; the firearm and the NFA stay.
    C.jobs[0] = PROBATE({ mustFind: 'Grandmother’s ring', mustFound: { [C._mustFindKey('Grandmother’s ring')]: { at: '2026-10-21', by: 'Ashley Jerome' } } });
    const t1 = notesOf(C);
    lacks(t1, 'a ring box on the dresser', '⚠⚠ every must-find recorded found: the Must find goes quiet');
    has(t1, 'a long gun in the closet', '⚠ the Firearm still stands');
    has(t1, 'a tube that may be a suppressor', '⚠ and the Possible NFA item');
    // No must-find list at all: nothing is found, so a Must find stays.
    C.jobs[0] = PROBATE({ mustFind: '' });
    has(notesOf(C), 'a ring box on the dresser', 'a job with no must-find list keeps its Must find (nothing is recorded found)');
    // Everything quiet: the block goes.
    C._photoRefs[7] = rows().filter((r) => r.stableId === 'o2' || r.stableId === 'o3');
    eq(C._agNoticesHtml(7, C._photoRefs[7]), '', 'nothing left to look at: no block above the rows');

    // Still read in the line's record, quiet or not, and saying why it is off the list.
    C._photoRefs[7] = rows();
    C.jobs[0] = PROBATE({ mustFind: 'Grandmother’s ring', mustFound: { [C._mustFindKey('Grandmother’s ring')]: { at: '2026-10-21', by: 'Ashley Jerome' } } });
    const rec = (id) => readOf(C._agRecordNoticesHtml(C.jobs[0], C._photoRefs[7].filter((r) => r.stableId === id)[0]));
    eq(rec('o2'), 'Agent One noted Look at this — the drawer pulls do not match · off the list above the rows: the line is reviewed', '⚠⚠ the reviewed line\'s record keeps its note, and says why it is off the list');
    eq(rec('m1'), 'Agent One noted Must find — a ring box on the dresser · off the list above the rows: every must-find is recorded found', 'the Must find\'s too');
    eq(rec('o1'), 'Agent One noted Look at this — a crack along the top rail', 'a note still listed above reads plainly in the record');
    eq(rec('f1'), 'Agent One noted Possible NFA item — a tube that may be a suppressor Firearm — a long gun in the closet', 'every notice on the line, in the order that matters');
    eq(C._agRecordNoticesHtml(C.jobs[0], LINE('z')), '', 'a line the agent said nothing about draws nothing');
  }

  group('I6 · on the desk: the quiet note gone from above the rows and present in the open record; repainted by id as a full render draws it');
  {
    const rows = () => [
      LINE('o1', { itemNo: 1, objectName: 'Chest of drawers', namedBy: 'agent', reviewed: false, disposition: 'Donate', agentNotices: [{ kind: 'other', text: 'the drawer pulls do not match' }] }),
      LINE('m1', { itemNo: 2, objectName: 'Ring box', namedBy: 'agent', reviewed: true, disposition: 'Keep', agentNotices: [{ kind: 'mustfind', text: 'a ring box on the dresser' }] })];
    const job = PROBATE({ mustFind: 'Grandmother’s ring', mustFound: {}, at: {} });
    const D = tonight(job, rows());
    D.C._invOpen.o1 = 1;
    const h0 = D.render();
    has(readOf(inner(h0, 'inv-agent-notices')), 'the drawer pulls do not match', 'fixture: the unreviewed line\'s note is above the rows');
    has(readOf(inner(h0, 'inv-row-o1')), 'Agent One noted Look at this — the drawer pulls do not match', 'and in its open record, under From the field');
    // A name typed on the decided line reviews it (namedBy desk, a disposition chosen): its note goes quiet, by id.
    const n0 = D.log.renders;
    const r = attempt(() => D.C._invEdit(7, 'o1', 'objectName', { value: 'Mahogany chest of drawers', type: 'text' }));
    ok(r.ok, 'the name is typed (' + (r.err || 'ok') + ')');
    const partial = inner(D.dom.html, 'inv-agent-notices');
    lacks(readOf(partial), 'the drawer pulls do not match', '⚠⚠ reviewed: the Look at this is gone from above the rows at once');
    eq(D.log.renders, n0, 'repainted by id: no full render under the person typing');
    const full = D.render();
    eq(partial, inner(full, 'inv-agent-notices'), '⚠ equal to what a full render writes');
    has(readOf(inner(full, 'inv-row-o1')), 'the drawer pulls do not match · off the list above the rows: the line is reviewed', '⚠⚠ and present in its record, saying why');
    // The last Found it quiets the Must find on the desk, by id; Undo brings it back.
    D.dom.html = D.dom.html + '<div id="sf-host-desk" data-job="7"></div>';
    has(readOf(inner(D.dom.html, 'inv-agent-notices')), 'a ring box on the dresser', 'fixture: the Must find is above the rows while the ring is missing');
    const h = D.C._mfHandle(D.C._mustFindKey('Grandmother’s ring'));
    attempt(() => D.C.toggleMustFound(7, h));
    const p2 = inner(D.dom.html, 'inv-agent-notices');
    eq(p2, '', '⚠⚠ Found it: the Must find goes quiet above the rows, by id');
    eq(p2, inner(D.render(), 'inv-agent-notices'), 'as a full render draws it');
    D.dom.html = D.dom.html + '<div id="sf-host-desk" data-job="7"></div>';
    attempt(() => D.C.toggleMustFound(7, h));
    has(readOf(inner(D.dom.html, 'inv-agent-notices')), 'a ring box on the dresser', 'Undo: it is back');
    // The repaints stand down off this client's desk.
    D.dom.getElementById('inv-job').value = '8';
    eq(attempt(() => D.C._invRefreshAgentNotices(7)).val, false, 'another client on the desk: the repaint does nothing');
    // The by-id calls: guarded where they are lifted alone.
    has(fn('toggleMustFound'), "if (typeof _invRefreshAgentNotices === 'function') _invRefreshAgentNotices(jobId);", 'toggleMustFound repaints the notices, guarded (a pinned sandbox lifts it alone)');
    has(fn('_invEdit'), "if ((key === 'objectName' || key === 'category') && typeof _invRefreshAgentNotices === 'function') _invRefreshAgentNotices(jobId);",
      '_invEdit repaints them on the two edits that can review a line without a full render');
  }

  group('I7 · the two stale sentences: the duplicate imports name Remove line; the possible-duplicate chip points above the rows');
  {
    const C = lift(['_renderDuplicateImportNotice', '_renderInvRow'], { jobs: [PROBATE()], estimateStore: { 7: { estimate: { rooms: [] } } }, _invOpen: {}, _invPick: {},
      _photoRefs: { 7: [LINE('a', { itemNo: 3, sourceVehId: 1, objectName: '2019 Lexus RX' }), LINE('b', { itemNo: 4, sourceVehId: 1, objectName: '2019 Lexus RX' })] },
      _agDupSet: { a: 2 }, document: domStub({}) });
    const n = C._renderDuplicateImportNotice(7);
    has(readOf(n), 'Duplicate imports.', 'fixture: two lines off one walkthrough vehicle');
    has(n, 'press <strong>Remove line</strong> in its record', '⚠⚠ the extras come off through Remove line, in the record');
    lacks(n, '&#10005;', '⚠ no ✕ beside the item number: rows have had none since P22');
    lacks(n, 'Delete the extras', 'the old sentence is gone');
    const row = attempt(() => C._renderInvRow(C.jobs[0], C._photoRefs[7][0]));
    ok(row.ok, 'the row draws (' + (row.err || 'ok') + ')');
    const title = /title="([^"]*)"[^>]*>possible duplicate</.exec(row.val || '');
    has(title && title[1], 'Check Possible duplicates, above the rows.', '⚠ the chip points where the block is: above the rows');
    lacks(title && title[1], 'at the top of the tab', 'never the top of the tab, which is the client line now');
  }

  group('I8 · one rule each, read where it is needed: the filter\'s parts, the quiet notice, every must-find found');
  {
    eq(callersOf('_invFilterHides'), ['_invEarlierUndecided', '_invMatchesFilter', 'deskShowLine'], 'what hides a line: the filter, Show the item and the earlier-days hint');
    eq(noComments(fn('_invMatchesFilter')).replace(/\s+/g, ' ').trim(), 'function _invMatchesFilter(r, job) { return _invFilterHides(r, job).length === 0; }',
      '⚠ a line shows when no part hides it: no second copy of any part');
    eq(callersOf('agentNoticeQuiet'), ['_agRecordNoticesHtml', 'agentNotices'], 'whether a notice is quiet: the list above the rows and the record');
    eq(callersOf('mustFindAllFound'), ['agentNoticeQuiet', 'standingFlagsBlock'], 'every must-find found: the desk\'s brief and the Must find notices');
    has(noComments(fn('_invEarlierUndecided')), "INV_WORK_FLAGS.filter(function(x){ return x.key === 'undecided'; })[0]", 'the hint reads the Not yet decided chip\'s own test');
    lacks(noComments(fn('_invEarlierUndecided')), '!r.disposition', 'never a copy of it');
    eq(callersOf('deskShowLine'), [], 'Show the item is pressed, never called by code');
    eq(callersOf('_deskShowBtnHtml'), ['_agNoticesHtml', '_avNoticesHtml'], 'and drawn on both agents\' notices, nowhere else');
    ok(/\.desk-show\{[^}]*border:1px solid var\(--bronze\)[^}]*background:var\(--white\)[^}]*color:var\(--bronze\)/.test(CSS),
      'the outline has its own class: a bronze border and bronze words on white');
    ok(!/\.desk-show\{[^}]*gray-dk/.test(CSS), 'and never the dark fill');
    // Thumb-sized on a phone: inside the one phone block, beside the rule that sizes every other control there.
    const phone = CSS.indexOf('@media (max-width:820px) {');
    ok(phone > 0 && CSS.indexOf('  .desk-show{min-height:32px;}', phone) > phone, 'and 32 px tall on a phone, in the phone block (browser step 96 measures it)');
    // The row it scrolls to lands under the sticky header and tabs (122 px at 1440, measured by browser step 96), not behind
    // them: a margin off the height setTopbarHeight publishes, read by the browser's own scrollIntoView.
    ok(/\[id\^="inv-row-"\]\{scroll-margin-top:calc\(var\(--topbar-h,0px\) \+ 8px\);\}/.test(CSS), '⚠ Show the item\'s row stops under the sticky bar, never behind it');
    has(fn('setTopbarHeight'), "setProperty('--topbar-h', t.offsetHeight + 'px')", 'off the height the app already publishes for its sticky parts');
  }
}

// ═══ J · VALUES AND THE QUIETER FORMS (G6, 2026-10-22) ═══════════════════════════════════════════════════════════════
// The valuation basis and the §2032 alternate valuation date leave the summary (More ▾, at the foot of the tab) for the head
// of the Values & appraisals bar, where values are made; the summary states them as text. The three add forms on the bars
// (appraisers, beneficiaries, bequests) wait behind a button each, shown in place, open by themselves while their list is
// empty (the appraisers' while an item waits on an appraisal too), a person's open or Cancel winning, a save putting each
// back to its default. Driven through the real renderers and handlers.
function groupJ({ group, ok, eq, has, lacks }) {
  const ART = (o) => LINE('a', Object.assign({ objectName: 'Oil on canvas', category: 'Art & Décor', fmv: 9000 }, o));
  // The roster and the bequests card on the real code, every boundary a stub (the closure stops at what the test supplies).
  const cards = (job, rows, extra) => lift(['_renderAppraiserRoster', '_renderInvBequestCard', 'invToggleApprForm', 'invToggleBqForm', 'addAppraiser',
    'invSaveBeneficiary', 'invEditBeneficiary', 'invSaveBequest', 'invEditBequest', '_renderValueSettings', '_renderInventorySummary', '_renderAppraisalGuardrail'],
  Object.assign({ jobs: [job], _photoRefs: { 7: rows || [] }, estimateStore: {}, jobPlanStore: {}, vendorDirectory: [], document: domStub({}),
    saveJobs() {}, syncJobToSheets() {}, renderInventoryTab() {}, _scheduleInventorySync() {}, showSyncBadge() {}, savePhotoRefs() {} }, extra || {}));
  const tagOf = (h, id) => { const at = h.indexOf('id="' + id + '"'); return at < 0 ? '' : h.slice(h.lastIndexOf('<', at), h.indexOf('>', at) + 1); };
  const shown = (h, id) => { const t = tagOf(h, id); return !!t && !/display:\s*none/.test(t); };
  // The catalogue as the app declares it, so a basis added there is checked here too.
  const INV_BASES = new Function(decl('INV_VAL_BASES') + '; return INV_VAL_BASES;')();

  group('J1 · the Values bar opens on the valuation settings, then the roster, then the guardrail; an estate at a values tier only');
  {
    const D = desk({ deathDate: '2026-04-02' });
    const h = D.render();
    ok(!D.log.renderErr, 'the desk renders (' + (D.log.renderErr || 'ok') + ')');
    const vals = inner(h, 'desk-body-values-7') || '';
    const iSet = vals.indexOf('id="inv-val-settings"'), iRos = vals.indexOf('id="m-roster"'), iGr = vals.indexOf('<div id="inv-guardrail">');
    ok(iSet > -1 && iSet < iRos && iRos < iGr, '⚠⚠ the valuation card first, then the roster, then the guardrail  [' + [iSet, iRos, iGr] + ']');
    has(vals, 'onchange="setValBasis(7,this.value)"', 'the basis select, on its own handler');
    has(vals, 'onchange="setEstateAVD(7,this.checked)"', 'the §2032 tick, on its own handler');
    has(textOf(vals), 'Use the §2032 alternate valuation date: six months after death, taxable estates only', '⚠ its words on screen, never a tooltip (unreachable on an iPad)');
    has(textOf(vals), 'Value as of Apr 2, 2026 (date of death)', 'and the date the values are stated as of');
    eq((h.match(/onchange="setValBasis\(/g) || []).length, 1, '⚠ one basis control on the whole tab: not in the summary as well');
    eq((h.match(/onchange="setEstateAVD\(/g) || []).length, 1, 'one §2032 tick');
    eq(textOf(inner(h, 'desk-ttl-values-7')), 'Values & appraisals', 'the bar keeps its catalogue title');
    // ⚠ The one control that sets a basis with legal effect shows the basis the job records (the G6 review: no test held it).
    eq((vals.match(/<option selected>[^<]*</g) || []), ['<option selected>Fair Market Value<'], 'nothing recorded: the default basis selected, and only it');
    eq(INV_BASES.length, 4, 'fixture: the four bases');
    INV_BASES.filter((b) => b !== 'Fair Market Value').forEach((b) => {
      const R = desk({ deathDate: '2026-04-02', valBasis: b });
      const rv = inner(R.render(), 'inv-val-settings') || '';
      eq((rv.match(/<option selected>[^<]*</g) || []), ['<option selected>' + b + '<'], '⚠⚠ a job recording ' + b + ': the select shows it, and only it');
    });
    // At the Contents list tier the agreement says counsel values: there is no valuation for the settings to govern.
    const C = desk({ docTier: 'contents' });
    lacks(C.render(), 'id="inv-val-settings"', '⚠ no settings at the Contents list tier');
    const L = desk({ svc: 'downsizing_move', name: 'Ellis' }, { bq: '' });
    lacks(L.render(), 'id="inv-val-settings"', 'nor on living work');
  }

  group('J2 · the summary states the basis and the date as text, from the same predicate and the same sentence as the bar');
  {
    const est = PROBATE({ docTier: 'values', deathDate: '2026-04-02' });
    const S = cards(est, [LINE('a')]);
    const sum = (j) => S._renderInventorySummary(j, [LINE('a')]);
    const t = textOf(sum(est));
    has(t, 'Valuation Basis Fair Market Value', '⚠ the basis, as text');
    has(t, 'Value as of Apr 2, 2026 (date of death)', 'and the date, as text');
    ['<select', 'setValBasis', 'setEstateAVD', 'type="checkbox"'].forEach((n) => lacks(sum(est), n, '⚠ no control in the summary: ' + n));
    has(textOf(sum(Object.assign({}, est, { valBasis: 'Replacement Value', avd: true }))), 'Valuation Basis Replacement Value Value as of Oct 2, 2026 (alt. valuation date)',
      'a basis and an election made in the bar read back in the summary');
    // The card and the summary name one day: the same sentence, under the same predicate.
    has(S._renderValueSettings(Object.assign({}, est, { avd: true })), S._invValueAsOfHtml(Object.assign({}, est, { avd: true })), 'the bar\'s card prints the summary\'s sentence');
    eq(callersOf('_invValueAsOfHtml'), ['_renderInventorySummary', '_renderValueSettings'], 'one sentence for the value date, two readers');
    eq(callersOf('invStatesEstateValues'), ['_renderInventorySummary', '_renderValueSettings'], '⚠ one predicate for where the settings apply, two readers');
    [['a living job', LIVING()], ['the Contents list tier', PROBATE({ docTier: 'contents' })], ['None', PROBATE({ docTier: 'none' })]].forEach(([w, j]) => {
      eq(S._renderValueSettings(j), '', 'no settings card on ' + w);
      lacks(sum(j), 'Valuation Basis', 'and no basis row in its summary');
    });
    eq(S._renderValueSettings(PROBATE({ docTier: 'appraisals' })) !== '', true, 'the appraisals tier states values too');
  }

  group('J3 · the basis changed from the bar writes the job and the open summary reads it; the §2032 tick redraws the date');
  {
    const D = desk({ deathDate: '2026-04-02' }, {}, { real: ['_renderInventorySummary'], roots: ['setValBasis', 'setEstateAVD'],
      stubs: { saveJobs() {}, syncJobToSheets() {}, _scheduleInventorySync() {} } });
    D.C._invShowRoll = true;
    D.render();
    has(textOf(inner(D.dom.html, 'inv-summary')), 'Valuation Basis Fair Market Value', 'fixture: the summary open, on the default basis');
    attempt(() => D.C.toggleDeskFold(7, 'values'));
    has(tagOf(D.dom.html, 'desk-body-values-7'), 'display:;', 'fixture: the Values bar opened by its header');
    const before = D.log.renders, t0 = D.job.updatedAt || 0;
    const r = attempt(() => D.C.setValBasis(7, 'Replacement Value'));
    ok(r.ok, 'the select\'s handler runs (' + (r.err || 'ok') + ')');
    eq(D.job.valBasis, 'Replacement Value', '⚠ the job records the basis chosen in the bar');
    ok((D.job.updatedAt || 0) > t0, 'a person\'s edit: the job\'s clock moves');
    has(textOf(inner(D.dom.html, 'inv-summary')), 'Valuation Basis Replacement Value', '⚠⚠ and the open summary says so at once, by id');
    eq(D.log.renders, before, 'without a redraw of the tab (the select already shows it)');
    attempt(() => D.C.setEstateAVD(7, true));
    eq(D.job.avd, true, 'the §2032 election is recorded');
    has(textOf(inner(D.dom.html, 'inv-val-settings')), 'Value as of Oct 2, 2026 (alt. valuation date)', '⚠ the bar\'s card names the alternate date');
    has(tagOf(D.dom.html, 'inv-avd-7'), ' checked', 'its tick drawn ticked');
    has(tagOf(D.dom.html, 'desk-body-values-7'), 'display:;', '…and the bar the person pressed it in still open');
  }

  group('J4 · + Add an appraiser: the form shown in place, open by itself while the roster is empty and an item waits');
  {
    const smith = { appraisers: [{ id: 501, name: 'Jane Smith', credential: 'ASA', independent: true }] };
    let S = cards(PROBATE(smith), [ART({ apprId: 501 })]);
    let h = S._renderAppraiserRoster(S.jobs[0]);
    ok(!shown(h, 'appr-form-7') && shown(h, 'appr-add-7'), '⚠ a roster with someone on it: the form shut, + Add an appraiser shown');
    has(tagOf(h, 'appr-form-7'), '<tr id="appr-form-7"', 'the form is the table\'s own row, hidden, never dropped');
    has(h, 'id="appr-name"', 'its boxes still in the page');
    eq(Object.keys(S._apprFormOpen), [], 'and nothing written down for it');
    has(h, '</tr></tfoot></table></div><div class="inv-add-ctl"><button class="btn-s" id="appr-add-7"', 'the button under the table, outside its scroller');
    S = cards(PROBATE(), [ART()]);
    h = S._renderAppraiserRoster(S.jobs[0]);
    ok(shown(h, 'appr-form-7') && !shown(h, 'appr-add-7'), '⚠⚠ an empty roster and an item waiting on an appraisal: the form open by itself, the button aside');
    eq(S._apprFormOpen[7], true, 'written down, so it never shuts under the person filling it');
    S._photoRefs[7][0].apprWaived = true; S._photoRefs[7][0].apprWaiveReason = 'counsel';
    ok(shown(S._renderAppraiserRoster(S.jobs[0]), 'appr-form-7'), '⚠ the item waived meanwhile: the form the person was filling stays open');
    S = cards(PROBATE(), [LINE('a')]);
    ok(!shown(S._renderAppraiserRoster(S.jobs[0]), 'appr-form-7'), 'an empty roster with nothing waiting: shut');
    // In place on the desk, and a person's choice outlives the full redraw.
    const D = desk({}, {}, { real: ['_renderAppraiserRoster'], roots: ['invToggleApprForm'], refs: [LINE('a')] });
    D.render();
    ok(!shown(D.dom.html, 'appr-form-7'), 'fixture: shut on the desk');
    const n0 = D.log.renders;
    attempt(() => D.C.invToggleApprForm(7, true));
    ok(shown(D.dom.html, 'appr-form-7') && !shown(D.dom.html, 'appr-add-7'), '⚠ + Add an appraiser shows the form where it stands');
    eq(D.log.renders, n0, '⚠ never a render: nothing typed anywhere else is lost');
    D.render();
    ok(shown(D.dom.html, 'appr-form-7'), 'opened by hand, it outlives the next full redraw');
    attempt(() => D.C.invToggleApprForm(7, false));
    ok(!shown(D.dom.html, 'appr-form-7') && shown(D.dom.html, 'appr-add-7'), 'Cancel shuts it in place');
    // Cancel draws the boxes afresh, from the markup the render draws them with: whatever was typed or picked is gone, as the
    // bequests' Cancel clears theirs (the G6 review: they reappeared filled on the next + Add an appraiser).
    const cells = D.C._apprFormCellsHtml(7);
    D.dom.getElementById('appr-form-7').innerHTML = cells.replace('id="appr-name" placeholder="Name"', 'id="appr-name" value="Half-typed Jones" placeholder="Name"');
    has(D.dom.html, 'value="Half-typed Jones"', 'fixture: a name typed into the open form');
    attempt(() => D.C.invToggleApprForm(7, true));
    attempt(() => D.C.invToggleApprForm(7, false));
    lacks(D.dom.html, 'Half-typed Jones', '⚠ Cancel takes what was typed with it');
    eq(inner(D.dom.html, 'appr-form-7'), cells, '⚠ the form holds the render\'s own empty boxes again');
    has(tagOf(D.dom.html, 'appr-indep'), ' checked', 'Independent ticked, as the render draws it');
    eq(D.log.renders, n0, 'still never a render');
    const E = desk({}, {}, { real: ['_renderAppraiserRoster'], roots: ['invToggleApprForm'], refs: [ART()] });
    E.render();
    ok(shown(E.dom.html, 'appr-form-7'), 'fixture: open by itself (an empty roster, an item waiting)');
    attempt(() => E.C.invToggleApprForm(7, false));
    E.render();
    ok(!shown(E.dom.html, 'appr-form-7'), '⚠ shut by hand, it stays shut through a redraw although its rule would open it');
    // A save puts the form back to its default: with someone on the roster now, shut.
    const A = cards(PROBATE(), [ART()], { document: domStub({ 'appr-name': 'Carla Mendes', 'appr-cred': 'ASA', 'appr-indep': true }) });
    A._renderAppraiserRoster(A.jobs[0]);
    eq(A._apprFormOpen[7], true, 'fixture: the form open by itself');
    attempt(() => A.addAppraiser(7));
    eq((A.jobs[0].appraisers || []).map((x) => x.name), ['Carla Mendes'], 'the appraiser is saved');
    ok(!Object.prototype.hasOwnProperty.call(A._apprFormOpen, 7), '⚠ and the form\'s state is back to its default');
    ok(!shown(A._renderAppraiserRoster(A.jobs[0]), 'appr-form-7'), '…shut, the new row where the form stood');
    // The guardrail's sentence for an empty roster names the press it now takes.
    const G = cards(PROBATE(), [ART()]);
    has(G._renderAppraisalGuardrail(G.jobs[0]), 'Add an appraiser to the roster above first', 'the guardrail still sends the person to the roster above it, its form open');
  }

  group('J5 · + Add a beneficiary, + Add a specific bequest: open while the list is empty, Edit opens before it fills, Cancel clears');
  {
    let S = cards(PROBATE(), []);
    let h = S._renderInvBequestCard(S.jobs[0], []);
    ok(shown(h, 'bq-ben-form-7') && shown(h, 'bq-beq-form-7'), 'nothing recorded: both forms open by themselves');
    ok(!shown(h, 'bq-ben-add-7') && !shown(h, 'bq-beq-add-7'), 'their buttons aside');
    eq([S._bqFormOpen['7:ben'], S._bqFormOpen['7:beq']], [true, true], 'written down, so neither shuts under the person filling it');
    const mary = { id: 'b1', name: 'Mary Smith', relationship: 'niece' };
    S = cards(PROBATE({ beneficiaries: [mary] }), []);
    h = S._renderInvBequestCard(S.jobs[0], []);
    ok(!shown(h, 'bq-ben-form-7') && shown(h, 'bq-ben-add-7'), '⚠ a beneficiary on the list: that form shut, + Add a beneficiary shown');
    ok(shown(h, 'bq-beq-form-7'), 'the bequests\' form still open: no bequest yet');
    const iBen = h.indexOf('id="bq-ben-add-7"'), iBeqHead = h.indexOf('Specific bequests'), iBeqAdd = h.indexOf('id="bq-beq-add-7"');
    ok(h.indexOf('Mary Smith') < iBen && iBen < iBeqHead && iBeqHead < iBeqAdd, 'each button under its own list');
    S = cards(PROBATE({ beneficiaries: [mary], bequests: [{ id: 'q1', description: 'the gold watch', beneficiaryId: 'b1', stableIds: [] }] }), []);
    h = S._renderInvBequestCard(S.jobs[0], []);
    ok(!shown(h, 'bq-ben-form-7') && !shown(h, 'bq-beq-form-7'), 'both lists started: both forms shut');
    ['bq-ben-id-7', 'bq-ben-name-7', 'bq-ben-rel-7', 'bq-ben-phone-7', 'bq-ben-email-7'].forEach((id) => has(inner(h, 'bq-ben-form-7'), 'id="' + id + '"', id + ' kept in the hidden form'));
    ['bq-id-7', 'bq-desc-7', 'bq-benid-7', 'bq-items-7'].forEach((id) => has(inner(h, 'bq-beq-form-7'), 'id="' + id + '"', id + ' too'));
    ['bq-ben-form-7', 'bq-beq-form-7'].forEach((id) => lacks(inner(h, id), 'datalist', '⚠ the roster\'s datalist is outside ' + id));
    has(h, '<datalist id="inv-ben-list-7"><option value="Mary Smith"></option></datalist>', '⚠ and in the card, open or shut, for every To a person box');
    // Edit opens the form, recorded like a press, then fills it.
    const doc = domStub({ 'bq-ben-form-7': { style: { display: 'none' } }, 'bq-ben-add-7': { style: { display: '' } },
      'bq-beq-form-7': { style: { display: 'none' } }, 'bq-beq-add-7': { style: { display: '' } } });
    S = cards(PROBATE({ beneficiaries: [mary], bequests: [{ id: 'q1', description: 'the gold watch', beneficiaryId: 'b1', stableIds: [] }] }), [], { document: doc });
    ok(S.invEditBeneficiary(7, 'b1'), 'Edit runs');
    eq([doc.getElementById('bq-ben-form-7').style.display, doc.getElementById('bq-ben-add-7').style.display], ['', 'none'], '⚠⚠ Edit opens the form');
    eq([doc.getElementById('bq-ben-id-7').value, doc.getElementById('bq-ben-name-7').value], ['b1', 'Mary Smith'], '…and fills it');
    eq(S._bqFormOpen['7:ben'], true, 'recorded open, so a redraw keeps it open');
    // Cancel shuts it and clears it: the hidden id would otherwise turn the next "new" beneficiary into an edit of Mary.
    S.invToggleBqForm(7, 'ben', false);
    eq(doc.getElementById('bq-ben-form-7').style.display, 'none', 'Cancel shuts the form');
    eq(['id', 'name', 'rel'].map((k) => doc.getElementById('bq-ben-' + k + '-7').value), ['', '', ''], '⚠ and clears it, the hidden id included');
    eq(S._bqFormOpen['7:ben'], false, 'a person\'s shut, recorded');
    ok(S.invEditBequest(7, 'q1'), 'the bequest\'s Edit runs');
    eq([doc.getElementById('bq-beq-form-7').style.display, doc.getElementById('bq-desc-7').value], ['', 'the gold watch'], '⚠ and opens its form before filling it');
    // A save puts the form back to its default.
    S.invToggleBqForm(7, 'ben', true);
    doc.getElementById('bq-ben-name-7').value = 'John Smith';
    ok(S.invSaveBeneficiary(7), 'John is saved');
    ok(!Object.prototype.hasOwnProperty.call(S._bqFormOpen, '7:ben'), '⚠ the form\'s state back to its default');
    ok(!shown(S._renderInvBequestCard(S.jobs[0], []), 'bq-ben-form-7'), '…shut, the list holding an entry');
    eq(doc.getElementById('bq-ben-name-7').value, '', 'the form cleared');
    S.invToggleBqForm(7, 'beq', false);
    S.invToggleBqForm(7, 'beq', true);
    doc.getElementById('bq-desc-7').value = 'the Sargent portrait'; doc.getElementById('bq-benid-7').value = 'b1';
    ok(S.invSaveBequest(7), 'a second bequest is saved through its form');
    eq(S.jobs[0].bequests.map((q) => q.description), ['the gold watch', 'the Sargent portrait'], 'a new entry, not an edit of the first');
    ok(!Object.prototype.hasOwnProperty.call(S._bqFormOpen, '7:beq'), '⚠ and the bequests\' form back to its default');
    // In place on the desk: the press never redraws.
    const D = desk({}, {}, { real: ['_renderInvBequestCard'], roots: ['invToggleBqForm'] });
    D.job.beneficiaries = [mary];
    D.render();
    const n0 = D.log.renders;
    ok(!shown(D.dom.html, 'bq-ben-form-7'), 'fixture: shut on the desk');
    attempt(() => D.C.invToggleBqForm(7, 'ben', true));
    ok(shown(D.dom.html, 'bq-ben-form-7') && !shown(D.dom.html, 'bq-ben-add-7'), '⚠ + Add a beneficiary shows the form where it stands');
    eq(D.log.renders, n0, 'never a render');
    eq(S.invToggleBqForm(7, 'nobody', true), false, 'a form the card does not have: nothing');
  }

  group('J6 · one rule each, view state only, and the forms\' boxes cleared by one list');
  {
    eq(callersOf('_apprFormIsOpen'), ['_apprFormRepaint', '_renderAppraiserRoster'], 'whether the appraisers\' form is open: asked where it is drawn, and by the heads\' repaint of it');
    eq(callersOf('_apprFormRepaint'), ['_deskFoldHeadsRepaint'], '…which the heads repaint runs, so every by-id repaint of a card in a bar reaches it');
    eq(callersOf('_apprFormCellsHtml'), ['_renderAppraiserRoster', 'invToggleApprForm'], 'the form\'s empty boxes: one markup, drawn by the render and by Cancel');
    eq(callersOf('_invManifestUnread'), ['_apprFormIsOpen', 'deskFoldState'], '⚠ an unread manifest: one answer, read by the bars and the form');
    eq(callersOf('_bqFormIsOpen'), ['_renderInvBequestCard'], 'the bequests card\'s two forms: the same');
    eq(callersOf('_invBqClear'), ['invSaveBeneficiary', 'invSaveBequest', 'invToggleBqForm'], 'the boxes a save and Cancel clear: one list (INV_BQ_FORM_FIELDS)');
    ['_apprFormIsOpen', 'invToggleApprForm', '_apprFormPaint', '_apprFormRepaint', '_bqFormIsOpen', 'invToggleBqForm', '_invBqFormPaint', '_renderValueSettings'].forEach((f) =>
      lacks(codeOnly(fn(f)), 'localStorage', f + ': view state, never saved'));
    lacks(codeOnly(fn('invToggleApprForm')) + codeOnly(fn('invToggleBqForm')) + codeOnly(fn('_apprFormRepaint')), 'renderInventoryTab', '⚠ the presses and the repaint flip in place, never a render');
    ok(/\.inv-val-set input\[type=checkbox\]\{width:auto;/.test(CSS), 'the §2032 tick is its own size, not the global input width');
  }

  // ⚠ THE G6 REVIEW (2026-10-23): the form's open-by-itself rule was asked only by the full render, so on the desk's usual
  // by-id path (a value typed on a row: _invEdit → _invRefreshGuardrail → the heads repaint) the Values bar opened by its
  // rule while the form stayed shut under a guardrail saying "Add an appraiser to the roster above first", until some
  // unrelated redraw opened it. The heads repaint asks the form's rule now; held, as every by-id repaint is, to a full render.
  group('J7 · a value typed on the row starts an item waiting: the bar and the appraisers\' form open together, as a full render draws them');
  {
    const form = (h) => ({ bar: shown(h, 'desk-body-values-7'), form: shown(h, 'appr-form-7'), add: shown(h, 'appr-add-7') });
    const D = desk(PROBATE(), {}, { refs: [ART({ fmv: 500 })], real: ['_renderAppraiserRoster', '_renderAppraisalGuardrail'], roots: ['_invEdit', 'invToggleApprForm'],
      stubs: { savePhotoRefs() {}, _scheduleInventorySync() {}, showSyncBadge() {}, alert() {}, _invRefreshSummary() {} } });
    D.render();
    ok(!D.log.renderErr, 'the desk renders (' + (D.log.renderErr || 'ok') + ')');
    eq(form(D.dom.html), { bar: false, form: false, add: true }, 'fixture: a $500 painting, nothing waiting, nobody on the roster: the bar and the form shut');
    eq(Object.keys(D.C._apprFormOpen), [], 'fixture: nothing written down for the form');
    const r = attempt(() => D.C._invEdit(7, 'a', 'fmv', { value: '9000', type: 'text' }));
    ok(r.ok, 'the value typed on the row runs (' + (r.err || 'ok') + ')');
    eq(D.log.renders, 0, 'fixture: by id, no full render');
    has(textOf(inner(D.dom.html, 'inv-guardrail')), 'Add an appraiser to the roster above first', 'fixture: the guardrail now sends the person to the roster');
    const partial = form(D.dom.html);
    eq(partial, { bar: true, form: true, add: false }, '⚠⚠ the bar opened by its rule, and the form under the guardrail\'s sentence opened with it');
    eq(D.C._apprFormOpen[7], true, 'written down, as the render writes it, so it never shuts under the person filling it');
    D.render();
    eq(form(D.dom.html), partial, '⚠⚠ the by-id repaint draws what a full render draws');
    // A person's shut still wins over the rule on the by-id path.
    ok(attempt(() => D.C.invToggleApprForm(7, false)).ok, 'Cancel runs');
    eq(form(D.dom.html).form, false, 'fixture: shut by hand');
    attempt(() => D.C._invEdit(7, 'a', 'fmv', { value: '9500', type: 'text' }));
    eq(form(D.dom.html).form, false, 'shut by hand: the next value typed leaves it shut');
  }

  group('J8 · never off an unread manifest: the form waits for the sheet\'s read, as the bars do, and opens when it lands');
  {
    const seen = {};
    const D = desk(PROBATE(), {}, { refs: [ART()], real: ['_renderAppraiserRoster'], roots: ['_invRefreshFromCloud'], stubs: {
      SHEETS_SYNC_URL: 'https://sync.example.test/exec', _invCloudSeen: seen,
      refreshPhotoRefs: (id, cb) => { seen[id] = true; cb(false); } } });
    D.render();
    ok(!D.log.renderErr, 'the desk renders (' + (D.log.renderErr || 'ok') + ')');
    ok(!shown(D.dom.html, 'appr-form-7') && shown(D.dom.html, 'appr-add-7'), '⚠ a cold device: the cached painting waits, but the form stays shut until the sheet is read');
    eq(Object.keys(D.C._apprFormOpen), [], 'and nothing is written down off the cache');
    const r = attempt(() => D.C._invRefreshFromCloud());
    ok(r.ok, 'the read lands (' + (r.err || 'ok') + ')');
    eq(D.log.renders, 0, 'fixture: it changed nothing, so the tab was not redrawn');
    ok(shown(D.dom.html, 'appr-form-7') && !shown(D.dom.html, 'appr-add-7'), '⚠⚠ read, and the painting still waits: the form opens by its rule, by id');
    eq(D.C._apprFormOpen[7], true, 'and the open is written down');
    D.render();
    ok(shown(D.dom.html, 'appr-form-7'), 'as a full render then draws it');
    // With no Apps Script URL this device's copy is the record: open at once, as before.
    const N = desk(PROBATE(), {}, { refs: [ART()], real: ['_renderAppraiserRoster'] });
    ok(shown(N.render(), 'appr-form-7'), 'no URL set: the form open on the first render');
  }
}

// ═══ K · RECORD THE SIGNED REQUEST (G7) ═════════════════════════════════════
function groupK({ group, ok, eq, has, lacks }) {
  group('K1 · Record the signed request: on the Releases card inside its bar, once on the desk; pressed, saved and drawn again over the real desk, the selection standing');
  {
    const rows = () => [LINE('a', { itemNo: 1, objectName: 'Harbor painting', disposition: 'Auction', channel: 'Kodner Galleries' }),
      LINE('b', { itemNo: 2, objectName: 'Table lamp', disposition: 'Donate', channel: 'Goodwill' }),
      LINE('c', { itemNo: 3, objectName: 'Clock', disposition: 'Keep' })];
    const sent = () => ({ approvalRequest: { draftedAt: '2026-10-19T15:00:00.000Z', sentAt: '2026-10-19T16:00:00.000Z', sentBy: 'Ashley Jerome', provider: 'gmail',
      req: { to: ['ruth@adler.example'], cc: [], noEmail: [], viaCounsel: false, stableIds: ['a', 'b'], asked: 2, ratify: 0 } } });
    const r = rows();
    const badges = [];
    const D = desk(PROBATE({ docState: sent() }), {}, { refs: r, real: ['_renderInvWorkbar', '_renderInvReleasesCard', '_renderInvBulk'],
      roots: ['invRecordRequestApproval', 'invSaveApproval', 'closeInvApproval'], stubs: {
        SHEETS_SYNC_URL: 'https://sync.example.test/exec', _invCloudSeen: { 7: true }, _invAssignItemNos: () => r, Date: TickDate(T0),
        savePhotoRefs() {}, _scheduleInventorySync() {}, showSyncBadge: (m) => badges.push(String(m)), _docNotice() {}, alert() {} } });
    // The dialog lives outside the tab: its parts are plain elements, ticked as a person would.
    const dlg = {};
    const tabEl = D.dom.getElementById;
    D.dom.getElementById = (id) => (/^ia-|^inv-approval-modal$/.test(id)
      ? (dlg[id] || (dlg[id] = { id, innerHTML: '', style: {}, checked: false, value: '' })) : tabEl(id));
    D.C._invPick.b = 1;   // the person has the lamp ticked on the bulk bar
    const html = D.render();
    ok(!D.log.renderErr, 'the desk draws with the real work bar, Releases card and bulk bar (' + (D.log.renderErr || 'ok') + ')');
    const recs = (h) => (h.match(/onclick="invRecordRequestApproval\(7\)"/g) || []).length;
    eq(recs(html), 1, '⚠⚠ sent, two lines still unsigned: Record the signed request once on the whole desk');
    eq(recs(inner(html, 'desk-body-releases-7') || ''), 1, 'and it is inside the Releases bar, on the card');
    eq(recs(inner(html, 'inv-workbar') || ''), 0, 'never on the work bar');
    eq((html.match(/onclick="invRecordApproval\(7\)"/g) || []).length, 1, 'the bulk bar\'s Record approval beside the selection, as it was');
    const R0 = heads(html).filter((x) => x.f === 'releases')[0] || {};
    has(R0.line, '2 on the request still unsigned', 'the bar\'s line says what the press is for');
    // Pressed: the dialog on the request's lines, never the selection of one.
    const p = attempt(() => D.C.invRecordRequestApproval(7));
    ok(p.ok && p.val === true, 'the press opens the dialog (' + (p.err || p.val) + ')');
    eq(D.C._invRecordCtx && D.C._invRecordCtx.stableIds, ['a', 'b'], '⚠⚠ the request\'s two lines, not the lamp the bulk bar holds alone');
    has(dlg['ia-body'].innerHTML, 'Untick any line the signed copy struck out.', 'the sentence');
    for (const m of dlg['ia-body'].innerHTML.matchAll(/id="(ia-line-\d+)"( checked)?/g)) D.dom.getElementById(m[1]).checked = !!m[2];
    const el = (id) => D.dom.getElementById(id);
    eq([el('ia-line-0').checked, el('ia-line-1').checked], [true, true], 'both drawn ticked');
    el('ia-line-1').checked = false;   // the lamp struck out on the signed copy
    el('ia-fid-0').checked = true;
    el('ia-date').value = (/id="ia-date" value="([^"]*)"/.exec(dlg['ia-body'].innerHTML) || [])[1] || '';
    D.log.renders = 0;
    const s = attempt(() => D.C.invSaveApproval());
    ok(s.ok && s.val === true, 'recorded (' + (s.err || s.val) + ')');
    eq([r[0].authBy, r[1].authBy], ['Ruth Adler', undefined], '⚠⚠ the painting approved, the struck-out lamp not');
    eq(D.log.renders, 1, 'the desk drawn again, once, by the real render');
    eq(D.C._invPick, { b: 1 }, '⚠⚠ the lamp still ticked on the bulk bar');
    const after = D.dom.html;
    eq((after.match(/onclick="invRecordApproval\(7\)"/g) || []).length, 1, 'and the bulk bar is still drawn for it');
    has(textOf(inner(after, 'inv-releases') || ''), '1 line still unsigned', 'the card: the lamp still waits');
    eq(recs(after), 1, 'and Record the signed request is still offered for it');
    const R1 = heads(after).filter((x) => x.f === 'releases')[0] || {};
    has(R1.line, '1 signed approval not filed to Drive', 'the bar\'s line: the signed paper to file, which opens the bar (Q2)');
    has(R1.line, '1 on the request still unsigned', 'and the lamp');
    eq(R1.open, true, 'open');
    has(badges.join(' | '), 'Approval recorded on 1 item', 'the badge counts what was recorded');
  }
}
